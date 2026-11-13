import type { InteractionDef, ObjectDef } from '../types';

/**
 * The 우주 센터 (2026-11-01): what it was missing to feel real. A big ground-track wall for the control room, a suit-fitting rack, a
 * low-gravity rig, a robotic-arm trainer, a science glovebox, a survival corner and a press and school-visit wall. Agency and
 * mission names are invented. Drawn in view3d/workplaces/astronaut.ts (with astronautMotion.ts).
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
  { id: 'asGroundTrack', name: '지상 궤적 대형 화면', price: 0, w: 6, h: 1, icon: '🗺️', color: '#16263f', category: 'decor', unlisted: true, interactions: [] },
  { id: 'asSuitRack', name: '우주복 피팅 랙', price: 0, w: 2, h: 1, icon: '🧑‍🚀', color: '#dfe5e9', category: 'skill', unlisted: true, interactions: [job('asFitSuit', '우주복 치수 맞추기', '📏', 24, { fun: -0.03 }, 'handiness', 110), job('asCarryHelmet', '헬멧 옮겨 와 바이저 닦기', '⛑️', 22, { fun: -0.03 }, 'handiness', 120)] },
  { id: 'asLowGravRig', name: '저중력 훈련 장치', price: 0, w: 3, h: 2, icon: '🌙', color: '#7c7d7a', category: 'skill', unlisted: true, interactions: [job('asLowWalk', '저중력 보행 훈련', '🌙', 30, { energy: -0.2, fun: 0.15 }, 'fitness', 90), job('asLowSample', '저중력 표본 채집 훈련', '🪨', 28, { energy: -0.15, fun: 0.1 }, 'science', 100)] },
  { id: 'asArmTrainer', name: '로봇팔 훈련기', price: 0, w: 2, h: 1, icon: '🤖', color: '#39434c', category: 'skill', unlisted: true, interactions: [job('asArmCapture', '로봇팔로 모듈 포획 훈련', '🤖', 30, { fun: 0.1 }, 'rocketScience', 90), job('asArmBerth', '모듈 결합 포트에 옮기기', '🛰️', 30, { fun: 0.08 }, 'rocketScience', 95)] },
  { id: 'asGlovebox', name: '과학 글러브박스', price: 0, w: 2, h: 1, icon: '🧪', color: '#cfd8dc', category: 'skill', unlisted: true, interactions: [job('asGloveCrystal', '단백질 결정 실험하기', '💎', 30, { fun: 0.05 }, 'science', 85), job('asGloveFluid', '표면 장력 실험하기', '💧', 28, { fun: 0.05 }, 'science', 90)] },
  { id: 'asSurvivalCorner', name: '생존 훈련 코너', price: 0, w: 2, h: 2, icon: '🏕️', color: '#5d7247', category: 'skill', unlisted: true, interactions: [job('asShelter', '낙하산 천으로 피난처 세우기', '⛺', 26, { energy: -0.15, fun: 0.08 }, 'fitness', 110), job('asSignal', '구조 신호 보내고 불 피우기', '🔥', 24, { energy: -0.08, fun: 0.08 }, 'fitness', 120)] },
  { id: 'asPressWall', name: '언론·견학 벽', price: 0, w: 3, h: 1, icon: '🎤', color: '#16263f', category: 'skill', unlisted: true, interactions: [job('asPress', '언론 인터뷰에 답하기', '🎤', 22, { social: 0.3 }, 'charisma', 110), job('asCards', '어린이 질문 카드에 답하기', '✍️', 18, { social: 0.2, fun: 0.1 }, 'writing', 130)] },
  // The centre made over for its space (2026-11-05, the layout audit): a full-size station module in the training hall, the
  // neutral-buoyancy pool, the centrifuge in its own hall at a centrifuge's size, the glass between mission control and its
  // visitors' gallery, and outside the launch-vehicle display and the tracking antenna.
  { id: 'asModuleMockup', name: '정거장 모듈 실물 모형', price: 0, w: 5, h: 2, icon: '🛰️', color: '#eceff1', category: 'decor', unlisted: true, interactions: [] },
  { id: 'asNbPool', name: '중성부력 수조', price: 0, w: 7, h: 4, icon: '🤿', color: '#4fc3f7', category: 'decor', unlisted: true, interactions: [] },
  {
    id: 'asBigCentrifuge', name: '유인 원심 가속기', price: 0, w: 5, h: 5, icon: '🌀', color: '#ffb300', category: 'skill', unlisted: true,
    interactions: [job('gForceTraining', '중력 가속도 훈련', '🌀', 30, { energy: -0.25, fun: 0.1 }, 'fitness', 80)],
  },
  { id: 'asGalleryGlass', name: '관람석 유리창', price: 0, w: 11, h: 1, icon: '🪟', color: '#b3e5fc', category: 'decor', unlisted: true, interactions: [] },
  { id: 'asLaunchDisplay', name: '발사체 전시', price: 0, w: 2, h: 2, icon: '🚀', color: '#f5f5f5', category: 'decor', unlisted: true, interactions: [] },
  { id: 'asDishAntenna', name: '추적 안테나', price: 0, w: 3, h: 3, icon: '📡', color: '#eceff1', category: 'decor', unlisted: true, interactions: [] },
];
