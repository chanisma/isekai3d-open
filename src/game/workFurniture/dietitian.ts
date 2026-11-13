import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 단체급식실 (2026-10-27 workplace pipeline, at the user's request): what a
 * Korean school or company cafeteria kitchen has besides its 국솥, 배식대, menu desk, hygiene station
 * and store shelves — the 보존식 freezer where a spoonful of every dish is kept for 144 hours, the
 * 퇴식구 where trays come back and the 잔반 is weighed, the conveyor dishwasher with its 82℃ rinse, the
 * 오늘의 메뉴 sign with the allergy numbers, the long cafeteria tables, and the walk-in cold room's
 * door in the store. The school (햇살초등학교) is made up. Drawn in view3d/workplaces/dietitian.ts
 * (with dietitianMotion.ts).
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
    id: 'dtSampleFridge', name: '보존식 냉동고', price: 0, w: 1, h: 1, icon: '🧊', color: '#cfd8dc', category: 'skill', unlisted: true,
    interactions: [job('dtKeepSample', '보존식 채취해 보관하기', '🧊', 20, { fun: -0.05 }, 'science', 130)],
  },
  {
    id: 'dtTrayReturn', name: '퇴식구', price: 0, w: 2, h: 1, icon: '🍽️', color: '#b0bec5', category: 'skill', unlisted: true,
    interactions: [job('dtPlateWaste', '잔반량 조사하기', '⚖️', 20, { fun: -0.05, hygiene: -0.05 }, 'logic', 130)],
  },
  {
    id: 'dtDishwasher', name: '식판 세척기', price: 0, w: 2, h: 1, icon: '🫧', color: '#90a4ae', category: 'skill', unlisted: true,
    interactions: [job('dtWashCheck', '세척기 헹굼 온도 점검하기', '🌡️', 20, { hygiene: -0.05 }, 'science', 140)],
  },
  {
    id: 'dtMenuSign', name: '오늘의 메뉴 · 알레르기 표시판', price: 0, w: 1, h: 1, icon: '🪧', color: '#8bc34a', category: 'skill', unlisted: true,
    interactions: [job('dtPostMenu', '오늘의 메뉴 게시하기', '🪧', 10, { fun: 0.02 }, 'cooking', 150)],
  },
  { id: 'dtMealTable', name: '급식 테이블', price: 0, w: 2, h: 1, icon: '🍱', color: '#e0e0e0', category: 'decor', unlisted: true, interactions: [] },
  { id: 'dtColdRoom', name: '냉장 창고 문', price: 0, w: 1, h: 1, icon: '🚪', color: '#b3e5fc', category: 'decor', unlisted: true, interactions: [] },
  // The 급식실 laid out as it is (2026-11-04, the layout audit): the 검수실's inspection bench by the yard door, where every delivery is
  // weighed, probed and its dates and origin checked against the order before it comes in; the tray and spoon trolley at the hall's
  // door; the refrigerated truck that brings the morning's food.
  {
    id: 'dtInspectBench', name: '식재료 검수대', price: 0, w: 2, h: 1, icon: '⚖️', color: '#cfd6db', category: 'skill', unlisted: true,
    interactions: [job('dtInspectDelivery', '납품 식재료 검수하기', '🌡️', 25, { fun: -0.05 }, 'science', 130)],
  },
  { id: 'dtTrayStand', name: '식판 · 수저 카트', price: 0, w: 1, h: 1, icon: '🍽️', color: '#cfd6db', category: 'decor', unlisted: true, interactions: [] },
  { id: 'dtSupplyTruck', name: '식자재 납품 냉장 트럭', price: 0, w: 2, h: 4, icon: '🚚', color: '#f5f5f5', category: 'decor', unlisted: true, interactions: [] },
  // The hospital kitchen's meal cart (2026-11-04, the branch lots): a hot-and-cold tray trolley, its trays slid in by bed number with the
  // diet's card on each, wheeled up to the wards by lift. A late diet order for a patient going to theatre is caught at it.
  {
    id: 'hdMealCart', name: '온·냉 배식차', price: 0, w: 1, h: 1, icon: '🍱', color: '#b0bec5', category: 'skill', unlisted: true,
    interactions: [{ ...job('dtSwapTray', '바뀐 식이 처방대로 트레이 바꾸기', '🍱', 30, { energy: -0.1 }, 'cooking', 60), requires: 'workAlarm' }],
  },
];
