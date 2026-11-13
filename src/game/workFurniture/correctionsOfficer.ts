import type { InteractionDef, ObjectDef } from '../types';

/**
 * The 교정시설 (2026-11-01): what it was missing to feel real, shown with restraint and looking to people's return to everyday life.
 * A wall of cameras behind the consoles, a door panel, a corridor gate and its keys, a rounds post, a baking class, a library cart,
 * an exercise yard, a nurse's counter, the visitors' lockers and a sign. Drawn in view3d/workplaces/correctionsOfficer.ts (with
 * correctionsOfficerMotion.ts). The facility's name and everything in it are made up.
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
  { id: 'gjCctvWall', name: '관제 벽', price: 0, w: 4, h: 1, icon: '📺', color: '#2f363c', category: 'decor', unlisted: true, interactions: [] },
  { id: 'gjDoorPanel', name: '출입문 현황판', price: 0, w: 2, h: 1, icon: '🚪', color: '#2c3e50', category: 'skill', unlisted: true, interactions: [job('gjDoors', '출입문 점검하기', '🚪', 18, { fun: -0.03 }, 'logic', 130)] },
  { id: 'gjGate', name: '복도 출입문', price: 0, w: 2, h: 1, icon: '🔑', color: '#7f9a8c', category: 'skill', unlisted: true, interactions: [job('gjGateRound', '복도 문 열고 잠그기', '🔑', 16, { energy: -0.05 }, 'law', 150)] },
  { id: 'gjRoundPost', name: '순찰 확인 지점', price: 0, w: 1, h: 1, icon: '📋', color: '#efe9db', category: 'skill', unlisted: true, interactions: [job('gjRoundLog', '순찰 기록하기', '📋', 14, { fun: -0.02 }, 'law', 150)] },
  { id: 'gjWorkshop', name: '제빵 실습실', price: 0, w: 4, h: 2, icon: '🥖', color: '#d9c29a', category: 'skill', unlisted: true, interactions: [job('gjBake', '제빵 실습 지도하기', '🥖', 30, { social: 0.25, fun: 0.1 }, 'empathy', 100), job('gjToolCheck', '실습 도구 점검하기', '📋', 18, { fun: -0.02 }, 'logic', 140)] },
  { id: 'gjBookCart', name: '도서 카트', price: 0, w: 1, h: 1, icon: '📚', color: '#b98f62', category: 'skill', unlisted: true, interactions: [job('gjBooks', '이동 도서 전하기', '📚', 20, { social: 0.2 }, 'empathy', 130)] },
  { id: 'gjYard', name: '운동 마당', price: 0, w: 4, h: 4, icon: '🏃', color: '#a8b294', category: 'skill', unlisted: true, interactions: [job('gjYardWatch', '운동 시간 살피기', '🏃', 24, { energy: -0.05, fun: 0.1 }, 'fitness', 110), job('gjYardTalk', '말다툼 말로 풀기', '🕊️', 24, { social: 0.2 }, 'empathy', 90)] },
  { id: 'gjMedCounter', name: '의무 확인 창구', price: 0, w: 2, h: 2, icon: '🩺', color: '#d9e4dd', category: 'skill', unlisted: true, interactions: [job('gjMedCheck', '아픈 수용자 살피기', '🩺', 24, { social: 0.2 }, 'empathy', 110)] },
  { id: 'gjLockers', name: '소지품 보관함', price: 0, w: 2, h: 1, icon: '🔒', color: '#7f9a8c', category: 'skill', unlisted: true, interactions: [job('gjLockerGuide', '소지품 보관 안내하기', '🎒', 16, { social: 0.15 }, 'charisma', 150)] },
  { id: 'gjSign', name: '교정시설 안내판', price: 0, w: 1, h: 1, icon: '📋', color: '#2c3e50', category: 'decor', unlisted: true, interactions: [] },
  // A 거실's fittings along its back wall (2026-11-05, the layout audit: the 수용동 was missing): the 관물대 with its small TV, the
  // folded 이불 stacked on the floor, the low table, the 화장실 behind its half-height partition at one end. Its door is the cell's;
  // an officer looks in on it on the round.
  { id: 'gjCellKit', name: '수용 거실 비품', price: 0, w: 3, h: 1, icon: '🛏️', color: '#c9c2ad', category: 'skill', unlisted: true, interactions: [job('gjCellCheck', '거실 점검하기', '🔦', 18, { fun: -0.02 }, 'law', 140)] },
  // The perimeter wall round the yard (2026-11-05, the layout audit): drawn from the yard's north-east tile, the 담장 along the lot's
  // back and side with its wire on top, the 감시대 at the corner.
  { id: 'gjPerimeter', name: '담장·감시대', price: 0, w: 1, h: 1, icon: '🧱', color: '#a7a9a4', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
];
