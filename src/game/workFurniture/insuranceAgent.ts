import type { InteractionDef, ObjectDef } from '../types';

/**
 * The 보험 지점 of the made-up 봄볕보험 (2026-11-01): what it was missing to feel real. A board for the morning meeting, a claims desk
 * with photos of a small accident and a payout that's summed, an appointment desk with phone and planner, a rack of leaflets, a wall
 * of contracts, a bag packed for going out to a client, a corner for the children who come along and the branch's sign. Drawn in
 * view3d/workplaces/insuranceAgent.ts (with insuranceAgentMotion.ts).
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
  { id: 'bhMorningBoard', name: '지점 현황판', price: 0, w: 2, h: 1, icon: '📈', color: '#27496d', category: 'skill', unlisted: true, interactions: [job('bhMorning', '아침 조회 이끌기', '📣', 22, { social: 0.3 }, 'charisma', 110), job('bhPostResult', '현황판에 별 붙이기', '⭐', 12, { fun: 0.05 }, 'business', 170)] },
  { id: 'bhClaimDesk', name: '보상 창구', price: 0, w: 2, h: 1, icon: '🧾', color: '#c9a274', category: 'skill', unlisted: true, interactions: [job('bhClaimPhotos', '사고 사진 살펴보기', '🔍', 22, { fun: -0.03 }, 'law', 120), job('bhClaimPay', '보험금 계산해 드리기', '🧮', 24, { social: 0.2 }, 'logic', 110)] },
  { id: 'bhPlannerDesk', name: '약속 책상', price: 0, w: 2, h: 1, icon: '🗓️', color: '#a7b9c4', category: 'skill', unlisted: true, interactions: [job('bhBookVisit', '방문 약속 잡기', '📞', 20, { social: 0.25 }, 'charisma', 120), job('bhPlanWeek', '한 주 일정 정리하기', '🗓️', 14, { fun: -0.02 }, 'logic', 170)] },
  { id: 'bhBrochureRack', name: '안내장 꽂이', price: 0, w: 2, h: 1, icon: '📰', color: '#f4b13f', category: 'skill', unlisted: true, interactions: [job('bhBrochureStock', '안내장 채워 넣기', '📰', 14, { fun: -0.02 }, 'business', 170), job('bhBrochureHand', '어르신께 안내장 권해 드리기', '🤲', 16, { social: 0.25 }, 'empathy', 120)] },
  { id: 'bhRecordsWall', name: '계약 기록 벽', price: 0, w: 3, h: 1, icon: '🗄️', color: '#8f6c48', category: 'skill', unlisted: true, interactions: [job('bhFindPolicy', '옛 계약서 찾아보기', '🗄️', 20, { fun: -0.04 }, 'law', 130)] },
  { id: 'bhVisitBag', name: '방문 가방대', price: 0, w: 2, h: 1, icon: '💼', color: '#7a4f30', category: 'skill', unlisted: true, interactions: [job('bhPackBag', '고객 방문 가방 챙기기', '💼', 16, { fun: 0.03 }, 'business', 170)] },
  { id: 'bhKidsCorner', name: '어린이 놀이 코너', price: 0, w: 2, h: 1, icon: '🧸', color: '#ffe6ad', category: 'decor', unlisted: true, interactions: [] },
  { id: 'bhBranchSign', name: '지점 안내판', price: 0, w: 1, h: 1, icon: '☀️', color: '#f4b13f', category: 'decor', unlisted: true, interactions: [] },
];
