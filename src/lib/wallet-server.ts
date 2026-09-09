import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql, withTransaction } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { hashPassword } from "better-auth/crypto";
import { isThaiPhone, phoneToEmail } from "@/lib/phone";
import { normalizePayAccount, validatePayAccount } from "@/lib/banks";
import { getMarketState, lotteryWins, playMeta, generatedDraw, MARKETS, type MarketId, type PlayType } from "@/lib/lottery";
import { fetchGovResult, fetchLiveDraw } from "@/lib/lottery-feed";
import { payoutFor, settle1x2, settleHdp, settleOu, type MatchView } from "@/lib/football";
import { liveMatch } from "@/lib/football-feed";
import { logServerError, publicError } from "@/lib/server-log";
import type { PostedDraw } from "@/lib/lottery-draws-server";
import { remainingTurnover, turnoverSnapshot, maxWithdrawOf } from "@/lib/promo-server";
import { payReferralCommission, resolveReferrerId } from "@/lib/referral-server";

export type WalletView = {
  userId: string;
  username: string;
  phone: string;
  bankName: string;
  bankAccount: string;
  balance: number;
  isStaff: boolean;
  turnoverNeed: number;
  turnoverDone: number;
  turnoverRemain: number;
};

export type TxnView = {
  id: string;
  type: "deposit" | "withdraw" | "bet" | "payout" | "adjust";
  amount: number;
  status: "pending" | "approved" | "rejected";
  note: string;
  method: string;
  hasSlip: boolean;
  createdAt: number;
};

export type StaffCashItem = {
  id: string;
  userId: string;
  username: string;
  phone: string;
  bankName: string;
  bankAccount: string;
  type: "deposit" | "withdraw";
  amount: number;
  status: "pending";
  note: string;
  method: string;
  hasSlip: boolean;
  createdAt: number;
  profile?: StaffMemberCashProfile;
};

export type StaffMemberCashProfile = {
  balance: number;
  depositTotal: number;
  depositCount: number;
  withdrawTotal: number;
  lastDeposits: { amount: number; at: number }[];
  received: { label: string; amount: number }[];
  turnoverRemain: number;
};

export type BetPayload = {
  marketId?: string;
  roundKey?: string;
  marketName?: string;
  play?: string;
  number?: string;
  rate?: number;
  matchId?: string;
  label?: string;
  market?: string;
  pick?: string;
  line?: number;
  odds?: number;
  stake?: number;
};

export type BetView = {
  id: string;
  kind: "lottery" | "football" | "slot" | "mini";
  payload: BetPayload;
  stake: number;
  status: "pending" | "won" | "lost" | "push";
  payout: number;
  createdAt: number;
};

export type AccountView = {
  wallet: WalletView;
  txns: TxnView[];
  bets: BetView[];
};


function money(v: unknown) {
  return Number(v ?? 0);
}

/** Round to satang and reject non-positive amounts so a debit can never go negative. */
function money2(n: number) {
  if (!Number.isFinite(n) || n <= 0) throw new Error("จำนวนเงินไม่ถูกต้อง");
  const v = Math.round(n * 100) / 100;
  if (v <= 0) throw new Error("จำนวนเงินไม่ถูกต้อง");
  return v;
}

function nid(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

type WalletRow = {
  user_id: string;
  username: string;
  phone: string;
  bank_name: string;
  bank_account: string;
  balance: string | number;
  is_staff: boolean;
};

function toWallet(row: WalletRow): WalletView {
  return {
    userId: row.user_id,
    username: row.username,
    phone: row.phone,
    bankName: row.bank_name,
    bankAccount: row.bank_account,
    balance: money(row.balance),
    isStaff: Boolean(row.is_staff),
    turnoverNeed: 0,
    turnoverDone: 0,
    turnoverRemain: 0,
  };
}

async function readWallet(userId: string) {
  const sql = await getSql();
  const rows = await sql<WalletRow>`
    select user_id, username, phone, bank_name, bank_account, balance, is_staff
    from wallets where user_id = ${userId} limit 1
  `;
  return rows[0] ? toWallet(rows[0]) : null;
}

function staffPhones() {
  const raw = typeof process !== "undefined" ? process.env.STAFF_PHONES || "0954515360" : "0954515360";
  return new Set(
    raw
      .split(/[,;\s]+/)
      .map((s) => s.replace(/\D/g, ""))
      .filter((s) => s.length >= 9),
  );
}

function isHouseStaff(username: string, phone?: string) {
  if (username.toLowerCase() === "admin") return true;
  const digits = (phone || "").replace(/\D/g, "");
  return digits.length >= 9 && staffPhones().has(digits);
}

async function requireStaff(userId: string) {
  const wallet = await readWallet(userId);
  if (!wallet?.isStaff) throw new Error("เฉพาะเจ้าหน้าที่");
  return wallet;
}

async function ensureWalletRow(userId: string, hintName: string) {
  const have = await readWallet(userId);
  if (have) return have;
  const sql = await getSql();
  const username = `${hintName.replace(/[^a-zA-Z0-9ก-๙]/g, "").toLowerCase() || "member"}_${userId.slice(-6)}`;
  const phone = `oauth:${userId}`;
  await sql.query(
    `insert into wallets (user_id, username, phone, bank_name, bank_account, balance, is_staff)
     values ($1, $2, $3, '', '', 0, false)
     on conflict (user_id) do nothing`,
    [userId, username.slice(0, 32), phone],
  );
  const wallet = await readWallet(userId);
  if (!wallet) throw new Error("ไม่พบบัญชีกระเป๋า");
  return wallet;
}

export async function loadAccount(userId: string): Promise<AccountView> {
  try {
    void syncClosedLotteryRounds().catch((err) => logServerError("syncClosedLotteryRounds", err));
    let wallet = await ensureWalletRow(userId, "member");
    const wantStaff = isHouseStaff(wallet.username, wallet.phone);
    if (wantStaff !== wallet.isStaff) {
      const sqlStaff = await getSql();
      await sqlStaff`update wallets set is_staff = ${wantStaff} where user_id = ${userId}`;
      wallet = (await readWallet(userId)) ?? { ...wallet, isStaff: wantStaff };
    }
  const sql = await getSql();
  const txRows = await sql<{
    id: string;
    type: TxnView["type"];
    amount: string | number;
    status: TxnView["status"];
    note: string;
    method: string;
    has_slip: boolean;
    created_at: string;
  }>`
    select id, type, amount, status, note, method, created_at,
           (slip_data <> '') as has_slip
    from transactions
    where user_id = ${userId}
    order by created_at desc
    limit 40
  `;
  const betRows = await sql<{
    id: string;
    kind: BetView["kind"];
    payload: BetPayload | string;
    stake: string | number;
    status: BetView["status"];
    payout: string | number;
    created_at: string;
  }>`select id, kind, payload, stake, status, payout, created_at from bets where user_id = ${userId} order by created_at desc limit 80`;
  let turn = { need: 0, done: 0, remain: 0 };
  try {
    turn = await turnoverSnapshot(userId);
  } catch (err) {
    logServerError("loadAccount.turnover", err);
  }
  return {
    wallet: {
      ...wallet,
      turnoverNeed: turn.need,
      turnoverDone: turn.done,
      turnoverRemain: turn.remain,
    },
    txns: txRows.map((t) => ({
      id: t.id,
      type: t.type,
      amount: money(t.amount),
      status: t.status,
      note: t.note,
      method: t.method ?? "",
      hasSlip: Boolean(t.has_slip),
      createdAt: new Date(t.created_at).getTime(),
    })),
    bets: betRows.map((b) => ({
      id: b.id,
      kind: b.kind,
      payload: typeof b.payload === "string" ? (JSON.parse(b.payload) as BetPayload) : b.payload,
      stake: money(b.stake),
      status: b.status,
      payout: money(b.payout),
      createdAt: new Date(b.created_at).getTime(),
    })),
  };
  } catch (err) {
    throw publicError("loadAccount", err, "โหลดข้อมูลกระเป๋าไม่สำเร็จ ตรวจตาราง wallets / transactions / bets");
  }
}


/** Lock the wallet row, debit only if covered, then write ledger + bets. Rolls back on any failure. */
async function debitBetsLocked(
  userId: string,
  bets: Array<{
    id: string;
    kind: "lottery" | "football";
    payload: string;
    stake: number;
    note: string;
  }>,
) {
  if (bets.length === 0) throw new Error("ไม่มีรายการในโพย");
  if (bets.length > 40) throw new Error("โพยได้สูงสุด 40 รายการ");
  const lines = bets.map((b) => ({ ...b, stake: money2(b.stake) }));
  const total = Math.round(lines.reduce((sum, b) => sum + b.stake, 0) * 100) / 100;

  await withTransaction(async (sql) => {
    const locked = await sql.query<{ balance: string | number }>(
      `select balance from wallets where user_id = $1 for update`,
      [userId],
    );
    if (!locked[0]) throw new Error("ไม่พบบัญชีกระเป๋า");
    if (money(locked[0].balance) < total) throw new Error("เครดิตไม่พอ");

    const upd = await sql.query(
      `update wallets
       set balance = balance - $1::numeric
       where user_id = $2 and balance >= $1::numeric
       returning balance`,
      [total, userId],
    );
    if (upd.length === 0) throw new Error("เครดิตไม่พอ");

    for (const line of lines) {
      const txId = nid("tx");
      await sql.query(
        `insert into transactions (id, user_id, type, amount, status, note)
         values ($1, $2, 'bet', $3::numeric, 'approved', $4)`,
        [txId, userId, line.stake, line.note],
      );
      await sql.query(
        `insert into bets (id, user_id, kind, payload, stake, status)
         values ($1, $2, $3, $4::jsonb, $5::numeric, 'pending')`,
        [line.id, userId, line.kind, line.payload, line.stake],
      );
    }
  });
}

const createBody = z
  .object({
    username: z.string().trim().min(3).max(32),
    phone: z.string().trim(),
    bankName: z.string().trim().min(1),
    bankAccount: z.string().trim().min(1),
    ref: z.string().trim().max(32).optional(),
  })
  .superRefine((data, ctx) => {
    const err = validatePayAccount(data.bankName, data.bankAccount);
    if (err) ctx.addIssue({ code: "custom", message: err, path: ["bankAccount"] });
  });

export const checkHandleAvailable = createServerFn({ method: "POST" })
  .validator((v: unknown) => z.object({ username: z.string().trim().min(3), phone: z.string().trim() }).parse(v))
  .handler(async ({ data }) => {
    if (!isThaiPhone(data.phone)) throw new Error("เบอร์โทรไม่ถูกต้อง");
    const sql = await getSql();
    const username = data.username.toLowerCase();
    const phone = data.phone.replace(/\D/g, "");
    const clash = await sql<{ c: number }>`
      select count(*)::int as c from wallets
      where username = ${username} or phone = ${phone}
    `;
    return (clash[0]?.c ?? 0) === 0;
  });

export const createWallet = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: unknown) => createBody.parse(v))
  .handler(async ({ context, data }) => {
    if (!isThaiPhone(data.phone)) throw new Error("เบอร์โทรไม่ถูกต้อง");
    const sql = await getSql();
    const username = data.username.toLowerCase();
    const phone = data.phone.replace(/\D/g, "");
    const existing = await readWallet(context.userId);
    if (existing) return existing;

    const clash = await sql<{ c: number }>`
      select count(*)::int as c from wallets
      where (username = ${username} or phone = ${phone}) and user_id <> ${context.userId}
    `;
    if ((clash[0]?.c ?? 0) > 0) throw new Error("ชื่อผู้ใช้หรือเบอร์โทรนี้ถูกใช้แล้ว");

    const isStaff = isHouseStaff(username, phone);
    const referrerId = await resolveReferrerId(data.ref, username);
    await sql.query(
      `insert into wallets (user_id, username, phone, bank_name, bank_account, balance, is_staff, ref_code, referrer_id)
       values ($1, $2, $3, $4, $5, 0, $6, $2, $7)`,
      [context.userId, username, phone, data.bankName, normalizePayAccount(data.bankAccount), isStaff, referrerId],
    );
    const wallet = await readWallet(context.userId);
    if (!wallet) throw new Error("สร้างกระเป๋าไม่สำเร็จ");
    return wallet;
  });

export { resolveLoginEmail } from "@/lib/login-server";

export const getAccount = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    try {
      return await loadAccount(context.userId);
    } catch (err) {
      throw publicError("getAccount", err, "ดึงยอดเงินสมาชิกไม่สำเร็จ");
    }
  });

export const getAccountByToken = createServerFn({ method: "GET" })
  .validator((v: unknown) => z.object({ token: z.string().optional() }).parse(v ?? {}))
  .handler(async ({ data }) => {
    const { requireUserId } = await import("@/lib/auth/verify.server");
    const userId = await requireUserId(data.token);
    return loadAccount(userId);
  });

const moneyBody = z.object({
  amount: z.number().positive(),
  note: z.string().trim().min(1).max(80),
});

const depositBody = z.object({
  amount: z.number().positive(),
  method: z.enum(["พร้อมเพย์", "โอนธนาคาร", "ทรูมันนี่"]),
  slipData: z.string().min(40).max(900_000),
  note: z.string().trim().min(1).max(120),
});

function assertSlip(value: string) {
  const ok =
    value.startsWith("data:image/jpeg;base64,") ||
    value.startsWith("data:image/jpg;base64,") ||
    value.startsWith("data:image/png;base64,") ||
    value.startsWith("data:image/webp;base64,") ||
    value.startsWith("data:image/heic;base64,") ||
    value.startsWith("data:image/heif;base64,") ||
    value.startsWith("data:image/gif;base64,");
  if (!ok) throw new Error("กรุณาอัปโหลดรูปสลิป");
}

export const requestDeposit = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: unknown) => depositBody.parse(v))
  .handler(async ({ context, data }) => {
    try {
      const amount = money2(data.amount);
      if (amount < 1) throw new Error("ฝากขั้นต่ำ 1 บาท");
      assertSlip(data.slipData);
      await ensureWalletRow(context.userId, "member");
      const sql = await getSql();
      const id = nid("tx");
      await sql.query(
        `insert into transactions (id, user_id, type, amount, status, note, method, slip_data)
         values ($1, $2, 'deposit', $3::numeric, 'pending', $4, $5, $6)`,
        [id, context.userId, amount, data.note, data.method, data.slipData],
      );
      return loadAccount(context.userId);
    } catch (err) {
      if (err instanceof Error && (err.message.startsWith("ฝาก") || err.message.startsWith("กรุณา"))) throw err;
      throw publicError("requestDeposit", err, "ส่งสลิปไม่สำเร็จ");
    }
  });

export const requestWithdraw = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: unknown) => moneyBody.parse(v))
  .handler(async ({ context, data }) => {
    const amount = money2(data.amount);
    if (amount < 100) throw new Error("ถอนขั้นต่ำ 100 บาท");
    await ensureWalletRow(context.userId, "member");
    const wallet = await readWallet(context.userId);
    if (!wallet || wallet.balance < amount) throw new Error("เครดิตไม่พอ");
    const turn = await remainingTurnover(context.userId);
    if (turn > 0) throw new Error(`ต้องทำยอดอีก ฿ ${turn.toLocaleString("th-TH", { minimumFractionDigits: 2 })} ก่อนถอน`);
    const cap = await maxWithdrawOf(context.userId);
    if (cap > 0 && amount > cap) throw new Error(`โปรนี้ถอนได้สูงสุดครั้งละ ฿ ${cap.toLocaleString("th-TH")}`);
    const sql = await getSql();
    const id = nid("tx");
    await sql.query(
      `insert into transactions (id, user_id, type, amount, status, note)
       values ($1, $2, 'withdraw', $3::numeric, 'pending', $4)`,
      [id, context.userId, amount, data.note],
    );
    return loadAccount(context.userId);
  });

const reviewBody = z.object({
  id: z.string().min(4),
  action: z.enum(["approve", "reject"]),
});

/** Staff desk: credit a pending deposit to the member wallet, or refund a held withdrawal. */
export const reviewCashTxn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: unknown) => reviewBody.parse(v))
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    const sql = await getSql();
    const found = await sql<{
      id: string;
      user_id: string;
      type: "deposit" | "withdraw";
      amount: string | number;
    }>`
      select id, user_id, type, amount from transactions
      where id = ${data.id} and status = 'pending' and type in ('deposit', 'withdraw')
      limit 1
    `;
    const row = found[0];
    if (!row) throw new Error("ไม่พบรายการรอตรวจสอบ");
    const ownerId = row.user_id;

    if (data.action === "approve" && row.type === "deposit") {
      const rows = await sql.query(
        `with t as (
           update transactions
           set status = 'approved', reviewed_by = $3, reviewed_at = now()
           where id = $1 and user_id = $2 and status = 'pending' and type = 'deposit'
           returning amount
         )
         update wallets w
         set balance = w.balance + t.amount
         from t
         where w.user_id = $2
         returning w.balance`,
        [data.id, ownerId, context.userId],
      );
      if (rows.length === 0) throw new Error("อนุมัติไม่สำเร็จ");
      await payReferralCommission(ownerId, data.id, money(row.amount));
    } else if (data.action === "approve" && row.type === "withdraw") {
      await withTransaction(async (tx) => {
        const locked = await tx.query<{ balance: string | number }>(
          `select balance from wallets where user_id = $1 for update`,
          [ownerId],
        );
        if (!locked[0]) throw new Error("ไม่พบบัญชีกระเป๋า");
        const amount = money(row.amount);
        if (money(locked[0].balance) < amount) throw new Error("เครดิตในกระเป๋าสมาชิกไม่พอ");
        const upd = await tx.query(
          `update wallets set balance = balance - $1::numeric
           where user_id = $2 and balance >= $1::numeric returning balance`,
          [amount, ownerId],
        );
        if (upd.length === 0) throw new Error("เครดิตในกระเป๋าสมาชิกไม่พอ");
        const marked = await tx.query(
          `update transactions
           set status = 'approved', reviewed_by = $3, reviewed_at = now()
           where id = $1 and user_id = $2 and status = 'pending' and type = 'withdraw'
           returning id`,
          [data.id, ownerId, context.userId],
        );
        if (marked.length === 0) throw new Error("อนุมัติไม่สำเร็จ");
      });
    } else if (data.action === "reject" && row.type === "deposit") {
      const rows = await sql.query(
        `update transactions
         set status = 'rejected', reviewed_by = $3, reviewed_at = now()
         where id = $1 and user_id = $2 and status = 'pending' and type = 'deposit'
         returning id`,
        [data.id, ownerId, context.userId],
      );
      if (rows.length === 0) throw new Error("ปฏิเสธไม่สำเร็จ");
    } else {
      const rows = await sql.query(
        `update transactions
         set status = 'rejected', reviewed_by = $3, reviewed_at = now()
         where id = $1 and user_id = $2 and status = 'pending' and type = 'withdraw'
         returning id`,
        [data.id, ownerId, context.userId],
      );
      if (rows.length === 0) throw new Error("ปฏิเสธไม่สำเร็จ");
    }
    return loadAccount(context.userId);
  });

export async function loadStaffCashQueue(): Promise<StaffCashItem[]> {
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    user_id: string;
    username: string;
    phone: string;
    bank_name: string;
    bank_account: string;
    balance: string | number;
    type: "deposit" | "withdraw";
    amount: string | number;
    note: string;
    method: string;
    has_slip: boolean;
    created_at: string;
  }>`
    select t.id, t.user_id, w.username, w.phone, w.bank_name, w.bank_account, w.balance,
           t.type, t.amount, t.note, t.method,
           (t.slip_data <> '') as has_slip, t.created_at
    from transactions t
    join wallets w on w.user_id = t.user_id
    where t.status = 'pending' and t.type in ('deposit', 'withdraw')
    order by t.created_at asc
    limit 40
  `;
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const profiles = await loadMemberCashProfiles(ids);
  return rows.map(
    (t): StaffCashItem => ({
      id: t.id,
      userId: t.user_id,
      username: t.username,
      phone: t.phone,
      bankName: t.bank_name ?? "",
      bankAccount: t.bank_account ?? "",
      type: t.type,
      amount: money(t.amount),
      status: "pending",
      note: t.note,
      method: t.method ?? "",
      hasSlip: Boolean(t.has_slip),
      createdAt: new Date(t.created_at).getTime(),
      profile: profiles.get(t.user_id) ?? {
        balance: money(t.balance),
        depositTotal: 0,
        depositCount: 0,
        withdrawTotal: 0,
        lastDeposits: [],
        received: [],
        turnoverRemain: 0,
      },
    }),
  );
}

async function loadMemberCashProfiles(ids: string[]) {
  const map = new Map<string, StaffMemberCashProfile>();
  if (ids.length === 0) return map;
  const sql = await getSql();
  const wallets = await sql<{ user_id: string; balance: string | number }>`
    select user_id, balance from wallets where user_id = any(${ids}::text[])
  `;
  for (const w of wallets) {
    map.set(w.user_id, {
      balance: money(w.balance),
      depositTotal: 0,
      depositCount: 0,
      withdrawTotal: 0,
      lastDeposits: [],
      received: [],
      turnoverRemain: 0,
    });
  }
  const sums = await sql<{
    user_id: string;
    deposit_total: string | number;
    deposit_count: number;
    withdraw_total: string | number;
  }>`
    select user_id,
      coalesce(sum(amount) filter (where type = 'deposit' and status = 'approved'), 0) as deposit_total,
      count(*) filter (where type = 'deposit' and status = 'approved')::int as deposit_count,
      coalesce(sum(amount) filter (where type = 'withdraw' and status = 'approved'), 0) as withdraw_total
    from transactions
    where user_id = any(${ids}::text[])
    group by user_id
  `;
  for (const s of sums) {
    const p = map.get(s.user_id);
    if (!p) continue;
    p.depositTotal = money(s.deposit_total);
    p.depositCount = s.deposit_count;
    p.withdrawTotal = money(s.withdraw_total);
  }
  const lastDep = await sql<{ user_id: string; amount: string | number; created_at: string }>`
    select user_id, amount, created_at
    from transactions
    where user_id = any(${ids}::text[]) and type = 'deposit' and status = 'approved'
    order by created_at desc
    limit 120
  `;
  for (const d of lastDep) {
    const p = map.get(d.user_id);
    if (!p || p.lastDeposits.length >= 3) continue;
    p.lastDeposits.push({ amount: money(d.amount), at: new Date(d.created_at).getTime() });
  }
  try {
    const promos = await sql<{ user_id: string; title: string; amount: string | number }>`
      select c.user_id, coalesce(nullif(p.title, ''), c.promo_code) as title, c.amount
      from promo_claims c
      left join promotions p on p.id = c.promo_code
      where c.status = 'approved' and c.user_id = any(${ids}::text[])
      order by c.created_at desc
    `;
    for (const r of promos) {
      map.get(r.user_id)?.received.push({ label: `โปร ${r.title}`, amount: money(r.amount) });
    }
  } catch {
    /* older db */
  }
  try {
    const coupons = await sql<{ user_id: string; code: string; amount: string | number }>`
      select cl.user_id, co.code, co.amount
      from coupon_claims cl
      join coupons co on co.id = cl.coupon_id
      where cl.user_id = any(${ids}::text[])
    `;
    for (const r of coupons) {
      map.get(r.user_id)?.received.push({ label: `คูปอง ${r.code}`, amount: money(r.amount) });
    }
  } catch {
    /* older db */
  }
  try {
    const adjusts = await sql<{ user_id: string; amount: string | number; note: string }>`
      select user_id, amount, note
      from transactions
      where user_id = any(${ids}::text[]) and type = 'adjust' and status = 'approved'
      order by created_at desc
    `;
    for (const r of adjusts) {
      map.get(r.user_id)?.received.push({ label: r.note || "ปรับยอด", amount: money(r.amount) });
    }
  } catch {
    /* ignore */
  }
  try {
    const turns = await sql<{ user_id: string; need: string | number; done: string | number }>`
      with need as (
        select user_id, coalesce(sum(turnover_need), 0) as need,
               min(coalesce(reviewed_at, created_at)) as since
        from promo_claims
        where status = 'approved' and turnover_need > 0 and user_id = any(${ids}::text[])
        group by user_id
      )
      select n.user_id, n.need,
        coalesce((
          select sum(t.amount) from transactions t
          where t.user_id = n.user_id and t.type = 'bet' and t.status = 'approved' and t.created_at >= n.since
        ), 0) as done
      from need n
    `;
    for (const t of turns) {
      const p = map.get(t.user_id);
      if (!p) continue;
      p.turnoverRemain = Math.max(0, money(t.need) - money(t.done));
    }
  } catch {
    /* ignore */
  }
  return map;
}

export const listStaffQueue = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireStaff(context.userId);
    return loadStaffCashQueue();
  });

export const getCashSlip = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: unknown) => z.object({ id: z.string().min(4) }).parse(v))
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    const sql = await getSql();
    const rows = await sql<{ slip_data: string }>`
      select slip_data from transactions
      where id = ${data.id} and type in ('deposit', 'withdraw')
      limit 1
    `;
    const slip = rows[0]?.slip_data ?? "";
    if (!slip) throw new Error("ไม่มีสลิปในรายการนี้");
    return slip;
  });

export const getStaffSummary = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireStaff(context.userId);
    const sql = await getSql();
    const cash = await sql<{ deposits: number; withdraws: number }>`
      select
        count(*) filter (where type = 'deposit' and status = 'pending')::int as deposits,
        count(*) filter (where type = 'withdraw' and status = 'pending')::int as withdraws
      from transactions
    `;
    const members = await sql<{ c: number }>`select count(*)::int as c from wallets`;
    return {
      pendingDeposits: cash[0]?.deposits ?? 0,
      pendingWithdraws: cash[0]?.withdraws ?? 0,
      memberCount: members[0]?.c ?? 0,
    };
  });

export type StaffMember = {
  userId: string;
  username: string;
  phone: string;
  balance: number;
  isStaff: boolean;
  bankName: string;
  bankAccount: string;
};

export async function loadStaffMembers(): Promise<StaffMember[]> {
  const sql = await getSql();
  const rows = await sql<{
    user_id: string;
    username: string;
    phone: string;
    balance: string | number;
    is_staff: boolean;
    bank_name: string;
    bank_account: string;
  }>`
    select user_id, username, phone, balance, is_staff, bank_name, bank_account
    from wallets
    order by created_at desc
    limit 80
  `;
  return rows.map(
    (r): StaffMember => ({
      userId: r.user_id,
      username: r.username,
      phone: r.phone,
      balance: money(r.balance),
      isStaff: Boolean(r.is_staff),
      bankName: r.bank_name,
      bankAccount: r.bank_account,
    }),
  );
}

export const listMembers = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireStaff(context.userId);
    return loadStaffMembers();
  });

function toStaffMember(r: {
  user_id: string;
  username: string;
  phone: string;
  balance: string | number;
  is_staff: boolean;
  bank_name: string;
  bank_account: string;
}): StaffMember {
  return {
    userId: r.user_id,
    username: r.username,
    phone: r.phone,
    balance: money(r.balance),
    isStaff: Boolean(r.is_staff),
    bankName: r.bank_name,
    bankAccount: r.bank_account,
  };
}

export const getMember = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: unknown) => z.object({ userId: z.string().min(4) }).parse(v))
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      user_id: string;
      username: string;
      phone: string;
      balance: string | number;
      is_staff: boolean;
      bank_name: string;
      bank_account: string;
    }>`
      select user_id, username, phone, balance, is_staff, bank_name, bank_account
      from wallets where user_id = ${data.userId} limit 1
    `;
    if (!rows[0]) throw new Error("ไม่พบสมาชิก");
    return toStaffMember(rows[0]);
  });

export const listMemberTxns = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: unknown) => z.object({ userId: z.string().min(4) }).parse(v))
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      type: TxnView["type"];
      amount: string | number;
      status: TxnView["status"];
      note: string;
      method: string;
      created_at: string;
    }>`
      select id, type, amount, status, note, method, created_at
      from transactions
      where user_id = ${data.userId}
      order by created_at desc
      limit 30
    `;
    return rows.map(
      (t): TxnView => ({
        id: t.id,
        type: t.type,
        amount: money(t.amount),
        status: t.status,
        note: t.note,
        method: t.method ?? "",
        hasSlip: false,
        createdAt: new Date(t.created_at).getTime(),
      }),
    );
  });

export type MemberBetReport = {
  bets: BetView[];
  totalStake: number;
  totalPayout: number;
  pendingStake: number;
  won: number;
  lost: number;
  push: number;
  pending: number;
  net: number;
};

export const listMemberBets = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: unknown) => z.object({ userId: z.string().min(4) }).parse(v))
  .handler(async ({ context, data }): Promise<MemberBetReport> => {
    await requireStaff(context.userId);
    const sql = await getSql();
    const rows = await sql<{
      id: string;
      kind: BetView["kind"];
      payload: BetPayload | string;
      stake: string | number;
      status: BetView["status"];
      payout: string | number;
      created_at: string;
    }>`
      select id, kind, payload, stake, status, payout, created_at
      from bets
      where user_id = ${data.userId}
      order by created_at desc
      limit 120
    `;
    const bets: BetView[] = rows.map((b) => ({
      id: b.id,
      kind: b.kind,
      payload: typeof b.payload === "string" ? (JSON.parse(b.payload) as BetPayload) : b.payload,
      stake: money(b.stake),
      status: b.status,
      payout: money(b.payout),
      createdAt: new Date(b.created_at).getTime(),
    }));
    let totalStake = 0;
    let totalPayout = 0;
    let pendingStake = 0;
    let won = 0;
    let lost = 0;
    let push = 0;
    let pending = 0;
    for (const b of bets) {
      if (b.status === "pending") {
        pending += 1;
        pendingStake += b.stake;
      } else {
        totalStake += b.stake;
        totalPayout += b.payout;
        if (b.status === "won") won += 1;
        else if (b.status === "lost") lost += 1;
        else push += 1;
      }
    }
    return {
      bets,
      totalStake,
      totalPayout,
      pendingStake,
      won,
      lost,
      push,
      pending,
      net: Math.round((totalPayout - totalStake) * 100) / 100,
    };
  });

const memberEditBody = z.object({
  userId: z.string().min(4),
  phone: z.string().trim(),
  bankName: z.string().trim().min(1),
  bankAccount: z.string().trim().min(1),
  password: z.string().optional(),
});

export const updateMember = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: unknown) => memberEditBody.parse(v))
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    if (!isThaiPhone(data.phone) && !data.phone.startsWith("oauth:")) throw new Error("เบอร์โทรไม่ถูกต้อง");
    const payErr = validatePayAccount(data.bankName, data.bankAccount);
    if (payErr) throw new Error(payErr);
    const phone = data.phone.startsWith("oauth:") ? data.phone : data.phone.replace(/\D/g, "");
    const account = normalizePayAccount(data.bankAccount);
    if (data.password && data.password.length < 8) throw new Error("รหัสผ่านอย่างน้อย 8 ตัว");

    const sql = await getSql();
    const clash = await sql<{ c: number }>`
      select count(*)::int as c from wallets
      where phone = ${phone} and user_id <> ${data.userId}
    `;
    if ((clash[0]?.c ?? 0) > 0) throw new Error("เบอร์โทรนี้ถูกใช้แล้ว");

    const upd = await sql.query(
      `update wallets
       set phone = $1, bank_name = $2, bank_account = $3
       where user_id = $4
       returning user_id`,
      [phone, data.bankName, account, data.userId],
    );
    if (upd.length === 0) throw new Error("ไม่พบสมาชิก");

    if (isThaiPhone(phone)) {
      const email = phoneToEmail(phone);
      await sql.query(`update "user" set email = $1, "updatedAt" = now() where id = $2`, [email, data.userId]);
    }

    if (data.password) {
      const hashed = await hashPassword(data.password);
      const cred = await sql.query<{ id: string }>(
        `select id from "account" where "userId" = $1 and "providerId" = 'credential' limit 1`,
        [data.userId],
      );
      if (cred[0]) {
        await sql.query(
          `update "account" set password = $1, "updatedAt" = now() where id = $2`,
          [hashed, cred[0].id],
        );
      } else {
        await sql.query(
          `insert into "account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
           values ($1, $2, 'credential', $2, $3, now(), now())`,
          [nid("acc"), data.userId, hashed],
        );
      }
    }

    const row = await sql<{
      user_id: string;
      username: string;
      phone: string;
      balance: string | number;
      is_staff: boolean;
      bank_name: string;
      bank_account: string;
    }>`
      select user_id, username, phone, balance, is_staff, bank_name, bank_account
      from wallets where user_id = ${data.userId} limit 1
    `;
    return toStaffMember(row[0]);
  });

const adjustBody = z.object({
  userId: z.string().min(4),
  direction: z.enum(["add", "sub"]),
  amount: z.number().positive(),
  reason: z.string().trim().min(3).max(80),
});

export const adjustMemberBalance = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: unknown) => adjustBody.parse(v))
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    const amount = money2(data.amount);
    const note = `${data.direction === "add" ? "เพิ่มเครดิต" : "ลดเครดิต"} · ${data.reason}`;
    await withTransaction(async (tx) => {
      const locked = await tx.query<{ balance: string | number }>(
        `select balance from wallets where user_id = $1 for update`,
        [data.userId],
      );
      if (!locked[0]) throw new Error("ไม่พบสมาชิก");
      if (data.direction === "sub" && money(locked[0].balance) < amount) {
        throw new Error("เครดิตในกระเป๋าไม่พอสำหรับลดยอด");
      }
      const deltaSql =
        data.direction === "add"
          ? `update wallets set balance = balance + $1::numeric where user_id = $2 returning balance`
          : `update wallets set balance = balance - $1::numeric where user_id = $2 and balance >= $1::numeric returning balance`;
      const upd = await tx.query(deltaSql, [amount, data.userId]);
      if (upd.length === 0) throw new Error("ปรับยอดไม่สำเร็จ");
      await tx.query(
        `insert into transactions (id, user_id, type, amount, status, note, method, reviewed_by, reviewed_at)
         values ($1, $2, $3, $4::numeric, 'approved', $5, 'staff', $6, now())`,
        [
          nid("tx"),
          data.userId,
          data.direction === "add" ? "deposit" : "withdraw",
          amount,
          note,
          context.userId,
        ],
      );
    });
    const sql = await getSql();
    const row = await sql<{
      user_id: string;
      username: string;
      phone: string;
      balance: string | number;
      is_staff: boolean;
      bank_name: string;
      bank_account: string;
    }>`
      select user_id, username, phone, balance, is_staff, bank_name, bank_account
      from wallets where user_id = ${data.userId} limit 1
    `;
    return toStaffMember(row[0]);
  });

const lotteryBody = z.object({
  marketId: z.string(),
  roundKey: z.string(),
  marketName: z.string(),
  play: z.enum(["3top", "3toad", "2top", "2bottom", "runTop", "runBottom"]),
  number: z.string().min(1).max(3),
  rate: z.number().positive(),
  stake: z.number().positive(),
});

function assertLotteryLine(data: z.infer<typeof lotteryBody>, now: Date) {
  const meta = playMeta(data.play);
  if (data.number.length !== meta.digits) throw new Error(`เลขต้อง ${meta.digits} หลัก`);
  const st = getMarketState(data.marketId as MarketId, now);
  if (!st.open || st.roundKey !== data.roundKey) throw new Error("ปิดรับแทงแล้ว");
}

async function placeLotteryLines(userId: string, items: z.infer<typeof lotteryBody>[]) {
  const now = new Date();
  for (const item of items) assertLotteryLine(item, now);
  await ensureWalletRow(userId, "member");
  await debitBetsLocked(
    userId,
    items.map((item) => ({
      id: nid("bet"),
      kind: "lottery" as const,
      stake: item.stake,
      note: `${item.marketName} ${item.number}`,
      payload: JSON.stringify({
        marketId: item.marketId,
        roundKey: item.roundKey,
        marketName: item.marketName,
        play: item.play,
        number: item.number,
        rate: item.rate,
      }),
    })),
  );
}

export const placeLotteryBet = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: unknown) => lotteryBody.parse(v))
  .handler(async ({ context, data }) => {
    await placeLotteryLines(context.userId, [data]);
    return loadAccount(context.userId);
  });

export const placeLotterySlip = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: unknown) => z.object({ items: z.array(lotteryBody).min(1).max(40) }).parse(v))
  .handler(async ({ context, data }) => {
    await placeLotteryLines(context.userId, data.items);
    return loadAccount(context.userId);
  });

const footballBody = z.object({
  matchId: z.string(),
  label: z.string(),
  market: z.enum(["1x2", "hdp", "ou"]),
  pick: z.enum(["home", "draw", "away", "over", "under"]),
  line: z.number().optional(),
  odds: z.number().positive(),
  stake: z.number().min(10),
});

async function placeFootballLines(userId: string, items: z.infer<typeof footballBody>[]) {
  for (const item of items) {
    const match = await liveMatch(item.matchId);
    if (!match || match.status === "finished") throw new Error("คู่นี้รับแทงไม่ได้");
  }
  await ensureWalletRow(userId, "member");
  await debitBetsLocked(
    userId,
    items.map((item) => ({
      id: nid("bet"),
      kind: "football" as const,
      stake: item.stake,
      note: item.label,
      payload: JSON.stringify(item),
    })),
  );
}

export const placeFootballBet = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: unknown) => footballBody.parse(v))
  .handler(async ({ context, data }) => {
    await placeFootballLines(context.userId, [data]);
    return loadAccount(context.userId);
  });

export const placeFootballSlip = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: unknown) => z.object({ items: z.array(footballBody).min(1).max(40) }).parse(v))
  .handler(async ({ context, data }) => {
    await placeFootballLines(context.userId, data.items);
    return loadAccount(context.userId);
  });

function footballMark(payload: BetPayload, match: MatchView | undefined) {
  if (!match || match.status !== "finished") return null;
  const market = String(payload.market);
  const pick = String(payload.pick);
  if (market === "1x2") return settle1x2(match.homeGoals, match.awayGoals, pick as "home" | "draw" | "away");
  if (market === "hdp") return settleHdp(match.homeGoals, match.awayGoals, Number(payload.line ?? 0), pick as "home" | "away");
  return settleOu(match.homeGoals, match.awayGoals, Number(payload.line ?? 2.5), pick as "over" | "under");
}

async function postedDraw(roundKey: string) {
  const sql = await getSql();
  const rows = await sql<{ top3: string; bottom2: string; first6: string }>`
    select top3, bottom2, first6 from draw_results where round_key = ${roundKey} limit 1
  `;
  const r = rows[0];
  if (!r) return null;
  return { top3: r.top3, bottom2: r.bottom2, first6: r.first6 || undefined };
}

export async function settleLotteryBetsForRound(roundKey: string, result: { top3: string; bottom2: string; first6?: string }) {
  const sql = await getSql();
  const pending = await sql<{
    id: string;
    user_id: string;
    payload: BetPayload | string;
    stake: string | number;
  }>`
    select id, user_id, payload, stake
    from bets
    where kind = 'lottery' and status = 'pending' and payload->>'roundKey' = ${roundKey}
  `;
  let settled = 0;
  let winners = 0;
  let paid = 0;
  for (const row of pending) {
    const payload = typeof row.payload === "string" ? (JSON.parse(row.payload) as BetPayload) : row.payload;
    const stake = money(row.stake);
    const win = lotteryWins(payload.play as PlayType, String(payload.number), result);
    const status = win ? "won" : "lost";
    const payout = win ? Math.floor(stake * Number(payload.rate || 0)) : 0;
    const txId = nid("tx");
    await withTransaction(async (tx) => {
      if (payout > 0) {
        const locked = await tx.query(
          `select balance from wallets where user_id = $1 for update`,
          [row.user_id],
        );
        if (!locked[0]) throw new Error("ไม่พบบัญชีกระเป๋า");
      }
      const marked = await tx.query(
        `update bets set status = $1, payout = $2::numeric
         where id = $3 and user_id = $4 and status = 'pending'
         returning id`,
        [status, payout, row.id, row.user_id],
      );
      if (marked.length === 0) return;
      if (payout > 0) {
        await tx.query(
          `update wallets set balance = balance + $1::numeric where user_id = $2`,
          [payout, row.user_id],
        );
        await tx.query(
          `insert into transactions (id, user_id, type, amount, status, note)
           values ($1, $2, 'payout', $3::numeric, 'approved', $4)`,
          [txId, row.user_id, payout, `ถูกรางวัล ${payload.number ?? ""}`],
        );
      }
    });
    settled += 1;
    if (payout > 0) {
      winners += 1;
      paid += payout;
    }
  }
  return { settled, winners, paid };
}

const drawBody = z.object({
  marketId: z.string().min(2),
  roundKey: z.string().min(3),
  top3: z.string().regex(/^\d{3}$/),
  bottom2: z.string().regex(/^\d{2}$/),
});

export const publishLotteryResult = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: unknown) => drawBody.parse(v))
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    const st = getMarketState(data.marketId as MarketId, new Date());
    if (st.roundKey === data.roundKey && st.open) throw new Error("รอบนี้ยังเปิดรับแทง");
    const sql = await getSql();
    const first6 = `${data.bottom2}${data.top3}`.slice(-6);
    await sql.query(
      `insert into draw_results (round_key, market_id, top3, bottom2, first6, posted_by)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (round_key) do update
         set top3 = excluded.top3, bottom2 = excluded.bottom2, first6 = excluded.first6, posted_by = excluded.posted_by`,
      [data.roundKey, data.marketId, data.top3, data.bottom2, first6, context.userId],
    );
    const stats = await settleLotteryBetsForRound(data.roundKey, {
      top3: data.top3,
      bottom2: data.bottom2,
      first6,
    });
    return stats;
  });

export async function loadPostedDraws(): Promise<PostedDraw[]> {
  const sql = await getSql();
  const rows = await sql<{
    round_key: string;
    market_id: string;
    top3: string;
    bottom2: string;
    first6: string;
    created_at: string;
  }>`
    select round_key, market_id, top3, bottom2, first6, created_at
    from draw_results
    order by created_at desc
    limit 20
  `;
  return rows.map(
    (r): PostedDraw => ({
      roundKey: r.round_key,
      marketId: r.market_id,
      top3: r.top3,
      bottom2: r.bottom2,
      first6: r.first6 ?? "",
      createdAt: new Date(r.created_at).getTime(),
    }),
  );
}

export const listDrawResults = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireStaff(context.userId);
    return loadPostedDraws();
  });

async function resolveRoundResult(marketId: MarketId, roundKey: string) {
  const dateKey = roundKey.split(":")[1];
  const live = await fetchLiveDraw(marketId, dateKey);
  if (live) return { ...live, source: marketId === "gov" ? ("glo" as const) : ("live" as const) };
  if (marketId === "gov" && dateKey) {
    const gov = await fetchGovResult(dateKey);
    if (gov) return { ...gov, source: "glo" as const };
  }
  return { ...generatedDraw(roundKey), source: "auto" as const };
}

async function ensureRoundPosted(marketId: MarketId, roundKey: string) {
  const existing = await postedDraw(roundKey);
  if (existing) {
    return settleLotteryBetsForRound(roundKey, existing);
  }
  const drawn = await resolveRoundResult(marketId, roundKey);
  const sql = await getSql();
  const first6 = drawn.first6 ?? `${drawn.bottom2}${drawn.top3}`.slice(-6);
  await sql.query(
    `insert into draw_results (round_key, market_id, top3, bottom2, first6, posted_by)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (round_key) do update
       set top3 = excluded.top3,
           bottom2 = excluded.bottom2,
           first6 = excluded.first6,
           posted_by = excluded.posted_by
     where excluded.posted_by = 'glo'
        or (excluded.posted_by = 'live' and coalesce(draw_results.posted_by, '') not in ('glo', 'admin'))
        or coalesce(draw_results.posted_by, '') not in ('glo', 'live', 'admin')`,
    [roundKey, marketId, drawn.top3, drawn.bottom2, first6, drawn.source === "glo" ? "glo" : drawn.source === "live" ? "live" : "auto"],
  );
  const posted = (await postedDraw(roundKey)) ?? drawn;
  return settleLotteryBetsForRound(roundKey, posted);
}

const globalSync = globalThis as typeof globalThis & {
  __mawinLottoSyncAt__?: number;
  __mawinLottoTimer__?: ReturnType<typeof setInterval>;
};

export async function syncClosedLotteryRounds() {
  const nowMs = Date.now();
  if (globalSync.__mawinLottoSyncAt__ && nowMs - globalSync.__mawinLottoSyncAt__ < 12000) {
    return { rounds: 0, settled: 0, winners: 0, paid: 0 };
  }
  globalSync.__mawinLottoSyncAt__ = nowMs;
  const now = new Date();
  const closed = new Map<string, MarketId>();

  for (const market of MARKETS) {
    const st = getMarketState(market.id, now);
    if (st.previous?.roundKey) closed.set(st.previous.roundKey, market.id);
    if (!st.open && st.roundKey) closed.set(st.roundKey, market.id);
  }

  const sql = await getSql();
  const pending = await sql<{ round_key: string; market_id: string }>`
    select distinct payload->>'roundKey' as round_key, payload->>'marketId' as market_id
    from bets
    where kind = 'lottery' and status = 'pending'
  `;
  for (const row of pending) {
    if (!row.round_key || !row.market_id) continue;
    const st = getMarketState(row.market_id as MarketId, now);
    const stillOpen = st.open && st.roundKey === row.round_key;
    if (!stillOpen) closed.set(row.round_key, row.market_id as MarketId);
  }

  let rounds = 0;
  let settled = 0;
  let winners = 0;
  let paid = 0;
  for (const [roundKey, marketId] of closed) {
    try {
      const stats = await ensureRoundPosted(marketId, roundKey);
      rounds += 1;
      settled += stats.settled;
      winners += stats.winners;
      paid += stats.paid;
    } catch (err) {
      logServerError(`settle ${marketId} ${roundKey}`, err);
    }
  }
  return { rounds, settled, winners, paid };
}

export function startLotterySyncLoop() {
  if (globalSync.__mawinLottoTimer__) return;
  globalSync.__mawinLottoTimer__ = setInterval(() => {
    void syncClosedLotteryRounds().catch((err) => logServerError("lottery-loop", err));
  }, 30000);
  void syncClosedLotteryRounds().catch((err) => logServerError("lottery-loop-start", err));
}

export const syncLotteryDraws = createServerFn({ method: "POST" }).handler(async () => {
  try {
    return await syncClosedLotteryRounds();
  } catch (err) {
    throw publicError("syncLotteryDraws", err, "ดึงผลหวยอัตโนมัติไม่สำเร็จ ตรวจตาราง draw_results / bets");
  }
});

export type { PostedDraw } from "@/lib/lottery-draws-server";
export { listPublicDraws } from "@/lib/lottery-draws-server";

export const settleDueBets = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await syncClosedLotteryRounds();
    const sql = await getSql();
    const pending = await sql<{
      id: string;
      kind: "lottery" | "football" | "slot" | "mini";
      payload: BetPayload | string;
      stake: string | number;
    }>`select id, kind, payload, stake from bets where user_id = ${context.userId} and status = 'pending'`;
    const now = new Date();
    for (const row of pending) {
      const payload = typeof row.payload === "string" ? (JSON.parse(row.payload) as BetPayload) : row.payload;
      const stake = money(row.stake);
      let status: BetView["status"] | null = null;
      let payout = 0;
      if (row.kind === "lottery") {
        const marketId = String(payload.marketId) as MarketId;
        const roundKey = String(payload.roundKey);
        const posted = await postedDraw(roundKey);
        const st = getMarketState(marketId, now);
        const result =
          posted ??
          (st.roundKey === roundKey && st.result
            ? st.result
            : st.previous?.roundKey === roundKey
              ? st.previous.result
              : undefined);
        if (!result) continue;
        const win = lotteryWins(payload.play as PlayType, String(payload.number), result);
        status = win ? "won" : "lost";
        payout = win ? Math.floor(stake * Number(payload.rate)) : 0;
      } else if (row.kind === "football") {
        const match = await liveMatch(String(payload.matchId ?? ""));
        const mark = footballMark(payload, match);
        if (!mark) continue;
        payout = payoutFor(mark, stake, Number(payload.odds));
        status = mark === "win" || mark === "halfwin" ? "won" : mark === "push" || mark === "halflose" ? "push" : "lost";
      } else {
        continue;
      }
      const txId = nid("tx");
      await sql.query(
        `with updated as (
           update bets
           set status = $1, payout = $2::numeric
           where id = $3 and user_id = $4 and status = 'pending'
           returning id, payout
         ),
         credited as (
           update wallets w
           set balance = w.balance + u.payout
           from updated u
           where w.user_id = $4 and u.payout > 0
         )
         insert into transactions (id, user_id, type, amount, status, note)
         select $5, $4, 'payout', u.payout, 'approved', $6
         from updated u
         where u.payout > 0`,
        [status, payout, row.id, context.userId, txId, `จ่ายรางวัล ${row.id}`],
      );
    }
    return loadAccount(context.userId);
  });
