import { Link, createFileRoute } from "@tanstack/react-router";
import { GuestShell } from "@/components/guest-shell";
import { allArticleTags, articleTags, articlesByTag } from "@/lib/articles";

export const Route = createFileRoute("/articles/")({
  validateSearch: (s: Record<string, unknown>): { tag?: string } => ({
    ...(typeof s.tag === "string" && s.tag.trim() ? { tag: s.tag.trim() } : {}),
  }),
  head: () => ({
    meta: [
      { title: "บทความหวย บอล สล็อต แท็กกำลังฮิต | มาวิน1688" },
      {
        name: "description",
        content:
          "คลังบทความมาวิน1688 แท็กเลขเด็ด หวยลาววันนี้ ผลบอลสด สล็อตแตกง่าย ทรูวอเลท เครดิตฟรี เว็บตรง",
      },
      {
        name: "keywords",
        content: "เลขเด็ดงวดนี้, หวยลาววันนี้, ผลบอลสด, สล็อตแตกง่าย, เครดิตฟรี, มาวิน1688",
      },
    ],
  }),
  component: ArticlesIndex,
});

function ArticlesIndex() {
  const { tag } = Route.useSearch();
  const rows = articlesByTag(tag);
  const tags = allArticleTags();
  return (
    <GuestShell>
      <article className="mx-auto max-w-2xl space-y-3">
        <header>
          <p className="text-xs font-semibold text-gold-bright">คู่มือและบทความ</p>
          <h1 className="mt-1 text-2xl font-bold text-gold-bright">หวย บอล สล็อต กำลังฮิต</h1>
          <p className="mt-2 text-sm leading-relaxed text-cream/70">
            รวมบทความมาวิน1688 พร้อมแท็กคำค้นยอดฮิต กดแท็กเพื่อกรองเรื่องที่เกี่ยวข้อง
          </p>
        </header>
        <div className="flex flex-wrap gap-1.5">
          <Link
            to="/articles"
            className={`rounded-full px-3 py-1 text-[11px] ${tag ? "bg-navy-card text-cream/70" : "bg-gold-ink text-gold-bright"}`}
          >
            ทั้งหมด
          </Link>
          {tags.map((t) => (
            <Link
              key={t}
              to="/articles"
              search={{ tag: t }}
              className={`rounded-full px-3 py-1 text-[11px] ${tag === t ? "bg-gold-ink text-gold-bright" : "bg-navy-card text-cream/70"}`}
            >
              #{t}
            </Link>
          ))}
        </div>
        <ul className="space-y-3">
          {rows.map((a) => (
            <li key={a.slug}>
              <Link
                to="/articles/$slug"
                params={{ slug: a.slug }}
                className="block rounded-2xl bg-navy-card p-4 shadow-[0_0_0_1px_rgba(201,164,74,0.22)]"
              >
                <div className="text-[10px] font-semibold text-gold-bright">{a.category}</div>
                <h2 className="mt-1 text-base font-semibold text-cream">{a.title}</h2>
                <p className="mt-1 text-xs leading-5 text-cream/60">{a.description}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {articleTags(a).map((t) => (
                    <span key={t} className="rounded-full bg-navy-mid px-2 py-0.5 text-[10px] text-gold-bright">
                      #{t}
                    </span>
                  ))}
                </div>
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
