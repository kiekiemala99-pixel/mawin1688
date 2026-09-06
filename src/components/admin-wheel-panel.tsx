import { useEffect, useState } from "react";
import { getBearerToken } from "@/lib/auth/client";
import { formatBaht } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CouponView, WheelSpinView } from "@/lib/wheel-server";

const ERR: Record<string, string> = {
  login: "กรุณาเข้าสู่ระบบใหม่",
  staff: "บัญชีนี้ไม่ใช่แอดมิน",
  code: "โค้ดต้องมีอย่างน้อย 3 ตัว",
  amount: "ตั้งยอดเครดิตอย่างน้อย 1 บาท",
  dup: "โค้ดนี้มีอยู่แล้ว",
  fail: "สร้างคูปองไม่สำเร็จ",
};

export function AdminWheelPanel({
  coupons = [],
  history = [],
  ok,
  err,
}: {
  coupons?: CouponView[];
  history?: WheelSpinView[];
  ok?: string;
  err?: string;
}) {
  const [tab, setTab] = useState<"coupons" | "history">("coupons");
  const [auth, setAuth] = useState("");

  useEffect(() => {
    setAuth(getBearerToken() ?? "");
  }, []);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1">
        <button type="button" onClick={() => setTab("coupons")} className={cn("h-10 rounded-lg text-sm font-medium", tab === "coupons" ? "btn-gold" : "bg-navy-card text-cream/80")}>
          คูปอง
        </button>
        <a href="/app/admin/wheel?tab=history" className={cn("grid h-10 place-items-center rounded-lg text-sm font-medium", tab === "history" ? "btn-gold" : "bg-navy-card text-cream/80")} onClick={(e) => { e.preventDefault(); setTab("history"); }}>
          ประวัติรับ
        </a>
      </div>

      {ok ? (
        <p className="rounded-xl bg-emerald-950/70 px-3 py-2 text-center text-sm font-medium text-emerald-200">
          {ok === "deleted" ? "ลบคูปองแล้ว" : "สร้างคูปองสำเร็จ"}
        </p>
      ) : null}
      {err ? (
        <p className="rounded-xl bg-red-950/70 px-3 py-2 text-center text-sm font-medium text-red-200">{ERR[err] ?? "ทำรายการไม่สำเร็จ"}</p>
      ) : null}

      {tab !== "history" && (
        <div className="space-y-3">
          <form method="POST" action="/api/staff-coupon" className="space-y-2 rounded-2xl bg-navy-card p-4">
            <input type="hidden" name="auth" value={auth} />
            <script
              dangerouslySetInnerHTML={{
                __html:
                  "try{var t=localStorage.getItem('grok-auth.bearer-token')||sessionStorage.getItem('grok-auth.bearer-token');if(t){document.querySelectorAll('input[name=auth]').forEach(function(i){i.value=t})}}catch(e){}",
              }}
            />
            <input type="hidden" name="action" value="create" />
            <p className="text-sm font-semibold text-gold-bright">สร้างคูปองเครดิตฟรี</p>
            <p className="text-[11px] text-cream/55">สมาชิกกรอกโค้ดแล้วได้เครดิตทันที</p>
            <input name="code" required minLength={3} maxLength={24} placeholder="โค้ด เช่น MAWIN123" className="h-10 w-full rounded-lg bg-navy-deep px-3 text-sm uppercase text-cream outline-none" />
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-cream/70">
                เครดิตที่ได้รับ (บาท)
                <input name="amount" type="number" min={1} step={1} defaultValue={10} required className="mt-1 h-10 w-full rounded-lg bg-navy-deep px-3 text-sm text-cream outline-none" />
              </label>
              <label className="text-xs text-cream/70">
                จำกัดจำนวนคน (0 = ไม่จำกัด)
                <input name="maxClaims" type="number" min={0} step={1} defaultValue={0} className="mt-1 h-10 w-full rounded-lg bg-navy-deep px-3 text-sm text-cream outline-none" />
              </label>
            </div>
            <input name="note" maxLength={120} placeholder="หมายเหตุ" className="h-10 w-full rounded-lg bg-navy-deep px-3 text-sm text-cream outline-none" />
            <button type="submit" className="btn-gold h-11 w-full rounded-xl text-sm">
              สร้างคูปอง
            </button>
          </form>

          {coupons.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-xl bg-navy-card px-3 py-3">
              <div>
                <div className="font-semibold tracking-widest text-gold-bright">{c.code}</div>
                <div className="text-[11px] text-cream/55">
                  รับ ฿ {formatBaht(c.amount, 0)} · ใช้แล้ว {c.claimed}
                  {c.maxClaims > 0 ? `/${c.maxClaims}` : ""} คน
                  {c.note ? ` · ${c.note}` : ""}
                </div>
              </div>
              <form method="POST" action="/api/staff-coupon">
                <input type="hidden" name="auth" value={auth} />
                <input type="hidden" name="action" value="delete" />
                <input type="hidden" name="id" value={c.id} />
                <button type="submit" className="text-xs text-lose">
                  ลบ
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-1.5">
          {history.length === 0 && <p className="rounded-2xl bg-navy-card px-3 py-6 text-center text-sm text-cream/60">ยังไม่มีคนกรอกคูปอง</p>}
          {history.map((h) => (
            <div key={h.id} className="flex items-center justify-between rounded-xl bg-navy-card px-3 py-2.5 text-sm">
              <div>
                <div className="font-medium text-cream">{h.username}</div>
                <div className="text-[11px] text-cream/55">
                  {h.label} · {h.phone}
                </div>
              </div>
              <div className="tabular text-gold-bright">+฿ {formatBaht(h.amount, 0)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
