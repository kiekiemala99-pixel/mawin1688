import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function IconField({
  icon,
  className,
  placeholder,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { icon: ReactNode }) {
  return (
    <label className={cn("flex overflow-hidden rounded-lg bg-card shadow-[0_0_0_1px_rgba(10,20,40,0.08)]", className)}>
      <span className="flex w-12 shrink-0 items-center justify-center bg-cream-deep text-muted">{icon}</span>
      <input
        className="h-12 min-w-0 flex-1 bg-card px-3 text-[15px] text-ink outline-none placeholder:text-muted/80"
        placeholder={placeholder}
        aria-label={typeof placeholder === "string" ? placeholder : undefined}
        {...props}
      />
    </label>
  );
}
