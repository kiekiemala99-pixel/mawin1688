import { Link, createFileRoute } from "@tanstack/react-router";
import { useNow } from "@/hooks/use-now";
import { MARKETS, getMarketState } from "@/lib/lottery";
import { secondsToClock } from "@/lib/time";
import { StatusPill } from "@/components/result-cards";
import { LotteryPayoutBoard, PayoutTicker } from "@/components/payout-board";

export const Route = createFileRoute("/app/lottery/")({ component: LotteryList });

function LotteryList() {
  const now = useNow(1000);
  const date = new Date(now);
  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold text-gold-bright">แทงหวย</h1>
      <PayoutTicker />
      <LotteryPayoutBoard />
      <div className="grid gap-2 sm:grid-cols-2">
        {MARKETS.map((m) => {
          const st = getMarketState(m.id, date);
          const shown = st.result ?? st.previous?.result;
          return (
            <Link
              key={m.id}
              to="/app/lottery/$id"
              params={{ id: m.id }}
              className="rounded-2xl bg-navy-card p-4 shadow-[0_0_0_1px_rgba(201,164,74,0.22)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-base font-semibold text-cream">{m.name}</div>
                  <div className="mt-1 text-xs text-cream/55">
                    {st.open ? `${st.label} · ปิดรับ ${secondsToClock(st.remainingSec)}` : "ปิดรับแทง"}
                  </div>
                </div>
                <StatusPill open={st.open} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg bg-navy-mid py-2">
                  <div className="text-[11px] text-gold">3 ตัวบน</div>
                  <div className="tabular text-lg font-semibold tracking-[0.2em]">{shown?.top3 ?? "XXX"}</div>
                </div>
                <div className="rounded-lg bg-navy-mid py-2">
                  <div className="text-[11px] text-gold">2 ตัวล่าง</div>
                  <div className="tabular text-lg font-semibold tracking-[0.2em]">{shown?.bottom2 ?? "XX"}</div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
