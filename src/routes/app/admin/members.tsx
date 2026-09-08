import { createFileRoute } from "@tanstack/react-router";
import { AdminMembersPanel } from "@/components/admin-members-panel";
import { getStaffSummary, loadStaffMembers } from "@/lib/wallet-server";

export const Route = createFileRoute("/app/admin/members")({
  validateSearch: (s: Record<string, unknown>): { ok?: string; err?: string } => ({
    ...(typeof s.ok === "string" ? { ok: s.ok } : {}),
    ...(typeof s.err === "string" ? { err: s.err } : {}),
  }),
  loader: async () => {
    try {
      const [rows, summary] = await Promise.all([loadStaffMembers(), getStaffSummary()]);
      return { rows, total: summary.memberCount };
    } catch {
      return { rows: [], total: 0 };
    }
  },
  component: AdminMembersPage,
});

function AdminMembersPage() {
  const { rows, total } = Route.useLoaderData();
  const { ok, err } = Route.useSearch();
  return <AdminMembersPanel rows={rows} total={total} ok={ok} err={err} />;
}