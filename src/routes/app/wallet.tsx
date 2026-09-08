import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DepositForm } from "@/components/deposit-form";
import { WithdrawForm } from "@/components/withdraw-form";
import { useSessionUser, useStore } from "@/lib/store";
import { formatBaht, formatWhen } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/wallet")({ component: WalletPage });

function WalletPage() {
  const user = useSessionUser();
  const txns = useStore((s) => s.txns);
  const [tab, setTab] = useState<"in" | "out">("in");

  if (!user) return null;

  return (
    <div className="mx-auto max-w-lg space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={cn("h-11 rounded-lg", tab === "in" ? "btn-gold" : "bg-navy-card text-cream")} onClick={() => setTab("in")}>
          ฝากเงิน
        </button>
        <button type="button" className={cn("h-11 rounded-lg", tab === "out" ? "btn-gold" : "bg-navy-card text-cream")} onClick={() => setTab("out")}>
          ถอนเงิน
        </button>
      </div>

      {tab === "in" ? <DepositForm /> : <WithdrawForm />}

      <h2 className="text-sm font-semibold text-gold-bright">รายการล่าสุด</h2>
      <div className="space-y-1.5">
        {txns.slice(0, 12).map((t) => {
          const held = t.type === "bet" || t.type === "withdraw" || (t.type === "adjust" && t.note.startsWith("ลด"));
          return (
            <div key={t.id} className="rounded-xl bg-navy-card px-3 py-2.5 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium text-cream">
                    {t.type === "deposit" ? "ฝาก" : t.type === "withdraw" ? "ถอน" : t.type === "bet" ? "แทง" : t.type === "adjust" ? "ปรับยอด" : "จ่ายรางวัล"}
                    {t.status === "pending" ? " · รอแอดมินตรวจ" : t.status === "rejected" ? " · ปฏิเสธ" : ""}
                  </div>
                  <div className="text-xs text-cream/50">
                    {formatWhen(t.createdAt)}
                    {t.note ? ` · ${t.note}` : ""}
                    {t.hasSlip ? " · มีสลิป" : ""}
                  </div>
                </div>
                <div
                  className={cn(
                    "tabular font-semibold",
                    t.status === "rejected" || (t.type === "deposit" && t.status === "pending")
                      ? "text-cream/55"
                      : held
                        ? "text-lose"
                        : "text-win",
                  )}
                >
                  {t.type === "deposit" && t.status !== "approved" ? "" : held ? "-" : "+"}
                  {formatBaht(t.amount, 0)}
                </div>
              </div>
            </div>
          );
        })}
        {txns.length === 0 && <p className="text-sm text-cream/50">ยังไม่มีรายการ</p>}
      </div>
    </div>
  );
}
