import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { BodyAt, Doing } from '../activity';
import type { Spot } from '../parts';

/*
 * The bathroom at home (2026-11-01, at the user's request). Kept modest whatever happens: the hands stay on the head,
 * the neck, the shoulders and the arms, and the curtain, the steam, the water and the foam (bath.ts) do the covering.
 *
 * Stood at a spot, in the piece's own frame (facing it, the dweller's right hand on +x), timed from when they began:
 * - btWash (세면대, 손 씻기): the lever lifted, the hands rubbed under the water, the lever down, a look in the mirror.
 *
 * On the piece (Built.seatMotion, by interaction), the body where lot3d.ts has always put it:
 * - btToilet: hands on the knees, now and then the right one to the roll, drawing some off.
 * - btPotty: a toddler's hands on the knees, a little sway and a look about: no more than it was.
 * - btShower: the hair lathered, rinsed with the head back, the shoulders and arms rubbed.
 * - btShowerHot: slow: the hair pushed back, then just standing in it with the arms loose.
 * - btShowerThink: head bowed, a hand at the back of the neck, hardly moving.
 * - btShowerBrisk: the same work at twice the pace, a bounce in it.
 * - btShowerCold: arms hugged round, hands on the upper arms, shivering.
 * - btBath: laid back with the arms along the rim, now and then a hand trailed through the water.
 * - btBubbles: foam scooped up in both hands and blown off, then a pat at the heap.
 */
export type BtMotion = 'btWash';
export type BtSeat = 'btToilet' | 'btPotty' | 'btShower' | 'btShowerHot' | 'btShowerThink' | 'btShowerBrisk' | 'btShowerCold' | 'btBath' | 'btBubbles';
export const BT_MOTIONS = new Set<string>(['btWash']);
export const BT_SEATS = new Set<string>(['btToilet', 'btPotty', 'btShower', 'btShowerHot', 'btShowerThink', 'btShowerBrisk', 'btShowerCold', 'btBath', 'btBubbles']);

export type V = [number, number, number];
const sm = (u: number, a: number, b: number) => {
  const k = Math.min(1, Math.max(0, (u - a) / (b - a)));
  return k * k * (3 - 2 * k);
};
const mix = (a: V, b: V, e: number): V => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];

/** The basin's places (bath.ts builds it to these): the lever on the tap, under the spout, where the dweller stands. */
export const SK = { lever: [0, 1.05, -0.27] as V, under: [0, 0.96, -0.08] as V, st: 0.42 };
/** The toilet's: the seat's top and the roll on its stand (on the sitter's right, -x). */
export const WC = { seat: 0.45, seatZ: -0.02, roll: [-0.34, 0.66, 0.02] as V };
/** The bath's, from lot3d.ts's place for a bather (the seat 0.2 up, 0.42 from the head end): the rim's top and how far out it is. */
export const TB = { seatY: 0.2, rim: 0.56, rimX: 0.41, full: 0.47, empty: 0.09 };

/** A wash is short: 4 game minutes, 2 seconds at normal speed. */
export const BT_SECONDS: Record<BtMotion, number> = { btWash: 2.1 };

/** How far on a use is: told each frame by its pose, it knows when it began. */
export function btPhase(m: BtMotion, spot: Spot, t: number): number {
  const ud = spot.at.userData;
  if (t - ((ud.btLast as number | undefined) ?? -1e9) > 0.6) ud.btBegan = t;
  ud.btLast = t;
  return (((t - (ud.btBegan as number)) / BT_SECONDS[m]) % 1 + 1) % 1;
}
/** Whether the spot is being used now, and how far on (for the piece, which runs before the pose). */
export function btLive(m: BtMotion, spot: Spot, t: number): number | null {
  const ud = spot.at.userData;
  const last = ud.btLast as number | undefined;
  if (last === undefined || Math.abs(t - last) > 0.6) return null;
  return (((t - (ud.btBegan as number)) / BT_SECONDS[m]) % 1 + 1) % 1;
}

export interface BtNow {
  st: [number, number];
  lean: number;
  nod: number;
  palms: number;
  l: V;
  r: V;
  /** How far the lever's lifted (0–1) and whether the water's running. */
  lever: number;
  water: boolean;
}

/** Where everything is at `u` of a wash, for someone `H` tall at time `t`. */
export function btNow(_m: BtMotion, u: number, H: number, t: number): BtNow {
  const s = H / 1.6;
  const restL: V = [-0.14, 0.92 * s, SK.st - 0.06];
  const restR: V = [0.14, 0.92 * s, SK.st - 0.06];
  const rub = Math.sin(t * 15);
  const underL: V = [SK.under[0] - 0.035 + 0.02 * rub, SK.under[1], SK.under[2] + 0.015 * Math.cos(t * 15)];
  const underR: V = [SK.under[0] + 0.035 - 0.02 * rub, SK.under[1] + 0.012, SK.under[2] - 0.015 * Math.cos(t * 15)];
  const toLever = sm(u, 0, 0.1) * (1 - sm(u, 0.14, 0.22)) + sm(u, 0.7, 0.76) * (1 - sm(u, 0.82, 0.88));
  const under = sm(u, 0.14, 0.24) * (1 - sm(u, 0.68, 0.76));
  const leverAt: V = [SK.lever[0] + 0.015, SK.lever[1] + 0.02, SK.lever[2]];
  const r = mix(mix(restR, underR, under), leverAt, toLever);
  const l = mix(restL, underL, under);
  const look = sm(u, 0.84, 0.92);
  return {
    st: [0, SK.st],
    lean: 0.3 - 0.2 * look,
    nod: 0.34 - 0.46 * look,
    palms: 0.9,
    l,
    r,
    lever: sm(u, 0.08, 0.14) * (1 - sm(u, 0.74, 0.8)),
    water: u > 0.12 && u < 0.78,
  };
}

export function btPose(m: BtMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const n = btNow(m, btPhase(m, spot, t), height, t);
  const W = (v: V) => par.localToWorld(new THREE.Vector3(v[0], v[1], v[2]));
  const at = W([n.st[0], 0, n.st[1]]);
  const dir = new THREE.Vector3(0, 0, -1).transformDirection(par.matrixWorld);
  return {
    pose: { kind: 'stand', at, yaw: Math.atan2(dir.x, dir.z) },
    doing: { reach: { l: W(n.l), r: W(n.r), lean: n.lean, nod: n.nod, palms: n.palms, grip: { l: 0.3, r: 0.3 } } },
  };
}

/** The toilet's round, by the clock alone, so the roll and the hand keep together: how far the hand's over at the roll, and how much paper it's drawn off (0–1). */
export const TOILET_ROUND = 9;
export function btToiletBeat(t: number) {
  const u = (((t % TOILET_ROUND) + TOILET_ROUND) % TOILET_ROUND) / TOILET_ROUND;
  return { reach: sm(u, 0.55, 0.62) * (1 - sm(u, 0.82, 0.88)), drawn: sm(u, 0.62, 0.8) * (1 - sm(u, 0.82, 0.85)) };
}

/** On the piece: `b.base` is the seat's top sitting (the toilet, the potty, the bath), the feet standing (the shower), facing `b.yaw`. */
export function btDoing(m: BtSeat, b: BodyAt, t: number, seed: number): Doing {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  const H = b.height;
  const s = H / 1.6;
  /** Ahead and to their left, up from `b.base`, as given. */
  const abs = (ahead: number, side: number, up: number) => b.base.clone().addScaledVector(fwd, ahead).addScaledVector(left, side).setY(b.base.y + up);
  /** The same, scaled for how big they are. */
  const at = (ahead: number, side: number, up: number) => abs(ahead * s, side * s, up * s);
  /** Standing: up by a part of their height. */
  const onBody = (ahead: number, side: number, f: number) => abs(ahead * s, side * s, f * H);
  const beat = (period: number) => (((t + seed * 3.7) % period) + period) % period / period;
  const grip = { l: 0.3, r: 0.3 };

  /** The hair lathered in small rounds. */
  const lather = (hz: number) => {
    const a = t * hz * Math.PI * 2;
    return { l: onBody(0.03, 0.09 + 0.03 * Math.sin(a), 0.93 + 0.018 * Math.sin(a * 2)), r: onBody(0.03, -0.09 + 0.03 * Math.sin(a + 2), 0.93 + 0.018 * Math.sin(a * 2 + 2)) };
  };
  /** The hair drawn back from the brow to the nape. */
  const backHair = (k: number) => ({ l: onBody(0.05 - 0.13 * k, 0.09, 0.95 - 0.1 * k), r: onBody(0.05 - 0.13 * k, -0.09, 0.95 - 0.1 * k) });
  /** Each hand over on the other shoulder and along the arm, in turns. */
  const rubArms = (hz: number) => {
    const a = Math.sin(t * hz * Math.PI * 2);
    return { l: onBody(0.1, -0.15 - 0.03 * a, 0.78 + 0.03 * a), r: onBody(0.12, 0.2 + 0.03 * a, 0.68 - 0.04 * a) };
  };
  const pick = (a: { l: THREE.Vector3; r: THREE.Vector3 }, c: { l: THREE.Vector3; r: THREE.Vector3 }, k: number) => ({ l: a.l.clone().lerp(c.l, k), r: a.r.clone().lerp(c.r, k) });
  const loose = { l: onBody(0.1, 0.2, 0.55), r: onBody(0.1, -0.2, 0.55) };

  switch (m) {
    case 'btToilet': {
      const { reach } = btToiletBeat(t);
      const knee = (side: number) => at(0.34, side, 0.13);
      // The roll's own place: it doesn't get nearer for a bigger dweller.
      const roll = abs(WC.roll[2] - WC.seatZ, WC.roll[0], WC.roll[1] - WC.seat);
      return { reach: { l: knee(0.11), r: knee(-0.11).lerp(roll, reach), nod: 0.1 + 0.08 * reach, lean: 0.06, palms: 1.4 * (1 - reach), grip: { l: 0.25, r: 0.25 + 0.5 * reach } } };
    }
    case 'btPotty': {
      const sway = 0.012 * Math.sin(t * 1.7 + seed);
      return { reach: { l: at(0.34, 0.12 + sway, 0.13), r: at(0.34, -0.12 + sway, 0.13), nod: 0.08 * Math.sin(t * 0.9 + seed), palms: 1.4, grip: { l: 0.25, r: 0.25 } } };
    }
    case 'btShower': {
      const u = beat(12);
      const rinse = sm(u, 0.4, 0.46) * (1 - sm(u, 0.7, 0.76));
      const arms = sm(u, 0.7, 0.76) * (1 - sm(u, 0.94, 1));
      let h = pick(lather(1.6), backHair(0.5 + 0.5 * Math.sin(t * 2.2)), rinse);
      h = pick(h, rubArms(1.1), arms);
      return { reach: { ...h, nod: -0.12 - 0.22 * rinse + 0.2 * arms, grip } };
    }
    case 'btShowerHot': {
      const u = beat(14);
      const push = sm(u, 0, 0.08) * (1 - sm(u, 0.34, 0.42));
      const h = pick(loose, backHair(0.5 + 0.5 * Math.sin(t * 1.1)), push);
      return { reach: { ...h, nod: -0.28 + 0.03 * Math.sin(t * 0.7), lean: -0.03, grip: { l: 0.15, r: 0.15 } } };
    }
    case 'btShowerThink': {
      const rub = 0.012 * Math.sin(t * 0.8 + seed);
      return { reach: { l: onBody(0.12, 0.2, 0.52), r: onBody(-0.09, -0.05 + rub, 0.84), nod: 0.34 + 0.02 * Math.sin(t * 0.4), lean: 0.05, grip: { l: 0.15, r: 0.3 } } };
    }
    case 'btShowerBrisk': {
      const u = beat(6);
      const arms = sm(u, 0.42, 0.48) * (1 - sm(u, 0.92, 1));
      const h = pick(lather(3.2), rubArms(2.6), arms);
      return { reach: { ...h, nod: -0.05 + 0.08 * Math.sin(t * 6), grip } };
    }
    case 'btShowerCold': {
      const shiver = 0.006 * Math.sin(t * 38 + seed);
      return { reach: { l: onBody(0.16, -0.14 + shiver, 0.72 + shiver), r: onBody(0.18, 0.14 - shiver, 0.7 - shiver), nod: 0.2, lean: 0.06, grip: { l: 0.55, r: 0.55 } } };
    }
    case 'btBath': {
      const u = beat(13);
      const trail = sm(u, 0.7, 0.76) * (1 - sm(u, 0.92, 0.98));
      const up = TB.rim - TB.seatY + 0.015;
      const onRim = (side: number) => abs(0.16, side * TB.rimX, up);
      const a = t * 1.4;
      const water = abs(0.34 + 0.08 * Math.sin(a), -0.2 + 0.05 * Math.cos(a), TB.full - TB.seatY + 0.01);
      return { reach: { l: onRim(1), r: onRim(-1).lerp(water, trail), lean: -0.16, nod: -0.1 + 0.2 * trail, palms: 1.1, grip: { l: 0.2, r: 0.2 } } };
    }
    case 'btBubbles': {
      const u = beat(8);
      const scoop = sm(u, 0.02, 0.1) * (1 - sm(u, 0.2, 0.3));
      const blow = sm(u, 0.2, 0.3) * (1 - sm(u, 0.46, 0.54));
      const pat = 1 - scoop - blow;
      const y = TB.full - TB.seatY;
      const h = (side: number) => {
        const low = abs(0.3, side * 0.1, y + 0.05);
        const up = abs(0.2, side * 0.05, 0.42 * s);
        const heap = abs(0.3, side * 0.19, y + 0.13 + 0.03 * Math.sin(t * 5 + side * 1.5));
        return new THREE.Vector3().addScaledVector(low, scoop).addScaledVector(up, blow).addScaledVector(heap, pat);
      };
      return { reach: { l: h(1), r: h(-1), lean: -0.06 + 0.1 * blow, nod: 0.1 * scoop + 0.05 * blow, palms: 1.2 - 0.6 * blow, grip: { l: 0.2, r: 0.2 } } };
    }
  }
}
