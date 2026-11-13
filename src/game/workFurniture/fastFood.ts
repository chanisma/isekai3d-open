import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 패스트푸드점 (2026-11-01 workplace pipeline, at the user's request): what a branch of a
 * burger chain has besides its fryers and grills. Order kiosks by the door, a pickup counter with its number
 * board, the drinks tower, a drive-through window, a shelf for delivery riders, the dining tables with their
 * trays, a mop and bucket, and the low wall that closes off the kitchen with the sauces and napkins on it.
 * Drawn in view3d/workplaces/fastFood.ts (with fastFoodMotion.ts).
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
  { id: 'ffCondimentBar', name: '소스·냅킨 바', price: 0, w: 5, h: 1, icon: '🍟', color: '#d6322b', category: 'decor', unlisted: true, interactions: [] },
  {
    id: 'ffKiosk', name: '주문 키오스크', price: 0, w: 1, h: 1, icon: '🖥️', color: '#2b2b30', category: 'skill', unlisted: true,
    interactions: [job('ffHelpKiosk', '키오스크 주문 도와드리기', '🖥️', 15, { social: 0.2 }, 'charisma', 160)],
  },
  {
    id: 'ffPickupCounter', name: '픽업 카운터', price: 0, w: 2, h: 1, icon: '🛎️', color: '#d6322b', category: 'skill', unlisted: true,
    interactions: [job('ffCallOrder', '번호 불러 주문 내주기', '🛎️', 15, { social: 0.15 }, 'charisma', 150)],
  },
  {
    id: 'ffDrinkTower', name: '음료 디스펜서', price: 0, w: 2, h: 1, icon: '🥤', color: '#b0bec5', category: 'kitchen', unlisted: true,
    interactions: [job('ffPourDrinks', '음료 뽑아 캐리어에 담기', '🥤', 15, { fun: -0.05 }, 'cooking', 160)],
  },
  {
    id: 'ffDriveWindow', name: '드라이브스루 창', price: 0, w: 2, h: 1, icon: '🚗', color: '#d6322b', category: 'skill', unlisted: true,
    interactions: [job('ffDriveOrder', '드라이브스루 주문 받아 내주기', '🚗', 20, { social: 0.2, energy: -0.05 }, 'charisma', 120)],
  },
  {
    id: 'ffRiderShelf', name: '라이더 픽업 선반', price: 0, w: 2, h: 1, icon: '🛵', color: '#ffc233', category: 'skill', unlisted: true,
    interactions: [job('ffRiderHandoff', '배달 포장해 라이더에게 넘기기', '🛵', 20, { fun: -0.05 }, 'cooking', 170)],
  },
  {
    id: 'ffTrayTable', name: '매장 테이블', price: 0, w: 2, h: 1, icon: '🍽️', color: '#f4efe6', category: 'skill', unlisted: true,
    interactions: [{ id: 'ffWipeTable', label: '테이블 닦고 쟁반 치우기', icon: '🧽', duration: 15, effects: { hygiene: -0.05 }, requires: 'atWork', pose: 'front' }],
  },
  {
    id: 'ffMopBucket', name: '청소 도구함', price: 0, w: 1, h: 1, icon: '🧹', color: '#ffc233', category: 'skill', unlisted: true,
    interactions: [{ id: 'ffMopFloor', label: '매장 바닥 걸레질하기', icon: '🧹', duration: 20, effects: { hygiene: -0.1, energy: -0.05 }, requires: 'atWork', pose: 'front' }],
  },
];
