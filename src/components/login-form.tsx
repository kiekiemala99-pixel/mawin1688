import { Link } from "@tanstack/react-router";
import { KeyRound, Lock, User, UserPlus } from "lucide-react";
import { GoldCard } from "@/components/gold-card";
import { IconField } from "@/components/icon-field";
import { LineMark } from "@/components/icons";
import { ContactDialog } from "@/components/contact-dialog";
import { GROK_PROVIDERS, signIn } from "@/lib/auth/client";

export function LoginForm({ error }: { error?: string }) {
  return (
    <>
      <form method="POST" action="/api/phone-login">
        <GoldCard>
          <div className="space-y-2.5">
            {error ? (
              <p className="rounded-lg bg-red-950/70 px-3 py-2 text-center text-sm font-medium text-red-200">
                {error}
              </p>
            ) : null}
            <IconField
              icon={<User className="size-5" />}
              placeholder="เบอร์โทรศัพท์"
              autoComplete="tel"
              name="phone"
              required
            />
            <IconField
              icon={<Lock className="size-5" />}
              placeholder="รหัสผ่าน"
              type="password"
              autoComplete="current-password"
              name="password"
              required
            />
            <button type="submit" className="btn-gold mt-1 h-12 w-full rounded-lg text-base">
              เข้าสู่ระบบ
            </button>
          </div>
        </GoldCard>
      </form>

      <GoldCard className="mt-3">
        <div className="space-y-2">
          <Link to="/register" className="btn-dark flex h-12 w-full items-center justify-center gap-2 rounded-lg">
            <UserPlus className="size-5" />
            สมัครสมาชิก
          </Link>
          <ContactDialog
            trigger={
              <button type="button" className="btn-line flex h-12 w-full items-center justify-center gap-2 rounded-lg">
                <LineMark className="size-6 text-cream" />
                แอดไลน์ติดต่อเจ้าหน้าที่
              </button>
            }
          />
          <Link to="/reset" className="btn-action flex h-12 w-full items-center justify-center gap-2 rounded-lg">
            <KeyRound className="size-5" />
            ลืม/รีเซต รหัสผ่าน
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {GROK_PROVIDERS.map((p) => (
            <button
              key={p.providerId}
              type="button"
              className="h-11 rounded-lg bg-navy-mid text-sm font-medium text-cream shadow-[0_0_0_1px_rgba(201,164,74,0.25)]"
              onClick={() => void signIn(p.providerId, { callbackURL: "/app" })}
            >
              {p.label}
            </button>
          ))}
        </div>
      </GoldCard>

      <GoldCard className="mt-3">
        <div className="grid grid-cols-2 divide-x divide-gold/30">
          <Link to="/rates" className="gold-label py-3 text-center text-[15px]">
            อัตราจ่าย
          </Link>
          <Link to="/rules" className="gold-label py-3 text-center text-[15px]">
            กฏและกติกา
          </Link>
        </div>
      </GoldCard>
    </>
  );
}
