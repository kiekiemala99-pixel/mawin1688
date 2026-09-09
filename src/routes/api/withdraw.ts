import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";
import { withTransaction } from "@/lib/db";
import { loadAccount } from "@/lib/wallet-server";
import { maxWithdrawOf } from "@/lib/promo-server";

export const Route = createFileRoute("/api/withdraw")({
  server: {
    handlers: {
      POST: async ({ request }) => handleWithdraw(request),
    },
  },
});

function back(query: string) {
  return new Response(null, { status: 303, headers: { Location: `/app/withdraw?${query}` } });
}

async function userIdOf(request: Request, token: string) {
  const headers = new Headers(request.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.get("origin")) headers.set("origin", new URL(request.url).origin);
  const session = await auth.api.getSession({ headers });
  return session?.user?.id ?? null;
}

function money(v: unknown) {
  return Math.round(Number(v ?? 0) * 100) / 100;
}

async function handleWithdraw(request: Request) {
  try {
    const form = await request.formData();
    const amount = money(form.get("amount"));
    const token = String(form.get("auth") || "").trim();
    const userId = await userIdOf(request, token);
    if (!userId) return back("err=login");
    if (amount < 100) return back("err=min");
    const account = await loadAccount(userId);
    if (account.wallet.turnoverRemain > 0) return back("err=turn");
    const cap = await maxWithdrawOf(userId);
    if (cap > 0 && amount > cap) return back("err=cap");
    if (account.wallet.balance < amount) return back("err=credit");
    await withTransaction(async (tx) => {
      const locked = await tx.query<{ balance: string | number }>(
        `select balance from wallets where user_id = $1 for update`,
        [userId],
      );
      if (!locked[0] || money(locked[0].balance) < amount) throw new Error("credit");
      await tx.query(
        `insert into transactions (id, user_id, type, amount, status, note)
         values ($1, $2, 'withdraw', $3::numeric, 'pending', $4)`,
        [`tx_${crypto.randomUUID()}`, userId, amount, "ถอนเครดิต"],
      );
    });
    return back("ok=1");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "credit") return back("err=credit");
    console.error("[withdraw]", err);
    return back("err=fail");
  }
}
