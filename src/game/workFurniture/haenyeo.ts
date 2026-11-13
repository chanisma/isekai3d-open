import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 해녀의 집 (2026-11-01 workplace pipeline, at the user's request): the sea and the black rock
 * themselves, and what a diving women's house keeps along them: a line of suits and flippers, a lunar tide calendar,
 * the scale the nets are weighed on, a frame of seaweed, a small counter selling the morning's catch, a heap of
 * floats and a dry-stone wall. The ledges, the bulteok, the cleaning table and the tewak frame are in catalogKorea.ts.
 * Drawn in view3d/workplaces/haenyeo.ts (with haenyeoMotion.ts).
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
  // 2026-11-05, the layout audit: the sea is the lot's own water tiles now, open to the horizon beyond; this draws the black rock
  // breaking the shoreline, the surf, the sea past the lot's edge and what's out on it, from one tile of the shore.
  { id: 'hySea', name: '바다', price: 0, w: 1, h: 1, icon: '🌊', color: '#27708f', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'hyShore', name: '갯바위', price: 0, w: 16, h: 10, icon: '🌊', color: '#505055', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  // The 해녀 탈의장's cubbies and hooks, its heater; the 작업장's roof and its ice boxes and nets.
  { id: 'hyChangeWall', name: '탈의장 옷장·옷걸이', price: 0, w: 2, h: 1, icon: '👚', color: '#c7a26f', category: 'decor', unlisted: true, interactions: [] },
  { id: 'hyHeater', name: '탈의장 난로', price: 0, w: 1, h: 1, icon: '🔥', color: '#b0bec5', category: 'decor', unlisted: true, interactions: [] },
  { id: 'hyWorkShed', name: '해녀 작업장 지붕', price: 0, w: 1, h: 1, icon: '⚖️', color: '#cfd8dc', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'hyIceBoxes', name: '아이스박스·망사리', price: 0, w: 2, h: 1, icon: '🧊', color: '#eceff1', category: 'decor', unlisted: true, interactions: [] },
  // The back of the bulteok's ring stands on this tile: it keeps people from walking through it.
  { id: 'hyFirewood', name: '불턱 땔감', price: 0, w: 2, h: 1, icon: '🔥', color: '#6d4c41', category: 'decor', unlisted: true, interactions: [] },
  { id: 'hyFloats', name: '테왁 더미', price: 0, w: 1, h: 1, icon: '🟠', color: '#ef6c00', category: 'decor', unlisted: true, interactions: [] },
  { id: 'hyWall', name: '돌담', price: 0, w: 4, h: 1, icon: '🪨', color: '#3a3a3e', category: 'decor', unlisted: true, interactions: [] },
  {
    id: 'hySuitLine', name: '고무옷 건조대', price: 0, w: 3, h: 1, icon: '🤿', color: '#17181b', category: 'skill', unlisted: true,
    interactions: [job('hyHangSuit', '고무옷 헹궈 널기', '🤿', 20, { hygiene: 0.05 }, 'fitness', 150)],
  },
  {
    id: 'hyTide', name: '물때 달력', price: 0, w: 2, h: 1, icon: '🌊', color: '#9c7a52', category: 'skill', unlisted: true,
    interactions: [job('hyMarkTide', '물때 달력 짚어 두기', '🌊', 15, { fun: -0.03 }, 'logic', 150)],
  },
  {
    id: 'hyScale', name: '망사리 저울', price: 0, w: 2, h: 1, icon: '📋', color: '#546e7a', category: 'skill', unlisted: true,
    interactions: [job('hyWeigh', '망사리 달아 장부 적기', '📋', 20, { energy: -0.08 }, 'business', 130)],
  },
  {
    id: 'hyWeedRack', name: '미역 건조대', price: 0, w: 3, h: 1, icon: '🦪', color: '#6a6c28', category: 'skill', unlisted: true,
    interactions: [job('hyDryWeed', '미역 널어 말리기', '🦪', 20, { hygiene: -0.05 }, 'fishing', 130)],
  },
  {
    id: 'hyCounter', name: '해산물 카운터', price: 0, w: 3, h: 1, icon: '🦪', color: '#c7a26f', category: 'skill', unlisted: true,
    interactions: [job('hyServe', '잡은 해산물 썰어 내기', '🦪', 25, { social: 0.2 }, 'cooking', 110)],
  },
];
