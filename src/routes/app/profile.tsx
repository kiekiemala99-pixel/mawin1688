import { Link, createFileRoute } from "@tanstack/react-router";
import { useSessionUser, useStore } from "@/lib/store";
import { formatBaht } from "@/lib/format";
import { GoldCard } from "@/components/gold-card";

export const Route = createFileRoute("/app/profile")({ component: ProfilePage });

function ProfilePage() {
  const user = useSessionUser();
  const bets = useStore((s) => s.bets);
  if (!user) return null;

  return (
    <div className="mx-auto max-w-lg space-y-3">
      <GoldCard>
        <div className="text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-gold-ink font-display text-2xl font-bold text-gold-bright">
            {user.username.slice(0, 1).toUpperCase()}
          </div>
          <h1 className="mt-2 text-lg font-semibold">{user.username}</h1>
          <p className="text-sm text-muted">{user.phone.startsWith("oauth:") ? "เข้าสู่ระบบด้วยโซเชียล" : user.phone}</p>
          <p className="tabular mt-2 text-xl font-semibold text-gold-deep">฿ {formatBaht(user.balance)}</p>
        </div>
        <dl className="mt-4 space-y-2 text-sm">
          <Row k={user.bankName === "TrueMoney Wallet" ? "กระเป๋าเงิน" : "ธนาคาร"} v={user.bankName || "-"} />
          <Row k={user.bankName === "TrueMoney Wallet" ? "เบอร์ TrueMoney" : "เลขบัญชี"} v={user.bankAccount || "-"} />
          <Row k="บิลทั้งหมด" v={String(bets.length)} />
        </dl>
      </GoldCard>
      <div className="grid gap-2">
        <Link to="/app/promo" className="rounded-2xl bg-navy-card px-4 py-3 text-sm text-gold-bright">
          โปรโมชัน · กดรับโบนัส
        </Link>
        <Link to="/app/rates" className="rounded-2xl bg-navy-card px-4 py-3 text-sm text-gold-bright">
          อัตราจ่ายหวยและบอล
        </Link>
        <Link to="/rules" className="rounded-2xl bg-navy-card px-4 py-3 text-sm text-cream">
          กฏและกติกา
        </Link>
        <Link to="/app/history" className="rounded-2xl bg-navy-card px-4 py-3 text-sm text-cream">
          ประวัติการแทง
        </Link>
        {user.isStaff && (
          <Link to="/app/admin" className="rounded-2xl bg-navy-card px-4 py-3 text-sm text-gold-bright">
            แผงควบคุมแอดมิน
          </Link>
        )}
        <a href="/api/logout" className="grid h-12 place-items-center rounded-2xl bg-lose/20 font-semibold text-lose">
          ออกจากระบบ
        </a>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between rounded-lg bg-cream px-3 py-2">
      <dt className="text-muted">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}
