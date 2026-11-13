import type { ObjectDef } from '../types';

/**
 * New furniture for the 국공립 어린이집 (2026-10-27 workplace pipeline, at the user's request): what a
 * Korean daycare has besides the story corner, the craft table, the block mats, the snack counter and
 * the nap mats — the cubbies by the door (a shoe shelf, a hook and a name tag for each child), the
 * 출석 · 알림 board where each child gets a sticker as they come in, the little row of sinks for
 * handwashing, an indoor slide, and the blackout curtain and night light of the nap room. The centre
 * (구립 새싹어린이집), its classes and every child's name on them are made up. Drawn in
 * view3d/workplaces/childcareTeacher.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    id: 'ccCubbies', name: '개인 사물함 · 신발장', price: 0, w: 2, h: 1, icon: '🎒', color: '#ffe0b2', category: 'skill', unlisted: true,
    interactions: [
      { id: 'ccTidyCubbies', label: '사물함 · 신발 정리하기', icon: '🎒', duration: 15, effects: { fun: -0.03 }, skill: { key: 'empathy', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'ccAttendanceBoard', name: '출석 · 알림 게시판', price: 0, w: 1, h: 1, icon: '🌟', color: '#fff59d', category: 'skill', unlisted: true,
    interactions: [
      { id: 'ccTakeAttendance', label: '출석 스티커 붙이기', icon: '🌟', duration: 15, effects: { fun: 0.05 }, skill: { key: 'charisma', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'ccKidSink', name: '유아용 세면대', price: 0, w: 2, h: 1, icon: '🧼', color: '#b2ebf2', category: 'skill', unlisted: true,
    interactions: [
      { id: 'ccWashHands', label: '손 씻기 지도하기', icon: '🧼', duration: 15, effects: { hygiene: 0.05, social: 0.1 }, skill: { key: 'charisma', rate: 1 / 140 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'ccSlide', name: '실내 미끄럼틀', price: 0, w: 1, h: 2, icon: '🛝', color: '#ff8a65', category: 'skill', unlisted: true,
    interactions: [
      { id: 'ccSpotSlide', label: '미끄럼틀 놀이 지켜보기', icon: '🛝', duration: 20, effects: { fun: 0.25, energy: -0.05 }, skill: { key: 'fitness', rate: 1 / 160 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'ccChangingTable', name: '기저귀 교환대 · 세면대', price: 0, w: 2, h: 1, icon: '🧷', color: '#b2dfdb', category: 'skill', unlisted: true,
    interactions: [
      { id: 'ccCleanChangeTable', label: '교환대 소독하고 기저귀 채우기', icon: '🧴', duration: 15, effects: { hygiene: 0.05, fun: -0.03 }, skill: { key: 'empathy', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'ccLunchCart', name: '배식 카트 · 점심 식탁', price: 0, w: 3, h: 2, icon: '🍚', color: '#ffe0b2', category: 'skill', unlisted: true,
    interactions: [
      { id: 'ccSetLunchCart', label: '배식 카트 준비하기', icon: '🍚', duration: 15, effects: { fun: 0.05 }, skill: { key: 'cooking', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  // The centre redone as a real one (2026-11-04, the layout audit): the low potties of the children's toilets, the bedding
  // cupboard each room keeps (the children sleep on the floor of their own room), the playground's climbing frame and sandpit
  // and its fence, the outside fire escape from the upper floor, and the shuttle van with its 어린이 승하차 sign.
  {
    id: 'ccToddlerToilet', name: '유아용 변기 · 칸막이', price: 0, w: 2, h: 1, icon: '🚽', color: '#b3e5fc', category: 'skill', unlisted: true,
    interactions: [
      { id: 'ccPottyHelp', label: '배변 도와주기', icon: '🚽', duration: 15, effects: { hygiene: 0.03, fun: -0.03 }, skill: { key: 'empathy', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'ccBeddingCloset', name: '낮잠 이불장', price: 0, w: 2, h: 1, icon: '🛏️', color: '#ffe0b2', category: 'skill', unlisted: true,
    interactions: [
      { id: 'ccLayBedding', label: '낮잠 이불 깔고 개기', icon: '🛏️', duration: 15, effects: { fun: -0.03 }, skill: { key: 'empathy', rate: 1 / 160 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'ccPlayStructure', name: '조합 놀이대', price: 0, w: 3, h: 3, icon: '🛝', color: '#ffb74d', category: 'skill', unlisted: true,
    interactions: [
      { id: 'ccWatchOutdoor', label: '바깥 놀이 지켜보기', icon: '👀', duration: 20, effects: { fun: 0.15, energy: -0.03 }, skill: { key: 'fitness', rate: 1 / 160 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'ccSandbox', name: '모래 놀이장', price: 0, w: 2, h: 2, icon: '🏖️', color: '#ffe082', category: 'skill', unlisted: true,
    interactions: [
      { id: 'ccSandPlay', label: '모래 놀이 함께하기', icon: '🏖️', duration: 20, effects: { fun: 0.2 }, skill: { key: 'charisma', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'ccShuttleVan', name: '어린이 통학차량', price: 0, w: 3, h: 1, icon: '🚐', color: '#fdd835', category: 'skill', unlisted: true,
    interactions: [
      { id: 'ccShuttleCheck', label: '통학차량 하차 확인하기', icon: '🚐', duration: 15, effects: { fun: -0.02 }, skill: { key: 'logic', rate: 1 / 160 }, requires: 'atWork', pose: 'front' },
    ],
  },
  { id: 'ccPlayFence', name: '놀이터 울타리', price: 0, w: 1, h: 1, icon: '🚧', color: '#a5d6a7', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'ccFireStair', name: '옥외 피난계단', price: 0, w: 1, h: 4, icon: '🪜', color: '#90a4ae', category: 'decor', unlisted: true, interactions: [] },
  {
    id: 'ccNapCurtain', name: '낮잠방 암막 커튼 · 수면등', price: 0, w: 1, h: 1, icon: '🌙', color: '#7986cb', category: 'decor', unlisted: true,
    interactions: [],
  },
];
