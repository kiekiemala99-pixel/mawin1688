import { createFileRoute } from "@tanstack/react-router";
import { hashPassword } from "better-auth/crypto";
import { auth } from "@/lib/auth/server";
import { getSql, withTransaction } from "@/lib/db";
import { normalizePayAccount, validatePayAccount } from "@/lib/banks";
import { isThaiPhone, phoneToEmail } from "@/lib/phone";
import { getMarketState, type MarketId } from "@/lib/lottery";
import { settleLotteryBetsForRound } from "@/lib/wallet-server";
import { payReferralCommission } from "@/lib/referral-server";
import { safeHttpUrl } from "@/lib/movies-server";

export const Route = createFileRoute("/api/staff")({
  server: {
    handlers: {
      POST: async ({ request }) => handleStaff(request),
    },
  },
});

function back(path: string, query: string) {
  return new Response(null, { status: 303, headers: { Location: `${path}?${query}` } });
}

function money(v: unknown) {
  return Math.round(Number(v ?? 0) * 100) / 100;
}

async function sessionUserId(request: Request, token: string) {
  const headers = new Headers(request.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.get("origin")) headers.set("origin", new URL(request.url).origin);
  const session = await auth.api.getSession({ headers });
  return session?.user?.id ?? null;
}

async function staffId(request: Request, form: FormData) {
  const token = String(form.get("auth") || "").trim();
  const userId = await sessionUserId(request, token);
  if (!userId) return { err: "login" as const, userId: null };
  const sql = await getSql();
  const rows = await sql<{ is_staff: boolean }>`select is_staff from wallets where user_id = ${userId}`;
  if (!rows[0]?.is_staff) return { err: "staff" as const, userId: null };
  return { err: null, userId };
}

async function handleStaff(request: Request) {
  try {
    const form = await request.formData();
    const action = String(form.get("action") || "");
    const authed = await staffId(request, form);
    if (authed.err === "login") return back(pathOf(action), "err=login");
    if (authed.err === "staff" || !authed.userId) return back(pathOf(action), "err=staff");
    const userId = authed.userId;

    if (action === "rtp") return saveRtp(form);
    if (action === "promo_save") return savePromo(form);
    if (action === "promo_toggle") return togglePromo(form);
    if (action === "promo_delete") return deletePromo(form);
    if (action === "promo_review") return reviewPromo(form, userId);
    if (action === "cash") return reviewCash(form, userId);
    if (action === "member_update") return updateMember(form);
    if (action === "member_adjust") return adjustMember(form, userId);
    if (action === "draw") return publishDraw(form, userId);
    if (action === "referral") return saveReferral(form);
    if (action === "movie_save") return saveMovie(form);
    if (action === "movie_delete") return deleteMovie(form);
    if (action === "banner_save") return saveBanner(form);
    if (action === "banner_delete") return deleteBanner(form);
    return back("/app/admin", "err=fail");
  } catch (err) {
    console.error("[staff]", err);
    return back("/app/admin", "err=fail");
  }
}

function pathOf(action: string) {
  if (action.startsWith("promo")) return "/app/admin/promos";
  if (action.startsWith("member")) return "/app/admin/members";
  if (action === "rtp") return "/app/admin/rtp";
  if (action === "draw") return "/app/admin/draws";
  if (action === "referral") return "/app/admin/referral";
  if (action.startsWith("movie") || action.startsWith("banner")) return "/app/admin/movies";
  if (action === "cash") return "/app/admin";
  return "/app/admin";
}

async function saveRtp(form: FormData) {
  const id = String(form.get("id") || "");
  const tab = String(form.get("tab") || "mini");
  const rtp = Number(form.get("rtp") || 100);
  const enabled = String(form.get("enabled") || "") === "1";
  const pays: Record<string, number> = {};
  for (const [key, val] of form.entries()) {
    if (!key.startsWith("pay_")) continue;
    const n = Number(val);
    if (Number.isFinite(n) && n > 0) pays[key.slice(4)] = n;
  }
  if (!id) return back("/app/admin/rtp", `tab=${tab}&err=fail`);
  const safeRtp = Math.min(100, Math.max(1, Number.isFinite(rtp) ? rtp : 1));
  const sql = await getSql();
  const rows = await sql.query(
    `update rtp_configs
     set rtp = $2::numeric, enabled = $3, pays = $4::jsonb, updated_at = now()
     where id = $1
     returning id`,
    [id, safeRtp, enabled, JSON.stringify(pays)],
  );
  if (rows.length === 0) return back("/app/admin/rtp", `tab=${tab}&err=missing`);
  return back("/app/admin/rtp", `tab=${encodeURIComponent(tab)}&ok=1`);
}

async function savePromo(form: FormData) {
  const id = String(form.get("id") || "").trim() || `prm_${crypto.randomUUID()}`;
  const title = String(form.get("title") || "").trim();
  if (title.length < 2) return back("/app/admin/promos", "err=title");
  const startsAt = String(form.get("startsAt") || "");
  const endsAt = String(form.get("endsAt") || "");
  const sql = await getSql();
  await sql.query(
    `insert into promotions (
       id, title, subtitle, kind, bonus_type, bonus_percent, bonus_amount,
       min_deposit, turnover_x, max_bonus, starts_at, ends_at, rules, enabled, updated_at
     ) values (
       $1,$2,$3,$4,$5,$6::numeric,$7::numeric,$8::numeric,$9::numeric,$10::numeric,
       case when $11::bigint = 0 then null else to_timestamp($11::double precision / 1000) end,
       case when $12::bigint = 0 then null else to_timestamp($12::double precision / 1000) end,
       $13,$14, now()
     )
     on conflict (id) do update set
       title = excluded.title, subtitle = excluded.subtitle, kind = excluded.kind,
       bonus_type = excluded.bonus_type, bonus_percent = excluded.bonus_percent,
       bonus_amount = excluded.bonus_amount, min_deposit = excluded.min_deposit,
       turnover_x = excluded.turnover_x, max_bonus = excluded.max_bonus,
       starts_at = excluded.starts_at, ends_at = excluded.ends_at,
       rules = excluded.rules, enabled = excluded.enabled, updated_at = now()`,
    [
      id,
      title,
      String(form.get("subtitle") || ""),
      String(form.get("kind") || "deposit"),
      String(form.get("bonusType") || "fixed"),
      Number(form.get("bonusPercent") || 0),
      Number(form.get("bonusAmount") || 0),
      Number(form.get("minDeposit") || 0),
      Number(form.get("turnoverX") || 0),
      Number(form.get("maxBonus") || 0),
      startsAt ? new Date(startsAt).getTime() : 0,
      endsAt ? new Date(endsAt).getTime() : 0,
      String(form.get("rules") || ""),
      String(form.get("enabled") || "") === "1",
    ],
  );
  return back("/app/admin/promos", "ok=1");
}

async function togglePromo(form: FormData) {
  const id = String(form.get("id") || "");
  const enabled = String(form.get("enabled") || "") === "1";
  const sql = await getSql();
  await sql.query(`update promotions set enabled = $2, updated_at = now() where id = $1`, [id, enabled]);
  return back("/app/admin/promos", "ok=1");
}

async function deletePromo(form: FormData) {
  const id = String(form.get("id") || "");
  const sql = await getSql();
  const pending = await sql<{ c: number }>`select count(*)::int as c from promo_claims where promo_code = ${id} and status = 'pending'`;
  if ((pending[0]?.c ?? 0) > 0) return back("/app/admin/promos", "err=pending");
  await sql.query(`delete from promotions where id = $1`, [id]);
  return back("/app/admin/promos", "ok=deleted");
}

async function reviewPromo(form: FormData, staffId: string) {
  const id = String(form.get("id") || "");
  const decide = String(form.get("decide") || "");
  await withTransaction(async (sql) => {
    const rows = await sql.query<{ id: string; user_id: string; promo_code: string; amount: string | number; status: string; note: string }>(
      `select id, user_id, promo_code, amount, status, note from promo_claims where id = $1 for update`,
      [id],
    );
    const row = rows[0];
    if (!row || row.status !== "pending") throw new Error("รายการนี้ดำเนินการแล้ว");
    if (decide === "reject") {
      await sql.query(`update promo_claims set status = 'rejected', reviewed_at = now(), reviewed_by = $2 where id = $1`, [row.id, staffId]);
      return;
    }
    const amount = money(row.amount);
    await sql.query(`update wallets set balance = balance + $1::numeric where user_id = $2`, [amount, row.user_id]);
    await sql.query(
      `insert into transactions (id, user_id, type, amount, status, note) values ($1, $2, 'payout', $3::numeric, 'approved', $4)`,
      [`tx_${crypto.randomUUID()}`, row.user_id, amount, row.note || `โบนัสโปร ${row.promo_code}`],
    );
    await sql.query(`update promo_claims set status = 'approved', reviewed_at = now(), reviewed_by = $2 where id = $1`, [row.id, staffId]);
  });
  return back("/app/admin/promos", "ok=1&tab=queue");
}

async function reviewCash(form: FormData, staffId: string) {
  const id = String(form.get("id") || "");
  const decide = String(form.get("decide") || "");
  const kind = String(form.get("type") || "deposit");
  const path = kind === "withdraw" ? "/app/admin/withdraw" : "/app/admin";
  const sql = await getSql();
  const found = await sql<{ id: string; user_id: string; type: "deposit" | "withdraw"; amount: string | number }>`
    select id, user_id, type, amount from transactions
    where id = ${id} and status = 'pending' and type in ('deposit', 'withdraw') limit 1
  `;
  const row = found[0];
  if (!row) return back(path, "err=missing");
  const ownerId = row.user_id;
  if (decide === "approve" && row.type === "deposit") {
    const rows = await sql.query(
      `with t as (
         update transactions set status = 'approved', reviewed_by = $3, reviewed_at = now()
         where id = $1 and user_id = $2 and status = 'pending' and type = 'deposit' returning amount
       )
       update wallets w set balance = w.balance + t.amount from t where w.user_id = $2 returning w.balance`,
      [id, ownerId, staffId],
    );
    if (rows.length === 0) return back(path, "err=fail");
    await payReferralCommission(ownerId, id, money(row.amount));
  } else if (decide === "approve" && row.type === "withdraw") {
    await withTransaction(async (tx) => {
      const locked = await tx.query<{ balance: string | number }>(`select balance from wallets where user_id = $1 for update`, [ownerId]);
      const amount = money(row.amount);
      if (!locked[0] || money(locked[0].balance) < amount) throw new Error("เครดิตไม่พอ");
      const upd = await tx.query(
        `update wallets set balance = balance - $1::numeric where user_id = $2 and balance >= $1::numeric returning balance`,
        [amount, ownerId],
      );
      if (upd.length === 0) throw new Error("เครดิตไม่พอ");
      await tx.query(
        `update transactions set status = 'approved', reviewed_by = $3, reviewed_at = now()
         where id = $1 and user_id = $2 and status = 'pending' and type = 'withdraw'`,
        [id, ownerId, staffId],
      );
    });
  } else {
    await sql.query(
      `update transactions set status = 'rejected', reviewed_by = $3, reviewed_at = now()
       where id = $1 and user_id = $2 and status = 'pending'`,
      [id, ownerId, staffId],
    );
  }
  return back(path, "ok=1");
}

async function updateMember(form: FormData) {
  const userId = String(form.get("userId") || "");
  const phoneRaw = String(form.get("phone") || "").trim();
  const bankName = String(form.get("bankName") || "");
  const bankAccount = String(form.get("bankAccount") || "");
  const password = String(form.get("password") || "");
  if (!isThaiPhone(phoneRaw) && !phoneRaw.startsWith("oauth:")) return back("/app/admin/members", "err=phone");
  const payErr = validatePayAccount(bankName, bankAccount);
  if (payErr) return back("/app/admin/members", "err=bank");
  const phone = phoneRaw.startsWith("oauth:") ? phoneRaw : phoneRaw.replace(/\D/g, "");
  const account = normalizePayAccount(bankAccount);
  const sql = await getSql();
  await sql.query(`update wallets set phone = $1, bank_name = $2, bank_account = $3 where user_id = $4`, [phone, bankName, account, userId]);
  if (isThaiPhone(phone)) {
    await sql.query(`update "user" set email = $1, "updatedAt" = now() where id = $2`, [phoneToEmail(phone), userId]);
  }
  if (password) {
    if (password.length < 8) return back("/app/admin/members", "err=pass");
    const hashed = await hashPassword(password);
    const cred = await sql.query<{ id: string }>(`select id from "account" where "userId" = $1 and "providerId" = 'credential' limit 1`, [userId]);
    if (cred[0]) await sql.query(`update "account" set password = $1, "updatedAt" = now() where id = $2`, [hashed, cred[0].id]);
    else {
      await sql.query(
        `insert into "account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
         values ($1, $2, 'credential', $2, $3, now(), now())`,
        [`acc_${crypto.randomUUID()}`, userId, hashed],
      );
    }
  }
  return back("/app/admin/members", "ok=1");
}

async function adjustMember(form: FormData, staffId: string) {
  const userId = String(form.get("userId") || "");
  const direction = String(form.get("direction") || "add") === "sub" ? "sub" : "add";
  const amount = money(form.get("amount"));
  const reason = String(form.get("reason") || "").trim();
  if (amount <= 0) return back("/app/admin/members", "err=amount");
  if (reason.length < 3) return back("/app/admin/members", "err=reason");
  await withTransaction(async (tx) => {
    const locked = await tx.query<{ balance: string | number }>(`select balance from wallets where user_id = $1 for update`, [userId]);
    if (!locked[0]) throw new Error("ไม่พบสมาชิก");
    if (direction === "sub" && money(locked[0].balance) < amount) throw new Error("เครดิตไม่พอ");
    const sqlText =
      direction === "add"
        ? `update wallets set balance = balance + $1::numeric where user_id = $2 returning balance`
        : `update wallets set balance = balance - $1::numeric where user_id = $2 and balance >= $1::numeric returning balance`;
    const upd = await tx.query(sqlText, [amount, userId]);
    if (upd.length === 0) throw new Error("ปรับยอดไม่สำเร็จ");
    await tx.query(
      `insert into transactions (id, user_id, type, amount, status, note, method, reviewed_by, reviewed_at)
       values ($1, $2, $3, $4::numeric, 'approved', $5, 'staff', $6, now())`,
      [
        `tx_${crypto.randomUUID()}`,
        userId,
        direction === "add" ? "deposit" : "withdraw",
        amount,
        `${direction === "add" ? "เพิ่มเครดิต" : "ลดเครดิต"} · ${reason}`,
        staffId,
      ],
    );
  });
  return back("/app/admin/members", "ok=1");
}

async function publishDraw(form: FormData, staffId: string) {
  const marketId = String(form.get("marketId") || "") as MarketId;
  const roundKey = String(form.get("roundKey") || "");
  const top3 = String(form.get("top3") || "").replace(/\D/g, "");
  const bottom2 = String(form.get("bottom2") || "").replace(/\D/g, "");
  if (!/^\d{3}$/.test(top3) || !/^\d{2}$/.test(bottom2)) return back("/app/admin/draws", "err=digits");
  const st = getMarketState(marketId, new Date());
  if (st.roundKey === roundKey && st.open) return back("/app/admin/draws", "err=open");
  const sql = await getSql();
  const first6 = `${bottom2}${top3}`.slice(-6);
  await sql.query(
    `insert into draw_results (round_key, market_id, top3, bottom2, first6, posted_by)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (round_key) do update
       set top3 = excluded.top3, bottom2 = excluded.bottom2, first6 = excluded.first6, posted_by = excluded.posted_by`,
    [roundKey, marketId, top3, bottom2, first6, staffId],
  );
  await settleLotteryBetsForRound(roundKey, { top3, bottom2, first6 });
  return back("/app/admin/draws", "ok=1");
}

async function saveReferral(form: FormData) {
  const percent = Math.min(100, Math.max(0, money(form.get("percent"))));
  const minDeposit = Math.max(1, money(form.get("minDeposit") || 1));
  const enabled = String(form.get("enabled") || "") === "1";
  const sql = await getSql();
  await sql.query(
    `insert into referral_settings (id, percent, enabled, min_deposit, updated_at)
     values ('main', $1::numeric, $2, $3::numeric, now())
     on conflict (id) do update
       set percent = excluded.percent,
           enabled = excluded.enabled,
           min_deposit = excluded.min_deposit,
           updated_at = now()`,
    [percent, enabled, minDeposit],
  );
  return back("/app/admin/referral", "ok=1");
}

async function saveMovie(form: FormData) {
  const id = String(form.get("id") || "").trim() || `mv_${crypto.randomUUID()}`;
  const title = String(form.get("title") || "").trim();
  if (title.length < 1) return back("/app/admin/movies", "err=title");
  const poster = safeHttpUrl(String(form.get("posterUrl") || ""));
  const video = safeHttpUrl(String(form.get("videoUrl") || ""));
  const sql = await getSql();
  await sql.query(
    `insert into movies (id, title, subtitle, category, year, poster_url, video_url, description, published, featured, sort_order)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     on conflict (id) do update set
       title = excluded.title,
       subtitle = excluded.subtitle,
       category = excluded.category,
       year = excluded.year,
       poster_url = excluded.poster_url,
       video_url = excluded.video_url,
       description = excluded.description,
       published = excluded.published,
       featured = excluded.featured,
       sort_order = excluded.sort_order`,
    [
      id,
      title.slice(0, 80),
      String(form.get("subtitle") || "").trim().slice(0, 120),
      String(form.get("category") || "ทั่วไป").trim().slice(0, 32) || "ทั่วไป",
      String(form.get("year") || "").trim().slice(0, 8),
      poster,
      video,
      String(form.get("description") || "").trim().slice(0, 2000),
      String(form.get("published") || "") === "1",
      String(form.get("featured") || "") === "1",
      Number(form.get("sortOrder") || 0) || 0,
    ],
  );
  return back("/app/admin/movies", "ok=1");
}

async function deleteMovie(form: FormData) {
  const id = String(form.get("id") || "").trim();
  if (!id) return back("/app/admin/movies", "err=missing");
  const sql = await getSql();
  await sql.query(`delete from movies where id = $1`, [id]);
  return back("/app/admin/movies", "ok=1");
}

async function saveBanner(form: FormData) {
  const image = safeHttpUrl(String(form.get("imageUrl") || ""));
  if (!image) return back("/app/admin/movies", "err=banner");
  const id = String(form.get("id") || "").trim() || `bn_${crypto.randomUUID()}`;
  const sql = await getSql();
  await sql.query(
    `insert into movie_banners (id, title, image_url, link_url, active, sort_order)
     values ($1,$2,$3,$4,$5,$6)
     on conflict (id) do update set
       title = excluded.title,
       image_url = excluded.image_url,
       link_url = excluded.link_url,
       active = excluded.active,
       sort_order = excluded.sort_order`,
    [
      id,
      String(form.get("title") || "").trim().slice(0, 80),
      image,
      safeHttpUrl(String(form.get("linkUrl") || "")),
      String(form.get("active") || "") === "1",
      Number(form.get("sortOrder") || 0) || 0,
    ],
  );
  return back("/app/admin/movies", "ok=1");
}

async function deleteBanner(form: FormData) {
  const id = String(form.get("id") || "").trim();
  if (!id) return back("/app/admin/movies", "err=missing");
  const sql = await getSql();
  await sql.query(`delete from movie_banners where id = $1`, [id]);
  return back("/app/admin/movies", "ok=1");
}
