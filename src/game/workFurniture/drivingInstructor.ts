import type { ObjectDef } from '../types';

/**
 * New furniture for the 운전면허학원 (2026-10-27 workplace pipeline, at the user's request): what the
 * school was missing to feel like one — the 기능시험 course painted on the yard (T자·S자, the 경사로,
 * the crossing), its traffic light, the 도로주행 course map the instructor briefs from, the 합격자
 * board by the gate, and indoors a driving simulator and a 학과시험 practice kiosk. Drawn in
 * src/view3d/workplaces/drivingInstructor.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    // The 기능시험 course painted on asphalt: walked over, not round (like a dance floor).
    id: 'diCourse', name: '기능시험 코스', price: 0, w: 9, h: 4, icon: '🛣️', color: '#4a4f55', category: 'decor', unlisted: true,
    interactions: [], walkable: true,
  },
  {
    // A Korean four-lamp traffic light on its pole at the course's crossing, cycling.
    id: 'diTrafficLight', name: '코스 신호등', price: 0, w: 1, h: 1, icon: '🚦', color: '#37474f', category: 'decor', unlisted: true,
    interactions: [],
  },
  {
    // The 도로주행 course map: the four test routes through town, briefed before a road lesson.
    id: 'diRouteMap', name: '도로주행 코스 안내판', price: 0, w: 2, h: 1, icon: '🗺️', color: '#1565c0', category: 'skill', unlisted: true,
    interactions: [
      { id: 'diRouteBrief', shared: true, chatty: true, label: '도로주행 코스 설명하기', icon: '🗺️', duration: 25, effects: { social: 0.3 }, skill: { key: 'law', rate: 1 / 120 }, range: 2, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // The 합격자 board by the gate: this week's passes, the pass rate, a 축 합격 banner.
    id: 'diPassBoard', name: '합격자 게시판', price: 0, w: 2, h: 1, icon: '🎉', color: '#c62828', category: 'skill', unlisted: true,
    interactions: [
      { id: 'diPostPasses', label: '합격자 명단 게시하기', icon: '🎉', duration: 10, effects: { fun: 0.1 }, skill: { key: 'business', rate: 1 / 200 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // A driving simulator: a bucket seat, wheel, pedals and gear stick before three screens.
    id: 'diSimulator', name: '운전 시뮬레이터', price: 0, w: 2, h: 1, icon: '🕹️', color: '#263238', category: 'skill', unlisted: true,
    interactions: [
      { id: 'diSimLesson', label: '시뮬레이터 교육하기', icon: '🕹️', duration: 25, effects: { social: 0.2 }, skill: { key: 'charisma', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
      { id: 'diSimDemo', label: '시뮬레이터 시범 운전하기', icon: '🚗', duration: 20, effects: { fun: 0.1 }, skill: { key: 'driving', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  // The school laid out as one (2026-11-05, the layout audit): the yard paved and its 기능 course a loop round it (the lanes, the
  // arrows, 출발 and 종료, the 가속 구간, the crossing; held by a corner tile and drawn from there, walked over), the 경사로 on the loop,
  // the fence with the gate the road-test car leaves by, the shaded bench where students wait their turn at the start, and upstairs
  // the 관제실 desk the examiner watches and scores the 기능시험 from.
  {
    id: 'diControlDesk', name: '관제실 검정 데스크', price: 0, w: 1, h: 1, icon: '🖥️', color: '#cfd8dc', category: 'skill', unlisted: true,
    interactions: [{ id: 'superviseExam', label: '기능 시험 감독하기', icon: '📋', duration: 40, effects: { fun: -0.05 }, skill: { key: 'logic', rate: 1 / 60 }, requires: 'workAlarm', pose: 'front' }],
  },
  { id: 'diCircuit', name: '장내 기능 코스', price: 0, w: 1, h: 1, icon: '🛣️', color: '#ffffff', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'diYardFence', name: '학원 울타리·정문', price: 0, w: 1, h: 1, icon: '🚧', color: '#5f7d6a', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'diHill', name: '경사로', price: 0, w: 2, h: 3, icon: '🛣️', color: '#9e9e9e', category: 'decor', unlisted: true, interactions: [] },
  { id: 'diWaitShelter', name: '출발선 대기 벤치', price: 0, w: 3, h: 1, icon: '🪑', color: '#1565c0', category: 'decor', unlisted: true, interactions: [] },
  {
    // A 학과시험 practice kiosk: a touch screen of the written test's questions.
    id: 'diTestKiosk', name: '학과시험 연습 키오스크', price: 0, w: 1, h: 1, icon: '📝', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'diKioskGuide', label: '학과시험 연습 안내하기', icon: '📝', duration: 15, effects: { social: 0.1 }, skill: { key: 'law', rate: 1 / 130 }, requires: 'atWork', pose: 'front' },
    ],
  },
];
