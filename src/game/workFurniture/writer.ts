import type { ObjectDef } from '../types';

/**
 * New furniture for the publishing house's editorial floor (2026-10-27 workplace pipeline, at the
 * user's request): what the 편집국 was missing — the deadline board every Korean editorial room keeps
 * (this month's serials, the next issue, the print date circled), a trolley of galley proofs waiting
 * for their second read, the layout designer's desk where a book's pages are set and checked, and the
 * lobby's table of new releases with the bestseller list over it. The ids start `wrt` (the writer's)
 * so no other workplace's can clash with them.
 */
export const OBJECTS: ObjectDef[] = [
  {
    id: 'wrtDeadlineBoard', name: '원고 마감 보드', price: 0, w: 2, h: 1, icon: '📅', color: '#3e4a3d', category: 'skill', unlisted: true,
    interactions: [
      { id: 'wrtCheckDeadlines', chatty: true, label: '마감 일정 점검하기', icon: '📅', duration: 15, effects: { fun: -0.03 }, skill: { key: 'logic', rate: 1 / 160 }, requires: 'atWork', pose: 'front' },
    ],
  },
  { id: 'wrtProofCart', name: '교정지 수레', price: 0, w: 1, h: 1, icon: '📚', color: '#90a4ae', category: 'decor', unlisted: true, interactions: [] },
  {
    id: 'wrtLayoutDesk', name: '조판 데스크', price: 0, w: 1, h: 1, icon: '🖥️', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'wrtCheckLayout', label: '조판 확인하기', icon: '📐', duration: 25, effects: { fun: -0.03 }, skill: { key: 'writing', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'wrtNewReleaseTable', name: '신간 진열대', price: 0, w: 2, h: 1, icon: '📚', color: '#6d4c41', category: 'skill', unlisted: true,
    interactions: [
      { id: 'wrtArrangeBooks', chatty: true, label: '신간 진열하기', icon: '📚', duration: 15, effects: { fun: 0.05 }, skill: { key: 'charisma', rate: 1 / 200 }, requires: 'atWork', pose: 'front' },
    ],
  },
];
