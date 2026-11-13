import type { ObjectDef } from '../types';

/**
 * New furniture for the big company's office (2026-10-26 workplace pipeline, at the user's request):
 * what the floor was missing — a conference table with its mesh chairs (where a meeting is sat
 * round, each at their own chair), a supply cabinet with the shredder, the water purifier every
 * Korean office has and the lobby's reception desk under the company's name. The ids start `sal`
 * (the salaryperson's) so no other workplace's can clash with them.
 */
export const OBJECTS: ObjectDef[] = [
  // Led from wherever there's room round it, as the 회담 테이블 is (2026-11-04: the 경찰특공대's and the 어린이집's meetings are led at it,
  // and its chairs take both long sides).
  { id: 'salMeetingTable', name: '회의 테이블', access: 'any', price: 0, w: 3, h: 1, icon: '🗂️', color: '#6b4a3a', category: 'decor', unlisted: true, interactions: [] },
  {
    id: 'salMeetingChair', name: '회의실 의자', price: 0, w: 1, h: 1, icon: '🪑', color: '#4b5560', category: 'comfort', unlisted: true,
    interactions: [
      { id: 'relax', chatty: true, label: '앉아서 쉬기', icon: '😌', duration: 20, effects: { energy: 0.06, fun: 0.1 }, pose: 'on' },
      { id: 'salTableMeeting', chatty: true, label: '회의 테이블에서 회의하기', icon: '🗣️', duration: 40, effects: { social: 0.4 }, skill: { key: 'charisma', rate: 1 / 200 }, requires: 'atWork', pose: 'on' },
    ],
  },
  {
    id: 'salSupplyCabinet', name: '사무용품 캐비닛·문서 세단기', price: 0, w: 2, h: 1, icon: '🗄️', color: '#cfd4d8', category: 'skill', unlisted: true,
    interactions: [
      { id: 'salShredDocs', label: '보안 문서 파쇄하기', icon: '🗑️', duration: 10, effects: { fun: -0.05 }, requires: 'atWork', pose: 'front' },
      { id: 'salStockSupplies', label: '사무용품 채워 두기', icon: '📦', duration: 10, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 200 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'salWaterCooler', name: '정수기', price: 0, w: 1, h: 1, icon: '🚰', color: '#f5f7f8', category: 'decor', unlisted: true,
    interactions: [{ id: 'salWaterBreak', chatty: true, label: '정수기에서 물 마시기', icon: '🥤', duration: 5, effects: { fun: 0.05, energy: 0.02 }, requires: 'atWork', pose: 'front' }],
  },
  { id: 'salReceptionDesk', name: '로비 안내 데스크', price: 0, w: 3, h: 2, icon: '🛎️', color: '#1f3556', category: 'decor', unlisted: true, interactions: [] },
  // The same desk without the firm's logo, for other buildings' lobbies.
  { id: 'lobbyDesk', name: '안내 데스크', price: 0, w: 3, h: 2, icon: '🛎️', color: '#1f3556', category: 'decor', unlisted: true, interactions: [] },
  // An office building's two lifts side by side, for the lift halls of the office floors (2026-11-05, the layout audit).
  { id: 'bldLift', name: '엘리베이터', price: 0, w: 2, h: 1, icon: '🛗', color: '#9ea7ad', category: 'decor', unlisted: true, interactions: [] },
];
