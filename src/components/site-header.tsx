import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { Logo } from "./logo";
import { formatBaht } from "@/lib/format";
import type { User } from "@/lib/store";

const LINE_URL = "https://lin.ee/zUDsggSO";

export function GoldHeader({
  user,
}: {
  user?: User | null;
}) {
  return (
    <header className="gold-bar sticky top-0 z-40">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-3">
        <Link to="/" className="min-w-0">
          <Logo compact onGold />
        </Link>
        <div className="flex items-center gap-2">
          {user && (
            <Link
              to="/app/wallet"
              className="hidden rounded-full bg-gold-ink/90 px-3 py-1.5 text-xs font-semibold text-cream sm:inline-flex"
            >
              ฿ {formatBaht(user.balance, 0)}
            </Link>
          )}
          <a
            href={LINE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-navy px-3 text-sm font-medium text-cream"
          >
            <MessageCircle className="size-4 text-gold-bright" />
            ติดต่อเรา
          </a>
          {user ? (
            <a href="/api/logout" className="inline-flex h-10 items-center rounded-full px-3 text-sm font-medium text-gold-ink/90">
              ออก
            </a>
          ) : null}
        </div>
      </div>
    </header>
  );
}
