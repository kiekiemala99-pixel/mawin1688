import { createFileRoute } from "@tanstack/react-router";
import { AdminMembersPanel } from "@/components/admin-members-panel";
import { loadStaffMembers } from "@/lib/wallet-server";

export const Route = createFileRoute("/app/admin/members")({
  validateSearch: (s: Record<string, unknown>): { ok?: string; err?: string } => ({
    ...(typeof s.ok === "string" ? { ok: s.ok } : {}),
    ...(typeof s.err === "string" ? { err: s.err } : {}),
  }),
  loader: async () => {
    try {
      return await loadStaffMembers();
    } catch {
      return [];
    }
  },
  component: AdminMembersPage,
});

function AdminMembersPage() {
  const rows = Route.useLoaderData();
  const { ok, err } = Route.useSearch();
  return <AdminMembersPanel rows={rows} ok={ok} err={err} />;
}
