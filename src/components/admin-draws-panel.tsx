import { AuthHidden } from "@/components/auth-hidden";
import { MARKETS, getMarketState } from "@/lib/lottery";
import type { PostedDraw } from "@/lib/wallet-server";

export function AdminDrawsPanel({
  rows = [],
  ok,
  err,
}: {
  rows?: PostedDraw[];
  ok?: string;
  err?: string;
}) {
  const st = getMarketState("yeekee", new Date());
  const roundKey = st.open ? st.previous?.roundKey ?? st.roundKey : st.roundKey;
  return (
    <div className="space-y-3">
      <p className="text-xs text-cream/55">กรอกผลแล้วกดบันทึก ระบบจะตรวจโพยและจ่ายเครดิตผู้ที่ถูกให้อัตโนมัติ</p>
      {ok ? <p className="rounded-xl bg-emerald-950/70 px-3 py-2 text-center text-sm text-emerald-200">บันทึกผลและจ่ายรางวัลแล้ว</p> : null}
      {err ? (
        <p className="rounded-xl bg-red-950/70 px-3 py-2 text-center text-sm text-red-200">
          {err === "open" ? "รอบนี้ยังเปิดรับแทง" : err === "digits" ? "กรอก 3 ตัวบน และ 2 ตัวล่าง" : "บันทึกไม่สำเร็จ"}
        </p>
      ) : null}

      <form method="POST" action="/api/staff" className="rounded-2xl bg-navy-card px-3 py-3">
        <AuthHidden />
        <input type="hidden" name="action" value="draw" />
        <label className="text-xs text-cream/55">ตลาด</label>
        <select name="marketId" defaultValue="yeekee" className="mt-1 h-11 w-full rounded-xl bg-navy-mid px-3 text-sm text-cream">
          {MARKETS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <label className="mt-3 block text-xs text-cream/55">รหัสงวด</label>
        <input name="roundKey" defaultValue={roundKey} required className="mt-1 h-11 w-full rounded-xl bg-navy-mid px-3 text-sm text-cream outline-none" />
        <label className="mt-3 block text-xs text-cream/55">3 ตัวบน</label>
        <input name="top3" inputMode="numeric" maxLength={3} required placeholder="XXX" className="mt-1 h-12 w-full rounded-xl bg-navy-mid px-3 text-center text-2xl tracking-[0.4em] text-gold-bright outline-none" />
        <label className="mt-3 block text-xs text-cream/55">2 ตัวล่าง</label>
        <input name="bottom2" inputMode="numeric" maxLength={2} required placeholder="XX" className="mt-1 h-12 w-full rounded-xl bg-navy-mid px-3 text-center text-2xl tracking-[0.4em] text-gold-bright outline-none" />
        <button type="submit" className="btn-gold mt-4 h-12 w-full rounded-xl">
          บันทึกผลและจ่ายรางวัล
        </button>
      </form>

      <h2 className="text-sm font-semibold text-gold-bright">ผลที่ประกาศแล้ว</h2>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.roundKey} className="flex items-center justify-between rounded-xl bg-navy-card px-3 py-2 text-sm">
            <div>
              <div className="text-cream">{MARKETS.find((m) => m.id === r.marketId)?.name ?? r.marketId}</div>
              <div className="text-xs text-cream/50">{r.roundKey}</div>
            </div>
            <div className="tabular font-semibold text-gold-bright">
              {r.top3} / {r.bottom2}
            </div>
          </div>
        ))}
        {rows.length === 0 ? <p className="text-sm text-cream/50">ยังไม่มีผลที่แอดมินกรอก</p> : null}
      </div>
    </div>
  );
}
