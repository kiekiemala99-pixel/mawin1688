import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/staff")({
  component: () => <Navigate to="/app/admin" />,
});
