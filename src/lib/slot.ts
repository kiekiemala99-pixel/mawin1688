import type { SlotPack } from "@/lib/slot-games";

export const SLOT_COLS = 5;
export const SLOT_ROWS = 3;
export const SLOT_LINES = 9;
export const SLOT_MIN_STAKE = 1;
export const SLOT_MAX_STAKE = 500;
export const SLOT_RTP = 1;

export const SLOT_STAKES = [1, 5, 10, 20, 50, 100, 200, 500] as const;

export type SlotSymbolId = string;

export type SlotSymbol = {
  id: SlotSymbolId;
  label: string;
  weight: number;
  pay: { 3: number; 4: number; 5: number };
  tone: string;
};

export const SLOT_SYMBOLS: SlotSymbol[] = [
  { id: "cherry", label: "เชอร์รี่", weight: 36, pay: { 3: 5, 4: 15, 5: 40 }, tone: "tone-cherry" },
  { id: "bar", label: "บาร์", weight: 24, pay: { 3: 8, 4: 25, 5: 60 }, tone: "tone-bar" },
  { id: "coin", label: "เหรียญ", weight: 16, pay: { 3: 10, 4: 40, 5: 80 }, tone: "tone-coin" },
  { id: "gem", label: "เพชร", weight: 10, pay: { 3: 15, 4: 50, 5: 120 }, tone: "tone-gem" },
  { id: "seven", label: "เซเว่น", weight: 6, pay: { 3: 25, 4: 80, 5: 200 }, tone: "tone-seven" },
  { id: "crown", label: "มงกุฎ", weight: 3, pay: { 3: 40, 4: 150, 5: 400 }, tone: "tone-crown" },
  { id: "wild", label: "ไวลด์", weight: 3, pay: { 3: 20, 4: 80, 5: 250 }, tone: "tone-wild" },
];

export const TILE_SYMBOLS: SlotSymbol[] = [
  { id: "tong", label: "จุด", weight: 34, pay: { 3: 5, 4: 15, 5: 40 }, tone: "tone-cherry" },
  { id: "tiao", label: "ไผ่", weight: 22, pay: { 3: 8, 4: 25, 5: 60 }, tone: "tone-bar" },
  { id: "wan", label: "หมื่น", weight: 16, pay: { 3: 10, 4: 40, 5: 80 }, tone: "tone-coin" },
  { id: "bai", label: "ขาว", weight: 10, pay: { 3: 15, 4: 50, 5: 120 }, tone: "tone-gem" },
  { id: "fa", label: "ฮวด", weight: 6, pay: { 3: 25, 4: 80, 5: 200 }, tone: "tone-seven" },
  { id: "zhong", label: "จง", weight: 3, pay: { 3: 40, 4: 150, 5: 400 }, tone: "tone-crown" },
  { id: "wild", label: "อิ่นกก", weight: 4, pay: { 3: 20, 4: 80, 5: 250 }, tone: "tone-wild" },
  { id: "hu", label: "หู", weight: 3, pay: { 3: 50, 4: 200, 5: 500 }, tone: "tone-seven" },
];

export function symbolsFor(pack: SlotPack = "classic") {
  return pack === "tile" ? TILE_SYMBOLS : SLOT_SYMBOLS;
}

/** 9 paylines: row index per reel (left → right). */
export const PAYLINES: number[][] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
];

export type LineWin = {
  line: number;
  symbol: SlotSymbolId;
  count: number;
  multiplier: number;
  amount: number;
};

export type SpinOutcome = {
  reels: SlotSymbolId[][];
  wins: LineWin[];
  payout: number;
};

export type SlotRtpOpts = {
  rtp: number;
  scale: number;
  pays: Record<string, number>;
  pack?: SlotPack;
};

export function symbolMeta(id: string, pack: SlotPack = "classic") {
  const list = symbolsFor(pack);
  return list.find((s) => s.id === id) ?? list[0];
}

function randInt(max: number) {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % max;
}

export function pickSymbol(pack: SlotPack = "classic"): SlotSymbolId {
  const list = symbolsFor(pack);
  const total = list.reduce((s, x) => s + x.weight, 0);
  let r = randInt(total);
  for (const s of list) {
    if (r < s.weight) return s.id;
    r -= s.weight;
  }
  return list[0].id;
}

export function spinReels(pack: SlotPack = "classic"): SlotSymbolId[][] {
  return Array.from({ length: SLOT_COLS }, () =>
    Array.from({ length: SLOT_ROWS }, () => pickSymbol(pack)),
  );
}

function matchFromLeft(syms: SlotSymbolId[]): { id: SlotSymbolId; count: number } | null {
  const target = syms.find((s) => s !== "wild") ?? "wild";
  let count = 0;
  for (const s of syms) {
    if (s === target || s === "wild") count += 1;
    else break;
  }
  if (count < 3) return null;
  return { id: target, count };
}

function payMult(id: SlotSymbolId, count: 3 | 4 | 5, pack: SlotPack, pays?: Record<string, number>) {
  const key = `${id}${count}`;
  const override = Number(pays?.[key]);
  if (Number.isFinite(override) && override > 0) return override;
  return symbolMeta(id, pack).pay[count] ?? 0;
}

export function evaluateSpin(reels: SlotSymbolId[][], stake: number, opts?: SlotRtpOpts): SpinOutcome {
  const pack = opts?.pack ?? "classic";
  const lineStake = Math.round((stake / SLOT_LINES) * 100) / 100;
  const scale = opts?.scale && opts.scale > 0 ? opts.scale : 1;
  const wins: LineWin[] = [];
  PAYLINES.forEach((line, idx) => {
    const cells = line.map((row, col) => reels[col][row]);
    const hit = matchFromLeft(cells);
    if (!hit) return;
    const key = hit.count as 3 | 4 | 5;
    const multiplier = payMult(hit.id, key, pack, opts?.pays);
    if (multiplier <= 0) return;
    const amount = Math.round(lineStake * multiplier * scale * 100) / 100;
    wins.push({ line: idx + 1, symbol: hit.id, count: hit.count, multiplier, amount });
  });
  let payout = Math.round(wins.reduce((s, w) => s + w.amount, 0) * 100) / 100;
  const rtp = opts?.rtp ?? 100;
  if (payout > 0 && rtp < 100) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    if (buf[0] % 100 >= Math.min(100, Math.max(1, Math.round(rtp)))) {
      return { reels, wins: [], payout: 0 };
    }
  }
  return { reels, wins, payout };
}

export function playSpin(stake: number, opts?: SlotRtpOpts): SpinOutcome {
  const pack = opts?.pack ?? "classic";
  return evaluateSpin(spinReels(pack), stake, opts);
}
