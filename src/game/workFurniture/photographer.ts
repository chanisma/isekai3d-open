import type { ObjectDef } from '../types';

/**
 * New furniture for the photo studio (2026-10-27 workplace pipeline, at the user's request): what a
 * Korean 사진관·스튜디오 has besides its backdrop, strobes and cameras — the posing stool the sitter
 * is shot on (a client waits on it and is photographed there), the product-shot table with its
 * light tent, a reflector on its stand, the props shelf (돌 한복, balloons, flower crowns…), the
 * client monitor in the lobby where the shots are picked together (셀렉), and the wall of sample
 * frames (가족사진, 웨딩, 프로필, 돌사진). The ids start `ph` so no other workplace's can clash with
 * them. Drawn in src/view3d/workplaces/photographer.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    // A chair to the 3D view's waiting seats (its id has 'Stool' in it): the client posing waits on it.
    id: 'phPosingStool', name: '포즈 스툴', price: 0, w: 1, h: 1, icon: '🪑', color: '#3e3e44', category: 'skill', unlisted: true,
    interactions: [
      { id: 'phStandIn', label: '조명 테스트 대역 앉아 주기', icon: '🧍', duration: 10, effects: { fun: 0.05 }, skill: { key: 'photography', rate: 1 / 200 }, requires: 'atWork', pose: 'on' },
    ],
  },
  {
    id: 'phProductTable', name: '제품 촬영 테이블', price: 0, w: 2, h: 1, icon: '🧴', color: '#f5f5f5', category: 'skill', unlisted: true,
    interactions: [
      { id: 'phStyleProduct', label: '제품 배치·연출하기', icon: '🧴', duration: 20, effects: { fun: 0.1 }, skill: { key: 'painting', rate: 1 / 140 }, requires: 'atWork', pose: 'front' },
      { id: 'shootProducts', label: '제품 사진 찍기', icon: '📷', duration: 35, effects: { fun: 0.15 }, skill: { key: 'photography', rate: 1 / 80 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'phReflector', name: '반사판 스탠드', price: 0, w: 1, h: 1, icon: '☀️', color: '#cfd8dc', category: 'skill', unlisted: true,
    interactions: [
      { id: 'phAngleReflector', label: '반사판 각도 잡기', icon: '☀️', duration: 10, effects: { fun: 0.02 }, skill: { key: 'photography', rate: 1 / 160 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'phPropShelf', name: '촬영 소품 선반', price: 0, w: 2, h: 1, icon: '🎈', color: '#d7ccc8', category: 'skill', unlisted: true,
    interactions: [
      { id: 'phPickProps', label: '촬영 소품 고르기', icon: '🎈', duration: 15, effects: { fun: 0.1 }, skill: { key: 'painting', rate: 1 / 160 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'phSelectMonitor', name: '사진 셀렉 모니터', price: 0, w: 2, h: 1, icon: '🖥️', color: '#263238', category: 'skill', unlisted: true,
    interactions: [
      { id: 'phShotSelect', label: '손님과 사진 셀렉하기', icon: '💕', duration: 25, effects: { social: 0.2 }, skill: { key: 'charisma', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  { id: 'phSampleWall', name: '액자 샘플 진열대', price: 0, w: 2, h: 1, icon: '🖼️', color: '#5d4037', category: 'decor', unlisted: true, interactions: [] },
  // The front counter and the glass front on the street (2026-11-05, the layout audit; view3d/workplaces/shopFront.ts).
  { id: 'phCounter', name: '사진관 상담 카운터', price: 0, w: 2, h: 1, icon: '📒', color: '#4e342e', category: 'decor', unlisted: true, interactions: [] },
  { id: 'phShopFront', name: '사진관 유리 정면·간판', price: 0, w: 1, h: 1, icon: '🪧', color: '#212121', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
];
