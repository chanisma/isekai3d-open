import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, wave, type Beat, type V } from './busDriverMotion';

/*
 * A shift at the 방송국 스튜디오 (2026-11-01, the workplace pipeline, at the user's request), at the made-up
 * 달빛방송. Each motion is a round of beats: where the dweller is, where the hands go, and what moves. The piece reads
 * the same script by the same clock (tvHost.ts), so the card written is the card on the table and the applause
 * sign goes on the beat the crowd is asked for.
 *
 * - tsLive (토크쇼 세트): the count in, the hello to the crowd, a story to the lens, a question to the sofa, the laugh, the applause, the goodnight.
 * - tsRehearse: the cards read through, tried under the breath, a turn to the sofa, a pen on a card, a look for the lens.
 * - tsAdLib: stood on the rug, a bit tried out with the hands, a walk across, the ear cupped, a line noted.
 * - tsCast: at the host's desk with the guests' photos, moved about with the writer stood opposite.
 * - tsNews, tsFact, tsEditor (뉴스 데스크): the script read to the lens; a figure checked on the tablet and the phone; the running order talked over with an editor.
 * - tsCards, tsFloor (큐카드 책상): a card written in big letters and held up; a floor cue, the card held high, three fingers down to the point.
 * - tsRadio, tsSegment (라디오 부스): a visible radio at its faders; a corner's script tried against the clock.
 * - tsFrame (페데스탈 카메라): the handles, the viewfinder, a pan, the column raised at its ring, a thumb up.
 * - tsCue (플로어 큐보드): a finger down the running order, a tick, a step aside and the count to the set.
 * - tsWarm (방청석): the warm-up before the bench, clapped overhead, the ear cupped, a bow.
 * - tsQuiz, tsBuzz (게임 코너 부저 책상): the question, who buzzed first, O or X; every buzzer tried before the recording.
 * - tsSwitch, tsCheck (부조정실): preview, the T-bar, talkback to the floor; the screens checked against the cue sheet.
 * - tsPunch, tsReading (대본 책상): a highlighter and a laptop; the script read out to the writer.
 * - tsBrief (출연자 대기실): a guest's hand shaken, questions gone through, the sheet shown.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front). Facing the
 * piece the dweller's right hand is on +x; sat behind a desk facing out (+z), their left hand is on +x.
 */
export type TsMotion = 'tsLive' | 'tsRehearse' | 'tsAdLib' | 'tsCast' | 'tsNews' | 'tsFact' | 'tsEditor' | 'tsCards' | 'tsFloor' | 'tsRadio' | 'tsSegment' | 'tsFrame' | 'tsCue' | 'tsWarm' | 'tsQuiz' | 'tsBuzz' | 'tsSwitch' | 'tsCheck' | 'tsPunch' | 'tsReading' | 'tsBrief';
export const TS_MOTIONS = new Set<string>(['tsLive', 'tsRehearse', 'tsAdLib', 'tsCast', 'tsNews', 'tsFact', 'tsEditor', 'tsCards', 'tsFloor', 'tsRadio', 'tsSegment', 'tsFrame', 'tsCue', 'tsWarm', 'tsQuiz', 'tsBuzz', 'tsSwitch', 'tsCheck', 'tsPunch', 'tsReading', 'tsBrief']);

const frac = (x: number) => ((x % 1) + 1) % 1;
export const tsPhase = (p: THREE.Vector3) => frac(p.x * 0.317 + p.z * 0.583);
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
  /** The floor under the feet where it isn't the piece's own (a set's riser). */
  floor?: number;
}
const stand = (x: number, z: number, yaw = PI, y = 0): St => ({ x, y, z, yaw });
const sat = (x: number, y: number, z: number, yaw: number, floor = 0): St => ({ x, y, z, yaw, sit: true, floor });
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
export interface TsNow {
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
export function tsNow(m: TsMotion, t: number, ph: number, H = 1.6): TsNow {
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
export function tsPose(m: TsMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = tsNow(m, t, tsPhase(par.getWorldPosition(new THREE.Vector3())), height);
  const W = (v: V) => par.localToWorld(new THREE.Vector3(v[0], v[1], v[2]));
  const s = N.st;
  const k = N.key;
  const at = W([s.x, s.y, s.z]);
  const dir = new THREE.Vector3(Math.sin(s.yaw), 0, Math.cos(s.yaw)).transformDirection(par.matrixWorld);
  const yaw = Math.atan2(dir.x, dir.z);
  const pose: BodyPose = s.sit ? { kind: 'sit', at, yaw, floor: W([s.x, s.floor ?? 0, s.z]).y } : N.walking ? { kind: 'walk', at, yaw } : { kind: 'stand', at, yaw, crouch: k.crouch };
  return {
    pose,
    doing: {
      reach: { l: k.l && W(k.l), r: k.r && W(k.r), lean: k.lean ?? 0.05, nod: k.nod ?? 0.1, palms: k.palms ?? 0.4, grip: { l: k.gl ?? 0.3, r: k.gr ?? 0.3 }, tap: k.tap },
      crouch: k.crouch ? k.crouch : undefined,
    },
  };
}
// Stood: heights go by the dweller's own. Sat: `up` is from the seat, and a chest is about a third of a metre above it.
const idle = (c: Ctx, side: number): V => c.bd(side * 0.23, 0.55 * c.H, 0.08);
const satChest = (c: Ctx, side = 0.06, ahead = 0.28): V => c.bd(side, 0.2 * c.H, ahead);
const earOf = (c: Ctx, side: number, up: number): V => c.bd(side * 0.09, up, 0.02);
const overhead = (c: Ctx, side: number, ahead = 0.06): V => c.bd(side, 1.02 * c.H, ahead);
/** A pen's point going along lines on a sheet at `a`. */
const writeOn = (a: V, u: number, lines = 3, w = 0.1): V => {
  const lap = frac(u * lines);
  const row = Math.floor(u * lines);
  return add(a, -w / 2 + w * lap, 0.012, 0.03 - row * 0.022);
};
/** Both hands clapping before the body at `up`, `ahead`. */
function clap(c: Ctx, up: number, ahead: number, hz = 2.6): { l: V; r: V } {
  const apart = 0.018 + 0.05 * Math.abs(Math.sin(c.t * hz * PI));
  return { l: c.bd(apart, up, ahead), r: c.bd(-apart, up, ahead) };
}
/** How high a sat person's head top is above the seat (the mic before the mouth, headphones). */
export const SAT_HEAD = 0.52;

// =============================================================================================
// 토크쇼 세트 (talkShowSet, 3 × 2, kept from furnitureSet.ts): at the host's chair, turned a little to the sofa on
// their right. The set stands on a riser 0.1 high: seats and feet count that in.

export const TK = {
  floor: 0.1,
  top: 0.86,
  seat: [0.811, 0.585, -0.371] as V,
  yaw: -0.3,
  cards: [0.97, 0.895, -0.05] as V,
  work: [0.78, 0.875, -0.06] as V,
  writer: [0.86, 0.68] as [number, number],
  photos: [[0.56, 0.87, -0.04], [0.76, 0.87, 0.04], [0.98, 0.87, 0.14]] as V[],
};
const TK_AT = sat(TK.seat[0], TK.seat[1], TK.seat[2], TK.yaw, TK.floor);
const LIVE: Script = {
  seq: [['stby', 2.2], ['hello', 2.6], ['story', 4.4], ['ask', 3.2], ['listen', 3.2], ['laugh', 2.0], ['card', 1.8], ['applause', 2.8], ['night', 2.2]],
  at: () => TK_AT,
  key(k, u, c) {
    const cards = TK.cards;
    const rest = add(TK.work, -0.1, 0, 0);
    const held = add(cards, -0.02, 0.01, -0.02);
    const n: Record<string, number> = {
      air: k === 'stby' ? 0 : 1,
      count: k === 'stby' ? 3 - Math.floor(u * 3) : 0,
      clap: k === 'hello' || k === 'applause' || k === 'laugh' ? 1 : 0,
      cam: k === 'story' || k === 'card' ? 1 : k === 'ask' || k === 'listen' ? 2 : 0,
    };
    switch (k) {
      case 'stby':
        return { l: held, r: rest, lean: 0.08, nod: 0.2 - 0.2 * u, palms: 0.9, gl: 0.6, n };
      case 'hello':
      case 'night':
        // Both arms up and open to the bench, then a wave.
        return { l: c.bd(0.3, 0.46 * c.H / 1.6 + 0.02 * wave(c.t, 1.6), 0.26), r: c.bd(-0.3 - 0.05 * wave(c.t, 1.6), 0.46 * c.H / 1.6, 0.26), lean: 0.02, nod: -0.05, palms: -0.8, n };
      case 'story':
        // To the lens, the right hand making the point, a look down at the cards now and then.
        return { l: held, r: add(satChest(c, -0.18, 0.34), 0.05 * wave(c.t, 0.8), 0.05 * wave(c.t, 1.3), 0), lean: 0.03, nod: frac(c.t / 4) < 0.2 ? 0.26 : -0.03, palms: 0.1, gl: 0.6, n };
      case 'ask':
        return { l: held, r: add(c.bd(-0.42, 0.3 * c.H / 1.6, 0.36), 0, 0.02 * wave(c.t, 0.6), 0), lean: 0.04, nod: 0.04, palms: -0.9, gl: 0.6, n };
      case 'listen':
        // Leant in, the chin on the hand.
        return { l: held, r: add(TK.work, -0.13, 0.03, 0), lean: 0.17 + 0.03 * wave(c.t, 0.5), nod: 0.07 + 0.05 * Math.abs(wave(c.t, 0.5)), palms: 1.2, gl: 0.6, n };
      case 'laugh':
        return { ...clap(c, 0.3 * c.H / 1.6, 0.34, 3), lean: -0.09 + 0.04 * Math.abs(wave(c.t, 2.2)), nod: -0.12, palms: 0.5, n };
      case 'card':
        return { l: add(cards, -0.06, 0.08, 0.02), r: add(cards, -0.17, 0.06, 0.02), lean: 0.12, nod: 0.34, palms: 0.9, gl: 0.6, gr: 0.6, n };
      default:
        return { ...clap(c, 0.28 * c.H / 1.6, 0.36), lean: 0.03, nod: -0.04, palms: 0.5, n };
    }
  },
};
const REHEARSE: Script = {
  seq: [['read', 3.2], ['mouth', 3.2], ['sofa', 2.6], ['mark', 2.8], ['lens', 2.6], ['page', 1.4]],
  at: () => TK_AT,
  key(k, u, c) {
    const cards = TK.cards;
    const up = c.bd(0.1, 0.24 * c.H / 1.6, 0.3);
    const n: Record<string, number> = { rehearse: 1, cam: k === 'lens' ? 1 : k === 'sofa' ? 2 : 0 };
    const props: Record<string, V | null> = { cardHeld: k === 'read' || k === 'mouth' ? add(up, -0.03, 0.03, 0.03) : null, pen: k === 'mark' ? add(TK.work, 0, 0.02, 0) : null };
    switch (k) {
      case 'read':
        return { l: up, r: add(up, -0.1, 0, 0), lean: 0.08, nod: 0.26, gl: 0.7, gr: 0.7, palms: 0.5, props, n };
      case 'mouth':
        return { l: up, r: add(up, -0.1, 0, 0), lean: 0.02, nod: 0.1 + 0.05 * wave(c.t, 0.7), gl: 0.7, gr: 0.7, palms: 0.5, props, n };
      case 'sofa':
        return { l: add(cards, -0.04, 0.01, -0.02), r: c.bd(-0.42, 0.3 * c.H / 1.6, 0.36), lean: 0.03, nod: 0.03, palms: -0.8, props, n };
      case 'mark':
        return { l: add(TK.work, 0.16, 0, 0), r: writeOn(TK.work, u, 3, 0.1), lean: 0.2, nod: 0.42, gr: 0.85, palms: 0.1, props, n };
      case 'lens':
        return { l: add(cards, -0.04, 0.01, -0.02), r: add(satChest(c, -0.14, 0.36), 0, 0.03 * wave(c.t, 1.2), 0), lean: 0.02, nod: -0.05, palms: 0.1, props, n };
      default:
        return { l: add(cards, -0.02, 0.02, 0), r: add(cards, -0.07, 0.05 * Math.sin(u * PI), 0), lean: 0.12, nod: 0.32, palms: 0.9, props, n };
    }
  },
};
const ADLIB: Script = {
  seq: [['think', 2.2], ['bit', 3.4], ['walk', 0.6, 1.0], ['ear', 2.6], ['shrug', 2.0], ['back', 0.6, 1.0], ['note', 2.8]],
  at: (k) => (k === 'walk' || k === 'ear' || k === 'shrug' ? stand(0.32, 0.72, 0.15, TK.floor) : stand(-0.1, 0.62, -0.1, TK.floor)),
  key(k, u, c) {
    const n: Record<string, number> = { rehearse: 1, laugh: k === 'shrug' ? 1 : 0, cam: 0 };
    const cardAt = c.bd(0.12, 0.66 * c.H, 0.28);
    const props: Record<string, V | null> = { cardHeld: k === 'note' || k === 'think' ? add(cardAt, -0.03, 0.03, 0.02) : null };
    switch (k) {
      case 'think':
        return { l: cardAt, r: c.bd(-0.1, 0.76 * c.H, 0.14), lean: 0.03, nod: 0.26, gl: 0.7, palms: 0.5, props, n };
      case 'bit':
        // Telling it with both hands.
        return { l: add(c.bd(0.28, 0.66 * c.H, 0.28), 0, 0.07 * wave(c.t, 1.1), 0), r: add(c.bd(-0.28, 0.66 * c.H, 0.28), 0, -0.07 * wave(c.t, 1.1), 0), lean: 0.04, nod: -0.03, palms: -0.5, n };
      case 'ear':
        // The hand cupped at the ear to a crowd that isn't there yet.
        return { l: c.bd(0.14, 0.93 * c.H, 0.06), r: idle(c, -1), lean: -0.03, nod: -0.05, palms: 0.1, n };
      case 'shrug':
        return { l: c.bd(0.34, 0.68 * c.H, 0.16), r: c.bd(-0.34, 0.68 * c.H, 0.16), lean: -0.05 + 0.03 * wave(c.t, 2), nod: -0.1, palms: -0.9, n };
      case 'note':
        return { l: cardAt, r: writeOn(add(cardAt, -0.03, 0.03, 0.02), u, 2, 0.08), lean: 0.08, nod: 0.36, gr: 0.85, palms: 0.5, props, n };
      default:
        return { l: idle(c, 1), r: idle(c, -1), lean: 0.03, nod: 0.02, palms: 0.4, n };
    }
  },
};
const CAST: Script = {
  seq: [['look', 3.2], ['slide', 2.6], ['talk', 3.6], ['swap', 2.6], ['nod', 2.4]],
  at: () => TK_AT,
  key(k, _u, c) {
    const [a, b, d] = TK.photos;
    const swapped = c.p('swap', 0.15, 0.85);
    const slide = c.p('slide', 0.15, 0.85);
    const p0 = lerpV(a, add(a, 0.08, 0, 0.1), slide);
    const props: Record<string, V | null> = { p0: lerpV(p0, d, swapped), p1: b, p2: lerpV(d, p0, swapped) };
    const n: Record<string, number> = { meet: 1, talking: k === 'talk' ? 0 : 1 };
    const near = add(TK.work, -0.14, 0, 0);
    switch (k) {
      case 'look':
        return { l: add(b, 0.08, 0.02, -0.04), r: near, lean: 0.2, nod: 0.4, palms: 1, n, props };
      case 'slide':
        return { l: add(b, 0.08, 0.02, -0.04), r: add(lerpV(a, add(a, 0.08, 0, 0.1), slide), 0, 0.02, 0), lean: 0.22, nod: 0.42, palms: 0.9, gr: 0.7, n, props };
      case 'talk':
        return { l: add(satChest(c, 0.1, 0.34), 0.03 * wave(c.t, 0.8), 0.02 * wave(c.t, 1.3), 0), r: near, lean: 0.03, nod: -0.02, palms: 0.1, n, props };
      case 'swap': {
        const e = swapped;
        return { l: add(lerpV(d, p0, e), 0, 0.02, 0), r: add(lerpV(p0, d, e), 0, 0.02, 0), lean: 0.2, nod: 0.4, palms: 0.9, gl: 0.7, gr: 0.7, n, props };
      }
      default:
        return { l: add(b, 0.08, 0.02, -0.04), r: near, lean: 0.05 + 0.08 * Math.abs(wave(c.t, 0.8)), nod: 0.05 + 0.08 * Math.abs(wave(c.t, 0.8)), palms: 1, n, props };
    }
  },
};

// =============================================================================================
// 뉴스 데스크 (newsDesk, 2 × 1): behind it (-z), facing out over the top to the lens.

export const ND = {
  top: 0.76,
  seat: [0, 0.5, -0.38] as V,
  paper: [0.02, 0.775, 0.06] as V,
  aside: [0.36, 0.775, 0.1] as V,
  tablet: [-0.42, 0.79, 0.08] as V,
  phone: [0.62, 0.8, 0.12] as V,
  editor: [-1.0, 0.1] as [number, number],
};
const ND_AT = sat(ND.seat[0], ND.seat[1], ND.seat[2], 0);
const onNews = (x: number, z = 0.02): V => [x, ND.top + 0.035, z];
const NEWS: Script = {
  seq: [['read', 4.4], ['page', 1.4], ['word', 3.2], ['lens', 3.6], ['tap', 1.8]],
  at: () => ND_AT,
  key(k, u, c) {
    const off = c.p('page', 0.2, 0.8);
    const props: Record<string, V | null> = { sheet: lerpV(ND.paper, ND.aside, off) };
    const n: Record<string, number> = { story: k === 'read' || k === 'page' ? 0 : 1, lit: 1, cam: 3 };
    const rest = (side: number): V => onNews(side * 0.17);
    switch (k) {
      case 'read':
        return { l: rest(1), r: rest(-1), lean: 0.08, nod: frac(c.t / 2.8) < 0.65 ? 0.32 : 0.02, palms: 0.1, props, n };
      case 'page':
        return { r: rest(-1), l: add(lerpV(ND.paper, ND.aside, off), 0.04, 0.02, -0.03), lean: 0.09, nod: 0.36, gl: 0.75, palms: 0.05, props, n };
      case 'word':
        // A finger under the hard word, said over twice.
        return { l: rest(1), r: add(ND.paper, -0.06 + 0.1 * frac(u * 2), 0.012, -0.03), lean: 0.14, nod: 0.38 + 0.03 * wave(c.t, 2), palms: 0.1, gr: 0.5, props, n };
      case 'lens':
        return { l: rest(1), r: add(c.bd(-0.2, 0.26 * c.H / 1.6 + 0.02 * wave(c.t, 0.7), 0.3), 0, 0, 0), lean: 0.03, nod: -0.02, palms: 0.5, props, n };
      default: {
        const tapped = 0.03 * Math.abs(Math.sin(u * PI * 3));
        return { l: add(ND.paper, 0.1, 0.05 + tapped, -0.03), r: add(ND.paper, -0.1, 0.05 + tapped, -0.03), lean: 0.06, nod: 0.26, gl: 0.8, gr: 0.8, palms: 0.05, props: { sheet: add(ND.paper, 0, tapped, 0) }, n };
      }
    }
  },
};
const FACT: Script = {
  seq: [['scan', 3.2], ['tablet', 3.4], ['flag', 1.6], ['call', 4.0], ['fix', 2.4], ['tick', 1.4]],
  at: () => ND_AT,
  key(k, u, c) {
    const rest = onNews(0.17);
    const n: Record<string, number> = { lit: 1, flag: k === 'flag' || k === 'call' ? 1 : 0, fixed: c.p('fix', 0.5, 0.8), scroll: k === 'tablet' ? u : 0 };
    const pen = add(ND.paper, -0.04, 0.012, 0);
    const props: Record<string, V | null> = { phone: k === 'call' ? earOf(c, 1, 0.66 * c.H / 1.6) : ND.phone, pen: k === 'scan' || k === 'fix' || k === 'tick' || k === 'flag' ? pen : null };
    switch (k) {
      case 'scan':
        return { l: rest, r: add(pen, 0.08 * Math.sin(u * PI * 5), 0, 0.06 - 0.14 * u), lean: 0.15, nod: 0.4, gr: 0.85, palms: 0.05, props, n };
      case 'tablet':
        // Sat behind the desk the tablet lies on their right, swiped with a finger.
        return { l: rest, r: add(ND.tablet, 0.1 * Math.sin(u * PI * 4), 0.02, 0), lean: 0.18, nod: 0.4, palms: 0.05, gr: 0.4, props, n };
      case 'flag':
        return { l: rest, r: add(pen, 0.05, 0.005, -0.02), lean: 0.18, nod: 0.44, gr: 0.85, palms: 0.05, props, n };
      case 'call':
        return { l: earOf(c, 1, 0.66 * c.H / 1.6), r: add(pen, 0.05, 0.05, -0.02), lean: 0.05, nod: 0.08 + 0.04 * wave(c.t, 0.6), gl: 0.8, gr: 0.7, palms: 0.5, props, n };
      case 'fix':
        return { l: rest, r: writeOn(pen, u, 1, 0.1), lean: 0.2, nod: 0.44, gr: 0.85, palms: 0.05, props, n };
      default:
        return { l: rest, r: add(pen, 0.03, 0.03 * Math.abs(Math.sin(u * PI * 2)), 0.02), lean: 0.1, nod: 0.2, gr: 0.85, palms: 0.05, props, n };
    }
  },
};
const EDITOR: Script = {
  seq: [['read', 2.8], ['point', 3.0], ['listen', 3.2], ['strike', 2.2], ['nod', 2.2]],
  at: () => ND_AT,
  key(k, u, c) {
    const rest = onNews(0.17);
    const pen = add(ND.paper, -0.03, 0.012, 0);
    const n: Record<string, number> = { lit: 1, editor: 1, talking: k === 'listen' ? 1 : 0, struck: c.p('strike', 0.4, 0.9) };
    const props: Record<string, V | null> = { pen: k === 'strike' ? pen : null };
    switch (k) {
      case 'read':
        return { l: rest, r: add(pen, 0, 0, 0.05 - 0.1 * u), lean: 0.16, nod: 0.4, palms: 0.05, gr: 0.5, props, n };
      case 'point':
        // A hand to the editor stood at their right, the head after it.
        return { l: rest, r: add(ND.paper, -0.14, 0.05 + 0.02 * wave(c.t, 0.9), 0.04), lean: 0.05, nod: 0.05, palms: -0.5, props, n };
      case 'listen':
        return { l: rest, r: add(ND.paper, -0.14, 0.02, 0), lean: -0.02, nod: 0.05 + 0.05 * Math.abs(wave(c.t, 0.5)), palms: 0.3, props, n };
      case 'strike':
        return { l: rest, r: add(pen, -0.05 + 0.1 * sm(u, 0.2, 0.8), 0, 0), lean: 0.18, nod: 0.42, gr: 0.85, palms: 0.05, props, n };
      default:
        return { l: rest, r: add(ND.paper, -0.14, 0.02, 0), lean: 0.05 + 0.07 * Math.abs(wave(c.t, 0.8)), nod: 0.05 + 0.08 * Math.abs(wave(c.t, 0.8)), palms: 0.3, props, n };
    }
  },
};

// =============================================================================================
// 큐카드 책상 (cueCardTable, 1 × 1): stood at it.

export const CC = {
  top: 0.76,
  blank: [0.26, 0.79, 0.06] as V,
  work: [0, 0.79, 0.14] as V,
  done: [-0.26, 0.8, 0.06] as V,
  marker: [0.3, 0.79, 0.28] as V,
};
const CARDS: Script = {
  seq: [['take', 1.6], ['write', 4.4], ['check', 2.4], ['stack', 1.6]],
  at: () => stand(0, 0.62),
  key(k, u, c) {
    const taken = c.p('take', 0.4, 0.9);
    const shelved = c.p('stack', 0.3, 0.9);
    const upAt = c.bd(0, 0.68 * c.H, 0.3);
    const card = k === 'check' ? upAt : lerpV(lerpV(CC.blank, CC.work, taken), CC.done, shelved);
    const props: Record<string, V | null> = { card, marker: k === 'write' ? writeOn(CC.work, u, 3, 0.2) : null };
    const n: Record<string, number> = { lines: k === 'take' ? 0 : k === 'write' ? Math.ceil(u * 3) : 3, up: k === 'check' ? 1 : 0, piled: 0 };
    switch (k) {
      case 'take':
        return { r: add(card, 0, 0.02, 0), l: idle(c, 1), lean: 0.22, nod: 0.42, gr: 0.6, palms: 0.1, props, n };
      case 'write':
        // Big letters: the arm goes right across.
        return { l: add(CC.work, -0.26, 0.012, 0), r: writeOn(CC.work, u, 3, 0.2), lean: 0.28, nod: 0.5, gr: 0.85, palms: 0.1, props, n };
      case 'check':
        return { l: add(upAt, -0.15, 0, 0), r: add(upAt, 0.15, 0, 0), lean: -0.02, nod: 0.04, gl: 0.7, gr: 0.7, palms: 0.6, props, n };
      default:
        return { l: add(card, 0, 0.02, 0), r: idle(c, -1), lean: 0.2, nod: 0.4, gl: 0.6, palms: 0.1, props, n };
    }
  },
};
const FLOOR: Script = {
  seq: [['read', 2.2], ['up', 3.4], ['count', 3.0], ['point', 1.8], ['roll', 2.8], ['down', 1.4]],
  at: () => stand(0.02, 0.66, 0),
  key(k, u, c) {
    const atHand = c.bd(0.05, 0.68 * c.H, 0.28);
    const highCard = c.bd(0, 0.95 * c.H, 0.3);
    const held = k === 'up' ? highCard : k === 'read' || k === 'down' ? atHand : null;
    const props: Record<string, V | null> = { held };
    const n: Record<string, number> = { phones: 1, count: k === 'count' ? 3 - Math.floor(u * 3) : 0, air: k === 'point' ? 1 : 0 };
    switch (k) {
      case 'read':
      case 'down':
        return { l: add(atHand, 0.1, 0, 0), r: add(atHand, -0.1, 0, 0), lean: 0.05, nod: 0.3, gl: 0.7, gr: 0.7, palms: 0.5, props, n };
      case 'up':
        // High, both hands, over the camera so the set can read it.
        return { l: add(highCard, 0.16, 0, 0), r: add(highCard, -0.16, 0, 0), lean: -0.03, nod: -0.1, gl: 0.75, gr: 0.75, palms: 0.5, props, n };
      case 'count':
        return { l: earOf(c, 1, 0.93 * c.H), r: add(overhead(c, -0.2, 0.2), 0, -0.05 * Math.abs(Math.sin(u * PI * 3)), 0), lean: 0.02, nod: -0.04, palms: -0.1, gr: 0.25, props, n };
      case 'point':
        return { l: earOf(c, 1, 0.93 * c.H), r: c.bd(-0.1, 0.8 * c.H, 0.5), lean: 0.1, nod: -0.02, palms: 0, gr: 0.35, props, n };
      default:
        // The "keep going" roll of the hand.
        return { l: earOf(c, 1, 0.93 * c.H), r: add(c.bd(-0.2, 0.75 * c.H, 0.34), 0.06 * Math.cos(c.t * 7), 0.06 * Math.sin(c.t * 7), 0), lean: 0.04, nod: -0.02, palms: 0.1, props, n };
    }
  },
};

// =============================================================================================
// 라디오 부스 (radioBooth, 2 × 1): inside behind the console, facing out through the glass and its little camera.

export const RD = {
  top: 0.76,
  seat: [-0.05, 0.5, -0.24] as V,
  fader: [-0.34, 0.8, 0.14] as V,
  letter: [0.02, 0.775, 0.12] as V,
  pad: [0.34, 0.78, 0.12] as V,
};
const RD_AT = sat(RD.seat[0], RD.seat[1], RD.seat[2], 0);
const RADIO: Script = {
  seq: [['cue', 1.5], ['open', 3.6], ['faderDn', 1.2], ['song', 4.2], ['faderUp', 1.2], ['letter', 3.8], ['wave', 2.0], ['close', 1.8]],
  at: () => RD_AT,
  key(k, u, c) {
    const talking = k === 'open' || k === 'letter' || k === 'close' || k === 'wave';
    const fader = k === 'cue' ? sm(u, 0.6, 1) : k === 'faderDn' ? 1 - sm(u, 0.1, 0.8) : k === 'song' ? 0 : k === 'faderUp' ? sm(u, 0.1, 0.8) : 1;
    const n: Record<string, number> = { air: k === 'cue' ? sm(u, 0.7, 0.9) : k === 'song' ? 0.35 : 1, fader, talking: talking ? 1 : 0, song: k === 'song' || k === 'faderDn' || k === 'faderUp' ? 1 : 0 };
    const props: Record<string, V | null> = { letter: k === 'letter' ? add(RD.letter, 0, 0.1, -0.02) : RD.letter };
    const rFader = add(RD.fader, 0, 0.03, -0.08 + 0.1 * fader);
    const rest: V = [0.22, RD.top + 0.03, 0.02];
    switch (k) {
      case 'cue':
        return { l: rest, r: rFader, lean: 0.05, nod: 0.15 - 0.15 * u, gr: 0.6, palms: 0.05, props, n };
      case 'open':
        return { l: add(rest, 0.02, 0.06 * Math.abs(wave(c.t, 0.5)), 0.08), r: rFader, lean: 0.05, nod: 0.03 + 0.03 * wave(c.t, 0.9), palms: 0.5, gl: 0.1, gr: 0.6, props, n };
      case 'faderDn':
      case 'faderUp':
        return { l: rest, r: rFader, lean: 0.09, nod: 0.3, gr: 0.6, palms: 0.05, props, n };
      case 'song':
        return { l: add(rest, 0, 0.022 * Math.abs(wave(c.t, 1.1)), 0), r: rFader, lean: -0.04, nod: 0.03 + 0.05 * Math.abs(wave(c.t, 1.1)), palms: 0.05, gr: 0.5, props, n };
      case 'letter':
        return { l: add(RD.letter, 0.09, 0.08, -0.03), r: add(RD.letter, -0.09, 0.08, -0.03), lean: 0.07, nod: 0.22 + 0.03 * wave(c.t, 0.7), gl: 0.75, gr: 0.75, palms: 0.05, props, n };
      case 'wave':
        // A wave to the little camera: it's a visible radio.
        return { l: add(c.bd(0.22, 0.38 * c.H / 1.6, 0.26), 0.05 * wave(c.t, 1.8), 0, 0), r: rFader, lean: 0.03, nod: -0.05, palms: -0.9, gr: 0.6, props, n };
      default:
        return { l: rest, r: rFader, lean: 0.05 + 0.08 * Math.sin(u * PI), nod: 0.03, gr: 0.6, palms: 0.05, props, n };
    }
  },
};
const SEGMENT: Script = {
  seq: [['read', 3.0], ['clock', 1.6], ['try', 3.6], ['cut', 2.8], ['again', 3.0]],
  at: () => RD_AT,
  key(k, u, c) {
    const rest: V = [-0.2, RD.top + 0.03, 0.04];
    const sheet = RD.pad;
    const n: Record<string, number> = { air: 0, talking: k === 'try' || k === 'again' ? 1 : 0, fader: 0, lines: 4 - c.p('cut', 0.3, 0.9) };
    const props: Record<string, V | null> = { pen: k === 'cut' ? add(sheet, 0, 0.012, 0) : null };
    switch (k) {
      case 'read':
        return { l: add(sheet, 0.05, 0.012, 0.04 - 0.1 * u), r: rest, lean: 0.14, nod: 0.38, palms: 0.05, gl: 0.5, props, n };
      case 'clock':
        // A look at the wrist, the stopwatch started.
        return { l: add(c.bd(0.1, 0.27 * c.H / 1.6, 0.26), 0, 0, 0), r: add(c.bd(0.05, 0.3 * c.H / 1.6, 0.26), 0, 0, 0), lean: 0.05, nod: 0.3, palms: 0.5, props, n };
      case 'cut':
        return { l: add(sheet, -0.05 + 0.1 * sm(u, 0.2, 0.8), 0.012, 0), r: rest, lean: 0.1, nod: 0.3, palms: 0.05, gl: 0.85, props, n };
      default:
        return { l: add(sheet, 0.05, 0.012, 0), r: add(c.bd(-0.2, 0.3 * c.H / 1.6, 0.3), 0, 0.03 * wave(c.t, 1.1), 0), lean: 0.05, nod: 0.08 + 0.05 * wave(c.t, 0.7), palms: 0.2, props, n };
    }
  },
};

// =============================================================================================
// 페데스탈 카메라 (tsPedestalCam, 1 × 1): the lens to the back (-z, the set), the operator at the handles (+z).

export const PC = {
  head: 0.98,
  grip: [0.3, 1.04, 0.26] as V,
  ring: [0, 0.74, 0.13] as V,
  focus: [0.14, 1.18, 0.05] as V,
};
const FRAME: Script = {
  seq: [['grip', 2.2], ['pan', 4.2], ['finder', 2.8], ['ring', 2.6], ['focus', 2.2], ['thumb', 1.6]],
  at: () => stand(0, 0.62),
  key(k, u, c) {
    const gL: V = [-PC.grip[0], PC.grip[1], PC.grip[2]];
    const gR = PC.grip;
    const panN = k === 'pan' ? 0.32 * Math.sin(u * PI * 2) : 0;
    const raise = k === 'ring' ? 0.08 * sm(u, 0.2, 0.8) : c.p('ring') ? 0.08 : 0;
    const n: Record<string, number> = { pan: panN, rise: raise, tilt: k === 'finder' ? 0.04 : 0, on: 1, fix: k === 'focus' ? u : 1 };
    const swing = (p: V): V => [p[0] * Math.cos(panN) + p[2] * Math.sin(panN), p[1] + raise, -p[0] * Math.sin(panN) + p[2] * Math.cos(panN)];
    switch (k) {
      case 'grip':
        return { l: swing(gL), r: swing(gR), lean: 0.1, nod: 0.15, gl: 0.85, gr: 0.85, palms: 0.3, n };
      case 'pan':
        return { l: swing(gL), r: swing(gR), lean: 0.14, nod: 0.12, gl: 0.9, gr: 0.9, palms: 0.3, n };
      case 'finder':
        return { l: swing(gL), r: swing(gR), lean: 0.22, nod: 0.18, gl: 0.85, gr: 0.85, palms: 0.3, n };
      case 'ring': {
        // The steering ring on the column, both hands, the whole head going up with it.
        const y = PC.ring[1] + raise;
        return { l: [-0.11, y, PC.ring[2] + 0.02], r: [0.11, y, PC.ring[2] + 0.02], lean: 0.34, nod: 0.34, gl: 0.9, gr: 0.9, palms: 0.5, n };
      }
      case 'focus':
        return { l: swing(gL), r: add(PC.focus, 0, raise, 0.02 * Math.sin(u * PI * 4)), lean: 0.2, nod: 0.18, gl: 0.85, gr: 0.75, palms: 0.5, n };
      default:
        return { l: swing(gL), r: add(c.bd(-0.26, 0.8 * c.H, 0.14), 0, 0.02 * wave(c.t, 2), 0), lean: 0.03, nod: -0.05, gl: 0.85, gr: 0.9, palms: 0.1, n };
    }
  },
};

// =============================================================================================
// 플로어 큐보드 (tsCueBoard, 1 × 1): read from the front, then a step aside to look past it to the set.

export const CB = {
  rows: [0.05, 1.32, 0.0] as V,
  top: 1.3,
  rowStep: 0.1,
  aside: [-0.66, 0.24] as [number, number],
  asideYaw: PI + 0.5,
};
const CUE: Script = {
  seq: [['read', 3.4], ['tick', 1.8], ['aside', 0.4, 0.9], ['count', 3.2], ['go', 2.0], ['stretch', 2.8], ['back', 0.4, 0.9]],
  at: (k) => (k === 'aside' || k === 'count' || k === 'go' || k === 'stretch' ? stand(CB.aside[0], CB.aside[1], CB.asideYaw) : stand(0.02, 0.56)),
  key(k, u, c) {
    const n: Record<string, number> = { phones: 1, done: 1 + c.p('tick', 0.3, 0.8), count: k === 'count' ? 3 - Math.floor(u * 3) : 0, go: k === 'go' ? 1 : 0, row: k === 'read' ? Math.floor(u * 4) : 2 };
    const ear = earOf(c, 1, 0.93 * c.H);
    switch (k) {
      case 'read':
        return { l: idle(c, 1), r: [CB.rows[0] - 0.14 + 0.1 * Math.sin(u * PI * 3), CB.rows[1] - 0.12 - Math.floor(u * 4) * CB.rowStep, 0.09], lean: 0.08, nod: 0.08, gr: 0.35, palms: 0, n };
      case 'tick':
        return { l: idle(c, 1), r: [CB.rows[0] + 0.3 + 0.03 * Math.sin(u * PI * 2), CB.rows[1] - 0.32, 0.09], lean: 0.08, nod: 0.08, gr: 0.85, palms: 0, n };
      case 'count':
        return { l: ear, r: add(overhead(c, -0.2, 0.2), 0, -0.05 * Math.abs(Math.sin(u * PI * 3)), 0), lean: 0.02, nod: -0.05, palms: -0.1, gr: 0.25, n };
      case 'go':
        return { l: ear, r: c.bd(-0.08, 0.8 * c.H, 0.52), lean: 0.12, nod: -0.02, palms: 0, gr: 0.35, n };
      case 'stretch':
        // Pulled apart in the air: "stretch it out".
        return { l: add(c.bd(0.1 + 0.16 * sm(frac(c.t * 0.7), 0, 0.8), 0.78 * c.H, 0.3), 0, 0, 0), r: c.bd(-0.1 - 0.16 * sm(frac(c.t * 0.7), 0, 0.8), 0.78 * c.H, 0.3), lean: 0.04, nod: -0.02, palms: -0.2, gl: 0.8, gr: 0.8, n };
      default:
        return { l: idle(c, 1), r: idle(c, -1), lean: 0.03, nod: 0.03, palms: 0.4, n };
    }
  },
};

// =============================================================================================
// 방청석 (tsAudienceBench, 4 × 2): out before it, on the tile by the bench's upper end, facing the crowd.

export const AB = {
  at: [0.5, 1.46] as [number, number],
};
const WARM: Script = {
  seq: [['hello', 2.4], ['clap', 3.4], ['ear', 2.4], ['roar', 2.4], ['hush', 2.2], ['bow', 1.6]],
  at: () => stand(AB.at[0], AB.at[1]),
  key(k, u, c) {
    const n: Record<string, number> = { clap: k === 'clap' || k === 'roar' ? 1 : 0, wave: k === 'hello' ? 1 : 0, hush: k === 'hush' ? 1 : 0 };
    switch (k) {
      case 'hello':
        return { l: add(overhead(c, 0.24, 0.14), 0.07 * wave(c.t, 1.5), 0, 0), r: idle(c, -1), lean: 0.02, nod: -0.06, palms: -0.8, n };
      case 'clap':
        return { ...clap(c, 1.02 * c.H, 0.16, 2.2), lean: 0, nod: -0.08, palms: 0.5, n };
      case 'ear':
        return { r: c.bd(-0.14, 0.93 * c.H, 0.06), l: c.bd(0.3, 0.62 * c.H, 0.3), lean: 0.1, nod: 0.02, palms: -0.9, n };
      case 'roar':
        // Both arms lifting them up.
        return { l: add(overhead(c, 0.3, 0.2), 0, -0.1 + 0.1 * Math.abs(wave(c.t, 1.3)), 0), r: add(overhead(c, -0.3, 0.2), 0, -0.1 + 0.1 * Math.abs(wave(c.t, 1.3)), 0), lean: -0.02, nod: -0.1, palms: -1.1, n };
      case 'hush':
        return { l: c.bd(0.26, 0.6 * c.H + 0.06 * Math.cos(u * PI * 4), 0.3), r: c.bd(-0.26, 0.6 * c.H + 0.06 * Math.cos(u * PI * 4), 0.3), lean: 0.08, nod: 0.03, palms: 1.2, n };
      default:
        return { l: idle(c, 1), r: idle(c, -1), lean: 0.32 * Math.sin(u * PI), nod: 0.26 * Math.sin(u * PI), palms: 0.4, n };
    }
  },
};

// =============================================================================================
// 게임 코너 부저 책상 (tsBuzzerDesk, 3 × 1): three podiums with a big round buzzer each. The MC stands out to the
// side, half turned to the contestants so the camera keeps both; the buzzers are tried from the front.

export const BZ = {
  top: 0.98,
  xs: [-0.9, 0, 0.9],
  buzz: 0.16,
  backZ: -0.32,
  mc: [-1.28, 0.86] as [number, number],
  mcYaw: PI * 0.72,
};
const QUIZ: Script = {
  seq: [['card', 2.4], ['ask', 2.6], ['buzz', 1.4], ['answer', 2.6], ['ding', 2.4], ['next', 1.8], ['buzz2', 1.4], ['wrong', 2.8]],
  at: () => stand(BZ.mc[0], BZ.mc[1], BZ.mcYaw),
  key(k, u, c) {
    const cardAt = c.bd(0.1, 0.66 * c.H, 0.28);
    const props: Record<string, V | null> = { card: add(cardAt, -0.03, 0.03, 0.02) };
    const n: Record<string, number> = {
      game: 1,
      lit: k === 'buzz' || k === 'answer' || k === 'ding' ? 2 : k === 'buzz2' || k === 'wrong' ? 3 : 0,
      press2: k === 'buzz' ? Math.sin(u * PI) : 0,
      press3: k === 'buzz2' ? Math.sin(u * PI) : 0,
      ask: k === 'ask' ? 1 : 0,
      score2: c.p('ding', 0.05, 0.1),
      ding: k === 'ding' ? 1 : 0,
      wrong: k === 'wrong' ? 1 : 0,
      clap: k === 'ding' ? 1 : 0,
    };
    switch (k) {
      case 'card':
      case 'next':
        return { l: cardAt, r: add(cardAt, -0.09, 0.05, 0.02), lean: 0.05, nod: 0.3, gl: 0.7, palms: 0.5, props, n };
      case 'ask':
        return { l: cardAt, r: add(c.bd(-0.28, 0.76 * c.H, 0.3), 0, 0.03 * wave(c.t, 1.1), 0), lean: 0.03, nod: -0.02, gl: 0.7, palms: -0.3, props, n };
      case 'buzz':
      case 'buzz2':
        // The hand shot out to whoever buzzed.
        return { l: cardAt, r: c.bd(-0.12, 0.74 * c.H, 0.55), lean: 0.1, nod: -0.02, gl: 0.7, gr: 0.3, palms: 0, props, n };
      case 'answer':
        return { l: cardAt, r: c.bd(-0.1, 0.92 * c.H, 0.08), lean: 0.08, nod: 0.03, gl: 0.7, palms: 0.1, props, n };
      case 'ding':
        return { l: overhead(c, 0.26, 0.14), r: overhead(c, -0.26, 0.14), lean: -0.02, nod: -0.08, palms: -0.8, props: { card: null }, n };
      default:
        // Arms crossed before the chest: X.
        return { l: c.bd(-0.14, 0.76 * c.H, 0.26), r: c.bd(0.14, 0.76 * c.H, 0.28), lean: 0.03, nod: 0.04, gl: 0.8, gr: 0.8, palms: 0.4, props: { card: null }, n };
    }
  },
};
const TRY: Script = {
  seq: [['p1', 1.8], ['to2', 0.3, 0.8], ['p2', 1.8], ['to3', 0.3, 0.8], ['p3', 1.8], ['look', 2.2]],
  at: (k) => {
    const i = k === 'p1' ? 0 : k === 'to2' || k === 'p2' ? 1 : k === 'to3' || k === 'p3' || k === 'look' ? 2 : 0;
    return stand(BZ.xs[i], 0.66);
  },
  key(k, u, c) {
    const press = k === 'p1' || k === 'p2' || k === 'p3' ? (u > 0.2 && u < 0.6 ? 1 : 0) : 0;
    const i = k === 'p1' ? 0 : k === 'p2' ? 1 : k === 'p3' ? 2 : -1;
    const n: Record<string, number> = { test: 1, lit: i >= 0 && press ? i + 1 : 0, press: press, pressed: i, ok: 0 };
    if (i >= 0) {
      const x = BZ.xs[i];
      return { r: [x, BZ.top + 0.05 - press * 0.035, BZ.buzz], l: idle(c, 1), lean: 0.22, nod: 0.36, gr: 0.2, palms: 1.2, n };
    }
    if (k === 'look') return { l: idle(c, 1), r: add(c.bd(-0.26, 0.8 * c.H, 0.14), 0, 0.02 * wave(c.t, 2), 0), lean: 0.02, nod: -0.05, gr: 0.9, palms: 0.1, n: { ...n, ok: 1 } };
    return { l: idle(c, 1), r: idle(c, -1), lean: 0.05, nod: 0.1, n };
  },
};

// =============================================================================================
// 부조정실 콘솔 (tsControlDesk, 4 × 2): the wall of screens at the back, the mixer before it, the director's chair.
// Facing the piece the right hand is on +x: the T-bar's on the right, the rows of buttons before the left.

export const CT = {
  top: 0.76,
  seat: [0, 0.5, 0.74] as V,
  buttons: [-0.3, 0.8, 0.26] as V,
  tbar: [0.22, 0.84, 0.28] as V,
  mic: [-0.46, 0.92, 0.42] as V,
  sheet: [0.56, 0.775, 0.32] as V,
};
const CT_AT = sat(CT.seat[0], CT.seat[1], CT.seat[2], PI);
const SWITCH: Script = {
  seq: [['watch', 2.6], ['pick', 1.4], ['ready', 1.2], ['take', 1.2], ['watch2', 2.2], ['pick2', 1.2], ['take2', 1.2], ['talk', 3.0]],
  at: () => CT_AT,
  key(k, u, c) {
    const b = (i: number): V => add(CT.buttons, -0.2 + i * 0.1, 0.01, 0.02);
    const pulled = k === 'take' ? sm(u, 0.1, 0.8) : k === 'take2' ? 1 - sm(u, 0.1, 0.8) : k === 'watch2' || k === 'pick2' ? 1 : 0;
    const cam = c.p('take', 0.4, 0.5) > 0.5 && c.p('take2', 0.4, 0.5) < 0.5 ? 1 : c.p('take2', 0.4, 0.5) >= 0.5 ? 2 : 0;
    const prev = k === 'pick' || k === 'ready' || k === 'take' ? 1 : k === 'pick2' || k === 'take2' ? 2 : -1;
    const n: Record<string, number> = { tbar: pulled, cam, prev, talkback: k === 'talk' ? 1 : 0, sw: 1 };
    const tb = add(CT.tbar, 0, 0.02, -0.03 + 0.1 * pulled);
    const talkHand = add(CT.mic, 0.02, -0.08, 0);
    switch (k) {
      case 'pick':
      case 'pick2': {
        const i = k === 'pick' ? 1 : 2;
        return { l: add(b(i), 0, 0.03 * (1 - Math.abs(Math.sin(u * PI))), 0), r: tb, lean: 0.15, nod: 0.26, palms: 1, gr: 0.75, tap: true, n };
      }
      case 'ready':
        return { l: b(1), r: tb, lean: 0.08, nod: -0.05, palms: 1, gr: 0.85, n };
      case 'take':
      case 'take2':
        return { l: b(k === 'take' ? 1 : 2), r: tb, lean: 0.1, nod: 0.02, palms: 1, gr: 0.9, n };
      case 'talk':
        return { l: talkHand, r: tb, lean: 0.14, nod: -0.02 + 0.03 * wave(c.t, 0.9), palms: 1, gr: 0.75, n };
      default:
        return { l: b(0), r: tb, lean: 0.04, nod: -0.12, palms: 1, gr: 0.7, n };
    }
  },
};
const CHECK: Script = {
  seq: [['wall', 3.2], ['point', 2.6], ['sheet', 3.0], ['talk', 2.6], ['tick', 1.8]],
  at: () => CT_AT,
  key(k, u, c) {
    const rest = add(CT.buttons, 0.05, 0.01, 0);
    const n: Record<string, number> = { talkback: k === 'talk' ? 1 : 0, watch: 1, row: Math.floor(c.p('tick', 0.4, 0.8)) };
    const sheet = add(CT.sheet, 0, 0.012, 0);
    const pen: V = add(sheet, 0, 0.01, 0);
    const props: Record<string, V | null> = { pen: k === 'sheet' || k === 'tick' ? pen : null };
    switch (k) {
      case 'wall':
        return { l: rest, r: add(CT.tbar, 0, 0.02, 0), lean: -0.04, nod: -0.14, palms: 1, gr: 0.5, props, n };
      case 'point':
        return { l: rest, r: add(c.bd(-0.1, 0.5 * c.H / 1.6, 0.5), 0.02 * wave(c.t, 1.1), 0, 0), lean: 0.06, nod: -0.12, palms: 0, gr: 0.35, props, n };
      case 'sheet':
        return { l: rest, r: add(sheet, 0.08 * Math.sin(u * PI * 3), 0.012, 0.05 - 0.1 * u), lean: 0.15, nod: 0.34, gr: 0.85, palms: 0.05, props, n };
      case 'talk':
        return { l: add(CT.mic, 0.02, -0.08, 0), r: add(CT.tbar, 0, 0.02, 0), lean: 0.14, nod: 0, palms: 1, gr: 0.5, props, n };
      default:
        return { l: rest, r: add(sheet, 0.03, 0.03 * Math.abs(Math.sin(u * PI * 2)), 0.02), lean: 0.12, nod: 0.3, gr: 0.85, palms: 0.05, props, n };
    }
  },
};

// =============================================================================================
// 대본 책상 (tsScriptTable, 3 × 1): sat at it on a chair out front.

export const ST = {
  top: 0.76,
  seat: [-0.1, 0.5, 0.64] as V,
  script: [-0.02, 0.785, 0.1] as V,
  keys: [-0.55, 0.79, 0.14] as V,
  mug: [0.4, 0.76, 0.16] as V,
  writer: 1.0,
};
const ST_AT = sat(ST.seat[0], ST.seat[1], ST.seat[2], PI);
const PUNCH: Script = {
  seq: [['read', 3.4], ['mark', 2.8], ['type', 3.6], ['mouth', 2.6], ['sip', 1.8]],
  at: () => ST_AT,
  key(k, u, c) {
    const s = ST.script;
    const n: Record<string, number> = { marked: c.p('mark', 0.1, 0.9), typing: k === 'type' ? 1 : 0 };
    const props: Record<string, V | null> = { pen: k === 'mark' ? add(s, -0.06 + 0.13 * frac(u * 2), 0.012, 0.02 - Math.floor(u * 2) * 0.05) : null, mug: k === 'sip' ? c.bd(-0.1, 0.42 * c.H / 1.6 + 0.2 * sm(u, 0.1, 0.4) * (1 - sm(u, 0.7, 1)) - 0.2, 0.2) : ST.mug };
    switch (k) {
      case 'read':
        return { l: add(s, -0.17, 0.005, 0), r: add(s, 0.12, 0.012, 0.06 - 0.14 * u), lean: 0.16, nod: 0.42, palms: 0.05, gr: 0.5, props, n };
      case 'mark':
        return { l: add(s, -0.17, 0.005, 0), r: add(props.pen as V, 0, 0.01, 0), lean: 0.2, nod: 0.46, palms: 0.05, gr: 0.85, props, n };
      case 'type': {
        const a = add(ST.keys, 0.1, 0.02 * Math.abs(wave(c.t, 4)), 0.03);
        const b = add(ST.keys, -0.1, 0.02 * Math.abs(wave(c.t, 3.3, 0.4)), 0.03);
        return { r: a, l: b, lean: 0.14, nod: 0.26, palms: 1, tap: true, props, n };
      }
      case 'mouth':
        return { l: add(s, -0.17, 0.005, 0), r: add(satChest(c, -0.2, 0.3), 0, 0.03 * wave(c.t, 1), 0), lean: 0.03, nod: 0.02 + 0.04 * wave(c.t, 0.8), palms: 0.2, props, n };
      default:
        return { l: add(s, -0.17, 0.005, 0), r: props.mug as V, lean: 0.02, nod: -0.06, gr: 0.8, palms: 0.6, props, n };
    }
  },
};
const READING: Script = {
  seq: [['up', 1.4], ['read', 4.2], ['laugh', 2.0], ['read2', 3.4], ['note', 2.4]],
  at: () => ST_AT,
  key(k, u, c) {
    const s = c.bd(0, 0.28 * c.H / 1.6, 0.32);
    const raised = k === 'read' || k === 'read2' || k === 'laugh';
    const props: Record<string, V | null> = { script: raised ? add(s, 0, 0.03, 0) : null, pen: k === 'note' ? add(ST.script, 0, 0.012, 0) : null };
    const n: Record<string, number> = { laughing: k === 'laugh' ? 1 : 0, reading: 1, up: raised ? 1 : 0 };
    if (raised) return { l: add(s, 0.12, 0, 0), r: add(s, -0.12, 0, 0), lean: k === 'laugh' ? -0.07 + 0.04 * Math.abs(wave(c.t, 2.2)) : 0.03, nod: k === 'laugh' ? -0.1 : 0.2 + 0.03 * wave(c.t, 0.7), gl: 0.7, gr: 0.7, palms: 0.5, props, n };
    if (k === 'note') return { l: add(ST.script, -0.17, 0.005, 0), r: writeOn(ST.script, u, 2, 0.12), lean: 0.2, nod: 0.46, palms: 0.05, gr: 0.85, props, n };
    return { l: add(s, 0.12, 0, 0), r: add(s, -0.12, 0, 0), lean: 0.08, nod: 0.25, gl: 0.7, gr: 0.7, palms: 0.5, props, n };
  },
};

// =============================================================================================
// 출연자 대기실 (tsGreenBrief, 3 × 2): in the armchair, turned to the guest on the couch. The couch is on their right
// as they face out, the low table between.

export const GB = {
  seat: [0.78, 0.45, -0.1] as V,
  yaw: -1.85,
  guest: [-0.55, 0.45, -0.36] as V,
  guestYaw: 0.5,
  table: [-0.02, 0.42, 0.46] as V,
};
const GB_AT = sat(GB.seat[0], GB.seat[1], GB.seat[2], GB.yaw);
const BRIEF: Script = {
  seq: [['shake', 2.2], ['ask', 3.6], ['note', 2.8], ['show', 3.2], ['laugh', 2.0], ['ok', 1.8]],
  at: () => GB_AT,
  key(k, u, c) {
    const board = c.bd(0.1, 0.24 * c.H / 1.6, 0.3);
    const n: Record<string, number> = { brief: 1, asking: k === 'ask' ? 1 : 0, answering: k === 'note' ? 1 : 0, laughing: k === 'laugh' ? 1 : 0, shown: k === 'show' ? 1 : 0, shake: k === 'shake' ? 1 : 0 };
    const props: Record<string, V | null> = { board: k === 'shake' ? null : k === 'show' ? add(c.bd(-0.06, 0.28 * c.H / 1.6, 0.5), 0, 0, 0) : add(board, -0.02, 0.03, 0.02), pen: k === 'note' ? add(board, -0.02, 0.05, 0.02) : null };
    switch (k) {
      case 'shake':
        return { r: add(c.bd(-0.12, 0.22 * c.H / 1.6, 0.62), 0, 0.02 * wave(c.t, 3), 0), l: c.bd(0.2, 0.05, 0.22), lean: 0.24, nod: 0.05, gr: 0.75, palms: 0.5, props, n };
      case 'ask':
        return { l: board, r: add(c.bd(-0.14, 0.3 * c.H / 1.6, 0.34), 0.03 * wave(c.t, 0.9), 0.03 * wave(c.t, 1.3), 0), lean: 0.1, nod: 0.03, gl: 0.7, palms: -0.3, props, n };
      case 'note':
        return { l: board, r: writeOn(add(board, -0.02, 0.05, 0.02), u, 2, 0.1), lean: 0.14, nod: 0.3, gl: 0.7, gr: 0.85, palms: 0.05, props, n };
      case 'show':
        return { l: add(c.bd(0.02, 0.28 * c.H / 1.6, 0.46), 0, 0, 0), r: add(c.bd(-0.14, 0.3 * c.H / 1.6, 0.44), 0, 0.02 * wave(c.t, 1), 0), lean: 0.22, nod: 0.14, gl: 0.8, palms: 0.4, props, n };
      case 'laugh':
        return { l: board, r: add(satChest(c, -0.12, 0.26), 0, 0.02 * Math.abs(wave(c.t, 2.4)), 0), lean: -0.06 + 0.04 * Math.abs(wave(c.t, 2.2)), nod: -0.08, gl: 0.7, palms: 0.5, props, n };
      default:
        return { l: board, r: add(c.bd(-0.2, 0.36 * c.H / 1.6, 0.3), 0, 0.02 * wave(c.t, 2), 0), lean: 0.08, nod: 0.03, gl: 0.7, gr: 0.9, palms: 0.1, props, n };
    }
  },
};

const SCRIPTS: Record<TsMotion, Script> = {
  tsLive: LIVE,
  tsRehearse: REHEARSE,
  tsAdLib: ADLIB,
  tsCast: CAST,
  tsNews: NEWS,
  tsFact: FACT,
  tsEditor: EDITOR,
  tsCards: CARDS,
  tsFloor: FLOOR,
  tsRadio: RADIO,
  tsSegment: SEGMENT,
  tsFrame: FRAME,
  tsCue: CUE,
  tsWarm: WARM,
  tsQuiz: QUIZ,
  tsBuzz: TRY,
  tsSwitch: SWITCH,
  tsCheck: CHECK,
  tsPunch: PUNCH,
  tsReading: READING,
  tsBrief: BRIEF,
};
