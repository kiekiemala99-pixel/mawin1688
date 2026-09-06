import { AuthHidden } from "@/components/auth-hidden";
import { formatBaht } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { StaffCashItem } from "@/lib/wallet-server";

export function CashQueue({
  type,
  queue = [],
  ok,
  err,
}: {
  type: "deposit" | "withdraw";
  queue?: StaffCashItem[];
  ok?: string;
  err?: string;
}) {
  const rows = queue.filter((item) => item.type === type);
  return (
    <div className="space-y-3">
      {ok ? <p className="rounded-xl bg-emerald-950/70 px-3 py-2 text-center text-sm text-emerald-200">ทำรายการแล้ว</p> : null}
      {err ? <p className="rounded-xl bg-red-950/70 px-3 py-2 text-center text-sm text-red-200">ทำรายการไม่สำเร็จ</p> : null}
      {rows.length === 0 ? (
        <p className="rounded-2xl bg-navy-card px-4 py-6 text-center text-sm text-cream/60">ไม่มีรายการรอตรวจสอบ</p>
      ) : (
        rows.map((item) => (
          <article key={item.id} className="rounded-2xl bg-navy-card px-3 py-3 shadow-[0_0_0_1px_rgba(201,164,74,0.22)]">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold text-cream">
                  {item.type === "deposit" ? "ฝาก" : "ถอน"} · {item.username}
                </div>
                <div className="mt-0.5 text-xs text-cream/55">
                  {item.phone}
                  {item.method ? ` · ${item.method}` : ""}
                </div>
                {item.type === "withdraw" ? (
                  <div className="mt-2 rounded-lg bg-navy-mid px-2.5 py-2 text-xs text-cream/85">
                    <div>โอนเข้า {item.bankName || "ธนาคารที่ลงทะเบียน"}</div>
                    <div className="tabular mt-0.5 text-sm font-semibold text-gold-bright">{item.bankAccount || "-"}</div>
                  </div>
                ) : null}
                {item.note ? <div className="mt-1 text-xs text-cream/70">{item.note}</div> : null}
              </div>
              <div className={cn("tabular text-lg font-semibold", item.type === "deposit" ? "text-win" : "text-lose")}>
                {item.type === "deposit" ? "+" : "-"}
                {formatBaht(item.amount, 0)}
              </div>
            </div>
            {item.hasSlip ? <p className="mt-2 text-xs text-gold-bright">มีสลิปแนบในระบบ</p> : null}
            <div className="mt-3 flex gap-2">
              <form method="POST" action="/api/staff" className="flex-1">
                <AuthHidden />
                <input type="hidden" name="action" value="cash" />
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="type" value={item.type} />
                <input type="hidden" name="decide" value="approve" />
                <button type="submit" className="btn-gold h-11 w-full rounded-lg text-sm">
                  {item.type === "withdraw" ? "ยืนยันโอนออก" : "อนุมัติเข้าเครดิต"}
                </button>
              </form>
              <form method="POST" action="/api/staff" className="flex-1">
                <AuthHidden />
                <input type="hidden" name="action" value="cash" />
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="type" value={item.type} />
                <input type="hidden" name="decide" value="reject" />
                <button type="submit" className="h-11 w-full rounded-lg bg-lose/20 text-sm font-semibold text-lose">
                  ปฏิเสธ
                </button>
              </form>
            </div>
          </article>
        ))
      )}
    </div>
  );
}
