import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql, withTransaction } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { bangkokParts } from "@/lib/time";
import { logServerError, publicError } from "@/lib/server-log";

export const PROMO_KINDS = [
  { id: "welcome", label: "ต้อนรับสมาชิกใหม่" },
  { id: "deposit", label: "โบนัสฝาก" },
  { id: "daily_first", label: "ฝากแรกของวัน" },
  { id: "cashback", label: "คืนยอดเสีย" },
  { id: "timed", label: "โบนัสตามช่วงเวลา" },
] as const;

export type PromoKind = (typeof PROMO_KINDS)[number]["id"];
export type BonusType = "fixed" | "percent";
export type ClaimStatus = "none" | "pending" | "approved" | "rejected";

export type PromoRecord = {
  id: string;
  title: string;
  subtitle: string;
  kind: PromoKind;
  bonusType: BonusType;
  bonusPercent: number;
  bonusAmount: number;
  minDeposit: number;
  turnoverX: number;
  maxBonus: number;
  startsAt: number | null;
  endsAt: number | null;
  rules: string;
  enabled: boolean;
  updatedAt: number;
};

export type PromoView = PromoRecord & {
  status: ClaimStatus;
  claimedAt: number | null;
  estimatedBonus: number;
  estimatedTurnover: number;
};

export type StaffPromoItem = {
  id: string;
  userId: string;
  username: string;
  phone: string;
  promoId: string;
  title: string;
  amount: number;
  minDeposit: number;
  depositApproved: number;
  turnoverX: number;
  createdAt: number;
};

function nid(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function money(v: unknown) {
  return Number(v ?? 0);
}

function num(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function kindLabel(kind: string) {
  return PROMO_KINDS.find((k) => k.id === kind)?.label ?? kind;
}

async function requireStaff(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ is_staff: boolean }>`select is_staff from wallets where user_id = ${userId}`;
  if (!rows[0]?.is_staff) throw new Error("เฉพาะเจ้าหน้าที่");
}

function mapPromo(r: {
  id: string;
  title: string;
  subtitle: string;
  kind: string;
  bonus_type: string;
  bonus_percent: string | number;
  bonus_amount: string | number;
  min_deposit: string | number;
  turnover_x: string | number;
  max_bonus: string | number;
  starts_at: string | null;
  ends_at: string | null;
  rules: string;
  enabled: boolean;
  updated_at: string;
}): PromoRecord {
  return {
    id: r.id,
    title: r.title,
    subtitle: r.subtitle ?? "",
    kind: r.kind as PromoKind,
    bonusType: r.bonus_type as BonusType,
    bonusPercent: num(r.bonus_percent),
    bonusAmount: num(r.bonus_amount),
    minDeposit: num(r.min_deposit),
    turnoverX: num(r.turnover_x),
    maxBonus: num(r.max_bonus),
    startsAt: r.starts_at ? new Date(r.starts_at).getTime() : null,
    endsAt: r.ends_at ? new Date(r.ends_at).getTime() : null,
    rules: r.rules ?? "",
    enabled: Boolean(r.enabled),
    updatedAt: new Date(r.updated_at).getTime(),
  };
}

function windowOk(p: PromoRecord, now = Date.now()) {
  if (p.startsAt && now < p.startsAt) return false;
  if (p.endsAt && now > p.endsAt) return false;
  return true;
}

function capBonus(p: PromoRecord, raw: number) {
  const v = Math.round(Math.max(0, raw) * 100) / 100;
  if (p.maxBonus > 0) return Math.min(v, p.maxBonus);
  return v;
}

function estimateBonus(p: PromoRecord, deposit: number, loss: number) {
  if (p.bonusType === "percent") {
    const base = p.kind === "cashback" ? loss : deposit;
    return capBonus(p, (base * p.bonusPercent) / 100);
  }
  return capBonus(p, p.bonusAmount);
}

/** ยอดเงินที่ใช้คูณเทิร์น = ฝาก+โบนัส (โปรฝาก) หรือโบนัสอย่างเดียว (ต้อนรับ/คืนยอดเสีย) */
export function creditTurnoverBase(kind: PromoKind, deposit: number, bonus: number) {
  const bonusR = Math.round(Math.max(0, bonus) * 100) / 100;
  if (kind === "deposit" || kind === "daily_first" || kind === "timed") {
    return Math.round((Math.max(0, deposit) + bonusR) * 100) / 100;
  }
  return bonusR;
}

export function turnoverNeedOf(base: number, x: number) {
  return Math.round(Math.max(0, base) * Math.max(0, x) * 100) / 100;
}

export type TurnoverSnap = { need: number; done: number; remain: number };

export async function remainingTurnover(userId: string) {
  const snap = await turnoverSnapshot(userId);
  return snap.remain;
}

/** นับยอดเครดิตที่ถูกหักไปเล่นหลังอนุมัติโปร ไม่สนผลได้เสีย */
export async function turnoverSnapshot(userId: string): Promise<TurnoverSnap> {
  const empty = { need: 0, done: 0, remain: 0 };
  try {
    const sql = await getSql();
    const rows = await sql<{ need: string | number; since: string | null }>`
      select coalesce(sum(turnover_need), 0) as need,
             min(coalesce(reviewed_at, created_at)) as since
      from promo_claims
      where user_id = ${userId} and status = 'approved' and turnover_need > 0
    `;
    const need = Math.round(money(rows[0]?.need) * 100) / 100;
    if (need <= 0) return empty;
    const since = rows[0]?.since;
    const played = since
      ? await sql<{ s: string | number }>`
          select coalesce(sum(amount), 0) as s
          from transactions
          where user_id = ${userId}
            and type = 'bet'
            and status = 'approved'
            and created_at >= ${since}::timestamptz
        `
      : [{ s: 0 }];
    const done = Math.min(need, Math.round(money(played[0]?.s) * 100) / 100);
    return { need, done, remain: Math.max(0, Math.round((need - done) * 100) / 100) };
  } catch (err) {
    logServerError("turnoverSnapshot", err);
    return empty;
  }
}

const promoBody = z.object({
  id: z.string().trim().optional(),
  title: z.string().trim().min(2).max(80),
  subtitle: z.string().trim().max(80).optional().default(""),
  kind: z.enum(["welcome", "deposit", "daily_first", "cashback", "timed"]),
  bonusType: z.enum(["fixed", "percent"]),
  bonusPercent: z.number().min(0).max(1000),
  bonusAmount: z.number().min(0).max(1_000_000),
  minDeposit: z.number().min(0).max(1_000_000),
  turnoverX: z.number().min(0).max(100),
  maxBonus: z.number().min(0).max(1_000_000),
  startsAt: z.number().nullable().optional(),
  endsAt: z.number().nullable().optional(),
  rules: z.string().trim().max(400).optional().default(""),
  enabled: z.boolean(),
});

export async function loadPromoCatalog(): Promise<PromoRecord[]> {
  const sql = await getSql();
  const rows = await sql<Parameters<typeof mapPromo>[0]>`
    select id, title, subtitle, kind, bonus_type, bonus_percent, bonus_amount, min_deposit,
           turnover_x, max_bonus, starts_at, ends_at, rules, enabled, updated_at
    from promotions
    order by updated_at desc
  `;
  return rows.map(mapPromo);
}

export const listCatalog = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<PromoRecord[]> => {
    await requireStaff(context.userId);
    return loadPromoCatalog();
  });

export const savePromo = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: unknown) => promoBody.parse(v))
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    const id = data.id?.trim() || nid("prm");
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
         title = excluded.title,
         subtitle = excluded.subtitle,
         kind = excluded.kind,
         bonus_type = excluded.bonus_type,
         bonus_percent = excluded.bonus_percent,
         bonus_amount = excluded.bonus_amount,
         min_deposit = excluded.min_deposit,
         turnover_x = excluded.turnover_x,
         max_bonus = excluded.max_bonus,
         starts_at = excluded.starts_at,
         ends_at = excluded.ends_at,
         rules = excluded.rules,
         enabled = excluded.enabled,
         updated_at = now()`,
      [
        id,
        data.title,
        data.subtitle ?? "",
        data.kind,
        data.bonusType,
        data.bonusPercent,
        data.bonusAmount,
        data.minDeposit,
        data.turnoverX,
        data.maxBonus,
        data.startsAt ?? 0,
        data.endsAt ?? 0,
        data.rules ?? "",
        data.enabled,
      ],
    );
    return { id };
  });

export const togglePromo = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: unknown) => z.object({ id: z.string().min(2), enabled: z.boolean() }).parse(v))
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    const sql = await getSql();
    await sql.query(`update promotions set enabled = $2, updated_at = now() where id = $1`, [data.id, data.enabled]);
    return { ok: true as const };
  });

export const deletePromo = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: unknown) => z.object({ id: z.string().min(2) }).parse(v))
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    const sql = await getSql();
    const pending = await sql<{ c: number }>`
      select count(*)::int as c from promo_claims where promo_code = ${data.id} and status = 'pending'
    `;
    if ((pending[0]?.c ?? 0) > 0) throw new Error("มีสมาชิกกดรับโปรนี้รอตรวจอยู่ ปิดการใช้งานแทนการลบ");
    await sql.query(`delete from promotions where id = $1`, [data.id]);
    return { ok: true as const };
  });

export const listMyPromos = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<PromoView[]> => {
    try {
      const sql = await getSql();
      const promos = await sql<Parameters<typeof mapPromo>[0]>`
        select id, title, subtitle, kind, bonus_type, bonus_percent, bonus_amount, min_deposit,
               turnover_x, max_bonus, starts_at, ends_at, rules, enabled, updated_at
        from promotions
        where enabled = true
        order by updated_at desc
      `;
      const claims = await sql<{ promo_code: string; status: string; created_at: string }>`
        select promo_code, status, created_at
        from promo_claims where user_id = ${context.userId}
        order by created_at desc
      `;
      const dep = await sql<{ s: string | number }>`
        select coalesce(sum(amount), 0) as s from transactions
        where user_id = ${context.userId} and type = 'deposit' and status = 'approved'
      `;
      const today = bangkokParts(new Date()).dateKey;
      const depToday = await sql<{ s: string | number }>`
        select coalesce(sum(amount), 0) as s from transactions
        where user_id = ${context.userId} and type = 'deposit' and status = 'approved'
          and created_at::date = ${today}::date
      `;
      const lost = await sql<{ s: string | number }>`
        select coalesce(sum(stake - payout), 0) as s from bets
        where user_id = ${context.userId} and status = 'lost'
      `;
      const deposit = money(dep[0]?.s);
      const loss = Math.max(0, money(lost[0]?.s));
      const now = Date.now();
      return promos.map(mapPromo).filter((p) => windowOk(p, now)).map((p) => {
        const hit = claims.find((c) => c.promo_code === p.id && c.status !== "rejected");
        const dailyHit =
          p.kind === "daily_first"
            ? claims.find((c) => {
                if (c.promo_code !== p.id || c.status === "rejected") return false;
                return bangkokParts(new Date(c.created_at)).dateKey === today;
              })
            : hit;
        const status = ((p.kind === "daily_first" ? dailyHit : hit)?.status as ClaimStatus | undefined) ?? "none";
        const base = p.kind === "daily_first" ? money(depToday[0]?.s) : deposit;
        const estimatedBonus = estimateBonus(p, base, loss);
        return {
          ...p,
          status,
          claimedAt: hit ? new Date(hit.created_at).getTime() : null,
          estimatedBonus,
          estimatedTurnover: turnoverNeedOf(creditTurnoverBase(p.kind, base, estimatedBonus), p.turnoverX),
        };
      });
    } catch (err) {
      logServerError("listMyPromos", err);
      return [];
    }
  });

export const claimPromo = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: unknown) => z.object({ id: z.string().min(2) }).parse(v))
  .handler(async ({ context, data }) => {
    try {
      const sql = await getSql();
      const rows = await sql<Parameters<typeof mapPromo>[0]>`
        select id, title, subtitle, kind, bonus_type, bonus_percent, bonus_amount, min_deposit,
               turnover_x, max_bonus, starts_at, ends_at, rules, enabled, updated_at
        from promotions where id = ${data.id}
      `;
      const promo = rows[0] ? mapPromo(rows[0]) : null;
      if (!promo || !promo.enabled) throw new Error("โปรโมชันนี้ปิดใช้งานแล้ว");
      if (!windowOk(promo)) throw new Error("โปรโมชันนี้ยังไม่ถึงเวลาหรือหมดเขตแล้ว");

      const today = bangkokParts(new Date()).dateKey;
      const open = await sql<{ id: string; created_at: string; status: string }>`
        select id, created_at, status from promo_claims
        where user_id = ${context.userId} and promo_code = ${data.id} and status in ('pending', 'approved')
      `;
      if (promo.kind === "daily_first") {
        if (open.some((c) => bangkokParts(new Date(c.created_at)).dateKey === today)) {
          throw new Error("วันนี้รับโปรฝากแรกไปแล้ว");
        }
      } else if (open.length > 0) {
        throw new Error("คุณกดรับโปรนี้ไปแล้ว รอแอดมินตรวจสอบ");
      }

      const dep = await sql<{ s: string | number }>`
        select coalesce(sum(amount), 0) as s from transactions
        where user_id = ${context.userId} and type = 'deposit' and status = 'approved'
      `;
      const depToday = await sql<{ s: string | number }>`
        select coalesce(sum(amount), 0) as s from transactions
        where user_id = ${context.userId} and type = 'deposit' and status = 'approved'
          and created_at::date = ${today}::date
      `;
      const lost = await sql<{ s: string | number }>`
        select coalesce(sum(stake - payout), 0) as s from bets
        where user_id = ${context.userId} and status = 'lost'
      `;
      const deposit = promo.kind === "daily_first" ? money(depToday[0]?.s) : money(dep[0]?.s);
      if ((promo.kind === "deposit" || promo.kind === "daily_first" || promo.kind === "timed") && deposit < promo.minDeposit) {
        throw new Error(`ต้องมียอดฝากที่อนุมัติอย่างน้อย ${promo.minDeposit} บาท`);
      }
      const bonus = estimateBonus(promo, deposit, Math.max(0, money(lost[0]?.s)));
      if (bonus <= 0) throw new Error("ยังไม่มีโบนัสให้รับตามเงื่อนไขนี้");
      const turnoverBase = creditTurnoverBase(promo.kind, deposit, bonus);
      const turnoverNeed = turnoverNeedOf(turnoverBase, promo.turnoverX);
      await sql.query(
        `insert into promo_claims (id, user_id, promo_code, amount, status, note, turnover_need, turnover_base)
         values ($1, $2, $3, $4::numeric, 'pending', $5, $6::numeric, $7::numeric)`,
        [nid("promo"), context.userId, promo.id, bonus, `แจ้งรับโปร ${promo.title}`, turnoverNeed, turnoverBase],
      );
      return { ok: true as const };
    } catch (err) {
      if (err instanceof Error && /กดรับโปร|ปิดใช้งาน|หมดเขต|ยอดฝาก|โบนัส|วันนี้รับ/.test(err.message)) throw err;
      throw publicError("claimPromo", err, "แจ้งรับโปรไม่สำเร็จ");
    }
  });

export async function loadPromoQueue(): Promise<StaffPromoItem[]> {
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    user_id: string;
    username: string;
    phone: string;
    promo_code: string;
    title: string;
    amount: string | number;
    min_deposit: string | number;
    turnover_x: string | number;
    created_at: string;
    deposit_approved: string | number;
  }>`
    select c.id, c.user_id, w.username, w.phone, c.promo_code, c.amount, c.created_at,
           coalesce(p.title, c.note) as title,
           coalesce(p.min_deposit, 0) as min_deposit,
           coalesce(p.turnover_x, 0) as turnover_x,
           coalesce((
             select sum(t.amount) from transactions t
             where t.user_id = c.user_id and t.type = 'deposit' and t.status = 'approved'
           ), 0) as deposit_approved
    from promo_claims c
    join wallets w on w.user_id = c.user_id
    left join promotions p on p.id = c.promo_code
    where c.status = 'pending'
    order by c.created_at asc
  `;
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    username: r.username,
    phone: r.phone,
    promoId: r.promo_code,
    title: r.title,
    amount: money(r.amount),
    minDeposit: money(r.min_deposit),
    depositApproved: money(r.deposit_approved),
    turnoverX: money(r.turnover_x),
    createdAt: new Date(r.created_at).getTime(),
  }));
}

export const listStaffPromos = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<StaffPromoItem[]> => {
    await requireStaff(context.userId);
    try {
      return await loadPromoQueue();
    } catch (err) {
      throw publicError("listStaffPromos", err, "โหลดคิวโปรโมชันไม่สำเร็จ");
    }
  });

export const reviewPromo = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: unknown) => z.object({ id: z.string().min(4), action: z.enum(["approve", "reject"]) }).parse(v))
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    try {
      await withTransaction(async (sql) => {
        const rows = await sql.query<{
          id: string;
          user_id: string;
          promo_code: string;
          amount: string | number;
          status: string;
          note: string;
        }>(`select id, user_id, promo_code, amount, status, note from promo_claims where id = $1 for update`, [data.id]);
        const row = rows[0];
        if (!row) throw new Error("ไม่พบรายการ");
        if (row.status !== "pending") throw new Error("รายการนี้ดำเนินการแล้ว");

        if (data.action === "reject") {
          await sql.query(
            `update promo_claims set status = 'rejected', reviewed_at = now(), reviewed_by = $2 where id = $1`,
            [row.id, context.userId],
          );
          return;
        }

        const amount = money(row.amount);
        const locked = await sql.query<{ balance: string | number }>(
          `select balance from wallets where user_id = $1 for update`,
          [row.user_id],
        );
        if (!locked[0]) throw new Error("ไม่พบบัญชีกระเป๋า");
        await sql.query(`update wallets set balance = balance + $1::numeric where user_id = $2`, [amount, row.user_id]);
        await sql.query(
          `insert into transactions (id, user_id, type, amount, status, note)
           values ($1, $2, 'payout', $3::numeric, 'approved', $4)`,
          [nid("tx"), row.user_id, amount, row.note || `โบนัสโปร ${row.promo_code}`],
        );
        await sql.query(
          `update promo_claims set status = 'approved', reviewed_at = now(), reviewed_by = $2 where id = $1`,
          [row.id, context.userId],
        );
      });
      return { ok: true as const };
    } catch (err) {
      if (err instanceof Error && /ไม่พบ|ดำเนินการแล้ว/.test(err.message)) throw err;
      throw publicError("reviewPromo", err, "อนุมัติโปรไม่สำเร็จ");
    }
  });
