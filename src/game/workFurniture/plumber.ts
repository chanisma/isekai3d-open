import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 설비 업체 (2026-11-01 workplace pipeline, at the user's request): what a plumbing and
 * heating contractor has besides its benches and boilers. A rack of pipe, a threading machine, a mock-up wall of
 * pipes and valves with a joint that weeps, a clear drain run with a spring machine and camera, a tiled corner
 * with this workplace's own training toilet and basin (the house's aren't touched), and a parts counter.
 * Drawn in view3d/workplaces/plumber.ts (with plumberMotion.ts).
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
    id: 'pbPipeRack', name: '파이프 랙', price: 0, w: 2, h: 1, icon: '🔧', color: '#0d3f7a', category: 'skill', unlisted: true,
    interactions: [job('pbPickPipe', '자재 골라 치수 재기', '📏', 15, { fun: -0.05 }, 'handiness', 160)],
  },
  {
    id: 'pbThreader', name: '나사 절삭기', price: 0, w: 2, h: 1, icon: '🔩', color: '#d84315', category: 'skill', unlisted: true,
    interactions: [job('pbThreadPipe', '배관 나사 내기', '🔩', 25, { energy: -0.1 }, 'handiness', 100)],
  },
  {
    id: 'pbLeakWall', name: '뜯어 낸 욕실 벽(배관)', price: 0, w: 3, h: 1, icon: '💧', color: '#c8b690', category: 'skill', unlisted: true,
    interactions: [
      job('pbFindLeak', '샌 이음 찾아 조이기', '💧', 25, { energy: -0.05 }, 'handiness', 110),
      job('pbPressureTest', '수압 시험하기', '🧾', 20, { fun: -0.05 }, 'logic', 130),
    ],
  },
  {
    id: 'pbDrainRig', name: '싱크대 배수구', price: 0, w: 2, h: 1, icon: '🚿', color: '#607d8b', category: 'skill', unlisted: true,
    interactions: [
      job('pbSnakeDrain', '막힌 배수관 뚫기', '🚿', 25, { energy: -0.1, hygiene: -0.15 }, 'handiness', 100),
      job('pbCameraDrain', '내시경으로 배관 살피기', '📷', 20, { fun: 0.03 }, 'logic', 130),
    ],
  },
  {
    id: 'pbFixtureRig', name: '변기·수전', price: 0, w: 2, h: 1, icon: '🚿', color: '#eaf0f1', category: 'skill', unlisted: true,
    interactions: [
      job('pbFixToilet', '변기 부속 갈아 끼우기', '🔧', 25, { hygiene: -0.1 }, 'handiness', 110),
      job('pbFixFaucet', '수전 카트리지 교체하기', '🚿', 20, { fun: -0.03 }, 'handiness', 120),
    ],
  },
  {
    id: 'pbCounter', name: '부품 카운터', price: 0, w: 3, h: 1, icon: '⚙️', color: '#1565c0', category: 'skill', unlisted: true,
    interactions: [job('pbServeParts', '손님에게 맞는 부품 찾아 주기', '⚙️', 20, { social: 0.2 }, 'charisma', 140)],
  },
];
