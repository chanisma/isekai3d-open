import { getDef } from './catalog';
import type { Dir, GameState, ObjectDef, P, PlacedObject, Tile } from './types';
import { between, wallGrid, type WallGrid, type Walls } from './walls';

export const MAP_W = 26;
/** Rows in one floor of a lot. */
export const MAP_H = 18;
/**
 * Floors are stacked in one grid (docs/ref-game/14-lot-build.md §6): the ground floor's rows, then the
 * floor above's, so a tile on the first floor up is at y + MAP_H. A lot has one or two.
 */
export const MAX_LEVELS = 2;
export const LEVEL_TILES = MAP_W * MAP_H;
export const levelOf = (y: number) => Math.floor(y / MAP_H);
export const levelsOf = (tiles: { length: number }) => Math.max(1, Math.round(tiles.length / LEVEL_TILES));
/** Where dwellers leave the lot for work and come back. */
export const EXIT: P = { x: 12, y: 17 };

export function idx(x: number, y: number): number {
  return y * MAP_W + x;
}

export function inBounds(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < MAP_W && y < MAP_H * MAX_LEVELS;
}

export function buildTiles(): Tile[] {
  const t: Tile[] = new Array(MAP_W * MAP_H).fill('grass');
  const set = (x: number, y: number, v: Tile) => (t[idx(x, y)] = v);
  const fill = (x0: number, y0: number, x1: number, y1: number, v: Tile) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, v);
  };
  // Outer walls x1..24, y1..14
  fill(1, 1, 24, 14, 'wall');
  // Rooms: bedroom, bathroom, kitchen on top; living room below.
  fill(2, 2, 9, 7, 'carpet');
  fill(11, 2, 14, 7, 'tile');
  fill(16, 2, 23, 7, 'tile');
  fill(2, 9, 23, 13, 'wood');
  for (const [x, y] of [[5, 8], [12, 8], [19, 8], [20, 8], [12, 14]]) set(x, y, 'door');
  fill(12, 15, 12, 17, 'path');
  return t;
}

export function dims(def: ObjectDef, dir: Dir): { w: number; h: number } {
  return dir === 'left' || dir === 'right' ? { w: def.h, h: def.w } : { w: def.w, h: def.h };
}

export function footprintTiles(def: ObjectDef, x: number, y: number, dir: Dir): P[] {
  const { w, h } = dims(def, dir);
  const out: P[] = [];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) out.push({ x: x + i, y: y + j });
  return out;
}

/** Tiles in front of an object from which it can be used, nearest rows first. */
export function frontTiles(def: ObjectDef, x: number, y: number, dir: Dir, range = 1): P[] {
  const { w, h } = dims(def, dir);
  const out: P[] = [];
  for (let k = 1; k <= range; k++) {
    if (dir === 'down') for (let i = 0; i < w; i++) out.push({ x: x + i, y: y + h - 1 + k });
    if (dir === 'up') for (let i = 0; i < w; i++) out.push({ x: x + i, y: y - k });
    if (dir === 'left') for (let j = 0; j < h; j++) out.push({ x: x - k, y: y + j });
    if (dir === 'right') for (let j = 0; j < h; j++) out.push({ x: x + w - 1 + k, y: y + j });
  }
  return out.filter((p) => inBounds(p.x, p.y) && levelOf(p.y) === levelOf(y));
}

/**
 * Where an object is used from: chess-like games from the two sides, things sat or lain on from
 * any side (a chair tucked under a table, a bed against a wall), the rest from the front.
 */
export function accessOf(def: ObjectDef): 'front' | 'any' | 'sides' {
  if (def.access) return def.access;
  if (def.interactions.some((i) => i.players)) return 'sides';
  // Anything sat or lain on (a bed is also made, a toilet also unclogged, from wherever one stands).
  if (def.interactions.some((i) => i.pose === 'on')) return 'any';
  return 'front';
}

/** The tiles an object can be used from, the front first; off-map tiles left out. */
export function accessTiles(def: ObjectDef, x: number, y: number, dir: Dir, range = 1): P[] {
  const access = accessOf(def);
  const { w, h } = dims(def, dir);
  if (access === 'sides') {
    const across = dir === 'down' || dir === 'up';
    const out: P[] = [];
    if (across) for (let j = 0; j < h; j++) out.push({ x: x - 1, y: y + j }, { x: x + w, y: y + j });
    else for (let i = 0; i < w; i++) out.push({ x: x + i, y: y - 1 }, { x: x + i, y: y + h });
    return out.filter((p) => inBounds(p.x, p.y) && levelOf(p.y) === levelOf(y));
  }
  const out = frontTiles(def, x, y, dir, range);
  if (access === 'any') {
    const seen = new Set(out.map((p) => idx(p.x, p.y)));
    for (let j = -1; j <= h; j++)
      for (let i = -1; i <= w; i++) {
        const edge = (i === -1 || i === w) !== (j === -1 || j === h);
        if (!edge) continue;
        const p = { x: x + i, y: y + j };
        if (inBounds(p.x, p.y) && levelOf(p.y) === levelOf(y) && !seen.has(idx(p.x, p.y))) (seen.add(idx(p.x, p.y)), out.push(p));
      }
  }
  return out;
}

export function objectCenter(obj: PlacedObject): P {
  const { w, h } = dims(getDef(obj.defId), obj.dir);
  return { x: obj.x + w / 2, y: obj.y + h / 2 };
}

/**
 * A flight's ends on its own floor: the foot (its bottom step), the tile in front of the foot it's
 * stepped onto from, and the head (under the landing upstairs).
 */
export function flight(o: PlacedObject): { foot: P; front: P; head: P } {
  const { w, h } = dims(getDef(o.defId), o.dir);
  const ends: Record<Dir, [P, P]> = {
    down: [{ x: o.x, y: o.y + h - 1 }, { x: o.x, y: o.y }],
    up: [{ x: o.x, y: o.y }, { x: o.x, y: o.y + h - 1 }],
    left: [{ x: o.x, y: o.y }, { x: o.x + w - 1, y: o.y }],
    right: [{ x: o.x + w - 1, y: o.y }, { x: o.x, y: o.y }],
  };
  const [foot, head] = ends[o.dir];
  const front = { x: foot.x + Math.sign(foot.x - head.x), y: foot.y + Math.sign(foot.y - head.y) };
  return { foot, front, head };
}

/**
 * Each flight's two ends as tile indices, foot to the landing upstairs and back (for a path search outside the game: a work lot's
 * plan, its tests; the game's own is Game.stairLinks).
 */
export function stairPairs(objects: Array<Omit<PlacedObject, 'uid'>>, tiles: { length: number }): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const o of objects) {
    if (o.defId !== 'stairs') continue;
    const { foot, head } = flight(o as PlacedObject);
    const top = idx(head.x, head.y + MAP_H);
    if (top < tiles.length) out.push([idx(foot.x, foot.y), top]);
  }
  return out;
}

/**
 * The opening a flight of stairs needs in the floor above it (참고 게임 cuts the stairwell): every tile
 * over the flight but the one at its head, where the landing is. Tile indices on the floor above.
 */
export function stairwell(objects: PlacedObject[], tiles: { length: number }): number[] {
  const out: number[] = [];
  for (const o of objects) {
    if (o.defId !== 'stairs') continue;
    const def = getDef(o.defId);
    const { head } = flight(o);
    for (const p of footprintTiles(def, o.x, o.y, o.dir)) {
      if (p.x === head.x && p.y === head.y) continue;
      const i = idx(p.x, p.y + MAP_H);
      if (i < tiles.length) out.push(i);
    }
  }
  return out;
}

/** The tiles no one can walk onto, and the walls between tiles (walls.ts) the path search keeps to. */
export type Blocked = Uint8Array & { walls?: WallGrid };

/**
 * 1 = not walkable: open air upstairs, the stairwell, furniture (and the old tile-thick walls). Of
 * a flight of stairs only the foot is walked onto (and from there up); the rest of it is the climb.
 * The lot's walls come along, for stepping from tile to tile.
 */
export function buildBlocked(tiles: Tile[], objects: PlacedObject[], walls?: Walls): Blocked {
  const b: Blocked = new Uint8Array(tiles.length);
  if (walls) b.walls = wallGrid(walls, tiles.length);
  tiles.forEach((t, i) => {
    if (t === 'wall' || t === 'void' || t === 'water') b[i] = 1;
  });
  for (const i of stairwell(objects, tiles)) b[i] = 1;
  for (const o of objects) {
    const def = getDef(o.defId);
    if (o.defId === 'stairs') {
      const { foot } = flight(o);
      for (const p of footprintTiles(def, o.x, o.y, o.dir)) if ((p.x !== foot.x || p.y !== foot.y) && idx(p.x, p.y) < b.length) b[idx(p.x, p.y)] = 1;
      continue;
    }
    if (def.walkable) continue;
    for (const p of footprintTiles(def, o.x, o.y, o.dir)) if (inBounds(p.x, p.y) && idx(p.x, p.y) < b.length) b[idx(p.x, p.y)] = 1;
  }
  return b;
}

export function objectAt(objects: PlacedObject[], x: number, y: number): PlacedObject | undefined {
  // What stands on a rug before the rug.
  const here = objects.filter((o) => footprintTiles(getDef(o.defId), o.x, o.y, o.dir).some((p) => p.x === x && p.y === y));
  return here.find((o) => !getDef(o.defId).flat) ?? here[0];
}

export function canPlace(
  state: GameState,
  tiles: Tile[],
  defId: string,
  x: number,
  y: number,
  dir: Dir,
  ignoreUid?: number,
): boolean {
  const def = getDef(defId);
  const others = state.objects.filter((o) => o.uid !== ignoreUid);
  // A rug goes under what's there and whoever's there; only not on another rug.
  const occupied = buildBlocked(tiles, def.flat ? [] : others);
  if (def.flat) for (const o of others) if (getDef(o.defId).flat) for (const p of footprintTiles(getDef(o.defId), o.x, o.y, o.dir)) occupied[idx(p.x, p.y)] = 1;
  const walls = state.walls ?? {};
  // Nothing goes on a flight of stairs, its foot included (walked on, but not to be built over).
  for (const o of others) if (o.defId === 'stairs') for (const p of footprintTiles(getDef(o.defId), o.x, o.y, o.dir)) occupied[idx(p.x, p.y)] = 1;
  const fp = footprintTiles(def, x, y, dir);
  for (const p of fp) {
    if (!inBounds(p.x, p.y) || idx(p.x, p.y) >= tiles.length || levelOf(p.y) !== levelOf(y)) return false;
    // Not across a wall.
    if (fp.some((q) => between(walls, p, q))) return false;
    const t = tiles[idx(p.x, p.y)];
    if (t === 'wall' || t === 'door' || t === 'path' || t === 'void' || t === 'water') return false;
    if (occupied[idx(p.x, p.y)]) return false;
    if (!def.flat && state.dwellers.some((s) => !s.away && Math.round(s.x) === p.x && Math.round(s.y) === p.y)) return false;
  }
  if (def.interactions.length === 0) return true;
  // Some tile it is used from must be free: the front for a fridge or a stove, any side for a chair or a bed.
  const access = accessTiles(def, x, y, dir, 1);
  return access.some((p) => !occupied[idx(p.x, p.y)] && tiles[idx(p.x, p.y)] !== 'wall' && reachesFrom(walls, fp, p));
}

/** Whether a spot to use an object from is on its side of the walls: nothing between it and the object. */
export function reachesFrom(walls: Walls, footprint: P[], p: P): boolean {
  const q = footprint.filter((f) => f.x === p.x || f.y === p.y).sort((a, b) => Math.abs(a.x - p.x) + Math.abs(a.y - p.y) - (Math.abs(b.x - p.x) + Math.abs(b.y - p.y)))[0];
  if (!q) return true;
  const sx = Math.sign(p.x - q.x);
  const sy = Math.sign(p.y - q.y);
  for (let c = q; c.x !== p.x || c.y !== p.y; ) {
    const next = { x: c.x + sx, y: c.y + sy };
    if (between(walls, c, next)) return false;
    c = next;
  }
  return true;
}

export const DIRS: Dir[] = ['down', 'left', 'up', 'right'];

export function rotateDir(d: Dir): Dir {
  return DIRS[(DIRS.indexOf(d) + 1) % 4];
}
