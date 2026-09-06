import { Link, createFileRoute } from "@tanstack/react-router";
import { GuestShell } from "@/components/guest-shell";
import { PayoutBoard } from "@/components/payout-board";

export const Route = createFileRoute("/rates")({ component: RatesPage });

function RatesPage() {
  return (
    <GuestShell>
      <div className="space-y-3">
        <PayoutBoard />
        <Link to="/" className="block text-center text-sm text-gold-deep">
          กลับหน้าแรก
        </Link>
      </div>
    </GuestShell>
  );
}
