import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 승무원 브리핑 센터 (2026-10-31 workplace pipeline, at the user's request): what
 * a cabin-crew centre has besides its cabin mock-up, door trainer and safety kit — a galley with its
 * cart bay, brewer and oven, the flight screen and the briefing table with its quiz tablets, the crew
 * lockers and carry-on bags, the grooming corner (uniform rail, lit mirror, 점검표) and the lobby's
 * departures board. The airline (한누리항공) and its routes are made up. Drawn in
 * view3d/workplaces/flightAttendant.ts (with flightAttendantMotion.ts).
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
  {
    id: 'faGalley', name: '기내 갤리', price: 0, w: 3, h: 1, icon: '☕', color: '#cfd8dc', category: 'skill', unlisted: true,
    interactions: [job('faLoadCart', '서비스 카트 채우기', '🛒', 20, { fun: -0.05 }, 'empathy', 130)],
  },
  { id: 'faBriefBoard', name: '비행 브리핑 스크린', price: 0, w: 3, h: 1, icon: '🖥️', color: '#1d2f4f', category: 'skill', unlisted: true, interactions: [] },
  {
    id: 'faBriefTable', name: '브리핑 테이블', price: 0, w: 3, h: 2, icon: '📋', color: '#5d6d7e', category: 'skill', unlisted: true,
    interactions: [
      job('faPreflightBrief', '비행 전 브리핑 듣기', '🗣️', 30, { social: 0.3 }, 'charisma', 150),
      job('faFlightQuiz', '비행 전 퀴즈 풀기', '📝', 20, { fun: -0.05 }, 'logic', 130),
    ],
  },
  {
    id: 'faCrewLocker', name: '승무원 라커', price: 0, w: 3, h: 1, icon: '🧳', color: '#37507a', category: 'skill', unlisted: true,
    interactions: [job('faPackBag', '비행 가방 꾸리기', '🧳', 15, { fun: -0.03 }, 'logic', 170)],
  },
  {
    id: 'faGroomCorner', name: '그루밍 코너', price: 0, w: 3, h: 1, icon: '🪞', color: '#b0446a', category: 'skill', unlisted: true,
    interactions: [job('faGroomCheck', '유니폼·스카프 점검하기', '🪞', 15, { fun: 0.1 }, 'charisma', 150)],
  },
  { id: 'faFlightBoard', name: '출발 안내판', price: 0, w: 2, h: 1, icon: '🛫', color: '#1d2f4f', category: 'decor', unlisted: true, interactions: [] },
  // The 운항승무원센터 as one is (2026-11-05, the layout audit): the show-up desk, the airport beyond the back fence, the front.
  {
    id: 'faShowUpDesk', name: '쇼업 데스크', price: 0, w: 3, h: 1, icon: '🪪', color: '#17325c', category: 'skill', unlisted: true,
    interactions: [job('faShowUp', '쇼업하기 (출근 확인·음주 측정)', '🪪', 10, { fun: -0.02 }, 'logic', 200)],
  },
  { id: 'faApronView', name: '공항 계류장 펜스', price: 0, w: 1, h: 1, icon: '✈️', color: '#90a4ae', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'faFront', name: '운항승무원센터 정면·간판', price: 0, w: 1, h: 1, icon: '🛫', color: '#17325c', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
];
