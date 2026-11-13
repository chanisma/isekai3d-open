import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 타투 스튜디오 (2026-11-01 workplace pipeline, at the user's request): what a tattoo studio has
 * besides its chairs. A stencil table with a light box and a thermal copier, a shelf of inks with the small autoclave, a
 * low table to go through the portfolio with a client, a bench with a silicone forearm to practise on and a counter where
 * the aftercare is explained and paid for. Drawn in view3d/workplaces/tattooArtist.ts (with tattooArtistMotion.ts). All
 * names and designs are made up.
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
  { id: 'ttStencilTable', name: '스텐실 작업대', price: 0, w: 3, h: 1, icon: '✏️', color: '#3a3a40', category: 'skill', unlisted: true, interactions: [job('ttTraceStencil', '라이트박스에 도안 따라 그리기', '✏️', 25, { fun: 0.1 }, 'painting', 90), job('ttThermalCopy', '전사기로 스텐실 뽑기', '🖨️', 15, { fun: -0.02 }, 'handiness', 140)] },
  { id: 'ttInkShelf', name: '잉크·멸균 선반', price: 0, w: 2, h: 1, icon: '🧴', color: '#e5e7ea', category: 'skill', unlisted: true, interactions: [job('ttCheckInk', '잉크 유통기한 확인하고 기록하기', '🧴', 15, { fun: -0.05 }, 'handiness', 150), job('ttLoadAutoclave', '기구 포장해 소형 멸균기 돌리기', '♨️', 20, { fun: -0.05 }, 'medicine', 130)] },
  { id: 'ttConsultTable', name: '포트폴리오 상담 테이블', price: 0, w: 2, h: 2, icon: '📖', color: '#6d4c41', category: 'skill', unlisted: true, interactions: [job('ttPortfolioTalk', '포트폴리오 보며 도안 정하기', '📖', 25, { social: 0.3 }, 'charisma', 110)] },
  { id: 'ttAftercareCounter', name: '애프터케어 카운터', price: 0, w: 3, h: 1, icon: '🧴', color: '#20262b', category: 'skill', unlisted: true, interactions: [job('ttAftercareTalk', '필름 감아 주고 관리법 설명하기', '🩹', 20, { social: 0.2 }, 'medicine', 120)] },
  { id: 'ttPracticeBench', name: '실리콘 팔 연습대', price: 0, w: 2, h: 1, icon: '💪', color: '#6b6f76', category: 'skill', unlisted: true, interactions: [job('ttPracticeSkin', '실리콘 팔에 라인 연습하기', '🖋️', 30, { fun: 0.1 }, 'painting', 80)] },
  // The street front and the unit next door (2026-11-05, the layout audit; view3d/workplaces/shopFront.ts).
  { id: 'ttShopFront', name: '타투 스튜디오 정면·간판', price: 0, w: 1, h: 1, icon: '🪧', color: '#20262b', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'ttNeighbor', name: '이웃 레코드 가게', price: 0, w: 7, h: 10, icon: '🏪', color: '#ddd6cc', category: 'decor', unlisted: true, interactions: [] },
];
