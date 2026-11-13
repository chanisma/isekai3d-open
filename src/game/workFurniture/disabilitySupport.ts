import type { ObjectDef } from '../types';

/**
 * New furniture for the 장애인 복지관 (2026-10-27 workplace pipeline, at the user's request): what a
 * Korean disability welfare centre has besides the sensory room, the 보호작업장 benches, the walking
 * bars, the training kitchen and the van — the AAC 의사소통 보드 (a picture-symbol board and a talker
 * tablet), the 점자 · 큰글씨 reading corner, the 접근성 computer (big keys, a trackball, switches, a
 * screen reader), the 미술 치료 table where the users' paintings dry on a line, and the 촉지도 by the
 * door (the tactile map, the ramp and lift sign, the 점자블록 in front of it). Respectful and
 * empowering: the users are drawn doing things themselves, the worker beside them. Drawn in
 * view3d/workplaces/disabilitySupport.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    id: 'dsAacWall', name: '그림 상징 의사소통 보드', price: 0, w: 2, h: 1, icon: '💬', color: '#4fc3f7', category: 'skill', unlisted: true,
    interactions: [
      { id: 'dsAacTalk', label: '의사소통 보드로 대화하기', icon: '💬', duration: 25, effects: { social: 0.3 }, skill: { key: 'empathy', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'dsReadingNook', name: '점자 · 큰글씨 열람 코너', price: 0, w: 2, h: 1, icon: '⠿', color: '#ffe082', category: 'skill', unlisted: true,
    interactions: [
      { id: 'dsReadTogether', label: '점자책 함께 읽기', icon: '📖', duration: 30, effects: { social: 0.2, fun: 0.1 }, skill: { key: 'writing', rate: 1 / 130 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'dsAccessPc', name: '접근성 컴퓨터 자리', price: 0, w: 2, h: 1, icon: '⌨️', color: '#7986cb', category: 'skill', unlisted: true,
    interactions: [
      { id: 'dsPcCoach', label: '보조기기로 컴퓨터 쓰기 돕기', icon: '⌨️', duration: 30, effects: { social: 0.15, fun: 0.05 }, skill: { key: 'logic', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'dsArtTherapy', name: '미술 활동 테이블', price: 0, w: 2, h: 1, icon: '🎨', color: '#f48fb1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'dsArtTogether', label: '미술 활동 함께하기', icon: '🎨', duration: 30, effects: { fun: 0.2, social: 0.15 }, skill: { key: 'painting', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'dsAccessMap', name: '촉지도 · 경사로 안내판', price: 0, w: 1, h: 1, icon: '♿', color: '#fdd835', category: 'skill', unlisted: true,
    interactions: [
      { id: 'dsCheckAccess', label: '편의시설 점검하기', icon: '✅', duration: 15, effects: { fun: 0.02 }, skill: { key: 'handiness', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  // The drop-off at the front door (2026-11-04, the layout audit): a canopy hung off the building over the door and the kerb where
  // the centre's van stops, its posts along the wall so the van drives on clear, the tactile paving to the door, the marked bay.
  // Stood on the tile at its right end; the rest is drawn out to the left over the path, which stays open.
  { id: 'dsCanopy', name: '승하차장 캐노피', price: 0, w: 1, h: 1, icon: '🚏', color: '#90a4ae', category: 'decor', unlisted: true, interactions: [] },
];
