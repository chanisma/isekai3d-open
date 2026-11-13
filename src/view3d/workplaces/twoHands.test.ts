import { describe, expect, test } from 'vitest';
import * as THREE from 'three';
import { POLE, pole, wlNow, type WlMotion } from './wallpapererMotion';
import { geNow, type GeMotion } from './greenEnergyMotion';
import { SB, snNow, type SnMotion } from './sanitationWorkerMotion';
import { gbNow, gbSeconds, TB } from '../home/studyMotion';
import { skirtInWater, type SpringJoint } from '../avatar';
import { HANA, JUNHO, workAt } from './realBody.testkit';

/*
 * Within an arm of the shoulder, in the proportions of a real VRoid body (read from the shipped .vrm files, 2026-11-02): shoulders at
 * 0.81 of the height and only 0.07-0.08 of it either side, an arm 0.27 of it to the wrist and about 0.04 more to the palm. A plain check
 * of the scripts; what really decides it is the real arm below (`on the real body`), which reads what the lab probe reads.
 */
const REACH = 0.31 * 1.6;
type Vec = readonly [number, number, number];
function shoulder(st: { x: number; z: number; yaw: number }, side: 1 | -1, lean: number, crouch: number, H: number): THREE.Vector3 {
  const k = H / 1.6;
  // +1 is their left. A crouch takes half the legs (0.49 of the height) off the hips; a lean swings the 0.37 of the body above the waist.
  const left = new THREE.Vector3(Math.cos(st.yaw), 0, -Math.sin(st.yaw));
  const fwd = new THREE.Vector3(Math.sin(st.yaw), 0, Math.cos(st.yaw));
  return new THREE.Vector3(st.x, 0.81 * H - crouch * 0.245 * H - 0.37 * k * (1 - Math.cos(lean)), st.z).addScaledVector(left, side * 0.08 * H).addScaledVector(fwd, 0.37 * k * Math.sin(lean));
}
const V = (p: Vec) => new THREE.Vector3(p[0], p[1], p[2]);
/** The farther hand's place on a handle running through `lead` along `dir`: as near as the hand can come (`slide`), at most to a hand's breadth from the lead's. */
const slid = (lead: THREE.Vector3, dir: THREE.Vector3, gap: number, from: THREE.Vector3) => {
  let best = Infinity;
  for (let k = 0; k <= 1; k += 0.05) best = Math.min(best, lead.clone().addScaledVector(dir, 0.1 + (gap - 0.1) * k).distanceTo(from));
  return best;
};

describe('two hands on a tool: in reach, and the moves at a walk', () => {
  test('the paint roller: the rear hand stands by the body, the other up the pole', () => {
    const m: WlMotion = 'wlRoll';
    for (const H of [1.5, 1.6, 1.75]) {
      for (let t = 0; t < 40; t += 0.03) {
        const n = wlNow(m, t, 0, H);
        if (n.tool !== 'rollerWall' || n.b.e > 0) continue;
        const grip = V(n.props.roller!);
        const dir = V(n.props.rollerDir!);
        const lean = n.key.lean ?? 0;
        const crouch = n.key.crouch ?? 0;
        expect(grip.distanceTo(shoulder(n.st, -1, lean, crouch, H)), `right ${H} ${t.toFixed(2)}`).toBeLessThan(REACH * Math.max(1, H / 1.6));
        expect(slid(grip, dir, 0.3, shoulder(n.st, 1, lean, crouch, H)), `left ${H} ${t.toFixed(2)}`).toBeLessThan(REACH * Math.max(1, H / 1.6) + 0.01);
        // The left hand's on the pole ahead of the right, not behind the body.
        const ahead = grip.clone().addScaledVector(dir, 0.3);
        expect(ahead.z, `behind ${t.toFixed(2)}`).toBeLessThan(n.st.z);
      }
    }
    expect(POLE).toBeGreaterThan(0.3);
    expect(pole([0, 1, 0], [0, 1, 1]).grip[2]).toBeCloseTo(POLE);
  });

  test('the wash pole, every pass', () => {
    const m: GeMotion = 'geWash';
    for (let t = 0; t < 40; t += 0.03) {
      const n = geNow(m, t, 0, 1.6);
      if (n.tool !== 'pole' || !n.props.pole || !n.props.head) continue;
      const hand = V(n.props.pole);
      const dir = V(n.props.head).sub(hand).normalize();
      const lean = n.key.lean ?? 0;
      expect(hand.distanceTo(shoulder(n.st, -1, lean, 0, 1.6)), `right ${t.toFixed(2)}`).toBeLessThan(REACH);
      expect(slid(hand, dir, 0.34, shoulder(n.st, 1, lean, 0, 1.6)), `left ${t.toFixed(2)}`).toBeLessThan(REACH);
    }
  });

  test('the shovel: a hand over the middle of the body, the other up its short handle', () => {
    const m: SnMotion = 'snSand';
    expect(SB.stance[1]).toBeLessThan(0.97);
    for (const H of [1.5, 1.6, 1.75]) {
      for (let t = 0; t < 30; t += 0.03) {
        const n = snNow(m, t, 0, H);
        if (n.tool !== 'shovelFree' || !n.props.shovel) continue;
        const f = (n.n.hu ?? 0.7) * H;
        const a = n.n.ha ?? 0.26;
        const hs = n.n.hs ?? 0.03;
        const s = n.st;
        const hand = new THREE.Vector3(s.x + Math.sin(s.yaw) * a - Math.cos(s.yaw) * hs, f, s.z + Math.cos(s.yaw) * a + Math.sin(s.yaw) * hs);
        const dir = V(n.props.shovel).sub(hand).normalize();
        const lean = 0.26;
        const crouch = n.key.crouch ?? 0;
        expect(hand.distanceTo(shoulder(s, -1, lean, crouch, H)), `right ${H} ${t.toFixed(2)}`).toBeLessThan(REACH);
        expect(slid(hand, dir, 0.26 * (H / 1.6), shoulder(s, 1, lean, crouch, H)), `left ${H} ${t.toFixed(2)}`).toBeLessThan(REACH);
      }
    }
  });

  test('the long dustpan at its scoop: the hand on it within the right arm, the head on the floor', () => {
    const m: SnMotion = 'snSweep';
    let seen = 0;
    for (let t = 0; t < 30; t += 0.03) {
      const n = snNow(m, t, 0, 1.6);
      if (n.tool !== 'pan') continue;
      seen++;
      const f = (n.n.hu ?? 0.7) * 1.6;
      const a = n.n.ha ?? 0.26;
      const s = n.st;
      const hand = new THREE.Vector3(s.x + Math.sin(s.yaw) * a - Math.cos(s.yaw) * 0.03, f, s.z + Math.cos(s.yaw) * a + Math.sin(s.yaw) * 0.03);
      expect(hand.distanceTo(shoulder(s, -1, 0.2, n.key.crouch ?? 0, 1.6)), `${t.toFixed(2)}`).toBeLessThan(REACH);
    }
    expect(seen).toBeGreaterThan(10);
  });

  test('no script here walks faster than a walk, or turns faster than the body can', () => {
    const scripts: Array<[string, (t: number) => { x: number; z: number; yaw: number }, number, number]> = [
      ['snSweep', (t) => snNow('snSweep', t, 0).st, 0, 24],
      ['snSand', (t) => snNow('snSand', t, 0).st, 0, 15],
      ['wlRoll', (t) => wlNow('wlRoll', t, 0).st, 0, 16],
      // Round the wash's tick it's put back at the start of the row: a jump on purpose.
      ['geWash', (t) => geNow('geWash', t, 0).st, 0, 24],
    ];
    for (const [name, at, t0, t1] of scripts) {
      let last = at(t0);
      for (let t = t0 + 0.02; t < t1; t += 0.02) {
        const s = at(t);
        const v = Math.hypot(s.x - last.x, s.z - last.z) / 0.02;
        if (v < 20) expect(v, `${name} at ${t.toFixed(2)}`).toBeLessThan(2);
        const turn = Math.abs(Math.atan2(Math.sin(s.yaw - last.yaw), Math.cos(s.yaw - last.yaw))) / 0.02;
        expect(turn, `${name} turning at ${t.toFixed(2)}`).toBeLessThan(9);
        last = s;
      }
    }
  });

  test('the file, looked at in both hands, is within both arms', () => {
    const total = gbSeconds('gbFile');
    for (const H of [1.5, 1.6, 1.75]) {
      for (let time = 0; time < total; time += 0.05) {
        const n = gbNow('gbFile', time, H, time);
        if (n.beat !== 'inspect' || !n.tool) continue;
        const k = H / 1.6;
        const at = V(n.tool.at);
        const y = V(n.tool.y).normalize();
        const leftGrip = at.clone().addScaledVector(y, -0.12);
        const st = { x: n.st[0], z: n.st[1], yaw: Math.PI };
        expect(at.distanceTo(shoulder(st, -1, n.lean, n.crouch, H)), `right ${H}`).toBeLessThan(REACH * k);
        expect(leftGrip.distanceTo(shoulder(st, 1, n.lean, n.crouch, H)), `left ${H}`).toBeLessThan(REACH * k);
      }
    }
    expect(TB.st).toBeGreaterThan(0);
  });
});

describe('on the real body: the real arms and the real pieces, as the lab probe measures them', () => {
  const WORK: Array<[string, string, string, number]> = [
    ['sandShovel', 'snSandBox', 'snShovelSand', 32],
    ['streetBroom', 'snStreetCart', 'snSweepStreet', 50],
    ['longDustpan', 'snStreetCart', 'snSweepStreet', 50],
    ['wlRoller', 'wlPaintWall', 'wlRoll', 45],
    ['gePole', 'geSolarRow', 'geWash', 40],
  ];
  for (const sk of [HANA, JUNHO]) {
    for (const [tool, def, key, secs] of WORK) {
      test(`${tool} stays in both of ${sk.name}'s hands`, () => {
        const p = workAt(def, key, sk, secs).probe[tool];
        expect(p.frames, 'it was held').toBeGreaterThan(100);
        expect(p.left, 'left').toBeLessThan(0.03);
        expect(p.right, 'right').toBeLessThan(0.03);
      });
    }
  }
});

describe('a skirt in the water', () => {
  const joint = (name: string): SpringJoint => ({ bone: { name }, settings: { dragForce: 0.6, gravityPower: 0.12, stiffness: 1 } });
  test('hangs heavy while swimming and goes back as it was; nothing else changes', () => {
    const skirt = joint('J_Sec_L_SkirtBack_01');
    const hair = joint('J_Sec_Hair1_01');
    skirtInWater([skirt, hair], true);
    expect(skirt.settings.gravityPower).toBeGreaterThan(skirt.settings.stiffness * 5);
    expect(hair.settings.gravityPower).toBe(0.12);
    // Twice in a row doesn't forget how it was.
    skirtInWater([skirt, hair], true);
    skirtInWater([skirt, hair], false);
    expect(skirt.settings).toEqual({ dragForce: 0.6, gravityPower: 0.12, stiffness: 1 });
  });
});
