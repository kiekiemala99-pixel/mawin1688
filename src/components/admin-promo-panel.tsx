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
            <input name="title" required placeholder="ชื่อโปร เช่น ฝาก 200 ฟรี 200" className="h-10 w-full rounded-lg bg-navy-deep px-3 text-sm text-cream outline-none" />
            <input name="subtitle" placeholder="คำโปรยสั้น ๆ" className="h-10 w-full rounded-lg bg-navy-deep px-3 text-sm text-cream outline-none" />
            <input name="imageUrl" placeholder="ลิงก์รูปโปร https://..." className="h-10 w-full rounded-lg bg-navy-deep px-3 text-sm text-cream outline-none" />
            <p className="text-[11px] text-cream/45">วางลิงก์รูปจากเว็บรูปภาพ แล้วสมาชิกจะเห็นรูปนี้บนหน้าโปร</p>
            <select name="kind" className="h-10 w-full rounded-lg bg-navy-deep px-3 text-sm text-cream">
              {PROMO_KINDS.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
            <select name="bonusType" className="h-10 w-full rounded-lg bg-navy-deep px-3 text-sm text-cream">
              <option value="fixed">โบนัสเป็นบาท</option>
              <option value="percent">โบนัสเป็น %</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-[11px] text-cream/55">
                โบนัส (บาท) ถ้าเลือกเป็นบาท
                <input name="bonusAmount" type="number" min={0} step={1} defaultValue={50} className="mt-1 h-10 w-full rounded-lg bg-navy-deep px-3 text-sm text-cream outline-none" />
              </label>
              <label className="block text-[11px] text-cream/55">
                โบนัส (%) ถ้าเลือกเป็น %
                <input name="bonusPercent" type="number" min={0} max={1000} step={1} defaultValue={100} className="mt-1 h-10 w-full rounded-lg bg-navy-deep px-3 text-sm text-cream outline-none" />
              </label>
              <label className="block text-[11px] text-cream/55">
                ฝากขั้นต่ำ (บาท)
                <input name="minDeposit" type="number" min={0} step={1} defaultValue={0} className="mt-1 h-10 w-full rounded-lg bg-navy-deep px-3 text-sm text-cream outline-none" />
              </label>
              <label className="block text-[11px] text-cream/55">
                โบนัสสูงสุด (บาท) 0 = ไม่จำกัด
                <input name="maxBonus" type="number" min={0} step={1} defaultValue={0} className="mt-1 h-10 w-full rounded-lg bg-navy-deep px-3 text-sm text-cream outline-none" />
              </label>
              <label className="block text-[11px] text-cream/55">
                ทำยอด (บาท)
                <input name="playNeed" type="number" min={0} step={1} defaultValue={0} className="mt-1 h-10 w-full rounded-lg bg-navy-deep px-3 text-sm text-cream outline-none" />
              </label>
              <label className="block text-[11px] text-cream/55">
                ถอนได้สูงสุดต่อครั้ง (บาท)
                <input name="withdrawMax" type="number" min={0} step={1} defaultValue={0} className="mt-1 h-10 w-full rounded-lg bg-navy-deep px-3 text-sm text-cream outline-none" />
              </label>
            </div>
            <p className="text-[11px] text-cream/45">
              ตัวอย่าง % · ฝากขั้นต่ำ 200 โบนัส 100% = ได้โบนัสเท่ายอดฝาก · ทำยอด 0 = ไม่ล็อก · ถอน 0 = ไม่จำกัด
            </p>
            <textarea name="rules" rows={2} placeholder="ข้อความเงื่อนไขเพิ่ม เช่น ห้ามแทงเลขตอง" className="w-full rounded-lg bg-navy-deep p-3 text-sm text-cream outline-none" />
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
              {p.imageUrl ? <img src={p.imageUrl} alt="" className="mb-2 h-28 w-full rounded-xl object-cover" /> : null}
              <div className="font-semibold text-cream">{p.title}</div>
              <div className="text-xs text-cream/55">รหัส {p.id}</div>
              <p className="mt-1 text-xs text-cream/70">
                {p.bonusType === "percent" ? `โบนัส ${p.bonusPercent}% ของยอดฝาก` : `โบนัส ฿ ${formatBaht(p.bonusAmount, 0)}`}
                {p.maxBonus > 0 ? ` · สูงสุด ฿ ${formatBaht(p.maxBonus, 0)}` : ""}
                {p.minDeposit > 0 ? ` · ฝากขั้นต่ำ ฿ ${formatBaht(p.minDeposit, 0)}` : ""}
                {p.playNeed > 0 ? ` · ทำยอด ฿ ${formatBaht(p.playNeed, 0)}` : ""}
                {p.withdrawMax > 0 ? ` · ถอนสูงสุด ฿ ${formatBaht(p.withdrawMax, 0)}` : " · ถอนไม่จำกัด"}
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <form method="POST" action="/api/staff">
                  <AuthHidden />
                  <input type="hidden" name="action" value="promo_toggle" />
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="enabled" value={p.enabled ? "0" : "1"} />
                  <button type="submit" className="h-9 w-full rounded-lg bg-navy-mid text-xs text-gold-bright">
                    {p.enabled ? "ปิดโปร" : "เปิดโปร"}
                  </button>
                </form>
                {p.imageUrl ? (
                  <form method="POST" action="/api/staff">
                    <AuthHidden />
                    <input type="hidden" name="action" value="promo_save" />
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="title" value={p.title} />
                    <input type="hidden" name="subtitle" value={p.subtitle} />
                    <input type="hidden" name="kind" value={p.kind} />
                    <input type="hidden" name="bonusType" value={p.bonusType} />
                    <input type="hidden" name="bonusAmount" value={p.bonusAmount} />
                    <input type="hidden" name="bonusPercent" value={p.bonusPercent} />
                    <input type="hidden" name="maxBonus" value={p.maxBonus} />
                    <input type="hidden" name="minDeposit" value={p.minDeposit} />
                    <input type="hidden" name="playNeed" value={p.playNeed} />
                    <input type="hidden" name="withdrawMax" value={p.withdrawMax} />
                    <input type="hidden" name="rules" value={p.rules} />
                    <input type="hidden" name="enabled" value={p.enabled ? "1" : "0"} />
                    <input type="hidden" name="clearImage" value="1" />
                    <button type="submit" className="h-9 w-full rounded-lg bg-navy-mid text-xs text-cream/80">
                      ลบรูป
                    </button>
                  </form>
                ) : (
                  <span />
                )}
                <form method="POST" action="/api/staff">
                  <AuthHidden />
                  <input type="hidden" name="action" value="promo_delete" />
                  <input type="hidden" name="id" value={p.id} />
                  <button type="submit" className="h-9 w-full rounded-lg bg-lose/15 text-xs font-semibold text-lose">
                    ลบโปร
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
