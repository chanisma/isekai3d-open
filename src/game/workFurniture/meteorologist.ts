import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 기상청 예보실 (2026-10-31 workplace pipeline, at the user's request): what a
 * forecast office has besides its chart wall, model terminals and radar: the table where the hour's
 * forecast is argued out, the lit table where a typhoon's track is plotted, the observation garden on
 * the lot (백엽상, rain gauge, wind mast) and the desk that answers the public's calls. Places and models
 * on them are made up. Drawn in view3d/workplaces/meteorologist.ts (with meteorologistMotion.ts).
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
    id: 'metBriefTable', name: '예보 토의 테이블', price: 0, w: 3, h: 2, icon: '🗣️', color: '#37566e', category: 'skill', unlisted: true,
    interactions: [job('metHourlyBrief', '정시 예보 토의 참석하기', '🗣️', 30, { social: 0.3 }, 'charisma', 150)],
  },
  {
    id: 'metTyphoonTable', name: '태풍 진로 테이블', price: 0, w: 2, h: 2, icon: '🌀', color: '#0d47a1', category: 'skill', unlisted: true,
    interactions: [job('metTrackTyphoon', '태풍 진로 예측하기', '🌀', 30, { fun: 0.05 }, 'science', 110)],
  },
  {
    id: 'metObsGarden', name: '관측 노장', price: 0, w: 3, h: 2, icon: '🌡️', color: '#7cb342', category: 'skill', unlisted: true,
    interactions: [
      job('metReadScreen', '백엽상 관측하기', '🌡️', 20, { fun: 0.05 }, 'science', 130),
      job('metRainGauge', '우량계 재기', '🌧️', 15, { fun: 0.05 }, 'science', 150),
    ],
  },
  {
    id: 'metPublicDesk', name: '날씨 문의 데스크', price: 0, w: 2, h: 1, icon: '📞', color: '#546e7a', category: 'skill', unlisted: true,
    interactions: [job('metAnswerPhone', '날씨 문의 전화 받기', '📞', 20, { social: 0.2 }, 'charisma', 130)],
  },
  // The office's observation field (2026-11-04, the layout audit): the 비양소, a small shed where the radiosonde is checked and its
  // balloon filled from the hydrogen generator before it goes up from the pad, and the field's fence, drawn from its corner.
  {
    id: 'metSondeHut', name: '비양소 (존데 준비실)', price: 0, w: 2, h: 2, icon: '🎈', color: '#eceff1', category: 'skill', unlisted: true,
    interactions: [job('metPrepSonde', '라디오존데 점검하고 풍선 채우기', '🎈', 25, { fun: 0.05 }, 'science', 130)],
  },
  { id: 'metPressBackdrop', name: '기상 브리핑 백드롭', price: 0, w: 3, h: 1, icon: '📺', color: '#12324f', category: 'decor', unlisted: true, interactions: [] },
  { id: 'metFieldFence', name: '관측장 울타리', price: 0, w: 1, h: 1, icon: '🚧', color: '#90a4ae', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
];
