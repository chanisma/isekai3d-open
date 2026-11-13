import type { ObjectDef } from '../types';

/**
 * New furniture for the music academy (2026-10-27 workplace pipeline, at the user's request): what a
 * Korean 음악학원 has besides its grands and theory desks — the soundproofed practice rooms with an
 * upright in each and a window in the door (the teacher looks in on the practising, or practises in
 * an empty one), the 오선 whiteboard theory is taught at, the music stand and metronome an ensemble is
 * conducted from, the wall of rental instruments (violins in three sizes, guitars, a ukulele, the
 * recorders and melodicas), the glass case of 콩쿠르 trophies and certificates in the lobby, and the
 * recital corner with its curtain and banner where the 발표회 is hosted. The ids start `mt` so no
 * other workplace's can clash with them. Drawn in src/view3d/workplaces/musicTeacher.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    id: 'mtPracticeRoom', name: '피아노 연습실 (방음 부스)', price: 0, w: 2, h: 2, icon: '🚪', color: '#efe4d2', category: 'skill', unlisted: true,
    interactions: [
      { id: 'mtPracticeCheck', label: '연습실 돌며 연습 봐 주기', icon: '📒', duration: 20, effects: { social: 0.1 }, skill: { key: 'empathy', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
      { id: 'mtSoloPractice', label: '빈 연습실에서 개인 연습하기', icon: '🎹', duration: 30, effects: { fun: 0.1 }, skill: { key: 'piano', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'mtTheoryBoard', name: '오선 화이트보드', price: 0, w: 2, h: 1, icon: '🎼', color: '#f5f5f5', category: 'skill', unlisted: true,
    interactions: [
      { id: 'mtTheoryClass', label: '오선 보드로 이론 수업하기', icon: '🎼', duration: 30, effects: { social: 0.2, energy: -0.05 }, skill: { key: 'piano', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'mtConductStand', name: '보면대·메트로놈', price: 0, w: 1, h: 1, icon: '🎵', color: '#263238', category: 'skill', unlisted: true,
    interactions: [
      { id: 'mtConductEnsemble', label: '메트로놈 맞춰 합주 지휘하기', icon: '🎵', duration: 30, effects: { fun: 0.15, energy: -0.05 }, skill: { key: 'violin', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'mtInstrumentWall', name: '대여 악기 벽', price: 0, w: 2, h: 1, icon: '🎻', color: '#d7b98e', category: 'skill', unlisted: true,
    interactions: [
      { id: 'mtStringCare', label: '바이올린 줄 갈고 손질하기', icon: '🎻', duration: 20, effects: { fun: 0.05 }, skill: { key: 'violin', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  // The glass case of 콩쿠르 trophies, medals and certificates, the recital photo over it.
  { id: 'mtTrophyShelf', name: '콩쿠르 트로피·상장 진열장', price: 0, w: 2, h: 1, icon: '🏆', color: '#6d4c41', category: 'decor', unlisted: true, interactions: [] },
  // The academy in its 상가 (2026-11-05, the layout audit): the 신발장 inside the door, where pupils change into slippers, and the
  // A-frame sign out on the pavement pointing up the stairs. Only drawn.
  { id: 'mtShoeRack', name: '신발장', price: 0, w: 2, h: 1, icon: '🎒', color: '#d7b98e', category: 'decor', unlisted: true, interactions: [] },
  { id: 'mtStreetSign', name: '학원 입간판', price: 0, w: 1, h: 1, icon: '🪧', color: '#4a148c', category: 'decor', unlisted: true, interactions: [] },
  {
    id: 'mtRecitalCorner', name: '발표회 무대 코너', price: 0, w: 3, h: 2, icon: '🎤', color: '#8e2430', category: 'skill', unlisted: true,
    interactions: [
      { id: 'mtHostRecital', label: '발표회 사회 보기', icon: '🎤', duration: 30, effects: { social: 0.2, fun: 0.1 }, skill: { key: 'empathy', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
];
