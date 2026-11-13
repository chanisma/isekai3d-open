import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 양식장 (2026-11-01 workplace pipeline, at the user's request): the yard's concrete and the
 * inshore water behind it with its floating net pens and walkway, the feed store with its silo, the pump room, the
 * fry hatchery rack, a grading table, the packing bench with ice, a low tub for visitors' hands, and two lamp posts
 * for the dark end of an early shift. The tanks, the abalone trough, the sensor terminal and the harvest table are
 * in catalogKorea.ts. Drawn in view3d/workplaces/fishFarmer.ts (with fishFarmerMotion.ts).
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
  { id: 'yaYard', name: '양식장 마당', price: 0, w: 16, h: 13, icon: '🐟', color: '#b7b4aa', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'yaSea', name: '앞바다', price: 0, w: 11, h: 2, icon: '🌊', color: '#2f7f9e', category: 'decor', unlisted: true, interactions: [] },
  { id: 'yaLamp', name: '야외 등', price: 0, w: 1, h: 1, icon: '💡', color: '#90a4ae', category: 'decor', unlisted: true, interactions: [] },
  {
    id: 'yaPens', name: '가두리 해상 통로', price: 0, w: 5, h: 2, icon: '🌊', color: '#37596e', category: 'skill', unlisted: true,
    interactions: [job('yaWalkPens', '가두리 돌며 그물 살피기', '🌊', 25, { energy: -0.1 }, 'fishing', 110)],
  },
  {
    id: 'yaFeedStore', name: '사료 창고', price: 0, w: 2, h: 2, icon: '🐟', color: '#90a4ae', category: 'skill', unlisted: true,
    interactions: [job('yaFillFeeder', '사료 포대 부어 급이기 채우기', '🐟', 20, { energy: -0.12 }, 'fitness', 130)],
  },
  {
    id: 'yaPump', name: '펌프실', price: 0, w: 3, h: 2, icon: '🔧', color: '#546e7a', category: 'skill', unlisted: true,
    interactions: [job('yaCheckPump', '펌프 돌아보고 여과기 닦기', '🔧', 25, { hygiene: -0.08 }, 'handiness', 120)],
  },
  {
    id: 'yaHatchery', name: '치어 부화 선반', price: 0, w: 3, h: 1, icon: '🐠', color: '#607d8b', category: 'skill', unlisted: true,
    interactions: [job('yaTendFry', '치어 세어 보고 약한 치어 솎기', '🐠', 20, { fun: 0.03 }, 'science', 130)],
  },
  {
    id: 'yaGrade', name: '선별대', price: 0, w: 3, h: 1, icon: '🐟', color: '#90a4ae', category: 'skill', unlisted: true,
    interactions: [job('yaGradeFish', '크기별로 치어 선별하기', '🐟', 20, { hygiene: -0.05 }, 'fishing', 110)],
  },
  {
    id: 'yaShip', name: '포장·얼음 작업대', price: 0, w: 3, h: 1, icon: '🧊', color: '#b0bec5', category: 'skill', unlisted: true,
    interactions: [job('yaPackIce', '얼음 채워 출하 상자 포장하기', '🧊', 20, { energy: -0.1 }, 'fitness', 140)],
  },
  {
    id: 'yaVisit', name: '체험 수조', price: 0, w: 3, h: 1, icon: '🐚', color: '#a1785a', category: 'skill', unlisted: true,
    interactions: [job('yaTidyVisit', '체험 수조 정리하기', '🐚', 15, { fun: 0.03 }, 'charisma', 150)],
  },
  // A 육상 수조식 farm at its real size (2026-11-05, the layout audit, replacing tanks the size of an aquarium in an open yard):
  // the round concrete grow-out tank of the 양식동 (6–10 m across; a man walks its rim to feed), its auto-feeder on a bridge;
  // the seawater intake out into the sea; the 선별·출하장's roof; the 활어차 backed up to it.
  { id: 'yaGrowTank', name: '넙치 육성 수조', price: 0, w: 4, h: 4, icon: '🐟', color: '#c7c4ba', category: 'decor', unlisted: true, interactions: [] },
  { id: 'yaIntake', name: '해수 취수관', price: 0, w: 1, h: 1, icon: '🌊', color: '#2e7bb8', category: 'decor', unlisted: true, interactions: [] },
  { id: 'yaCanopy', name: '선별·출하장 지붕', price: 0, w: 7, h: 3, icon: '🐟', color: '#90a4ae', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'yaLiveTruck', name: '활어 운반차', price: 0, w: 2, h: 4, icon: '🚚', color: '#eceff1', category: 'decor', unlisted: true, interactions: [] },
];
