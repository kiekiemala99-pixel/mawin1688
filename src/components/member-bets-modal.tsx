import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { toast } from "sonner";
import { formatBaht } from "@/lib/format";
import { PLAY_TYPES } from "@/lib/lottery";
import { cn } from "@/lib/utils";
import { listMemberBets, type BetView, type MemberBetReport, type StaffMember } from "@/lib/wallet-server";

function playLabel(play?: string) {
  return PLAY_TYPES.find((p) => p.id === play)?.label ?? play ?? "-";
}

function statusLabel(status: BetView["status"]) {
  if (status === "won") return "ชนะ";
  if (status === "lost") return "แพ้";
  if (status === "push") return "คืนทุน";
  return "รอผล";
}

export function MemberBetsModal({ user, onClose }: { user: StaffMember; onClose: () => void }) {
  const [report, setReport] = useState<MemberBetReport | null>(null);

  useEffect(() => {
    void listMemberBets({ data: { userId: user.userId } })
      .then(setReport)
      .catch((e) => toast.error(e instanceof Error ? e.message : "โหลดประวัติไม่สำเร็จ"));
  }, [user.userId]);

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-navy/75" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[88dvh] w-[min(94vw,440px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-navy-card p-4 text-cream shadow-[0_0_0_1px_rgba(201,164,74,0.35)] outline-none">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Dialog.Title className="text-lg font-semibold text-gold-bright">ประวัติเดิมพัน</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-xs text-cream/55">
                {user.username} · {user.phone}
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded-md p-1 text-cream/60 hover:bg-navy-mid">
              <X className="size-5" />
            </Dialog.Close>
          </div>

          {!report ? (
            <p className="mt-4 text-sm text-cream/60">กำลังโหลดโพย…</p>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
                <div className="rounded-xl bg-navy-mid px-2 py-2">
                  <div className="text-cream/50">เดิมพันที่ออกผล</div>
                  <div className="tabular mt-0.5 text-sm font-semibold">{formatBaht(report.totalStake, 0)}</div>
                </div>
                <div className="rounded-xl bg-navy-mid px-2 py-2">
                  <div className="text-cream/50">ได้คืน</div>
                  <div className="tabular mt-0.5 text-sm font-semibold text-win">{formatBaht(report.totalPayout, 0)}</div>
                </div>
                <div className="rounded-xl bg-navy-mid px-2 py-2">
                  <div className="text-cream/50">ได้ / เสีย</div>
                  <div className={cn("tabular mt-0.5 text-sm font-semibold", report.net >= 0 ? "text-win" : "text-lose")}>
                    {report.net >= 0 ? "+" : ""}
                    {formatBaht(report.net, 0)}
                  </div>
                </div>
                <div className="rounded-xl bg-navy-mid px-2 py-2">
                  <div className="text-cream/50">รอผล</div>
                  <div className="tabular mt-0.5 text-sm font-semibold text-gold-bright">{formatBaht(report.pendingStake, 0)}</div>
                </div>
              </div>
              <p className="mt-2 text-center text-[11px] text-cream/45">
                ชนะ {report.won} · แพ้ {report.lost}
                {report.push ? ` · คืนทุน ${report.push}` : ""}
                {report.pending ? ` · รอผล ${report.pending}` : ""}
              </p>

              <div className="mt-3 space-y-1.5">
                {report.bets.map((b) => (
                  <article key={b.id} className="rounded-xl bg-navy-mid px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {b.kind === "lottery" ? (
                          <>
                            <div className="text-sm font-semibold text-cream">{b.payload.marketName ?? "หวย"}</div>
                            <div className="mt-0.5 text-xs text-cream/55">
                              {playLabel(b.payload.play)} · เลข {b.payload.number ?? "-"}
                              {b.payload.rate ? ` · เรท 1:${b.payload.rate}` : ""}
                            </div>
                          </>
                        ) : b.kind === "slot" || b.kind === "mini" ? (
                          <>
                            <div className="text-sm font-semibold text-cream">{b.payload.label ?? (b.kind === "mini" ? "มินิเกม" : "สล็อต")}</div>
                            <div className="mt-0.5 text-xs text-cream/55">{b.kind === "mini" ? "มินิเกมพื้นบ้าน" : "สล็อต"}</div>
                          </>
                        ) : (
                          <>
                            <div className="text-sm font-semibold text-cream">บอล</div>
                            <div className="mt-0.5 text-xs text-cream/55">
                              {b.payload.label ?? "-"}
                              {b.payload.odds ? ` · @${Number(b.payload.odds).toFixed(2)}` : ""}
                            </div>
                          </>
                        )}
                        <div className="mt-0.5 text-[11px] text-cream/40">
                          {new Date(b.createdAt).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            b.status === "won"
                              ? "bg-win/20 text-win"
                              : b.status === "lost"
                                ? "bg-lose/20 text-lose"
                                : b.status === "push"
                                  ? "bg-cream/10 text-cream/70"
                                  : "bg-gold/20 text-gold-bright",
                          )}
                        >
                          {statusLabel(b.status)}
                        </span>
                        <div className="tabular mt-1 text-xs text-cream/60">แทง {formatBaht(b.stake, 0)}</div>
                        <div className="tabular text-sm font-semibold text-gold-bright">ได้ {formatBaht(b.payout, 0)}</div>
                      </div>
                    </div>
                  </article>
                ))}
                {report.bets.length === 0 && <p className="py-4 text-center text-sm text-cream/50">ยังไม่มีโพย</p>}
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
