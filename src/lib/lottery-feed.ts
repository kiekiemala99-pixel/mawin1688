import type { DrawResult, MarketId } from "@/lib/lottery";

type GloPrize = { number?: Array<{ value?: string } | string> | string };

const UA = "Mozilla/5.0 (compatible; Mawin1688/1.0; +https://mawin1688.onrender.com)";

function digits(raw: unknown, len: number) {
  const s = String(raw ?? "").replace(/\D/g, "");
  if (s.length < len) return "";
  return s.slice(-len);
}

function prizeValue(prize?: GloPrize | string | string[] | null) {
  if (!prize) return "";
  if (typeof prize === "string") return prize;
  if (Array.isArray(prize)) return String(prize[0] ?? "");
  const n = prize.number;
  if (typeof n === "string") return n;
  if (Array.isArray(n)) {
    const first = n[0];
    if (typeof first === "string") return first;
    return String(first?.value ?? "");
  }
  return "";
}

async function postJson(url: string, body: unknown, ms = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json", "user-agent": UA },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function getJson(url: string, ms = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      headers: { accept: "application/json", "user-agent": UA },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function fromGloPayload(body: Record<string, unknown> | null): DrawResult | null {
  if (!body) return null;
  const response = (body.response ?? body.result ?? body) as Record<string, unknown>;
  const result = (response.result ?? response.data ?? response) as Record<string, unknown>;
  const data = (result.data ?? result) as {
    first?: GloPrize;
    last2?: GloPrize;
    firstPrize?: GloPrize;
    last3b?: GloPrize;
    runningNumberBackTwo?: GloPrize;
  };
  const n3 = (result.n3 ?? {}) as { straight3?: GloPrize; straight2?: GloPrize };
  const first6 = digits(prizeValue(data.first) || prizeValue(data.firstPrize), 6);
  const top3 =
    digits(prizeValue(n3.straight3), 3) ||
    (first6 ? first6.slice(-3) : "") ||
    digits(prizeValue(data.last3b), 3);
  const bottom2 =
    digits(prizeValue(n3.straight2), 2) ||
    digits(prizeValue(data.last2), 2) ||
    digits(prizeValue(data.runningNumberBackTwo), 2);
  if (!/^\d{3}$/.test(top3) || !/^\d{2}$/.test(bottom2)) return null;
  return { top3, bottom2, first6: first6 || undefined };
}

async function fetchGloByDate(dateKey: string): Promise<DrawResult | null> {
  const [year, month, day] = dateKey.split("-");
  if (!year || !month || !day) return null;
  const json = await postJson("https://www.glo.or.th/api/checking/getLotteryResult", {
    date: String(Number(day)),
    month: String(Number(month)),
    year,
  });
  return fromGloPayload(json);
}

async function fetchGloLatest(): Promise<{ dateKey?: string; result: DrawResult } | null> {
  const json = await getJson("https://www.glo.or.th/api/lottery/getLatestLottery");
  const parsed = fromGloPayload(json);
  if (!parsed) return null;
  return { result: parsed };
}

async function fetchRayriffy(): Promise<{ dateKey?: string; result: DrawResult } | null> {
  const json = await getJson("https://lotto.api.rayriffy.com/latest");
  if (!json) return null;
  const response = (json.response ?? json) as {
    date?: string;
    prizes?: Array<{ id?: string; number?: string[] }>;
  };
  const prizes = response.prizes ?? [];
  const first = prizes.find((p) => p.id === "prizeFirst")?.number?.[0];
  const last2 = prizes.find((p) => p.id === "prizeLastTwo")?.number?.[0];
  const first6 = digits(first, 6);
  const top3 = first6 ? first6.slice(-3) : "";
  const bottom2 = digits(last2, 2);
  if (!/^\d{3}$/.test(top3) || !/^\d{2}$/.test(bottom2)) return null;
  return { result: { top3, bottom2, first6: first6 || undefined } };
}

/** Official / public government lottery result for a draw date (YYYY-MM-DD). */
export async function fetchGovResult(dateKey: string): Promise<DrawResult | null> {
  if (dateKey) {
    const byDate = await fetchGloByDate(dateKey);
    if (byDate) return byDate;
  }
  const latest = (await fetchGloLatest()) ?? (await fetchRayriffy());
  return latest?.result ?? null;
}

function indexToDraw(price: number): DrawResult | null {
  if (!Number.isFinite(price) || price <= 0) return null;
  const intPart = Math.trunc(Math.abs(price));
  const frac = Math.round((Math.abs(price) - intPart) * 100);
  const top3 = String(intPart).slice(-3).padStart(3, "0");
  const bottom2 = String(frac % 100).padStart(2, "0");
  if (!/^\d{3}$/.test(top3) || !/^\d{2}$/.test(bottom2)) return null;
  return { top3, bottom2, first6: `${bottom2}${top3}`.slice(-6) };
}

async function fetchYahooClose(symbol: string): Promise<number | null> {
  const json = await getJson(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`,
  );
  if (!json) return null;
  const chart = json.chart as { result?: Array<{ meta?: { regularMarketPrice?: number }; indicators?: { quote?: Array<{ close?: Array<number | null> }> } }> };
  const row = chart?.result?.[0];
  const lastClose = (row?.indicators?.quote?.[0]?.close ?? []).filter((n): n is number => typeof n === "number" && Number.isFinite(n)).at(-1);
  const live = row?.meta?.regularMarketPrice;
  const price = Number(live ?? lastClose);
  return Number.isFinite(price) && price > 0 ? price : null;
}

async function fetchStockDraw(marketId: MarketId): Promise<DrawResult | null> {
  const symbols: Record<string, string[]> = {
    "stock-th": ["^SET.BK", "SET.BK"],
    "stock-nikkei": ["^N225"],
    "stock-dow": ["^DJI"],
  };
  const list = symbols[marketId] ?? [];
  for (const symbol of list) {
    const price = await fetchYahooClose(symbol);
    const draw = price == null ? null : indexToDraw(price);
    if (draw) return draw;
  }
  return null;
}

function pickDigits(obj: unknown): DrawResult | null {
  const blob = JSON.stringify(obj ?? "");
  const six = blob.match(/(?<!\d)(\d{6})(?!\d)/);
  const three = blob.match(/(?:top3|prize3|first3|"3")[^0-9]{0,12}(\d{3})/i);
  const two = blob.match(/(?:bot2|last2|prize2|"2")[^0-9]{0,12}(\d{2})/i);
  const top3 = three?.[1] || (six ? six[1].slice(-3) : "");
  const bottom2 = two?.[1] || (six ? six[1].slice(0, 2) : "");
  if (!/^\d{3}$/.test(top3) || !/^\d{2}$/.test(bottom2)) return null;
  return { top3, bottom2, first6: six?.[1] };
}

async function fetchForeignDraw(marketId: MarketId): Promise<DrawResult | null> {
  const urls: Record<string, string[]> = {
    lao: ["https://lotto.api.rayriffy.com/latest"],
    hanoi: ["https://api.xoso.net/api/front/lottery/last/xshn"],
    "hanoi-special": ["https://api.xoso.net/api/front/lottery/last/xshn"],
    "hanoi-vip": ["https://api.xoso.net/api/front/lottery/last/xshn"],
    malaysia: ["https://www.magnum4d.my/api/v1/results/latest"],
  };
  for (const url of urls[marketId] ?? []) {
    const json = await getJson(url);
    const parsed = pickDigits(json);
    if (parsed) return parsed;
  }
  return null;
}

export async function fetchLiveDraw(marketId: MarketId, _dateKey?: string): Promise<DrawResult | null> {
  try {
    if (marketId === "gov") return _dateKey ? fetchGovResult(_dateKey) : fetchGovResult("");
    if (marketId.startsWith("stock-")) return fetchStockDraw(marketId);
    if (marketId === "yeekee") return null;
    return fetchForeignDraw(marketId);
  } catch {
    return null;
  }
}
