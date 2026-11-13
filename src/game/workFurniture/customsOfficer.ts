import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 공항 세관 (2026-11-01 workplace pipeline, at the user's request): what an arrivals hall has besides
 * its X-rays and tables. Green and red lanes, a baggage carousel, a sniffer dog's bench, a cage of goods held back (too
 * many boxes of fruit, plain handbags), a monitoring desk and a counter where duty is worked out and paid, with a form
 * stand and a board of allowances. Drawn in view3d/workplaces/customsOfficer.ts (with customsOfficerMotion.ts).
 * All names and goods are made up.
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
  { id: 'cuLaneGate', name: '녹색·적색 통로', price: 0, w: 3, h: 1, icon: '🛃', color: '#2e7d32', category: 'skill', unlisted: true, interactions: [job('cuDirectLanes', '여행객 통로 안내하기', '🛃', 20, { social: 0.1 }, 'charisma', 150)] },
  { id: 'cuCarousel', name: '수하물 수취대', price: 0, w: 4, h: 2, icon: '🧳', color: '#37474f', category: 'skill', unlisted: true, interactions: [job('cuClaimCheck', '주인 없는 가방 확인하기', '🧳', 20, { energy: -0.05 }, 'logic', 160)] },
  { id: 'cuDogLane', name: '탐지견 검색대', price: 0, w: 2, h: 1, icon: '🐕', color: '#8d6e63', category: 'skill', unlisted: true, interactions: [job('cuDogRound', '탐지견과 수하물 훑기', '🐕', 25, { fun: 0.2, energy: -0.08 }, 'fitness', 140)] },
  { id: 'cuSeizedCage', name: '유치품 보관함', price: 0, w: 2, h: 1, icon: '📦', color: '#78909c', category: 'skill', unlisted: true, interactions: [job('cuLogSeized', '유치품 대장에 적고 보관하기', '📦', 20, { fun: -0.05 }, 'law', 150)] },
  { id: 'cuMonitorDesk', name: '세관 관제실', price: 0, w: 3, h: 1, icon: '🖥️', color: '#263238', category: 'skill', unlisted: true, interactions: [job('cuWatchCctv', '입국장 화면 지켜보기', '🖥️', 25, { fun: -0.03 }, 'logic', 170)] },
  { id: 'cuDutyCounter', name: '세금 납부 창구', price: 0, w: 2, h: 1, icon: '💳', color: '#607d8b', category: 'skill', unlisted: true, interactions: [job('cuAssessDuty', '여행자 세금 계산해 주기', '💳', 25, { social: 0.1, fun: -0.03 }, 'law', 130)] },
  { id: 'cuFormStand', name: '신고서 작성대', price: 0, w: 1, h: 1, icon: '📋', color: '#b0bec5', category: 'decor', unlisted: true, interactions: [] },
  { id: 'cuLimitBoard', name: '면세 안내판', price: 0, w: 1, h: 1, icon: '📋', color: '#1a237e', category: 'decor', unlisted: true, interactions: [] },
];
