import { createServerFn } from "@tanstack/react-start";
import { bangkokParts, hash32, mulberry32, pad2 } from "@/lib/time";
import { logServerError, publicError } from "@/lib/server-log";
import {
  LEAGUES,
  getMatches,
  type LeagueId,
  type MatchStatus,
  type MatchView,
  type Team,
} from "@/lib/football";

const ESPN_LEAGUES: { id: LeagueId; slug: string }[] = [
  { id: "premier", slug: "eng.1" },
  { id: "laliga", slug: "esp.1" },
  { id: "seriea", slug: "ita.1" },
  { id: "thaileague", slug: "tha.1" },
  { id: "ucl", slug: "uefa.champions" },
];

const NAME_TH: Record<string, string> = {
  liverpool: "ลิเวอร์พูล",
  arsenal: "อาร์เซนอล",
  "manchester city": "แมนซิตี้",
  "man city": "แมนซิตี้",
  chelsea: "เชลซี",
  "manchester united": "แมนยู",
  tottenham: "ท็อตแน่ม",
  newcastle: "นิวคาสเซิล",
  "aston villa": "แอสตันวิลลา",
  "real madrid": "เรอัล มาดริด",
  barcelona: "บาร์เซโลนา",
  "atletico madrid": "แอตเลติโก",
  sevilla: "เซบีย่า",
  juventus: "ยูเวนตุส",
  milan: "มิลาน",
  "ac milan": "มิลาน",
  inter: "อินเตอร์",
  "internazionale": "อินเตอร์",
  napoli: "นาโปลี",
  bayern: "บาเยิร์น",
  "bayern munich": "บาเยิร์น",
  psg: "เปแอสเช",
  "paris saint-germain": "เปแอสเช",
  buriram: "บุรีรัมย์",
  "bg pathum": "บีจี ปทุม",
};

const globalFeed = globalThis as typeof globalThis & {
  __mawinBallCache__?: { at: number; matches: MatchView[] };
  __mawinBallTimer__?: ReturnType<typeof setInterval>;
};

function thaiName(name: string) {
  const key = name.trim().toLowerCase();
  if (NAME_TH[key]) return NAME_TH[key];
  const hit = Object.entries(NAME_TH).find(([en]) => key.includes(en));
  return hit ? hit[1] : name;
}

function makeTeam(name: string, logo?: string): Team {
  const abbr = name.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || name.slice(0, 3);
  return {
    id: name.toLowerCase().replace(/\s+/g, "-").slice(0, 24),
    name: thaiName(name),
    nameEn: name,
    abbr,
    tone: "tone-gold",
    logo,
  };
}

function americanToDecimal(raw: unknown) {
  const n = Number(String(raw ?? "").replace("+", ""));
  if (!Number.isFinite(n) || n === 0) return 0;
  const d = n > 0 ? 1 + n / 100 : 1 + 100 / Math.abs(n);
  return Math.round(Math.max(1.01, d) * 100) / 100;
}

function numLine(raw: unknown) {
  const n = Number(String(raw ?? "").replace(/[^\d.+-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function fallbackOdds(seed: string) {
  const rng = mulberry32(hash32(seed));
  const oddsBase = 0.85 + rng() * 0.2;
  return {
    home: Number((1.7 + rng()).toFixed(2)),
    draw: Number((3.1 + rng() * 0.8).toFixed(2)),
    away: Number((1.9 + rng() * 1.4).toFixed(2)),
    hdpHome: Number(oddsBase.toFixed(2)),
    hdpAway: Number((1.9 - oddsBase + 0.85).toFixed(2)),
    over: Number((0.88 + rng() * 0.16).toFixed(2)),
    under: Number((0.88 + rng() * 0.16).toFixed(2)),
    homeLine: rng() > 0.55 ? -(0.25 + Math.floor(rng() * 6) * 0.25) : Math.floor(rng() * 3) * 0.25,
    overLine: 2 + Math.floor(rng() * 5) * 0.25 || 2.5,
  };
}

type EspnEvent = {
  id?: string;
  date?: string;
  status?: { displayClock?: string; period?: number; type?: { state?: string; completed?: boolean } };
  competitions?: Array<{
    competitors?: Array<{
      homeAway?: string;
      score?: string;
      team?: { displayName?: string; abbreviation?: string; logo?: string };
    }>;
    odds?: Array<{
      overUnder?: number;
      drawOdds?: { moneyLine?: number };
      moneyline?: { home?: { close?: { odds?: string } }; away?: { close?: { odds?: string } }; draw?: { close?: { odds?: string } } };
      pointSpread?: {
        home?: { close?: { line?: string; odds?: string } };
        away?: { close?: { line?: string; odds?: string } };
      };
      total?: { over?: { close?: { odds?: string; line?: string } }; under?: { close?: { odds?: string } } };
    }>;
  }>;
};

async function getJson(url: string): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "Mozilla/5.0 (compatible; Mawin1688/1.0)",
      },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function ymd(date: Date) {
  const bk = bangkokParts(date);
  return bk.dateKey.replaceAll("-", "");
}

function parseEvent(league: LeagueId, leagueName: string, ev: EspnEvent): MatchView | null {
  try {
  const comp = ev.competitions?.[0];
  const homeC = comp?.competitors?.find((c) => c.homeAway === "home");
  const awayC = comp?.competitors?.find((c) => c.homeAway === "away");
  if (!homeC?.team?.displayName || !awayC?.team?.displayName || !ev.id) return null;
  const kickoffMs = ev.date ? new Date(ev.date).getTime() : Date.now();
  const state = ev.status?.type?.state;
  const status: MatchStatus =
    state === "in" ? "live" : state === "post" || ev.status?.type?.completed ? "finished" : "upcoming";
  const clock = String(ev.status?.displayClock ?? "").replace(/\D/g, "");
  const minute = status === "upcoming" ? 0 : Number(clock) || (ev.status?.period === 2 ? 60 : status === "finished" ? 90 : 1);
  const kick = new Date(kickoffMs);
  const bk = bangkokParts(kick);
  const oddsBlock = comp?.odds?.[0];
  const fb = fallbackOdds(`${ev.id}:${league}`);
  const homeMl = americanToDecimal(oddsBlock?.moneyline?.home?.close?.odds);
  const awayMl = americanToDecimal(oddsBlock?.moneyline?.away?.close?.odds);
  const drawMl =
    americanToDecimal(oddsBlock?.moneyline?.draw?.close?.odds) || americanToDecimal(oddsBlock?.drawOdds?.moneyLine);
  const homeSpread = numLine(oddsBlock?.pointSpread?.home?.close?.line);
  const hdpHome = americanToDecimal(oddsBlock?.pointSpread?.home?.close?.odds);
  const hdpAway = americanToDecimal(oddsBlock?.pointSpread?.away?.close?.odds);
  const over = americanToDecimal(oddsBlock?.total?.over?.close?.odds);
  const under = americanToDecimal(oddsBlock?.total?.under?.close?.odds);
  const overLine = numLine(oddsBlock?.total?.over?.close?.line) || Number(oddsBlock?.overUnder) || fb.overLine;
  return {
    id: `espn-${ev.id}`,
    league,
    leagueName,
    home: makeTeam(homeC.team.displayName, homeC.team.logo),
    away: makeTeam(awayC.team.displayName, awayC.team.logo),
    kickoffLabel: `${pad2(bk.hour)}:${pad2(bk.minute)}`,
    kickoffMs,
    status,
    minute,
    homeGoals: Number(homeC.score ?? 0) || 0,
    awayGoals: Number(awayC.score ?? 0) || 0,
    homeLine: homeSpread || fb.homeLine,
    overLine,
    odds: {
      home: homeMl || fb.home,
      draw: drawMl || fb.draw,
      away: awayMl || fb.away,
      hdpHome: hdpHome || fb.hdpHome,
      hdpAway: hdpAway || fb.hdpAway,
      over: over || fb.over,
      under: under || fb.under,
    },
  };
  } catch (err) {
    logServerError("parseEvent", err);
    return null;
  }
}

async function fetchEspnMatches(now: Date) {
  const dates = [ymd(new Date(now.getTime() - 86400000)), ymd(now), ymd(new Date(now.getTime() + 86400000))];
  const jobs = ESPN_LEAGUES.flatMap((lg) =>
    dates.map(async (date) => {
      try {
        const json = (await getJson(
          `https://site.api.espn.com/apis/site/v2/sports/soccer/${lg.slug}/scoreboard?dates=${date}`,
        )) as { events?: EspnEvent[] } | null;
        const name = LEAGUES.find((l) => l.id === lg.id)?.name ?? lg.id;
        return (json?.events ?? []).map((ev) => parseEvent(lg.id, name, ev)).filter((m): m is MatchView => Boolean(m));
      } catch (err) {
        logServerError(`espn ${lg.slug} ${date}`, err);
        return [] as MatchView[];
      }
    }),
  );
  const groups = await Promise.all(jobs);
  const seen = new Set<string>();
  const out: MatchView[] = [];
  for (const row of groups.flat()) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  out.sort((a, b) => {
    const rank = (s: MatchStatus) => (s === "live" ? 0 : s === "upcoming" ? 1 : 2);
    const d = rank(a.status) - rank(b.status);
    return d !== 0 ? d : a.kickoffMs - b.kickoffMs;
  });
  return out.slice(0, 48);
}

type OddsApiEvent = {
  id?: string;
  home_team?: string;
  away_team?: string;
  bookmakers?: Array<{
    markets?: Array<{
      key?: string;
      outcomes?: Array<{ name?: string; price?: number; point?: number }>;
    }>;
  }>;
};

async function overlayOddsApi(matches: MatchView[]) {
  const key = process.env.ODDS_API_KEY?.trim() || process.env.THE_ODDS_API_KEY?.trim();
  if (!key) return matches;
  try {
  const sports = ["soccer_epl", "soccer_spain_la_liga", "soccer_italy_serie_a", "soccer_uefa_champs_league"];
  const lists = await Promise.all(
    sports.map(async (sport) => {
      const json = await getJson(
        `https://api.the-odds-api.com/v4/sports/${sport}/odds?apiKey=${encodeURIComponent(key)}&regions=uk&markets=h2h,spreads,totals&oddsFormat=decimal`,
      );
      return Array.isArray(json) ? (json as OddsApiEvent[]) : [];
    }),
  );
  const feed = lists.flat();
  return matches.map((m) => {
    const hit = feed.find((g) => {
      const home = (g.home_team ?? "").toLowerCase();
      const away = (g.away_team ?? "").toLowerCase();
      return m.home.nameEn.toLowerCase().includes(home.slice(0, 8)) || home.includes(m.home.nameEn.toLowerCase().slice(0, 8))
        ? away.includes(m.away.nameEn.toLowerCase().slice(0, 6)) || m.away.nameEn.toLowerCase().includes(away.slice(0, 6))
        : false;
    });
    const mk = hit?.bookmakers?.[0]?.markets ?? [];
    const h2h = mk.find((x) => x.key === "h2h")?.outcomes ?? [];
    const spreads = mk.find((x) => x.key === "spreads")?.outcomes ?? [];
    const totals = mk.find((x) => x.key === "totals")?.outcomes ?? [];
    const homeH2h = h2h.find((o) => o.name === hit?.home_team)?.price;
    const awayH2h = h2h.find((o) => o.name === hit?.away_team)?.price;
    const drawH2h = h2h.find((o) => /draw/i.test(o.name ?? ""))?.price;
    const homeSp = spreads.find((o) => o.name === hit?.home_team);
    const over = totals.find((o) => /over/i.test(o.name ?? ""));
    if (!homeH2h && !homeSp && !over) return m;
    return {
      ...m,
      homeLine: homeSp?.point ?? m.homeLine,
      overLine: over?.point ?? m.overLine,
      odds: {
        home: homeH2h ?? m.odds.home,
        draw: drawH2h ?? m.odds.draw,
        away: awayH2h ?? m.odds.away,
        hdpHome: homeSp?.price ?? m.odds.hdpHome,
        hdpAway: spreads.find((o) => o.name === hit?.away_team)?.price ?? m.odds.hdpAway,
        over: over?.price ?? m.odds.over,
        under: totals.find((o) => /under/i.test(o.name ?? ""))?.price ?? m.odds.under,
      },
    };
  });
  } catch (err) {
    logServerError("odds-api", err);
    return matches;
  }
}

export async function refreshFootballFeed() {
  try {
    const now = new Date();
    let matches = await fetchEspnMatches(now);
    if (matches.length === 0) matches = getMatches(now);
    matches = await overlayOddsApi(matches);
    globalFeed.__mawinBallCache__ = { at: Date.now(), matches };
    return matches;
  } catch (err) {
    logServerError("refreshFootballFeed", err);
    const fallback = globalFeed.__mawinBallCache__?.matches ?? getMatches();
    globalFeed.__mawinBallCache__ = { at: Date.now(), matches: fallback };
    return fallback;
  }
}

export async function liveMatches() {
  const cache = globalFeed.__mawinBallCache__;
  if (cache && Date.now() - cache.at < 25000) return cache.matches;
  return refreshFootballFeed();
}

export async function liveMatch(id: string) {
  try {
    const rows = await liveMatches();
    return rows.find((m) => m.id === id) ?? getMatches().find((m) => m.id === id);
  } catch (err) {
    logServerError("liveMatch", err);
    return getMatches().find((m) => m.id === id);
  }
}

export function startFootballSyncLoop() {
  if (globalFeed.__mawinBallTimer__) return;
  globalFeed.__mawinBallTimer__ = setInterval(() => {
    void refreshFootballFeed().catch((err) => logServerError("football-loop", err));
  }, 30000);
  void refreshFootballFeed().catch((err) => logServerError("football-loop-start", err));
}

export const listFootballMatches = createServerFn({ method: "POST" }).handler(async () => {
  try {
    return await liveMatches();
  } catch (err) {
    throw publicError("listFootballMatches", err, "โหลดโปรแกรมบอลไม่สำเร็จ ตรวจฟีดหรือค่าน้ำ");
  }
});
