import type { ObjectDef } from '../types';

/**
 * New furniture for the creator studio (2026-10-27 workplace pipeline, at the user's request): what a
 * Korean short-form · Instagram creator agency has besides its content desks, trend board, live desks
 * and photo wall — the shorts set (a pastel paper sweep, the phone upright on its tripod in a ring
 * light, the mark on the floor) where a dance challenge is danced and an info short told to the
 * phone held out at arm's length, pointing at the captions; the sponsor's unboxing table with the
 * brand's box and its products, filmed across the table; the reaction wall where the latest reel's
 * views, likes and comments come in live; the shelf of PR packages the brands send. Drawn in
 * view3d/workplaces/socialMedia.ts.
 */
export const OBJECTS: ObjectDef[] = [
  {
    id: 'smShortsSet', name: '숏폼 촬영 세트', price: 0, w: 2, h: 2, icon: '🎬', color: '#c9b6ff', category: 'skill', unlisted: true,
    interactions: [
      { id: 'smShootChallenge', label: '챌린지 숏폼 찍기', icon: '💃', duration: 25, effects: { fun: 0.25, energy: -0.15 }, skill: { key: 'dancing', rate: 1 / 90 }, requires: 'atWork', pose: 'front' },
      { id: 'smShootInfo', label: '정보 숏폼 찍기', icon: '📱', duration: 25, effects: { fun: 0.1, social: 0.1 }, skill: { key: 'charisma', rate: 1 / 100 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'smUnboxTable', name: '협찬 언박싱 테이블', price: 0, w: 2, h: 1, icon: '🎁', color: '#ffc1dc', category: 'skill', unlisted: true,
    interactions: [
      { id: 'smUnboxing', label: '협찬 제품 언박싱 찍기', icon: '🎁', duration: 30, effects: { fun: 0.15 }, skill: { key: 'charisma', rate: 1 / 110 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'smReactionWall', name: '실시간 반응 모니터', price: 0, w: 2, h: 1, icon: '📈', color: '#2a2440', category: 'skill', unlisted: true,
    interactions: [
      { id: 'smCheckReaction', label: '게시물 반응 확인하기', icon: '📈', duration: 15, effects: { fun: 0.05 }, skill: { key: 'logic', rate: 1 / 140 }, requires: 'atWork', pose: 'front' },
    ],
  },
  {
    id: 'smPrShelf', name: '협찬 선물 선반', price: 0, w: 2, h: 1, icon: '🛍️', color: '#fff6ec', category: 'decor', unlisted: true,
    interactions: [],
  },
];
