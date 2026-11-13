import * as THREE from 'three';
import { ASANAS, type Asana, type AsanaKey } from '../asana';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';
// Its table of poses (dnBow, dnArmsCross, dnClap...) goes into ASANAS when it loads; a comedian's bow is a dancer's bow.
import './dancerMotion';

/*
 * A 코미디언's work at the 코미디 클럽 공연장 (2026-11-01, the workplace pipeline, at the user's request).
 * As at the 댄스 스튜디오, each use is a script: a round of beats with where the dweller is, the hands, and
 * what moves; the piece reads the same script by the same clock (entertainer.ts).
 *
 * The heart of stand-up here is the microphone and the pause: it comes off its stand into the right hand, the
 * mouth stays at it, the left hand does the talking, the feet cross the deck between bits, and after every
 * punchline the mic drops to the chest and they wait for the room (EN_NOW tells the tables how it's going).
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front).
 */
export type EnMotion =
  | 'enBit' | 'enCoach'
  | 'enRehearse' | 'enHeadline' | 'enOpening' | 'enLineup'
  | 'enWrite' | 'enPunch'
  | 'enBarTalk' | 'enGreen' | 'enCards' | 'enSound';
export const EN_MOTIONS = new Set<string>(['enBit', 'enCoach', 'enRehearse', 'enHeadline', 'enOpening', 'enLineup', 'enWrite', 'enPunch', 'enBarTalk', 'enGreen', 'enCards', 'enSound']);

const frac = (x: number) => ((x % 1) + 1) % 1;
export const enPhase = (p: THREE.Vector3) => frac(p.x * 0.331 + p.z * 0.547);
type Seq = Array<[string, number, number?]>;
const add = (a: V, x: number, y: number, z: number): V => [a[0] + x, a[1] + y, a[2] + z];
const lerpV = (a: V, b: V, e: number): V => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];
const mixN = (a: number, b: number, e: number) => a + (b - a) * e;
const wob = (t: number, hz: number, ph = 0) => Math.sin((t * hz + ph) * Math.PI * 2);

// ---------------------------------------------------------------------------------------------
// A comedian's own few poses (the same reckoning as dancerMotion's: an arm [up from level, forward, elbow], a leg
// [forward, out, knee, toes, turned out]). The arms of most of these come by reach.

type E3 = [number, number, number];
type Arm = [number, number, number];
type Leg = [number, number, number, number, number];
const DOWN: Arm = [-1.25, 0.02, 0.15];
const STD: Leg = [0, 0.05, 0.04, 0, 0.05];
function P(o: { hip?: E3; hips?: E3; spine?: E3; chest?: E3; neck?: E3; aL?: Arm; aR?: Arm; L?: Leg; R?: Leg }): Asana {
  const p = o.hips?.[0] ?? 0;
  const [lf, lo, lk, lp, lt] = o.L ?? STD;
  const [rf, ro, rk, rp, rt] = o.R ?? STD;
  const [lae, laf, lab] = o.aL ?? DOWN;
  const [rae, raf, rab] = o.aR ?? DOWN;
  const bones: Asana['bones'] = {
    leftUpperLeg: [-(lf + p), lt, lo], rightUpperLeg: [-(rf + p), -rt, -ro],
    leftLowerLeg: [lk, 0, 0], rightLowerLeg: [rk, 0, 0],
    leftFoot: [lf - lk + lp, 0, -lo * 0.6], rightFoot: [rf - rk + rp, 0, ro * 0.6],
    leftUpperArm: [0, -laf, lae], rightUpperArm: [0, raf, -rae],
    leftLowerArm: [0, -lab, 0], rightLowerArm: [0, rab, 0],
  };
  if (o.hips) bones.hips = o.hips;
  if (o.spine) bones.spine = o.spine;
  if (o.chest) bones.chest = o.chest;
  if (o.neck) bones.neck = o.neck;
  return { hip: o.hip ?? [0, 0.91, 0], bones };
}
Object.assign(ASANAS, {
  // Stood square, the feet apart: the stance of telling it.
  enStance: P({ L: [0, 0.14, 0.05, 0, 0.12], R: [0, 0.14, 0.05, 0, 0.12] }),
  // Bent over laughing.
  enLaugh: P({ hip: [0, 0.88, 0], hips: [0.42, 0, 0], spine: [0.14, 0, 0], neck: [-0.1, 0, 0], L: [0.12, 0.1, 0.25, 0, 0.1], R: [0.12, 0.1, 0.25, 0, 0.1] }),
  // Acting out someone old and creaking: knees bent, back rounded.
  enOldMan: P({ hip: [0, 0.77, 0], hips: [0.34, 0, 0], spine: [0.22, 0, 0], chest: [0.2, 0, 0], neck: [-0.35, 0, 0], L: [0.45, 0.12, 0.88, 0, 0.15], R: [0.3, 0.1, 0.62, 0, 0.1] }),
  // Acting out a boss: chest out, leaning back.
  enProud: P({ hips: [-0.08, 0, 0], chest: [-0.14, 0, 0], neck: [-0.18, 0, 0], L: [0.08, 0.16, 0.05, 0, 0.3], R: [0, 0.16, 0.05, 0, 0.3] }),
  // Dead on the floor of a joke that didn't land: hunched, head down.
  enDeflate: P({ hips: [0.08, 0, 0], spine: [0.2, 0, 0], chest: [0.2, 0, 0], neck: [0.32, 0, 0] }),
  // A little crouch at the deck: tape going down.
  enTape: P({ hip: [0, 0.48, 0], hips: [0.42, 0, 0], neck: [0.25, 0, 0], L: [1.0, 0.16, 1.85, 0, 0.1], R: [0.6, 0.16, 1.5, 0.3, 0.1] }),
});
/** A whole-body pose held, or being gone into. */
interface Hold {
  from: string;
  to: string;
  e: number;
}
const hold = (to: string, from = to, e = 1): Hold => ({ from, to, e });

// ---------------------------------------------------------------------------------------------
// The script engine.

export interface St {
  x: number;
  y: number;
  z: number;
  yaw: number;
  sit?: boolean;
  floor?: number;
}
const st = (x: number, y: number, z: number, yaw: number, more: Partial<St> = {}): St => ({ x, y, z, yaw, ...more });
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
  d?: Hold;
  props?: Record<string, V | null | undefined>;
  n?: Record<string, number>;
}
interface Ctx {
  t: number;
  H: number;
  st: St;
  /** A point from the body: to their left, up from the feet (or the seat), ahead. */
  bd(side: number, up: number, ahead: number): V;
}
interface Script {
  seq: Seq;
  at(k: string): St;
  key(k: string, u: number, c: Ctx): Key;
}
export interface EnNow {
  b: Beat;
  st: St;
  walking: boolean;
  key: Key;
  props: Record<string, V | null>;
  n: Record<string, number>;
}
function evalKey(s: Script, k: string, u: number, t: number, H: number): { st: St; key: Key } {
  const here = s.at(k);
  const fx = Math.sin(here.yaw);
  const fz = Math.cos(here.yaw);
  const lx = Math.cos(here.yaw);
  const lz = -Math.sin(here.yaw);
  const c: Ctx = { t, H, st: here, bd: (side, up, ahead) => [here.x + lx * side + fx * ahead, here.y + up, here.z + lz * side + fz * ahead] };
  return { st: here, key: s.key(k, u, c) };
}
const angle = (a: number, b: number, e: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * e;
function blendKey(a: Key, b: Key, e: number): Key {
  if (e <= 0) return a;
  const v = (x: V | undefined, y: V | undefined) => (x && y ? lerpV(x, y, e) : e < 0.5 ? x : y);
  const n = (x: number | undefined, y: number | undefined, d: number) => mixN(x ?? d, y ?? d, e);
  const d = a.d && b.d ? { from: a.d.to, to: b.d.from, e } : e < 0.5 ? a.d : b.d;
  return { l: v(a.l, b.l), r: v(a.r, b.r), lean: n(a.lean, b.lean, 0.03), nod: n(a.nod, b.nod, 0.05), palms: n(a.palms, b.palms, 0.4), gl: n(a.gl, b.gl, 0.3), gr: n(a.gr, b.gr, 0.3), crouch: n(a.crouch, b.crouch, 0), tap: e < 0.5 ? a.tap : b.tap, d };
}
/** Where a script has got to: the dweller, the hands, and everything the piece draws. */
export function enNow(m: EnMotion, t: number, ph: number, H = 1.6): EnNow {
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
  return { b, st: here, walking: e > 0 && e < 1 && dist > 0.12 && !here.sit, key: blendKey(A.key, B.key, e), props, n };
}
/** A dweller at a spot of a piece here: the whole body from the script. */
export function enPose(m: EnMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = enNow(m, t, enPhase(par.getWorldPosition(new THREE.Vector3())), height);
  const W = (v: V) => par.localToWorld(new THREE.Vector3(v[0], v[1], v[2]));
  const s = N.st;
  const k = N.key;
  const d = k.d;
  const at = W([s.x, s.y, s.z]);
  const dir = new THREE.Vector3(Math.sin(s.yaw), 0, Math.cos(s.yaw)).transformDirection(par.matrixWorld);
  const yaw = Math.atan2(dir.x, dir.z);
  let pose: BodyPose;
  if (s.sit) pose = { kind: 'sit', at, yaw, floor: W([s.x, s.floor ?? 0, s.z]).y };
  else if (N.walking) pose = { kind: 'walk', at, yaw };
  else if (d) pose = { kind: 'asana', at, yaw, floor: at.y, from: { key: d.from as AsanaKey, turn: 0 }, to: { key: d.to as AsanaKey, turn: 0 }, e: d.e };
  else pose = { kind: 'stand', at, yaw, crouch: k.crouch };
  return {
    pose,
    doing: {
      reach: { l: k.l && W(k.l), r: k.r && W(k.r), lean: k.lean ?? (d ? 0 : 0.03), nod: k.nod ?? (d ? 0 : 0.05), palms: k.palms ?? 0.4, grip: { l: k.gl ?? 0.3, r: k.gr ?? 0.3 }, tap: k.tap },
      crouch: !d && k.crouch ? k.crouch : undefined,
    },
  };
}
/** One key out of several: later ones win, their props and numbers added in. */
function K(...ks: Key[]): Key {
  const o: Key = {};
  for (const k of ks) {
    const { props, n, ...rest } = k;
    Object.assign(o, rest);
    if (props) o.props = { ...o.props, ...props };
    if (n) o.n = { ...o.n, ...n };
  }
  return o;
}

// ---------------------------------------------------------------------------------------------
// Things every comedian does.

/** The mic at the mouth in the right hand. Its grip and its tip, so the piece can lay it along the two. */
const micUp = (c: Ctx): Key => {
  const r = c.bd(-0.075, 0.755 * c.H, 0.2);
  return { r, gr: 0.92, palms: 0.2, props: { mic: r, tip: c.bd(-0.03, 0.84 * c.H, 0.12) } };
};
/** The mic let down to the chest: the wait after a line. */
const micDown = (c: Ctx): Key => {
  const r = c.bd(-0.13, 0.57 * c.H, 0.2);
  return { r, gr: 0.92, palms: 0.2, props: { mic: r, tip: c.bd(-0.11, 0.66 * c.H, 0.25) } };
};
/** Coming off (or going back on) a stand at `head`: the hand there, the mic with it. */
const micAtStand = (head: V, down: V): Key => ({ r: head, gr: 0.92, props: { mic: down, tip: head }, n: { taken: 1 } });
/** Left-hand talk: `size` from a small turn of the wrist to the whole arm out. */
const talking = (c: Ctx, size = 1): V => c.bd(0.24 + 0.1 * size * (0.5 + 0.5 * wob(c.t, 0.55)), (0.6 + 0.05 * size + 0.07 * size * wob(c.t, 0.85, 0.3)) * c.H, 0.22 + 0.08 * size * wob(c.t, 0.4, 0.1));
const hitLine = (c: Ctx, u: number): V => c.bd(0.3, (0.78 + 0.1 * sm(u, 0, 0.18) - 0.05 * sm(u, 0.3, 0.9)) * c.H, 0.3);
const atMouth = (c: Ctx, side = 0): V => c.bd(side, (c.st.sit ? 0.43 : 0.85) * c.H, 0.1);
const scribble = (a: V, u: number, w = 0.08, laps = 4): V => [a[0] + w * (frac(u * laps) - 0.5), a[1] + 0.008, a[2] + 0.005 * Math.sin(u * 60)];
const clapAt = (c: Ctx, up = 0.68): Pick<Key, 'l' | 'r' | 'gl' | 'gr' | 'palms'> => {
  const g = 0.03 + 0.05 * Math.abs(wob(c.t, 1.6));
  return { l: c.bd(g, up * c.H, 0.26), r: c.bd(-g, up * c.H, 0.26), gl: 0.15, gr: 0.15, palms: 0.05 };
};

// =============================================================================================
// 스탠드 마이크 (standupMic, 1 × 1): the mic out in front, the dweller behind it on the taped mark, facing the room.

export const MS = {
  stand: [0, 0, 0.24] as V,
  head: [0, 1.38, 0.13] as V,
  down: [0, 1.26, 0.2] as V,
  mark: [0, 0, -0.1] as V,
  book: [-0.4, 1.06, 0.14] as V,
  bottle: [0.36, 0, -0.34] as V,
  // The junior at the mic, and to one side when they're shown how.
  junior: [0, 0, -0.1] as V,
  aside: [-0.82, 0, -0.1] as V,
  coach: [0.82, 0, 0.0] as V,
};
const MK = () => st(MS.mark[0], 0, MS.mark[2], 0);
const ENBIT: Script = {
  seq: [['ready', 2.2], ['take', 1.2], ['setup', 4.2], ['build', 3.2], ['act', 2.6], ['punch', 1.5], ['wait', 2.6], ['flop', 1.6], ['check', 3.6, 0.8], ['note', 2.8], ['retry', 3.6, 0.8], ['punch2', 1.5], ['self', 2.4], ['sip', 3.0, 0.8], ['replace', 1.6]],
  at(k) {
    if (k === 'setup' || k === 'retry') return st(0.18, 0, -0.14, -0.18);
    if (k === 'build' || k === 'act' || k === 'punch' || k === 'wait' || k === 'flop') return st(-0.14, 0, -0.08, 0.18);
    if (k === 'punch2' || k === 'self') return st(0.14, 0, -0.12, -0.08);
    if (k === 'check' || k === 'note') return st(-0.28, 0, -0.1, -0.1);
    if (k === 'sip') return st(0.24, 0, -0.1, 2.6);
    return MK();
  },
  key(k, u, c): Key {
    switch (k) {
      case 'ready':
        // The stand's collar loosened and set to height; a breath.
        return K({ r: add(MS.down, 0, -0.06 + 0.08 * Math.sin(u * 6), -0.01), l: add(MS.down, 0, -0.24, 0), gl: 0.8, gr: 0.8, nod: 0.08, n: { taken: 0 } });
      case 'take':
        return K(micAtStand(lerpV(MS.head, c.bd(-0.07, 0.75 * c.H, 0.2), sm(u, 0.15, 0.9)), MS.down), { l: add(MS.down, 0, -0.24, 0), gl: 0.8, props: { mic: lerpV(MS.down, c.bd(-0.07, 0.75 * c.H, 0.2), sm(u, 0.15, 0.9)) } });
      case 'setup':
        return K(micUp(c), { l: talking(c, 0.6), gl: 0.2, nod: 0.03 + 0.03 * wob(c.t, 0.6), n: { taken: 1 } });
      case 'build':
        return K(micUp(c), { d: hold('enStance'), l: talking(c, 1.1), gl: 0.15, nod: 0.02 * wob(c.t, 1.1), n: { taken: 1 } });
      case 'act':
        // Being the old man from the story: the back goes, a hand on it.
        return K(micUp(c), { d: hold('enOldMan', 'enStance', sm(u, 0, 0.25)), l: c.bd(0.16, 0.48 * c.H, -0.12), gl: 0.6, n: { taken: 1 } });
      case 'punch':
        return K(micUp(c), { d: hold('enStance'), l: hitLine(c, u), gl: 0.1, palms: 0.1, nod: -0.05, n: { taken: 1 } });
      case 'wait':
        // The pause. The empty room gives nothing back.
        return K(micDown(c), { d: hold('dnStill'), l: c.bd(0.22, 0.56 * c.H, 0.14), gl: 0.4, nod: 0.02 + 0.03 * sm(u, 0.5, 1), n: { taken: 1 } });
      case 'flop':
        return K(micDown(c), { d: hold('enDeflate'), l: undefined, n: { taken: 1 } });
      case 'check':
      case 'note': {
        // To the notebook on its stand: a finger on the line, and it's changed.
        const line: V = add(MS.book, 0.02, 0.01, 0.0);
        const pen = scribble(line, u, 0.07, 4);
        return K(micDown(c), { l: k === 'check' ? add(line, 0.03 * Math.sin(u * 9), 0.02, 0.02) : pen, gl: k === 'check' ? 0.2 : 0.8, nod: 0.3, lean: 0.06, props: { pen: k === 'note' ? add(pen, 0, 0.05, 0) : null }, n: { taken: 1, inked: k === 'note' ? u : 0 } });
      }
      case 'retry':
        return K(micUp(c), { l: talking(c, 0.4), gl: 0.2, nod: 0.03 * wob(c.t, 0.6), n: { taken: 1, inked: 1 } });
      case 'punch2':
        return K(micUp(c), { d: hold('enProud'), l: hitLine(c, u), gl: 0.1, palms: 0.1, n: { taken: 1, inked: 1 } });
      case 'self':
        // It's funny now: bent over, a hand slapped on the thigh.
        return K(micDown(c), { d: hold('enLaugh'), l: c.bd(0.22, (0.42 + 0.04 * Math.abs(wob(c.t, 2.2))) * c.H, 0.26), gl: 0.15, n: { taken: 1, inked: 1 } });
      case 'sip': {
        const b = u < 0.22 ? lerpV(add(MS.bottle, 0, 0.09, 0), atMouth(c, 0.03), sm(u, 0.02, 0.22)) : u > 0.8 ? lerpV(atMouth(c, 0.03), add(MS.bottle, 0, 0.09, 0), sm(u, 0.8, 0.98)) : atMouth(c, 0.03);
        return K(micDown(c), { l: add(b, 0, -0.05, 0), gl: 0.9, crouch: u < 0.14 || u > 0.88 ? 0.8 : 0, nod: u > 0.25 && u < 0.78 ? -0.35 : 0.08, props: { bottle: b }, n: { taken: 1, inked: 1 } });
      }
      case 'replace':
        return K(micAtStand(lerpV(c.bd(-0.07, 0.75 * c.H, 0.2), MS.head, sm(u, 0.1, 0.8)), MS.down), { l: add(MS.down, 0, -0.24, 0), gl: 0.8, n: { taken: u < 0.85 ? 1 : 0, inked: 1 }, props: { mic: u < 0.85 ? lerpV(c.bd(-0.07, 0.75 * c.H, 0.2), MS.down, sm(u, 0.1, 0.8)) : null } });
      default:
        return {};
    }
  },
};

// 후배 코미디언 무대 코칭: the junior runs it, is stopped, is shown where the pause goes, and tries it again.
const ENCOACH: Script = {
  seq: [['watch', 4.6], ['wince', 1.6], ['stop', 1.8], ['cross', 0.4, 0.9], ['show', 3.4], ['pause', 2.2], ['hit', 1.4], ['explain', 3.0], ['back', 0.4, 0.9], ['again', 4.2], ['laugh', 2.0], ['clap', 2.6], ['shoulder', 2.4, 0.9]],
  at(k) {
    if (k === 'cross' || k === 'show' || k === 'pause' || k === 'hit') return MK();
    if (k === 'explain' || k === 'shoulder') return st(0.42, 0, -0.1, -Math.PI / 2);
    return st(MS.coach[0], 0, MS.coach[2], -1.45);
  },
  key(k, u, c): Key {
    // jr: 1 at the mic running it, 2 stood aside watching; jq: how well.
    switch (k) {
      case 'watch':
        return { d: hold('dnArmsCross'), nod: 0.04 * wob(c.t, 0.3), n: { jr: 1, jq: 0 } };
      case 'wince':
        return { d: hold('dnChin'), nod: 0.15, n: { jr: 1, jq: 0 } };
      case 'stop':
        return { d: hold('dnWave'), n: { jr: 3 } };
      case 'cross':
        return { n: { jr: 2 } };
      case 'show':
        return K(micUp(c), { l: talking(c, 0.7), gl: 0.2, nod: 0.03, n: { jr: 2, taken: 1 } });
      case 'pause':
        // Held up: one finger, wait for it.
        return K(micDown(c), { l: c.bd(0.22, 0.82 * c.H, 0.3), gl: 0.7, palms: 0.1, nod: 0.02, n: { jr: 2, taken: 1 } });
      case 'hit':
        return K(micUp(c), { d: hold('enProud'), l: hitLine(c, u), gl: 0.1, n: { jr: 2, taken: 1, jrLaugh: 1 } });
      case 'explain':
        return K({ l: c.bd(0.22, (0.66 + 0.06 * wob(c.t, 0.9)) * c.H, 0.28), r: c.bd(-0.2, (0.62 + 0.05 * wob(c.t, 0.7, 0.4)) * c.H, 0.24), gl: 0.15, gr: 0.15, palms: 0.2, n: { jr: 3 } });
      case 'back':
        return { n: { jr: 1 } };
      case 'again':
        return { d: hold('dnChin'), nod: 0.05, n: { jr: 1, jq: 1 } };
      case 'laugh':
        return { d: hold('enLaugh'), l: c.bd(0.2, 0.44 * c.H, 0.24), r: c.bd(-0.2, 0.44 * c.H, 0.24), n: { jr: 1, jq: 1 } };
      case 'clap':
        return { d: hold('enStance'), ...clapAt(c), n: { jr: 3 } };
      case 'shoulder':
        // A hand on the junior's shoulder.
        return { r: [MS.junior[0] + 0.14, 1.32, MS.junior[2] + 0.02], gr: 0.5, palms: 0.5, nod: 0.12 * Math.abs(wob(c.t, 1.1)), n: { jr: 3 } };
      default:
        return { n: { jr: 1 } };
    }
  },
};

// =============================================================================================
// 클럽 무대 (clubStage, 3 × 2): the deck is 0.35 up, the mic near its lip, the stool to the side.

const DH = 0.35;
export const SG = {
  h: DH,
  head: [0, DH + 1.5, 0.48] as V,
  down: [0, DH + 1.36, 0.54] as V,
  behind: st(0, DH, 0.2, 0),
  wing: st(-1.28, DH, 0.2, Math.PI / 2),
  stool: [0.75, DH + 0.76, 0.05] as V,
  water: [0.8, DH + 0.815, 0.05] as V,
  tape: [-0.55, DH + 0.002, 0.45] as V,
  sheet: [-1.0, DH + 0.002, -0.55] as V,
  mc: [-0.62, DH, 0.42] as V,
  mcOff: [-1.32, DH, 0.1] as V,
  guitar: [-0.95, DH, -0.15] as V,
  singer: [0.98, DH, 0.42] as V,
};
/** What the tables are given to go on: this frame's room (set by the stage, read by the rows of seats). */
export const EN_NOW = { house: 0, laugh: 0, clap: 0, pick: -1, heckle: 0, t: -1e9, wash: 0, washT: -1e9 };

const MIC_OFF_L = (c: Ctx, u: number): Key => K(micAtStand(lerpV(SG.head, c.bd(-0.07, 0.75 * c.H, 0.2), sm(u, 0.2, 0.9)), SG.down), { l: add(SG.down, 0, -0.26, 0), gl: 0.8, props: { mic: lerpV(SG.down, c.bd(-0.07, 0.75 * c.H, 0.2), sm(u, 0.2, 0.9)) } });
const MIC_ON_L = (c: Ctx, u: number): Key => K(micAtStand(lerpV(c.bd(-0.07, 0.75 * c.H, 0.2), SG.head, sm(u, 0.1, 0.8)), SG.down), { l: add(SG.down, 0, -0.26, 0), gl: 0.8, props: { mic: u < 0.85 ? lerpV(c.bd(-0.07, 0.75 * c.H, 0.2), SG.down, sm(u, 0.1, 0.8)) : null }, n: { taken: u < 0.85 ? 1 : 0 } });
const drink = (c: Ctx, u: number, home: V, side: number): Key => {
  const m = atMouth(c, side);
  const b = u < 0.24 ? lerpV(home, m, sm(u, 0.04, 0.24)) : u > 0.78 ? lerpV(m, home, sm(u, 0.78, 0.98)) : m;
  return { l: add(b, 0, -0.05, 0), gl: 0.9, nod: u > 0.26 && u < 0.76 ? -0.35 : 0.06, props: { glass: b } };
};

// 메인 공연하기: the walk on in the applause, three bits with their laughs, a word with a table, water, the big finish and the bow.
const ENHEADLINE: Script = {
  seq: [['enter', 2.0], ['take', 1.3, 0.8], ['hello', 2.8], ['bit1', 4.2, 0.9], ['laugh1', 2.2], ['bit2', 4.0, 1.1], ['act2', 2.6], ['laugh2', 2.6], ['crowd', 2.6, 0.9], ['listen', 1.8], ['reply', 2.2], ['laugh3', 2.2], ['water', 3.2, 0.9], ['bit3', 4.0, 1.2], ['build', 2.6], ['punch', 1.4], ['roar', 3.4], ['thanks', 2.0, 0.9], ['replace', 1.4, 0.9], ['bow', 2.4], ['wave', 2.6], ['off', 0.6, 1.2]],
  at(k) {
    switch (k) {
      case 'enter':
      case 'off':
        return SG.wing;
      case 'take':
      case 'hello':
      case 'replace':
        return SG.behind;
      case 'bit1':
      case 'laugh1':
        return st(-0.42, DH, 0.3, 0.14);
      case 'bit2':
      case 'act2':
      case 'laugh2':
        return st(0.5, DH, 0.34, -0.14);
      case 'crowd':
      case 'listen':
      case 'reply':
      case 'laugh3':
        return st(0.42, DH, 0.72, -0.5);
      case 'water':
        return st(0.6, DH, 0.34, 2.69);
      case 'bit3':
      case 'build':
      case 'punch':
      case 'roar':
        return st(-0.2, DH, 0.34, 0.05);
      default:
        return st(-0.62, DH, 0.66, 0.05);
    }
  },
  key(k, u, c): Key {
    const room = (laugh: number, clap = 0, more: Record<string, number> = {}) => ({ n: { house: 1, laugh, clap, taken: 1, beam: 1, ...more } });
    switch (k) {
      case 'enter':
        return { l: c.bd(0.3, 0.98 * c.H, 0.14), gl: 0.1, palms: 0.1, nod: -0.05, n: { house: 1, clap: 1, taken: 0, beam: 1 } };
      case 'take':
        return K(MIC_OFF_L(c, u), { n: { house: 1, clap: 1 - u * 0.7, beam: 1 } });
      case 'hello':
        return K(micUp(c), { l: c.bd(0.32 + 0.05 * wob(c.t, 1.2), 0.98 * c.H, 0.12), gl: 0.1, palms: 0.1, nod: -0.04 }, room(0, 1 - sm(u, 0.3, 0.9)));
      case 'bit1':
        return K(micUp(c), { d: hold('enStance'), l: talking(c, 0.9), gl: 0.2, nod: 0.03 * wob(c.t, 0.7) }, room(0.12 * sm(u, 0.75, 1)));
      case 'laugh1':
        return K(micDown(c), { d: hold('enStance'), l: c.bd(0.2, 0.6 * c.H, 0.18), gl: 0.3, nod: -0.04 }, room(1 - 0.5 * sm(u, 0.5, 1)));
      case 'bit2':
        return K(micUp(c), { l: talking(c, 1.15), gl: 0.15, nod: 0.03 * wob(c.t, 0.8) }, room(0.1));
      case 'act2':
        return K(micUp(c), { d: hold('enOldMan', 'enStance', sm(u, 0, 0.2)), l: c.bd(0.14, 0.48 * c.H, -0.12), gl: 0.6 }, room(0.55));
      case 'laugh2':
        return K(micDown(c), { d: hold('enLaugh', 'enOldMan', sm(u, 0, 0.3)), l: c.bd(0.2, 0.44 * c.H, 0.26), gl: 0.2 }, room(1, 0.25 * (1 - u)));
      case 'crowd':
        // Down to the lip, a finger out at a table: "어디서 오셨어요?"
        return K(micUp(c), { l: c.bd(0.22, 0.72 * c.H, 0.6), gl: 0.8, palms: 0.15, nod: 0.08 }, room(0.05, 0, { pick: 1 }));
      case 'listen':
        return K(micDown(c), { l: c.bd(0.16, 0.9 * c.H, 0.03), gl: 0.3, nod: 0.12 }, room(0.05, 0, { pick: 1, answer: 1 }));
      case 'reply':
        return K(micUp(c), { d: hold('enProud'), l: talking(c, 1), gl: 0.15 }, room(0.2, 0, { pick: 1 }));
      case 'laugh3':
        return K(micDown(c), { d: hold('enStance'), l: c.bd(0.24, 0.62 * c.H, 0.28), gl: 0.15, nod: -0.02 }, room(1 - 0.4 * u));
      case 'water':
        return K(micDown(c), drink(c, u, SG.water, 0.03), room(0.05));
      case 'bit3':
        return K(micUp(c), { d: hold('enStance'), l: talking(c, 0.8), gl: 0.2, nod: 0.03 * wob(c.t, 0.6) }, room(0.1 + 0.2 * u));
      case 'build':
        return K(micUp(c), { d: hold('enProud', 'enStance', sm(u, 0, 0.4)), l: talking(c, 1.3), gl: 0.15 }, room(0.35));
      case 'punch':
        return K(micUp(c), { d: hold('enStance', 'enProud', sm(u, 0, 0.2)), l: hitLine(c, u), gl: 0.1, palms: 0.1 }, room(0.1));
      case 'roar':
        return K(micDown(c), { d: hold('dnStill'), l: c.bd(0.22, 0.58 * c.H, 0.14), gl: 0.3, nod: -0.02 }, room(1, 0.7 * sm(u, 0.45, 0.9)));
      case 'thanks':
        return K(micUp(c), { l: c.bd(0.08, 0.68 * c.H, 0.14), gl: 0.4, nod: 0.18 * Math.abs(wob(c.t, 0.8)) }, room(0.3, 1));
      case 'replace':
        return K(MIC_ON_L(c, u), { n: { house: 1, clap: 1, beam: 1 } });
      case 'bow':
        return { d: hold('dnBow', 'enStance', sm(u, 0, 0.3)), n: { house: 1, clap: 1, standUp: 1, beam: 1 } };
      case 'wave':
        return { d: hold('enStance'), l: c.bd(0.34 + 0.06 * wob(c.t, 1.3), 1.0 * c.H, 0.12), r: c.bd(-0.34 - 0.06 * wob(c.t, 1.3, 0.3), 1.0 * c.H, 0.12), gl: 0.1, gr: 0.1, palms: 0.1, nod: -0.06, n: { house: 1, clap: 1, standUp: 1, beam: 1 } };
      default:
        return { n: { house: 1, clap: 0.5, beam: 1 } };
    }
  },
};

// 무대 리허설하기: the room empty and the house lights on. One, two: the mic tried, a mark taped down, the set run with the sheet in hand, timed.
const ENREHEARSE: Script = {
  seq: [['tap', 2.4], ['sound', 1.8], ['take', 1.2], ['sheet', 3.0, 0.8], ['tape', 3.2, 0.7], ['run1', 4.2, 0.8], ['stopwatch', 2.0], ['lost', 2.2], ['read', 2.4], ['run2', 4.0, 0.9], ['pace', 2.6, 1.0], ['water', 3.0, 0.8], ['replace', 1.4, 0.9], ['pencil', 3.0]],
  at(k) {
    switch (k) {
      case 'sheet':
        return st(-0.2, DH, 0.2, -0.1);
      case 'tape':
        return st(SG.tape[0], DH, SG.tape[2] - 0.28, 0);
      case 'run1':
      case 'stopwatch':
      case 'lost':
      case 'read':
      case 'run2':
        return st(SG.tape[0], DH, SG.tape[2] - 0.04, 0.1);
      case 'pace':
        return st(0.55, DH, 0.34, Math.PI / 2 + 1.2);
      case 'water':
        return st(0.6, DH, 0.34, 2.69);
      case 'pencil':
        return st(-0.1, DH, 0.2, 0.1);
      default:
        return SG.behind;
    }
  },
  key(k, u, c): Key {
    // The running order in the left hand.
    const sheet = () => c.bd(0.14, 0.62 * c.H, 0.26);
    const withSheet = (more: Key = {}): Key => K({ l: sheet(), gl: 0.8, palms: 0.7, props: { sheet: sheet() } }, more);
    switch (k) {
      case 'tap':
        // Two fingers on the mic: tok, tok.
        return { r: add(SG.head, -0.015, -0.02 + 0.016 * Math.abs(wob(c.t, 1.5)), -0.03), gr: 0.25, nod: -0.1, tap: true, n: { house: 0, tok: Math.abs(wob(c.t, 1.5)), taken: 0 } };
      case 'sound':
        // A hand up to the booth at the back: is that all right?
        return { l: c.bd(0.3, 0.98 * c.H, 0.26), r: undefined, gl: 0.15, palms: 0.1, nod: -0.12, n: { taken: 0 } };
      case 'take':
        return MIC_OFF_L(c, u);
      case 'sheet':
        return K(micUp(c), withSheet({ nod: 0.28, n: { taken: 1 } }));
      case 'tape': {
        // Down on the deck, a strip of tape for where to stand.
        const r = lerpV(c.bd(-0.1, 0.5 * c.H, 0.2), [SG.tape[0], SG.tape[1] + 0.03, SG.tape[2]], sm(u, 0, 0.35));
        return K({ d: hold('enTape', 'dnReady', sm(u, 0, 0.3)), l: add(SG.tape, 0.1 * Math.sin(u * 5), 0.03, 0.02), r, gl: 0.7, gr: 0.7, nod: 0.3, props: { mic: c.bd(-0.26, 0.14, 0.1), tip: c.bd(-0.34, 0.14, 0.1) }, n: { taken: 1, taped: sm(u, 0.3, 0.8) } });
      }
      case 'run1':
        return K(micUp(c), { d: hold('enStance'), l: talking(c, 0.9), gl: 0.2, nod: 0.03 * wob(c.t, 0.6), n: { taken: 1, taped: 1, timer: u } });
      case 'stopwatch': {
        // The phone's stopwatch, a look: over.
        const ph = c.bd(0.14, 0.66 * c.H, 0.26);
        return K(micDown(c), { l: ph, gl: 0.8, palms: 0.8, nod: 0.3, props: { phone: ph }, n: { taken: 1, taped: 1, timer: 1 } });
      }
      case 'lost':
        // The next line's gone: the mic down, a hand to the brow.
        return K(micDown(c), { d: hold('enDeflate'), l: c.bd(0.05, 0.9 * c.H, 0.12), gl: 0.3, n: { taken: 1, taped: 1 } });
      case 'read':
        return K(micDown(c), withSheet({ nod: 0.3, n: { taken: 1, taped: 1 } }));
      case 'run2':
        return K(micUp(c), { d: hold('enProud'), l: talking(c, 1.1), gl: 0.2, n: { taken: 1, taped: 1, timer: u } });
      case 'pace':
        // Walking it off, muttering, the mic down: how many steps does the deck give.
        return K(micDown(c), { l: c.bd(0.2, 0.56 * c.H, 0.1), gl: 0.5, nod: 0.18, n: { taken: 1, taped: 1 } });
      case 'water':
        return K(micDown(c), drink(c, u, SG.water, 0.03), { n: { taken: 1, taped: 1 } });
      case 'replace':
        return K(MIC_ON_L(c, u), { n: { taped: 1 } });
      case 'pencil': {
        // Back behind the stand: the time written on the sheet.
        const s = c.bd(0.1, 0.62 * c.H, 0.28);
        const pen = scribble(add(s, -0.02, 0.01, 0.01), u, 0.06, 3);
        return { l: s, r: pen, gl: 0.8, gr: 0.8, palms: 0.7, nod: 0.32, props: { sheet: s, pen: add(pen, 0, 0.05, 0) }, n: { taped: 1 } };
      }
      default:
        return {};
    }
  },
};

// 오프닝 무대 서기: the MC brings them on and hands over the mic; warming a cold room; a heckler dealt with; the next act called on.
const ENOPENING: Script = {
  seq: [['wait', 3.4], ['shake', 2.2, 0.9], ['hello', 2.8], ['ear', 2.2], ['clapAlong', 3.2], ['nerve', 2.0], ['bit', 3.8, 0.8], ['thin', 2.0], ['heckle', 2.4], ['turn', 1.8, 0.7], ['comeback', 2.4], ['laugh', 2.6], ['bit2', 3.2, 0.8], ['laugh2', 2.0], ['intro', 2.8, 0.8], ['handover', 2.2], ['exit', 0.6, 1.1]],
  at(k) {
    switch (k) {
      case 'wait':
      case 'exit':
        return SG.wing;
      case 'shake':
      case 'handover':
        return st(-0.28, DH, 0.4, -Math.PI / 2 + 0.3);
      case 'turn':
      case 'comeback':
        return st(0.3, DH, 0.72, -0.72);
      case 'laugh':
      case 'bit2':
      case 'laugh2':
        return st(0.42, DH, 0.34, -0.1);
      case 'intro':
        return st(-0.1, DH, 0.34, 0.2);
      default:
        return st(-0.2, DH, 0.3, 0.05);
    }
  },
  key(k, u, c): Key {
    const room = (laugh: number, clap = 0, more: Record<string, number> = {}) => ({ n: { house: 1, laugh, clap, taken: 1, beam: 1, ...more } });
    // mc: 1 on the deck with the mic, 2 giving it over, 0 gone.
    switch (k) {
      case 'wait':
        // At the side, shifting foot to foot, shaking out a hand.
        return { l: c.bd(0.24, 0.5 * c.H, 0.08 + 0.03 * wob(c.t, 3)), r: c.bd(-0.2, (0.66 + 0.02 * wob(c.t, 0.6)) * c.H, 0.14), gl: 0.15, gr: 0.5, nod: 0.08, n: { house: 1, clap: 0.2, taken: 1, mc: 1, beam: 1 } };
      case 'shake': {
        // The mic from the MC's hand into this one, and a clap on the arm.
        const mid: V = [SG.mc[0] + 0.14, DH + 1.02, SG.mc[2] + 0.02];
        const mine = u < 0.45 ? mid : lerpV(mid, c.bd(-0.07, 0.75 * c.H, 0.2), sm(u, 0.45, 0.9));
        return { r: mine, gr: 0.9, l: u < 0.6 ? [SG.mc[0] + 0.1, DH + 1.28, SG.mc[2] + 0.06] : undefined, gl: 0.5, props: { mic: mine, tip: add(mine, 0, 0.12, 0.02) }, nod: 0.12, n: { house: 1, clap: 1, taken: 1, mc: 2, beam: 1 } };
      }
      case 'hello':
        return K(micUp(c), { l: c.bd(0.3, 0.95 * c.H, 0.14), gl: 0.1, palms: 0.1 }, room(0, 0.6 * (1 - u)));
      case 'ear':
        // A hand behind the ear: "안 들려요!"
        return K(micDown(c), { d: hold('enStance'), l: c.bd(0.14, 0.92 * c.H, 0.02), gl: 0.3, nod: 0.02, }, room(0, 0.15));
      case 'clapAlong': {
        // Clapping over the head to get them going: the mic's hand comes up too, the mic in it.
        const g = 0.03 + 0.06 * Math.abs(wob(c.t, 1.3));
        const r = c.bd(-g, 1.05 * c.H, 0.12);
        return K({ l: c.bd(g, 1.05 * c.H, 0.12), r, gl: 0.1, gr: 0.9, palms: 0.05, nod: -0.1, props: { mic: r, tip: add(r, 0.02, 0.13, 0.02) } }, room(0.1, sm(u, 0.2, 0.7)));
      }
      case 'nerve':
        // Sleeve across the brow.
        return K(micDown(c), { d: hold('dnStill'), l: c.bd(0.1 - 0.16 * u, 0.93 * c.H, 0.12), gl: 0.35, nod: 0.08 }, room(0, 0.1));
      case 'bit':
        return K(micUp(c), { d: hold('enStance'), l: talking(c, 0.6), gl: 0.25, nod: 0.03 * wob(c.t, 0.7) }, room(0.1));
      case 'thin':
        // A laugh from about two people.
        return K(micDown(c), { d: hold('enDeflate', 'enStance', sm(u, 0, 0.5)), l: undefined }, room(0.25));
      case 'heckle':
        return K(micDown(c), { d: hold('dnStill'), l: undefined, nod: -0.02 }, room(0.05, 0, { heckle: 1 }));
      case 'turn':
        // Down to the lip and round to them, the free hand out: go on, say it again.
        return K(micDown(c), { l: c.bd(0.22, 0.68 * c.H, 0.4), gl: 0.15, palms: 0.5 }, room(0.1, 0, { heckle: 1 }));
      case 'comeback':
        return K(micUp(c), { d: hold('enProud'), l: c.bd(0.2, 0.74 * c.H, 0.6), gl: 0.8, palms: 0.15 }, room(0.3, 0, { heckle: u < 0.5 ? 1 : 0 }));
      case 'laugh':
        return K(micDown(c), { d: hold('enStance'), l: c.bd(0.2, 0.66 * c.H, 0.28), gl: 0.15, nod: -0.05 }, room(1, 0.2));
      case 'bit2':
        return K(micUp(c), { l: talking(c, 1.1), gl: 0.15, nod: 0.03 * wob(c.t, 0.8) }, room(0.25));
      case 'laugh2':
        return K(micDown(c), { d: hold('enStance'), l: c.bd(0.24, 0.6 * c.H, 0.2), gl: 0.3 }, room(0.85));
      case 'intro':
        // An arm flung out to the wing: 다음 분을 모실게요!
        return K(micUp(c), { d: hold('enProud'), l: c.bd(0.5, 0.92 * c.H, 0.12), gl: 0.1, palms: 0.1 }, room(0.2, sm(u, 0.4, 0.9)));
      case 'handover': {
        const mid: V = [SG.mc[0] + 0.14, DH + 1.02, SG.mc[2] + 0.02];
        const r = u < 0.6 ? lerpV(c.bd(-0.07, 0.75 * c.H, 0.2), mid, sm(u, 0.1, 0.6)) : mid;
        return { r, gr: u < 0.8 ? 0.9 : 0.2, props: { mic: u < 0.8 ? r : null, tip: u < 0.8 ? add(r, 0, 0.12, 0.02) : null }, nod: 0.15, n: { house: 1, clap: 1, taken: 1, mc: 2, beam: 1 } };
      }
      case 'exit':
        return { l: c.bd(0.3, 0.95 * c.H, 0.14), gl: 0.1, n: { house: 1, clap: 0.7, taken: 1, mc: 1, beam: 1 } };
      default:
        return { n: { house: 1, taken: 1 } };
    }
  },
};

// 단원 파트 연습 이끌기: on the deck with the clipboard. Counted in, the guitar's part, the voice's, stopped, one chord put right, all together.
const ENLINEUP: Script = {
  seq: [['plan', 3.2], ['count', 2.2], ['partA', 3.8], ['stop', 1.6], ['walk', 0.4, 0.9], ['fix', 3.4], ['backM', 0.4, 0.9], ['cueB', 1.6], ['partB', 3.8], ['listen', 2.2], ['count2', 1.8], ['all', 5.2], ['good', 2.4], ['note', 2.8]],
  at(k) {
    if (k === 'walk' || k === 'fix') return st(SG.guitar[0] + 0.5, DH, SG.guitar[2] + 0.12, -Math.PI / 2 - 0.15);
    if (k === 'partB' || k === 'listen') return st(0.28, DH, 0.05, 1.1);
    return st(0.0, DH, -0.1, 0.0);
  },
  key(k, u, c): Key {
    const board = () => c.bd(0.14, 0.6 * c.H, 0.26);
    const held = (more: Key = {}): Key => K({ l: board(), gl: 0.85, palms: 0.75, props: { clip: board() } }, more);
    // pa / pb: the guitar / the voice playing (1), stopped (0).
    switch (k) {
      case 'plan': {
        const b = board();
        const p = scribble(add(b, -0.03, 0.012, 0.01), u, 0.08, 3);
        return K(held({ r: p, gr: 0.8, nod: 0.33, props: { pen: add(p, 0, 0.05, 0) }, n: { pa: 0, pb: 0, written: u * 0.5 } }));
      }
      case 'count':
      case 'count2':
        // 원, 투, 쓰리, 포: the pen for a stick.
        return K(held({ r: c.bd(-0.22, (0.74 + 0.08 * Math.abs(wob(c.t, 1.4))) * c.H, 0.3), gr: 0.75, nod: 0.05 + 0.04 * wob(c.t, 1.4), n: { pa: 0, pb: 0, written: 0.5 } }));
      case 'partA':
        return K(held({ r: c.bd(-0.18, (0.58 + 0.03 * wob(c.t, 1.4)) * c.H, 0.18), gr: 0.5, nod: 0.05 + 0.05 * wob(c.t, 1.4), n: { pa: 1, written: 0.5 } }));
      case 'stop':
        return K(held({ r: c.bd(-0.26, 0.92 * c.H, 0.34), gr: 0.05, palms: 0.05, nod: -0.02, n: { pa: 0, written: 0.5 } }));
      case 'walk':
        return K(held({ n: { pa: 0, written: 0.5 } }));
      case 'fix': {
        // At the guitarist's side: a finger on the neck, a fret up.
        const neck: V = add(SG.guitar, 0.33, 1.2 - DH + DH, 0.25);
        return K(held({ r: add(neck, 0.02 * Math.sin(u * 8), 0, 0.03), gr: 0.3, palms: 0.5, nod: 0.25, n: { pa: u > 0.6 ? 1 : 0, written: 0.5 } }));
      }
      case 'cueB':
        return K(held({ r: c.bd(-0.22, 0.75 * c.H, 0.4), gr: 0.7, nod: 0.05, n: { pa: 0, written: 0.6 } }));
      case 'partB':
        return K(held({ r: c.bd(-0.2, (0.6 + 0.04 * wob(c.t, 0.8)) * c.H, 0.2), gr: 0.4, nod: 0.03 + 0.05 * wob(c.t, 0.8), n: { pb: 1, written: 0.6 } }));
      case 'listen':
        return { d: hold('dnChin'), n: { pb: 1, written: 0.6 }, props: { clip: c.bd(0.22, 0.45 * c.H, 0.18) }, l: c.bd(0.22, 0.48 * c.H, 0.16), gl: 0.85 };
      case 'all':
        // Both going; the leader conducts with the pen, and sings along.
        return K(held({ r: c.bd(-0.24 + 0.08 * wob(c.t, 0.7), (0.76 + 0.07 * wob(c.t, 1.4)) * c.H, 0.3), gr: 0.75, nod: 0.05 * wob(c.t, 1.4), n: { pa: 1, pb: 1, written: 0.7 } }));
      case 'good':
        return K({ d: hold('enStance'), ...clapAt(c), n: { pa: 0, pb: 0, thumbs: 1, written: 0.7 }, props: { clip: c.bd(0.3, 0.4 * c.H, 0.05) } });
      case 'note': {
        const b = board();
        const p = scribble(add(b, -0.03, 0.012, 0.01), u, 0.08, 3);
        return K(held({ r: p, gr: 0.8, nod: 0.33, props: { pen: add(p, 0, 0.05, 0) }, n: { written: 0.7 + 0.3 * u } }));
      }
      default:
        return {};
    }
  },
};

// =============================================================================================
// 대본 책상 (jokeDesk, 1 × 1): the top against the wall, a chair at its front; the dweller sat facing the wall (-z).

export const DK = {
  top: 0.76,
  seat: [0, 0.48, 0.4] as V,
  book: [0.02, 0.775, -0.14] as V,
  coffee: [0.32, 0.78, -0.08] as V,
  cards: [-0.33, 0.785, -0.12] as V,
  bin: [0.42, 0.28, 0.3] as V,
  note: [-0.2, 1.3, -0.46] as V,
  mate: [0.86, 0, 0.42] as V,
};
const SAT = st(DK.seat[0], DK.seat[1], DK.seat[2], Math.PI, { sit: true, floor: 0 });
const pageHand = (u: number, w = 0.1, laps = 5) => scribble(add(DK.book, 0.03, 0.01, 0.03), u, w, laps);
const ENWRITE: Script = {
  seq: [['think', 2.8], ['write', 5.0, 0.6], ['read', 3.0, 0.6], ['grin', 2.2], ['write2', 4.0, 0.6], ['frown', 2.4], ['tear', 1.4], ['crumple', 1.6], ['toss', 1.2], ['coffee', 3.2, 0.7], ['card', 3.4, 0.6], ['pin', 2.2, 0.7]],
  at: () => SAT,
  key(k, u, c): Key {
    switch (k) {
      case 'think':
        // Chin on the left fist, the pen tapped on the page.
        return { l: c.bd(0.02, 0.4 * c.H, 0.14), r: add(DK.book, 0.1, 0.02 + 0.015 * Math.abs(wob(c.t, 2.2)), 0.04), gl: 0.8, gr: 0.75, lean: 0.14, nod: -0.05, props: { pen: add(DK.book, 0.1, 0.07, 0.04) }, n: { page: 0 } };
      case 'write':
      case 'write2': {
        const p = pageHand(u);
        return { l: add(DK.book, -0.16, 0.012, 0.03), r: p, gl: 0.3, gr: 0.75, lean: 0.14, nod: 0.38, props: { pen: add(p, 0, 0.05, 0) }, n: { page: k === 'write' ? 1 + u * 3 : 4 + u * 2 } };
      }
      case 'read': {
        // The notebook up in both hands, the lips going.
        const b = c.bd(0.0, 0.33 * c.H, 0.3);
        return { l: add(b, 0.1, 0, 0), r: add(b, -0.1, 0, 0), gl: 0.8, gr: 0.8, palms: 0.75, nod: 0.12 + 0.03 * wob(c.t, 1.3), props: { book: b }, n: { page: 4 } };
      }
      case 'grin':
        // Pleased with that: back in the chair, a little shake of the shoulders.
        return { l: add(DK.book, -0.16, 0.012, 0.03), r: c.bd(-0.08, (0.2 + 0.02 * wob(c.t, 3.4)) * c.H, 0.14), gl: 0.3, gr: 0.3, lean: -0.05 + 0.03 * wob(c.t, 3.4), nod: -0.06, props: { pen: add(DK.book, 0.12, 0.012, 0.06) }, n: { page: 4 } };
      case 'frown':
        // No. A hand through the hair, the elbow on the desk.
        return { l: c.bd(0.08, 0.5 * c.H, 0.04 + 0.03 * wob(c.t, 1.1)), r: add(DK.book, 0.14, 0.01, 0.04), gl: 0.5, gr: 0.75, lean: 0.18, nod: 0.3, props: { pen: add(DK.book, 0.14, 0.06, 0.04) }, n: { page: 6 } };
      case 'tear':
        // The page torn out.
        return { l: add(DK.book, -0.05, 0.02, -0.08), r: add(DK.book, 0.05 + 0.12 * u, 0.02 + 0.12 * u, -0.08), gl: 0.8, gr: 0.8, nod: 0.35, lean: 0.12, n: { page: u > 0.5 ? 0 : 6, leaf: sm(u, 0.1, 0.7) } };
      case 'crumple': {
        const b = c.bd(0, 0.3 * c.H, 0.26);
        return { l: add(b, 0.05 - 0.02 * u, 0, 0), r: add(b, -0.05 + 0.02 * u, 0, 0), gl: 0.85, gr: 0.85, nod: 0.2, props: { ball: b }, n: { page: 0, ballSize: 1 - 0.3 * u } };
      }
      case 'toss': {
        // Over the shoulder and into the bin at their side: an arc of paper.
        const from = c.bd(-0.2, 0.45 * c.H, 0.15);
        const fly = sm(u, 0.25, 0.9);
        const ball = lerpV(from, DK.bin, fly);
        return { r: lerpV(from, c.bd(-0.34, 0.34 * c.H, 0.26), sm(u, 0.1, 0.5)), gr: u < 0.3 ? 0.85 : 0.1, nod: 0.05, props: { ball: add(ball, 0, 0.32 * Math.sin(fly * Math.PI), 0) }, n: { page: 0, ballSize: 0.7, binned: u > 0.9 ? 1 : 0 } };
      }
      case 'coffee': {
        const h = add(DK.coffee, 0, 0.04, 0);
        const m = atMouth(c, -0.03);
        const b = u < 0.24 ? lerpV(h, m, sm(u, 0.04, 0.24)) : u > 0.78 ? lerpV(m, h, sm(u, 0.78, 0.98)) : m;
        return { r: add(b, -0.03, -0.03, 0), gr: 0.85, nod: u > 0.26 && u < 0.76 ? -0.3 : 0.1, props: { cup: b }, n: { page: 0, binned: 1 } };
      }
      case 'card': {
        // The keeper copied to an index card.
        const a = add(DK.cards, 0.08, 0.008, 0.1);
        const p = scribble(a, u, 0.06, 3);
        return { l: add(DK.cards, -0.04, 0.02, 0.11), r: p, gl: 0.6, gr: 0.75, nod: 0.38, lean: 0.14, props: { pen: add(p, 0, 0.05, 0), card: a }, n: { page: 0, binned: 1 } };
      }
      case 'pin': {
        // Up on the board over the desk.
        const to = lerpV(add(DK.cards, 0.08, 0.05, 0.1), add(DK.note, 0, 0, 0.02), sm(u, 0, 0.5));
        return { r: to, gr: 0.7, palms: 0.2, nod: -0.12, lean: 0.14, props: { card: to }, n: { page: 0, binned: 1, pinned: sm(u, 0.5, 0.7) } };
      }
      default:
        return {};
    }
  },
};
// 개그 코너 펀치라인 다듬기: the printed script in red pen, syllables tapped on the desk, tried aloud on the writer stood beside.
const SAT_TURNED = st(DK.seat[0], DK.seat[1], DK.seat[2], Math.PI - 1.05, { sit: true, floor: 0 });
const ENPUNCH: Script = {
  seq: [['read', 3.2], ['strike', 2.6, 0.5], ['count', 3.2, 0.5], ['write', 2.6, 0.5], ['turn', 0.5, 0.8], ['try1', 2.8], ['shake', 1.8], ['back', 0.5, 0.8], ['strike2', 2.4, 0.5], ['write2', 2.6, 0.5], ['turn2', 0.5, 0.8], ['try2', 2.4], ['hit', 2.2], ['high', 1.6], ['back2', 0.4, 0.8], ['star', 2.0, 0.5]],
  at: (k) => (k === 'turn' || k === 'try1' || k === 'shake' || k === 'turn2' || k === 'try2' || k === 'hit' || k === 'high' ? SAT_TURNED : SAT),
  key(k, u, c): Key {
    const line = (i: number) => add(DK.book, 0.04, 0.01, -0.09 + 0.04 * i);
    const printed = (k2: number) => ({ printed: 1, struck: k2 });
    switch (k) {
      case 'read':
        // A finger down the lines.
        return { l: add(line(Math.floor(u * 4)), -0.14, 0.008, 0), r: add(DK.book, 0.17, 0.014, 0.05), gl: 0.2, gr: 0.75, lean: 0.14, nod: 0.38, props: { pen: add(DK.book, 0.17, 0.06, 0.05) }, n: printed(0) };
      case 'strike':
      case 'strike2': {
        const a = line(k === 'strike' ? 1 : 2);
        const p: V = [a[0] - 0.08 + 0.16 * sm(u, 0.1, 0.75), a[1] + 0.008, a[2]];
        return { l: add(DK.book, -0.16, 0.012, 0.03), r: p, gl: 0.3, gr: 0.75, nod: 0.4, lean: 0.14, props: { pen: add(p, 0, 0.05, 0) }, n: printed(k === 'strike' ? sm(u, 0.1, 0.75) : 1 + sm(u, 0.1, 0.75)) };
      }
      case 'count':
        // Beats on the desk with the fingers: 하나, 둘, 셋.
        return { l: add(DK.book, -0.22, 0.012 + 0.03 * Math.abs(wob(c.t, 1.4)), 0.1), r: add(DK.book, 0.17, 0.014, 0.05), gl: 0.15, gr: 0.75, tap: true, nod: 0.14 + 0.05 * wob(c.t, 1.4), lean: 0.1, props: { pen: add(DK.book, 0.17, 0.06, 0.05) }, n: printed(1) };
      case 'write':
      case 'write2': {
        const a = line(k === 'write' ? 1 : 2);
        const p = scribble(add(a, -0.02, 0.016, -0.018), u, 0.1, 4);
        return { l: add(DK.book, -0.16, 0.012, 0.03), r: p, gl: 0.3, gr: 0.75, nod: 0.4, lean: 0.14, props: { pen: add(p, 0, 0.05, 0) }, n: { ...printed(k === 'write' ? 1 : 2), redo: k === 'write' ? u : 1 + u } };
      }
      case 'turn':
      case 'turn2':
        return { n: { ...printed(k === 'turn' ? 1 : 2), redo: k === 'turn' ? 1 : 2 } };
      case 'try1':
      case 'try2':
        // Turned round in the seat, trying it aloud; the sheet in one hand, the other doing the line.
        return { l: c.bd(0.2, 0.25 * c.H, 0.28), r: c.bd(-0.24, (0.34 + 0.05 * wob(c.t, 0.9)) * c.H, 0.28), gl: 0.8, gr: 0.15, palms: 0.2, nod: 0.02, props: { sheet: c.bd(0.2, 0.25 * c.H, 0.28) }, n: { ...printed(k === 'try1' ? 1 : 2), mate: 1, redo: k === 'try1' ? 1 : 2, off: 1 } };
      case 'shake':
        return { l: c.bd(0.2, 0.25 * c.H, 0.28), r: c.bd(-0.12, 0.2 * c.H, 0.18), gl: 0.8, gr: 0.3, lean: 0.02, nod: 0.12, props: { sheet: c.bd(0.2, 0.25 * c.H, 0.28) }, n: { ...printed(1), mate: 2, redo: 1, off: 1 } };
      case 'hit':
        return { l: c.bd(0.2, 0.25 * c.H, 0.28), r: c.bd(-0.24, 0.4 * c.H, 0.28), gl: 0.8, gr: 0.1, lean: -0.03 * wob(c.t, 2.8), nod: -0.05, props: { sheet: c.bd(0.2, 0.25 * c.H, 0.28) }, n: { ...printed(2), mate: 3, redo: 2, off: 1 } };
      case 'high':
        // A fist bumped on the mate's.
        return { l: c.bd(0.2, 0.25 * c.H, 0.28), r: c.bd(-0.1, 0.52 * c.H, 0.46), gl: 0.8, gr: 0.85, nod: -0.05, props: { sheet: c.bd(0.2, 0.25 * c.H, 0.28) }, n: { ...printed(2), mate: 4, redo: 2, off: 1 } };
      case 'back':
      case 'back2':
        return { n: { ...printed(k === 'back' ? 1 : 2), redo: k === 'back' ? 1 : 2 } };
      case 'star': {
        // A star by it: keep.
        const a = line(2);
        const p = scribble(add(a, 0.12, 0.012, 0), u, 0.025, 3);
        return { l: add(DK.book, -0.16, 0.012, 0.03), r: p, gl: 0.3, gr: 0.75, nod: 0.4, lean: 0.14, props: { pen: add(p, 0, 0.05, 0) }, n: { ...printed(2), redo: 2, star: u } };
      }
      default:
        return {};
    }
  },
};

// =============================================================================================
// 바 (enBarCounter, 4 × 1): a stool at the front, the dweller sat to the counter; the bartender behind.

export const BR = {
  top: 0.98,
  seat: [-0.55, 0.72, 0.8] as V,
  glassHome: [-0.55, 1.0, 0.26] as V,
  glassStart: [0.35, 1.0, 0.18] as V,
  napkin: [-0.42, 0.992, 0.3] as V,
  back: [0.35, 0, -0.22] as V,
};
const BAR_SEAT = st(BR.seat[0], BR.seat[1], BR.seat[2], Math.PI, { sit: true, floor: 0 });
const ENBARTALK: Script = {
  seq: [['sit', 2.4], ['pour', 3.0], ['slide', 1.2], ['chat', 4.0], ['sip', 3.0], ['listen', 3.0], ['idea', 1.6], ['pen', 1.0], ['napkin', 3.6], ['readOut', 2.8], ['laugh', 2.4], ['sip2', 2.6], ['pocket', 1.8]],
  at: () => BAR_SEAT,
  key(k, u, c): Key {
    const base: Partial<Key> = { nod: 0.05, lean: 0.08 };
    const elbow: V = add(BR.glassHome, -0.14, 0, 0.02);
    const hand = (u2: number) => add(BR.glassHome, 0.03, 0.05 + 0.005 * u2, 0.03);
    switch (k) {
      case 'sit':
        // Forearms on the counter, shoulders down: the show's over.
        return { ...base, l: elbow, r: add(BR.glassHome, 0.18, 0, 0), gl: 0.3, gr: 0.3, palms: 0.8, n: { bart: 1 } };
      case 'pour':
        return { ...base, l: elbow, r: add(BR.glassHome, 0.18, 0, 0), gl: 0.3, gr: 0.3, palms: 0.8, nod: 0.02, props: { glass: BR.glassStart }, n: { bart: 2, fill: sm(u, 0.15, 0.85) } };
      case 'slide': {
        const g = lerpV(BR.glassStart, BR.glassHome, sm(u, 0, 0.7));
        return { ...base, l: elbow, r: lerpV(add(BR.glassHome, 0.18, 0, 0), hand(0), sm(u, 0.5, 0.95)), gl: 0.3, gr: 0.7, props: { glass: g }, n: { bart: 3, fill: 1 } };
      }
      case 'chat':
        return { ...base, l: c.bd(0.18, (0.34 + 0.05 * wob(c.t, 0.8)) * c.H, 0.28), r: hand(0), gl: 0.15, gr: 0.75, palms: 0.2, nod: 0.03 * wob(c.t, 0.6), props: { glass: BR.glassHome }, n: { bart: 4, fill: 1 } };
      case 'sip':
      case 'sip2': {
        const m = atMouth(c, -0.03);
        const b = u < 0.24 ? lerpV(BR.glassHome, m, sm(u, 0.04, 0.24)) : u > 0.78 ? lerpV(m, BR.glassHome, sm(u, 0.78, 0.98)) : m;
        return { ...base, l: elbow, r: add(b, -0.02, -0.04, 0.02), gl: 0.3, gr: 0.85, nod: u > 0.26 && u < 0.76 ? -0.3 : 0.05, props: { glass: b }, n: { bart: k === 'sip' ? 4 : 1, fill: k === 'sip' ? 1 - 0.3 * sm(u, 0.3, 0.7) : 0.7 - 0.3 * sm(u, 0.3, 0.7) } };
      }
      case 'listen':
        // Chin on a hand: 오늘 3번 테이블 말이야...
        return { ...base, l: c.bd(0.03, 0.39 * c.H, 0.16), r: hand(0), gl: 0.75, gr: 0.7, lean: 0.18, nod: -0.05, props: { glass: BR.glassHome }, n: { bart: 5, fill: 0.7 } };
      case 'idea':
        // A finger up: wait, say that again.
        return { ...base, l: c.bd(0.16, 0.5 * c.H, 0.24), r: hand(0), gl: 0.7, gr: 0.7, palms: 0.1, lean: 0.03, nod: -0.08, props: { glass: BR.glassHome }, n: { bart: 5, fill: 0.7 } };
      case 'pen':
        return { ...base, l: BR.napkin, r: add(BR.napkin, 0.05, 0.02, 0.02), gl: 0.5, gr: 0.75, nod: 0.3, props: { glass: BR.glassHome, pen: add(BR.napkin, 0.05, 0.06, 0.02), nap: BR.napkin }, n: { bart: 1, fill: 0.7 } };
      case 'napkin': {
        const p = scribble(add(BR.napkin, 0, 0.002, 0.01), u, 0.05, 4);
        return { ...base, l: add(BR.napkin, -0.08, 0.002, 0.03), r: p, gl: 0.5, gr: 0.8, nod: 0.38, lean: 0.14, props: { glass: BR.glassHome, pen: add(p, 0, 0.05, 0), nap: BR.napkin }, n: { bart: 1, fill: 0.7, wrote: u } };
      }
      case 'readOut': {
        const nap = c.bd(0.08, 0.34 * c.H, 0.26);
        return { ...base, l: nap, r: hand(0), gl: 0.8, gr: 0.7, palms: 0.75, nod: 0.12, props: { glass: BR.glassHome, nap }, n: { bart: 4, fill: 0.7, wrote: 1 } };
      }
      case 'laugh':
        return { ...base, l: c.bd(0.12, 0.2 * c.H, 0.22), r: add(BR.glassHome, 0.12 + 0.02 * wob(c.t, 3), 0.01 + 0.02 * Math.abs(wob(c.t, 3)), 0), gl: 0.3, gr: 0.2, lean: 0.14 + 0.05 * wob(c.t, 3), nod: -0.04, props: { glass: BR.glassHome }, n: { bart: 6, fill: 0.7 } };
      case 'pocket': {
        // The napkin into the shirt pocket.
        const p = lerpV(BR.napkin, c.bd(0.08, 0.34 * c.H, 0.1), sm(u, 0, 0.6));
        return { ...base, l: p, r: hand(0), gl: 0.8, gr: 0.7, nod: 0.2, props: { glass: BR.glassHome, nap: u < 0.85 ? p : null }, n: { bart: 1, fill: 0.4 } };
      }
      default:
        return {};
    }
  },
};

// =============================================================================================
// 분장 거울 (enVanity, 2 × 1): the bulb-lit mirror at the back; the dweller sat at a stool, facing it (-z).

export const VN = {
  top: 0.76,
  seat: [0, 0.48, 0.5] as V,
  puff: [-0.36, 0.8, -0.14] as V,
  cards: [0.36, 0.782, -0.1] as V,
  bottle: [0.62, 0.77, -0.2] as V,
  jacket: [-0.84, 1.68, -0.1] as V,
};
const ENGREEN: Script = {
  seq: [['sit', 1.8], ['look', 2.4], ['puff', 3.6], ['nose', 1.8], ['collar', 3.0], ['cards', 3.8], ['lips', 2.6], ['cheeks', 2.4], ['grin', 2.2], ['drink', 2.8], ['breath', 3.2], ['pat', 2.0]],
  at: () => st(VN.seat[0], VN.seat[1], VN.seat[2], Math.PI, { sit: true, floor: 0 }),
  key(k, u, c): Key {
    const face = (s: number, up: number, ah = 0.11) => c.bd(s, up * c.H, ah);
    switch (k) {
      case 'sit':
        return { l: c.bd(0.2, 0.2 * c.H, 0.26), r: c.bd(-0.2, 0.2 * c.H, 0.26), gl: 0.3, gr: 0.3, palms: 0.8, nod: 0.06, n: { lit: u } };
      case 'look':
        // Face turned this way and that in the glass.
        return { l: add(VN.puff, 0.14, -0.02, 0.2), r: face(-0.12, 0.4), gl: 0.2, gr: 0.3, nod: 0.04 * wob(c.t, 0.5), lean: 0.1, n: { lit: 1 } };
      case 'puff': {
        const p = u < 0.2 ? lerpV(VN.puff, face(0.04, 0.45), sm(u, 0, 0.2)) : face(0.05 * Math.sin(u * 16), 0.45 + 0.025 * Math.cos(u * 11));
        return { r: add(p, -0.02, -0.02, 0.01), gr: 0.75, l: add(VN.puff, 0.14, -0.02, 0.2), gl: 0.2, lean: 0.12, nod: -0.05, props: { puff: p }, n: { lit: 1 } };
      }
      case 'nose': {
        const p = face(0.0, 0.46);
        const to = u > 0.75 ? lerpV(p, VN.puff, sm(u, 0.75, 1)) : p;
        return { r: add(to, -0.02, -0.02, 0.01), gr: 0.75, lean: 0.14, nod: -0.08, props: { puff: to }, n: { lit: 1 } };
      }
      case 'collar':
        // Both hands at the collar, setting the jacket straight.
        return { l: c.bd(0.08 - 0.02 * Math.sin(u * 7), 0.34 * c.H, 0.08), r: c.bd(-0.08 + 0.02 * Math.sin(u * 7), 0.34 * c.H, 0.08), gl: 0.75, gr: 0.75, nod: 0.12, palms: 0.35, n: { lit: 1 } };
      case 'cards': {
        // The cue cards, flicked through, the lips running the set.
        const b = c.bd(0, 0.26 * c.H, 0.28);
        const flick = Math.floor(u * 4);
        return { l: add(b, 0.05, 0, 0), r: add(b, -0.05, 0.015 * Math.abs(wob(c.t, 1)), 0), gl: 0.8, gr: 0.6, palms: 0.75, nod: 0.18 + 0.03 * wob(c.t, 1.4), props: { cards: b }, n: { lit: 1, flick } };
      }
      case 'lips':
        // Lips and tongue warmed up: the jaw worked with the fingertips.
        return { l: face(0.07, 0.43 + 0.012 * wob(c.t, 1.6), 0.07), r: face(-0.07, 0.43 - 0.012 * wob(c.t, 1.6), 0.07), gl: 0.15, gr: 0.15, palms: 0.5, nod: -0.05, n: { lit: 1 } };
      case 'cheeks':
        return { l: face(0.08, 0.46, 0.06), r: face(-0.08, 0.46, 0.06), gl: 0.1, gr: 0.1, palms: 0.5, nod: 0.03 * wob(c.t, 3), n: { lit: 1 } };
      case 'grin':
        // Practising the look: a finger pointed at the one in the glass.
        return { r: lerpV(c.bd(-0.14, 0.34 * c.H, 0.26), c.bd(-0.04, 0.42 * c.H, 0.46), sm(u, 0.1, 0.4)), gr: 0.8, l: c.bd(0.2, 0.2 * c.H, 0.26), gl: 0.3, palms: 0.1, lean: 0.03, nod: -0.04 + 0.05 * Math.abs(wob(c.t, 2) * sm(u, 0.4, 0.6)), n: { lit: 1 } };
      case 'drink': {
        const m = atMouth(c, 0.03);
        const b = u < 0.24 ? lerpV(VN.bottle, m, sm(u, 0.04, 0.24)) : u > 0.78 ? lerpV(m, VN.bottle, sm(u, 0.78, 0.98)) : m;
        return { l: add(b, 0, -0.05, 0), gl: 0.9, nod: u > 0.26 && u < 0.76 ? -0.35 : 0.06, props: { bottle: b }, n: { lit: 1 } };
      }
      case 'breath': {
        // Eyes on the glass, hands on the knees, the shoulders up and down: 후우.
        const b = 0.5 + 0.5 * wob(c.t, 0.28);
        return { l: c.bd(0.14, 0.14 * c.H, 0.34), r: c.bd(-0.14, 0.14 * c.H, 0.34), gl: 0.5, gr: 0.5, palms: 0.85, lean: -0.05 + 0.08 * (1 - b), nod: 0.06 + 0.08 * (1 - b), n: { lit: 1 } };
      }
      case 'pat':
        // Two slaps on the cheeks: go.
        return { l: face(0.1, 0.46, 0.04 + 0.03 * Math.abs(wob(c.t, 2.4))), r: face(-0.1, 0.46, 0.04 + 0.03 * Math.abs(wob(c.t, 2.4))), gl: 0.05, gr: 0.05, palms: 0.5, nod: -0.04, n: { lit: 1 } };
      default:
        return {};
    }
  },
};

// =============================================================================================
// 세트리스트 보드 (enSetlistCork, 2 × 1): a cork board on an easel frame; the dweller stood at it.

export const CK = {
  z: -0.32,
  /** Where each slot of the running order is on the board. */
  slot: (i: number): V => [-0.62 + (i % 4) * 0.41, 1.66 - Math.floor(i / 4) * 0.34, -0.3],
  pad: [0.6, 1.0, -0.2] as V,
};
const ENCARDS: Script = {
  seq: [['read', 3.4], ['chin', 2.4, 0.8], ['reach', 1.2, 0.5], ['carry', 1.4], ['pin', 1.2], ['back', 2.4, 0.9], ['reach2', 1.2, 0.8], ['carry2', 1.4], ['pin2', 1.2], ['time', 3.4, 0.7], ['back2', 2.2, 0.9], ['nod', 1.8]],
  at(k) {
    if (k === 'chin' || k === 'back' || k === 'back2' || k === 'nod') return st(0, 0, 0.95, Math.PI);
    if (k === 'time') return st(0.5, 0, 0.3, Math.PI);
    if (k === 'reach' || k === 'pin2') return st(-0.3, 0, 0.3, Math.PI);
    if (k === 'carry' || k === 'carry2') return st(0, 0, 0.32, Math.PI);
    return st(0.3, 0, 0.3, Math.PI);
  },
  key(k, u, c): Key {
    // Slots moved: a card out of 1 to 6 first, then one out of 3 to 0 (the order as the piece draws it: n.swap).
    const inHand = (a: V, b: V, e: number): V => lerpV(a, b, e);
    switch (k) {
      case 'read':
        // A finger along the row, the marker in the other hand.
        return { r: add(CK.slot(Math.floor(u * 4)), 0, -0.1, 0.05), gr: 0.25, palms: 0.2, l: c.bd(0.2, 0.55 * c.H, 0.15), gl: 0.8, nod: -0.05, n: { swap: 0 } };
      case 'chin':
        return { d: hold('dnChin'), n: { swap: 0 } };
      case 'reach':
        return { r: CK.slot(1), gr: 0.75, nod: -0.08, n: { swap: 0 } };
      case 'carry':
        return { r: inHand(CK.slot(1), c.bd(-0.1, 0.72 * c.H, 0.34), sm(u, 0, 0.4)), gr: 0.75, nod: 0.1, props: { card: inHand(CK.slot(1), c.bd(-0.1, 0.72 * c.H, 0.34), sm(u, 0, 0.4)) }, n: { swap: 0, lift: 1 } };
      case 'pin': {
        const to = lerpV(c.bd(-0.1, 0.72 * c.H, 0.34), CK.slot(6), sm(u, 0, 0.6));
        return { r: to, gr: 0.75, nod: 0.02, props: { card: to }, n: { swap: 0, lift: 1 } };
      }
      case 'back':
      case 'back2':
        return { d: hold('dnArmsCross'), nod: 0.04 * wob(c.t, 0.5), n: { swap: k === 'back' ? 1 : 2 } };
      case 'reach2':
        return { r: CK.slot(3), gr: 0.75, nod: -0.08, n: { swap: 1 } };
      case 'carry2':
        return { r: inHand(CK.slot(3), c.bd(-0.1, 0.72 * c.H, 0.34), sm(u, 0, 0.4)), gr: 0.75, nod: 0.1, props: { card: inHand(CK.slot(3), c.bd(-0.1, 0.72 * c.H, 0.34), sm(u, 0, 0.4)) }, n: { swap: 1, lift: 2 } };
      case 'pin2': {
        const to = lerpV(c.bd(-0.1, 0.72 * c.H, 0.34), CK.slot(0), sm(u, 0, 0.6));
        return { r: to, gr: 0.75, nod: -0.08, props: { card: to }, n: { swap: 1, lift: 2 } };
      }
      case 'time': {
        // The minutes added up in the corner.
        const p = scribble(add(CK.pad, 0, 0, 0.09), u, 0.12, 4);
        return { r: [p[0], p[1], p[2] + 0.02], l: c.bd(0.2, 0.55 * c.H, 0.15), gl: 0.8, gr: 0.8, nod: 0.02, props: { marker: add(p, 0, 0.0, 0.03) }, n: { swap: 2, sum: u } };
      }
      case 'nod':
        return { d: hold('enStance'), l: c.bd(0.22, 0.56 * c.H, 0.24), r: c.bd(-0.22, 0.56 * c.H, 0.24), gl: 0.3, gr: 0.3, nod: 0.14 * Math.abs(wob(c.t, 1.1)), n: { swap: 2, sum: 1 } };
      default:
        return {};
    }
  },
};

// =============================================================================================
// 음향 콘솔 (enSoundConsole, 2 × 1): the mixer and the lighting board, the operator at its front looking over it to the stage (-z).

export const SC = {
  top: 0.92,
  stand: [0, 0, 0.72] as V,
  fader: (i: number): V => [-0.72 + i * 0.1, 0.962, 0.28],
  cue: (i: number): V => [0.26 + i * 0.13, 0.962, 0.26],
  talk: [-0.02, 1.14, 0.16] as V,
  phones: [-0.82, 0.95, 0.06] as V,
};
const ENSOUND: Script = {
  seq: [['look', 2.4], ['phones', 2.0], ['ride', 3.6], ['talk', 3.0], ['listen', 2.2], ['trim', 3.0], ['cue1', 1.8, 0.6], ['cue2', 1.8], ['cue3', 1.8], ['shade', 2.6], ['thumb', 1.8], ['off', 1.4]],
  at: () => st(SC.stand[0], 0, SC.stand[2], Math.PI),
  key(k, u, c): Key {
    const onHead = (): V => c.bd(0, 0.93 * c.H, 0.0);
    const worn = (more: Key): Key => K({ props: { phones: onHead() } }, more);
    const l = SC.fader(1);
    switch (k) {
      case 'look':
        return { l: add(l, 0, 0.012, 0), r: add(SC.cue(0), 0, 0.012, 0.04), gl: 0.3, gr: 0.3, nod: 0.02, n: { wash: 0 } };
      case 'phones': {
        const to = lerpV(SC.phones, onHead(), sm(u, 0.1, 0.7));
        return { l: add(to, 0.09, -0.02, 0), r: add(to, -0.09, -0.02, 0), gl: 0.6, gr: 0.6, nod: 0.08, props: { phones: to }, n: { wash: 0 } };
      }
      case 'ride': {
        // Vocal up, a touch of reverb off: two faders ridden.
        const a = 0.5 + 0.4 * Math.sin(u * 8);
        const b = 0.4 + 0.3 * Math.cos(u * 6);
        return worn({ l: add(SC.fader(2), 0, 0.012, -0.05 + 0.1 * a), r: add(SC.fader(5), 0, 0.012, -0.05 + 0.1 * b), gl: 0.5, gr: 0.5, lean: 0.12, nod: 0.3, n: { f2: a, f5: b, wash: 0 } });
      }
      case 'talk':
        // The talkback mic pressed to speak: 마이크 하나, 둘.
        return worn({ l: add(SC.talk, 0.02, -0.14, 0.03), r: c.bd(-0.14, 0.6 * c.H, 0.2), gl: 0.7, gr: 0.2, lean: 0.16, nod: 0.1, n: { talk: 1, wash: 0 } });
      case 'listen':
        return worn({ l: c.bd(0.1, 0.92 * c.H, 0.02), r: add(SC.fader(5), 0, 0.012, 0), gl: 0.4, gr: 0.5, nod: 0.1, n: { wash: 0 } });
      case 'trim': {
        // A knob turned, the meters watched.
        const kn = add(SC.fader(3), 0, 0.012, -0.22);
        return worn({ l: add(l, 0, 0.012, 0), r: add(kn, 0.008 * Math.sin(u * 16), 0, 0.012 * Math.cos(u * 16)), gl: 0.3, gr: 0.5, nod: 0.32, lean: 0.12, n: { wash: 0 } });
      }
      case 'cue1':
      case 'cue2':
      case 'cue3': {
        // The light cues: a button, the stage changes.
        const i = { cue1: 0, cue2: 1, cue3: 2 }[k];
        return worn({ l: add(l, 0, 0.012, 0), r: add(SC.cue(i), 0, 0.022 - 0.014 * sm(u, 0.1, 0.3), 0), gl: 0.3, gr: 0.2, tap: true, nod: -0.02, n: { wash: i + 1 } });
      }
      case 'shade':
        // A hand over the eyes, looking at the deck under the new light.
        return worn({ l: c.bd(0.06, 0.92 * c.H, 0.14), r: add(SC.cue(2), 0, 0.012, 0.04), gl: 0.15, gr: 0.3, nod: -0.05, n: { wash: 3 } });
      case 'thumb':
        return worn({ l: c.bd(0.22, 0.98 * c.H, 0.26), gl: 0.85, palms: 0.1, nod: -0.05, r: add(SC.cue(2), 0, 0.012, 0.04), gr: 0.3, n: { wash: 3 } });
      case 'off': {
        const to = lerpV(onHead(), SC.phones, sm(u, 0.2, 0.9));
        return { l: add(to, 0.09, -0.02, 0), r: add(to, -0.09, -0.02, 0), gl: 0.6, gr: 0.6, props: { phones: to }, n: { wash: 3 } };
      }
      default:
        return {};
    }
  },
};

const SCRIPTS: Record<EnMotion, Script> = {
  enBit: ENBIT, enCoach: ENCOACH,
  enRehearse: ENREHEARSE, enHeadline: ENHEADLINE, enOpening: ENOPENING, enLineup: ENLINEUP,
  enWrite: ENWRITE, enPunch: ENPUNCH,
  enBarTalk: ENBARTALK, enGreen: ENGREEN, enCards: ENCARDS, enSound: ENSOUND,
};
