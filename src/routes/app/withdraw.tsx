import { createFileRoute } from "@tanstack/react-router";
import { WithdrawForm } from "@/components/withdraw-form";
import { useStore } from "@/lib/store";
import { formatBaht, formatWhen } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/withdraw")({
  validateSearch: (s: Record<string, unknown>) => ({
    ...(s.ok ? { ok: String(s.ok) } : {}),
    ...(s.err ? { err: String(s.err) } : {}),
  }),
  component: WithdrawPage,
});

function WithdrawPage() {
  const result = Route.useSearch();
  const txns = useStore((s) => s.txns).filter((t) => t.type === "withdraw").slice(0, 8);

  return (
    <div className="mx-auto max-w-lg space-y-3">
      <h1 className="text-lg font-semibold text-gold-bright">ถอนเงิน</h1>
      <p className="text-xs text-cream/55">ถอนขั้นต่ำ 100 บาท · แอดมินตรวจเลขบัญชีแล้วกดยืนยันโอน ระบบตัดเครดิตอัตโนมัติ</p>
      <WithdrawForm result={result} />
      <h2 className="text-sm font-semibold text-gold-bright">คิวถอนของฉัน</h2>
      <div className="space-y-1.5">
        {txns.map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded-xl bg-navy-card px-3 py-2.5 text-sm">
            <div>
              <div className="font-medium text-cream">
                ถอน{t.status === "pending" ? " · รอตรวจ" : t.status === "rejected" ? " · ปฏิเสธ · คืนยอดแล้ว" : " · อนุมัติแล้ว"}
              </div>
              <div className="text-xs text-cream/50">แจ้งเมื่อ {formatWhen(t.createdAt)}</div>
            </div>
            <div className={cn("tabular font-semibold", t.status === "approved" ? "text-lose" : "text-cream/55")}>
              {formatBaht(t.amount, 0)}
            </div>
          </div>
        ))}
        {txns.length === 0 && <p className="text-sm text-cream/50">ยังไม่มีคำขอถอน</p>}
      </div>
    </div>
  );
}
