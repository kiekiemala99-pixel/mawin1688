import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";
import { withTransaction } from "@/lib/db";

export const Route = createFileRoute("/api/redeem-coupon")({
  server: {
    handlers: {
      POST: async ({ request }) => handleRedeem(request),
    },
  },
});

function back(query: string) {
  return new Response(null, { status: 303, headers: { Location: `/app/lucky?${query}` } });
}

function money(v: unknown) {
  const n = Number(v ?? 0);
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

async function handleRedeem(request: Request) {
  try {
    const form = await request.formData();
    const code = String(form.get("code") || "")
      .trim()
      .toUpperCase();
    const token = String(form.get("auth") || "").trim();
    if (code.length < 3) return back("err=code");

    const headers = new Headers(request.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (!headers.get("origin")) headers.set("origin", new URL(request.url).origin);
    const session = await auth.api.getSession({ headers });
    const userId = session?.user?.id;
    if (!userId) return back("err=login");

    let amount = 0;
    await withTransaction(async (tx) => {
      const coupon = await tx.query<{
        id: string;
        amount: string | number;
        max_claims: number;
        claimed: number;
        expires_at: string | null;
        enabled: boolean;
      }>(`select id, amount, max_claims, claimed, expires_at, enabled from coupons where code = $1 for update`, [code]);
      const row = coupon[0];
      if (!row || !row.enabled) throw new Error("missing");
      amount = money(row.amount);
      if (amount < 1) throw new Error("amount");
      if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) throw new Error("expired");
      if (row.max_claims > 0 && row.claimed >= row.max_claims) throw new Error("full");
      const exists = await tx.query(`select id from coupon_claims where coupon_id = $1 and user_id = $2`, [row.id, userId]);
      if (exists[0]) throw new Error("used");
      const wallet = await tx.query(`select balance from wallets where user_id = $1 for update`, [userId]);
      if (!wallet[0]) throw new Error("wallet");
      await tx.query(`insert into coupon_claims (id, coupon_id, user_id, remaining) values ($1, $2, $3, 0)`, [
        `clm_${crypto.randomUUID()}`,
        row.id,
        userId,
      ]);
      await tx.query(`update coupons set claimed = claimed + 1 where id = $1`, [row.id]);
      await tx.query(`update wallets set balance = balance + $1::numeric where user_id = $2`, [amount, userId]);
      await tx.query(
        `insert into transactions (id, user_id, type, amount, status, note) values ($1, $2, 'adjust', $3::numeric, 'approved', $4)`,
        [`tx_${crypto.randomUUID()}`, userId, amount, `คูปอง ${code}`],
      );
    });
    return back(`ok=${encodeURIComponent(String(amount))}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "missing") return back("err=missing");
    if (msg === "used") return back("err=used");
    if (msg === "expired") return back("err=expired");
    if (msg === "full") return back("err=full");
    if (msg === "amount") return back("err=amount");
    console.error("[redeem-coupon]", err);
    return back("err=fail");
  }
}
