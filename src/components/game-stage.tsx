import type { ReactNode } from "react";
import { formatBaht } from "@/lib/format";
import { useSessionUser } from "@/lib/store";

export function GameStage({
  backTo,
  title,
  subtitle,
  extraHud,
  bg,
  children,
  dock,
  boardClass,
}: {
  backTo: string;
  title: string;
  subtitle?: string;
  extraHud?: ReactNode;
  bg?: string;
  children: ReactNode;
  dock?: ReactNode;
  boardClass?: string;
}) {
  const user = useSessionUser();
  return (
    <div className="game-stage">
      {bg ? <img src={bg} alt="" className="game-stage-bg" /> : null}
      <header className="game-hud">
        <a href={backTo} className="game-hud-btn" aria-label="ย้อนกลับ">
          ←
        </a>
        <div className="min-w-0 flex-1 text-center">
          <div className="truncate text-sm font-bold tracking-wide text-gold-bright">{title}</div>
          {subtitle ? <div className="truncate text-[11px] text-cream/55">{subtitle}</div> : null}
          <div className="tabular text-base font-semibold text-cream">฿ {formatBaht(user?.balance ?? 0)}</div>
        </div>
        {extraHud ?? <span className="game-hud-btn invisible" aria-hidden />}
      </header>
      <div className={boardClass ?? "game-board"}>{children}</div>
      {dock ? <div className="game-dock">{dock}</div> : null}
    </div>
  );
}

export function isPlayPath(pathname: string) {
  return (
    /^\/app\/lottery\/[^/]+/.test(pathname) ||
    pathname === "/app/football" ||
    pathname === "/app/football/" ||
    pathname === "/app/lucky" ||
    pathname === "/app/lucky/" ||
    /^\/app\/slot\/[^/]+/.test(pathname) ||
    /^\/app\/games\/[^/]+/.test(pathname)
  );
}
