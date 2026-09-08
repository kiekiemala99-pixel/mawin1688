import { AuthHidden } from "@/components/auth-hidden";
import { PAY_CHANNELS } from "@/lib/banks";
import { formatBaht } from "@/lib/format";
import type { StaffMember } from "@/lib/wallet-server";

export function AdminMembersPanel({
  rows = [],
  total,
  ok,
  err,
}: {
  rows?: StaffMember[];
  total?: number;
  ok?: string;
  err?: string;
}) {
  const count = total ?? rows.length;
  return (
    <div className="space-y-2">
      <div className="rounded-2xl bg-navy-card px-4 py-4 text-center">
        <p className="text-xs text-cream/55">จำนวนสมาชิกที่สมัครทั้งหมด</p>
        <p className="tabular mt-1 text-3xl font-semibold text-gold-bright">{count}</p>
        <p className="text-xs text-cream/45">คน</p>
      </div>
      <p className="text-xs text-cream/55">แก้ไขข้อมูล ลดยอด หรือเพิ่มเครดิตได้จากฟอร์มของแต่ละคน</p>
      {ok ? <p className="rounded-xl bg-emerald-950/70 px-3 py-2 text-center text-sm text-emerald-200">บันทึกแล้ว</p> : null}
      {err ? <p className="rounded-xl bg-red-950/70 px-3 py-2 text-center text-sm text-red-200">ทำรายการไม่สำเร็จ ตรวจเบอร์ บัญชี หรือยอดเงิน</p> : null}
      {rows.length === 0 ? <p className="text-sm text-cream/50">ยังไม่มีสมาชิก</p> : null}
      {rows.map((user) => (
        <article key={user.userId} className="space-y-2 rounded-xl bg-navy-card px-3 py-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-semibold text-cream">
                {user.username}
                {user.isStaff ? " · แอดมิน" : ""}
              </div>
              <div className="text-xs text-cream/55">{user.phone}</div>
            </div>
            <div className="tabular font-semibold text-gold-bright">฿ {formatBaht(user.balance)}</div>
          </div>

          <form method="POST" action="/api/staff" className="space-y-2 rounded-lg bg-navy-deep/60 p-2">
            <AuthHidden />
            <input type="hidden" name="action" value="member_adjust" />
            <input type="hidden" name="userId" value={user.userId} />
            <input name="amount" type="number" min={1} step={1} required placeholder="จำนวนเงิน" className="h-10 w-full rounded-lg bg-navy-card px-3 text-sm text-cream outline-none" />
            <input name="reason" required minLength={3} placeholder="เหตุผลอย่างน้อย 3 ตัว" className="h-10 w-full rounded-lg bg-navy-card px-3 text-sm text-cream outline-none" />
            <div className="grid grid-cols-2 gap-2">
              <button type="submit" name="direction" value="sub" className="h-10 rounded-lg bg-lose text-sm font-semibold text-cream">
                ลดยอด
              </button>
              <button type="submit" name="direction" value="add" className="btn-gold h-10 rounded-lg text-sm">
                เพิ่มเงิน
              </button>
            </div>
          </form>

          <form method="POST" action="/api/staff" className="space-y-2 rounded-lg bg-navy-deep/60 p-2">
            <AuthHidden />
            <input type="hidden" name="action" value="member_update" />
            <input type="hidden" name="userId" value={user.userId} />
            <input name="phone" defaultValue={user.phone.startsWith("oauth:") ? "" : user.phone} placeholder="เบอร์โทร" className="h-10 w-full rounded-lg bg-navy-card px-3 text-sm text-cream outline-none" />
            <select name="bankName" defaultValue={user.bankName || "กสิกรไทย"} className="h-10 w-full rounded-lg bg-navy-card px-3 text-sm text-cream">
              {PAY_CHANNELS.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <input name="bankAccount" defaultValue={user.bankAccount} placeholder="เลขบัญชี / เบอร์วอเลท" className="h-10 w-full rounded-lg bg-navy-card px-3 text-sm text-cream outline-none" />
            <input name="password" type="password" minLength={8} placeholder="รหัสผ่านใหม่ (ว่าง = ไม่เปลี่ยน)" className="h-10 w-full rounded-lg bg-navy-card px-3 text-sm text-cream outline-none" />
            <button type="submit" className="h-10 w-full rounded-lg bg-gold-ink text-sm font-semibold text-gold-bright">
              บันทึกข้อมูลสมาชิก
            </button>
          </form>
        </article>
      ))}
    </div>
  );
}
