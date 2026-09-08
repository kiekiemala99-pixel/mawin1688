import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { GoldHeader } from "./site-header";

export function GuestShell({ children }: { children: ReactNode }) {
  return (
    <div className="luxury-bg min-h-dvh">
      <GoldHeader />
      <main className="mx-auto w-full max-w-md px-3 pt-3 pb-10 lg:max-w-5xl lg:pt-6">{children}</main>
      <footer className="border-t border-gold/20 px-3 py-6 text-center text-[11px] leading-5 text-cream/45">
        <nav className="mb-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-gold-bright">
          <Link to="/articles">บทความ</Link>
          <Link to="/articles/$slug" params={{ slug: "web-trong-huay-ball-mawin1688" }}>
            เว็บตรง
          </Link>
          <Link to="/articles/$slug" params={{ slug: "huay-yeekee-beginner" }}>
            หวยยี่กี
          </Link>
          <Link to="/articles/$slug" params={{ slug: "tang-ball-1x2-handicap" }}>
            แทงบอล
          </Link>
          <Link to="/rates">อัตราจ่าย</Link>
          <a href="/movies">ดูหนัง</a>
          <Link to="/rules">กติกา</Link>
        </nav>
        <p>มาวิน1688 เว็บตรง หวยออนไลน์ แทงบอล ค่าน้ำ หวยยี่กี หวยรัฐบาล</p>
        <p>บริการสำหรับผู้มีอายุ 20 ปีขึ้นไป</p>
      </footer>
    </div>
  );
}
