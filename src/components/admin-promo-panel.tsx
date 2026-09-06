import { AuthHidden } from "@/components/auth-hidden";
import { formatBaht } from "@/lib/format";
import { PROMO_KINDS, type PromoRecord, type StaffPromoItem } from "@/lib/promo-server";
import { cn } from "@/lib/utils";

export function AdminPromoPanel({
  catalog = [],
  queue = [],
  tab,
  ok,
  err,
}: {
  catalog?: PromoRecord[];
  queue?: StaffPromoItem[];
  tab?: string;
  ok?: string;
  err?: string;
}) {
  const current = tab === "queue" ? "queue" : "manage";
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1">
        <a href="/app/admin/promos" className={cn("grid h-10 place-items-center rounded-lg text-sm font-medium", current === "manage" ? "btn-gold" : "bg-navy-card text-cream/80")}>
          จัดการโปร ({catalog.length})
        </a>
        <a href="/app/admin/promos?tab=queue" className={cn("grid h-10 place-items-center rounded-lg text-sm font-medium", current === "queue" ? "btn-gold" : "bg-navy-card text-cream/80")}>
          คิวรับโปร ({queue.length})
        </a>
      </div>
      {ok ? <p className="rounded-xl bg-emerald-950/70 px-3 py-2 text-center text-sm text-emerald-200">บันทึกแล้ว</p> : null}
      {err ? <p className="rounded-xl bg-red-950/70 px-3 py-2 text-center text-sm text-red-200">ทำรายการไม่สำเร็จ</p> : null}

      {current === "manage" ? (
        <div className="space-y-3">
          <form method="POST" action="/api/staff" className="space-y-2 rounded-2xl bg-navy-card p-4">
            <AuthHidden />
            <input type="hidden" name="action" value="promo_save" />
            <p className="text-sm font-semibold text-gold-bright">สร้าง / แก้ไขโปรโมชัน</p>
            <input name="id" placeholder="เว้นว่างถ้าสร้างใหม่ หรือใส่รหัสโปรเพื่อแก้" className="h-10 w-full rounded-lg bg-navy-deep px-3 text-sm text-cream outline-none" />
            <input name="title" required placeholder="ชื่อโปร" className="h-10 w-full rounded-lg bg-navy-deep px-3 text-sm text-cream outline-none" />
            <input name="subtitle" placeholder="คำโปรย" className="h-10 w-full rounded-lg bg-navy-deep px-3 text-sm text-cream outline-none" />
            <select name="kind" className="h-10 w-full rounded-lg bg-navy-deep px-3 text-sm text-cream">
              {PROMO_KINDS.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
            <select name="bonusType" className="h-10 w-full rounded-lg bg-navy-deep px-3 text-sm text-cream">
              <option value="fixed">จำนวนเงินคงที่</option>
              <option value="percent">เปอร์เซ็นต์</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input name="bonusAmount" type="number" min={0} step={1} defaultValue={50} placeholder="ยอดโบนัส" className="h-10 rounded-lg bg-navy-deep px-3 text-sm text-cream outline-none" />
              <input name="bonusPercent" type="number" min={0} step={0.1} defaultValue={0} placeholder="% โบนัส" className="h-10 rounded-lg bg-navy-deep px-3 text-sm text-cream outline-none" />
              <input name="minDeposit" type="number" min={0} step={1} defaultValue={0} placeholder="ฝากขั้นต่ำ" className="h-10 rounded-lg bg-navy-deep px-3 text-sm text-cream outline-none" />
              <input name="turnoverX" type="number" min={0} step={0.1} defaultValue={1} placeholder="เทิร์นเท่า" className="h-10 rounded-lg bg-navy-deep px-3 text-sm text-cream outline-none" />
            </div>
            <input name="maxBonus" type="number" min={0} step={1} defaultValue={0} placeholder="โบนัสสูงสุด 0 = ไม่จำกัด" className="h-10 w-full rounded-lg bg-navy-deep px-3 text-sm text-cream outline-none" />
            <textarea name="rules" rows={2} placeholder="เงื่อนไข" className="w-full rounded-lg bg-navy-deep p-3 text-sm text-cream outline-none" />
            <label className="flex items-center gap-2 text-sm text-cream">
              <input type="checkbox" name="enabled" value="1" defaultChecked />
              เปิดใช้งานทันที
            </label>
            <button type="submit" className="btn-gold h-11 w-full rounded-xl text-sm">
              บันทึกโปรโมชัน
            </button>
          </form>

          {catalog.map((p) => (
            <article key={p.id} className="rounded-2xl bg-navy-card px-3 py-3">
              <div className="font-semibold text-cream">{p.title}</div>
              <div className="text-xs text-cream/55">รหัส {p.id}</div>
              <p className="mt-1 text-xs text-cream/70">
                {p.bonusType === "percent" ? `โบนัส ${p.bonusPercent}%` : `โบนัส ฿ ${formatBaht(p.bonusAmount)}`}
                {p.turnoverX > 0 ? ` · เทิร์น ${p.turnoverX} เท่า` : ""}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <form method="POST" action="/api/staff">
                  <AuthHidden />
                  <input type="hidden" name="action" value="promo_toggle" />
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="enabled" value={p.enabled ? "0" : "1"} />
                  <button type="submit" className="h-9 w-full rounded-lg bg-navy-mid text-xs text-gold-bright">
                    {p.enabled ? "ปิดโปร" : "เปิดโปร"}
                  </button>
                </form>
                <form method="POST" action="/api/staff">
                  <AuthHidden />
                  <input type="hidden" name="action" value="promo_delete" />
                  <input type="hidden" name="id" value={p.id} />
                  <button type="submit" className="h-9 w-full rounded-lg bg-lose/15 text-xs font-semibold text-lose">
                    ลบ
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {queue.length === 0 ? <p className="rounded-2xl bg-navy-card px-4 py-6 text-center text-sm text-cream/60">ไม่มีสมาชิกกดรับโปรค้างอยู่</p> : null}
          {queue.map((item) => (
            <article key={item.id} className="rounded-2xl bg-navy-card px-3 py-3">
              <div className="font-semibold text-gold-bright">{item.title}</div>
              <div className="text-sm text-cream">
                {item.username} · {item.phone}
              </div>
              <div className="tabular mt-1 text-sm">โบนัสที่ขอ ฿ {formatBaht(item.amount)}</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <form method="POST" action="/api/staff">
                  <AuthHidden />
                  <input type="hidden" name="action" value="promo_review" />
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="decide" value="approve" />
                  <button type="submit" className="btn-gold h-10 w-full rounded-lg text-sm">
                    อนุมัติเติมโบนัส
                  </button>
                </form>
                <form method="POST" action="/api/staff">
                  <AuthHidden />
                  <input type="hidden" name="action" value="promo_review" />
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="decide" value="reject" />
                  <button type="submit" className="h-10 w-full rounded-lg bg-lose/20 text-sm font-semibold text-lose">
                    ปฏิเสธ
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
