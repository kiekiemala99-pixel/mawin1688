import { createFileRoute } from "@tanstack/react-router";
import { MINI_GAMES } from "@/lib/minigames";
import { SLOT_GAMES } from "@/lib/slot-games";

export const Route = createFileRoute("/app/games/")({
  component: GameLobby,
});

function GameLobby() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-gold-bright">เกม 10 รายการ</h1>
        <p className="text-xs text-cream/55">เลือกโปสเตอร์แล้วเล่นทันที · หวยยังเป็นหลักของเว็บ</p>
      </div>
      <section>
        <h2 className="mb-2 text-sm font-semibold text-gold-bright">มินิเกม</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {MINI_GAMES.map((g) => (
            <a key={g.id} href={`/app/games/${g.id}`} className="overflow-hidden rounded-2xl bg-navy-card shadow-[0_0_0_1px_rgba(201,164,74,0.28)]">
              <img src={g.cover} alt="" className="slot-poster" />
              <div className="px-2 py-2">
                <div className="truncate text-sm font-semibold text-gold-bright">{g.title}</div>
                <div className="truncate text-[11px] text-cream/50">{g.blurb}</div>
              </div>
            </a>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-2 text-sm font-semibold text-gold-bright">สล็อต</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {SLOT_GAMES.map((g) => (
            <a key={g.id} href={`/app/slot/${g.id}`} className="overflow-hidden rounded-2xl bg-navy-card shadow-[0_0_0_1px_rgba(201,164,74,0.28)]">
              <img src={g.cover} alt="" className="slot-poster" />
              <div className="px-2 py-2">
                <div className="truncate text-sm font-semibold text-gold-bright">{g.titleTh}</div>
                <div className="truncate text-[11px] text-cream/50">{g.maxWin}</div>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
