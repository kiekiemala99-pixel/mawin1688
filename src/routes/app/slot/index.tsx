import { createFileRoute } from "@tanstack/react-router";
import { SLOT_GAMES } from "@/lib/slot-games";

export const Route = createFileRoute("/app/slot/")({
  component: SlotLobby,
});

function SlotLobby() {
  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-lg font-semibold text-gold-bright">สล็อตจอใหญ่</h1>
        <p className="text-xs text-cream/55">5 เกมภาพใหญ่ วงล้อเต็มจอ กดเข้าหมุนได้เลย</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {SLOT_GAMES.map((g) => (
          <a key={g.id} href={`/app/slot/${g.id}`} className="overflow-hidden rounded-2xl bg-navy-card shadow-[0_0_0_1px_rgba(201,164,74,0.28)]">
            <img src={g.cover} alt="" className="slot-poster" loading="lazy" decoding="async" />
            <div className="px-2 py-2">
              <div className="truncate text-sm font-semibold text-gold-bright">{g.titleTh}</div>
              <div className="truncate text-[11px] text-cream/50">{g.maxWin}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
