import { createFileRoute } from "@tanstack/react-router";
import { AuthHidden } from "@/components/auth-hidden";
import { loadStaffReferral } from "@/lib/referral-server";
import { formatBaht, formatWhen } from "@/lib/format";

export const Route = createFileRoute("/app/admin/referral")({
  validateSearch: (s: Record<string, unknown>): { ok?: string; err?: string } => ({
    ...(s.ok ? { ok: String(s.ok) } : {}),
    ...(s.err ? { err: String(s.err) } : {}),
  }),
  loader: async () => {
    try {
      return await loadStaffReferral();
    } catch {
      return null;
    }
  },
  component: AdminReferralPage,
});

function AdminReferralPage() {
  const data = Route.useLoaderData();
  const { ok, err } = Route.useSearch();
  if (!data) {
    return <p className="rounded-2xl bg-navy-card px-4 py-6 text-center text-sm text-cream/70">โหลดตั้งค่าไม่สำเร็จ</p>;
  }
  return (
    <div className="space-y-3">
      {ok ? <p className="rounded-xl bg-emerald-950/70 px-3 py-2 text-center text-sm text-emerald-200">บันทึกแล้ว</p> : null}
      {err ? <p className="rounded-xl bg-red-950/70 px-3 py-2 text-center text-sm text-red-200">บันทึกไม่สำเร็จ</p> : null}

      <form method="POST" action="/api/staff" className="space-y-2 rounded-2xl bg-navy-card p-4">
        <AuthHidden />
        <input type="hidden" name="action" value="referral" />
        <p className="text-sm font-semibold text-gold-bright">ตั้งค่าแนะนำเพื่อน</p>
        <label className="block text-xs text-cream/60">เปอร์เซ็นต์ที่ได้เมื่อเพื่อนฝากเงินและอนุมัติแล้ว</label>
        <input
          name="percent"
          type="number"
          min={0}
          max={100}
          step={0.01}
          defaultValue={data.settings.percent}
          className="h-11 w-full rounded-lg bg-navy-deep px-3 text-sm text-cream outline-none"
        />
        <label className="block text-xs text-cream/60">ยอดฝากขั้นต่ำที่คิดค่าแนะนำ (บาท)</label>
        <input
          name="minDeposit"
          type="number"
          min={1}
          step={1}
          defaultValue={data.settings.minDeposit}
          className="h-11 w-full rounded-lg bg-navy-deep px-3 text-sm text-cream outline-none"
        />
        <label className="flex items-center gap-2 text-sm text-cream">
          <input type="checkbox" name="enabled" value="1" defaultChecked={data.settings.enabled} />
          เปิดระบบแนะนำเพื่อน
        </label>
        <button type="submit" className="btn-gold h-11 w-full rounded-lg text-sm">
          บันทึก
        </button>
      </form>

      <h2 className="text-sm font-semibold text-gold-bright">รายการค่าแนะนำล่าสุด</h2>
      <div className="space-y-1.5">
        {data.recent.map((row) => (
          <div key={row.id} className="rounded-xl bg-navy-card px-3 py-2.5 text-sm">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-cream">{row.referrer} ← {row.referred}</div>
                <div className="text-xs text-cream/50">{formatWhen(row.createdAt)} · {row.percent}%</div>
              </div>
              <div className="tabular font-semibold text-win">+{formatBaht(row.amount, 0)}</div>
            </div>
          </div>
        ))}
        {data.recent.length === 0 ? <p className="text-sm text-cream/50">ยังไม่มีรายการ</p> : null}
      </div>
    </div>
  );
}
