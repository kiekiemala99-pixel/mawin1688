import { createFileRoute } from "@tanstack/react-router";
import { AdminDrawsPanel } from "@/components/admin-draws-panel";
import { loadPostedDraws } from "@/lib/wallet-server";

export const Route = createFileRoute("/app/admin/draws")({
  validateSearch: (s: Record<string, unknown>): { ok?: string; err?: string } => ({
    ...(typeof s.ok === "string" ? { ok: s.ok } : {}),
    ...(typeof s.err === "string" ? { err: s.err } : {}),
  }),
  loader: async () => {
    try {
      return await loadPostedDraws();
    } catch {
      return [];
    }
  },
  component: AdminDrawsPage,
});

function AdminDrawsPage() {
  const rows = Route.useLoaderData();
  const { ok, err } = Route.useSearch();
  return <AdminDrawsPanel rows={rows} ok={ok} err={err} />;
}
