import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";

export const Route = createFileRoute("/api/logout")({
  server: {
    handlers: {
      GET: async ({ request }) => handleLogout(request),
      POST: async ({ request }) => handleLogout(request),
    },
  },
});

async function handleLogout(request: Request) {
  const headers = new Headers();
  headers.set("Location", "/?loggedOut=1");
  try {
    const reqHeaders = new Headers(request.headers);
    if (!reqHeaders.get("origin")) reqHeaders.set("origin", new URL(request.url).origin);
    const res = await auth.api.signOut({ headers: reqHeaders, asResponse: true });
    const cookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
    if (cookies.length) {
      for (const cookie of cookies) headers.append("Set-Cookie", cookie);
    } else {
      const single = res.headers.get("set-cookie");
      if (single) headers.append("Set-Cookie", single);
    }
  } catch (err) {
    console.error("[logout]", err);
  }
  expireCookie(headers, "__Host-grok-auth.session_token");
  expireCookie(headers, "__Host-grok-auth.session_data");
  expireCookie(headers, "grok-auth.session_token");
  expireCookie(headers, "better-auth.session_token");
  return new Response(null, { status: 303, headers });
}

function expireCookie(headers: Headers, name: string) {
  headers.append(
    "Set-Cookie",
    `${name}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`,
  );
}
