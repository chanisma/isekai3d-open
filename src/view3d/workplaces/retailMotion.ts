import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';

/*
 * A day at the 옷가게 (2026-11-01, the workplace pipeline, at the user's request), a shop of the made-up label 살랑옷장.
 * Each motion is a round of beats: where the dweller is, where the hands go, and what moves. The piece reads the same
 * script by the same clock (retail.ts), so the jumper the hands fold is the jumper on the ledge.
 *
 * - rtFold (의류 진열대): a rumpled jumper off the pile, shaken out, sleeves in, folded up, put on its stack and patted.
 *   rtRestock: a carton set down and opened, three stacks up into the empty cubes, a size card clipped on.
 *   rtLearn: the manager folds one, the dweller tries, gets it crooked, is put right, gets it right.
 * - rtTill / rtRush (계산대): a customer lays a garment down; scanned, the security tag taken off, folded in tissue,
 *   bagged, paid by card, handed over with both hands. The rush has a queue, a lit sign and the price gun first.
 *   rtClose: the day's report printed, the drawer counted with a junior watching, the report signed.
 * - rtTidyFit (피팅룸): the curtain drawn back, what was left on the stool and the hook gathered up, the mirror wiped,
 *   the mat straightened, the armful dropped in a basket outside, the curtain half drawn.
 *   rtPass: the customer behind the curtain, their feet under it and a hand holding out the wrong size; a bigger one
 *   brought and passed in.
 * - rtWindow (쇼윈도): the coat and dress off the middle mannequin, the next look on, a scarf, a step back to look.
 *   rtVmd: the season card turned, then the three mannequins changed one by one and the backdrop with them.
 * - rtRail (매장 행거): the hangers pushed even, one in the wrong size lifted out, hung where it belongs.
 * - rtTable (접이 매대): along the table, each rumpled top jumper refolded and each stack squared with the palms.
 * - rtSteam (스팀 다리미): the head off its holster, down the shirt from the shoulders with the hem held taut.
 * - rtStock (입고 상자): the tape cut, the slip read, each garment lifted out, shot with the tag gun, hung up.
 * - rtAcc (액세서리 스탠드): the tower turned, earring cards on their pegs, the hat set straight, a scarf retied.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front). Facing
 * the piece the dweller's right hand is on +x.
 */
export type RtMotion = 'rtFold' | 'rtRestock' | 'rtLearn' | 'rtTill' | 'rtRush' | 'rtClose' | 'rtTidyFit' | 'rtPass' | 'rtWindow' | 'rtVmd' | 'rtRail' | 'rtTable' | 'rtSteam' | 'rtStock' | 'rtAcc';
export const RT_MOTIONS = new Set<string>(['rtFold', 'rtRestock', 'rtLearn', 'rtTill', 'rtRush', 'rtClose', 'rtTidyFit', 'rtPass', 'rtWindow', 'rtVmd', 'rtRail', 'rtTable', 'rtSteam', 'rtStock', 'rtAcc']);

const frac = (x: number) => ((x % 1) + 1) % 1;
export const rtPhase = (p: THREE.Vector3) => frac(p.x * 0.391 + p.z * 0.587);
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
}
const st = (x: number, z: number, yaw = PI): St => ({ x, y: 0, z, yaw });
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
export interface RtNow {
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
    bd: (side, up, ahead) => [here.x + lx * side + fx * ahead, here.y + up, here.z + lz * side + fz * ahead],
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
export function rtNow(m: RtMotion, t: number, ph: number, H = 1.6): RtNow {
  const s = SCRIPTS[m];
  const b = beatOf(s.seq, t, ph);
  const A = evalKey(s, b.from, b.u, t, H);
  const B = b.e > 0 ? evalKey(s, b.to, 0, t, H) : A;
  const e = b.e;
  const here: St = { x: mixN(A.st.x, B.st.x, e), y: 0, z: mixN(A.st.z, B.st.z, e), yaw: angle(A.st.yaw, B.st.yaw, e) };
  const dist = Math.hypot(A.st.x - B.st.x, A.st.z - B.st.z);
  const props: Record<string, V | null> = {};
  for (const k of new Set([...Object.keys(A.key.props ?? {}), ...Object.keys(B.key.props ?? {})])) {
    const x = A.key.props?.[k] ?? null;
    const y = B.key.props?.[k] ?? null;
    props[k] = x && y ? lerpV(x, y, e) : e < 0.5 ? x : y;
  }
  const n: Record<string, number> = {};
  for (const k of new Set([...Object.keys(A.key.n ?? {}), ...Object.keys(B.key.n ?? {})])) n[k] = mixN(A.key.n?.[k] ?? 0, B.key.n?.[k] ?? 0, e);
  return { b, st: here, walking: e > 0 && e < 1 && dist > 0.12, key: blendKey(A.key, B.key, e), props, n };
}
/** A dweller at a spot of a piece here: the whole body from the script. */
export function rtPose(m: RtMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = rtNow(m, t, rtPhase(par.getWorldPosition(new THREE.Vector3())), height);
  const W = (v: V) => par.localToWorld(new THREE.Vector3(v[0], v[1], v[2]));
  const s = N.st;
  const k = N.key;
  const at = W([s.x, 0, s.z]);
  const dir = new THREE.Vector3(Math.sin(s.yaw), 0, Math.cos(s.yaw)).transformDirection(par.matrixWorld);
  const yaw = Math.atan2(dir.x, dir.z);
  const pose: BodyPose = N.walking ? { kind: 'walk', at, yaw } : { kind: 'stand', at, yaw, crouch: k.crouch };
  return {
    pose,
    doing: {
      reach: { l: k.l && W(k.l), r: k.r && W(k.r), lean: k.lean ?? 0.05, nod: k.nod ?? 0.1, palms: k.palms ?? 0.4, grip: { l: k.gl ?? 0.3, r: k.gr ?? 0.3 }, tap: k.tap },
      crouch: k.crouch ? k.crouch : undefined,
    },
  };
}
const beepAt = (u: number, a: number) => (u > a && u < a + 0.14 ? 1 : 0);
/** Both hands either side of a point (the right on +x as you face the piece). */
const both = (p: V, dx: number, up = 0.03, ahead = 0.05, g = 0.75): Key => ({ r: add(p, dx, up, ahead), l: add(p, -dx, up, ahead), gr: g, gl: g });

// =============================================================================================
// 의류 진열대 (clothesShelf, 1 × 1): cubes against the wall and a folding ledge at the waist.

export const CS = {
  stand: 0.52,
  ledge: 0.88,
  pile: [-0.3, 0.9, 0.08] as V,
  board: [0.08, 0.9, 0.08] as V,
  /** The three stacks a carton fills: (x, y of the cube's floor). */
  gaps: [[-0.24, 0.98], [0.24, 0.98], [0.24, 1.36]] as Array<[number, number]>,
  face: -0.22,
  box: [0.58, 0, 0.56] as V,
  boss: [-0.92, 0.5] as [number, number],
};
/** A folded stack sits with its bottom here. */
const gapAt = (i: number): V => [CS.gaps[i][0], CS.gaps[i][1], CS.face];
/** A jumper's state, folded from flat: how wide, how deep, how thick; up: hung from the shoulders. */
const garN = (wide: number, deep: number, up = 0, skew = 0) => ({ wide, deep, up, skew });
const FOLD: Script = {
  seq: [['pick', 1.2], ['shake', 1.1], ['f1', 1.1], ['f2', 1.1], ['f3', 1.2], ['put', 1.6], ['pat', 1.0]],
  at: (k) => (k === 'put' || k === 'pat' ? st(-0.1, CS.stand) : st(0.04, CS.stand)),
  key(k, u, c): Key {
    const n = { added: c.p('put', 0.8, 0.85), pile: 1 };
    const G = CS.board;
    switch (k) {
      case 'pick': {
        const gar = lerpV(CS.pile, add(G, 0, 0.1, 0), sm(u, 0.35, 0.95));
        return { ...both(gar, 0.09, 0.04, 0.04), nod: 0.34, lean: 0.08, props: { gar }, n: { ...n, ...garN(0.5, 0.5) } };
      }
      case 'shake': {
        // Held up by the shoulders and given a flick.
        const g: V = [G[0], 1.22 + 0.025 * Math.sin(u * PI * 6), 0.2];
        return { ...both(g, 0.17, 0.24, 0), nod: 0.12, props: { gar: g }, n: { ...n, ...garN(1, 1, 1 - sm(u, 0.75, 1)) } };
      }
      case 'f1': {
        const e = sm(u, 0.1, 0.9);
        return { r: add(G, 0.3 - 0.2 * e, 0.05 + 0.08 * Math.sin(u * PI), 0.03), l: add(G, -0.24, 0.03, 0.05), gr: 0.75, nod: 0.36, lean: 0.1, props: { gar: G }, n: { ...n, ...garN(1 - 0.27 * e, 1) } };
      }
      case 'f2': {
        const e = sm(u, 0.1, 0.9);
        return { l: add(G, -0.24 + 0.14 * e, 0.05 + 0.08 * Math.sin(u * PI), 0.03), r: add(G, 0.1, 0.03, 0.05), gl: 0.75, nod: 0.36, lean: 0.1, props: { gar: G }, n: { ...n, ...garN(0.73 - 0.2 * e, 1) } };
      }
      case 'f3': {
        const e = sm(u, 0.1, 0.9);
        return { ...both(G, 0.12, 0.05 + 0.08 * Math.sin(u * PI), 0.16 - 0.2 * e), nod: 0.38, lean: 0.1, props: { gar: G }, n: { ...n, ...garN(0.53, 1 - 0.5 * e) } };
      }
      case 'put': {
        const gar = u < 0.5 ? lerpV(G, add(gapAt(0), 0, 0.2, 0.2), sm(u, 0.05, 0.5)) : lerpV(add(gapAt(0), 0, 0.2, 0.2), add(gapAt(0), 0, 0.12, 0), sm(u, 0.5, 0.8));
        return { ...both(gar, 0.12, 0.03, 0.08, 0.8), nod: 0.14, lean: 0.12, props: { gar: u < 0.82 ? gar : null }, n: { ...n, ...garN(0.53, 0.5) } };
      }
      default: {
        const top = add(gapAt(0), 0, 0.16, 0.14);
        const pat = 0.02 * Math.abs(Math.sin(u * PI * 5));
        return { r: add(top, 0.08, pat, 0), l: add(top, -0.08, pat, 0), palms: 0.9, nod: 0.12, lean: 0.1, props: {}, n: { ...n, ...garN(0.53, 0.5) } };
      }
    }
  },
};
const RESTOCK: Script = {
  seq: [['set', 1.5], ['open', 1.3], ['s0', 1.6], ['s1', 1.6], ['s2', 1.7], ['card', 1.3], ['away', 1.2]],
  at: (k) => (k === 's0' ? st(-0.1, CS.stand + 0.06) : k === 'card' ? st(-0.04, CS.stand) : st(0.16, CS.stand + 0.06)),
  key(k, u, c): Key {
    const inBox = add(CS.box, 0, 0.3, 0);
    const n = { filled: c.p('s0', 0.8, 0.85) + c.p('s1', 0.8, 0.85) + c.p('s2', 0.8, 0.85), flaps: c.p('open', 0.1, 0.9), stock: 1, boxOn: 1 - c.p('away', 0.6, 0.9), card: c.p('card', 0.4, 0.8) };
    const put = (i: number): Key => {
      const home = add(gapAt(i), 0, 0.08, 0);
      const stack = u < 0.5 ? lerpV(inBox, add(home, 0, 0.1, 0.24), sm(u, 0.08, 0.5)) : lerpV(add(home, 0, 0.1, 0.24), home, sm(u, 0.5, 0.82));
      return { ...both(stack, 0.13, 0.03, 0.1, 0.85), crouch: u < 0.22 ? 0.72 : 0, nod: u < 0.22 ? 0.42 : i === 2 ? -0.1 : 0.12, lean: 0.1, props: { stack: u < 0.84 ? stack : null, box: CS.box }, n };
    };
    switch (k) {
      case 'set': {
        const box = lerpV(add(CS.box, -0.12, 0.72, -0.08), CS.box, sm(u, 0.15, 0.85));
        return { ...both(add(box, 0, 0.2, 0), 0.22, 0, 0, 0.9), crouch: 0.7 * sm(u, 0.3, 0.8), nod: 0.3, props: { box }, n: { ...n, boxOn: 1 } };
      }
      case 'open':
        return { r: add(CS.box, 0.14, 0.4, 0.02), l: add(CS.box, -0.14, 0.4, 0.02), gr: 0.6, gl: 0.6, crouch: 0.78, nod: 0.45, props: { box: CS.box }, n };
      case 's0':
        return put(0);
      case 's1':
        return put(1);
      case 's2':
        return put(2);
      case 'card':
        // The size card clipped to the cube's edge.
        return { r: add(gapAt(1), -0.02 + 0.03 * sm(u, 0.1, 0.6), -0.04, 0.17), l: add(gapAt(1), -0.14, -0.04, 0.17), gr: 0.7, nod: 0.14, props: { box: CS.box }, n };
      default: {
        const box = lerpV(CS.box, add(CS.box, 0.5, 0, 0.3), sm(u, 0.4, 0.9));
        return { ...both(add(box, 0, 0.2, 0), 0.22, 0, 0, 0.9), crouch: 0.7 * (1 - sm(u, 0.2, 0.7)), nod: 0.3, props: { box }, n };
      }
    }
  },
};
const LEARN: Script = {
  seq: [['listen', 1.8, 0.7], ['show', 3.2, 0.7], ['try', 2.4], ['crooked', 1.5], ['fix', 2.2], ['ok', 1.6]],
  at: (k) => (k === 'listen' || k === 'show' ? st(0.26, CS.stand + 0.1, PI - 0.55) : st(0.06, CS.stand)),
  key(k, u, c): Key {
    const G = CS.board;
    const base = { lesson: 1, mArm: 0, mNod: 0 };
    const watching = { l: c.bd(0.16, 0.58 * c.H, 0.14), r: c.bd(-0.16, 0.58 * c.H, 0.14), nod: 0.26 };
    const foldBy = (e: number) => garN(mixN(1, 0.53, sm(e, 0, 0.65)), mixN(1, 0.5, sm(e, 0.65, 1)));
    switch (k) {
      case 'listen':
        return { ...watching, nod: 0.1 + 0.08 * Math.sin(c.t * 2.2), props: { gar: G }, n: { ...base, ...garN(1, 1) } };
      case 'show':
        return { ...watching, props: { gar: G }, n: { ...base, mArm: 1, ...foldBy(sm(u, 0.1, 0.92)) } };
      case 'try': {
        const e = sm(u, 0.05, 0.95);
        return { ...both(G, 0.2 - 0.09 * e, 0.05 + 0.05 * Math.sin(u * PI * 3), 0.1 - 0.08 * e), nod: 0.38, lean: 0.1, props: { gar: G }, n: { ...base, ...foldBy(e), skew: 0.42 * e } };
      }
      case 'crooked':
        // It comes out lopsided. A hand to the back of the neck.
        return { r: add(G, 0.14, 0.05, 0.06), l: c.bd(0.16, 0.86 * c.H, -0.06), nod: 0.22, props: { gar: G }, n: { ...base, mNod: 0, mArm: u > 0.4 ? 1 : 0, ...garN(0.53, 0.5, 0, 0.42) } };
      case 'fix': {
        const e = sm(u, 0.1, 0.8);
        return { ...both(G, 0.14, 0.05, 0.02), palms: 0.8, nod: 0.36, lean: 0.1, props: { gar: G }, n: { ...base, ...garN(0.53, 0.5, 0, 0.42 * (1 - e)) } };
      }
      default:
        return { r: add(G, 0.14, 0.05, 0.02), l: add(G, -0.14, 0.05, 0.02), palms: 0.8, nod: 0.3 * Math.sin(u * PI), props: { gar: G }, n: { ...base, mNod: 1, ...garN(0.53, 0.5) } };
    }
  },
};

// =============================================================================================
// 계산대 (checkoutCounter, 2 × 1): front to the staff side; customers on its back (-z).

export const CK = {
  stand: 0.56,
  top: 0.94,
  pos: [-0.62, 1.2, 0.06] as V,
  scanner: [-0.22, 1.02, 0.2] as V,
  drop: [0.02, 0.96, -0.18] as V,
  wrap: [0.34, 0.96, 0.02] as V,
  bag: [0.62, 0.96, -0.08] as V,
  term: [-0.56, 1.0, -0.33] as V,
  gun: [0.72, 1.0, 0.24] as V,
  printer: [-0.22, 1.02, -0.18] as V,
  drawer: [-0.62, 0.72, 0.36] as V,
  cust: [0.02, -0.88] as [number, number],
  junior: [0.34, 0.8] as [number, number],
};
function tillScript(rush: boolean): Script {
  const q = rush ? 0.64 : 1;
  const seq: Seq = [['wait', rush ? 0.3 : 1.0], ['greet', 1.3 * q], ['lay', 1.2 * q], ...(rush ? ([['price', 1.0]] as Seq) : []), ['scan', 1.4 * q], ['tag', 1.5 * q], ['wrap', 2.0 * q], ['pay', 2.1 * q], ['give', 1.7 * q], ['gone', rush ? 0.4 : 1.0]];
  return {
    seq,
    at: (k) => (k === 'wrap' || k === 'give' || k === 'price' ? st(0.28, CK.stand) : k === 'pay' ? st(-0.26, CK.stand) : st(-0.02, CK.stand)),
    key(k, u, c): Key {
      const down = lerpV(add(CK.drop, -0.02, 0.22, -0.34), CK.drop, c.p('lay', 0.2, 0.8));
      const atWrap = lerpV(CK.drop, CK.wrap, c.p('tag', 0.8, 1) );
      const inBag = c.p('wrap', 0.72, 0.95);
      const gar: V | null = c.p('greet', 0, 0.7) <= 0 || inBag >= 1 ? null : inBag > 0 ? lerpV(CK.wrap, add(CK.bag, 0, 0.14, 0), inBag) : k === 'wrap' || c.p('tag') >= 1 ? CK.wrap : c.p('tag', 0.8, 1) > 0 ? atWrap : down;
      const fold = c.p('wrap', 0.05, 0.6);
      const handoff: V = [CK.cust[0] + 0.1, 0.98, -0.42];
      const bagAt: V | null = c.p('wrap', 0.5, 0.65) <= 0 ? null : c.p('give', 0.72, 1) > 0 ? lerpV(handoff, [CK.cust[0] + 0.22, 0.62, CK.cust[1] + 0.14], c.p('give', 0.72, 1)) : c.p('give', 0.1, 0.65) > 0 ? lerpV(CK.bag, handoff, c.p('give', 0.1, 0.65)) : CK.bag;
      const props: Record<string, V | null> = { gar, bag: c.p('gone', 0.05, 0.1) > 0 ? null : bagAt };
      const n = {
        rush: rush ? 1 : 0,
        cust: c.p('greet', 0, 0.5) - c.p('gone', 0, 1),
        wide: 1 - 0.45 * fold,
        deep: 1 - 0.5 * fold,
        tissue: c.p('wrap', 0.1, 0.3) - c.p('wrap', 0.72, 0.8),
        scanned: c.p('scan', 0.42, 0.5),
        tagOff: c.p('tag', 0.55, 0.65),
        sale: 0,
        paid: c.p('pay', 0.65, 0.8),
        cTap: 0,
        cBow: 0,
        cLay: c.p('greet', 0.6, 1) - c.p('lay', 0.65, 1),
        took: c.p('give', 0.72, 0.78),
        queue: rush ? 3 - c.p('gone', 0, 1) : 0,
      };
      const tagAt = add(CK.drop, 0.08, 0.05, 0.08);
      switch (k) {
        case 'wait':
          return { nod: 0.08, l: c.bd(0.22, 0.56 * c.H, 0.08), r: c.bd(-0.22, 0.56 * c.H, 0.08), props, n };
        case 'greet':
          return { nod: Math.sin(u * PI) * 0.34, lean: Math.sin(u * PI) * 0.16, props, n };
        case 'lay':
          return { ...both(CK.drop, 0.16, 0.02, 0.1, 0.5), nod: 0.32, props, n };
        case 'price': {
          // The sale sticker fired on the tag with the price gun.
          const g = lerpV(CK.gun, add(tagAt, 0.04, 0.09, 0.06), sm(u, 0.05, 0.5));
          return { r: g, gr: 0.9, l: add(tagAt, -0.1, 0.03, 0.1), gl: 0.7, nod: 0.36, props: { ...props, gun: g }, n: { ...n, sale: sm(u, 0.55, 0.62), shot: beepAt(u, 0.55) } };
        }
        case 'scan': {
          const s = lerpV(CK.scanner, add(tagAt, 0.02, 0.09, 0.04), sm(u, 0.05, 0.38));
          const back = lerpV(s, CK.scanner, sm(u, 0.7, 1));
          return { r: back, gr: 0.9, l: add(tagAt, -0.08, 0.03, 0.08), gl: 0.7, nod: 0.36, props: { ...props, scan: back }, n: { ...n, sale: rush ? 1 : 0, beep: beepAt(u, 0.42) } };
        }
        case 'tag': {
          // The hard tag popped off on the detacher set in the counter, and dropped in the tray.
          const e = sm(u, 0.2, 0.55);
          return { r: add(tagAt, 0.04, 0.03 + 0.05 * e, 0.06), l: add(tagAt, -0.1, 0.03, 0.08), gr: 0.85, gl: 0.8, nod: 0.38, lean: 0.08, props, n: { ...n, sale: rush ? 1 : 0 } };
        }
        case 'wrap': {
          const h = u < 0.7 ? CK.wrap : add(CK.bag, 0, 0.14, 0);
          const sw = 0.1 * Math.sin(u * PI * 3);
          return { ...both(add(h, sw * 0.2, 0.04, 0), 0.15 - 0.05 * fold, 0.02, 0.06, 0.75), nod: 0.36, lean: 0.1, props, n };
        }
        case 'pay':
          return { l: add(CK.pos, 0.06 + 0.1 * frac(u * 3), -0.03, 0.04), tap: u < 0.4, r: c.bd(-0.2, 0.6 * c.H, 0.14), nod: 0.24, props, n: { ...n, cTap: sm(u, 0.25, 0.42) - sm(u, 0.78, 0.92) } };
        case 'give': {
          // With both hands, and a bow.
          const b = u < 0.65 ? props.bag ?? handoff : handoff;
          return { ...both(add(b, 0, 0.3, 0.04), 0.07, 0, 0.03, 0.85), nod: 0.2 + 0.2 * sm(u, 0.75, 1), lean: 0.14 + 0.16 * sm(u, 0.75, 1), props, n: { ...n, cBow: sm(u, 0.7, 1) } };
        }
        default:
          return { nod: 0.05, props, n };
      }
    },
  };
}
const CLOSE: Script = {
  seq: [['print', 1.8, 0.6], ['drawer', 1.4], ['notes', 2.4], ['coins', 2.0], ['show', 2.8], ['tick', 1.6], ['shut', 1.2], ['bow', 1.3]],
  at: (k) => (k === 'show' ? st(-0.3, CK.stand + 0.04, PI + 0.45) : st(-0.48, CK.stand)),
  key(k, u, c): Key {
    const slip: V = [CK.printer[0] + 0.02, 1.04, CK.printer[2] + 0.12];
    const n = { jr: 1, closing: 1, drawer: c.p('drawer', 0.1, 0.8) - c.p('shut', 0.1, 0.8), slip: c.p('print', 0.1, 0.9), counted: c.p('notes', 0, 1), coined: c.p('coins', 0, 1), signed: c.p('tick', 0.5, 0.8), jTap: 0, jNod: 0 };
    const well = add(CK.drawer, 0, 0.1, 0.02);
    switch (k) {
      case 'print':
        return { l: add(CK.pos, 0.08 * frac(u * 2), -0.03, 0.04), tap: u < 0.5, r: add(slip, 0.02, 0.02, 0.05), gr: 0.6, nod: 0.26, props: {}, n };
      case 'drawer':
        return { r: add(CK.drawer, 0.04, 0.14, 0.05 + 0.1 * sm(u, 0.1, 0.8)), gr: 0.7, nod: 0.4, lean: 0.1, props: {}, n };
      case 'notes': {
        // Each note lifted across from the left hand with the thumb.
        const flick = 0.04 * Math.sin(u * PI * 8);
        return { l: add(well, -0.08, 0.14, 0.1), gl: 0.75, r: add(well, 0.08 + flick, 0.16, 0.1), gr: 0.65, nod: 0.42, lean: 0.1, props: { wad: add(well, -0.08, 0.13, 0.1) }, n };
      }
      case 'coins':
        return { r: add(well, 0.14 * Math.sin(u * PI * 3), 0.1, 0.03), l: add(well, -0.16, 0.12, 0.08), gr: 0.75, nod: 0.44, lean: 0.12, props: {}, n };
      case 'show':
        // The figures on the screen, a hand showing the junior where they go; they try it.
        return { r: add(CK.pos, 0.2, -0.06, 0.03), l: c.bd(0.18, 0.58 * c.H, 0.12), nod: 0.14 + 0.08 * Math.sin(c.t * 2), props: {}, n: { ...n, jTap: u > 0.45 ? 1 : 0 } };
      case 'tick':
        return { r: add(slip, 0.02 + 0.05 * Math.sin(u * PI * 4), 0.02, 0.01), gr: 0.85, l: add(slip, -0.1, 0.02, 0.02), nod: 0.42, props: { pen: add(slip, 0.02 + 0.05 * Math.sin(u * PI * 4), 0.06, 0.01) }, n };
      case 'shut':
        return { r: add(CK.drawer, 0.04, 0.14, 0.15 - 0.1 * sm(u, 0.1, 0.8)), gr: 0.7, nod: 0.4, lean: 0.1, props: {}, n };
      default:
        return { nod: 0.3 * Math.sin(u * PI), lean: 0.14 * Math.sin(u * PI), props: {}, n: { ...n, jNod: 1 } };
    }
  },
};

// =============================================================================================
// 피팅룸 (fittingRoom, 1 × 1): a cubicle with a curtain across its front and a mirror in its back wall.

export const FR = {
  stand: 0.68,
  inside: 0.08,
  stool: [0.22, 0.46, -0.16] as V,
  hook: [-0.38, 1.58, -0.14] as V,
  mirror: [0, 1.12, -0.38] as V,
  mat: [0, 0.03, -0.02] as V,
  basket: [0.64, 0, 0.6] as V,
  slit: [0.32, 1.12, 0.42] as V,
};
const TIDY: Script = {
  seq: [['open', 1.2], ['stoolb', 1.5], ['hookb', 1.5], ['wipe', 2.4], ['matb', 1.4], ['drop', 1.5], ['close', 1.1]],
  at: (k) => (k === 'open' || k === 'close' ? st(0.1, FR.stand) : k === 'drop' ? st(0.26, FR.stand + 0.04, PI - 0.7) : k === 'hookb' ? st(-0.06, FR.inside) : st(0.03, FR.inside)),
  key(k, u, c): Key {
    const n = { cur: c.p('open', 0.1, 0.9) - 0.3 * c.p('close', 0.15, 0.9), left: 1 - c.p('stoolb', 0.3, 0.5), hung: 1 - c.p('hookb', 0.45, 0.65), clean: c.p('wipe', 0.1, 0.9), mat: c.p('matb', 0.2, 0.8), basket: 1, inBasket: c.p('drop', 0.55, 0.65) };
    const arm = (): V => c.bd(0.14, 0.62 * c.H, 0.17);
    const arms = c.p('stoolb', 0.45, 0.5) > 0 && c.p('drop', 0.55, 0.65) < 1 ? 1 : 0;
    const armProp = { pile: arms ? add(arm(), -0.02, 0.05, 0.02) : null };
    const hold = arms ? { l: arm(), gl: 0.65 } : {};
    switch (k) {
      case 'open':
        return { r: [-0.45 + 0.9 * (1 - 0.8 * sm(u, 0.1, 0.9)), 1.3, 0.48], gr: 0.8, nod: -0.02, props: {}, n: { ...n, cur: sm(u, 0.1, 0.9) } };
      case 'stoolb':
        return { ...both(FR.stool, 0.12, 0.08, 0.06, 0.7), crouch: 0.42, nod: 0.45, props: { ...(u > 0.45 ? { pile: add(FR.stool, 0, 0.08 + 0.3 * sm(u, 0.45, 0.9), 0.1) } : {}) }, n };
      case 'hookb': {
        const e = sm(u, 0.2, 0.55);
        return { ...hold, r: add(FR.hook, 0.04, -0.06, 0.1 + 0.05 * e), gr: 0.8, nod: -0.14, props: armProp, n };
      }
      case 'wipe': {
        const sweep = Math.sin(u * PI * 5);
        const cloth: V = [FR.mirror[0] + 0.15 * sweep, FR.mirror[1] + 0.26 - 0.5 * u, FR.mirror[2] + 0.05];
        return { ...hold, r: add(cloth, 0.01, 0, 0.03), gr: 0.75, nod: 0.05 + 0.1 * u, lean: 0.12, props: { ...armProp, cloth }, n };
      }
      case 'matb': {
        const e = sm(u, 0.15, 0.8);
        return { ...hold, r: add(FR.mat, 0.16, 0.04, 0.16 - 0.08 * e), gr: 0.6, crouch: 0.72, nod: 0.5, props: armProp, n };
      }
      case 'drop': {
        const into = add(FR.basket, 0, 0.42, 0);
        return { ...both(u < 0.55 ? lerpV(c.bd(0, 0.62 * c.H, 0.22), into, sm(u, 0.05, 0.55)) : into, 0.1, 0.04, 0, 0.6), nod: 0.32, lean: 0.14, props: { pile: u < 0.6 ? lerpV(c.bd(0, 0.62 * c.H, 0.2), into, sm(u, 0.05, 0.55)) : null }, n };
      }
      default:
        return { r: [-0.45 + 0.9 * (1 - 0.8 * (1 - 0.3 * sm(u, 0.15, 0.9))), 1.3, 0.48], gr: 0.8, nod: -0.02, props: {}, n };
    }
  },
};
const PASS: Script = {
  seq: [['knock', 1.4], ['ask', 1.5], ['take', 1.3], ['fetch', 1.8], ['give', 1.5], ['wait', 1.8], ['ok', 1.4]],
  at: (k) => (k === 'fetch' ? st(0.56, 1.02, 0.5) : st(0.18, FR.stand)),
  key(k, u, c): Key {
    const n = { cur: 0, feet: 1, arm: 0, size: c.p('fetch', 0.5, 0.6), thumb: 0 };
    const out = add(FR.slit, 0.02, -0.04, 0.3);
    const held = c.bd(-0.14, 0.72 * c.H, 0.22);
    switch (k) {
      case 'knock': {
        const rap = 0.03 * Math.abs(Math.sin(u * PI * 4));
        return { r: [0.42, 1.28, 0.5 + rap], gr: 0.85, nod: 0.05, props: {}, n };
      }
      case 'ask':
        return { nod: 0.1 + 0.05 * Math.sin(c.t * 3), lean: 0.1, l: c.bd(0.16, 0.58 * c.H, 0.12), r: c.bd(-0.16, 0.58 * c.H, 0.12), props: { hanger: out }, n: { ...n, arm: sm(u, 0.15, 0.7) } };
      case 'take': {
        const e = sm(u, 0.3, 0.8);
        return { r: lerpV(add(out, 0, 0.03, 0.04), held, e), gr: 0.85, nod: 0.12, props: { hanger: lerpV(out, add(held, 0, -0.02, 0), e) }, n: { ...n, arm: 1 - sm(u, 0.55, 1) } };
      }
      case 'fetch':
        // To the rail beside the booths: this one back, the next size up off it.
        return { r: c.bd(-0.16, 0.86 * c.H, 0.3 + 0.08 * Math.sin(u * PI * 2)), gr: 0.85, l: c.bd(0.14, 0.82 * c.H, 0.3), gl: 0.5, nod: 0.04, props: { hanger: c.bd(-0.16, 0.86 * c.H - 0.02, 0.3) }, n };
      case 'give': {
        const e = sm(u, 0.1, 0.7);
        const from = c.bd(-0.14, 0.72 * c.H, 0.22);
        return { r: lerpV(from, add(out, 0, 0.03, 0.04), e), gr: 0.85, nod: 0.08, lean: 0.08 * e, props: { hanger: u < 0.9 ? lerpV(add(from, 0, -0.02, 0), out, e) : out }, n: { ...n, arm: sm(u, 0.55, 0.85) } };
      }
      case 'wait':
        return { l: c.bd(0.16, 0.58 * c.H, 0.12), r: c.bd(-0.16, 0.58 * c.H, 0.12), nod: 0.12 + 0.04 * Math.sin(c.t * 1.7), props: { hanger: lerpV(out, add(FR.slit, 0, -0.04, -0.1), sm(u, 0, 0.4)) }, n: { ...n, arm: 1 - sm(u, 0, 0.4) } };
      default:
        // A thumb out through the curtain: it fits.
        return { nod: 0.24 * Math.sin(u * PI), lean: 0.12 * Math.sin(u * PI), props: {}, n: { ...n, arm: sm(u, 0.05, 0.3) - sm(u, 0.8, 1), thumb: 1 } };
    }
  },
};

// =============================================================================================
// 쇼윈도 진열대 (rtWindowDisplay, 3 × 1): three mannequins on a low plinth before a backdrop.

export const WD = {
  stand: 0.5,
  plinth: 0.16,
  z: -0.12,
  xs: [-0.98, 0, 0.98],
  card: [1.34, 0.98, 0.34] as V,
};
const manAt = (i: number, up: number, ahead = 0.2): V => [WD.xs[i], WD.plinth + up, WD.z + ahead];
const WINDOW: Script = {
  seq: [['off', 1.8], ['smooth', 1.3], ['on', 1.8], ['coat', 1.7], ['scarf', 1.6], ['back', 1.8, 0.8], ['adjust', 1.3]],
  at: (k) => (k === 'back' ? st(0.1, WD.stand + 0.5) : st(0.04, WD.stand)),
  key(k, u, c): Key {
    const n = { coat: 1 - c.p('off', 0.25, 0.7) + c.p('coat', 0.3, 0.8), next: c.p('on', 0.25, 0.6), scarf: 1 - c.p('off', 0.02, 0.2) + c.p('scarf', 0.3, 0.8), dress: 1, spare: 1 - c.p('coat', 0.3, 0.5) };
    const sh = manAt(1, 1.2);
    switch (k) {
      case 'off': {
        const e = sm(u, 0.25, 0.7);
        const coat = lerpV(add(sh, 0, 0.02, 0.02), [0.5, 1.05, 0.3], e);
        return { ...both(lerpV(sh, [0.42, 1.08, 0.3], e), 0.15 - 0.09 * e, 0.03, 0.03, 0.8), nod: 0.14, lean: 0.1, props: { coat: u > 0.25 && u < 0.72 ? coat : null }, n };
      }
      case 'smooth': {
        const dn = u * 0.42;
        const sw = 0.02 * Math.sin(u * PI * 6);
        return { r: add(sh, 0.13, -dn, 0.03 + sw), l: add(sh, -0.13, -dn, 0.03 - sw), palms: 0.9, nod: 0.24 + 0.2 * u, lean: 0.14, props: {}, n };
      }
      case 'on': {
        // The next look lifted over, with a hand to each shoulder.
        const y = 0.22 * (1 - sm(u, 0.2, 0.7));
        return { ...both(add(sh, 0, y, 0.03), 0.16, 0.03, 0.03, 0.7), nod: -0.04, lean: 0.12, props: {}, n };
      }
      case 'coat': {
        const e = sm(u, 0.1, 0.65);
        const coat = lerpV([0.5, 1.05, 0.3], add(sh, 0, 0.02, 0.02), e);
        return { ...both(lerpV([0.42, 1.08, 0.3], sh, e), 0.09 + 0.07 * e, 0.03, 0.03, 0.8), nod: 0.1, lean: 0.1, props: { coat: u < 0.68 ? coat : null }, n };
      }
      case 'scarf': {
        const sway = 0.03 * Math.sin(u * PI * 4);
        return { r: add(sh, 0.05 + sway, 0.08, 0.05), l: add(sh, -0.05 - sway, 0.08, 0.05), gr: 0.75, gl: 0.75, nod: 0.06, lean: 0.14, props: {}, n };
      }
      case 'back':
        // A step back, a hand to the chin.
        return { l: c.bd(0.05, 0.86 * c.H, 0.12), r: c.bd(-0.12, 0.58 * c.H, 0.12), nod: 0.02 + 0.03 * Math.sin(c.t * 1.5), props: {}, n };
      default: {
        const hip = manAt(1, 0.96);
        return { r: add(hip, 0.1, 0, 0.03), l: add(hip, -0.1, 0.04, 0.03), palms: 0.8, nod: 0.24, lean: 0.12, props: {}, n };
      }
    }
  },
};
const VMD: Script = {
  seq: [['card', 1.8, 0.7], ['m2', 2.2, 0.8], ['m1', 2.2, 0.8], ['m0', 2.2, 0.8], ['look', 2.0, 0.8]],
  at: (k) => (k === 'card' ? st(1.2, 0.92, PI + 0.1) : k === 'm2' ? st(0.98, WD.stand) : k === 'm1' ? st(0.02, WD.stand) : k === 'm0' ? st(-0.98, WD.stand) : st(0, WD.stand + 0.55)),
  key(k, u, c): Key {
    const n = { season: c.p('card', 0.45, 0.55), m2: c.p('m2', 0.45, 0.55), m1: c.p('m1', 0.45, 0.55), m0: c.p('m0', 0.45, 0.55), flip: c.p('card', 0.2, 0.75) };
    const dress = (i: number): Key => {
      const sh = manAt(i, 1.2);
      const y = 0.16 * Math.sin(u * PI);
      return { ...both(add(sh, 0, y, 0.03), 0.16, 0.03, 0.03, 0.75), nod: 0.04, lean: 0.12, props: {}, n };
    };
    switch (k) {
      case 'card': {
        const e = Math.sin(sm(u, 0.15, 0.8) * PI);
        return { ...both(add(WD.card, 0, 0.2, 0.06 + 0.05 * e), 0.1, 0.03, 0.03, 0.75), nod: 0.22, props: {}, n };
      }
      case 'm2':
        return dress(2);
      case 'm1':
        return dress(1);
      case 'm0':
        return dress(0);
      default:
        return { l: c.bd(0.05, 0.86 * c.H, 0.12), r: c.bd(-0.12, 0.58 * c.H, 0.12), nod: 0.02, props: {}, n };
    }
  },
};

// =============================================================================================
// 매장 행거 (rtGarmentRail, 2 × 1): hangers along a rail with size rings between.

export const RL = {
  stand: 0.55,
  y: 1.42,
  n: 12,
  span: 0.8,
  out: 3,
  into: 9,
};
export const railX = (i: number) => -RL.span + (i / (RL.n - 1)) * 2 * RL.span;
const RAIL: Script = {
  seq: [['sweep', 1.8], ['lift', 1.3], ['carry', 1.1, 0.7], ['hang', 1.3], ['ring', 1.2], ['even', 1.8], ['look', 1.0]],
  at: (k) => (k === 'sweep' ? st(-0.42, RL.stand) : k === 'lift' ? st(railX(RL.out) + 0.05, RL.stand) : k === 'look' ? st(0, RL.stand + 0.2) : st(railX(RL.into) - 0.05, RL.stand)),
  key(k, u, c): Key {
    const n = { neat: 0.5 * c.p('sweep', 0.05, 1) + 0.5 * c.p('even', 0.05, 1), gone: c.p('lift', 0.3, 0.45) - c.p('hang', 0.6, 0.75), inNew: c.p('hang', 0.7, 0.75), ring: c.p('ring', 0.3, 0.7) };
    const hook = (i: number): V => [railX(i), RL.y, 0.02];
    switch (k) {
      case 'sweep': {
        const x = mixN(-0.7, -0.05, sm(u, 0, 1));
        return { r: [x, RL.y - 0.02, 0.1], gr: 0.6, l: [-0.86, RL.y - 0.02, 0.1], gl: 0.5, nod: -0.06, props: {}, n };
      }
      case 'lift': {
        const e = sm(u, 0.2, 0.8);
        const a = hook(RL.out);
        const gar = add(a, 0.02, 0.12 * e, 0.26 * e);
        return { r: add(gar, 0, 0.0, 0.03), gr: 0.85, l: add(gar, -0.03, -0.28 * e - 0.08, 0.05), gl: 0.6, nod: -0.05, props: { gar: u > 0.3 ? gar : null }, n };
      }
      case 'carry': {
        const gar = c.bd(-0.12, 0.84 * c.H, 0.26);
        return { r: add(gar, 0, 0, 0.03), gr: 0.85, nod: 0.08, props: { gar }, n };
      }
      case 'hang': {
        const e = sm(u, 0.1, 0.7);
        const a = hook(RL.into);
        const gar = lerpV(add(a, 0.02, 0.12, 0.26), a, e);
        return { r: add(gar, 0, 0, 0.03), gr: 0.85, nod: -0.05, props: { gar: u < 0.72 ? gar : null }, n };
      }
      case 'ring': {
        const r: V = [railX(RL.into) + 0.08, RL.y - 0.03, 0.09];
        return { r, gr: 0.8, l: add(r, -0.12, 0, 0.0), gl: 0.5, nod: -0.05, props: {}, n };
      }
      case 'even': {
        const x = mixN(railX(RL.into) - 0.1, railX(RL.into) - 0.65, sm(u, 0, 1));
        return { l: [x, RL.y - 0.02, 0.1], gl: 0.6, r: [railX(RL.into) + 0.05, RL.y - 0.02, 0.1], gr: 0.5, nod: -0.06, props: {}, n };
      }
      default:
        return { l: c.bd(0.16, 0.58 * c.H, 0.12), r: c.bd(-0.16, 0.58 * c.H, 0.12), nod: 0.06, props: {}, n };
    }
  },
};

// =============================================================================================
// 접이 매대 (rtFoldTable, 3 × 1): stacks on a low table.

export const FT = {
  stand: 0.6,
  top: 0.74,
  xs: [-0.9, 0, 0.9],
  z: [0.16, -0.2],
  high: 0.2,
};
const stackTop = (i: number): V => [FT.xs[i], FT.top + FT.high + 0.02, FT.z[0]];
const TABLE: Script = {
  seq: [['a0', 1.2], ['a1', 1.3], ['a2', 1.0], ['b0', 1.2, 0.8], ['b1', 1.3], ['b2', 1.0], ['c0', 1.2, 0.8], ['c1', 1.3], ['c2', 1.0], ['sign', 1.2, 0.8]],
  at: (k) => (k === 'sign' ? st(0.46, FT.stand) : st(FT.xs[k[0] === 'a' ? 0 : k[0] === 'b' ? 1 : 2], FT.stand)),
  key(k, u, c): Key {
    const n = { d0: c.p('a2', 0, 0.4), d1: c.p('b2', 0, 0.4), d2: c.p('c2', 0, 0.4), lift: 0, fold: 0 };
    if (k === 'sign') return { r: [0.46, FT.top + 0.14, 0.14], gr: 0.8, l: [0.3, FT.top + 0.14, 0.14], gl: 0.6, nod: 0.3, lean: 0.08, props: {}, n };
    const i = k[0] === 'a' ? 0 : k[0] === 'b' ? 1 : 2;
    const top = stackTop(i);
    switch (k[1]) {
      case '0': {
        // The rumpled one off the top, onto the table's edge.
        const gar = lerpV(top, [top[0] + 0.02, FT.top + 0.22, 0.34], sm(u, 0.2, 0.85));
        return { ...both(gar, 0.11, 0.03, 0.05, 0.75), nod: 0.38, lean: 0.1, props: { gar }, n: { ...n, lift: i + 1 } };
      }
      case '1': {
        const e = sm(u, 0.05, 0.95);
        const G: V = [top[0] + 0.02, FT.top + 0.22, 0.34];
        const flap = Math.sin(u * PI * 3);
        return { r: add(G, 0.12 - 0.04 * e, 0.04 + 0.05 * Math.abs(flap), 0.04), l: add(G, -0.12 + 0.04 * e, 0.04 + 0.05 * Math.abs(flap), 0.04), gr: 0.7, gl: 0.7, nod: 0.42, lean: 0.1, props: { gar: G }, n: { ...n, lift: i + 1, fold: e } };
      }
      default: {
        // Back on top, squared with the palms from each side.
        const e = sm(u, 0.05, 0.45);
        const G = lerpV([top[0] + 0.02, FT.top + 0.22, 0.34], top, e);
        const sq = sm(u, 0.5, 1);
        const y = FT.top + FT.high * 0.6;
        const k2: Key = u < 0.48 ? both(G, 0.11, 0.03, 0.05, 0.75) : { r: [top[0] + 0.2 - 0.03 * Math.sin(sq * PI * 3), y, top[2]], l: [top[0] - 0.2 + 0.03 * Math.sin(sq * PI * 3), y, top[2]], palms: 0.95 };
        return { ...k2, nod: 0.42, lean: 0.12, props: { gar: u < 0.48 ? G : null }, n: { ...n, lift: u < 0.48 ? i + 1 : 0, fold: 1 } };
      }
    }
  },
};

// =============================================================================================
// 스팀 다리미 (rtSteamer, 1 × 1): a tank on castors, a hook pole and a shirt hung from it.

export const ST = {
  stand: 0.56,
  rest: [0.3, 1.02, -0.1] as V,
  shoulder: [-0.06, 1.42, 0.06] as V,
  hem: [-0.06, 0.82, 0.06] as V,
  tank: [0.3, 0.4, -0.22] as V,
};
const STEAM: Script = {
  seq: [['take', 1.2], ['heat', 1.2], ['p0', 1.8], ['p1', 1.8], ['p2', 1.8], ['turn', 1.5], ['p3', 1.8], ['park', 1.2]],
  at: () => st(0.02, ST.stand),
  key(k, u, c): Key {
    const n = { power: c.p('heat', 0.1, 0.5) - c.p('park', 0.3, 0.7), steam: 0, smooth: (c.p('p0') + c.p('p1') + c.p('p2') + c.p('p3')) / 4, turn: 0 };
    const pass = (x: number): Key => {
      const y = mixN(ST.shoulder[1], ST.hem[1] + 0.06, 0.5 - 0.5 * Math.cos(u * PI * 2));
      const head: V = [ST.shoulder[0] + x, y, ST.shoulder[2] + 0.09];
      return { r: add(head, 0.01, 0, 0.09), gr: 0.9, l: add(ST.hem, x * 0.5, 0.0, 0.03), gl: 0.85, nod: 0.08 + 0.3 * (1.45 - y), lean: 0.08, props: { head }, n: { ...n, steam: 1 } };
    };
    switch (k) {
      case 'take': {
        const head = lerpV(ST.rest, add(ST.shoulder, 0.18, 0, 0.14), sm(u, 0.2, 0.9));
        return { r: add(head, 0.01, 0, 0.09), gr: 0.9, nod: 0.2, props: { head }, n };
      }
      case 'heat': {
        const head = add(ST.shoulder, 0.18, 0, 0.14);
        return { r: add(head, 0.01, 0, 0.09), gr: 0.9, l: add(ST.shoulder, -0.02, 0.0, 0.03), gl: 0.7, nod: 0.08, props: { head }, n: { ...n, steam: sm(u, 0.4, 1) * 0.6 } };
      }
      case 'p0':
        return pass(-0.08);
      case 'p1':
        return pass(0.0);
      case 'p2':
        return pass(0.08);
      case 'turn': {
        // The shirt turned on its hanger to get at the back.
        const head = add(ST.shoulder, 0.2, -0.1, 0.16);
        return { r: add(head, 0.01, 0, 0.09), gr: 0.9, l: add(ST.shoulder, -0.04, -0.08, 0.04 + 0.04 * Math.sin(u * PI)), gl: 0.8, nod: 0.12, props: { head }, n: { ...n, turn: sm(u, 0.15, 0.85) } };
      }
      case 'p3':
        return { ...pass(0.03), n: { ...n, steam: 1, turn: 1 } };
      default: {
        const head = lerpV(add(ST.shoulder, 0.18, 0, 0.14), ST.rest, sm(u, 0.1, 0.8));
        return { r: add(head, 0.01, 0, 0.09), gr: 0.9, nod: 0.2, props: { head: u < 0.85 ? head : null }, n: { ...n, turn: 1 - sm(u, 0.2, 0.9) } };
      }
    }
  },
};

// =============================================================================================
// 입고 상자 (rtStockBoxes, 2 × 1): cartons, one open on a trolley, a rolling rail to its right.

export const BX = {
  stand: 0.58,
  trolley: 0.56,
  open: [-0.44, 0.56, 0.02] as V,
  slip: [-0.1, 0.84, 0.16] as V,
  railX: 0.2,
  railY: 1.54,
  gun: [-0.08, 0.72, 0.2] as V,
};
const STOCK: Script = {
  seq: [['cut', 1.6], ['slip', 1.4], ['l0', 1.2], ['g0', 1.2], ['h0', 1.2, 0.7], ['l1', 1.2, 0.7], ['g1', 1.2], ['h1', 1.2, 0.7], ['tick', 1.1, 0.7]],
  at: (k) => (k === 'cut' || k[0] === 'l' ? st(-0.44, BX.stand) : k[0] === 'h' ? st(0.46, BX.stand) : st(-0.1, BX.stand)),
  key(k, u, c): Key {
    const lid = BX.open[1] + 0.3;
    const n = { flaps: c.p('cut', 0.6, 0.95), slip: c.p('slip', 0, 0.2), shot: 0, h0: c.p('h0', 0.6, 0.7), h1: c.p('h1', 0.6, 0.7), tagged: 0, ticked: c.p('tick', 0.2, 0.8) };
    const hookAt = (i: number): V => [BX.railX + 0.16 + i * 0.24, BX.railY, 0.02];
    const inHand = (c2: Ctx): V => c2.bd(-0.14, 0.82 * c2.H, 0.28);
    const lift = (): Key => {
      const gar = lerpV(add(BX.open, 0, 0.3, 0), inHand(c), sm(u, 0.15, 0.9));
      return { r: add(gar, 0, 0, 0.03), gr: 0.85, l: add(BX.open, -0.14, 0.3, 0.05), gl: 0.5, nod: 0.38 - 0.25 * u, crouch: 0.2 * (1 - sm(u, 0.1, 0.6)), lean: 0.1, props: { gar }, n };
    };
    const gun = (): Key => {
      const gar = inHand(c);
      const tag = add(gar, 0.02, -0.14, 0.04);
      const g = lerpV(BX.gun, add(tag, -0.1, 0.02, 0.05), sm(u, 0.1, 0.5));
      return { r: add(gar, 0, 0, 0.03), gr: 0.85, l: g, gl: 0.9, nod: 0.22, props: { gar, gun: g }, n: { ...n, shot: beepAt(u, 0.6), tagged: sm(u, 0.6, 0.65) } };
    };
    const hang = (i: number): Key => {
      const a = hookAt(i);
      const gar = lerpV(add(a, 0.02, 0.1, 0.24), a, sm(u, 0.1, 0.7));
      return { r: add(gar, 0, 0, 0.03), gr: 0.85, nod: -0.05, props: { gar: u < 0.72 ? gar : null }, n: { ...n, tagged: 1 } };
    };
    switch (k) {
      case 'cut': {
        // The cutter drawn along the tape.
        const x = BX.open[0] - 0.2 + 0.4 * sm(u, 0.1, 0.65);
        return { r: [x, lid + 0.02, 0.02], gr: 0.9, l: [BX.open[0] - 0.22, lid, 0.06], palms: 0.8, nod: 0.46, lean: 0.14, props: { cutter: u < 0.65 ? [x, lid + 0.03, 0.02] : null }, n };
      }
      case 'slip':
        return { r: add(BX.slip, 0.06, 0.03, 0.08), gr: 0.75, l: add(BX.slip, -0.08, 0.03, 0.08), gl: 0.75, nod: 0.3, props: { slip: add(BX.slip, 0, 0.05, 0.05) }, n };
      case 'l0':
      case 'l1':
        return lift();
      case 'g0':
      case 'g1':
        return gun();
      case 'h0':
        return hang(0);
      case 'h1':
        return hang(1);
      default:
        return { r: add(BX.slip, 0.06 + 0.04 * Math.sin(u * PI * 3), 0.03, 0.08), gr: 0.85, l: add(BX.slip, -0.08, 0.03, 0.08), gl: 0.75, nod: 0.3, props: { slip: add(BX.slip, 0, 0.05, 0.05) }, n };
    }
  },
};

// =============================================================================================
// 액세서리 스탠드 (rtAccessoryStand, 1 × 1): a turning tower of pegs, hats on top, scarves round the middle.

export const AC = {
  stand: 0.6,
  r: 0.27,
  peg: [0.0, 1.18, 0.3] as V,
  hat: [0, 1.74, 0] as V,
  scarf: [0.0, 0.86, 0.3] as V,
};
const ACC: Script = {
  seq: [['turn', 1.4], ['card', 1.8], ['turn2', 1.3], ['hat', 1.7], ['turn3', 1.3], ['scarf', 1.8], ['look', 1.1]],
  at: (k) => (k === 'look' ? st(0.08, AC.stand + 0.25) : k === 'hat' ? st(0.02, AC.stand - 0.14) : st(0.02, AC.stand)),
  key(k, u, c): Key {
    const spin = c.p('turn', 0.05, 0.95) + c.p('turn2', 0.05, 0.95) + c.p('turn3', 0.05, 0.95);
    const n = { spin, cardOn: c.p('card', 0.55, 0.65), hatFix: c.p('hat', 0.2, 0.8), scarfFix: c.p('scarf', 0.2, 0.8) };
    const tray: V = c.bd(0.2, 0.6 * c.H, 0.24);
    const push = (): Key => ({ r: [0.24 - 0.22 * sm(u, 0.05, 0.95), 1.05, 0.28 + 0.04 * Math.sin(u * PI)], gr: 0.6, palms: 0.7, nod: 0.14, props: {}, n });
    switch (k) {
      case 'turn':
      case 'turn2':
      case 'turn3':
        return push();
      case 'card': {
        const a = add(tray, 0, 0.04, 0);
        const card = lerpV(a, AC.peg, sm(u, 0.1, 0.6));
        return { l: add(tray, 0, -0.02, 0), gl: 0.8, r: add(card, 0.01, 0, 0.04), gr: 0.85, nod: 0.14, props: { tray, card: u < 0.62 ? card : null }, n };
      }
      case 'hat': {
        const w = 0.015 * Math.sin(u * PI * 4);
        return { ...both(add(AC.hat, 0, 0.04, 0.05 + w), 0.13, 0, 0, 0.75), nod: -0.16, props: {}, n };
      }
      case 'scarf': {
        const dx = 0.04 * Math.sin(u * PI * 4);
        return { r: add(AC.scarf, 0.08 + dx, 0.04, 0.03), l: add(AC.scarf, -0.08 - dx, 0.04, 0.03), gr: 0.8, gl: 0.8, nod: 0.3, lean: 0.1, props: {}, n };
      }
      default:
        return { l: c.bd(0.05, 0.86 * c.H, 0.12), r: c.bd(-0.12, 0.58 * c.H, 0.12), nod: 0.06, props: {}, n };
    }
  },
};

const SCRIPTS: Record<RtMotion, Script> = {
  rtFold: FOLD,
  rtRestock: RESTOCK,
  rtLearn: LEARN,
  rtTill: tillScript(false),
  rtRush: tillScript(true),
  rtClose: CLOSE,
  rtTidyFit: TIDY,
  rtPass: PASS,
  rtWindow: WINDOW,
  rtVmd: VMD,
  rtRail: RAIL,
  rtTable: TABLE,
  rtSteam: STEAM,
  rtStock: STOCK,
  rtAcc: ACC,
};
