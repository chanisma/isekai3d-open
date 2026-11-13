import type { InteractionDef, ObjectDef } from '../types';

const job = (id: string, label: string, icon: string, key: NonNullable<InteractionDef['skill']>['key'], duration = 25): InteractionDef => ({
  id, label, icon, duration, requires: 'atWork', pose: 'front',
  effects: { social: 0.15, fun: 0.05 }, skill: { key, rate: 1 / 100 },
});

export const OBJECTS: ObjectDef[] = [
  { id: 'salesLeaderboard', name: '영업 실적 현황판', icon: '🔔', w: 2, h: 1,
    price: 0, category: 'skill', color: '#224c58', unlisted: true,
    interactions: [job('salesRecordDeal', '수주 실적 등록하고 종 울리기', '🔔', 'business')] },
  { id: 'salesPresentation', name: '고객 제안 발표실', icon: '📽️', w: 3, h: 2,
    price: 0, category: 'skill', color: '#23465c', unlisted: true,
    interactions: [job('salesPresentProduct', '제품 제안 발표하기', '📽️', 'charisma', 30)] },
  { id: 'salesBrochureCounter', name: '명함·브로슈어 카운터', icon: '🪪', w: 2, h: 1,
    price: 0, category: 'skill', color: '#bb996a', unlisted: true,
    interactions: [job('salesPrepareVisit', '명함 교환하고 방문 자료 챙기기', '🪪', 'business')] },
  { id: 'salesHuddleBoard', name: '아침 영업 회의 보드', icon: '🗂️', w: 2, h: 1,
    price: 0, category: 'skill', color: '#4c8179', unlisted: true,
    interactions: [job('salesMorningHuddle', '아침 영업 회의 진행하기', '🗂️', 'leadership', 30)] },
  // Parked out front for visits (2026-11-05, the layout audit).
  { id: 'salesCompanyCar', name: '영업용 회사 차', icon: '🚗', w: 2, h: 1,
    price: 0, category: 'decor', color: '#4a535b', unlisted: true, interactions: [] },
  // A venture capital firm's lobby (2026-11-05): the fund's name on its wall, and the wall of the start-ups it has backed.
  { id: 'vcLogoWall', name: '펀드 로고 벽', icon: '🌟', w: 3, h: 1,
    price: 0, category: 'decor', color: '#1d2b4a', unlisted: true, interactions: [] },
  // The PR agency's lobby wall (branch lot socialMedia@1), drawn the same way.
  { id: 'prLogoWall', name: '대행사 로고 벽', icon: '🌟', w: 3, h: 1,
    price: 0, category: 'decor', color: '#ffffff', unlisted: true, interactions: [] },
  { id: 'vcPortfolioWall', name: '포트폴리오 벽', icon: '🗂️', w: 2, h: 1,
    price: 0, category: 'decor', color: '#f2f2ee', unlisted: true, interactions: [] },
];
