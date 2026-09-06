import { useEffect, type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Goal, House, ShieldCheck, Ticket, Trophy, UserRound, Wallet } from "lucide-react";
import { GoldHeader } from "./site-header";
import { isPlayPath } from "./game-stage";
import { useSessionUser, useStore } from "@/lib/store";
import { formatBaht } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AccountView } from "@/lib/wallet-server";

const TABS = [
  { to: "/app", label: "หน้าหลัก", icon: House },
  { to: "/app/lottery", label: "หวย", icon: Ticket },
  { to: "/app/football", label: "บอล", icon: Goal },
  { to: "/app/results", label: "ผลรางวัล", icon: Trophy },
  { to: "/app/profile", label: "ฉัน", icon: UserRound },
] as const;

export function MemberShell({
  children,
  account,
}: {
  children: ReactNode;
  account?: AccountView | null;
}) {
  if (account && !useStore.getState().wallet) {
    useStore.getState().hydrateFromServer(account);
  }
  const storeUser = useSessionUser();
  const user =
    storeUser ??
    (account
      ? {
          username: account.wallet.username,
          phone: account.wallet.phone,
          balance: account.wallet.balance,
          bankName: account.wallet.bankName,
          bankAccount: account.wallet.bankAccount,
          isStaff: account.wallet.isStaff,
          turnoverNeed: account.wallet.turnoverNeed,
          turnoverDone: account.wallet.turnoverDone,
          turnoverRemain: account.wallet.turnoverRemain,
        }
      : null);
  const refresh = useStore((s) => s.refresh);
  const settle = useStore((s) => s.settle);
  const loc = useLocation();

  useEffect(() => {
    if (!user) return;
    void refresh().then(() => settle());
    const t = window.setInterval(() => {
      void settle();
    }, 20000);
    return () => window.clearInterval(t);
  }, [user, refresh, settle]);

  if (!user) {
    return (
      <div className="luxury-bg grid min-h-dvh place-items-center px-4 text-center">
        <div>
          <div className="text-gold-bright">กรุณาเข้าสู่ระบบ</div>
          <p className="mt-2 text-sm text-cream/60">ถ้าเพิ่งกรอกรหัส ให้ลองเข้าใหม่อีกครั้ง</p>
          <a href="/" className="btn-gold mt-4 inline-flex h-11 items-center rounded-lg px-5 text-sm">
            ไปหน้าเข้าสู่ระบบ
          </a>
        </div>
      </div>
    );
  }

  if (isPlayPath(loc.pathname)) {
    return <div className="luxury-bg min-h-dvh">{children}</div>;
  }

  return (
    <div className="luxury-bg min-h-dvh pb-20">
      <GoldHeader user={user} />
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-3 py-2">
        <div className="min-w-0">
          <div className="text-xs text-cream/60">สวัสดี, {user.username}</div>
          <div className="tabular text-lg font-semibold text-gold-bright">฿ {formatBaht(user.balance)}</div>
        </div>
        <div className="flex gap-2">
          {user.isStaff && (
            <Link
              to="/app/admin"
              className="inline-flex h-10 items-center gap-1 rounded-lg bg-gold-ink px-3 text-sm font-medium text-gold-bright"
            >
              <ShieldCheck className="size-4" />
              แอดมิน
            </Link>
          )}
          <Link to="/app/wallet" className="btn-gold inline-flex h-10 items-center gap-1 rounded-lg px-3 text-sm">
            <Wallet className="size-4" />
            กระเป๋า
          </Link>
          <Link
            to="/app/history"
            className="inline-flex h-10 items-center rounded-lg bg-navy-card px-3 text-sm font-medium text-cream shadow-[0_0_0_1px_rgba(201,164,74,0.25)]"
          >
            ประวัติ
          </Link>
        </div>
      </div>
      <main className="mx-auto w-full max-w-5xl px-3 pb-6">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gold/25 bg-navy-deep/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm">
        <div className="mx-auto grid max-w-5xl grid-cols-5">
          {TABS.map((t) => {
            const isHome = t.to === "/app";
            const active = isHome ? loc.pathname === "/app" || loc.pathname === "/app/" : loc.pathname.startsWith(t.to);
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-0.5 text-[11px]",
                  active ? "nav-active" : "text-cream/55",
                )}
              >
                <Icon className="size-5" />
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
