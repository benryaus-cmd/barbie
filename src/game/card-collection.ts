import assetsData from "@/config/assets";
export type CollectorCard = {
  id: number;
  title: string;
  location: string;
  image: string;
  rarity: string;
  clue: string;
  story: string;
};
export const COLLECTOR_CARDS: CollectorCard[] = [{
  id: 0,
  rarity: 'Signature',
  clue: 'Look by the Dreamhouse entrance, just before the living room.',
  story: 'A satin-blue evening, made for the spotlight.',
  title: 'Venetian Blue',
  location: 'Dreamhouse',
  image: assetsData.collector_card_art_1
}, {
  id: 1,
  rarity: 'Rare',
  clue: 'Explore the ground-floor living area, beside the kitchen.',
  story: 'Parisian tailoring with a dream-pink twist.',
  title: 'Paris Chic',
  location: 'Dreamhouse',
  image: assetsData.collector_card_art_2
}, {
  id: 2,
  rarity: 'Rare',
  clue: 'A treasure is waiting beside the pool terrace.',
  story: 'Emerald velvet and a little London attitude.',
  title: 'London Emerald',
  location: 'Dreamhouse',
  image: assetsData.collector_card_art_3
}, {
  id: 3,
  rarity: 'Limited',
  clue: 'Walk beyond the runway, toward the far end of Fashion Avenue.',
  story: 'A waterfront look worthy of the front row.',
  title: 'Waterfront Royal',
  location: 'Fashion Avenue',
  image: assetsData.collector_card_art_4
}, {
  id: 4,
  rarity: 'Signature',
  clue: 'A treasure is tucked beside the Fashion Avenue shops.',
  story: 'The look that turns window shopping into a fashion story.',
  title: 'Boutique Muse',
  location: 'Fashion Avenue',
  image: assetsData.collector_card_art_5
}, {
  id: 5,
  rarity: 'Signature',
  clue: 'Follow the beach path south of the smoothie bar.',
  story: 'Soft florals, sea air and an endless summer.',
  title: 'Blue Hour Blooms',
  location: 'Glam Beach',
  image: assetsData.collector_card_art_6
}, {
  id: 6,
  rarity: 'Limited',
  clue: 'Search the sand just north of the volleyball court.',
  story: 'After-dark glamour with a playful edge.',
  title: 'City Lights',
  location: 'Glam Beach',
  image: assetsData.collector_card_art_7
}, {
  id: 7,
  rarity: 'Iconic',
  clue: 'Head to the furthest end of the sunny coastline.',
  story: 'The crown jewel of your Dreamland collection.',
  title: 'Roman Royalty',
  location: 'Glam Beach',
  image: assetsData.collector_card_art_8
}];
const STORAGE_KEY = 'barbie-ultimate-dreamland:collector-cards';
export function loadCollectedCards(): number[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const value: unknown = JSON.parse(stored);
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((id): id is number => Number.isInteger(id) && id >= 0 && id < COLLECTOR_CARDS.length))];
  } catch {
    return [];
  }
}
export function saveCollectedCards(ids: number[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Collection still works for this play session when storage is unavailable.
  }
}