import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the e스포츠 게임단 연습실 (2026-11-01 workplace pipeline, at the user's request): what a team house has
 * besides its desks. A magnet board for the draft, a fan stream set, a wall of cups and sponsors, a corner where wrists are
 * seen to, a bench where keyboards and mice are tuned and a stage with a booth for match days. Drawn in
 * view3d/workplaces/proGamer.ts (with proGamerMotion.ts). All team, game, hero and sponsor names are made up.
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
  { id: 'egDraftBoard', name: '밴픽 보드', price: 0, w: 2, h: 1, icon: '🧠', color: '#17204a', category: 'skill', unlisted: true, interactions: [job('egPlanDraft', '밴픽 보드에 전략 붙이기', '🧠', 30, { fun: 0.05 }, 'logic', 100), job('egDraftDebate', '코치와 밴픽 놓고 토론하기', '💬', 25, { social: 0.25 }, 'leadership', 110)] },
  { id: 'egStreamDesk', name: '팬 방송 세트', price: 0, w: 2, h: 1, icon: '🎥', color: '#6a3fd0', category: 'skill', unlisted: true, interactions: [job('egFanStream', '팬 방송 켜고 소통하기', '🎥', 35, { fun: 0.2, social: 0.25 }, 'charisma', 100)] },
  { id: 'egTrophyWall', name: '트로피·후원사 벽', price: 0, w: 3, h: 1, icon: '🏆', color: '#e8b93f', category: 'skill', unlisted: true, interactions: [job('egSponsorShoot', '후원사 홍보 사진 찍기', '📸', 20, { social: 0.1 }, 'charisma', 120), job('egPolishCup', '우승컵 닦기', '🏆', 15, { fun: 0.05 }, 'handiness', 160)] },
  { id: 'egPhysio', name: '손목 관리 코너', price: 0, w: 2, h: 2, icon: '💆', color: '#3b6b6a', category: 'skill', unlisted: true, interactions: [job('egWristCare', '물리치료사에게 손목 관리받기', '💆', 25, { energy: 0.1, fun: 0.05 }, 'fitness', 160), job('egHandDrill', '경기 전 손 풀기 체조하기', '💪', 15, { energy: 0.03 }, 'fitness', 130)] },
  { id: 'egGearBench', name: '장비 점검대', price: 0, w: 2, h: 1, icon: '⌨️', color: '#8a6242', category: 'skill', unlisted: true, interactions: [job('egTuneKeyboard', '키보드 스위치 교체하기', '⌨️', 20, { fun: 0.05 }, 'handiness', 120), job('egMeasureSens', '마우스 감도 재서 맞추기', '🎮', 20, { fun: -0.02 }, 'videoGaming', 110)] },
  { id: 'egStageBooth', name: '경기 무대 부스', price: 0, w: 5, h: 3, icon: '🏟️', color: '#20233a', category: 'skill', unlisted: true, interactions: [job('egShowMatch', '관객 앞에서 쇼매치 뛰기', '🏟️', 40, { fun: 0.35, energy: -0.12 }, 'videoGaming', 70), job('egStageTest', '경기 전 무대 장비 점검하기', '🔌', 20, { fun: -0.03 }, 'logic', 140)] },
  // The team house's lobby (2026-11-05, the layout audit): the club's logo on the wall behind the security desk.
  { id: 'egLogoWall', name: '구단 로고 월', price: 0, w: 2, h: 1, icon: '🌌', color: '#17204a', category: 'decor', unlisted: true, interactions: [] },
];
