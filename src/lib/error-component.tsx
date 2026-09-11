import { useEffect } from "react";
import type { ErrorComponentProps } from "@tanstack/react-router";

function isModuleFail(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  return /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module/i.test(msg);
}

export function AppErrorComponent({ error }: ErrorComponentProps) {
  const moduleFail = isModuleFail(error);

  useEffect(() => {
    if (!moduleFail || typeof window === "undefined") return;
    const key = "mawin-module-reload";
    const n = Number(sessionStorage.getItem(key) || "0");
    if (n >= 2) return;
    sessionStorage.setItem(key, String(n + 1));
    window.setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.set("_", String(Date.now()));
      window.location.replace(url.pathname + url.search);
    }, 350);
  }, [moduleFail]);

  return (
    <main className="luxury-bg grid min-h-dvh place-items-center px-6 text-center text-cream">
      <div className="max-w-md space-y-3">
        <div className="font-display text-2xl text-gold-bright">มาวิน1688</div>
        <h1 className="text-lg font-semibold">{moduleFail ? "กำลังโหลดหน้าใหม่…" : "โหลดหน้าไม่สำเร็จ"}</h1>
        <p className="text-sm break-words text-cream/70">
          {moduleFail ? "ระบบกำลังเปิดหน้าใหม่อัตโนมัติ" : error instanceof Error ? error.message : "ระบบทำงานไม่สำเร็จ"}
        </p>
        <a href="/app" className="btn-gold inline-flex h-11 items-center rounded-lg px-5 text-sm">
          เข้าสู่ระบบสมาชิก
        </a>
      </div>
    </main>
  );
}
