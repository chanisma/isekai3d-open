import { describe, expect, it } from 'vitest';
import { getDef } from './catalog';
import type { PlacedObject } from './types';
import { ALL_WORK_LOTS } from './workplace';
import { workWindows } from './game';
import { computeRooms } from './gfx/house';
import { autoWindows } from './lots';
import { workLayout } from './workplaceKit';
import { MAP_H, MAP_W, accessOf, buildBlocked, dims, frontTiles, idx, stairPairs } from './world';

/** Every tile a dweller can walk to from the street in front of the work lot. */
function reachable(tiles: ReturnType<(typeof ALL_WORK_LOTS)[string]['tiles']>, objects: PlacedObject[]): Set<number> {
  const blocked = buildBlocked(tiles, objects);
  const rows = tiles.length / MAP_W;
  // Up and down the stairs, where a lot has an upstairs.
  const stairs = new Map<number, number>();
  for (const [a, b] of stairPairs(objects, tiles)) stairs.set(a, b).set(b, a);
  const seen = new Set<number>([idx(12, 16)]);
  const todo = [{ x: 12, y: 16 }];
  while (todo.length) {
    const p = todo.pop()!;
    const up = stairs.get(idx(p.x, p.y));
    if (up !== undefined && !seen.has(up)) (seen.add(up), todo.push({ x: up % MAP_W, y: Math.floor(up / MAP_W) }));
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = p.x + dx;
      const y = p.y + dy;
      if (x < 0 || y < 0 || x >= MAP_W || y >= rows || Math.floor(y / MAP_H) !== Math.floor(p.y / MAP_H)) continue;
      const i = idx(x, y);
      if (seen.has(i) || blocked[i]) continue;
      seen.add(i);
      todo.push({ x, y });
    }
  }
  return seen;
}

describe('work lots are laid out so everything can be reached', () => {
  for (const def of Object.values(ALL_WORK_LOTS)) {
    it(`${def.name}: every room, every piece of furniture and every client spot can be walked to from the street`, () => {
      // As the game lays it out, restroom fitted.
      const laid = workLayout(def);
      const tiles = laid.tiles;
      const objects = laid.objects.map((o, i) => ({ ...o, uid: i + 1 })) as PlacedObject[];
      const blocked = buildBlocked(tiles, objects);
      const ok = reachable(tiles, objects);
      // Floor: every open indoor tile.
      const rows = tiles.length / MAP_W;
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < MAP_W; x++) {
          const t = tiles[idx(x, y)];
          if (t === 'wall' || t === 'void' || blocked[idx(x, y)]) continue;
          expect(ok.has(idx(x, y)), `${def.careerId}: floor ${x},${y} cut off`).toBe(true);
        }
      // Furniture: some tile next to it is reachable.
      for (const o of objects) {
        const { w, h } = dims(getDef(o.defId), o.dir);
        const around: Array<[number, number]> = [];
        for (let i = 0; i < w; i++) around.push([o.x + i, o.y - 1], [o.x + i, o.y + h]);
        for (let j = 0; j < h; j++) around.push([o.x - 1, o.y + j], [o.x + w, o.y + j]);
        expect(around.some(([x, y]) => ok.has(idx(x, y))), `${def.careerId}: ${o.defId} at ${o.x},${o.y} unreachable`).toBe(true);
      }
      // Used from the front: that is where the dweller has to stand, so the front has to be reachable too.
      for (const o of objects) {
        const d = getDef(o.defId);
        if (!d.interactions.length || accessOf(d) === 'any' || d.interactions.some((i) => i.pose === 'on')) continue;
        expect(frontTiles(d, o.x, o.y, o.dir).some((p) => ok.has(idx(p.x, p.y))), `${def.careerId}: nobody can stand at the front of ${o.defId} at ${o.x},${o.y}`).toBe(true);
      }
      // Each room hangs together on its own: nobody has to walk through another room to cross it.
      const room = new Int32Array(tiles.length).fill(-1);
      let rooms = 0;
      for (let i = 0; i < room.length; i++) {
        if (room[i] >= 0 || tiles[i] === 'wall' || tiles[i] === 'door' || tiles[i] === 'void') continue;
        const stack = [i];
        room[i] = rooms;
        while (stack.length) {
          const j = stack.pop()!;
          const x = j % MAP_W;
          const y = Math.floor(j / MAP_W);
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= rows || Math.floor(ny / MAP_H) !== Math.floor(y / MAP_H)) continue;
            const k = idx(nx, ny);
            if (room[k] >= 0 || tiles[k] === 'wall' || tiles[k] === 'door' || tiles[k] === 'void') continue;
            room[k] = rooms;
            stack.push(k);
          }
        }
        rooms++;
      }
      for (let r = 0; r < rooms; r++) {
        const open = [...room.keys()].filter((i) => room[i] === r && !blocked[i]);
        const seen = new Set([open[0]]);
        const stack = [open[0]];
        while (stack.length) {
          const j = stack.pop()!;
          const x = j % MAP_W;
          const y = Math.floor(j / MAP_W);
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= rows) continue;
            const k = idx(nx, ny);
            if (seen.has(k) || room[k] !== r || blocked[k]) continue;
            seen.add(k);
            stack.push(k);
          }
        }
        const lost = open.find((i) => !seen.has(i));
        expect(lost, `${def.careerId}: room split at ${lost === undefined ? '' : `${lost % MAP_W},${Math.floor(lost / MAP_W)}`}`).toBeUndefined();
      }
      // Clients wait on open, reachable floor.
      for (const c of def.clients ?? []) for (const [x, y] of c.spots) expect(ok.has(idx(x, y)), `${def.careerId}: spot ${x},${y}`).toBe(true);
    });
  }
});

describe('closed rooms have no windows (2026-11-04, the layout audit)', () => {
  it('every windowless piece is on its lot, its room loses its windows, and the other rooms keep theirs', () => {
    let shut = 0;
    for (const def of Object.values(ALL_WORK_LOTS)) {
      if (!def.windowless) continue;
      const { tiles, objects } = workLayout(def);
      for (const id of def.windowless) expect(objects.some((o) => o.defId === id), `${def.careerId}: ${id} on the lot`).toBe(true);
      const all = autoWindows(tiles);
      const kept = workWindows(def, tiles, objects);
      const rooms = computeRooms(tiles);
      const closed = new Set(objects.filter((o) => def.windowless!.includes(o.defId)).map((o) => rooms[idx(o.x, o.y)]));
      for (const i of kept) for (const j of [i - MAP_W, i + MAP_W]) expect(closed.has(rooms[j]), `${def.careerId}: window ${i} on a closed room`).toBe(false);
      expect(kept.length, def.careerId).toBeLessThan(all.length);
      shut++;
    }
    expect(shut).toBeGreaterThanOrEqual(17);
  });
});
