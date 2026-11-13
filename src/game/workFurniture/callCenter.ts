import type { InteractionDef, ObjectDef } from '../types';

/**
 * The 고객센터 (2026-11-01): what it was missing to feel real and to vary a seated job. A colleague's desk to coach at, binders of
 * scripts and answers, a supervisor's listening station, a set where a call is role-played standing, a quiet booth for a hard
 * call, a tea corner and a massage chair for afterwards, the wall of customers' thanks and a sign.
 * Drawn in view3d/workplaces/callCenter.ts (with callCenterMotion.ts). The company and all its people are made up.
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
  { id: 'csTeamDesk', name: '동료 상담석', price: 0, w: 1, h: 1, icon: '🎧', color: '#b0bec5', category: 'skill', unlisted: true, interactions: [job('csCoach', '동료 곁에서 상담 코칭하기', '🤝', 25, { social: 0.25 }, 'charisma', 110)] },
  { id: 'csFaqShelf', name: '스크립트·FAQ 바인더 선반', price: 0, w: 2, h: 1, icon: '📚', color: '#c4a27c', category: 'skill', unlisted: true, interactions: [job('csLookup', '바인더에서 응대 문구 찾기', '📚', 18, { fun: -0.03 }, 'writing', 130)] },
  { id: 'csSupervisorDesk', name: '슈퍼바이저 청취석', price: 0, w: 2, h: 1, icon: '🎧', color: '#5e3a8c', category: 'skill', unlisted: true, interactions: [job('csListenIn', '상담 청취하고 귓속말로 돕기', '🎧', 25, { fun: -0.03 }, 'charisma', 100)] },
  { id: 'csRolePlaySet', name: '상담 교육실 역할극 세트', price: 0, w: 3, h: 1, icon: '🎭', color: '#e4d8f4', category: 'skill', unlisted: true, interactions: [job('csRolePlay', '화난 고객 역할극 해 주기', '🎭', 28, { social: 0.3, fun: 0.08 }, 'charisma', 90)] },
  { id: 'csQuietBooth', name: '조용한 상담 부스', price: 0, w: 2, h: 2, icon: '🚪', color: '#6f6a86', category: 'skill', unlisted: true, interactions: [job('csHardCall', '조용한 부스에서 어려운 전화 받기', '📞', 32, { energy: -0.1, fun: -0.12 }, 'charisma', 70)] },
  { id: 'csTeaCorner', name: '차 코너', price: 0, w: 2, h: 1, icon: '🍵', color: '#ece4d6', category: 'decor', unlisted: true, interactions: [{ id: 'csTea', label: '따뜻한 차 한잔 마시기', icon: '🍵', duration: 20, effects: { energy: 0.08, fun: 0.12 }, requires: 'atWork', pose: 'front' }] },
  { id: 'csRestChair', name: '스트레스 해소 안마 의자', price: 0, w: 1, h: 1, icon: '💺', color: '#5d4f7a', category: 'decor', unlisted: true, interactions: [{ id: 'csRest', label: '안마 의자에서 잠깐 쉬기', icon: '💺', duration: 25, effects: { energy: 0.15, fun: 0.15 }, requires: 'atWork', pose: 'front' }] },
  { id: 'csThanksWall', name: '고마운 말 게시판', price: 0, w: 2, h: 1, icon: '💌', color: '#c4a27c', category: 'decor', unlisted: true, interactions: [] },
  { id: 'csCenterSign', name: '고객센터 안내판', price: 0, w: 1, h: 1, icon: '📋', color: '#5e3a8c', category: 'decor', unlisted: true, interactions: [] },
];
