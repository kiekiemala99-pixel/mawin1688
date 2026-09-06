import { Link, createFileRoute } from "@tanstack/react-router";
import { GuestShell } from "@/components/guest-shell";
import { ARTICLES } from "@/lib/articles";

export const Route = createFileRoute("/articles/")({
  head: () => ({
    meta: [
      { title: "บทความหวย บอล เว็บตรง | มาวิน1688" },
      {
        name: "description",
        content:
          "คลังบทความมาวิน1688 เว็บตรงหวยออนไลน์ แทงบอล ค่าน้ำ หวยยี่กี หวยรัฐบาล และโปรโมชัน อ่านฟรี เข้าใจง่าย",
      },
      {
        name: "keywords",
        content: "บทความหวย, แทงบอลออนไลน์, เว็บตรง, มาวิน1688, หวยยี่กี",
      },
    ],
  }),
  component: ArticlesIndex,
});

function ArticlesIndex() {
  return (
    <GuestShell>
      <article className="mx-auto max-w-2xl space-y-3">
        <header>
          <p className="text-xs font-semibold text-gold-bright">คู่มือและบทความ</p>
          <h1 className="mt-1 text-2xl font-bold text-gold-bright">หวย บอล เว็บตรง</h1>
          <p className="mt-2 text-sm leading-relaxed text-cream/70">
            รวมบทความมาวิน1688 เรื่องเว็บตรง หวยออนไลน์ แทงบอล ค่าน้ำ และโปรโมชัน
          </p>
        </header>
        <ul className="space-y-3">
          {ARTICLES.map((a) => (
            <li key={a.slug}>
              <Link
                to="/articles/$slug"
                params={{ slug: a.slug }}
                className="block rounded-2xl bg-navy-card p-4 shadow-[0_0_0_1px_rgba(201,164,74,0.22)]"
              >
                <div className="text-[10px] font-semibold text-gold-bright">{a.category}</div>
                <h2 className="mt-1 text-base font-semibold text-cream">{a.title}</h2>
                <p className="mt-1 text-xs leading-5 text-cream/60">{a.description}</p>
                <p className="mt-2 text-[11px] text-cream/45">
                  {a.date} · อ่าน {a.readMins} นาที
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </article>
    </GuestShell>
  );
}
