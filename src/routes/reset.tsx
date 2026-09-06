import { Link, createFileRoute } from "@tanstack/react-router";
import { GuestShell } from "@/components/guest-shell";
import { GoldCard } from "@/components/gold-card";
import { ContactDialog } from "@/components/contact-dialog";
import { LineMark } from "@/components/icons";

export const Route = createFileRoute("/reset")({ component: ResetPage });

function ResetPage() {
  return (
    <GuestShell>
      <GoldCard>
        <h1 className="text-center text-lg font-semibold">ลืม / รีเซตรหัสผ่าน</h1>
        <p className="mt-2 text-center text-sm leading-relaxed text-muted">
          เพื่อความปลอดภัย กรุณาติดต่อเจ้าหน้าที่ไลน์เพื่อรีเซตรหัสผ่าน
        </p>
        <ContactDialog
          trigger={
            <button type="button" className="btn-line mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-lg">
              <LineMark className="size-6" />
              แอดไลน์รีเซตรหัสผ่าน
            </button>
          }
        />
        <Link to="/" className="mt-4 block text-center text-sm text-gold-deep">
          กลับเข้าสู่ระบบ
        </Link>
      </GoldCard>
    </GuestShell>
  );
}
