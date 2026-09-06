export type BangkokParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: string;
  dateKey: string;
  ms: number;
};

function part(parts: Intl.DateTimeFormatPart[], type: string, fallback = "0") {
  return parts.find((p) => p.type === type)?.value ?? fallback;
}

export function bangkokParts(date: Date = new Date()): BangkokParts {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(date);
  const year = Number(part(parts, "year"));
  const month = Number(part(parts, "month"));
  const day = Number(part(parts, "day"));
  const hour = Number(part(parts, "hour"));
  const minute = Number(part(parts, "minute"));
  const second = Number(part(parts, "second"));
  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    weekday: part(parts, "weekday", ""),
    dateKey: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    ms: date.getTime(),
  };
}

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function formatThaiDate(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const months = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
  ];
  return `${d} ${months[(m ?? 1) - 1]} ${y}`;
}

export function formatEnShort(dateKey: string) {
  const [y, m, d] = dateKey.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${months[Number(m) - 1]} ${y}`;
}

export function formatClock(hour: number, minute: number, second?: number) {
  if (second === undefined) return `${pad2(hour)}:${pad2(minute)}`;
  return `${pad2(hour)}:${pad2(minute)}:${pad2(second)}`;
}

export function secondsToClock(total: number) {
  const s = Math.max(0, Math.floor(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${pad2(h)}:${pad2(m)}:${pad2(sec)}`;
  return `${pad2(m)}:${pad2(sec)}`;
}

export function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function paddedDigits(seed: string, n: number): string {
  const mod = 10 ** n;
  return String(hash32(seed) % mod).padStart(n, "0");
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
