import type { InteractionDef, ObjectDef } from '../types';

/**
 * The 자율주행차 개발 센터 (2026-11-01, a new career and workplace at the user's request): a test course (outdoors since 2026-11-05) whose car drives its
 * loop with the dweller in the safety operator's seat, stopping for a dummy on the crossing, with a red button on a post that halts it; a
 * checker board and a rig of sensors; a desk whose point cloud follows the run; a pen display for labelling road scenes; a second car
 * on a lift, hood up; the safety board. Drawn in view3d/workplaces/selfDriving.ts (with selfDrivingMotion.ts). The company is made up.
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
    id: 'sdTrack', name: '실외 시험 코스', price: 0, w: 12, h: 6, icon: '🚗', color: '#3c4247', category: 'skill', unlisted: true,
    interactions: [
      job('sdRide', '안전요원으로 시험차 타고 한 바퀴 돌기', '🚗', 35, { energy: -0.05 }, 'logic', 90),
      job('sdDummy', '보행자 모형 세우고 건널목 시험 준비하기', '🚶', 20, { fun: -0.03 }, 'logic', 140),
      { ...job('sdEStop', '시험차 긴급 정지하기', '🚨', 30, { energy: -0.15 }, 'logic', 60), requires: 'workAlarm' },
    ],
  },
  { id: 'sdCalibBoard', name: '센서 보정판', price: 0, w: 3, h: 2, icon: '🎯', color: '#eceff1', category: 'skill', unlisted: true, interactions: [job('sdCalib', '보정판 옮겨 가며 센서 맞추기', '🎯', 26, { energy: -0.05 }, 'logic', 100)] },
  {
    id: 'sdLogDesk', name: '주행 기록 분석 책상', price: 0, w: 3, h: 1, icon: '📊', color: '#46525a', category: 'skill', unlisted: true,
    interactions: [job('sdLog', '주행 기록 돌려 보며 분석하기', '📊', 28, { fun: -0.03 }, 'logic', 90), job('sdFix', '인지 코드 고치고 다시 돌려 보기', '⌨️', 30, { fun: -0.03 }, 'programming', 80)],
  },
  {
    id: 'sdLabelStation', name: '라벨링 작업대', price: 0, w: 2, h: 1, icon: '🏷️', color: '#d9c6a6', category: 'skill', unlisted: true,
    interactions: [job('sdLabel', '도로 장면에 라벨 그리기', '🏷️', 25, { fun: -0.05 }, 'programming', 120), job('sdAudit', '라벨 검수하고 고치기', '🔍', 22, { fun: -0.03 }, 'logic', 120)],
  },
  {
    id: 'sdGarage', name: '시험차 정비 베이', price: 0, w: 5, h: 3, icon: '🔧', color: '#3a7fb8', category: 'skill', unlisted: true,
    interactions: [
      job('sdHood', '보닛 열고 주행 컴퓨터 점검하기', '🔧', 24, { energy: -0.05 }, 'programming', 120),
      job('sdUnder', '리프트 올려 하부 배선 살피기', '🔦', 22, { energy: -0.08 }, 'logic', 140),
      job('sdLidar', '라이다 떼어 닦고 다시 달기', '🧽', 26, { energy: -0.08 }, 'logic', 120),
    ],
  },
  { id: 'sdSafetyBoard', name: '안전 게시판', price: 0, w: 3, h: 1, icon: '📋', color: '#00a0a8', category: 'skill', unlisted: true, interactions: [job('sdBrief', '주행 전 안전 브리핑하기', '📋', 20, { social: 0.2 }, 'logic', 150)] },
  { id: 'sdSensorShelf', name: '센서 선반', price: 0, w: 3, h: 1, icon: '🧰', color: '#8d99a3', category: 'decor', unlisted: true, interactions: [] },
  { id: 'sdCharger', name: '시험차 충전기', price: 0, w: 1, h: 1, icon: '🔌', color: '#f1f4f6', category: 'decor', unlisted: true, interactions: [] },
  { id: 'sdSign', name: '개발 센터 안내판', price: 0, w: 1, h: 1, icon: '📋', color: '#123a5a', category: 'decor', unlisted: true, interactions: [] },
  // 2026-11-05, the layout audit: the wall of screens in the engineers' office.
  { id: 'sdMonitorWall', name: '시험 차량 관제 화면', price: 0, w: 3, h: 1, icon: '🖥️', color: '#2f363c', category: 'decor', unlisted: true, interactions: [] },
  // The garage's walls and its open side on the course, its shutter rolled up (a wall between the open garage and the lot isn't drawn).
  { id: 'sdGarageShell', name: '정비동 벽·말린 셔터', price: 0, w: 1, h: 1, icon: '🚪', color: '#e8e2d4', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
];
