import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { publicError } from "@/lib/server-log";
import { MINI_GAMES } from "@/lib/minigames";
import { SLOT_GAMES } from "@/lib/slot-games";
import {
  MINI_PAY_FIELDS,
  SLOT_GAME_FIELDS,
  SLOT_PAYTABLE_ID,
  SLOT_TABLE_FIELDS,
  SLOT_TILE_PAYTABLE_ID,
  SLOT_TILE_TABLE_FIELDS,
  defaultPays,
  type RtpConfig,
  type RtpKind,
} from "@/lib/rtp";

function num(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function asPays(v: unknown): Record<string, number> {
  if (!v || typeof v !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    const n = Number(val);
    if (Number.isFinite(n) && n > 0) out[k] = n;
  }
  return out;
}

async function requireStaff(userId: string) {
  const sql = await getSql();
  const rows = await sql<{ is_staff: boolean }>`select is_staff from wallets where user_id = ${userId}`;
  if (!rows[0]?.is_staff) throw new Error("เฉพาะเจ้าหน้าที่");
}

function catalog(): Array<{ id: string; kind: RtpKind; title: string; pays: Record<string, number> }> {
  const mini = MINI_GAMES.map((g) => ({
    id: `mini:${g.id}`,
    kind: "mini" as const,
    title: g.title,
    pays: defaultPays(MINI_PAY_FIELDS[g.type] ?? []),
  }));
  const slots = SLOT_GAMES.map((g) => ({
    id: `slot:${g.id}`,
    kind: "slot" as const,
    title: g.titleTh,
    pays: defaultPays(SLOT_GAME_FIELDS),
  }));
  const table = {
    id: SLOT_PAYTABLE_ID,
    kind: "slot" as const,
    title: "ตารางจ่ายสล็อตกลาง",
    pays: defaultPays(SLOT_TABLE_FIELDS),
  };
  const tiles = {
    id: SLOT_TILE_PAYTABLE_ID,
    kind: "slot" as const,
    title: "ตารางจ่ายกระเบื้อง",
    pays: defaultPays(SLOT_TILE_TABLE_FIELDS),
  };
  return [...mini, ...slots, table, tiles];
}

function toView(row: {
  id: string;
  kind: RtpKind;
  title: string;
  rtp: string | number;
  enabled: boolean;
  pays: unknown;
  updated_at: string;
}): RtpConfig {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    rtp: num(row.rtp),
    enabled: Boolean(row.enabled),
    pays: asPays(row.pays),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

let seededCount = 0;

async function ensureRows() {
  const rows = catalog();
  if (seededCount === rows.length) return;
  const sql = await getSql();
  for (const row of rows) {
    await sql.query(
      `insert into rtp_configs (id, kind, title, rtp, enabled, pays)
       values ($1, $2, $3, 1, true, $4::jsonb)
       on conflict (id) do nothing`,
      [row.id, row.kind, row.title, JSON.stringify(row.pays)],
    );
  }
  await sql.query(`update rtp_configs set rtp = 1, updated_at = now() where rtp >= 96`);
  seededCount = rows.length;
}

export async function loadRtp(id: string): Promise<RtpConfig> {
  const sql = await getSql();
  await ensureRows();
  const rows = await sql<{
    id: string;
    kind: RtpKind;
    title: string;
    rtp: string | number;
    enabled: boolean;
    pays: unknown;
    updated_at: string;
  }>`select id, kind, title, rtp, enabled, pays, updated_at from rtp_configs where id = ${id} limit 1`;
  if (rows[0]) return toView(rows[0]);
  const seed = catalog().find((c) => c.id === id);
  return {
    id,
    kind: seed?.kind ?? "mini",
    title: seed?.title ?? id,
    rtp: 1,
    enabled: true,
    pays: seed?.pays ?? {},
    updatedAt: Date.now(),
  };
}

export async function listAllRtpConfigs(): Promise<RtpConfig[]> {
  await ensureRows();
  const sql = await getSql();
  const rows = await sql<{
    id: string;
    kind: RtpKind;
    title: string;
    rtp: string | number;
    enabled: boolean;
    pays: unknown;
    updated_at: string;
  }>`select id, kind, title, rtp, enabled, pays, updated_at from rtp_configs order by kind, title`;
  const live = new Set(catalog().map((c) => c.id));
  return rows.map(toView).filter((r) => live.has(r.id));
}

export const listRtpConfigs = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await requireStaff(context.userId);
    try {
      return await listAllRtpConfigs();
    } catch (err) {
      throw publicError("listRtpConfigs", err, "โหลดค่า RTP ไม่สำเร็จ");
    }
  });

const saveBody = z.object({
  id: z.string().min(3).max(60),
  rtp: z.number().min(1).max(100),
  enabled: z.boolean(),
  pays: z.record(z.string(), z.number().positive().max(1000)),
});

export const saveRtpConfig = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((v: unknown) => saveBody.parse(v))
  .handler(async ({ context, data }) => {
    await requireStaff(context.userId);
    try {
      await ensureRows();
      const sql = await getSql();
      const rows = await sql.query(
        `update rtp_configs
         set rtp = $2::numeric, enabled = $3, pays = $4::jsonb, updated_at = now(), updated_by = $5
         where id = $1
         returning id`,
        [data.id, data.rtp, data.enabled, JSON.stringify(data.pays), context.userId],
      );
      if (rows.length === 0) throw new Error("ไม่พบเกมนี้ในตาราง RTP");
      return loadRtp(data.id);
    } catch (err) {
      if (err instanceof Error && /ไม่พบ|เฉพาะ/.test(err.message)) throw err;
      throw publicError("saveRtpConfig", err, "บันทึก RTP ไม่สำเร็จ");
    }
  });
