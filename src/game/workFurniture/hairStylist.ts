import type { ObjectDef } from '../types';

/**
 * New furniture for the hair salon (2026-10-27 workplace pipeline, at the user's request): what a
 * Korean 미용실 has besides its styling chairs and shampoo beds — the colour bar where the dye is
 * weighed and mixed under the wall of tint tubes, the processor (열처리기) parked by the chairs for
 * perms and colour, the stylist's trolley (웨건) of rods and clips, the towel steamer over its little
 * washer, and the tea table by the waiting chairs with its magazines. Drawn in
 * view3d/workplaces/hairStylist.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    id: 'hsColorBar', name: '컬러 조제 바', price: 0, w: 2, h: 1, icon: '🎨', color: '#f8f4f0', category: 'skill', unlisted: true,
    interactions: [
      { id: 'mixDye', label: '염색약 조제하기', icon: '🧪', duration: 15, effects: { fun: 0.05 }, skill: { key: 'painting', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
      { id: 'hsColorChart', label: '컬러 차트로 색 고르기', icon: '🌈', duration: 15, effects: { fun: 0.1 }, skill: { key: 'painting', rate: 1 / 140 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'hsProcessor', name: '열처리기', price: 0, w: 1, h: 1, icon: '🔥', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'hsSetProcessor', label: '열처리기 시간 맞추기', icon: '⏰', duration: 10, effects: { fun: -0.02 }, skill: { key: 'handiness', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'hsTrolley', name: '미용 웨건', price: 0, w: 1, h: 1, icon: '🧺', color: '#212121', category: 'skill', unlisted: true,
    interactions: [
      { id: 'hsPrepRods', label: '파마 롯드 준비하기', icon: '🌀', duration: 15, effects: { fun: 0.02 }, skill: { key: 'handiness', rate: 1 / 130 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'hsTowelSteamer', name: '타월 스티머·세탁기', price: 0, w: 1, h: 1, icon: '♨️', color: '#f5f5f5', category: 'skill', unlisted: true,
    interactions: [
      { id: 'washTowels', label: '수건 세탁하고 데우기', icon: '🧺', duration: 10, effects: { fun: -0.05 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'hsTeaTable', name: '대기석 티 테이블', price: 0, w: 1, h: 1, icon: '🍵', color: '#d7ccc8', category: 'skill', unlisted: true,
    interactions: [
      { id: 'hsServeTea', label: '대기 손님께 차 내기', icon: '🍵', duration: 10, effects: { social: 0.15 }, skill: { key: 'charisma', rate: 1 / 160 }, requires: 'atWork', pose: 'front' },
    ],
  },
  // The street front with the barber's pole and the unit next door (2026-11-05, the layout audit; view3d/workplaces/shopFront.ts).
  { id: 'hsShopFront', name: '미용실 유리 정면·간판·사인볼', price: 0, w: 1, h: 1, icon: '🪧', color: '#6a1b9a', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'hsNeighbor', name: '이웃 분식집', price: 0, w: 7, h: 12, icon: '🏪', color: '#f0e2cc', category: 'decor', unlisted: true, interactions: [] },
];
