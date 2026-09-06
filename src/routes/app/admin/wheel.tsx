import { createFileRoute } from "@tanstack/react-router";
import { AdminWheelPanel } from "@/components/admin-wheel-panel";
import { listStaffCoupons } from "@/lib/wheel-server";

export const Route = createFileRoute("/app/admin/wheel")({
  validateSearch: (s: Record<string, unknown>): { ok?: string; err?: string } => ({
    ...(typeof s.ok === "string" ? { ok: s.ok } : {}),
    ...(typeof s.err === "string" ? { err: s.err } : {}),
  }),
  loader: async () => {
    try {
      return await listStaffCoupons();
    } catch {
      return { coupons: [], history: [], settings: { enabled: true, title: "คูปอง" }, segments: [] };
    }
  },
  component: AdminCouponPage,
});

function AdminCouponPage() {
  const data = Route.useLoaderData();
  const { ok, err } = Route.useSearch();
  return <AdminWheelPanel coupons={data.coupons} history={data.history} ok={ok} err={err} />;
}
