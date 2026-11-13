import type { ObjectDef } from '../types';

/**
 * New furniture for the fire station (2026-10-26 workplace pipeline, at the user's request): what a
 * 119 safety centre was missing to feel like one — the dispatch terminal that prints the call-out
 * and keeps the run log, the breathing-air compressor that refills the crews' cylinders, the rescue
 * tool shelf (spreader, cutter, saw, rope), the duty board with the day's crews and the fire-danger
 * dial, and the bay's red roll-up doors. Drawn in src/view3d/workplaces/firefighter.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    // The 119 dispatch terminal: the call-out map and slip on the screen, the printer, the radio.
    id: 'ffDispatchDesk', name: '119 출동 지령 단말', price: 0, w: 2, h: 1, icon: '📟', color: '#b71c1c', category: 'skill', unlisted: true,
    interactions: [
      { id: 'ffWriteLog', label: '출동 일지 쓰기', icon: '📝', duration: 30, effects: { fun: -0.05 }, skill: { key: 'writing', rate: 1 / 160 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // The breathing-air compressor: cylinders filled in a steel fill cage, gauges and valves.
    id: 'ffAirCompressor', name: '공기호흡기 충전기', price: 0, w: 1, h: 1, icon: '🫧', color: '#455a64', category: 'skill', unlisted: true,
    interactions: [
      { id: 'ffFillAir', label: '공기호흡기 충전하기', icon: '🫧', duration: 20, effects: { energy: -0.05 }, skill: { key: 'handiness', rate: 1 / 140 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // The rescue tool shelf: the hydraulic spreader and cutter on their pump, a saw, rope bags.
    id: 'ffRescueToolRack', name: '구조 장비 선반', price: 0, w: 2, h: 1, icon: '🛠️', color: '#c62828', category: 'skill', unlisted: true,
    interactions: [
      { id: 'ffCheckRescueTools', label: '구조 장비 점검하기', icon: '🛠️', duration: 25, effects: { hygiene: -0.1 }, skill: { key: 'handiness', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // The duty board: today's crews by truck, the month's runs, the fire-danger dial.
    id: 'ffDutyBoard', name: '근무 현황판', price: 0, w: 2, h: 1, icon: '📋', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [
      { id: 'ffShiftBriefing', shared: true, chatty: true, label: '교대 근무 브리핑하기', icon: '🗣️', duration: 30, effects: { social: 0.4 }, skill: { key: 'leadership', rate: 1 / 220 }, range: 2, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    // A red roll-up bay door on the street wall, in front of a truck's bay.
    id: 'ffBayDoorBoard', name: '차고 셔터', price: 0, w: 2, h: 1, icon: '🚪', color: '#c62828', category: 'decor', unlisted: true,
    interactions: [],
  },
  // The engine bay's shell where it isn't the building's (2026-11-04, the vehicles' way out): the bay is open to the street in front of
  // the trucks, so its walls on the lot's edge are pieces (a wall between the bay and the open lot isn't drawn), and the front is the
  // bay openings with their shutters rolled up under the header, the wall beside them.
  { id: 'ffBayWallSide', name: '차고 옆벽', price: 0, w: 1, h: 13, icon: '🧱', color: '#a4493a', category: 'decor', unlisted: true, interactions: [] },
  { id: 'ffBayWallBack', name: '차고 뒷벽', price: 0, w: 13, h: 1, icon: '🧱', color: '#a4493a', category: 'decor', unlisted: true, interactions: [] },
  { id: 'ffBayWallFront', name: '차고 앞벽', price: 0, w: 2, h: 1, icon: '🧱', color: '#a4493a', category: 'decor', unlisted: true, interactions: [] },
  { id: 'ffBayFront', name: '차고 출입구·말린 셔터', price: 0, w: 1, h: 1, icon: '🚪', color: '#c62828', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  // 2026-11-05, the layout audit: the yard's 훈련탑, a concrete tower of three floors with window openings to climb in at, the
  // ladder up its side, hoses hung to dry from its top (the drill rig, fireDrill, stands at its foot).
  { id: 'ffDrillTower', name: '소방 훈련탑', price: 0, w: 3, h: 3, icon: '🗼', color: '#bdb6aa', category: 'decor', unlisted: true, interactions: [] },
  {
    // A training board: a hydrant box, an extinguisher with its gauge, the checklist; a table with what a class needs.
    id: 'ffInspectBoard', name: '소방 시설 점검대', price: 0, w: 2, h: 1, icon: '🧯', color: '#c62828', category: 'skill', unlisted: true,
    interactions: [
      { id: 'ffCheckHydrant', label: '소화전함 점검하기', icon: '🧯', duration: 20, effects: { fun: -0.05 }, skill: { key: 'handiness', rate: 1 / 140 }, requires: 'atWork', pose: 'front' },
    ],
  },
];
