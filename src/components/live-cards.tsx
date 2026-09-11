import { useEffect, useState } from "react";
import { toast } from "sonner";
import { playMiniGame, type MiniPlayView } from "@/lib/minigame-server";
import { MINI_STAKES, type MiniGame } from "@/lib/minigames";
import { useStore } from "@/lib/store";
import { formatBaht } from "@/lib/format";
import { cn } from "@/lib/utils";
import { WinFx } from "@/components/win-fx";
import { getBearerToken } from "@/lib/auth/client";

export function LiveCards({ game }: { game: MiniGame }) {
  const wallet = useStore((s) => s.wallet);
  const refresh = useStore((s) => s.refresh);
  const [stake, setStake] = useState(10);
  const [pick, setPick] = useState(game.options[0]?.id ?? "play");
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<MiniPlayView | null>(null);
  const [auth, setAuth] = useState("");

  useEffect(() => {
    setAuth(getBearerToken() ?? "");
  }, []);

  async function play() {
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

  const won = !busy && last?.status === "won";
  const mine = last?.reveal.playerCards ?? [];
  const house = last?.reveal.dealerCards ?? [];

  return (
    <div className="live-table">
      <WinFx show={!!won} amount={last?.payout ?? 0} />
      <header className="live-hud">
        <a href="/app/games" className="game-hud-btn" aria-label="ย้อนกลับ">
          ←
        </a>
        <div className="min-w-0 flex-1 text-center">
          <div className="text-sm font-bold text-gold-bright">{game.title}</div>
          <div className="tabular text-base font-semibold text-cream">฿ {formatBaht(wallet?.balance ?? 0)}</div>
        </div>
        <span className="game-hud-btn invisible" aria-hidden />
      </header>
      <div className="relative">
        <img src="/mini/covers/live-host.jpg" alt="" className="live-host" />
        <div className="live-host-shade" />
      </div>
      <div className="live-felt">
        <div className="grid grid-cols-2 gap-3">
          <Hand title={game.type === "baccarat" ? "ผู้เล่น" : "คุณ"} cards={busy ? [] : mine} rolling={busy} />
          <Hand title={game.type === "baccarat" ? "แบงค์เกอร์" : "เจ้ามือ"} cards={busy ? [] : house} rolling={busy} />
        </div>
        <p className="mt-3 min-h-5 text-center text-xs font-semibold">
          {busy && <span className="text-gold-bright">กำลังแจกไพ่…</span>}
          {!busy && last && (
            <span className={last.status === "lost" ? "text-lose" : last.status === "push" ? "text-cream" : "text-win"}>
              {last.summary}
              {last.status === "won" ? ` · ได้ ฿ ${formatBaht(last.payout)}` : last.status === "push" ? " · เสมอ คืนทุน" : " · ไม่เข้า"}
            </span>
          )}
        </p>
      </div>
      <div className="live-dock">
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {game.options.map((o) => (
            <button
              key={o.id}
              type="button"
              disabled={busy}
              onClick={() => setPick(o.id)}
              className={cn("hilo-spot py-3", pick === o.id && "is-on")}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
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
        <button type="button" disabled={busy} onClick={() => void play()} className={cn("spin-3d mt-3 text-lg", busy && "is-down spin-glow")}>
          {busy ? "รอผล…" : `ลงเดิมพัน  ฿${stake}`}
        </button>
        <p className="mt-1 text-center text-[11px] text-cream/45">{game.payHint}</p>
        <input type="hidden" name="auth" value={auth} />
      </div>
    </div>
  );
}

function Hand({ title, cards, rolling }: { title: string; cards: { rank?: number; suit?: string }[] | number[] | unknown[]; rolling: boolean }) {
  return (
    <div>
      <div className="mb-1 text-center text-[11px] font-semibold text-gold-bright">{title}</div>
      <div className="flex min-h-24 justify-center gap-1">
        {rolling ? (
          <>
            <span className="live-card is-back" />
            <span className="live-card is-back" />
          </>
        ) : cards.length === 0 ? (
          <span className="live-card is-empty" />
        ) : (
          cards.slice(0, 3).map((c, i) => (
            <span key={i} className="live-card">
              {labelOf(c)}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function labelOf(c: unknown) {
  if (!c || typeof c !== "object") return "?";
  const o = c as { rank?: number; suit?: string; label?: string };
  if (o.label) return o.label;
  const ranks = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const r = ranks[o.rank ?? 0] ?? "?";
  return `${r}${o.suit ?? ""}`;
}
