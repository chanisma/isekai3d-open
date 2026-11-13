import type { ObjectDef } from '../types';

/**
 * New furniture for the wedding consultancy (2026-10-27 workplace pipeline, at the user's request):
 * what a Korean 웨딩 컨설팅 has besides its consultation tables — the loveseat a couple sits in across
 * the table from the planner, the 스드메 (studio · dress · make-up) package board with its sample
 * photos and prices, the week's 예식 schedule board for the halls, the cabinet of hall photo albums
 * and invitation samples in the lobby, the dress-fitting podium with its three-way mirror in the
 * showroom, and a guest table laid as a sample. Drawn in view3d/workplaces/weddingPlanner.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    // A couple waits here and is consulted across the table (a sofa: a seat a tile).
    id: 'wpCoupleSofa', name: '예비 부부 상담 소파', price: 0, w: 2, h: 1, icon: '🛋️', color: '#f3e5f5', category: 'decor', unlisted: true,
    interactions: [],
  },
  {
    id: 'wpPackageBoard', name: '스드메 패키지 보드', price: 0, w: 2, h: 1, icon: '📸', color: '#fce4ec', category: 'skill', unlisted: true,
    interactions: [
      { id: 'wpSwapSamples', label: '스드메 샘플 사진 교체하기', icon: '📸', duration: 15, effects: { fun: 0.1 }, skill: { key: 'painting', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'wpScheduleBoard', name: '예식 일정 보드', price: 0, w: 2, h: 1, icon: '🗓️', color: '#fafafa', category: 'skill', unlisted: true,
    interactions: [
      { id: 'wpCheckSchedule', label: '이번 주 예식 일정 정리하기', icon: '🗓️', duration: 15, effects: { fun: -0.03 }, skill: { key: 'leadership', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'wpAlbumShelf', name: '웨딩홀 앨범·청첩장 샘플장', price: 0, w: 2, h: 1, icon: '💌', color: '#efebe9', category: 'skill', unlisted: true,
    interactions: [
      { id: 'wpPickInvitation', label: '청첩장 샘플 고르기', icon: '💌', duration: 15, effects: { fun: 0.1 }, skill: { key: 'painting', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'wpFittingPodium', name: '드레스 피팅 단상', price: 0, w: 2, h: 2, icon: '👰', color: '#fff8f0', category: 'skill', unlisted: true,
    interactions: [
      { id: 'wpDressFitting', label: '드레스 피팅 봐 주기', icon: '👰', duration: 20, effects: { fun: 0.15 }, skill: { key: 'charisma', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'wpTableSetting', name: '하객 테이블 세팅 샘플', price: 0, w: 2, h: 2, icon: '🍽️', color: '#fffaf0', category: 'skill', unlisted: true,
    interactions: [
      { id: 'wpSetTable', label: '하객 테이블 세팅하기', icon: '🍽️', duration: 20, effects: { fun: 0.1 }, skill: { key: 'painting', rate: 1 / 130 }, requires: 'atWork', pose: 'front' },
    ],
  },
  // The 웨딩 컨설팅 on its street (2026-11-05, the layout audit): the front desk by the door, the front.
  { id: 'wpFrontDesk', name: '안내 데스크', price: 0, w: 2, h: 1, icon: '💐', color: '#ffffff', category: 'decor', unlisted: true, interactions: [] },
  { id: 'wpFront', name: '웨딩 컨설팅 유리 정면·간판', price: 0, w: 1, h: 1, icon: '💒', color: '#f8bbd0', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
];
