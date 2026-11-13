import type { ObjectDef } from '../types';

/**
 * New furniture for the 지하철 승무사업소 (2026-10-27 workplace pipeline, at the user's request): what
 * the crew depot was missing to feel like one — the 출근 점호대 where a driver reports in, salutes
 * the duty officer and blows into the 음주 측정기 before any run, the cab key cabinet the 마스콘 key is
 * signed out of, the 노선도 on the control room wall, the 안전 수칙 board with its 무사고 counter where
 * the 지적확인 환호응답 is drilled, and the crew lockers. Drawn in src/view3d/workplaces/subwayDriver.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    // The 출근 점호대: a counter with the duty officer behind it, the 음주 측정기 and the roll book on
    // it, the day's 승무 사업표 on the wall behind.
    id: 'sbRollCall', name: '출근 점호대', price: 0, w: 2, h: 1, icon: '🙋', color: '#283593', category: 'skill', unlisted: true,
    interactions: [
      { id: 'sbRollCall', label: '출근 점호 받기', icon: '🙋', duration: 15, effects: { social: 0.2 }, skill: { key: 'logic', rate: 1 / 160 }, requires: 'atWork', pose: 'front' },
      { id: 'sbBreathTest', label: '음주 측정하기', icon: '😮‍💨', duration: 10, effects: {}, skill: { key: 'fitness', rate: 1 / 220 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // The cab key cabinet: the 마스콘 keys and 역전기 handles on numbered hooks, signed out.
    id: 'sbKeyCabinet', name: '운전실 키 보관함', price: 0, w: 1, h: 1, icon: '🔑', color: '#78909c', category: 'skill', unlisted: true,
    interactions: [
      { id: 'sbTakeKey', label: '마스콘 키 수령하기', icon: '🔑', duration: 10, effects: {}, skill: { key: 'driving', rate: 1 / 200 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // The 노선도: the line, its stations and transfers, the depot, the crew's sections.
    id: 'sbLineMap', name: '노선도', price: 0, w: 2, h: 1, icon: '🗺️', color: '#2e7d32', category: 'skill', unlisted: true,
    interactions: [
      { id: 'sbStudyLine', label: '노선·신호 위치 숙지하기', icon: '🗺️', duration: 20, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // The 안전 수칙 board: the 지적확인 환호응답 poster, the rules, the 무사고 day counter.
    id: 'sbSafetyBoard', name: '안전 수칙 게시판', price: 0, w: 1, h: 1, icon: '👉', color: '#f9a825', category: 'skill', unlisted: true,
    interactions: [
      { id: 'sbSafetyDrill', label: '지적확인 환호응답 연습하기', icon: '👉', duration: 15, effects: { fun: 0.05 }, skill: { key: 'driving', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // The crew lockers: the uniform, the cap, the shoes.
    id: 'sbLocker', name: '승무원 사물함', price: 0, w: 2, h: 1, icon: '🧥', color: '#90a4ae', category: 'skill', unlisted: true,
    interactions: [
      { id: 'sbChangeUniform', label: '근무복·모자 갖추기', icon: '🧥', duration: 10, effects: { hygiene: 0.05 }, requires: 'atWork', pose: 'front' },
    ],
  },
  // The platform's screen doors (2026-11-04, the layout audit): glass panels and sliding pairs at each car door, the 정지 위치 mark and
  // the doors' control box at the platform's end where the cab stops.
  { id: 'sbScreenDoors', name: '스크린도어', price: 0, w: 21, h: 1, icon: '🚪', color: '#cfe8f3', category: 'decor', unlisted: true, interactions: [] },
  // The 관제센터's wall of the line (for the 관제 branch's own lot): every station and train on it, lit.
  { id: 'sbControlWall', name: '관제 노선 표시반', price: 0, w: 8, h: 1, icon: '🗺️', color: '#102030', category: 'decor', unlisted: true, interactions: [] },
];
