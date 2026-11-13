import type { ObjectDef } from '../types';

/**
 * New furniture for the 119 안전센터's 구급대 (2026-10-27 workplace pipeline, at the user's request):
 * what an ambulance crew's station has besides the CPR manikins, the kit shelves, the dispatch console
 * and the 구급차 — a spare power cot whose height, straps and rails are checked, the medical oxygen
 * cylinders in their chained rack with the regulator's gauge, the stainless sink where used kit is
 * washed and disinfected (감염관리), the public AED cabinet in the lobby, and the 구급 활동 일지 board
 * with the day's runs. Drawn in src/view3d/workplaces/paramedic.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    // A power cot (전동 들것) standing in the station: checked at its near side.
    id: 'pmStretcher', name: '구급 들것', price: 0, w: 2, h: 1, icon: '🛏️', color: '#fbc02d', category: 'skill', unlisted: true,
    interactions: [
      { id: 'pmCotCheck', label: '들것 점검하기', icon: '🛏️', duration: 20, effects: { energy: -0.05 }, skill: { key: 'fitness', rate: 1 / 140 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // Medical oxygen cylinders (의료용 산소) chained in a rack, the portable ones in their carry bags.
    id: 'pmOxygenRack', name: '산소통 거치대', price: 0, w: 1, h: 1, icon: '💨', color: '#2e7d32', category: 'skill', unlisted: true,
    interactions: [
      { id: 'pmOxygenCheck', label: '산소통 압력 확인하기', icon: '💨', duration: 15, effects: { fun: -0.03 }, skill: { key: 'medicine', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // The decontamination sink: a deep stainless basin, a pre-rinse spray, the drying rack and disinfectant.
    id: 'pmDeconSink', name: '장비 세척·소독대', price: 0, w: 2, h: 1, icon: '🧼', color: '#b0bec5', category: 'skill', unlisted: true,
    interactions: [
      { id: 'pmDecon', label: '구급 장비 소독하기', icon: '🧼', duration: 20, effects: { fun: -0.05 }, skill: { key: 'medicine', rate: 1 / 160 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // The public AED cabinet on the lobby wall (자동심장충격기), checked every day.
    id: 'pmAedCabinet', name: 'AED 보관함', price: 0, w: 1, h: 1, icon: '⚡', color: '#2e7d32', category: 'skill', unlisted: true,
    interactions: [
      { id: 'pmAedCheck', label: 'AED 점검하기', icon: '⚡', duration: 15, effects: { fun: -0.03 }, skill: { key: 'medicine', rate: 1 / 140 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // The 구급 활동 일지 board: today's runs, where each was taken, the month's count.
    id: 'pmLogBoard', name: '구급 활동 일지판', price: 0, w: 2, h: 1, icon: '📝', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'pmRunLog', label: '구급 활동 일지 정리하기', icon: '📝', duration: 25, effects: { fun: -0.05 }, skill: { key: 'writing', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  // The 권역응급의료센터's pieces (2026-11-04, the branch lots: the hospital ER branch has its own lot). The resuscitation room's crash
  // cart: the defibrillator on top, the drawers of airway kit and drugs, the board on its back; the call when a 구급대 rings ahead with a
  // cardiac arrest is answered at it. The 중증도 분류 (KTAS) board at the triage desk: the five levels, their colours, how long each waits.
  {
    id: 'erResusCart', name: '소생실 응급 카트', price: 0, w: 1, h: 1, icon: '🫀', color: '#d32f2f', category: 'skill', unlisted: true,
    interactions: [
      { id: 'erResuscitate', label: '심정지 환자 소생술 하기', icon: '🫀', duration: 45, effects: { energy: -0.25 }, skill: { key: 'medicine', rate: 1 / 60 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  { id: 'erTriageSign', name: '중증도 분류 안내판', price: 0, w: 1, h: 1, icon: '🚦', color: '#eceff1', category: 'decor', unlisted: true, interactions: [] },
  // The 119 안전센터's garage (2026-11-04, the layout audit). The centre's 펌프차, sharing the garage with the ambulance (set dressing here:
  // the firefighter's pumper, drawn by its builder, without the fire crew's work on it); the bay openings with their shutters rolled up;
  // the 감염관리실's washer and dryer for soiled uniforms and blankets, stacked.
  { id: 'pmPumper', name: '펌프차', price: 0, w: 2, h: 3, icon: '🚒', color: '#e53935', category: 'decor', unlisted: true, interactions: [] },
  { id: 'pmBayFront', name: '차고 출입구·말린 셔터', price: 0, w: 1, h: 1, icon: '🚪', color: '#c62828', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'pmLaundry', name: '감염 피복 세탁기·건조기', price: 0, w: 1, h: 1, icon: '🧺', color: '#eceff1', category: 'decor', unlisted: true, interactions: [] },
];
