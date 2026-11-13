import type { ObjectDef } from '../types';

/**
 * New furniture for the 외교부 청사 (2026-10-27 workplace pipeline, at the user's request): what a
 * diplomacy ministry has besides the desks, the negotiating table, the reception buffet and the flag
 * stands — the delegations' chairs round the negotiating table (a foreign delegation waits sat in one,
 * and is talked with from the one across the table), the signing table for a 협정 서명식 with its
 * photo backdrop, the simultaneous interpreters' booth, the safe the 외교 행낭 is sealed at, the
 * world-time clocks over the desks and a row of flags in the lobby. Korea's flag is the 태극기; every
 * partner nation, its flag and every 협정 are made up. Drawn in view3d/workplaces/diplomat.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    // A delegate's chair: a foreign delegation waits sat in one; they're talked with from the one across the table.
    id: 'dpDelegateChair', name: '대표단 의자', price: 0, w: 1, h: 1, icon: '🪑', color: '#4e342e', category: 'decor', unlisted: true,
    interactions: [],
  },
  {
    id: 'dpSigningTable', name: '협정 서명 테이블', price: 0, w: 3, h: 2, icon: '✍️', color: '#1a237e', category: 'skill', unlisted: true,
    interactions: [
      { id: 'dpSignTreaty', label: '협정 서명식 하기', icon: '✍️', duration: 30, effects: { social: 0.3 }, skill: { key: 'charisma', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'dpInterpreterBooth', name: '동시통역 부스', price: 0, w: 2, h: 2, icon: '🎧', color: '#37474f', category: 'skill', unlisted: true,
    interactions: [
      { id: 'dpInterpret', label: '동시통역하기', icon: '🎧', duration: 35, effects: { fun: -0.05 }, skill: { key: 'language', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  // The booth built into the 회담장's wall (2026-11-06): in its own room, its window to its left against the wall and its door to
  // its front; the hall sees it through dpBoothGlass (one tile, drawn two long along the wall).
  {
    id: 'dpBoothInWall', name: '동시통역 부스', price: 0, w: 2, h: 2, icon: '🎧', color: '#37474f', category: 'skill', unlisted: true,
    interactions: [
      { id: 'dpInterpret', label: '동시통역하기', icon: '🎧', duration: 35, effects: { fun: -0.05 }, skill: { key: 'language', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  { id: 'dpBoothGlass', name: '통역 부스 창', price: 0, w: 1, h: 1, icon: '🪟', color: '#263238', category: 'decor', unlisted: true, interactions: [] },
  {
    id: 'dpPouchSafe', name: '외교 행낭 보안 금고', price: 0, w: 1, h: 1, icon: '🔐', color: '#546e7a', category: 'skill', unlisted: true,
    interactions: [
      { id: 'dpSealPouch', label: '외교 행낭 봉인하기', icon: '🔐', duration: 15, effects: { fun: -0.03 }, skill: { key: 'logic', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'dpWorldClocks', name: '세계 시각 시계', price: 0, w: 2, h: 1, icon: '⏰', color: '#3e2723', category: 'decor', unlisted: true,
    interactions: [],
  },
  {
    id: 'dpFlagRow', name: '국기 게양대', price: 0, w: 3, h: 1, icon: '🎌', color: '#bdbdbd', category: 'decor', unlisted: true,
    interactions: [],
  },
  // 2026-11-05, the layout audit: the 청사's security line (the bag scanner beside the walk-through detector), the stone at its gate,
  // a section to lengthen the negotiating table to five a side, and the locked cabinets of the 보안 문서실.
  { id: 'dpBagScanner', name: '엑스레이 검색대', price: 0, w: 2, h: 1, icon: '🧳', color: '#90a4ae', category: 'decor', unlisted: true, interactions: [] },
  { id: 'dpGovSign', name: '청사 표지석', price: 0, w: 3, h: 1, icon: '🪨', color: '#9e9e9e', category: 'decor', unlisted: true, interactions: [] },
  { id: 'dpTableWing', name: '회담 테이블 보조석', price: 0, w: 1, h: 1, icon: '🪑', color: '#5b2c22', category: 'decor', unlisted: true, interactions: [] },
  { id: 'dpSecureCabinet', name: '보안 문서함', price: 0, w: 1, h: 1, icon: '🗄️', color: '#607d8b', category: 'decor', unlisted: true, interactions: [] },
];
