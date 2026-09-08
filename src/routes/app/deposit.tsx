import { createFileRoute } from "@tanstack/react-router";
import { DepositForm } from "@/components/deposit-form";
import { useStore } from "@/lib/store";
import { formatBaht, formatWhen } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/deposit")({
  validateSearch: (s: Record<string, unknown>): { ok?: string; err?: string; amount?: number; method?: string } => {
    const clean = (v: unknown) => String(v ?? "").replace(/"/g, "");
    const amount = Number(clean(s.amount));
    const method = clean(s.method);
    return {
      ...(s.ok ? { ok: clean(s.ok) } : {}),
      ...(s.err ? { err: clean(s.err) } : {}),
      ...(Number.isFinite(amount) && amount >= 1 ? { amount } : {}),
      ...(method === "tm" || method === "pp" ? { method } : {}),
    };
  },
  component: DepositPage,
});

function DepositPage() {
  const result = Route.useSearch();
  const txns = useStore((s) => s.txns).filter((t) => t.type === "deposit").slice(0, 8);

  return (
    <div className="mx-auto max-w-lg space-y-3">
      <h1 className="text-lg font-semibold text-gold-bright">ฝากเงิน</h1>
      <p className="text-xs text-cream/55">เลือกช่องทาง กรอกยอด แล้วกดยืนยันก่อนจึงจะโชว์ QR / เบอร์โอน</p>
      <DepositForm result={result} />

      <h2 className="text-sm font-semibold text-gold-bright">คิวฝากของฉัน</h2>
      <div className="space-y-1.5">
        {txns.map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded-xl bg-navy-card px-3 py-2.5 text-sm">
            <div>
              <div className="font-medium text-cream">
                {t.method || "ฝาก"}
                {t.status === "pending" ? " · รอตรวจสลิป" : t.status === "rejected" ? " · ปฏิเสธ" : " · เข้าเครดิตแล้ว"}
              </div>
              <div className="text-xs text-cream/50">
                แจ้งเมื่อ {formatWhen(t.createdAt)}
                {t.hasSlip ? " · มีสลิป" : t.note ? ` · ${t.note}` : ""}
              </div>
            </div>
            <div className={cn("tabular font-semibold", t.status === "approved" ? "text-win" : "text-cream/55")}>
              {formatBaht(t.amount, 0)}
            </div>
          </div>
        ))}
        {txns.length === 0 && <p className="text-sm text-cream/50">ยังไม่มีคำขอฝาก</p>}
      </div>
    </div>
  );
}
