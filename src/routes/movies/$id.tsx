import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { GuestShell } from "@/components/guest-shell";
import { loadMovie, moviePlayer } from "@/lib/movies-server";

export const Route = createFileRoute("/movies/$id")({
  loader: async ({ params }) => {
    const data = await loadMovie({ data: { id: params.id } });
    if (!data.movie) throw notFound();
    return data;
  },
  component: WatchPage,
});

function WatchPage() {
  const { movie, banners, related } = Route.useLoaderData();
  const player = moviePlayer(movie.videoUrl);
  return (
    <GuestShell>
      <Link to="/movies" className="text-xs text-gold-bright">
        ← คลังหนัง
      </Link>
      <h1 className="mt-2 text-lg font-semibold text-gold-bright">{movie.title}</h1>
      <p className="text-xs text-cream/55">
        {movie.category}
        {movie.year ? ` · ${movie.year}` : ""}
        {movie.subtitle ? ` · ${movie.subtitle}` : ""}
      </p>
      <div className="mt-3 overflow-hidden rounded-2xl bg-black">
        {player?.kind === "file" ? (
          <video src={player.src} controls playsInline className="aspect-video w-full" poster={movie.posterUrl || undefined} />
        ) : player ? (
          <iframe
            src={player.src}
            title={movie.title}
            className="aspect-video w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="grid aspect-video place-items-center text-sm text-cream/60">ยังไม่มีไฟล์หนังสำหรับเรื่องนี้</div>
        )}
      </div>
      {movie.description ? <p className="mt-3 text-sm leading-6 text-cream/80">{movie.description}</p> : null}
      {banners[0] ? (
        <a href={banners[0].linkUrl || "/movies"} className="mt-4 block">
          <img src={banners[0].imageUrl} alt={banners[0].title || "แบนเนอร์"} className="h-28 w-full rounded-2xl object-cover" />
        </a>
      ) : null}
      {related.length > 0 ? (
        <div className="mt-5">
          <h2 className="text-sm font-semibold text-gold-bright">เรื่องอื่น</h2>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {related.map((m) => (
              <Link key={m.id} to="/movies/$id" params={{ id: m.id }} className="overflow-hidden rounded-xl bg-navy-card">
                <img src={m.posterUrl || "/og.jpg"} alt="" className="aspect-[2/3] w-full object-cover" loading="lazy" />
                <div className="truncate px-1.5 py-1 text-[11px] text-cream">{m.title}</div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </GuestShell>
  );
}
