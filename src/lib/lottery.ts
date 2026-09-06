import {
  bangkokParts,
  formatEnShort,
  hash32,
  paddedDigits,
  pad2,
  type BangkokParts,
} from "./time";

export type PlayType = "3top" | "3toad" | "2top" | "2bottom" | "runTop" | "runBottom";

export const PLAY_TYPES: { id: PlayType; label: string; digits: number; rate: number }[] = [
  { id: "3top", label: "3 ตัวบน", digits: 3, rate: 900 },
  { id: "3toad", label: "3 ตัวโต๊ด", digits: 3, rate: 150 },
  { id: "2top", label: "2 ตัวบน", digits: 2, rate: 90 },
  { id: "2bottom", label: "2 ตัวล่าง", digits: 2, rate: 90 },
  { id: "runTop", label: "วิ่งบน", digits: 1, rate: 3.2 },
  { id: "runBottom", label: "วิ่งล่าง", digits: 1, rate: 4.2 },
];

export const PAYOUT_TABLE = [
  { label: "3 ตัวตรง", rate: "1 : 900", note: "ตรงทั้งสามหลัก" },
  { label: "3 ตัวโต๊ด", rate: "1 : 150", note: "สลับตำแหน่งได้" },
  { label: "2 ตัวบน", rate: "1 : 90", note: "สองหลักท้ายรางวัลที่ 1" },
  { label: "2 ตัวล่าง", rate: "1 : 90", note: "เลขท้าย 2 ตัว" },
  { label: "วิ่งบน", rate: "1 : 3.2", note: "มีใน 3 ตัวบน" },
  { label: "วิ่งล่าง", rate: "1 : 4.2", note: "มีใน 2 ตัวล่าง" },
];

export type MarketId =
  | "yeekee"
  | "gov"
  | "lao"
  | "hanoi"
  | "hanoi-special"
  | "hanoi-vip"
  | "malaysia"
  | "stock-th"
  | "stock-nikkei"
  | "stock-dow";

export type Market = {
  id: MarketId;
  name: string;
  short: string;
  kind: "yeekee" | "gov" | "daily";
  closeHour?: number;
  closeMinute?: number;
  weekdays?: number[];
};

export const MARKETS: Market[] = [
  { id: "yeekee", name: "จับยี่กี", short: "ยี่กี", kind: "yeekee" },
  { id: "gov", name: "หวยรัฐบาล", short: "รัฐบาล", kind: "gov" },
  { id: "lao", name: "หวยลาว", short: "ลาว", kind: "daily", closeHour: 20, closeMinute: 30 },
  { id: "hanoi", name: "ฮานอย", short: "ฮานอย", kind: "daily", closeHour: 18, closeMinute: 30 },
  { id: "hanoi-special", name: "ฮานอยพิเศษ", short: "พิเศษ", kind: "daily", closeHour: 17, closeMinute: 30 },
  { id: "hanoi-vip", name: "ฮานอย VIP", short: "VIP", kind: "daily", closeHour: 19, closeMinute: 0 },
  { id: "malaysia", name: "หวยมาเลย์", short: "มาเลย์", kind: "daily", closeHour: 18, closeMinute: 30 },
  {
    id: "stock-th",
    name: "หุ้นไทย",
    short: "หุ้นไทย",
    kind: "daily",
    closeHour: 16,
    closeMinute: 45,
    weekdays: [1, 2, 3, 4, 5],
  },
  { id: "stock-nikkei", name: "หุ้นนิเคอิ", short: "นิเคอิ", kind: "daily", closeHour: 15, closeMinute: 0 },
  { id: "stock-dow", name: "หุ้นดาวโจนส์", short: "ดาวโจนส์", kind: "daily", closeHour: 4, closeMinute: 0 },
];

export function marketById(id: string) {
  return MARKETS.find((m) => m.id === id);
}

export type DrawResult = {
  top3: string;
  bottom2: string;
  first6?: string;
};

export type RoundState = {
  marketId: MarketId;
  roundKey: string;
  label: string;
  dateKey: string;
  dateEn: string;
  open: boolean;
  remainingSec: number;
  result?: DrawResult;
  previous?: { roundKey: string; label: string; dateKey: string; dateEn: string; result: DrawResult };
};

const YEEKEE_START_HOUR = 5;
const YEEKEE_INTERVAL = 12 * 60;
const YEEKEE_ROUNDS = 88;

function weekdayIndex(bk: BangkokParts) {
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[bk.weekday] ?? 0;
}

function addDays(dateKey: string, days: number) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

function resultFor(roundKey: string): DrawResult {
  const first6 = paddedDigits(`${roundKey}:first`, 6);
  return {
    first6,
    top3: first6.slice(-3),
    bottom2: paddedDigits(`${roundKey}:bot`, 2),
  };
}

export function generatedDraw(roundKey: string): DrawResult {
  return resultFor(roundKey);
}

export function getYeekeeState(now: Date = new Date()): RoundState {
  const bk = bangkokParts(now);
  const secFromMidnight = bk.hour * 3600 + bk.minute * 60 + bk.second;
  const startSec = YEEKEE_START_HOUR * 3600;
  const elapsed = secFromMidnight - startSec;
  const marketId: MarketId = "yeekee";

  const make = (
    dateKey: string,
    round: number,
    open: boolean,
    remainingSec: number,
    includeResult: boolean,
  ): RoundState => {
    const roundKey = `yeekee:${dateKey}:${round}`;
    const prevRound = round > 1 ? round - 1 : YEEKEE_ROUNDS;
    const prevDate = round > 1 ? dateKey : addDays(dateKey, -1);
    const prevKey = `yeekee:${prevDate}:${prevRound}`;
    return {
      marketId,
      roundKey,
      label: `รอบที่ ${round}`,
      dateKey,
      dateEn: formatEnShort(dateKey),
      open,
      remainingSec,
      result: includeResult ? resultFor(roundKey) : undefined,
      previous: {
        roundKey: prevKey,
        label: `รอบที่ ${prevRound}`,
        dateKey: prevDate,
        dateEn: formatEnShort(prevDate),
        result: resultFor(prevKey),
      },
    };
  };

  if (elapsed < 0) {
    const prevDate = addDays(bk.dateKey, -1);
    return make(prevDate, YEEKEE_ROUNDS, false, -elapsed, true);
  }
  const idx = Math.floor(elapsed / YEEKEE_INTERVAL);
  if (idx >= YEEKEE_ROUNDS) {
    const nextStart = 24 * 3600 - secFromMidnight + startSec;
    return make(bk.dateKey, YEEKEE_ROUNDS, false, nextStart, true);
  }
  const remaining = YEEKEE_INTERVAL - (elapsed % YEEKEE_INTERVAL);
  const closeBuffer = 15;
  const open = remaining > closeBuffer;
  return make(bk.dateKey, idx + 1, open, remaining, !open);
}

function govKeysAround(dateKey: string) {
  const [y] = dateKey.split("-").map(Number);
  const keys: string[] = [];
  for (const year of [y - 1, y, y + 1]) {
    for (let m = 1; m <= 12; m++) {
      keys.push(`${year}-${pad2(m)}-01`);
      keys.push(`${year}-${pad2(m)}-16`);
    }
  }
  return keys;
}

export function getGovState(now: Date = new Date()): RoundState {
  const bk = bangkokParts(now);
  const keys = govKeysAround(bk.dateKey);
  const drawClose = 15 * 3600 + 30 * 60;
  const nowSec = bk.hour * 3600 + bk.minute * 60 + bk.second;
  let last: string | null = null;
  let next: string | null = null;
  for (const k of keys) {
    if (k < bk.dateKey || (k === bk.dateKey && nowSec >= drawClose)) last = k;
    if (k > bk.dateKey || (k === bk.dateKey && nowSec < drawClose)) {
      next = k;
      break;
    }
  }
  const remaining = (() => {
    if (!next) return 0;
    if (next === bk.dateKey) return Math.max(0, drawClose - nowSec);
    const [y, m, d] = next.split("-").map(Number);
    const [cy, cm, cd] = bk.dateKey.split("-").map(Number);
    const days =
      (Date.UTC(y, m - 1, d) - Date.UTC(cy, cm - 1, cd)) / 86400000;
    return days * 86400 + drawClose - nowSec;
  })();

  const lastKey = last ?? addDays(bk.dateKey, -15);
  const nextKey = next ?? addDays(bk.dateKey, 1);
  const isTodayOpen = nextKey === bk.dateKey && remaining > 0;

  return {
    marketId: "gov",
    roundKey: `gov:${nextKey}`,
    label: "งวดถัดไป",
    dateKey: nextKey,
    dateEn: formatEnShort(nextKey),
    open: isTodayOpen || remaining > 0,
    remainingSec: remaining,
    previous: {
      roundKey: `gov:${lastKey}`,
      label: "งวดล่าสุด",
      dateKey: lastKey,
      dateEn: formatEnShort(lastKey),
      result: resultFor(`gov:${lastKey}`),
    },
  };
}

export function getDailyState(market: Market, now: Date = new Date()): RoundState {
  const bk = bangkokParts(now);
  const closeSec = (market.closeHour ?? 18) * 3600 + (market.closeMinute ?? 30) * 60;
  const nowSec = bk.hour * 3600 + bk.minute * 60 + bk.second;
  const allowed = market.weekdays;
  const wd = weekdayIndex(bk);

  const isAllowedDay = !allowed || allowed.includes(wd);
  let dateKey = bk.dateKey;
  let remaining: number;
  let open: boolean;

  if (isAllowedDay && nowSec < closeSec) {
    remaining = closeSec - nowSec;
    open = remaining > 20;
  } else {
    let days = 1;
    for (let i = 1; i <= 8; i++) {
      const nextKey = addDays(bk.dateKey, i);
      const [y, m, d] = nextKey.split("-").map(Number);
      const ndt = new Date(Date.UTC(y, m - 1, d));
      const nwd = ndt.getUTCDay();
      if (!allowed || allowed.includes(nwd)) {
        days = i;
        dateKey = nextKey;
        break;
      }
    }
    remaining = days * 86400 - nowSec + closeSec;
    open = false;
    if (!isAllowedDay) dateKey = addDays(bk.dateKey, days);
    else dateKey = addDays(bk.dateKey, 1);
  }

  const prevDate = (() => {
    for (let i = 1; i <= 8; i++) {
      const k = addDays(bk.dateKey, nowSec >= closeSec && isAllowedDay ? 0 : -i);
      if (nowSec >= closeSec && isAllowedDay && i === 1) {
        const todayKey = bk.dateKey;
        return todayKey;
      }
      const [y, m, d] = k.split("-").map(Number);
      const ndt = new Date(Date.UTC(y, m - 1, d));
      if (!allowed || allowed.includes(ndt.getUTCDay())) return k;
    }
    return addDays(bk.dateKey, -1);
  })();

  const drawnToday = isAllowedDay && nowSec >= closeSec;
  const prevKeyDate = drawnToday ? bk.dateKey : prevDate;

  return {
    marketId: market.id,
    roundKey: `${market.id}:${dateKey}`,
    label: open ? "เปิดรับแทง" : "รอผล",
    dateKey,
    dateEn: formatEnShort(dateKey),
    open,
    remainingSec: remaining,
    result: open ? undefined : drawnToday ? resultFor(`${market.id}:${bk.dateKey}`) : undefined,
    previous: {
      roundKey: `${market.id}:${prevKeyDate}`,
      label: "งวดล่าสุด",
      dateKey: prevKeyDate,
      dateEn: formatEnShort(prevKeyDate),
      result: resultFor(`${market.id}:${prevKeyDate}`),
    },
  };
}

export function getMarketState(id: MarketId, now: Date = new Date()): RoundState {
  if (id === "yeekee") return getYeekeeState(now);
  if (id === "gov") return getGovState(now);
  const m = marketById(id);
  if (!m) return getYeekeeState(now);
  return getDailyState(m, now);
}

export function permutations(n: string): string[] {
  const chars = n.split("");
  const out = new Set<string>();
  const walk = (arr: string[], rest: string[]) => {
    if (rest.length === 0) out.add(arr.join(""));
    rest.forEach((c, i) => {
      walk([...arr, c], rest.filter((_, j) => j !== i));
    });
  };
  walk([], chars);
  return [...out];
}

export function lotteryWins(play: PlayType, number: string, result: DrawResult): boolean {
  const top3 = result.top3;
  const bot2 = result.bottom2;
  if (play === "3top") return number === top3;
  if (play === "3toad") return permutations(number).includes(top3);
  if (play === "2top") return number === top3.slice(-2);
  if (play === "2bottom") return number === bot2;
  if (play === "runTop") return top3.includes(number);
  if (play === "runBottom") return bot2.includes(number);
  return false;
}

export function playMeta(play: PlayType) {
  return PLAY_TYPES.find((p) => p.id === play)!;
}

export function reverseNumber(n: string) {
  return n.split("").reverse().join("");
}

export function randomNumber(digits: number) {
  const seed = `${Date.now()}:${Math.random()}:${hash32("mawin")}`;
  return paddedDigits(seed, digits);
}
