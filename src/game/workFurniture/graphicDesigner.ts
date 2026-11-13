import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 디자인 스튜디오 (2026-11-01 workplace pipeline, at the user's request): what a design studio
 * has besides computers. A felt wall of pinned work for critique, a wall of type specimens over wood type, a shelf of
 * colour fans and paper samples, a table where a printed net is folded into a mock-up, a screen to show clients, a
 * daylight booth to check proofs in, and a wall of the studio's work in the lobby. Drawn in
 * view3d/workplaces/graphicDesigner.ts (with graphicDesignerMotion.ts). All names and designs are made up.
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
  { id: 'dgCritWall', name: '크리틱 벽', price: 0, w: 3, h: 1, icon: '📌', color: '#3c4048', category: 'skill', unlisted: true, interactions: [job('dgPinUp', '포스터 벽에 시안 붙이고 크리틱 받기', '📌', 25, { social: 0.1 }, 'painting', 100)] },
  { id: 'dgTypeWall', name: '글꼴 견본 벽', price: 0, w: 2, h: 1, icon: '✏️', color: '#e9e5db', category: 'skill', unlisted: true, interactions: [job('dgStudyType', '글꼴 견본 보고 서체 고르기', '✏️', 20, { fun: 0.05 }, 'painting', 120)] },
  { id: 'dgSwatchShelf', name: '색 견본·종이 선반', price: 0, w: 2, h: 1, icon: '🎨', color: '#d9c29c', category: 'skill', unlisted: true, interactions: [job('dgPickSwatch', '색 견본과 종이 샘플 고르기', '🎨', 15, { fun: 0.05 }, 'painting', 130)] },
  { id: 'dgMockTable', name: '목업 작업대', price: 0, w: 3, h: 1, icon: '✂️', color: '#1f6e5a', category: 'skill', unlisted: true, interactions: [job('dgMakeMock', '패키지 목업 잘라 접어 만들기', '✂️', 30, { fun: 0.1 }, 'painting', 90)] },
  { id: 'dgClientScreen', name: '클라이언트 발표 화면', price: 0, w: 3, h: 1, icon: '🖥️', color: '#2b2b30', category: 'skill', unlisted: true, interactions: [job('dgPresentDeck', '발표 화면으로 시안 설명하기', '🖥️', 25, { social: 0.3 }, 'charisma', 110)] },
  { id: 'dgViewBooth', name: '표준광 부스', price: 0, w: 2, h: 1, icon: '🔍', color: '#8c8e90', category: 'skill', unlisted: true, interactions: [job('dgCheckProof', '표준광 아래에서 색 교정 보기', '🔍', 20, { fun: -0.05 }, 'painting', 120)] },
  { id: 'dgPortfolio', name: '작업 전시 벽', price: 0, w: 2, h: 1, icon: '🏆', color: '#16161a', category: 'decor', unlisted: true, interactions: [] },
  // The print room's cutter and proof rack, and the building's tenant board (2026-11-05, the layout audit).
  { id: 'dgCutter', name: '재단기', price: 0, w: 1, h: 1, icon: '✂️', color: '#455a64', category: 'decor', unlisted: true, interactions: [] },
  { id: 'dgPrintRack', name: '출력물 건조 선반', price: 0, w: 2, h: 1, icon: '🖨️', color: '#9e9e9e', category: 'decor', unlisted: true, interactions: [] },
  { id: 'dgFrontSign', name: '건물 입주 안내판', price: 0, w: 1, h: 1, icon: '🪧', color: '#263238', category: 'decor', unlisted: true, interactions: [] },
];
