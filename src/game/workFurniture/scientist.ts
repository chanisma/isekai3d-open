import type { ObjectDef } from '../types';

/**
 * New furniture for the science lab (2026-10-26 workplace pipeline, at the user's request): what a
 * research lab was missing to feel like one — the fume hood the volatile work is done in, the
 * instrument bench (centrifuge, spectrophotometer, PCR) the samples are run on, the safety station
 * by the door (eyewash, the drench shower, coats and goggles), the workshop's 3D printer and its rack
 * of gas cylinders. The ids start `sci` so no other workplace's can clash with them. Drawn in
 * src/view3d/workplaces/scientist.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    // A walk-up fume hood: the sash raised a hand's breadth, a reaction set up inside under its light.
    id: 'sciFumeHood', name: '흄 후드', price: 0, w: 2, h: 1, icon: '🌫️', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'sciHoodSynthesis', label: '흄 후드에서 합성 실험하기', icon: '⚗️', duration: 40, effects: { fun: 0.1 }, skill: { key: 'logic', rate: 1 / 80 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // The instrument bench: a centrifuge, a spectrophotometer and a PCR machine with its screen.
    id: 'sciInstrumentBench', name: '분석 장비대', price: 0, w: 2, h: 1, icon: '🧬', color: '#cfd8dc', category: 'skill', unlisted: true,
    interactions: [
      { id: 'sciRunCentrifuge', label: '원심분리기로 시료 돌리기', icon: '🌀', duration: 20, effects: { fun: 0.05 }, skill: { key: 'logic', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
      { id: 'sciReadSpectrum', label: '분광 분석 결과 읽기', icon: '📊', duration: 25, effects: { fun: 0.05 }, skill: { key: 'logic', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // By the lab's door: the eyewash and the drench shower, lab coats on their hooks, goggles and gloves.
    id: 'sciSafetyCorner', name: '안전 장비 스테이션', price: 0, w: 1, h: 1, icon: '🥽', color: '#43a047', category: 'skill', unlisted: true,
    interactions: [
      { id: 'sciGearUp', label: '실험복·보안경 갖추기', icon: '🥽', duration: 8, effects: {}, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // The workshop's 3D printer on its cart, printing a part for the prototype.
    id: 'sci3dPrinter', name: '3D 프린터', price: 0, w: 1, h: 1, icon: '🖨️', color: '#37474f', category: 'skill', unlisted: true,
    interactions: [
      { id: 'sciPrintPart', label: '시제품 부품 3D 프린팅하기', icon: '🖨️', duration: 30, effects: { fun: 0.1 }, skill: { key: 'handiness', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  // Gas cylinders chained in their rack, regulators on (질소·아르곤·이산화탄소·산소).
  { id: 'sciGasRack', name: '가스 실린더 랙', price: 0, w: 1, h: 1, icon: '🧯', color: '#607d8b', category: 'decor', unlisted: true, interactions: [] },
  // The institute's front (2026-11-05, the layout audit): the front desk at the gates, the institute's name on the pavement.
  { id: 'sciReception', name: '연구원 안내 데스크', price: 0, w: 2, h: 1, icon: '🛎️', color: '#00838f', category: 'decor', unlisted: true, interactions: [] },
  { id: 'sciLabSign', name: '연구원 표지판', price: 0, w: 1, h: 1, icon: '🔬', color: '#00838f', category: 'decor', unlisted: true, interactions: [] },
];
