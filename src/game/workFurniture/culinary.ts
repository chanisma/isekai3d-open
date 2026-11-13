import type { ObjectDef } from '../types';

/**
 * New furniture for the restaurant kitchen (2026-10-26 workplace pipeline, at the user's request):
 * what a working kitchen has besides the line and the pass — the stock pot on its low range, the
 * dish pit, the dry store's shelving — and the host's stand in the dining room. Drawn in
 * view3d/workplaces/culinary.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    id: 'culinaryStockRange', name: '육수 화구', price: 0, w: 1, h: 1, icon: '🍲', color: '#78909c', category: 'skill', unlisted: true,
    interactions: [
      { id: 'culinaryMakeStock', label: '육수 끓이기', icon: '🍲', duration: 30, effects: { fun: 0.05, energy: -0.05 }, skill: { key: 'cooking', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'culinaryDishPit', name: '세척대', price: 0, w: 2, h: 1, icon: '🧽', color: '#b0bec5', category: 'skill', unlisted: true,
    interactions: [
      { id: 'culinaryWashDishes', label: '설거지하기', icon: '🧽', duration: 20, effects: { fun: -0.1, hygiene: -0.05 }, skill: { key: 'cooking', rate: 1 / 300 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'culinaryDryRack', name: '식자재 선반', price: 0, w: 2, h: 1, icon: '📦', color: '#cfd8dc', category: 'skill', unlisted: true,
    interactions: [
      { id: 'culinaryCheckStock', label: '식자재 재고 확인하기', icon: '📋', duration: 15, effects: { fun: -0.05 }, skill: { key: 'cooking', rate: 1 / 250 }, requires: 'atWork', pose: 'front' },
    ],
  },
  { id: 'culinaryHostStand', name: '안내 데스크', price: 0, w: 1, h: 1, icon: '📖', color: '#5d4037', category: 'decor', unlisted: true, interactions: [] },
];
