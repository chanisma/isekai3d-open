import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 안경원 (2026-10-27 workplace pipeline, at the user's request): what a Korean
 * glasses shop has besides its 검안 unit, edgers, frame walls and fitting table — the autorefractor
 * (자동 굴절검사기) a customer puts their chin on first, the lensometer (렌즈미터) their old glasses are
 * read on, the contact-lens counter with its shelves of boxes and its mirror, the try-on mirror
 * between the frame walls, the ultrasonic cleaner (안경 무료 세척), and the lens price board (렌즈
 * 가격표 · 굴절률) in the waiting area. The shop (맑은눈안경) and its lens brands are made up. Drawn in
 * view3d/workplaces/optician.ts (with opticianMotion.ts).
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
  {
    id: 'opAutoRefractor', name: '자동 굴절검사기', price: 0, w: 1, h: 2, icon: '🔭', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [job('opAutoRefract', '자동 굴절 검사하기', '🔭', 15, { social: 0.1 }, 'logic', 120)],
  },
  {
    id: 'opLensMeter', name: '렌즈미터', price: 0, w: 1, h: 1, icon: '🔍', color: '#cfd8dc', category: 'skill', unlisted: true,
    interactions: [job('opReadLens', '쓰던 안경 도수 재기', '🔍', 15, { fun: -0.03 }, 'logic', 130)],
  },
  {
    id: 'opContactCounter', name: '콘택트렌즈 카운터', price: 0, w: 2, h: 1, icon: '👁️', color: '#b3e5fc', category: 'skill', unlisted: true,
    interactions: [
      job('opFitContacts', '콘택트렌즈 착용 도와주기', '👁️', 20, { social: 0.2 }, 'charisma', 120),
      job('opStockContacts', '렌즈 재고 정리하기', '📦', 15, { fun: -0.05 }, 'logic', 150),
    ],
  },
  {
    id: 'opTryMirror', name: '안경 써 보는 거울', price: 0, w: 1, h: 1, icon: '🪞', color: '#d7ccc8', category: 'skill', unlisted: true,
    interactions: [job('opTryFrames', '안경테 써 보게 하기', '🪞', 15, { social: 0.2 }, 'charisma', 130)],
  },
  {
    id: 'opUltraCleaner', name: '초음파 세척기', price: 0, w: 1, h: 1, icon: '🫧', color: '#b0bec5', category: 'skill', unlisted: true,
    interactions: [job('opCleanGlasses', '안경 세척해 드리기', '🫧', 10, { social: 0.1 }, 'handiness', 150)],
  },
  { id: 'opLensBoard', name: '렌즈 가격표', price: 0, w: 2, h: 1, icon: '📋', color: '#e3f2fd', category: 'decor', unlisted: true, interactions: [] },
  // The street front, the glass the edging room is seen through, the frame table and the unit next door (2026-11-05, the layout audit).
  { id: 'opShopFront', name: '안경원 유리 정면·간판', price: 0, w: 1, h: 1, icon: '🪧', color: '#1a237e', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'opGlassWall', name: '가공실 유리벽', price: 0, w: 1, h: 1, icon: '🪟', color: '#cfe6f2', category: 'decor', unlisted: true, interactions: [] },
  { id: 'opFrameTable', name: '안경테 진열 테이블', price: 0, w: 2, h: 1, icon: '👓', color: '#efebe9', category: 'decor', unlisted: true, interactions: [] },
  { id: 'opNeighbor', name: '이웃 휴대폰 매장', price: 0, w: 7, h: 9, icon: '🏪', color: '#dfe6ea', category: 'decor', unlisted: true, interactions: [] },
];
