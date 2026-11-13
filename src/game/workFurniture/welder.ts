import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 조선소 용접장 (2026-11-01 workplace pipeline, at the user's request): what a shipyard's
 * welding shop has besides its booths and plates. The hull block itself on its stands, a welding machine with its
 * gas cylinders, a plasma cutting table, a gantry crane with a plate on its hook, the protective gear's lockers, the
 * safety board, and the concrete yard they all stand on. Drawn in view3d/workplaces/welder.ts (with welderMotion.ts).
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
  { id: 'wdYardSlab', name: '조선소 콘크리트 야드', price: 0, w: 16, h: 13, icon: '🔩', color: '#9a9c98', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  {
    id: 'wdHullBlock', name: '선체 블록', price: 0, w: 5, h: 3, icon: '⚓', color: '#8e3b2a', category: 'skill', unlisted: true,
    interactions: [
      job('wdTackBlock', '보강재 취부하고 가용접하기', '🔩', 25, { energy: -0.1 }, 'handiness', 100),
      job('wdSeamBlock', '블록 이음 용접하기', '🔥', 35, { energy: -0.2, hygiene: -0.15 }, 'handiness', 85),
    ],
  },
  {
    id: 'wdGasCart', name: '용접기·가스 용기', price: 0, w: 2, h: 1, icon: '🔥', color: '#2e7d32', category: 'skill', unlisted: true,
    interactions: [job('wdCheckGas', '가스 압력과 용접기 점검하기', '🔍', 15, { fun: -0.05 }, 'science', 150)],
  },
  {
    id: 'wdPlasmaTable', name: '플라즈마 절단기', price: 0, w: 3, h: 2, icon: '💥', color: '#37474f', category: 'skill', unlisted: true,
    interactions: [job('wdPlasmaCut', '플라즈마로 부재 잘라 내기', '💥', 25, { fun: 0.03 }, 'logic', 120)],
  },
  {
    id: 'wdGantry', name: '강판 운반 갠트리', price: 0, w: 5, h: 2, icon: '⚓', color: '#f9a825', category: 'skill', unlisted: true,
    interactions: [job('wdLiftPlate', '크레인으로 강판 옮기기', '⚓', 20, { energy: -0.05 }, 'logic', 140)],
  },
  {
    id: 'wdPpeLocker', name: '보호구 보관함', price: 0, w: 2, h: 1, icon: '🧰', color: '#455a64', category: 'skill', unlisted: true,
    interactions: [job('wdCheckPpe', '보호구 상태 점검하기', '🧰', 12, { fun: -0.03 }, 'handiness', 170)],
  },
  {
    id: 'wdSafetyBoard', name: '안전 게시판', price: 0, w: 2, h: 1, icon: '👷', color: '#2e7d32', category: 'skill', unlisted: true,
    interactions: [
      job('wdMorningTalk', '작업 전 안전 회의 하기', '👷', 12, { social: 0.2 }, 'charisma', 150),
      job('wdHotPermit', '화기 작업 허가서 쓰기', '🧾', 15, { fun: -0.05 }, 'logic', 150),
    ],
  },
  // The block assembly shop (2026-11-05, the layout audit): the shop's steel frame and its overhead crane, the rest of the block the
  // working face belongs to, the arc curtains at the block, the changing room's lockers, the ship fitting out at the quay behind.
  { id: 'wdShopFrame', name: '조립 공장 철골·천장 크레인', price: 0, w: 1, h: 1, icon: '🏗️', color: '#f9a825', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'wdBlockMass', name: '선체 블록 (이중저·외판)', price: 0, w: 12, h: 3, icon: '⚓', color: '#8e3b2a', category: 'decor', unlisted: true, interactions: [] },
  { id: 'wdWeldScreen', name: '용접 차광막', price: 0, w: 1, h: 1, icon: '🔥', color: '#c62828', category: 'decor', unlisted: true, interactions: [] },
  { id: 'wdChangeLockers', name: '사물함·방화복 걸이', price: 0, w: 2, h: 1, icon: '🦺', color: '#546e7a', category: 'decor', unlisted: true, interactions: [] },
  { id: 'wdQuayShip', name: '안벽 의장 중인 선박', price: 0, w: 18, h: 2, icon: '🚢', color: '#27506b', category: 'decor', unlisted: true, interactions: [] },
];
