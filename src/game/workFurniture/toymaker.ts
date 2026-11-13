import type { InteractionDef, ObjectDef } from '../types';

const job = (id: string, label: string, icon: string, key: NonNullable<InteractionDef['skill']>['key'], duration = 25): InteractionDef => ({
  id, label, icon, duration, requires: 'atWork', pose: 'front',
  effects: { fun: 0.15 }, skill: { key, rate: 1 / 100 },
});

/** 도토리 is the fictional maker's mark on the toys, never the workplace name. */
export const OBJECTS: ObjectDef[] = [
  { id: 'tmCustomerChair', name: '맞춤 주문·시연 카운터', price: 0, w: 1, h: 1,
    icon: '🧸', color: '#5d9f96', category: 'skill', unlisted: true,
    interactions: [job('tmDemoToy', '태엽 장난감 시연하기', '🪀', 'charisma', 25), job('tmTakeOrder', '맞춤 완구 주문서 작성하기', '📝', 'handiness', 25)] },
  { id: 'tmDryingRack', name: '완구 도색 건조대', price: 0, w: 2, h: 1,
    icon: '🖌️', color: '#deae69', category: 'skill', unlisted: true,
    interactions: [job('tmCheckFinish', '도색 건조·표면 검사하기', '🖌️', 'painting', 25)] },
  { id: 'tmScrollSaw', name: '목제 완구 실톱 기계', price: 0, w: 2, h: 1,
    icon: '🪵', color: '#568e89', category: 'skill', unlisted: true,
    interactions: [job('tmCutBlank', '나무 오리 윤곽 자르기', '🪵', 'handiness', 30)] },
  { id: 'tmRobotBench', name: '스마트 완구 개발대', price: 0, w: 2, h: 1,
    icon: '🤖', color: '#7695b8', category: 'skill', unlisted: true,
    interactions: [job('tmTuneToy', '로봇 바퀴·센서 조정하기', '🤖', 'handiness', 30)] },
  // 2026-11-05, the layout audit: the shop at the front.
  { id: 'tmShopWindow', name: '쇼윈도 진열대', price: 0, w: 3, h: 1, icon: '🪟', color: '#c59a65', category: 'decor', unlisted: true, interactions: [] },
  { id: 'tmDisplayTable', name: '진열 테이블', price: 0, w: 2, h: 1, icon: '🧸', color: '#e3bd86', category: 'decor', unlisted: true, interactions: [] },
];
