import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 항공사 운항 센터 (2026-10-31 workplace pipeline, at the user's request): what a
 * flight operations centre has besides its simulators, briefing table and dispatch desks: a paper-panel
 * procedures trainer, a weather wall to brief from, the crew room with its bags and epaulettes, a
 * fit-to-fly check, and the live fleet board. The airline (한누리항공) and its routes are made up. Drawn
 * in view3d/workplaces/pilot.ts (with pilotMotion.ts).
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
  {
    id: 'plCpt', name: '절차 훈련기', price: 0, w: 3, h: 2, icon: '🎛️', color: '#b78a5a', category: 'skill', unlisted: true,
    interactions: [job('plCptFlow', '절차 훈련기로 조종석 점검 익히기', '🎛️', 25, { fun: -0.03 }, 'logic', 110)],
  },
  {
    id: 'plWxWall', name: '운항 기상 브리핑 화면', price: 0, w: 3, h: 1, icon: '🌦️', color: '#0277bd', category: 'skill', unlisted: true,
    interactions: [job('plWeatherBrief', '항로 기상 확인하기', '🌦️', 15, { fun: 0.05 }, 'logic', 120)],
  },
  {
    id: 'plCrewRoom', name: '운항 승무원 준비실', price: 0, w: 3, h: 1, icon: '🧳', color: '#17325c', category: 'skill', unlisted: true,
    interactions: [job('plSuitUp', '제복·비행 가방 갖추기', '🧳', 15, { fun: 0.05 }, 'logic', 170)],
  },
  {
    id: 'plFitKiosk', name: '건강·피로 점검대', price: 0, w: 2, h: 1, icon: '🩺', color: '#00796b', category: 'skill', unlisted: true,
    interactions: [job('plFitCheck', '비행 전 건강·피로 점검하기', '🩺', 12, { fun: -0.02 }, 'logic', 180)],
  },
  { id: 'plFleetBoard', name: '운항 현황판', price: 0, w: 4, h: 1, icon: '🛫', color: '#1b2a3a', category: 'decor', unlisted: true, interactions: [] },
  // The gate as it is at an airport (2026-11-04, the layout audit, replacing a toy aeroplane on the lawn): the nose of a narrow-body
  // parked nose-in on the apron (it's 40 m long; the rest runs off past the lot), the jet bridge to its front door from the terminal,
  // and the apron's paint. A walk round under the nose before the flight; boarding goes out through the bridge.
  {
    id: 'plGateAircraft', name: '계류장 여객기', price: 0, w: 6, h: 6, icon: '✈️', color: '#f4f6f8', category: 'skill', unlisted: true,
    interactions: [
      { id: 'preflightCheck', label: '비행 전 외부 점검하기', icon: '🔧', duration: 20, effects: { fun: 0.05 }, skill: { key: 'handiness', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
      { id: 'flyRoute', label: '운항 나가기', icon: '✈️', duration: 120, effects: { fun: 0.15, energy: -0.12 }, skill: { key: 'logic', rate: 1 / 90 }, requires: 'workAlarm', offLot: true, pose: 'front' },
    ],
  },
  { id: 'plJetBridge', name: '탑승교', price: 0, w: 2, h: 3, icon: '🚪', color: '#b0bec5', category: 'decor', unlisted: true, interactions: [] },
  { id: 'plApronMarks', name: '계류장 유도선', price: 0, w: 11, h: 7, icon: '✈️', color: '#fbc02d', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  // The special flying branch's own lot: a doctor helicopter on its pad (the pad's H and edge lights flat on the ground).
  {
    id: 'plHelicopter', name: '닥터헬기', price: 0, w: 7, h: 3, icon: '🚁', color: '#e53935', category: 'skill', unlisted: true,
    interactions: [
      { id: 'preflightCheck', label: '비행 전 외부 점검하기', icon: '🔧', duration: 20, effects: { fun: 0.05 }, skill: { key: 'handiness', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
      { id: 'flyRoute', label: '출동 비행하기', icon: '🚁', duration: 120, effects: { fun: 0.15, energy: -0.12 }, skill: { key: 'logic', rate: 1 / 90 }, requires: 'workAlarm', offLot: true, pose: 'front' },
    ],
  },
  { id: 'plHelipad', name: '헬기장', price: 0, w: 9, h: 7, icon: '🅷', color: '#c3c1ba', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
];
