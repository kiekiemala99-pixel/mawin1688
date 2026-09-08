import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { loadMyReferral } from "@/lib/referral-server";
import { formatBaht, formatWhen } from "@/lib/format";
import { GoldCard } from "@/components/gold-card";

export const Route = createFileRoute("/app/referral")({
  loader: async () => {
    try {
      return await loadMyReferral();
    } catch {
      return null;
    }
  },
  component: ReferralPage,
});

function ReferralPage() {
  const data = Route.useLoaderData();
  const [copied, setCopied] = useState(false);
  const link = useMemo(() => {
    if (!data?.code) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "https://mawin1688.onrender.com";
    return `${origin}/register?ref=${encodeURIComponent(data.code)}`;
  }, [data?.code]);

  if (!data) {
    return <p className="rounded-2xl bg-navy-card px-4 py-6 text-center text-sm text-cream/70">โหลดข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง</p>;
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-3">
      <h1 className="text-lg font-semibold text-gold-bright">แนะนำเพื่อน</h1>
      <GoldCard>
        <p className="text-sm text-ink">
          ส่งลิงก์นี้ให้เพื่อนสมัคร เมื่อเพื่อนฝากเงินและแอดมินอนุมัติ คุณได้ค่าแนะนำ{" "}
          <b>{data.percent}%</b> ของยอดฝาก
        </p>
        {!data.enabled ? <p className="mt-2 text-sm text-lose">ระบบแนะนำเพื่อนปิดอยู่ชั่วคราว</p> : null}
        <div className="mt-3 rounded-xl bg-navy-deep px-3 py-2 text-xs text-cream break-all">{link || "กำลังสร้างลิงก์…"}</div>
        <button type="button" onClick={() => void copy()} className="btn-gold mt-3 h-11 w-full rounded-lg text-sm">
          {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์แชร์"}
        </button>
        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-cream px-3 py-3">
            <div className="text-[11px] text-muted">เพื่อนที่สมัคร</div>
            <div className="tabular text-xl font-semibold text-gold-deep">{data.invited}</div>
          </div>
          <div className="rounded-xl bg-cream px-3 py-3">
            <div className="text-[11px] text-muted">ได้ค่าแนะนำแล้ว</div>
            <div className="tabular text-xl font-semibold text-gold-deep">฿ {formatBaht(data.earned, 0)}</div>
          </div>
        </div>
      </GoldCard>

      <h2 className="text-sm font-semibold text-gold-bright">เพื่อนจากลิงก์ของคุณ</h2>
      <div className="space-y-1.5">
        {data.invites.map((row) => (
          <div key={row.username} className="rounded-xl bg-navy-card px-3 py-2.5 text-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-medium text-cream">{row.username}</div>
                <div className="text-xs text-cream/50">สมัคร {formatWhen(row.createdAt)} · ฝากสำเร็จ {row.deposits} ครั้ง</div>
              </div>
              <div className="tabular text-gold-bright">฿ {formatBaht(row.earned, 0)}</div>
            </div>
          </div>
        ))}
        {data.invites.length === 0 ? <p className="text-sm text-cream/50">ยังไม่มีเพื่อนสมัครจากลิงก์นี้</p> : null}
      </div>

      <h2 className="text-sm font-semibold text-gold-bright">ประวัติค่าแนะนำ</h2>
      <div className="space-y-1.5">
        {data.rewards.map((row) => (
          <div key={row.id} className="flex items-center justify-between rounded-xl bg-navy-card px-3 py-2.5 text-sm">
            <div>
              <div className="text-cream">{row.referred}</div>
              <div className="text-xs text-cream/50">{formatWhen(row.createdAt)} · {row.percent}%</div>
            </div>
            <div className="tabular font-semibold text-win">+{formatBaht(row.amount, 0)}</div>
          </div>
        ))}
        {data.rewards.length === 0 ? <p className="text-sm text-cream/50">ยังไม่มีรายได้จากเพื่อน</p> : null}
      </div>
    </div>
  );
}
