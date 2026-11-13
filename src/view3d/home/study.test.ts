import * as THREE from 'three';
import { describe, expect, test } from 'vitest';
import { getDef } from '../../game/catalog';
import { spotPose } from '../activity';
import { buildFurniture, kindOf } from '../furniture3d';
import { WORKPLACE_DETAIL } from '../workplaces';
import type { Spot } from '../parts';
import { SUBJECT_KEYS, paintBoard, paintField, paintPage, paintPc, paintRoad, paintSide, type PcMode } from './study';
import { GB_MOTIONS, gbBeats, gbNow, gbSeconds, type GbMotion } from './studyMotion';
import type { Painter } from './play';

const IDS = ['computer', 'gamingComputer', 'studyDesk', 'microscope', 'anatomyModel', 'chemistrySet', 'drivingSim', 'planningBoard', 'businessBoardGame', 'woodworkingTable', 'homeToolBench', 'rocketShip'];
const build = (id: string) => buildFurniture(getDef(id), { againstWall: true });
const tris = (o: THREE.Object3D) => {
  let n = 0;
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (!m.isMesh || m.userData.ink) return;
    const g = m.geometry;
    n += (g.index ? g.index.count : g.attributes.position.count) / 3;
  });
  return n;
};
/** Everything a canvas would throw on: a negative radius, anything not finite. */
const painter = (): Painter =>
  new Proxy({} as Record<string, unknown>, {
    get: (o, k) => {
      if (k === 'measureText') return () => ({ width: 40 });
      if (k in o) return o[k as string];
      return (...a: unknown[]) => {
        if (k === 'arc' && (a[2] as number) < 0) throw new Error('negative radius');
        for (const x of a) if (typeof x === 'number' && !Number.isFinite(x)) throw new Error(`${String(k)} not finite`);
      };
    },
    set: (o, k, v) => {
      o[k as string] = v;
      return true;
    },
  }) as unknown as Painter;
const motions = [...GB_MOTIONS] as GbMotion[];

describe('studying at home', () => {
  test('no workplace overrides these, and every piece keeps within its footprint and its triangles moderate', () => {
    for (const id of IDS) {
      expect(WORKPLACE_DETAIL[id], id).toBeUndefined();
      const def = getDef(id);
      const b = build(id);
      const box = new THREE.Box3();
      for (const c of b.root.children) if (c !== b.inUse && !(c.type === 'Group' && c.position.z > def.h / 2 - 0.2) && c.visible) box.expandByObject(c);
      expect(box.min.x, id).toBeGreaterThan(-def.w / 2 - 0.1);
      expect(box.max.x, id).toBeLessThan(def.w / 2 + 0.1);
      expect(box.min.z, id).toBeGreaterThan(-def.h / 2 - 0.1);
      expect(box.max.z, id).toBeLessThan(def.h / 2 + 0.22);
      expect(tris(b.root), id).toBeLessThan(22000);
    }
  });

  test('every use of each has its own place and motion, and upkeep stays the family\'s', () => {
    for (const id of IDS) {
      const b = build(id);
      const ids = getDef(id).interactions.map((i) => i.id);
      for (const k of Object.keys(b.spots!)) expect(ids, `${id}: ${k}`).toContain(k);
      for (const i of getDef(id).interactions) {
        if (/^(repair|upgrade_|admire|clean)/.test(i.id)) expect(b.spots![i.id], `${id}: ${i.id}`).toBeUndefined();
        else expect(b.spots![i.id], `${id}: ${i.id}`).toBeDefined();
      }
      expect(b.spots!['*'], id).toBeUndefined();
      expect(b.work, id).toBeDefined();
      for (const s of Object.values(b.spots!)) expect(GB_MOTIONS.has(s.motion as string), id).toBe(true);
    }
  });

  test('the desks and the rig keep the seat and the hands that lot3d.ts relies on', () => {
    expect(kindOf(getDef('computer'))).toBe('computer');
    for (const id of ['computer', 'gamingComputer', 'studyDesk', 'drivingSim']) {
      const b = build(id);
      expect(b.seat, id).toBeDefined();
      expect(b.work, id).toBeDefined();
    }
  });

  test('every beat of every motion is finite, whatever the size of the dweller, all through and a long way on', () => {
    for (const m of motions) {
      expect(gbSeconds(m), m).toBeGreaterThan(0);
      for (const H of [1.1, 1.3, 1.6, 1.85]) {
        const total = gbSeconds(m);
        for (let s = 0; s <= total; s += total / 90) {
          const n = gbNow(m, s + total * 5, H, 1000 + s);
          for (const p of [n.l, n.r, n.tool?.at ?? [0, 0, 0], n.tool?.y ?? [0, 1, 0]]) for (const x of p) expect(Number.isFinite(x), `${m} at ${s}`).toBe(true);
          for (const x of [n.turn, n.lean, n.nod, n.palms, n.st[0], n.st[1]]) expect(Number.isFinite(x), m).toBe(true);
        }
      }
    }
  });

  test('tools are named, held only on their beats, and go back to where they rest', () => {
    const uses: Array<[string, string, string]> = [
      ['woodworkingTable', 'woodwork', 'saw'], ['woodworkingTable', 'woodwork', 'plane'], ['woodworkingTable', 'woodwork', 'chisel'],
      ['homeToolBench', 'benchFile', 'file'], ['homeToolBench', 'benchFix', 'driver'],
      ['rocketShip', 'buildRocket', 'spanner'], ['chemistrySet', 'runExperiment', 'pipette'], ['planningBoard', 'planGoals', 'marker'],
      ['studyDesk', 'homework', 'pen'], ['computer', 'tutorial', 'pen'], ['microscope', 'research', 'pen'],
    ];
    for (const [id, inter, tool] of uses) {
      const b = build(id);
      const s = b.spots![inter] as Spot;
      const m = s.motion as GbMotion;
      const beat = gbBeats(m).find((x) => x.tool === tool && !/^(take|put)/.test(x.name))!;
      expect(beat, `${id} ${tool}`).toBeDefined();
      const begun = 10;
      const when = begun + beat.from + beat.s / 2;
      s.at.userData.gbBegan = begun;
      s.at.userData.gbLast = when;
      s.at.userData.height = 1.6;
      b.away!(false, when);
      expect(s.held?.tool.name, `${id} ${tool}`).toBe(tool);
      const posed = spotPose(s, 'type', 1.6, when, 1);
      expect(posed.doing.reach?.hold?.tool.name).toBe(tool);
      // Long after, nobody's there: nothing in anyone's hands.
      b.away!(false, when + 100);
      expect(s.held).toBeNull();
    }
  });

  test('both hands stay on a two-handed tool within reach of their shoulders, all through the round, at 1.6 and 1.8', () => {
    const uses: Array<[string, string, string[]]> = [['homeToolBench', 'benchFile', ['file']], ['woodworkingTable', 'woodwork', ['plane', 'chisel']]];
    for (const [id, inter, names] of uses) {
      for (const H of [1.6, 1.8]) {
        const b = build(id);
        b.root.updateMatrixWorld(true);
        const s = b.spots![inter] as Spot;
        const m = s.motion as GbMotion;
        let seen = 0;
        for (let u = 0; u < gbSeconds(m); u += 0.1) {
          const t = 10 + u;
          s.at.userData.gbBegan = 10;
          s.at.userData.gbLast = t;
          s.at.userData.height = H;
          b.away!(false, t);
          const held = s.held;
          if (!held || !names.includes(held.tool.name)) continue;
          seen++;
          const n = gbNow(m, u, H, t);
          // Still bending to take it: the hands are on their way, as the probe also leaves out.
          if (held.resting && n.k < 0.5) continue;
          held.tool.updateWorldMatrix(true, false);
          // The shoulders, with the lean and the crouch (0.37 m at full), facing the piece.
          const drop = 0.37 * n.crouch + 0.3 * H * (1 - Math.cos(n.lean));
          const y = 0.82 * H - drop;
          const z = n.st[1] - 0.3 * H * Math.sin(n.lean);
          for (const [side, sx] of [['left', -1], ['right', 1]] as const) {
            const grip = held.grips[side];
            expect(grip, `${held.tool.name} ${side}`).toBeDefined();
            const p = held.tool.localToWorld(grip!.at.clone());
            const d = p.distanceTo(new THREE.Vector3(n.st[0] + sx * 0.17 * (H / 1.6), y, z));
            expect(d, `${held.tool.name} ${n.beat} ${side} at ${H}, ${u.toFixed(1)} s`).toBeLessThan(0.52);
          }
          // A hand's breadth or two between the hands.
          expect(held.grips.left!.at.distanceTo(held.grips.right!.at)).toBeLessThan(0.15);
        }
        expect(seen, `${id} at ${H}`).toBeGreaterThan(20);
      }
    }
  });

  test('a pose at every spot is finite, for a teen and a grown-up', () => {
    for (const id of IDS) {
      const b = build(id);
      b.root.updateMatrixWorld(true);
      for (const s of Object.values(b.spots!)) {
        for (const H of [1.45, 1.7]) {
          for (let t = 5; t < 45; t += 0.7) {
            const p = spotPose(s, 'type', H, t, 1);
            b.away!(false, t);
            const pos = p.pose.kind === 'lie' ? p.pose.head : p.pose.at;
            for (const x of pos.toArray()) expect(Number.isFinite(x), id).toBe(true);
          }
        }
      }
    }
  });

  test('the rocket goes up when it goes, and comes back to its cradle', () => {
    const b = build('rocketShip');
    const ship = b.root.getObjectByName('ship')!;
    let t = 0;
    for (; t < 8; t += 0.1) b.away!(true, t);
    expect(ship.position.y).toBeGreaterThan(0.5);
    for (; t < 60; t += 0.1) b.away!(false, t);
    expect(ship.position.y).toBe(0);
  });

  test('no picture ever throws, whatever the time', () => {
    const c = painter();
    const modes: PcMode[] = ['game', 'drill', 'chat', 'book', 'code', 'tutorial', 'call', 'news', 'translate', 'jobs', 'quit'];
    for (const t of [0, 0.01, 3.3, 77.7, 1000.5, 1e6, -5]) {
      for (const typed of [0, 2.2, 40, 5000]) for (const m of modes) paintPc(c, 320, 200, m, t, typed);
      paintSide(c, 200, 200, t);
      for (const focus of [-1, 0, 0.5, 2]) for (const kind of [0, 1, 7, -3]) paintField(c, 160, 120, t, focus, kind);
      paintRoad(c, 320, 180, t);
      for (const done of [-1, 0, 2, 4, 9]) paintBoard(c, 512, 512, done, Math.abs(t % 1), done, t > 5);
    }
    for (const k of [...SUBJECT_KEYS, 'nothing']) paintPage(c, 128, 180, k);
  });
});
