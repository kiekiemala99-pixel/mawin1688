import { createFileRoute } from "@tanstack/react-router";
import { CashQueue } from "@/components/cash-queue";
import { loadStaffCashQueue } from "@/lib/wallet-server";

export const Route = createFileRoute("/app/admin/withdraw")({
  validateSearch: (s: Record<string, unknown>): { ok?: string; err?: string } => ({
    ...(typeof s.ok === "string" ? { ok: s.ok } : {}),
    ...(typeof s.err === "string" ? { err: s.err } : {}),
  }),
  loader: async () => {
    try {
      return await loadStaffCashQueue();
    } catch {
      return [];
    }
  },
  component: AdminWithdraw,
});

function AdminWithdraw() {
  const queue = Route.useLoaderData();
  const { ok, err } = Route.useSearch();
  return (
    <div className="space-y-2">
      <p className="text-xs text-cream/55">ตรวจเลขบัญชีกับยอด แล้วกดยืนยันโอนออก — ระบบตัดเครดิตให้อัตโนมัติ</p>
      <CashQueue type="withdraw" queue={queue} ok={ok} err={err} />
    </div>
  );
}
