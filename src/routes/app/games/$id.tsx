import { createFileRoute, notFound } from "@tanstack/react-router";
import { MiniTable } from "@/components/mini-table";
import { RpsRooms } from "@/components/rps-rooms";
import { LiveHilo } from "@/components/live-hilo";
import { LiveCards } from "@/components/live-cards";
import { getMiniGame } from "@/lib/minigames";

export const Route = createFileRoute("/app/games/$id")({
  component: MiniPlay,
});

function MiniPlay() {
  const { id } = Route.useParams();
  const game = getMiniGame(id);
  if (!game) throw notFound();
  if (game.id === "rps") return <RpsRooms />;
  if (game.id === "hilo") return <LiveHilo />;
  if (game.id === "pokdeng" || game.id === "baccarat") return <LiveCards game={game} />;
  return <MiniTable game={game} />;
}
