import type { ObjectDef } from '../types';

/**
 * New furniture for the architecture studio (2026-10-27 workplace pipeline, at the user's request):
 * what the 건축 사무소 was missing to feel like a working design studio — the large-format plotter
 * with a drawing coming out of it, the materials library of tiles, stone, timber and fabric samples,
 * the pin-up wall of renderings where the crit happens, the site model on its plinth for showing a
 * scheme, and the rack of hard hats and hi-vis vests by the door for the site. The ids start `arch`
 * so no other workplace's can clash with them.
 */
export const OBJECTS: ObjectDef[] = [
  {
    id: 'archPlotter', name: '대형 플로터', price: 0, w: 2, h: 1, icon: '🖨️', color: '#37474f', category: 'skill', unlisted: true,
    interactions: [
      { id: 'archPlotDrawings', label: '도면 출력하기', icon: '🖨️', duration: 15, effects: { fun: -0.02 }, skill: { key: 'logic', rate: 1 / 200 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'archMaterialLibrary', name: '마감재 샘플 라이브러리', price: 0, w: 2, h: 1, icon: '🧱', color: '#d7ccc8', category: 'skill', unlisted: true,
    interactions: [
      { id: 'archPickMaterials', label: '마감재 샘플 고르기', icon: '🧱', duration: 20, effects: { fun: 0.1 }, skill: { key: 'painting', rate: 1 / 130 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'archPinupBoard', name: '렌더링 핀업 보드', price: 0, w: 2, h: 1, icon: '📌', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'archPinupCrit', shared: true, chatty: true, label: '핀업 크리틱 하기', icon: '🗣️', duration: 20, effects: { social: 0.35 }, skill: { key: 'charisma', rate: 1 / 200 }, range: 2, requires: 'atWork', pose: 'front' },
      { id: 'archPinRendering', label: '렌더링 출력물 붙이기', icon: '📌', duration: 10, effects: { fun: 0.05 }, skill: { key: 'painting', rate: 1 / 200 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'archSiteModel', name: '대지 모형 테이블', price: 0, w: 2, h: 1, icon: '🏛️', color: '#f5f5f5', category: 'skill', unlisted: true,
    interactions: [
      { id: 'archSiteStudy', label: '대지 모형으로 배치 검토하기', icon: '🏛️', duration: 25, effects: { fun: 0.05 }, skill: { key: 'logic', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
      { id: 'archPresentScheme', label: '모형 앞에서 설계안 리허설하기', icon: '🎤', duration: 20, effects: { fun: -0.02 }, skill: { key: 'charisma', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'archGearRack', name: '현장 안전 장비 걸이', price: 0, w: 1, h: 1, icon: '⛑️', color: '#fbc02d', category: 'skill', unlisted: true,
    interactions: [
      { id: 'archGearUp', label: '현장 안전 장비 점검하기', icon: '⛑️', duration: 10, effects: { fun: -0.02 }, skill: { key: 'logic', rate: 1 / 250 }, requires: 'atWork', pose: 'front' },
    ],
  },
];
