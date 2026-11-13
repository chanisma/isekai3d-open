import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 재활센터 (2026-10-27 workplace pipeline, at the user's request): what a Korean
 * rehabilitation centre's 운동치료실 and 물리치료실 have besides the treatment tables, the walking bars
 * and the gym balls — the 늑목 stall bars with the coloured resistance bands, the training stairs
 * (계단 보행 훈련대), the modality corner (the ultrasound / 간섭파 ICT cart and the patient's leaning
 * stool), the hot-pack heater (핫팩 가온기), and a skeleton model for explaining an injury. Drawn in
 * view3d/workplaces/physicalTherapist.ts (with physicalTherapistMotion.ts).
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
    id: 'ptStallBars', name: '늑목 · 탄력 밴드 벽', price: 0, w: 2, h: 1, icon: '🪜', color: '#c8a26b', category: 'skill', unlisted: true,
    interactions: [job('ptBandExercise', '탄력 밴드 운동 지도하기', '🪢', 25, { energy: -0.1 }, 'fitness', 110)],
  },
  {
    id: 'ptStairs', name: '계단 보행 훈련대', price: 0, w: 3, h: 1, icon: '🪜', color: '#a1887f', category: 'skill', unlisted: true,
    interactions: [job('ptStairTraining', '계단 오르내리기 훈련', '🦯', 25, { energy: -0.15 }, 'fitness', 100)],
  },
  {
    id: 'ptModality', name: '물리치료기 코너', price: 0, w: 2, h: 1, icon: '⚡', color: '#5c6bc0', category: 'skill', unlisted: true,
    interactions: [
      job('ptUltrasound', '초음파 치료하기', '🧴', 20, { fun: -0.03 }, 'medicine', 120),
      job('ptIct', '간섭파(ICT) 치료 걸기', '⚡', 15, { fun: -0.03 }, 'logic', 140),
    ],
  },
  {
    id: 'ptHotPack', name: '핫팩 가온기', price: 0, w: 1, h: 1, icon: '♨️', color: '#b0bec5', category: 'skill', unlisted: true,
    interactions: [job('ptPrepHotPack', '핫팩 꺼내 준비하기', '♨️', 10, { hygiene: -0.03 }, 'logic', 180)],
  },
  { id: 'ptSkeleton', name: '인체 골격 모형', price: 0, w: 1, h: 1, icon: '💀', color: '#efe6d2', category: 'decor', unlisted: true, interactions: [] },
  // The clinic as it is (2026-11-05, the layout audit): the curtain on its rail between two treatment beds, so a patient is treated out
  // of the next one's sight (the 한의원's beds have them too), and the clinic's pole sign on the pavement.
  { id: 'ptCurtain', name: '베드 사이 커튼', price: 0, w: 1, h: 2, icon: '🛏️', color: '#9fd3c7', category: 'decor', unlisted: true, interactions: [] },
  { id: 'ptStreetSign', name: '재활의학과 간판', price: 0, w: 1, h: 1, icon: '🪧', color: '#00838f', category: 'decor', unlisted: true, interactions: [] },
];
