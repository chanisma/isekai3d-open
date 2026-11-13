import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 편의점 (2026-11-01 workplace pipeline, at the user's request): what a neighbourhood
 * convenience store has besides a till and shelves. The tobacco shelf and hot case by the till, cup ramen with
 * a hot water corner, a lunch-box chiller with its expiry check, a window bar, a cash kiosk and a parcel rack by
 * the door, the morning's delivery crates, a mop and bins, tables under parasols outside, a 1+1 stand and an
 * A-board. Drawn in view3d/workplaces/convenienceManager.ts (with convenienceManagerMotion.ts).
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
const chore = (id: string, label: string, icon: string, duration: number, effects: InteractionDef['effects']): InteractionDef => ({ id, label, icon, duration, effects, requires: 'atWork', pose: 'front' });

export const OBJECTS: ObjectDef[] = [
  { id: 'cvCigShelf', name: '담배 진열장', price: 0, w: 2, h: 1, icon: '🏪', color: '#26332d', category: 'decor', unlisted: true, interactions: [] },
  { id: 'cvHotCase', name: '온장 쇼케이스', price: 0, w: 1, h: 1, icon: '🔥', color: '#17935f', category: 'skill', unlisted: true, interactions: [job('cvFillHotCase', '호빵·핫바 채우기', '🔥', 15, { fun: -0.05 }, 'cooking', 170)] },
  { id: 'cvRamenShelf', name: '컵라면 진열대', price: 0, w: 2, h: 1, icon: '🍜', color: '#d84315', category: 'skill', unlisted: true, interactions: [job('cvFaceRamen', '컵라면 채우고 앞줄 맞추기', '🍜', 15, { energy: -0.05 }, 'fitness', 170)] },
  { id: 'cvHotWater', name: '온수기 코너', price: 0, w: 1, h: 1, icon: '♨️', color: '#b0bec5', category: 'skill', unlisted: true, interactions: [chore('cvRefillWater', '온수기 물 채우기', '♨️', 15, { energy: -0.05 })] },
  { id: 'cvLunchChiller', name: '도시락 냉장 쇼케이스', price: 0, w: 2, h: 1, icon: '🍱', color: '#17935f', category: 'skill', unlisted: true, interactions: [job('cvCheckLunch', '도시락 유통기한 점검·폐기하기', '🍱', 20, { fun: -0.05 }, 'logic', 150)] },
  { id: 'cvWindowBar', name: '창가 자리', price: 0, w: 4, h: 1, icon: '🪟', color: '#c89b6c', category: 'skill', unlisted: true, interactions: [chore('cvWipeBar', '창가 자리 치우고 닦기', '🧽', 15, { hygiene: -0.05 })] },
  { id: 'cvAtm', name: '무인 단말기', price: 0, w: 1, h: 1, icon: '💳', color: '#37474f', category: 'skill', unlisted: true, interactions: [job('cvHelpAtm', '단말기 쓰는 법 도와드리기', '💳', 15, { social: 0.2 }, 'charisma', 160)] },
  { id: 'cvParcelRack', name: '택배 보관 선반', price: 0, w: 2, h: 1, icon: '📦', color: '#90a4ae', category: 'decor', unlisted: true, interactions: [] },
  { id: 'cvCrateStack', name: '납품 상자', price: 0, w: 3, h: 1, icon: '📦', color: '#2f7fc1', category: 'skill', unlisted: true, interactions: [job('cvCheckDelivery', '납품 상자 검수하기', '📋', 20, { energy: -0.1 }, 'logic', 150)] },
  { id: 'cvMopBin', name: '청소 코너', price: 0, w: 1, h: 1, icon: '🧹', color: '#ffc107', category: 'skill', unlisted: true, interactions: [chore('cvEmptyBins', '쓰레기 비우고 바닥 닦기', '🧹', 20, { hygiene: -0.1, energy: -0.05 })] },
  { id: 'cvParasolTable', name: '파라솔 테이블', price: 0, w: 2, h: 1, icon: '🍽️', color: '#17935f', category: 'skill', unlisted: true, interactions: [chore('cvTidyTerrace', '파라솔 테이블 정리하기', '🧽', 15, { hygiene: -0.05 })] },
  { id: 'cvPromoStand', name: '행사 매대', price: 0, w: 1, h: 1, icon: '🏷️', color: '#d32f2f', category: 'decor', unlisted: true, interactions: [] },
  { id: 'cvABoard', name: '입간판', price: 0, w: 1, h: 1, icon: '🏪', color: '#17935f', category: 'decor', unlisted: true, interactions: [] },
  // The street front and the unit next door (2026-11-05, the layout audit).
  { id: 'cvShopFront', name: '편의점 통유리 정면·간판', price: 0, w: 1, h: 1, icon: '🪧', color: '#17935f', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'cvNeighbor', name: '이웃 분식집', price: 0, w: 5, h: 8, icon: '🏪', color: '#f3e0c8', category: 'decor', unlisted: true, interactions: [] },
];
