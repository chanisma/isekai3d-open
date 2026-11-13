import type { InteractionDef, ObjectDef } from '../types';

/**
 * The 데이터센터 (2026-11-01, a new career and workplace at the user's request): aisles of server racks that run towards the
 * camera so whoever's in them stays in view, a disk rack with one amber lamp and a basket of spares, a patch frame in the hot
 * aisle with its labeller, a raised floor tile on a suction lifter, a crash cart; cooling cabinets, a control room with a wall
 * of graphs; a chiller, a UPS and its batteries; a badge door. Drawn in view3d/workplaces/dataCenter.ts (with
 * dataCenterMotion.ts). The company is made up.
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
  { id: 'dcServerRack', name: '서버 랙 줄', price: 0, w: 3, h: 1, icon: '🗄️', color: '#263238', category: 'skill', unlisted: true, interactions: [job('dcPatrol', '서버 통로 순찰하기', '🔦', 24, { fun: -0.03 }, 'programming', 130)] },
  { id: 'dcDiskRack', name: '디스크 랙', price: 0, w: 3, h: 1, icon: '💾', color: '#37474f', category: 'skill', unlisted: true, interactions: [job('dcSwapDisk', '고장 난 디스크 찾아 교체하기', '💾', 28, { energy: -0.05 }, 'handiness', 90)] },
  {
    id: 'dcPatchFrame', name: '패치 프레임', price: 0, w: 3, h: 1, icon: '🔌', color: '#455a64', category: 'skill', unlisted: true,
    interactions: [job('dcPatch', '케이블 연결하고 라벨 붙이기', '🏷️', 25, { fun: -0.03 }, 'handiness', 100), job('dcTidy', '늘어진 케이블 묶어 정리하기', '🧰', 22, { energy: -0.05 }, 'handiness', 130)],
  },
  { id: 'dcFloorTile', name: '이중 바닥 점검구', price: 0, w: 2, h: 2, icon: '🔦', color: '#90a4ae', category: 'skill', unlisted: true, interactions: [job('dcLift', '바닥 타일 들고 배관·누수 살피기', '🔦', 30, { energy: -0.1 }, 'handiness', 110)] },
  { id: 'dcCrashCart', name: '크래시 카트', price: 0, w: 1, h: 1, icon: '🛒', color: '#546e7a', category: 'skill', unlisted: true, interactions: [job('dcCart', '먹통 서버에 직접 연결해 되살리기', '⌨️', 25, { fun: -0.03 }, 'programming', 90)] },
  {
    id: 'dcCrac', name: '항온항습기', price: 0, w: 2, h: 1, icon: '🌀', color: '#cfd8dc', category: 'skill', unlisted: true,
    interactions: [job('dcFilter', '항온항습기 필터 갈기', '🌀', 22, { energy: -0.08 }, 'handiness', 130), job('dcCracSet', '냉기 온도 맞추기', '🌡️', 20, { fun: -0.03 }, 'programming', 140)],
  },
  {
    id: 'dcChiller', name: '냉각기', price: 0, w: 3, h: 1, icon: '🌡️', color: '#78909c', category: 'skill', unlisted: true,
    interactions: [
      job('dcChillerCheck', '냉각기 압력·수온 점검하기', '🌡️', 22, { fun: -0.03 }, 'handiness', 130),
      { ...job('dcCoolAlarm', '냉각 장애 복구하기', '🚨', 40, { energy: -0.15 }, 'handiness', 60), requires: 'workAlarm' },
    ],
  },
  { id: 'dcUps', name: '무정전 전원 장치', price: 0, w: 3, h: 1, icon: '⚡', color: '#37474f', category: 'skill', unlisted: true, interactions: [job('dcUpsTest', '무정전 전원 시험하기', '⚡', 25, { fun: -0.03 }, 'programming', 120)] },
  { id: 'dcBatteryRack', name: '축전지 선반', price: 0, w: 3, h: 1, icon: '⚡', color: '#263238', category: 'skill', unlisted: true, interactions: [job('dcBatt', '축전지 전압 재기', '🔧', 24, { fun: -0.03 }, 'handiness', 120)] },
  {
    id: 'dcNocDesk', name: '관제 데스크', price: 0, w: 3, h: 1, icon: '🖥️', color: '#37474f', category: 'skill', unlisted: true,
    interactions: [job('dcWatch', '관제 화면 살피기', '📈', 30, { fun: -0.03 }, 'programming', 90), job('dcTicket', '장애 티켓 처리하기', '⌨️', 26, { fun: -0.03 }, 'programming', 90)],
  },
  { id: 'dcNocWall', name: '관제 화면 벽', price: 0, w: 5, h: 1, icon: '📊', color: '#102027', category: 'skill', unlisted: true, interactions: [job('dcHandover', '아침 근무조에 인수인계하기', '📋', 20, { social: 0.2 }, 'programming', 150)] },
  // Walked through (2026-11-05, the layout audit): it stands in the opening between the man-trap and the data hall, the inner of its two doors.
  { id: 'dcBadgeDoor', name: '출입 통제문', price: 0, w: 2, h: 1, icon: '🪪', color: '#607d8b', category: 'skill', unlisted: true, walkable: true, interactions: [job('dcBadge', '출입증 찍고 보안 구역 확인하기', '🪪', 12, { fun: -0.02 }, 'programming', 220)] },
  { id: 'dcSpareShelf', name: '예비 부품 선반', price: 0, w: 3, h: 1, icon: '🧰', color: '#78909c', category: 'decor', unlisted: true, interactions: [] },
  { id: 'dcGasBank', name: '소화 가스 용기', price: 0, w: 1, h: 1, icon: '🧯', color: '#c62828', category: 'decor', unlisted: true, interactions: [] },
  { id: 'dcSiteSign', name: '데이터센터 안내판', price: 0, w: 1, h: 1, icon: '📋', color: '#0d3b66', category: 'decor', unlisted: true, interactions: [] },
  // The site as a part of a big one (2026-11-05, the layout audit): the security desk where visitors sign in at the man-trap, the
  // hall's number, and out in the fenced yard the emergency generator, the cooling tower (the chiller beside them).
  { id: 'dcSecurityDesk', name: '보안 데스크', price: 0, w: 2, h: 1, icon: '🛎️', color: '#0d3b66', category: 'decor', unlisted: true, interactions: [] },
  { id: 'dcHallSign', name: '데이터 홀 번호 표지', price: 0, w: 1, h: 1, icon: '🔢', color: '#0d3b66', category: 'decor', unlisted: true, interactions: [] },
  { id: 'dcGenerator', name: '비상 발전기', price: 0, w: 2, h: 4, icon: '⚡', color: '#4e5d52', category: 'decor', unlisted: true, interactions: [] },
  { id: 'dcCoolingTower', name: '냉각탑', price: 0, w: 2, h: 2, icon: '🌀', color: '#b0bec5', category: 'decor', unlisted: true, interactions: [] },
  { id: 'dcYardFence', name: '설비 마당 보안 펜스', price: 0, w: 1, h: 1, icon: '🚧', color: '#78909c', category: 'decor', unlisted: true, interactions: [] },
];
