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
  classic("lucky-neko-disco", "LUCKY NEKO DISCO", "เนโกะดิสโก้", "แมวกวักเปิดปาร์ตี้เลเซอร์ วงล้อสีสดสไตล์ไวรัล", "x22,000", true),
  classic("bubble-tea-boom", "BUBBLE TEA BOOM", "ชานมระเบิด", "ไข่มุกพุ่งกระจาย ธีมชานมสุดฮิตจอใหญ่", "x16,000", true),
  classic("chili-hotpot-spin", "CHILI HOTPOT", "หม้อไฟแซ่บ", "พริกเต้นไฟลุก กระแสสตรีทฟู้ดไวรัล", "x18,000", true),
  classic("tuktuk-treasure", "TUKTUK TREASURE", "ตุ๊กตุ๊กสมบัติ", "ตุ๊กตุ๊กทองซิ่งกลางกรุง เก็บเพชรตามทาง", "x20,000", true),
  classic("meme-rocket-rush", "ROCKET RUSH", "จรวดดวงจันทร์", "จรวดเหรียญพุ่งทะลุรุ้ง สไตล์มีมจอสด", "x25,000", true),
  classic("durian-party", "DURIAN PARTY", "ทุเรียนปาร์ตี้", "ราชาทุเรียนขึ้นเวที เทศกาลสีทองสุดป่วน", "x15,000", true),
  classic("muay-gold-clash", "MUAY GOLD", "มวยทองคำ", "นักมวยมาสคอตกระโดดในสนามไฟทอง", "x21,000", true),
  classic("golden-legion", "GOLDEN LEGION", "กองทัพทองคำ", "ก้าวเข้าสู่สนามรบแห่งอินทรีทอง และชิงชัยสูงถึง X25,000", "x25,000"),
  classic("naga-fire", "NAGA FIRE", "นาคาไฟ", "นาคทองคำผงาดจากสระโบราณ พ่นไฟทับรางวัลสายรุ้ง", "x12,000"),
  classic("phoenix-flame", "PHOENIX FLAME", "หงส์เพลิง", "หงส์เพลิงระเบิดจากภูเขาไฟ เกิดใหม่พร้อมรางวัลใหญ่", "x20,000"),
  classic("pharaoh-sun", "PHARAOH SUN", "สุริยะฟาโรห์", "พระอาทิตย์แห่งทะเลทราย ปลุกขุมทรัพย์พีระมิด", "x15,000"),
  classic("dragon-jade", "DRAGON JADE", "มังกรหยก", "มังกรหยกพันเหรียญน้ำตก หยกแตกคูณรางวัล", "x18,000"),
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
