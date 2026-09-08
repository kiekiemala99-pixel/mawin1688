export function formatWhen(ms?: number | null) {
  if (!ms) return "";
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatBaht(n: number, digits = 2) {
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatOdds(n: number) {
  return n.toFixed(2);
}

export function formatHandicap(n: number) {
  if (n === 0) return "0";
  const abs = Math.abs(n);
  const sign = n > 0 ? "+" : "-";
  return `${sign}${abs}`;
}
