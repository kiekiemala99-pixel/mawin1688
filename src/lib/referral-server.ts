import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql, withTransaction } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { logServerError } from "@/lib/server-log";

export type ReferralSettings = {
  percent: number;
  enabled: boolean;
  minDeposit: number;
};

export type ReferralInvite = {
  username: string;
  phone: string;
  createdAt: number;
  deposits: number;
  earned: number;
};

export type ReferralReward = {
  id: string;
  referred: string;
  amount: number;
  percent: number;
  createdAt: number;
};

export type ReferralBoard = {
  code: string;
  percent: number;
  enabled: boolean;
  invited: number;
  earned: number;
  invites: ReferralInvite[];
  rewards: ReferralReward[];
};

function money(v: unknown) {
  return Math.round(Number(v ?? 0) * 100) / 100;
}

function nid() {
  return `ref_${crypto.randomUUID()}`;
}

export async function getReferralSettings(): Promise<ReferralSettings> {
  const sql = await getSql();
  const rows = await sql<{ percent: string | number; enabled: boolean; min_deposit: string | number }>`
    select percent, enabled, min_deposit from referral_settings where id = 'main' limit 1
  `;
  const row = rows[0];
  return {
    percent: money(row?.percent ?? 35),
    enabled: row?.enabled !== false,
    minDeposit: money(row?.min_deposit ?? 1),
  };
}

export async function payReferralCommission(referredId: string, depositId: string, depositAmount: number) {
  try {
    const amount = money(depositAmount);
    if (!referredId || !depositId || amount <= 0) return;
    const settings = await getReferralSettings();
    if (!settings.enabled || settings.percent <= 0 || amount < settings.minDeposit) return;
    const sql = await getSql();
    const wallets = await sql<{ referrer_id: string | null }>`
      select referrer_id from wallets where user_id = ${referredId} limit 1
    `;
    const referrerId = wallets[0]?.referrer_id;
    if (!referrerId || referrerId === referredId) return;
    const exists = await sql<{ id: string }>`select id from referral_rewards where deposit_id = ${depositId} limit 1`;
    if (exists[0]) return;
    const commission = money((amount * settings.percent) / 100);
    if (commission < 0.01) return;
    await withTransaction(async (tx) => {
      const inserted = await tx.query<{ id: string }>(
        `insert into referral_rewards (id, referrer_id, referred_id, deposit_id, amount, percent)
         values ($1, $2, $3, $4, $5::numeric, $6::numeric)
         on conflict (deposit_id) do nothing
         returning id`,
        [nid(), referrerId, referredId, depositId, commission, settings.percent],
      );
      if (!inserted[0]) return;
      await tx.query(`update wallets set balance = balance + $1::numeric where user_id = $2`, [commission, referrerId]);
      await tx.query(
        `insert into transactions (id, user_id, type, amount, status, note)
         values ($1, $2, 'payout', $3::numeric, 'approved', $4)`,
        [`tx_${crypto.randomUUID()}`, referrerId, commission, `ค่าแนะนำเพื่อน ${settings.percent}%`],
      );
    });
  } catch (err) {
    logServerError("payReferralCommission", err);
  }
}

export async function resolveReferrerId(code: string | undefined, username: string) {
  const clean = String(code ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (!clean || clean === username.toLowerCase()) return null;
  const sql = await getSql();
  const rows = await sql<{ user_id: string }>`
    select user_id from wallets where ref_code = ${clean} or username = ${clean} limit 1
  `;
  return rows[0]?.user_id ?? null;
}

export const loadMyReferral = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<ReferralBoard> => {
    const sql = await getSql();
    const settings = await getReferralSettings();
    const me = await sql<{ ref_code: string | null; username: string }>`
      select ref_code, username from wallets where user_id = ${context.userId} limit 1
    `;
    let code = (me[0]?.ref_code || me[0]?.username || "").toLowerCase();
    if (me[0] && !me[0].ref_code && me[0].username) {
      await sql.query(`update wallets set ref_code = $1 where user_id = $2 and (ref_code is null or ref_code = '')`, [
        me[0].username.toLowerCase(),
        context.userId,
      ]);
      code = me[0].username.toLowerCase();
    }
    const invites = await sql<{
      username: string;
      phone: string;
      created_at: string;
      deposits: string | number;
      earned: string | number;
    }>`
      select w.username, w.phone, w.created_at,
             coalesce((select count(*) from transactions t where t.user_id = w.user_id and t.type = 'deposit' and t.status = 'approved'), 0) as deposits,
             coalesce((select sum(r.amount) from referral_rewards r where r.referred_id = w.user_id and r.referrer_id = ${context.userId}), 0) as earned
      from wallets w
      where w.referrer_id = ${context.userId}
      order by w.created_at desc
      limit 40
    `;
    const rewards = await sql<{
      id: string;
      referred: string;
      amount: string | number;
      percent: string | number;
      created_at: string;
    }>`
      select r.id, w.username as referred, r.amount, r.percent, r.created_at
      from referral_rewards r
      join wallets w on w.user_id = r.referred_id
      where r.referrer_id = ${context.userId}
      order by r.created_at desc
      limit 40
    `;
    const earned = rewards.reduce((sum, r) => sum + money(r.amount), 0);
    return {
      code,
      percent: settings.percent,
      enabled: settings.enabled,
      invited: invites.length,
      earned,
      invites: invites.map((r) => ({
        username: r.username,
        phone: r.phone,
        createdAt: new Date(r.created_at).getTime(),
        deposits: Number(r.deposits || 0),
        earned: money(r.earned),
      })),
      rewards: rewards.map((r) => ({
        id: r.id,
        referred: r.referred,
        amount: money(r.amount),
        percent: money(r.percent),
        createdAt: new Date(r.created_at).getTime(),
      })),
    };
  });

export const loadStaffReferral = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const staff = await sql<{ is_staff: boolean }>`select is_staff from wallets where user_id = ${context.userId} limit 1`;
    if (!staff[0]?.is_staff) throw new Error("staff");
    const settings = await getReferralSettings();
    const recent = await sql<{
      id: string;
      referrer: string;
      referred: string;
      amount: string | number;
      percent: string | number;
      created_at: string;
    }>`
      select r.id, a.username as referrer, b.username as referred, r.amount, r.percent, r.created_at
      from referral_rewards r
      join wallets a on a.user_id = r.referrer_id
      join wallets b on b.user_id = r.referred_id
      order by r.created_at desc
      limit 40
    `;
    return {
      settings,
      recent: recent.map((r) => ({
        id: r.id,
        referrer: r.referrer,
        referred: r.referred,
        amount: money(r.amount),
        percent: money(r.percent),
        createdAt: new Date(r.created_at).getTime(),
      })),
    };
  });

export const saveReferralSettings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: unknown) =>
    z.object({
      percent: z.number().min(0).max(100),
      enabled: z.boolean(),
      minDeposit: z.number().min(1).max(1000000),
    }).parse(v),
  )
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const staff = await sql<{ is_staff: boolean }>`select is_staff from wallets where user_id = ${context.userId} limit 1`;
    if (!staff[0]?.is_staff) throw new Error("staff");
    await sql.query(
      `insert into referral_settings (id, percent, enabled, min_deposit, updated_at)
       values ('main', $1::numeric, $2, $3::numeric, now())
       on conflict (id) do update
         set percent = excluded.percent,
             enabled = excluded.enabled,
             min_deposit = excluded.min_deposit,
             updated_at = now()`,
      [money(data.percent), data.enabled, money(data.minDeposit)],
    );
    return getReferralSettings();
  });
