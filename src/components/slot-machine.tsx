import { useEffect, useMemo, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { spinSlot, type SlotSpinView } from "@/lib/slot-server";
import {
  PAYLINES,
  SLOT_STAKES,
  pickSymbol,
  symbolsFor,
  type SlotSymbolId,
} from "@/lib/slot";
import { symbolImage, type SlotGame } from "@/lib/slot-games";
import { useStore } from "@/lib/store";
import { formatBaht } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LampRow, WinFx } from "@/components/win-fx";
import { GameStage } from "@/components/game-stage";
import { getBearerToken } from "@/lib/auth/client";

const PAD = 18;

function SymbolIcon({ id, pack }: { id: SlotSymbolId; pack: SlotGame["pack"] }) {
  const src = symbolImage(id, pack);
  if (!src) return <span className="text-xs">{id}</span>;
  return <img src={src} alt="" className="slot-sym" />;
}

function randomStrip(result: SlotSymbolId[], pack: SlotGame["pack"]) {
  const pad = Array.from({ length: PAD }, () => pickSymbol(pack));
  return [...pad, ...result];
}

function useSfx(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  function ctx() {
    if (!enabled || typeof window === "undefined") return null;
    ctxRef.current ??= new AudioContext();
    return ctxRef.current;
  }
  function tone(freq: number, dur: number, gain = 0.045) {
    const c = ctx();
    if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "square";
    o.frequency.value = freq;
    g.gain.value = gain;
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur);
  }
  return {
    tick: () => tone(220, 0.04, 0.03),
    stop: () => tone(180, 0.08, 0.04),
    win: () => {
      tone(523, 0.12);
      window.setTimeout(() => tone(659, 0.12), 90);
      window.setTimeout(() => tone(784, 0.22), 180);
    },
    lose: () => tone(140, 0.18, 0.035),
  };
}

export function SlotMachine({ game }: { game: SlotGame }) {
  const wallet = useStore((s) => s.wallet);
  const refresh = useStore((s) => s.refresh);
  const [stake, setStake] = useState(1);
  const [sound, setSound] = useState(true);
  const sfx = useSfx(sound);
  const [spinning, setSpinning] = useState(false);
  const [stopped, setStopped] = useState(5);
  const [result, setResult] = useState<SlotSymbolId[][]>(() =>
    Array.from({ length: 5 }, () => [pickSymbol(game.pack), pickSymbol(game.pack), pickSymbol(game.pack)]),
  );
  const [last, setLast] = useState<SlotSpinView | null>(null);
  const tickRef = useRef<number | null>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const [cell, setCell] = useState(80);
  const [auth, setAuth] = useState("");

  const strips = useMemo(() => result.map((col) => randomStrip(col, game.pack)), [result, game.pack]);

  useEffect(() => {
    setAuth(getBearerToken() ?? "");
    const el = windowRef.current;
    if (!el) return;
    const measure = () => {
      const h = el.clientHeight;
      if (h > 60) setCell(Math.max(72, Math.floor(h / 3)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, []);

  async function spin() {
    if (spinning) return;
    if ((wallet?.balance ?? 0) < stake) {
      toast.error("เครดิตไม่พอ");
      return;
    }
    setSpinning(true);
    setStopped(0);
    setLast(null);
    if (sound) {
      tickRef.current = window.setInterval(() => sfx.tick(), 90);
    }
    try {
      const { spin: outcome, balance } = await spinSlot({ data: { stake, gameId: game.id } });
      useStore.setState((s) => (s.wallet ? { wallet: { ...s.wallet, balance } } : s));
      setResult(outcome.reels);
      outcome.reels.forEach((_, i) => {
        window.setTimeout(() => {
          sfx.stop();
          setStopped((n) => n + 1);
        }, 420 + i * 280);
      });
      window.setTimeout(() => {
        if (tickRef.current) window.clearInterval(tickRef.current);
        setLast(outcome);
        setSpinning(false);
        if (outcome.status === "won") sfx.win();
        else sfx.lose();
        void refresh();
      }, 420 + 4 * 280 + 200);
    } catch (err) {
      if (tickRef.current) window.clearInterval(tickRef.current);
      setSpinning(false);
      setStopped(5);
      toast.error(err instanceof Error ? err.message : "หมุนไม่สำเร็จ");
    }
  }

  const winCells = new Set<string>();
  if (last && last.wins.length && stopped >= 5) {
    for (const w of last.wins) {
      const line = PAYLINES[w.line - 1];
      line?.slice(0, w.count).forEach((row, col) => winCells.add(`${col}-${row}`));
    }
  }

  const won = !spinning && last?.status === "won";
  const big = Boolean(won && last && last.payout >= Math.max(100, stake * 8));
  const cellSize = `${cell}px`;
  const stakeIdx = Math.max(0, SLOT_STAKES.indexOf(stake as (typeof SLOT_STAKES)[number]));

  function bumpStake(dir: -1 | 1) {
    const next = SLOT_STAKES[stakeIdx + dir];
    if (next) setStake(next);
  }

  return (
    <GameStage
      backTo="/app/slot"
      title={game.title}
      subtitle={game.titleTh}
      bg={game.cover}
      boardClass="slot-board"
      extraHud={
        <button
          type="button"
          onClick={() => setSound((v) => !v)}
          className="game-hud-btn text-gold-bright"
          aria-label={sound ? "ปิดเสียง" : "เปิดเสียง"}
        >
          {sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
        </button>
      }
      dock={
        <form
          method="POST"
          action="/api/play"
          onSubmit={(e) => {
            e.preventDefault();
            void spin();
          }}
          className="mx-auto w-full max-w-lg"
          style={{ ["--slot-cell" as string]: cellSize }}
        >
          <input type="hidden" name="kind" value="slot" />
          <input type="hidden" name="gameId" value={game.id} />
          <input type="hidden" name="pick" value="spin" />
          <input type="hidden" name="stake" value={stake} />
          <input type="hidden" name="auth" value={auth} />
          <div className="mb-2 min-h-6 text-center text-sm font-semibold">
            {spinning && <span className="text-gold-bright">กำลังหมุน…</span>}
            {won && (
              <span className="text-win">
                {big ? "BIG WIN · " : ""}
                ถูกรางวัล {last?.wins.length} เส้น · ได้ ฿ {formatBaht(last?.payout ?? 0)}
              </span>
            )}
            {!spinning && last?.status === "lost" && <span className="text-cream/55">ไม่เข้าเส้นในรอบนี้</span>}
          </div>
          <div className="pg-stake">
            <div className="pg-stake-box">
              <button type="button" disabled={spinning || stakeIdx <= 0} onClick={() => bumpStake(-1)} className="pg-stake-btn">
                −
              </button>
              <div className="text-center">
                <div className="text-[10px] tracking-widest text-cream/50">เดิมพัน</div>
                <div className="tabular text-lg font-bold text-gold-bright">฿ {stake}</div>
              </div>
              <button type="button" disabled={spinning || stakeIdx >= SLOT_STAKES.length - 1} onClick={() => bumpStake(1)} className="pg-stake-btn">
                +
              </button>
            </div>
            <button type="submit" disabled={spinning} className={cn("spin-3d", spinning && "is-down spin-glow")}>
              {spinning ? "..." : "SPIN"}
            </button>
          </div>
          <details className="mt-3 rounded-2xl bg-navy-deep/80 px-4 py-2 text-sm">
            <summary className="cursor-pointer text-center font-semibold text-gold-bright">อัตราจ่าย</summary>
            <Paytable pack={game.pack} />
          </details>
        </form>
      }
    >
      <div className="w-full" style={{ ["--slot-cell" as string]: cellSize }}>
        <WinFx show={Boolean(won)} amount={last?.payout ?? 0} big={big} />
        <div className={cn("slot-frame slot-frame-xl", spinning && "spin-glow", won && stopped >= 5 && "slot-win-flash")}>
          <LampRow running={spinning} won={won} />
          <div className="slot-window" ref={windowRef}>
            {strips.map((strip, col) => {
              const landing = (strip.length - 3) * cell;
              const running = spinning && col >= stopped;
              return (
                <div key={col} className="slot-reel">
                  <div
                    className={cn("slot-strip", running && "is-spinning")}
                    style={
                      running
                        ? undefined
                        : {
                            transform: `translateY(-${landing}px)`,
                            transition: spinning
                              ? `transform ${0.55 + col * 0.12}s cubic-bezier(0.12, 0.72, 0.08, 1)`
                              : undefined,
                          }
                    }
                  >
                    {strip.map((id, i) => {
                      const row = i - (strip.length - 3);
                      const lit = row >= 0 && winCells.has(`${col}-${row}`);
                      return (
                        <div key={`${col}-${i}`} className={cn("slot-cell", lit && "is-win")}>
                          <SymbolIcon id={id} pack={game.pack} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <LampRow running={spinning} won={won} />
        </div>
      </div>
    </GameStage>
  );
}

function Paytable({ pack }: { pack: SlotGame["pack"] }) {
  const symbols = symbolsFor(pack);
  return (
    <ul className="mt-2 space-y-1.5">
      {symbols.map((s) => (
        <li key={s.id} className="flex items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-2 text-cream">
            <img src={symbolImage(s.id, pack)} alt="" className="size-8 rounded-md object-cover" />
            {s.label}
          </span>
          <span className="tabular text-cream/70">
            {s.pay[3]}x · {s.pay[4]}x · {s.pay[5]}x
          </span>
        </li>
      ))}
    </ul>
  );
}
