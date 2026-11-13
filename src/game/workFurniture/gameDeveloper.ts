import type { ObjectDef } from '../types';

/**
 * New furniture for the game studio (2026-10-27 workplace pipeline, at the user's request): what the
 * 게임 회사 was missing — the build server in the dev floor's corner with its CI tower light, the QA
 * bench of phones and tablets every Korean mobile game is tested on before an update, the concept
 * artists' pen-display desk, the lobby's glass case of the studio's figures and awards, and the
 * pantry's snack bar (cup ramen, energy drinks) that gets a team through crunch. The ids start `gd`
 * (the game developer's) so no other workplace's can clash with them.
 */
export const OBJECTS: ObjectDef[] = [
  {
    id: 'gdBuildServer', name: '빌드 서버 랙', price: 0, w: 1, h: 1, icon: '🖥️', color: '#263238', category: 'skill', unlisted: true,
    interactions: [
      { id: 'gdDeployBuild', label: '빌드 배포하기', icon: '🚀', duration: 20, effects: { fun: -0.03 }, skill: { key: 'programming', rate: 1 / 130 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'gdDeviceRig', name: '디바이스 테스트 랙', price: 0, w: 2, h: 1, icon: '📱', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'gdDeviceTest', label: '모바일 기기 테스트하기', icon: '📱', duration: 25, effects: { fun: 0.05 }, skill: { key: 'videoGaming', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'gdArtStation', name: '원화 작업대', price: 0, w: 1, h: 1, icon: '🎨', color: '#37474f', category: 'skill', unlisted: true,
    interactions: [
      { id: 'gdReviewArt', label: '캐릭터 원화 피드백하기', icon: '🎨', duration: 25, effects: { fun: 0.1 }, skill: { key: 'painting', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  { id: 'gdFigureCase', name: '게임 피규어 진열장', price: 0, w: 2, h: 1, icon: '🏆', color: '#3949ab', category: 'decor', unlisted: true, interactions: [] },
  {
    id: 'gdSnackBar', name: '탕비실 간식바', price: 0, w: 2, h: 1, icon: '🍪', color: '#ffb74d', category: 'decor', unlisted: true,
    interactions: [
      { id: 'gdGrabSnack', chatty: true, label: '간식이랑 음료 챙기기', icon: '🥤', duration: 15, effects: { hunger: 2, fun: 0.1 }, requires: 'atWork', pose: 'front' },
    ],
  },
  // The floor's front (2026-11-05, the layout audit: the lobby was half the building): the reception counter inside the glass door
  // off the lift hall, the building's sign out on the pavement.
  { id: 'gdReception', name: '스타포지 안내 데스크', price: 0, w: 2, h: 1, icon: '🛎️', color: '#4527a0', category: 'decor', unlisted: true, interactions: [] },
  { id: 'gdTowerSign', name: '오피스 빌딩 간판', price: 0, w: 1, h: 1, icon: '🏢', color: '#4527a0', category: 'decor', unlisted: true, interactions: [] },
];
