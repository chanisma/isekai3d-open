import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 국유림 관리소 (2026-11-01 workplace pipeline, at the user's request): the hills and the forest
 * floor themselves, and what a national forest office keeps on them: a numbered pine with its measuring tools, a
 * pine-wilt trap with its sample table, a fire tools shed, a patrol board, a sign-in stand for hikers, a forest road
 * sign, a stack of logs and the office desk. The seedling bench, the thinning area, the fire watch tower, the trail
 * sign and the fire truck are in catalogKorea.ts. Drawn in view3d/workplaces/forester.ts (with foresterMotion.ts).
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
  { id: 'fgHills', name: '솔재 능선', price: 0, w: 16, h: 2, icon: '🌲', color: '#55734a', category: 'decor', unlisted: true, interactions: [] },
  { id: 'fgGround', name: '숲 바닥', price: 0, w: 16, h: 13, icon: '🌲', color: '#7d8a55', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'fgRoadSign', name: '임도 표지판', price: 0, w: 1, h: 1, icon: '🪧', color: '#2e7d32', category: 'decor', unlisted: true, interactions: [] },
  { id: 'fgLogs', name: '통나무 더미', price: 0, w: 2, h: 1, icon: '🌲', color: '#8d6e4a', category: 'decor', unlisted: true, interactions: [] },
  // 2026-11-05, the layout audit: stands of the forest itself (pine and oak, close, with undergrowth) to fill the lot the work is
  // done in, in three sizes, and the 조림지, a cleared slope planted in rows of young trees.
  { id: 'fgWood', name: '소나무·참나무 숲', price: 0, w: 2, h: 2, icon: '🌲', color: '#2f5d34', category: 'decor', unlisted: true, interactions: [] },
  { id: 'fgWoodW', name: '소나무·참나무 숲', price: 0, w: 3, h: 2, icon: '🌲', color: '#2f5d34', category: 'decor', unlisted: true, interactions: [] },
  { id: 'fgWoodT', name: '소나무 숲 가장자리', price: 0, w: 2, h: 1, icon: '🌲', color: '#2f5d34', category: 'decor', unlisted: true, interactions: [] },
  { id: 'fgPlantation', name: '조림지', price: 0, w: 9, h: 4, icon: '🌱', color: '#8d7a56', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  {
    id: 'fgMeasure', name: '표준지 측정목', price: 0, w: 2, h: 1, icon: '🌲', color: '#8a5a3c', category: 'skill', unlisted: true,
    interactions: [job('fgMeasureTree', '표준목 재기', '🌲', 25, { energy: -0.08 }, 'logic', 120)],
  },
  {
    id: 'fgPineTrap', name: '재선충 트랩', price: 0, w: 2, h: 1, icon: '🔬', color: '#37474f', category: 'skill', unlisted: true,
    interactions: [job('fgCheckTrap', '매개충 트랩 확인하기', '🔬', 25, { fun: -0.03 }, 'science', 120)],
  },
  {
    id: 'fgFireShed', name: '산불 장비 창고', price: 0, w: 2, h: 1, icon: '🚒', color: '#c62828', category: 'skill', unlisted: true,
    interactions: [job('fgCheckGear', '진화 장비 점검하기', '🚒', 20, { energy: -0.08 }, 'fitness', 130)],
  },
  {
    id: 'fgPatrolBoard', name: '순찰 현황판', price: 0, w: 2, h: 1, icon: '📋', color: '#546e7a', category: 'skill', unlisted: true,
    interactions: [job('fgPatrol', '순찰 구역 정하기', '📋', 15, { fun: -0.02 }, 'logic', 140)],
  },
  {
    id: 'fgVisitorBoard', name: '입산 신고대', price: 0, w: 2, h: 1, icon: '🥾', color: '#a1887f', category: 'skill', unlisted: true,
    interactions: [job('fgSignIn', '입산 신고 받기', '🥾', 15, { social: 0.2 }, 'charisma', 130)],
  },
  {
    id: 'fgDesk', name: '관리소 책상', price: 0, w: 2, h: 1, icon: '📋', color: '#8d6e4a', category: 'skill', unlisted: true,
    interactions: [job('fgWriteLog', '산림 일지 쓰기', '📋', 20, { fun: -0.03 }, 'writing', 130)],
  },
  // The 치유의 숲's pieces (2026-11-04, the branch lots). The barrier-free deck road through the trees; stands of 편백 and pine; the
  // 편백 foot bath where a programme ends; the hammocks of the wind-bathing ground.
  { id: 'fhDeck', name: '무장애 데크로드', price: 0, w: 4, h: 1, icon: '🌲', color: '#a1887f', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'fhGrove', name: '편백 숲', price: 0, w: 2, h: 2, icon: '🌲', color: '#2f5d34', category: 'decor', unlisted: true, interactions: [] },
  {
    id: 'fhFootTub', name: '편백 족욕기', price: 0, w: 2, h: 1, icon: '🦶', color: '#c8a26a', category: 'skill', unlisted: true,
    interactions: [job('fhFootBath', '편백 족욕 안내하기', '🦶', 25, { social: 0.2 }, 'charisma', 120)],
  },
  { id: 'fhHammock', name: '풍욕장 해먹', price: 0, w: 2, h: 1, icon: '🌲', color: '#8d6e63', category: 'decor', unlisted: true, interactions: [] },
];
