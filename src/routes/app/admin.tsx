import { Outlet, createFileRoute, useLocation } from "@tanstack/react-router";
import { Disc3, Film, Gift, Landmark, Share2, SlidersHorizontal, Trophy, Users, Wallet } from "lucide-react";
import { useSessionUser } from "@/lib/store";
import { getStaffSummary } from "@/lib/wallet-server";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/admin")({
  loader: async () => {
    try {
      return await getStaffSummary();
    } catch {
      return { pendingDeposits: 0, pendingWithdraws: 0, memberCount: 0 };
    }
  },
  component: AdminLayout,
});

const TABS = [
  { to: "/app/admin", label: "รอฝาก", icon: Landmark },
  { to: "/app/admin/withdraw", label: "รอถอน", icon: Wallet },
  { to: "/app/admin/promos", label: "โปรโมชัน", icon: Gift },
  { to: "/app/admin/referral", label: "แนะนำเพื่อน", icon: Share2 },
  { to: "/app/admin/movies", label: "หนัง/แบนเนอร์", icon: Film },
  { to: "/app/admin/rtp", label: "อัตราแพ้ชนะ", icon: SlidersHorizontal },
  { to: "/app/admin/wheel", label: "คูปอง", icon: Disc3 },
  { to: "/app/admin/draws", label: "ผลหวย", icon: Trophy },
  { to: "/app/admin/members", label: "สมาชิก", icon: Users },
] as const;

function AdminLayout() {
  const user = useSessionUser();
  const loc = useLocation();
  const summary = Route.useLoaderData();

  if (!user?.isStaff) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl bg-navy-card px-4 py-8 text-center">
        <p className="text-cream">เฉพาะผู้ดูแลระบบ</p>
        <p className="mt-2 text-xs text-cream/55">บัญชีนี้ไม่มีสิทธิ์เข้าหน้านี้</p>
        <a href="/app" className="mt-3 inline-block text-sm text-gold-bright">
          กลับหน้าสมาชิก
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-3">
      <div>
        <h1 className="text-lg font-semibold text-gold-bright">แผงควบคุมแอดมิน</h1>
        <p className="text-xs text-cream/55">ฝาก-ถอน · โปรโมชัน · แนะนำเพื่อน · อัตราแพ้ชนะ · คูปอง · ผลหวย · สมาชิก</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-navy-card px-3 py-3 text-center">
            <div className="text-[11px] text-cream/55">สมัครทั้งหมด</div>
            <div className="tabular text-xl font-semibold text-gold-bright">{summary.memberCount}</div>
            <div className="text-[10px] text-cream/45">คน</div>
          </div>
          <div className="rounded-xl bg-navy-card px-3 py-3 text-center">
            <div className="text-[11px] text-cream/55">รอฝาก</div>
            <div className="tabular text-xl font-semibold text-gold-bright">{summary.pendingDeposits}</div>
          </div>
          <div className="rounded-xl bg-navy-card px-3 py-3 text-center">
            <div className="text-[11px] text-cream/55">รอถอน</div>
            <div className="tabular text-xl font-semibold text-gold-bright">{summary.pendingWithdraws}</div>
          </div>
        </div>
      </div>
      <nav className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TABS.map((t) => {
          const active =
            t.to === "/app/admin"
              ? loc.pathname === "/app/admin" || loc.pathname === "/app/admin/"
              : loc.pathname.startsWith(t.to);
          const Icon = t.icon;
          return (
            <a
              key={t.to}
              href={t.to}
              className={cn(
                "flex h-12 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold",
                active ? "btn-gold" : "bg-navy-card text-cream shadow-[0_0_0_1px_rgba(201,164,74,0.22)]",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {t.label}
            </a>
          );
        })}
      </nav>
      <Outlet />
    </div>
  );
}
