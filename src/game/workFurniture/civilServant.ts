import type { InteractionDef, ObjectDef } from '../types';

/**
 * The 주민센터 (2026-11-01): what it was missing to feel real. An unmanned certificate kiosk an elder is helped with, a form stand
 * with reading glasses and a magnifier, a welfare booth behind low screens, a neighbourhood notice board, rolling record shelves,
 * a disaster-relief cage, a cabinet that readies the meeting room, a number ticket machine and the centre's sign. Drawn in
 * view3d/workplaces/civilServant.ts (with civilServantMotion.ts). The 동 and everything in it are made up.
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
  { id: 'juKiosk', name: '무인민원발급기', price: 0, w: 1, h: 1, icon: '🪪', color: '#2f6d9e', category: 'skill', unlisted: true, interactions: [job('juHelp', '어르신 발급 도와드리기', '🪪', 20, { social: 0.2 }, 'empathy', 120)] },
  { id: 'juFormStand', name: '민원 서식 기재대', price: 0, w: 2, h: 1, icon: '📑', color: '#c29a6c', category: 'skill', unlisted: true, interactions: [job('juFormHelp', '서식 작성 도와드리기', '📑', 22, { social: 0.2 }, 'empathy', 120), job('juFormStock', '서식 채워 넣기', '📑', 14, { fun: -0.03 }, 'writing', 170)] },
  { id: 'juWelfareBooth', name: '복지 상담 부스', price: 0, w: 2, h: 2, icon: '🤝', color: '#b9c6a9', category: 'skill', unlisted: true, interactions: [job('juWelfare', '복지 상담하기', '🤝', 30, { social: 0.3 }, 'empathy', 100)] },
  { id: 'juNoticeBoard', name: '마을 소식판', price: 0, w: 2, h: 1, icon: '📋', color: '#c8a06f', category: 'skill', unlisted: true, interactions: [job('juPostNotice', '마을 소식 붙이기', '📋', 14, { fun: 0.05 }, 'writing', 170)] },
  { id: 'juRollStack', name: '이동식 서고', price: 0, w: 2, h: 2, icon: '🗄️', color: '#9aa4a0', category: 'skill', unlisted: true, interactions: [job('juFindRecord', '옛 기록 찾아오기', '🗄️', 22, { fun: -0.04 }, 'law', 120)] },
  { id: 'juReliefCage', name: '재난 구호 물품함', price: 0, w: 2, h: 1, icon: '📦', color: '#ffd24d', category: 'skill', unlisted: true, interactions: [job('juReliefCheck', '구호 물품 점검하기', '📦', 20, { fun: -0.03 }, 'logic', 130)] },
  { id: 'juMeetingPrep', name: '회의 준비대', price: 0, w: 2, h: 1, icon: '🗂️', color: '#8d6a45', category: 'skill', unlisted: true, interactions: [job('juMeetingSet', '주민 회의 준비하기', '🗂️', 14, { fun: -0.02 }, 'charisma', 170)] },
  { id: 'juTicket', name: '번호표 발권기', price: 0, w: 1, h: 1, icon: '🔢', color: '#2f6d9e', category: 'decor', unlisted: true, interactions: [] },
  { id: 'juSign', name: '주민센터 안내판', price: 0, w: 1, h: 1, icon: '📋', color: '#234f75', category: 'decor', unlisted: true, interactions: [] },
  // 2026-11-05, the layout audit: the centre's pole sign on the pavement, so the building reads as the 동's office from the street.
  { id: 'juFrontSign', name: '행정복지센터 간판', price: 0, w: 1, h: 1, icon: '🏛️', color: '#234f75', category: 'decor', unlisted: true, interactions: [] },
];
