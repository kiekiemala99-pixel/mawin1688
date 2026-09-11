import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowDownToLine, ArrowUpFromLine, Film, Gift, Goal, Sparkles, Ticket, Users } from "lucide-react";
import { useNow } from "@/hooks/use-now";
import { MARKETS, getMarketState } from "@/lib/lottery";
import { type MatchView } from "@/lib/football";
import { listFootballMatches } from "@/lib/football-feed";
import { secondsToClock } from "@/lib/time";
import { StatusPill } from "@/components/result-cards";
import { GoldCard } from "@/components/gold-card";
import { PayoutBoard } from "@/components/payout-board";
import { formatBaht, formatHandicap, formatWhen, staffMessage } from "@/lib/format";
import { useSessionUser, useStore } from "@/lib/store";
import { PLAY_CARDS } from "@/lib/play-catalog";
import { AppErrorComponent } from "@/lib/error-component";

export const Route = createFileRoute("/app/")({
  component: AppHome,
  pendingMs: 200,
  pendingComponent: () => (
    <div className="grid min-h-[50dvh] place-items-center text-center text-gold-bright">
      <p>กำลังโหลดหน้าสมาชิก…</p>
    </div>
  ),
  errorComponent: AppErrorComponent,
});

function AppHome() {
  const now = useNow(1000);
  const date = new Date(now);
  const user = useSessionUser();
  const txns = useStore((s) => s.txns);
  const [live, setLive] = useState<MatchView[]>([]);
  const pendingCash = txns.filter((t) => t.status === "pending" && (t.type === "deposit" || t.type === "withdraw"));
  const adminNotes = txns.filter((t) => staffMessage(t.note)).slice(0, 3);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const rows = await listFootballMatches();
        if (alive) setLive(rows.filter((m) => m.status === "live").slice(0, 3));
      } catch {
        /* keep */
      }
    }
    void load();
    const t = window.setInterval(() => void load(), 60000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, []);

  if (!user) {
    return (
      <div className="rounded-2xl bg-navy-card p-5 text-center">
        <p className="text-gold-bright">กำลังโหลดยอดเงิน…</p>
        <a href="/" className="mt-3 inline-block text-sm text-cream/70">
          กลับหน้าเข้าสู่ระบบ
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl bg-navy-card p-5 shadow-[0_0_0_1px_rgba(201,164,74,0.35)]">
        <p className="text-sm text-cream/60">ยอดเงินคงเหลือของคุณ</p>
        <div className="tabular mt-1 text-3xl font-semibold text-gold-bright">฿ {formatBaht(user.balance)}</div>
        <p className="mt-1 text-xs text-cream/45">
          {user.username} · {user.phone.startsWith("oauth:") ? "โซเชียล" : user.phone}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link
            to="/app/deposit"
            className="flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold btn-gold"
          >
            <ArrowDownToLine className="size-4" />
            ฝากเงิน
          </Link>
          <Link
            to="/app/withdraw"
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-navy-mid text-sm font-semibold text-gold-bright shadow-[0_0_0_1px_rgba(201,164,74,0.3)]"
          >
            <ArrowUpFromLine className="size-4" />
            ถอนเงิน
          </Link>
        </div>
      </div>

      {user.isStaff && (
        <Link
          to="/app/admin"
          className="flex items-center justify-between rounded-xl bg-gold-ink px-4 py-3 text-sm font-semibold text-gold-bright"
        >
          เข้าแผงควบคุมแอดมิน
        </Link>
      )}

      {pendingCash.length > 0 && (
        <Link to="/app/wallet" className="block w-full rounded-xl bg-navy-card px-3 py-3 text-left text-sm text-gold-bright shadow-[0_0_0_1px_rgba(201,164,74,0.25)]">
          มี {pendingCash.length} รายการฝาก/ถอนรอแอดมินตรวจ
          <span className="mt-1 block text-[11px] font-normal text-cream/55">
            ล่าสุด {pendingCash[0] ? new Date(pendingCash[0].createdAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }) : ""}
          </span>
        </Link>
      )}

      {adminNotes.map((t) => (
        <Link
          key={t.id}
          to="/app/wallet"
          className="block w-full rounded-xl bg-navy-card px-3 py-3 text-left text-sm shadow-[0_0_0_1px_rgba(201,164,74,0.25)]"
        >
          <div className="font-semibold text-gold-bright">ข้อความจากแอดมิน</div>
          <div className="mt-1 text-cream/90">{staffMessage(t.note)}</div>
          <div className="mt-1 text-[11px] text-cream/50">
            {t.type === "withdraw" ? "ถอน" : t.type === "deposit" ? "ฝาก" : "ปรับยอด"} · {formatWhen(t.createdAt)}
          </div>
        </Link>
      ))}

      <>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/app/promo"
              className="casino-card col-span-2 rounded-2xl p-4"
            >
              <Gift className="size-6 text-gold-bright" />
              <h3 className="mt-2 font-semibold text-gold-bright">โปรโมชัน</h3>
              <p className="mt-0.5 text-xs text-cream/70">กดรับโบนัสตามโปรโมชันที่เปิดอยู่</p>
            </Link>
            <Link
              to="/app/referral"
              className="casino-card col-span-2 rounded-2xl p-4"
            >
              <Users className="size-6 text-gold-bright" />
              <h3 className="mt-2 font-semibold text-gold-bright">แนะนำเพื่อน</h3>
              <p className="mt-0.5 text-xs text-cream/70">แชร์ลิงก์ แล้วได้ค่าแนะนำเมื่อเพื่อนฝากเงิน</p>
            </Link>
            <a
              href="/movies"
              className="casino-card col-span-2 rounded-2xl p-4"
            >
              <Film className="size-6 text-gold-bright" />
              <h3 className="mt-2 font-semibold text-gold-bright">ดูหนัง</h3>
              <p className="mt-0.5 text-xs text-cream/70">คลังหนัง · แบนเนอร์โปรโมต อัปเดตโดยแอดมิน</p>
            </a>
            <Link
              to="/app/lottery"
              className="casino-card col-span-2 rounded-2xl p-4"
            >
              <Ticket className="size-6 text-gold-bright" />
              <h3 className="mt-2 font-semibold text-gold-bright">แทงหวย</h3>
              <p className="mt-0.5 text-xs text-cream/55">ยี่กี รัฐบาล ฮานอย ลาว · ตลาดหลักของเว็บ</p>
            </Link>
            <Link
              to="/app/football"
              className="casino-card rounded-2xl p-4"
            >
              <Goal className="size-6 text-gold-bright" />
              <h3 className="mt-2 font-semibold text-gold-bright">แทงบอล</h3>
              <p className="mt-0.5 text-xs text-cream/55">1X2 แฮนดิแคป สูงต่ำ</p>
            </Link>
            <Link
              to="/app/lucky"
              className="casino-card col-span-2 rounded-2xl p-4"
            >
              <Sparkles className="size-6 text-gold-bright" />
              <h3 className="mt-2 font-semibold text-gold-bright">คูปองเครดิตฟรี</h3>
              <p className="mt-0.5 text-xs text-cream/70">กรอกโค้ดแล้วรับเครดิตเข้ากระเป๋าทันที</p>
            </Link>
          </div>

          <PayoutBoard />

          <section>
            <div className="mb-2 flex items-end justify-between">
              <h2 className="text-sm font-semibold text-gold-bright">ตลาดหวย</h2>
              <Link to="/app/lottery" className="text-xs text-cream/60">
                ดูทั้งหมด
              </Link>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {MARKETS.map((m) => {
                const st = getMarketState(m.id, date);
                return (
                  <Link
                    key={m.id}
                    to="/app/lottery/$id"
                    params={{ id: m.id }}
                    className="casino-card flex items-center justify-between rounded-2xl px-3 py-3"
                  >
                    <div>
                      <div className="font-semibold text-cream">{m.name}</div>
                      <div className="mt-0.5 text-xs text-cream/55">
                        {st.open ? `ปิดรับใน ${secondsToClock(st.remainingSec)}` : st.label}
                      </div>
                    </div>
                    <StatusPill open={st.open} />
                  </Link>
                );
              })}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-end justify-between">
              <h2 className="text-sm font-semibold text-gold-bright">เกมฮิต</h2>
              <a href="/app/games" className="text-xs text-cream/60">
                ดูทั้งหมด
              </a>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {PLAY_CARDS.map((g) => (
                <a key={g.href} href={g.href} className="overflow-hidden rounded-2xl bg-navy-card shadow-[0_0_0_1px_rgba(201,164,74,0.28)]">
                  <img src={g.cover} alt="" className="slot-poster" loading="lazy" decoding="async" />
                  <div className="px-2 py-2">
                    <div className="truncate text-sm font-semibold text-gold-bright">{g.title}</div>
                    <div className="truncate text-[11px] text-cream/50">{g.sub}</div>
                  </div>
                </a>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-end justify-between">
              <h2 className="text-sm font-semibold text-gold-bright">บอลสด</h2>
              <Link to="/app/football" className="text-xs text-cream/60">
                ราคาบอลทั้งหมด
              </Link>
            </div>
            {live.length === 0 ? (
              <p className="rounded-2xl bg-navy-card px-3 py-4 text-sm text-cream/60">ไม่มีคู่กำลังแข่งในตอนนี้</p>
            ) : (
              <div className="space-y-2">
                {live.map((m) => (
                  <GoldCard key={m.id} className="p-3">
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span>{m.leagueName}</span>
                      <span className="font-semibold text-live">LIVE {m.minute}′</span>
                    </div>
                    <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <div className="font-semibold">{m.home.name}</div>
                      <div className="tabular text-xl font-semibold">
                        {m.homeGoals} - {m.awayGoals}
                      </div>
                      <div className="text-right font-semibold">{m.away.name}</div>
                    </div>
                    <div className="mt-2 text-center text-xs text-muted">
                      HDP {formatHandicap(m.homeLine)} · สูง/ต่ำ {m.overLine}
                    </div>
                  </GoldCard>
                ))}
              </div>
            )}
          </section>
        </>
    </div>
  );
}
