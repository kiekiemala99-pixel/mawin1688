import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { PLAY_TYPES } from "@/lib/lottery";
import { formatBaht } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/history")({ component: HistoryPage });

function HistoryPage() {
  const bets = useStore((s) => s.bets);

  return (
    <div className="space-y-2">
      <h1 className="mb-3 text-lg font-semibold text-gold-bright">ประวัติการแทง</h1>
      {bets.length === 0 && <p className="text-sm text-cream/60">ยังไม่มีบิล</p>}
      {bets.map((b) => (
        <article key={b.id} className="rounded-2xl bg-navy-card px-3 py-3 shadow-[0_0_0_1px_rgba(201,164,74,0.2)]">
          <div className="flex items-start justify-between gap-2">
            <div>
              {b.kind === "lottery" ? (
                <>
                  <div className="text-sm font-semibold text-cream">{b.marketName}</div>
                  <div className="mt-0.5 text-xs text-cream/60">
                    {PLAY_TYPES.find((p) => p.id === b.play)?.label} · เลข {b.number} · เรท 1:{b.rate}
                  </div>
                </>
              ) : b.kind === "slot" || b.kind === "mini" ? (
                <>
                  <div className="text-sm font-semibold text-cream">{b.label}</div>
                  <div className="mt-0.5 text-xs text-cream/60">{b.kind === "mini" ? "มินิเกมพื้นบ้าน" : "สล็อต 9 เส้น"}</div>
                </>
              ) : (
                <>
                  <div className="text-sm font-semibold text-cream">บอล</div>
                  <div className="mt-0.5 text-xs text-cream/60">
                    {b.label} · @{b.odds.toFixed(2)}
                  </div>
                </>
              )}
            </div>
            <Status status={b.status} />
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-cream/60">เดิมพัน {formatBaht(b.stake, 0)}</span>
            <span className="tabular font-semibold text-gold-bright">
              {b.status === "pending" ? "รอผล" : `ได้ ${formatBaht(b.payout, 0)}`}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

function Status({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-gold/20 text-gold-bright",
    won: "bg-win/20 text-win",
    lost: "bg-lose/20 text-lose",
    push: "bg-cream/10 text-cream/70",
  };
  const label: Record<string, string> = { pending: "รอผล", won: "ชนะ", lost: "แพ้", push: "คืนทุน" };
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", map[status])}>{label[status] ?? status}</span>;
}
