import * as THREE from 'three';
import { describe, expect, test } from 'vitest';
import { getDef } from '../../game/catalog';
import { BASSINET_BED, SEAT_Y, buildFurniture } from '../furniture3d';
import { SEATS } from './rest';
import { BABY_EYES, BABY_MOUTH } from '../babyModel';
import { CR, RS_MOTIONS, RS_SECONDS, TEAT, rsNow, rsPose, type RsMotion } from './restMotion';

const IDS = ['bed', 'doubleBed', 'deluxeBed', 'deluxeDoubleBed', 'sofa', 'armchair', 'diningChair', 'toddlerBed', 'bassinet', 'fireplace'];
const build = (id: string) => buildFurniture(getDef(id), { againstWall: true });
const topOf = (m: THREE.Mesh) => Math.max(...(m.geometry.attributes.position.array as Float32Array).filter((_, i) => i % 3 === 1));
const meanY = (m: THREE.Mesh) => {
  const p = m.geometry.attributes.position;
  let sum = 0;
  for (let i = 0; i < p.count; i++) sum += p.getY(i);
  return sum / p.count;
};
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

describe('the bedroom and the living room', () => {
  test('dwellers sit and lie at the heights the lot uses', () => {
    expect(SEATS.bed).toBe(SEAT_Y.bed);
    expect(SEATS.toddlerBed).toBe(SEAT_Y.toddlerBed);
    expect(SEATS.sofa).toBe(SEAT_Y.sofa);
    expect(SEATS.chair).toBe(SEAT_Y.chair);
    expect(CR.bed).toBe(BASSINET_BED);
    expect(build('armchair').seat!.position.y).toBeCloseTo(0.45);
    expect(build('diningChair').seat!.position.y).toBeCloseTo(0.47);
  });

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

  test('a duvet lies flat, rises over each sleeper on their side, and dents their pillow', () => {
    for (const id of ['bed', 'deluxeBed', 'toddlerBed']) {
      const c = build(id).cover!;
      expect(topOf(c.mesh), id).toBeCloseTo(0, 2);
      c.shape([0]);
      expect(topOf(c.mesh), id).toBeGreaterThan(0.12);
      c.shape([]);
      expect(topOf(c.mesh), id).toBeCloseTo(0, 2);
    }
    const c = build('doubleBed').cover!;
    c.shape([-0.5]);
    const p = c.mesh.geometry.attributes.position;
    let left = 0;
    let right = 0;
    for (let i = 0; i < p.count; i++) {
      if (p.getX(i) < -0.4) left = Math.max(left, p.getY(i));
      if (p.getX(i) > 0.4) right = Math.max(right, p.getY(i));
    }
    expect(left).toBeGreaterThan(0.15);
    expect(right).toBeLessThan(0.03);
  });

  test('a cushion gives under whoever sits on it, on their side, and comes back', () => {
    const b = build('sofa');
    const seats = () => {
      const out: number[] = [];
      b.root.traverse((c) => {
        const m = c as THREE.Mesh;
        if (m.isMesh && m.userData.ownGeometry && !m.userData.ink && Math.abs(m.position.y - 0.4) < 0.03) out.push(meanY(m));
      });
      return out;
    };
    const flat = seats();
    expect(flat).toHaveLength(2);
    let t = 0;
    for (let i = 0; i < 60; i++) b.seated!([-0.5], false, (t += 0.1));
    const sat = seats();
    expect(sat[0]).toBeLessThan(flat[0] - 0.003);
    expect(sat[1]).toBeCloseTo(flat[1], 3);
    for (let i = 0; i < 60; i++) b.seated!([], false, (t += 0.1));
    expect(seats()[0]).toBeCloseTo(flat[0], 2);
  });

  test('every beat is within reach of the piece, everywhere in its round', () => {
    for (const m of RS_MOTIONS) {
      for (let u = 0; u <= 1; u += 0.01) {
        const n = rsNow(m as RsMotion, u, 1.6, u * RS_SECONDS[m as RsMotion]);
        for (const v of [n.l, n.r, n.st]) for (const x of v) expect(Number.isFinite(x), m).toBe(true);
        expect(n.crouch, m).toBeGreaterThanOrEqual(0);
        expect(n.crouch, m).toBeLessThanOrEqual(1);
        // Arms stay near the shoulders: no more than a metre-ish from the body, once crouching and the lean are allowed for.
        const shoulderY = 1.3 - n.crouch * 0.37;
        for (const h of [n.l, n.r]) expect(Math.hypot(h[0] - n.st[0], h[1] - shoulderY, h[2] - n.st[1]), `${m} at ${u.toFixed(2)}`).toBeLessThan(0.95);
      }
    }
  });

  test('a baby comes back to the mattress at the end of each round, and the fire follows the hands', () => {
    for (const m of ['rsFeed', 'rsChange', 'rsCuddle'] as RsMotion[]) {
      expect(rsNow(m, 0, 1.6, 0).baby!.p[1]).toBeCloseTo(CR.bed, 3);
      expect(rsNow(m, 0.999, 1.6, 0).baby!.p[1]).toBeCloseTo(CR.bed, 2);
      expect(rsNow(m, 0.5, 1.6, 0).baby!.p[1]).toBeGreaterThan(CR.bed + 0.2);
    }
    expect(rsNow('rsLight', 0, 1.6, 0).flame).toBe(0);
    expect(rsNow('rsLight', 1, 1.6, 0).flame).toBe(1);
    expect(rsNow('rsDouse', 0, 1.6, 0).flame).toBe(1);
    expect(rsNow('rsDouse', 1, 1.6, 0).flame).toBeLessThan(0.1);
  });

  test('in the arms the teat is at the baby\'s mouth, and the bottle keeps off its eyes', () => {
    for (const H of [1.45, 1.6, 1.75]) {
      const b = build('bassinet');
      const s = b.spots!.feedBaby;
      s.at.userData.height = H;
      const bottle = b.root.getObjectByName('bottle')!;
      let seen = 0;
      const T0 = 100 + H;
      for (let t = T0; t < T0 + RS_SECONDS.rsFeed * 0.75; t += 0.05) {
        rsPose('rsFeed', s, H, t);
        b.away!(false, t);
        const u = (t - T0) / RS_SECONDS.rsFeed;
        if (u < 0.3) continue;
        seen++;
        b.root.updateMatrixWorld(true);
        const tip = bottle.localToWorld(new THREE.Vector3(0, TEAT, 0));
        const mouth = b.babyAt!.localToWorld(new THREE.Vector3(...BABY_MOUTH));
        expect(tip.distanceTo(mouth), `H ${H} u ${u.toFixed(2)}`).toBeLessThan(0.005);
        expect(b.babyAt!.userData.feeding).toBe(true);
        // The bottle's whole length, teat to base, stays off each eye.
        const line = new THREE.Line3(tip, bottle.localToWorld(new THREE.Vector3(0, -0.055, 0)));
        for (const e of BABY_EYES) {
          const eye = b.babyAt!.localToWorld(new THREE.Vector3(...e));
          expect(line.closestPointToPoint(eye, true, new THREE.Vector3()).distanceTo(eye), `H ${H}`).toBeGreaterThan(0.05);
        }
        // And the hand on it is in reach of the right shoulder.
        const n = rsNow('rsFeed', u, H, t);
        const k = H / 1.6;
        expect(Math.hypot(n.r[0] - (n.st[0] + 0.17 * k), n.r[1] - 1.3 * k, n.r[2] - (n.st[1] - 0.03)), `H ${H}`).toBeLessThan(0.52 * k);
      }
      expect(seen).toBeGreaterThan(20);
    }
  });

  test('a bassinet hands the baby back, and its fire and its spots run with nobody there', () => {
    const b = build('bassinet');
    expect(Object.keys(b.spots!).sort()).toEqual(['changeBaby', 'cuddleBaby', 'feedBaby']);
    b.away!(false, 1);
    b.animate!(1);
    expect(b.babyAt!.position.y).toBeCloseTo(CR.bed);
    const f = build('fireplace');
    expect(Object.keys(f.spots!).sort()).toEqual(['lightFire', 'putOutFire']);
    for (let t = 0; t < 40; t += 0.37) {
      f.away!(false, t);
      f.animate!(t);
    }
  });
});
