import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, wave, type Beat, type V } from './busDriverMotion';

/*
 * A shift in the 방송국 아나운서실 (2026-11-01, the workplace pipeline, at the user's request), at the made-up
 * 별빛방송. Each motion is a round of beats: where the dweller is, where the hands go, and what moves. The piece
 * reads the same script by the same clock (announcer.ts), so the page turned is the page on the desk and the
 * tally lamp goes red on the beat the dweller looks up. All the news in it is made up and harmless.
 *
 * - anNews (앵커 데스크): behind the desk facing the camera; stand by, the bow, a story read to the lens with
 *   glances down, the page slid aside, an open hand to the graphic, the papers tapped square at the close.
 * - anBreak: the red banner, a runner with a sheet, a finger to the earpiece, read straight to the lens.
 * - anFacts: pen down the script, a call to the desk with the phone at the ear, the figure corrected and ticked.
 * - anEdit (원고 데스크): read through, a red pen, typed up, tried aloud under the breath, printed.
 * - anAloud: the script held up and read, a senior points at the phrasing, again, a nod.
 * - anDict (표준 발음 자료함): the dictionary down from the shelf, a finger down the column, the word said over.
 * - anRadio (온에어 부스): cue, fader up, talking into the mic, fader down for the song, a letter read, a sign-off.
 * - anLetters: the pile of postcards gone through, one chosen, read and smiled at, put on the pile for air.
 * - anPrompt (스튜디오 카메라): the script scrolled, a wrong figure caught, keyed in, checked in the viewfinder.
 * - anWatch (모니터 월): the programme screen, the screens either side, a note on a clipboard.
 * - anMeet (런다운 보드): a story card taken off the board and put higher, talked over, the clock read.
 * - anMouth (발음 연습 거울): water, a pen between the teeth and a reading, the jaw worked, the chart.
 * - anCoach: beside a new announcer: shows the mouth, they try, a hand to the jaw, a tick on the clipboard.
 * - anMakeup (분장·의상 코너): powder and a brush from the makeup artist, hair, then the jacket from the rail.
 * - anNarr (내레이션 녹음 부스): headphones on, a line read at the mic, a mark on the script, a retake, a listen.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front). Facing the
 * piece the dweller's right hand is on +x; sat behind a desk facing out (+z), their left hand is on +x.
 */
export type AnMotion = 'anNews' | 'anBreak' | 'anFacts' | 'anEdit' | 'anAloud' | 'anDict' | 'anRadio' | 'anLetters' | 'anPrompt' | 'anWatch' | 'anMeet' | 'anMouth' | 'anCoach' | 'anMakeup' | 'anNarr';
export const AN_MOTIONS = new Set<string>(['anNews', 'anBreak', 'anFacts', 'anEdit', 'anAloud', 'anDict', 'anRadio', 'anLetters', 'anPrompt', 'anWatch', 'anMeet', 'anMouth', 'anCoach', 'anMakeup', 'anNarr']);

const frac = (x: number) => ((x % 1) + 1) % 1;
export const anPhase = (p: THREE.Vector3) => frac(p.x * 0.271 + p.z * 0.643);
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
const stand = (x: number, z: number, yaw = PI): St => ({ x, y: 0, z, yaw });
const sat = (x: number, y: number, z: number, yaw: number): St => ({ x, y, z, yaw, sit: true });
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
  p(name: string, a?: number, b?: number): number;
}
interface Script {
  seq: Seq;
  at(k: string): St;
  key(k: string, u: number, c: Ctx): Key;
}
export interface AnNow {
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
export function anNow(m: AnMotion, t: number, ph: number, H = 1.6): AnNow {
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
export function anPose(m: AnMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = anNow(m, t, anPhase(par.getWorldPosition(new THREE.Vector3())), height);
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
    },
  };
}
const idle = (c: Ctx, side: number): V => c.bd(side * 0.23, 0.55 * c.H, 0.08);
const chest = (c: Ctx, side = 0.06): V => c.bd(side, 0.62 * c.H, 0.28);
/** A pen's point going along lines on a sheet at `a`. */
const writeOn = (a: V, u: number, lines = 3, w = 0.1): V => {
  const lap = frac(u * lines);
  const row = Math.floor(u * lines);
  return add(a, -w / 2 + w * lap, 0.012, 0.03 - row * 0.022);
};
/** How high a sat person's head top is above the seat, for what goes on it (headphones, a mic before the mouth). */
export const SAT_HEAD = 0.52;

// =============================================================================================
// 앵커 데스크 (anchorDesk, 2 × 1): the dweller behind it (-z), facing out over the top to the camera (+z).

export const AD = {
  top: 0.77,
  seat: [0, 0.5, -0.4] as V,
  paper: [0.02, 0.785, 0.07] as V,
  aside: [0.36, 0.785, 0.1] as V,
  phone: [0.62, 0.8, 0.12] as V,
  pen: [-0.28, 0.79, 0.1] as V,
  runner: [0.95, -0.42] as [number, number],
};
const AD_AT = sat(AD.seat[0], AD.seat[1], AD.seat[2], 0);
const onDesk = (x: number, z = 0.02): V => [x, AD.top + 0.035, z];
const glance = (t: number) => (frac(t / 3.4) < 0.26 ? 0.32 : -0.02 + 0.015 * wave(t, 0.5));

const NEWS: Script = {
  seq: [['stby', 1.8], ['bow', 1.2], ['s1', 4.2], ['page', 1.3], ['s2', 3.8], ['open', 2.4], ['page2', 1.2], ['s3', 3.2], ['tap', 1.8], ['end', 1.3]],
  at: () => AD_AT,
  key(k, u, c) {
    const pageOff = c.p('page', 0.2, 0.8);
    const pageOff2 = c.p('page2', 0.2, 0.8);
    const props: Record<string, V | null> = { sheet: lerpV(AD.paper, AD.aside, pageOff), sheet2: pageOff > 0.99 ? lerpV(AD.paper, add(AD.aside, 0.02, 0.003, 0.02), pageOff2) : null };
    const n: Record<string, number> = { air: k === 'stby' ? 0 : 1, cue: k === 'stby' ? 3 - Math.floor(u * 3) : 0, story: k === 's1' || k === 'page' ? 0 : k === 's2' || k === 'open' || k === 'page2' ? 1 : k === 's3' ? 2 : 3 };
    const rest = (side: number): V => onDesk(side * 0.17);
    const talk = { lean: 0.03, nod: glance(c.t), palms: 0.1, gl: 0.15, gr: 0.15 };
    switch (k) {
      case 'stby':
        return { l: rest(1), r: rest(-1), lean: 0.02, nod: 0.3 - 0.3 * u, props, n, palms: 0.1 };
      case 'bow':
        return { l: rest(1), r: rest(-1), lean: 0.05 + 0.2 * Math.sin(u * PI), nod: 0.2 * Math.sin(u * PI), props, n, palms: 0.1 };
      case 'page':
      case 'page2': {
        const e = k === 'page' ? pageOff : pageOff2;
        return { r: rest(-1), l: add(lerpV(AD.paper, AD.aside, e), 0.04, 0.02, -0.03), lean: 0.08, nod: 0.36, palms: 0.05, gl: 0.75, props, n };
      }
      case 'open':
        // An open hand to the graphic beside them, a glance that way.
        return { r: rest(-1), l: add(c.bd(0.42, 0.42, 0.28), 0, 0.03 * wave(c.t, 0.5), 0), lean: 0.03, nod: -0.04, palms: 0.85, gl: 0.05, props, n };
      case 'tap': {
        // The papers gathered and tapped square on the desk, twice.
        const tapped = 0.03 * Math.abs(Math.sin(u * PI * 3));
        return { l: add(AD.paper, 0.1, 0.05 + tapped, -0.03), r: add(AD.paper, -0.1, 0.05 + tapped, -0.03), lean: 0.06, nod: 0.26, palms: 0.05, gl: 0.8, gr: 0.8, props: { sheet: add(AD.paper, 0, tapped, 0), sheet2: null }, n };
      }
      case 'end':
        return { l: rest(1), r: rest(-1), lean: 0.05 + 0.18 * Math.sin(u * PI), nod: 0.16 * Math.sin(u * PI), props: { sheet: AD.paper, sheet2: null }, n };
      default:
        return { l: add(rest(1), 0.015 * wave(c.t, 0.31), 0, 0), r: add(rest(-1), 0, 0.03 * Math.abs(wave(c.t, 0.22)), 0), ...talk, props, n };
    }
  },
};

const BREAK: Script = {
  seq: [['alert', 1.4], ['runner', 2.2], ['take', 1.4], ['read', 2.4], ['ear', 2.2], ['air', 4.6], ['more', 2.4], ['close', 1.6]],
  at: () => AD_AT,
  key(k, u, c) {
    const taken = c.p('take', 0.3, 0.7);
    const from: V = [AD.runner[0] - 0.4, 1.0, AD.runner[1] + 0.18];
    const atHand = add(AD.paper, 0, 0.1, -0.03);
    const n: Record<string, number> = { air: 1, red: 1, runner: k === 'runner' ? sm(u, 0, 0.8) : k === 'take' ? 1 : k === 'read' ? 1 - sm(u, 0.2, 0.9) : 0, flash: k === 'alert' || k === 'runner' ? 1 : 0, story: 9, banner: c.p('ear', 0.5, 0.7) };
    const sheet = taken < 1 ? (k === 'runner' || k === 'take' ? lerpV(from, atHand, taken) : null) : k === 'air' || k === 'more' || k === 'close' ? AD.paper : atHand;
    const props: Record<string, V | null> = { sheet };
    const rest = (side: number): V => onDesk(side * 0.17);
    switch (k) {
      case 'alert':
        return { l: rest(1), r: rest(-1), lean: 0.08, nod: -0.05, palms: 0.1, props, n };
      case 'runner':
        return { l: rest(1), r: rest(-1), lean: 0.06, nod: 0.05, palms: 0.1, props, n };
      case 'take':
        return { r: rest(-1), l: add(lerpV(from, atHand, taken), -0.02, -0.02, -0.03), lean: 0.05, nod: 0.05, gl: 0.8, palms: 0.05, props, n };
      case 'read':
        return { l: add(atHand, 0.1, -0.02, 0), r: add(atHand, -0.1, -0.02, 0), lean: 0.1, nod: 0.3, gl: 0.8, gr: 0.8, palms: 0.05, props, n };
      case 'ear':
        // A finger to the earpiece: the desk talking.
        return { l: rest(1), r: c.bd(-0.1, SAT_HEAD * c.H - 0.13, 0.03), lean: 0.03, nod: 0.04, palms: 0.3, gr: 0.5, props, n };
      case 'air':
        return { l: add(rest(1), 0, 0.02 * Math.abs(wave(c.t, 0.3)), 0), r: add(rest(-1), 0, 0.02 * Math.abs(wave(c.t, 0.26)), 0), lean: 0.05, nod: -0.04, palms: 0.1, props, n };
      case 'more':
        return { l: rest(1), r: writeOn(AD.paper, u, 2), lean: 0.09, nod: 0.3, gr: 0.9, palms: 0.05, props, n };
      default:
        return { l: rest(1), r: rest(-1), lean: 0.05 + 0.15 * Math.sin(u * PI), nod: 0.12 * Math.sin(u * PI), palms: 0.1, props, n };
    }
  },
};

const FACTS: Script = {
  seq: [['read', 3.2], ['mark', 2.6], ['ring', 1.4], ['call', 3.8], ['down', 1.0], ['fix', 2.6], ['tick', 1.6]],
  at: () => AD_AT,
  key(k, u, c) {
    const earP = c.bd(0.11, SAT_HEAD * c.H - 0.13, 0.04);
    const n: Record<string, number> = { checked: c.p('tick', 0.3, 0.6) + (k === 'fix' ? 0 : 0), wrong: k === 'mark' || k === 'ring' || k === 'call' || k === 'down' ? 1 : 0, fixed: c.p('fix', 0.5, 0.8), talking: k === 'call' ? 1 : 0 };
    const props: Record<string, V | null> = { sheet: AD.paper, phone: k === 'ring' ? lerpV(AD.phone, earP, sm(u, 0.4, 1)) : k === 'call' ? earP : k === 'down' ? lerpV(earP, AD.phone, sm(u, 0, 0.8)) : AD.phone, pen: null };
    const onPaper = add(AD.paper, -0.03, 0.012, -0.02);
    switch (k) {
      case 'read': {
        const pt = writeOn(AD.paper, u, 4, 0.14);
        return { l: onDesk(0.2), r: add(pt, 0, 0.02, 0), lean: 0.12, nod: 0.38, gr: 0.9, palms: 0.05, props, n };
      }
      case 'mark':
        return { l: onDesk(0.2), r: add(onPaper, 0.02 * Math.sin(u * 16), 0.01, 0.03), lean: 0.14, nod: 0.42, gr: 0.9, palms: 0.05, props, n };
      case 'ring':
        return { l: lerpV(add(AD.phone, 0, 0.03, -0.01), earP, sm(u, 0.4, 1)), r: onDesk(-0.12), lean: 0.06, nod: 0.12, gl: 0.9, props, n };
      case 'call':
        return { l: earP, r: add(onPaper, 0, 0.02 + 0.02 * wave(c.t, 0.5), 0), lean: 0.1, nod: 0.18 + 0.05 * wave(c.t, 0.6), gl: 0.9, gr: 0.9, palms: 0.1, props, n };
      case 'down':
        return { l: lerpV(earP, add(AD.phone, 0, 0.03, -0.01), sm(u, 0, 0.8)), r: onPaper, lean: 0.08, nod: 0.2, gl: 0.9, gr: 0.9, props, n };
      case 'fix':
        return { l: onDesk(0.22), r: writeOn(AD.paper, u, 2, 0.12), lean: 0.14, nod: 0.42, gr: 0.9, palms: 0.05, props, n };
      default:
        return { l: onDesk(0.2), r: add(onPaper, 0.05 * sm(u, 0.1, 0.7), 0.025 - 0.015 * Math.sin(u * PI), 0.02), lean: 0.08, nod: 0.26, gr: 0.9, palms: 0.05, props, n };
    }
  },
};

// =============================================================================================
// 원고 데스크 (prompterDesk, 1 × 1): a chair at its front, a screen and the script on it.

export const PD = {
  top: 0.74,
  seat: [0, 0.47, 0.5] as V,
  paper: [-0.08, 0.755, 0.13] as V,
  keys: [0.14, 0.76, 0.12] as V,
  out: [0.34, 0.76, 0.02] as V,
  senior: [-0.74, 0.5] as [number, number],
};
const PD_AT = sat(PD.seat[0], PD.seat[1], PD.seat[2], PI);

const EDIT: Script = {
  seq: [['read', 2.8], ['mark', 3.0], ['type', 3.6], ['aloud', 2.6], ['print', 2.0]],
  at: () => PD_AT,
  key(k, u, c) {
    const lines = k === 'read' ? 0 : k === 'mark' ? 1 : k === 'type' ? 1 + Math.floor(u * 4) : 5;
    const n: Record<string, number> = { lines, redPen: k === 'mark' ? 1 : 0, typing: k === 'type' ? 1 : 0, redMark: c.p('mark', 0.2, 0.6) };
    const props: Record<string, V | null> = { sheet: k === 'aloud' ? add(chest(c, 0), 0, 0.02, 0) : PD.paper, slip: k === 'print' ? lerpV(add(PD.out, 0, 0.1, -0.1), PD.out, sm(u, 0.2, 0.9)) : c.p('print') >= 1 ? null : null };
    const key = (j: number, s: number): V => add(PD.keys, s * 0.05, 0.03 + (frac(c.t * 2.8 + j) < 0.28 ? -0.012 : 0.008), 0);
    switch (k) {
      case 'read': {
        const row = Math.floor(u * 4);
        return { r: add(PD.paper, 0.1 * frac(u * 4) - 0.05, 0.03, -0.03 + row * 0.02), l: add(PD.paper, -0.15, 0.03, 0.08), lean: 0.14, nod: 0.42, gr: 0.2, palms: 0, props, n };
      }
      case 'mark':
        return { r: writeOn(PD.paper, u, 2, 0.12), l: add(PD.paper, -0.15, 0.03, 0.08), lean: 0.16, nod: 0.46, gr: 0.9, palms: 0, props, n };
      case 'type':
        return { r: key(0.3, 1), l: key(0, -1), lean: 0.09, nod: frac(u * 3) < 0.28 ? 0.45 : 0.08, tap: true, palms: 0, props, n };
      case 'aloud':
        return { r: add(chest(c, -0.06), 0, 0, 0), l: add(chest(c, 0.09), 0, 0, 0), lean: 0, nod: 0.18, gl: 0.75, gr: 0.75, palms: 0.05, props, n };
      default:
        return { r: lerpV(key(0, 1), add(PD.out, 0, 0.04, 0), sm(u, 0.15, 0.7)), l: add(PD.paper, -0.12, 0.03, 0.08), lean: 0.1, nod: 0.3, props, n };
    }
  },
};

const ALOUD: Script = {
  seq: [['lift', 1.4], ['read', 3.8], ['senior', 2.8], ['again', 3.6], ['nod', 1.8]],
  at: () => PD_AT,
  key(k, u, c) {
    const hold: V = add(chest(c, 0), 0, 0.03 * wave(c.t, 0.3), 0);
    const n: Record<string, number> = { senior: c.p('lift', 0.8, 1), sPoint: k === 'senior' ? 1 : 0, sNod: k === 'nod' ? 1 : 0, lines: 1 };
    const props: Record<string, V | null> = { sheet: k === 'lift' ? lerpV(PD.paper, hold, sm(u, 0.1, 0.9)) : hold };
    const lh = add(hold, -0.1, -0.02, 0);
    const rh = add(hold, 0.1, -0.02, 0);
    const talk = 0.03 + 0.02 * wave(c.t, 0.8);
    switch (k) {
      case 'senior':
        return { l: lh, r: rh, lean: 0.1, nod: 0.22, gl: 0.75, gr: 0.75, palms: 0.05, props, n };
      case 'nod':
        return { l: lh, r: rh, lean: 0.02, nod: 0.08 + 0.14 * Math.abs(Math.sin(u * PI * 2)), gl: 0.75, gr: 0.75, palms: 0.05, props, n };
      default:
        return { l: lh, r: rh, lean: k === 'lift' ? 0.12 : 0, nod: k === 'lift' ? 0.36 - 0.2 * u : 0.12 + talk, gl: 0.75, gr: 0.75, palms: 0.05, props, n };
    }
  },
};

// =============================================================================================
// 표준 발음 자료함 (pronunciationShelf, 1 × 1): the big dictionary on its slanted rest, the rest on shelves.

export const PS = {
  shelfBook: [-0.14, 1.28, -0.12] as V,
  rest: [0.02, 0.98, 0.08] as V,
  at: 0.48,
};
const DICT: Script = {
  seq: [['browse', 2.2], ['take', 1.3], ['open', 1.2], ['look', 3.4], ['say', 3.8], ['back', 1.4]],
  at: (k) => (k === 'browse' || k === 'take' || k === 'back' ? stand(-0.12, PS.at) : stand(0.02, PS.at)),
  key(k, u, c) {
    const n: Record<string, number> = { open: c.p('open', 0.1, 0.8) - c.p('back', 0, 0.3), word: k === 'say' ? 1 : 0 };
    const fromShelf = PS.shelfBook;
    const bookAt = k === 'take' ? lerpV(fromShelf, PS.rest, sm(u, 0.2, 1)) : k === 'back' ? lerpV(PS.rest, fromShelf, sm(u, 0.2, 0.9)) : k === 'browse' ? fromShelf : PS.rest;
    const props: Record<string, V | null> = { book: bookAt };
    switch (k) {
      case 'browse': {
        const f = add(PS.shelfBook, 0.26 - 0.26 * sm(u, 0.1, 0.9), 0.03, 0.14);
        return { r: f, l: idle(c, 1), lean: 0.08, nod: -0.1, palms: 0.2, gr: 0.2, props, n };
      }
      case 'take':
      case 'back':
        return { r: add(bookAt, 0.11, 0, 0.08), l: add(bookAt, -0.11, 0, 0.08), lean: 0.1, nod: 0.08, gl: 0.8, gr: 0.8, palms: 0.05, props, n };
      case 'open':
        return { r: add(PS.rest, 0.12 * sm(u, 0.1, 0.8), 0.06, 0.08), l: add(PS.rest, -0.15, 0.05, 0.08), lean: 0.14, nod: 0.3, palms: 0.1, gl: 0.3, props, n };
      case 'look': {
        // A finger down the column.
        const f = add(PS.rest, 0.1, 0.1 - 0.12 * frac(u * 2), 0.09);
        return { r: f, l: add(PS.rest, -0.18, 0.05, 0.08), lean: 0.18, nod: 0.4, palms: 0, gr: 0.2, props, n };
      }
      default:
        // Up from the page and said over, the free hand beating it out.
        return { r: add(PS.rest, 0.1, 0.02, 0.09), l: add(chest(c, 0.12), 0, 0.03 * wave(c.t, 1.2), 0), lean: 0.03, nod: 0.02 + 0.03 * wave(c.t, 1.2), palms: 0.6, gl: 0.1, gr: 0.2, props, n };
    }
  },
};

// =============================================================================================
// 라디오 온에어 부스 (onAirBooth, 2 × 1): inside behind the console, facing out through the glass.

export const OB = {
  top: 0.76,
  seat: [-0.05, 0.5, -0.24] as V,
  fader: [-0.34, 0.8, 0.14] as V,
  pad: [0.33, 0.785, 0.1] as V,
  letter: [0.0, 0.775, 0.12] as V,
  pile: [0.44, 0.78, 0.18] as V,
};
const OB_AT = sat(OB.seat[0], OB.seat[1], OB.seat[2], 0);
const RADIO: Script = {
  seq: [['cue', 1.5], ['open', 3.6], ['faderDn', 1.2], ['song', 4.2], ['faderUp', 1.2], ['letter', 3.8], ['smile', 2.0], ['close', 1.8]],
  at: () => OB_AT,
  key(k, u, c) {
    const talking = k === 'open' || k === 'letter' || k === 'close' || k === 'smile';
    const fader = k === 'cue' ? sm(u, 0.6, 1) : k === 'faderDn' ? 1 - sm(u, 0.1, 0.8) : k === 'song' ? 0 : k === 'faderUp' ? sm(u, 0.1, 0.8) : 1;
    const n: Record<string, number> = { air: k === 'cue' ? sm(u, 0.7, 0.9) : k === 'song' ? 0.35 : 1, fader, talking: talking ? 1 : 0, song: k === 'song' || k === 'faderDn' || k === 'faderUp' ? 1 : 0, hearts: k === 'smile' ? 1 : 0 };
    const props: Record<string, V | null> = { letter: k === 'letter' || k === 'smile' ? add(OB.letter, 0, 0.1, -0.02) : OB.letter };
    const rFader = add(OB.fader, 0, 0.03, -0.08 + 0.1 * fader);
    const rest: V = [0.22, OB.top + 0.03, 0.02];
    switch (k) {
      case 'cue':
        return { l: rest, r: rFader, lean: 0.05, nod: 0.15 - 0.15 * u, gr: 0.6, palms: 0.05, props, n };
      case 'open':
        return { l: add(rest, 0.02, 0.06 * Math.abs(wave(c.t, 0.5)), 0.08), r: rFader, lean: 0.05, nod: 0.03 + 0.03 * wave(c.t, 0.9), palms: 0.5, gl: 0.1, gr: 0.6, props, n };
      case 'faderDn':
      case 'faderUp':
        return { l: rest, r: rFader, lean: 0.09, nod: 0.3, gr: 0.6, palms: 0.05, props, n };
      case 'song':
        // Back in the chair while it plays, a hand tapping on the desk, the head going with it.
        return { l: add(rest, 0, 0.022 * Math.abs(wave(c.t, 1.1)), 0), r: rFader, lean: -0.04, nod: 0.03 + 0.05 * Math.abs(wave(c.t, 1.1)), palms: 0.05, gr: 0.5, props, n };
      case 'letter':
        return { l: add(OB.letter, 0.09, 0.08, -0.03), r: add(OB.letter, -0.09, 0.08, -0.03), lean: 0.07, nod: 0.22 + 0.03 * wave(c.t, 0.7), gl: 0.75, gr: 0.75, palms: 0.05, props, n };
      case 'smile':
        return { l: add(OB.letter, 0.09, 0.08, -0.03), r: add(OB.letter, -0.09, 0.08, -0.03), lean: -0.02 + 0.02 * wave(c.t, 2), nod: -0.04 + 0.03 * wave(c.t, 2), gl: 0.75, gr: 0.75, palms: 0.05, props, n };
      default:
        return { l: rest, r: rFader, lean: 0.05 + 0.08 * Math.sin(u * PI), nod: 0.03, gr: 0.6, palms: 0.05, props, n };
    }
  },
};
const LETTERS: Script = {
  seq: [['sort', 3.2], ['pick', 1.5], ['read', 3.4], ['smile', 2.0], ['pile', 1.5], ['type', 2.4]],
  at: () => OB_AT,
  key(k, u, c) {
    const pick = lerpV(OB.pile, add(OB.letter, 0, 0.06, -0.02), k === 'pick' ? sm(u, 0.15, 0.85) : k === 'pile' ? 1 - sm(u, 0.1, 0.85) : k === 'read' || k === 'smile' ? 1 : 0);
    const n: Record<string, number> = { air: 0.35, picked: k === 'read' || k === 'smile' ? 1 : 0, chosen: c.p('pile', 0.5, 0.8), inbox: k === 'type' ? 1 + Math.floor(u * 3) : 0, hearts: k === 'smile' ? 1 : 0 };
    const props: Record<string, V | null> = { letter: pick };
    switch (k) {
      case 'sort': {
        // Through the postcards, one thumbed over at a time.
        const lap = frac(u * 3);
        return { l: add(OB.pile, 0.01, 0.03, -0.02), r: add(OB.pile, -0.12 + 0.08 * Math.sin(lap * PI), 0.05, -0.02), lean: 0.1, nod: 0.36, palms: 0.05, gl: 0.6, gr: 0.5, props, n };
      }
      case 'pick':
      case 'pile':
        return { l: add(pick, 0.03, 0.02, -0.02), r: [-0.2, OB.top + 0.03, 0.02], lean: 0.09, nod: 0.3, gl: 0.8, palms: 0.05, props, n };
      case 'read':
        return { l: add(pick, 0.08, 0.03, -0.02), r: add(pick, -0.08, 0.03, -0.02), lean: 0.09, nod: 0.3, gl: 0.75, gr: 0.75, palms: 0.05, props, n };
      case 'smile':
        return { l: add(pick, 0.08, 0.03, -0.02), r: add(pick, -0.08, 0.03, -0.02), lean: -0.03 + 0.02 * wave(c.t, 2), nod: -0.03, gl: 0.75, gr: 0.75, palms: 0.05, props, n };
      default: {
        const kbd = add(OB.pad, 0, 0.02, 0);
        return { l: add(kbd, 0.04, 0.012 * wave(c.t, 3), 0), r: add(kbd, -0.05, -0.012 * wave(c.t, 3), 0), lean: 0.08, nod: 0.3, tap: true, palms: 0, props, n };
      }
    }
  },
};

// =============================================================================================
// 스튜디오 카메라 (anCamera, 1 × 1): the lens to the back (-z), the operator's side to the front.

export const CM = {
  at: 0.62,
  grip: 1.08,
  handle: [0.28, 1.08, 0.24] as V,
  keys: [-0.05, 0.98, 0.33] as V,
  finder: [0, 1.32, 0.21] as V,
};
const PROMPT: Script = {
  seq: [['scroll', 3.0], ['typo', 2.2], ['type', 3.0], ['scroll2', 2.2], ['finder', 2.4], ['tilt', 2.2]],
  at: () => stand(0, CM.at),
  key(k, u, c) {
    const n: Record<string, number> = { scroll: k === 'scroll' ? u * 0.4 : k === 'typo' || k === 'type' ? 0.4 : k === 'scroll2' ? 0.4 + u * 0.6 : 1, wrong: k === 'typo' || (k === 'type' && u < 0.6) ? 1 : 0, fixed: c.p('type', 0.6, 0.7), tilt: k === 'tilt' ? 0.08 * Math.sin(u * PI * 2) : 0, on: 1 };
    const kbd = (s: number, j: number): V => add(CM.keys, s * 0.05, 0.03 + (frac(c.t * 2.8 + j) < 0.28 ? -0.012 : 0.008), 0);
    switch (k) {
      case 'scroll':
      case 'scroll2':
        return { r: add(CM.keys, 0.1, 0.03, 0), l: add(CM.keys, -0.12, 0.03, 0.02), lean: 0.08, nod: 0.12, palms: 0.05, gr: 0.5, n };
      case 'typo':
        // A finger to the wrong figure on the screen.
        return { r: add(CM.finder, 0.02, -0.05, 0.05), l: add(CM.keys, -0.12, 0.03, 0.02), lean: 0.12, nod: -0.08, palms: 0, gr: 0.2, n };
      case 'type':
        return { r: kbd(1, 0), l: kbd(-1, 0.3), lean: 0.11, nod: frac(u * 3) < 0.3 ? -0.05 : 0.22, tap: true, palms: 0, n };
      case 'finder':
        return { r: CM.handle, l: add(CM.handle, -0.56, 0, 0), lean: 0.18, nod: -0.06, gl: 0.9, gr: 0.9, palms: 0.05, n };
      default:
        return { r: add(CM.handle, 0, 0.06 * Math.sin(u * PI * 2), 0), l: add(CM.handle, -0.56, 0.06 * Math.sin(u * PI * 2), 0), lean: 0.1, nod: -0.04, gl: 0.9, gr: 0.9, palms: 0.05, n };
    }
  },
};

// =============================================================================================
// 모니터 월 (anMonitorWall, 3 × 1).

export const MW = {
  at: 0.38,
  pgm: [0, 1.62, -0.2] as V,
  ledge: 0.9,
  talkback: [0.95, 0.89, -0.02] as V,
};
const WATCH: Script = {
  seq: [['pgm', 2.6], ['left', 2.2, 0.7], ['right', 2.4, 0.9], ['note', 3.2], ['talk', 2.8], ['done', 1.2]],
  at: (k) => (k === 'left' ? stand(-0.75, MW.at) : k === 'right' ? stand(0.75, MW.at) : k === 'talk' ? stand(0.7, MW.at - 0.08) : stand(0, MW.at + 0.04)),
  key(k, u, c) {
    const board = chest(c, 0.04);
    const n: Record<string, number> = { looking: k === 'left' ? 0 : k === 'pgm' ? 1 : k === 'right' ? 2 : 1, ticked: c.p('note', 0.2, 0.9), talk: k === 'talk' ? 1 : 0 };
    const props: Record<string, V | null> = { board };
    const hold = add(board, -0.07, -0.05, 0);
    switch (k) {
      case 'pgm':
        return { l: hold, r: idle(c, -1), lean: 0, nod: -0.22, gl: 0.8, palms: 0.3, props, n };
      case 'left':
        return { l: hold, r: add(c.bd(-0.1, 1.28, 0.34), 0, 0.02 * wave(c.t, 0.6), 0), lean: 0.06, nod: -0.2, gl: 0.8, gr: 0.2, palms: 0, props, n };
      case 'right':
        return { l: hold, r: add(c.bd(0.05, 1.12, 0.34), 0.05 * wave(c.t, 0.4), 0, 0), lean: 0.06, nod: -0.05, gl: 0.8, gr: 0.2, palms: 0, props, n };
      case 'note':
        return { l: hold, r: writeOn(add(board, 0, 0.01, 0.02), u, 3, 0.1), lean: 0.06, nod: 0.42, gl: 0.8, gr: 0.9, palms: 0.05, props, n };
      case 'talk':
        return { l: hold, r: add(MW.talkback, 0, 0.03 + (frac(c.t) < 0.5 ? 0 : 0.008), 0.03), lean: 0.14, nod: 0.18, gl: 0.8, gr: 0.3, palms: 0, props, n };
      default:
        return { l: hold, r: idle(c, -1), lean: 0.02, nod: -0.16, gl: 0.8, palms: 0.3, props, n };
    }
  },
};

// =============================================================================================
// 런다운 보드 (anRundownBoard, 2 × 1): the order of the night's stories, in cards on a magnetic board.

export const RB = {
  z: -0.32,
  from: [-0.32, 1.36, -0.32] as V,
  to: [-0.32, 1.76, -0.32] as V,
  clock: [0.72, 2.02, -0.3] as V,
  at: 0.12,
  people: [[-0.72, 0.8, 1.35], [1.12, 0.78, -1.5]] as Array<[number, number, number]>,
};
const MEET: Script = {
  seq: [['read', 2.4], ['take', 1.5], ['move', 2.8], ['place', 1.2], ['talk', 3.4], ['clock', 2.0], ['agree', 1.5]],
  at: (k) => (k === 'talk' || k === 'agree' ? stand(0.02, RB.at + 0.12, PI + 0.55) : k === 'clock' ? stand(0.55, RB.at, PI) : stand(0.12, RB.at, PI)),
  key(k, u, c) {
    const e = k === 'move' ? sm(u, 0.1, 0.9) : k === 'place' || c.p('place') >= 1 ? 1 : 0;
    const out = 0.02 * (k === 'take' ? sm(u, 0.2, 0.8) : k === 'move' ? 1 : 0);
    const card = lerpV(add(RB.from, 0, 0, out), add(RB.to, 0, 0, out), e);
    const n: Record<string, number> = { moved: e, talk: k === 'talk' ? 1 : 0, agree: k === 'agree' ? 1 : 0, point: k === 'read' ? 1 : 0 };
    const props: Record<string, V | null> = { card };
    switch (k) {
      case 'read': {
        const f = add(RB.to, 0.05 - 0.15 * u, -0.1 - 0.5 * frac(u * 2), 0.06);
        return { r: f, l: idle(c, 1), lean: 0.06, nod: -0.1 + 0.25 * frac(u * 2), palms: 0, gr: 0.2, props, n };
      }
      case 'take':
      case 'move':
      case 'place':
        return { r: add(card, 0.02, -0.01, 0.06), l: idle(c, 1), lean: 0.06, nod: card[1] > 1.5 ? -0.25 : 0.05, gr: 0.75, palms: 0.05, props, n };
      case 'talk':
        return { r: add(c.bd(-0.22, 0.6 * c.H, 0.26), 0, 0.03 * wave(c.t, 0.6), 0), l: add(c.bd(0.2, 0.6 * c.H, 0.26), 0, 0.03 * wave(c.t, 0.5, 0.3), 0), lean: 0.03, nod: 0.03, palms: 0.8, gr: 0.1, gl: 0.1, props, n };
      case 'clock':
        return { r: add(RB.clock, 0.02, -0.08, 0.1), l: idle(c, 1), lean: 0.03, nod: -0.34, palms: 0, gr: 0.2, props, n };
      default:
        return { r: idle(c, -1), l: idle(c, 1), lean: 0.03 + 0.12 * Math.sin(u * PI), nod: 0.15 * Math.sin(u * PI), palms: 0.4, props, n };
    }
  },
};

// =============================================================================================
// 발음 연습 거울 (anDictionMirror, 2 × 1): a mirror of its own, the mouth chart beside it, a ledge.

export const MR = {
  at: 0.12,
  ledge: 0.88,
  water: [0.56, 0.92, -0.22] as V,
  pen: [-0.48, 0.91, -0.22] as V,
  chart: [-0.66, 1.42, -0.34] as V,
  rookie: [0.72, 0.2] as [number, number],
};
const MOUTH: Script = {
  seq: [['water', 2.0], ['pen', 1.4], ['penRead', 3.8], ['penOut', 1.2], ['jaw', 3.2], ['chart', 2.2, 0.7], ['say', 2.8]],
  at: (k) => (k === 'chart' ? stand(-0.38, MR.at, PI) : k === 'water' ? stand(0.24, MR.at, PI) : stand(-0.06, MR.at, PI)),
  key(k, u, c) {
    const mouth = c.bd(0.005, 0.875 * c.H, 0.1);
    const penP: V | null = k === 'pen' ? lerpV(MR.pen, mouth, sm(u, 0.2, 0.95)) : k === 'penRead' ? mouth : k === 'penOut' ? lerpV(mouth, MR.pen, sm(u, 0.1, 0.85)) : MR.pen;
    const waterUp = k === 'water' ? Math.sin(u * PI) : 0;
    const waterP = lerpV(MR.water, add(mouth, 0, -0.1, 0), sm(waterUp, 0.2, 1));
    const n: Record<string, number> = { reflect: 1, jaw: k === 'jaw' ? 1 : 0, syll: k === 'penRead' ? Math.floor(u * 5) : k === 'say' ? Math.floor(u * 3) + 5 : -1, chart: k === 'chart' ? 1 : 0 };
    const props: Record<string, V | null> = { pen: penP, water: waterP };
    const board = chest(c, 0.02);
    switch (k) {
      case 'water':
        return { r: add(waterP, 0.02, 0, 0.04), l: idle(c, 1), lean: 0.06 - 0.12 * waterUp, nod: 0.25 - 0.45 * waterUp, gr: 0.85, palms: 0.05, props, n };
      case 'pen':
      case 'penOut':
        return { r: add(penP as V, 0.03, -0.02, 0.02), l: idle(c, 1), lean: 0.04, nod: 0.1, gr: 0.8, palms: 0.05, props, n };
      case 'penRead':
        return { r: add(mouth, 0.06, -0.02, 0.02), l: add(board, 0.06, 0.08, -0.02), lean: 0.02, nod: 0.05 + 0.04 * wave(c.t, 1.4), gr: 0.8, gl: 0.2, palms: 0.5, props, n };
      case 'jaw': {
        // Fingertips along the jaw either side, opening and closing it.
        const down = 0.012 * Math.abs(wave(c.t, 1.1));
        return { r: add(mouth, 0.06, -0.05 - down, 0), l: add(mouth, -0.06, -0.05 - down, 0), lean: 0.08, nod: -0.05 + 0.05 * Math.abs(wave(c.t, 1.1)), gr: 0.15, gl: 0.15, palms: 0.1, props, n };
      }
      case 'chart':
        return { l: add(MR.chart, 0, -0.04 * frac(u * 2), 0.06), r: idle(c, -1), lean: 0.07, nod: -0.12, gl: 0.2, palms: 0, props, n };
      default:
        return { r: idle(c, -1), l: add(chest(c, 0.12), 0, 0.03 * wave(c.t, 1.3), 0), lean: 0.03, nod: 0.02 + 0.03 * wave(c.t, 1.3), palms: 0.6, gl: 0.1, props, n };
    }
  },
};
const COACH: Script = {
  seq: [['show', 3.2], ['turn', 1.0], ['try', 3.4], ['jaw', 2.4], ['again', 3.0], ['tick', 1.8]],
  at: (k) => (k === 'show' ? stand(-0.2, MR.at, PI) : stand(-0.14, MR.at + 0.02, PI - 1.05)),
  key(k, u, c) {
    const board = chest(c, 0.02);
    const mouth = c.bd(0, 0.875 * c.H, 0.1);
    const n: Record<string, number> = { reflect: 1, rookie: 1, rTry: k === 'try' || k === 'again' ? 1 : 0, rHand: k === 'jaw' ? 1 : 0, rNod: k === 'tick' ? 1 : 0, syll: k === 'show' ? Math.floor(u * 3) : k === 'again' ? 3 + Math.floor(u * 3) : -1 };
    const props: Record<string, V | null> = { board: k === 'show' ? null : board };
    const hold = add(board, -0.07, -0.05, 0);
    switch (k) {
      case 'show':
        return { r: add(mouth, 0.06, -0.05, 0), l: add(mouth, -0.06, -0.05, 0), lean: 0.05, nod: -0.04 + 0.05 * Math.abs(wave(c.t, 1)), gr: 0.15, gl: 0.15, palms: 0.1, props, n };
      case 'turn':
        return { r: idle(c, -1), l: hold, lean: 0.02, nod: 0.08, gl: 0.8, palms: 0.3, props, n };
      case 'jaw':
        // A hand held up by their own jaw, showing how far.
        return { r: add(mouth, 0.14, -0.04 - 0.05 * Math.abs(wave(c.t, 0.9)), 0.08), l: hold, lean: 0.06, nod: 0, gl: 0.8, palms: 0.7, gr: 0.1, props, n };
      case 'tick':
        return { r: writeOn(add(board, 0, 0.01, 0.02), u, 2, 0.08), l: hold, lean: 0.04, nod: 0.4, gl: 0.8, gr: 0.9, palms: 0.05, props, n };
      default:
        return { r: idle(c, -1), l: hold, lean: 0.03, nod: 0.04 + 0.04 * wave(c.t, 0.5), gl: 0.8, palms: 0.3, props, n };
    }
  },
};

// =============================================================================================
// 분장·의상 코너 (anMakeupCorner, 3 × 1): the vanity with its bulbs at the left, the rail at the right.

export const MK = {
  seat: [-0.72, 0.47, 0.52] as V,
  top: 0.74,
  artist: [-0.08, 0.72] as [number, number],
  rail: [0.74, 1.56, -0.1] as V,
  jacketAt: 0.32,
};
const MK_AT = sat(MK.seat[0], MK.seat[1], MK.seat[2], PI);
const MAKEUP: Script = {
  seq: [['sit', 1.4], ['powder', 3.6], ['lip', 2.4], ['hair', 2.6], ['rise', 0.6, 0.9], ['jacket', 2.4], ['on', 2.2], ['check', 1.8]],
  at: (k) => (k === 'jacket' || k === 'on' ? stand(0.66, MK.jacketAt) : k === 'check' ? stand(0.24, 0.7, PI - 0.5) : k === 'rise' ? stand(-0.45, 0.72) : MK_AT),
  key(k, u, c) {
    const face: V = [MK.seat[0] - 0.02, MK.seat[1] + SAT_HEAD * c.H - 0.2, MK.seat[2] - 0.08];
    const n: Record<string, number> = { artist: k === 'sit' ? sm(u, 0.2, 1) : k === 'rise' ? 1 - sm(u, 0, 1) : k === 'powder' || k === 'lip' || k === 'hair' ? 1 : 0, brush: k === 'powder' ? 1 : k === 'lip' ? 2 : k === 'hair' ? 3 : 0, jacket: c.p('on', 0.2, 0.8), bx: face[0], by: face[1], bz: face[2], w: k === 'powder' ? wave(c.t, 1.1) : wave(c.t, 2) };
    const lap: V[] = [[-0.86, 0.68, 0.5], [-0.58, 0.68, 0.5]];
    const props: Record<string, V | null> = {};
    const jacketOff = MK.rail;
    if (k === 'jacket') props.jacket = lerpV(jacketOff, add(c.bd(0, 0.7 * c.H, 0.3), 0, 0, 0), sm(u, 0.2, 0.9));
    else if (k === 'on') props.jacket = u < 0.6 ? c.bd(0, 0.7 * c.H, 0.14) : null;
    else props.jacket = c.p('on') >= 1 ? null : jacketOff;
    switch (k) {
      case 'jacket': {
        const j = props.jacket as V;
        return { r: add(j, 0.03, 0, 0.05), l: idle(c, 1), lean: 0.05, nod: -0.18 + 0.2 * u, gr: 0.85, palms: 0.05, props, n };
      }
      case 'on':
        // An arm in, the shoulders settled, the front pulled straight.
        return { r: add(c.bd(-0.1, 0.72 * c.H, 0.18), 0, -0.05 * sm(u, 0.5, 1), 0), l: add(c.bd(0.1, 0.72 * c.H, 0.18), 0, -0.05 * sm(u, 0.5, 1), 0), lean: 0.02, nod: 0.25, gl: 0.8, gr: 0.8, palms: 0.05, props, n };
      case 'check':
        return { r: idle(c, -1), l: add(c.bd(0.04, 0.7 * c.H, 0.16), 0, 0, 0), lean: -0.02, nod: -0.04, gl: 0.7, palms: 0.2, props, n };
      case 'rise':
        return { r: idle(c, -1), l: idle(c, 1), lean: 0.05, nod: 0.05, palms: 0.4, props, n };
      default:
        // Sat still with the eyes to the mirror.
        return { r: lap[1], l: lap[0], lean: k === 'hair' ? 0.03 : 0.02, nod: k === 'lip' ? -0.18 : -0.06, palms: 0.1, props, n };
    }
  },
};

// =============================================================================================
// 내레이션 녹음 부스 (anRecordBooth, 2 × 1): stood at the mic inside, looking out through the glass.

export const RC = {
  at: [-0.05, -0.2] as [number, number],
  stand: [-0.05, 1.08, 0.2] as V,
  talkback: [0.72, 1.06, 0.3] as V,
};
const NARR: Script = {
  seq: [['slate', 2.0], ['read', 4.4], ['stumble', 1.2], ['mark', 2.2], ['retake', 3.8], ['listen', 3.2], ['ok', 1.6]],
  at: () => stand(RC.at[0], RC.at[1], 0),
  key(k, u, c) {
    const earR = c.bd(-0.09, 0.93 * c.H, 0.02);
    const paper = add(RC.stand, 0, 0.05, -0.02);
    const n: Record<string, number> = { rec: k === 'read' || k === 'retake' ? 1 : 0, level: k === 'read' || k === 'retake' ? 0.5 + 0.4 * Math.abs(wave(c.t, 1.7)) : k === 'listen' ? 0.4 + 0.2 * Math.abs(wave(c.t, 1.1)) : 0, take: k === 'retake' || k === 'listen' || k === 'ok' ? 2 : 1, stop: k === 'stumble' || k === 'mark' ? 1 : 0, ok: k === 'ok' ? 1 : 0, marked: c.p('mark', 0.3, 0.8), rtalk: k === 'mark' ? 1 : 0 };
    switch (k) {
      case 'slate':
        return { r: earR, l: idle(c, 1), lean: 0.02, nod: 0.05, palms: 0.2, gr: 0.4, n };
      case 'read':
      case 'retake':
        return { l: add(paper, 0.2, -0.02, 0.0), r: add(earR, -0.02, 0, 0), lean: 0.04, nod: 0.22 + 0.04 * wave(c.t, 0.6), gl: 0.3, gr: 0.4, palms: 0.05, n };
      case 'stumble':
        return { r: idle(c, -1), l: add(paper, 0.2, -0.02, 0), lean: 0.08, nod: 0.3, palms: 0.05, n };
      case 'mark':
        return { r: writeOn(add(paper, -0.02, 0, 0.01), u, 2, 0.1), l: add(paper, 0.2, -0.02, 0), lean: 0.14, nod: 0.4, gr: 0.9, palms: 0.05, n };
      case 'listen':
        return { r: earR, l: c.bd(0.09, 0.93 * c.H, 0.02), lean: 0.02, nod: 0.12, gl: 0.4, gr: 0.4, palms: 0.2, n };
      default:
        return { r: idle(c, -1), l: add(c.bd(0.18, 0.72 * c.H, 0.2), 0, 0.02 * wave(c.t, 1), 0), lean: 0.02, nod: -0.04, palms: 0.85, gl: 0.1, n };
    }
  },
};

const SCRIPTS: Record<AnMotion, Script> = {
  anNews: NEWS,
  anBreak: BREAK,
  anFacts: FACTS,
  anEdit: EDIT,
  anAloud: ALOUD,
  anDict: DICT,
  anRadio: RADIO,
  anLetters: LETTERS,
  anPrompt: PROMPT,
  anWatch: WATCH,
  anMeet: MEET,
  anMouth: MOUTH,
  anCoach: COACH,
  anMakeup: MAKEUP,
  anNarr: NARR,
};
