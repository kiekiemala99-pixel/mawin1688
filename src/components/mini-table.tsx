import { useEffect, useState } from "react";
import { toast } from "sonner";
import { playMiniGame, type MiniPlayView } from "@/lib/minigame-server";
import { FPC, FRUITS, MINI_STAKES, type MiniGame, type MiniReveal } from "@/lib/minigames";
import { useStore } from "@/lib/store";
import { formatBaht } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LampRow, WinFx } from "@/components/win-fx";
import { GameStage } from "@/components/game-stage";
import { getBearerToken } from "@/lib/auth/client";

export function MiniTable({
  game,
  flash,
}: {
  game: MiniGame;
  flash?: { ok?: string; miss?: string; pay?: string; err?: string };
}) {
  const wallet = useStore((s) => s.wallet);
  const refresh = useStore((s) => s.refresh);
  const [stake, setStake] = useState(1);
  const [pick, setPick] = useState(game.options[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<MiniPlayView | null>(null);
  const [auth, setAuth] = useState("");

  useEffect(() => {
    setAuth(getBearerToken() ?? "");
    if (flash?.ok || flash?.miss) void refresh();
  }, [flash?.ok, flash?.miss, refresh]);

  async function playJs(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if ((wallet?.balance ?? 0) < stake) {
      toast.error("เครดิตไม่พอ");
      return;
    }
    setBusy(true);
    try {
      const { play: outcome, balance } = await playMiniGame({ data: { gameId: game.id, pick, stake } });
      useStore.setState((s) => (s.wallet ? { wallet: { ...s.wallet, balance } } : s));
      setLast(outcome);
      void refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เล่นไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  const won = !busy && (last?.status === "won" || Boolean(flash?.ok));
  const pay = last?.payout ?? (flash?.pay ? Number(flash.pay) : 0);

  return (
    <GameStage
      backTo="/app/games"
      title={game.title}
      subtitle={game.blurb}
      boardClass="game-board-center"
      dock={
        <form method="POST" action="/api/play" onSubmit={(e) => void playJs(e)} className="mx-auto w-full max-w-md space-y-2">
          <input type="hidden" name="kind" value="mini" />
          <input type="hidden" name="gameId" value={game.id} />
          <input type="hidden" name="pick" value={pick} />
          <input type="hidden" name="stake" value={stake} />
          <input type="hidden" name="auth" value={auth} />
          <p className="min-h-6 text-center text-sm font-semibold">
            {busy && <span className="text-gold-bright">กำลังออกผล…</span>}
            {!busy && last && (
              <span className={last.status === "lost" ? "text-lose" : last.status === "push" ? "text-cream" : "text-win"}>
                {last.summary}
                {last.status === "won" ? ` · ได้ ฿ ${formatBaht(last.payout)}` : last.status === "push" ? " · เสมอ คืนทุน" : " · ไม่เข้า"}
              </span>
            )}
            {!busy && !last && flash?.ok && (
              <span className="text-win">
                {flash.ok}
                {pay ? ` · ได้ ฿ ${formatBaht(pay)}` : ""}
              </span>
            )}
            {!busy && !last && flash?.miss && <span className="text-lose">{flash.miss} · ไม่เข้า</span>}
          </p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {MINI_STAKES.map((n) => (
              <button
                key={n}
                type="button"
                disabled={busy}
                onClick={() => setStake(n)}
                className={cn("chip px-3 text-sm", stake === n ? "btn-gold" : "bg-navy-card text-cream/80")}
              >
                {n}
              </button>
            ))}
          </div>
          <button type="submit" disabled={busy} className={cn("spin-3d text-lg", busy && "is-down spin-glow")}>
            {busy ? "รอผล…" : `เล่น  ฿${stake}`}
          </button>
          <p className="text-center text-[11px] text-cream/45">{game.payHint}</p>
        </form>
      }
    >
      <WinFx show={!!won} amount={pay} />
      {flash?.err ? <p className="mb-2 rounded-xl bg-red-950/70 px-3 py-2 text-center text-sm text-red-200">เล่นไม่สำเร็จ ลองอีกครั้ง</p> : null}
      <div className={cn("felt-table w-full max-w-md", won && "slot-win-flash", last?.status === "lost" && !busy && "lose-flash")}>
        <LampRow running={busy} won={!!won} />
        <div className="px-3 pb-4 pt-2">
          <Board game={game} pick={pick} onPick={setPick} last={last} busy={busy} />
        </div>
        <LampRow running={busy} won={!!won} />
      </div>
    </GameStage>
  );
}

function Board({
  game,
  pick,
  onPick,
  last,
  busy,
}: {
  game: MiniGame;
  pick: string;
  onPick: (id: string) => void;
  last: MiniPlayView | null;
  busy: boolean;
}) {
  if (game.type === "fpc") {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {FPC.map((x) => (
            <button
              key={x.id}
              type="button"
              disabled={busy}
              onClick={() => onPick(x.id)}
              className={cn("overflow-hidden rounded-xl option-3d bg-navy-deep p-0", pick === x.id ? "ring-2 ring-gold-bright" : "")}
            >
              <img src={x.img} alt={x.label} className="aspect-square w-full object-cover" />
              <span className="block bg-navy-deep py-1 text-center text-xs text-gold-bright">{x.label}</span>
            </button>
          ))}
        </div>
        {last?.reveal.faces && (
          <div className="flex justify-center gap-2">
            {last.reveal.faces.map((id, i) => {
              const f = FPC.find((x) => x.id === id);
              return f ? <img key={i} src={f.img} alt="" className="size-16 rounded-lg object-cover ring-2 ring-gold-bright" /> : null;
            })}
          </div>
        )}
      </div>
    );
  }

  if (game.type === "fruit") {
    return <FruitStrip reveal={last?.reveal} spinning={busy} />;
  }

  if (game.type === "wheel") {
    const rot = last ? (last.reveal.wheel ?? 0) * 30 : 0;
    return (
      <div className="grid place-items-center py-3">
        <div className={cn("relative size-52", busy && "spin-glow")}>
          <img
            src="/mini/wheel.jpg"
            alt=""
            className="size-52 rounded-full object-cover"
            style={{
              transform: `rotate(${busy ? 1080 : rot}deg)`,
              transition: busy ? "transform 1.2s linear" : "transform 900ms cubic-bezier(0.12,0.72,0.08,1)",
            }}
          />
          <span className="absolute -top-1 left-1/2 z-10 h-0 w-0 -translate-x-1/2 border-x-8 border-t-0 border-b-8 border-x-transparent border-b-gold-bright" />
        </div>
      </div>
    );
  }

  const dice = last?.reveal.dice;
  const showDice = game.type === "hilo" || game.type === "dice" || game.type === "lucky7" || game.type === "fantan";

  return (
    <div className="space-y-3">
      <div className={cn("grid gap-2", game.options.length > 4 ? "grid-cols-3" : "grid-cols-2")}>
        {game.options.map((o) => (
          <button
            key={o.id}
            type="button"
            disabled={busy}
            onClick={() => onPick(o.id)}
            className={cn("option-3d px-3 text-sm", pick === o.id ? "btn-gold" : "bg-navy-card text-cream")}
          >
            {o.label}
          </button>
        ))}
      </div>
      {showDice && (
        <div className="flex justify-center gap-2 pt-1">
          {(busy ? [1, 2, 3].slice(0, dice?.length || 2) : dice ?? []).map((n, i) => (
            <span key={i} className={cn("dice-face", busy && "is-roll")}>
              {busy ? "?" : n}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function FruitStrip({ reveal, spinning }: { reveal?: MiniReveal; spinning: boolean }) {
  const ids = reveal?.fruits ?? ["cherry", "lemon", "orange"];
  return (
    <div className="grid grid-cols-3 gap-1 overflow-hidden rounded-xl bg-navy-deep p-1">
      {ids.map((id, i) => {
        const f = FRUITS.find((x) => x.id === id);
        return (
          <img
            key={`${id}-${i}`}
            src={f?.img}
            alt={f?.label ?? ""}
            className={cn("aspect-square w-full rounded-lg object-cover", spinning && "opacity-50 slot-strip is-spinning")}
          />
        );
      })}
    </div>
  );
}
