import { createFileRoute } from "@tanstack/react-router";
import { AdminPromoPanel } from "@/components/admin-promo-panel";
import { loadPromoCatalog, loadPromoQueue } from "@/lib/promo-server";

export const Route = createFileRoute("/app/admin/promos")({
  validateSearch: (s: Record<string, unknown>): { tab?: string; ok?: string; err?: string } => ({
    ...(typeof s.tab === "string" ? { tab: s.tab } : {}),
    ...(typeof s.ok === "string" ? { ok: s.ok } : {}),
    ...(typeof s.err === "string" ? { err: s.err } : {}),
  }),
  loader: async () => {
    try {
      const [catalog, queue] = await Promise.all([loadPromoCatalog(), loadPromoQueue()]);
      return { catalog, queue };
    } catch {
      return { catalog: [], queue: [] };
    }
  },
  component: AdminPromoPage,
});

function AdminPromoPage() {
  const data = Route.useLoaderData();
  const { tab, ok, err } = Route.useSearch();
  return <AdminPromoPanel catalog={data.catalog} queue={data.queue} tab={tab} ok={ok} err={err} />;
}
