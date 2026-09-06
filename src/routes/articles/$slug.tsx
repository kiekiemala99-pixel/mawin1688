import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { GuestShell } from "@/components/guest-shell";
import { GoldCard } from "@/components/gold-card";
import { ARTICLES, getArticle, relatedArticles } from "@/lib/articles";

export const Route = createFileRoute("/articles/$slug")({
  loader: ({ params }) => {
    const article = getArticle(params.slug);
    if (!article) throw notFound();
    return article;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    return {
      meta: [
        { title: `${loaderData.title} | มาวิน1688` },
        { name: "description", content: loaderData.description },
        { name: "keywords", content: loaderData.keywords },
        { property: "og:title", content: loaderData.title },
        { property: "og:description", content: loaderData.description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: loaderData.title },
      ],
    };
  },
  component: ArticlePage,
});

function ArticlePage() {
  const article = Route.useLoaderData();
  const related = relatedArticles(article.slug);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.date,
    inLanguage: "th",
    author: { "@type": "Organization", name: "มาวิน1688" },
    publisher: { "@type": "Organization", name: "มาวิน1688" },
    keywords: article.keywords,
  };

  return (
    <GuestShell>
      <article className="mx-auto max-w-2xl space-y-3">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <GoldCard>
          <p className="text-[10px] font-semibold text-gold-bright">{article.category}</p>
          <h1 className="mt-1 text-xl font-bold leading-snug text-gold-bright">{article.title}</h1>
          <p className="mt-2 text-xs text-cream/50">
            {article.date} · อ่าน {article.readMins} นาที · มาวิน1688
          </p>
          <div className="mt-4 space-y-3 text-sm leading-7 text-cream/85">
            {article.body.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/register" className="btn-gold inline-flex h-10 items-center rounded-lg px-4 text-sm">
              สมัครทดลองเล่น
            </Link>
            <Link to="/articles" className="inline-flex h-10 items-center rounded-lg bg-navy-mid px-4 text-sm text-cream">
              บทความทั้งหมด
            </Link>
          </div>
        </GoldCard>
        <section>
          <h2 className="mb-2 text-sm font-semibold text-gold-bright">อ่านต่อ</h2>
          <ul className="space-y-2">
            {related.map((a) => (
              <li key={a.slug}>
                <Link
                  to="/articles/$slug"
                  params={{ slug: a.slug }}
                  className="block rounded-xl bg-navy-card px-3 py-3 text-sm text-cream shadow-[0_0_0_1px_rgba(201,164,74,0.18)]"
                >
                  <span className="text-[10px] text-gold-bright">{a.category}</span>
                  <span className="mt-0.5 block font-medium">{a.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <nav className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-cream/50">
          {ARTICLES.map((a) => (
            <Link key={a.slug} to="/articles/$slug" params={{ slug: a.slug }} className="hover:text-gold-bright">
              {a.category}
            </Link>
          ))}
        </nav>
      </article>
    </GuestShell>
  );
}
