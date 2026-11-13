import * as THREE from 'three';
import { describe, expect, test } from 'vitest';
import { getDef } from '../../game/catalog';
import { motionOf } from '../activity';
import { buildFurniture } from '../furniture3d';
import { BT_SEATS, TB, WC, btDoing, btNow, type BtSeat } from './bathMotion';

const IDS = ['toilet', 'shower', 'sink', 'bathtub', 'pottyChair', 'broomSet', 'mopBucket', 'vacuumCleaner', 'cleaningCart'];
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
const named = (o: THREE.Object3D, name: string) => o.getObjectByName(name)!;

describe('the bathroom and the cleaning things', () => {
  test('every piece stays within its footprint, near enough, and keeps its triangles moderate', () => {
    for (const id of IDS) {
      const def = getDef(id);
      const b = build(id);
      const box = new THREE.Box3();
      for (const c of b.root.children) if (c !== b.inUse) box.expandByObject(c);
      expect(box.min.x, id).toBeGreaterThan(-def.w / 2 - 0.06);
      expect(box.max.x, id).toBeLessThan(def.w / 2 + 0.06);
      expect(box.min.z, id).toBeGreaterThan(-def.h / 2 - 0.06);
      expect(box.max.z, id).toBeLessThan(def.h / 2 + 0.14);
      expect(tris(b.root), id).toBeLessThan(16000);
    }
  });

  test('dwellers sit where they always have, and each interaction has its own way', () => {
    expect(WC.seat).toBe(0.45);
    expect(build('toilet').seat!.position.y).toBeCloseTo(0.45);
    expect(build('pottyChair').seat!.position.y).toBeCloseTo(0.27);
    expect(build('toilet').seatMotion).toEqual({ use: 'btToilet' });
    expect(build('pottyChair').seatMotion).toEqual({ usePotty: 'btPotty' });
    for (const id of ['bathtub', 'shower']) {
      expect(Object.keys(build(id).seatMotion!).sort(), id).toEqual(getDef(id).interactions.filter((i) => i.pose === 'on').map((i) => i.id).sort());
    }
    expect(motionOf('shower', 'shower', false)).toBe('lather');
  });

  test('a toilet lifts its lid for someone and shuts it after them', () => {
    const b = build('toilet');
    const lid = named(b.root, 'lid');
    expect(lid.rotation.x).toBe(0);
    let t = 0;
    for (let i = 0; i < 60; i++) b.seated!([0], false, (t += 0.1), ['use']);
    expect(lid.rotation.x).toBeLessThan(-1.5);
    for (let i = 0; i < 60; i++) b.seated!([], false, (t += 0.1), []);
    expect(lid.rotation.x).toBeCloseTo(0, 2);
  });

  test('a bath fills and foams for a bather, more for bubbles, and drains after', () => {
    const run = (id: string) => {
      const b = build('bathtub');
      const water = named(b.root, 'water');
      const foam = named(b.root, 'foam');
      let t = 0;
      b.seated!([], false, (t += 0.1), []);
      expect(water.visible).toBe(false);
      for (let i = 0; i < 120; i++) b.seated!([0], false, (t += 0.1), [id]);
      expect(water.position.y).toBeCloseTo(TB.full, 2);
      expect(foam.visible).toBe(true);
      const top = new THREE.Box3().setFromObject(foam).max.y;
      for (let i = 0; i < 200; i++) b.seated!([], false, (t += 0.1), []);
      expect(water.visible).toBe(false);
      expect(foam.visible).toBe(false);
      return top;
    };
    const plain = run('takeBath');
    expect(plain).toBeGreaterThan(TB.full);
    expect(run('bubbleBath')).toBeGreaterThan(plain + 0.05);
  });

  test('a shower runs water and steam only with someone in it; a cold one has no steam', () => {
    const run = (id: string) => {
      const b = build('shower');
      const water = named(b.root, 'water');
      const steam = named(b.root, 'steam');
      let t = 0;
      for (let i = 0; i < 40; i++) b.seated!([], false, (t += 0.1), []);
      expect(water.visible).toBe(false);
      expect(steam.visible).toBe(false);
      for (let i = 0; i < 100; i++) b.seated!([0], false, (t += 0.1), [id]);
      expect(water.visible).toBe(true);
      const seen = steam.visible;
      for (let i = 0; i < 200; i++) b.seated!([], false, (t += 0.1), []);
      expect(water.visible).toBe(false);
      return seen;
    };
    expect(run('showerSteamy')).toBe(true);
    expect(run('showerCold')).toBe(false);
  });

  test('a sink has its place for a wash and leaves cleaning and repair to the usual pose', () => {
    const b = build('sink');
    expect(Object.keys(b.spots!)).toEqual(['wash']);
    expect(b.spots!.wash.motion).toBe('btWash');
    expect(named(b.root, 'lever').rotation.x).toBe(0);
    b.away!(false, 5);
    expect(named(b.root, 'lever').rotation.x).toBeCloseTo(0);
  });

  test('a sink with its back to the camera is low, whichever way it stands; from its front or side it has its mirror', () => {
    const b = build('sink');
    const upper = named(b.root, 'sinkUpper');
    const heightShown = () => {
      b.root.updateMatrixWorld(true);
      const box = new THREE.Box3();
      b.root.traverseVisible((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) box.expandByObject(m);
      });
      return box.max.y;
    };
    for (const ry of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      b.root.rotation.y = ry;
      const f = new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry));
      const side = new THREE.Vector3(f.z, 0, -f.x);
      const from = (d: THREE.Vector3) => b.seenFrom!(d.clone().multiplyScalar(8).setY(5));
      from(f);
      expect(upper.visible).toBe(true);
      expect(heightShown()).toBeGreaterThan(1.8);
      from(side);
      expect(upper.visible).toBe(true);
      from(f.clone().negate());
      expect(upper.visible).toBe(false);
      expect(heightShown()).toBeLessThan(1.3);
    }
  });

  test('every beat of a wash is finite and within reach, and starts and ends with the water off', () => {
    for (let u = 0; u <= 1; u += 0.01) {
      const n = btNow('btWash', u, 1.6, u * 2.1);
      for (const p of [n.l, n.r, n.st]) for (const x of p) expect(Number.isFinite(x)).toBe(true);
      for (const h of [n.l, n.r]) expect(Math.hypot(h[0] - n.st[0], h[1] - 1.3, h[2] - n.st[1]), `at ${u.toFixed(2)}`).toBeLessThan(0.95);
    }
    expect(btNow('btWash', 0, 1.6, 0).water).toBe(false);
    expect(btNow('btWash', 0.5, 1.6, 0).water).toBe(true);
    expect(btNow('btWash', 0.99, 1.6, 0).water).toBe(false);
  });

  test('on a piece everything is finite at any time and size, and in a shower the hands stay on the head, shoulders and arms', () => {
    for (const m of BT_SEATS) {
      const standing = m.startsWith('btShower');
      for (const height of [0.85, 1.3, 1.6, 1.85]) {
        for (let t = 0; t < 30; t += 0.23) {
          const base = new THREE.Vector3(1, standing ? 0 : 0.3, 2);
          const d = btDoing(m as BtSeat, { base, yaw: 0.7, height, sitting: !standing }, t, 3);
          for (const h of [d.reach!.l!, d.reach!.r!]) {
            expect(Number.isFinite(h.x + h.y + h.z), m).toBe(true);
            if (standing) expect(h.y, `${m} at ${t.toFixed(2)}`).toBeGreaterThanOrEqual(0.5 * height);
          }
        }
      }
    }
  });

  test('all of them run with nobody there, and from a long way on, without throwing', () => {
    for (const id of IDS) {
      const b = build(id);
      for (let t = 0; t < 40; t += 0.37) {
        b.seated?.([], false, t, []);
        b.away?.(false, t);
        b.animate?.(t);
      }
      b.seated?.([0], false, 1e6, ['x']);
      b.away?.(false, 1e6);
    }
  });

  test('a tool at work stays in order all through its round, with what it leaves shown only in use', () => {
    for (const id of ['broomSet', 'mopBucket', 'vacuumCleaner']) {
      const b = build(id);
      const s = b.spots!['*'];
      b.root.updateMatrixWorld(true);
      for (let t = 100; t < 130; t += 0.1) {
        s.at.userData.posedAt = t;
        s.at.userData.height = 1.6;
        b.away!(false, t);
        const tool = s.held?.tool;
        if (tool) for (const x of tool.position.toArray()) expect(Number.isFinite(x), id).toBe(true);
      }
      expect(b.inUse, id).toBeDefined();
    }
  });
});
