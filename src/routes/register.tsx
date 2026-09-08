import { useState, type FormEvent } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { GuestShell } from "@/components/guest-shell";
import { GoldCard } from "@/components/gold-card";
import { IconField } from "@/components/icon-field";
import { Building2, Lock, Phone, User, Wallet } from "lucide-react";
import { authClient, captureAuthToken, setBearerToken } from "@/lib/auth/client";
import { isThaiPhone, phoneToEmail } from "@/lib/phone";
import { PAY_CHANNELS, channelByName, validatePayAccount } from "@/lib/banks";
import { useStore } from "@/lib/store";
import { checkHandleAvailable } from "@/lib/wallet-server";

export const Route = createFileRoute("/register")({
  validateSearch: (s: Record<string, unknown>): { ref?: string } => ({
    ...(typeof s.ref === "string" && s.ref.trim() ? { ref: s.ref.trim() } : {}),
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const registerProfile = useStore((s) => s.registerProfile);
  const { ref } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    username: "",
    phone: "",
    password: "",
    confirm: "",
    bankName: "กสิกรไทย",
    bankAccount: "",
  });
  const channel = channelByName(form.bankName) ?? PAY_CHANNELS[0];

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (form.username.trim().length < 3) {
      toast.error("ชื่อผู้ใช้อย่างน้อย 3 ตัว");
      return;
    }
    if (form.password !== form.confirm) {
      toast.error("รหัสผ่านไม่ตรงกัน");
      return;
    }
    if (form.password.length < 8) {
      toast.error("รหัสผ่านอย่างน้อย 8 ตัวอักษร");
      return;
    }
    if (!isThaiPhone(form.phone)) {
      toast.error("เบอร์โทรไม่ถูกต้อง");
      return;
    }
    const payErr = validatePayAccount(form.bankName, form.bankAccount);
    if (payErr) {
      toast.error(payErr);
      return;
    }
    setBusy(true);
    try {
      const available = await checkHandleAvailable({
        data: { username: form.username, phone: form.phone },
      });
      if (!available) {
        toast.error("ชื่อผู้ใช้หรือเบอร์โทรนี้ถูกใช้แล้ว");
        return;
      }
      const { data, error } = await authClient.signUp.email({
        email: phoneToEmail(form.phone),
        password: form.password,
        name: form.username.trim(),
        fetchOptions: {
          onSuccess(ctx) {
            captureAuthToken(ctx);
          },
        },
      });
      if (error) {
        const msg = error.message ?? "";
        toast.error(msg.toLowerCase().includes("already") || msg.toLowerCase().includes("exist") ? "เบอร์นี้ถูกใช้แล้ว" : msg || "สมัครไม่สำเร็จ");
        return;
      }
      const fallbackToken =
        (data as { token?: string; session?: { token?: string } } | null)?.token ||
        (data as { token?: string; session?: { token?: string } } | null)?.session?.token;
      if (fallbackToken) setBearerToken(fallbackToken);
      await authClient.getSession();
      const err = await registerProfile({
        username: form.username,
        phone: form.phone,
        bankName: form.bankName,
        bankAccount: form.bankAccount,
        ref,
      });
      if (err) {
        toast.error(err);
        return;
      }
      toast.success("สมัครสำเร็จ");
      window.location.assign("/app");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "สมัครไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <GuestShell>
      <GoldCard>
        <h1 className="text-center text-lg font-semibold text-ink">สมัครสมาชิก</h1>
        <p className="mt-1 text-center text-xs text-muted">{ref ? `สมัครจากลิงก์แนะนำของ ${ref}` : "กรอกข้อมูลให้ครบเพื่อเปิดบัญชี"}</p>
        <form className="mt-4 space-y-2.5" onSubmit={onSubmit}>
          <IconField icon={<User className="size-5" />} placeholder="ชื่อผู้ใช้" autoComplete="username" value={form.username} onChange={(e) => set("username", e.target.value)} />
          <IconField icon={<Phone className="size-5" />} placeholder="เบอร์โทร" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          <IconField icon={<Lock className="size-5" />} placeholder="รหัสผ่าน (อย่างน้อย 8 ตัว)" type="password" autoComplete="new-password" value={form.password} onChange={(e) => set("password", e.target.value)} />
          <IconField icon={<Lock className="size-5" />} placeholder="ยืนยันรหัสผ่าน" type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => set("confirm", e.target.value)} />
          <label className="flex overflow-hidden rounded-lg bg-card shadow-[0_0_0_1px_rgba(10,20,40,0.08)]">
            <span className="flex w-12 items-center justify-center bg-cream-deep text-muted">
              {channel.group === "wallet" ? <Wallet className="size-5" /> : <Building2 className="size-5" />}
            </span>
            <select
              className="h-12 flex-1 bg-card px-3 text-[15px] text-ink outline-none"
              value={form.bankName}
              onChange={(e) => {
                set("bankName", e.target.value);
                set("bankAccount", "");
              }}
            >
              <optgroup label="ธนาคาร">
                {PAY_CHANNELS.filter((c) => c.group === "bank").map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="กระเป๋าเงิน">
                {PAY_CHANNELS.filter((c) => c.group === "wallet").map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          <IconField
            icon={channel.group === "wallet" ? <Phone className="size-5" /> : <Building2 className="size-5" />}
            placeholder={channel.hint}
            inputMode="numeric"
            value={form.bankAccount}
            onChange={(e) => set("bankAccount", e.target.value.replace(/\D/g, "").slice(0, channel.digits))}
          />
          <p className="px-1 text-[11px] text-muted">{channel.hint}</p>
          <button type="submit" disabled={busy} className="btn-gold h-12 w-full rounded-lg disabled:opacity-60">
            {busy ? "กำลังสมัคร…" : "ยืนยันสมัคร"}
          </button>
        </form>
        <Link to="/" className="mt-3 block text-center text-sm text-gold-deep">
          มีบัญชีแล้ว เข้าสู่ระบบ
        </Link>
      </GoldCard>
    </GuestShell>
  );
}
