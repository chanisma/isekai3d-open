import type { InteractionDef, ObjectDef } from '../types';

/**
 * The 여행사 (2026-11-01): what it was missing to feel real. A colleague's consultation desk, a stand of brochures, a passport and
 * visa counter, a luggage tag and gear table, a wall of past groups and the agency's sign. Drawn in
 * view3d/workplaces/tourGuide.ts (with tourGuideMotion.ts). The agency and every place in it are made up.
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
  { id: 'tgMateDesk', name: '동료 상담 책상', price: 0, w: 1, h: 1, icon: '🗓️', color: '#00897b', category: 'decor', unlisted: true, interactions: [] },
  { id: 'tgBrochureRack', name: '안내 책자 진열대', price: 0, w: 2, h: 1, icon: '📖', color: '#26a69a', category: 'skill', unlisted: true, interactions: [job('tgRestock', '안내 책자 채워 넣기', '📖', 20, { fun: -0.02 }, 'business', 130)] },
  { id: 'tgDocCounter', name: '여권·사증 창구', price: 0, w: 2, h: 1, icon: '📄', color: '#efe6d4', category: 'skill', unlisted: true, interactions: [job('tgVisa', '여권과 사증 서류 확인하기', '📄', 26, { fun: -0.04 }, 'logic', 110)] },
  { id: 'tgGearTable', name: '수하물·장비 탁자', price: 0, w: 2, h: 1, icon: '🧳', color: '#c9a87e', category: 'skill', unlisted: true, interactions: [job('tgTags', '수하물 꼬리표 달기', '🧳', 18, { fun: -0.02 }, 'empathy', 130), job('tgRadio', '안내용 수신기 점검하기', '🎧', 18, { fun: -0.02 }, 'logic', 130)] },
  { id: 'tgPhotoWall', name: '단체 사진 벽', price: 0, w: 2, h: 1, icon: '📋', color: '#c9a26f', category: 'skill', unlisted: true, interactions: [job('tgPinPhoto', '지난 단체 사진 붙이기', '📋', 16, { fun: 0.1 }, 'charisma', 150)] },
  { id: 'tgAgencySign', name: '여행사 안내판', price: 0, w: 1, h: 1, icon: '📋', color: '#17706a', category: 'decor', unlisted: true, interactions: [] },
  // The 여행사 on its street (2026-11-05, the layout audit): the glass front, the shop next door, the meeting point's picket by the coach.
  { id: 'tgFront', name: '여행사 유리 정면·간판', price: 0, w: 1, h: 1, icon: '🪧', color: '#00897b', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'tgNeighbor', name: '이웃 상가', price: 0, w: 7, h: 11, icon: '🏪', color: '#dfe6ea', category: 'decor', unlisted: true, interactions: [] },
  { id: 'tgMeetSign', name: '단체 집결 피켓', price: 0, w: 1, h: 1, icon: '🚩', color: '#00897b', category: 'decor', unlisted: true, interactions: [] },
];
