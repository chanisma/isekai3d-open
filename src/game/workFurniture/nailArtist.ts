import type { ObjectDef } from '../types';

/**
 * New furniture for the nail shop (2026-10-27 workplace pipeline, at the user's request): what a
 * Korean 네일숍 has besides its nail tables, colour wall and pedicure chairs — the wall of nail-art
 * sample tips the client picks from (this month's art, the season's colours, the bridal set), the
 * UV steriliser and the disinfectant jar the nippers and pushers go into, the clear drawer tower of
 * parts (stones, studs, pearls, stickers, glitter), the waiting loveseat with the design book, and
 * the reception desk with the booking tablet. Drawn in view3d/workplaces/nailArtist.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    id: 'naArtWall', name: '네일 아트 샘플 월', price: 0, w: 2, h: 1, icon: '🖼️', color: '#fce4ec', category: 'skill', unlisted: true,
    interactions: [
      { id: 'naUpdateSamples', label: '이달의 아트 샘플 만들기', icon: '💅', duration: 25, effects: { fun: 0.15 }, skill: { key: 'painting', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'naSterilizer', name: '네일 도구 소독기', price: 0, w: 1, h: 1, icon: '🧼', color: '#f5f5f5', category: 'skill', unlisted: true,
    interactions: [
      { id: 'naSterilizeTools', label: '니퍼·푸셔 소독하기', icon: '🧼', duration: 10, effects: { hygiene: 0.02 }, skill: { key: 'handiness', rate: 1 / 170 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'naPartsDrawer', name: '파츠 서랍장', price: 0, w: 1, h: 1, icon: '💎', color: '#e1f5fe', category: 'skill', unlisted: true,
    interactions: [
      { id: 'naSortParts', label: '스톤·파츠 정리하기', icon: '💎', duration: 15, effects: { fun: 0.05 }, skill: { key: 'painting', rate: 1 / 160 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'naWaitSofa', name: '대기 소파', price: 0, w: 2, h: 1, icon: '🛋️', color: '#f8bbd0', category: 'decor', unlisted: true,
    interactions: [],
  },
  {
    id: 'naReception', name: '네일숍 안내 데스크', price: 0, w: 2, h: 1, icon: '📅', color: '#fafafa', category: 'skill', unlisted: true,
    interactions: [
      { id: 'naBooking', label: '예약 확인·관리하기', icon: '📅', duration: 15, effects: { fun: -0.02 }, skill: { key: 'business', rate: 1 / 140 }, requires: 'atWork', pose: 'front' },
    ],
  },
  // The street front and the units either side along the row (2026-11-05, the layout audit).
  { id: 'naShopFront', name: '네일숍 유리 정면·간판', price: 0, w: 1, h: 1, icon: '🪧', color: '#ad1457', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'naNeighborA', name: '이웃 반찬 가게', price: 0, w: 5, h: 8, icon: '🏪', color: '#efe3cf', category: 'decor', unlisted: true, interactions: [] },
  { id: 'naNeighborB', name: '이웃 미용실', price: 0, w: 6, h: 8, icon: '🏪', color: '#e3dde8', category: 'decor', unlisted: true, interactions: [] },
];
