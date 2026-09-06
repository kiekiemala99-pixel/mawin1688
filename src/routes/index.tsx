import { useEffect } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { GuestShell } from "@/components/guest-shell";
import { LoginForm } from "@/components/login-form";
import { DailyResults, GovResultCard, YeekeeResultCard } from "@/components/result-cards";
import { useNow } from "@/hooks/use-now";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { ARTICLES } from "@/lib/articles";
import { loadHomeDraws } from "@/lib/lottery-draws-server";

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): { loginError?: string; loggedOut?: string } => ({
    ...(s.loginError ? { loginError: String(s.loginError) } : {}),
    ...(s.loggedOut ? { loggedOut: String(s.loggedOut) } : {}),
  }),
  loader: async () => {
    try {
      return await loadHomeDraws();
    } catch {
      return { govDate: "", gov: null };
    }
  },
  errorComponent: () => (
    <main style={{ minHeight: "100dvh", background: "#050b18", color: "#faf6ea", padding: 20, fontFamily: "sans-serif" }}>
      <h1 style={{ color: "#f0d789" }}>มาวิน1688</h1>
      <form method="POST" action="/api/phone-login" style={{ marginTop: 16, display: "grid", gap: 10 }}>
        <input name="phone" required placeholder="เบอร์โทรศัพท์" style={{ height: 48, borderRadius: 8, padding: "0 12px" }} />
        <input name="password" type="password" required placeholder="รหัสผ่าน" style={{ height: 48, borderRadius: 8, padding: "0 12px" }} />
        <button type="submit" style={{ height: 48, borderRadius: 8, background: "#c9a44a", color: "#3a2c0c", fontWeight: 700 }}>
          เข้าสู่ระบบ
        </button>
      </form>
      <p style={{ marginTop: 16 }}>
        <a href="/register" style={{ color: "#f0d789" }}>สมัครสมาชิก</a>
      </p>
    </main>
  ),
  component: Home,
});

function Home() {
  const { loginError, loggedOut } = Route.useSearch();
  const draws = Route.useLoaderData();
  const { user, isPending } = useCurrentUserState();
  const now = useNow(1000);
  const signedIn = Boolean(!loggedOut && !isPending && user);

  useEffect(() => {
    if (!loggedOut) return;
    try {
      window.localStorage.removeItem("grok-auth.bearer-token");
      window.sessionStorage.removeItem("grok-auth.bearer-token");
    } catch {
      /* ignore */
    }
  }, [loggedOut]);

  return (
    <GuestShell>
      {signedIn ? (
        <a
          href="/app"
          className="mb-3 flex h-12 items-center justify-center rounded-xl text-sm font-bold btn-gold"
        >
          คุณล็อกอินอยู่ · เข้าหน้าสมาชิก
        </a>
      ) : null}
      <div className="grid gap-3 lg:grid-cols-2 lg:items-start lg:gap-6">
        <div>
          <LoginForm error={loginError ? "เบอร์โทรหรือรหัสผ่านไม่ถูกต้อง" : undefined} />
          <div className="mt-3 rounded-2xl bg-navy-card px-4 py-3 shadow-[0_0_0_1px_rgba(201,164,74,0.3)]">
            <div className="text-sm font-semibold text-gold-bright">โปรโมชันมาวิน1688</div>
            <p className="mt-1 text-xs text-cream/70">โบนัสฝาก · สมัครใหม่ · คืนยอดเสีย · ตามช่วงเวลา</p>
            <p className="mt-1 text-[11px] text-cream/45">เข้าสู่ระบบแล้วกดรับได้ที่เมนูโปรโมชัน</p>
          </div>
        </div>
        <div className="space-y-3">
          <YeekeeResultCard now={new Date(now)} />
          <GovResultCard now={new Date(now)} official={draws?.gov} />
          <h2 className="px-1 text-sm font-semibold text-gold-bright">ผลหวยอื่น</h2>
          <DailyResults now={new Date(now)} />
          <section className="pt-2">
            <div className="mb-2 flex items-end justify-between px-1">
              <h2 className="text-sm font-semibold text-gold-bright">บทความหวย บอล เว็บตรง</h2>
              <Link to="/articles" className="text-xs text-cream/60">
                ดูทั้งหมด
              </Link>
            </div>
            <ul className="space-y-2">
              {ARTICLES.slice(0, 4).map((a) => (
                <li key={a.slug}>
                  <Link
                    to="/articles/$slug"
                    params={{ slug: a.slug }}
                    className="block rounded-xl bg-navy-card px-3 py-3 shadow-[0_0_0_1px_rgba(201,164,74,0.2)]"
                  >
                    <div className="text-[10px] text-gold-bright">{a.category}</div>
                    <div className="text-sm font-medium text-cream">{a.title}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </GuestShell>
  );
}
