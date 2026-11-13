import type { ObjectDef } from '../types';

/**
 * New furniture for the café (2026-10-27 workplace pipeline, at the user's request): what a Korean
 * café has besides the espresso machine and the till — the back bar where the iced drinks are made
 * under the lit menu board, the pickup counter with its bell and pagers, a cake showcase, the self
 * bar with its straws and tray return, and the A-board out front. Drawn in view3d/workplaces/barista.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    id: 'baristaBackBar', name: '음료 제조대', price: 0, w: 2, h: 1, icon: '🧊', color: '#4e342e', category: 'skill', unlisted: true,
    interactions: [
      { id: 'baristaIcedDrink', label: '아이스 음료 만들기', icon: '🧊', duration: 15, effects: { fun: 0.1 }, skill: { key: 'mixology', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'baristaPickup', name: '픽업대', price: 0, w: 1, h: 1, icon: '🔔', color: '#6d4c41', category: 'skill', unlisted: true,
    interactions: [
      { id: 'baristaCallOrder', label: '진동벨 울려 음료 내주기', icon: '🔔', duration: 10, effects: { social: 0.1 }, skill: { key: 'charisma', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'baristaCakeCase', name: '케이크 쇼케이스', price: 0, w: 2, h: 1, icon: '🍰', color: '#f5efe6', category: 'skill', unlisted: true,
    interactions: [
      { id: 'arrangeDisplay', label: '케이크 진열하기', icon: '🍰', duration: 10, effects: { fun: 0.05 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'baristaSelfBar', name: '셀프바', price: 0, w: 1, h: 1, icon: '🥤', color: '#8d6e63', category: 'skill', unlisted: true,
    interactions: [
      { id: 'baristaTidySelfBar', label: '셀프바 정리하기', icon: '🧻', duration: 10, effects: { fun: -0.05 }, requires: 'atWork', pose: 'front' },
    ],
  },
  { id: 'baristaSign', name: '입간판', price: 0, w: 1, h: 1, icon: '🪧', color: '#3e2723', category: 'decor', unlisted: true, interactions: [] },
  // The street front, the store behind the bar and the unit next door (2026-11-05, the layout audit).
  { id: 'baristaShopFront', name: '카페 통유리 정면·간판', price: 0, w: 1, h: 1, icon: '🪧', color: '#3e2723', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'baristaStockShelf', name: '원두·컵 선반', price: 0, w: 2, h: 1, icon: '📦', color: '#8d6e63', category: 'decor', unlisted: true, interactions: [] },
  { id: 'baristaNeighbor', name: '이웃 꽃가게', price: 0, w: 5, h: 8, icon: '🏪', color: '#e6d8c3', category: 'decor', unlisted: true, interactions: [] },
];
