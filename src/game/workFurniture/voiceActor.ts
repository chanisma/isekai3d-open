import type { InteractionDef, ObjectDef } from '../types';

/**
 * The 녹음 스튜디오 (2026-11-01): what it was missing to feel like a dubbing studio. An ensemble line of mics before a big screen, a
 * foley table with its gravel and boards, a throat-care tea corner, a rack of scripts, a recording booth seen through glass from
 * the control room and the desk where the director and engineer sit, and the studio's sign.
 * Drawn in view3d/workplaces/voiceActor.ts (with voiceActorMotion.ts). The studio, the cartoon and all the people are made up.
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
  { id: 'vaEnsembleLine', name: '단체 더빙 라인', price: 0, w: 5, h: 2, icon: '🎬', color: '#37474f', category: 'skill', unlisted: true, interactions: [job('vaEnsemble', '동료들과 함께 단체 더빙하기', '🎭', 30, { social: 0.25, fun: 0.2 }, 'comedy', 90), job('vaWalla', '군중 소리 함께 넣기', '🗣️', 20, { social: 0.2, fun: 0.15 }, 'charisma', 120)] },
  { id: 'vaFoleyTable', name: '폴리 효과음 테이블', price: 0, w: 3, h: 2, icon: '🎙️', color: '#8d6e63', category: 'skill', unlisted: true, interactions: [job('vaFoleySteps', '자갈과 나무판에서 발소리 만들기', '🎙️', 25, { fun: 0.2, energy: -0.05 }, 'comedy', 110), job('vaFoleyProps', '문소리와 불소리 만들기', '🚪', 25, { fun: 0.2 }, 'comedy', 110)] },
  { id: 'vaTeaCorner', name: '목 관리 차 코너', price: 0, w: 2, h: 1, icon: '🍵', color: '#d7ccc8', category: 'decor', unlisted: true, interactions: [{ id: 'vaTea', label: '따뜻한 배도라지차로 목 풀기', icon: '🍵', duration: 20, effects: { energy: 0.08, fun: 0.1 }, requires: 'atWork', pose: 'front' }] },
  { id: 'vaScriptRack', name: '대본 선반', price: 0, w: 2, h: 1, icon: '📚', color: '#a1887f', category: 'skill', unlisted: true, interactions: [job('vaPickScript', '오늘 맡은 배역 대본 찾기', '📚', 18, { fun: -0.02 }, 'empathy', 130)] },
  { id: 'vaCrewDesk', name: '연출·녹음 감독석', price: 0, w: 3, h: 2, icon: '🎬', color: '#455a64', category: 'skill', unlisted: true, interactions: [job('vaPickTake', '연출가와 좋은 테이크 고르기', '✅', 22, { social: 0.2 }, 'charisma', 100)] },
  { id: 'vaGlassBooth', name: '유리 너머 녹음 부스', price: 0, w: 4, h: 2, icon: '🎙️', color: '#546e7a', category: 'decor', unlisted: true, interactions: [] },
  { id: 'vaStudioSign', name: '녹음실 안내판', price: 0, w: 1, h: 1, icon: '📋', color: '#4527a0', category: 'decor', unlisted: true, interactions: [] },
];
