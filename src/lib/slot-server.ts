import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { publicError } from "@/lib/server-log";
import { playSpin, SLOT_MAX_STAKE, SLOT_MIN_STAKE, type SpinOutcome } from "@/lib/slot";
import { getSlotGame } from "@/lib/slot-games";
import { loadRtp } from "@/lib/rtp-server";
import { payOf, SLOT_PAYTABLE_ID, SLOT_TILE_PAYTABLE_ID } from "@/lib/rtp";

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

export type SlotSpinView = SpinOutcome & {
  stake: number;
  net: number;
  status: "won" | "lost";
};

export const spinSlot = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: unknown) => z.object({ stake: z.number().positive(), gameId: z.string().min(2).max(40).optional() }).parse(v))
  .handler(async ({ context, data }): Promise<{ spin: SlotSpinView; balance: number }> => {
    const stake = money2(data.stake);
    if (stake < SLOT_MIN_STAKE) throw new Error(`หมุนขั้นต่ำ ${SLOT_MIN_STAKE} บาท`);
    if (stake > SLOT_MAX_STAKE) throw new Error(`หมุนสูงสุด ${SLOT_MAX_STAKE} บาท`);
    const game = data.gameId ? getSlotGame(data.gameId) : undefined;
    const label = game ? `สล็อต ${game.titleTh}` : "สล็อต มาวินโกลด์";
    try {
      const gameKey = `slot:${game?.id ?? "golden-legion"}`;
      const pack = game?.pack ?? "classic";
      const tableId = pack === "tile" ? SLOT_TILE_PAYTABLE_ID : SLOT_PAYTABLE_ID;
      const [gameCfg, table] = await Promise.all([loadRtp(gameKey), loadRtp(tableId)]);
      if (!gameCfg.enabled) throw new Error("เกมนี้ปิดชั่วคราว");
      const outcome = playSpin(stake, {
        rtp: gameCfg.rtp,
        scale: payOf(gameCfg.pays, "scale", 1),
        pays: table.pays,
        pack,
      });
      const won = outcome.payout > 0;
      const betId = nid("bet");
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
        if (won) {
          await tx.query(`update wallets set balance = balance + $1::numeric where user_id = $2`, [
            outcome.payout,
            context.userId,
          ]);
          await tx.query(
            `insert into transactions (id, user_id, type, amount, status, note)
             values ($1, $2, 'payout', $3::numeric, 'approved', $4)`,
            [nid("tx"), context.userId, outcome.payout, `สล็อตถูกรางวัล x${outcome.wins.length}`],
          );
        }
        await tx.query(
          `insert into bets (id, user_id, kind, payload, stake, status, payout)
           values ($1, $2, 'slot', $3::jsonb, $4::numeric, $5, $6::numeric)`,
          [
            betId,
            context.userId,
            JSON.stringify({
              label,
              gameId: game?.id ?? "golden-legion",
              reels: outcome.reels,
              wins: outcome.wins,
              market: "slot",
            }),
            stake,
            won ? "won" : "lost",
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
        spin: {
          ...outcome,
          stake,
          net: Math.round((outcome.payout - stake) * 100) / 100,
          status: won ? "won" : "lost",
        },
        balance,
      };
    } catch (err) {
      if (err instanceof Error && /เครดิต|ขั้นต่ำ|สูงสุด|กระเป๋า|ปิดชั่วคราว/.test(err.message)) throw err;
      throw publicError("spinSlot", err, "หมุนสล็อตไม่สำเร็จ");
    }
  });
