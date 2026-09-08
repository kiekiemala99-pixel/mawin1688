import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { authMiddleware } from "@/lib/auth/middleware";
import { logServerError } from "@/lib/server-log";

export type Movie = {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  year: string;
  posterUrl: string;
  videoUrl: string;
  description: string;
  published: boolean;
  featured: boolean;
  sortOrder: number;
};

export type MovieBanner = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  active: boolean;
  sortOrder: number;
};

export type MoviePlayer =
  | { kind: "youtube" | "vimeo" | "iframe"; src: string }
  | { kind: "file"; src: string }
  | null;

export function safeHttpUrl(raw: string) {
  const u = String(raw || "").trim();
  if (!u) return "";
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

export function moviePlayer(url: string): MoviePlayer {
  const u = safeHttpUrl(url);
  if (!u) return null;
  const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
  if (yt?.[1]) return { kind: "youtube", src: `https://www.youtube.com/embed/${yt[1]}?rel=0` };
  const vimeo = u.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeo?.[1]) return { kind: "vimeo", src: `https://player.vimeo.com/video/${vimeo[1]}` };
  if (/\.(mp4|webm|ogg|m3u8)(\?|$)/i.test(u)) return { kind: "file", src: u };
  return { kind: "iframe", src: u };
}

function mapMovie(r: {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  year: string;
  poster_url: string;
  video_url: string;
  description: string;
  published: boolean;
  featured: boolean;
  sort_order: number;
}): Movie {
  return {
    id: r.id,
    title: r.title,
    subtitle: r.subtitle ?? "",
    category: r.category ?? "ทั่วไป",
    year: r.year ?? "",
    posterUrl: r.poster_url ?? "",
    videoUrl: r.video_url ?? "",
    description: r.description ?? "",
    published: Boolean(r.published),
    featured: Boolean(r.featured),
    sortOrder: Number(r.sort_order || 0),
  };
}

export async function listPublicMovies() {
  const sql = await getSql();
  const movies = await sql<Parameters<typeof mapMovie>[0]>`
    select id, title, subtitle, category, year, poster_url, video_url, description, published, featured, sort_order
    from movies where published = true
    order by featured desc, sort_order asc, created_at desc
    limit 80
  `;
  const banners = await sql<{ id: string; title: string; image_url: string; link_url: string; active: boolean; sort_order: number }>`
    select id, title, image_url, link_url, active, sort_order
    from movie_banners where active = true
    order by sort_order asc, created_at desc
    limit 12
  `;
  return {
    movies: movies.map(mapMovie),
    banners: banners.map(
      (b): MovieBanner => ({
        id: b.id,
        title: b.title ?? "",
        imageUrl: b.image_url,
        linkUrl: b.link_url ?? "",
        active: true,
        sortOrder: Number(b.sort_order || 0),
      }),
    ),
  };
}

export const loadPublicMovies = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return await listPublicMovies();
  } catch (err) {
    logServerError("loadPublicMovies", err);
    return { movies: [] as Movie[], banners: [] as MovieBanner[] };
  }
});

export const loadMovie = createServerFn({ method: "GET" })
  .validator((v: unknown) => z.object({ id: z.string().min(1) }).parse(v))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql<Parameters<typeof mapMovie>[0]>`
      select id, title, subtitle, category, year, poster_url, video_url, description, published, featured, sort_order
      from movies where id = ${data.id} and published = true limit 1
    `;
    const movie = rows[0] ? mapMovie(rows[0]) : null;
    const catalog = await listPublicMovies();
    return { movie, banners: catalog.banners, related: catalog.movies.filter((m) => m.id !== data.id).slice(0, 8) };
  });

export const loadStaffMovies = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const staff = await sql<{ is_staff: boolean }>`select is_staff from wallets where user_id = ${context.userId} limit 1`;
    if (!staff[0]?.is_staff) throw new Error("staff");
    const movies = await sql<Parameters<typeof mapMovie>[0]>`
      select id, title, subtitle, category, year, poster_url, video_url, description, published, featured, sort_order
      from movies order by sort_order asc, created_at desc limit 120
    `;
    const banners = await sql<{ id: string; title: string; image_url: string; link_url: string; active: boolean; sort_order: number }>`
      select id, title, image_url, link_url, active, sort_order from movie_banners
      order by sort_order asc, created_at desc limit 40
    `;
    return {
      movies: movies.map(mapMovie),
      banners: banners.map(
        (b): MovieBanner => ({
          id: b.id,
          title: b.title ?? "",
          imageUrl: b.image_url,
          linkUrl: b.link_url ?? "",
          active: Boolean(b.active),
          sortOrder: Number(b.sort_order || 0),
        }),
      ),
    };
  });
