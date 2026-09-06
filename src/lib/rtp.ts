export type RtpKind = "mini" | "slot";

export type PayField = { key: string; label: string; def: number };

export type RtpConfig = {
  id: string;
  kind: RtpKind;
  title: string;
  rtp: number;
  enabled: boolean;
  pays: Record<string, number>;
  updatedAt: number;
};

export const MINI_PAY_FIELDS: Record<string, PayField[]> = {
  fpc: [{ key: "match", label: "จ่ายต่อลูกที่ออก", def: 1 }],
  pokdeng: [{ key: "win", label: "ชนะ (รวมทุน)", def: 2 }],
  hilo: [
    { key: "small", label: "ต่ำ รวมทุน", def: 2 },
    { key: "big", label: "สูง รวมทุน", def: 2 },
    { key: "eleven", label: "11 รวมทุน", def: 8 },
    { key: "triple", label: "ตอง รวมทุน", def: 31 },
  ],
  wheel: [{ key: "scale", label: "คูณวงล้อ", def: 1 }],
  fruit: [
    { key: "pair", label: "2 ตัว", def: 1.5 },
    { key: "trips", label: "3 ตัว", def: 8 },
  ],
  dragontiger: [
    { key: "win", label: "มังกร/เสือ รวมทุน", def: 2 },
    { key: "tie", label: "เสมอ รวมทุน", def: 9 },
  ],
  baccarat: [
    { key: "player", label: "ผู้เล่น รวมทุน", def: 2 },
    { key: "banker", label: "แบงค์ รวมทุน", def: 1.95 },
    { key: "tie", label: "เสมอ รวมทุน", def: 9 },
  ],
  dice: [{ key: "hit", label: "ทายถูก รวมทุน", def: 6 }],
  rps: [{ key: "win", label: "ชนะ รวมทุน", def: 2 }],
  color: [{ key: "hit", label: "ทายถูก รวมทุน", def: 4 }],
  highlow: [{ key: "win", label: "ทายถูก รวมทุน", def: 2 }],
  roulette: [
    { key: "rb", label: "แดง/ดำ รวมทุน", def: 2 },
    { key: "zero", label: "ศูนย์ รวมทุน", def: 36 },
  ],
  redblack: [{ key: "win", label: "ทายถูก รวมทุน", def: 2 }],
  war: [{ key: "win", label: "ชนะ รวมทุน", def: 2 }],
  coin: [{ key: "win", label: "ทายถูก รวมทุน", def: 2 }],
  lucky7: [
    { key: "under", label: "ต่ำกว่า 7", def: 2 },
    { key: "over", label: "สูงกว่า 7", def: 2 },
    { key: "seven", label: "เท่า 7", def: 5 },
  ],
  fantan: [{ key: "hit", label: "ทายเศษถูก", def: 4 }],
  keno: [{ key: "hit", label: "ทายเลขถูก", def: 9 }],
};

export const SLOT_GAME_FIELDS: PayField[] = [{ key: "scale", label: "คูณรางวัลทั้งเกม", def: 1 }];

export const SLOT_TABLE_FIELDS: PayField[] = [
  { key: "cherry3", label: "เชอร์รี่ 3", def: 5 },
  { key: "cherry4", label: "เชอร์รี่ 4", def: 15 },
  { key: "cherry5", label: "เชอร์รี่ 5", def: 40 },
  { key: "bar3", label: "บาร์ 3", def: 8 },
  { key: "bar4", label: "บาร์ 4", def: 25 },
  { key: "bar5", label: "บาร์ 5", def: 60 },
  { key: "coin3", label: "เหรียญ 3", def: 10 },
  { key: "coin4", label: "เหรียญ 4", def: 40 },
  { key: "coin5", label: "เหรียญ 5", def: 80 },
  { key: "gem3", label: "เพชร 3", def: 15 },
  { key: "gem4", label: "เพชร 4", def: 50 },
  { key: "gem5", label: "เพชร 5", def: 120 },
  { key: "seven3", label: "เซเว่น 3", def: 25 },
  { key: "seven4", label: "เซเว่น 4", def: 80 },
  { key: "seven5", label: "เซเว่น 5", def: 200 },
  { key: "crown3", label: "มงกุฎ 3", def: 40 },
  { key: "crown4", label: "มงกุฎ 4", def: 150 },
  { key: "crown5", label: "มงกุฎ 5", def: 400 },
  { key: "wild3", label: "ไวลด์ 3", def: 20 },
  { key: "wild4", label: "ไวลด์ 4", def: 80 },
  { key: "wild5", label: "ไวลด์ 5", def: 250 },
];

export const SLOT_PAYTABLE_ID = "slot:__paytable";
export const SLOT_TILE_PAYTABLE_ID = "slot:__tilepay";

export const SLOT_TILE_TABLE_FIELDS: PayField[] = [
  { key: "tong3", label: "จุด 3", def: 5 },
  { key: "tong4", label: "จุด 4", def: 15 },
  { key: "tong5", label: "จุด 5", def: 40 },
  { key: "tiao3", label: "ไผ่ 3", def: 8 },
  { key: "tiao4", label: "ไผ่ 4", def: 25 },
  { key: "tiao5", label: "ไผ่ 5", def: 60 },
  { key: "wan3", label: "หมื่น 3", def: 10 },
  { key: "wan4", label: "หมื่น 4", def: 40 },
  { key: "wan5", label: "หมื่น 5", def: 80 },
  { key: "bai3", label: "ขาว 3", def: 15 },
  { key: "bai4", label: "ขาว 4", def: 50 },
  { key: "bai5", label: "ขาว 5", def: 120 },
  { key: "fa3", label: "ฮวด 3", def: 25 },
  { key: "fa4", label: "ฮวด 4", def: 80 },
  { key: "fa5", label: "ฮวด 5", def: 200 },
  { key: "zhong3", label: "จง 3", def: 40 },
  { key: "zhong4", label: "จง 4", def: 150 },
  { key: "zhong5", label: "จง 5", def: 400 },
  { key: "wild3", label: "อิ่นกก 3", def: 20 },
  { key: "wild4", label: "อิ่นกก 4", def: 80 },
  { key: "wild5", label: "อิ่นกก 5", def: 250 },
  { key: "hu3", label: "หู 3", def: 50 },
  { key: "hu4", label: "หู 4", def: 200 },
  { key: "hu5", label: "หู 5", def: 500 },
];

export function payOf(pays: Record<string, number> | undefined, key: string, fallback: number) {
  const v = Number(pays?.[key]);
  if (Number.isFinite(v) && v > 0) return v;
  return fallback;
}

export function clipWin(rtp: number) {
  const r = Math.min(100, Math.max(1, Math.round(Number(rtp) || 1)));
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % 100 < r;
}

export function defaultPays(fields: PayField[]) {
  const out: Record<string, number> = {};
  for (const f of fields) out[f.key] = f.def;
  return out;
}
