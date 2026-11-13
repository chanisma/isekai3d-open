import type { InteractionDef, ObjectDef } from '../types';

/**
 * The 반도체 팹 (2026-11-01, a new career and workplace at the user's request): a gowning bench and an air shower, a
 * yellow-lit photo bay with its scanner, coater and reticles, an overhead FOUP rail, a wafer-handling robot, a row of etch and
 * deposition tools, a wet bench, a defect-review microscope, a yield board and a chemical and gas room. Wafers travel
 * through it all. Drawn in view3d/workplaces/semiconductor.ts (with semiconductorMotion.ts). The company is made up.
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
  { id: 'fbGownBench', name: '방진복 갱의대', price: 0, w: 2, h: 1, icon: '👕', color: '#eceff1', category: 'skill', unlisted: true, interactions: [job('fbGown', '방진복 입고 거울로 점검하기', '👕', 18, { fun: -0.03 }, 'logic', 170)] },
  // Walked through: the tile of the only way into the cleanroom (a booth with the next tile, a door at each end).
  { id: 'fbAirShower', name: '에어샤워', price: 0, w: 1, h: 1, icon: '💨', color: '#b0bec5', category: 'skill', unlisted: true, walkable: true, interactions: [job('fbShower', '에어샤워 통과하기', '💨', 16, { fun: 0.03 }, 'logic', 190)] },
  {
    id: 'fbLitho', name: '노광 장비', price: 0, w: 3, h: 2, icon: '💡', color: '#f5f5f5', category: 'skill', unlisted: true,
    interactions: [job('fbExpose', '웨이퍼 노광하기', '💡', 30, { fun: -0.03 }, 'logic', 90), job('fbReticle', '레티클 교체하기', '💿', 22, { energy: -0.05 }, 'logic', 130)],
  },
  { id: 'fbCoater', name: '감광액 코터', price: 0, w: 2, h: 1, icon: '💧', color: '#cfd8dc', category: 'skill', unlisted: true, interactions: [job('fbCoat', '감광액 코팅하기', '💧', 25, { fun: -0.03 }, 'logic', 110)] },
  { id: 'fbFoupRail', name: '웨이퍼 운반 레일', price: 0, w: 5, h: 1, icon: '🚚', color: '#90a4ae', category: 'skill', unlisted: true, interactions: [job('fbFoup', '웨이퍼 통 입고 확인하기', '📦', 20, { fun: -0.03 }, 'programming', 150)] },
  { id: 'fbWaferRobot', name: '웨이퍼 운반 로봇', price: 0, w: 2, h: 2, icon: '🤖', color: '#78909c', category: 'skill', unlisted: true, interactions: [job('fbTeach', '운반 로봇 위치 맞추기', '🤖', 28, { fun: 0.03 }, 'programming', 100)] },
  {
    id: 'fbEtchRow', name: '식각·증착 장비', price: 0, w: 3, h: 1, icon: '🌀', color: '#b0bec5', category: 'skill', unlisted: true,
    interactions: [job('fbRecipe', '식각 레시피 조정하기', '⌨️', 30, { fun: -0.03 }, 'programming', 90), job('fbChamber', '챔버 열고 세정하기', '🧽', 25, { energy: -0.08 }, 'logic', 130)],
  },
  { id: 'fbWetBench', name: '웨트 세정대', price: 0, w: 2, h: 1, icon: '🫧', color: '#b2dfdb', category: 'skill', unlisted: true, interactions: [job('fbWet', '웨이퍼 세정하기', '🫧', 24, { energy: -0.05 }, 'logic', 130)] },
  { id: 'fbMicroscope', name: '불량 검사 현미경', price: 0, w: 2, h: 1, icon: '🔬', color: '#37474f', category: 'skill', unlisted: true, interactions: [job('fbDefect', '현미경으로 불량 검사하기', '🔬', 30, { fun: -0.03 }, 'logic', 90)] },
  {
    id: 'fbYieldBoard', name: '수율 회의 보드', price: 0, w: 3, h: 1, icon: '📊', color: '#455a64', category: 'skill', unlisted: true,
    interactions: [
      job('fbYield', '수율 회의하기', '📊', 30, { social: 0.25 }, 'logic', 100),
      { ...job('fbYieldAlarm', '수율 급락 원인 좁히기', '📉', 40, { energy: -0.15 }, 'logic', 60), requires: 'workAlarm' },
    ],
  },
  { id: 'fbChemCabinet', name: '가스·약액 캐비닛', price: 0, w: 3, h: 1, icon: '🧪', color: '#f9a825', category: 'skill', unlisted: true, interactions: [job('fbGas', '가스·약액 점검하기', '🧪', 22, { fun: -0.03 }, 'logic', 130)] },
  { id: 'fbStocker', name: '웨이퍼 보관 선반', price: 0, w: 2, h: 1, icon: '📦', color: '#90a4ae', category: 'decor', unlisted: true, interactions: [] },
  { id: 'fbReticleRack', name: '레티클 보관함', price: 0, w: 1, h: 1, icon: '💿', color: '#78909c', category: 'decor', unlisted: true, interactions: [] },
  { id: 'fbAmberBank', name: '노광실 노란 조명', price: 0, w: 1, h: 1, icon: '💡', color: '#ffb300', category: 'decor', unlisted: true, interactions: [] },
  { id: 'fbSpillStation', name: '비상 세안기', price: 0, w: 1, h: 1, icon: '🚿', color: '#43a047', category: 'decor', unlisted: true, interactions: [] },
  { id: 'fbStickyMat', name: '점착 매트', price: 0, w: 1, h: 1, icon: '🧼', color: '#90caf9', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'fbFabSign', name: '팹 입구 안내판', price: 0, w: 1, h: 1, icon: '📋', color: '#1a237e', category: 'decor', unlisted: true, interactions: [] },
  // Outside (2026-11-05, the layout audit): the site's security gate by the way in, the bulk gas tank and the exhaust scrubber
  // by the gas room's own outside door, and the warning sign on that door.
  { id: 'fbSiteGate', name: '보안 게이트·경비실', price: 0, w: 2, h: 1, icon: '📋', color: '#1f2d5c', category: 'decor', unlisted: true, interactions: [] },
  { id: 'fbGasYard', name: '가스 탱크·배기 스크러버', price: 0, w: 2, h: 2, icon: '🛢️', color: '#cfd8dc', category: 'decor', unlisted: true, interactions: [] },
  { id: 'fbGasWarning', name: '가스실 경고 표지', price: 0, w: 1, h: 1, icon: '⚠️', color: '#ffb300', category: 'decor', unlisted: true, interactions: [] },
];
