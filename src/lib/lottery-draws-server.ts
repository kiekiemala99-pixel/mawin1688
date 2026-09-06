import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { fetchGovResult, fetchLiveDraw } from "@/lib/lottery-feed";
import { MARKETS, getGovState, getMarketState, type DrawResult, type MarketId } from "@/lib/lottery";
import { logServerError } from "@/lib/server-log";

export type PostedDraw = {
  roundKey: string;
  marketId: string;
  top3: string;
  bottom2: string;
  first6: string;
  createdAt: number;
};

async function upsertDraw(roundKey: string, marketId: string, live: DrawResult, source: string) {
  const sql = await getSql();
  const first6 = live.first6 ?? `${live.bottom2}${live.top3}`.slice(-6);
  await sql.query(
    `insert into draw_results (round_key, market_id, top3, bottom2, first6, posted_by)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (round_key) do update
       set top3 = excluded.top3,
           bottom2 = excluded.bottom2,
           first6 = excluded.first6,
           posted_by = excluded.posted_by
     where excluded.posted_by in ('glo','live') or coalesce(draw_results.posted_by, '') not in ('glo','live','admin')`,
    [roundKey, marketId, live.top3, live.bottom2, first6, source],
  );
}

export async function persistGovLive(dateKey: string): Promise<DrawResult | null> {
  const live = await fetchGovResult(dateKey);
  if (!live) return null;
  await upsertDraw(`gov:${dateKey}`, "gov", live, "glo");
  return { ...live, first6: live.first6 ?? `${live.bottom2}${live.top3}`.slice(-6) };
}

async function persistMarketLive(id: MarketId) {
  const st = getMarketState(id, new Date());
  const prev = st.previous;
  if (!prev?.roundKey || !prev.dateKey) return;
  const live = await fetchLiveDraw(id, prev.dateKey);
  if (!live) return;
  await upsertDraw(prev.roundKey, id, live, id === "gov" ? "glo" : "live");
}

export async function persistAllLiveDraws() {
  await Promise.allSettled(MARKETS.map((m) => persistMarketLive(m.id)));
}

export const listPublicDraws = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const st = getGovState(new Date());
    if (st.previous?.dateKey) {
      await persistGovLive(st.previous.dateKey).catch((err) => logServerError("persistGovLive", err));
    }
    void persistAllLiveDraws().catch((err) => logServerError("persistAllLiveDraws", err));
    const sql = await getSql();
    const rows = await sql<{
      round_key: string;
      market_id: string;
      top3: string;
      bottom2: string;
      first6: string;
      created_at: string;
    }>`
      select round_key, market_id, top3, bottom2, first6, created_at
      from draw_results
      order by created_at desc
      limit 40
    `;
    return rows.map(
      (r): PostedDraw => ({
        roundKey: r.round_key,
        marketId: r.market_id,
        top3: r.top3,
        bottom2: r.bottom2,
        first6: r.first6 ?? "",
        createdAt: new Date(r.created_at).getTime(),
      }),
    );
  } catch (err) {
    logServerError("listPublicDraws", err);
    return [] as PostedDraw[];
  }
});

export const loadHomeDraws = createServerFn({ method: "GET" }).handler(async () => {
  const st = getGovState(new Date());
  const dateKey = st.previous?.dateKey ?? "";
  let gov: DrawResult | null = null;
  if (dateKey) {
    try {
      gov = await persistGovLive(dateKey);
    } catch (err) {
      logServerError("loadHomeDraws.gov", err);
    }
  }
  void persistAllLiveDraws().catch((err) => logServerError("loadHomeDraws.live", err));
  return {
    govDate: dateKey,
    gov,
  };
});
