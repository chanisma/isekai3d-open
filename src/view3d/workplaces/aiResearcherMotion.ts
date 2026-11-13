import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';

/*
 * A day at the 인공지능 연구소 (2026-11-01, a new career at the user's request). Each motion is a round of beats: where the dweller
 * is, where the hands go, and what moves. The piece reads the same script by the same clock (aiResearcher.ts), so the loss on
 * the dashboard falls as the dweller watches it, the box on the screen follows the stylus and the equation appears under the marker.
 *
 * - 학습 현황 책상 (arTrainDesk): arTrain code typed, run, the curve falling, a note, saved. arTune the rate too high, the curve
 *   blows up, a hand to the head, the rate lowered, the curve falls.
 * - 라벨링 책상 (arLabelStation): arLabel two boxes drawn with a stylus and named. arAudit a wrong label found and put right.
 *   arLearn beside a senior, a sloppy box redone.
 * - 논문 토론 화이트보드 (arPaperBoard): arDiscuss a printed paper read, equations written line by line, listening, wiped.
 *   arDesign a model's blocks drawn, looked at from a step back, wiped.
 * - GPU 랙 (arGpuRack): arGpuCheck the panel read, the cards shot with a thermometer, a job queued, a hand to the warm door.
 *   arGpuSwap a card slid out, changed at the shelf, slid back and booted.
 * - 시연 화면 (arDemoScreen): arDemo a clicker, a question, the assistant's answer, right or wrong. arAskTest questions typed
 *   at the lectern, the wrong ones logged. arFix the log read and the answers fixed. arWrongAlarm the service rolled back.
 * - 평가 결과 벽 (arEvalWall): arEval rows read and ticked, a new result pinned. arEvalLead the review chaired.
 * - 논문 읽는 코너 (arReadingNook): arRead seated, a paper in both hands, a page turned, a line highlighted.
 * - 포스터 보드 (arPosterBoard): arPoster a poster walked through with a pointer for a visitor. arPin a new one put up.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front). Facing the piece the
 * dweller's right hand is on +x. `tool` names what's in the hand this beat (handTool.ts), the place of it in `props`.
 */
export type ArMotion = 'arTrain' | 'arTune' | 'arLabel' | 'arAudit' | 'arLearn' | 'arDiscuss' | 'arDesign' | 'arGpuCheck' | 'arGpuSwap' | 'arDemo' | 'arAskTest' | 'arFix' | 'arWrongAlarm' | 'arEval' | 'arEvalLead' | 'arRead' | 'arPoster' | 'arPin';
export const AR_MOTIONS = new Set<string>(['arTrain', 'arTune', 'arLabel', 'arAudit', 'arLearn', 'arDiscuss', 'arDesign', 'arGpuCheck', 'arGpuSwap', 'arDemo', 'arAskTest', 'arFix', 'arWrongAlarm', 'arEval', 'arEvalLead', 'arRead', 'arPoster', 'arPin']);
export type ArTool = 'pen' | 'stylus' | 'marker' | 'eraser' | 'thermo' | 'clicker' | 'clip' | 'paper' | 'highlighter' | 'pointer';

const frac = (x: number) => ((x % 1) + 1) % 1;
export const arPhase = (p: THREE.Vector3) => frac(p.x * 0.419 + p.z * 0.613);
/** An index into a list, whichever round it is: the clock can run backwards in a script. */
export const wrap = (i: number, n: number) => ((Math.floor(i) % n) + n) % n;
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
  tool?: ArTool;
  props?: Record<string, V | null | undefined>;
  n?: Record<string, number>;
}
interface Ctx {
  t: number;
  H: number;
  st: St;
  /** Which round this is, for what changes round to round. */
  round: number;
  bd(side: number, up: number, ahead: number): V;
  /** How far on a beat is: 0 before it, 1 after it. */
  p(name: string, a?: number, b?: number): number;
}
interface Script {
  seq: Seq;
  at(k: string): St;
  key(k: string, u: number, c: Ctx): Key;
}
export interface ArNow {
  b: Beat;
  st: St;
  walking: boolean;
  key: Key;
  tool: ArTool | null;
  props: Record<string, V | null>;
  n: Record<string, number>;
}
function evalKey(s: Script, k: string, u: number, t: number, H: number, round: number): { st: St; key: Key } {
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
    round,
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
export function arNow(m: ArMotion, t: number, ph: number, H = 1.6): ArNow {
  const s = SCRIPTS[m];
  const b = beatOf(s.seq, t, ph);
  const A = evalKey(s, b.from, b.u, t, H, b.n);
  const B = b.e > 0 ? evalKey(s, b.to, 0, t, H, b.n) : A;
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
export function arPose(m: ArMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = arNow(m, t, arPhase(par.getWorldPosition(new THREE.Vector3())), height);
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
/** Both hands either side of a point (the right on +x as you face the piece). */
const both = (p: V, dx: number, up = 0.03, ahead = 0.05, g = 0.75): Key => ({ r: add(p, dx, up, ahead), l: add(p, -dx, up, ahead), gr: g, gl: g });
/** Hands easy at the waist. */
const easy = (c: Ctx) => ({ l: c.bd(0.2, 0.55 * c.H, 0.1), r: c.bd(-0.2, 0.55 * c.H, 0.1), gl: 0.3, gr: 0.3 });
const offHand = (c: Ctx): V => c.bd(0.2, 0.56 * c.H, 0.08);
const typing = (p: V, t: number): Key => ({ r: add(p, 0.09 + 0.012 * Math.sin(t * 11), 0.03, 0), l: add(p, -0.09, 0.03 + 0.008 * Math.sin(t * 13), 0), gr: 0.25, gl: 0.25, palms: 0.05 });
/** A hand held out, talking. */
const talking = (c: Ctx): Key => ({ l: c.bd(0.3, 0.72 * c.H, 0.24), r: c.bd(-0.3, 0.72 * c.H + 0.04 * Math.sin(c.t * 3), 0.24), gl: 0.12, gr: 0.12, palms: 0.5 });

// =============================================================================================
// 학습 현황 책상 (arTrainDesk, 2 × 1): seated; the dashboard on the left, code on the right, a notebook by the right hand.

export const TD = {
  seat: [0, 0.47, 0.82] as V,
  top: 0.76,
  keys: [-0.04, 0.79, 0.34] as V,
  mouse: [0.28, 0.79, 0.34] as V,
  dash: [-0.38, 1.17, -0.12] as V,
  code: [0.44, 1.17, -0.12] as V,
  note: [0.5, 0.77, 0.26] as V,
  /** The pen's grip stands this far over its tip. */
  penUp: 0.075,
};
const seatHands = (): Key => ({ l: add(TD.keys, -0.1, 0.03, 0.02), r: add(TD.mouse, 0, 0.03, 0), gl: 0.3, gr: 0.45, palms: 0.05 });
/** Writing in the notebook: the point the pen's tip has got to, and where the grip is for it. */
const penWrite = (u: number, t: number): V => add(TD.note, -0.05 + 0.1 * frac(u * 3), TD.penUp + 0.006 * Math.sin(t * 16), -0.04 + 0.05 * Math.floor(u * 3) * 0.5);
const penRest: V = add(TD.note, 0.11, 0.02, -0.06);
const TRAIN: Script = {
  seq: [['code', 3.0], ['run', 1.2], ['watch', 6.0], ['peek', 2.6], ['note', 3.2], ['save', 1.6]],
  at: () => sat(TD.seat),
  key(k, u, c) {
    const n = { code: c.p('code', 0, 1), running: c.p('run', 0.3, 0.5), loss: 0.06 * c.p('run', 0.4, 1) + 0.62 * c.p('watch') + 0.1 * c.p('peek') + 0.12 * c.p('note') + 0.1 * c.p('save'), noted: c.p('note', 0.1, 0.9), saved: c.p('save', 0.3, 0.5) };
    const props = { pen: k === 'note' ? penWrite(u, c.t) : penRest };
    switch (k) {
      case 'code':
        return { ...typing(TD.keys, c.t), nod: 0.14, lean: 0.06, n, props };
      case 'run':
        return { ...seatHands(), r: add(TD.keys, 0.17, 0.03 - (u > 0.3 && u < 0.5 ? 0.012 : 0), 0), gr: 0.25, tap: u > 0.3 && u < 0.5, nod: 0.14, n, props };
      case 'watch':
        // Back in the chair, chin on a hand, watching it fall.
        return { l: seatHands().l, gl: 0.3, r: c.bd(-0.08, 0.56, 0.22), gr: 0.55, palms: 0.8, nod: 0.02 + 0.03 * Math.sin(c.t * 0.9), lean: 0.1, n, props };
      case 'peek':
        // Up to the screen, a finger on the curve.
        return { l: seatHands().l, gl: 0.3, r: add(TD.dash, 0.2, -0.1 + 0.03 * Math.sin(c.t * 2), 0.42), gr: 0.15, palms: 0.1, lean: 0.24, nod: 0.02, n, props };
      case 'note':
        return { l: add(TD.note, -0.16, 0.02, 0.02), gl: 0.25, palms: 0.05, tool: 'pen', lean: 0.16, nod: 0.3, n, props };
      default:
        return { ...seatHands(), r: add(TD.mouse, 0.01 * Math.sin(c.t * 3), 0.03, 0), tap: u > 0.3 && u < 0.5, nod: 0.08, n, props };
    }
  },
};
const TUNE: Script = {
  seq: [['type', 3.0], ['run', 1.0], ['blow', 3.2], ['head', 1.8], ['lower', 3.0], ['run2', 1.0], ['fall', 5.0], ['ok', 1.6]],
  at: () => sat(TD.seat),
  key(k, u, c) {
    const n = { tune: 1, code: c.p('type', 0, 1), blow: 0.1 * c.p('run', 0.4, 1) + 0.9 * c.p('blow'), lr: c.p('lower', 0.3, 0.9), restart: c.p('run2', 0.3, 0.5), loss: 0.08 * c.p('run2', 0.4, 1) + 0.92 * c.p('fall'), running: c.p('run', 0.3, 0.5) };
    const props = { pen: penRest };
    switch (k) {
      case 'type':
      case 'lower':
        return { ...typing(TD.keys, c.t), nod: 0.14, lean: 0.06, n, props };
      case 'run':
      case 'run2':
        return { ...seatHands(), r: add(TD.keys, 0.17, 0.03, 0), gr: 0.25, tap: u > 0.3 && u < 0.5, nod: 0.14, n, props };
      case 'blow':
        return { ...seatHands(), lean: 0.22, nod: 0.02, n, props };
      case 'head':
        // It's gone up instead of down: a hand to the forehead.
        return { l: seatHands().l, gl: 0.3, r: c.bd(-0.05, 0.68, 0.16), gr: 0.2, palms: 0.9, nod: 0.26, lean: 0.12, n, props };
      case 'fall':
        return { ...seatHands(), lean: 0.14, nod: 0.03 + 0.03 * Math.sin(c.t), n, props };
      default:
        return { ...seatHands(), nod: 0.14 * Math.sin(u * PI * 2), n, props };
    }
  },
};

// =============================================================================================
// 라벨링 책상 (arLabelStation, 2 × 1): seated; a big monitor, a pen tablet whose area is the screen, shortcut keys at the left.

export const LS = {
  seat: [0, 0.47, 0.82] as V,
  top: 0.76,
  pad: [0.1, 0.785, 0.32] as V,
  padW: 0.34,
  padD: 0.2,
  keys: [-0.34, 0.79, 0.32] as V,
  screen: [0, 1.2, -0.12] as V,
  stylusUp: 0.08,
};
/** What's in the pictures: where the two boxes go on the image (0 to 1), and their names. */
export const IMAGES: ReadonlyArray<{ scene: number; a: readonly [number, number, number, number]; an: string; b: readonly [number, number, number, number]; bn: string }> = [
  { scene: 0, a: [0.12, 0.42, 0.34, 0.44], an: '고양이', b: [0.6, 0.5, 0.26, 0.36], bn: '화분' },
  { scene: 1, a: [0.08, 0.36, 0.52, 0.5], an: '자전거', b: [0.68, 0.58, 0.16, 0.3], bn: '러버콘' },
  { scene: 2, a: [0.16, 0.26, 0.3, 0.56], an: '우산', b: [0.58, 0.52, 0.28, 0.32], bn: '강아지' },
  { scene: 3, a: [0.14, 0.48, 0.28, 0.34], an: '사과', b: [0.52, 0.34, 0.34, 0.5], bn: '주전자' },
];
/** The stylus's grip for a point of the image. */
const onPad = (u: number, v: number, t: number): V => [LS.pad[0] + (u - 0.5) * LS.padW, LS.pad[1] + LS.stylusUp + 0.003 * Math.sin(t * 15), LS.pad[2] + (v - 0.5) * LS.padD];
const stylusRest: V = [LS.pad[0] + LS.padW / 2 + 0.05, LS.pad[1] + 0.03, LS.pad[2] - 0.02];
const shortcut = (t: number): V => add(LS.keys, 0.015 * Math.sin(t * 7), 0.03, 0);
const LABEL: Script = {
  seq: [['look', 1.6], ['box1', 3.0], ['class1', 1.2], ['box2', 3.0], ['class2', 1.2], ['next', 1.0]],
  at: () => sat(LS.seat),
  key(k, u, c) {
    const im = IMAGES[wrap(c.round, IMAGES.length)];
    const d = (b: readonly [number, number, number, number], e: number): V => onPad(b[0] + b[2] * e, b[1] + b[3] * e, c.t);
    const stylus: V = k === 'box1' ? d(im.a, sm(u, 0.1, 0.9)) : k === 'class1' ? d(im.a, 1) : k === 'box2' ? d(im.b, sm(u, 0.1, 0.9)) : k === 'class2' ? d(im.b, 1) : k === 'look' ? onPad(0.5, 0.5, c.t) : stylusRest;
    const n = { b1: c.p('box1', 0.1, 0.9), c1: c.p('class1', 0.2, 0.5), b2: c.p('box2', 0.1, 0.9), c2: c.p('class2', 0.2, 0.5), done: c.p('next', 0, 0.4) };
    const base = { tool: 'stylus' as const, gl: 0.25, palms: 0.05, n, props: { stylus } };
    switch (k) {
      case 'class1':
      case 'class2':
        return { ...base, l: shortcut(c.t), tap: u > 0.2 && u < 0.5, nod: 0.12, lean: 0.1 };
      case 'look':
        return { ...base, l: add(LS.keys, 0, 0.03, 0), nod: 0.02, lean: 0.16 };
      default:
        return { ...base, l: add(LS.keys, 0, 0.03, 0), nod: 0.1, lean: 0.12 };
    }
  },
};
const AUDIT: Script = {
  seq: [['look', 2.2], ['spot', 1.8], ['fix', 3.0], ['name', 1.6], ['pass', 1.6], ['next', 1.0]],
  at: () => sat(LS.seat),
  key(k, u, c) {
    const im = IMAGES[wrap(c.round, IMAGES.length)];
    const stylus: V = k === 'fix' ? onPad(im.a[0] + im.a[2] * sm(u, 0.1, 0.9), im.a[1] + im.a[3] * sm(u, 0.1, 0.9), c.t) : k === 'name' ? onPad(im.a[0] + im.a[2], im.a[1] + im.a[3], c.t) : k === 'spot' ? onPad(im.a[0], im.a[1], c.t) : stylusRest;
    const n = { audit: 1, b1: 1, c1: 1, b2: 1, c2: 1, fix: c.p('fix', 0.1, 0.9), named: c.p('name', 0.2, 0.5), pass: c.p('pass', 0.2, 0.4) * (1 - c.p('next', 0.4, 1)) };
    const base = { tool: 'stylus' as const, gl: 0.25, palms: 0.05, n, props: { stylus } };
    switch (k) {
      case 'look':
        return { ...base, l: add(LS.keys, 0, 0.03, 0), lean: 0.2, nod: 0.02 };
      case 'name':
        return { ...base, l: shortcut(c.t), tap: u > 0.2 && u < 0.5, nod: 0.12 };
      case 'pass':
        return { ...base, l: shortcut(c.t), tap: u > 0.2 && u < 0.4, nod: 0.08 };
      default:
        return { ...base, l: add(LS.keys, 0, 0.03, 0), nod: 0.1, lean: 0.12 };
    }
  },
};
const LEARN: Script = {
  seq: [['watch', 2.6], ['try', 3.4], ['ask', 2.4], ['redo', 3.0], ['name', 1.4], ['praise', 1.6]],
  at: () => sat(LS.seat),
  key(k, u, c) {
    const im = IMAGES[wrap(c.round, IMAGES.length)];
    const e = k === 'try' || k === 'redo' ? sm(u, 0.1, 0.9) : 1;
    const stylus: V = k === 'try' || k === 'redo' ? onPad(im.a[0] + im.a[2] * e, im.a[1] + im.a[3] * e, c.t) : k === 'name' ? onPad(im.a[0] + im.a[2], im.a[1] + im.a[3], c.t) : stylusRest;
    const n = { senior: 1, point: k === 'watch' || k === 'ask' ? 1 : 0, b1: k === 'watch' ? 0 : k === 'try' ? e : k === 'ask' ? 1 : k === 'redo' ? e : 1, sloppy: k === 'try' || k === 'ask' ? 1 : 0, c1: c.p('name', 0.2, 0.5), nodSr: k === 'praise' ? 1 : 0 };
    const base = { tool: 'stylus' as const, gl: 0.25, palms: 0.05, n, props: { stylus } };
    switch (k) {
      case 'watch':
      case 'ask':
        return { ...base, l: add(LS.keys, 0, 0.03, 0), nod: 0.02, lean: 0.06 };
      case 'name':
        return { ...base, l: shortcut(c.t), tap: u > 0.2 && u < 0.5, nod: 0.1 };
      case 'praise':
        return { ...base, l: add(LS.keys, 0, 0.03, 0), nod: 0.14 * Math.sin(u * PI) };
      default:
        return { ...base, l: add(LS.keys, 0, 0.03, 0), nod: 0.1, lean: 0.12 };
    }
  },
};

// =============================================================================================
// 논문 토론 화이트보드 (arPaperBoard, 3 × 1): a wide board, a printed paper taped at the right, two colleagues.

export const PB = {
  board: -0.34,
  x0: -1.28,
  x1: 0.62,
  y0: 1.02,
  y1: 1.94,
  stand: 0.12,
  writeAt: -0.62,
  tray: [0.46, 0.86, -0.22] as V,
  paper: [0.98, 1.5, -0.3] as V,
  off: 0.11,
};
/** A point on the board's writing: u across, v up. */
export const onBoard = (u: number, v: number): V => [PB.x0 + (PB.x1 - PB.x0) * u, PB.y0 + (PB.y1 - PB.y0) * v, PB.board + 0.01];
/** The three lines of an equation, where they run on the board: start and end u, height v. */
export const EQ_LINES: ReadonlyArray<readonly [number, number, number]> = [
  [0.2, 0.62, 0.76],
  [0.2, 0.62, 0.5],
  [0.2, 0.52, 0.24],
];
const markerOn = (u: number, v: number): V => add(onBoard(u, v), 0, 0, PB.off);
const eqAt = (i: number, w: number, t: number): V => {
  const L = EQ_LINES[i];
  return markerOn(L[0] + (L[1] - L[0]) * w, L[2] + 0.012 * Math.sin(t * 13));
};
const trayMarker: V = add(PB.tray, 0, 0.02, 0.09);
const trayEraser: V = add(PB.tray, -0.3, 0.05, 0.09);
const wipeAt = (u: number, t: number): V => markerOn(0.62 - 0.46 * u, 0.5 + 0.3 * Math.sin(t * 6));
const DISCUSS: Script = {
  seq: [['read', 2.4], ['take', 0.8], ['l1', 2.6], ['l2', 2.6], ['l3', 2.2], ['back', 0.8], ['turn', 1.6], ['listen', 2.6], ['nod', 1.4], ['wipe', 2.2]],
  at: (k) => (k === 'read' ? st(0.8, PB.stand + 0.1) : k === 'take' || k === 'back' ? st(0.34, PB.stand) : k === 'turn' || k === 'listen' || k === 'nod' ? st(-0.3, PB.stand + 0.14, 0.3) : st(PB.writeAt, PB.stand)),
  key(k, u, c) {
    const w = sm(u, 0.05, 0.95);
    const marker: V = k === 'l1' ? eqAt(0, w, c.t) : k === 'l2' ? eqAt(1, w, c.t) : k === 'l3' ? eqAt(2, w, c.t) : k === 'take' ? lerpV(trayMarker, c.bd(-0.2, 1.12, 0.26), sm(u, 0.2, 1)) : k === 'back' ? lerpV(c.bd(-0.2, 1.12, 0.26), trayMarker, sm(u, 0, 0.8)) : trayMarker;
    const eraser: V = k === 'wipe' ? wipeAt(w, c.t) : trayEraser;
    const n = { l1: c.p('l1', 0.05, 0.95), l2: c.p('l2', 0.05, 0.95), l3: c.p('l3', 0.05, 0.95), says: k === 'listen' ? 1 : 0, nods: k === 'nod' ? 1 : 0, wipe: c.p('wipe', 0.05, 0.95) };
    const props = { marker, eraser };
    switch (k) {
      case 'read':
        // The printed paper taped by the board, a finger going down it.
        return { r: add(PB.paper, 0.02, 0.1 - 0.2 * u, 0.1), gr: 0.15, palms: 0.1, l: offHand(c), nod: -0.12, n, props };
      case 'take':
      case 'l1':
      case 'l2':
      case 'l3':
      case 'back':
        return { l: offHand(c), nod: -0.16, lean: 0.03, tool: 'marker', n, props };
      case 'wipe':
        return { l: offHand(c), nod: -0.12, lean: 0.03, tool: 'eraser', n, props };
      case 'turn':
      case 'listen':
        return { ...easy(c), nod: 0, n, props };
      default:
        return { ...easy(c), nod: 0.14 * Math.sin(u * PI * 2), n, props };
    }
  },
};
/** The blocks of a model drawn from the left: `design` runs 0 to 1 along them. */
const designAt = (w: number, t: number): V => markerOn(0.18 + 0.48 * w, 0.5 + 0.2 * Math.sin(w * PI * 8) + 0.008 * Math.sin(t * 13));
const DESIGN: Script = {
  seq: [['think', 2.2], ['take', 0.8], ['draw1', 3.0], ['draw2', 3.0], ['back', 0.8], ['step', 1.6], ['look', 2.0], ['wipe', 2.2]],
  at: (k) => (k === 'take' || k === 'back' ? st(0.34, PB.stand) : k === 'step' || k === 'look' || k === 'think' ? st(-0.3, PB.stand + 0.42) : st(PB.writeAt, PB.stand)),
  key(k, u, c) {
    const w = sm(u, 0.05, 0.95);
    const marker: V = k === 'draw1' ? designAt(w * 0.5, c.t) : k === 'draw2' ? designAt(0.5 + w * 0.5, c.t) : k === 'take' ? lerpV(trayMarker, c.bd(-0.2, 1.12, 0.26), sm(u, 0.2, 1)) : k === 'back' ? lerpV(c.bd(-0.2, 1.12, 0.26), trayMarker, sm(u, 0, 0.8)) : trayMarker;
    const eraser: V = k === 'wipe' ? wipeAt(w, c.t) : trayEraser;
    const n = { design: 0.5 * c.p('draw1', 0.05, 0.95) + 0.5 * c.p('draw2', 0.05, 0.95), says: k === 'look' ? 1 : 0, wipe: c.p('wipe', 0.05, 0.95) };
    const props = { marker, eraser };
    switch (k) {
      case 'think':
        // A hand at the chin before the first line.
        return { l: offHand(c), r: c.bd(-0.06, 0.82 * c.H, 0.14), gr: 0.55, palms: 0.8, nod: -0.1, n, props };
      case 'take':
      case 'draw1':
      case 'draw2':
      case 'back':
        return { l: offHand(c), nod: -0.16, lean: 0.03, tool: 'marker', n, props };
      case 'wipe':
        return { l: offHand(c), nod: -0.12, lean: 0.03, tool: 'eraser', n, props };
      default:
        return { ...easy(c), nod: -0.12, n, props };
    }
  },
};

// =============================================================================================
// GPU 랙 (arGpuRack, 2 × 1): a glass-doored rack of cards at the left, a rack with its panel and a spare-card shelf at the right.

export const GR = {
  stand: 0.8,
  left: -0.48,
  right: 0.48,
  panel: [0.48, 1.34, 0.37] as V,
  keys: [0.48, 1.0, 0.44] as V,
  door: 0.36,
  slot: [-0.48, 1.02, 0.28] as V,
  shelf: [0.48, 0.72, 0.42] as V,
  hook: [0.86, 1.02, 0.44] as V,
};
const CHECK: Script = {
  seq: [['read', 2.4], ['take', 0.8], ['aim', 3.2], ['aim2', 2.4], ['back', 0.8], ['queue', 3.2], ['feel', 1.8]],
  at: (k) => (k === 'aim' || k === 'aim2' || k === 'feel' ? st(GR.left, GR.stand + 0.06) : k === 'take' || k === 'back' ? st(0.62, GR.stand) : st(GR.right, GR.stand)),
  key(k, u, c) {
    const up: V = c.bd(-0.14, 1.12, 0.32);
    const thermo: V = k === 'aim' ? add(up, 0.05 * Math.sin(c.t * 1.2), 0.03 * Math.sin(c.t * 0.8) - 0.04, 0) : k === 'aim2' ? add(up, 0.08 * Math.sin(c.t * 1.2), -0.16 + 0.02 * Math.sin(c.t), 0) : k === 'take' ? lerpV(GR.hook, up, sm(u, 0.2, 1)) : k === 'back' ? lerpV(up, GR.hook, sm(u, 0, 0.8)) : GR.hook;
    const n = { beam: k === 'aim' || k === 'aim2' ? 1 : 0, read: k === 'aim' ? 0.6 : k === 'aim2' ? 1 : 0, load: 0.62 + 0.3 * c.p('queue', 0.3, 0.95), temp: 0.5 * c.p('queue', 0.3, 1) + 0.5 * c.p('feel') };
    const props = { thermo };
    switch (k) {
      case 'read':
        return { r: add(GR.panel, 0.05, -0.08 + 0.05 * Math.sin(c.t * 1.4), 0.1), gr: 0.15, palms: 0.1, l: offHand(c), nod: -0.06, n, props };
      case 'take':
      case 'aim':
      case 'aim2':
      case 'back':
        return { l: offHand(c), nod: k === 'aim2' ? 0.14 : 0.04, tool: 'thermo', n, props };
      case 'queue':
        return { ...typing(GR.keys, c.t), nod: 0.14, n, props };
      default:
        // The palm near the warm glass: how warm it really is.
        return { r: [GR.left + 0.1, 1.28, GR.door + 0.06], gr: 0.05, palms: 0.05, l: offHand(c), nod: 0.04, n, props };
    }
  },
};
const SWAP: Script = {
  seq: [['open', 1.3], ['pull', 2.0], ['carry', 0.3, 0.9], ['set', 1.2], ['fit', 1.8], ['lift', 1.0], ['carryB', 0.3, 0.9], ['push', 2.0], ['shut', 1.2], ['boot', 2.6]],
  at: (k) => (k === 'carry' || k === 'set' || k === 'fit' || k === 'lift' ? st(GR.right, GR.stand) : st(GR.left, GR.stand)),
  key(k, u, c) {
    const out: V = add(GR.slot, 0, 0, 0.42);
    const carried: V = c.bd(0, 1.0, 0.3);
    const onShelf: V = add(GR.shelf, 0, 0.03, 0);
    const card: V | null = k === 'open' || k === 'shut' || k === 'boot' ? null : k === 'pull' ? lerpV(GR.slot, out, sm(u, 0.1, 0.9)) : k === 'carry' || k === 'carryB' ? carried : k === 'set' ? lerpV(carried, onShelf, sm(u, 0, 0.8)) : k === 'fit' ? onShelf : k === 'lift' ? lerpV(onShelf, carried, sm(u, 0.2, 1)) : lerpV(out, GR.slot, sm(u, 0.1, 0.9));
    const n = { door: k === 'open' ? sm(u, 0.2, 0.9) : k === 'shut' ? 1 - sm(u, 0.1, 0.9) : k === 'boot' ? 0 : 1, gone: c.p('pull', 0.1, 0.2) - c.p('push', 0.85, 0.95), fresh: c.p('fit', 0.3, 0.5), booted: c.p('boot', 0.4, 0.8), load: 0.3 + 0.5 * c.p('boot', 0.4, 1), temp: 0 };
    const props = { card };
    switch (k) {
      case 'open':
      case 'shut':
        return { r: [GR.left + 0.3, 1.1, GR.door + 0.08 + 0.3 * n.door], gr: 0.75, l: offHand(c), nod: 0.04, n, props };
      case 'boot':
        return { r: add(GR.panel, -0.1, -0.12, 0.08), gr: 0.15, palms: 0.1, l: offHand(c), nod: -0.04, n, props };
      case 'fit':
        // The old card's bracket off, the new one's looked over, both hands on it.
        return { ...both(add(onShelf, 0, 0.02, 0.05), 0.12, 0.02 + 0.012 * Math.sin(c.t * 4), 0, 0.6), nod: 0.32, lean: 0.14, crouch: 0.1, n, props };
      case 'set':
      case 'lift':
        return { ...both(card ?? carried, 0.13, 0.02, 0.06, 0.7), nod: 0.3, lean: 0.12, crouch: 0.08, n, props };
      default:
        return { ...both(card ?? carried, 0.13, 0.02, 0.06, 0.7), nod: 0.12, lean: 0.05, n, props };
    }
  },
};

// =============================================================================================
// 시연 화면 (arDemoScreen, 3 × 1): a big screen, a lectern with a keyboard at the right, two colleagues watching.

export const DM = {
  screen: [-0.2, 1.46, -0.3] as V,
  w: 2.3,
  h: 1.22,
  lectern: [1.2, 1.02, 0.14] as V,
  button: [1.42, 1.04, 0.2] as V,
  stand: 0.62,
  beside: [1.12, 0.56] as const,
};
/** The invented assistant's questions: the wrong answer first shown, and what it should have said. */
export const QA: ReadonlyArray<{ q: string; a: string; wrong: boolean; fixed: string }> = [
  { q: '일주일은 며칠이야?', a: '일주일은 7일이에요.', wrong: false, fixed: '일주일은 7일이에요.' },
  { q: '펭귄은 날 수 있어?', a: '네! 남쪽으로 날아가요.', wrong: true, fixed: '아니요, 헤엄을 잘 쳐요.' },
  { q: '물은 몇 도에서 끓어?', a: '보통 100도에서 끓어요.', wrong: false, fixed: '보통 100도에서 끓어요.' },
  { q: '고양이는 무슨 동물이야?', a: '고양이는 채소예요.', wrong: true, fixed: '고양이는 포유류예요.' },
];
const qaOf = (round: number) => QA[wrap(round, QA.length)];
const clickerAt = (c: Ctx, up = 1.06): V => c.bd(-0.22, up + 0.015 * Math.sin(c.t * 1.6), 0.28);
const clickerRest: V = add(DM.lectern, 0.14, 0.03, 0.06);
const DEMO: Script = {
  seq: [['open', 2.2], ['q', 2.4], ['a', 3.2], ['react', 2.8], ['next', 1.0]],
  at: (k) => (k === 'q' || k === 'a' ? st(DM.beside[0], DM.beside[1], -2.05) : st(DM.beside[0], DM.beside[1], -0.35)),
  key(k, u, c) {
    const qa = qaOf(c.round);
    const n = { q: c.p('q', 0.1, 0.9), a: c.p('a', 0.05, 0.9), react: c.p('react', 0, 0.2) * (1 - c.p('next', 0, 0.6)), wrongNow: qa.wrong && k === 'react' ? 1 : 0, laugh: qa.wrong && k === 'react' ? 1 : 0, clap: !qa.wrong && k === 'react' ? 1 : 0 };
    const props = { clicker: clickerAt(c) };
    switch (k) {
      case 'open':
        return { l: c.bd(0.3, 0.74 * c.H, 0.26), gl: 0.12, palms: 0.5, nod: 0, tool: 'clicker', n, props };
      case 'q':
        return { l: offHand(c), tap: u < 0.2, nod: -0.06, tool: 'clicker', n, props };
      case 'a':
        return { l: c.bd(0.34, 0.8 * c.H, 0.3), gl: 0.15, palms: 0.2, nod: -0.08, tool: 'clicker', n, props };
      case 'react':
        // Wrong: a hand to the back of the head and a laugh. Right: an open hand to the room.
        return qa.wrong ? { l: c.bd(0.1, 0.94 * c.H, -0.06), gl: 0.3, palms: 0.8, nod: 0.08 + 0.05 * Math.sin(c.t * 7), tool: 'clicker', n, props } : { l: c.bd(0.36, 0.78 * c.H, 0.26), gl: 0.1, palms: 0.5, nod: 0.02, tool: 'clicker', n, props };
      default:
        return { l: offHand(c), nod: 0.08, tool: 'clicker', n, props };
    }
  },
};
const ASK: Script = {
  seq: [['type', 2.6], ['send', 0.8], ['read', 2.6], ['log', 2.6], ['think', 1.4]],
  at: () => st(DM.lectern[0], DM.stand),
  key(k, u, c) {
    const qa = qaOf(c.round);
    const n = { console: 1, q: c.p('type', 0, 0.95), a: c.p('send', 0.5, 1) * 0.1 + c.p('read', 0, 0.8) * 0.9, wrongNow: qa.wrong && (k === 'log' || k === 'think') ? 1 : 0, logged: (qa.wrong ? c.p('log', 0.2, 0.8) : 0) };
    const props = { clicker: clickerRest };
    switch (k) {
      case 'type':
      case 'log':
        return { ...typing(DM.lectern, c.t), nod: 0.26, lean: 0.08, n, props };
      case 'send':
        return { ...typing(DM.lectern, 0), r: add(DM.lectern, 0.15, 0.03, 0), tap: u > 0.2 && u < 0.5, nod: 0.26, n, props };
      case 'read':
        return { ...easy(c), r: add(DM.lectern, 0.15, 0.03, 0), gr: 0.25, nod: -0.06, n, props };
      default:
        return { ...easy(c), l: c.bd(0.06, 0.82 * c.H, 0.14), gl: 0.55, palms: 0.8, nod: -0.04, n, props };
    }
  },
};
const FIX: Script = {
  seq: [['log', 3.0], ['type', 3.4], ['retest', 2.6], ['good', 2.2], ['note', 1.4]],
  at: () => st(DM.lectern[0], DM.stand),
  key(k, u, c) {
    const n = { console: 1, fixMode: 1, logs: 0.4 + 0.6 * c.p('log', 0, 1), fixed: c.p('type', 0.1, 0.9), q: c.p('retest', 0, 0.3), a: c.p('retest', 0.3, 0.95), good: c.p('good', 0, 0.2), rate: c.p('type', 0.5, 1) * 0.3 + c.p('good', 0, 1) * 0.7 };
    const props = { clicker: clickerRest };
    switch (k) {
      case 'log':
        return { ...easy(c), r: add(DM.lectern, 0.15, 0.03, 0), gr: 0.25, nod: -0.06, n, props };
      case 'type':
      case 'retest':
        return { ...typing(DM.lectern, c.t), nod: 0.26, lean: 0.08, n, props };
      case 'good':
        return { ...easy(c), nod: 0.1 * Math.sin(u * PI * 2), n, props };
      default:
        return { ...typing(DM.lectern, 0), tap: u < 0.3, nod: 0.26, n, props };
    }
  },
};
const ALARM: Script = {
  seq: [['see', 1.4], ['rush', 0.3, 0.9], ['read', 2.6], ['stop', 1.6], ['type', 3.0], ['retest', 2.6], ['ok', 2.4]],
  at: (k) => (k === 'see' ? st(0.2, DM.stand + 0.2) : st(DM.lectern[0], DM.stand)),
  key(k, u, c) {
    const n = { crash: 1, beacon: k === 'ok' || k === 'retest' ? 0 : 1, reports: k === 'see' ? 0.2 + 0.3 * u : k === 'rush' ? 0.5 : k === 'read' ? 0.5 + 0.5 * u : 1, stopped: c.p('stop', 0.25, 0.4), fixed: c.p('type', 0.1, 0.9), q: c.p('retest', 0, 0.3), a: c.p('retest', 0.3, 0.95), calm: c.p('ok', 0, 0.3) };
    const props = { clicker: clickerRest };
    switch (k) {
      case 'see':
        return { ...easy(c), nod: -0.2, lean: 0.03, n, props };
      case 'rush':
        return { ...easy(c), nod: 0, n, props };
      case 'read':
        return { ...typing(DM.lectern, 0), nod: -0.06, lean: 0.06, n, props };
      case 'stop':
        return { r: add(DM.button, 0, 0.03 - 0.02 * sm(u, 0.2, 0.4), 0), gr: 0.25, palms: 0.05, tap: u > 0.2 && u < 0.4, l: offHand(c), nod: 0.24, n, props };
      case 'type':
      case 'retest':
        return { ...typing(DM.lectern, c.t), nod: 0.26, lean: 0.08, n, props };
      default:
        return { ...easy(c), l: c.bd(0.1, 0.72 * c.H, 0.16), palms: 0.9, gl: 0.1, nod: 0.12 * Math.sin(u * PI), n, props };
    }
  },
};

// =============================================================================================
// 평가 결과 벽 (arEvalWall, 3 × 1): a wall of results with a table, bars and a place for today's card; a shelf of cards under it.

export const EW = {
  wall: -0.34,
  stand: 0.42,
  table: -0.76,
  bars: 0.5,
  y: 1.42,
  shelf: [0.5, 0.92, -0.14] as V,
  slot: [1.16, 1.68, -0.3] as V,
  stamp: [1.16, 1.14, -0.3] as V,
};
const clipAt = (c: Ctx): V => c.bd(0.2, 0.68 * c.H, 0.28);
const EVAL: Script = {
  seq: [['read1', 2.2], ['tick1', 1.2], ['walk', 0.2, 1.0], ['read2', 2.2], ['tick2', 1.2], ['take', 1.0], ['walk2', 0.2, 0.7], ['pin', 1.8], ['back', 0.8]],
  at: (k) => (k === 'read1' || k === 'tick1' ? st(EW.table, EW.stand) : k === 'walk2' || k === 'pin' ? st(EW.slot[0] - 0.1, EW.stand) : st(EW.bars - 0.06, EW.stand)),
  key(k, u, c) {
    const clip = clipAt(c);
    const onWall: V = add(EW.slot, 0, 0, 0.02);
    const carried: V = c.bd(-0.2, 1.1, 0.26);
    const card: V | null = k === 'take' ? lerpV(EW.shelf, carried, sm(u, 0.3, 1)) : k === 'walk2' ? carried : k === 'pin' ? lerpV(carried, onWall, sm(u, 0, 0.5)) : k === 'back' ? onWall : k === 'read1' || k === 'tick1' || k === 'walk' || k === 'read2' || k === 'tick2' ? EW.shelf : null;
    const n = { ticks: c.p('tick1', 0.3, 0.6) + c.p('tick2', 0.3, 0.6), row: c.p('read1', 0, 1), pinned: c.p('pin', 0.5, 0.7), bar: c.p('pin', 0.6, 1) };
    const props = { clip, card };
    const tick: V = add(clip, 0.06 + 0.015 * Math.sin(c.t * 14), 0.05, 0.02);
    const base = { tool: 'clip' as const, gl: 0.1, n, props };
    switch (k) {
      case 'read1':
        return { ...base, r: [EW.table + 0.16, EW.y + 0.3 - 0.4 * u, EW.wall + 0.12], gr: 0.15, palms: 0.1, nod: -0.08 };
      case 'read2':
        return { ...base, r: [EW.bars - 0.2 + 0.5 * u, EW.y - 0.1, EW.wall + 0.12], gr: 0.15, palms: 0.1, nod: -0.06 };
      case 'tick1':
      case 'tick2':
        return { ...base, r: tick, gr: 0.75, nod: 0.3 };
      case 'take':
        return { ...base, r: card ? add(card, 0, 0.02, 0.03) : carried, gr: 0.6, nod: 0.2, lean: 0.06 };
      case 'pin':
        return { ...base, r: add(onWall, 0.01, -0.02 - 0.03 * sm(u, 0.5, 0.7), 0.05), gr: 0.5, nod: -0.14 };
      default:
        return { ...base, r: c.bd(-0.2, 0.55 * c.H, 0.1), gr: 0.3, nod: 0.08 };
    }
  },
};
const EVAL_LEAD: Script = {
  seq: [['open', 2.2], ['walk', 0.2, 0.9], ['point', 2.4], ['ask', 2.6, 0.8], ['listen', 2.4], ['walk2', 0.2, 0.9], ['stamp', 1.6], ['close', 1.4, 0.8]],
  at: (k) => (k === 'point' ? st(EW.bars - 0.2, EW.stand) : k === 'walk2' || k === 'stamp' ? st(EW.stamp[0] - 0.1, EW.stand) : st(-0.05, EW.stand + 0.14, 0)),
  key(k, u, c) {
    const n = { says: k === 'listen' ? 1 : 0, nods: k === 'close' ? 1 : 0, chosen: c.p('stamp', 0.4, 0.6), turn: 1, pinned: 1, bar: 1 };
    switch (k) {
      case 'open':
        return { ...talking(c), nod: 0, n };
      case 'point':
        return { r: [EW.bars + 0.1 * Math.sin(c.t * 1.3), EW.y, EW.wall + 0.12], gr: 0.15, palms: 0.1, l: offHand(c), nod: -0.16, n };
      case 'ask':
        return { l: offHand(c), r: c.bd(-0.26, 0.82 * c.H, 0.28), gr: 0.15, palms: 0.5, nod: 0, n };
      case 'listen':
        return { ...easy(c), nod: 0.05, n };
      case 'stamp':
        return { r: add(EW.stamp, 0, 0, 0.05 - 0.03 * sm(u, 0.3, 0.5)), gr: 0.6, l: offHand(c), nod: -0.04, n };
      default:
        return { ...easy(c), nod: 0.16 * Math.sin(u * PI), n };
    }
  },
};

// =============================================================================================
// 논문 읽는 코너 (arReadingNook, 2 × 2): an armchair facing out, a side table with stacks by its left hand, a lamp, a low shelf.

export const RN = {
  seat: [-0.3, 0.44, -0.2] as V,
  table: [0.42, 0.52, -0.2] as V,
  /** Where the paper's held, reading. */
  hold: [-0.3, 0.84, 0.14] as V,
  turnX: 0.09,
};
const READ: Script = {
  seq: [['pick', 1.4], ['read', 4.0], ['turn', 1.2], ['read2', 3.0], ['mark', 3.2], ['think', 2.2], ['put', 1.4]],
  at: () => sat(RN.seat, 0),
  key(k, u, c) {
    const stack: V = add(RN.table, 0, 0.06, 0);
    const hold: V = add(RN.hold, 0.006 * Math.sin(c.t * 1.1), 0.006 * Math.sin(c.t * 0.8), 0);
    const down: V = add(RN.hold, 0, -0.1, -0.02);
    const paper: V = k === 'pick' ? lerpV(stack, hold, sm(u, 0.2, 1)) : k === 'put' ? lerpV(hold, stack, sm(u, 0.1, 0.85)) : k === 'mark' ? down : k === 'think' ? down : hold;
    // The highlighter's tip comes across the page; its grip is over that.
    const hi: V = k === 'mark' ? add(down, -0.07 + 0.13 * frac(u * 2), 0.09, -0.02 + 0.03 * Math.floor(u * 2)) : add(RN.table, -0.12, 0.03, 0.14);
    const n = { page: c.p('turn', 0.2, 0.9), lit: 1, marked: c.p('mark', 0.1, 0.9), seen: k === 'pick' ? sm(u, 0.1, 0.2) : k === 'put' ? 1 - sm(u, 0.8, 0.95) : 1 };
    const props = { paper, hi };
    switch (k) {
      case 'mark':
        return { l: add(paper, 0.09, -0.06, -0.06), gl: 0.5, palms: 0.05, tool: 'highlighter', lean: 0.12, nod: 0.3, n, props };
      case 'think':
        return { l: add(paper, 0.09, -0.06, -0.06), gl: 0.5, r: c.bd(-0.06, 0.58, 0.18), gr: 0.55, palms: 0.8, nod: -0.06, n, props };
      case 'turn':
        return { tool: 'paper', lean: 0.1, nod: 0.26, n, props };
      default:
        return { tool: 'paper', lean: 0.1, nod: 0.26 + 0.03 * Math.sin(c.t * 0.7), n, props };
    }
  },
};

// =============================================================================================
// 포스터 보드 (arPosterBoard, 2 × 1): a felt board on its feet, the talk's poster at the left, a place for a new one at the right.

export const PS = {
  board: -0.2,
  stand: 0.42,
  x: -1.02,
  tray: [-0.84, 0.72, -0.08] as V,
  /** The pointer's tip stands this far along from the grip. */
  reach: 0.44,
  /** The way the pointer points. */
  dir: [0.52, 0.12, -0.84] as V,
  newAt: [0.46, 1.34, -0.17] as V,
};
/** The poster's sections the pointer goes to. */
export const POINTS: ReadonlyArray<readonly [number, number]> = [[-0.68, 1.68], [-0.3, 1.4], [-0.56, 1.02]];
const tipAt = (x: number, y: number): V => [x - PS.dir[0] * PS.reach, y - PS.dir[1] * PS.reach, PS.board + 0.03 - PS.dir[2] * PS.reach];
const pointerOn = (i: number, t: number): V => {
  const P = POINTS[i];
  return add(tipAt(P[0], P[1]), 0.012 * Math.sin(t * 2), 0.01 * Math.sin(t * 2.7), 0);
};
const POSTER: Script = {
  seq: [['greet', 2.0], ['take', 0.8], ['p1', 2.6], ['p2', 2.6], ['p3', 2.6], ['back', 0.8], ['ask', 2.4, 0.7], ['answer', 2.4]],
  at: (k) => (k === 'ask' || k === 'answer' || k === 'greet' ? st(PS.x + 0.02, PS.stand + 0.08, 0.95) : st(PS.x, PS.stand)),
  key(k, u, c) {
    const home = PS.tray;
    const hand: V = c.bd(-0.2, 1.1, 0.25);
    const pointer: V = k === 'p1' ? pointerOn(0, c.t) : k === 'p2' ? pointerOn(1, c.t) : k === 'p3' ? pointerOn(2, c.t) : k === 'take' ? lerpV(home, hand, sm(u, 0.2, 1)) : k === 'back' ? lerpV(hand, home, sm(u, 0, 0.8)) : home;
    const n = { hi: k === 'p1' ? 1 : k === 'p2' ? 2 : k === 'p3' ? 3 : 0, visitor: 1, asks: k === 'ask' ? 1 : 0, nods: k === 'answer' || k === 'p2' ? 1 : 0 };
    const props = { pointer };
    switch (k) {
      case 'greet':
        return { ...talking(c), nod: 0, n, props };
      case 'take':
      case 'p1':
      case 'p2':
      case 'p3':
      case 'back':
        return { l: offHand(c), nod: -0.14, tool: 'pointer', n, props };
      case 'ask':
        return { ...easy(c), nod: 0.04, n, props };
      default:
        return { ...talking(c), nod: 0.05 * Math.sin(c.t * 4), n, props };
    }
  },
};
const PIN: Script = {
  seq: [['unroll', 2.0], ['holdUp', 1.0], ['pinL', 1.6], ['pinR', 1.6], ['smooth', 2.0], ['step', 1.8], ['take', 1.6]],
  at: (k) => (k === 'step' ? st(PS.newAt[0], PS.stand + 0.46) : st(PS.newAt[0], PS.stand - 0.08)),
  key(k, u, c) {
    const N: V = PS.newAt;
    const n = { unroll: k === 'unroll' ? sm(u, 0.1, 0.9) : k === 'take' ? 1 - sm(u, 0.1, 0.8) : 1, up: k === 'unroll' ? 0 : k === 'holdUp' ? sm(u, 0, 0.8) : k === 'take' ? 1 - sm(u, 0.1, 0.8) : 1, pinA: c.p('pinL', 0.5, 0.6) - c.p('take', 0, 0.2), pinB: c.p('pinR', 0.5, 0.6) - c.p('take', 0, 0.2) };
    switch (k) {
      case 'unroll':
        return { ...both(c.bd(0, 1.02, 0.28), 0.1 + 0.26 * sm(u, 0.1, 0.9), 0, 0, 0.7), nod: 0.26, n };
      case 'holdUp':
        return { ...both(add(N, 0, 0.4, 0.08), 0.36, 0, 0, 0.7), nod: -0.14, n };
      case 'pinL':
        return { l: add(N, -0.36, 0.44, 0.05), gl: 0.5, r: add(N, 0.36, 0.44, 0.08), gr: 0.7, nod: -0.14, n };
      case 'pinR':
        return { r: add(N, 0.36, 0.44, 0.05), gr: 0.5, l: add(N, -0.36, 0.44, 0.08), gl: 0.3, nod: -0.14, n };
      case 'smooth':
        return { r: add(N, 0.2 - 0.4 * u, 0.1 - 0.3 * u, 0.06), gr: 0.05, palms: 0.05, l: offHand(c), nod: -0.05, n };
      case 'step':
        return { ...easy(c), nod: -0.08, n };
      default:
        return { ...both(add(N, 0, 0.44 - 0.5 * sm(u, 0.1, 0.8), 0.08), 0.28, 0, 0, 0.6), nod: 0, n };
    }
  },
};

const SCRIPTS: Record<ArMotion, Script> = {
  arTrain: TRAIN,
  arTune: TUNE,
  arLabel: LABEL,
  arAudit: AUDIT,
  arLearn: LEARN,
  arDiscuss: DISCUSS,
  arDesign: DESIGN,
  arGpuCheck: CHECK,
  arGpuSwap: SWAP,
  arDemo: DEMO,
  arAskTest: ASK,
  arFix: FIX,
  arWrongAlarm: ALARM,
  arEval: EVAL,
  arEvalLead: EVAL_LEAD,
  arRead: READ,
  arPoster: POSTER,
  arPin: PIN,
};
