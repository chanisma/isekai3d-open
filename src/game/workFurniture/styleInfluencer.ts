import type { InteractionDef, ObjectDef } from '../types';

/**
 * New furniture for the 스타일 스튜디오 (2026-10-27 workplace pipeline, at the user's request): what a
 * style creator's studio has besides its lookbook set, its racks and its forms — the full-length
 * OOTD mirror with a ring light and the phone on its tripod (오늘의 착장, shot in the mirror); the
 * garment steamer that every look goes past before it's shot; the shoe and bag wall, lit shelf by
 * shelf, where the shoes, bags and sunglasses are matched to a look; and the 협찬 table where the
 * brands' boxes come in and are opened to the camera. The brands (메종 루아, 소일, 오네, 루프) and the
 * studio (스튜디오 모어) are made up. Drawn in view3d/workplaces/styleInfluencer.ts.
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
    id: 'siOotdMirror', name: '착장 거울', price: 0, w: 1, h: 1, icon: '🪞', color: '#e8dccb', category: 'skill', unlisted: true,
    interactions: [job('siOotdShoot', '오늘의 착장(OOTD) 찍기', '🤳', 20, { fun: 0.2 }, 'photography', 100)],
  },
  {
    id: 'siSteamer', name: '스팀다리미', price: 0, w: 1, h: 1, icon: '👚', color: '#f3e5f5', category: 'skill', unlisted: true,
    interactions: [job('siSteamOutfit', '촬영 의상 스팀하기', '👚', 15, { fun: -0.03 }, 'painting', 160)],
  },
  {
    id: 'siShoeWall', name: '신발·가방 진열장', price: 0, w: 2, h: 1, icon: '👠', color: '#d7ccc8', category: 'skill', unlisted: true,
    interactions: [job('siMatchAccessories', '신발·가방 매칭하기', '👠', 20, { fun: 0.15 }, 'painting', 120)],
  },
  {
    id: 'siUnboxTable', name: '협찬 언박싱 테이블', price: 0, w: 2, h: 1, icon: '📦', color: '#f8e1e7', category: 'skill', unlisted: true,
    interactions: [job('siUnboxPr', '협찬품 언박싱하기', '📦', 25, { fun: 0.25 }, 'charisma', 110)],
  },
  // The street front and the unit next door (2026-11-05, the layout audit; view3d/workplaces/shopFront.ts).
  { id: 'siShopFront', name: '스튜디오 유리 정면·간판', price: 0, w: 1, h: 1, icon: '🪧', color: '#880e4f', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
  { id: 'siNeighbor', name: '이웃 빈티지 숍', price: 0, w: 7, h: 11, icon: '🏪', color: '#e6dfd6', category: 'decor', unlisted: true, interactions: [] },
];
