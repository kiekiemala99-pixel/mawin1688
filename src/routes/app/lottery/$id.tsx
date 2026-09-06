import { useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { useNow } from "@/hooks/use-now";
import {
  PLAY_TYPES,
  getMarketState,
  marketById,
  playMeta,
  randomNumber,
  reverseNumber,
  type MarketId,
  type PlayType,
} from "@/lib/lottery";
import { secondsToClock } from "@/lib/time";
import { useSessionUser, useStore } from "@/lib/store";
import { GoldCard } from "@/components/gold-card";
import { StatusPill } from "@/components/result-cards";
import { cn } from "@/lib/utils";
import { STAKE_CHIPS } from "@/lib/football";
import { formatBaht } from "@/lib/format";
import { PayoutTicker } from "@/components/payout-board";
import { GameStage } from "@/components/game-stage";

export const Route = createFileRoute("/app/lottery/$id")({ component: LotteryDesk });

type PoyLine = {
  key: string;
  play: PlayType;
  number: string;
  stake: number;
  rate: number;
};

function LotteryDesk() {
  const { id } = Route.useParams();
  const market = marketById(id);
  const now = useNow(1000);
  const date = new Date(now);
  const st = getMarketState((market?.id ?? "yeekee") as MarketId, date);
  const sendSlip = useStore((s) => s.placeLotterySlip);
  const user = useSessionUser();
  const [play, setPlay] = useState<PlayType>("3top");
  const meta = playMeta(play);
  const [number, setNumber] = useState("");
  const [stake, setStake] = useState(20);
  const [poy, setPoy] = useState<PoyLine[]>([]);
  const [busy, setBusy] = useState(false);

  const shown = st.result ?? st.previous?.result;
  const valid = useMemo(() => number.length === meta.digits, [number, meta.digits]);
  const poyTotal = poy.reduce((sum, line) => sum + line.stake, 0);

  if (!market) {
    return (
      <p className="text-cream">
        ไม่พบตลาดนี้ · <Link to="/app/lottery">กลับ</Link>
      </p>
    );
  }

  const desk = market;
  const marketName = `${desk.name} ${st.label}`;

  function addLine(n: string) {
    if (n.length !== meta.digits) {
      toast.error(`กรอกเลข ${meta.digits} หลัก`);
      return false;
    }
    if (!st.open) {
      toast.error("ปิดรับแทงแล้ว");
      return false;
    }
    if (poy.length >= 40) {
      toast.error("โพยเต็มแล้ว");
      return false;
    }
    setPoy((rows) => [
      ...rows,
      { key: crypto.randomUUID(), play, number: n, stake, rate: meta.rate },
    ]);
    setNumber("");
    return true;
  }

  async function sendPoy() {
    if (busy) return;
    let rows = poy;
    if (rows.length === 0 && valid) {
      rows = [{ key: "once", play, number, stake, rate: meta.rate }];
    }
    if (rows.length === 0) {
      toast.error("ใส่เลขในโพยก่อน");
      return;
    }
    if (!st.open) {
      toast.error("ปิดรับแทงแล้ว");
      return;
    }
    const total = rows.reduce((sum, line) => sum + line.stake, 0);
    if (user && user.balance < total) {
      toast.error("เครดิตไม่พอ");
      return;
    }
    setBusy(true);
    try {
      const err = await sendSlip(
        rows.map((line) => ({
          marketId: desk.id,
          roundKey: st.roundKey,
          marketName,
          play: line.play,
          number: line.number,
          rate: line.rate,
          stake: line.stake,
        })),
      );
      if (err) {
        toast.error(err);
        return;
      }
      toast.success(`ส่งโพย ${rows.length} รายการ · หัก ${total.toLocaleString("th-TH")} บาท`);
      setPoy([]);
      setNumber("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <GameStage
      backTo="/app/lottery"
      title={market.name}
      subtitle={`${st.label} · ${st.open ? `ปิดรับ ${secondsToClock(st.remainingSec)}` : "ปิดรับแทง"}`}
      extraHud={<StatusPill open={st.open} />}
      dock={
        <div className="mx-auto w-full max-w-md space-y-2">
          <div className="flex items-center justify-between text-sm text-cream/80">
            <span>โพย {poy.length} รายการ</span>
            <span className="tabular font-semibold text-gold-bright">
              ฿ {formatBaht(poyTotal || (valid ? stake : 0), 0)}
            </span>
          </div>
          <button
            type="button"
            disabled={!st.open || busy}
            onClick={() => void sendPoy()}
            className="spin-3d text-base disabled:opacity-50"
          >
            {!st.open ? "ปิดรับแทง" : busy ? "กำลังหักเครดิต…" : "ส่งโพย"}
          </button>
        </div>
      }
    >
      <div className="mx-auto w-full max-w-md space-y-3 pb-2">
        <PayoutTicker />
        <GoldCard className="p-3">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-cream py-2">
              <div className="text-xs text-muted">3 ตัวบนล่าสุด</div>
              <div className="tabular text-xl font-semibold tracking-[0.2em]">{shown?.top3 ?? "XXX"}</div>
            </div>
            <div className="rounded-lg bg-cream py-2">
              <div className="text-xs text-muted">2 ตัวล่างล่าสุด</div>
              <div className="tabular text-xl font-semibold tracking-[0.2em]">{shown?.bottom2 ?? "XX"}</div>
            </div>
          </div>
        </GoldCard>

        <div className="grid grid-cols-3 gap-1.5">
          {PLAY_TYPES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setPlay(p.id);
                setNumber("");
              }}
              className={cn(
                "rounded-lg py-2 text-xs font-semibold",
                play === p.id ? "btn-gold" : "bg-navy-card text-cream/80 shadow-[0_0_0_1px_rgba(201,164,74,0.2)]",
              )}
            >
              {p.label}
              <div className="tabular text-base font-black leading-none">1:{p.rate}</div>
            </button>
          ))}
        </div>
        <p className="rounded-xl bg-gold-ink/90 px-3 py-2 text-center text-sm font-semibold text-gold-bright">
          {meta.label} · แทง {stake.toLocaleString("th-TH")} บาท ถูกได้{" "}
          <span className="tabular text-lg">฿ {(stake * meta.rate).toLocaleString("th-TH")}</span>
        </p>

        <GoldCard>
          <label className="block text-sm font-medium text-muted">เลขที่ต้องการแทง</label>
          <input
            inputMode="numeric"
            maxLength={meta.digits}
            value={number}
            onChange={(e) => setNumber(e.target.value.replace(/\D/g, "").slice(0, meta.digits))}
            placeholder={"X".repeat(meta.digits)}
            className="mt-2 h-16 w-full rounded-xl bg-cream text-center font-semibold text-4xl tracking-[0.4em] text-ink outline-none shadow-[0_0_0_1px_rgba(201,164,74,0.35)]"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="h-11 rounded-lg bg-cream-deep px-3 text-sm font-medium" onClick={() => setNumber(randomNumber(meta.digits))}>
              สุ่มเลข
            </button>
            {meta.digits > 1 && (
              <button type="button" className="h-11 rounded-lg bg-cream-deep px-3 text-sm font-medium" onClick={() => valid && addLine(reverseNumber(number))}>
                ใส่เลขกลับ
              </button>
            )}
          </div>
          <div className="mt-4 text-sm font-medium text-muted">ราคาต่อเลข (บาท)</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {STAKE_CHIPS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setStake(c)}
                className={cn("h-10 min-w-14 rounded-lg px-2 text-sm font-semibold", stake === c ? "btn-gold" : "bg-cream-deep text-ink")}
              >
                {c}
              </button>
            ))}
          </div>
          <input
            type="number"
            min={1}
            value={stake}
            onChange={(e) => setStake(Number(e.target.value))}
            className="mt-2 h-11 w-full rounded-lg bg-cream px-3 text-ink outline-none shadow-[0_0_0_1px_rgba(10,20,40,0.08)]"
          />
          <button type="button" disabled={!st.open || !valid} onClick={() => addLine(number)} className="mt-3 h-12 w-full rounded-xl bg-cream-deep text-base font-semibold disabled:opacity-50">
            ใส่โพย
          </button>
        </GoldCard>

        <GoldCard>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">โพยหวย</h2>
            <span className="tabular text-sm text-muted">{poy.length} รายการ</span>
          </div>
          <div className="mt-2 space-y-1.5">
            {poy.map((line) => (
              <div key={line.key} className="flex items-center justify-between rounded-lg bg-cream px-3 py-2 text-sm">
                <div>
                  <span className="tabular font-semibold tracking-widest">{line.number}</span>
                  <span className="ml-2 text-muted">{playMeta(line.play).label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="tabular font-semibold">{line.stake}</span>
                  <button type="button" aria-label="ลบรายการ" className="text-lose" onClick={() => setPoy((rows) => rows.filter((r) => r.key !== line.key))}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
            {poy.length === 0 && <p className="text-sm text-muted">ยังไม่มีเลขในโพย · กดใส่โพยหรือส่งเลขปัจจุบันได้เลย</p>}
          </div>
        </GoldCard>
      </div>
    </GameStage>
  );
}
