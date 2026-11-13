import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 옷가게 (2026-11-01 workplace pipeline, at the user's request): what a clothes shop has besides
 * its shelves and till. A display of three full mannequins facing the door, floor rails, low tables of folded stacks, a
 * tower of accessories, a bag shelf and a sale board; in the stock room, cartons with a tag gun and a garment steamer.
 * Drawn in view3d/workplaces/retail.ts (with retailMotion.ts). The label and goods are made up.
 */
const job = (id: string, label: string, icon: string, duration: number, effects: InteractionDef['effects'], key: NonNullable<InteractionDef['skill']>['key'], rate: number): InteractionDef => ({
  id,
  label,
  icon,
  duration,
  effects,
  skill: { key, rate: 1 / rate },
  requires: 'atWork',
  pose: 'front',
});

export const OBJECTS: ObjectDef[] = [
  // A dress form standing in the shop window (2026-11-06, the layout audit): the same 마네킹, turned to face the street through the
  // glass behind it, styled from the shop side (its front). In the 옷가게's and the atelier's windows.
  {
    id: 'windowMannequin', name: '쇼윈도 마네킹', price: 0, w: 1, h: 1, icon: '👗', color: '#f8bbd0', category: 'skill', unlisted: true,
    interactions: [
      { id: 'dressMannequin', label: '마네킹 피팅하기', icon: '👗', duration: 20, effects: { fun: 0.15 }, skill: { key: 'painting', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  { id: 'rtWindowDisplay', name: '쇼윈도 진열대', price: 0, w: 3, h: 1, icon: '👗', color: '#f7f1e6', category: 'skill', unlisted: true, interactions: [job('rtDressWindow', '쇼윈도 마네킹 옷 갈아입히기', '👗', 25, { fun: 0.15 }, 'painting', 110)] },
  { id: 'rtGarmentRail', name: '매장 행거', price: 0, w: 2, h: 1, icon: '👕', color: '#8e6a45', category: 'skill', unlisted: true, interactions: [job('rtTidyRail', '행거 사이즈별로 정리하기', '👕', 15, { fun: -0.03 }, 'charisma', 180)] },
  { id: 'rtFoldTable', name: '접이 매대', price: 0, w: 3, h: 1, icon: '👕', color: '#c9a579', category: 'skill', unlisted: true, interactions: [job('rtSquareStacks', '매대 옷 다시 개어 맞추기', '👕', 20, { fun: -0.05 }, 'charisma', 190)] },
  { id: 'rtAccessoryStand', name: '액세서리 스탠드', price: 0, w: 1, h: 1, icon: '🛍️', color: '#e8d5b7', category: 'skill', unlisted: true, interactions: [job('rtArrangeAcc', '액세서리 진열 손보기', '🛍️', 15, { fun: 0.05 }, 'painting', 150)] },
  { id: 'rtSteamer', name: '스팀 다리미', price: 0, w: 1, h: 1, icon: '♨️', color: '#eceff1', category: 'skill', unlisted: true, interactions: [job('rtSteam', '입고 옷 스팀 다리기', '♨️', 20, { fun: -0.03 }, 'handiness', 160)] },
  { id: 'rtStockBoxes', name: '입고 상자', price: 0, w: 2, h: 1, icon: '📦', color: '#c79a6b', category: 'skill', unlisted: true, interactions: [job('rtTagStock', '입고 상자 풀어 택 달기', '🏷️', 25, { energy: -0.08 }, 'handiness', 170)] },
  { id: 'rtBagShelf', name: '포장 선반', price: 0, w: 2, h: 1, icon: '🛍️', color: '#c9a579', category: 'decor', unlisted: true, interactions: [] },
  { id: 'rtSaleSign', name: '세일 입간판', price: 0, w: 1, h: 1, icon: '🏷️', color: '#d32f2f', category: 'decor', unlisted: true, interactions: [] },
  // The street front and the unit next door (2026-11-05, the layout audit).
  { id: 'rtShopFront', name: '옷가게 쇼윈도 정면·간판', price: 0, w: 1, h: 1, icon: '🪧', color: '#4a148c', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'rtNeighbor', name: '이웃 신발 가게', price: 0, w: 5, h: 8, icon: '🏪', color: '#d7dde2', category: 'decor', unlisted: true, interactions: [] },
];
