import { createFileRoute } from "@tanstack/react-router";
import { AuthHidden } from "@/components/auth-hidden";
import { loadStaffMovies } from "@/lib/movies-server";

export const Route = createFileRoute("/app/admin/movies")({
  validateSearch: (s: Record<string, unknown>): { ok?: string; err?: string } => ({
    ...(s.ok ? { ok: String(s.ok) } : {}),
    ...(s.err ? { err: String(s.err) } : {}),
  }),
  loader: async () => {
    try {
      return await loadStaffMovies();
    } catch {
      return { movies: [], banners: [] };
    }
  },
  component: AdminMoviesPage,
});

function AdminMoviesPage() {
  const data = Route.useLoaderData();
  const { ok, err } = Route.useSearch();
  return (
    <div className="space-y-4">
      {ok ? <p className="rounded-xl bg-emerald-950/70 px-3 py-2 text-center text-sm text-emerald-200">บันทึกแล้ว</p> : null}
      {err ? <p className="rounded-xl bg-red-950/70 px-3 py-2 text-center text-sm text-red-200">บันทึกไม่สำเร็จ ตรวจลิงก์รูป/หนัง</p> : null}

      <form method="POST" action="/api/staff" className="space-y-2 rounded-2xl bg-navy-card p-4">
        <AuthHidden />
        <input type="hidden" name="action" value="banner_save" />
        <p className="text-sm font-semibold text-gold-bright">แปะแบนเนอร์หน้าเว็บหนัง</p>
        <input name="title" placeholder="ชื่อแบนเนอร์" className="h-11 w-full rounded-lg bg-navy-deep px-3 text-sm text-cream outline-none" />
        <input name="imageUrl" required placeholder="ลิงก์รูปแบนเนอร์ https://..." className="h-11 w-full rounded-lg bg-navy-deep px-3 text-sm text-cream outline-none" />
        <input name="linkUrl" placeholder="ลิงก์เมื่อกดแบนเนอร์ (ไม่ใส่ก็ได้)" className="h-11 w-full rounded-lg bg-navy-deep px-3 text-sm text-cream outline-none" />
        <input name="sortOrder" type="number" defaultValue={0} className="h-11 w-full rounded-lg bg-navy-deep px-3 text-sm text-cream outline-none" />
        <label className="flex items-center gap-2 text-sm text-cream">
          <input type="checkbox" name="active" value="1" defaultChecked />
          แสดงบนเว็บหนัง
        </label>
        <button type="submit" className="btn-gold h-11 w-full rounded-lg text-sm">บันทึกแบนเนอร์</button>
      </form>

      <div className="space-y-2">
        {data.banners.map((b) => (
          <article key={b.id} className="rounded-2xl bg-navy-card p-3">
            <img src={b.imageUrl} alt="" className="h-24 w-full rounded-xl object-cover" />
            <div className="mt-2 flex items-center justify-between gap-2 text-sm text-cream">
              <span>{b.title || "แบนเนอร์"} {b.active ? "· แสดงอยู่" : "· ซ่อน"}</span>
              <form method="POST" action="/api/staff">
                <AuthHidden />
                <input type="hidden" name="action" value="banner_delete" />
                <input type="hidden" name="id" value={b.id} />
                <button type="submit" className="text-xs text-lose">ลบ</button>
              </form>
            </div>
          </article>
        ))}
      </div>

      <form method="POST" action="/api/staff" className="space-y-2 rounded-2xl bg-navy-card p-4">
        <AuthHidden />
        <input type="hidden" name="action" value="movie_save" />
        <p className="text-sm font-semibold text-gold-bright">เพิ่ม / แก้ไขหนัง</p>
        <input name="id" placeholder="รหัสเรื่อง (เว้นว่างถ้าสร้างใหม่)" className="h-11 w-full rounded-lg bg-navy-deep px-3 text-sm text-cream outline-none" />
        <input name="title" required placeholder="ชื่อเรื่อง" className="h-11 w-full rounded-lg bg-navy-deep px-3 text-sm text-cream outline-none" />
        <input name="subtitle" placeholder="คำโปรย" className="h-11 w-full rounded-lg bg-navy-deep px-3 text-sm text-cream outline-none" />
        <div className="grid grid-cols-2 gap-2">
          <input name="category" placeholder="หมวด เช่น แอคชัน" className="h-11 rounded-lg bg-navy-deep px-3 text-sm text-cream outline-none" />
          <input name="year" placeholder="ปี" className="h-11 rounded-lg bg-navy-deep px-3 text-sm text-cream outline-none" />
        </div>
        <input name="posterUrl" placeholder="ลิงก์รูปโปสเตอร์ https://..." className="h-11 w-full rounded-lg bg-navy-deep px-3 text-sm text-cream outline-none" />
        <input name="videoUrl" placeholder="ลิงก์หนัง YouTube / Vimeo / ไฟล์ mp4" className="h-11 w-full rounded-lg bg-navy-deep px-3 text-sm text-cream outline-none" />
        <textarea name="description" placeholder="เรื่องย่อ" className="min-h-24 w-full rounded-lg bg-navy-deep px-3 py-2 text-sm text-cream outline-none" />
        <input name="sortOrder" type="number" defaultValue={0} className="h-11 w-full rounded-lg bg-navy-deep px-3 text-sm text-cream outline-none" />
        <label className="flex items-center gap-2 text-sm text-cream">
          <input type="checkbox" name="published" value="1" defaultChecked /> เผยแพร่
        </label>
        <label className="flex items-center gap-2 text-sm text-cream">
          <input type="checkbox" name="featured" value="1" /> ปักหมุดด้านบน
        </label>
        <button type="submit" className="btn-gold h-11 w-full rounded-lg text-sm">บันทึกหนัง</button>
      </form>

      <div className="space-y-2">
        {data.movies.map((m) => (
          <article key={m.id} className="flex gap-3 rounded-2xl bg-navy-card p-3">
            <img src={m.posterUrl || "/og.jpg"} alt="" className="h-20 w-14 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-cream">{m.title}</div>
              <div className="text-xs text-cream/50">{m.category} {m.published ? "· แสดง" : "· ซ่อน"}</div>
              <div className="mt-1 truncate text-[11px] text-cream/40">{m.id}</div>
            </div>
            <form method="POST" action="/api/staff">
              <AuthHidden />
              <input type="hidden" name="action" value="movie_delete" />
              <input type="hidden" name="id" value={m.id} />
              <button type="submit" className="text-xs text-lose">ลบ</button>
            </form>
          </article>
        ))}
      </div>
    </div>
  );
}
