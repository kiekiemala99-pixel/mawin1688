import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";
import { getSql } from "@/lib/db";

export const Route = createFileRoute("/api/staff-coupon")({
  server: {
    handlers: {
      POST: async ({ request }) => handleStaffCoupon(request),
    },
  },
});

function back(query: string) {
  return new Response(null, { status: 303, headers: { Location: `/app/admin/wheel?${query}` } });
}

async function handleStaffCoupon(request: Request) {
  try {
    const form = await request.formData();
    const code = String(form.get("code") || "")
      .trim()
      .toUpperCase();
    const amount = Number(form.get("amount"));
    const maxClaims = Math.max(0, Math.floor(Number(form.get("maxClaims")) || 0));
    const note = String(form.get("note") || "").slice(0, 120);
    const token = String(form.get("auth") || "").trim();
    const action = String(form.get("action") || "create");

    if (action === "delete") {
      const id = String(form.get("id") || "");
      if (!id) return back("err=fail");
      const userId = await sessionUserId(request, token);
      if (!userId) return back("err=login");
      const sql = await getSql();
      if (!(await isStaff(sql, userId))) return back("err=staff");
      await sql.query(`delete from coupons where id = $1`, [id]);
      return back("ok=deleted");
    }

    if (code.length < 3 || code.length > 24) return back("err=code");
    if (!Number.isFinite(amount) || amount < 1) return back("err=amount");

    const userId = await sessionUserId(request, token);
    if (!userId) return back("err=login");

    const sql = await getSql();
    await sql.query(`alter table coupons add column if not exists amount numeric(14, 2) not null default 0`);
    if (!(await isStaff(sql, userId))) return back("err=staff");

    try {
      await sql.query(
        `insert into coupons (id, code, spins, amount, max_claims, enabled, note)
         values ($1, $2, 1, $3::numeric, $4, true, $5)`,
        [`cpn_${crypto.randomUUID()}`, code, amount, maxClaims, note],
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (/unique|duplicate/i.test(msg)) return back("err=dup");
      throw err;
    }
    return back("ok=1");
  } catch (err) {
    console.error("[staff-coupon]", err);
    return back("err=fail");
  }
}

async function sessionUserId(request: Request, token: string) {
  const headers = new Headers(request.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.get("origin")) headers.set("origin", new URL(request.url).origin);
  const session = await auth.api.getSession({ headers });
  return session?.user?.id ?? null;
}

async function isStaff(sql: Awaited<ReturnType<typeof getSql>>, userId: string) {
  const rows = await sql<{ is_staff: boolean }>`select is_staff from wallets where user_id = ${userId}`;
  return Boolean(rows[0]?.is_staff);
}
