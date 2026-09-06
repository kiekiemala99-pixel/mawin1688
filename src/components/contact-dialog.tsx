import { useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Copy, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";
import { LineMark } from "./icons";

const LINE_URL = "https://lin.ee/zUDsggSO";

export function ContactDialog({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-navy/70" />
        <Dialog.Content className="ornament-card fixed top-1/2 left-1/2 z-50 w-[min(92vw,380px)] -translate-x-1/2 -translate-y-1/2 rounded-3xl p-5 text-ink shadow-2xl outline-none">
          <div className="flex items-start justify-between">
            <Dialog.Title className="text-lg font-semibold">ติดต่อเจ้าหน้าที่</Dialog.Title>
            <Dialog.Close className="rounded-md p-1 text-muted hover:bg-cream-deep">
              <X className="size-5" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-1 text-sm text-muted">
            แอดไลน์เพื่อสมัคร ฝาก-ถอน หรือสอบถามรอบหวย / ราคาบอล
          </Dialog.Description>
          <div className="mt-4 rounded-xl bg-cream px-3 py-3">
            <div className="flex items-center gap-2">
              <LineMark className="size-8 text-line" />
              <div>
                <div className="text-xs text-muted">ไลน์มาวิน1688</div>
                <div className="text-sm font-semibold">lin.ee/zUDsggSO</div>
              </div>
            </div>
            <a
              href={LINE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-line mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold"
            >
              <ExternalLink className="size-4" />
              เปิดไลน์
            </a>
            <button
              type="button"
              className="mt-2 inline-flex h-10 w-full items-center justify-center gap-1 rounded-lg bg-navy px-3 text-sm font-semibold text-cream"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(LINE_URL);
                  toast.success("คัดลอกลิงก์ไลน์แล้ว");
                } catch {
                  toast.message(LINE_URL);
                }
              }}
            >
              <Copy className="size-4" />
              คัดลอกลิงก์
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
