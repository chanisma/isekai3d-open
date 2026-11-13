import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 방송국 아나운서실 (2026-11-01 workplace pipeline, at the user's request): what an
 * announcers' room has besides a desk and a booth. The news set behind the anchor desk, a studio camera with its
 * prompter, a monitor wall, the run-down board, a practice mirror with its mouth chart (not the home mirror),
 * a makeup and wardrobe corner and a narration booth. Drawn in view3d/workplaces/announcer.ts (with announcerMotion.ts).
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
  { id: 'anNewsSet', name: '뉴스 세트 배경', price: 0, w: 4, h: 1, icon: '📺', color: '#0d47a1', category: 'decor', unlisted: true, interactions: [] },
  { id: 'anCamera', name: '스튜디오 카메라·프롬프터', price: 0, w: 1, h: 1, icon: '🎥', color: '#37474f', category: 'skill', unlisted: true, interactions: [job('anCheckPrompter', '프롬프터 원고 맞추기', '📝', 15, { fun: -0.05 }, 'writing', 150)] },
  { id: 'anMonitorWall', name: '모니터 월', price: 0, w: 3, h: 1, icon: '🖥️', color: '#263238', category: 'skill', unlisted: true, interactions: [job('anWatchAir', '방송 모니터링하기', '👀', 20, { fun: -0.05 }, 'logic', 150)] },
  { id: 'anRundownBoard', name: '뉴스 런다운 보드', price: 0, w: 2, h: 1, icon: '📋', color: '#eceff1', category: 'skill', unlisted: true, interactions: [{ ...job('anEditMeeting', '런다운 편집 회의하기', '🗣️', 30, { social: 0.3 }, 'charisma', 130), chatty: true }] },
  { id: 'anDictionMirror', name: '발음 연습 거울', price: 0, w: 2, h: 1, icon: '🪞', color: '#b0bec5', category: 'skill', unlisted: true, interactions: [job('anMouthDrill', '거울 보며 입 모양 연습하기', '🗣️', 15, { fun: -0.05 }, 'charisma', 130)] },
  { id: 'anMakeupCorner', name: '분장·의상 코너', price: 0, w: 3, h: 1, icon: '💄', color: '#f8bbd0', category: 'skill', unlisted: true, interactions: [{ id: 'anGetReady', label: '방송 전 분장·의상 점검하기', icon: '💄', duration: 15, effects: { hygiene: 0.1, fun: 0.05 }, requires: 'atWork', pose: 'front' }] },
  { id: 'anRecordBooth', name: '내레이션 녹음 부스', price: 0, w: 2, h: 1, icon: '🎙️', color: '#5d4037', category: 'skill', unlisted: true, interactions: [job('anNarrate', '다큐 내레이션 녹음하기', '🎙️', 30, { fun: 0.05 }, 'charisma', 110)] },
];
