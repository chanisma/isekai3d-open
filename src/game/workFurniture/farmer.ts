import type { InteractionDef, ObjectDef } from '../types';

const job = (id: string, label: string, icon: string, key: NonNullable<InteractionDef['skill']>['key'], duration = 30): InteractionDef => ({
  id, label, icon, duration, requires: 'atWork', pose: 'front',
  effects: { fun: 0.12, energy: -0.06 }, skill: { key, rate: 1 / 100 },
});

/** 해솔밭 is printed on produce and equipment; the workplace remains 농장. */
export const OBJECTS: ObjectDef[] = [
  { id: 'fmGreenhouse', name: '육묘 비닐하우스', price: 0, w: 3, h: 2,
    icon: '🌱', color: '#b7d6bb', category: 'skill', unlisted: true,
    interactions: [job('fmSowTray', '육묘 트레이에 파종하기', '🌱', 'gardening')] },
  { id: 'fmCompost', name: '낙엽 퇴비함', price: 0, w: 2, h: 1,
    icon: '🌱', color: '#8a6a45', category: 'skill', unlisted: true,
    interactions: [job('fmTurnCompost', '퇴비 뒤집고 온도 재기', '🌱', 'gardening')] },
  { id: 'fmWaterTank', name: '관수 탱크와 펌프', price: 0, w: 2, h: 1,
    icon: '💧', color: '#76a7ac', category: 'skill', unlisted: true,
    interactions: [job('fmIrrigate', '점적 관수 점검하기', '💧', 'handiness')] },
  { id: 'fmPepperRack', name: '고추 건조대', price: 0, w: 2, h: 1,
    icon: '☀️', color: '#c85f45', category: 'skill', unlisted: true,
    interactions: [job('fmDryPeppers', '고추 뒤집어 말리기', '☀️', 'gardening')] },
  { id: 'fmToolShed', name: '농기구 보관대', price: 0, w: 2, h: 1,
    icon: '🛠️', color: '#7e9270', category: 'decor', unlisted: true, interactions: [] },
  // A 단동 비닐하우스 at its real size (2026-11-05, the layout audit, replacing a cold frame the size of a flower box): walked into,
  // the beds inside it are pieces of their own.
  { id: 'fmPolyHouse', name: '비닐하우스', price: 0, w: 5, h: 11,
    icon: '🌱', color: '#dfeee4', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
];
