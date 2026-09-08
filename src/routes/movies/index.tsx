import { Link, createFileRoute } from "@tanstack/react-router";
import { GuestShell } from "@/components/guest-shell";
import { loadPublicMovies } from "@/lib/movies-server";

export const Route = createFileRoute("/movies/")({
  loader: async () => loadPublicMovies(),
  component: MoviesPage,
});

function MoviesPage() {
  const { movies, banners } = Route.useLoaderData();
  return (
    <GuestShell>
      <h1 className="text-lg font-semibold text-gold-bright">ดูหนัง</h1>
      <p className="mt-1 text-xs text-cream/55">คลังหนังของมาวิน1688 · แอดมินอัปเดตรายการและแบนเนอร์ได้เอง</p>
      <div className="mt-3 space-y-3">
        {banners.map((b) => {
          const img = (
            <img src={b.imageUrl} alt={b.title || "แบนเนอร์"} className="h-36 w-full rounded-2xl object-cover sm:h-44" />
          );
          return b.linkUrl ? (
            <a key={b.id} href={b.linkUrl} target="_blank" rel="noreferrer" className="block">
              {img}
            </a>
          ) : (
            <div key={b.id}>{img}</div>
          );
        })}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {movies.map((m) => (
          <Link
            key={m.id}
            to="/movies/$id"
            params={{ id: m.id }}
            className="overflow-hidden rounded-2xl bg-navy-card shadow-[0_0_0_1px_rgba(201,164,74,0.22)]"
          >
            <img src={m.posterUrl || "/og.jpg"} alt="" className="aspect-[2/3] w-full object-cover" loading="lazy" />
            <div className="px-2 py-2">
              <div className="truncate text-sm font-semibold text-gold-bright">{m.title}</div>
              <div className="truncate text-[11px] text-cream/50">
                {m.category}
                {m.year ? ` · ${m.year}` : ""}
              </div>
            </div>
          </Link>
        ))}
      </div>
      {movies.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-navy-card px-4 py-8 text-center text-sm text-cream/60">
          ยังไม่มีหนังในคลัง แอดมินเพิ่มได้ที่หน้าจัดการหนัง
        </p>
      ) : null}
    </GuestShell>
  );
}
