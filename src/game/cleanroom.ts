import { MAP_H, MAP_W, idx } from './world';
import { between, type Walls } from './walls';
import { workplaceOf, type CleanroomSpec } from './workplace';
import type { Dweller, Tile } from './types';

/**
 * A workplace's clean zone (2026-11-01, the 반도체 팹: in only through the air shower, in a suit). Which tiles are inside is
 * worked out from the lot as laid (walls on the lines): everything reached from its seeds without crossing a wall or a door,
 * so it can't go out of step with the plan. Worn by position alone, so it holds however someone got there and whatever they do.
 */
export function cleanZone(tiles: readonly Tile[], walls: Walls, spec: CleanroomSpec): Set<number> {
  const zone = new Set<number>();
  const rows = Math.min(MAP_H, Math.floor(tiles.length / MAP_W));
  const todo = spec.zone.map(([x, y]) => ({ x, y }));
  for (const p of todo) zone.add(idx(p.x, p.y));
  while (todo.length) {
    const p = todo.pop()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const q = { x: p.x + dx, y: p.y + dy };
      if (q.x < 0 || q.y < 0 || q.x >= MAP_W || q.y >= rows || zone.has(idx(q.x, q.y)) || between(walls, p, q)) continue;
      zone.add(idx(q.x, q.y));
      todo.push(q);
    }
  }
  return zone;
}

type Lot = { state: { workplace?: { careerId: string; branch?: number } | null }; tiles: Tile[]; walls: Walls };
const zones = new WeakMap<Walls, Set<number>>();

/** The lot's clean zone and its spec; null on any other lot. */
function cleanOf(game: Lot): { zone: Set<number>; spec: CleanroomSpec } | null {
  const spec = workplaceOf(game.state.workplace?.careerId ?? '', game.state.workplace?.branch)?.cleanroom;
  if (!spec) return null;
  let zone = zones.get(game.walls);
  if (!zone) zones.set(game.walls, (zone = cleanZone(game.tiles, game.walls, spec)));
  return { zone, spec };
}

/** Whether someone at this place on the lot is in the suit: anywhere in the zone, and at the spot where it goes on and comes off. */
export function inCleanSuit(game: Lot, s: Pick<Dweller, 'x' | 'y'>): boolean {
  const at = cleanOf(game);
  if (!at) return false;
  const x = Math.round(s.x);
  const y = Math.round(s.y);
  return at.zone.has(idx(x, y)) || (at.spec.robe.x === x && at.spec.robe.y === y);
}

/** Seconds stopped on the way: to dress or undress at the robing spot, under the jets on the way in. */
export const ROBE_PAUSE = 1.6;
export const SHOWER_PAUSE = 3.6;

/** How long someone walking the next step stops here; each stop once on a walk (`done` holds which they've had). */
export function cleanPause(game: Lot, s: Pick<Dweller, 'x' | 'y'>, next: { x: number; y: number }, done: 'robe' | 'shower' | 'both' | undefined): { at: 'robe' | 'shower'; seconds: number } | null {
  const spec = workplaceOf(game.state.workplace?.careerId ?? '', game.state.workplace?.branch)?.cleanroom;
  if (!spec) return null;
  const x = Math.round(s.x);
  const y = Math.round(s.y);
  if (x === spec.robe.x && y === spec.robe.y && done !== 'robe' && done !== 'both') return { at: 'robe', seconds: ROBE_PAUSE };
  // Only going in, towards the zone's side of the shower: on the way out it's a corridor.
  if (x === spec.shower.x && y === spec.shower.y && next.y < s.y && done !== 'shower' && done !== 'both') return { at: 'shower', seconds: SHOWER_PAUSE };
  return null;
}
