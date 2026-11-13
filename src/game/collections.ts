import { FISH } from './fishing';

/**
 * Collections after 참고 게임 (module tuning objects.collection_manager COLLECTIONS_DEFINITION;
 * Korean collection names from the game): each item is common, uncommon or rare, and finishing a
 * collection pays completed_award_money where 참고 게임 gives one (fish 500). 참고 게임 keeps the item names in
 * object definitions we can't read, so the items below are ours, fewer than 참고 게임's (crystals 13,
 * metals 22, space rocks 37, aliens 10, space prints 11, fish 22).
 */
export type Rarity = 'common' | 'uncommon' | 'rare';

export interface CollectionItem {
  id: string;
  name: string;
  rarity: Rarity;
}

export interface CollectionDef {
  id: string;
  name: string;
  icon: string;
  items: CollectionItem[];
  reward?: number;
}

const items = (list: Array<[string, Rarity]>): CollectionItem[] => list.map(([name, rarity]) => ({ id: name, name, rarity }));

export const COLLECTIONS: CollectionDef[] = [
  {
    id: 'crystals',
    name: '크리스탈',
    icon: '💎',
    items: items([['석영', 'common'], ['자수정', 'common'], ['시트린', 'common'], ['장미 석영', 'common'], ['터키석', 'uncommon'], ['황옥', 'uncommon'], ['에메랄드', 'uncommon'], ['루비', 'rare'], ['사파이어', 'rare'], ['다이아몬드', 'rare']]),
  },
  {
    id: 'metals',
    name: '금속',
    icon: '🪨',
    items: items([['구리', 'common'], ['철', 'common'], ['주석', 'common'], ['은', 'uncommon'], ['금', 'uncommon'], ['백금', 'rare'], ['티타늄', 'rare']]),
  },
  {
    id: 'spaceRocks',
    name: '우주석',
    icon: '☄️',
    items: items([['달 먼지', 'common'], ['화성 조각', 'common'], ['혜성 파편', 'uncommon'], ['소행성 덩어리', 'uncommon'], ['운석', 'uncommon'], ['별의 결정', 'rare']]),
  },
  {
    id: 'aliens',
    name: '외계인',
    icon: '👽',
    items: items([['초록 외계 표본', 'common'], ['보라 외계 표본', 'uncommon'], ['반짝이는 외계 표본', 'rare']]),
  },
  {
    id: 'spacePrints',
    name: '우주 사진',
    icon: '🌌',
    items: items([['달 사진', 'common'], ['토성 고리 사진', 'common'], ['혜성 사진', 'uncommon'], ['성운 사진', 'uncommon'], ['은하 사진', 'rare']]),
  },
  {
    // 참고 게임 "현미경 사진" (found with the microscope); the slides' names are ours.
    id: 'microscopePrints',
    name: '현미경 사진',
    icon: '🔬',
    items: items([['결정 단면', 'common'], ['모래 알갱이', 'common'], ['꽃가루', 'common'], ['곰팡이 포자', 'common'], ['규조류', 'uncommon'], ['눈송이 결정', 'uncommon'], ['나비 날개 비늘', 'uncommon'], ['세포 분열', 'rare'], ['운석 조각', 'rare']]),
  },
  {
    id: 'fish',
    name: '물고기',
    icon: '🐟',
    reward: 500,
    items: FISH.map((f) => ({ id: f.id, name: f.name, rarity: (f.level >= 7 ? 'rare' : f.level >= 4 ? 'uncommon' : 'common') as Rarity })),
  },
];

export const COLLECTION_BY_ID: Record<string, CollectionDef> = Object.fromEntries(COLLECTIONS.map((c) => [c.id, c]));

/** Odds of each rarity when something turns up (ours: 60 / 30 / 10). */
const RARITY_WEIGHT: Record<Rarity, number> = { common: 6, uncommon: 3, rare: 1 };

/** A random item from a collection, rarer ones less often. */
export function rollItem(collectionId: string, rng: () => number): CollectionItem {
  const c = COLLECTION_BY_ID[collectionId];
  const total = c.items.reduce((s, i) => s + RARITY_WEIGHT[i.rarity], 0);
  let x = rng() * total;
  for (const i of c.items) {
    x -= RARITY_WEIGHT[i.rarity];
    if (x <= 0) return i;
  }
  return c.items[c.items.length - 1];
}
