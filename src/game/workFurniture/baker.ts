import type { ObjectDef } from '../types';

/**
 * New furniture for the bakery (2026-10-27 workplace pipeline, at the user's request): what a Korean
 * bakery has besides its deck ovens, the bench and the cake table — the planetary mixer the dough
 * is mixed in, the proofer it rises in, the rack trolley of cooling trays, the bread slicer, the
 * 평대 the loaves are laid out on for the customers' trays and tongs, and the packing counter with
 * its bags and the till (계산대). Drawn in view3d/workplaces/baker.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    id: 'bkMixer', name: '반죽 믹서', price: 0, w: 1, h: 1, icon: '🥣', color: '#e0e0e0', category: 'skill', unlisted: true,
    interactions: [
      { id: 'bkMixDough', label: '믹서로 반죽 치기', icon: '🥣', duration: 20, effects: { energy: -0.05 }, skill: { key: 'cooking', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'bkProofer', name: '발효기', price: 0, w: 1, h: 1, icon: '🌡️', color: '#cfd8dc', category: 'skill', unlisted: true,
    interactions: [
      { id: 'bkProofCheck', label: '발효 상태 확인하기', icon: '🌡️', duration: 10, effects: { fun: 0.05 }, skill: { key: 'cooking', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'bkCoolingRack', name: '빵 식힘 랙', price: 0, w: 1, h: 1, icon: '🧺', color: '#b0bec5', category: 'skill', unlisted: true,
    interactions: [
      { id: 'bkCoolRack', label: '갓 구운 빵 식힘 랙에 옮기기', icon: '🧺', duration: 10, effects: { fun: 0.05 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'bkSlicer', name: '식빵 슬라이서', price: 0, w: 1, h: 1, icon: '🍞', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'bkSliceBread', label: '식빵 썰어 봉투에 담기', icon: '🍞', duration: 10, effects: { fun: 0.05 }, skill: { key: 'cooking', rate: 1 / 160 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'bkBreadIsland', name: '빵 평대', price: 0, w: 2, h: 1, icon: '🥖', color: '#a1887f', category: 'skill', unlisted: true,
    interactions: [
      { id: 'arrangeDisplay', label: '평대에 빵 채우기', icon: '🥖', duration: 10, effects: { fun: 0.05 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'bkCheckout', name: '포장대·계산대', price: 0, w: 2, h: 1, icon: '🛍️', color: '#8d6e63', category: 'skill', unlisted: true,
    interactions: [
      { id: 'bkPackCheckout', label: '빵 포장하고 계산하기', icon: '🛍️', duration: 15, effects: { social: 0.1 }, skill: { key: 'charisma', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  // The street front and the shop's other walls (2026-11-05, the layout audit): the glass front, the sign and the awning drawn from an
  // anchor on the pavement, the glass the bakehouse is seen through, the dry store's shelves, the unit next door.
  { id: 'bkShopFront', name: '빵집 유리 정면·간판', price: 0, w: 1, h: 1, icon: '🪧', color: '#8d5524', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'bkGlassWall', name: '주방 유리창', price: 0, w: 2, h: 1, icon: '🪟', color: '#cfe6f2', category: 'decor', unlisted: true, interactions: [] },
  { id: 'bkFlourStore', name: '밀가루·재료 선반', price: 0, w: 2, h: 1, icon: '📦', color: '#d7ccc8', category: 'decor', unlisted: true, interactions: [] },
  { id: 'bkNeighbor', name: '이웃 문구점', price: 0, w: 5, h: 8, icon: '🏪', color: '#e0d6c8', category: 'decor', unlisted: true, interactions: [] },
];
