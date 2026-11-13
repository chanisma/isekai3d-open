import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 영화 촬영장 (2026-10-31 workplace pipeline, at the user's request): what a shoot
 * has around its set and camera, seen from the actor's side: the tent where the takes are watched with
 * the director, the row of cast chairs where the waiting is done, the costume rail with its fitter, the
 * folding chair where an artist touches you up between takes, and a green-screen corner. Drawn in
 * view3d/workplaces/actor.ts (with actorMotion.ts).
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
    id: 'acVillage', name: '비디오 빌리지', price: 0, w: 2, h: 1, icon: '🖥️', color: '#37474f', category: 'skill', unlisted: true,
    interactions: [job('acWatchTake', '감독과 테이크 확인하기', '🖥️', 20, { fun: 0.1 }, 'charisma', 120)],
  },
  {
    id: 'acCastChairs', name: '배우 대기 의자', price: 0, w: 3, h: 1, icon: '🪑', color: '#6d4c41', category: 'skill', unlisted: true,
    interactions: [job('acWaitLines', '대기하며 대사 외우기', '📖', 25, { energy: 0.1 }, 'charisma', 110)],
  },
  {
    id: 'acCostume', name: '의상 피팅 코너', price: 0, w: 2, h: 1, icon: '🧥', color: '#8d6e63', category: 'skill', unlisted: true,
    interactions: [{ id: 'acCostumeFit', label: '의상 피팅 받기', icon: '🧥', duration: 15, effects: { fun: 0.1 }, requires: 'atWork', pose: 'front' }],
  },
  {
    id: 'acTouchUp', name: '현장 분장 의자', price: 0, w: 1, h: 1, icon: '💺', color: '#455a64', category: 'skill', unlisted: true,
    interactions: [{ id: 'acTouchUpMakeup', label: '현장 분장 수정 받기', icon: '💄', duration: 15, effects: { fun: 0.1, hygiene: 0.1 }, requires: 'atWork', pose: 'front' }],
  },
  {
    id: 'acGreen', name: '그린 스크린', price: 0, w: 3, h: 2, icon: '🎭', color: '#43a047', category: 'skill', unlisted: true,
    interactions: [job('acGreenFight', '그린 스크린 앞에서 괴수와 싸우기', '🎭', 30, { fun: 0.25, energy: -0.2 }, 'charisma', 90)],
  },
  // The yard and the gate (2026-11-05, the layout audit): the actors' vans, the lighting and grip truck at the stage's loading door,
  // the 밥차 that feeds the unit at lunch, and the line at the gate where the fans wait. Set dressing.
  { id: 'acStarVan', name: '배우 대기 차량', price: 0, w: 2, h: 1, icon: '🚐', color: '#212121', category: 'decor', unlisted: true, interactions: [] },
  { id: 'acGripTruck', name: '조명·그립 장비 트럭', price: 0, w: 2, h: 1, icon: '🚚', color: '#eceff1', category: 'decor', unlisted: true, interactions: [] },
  { id: 'acFoodTruck', name: '촬영장 밥차', price: 0, w: 2, h: 1, icon: '🍱', color: '#ffb300', category: 'decor', unlisted: true, interactions: [] },
  { id: 'acFanLine', name: '정문 앞 팬 대기선', price: 0, w: 2, h: 1, icon: '🚧', color: '#ffeb3b', category: 'decor', unlisted: true, interactions: [] },
];
