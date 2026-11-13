import type { ObjectDef } from '../types';

/**
 * New furniture for the 모델 에이전시 (2026-10-27 workplace pipeline, at the user's request): what a
 * Korean model agency has besides the catwalk, the posing spot and the vanities — the casting table
 * where the casting directors sit and a go-see is done in front of them; the fitting podium with its
 * three-way mirror where a model is measured and fitted; the backstage rack of the show's looks in
 * running order with the shoes under them; the comp card printer; the wall of the agency's models'
 * comp cards in the lobby. The agency (스텔라 모델스) and its models are made up. Drawn in
 * view3d/workplaces/model.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    id: 'mdCastingTable', name: '캐스팅 테이블', price: 0, w: 3, h: 1, icon: '📋', color: '#f5f5f5', category: 'skill', unlisted: true,
    interactions: [
      { id: 'mdGoSee', label: '캐스팅 오디션 보기', icon: '🧾', duration: 25, effects: { social: 0.2, fun: 0.1 }, skill: { key: 'charisma', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'mdFittingPodium', name: '피팅 포디움', price: 0, w: 2, h: 1, icon: '📏', color: '#d7ccc8', category: 'skill', unlisted: true,
    interactions: [
      { id: 'mdMeasure', label: '사이즈 측정·가봉하기', icon: '📏', duration: 20, effects: { fun: 0.05 }, skill: { key: 'charisma', rate: 1 / 160 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'mdBackstageRack', name: '백스테이지 룩 랙', price: 0, w: 2, h: 1, icon: '👠', color: '#424242', category: 'skill', unlisted: true,
    interactions: [
      { id: 'mdQuickChange', label: '백스테이지 퀵체인지 연습하기', icon: '👗', duration: 20, effects: { fun: 0.1, energy: -0.05 }, skill: { key: 'charisma', rate: 1 / 140 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'mdCompPrinter', name: '컴프 카드 프린터', price: 0, w: 2, h: 1, icon: '🖨️', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'mdPrintComps', label: '컴프 카드 뽑기', icon: '🪪', duration: 15, effects: { fun: 0.05 }, skill: { key: 'photography', rate: 1 / 160 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'mdCompBoard', name: '소속 모델 컴프 카드 월', price: 0, w: 2, h: 1, icon: '🪪', color: '#212121', category: 'decor', unlisted: true,
    interactions: [],
  },
  // The agency's front desk and its sign on the pavement (2026-11-05, the layout audit).
  { id: 'mdReception', name: '에이전시 안내 데스크', price: 0, w: 2, h: 1, icon: '🛎️', color: '#1f1e22', category: 'decor', unlisted: true, interactions: [] },
  { id: 'mdStreetSign', name: '빌딩 입구 안내판', price: 0, w: 1, h: 1, icon: '🪧', color: '#1f1e22', category: 'decor', unlisted: true, interactions: [] },
];
