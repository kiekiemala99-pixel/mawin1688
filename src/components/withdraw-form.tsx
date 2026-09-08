import { GoldCard } from "@/components/gold-card";
import { useSessionUser } from "@/lib/store";
import { formatBaht } from "@/lib/format";
import { getBearerToken } from "@/lib/auth/client";

const MIN_WITHDRAW = 100;
const AMOUNTS = [100, 300, 500, 1000, 3000, 5000, 10000];

const ERR: Record<string, string> = {
  login: "กรุณาเข้าสู่ระบบใหม่แล้วลองถอนอีกครั้ง",
  min: "ถอนขั้นต่ำ 100 บาท",
  credit: "เครดิตไม่พอ",
  turn: "ยังทำเทิร์นยอดเครดิตไม่ครบ ถอนยังไม่ได้",
  fail: "ส่งคำขอถอนไม่สำเร็จ ลองใหม่อีกครั้ง",
};

export function WithdrawForm({ result }: { result?: { ok?: string; err?: string } }) {
  const user = useSessionUser();
  const token = getBearerToken() ?? "";
  const errText = result?.err ? ERR[result.err] || "ส่งคำขอถอนไม่สำเร็จ" : "";

  return (
    <GoldCard>
      <div className="text-center text-sm text-muted">เครดิตในบัญชี</div>
      <div className="tabular mt-1 text-center text-3xl font-semibold text-gold-deep">
        ฿ {formatBaht(user?.balance ?? 0)}
      </div>
      <p className="mt-2 rounded-lg bg-gold-ink/10 px-3 py-2 text-center text-sm font-semibold text-gold-deep">
        ถอนขั้นต่ำ 100 บาท
      </p>
      {user && user.turnoverRemain > 0 ? (
        <div className="mt-3 rounded-xl bg-navy-deep/40 px-3 py-2 text-sm">
          <div className="flex justify-between text-xs text-cream/70">
            <span>เทิร์นยอดเครดิตที่ต้องทำ</span>
            <span className="tabular text-gold-bright">
              ฿ {formatBaht(user.turnoverDone, 0)} / {formatBaht(user.turnoverNeed, 0)}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-navy-mid">
            <div
              className="h-full rounded-full bg-gold-bright"
              style={{ width: `${Math.min(100, (user.turnoverDone / Math.max(1, user.turnoverNeed)) * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-cream/55">
            เหลืออีก ฿ {formatBaht(user.turnoverRemain, 0)} จึงจะถอนได้ · นับยอดเงินที่เล่น ไม่สนได้เสีย
          </p>
        </div>
      ) : null}
      {result?.ok ? (
        <p className="mt-3 rounded-lg bg-green-900/40 px-3 py-2 text-center text-sm font-semibold text-green-100">
          ส่งคำขอถอนแล้ว · รอแอดมินตรวจบัญชี
          <span className="mt-1 block text-[11px] font-normal text-green-100/80">
            เวลาแจ้ง {new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })}
          </span>
        </p>
      ) : null}
      {errText ? (
        <p className="mt-3 rounded-lg bg-red-950/70 px-3 py-2 text-center text-sm font-semibold text-red-100">{errText}</p>
      ) : null}

      <form id="withdraw-form" className="mt-4" method="POST" action="/api/withdraw">
        <input type="hidden" name="auth" id="withdraw-auth" defaultValue={token} />
        <div className="flex flex-wrap gap-1.5">
          {AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              className="h-10 min-w-16 rounded-lg bg-cream-deep px-2 text-sm font-semibold text-ink"
              onClick={(e) => {
                const input = e.currentTarget.form?.querySelector<HTMLInputElement>('input[name="amount"]');
                if (input) input.value = String(a);
              }}
            >
              {a.toLocaleString("th-TH")}
            </button>
          ))}
        </div>
        <label className="mt-3 block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">หรือพิมพ์จำนวนเอง</span>
          <div className="flex h-14 items-center rounded-xl bg-white px-3 shadow-[0_0_0_2px_rgba(201,164,74,0.55)]">
            <span className="pr-2 text-lg font-semibold text-gold-deep">฿</span>
            <input
              name="amount"
              type="number"
              inputMode="numeric"
              min={MIN_WITHDRAW}
              step="1"
              required
              placeholder="พิมพ์จำนวน เช่น 100"
              className="h-full min-w-0 flex-1 bg-transparent text-lg font-semibold text-ink outline-none"
            />
            <span className="pl-2 text-sm text-muted">บาท</span>
          </div>
        </label>
        <p className="mt-3 text-sm text-muted">
          ถอนเข้า {user?.bankName || "-"} {user?.bankAccount || ""} · ขั้นต่ำ 100 บาท · แอดมินยืนยันโอนแล้วระบบจะตัดเครดิตให้
        </p>
        <button type="submit" className="btn-gold mt-4 h-12 w-full rounded-xl">
          ส่งคำขอถอน
        </button>
      </form>
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=sessionStorage.getItem("grok-auth.bearer-token")||localStorage.getItem("grok-auth.bearer-token")||new URLSearchParams(location.search).get("auth")||"";var el=document.getElementById("withdraw-auth");if(el&&t)el.value=t;}catch(e){}})();`,
        }}
      />
    </GoldCard>
  );
}
