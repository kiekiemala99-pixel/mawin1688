import { bangkokParts, hash32, mulberry32, pad2 } from "./time";

export type LeagueId = "premier" | "thaileague" | "laliga" | "seriea" | "ucl";

export const LEAGUES: { id: LeagueId; name: string }[] = [
  { id: "premier", name: "พรีเมียร์ลีก" },
  { id: "thaileague", name: "ไทยลีก" },
  { id: "laliga", name: "ลาลีกา" },
  { id: "seriea", name: "เซเรียอา" },
  { id: "ucl", name: "แชมเปียนส์ลีก" },
];

export type Team = { id: string; name: string; nameEn: string; abbr: string; tone: string; logo?: string };

export const TEAMS: Record<string, Team> = {
  liv: { id: "liv", name: "ลิเวอร์พูล", nameEn: "Liverpool", abbr: "LIV", tone: "tone-red" },
  ars: { id: "ars", name: "อาร์เซนอล", nameEn: "Arsenal", abbr: "ARS", tone: "tone-red" },
  mci: { id: "mci", name: "แมนซิตี้", nameEn: "Man City", abbr: "MCI", tone: "tone-sky" },
  che: { id: "che", name: "เชลซี", nameEn: "Chelsea", abbr: "CHE", tone: "tone-blue" },
  mun: { id: "mun", name: "แมนยู", nameEn: "Man United", abbr: "MUN", tone: "tone-red" },
  tot: { id: "tot", name: "ท็อตแน่ม", nameEn: "Tottenham", abbr: "TOT", tone: "tone-ink" },
  newc: { id: "newc", name: "นิวคาสเซิล", nameEn: "Newcastle", abbr: "NEW", tone: "tone-ink" },
  avl: { id: "avl", name: "แอสตันวิลลา", nameEn: "Aston Villa", abbr: "AVL", tone: "tone-wine" },
  buri: { id: "buri", name: "บุรีรัมย์", nameEn: "Buriram", abbr: "BRU", tone: "tone-blue" },
  bg: { id: "bg", name: "บีจี ปทุม", nameEn: "BG Pathum", abbr: "BGP", tone: "tone-gold" },
  port: { id: "port", name: "การท่าเรือ", nameEn: "Port FC", abbr: "POR", tone: "tone-gold" },
  muang: { id: "muang", name: "เมืองทอง", nameEn: "Muangthong", abbr: "MTU", tone: "tone-red" },
  chon: { id: "chon", name: "ชลบุรี", nameEn: "Chonburi", abbr: "CHO", tone: "tone-sky" },
  rma: { id: "rma", name: "เรอัล มาดริด", nameEn: "Real Madrid", abbr: "RMA", tone: "tone-gold" },
  bar: { id: "bar", name: "บาร์เซโลนา", nameEn: "Barcelona", abbr: "BAR", tone: "tone-wine" },
  atm: { id: "atm", name: "แอตเลติโก", nameEn: "Atletico", abbr: "ATM", tone: "tone-red" },
  sev: { id: "sev", name: "เซบีย่า", nameEn: "Sevilla", abbr: "SEV", tone: "tone-ink" },
  juv: { id: "juv", name: "ยูเวนตุส", nameEn: "Juventus", abbr: "JUV", tone: "tone-ink" },
  mil: { id: "mil", name: "มิลาน", nameEn: "Milan", abbr: "MIL", tone: "tone-red" },
  int: { id: "int", name: "อินเตอร์", nameEn: "Inter", abbr: "INT", tone: "tone-blue" },
  nap: { id: "nap", name: "นาโปลี", nameEn: "Napoli", abbr: "NAP", tone: "tone-sky" },
  bay: { id: "bay", name: "บาเยิร์น", nameEn: "Bayern", abbr: "BAY", tone: "tone-red" },
  psg: { id: "psg", name: "เปแอสเช", nameEn: "PSG", abbr: "PSG", tone: "tone-navy" },
};

type FixtureSeed = {
  id: string;
  league: LeagueId;
  home: string;
  away: string;
  kickHour: number;
  kickMin: number;
  dayOffset: number;
};

const FIXTURES: FixtureSeed[] = [
  { id: "th-1", league: "thaileague", home: "buri", away: "bg", kickHour: 20, kickMin: 45, dayOffset: 0 },
  { id: "th-2", league: "thaileague", home: "port", away: "muang", kickHour: 21, kickMin: 15, dayOffset: 0 },
  { id: "th-3", league: "thaileague", home: "chon", away: "buri", kickHour: 20, kickMin: 0, dayOffset: 1 },
  { id: "pl-1", league: "premier", home: "liv", away: "ars", kickHour: 21, kickMin: 0, dayOffset: 0 },
  { id: "pl-2", league: "premier", home: "mci", away: "che", kickHour: 22, kickMin: 30, dayOffset: 0 },
  { id: "pl-3", league: "premier", home: "mun", away: "tot", kickHour: 23, kickMin: 0, dayOffset: -1 },
  { id: "pl-4", league: "premier", home: "newc", away: "avl", kickHour: 21, kickMin: 0, dayOffset: 1 },
  { id: "la-1", league: "laliga", home: "rma", away: "bar", kickHour: 2, kickMin: 0, dayOffset: 0 },
  { id: "la-2", league: "laliga", home: "atm", away: "sev", kickHour: 3, kickMin: 15, dayOffset: 1 },
  { id: "sa-1", league: "seriea", home: "int", away: "mil", kickHour: 1, kickMin: 45, dayOffset: 0 },
  { id: "sa-2", league: "seriea", home: "juv", away: "nap", kickHour: 18, kickMin: 0, dayOffset: 1 },
  { id: "ucl-1", league: "ucl", home: "bay", away: "psg", kickHour: 2, kickMin: 0, dayOffset: 2 },
  { id: "ucl-2", league: "ucl", home: "rma", away: "mci", kickHour: 2, kickMin: 0, dayOffset: 3 },
];

export type MatchStatus = "upcoming" | "live" | "finished";

export type MatchView = {
  id: string;
  league: LeagueId;
  leagueName: string;
  home: Team;
  away: Team;
  kickoffLabel: string;
  kickoffMs: number;
  status: MatchStatus;
  minute: number;
  homeGoals: number;
  awayGoals: number;
  homeLine: number;
  overLine: number;
  odds: {
    home: number;
    draw: number;
    away: number;
    hdpHome: number;
    hdpAway: number;
    over: number;
    under: number;
  };
};

function goalMinutes(rng: () => number) {
  const n = 1 + Math.floor(rng() * 3);
  const mins: { side: "home" | "away"; min: number }[] = [];
  for (let i = 0; i < n; i++) {
    mins.push({
      side: rng() > 0.48 ? "home" : "away",
      min: 4 + Math.floor(rng() * 88),
    });
  }
  return mins.sort((a, b) => a.min - b.min);
}

function scoreAt(goals: { side: "home" | "away"; min: number }[], minute: number) {
  let h = 0;
  let a = 0;
  for (const g of goals) {
    if (g.min <= minute) {
      if (g.side === "home") h += 1;
      else a += 1;
    }
  }
  return { h, a };
}

function snapLine(n: number) {
  const steps = [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5];
  let best = steps[0];
  for (const s of steps) if (Math.abs(s - n) < Math.abs(best - n)) best = s;
  return best;
}

export function getMatches(now: Date = new Date()): MatchView[] {
  const bk = bangkokParts(now);
  const leagueName = (id: LeagueId) => LEAGUES.find((l) => l.id === id)!.name;

  return FIXTURES.map((fx) => {
    const rng = mulberry32(hash32(`${fx.id}:${bk.dateKey}:mw`));
    const home = TEAMS[fx.home];
    const away = TEAMS[fx.away];
    const [y, m, d] = bk.dateKey.split("-").map(Number);
    const utcGuess = Date.UTC(y, m - 1, d + fx.dayOffset, fx.kickHour - 7, fx.kickMin, 0);

    const elapsedMin = (now.getTime() - utcGuess) / 60000;
    let status: MatchStatus = "upcoming";
    let minute = 0;
    if (elapsedMin >= 95) {
      status = "finished";
      minute = 90;
    } else if (elapsedMin >= 0) {
      status = "live";
      minute = Math.min(90, Math.floor(elapsedMin));
    }

    const goals = goalMinutes(rng);
    const { h, a } = scoreAt(goals, status === "upcoming" ? 0 : minute);
    const strength = rng();
    const homeLine = strength > 0.55 ? -snapLine(0.25 + rng() * 1.4) : snapLine(rng() * 0.75);
    const overLine = snapLine(2 + rng() * 1.25) || 2.5;

    const oddsBase = 0.85 + rng() * 0.2;
    return {
      id: fx.id,
      league: fx.league,
      leagueName: leagueName(fx.league),
      home,
      away,
      kickoffLabel: `${pad2(fx.kickHour)}:${pad2(fx.kickMin)}`,
      kickoffMs: utcGuess,
      status,
      minute,
      homeGoals: status === "upcoming" ? 0 : h,
      awayGoals: status === "upcoming" ? 0 : a,
      homeLine,
      overLine,
      odds: {
        home: Number((1.7 + rng()).toFixed(2)),
        draw: Number((3.1 + rng() * 0.8).toFixed(2)),
        away: Number((1.9 + rng() * 1.4).toFixed(2)),
        hdpHome: Number(oddsBase.toFixed(2)),
        hdpAway: Number((1.9 - oddsBase + 0.85).toFixed(2)),
        over: Number((0.88 + rng() * 0.16).toFixed(2)),
        under: Number((0.88 + rng() * 0.16).toFixed(2)),
      },
    };
  }).sort((a, b) => {
    const rank = (s: MatchStatus) => (s === "live" ? 0 : s === "upcoming" ? 1 : 2);
    const d = rank(a.status) - rank(b.status);
    if (d !== 0) return d;
    return a.kickoffMs - b.kickoffMs;
  });
}

export function getMatch(id: string, now: Date = new Date()) {
  return getMatches(now).find((m) => m.id === id);
}

function quarterSettle(diff: number): "win" | "lose" | "push" | "halfwin" | "halflose" {
  if (diff === 0) return "push";
  if (diff > 0 && diff < 0.5) return "halfwin";
  if (diff < 0 && diff > -0.5) return "halflose";
  if (diff > 0) return "win";
  return "lose";
}

export function settleHdp(homeGoals: number, awayGoals: number, homeLine: number, pick: "home" | "away") {
  const spread = homeGoals - awayGoals + homeLine;
  const diff = pick === "home" ? spread : -spread;
  return quarterSettle(diff);
}

export function settleOu(homeGoals: number, awayGoals: number, line: number, pick: "over" | "under") {
  const total = homeGoals + awayGoals;
  const diff = pick === "over" ? total - line : line - total;
  return quarterSettle(diff);
}

export function settle1x2(homeGoals: number, awayGoals: number, pick: "home" | "draw" | "away") {
  const res = homeGoals > awayGoals ? "home" : homeGoals < awayGoals ? "away" : "draw";
  return res === pick ? "win" : "lose";
}

export function payoutFor(result: ReturnType<typeof quarterSettle>, stake: number, odds: number) {
  if (result === "win") return stake * odds + stake;
  if (result === "halfwin") return stake * 0.5 * odds + stake;
  if (result === "push") return stake;
  if (result === "halflose") return stake * 0.5;
  return 0;
}

export const STAKE_CHIPS = [20, 50, 100, 200, 500, 1000, 5000];
