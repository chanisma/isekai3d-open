import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 어항 (2026-11-01 workplace pipeline, at the user's request): the harbour's water and quay
 * themselves, what a small fishing port keeps along them: crab pots and floats, an ice plant, a frame of drying
 * squid, a tide board with its wind cups and warning flag, a board of the morning's prices, a tank of live fish,
 * and the harbour office's desk with its radio. The boat, the racks, the crates and the auction floor are in
 * catalogKorea.ts. Drawn in view3d/workplaces/fisher.ts (with fisherMotion.ts).
 */
const job = (id: string, label: string, icon: string, duration: number, effects: InteractionDef['effects'], key: NonNullable<InteractionDef['skill']>['key'], rate: number): InteractionDef => ({
  id,
  label,
  icon,
  duration,
  effects,
  skill: { key, rate: 1 / rate },
  requires: 'atWork',
  pose: 'front',
});

export const OBJECTS: ObjectDef[] = [
  { id: 'fhHarbour', name: '항구', price: 0, w: 16, h: 2, icon: '🌊', color: '#2f7f9e', category: 'decor', unlisted: true, interactions: [] },
  { id: 'fhQuay', name: '부두', price: 0, w: 16, h: 13, icon: '⚓', color: '#bdb9ae', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'fhFloats', name: '부표 더미', price: 0, w: 1, h: 1, icon: '🎈', color: '#ef6c00', category: 'decor', unlisted: true, interactions: [] },
  {
    id: 'fhPots', name: '통발 더미', price: 0, w: 2, h: 1, icon: '🎣', color: '#4f8fbf', category: 'skill', unlisted: true,
    interactions: [job('fhBaitPots', '통발 미끼 갈아 끼우기', '🎣', 20, { hygiene: -0.1 }, 'fishing', 110)],
  },
  {
    id: 'fhIce', name: '제빙기', price: 0, w: 2, h: 1, icon: '🧊', color: '#b7c1c6', category: 'skill', unlisted: true,
    interactions: [job('fhIceCrates', '얼음 채워 상자 재기', '🧊', 20, { energy: -0.08 }, 'fitness', 140)],
  },
  {
    id: 'fhSquid', name: '오징어 건조대', price: 0, w: 3, h: 1, icon: '🐟', color: '#9c7a52', category: 'skill', unlisted: true,
    interactions: [job('fhHangSquid', '오징어 널어 말리기', '🐟', 20, { hygiene: -0.05 }, 'fishing', 130)],
  },
  {
    id: 'fhTideBoard', name: '물때 게시판', price: 0, w: 2, h: 1, icon: '🌊', color: '#37596e', category: 'skill', unlisted: true,
    interactions: [job('fhReadTide', '물때와 날씨 적어 두기', '🌊', 15, { fun: -0.03 }, 'logic', 150)],
  },
  {
    id: 'fhBidBoard', name: '낙찰 칠판', price: 0, w: 2, h: 1, icon: '📋', color: '#264a3f', category: 'skill', unlisted: true,
    interactions: [job('fhPostBid', '낙찰가 적어 올리기', '📋', 15, { fun: -0.03 }, 'business', 140)],
  },
  {
    id: 'fhOfficeDesk', name: '어항 사무실 책상', price: 0, w: 2, h: 1, icon: '📻', color: '#9c7a52', category: 'skill', unlisted: true,
    interactions: [job('fhLogPort', '출입항 무전 받고 일지 쓰기', '📻', 20, { fun: -0.03 }, 'logic', 130)],
  },
  {
    id: 'fhLiveTank', name: '활어 수조', price: 0, w: 2, h: 1, icon: '🐟', color: '#4fb6d6', category: 'skill', unlisted: true,
    interactions: [job('fhTankCheck', '수조 살피고 활어 옮겨 담기', '🐟', 20, { hygiene: -0.05 }, 'fishing', 120)],
  },
  // The 위판장 as it is (2026-11-04, the layout audit): a roof on columns over the concrete floor, open to the quay; the big bell the
  // captain rings at its entrance when his catch is laid out; the refrigerated truck a buyer loads at its back, by the road.
  { id: 'fhMarketRoof', name: '위판장 지붕', price: 0, w: 14, h: 6, icon: '🏗️', color: '#90a4ae', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'fhAuctionBell', name: '위판 종', price: 0, w: 1, h: 1, icon: '🔔', color: '#c9a227', category: 'decor', unlisted: true, interactions: [] },
  { id: 'fhReeferTruck', name: '냉동 탑차', price: 0, w: 2, h: 5, icon: '🚚', color: '#fafafa', category: 'decor', unlisted: true, interactions: [] },
];
