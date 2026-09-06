import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Gift, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PROMO_KINDS, claimPromo, listMyPromos, type PromoView } from "@/lib/promo-server";
import { GoldCard } from "@/components/gold-card";
import { formatBaht } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/promo")({ component: PromoPage });

function kindLabel(kind: string) {
  return PROMO_KINDS.find((k) => k.id === kind)?.label ?? kind;
}

function PromoPage() {
  const [rows, setRows] = useState<PromoView[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    try {
      setRows(await listMyPromos());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "โหลดโปรโมชันไม่สำเร็จ");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function claim(id: string) {
    if (busy) return;
    setBusy(id);
    try {
      await claimPromo({ data: { id } });
      toast.success("แจ้งรับโปรแล้ว · รอแอดมินตรวจสอบ");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "กดรับไม่สำเร็จ");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-3">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-semibold text-gold-bright">
          <Gift className="size-5" />
          โปรโมชันมาวิน1688
        </h1>
        <p className="text-xs text-cream/55">ทำยอดเครดิตตามเทิร์นจึงจะถอนได้ · นับยอดเงินที่นำไปเล่น ไม่สนได้หรือเสีย</p>
      </div>
      {rows.length === 0 && (
        <p className="rounded-2xl bg-navy-card px-4 py-8 text-center text-sm text-cream/60">ยังไม่มีโปรโมชันที่เปิดใช้งาน</p>
      )}
      {rows.map((p) => (
        <GoldCard key={p.id}>
          <div className="inline-flex items-center gap-1 rounded-full bg-gold-ink px-2 py-0.5 text-[10px] font-semibold text-gold-bright">
            <Sparkles className="size-3" />
            {kindLabel(p.kind)}
            {p.subtitle ? ` · ${p.subtitle}` : ""}
          </div>
          <h2 className="mt-2 text-xl font-bold text-gold-bright">{p.title}</h2>
          <p className="tabular mt-1 text-sm text-cream/80">
            {p.bonusType === "percent" ? `โบนัส ${p.bonusPercent}%` : `โบนัส ฿ ${formatBaht(p.bonusAmount)}`}
            {p.estimatedBonus > 0 ? ` · ประมาณ ฿ ${formatBaht(p.estimatedBonus)}` : ""}
          </p>
          <p className="mt-2 text-xs text-cream/55">
            {p.minDeposit > 0 ? `ฝากขั้นต่ำ ฿ ${formatBaht(p.minDeposit, 0)}` : "ไม่กำหนดยอดฝากขั้นต่ำ"}
            {p.turnoverX > 0
              ? ` · เทิร์น ${p.turnoverX} เท่าของยอดเงิน${p.estimatedTurnover > 0 ? ` (ต้องทำ ฿ ${formatBaht(p.estimatedTurnover, 0)})` : ""}`
              : ""}
          </p>
          {p.rules ? <p className="mt-2 text-xs leading-5 text-cream/60">{p.rules}</p> : null}
          <ClaimButton promo={p} busy={busy === p.id} onClaim={() => void claim(p.id)} />
        </GoldCard>
      ))}
    </div>
  );
}

function ClaimButton({
  promo,
  busy,
  onClaim,
}: {
  promo: PromoView;
  busy: boolean;
  onClaim: () => void;
}) {
  if (promo.status === "pending") {
    return (
      <div className="mt-4 h-12 rounded-xl bg-navy-mid text-center text-sm leading-[48px] font-semibold text-gold-bright">
        รอแอดมินตรวจสอบ
      </div>
    );
  }
  if (promo.status === "approved") {
    return (
      <div className="mt-4 h-12 rounded-xl bg-win/15 text-center text-sm leading-[48px] font-semibold text-win">
        รับโปรนี้แล้ว
      </div>
    );
  }
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClaim}
      className={cn("btn-gold mt-4 h-12 w-full rounded-xl text-sm font-bold disabled:opacity-60")}
    >
      {busy ? "กำลังแจ้งแอดมิน…" : "กดรับโปร"}
    </button>
  );
}
