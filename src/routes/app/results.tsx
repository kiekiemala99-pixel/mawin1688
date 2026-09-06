import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useNow } from "@/hooks/use-now";
import { DailyResults, GovResultCard, YeekeeResultCard } from "@/components/result-cards";
import { listFootballMatches } from "@/lib/football-feed";
import type { MatchView } from "@/lib/football";

export const Route = createFileRoute("/app/results")({ component: ResultsPage });

function ResultsPage() {
  const now = useNow(1000);
  const date = new Date(now);
  const [matches, setMatches] = useState<MatchView[]>([]);
  const [at, setAt] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const rows = await listFootballMatches();
        if (!alive) return;
        setMatches(rows);
        setAt(Date.now());
      } catch {
        /* keep last */
      }
    }
    void load();
    const t = window.setInterval(() => void load(), 30000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, []);

  const live = matches.filter((m) => m.status === "live");
  const done = matches.filter((m) => m.status === "finished").slice(0, 12);

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold text-gold-bright">ผลรางวัล</h1>
      <YeekeeResultCard now={date} />
      <GovResultCard now={date} />
      <h2 className="pt-2 text-sm font-semibold text-gold-bright">หวยรายวัน · หุ้น</h2>
      <DailyResults now={date} />
      <div className="flex items-end justify-between pt-2">
        <h2 className="text-sm font-semibold text-gold-bright">ผลบอลสด</h2>
        {at ? <span className="text-[11px] text-cream/45">อัปเดตทุก 30 วินาที</span> : null}
      </div>
      {live.length === 0 && done.length === 0 ? (
        <p className="rounded-2xl bg-navy-card px-3 py-4 text-sm text-cream/60">กำลังดึงสกอร์ล่าสุด…</p>
      ) : null}
      {live.map((m) => (
        <div key={m.id} className="rounded-2xl bg-navy-card px-3 py-3 shadow-[0_0_0_1px_rgba(201,164,74,0.2)]">
          <div className="text-[11px] text-cream/55">
            {m.leagueName} · <span className="font-semibold text-live">LIVE {m.minute}′</span>
          </div>
          <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center font-semibold">
            <span>{m.home.name}</span>
            <span className="tabular text-gold-bright">
              {m.homeGoals} - {m.awayGoals}
            </span>
            <span className="text-right">{m.away.name}</span>
          </div>
        </div>
      ))}
      {done.length > 0 ? <h2 className="pt-1 text-sm font-semibold text-gold-bright">ผลบอลที่จบแล้ว</h2> : null}
      {done.map((m) => (
        <div key={m.id} className="rounded-2xl bg-navy-card px-3 py-3 shadow-[0_0_0_1px_rgba(201,164,74,0.2)]">
          <div className="text-[11px] text-cream/55">{m.leagueName} · FT</div>
          <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center font-semibold">
            <span>{m.home.name}</span>
            <span className="tabular text-gold-bright">
              {m.homeGoals} - {m.awayGoals}
            </span>
            <span className="text-right">{m.away.name}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
