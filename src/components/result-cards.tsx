import { useEffect, useState } from "react";
import { DiamondMark, ThaiFlag } from "@/components/icons";
import { GoldCard } from "@/components/gold-card";
import { getGovState, getYeekeeState, getMarketState, MARKETS, type DrawResult, type RoundState } from "@/lib/lottery";
import { listPublicDraws, type PostedDraw } from "@/lib/lottery-draws-server";
import { cn } from "@/lib/utils";

function usePostedDraws() {
  const [map, setMap] = useState<Record<string, PostedDraw>>({});
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const rows = await listPublicDraws();
        if (!alive) return;
        const next: Record<string, PostedDraw> = {};
        for (const row of rows) next[row.roundKey] = row;
        setMap(next);
      } catch {
        /* keep last overlay */
      }
    }
    void load();
    const t = window.setInterval(() => void load(), 20000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, []);
  return map;
}

function overlayResult(map: Record<string, PostedDraw>, roundKey?: string, fallback?: DrawResult): DrawResult | undefined {
  if (!roundKey) return fallback;
  const hit = map[roundKey];
  if (!hit) return fallback;
  return { top3: hit.top3, bottom2: hit.bottom2, first6: hit.first6 || fallback?.first6 };
}

function ResultPair({
  leftTitle,
  leftValue,
  rightTitle,
  rightValue,
}: {
  leftTitle: string;
  leftValue: string;
  rightTitle: string;
  rightValue: string;
}) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <div className="overflow-hidden rounded-lg bg-card shadow-[0_0_0_1px_rgba(201,164,74,0.35)]">
        <div className="gold-label py-1.5 text-center text-sm">{leftTitle}</div>
        <div className="tabular py-3 text-center text-2xl font-semibold tracking-[0.2em] text-ink">{leftValue}</div>
      </div>
      <div className="overflow-hidden rounded-lg bg-card shadow-[0_0_0_1px_rgba(201,164,74,0.35)]">
        <div className="gold-label py-1.5 text-center text-sm">{rightTitle}</div>
        <div className="tabular py-3 text-center text-2xl font-semibold tracking-[0.2em] text-ink">{rightValue}</div>
      </div>
    </div>
  );
}

export function YeekeeResultCard({ now }: { now: Date }) {
  const posted = usePostedDraws();
  const st = getYeekeeState(now);
  const key = st.result ? st.roundKey : st.previous?.roundKey;
  const shown = overlayResult(posted, key, st.result ?? st.previous?.result);
  const label = st.result ? st.label : st.previous?.label;
  return (
    <GoldCard>
      <div className="flex items-center gap-2">
        <DiamondMark className="size-5 text-gold" />
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <h2 className="text-[15px] font-semibold text-ink">จับยี่กี · {label}</h2>
          <span className="rounded-md bg-gold-ink px-2 py-0.5 text-[11px] font-medium text-cream">
            {st.dateEn}
          </span>
        </div>
      </div>
      <ResultPair
        leftTitle="3 ตัวบน"
        leftValue={shown?.top3 ?? "XXX"}
        rightTitle="2 ตัวล่าง"
        rightValue={shown?.bottom2 ?? "XX"}
      />
    </GoldCard>
  );
}

export function GovResultCard({ now, official }: { now: Date; official?: DrawResult | null }) {
  const posted = usePostedDraws();
  const st = getGovState(now);
  const shown = official ?? overlayResult(posted, st.previous?.roundKey, st.previous?.result);
  return (
    <GoldCard>
      <div className="flex items-center gap-2">
        <ThaiFlag className="h-6 w-9 rounded-sm shadow-sm" />
        <h2 className="text-[15px] font-semibold text-ink">หวยรัฐบาล</h2>
        <span className="rounded-md bg-gold-ink px-2 py-0.5 text-[11px] font-medium text-cream">
          {st.previous?.dateEn}
        </span>
      </div>
      <div className="mt-3 overflow-hidden rounded-lg bg-card shadow-[0_0_0_1px_rgba(201,164,74,0.35)]">
        <div className="gold-label py-1.5 text-center text-sm">รางวัลที่ 1</div>
        <div className="tabular py-3 text-center text-2xl font-semibold tracking-[0.28em] text-ink">
          {shown?.first6 ?? "XXXXXX"}
        </div>
      </div>
      <ResultPair
        leftTitle="3 ตัวท้าย"
        leftValue={shown?.top3 ?? "XXX"}
        rightTitle="2 ตัวท้าย"
        rightValue={shown?.bottom2 ?? "XX"}
      />
    </GoldCard>
  );
}

export function MiniMarketResult({ st, name, posted }: { st: RoundState; name: string; posted?: Record<string, PostedDraw> }) {
  const shown = overlayResult(posted ?? {}, st.result ? st.roundKey : st.previous?.roundKey, st.result ?? st.previous?.result);
  return (
    <GoldCard className="p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">{name}</h3>
        <span className="text-[11px] text-muted">{st.previous?.dateEn ?? st.dateEn}</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-center">
        <div>
          <div className="text-[11px] text-muted">3 ตัวบน</div>
          <div className="tabular text-lg font-semibold tracking-widest">{shown?.top3 ?? "XXX"}</div>
        </div>
        <div>
          <div className="text-[11px] text-muted">2 ตัวล่าง</div>
          <div className="tabular text-lg font-semibold tracking-widest">{shown?.bottom2 ?? "XX"}</div>
        </div>
      </div>
    </GoldCard>
  );
}

export function DailyResults({ now }: { now: Date }) {
  const posted = usePostedDraws();
  const extras = MARKETS.filter((m) => m.kind === "daily");
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {extras.map((m) => (
        <MiniMarketResult key={m.id} name={m.name} st={getMarketState(m.id, now)} posted={posted} />
      ))}
    </div>
  );
}

export function StatusPill({ open }: { open: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
        open ? "bg-win/15 text-win" : "bg-muted/15 text-muted",
      )}
    >
      {open ? "เปิดรับแทง" : "ปิดรับแทง"}
    </span>
  );
}
