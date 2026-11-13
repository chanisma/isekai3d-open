import { DEFAULT_FLOOR, DEFAULT_WALL, NEW_ROOM_FLOOR, NEW_ROOM_WALL, type HouseDecor } from './decor';
import { computeRooms } from './gfx/house';
import type { Dir, P, PlacedObject, Tile } from './types';
import { LEVEL_TILES, MAP_H, MAP_W, idx, inBounds } from './world';

/**
 * Lots as data (docs/ref-game/14-lot-build.md §4): a house is a plan of walls, rooms, doors, windows,
 * paint and furniture with its front door and street, instead of coordinates written into the
 * drawing and the game. 참고 게임 keeps the front door, mailbox and street on the lot the same way.
 */

/** Which lot the household lives on, where its front door is and which row is the street. */
export interface LotInfo {
  id: string;
  /** The tile just outside the front door, the door on its edge (walls.ts); in a plan, the door's own tile in its wall. */
  frontDoor: P;
  streetY: number;
  /** Weekly rent, if the household rents the place (참고 게임 For Rent); left out, they own it. */
  rent?: number;
  /** Deposit paid on moving in, given back on moving out. */
  deposit?: number;
  /** What the walls, doors, windows and floors were worth on moving in (Game.structureValue): building on adds the difference to the home's value. */
  structure?: number;
  /** Lot traits (lotTraits.ts), up to three: the home's own, and those earned by living there. */
  traits?: string[];
  /** Minutes of each trait's skills lived at home lately (lotTraits.ts EARN_MINUTES), fading daily. */
  affinity?: Record<string, number>;
  /** The game day the leanings last faded. */
  affinityDay?: number;
}

/** Wallpaper and flooring, per tile (참고 게임 paints per wall and floor tile, not per named room). */
export interface Paint {
  /** Floor style per floor tile index. */
  floor: Record<string, string>;
  /** Wallpaper per wall face, keyed `${tile}${side}`: the face of the wall on that side of the tile
   * (walls.ts). Plans and old saves key it by wall tile, for the face it shows to the room below. */
  wall: Record<string, string>;
}

export interface RoomSpec {
  /** The room's floor, corners inclusive. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  tile: 'wood' | 'tile' | 'carpet';
  floor: string;
  wall: string;
}

type Thing = Omit<PlacedObject, 'uid'>;

export interface LotPlan {
  id: string;
  name: string;
  desc: string;
  /** The outer wall, corners inclusive; left out on an empty lot. */
  shell?: [number, number, number, number];
  rooms: RoomSpec[];
  doors: P[];
  frontDoor: P;
  streetY: number;
  windows: P[];
  objects: Thing[];
  /** Beds added for a third and fourth dweller, a second toilet for three or more. */
  extraBeds: P[];
  extraToilet?: Thing;
  /** Where the household stands when the game starts. */
  start: P[];
  /** The floor above, in that floor's own rows (0..17): its walls, rooms, doors, windows and furniture. */
  upper?: { shell?: [number, number, number, number]; rooms: RoomSpec[]; doors: P[]; windows: P[]; objects: Thing[] };
  /** What the house and land are worth (참고 게임 lot value, taxed in the bills and paid back on selling). */
  value: number;
  /** Price to buy it furnished (every home can be bought or rented, 2026-10-20; bare land only bought). */
  price?: number;
  /**
   * Weekly rent to live there renting (deposit one week's rent); left out for bare land. Set after
   * Korean monthly rents (2026-10-20, at the user's request: the smallest room about ₩300,000 a
   * month, a big place about ₩1,000,000) at the game's wages: a median job pays §447 a work day,
   * about §9,600 a month, against a Korean median of about ₩3,000,000, so §1 ≈ ₩310. ₩300,000 a
   * month is then about §960, §220 a week; ₩1,000,000 about §3,200, §740 a week.
   */
  rent?: number;
  /** Kind of home, for the listing. */
  kind: '단독주택' | '원룸' | '복층 아파트' | '2층 주택' | '빈 땅';
  /** The lot traits it comes with (lotTraits.ts). */
  traits: string[];
}

/** The floor above's tiles: open air, its own walls and rooms, its doors (rows offset by a floor). */
function upperTiles(plan: LotPlan): Tile[] {
  const t: Tile[] = new Array(LEVEL_TILES).fill('void');
  const u = plan.upper;
  if (!u) return t;
  if (u.shell) {
    const [sx0, sy0, sx1, sy1] = u.shell;
    for (let y = sy0; y <= sy1; y++) for (let x = sx0; x <= sx1; x++) t[idx(x, y)] = 'wall';
  }
  for (const r of u.rooms) for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) t[idx(x, y)] = r.tile;
  for (const d of u.doors) t[idx(d.x, d.y)] = 'door';
  return t;
}

/** The tiles of a plan: lawn, the shell's walls, the rooms' floors, doors, and a path to the street's edge. */
export function planTiles(plan: LotPlan): Tile[] {
  const t: Tile[] = new Array(MAP_W * MAP_H).fill('grass');
  if (plan.shell) {
    const [sx0, sy0, sx1, sy1] = plan.shell;
    for (let y = sy0; y <= sy1; y++) for (let x = sx0; x <= sx1; x++) t[idx(x, y)] = 'wall';
  }
  for (const r of plan.rooms) for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) t[idx(x, y)] = r.tile;
  for (const d of plan.doors) t[idx(d.x, d.y)] = 'door';
  for (let y = plan.frontDoor.y + 1; y < MAP_H; y++) if (t[idx(plan.frontDoor.x, y)] === 'grass') t[idx(plan.frontDoor.x, y)] = 'path';
  return plan.upper ? [...t, ...upperTiles(plan)] : t;
}

/** The plan's paint: each room's floor on its tiles, its wallpaper on the wall above it. */
export function planPaint(plan: LotPlan, tiles: Tile[]): Paint {
  const paint: Paint = { floor: {}, wall: {} };
  const lay = (rooms: RoomSpec[], dy: number) => {
    for (const r of rooms) {
      for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) paint.floor[idx(x, y + dy)] = r.floor;
      for (let x = r.x0; x <= r.x1; x++) if (r.y0 > 0 && tiles[idx(x, r.y0 - 1 + dy)] === 'wall') paint.wall[idx(x, r.y0 - 1 + dy)] = r.wall;
    }
  };
  lay(plan.rooms, 0);
  if (plan.upper) lay(plan.upper.rooms, MAP_H);
  return paint;
}

export function planWindows(plan: LotPlan, tiles: Tile[]): number[] {
  const all = [...plan.windows, ...(plan.upper?.windows ?? []).map((p) => ({ x: p.x, y: p.y + MAP_H }))];
  return all.filter((p) => tiles[idx(p.x, p.y)] === 'wall').map((p) => idx(p.x, p.y));
}

/** The plan's furniture for a household of `n`, with uids from `uid`. */
export function planObjects(plan: LotPlan, n: number, uid: number): PlacedObject[] {
  const extraBeds = plan.extraBeds.slice(0, Math.max(0, n - 2)).map((b) => ({ defId: 'bed', ...b, dir: 'down' as Dir }));
  const extraToilet = n > 2 && plan.extraToilet ? [plan.extraToilet] : [];
  const upstairs = (plan.upper?.objects ?? []).map((o) => ({ ...o, y: o.y + MAP_H }));
  return [...plan.objects, ...upstairs, ...extraBeds, ...extraToilet].map((o, i) => ({ ...o, uid: uid + i }));
}

/** Owning a home, or renting it (a week's rent as the deposit; the walls and lot traits stay the landlord's). */
export type Tenure = 'own' | 'rent';

export const lotInfoOf = (plan: LotPlan, tenure: Tenure = 'own'): LotInfo => ({
  id: plan.id,
  frontDoor: { ...plan.frontDoor },
  streetY: plan.streetY,
  traits: [...plan.traits],
  ...(tenure === 'rent' && plan.rent ? { rent: plan.rent, deposit: plan.rent } : {}),
});

/** The street's two ends, where walkers, visitors and services come and go. */
export const streetEndsOf = (lot: LotInfo): [P, P] => [
  { x: 0, y: lot.streetY },
  { x: MAP_W - 1, y: lot.streetY },
];

/** Where dwellers leave for work or an outing: the bottom edge, in line with the front door. */
export const exitOf = (lot: LotInfo): P => ({ x: lot.frontDoor.x, y: MAP_H - 1 });

/**
 * The tile outside the front door where visitors wait: `frontDoor` itself, the tile in front of
 * the door in its wall (walls.ts); in a plan, where the door is a tile, the one outside it.
 */
export function doorstepOf(lot: LotInfo, tiles: Tile[]): P {
  const { x, y } = lot.frontDoor;
  const outdoor = (p: P) => inBounds(p.x, p.y) && (tiles[idx(p.x, p.y)] === 'grass' || tiles[idx(p.x, p.y)] === 'path');
  if (outdoor(lot.frontDoor)) return { x, y };
  const sides = [{ x, y: y + 1 }, { x, y: y - 1 }, { x: x - 1, y }, { x: x + 1, y }];
  return sides.find(outdoor) ?? { x, y: y + 1 };
}

/**
 * Windows for a lot that has none listed (a workplace, an old save): on outside walls between
 * the lawn and a room, every four tiles, not at a corner or beside a door.
 */
export function autoWindows(tiles: Tile[]): number[] {
  const out: number[] = [];
  // Every floor the plan has (a work lot's upstairs too, 2026-11-04), never looking across from one floor to the next.
  const rows = tiles.length / MAP_W;
  const floor = (t: Tile) => t === 'wood' || t === 'tile' || t === 'carpet';
  const outside = (t: Tile) => t === 'grass' || t === 'path' || t === 'void' || t === 'water';
  for (let y = 0; y < rows; y++) {
    const lv = Math.floor(y / MAP_H);
    const at = (x: number, yy: number) => (inBounds(x, yy) && yy < rows && Math.floor(yy / MAP_H) === lv ? tiles[idx(x, yy)] : lv ? 'void' : 'grass');
    for (let x = 0; x < MAP_W; x++) {
      if (at(x, y) !== 'wall' || x % 4 !== 3) continue;
      const faces = (outside(at(x, y - 1)) && floor(at(x, y + 1))) || (outside(at(x, y + 1)) && floor(at(x, y - 1)));
      if (faces && at(x - 1, y) === 'wall' && at(x + 1, y) === 'wall') out.push(idx(x, y));
    }
  }
  return out;
}

/** The old house's room names (by the tile each room held) — only to carry old saves' paint over. */
const LEGACY_ANCHORS: Array<[string, number, number]> = [
  ['bedroom', 5, 4],
  ['bath', 12, 4],
  ['kitchen', 19, 4],
  ['living', 10, 11],
];

/** Paint for a save from before per-tile paint: its rooms' styles (by the old room names) laid on their tiles. */
export function legacyPaint(tiles: Tile[], decor: HouseDecor = {}): Paint {
  const rooms = computeRooms(tiles);
  const names = new Map<string, string>();
  for (const [name, ax, ay] of LEGACY_ANCHORS) {
    const r = rooms[idx(ax, ay)];
    if (r !== 'outside' && !names.has(r)) names.set(r, name);
  }
  // Rooms built later kept their own numbering, which old saves stored decor under.
  const nameOf = (r: string) => (r === 'outside' ? 'outside' : names.get(r) ?? r);
  const paint: Paint = { floor: {}, wall: {} };
  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i];
    if (t === 'wood' || t === 'tile' || t === 'carpet') {
      const n = nameOf(rooms[i]);
      paint.floor[i] = decor[n]?.floor ?? DEFAULT_FLOOR[n] ?? NEW_ROOM_FLOOR;
    } else if (t === 'wall') {
      const x = i % MAP_W;
      const y = Math.floor(i / MAP_W);
      if (y + 1 >= MAP_H) continue;
      const below = rooms[idx(x, y + 1)];
      const bt = tiles[idx(x, y + 1)];
      if (below === 'outside' || !(bt === 'wood' || bt === 'tile' || bt === 'carpet')) continue;
      const n = nameOf(below);
      paint.wall[i] = decor[n]?.wall ?? DEFAULT_WALL[n] ?? NEW_ROOM_WALL;
    }
  }
  return paint;
}

const o = (defId: string, x: number, y: number, dir: Dir = 'down'): Thing => ({ defId, x, y, dir });

/** The house every household started in: a bedroom, a bathroom and a kitchen over a long living room. */
export const STARTER: LotPlan = {
  id: 'starter',
  name: '작은 단층집',
  desc: '침실·욕실·부엌과 긴 거실이 있는 단층집',
  shell: [1, 1, 24, 14],
  rooms: [
    { x0: 2, y0: 2, x1: 9, y1: 7, tile: 'carpet', floor: 'lilacCarpet', wall: 'lavenderStripes' },
    { x0: 11, y0: 2, x1: 14, y1: 7, tile: 'tile', floor: 'aquaTile', wall: 'aquaTiles' },
    { x0: 16, y0: 2, x1: 23, y1: 7, tile: 'tile', floor: 'creamTile', wall: 'creamPlain' },
    { x0: 2, y0: 9, x1: 23, y1: 13, tile: 'wood', floor: 'oakWood', wall: 'oakWainscot' },
  ],
  doors: [
    { x: 5, y: 8 },
    { x: 12, y: 8 },
    { x: 19, y: 8 },
    { x: 20, y: 8 },
    { x: 12, y: 14 },
  ],
  frontDoor: { x: 12, y: 14 },
  streetY: 16,
  windows: [
    { x: 3, y: 1 },
    { x: 7, y: 1 },
    { x: 12, y: 1 },
    { x: 18, y: 1 },
    { x: 21, y: 1 },
    { x: 4, y: 14 },
    { x: 8, y: 14 },
    { x: 17, y: 14 },
    { x: 21, y: 14 },
  ],
  objects: [
    o('bed', 2, 2),
    o('bed', 4, 2),
    o('mirror', 6, 2),
    o('bookshelf', 8, 2),
    o('toilet', 11, 2),
    o('sink', 13, 2),
    o('shower', 14, 2),
    o('fridge', 16, 2),
    o('stove', 18, 2),
    o('kitchenSink', 20, 2),
    o('plant', 23, 2),
    o('diningTable', 21, 5),
    o('diningChair', 21, 4),
    o('diningChair', 22, 4),
    o('diningChair', 21, 6, 'up'),
    o('diningChair', 22, 6, 'up'),
    o('tv', 8, 9),
    o('sofa', 8, 13, 'up'),
    o('computer', 16, 9),
    // Ours: a study desk, so the competencies careers ask for can be worked at from day one.
    o('studyDesk', 18, 9),
    o('stereo', 22, 9),
    o('plant', 2, 9),
    o('lamp', 23, 13),
    o('lamp', 9, 7),
    o('mailbox', 13, 16, 'left'),
    ...YARD_STARTER(),
  ],
  extraBeds: [
    { x: 2, y: 5 },
    { x: 4, y: 5 },
  ],
  extraToilet: o('toilet', 11, 6, 'right'),
  start: [
    { x: 11, y: 11 },
    { x: 14, y: 11 },
    { x: 12, y: 12 },
    { x: 15, y: 12 },
  ],
  kind: '단독주택',
  traits: ['homey'],
  value: 8000,
  price: 13000,
  rent: 330,
};

const room = (x0: number, y0: number, x1: number, y1: number, tile: RoomSpec['tile'], floor: string, wall: string): RoomSpec => ({ x0, y0, x1, y1, tile, floor, wall });
const at = (x: number, y: number): P => ({ x, y });

/** A studio flat: one L-shaped room with a kitchen corner, and a small bathroom (ours, after 참고 게임 apartments). A new story starts here, owned. */
export const STUDIO: LotPlan = {
  id: 'studio',
  name: '원룸',
  desc: '방 하나에 부엌 구석과 작은 욕실. 새 이야기는 이 원룸을 가진 채로 시작해요',
  kind: '원룸',
  traits: ['fastInternet'],
  shell: [7, 5, 18, 14],
  rooms: [
    room(8, 6, 10, 8, 'tile', 'aquaTile', 'aquaTiles'),
    room(12, 6, 17, 9, 'wood', 'oakWood', 'creamPlain'),
    room(8, 10, 17, 13, 'wood', 'oakWood', 'creamPlain'),
  ],
  doors: [at(10, 9), at(12, 14)],
  frontDoor: at(12, 14),
  streetY: 16,
  windows: [at(14, 5), at(16, 5), at(15, 14)],
  objects: [
    o('toilet', 8, 6),
    o('sink', 9, 6),
    o('shower', 10, 6),
    o('computer', 12, 6),
    o('bed', 17, 6),
    o('tv', 15, 9),
    o('fridge', 8, 13, 'up'),
    o('stove', 9, 13, 'up'),
    o('kitchenSink', 10, 13, 'up'),
    o('diningTable', 13, 11),
    o('diningChair', 13, 12, 'up'),
    o('diningChair', 14, 12, 'up'),
    o('sofa', 15, 13, 'up'),
    o('plant', 17, 13),
    o('mailbox', 13, 16, 'left'),
    o('bush', 9, 15),
    o('bush', 16, 15),
    o('tree', 3, 17),
    o('tree', 22, 17),
  ],
  extraBeds: [at(16, 6), at(14, 6)],
  start: [at(12, 11), at(12, 12), at(17, 11), at(17, 12)],
  value: 6000,
  price: 8000,
  rent: 220,
};

/** A cottage with a garden to buy: bedroom, bathroom with a bath, kitchen-diner, a long living room, and planters outside. */
export const COTTAGE: LotPlan = {
  id: 'cottage',
  name: '정원 딸린 단독주택',
  desc: '욕조 있는 욕실, 식탁 있는 부엌, 긴 거실과 텃밭 정원',
  kind: '단독주택',
  traits: ['homey', 'naturalLight', 'freshAir'],
  shell: [2, 2, 19, 13],
  rooms: [
    room(3, 3, 8, 7, 'carpet', 'sageCarpet', 'mintDots'),
    room(10, 3, 13, 6, 'tile', 'monoTile', 'aquaTiles'),
    room(15, 3, 18, 7, 'tile', 'creamTile', 'creamPlain'),
    room(3, 9, 18, 12, 'wood', 'walnutWood', 'oakWainscot'),
  ],
  doors: [at(5, 8), at(12, 7), at(12, 8), at(18, 8), at(10, 13)],
  frontDoor: at(10, 13),
  streetY: 16,
  windows: [at(4, 2), at(7, 2), at(11, 2), at(16, 2), at(5, 13), at(15, 13)],
  objects: [
    o('doubleBed', 3, 3),
    o('mirror', 7, 3),
    o('toilet', 10, 3),
    o('sink', 11, 3),
    o('bathtub', 13, 3),
    o('fridge', 15, 3),
    o('stove', 16, 3),
    o('kitchenSink', 17, 3),
    o('diningTable', 16, 6),
    o('diningChair', 16, 5),
    o('diningChair', 17, 5),
    o('diningChair', 16, 7, 'up'),
    o('diningChair', 17, 7, 'up'),
    o('tv', 6, 9),
    o('sofa', 6, 12, 'up'),
    o('bookshelf', 3, 9),
    o('computer', 14, 9),
    o('studyDesk', 16, 9),
    o('plant', 18, 12),
    o('lamp', 3, 12),
    o('mailbox', 11, 15, 'left'),
    o('planter', 21, 4),
    o('planter', 21, 6),
    o('planter', 23, 4),
    o('tree', 23, 9),
    o('tree', 1, 16),
    o('bush', 21, 12),
    o('bush', 4, 15),
    o('bush', 16, 15),
  ],
  extraBeds: [at(3, 6), at(7, 6)],
  extraToilet: o('toilet', 10, 6, 'right'),
  start: [at(8, 10), at(10, 10), at(12, 11), at(9, 11)],
  value: 16000,
  price: 18000,
  rent: 450,
};

/** A two-storey family house to buy: bath, study and dining room by the living room; three bedrooms and a bathroom upstairs. */
export const FAMILY: LotPlan = {
  id: 'family',
  name: '2층 가족 주택',
  desc: '1층에 욕실·서재·식당·거실, 2층에 침실 두 개와 욕실',
  kind: '2층 주택',
  traits: ['homey', 'greatAcoustics', 'scienceLair'],
  shell: [2, 2, 23, 14],
  rooms: [
    room(3, 3, 6, 7, 'tile', 'aquaTile', 'aquaTiles'),
    room(8, 3, 14, 7, 'wood', 'walnutWood', 'navyWainscot'),
    room(16, 3, 22, 7, 'tile', 'creamTile', 'creamPlain'),
    room(3, 9, 22, 13, 'wood', 'oakWood', 'oakWainscot'),
  ],
  doors: [at(5, 8), at(11, 8), at(17, 8), at(12, 14)],
  frontDoor: at(12, 14),
  streetY: 16,
  windows: [at(4, 2), at(11, 2), at(18, 2), at(21, 2), at(5, 14), at(9, 14), at(17, 14), at(21, 14)],
  objects: [
    o('toilet', 3, 3),
    o('sink', 4, 3),
    o('shower', 6, 3),
    o('computer', 8, 3),
    o('studyDesk', 10, 3),
    o('bookshelf', 13, 3),
    o('fridge', 16, 3),
    o('stove', 17, 3),
    o('kitchenSink', 18, 3),
    o('diningTable', 20, 5),
    o('diningChair', 20, 4),
    o('diningChair', 21, 4),
    o('diningChair', 20, 6, 'up'),
    o('diningChair', 21, 6, 'up'),
    o('tv', 6, 9),
    o('sofa', 6, 13, 'up'),
    o('stereo', 10, 9),
    o('plant', 3, 13),
    o('lamp', 15, 9),
    o('stairs', 17, 11, 'left'),
    o('mailbox', 13, 16, 'left'),
    o('tree', 0, 17),
    o('tree', 25, 17),
    o('bush', 4, 15),
    o('bush', 8, 15),
    o('bush', 17, 15),
    o('bush', 21, 15),
  ],
  extraBeds: [],
  start: [at(11, 11), at(14, 11), at(12, 12), at(15, 12)],
  upper: {
    shell: [2, 2, 23, 14],
    rooms: [
      room(3, 3, 10, 8, 'carpet', 'lilacCarpet', 'lavenderStripes'),
      room(12, 3, 17, 8, 'carpet', 'sageCarpet', 'mintDots'),
      room(19, 3, 22, 8, 'tile', 'aquaTile', 'aquaTiles'),
      room(3, 10, 22, 13, 'wood', 'oakWood', 'creamPlain'),
    ],
    doors: [at(6, 9), at(14, 9), at(20, 9)],
    windows: [at(5, 2), at(9, 2), at(14, 2), at(21, 2), at(6, 14), at(12, 14), at(17, 14)],
    objects: [
      o('doubleBed', 3, 3),
      o('mirror', 8, 3),
      o('bed', 12, 3),
      o('bed', 14, 3),
      o('toilet', 19, 3),
      o('sink', 20, 3),
      o('bathtub', 22, 3),
      o('bookshelf', 3, 10),
      o('armchair', 5, 10),
      o('plant', 16, 13),
    ],
  },
  value: 28000,
  price: 32000,
  rent: 740,
};

/** A city flat on two levels: one big room below with a bathroom, a bedroom up on the mezzanine. */
export const LOFT: LotPlan = {
  id: 'loft',
  name: '도시 복층 아파트',
  desc: '넓은 거실·부엌과 욕실, 계단 위 다락 침실',
  kind: '복층 아파트',
  traits: ['fastInternet', 'naturalLight', 'convivial'],
  shell: [5, 3, 20, 13],
  rooms: [
    room(6, 4, 9, 7, 'tile', 'monoTile', 'aquaTiles'),
    room(11, 4, 19, 12, 'wood', 'walnutWood', 'redBrick'),
    room(6, 9, 10, 12, 'wood', 'walnutWood', 'redBrick'),
  ],
  doors: [at(8, 8), at(12, 13)],
  frontDoor: at(12, 13),
  streetY: 16,
  windows: [at(13, 3), at(17, 3), at(8, 13), at(16, 13)],
  objects: [
    o('toilet', 6, 4),
    o('sink', 7, 4),
    o('shower', 9, 4),
    o('fridge', 11, 4),
    o('stove', 12, 4),
    o('kitchenSink', 13, 4),
    o('diningTable', 14, 7),
    o('diningChair', 14, 6),
    o('diningChair', 15, 6),
    o('tv', 6, 9),
    o('sofa', 6, 12, 'up'),
    o('computer', 17, 12, 'up'),
    o('plant', 19, 4),
    o('stairs', 15, 8, 'left'),
    o('mailbox', 13, 15, 'left'),
    o('tree', 2, 17),
    o('tree', 23, 17),
  ],
  extraBeds: [],
  start: [at(13, 10), at(15, 10), at(13, 11), at(15, 11)],
  upper: {
    shell: [10, 3, 20, 9],
    rooms: [room(11, 4, 19, 8, 'carpet', 'lilacCarpet', 'redBrick')],
    doors: [],
    windows: [at(13, 3), at(17, 3)],
    objects: [o('doubleBed', 11, 4), o('mirror', 14, 4), o('bed', 16, 4), o('bed', 17, 4)],
  },
  value: 18000,
  price: 22000,
  rent: 550,
};

/** The garden the old house drew into its lawn, as trees and bushes off the street row. */
function YARD_STARTER(): Thing[] {
  return [o('tree', 0, 17), o('tree', 24, 17), o('tree', 5, 17), o('tree', 19, 17), o('tree', 25, 0), ...[3, 6, 9, 15, 18, 21].map((x) => o('bush', x, 15))];
}

/**
 * Land with nothing on it but lawn, a few trees, the mailbox and a path from the street (참고 게임's
 * empty lots, bought from the neighbourhood map and built on from scratch). Ours: one lot the
 * size of the others, at the price of its land. `frontDoor` is where visitors wait until a door
 * is built: the first door put in an outside wall becomes the front door.
 */
export const EMPTY_LOT: LotPlan = {
  id: 'emptyLot',
  name: '빈 땅',
  desc: '집도 가구도 없는 빈 땅. 건축 도구로 벽부터 처음부터 지어요',
  kind: '빈 땅',
  traits: [],
  rooms: [],
  doors: [],
  frontDoor: at(12, 14),
  streetY: 16,
  windows: [],
  objects: [o('mailbox', 13, 16, 'left'), o('tree', 1, 2), o('tree', 24, 2), o('tree', 1, 14), o('tree', 24, 14)],
  extraBeds: [],
  start: [at(11, 15), at(13, 15), at(11, 14), at(13, 14)],
  value: 4000,
  price: 4000,
};

export const LOT_PLANS: LotPlan[] = [STARTER, STUDIO, COTTAGE, FAMILY, LOFT, EMPTY_LOT];
export const PLAN_BY_ID: Record<string, LotPlan> = Object.fromEntries(LOT_PLANS.map((p) => [p.id, p]));
export const STARTER_LOT: LotInfo = lotInfoOf(STARTER);
