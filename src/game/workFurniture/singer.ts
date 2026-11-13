import type { ObjectDef } from '../types';

/**
 * New furniture for the recording studio and concert hall (2026-10-27 workplace pipeline, at the
 * user's request): what the 녹음 스튜디오와 공연장 was missing — the booth's acoustic foam, the glass
 * between the vocal booth and the control room (seen from each side), the platinum records on the
 * control room's wall, the backstage dressing table with its bulb mirror, and the lobby's fan-sign
 * table. The ids start `sg` (the singer's) so no other workplace's can clash with them.
 */
export const OBJECTS: ObjectDef[] = [
  { id: 'sgFoamWall', name: '흡음재 벽', price: 0, w: 3, h: 1, icon: '🔇', color: '#3a3a44', category: 'decor', unlisted: true, interactions: [] },
  { id: 'sgBoothWindow', name: '컨트롤룸 유리창', price: 0, w: 2, h: 1, icon: '🪟', color: '#5d4037', category: 'decor', unlisted: true, interactions: [] },
  { id: 'sgControlWindow', name: '녹음 부스 유리창', price: 0, w: 2, h: 1, icon: '🪟', color: '#5d4037', category: 'decor', unlisted: true, interactions: [] },
  { id: 'sgGoldRecords', name: '플래티넘 레코드 액자', price: 0, w: 2, h: 1, icon: '💿', color: '#d4af37', category: 'decor', unlisted: true, interactions: [] },
  {
    id: 'sgDressingTable', name: '대기실 화장대', price: 0, w: 2, h: 1, icon: '💄', color: '#f3e5f5', category: 'skill', unlisted: true,
    interactions: [
      { id: 'sgStagePrep', label: '무대 준비하기', icon: '💄', duration: 15, effects: { fun: 0.05, hygiene: 0.05 }, skill: { key: 'charisma', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  // The company's showcase hall (2026-11-05, the layout audit): the stage, a seat of the house, the box office.
  {
    id: 'sgShowcaseStage', name: '쇼케이스 무대', price: 0, w: 9, h: 3, icon: '🎤', color: '#1d1d22', category: 'skill', unlisted: true,
    interactions: [
      { id: 'soundcheck', label: '무대 리허설하기', icon: '🎙️', duration: 30, effects: { fun: 0.2 }, skill: { key: 'singing', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
      { id: 'liveConcert', label: '라이브 공연하기', icon: '🌟', duration: 45, effects: { fun: 0.4, energy: -0.2 }, skill: { key: 'singing', rate: 1 / 60 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  { id: 'sgHallSeat', name: '공연장 객석 의자', price: 0, w: 1, h: 1, icon: '💺', color: '#8e1b2e', category: 'decor', unlisted: true, interactions: [] },
  { id: 'sgRoadCases', name: '장비 로드케이스', price: 0, w: 2, h: 1, icon: '🎸', color: '#263238', category: 'decor', unlisted: true, interactions: [] },
  { id: 'sgBoxOffice', name: '매표소 · MD 부스', price: 0, w: 2, h: 1, icon: '💿', color: '#311b92', category: 'decor', unlisted: true, interactions: [] },
  {
    id: 'sgFanSignTable', name: '팬사인회 테이블', price: 0, w: 2, h: 1, icon: '✍️', color: '#f8bbd0', category: 'skill', unlisted: true,
    interactions: [
      { id: 'sgFanSign', label: '팬사인회 열기', icon: '✍️', duration: 30, effects: { social: 0.3, fun: 0.2 }, skill: { key: 'charisma', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
];
