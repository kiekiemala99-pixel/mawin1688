import { clipWin, payOf, type RtpConfig } from "@/lib/rtp";

export const MINI_STAKES = [1, 5, 10, 20, 50, 100, 200] as const;
export const MINI_MIN = 1;
export const MINI_MAX = 10000;

export type MiniType =
  | "fpc"
  | "pokdeng"
  | "hilo"
  | "wheel"
  | "fruit"
  | "dragontiger"
  | "baccarat"
  | "dice"
  | "rps"
  | "color"
  | "highlow"
  | "roulette"
  | "redblack"
  | "war"
  | "coin"
  | "lucky7"
  | "fantan"
  | "keno";

export type MiniGame = {
  id: string;
  type: MiniType;
  title: string;
  blurb: string;
  cover: string;
  options: { id: string; label: string }[];
  payHint: string;
};

export const FPC = [
  { id: "gourd", label: "น้ำเต้า", img: "/mini/fpc/gourd.jpg" },
  { id: "crab", label: "ปู", img: "/mini/fpc/crab.jpg" },
  { id: "fish", label: "ปลา", img: "/mini/fpc/fish.jpg" },
  { id: "rooster", label: "ไก่", img: "/mini/fpc/rooster.jpg" },
  { id: "shrimp", label: "กุ้ง", img: "/mini/fpc/shrimp.jpg" },
  { id: "tiger", label: "เสือ", img: "/mini/fpc/tiger.jpg" },
] as const;

export const FRUITS = [
  { id: "cherry", label: "เชอร์รี่", img: "/mini/fruit/cherry.jpg" },
  { id: "lemon", label: "เลมอน", img: "/mini/fruit/lemon.jpg" },
  { id: "orange", label: "ส้ม", img: "/mini/fruit/orange.jpg" },
  { id: "grape", label: "องุ่น", img: "/mini/fruit/grape.jpg" },
  { id: "melon", label: "แตงโม", img: "/mini/fruit/melon.jpg" },
  { id: "bell", label: "กระดิ่ง", img: "/mini/fruit/bell.jpg" },
] as const;

const WHEEL_SEGS = [0, 1, 0, 2, 0, 1, 5, 0, 1, 3, 0, 2];

export const MINI_GAMES: MiniGame[] = [
  { id: "rps", type: "rps", title: "เป่ายิ้งฉุบ", blurb: "ค้อน กระดาษ กรรไกร", cover: "/mini/rps/cover.jpg", options: [
    { id: "rock", label: "ค้อน" },
    { id: "paper", label: "กระดาษ" },
    { id: "scissors", label: "กรรไกร" },
  ], payHint: "ชนะ 1:1 · เสมอคืนทุน" },
  { id: "namtao", type: "fpc", title: "น้ำเต้าปูปลา", blurb: "ทอย 3 ลูก · กดเลือก 1 ช่อง", cover: "/mini/covers/namtao.jpg", options: FPC.map((x) => ({ id: x.id, label: x.label })), payHint: "ออก 1 / 2 / 3 ลูก จ่าย 1:1 ต่อลูก (คืนทุนถ้าออก)" },
  { id: "pokdeng", type: "pokdeng", title: "ป๊อกเด้ง", blurb: "ไพ่ 2–3 ใบ แข่งเจ้ามือ", cover: "/mini/covers/pokdeng.jpg", options: [{ id: "play", label: "เล่น" }], payHint: "แต้มสูงกว่าชนะ 1:1 · เสมอคืนทุน" },
  { id: "hilo", type: "hilo", title: "ไฮโล", blurb: "ลูกเต๋า 3 ลูก สูง-ต่ำ", cover: "/mini/covers/hilo.jpg", options: [
    { id: "small", label: "ต่ำ 4–10" },
    { id: "big", label: "สูง 11–17" },
    { id: "eleven", label: "11" },
    { id: "triple", label: "ตองใดๆ" },
  ], payHint: "ต่ำ/สูง 1:1 · 11 จ่าย 1:7 · ตอง 1:30" },
  { id: "baccarat", type: "baccarat", title: "บาคาร่ามินิ", blurb: "ผู้เล่น หรือ แบงค์เกอร์", cover: "/mini/covers/baccarat.jpg", options: [
    { id: "player", label: "ผู้เล่น" },
    { id: "banker", label: "แบงค์เกอร์" },
    { id: "tie", label: "เสมอ" },
  ], payHint: "ผู้เล่น 1:1 · แบงค์ 1:0.95 · เสมอ 1:8" },
];

export function getMiniGame(id: string) {
  return MINI_GAMES.find((g) => g.id === id);
}

export type MiniReveal = {
  dice?: number[];
  cards?: { rank: number; suit: string }[];
  extra?: string;
  faces?: string[];
  fruits?: string[];
  wheel?: number;
  color?: string;
  numbers?: number[];
};

export type MiniOutcome = {
  status: "won" | "lost" | "push";
  payout: number;
  summary: string;
  reveal: MiniReveal;
};

function randInt(max: number) {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % max;
}

function d6() {
  return randInt(6) + 1;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function drawCard() {
  return { rank: randInt(13) + 1, suit: ["H", "D", "C", "S"][randInt(4)] };
}

function cardLabel(c: { rank: number; suit: string }) {
  const r = c.rank === 1 ? "A" : c.rank === 11 ? "J" : c.rank === 12 ? "Q" : c.rank === 13 ? "K" : String(c.rank);
  const s = { H: "♥", D: "♦", C: "♣", S: "♠" }[c.suit] ?? c.suit;
  return `${r}${s}`;
}

function handPok(cards: { rank: number }[]) {
  const v = (r: number) => (r >= 10 ? 0 : r);
  return cards.reduce((s, c) => s + v(c.rank), 0) % 10;
}

function handBac(cards: { rank: number }[]) {
  return handPok(cards);
}

function finish(status: MiniOutcome["status"], payout: number, reveal: MiniReveal, extra: string): MiniOutcome {
  return { status, payout: round2(payout), summary: extra, reveal: { ...reveal, extra } };
}

function applyRtp(out: MiniOutcome, cfg?: RtpConfig): MiniOutcome {
  if (!cfg || out.status !== "won" || out.payout <= 0) return out;
  const scale = payOf(cfg.pays, "scale", 1);
  const payout = round2(out.payout * scale);
  if (cfg.rtp < 100 && !clipWin(cfg.rtp)) {
    return { ...out, status: "lost", payout: 0 };
  }
  return { ...out, payout };
}

export function resolveMini(gameId: string, pick: string, stake: number, cfg?: RtpConfig): MiniOutcome {
  const game = getMiniGame(gameId);
  if (!game) throw new Error("ไม่พบเกม");
  if (!game.options.some((o) => o.id === pick)) throw new Error("เลือกไม่ถูกต้อง");
  const p = (key: string, fallback: number) => payOf(cfg?.pays, key, fallback);

  const win = (payout: number, reveal: MiniReveal, extra: string) => finish("won", payout, reveal, extra);
  const lose = (reveal: MiniReveal, extra: string) => finish("lost", 0, reveal, extra);
  const push = (reveal: MiniReveal, extra: string) => finish("push", stake, reveal, extra);

  let out: MiniOutcome;
  switch (game.type) {
    case "fpc": {
      const faces = [FPC[randInt(6)].id, FPC[randInt(6)].id, FPC[randInt(6)].id];
      const n = faces.filter((f) => f === pick).length;
      const extra = `ออก ${faces.map((id) => FPC.find((x) => x.id === id)?.label).join(" · ")}`;
      out = n > 0 ? win(stake * (1 + n * p("match", 1)), { faces, extra }, extra) : lose({ faces, extra }, extra);
      break;
    }
    case "hilo": {
      const dice = [d6(), d6(), d6()];
      const sum = dice[0] + dice[1] + dice[2];
      const triple = dice[0] === dice[1] && dice[1] === dice[2];
      const extra = `${dice.join("+")}=${sum}${triple ? " ตอง" : ""}`;
      if (pick === "triple") {
        out = triple ? win(stake * p("triple", 31), { dice, extra }, extra) : lose({ dice, extra }, extra);
        break;
      }
      if (triple) {
        out = lose({ dice, extra }, extra);
        break;
      }
      if (pick === "eleven") {
        out = sum === 11 ? win(stake * p("eleven", 8), { dice, extra }, extra) : lose({ dice, extra }, extra);
        break;
      }
      if (pick === "small") {
        out = sum >= 4 && sum <= 10 ? win(stake * p("small", 2), { dice, extra }, extra) : lose({ dice, extra }, extra);
        break;
      }
      out = sum >= 11 && sum <= 17 ? win(stake * p("big", 2), { dice, extra }, extra) : lose({ dice, extra }, extra);
      break;
    }
    case "wheel": {
      const i = randInt(WHEEL_SEGS.length);
      const m = WHEEL_SEGS[i] * p("scale", 1);
      const extra = m > 0 ? `วงล้อคูณ ${m}` : "วงล้อไม่เข้า";
      out = m > 0 ? win(stake * m, { wheel: i, extra }, extra) : lose({ wheel: i, extra }, extra);
      break;
    }
    case "fruit": {
      const fruits = [FRUITS[randInt(6)].id, FRUITS[randInt(6)].id, FRUITS[randInt(6)].id];
      const same =
        fruits[0] === fruits[1] && fruits[1] === fruits[2] ? 3 : fruits[0] === fruits[1] || fruits[1] === fruits[2] || fruits[0] === fruits[2] ? 2 : 1;
      const extra = fruits.map((f) => FRUITS.find((x) => x.id === f)?.label).join(" · ");
      if (same === 3) {
        out = win(stake * p("trips", 8), { fruits, extra }, extra);
        break;
      }
      if (same === 2) {
        out = win(stake * p("pair", 1.5), { fruits, extra }, extra);
        break;
      }
      out = lose({ fruits, extra }, extra);
      break;
    }
    case "pokdeng": {
      const player = [drawCard(), drawCard()];
      const dealer = [drawCard(), drawCard()];
      if (handPok(player) < 8 && handPok(dealer) < 8) {
        if (handPok(player) <= 5) player.push(drawCard());
        if (handPok(dealer) <= 5) dealer.push(drawCard());
      }
      const ps = handPok(player);
      const ds = handPok(dealer);
      const extra = `คุณ ${player.map(cardLabel).join(" ")} (${ps}) · เจ้ามือ ${dealer.map(cardLabel).join(" ")} (${ds})`;
      if (ps === ds) out = push({ cards: [...player, ...dealer], extra }, extra);
      else if (ps > ds) out = win(stake * p("win", 2), { cards: [...player, ...dealer], extra }, extra);
      else out = lose({ cards: [...player, ...dealer], extra }, extra);
      break;
    }
    case "dragontiger": {
      const dragon = drawCard();
      const tiger = drawCard();
      const extra = `มังกร ${cardLabel(dragon)} · เสือ ${cardLabel(tiger)}`;
      if (dragon.rank === tiger.rank) {
        out = pick === "tie" ? win(stake * p("tie", 9), { cards: [dragon, tiger], extra }, extra) : lose({ cards: [dragon, tiger], extra }, extra);
        break;
      }
      const winner = dragon.rank > tiger.rank ? "dragon" : "tiger";
      out = pick === winner ? win(stake * p("win", 2), { cards: [dragon, tiger], extra }, extra) : lose({ cards: [dragon, tiger], extra }, extra);
      break;
    }
    case "baccarat": {
      const player = [drawCard(), drawCard()];
      const banker = [drawCard(), drawCard()];
      let pv = handBac(player);
      let bv = handBac(banker);
      if (pv < 8 && bv < 8) {
        if (pv <= 5) player.push(drawCard());
        pv = handBac(player);
        if (bv <= 5) banker.push(drawCard());
        bv = handBac(banker);
      }
      const extra = `ผู้เล่น ${pv} · แบงค์ ${bv}`;
      if (pv === bv) {
        out = pick === "tie" ? win(stake * p("tie", 9), { extra }, extra) : lose({ extra }, extra);
        break;
      }
      if (pick === "tie") {
        out = lose({ extra }, extra);
        break;
      }
      if (pick === "player") {
        out = pv > bv ? win(stake * p("player", 2), { extra }, extra) : lose({ extra }, extra);
        break;
      }
      out = bv > pv ? win(round2(stake * p("banker", 1.95)), { extra }, extra) : lose({ extra }, extra);
      break;
    }
    case "dice": {
      const n = d6();
      const extra = `ออก ${n}`;
      out = pick === String(n) ? win(stake * p("hit", 6), { dice: [n], extra }, extra) : lose({ dice: [n], extra }, extra);
      break;
    }
    case "rps": {
      const house = ["rock", "paper", "scissors"][randInt(3)];
      const map: Record<string, string> = { rock: "ค้อน", paper: "กระดาษ", scissors: "กรรไกร" };
      const extra = `คุณ ${map[pick]} · เจ้ามือ ${map[house]}`;
      if (pick === house) {
        out = push({ extra }, extra);
        break;
      }
      const beats: Record<string, string> = { rock: "scissors", paper: "rock", scissors: "paper" };
      out = beats[pick] === house ? win(stake * p("win", 2), { extra }, extra) : lose({ extra }, extra);
      break;
    }
    case "color": {
      const colors = ["red", "blue", "gold", "green"];
      const result = colors[randInt(4)];
      const extra = `ออก${{ red: "แดง", blue: "น้ำเงิน", gold: "ทอง", green: "เขียว" }[result]}`;
      out = pick === result ? win(stake * p("hit", 4), { color: result, extra }, extra) : lose({ color: result, extra }, extra);
      break;
    }
    case "highlow": {
      const a = drawCard();
      const b = drawCard();
      const extra = `ใบแรก ${cardLabel(a)} · ใบถัดไป ${cardLabel(b)}`;
      if (a.rank === b.rank) {
        out = push({ cards: [a, b], extra }, extra);
        break;
      }
      const high = b.rank > a.rank;
      out = (pick === "high" && high) || (pick === "low" && !high) ? win(stake * p("win", 2), { cards: [a, b], extra }, extra) : lose({ cards: [a, b], extra }, extra);
      break;
    }
    case "roulette": {
      const n = randInt(37);
      const color = n === 0 ? "zero" : n % 2 === 0 ? "black" : "red";
      const extra = `ออก ${n} ${color === "zero" ? "ศูนย์" : color === "red" ? "แดง" : "ดำ"}`;
      if (pick === "zero") {
        out = n === 0 ? win(stake * p("zero", 36), { extra, numbers: [n] }, extra) : lose({ extra, numbers: [n] }, extra);
        break;
      }
      out = pick === color ? win(stake * p("rb", 2), { extra, numbers: [n] }, extra) : lose({ extra, numbers: [n] }, extra);
      break;
    }
    case "redblack": {
      const c = drawCard();
      const color = c.suit === "H" || c.suit === "D" ? "red" : "black";
      const extra = `${cardLabel(c)} · ${color === "red" ? "แดง" : "ดำ"}`;
      out = pick === color ? win(stake * p("win", 2), { cards: [c], extra }, extra) : lose({ cards: [c], extra }, extra);
      break;
    }
    case "war": {
      const player = drawCard();
      const dealer = drawCard();
      const extra = `คุณ ${cardLabel(player)} · เจ้ามือ ${cardLabel(dealer)}`;
      if (player.rank === dealer.rank) out = push({ cards: [player, dealer], extra }, extra);
      else if (player.rank > dealer.rank) out = win(stake * p("win", 2), { cards: [player, dealer], extra }, extra);
      else out = lose({ cards: [player, dealer], extra }, extra);
      break;
    }
    case "coin": {
      const result = randInt(2) === 0 ? "heads" : "tails";
      const extra = result === "heads" ? "ออกหัว" : "ออกก้อย";
      out = pick === result ? win(stake * p("win", 2), { extra }, extra) : lose({ extra }, extra);
      break;
    }
    case "lucky7": {
      const dice = [d6(), d6()];
      const sum = dice[0] + dice[1];
      const extra = `${dice[0]}+${dice[1]}=${sum}`;
      if (pick === "seven") {
        out = sum === 7 ? win(stake * p("seven", 5), { dice, extra }, extra) : lose({ dice, extra }, extra);
        break;
      }
      if (pick === "under") {
        out = sum < 7 ? win(stake * p("under", 2), { dice, extra }, extra) : lose({ dice, extra }, extra);
        break;
      }
      out = sum > 7 ? win(stake * p("over", 2), { dice, extra }, extra) : lose({ dice, extra }, extra);
      break;
    }
    case "fantan": {
      const beads = randInt(4) + 1;
      const extra = `เหลือเศษ ${beads}`;
      out = pick === String(beads) ? win(stake * p("hit", 4), { extra, numbers: [beads] }, extra) : lose({ extra, numbers: [beads] }, extra);
      break;
    }
    case "keno": {
      const drawn = randInt(10) + 1;
      const extra = `ออกเลข ${drawn}`;
      out = pick === String(drawn) ? win(stake * p("hit", 9), { extra, numbers: [drawn] }, extra) : lose({ extra, numbers: [drawn] }, extra);
      break;
    }
    default:
      throw new Error("เกมนี้ยังไม่เปิด");
  }
  return applyRtp(out, cfg);
}
