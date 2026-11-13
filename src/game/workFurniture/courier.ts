import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 택배 물류센터 (2026-10-27 workplace pipeline, at the user's request): what a
 * Korean parcel hub has besides its conveyors, roll cages, scanning desk, scale and 1톤 탑차 — the
 * 구역 분류 선반 (a cubby a delivery zone, boxes put in by the code on the label), a hand pallet jack
 * under a wrapped pallet of boxes, the 포장대 where a crushed box is repacked, the 반품 수거함, the
 * 배송 현황판 with each driver's progress (and the PDAs charging under it), and a 무인 택배함 bank in
 * the lobby. The courier company (날쌘택배) and its zones are made up. Drawn in
 * view3d/workplaces/courier.ts (with courierMotion.ts).
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
    id: 'cxZoneShelf', name: '구역 분류 선반', price: 0, w: 2, h: 1, icon: '🗄️', color: '#607d8b', category: 'skill', unlisted: true,
    interactions: [job('cxShelveZone', '구역 선반에 분류하기', '🗄️', 20, { energy: -0.15 }, 'fitness', 120)],
  },
  {
    id: 'cxPalletJack', name: '핸드 파레트 트럭', price: 0, w: 2, h: 1, icon: '🛒', color: '#f9a825', category: 'skill', unlisted: true,
    interactions: [job('cxMovePallet', '파레트 옮기기', '🛒', 20, { energy: -0.25 }, 'fitness', 100)],
  },
  {
    id: 'cxPackStation', name: '포장대', price: 0, w: 2, h: 1, icon: '📦', color: '#a1887f', category: 'skill', unlisted: true,
    interactions: [job('cxRepack', '파손 박스 재포장하기', '🩹', 20, { fun: -0.03 }, 'handiness', 120)],
  },
  {
    id: 'cxReturnsBin', name: '반품 수거함', price: 0, w: 1, h: 1, icon: '🔄', color: '#1e88e5', category: 'skill', unlisted: true,
    interactions: [job('cxCheckReturns', '반품 확인하기', '🔄', 15, { fun: -0.05 }, 'logic', 140)],
  },
  {
    id: 'cxStatusBoard', name: '배송 현황판', price: 0, w: 2, h: 1, icon: '📊', color: '#263238', category: 'skill', unlisted: true,
    interactions: [job('cxCheckStatus', '배송 현황 확인하기', '📊', 15, { fun: -0.03 }, 'logic', 150)],
  },
  {
    id: 'cxParcelLocker', name: '무인 택배함', price: 0, w: 2, h: 1, icon: '🔐', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [job('cxFillLocker', '무인 택배함에 넣기', '🔐', 15, { energy: -0.05 }, 'fitness', 140)],
  },
  // The 서브터미널 as it is (2026-11-05, the layout audit): the main line the length of the floor, its ITS scanner tunnel at the infeed
  // and the wheel sorter's cells pushing each box off to its route (the drivers' end of it is the conveyor station), and a dock's
  // controls on the wall beside its opening, a 탑차 backed up outside: the shutter's box over the opening, its buttons, the number. Only drawn.
  { id: 'cxMainLine', name: '메인 컨베이어·휠소터', price: 0, w: 9, h: 1, icon: '📦', color: '#78909c', category: 'decor', unlisted: true, interactions: [] },
  { id: 'cxDock', name: '상차 도크 셔터', price: 0, w: 1, h: 1, icon: '🚪', color: '#fbc02d', category: 'decor', unlisted: true, interactions: [] },
];
