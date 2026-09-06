import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { LEAGUES, STAKE_CHIPS, type LeagueId, type MatchView } from "@/lib/football";
import { listFootballMatches } from "@/lib/football-feed";
import { formatHandicap, formatOdds } from "@/lib/format";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { FootballPayoutBoard } from "@/components/payout-board";
import { GameStage } from "@/components/game-stage";

export const Route = createFileRoute("/app/football")({ component: FootballPage });

type Pick = {
  match: MatchView;
  market: "1x2" | "hdp" | "ou";
  pick: "home" | "draw" | "away" | "over" | "under";
  line?: number;
  odds: number;
  label: string;
};

function FootballPage() {
  const [matches, setMatches] = useState<MatchView[]>([]);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [league, setLeague] = useState<LeagueId | "all">("all");
  const [slip, setSlip] = useState<Pick[]>([]);
  const [stake, setStake] = useState(100);
  const [busy, setBusy] = useState(false);
  const placeSlip = useStore((s) => s.placeFootballSlip);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const rows = await listFootballMatches();
        if (!alive) return;
        setMatches(rows);
        setUpdatedAt(Date.now());
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "โหลดโปรแกรมบอลไม่สำเร็จ");
      }
    }
    void load();
    const t = window.setInterval(() => void load(), 30000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, []);

  const list = league === "all" ? matches : matches.filter((m) => m.league === league);

  function choose(p: Pick) {
    if (p.match.status === "finished") {
      toast.error("คู่นี้จบแล้ว");
      return;
    }
    setSlip((rows) => {
      if (rows.some((r) => r.match.id === p.match.id && r.market === p.market && r.pick === p.pick)) {
        return rows;
      }
      if (rows.length >= 20) {
        toast.error("บิลเต็มแล้ว");
        return rows;
      }
      return [...rows, p];
    });
  }

  async function confirm() {
    if (slip.length === 0 || busy) return;
    setBusy(true);
    try {
      const err = await placeSlip(
        slip.map((item) => ({
          matchId: item.match.id,
          label: item.label,
          market: item.market,
          pick: item.pick,
          line: item.line,
          odds: item.odds,
          stake,
        })),
      );
      if (err) {
        toast.error(err);
        return;
      }
      toast.success(`บันทึก ${slip.length} บิล · หัก ${(stake * slip.length).toLocaleString("th-TH")} บาท`);
      setSlip([]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <GameStage
      backTo="/app"
      title="แทงบอล"
      subtitle={updatedAt ? "สกอร์สดและค่าน้ำ · อัปเดตทุก 30 วินาที" : "โปรแกรม ค่าน้ำ และสกอร์สด"}
      dock={
        slip.length > 0 ? (
          <div className="mx-auto w-full max-w-md space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-gold-bright">โพยบอล · {slip.length} บิล</div>
                <div className="text-xs text-cream/55">รวมหัก {(stake * slip.length).toLocaleString("th-TH")} บาท</div>
              </div>
              <button type="button" className="rounded-md p-1 text-cream/70" aria-label="ล้างโพย" onClick={() => setSlip([])}>
                <X className="size-5" />
              </button>
            </div>
            <div className="max-h-24 space-y-1 overflow-y-auto">
              {slip.map((item, i) => (
                <div key={`${item.match.id}-${item.market}-${item.pick}-${i}`} className="flex items-center justify-between text-sm text-cream">
                  <span className="min-w-0 truncate">{item.label}</span>
                  <span className="tabular ml-2 text-gold-bright">@{formatOdds(item.odds)}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {STAKE_CHIPS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setStake(c)}
                  className={cn("h-10 min-w-12 rounded-lg px-2 text-sm font-semibold", stake === c ? "btn-gold" : "bg-navy-mid text-cream")}
                >
                  {c}
                </button>
              ))}
            </div>
            <button type="button" disabled={busy} className="spin-3d text-base disabled:opacity-60" onClick={() => void confirm()}>
              {busy ? "กำลังหักเครดิต…" : "ส่งโพย"}
            </button>
          </div>
        ) : (
          <p className="text-center text-xs text-cream/50">กดราคาเพื่อใส่โพย</p>
        )
      }
    >
      <div className="mx-auto w-full max-w-md space-y-3 pb-2">
        <FootballPayoutBoard />
        <p className="text-xs text-cream/55">
          อัปเดตทุกนาที
          {updatedAt ? ` · ล่าสุด ${new Date(updatedAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}` : ""}
        </p>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <Chip active={league === "all"} onClick={() => setLeague("all")}>
            ทั้งหมด
          </Chip>
          {LEAGUES.map((l) => (
            <Chip key={l.id} active={league === l.id} onClick={() => setLeague(l.id)}>
              {l.name}
            </Chip>
          ))}
        </div>

      <div className="space-y-2">
        {list.map((m) => (
          <article key={m.id} className="overflow-hidden rounded-2xl bg-navy-card shadow-[0_0_0_1px_rgba(201,164,74,0.22)]">
            <div className="flex items-center justify-between px-3 py-2 text-[11px] text-cream/60">
              <span>{m.leagueName}</span>
              {m.status === "live" ? (
                <span className="font-semibold text-live">LIVE {m.minute}′</span>
              ) : m.status === "finished" ? (
                <span>FT</span>
              ) : (
                <span>{m.kickoffLabel} น.</span>
              )}
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center px-3 pb-2">
              <TeamCell team={m.home} />
              <div className="tabular px-3 text-center text-xl font-semibold text-gold-bright">
                {m.status === "upcoming" ? "vs" : `${m.homeGoals} - ${m.awayGoals}`}
              </div>
              <TeamCell team={m.away} align="right" />
            </div>
            <div className="grid grid-cols-3 gap-px bg-navy-edge/80 text-center text-[11px]">
              <OddsBtn
                label="1"
                value={formatOdds(m.odds.home)}
                onClick={() =>
                  choose({
                    match: m,
                    market: "1x2",
                    pick: "home",
                    odds: m.odds.home,
                    label: `${m.home.name} ชนะ`,
                  })
                }
              />
              <OddsBtn
                label="X"
                value={formatOdds(m.odds.draw)}
                onClick={() =>
                  choose({
                    match: m,
                    market: "1x2",
                    pick: "draw",
                    odds: m.odds.draw,
                    label: `${m.home.abbr} เสมอ ${m.away.abbr}`,
                  })
                }
              />
              <OddsBtn
                label="2"
                value={formatOdds(m.odds.away)}
                onClick={() =>
                  choose({
                    match: m,
                    market: "1x2",
                    pick: "away",
                    odds: m.odds.away,
                    label: `${m.away.name} ชนะ`,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-px bg-navy-edge/80 text-center text-[11px]">
              <OddsBtn
                label={`ต่อ ${formatHandicap(m.homeLine)}`}
                value={formatOdds(m.odds.hdpHome)}
                onClick={() =>
                  choose({
                    match: m,
                    market: "hdp",
                    pick: "home",
                    line: m.homeLine,
                    odds: m.odds.hdpHome,
                    label: `${m.home.name} ${formatHandicap(m.homeLine)}`,
                  })
                }
              />
              <OddsBtn
                label={`รอง ${formatHandicap(-m.homeLine)}`}
                value={formatOdds(m.odds.hdpAway)}
                onClick={() =>
                  choose({
                    match: m,
                    market: "hdp",
                    pick: "away",
                    line: m.homeLine,
                    odds: m.odds.hdpAway,
                    label: `${m.away.name} ${formatHandicap(-m.homeLine)}`,
                  })
                }
              />
              <OddsBtn
                label={`สูง ${m.overLine}`}
                value={formatOdds(m.odds.over)}
                onClick={() =>
                  choose({
                    match: m,
                    market: "ou",
                    pick: "over",
                    line: m.overLine,
                    odds: m.odds.over,
                    label: `สูง ${m.overLine} (${m.home.abbr}-${m.away.abbr})`,
                  })
                }
              />
              <OddsBtn
                label={`ต่ำ ${m.overLine}`}
                value={formatOdds(m.odds.under)}
                onClick={() =>
                  choose({
                    match: m,
                    market: "ou",
                    pick: "under",
                    line: m.overLine,
                    odds: m.odds.under,
                    label: `ต่ำ ${m.overLine} (${m.home.abbr}-${m.away.abbr})`,
                  })
                }
              />
            </div>
          </article>
        ))}
        {list.length === 0 && <p className="rounded-2xl bg-navy-card px-3 py-6 text-center text-sm text-cream/60">กำลังโหลดโปรแกรมแข่ง…</p>}
      </div>
      </div>
    </GameStage>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-10 shrink-0 rounded-full px-3 text-sm font-medium",
        active ? "btn-gold" : "bg-navy-card text-cream/80",
      )}
    >
      {children}
    </button>
  );
}

function TeamCell({ team, align }: { team: MatchView["home"]; align?: "right" }) {
  return (
    <div className={cn("flex items-center gap-2", align === "right" && "flex-row-reverse")}>
      {team.logo ? (
        <img src={team.logo} alt="" className="size-8 rounded-md bg-navy-mid object-contain" />
      ) : (
        <span className={cn("grid size-8 place-items-center rounded-md text-[10px] font-bold", team.tone)}>
          {team.abbr.slice(0, 3)}
        </span>
      )}
      <span className={cn("text-sm font-medium text-cream", align === "right" && "text-right")}>{team.name}</span>
    </div>
  );
}

function OddsBtn({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="bg-navy-mid px-2 py-2.5 hover:bg-navy-edge">
      <div className="text-cream/55">{label}</div>
      <div className="tabular font-semibold text-gold-bright">{value}</div>
    </button>
  );
}
