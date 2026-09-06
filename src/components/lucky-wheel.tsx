import { useEffect, useState } from "react";
import { getBearerToken } from "@/lib/auth/client";
import { useStore } from "@/lib/store";
import { formatBaht } from "@/lib/format";
import { WinFx } from "@/components/win-fx";
import { GameStage } from "@/components/game-stage";

const ERR: Record<string, string> = {
  login: "กรุณาเข้าสู่ระบบใหม่",
  code: "กรอกโค้ดคูปอง",
  missing: "ไม่พบคูปองนี้",
  used: "คุณใช้คูปองนี้ไปแล้ว",
  expired: "คูปองหมดอายุแล้ว",
  full: "คูปองนี้ถูกใช้ครบแล้ว",
  amount: "คูปองนี้ยังไม่ได้ตั้งยอด",
  fail: "ใช้คูปองไม่สำเร็จ",
};

export function LuckyWheel({ ok, err }: { ok?: string; err?: string }) {
  const wallet = useStore((s) => s.wallet);
  const refresh = useStore((s) => s.refresh);
  const [auth, setAuth] = useState("");
  const got = ok ? Number(ok) : 0;

  useEffect(() => {
    setAuth(getBearerToken() ?? "");
    if (ok) void refresh();
  }, [ok, refresh]);

  return (
    <GameStage
      backTo="/app"
      title="คูปองเครดิตฟรี"
      subtitle="กรอกโค้ดแล้วเครดิตเข้ากระเป๋าทันที"
      dock={
        <form method="POST" action="/api/redeem-coupon" className="mx-auto w-full max-w-md space-y-2">
          <input type="hidden" name="auth" value={auth} />
          <input
            name="code"
            required
            minLength={3}
            maxLength={24}
            placeholder="กรอกโค้ดคูปอง"
            className="h-14 w-full rounded-xl bg-navy-deep px-3 text-center text-lg tracking-[0.2em] uppercase text-cream outline-none shadow-[0_0_0_1px_rgba(201,164,74,0.3)]"
          />
          <button type="submit" className="spin-3d text-base">
            รับเครดิต
          </button>
        </form>
      }
    >
      {got > 0 ? <WinFx show amount={got} /> : null}
      <div className="mx-auto w-full max-w-md rounded-2xl bg-navy-card p-5 text-center shadow-[0_0_0_1px_rgba(201,164,74,0.35)]">
        {wallet ? <p className="tabular text-3xl font-semibold text-gold-bright">฿ {formatBaht(wallet.balance)}</p> : null}
        {err ? <p className="mt-3 rounded-lg bg-red-950/70 px-3 py-2 text-sm text-red-200">{ERR[err] ?? "ใช้คูปองไม่สำเร็จ"}</p> : null}
        {got > 0 ? <p className="mt-3 text-sm font-semibold text-win">รับเครดิต ฿ {got.toLocaleString("th-TH")} แล้ว</p> : null}
        <p className="mt-4 text-xs text-cream/55">กดรับแล้วเครดิตเข้ากระเป๋าทันที</p>
      </div>
    </GameStage>
  );
}
