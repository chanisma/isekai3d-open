import type { ObjectDef } from '../types';

/**
 * New furniture for the 에스테틱 (2026-10-27 workplace pipeline, at the user's request): what a Korean
 * 피부관리실 has besides its beds — the hot-towel cabinet the steamed towels come out of, the skin
 * consultation desk with the skin-scan screen (the client sat across it in a soft chair, the cheek
 * scanned with the handheld probe), the welcome-tea table in the waiting corner with the same chairs,
 * the shelf of the shop's own home-care line, and the folding screen where the clients change into
 * their gowns. Drawn in view3d/workplaces/esthetician.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    id: 'estTowelCabinet', name: '핫타월 온장고', price: 0, w: 1, h: 1, icon: '♨️', color: '#f5f5f5', category: 'skill', unlisted: true,
    interactions: [
      { id: 'estWarmTowels', label: '핫타월 데워 꺼내기', icon: '♨️', duration: 10, effects: { hygiene: 0.02 }, skill: { key: 'handiness', rate: 1 / 170 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'estConsultDesk', name: '피부 상담 데스크', price: 0, w: 2, h: 1, icon: '🧴', color: '#fafafa', category: 'skill', unlisted: true,
    interactions: [
      { id: 'estCarePlan', label: '맞춤 관리 프로그램 짜기', icon: '📋', duration: 20, effects: { fun: 0.02 }, skill: { key: 'medicine', rate: 1 / 140 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'estClientChair', name: '고객 의자', price: 0, w: 1, h: 1, icon: '🛋️', color: '#e8dccb', category: 'decor', unlisted: true,
    interactions: [],
  },
  {
    id: 'estTeaTable', name: '웰컴 티 테이블', price: 0, w: 1, h: 1, icon: '🍵', color: '#c8a27a', category: 'skill', unlisted: true,
    interactions: [
      { id: 'estBrewTea', label: '웰컴 티 우리기', icon: '🍵', duration: 10, effects: { fun: 0.05 }, skill: { key: 'empathy', rate: 1 / 160 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'estRetailShelf', name: '홈케어 제품 진열장', price: 0, w: 2, h: 1, icon: '🧴', color: '#f3ece4', category: 'skill', unlisted: true,
    interactions: [
      { id: 'estArrangeHomecare', label: '홈케어 제품 진열하기', icon: '🛍️', duration: 15, effects: { fun: 0.02 }, skill: { key: 'business', rate: 1 / 160 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'estChangingScreen', name: '탈의 가림막', price: 0, w: 1, h: 1, icon: '🧥', color: '#e6d5bd', category: 'skill', unlisted: true,
    interactions: [
      { id: 'estFoldGowns', label: '가운·타월 개어 놓기', icon: '🧥', duration: 10, effects: { hygiene: 0.01 }, skill: { key: 'handiness', rate: 1 / 180 }, requires: 'atWork', pose: 'front' },
    ],
  },
  // The street front, the desk and the unit next door (2026-11-05, the layout audit; view3d/workplaces/shopFront.ts).
  { id: 'estShopFront', name: '피부관리실 유리 정면·간판', price: 0, w: 1, h: 1, icon: '🪧', color: '#d7b8a8', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'estReception', name: '에스테틱 안내 데스크', price: 0, w: 2, h: 1, icon: '🛎️', color: '#efe6dc', category: 'decor', unlisted: true, interactions: [] },
  { id: 'estNeighbor', name: '이웃 약국', price: 0, w: 5, h: 12, icon: '🏪', color: '#e3ebe6', category: 'decor', unlisted: true, interactions: [] },
];
