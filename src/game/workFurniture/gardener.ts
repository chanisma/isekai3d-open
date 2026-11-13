import type { ObjectDef } from '../types';

/**
 * New furniture for the botanical greenhouse (2026-10-27 workplace pipeline, at the user's request):
 * what a 식물원 온실 has besides its beds — the propagation shelf where seed trays sprout under grow
 * lights, the misting posts down the aisle that hang the baskets and fog the house on a timer, the
 * koi pond with its little waterfall, the visitors' bench facing it, the plant-label sign by the
 * path, the tap and trough where the watering cans are filled, and the gift stand of little potted
 * plants in the lobby. Drawn in view3d/workplaces/gardener.ts (motions in gardenerMotion.ts).
 */
export const OBJECTS: ObjectDef[] = [
  {
    id: 'ghPropagationShelf', name: '육묘 선반', price: 0, w: 2, h: 1, icon: '🌱', color: '#cfd8dc', category: 'skill', unlisted: true,
    interactions: [
      { id: 'ghSowSeeds', label: '씨앗 파종하기', icon: '🌱', duration: 20, effects: { fun: 0.1, hygiene: -0.05 }, skill: { key: 'gardening', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'ghMistPost', name: '미스트 기둥·행잉 바스켓', price: 0, w: 1, h: 1, icon: '🚿', color: '#b0bec5', category: 'skill', unlisted: true,
    interactions: [
      { id: 'ghWaterBaskets', label: '행잉 바스켓 물 주기', icon: '🚿', duration: 15, effects: { fun: 0.05 }, skill: { key: 'gardening', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'ghKoiPond', name: '비단잉어 연못', price: 0, w: 2, h: 2, icon: '🐟', color: '#4fc3f7', category: 'skill', unlisted: true,
    interactions: [
      { id: 'ghFeedKoi', label: '연못 잉어 먹이 주기', icon: '🐟', duration: 15, effects: { fun: 0.2 }, skill: { key: 'gardening', rate: 1 / 200 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // Visitors sit here to watch the koi (a bench: a seat a tile).
    id: 'ghBenchSofa', name: '온실 벤치', price: 0, w: 2, h: 1, icon: '🪑', color: '#a1887f', category: 'decor', unlisted: true,
    interactions: [],
  },
  {
    id: 'ghLabelSign', name: '식물 안내판', price: 0, w: 1, h: 1, icon: '🪧', color: '#8d6e63', category: 'decor', unlisted: true,
    interactions: [],
  },
  {
    id: 'ghWaterTap', name: '물뿌리개 수전', price: 0, w: 1, h: 1, icon: '🚰', color: '#90a4ae', category: 'skill', unlisted: true,
    interactions: [
      { id: 'ghFillCans', label: '물뿌리개 채우기', icon: '🚰', duration: 10, effects: { fun: -0.02 }, skill: { key: 'gardening', rate: 1 / 220 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'ghGiftStand', name: '기념품 화분 판매대', price: 0, w: 2, h: 1, icon: '🪴', color: '#d7ccc8', category: 'skill', unlisted: true,
    interactions: [
      { id: 'ghStockGifts', label: '판매 화분 진열하기', icon: '🏷️', duration: 15, effects: { fun: 0.05 }, skill: { key: 'charisma', rate: 1 / 200 }, requires: 'atWork', pose: 'front' },
    ],
  },
  // The garden's glasshouses (2026-11-05, the layout audit, replacing a walled room called a greenhouse): the visitors' display
  // house and the growers' propagation house, walked into, glass all round; what grows in them are pieces of their own.
  { id: 'ghGlassHouse', name: '전시 온실', price: 0, w: 10, h: 7, icon: '🌿', color: '#dff3f1', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'ghGrowHouse', name: '재배 온실', price: 0, w: 6, h: 4, icon: '🌱', color: '#dff3f1', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
];
