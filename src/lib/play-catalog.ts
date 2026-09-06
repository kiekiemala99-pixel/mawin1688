import { MINI_GAMES } from "@/lib/minigames";
import { SLOT_GAMES } from "@/lib/slot-games";

export type PlayCard = {
  href: string;
  cover: string;
  title: string;
  sub: string;
};

export const PLAY_CARDS: PlayCard[] = [
  ...MINI_GAMES.map((g) => ({
    href: `/app/games/${g.id}`,
    cover: g.cover,
    title: g.title,
    sub: g.blurb,
  })),
  ...SLOT_GAMES.map((g) => ({
    href: `/app/slot/${g.id}`,
    cover: g.cover,
    title: g.titleTh,
    sub: g.maxWin,
  })),
];
