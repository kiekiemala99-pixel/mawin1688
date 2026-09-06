import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { GuestShell } from "@/components/guest-shell";
import { LoginForm } from "@/components/login-form";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { user, isPending } = useCurrentUserState();
  const navigate = useNavigate();
  useEffect(() => {
    if (!isPending && user) navigate({ to: "/app" });
  }, [isPending, user, navigate]);

  return (
    <GuestShell>
      <div className="mx-auto max-w-md">
        <LoginForm />
      </div>
    </GuestShell>
  );
}
