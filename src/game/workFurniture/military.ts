import type { InteractionDef, ObjectDef } from '../types';

/**
 * The 군 기지's training ground (2026-11-02): a firing range with paper targets, a sentry post, a march's staging point inside the gate
 * (the march goes out of the base, 2026-11-03) and a maintenance bench. Training only, and the unit and everything on its signs are made up. Drawn in view3d/workplaces/military.ts (with
 * militaryMotion.ts). 사격 훈련, 군장 행군, 경계 근무 and 소총 분해 결합 go on these from workExtra.ts, taking skill and needs from the use here.
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
  { id: 'miBaseGround', name: '부대 마당', price: 0, w: 15, h: 16, icon: '🚩', color: '#b8a97f', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'miFiringRange', name: '사격장', price: 0, w: 2, h: 10, icon: '🎯', color: '#8d9a6a', category: 'skill', unlisted: true, interactions: [job('miZeroRifle', '영점 사격 조정하기', '🎯', 30, { energy: -0.08, fun: 0.05 }, 'fitness', 110)] },
  { id: 'miGuardPost', name: '초소', price: 0, w: 2, h: 1, icon: '🔦', color: '#6b7a4a', category: 'skill', unlisted: true, interactions: [job('miPostHandover', '초소 근무 교대하기', '📋', 30, { energy: -0.05, social: 0.1 }, 'logic', 130)] },
  { id: 'miMarchRoute', name: '행군 집결지', price: 0, w: 3, h: 1, icon: '🎒', color: '#a39b7a', category: 'skill', unlisted: true, interactions: [job('miCheckRuck', '군장 결속 점검하기', '🎒', 30, { energy: -0.2, hygiene: -0.1 }, 'fitness', 90)] },
  { id: 'miMaintBench', name: '정비 작업대', price: 0, w: 2, h: 1, icon: '🔧', color: '#5f6b4c', category: 'skill', unlisted: true, interactions: [job('miCleanRifle', '총기 수입하기', '🔧', 30, { fun: -0.03 }, 'handiness', 110)] },
  // 2026-11-05, the layout audit: the company's 무기고 (the locked rifle racks, the ledger signed for each one taken out) and the 생활관's
  // 관물대, one by each bed.
  { id: 'miArmsRack', name: '총기함', price: 0, w: 2, h: 1, icon: '🔒', color: '#4f5845', category: 'decor', unlisted: true, interactions: [] },
  { id: 'miBunkLocker', name: '관물대', price: 0, w: 1, h: 1, icon: '🗄️', color: '#7b5b39', category: 'decor', unlisted: true, interactions: [] },
];
