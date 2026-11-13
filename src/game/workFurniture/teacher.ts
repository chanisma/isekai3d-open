import type { ObjectDef } from '../types';

/**
 * New furniture for the elementary classroom (2026-10-27 workplace pipeline, at the user's request):
 * what a Korean 초등학교 교실 was missing to feel like one — the 교탁 the register is called at, the
 * class TV the lesson videos are put on, the 학급 게시판 with the timetable and the praise-sticker
 * chart, the pupils' 사물함 along the side wall and the 청소함 with the recycling bins. The ids start
 * `cls` so no other workplace's can clash with them. Drawn in src/view3d/workplaces/teacher.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    // The wooden lectern at the front, the register (출석부) and the textbook on its sloped top.
    id: 'clsLectern', name: '교탁', price: 0, w: 1, h: 1, icon: '🧑‍🏫', color: '#a1775a', category: 'skill', unlisted: true,
    interactions: [
      { id: 'clsTakeAttendance', label: '출석 부르기', icon: '📋', duration: 10, effects: { social: 0.1 }, skill: { key: 'charisma', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // The big TV on its wall bracket beside the board, an educational video on it in use.
    id: 'clsClassTv', name: '교실 TV', price: 0, w: 1, h: 1, icon: '📺', color: '#263238', category: 'skill', unlisted: true,
    interactions: [
      { id: 'clsPlayVideo', label: '교육 영상 틀어 주기', icon: '📺', duration: 25, effects: { fun: 0.1 }, skill: { key: 'charisma', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // The class notice board: the timetable, the praise-sticker chart, the class rules, the lunch menu, the pupils' drawings.
    id: 'clsNoticeBoard', name: '학급 게시판', price: 0, w: 2, h: 1, icon: '📌', color: '#c8a26b', category: 'skill', unlisted: true,
    interactions: [
      { id: 'clsPraiseChart', label: '칭찬 스티커 붙여 주기', icon: '⭐', duration: 10, effects: { social: 0.05, fun: 0.05 }, skill: { key: 'empathy', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  // The pupils' lockers (사물함): cubbies with name tags, bags, books and recorders in them.
  { id: 'clsLockers', name: '사물함', price: 0, w: 2, h: 1, icon: '🗄️', color: '#90caf9', category: 'decor', unlisted: true, interactions: [] },
  // The cleaning cupboard with brooms and a mop, the recycling bins beside it.
  { id: 'clsCleaningCorner', name: '청소함·분리수거함', price: 0, w: 2, h: 1, icon: '🧹', color: '#90a4ae', category: 'decor', unlisted: true, interactions: [] },
  {
    // The 교육지원청's board of the schools in its district (2026-11-04, the branch lots): each school, the 장학사 who has it, the
    // next 컨설팅 visit and any 사안 open, magnets for where things stand. A 장학사 looks after twenty-odd schools from it, and an
    // urgent report from one (a 학교폭력 case, an accident) is taken up here.
    id: 'edSchoolBoard', name: '관내 학교 현황판', price: 0, w: 2, h: 1, icon: '🏫', color: '#e8eef4', category: 'skill', unlisted: true,
    interactions: [
      { id: 'edVisitPlan', label: '찾아가는 컨설팅 일정 잡기', icon: '🗓️', duration: 25, effects: { fun: -0.03 }, skill: { key: 'writing', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
      { id: 'edSchoolIncident', label: '학교 긴급 사안 대응하기', icon: '🚨', duration: 40, effects: { energy: -0.15 }, skill: { key: 'leadership', rate: 1 / 60 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  // The school's fence and 정문 round the 운동장, drawn from the lot's south-west corner tile; walked over (2026-11-05, the layout audit).
  { id: 'clsSchoolGate', name: '학교 담장·정문', price: 0, w: 1, h: 1, icon: '🚧', color: '#4caf50', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  // The 배움터지킴이실 by the gate (2026-11-05, the layout audit).
  { id: 'clsGuardBooth', name: '배움터지킴이실', price: 0, w: 1, h: 1, icon: '🏠', color: '#eceff1', category: 'decor', unlisted: true, interactions: [] },
  // The 조회대 at the head of the 운동장 (2026-11-05, the layout audit).
  { id: 'clsMorningStand', name: '조회대', price: 0, w: 2, h: 1, icon: '🎤', color: '#bdbdbd', category: 'decor', unlisted: true, interactions: [] },
];
