import type { ObjectDef } from '../types';

/**
 * New furniture for the woodworking shop (2026-10-27 workplace pipeline, at the user's request):
 * what a Korean 목공소 · 가구 공방 has besides its benches, table saws, lumber racks and finishing
 * table — the wall of F-clamps, the dust collector the machines are piped to (its bag emptied), a
 * drill press for the dowel holes, the order board with the commissions and their deadlines, the
 * showroom platform of finished furniture (photographed for the 공방's SNS) and the crate of offcuts
 * by the saw that customers may take. Drawn in view3d/workplaces/carpenter.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    id: 'carpClampRack', name: '클램프 거치대', price: 0, w: 1, h: 1, icon: '🔧', color: '#c62828', category: 'decor', unlisted: true,
    interactions: [],
  },
  {
    id: 'carpDustCollector', name: '집진기', price: 0, w: 1, h: 1, icon: '🌀', color: '#1e5aa8', category: 'skill', unlisted: true,
    interactions: [
      { id: 'carpEmptyDust', label: '집진기 톱밥 비우기', icon: '🧹', duration: 15, effects: { hygiene: -0.1, energy: -0.03 }, skill: { key: 'fitness', rate: 1 / 200 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'carpDrillPress', name: '드릴 프레스', price: 0, w: 1, h: 1, icon: '🔩', color: '#2e7d32', category: 'skill', unlisted: true,
    interactions: [
      { id: 'carpDrillHoles', label: '목심 구멍 뚫기', icon: '🔩', duration: 20, effects: { energy: -0.05 }, skill: { key: 'handiness', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'carpOrderBoard', name: '주문 현황판', price: 0, w: 1, h: 1, icon: '📋', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'carpCheckOrders', label: '주문 현황 정리하기', icon: '📋', duration: 15, effects: { fun: -0.02 }, skill: { key: 'logic', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'carpShowcase', name: '완성 가구 전시대', price: 0, w: 2, h: 1, icon: '🪑', color: '#6d4c41', category: 'skill', unlisted: true,
    interactions: [
      { id: 'carpPhotoPiece', label: '완성 가구 사진 찍어 올리기', icon: '📸', duration: 15, effects: { fun: 0.1 }, skill: { key: 'photography', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'carpOffcutBin', name: '자투리 나무 상자', price: 0, w: 1, h: 1, icon: '🪵', color: '#a1887f', category: 'decor', unlisted: true,
    interactions: [],
  },
  // The 내장 목공 현장's pieces (2026-11-04, the branch lots), the stages of an interior fit-out in their order. The ceiling being framed:
  // hangers from the slab, the timber grid at 300 to 450, a ladder and a 우마 under it; the wall being boarded, the plasterboard screwed to
  // the studs; the stud wall with a door frame stood in it; a stack of plasterboard waiting.
  {
    id: 'cpCeilingFrame', name: '천장 각재 틀', price: 0, w: 3, h: 2, icon: '📏', color: '#c8a26a', category: 'skill', unlisted: true,
    interactions: [
      { id: 'cpFrameCeiling', label: '천장 달대·각재 고정하기', icon: '📏', duration: 35, effects: { energy: -0.15 }, skill: { key: 'handiness', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
      { id: 'cpFixLevel', label: '천장 레벨 다시 맞추기', icon: '📐', duration: 40, effects: { energy: -0.2 }, skill: { key: 'handiness', rate: 1 / 70 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  {
    id: 'cpBoardWall', name: '석고보드 붙이는 벽', price: 0, w: 3, h: 1, icon: '🧱', color: '#e0e0e0', category: 'skill', unlisted: true,
    interactions: [
      { id: 'cpHangBoard', label: '석고보드 붙이기', icon: '🧱', duration: 35, effects: { energy: -0.15 }, skill: { key: 'handiness', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'cpStudWall', name: '벽체 각재·문틀', price: 0, w: 3, h: 1, icon: '🚪', color: '#c8a26a', category: 'skill', unlisted: true,
    interactions: [
      { id: 'cpSetFrame', label: '벽체 각재 세우고 문틀 달기', icon: '🚪', duration: 35, effects: { energy: -0.15 }, skill: { key: 'handiness', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  { id: 'cpBoardStack', name: '석고보드 단', price: 0, w: 2, h: 1, icon: '🧱', color: '#e0e0e0', category: 'decor', unlisted: true, interactions: [] },
  // The 목공소 as a panel factory (2026-11-05, the layout audit): the machines the floor was missing, the paint booth, the yard.
  {
    id: 'carpJointer', name: '수압대패', price: 0, w: 2, h: 1, icon: '🪵', color: '#3d4a52', category: 'skill', unlisted: true,
    interactions: [
      { id: 'carpJointBoard', label: '수압대패로 면 잡기', icon: '🪵', duration: 20, effects: { energy: -0.08 }, skill: { key: 'handiness', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'carpBandSaw', name: '밴드쏘', price: 0, w: 1, h: 1, icon: '🪚', color: '#2e7d32', category: 'skill', unlisted: true,
    interactions: [
      { id: 'carpBandCut', label: '밴드쏘로 곡선 따내기', icon: '🪚', duration: 20, effects: { energy: -0.05 }, skill: { key: 'handiness', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  { id: 'carpLumberCart', name: '자재 카트', price: 0, w: 2, h: 1, icon: '🛒', color: '#8d6e63', category: 'decor', unlisted: true, interactions: [] },
  { id: 'carpDryRack', name: '도장 건조대', price: 0, w: 1, h: 1, icon: '🗄️', color: '#9e9e9e', category: 'decor', unlisted: true, interactions: [] },
  { id: 'carpBoothFan', name: '도장 부스 배기팬·필터', price: 0, w: 1, h: 1, icon: '🌀', color: '#b0bec5', category: 'decor', unlisted: true, interactions: [] },
  { id: 'carpPaintShelf', name: '도료 보관장', price: 0, w: 1, h: 1, icon: '🧯', color: '#c62828', category: 'decor', unlisted: true, interactions: [] },
  { id: 'carpSampleWall', name: '원목 샘플 보드', price: 0, w: 1, h: 1, icon: '🪵', color: '#caa06a', category: 'decor', unlisted: true, interactions: [] },
  { id: 'carpLumberStack', name: '목재 더미·팔레트', price: 0, w: 2, h: 1, icon: '🪵', color: '#c8a26a', category: 'decor', unlisted: true, interactions: [] },
  {
    id: 'carpTruck', name: '목재 운반 1톤 트럭', price: 0, w: 2, h: 4, icon: '🚚', color: '#1e88e5', category: 'skill', unlisted: true,
    interactions: [
      { id: 'carpUnloadLumber', label: '트럭에서 목재 내리기', icon: '🚚', duration: 25, effects: { energy: -0.15, hygiene: -0.05 }, skill: { key: 'fitness', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  { id: 'carpShutter', name: '목재 반입 셔터', price: 0, w: 1, h: 1, icon: '🚪', color: '#90a4ae', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'carpFront', name: '공방 쇼룸 유리 정면·간판', price: 0, w: 1, h: 1, icon: '🪧', color: '#5d4037', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
];
