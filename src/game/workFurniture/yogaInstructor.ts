import type { ObjectDef } from '../types';

/**
 * New furniture for the yoga and Pilates studio (2026-10-27 workplace pipeline, at the user's
 * request): what a Korean 요가·필라테스 스튜디오 has besides its mats and reformers — the mirror wall
 * with its barre the class checks its line in, the prop rack (blocks, straps, bolsters, rolled mats),
 * the singing-bowl corner a class ends at, the Cadillac (트랩 테이블) for one-to-one rehab, the 인바디
 * scale members are measured on, and the front desk where classes are booked. Drawn in
 * view3d/workplaces/yogaInstructor.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    id: 'ygMirrorWall', name: '전신 거울 벽·발레 바', price: 0, w: 3, h: 1, icon: '🪞', color: '#cfd8dc', category: 'skill', unlisted: true,
    interactions: [
      { id: 'ygMirrorCheck', label: '거울 보며 자세 점검하기', icon: '🪞', duration: 20, effects: { fun: 0.05 }, skill: { key: 'fitness', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'ygPropRack', name: '요가 소도구 선반', price: 0, w: 2, h: 1, icon: '🧱', color: '#d7ccc8', category: 'skill', unlisted: true,
    interactions: [
      { id: 'ygTidyProps', label: '블록·스트랩 정리하기', icon: '🧱', duration: 10, effects: { fun: -0.02 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'ygSoundCorner', name: '싱잉볼 명상 코너', price: 0, w: 2, h: 1, icon: '🔔', color: '#c9a74a', category: 'skill', unlisted: true,
    interactions: [
      { id: 'ygSoundBath', label: '싱잉볼 명상 이끌기', icon: '🔔', duration: 25, effects: { fun: 0.15, energy: 0.05 }, skill: { key: 'empathy', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'ygCadillac', name: '캐딜락 (트랩 테이블)', price: 0, w: 2, h: 1, icon: '🛏️', color: '#5d4037', category: 'skill', unlisted: true,
    interactions: [
      { id: 'ygCadillacRehab', label: '캐딜락 재활 동작 시범하기', icon: '🩹', duration: 30, effects: { energy: -0.1 }, skill: { key: 'medicine', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'ygInbody', name: '인바디 측정기', price: 0, w: 1, h: 1, icon: '📈', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'ygBodyScan', label: '인바디 결과 상담하기', icon: '📈', duration: 15, effects: { social: 0.1 }, skill: { key: 'medicine', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'ygFrontDesk', name: '스튜디오 안내 데스크', price: 0, w: 2, h: 1, icon: '🗓️', color: '#e8dcc8', category: 'skill', unlisted: true,
    interactions: [
      { id: 'ygBookClass', label: '수업 예약 받기', icon: '🗓️', duration: 15, effects: { social: 0.1 }, skill: { key: 'business', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  // The A-frame sign on the pavement by the door (2026-11-05, the layout audit: the studio is a 상가's ground floor on the street).
  { id: 'ygStreetSign', name: '스튜디오 입간판', price: 0, w: 1, h: 1, icon: '🪧', color: '#8d6e63', category: 'decor', unlisted: true, interactions: [] },
  // The changing room's lockers with the bench in front (2026-11-05, the layout audit).
  { id: 'ygLockerWall', name: '탈의실 락커', price: 0, w: 2, h: 1, icon: '🔐', color: '#d7b98e', category: 'decor', unlisted: true, interactions: [] },
];
