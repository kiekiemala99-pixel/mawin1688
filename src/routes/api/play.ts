import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";
import { playMiniGame } from "@/lib/minigame-server";
import { spinSlot } from "@/lib/slot-server";

export const Route = createFileRoute("/api/play")({
  server: {
    handlers: {
      POST: async ({ request }) => handlePlay(request),
    },
  },
});

function back(path: string, query: string) {
  return new Response(null, { status: 303, headers: { Location: `${path}${query ? `?${query}` : ""}` } });
}

async function handlePlay(request: Request) {
  try {
    const form = await request.formData();
    const token = String(form.get("auth") || "").trim();
    const headers = new Headers(request.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (!headers.get("origin")) headers.set("origin", new URL(request.url).origin);
    const session = await auth.api.getSession({ headers });
    if (!session?.user?.id) return back("/", "err=login");

    const kind = String(form.get("kind") || "");
    const gameId = String(form.get("gameId") || "");
    const pick = String(form.get("pick") || "spin");
    const stake = Number(form.get("stake") || 0);
    if (!(stake > 0)) return back(kind === "slot" ? `/app/slot/${gameId || "golden-legion"}` : `/app/games/${gameId || "rps"}`, "err=stake");

    if (kind === "slot") {
      const id = gameId || "golden-legion";
      try {
        const out = await spinSlot({ data: { stake, gameId: id } });
        const q = out.spin.status === "won" ? `ok=win&pay=${out.spin.payout}` : "miss=1";
        return back(`/app/slot/${id}`, q);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (/เครดิตไม่พอ/.test(msg)) return back(`/app/slot/${id}`, "err=credit");
        return back(`/app/slot/${id}`, "err=fail");
      }
    }

    const id = gameId || "rps";
    try {
      const out = await playMiniGame({ data: { gameId: id, pick, stake } });
      const q =
        out.play.status === "won"
          ? `ok=${encodeURIComponent(out.play.summary)}&pay=${out.play.payout}`
          : out.play.status === "push"
            ? `ok=${encodeURIComponent(out.play.summary)}`
            : `miss=${encodeURIComponent(out.play.summary)}`;
      return back(`/app/games/${id}`, q);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (/เครดิตไม่พอ/.test(msg)) return back(`/app/games/${id}`, "err=credit");
      return back(`/app/games/${id}`, "err=fail");
    }
  } catch (err) {
    console.error("[play]", err);
    return back("/app", "err=fail");
  }
}
