import { createFileRoute, notFound } from "@tanstack/react-router";
import { SlotMachine } from "@/components/slot-machine";
import { getSlotGame } from "@/lib/slot-games";

export const Route = createFileRoute("/app/slot/$id")({
  component: SlotPlay,
});

function SlotPlay() {
  const { id } = Route.useParams();
  const game = getSlotGame(id);
  if (!game) throw notFound();
  return <SlotMachine game={game} />;
}
