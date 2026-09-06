import { createFileRoute, redirect } from "@tanstack/react-router";

const MAP: Record<string, "/app/admin/withdraw" | "/app/admin/promos" | "/app/admin/wheel" | "/app/admin/draws" | "/app/admin/members"> = {
  withdraw: "/app/admin/withdraw",
  promos: "/app/admin/promos",
  wheel: "/app/admin/wheel",
  draws: "/app/admin/draws",
  members: "/app/admin/members",
};

export const Route = createFileRoute("/app/admin/$")({
  beforeLoad: ({ location }) => {
    const tab = location.pathname.replace(/^\/app\/admin\/?/, "").split("/")[0];
    const to = MAP[tab];
    if (to) throw redirect({ to });
    throw redirect({ to: "/app/admin" });
  },
  component: () => null,
});
