import { GoldCard } from "@/components/gold-card";
import { useSessionUser } from "@/lib/store";
import { formatBaht } from "@/lib/format";
import { getBearerToken } from "@/lib/auth/client";

const AMOUNTS = [1, 50, 100, 300, 500, 1000, 3000, 5000];
const TRUEWALLET = "0954515360";

const ERR: Record<string, string> = {
  login: "กรุณาเข้าสู่ระบบใหม่แล้วลองฝากอีกครั้ง",
  amount: "ฝากขั้นต่ำ 1 บาท",
  slip: "กรุณาแนบรูปสลิปการโอน",
  big: "สลิปใหญ่ไป แนะนำแคปหน้าจอสลิปแล้วแนบใหม่",
  fail: "ส่งสลิปไม่สำเร็จ ลองใหม่อีกครั้ง",
};

export function DepositForm({
  result,
}: {
  result?: { ok?: string; err?: string; amount?: number; method?: string };
}) {
  const user = useSessionUser();
  const token = getBearerToken() ?? "";
  const errText = result?.err ? ERR[result.err] || "ส่งสลิปไม่สำเร็จ" : "";
  const amount = Number(result?.amount || 0);
  const methodRaw = String(result?.method || "");
  const method = methodRaw === "tm" ? "ทรูมันนี่" : methodRaw === "pp" ? "พร้อมเพย์" : "";
  const confirmed = amount >= 1 && Boolean(method) && !result?.ok;

  return (
    <GoldCard>
      <div className="text-center text-sm text-muted">ยอดเครดิตปัจจุบัน</div>
      <div className="tabular mt-1 text-center text-3xl font-semibold text-gold-deep">
        ฿ {formatBaht(user?.balance ?? 0)}
      </div>
      <p className="mt-2 rounded-lg bg-gold-ink/10 px-3 py-2 text-center text-sm font-semibold text-gold-deep">
        ฝากขั้นต่ำ 1 บาท
      </p>
      {result?.ok ? (
        <p className="mt-3 rounded-lg bg-green-900/40 px-3 py-2 text-center text-sm font-semibold text-green-100">
          ส่งสลิปแล้ว · รอแอดมินอนุมัติก่อนเข้าเครดิต
          <span className="mt-1 block text-[11px] font-normal text-green-100/80">
            เวลาแจ้ง {new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })}
          </span>
        </p>
      ) : null}
      {errText ? (
        <p className="mt-3 rounded-lg bg-red-950/70 px-3 py-2 text-center text-sm font-semibold text-red-100">{errText}</p>
      ) : null}

      {!confirmed ? (
        <form method="GET" action="/app/deposit" className="mt-4">
          <p className="text-sm font-semibold text-ink">ช่องทางฝาก</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <label className="pay-channel">
              <input type="radio" name="method" value="pp" defaultChecked={method !== "ทรูมันนี่"} />
              <span>พร้อมเพย์</span>
            </label>
            <label className="pay-channel">
              <input type="radio" name="method" value="tm" defaultChecked={method === "ทรูมันนี่"} />
              <span>ทรูวอเลท</span>
            </label>
          </div>
          <p className="mt-4 text-sm font-semibold text-ink">จำนวนเงิน · ขั้นต่ำ 1 บาท</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
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
                {a === 1 ? "1 บาท" : a.toLocaleString("th-TH")}
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
                min={1}
                step="1"
                required
                defaultValue={amount >= 1 ? String(amount) : ""}
                placeholder="พิมพ์ตัวเลข เช่น 1"
                className="h-full min-w-0 flex-1 bg-transparent text-lg font-semibold text-ink outline-none"
              />
              <span className="pl-2 text-sm text-muted">บาท</span>
            </div>
          </label>
          <button type="submit" className="btn-gold mt-4 h-12 w-full rounded-xl">
            ยืนยันยอดฝาก
          </button>
        </form>
      ) : (
        <form id="deposit-form" className="mt-4" method="POST" action="/api/deposit" encType="multipart/form-data">
          <input type="hidden" name="auth" id="deposit-auth" defaultValue={token} />
          <input type="hidden" name="method" value={method} />
          <input type="hidden" name="amount" value={String(amount)} />
          <p className="text-center text-sm font-semibold text-ink">
            โอน {amount.toLocaleString("th-TH")} บาท
            {method === "ทรูมันนี่" ? " ผ่านทรูวอเลท" : " ผ่านพร้อมเพย์"}
          </p>
          {method === "ทรูมันนี่" ? (
            <div className="mt-4 rounded-2xl bg-cream px-4 py-4 text-center">
              <div className="text-xs text-muted">ทรูวอเลท</div>
              <div className="tabular mt-1 text-2xl font-semibold tracking-wide text-gold-deep">{TRUEWALLET}</div>
              <p className="mt-1 text-xs text-muted">โอนเข้าเบอร์นี้แล้วแนบสลิปด้านล่าง</p>
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-2xl bg-white p-4">
              <img src="/promptpay-qr.jpg" alt="QR พร้อมเพย์" className="mx-auto w-full max-w-[280px] object-contain" />
            </div>
          )}
          <label className="relative mt-3 flex h-28 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gold/50 bg-cream text-sm text-muted">
            <input
              type="file"
              name="slip"
              required
              accept="image/*,.heic,.heif,image/heic,image/heif"
              className="absolute inset-0 z-10 cursor-pointer opacity-0"
            />
            แตะเพื่อแนบสลิปการโอนเงิน
            <span className="text-[11px]">แนะนำแคปหน้าจอสลิป</span>
          </label>
          <button type="submit" className="btn-gold mt-3 h-12 w-full rounded-xl">
            ส่งสลิปฝากเงิน
          </button>
          <a href="/app/deposit" className="mt-2 block h-10 text-center text-sm leading-10 text-muted">
            เปลี่ยนช่องทางหรือจำนวน
          </a>
        </form>
      )}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=sessionStorage.getItem("grok-auth.bearer-token")||localStorage.getItem("grok-auth.bearer-token")||new URLSearchParams(location.search).get("auth")||"";var el=document.getElementById("deposit-auth");if(el&&t)el.value=t;}catch(e){}})();`,
        }}
      />
    </GoldCard>
  );
}
