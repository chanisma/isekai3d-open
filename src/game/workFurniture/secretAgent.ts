import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 정보 분석센터 (2026-11-01 workplace pipeline, at the user's request): what a made-up analysis office
 * has besides its desks and wall. A cork board with red thread, a seat for listening to signals, a document safe, a table
 * with a map and tokens for meetings, a badge desk by the secure door, a locker of field gear and a mat with a padded
 * dummy. Drawn in view3d/workplaces/secretAgent.ts (with secretAgentMotion.ts). The city and every case are invented.
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
  { id: 'icEvidenceBoard', name: '단서 연결 보드', price: 0, w: 2, h: 1, icon: '🧵', color: '#b58a57', category: 'skill', unlisted: true, interactions: [job('icPinThread', '사진 꽂고 실로 단서 잇기', '🧵', 25, { fun: 0.1 }, 'logic', 90), job('icReviewBoard', '동료와 단서 다시 따져 보기', '🤔', 20, { social: 0.2 }, 'logic', 110)] },
  { id: 'icSignalDesk', name: '신호 청취석', price: 0, w: 1, h: 1, icon: '🎧', color: '#37414d', category: 'skill', unlisted: true, interactions: [job('icDecodeSignal', '헤드셋 쓰고 암호 신호 해독하기', '🎧', 30, { fun: 0.05 }, 'language', 90)] },
  { id: 'icDocSafe', name: '보안 문서 금고', price: 0, w: 1, h: 1, icon: '🔒', color: '#3e5346', category: 'skill', unlisted: true, interactions: [job('icFileSecret', '금고 열어 기밀 문서 넣고 일지 쓰기', '🔒', 15, { fun: -0.03 }, 'logic', 150)] },
  { id: 'icBriefTable', name: '작전 회의 테이블', price: 0, w: 3, h: 1, icon: '🗺️', color: '#2f3844', category: 'skill', unlisted: true, interactions: [job('icConveneTeam', '지도 놓고 작전 회의 진행하기', '🗺️', 30, { social: 0.25 }, 'charisma', 100)] },
  { id: 'icBadgeDesk', name: '출입 관리대', price: 0, w: 2, h: 1, icon: '🪪', color: '#2c3a4e', category: 'skill', unlisted: true, interactions: [job('icIssueBadge', '방문증 발급하고 출입 확인하기', '🪪', 15, { social: 0.1 }, 'charisma', 150)] },
  { id: 'icGearLocker', name: '현장 장비 사물함', price: 0, w: 2, h: 1, icon: '🎒', color: '#5a6876', category: 'skill', unlisted: true, interactions: [job('icCheckKit', '무전기·쌍안경 점검하기', '🎒', 20, { fun: 0.05 }, 'logic', 150)] },
  { id: 'icDefenseMat', name: '체력 단련 매트', price: 0, w: 2, h: 2, icon: '🥋', color: '#3a72a6', category: 'skill', unlisted: true, interactions: [job('icSparTraining', '호신술 훈련하기', '🥋', 20, { energy: -0.1, fun: 0.1 }, 'fitness', 90)] },
  // The secure site (2026-11-05, the layout audit). The phones left at the door: a wall of small numbered lockers by the badge desk,
  // nothing with a camera or a radio goes further in.
  { id: 'icPhoneLocker', name: '휴대폰 보관함', price: 0, w: 2, h: 1, icon: '🔒', color: '#5a6876', category: 'decor', unlisted: true, interactions: [] },
  // The fence round the forecourt, drawn from its south-west tile: the mesh fence with its wire along the street and the sides, the
  // gateway left open with the barrier arm raised, the guard booth beside it, the plate on the gatepost.
  { id: 'icPerimeter', name: '보안 울타리·경비 초소', price: 0, w: 1, h: 1, icon: '🚧', color: '#78909c', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
];
