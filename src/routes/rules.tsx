import { Link, createFileRoute } from "@tanstack/react-router";
import { GuestShell } from "@/components/guest-shell";
import { GoldCard } from "@/components/gold-card";

export const Route = createFileRoute("/rules")({ component: RulesPage });

const RULES = [
  "สมาชิกต้องมีอายุ 20 ปีบริบูรณ์ และใช้ข้อมูลของตนเองในการสมัคร",
  "ยี่กีเปิดรับ 88 รอบต่อวัน ปิดรับก่อนออกรางวัล 15 วินาที",
  "หวยรัฐบาลรับแทงถึง 15:30 น. ของวันออกรางวัล (วันที่ 1 และ 16)",
  "บิลที่ยืนยันแล้วไม่สามารถยกเลิกได้ ผลตัดสินตามตัวเลขที่ประกาศบนเว็บ",
  "ราคาบอลที่กดแล้วถือเป็นราคาของบิลนั้น หากคู่ปรับสถานะเป็นยกเลิก ระบบคืนเครดิต",
  "การชนะครึ่ง / แพ้ครึ่ง คิดตามเส้น 0.25 และ 0.75",
  "ทีมงานมีสิทธิ์ระงับบัญชีหากพบการใช้ระบบที่ผิดปกติ",
];

function RulesPage() {
  return (
    <GuestShell>
      <GoldCard>
        <h1 className="text-center text-lg font-semibold">กฏและกติกา</h1>
        <ol className="mt-4 space-y-3">
          {RULES.map((r, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed">
              <span className="gold-label tabular w-5 shrink-0">{i + 1}.</span>
              <span>{r}</span>
            </li>
          ))}
        </ol>
        <Link to="/" className="mt-5 block text-center text-sm text-gold-deep">
          กลับหน้าแรก
        </Link>
      </GoldCard>
    </GuestShell>
  );
}
