import { useEffect, useState } from "react";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import { MemberShell } from "@/components/member-shell";
import { getAccount, getAccountByToken, type AccountView } from "@/lib/wallet-server";
import { getBearerToken, setBearerToken } from "@/lib/auth/client";
import { useStore } from "@/lib/store";

function GateScreen({ title, sub }: { title: string; sub?: string }) {
  return (
    <div
      className="luxury-bg grid min-h-dvh place-items-center px-4 text-center"
      style={{ minHeight: "100dvh", background: "#050b18", color: "#f0d789", display: "grid", placeItems: "center", textAlign: "center", padding: 16 }}
    >
      <div>
        <div className="font-display text-2xl text-gold-bright" style={{ fontSize: 28, fontWeight: 700 }}>
          มาวิน1688
        </div>
        <div className="mt-3 text-lg text-gold-bright" style={{ marginTop: 12, fontSize: 18 }}>
          {title}
        </div>
        {sub ? (
          <p className="mt-2 text-sm text-cream/70" style={{ marginTop: 8, color: "#faf6ea" }}>
            {sub}
          </p>
        ) : null}
        <div className="mt-5 flex flex-col items-center gap-2" style={{ marginTop: 20 }}>
          <a
            href="/"
            className="btn-gold inline-flex h-11 items-center rounded-lg px-5 text-sm"
            style={{ display: "inline-flex", height: 44, alignItems: "center", borderRadius: 8, padding: "0 20px", background: "#c9a44a", color: "#3a2c0c", fontWeight: 700, textDecoration: "none" }}
          >
            ไปหน้าเข้าสู่ระบบ
          </a>
          <a href="/app" className="inline-flex h-11 items-center rounded-lg bg-navy-card px-5 text-sm text-cream" style={{ display: "inline-flex", height: 44, alignItems: "center", marginTop: 8, color: "#faf6ea" }}>
            ลองเปิดหน้าสมาชิกอีกครั้ง
          </a>
        </div>
      </div>
    </div>
  );
}

function tokenFromSearch(search: unknown, href?: string) {
  if (search && typeof search === "object" && "auth" in search) {
    const auth = (search as { auth?: unknown }).auth;
    if (typeof auth === "string" && auth.length > 8) return auth;
  }
  if (typeof search === "string") {
    const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    return q.get("auth") || undefined;
  }
  if (href) {
    try {
      return new URL(href, "http://local.invalid").searchParams.get("auth") || undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export const Route = createFileRoute("/app")({
  validateSearch: (s: Record<string, unknown>): { auth?: string } => {
    const auth = typeof s.auth === "string" ? s.auth : undefined;
    return auth ? { auth } : {};
  },
  pendingComponent: () => <GateScreen title="กำลังเข้าสู่ระบบ…" sub="รอสักครู่ ถ้าค้างนานให้กลับไปเข้าสู่ระบบใหม่" />,
  errorComponent: ({ error }) => (
    <GateScreen title="เข้าสู่ระบบไม่สำเร็จ" sub={error instanceof Error ? error.message : "ลองเข้าใหม่"} />
  ),
  loader: async ({ location }) => {
    const token =
      tokenFromSearch(location.search, location.href) || tokenFromSearch(location.searchStr);
    try {
      return await Promise.race([
        getAccountByToken({ data: { token } }),
        new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), 4000);
        }),
      ]);
    } catch {
      return null;
    }
  },
  component: AppLayout,
});

function AppLayout() {
  const snap = Route.useLoaderData();
  const search = Route.useSearch();
  const [account, setAccount] = useState<AccountView | null>(snap ?? null);

  useEffect(() => {
    if (search.auth) {
      setBearerToken(search.auth);
      window.history.replaceState({}, "", "/app");
    }
  }, [search.auth]);

  useEffect(() => {
    if (account) {
      useStore.getState().hydrateFromServer(account);
      return;
    }
    const token = search.auth || getBearerToken() || undefined;
    if (!token) return;
    let alive = true;
    const t = window.setTimeout(() => {
      if (alive && !useStore.getState().wallet) setAccount(null);
    }, 5000);
    void getAccount()
      .then((row) => {
        if (!alive || !row) return;
        setAccount(row);
        useStore.getState().hydrateFromServer(row);
      })
      .catch(() => {});
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [account, search.auth]);

  if (account) {
    if (!useStore.getState().wallet) useStore.getState().hydrateFromServer(account);
    return (
      <MemberShell account={account}>
        <Outlet />
      </MemberShell>
    );
  }

  return <GateScreen title="กรุณาเข้าสู่ระบบ" sub="กรอกเบอร์โทรและรหัสผ่าน แล้วระบบจะพาเข้าหน้าสมาชิก" />;
}
