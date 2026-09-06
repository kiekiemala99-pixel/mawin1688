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
