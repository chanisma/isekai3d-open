import type { ObjectDef } from '../types';

/**
 * New furniture for the make-up shop (2026-10-27 workplace pipeline, at the user's request): what a
 * Korean 메이크업 숍 has besides its vanities — the tall make-up chair a client sits in to be made up
 * or talked through her skin tone, the ring-light consultation table it faces (the shade cards, the
 * personal-colour drapes, the tablet the finished look goes up on), the UV steriliser the brushes go
 * into after washing, the glass cabinet of the shop's own cosmetics, and in the bridal room the gown
 * and veil on their dress form with the tiaras. Drawn in view3d/workplaces/makeupArtist.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    id: 'muClientChair', name: '메이크업 의자', price: 0, w: 1, h: 1, icon: '💺', color: '#2b2b30', category: 'decor', unlisted: true,
    interactions: [],
  },
  {
    id: 'muRingDesk', name: '링라이트 상담 테이블', price: 0, w: 2, h: 1, icon: '💡', color: '#fafafa', category: 'skill', unlisted: true,
    interactions: [
      { id: 'muPortfolioPost', label: '메이크업 포트폴리오 올리기', icon: '📱', duration: 15, effects: { fun: 0.1 }, skill: { key: 'charisma', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
      { id: 'muDrapeKit', label: '퍼스널 컬러 드레이프 고르기', icon: '🌈', duration: 15, effects: { fun: 0.05 }, skill: { key: 'painting', rate: 1 / 130 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'muBrushSterilizer', name: 'UV 브러시 소독기', price: 0, w: 1, h: 1, icon: '🧼', color: '#f5f5f5', category: 'skill', unlisted: true,
    interactions: [
      { id: 'muSterilizeBrushes', label: '브러시 UV 소독하기', icon: '🧼', duration: 10, effects: { hygiene: 0.02 }, skill: { key: 'handiness', rate: 1 / 170 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'muProductDisplay', name: '화장품 진열장', price: 0, w: 2, h: 1, icon: '💄', color: '#fce4ec', category: 'skill', unlisted: true,
    interactions: [
      { id: 'muRestockCosmetics', label: '화장품 진열 정리하기', icon: '🧴', duration: 15, effects: { fun: 0.02 }, skill: { key: 'painting', rate: 1 / 170 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'muBridalCorner', name: '웨딩드레스·베일 코너', price: 0, w: 2, h: 1, icon: '👰', color: '#ffffff', category: 'skill', unlisted: true,
    interactions: [
      { id: 'muFitVeil', label: '베일·티아라 맞춰 보기', icon: '👑', duration: 15, effects: { fun: 0.15 }, skill: { key: 'charisma', rate: 1 / 140 }, requires: 'atWork', pose: 'front' },
    ],
  },
  // The street front, the desk and the unit next door (2026-11-05, the layout audit; view3d/workplaces/shopFront.ts).
  { id: 'muShopFront', name: '메이크업 숍 유리 정면·간판', price: 0, w: 1, h: 1, icon: '🪧', color: '#ad1457', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'muReception', name: '메이크업 숍 안내 데스크', price: 0, w: 2, h: 1, icon: '🛎️', color: '#f8f1f4', category: 'decor', unlisted: true, interactions: [] },
  { id: 'muNeighbor', name: '이웃 웨딩 드레스숍', price: 0, w: 5, h: 12, icon: '🏪', color: '#eee4ea', category: 'decor', unlisted: true, interactions: [] },
];
