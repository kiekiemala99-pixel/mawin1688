import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { publicError } from "@/lib/server-log";
import { loadRtp } from "@/lib/rtp-server";
import { getMiniGame, MINI_MAX, MINI_MIN, resolveMini, type MiniOutcome } from "@/lib/minigames";

function money(v: unknown) {
  return Number(v ?? 0);
}

function money2(n: number) {
  if (!Number.isFinite(n) || n <= 0) throw new Error("จำนวนเงินไม่ถูกต้อง");
  const v = Math.round(n * 100) / 100;
  if (v <= 0) throw new Error("จำนวนเงินไม่ถูกต้อง");
  return v;
}

function nid(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export type MiniPlayView = MiniOutcome & { stake: number; net: number };

export const playMiniGame = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: unknown) =>
    z.object({ gameId: z.string().min(2).max(40), pick: z.string().min(1).max(20), stake: z.number().positive() }).parse(v),
  )
  .handler(async ({ context, data }): Promise<{ play: MiniPlayView; balance: number }> => {
    const stake = money2(data.stake);
    if (stake < MINI_MIN) throw new Error(`ขั้นต่ำ ${MINI_MIN} บาท`);
    if (stake > MINI_MAX) throw new Error(`สูงสุด ${MINI_MAX} บาท`);
    const game = getMiniGame(data.gameId);
    if (!game) throw new Error("ไม่พบเกม");
    try {
      const cfg = await loadRtp(`mini:${game.id}`);
      if (!cfg.enabled) throw new Error("เกมนี้ปิดชั่วคราว");
      const outcome = resolveMini(data.gameId, data.pick, stake, cfg);
      const label = `มินิเกม ${game.title}`;
      let balance = 0;
      await withTransaction(async (tx) => {
        const locked = await tx.query<{ balance: string | number }>(
          `select balance from wallets where user_id = $1 for update`,
          [context.userId],
        );
        if (!locked[0]) throw new Error("ไม่พบบัญชีกระเป๋า");
        if (money(locked[0].balance) < stake) throw new Error("เครดิตไม่พอ");
        const cut = await tx.query(
          `update wallets set balance = balance - $1::numeric
           where user_id = $2 and balance >= $1::numeric returning balance`,
          [stake, context.userId],
        );
        if (cut.length === 0) throw new Error("เครดิตไม่พอ");
        await tx.query(
          `insert into transactions (id, user_id, type, amount, status, note)
           values ($1, $2, 'bet', $3::numeric, 'approved', $4)`,
          [nid("tx"), context.userId, stake, label],
        );
        if (outcome.payout > 0) {
          await tx.query(`update wallets set balance = balance + $1::numeric where user_id = $2`, [
            outcome.payout,
            context.userId,
          ]);
          await tx.query(
            `insert into transactions (id, user_id, type, amount, status, note)
             values ($1, $2, 'payout', $3::numeric, 'approved', $4)`,
            [nid("tx"), context.userId, outcome.payout, `${label} · ${outcome.summary}`],
          );
        }
        await tx.query(
          `insert into bets (id, user_id, kind, payload, stake, status, payout)
           values ($1, $2, 'mini', $3::jsonb, $4::numeric, $5, $6::numeric)`,
          [
            nid("bet"),
            context.userId,
            JSON.stringify({
              label,
              gameId: game.id,
              pick: data.pick,
              summary: outcome.summary,
              market: "mini",
            }),
            stake,
            outcome.status === "push" ? "push" : outcome.status,
            outcome.payout,
          ],
        );
        const after = await tx.query<{ balance: string | number }>(
          `select balance from wallets where user_id = $1`,
          [context.userId],
        );
        balance = money(after[0]?.balance);
      });
      return {
        play: {
          ...outcome,
          stake,
          net: Math.round((outcome.payout - stake) * 100) / 100,
        },
        balance,
      };
    } catch (err) {
      if (err instanceof Error && /เครดิต|ขั้นต่ำ|สูงสุด|กระเป๋า|เลือก|ไม่พบเกม|ปิดชั่วคราว/.test(err.message)) throw err;
      throw publicError("playMiniGame", err, "เล่นมินิเกมไม่สำเร็จ");
    }
  });
