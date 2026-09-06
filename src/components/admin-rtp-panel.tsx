import { AuthHidden } from "@/components/auth-hidden";
import { getMiniGame } from "@/lib/minigames";
import {
  MINI_PAY_FIELDS,
  SLOT_GAME_FIELDS,
  SLOT_PAYTABLE_ID,
  SLOT_TABLE_FIELDS,
  SLOT_TILE_PAYTABLE_ID,
  SLOT_TILE_TABLE_FIELDS,
  type PayField,
  type RtpConfig,
} from "@/lib/rtp";
import { cn } from "@/lib/utils";

function fieldsOf(row: RtpConfig): PayField[] {
  if (row.id === SLOT_PAYTABLE_ID) return SLOT_TABLE_FIELDS;
  if (row.id === SLOT_TILE_PAYTABLE_ID) return SLOT_TILE_TABLE_FIELDS;
  if (row.kind === "slot") return SLOT_GAME_FIELDS;
  const game = getMiniGame(row.id.replace(/^mini:/, ""));
  return MINI_PAY_FIELDS[game?.type ?? ""] ?? [];
}

const TABS = [
  { id: "mini", label: "มินิเกม" },
  { id: "slot", label: "สล็อต" },
  { id: "table", label: "ตารางจ่าย" },
] as const;

export function AdminRtpPanel({
  rows,
  tab = "mini",
  ok,
  err,
}: {
  rows: RtpConfig[];
  tab?: string;
  ok?: string;
  err?: string;
}) {
  const current = tab === "slot" || tab === "table" ? tab : "mini";
  const visible =
    current === "table"
      ? rows.filter((r) => r.id === SLOT_PAYTABLE_ID || r.id === SLOT_TILE_PAYTABLE_ID)
      : current === "slot"
        ? rows.filter((r) => r.kind === "slot" && r.id !== SLOT_PAYTABLE_ID && r.id !== SLOT_TILE_PAYTABLE_ID)
        : rows.filter((r) => r.kind === "mini");

  return (
    <div className="space-y-3">
      <p className="text-xs text-cream/55">ปรับความใจดีของเกมแล้วกดบันทึก · มีผลตาถัดไปทันที</p>
      {ok ? <p className="rounded-xl bg-emerald-950/70 px-3 py-2 text-center text-sm text-emerald-200">บันทึกแล้ว</p> : null}
      {err ? (
        <p className="rounded-xl bg-red-950/70 px-3 py-2 text-center text-sm text-red-200">
          {err === "login" ? "เข้าสู่ระบบใหม่" : err === "staff" ? "บัญชีนี้ไม่ใช่แอดมิน" : "บันทึกไม่สำเร็จ"}
        </p>
      ) : null}
      <div className="grid grid-cols-3 gap-1">
        {TABS.map((t) => (
          <a
            key={t.id}
            href={`/app/admin/rtp?tab=${t.id}`}
            className={cn("grid h-10 place-items-center rounded-lg text-sm font-medium", current === t.id ? "btn-gold" : "bg-navy-card text-cream/80")}
          >
            {t.label}
          </a>
        ))}
      </div>
      {visible.length === 0 ? <p className="rounded-2xl bg-navy-card px-4 py-6 text-center text-sm text-cream/60">กำลังโหลดรายการเกม…</p> : null}
      {visible.map((row) => {
        const fields = fieldsOf(row);
        return (
          <form key={row.id} method="POST" action="/api/staff" className="rounded-2xl bg-navy-card p-4 shadow-[0_0_0_1px_rgba(201,164,74,0.22)]">
            <AuthHidden />
            <input type="hidden" name="action" value="rtp" />
            <input type="hidden" name="id" value={row.id} />
            <input type="hidden" name="tab" value={current} />
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-gold-bright">{row.title}</h3>
                <p className="text-[11px] text-cream/45">{row.id}</p>
              </div>
              <label className="flex h-8 items-center gap-2 rounded-lg bg-navy-deep px-3 text-xs text-cream">
                <input type="checkbox" name="enabled" value="1" defaultChecked={row.enabled} />
                เปิดเกม
              </label>
            </div>
            {row.id !== SLOT_PAYTABLE_ID && row.id !== SLOT_TILE_PAYTABLE_ID ? (
              <label className="mt-3 block text-xs text-cream/70">
                RTP / ความใจดี
                <input
                  type="number"
                  name="rtp"
                  min={1}
                  max={100}
                  defaultValue={row.rtp}
                  className="mt-1 h-10 w-full rounded-lg bg-navy-deep px-3 text-sm text-cream outline-none"
                />
              </label>
            ) : (
              <input type="hidden" name="rtp" value={row.rtp} />
            )}
            {fields.length > 0 ? (
              <div className={cn("mt-3 grid gap-2", fields.length > 4 ? "grid-cols-2" : "grid-cols-1")}>
                {fields.map((f) => (
                  <label key={f.key} className="text-xs text-cream/70">
                    {f.label}
                    <input
                      type="number"
                      name={`pay_${f.key}`}
                      min={0.01}
                      step={0.01}
                      defaultValue={row.pays[f.key] ?? f.def}
                      className="mt-1 h-9 w-full rounded-lg bg-navy-deep px-2 text-sm text-cream outline-none"
                    />
                  </label>
                ))}
              </div>
            ) : null}
            <button type="submit" className="btn-gold mt-3 h-10 w-full rounded-xl text-sm">
              บันทึกเกมนี้
            </button>
          </form>
        );
      })}
    </div>
  );
}
