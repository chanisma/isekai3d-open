/**
 * Wallpaper and flooring for build mode (참고 게임 lets you repaint walls and floors per room; ours are
 * a few presets priced per room).
 */
/** A room: the four the house starts with keep their names; rooms built later are 'room1', 'room2', … */
export type Room = string;
export type WallPattern = 'stripes' | 'tiles' | 'plain' | 'wainscot' | 'siding' | 'dots' | 'brick';
export type FloorKind = 'wood' | 'tile' | 'carpet' | 'stone' | 'asphalt' | 'concrete' | 'soil';

export interface WallStyle {
  id: string;
  label: string;
  base: string;
  accent: string;
  pattern: WallPattern;
  price: number;
}

export interface FloorStyle {
  id: string;
  label: string;
  kind: FloorKind;
  a: string;
  b: string;
  price: number;
}

export const WALL_STYLES: WallStyle[] = [
  { id: 'lavenderStripes', label: '라벤더 줄무늬', base: '#b7a6d6', accent: '#a493c7', pattern: 'stripes', price: 120 },
  { id: 'aquaTiles', label: '하늘색 타일', base: '#9fd3d1', accent: '#86c1bf', pattern: 'tiles', price: 150 },
  { id: 'creamPlain', label: '크림 단색', base: '#f1dfb8', accent: '#e2c994', pattern: 'plain', price: 80 },
  { id: 'oakWainscot', label: '참나무 징두리', base: '#d9b99b', accent: '#9c6b4a', pattern: 'wainscot', price: 160 },
  { id: 'mintDots', label: '민트 물방울', base: '#cdebd6', accent: '#9fd1b0', pattern: 'dots', price: 130 },
  { id: 'roseStripes', label: '장밋빛 줄무늬', base: '#f3c6cf', accent: '#e7a8b5', pattern: 'stripes', price: 120 },
  { id: 'redBrick', label: '붉은 벽돌', base: '#b5654a', accent: '#8e4a35', pattern: 'brick', price: 200 },
  { id: 'navyWainscot', label: '남색 징두리', base: '#9fb3cc', accent: '#3f5677', pattern: 'wainscot', price: 160 },
];

export const FLOOR_STYLES: FloorStyle[] = [
  { id: 'oakWood', label: '참나무 마루', kind: 'wood', a: '#c8925f', b: '#6e3c19', price: 180 },
  { id: 'walnutWood', label: '호두나무 마루', kind: 'wood', a: '#8a5a3b', b: '#4b2a16', price: 220 },
  { id: 'lilacCarpet', label: '라일락 카펫', kind: 'carpet', a: '#a58fcf', b: '#2a1450', price: 150 },
  { id: 'sageCarpet', label: '세이지 카펫', kind: 'carpet', a: '#9cb59a', b: '#203a1e', price: 150 },
  { id: 'aquaTile', label: '하늘색 타일', kind: 'tile', a: '#eef7f8', b: '#cfe6ea', price: 160 },
  { id: 'creamTile', label: '크림 체크 타일', kind: 'tile', a: '#efe2c6', b: '#d9c49c', price: 160 },
  { id: 'monoTile', label: '흑백 체크 타일', kind: 'tile', a: '#f4f4f4', b: '#4a4a4a', price: 190 },
  { id: 'slateStone', label: '석판', kind: 'stone', a: '#a7adb3', b: '#7f868d', price: 240 },
];

/**
 * Ground laid outdoors on a work lot (2026-11-04, the layout audit: a bus depot, a quay or an apron isn't a lawn): not for sale, painted
 * by a workplace's `ground` over the grass round its building.
 */
export const GROUND_STYLES: FloorStyle[] = [
  { id: 'asphalt', label: '아스팔트', kind: 'asphalt', a: '#55595e', b: '#3f4246', price: 0 },
  { id: 'concrete', label: '콘크리트', kind: 'concrete', a: '#c3c1ba', b: '#a9a69e', price: 0 },
  { id: 'quayConcrete', label: '부두 콘크리트', kind: 'concrete', a: '#b4b1a8', b: '#8f8b82', price: 0 },
  { id: 'deckSteel', label: '강철 갑판', kind: 'concrete', a: '#7f8f86', b: '#5f6d66', price: 0 },
  // Bare earth (2026-11-05, the layout audit): a farm's field and yard, a nursery's beds, a garden's working ground.
  { id: 'soil', label: '흙', kind: 'soil', a: '#8a6a4a', b: '#6e5238', price: 0 },
];

export const WALL_BY_ID: Record<string, WallStyle> = Object.fromEntries(WALL_STYLES.map((w) => [w.id, w]));
export const FLOOR_BY_ID: Record<string, FloorStyle> = Object.fromEntries([...FLOOR_STYLES, ...GROUND_STYLES].map((f) => [f.id, f]));

export const DEFAULT_WALL: Record<string, string> = {
  bedroom: 'lavenderStripes',
  bath: 'aquaTiles',
  kitchen: 'creamPlain',
  living: 'oakWainscot',
  outside: 'siding',
};
export const DEFAULT_FLOOR: Record<string, string> = {
  bedroom: 'lilacCarpet',
  bath: 'aquaTile',
  kitchen: 'creamTile',
  living: 'oakWood',
  outside: 'oakWood',
};

export const ROOM_LABEL: Record<string, string> = { bedroom: '침실', bath: '욕실', kitchen: '부엌', living: '거실', outside: '바깥' };

/** A room's name for the player: the house's own rooms, or "방 N" for ones built later. */
export function roomLabel(room: Room): string {
  return ROOM_LABEL[room] ?? `방 ${room.replace('room', '')}`;
}

/** Wallpaper and floor for a room built later (ours). */
export const NEW_ROOM_WALL = 'creamPlain';
export const NEW_ROOM_FLOOR = 'oakWood';

export type HouseDecor = Partial<Record<Room, { wall?: string; floor?: string }>>;
