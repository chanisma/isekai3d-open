import type { InteractionDef, ObjectDef } from '../types';

/**
 * The furniture of the 스마트팜 (2026-11-01, a new career at the user's request): 층층잎팜, a made-up indoor
 * vertical farm. Stacked LED racks of lettuce and strawberries at different stages, low trial beds, the
 * environment-control desk, the nutrient dosing unit with its live EC/pH, the seedling chamber and the
 * sowing bench, the packing table, the cold store, the production plan board and the clean entry. Drawn
 * in view3d/workplaces/smartFarmer.ts (with smartFarmerMotion.ts).
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
    id: 'vfLettuceRack', name: '상추 수직 재배 선반', price: 0, w: 3, h: 1, icon: '🥬', color: '#66bb6a', category: 'skill', unlisted: true,
    interactions: [
      job('vfInspectLeaves', '잎 상태 살피고 기록하기', '🔍', 20, { fun: 0.05 }, 'gardening', 120),
      job('vfHarvestLettuce', '다 자란 상추 수확하기', '✂️', 25, { energy: -0.1 }, 'gardening', 120),
    ],
  },
  {
    id: 'vfBerryRack', name: '딸기 수직 재배 선반', price: 0, w: 3, h: 1, icon: '🌿', color: '#e53935', category: 'skill', unlisted: true,
    interactions: [
      job('vfPollinate', '딸기꽃 붓으로 수분하기', '🖌️', 20, { fun: 0.1 }, 'gardening', 120),
      job('vfPickBerry', '익은 딸기 따기', '🌿', 25, { fun: 0.05 }, 'gardening', 120),
    ],
  },
  {
    id: 'vfLowBed', name: '시험 재배 베드', price: 0, w: 3, h: 1, icon: '🌿', color: '#81c784', category: 'skill', unlisted: true,
    interactions: [job('vfCleanGutter', '양액 수로 청소하기', '🧽', 20, { energy: -0.1 }, 'gardening', 140)],
  },
  {
    id: 'vfEnvConsole', name: '환경 제어 콘솔', price: 0, w: 2, h: 1, icon: '📈', color: '#00897b', category: 'skill', unlisted: true,
    interactions: [job('vfSetClimate', '온도·CO₂·조명 설정 조정하기', '📈', 30, { fun: -0.05 }, 'programming', 110)],
  },
  {
    id: 'vfDoser', name: '양액기', price: 0, w: 3, h: 1, icon: '⚗️', color: '#1976d2', category: 'skill', unlisted: true,
    interactions: [
      job('vfMixNutrient', '양액 배합하기', '⚗️', 25, { fun: 0.05 }, 'gardening', 110),
      job('vfCalibrate', 'EC·pH 센서 교정하기', '🧪', 20, { fun: -0.05 }, 'programming', 120),
      { id: 'vfFixNutrient', label: '양액·온도 장애 잡기', icon: '🚨', duration: 40, effects: { energy: -0.15 }, skill: { key: 'gardening', rate: 1 / 60 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'vfSeedChamber', name: '육묘 챔버', price: 0, w: 2, h: 1, icon: '🌱', color: '#c8e6c9', category: 'skill', unlisted: true,
    interactions: [job('vfMoveSeedlings', '자란 모종판 꺼내 옮기기', '🌱', 20, { energy: -0.05 }, 'gardening', 130)],
  },
  {
    id: 'vfSowBench', name: '파종대', price: 0, w: 2, h: 1, icon: '🫘', color: '#a1887f', category: 'skill', unlisted: true,
    interactions: [job('vfSow', '스펀지 판에 씨앗 파종하기', '🌱', 25, { fun: 0.05 }, 'gardening', 120)],
  },
  {
    id: 'vfPackTable', name: '수확·포장대', price: 0, w: 3, h: 1, icon: '📦', color: '#90a4ae', category: 'skill', unlisted: true,
    interactions: [
      job('vfPackBox', '무게 달아 채소 포장하기', '📦', 25, { energy: -0.05 }, 'handiness', 140),
      job('vfBrix', '딸기 당도 재기', '🌿', 15, { fun: 0.05 }, 'science', 130),
    ],
  },
  {
    id: 'vfColdStore', name: '저온 저장고', price: 0, w: 2, h: 1, icon: '🧊', color: '#b0bec5', category: 'skill', unlisted: true,
    interactions: [job('vfStockCold', '포장 상자 저온 입고하기', '🧊', 15, { energy: -0.1 }, 'fitness', 160)],
  },
  {
    id: 'vfPlanBoard', name: '생산 계획판', price: 0, w: 2, h: 1, icon: '🗓️', color: '#546e7a', category: 'skill', unlisted: true,
    interactions: [job('vfPlanHarvest', '주간 수확 계획 짜기', '🗓️', 25, { fun: -0.05 }, 'logic', 120)],
  },
  {
    id: 'vfCleanEntry', name: '위생 전실', price: 0, w: 3, h: 1, icon: '🧼', color: '#e0f2f1', category: 'skill', unlisted: true,
    interactions: [job('vfGownUp', '위생복 입고 손·장화 소독하기', '🧼', 15, { hygiene: 0.1 }, 'gardening', 200)],
  },
  { id: 'vfFarmSign', name: '견학 안내판', price: 0, w: 2, h: 1, icon: '🌱', color: '#a5d6a7', category: 'decor', unlisted: true, interactions: [] },
];
