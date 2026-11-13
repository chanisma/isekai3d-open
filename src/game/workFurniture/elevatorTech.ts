import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 승강기 서비스센터 (2026-10-31 workplace pipeline): what a lift maintenance
 * centre has besides its training car, machine bench and parts: the 제어반 and the 조속기 test stand of a
 * machine room, a stretch of guide rail to gauge, the monitoring room's map wall and the month's
 * rounds board, the 정기검사 desk, the rack of safety kit, and the display in the lobby. Drawn in
 * view3d/workplaces/elevatorTech.ts (with elevatorTechMotion.ts).
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
    id: 'etControlCabinet', name: '승강기 제어반', price: 0, w: 1, h: 1, icon: '🎛️', color: '#b8c2c8', category: 'skill', unlisted: true,
    interactions: [job('etPanelCheck', '제어반 점검하기', '🎛️', 25, { fun: -0.05 }, 'handiness', 110)],
  },
  {
    id: 'etGovernor', name: '조속기 시험대', price: 0, w: 1, h: 1, icon: '⏱️', color: '#4f5b62', category: 'skill', unlisted: true,
    interactions: [job('etGovernorTest', '조속기 작동 시험하기', '⏱️', 20, { fun: 0.03 }, 'handiness', 120)],
  },
  {
    id: 'etRailJig', name: '가이드레일 실습대', price: 0, w: 2, h: 1, icon: '📏', color: '#90a4ae', category: 'skill', unlisted: true,
    interactions: [job('etRailGauge', '레일 간격 재고 조정하기', '📏', 25, { energy: -0.08 }, 'handiness', 110)],
  },
  {
    id: 'etMonitorWall', name: '관제 상황판', price: 0, w: 3, h: 1, icon: '🗺️', color: '#1b252b', category: 'skill', unlisted: true,
    interactions: [job('etDispatchCrew', '정비 차량 배차하기', '🗺️', 20, { social: 0.1 }, 'logic', 120)],
  },
  { id: 'etRoundsBoard', name: '정기 점검 일정표', price: 0, w: 2, h: 1, icon: '🗓️', color: '#eceff1', category: 'skill', unlisted: true, interactions: [] },
  {
    id: 'etInspectDesk', name: '정기검사 기록대', price: 0, w: 2, h: 1, icon: '📒', color: '#ccd3d7', category: 'skill', unlisted: true,
    interactions: [job('etIssueCert', '검사 합격증 발급하기', '🏷️', 15, { fun: -0.03 }, 'logic', 150)],
  },
  {
    id: 'etSafetyRack', name: '안전 장비 걸이', price: 0, w: 2, h: 1, icon: '⛑️', color: '#f4c20d', category: 'skill', unlisted: true,
    interactions: [job('etCheckGear', '안전 장비 점검하기', '⛑️', 15, { fun: -0.03 }, 'logic', 170)],
  },
  { id: 'etLobbyModel', name: '승강기 구조 모형', price: 0, w: 2, h: 1, icon: '🛗', color: '#37474f', category: 'decor', unlisted: true, interactions: [] },
  // The barriers and notice set out before a car being serviced (2026-11-04, the layout audit): at either side of its doors, so the
  // engineer can still stand there.
  { id: 'etServiceBarrier', name: '점검 중 안내 바리케이드', price: 0, w: 2, h: 1, icon: '🚧', color: '#f4c20d', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
];
