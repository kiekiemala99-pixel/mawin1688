import { PLAY_TYPES } from "@/lib/lottery";

const FOOTBALL_ROWS = [
  { title: "1X2 เจ้าบ้าน / เสมอ / เยือน", pay: "จ่ายตามราคา", example: "ราคา 1.90 แทง 100 ได้ 190" },
  { title: "แฮนดิแคป (ต่อลูก)", pay: "จ่ายตามราคาที่กด", example: "ชนะเต็มได้เต็ม · ชนะครึ่งได้ครึ่ง" },
  { title: "สูง / ต่ำ", pay: "จ่ายตามราคาที่กด", example: "แทง 100 ราคา 0.90 ได้กำไร 90" },
];

function exampleWin(rate: number, stake = 10) {
  const raw = stake * rate;
  return Number.isInteger(raw) ? raw.toLocaleString("th-TH") : raw.toLocaleString("th-TH", { maximumFractionDigits: 1 });
}

export function PayoutTicker() {
  return (
    <div className="overflow-hidden rounded-xl bg-gold-ink px-2 py-2 shadow-[0_0_24px_rgba(201,164,74,0.28)]">
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {PLAY_TYPES.map((p) => (
          <div
            key={p.id}
            className="flex min-w-[5.6rem] shrink-0 flex-col items-center rounded-lg bg-navy-deep/55 px-2 py-1.5"
          >
            <span className="text-[10px] font-semibold text-gold-bright/90">{p.label}</span>
            <span className="tabular text-lg font-black leading-none text-gold-bright">1:{p.rate}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LotteryPayoutBoard() {
  return (
    <section className="overflow-hidden rounded-2xl bg-navy-card shadow-[0_0_0_1px_rgba(201,164,74,0.4)]">
      <div className="bg-gradient-to-r from-gold-ink via-amber-700 to-gold-ink px-3 py-2.5 text-center">
        <h2 className="text-sm font-black tracking-wide text-gold-bright">อัตราจ่ายหวยทุกตลาด</h2>
        <p className="text-[11px] text-cream/80">ยี่กี รัฐบาล ฮานอย ลาว หุ้น · เรทเดียวกันทั้งเว็บ</p>
      </div>
      <div className="grid grid-cols-3 gap-1.5 p-2.5">
        {PLAY_TYPES.map((p) => (
          <div key={p.id} className="rounded-xl bg-navy-deep px-1.5 py-2.5 text-center shadow-[inset_0_0_0_1px_rgba(201,164,74,0.28)]">
            <div className="text-[11px] font-semibold text-cream/75">{p.label}</div>
            <div className="tabular mt-0.5 text-2xl font-black leading-none text-gold-bright">{p.rate}</div>
            <div className="mt-1 text-[10px] text-cream/50">แทง 10 ได้ {exampleWin(p.rate)}</div>
          </div>
        ))}
      </div>
      <p className="border-t border-gold/20 px-3 py-2 text-center text-[11px] leading-4 text-cream/70">
        ตัวอย่าง แทง 3 ตัวบน 10 บาท ถูกได้ <span className="font-bold text-gold-bright">9,000 บาท</span>
      </p>
    </section>
  );
}

export function FootballPayoutBoard() {
  return (
    <section className="overflow-hidden rounded-2xl bg-navy-card shadow-[0_0_0_1px_rgba(201,164,74,0.4)]">
      <div className="bg-gradient-to-r from-navy-mid via-navy-card to-navy-mid px-3 py-2.5 text-center">
        <h2 className="text-sm font-black tracking-wide text-gold-bright">อัตราจ่ายฟุตบอล</h2>
        <p className="text-[11px] text-cream/80">จ่ายตามราคาที่กดบนบิล · ไม่มีกินค่าน้ำแอบแฝง</p>
      </div>
      <div className="space-y-1.5 p-2.5">
        {FOOTBALL_ROWS.map((row) => (
          <div key={row.title} className="rounded-xl bg-navy-deep px-3 py-2.5 shadow-[inset_0_0_0_1px_rgba(201,164,74,0.22)]">
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm font-semibold text-cream">{row.title}</div>
              <div className="shrink-0 rounded-full bg-gold-ink px-2 py-0.5 text-[10px] font-bold text-gold-bright">
                {row.pay}
              </div>
            </div>
            <p className="mt-1 text-[11px] text-cream/60">{row.example}</p>
          </div>
        ))}
      </div>
      <p className="border-t border-gold/20 px-3 py-2 text-center text-[11px] leading-4 text-cream/70">
        ชนะครึ่งได้ครึ่ง · แพ้ครึ่งเสียครึ่ง · เสมอยกเลิกคืนเครดิต
      </p>
    </section>
  );
}

export function PayoutBoard() {
  return (
    <div className="space-y-3">
      <LotteryPayoutBoard />
      <FootballPayoutBoard />
    </div>
  );
}
