import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 방송국 스튜디오 (2026-11-01 workplace pipeline, at the user's request): what a variety and talk
 * show floor has round its set. Pedestal cameras with their operators, a floor manager's cue board, a bench of audience
 * under an applause sign, a game corner's buzzers, the writers' table, the gallery's wall of screens and vision mixer,
 * and a green room where a guest is being briefed. Drawn in view3d/workplaces/tvHost.ts (with tvHostMotion.ts).
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
  { id: 'tsPedestalCam', name: '페데스탈 카메라', price: 0, w: 1, h: 1, icon: '🎥', color: '#263238', category: 'skill', unlisted: true, interactions: [job('tsFrameShot', '카메라 구도 맞추기', '🎥', 15, { fun: 0.05 }, 'charisma', 150)] },
  { id: 'tsCueBoard', name: '플로어 큐보드', price: 0, w: 1, h: 1, icon: '📋', color: '#eceff1', category: 'skill', unlisted: true, interactions: [job('tsGiveCue', '플로어 큐 주기', '✋', 20, { social: 0.15, energy: -0.05 }, 'charisma', 130)] },
  { id: 'tsAudienceBench', name: '방청석', price: 0, w: 4, h: 2, icon: '👏', color: '#5e35b1', category: 'skill', unlisted: true, interactions: [{ ...job('tsWarmUp', '방청객 호응 연습시키기', '👏', 20, { social: 0.3, fun: 0.2, energy: -0.1 }, 'comedy', 100), chatty: true }] },
  { id: 'tsApplauseSign', name: '박수 사인', price: 0, w: 1, h: 1, icon: '👏', color: '#e53935', category: 'decor', unlisted: true, interactions: [] },
  {
    id: 'tsBuzzerDesk', name: '게임 코너 부저 책상', price: 0, w: 3, h: 1, icon: '🔔', color: '#ff9800', category: 'skill', unlisted: true,
    interactions: [
      { ...job('tsRunGame', '게임 코너 진행하기', '🔔', 30, { social: 0.3, fun: 0.3, energy: -0.1 }, 'comedy', 90), chatty: true },
      job('tsTestBuzzer', '부저 점검하기', '🔧', 10, { fun: -0.05 }, 'logic', 180),
    ],
  },
  {
    id: 'tsControlDesk', name: '부조정실 콘솔', price: 0, w: 4, h: 2, icon: '🎛️', color: '#15161e', category: 'skill', unlisted: true,
    interactions: [
      job('tsSwitchShots', '비전 믹서로 화면 전환하기', '🎛️', 25, { fun: 0.05, energy: -0.05 }, 'logic', 120),
      job('tsCheckAir', '큐시트 맞춰 방송 점검하기', '🖥️', 20, { fun: -0.05 }, 'logic', 140),
    ],
  },
  {
    id: 'tsScriptTable', name: '대본 책상', price: 0, w: 3, h: 1, icon: '📝', color: '#b08968', category: 'skill', unlisted: true,
    interactions: [
      job('tsPunchUp', '대본 멘트 다듬기', '📝', 25, { fun: -0.05 }, 'writing', 100),
      { ...job('tsReadThrough', '작가와 대본 리딩하기', '📖', 25, { social: 0.2, fun: 0.1 }, 'comedy', 110), chatty: true },
    ],
  },
  { id: 'tsGreenBrief', name: '출연자 대기실', price: 0, w: 3, h: 2, icon: '🛋️', color: '#6d8c7c', category: 'skill', unlisted: true, interactions: [{ ...job('tsBriefGuest', '게스트 사전 인터뷰하기', '📋', 25, { social: 0.3 }, 'charisma', 100), chatty: true }] },
  // Beside a studio's door, high on the wall (2026-11-05, the layout audit). Set dressing.
  { id: 'tsOnAirSign', name: 'ON AIR 등', price: 0, w: 1, h: 1, icon: '🔴', color: '#c62828', category: 'decor', unlisted: true, interactions: [] },
];
