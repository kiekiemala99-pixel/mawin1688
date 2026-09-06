import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql, withTransaction } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { publicError } from "@/lib/server-log";

export type WheelSegment = {
  id: string;
  label: string;
  amount: number;
  weight: number;
  color: string;
  sortOrder: number;
  enabled: boolean;
};

export type CouponView = {
  id: string;
  code: string;
  amount: number;
  spins: number;
  maxClaims: number;
  claimed: number;
  expiresAt: number | null;
  enabled: boolean;
  note: string;
};

export type WheelSpinView = {
  id: string;
  label: string;
  amount: number;
  createdAt: number;
  username?: string;
  phone?: string;
};

export type WheelState = {
  enabled: boolean;
  title: string;
  remaining: number;
  segments: WheelSegment[];
  history: WheelSpinView[];
};

function nid(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function num(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function money(v: unknown) {
  return Math.round(num(v) * 100) / 100;
}

async function requireStaff(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ is_staff: boolean }>`select is_staff from wallets where user_id = ${userId}`;
  if (!rows[0]?.is_staff) throw new Error("เฉพาะเจ้าหน้าที่");
}

function mapSeg(r: {
  id: string;
  label: string;
  amount: string | number;
  weight: string | number;
  color: string;
  sort_order: number;
  enabled: boolean;
}): WheelSegment {
  return {
    id: r.id,
    label: r.label,
    amount: money(r.amount),
    weight: Math.max(0, Math.round(num(r.weight))),
    color: r.color,
    sortOrder: r.sort_order,
    enabled: Boolean(r.enabled),
  };
}

function pickWeighted(segs: WheelSegment[]) {
  const live = segs.filter((s) => s.enabled && s.weight > 0);
  if (live.length === 0) throw new Error("วงล้อยังไม่มีช่องรางวัล");
  const total = live.reduce((s, x) => s + x.weight, 0);
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  let r = buf[0] % total;
  for (const s of live) {
    if (r < s.weight) return s;
    r -= s.weight;
  }
  return live[live.length - 1];
}

async function remainingOf(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ n: number }>`
    select coalesce(sum(remaining), 0)::int as n from coupon_claims where user_id = ${userId}
  `;
  return rows[0]?.n ?? 0;
}

async function loadWheelState(userId: string): Promise<WheelState> {
  const sql = await getSql();
  const settings = await sql<{ enabled: boolean; title: string }>`
    select enabled, title from wheel_settings where id = 'main' limit 1
  `;
  const segs = await sql<{
    id: string;
    label: string;
    amount: string | number;
    weight: string | number;
    color: string;
    sort_order: number;
    enabled: boolean;
  }>`select id, label, amount, weight, color, sort_order, enabled from wheel_segments order by sort_order`;
  const history = await sql<{
    id: string;
    label: string;
    amount: string | number;
    created_at: string;
  }>`
    select id, label, amount, created_at
    from wheel_spins
    where user_id = ${userId}
    order by created_at desc
    limit 12
  `;
  return {
    enabled: settings[0]?.enabled ?? true,
    title: settings[0]?.title ?? "กงล้อมาวิน1688",
    remaining: await remainingOf(userId),
    segments: segs.map(mapSeg),
    history: history.map((h) => ({
      id: h.id,
      label: h.label,
      amount: money(h.amount),
      createdAt: new Date(h.created_at).getTime(),
    })),
  };
}

export const getWheelState = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<WheelState> => {
    try {
      return loadWheelState(context.userId);
    } catch (err) {
      throw publicError("getWheelState", err, "โหลดกงล้อไม่สำเร็จ");
    }
  });

export const redeemCoupon = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: unknown) => z.object({ code: z.string().trim().min(3).max(24) }).parse(v))
  .handler(async ({ context, data }): Promise<{ amount: number; balance: number; code: string }> => {
    const code = data.code.trim().toUpperCase();
    try {
      let out: { amount: number; balance: number; code: string } | null = null;
      await withTransaction(async (tx) => {
        const coupon = await tx.query<{
          id: string;
          amount: string | number;
          max_claims: number;
          claimed: number;
          expires_at: string | null;
          enabled: boolean;
        }>(
          `select id, amount, max_claims, claimed, expires_at, enabled from coupons where code = $1 for update`,
          [code],
        );
        const row = coupon[0];
        if (!row || !row.enabled) throw new Error("ไม่พบคูปองนี้ หรือถูกปิดใช้งาน");
        const amount = money(row.amount);
        if (amount < 1) throw new Error("คูปองนี้ยังไม่ได้ตั้งยอดเครดิต");
        if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) throw new Error("คูปองหมดอายุแล้ว");
        if (row.max_claims > 0 && row.claimed >= row.max_claims) throw new Error("คูปองนี้ถูกใช้ครบจำนวนแล้ว");
        const exists = await tx.query<{ id: string }>(
          `select id from coupon_claims where coupon_id = $1 and user_id = $2`,
          [row.id, context.userId],
        );
        if (exists[0]) throw new Error("คุณใช้คูปองนี้ไปแล้ว");
        const wallet = await tx.query<{ balance: string | number }>(
          `select balance from wallets where user_id = $1 for update`,
          [context.userId],
        );
        if (!wallet[0]) throw new Error("ไม่พบกระเป๋า");
        await tx.query(
          `insert into coupon_claims (id, coupon_id, user_id, remaining) values ($1, $2, $3, 0)`,
          [nid("clm"), row.id, context.userId],
        );
        await tx.query(`update coupons set claimed = claimed + 1 where id = $1`, [row.id]);
        const upd = await tx.query<{ balance: string | number }>(
          `update wallets set balance = balance + $1::numeric where user_id = $2 returning balance`,
          [amount, context.userId],
        );
        await tx.query(
          `insert into transactions (id, user_id, type, amount, status, note)
           values ($1, $2, 'adjust', $3::numeric, 'approved', $4)`,
          [nid("tx"), context.userId, amount, `คูปอง ${code}`],
        );
        out = { amount, balance: money(upd[0]?.balance), code };
      });
      if (!out) throw new Error("ใช้คูปองไม่สำเร็จ");
      return out;
    } catch (err) {
      if (err instanceof Error && /คูปอง|หมดอายุ|ใช้คูปอง|กระเป๋า|เครดิต/.test(err.message)) throw err;
      throw publicError("redeemCoupon", err, "ใช้คูปองไม่สำเร็จ");
    }
  });

export const spinLuckyWheel = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ spin: WheelSpinView; remaining: number; balance: number; index: number }> => {
    try {
      let result: { spin: WheelSpinView; remaining: number; balance: number; index: number } | null = null;
      await withTransaction(async (tx) => {
        const settings = await tx.query<{ enabled: boolean }>(`select enabled from wheel_settings where id = 'main' for update`);
        if (!settings[0]?.enabled) throw new Error("กงล้อปิดชั่วคราว");
        const claim = await tx.query<{ id: string; remaining: number; coupon_id: string }>(
          `select id, remaining, coupon_id from coupon_claims
           where user_id = $1 and remaining > 0
           order by created_at asc
           limit 1 for update`,
          [context.userId],
        );
        if (!claim[0]) throw new Error("ไม่มีสิทธิ์หมุน · กรอกคูปองก่อน");
        const segs = await tx.query<{
          id: string;
          label: string;
          amount: string | number;
          weight: string | number;
          color: string;
          sort_order: number;
          enabled: boolean;
        }>(`select id, label, amount, weight, color, sort_order, enabled from wheel_segments order by sort_order`);
        const mapped = segs.map(mapSeg);
        const live = mapped.filter((s) => s.enabled && s.weight > 0);
        const hit = pickWeighted(mapped);
        const index = live.findIndex((s) => s.id === hit.id);
        const cut = await tx.query(
          `update coupon_claims set remaining = remaining - 1
           where id = $1 and remaining > 0 returning remaining`,
          [claim[0].id],
        );
        if (cut.length === 0) throw new Error("ไม่มีสิทธิ์หมุน · กรอกคูปองก่อน");
        const spinId = nid("whl");
        const amount = money(hit.amount);
        await tx.query(
          `insert into wheel_spins (id, user_id, coupon_id, segment_id, label, amount)
           values ($1, $2, $3, $4, $5, $6::numeric)`,
          [spinId, context.userId, claim[0].coupon_id, hit.id, hit.label, amount],
        );
        if (amount > 0) {
          await tx.query(`update wallets set balance = balance + $1::numeric where user_id = $2`, [
            amount,
            context.userId,
          ]);
          await tx.query(
            `insert into transactions (id, user_id, type, amount, status, note)
             values ($1, $2, 'payout', $3::numeric, 'approved', $4)`,
            [nid("tx"), context.userId, amount, `กงล้อ ${hit.label}`],
          );
        }
        const left = await tx.query<{ n: number }>(
          `select coalesce(sum(remaining), 0)::int as n from coupon_claims where user_id = $1`,
          [context.userId],
        );
        const wallet = await tx.query<{ balance: string | number }>(
          `select balance from wallets where user_id = $1`,
          [context.userId],
        );
        result = {
          spin: { id: spinId, label: hit.label, amount, createdAt: Date.now() },
          remaining: left[0]?.n ?? 0,
          balance: money(wallet[0]?.balance),
          index: index < 0 ? 0 : index,
        };
      });
      if (!result) throw new Error("หมุนไม่สำเร็จ");
      return result;
    } catch (err) {
      if (err instanceof Error && /กงล้อ|สิทธิ์|คูปอง|ช่องรางวัล/.test(err.message)) throw err;
      throw publicError("spinLuckyWheel", err, "หมุนกงล้อไม่สำเร็จ");
    }
  });

export const listStaffCoupons = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ coupons: CouponView[]; settings: { enabled: boolean; title: string }; segments: WheelSegment[]; history: WheelSpinView[] }> => {
    await requireStaff(context.userId);
    try {
      const sql = await getSql();
      await sql.query(`alter table coupons add column if not exists amount numeric(14, 2) not null default 0`);
      const coupons = await sql<{
        id: string;
        code: string;
        spins: number;
        amount: string | number;
        max_claims: number;
        claimed: number;
        expires_at: string | null;
        enabled: boolean;
        note: string;
      }>`select id, code, spins, amount, max_claims, claimed, expires_at, enabled, note from coupons order by created_at desc`;
      const history = await sql<{
        id: string;
        label: string;
        amount: string | number;
        created_at: string;
        username: string;
        phone: string;
      }>`
        select c.id, p.code as label, p.amount, c.created_at, w.username, w.phone
        from coupon_claims c
        join coupons p on p.id = c.coupon_id
        join wallets w on w.user_id = c.user_id
        order by c.created_at desc
        limit 40
      `;
      return {
        coupons: coupons.map((c) => ({
          id: c.id,
          code: c.code,
          amount: money(c.amount),
          spins: c.spins,
          maxClaims: c.max_claims,
          claimed: c.claimed,
          expiresAt: c.expires_at ? new Date(c.expires_at).getTime() : null,
          enabled: Boolean(c.enabled),
          note: c.note,
        })),
        settings: { enabled: true, title: "คูปองเครดิต" },
        segments: [],
        history: history.map((h) => ({
          id: h.id,
          label: h.label,
          amount: money(h.amount),
          createdAt: new Date(h.created_at).getTime(),
          username: h.username,
          phone: h.phone,
        })),
      };
    } catch (err) {
      throw publicError("listStaffCoupons", err, "โหลดคูปองไม่สำเร็จ");
    }
  });

export const saveCoupon = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: unknown) =>
    z
      .object({
        id: z.string().optional(),
        code: z.string().trim().min(3).max(24),
        amount: z.number().min(1).max(100000),
        maxClaims: z.number().int().min(0).max(100000),
        expiresAt: z.number().nullable().optional(),
        enabled: z.boolean(),
        note: z.string().max(120),
      })
      .parse(v),
  )
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    const code = data.code.trim().toUpperCase();
    try {
      const sql = await getSql();
      if (data.id) {
        await sql.query(
          `update coupons set code = $2, amount = $3::numeric, max_claims = $4, expires_at = $5, enabled = $6, note = $7
           where id = $1`,
          [data.id, code, data.amount, data.maxClaims, data.expiresAt ? new Date(data.expiresAt).toISOString() : null, data.enabled, data.note],
        );
      } else {
        await sql.query(
          `insert into coupons (id, code, spins, amount, max_claims, expires_at, enabled, note)
           values ($1, $2, 1, $3::numeric, $4, $5, $6, $7)`,
          [nid("cpn"), code, data.amount, data.maxClaims, data.expiresAt ? new Date(data.expiresAt).toISOString() : null, data.enabled, data.note],
        );
      }
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (/unique|duplicate/i.test(msg)) throw new Error("โค้ดคูปองนี้มีอยู่แล้ว");
      throw publicError("saveCoupon", err, "บันทึกคูปองไม่สำเร็จ");
    }
  });

export const deleteCoupon = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: unknown) => z.object({ id: z.string().min(3) }).parse(v))
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    const sql = await getSql();
    await sql.query(`delete from coupons where id = $1`, [data.id]);
    return { ok: true };
  });

export const saveWheelSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: unknown) =>
    z
      .object({
        enabled: z.boolean(),
        title: z.string().min(2).max(40),
        segments: z.array(
          z.object({
            id: z.string().min(1),
            label: z.string().min(1).max(24),
            amount: z.number().min(0).max(100000),
            weight: z.number().int().min(0).max(1000),
            color: z.string().min(4).max(20),
            enabled: z.boolean(),
          }),
        ).min(3).max(12),
      })
      .parse(v),
  )
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    try {
      const sql = await getSql();
      await sql.query(`update wheel_settings set enabled = $1, title = $2, updated_at = now() where id = 'main'`, [
        data.enabled,
        data.title,
      ]);
      let i = 0;
      for (const s of data.segments) {
        await sql.query(
          `insert into wheel_segments (id, label, amount, weight, color, sort_order, enabled)
           values ($1, $2, $3::numeric, $4, $5, $6, $7)
           on conflict (id) do update set label = excluded.label, amount = excluded.amount,
             weight = excluded.weight, color = excluded.color, sort_order = excluded.sort_order, enabled = excluded.enabled`,
          [s.id, s.label, s.amount, s.weight, s.color, i, s.enabled],
        );
        i += 1;
      }
      return { ok: true };
    } catch (err) {
      throw publicError("saveWheelSettings", err, "บันทึกกงล้อไม่สำเร็จ");
    }
  });
