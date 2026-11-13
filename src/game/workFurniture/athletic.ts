import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 스포츠 구단 훈련장 (2026-10-27 workplace pipeline, at the user's request): what
 * a pro club's training ground has besides its lanes, racks and tactics board — the agility zone
 * (the ladder, the cones and a little goal, where the 기본기 is taught and the 연습 경기 drills are
 * run), the ice bath (냉탕) for recovery, the players' bench in the locker room facing the tactics
 * board, the lockers with the shirts hung in them (the 탈의실 조수's work), the water station (the 물
 * 당번's), and the trophy cabinet in the lobby. The club (솔뫼 FC of the 누리 리그) is made up. Drawn
 * in view3d/workplaces/athletic.ts.
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
    id: 'athAgility', name: '어질리티 존', price: 0, w: 3, h: 1, icon: '🪜', color: '#ff7043', category: 'skill', unlisted: true,
    interactions: [job('athLadder', '사다리 스텝 훈련', '🪜', 25, { energy: -0.25, hygiene: -0.2 }, 'fitness', 75)],
  },
  {
    id: 'athIceBath', name: '아이스 배스', price: 0, w: 2, h: 1, icon: '🧊', color: '#4fc3f7', category: 'skill', unlisted: true,
    interactions: [{ id: 'athIceBath', label: '냉탕에서 회복하기', icon: '🥶', duration: 20, effects: { energy: 0.25, fun: -0.1, hygiene: 0.15 }, requires: 'atWork', pose: 'front' }],
  },
  { id: 'athTeamBench', name: '선수단 벤치', price: 0, w: 3, h: 1, icon: '💺', color: '#2e7d32', category: 'decor', unlisted: true, interactions: [] },
  {
    id: 'athLockers', name: '선수 라커', price: 0, w: 2, h: 1, icon: '👕', color: '#8d6e63', category: 'skill', unlisted: true,
    interactions: [job('athTidyLockers', '라커룸 정리하기', '👕', 20, { energy: -0.05 }, 'charisma', 160)],
  },
  {
    id: 'athHydration', name: '수분 보충 스테이션', price: 0, w: 1, h: 1, icon: '💧', color: '#29b6f6', category: 'skill', unlisted: true,
    interactions: [
      job('athFillBottles', '선수단 물병 채우기', '💧', 20, { social: 0.05 }, 'fitness', 180),
      { id: 'athDrink', label: '이온 음료 마시기', icon: '🥤', duration: 10, effects: { energy: 0.1, fun: 0.05, bladder: -0.05 }, requires: 'atWork', pose: 'front' },
    ],
  },
  { id: 'athTrophyCase', name: '트로피 진열장', price: 0, w: 2, h: 1, icon: '🏆', color: '#ffca28', category: 'decor', unlisted: true, interactions: [] },
  // The training ground out of doors (2026-11-05, the layout audit): the pitch's lines on the grass with the sprint lane along its
  // touchline (held by a corner tile and drawn from there, walked over), a full-size goal with its net, the fence round the ground
  // with the ball-stop net behind the goal, and the guard booth at the gate with its barrier.
  { id: 'athPitch', name: '훈련 구장 라인', price: 0, w: 1, h: 1, icon: '🏃', color: '#ffffff', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'athGroundFence', name: '훈련장 펜스·볼 스톱 네트', price: 0, w: 1, h: 1, icon: '🚧', color: '#5f7d6a', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'athGoal', name: '축구 골대', price: 0, w: 7, h: 2, icon: '🏆', color: '#ffffff', category: 'decor', unlisted: true, interactions: [] },
  { id: 'athGateBooth', name: '훈련장 경비실', price: 0, w: 1, h: 1, icon: '🛎️', color: '#eceff1', category: 'decor', unlisted: true, interactions: [] },
  // The video analysis room's screen: last match's footage paused, the runs drawn over it.
  { id: 'athMatchScreen', name: '경기 영상 분석 화면', price: 0, w: 2, h: 1, icon: '📺', color: '#263238', category: 'decor', unlisted: true, interactions: [] },
];
