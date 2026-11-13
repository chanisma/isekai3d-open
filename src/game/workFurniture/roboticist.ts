import type { InteractionDef, ObjectDef } from '../types';

/**
 * The 로봇 연구소 (2026-11-01, a new career and workplace at the user's request): a caged industrial arm with a light curtain and a
 * teach pendant, a course of ramp and steps that a four-legged robot really walks, an assembly bench with a soldered board and a
 * servo in a vice, a charging dock with a small serving robot on a taped route, a simulation wall that follows the real robots, a
 * test board, a 3D printer, shelves of spares. Drawn in view3d/workplaces/roboticist.ts (with roboticistMotion.ts). The company is
 * made up.
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
    id: 'rlArmCell', name: '로봇 팔 안전 구역', price: 0, w: 5, h: 3, icon: '🤖', color: '#ef7d22', category: 'skill', unlisted: true,
    interactions: [
      job('rlArmRun', '로봇 팔 집기·놓기 시운전하기', '🤖', 26, { fun: 0.03 }, 'programming', 100),
      job('rlTeach', '티치 펜던트로 팔 위치 가르치기', '🎮', 30, { fun: -0.03 }, 'programming', 80),
      job('rlCurtain', '라이트 커튼 안전 시험하기', '🚨', 22, { fun: -0.03 }, 'handiness', 130),
    ],
  },
  {
    id: 'rlQuadCourse', name: '사족 보행 시험장', price: 0, w: 6, h: 3, icon: '🐕', color: '#42685a', category: 'skill', unlisted: true,
    interactions: [
      job('rlWalk', '사족 로봇 경사로·계단 걷게 하기', '🐾', 30, { fun: 0.05 }, 'programming', 90),
      job('rlLegCheck', '사족 로봇 다리 관절 점검하기', '🔧', 28, { energy: -0.08 }, 'handiness', 90),
      { ...job('rlDemoAlarm', '시연 중 오작동 수습하기', '🚨', 40, { energy: -0.15 }, 'handiness', 60), requires: 'workAlarm' },
    ],
  },
  {
    id: 'rlAssemblyBench', name: '로봇 조립대', price: 0, w: 3, h: 1, icon: '🔩', color: '#3f6b4f', category: 'skill', unlisted: true,
    interactions: [
      job('rlSolder', '제어 보드 납땜하기', '🔌', 28, { fun: -0.03 }, 'handiness', 80),
      job('rlServo', '서보 모터 조립하고 돌려 보기', '⚙️', 28, { fun: 0.02 }, 'handiness', 80),
    ],
  },
  {
    id: 'rlChargeDock', name: '서빙 로봇 충전 도크', price: 0, w: 4, h: 3, icon: '🍽️', color: '#2f6fd0', category: 'skill', unlisted: true,
    interactions: [
      job('rlServe', '서빙 로봇 경로·장애물 시험하기', '🍽️', 28, { fun: 0.04 }, 'programming', 100),
      job('rlDock', '충전 도크 접점 점검하기', '🔌', 22, { energy: -0.06 }, 'handiness', 120),
    ],
  },
  {
    id: 'rlSimulatorStation', name: '시뮬레이션실', price: 0, w: 4, h: 2, icon: '💻', color: '#102027', category: 'skill', unlisted: true,
    interactions: [
      job('rlSim', '시뮬레이션과 실제 로봇 맞춰 보기', '📈', 28, { fun: -0.02 }, 'programming', 80),
      job('rlCode', '로봇 제어 코드 고치기', '💻', 30, { fun: -0.03 }, 'programming', 80),
    ],
  },
  { id: 'rlReviewBoard', name: '시험 결과 보드', price: 0, w: 3, h: 1, icon: '📊', color: '#90a4ae', category: 'skill', unlisted: true, interactions: [job('rlLog', '시험 결과 보드에 정리하기', '📋', 20, { fun: -0.03 }, 'programming', 150)] },
  { id: 'rlPrinter', name: '3D 프린터', price: 0, w: 1, h: 1, icon: '🖨️', color: '#37424a', category: 'skill', unlisted: true, interactions: [job('rlPrint', '3D 프린터로 브래킷 뽑기', '🖨️', 22, { fun: 0.02 }, 'handiness', 130)] },
  { id: 'rlPartsShelf', name: '로봇 부품 선반', price: 0, w: 3, h: 1, icon: '🔩', color: '#78909c', category: 'decor', unlisted: true, interactions: [] },
  { id: 'rlLegRack', name: '예비 다리 걸이', price: 0, w: 3, h: 1, icon: '🦿', color: '#546e7a', category: 'decor', unlisted: true, interactions: [] },
  { id: 'rlShowcase', name: '첫 번째 그리퍼 진열장', price: 0, w: 3, h: 1, icon: '🤖', color: '#37424a', category: 'decor', unlisted: true, interactions: [] },
  { id: 'rlLabSign', name: '로봇 연구소 안내판', price: 0, w: 1, h: 1, icon: '📋', color: '#17406d', category: 'decor', unlisted: true, interactions: [] },
];
