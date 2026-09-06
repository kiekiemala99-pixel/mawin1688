import { useState, type FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { toast } from "sonner";
import { PAY_CHANNELS, channelByName, validatePayAccount } from "@/lib/banks";
import { formatBaht } from "@/lib/format";
import { isThaiPhone } from "@/lib/phone";
import {
  adjustMemberBalance,
  updateMember,
  type StaffMember,
} from "@/lib/wallet-server";

export function MemberEditModal({
  user,
  focusAdjust = false,
  onClose,
  onUpdated,
}: {
  user: StaffMember;
  focusAdjust?: boolean;
  onClose: () => void;
  onUpdated: (next: StaffMember) => void;
}) {
  const [phone, setPhone] = useState(user.phone.startsWith("oauth:") ? "" : user.phone);
  const [bankName, setBankName] = useState(user.bankName || "กสิกรไทย");
  const [bankAccount, setBankAccount] = useState(user.bankAccount);
  const [password, setPassword] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState(focusAdjust ? "แอดมินปรับลดยอด" : "");
  const [busy, setBusy] = useState<"save" | "add" | "sub" | null>(null);
  const channel = channelByName(bankName) ?? PAY_CHANNELS[0];

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const nextPhone = phone.trim() || user.phone;
    if (!nextPhone.startsWith("oauth:") && !isThaiPhone(nextPhone)) {
      toast.error("เบอร์โทรไม่ถูกต้อง");
      return;
    }
    const payErr = validatePayAccount(bankName, bankAccount);
    if (payErr) {
      toast.error(payErr);
      return;
    }
    if (password && password.length < 8) {
      toast.error("รหัสผ่านอย่างน้อย 8 ตัว");
      return;
    }
    setBusy("save");
    try {
      const updated = await updateMember({
        data: {
          userId: user.userId,
          phone: nextPhone,
          bankName,
          bankAccount,
          password: password || undefined,
        },
      });
      onUpdated(updated);
      setPassword("");
      toast.success("บันทึกข้อมูลแล้ว");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(null);
    }
  }

  async function onAdjust(direction: "add" | "sub") {
    if (busy) return;
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("กรอกจำนวนเงิน");
      return;
    }
    if (reason.trim().length < 3) {
      toast.error("ระบุเหตุผลอย่างน้อย 3 ตัวอักษร");
      return;
    }
    setBusy(direction);
    try {
      const updated = await adjustMemberBalance({
        data: { userId: user.userId, direction, amount: n, reason: reason.trim() },
      });
      onUpdated(updated);
      setAmount("");
      setReason("");
      toast.success(direction === "add" ? "เพิ่มเครดิตแล้ว" : "ลดเครดิตแล้ว");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ปรับยอดไม่สำเร็จ");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-navy/75" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[88dvh] w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-navy-card p-4 text-cream shadow-[0_0_0_1px_rgba(201,164,74,0.35)] outline-none">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Dialog.Title className="text-lg font-semibold text-gold-bright">แก้ไขสมาชิก</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-xs text-cream/55">
                {user.username}
                {user.isStaff ? " · แอดมิน" : ""} · คงเหลือ ฿ {formatBaht(user.balance)}
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded-md p-1 text-cream/60 hover:bg-navy-mid">
              <X className="size-5" />
            </Dialog.Close>
          </div>

          <div className="mt-3 space-y-2 rounded-xl bg-navy-mid/80 p-3">
            <h3 className="text-sm font-semibold text-gold-bright">ลด / เพิ่มเครดิต</h3>
            <p className="text-xs text-cream/50">คงเหลือ ฿ {formatBaht(user.balance)} · ลดยอดแล้วกระเป๋าติดลบไม่ได้</p>
            <input
              autoFocus={focusAdjust}
              className="h-11 w-full rounded-xl bg-navy-card px-3 text-sm outline-none"
              inputMode="decimal"
              placeholder="จำนวนเงินที่ต้องการลดหรือเพิ่ม"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <input
              className="h-11 w-full rounded-xl bg-navy-card px-3 text-sm outline-none"
              placeholder="เหตุผล เช่น ปรับยอดผิด / ทดเครดิต"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={80}
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={Boolean(busy)}
                className="h-11 rounded-xl bg-lose text-sm font-semibold text-cream disabled:opacity-60"
                onClick={() => void onAdjust("sub")}
              >
                {busy === "sub" ? "กำลังลดยอด…" : "ยืนยันลดยอด"}
              </button>
              <button
                type="button"
                disabled={Boolean(busy)}
                className="btn-gold h-11 rounded-xl disabled:opacity-60"
                onClick={() => void onAdjust("add")}
              >
                {busy === "add" ? "…" : "เพิ่มเงิน"}
              </button>
            </div>
          </div>

          <form className="mt-4 space-y-2 border-t border-gold/20 pt-3" onSubmit={onSave}>
            <label className="block text-xs text-cream/55">เบอร์โทร</label>
            <input
              className="h-11 w-full rounded-xl bg-navy-mid px-3 text-sm outline-none"
              value={phone}
              inputMode="tel"
              onChange={(e) => setPhone(e.target.value)}
            />
            <label className="block text-xs text-cream/55">ธนาคาร / กระเป๋าเงิน</label>
            <select
              className="h-11 w-full rounded-xl bg-navy-mid px-3 text-sm outline-none"
              value={bankName}
              onChange={(e) => {
                setBankName(e.target.value);
                setBankAccount("");
              }}
            >
              {PAY_CHANNELS.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              className="h-11 w-full rounded-xl bg-navy-mid px-3 text-sm outline-none"
              inputMode="numeric"
              placeholder={channel.hint}
              value={bankAccount}
              onChange={(e) => setBankAccount(e.target.value.replace(/\D/g, "").slice(0, channel.digits))}
            />
            <label className="block text-xs text-cream/55">รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)</label>
            <input
              className="h-11 w-full rounded-xl bg-navy-mid px-3 text-sm outline-none"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit" disabled={busy === "save"} className="btn-gold h-11 w-full rounded-xl disabled:opacity-60">
              {busy === "save" ? "กำลังบันทึก…" : "บันทึกข้อมูล"}
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
