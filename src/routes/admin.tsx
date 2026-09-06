import { createFileRoute, redirect } from "@tanstack/react-router";

const MAP: Record<string, string> = {
  withdraw: "/app/admin/withdraw",
  promos: "/app/admin/promos",
  rtp: "/app/admin/rtp",
  wheel: "/app/admin/wheel",
  draws: "/app/admin/draws",
  members: "/app/admin/members",
};

export const Route = createFileRoute("/admin")({
  beforeLoad: ({ location }) => {
    const suffix = location.pathname.replace(/^\/admin\/?/, "").split("/")[0];
    const to = MAP[suffix];
    if (to === "/app/admin/withdraw") throw redirect({ to: "/app/admin/withdraw" });
    if (to === "/app/admin/promos") throw redirect({ to: "/app/admin/promos" });
    if (to === "/app/admin/wheel") throw redirect({ to: "/app/admin/wheel" });
    if (to === "/app/admin/draws") throw redirect({ to: "/app/admin/draws" });
    if (to === "/app/admin/members") throw redirect({ to: "/app/admin/members" });
    throw redirect({ to: "/app/admin" });
  },
  component: () => null,
});
