export type SlotPack = "classic" | "tile";

export type SlotGame = {
  id: string;
  title: string;
  titleTh: string;
  tagline: string;
  maxWin: string;
  cover: string;
  pack: SlotPack;
  hot?: boolean;
};

const classic = (
  id: string,
  title: string,
  titleTh: string,
  tagline: string,
  maxWin: string,
  hot?: boolean,
): SlotGame => ({
  id,
  title,
  titleTh,
  tagline,
  maxWin,
  cover: `/slots/${id}.jpg`,
  pack: "classic",
  hot,
});

export const CLASSIC_GAMES: SlotGame[] = [
  classic("golden-legion", "GOLDEN LEGION", "กองทัพทองคำ", "ก้าวเข้าสู่สนามรบแห่งอินทรีทอง และชิงชัยสูงถึง X25,000", "x25,000", true),
  classic("naga-fire", "NAGA FIRE", "นาคาไฟ", "นาคทองคำผงาดจากสระโบราณ พ่นไฟทับรางวัลสายรุ้ง", "x12,000", true),
  classic("phoenix-flame", "PHOENIX FLAME", "หงส์เพลิง", "หงส์เพลิงระเบิดจากภูเขาไฟ เกิดใหม่พร้อมรางวัลใหญ่", "x20,000", true),
  classic("pharaoh-sun", "PHARAOH SUN", "สุริยะฟาโรห์", "พระอาทิตย์แห่งทะเลทราย ปลุกขุมทรัพย์พีระมิด", "x15,000", true),
  classic("dragon-jade", "DRAGON JADE", "มังกรหยก", "มังกรหยกพันเหรียญน้ำตก หยกแตกคูณรางวัล", "x18,000", true),
];

export const SLOT_GAMES: SlotGame[] = CLASSIC_GAMES;

export const SLOT_SYMBOL_IMG: Record<string, string> = {
  cherry: "/slots/symbols/cherry.jpg",
  bar: "/slots/symbols/bar.jpg",
  coin: "/slots/symbols/coin.jpg",
  gem: "/slots/symbols/gem.jpg",
  seven: "/slots/symbols/seven.jpg",
  crown: "/slots/symbols/crown.jpg",
  wild: "/slots/symbols/wild.jpg",
};

export const TILE_SYMBOL_IMG: Record<string, string> = {
  tong: "/slots/tiles/tong.jpg",
  tiao: "/slots/tiles/tiao.jpg",
  wan: "/slots/tiles/wan.jpg",
  bai: "/slots/tiles/bai.jpg",
  fa: "/slots/tiles/fa.jpg",
  zhong: "/slots/tiles/zhong.jpg",
  wild: "/slots/tiles/wild.jpg",
  hu: "/slots/tiles/hu.jpg",
};

export function getSlotGame(id: string) {
  return SLOT_GAMES.find((g) => g.id === id);
}

export function symbolImage(id: string, pack: SlotPack = "classic") {
  if (pack === "tile") return TILE_SYMBOL_IMG[id] ?? TILE_SYMBOL_IMG.zhong;
  return SLOT_SYMBOL_IMG[id] ?? SLOT_SYMBOL_IMG.cherry;
}
