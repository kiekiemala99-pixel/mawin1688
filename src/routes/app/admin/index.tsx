import { createFileRoute } from "@tanstack/react-router";
import { CashQueue } from "@/components/cash-queue";
import { loadStaffCashQueue } from "@/lib/wallet-server";

export const Route = createFileRoute("/app/admin/")({
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
  component: AdminDeposits,
});

function AdminDeposits() {
  const queue = Route.useLoaderData();
  const { ok, err } = Route.useSearch();
  return (
    <div className="space-y-2">
      <p className="text-xs text-cream/55">รายการฝากรอตรวจ · กดอนุมัติครั้งเดียวเพื่อเข้าเครดิต</p>
      <CashQueue type="deposit" queue={queue} ok={ok} err={err} />
    </div>
  );
}
