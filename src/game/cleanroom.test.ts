import { describe, expect, it } from 'vitest';
import { getDef } from './catalog';
import { cleanZone, inCleanSuit } from './cleanroom';
import { Game } from './game';
import { pathTo, routeFrom } from './path';
import { between } from './walls';
import { WORKPLACES } from './workplace';
import { idx, MAP_H, MAP_W } from './world';

/** The fab as the game really lays it: walls on the lines, restroom fitted. */
const lot = () => Game.workplaceTour('semiconductor', () => 0.5);
const spec = WORKPLACES.semiconductor.cleanroom!;
const STREET = { x: 12, y: 16 };
const IN_ZONE = ['fbFoupRail', 'fbEtchRow', 'fbWaferRobot', 'fbWetBench', 'fbMicroscope', 'fbLitho', 'fbCoater'];
const OUTSIDE = ['fbGownBench', 'fbYieldBoard', 'fbChemCabinet', 'toilet', 'coffeeMaker', 'sofa'];

describe('the fab is entered through the air shower', () => {
  it('the zone is walled off: its only ways out are the shower booth’s two doors, and the booth has no other opening', () => {
    const g = lot();
    const zone = cleanZone(g.tiles, g.walls, spec);
    const booth = [{ x: 5, y: 9 }, { x: 5, y: 10 }];
    for (const b of booth) expect(zone.has(idx(b.x, b.y))).toBe(true);
    // Every edge between the zone and anywhere else.
    const crossings: Array<string> = [];
    for (const i of zone) {
      const p = { x: i % MAP_W, y: Math.floor(i / MAP_W) };
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const q = { x: p.x + dx, y: p.y + dy };
        if (q.x < 0 || q.y < 0 || q.x >= MAP_W || q.y >= MAP_H) continue;
        const k = between(g.walls, p, q);
        if (zone.has(idx(q.x, q.y))) continue;
        expect(k, `an opening from ${p.x},${p.y} to ${q.x},${q.y}`).toBeTruthy();
        if (k === 'door') crossings.push(`${p.x},${p.y}>${q.x},${q.y}`);
      }
    }
    // Out of the booth's outer end, and no other door leads out of the zone at all.
    expect(crossings).toEqual(['5,10>5,11']);
    // In the booth: walls down both sides, a door at each end.
    for (const b of booth) {
      expect(between(g.walls, b, { x: b.x - 1, y: b.y })).toBe('wall');
      expect(between(g.walls, b, { x: b.x + 1, y: b.y })).toBe('wall');
    }
    expect(between(g.walls, { x: 5, y: 9 }, { x: 5, y: 8 })).toBe('door');
    expect(between(g.walls, { x: 5, y: 10 }, { x: 5, y: 11 })).toBe('door');
  });

  it('from the street, the path to every cleanroom piece runs through the shower tile, and with that tile closed none is reachable', () => {
    const g = lot();
    const open = routeFrom(g.blocked, STREET.x, STREET.y);
    const shut = g.blocked.slice() as typeof g.blocked;
    shut.walls = g.blocked.walls;
    shut[idx(spec.shower.x, spec.shower.y)] = 1;
    const cut = routeFrom(shut, STREET.x, STREET.y);
    let seen = 0;
    for (const o of g.state.objects) {
      if (!IN_ZONE.includes(o.defId)) continue;
      const def = getDef(o.defId);
      for (const inter of def.interactions) {
        const spots = g.usableSpots(o, inter);
        expect(spots.length, `${o.defId} ${inter.id} has somewhere to stand`).toBeGreaterThan(0);
        for (const s of spots) {
          const path = pathTo(open, s.x, s.y);
          expect(path, `${o.defId} from ${s.x},${s.y}`).toBeTruthy();
          expect(path!.some((p) => p.x === spec.shower.x && p.y === spec.shower.y), `${o.defId} at ${s.x},${s.y} goes through the shower`).toBe(true);
          expect(pathTo(cut, s.x, s.y), `${o.defId} at ${s.x},${s.y} can't be got to round it`).toBeNull();
          seen++;
        }
      }
    }
    expect(seen).toBeGreaterThan(10);
    // What's outside doesn't need the shower.
    for (const o of g.state.objects) {
      if (!OUTSIDE.includes(o.defId)) continue;
      const spots = getDef(o.defId).interactions.flatMap((i) => g.usableSpots(o, i));
      for (const s of spots) expect(pathTo(cut, s.x, s.y), `${o.defId} at ${s.x},${s.y}`).toBeTruthy();
    }
  });

  it('a dweller sent to the wet bench really walks through, in their clothes up to the mat and in the suit from there; stopped under the jets', () => {
    const g = lot();
    const dweller = g.state.dwellers.find((s) => s.id === g.state.activeDwellerId)!;
    const bench = g.state.objects.find((o) => o.defId === 'fbWetBench')!;
    const inter = getDef('fbWetBench').interactions[0];
    expect(inCleanSuit(g, dweller)).toBe(false);
    dweller.queue.length = 0;
    (dweller as { run: unknown }).run = null;
    g.enqueue(dweller.id, { kind: 'interact', objectUid: bench.uid, interactionId: inter.id, autonomous: false });
    const trail: string[] = [];
    let stoppedAtShower = 0;
    let stoppedAtRobe = 0;
    let suitBeforeRobe = false;
    let reached = false;
    for (let i = 0; i < 40 * 90 && !reached; i++) {
      const [px, py] = [dweller.x, dweller.y];
      g.step(1 / 30);
      const tile = `${Math.round(dweller.x)},${Math.round(dweller.y)}`;
      if (trail.at(-1) !== tile) trail.push(tile);
      const still = dweller.x === px && dweller.y === py && dweller.run?.phase === 'walking';
      if (still && tile === '5,9') stoppedAtShower += 1 / 30;
      if (still && tile === '5,11') stoppedAtRobe += 1 / 30;
      if (Math.round(dweller.y) > 11 && inCleanSuit(g, dweller)) suitBeforeRobe = true;
      reached = dweller.run?.phase === 'performing';
    }
    expect(reached, trail.join(' ')).toBe(true);
    const at = (t: string) => trail.indexOf(t);
    expect(at('5,9'), trail.join(' ')).toBeGreaterThan(-1);
    expect(at('5,11')).toBeLessThan(at('5,10'));
    expect(at('5,10')).toBeLessThan(at('5,9'));
    expect(suitBeforeRobe).toBe(false);
    expect(inCleanSuit(g, dweller)).toBe(true);
    expect(stoppedAtShower).toBeGreaterThan(1);
    expect(stoppedAtRobe).toBeGreaterThan(0.5);
  });

  it('the suit goes by the place, nowhere but here', () => {
    const g = lot();
    expect(inCleanSuit(g, { x: 12, y: 13 })).toBe(false);
    expect(inCleanSuit(g, { x: 8, y: 11 })).toBe(false);
    expect(inCleanSuit(g, spec.robe)).toBe(true);
    expect(inCleanSuit(g, { x: 5, y: 10 })).toBe(true);
    expect(inCleanSuit(g, { x: 20, y: 5 })).toBe(true);
    expect(inCleanSuit(g, { x: 20, y: 11 })).toBe(false);
    const other = Game.workplaceTour('aiResearcher', () => 0.5);
    expect(inCleanSuit(other, { x: 5, y: 5 })).toBe(false);
  });
});
