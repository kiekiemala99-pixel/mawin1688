import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

function Corner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 88 88" className={cn("pointer-events-none absolute size-[72px]", className)} aria-hidden>
      <path d="M0 0 H88 L0 88 Z" fill="#fffefb" />
      <path d="M0 0 H88 L0 88 Z" fill="none" stroke="#c9a44a" strokeWidth="1.2" />
      <path d="M0 0 H56 L0 56 Z" fill="none" stroke="#c9a44a" strokeWidth="0.9" />
      <path d="M0 0 H28 L0 28 Z" fill="#e8d48b" opacity="0.55" />
    </svg>
  );
}

export function GoldCard({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div className={cn("ornament-card rounded-3xl", padded && "p-4", className)}>
      <Corner className="left-0 top-0" />
      <Corner className="right-0 top-0 scale-x-[-1]" />
      <Corner className="bottom-0 left-0 scale-y-[-1]" />
      <Corner className="right-0 bottom-0 scale-[-1]" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
