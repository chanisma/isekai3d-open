import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 약국 (2026-11-01 workplace pipeline, at the user's request): what a neighbourhood
 * pharmacy has besides a counter and shelves. The wall of pill drawers, an automatic packer that prints its
 * sachets, a compounding bench with an ointment slab, a medicine fridge and a terminal for checking clashes in the
 * dispensary; a wall of over-the-counter medicines, the rest of the long counter, a blood-pressure chair and a
 * bench on the shop floor; the wholesaler's cartons in the stock room. Drawn in view3d/workplaces/pharmacist.ts
 * (with pharmacistMotion.ts). All drug names are made up.
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
  { id: 'rxDrawerWall', name: '약장', price: 0, w: 3, h: 1, icon: '🗄️', color: '#f4f6f6', category: 'skill', unlisted: true, interactions: [job('rxFillDrawers', '약장 서랍 채우기', '🗄️', 15, { fun: -0.05 }, 'logic', 170)] },
  { id: 'rxPacker', name: '자동 조제 포장기', price: 0, w: 2, h: 1, icon: '💊', color: '#cfd8dc', category: 'skill', unlisted: true, interactions: [job('rxRunPacker', '자동 포장기로 약 포장하기', '💊', 25, { fun: -0.05 }, 'logic', 110)] },
  { id: 'rxCompoundBench', name: '연고 조제대', price: 0, w: 2, h: 1, icon: '⚗️', color: '#eceff1', category: 'skill', unlisted: true, interactions: [job('rxMixOintment', '연고 섞어 조제하기', '⚗️', 25, { fun: -0.05 }, 'logic', 100)] },
  { id: 'rxMedFridge', name: '의약품 냉장고', price: 0, w: 1, h: 1, icon: '🧊', color: '#e3f2fd', category: 'skill', unlisted: true, interactions: [job('rxCheckFridge', '냉장 온도 기록·약품 확인하기', '🌡️', 15, { fun: -0.05 }, 'logic', 180)] },
  { id: 'rxCheckTerminal', name: '처방 조회 단말', price: 0, w: 1, h: 1, icon: '💻', color: '#90a4ae', category: 'skill', unlisted: true, interactions: [job('rxLookupDrugs', '함께 먹으면 안 되는 약 조회하기', '💻', 20, { fun: -0.05 }, 'logic', 110)] },
  { id: 'rxOtcWall', name: '일반의약품 진열 벽', price: 0, w: 3, h: 1, icon: '🧴', color: '#43a047', category: 'skill', unlisted: true, interactions: [job('rxFaceOtc', '일반약 앞줄 맞추기', '🧴', 15, { fun: -0.05 }, 'logic', 200)] },
  { id: 'rxBpChair', name: '혈압 측정 의자', price: 0, w: 2, h: 1, icon: '🩺', color: '#00897b', category: 'skill', unlisted: true, interactions: [job('rxTakeBp', '손님 혈압 재 드리기', '🩺', 15, { social: 0.2 }, 'charisma', 150)] },
  { id: 'rxDelivery', name: '의약품 입고 상자', price: 0, w: 2, h: 1, icon: '📦', color: '#c79a6b', category: 'skill', unlisted: true, interactions: [job('rxCheckDelivery', '입고 의약품 검수하기', '📋', 20, { energy: -0.05 }, 'logic', 170)] },
  { id: 'rxCounterWing', name: '약 수령 창구', price: 0, w: 3, h: 1, icon: '🛍️', color: '#a5d6a7', category: 'decor', unlisted: true, interactions: [] },
  { id: 'rxWaitBench', name: '대기 의자', price: 0, w: 3, h: 1, icon: '🪑', color: '#80cbc4', category: 'decor', unlisted: true, interactions: [] },
  // The 제약 연구소's tablet press (2026-11-04, the branch lots): a single-punch press on its bench, the hopper of trial granules over the
  // die, the finished tablets dropping into a tray, the hardness tester beside it.
  { id: 'phTabletPress', name: '타정기', price: 0, w: 1, h: 1, icon: '⚙️', color: '#90a4ae', category: 'skill', unlisted: true, interactions: [job('phPressTablets', '시험약 정제 찍어 경도 재기', '⚙️', 30, { fun: -0.03 }, 'science', 100)] },
  // The pharmacy's pole sign on the pavement (2026-11-05, the layout audit): the green 약 lightbox every Korean street knows.
  { id: 'rxStreetSign', name: '약국 간판', price: 0, w: 1, h: 1, icon: '🪧', color: '#2e7d32', category: 'decor', unlisted: true, interactions: [] },
];
