import { useMemo, useState } from "react";
import { History, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { playMiniGame, type MiniPlayView } from "@/lib/minigame-server";
import { formatBaht } from "@/lib/format";
import { RPS_HANDS, RPS_STAKES, formatClock, rpsOccupancy, rpsRemainingSec, type RpsHand } from "@/lib/rps";
import { useNow } from "@/hooks/use-now";
import { useSessionUser, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { WinFx } from "@/components/win-fx";

export function RpsRooms() {
  const now = useNow(250);
  const user = useSessionUser();
  const bets = useStore((s) => s.bets);
  const refresh = useStore((s) => s.refresh);
  const [stake, setStake] = useState(20);
  const [confirm, setConfirm] = useState(true);
  const [tab, setTab] = useState<"all" | "mine">("all");
  const [sheet, setSheet] = useState<"none" | "rules" | "history">("none");
  const [sound, setSound] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<RpsHand | null>(null);
  const [last, setLast] = useState<MiniPlayView | null>(null);
  const remain = rpsRemainingSec(now);

  const mine = useMemo(
    () => bets.filter((b) => b.kind === "mini" && b.label.includes("เป่ายิ้งฉุบ")).slice(0, 8),
    [bets],
  );

  async function play(hand: RpsHand) {
    if (busy) return;
    if ((user?.balance ?? 0) < stake) {
      toast.error("เครดิตไม่พอ");
      return;
    }
    if (confirm && pending !== hand) {
      setPending(hand);
      return;
    }
    setBusy(true);
    setPending(null);
    try {
      const { play: outcome, balance } = await playMiniGame({ data: { gameId: "rps", pick: hand, stake } });
      useStore.setState((s) => (s.wallet ? { wallet: { ...s.wallet, balance } } : s));
      setLast(outcome);
      void refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เล่นไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  const won = last?.status === "won";

  return (
    <div className="rps-stage">
      <WinFx show={Boolean(won && !busy)} amount={last?.payout ?? 0} />
      <header className="flex items-center justify-between px-3 pt-3">
        <a href="/app/games" className="game-hud-btn" aria-label="ย้อนกลับ">
          ←
        </a>
        <div className="min-w-0 text-center">
          <div className="truncate text-xs text-cream/60">{user?.username}</div>
          <div className="tabular text-lg font-semibold text-gold-bright">฿ {formatBaht(user?.balance ?? 0)}</div>
        </div>
        <button type="button" className="game-hud-btn" onClick={() => setSound((v) => !v)} aria-label="เสียง">
          {sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
        </button>
      </header>

      <div className="mt-3 grid grid-cols-3 gap-2 px-3">
        <button type="button" onClick={() => setSheet("rules")} className="rps-tab">
          กติกาเกม
        </button>
        <div className="rps-tab-active">ห้องทั้งหมด</div>
        <button type="button" onClick={() => setSheet("history")} className="rps-tab">
          ประวัติ
        </button>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 px-3">
        {RPS_STAKES.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setStake(n)}
            className={cn("rps-stake", stake === n && "is-on")}
          >
            <span className="rps-badge">{rpsOccupancy(n, now)}</span>
            <span className="text-gold-bright">฿</span> {n.toLocaleString("th-TH")}
          </button>
        ))}
      </div>

      <label className="mt-3 flex items-center justify-end gap-2 px-4 text-sm text-cream">
        ยืนยันก่อนส่ง
        <button
          type="button"
          role="switch"
          aria-checked={confirm}
          onClick={() => setConfirm((v) => !v)}
          className={cn("rps-switch", confirm && "is-on")}
        />
      </label>

      <div className="mt-2 grid grid-cols-2 px-3">
        <button type="button" onClick={() => setTab("all")} className={cn("rps-sub", tab === "all" && "is-on")}>
          ห้องทั้งหมด
        </button>
        <button type="button" onClick={() => setTab("mine")} className={cn("rps-sub", tab === "mine" && "is-on")}>
          ห้องของฉัน
        </button>
      </div>

      <div className="mt-3 space-y-3 px-3 pb-8">
        {tab === "mine" && mine.length === 0 ? (
          <p className="rounded-2xl bg-navy-card px-4 py-8 text-center text-sm text-cream/60">ยังไม่มีห้องที่คุณเล่น</p>
        ) : null}

        {(tab === "mine" ? mine.map((b) => b.stake) : [stake]).map((roomStake, idx) => (
          <RoomCard
            key={`${roomStake}-${idx}`}
            stake={Number(roomStake)}
            remain={remain}
            user={user?.username ?? "คุณ"}
            pending={pending}
            busy={busy}
            last={idx === 0 ? last : null}
            confirm={confirm}
            onPick={(h) => void play(h)}
          />
        ))}
      </div>

      {sheet !== "none" && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 p-3" onClick={() => setSheet("none")}>
          <div className="w-full max-w-lg rounded-2xl bg-navy-card p-4" onClick={(e) => e.stopPropagation()}>
            {sheet === "rules" ? (
              <div className="space-y-2 text-sm text-cream">
                <h3 className="text-base font-semibold text-gold-bright">กติกาเป่ายิ้งฉุบ</h3>
                <p>เลือกค้อน กระดาษ หรือกรรไกร ก่อนหมดเวลารอบ</p>
                <p>ค้อนชนะกรรไกร · กรรไกรชนะกระดาษ · กระดาษชนะค้อน</p>
                <p>ชนะได้ 1:1 (รวมทุน 2 เท่า) · เสมอคืนทุน · แพ้เสียตามยอดห้อง</p>
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className="flex items-center gap-2 text-base font-semibold text-gold-bright">
                  <History className="size-4" /> ประวัติ
                </h3>
                {mine.length === 0 ? (
                  <p className="text-sm text-cream/60">ยังไม่มีรายการ</p>
                ) : (
                  mine.map((b) => (
                    <div key={b.id} className="flex justify-between rounded-xl bg-navy-deep px-3 py-2 text-sm">
                      <span className="text-cream">{b.kind === "mini" ? b.label : ""}</span>
                      <span className={b.status === "won" ? "text-win" : b.status === "lost" ? "text-lose" : "text-cream"}>
                        {b.status === "won" ? `+${formatBaht(b.payout)}` : b.status === "lost" ? `-${formatBaht(b.stake)}` : "คืนทุน"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
            <button type="button" className="btn-gold mt-4 h-11 w-full rounded-xl" onClick={() => setSheet("none")}>
              ปิด
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RoomCard({
  stake,
  remain,
  user,
  pending,
  busy,
  last,
  confirm,
  onPick,
}: {
  stake: number;
  remain: number;
  user: string;
  pending: RpsHand | null;
  busy: boolean;
  last: MiniPlayView | null;
  confirm: boolean;
  onPick: (h: RpsHand) => void;
}) {
  return (
    <article className="rps-room">
      <div className="mb-2 text-right text-xs text-gold-bright">เหลือเวลา {formatClock(remain)}</div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 rounded-full bg-navy-deep px-3 py-1.5">
          <span className="grid size-7 place-items-center rounded-full bg-navy-card text-xs text-cream">คุณ</span>
          <span className="truncate text-sm font-semibold text-cream">{user}</span>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-navy-deep px-3 py-1.5 text-gold-bright">
          <span>฿</span>
          <span className="tabular font-semibold">{stake.toLocaleString("th-TH")}</span>
        </div>
      </div>
      {last ? (
        <p className={cn("mb-2 text-center text-sm font-semibold", last.status === "won" ? "text-win" : last.status === "lost" ? "text-lose" : "text-cream")}>
          {last.summary}
          {last.status === "won" ? ` · ได้ ฿ ${formatBaht(last.payout)}` : last.status === "push" ? " · คืนทุน" : ""}
        </p>
      ) : pending && confirm ? (
        <p className="mb-2 text-center text-sm text-gold-bright">แตะอีกครั้งเพื่อยืนยัน {RPS_HANDS.find((h) => h.id === pending)?.label}</p>
      ) : null}
      <div className="grid grid-cols-3 gap-2">
        {RPS_HANDS.map((h) => (
          <button
            key={h.id}
            type="button"
            disabled={busy}
            onClick={() => onPick(h.id)}
            className={cn("rps-hand", pending === h.id && "is-on")}
          >
            <img src={h.img} alt={h.label} />
          </button>
        ))}
      </div>
    </article>
  );
}
