import type { ObjectDef } from '../types';

/**
 * New furniture for the car repair shop (2026-10-27 workplace pipeline, at the user's request): what a
 * Korean 카센터 has besides its lifts, scan cart, tool wall and parts racks — the tyre changer and the
 * wheel balancer, the oil drain caddy, the rolling tool chest, the 정비 접수 desk where the 견적서 is
 * written, and the customers' lounge: its waiting chairs (where the 차 주인 sits and is shown the
 * quote), the coffee vending machine and the TV. Drawn in view3d/workplaces/mechanic.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    id: 'mecTireChanger', name: '타이어 탈착기', price: 0, w: 1, h: 1, icon: '🛞', color: '#d32f2f', category: 'skill', unlisted: true,
    interactions: [
      { id: 'mecMountTire', label: '타이어 탈착기로 끼우기', icon: '🛞', duration: 20, effects: { energy: -0.08, hygiene: -0.05 }, skill: { key: 'handiness', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'mecWheelBalancer', name: '휠 밸런서', price: 0, w: 1, h: 1, icon: '⚖️', color: '#1565c0', category: 'skill', unlisted: true,
    interactions: [
      { id: 'mecBalanceWheel', label: '휠 밸런스 맞추기', icon: '⚖️', duration: 15, effects: { fun: 0.03 }, skill: { key: 'logic', rate: 1 / 140 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'mecOilCaddy', name: '폐유 회수기', price: 0, w: 1, h: 1, icon: '🛢️', color: '#ffb300', category: 'skill', unlisted: true,
    interactions: [
      { id: 'mecEmptyOil', label: '폐유 비우기', icon: '🛢️', duration: 12, effects: { hygiene: -0.1 }, skill: { key: 'handiness', rate: 1 / 200 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'mecToolChest', name: '공구 카트', price: 0, w: 1, h: 1, icon: '🧰', color: '#c62828', category: 'skill', unlisted: true,
    interactions: [
      { id: 'mecPrepTools', label: '작업 공구 챙기기', icon: '🔧', duration: 10, effects: { fun: -0.02 }, skill: { key: 'handiness', rate: 1 / 200 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'mecReceptionDesk', name: '정비 접수 데스크', price: 0, w: 2, h: 1, icon: '📋', color: '#37474f', category: 'skill', unlisted: true,
    interactions: [
      { id: 'mecWriteQuote', label: '견적서 작성하기', icon: '🧾', duration: 20, effects: { fun: -0.03 }, skill: { key: 'business', rate: 1 / 140 }, requires: 'atWork', pose: 'front' },
    ],
  },
  { id: 'mecWaitSeat', name: '고객 대기 의자', price: 0, w: 1, h: 1, icon: '🪑', color: '#455a64', category: 'decor', unlisted: true, interactions: [] },
  {
    id: 'mecVendingMachine', name: '커피 자판기', price: 0, w: 1, h: 1, icon: '☕', color: '#b71c1c', category: 'decor', unlisted: true,
    interactions: [
      { id: 'mecVendingCoffee', label: '자판기 커피 뽑아 마시기', icon: '☕', duration: 10, effects: { energy: 0.08, fun: 0.04 }, requires: 'atWork', pose: 'front' },
    ],
  },
  { id: 'mecLoungeTv', name: '대기실 TV', price: 0, w: 2, h: 1, icon: '📺', color: '#263238', category: 'decor', unlisted: true, interactions: [] },
  // 2026-11-05, the layout audit: what stands behind the bays and on the forecourt.
  { id: 'mecTyreRack', name: '타이어 적재대', price: 0, w: 2, h: 1, icon: '🛞', color: '#37474f', category: 'decor', unlisted: true, interactions: [] },
  { id: 'mecOilDrums', name: '폐유 드럼', price: 0, w: 1, h: 1, icon: '🛢️', color: '#2e5e8c', category: 'decor', unlisted: true, interactions: [] },
  { id: 'mecSignPole', name: '정비소 간판 기둥', price: 0, w: 1, h: 1, icon: '🔧', color: '#c62828', category: 'decor', unlisted: true, interactions: [] },
  // The bays are open on the forecourt, so their walls to the lot are pieces (a wall between the open bays and the lot isn't drawn).
  { id: 'mecBayWallSide', name: '정비 베이 옆벽', price: 0, w: 1, h: 9, icon: '🧱', color: '#a4493a', category: 'decor', unlisted: true, interactions: [] },
  { id: 'mecBayWallBack', name: '정비 베이 뒷벽', price: 0, w: 14, h: 1, icon: '🧱', color: '#a4493a', category: 'decor', unlisted: true, interactions: [] },
  { id: 'mecBayFront', name: '정비 베이 입구·말린 셔터', price: 0, w: 1, h: 1, icon: '🚪', color: '#c62828', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
];
