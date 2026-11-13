import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 조경 공사 현장 (2026-11-01 workplace pipeline, at the user's request): what a landscaping
 * site has besides its beds and mowers. A paving area with its edging stones, a yard of root-balled trees and a
 * pit to plant in, a small excavator, survey stakes and a level, the safety board the crew gather at, the site
 * office container, a steel tool cage and the aggregate bays. Drawn in view3d/workplaces/manualLabor.ts (with
 * manualLaborMotion.ts).
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
    id: 'mlPavingBed', name: '보도 포장 구역', price: 0, w: 3, h: 2, icon: '🧱', color: '#a65f47', category: 'skill', unlisted: true,
    interactions: [job('mlLayPaving', '경계석·보도블록 깔기', '🧱', 30, { energy: -0.2, hygiene: -0.15 }, 'handiness', 100)],
  },
  {
    id: 'mlTreeYard', name: '묘목 야적장', price: 0, w: 3, h: 1, icon: '🌳', color: '#4f8f3a', category: 'skill', unlisted: true,
    interactions: [job('mlPlantTree', '뿌리분 나무 심고 지주 세우기', '🌳', 35, { energy: -0.25, hygiene: -0.2 }, 'gardening', 90)],
  },
  {
    id: 'mlExcavator', name: '소형 굴착기', price: 0, w: 3, h: 3, icon: '🚜', color: '#f9c22e', category: 'skill', unlisted: true,
    interactions: [job('mlDigTrench', '굴착기로 터파기', '🚜', 30, { energy: -0.1, fun: 0.1 }, 'handiness', 110)],
  },
  {
    id: 'mlSurveyLine', name: '측량 말뚝과 수평 줄', price: 0, w: 3, h: 1, icon: '📏', color: '#ff4081', category: 'skill', unlisted: true,
    interactions: [job('mlStakeOut', '말뚝 박고 수평 맞추기', '📏', 20, { energy: -0.05 }, 'logic', 130)],
  },
  {
    id: 'mlSafetyBoard', name: '안전 게시판', price: 0, w: 2, h: 1, icon: '🦺', color: '#1b8a4c', category: 'skill', unlisted: true,
    interactions: [job('mlToolboxTalk', '작업 전 안전 회의하기', '🦺', 15, { social: 0.25 }, 'leadership', 150)],
  },
  {
    id: 'mlSiteOffice', name: '현장 사무소', price: 0, w: 4, h: 2, icon: '📋', color: '#2f6db0', category: 'skill', unlisted: true,
    interactions: [job('mlDailyLog', '도면 보고 작업 일보 쓰기', '📋', 20, { fun: -0.05 }, 'logic', 150)],
  },
  {
    id: 'mlToolCrib', name: '공구 보관함', price: 0, w: 2, h: 1, icon: '🔨', color: '#546e7a', category: 'skill', unlisted: true,
    interactions: [job('mlCheckTools', '삽 날 갈고 공구 점검하기', '🔨', 20, { energy: -0.05 }, 'handiness', 130)],
  },
  {
    id: 'mlSoilHeap', name: '골재·토사 더미', price: 0, w: 3, h: 1, icon: '🪨', color: '#9a9a94', category: 'skill', unlisted: true,
    interactions: [job('mlShovelGravel', '자갈 삽질해 체 치기', '🪨', 25, { energy: -0.25, hygiene: -0.2 }, 'fitness', 90)],
  },
  // The site's hoarding and fence with the gate and its wheel wash (2026-11-04, the layout audit): anchored at the lot's corner tile,
  // drawn round the whole site.
  { id: 'mlSiteFence', name: '공사 가림막·출입구', price: 0, w: 1, h: 1, icon: '🚧', color: '#2e7d32', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
];
