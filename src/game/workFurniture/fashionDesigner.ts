import type { InteractionDef, ObjectDef } from '../types';

/**
 * The 패션 아틀리에 (2026-11-01): what it was missing to feel real. A drawing table where a design develops, a dress form to drape, a
 * steam press with a hand iron, bolts of cloth, a fitting corner with a grown-up client and a mirror of its own, a rail of finished
 * looks, a colleague at a machine and the invented label's sign. Drawn in view3d/workplaces/fashionDesigner.ts (with
 * fashionDesignerMotion.ts).
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
  { id: 'fdDrawingTable', name: '드로잉 테이블', price: 0, w: 2, h: 1, icon: '✏️', color: '#6f4e37', category: 'skill', unlisted: true, interactions: [{ id: 'designSketch', label: '디자인 스케치하기', icon: '✏️', duration: 30, effects: { fun: 0.2 }, skill: { key: 'painting', rate: 1 / 90 }, requires: 'atWork', pose: 'front' }] },
  { id: 'fdDressForm', name: '드레이핑 폼', price: 0, w: 1, h: 1, icon: '👗', color: '#e3d5bd', category: 'skill', unlisted: true, interactions: [job('fdDrape', '폼에 천 둘러 핀으로 고정하기', '📌', 28, { fun: 0.12 }, 'handiness', 100)] },
  { id: 'fdSteamPress', name: '스팀 프레스', price: 0, w: 2, h: 1, icon: '♨️', color: '#d9dcde', category: 'skill', unlisted: true, interactions: [job('fdPress', '프레스로 옷 다리기', '♨️', 18, { fun: -0.03 }, 'handiness', 140), job('fdIronSeam', '다리미로 솔기 가르기', '♨️', 16, { fun: -0.03 }, 'handiness', 130)] },
  { id: 'fdFabricRack', name: '원단 랙', price: 0, w: 2, h: 1, icon: '🧵', color: '#6f4e37', category: 'skill', unlisted: true, interactions: [job('fdPickFabric', '원단 펼쳐 보고 고르기', '🧵', 20, { fun: 0.08 }, 'painting', 120)] },
  { id: 'fdFittingCorner', name: '가봉 코너', price: 0, w: 2, h: 2, icon: '🪞', color: '#ead8d0', category: 'skill', unlisted: true, interactions: [job('fdFitMeasure', '고객 어깨·소매 치수 재기', '📏', 20, { social: 0.2 }, 'handiness', 110), job('fdFitPin', '가봉 소매 핀으로 맞추기', '📌', 24, { social: 0.2 }, 'handiness', 100)] },
  {
    id: 'fdShowRail', name: '쇼 레일', price: 0, w: 3, h: 1, icon: '👗', color: '#c5a253', category: 'skill', unlisted: true,
    interactions: [
      job('fdCheckLook', '완성 룩 점검하기', '🏷️', 18, { fun: 0.05 }, 'painting', 130),
      // The show is staged at the venue; the looks leave from here, checked in their running order (2026-11-05, the layout audit).
      { id: 'fdShowLineup', label: '패션쇼 출고 룩 라인업 점검하기', icon: '👠', duration: 45, effects: { social: 0.2, energy: -0.1 }, skill: { key: 'painting', rate: 1 / 80 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  { id: 'fdMateMachine', name: '동료 재봉틀', price: 0, w: 1, h: 1, icon: '🧵', color: '#c9a87e', category: 'decor', unlisted: true, interactions: [] },
  { id: 'fdLabelSign', name: '브랜드 간판', price: 0, w: 1, h: 1, icon: '🏷️', color: '#7a3a4c', category: 'decor', unlisted: true, interactions: [] },
  // The street front of the atelier (2026-11-05, the layout audit; view3d/workplaces/shopFront.ts).
  { id: 'fdShopFront', name: '아틀리에 쇼윈도·간판', price: 0, w: 1, h: 1, icon: '🪧', color: '#7a3a4c', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
];
