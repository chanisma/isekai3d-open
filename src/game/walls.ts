import { getDef } from './catalog';
import type { Paint } from './lots';
import type { Dir, P, PlacedObject, Tile } from './types';
import { MAP_H, MAP_W, footprintTiles, idx } from './world';

/**
 * Walls on the lines between tiles, as 참고 게임 builds them (docs/ref-game/14-lot-build.md §10): a wall
 * stands on a tile's edge, so the floor either side of it is all room and furniture goes right up
 * against it. Doors and windows are walls with an opening.
 */
export type EdgeKind = 'wall' | 'door' | 'window';
export type Side = 'n' | 'e' | 's' | 'w';
/** What stands on each edge, keyed `${i}n` (tile i's north side) or `${i}w` (its west side). */
export type Walls = Record<string, EdgeKind>;

export const SIDES: Side[] = ['n', 'e', 's', 'w'];
export const STEP: Record<Side, [number, number]> = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
export const OPPOSITE: Record<Side, Side> = { n: 's', s: 'n', e: 'w', w: 'e' };

/** The key of tile (x, y)'s edge on `side` (the lot's stacked rows), or null on the edge of its floor. */
export function edgeKey(x: number, y: number, side: Side): string | null {
  if (x < 0 || x >= MAP_W || y < 0) return null;
  if (side === 'n') return y % MAP_H ? `${idx(x, y)}n` : null;
  if (side === 's') return (y + 1) % MAP_H ? `${idx(x, y + 1)}n` : null;
  if (side === 'w') return x > 0 ? `${idx(x, y)}w` : null;
  return x + 1 < MAP_W ? `${idx(x + 1, y)}w` : null;
}

/** The two tiles either side of an edge: north then south, or west then east. */
export function edgeTiles(key: string): [P, P] {
  const i = parseInt(key, 10);
  const x = i % MAP_W;
  const y = Math.floor(i / MAP_W);
  return key.endsWith('n') ? [{ x, y: y - 1 }, { x, y }] : [{ x: x - 1, y }, { x, y }];
}

/** Which floor an edge is on. */
export const edgeLevel = (key: string) => Math.floor(Math.floor(parseInt(key, 10) / MAP_W) / MAP_H);

/** The side of `a` that `b` is beside, if they are side by side on one floor. */
export function sideTowards(a: P, b: P): Side | null {
  if (Math.floor(a.y / MAP_H) !== Math.floor(b.y / MAP_H)) return null;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) + Math.abs(dy) !== 1) return null;
  return dx === 1 ? 'e' : dx === -1 ? 'w' : dy === 1 ? 's' : 'n';
}

/** What stands between two tiles side by side (undefined if nothing, or they aren't). */
export function between(walls: Walls, a: P, b: P): EdgeKind | undefined {
  const side = sideTowards(a, b);
  const key = side && edgeKey(a.x, a.y, side);
  return key ? walls[key] : undefined;
}

/**
 * The walls as two arrays over the tiles, for the path search: on each tile's north and west
 * side, 0 nothing, 1 a wall or window (no way through), 2 a door.
 */
export interface WallGrid {
  n: Uint8Array;
  w: Uint8Array;
}

export function wallGrid(walls: Walls, length: number): WallGrid {
  const g = { n: new Uint8Array(length), w: new Uint8Array(length) };
  for (const [key, kind] of Object.entries(walls)) {
    const i = parseInt(key, 10);
    if (i >= length) continue;
    (key.endsWith('n') ? g.n : g.w)[i] = kind === 'door' ? 2 : 1;
  }
  return g;
}

/** What stands between tile `a` and tile `b` beside it (0 nothing, 1 wall or window, 2 door). */
export function gridBetween(g: WallGrid, a: number, b: number): number {
  const d = b - a;
  if (d === 1) return g.w[b];
  if (d === -1) return g.w[a];
  if (d === MAP_W) return g.n[b];
  if (d === -MAP_W) return g.n[a];
  return 0;
}

// ---- Old saves and the plans: walls a tile thick, laid on the lines ----

const FLOORS = new Set<Tile>(['wood', 'tile', 'carpet']);
const solid = (t: Tile | undefined) => t === 'wall' || t === 'door';
const FRONT: Record<Dir, [number, number]> = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };

export interface EdgeLot {
  tiles: Tile[];
  walls: Walls;
  paint: Paint;
  objects: PlacedObject[];
}

/**
 * A lot built the old way, with walls a whole tile thick (the plans are still drawn so, and
 * saves from before were), with its walls set on the lines instead (ours). Each straight run of
 * wall gives its tiles to the room on one side and stands on the line along the other: to the
 * lawn on an outside wall, so the rooms keep their size; between two rooms, to the side with
 * less against it, so what stood against it still does. Where a run meets another, the tile
 * goes to the room in the corner they make. Indoor furniture with its back to a wall that moved a
 * tile away (and nothing in front of it) is set back against it, and the wallpaper a room had goes
 * on every face of its walls. Windows (`windows`: tiles in old walls) and doors come along.
 */
export function edgeLot(tiles: Tile[], objects: PlacedObject[], paint: Paint, windows: number[]): EdgeLot {
  const n = tiles.length;
  const level = (i: number) => Math.floor(i / (MAP_W * MAP_H));
  /** The tile beside i that way, or -1 off its floor. */
  const near = (i: number, dx: number, dy: number) => {
    const x = (i % MAP_W) + dx;
    const j = i + dx + dy * MAP_W;
    return x < 0 || x >= MAP_W || j < 0 || j >= n || level(j) !== level(i) ? -1 : j;
  };
  const isSolid = (j: number) => j >= 0 && solid(tiles[j]);

  // Rooms as the old walls made them: 0 outdoors, 1.. rooms; walls -1.
  const region = new Int32Array(n).fill(0);
  let rooms = 0;
  const seen = new Uint8Array(n);
  for (let s = 0; s < n; s++) {
    if (solid(tiles[s])) region[s] = -1;
    if (seen[s] || !FLOORS.has(tiles[s])) continue;
    const cells: number[] = [];
    let open = false;
    const stack = [s];
    seen[s] = 1;
    while (stack.length) {
      const i = stack.pop()!;
      cells.push(i);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const j = near(i, dx, dy);
        if (j < 0) {
          open = true;
          continue;
        }
        if (!FLOORS.has(tiles[j])) {
          if (!solid(tiles[j])) open = true;
          continue;
        }
        if (!seen[j]) (seen[j] = 1), stack.push(j);
      }
    }
    if (!open) {
      rooms++;
      for (const i of cells) region[i] = rooms;
    }
  }

  // The straight runs of wall, each way.
  const hRun = new Int32Array(n).fill(-1);
  const vRun = new Int32Array(n).fill(-1);
  const runs: Array<{ axis: 'h' | 'v'; cells: number[] }> = [];
  for (let i = 0; i < n; i++) {
    if (!isSolid(i)) continue;
    if (hRun[i] < 0 && (isSolid(near(i, 1, 0)) || isSolid(near(i, -1, 0))) && !isSolid(near(i, -1, 0))) {
      const cells: number[] = [];
      for (let j = i; isSolid(j); j = near(j, 1, 0)) (hRun[j] = runs.length), cells.push(j);
      runs.push({ axis: 'h', cells });
    }
    if (vRun[i] < 0 && (isSolid(near(i, 0, 1)) || isSolid(near(i, 0, -1))) && !isSolid(near(i, 0, -1))) {
      const cells: number[] = [];
      for (let j = i; isSolid(j); j = near(j, 0, 1)) (vRun[j] = runs.length), cells.push(j);
      runs.push({ axis: 'v', cells });
    }
  }
  // A wall tile on its own is a run of one, across.
  for (let i = 0; i < n; i++) if (isSolid(i) && hRun[i] < 0 && vRun[i] < 0) (hRun[i] = runs.length), runs.push({ axis: 'h', cells: [i] });

  // Which way each run gives its tiles: -1 north (west), +1 south (east).
  const footprint = objects.map((o) => new Set(footprintTiles(getDef(o.defId), o.x, o.y, o.dir).map((p) => idx(p.x, p.y))));
  const touching = (j: number) => footprint.filter((f) => f.has(j)).length;
  const way = runs.map((r) => {
    const cost = [0, 0];
    r.cells.forEach((i) => {
      if (r.axis === 'h' ? vRun[i] >= 0 : hRun[i] >= 0) return;
      const [a, b] = r.axis === 'h' ? [near(i, 0, -1), near(i, 0, 1)] : [near(i, -1, 0), near(i, 1, 0)];
      const ra = a >= 0 && !isSolid(a) ? region[a] : 0;
      const rb = b >= 0 && !isSolid(b) ? region[b] : 0;
      // Given to a room with the lawn the other side, the house would grow a tile.
      if (rb === 0 && ra > 0) cost[0] += 100;
      if (ra === 0 && rb > 0) cost[1] += 100;
      // What stands against the side it isn't given to ends up a tile from the wall.
      if (a >= 0) cost[0] += 10 * touching(a);
      if (b >= 0) cost[1] += 10 * touching(b);
    });
    return cost[0] < cost[1] ? -1 : 1;
  });

  // Each wall tile's owner: the tile whose room it joins (followed through other wall tiles).
  const from = new Int32Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    if (!isSolid(i)) continue;
    const dy = hRun[i] >= 0 ? way[hRun[i]] : 0;
    const dx = vRun[i] >= 0 ? way[vRun[i]] : 0;
    const tries = [near(i, dx, dy), near(i, 0, dy), near(i, dx, 0)].filter((j) => j >= 0 && j !== i);
    from[i] = tries.find((j) => !isSolid(j)) ?? tries[0] ?? -1;
  }
  const source = (i: number) => {
    let j = i;
    for (let k = 0; k < 8 && j >= 0 && isSolid(j); k++) j = from[j];
    return j >= 0 && !isSolid(j) ? j : -1;
  };
  const src = new Int32Array(n);
  for (let i = 0; i < n; i++) src[i] = isSolid(i) ? source(i) : i;
  const owner = (i: number) => (src[i] >= 0 ? region[src[i]] : 0);

  const out: Tile[] = tiles.slice();
  const newPaint: Paint = { floor: { ...paint.floor }, wall: {} };
  for (let i = 0; i < n; i++) {
    if (!isSolid(i)) continue;
    delete newPaint.floor[i];
    const s = src[i];
    out[i] = s >= 0 ? tiles[s] : level(i) > 0 ? 'void' : 'grass';
    // The floor goes on under where the wall stood, indoors or a work lot's ground outdoors (asphalt, a quay, a deck).
    if (s >= 0 && paint.floor[s] && (FLOORS.has(tiles[s]) || tiles[s] === 'grass' || tiles[s] === 'path')) newPaint.floor[i] = paint.floor[s];
  }

  // The walls: wherever a wall tile now belongs to another room than the tile beside it.
  const windowSet = new Set(windows);
  const across = (i: number): 'ns' | 'we' => {
    const ns = !isSolid(near(i, 0, -1)) && !isSolid(near(i, 0, 1));
    const we = !isSolid(near(i, -1, 0)) && !isSolid(near(i, 1, 0));
    return ns ? 'ns' : we ? 'we' : hRun[i] >= 0 ? 'ns' : 'we';
  };
  const walls: Walls = {};
  const edgeOf = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    if (!isSolid(i)) continue;
    const x = i % MAP_W;
    const y = Math.floor(i / MAP_W);
    for (const side of SIDES) {
      const [dx, dy] = STEP[side];
      const j = near(i, dx, dy);
      if (j < 0 || owner(i) === owner(j)) continue;
      const key = edgeKey(x, y, side);
      if (!key) continue;
      const axis = side === 'n' || side === 's' ? 'ns' : 'we';
      const opening = (t: number) => isSolid(t) && across(t) === axis;
      let kind: EdgeKind = 'wall';
      if ((tiles[i] === 'door' && opening(i)) || (tiles[j] === 'door' && opening(j))) kind = 'door';
      else if ((windowSet.has(i) && opening(i)) || (windowSet.has(j) && opening(j))) kind = 'window';
      if (walls[key] !== 'door') walls[key] = walls[key] === 'window' && kind === 'wall' ? 'window' : kind;
      edgeOf.set(key, i);
    }
  }

  // A room's wallpaper (the old paint on the wall above its floor), on every face of its walls.
  const votes = new Map<number, Map<string, number>>();
  for (let i = 0; i < n; i++) {
    const r = region[i];
    const above = near(i, 0, -1);
    if (r <= 0 || above < 0 || !isSolid(above) || !paint.wall[above]) continue;
    const v = votes.get(r) ?? new Map<string, number>();
    v.set(paint.wall[above], (v.get(paint.wall[above]) ?? 0) + 1);
    votes.set(r, v);
  }
  const paperOf = new Map([...votes].map(([r, v]) => [r, [...v].sort((a, b) => b[1] - a[1])[0][0]]));
  for (const [key, wallTile] of edgeOf) {
    const [a, b] = edgeTiles(key);
    for (const [t, side] of [[a, key.endsWith('n') ? 's' : 'e'], [b, key.endsWith('n') ? 'n' : 'w']] as Array<[P, Side]>) {
      const r = owner(idx(t.x, t.y));
      if (r <= 0) continue;
      const style = paperOf.get(r) ?? paint.wall[wallTile];
      if (style) newPaint.wall[`${idx(t.x, t.y)}${side}`] = style;
    }
  }

  // Furniture backed onto a wall that is now a tile further off goes back against it (indoors:
  // the garden stays as it was laid out).
  const moved = objects.map((o) => ({ ...o }));
  const taken = new Map<number, number>();
  footprint.forEach((f, k) => f.forEach((t) => taken.set(t, k)));
  moved.forEach((o, k) => {
    if (o.defId === 'stairs' || owner([...footprint[k]][0]) <= 0) return;
    const def = getDef(o.defId);
    const [fx, fy] = FRONT[o.dir];
    const fp = [...footprint[k]];
    const ahead = fp.map((t) => t + fx + fy * MAP_W).filter((t) => !footprint[k].has(t));
    if (ahead.some((t) => taken.has(t) && taken.get(t) !== k)) return;
    const back = fp.map((t) => near(t, -fx, -fy)).filter((t) => !footprint[k].has(t));
    const fits = back.length > 0 && back.every((t) => {
      if (t < 0 || !isSolid(t) || owner(t) !== owner(fp[0]) || (taken.has(t) && taken.get(t) !== k)) return false;
      const bx = t % MAP_W;
      const by = Math.floor(t / MAP_W);
      const key = edgeKey(bx, by, sideTowards({ x: bx, y: by }, { x: bx - fx, y: by - fy })!);
      return !!key && !!walls[key] && walls[key] !== 'door';
    });
    if (!fits) return;
    footprint[k].forEach((t) => taken.delete(t));
    o.x -= fx;
    o.y -= fy;
    footprint[k] = new Set(footprintTiles(def, o.x, o.y, o.dir).map((p) => idx(p.x, p.y)));
    footprint[k].forEach((t) => taken.set(t, k));
  });

  return { tiles: out, walls, paint: newPaint, objects: moved };
}

/** The faces of the wall on an edge: the face on the first tile's side, then the second's (Paint.wall keys). */
export function faceKeys(key: string): [string, string] {
  const [a, b] = edgeTiles(key);
  return key.endsWith('n') ? [`${idx(a.x, a.y)}s`, `${idx(b.x, b.y)}n`] : [`${idx(a.x, a.y)}e`, `${idx(b.x, b.y)}w`];
}

/** The side of its tile a point is nearest (`fx`, `fy` in tiles, as the pointer is over the lot). */
export function nearestSide(fx: number, fy: number): Side {
  const u = fx - Math.floor(fx);
  const v = fy - Math.floor(fy);
  const d = { w: u, e: 1 - u, n: v, s: 1 - v };
  return (Object.keys(d) as Side[]).sort((a, b) => d[a] - d[b])[0];
}

/** How far a point is from the nearest line between tiles, in tiles. */
export function lineDistance(fx: number, fy: number): number {
  const u = fx - Math.floor(fx);
  const v = fy - Math.floor(fy);
  return Math.min(u, 1 - u, v, 1 - v);
}

/**
 * The edges of a straight wall from one corner of the grid to another (참고 게임's wall tool), the
 * longer way: along a row line (`edgeKey(x, cy, 'n')`) or a column line (`edgeKey(cx, y, 'w')`).
 * Corners are grid points in the lot's stacked rows; null where the line would leave its floor.
 */
export function lineEdges(ax: number, ay: number, bx: number, by: number): string[] | null {
  const along = Math.abs(bx - ax) >= Math.abs(by - ay);
  const out: string[] = [];
  if (along) {
    for (let x = Math.min(ax, bx); x < Math.max(ax, bx); x++) {
      const k = edgeKey(x, ay, 'n');
      if (!k) return null;
      out.push(k);
    }
  } else {
    const level = Math.floor(Math.min(ay, by) / MAP_H);
    if (Math.floor((Math.max(ay, by) - 1) / MAP_H) !== level) return null;
    for (let y = Math.min(ay, by); y < Math.max(ay, by); y++) {
      const k = edgeKey(ax, y, 'w');
      if (!k) return null;
      out.push(k);
    }
  }
  return out;
}
