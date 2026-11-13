import { gridBetween } from './walls';
import { MAP_H, MAP_W, idx, type Blocked } from './world';

/** Extra steps between tiles that aren't side by side: stairs between floors (tile -> tiles, with a cost). */
export type Links = Map<number, Array<{ to: number; cost: number }>>;
import type { P } from './types';

export interface DistMap {
  /** Path cost from the start; -1 when unreachable. */
  dist: Float64Array;
  prev: Int32Array;
  sx: number;
  sy: number;
}

const STEPS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * Dijkstra over the 4-connected grid. Entering a tile costs `cost[i]` (1 when omitted), so
 * discouraged tiles are avoided when a cheaper detour exists but stay walkable.
 * The start tile is always allowed, and no step goes through a wall (`blocked.walls`). A gated tile (the foot of a flight of stairs) is stepped onto
 * and off only from the one tile given for it (the one in front of the bottom step).
 */
export function routeFrom(blocked: Blocked, sx: number, sy: number, cost?: Float32Array, links?: Links, gates?: Map<number, number>): DistMap {
  const n = blocked.length;
  const rows = n / MAP_W;
  const dist = new Float64Array(n).fill(-1);
  const prev = new Int32Array(n).fill(-1);
  const done = new Uint8Array(n);
  const walls = blocked.walls;
  const start = idx(sx, sy);
  dist[start] = 0;
  const heap = new MinHeap();
  heap.push(start, 0);
  while (heap.size > 0) {
    const cur = heap.pop();
    if (done[cur]) continue;
    done[cur] = 1;
    const cx = cur % MAP_W;
    const cy = (cur - cx) / MAP_W;
    // Stairs: straight on to the other floor.
    for (const l of links?.get(cur) ?? []) {
      if (blocked[l.to] || done[l.to]) continue;
      const d = dist[cur] + l.cost;
      if (dist[l.to] === -1 || d < dist[l.to]) {
        dist[l.to] = d;
        prev[l.to] = cur;
        heap.push(l.to, d);
      }
    }
    for (const [dx, dy] of STEPS) {
      const nx = cx + dx;
      const ny = cy + dy;
      // No stepping off one floor's edge onto the next floor's.
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= rows || Math.floor(ny / MAP_H) !== Math.floor(cy / MAP_H)) continue;
      const ni = idx(nx, ny);
      if (blocked[ni] || done[ni]) continue;
      if (walls && gridBetween(walls, cur, ni) === 1) continue;
      if (gates && ((gates.has(ni) && gates.get(ni) !== cur) || (gates.has(cur) && gates.get(cur) !== ni))) continue;
      const d = dist[cur] + (cost ? cost[ni] : 1);
      if (dist[ni] === -1 || d < dist[ni]) {
        dist[ni] = d;
        prev[ni] = cur;
        heap.push(ni, d);
      }
    }
  }
  return { dist, prev, sx, sy };
}

export function distTo(map: DistMap, p: P): number {
  return map.dist[idx(p.x, p.y)];
}

/** Path from the search start to (tx, ty), excluding the start tile. Empty if already there. */
export function pathTo(map: DistMap, tx: number, ty: number): P[] | null {
  let cur = idx(tx, ty);
  if (map.dist[cur] < 0) return null;
  const out: P[] = [];
  const start = idx(map.sx, map.sy);
  while (cur !== start) {
    const x = cur % MAP_W;
    out.push({ x, y: (cur - x) / MAP_W });
    cur = map.prev[cur];
  }
  return out.reverse();
}

/** Cheapest reachable candidate tile, or null. */
export function nearest(map: DistMap, candidates: P[]): P | null {
  let best: P | null = null;
  let bestD = Infinity;
  for (const c of candidates) {
    const d = distTo(map, c);
    if (d >= 0 && d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

/** Binary min-heap of tile indices keyed by path cost. */
class MinHeap {
  private items: number[] = [];
  private keys: number[] = [];

  get size(): number {
    return this.items.length;
  }

  push(item: number, key: number) {
    let i = this.items.length;
    this.items.push(item);
    this.keys.push(key);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.keys[parent] <= key) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  pop(): number {
    const top = this.items[0];
    const lastItem = this.items.pop()!;
    const lastKey = this.keys.pop()!;
    if (this.items.length > 0) {
      this.items[0] = lastItem;
      this.keys[0] = lastKey;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < this.keys.length && this.keys[l] < this.keys[m]) m = l;
        if (r < this.keys.length && this.keys[r] < this.keys[m]) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }

  private swap(a: number, b: number) {
    [this.items[a], this.items[b]] = [this.items[b], this.items[a]];
    [this.keys[a], this.keys[b]] = [this.keys[b], this.keys[a]];
  }
}
