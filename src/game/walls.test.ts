import { describe, expect, it } from 'vitest';
import { getDef } from './catalog';
import { Game } from './game';
import { computeRooms } from './gfx/house';
import { autoWindows } from './lots';
import { routeFrom } from './path';
import type { PlacedObject, Tile } from './types';
import { between, edgeKey, edgeLot, type Walls } from './walls';
import { ALL_WORK_LOTS } from './workplace';
import { workLayout } from './workplaceKit';
import { MAP_H, MAP_W, accessTiles, buildBlocked, footprintTiles, idx, reachesFrom, stairPairs } from './world';

/** The objects that can be used from the street: some spot to use each from reached, on its side of the walls. */
function usable(tiles: Tile[], objects: PlacedObject[], walls?: Walls): string[] {
  // Up the stairs too, where the lot has an upstairs.
  const links = new Map<number, Array<{ to: number; cost: number }>>();
  for (const [a, b] of stairPairs(objects, tiles)) (links.set(a, [{ to: b, cost: 4 }]), links.set(b, [{ to: a, cost: 4 }]));
  const map = routeFrom(buildBlocked(tiles, objects, walls), 12, MAP_H - 1, undefined, links);
  return objects
    .filter((o) => {
      const def = getDef(o.defId);
      if (!def.interactions.length) return true;
      const fp = footprintTiles(def, o.x, o.y, o.dir);
      return accessTiles(def, o.x, o.y, o.dir, 1).some((p) => p.x >= 0 && p.x < MAP_W && p.y >= 0 && p.y < MAP_H && map.dist[idx(p.x, p.y)] >= 0 && (!walls || reachesFrom(walls, fp, p)));
    })
    .map((o) => o.defId)
    .sort();
}

const rooms = (r: string[]) => new Set(r.filter((x) => x !== 'outside')).size;

describe('walls on the lines between tiles (참고 게임 build mode)', () => {
  it('every work lot keeps its rooms and everything in it within reach, nothing standing across a wall', () => {
    for (const [id, def] of Object.entries(ALL_WORK_LOTS)) {
      const fitted = workLayout(def);
      const objects = fitted.objects.map((o, i) => ({ ...o, uid: i + 1 }));
      const lot = edgeLot(fitted.tiles, objects, { floor: {}, wall: {} }, autoWindows(fitted.tiles));
      expect(rooms(computeRooms(lot.tiles, lot.walls)), id).toBe(rooms(computeRooms(fitted.tiles)));
      expect(usable(lot.tiles, lot.objects, lot.walls), id).toEqual(usable(fitted.tiles, objects));
      for (const o of lot.objects) {
        const fp = footprintTiles(getDef(o.defId), o.x, o.y, o.dir);
        expect(fp.some((p) => fp.some((q) => between(lot.walls, p, q))), `${id} ${o.defId}`).toBe(false);
      }
    }
  });

  it('gives a wall between two rooms to the side with nothing against it, and sets furniture back against it', () => {
    // Two rooms either side of a wall row (y = 5), the old way.
    const tiles = new Array<Tile>(MAP_W * MAP_H).fill('grass');
    for (let y = 1; y <= 9; y++) for (let x = 1; x <= 9; x++) tiles[idx(x, y)] = x === 1 || x === 9 || y === 1 || y === 9 || y === 5 ? 'wall' : 'wood';
    const shelf: PlacedObject = { uid: 1, defId: 'bookshelf', x: 4, y: 6, dir: 'down' };
    // Only a bookshelf against it, from below: the row goes to the room above, the shelf keeps its wall.
    const one = edgeLot(tiles, [shelf], { floor: {}, wall: {} }, []);
    expect(one.walls[edgeKey(4, 6, 'n')!]).toBe('wall');
    expect(one.objects[0]).toMatchObject({ x: 4, y: 6 });
    // Against it from both sides: one of them is a tile off it now, and is set back to meet it.
    const seat: PlacedObject = { uid: 2, defId: 'armchair', x: 4, y: 4, dir: 'up' };
    const two = edgeLot(tiles, [shelf, seat], { floor: {}, wall: {} }, []);
    const [s, a] = two.objects;
    const line = two.walls[edgeKey(4, 5, 'n')!] ? 5 : 6;
    expect(two.walls[edgeKey(4, line, 'n')!]).toBe('wall');
    expect(s.y).toBe(line);
    expect(a.y).toBe(line - 1);
  });

  it('walks through doors only, and uses things from their own side of a wall', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
    // From the bathroom to the bedroom next door: round by the doors, not through the wall.
    const map = routeFrom(g.blocked, 11, 5);
    expect(map.dist[idx(9, 5)]).toBeGreaterThan(4);
    // The toilet against the bedroom wall isn't used from the bedroom.
    const toilet = g.state.objects.find((o) => o.defId === 'toilet')!;
    const spots = g.usableSpots(toilet, getDef('toilet').interactions[0]);
    expect(spots.length).toBeGreaterThan(0);
    expect(spots.every((p) => p.x >= 10)).toBe(true);
  });

  it('a fire spreads over the floor but not through a wall', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
    g.state.freeWill = false;
    g.state.dwellers[0].away = { until: g.state.time + 1e6, outing: 'park' } as never;
    // A fire right against the bedroom's wall with the bathroom, on both sides of nothing else.
    g.state.fires = [{ x: 9, y: 5 }];
    g.state.fireStartedAt = g.state.time;
    for (let i = 0; i < 40; i++) {
      g.state.fireSpreadAt = g.state.time;
      g.step(0.5);
    }
    expect((g.state.fires ?? []).length).toBeGreaterThan(1);
    expect((g.state.fires ?? []).every((f) => f.x <= 9)).toBe(true);
  });
});
