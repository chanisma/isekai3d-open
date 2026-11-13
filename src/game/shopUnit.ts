import type { Tile } from './types';
import { OUTDOOR, building } from './workplaceKit';
import { MAP_W, idx } from './world';

/**
 * One unit of a row of shops on the street (2026-11-05, the layout audit): the building cut down to the unit, its walls from x 1 to
 * `x1` and from `y0` to the front wall at y 14, the rest of the lot open ground (the neighbours stand there as pieces, as the agency's
 * do in workplace.ts realEstate). Rooms and doors as `building` takes them; `cells` patch the plan after.
 */
export function shopUnit(x1: number, y0: number, rooms: Array<[number, number, number, number, Tile]>, doors: Array<[number, number]>, cells: Array<[number, number, Tile]> = []): Tile[] {
  const t = building(rooms, doors);
  for (let y = 0; y < 15; y++) for (let x = 0; x < MAP_W; x++) if (x > x1 || y < y0) t[idx(x, y)] = OUTDOOR;
  for (let y = y0; y <= 14; y++) if (t[idx(x1, y)] !== 'door') t[idx(x1, y)] = 'wall';
  for (let x = 1; x <= x1; x++) if (t[idx(x, y0)] !== 'door') t[idx(x, y0)] = 'wall';
  for (const [x, y, v] of cells) t[idx(x, y)] = v;
  return t;
}
