import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 영상의학센터 (2026-10-27 workplace pipeline, at the user's request): what an
 * imaging centre has besides its X-ray stand, CT, MRI and linac — the control-room console behind its
 * lead-glass window (where the images are checked, reported and the patients' doses logged), the
 * rack of lead aprons that are checked for cracks, the contrast injector that's filled and purged
 * before a contrast CT, the changing booth with its gowns, and the radiation warning sign with its
 * 촬영 중 lamp by the doors. The centre (한빛영상의학센터) is made up. Drawn in
 * view3d/workplaces/radiographer.ts (with radiographerMotion.ts).
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
    id: 'rgControlDesk', name: '판독 · 조정실 콘솔', price: 0, w: 2, h: 1, icon: '🖥️', color: '#8d99a5', category: 'skill', unlisted: true,
    interactions: [
      job('rgReviewImages', '촬영 영상 검수하기', '🖥️', 25, { fun: -0.05 }, 'medicine', 100),
      job('rgDoseLog', '환자 선량 기록하기', '📋', 20, { fun: -0.05 }, 'science', 120),
    ],
  },
  {
    id: 'rgApronRack', name: '납 가운 걸이', price: 0, w: 1, h: 1, icon: '🦺', color: '#263c5a', category: 'skill', unlisted: true,
    interactions: [job('rgCheckAprons', '납 가운 점검하기', '🦺', 15, { fun: -0.05 }, 'handiness', 140)],
  },
  {
    id: 'rgInjector', name: '조영제 자동 주입기', price: 0, w: 1, h: 1, icon: '💉', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [job('rgLoadInjector', '조영제 주입기 준비하기', '💉', 20, { fun: -0.05 }, 'medicine', 120)],
  },
  {
    id: 'rgChangeBooth', name: '탈의실', price: 0, w: 2, h: 1, icon: '👚', color: '#8fb4d6', category: 'skill', unlisted: true,
    interactions: [job('rgFoldGowns', '검사복 정리하기', '👚', 15, { hygiene: -0.05 }, 'handiness', 160)],
  },
  { id: 'rgWarnSign', name: '방사선 관리구역 안내판', price: 0, w: 1, h: 1, icon: '☢️', color: '#fbc02d', category: 'decor', unlisted: true, interactions: [] },
];
