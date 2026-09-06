import { createFileRoute } from "@tanstack/react-router";
import { LuckyWheel } from "@/components/lucky-wheel";

export const Route = createFileRoute("/app/lucky")({
  validateSearch: (s: Record<string, unknown>): { ok?: string; err?: string } => ({
    ...(typeof s.ok === "string" ? { ok: s.ok } : {}),
    ...(typeof s.err === "string" ? { err: s.err } : {}),
  }),
  component: LuckyPage,
});

function LuckyPage() {
  const { ok, err } = Route.useSearch();
  return <LuckyWheel ok={ok} err={err} />;
}
