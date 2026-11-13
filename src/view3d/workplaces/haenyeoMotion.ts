import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';

/*
 * A day at the 해녀의 집 (2026-11-01, the workplace pipeline, at the user's request), on the made-up 검은여 shore. Each
 * motion is a round of beats: where the dweller is, where the hands go, what moves. The piece reads the same script by
 * the same clock (haenyeo.ts), so the net fills as the catch goes in and the fire takes as the wood goes on.
 *
 * - hyDive (물질 포인트): the mask wiped with mugwort, the tewak carried down the rocks, out on it, three dives (flippers
 *   up, gone, bubbles, up with a whistled breath and a shell for the net), back in and the net tipped out.
 * - hySeason (물질 포인트): the same when the conch opens: the flag up first, dives closer together, a heavy net.
 * - hyReadSea (물질 포인트): the swell looked over, the tide staff read, the wind felt, the day's plan on its card.
 * - hyWarm (불턱): wood on the fire, sat on a stone, hands out, arms rubbed, a cup from the elder and a talk.
 * - hyLearn (불턱): the elder draws the sea's rocks in the ash and shows the breath and the bitchang; the dweller copies.
 * - hyRules (불턱): sat with the three elders: the book opened, a rule put, hands up, written, stamped, a bow.
 * - hyClean (해산물 손질대): an urchin cut and spooned, an abalone shucked, a conch and seaweed sorted, a rinse.
 * - hyBrief (해산물 손질대): two visitors shown the tewak, the whistle, the sea from here and how to breathe.
 * - hyMend (테왁·망사리 정리대): a net off its peg, sat with it, the hole laced shut, the float's seam tried, hung up.
 * - hySuit (고무옷 건조대): a suit rinsed in the tub, wrung and hung, the flippers pegged by their heels.
 * - hyTideMark (물때 달력): the moon read, the days counted, the magnet moved, the hours chalked, the sign turned.
 * - hyWeigh (망사리 저울): a net up on the hook, the dial read out, the book written up, the net in its bin, a tag.
 * - hyWeed (미역 건조대): strands laid along the frame from the basket, a row turned, one felt for dryness.
 * - hyServe (해산물 카운터): the order taken at the stool, round behind, abalone sliced, the plate passed, the till, a wipe.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front). Facing
 * the piece the dweller's right hand is on +x. Below the sea's sheet nothing is seen: a dweller at y −1.1 is treading
 * water with the shoulders out, at −2.2 they're under.
 */
export type HyMotion = 'hyDive' | 'hySeason' | 'hyReadSea' | 'hyWarm' | 'hyLearn' | 'hyRules' | 'hyClean' | 'hyBrief' | 'hyMend' | 'hySuit' | 'hyTideMark' | 'hyWeigh' | 'hyWeed' | 'hyServe';
export const HY_MOTIONS = new Set<string>(['hyDive', 'hySeason', 'hyReadSea', 'hyWarm', 'hyLearn', 'hyRules', 'hyClean', 'hyBrief', 'hyMend', 'hySuit', 'hyTideMark', 'hyWeigh', 'hyWeed', 'hyServe']);

const frac = (x: number) => ((x % 1) + 1) % 1;
export const hyPhase = (p: THREE.Vector3) => frac(p.x * 0.391 + p.z * 0.673);
const add = (a: V, x: number, y: number, z: number): V => [a[0] + x, a[1] + y, a[2] + z];
const lerpV = (a: V, b: V, e: number): V => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];
const mixN = (a: number, b: number, e: number) => a + (b - a) * e;
const angle = (a: number, b: number, e: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * e;
const PI = Math.PI;

// ---------------------------------------------------------------------------------------------
// The script engine.

type Seq = Array<[string, number, number?]>;
export interface St {
  x: number;
  y: number;
  z: number;
  yaw: number;
  sit?: boolean;
  floor?: number;
  /** Face down on the water, the head along yaw. */
  swim?: boolean;
}
const st = (x: number, z: number, yaw = PI, y = 0): St => ({ x, y, z, yaw });
const sitAt = (x: number, y: number, z: number, yaw = PI): St => ({ x, y, z, yaw, sit: true, floor: 0 });
const swimAt = (x: number, z: number, yaw: number): St => ({ x, y: 0.1, z, yaw, swim: true });
interface Key {
  l?: V;
  r?: V;
  lean?: number;
  nod?: number;
  palms?: number;
  gl?: number;
  gr?: number;
  crouch?: number;
  tap?: boolean;
  props?: Record<string, V | null | undefined>;
  n?: Record<string, number>;
}
interface Ctx {
  t: number;
  H: number;
  st: St;
  bd(side: number, up: number, ahead: number): V;
  /** How far on a beat is: 0 before it, 1 after it. */
  p(name: string, a?: number, b?: number): number;
}
interface Script {
  seq: Seq;
  at(k: string): St;
  key(k: string, u: number, c: Ctx): Key;
}
export interface HyNow {
  b: Beat;
  st: St;
  walking: boolean;
  key: Key;
  props: Record<string, V | null>;
  n: Record<string, number>;
}
function evalKey(s: Script, k: string, u: number, t: number, H: number): { st: St; key: Key } {
  const here = s.at(k);
  const idx = s.seq.findIndex(([q]) => q === k);
  const fx = Math.sin(here.yaw);
  const fz = Math.cos(here.yaw);
  const lx = Math.cos(here.yaw);
  const lz = -Math.sin(here.yaw);
  const c: Ctx = {
    t,
    H,
    st: here,
    bd: (side, up, ahead) => [here.x + lx * side + fx * ahead, (here.sit ? (here.floor ?? 0) : here.y) + up, here.z + lz * side + fz * ahead],
    p: (name, a = 0, b = 1) => {
      const i = s.seq.findIndex(([q]) => q === name);
      return idx > i ? 1 : idx < i ? 0 : sm(u, a, b);
    },
  };
  return { st: here, key: s.key(k, u, c) };
}
function blendKey(a: Key, b: Key, e: number): Key {
  if (e <= 0) return a;
  const v = (x: V | undefined, y: V | undefined) => (x && y ? lerpV(x, y, e) : e < 0.5 ? x : y);
  const n = (x: number | undefined, y: number | undefined, d: number) => mixN(x ?? d, y ?? d, e);
  return { l: v(a.l, b.l), r: v(a.r, b.r), lean: n(a.lean, b.lean, 0.05), nod: n(a.nod, b.nod, 0.1), palms: n(a.palms, b.palms, 0.4), gl: n(a.gl, b.gl, 0.3), gr: n(a.gr, b.gr, 0.3), crouch: n(a.crouch, b.crouch, 0), tap: e < 0.5 ? a.tap : b.tap };
}
/** Where a script has got to: the dweller, the hands, and everything the piece draws. */
export function hyNow(m: HyMotion, t: number, ph: number, H = 1.6): HyNow {
  const s = SCRIPTS[m];
  const b = beatOf(s.seq, t, ph);
  const A = evalKey(s, b.from, b.u, t, H);
  const B = b.e > 0 ? evalKey(s, b.to, 0, t, H) : A;
  const e = b.e;
  const here: St = e < 0.5 ? { ...A.st } : { ...B.st };
  here.x = mixN(A.st.x, B.st.x, e);
  here.y = mixN(A.st.y, B.st.y, e);
  here.z = mixN(A.st.z, B.st.z, e);
  here.yaw = angle(A.st.yaw, B.st.yaw, e);
  const dist = Math.hypot(A.st.x - B.st.x, A.st.z - B.st.z);
  const props: Record<string, V | null> = {};
  for (const k of new Set([...Object.keys(A.key.props ?? {}), ...Object.keys(B.key.props ?? {})])) {
    const x = A.key.props?.[k] ?? null;
    const y = B.key.props?.[k] ?? null;
    props[k] = x && y ? lerpV(x, y, e) : e < 0.5 ? x : y;
  }
  const n: Record<string, number> = {};
  for (const k of new Set([...Object.keys(A.key.n ?? {}), ...Object.keys(B.key.n ?? {})])) n[k] = mixN(A.key.n?.[k] ?? 0, B.key.n?.[k] ?? 0, e);
  return { b, st: here, walking: e > 0 && e < 1 && dist > 0.12 && !here.sit && !here.swim, key: blendKey(A.key, B.key, e), props, n };
}
/** A dweller at a spot of a piece here: the whole body from the script. */
export function hyPose(m: HyMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = hyNow(m, t, hyPhase(par.getWorldPosition(new THREE.Vector3())), height);
  const W = (v: V) => par.localToWorld(new THREE.Vector3(v[0], v[1], v[2]));
  const s = N.st;
  const k = N.key;
  const at = W([s.x, s.y, s.z]);
  const dir = new THREE.Vector3(Math.sin(s.yaw), 0, Math.cos(s.yaw)).transformDirection(par.matrixWorld);
  const yaw = Math.atan2(dir.x, dir.z);
  let pose: BodyPose;
  if (s.swim) pose = { kind: 'fly', at, yaw, floor: at.y };
  else if (s.sit) pose = { kind: 'sit', at, yaw, floor: W([s.x, s.floor ?? 0, s.z]).y };
  else if (N.walking) pose = { kind: 'walk', at, yaw };
  else pose = { kind: 'stand', at, yaw, crouch: k.crouch };
  return {
    pose,
    doing: {
      reach: s.swim ? {} : { l: k.l && W(k.l), r: k.r && W(k.r), lean: k.lean ?? 0.05, nod: k.nod ?? 0.1, palms: k.palms ?? 0.4, grip: { l: k.gl ?? 0.3, r: k.gr ?? 0.3 }, tap: k.tap },
      crouch: !s.sit && !s.swim && k.crouch ? k.crouch : undefined,
    },
  };
}
/** A hand writing: small quick strokes across a line. */
const writing = (a: V, t: number, u: number, w = 0.12): V => [a[0] - w / 2 + w * ((u * 3) % 1) + 0.006 * Math.sin(t * 19), a[1] + 0.008 * Math.cos(t * 23), a[2]];

// =============================================================================================
// 물질 포인트 (diveSpot, 2 × 1): a ledge of lava with steps into the sea behind it (the sea begins at z −0.5), the
// tewak on its stone, the mask and mugwort, a tide staff, a flag.

export const DS = {
  stand: 0.62,
  ledge: 0.14,
  tewak: [0.66, 0.42, 0.18] as V,
  float: [0.68, 0.06, -1.86] as V,
  net: [0.68, 0.0, -1.62] as V,
  /** The net where it's tipped out, on the ledge. */
  netDown: [0.36, 0.2, 0.2] as V,
  basket: [0.04, 0.24, 0.3] as V,
  mask: [-0.5, 0.3, 0.22] as V,
  mug: [-0.74, 0.3, 0.22] as V,
  staff: [-0.76, 0.46, -0.56] as V,
  halyard: [-0.93, 0.92, 0.1] as V,
  card: [-0.16, 0.34, 0.26] as V,
  /** Where they come up beside the tewak. */
  up: [0.3, -1.86] as [number, number],
};
const TREAD = -1.12;
const UNDER = -2.25;
function diveScript(season: boolean): Script {
  const dives = [0, 1, 2];
  const under = season ? 2.2 : 3.2;
  const seq: Seq = [
    ...(season ? ([['call', 2.6, 0.7]] as Seq) : []),
    ['mask', 3.2, 0.7], ['take', 1.2, 0.8], ['step', 0.2, 1.0], ['wade', 0.4, 0.9], ['out', 0.2, 1.3], ['float', 1.3, 0.6],
    ...dives.flatMap((i) => [[`duck${i}`, 0.7, 0.2], [`under${i}`, under, 0.3], [`up${i}`, 2.8, 0.4]] as Seq),
    ['back', 0.2, 1.6], ['climb', 0.6, 0.9], ['ledge', 0.2, 0.9], ['tip', 3.0, 0.9],
  ];
  return {
    seq,
    at(k) {
      if (k === 'call') return st(-0.72, DS.stand);
      if (k === 'mask') return st(-0.48, DS.stand);
      if (k === 'take' || k === 'tip') return st(0.42, DS.stand);
      if (k === 'step') return st(0.1, -0.1, PI, DS.ledge);
      if (k === 'wade') return st(0.1, -0.86, PI, -0.72);
      if (k === 'out') return swimAt(-0.1, -1.3, PI * 0.8);
      if (k === 'float') return swimAt(0.0, -1.82, PI / 2);
      if (k === 'back') return swimAt(0.1, -1.3, 0.25);
      if (k === 'climb') return st(0.1, -0.86, 0, -0.72);
      if (k === 'ledge') return st(0.1, -0.1, 0, DS.ledge);
      const [x, z] = DS.up;
      if (k.startsWith('duck')) return st(x, z, 0, -0.95);
      if (k.startsWith('under')) return st(x, z, 0, UNDER);
      return st(x, z, 0, TREAD);
    },
    key(k, u, c): Key {
      let got = 0;
      for (const i of dives) got += c.p(`up${i}`, 0.72, 0.78) / 3;
      const n: Record<string, number> = { season: season ? 1 : 0, flag: season ? c.p('call', 0.2, 0.8) * (1 - c.p('tip', 0.5, 0.9)) : 0, catch: got, basket: c.p('tip', 0.35, 0.9), splash: 0, bub: 0, sum: 0, shell: 0, inUse: 1 };
      const worn: V = c.bd(0, 0.925 * c.H, 0.095);
      const carried: V = c.bd(-0.3, 0.58 * c.H, 0.12);
      const afloat = add(DS.float, 0, 0.02 * Math.sin(c.t * 1.4), 0);
      const floatP = { tewak: afloat, net: DS.net, mask: worn };
      if (k === 'call') {
        // The flag run up, an arm over the head to the others along the shore.
        const f = (u * 3) % 1;
        const up = u > 0.62;
        return { l: up ? c.bd(0.22, 1.12 * c.H + 0.08 * Math.sin(c.t * 7), 0.1) : add(DS.halyard, 0, 0.12 + 0.3 * f, 0.02), gl: up ? 0.2 : 0.9, r: up ? c.bd(-0.2, 0.56 * c.H, 0.1) : add(DS.halyard, 0.01, 0.42 - 0.3 * f, 0.02), gr: up ? 0.3 : 0.9, nod: -0.05, props: { tewak: DS.tewak, mask: DS.mask }, n };
      }
      if (k === 'mask') {
        // Down to the stone; a sprig of mugwort rubbed round the glass so it won't fog; on.
        const e = sm(u, 0.08, 0.26);
        const held = lerpV(DS.mask, c.bd(0.02, 0.66 * c.H, 0.26), e);
        const on = sm(u, 0.78, 0.96);
        const mask = lerpV(held, worn, on);
        const a = c.t * 8;
        const sprig: V = add(held, 0.05 * Math.cos(a), 0.03 * Math.sin(a), 0.02);
        return { l: add(mask, 0.05, -0.01, 0), gl: 0.85, r: on > 0 ? add(mask, -0.05, -0.01, 0) : u > 0.26 ? sprig : add(DS.mug, 0, 0.02, 0), gr: 0.8, crouch: 0.6 * (1 - sm(u, 0.1, 0.26)), nod: on > 0.5 ? 0.02 : 0.36, props: { mask, sprig: u > 0.2 && u < 0.78 ? sprig : null, tewak: DS.tewak }, n };
      }
      if (k === 'take') {
        const p = lerpV(DS.tewak, carried, sm(u, 0.15, 0.9));
        return { r: add(p, 0.02, 0.14, 0), gr: 0.9, crouch: 0.4 * (1 - sm(u, 0.2, 0.9)), nod: 0.3, props: { tewak: p, mask: worn }, n };
      }
      if (k === 'step' || k === 'wade') return { r: add(carried, 0.02, 0.14, 0), gr: 0.9, l: c.bd(0.3, 0.74 * c.H, 0.12), gl: 0.3, nod: 0.3, props: { tewak: carried, mask: worn }, n };
      if (k === 'out' || k === 'float') return { props: { tewak: afloat, net: DS.net }, n };
      const dm = /^(duck|under|up)(\d)$/.exec(k);
      if (dm && dm[1] === 'duck') {
        // Over and down: the flippers come up out of the water and slide under.
        return { nod: 0.5, props: { ...floatP, fins: [DS.up[0], 0.5 * Math.sin(u * PI), DS.up[1]] as V }, n: { ...n, splash: 1 } };
      }
      if (dm && dm[1] === 'under') return { props: { tewak: afloat, net: DS.net }, n: { ...n, bub: 1 } };
      if (dm) {
        // Up with the breath going out in a long whistle; the shell held up, then into the net.
        const hold = c.bd(-0.14, 0.78 * c.H + 0.22 * sm(u, 0.2, 0.42), 0.22);
        const shell = lerpV(hold, add(DS.net, -0.02, 0.1, 0), sm(u, 0.52, 0.74));
        return { l: add(afloat, -0.1, 0.08, 0.04), gl: 0.9, r: shell, gr: 0.85, nod: -0.04, props: { ...floatP, shell: u < 0.75 ? shell : null }, n: { ...n, sum: u < 0.42 ? 1 : 0, splash: u < 0.12 ? 1 : 0, shell: +dm[2] } };
      }
      if (k === 'back') {
        const f: V = add(c.bd(0.3, 0, 0.5), 0, 0.06, 0);
        return { props: { tewak: f, net: add(f, 0, -0.06, 0.2) }, n };
      }
      if (k === 'climb' || k === 'ledge') {
        const onArm = c.bd(0.28, 0.55 * c.H, 0.14);
        const lowNet = add(onArm, 0.04, -0.2, 0.02);
        return { l: add(onArm, 0, 0.14, 0), gl: 0.9, r: add(lowNet, -0.02, 0.2, 0), gr: 0.9, nod: 0.3, lean: 0.1, props: { tewak: onArm, net: lowNet, mask: worn }, n };
      }
      // The tip: the float on its stone, the net down, its catch lifted out by the handful, the mask off.
      const wet = 1 - sm(u, 0.2, 0.5);
      const netP = lerpV(c.bd(0.1, 0.5 * c.H, 0.2), DS.netDown, sm(u, 0, 0.2));
      const h = lerpV(DS.netDown, add(DS.basket, 0, 0.08, 0), Math.abs(Math.sin(u * PI * 3)));
      const off = sm(u, 0.82, 0.98);
      return { l: u < 0.2 ? add(netP, 0, 0.14, 0) : add(DS.netDown, -0.14, 0.1, 0.02), gl: 0.8, r: off > 0 ? lerpV(worn, DS.mask, off) : h, gr: 0.85, crouch: 0.6 * sm(u, 0, 0.2) * (1 - off), nod: 0.42, lean: 0.14, props: { tewak: lerpV(c.bd(0.4, 0.4, 0.2), DS.tewak, sm(u, 0, 0.2)), net: netP, mask: u < 0.82 ? worn : lerpV(worn, DS.mask, off), piece: u > 0.2 && u < 0.82 ? h : null }, n: { ...n, catch: 1 - sm(u, 0.25, 0.85), basket: sm(u, 0.25, 0.85), wet } };
    },
  };
}
const SEA_SEQ: Seq = [['look', 3.2, 0.7], ['staff', 3.2, 0.8], ['wind', 2.6, 0.7], ['card', 4.2, 0.8], ['nod', 1.6, 0.8]];
const READSEA: Script = {
  seq: SEA_SEQ,
  at(k) {
    if (k === 'staff') return st(-0.68, 0.14, PI, DS.ledge);
    if (k === 'wind') return st(-0.1, 0.1, PI, DS.ledge);
    if (k === 'card' || k === 'nod') return st(-0.14, DS.stand, 0);
    return st(0.12, 0.1, PI, DS.ledge);
  },
  key(k, u, c): Key {
    const n: Record<string, number> = { written: c.p('card', 0.1, 0.9), plan: c.p('nod', 0, 0.2) };
    const rest: Partial<Key> = { l: c.bd(0.2, 0.56 * c.H, 0.1), r: c.bd(-0.2, 0.56 * c.H, 0.1) };
    switch (k) {
      case 'look':
        // A hand over the eyes along the line of the swell.
        return { l: c.bd(0.08, 0.95 * c.H, 0.12), gl: 0.15, palms: 1, r: rest.r, nod: -0.06 + 0.04 * Math.sin(c.t * 0.9), lean: 0.03, n };
      case 'staff':
        // Down at the edge: a finger on the marks of the staff, against the water.
        return { r: add(DS.staff, 0.04, 0.02 * Math.sin(c.t * 3) - 0.06 * u, 0.06), gr: 0.2, l: c.bd(0.22, 0.34 * c.H, 0.14), gl: 0.5, crouch: 0.72, nod: 0.45, lean: 0.14, n };
      case 'wind':
        return { r: c.bd(-0.18, 1.06 * c.H, 0.18), gr: 0.1, palms: 0.8, l: rest.l, nod: -0.16, n };
      case 'card': {
        // The card from its stone; the plan written with a stub of pencil.
        const card = c.bd(0.08, 0.64 * c.H, 0.28);
        const pen = writing(add(card, -0.02, 0.02, 0.02), c.t, u, 0.1);
        return { l: add(card, 0.06, -0.04, 0), gl: 0.8, r: pen, gr: 0.75, nod: 0.36, props: { card, pencil: add(pen, 0, 0.03, 0.01) }, n };
      }
      default: {
        const card = lerpV(c.bd(0.08, 0.64 * c.H, 0.28), DS.card, sm(u, 0.1, 0.9));
        return { l: add(card, 0.04, 0.02, 0), gl: 0.7, crouch: 0.5 * sm(u, 0.2, 0.9), nod: 0.3, props: { card }, n };
      }
    }
  },
};

// =============================================================================================
// 불턱 (bulteok, 2 × 1, drawn out behind its footprint over a piece of its own): a ring of stacked black stone open to
// the front, a fire in the middle, flat stones to sit on.

export const BT = {
  /** The middle of the ring, its outer and inner radii, and the fire. */
  z: -0.62,
  R: 1.24,
  r: 1.0,
  fire: [0, 0.2, -0.62] as V,
  seat: [0.7, 0.3, -0.46] as V,
  /** Where the elders sit: on three more stones. */
  elders: [[-0.08, -1.36], [-0.72, -0.82], [0.58, -1.2]] as Array<[number, number]>,
  logs: [0.62, 0.2, -0.02] as V,
  kettle: [-0.34, 0.26, -0.3] as V,
  ash: [0.26, 0.05, -0.86] as V,
};
export const faceFire = (x: number, z: number) => Math.atan2(BT.fire[0] - x, BT.fire[2] - z);
const seated = () => sitAt(BT.seat[0], BT.seat[1], BT.seat[2], faceFire(BT.seat[0], BT.seat[2]));
const WARM_SEQ: Seq = [['wood', 2.8, 0.9], ['sit', 0.4, 0.6], ['hands', 3.6, 0.5], ['rub', 2.8, 0.5], ['cup', 3.6, 0.5], ['chat', 3.8, 0.5], ['hands2', 2.6, 0.9]];
const WARM: Script = {
  seq: WARM_SEQ,
  at: (k) => (k === 'wood' ? st(0.2, 0.02, faceFire(0.2, 0.02)) : seated()),
  key(k, u, c): Key {
    const n: Record<string, number> = { fire: c.p('wood', 0.5, 1) * 0.5 + 0.5, e0: 1, e1: 1, e2: 0, chat: 0, offer: 0 };
    const low = (s: number): V => c.bd(s, 0.68, 0.34);
    switch (k) {
      case 'wood': {
        const p = lerpV(BT.logs, add(BT.fire, 0.02, 0.1, 0.06), sm(u, 0.2, 0.75));
        return { r: add(p, 0.02, 0.05, 0.02), gr: 0.85, l: add(p, -0.14, 0.06, 0.02), gl: 0.7, crouch: 0.78, nod: 0.45, lean: 0.14, props: { log: u < 0.78 ? p : null }, n };
      }
      case 'sit':
        return { l: low(0.2), r: low(-0.2), nod: 0.15, n };
      case 'hands':
      case 'hands2': {
        const w = 0.02 * Math.sin(c.t * 1.7);
        return { l: add(low(0.13), 0, w, 0.12), r: add(low(-0.13), 0, -w, 0.12), gl: 0.1, gr: 0.1, palms: 1, nod: 0.12, lean: 0.1, n: { ...n, fire: 1 } };
      }
      case 'rub': {
        // Cold to the bone: palms up and down the other arm.
        const s = 0.08 * Math.sin(c.t * 7);
        return { l: c.bd(-0.17, 0.92 + s, 0.08), gl: 0.3, r: c.bd(0.17, 0.92 - s, 0.08), gr: 0.3, nod: 0.18, lean: 0.14, n: { ...n, fire: 1 } };
      }
      case 'cup': {
        // A cup of something hot from the kettle, passed across by the elder; both hands; a sip.
        const hold = c.bd(0, 0.72, 0.28);
        const lip = c.bd(0, 0.82 * c.H * 0.74, 0.14);
        const e = sm(u, 0.25, 0.5) - sm(u, 0.75, 0.95);
        const cup = u < 0.2 ? lerpV(add(BT.kettle, 0.18, 0.1, 0), hold, sm(u, 0, 0.2)) : lerpV(hold, lip, e);
        return { l: add(cup, 0.05, -0.02, 0.01), r: add(cup, -0.05, -0.02, 0.01), gl: 0.85, gr: 0.85, nod: e > 0.5 ? -0.05 : 0.2, props: { cup }, n: { ...n, fire: 1, offer: 1 - sm(u, 0, 0.2) } };
      }
      default:
        // Talk across the fire: a hand going, heads nodding, a laugh.
        return { l: low(0.17), r: add(low(-0.14), 0.03 * Math.sin(c.t * 4), 0.1 + 0.05 * Math.sin(c.t * 5.5), 0.06), gr: 0.25, palms: 0.5, nod: 0.03 + 0.05 * Math.sin(c.t * 2.2), n: { ...n, fire: 1, chat: 1 } };
    }
  },
};
const LEARN_SEQ: Seq = [['sit', 1.2, 0.5], ['watch', 3.8, 0.5], ['copy', 3.8, 0.5], ['breath', 3.6, 0.5], ['try', 3.6, 0.5], ['tool', 3.8, 0.5], ['bow', 1.8, 0.7]];
const LEARN: Script = {
  seq: LEARN_SEQ,
  at: () => seated(),
  key(k, u, c): Key {
    const n: Record<string, number> = { fire: 1, e0: 1, e1: 0, e2: 0, draw: c.p('watch', 0.05, 0.95), ours: c.p('copy', 0.05, 0.95), eStick: 0, eChest: 0, eTool: 0, eNod: 0 };
    const low = (s: number): V => c.bd(s, 0.68, 0.34);
    const rest: Partial<Key> = { l: low(0.17), r: low(-0.17) };
    switch (k) {
      case 'watch':
        // The elder's stick going through the ash: this rock, that gully.
        return { ...rest, nod: 0.42, lean: 0.14, n: { ...n, eStick: 1 } };
      case 'copy': {
        // Their own stick, the same lines beside hers.
        const a = u * PI * 4;
        const h = add(BT.ash, 0.14 + 0.1 * Math.cos(a), 0.05, 0.14 + 0.06 * Math.sin(a * 0.5));
        return { r: h, gr: 0.85, l: low(0.17), nod: 0.52, lean: 0.34, props: { stick: h }, n: { ...n, eNod: u > 0.75 ? 1 : 0 } };
      }
      case 'breath':
        return { ...rest, nod: 0.05, n: { ...n, eChest: 1 } };
      case 'try': {
        // A hand on the chest, slowly in, held, and out through the lips.
        const b = sm(u, 0, 0.4) * (1 - sm(u, 0.72, 1));
        return { r: c.bd(-0.04, 0.84 + 0.05 * b, 0.13), gr: 0.1, palms: 0.7, l: low(0.17), nod: 0.02 - 0.12 * b, lean: 0.06 - 0.06 * b, n: { ...n, eNod: u > 0.8 ? 1 : 0 } };
      }
      case 'tool': {
        // The bitchang passed over; its flat edge set under an imagined shell, a sharp twist.
        const tw = u > 0.4 ? 0.04 * Math.sin(c.t * 9) : 0;
        const h = add(c.bd(-0.1, 0.78, 0.28), tw, 0, 0);
        return { r: h, gr: 0.95, l: add(h, 0.1, -0.02, 0.1), gl: 0.5, nod: 0.3, props: { bitchang: h }, n: { ...n, eTool: 1 - sm(u, 0, 0.3) } };
      }
      case 'bow':
        return { ...rest, nod: 0.45 * Math.sin(u * PI), lean: 0.28 * Math.sin(u * PI), n: { ...n, eNod: 1 } };
      default:
        return { ...rest, nod: 0.16, n };
    }
  },
};
const RULES_SEQ: Seq = [['open', 2.6, 0.5], ['speak', 4.2, 0.5], ['elder', 3.2, 0.5], ['vote', 3.6, 0.5], ['write', 4.2, 0.4], ['stamp', 2.2, 0.8], ['bow', 2.2, 0.9]];
const RULES: Script = {
  seq: RULES_SEQ,
  at: (k) => (k === 'bow' ? st(0.34, -0.1, faceFire(0.34, -0.1)) : seated()),
  key(k, u, c): Key {
    const n: Record<string, number> = { fire: 1, e0: 1, e1: 1, e2: 1, v0: 0, v1: 0, v2: 0, written: c.p('write', 0.05, 0.95), stamped: c.p('stamp', 0.5, 0.55), speak: 0 };
    const book = c.bd(0, 0.6, 0.3);
    const lap: Partial<Key> = { l: add(book, 0.1, 0.02, 0), gl: 0.5 };
    switch (k) {
      case 'open':
        return { ...lap, r: add(book, -0.1 + 0.2 * sm(u, 0.2, 0.8), 0.03, 0), gr: 0.5, nod: 0.4, props: { book }, n };
      case 'speak':
        // The rule put: the small ones stay in the sea, no diving past the marker.
        return { ...lap, r: c.bd(-0.2, 1.0 + 0.06 * Math.sin(c.t * 5), 0.3), gr: 0.25, palms: 0.5, nod: 0.02 + 0.04 * Math.sin(c.t * 2.4), props: { book }, n: { ...n, speak: 1 } };
      case 'elder':
        // The eldest has something to say: heads turned to her.
        return { ...lap, r: add(book, -0.14, 0.02, 0), nod: 0.05, props: { book }, n: { ...n, v0: 0.4 * Math.abs(Math.sin(c.t * 3)) } };
      case 'vote': {
        const a = sm(u, 0.05, 0.25);
        const b = sm(u, 0.25, 0.45);
        const d = sm(u, 0.45, 0.65);
        return { ...lap, r: c.bd(-0.2, 0.8 + 0.5 * d, 0.2), gr: 0.1, nod: -0.02, props: { book }, n: { ...n, v0: a, v1: b, v2: d } };
      }
      case 'write': {
        const pen = writing(add(book, -0.02, 0.03, 0), c.t, u, 0.14);
        return { ...lap, r: pen, gr: 0.8, nod: 0.46, lean: 0.1, props: { book, pen: add(pen, 0, 0.03, 0.01) }, n };
      }
      case 'stamp': {
        const hit = u > 0.35 ? Math.abs(Math.sin((u - 0.35) * PI * 2)) : 1;
        const h = add(book, -0.04, 0.03 + 0.1 * hit, 0);
        return { ...lap, r: add(h, 0, 0.05, 0), gr: 0.9, nod: 0.42, props: { book, stamp: h }, n };
      }
      default: {
        // Up, the book under an arm, and a bow to the three of them.
        const b = sm(u, 0.1, 0.45) * (1 - sm(u, 0.72, 1));
        return { l: c.bd(0.2, 0.56 * c.H, 0.05), gl: 0.6, r: c.bd(-0.2, 0.56 * c.H, 0.1), nod: 0.3 * b, lean: 0.42 * b, props: { book: c.bd(0.24, 0.62 * c.H, 0.02) }, n };
      }
    }
  },
};

// =============================================================================================
// 해산물 손질대 (catchTable, 2 × 1): a steel-topped table, the morning's basket on the left, a board in the middle, a bowl,
// and trays along the back for urchin, abalone, conch and seaweed.

export const CT = {
  stand: 0.64,
  top: 0.86,
  basket: [-0.68, 1.0, 0.08] as V,
  board: [-0.04, 0.88, 0.12] as V,
  bowl: [0.42, 0.92, 0.14] as V,
  /** The trays' x along the back; their z and height. */
  trays: [-0.54, -0.18, 0.18, 0.54] as const,
  trayZ: -0.2,
  trayY: 0.92,
  hose: [0.82, 1.02, 0.02] as V,
  vest: [0.84, 1.0, 0.22] as V,
  tourists: [[-1.02, 1.72], [1.02, 1.72]] as Array<[number, number]>,
};
const CLEAN_SEQ: Seq = [['uTake', 1.5, 0.25], ['uCut', 1.7, 0.2], ['uSpoon', 3.0, 0.3], ['aTake', 1.2, 0.2], ['aShuck', 3.0, 0.3], ['aTray', 1.2, 0.3], ['conch', 2.0, 0.3], ['weed', 2.0, 0.4], ['rinse', 2.8, 0.8]];
const CLEAN: Script = {
  seq: CLEAN_SEQ,
  at: (k) => (k === 'rinse' ? st(0.34, CT.stand) : k === 'weed' || k === 'conch' ? st(0.1, CT.stand) : st(-0.14, CT.stand)),
  key(k, u, c): Key {
    const n: Record<string, number> = { roe: c.p('uSpoon', 0.05, 0.95), abTray: c.p('aTray', 0.5, 0.7), coTray: c.p('conch', 0.6, 0.8), weedTray: c.p('weed', 0.6, 0.8), water: 0, half: 0, open: 0 };
    const board = CT.board;
    const steady: V = add(board, -0.13, 0.03, 0.04);
    switch (k) {
      case 'uTake': {
        const p = lerpV(CT.basket, add(board, 0, 0.06, 0), sm(u, 0.1, 0.85));
        return { l: add(p, 0, 0.05, 0.01), gl: 0.8, r: add(board, 0.26, 0.03, 0.02), nod: 0.42, props: { urchin: p }, n };
      }
      case 'uCut': {
        // Scissors through the spines, round the mouth; it falls open.
        const a = c.t * 12;
        return { l: add(board, -0.05, 0.08, 0.02), gl: 0.8, r: add(board, 0.06, 0.08 + 0.015 * Math.sin(a), 0.02), gr: 0.9, nod: 0.46, lean: 0.1, props: { urchin: add(board, 0, 0.06, 0), shears: add(board, 0.06, 0.08, 0.02) }, n: { ...n, half: sm(u, 0.6, 0.95) } };
      }
      case 'uSpoon': {
        // A spoon round the shell, the gold lifted across to the bowl.
        const f = (u * 3) % 1;
        const h = f < 0.5 ? add(board, 0.02 * Math.cos(c.t * 12), 0.09, 0.02 * Math.sin(c.t * 12)) : lerpV(add(board, 0, 0.1, 0), add(CT.bowl, 0, 0.1, 0), sm(f, 0.5, 0.9));
        return { l: add(board, -0.05, 0.08, 0.02), gl: 0.8, r: h, gr: 0.8, nod: 0.46, lean: 0.1, props: { urchin: add(board, 0, 0.06, 0), spoon: h }, n: { ...n, half: 1 } };
      }
      case 'aTake': {
        const p = lerpV(CT.basket, add(board, 0, 0.04, 0), sm(u, 0.1, 0.85));
        return { l: add(p, 0, 0.05, 0.01), gl: 0.8, r: add(board, 0.26, 0.03, 0.02), nod: 0.42, props: { abalone: p }, n };
      }
      case 'aShuck': {
        // The blade under the foot, worked round the shell; it comes free.
        const a = u * PI * 6;
        const h = add(board, 0.05 * Math.cos(a), 0.06, 0.04 * Math.sin(a));
        return { l: steady, gl: 0.85, r: h, gr: 0.9, nod: 0.5, lean: 0.12, props: { abalone: add(board, 0, 0.04, 0), knife: h }, n: { ...n, open: sm(u, 0.7, 0.95) } };
      }
      case 'aTray': {
        const to: V = [CT.trays[1], CT.trayY + 0.04, CT.trayZ];
        const p = lerpV(add(board, 0, 0.05, 0), to, sm(u, 0.1, 0.7));
        return { r: add(p, 0.01, 0.05, 0.02), gr: 0.75, l: steady, gl: 0.5, nod: 0.3, props: { abalone: u < 0.75 ? p : null }, n: { ...n, open: 1 } };
      }
      case 'conch': {
        // A knock with the back of the knife, a turn to look, its tray.
        const to: V = [CT.trays[2], CT.trayY + 0.05, CT.trayZ];
        const p = u < 0.5 ? lerpV(CT.basket, add(board, 0.1, 0.1, 0.04), sm(u, 0.05, 0.45)) : lerpV(add(board, 0.1, 0.1, 0.04), to, sm(u, 0.55, 0.85));
        return { r: add(p, 0.02, 0.04, 0.03), gr: 0.85, l: steady, gl: 0.4, nod: 0.36, props: { conch: u < 0.88 ? p : null }, n };
      }
      case 'weed': {
        const to: V = [CT.trays[3], CT.trayY + 0.03, CT.trayZ];
        const p = lerpV(add(CT.basket, 0.1, 0, 0), to, sm(u, 0.1, 0.85));
        return { r: add(p, 0.03, 0.05, 0.03), gr: 0.75, l: add(p, -0.06, 0.05, 0.03), gl: 0.75, nod: 0.36, lean: 0.1, props: { weed: u < 0.88 ? p : null }, n };
      }
      default: {
        // The hose over the board and along the table.
        const h: V = [0.02 + 0.3 * Math.sin(c.t * 1.8), 1.12, 0.22];
        return { r: h, gr: 0.9, l: c.bd(0.2, 0.56 * c.H, 0.1), nod: 0.42, props: { hose: h }, n: { ...n, water: 1, waterX: h[0] } };
      }
    }
  },
};
const BRIEF_SEQ: Seq = [['greet', 1.8, 0.5], ['vest', 3.2, 0.6], ['tewak', 3.2, 0.6], ['whistle', 2.8, 0.6], ['sea', 3.2, 0.9], ['breath', 3.4, 0.5], ['thumb', 2.0, 0.6]];
const BRIEF: Script = {
  seq: BRIEF_SEQ,
  // In front of the table, turned out to the two of them; round to point out at the water.
  at: (k) => (k === 'sea' ? st(0.1, CT.stand + 0.14, PI * 0.92) : st(0.06, CT.stand + 0.06, 0)),
  key(k, u, c): Key {
    const n: Record<string, number> = { visitors: 1, nod0: 0, nod1: 0, try: 0, up: 0 };
    const front = c.bd(0, 0.66 * c.H, 0.28);
    switch (k) {
      case 'greet':
        return { nod: 0.3 * Math.sin(u * PI), lean: 0.14 * Math.sin(u * PI), n: { ...n, nod0: Math.sin(u * PI), nod1: Math.sin(u * PI) } };
      case 'vest': {
        // The orange vest held up by its shoulders; a strap tugged.
        const v = add(front, 0, 0.08, 0.02);
        return { l: add(v, 0.15, 0.16, 0), r: add(v, -0.15 + 0.04 * Math.sin(c.t * 5) * sm(u, 0.5, 0.7), 0.16 - 0.14 * sm(u, 0.5, 0.7), 0), gl: 0.85, gr: 0.85, nod: 0.18, props: { vest: v }, n: { ...n, nod0: Math.abs(Math.sin(c.t * 1.6)) * 0.5 } };
      }
      case 'tewak': {
        // A tewak in both arms: this holds you up, stay by it.
        const p = add(front, 0, 0.0, 0.08);
        return { l: add(p, 0.16, 0.02, 0), r: add(p, -0.16, 0.02, 0), gl: 0.7, gr: 0.7, nod: 0.12, props: { tewak: p }, n: { ...n, nod1: Math.abs(Math.sin(c.t * 1.8)) * 0.5 } };
      }
      case 'whistle': {
        const lip = c.bd(0, 0.86 * c.H, 0.12);
        const b = sm(u, 0.2, 0.4) * (1 - sm(u, 0.8, 1));
        const h = lerpV(c.bd(-0.14, 0.66 * c.H, 0.2), lip, b);
        return { r: h, gr: 0.85, l: c.bd(0.2, 0.56 * c.H, 0.1), nod: -0.03, props: { whistle: h }, n: { ...n, blown: b } };
      }
      case 'sea':
        return { r: c.bd(-0.24, 0.82 * c.H, 0.5), gr: 0.15, palms: 0.5, nod: -0.04, n: { ...n, nod0: 0.4, nod1: 0.4 } };
      case 'breath': {
        // Both hands up with the breath in, down with it out; the two of them doing it too.
        const b = 0.5 + 0.5 * Math.sin(c.t * 2.2);
        return { l: c.bd(0.18, 0.62 * c.H + 0.2 * b, 0.2), r: c.bd(-0.18, 0.62 * c.H + 0.2 * b, 0.2), gl: 0.1, gr: 0.1, palms: 1, nod: 0.02, n: { ...n, try: b } };
      }
      default: {
        const up = sm(u, 0.1, 0.35) * (1 - sm(u, 0.85, 1));
        return { r: lerpV(c.bd(-0.2, 0.56 * c.H, 0.1), c.bd(-0.2, 0.92 * c.H, 0.26), up), gr: 0.8, nod: -0.02, n: { ...n, up } };
      }
    }
  },
};

// =============================================================================================
// 테왁·망사리 정리대 (tewakRack, 1 × 1): a low frame hung with tewak and nets, a stool in front of it.

export const TR = {
  stand: 0.62,
  peg: [0.1, 1.08, -0.1] as V,
  seat: [-0.02, 0.32, 0.48] as V,
  float: [0.26, 0.28, 0.34] as V,
};
const MEND_SEQ: Seq = [['take', 1.6, 0.7], ['sit', 0.3, 0.5], ['look', 2.2, 0.3], ['lace', 5.6, 0.4], ['bite', 1.0, 0.5], ['seam', 3.0, 0.8], ['hang', 1.8, 0.8]];
const MEND: Script = {
  seq: MEND_SEQ,
  at: (k) => (k === 'take' || k === 'hang' ? st(0.08, TR.stand) : sitAt(TR.seat[0], TR.seat[1], TR.seat[2])),
  key(k, u, c): Key {
    const n: Record<string, number> = { laced: c.p('lace', 0.02, 0.98), off: 0, squeeze: 0 };
    const lap = c.bd(0, 0.64, 0.3);
    switch (k) {
      case 'take': {
        const p = lerpV(TR.peg, c.bd(0, 0.6 * c.H, 0.24), sm(u, 0.15, 0.9));
        return { l: add(p, 0.12, 0.02, 0), r: add(p, -0.12, 0.02, 0), gl: 0.85, gr: 0.85, nod: 0.1, props: { net: p }, n: { ...n, off: sm(u, 0.1, 0.3) } };
      }
      case 'sit':
        return { l: add(lap, 0.12, 0.03, 0), r: add(lap, -0.12, 0.03, 0), gl: 0.7, gr: 0.7, nod: 0.3, props: { net: lap }, n: { ...n, off: 1 } };
      case 'look': {
        // Spread in both hands and held to the light, the torn place found.
        const p = add(lap, 0, 0.12 + 0.05 * Math.sin(u * PI), 0.04);
        return { l: add(p, 0.14, 0.04, 0), r: add(p, -0.14, 0.04, 0), gl: 0.8, gr: 0.8, nod: 0.26, props: { net: p }, n: { ...n, off: 1 } };
      }
      case 'lace': {
        // The needle through, round, drawn up tight: the left hand holds the place.
        const beat = (u * 18) % 1;
        const o = add(lap, -0.07 + 0.14 * ((u * 3) % 1), 0.08, 0.02);
        const r: V = beat < 0.5 ? add(o, 0.03, 0.03 - beat * 0.1, 0.02) : add(o, 0.05 + (beat - 0.5) * 0.24, -0.02 + (beat - 0.5) * 0.18, 0.05);
        return { r, gr: 0.9, l: add(o, -0.08, 0.02, 0), gl: 0.85, nod: 0.46, lean: 0.1, props: { net: lap, needle: add(r, -0.01, 0.02, 0) }, n: { ...n, off: 1 } };
      }
      case 'bite':
        return { r: c.bd(-0.02, 0.88, 0.12), gr: 0.85, l: add(lap, 0, 0.08, 0.02), gl: 0.7, nod: 0.06, props: { net: lap }, n: { ...n, off: 1 } };
      case 'seam': {
        // The float's seam squeezed between the hands and knocked with a knuckle.
        const p = TR.float;
        const q = Math.abs(Math.sin(c.t * 4));
        return { l: add(p, 0.14, 0.05, 0), r: add(p, -0.14, 0.05, 0.02), gl: 0.7, gr: 0.7, nod: 0.5, lean: 0.34, props: { net: lap }, n: { ...n, off: 1, squeeze: q } };
      }
      default: {
        const p = lerpV(c.bd(0, 0.6 * c.H, 0.24), TR.peg, sm(u, 0.1, 0.85));
        return { l: add(p, 0.12, 0.02, 0), r: add(p, -0.12, 0.02, 0), gl: 0.85, gr: 0.85, nod: 0.08, props: { net: u < 0.9 ? p : null }, n: { ...n, off: 1 - sm(u, 0.85, 0.95) } };
      }
    }
  },
};

// =============================================================================================
// 고무옷 건조대 (hySuitLine, 3 × 1): two posts and a line, black suits on hangers, flippers pegged underneath, a tub.

export const SL = {
  stand: 0.62,
  line: 1.62,
  low: 0.94,
  z: -0.08,
  tub: [-1.0, 0.42, 0.26] as V,
  /** Where the suit being hung goes, and the flippers. */
  slot: [0.46, 1.62, -0.08] as V,
  fins: [-0.1, 0.94, -0.08] as V,
  crate: [1.08, 0.38, 0.28] as V,
};
const SUIT_SEQ: Seq = [['dip', 3.0, 0.3], ['wring', 2.2, 0.8], ['hang', 2.2, 0.9], ['fins', 2.6, 0.8], ['sprig', 1.8, 0.9]];
const SUIT: Script = {
  seq: SUIT_SEQ,
  at(k) {
    if (k === 'dip' || k === 'wring') return st(-0.74, SL.stand);
    if (k === 'hang') return st(0.34, SL.stand);
    if (k === 'fins') return st(-0.2, SL.stand);
    return st(0.92, SL.stand);
  },
  key(k, u, c): Key {
    const n: Record<string, number> = { hung: c.p('hang', 0.7, 0.8), pegged: c.p('fins', 0.6, 0.8), inTub: k === 'dip' ? 1 : 0, slosh: 0, drip: 0, wring: 0 };
    switch (k) {
      case 'dip': {
        // Pushed down and swirled in the fresh water, the salt out.
        const a = c.t * 4;
        const h = add(SL.tub, 0.1 * Math.cos(a), 0.04 + 0.06 * Math.abs(Math.sin(c.t * 3)), 0.06 * Math.sin(a));
        return { r: add(h, 0.1, 0, 0), l: add(h, -0.1, 0, 0), gl: 0.85, gr: 0.85, crouch: 0.66, nod: 0.5, lean: 0.14, n: { ...n, slosh: 1 } };
      }
      case 'wring': {
        const a = Math.sin(c.t * 5);
        const p = c.bd(0, 0.62 * c.H, 0.26);
        return { l: add(p, 0.09 * a, 0.1, 0), r: add(p, -0.09 * a, -0.08, 0), gl: 0.95, gr: 0.95, nod: 0.26, props: { rolled: p }, n: { ...n, drip: 1, wring: a } };
      }
      case 'hang': {
        const up = sm(u, 0.1, 0.65);
        const p = lerpV(c.bd(0, 0.62 * c.H, 0.26), SL.slot, up);
        return { l: add(p, 0.1, -0.02, 0.02), r: add(p, -0.1, -0.02, 0.02), gl: 0.85, gr: 0.85, nod: -0.1 * up, props: { suit: u < 0.75 ? p : null }, n: { ...n, drip: 1 } };
      }
      case 'fins': {
        const p = lerpV(add(SL.crate, -0.1, 0.05, 0), SL.fins, sm(u, 0.1, 0.6));
        return { l: add(p, -0.08, 0.1, 0.02), gl: 0.85, r: add(p, 0.08, 0.1, 0.02), gr: 0.85, crouch: 0.5 * (1 - sm(u, 0.1, 0.5)), nod: 0.26, props: { fins: u < 0.65 ? p : null }, n };
      }
      default:
        // The crate of boots squared up with a foot and a hand.
        return { r: add(SL.crate, 0.02 * Math.sin(c.t * 6), 0.14, 0.04), gr: 0.7, l: c.bd(0.2, 0.56 * c.H, 0.1), crouch: 0.42, nod: 0.42, n };
    }
  },
};

// =============================================================================================
// 물때 달력 (hyTide, 2 × 1): a wooden board by the sea with a month of lunar days, a magnet on today, a slate.

export const TC = {
  stand: 0.62,
  z: 0.05,
  moon: [-0.62, 1.62, 0.05] as V,
  /** The month's grid: its top left, and the cell's size. */
  grid: [-0.74, 1.384, 0.05] as V,
  cell: [0.21, 0.1625] as [number, number],
  /** Yesterday's magnet and today's. */
  from: [1, 2] as [number, number],
  to: [2, 2] as [number, number],
  slate: [0.68, 1.0, 0.05] as V,
  chalk: [0.42, 0.76, 0.1] as V,
  sign: [0.74, 1.58, 0.05] as V,
};
export const tcCell = (col: number, row: number): V => [TC.grid[0] + col * TC.cell[0], TC.grid[1] - row * TC.cell[1], TC.z + 0.015];
const TIDE_SEQ: Seq = [['moon', 2.6, 0.5], ['count', 3.4, 0.5], ['magnet', 1.8, 0.8], ['chalk', 3.6, 0.7], ['sign', 2.2, 0.8]];
const TIDEC: Script = {
  seq: TIDE_SEQ,
  at: (k) => (k === 'moon' || k === 'count' || k === 'magnet' ? st(-0.36, TC.stand) : st(0.5, TC.stand)),
  key(k, u, c): Key {
    const n: Record<string, number> = { moved: c.p('magnet', 0.1, 0.9), hours: c.p('chalk', 0.1, 0.9), sign: c.p('sign', 0.4, 0.7), cell: -1 };
    const rest: Partial<Key> = { l: c.bd(0.2, 0.56 * c.H, 0.1) };
    switch (k) {
      case 'moon':
        return { ...rest, r: add(TC.moon, 0.02 + 0.015 * Math.sin(c.t * 5), -0.02, 0.05), gr: 0.2, nod: -0.14, n };
      case 'count': {
        // A finger along the days: seven-mul, eight-mul.
        const i = Math.floor(u * 4);
        const cell = tcCell(i, 2);
        return { ...rest, r: add(cell, 0.03, -0.01, 0.04 + 0.01 * Math.sin(c.t * 14)), gr: 0.2, nod: -0.02, n: { ...n, cell: i } };
      }
      case 'magnet': {
        const p = lerpV(tcCell(...TC.from), tcCell(...TC.to), sm(u, 0.15, 0.85));
        return { ...rest, r: add(p, 0.02, -0.01, 0.03), gr: 0.75, nod: -0.02, n };
      }
      case 'chalk': {
        const h = writing(add(TC.slate, 0, 0.0, 0.03), c.t, u, 0.26);
        return { ...rest, r: h, gr: 0.8, nod: 0.08, props: { chalk: h }, n };
      }
      default: {
        // The sign turned over on its hook.
        const a = sm(u, 0.2, 0.8);
        return { ...rest, r: add(TC.sign, 0.08 - 0.16 * a, -0.04 + 0.06 * Math.sin(a * PI), 0.06), gr: 0.8, nod: -0.12, n };
      }
    }
  },
};

// =============================================================================================
// 망사리 저울 (hyScale, 2 × 1): a low iron frame with a dial scale on its hook, nets waiting, a ledger stand, a bin.

export const WS = {
  stand: 0.62,
  hook: [-0.38, 1.02, 0.02] as V,
  dial: [-0.38, 1.26, 0.09] as V,
  waiting: [-0.84, 0.2, 0.26] as V,
  bin: [0.84, 0.46, 0.04] as V,
  book: [0.26, 0.92, 0.1] as V,
  elder: [1.3, 0.46] as [number, number],
};
const WEIGH_SEQ: Seq = [['lift', 2.2, 0.5], ['read', 3.0, 0.4], ['call', 1.8, 0.8], ['write', 3.6, 0.7], ['down', 2.4, 0.8], ['tag', 1.6, 0.8]];
const WEIGH: Script = {
  seq: WEIGH_SEQ,
  at(k) {
    if (k === 'lift' || k === 'read' || k === 'call') return st(-0.42, WS.stand);
    if (k === 'write') return st(0.22, WS.stand);
    return st(0.5, WS.stand);
  },
  key(k, u, c): Key {
    const onHook = add(WS.hook, 0, -0.24, 0.02);
    const n: Record<string, number> = { kilos: 0, written: c.p('write', 0.05, 0.95), tagged: c.p('tag', 0.4, 0.8), hNod: 0, sway: 0 };
    switch (k) {
      case 'lift': {
        const p = lerpV(WS.waiting, onHook, sm(u, 0.15, 0.9));
        return { l: add(p, 0.14, 0.18, 0.02), r: add(p, -0.14, 0.18, 0.02), gl: 0.95, gr: 0.95, crouch: 0.72 * (1 - sm(u, 0.2, 0.8)), nod: 0.36, lean: 0.1, props: { net: p }, n: { ...n, kilos: sm(u, 0.85, 1) * 0.5, sway: 1 } };
      }
      case 'read':
        // The needle swings and settles; a hand steadies the bag.
        return { l: add(onHook, 0.12, 0.05, 0.08), gl: 0.5, r: add(WS.dial, 0.03, -0.03, 0.05), gr: 0.2, nod: 0.05, props: { net: onHook }, n: { ...n, kilos: 1, sway: 1 - sm(u, 0, 0.7) } };
      case 'call':
        return { l: c.bd(0.2, 0.56 * c.H, 0.1), r: c.bd(-0.2, 0.88 * c.H, 0.26), gr: 0.25, palms: 0.5, nod: -0.05, props: { net: onHook }, n: { ...n, kilos: 1, hNod: Math.abs(Math.sin(u * PI * 2)) } };
      case 'write': {
        const pen = writing(add(WS.book, 0.0, 0.02, 0), c.t, u, 0.14);
        return { r: pen, gr: 0.8, l: add(WS.book, -0.16, 0.0, 0), gl: 0.3, nod: 0.42, lean: 0.08, props: { net: onHook, pen: add(pen, 0, 0.03, 0.01) }, n: { ...n, kilos: 1 } };
      }
      case 'down': {
        const p = lerpV(onHook, add(WS.bin, 0, 0.18, 0), sm(u, 0.1, 0.8));
        return { l: add(p, -0.14, 0.18, 0.02), r: add(p, 0.14, 0.18, 0.02), gl: 0.95, gr: 0.95, nod: 0.3, lean: 0.12, props: { net: u < 0.88 ? p : null }, n: { ...n, kilos: 1 - sm(u, 0.1, 0.3) } };
      }
      default:
        return { r: add(WS.bin, -0.1 + 0.02 * Math.sin(c.t * 9), 0.05, 0.3), gr: 0.75, l: add(WS.bin, -0.22, 0.05, 0.28), gl: 0.5, crouch: 0.3, nod: 0.44, n };
    }
  },
};

// =============================================================================================
// 미역 건조대 (hyWeed, 3 × 1): a low frame of poles and netting, strands of brown laid along it, a basket.

export const SW = {
  stand: 0.62,
  top: 0.62,
  /** The strands laid in a round, their x. */
  xs: [-0.66, -0.22, 0.22, 0.66] as const,
  basket: [-1.18, 0.32, 0.46] as V,
};
const WEED_SEQ: Seq = [['p0', 1.8, 0.5], ['p1', 1.8, 0.5], ['p2', 1.8, 0.5], ['p3', 1.8, 0.7], ['turn', 3.2, 0.8], ['feel', 2.6, 1.0]];
const WEED: Script = {
  seq: WEED_SEQ,
  at(k) {
    const m = /^p(\d)$/.exec(k);
    if (m) return st(SW.xs[+m[1]] - 0.08, SW.stand);
    if (k === 'turn') return st(-0.72, SW.stand);
    return st(1.0, SW.stand);
  },
  key(k, u, c): Key {
    const n: Record<string, number> = { laid: WEED_SEQ.slice(0, 4).reduce((s, [q]) => s + c.p(q, 0.72, 0.8), 0), turn: 0, feel: 0 };
    const m = /^p(\d)$/.exec(k);
    if (m) {
      // A strand drawn off the arm and shaken out along the frame.
      const to: V = [SW.xs[+m[1]], SW.top + 0.06, -0.02];
      const low = c.bd(0.24, 0.44 * c.H, 0.14);
      const h = lerpV(add(low, 0, 0.08, 0.05), add(to, 0, 0.06, 0.1), sm(u, 0.2, 0.74));
      return { r: h, gr: 0.8, l: add(low, 0, 0.1, 0), gl: 0.8, crouch: 0.3 + 0.26 * sm(u, 0.3, 0.7), nod: 0.5, lean: 0.14, props: { strand: u < 0.78 ? add(h, 0, -0.06, 0) : null, basket: low }, n };
    }
    if (k === 'turn') {
      // Along the frame, each strand lifted and laid over.
      const x = -1.0 + 0.6 * u;
      return { r: [x + 0.1, SW.top + 0.1 + 0.08 * Math.abs(Math.sin(c.t * 5)), 0.0], gr: 0.7, l: [x - 0.1, SW.top + 0.06, 0.02], gl: 0.5, crouch: 0.46, nod: 0.5, lean: 0.14, n: { ...n, turn: 1, turnX: x } };
    }
    // Between finger and thumb: not ready yet.
    return { r: [1.0 + 0.03 * Math.sin(c.t * 4), SW.top + 0.12, 0.0], gr: 0.6, l: c.bd(0.2, 0.56 * c.H, 0.1), crouch: 0.44, nod: 0.5, n: { ...n, feel: 1 } };
  },
};

// =============================================================================================
// 해산물 카운터 (hyCounter, 3 × 1): a low counter with a glass case of the catch, its knife and board behind, two stools
// in front; the dweller takes the order in front and goes round the end to the back.

export const HC = {
  top: 0.92,
  stand: 0.62,
  back: -0.68,
  end: 1.76,
  stool: [0.62, 0.46, 0.62] as V,
  /** The board, plate and till along the counter's top. */
  board: [-0.5, 0.94, -0.12] as V,
  plate: [0.1, 0.95, -0.02] as V,
  served: [0.62, 0.95, 0.2] as V,
  till: [-1.14, 1.04, -0.08] as V,
  catchBox: [-0.5, 1.02, 0.14] as V,
};
const SERVE_SEQ: Seq = [['order', 2.8, 0.8], ['o1', 0.02, 0.9], ['o2', 0.02, 1.0], ['take', 1.6, 0.4], ['slice', 3.6, 0.6], ['plate', 2.0, 0.7], ['pass', 2.2, 1.1], ['till', 2.2, 0.9], ['wipe', 2.6, 1.0], ['b2', 0.02, 0.9], ['b1', 0.02, 0.9]];
const SERVE: Script = {
  seq: SERVE_SEQ,
  at(k) {
    if (k === 'order') return st(0.08, HC.stand, Math.PI * 0.6);
    if (k === 'o1' || k === 'b1') return st(-HC.end, HC.stand, k === 'o1' ? PI : PI / 2);
    if (k === 'o2' || k === 'b2') return st(-HC.end, HC.back, k === 'o2' ? PI / 2 : 0);
    if (k === 'till') return st(-1.14, HC.back, 0);
    if (k === 'pass') return st(0.56, HC.back, 0);
    if (k === 'plate') return st(0.04, HC.back, 0);
    if (k === 'wipe') return st(0.1, HC.back, 0);
    return st(-0.5, HC.back, 0);
  },
  key(k, u, c): Key {
    const n: Record<string, number> = { customer: 1, cNod: 0, onPlate: c.p('plate', 0.2, 0.8) * (1 - c.p('b2', 0, 0.1)), served: c.p('pass', 0.7, 0.85), slices: 0, eat: 0, paid: c.p('till', 0.4, 0.6), wiped: 0 };
    const board = HC.board;
    switch (k) {
      case 'order': {
        // A pad, the order taken from the one on the stool.
        const pad = c.bd(0.1, 0.64 * c.H, 0.22);
        const pen = writing(add(pad, 0, 0.02, 0.02), c.t, u, 0.08);
        return { l: add(pad, 0.02, -0.03, 0), gl: 0.8, r: pen, gr: 0.75, nod: 0.26, props: { pad }, n: { ...n, cNod: Math.abs(Math.sin(c.t * 2)) } };
      }
      case 'take': {
        // The lid up on the case, an abalone out.
        const p = lerpV(HC.catchBox, add(board, 0, 0.04, 0), sm(u, 0.2, 0.85));
        return { r: add(p, 0.02, 0.05, -0.02), gr: 0.8, l: add(HC.catchBox, -0.2, 0.12, 0), gl: 0.5, nod: 0.36, props: { abalone: p }, n: { ...n, lid: Math.sin(u * PI) } };
      }
      case 'slice': {
        const s = Math.abs(Math.sin(c.t * 7));
        const x = -0.1 + 0.2 * u;
        const h = add(board, x, 0.05 + 0.05 * s, -0.01);
        return { r: h, gr: 0.9, l: add(board, -0.16, 0.03, 0.0), gl: 0.8, nod: 0.5, lean: 0.14, props: { knife: h, abalone: add(board, -0.02, 0.04, 0) }, n: { ...n, slices: u } };
      }
      case 'plate': {
        const p = lerpV(add(board, 0.04, 0.03, 0), add(HC.plate, 0, 0.03, 0), sm(u, 0.1, 0.7));
        return { r: add(p, 0.03, 0.03, -0.03), gr: 0.75, l: add(HC.plate, -0.14, 0.02, -0.03), gl: 0.6, nod: 0.42, lean: 0.08, props: { sliced: p }, n: { ...n, slices: 1 } };
      }
      case 'pass': {
        const p = lerpV(HC.plate, HC.served, sm(u, 0.1, 0.75));
        return { l: add(p, -0.1, 0.03, -0.04), r: add(p, 0.1, 0.03, -0.04), gl: 0.7, gr: 0.7, nod: 0.26, lean: 0.14, props: { dish: p }, n: { ...n, cNod: u > 0.7 ? 1 : 0 } };
      }
      case 'till':
        return { r: add(HC.till, 0.03 * Math.sin(c.t * 8), 0, -0.05), gr: 0.3, tap: true, l: c.bd(0.2, 0.56 * c.H, 0.1), nod: 0.26, n: { ...n, eat: 1 } };
      case 'wipe': {
        const h: V = [0.1 + 0.4 * Math.sin(c.t * 2.4), HC.top + 0.03, -0.1 + 0.1 * Math.cos(c.t * 4.8)];
        return { r: h, gr: 0.6, l: c.bd(0.22, 0.6 * c.H, 0.14), nod: 0.42, lean: 0.14, props: { cloth: h }, n: { ...n, eat: 1, wiped: u } };
      }
      default:
        return { nod: 0.08, n };
    }
  },
};

const SCRIPTS: Record<HyMotion, Script> = {
  hyDive: diveScript(false), hySeason: diveScript(true), hyReadSea: READSEA, hyWarm: WARM, hyLearn: LEARN, hyRules: RULES, hyClean: CLEAN, hyBrief: BRIEF, hyMend: MEND, hySuit: SUIT, hyTideMark: TIDEC, hyWeigh: WEIGH, hyWeed: WEED, hyServe: SERVE,
};
