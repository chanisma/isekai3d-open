import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 코미디 클럽 공연장 (2026-11-01 workplace pipeline, at the user's request): what a small
 * stand-up club has besides its stage and mic. Rows of little tables with people at them when there's a show, a
 * bar in the lobby, a bulb-lit mirror in the green room, a cork board of the night's running order, the sound and
 * light console at the back of the room and the lobby's wall of posters. Drawn in
 * view3d/workplaces/entertainer.ts (with entertainerMotion.ts).
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
  { id: 'enHouseRow', name: '객석 테이블', price: 0, w: 3, h: 1, icon: '🎭', color: '#5d4037', category: 'decor', unlisted: true, interactions: [] },
  { id: 'enPosterWall', name: '공연 포스터 벽', price: 0, w: 2, h: 1, icon: '🎭', color: '#8e3b2b', category: 'decor', unlisted: true, interactions: [] },
  // The box office by the door (2026-11-05, the layout audit): tickets bought or collected through its window, tonight's bill above it.
  { id: 'enTicketBooth', name: '매표소', price: 0, w: 2, h: 1, icon: '🎭', color: '#5d4037', category: 'decor', unlisted: true, interactions: [] },
  {
    id: 'enBarCounter', name: '클럽 바', price: 0, w: 4, h: 1, icon: '😂', color: '#5d4037', category: 'skill', unlisted: true,
    interactions: [job('enBarDebrief', '바에서 오늘 무대 복기하기', '😂', 20, { fun: 0.3, social: 0.2 }, 'comedy', 130)],
  },
  {
    id: 'enVanity', name: '대기실 분장 거울', price: 0, w: 2, h: 1, icon: '🪞', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [job('enPreShow', '무대 전 분장하고 마음 다잡기', '🪞', 15, { fun: 0.1, energy: 0.05 }, 'charisma', 150)],
  },
  {
    id: 'enSetlistCork', name: '세트리스트 보드', price: 0, w: 2, h: 1, icon: '📝', color: '#b98a56', category: 'skill', unlisted: true,
    interactions: [job('enSetlistSort', '세트리스트 순서 짜기', '📝', 20, { fun: 0.1 }, 'comedy', 120)],
  },
  {
    id: 'enSoundConsole', name: '음향·조명 콘솔', price: 0, w: 2, h: 1, icon: '🎚️', color: '#2f2a28', category: 'skill', unlisted: true,
    interactions: [job('enSoundCheck', '마이크 소리·조명 맞추기', '🎚️', 15, { fun: 0.05 }, 'charisma', 180)],
  },
];
