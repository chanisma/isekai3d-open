import type { ObjectDef } from '../types';

/**
 * New furniture for the magazine's editorial office (2026-10-27 workplace pipeline, at the user's
 * request): what a 잡지사 편집국 has besides its editors' desks, tasting tables, wine cellar and
 * plinths — the wall of past covers in the lobby, the layout board where the next issue's spreads
 * are pinned up in order, the light table where the shoot's slides are chosen under a loupe, the
 * decanting trolley in the tasting room, the rack of this month's magazines (ours and the rivals'),
 * and the interview corner: two armchairs facing across a low table with the voice recorder on it,
 * where the guest sits and the critic takes the other chair. Drawn in view3d/workplaces/critic.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    id: 'critCoverWall', name: '지난 호 표지 벽', price: 0, w: 2, h: 1, icon: '🖼️', color: '#fafafa', category: 'decor', unlisted: true,
    interactions: [],
  },
  {
    id: 'critProofBoard', name: '지면 배치 보드', price: 0, w: 2, h: 1, icon: '📌', color: '#c8a27a', category: 'skill', unlisted: true,
    interactions: [
      { id: 'critLayoutPages', label: '다음 호 지면 짜기', icon: '📌', duration: 25, effects: { fun: 0.05 }, skill: { key: 'writing', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'critLightTable', name: '사진 라이트 테이블', price: 0, w: 2, h: 1, icon: '🔍', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'critPickPhotos', label: '화보 사진 고르기', icon: '🔍', duration: 20, effects: { fun: 0.1 }, skill: { key: 'photography', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'critWineTrolley', name: '디캔팅 카트', price: 0, w: 1, h: 1, icon: '🍷', color: '#5d4037', category: 'skill', unlisted: true,
    interactions: [
      { id: 'critDecantWine', label: '와인 디캔팅하기', icon: '🍷', duration: 20, effects: { fun: 0.1 }, skill: { key: 'mixology', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'critMagazineRack', name: '이달의 잡지 진열대', price: 0, w: 1, h: 1, icon: '📚', color: '#8d6e63', category: 'skill', unlisted: true,
    interactions: [
      { id: 'critBrowseIssues', label: '경쟁지 훑어보기', icon: '📖', duration: 15, effects: { fun: 0.1 }, skill: { key: 'writing', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // The guest's chair, and the critic's across the table: an interview is done sat in the other one.
    id: 'critInterviewChair', name: '인터뷰 암체어', price: 0, w: 1, h: 1, icon: '🛋️', color: '#a1887f', category: 'decor', unlisted: true,
    interactions: [],
  },
  {
    id: 'critRecorderTable', name: '인터뷰 탁자', price: 0, w: 1, h: 1, icon: '🎙️', color: '#6d4c41', category: 'decor', unlisted: true,
    interactions: [],
  },
];
