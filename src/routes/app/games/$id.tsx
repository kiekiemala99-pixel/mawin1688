import { createFileRoute, notFound } from "@tanstack/react-router";
import { MiniTable } from "@/components/mini-table";
import { RpsRooms } from "@/components/rps-rooms";
import { getMiniGame } from "@/lib/minigames";

export const Route = createFileRoute("/app/games/$id")({
  component: MiniPlay,
});

function MiniPlay() {
  const { id } = Route.useParams();
  const game = getMiniGame(id);
  if (!game) throw notFound();
  if (game.id === "rps") return <RpsRooms />;
  return <MiniTable game={game} />;
}
