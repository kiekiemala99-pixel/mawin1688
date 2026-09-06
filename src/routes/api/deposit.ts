import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";
import { getSql } from "@/lib/db";
import { loadAccount } from "@/lib/wallet-server";

export const Route = createFileRoute("/api/deposit")({
  server: {
    handlers: {
      POST: async ({ request }) => handleDeposit(request),
    },
  },
});

function back(query: string) {
  return new Response(null, { status: 303, headers: { Location: `/app/deposit?${query}` } });
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

async function slipDataUrl(file: File | null) {
  if (!file || file.size < 20) throw new Error("slip");
  if (file.size > 6 * 1024 * 1024) throw new Error("big");
  const buf = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  let mime = (file.type || "").toLowerCase();
  if (!mime.startsWith("image/")) {
    if (/\.png$/.test(name)) mime = "image/png";
    else if (/\.webp$/.test(name)) mime = "image/webp";
    else if (/\.hei[cf]$/.test(name)) mime = "image/heic";
    else mime = "image/jpeg";
  }
  const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
  if (dataUrl.length > 1_200_000) throw new Error("big");
  return dataUrl;
}

async function handleDeposit(request: Request) {
  try {
    const form = await request.formData();
    const amount = money(form.get("amount"));
    const methodRaw = String(form.get("method") || "");
    const method = methodRaw === "ทรูมันนี่" ? "ทรูมันนี่" : "พร้อมเพย์";
    const token = String(form.get("auth") || "").trim();
    const file = form.get("slip");
    const keep = `method=${method === "ทรูมันนี่" ? "tm" : "pp"}&amount=${amount}`;
    const userId = await userIdOf(request, token);
    if (!userId) return back("err=login");
    if (!(amount >= 1)) return back("err=amount");
    let slip: string;
    try {
      slip = await slipDataUrl(file instanceof File ? file : null);
    } catch (err) {
      const code = err instanceof Error ? err.message : "slip";
      return back(`${keep}&err=${code === "big" ? "big" : "slip"}`);
    }
    await loadAccount(userId);
    const sql = await getSql();
    const label = method === "ทรูมันนี่" ? "ทรูวอเลท" : "พร้อมเพย์";
    await sql.query(
      `insert into transactions (id, user_id, type, amount, status, note, method, slip_data)
       values ($1, $2, 'deposit', $3::numeric, 'pending', $4, $5, $6)`,
      [
        `tx_${crypto.randomUUID()}`,
        userId,
        amount,
        `โอน${label} ${amount}`,
        method,
        slip,
      ],
    );
    return back("ok=1");
  } catch (err) {
    console.error("[deposit]", err);
    return back("err=fail");
  }
}
