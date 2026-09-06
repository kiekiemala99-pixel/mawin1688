import type { ChangeEvent } from "react";

export function AmountField({
  value,
  onChange,
  label = "หรือพิมพ์จำนวนเอง",
  placeholder = "พิมพ์ตัวเลข เช่น 1",
}: {
  value: string;
  onChange: (next: string) => void;
  label?: string;
  placeholder?: string;
}) {
  function handle(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^\d]/g, "");
    onChange(raw.replace(/^0+(?=\d)/, ""));
  }

  return (
    <label className="mt-3 block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      <div className="flex h-14 items-center rounded-xl bg-white px-3 shadow-[0_0_0_2px_rgba(201,164,74,0.55)]">
        <span className="pr-2 text-lg font-semibold text-gold-deep">฿</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          enterKeyHint="done"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={placeholder}
          value={value}
          onChange={handle}
          onFocus={(e) => e.currentTarget.select()}
          className="h-full min-w-0 flex-1 bg-transparent text-lg font-semibold text-ink outline-none"
        />
        <span className="pl-2 text-sm text-muted">บาท</span>
      </div>
    </label>
  );
}

export function parseBaht(raw: string) {
  const n = Number(String(raw).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}
