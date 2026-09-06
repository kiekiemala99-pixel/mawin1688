export const RPS_HANDS = [
  { id: "rock", label: "ค้อน", img: "/mini/rps/rock.jpg" },
  { id: "paper", label: "กระดาษ", img: "/mini/rps/paper.jpg" },
  { id: "scissors", label: "กรรไกร", img: "/mini/rps/scissors.jpg" },
] as const;

export type RpsHand = (typeof RPS_HANDS)[number]["id"];

export const RPS_STAKES = [1, 10, 20, 50, 100, 500, 1000, 2000, 5000, 10000] as const;

export const RPS_ROUND_MS = 60_000;

export function rpsRoundStart(now = Date.now()) {
  return Math.floor(now / RPS_ROUND_MS) * RPS_ROUND_MS;
}

export function rpsRemainingSec(now = Date.now()) {
  return Math.max(0, Math.ceil((rpsRoundStart(now) + RPS_ROUND_MS - now) / 1000));
}

export function rpsOccupancy(stake: number, now = Date.now()) {
  const round = rpsRoundStart(now);
  const n = Math.abs((stake * 13 + round / RPS_ROUND_MS) | 0);
  if (stake >= 5000) return (n % 3) + 1;
  if (stake >= 1000) return (n % 4) + 1;
  if (stake >= 100) return (n % 8) + 3;
  return (n % 14) + 4;
}

export function formatClock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")} : ${String(s).padStart(2, "0")}`;
}
