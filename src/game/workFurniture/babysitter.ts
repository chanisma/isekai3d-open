import type { ObjectDef } from '../types';

/**
 * New furniture for the small home-style 어린이집 (2026-11-01 workplace pipeline, at the user's request): what it has
 * besides the pieces it shares with the 국공립 어린이집 — the nappy station, the low snack table, the play kitchen, the
 * desk where the 알림장 notes to parents are written, the entryway where a child is met and their temperature taken,
 * and the wall of family photos and the height chart. The centre (포근둥지), its class and every name are made up.
 * The nappy station is only ever cleaned and stocked here: no child is shown on it. Drawn in
 * view3d/workplaces/babysitter.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    id: 'bsNappyStation', name: '기저귀 교환대', price: 0, w: 1, h: 1, icon: '🧷', color: '#b2dfdb', category: 'skill', unlisted: true,
    interactions: [
      { id: 'bsRestockNappies', label: '교환대 소독하고 기저귀 채우기', icon: '🧴', duration: 15, effects: { hygiene: 0.05, fun: -0.03 }, skill: { key: 'empathy', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'bsSnackTable', name: '간식 상', price: 0, w: 2, h: 1, icon: '🍎', color: '#ffe0b2', category: 'skill', unlisted: true,
    interactions: [
      { id: 'bsServeSnack', label: '간식 나눠 주기', icon: '🍎', duration: 20, effects: { social: 0.2, fun: 0.1 }, skill: { key: 'cooking', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'bsPlayKitchen', name: '소꿉놀이 코너', price: 0, w: 2, h: 1, icon: '🍳', color: '#ffccbc', category: 'skill', unlisted: true,
    interactions: [
      { id: 'bsPretendPlay', label: '소꿉놀이 같이 하기', icon: '🍳', duration: 20, effects: { fun: 0.3, social: 0.2 }, skill: { key: 'creativity', rate: 1 / 140 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'bsNoteDesk', name: '알림장 책상', price: 0, w: 1, h: 1, icon: '📒', color: '#ffe082', category: 'skill', unlisted: true,
    interactions: [
      { id: 'bsWriteNote', label: '알림장 쓰기', icon: '📒', duration: 20, effects: { fun: -0.02 }, skill: { key: 'empathy', rate: 1 / 130 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'bsEntry', name: '현관 맞이 공간', price: 0, w: 2, h: 1, icon: '🎒', color: '#d7ccc8', category: 'skill', unlisted: true,
    interactions: [
      { id: 'bsGreetChild', label: '등원 맞이 · 체온 재기', icon: '🌡️', duration: 15, effects: { social: 0.25 }, skill: { key: 'charisma', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'bsFamilyWall', name: '우리 가족 사진 벽 · 키재기 자', price: 0, w: 1, h: 1, icon: '🧸', color: '#fff59d', category: 'decor', unlisted: true,
    interactions: [],
  },
  // The family's flat and the 단지 playground (2026-11-05, the layout audit): the living room's play mat and the playground's swings.
  { id: 'bsPlayMat', name: '거실 놀이 매트', price: 0, w: 3, h: 2, icon: '🧩', color: '#ffe0b2', category: 'decor', unlisted: true, interactions: [] },
  {
    id: 'bsSwing', name: '놀이터 그네', price: 0, w: 2, h: 1, icon: '🛝', color: '#ffb74d', category: 'skill', unlisted: true,
    interactions: [
      { id: 'bsPushSwing', label: '그네 밀어 주기', icon: '🛝', duration: 20, effects: { fun: 0.2, energy: -0.05 }, skill: { key: 'charisma', rate: 1 / 150 }, requires: 'atWork', pose: 'front' },
    ],
  },
];
