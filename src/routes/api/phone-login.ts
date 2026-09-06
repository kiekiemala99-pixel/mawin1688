import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";
import { getSql } from "@/lib/db";
import { isThaiPhone, normalizePhone, phoneToEmail } from "@/lib/phone";

export const Route = createFileRoute("/api/phone-login")({
  server: {
    handlers: {
      POST: async ({ request }) => handlePhoneLogin(request),
    },
  },
});

async function resolveEmail(raw: string) {
  const trimmed = raw.trim();
  const phone = normalizePhone(trimmed);
  if (isThaiPhone(phone)) return phoneToEmail(phone);
  if (!trimmed) return phoneToEmail("");
  try {
    const sql = await getSql();
    const rows = await sql<{ phone: string }>`
      select phone from wallets where username = ${trimmed.toLowerCase()} limit 1
    `;
    if (rows[0]?.phone && isThaiPhone(rows[0].phone)) return phoneToEmail(rows[0].phone);
  } catch {
    /* fall through */
  }
  return phoneToEmail(trimmed);
}

function failRedirect() {
  return new Response(null, {
    status: 303,
    headers: { Location: "/?loginError=1" },
  });
}

async function handlePhoneLogin(request: Request) {
  try {
    const ct = request.headers.get("content-type") || "";
    let phone = "";
    let password = "";
    if (ct.includes("application/json")) {
      const body = (await request.json()) as { phone?: string; password?: string };
      phone = String(body.phone || "");
      password = String(body.password || "");
    } else {
      const form = await request.formData();
      phone = String(form.get("phone") || "");
      password = String(form.get("password") || "");
    }
    if (!phone.trim() || !password) return failRedirect();

    const email = await resolveEmail(phone);
    const headers = new Headers(request.headers);
    if (!headers.get("origin")) headers.set("origin", new URL(request.url).origin);

    const res = await auth.api.signInEmail({
      body: { email, password },
      headers,
      asResponse: true,
    });

    if (!res.ok) return failRedirect();

    const token =
      res.headers.get("set-auth-token") ||
      "";
    const location = token ? `/app?auth=${encodeURIComponent(token)}` : "/app";
    const out = new Headers();
    out.set("Location", location);
    const cookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
    if (cookies.length) {
      for (const cookie of cookies) out.append("Set-Cookie", cookie);
    } else {
      const single = res.headers.get("set-cookie");
      if (single) out.append("Set-Cookie", single);
    }
    return new Response(null, { status: 303, headers: out });
  } catch (err) {
    console.error("[phone-login]", err);
    return failRedirect();
  }
}
