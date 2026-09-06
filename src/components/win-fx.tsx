import { useEffect, useMemo, useState } from "react";
import { formatBaht } from "@/lib/format";
import { cn } from "@/lib/utils";

export function LampRow({ running, won }: { running?: boolean; won?: boolean }) {
  return (
    <div className={cn("lamp-row", running && "is-run", won && "is-win")}>
      {Array.from({ length: 14 }, (_, i) => (
        <span key={i} className="lamp" />
      ))}
    </div>
  );
}

export function WinFx({
  show,
  amount,
  big = false,
}: {
  show: boolean;
  amount: number;
  big?: boolean;
}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (show) setTick((n) => n + 1);
  }, [show]);

  const count = big ? 36 : 18;
  const coins = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: `${4 + ((i * 13) % 92)}%`,
        delay: `${(i % 10) * 0.05}s`,
        duration: `${1.05 + (i % 6) * 0.14}s`,
        size: `${0.9 + (i % 4) * 0.22}rem`,
      })),
    [tick, count],
  );

  if (!show || amount <= 0) return null;

  return (
    <div className="win-layer" key={tick} aria-hidden>
      {coins.map((c, i) => (
        <span
          key={i}
          className="win-coin"
          style={{
            left: c.left,
            width: c.size,
            height: c.size,
            animationDelay: c.delay,
            animationDuration: c.duration,
          }}
        />
      ))}
      {big ? <div className="big-win-banner">BIG WIN</div> : null}
      <div className={cn("payout-pop", big && "top-[46%]")}>+฿ {formatBaht(amount, 0)}</div>
    </div>
  );
}
