import type { InteractionDef, ObjectDef } from '../types';

/**
 * The 태양광·풍력 발전 단지 (2026-11-01, a new career and workplace at the user's request), out of doors: rows of tilted panels washed
 * and scanned with a thermal camera, a full wind turbine at the back with its base door, a nacelle mock-up at ladder height, an inverter
 * room, a battery container, a control room whose wall follows the sun and wind, a weather mast and a substation kept at a distance.
 * Drawn in view3d/workplaces/greenEnergy.ts (with greenEnergyMotion.ts). The company is made up.
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
    id: 'geSolarRow', name: '태양광 패널 열', price: 0, w: 6, h: 2, icon: '☀️', color: '#16345c', category: 'skill', unlisted: true,
    interactions: [
      job('geWash', '패널 물청소하기', '🧽', 26, { energy: -0.08 }, 'handiness', 90),
      job('geScan', '열화상 카메라로 핫셀 찾기', '📷', 24, { fun: 0.03 }, 'logic', 90),
    ],
  },
  {
    id: 'geTurbine', name: '풍력 터빈', price: 0, w: 3, h: 2, icon: '🌀', color: '#eef1f3', category: 'skill', unlisted: true,
    interactions: [
      job('geDoor', '타워 문 열고 제어반 점검하기', '🚪', 24, { fun: -0.02 }, 'logic', 90),
      { ...job('geTyphoon', '태풍 전 터빈 설비 점검하기', '🌀', 40, { energy: -0.15 }, 'handiness', 60), requires: 'workAlarm' },
    ],
  },
  {
    id: 'geNacelleMock', name: '나셀 훈련 모형', price: 0, w: 5, h: 3, icon: '🪜', color: '#7d8a93', category: 'skill', unlisted: true,
    interactions: [
      job('geClimb', '안전대 걸고 사다리 오르기', '🪜', 26, { energy: -0.12 }, 'handiness', 100),
      job('geTorque', '토크 렌치로 볼트 조이기', '🔧', 26, { energy: -0.08 }, 'handiness', 80),
      job('geOil', '증속기 오일 점검하기', '🛢️', 22, { fun: -0.03 }, 'logic', 110),
    ],
  },
  {
    id: 'geInverterBank', name: '인버터실', price: 0, w: 4, h: 1, icon: '⚡', color: '#d7dde0', category: 'skill', unlisted: true,
    interactions: [
      job('geRead', '인버터 값 읽고 전류 재기', '⚡', 22, { fun: -0.02 }, 'logic', 90),
      job('geFilter', '인버터 냉각 필터 갈기', '🌀', 22, { energy: -0.05 }, 'handiness', 120),
    ],
  },
  {
    id: 'geBatteryBox', name: '배터리 저장 컨테이너', price: 0, w: 4, h: 2, icon: '🔌', color: '#eef1f3', category: 'skill', unlisted: true,
    interactions: [
      job('geVolts', '배터리 모듈 전압 재기', '🔌', 22, { fun: -0.03 }, 'logic', 90),
      job('geBms', '셀 균등 충전 돌리기', '📟', 22, { fun: -0.02 }, 'logic', 110),
    ],
  },
  {
    id: 'geControlDesk', name: '발전량 관제판', price: 0, w: 5, h: 2, icon: '📈', color: '#0a1520', category: 'skill', unlisted: true,
    interactions: [job('geDispatch', '내일 발전량 예측하고 출력 조정하기', '📈', 26, { fun: -0.03 }, 'logic', 80)],
  },
  { id: 'geMast', name: '기상 마스트', price: 0, w: 1, h: 1, icon: '🌀', color: '#c5c9cc', category: 'skill', unlisted: true, interactions: [job('geMast', '기상 기록계 읽고 일사계 닦기', '🌤️', 18, { fun: 0.02 }, 'logic', 150)] },
  { id: 'geSubstation', name: '변전 설비', price: 0, w: 5, h: 2, icon: '⚠️', color: '#7c8a78', category: 'skill', unlisted: true, interactions: [job('geFence', '울타리 밖에서 변전 설비 살피기', '👀', 18, { fun: -0.02 }, 'logic', 150)] },
  { id: 'gePpeRack', name: '안전 장구함', price: 0, w: 2, h: 1, icon: '⛑️', color: '#55616b', category: 'skill', unlisted: true, interactions: [job('geHarness', '안전대 점검하기', '⛑️', 18, { fun: -0.02 }, 'handiness', 150)] },
  // 2026-11-05, the layout audit: the ridge beyond with its far wind farm, and the site's mesh fence and gate, drawn from the north-west tile.
  { id: 'geRidge', name: '능선 풍력 단지·발전 단지 울타리', price: 0, w: 1, h: 1, icon: '🌲', color: '#869866', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'geGround', name: '발전 단지 바닥', price: 0, w: 16, h: 15, icon: '🌱', color: '#869866', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'geWashCart', name: '세척수 수레', price: 0, w: 2, h: 1, icon: '💧', color: '#68b5e8', category: 'decor', unlisted: true, interactions: [] },
  { id: 'geModulePallet', name: '예비 모듈 팔레트', price: 0, w: 2, h: 1, icon: '☀️', color: '#b5966b', category: 'decor', unlisted: true, interactions: [] },
  { id: 'geCableDrum', name: '케이블 드럼', price: 0, w: 1, h: 1, icon: '🧵', color: '#c5a26f', category: 'decor', unlisted: true, interactions: [] },
  { id: 'geSiteSign', name: '발전 단지 안내판', price: 0, w: 1, h: 1, icon: '📋', color: '#2e8b57', category: 'decor', unlisted: true, interactions: [] },
];
