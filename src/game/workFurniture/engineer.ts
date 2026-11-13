import type { ObjectDef } from '../types';

/**
 * New furniture for the engineering lab (2026-10-27 workplace pipeline, at the user's request): what
 * the 엔지니어링 연구소 was missing besides its robot benches, soldering benches, test rig, HIL racks
 * and the line's control panel — the measurement bench with the oscilloscope, the caged industrial
 * robot cell taught from its pendant, the prototyping corner (a desktop CNC mill and a 3D printer),
 * the parts kanban rack, the whiteboard of block diagrams and the compact EMC chamber with its
 * spectrum analyser. Drawn in view3d/workplaces/engineer.ts; the ids start `eng`.
 */
export const OBJECTS: ObjectDef[] = [
  {
    id: 'engScopeBench', name: '계측 작업대', price: 0, w: 1, h: 1, icon: '📈', color: '#546e7a', category: 'skill', unlisted: true,
    interactions: [
      { id: 'engProbeSignal', label: '오실로스코프로 신호 측정하기', icon: '📈', duration: 25, effects: { fun: 0.05 }, skill: { key: 'logic', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'engRobotCell', name: '산업용 로봇 셀', price: 0, w: 2, h: 2, icon: '🏭', color: '#ff8f1f', category: 'skill', unlisted: true,
    interactions: [
      { id: 'engTeachRobot', label: '티칭 펜던트로 로봇 티칭하기', icon: '🕹️', duration: 35, effects: { fun: 0.15 }, skill: { key: 'programming', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'engFabCorner', name: '시제품 제작 코너', price: 0, w: 2, h: 1, icon: '🖨️', color: '#78909c', category: 'skill', unlisted: true,
    interactions: [
      { id: 'engPrintPrototype', label: '시제품 3D 프린팅하기', icon: '🖨️', duration: 25, effects: { fun: 0.1 }, skill: { key: 'handiness', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'engKanbanRack', name: '부품 칸반 선반', price: 0, w: 2, h: 1, icon: '🗃️', color: '#1e88e5', category: 'skill', unlisted: true,
    interactions: [
      { id: 'engPickParts', label: '칸반에서 부품 챙기기', icon: '🔩', duration: 10, effects: { energy: -0.02 }, skill: { key: 'logic', rate: 1 / 200 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'engBlockBoard', name: '블록 다이어그램 화이트보드', price: 0, w: 2, h: 1, icon: '🧩', color: '#fafafa', category: 'skill', unlisted: true,
    interactions: [
      { id: 'engBlockDiagram', label: '시스템 블록도 그리기', icon: '🧩', duration: 20, effects: { fun: 0.05 }, skill: { key: 'logic', rate: 1 / 120 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'engEmcChamber', name: 'EMC 시험 챔버', price: 0, w: 2, h: 1, icon: '📡', color: '#455a64', category: 'skill', unlisted: true,
    interactions: [
      { id: 'engEmcTest', label: '전자파(EMC) 시험하기', icon: '📡', duration: 30, effects: { fun: -0.03 }, skill: { key: 'logic', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
      // The lab's call-out (2026-11-05, the layout audit: a lab has no production line to break down): the certification lab
      // reports the prototype over the emissions limit, and the noise has to be found before the date slips.
      { id: 'engEmcFix', label: '전자파 기준 초과 원인 찾기', icon: '🚨', duration: 40, effects: { energy: -0.15 }, skill: { key: 'logic', rate: 1 / 60 }, requires: 'workAlarm', pose: 'front' },
    ],
  },
  // The lab as a 기업부설연구소 (2026-11-05, the layout audit): the front desk at the gates, the absorber lining of the EMC chamber
  // (a shielded room, not a box), the lab's name on the pavement.
  { id: 'engReception', name: '연구소 안내 데스크', price: 0, w: 2, h: 1, icon: '🛎️', color: '#2f6fa3', category: 'decor', unlisted: true, interactions: [] },
  { id: 'engAbsorberWall', name: '전파 흡수체 벽', price: 0, w: 1, h: 1, icon: '📡', color: '#1f2a36', category: 'decor', unlisted: true, interactions: [] },
  { id: 'engLabSign', name: '기술연구소 명판', price: 0, w: 1, h: 1, icon: '⚙️', color: '#2f6fa3', category: 'decor', unlisted: true, interactions: [] },
];
