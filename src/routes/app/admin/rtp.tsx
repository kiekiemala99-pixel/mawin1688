import { createFileRoute } from "@tanstack/react-router";
import { AdminRtpPanel } from "@/components/admin-rtp-panel";
import { listRtpConfigs } from "@/lib/rtp-server";

export const Route = createFileRoute("/app/admin/rtp")({
  validateSearch: (s: Record<string, unknown>): { tab?: string; ok?: string; err?: string } => ({
    ...(typeof s.tab === "string" ? { tab: s.tab } : {}),
    ...(typeof s.ok === "string" ? { ok: s.ok } : {}),
    ...(typeof s.err === "string" ? { err: s.err } : {}),
  }),
  loader: async () => {
    try {
      return await listRtpConfigs();
    } catch {
      return [];
    }
  },
  component: AdminRtpPage,
});

function AdminRtpPage() {
  const rows = Route.useLoaderData();
  const { tab, ok, err } = Route.useSearch();
  return <AdminRtpPanel rows={rows} tab={tab} ok={ok} err={err} />;
}
