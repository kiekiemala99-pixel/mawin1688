import { cn } from "@/lib/utils";

export function Crest({ className }: { className?: string }) {
  const gid = "mw-crest";
  return (
    <svg
      viewBox="0 0 64 64"
      width="32"
      height="32"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0d789" />
          <stop offset="55%" stopColor="#c9a44a" />
          <stop offset="100%" stopColor="#8a6a1f" />
        </linearGradient>
      </defs>
      <path
        d="M32 3.5 L55 13.5 V34.5 C55 47.5 43.5 56.5 32 61 C20.5 56.5 9 47.5 9 34.5 V13.5 Z"
        fill={`url(#${gid})`}
        stroke="#5c4714"
        strokeWidth="1.4"
      />
      <path
        d="M32 8 L50 16 V34 C50 44 41 52 32 55.5 C23 52 14 44 14 34 V16 Z"
        fill="none"
        stroke="#faf6ea"
        strokeOpacity="0.35"
        strokeWidth="0.8"
      />
      <text
        x="32"
        y="40"
        textAnchor="middle"
        fontSize="22"
        fontWeight="700"
        fill="#3a2c0c"
        fontFamily="Cinzel, serif"
      >
        M
      </text>
    </svg>
  );
}

export function Logo({
  className,
  compact = false,
  onGold = false,
}: {
  className?: string;
  compact?: boolean;
  onGold?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Crest className={compact ? "size-8" : "size-10"} />
      <div className="leading-none">
        <div
          className={cn(
            "font-semibold tracking-wide",
            compact ? "text-lg" : "text-xl",
            onGold ? "text-gold-ink" : "text-gold-bright",
          )}
        >
          มาวิน1688
        </div>
        {!compact && (
          <div
            className={cn(
              "mt-0.5 text-[10px] font-medium tracking-[0.18em]",
              onGold ? "text-gold-ink/70" : "text-gold/80",
            )}
          >
            MAWIN LOTTO · BALL
          </div>
        )}
      </div>
    </div>
  );
}
