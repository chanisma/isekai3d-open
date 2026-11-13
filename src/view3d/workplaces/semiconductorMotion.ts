import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';

/*
 * A day at the 반도체 팹 (2026-11-01, a new career at the user's request). Each motion is a round of beats: where the dweller is,
 * where the hands go, and what moves. The piece reads the same script by the same clock (semiconductor.ts), so the wafer the
 * wand lifts is the one on the chuck and the die on the screen is the one the scanner has just exposed.
 *
 * - 방진복 갱의대 (fbGownBench): fbGown a suit off the rail, held up and checked, put on (`n.suit`: the dweller is in the suit, cleanSuit.ts); the mask pressed to the nose, the mirror; off and back on the rail.
 * - 에어샤워 (fbAirShower): fbShower in by the outer door, arms up under the jets, turned round, back out by it.
 * - 노광 장비 (fbLitho): fbExpose the wafer box opened, a wafer into the stage, the shots step across it. fbReticle a pod carried
 *   from its shelf to the hatch. fbOverlay two marks brought together at the trackball.
 * - 감광액 코터 (fbCoater): fbCoat a wafer on the wand to the chuck, the lid, the spin, the film, back.
 * - 웨이퍼 운반 레일 (fbFoupRail): fbFoup a carrier comes along overhead, lowers its box, the barcode's read, up it goes.
 * - 웨이퍼 운반 로봇 (fbWaferRobot): fbTeach the pendant in both hands, the blade jogged to the slot, a full run. fbFix a blade changed.
 * - 식각·증착 장비 (fbEtchRow): fbRecipe a recipe typed, the plasma changes, the endpoint curve. fbChamber a chamber opened and wiped.
 * - 웨트 세정대 (fbWetBench): fbWet a cassette on its handle through three baths, to the drying pad.
 * - 불량 검사 현미경 (fbMicroscope): fbDefect seated, a wafer on the stage, the eyepieces, the map, a defect marked. fbLearn with a senior.
 * - 수율 회의 보드 (fbYieldBoard): fbYield the chart talked through; fbYieldCrash the fall traced and the lot held; fbYieldLead chairing it.
 * - 가스·약액 캐비닛 (fbChemCabinet): fbGas the gauges read and ticked off, a valve checked.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front). Facing the piece the
 * dweller's right hand is on +x. `tool` names what's in the hand this beat (handTool.ts), the place of it in `props`.
 */
export type FbMotion = 'fbGown' | 'fbShower' | 'fbExpose' | 'fbReticle' | 'fbOverlay' | 'fbCoat' | 'fbFoup' | 'fbTeach' | 'fbFix' | 'fbRecipe' | 'fbChamber' | 'fbWet' | 'fbDefect' | 'fbLearn' | 'fbYield' | 'fbYieldCrash' | 'fbYieldLead' | 'fbGas';
export const FB_MOTIONS = new Set<string>(['fbGown', 'fbShower', 'fbExpose', 'fbReticle', 'fbOverlay', 'fbCoat', 'fbFoup', 'fbTeach', 'fbFix', 'fbRecipe', 'fbChamber', 'fbWet', 'fbDefect', 'fbLearn', 'fbYield', 'fbYieldCrash', 'fbYieldLead', 'fbGas']);
export type FbTool = 'wand' | 'scanner' | 'pendant' | 'driver' | 'swab' | 'tongs' | 'marker' | 'clip';

export const frac = (x: number) => ((x % 1) + 1) % 1;
export const fbPhase = (p: THREE.Vector3) => frac(p.x * 0.371 + p.z * 0.547);
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
}
const st = (x: number, z: number, yaw = PI): St => ({ x, y: 0, z, yaw });
const sat = (s: V, yaw = PI): St => ({ x: s[0], y: s[1], z: s[2], yaw, sit: true });
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
  tool?: FbTool;
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
export interface FbNow {
  b: Beat;
  st: St;
  walking: boolean;
  key: Key;
  tool: FbTool | null;
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
/** Where a script has got to: the dweller, the hands, what's held and everything the piece draws. */
export function fbNow(m: FbMotion, t: number, ph: number, H = 1.6): FbNow {
  const s = SCRIPTS[m];
  const b = beatOf(s.seq, t, ph);
  const A = evalKey(s, b.from, b.u, t, H);
  const B = b.e > 0 ? evalKey(s, b.to, 0, t, H) : A;
  const e = b.e;
  const sitNow = e < 0.5 ? A.st.sit : B.st.sit;
  const here: St = { x: mixN(A.st.x, B.st.x, e), y: mixN(A.st.y, B.st.y, e), z: mixN(A.st.z, B.st.z, e), yaw: angle(A.st.yaw, B.st.yaw, e), sit: sitNow };
  const dist = Math.hypot(A.st.x - B.st.x, A.st.z - B.st.z);
  const props: Record<string, V | null> = {};
  for (const k of new Set([...Object.keys(A.key.props ?? {}), ...Object.keys(B.key.props ?? {})])) {
    const x = A.key.props?.[k] ?? null;
    const y = B.key.props?.[k] ?? null;
    props[k] = x && y ? lerpV(x, y, e) : e < 0.5 ? x : y;
  }
  const n: Record<string, number> = {};
  for (const k of new Set([...Object.keys(A.key.n ?? {}), ...Object.keys(B.key.n ?? {})])) n[k] = mixN(A.key.n?.[k] ?? 0, B.key.n?.[k] ?? 0, e);
  // A tool stays held through a move only if both ends have it.
  const tool = (e < 0.5 ? A.key.tool : B.key.tool) ?? null;
  return { b, st: here, walking: !here.sit && e > 0 && e < 1 && dist > 0.12, key: blendKey(A.key, B.key, e), tool, props, n };
}
/** A dweller at a spot of a piece here: the whole body from the script. */
export function fbPose(m: FbMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = fbNow(m, t, fbPhase(par.getWorldPosition(new THREE.Vector3())), height);
  const W = (v: V) => par.localToWorld(new THREE.Vector3(v[0], v[1], v[2]));
  const s = N.st;
  const k = N.key;
  const at = W([s.x, s.y, s.z]);
  const dir = new THREE.Vector3(Math.sin(s.yaw), 0, Math.cos(s.yaw)).transformDirection(par.matrixWorld);
  const yaw = Math.atan2(dir.x, dir.z);
  const pose: BodyPose = s.sit ? { kind: 'sit', at, yaw, floor: W([s.x, 0, s.z]).y } : N.walking ? { kind: 'walk', at, yaw } : { kind: 'stand', at, yaw, crouch: k.crouch };
  return {
    pose,
    doing: {
      reach: { l: k.l && W(k.l), r: k.r && W(k.r), lean: k.lean ?? 0.05, nod: k.nod ?? 0.1, palms: k.palms ?? 0.4, grip: { l: k.gl ?? 0.3, r: k.gr ?? 0.3 }, tap: k.tap },
      crouch: k.crouch ? k.crouch : undefined,
      suit: (N.n.suit ?? 0) > 0.5,
    },
  };
}
/** Both hands either side of a point (the right on +x as you face the piece). */
const both = (p: V, dx: number, up = 0.03, ahead = 0.05, g = 0.75): Key => ({ r: add(p, dx, up, ahead), l: add(p, -dx, up, ahead), gr: g, gl: g });
/** Hands easy at the waist. */
const easy = (c: Ctx) => ({ l: c.bd(0.2, 0.55 * c.H, 0.1), r: c.bd(-0.2, 0.55 * c.H, 0.1), gl: 0.3, gr: 0.3 });
/** Where the middle of the head is on someone stood up straight. */
export const HEAD = 0.925;
const headOf = (c: Ctx): V => [c.st.x, c.st.y + HEAD * c.H, c.st.z];
const typing = (p: V, t: number): Key => ({ r: add(p, 0.09 + 0.012 * Math.sin(t * 11), 0.03, 0), l: add(p, -0.09, 0.03 + 0.008 * Math.sin(t * 13), 0), gr: 0.25, gl: 0.25, palms: 0.05 });
const lerp3 = (a: V, b: V, c: V, u: number): V => (u < 0.5 ? lerpV(a, b, sm(u, 0, 0.5)) : lerpV(b, c, sm(u, 0.5, 1)));

// =============================================================================================
// 방진복 갱의대 (fbGownBench, 2 × 1): a rail of suits, a shelf of hoods at the right, a long mirror at the left.

export const GN = { rail: 1.72, suitZ: -0.14, suit: [-0.28, 1.72, -0.14] as V, hood: [0.72, 1.06, -0.1] as V, mirror: -0.82 };
const GOWN: Script = {
  seq: [['come', 0.7], ['take', 1.3], ['look', 2.4], ['into', 2.2], ['mask', 1.6], ['mirror', 2.8], ['off', 2.2], ['hang', 1.3]],
  at: (k) => (k === 'mirror' ? st(-0.42, 0.52, PI + 0.55) : st(-0.28, 0.46)),
  key(k, u, c) {
    const up: V = c.bd(0, 0.92 * c.H, 0.3);
    const low: V = c.bd(0, 0.42 * c.H, 0.26);
    const suit: V | null = k === 'take' ? lerpV(GN.suit, up, sm(u, 0.4, 1)) : k === 'look' ? add(up, 0.03 * Math.sin(c.t * 2), 0.012 * Math.sin(c.t * 3), 0) : k === 'into' ? (u < 0.5 ? lerpV(up, low, sm(u, 0, 0.5)) : null) : k === 'off' ? (u > 0.5 ? lerpV(low, up, sm(u, 0.5, 1)) : null) : k === 'hang' ? lerpV(up, GN.suit, sm(u, 0, 0.7)) : k === 'mask' || k === 'mirror' ? null : GN.suit;
    // On as it's stepped into, for as long as they stand there in it.
    const n = { suit: (k === 'into' && u >= 0.5) || k === 'mask' || k === 'mirror' || (k === 'off' && u < 0.5) ? 1 : 0 };
    const props = { suit };
    const head = headOf(c);
    switch (k) {
      case 'come':
        return { ...easy(c), nod: 0.1, n, props };
      case 'take':
        return { ...both(add(GN.suit, 0, -0.08 - 0.3 * sm(u, 0.4, 1), 0.04), 0.14), nod: -0.12, n, props };
      case 'look':
        // Held up by the shoulders: the zip, the seams, the tag.
        return { ...both(add(suit!, 0, -0.12, 0.02), 0.16, 0, 0, 0.8), nod: 0.04 + 0.1 * Math.sin(c.t * 1.4), n, props };
      case 'into':
        // Lowered and stepped into, then drawn up the body to the neck.
        return { ...both(u < 0.5 ? add(suit!, 0, -0.08, 0.02) : c.bd(0, (0.42 + 0.46 * sm(u, 0.5, 1)) * c.H, 0.16), 0.17, 0, 0, 0.7), nod: u < 0.5 ? 0.3 : 0.1, lean: u < 0.5 ? 0.16 : 0.03, n, props };
      case 'mask':
        // Pressing the mask's wire to the nose.
        return { r: add(head, 0.035, -0.07, 0.15), l: add(head, -0.035, -0.07, 0.15), gr: 0.45, gl: 0.45, nod: 0, lean: 0, palms: 0.9, n, props };
      case 'mirror':
        return { r: add(head, 0.1 * Math.cos(c.st.yaw), -0.24 + 0.03 * Math.sin(c.t * 2), 0.1), l: c.bd(0.22, 0.55 * c.H, 0.08), gl: 0.3, nod: 0, lean: 0, n, props };
      case 'off':
        return { ...both(u < 0.5 ? c.bd(0, (0.88 - 0.46 * sm(u, 0, 0.5)) * c.H, 0.16) : add(suit!, 0, -0.08, 0.02), 0.17, 0, 0, 0.7), nod: 0.2, lean: 0.06, n, props };
      default:
        return { ...both(add(suit ?? GN.suit, 0, -0.1, 0.04), 0.14), nod: -0.08, n, props };
    }
  },
};

// =============================================================================================
// 에어샤워 (fbAirShower): a booth a tile wide and two long, its piece the far tile; used from the near one, nozzles down both sides.

const SHOWER: Script = {
  seq: [['door', 1.0], ['in', 0.5, 1.0], ['shut', 0.6], ['frontJet', 3.4], ['turn', 2.8, 0.8], ['clear', 1.0], ['out', 0.8, 1.0]],
  at: (k) => (k === 'door' ? st(0, 1.2) : k === 'turn' || k === 'clear' ? st(0, 0.3, 0) : k === 'out' ? st(0, 1.2, 0) : st(0, 0.3)),
  key(k, u, c) {
    const jetting = k === 'frontJet' || k === 'turn';
    const n = { door: k === 'door' ? sm(u, 0.2, 0.9) : k === 'in' ? 1 : k === 'shut' ? 1 - sm(u, 0, 0.9) : k === 'clear' ? sm(u, 0.4, 1) : k === 'out' ? 1 : 0, jet: jetting ? 1 : 0, green: k === 'clear' || k === 'out' ? 1 : 0, left: k === 'frontJet' ? 3.4 * (1 - u) + 2.8 : k === 'turn' ? 2.8 * (1 - u) : 0 };
    const sway = 0.05 * Math.sin(c.t * 3.2);
    switch (k) {
      case 'door':
        return { r: c.bd(-0.26, 0.62 * c.H, 0.3), l: c.bd(0.2, 0.55 * c.H, 0.08), gr: 0.6, nod: 0, lean: 0, n };
      case 'frontJet':
      case 'turn':
        // Arms held out and up to let the air get round them, turned over slowly.
        return { l: c.bd(0.5, 0.92 * c.H + sway, 0.1), r: c.bd(-0.5, 0.92 * c.H - sway, 0.1), gl: 0.12, gr: 0.12, palms: 1.2 + 0.6 * Math.sin(c.t * 1.8), nod: 0, lean: 0, n };
      default:
        return { ...easy(c), nod: 0, lean: 0, n };
    }
  },
};

// =============================================================================================
// 노광 장비 (fbLitho, 3 × 2): the load port at the left, a big window on the stage in the middle, the console at the right.

export const LT = {
  stand: 0.98,
  port: [-0.92, 0.94, 0.56] as V,
  stage: [-0.06, 0.98, 0.12] as V,
  keys: [0.92, 1.02, 0.62] as V,
  ball: [1.12, 1.03, 0.62] as V,
  screen: [0.92, 1.42, 0.5] as V,
  podShelf: [1.34, 1.02, 0.66] as V,
  hatch: [0.1, 1.42, 0.5] as V,
};
const EXPOSE: Script = {
  seq: [['open', 1.6], ['load', 2.2], ['to', 0.3, 1.1], ['recipe', 2.0], ['shots', 6.0], ['look', 2.2, 0.9], ['back', 1.2, 0.9]],
  at: (k) => (k === 'open' || k === 'load' || k === 'back' ? st(LT.port[0], LT.stand) : k === 'look' ? st(-0.06, LT.stand - 0.04) : st(LT.keys[0], LT.stand)),
  key(k, u, c) {
    const inPort: V = add(LT.port, 0, 0.06, -0.12);
    const load = c.p('load', 0.2, 0.95);
    const unload = k === 'back' ? sm(u, 0.05, 0.9) : 0;
    const wafer: V = unload ? lerpV(LT.stage, inPort, unload) : lerpV(inPort, LT.stage, load);
    const shots = c.p('shots', 0.04, 0.96);
    const n = { box: k === 'open' ? sm(u, 0.3, 0.9) : k === 'back' ? 1 - sm(u, 0.75, 1) : 1, shots: k === 'back' ? 1 - sm(u, 0.8, 1) : shots, flash: k === 'shots' ? (Math.sin(c.t * 19) > 0 ? 1 : 0) : 0, onStage: load, done: k === 'look' || k === 'back' ? 1 : 0, lit: 1 };
    const props = { wafer };
    switch (k) {
      case 'open':
        return { ...both(add(LT.port, 0, 0.1 - 0.05 * sm(u, 0.3, 0.9), 0.12), 0.11), nod: 0.2, lean: 0.08, n, props };
      case 'load':
        return { r: add(LT.port, 0.24, 0.1, 0.1), l: c.bd(0.2, 0.55 * c.H, 0.08), gr: 0.15, palms: 0.05, tap: u < 0.2, nod: 0.22, n, props };
      case 'recipe':
        return { ...typing(LT.keys, c.t), nod: 0.16, lean: 0.06, n, props };
      case 'shots':
        return { r: add(LT.keys, 0.09, 0.03, 0), l: c.bd(0.2, 0.56 * c.H, 0.1), gr: 0.2, palms: 0.05, nod: 0.02, n, props };
      case 'look':
        // Bent to the window, watching the stage settle.
        return { ...easy(c), lean: 0.16, nod: 0.22, n, props };
      case 'to':
        return { ...easy(c), nod: 0.1, n, props };
      default:
        return { ...both(add(LT.port, 0, 0.08, 0.14), 0.11), nod: 0.2, n, props };
    }
  },
};
const RETICLE: Script = {
  seq: [['to', 0.4, 0.3], ['lift', 1.3], ['carry', 0.3, 1.2], ['insert', 2.4], ['hatch', 1.2], ['walk', 0.2, 0.9], ['confirm', 2.0], ['home', 0.8, 0.9]],
  at: (k) => (k === 'to' || k === 'lift' || k === 'home' ? st(1.05, LT.stand + 0.02) : k === 'carry' || k === 'insert' || k === 'hatch' ? st(LT.hatch[0], LT.stand - 0.08) : st(LT.keys[0], LT.stand)),
  key(k, u, c) {
    const held: V = c.bd(0, 1.05, 0.28);
    const pod: V | null = k === 'to' ? LT.podShelf : k === 'lift' ? lerpV(LT.podShelf, held, sm(u, 0.35, 1)) : k === 'carry' ? held : k === 'insert' ? lerp3(held, add(LT.hatch, 0, -0.02, 0.2), add(LT.hatch, 0, -0.02, -0.06), u) : null;
    const n = { hatch: k === 'carry' ? 1 : k === 'insert' ? 1 : k === 'hatch' ? 1 - sm(u, 0.2, 0.9) : 0, inside: c.p('insert', 0.85, 1) - c.p('home', 0, 0.01), done: k === 'confirm' ? sm(u, 0.4, 0.5) : 0 };
    const props = { pod };
    switch (k) {
      case 'to':
        return { ...both(LT.podShelf, 0.12, 0.04, 0.04), nod: 0.2, n, props };
      case 'lift':
      case 'carry':
      case 'insert':
        return { ...both(pod ?? held, 0.13, 0, 0.03, 0.8), nod: 0.14, lean: k === 'insert' ? 0.08 : 0.03, n, props };
      case 'hatch':
        return { r: add(LT.hatch, 0.1, 0.09 - 0.2 * sm(u, 0.2, 0.9), 0.08), l: c.bd(0.2, 0.55 * c.H, 0.08), gr: 0.5, nod: -0.04, n, props };
      case 'confirm':
        return { ...typing(LT.keys, c.t), nod: 0.14, n, props };
      default:
        return { ...easy(c), n, props };
    }
  },
};
const OVERLAY: Script = {
  seq: [['read', 1.8], ['tune', 4.2], ['shot', 1.4], ['read2', 1.6], ['tune2', 3.2], ['ok', 1.6]],
  at: () => st(LT.keys[0], LT.stand),
  key(k, u, c) {
    const off = k === 'read' ? 1 : k === 'tune' ? mixN(1, 0.42, sm(u, 0.05, 0.95)) : k === 'shot' || k === 'read2' ? 0.42 : k === 'tune2' ? mixN(0.42, 0.04, sm(u, 0.05, 0.95)) : 0.04;
    const n = { off, ok: k === 'ok' ? 1 : 0, flash: k === 'shot' ? (Math.sin(c.t * 19) > 0 ? 1 : 0) : 0, lit: 1, shots: c.p('shot', 0, 1) };
    const roll: V = add(LT.ball, 0.012 * Math.sin(c.t * 2.8), 0.04, 0.012 * Math.cos(c.t * 2.1));
    switch (k) {
      case 'read':
      case 'read2':
        return { r: add(LT.screen, 0.04, -0.12, 0.08), l: c.bd(0.2, 0.56 * c.H, 0.1), gr: 0.15, palms: 0.1, nod: -0.05, n };
      case 'tune':
      case 'tune2':
        return { r: roll, gr: 0.5, palms: 0.05, l: add(LT.keys, -0.1, 0.03, 0), gl: 0.25, nod: 0.04, lean: 0.06, n };
      case 'shot':
        return { ...typing(LT.keys, c.t), n };
      default:
        return { r: roll, gr: 0.5, l: c.bd(0.2, 0.56 * c.H, 0.1), nod: 0, n };
    }
  },
};

// =============================================================================================
// 감광액 코터 (fbCoater, 2 × 1): the bowl and its lid at the left, a cassette of wafers at the right, a wand in its holder.

export const CT = {
  stand: 0.58,
  top: 0.9,
  bowl: [-0.36, 0.98, -0.02] as V,
  cassette: [0.52, 0.98, -0.02] as V,
  /** The wand's length, grip to tip (it points -z). */
  reach: 0.25,
  home: [0.86, 1.02, 0.28] as V,
};
const COAT: Script = {
  seq: [['take', 1.5], ['carry', 0.3, 1.2], ['set', 1.2], ['close', 1.0], ['spin', 4.5], ['lift', 1.0], ['back', 0.3, 1.2], ['stow', 1.0]],
  at: (k) => (k === 'take' || k === 'back' || k === 'stow' ? st(0.58, CT.stand) : st(-0.14, CT.stand)),
  key(k, u, c) {
    const atCas: V = add(CT.cassette, 0, 0, CT.reach);
    const atBowl: V = add(CT.bowl, 0, 0.02, CT.reach);
    const wand: V | null = k === 'take' ? lerp3(CT.home, add(atCas, 0, 0.05, 0.06), add(atCas, 0, 0.02, 0), u) : k === 'carry' ? add(atBowl, 0, 0.05, 0) : k === 'set' ? lerpV(add(atBowl, 0, 0.05, 0), add(atBowl, 0.12, 0.06, 0.1), sm(u, 0.5, 1)) : k === 'close' || k === 'spin' ? null : k === 'lift' ? lerpV(add(atBowl, 0.12, 0.06, 0.1), atBowl, sm(u, 0, 0.8)) : k === 'back' ? add(atCas, 0, 0.03, 0) : lerpV(atCas, CT.home, sm(u, 0.2, 0.9));
    const spin = c.p('spin', 0.08, 0.92);
    // On the wand from the slot to the chuck, and home again; the film goes with it.
    const onWand = (k === 'take' && u > 0.72) || k === 'carry' || (k === 'set' && u < 0.45) || k === 'lift' && u > 0.6 || k === 'back' || (k === 'stow' && u < 0.12) ? 1 : 0;
    const n = { lid: k === 'close' ? sm(u, 0.1, 0.9) : k === 'spin' ? 1 : k === 'lift' ? 1 - sm(u, 0, 0.4) : 0, spin: k === 'spin' ? spin : 0, run: k === 'spin' ? Math.sin(u * PI) : 0, film: c.p('spin', 0.1, 0.9), onWand, onChuck: !onWand && c.p('set', 0.4, 0.45) > 0 && !(k === 'back' || k === 'stow') ? 1 : 0, drop: k === 'spin' && u < 0.3 ? 1 : 0 };
    const props = { wand: wand ?? CT.home };
    if (k === 'close') return { r: add(CT.bowl, 0.05, 1.18 - 0.98 - 0.08 * sm(u, 0.1, 0.9), 0.14), l: c.bd(0.2, 0.55 * c.H, 0.08), gr: 0.6, nod: 0.24, n, props };
    if (k === 'spin') return { r: add(CT.bowl, 0.42, 0.0, 0.34), l: c.bd(0.2, 0.55 * c.H, 0.08), gr: 0.15, palms: 0.05, tap: u < 0.1, nod: 0.26, lean: 0.05, n, props };
    return { r: wand ?? undefined, gr: 0.8, l: c.bd(0.2, 0.55 * c.H, 0.08), nod: 0.3, lean: 0.1, tool: 'wand', n, props };
  },
};

// =============================================================================================
// 웨이퍼 운반 레일 (fbFoupRail, 5 × 1): a rail overhead along the wall, a load port under its stop, a carrier that runs along it.

export const FR = { rail: 2.34, port: [-1.05, 0.96, 0.02] as V, hookY: 2.14, off: 2.75, stand: 0.72, holster: [-0.28, 1.0, 0.3] as V };
const FOUP: Script = {
  seq: [['wait', 1.2], ['come', 2.4], ['down', 2.6], ['pick', 0.8], ['scan', 2.2], ['ok', 1.0], ['stow', 0.7], ['up', 2.2], ['away', 1.6]],
  at: () => st(-0.62, FR.stand),
  key(k, u, c) {
    const vx = k === 'wait' ? -FR.off : k === 'come' ? mixN(-FR.off, FR.port[0], sm(u, 0, 1)) : k === 'away' ? mixN(FR.port[0], FR.off, sm(u, 0, 1)) : FR.port[0];
    const low = k === 'down' ? sm(u, 0.05, 0.95) : k === 'up' ? 1 - sm(u, 0.05, 0.95) : k === 'wait' || k === 'come' || k === 'away' ? 0 : 1;
    const label: V = add(FR.port, 0.15, 0.22, 0.27);
    const aim: V = add(label, 0.15, -0.06, 0.2);
    const scanner: V = k === 'pick' ? lerpV(FR.holster, aim, sm(u, 0, 1)) : k === 'scan' || k === 'ok' ? add(aim, 0.006 * Math.sin(c.t * 5), 0.006 * Math.sin(c.t * 4), 0) : k === 'stow' ? lerpV(aim, FR.holster, sm(u, 0, 1)) : FR.holster;
    const n = { vx, low, beam: k === 'scan' ? (Math.sin(c.t * 22) > -0.2 ? 1 : 0) : 0, read: k === 'scan' ? sm(u, 0.6, 0.7) : k === 'ok' || k === 'stow' ? 1 : k === 'up' ? 1 - sm(u, 0, 0.4) : 0, on: k === 'up' || k === 'away' || k === 'wait' || k === 'come' || k === 'down' ? 1 : 1 };
    const props = { scanner };
    const holding = k === 'pick' || k === 'scan' || k === 'ok' || k === 'stow';
    if (holding) return { r: scanner, gr: 0.8, l: c.bd(0.2, 0.55 * c.H, 0.08), nod: 0.1, lean: 0.05, tool: 'scanner', n, props };
    return { ...easy(c), nod: k === 'come' || k === 'away' ? -0.3 : k === 'down' || k === 'up' ? -0.1 + 0.3 * low : 0.04, n, props };
  },
};

// =============================================================================================
// 웨이퍼 운반 로봇 (fbWaferRobot, 2 × 2): a two-link arm in a clear case between a cassette and an aligner.

export const RB = {
  base: [0, 0.9, -0.08] as V,
  l1: 0.3,
  l2: 0.28,
  /** Wrist to the middle of a wafer on the blade. */
  blade: 0.2,
  cassette: [-0.64, 0.98, -0.1] as V,
  aligner: [0.64, 0.98, -0.1] as V,
  stand: 1.0,
  door: [0, 1.05, 0.62] as V,
  /** Where the blade's brought for changing, the middle of its plate. */
  service: [0.04, 1.02, 0.42] as V,
};
const pendantAt = (c: Ctx, sway = 0): V => c.bd(0, 0.66 * c.H + sway, 0.3);
const TEACH: Script = {
  seq: [['open', 1.4], ['grab', 0.8], ['jogA', 3.4], ['check', 1.8], ['jogB', 2.8], ['run', 4.4], ['ok', 1.2]],
  at: () => st(0, RB.stand),
  key(k, u, c) {
    const near: V = add(RB.cassette, 0.16, 0.05, 0.14);
    const tip: V = k === 'open' ? [0, 0.98, 0.1] : k === 'grab' ? [0, 0.98, 0.1] : k === 'jogA' ? lerpV([0, 0.98, 0.1], near, sm(u, 0, 1)) : k === 'check' ? near : k === 'jogB' ? lerpV(near, RB.cassette, sm(u, 0, 1)) : k === 'run' ? (u < 0.1 ? RB.cassette : lerp3(RB.cassette, [0, 1.0, 0.2], RB.aligner, sm(u, 0.1, 0.92))) : RB.aligner;
    const off = k === 'open' || k === 'grab' ? 1 : k === 'jogA' ? 1 - 0.55 * sm(u, 0, 1) : k === 'check' ? 0.45 : k === 'jogB' ? 0.45 * (1 - sm(u, 0, 1)) : 0;
    const n = { door: k === 'open' ? sm(u, 0.2, 0.9) : k === 'run' ? 1 - sm(u, 0, 0.12) : k === 'ok' ? 0 : 1, off, onBlade: k === 'run' && u > 0.1 && u < 0.92 ? 1 : 0, atAligner: (k === 'run' && u >= 0.92) || k === 'ok' ? 1 : 0, ok: k === 'ok' ? 1 : 0, run: k === 'run' ? 1 : 0, chuckSpin: (k === 'run' && u >= 0.92) || k === 'ok' ? c.t * 5 : 0 };
    const pendant = pendantAt(c);
    const props = { tip, pendant };
    if (k === 'open') return { ...both(add(RB.door, 0, -0.1 + 0.22 * sm(u, 0.2, 0.9), 0), 0.22), nod: -0.04, n, props };
    if (k === 'check') return { nod: 0.34, lean: 0.14, tool: 'pendant', n, props };
    return { nod: k === 'run' ? 0.1 : 0.22, lean: 0.06, tool: 'pendant', n, props };
  },
};
const FIX: Script = {
  seq: [['panel', 1.6], ['loose', 3.2], ['oldOut', 1.6], ['newIn', 1.6], ['tight', 3.2], ['test', 2.8], ['shut', 1.2]],
  at: () => st(0.04, RB.stand - 0.1),
  key(k, u, c) {
    const off = c.bd(-0.36, 0.56 * c.H, 0.18);
    const scr: V[] = [add(RB.service, -0.045, 0.14, 0.03), add(RB.service, 0.045, 0.14, 0.03)];
    const screw = (U: number) => scr[U < 0.5 ? 0 : 1];
    const driver: V = k === 'loose' || k === 'tight' ? screw(u) : off;
    const out: V = lerpV(RB.service, c.bd(0.38, 1.02, 0.24), sm(u, 0.1, 0.95));
    const inn: V = lerpV(c.bd(0.38, 1.02, 0.24), RB.service, sm(u, 0.1, 0.95));
    const n = { door: k === 'panel' ? sm(u, 0.2, 0.9) : k === 'test' ? 1 - sm(u, 0, 0.15) : k === 'shut' ? 0 : 1, spin: k === 'loose' || k === 'tight' ? c.t * 11 : 0, oldOn: c.p('oldOut', 0, 0.02) < 0.5 ? 1 : 0, newOn: c.p('newIn', 0.95, 1), run: k === 'test' ? 1 : 0, ok: k === 'shut' ? 1 : 0, svc: k === 'test' ? 0 : k === 'shut' ? 0 : 1, testU: k === 'test' ? u : 0, off: k === 'test' ? 0.15 : 0.5, onBlade: 0 };
    const props: Record<string, V | null> = { driver, oldBlade: k === 'oldOut' ? out : k === 'newIn' || k === 'tight' || k === 'test' || k === 'shut' ? null : null, newBlade: k === 'newIn' ? inn : k === 'oldOut' ? c.bd(0.38, 1.02, 0.24) : k === 'panel' || k === 'loose' ? c.bd(0.38, 1.02, 0.24) : null };
    const tip: V = k === 'test' ? lerp3(RB.service, RB.cassette, RB.aligner, u) : k === 'shut' ? RB.aligner : RB.service;
    props.tip = tip;
    switch (k) {
      case 'panel':
        return { ...both(add(RB.door, 0, -0.1 + 0.22 * sm(u, 0.2, 0.9), 0), 0.22), nod: 0, n, props };
      case 'loose':
      case 'tight':
        return { l: add(RB.service, -0.11, 0.05, 0.1), gl: 0.5, nod: 0.3, lean: 0.14, tool: 'driver', n, props };
      case 'oldOut':
        return { ...both(out, 0.09, 0.015, 0.02, 0.6), nod: 0.26, lean: 0.1, n, props };
      case 'newIn':
        return { ...both(inn, 0.09, 0.015, 0.02, 0.6), nod: 0.26, lean: 0.1, n, props };
      case 'test':
        return { ...easy(c), nod: 0.14, n, props };
      default:
        return { ...easy(c), nod: 0.05, n, props };
    }
  },
};

// =============================================================================================
// 식각·증착 장비 (fbEtchRow, 3 × 1): three chambers in a row with their viewports, a console on the middle one.

export const ET = {
  stand: 0.86,
  keys: [0, 1.0, 0.5] as V,
  screen: [0, 1.4, 0.36] as V,
  chamberX: [-0.98, 0, 0.98],
  door: [-0.98, 1.14, 0.34] as V,
  inside: [-0.98, 1.14, 0.08] as V,
};
const RECIPE: Script = {
  seq: [['read', 1.8], ['type', 3.6], ['send', 1.0], ['watch', 4.6], ['note', 1.8]],
  at: (k) => (k === 'watch' ? st(0.44, ET.stand) : st(0, ET.stand)),
  key(k, u, c) {
    const n = { gas: c.p('type', 0.1, 0.9), sent: c.p('send', 0.5, 0.6), curve: c.p('watch', 0, 1) * (1 - c.p('note', 0.85, 1)), lit: 1, plasma: 1 };
    switch (k) {
      case 'read':
        return { r: add(ET.screen, 0.12, -0.1, 0.1), gr: 0.15, palms: 0.1, l: c.bd(0.2, 0.56 * c.H, 0.1), nod: -0.08, n };
      case 'type':
        return { ...typing(ET.keys, c.t), nod: 0.2, n };
      case 'send':
        return { r: add(ET.keys, 0.17, 0.04 - 0.03 * sm(u, 0.3, 0.5), 0), gr: 0.15, palms: 0.05, l: add(ET.keys, -0.09, 0.03, 0), gl: 0.25, nod: 0.2, n };
      case 'watch':
        // Stooped to the viewport, the plasma changing colour.
        return { ...easy(c), lean: 0.1, nod: 0.05, n };
      default:
        return { ...typing(ET.keys, c.t), nod: 0.2, n };
    }
  },
};
const CHAMBER: Script = {
  seq: [['vent', 1.6], ['to', 0.2, 1.0], ['open', 1.3], ['swab', 5.2], ['look', 1.5], ['close', 1.2], ['pump', 2.2]],
  at: (k) => (k === 'vent' || k === 'pump' ? st(0, ET.stand) : st(ET.door[0], ET.stand - 0.04)),
  key(k, u, c) {
    const a = c.t * 3.1;
    const rr = 0.04 + 0.1 * Math.abs(Math.sin(u * 7));
    const swabTip: V = [ET.inside[0] + rr * Math.cos(a), ET.inside[1] + rr * Math.sin(a), ET.inside[2]];
    const home: V = c.bd(-0.3, 0.56 * c.H, 0.18);
    const swab: V = k === 'swab' ? add(swabTip, 0, 0, 0.3) : home;
    const n = { door: k === 'open' ? sm(u, 0.15, 0.9) : k === 'swab' || k === 'look' ? 1 : k === 'close' ? 1 - sm(u, 0.1, 0.9) : 0, clean: c.p('swab', 0, 1), vent: k === 'vent' ? 1 : 0, pump: k === 'pump' ? u : 0, lit: 1, plasma: k === 'pump' ? sm(u, 0.7, 1) : 0, curve: 0 };
    const props = { swab };
    switch (k) {
      case 'vent':
        return { ...typing(ET.keys, c.t), nod: 0.2, n, props };
      case 'pump':
        return { ...typing(ET.keys, c.t), nod: 0.14, n, props };
      case 'open':
      case 'close':
        return { r: add(ET.door, 0.2 * (k === 'open' ? 1 : 1) + 0.22 * n.door, -0.05, 0.08 + 0.1 * n.door), gr: 0.75, l: c.bd(0.2, 0.55 * c.H, 0.08), nod: 0.04, n, props };
      case 'swab':
        return { l: add(ET.door, -0.28, -0.1, 0.1), gl: 0.5, nod: 0.08, lean: 0.14, tool: 'swab', n, props };
      default:
        return { r: add(ET.inside, 0.07, 0.02, 0.3), gr: 0.15, palms: 0.15, l: c.bd(0.2, 0.55 * c.H, 0.08), nod: 0.1, lean: 0.14, n, props };
    }
  },
};

// =============================================================================================
// 웨트 세정대 (fbWetBench, 2 × 1): three baths and a drying pad; a cassette carried on a tall handle.

export const WB = {
  stand: 0.5,
  /** Bath middles, and the pad. */
  xs: [-0.7, -0.2, 0.3],
  pad: 0.8,
  z: 0.0,
  /** The handle's grip, with the cassette resting in a bath, lifted clear and on the pad. */
  dipped: 1.06,
  lifted: 1.28,
  rest: 1.18,
  panel: [0.82, 1.04, 0.28] as V,
};
const WET: Script = {
  seq: [['take', 1.1], ['a', 3.0], ['upA', 0.9], ['b', 3.0], ['upB', 0.9], ['c', 3.0], ['upC', 0.9], ['dry', 1.8], ['tick', 1.2]],
  at: (k) => (k === 'take' || k === 'dry' || k === 'tick' ? st(0.62, WB.stand) : k === 'a' || k === 'upA' ? st(-0.86, WB.stand) : k === 'b' || k === 'upB' ? st(-0.36, WB.stand) : st(0.14, WB.stand)),
  key(k, u, c) {
    const P = (x: number, y: number): V => [x, y, WB.z];
    const [A, B, D] = WB.xs;
    const jiggle = 0.012 * Math.sin(c.t * 5);
    const tongs: V = k === 'take' ? lerpV(P(WB.pad, WB.rest), P(WB.pad, WB.lifted), sm(u, 0.4, 1)) : k === 'a' ? (u < 0.15 ? lerpV(P(A, WB.lifted), P(A, WB.dipped), sm(u, 0, 0.15)) : P(A, WB.dipped + jiggle)) : k === 'upA' ? lerpV(P(A, WB.dipped), P(A, WB.lifted), sm(u, 0, 1)) : k === 'b' ? (u < 0.15 ? lerpV(P(B, WB.lifted), P(B, WB.dipped), sm(u, 0, 0.15)) : P(B, WB.dipped + jiggle)) : k === 'upB' ? lerpV(P(B, WB.dipped), P(B, WB.lifted), sm(u, 0, 1)) : k === 'c' ? (u < 0.15 ? lerpV(P(D, WB.lifted), P(D, WB.dipped), sm(u, 0, 0.15)) : P(D, WB.dipped + jiggle)) : k === 'upC' ? lerpV(P(D, WB.dipped), P(D, WB.lifted), sm(u, 0, 1)) : k === 'dry' ? lerpV(P(WB.pad, WB.lifted), P(WB.pad, WB.rest), sm(u, 0.1, 0.8)) : P(WB.pad, WB.rest);
    const n = { bath: k === 'a' ? 0 : k === 'b' ? 1 : k === 'c' ? 2 : -1, bubbling: k === 'a' || k === 'b' || k === 'c' ? 1 : 0, left: k === 'a' || k === 'b' || k === 'c' ? 30 * (1 - u) : 0, step: k === 'a' || k === 'upA' ? 1 : k === 'b' || k === 'upB' ? 2 : k === 'c' || k === 'upC' ? 3 : k === 'dry' || k === 'tick' ? 4 : 0, spin: k === 'dry' ? 1 : 0, drip: k === 'upA' || k === 'upB' || k === 'upC' ? 1 : 0 };
    const props = { tongs };
    if (k === 'tick') return { r: add(WB.panel, 0, 0.03 - 0.02 * sm(u, 0.3, 0.5), 0.02), gr: 0.15, palms: 0.05, l: c.bd(0.2, 0.55 * c.H, 0.08), nod: 0.26, n, props };
    return { l: c.bd(0.2, 0.56 * c.H, 0.08), nod: 0.26, lean: 0.06, tool: 'tongs', n, props };
  },
};

// =============================================================================================
// 불량 검사 현미경 (fbMicroscope, 2 × 1): seated at a bench; eyepieces on the left, the review screen on the right.

export const MS = {
  seat: [-0.26, 0.47, 0.82] as V,
  top: 0.76,
  stage: [-0.26, 0.88, 0.08] as V,
  eye: [-0.26, 1.22, 0.22] as V,
  knob: [-0.56, 0.9, 0.2] as V,
  mouse: [0.16, 0.79, 0.34] as V,
  box: [0.14, 0.84, 0.1] as V,
  screen: [0.5, 1.12, 0.02] as V,
  reach: 0.22,
};
const easySeat = (): { l: V; r: V; gl: number; gr: number } => ({ l: add(MS.knob, 0.1, -0.08, 0.16), r: add(MS.mouse, 0, 0.03, 0), gl: 0.4, gr: 0.45 });
const DEFECT: Script = {
  seq: [['fetch', 1.3], ['place', 1.4], ['stow', 0.8], ['look', 3.4], ['focus', 2.4], ['map', 3.0], ['mark', 2.0], ['next', 1.2]],
  at: () => sat(MS.seat),
  key(k, u, c) {
    const box: V = add(MS.box, 0, 0, MS.reach);
    const on: V = add(MS.stage, 0, 0.02, MS.reach);
    const rest: V = add(MS.mouse, 0.12, 0.05, -0.02);
    const wand: V = k === 'fetch' ? lerpV(rest, box, sm(u, 0.1, 0.9)) : k === 'place' ? lerpV(box, on, sm(u, 0, 0.8)) : k === 'stow' ? lerpV(on, rest, sm(u, 0, 1)) : rest;
    const n = { scan: k === 'look' || k === 'focus' ? 1 : 0, zoom: c.p('focus', 0, 1) * (1 - c.p('next', 0, 0.5)), map: c.p('map', 0, 0.2) * (1 - c.p('next', 0, 0.5)), marked: c.p('mark', 0.3, 0.5) * (1 - c.p('next', 0, 0.5)), onWand: k === 'place' && u < 0.8 ? 1 : k === 'fetch' && u > 0.85 ? 1 : 0, onStage: c.p('place', 0.8, 0.85) * (k === 'next' ? 0 : 1), focus: k === 'focus' ? 0.5 + 0.5 * Math.sin(u * PI) : k === 'look' ? 0.6 : 1 };
    const props = { wand };
    switch (k) {
      case 'fetch':
      case 'place':
      case 'stow':
        return { l: easySeat().l, gl: 0.4, nod: 0.22, lean: 0.1, tool: 'wand', n, props };
      case 'look':
        return { ...easySeat(), lean: 0.24, nod: 0.3, n, props };
      case 'focus':
        // A hand on the fine focus, turning, the eye still at the eyepiece.
        return { l: add(MS.knob, 0, 0.012 * Math.sin(c.t * 2), 0.03), gl: 0.75, r: easySeat().r, gr: 0.45, lean: 0.24, nod: 0.3, n, props };
      case 'map':
        return { ...easySeat(), r: add(MS.mouse, 0.02 * Math.sin(c.t * 2.2), 0.03, 0.012 * Math.cos(c.t * 1.7)), nod: 0.05, n, props };
      case 'mark':
        return { ...easySeat(), tap: u > 0.25 && u < 0.45, nod: 0.08, n, props };
      default:
        return { ...easySeat(), nod: 0.1, n, props };
    }
  },
};
const LEARN: Script = {
  seq: [['watch', 2.6], ['look', 3.2], ['ask', 2.4], ['try', 3.2], ['mark', 1.8], ['praise', 1.6]],
  at: () => sat(MS.seat),
  key(k, u, c) {
    const n = { senior: 1, point: k === 'watch' || k === 'ask' ? 1 : 0, scan: k === 'look' ? 1 : 0, nodSr: k === 'praise' ? 1 : 0, onStage: 1, zoom: c.p('ask', 0, 1), map: c.p('watch', 0, 0.3), marked: k === 'mark' ? sm(u, 0.3, 0.5) : k === 'praise' ? 1 : 0, focus: 1 };
    switch (k) {
      case 'watch':
      case 'ask':
        return { ...easySeat(), nod: 0.04, n };
      case 'look':
        return { ...easySeat(), lean: 0.24, nod: 0.3, n };
      case 'try':
        return { ...easySeat(), r: add(MS.mouse, 0.02 * Math.sin(c.t * 2.2), 0.03, 0.012 * Math.cos(c.t * 1.7)), nod: 0.05, n };
      case 'mark':
        return { ...easySeat(), tap: u > 0.25 && u < 0.45, nod: 0.08, n };
      default:
        return { ...easySeat(), nod: 0.14 * Math.sin(u * PI), n };
    }
  },
};

// =============================================================================================
// 수율 회의 보드 (fbYieldBoard, 3 × 1): the week's trend on a wide board; two colleagues stood by it.

export const YB = {
  board: -0.34,
  /** The chart's left, right, bottom and top on the board. */
  x0: -1.0,
  x1: 0.62,
  y0: 1.0,
  y1: 1.86,
  stand: 0.12,
  hold: [1.16, 1.2, -0.31] as V,
  tray: [0.9, 0.86, -0.22] as V,
  /** The way the marker's grip stands off the board. */
  off: 0.11,
};
/** A point on the chart: u along the week, v up the yield. */
export const onChart = (u: number, v: number, z = YB.board + 0.01): V => [YB.x0 + (YB.x1 - YB.x0) * u, YB.y0 + (YB.y1 - YB.y0) * v, z];
const markerAt = (u: number, v: number): V => add(onChart(u, v), 0, 0, YB.off);
const YIELD: Script = {
  seq: [['point', 2.4], ['take', 0.8], ['write', 3.2], ['back', 0.8], ['turn', 1.8], ['listen', 2.6], ['nod', 1.4]],
  at: (k) => (k === 'listen' || k === 'nod' || k === 'turn' ? st(0, YB.stand + 0.1, 0.3) : k === 'take' || k === 'back' ? st(0.46, YB.stand) : st(-0.05, YB.stand)),
  key(k, u, c) {
    const w = sm(u, 0.05, 0.95);
    const marker: V = k === 'write' ? markerAt(0.72 + 0.2 * w, 0.62 + 0.08 * w + 0.008 * Math.sin(c.t * 14)) : k === 'take' ? lerpV(add(YB.tray, 0, 0.02, 0.09), markerAt(0.72, 0.62), sm(u, 0, 1)) : k === 'back' ? lerpV(markerAt(0.92, 0.7), add(YB.tray, 0, 0.02, 0.09), sm(u, 0, 1)) : add(YB.tray, 0, 0.02, 0.09);
    const n = { plan: c.p('write', 0.05, 0.95), says: k === 'listen' ? 1 : 0, nods: k === 'nod' ? 1 : 0, level: 0.62, beacon: 0, turn: k === 'turn' || k === 'listen' || k === 'nod' ? 1 : 0 };
    const props = { marker };
    switch (k) {
      case 'point':
        return { r: add(onChart(0.5 + 0.1 * Math.sin(c.t), 0.56), -0.02, -0.02, 0.1), gr: 0.15, palms: 0.1, l: c.bd(0.2, 0.56 * c.H, 0.08), nod: -0.2, n, props };
      case 'take':
      case 'write':
      case 'back':
        return { l: c.bd(0.2, 0.56 * c.H, 0.08), nod: -0.18, lean: 0.03, tool: 'marker', n, props };
      case 'turn':
      case 'listen':
        return { ...easy(c), nod: 0, n, props };
      default:
        return { ...easy(c), nod: 0.14 * Math.sin(u * PI * 2), n, props };
    }
  },
};
const CRASH: Script = {
  seq: [['see', 1.4], ['take', 0.7], ['trace', 3.4], ['ring', 2.2], ['back', 0.7], ['hold', 0.3, 0.9], ['press', 1.4], ['call', 2.0, 0.9], ['better', 3.4]],
  at: (k) => (k === 'hold' || k === 'press' ? st(0.9, YB.stand) : k === 'call' || k === 'better' ? st(0, YB.stand + 0.1, 0.3) : k === 'take' || k === 'back' ? st(0.46, YB.stand) : st(0.12, YB.stand)),
  key(k, u, c) {
    const w = sm(u, 0.05, 0.95);
    const marker: V = k === 'trace' ? markerAt(0.62 + 0.3 * w, 0.72 - 0.42 * w) : k === 'ring' ? markerAt(0.92 + 0.04 * Math.cos(c.t * 5), 0.3 + 0.05 * Math.sin(c.t * 5)) : k === 'take' ? lerpV(add(YB.tray, 0, 0.02, 0.09), markerAt(0.62, 0.72), sm(u, 0, 1)) : k === 'back' ? lerpV(markerAt(0.92, 0.3), add(YB.tray, 0, 0.02, 0.09), sm(u, 0, 1)) : add(YB.tray, 0, 0.02, 0.09);
    const n = { crash: 1, beacon: k === 'better' ? 0 : 1, ring: c.p('ring', 0, 1), held: c.p('press', 0.25, 0.4), recover: c.p('better', 0.05, 0.95), says: k === 'call' ? 1 : 0, nods: k === 'better' ? 1 : 0, turn: k === 'call' || k === 'better' ? 1 : 0 };
    const props = { marker };
    switch (k) {
      case 'see':
        return { ...easy(c), nod: -0.2, lean: 0.03, n, props };
      case 'take':
      case 'trace':
      case 'ring':
      case 'back':
        return { l: c.bd(0.2, 0.56 * c.H, 0.08), nod: -0.2, lean: 0.03, tool: 'marker', n, props };
      case 'hold':
      case 'press':
        return { r: add(YB.hold, 0, 0.0, 0.05 - (k === 'press' ? 0.03 * sm(u, 0.2, 0.4) : 0)), gr: 0.25, palms: 0.1, l: c.bd(0.2, 0.56 * c.H, 0.08), nod: -0.04, n, props };
      case 'call':
        return { ...easy(c), r: c.bd(-0.28, 0.76 * c.H, 0.28), gr: 0.15, palms: 0.5, nod: 0, n, props };
      default:
        return { ...easy(c), nod: 0.08, n, props };
    }
  },
};
const LEAD: Script = {
  seq: [['open', 2.2], ['take', 0.8], ['write', 3.0], ['back', 0.8], ['ask', 2.6, 0.8], ['point', 2.4], ['decide', 2.4], ['close', 1.2]],
  at: (k) => (k === 'open' || k === 'ask' || k === 'decide' || k === 'close' ? st(-0.05, YB.stand + 0.22, 0) : k === 'take' || k === 'back' ? st(0.46, YB.stand) : st(0.1, YB.stand)),
  key(k, u, c) {
    const w = sm(u, 0.05, 0.95);
    const marker: V = k === 'write' ? markerAt(0.42 + 0.5 * w, 0.2 + 0.02 * Math.sin(c.t * 14)) : k === 'take' ? lerpV(add(YB.tray, 0, 0.02, 0.09), markerAt(0.42, 0.2), sm(u, 0, 1)) : k === 'back' ? lerpV(markerAt(0.92, 0.2), add(YB.tray, 0, 0.02, 0.09), sm(u, 0, 1)) : add(YB.tray, 0, 0.02, 0.09);
    const n = { goal: c.p('write', 0.05, 0.95), says: k === 'ask' ? 1 : 0, nods: k === 'decide' || k === 'close' ? 1 : 0, turn: 1, level: 0.62 };
    const props = { marker };
    switch (k) {
      case 'open':
        return { l: c.bd(0.3, 0.72 * c.H, 0.24), r: c.bd(-0.3, 0.72 * c.H + 0.04 * Math.sin(c.t * 3), 0.24), gl: 0.12, gr: 0.12, palms: 0.5, nod: 0, n, props };
      case 'take':
      case 'write':
      case 'back':
        return { l: c.bd(0.2, 0.56 * c.H, 0.08), nod: -0.16, tool: 'marker', n, props };
      case 'ask':
        return { l: c.bd(0.2, 0.56 * c.H, 0.08), r: c.bd(-0.26, 0.82 * c.H, 0.28), gr: 0.15, palms: 0.5, nod: 0, n, props };
      case 'point':
        return { r: add(onChart(0.92, 0.5), -0.02, -0.02, 0.1), gr: 0.15, palms: 0.1, l: c.bd(0.2, 0.56 * c.H, 0.08), nod: -0.2, n, props };
      case 'decide':
        return { ...both(c.bd(0, 0.74 * c.H, 0.26), 0.14, 0.03 * Math.sin(c.t * 5), 0, 0.2), palms: 0.6, nod: 0.05, n, props };
      default:
        return { ...easy(c), nod: 0.16 * Math.sin(u * PI), n, props };
    }
  },
};

// =============================================================================================
// 가스·약액 캐비닛 (fbChemCabinet, 3 × 1): the gas cabinet with its cylinders on the left, the acid cabinet, the pressure board on the right.

export const CH = {
  stand: 0.84,
  gauge: [-1.0, 1.38, 0.36] as V,
  valve: [-1.0, 1.08, 0.24] as V,
  doorHinge: -1.42,
  board: [1.0, 1.38, 0.36] as V,
};
const clipAt = (c: Ctx): V => c.bd(0.2, 0.66 * c.H, 0.28);
const GAS: Script = {
  seq: [['read', 1.8], ['tick1', 1.2], ['door', 1.3], ['valve', 2.8], ['shut', 1.2], ['walk', 0.2, 1.1], ['read2', 1.8], ['tick2', 1.2]],
  at: (k) => (k === 'walk' || k === 'read2' || k === 'tick2' ? st(CH.board[0], CH.stand) : st(CH.gauge[0] + 0.04, CH.stand)),
  key(k, u, c) {
    const clip = clipAt(c);
    const n = { door: k === 'door' ? sm(u, 0.2, 0.9) : k === 'valve' ? 1 : k === 'shut' ? 1 - sm(u, 0.1, 0.9) : 0, turn: k === 'valve' ? Math.sin(u * PI * 2) * 0.5 : 0, ticks: c.p('tick1', 0.3, 0.6) + c.p('tick2', 0.3, 0.6), gauge: 0.72 + 0.02 * Math.sin(c.t * 2) };
    const props = { clip };
    const tick: V = add(clip, 0.1 + 0.015 * Math.sin(c.t * 14), 0.05, 0.02);
    const base = { tool: 'clip' as const, gl: 0.1, n, props };
    switch (k) {
      case 'read':
        return { ...base, r: add(CH.gauge, 0.03, -0.05, 0.1), gr: 0.15, palms: 0.1, nod: -0.05 };
      case 'tick1':
      case 'tick2':
        return { ...base, r: tick, gr: 0.75, nod: 0.3 };
      case 'door':
      case 'shut':
        return { ...base, r: add(CH.gauge, 0.38, -0.32, 0.12 + 0.2 * n.door), gr: 0.75, nod: 0.05 };
      case 'valve':
        return { ...base, r: add(CH.valve, 0.015 * Math.cos(n.turn * 3), 0.015 * Math.sin(n.turn * 3), 0.1), gr: 0.8, nod: 0.2, lean: 0.14 };
      case 'read2':
        return { ...base, r: add(CH.board, 0.03, -0.05, 0.1), gr: 0.15, palms: 0.1, nod: -0.05 };
      default:
        return { ...base, r: c.bd(-0.2, 0.55 * c.H, 0.1), gr: 0.3, nod: 0.1 };
    }
  },
};

const SCRIPTS: Record<FbMotion, Script> = {
  fbGown: GOWN,
  fbShower: SHOWER,
  fbExpose: EXPOSE,
  fbReticle: RETICLE,
  fbOverlay: OVERLAY,
  fbCoat: COAT,
  fbFoup: FOUP,
  fbTeach: TEACH,
  fbFix: FIX,
  fbRecipe: RECIPE,
  fbChamber: CHAMBER,
  fbWet: WET,
  fbDefect: DEFECT,
  fbLearn: LEARN,
  fbYield: YIELD,
  fbYieldCrash: CRASH,
  fbYieldLead: LEAD,
  fbGas: GAS,
};
