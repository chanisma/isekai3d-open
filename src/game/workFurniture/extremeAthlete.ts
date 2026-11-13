import type { ObjectDef } from '../types';

/**
 * New furniture for the extreme sports centre (2026-10-27 workplace pipeline, at the user's request):
 * what a 익스트림 스포츠 센터 has besides its rope wall, halfpipe, wind tunnel and rigging bench — a
 * bouldering wall over its crash mats, an in-ground trampoline pit, the rental counter where the
 * 체험객 get their climbing shoes and harnesses, the helmet and harness rack, and the replay screen a
 * run is gone through on. Drawn in view3d/workplaces/extremeAthlete.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    id: 'exBoulderWall', name: '볼더링 벽', price: 0, w: 3, h: 2, icon: '🧗', color: '#5c6bc0', category: 'skill', unlisted: true,
    interactions: [
      { id: 'exBoulderProblem', label: '볼더링 문제 풀기', icon: '🧗', duration: 25, effects: { fun: 0.3, energy: -0.25, hygiene: -0.2 }, skill: { key: 'fitness', rate: 1 / 75 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'exTrampoline', name: '트램펄린 핏', price: 0, w: 2, h: 2, icon: '🤸', color: '#1e88e5', category: 'skill', unlisted: true,
    interactions: [
      { id: 'exTrampolineDrill', label: '트램펄린 공중 동작 훈련', icon: '🤸', duration: 20, effects: { fun: 0.45, energy: -0.25 }, skill: { key: 'fitness', rate: 1 / 80 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'exRentalCounter', name: '장비 대여 카운터', price: 0, w: 2, h: 1, icon: '🥾', color: '#ff7043', category: 'skill', unlisted: true,
    interactions: [
      { id: 'exRentGear', label: '체험객 장비 대여해 주기', icon: '🥾', duration: 12, effects: { social: 0.08, fun: 0.02 }, skill: { key: 'logic', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'exHelmetRack', name: '헬멧·하네스 거치대', price: 0, w: 1, h: 1, icon: '⛑️', color: '#fdd835', category: 'skill', unlisted: true,
    interactions: [
      { id: 'exGearUp', label: '안전 장비 착용하기', icon: '⛑️', duration: 8, effects: { fun: 0.02 }, skill: { key: 'logic', rate: 1 / 200 }, requires: 'atWork', pose: 'front' },
    ],
  },
  // The centre as a climbing gym with its skate park out of doors (2026-11-05, the layout audit): the jump is made at an airfield,
  // so the team's van takes the skydivers there and back (no plane on the lot); the park's fun box with its grind rail, and its fence.
  {
    id: 'exCrewVan', name: '스카이다이빙 팀 승합차', price: 0, w: 2, h: 1, icon: '🚐', color: '#1565c0', category: 'skill', unlisted: true,
    interactions: [
      { id: 'skydiveJump', label: '비행장으로 가서 스카이다이빙 점프하기', icon: '🪂', duration: 60, effects: { fun: 0.6, energy: -0.2 }, skill: { key: 'fitness', rate: 1 / 60 }, requires: 'workAlarm', offLot: true, pose: 'front' },
    ],
  },
  { id: 'exFunBox', name: '펀박스·그라인드 레일', price: 0, w: 3, h: 2, icon: '🛹', color: '#90a4ae', category: 'decor', unlisted: true, interactions: [] },
  { id: 'exParkFence', name: '스케이트 파크 펜스', price: 0, w: 1, h: 1, icon: '🚧', color: '#5f7d6a', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  {
    id: 'exReplayScreen', name: '영상 분석 스크린', price: 0, w: 2, h: 1, icon: '📹', color: '#263238', category: 'skill', unlisted: true,
    interactions: [
      { id: 'exReviewReplay', label: '기술 영상 분석하기', icon: '📹', duration: 20, effects: { fun: 0.1 }, skill: { key: 'logic', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
];
