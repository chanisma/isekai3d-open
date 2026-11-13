import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';

/*
 * A day at the 어항 (2026-11-01, the workplace pipeline, at the user's request), at the made-up 은빛항. Each motion
 * is a round of beats: where the dweller is, where the hands go, what moves. The piece reads the same script by the
 * same clock (fisher.ts), so the patch grows under the needle and the crate fills under the chute.
 *
 * - fhReady (어선): the fuel can carried up the gangway and poured, the net drum turned over, the engine started at
 *   the helm and the screens lit, back ashore and a line checked on its bollard.
 * - fhReadSea (어선): at the helm, the tide table, the fish finder, the chart with its dividers, the radio.
 * - fhBrief (어선): on the quay in front of two of the crew: the chart held up, the boat pointed at, each given
 *   their job, and a fist up all round.
 * - fhMend (그물 손질대): sat on a crate at the tear, its edges trimmed, the needle loaded and the knots made one by
 *   one, the new mesh growing over the hole; up, and the net tugged.
 * - fhKnots (그물 손질대): the bosun ties each knot on the board, the dweller copies it on a cord, and he nods.
 * - fhSort (어상자): a fish at a time off the heap, a look, into its own crate; a rinse from the hose.
 * - fhSell / fhPrice (위판대): the bell, along the crates with hand signs while the buyers answer, the price on the
 *   slate, a tag on the crate; or the market sheet read, a crate weighed, a price tag written.
 * - fhPots (통발 더미): a pot on the crate, its door open, the old bait out, the new bag in, tied, back on the stack.
 * - fhIce (제빙기): a crate under the chute, the lever, flake ice pouring, levelled with the shovel, the lid on.
 * - fhSquid (오징어 건조대): out of the basket and pegged up one by one, the dweller reaching along the line, one felt
 *   for dryness.
 * - fhTide (물때 게시판): the wind and pressure read, the day's tide written up, the warning flag run up its pole.
 * - fhBid (낙찰 칠판): the old rows wiped, each lot chalked up, checked against the sheet.
 * - fhLog (어항 사무실 책상): sat at the desk: the radio, the boats on the screen, the log written, a stamp.
 * - fhTank (활어 수조): the oxygen read, a fish netted out into the bucket, the scoop rinsed.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front). Facing
 * the piece the dweller's right hand is on +x.
 */
export type FhMotion = 'fhReady' | 'fhReadSea' | 'fhBrief' | 'fhMend' | 'fhKnots' | 'fhSort' | 'fhSell' | 'fhPrice' | 'fhPots' | 'fhIce' | 'fhSquid' | 'fhTide' | 'fhBid' | 'fhLog' | 'fhTank';
export const FH_MOTIONS = new Set<string>(['fhReady', 'fhReadSea', 'fhBrief', 'fhMend', 'fhKnots', 'fhSort', 'fhSell', 'fhPrice', 'fhPots', 'fhIce', 'fhSquid', 'fhTide', 'fhBid', 'fhLog', 'fhTank']);

const frac = (x: number) => ((x % 1) + 1) % 1;
export const fhPhase = (p: THREE.Vector3) => frac(p.x * 0.433 + p.z * 0.617);
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
}
const st = (x: number, z: number, yaw = PI, y = 0): St => ({ x, y, z, yaw });
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
export interface FhNow {
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
export function fhNow(m: FhMotion, t: number, ph: number, H = 1.6): FhNow {
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
export function fhPose(m: FhMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = fhNow(m, t, fhPhase(par.getWorldPosition(new THREE.Vector3())), height);
  const W = (v: V) => par.localToWorld(new THREE.Vector3(v[0], v[1], v[2]));
  const s = N.st;
  const k = N.key;
  const at = W([s.x, s.y, s.z]);
  const dir = new THREE.Vector3(Math.sin(s.yaw), 0, Math.cos(s.yaw)).transformDirection(par.matrixWorld);
  const yaw = Math.atan2(dir.x, dir.z);
  let pose: BodyPose;
  if (s.sit) pose = { kind: 'sit', at, yaw, floor: W([s.x, s.floor ?? 0, s.z]).y };
  else if (N.walking) pose = { kind: 'walk', at, yaw };
  else pose = { kind: 'stand', at, yaw, crouch: k.crouch };
  return {
    pose,
    doing: {
      reach: { l: k.l && W(k.l), r: k.r && W(k.r), lean: k.lean ?? 0.05, nod: k.nod ?? 0.1, palms: k.palms ?? 0.4, grip: { l: k.gl ?? 0.3, r: k.gr ?? 0.3 }, tap: k.tap },
      crouch: !s.sit && k.crouch ? k.crouch : undefined,
    },
  };
}
/** A hand writing: small quick strokes across a line. */
const writing = (a: V, t: number, u: number, w = 0.12): V => [a[0] - w / 2 + w * ((u * 3) % 1) + 0.006 * Math.sin(t * 19), a[1] + 0.008 * Math.cos(t * 23), a[2]];
/** A hand on a wheel: round a centre in the x–y plane. */
const round = (o: V, r: number, a: number): V => [o[0] + r * Math.cos(a), o[1] + r * Math.sin(a), o[2]];

// =============================================================================================
// 어선 (fishingBoat, 2 × 1): its footprint is the quay's edge, a gangway and bollards; the boat lies behind that in
// the water, bow to −x, with an open-sided wheelhouse aft of the middle.

const DECK = 0.42;
const onDeck = (x: number, z: number, yaw = PI): St => st(x, z, yaw, DECK);
export const BT = {
  deck: DECK,
  /** The middle of the hull, its half length and half beam. */
  z: -1.45,
  L: 2.0,
  B: 0.72,
  gangX: -0.62,
  can: [0.72, 0, 0.14] as V,
  deckCan: [0.02, DECK, -1.72] as V,
  filler: [0.02, DECK + 0.42, -1.96] as V,
  drum: [-1.3, DECK + 0.42, -1.45] as V,
  bollard: [-1.55, 0.24, -0.16] as V,
  wheel: [0.5, DECK + 1.02, -1.45] as V,
  key: [0.4, DECK + 0.98, -1.2] as V,
  finder: [0.36, DECK + 1.3, -1.75] as V,
  radio: [0.36, DECK + 1.3, -1.2] as V,
  chart: [0.56, DECK + 0.93, -1.84] as V,
  /** The two of the crew at a briefing, where they stand on the quay. */
  crew: [[-0.72, 1.28], [0.72, 1.28]] as Array<[number, number]>,
};
const READY_SEQ: Seq = [['can', 1.6, 0.8], ['gang', 0.1, 1.0], ['aboard', 0.3, 0.8], ['pour', 3.2, 0.8], ['drum', 3.0, 1.0], ['w0', 0.05, 0.9], ['helm', 3.4, 0.9], ['w1', 0.05, 1.0], ['pick', 1.0, 0.9], ['off', 0.1, 1.0], ['put', 1.1, 1.0], ['line', 2.8, 0.8]];
const READY: Script = {
  seq: READY_SEQ,
  at(k) {
    switch (k) {
      case 'can':
      case 'put':
        return st(0.68, 0.66);
      case 'gang':
        return st(BT.gangX, 0.06, PI, 0.1);
      case 'aboard':
        return onDeck(BT.gangX, -1.14);
      case 'pour':
      case 'pick':
        return onDeck(0.02, -1.38);
      case 'drum':
        return onDeck(-0.72, -1.45, -PI / 2);
      case 'w0':
      case 'w1':
        return onDeck(0.78, -1.0, PI);
      case 'helm':
        return onDeck(0.92, -1.45, -PI / 2);
      case 'off':
        return st(BT.gangX, 0.06, 0, 0.1);
      default:
        return st(-1.42, 0.42);
    }
  },
  key(k, u, c): Key {
    const n = { fuel: c.p('pour', 0.1, 0.9), engine: c.p('helm', 0.35, 0.5), drumA: 0, smoke: c.p('helm', 0.35, 0.5), tilt: 0, lit: c.p('helm', 0.5, 0.6) };
    const carried = c.bd(-0.24, 0.1, 0.06);
    const hand = (p: V): V => add(p, 0, 0.3, 0);
    switch (k) {
      case 'can': {
        const p = lerpV(BT.can, carried, sm(u, 0.35, 0.95));
        return { r: hand(p), gr: 0.95, crouch: 0.7 * (1 - sm(u, 0.4, 0.95)), nod: 0.35, props: { can: p }, n };
      }
      case 'gang':
      case 'aboard':
      case 'off':
        return { r: hand(carried), gr: 0.95, l: c.bd(0.22, 0.56 * c.H, 0.08), nod: 0.2, props: { can: carried }, n };
      case 'pour': {
        // Lifted to the filler, tipped, the level rising, set down on the deck.
        const e = sm(u, 0, 0.2) * (1 - sm(u, 0.85, 1));
        const p = lerpV(BT.deckCan, add(BT.filler, 0.08, -0.02, 0.2), e);
        return { r: hand(p), gr: 0.95, l: add(p, -0.06, 0.1, 0.1), gl: 0.8, nod: 0.3, lean: 0.12, props: { can: p }, n: { ...n, tilt: e } };
      }
      case 'drum': {
        // The drum turned over by hand a few times, a look along its grease.
        const a = c.t * 1.6;
        return { r: round(add(BT.drum, 0.22, 0, 0.2), 0.14, a), l: round(add(BT.drum, 0.22, 0, -0.2), 0.14, a + PI), gl: 0.9, gr: 0.9, nod: 0.3, lean: 0.14, props: { can: BT.deckCan }, n: { ...n, drumA: a } };
      }
      case 'w0':
      case 'w1':
        return { nod: 0.1, props: { can: BT.deckCan }, n };
      case 'helm': {
        // The key, a look at the gauges, then both hands on the wheel, gently one way and the other.
        if (u < 0.35) return { r: add(BT.key, 0, 0, 0.02), gr: 0.75, l: round(add(BT.wheel, 0.06, 0, 0), 0.15, PI / 2 + 0.6), gl: 0.8, nod: 0.18, lean: 0.08, props: { can: BT.deckCan }, n };
        const w = 0.25 * Math.sin(c.t * 0.9);
        return { r: round(add(BT.wheel, 0.06, 0, 0), 0.15, -PI / 2 + w), l: round(add(BT.wheel, 0.06, 0, 0), 0.15, PI / 2 + w), gl: 0.9, gr: 0.9, nod: 0.08, props: { can: BT.deckCan }, n: { ...n, wheel: w } };
      }
      case 'pick': {
        const p = lerpV(BT.deckCan, carried, sm(u, 0.25, 0.9));
        return { r: hand(p), gr: 0.95, crouch: 0.7 * (1 - sm(u, 0.3, 0.9)), nod: 0.35, props: { can: p }, n };
      }
      case 'put': {
        const p = lerpV(carried, BT.can, sm(u, 0.1, 0.8));
        return { r: hand(p), gr: u > 0.85 ? 0.3 : 0.95, crouch: 0.7 * sm(u, 0.1, 0.8), nod: 0.35, props: { can: p }, n };
      }
      case 'line': {
        // Crouched at the bollard: the turns taken off and put back on.
        const a = c.t * 3.4;
        return { r: add(BT.bollard, 0.1 * Math.cos(a), 0.02, 0.08 + 0.08 * Math.sin(a)), gr: 0.85, l: add(BT.bollard, 0.24, 0.02, -0.02), gl: 0.85, crouch: 0.85, nod: 0.45, lean: 0.14, n: { ...n, lineA: a } };
      }
      default:
        return { n };
    }
  },
};
const SEA_SEQ: Seq = [['aboard', 0.6, 0.9], ['tide', 3.2, 0.6], ['finder', 3.4, 0.6], ['chart', 4.2, 0.6], ['radio', 3.2, 0.6], ['wheel', 2.2, 0.9]];
const READSEA: Script = {
  seq: SEA_SEQ,
  at(k) {
    if (k === 'aboard') return onDeck(0.78, -1.0, PI);
    if (k === 'chart') return onDeck(0.96, -1.72, -PI / 2);
    return onDeck(0.92, -1.45, -PI / 2);
  },
  key(k, u, c): Key {
    const n = { lit: c.p('tide', 0, 0.2), engine: 0, school: c.p('finder', 0.45, 0.6), dividers: 0, radio: 0 };
    const paper = c.bd(0.12, 0.66 * c.H, 0.26);
    switch (k) {
      case 'tide':
        return { l: add(paper, 0, -0.03, 0.03), gl: 0.8, r: add(paper, -0.02 + 0.06 * Math.sin(u * 7), 0.02, 0), gr: 0.25, tap: true, nod: 0.34, props: { tide: paper }, n };
      case 'finder':
        return { r: add(BT.finder, 0.04, -0.09 + 0.03 * Math.sin(u * 9), 0.02), gr: 0.25, tap: true, l: c.bd(0.2, 0.56 * c.H, 0.12), nod: 0.06, lean: 0.1, n };
      case 'chart': {
        // The dividers walked across the chart, a pencil line, the spot it comes to.
        const dx = 0.14 * Math.sin(u * PI * 2);
        const h = add(BT.chart, dx, 0.03, 0.06 * Math.cos(u * PI * 2));
        return { r: h, gr: 0.8, l: add(BT.chart, -0.04, 0.02, 0.2), gl: 0.5, nod: 0.5, lean: 0.2, props: { dividers: h }, n: { ...n, dividers: 1 } };
      }
      case 'radio': {
        const mouth = c.bd(-0.07, 0.88 * c.H, 0.12);
        const h = lerpV(BT.radio, mouth, sm(u, 0.1, 0.3) * (1 - sm(u, 0.85, 1)));
        return { r: h, gr: 0.9, l: c.bd(0.2, 0.56 * c.H, 0.12), nod: 0.06, props: { mic: h }, n: { ...n, radio: u > 0.25 && u < 0.85 ? 1 : 0 } };
      }
      case 'wheel': {
        const w = 0.2 * Math.sin(c.t * 0.9);
        return { r: round(add(BT.wheel, 0.06, 0, 0), 0.15, -PI / 2 + w), l: round(add(BT.wheel, 0.06, 0, 0), 0.15, PI / 2 + w), gl: 0.9, gr: 0.9, nod: 0.05, n: { ...n, wheel: w } };
      }
      default:
        return { n };
    }
  },
};
const BRIEF_SEQ: Seq = [['greet', 1.8, 0.5], ['chart', 3.4, 0.7], ['boat', 2.4, 0.7], ['one', 2.4, 0.5], ['two', 2.4, 0.5], ['stow', 1.2, 0.5], ['fists', 2.2, 0.5]];
const BRIEF: Script = {
  seq: BRIEF_SEQ,
  // On the quay with their back to the water, the crew in the aisle in front; turned round to point at the boat.
  at: (k) => (k === 'boat' ? st(0.05, 0.32, PI * 0.9) : st(0.05, 0.32, 0)),
  key(k, u, c): Key {
    const chart = c.bd(0, 0.66 * c.H, 0.3);
    const n = { crew: 1, nod0: 0, nod1: 0, fist: 0 };
    switch (k) {
      case 'greet':
        return { nod: 0.3 * Math.sin(u * PI), lean: 0.1 * Math.sin(u * PI), n: { ...n, nod0: Math.sin(u * PI), nod1: Math.sin(u * PI) } };
      case 'chart':
        // The chart held up in both hands and turned out to them, a finger going across it now and then.
        return { l: add(chart, 0.22, 0, 0), r: add(chart, -0.22 + 0.1 * Math.sin(c.t * 1.4), 0.03, 0), gl: 0.8, gr: 0.6, nod: 0.2, props: { chart }, n: { ...n, nod0: Math.abs(Math.sin(c.t * 1.6)) * 0.5, nod1: Math.abs(Math.sin(c.t * 1.2)) * 0.5 } };
      case 'boat':
        return { r: c.bd(-0.24, 0.72 * c.H, 0.5), gr: 0.15, palms: 0.5, nod: -0.04, n };
      case 'one':
        return { l: c.bd(0.3, 0.74 * c.H, 0.42), gl: 0.15, palms: 0.7, nod: 0.05, n: { ...n, nod1: Math.abs(Math.sin(c.t * 2)) } };
      case 'two':
        return { r: c.bd(-0.3, 0.74 * c.H, 0.42), gr: 0.15, palms: 0.7, nod: 0.05, n: { ...n, nod0: Math.abs(Math.sin(c.t * 2)) } };
      case 'stow':
        return { l: c.bd(0.2, 0.56 * c.H, 0.1), r: c.bd(-0.2, 0.56 * c.H, 0.1), nod: 0.1, n };
      case 'fists': {
        const up = sm(u, 0.1, 0.35) * (1 - sm(u, 0.85, 1));
        return { r: lerpV(c.bd(-0.2, 0.56 * c.H, 0.1), c.bd(-0.2, 1.1 * c.H, 0.14), up), gr: 1, nod: -0.05, n: { ...n, fist: up } };
      }
      default:
        return { n };
    }
  },
};

// =============================================================================================
// 그물 손질대 (netRack, 2 × 1): a net hung from a beam with the tear low in it, a crate to sit on.

export const NR = {
  z: -0.12,
  /** Where the tear is. */
  tear: [0.1, 0.84, -0.1] as V,
  seat: [0.08, 0.34, 0.52] as V,
  spool: [0.62, 0.42, 0.4] as V,
  board: [0.72, 1.38, -0.06] as V,
  boardRows: [1.5, 1.32, 1.14] as const,
  boss: [1.22, 0.56] as [number, number],
};
const sitAt = (x: number, y: number, z: number, yaw = PI): St => ({ x, y, z, yaw, sit: true, floor: 0 });
const MEND_SEQ: Seq = [['along', 2.6, 0.8], ['sit', 0.8, 0.5], ['trim', 2.6, 0.3], ['load', 2.4, 0.3], ['knot', 9.0, 0.5], ['bite', 1.0, 0.8], ['tug', 2.4, 0.8]];
const MEND: Script = {
  seq: MEND_SEQ,
  at(k) {
    if (k === 'along') return st(-0.52, 0.54);
    if (k === 'tug') return st(0.1, 0.5);
    return sitAt(NR.seat[0], NR.seat[1], NR.seat[2]);
  },
  key(k, u, c): Key {
    const T = NR.tear;
    const n = { patch: c.p('knot', 0.02, 0.98), trimmed: c.p('trim', 0.1, 0.9), loaded: c.p('load', 0.1, 0.8), sway: 0 };
    const hold = add(T, -0.2, 0.08, 0.03);
    switch (k) {
      case 'along':
        // A hand each along the mesh, feeling for what's gone.
        return { l: [-0.72 + 0.34 * u, 1.3 - 0.36 * u, NR.z + 0.05], r: [-0.28 + 0.34 * u, 1.42 - 0.4 * u, NR.z + 0.05], gl: 0.6, gr: 0.6, nod: 0.05, n: { ...n, sway: 0.5 } };
      case 'sit':
        return { l: c.bd(0.2, 0.72, 0.2), r: c.bd(-0.2, 0.72, 0.2), nod: 0.25, n };
      case 'trim': {
        const h = add(T, 0.14 * Math.cos(u * PI * 3), 0.12 * Math.sin(u * PI * 3), 0.04);
        return { r: h, gr: 0.85, l: hold, gl: 0.8, nod: 0.28, props: { knife: h }, n };
      }
      case 'load': {
        // Twine off the spool on to the needle: round and round in the lap.
        const a = c.t * 8;
        const h: V = c.bd(-0.04, 0.68, 0.3);
        return { l: add(h, 0.05, 0, 0), gl: 0.85, r: add(h, -0.06 + 0.03 * Math.cos(a), 0.03 * Math.sin(a), 0.01), gr: 0.8, nod: 0.45, props: { needle: add(h, 0.03, 0, 0) }, n };
      }
      case 'knot': {
        // Through the mesh, round, and pulled tight: the left hand keeps the last bar, each knot a little along.
        const lane = -0.09 + 0.18 * ((u * 4) % 1);
        const row = 0.09 - 0.18 * (Math.floor(u * 4) / 3);
        const beat = (u * 24) % 1;
        const o = add(T, lane, row, 0.03);
        const r: V = beat < 0.5 ? add(o, 0.04, 0.03 - beat * 0.12, 0.02 + beat * 0.08) : add(o, 0.04 + (beat - 0.5) * 0.3, -0.03 + (beat - 0.5) * 0.14, 0.06);
        return { r, gr: 0.9, l: add(o, -0.08, 0.05, 0), gl: 0.85, nod: 0.26, lean: 0.06, props: { needle: add(r, -0.02, 0.02, -0.01) }, n };
      }
      case 'bite':
        return { r: c.bd(-0.03, 0.86 * c.H * 0.68, 0.1), gr: 0.85, l: add(T, -0.08, 0.1, 0.04), gl: 0.7, nod: 0.06, n };
      case 'tug': {
        // Up, and both hands pulling down on the mended place.
        const d = 0.05 * Math.abs(Math.sin(c.t * 5));
        return { l: add(T, -0.16, 0.14 - d, 0.05), r: add(T, 0.16, 0.14 - d, 0.05), gl: 0.95, gr: 0.95, nod: 0.3, lean: 0.06, n: { ...n, sway: d * 8 } };
      }
      default:
        return { n };
    }
  },
};
const KNOT_SEQ: Seq = [['watch0', 2.2, 0.4], ['tie0', 3.2, 0.5], ['watch1', 2.2, 0.4], ['tie1', 3.2, 0.5], ['watch2', 2.2, 0.4], ['tie2', 3.4, 0.5], ['show', 2.0, 0.5]];
const KNOTS: Script = {
  seq: KNOT_SEQ,
  at: () => st(0.42, 0.62),
  key(k, u, c): Key {
    const cord = c.bd(0, 0.62 * c.H, 0.3);
    const m = /^(watch|tie)(\d)$/.exec(k);
    const n = { boss: 1, lit: 0, point: 0, bNod: 0, knot: 0 };
    if (m && m[1] === 'watch') {
      // Eyes on the board, on the knot he's pointing to; the cord waiting in the hands.
      return { l: add(cord, 0.1, -0.03, -0.03), r: add(cord, -0.1, -0.03, -0.03), gl: 0.8, gr: 0.8, nod: -0.02, props: { cord: add(cord, 0, -0.03, -0.03) }, n: { ...n, lit: +m[2] + 1, point: 1 } };
    }
    if (m) {
      const a = c.t * 5;
      return { l: add(cord, 0.08 * Math.cos(a), 0.05 * Math.sin(a), 0), r: add(cord, -0.08 * Math.cos(a), -0.05 * Math.sin(a), 0), gl: 0.85, gr: 0.85, nod: 0.42, props: { cord }, n: { ...n, lit: +m[2] + 1, knot: sm(u, 0.2, 0.9), bNod: u > 0.75 ? 1 : 0 } };
    }
    const held = add(cord, 0, 0.1, 0);
    return { l: add(held, 0.1, 0, 0), r: add(held, -0.1, 0, 0), gl: 0.9, gr: 0.9, nod: 0.1, props: { cord: held }, n: { ...n, knot: 1, bNod: 1 } };
  },
};

// =============================================================================================
// 어상자 (fishCrates, 1 × 1): a heap of the catch in a big tub at the back, three crates on a low stand in front.

export const FC = {
  heap: [0, 0.82, -0.24] as V,
  crates: [[-0.31, 0.66, 0.2], [0, 0.66, 0.2], [0.31, 0.66, 0.2]] as V[],
  hose: [0.42, 1.12, -0.1] as V,
};
const SORT_SEQ: Seq = [['p0', 1.5, 0.2], ['p1', 1.5, 0.2], ['p2', 1.5, 0.2], ['p3', 1.5, 0.2], ['p4', 1.5, 0.2], ['p5', 1.5, 0.3], ['rinse', 2.8, 0.4], ['tag', 1.8, 0.5]];
/** Which crate each of a round's fish goes into. */
const SORTED = [0, 2, 1, 0, 2, 1];
const SORT: Script = {
  seq: SORT_SEQ,
  at: (k) => (k === 'rinse' ? st(0.14, 0.74) : st(-0.02, 0.74)),
  key(k, u, c): Key {
    const n: Record<string, number> = { c0: 0, c1: 0, c2: 0, heap: 0, water: 0 };
    let done = 0;
    SORTED.forEach((to, i) => {
      const got = c.p(`p${i}`, 0.75, 0.8);
      n[`c${to}`] += got;
      done += got;
    });
    n.heap = done / SORTED.length;
    const m = /^p(\d)$/.exec(k);
    if (m) {
      // Off the heap, held up and looked at, across to its crate.
      const i = +m[1];
      const to = FC.crates[SORTED[i]];
      const held = c.bd(-0.02, 0.68 * c.H, 0.32);
      const f = u < 0.45 ? lerpV(FC.heap, held, sm(u, 0.1, 0.42)) : lerpV(held, add(to, 0, 0.12, 0), sm(u, 0.5, 0.78));
      const other = u > 0.28 && u < 0.55;
      return { r: add(f, 0.08, 0.02, 0.01), gr: 0.85, l: other ? add(f, -0.1, 0, 0.01) : add(FC.heap, -0.2, 0.02, 0.06), gl: other ? 0.8 : 0.35, nod: u > 0.3 && u < 0.5 ? 0.3 : 0.45, lean: 0.1, props: { fish: u < 0.8 ? f : null }, n: { ...n, kind: i % 3 } };
    }
    if (k === 'rinse') {
      // The hose over the crates, left to right and back.
      const x = 0.3 * Math.sin(c.t * 1.8);
      const h: V = [x, 1.08, 0.32];
      return { r: h, gr: 0.9, l: c.bd(0.2, 0.56 * c.H, 0.1), nod: 0.44, props: { hose: h }, n: { ...n, water: 1, waterX: x } };
    }
    // A tag on the last crate, a tally on it.
    const tag = add(FC.crates[2], 0, 0.04, 0.17);
    return { r: add(tag, 0.02 * Math.sin(c.t * 11), 0.02, 0.03), gr: 0.75, l: add(FC.crates[2], -0.16, 0.08, 0.14), gl: 0.5, crouch: 0.15, nod: 0.45, lean: 0.12, n };
  },
};

// =============================================================================================
// 위판대 (fishAuction, 2 × 1): a row of crates on a low skid, a bell on its post, a slate, the buyers behind.

export const AU = {
  stand: 0.72,
  bell: [-1.02, 1.3, 0.3] as V,
  rope: [-0.98, 1.08, 0.42] as V,
  crates: [-0.6, 0, 0.6] as const,
  crateY: 0.36,
  slate: [1.02, 1.1, 0.3] as V,
  scale: [0.78, 0.86, 0.38] as V,
  buyers: [[-0.72, -0.94], [0, -0.98], [0.72, -0.94]] as Array<[number, number]>,
};
const SELL_SEQ: Seq = [['bell', 2.0, 0.8], ['c0', 3.6, 0.3], ['tag0', 1.2, 0.8], ['c1', 3.6, 0.3], ['tag1', 1.2, 0.8], ['c2', 3.6, 0.3], ['tag2', 1.2, 0.8], ['slate', 2.4, 1.0]];
const SELL: Script = {
  seq: SELL_SEQ,
  at(k) {
    if (k === 'bell') return st(-0.86, AU.stand);
    if (k === 'slate') return st(0.7, AU.stand);
    return st(AU.crates[+k[k.length - 1]], AU.stand);
  },
  key(k, u, c): Key {
    const n: Record<string, number> = { buyers: 1, bell: 0, b0: 0, b1: 0, b2: 0, s0: c.p('tag0', 0.4, 0.6), s1: c.p('tag1', 0.4, 0.6), s2: c.p('tag2', 0.4, 0.6), lot: 0, price: 0 };
    if (k === 'bell') {
      const a = Math.sin(c.t * 14);
      return { r: add(AU.rope, 0.04 * a, 0, 0.02), gr: 0.9, l: c.bd(0.2, 0.56 * c.H, 0.1), nod: -0.05, n: { ...n, bell: a } };
    }
    const m = /^c(\d)$/.exec(k);
    if (m) {
      // Fast calls with the right hand's signs up where the buyers can see; they answer one after another.
      const i = +m[1];
      const beat = Math.floor(u * 6);
      const sign = c.bd(-0.2 + 0.07 * Math.sin(c.t * 9), 0.86 * c.H + 0.05 * Math.sin(c.t * 13), 0.3);
      return { r: sign, gr: 0.45 + 0.4 * Math.abs(Math.sin(c.t * 9)), l: c.bd(0.22, 0.62 * c.H, 0.2), gl: 0.5, palms: 0.5, nod: -0.02 + 0.08 * Math.sin(c.t * 7), lean: 0.03, n: { ...n, lot: i + 1, price: u, [`b${beat % 3}`]: 1 } };
    }
    const t = /^tag(\d)$/.exec(k);
    if (t) {
      const x = AU.crates[+t[1]];
      return { r: [x + 0.02 * Math.sin(c.t * 10), AU.crateY + 0.12, 0.28], gr: 0.75, l: [x - 0.18, AU.crateY + 0.1, 0.26], gl: 0.5, crouch: 0.72, nod: 0.5, lean: 0.2, n: { ...n, lot: +t[1] + 1, price: 1 } };
    }
    return { r: writing(add(AU.slate, 0, -0.06, 0.05), c.t, u, 0.14), gr: 0.75, l: c.bd(0.2, 0.56 * c.H, 0.1), nod: 0.1, n: { ...n, lot: 3, price: 1, chalk: 1 } };
  },
};
const PRICE_SEQ: Seq = [['sheet', 3.0, 0.8], ['lift', 1.6, 0.3], ['weigh', 2.8, 0.4], ['back', 1.4, 0.8], ['think', 2.2, 0.5], ['write', 3.0, 0.8], ['stick', 1.6, 0.8]];
const PRICE: Script = {
  seq: PRICE_SEQ,
  at(k) {
    if (k === 'lift' || k === 'weigh' || k === 'back') return st(0.66, AU.stand);
    if (k === 'stick') return st(AU.crates[1], AU.stand);
    return st(0.1, AU.stand);
  },
  key(k, u, c): Key {
    const clip = c.bd(0.1, 0.66 * c.H, 0.28);
    const low: V = [AU.crates[2], 0.24, 0];
    const onScale = add(AU.scale, 0, 0.03, 0);
    const n = { buyers: 0, merchant: 1, kilos: 0, mNod: 0, tag: c.p('write', 0.3, 0.9) };
    const paper: Partial<Key> = { l: add(clip, -0.02, -0.04, 0.02), gl: 0.8, props: { clip } };
    switch (k) {
      case 'sheet':
        return { ...paper, r: add(clip, 0.06 * Math.sin(u * 8), 0.02, 0.02), gr: 0.25, tap: true, nod: 0.34, n };
      case 'lift': {
        const p = lerpV(low, onScale, sm(u, 0.15, 0.9));
        return { l: add(p, -0.2, 0.08, 0.02), r: add(p, 0.2, 0.08, 0.02), gl: 0.9, gr: 0.9, crouch: 0.75 * (1 - sm(u, 0.2, 0.9)), nod: 0.4, props: { crate: p }, n };
      }
      case 'weigh':
        return { r: add(AU.scale, 0.02, 0.34, 0.1), gr: 0.25, tap: true, nod: 0.36, props: { crate: onScale }, n: { ...n, kilos: sm(u, 0, 0.3) } };
      case 'back': {
        const p = lerpV(onScale, low, sm(u, 0.1, 0.85));
        return { l: add(p, -0.2, 0.08, 0.02), r: add(p, 0.2, 0.08, 0.02), gl: 0.9, gr: 0.9, crouch: 0.75 * sm(u, 0.15, 0.85), nod: 0.4, props: { crate: p }, n: { ...n, kilos: 1 - sm(u, 0.05, 0.3) } };
      }
      case 'think':
        return { ...paper, r: c.bd(-0.06, 0.82 * c.H, 0.16), gr: 0.4, nod: 0.12, n: { ...n, mNod: Math.abs(Math.sin(c.t * 1.4)) } };
      case 'write':
        return { ...paper, r: writing(add(clip, 0.02, 0.02, 0.02), c.t, u, 0.1), gr: 0.75, nod: 0.36, props: { clip, pen: writing(add(clip, 0.02, 0.05, 0.03), c.t, u, 0.1) }, n };
      case 'stick': {
        const x = AU.crates[1];
        return { r: [x + 0.02 * Math.sin(c.t * 10), AU.crateY + 0.12, 0.28], gr: 0.75, l: [x - 0.18, AU.crateY + 0.1, 0.26], gl: 0.5, crouch: 0.72, nod: 0.5, lean: 0.2, n: { ...n, tag: 1, mNod: 1 } };
      }
      default:
        return { n };
    }
  },
};

// =============================================================================================
// 통발 더미 (fhPots, 2 × 1): pots stacked at the back, one on an upturned crate, the bait bucket.

export const PT = {
  stand: 0.68,
  stack: [-0.52, 0.76, -0.1] as V,
  bench: [0.28, 0.62, 0.08] as V,
  bucket: [0.84, 0.38, 0.28] as V,
  bin: [-0.1, 0.32, 0.36] as V,
};
const POT_SEQ: Seq = [['fetch', 1.8, 0.8], ['door', 1.5, 0.3], ['old', 1.8, 0.3], ['bag', 2.4, 0.3], ['clip', 2.2, 0.3], ['shut', 1.2, 0.8], ['stack', 1.8, 0.8]];
const POT: Script = {
  seq: POT_SEQ,
  at: (k) => (k === 'fetch' || k === 'stack' ? st(-0.26, PT.stand) : st(0.36, PT.stand)),
  key(k, u, c): Key {
    const n = { door: c.p('door', 0.2, 0.9) - c.p('shut', 0.1, 0.9), oldIn: 1 - c.p('old', 0.2, 0.5), newIn: c.p('clip', 0.15, 0.4) };
    const both = (p: V): Partial<Key> => ({ l: add(p, -0.24, 0.02, 0.1), r: add(p, 0.24, 0.02, 0.1), gl: 0.9, gr: 0.9 });
    const home: V = PT.bench;
    switch (k) {
      case 'fetch': {
        const p = lerpV(PT.stack, home, sm(u, 0.12, 0.95));
        return { ...both(p), nod: 0.26, props: { pot: p }, n };
      }
      case 'door':
        return { r: add(home, 0.2, 0.02, 0.2), gr: 0.85, l: add(home, -0.2, 0.05, 0.12), gl: 0.75, nod: 0.42, lean: 0.1, props: { pot: home }, n };
      case 'old': {
        // The spent bag drawn out and dropped in the bin.
        const h = lerpV(add(home, 0, 0.0, 0.05), PT.bin, sm(u, 0.25, 0.95));
        return { r: add(h, 0.02, 0.05, 0.02), gr: 0.85, l: add(home, -0.2, 0.05, 0.12), gl: 0.75, nod: 0.44, lean: 0.12, props: { pot: home, oldBag: u < 0.95 ? h : null }, n };
      }
      case 'bag': {
        // Bait out of the bucket and into a fresh net bag, a scoop at a time.
        const dip = Math.abs(Math.sin(u * PI * 2));
        const h = lerpV(add(PT.bucket, 0, 0.08, 0), add(PT.bucket, -0.22, 0.34, 0.02), dip);
        return { r: h, gr: 0.85, l: add(PT.bucket, -0.24, 0.3, 0.02), gl: 0.8, crouch: 0.28, nod: 0.46, lean: 0.14, props: { pot: home, newBag: add(PT.bucket, -0.24, 0.24, 0.02) }, n: { ...n, bait: u } };
      }
      case 'clip': {
        const h = lerpV(add(PT.bucket, -0.24, 0.26, 0.02), add(home, 0, 0, 0.04), sm(u, 0.05, 0.4));
        return { r: add(h, 0.02 + (u > 0.4 ? 0.02 * Math.sin(c.t * 14) : 0), 0.04, 0.03), gr: 0.85, l: add(home, -0.12, 0.05, 0.14), gl: 0.75, nod: 0.44, lean: 0.12, props: { pot: home, newBag: u < 0.4 ? h : null }, n };
      }
      case 'shut':
        return { r: add(home, 0.2 * (1 - u) + 0.05, 0.02, 0.2), gr: 0.85, l: add(home, -0.2, 0.05, 0.12), gl: 0.75, nod: 0.42, lean: 0.1, props: { pot: home }, n };
      case 'stack': {
        const p = lerpV(home, PT.stack, sm(u, 0.1, 0.88));
        return { ...both(p), nod: 0.2, props: { pot: u < 0.9 ? p : null }, n };
      }
      default:
        return { n };
    }
  },
};

// =============================================================================================
// 제빙기 (fhIce, 2 × 1): a tall steel plant with its chute on the right, a crate on a roller stand under it.

export const IC = {
  stand: 0.68,
  lever: [-0.12, 1.14, 0.36] as V,
  chute: [0.54, 1.02, 0.14] as V,
  crate: [0.54, 0.46, 0.2] as V,
  empties: [-0.72, 0.46, 0.34] as V,
  shovel: [0.92, 0.72, 0.28] as V,
  dolly: [-0.05, 0.2, 0.46] as V,
};
const ICE_SEQ: Seq = [['fetch', 1.6, 0.7], ['slide', 1.4, 0.8], ['lever', 1.2, 0.8], ['pour', 4.2, 0.8], ['off', 1.0, 0.8], ['shovel', 3.0, 0.3], ['lid', 1.6, 0.4], ['lift', 1.8, 0.8]];
const ICE: Script = {
  seq: ICE_SEQ,
  at(k) {
    if (k === 'fetch') return st(-0.4, IC.stand);
    if (k === 'lever' || k === 'off' || k === 'pour') return st(0.12, IC.stand);
    if (k === 'lift') return st(-0.18, IC.stand);
    return st(0.48, IC.stand + 0.02);
  },
  key(k, u, c): Key {
    const n = { fill: c.p('pour', 0.05, 0.95), flow: 0, run: c.p('lever', 0.5, 0.8) - c.p('off', 0.2, 0.7), lid: c.p('lid', 0.3, 0.8), lev: c.p('shovel', 0.05, 0.9), lever: c.p('lever', 0.3, 0.8) - c.p('off', 0.2, 0.7) };
    const both = (p: V): Partial<Key> => ({ l: add(p, -0.2, 0.09, 0.14), r: add(p, 0.2, 0.09, 0.14), gl: 0.9, gr: 0.9 });
    switch (k) {
      case 'fetch': {
        const p = lerpV(IC.empties, add(IC.empties, 0.5, 0.18, -0.02), sm(u, 0.15, 0.9));
        return { ...both(p), crouch: 0.35 * (1 - sm(u, 0.2, 0.9)), nod: 0.35, props: { crate: p }, n };
      }
      case 'slide': {
        const p = lerpV(add(IC.empties, 0.5, 0.18, -0.02), IC.crate, sm(u, 0.05, 0.9));
        return { ...both(p), nod: 0.36, lean: 0.08, props: { crate: p }, n };
      }
      case 'lever':
      case 'off': {
        const on = k === 'lever' ? u : 1 - u;
        return { r: add(IC.lever, 0, 0.05 - 0.12 * sm(on, 0.2, 0.8), 0.03), gr: 0.9, nod: 0.12, props: { crate: IC.crate }, n };
      }
      case 'pour':
        // A hand on the lever, watching the crate come up.
        return { r: add(IC.lever, 0, -0.07, 0.03), gr: 0.9, l: add(IC.crate, -0.26, 0.2, 0.18), gl: 0.5, nod: 0.3, props: { crate: IC.crate }, n: { ...n, flow: 1 } };
      case 'shovel': {
        const s = 0.14 * Math.sin(c.t * 5);
        const blade = add(IC.crate, s, 0.22, 0.02);
        return { r: add(blade, 0.1, 0.24, 0.16), gr: 0.9, l: add(blade, 0.03, 0.12, 0.1), gl: 0.85, nod: 0.4, lean: 0.14, props: { crate: IC.crate, shovel: blade }, n };
      }
      case 'lid': {
        const lid = lerpV(add(IC.crate, 0.3, 0.2, 0.2), add(IC.crate, 0, 0.27, 0), sm(u, 0.1, 0.8));
        return { l: add(lid, -0.16, 0.02, 0.06), r: add(lid, 0.16, 0.02, 0.06), gl: 0.8, gr: 0.8, nod: 0.38, props: { crate: IC.crate, lid }, n };
      }
      case 'lift': {
        // Across on to the dolly.
        const to = add(IC.dolly, 0, 0.04, 0);
        const p = lerpV(IC.crate, to, sm(u, 0.1, 0.9));
        return { ...both(p), crouch: 0.5 * sm(u, 0.3, 0.9), nod: 0.35, props: { crate: p, lid: add(p, 0, 0.27, 0) }, n: { ...n, lid: 1 } };
      }
      default:
        return { n };
    }
  },
};

// =============================================================================================
// 오징어 건조대 (fhSquid, 3 × 1): a wooden frame with lines at two heights, most of them hung already.

export const SQ = {
  stand: 0.62,
  /** The line being filled, its ends and how many pegs. */
  lineY: 1.56,
  lineZ: 0.12,
  x0: -1.2,
  x1: 1.2,
  count: 8,
  basket: [-1.05, 0.34, 0.5] as V,
};
export const sqPeg = (i: number) => SQ.x0 + ((SQ.x1 - SQ.x0) * (i + 0.5)) / SQ.count;
const SQUID_SEQ: Seq = [['p0', 1.5, 0.5], ['p1', 1.5, 0.5], ['p2', 1.5, 0.6], ['p3', 1.5, 0.6], ['p4', 1.5, 0.6], ['p5', 1.5, 0.6], ['feel', 2.6, 1.2], ['tidy', 1.6, 1.4]];
const SQUID: Script = {
  seq: SQUID_SEQ,
  at(k) {
    const m = /^p(\d)$/.exec(k);
    if (m) return st(sqPeg(+m[1]) - 0.1, SQ.stand);
    if (k === 'feel') return st(0.84, SQ.stand);
    return st(-0.72, SQ.stand);
  },
  key(k, u, c): Key {
    const n = { hung: SQUID_SEQ.slice(0, 6).reduce((s, [q]) => s + c.p(q, 0.72, 0.76), 0), swing: 0, feel: 0 };
    const m = /^p(\d)$/.exec(k);
    if (m) {
      // Down to the basket on the arm, one taken up, its peg on the line.
      const peg = sqPeg(+m[1]);
      const low = c.bd(0.22, 0.42 * c.H, 0.14);
      const up: V = [peg, SQ.lineY - 0.02, SQ.lineZ + 0.04];
      const h = u < 0.3 ? lerpV(low, low, 0) : lerpV(low, up, sm(u, 0.3, 0.7));
      return { r: h, gr: 0.85, l: u > 0.5 ? add(up, -0.1, 0.0, 0) : c.bd(0.2, 0.5 * c.H, 0.12), gl: 0.7, nod: u > 0.45 ? -0.12 : 0.34, props: { squid: u < 0.74 ? add(h, 0, -0.14, 0) : null, basket: c.bd(0.2, 0.34 * c.H, 0.1) }, n: { ...n, swing: 0.2 } };
    }
    if (k === 'feel') {
      const x = 0.86;
      return { r: [x + 0.04 * Math.sin(c.t * 3), 1.32, SQ.lineZ + 0.08], gr: 0.5, l: [x - 0.14, 1.26, SQ.lineZ + 0.08], gl: 0.4, nod: 0.02, lean: 0.06, n: { ...n, feel: 1 } };
    }
    // The basket back on its stool, the frame given a shake.
    return { r: add(SQ.basket, 0.14, 0.14, 0), gr: 0.8, l: add(SQ.basket, -0.14, 0.14, 0), gl: 0.8, crouch: 0.5 * Math.sin(u * PI), nod: 0.36, props: { basket: add(SQ.basket, 0, 0, 0) }, n };
  },
};

// =============================================================================================
// 물때 게시판 (fhTideBoard, 2 × 1): a tall board with the month's tides, a barometer, wind cups and a flag pole.

export const TB = {
  stand: 0.62,
  tideRow: [-0.3, 1.34, 0.1] as V,
  baro: [0.48, 1.56, 0.1] as V,
  halyard: [0.86, 1.1, 0.14] as V,
  marker: [-0.72, 0.9, 0.14] as V,
};
const TIDE_SEQ: Seq = [['baro', 2.8, 0.7], ['cups', 2.0, 0.8], ['take', 0.8, 0.5], ['write', 3.4, 0.5], ['back', 0.8, 0.9], ['flag', 3.0, 0.9], ['look', 2.0, 0.8]];
const TIDE: Script = {
  seq: TIDE_SEQ,
  at(k) {
    if (k === 'baro') return st(0.42, TB.stand);
    if (k === 'cups') return st(0.32, TB.stand + 0.12);
    if (k === 'flag') return st(0.7, TB.stand);
    if (k === 'look') return st(0.02, TB.stand + 0.22);
    return st(-0.36, TB.stand);
  },
  key(k, u, c): Key {
    const n = { written: c.p('write', 0.1, 0.9), flag: c.p('flag', 0.1, 0.9), tap: 0 };
    switch (k) {
      case 'baro':
        return { r: add(TB.baro, 0.015 * Math.sin(c.t * 9), -0.02, 0.03), gr: 0.3, tap: true, l: c.bd(0.2, 0.56 * c.H, 0.1), nod: -0.06, n: { ...n, tap: 1 } };
      case 'cups':
        // Head back: the cups going round up there.
        return { l: c.bd(0.2, 0.56 * c.H, 0.1), r: c.bd(-0.2, 0.56 * c.H, 0.1), nod: -0.3, n };
      case 'take':
        return { r: add(TB.marker, 0, 0.02, 0), gr: 0.75, nod: 0.3, n };
      case 'write': {
        const h = writing(TB.tideRow, c.t, u, 0.3);
        return { r: h, gr: 0.8, l: add(TB.tideRow, -0.3, -0.16, 0), gl: 0.3, nod: 0.03, props: { marker: h }, n };
      }
      case 'back':
        return { r: add(TB.marker, 0, 0.02, 0), gr: 0.75, nod: 0.3, n };
      case 'flag': {
        // Hand over hand down the halyard, the flag climbing.
        const f = (u * 4) % 1;
        return { r: add(TB.halyard, 0.01, 0.34 - 0.4 * f, 0), l: add(TB.halyard, 0.01, -0.06 + 0.4 * f, 0), gl: 0.9, gr: 0.9, nod: -0.14, n };
      }
      default:
        return { l: c.bd(0.2, 0.56 * c.H, 0.1), r: c.bd(-0.2, 0.56 * c.H, 0.1), nod: 0.02, n };
    }
  },
};

// =============================================================================================
// 낙찰 칠판 (fhBidBoard, 2 × 1): a chalkboard of the morning's lots, a shelf with the eraser and the tally sheet.

export const BB = {
  stand: 0.6,
  /** Rows on the board: heights, and the x the writing runs from. */
  rows: [1.56, 1.38, 1.2, 1.02] as const,
  x: -0.66,
  z: -0.28,
  sheet: [0.74, 0.86, -0.1] as V,
};
const BID_SEQ: Seq = [['wipe', 2.8, 0.6], ['r0', 2.4, 0.3], ['r1', 2.4, 0.3], ['r2', 2.4, 0.3], ['r3', 2.4, 0.6], ['check', 2.8, 0.8]];
const BID: Script = {
  seq: BID_SEQ,
  at: (k) => (k === 'check' ? st(0.56, BB.stand) : st(-0.08, BB.stand)),
  key(k, u, c): Key {
    const n: Record<string, number> = { wiped: c.p('wipe', 0.1, 0.9), r0: c.p('r0', 0.05, 0.95), r1: c.p('r1', 0.05, 0.95), r2: c.p('r2', 0.05, 0.95), r3: c.p('r3', 0.05, 0.95) };
    const m = /^r(\d)$/.exec(k);
    if (m) {
      const y = BB.rows[+m[1]];
      const h: V = [BB.x + 1.3 * u + 0.008 * Math.sin(c.t * 22), y + 0.01 * Math.sin(c.t * 31), BB.z + 0.05];
      return { r: h, gr: 0.8, l: c.bd(0.16, 0.6 * c.H, 0.22), gl: 0.8, nod: y > 1.4 ? -0.08 : 0.08, props: { chalk: h, sheet: c.bd(0.16, 0.62 * c.H, 0.26) }, n };
    }
    if (k === 'wipe') {
      const h: V = [-0.08 + 0.55 * Math.sin(c.t * 2.4), 1.3 + 0.22 * Math.sin(c.t * 4.8), BB.z + 0.06];
      return { r: h, gr: 0.75, l: c.bd(0.2, 0.56 * c.H, 0.1), nod: 0.02, props: { eraser: h }, n };
    }
    // Finger down the rows against the sheet.
    const sheet = BB.sheet;
    return { l: add(sheet, -0.02, 0.04, 0.03), gl: 0.4, r: [0.2, 1.56 - 0.6 * u, BB.z + 0.06], gr: 0.2, tap: true, nod: 0.12, n };
  },
};

// =============================================================================================
// 어항 사무실 책상 (fhOfficeDesk, 2 × 1): a desk against the wall with the radio, the screen and the log; a chair.

export const OD = {
  seat: [0.02, 0.46, 0.52] as V,
  mic: [-0.62, 0.86, -0.1] as V,
  screen: [0.34, 1.08, -0.18] as V,
  keys: [0.34, 0.79, 0.04] as V,
  log: [-0.16, 0.79, 0.1] as V,
  stamp: [0.72, 0.84, 0.12] as V,
};
const LOG_SEQ: Seq = [['radio', 3.8, 0.5], ['screen', 3.6, 0.5], ['write', 4.6, 0.4], ['stamp', 2.0, 0.5], ['sip', 1.8, 0.5]];
const LOG: Script = {
  seq: LOG_SEQ,
  at: () => sitAt(OD.seat[0], OD.seat[1], OD.seat[2]),
  key(k, u, c): Key {
    const n = { radio: 0, written: c.p('write', 0.05, 0.95), stamped: c.p('stamp', 0.5, 0.55), keys: 0, stampY: 0 };
    const pen = writing(add(OD.log, 0.02, 0.02, 0), c.t, u, 0.14);
    switch (k) {
      case 'radio': {
        const mouth = c.bd(0.07, 0.84 * c.H * 0.86, 0.14);
        const h = lerpV(OD.mic, mouth, sm(u, 0.05, 0.22) * (1 - sm(u, 0.88, 1)));
        return { l: h, gl: 0.9, r: add(OD.log, 0.1, 0.03, 0.02), gr: 0.3, nod: 0.05, props: { mic: h }, n: { ...n, radio: u > 0.2 && u < 0.88 ? 1 : 0 } };
      }
      case 'screen':
        return { l: add(OD.keys, -0.1, 0.02, 0), r: add(OD.keys, 0.1 + 0.02 * Math.sin(c.t * 7), 0.02, 0), tap: true, gl: 0.3, gr: 0.3, nod: 0.05, n: { ...n, keys: 1 } };
      case 'write':
        return { r: pen, gr: 0.8, l: add(OD.log, -0.18, 0.02, 0.02), gl: 0.3, nod: 0.38, lean: 0.08, props: { pen: add(pen, 0, 0.04, 0.01) }, n };
      case 'stamp': {
        const hit = Math.abs(Math.sin(u * PI * 2));
        const h = lerpV(OD.stamp, add(OD.log, 0.1, 0.1 - 0.08 * (u > 0.5 ? 1 - hit : 0), 0.04), sm(u, 0.05, 0.35));
        return { r: add(h, 0, 0.05, 0.01), gr: 0.9, l: add(OD.log, -0.18, 0.02, 0.02), gl: 0.3, nod: 0.36, props: { stamp: h }, n };
      }
      default: {
        // A mouthful of coffee from the mug.
        const mug: V = [-0.54, 0.84, 0.16];
        const m = c.bd(0.05, 0.86 * c.H * 0.84, 0.12);
        const h = lerpV(mug, m, Math.sin(u * PI));
        return { l: add(h, 0.03, 0, 0.01), gl: 0.9, nod: 0.02 - 0.1 * Math.sin(u * PI), props: { mug: h }, n };
      }
    }
  },
};

// =============================================================================================
// 활어 수조 (fhLiveTank, 2 × 1): a raised glass tank of live fish, the air stone, a meter, a scoop on its hook.

export const LT = {
  stand: 0.66,
  rim: 1.12,
  meter: [-0.74, 1.24, 0.28] as V,
  scoop: [0.9, 1.28, 0.34] as V,
  water: [0.04, 0.96, -0.02] as V,
  bucket: [0.72, 0.26, 0.5] as V,
};
const TANK_SEQ: Seq = [['meter', 2.6, 0.7], ['take', 0.9, 0.7], ['chase', 3.6, 0.3], ['lift', 1.4, 0.7], ['drop', 1.4, 0.7], ['rinse', 1.8, 0.6]];
const TANK: Script = {
  seq: TANK_SEQ,
  at(k) {
    if (k === 'meter') return st(-0.52, LT.stand);
    if (k === 'drop') return st(0.46, LT.stand + 0.08);
    return st(0.3, LT.stand);
  },
  key(k, u, c): Key {
    const n = { bucket: c.p('drop', 0.5, 0.7), caught: c.p('chase', 0.9, 0.95) - c.p('drop', 0.5, 0.6), splash: 0 };
    const handle = (head: V): V => add(head, 0.16, 0.42, 0.34);
    switch (k) {
      case 'meter':
        return { r: add(LT.meter, 0.03, -0.02, 0.03), gr: 0.25, tap: true, l: c.bd(0.2, 0.56 * c.H, 0.1), nod: 0.18, n };
      case 'take': {
        const h = lerpV(LT.scoop, handle(add(LT.water, 0.3, 0.3, 0)), sm(u, 0.05, 0.9));
        return { r: h, gr: 0.9, nod: 0.12, props: { scoop: add(h, -0.16, -0.42, -0.34) }, n };
      }
      case 'chase': {
        // Slowly round after one, the left hand on the rim.
        const a = u * PI * 2.4;
        const head = add(LT.water, 0.28 * Math.cos(a), -0.02 + 0.08 * Math.sin(a * 2), 0.14 * Math.sin(a));
        return { r: handle(head), gr: 0.9, l: [-0.2, LT.rim + 0.02, 0.34], gl: 0.8, nod: 0.44, lean: 0.16, props: { scoop: head }, n: { ...n, splash: 1 } };
      }
      case 'lift': {
        const head = lerpV(add(LT.water, 0.28, -0.02, 0), [0.56, 1.34, 0.42], sm(u, 0.05, 0.9));
        return { r: handle(head), gr: 0.9, l: add(head, 0.04, 0.2, 0.12), gl: 0.5, nod: 0.3, props: { scoop: head }, n: { ...n, drip: 1 } };
      }
      case 'drop': {
        const head = lerpV([0.56, 1.34, 0.42], add(LT.bucket, 0, 0.42, 0), sm(u, 0.05, 0.6));
        return { r: handle(head), gr: 0.9, nod: 0.42, lean: 0.12, props: { scoop: head }, n };
      }
      case 'rinse': {
        const h = lerpV(handle(add(LT.bucket, 0, 0.42, 0)), LT.scoop, sm(u, 0.05, 0.9));
        return { r: h, gr: 0.9, nod: 0.14, props: { scoop: add(h, -0.16, -0.42, -0.34) }, n };
      }
      default:
        return { n };
    }
  },
};

const SCRIPTS: Record<FhMotion, Script> = {
  fhReady: READY, fhReadSea: READSEA, fhBrief: BRIEF, fhMend: MEND, fhKnots: KNOTS, fhSort: SORT, fhSell: SELL, fhPrice: PRICE, fhPots: POT, fhIce: ICE, fhSquid: SQUID, fhTide: TIDE, fhBid: BID, fhLog: LOG, fhTank: TANK,
};
