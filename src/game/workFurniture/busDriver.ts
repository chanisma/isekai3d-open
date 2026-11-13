import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 버스 차고지 (2026-10-27 workplace pipeline, at the user's request): what a
 * Seoul 시내버스 depot has besides its buses, the farebox settling counter, the route board and the
 * wash bay — the 배차실 window where a driver blows into the breathalyser before every run and signs
 * the 운행 일지, the CNG 충전기 (the buses run on gas), the 분실물 보관함 of what passengers leave
 * behind, the drivers' 안마의자 in the rest room, a rack of spare bus tyres and the 종점 stop at the
 * gate. Drawn in view3d/workplaces/busDriver.ts (with busDriverMotion.ts).
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
    id: 'bdDispatchWindow', name: '배차실 창구', price: 0, w: 2, h: 1, icon: '🚏', color: '#cfd8dc', category: 'skill', unlisted: true,
    interactions: [
      job('bdBreathTest', '운행 전 음주 측정하기', '😮‍💨', 10, { fun: -0.02 }, 'logic', 200),
      job('bdSignLog', '운행 일지 쓰기', '📒', 15, { fun: -0.05 }, 'logic', 150),
    ],
  },
  {
    id: 'bdCngPump', name: 'CNG 충전기', price: 0, w: 1, h: 1, icon: '⛽', color: '#1565c0', category: 'skill', unlisted: true,
    interactions: [job('bdFuelCng', 'CNG 충전하기', '⛽', 20, { energy: -0.05 }, 'handiness', 150)],
  },
  {
    id: 'bdLostFound', name: '분실물 보관함', price: 0, w: 2, h: 1, icon: '🧳', color: '#78909c', category: 'skill', unlisted: true,
    interactions: [job('bdLogLostItem', '분실물 정리하기', '🧳', 15, { social: 0.05 }, 'logic', 150)],
  },
  {
    id: 'bdAnmagi', name: '기사 휴게실 안마의자', price: 0, w: 1, h: 1, icon: '💆', color: '#efe7dc', category: 'skill', unlisted: true,
    // A break between runs, not the job (it isn't in the depot's work list).
    interactions: [{ id: 'bdRestAnma', label: '안마의자에서 쉬기', icon: '💆', duration: 20, effects: { energy: 0.3, fun: 0.15 }, requires: 'atWork', pose: 'front' }],
  },
  { id: 'bdTyreRack', name: '버스 타이어 보관대', price: 0, w: 2, h: 1, icon: '🛞', color: '#455a64', category: 'decor', unlisted: true, interactions: [] },
  { id: 'bdBusStop', name: '종점 버스 정류장', price: 0, w: 2, h: 1, icon: '🚏', color: '#1f6fd0', category: 'decor', unlisted: true, interactions: [] },
  // The yard as a 공영차고지's corner (2026-11-04, the layout audit): the bays' lines on the asphalt, the fence round it with the vehicle
  // gate and its guard booth, the canopy over the CNG pump. Flat and walked over; only drawn.
  { id: 'bdBayLines', name: '주차 칸 선', price: 0, w: 10, h: 12, icon: '🅿️', color: '#ffffff', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  // The fence stands on the lot's edges round the buildings, so it's held by its corner tile and drawn from there (26 × 15).
  { id: 'bdYardFence', name: '차고지 울타리·출입문', price: 0, w: 1, h: 1, icon: '🚧', color: '#90a4ae', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  // The garage's block walls, open at the front where the buses drive in (a wall between two outdoor stretches isn't drawn from the tiles).
  { id: 'bdGarageSide', name: '정비고 옆벽', price: 0, w: 1, h: 12, icon: '🧱', color: '#cfd2cc', category: 'decor', unlisted: true, interactions: [] },
  { id: 'bdGarageBack', name: '정비고 뒷벽', price: 0, w: 4, h: 1, icon: '🧱', color: '#cfd2cc', category: 'decor', unlisted: true, interactions: [] },
  { id: 'bdCngCanopy', name: 'CNG 충전소 캐노피', price: 0, w: 5, h: 4, icon: '⛽', color: '#eceff1', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
];
