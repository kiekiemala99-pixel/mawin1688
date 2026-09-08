import { createFileRoute } from "@tanstack/react-router";
import { ARTICLES } from "@/lib/articles";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const origin = new URL(request.url).origin;
        const paths = [
          "/",
          "/articles",
          "/register",
          "/rates",
          "/rules",
          "/movies",
          ...ARTICLES.map((a) => `/articles/${a.slug}`),
        ];
        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">
${paths
  .map(
    (p) => `  <url><loc>${origin}${p}</loc><changefreq>daily</changefreq><priority>${p === "/" ? "1.0" : p.startsWith("/articles/") ? "0.8" : "0.6"}</priority></url>`,
  )
  .join("\n")}
</urlset>`;
        return new Response(body, {
          headers: { "content-type": "application/xml; charset=utf-8" },
        });
      },
    },
  },
});
