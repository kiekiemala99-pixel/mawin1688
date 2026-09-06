import { createFileRoute } from "@tanstack/react-router";
import { PayoutBoard } from "@/components/payout-board";

export const Route = createFileRoute("/app/rates")({ component: MemberRatesPage });

function MemberRatesPage() {
  return (
    <div className="mx-auto max-w-lg space-y-3">
      <h1 className="text-lg font-semibold text-gold-bright">อัตราจ่าย</h1>
      <p className="text-xs text-cream/55">เรทหวยและราคาบอลที่ใช้คิดบิลจริง</p>
      <PayoutBoard />
    </div>
  );
}
