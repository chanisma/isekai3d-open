import type { InteractionDef, ObjectDef } from '../types';

/**
 * 인테리어 시공 현장 (2026-11-01): what it was missing to feel like an apartment being refitted. A wall going a new colour under a roller, a
 * floor bay of boards and tile, a stepladder at a ceiling corner, a line laser at a bare wall, the plan pinned up, rolls and buckets,
 * the finished room the owner is walked round, the firm's sign and a site lamp. Drawn in view3d/workplaces/wallpaperer.ts (with
 * wallpapererMotion.ts). The firm and the flats are made up.
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
  { id: 'wlPaintWall', name: '페인트 시공 벽', price: 0, w: 2, h: 1, icon: '🖌️', color: '#9dbfae', category: 'skill', unlisted: true, interactions: [job('wlRoll', '롤러로 벽 칠하기', '🖌️', 24, { energy: -0.08 }, 'painting', 110), job('wlCutIn', '붓으로 모서리 따기', '🖌️', 16, { fun: 0.04 }, 'painting', 130)] },
  { id: 'wlFloorBay', name: '바닥 시공 구역', price: 0, w: 3, h: 2, icon: '🪵', color: '#c49a68', category: 'skill', unlisted: true, interactions: [job('wlPlank', '마루 깔고 두드리기', '🪵', 26, { energy: -0.1 }, 'handiness', 110), job('wlFloorTile', '바닥 타일 붙이기', '🧱', 26, { energy: -0.1 }, 'handiness', 110)] },
  { id: 'wlCeilingCorner', name: '천장 모서리 작업대', price: 0, w: 2, h: 1, icon: '🪜', color: '#ef7d2c', category: 'skill', unlisted: true, interactions: [job('wlCeiling', '사다리 올라 몰딩 메우기', '🪜', 22, { energy: -0.1 }, 'handiness', 120)] },
  { id: 'wlMeasureBay', name: '실측 벽', price: 0, w: 2, h: 1, icon: '📏', color: '#f2c531', category: 'skill', unlisted: true, interactions: [job('wlLaser', '레이저로 수평 잡기', '📐', 16, { fun: 0.03 }, 'logic', 130), job('wlTape', '줄자로 창 치수 재기', '📏', 12, { fun: 0.02 }, 'logic', 140)] },
  { id: 'wlSitePlan', name: '현장 도면판', price: 0, w: 2, h: 1, icon: '🗺️', color: '#e9e2cd', category: 'skill', unlisted: true, interactions: [job('wlPlan', '도면에 진행 표시하기', '🗺️', 12, { fun: -0.02 }, 'logic', 160)] },
  { id: 'wlMaterials', name: '자재 더미', price: 0, w: 2, h: 1, icon: '📦', color: '#c9a56f', category: 'skill', unlisted: true, interactions: [job('wlStock', '자재 수량 확인하기', '📦', 14, { energy: -0.04 }, 'logic', 160)] },
  { id: 'wlFinishRoom', name: '완성된 방', price: 0, w: 3, h: 1, icon: '🏠', color: '#c7d3bd', category: 'skill', unlisted: true, interactions: [job('wlWalk', '집주인과 마지막 점검하기', '🏠', 22, { social: 0.25 }, 'charisma', 110)] },
  { id: 'wlSign', name: '시공 업체 안내판', price: 0, w: 1, h: 1, icon: '📋', color: '#2e3b4a', category: 'decor', unlisted: true, interactions: [] },
  { id: 'wlWorkLight', name: '현장 작업등', price: 0, w: 1, h: 1, icon: '💡', color: '#f2c531', category: 'decor', unlisted: true, interactions: [] },
];
