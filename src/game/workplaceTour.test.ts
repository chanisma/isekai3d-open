import { describe, expect, it } from 'vitest';
import { Game } from './game';
import { ALL_WORK_LOTS } from './workplace';
import { workLayout } from './workplaceKit';
import { MAP_W, idx } from './world';

describe('workplace tour (a tool for development)', () => {
  it('opens every workplace on its own and lets it run for an hour', () => {
    for (const id of Object.keys(ALL_WORK_LOTS)) {
      let seed = 7;
      const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      const g = Game.workplaceTour(id, rng);
      expect(g.state.workplace?.careerId, id).toBe(id.split('@')[0]);
      expect(g.state.dwellers.length, id).toBe(1 + ALL_WORK_LOTS[id].coworkers.length);
      const start = g.state.time;
      for (let t = 0; t < 60; t += 1) g.step(1);
      expect(g.state.time, id).toBeGreaterThan(start);
      expect(g.dweller(g.state.activeDwellerId), id).toBeTruthy();
    }
  });

  it('gives every work lot a proper restroom: a room with a toilet and a sink, its door in its wall', () => {
    const misses: string[] = [];
    for (const [id, def] of Object.entries(ALL_WORK_LOTS)) {
      const { tiles, objects, restrooms } = workLayout(def);
      if (!restrooms.length) {
        misses.push(id);
        continue;
      }
      // Every toilet is in a restroom of its own (a ward's rooms each have one).
      expect(objects.filter((o) => o.defId === 'toilet').length, id).toBe(restrooms.length);
      for (const restroom of restrooms) {
        const inside = new Set(restroom.cells);
        expect(restroom.cells.length, id).toBeGreaterThanOrEqual(4);
        const fixtures = objects.filter((o) => inside.has(idx(o.x, o.y)));
        expect(fixtures.map((o) => o.defId).sort(), id).toEqual(['sink', 'toilet']);
        const { x, y } = restroom.door;
        expect(tiles[idx(x, y)], id).toBe('door');
        // Set in a wall: walls on both sides along the wall line.
        const horizontal = tiles[idx(x - 1, y)] === 'wall' && tiles[idx(x + 1, y)] === 'wall';
        const vertical = tiles[idx(x, y - 1)] === 'wall' && tiles[idx(x, y + 1)] === 'wall';
        expect(horizontal || vertical, `${id}: door ${x},${y} in a wall`).toBe(true);
        // The restroom is closed: every tile round it is a wall or its door.
        for (const c of restroom.cells) {
          const cx = c % MAP_W;
          const cy = Math.floor(c / MAP_W);
          for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
            const n = idx(nx, ny);
            if (inside.has(n)) continue;
            expect(['wall', 'door'].includes(tiles[n]), `${id}: restroom open at ${nx},${ny}`).toBe(true);
          }
        }
      }
    }
    expect(misses).toEqual([]);
  });

});
