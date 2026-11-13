import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 택시 차고지 (2026-10-27 workplace pipeline, at the user's request): what a
 * Korean 법인택시 depot has besides its cabs and the call terminal — the 배차실 창구 (the keys handed
 * out after the 음주 측정, the day's takings paid in), the yard's own LPG 충전기, the 커피 자판기 in
 * the drivers' 휴게실, the 운행일지 desk (the log written up, the 운행기록계 read), and the 유실물
 * 보관함 for what passengers leave in the back. The company (한빛운수) is made up. Drawn in
 * view3d/workplaces/taxiDriver.ts.
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
    id: 'txDispatchWindow', name: '배차실 창구', price: 0, w: 2, h: 1, icon: '🔑', color: '#546e7a', category: 'skill', unlisted: true,
    interactions: [
      job('txGetKeys', '음주 측정하고 배차 받기', '🔑', 15, { social: 0.1 }, 'driving', 150),
      job('txDepositFare', '운송수입금 입금하기', '💰', 15, { fun: -0.05 }, 'business', 140),
    ],
  },
  {
    id: 'txLpgPump', name: 'LPG 충전기', price: 0, w: 1, h: 1, icon: '⛽', color: '#1565c0', category: 'skill', unlisted: true,
    interactions: [job('txRefuelLpg', 'LPG 충전하기', '⛽', 15, { energy: -0.05 }, 'driving', 160)],
  },
  {
    id: 'txVending', name: '커피 자판기', price: 0, w: 1, h: 1, icon: '☕', color: '#c62828', category: 'skill', unlisted: true,
    interactions: [{ id: 'txVendCoffee', label: '자판기 커피 뽑기', icon: '☕', duration: 10, effects: { energy: 0.15, fun: 0.05 }, requires: 'atWork', pose: 'front' }],
  },
  {
    id: 'txLogDesk', name: '운행일지 책상', price: 0, w: 2, h: 1, icon: '📒', color: '#78909c', category: 'skill', unlisted: true,
    interactions: [
      job('txWriteLog', '운행일지 쓰기', '📒', 20, { fun: -0.05 }, 'logic', 130),
      job('txReadTacho', '운행기록계 확인하기', '📈', 20, { fun: -0.03 }, 'driving', 130),
    ],
  },
  {
    id: 'txLostShelf', name: '유실물 보관함', price: 0, w: 1, h: 1, icon: '🧳', color: '#8d6e63', category: 'skill', unlisted: true,
    interactions: [job('txLostItem', '유실물 등록하기', '🧳', 15, { social: 0.05 }, 'charisma', 150)],
  },
  // 2026-11-05, the layout audit (the yard redone as a paved 법인택시 차고지): the fence and gateway round the yard with the empty
  // bays' lines, the roof over the 정비·세차장, and the 택시 승강장 on the pavement where fares are picked up.
  { id: 'txYard', name: '차고지 울타리·주차선', price: 0, w: 1, h: 1, icon: '🅿️', color: '#90a4ae', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'txCanopy', name: '정비·세차장 지붕', price: 0, w: 1, h: 1, icon: '🔧', color: '#eceff1', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'txTaxiRank', name: '택시 승강장', price: 0, w: 1, h: 1, icon: '🚕', color: '#f9a825', category: 'decor', unlisted: true, interactions: [] },
];
