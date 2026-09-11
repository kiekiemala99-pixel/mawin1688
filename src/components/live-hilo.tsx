import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { playMiniGame, type MiniPlayView } from "@/lib/minigame-server";
import { MINI_STAKES, getMiniGame } from "@/lib/minigames";
import { useStore } from "@/lib/store";
import { formatBaht } from "@/lib/format";
import { cn } from "@/lib/utils";
import { WinFx } from "@/components/win-fx";

const GAME = getMiniGame("hilo")!;
const HIST_KEY = "mawin-hilo-hist";

type Hist = { dice: number[]; pick: string; status: string };

const SPOTS = [
  { id: "small", label: "ต่ำ", sub: "4–10", pay: "x1", wide: false },
  { id: "eleven", label: "11 ไฮโล", sub: "ออก 11", pay: "x7", wide: false },
  { id: "big", label: "สูง", sub: "11–17", pay: "x1", wide: false },
  { id: "triple", label: "ตองใดๆ", sub: "สามลูกเหมือน", pay: "x30", wide: true },
] as const;

function loadHist(): Hist[] {
  try {
    const raw = sessionStorage.getItem(HIST_KEY);
    const rows = raw ? (JSON.parse(raw) as Hist[]) : [];
    return Array.isArray(rows) ? rows.slice(0, 12) : [];
  } catch {
    return [];
  }
}

export function LiveHilo() {
  const wallet = useStore((s) => s.wallet);
  const refresh = useStore((s) => s.refresh);
  const [stake, setStake] = useState(10);
  const [pick, setPick] = useState("small");
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<MiniPlayView | null>(null);
  const [hist, setHist] = useState<Hist[]>([]);
  const [tick, setTick] = useState(8);

  useEffect(() => {
    setHist(loadHist());
  }, []);

  useEffect(() => {
    if (busy) {
      setTick(2);
      return;
    }
    const t = window.setInterval(() => setTick((n) => (n <= 1 ? 8 : n - 1)), 1000);
    return () => window.clearInterval(t);
  }, [busy]);

  async function play() {
    if (busy) return;
    if ((wallet?.balance ?? 0) < stake) {
      toast.error("เครดิตไม่พอ");
      return;
    }
    setBusy(true);
    try {
      const { play: outcome, balance } = await playMiniGame({ data: { gameId: "hilo", pick, stake } });
      useStore.setState((s) => (s.wallet ? { wallet: { ...s.wallet, balance } } : s));
      setLast(outcome);
      const dice = outcome.reveal.dice ?? [];
      const next = [{ dice, pick, status: outcome.status }, ...hist].slice(0, 12);
      setHist(next);
      sessionStorage.setItem(HIST_KEY, JSON.stringify(next));
      void refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เล่นไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  const stats = useMemo(() => {
    const n = hist.length || 1;
    const low = hist.filter((h) => {
      const s = (h.dice ?? []).reduce((a, b) => a + b, 0);
      return s >= 4 && s <= 10;
    }).length;
    return { low: Math.round((low / n) * 100), high: Math.round(((n - low) / n) * 100) };
  }, [hist]);

  const won = !busy && last?.status === "won";
  const dice = last?.reveal.dice ?? [1, 2, 3];

  return (
    <div className="live-table">
      <WinFx show={!!won} amount={last?.payout ?? 0} />
      <header className="live-hud">
        <a href="/app/games" className="game-hud-btn" aria-label="ย้อนกลับ">
          ←
        </a>
        <div className="min-w-0 flex-1 text-center">
          <div className="text-sm font-bold text-gold-bright">ไฮโลไทย</div>
          <div className="tabular text-base font-semibold text-cream">฿ {formatBaht(wallet?.balance ?? 0)}</div>
        </div>
        <span className="rounded-full bg-navy-card px-2 py-1 text-[10px] text-cream/70">ขั้นต่ำ 1</span>
      </header>

      <div className="relative">
        <img src="/mini/covers/live-host.jpg" alt="" className="live-host" />
        <div className="live-host-shade" />
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-navy-deep/80 px-3 py-1 text-xs text-gold-bright">
          {busy ? "กำลังออกผล" : `รอบถัดไป ${tick}`}
        </div>
      </div>

      <div className="live-felt">
        <div className="grid grid-cols-3 gap-1.5">
          {SPOTS.filter((s) => !s.wide).map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={busy}
              onClick={() => setPick(s.id)}
              className={cn("hilo-spot", pick === s.id && "is-on")}
            >
              <span className="text-[10px] text-gold-bright">{s.pay}</span>
              <span className="text-lg font-black leading-none">{s.label}</span>
              <span className="text-[10px] text-cream/55">{s.sub}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => setPick("triple")}
          className={cn("hilo-spot mt-1.5 w-full", pick === "triple" && "is-on")}
        >
          <span className="text-[10px] text-gold-bright">x30</span>
          <span className="text-base font-black">ตองใดๆ</span>
        </button>

        <div className="mt-3 flex justify-center gap-2">
          {(busy ? [0, 0, 0] : dice).map((n, i) => (
            <Dice key={i} n={busy ? (i + 1) : n} rolling={busy} />
          ))}
        </div>
        <p className="mt-2 min-h-5 text-center text-xs font-semibold">
          {busy && <span className="text-gold-bright">ทอยเต๋า…</span>}
          {!busy && last && (
            <span className={last.status === "lost" ? "text-lose" : last.status === "push" ? "text-cream" : "text-win"}>
              {last.summary}
              {last.status === "won" ? ` · ได้ ฿ ${formatBaht(last.payout)}` : last.status === "push" ? " · คืนทุน" : " · ไม่เข้า"}
            </span>
          )}
        </p>
      </div>

      <div className="live-dock">
        <div className="mb-2 flex items-center justify-between text-[11px] text-cream/55">
          <span>ต่ำ {stats.low}%</span>
          <span>สูง {stats.high}%</span>
        </div>
        <div className="hilo-hist">
          {hist.length === 0 ? <span className="px-2 text-[11px] text-cream/40">ยังไม่มีประวัติรอบนี้</span> : null}
          {hist.map((h, i) => (
            <div key={i} className={cn("hilo-hist-col", h.status === "won" && "is-win")}>
              {(h.dice ?? []).map((d, j) => (
                <span key={j} className="hilo-mini-die">
                  {d}
                </span>
              ))}
            </div>
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
        <p className="mt-1 text-center text-[11px] text-cream/45">{GAME.payHint}</p>
      </div>
    </div>
  );
}

function Dice({ n, rolling }: { n: number; rolling?: boolean }) {
  return <span className={cn("dice-face", rolling && "is-roll")}>{rolling ? "?" : n}</span>;
}
