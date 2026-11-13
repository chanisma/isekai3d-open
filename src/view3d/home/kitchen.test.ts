import * as THREE from 'three';
import { describe, expect, test } from 'vitest';
import { getDef } from '../../game/catalog';
import { SEAT_Y, buildFurniture, kindOf } from '../furniture3d';
import { spotPose } from '../activity';
import { HC, KT_MOTIONS, KT_SECONDS, ktNow, type KtMotion } from './kitchenMotion';

const IDS = ['fridge', 'deluxeFridge', 'stove', 'deluxeStove', 'coffeeMaker', 'bar', 'kitchenSink', 'diningTable', 'grill', 'highChair'];
/** Each piece's own uses (the game adds repairing, admiring and so on, which go the family's way). */
const FRIDGE = ['snack', 'quickMeal', 'bakeCake'];
const RANGE = ['cook', 'cookFamily', 'cookGourmet'];
const OWN: Record<string, string[]> = { fridge: FRIDGE, deluxeFridge: FRIDGE, stove: RANGE, deluxeStove: RANGE, coffeeMaker: ['drinkCoffee', 'pantrySnack'], bar: ['mixDrink', 'mixCocktail'], kitchenSink: ['washDishes', 'wash'], grill: ['grill', 'grillFamily'], highChair: ['serveHighChair'] };
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

describe('the kitchen', () => {
  test('every piece stays near its footprint, keeps its triangles moderate, and every interaction has somewhere to go', () => {
    for (const id of IDS) {
      const def = getDef(id);
      const b = build(id);
      const box = new THREE.Box3();
      for (const c of b.root.children) if (c !== b.inUse) box.expandByObject(c);
      expect(box.min.x, id).toBeGreaterThan(-def.w / 2 - 0.1);
      expect(box.max.x, id).toBeLessThan(def.w / 2 + 0.1);
      expect(box.min.z, id).toBeGreaterThan(-def.h / 2 - 0.12);
      expect(box.max.z, id).toBeLessThan(def.h / 2 + 0.14);
      expect(tris(b.root), id).toBeLessThan(16000);
      for (const key of OWN[id] ?? []) {
        expect(def.interactions.some((i) => i.id === key), `${id} has ${key}`).toBe(true);
        expect(b.spots?.[key], `${id} ${key}`).toBeDefined();
      }
      // A repair or a clean goes the family's way.
      expect(b.spots?.['*'], id).toBeUndefined();
      expect(b.work, id).toBeDefined();
    }
  });

  test('deluxe is another thing altogether, and doors still swing as lot3d.ts expects', () => {
    expect(build('fridge').doors).toHaveLength(1);
    expect(build('deluxeFridge').doors!.map((d) => d.userData.swing)).toEqual([-1, 1]);
    expect(tris(build('deluxeStove').root)).toBeGreaterThan(tris(build('stove').root));
    expect(tris(build('deluxeFridge').root)).toBeGreaterThan(tris(build('fridge').root));
    const box = (id: string) => new THREE.Box3().setFromObject(build(id).root);
    expect(box('deluxeStove').max.y).toBeGreaterThan(box('stove').max.y + 0.4);
    for (const id of ['stove', 'deluxeStove', 'grill', 'coffeeMaker', 'kitchenSink']) expect(build(id).inUse, id).toBeDefined();
  });

  test('what lot3d.ts puts on these lies on them, and the table seats a chair pulled in', () => {
    expect(kindOf(getDef('diningTable'))).toBe('table');
    expect(SEAT_Y.highChair).toBe(HC.seat);
    const t = build('diningTable');
    const b = new THREE.Box3();
    for (const c of t.root.children) b.expandByObject(c);
    // Room for the eater's 0.12 plate, 0.47 out from the middle.
    expect(b.max.z).toBeGreaterThanOrEqual(0.47 + 0.11);
    // A level the plates (their foot at 0.78) stand on.
    const planks: number[] = [];
    t.root.traverse((c) => {
      const m = c as THREE.Mesh;
      if (m.isMesh && !m.userData.ink && m.position.y > 0.74 && m.position.y < 0.78 && Math.abs(m.position.x) < 0.01) planks.push(m.position.y + 0.0175);
    });
    expect(planks.length).toBeGreaterThan(2);
    for (const y of planks) expect(y).toBeCloseTo(0.78, 3);
  });

  test('every beat is within reach, everywhere in its round, for a tall dweller and a short one', () => {
    for (const m of KT_MOTIONS) {
      for (const H of [1.45, 1.75]) {
        const s = H / 1.6;
        for (let u = 0; u < 1; u += 0.005) {
          const n = ktNow(m as KtMotion, u, H, u * KT_SECONDS[m as KtMotion]);
          for (const v of [n.l, n.r, n.st, n.tool ?? [0, 0, 0], n.head ?? [0, 0, 0], n.sub ?? [0, 0, 0]]) for (const x of v) expect(Number.isFinite(x), `${m} ${u}`).toBe(true);
          expect(n.crouch).toBeGreaterThanOrEqual(0);
          expect(n.crouch).toBeLessThanOrEqual(1);
          const shoulderY = 1.3 * s - n.crouch * 0.37;
          const lean = 0.45 * n.lean;
          const dist = (p: number[]) => Math.hypot(p[0] - n.st[0], p[1] - shoulderY, p[2] - (n.st[1] - lean));
          if (!n.hold) for (const h of [n.l, n.r]) expect(dist(h), `${m} ${H} free at ${u.toFixed(3)}`).toBeLessThan(0.9);
          else if (n.tool) expect(dist(n.tool), `${m} ${H} tool at ${u.toFixed(3)}`).toBeLessThan(0.9);
        }
      }
    }
  });

  test('every piece runs through its uses without throwing, tools named and in the hand when the beat says', () => {
    for (const id of IDS) {
      const b = build(id);
      for (const [key, s] of Object.entries(b.spots ?? {})) {
        expect(s.motion, key).toBeDefined();
        let t = 100;
        const names = new Set<string>();
        for (let i = 0; i < 400; i++) {
          t += KT_SECONDS[s.motion as KtMotion] / 200;
          b.away?.(false, t);
          b.animate?.(t);
          const p = spotPose(s, 'stir', 1.6, t, 3);
          expect(Number.isFinite((p.pose as { at: THREE.Vector3 }).at.x), key).toBe(true);
          if (s.held) {
            expect(s.held.tool.name, key).not.toBe('');
            names.add(s.held.tool.name);
            for (const g of Object.values(s.held.grips)) if (g) expect(g.axis.length(), key).toBeCloseTo(1, 3);
          }
        }
        // Nobody left: it all settles and nothing is left in a hand.
        t += 10;
        b.away?.(false, t);
        b.animate?.(t);
        expect(s.held ?? null, key).toBeNull();
        if (key !== 'wash') expect(names.size, `${id} ${key}`).toBeGreaterThan(0);
      }
    }
  });

  test('the shaker stays well within both arms while it is shaken and poured', () => {
    for (const H of [1.45, 1.6, 1.75]) {
      const s = H / 1.6;
      // Elbow to shoulder and wrist to elbow, about 0.44 m at 1.6 m, plus the palm's 0.08 beyond the wrist.
      const reach = (0.44 + 0.08) * s;
      for (let u = 0.34; u < 0.94; u += 0.002) {
        const n = ktNow('ktMix', u, H, u * KT_SECONDS.ktMix);
        expect(n.hold).toBe('shaker');
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...n.rot!));
        const end = (y: number) => new THREE.Vector3(0, y, 0).applyQuaternion(q).add(new THREE.Vector3(...n.tool!));
        const shoulder = (x: number) => new THREE.Vector3(n.st[0] + x * 0.17 * s, 1.3 * s, n.st[1] - 0.45 * n.lean);
        // Dweller's right is +x here (they face -z): the left hand by the cap, the right under the cup, never crossed.
        expect(end(-0.05).distanceTo(shoulder(1)), `right ${H} ${u}`).toBeLessThan(reach);
        expect(end(-0.05).x, `crossed ${H} ${u}`).toBeGreaterThan(end(0.05).x - 0.001);
        expect(end(0.05).distanceTo(shoulder(-1)), `left ${H} ${u}`).toBeLessThan(reach);
      }
    }
  });

  test('flames, the oven door and the drip follow the hands', () => {
    expect(ktNow('ktSaute', 0.5, 1.6, 7).v.flame).toBe(1);
    expect(ktNow('ktSaute', 0.999, 1.6, 7).v.flame).toBe(0);
    expect(ktNow('ktSaute', 0.5, 1.6, 7).hold).toBe('pan');
    expect(ktNow('ktStew', 0.3, 1.6, 7).hold).toBe('ladle');
    expect(ktNow('ktGourmet', 0.57, 1.6, 7).v.door).toBeGreaterThan(0.9);
    expect(ktNow('ktCoffee', 0.3, 1.6, 2).v.drip).toBe(1);
    expect(ktNow('ktMix', 0.5, 1.6, 2).hold).toBe('shaker');
    expect(ktNow('ktCocktail', 0.45, 1.6, 2).hold).toBe('barSpoon');
    expect(ktNow('ktDishes', 0.4, 1.6, 2).hold).toBe('plate');
  });
});
