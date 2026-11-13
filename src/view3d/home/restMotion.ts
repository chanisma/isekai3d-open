import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { BodyAt, Doing } from '../activity';
import type { Spot } from '../parts';
import { BABY_MOUTH, BABY_MOUTH_OUT } from '../babyModel';

/*
 * The bedroom and the living room at home (2026-11-01, at the user's request).
 *
 * Stood at a spot, in the piece's own frame (x across as you face its front, y up, z out of its front; facing the
 * piece the dweller's right hand is on +x), each timed from when they began, so it starts at its start:
 * - rsLight (벽난로, 불 피우기): the long lighter off the mantel, down on the haunches, the screen swung aside, the
 *   tip held to the kindling until it takes, the lighter put back, the screen left open.
 * - rsDouse (벽난로, 불 끄기): the screen opened, the poker from its stand, the logs spread as the flames sink, the
 *   poker hung up, the screen shut on the smoke.
 * - rsFeed (아기 요람, 분유): the baby lifted into the crook of the left arm, the bottle from the side tray held to
 *   the mouth, put back, the baby laid down again.
 * - rsChange (아기 요람, 기저귀): the pad on the rim, the baby up onto it, a wipe, a clean nappy, a pat, back down.
 * - rsCuddle (아기 요람, 안아 주기): up against the chest, swayed, patted, a kiss, laid down.
 *
 * Sat on a seat (Built.seatMotion, by interaction):
 * - rsRelax: a hand on each thigh, now and then the arms up and behind the head for a long stretch.
 * - rsTv: sat back with the hands loose in the lap, now and then a laugh and a clap at what's on.
 *
 * The watching of a fire (warmSelf) has no spot: it's shared, so each dweller keeps the place they came to.
 */
export type RsMotion = 'rsLight' | 'rsDouse' | 'rsFeed' | 'rsChange' | 'rsCuddle';
export type RsSeat = 'rsRelax' | 'rsTv';
export const RS_MOTIONS = new Set<string>(['rsLight', 'rsDouse', 'rsFeed', 'rsChange', 'rsCuddle']);
export const RS_SEATS = new Set<string>(['rsRelax', 'rsTv']);

export type V = [number, number, number];
const sm = (u: number, a: number, b: number) => {
  const k = Math.min(1, Math.max(0, (u - a) / (b - a)));
  return k * k * (3 - 2 * k);
};
const mix = (a: V, b: V, e: number): V => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];

/** The fireplace's places (rest.ts builds it to these): 2 × 1, its firebox's mouth at FP.zf. */
export const FP = {
  zf: 0.05,
  /** Where the long lighter lies on the mantel, and where the poker's handle hangs on its stand. */
  lighter: [0.45, 1.25, 0.06] as V,
  poker: [0.83, 0.72, 0.17] as V,
  /** The screen's left edge, where a hand takes it. */
  screen: [-0.1, 0.42, 0.13] as V,
};
/** The bassinet's places: the top of its mattress, where the changing pad's top comes, the side tray. */
export const CR = {
  bed: 0.64,
  pad: 0.885,
  tray: [0.3, 0.9, 0.3] as V,
  stand: 0.62,
};

/** A round of each, seconds at normal speed (SPEEDS[1] is 2 game minutes a second): about its interaction's duration, so the baby's back down and the tool's back when it ends. */
export const RS_SECONDS: Record<RsMotion, number> = { rsLight: 3, rsDouse: 3, rsFeed: 7.4, rsChange: 3.9, rsCuddle: 9.8 };
/** Lighting and putting out happen once and hold at the end; the baby's care goes round for as long as it takes. */
const ONCE = new Set<RsMotion>(['rsLight', 'rsDouse']);

/** How far on a use is: told each frame by its pose, it knows when it began. */
export function rsPhase(m: RsMotion, spot: Spot, t: number): number {
  const ud = spot.at.userData;
  if (t - ((ud.rsLast as number | undefined) ?? -1e9) > 0.6) ud.rsBegan = t;
  ud.rsLast = t;
  const u = (t - (ud.rsBegan as number)) / RS_SECONDS[m];
  return ONCE.has(m) ? Math.min(1, u) : u % 1;
}
/** Whether the spot is being used now, and how far on (for the piece, which runs before the pose). */
export function rsLive(m: RsMotion, spot: Spot, t: number): number | null {
  const ud = spot.at.userData;
  const last = ud.rsLast as number | undefined;
  if (last === undefined || Math.abs(t - last) > 0.6) return null;
  const u = (t - (ud.rsBegan as number)) / RS_SECONDS[m];
  return ONCE.has(m) ? Math.min(1, u) : u % 1;
}

export interface RsBaby {
  p: V;
  ry: number;
  rx: number;
}
export interface RsNow {
  st: [number, number];
  crouch: number;
  lean: number;
  nod: number;
  palms: number;
  l: V;
  r: V;
  shape: 'cradle' | 'flat' | undefined;
  /** The tool in the right hand, if any, and where it is. */
  hold: 'lighter' | 'poker' | 'bottle' | 'diaper' | null;
  /** How far the bottle has tipped from upright (0–1), and which way its base lies from the teat once it has. */
  tip?: number;
  bottleWay?: V;
  /** The baby (for the three at the crib), the fire's size (0–1) and how far the screen's open (0–1), for the piece. */
  baby?: RsBaby;
  flame?: number;
  screen?: number;
  padOut?: boolean;
}

const BABY_DOWN = (): RsBaby => ({ p: [0, CR.bed, 0], ry: 0, rx: 0 });
const mixBaby = (a: RsBaby, b: RsBaby, e: number): RsBaby => ({ p: mix(a.p, b.p, e), ry: a.ry + (b.ry - a.ry) * e, rx: a.rx + (b.rx - a.rx) * e });

/** From the bottle's middle (where it's put) to the tip of its teat (rest.ts builds it to this), along its +y. */
export const TEAT = 0.107;
/** A vector of the baby's own frame, as turned in the piece's frame by how the baby lies. */
const onBaby = (b: RsBaby, q: readonly [number, number, number]) => new THREE.Vector3(q[0], q[1], q[2]).applyEuler(new THREE.Euler(b.rx, b.ry, 0, 'YXZ'));
/** Where the baby's mouth is in the piece's frame, lying as it lies. */
export function babyMouthAt(b: RsBaby): V {
  const m = onBaby(b, BABY_MOUTH);
  return [b.p[0] + m.x, b.p[1] + m.y, b.p[2] + m.z];
}
/** From the teat back to the bottle's base: out of the mouth along the way the face looks and a little up, so the milk runs down to it and the bottle stands clear of the eyes. */
export function bottleWayAt(b: RsBaby): V {
  const out = onBaby(b, BABY_MOUTH_OUT);
  out.y += 0.2;
  out.normalize();
  return [out.x, out.y, out.z];
}

/** Where everything is at `u` of a use, for someone `H` tall at time `t`. */
export function rsNow(m: RsMotion, u: number, H: number, t: number): RsNow {
  const s = H / 1.6;
  switch (m) {
    case 'rsLight': {
      const down = sm(u, 0.16, 0.3) * (1 - sm(u, 0.72, 0.84));
      const kneel: V = [0.2, 0.52, 0.34];
      const r = u < 0.16 ? mix([0.25, 0.95 * s, 0.34], FP.lighter, sm(u, 0, 0.12)) : u < 0.72 ? mix(FP.lighter, kneel, sm(u, 0.16, 0.3)) : mix(kneel, FP.lighter, sm(u, 0.72, 0.88));
      const l = mix([-0.1, 0.95 * s, 0.32], FP.screen, sm(u, 0.2, 0.3) * (1 - sm(u, 0.42, 0.5)));
      const held = u >= 0.11 && u < 0.88;
      return {
        st: [0.08 + 0.1 * (1 - down), 0.46],
        crouch: 0.8 * down,
        lean: 0.12 + 0.25 * down,
        nod: 0.3 + 0.2 * down,
        palms: 0.3,
        l: u > 0.88 ? [-0.12, 0.98 * s, 0.26] : l,
        r: u > 0.88 ? mix(FP.lighter, [0.12, 0.98 * s, 0.26], sm(u, 0.88, 0.95)) : r,
        shape: undefined,
        hold: held ? 'lighter' : null,
        flame: sm(u, 0.46, 0.8),
        screen: sm(u, 0.22, 0.34),
      };
    }
    case 'rsDouse': {
      // The left hand opens the screen, the right takes the poker from the stand, the logs spread.
      const low = sm(u, 0, 0.08) * (1 - sm(u, 0.14, 0.22)) + 0.8 * sm(u, 0.84, 0.9) * (1 - sm(u, 0.97, 1));
      const sweep = Math.sin(t * 2.6) * 0.12;
      const work: V = [0.32 + sweep, 0.72, 0.34];
      const take = sm(u, 0.22, 0.32);
      const put = sm(u, 0.74, 0.84);
      const r: V = put > 0 ? mix(work, FP.poker, put) : u < 0.32 ? mix([0.5, 0.95 * s, 0.34], FP.poker, take) : mix(FP.poker, work, sm(u, 0.32, 0.4));
      const screenAt = u < 0.5 ? sm(u, 0.05, 0.14) : 1 - sm(u, 0.86, 0.96);
      const lAt = mix([0.08, 0.98 * s, 0.3], FP.screen, Math.min(1, low * 1.3));
      return {
        st: [0.02 + 0.42 * sm(u, 0.14, 0.24) * (1 - sm(u, 0.84, 0.9)), 0.46],
        crouch: Math.max(0.65 * low, 0.28 * sm(u, 0.3, 0.38) * (1 - put)),
        lean: 0.14 + 0.16 * sm(u, 0.3, 0.38) * (1 - put),
        nod: 0.35,
        palms: 0.3,
        l: lAt,
        r: u > 0.84 ? [0.2, 0.96 * s, 0.32] : r,
        shape: undefined,
        hold: u >= 0.31 && u < 0.84 ? 'poker' : null,
        flame: 1 - 0.92 * sm(u, 0.32, 0.74),
        screen: screenAt,
      };
    }
    case 'rsCuddle':
    case 'rsFeed': {
      // Up from the crib (the crook of the left arm, the head on the dweller's left) and down again at the end.
      const up = sm(u, 0.03, 0.12) * (1 - sm(u, 0.9, 0.99));
      const reach = (u < 0.03 ? sm(u, 0, 0.03) : 1) * (1 - sm(u, 0.99, 1));
      const sway = Math.sin(t * 1.1) * 0.018 * up;
      const arms: RsBaby = { p: [-0.02 + sway, 1.0 * s, 0.38], ry: Math.PI / 2, rx: 0.25 };
      const baby = mixBaby(BABY_DOWN(), arms, up);
      const inL: V = [-0.1, CR.bed + 0.12, 0.1];
      const inR: V = [0.1, CR.bed + 0.1, 0.12];
      const heldL: V = [-0.2 + sway, 1.03 * s, 0.42];
      const heldR: V = [0.16 + sway, 1.0 * s, 0.4];
      const l = mix(inL, heldL, up);
      let r = mix(inR, heldR, up);
      let hold: RsNow['hold'] = null;
      let nod = 0.25 + 0.2 * up;
      let tip: number | undefined;
      let bottleWay: V | undefined;
      if (m === 'rsFeed') {
        // The bottle's middle is held out from the mouth so that its teat is at the mouth, wherever the baby is lying.
        const lips = babyMouthAt(arms);
        bottleWay = bottleWayAt(arms);
        const mouth: V = [lips[0] + bottleWay[0] * TEAT, lips[1] + bottleWay[1] * TEAT, lips[2] + bottleWay[2] * TEAT];
        const onTray: V = [CR.tray[0] - 0.02, CR.tray[1], CR.tray[2] - 0.02];
        const out = sm(u, 0.12, 0.2);
        const back = sm(u, 0.78, 0.86);
        const home = mix(onTray, heldR, sm(u, 0.86, 0.9));
        if (u > 0.12) r = u >= 0.86 ? mix(home, r, sm(u, 0.88, 0.92)) : back > 0 ? mix(mouth, onTray, back) : u < 0.2 ? mix(heldR, onTray, out) : mix(onTray, mouth, sm(u, 0.2, 0.28));
        hold = u >= 0.2 && u < 0.86 ? 'bottle' : null;
        tip = sm(u, 0.2, 0.28) * (1 - back);
      } else {
        // A pat on the back, and a kiss on the head halfway.
        r = [r[0], r[1] + 0.02 * Math.sin(t * 4) * up * sm(u, 0.2, 0.3) * (1 - sm(u, 0.8, 0.88)), r[2]];
        nod += 0.28 * sm(u, 0.46, 0.52) * (1 - sm(u, 0.58, 0.64));
      }
      return {
        st: [sway, CR.stand],
        crouch: 0.22 * (1 - up) * reach,
        lean: 0.05 + 0.5 * (1 - up) * reach,
        nod,
        palms: 1.2,
        l,
        r,
        shape: hold ? undefined : 'cradle',
        hold,
        tip,
        bottleWay,
        baby,
      };
    }
    case 'rsChange': {
      const on = sm(u, 0.04, 0.14) * (1 - sm(u, 0.9, 0.99));
      const pad: RsBaby = { p: [0, CR.pad, -0.02], ry: 0, rx: 0 };
      const baby = mixBaby(BABY_DOWN(), pad, on);
      const hips: V = [0, CR.pad + 0.12, 0.13];
      const wipe = u > 0.18 && u < 0.38;
      const nappy = u >= 0.4 && u < 0.72;
      let r: V = mix([0.1, CR.bed + 0.1, 0.12], [0.12, CR.pad + 0.08, 0.1], on);
      if (wipe) r = [Math.sin(t * 6) * 0.05, hips[1], hips[2] + Math.cos(t * 6) * 0.02];
      else if (nappy) r = mix([0.26, CR.pad + 0.06, 0.26], hips, sm(u, 0.42, 0.52));
      else if (u >= 0.72 && u < 0.86) r = [0.02, hips[1] + 0.015 * Math.sin(t * 7), hips[2]];
      return {
        st: [0, CR.stand],
        crouch: 0.22 * (1 - on) * (u < 0.5 ? sm(u, 0, 0.04) : 1 - sm(u, 0.99, 1)),
        lean: 0.5,
        nod: 0.45,
        palms: 1.1,
        l: mix([-0.1, CR.bed + 0.12, 0.1], [-0.1, CR.pad + 0.12, -0.02], on),
        r,
        shape: nappy ? undefined : 'cradle',
        hold: nappy ? 'diaper' : null,
        baby,
        padOut: true,
      };
    }
  }
}

export function rsPose(m: RsMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const u = rsPhase(m, spot, t);
  const n = rsNow(m, u, height, t);
  const W = (v: V) => par.localToWorld(new THREE.Vector3(v[0], v[1], v[2]));
  const at = W([n.st[0], 0, n.st[1]]);
  const dir = new THREE.Vector3(0, 0, -1).transformDirection(par.matrixWorld);
  const yaw = Math.atan2(dir.x, dir.z);
  return {
    pose: { kind: 'stand', at, yaw, crouch: n.crouch },
    doing: {
      reach: { l: W(n.l), r: W(n.r), lean: n.lean, nod: n.nod, palms: n.palms, grip: { l: 0.3, r: 0.3 }, shape: n.shape ? { l: n.shape, r: n.shape } : undefined },
      crouch: n.crouch || undefined,
    },
  };
}

/** Sat on a sofa or an armchair: `b.base` is the seat's top, facing `b.yaw`. */
export function rsDoing(m: RsSeat, b: BodyAt, t: number, seed: number): Doing {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  const s = b.height / 1.6;
  const at = (ahead: number, side: number, up: number) => b.base.clone().addScaledVector(fwd, ahead * s).addScaledVector(left, side * s).setY(b.base.y + up * s);
  const beat = (period: number) => ((t + seed * 3.7) % period) / period;
  if (m === 'rsRelax') {
    // Most of the time a hand on each thigh; for a few seconds now and then, the long stretch behind the head.
    const u = beat(14);
    const k = sm(u, 0.72, 0.78) * (1 - sm(u, 0.92, 0.98));
    const lap = (side: number) => at(0.24, side, 0.14);
    const head = (side: number) => at(-0.14, side, 0.72);
    return { reach: { l: lap(0.12).lerp(head(0.1), k), r: lap(-0.12).lerp(head(-0.1), k), lean: -0.06 * k, nod: -0.12 * k, palms: 1.2 * (1 - k), grip: { l: 0.25, r: 0.25 } } };
  }
  // At the TV: sat back, the hands loose, now and then a laugh and a clap.
  const u = beat(16);
  const k = sm(u, 0.8, 0.84) * (1 - sm(u, 0.94, 0.98));
  const clap = k * Math.abs(Math.sin(t * 7));
  return {
    reach: {
      l: at(0.25, 0.1, 0.14).lerp(at(0.28, 0.02 + 0.05 * clap, 0.32), k),
      r: at(0.25, -0.1, 0.14).lerp(at(0.28, -0.02 - 0.05 * clap, 0.32), k),
      lean: k * 0.1 * Math.sin(t * 7),
      nod: -0.04 + k * 0.06,
      palms: 1.3 * (1 - k),
      grip: { l: 0.2, r: 0.2 },
    },
  };
}
