import * as THREE from 'three';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';

/*
 * A day at a dubbing studio of a made-up name, 울림나래 녹음실 (2026-11-01). Each motion is a round of beats: where the dweller is, where the
 * hands go, what moves. The piece reads the same script by the same clock (voiceActor.ts), so the cartoon's mouth, the timing bar and
 * the words on it follow the line being acted. Acting a line with the whole body is the point: the arms, the stoop and the step
 * back from the mic on a shout all belong to the character on the screen, and it's a different one each round.
 *
 * - 더빙 부스 (dubbingBooth): vaDub a line acted for the screen; vaUrgent the alarm, a changed line pencilled in and taken at once.
 * - 대본 보면대 (scriptStand): vaStudy lines traced, breaths pencilled, tried under the breath; vaWatch a senior at their mic watched and noted.
 * - 발성 연습 거울 (voiceMirror): vaWarm breath, lip trill, neck, a tongue twister; vaVoice a character's voice found, body first.
 * - 내레이션 데스크 (narrationDesk): vaNarrate read seated, a page laid over without a sound; vaCopy copy timed and cut.
 * - 믹싱 콘솔 (mixingConsole, also the singer's): vaMix faders, a knob, head going to it; vaDirect talkback to the booth, a take marked.
 * - 단체 더빙 라인 (vaEnsembleLine): vaEnsemble a turn at the mic among colleagues; vaWalla the crowd murmur, then the cheer.
 * - 폴리 테이블 (vaFoleyTable): vaFoleySteps walking on the spot on gravel and boards; vaFoleyProps a door, a heel, cellophane fire.
 * - 목 관리 차 코너 (vaTeaCorner): vaTea a warm pear tea, steam breathed in, sipped silently.
 * - 대본 선반 (vaScriptRack): vaPickScript a script pulled, read, a part found.
 * - 연출석 (vaCrewDesk): vaPickTake takes chosen beside the director, a clipboard on the arm.
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front). Facing the piece the
 * dweller's right hand is on +x. `tool` names what's in the hand this beat (handTool.ts), the place of it in `props`.
 */
export type VaMotion = 'vaDub' | 'vaUrgent' | 'vaStudy' | 'vaWatch' | 'vaWarm' | 'vaVoice' | 'vaNarrate' | 'vaCopy' | 'vaMix' | 'vaDirect' | 'vaEnsemble' | 'vaWalla' | 'vaFoleySteps' | 'vaFoleyProps' | 'vaTea' | 'vaPickScript' | 'vaPickTake';
export const VA_MOTIONS = new Set<string>(['vaDub', 'vaUrgent', 'vaStudy', 'vaWatch', 'vaWarm', 'vaVoice', 'vaNarrate', 'vaCopy', 'vaMix', 'vaDirect', 'vaEnsemble', 'vaWalla', 'vaFoleySteps', 'vaFoleyProps', 'vaTea', 'vaPickScript', 'vaPickTake']);
export type VaTool = 'pen' | 'script' | 'heel' | 'cup' | 'watch' | 'clip';

const frac = (x: number) => ((x % 1) + 1) % 1;
export const vaPhase = (p: THREE.Vector3) => frac(p.x * 0.379 + p.z * 0.571);
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
  /** Walking on the spot, metres a second (a foley pit). */
  pace?: number;
}
const st = (x: number, z: number, yaw = PI, pace?: number): St => ({ x, y: 0, z, yaw, pace });
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
  shut?: boolean;
  tool?: VaTool;
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
export interface VaNow {
  b: Beat;
  st: St;
  walking: boolean;
  key: Key;
  tool: VaTool | null;
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
  return { l: v(a.l, b.l), r: v(a.r, b.r), lean: n(a.lean, b.lean, 0.05), nod: n(a.nod, b.nod, 0.1), palms: n(a.palms, b.palms, 0.4), gl: n(a.gl, b.gl, 0.3), gr: n(a.gr, b.gr, 0.3), crouch: n(a.crouch, b.crouch, 0), tap: e < 0.5 ? a.tap : b.tap, shut: e < 0.5 ? a.shut : b.shut };
}
/** Where a script has got to: the dweller, the hands, what's held and everything the piece draws. */
export function vaNow(m: VaMotion, t: number, ph: number, H = 1.6): VaNow {
  const s = SCRIPTS[m];
  const b = beatOf(s.seq, t, ph);
  const A = evalKey(s, b.from, b.u, t, H, b.n);
  const B = b.e > 0 ? evalKey(s, b.to, 0, t, H, b.n) : A;
  const e = b.e;
  const nearer = e < 0.5 ? A.st : B.st;
  const here: St = { x: mixN(A.st.x, B.st.x, e), y: mixN(A.st.y, B.st.y, e), z: mixN(A.st.z, B.st.z, e), yaw: angle(A.st.yaw, B.st.yaw, e), sit: nearer.sit, pace: nearer.pace };
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
export function vaPose(m: VaMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = vaNow(m, t, vaPhase(par.getWorldPosition(new THREE.Vector3())), height);
  const W = (v: V) => par.localToWorld(new THREE.Vector3(v[0], v[1], v[2]));
  const s = N.st;
  const k = N.key;
  const at = W([s.x, s.y, s.z]);
  const dir = new THREE.Vector3(Math.sin(s.yaw), 0, Math.cos(s.yaw)).transformDirection(par.matrixWorld);
  const yaw = Math.atan2(dir.x, dir.z);
  const pose: BodyPose = s.sit ? { kind: 'sit', at, yaw, floor: W([s.x, 0, s.z]).y } : s.pace ? { kind: 'walk', at, yaw, pace: s.pace } : N.walking ? { kind: 'walk', at, yaw } : { kind: 'stand', at, yaw, crouch: k.crouch };
  return {
    pose,
    doing: {
      // Nothing for the hands (marching on gravel): they swing as they walk.
      reach: k.l || k.r || N.tool ? { l: k.l && W(k.l), r: k.r && W(k.r), lean: k.lean ?? 0.05, nod: k.nod ?? 0.1, palms: k.palms ?? 0.4, grip: { l: k.gl ?? 0.3, r: k.gr ?? 0.3 }, tap: k.tap } : undefined,
      crouch: k.crouch ? k.crouch : undefined,
      shut: k.shut,
    },
  };
}
const easy = (c: Ctx): Key => ({ l: c.bd(0.2, 0.55 * c.H, 0.1), r: c.bd(-0.2, 0.55 * c.H, 0.1), gl: 0.3, gr: 0.3 });

/** How far a pen's grip stands above its tip. */
export const PEN_UP = 0.075;

// ---------------------------------------------------------------------------------------------
// The lines of the cartoon, 별똥 순찰대 (invented): who's speaking, and the body that goes with them.

export const CAST: ReadonlyArray<{ who: string; line: string; sky: string; color: string }> = [
  { who: '콩떡', line: '걱정 마! 내가 꼭 지켜 줄게!', sky: '#3f6fd1', color: '#ffb74d' },
  { who: '먹구름 대왕', line: '흐흐흐... 이미 너무 늦었다!', sky: '#3b2a5c', color: '#7e6aa8' },
  { who: '꼬마 별이', line: '언니야... 나 무서워요...', sky: '#ef8fb1', color: '#fff176' },
  { who: '달 할아범', line: '에헴, 옛날 옛적에 말이다...', sky: '#1f3a5f', color: '#e0e0e0' },
];
/** A character in the body: `e` from 0 to 1 is how near the top of the line. */
function acted(mood: number, e: number, c: Ctx): Key {
  const k = c.H / 1.6;
  const w = c.t;
  switch (wrap(mood, CAST.length)) {
    case 0:
      // The hero: a fist at the chest, the other going up, chin up.
      return { l: c.bd(0.14, 1.12 * k, 0.17), gl: 0.9, r: c.bd(-0.24, (1.28 + 0.34 * e + 0.015 * Math.sin(w * 7)) * k, 0.24), gr: 0.92, palms: 0.3, lean: 0.08 + 0.08 * e, nod: -0.06 - 0.12 * e, crouch: 0.05 * (1 - e) };
    case 1:
      // The villain: claws rising, stooped in, then head back in the laugh.
      return { l: c.bd(0.3, (1.14 + 0.28 * e) * k, 0.24), gl: 0.55, r: c.bd(-0.3, (1.14 + 0.28 * e) * k, 0.24), gr: 0.55, palms: 0.05, lean: 0.2 - 0.3 * e, nod: 0.14 - 0.36 * e + 0.04 * e * Math.sin(w * 11) };
    case 2:
      // The little one: hands at the cheeks, knees in, shrinking.
      return { l: c.bd(0.1, (1.4 - 0.08 * e) * k, 0.13), gl: 0.25, r: c.bd(-0.1, (1.4 - 0.08 * e) * k, 0.13), gr: 0.25, palms: 0.9, lean: 0.06 + 0.04 * Math.sin(w * 2), nod: 0.08 + 0.06 * Math.sin(w * 5), crouch: 0.14 + 0.1 * e + 0.03 * Math.sin(w * 6) };
    default:
      // The old man: bent, a hand on the small of the back, the other shaking on a stick that isn't there.
      return { l: c.bd(0.16, 0.92 * k, -0.12), gl: 0.45, r: c.bd(-0.18, (0.92 + 0.012 * Math.sin(w * 15)) * k, 0.3), gr: 0.9, palms: 0.2, lean: 0.26, nod: -0.06 + 0.05 * Math.sin(w * 2), crouch: 0.2 };
  }
}

// =============================================================================================
// 더빙 부스 (dubbingBooth, 2 × 1): a mic on a boom, the cartoon on the back wall, a script stand. Side-on enough to be seen acting.

const BOOTH_YAW = PI - 0.45;
export const DB = {
  stand: [-0.3, 0.76] as readonly [number, number],
  mic: [-0.15, 1.46, 0.45] as V,
  script: [0.12, 1.1, 0.5] as V,
  penRest: [0.27, 1.05, 0.46] as V,
  screen: [0.34, 1.34, -0.4] as V,
};
const penOn = (p: V, u: number, t: number): V => add(p, -0.05 + 0.1 * frac(u * 3), PEN_UP + 0.004 * Math.sin(t * 16), -0.03 + 0.03 * Math.floor(u * 3));
const DUB: Script = {
  seq: [['cue', 2.2], ['breath', 1.0], ['act', 4.4], ['peak', 2.2], ['settle', 1.4], ['check', 2.2], ['flip', 1.4]],
  // The step back from the mic on the loud part is what a real actor does.
  at: (k) => (k === 'peak' ? st(DB.stand[0] - 0.03, DB.stand[1] + 0.09, BOOTH_YAW) : st(DB.stand[0], DB.stand[1], BOOTH_YAW)),
  key(k, u, c) {
    const mood = wrap(c.round, CAST.length);
    const n = { scene: mood, rec: c.p('breath', 0, 0.3) * (1 - c.p('settle', 0.2, 0.5)), talk: k === 'act' || k === 'peak' ? 1 : 0, spoken: 0.75 * c.p('act') + 0.25 * c.p('peak'), head: 0.1 * c.p('cue') + 0.1 * c.p('breath') + 0.5 * c.p('act') + 0.3 * c.p('peak'), ok: c.p('check', 0.4, 0.6) * (1 - c.p('flip', 0, 0.3)), page: c.p('flip', 0.2, 0.8) };
    const props = { pen: DB.penRest };
    const k1 = c.H / 1.6;
    switch (k) {
      case 'cue':
        return { l: c.bd(0.22, 0.78 * k1, 0.14), gl: 0.3, r: add(DB.script, 0.03 * Math.sin(c.t), 0.03, 0), gr: 0.2, palms: 0.05, lean: 0.06, nod: -0.02 + 0.02 * Math.sin(c.t * 2), n, props };
      case 'breath':
        return { l: c.bd(0.1, 0.98 * k1, 0.12), gl: 0.15, r: c.bd(-0.1, 0.98 * k1, 0.12), gr: 0.15, palms: 0.9, lean: -0.05, nod: -0.08, n, props };
      case 'act':
        return { ...acted(mood, 0.6 * u, c), n, props };
      case 'peak':
        return { ...acted(mood, 0.6 + 0.4 * sm(u, 0, 0.5), c), n, props };
      case 'settle':
        return { ...easy(c), lean: 0.02, nod: 0.1, n, props };
      case 'check':
        // The director's word in the cans: a hand up to the ear, then a thumb when it's good.
        return { l: c.bd(0.14, 1.42 * k1, 0.03), gl: 0.25, palms: 0.9, r: u > 0.45 ? c.bd(-0.2, 1.2 * k1, 0.26) : c.bd(-0.2, 0.8 * k1, 0.14), gr: u > 0.45 ? 0.88 : 0.3, nod: 0.04 + 0.06 * Math.sin(c.t * 4), n, props };
      default:
        // A page over, flat-handed, so it makes no noise.
        return { l: c.bd(0.22, 0.78 * k1, 0.14), gl: 0.3, r: add(DB.script, 0.1 - 0.2 * sm(u, 0.1, 0.8), 0.03, 0), gr: 0.1, palms: 0.05, lean: 0.08, nod: 0.26, n, props };
    }
  },
};
const URGENT: Script = {
  seq: [['run', 0.8, 0.9], ['read', 2.2], ['fix', 3.2], ['count', 1.4], ['take', 4.4], ['peak', 1.8], ['done', 2.2]],
  at: (k) => (k === 'run' ? st(DB.stand[0], DB.stand[1] + 0.34, BOOTH_YAW) : st(DB.stand[0], DB.stand[1], BOOTH_YAW)),
  key(k, u, c) {
    const mood = wrap(c.round + 1, CAST.length);
    const k1 = c.H / 1.6;
    const n = { urgent: 1 - c.p('done', 0.3, 0.6), scene: mood, note: 1, fixed: c.p('fix', 0.1, 0.9), rec: c.p('count', 0.6, 1) * (1 - c.p('done', 0, 0.3)), talk: k === 'take' || k === 'peak' ? 1 : 0, spoken: 0.75 * c.p('take') + 0.25 * c.p('peak'), head: 0.2 * c.p('count') + 0.5 * c.p('take') + 0.3 * c.p('peak'), ok: c.p('done', 0.3, 0.5), count: k === 'count' ? 3 - Math.floor(u * 3) : 0 };
    const props = { pen: k === 'fix' ? penOn(DB.script, u, c.t) : DB.penRest };
    switch (k) {
      case 'run':
        return { ...easy(c), lean: 0.1, nod: 0.1, n, props };
      case 'read':
        return { l: c.bd(0.22, 0.78 * k1, 0.14), gl: 0.3, r: add(DB.script, 0.04 * Math.sin(c.t * 3), 0.03, 0.02), gr: 0.15, palms: 0.05, lean: 0.14, nod: 0.3, n, props };
      case 'fix':
        return { l: add(DB.script, -0.14, 0.03, 0.02), gl: 0.2, palms: 0.05, tool: 'pen', lean: 0.15, nod: 0.32, n, props };
      case 'count':
        // Fingers counting down for themselves: three, two, one.
        return { l: c.bd(0.2, 0.78 * k1, 0.14), gl: 0.3, r: c.bd(-0.2, 1.2 * k1, 0.24), gr: 0.25 + 0.2 * Math.floor(u * 3), nod: -0.04, n, props };
      case 'take':
        return { ...acted(mood, 0.6 * u, c), n, props };
      case 'peak':
        return { ...acted(mood, 0.6 + 0.4 * u, c), n, props };
      default:
        // A long breath out, shoulders down, a thumb to the glass.
        return { l: c.bd(0.1, 1.0 * k1, 0.16), gl: 0.1, palms: 0.9, r: c.bd(-0.22, 1.24 * k1, 0.26), gr: 0.88, lean: -0.02 + 0.02 * Math.sin(c.t * 1.5), nod: 0.04, n, props };
    }
  },
};

// =============================================================================================
// 대본 보면대 (scriptStand, 1 × 1): a tilted stand with a script and a pencil on its tray.

export const SS = {
  stand: 0.52,
  page: [0, 1.1, 0.12] as V,
  penRest: [0.16, 1.03, 0.2] as V,
  /** Where a senior stands to record when one's being watched. */
  senior: [0.96, 0.62] as readonly [number, number],
};
const STUDY: Script = {
  seq: [['read', 3.0], ['mark', 3.2], ['mouth', 3.0], ['mark2', 2.4], ['try', 3.2], ['back', 1.2]],
  at: () => st(0, SS.stand),
  key(k, u, c) {
    const k1 = c.H / 1.6;
    const mood = wrap(c.round, CAST.length);
    const n = { scene: mood, hi: c.p('read'), marks: 3 * c.p('mark') + 3 * c.p('mark2') };
    const props = { pen: k === 'mark' || k === 'mark2' ? penOn(SS.page, u, c.t) : SS.penRest };
    const leftOnStand = add(SS.page, -0.17, 0.03, 0.04);
    switch (k) {
      case 'read':
        return { l: leftOnStand, gl: 0.25, palms: 0.05, r: add(SS.page, -0.06 + 0.12 * frac(u * 3), 0.03, -0.03 + 0.03 * Math.floor(u * 3)), gr: 0.15, lean: 0.1, nod: 0.3, n, props };
      case 'mark':
      case 'mark2':
        return { l: leftOnStand, gl: 0.25, palms: 0.05, tool: 'pen', lean: 0.12, nod: 0.34, n, props };
      case 'mouth':
        // The line under the breath, a hand beating its rhythm.
        return { l: leftOnStand, gl: 0.25, palms: 0.05, r: c.bd(-0.2, (0.94 + 0.05 * Math.abs(Math.sin(c.t * 4.5))) * k1, 0.24), gr: 0.4, lean: 0.06, nod: 0.2 + 0.03 * Math.sin(c.t * 4.5), n, props };
      case 'try':
        return { ...acted(mood, 0.45 * u, c), n, props };
      default:
        return { ...easy(c), nod: 0.2, n, props };
    }
  },
};
/** Turned to the senior at their mic, away from the script. */
const WATCH_YAW = PI / 2 + 0.25;
const WATCH: Script = {
  seq: [['ready', 1.6], ['watch', 4.2], ['note', 3.0], ['watch2', 4.2], ['bow', 1.8]],
  at: (k) => (k === 'note' ? st(0, SS.stand, PI) : st(0.1, SS.stand + 0.06, WATCH_YAW)),
  key(k, u, c) {
    const mood = wrap(c.round + (k === 'watch2' ? 1 : 0), CAST.length);
    const n = { senior: 1, srMood: mood, srActs: k === 'watch' || k === 'watch2' ? 1 : 0, srPeak: k === 'watch' || k === 'watch2' ? sm(u, 0.5, 0.8) : 0, marks: 3 * c.p('note'), srBow: k === 'bow' ? 1 : 0 };
    const props = { pen: k === 'note' ? penOn(SS.page, u, c.t) : SS.penRest };
    const k1 = c.H / 1.6;
    switch (k) {
      case 'note':
        return { l: add(SS.page, -0.17, 0.03, 0.04), gl: 0.25, palms: 0.05, tool: 'pen', lean: 0.12, nod: 0.34, n, props };
      case 'bow':
        return { ...easy(c), lean: 0.05 + 0.3 * Math.sin(u * PI), nod: 0.15, n, props };
      default:
        // Arms held in, a head that nods with the senior's phrasing.
        return { l: c.bd(0.12, 0.9 * k1, 0.16), gl: 0.5, r: c.bd(-0.12, 0.9 * k1, 0.16), gr: 0.5, lean: 0.02, nod: 0.02 + 0.05 * Math.sin(c.t * 2.2), n, props };
    }
  },
};

// =============================================================================================
// 발성 연습 거울 (voiceMirror, 1 × 1): a tall mirror, the day's tongue twister, four character cards, a level meter.

export const VM = { stand: 0.62 };
const WARM: Script = {
  seq: [['belly', 3.4], ['trill', 2.6], ['neck', 2.8], ['arms', 2.4], ['twister', 3.4], ['scale', 3.0]],
  at: () => st(0, VM.stand),
  key(k, u, c) {
    const k1 = c.H / 1.6;
    const breath = Math.sin(c.t * 1.6);
    const n = { level: k === 'scale' ? 0.2 + 0.8 * u : k === 'twister' ? 0.45 + 0.25 * Math.abs(Math.sin(c.t * 7)) : k === 'trill' ? 0.4 + 0.1 * Math.sin(c.t * 22) : k === 'belly' ? 0.1 : 0, card: -1, twister: k === 'twister' ? 1 : 0 };
    switch (k) {
      case 'belly':
        // A hand on the belly, one on the ribs: it's the belly that moves.
        return { l: c.bd(0.05, (0.92 + 0.012 * breath) * k1, 0.15 + 0.012 * breath), gl: 0.1, r: c.bd(-0.14, 1.08 * k1, 0.13), gr: 0.1, palms: 0.9, lean: -0.02 - 0.02 * breath, nod: -0.02, n };
      case 'trill':
        // Fingers pushing the cheeks up, lips going.
        return { l: c.bd(0.08, 1.38 * k1, 0.13), gl: 0.2, r: c.bd(-0.08, 1.38 * k1, 0.13), gr: 0.2, palms: 0.9, nod: 0.02 + 0.015 * Math.sin(c.t * 20), n };
      case 'neck':
        return { ...easy(c), nod: 0.25 * Math.sin(c.t * 1.8), lean: 0.05 * Math.cos(c.t * 1.8), n };
      case 'arms': {
        // Arms round, loosening the shoulders.
        const a = c.t * 4;
        return { l: c.bd(0.34, (1.14 + 0.2 * Math.sin(a)) * k1, 0.14 + 0.12 * Math.cos(a)), gl: 0.15, r: c.bd(-0.34, (1.14 - 0.2 * Math.sin(a)) * k1, 0.14 - 0.12 * Math.cos(a)), gr: 0.15, palms: 0.5, nod: 0.02, n };
      }
      case 'twister':
        return { l: c.bd(0.2, 0.88 * k1, 0.16), gl: 0.3, r: c.bd(-0.24, (1.12 + 0.05 * Math.sin(c.t * 8)) * k1, 0.3), gr: 0.15, palms: 0.5, lean: 0.06, nod: -0.04, n };
      default:
        // Up the scale, an arm rising with it, chin level.
        return { l: c.bd(0.1, 1.0 * k1, 0.14), gl: 0.15, palms: 0.5, r: c.bd(-0.26, (0.98 + 0.56 * sm(u, 0, 1)) * k1, 0.3), gr: 0.12, nod: -0.04 - 0.08 * u, n };
    }
  },
};
const VOICE: Script = {
  seq: [['look', 2.2], ['try', 3.4], ['big', 2.8], ['shake', 1.4], ['again', 3.4], ['got', 2.4]],
  at: () => st(0, VM.stand),
  key(k, u, c) {
    const mood = wrap(c.round, CAST.length);
    const k1 = c.H / 1.6;
    const n = { card: mood, level: k === 'try' || k === 'again' ? 0.4 + 0.3 * Math.abs(Math.sin(c.t * 6)) : k === 'big' ? 0.75 + 0.2 * Math.abs(Math.sin(c.t * 8)) : 0, got: c.p('got', 0.2, 0.5) };
    switch (k) {
      case 'look':
        // Chin in the hand, studying the card.
        return { l: c.bd(0.12, 1.06 * k1, 0.16), gl: 0.4, r: c.bd(-0.06, 1.36 * k1, 0.14), gr: 0.5, lean: 0.1, nod: 0.05, n };
      case 'try':
        return { ...acted(mood, 0.35, c), n };
      case 'big':
        return { ...acted(mood, 1, c), n };
      case 'shake':
        // No, not that one: arms loose, head shaken.
        return { ...easy(c), nod: 0.1, lean: 0.03 * Math.sin(c.t * 9), n };
      case 'again':
        return { ...acted(mood, 0.65, c), n };
      default:
        // That's the one: a fist down in a small yes.
        return { l: c.bd(0.2, 0.8 * k1, 0.12), gl: 0.3, r: c.bd(-0.2, (1.12 - 0.14 * sm(u, 0.1, 0.3)) * k1, 0.24), gr: 0.92, nod: 0.06, n };
    }
  },
};

// =============================================================================================
// 내레이션 데스크 (narrationDesk, 1 × 1): seated, a mic on an arm, pages on a lectern, a small waveform screen.

export const ND = {
  seat: [0, 0.47, 0.62] as V,
  top: 0.74,
  page: [-0.02, 0.81, 0.2] as V,
  done: [0.28, 0.75, 0.2] as V,
  penRest: [-0.3, 0.75, 0.12] as V,
  watchRest: [0.32, 0.76, 0.02] as V,
};
const NARR: Script = {
  seq: [['settle', 2.0], ['read', 4.0], ['ear', 2.6], ['read2', 3.4], ['page', 1.8], ['listen', 2.4]],
  at: () => sat(ND.seat),
  key(k, u, c) {
    const n = { hs: 1, rec: k === 'settle' ? 0 : k === 'listen' ? 0 : 1, talk: k === 'read' || k === 'read2' || k === 'ear' ? 1 : 0, pos: 0.32 * c.p('read') + 0.2 * c.p('ear') + 0.3 * c.p('read2') + 0.18 * c.p('listen'), page: c.p('page', 0.2, 0.8), round: wrap(c.round, 3) };
    const props = { pen: ND.penRest, watch: ND.watchRest };
    const flat: Key = { l: add(ND.page, -0.14, 0.03, 0.03), gl: 0.2, r: add(ND.page, 0.14, 0.03, 0.03), gr: 0.2, palms: 0.05 };
    switch (k) {
      case 'settle':
        return { ...flat, lean: 0.02 + 0.015 * Math.sin(c.t * 1.5), nod: 0.12, n, props };
      case 'read':
        // Reading to someone: a free hand shaping the sentence.
        return { l: flat.l, gl: 0.2, r: c.bd(-0.22, 0.35 + 0.03 * Math.sin(c.t * 2.4), 0.3), gr: 0.15, palms: 0.5, lean: 0.1, nod: 0.22 + 0.03 * Math.sin(c.t * 2.4), n, props };
      case 'ear':
        // A hand cupped at the can, to hear their own voice.
        return { l: flat.l, gl: 0.2, r: c.bd(-0.13, 0.64 * (c.H / 1.6), 0.02), gr: 0.3, palms: 0.9, lean: 0.08, nod: 0.18, n, props };
      case 'read2':
        return { l: c.bd(0.22, 0.34 + 0.03 * Math.sin(c.t * 2), 0.3), gl: 0.15, r: flat.r, gr: 0.2, palms: 0.5, lean: 0.12, nod: 0.24, n, props };
      case 'page':
        // Over without a sound: lifted, not slid.
        return { l: flat.l, gl: 0.2, r: lerpV(add(ND.page, 0.02, 0.05 + 0.04 * Math.sin(u * PI), 0.02), add(ND.done, 0, 0.04, 0), sm(u, 0.2, 0.85)), gr: 0.25, palms: 0.05, lean: 0.14, nod: 0.26, n, props };
      default:
        return { ...flat, lean: -0.02, nod: 0.08 + 0.05 * Math.sin(c.t * 2), n, props };
    }
  },
};
const COPY: Script = {
  seq: [['time', 4.0], ['look', 1.4], ['cut', 3.4], ['add', 2.4], ['time2', 3.4], ['good', 1.6]],
  at: () => sat(ND.seat),
  key(k, u, c) {
    const timing = k === 'time' ? 3 + 15.5 * u : k === 'time2' ? 2 + 12.8 * u : k === 'look' ? 18.5 : 14.8;
    const n = { hs: 0, copy: 1, timing, over: k === 'look' || k === 'cut' ? 1 : 0, cut: c.p('cut', 0.1, 0.9), added: c.p('add', 0.1, 0.9), got: c.p('good', 0, 0.2), talk: k === 'time' || k === 'time2' ? 1 : 0 };
    const pen = k === 'cut' || k === 'add' ? penOn(ND.page, u, c.t) : ND.penRest;
    const inHand = c.bd(-0.2, 0.36, 0.26);
    const watch: V = k === 'time' || k === 'time2' || k === 'look' ? inHand : ND.watchRest;
    const props = { pen, watch };
    const left = add(ND.page, -0.17, 0.03, 0.04);
    switch (k) {
      case 'time':
      case 'time2':
        return { l: left, gl: 0.2, palms: 0.05, tool: 'watch', lean: 0.1, nod: 0.22 + 0.03 * Math.sin(c.t * 2.2), n, props };
      case 'look':
        return { l: left, gl: 0.2, palms: 0.05, tool: 'watch', lean: 0.06, nod: 0.3, n, props };
      case 'cut':
      case 'add':
        return { l: left, gl: 0.2, palms: 0.05, tool: 'pen', lean: 0.14, nod: 0.32, n, props };
      default:
        return { l: left, gl: 0.2, palms: 0.05, r: c.bd(-0.2, 0.42, 0.28), gr: 0.88, lean: 0, nod: 0.06, n, props };
    }
  },
};

// =============================================================================================
// 믹싱 콘솔 (mixingConsole, 2 × 1; also the singer's): seated; a sloped desk of faders and knobs, screen and speakers past it.

export const MC = {
  seat: [0, 0.47, 0.64] as V,
  top: 0.8,
  fader: (i: number): V => [-0.3 + i * 0.1, 0.8, 0.24],
  knob: [0.44, 0.84, 0.2] as V,
  talkback: [-0.42, 0.83, 0.16] as V,
  sheet: [0.62, 0.83, 0.3] as V,
  penRest: [0.76, 0.84, 0.26] as V,
};
const MIX: Script = {
  seq: [['play', 2.4], ['fade', 3.6], ['knob', 3.0], ['groove', 3.2], ['fade2', 2.8], ['stop', 1.6]],
  at: () => sat(MC.seat),
  key(k, u, c) {
    const f0 = 0.55 + 0.3 * (k === 'fade' ? sm(u, 0.1, 0.8) : c.p('fade')) - 0.2 * (k === 'fade2' ? sm(u, 0.1, 0.8) : c.p('fade2'));
    const f1 = 0.4 + 0.25 * c.p('fade', 0.2, 0.9) - 0.1 * c.p('fade2');
    const n = { hs: 0, playing: k === 'stop' ? 0 : 1, f0, f1, knob: k === 'knob' ? 0.8 * sm(u, 0, 1) - 0.4 : c.p('knob') * 0.4 - 0.4 * (1 - c.p('knob')), pos: frac(c.t / 18) };
    const props = { pen: MC.penRest };
    const faderHand = (i: number, f: number): V => add(MC.fader(i), 0, 0.03, -0.09 * (f - 0.5) * 2);
    switch (k) {
      case 'play':
        return { l: faderHand(1, f0), gl: 0.3, r: faderHand(4, f1), gr: 0.3, palms: 0.05, lean: 0.12, nod: 0.1, n, props };
      case 'fade':
      case 'fade2':
        return { l: faderHand(1, f0), gl: 0.35, r: faderHand(4, f1), gr: 0.35, palms: 0.05, lean: 0.16, nod: 0.2, n, props };
      case 'knob':
        return { l: faderHand(1, f0), gl: 0.35, r: add(MC.knob, 0, 0.03, 0.02), gr: 0.65, palms: 0.2, lean: 0.2, nod: 0.18, n, props };
      case 'groove':
        // Back in the chair, head going with it, eyes on the speakers.
        return { l: faderHand(1, f0), gl: 0.3, r: c.bd(-0.22, 0.28, 0.2), gr: 0.3, lean: -0.04, nod: 0.03 + 0.09 * Math.sin(c.t * 5.2), n, props };
      default:
        return { l: faderHand(1, f0), gl: 0.3, r: add(MC.fader(6), 0, 0.03, 0.02), gr: 0.2, palms: 0.05, tap: u < 0.4, lean: 0.14, nod: 0.12, n, props };
    }
  },
};
const DIRECT: Script = {
  seq: [['roll', 2.2], ['hear', 3.8], ['talk', 3.2], ['hear2', 3.6], ['ok', 1.8], ['mark', 2.8]],
  at: () => sat(MC.seat),
  key(k, u, c) {
    const n = { hs: 0, playing: k === 'talk' || k === 'mark' || k === 'ok' ? 0 : 1, direct: 1, talkback: k === 'talk' ? 1 : 0, f0: 0.7, f1: 0.55, knob: 0, pos: frac(c.t / 18), marks: c.p('mark', 0.1, 0.9), take: wrap(c.round, 9) + 1 };
    const props = { pen: k === 'mark' ? penOn(MC.sheet, u, c.t) : MC.penRest };
    const onFader = add(MC.fader(2), 0, 0.03, 0);
    switch (k) {
      case 'talk':
        // A finger down on the talkback, a word and a hand showing how: bigger, slower.
        return { l: add(MC.talkback, 0, 0.03, 0), gl: 0.15, palms: 0.05, r: c.bd(-0.26, 0.5 + 0.06 * Math.sin(c.t * 3), 0.3), gr: 0.15, lean: 0.14, nod: 0.05 + 0.04 * Math.sin(c.t * 4), n, props };
      case 'hear':
      case 'hear2':
        // Eyes on the actor through the glass, a hand conducting the line.
        return { l: onFader, gl: 0.3, palms: 0.05, r: c.bd(-0.22, 0.46 + 0.05 * Math.sin(c.t * 2.8), 0.3), gr: 0.25, lean: 0.1, nod: 0.02 + 0.04 * Math.sin(c.t * 2.8), n, props };
      case 'ok':
        return { l: onFader, gl: 0.3, palms: 0.05, r: c.bd(-0.2, 0.62, 0.3), gr: 0.88, lean: -0.02, nod: 0.02, n, props };
      case 'mark':
        return { l: onFader, gl: 0.3, palms: 0.05, tool: 'pen', lean: 0.2, nod: 0.32, n, props };
      default:
        return { l: onFader, gl: 0.3, palms: 0.05, r: add(MC.fader(6), 0, 0.03, 0.02), gr: 0.2, tap: u < 0.3, lean: 0.12, nod: 0.08, n, props };
    }
  },
};

// =============================================================================================
// 단체 더빙 라인 (vaEnsembleLine, 5 × 2): a big screen at the back, three mics in a row, two colleagues at theirs.

const LINE_YAW = PI - 0.32;
export const EL = {
  /** Where a body stands at each mic, and each mic (world height at the capsule). */
  places: [[-1.5, 0.66], [0, 0.66], [1.5, 0.66]] as ReadonlyArray<readonly [number, number]>,
  mics: [[-1.42, 1.46, 0.28], [0, 1.46, 0.28], [1.42, 1.46, 0.28]] as ReadonlyArray<V>,
  screen: [0, 1.62, -0.88] as V,
};
const ENSEMBLE: Script = {
  seq: [['wait', 2.4], ['in', 0.6, 0.4], ['line', 3.2], ['out', 0.4, 0.4], ['wait2', 2.8], ['in2', 0.6, 0.4], ['line2', 3.0], ['out2', 0.4, 0.4], ['laugh', 2.0]],
  at: (k) => (k === 'in' || k === 'line' || k === 'in2' || k === 'line2' ? st(EL.places[0][0] + 0.02, EL.places[0][1] - 0.1, LINE_YAW) : st(EL.places[0][0], EL.places[0][1], LINE_YAW)),
  key(k, u, c) {
    const k1 = c.H / 1.6;
    const who = k === 'line' || k === 'line2' ? 0 : k === 'wait' || k === 'in' || k === 'out' ? 1 : k === 'wait2' || k === 'in2' || k === 'out2' ? 2 : -1;
    const mood = k === 'line2' ? wrap(c.round + 2, CAST.length) : wrap(c.round, CAST.length);
    const scriptHold: V = c.bd(0.08, 1.02 * k1, 0.28);
    const n = { who, scene: who === 1 ? 1 : who === 2 ? 3 : mood, talk: who >= 0 ? 1 : 0, head: frac((c.round % 2) * 0.5 + (0.42 * c.p('wait') + 0.1 * c.p('line') + 0.08 * c.p('wait2') + 0.3 * c.p('line2') + 0.1 * c.p('laugh')) * 0.5), spoken: k === 'line' || k === 'line2' ? u : k === 'wait' || k === 'wait2' ? u : 1, laugh: k === 'laugh' ? 1 : 0 };
    switch (k) {
      case 'wait':
      case 'wait2':
      case 'in':
      case 'in2':
      case 'out':
      case 'out2':
        // Waiting a turn: a script low, eyes on the screen, the free hand counting in.
        return { l: scriptHold, gl: 0.6, palms: 0.5, r: c.bd(-0.22, (0.82 + 0.03 * Math.sin(c.t * 3)) * k1, 0.14), gr: 0.35, lean: 0.03, nod: -0.02, n };
      case 'line':
      case 'line2':
        return { ...acted(mood, 0.7 * u, c), n };
      default:
        return { ...easy(c), lean: -0.05 + 0.04 * Math.sin(c.t * 8), nod: -0.06 + 0.04 * Math.sin(c.t * 8), n };
    }
  },
};
const WALLA: Script = {
  seq: [['hush', 2.2], ['murmur', 4.4], ['swell', 2.8], ['cheer', 2.6], ['end', 1.6]],
  at: () => st(EL.places[0][0], EL.places[0][1], LINE_YAW),
  key(k, u, c) {
    const k1 = c.H / 1.6;
    const n = { crowd: 1, scene: 0, cheer: k === 'cheer' ? 1 : 0, murmur: k === 'murmur' || k === 'swell' ? 1 : 0, head: 0.15 * c.p('hush') + 0.4 * c.p('murmur') + 0.25 * c.p('swell') + 0.2 * c.p('cheer'), talk: 0, spoken: 0 };
    switch (k) {
      case 'hush':
        // A finger at the lips, counting the room in.
        return { l: c.bd(0.2, 0.8 * k1, 0.14), gl: 0.3, r: c.bd(-0.03, 1.36 * k1, 0.14), gr: 0.55, nod: 0.02, n };
      case 'murmur':
        // A crowd at a market: turning to nobody, chatting with hands.
        return { l: c.bd(0.28, (1.08 + 0.05 * Math.sin(c.t * 3.2)) * k1, 0.24), gl: 0.15, r: c.bd(-0.28, (1.08 + 0.05 * Math.sin(c.t * 4.1)) * k1, 0.24), gr: 0.15, palms: 0.5, lean: 0.05 * Math.sin(c.t * 1.3), nod: 0.04 + 0.05 * Math.sin(c.t * 2.5), n };
      case 'swell':
        return { l: c.bd(0.3, (1.14 + 0.22 * u) * k1, 0.26), gl: 0.3, r: c.bd(-0.3, (1.14 + 0.22 * u) * k1, 0.26), gr: 0.3, palms: 0.5, lean: 0.04, nod: -0.04 * u, n };
      case 'cheer':
        return { l: c.bd(0.26, (1.62 + 0.03 * Math.sin(c.t * 9)) * k1, 0.14), gl: 0.9, r: c.bd(-0.26, (1.62 - 0.03 * Math.sin(c.t * 9)) * k1, 0.14), gr: 0.9, lean: -0.05, nod: -0.16, n };
      default:
        return { ...easy(c), nod: 0.08, n };
    }
  },
};

// =============================================================================================
// 폴리 테이블 (vaFoleyTable, 3 × 2): a table of noises at the back, a gravel tray and a board tray on the floor before it.

export const FT = {
  gravel: [-0.72, 0.62] as readonly [number, number],
  boards: [0.5, 0.62] as readonly [number, number],
  top: 0.86,
  tray: 0.05,
  /** A little door in its frame: the handle at rest, and the hinge. */
  doorX: -0.95,
  handle: [-0.8, 1.04, -0.1] as V,
  plate: [0.08, 0.87, -0.12] as V,
  heelRest: [0.34, 0.92, -0.14] as V,
  film: [0.92, 0.9, -0.1] as V,
  stand: 0.18,
};
const STEPS: Script = {
  seq: [['look', 1.6], ['gravel', 4.6], ['cross', 0.3, 1.2], ['boards', 4.2], ['stop', 1.6, 1.2]],
  // On the trays, 5 cm up off the floor.
  at: (k) => ({ ...(k === 'gravel' ? st(FT.gravel[0], FT.gravel[1], PI, 0.9) : k === 'boards' ? st(FT.boards[0], FT.boards[1], PI, 1.25) : k === 'cross' ? st(FT.boards[0], FT.boards[1]) : st(FT.gravel[0], FT.gravel[1])), y: FT.tray }),
  key(k, u, c) {
    const n = { crunch: k === 'gravel' ? 1 : 0, knock: k === 'boards' ? 1 : 0, rec: k === 'gravel' || k === 'boards' ? 1 : 0, head: k === 'look' ? 0.1 : k === 'gravel' ? 0.1 + 0.45 * u : k === 'cross' ? 0.55 : k === 'boards' ? 0.55 + 0.4 * u : 0.95, scene: wrap(c.round, CAST.length), heel: 0 };
    if (k === 'gravel' || k === 'boards') return { nod: 0.12, lean: 0.04, n, props: { heel: FT.heelRest } };
    return { ...easy(c), nod: 0.04, n, props: { heel: FT.heelRest } };
  },
};
const PROPS: Script = {
  seq: [['door', 3.4], ['slam', 1.2], ['take', 1.2], ['heel', 3.8], ['back', 1.0], ['film', 3.4], ['ok', 1.2]],
  at: (k) => (k === 'door' || k === 'slam' ? st(FT.handle[0] + 0.08, FT.stand) : k === 'film' || k === 'ok' ? st(FT.film[0] - 0.02, FT.stand) : st(FT.plate[0] + 0.02, FT.stand)),
  key(k, u, c) {
    const up = Math.abs(Math.sin(c.t * 5.5));
    const heelAt: V = k === 'take' ? lerpV(FT.heelRest, add(FT.plate, 0, 0.14, 0), sm(u, 0.1, 0.9)) : k === 'back' ? lerpV(add(FT.plate, 0, 0.14, 0), FT.heelRest, sm(u, 0.1, 0.9)) : k === 'heel' ? add(FT.plate, 0.02 * Math.sin(c.t * 2.75), 0.055 + 0.07 * up, 0) : FT.heelRest;
    // A slow creak open, then shut in one go.
    const open = k === 'door' ? 0.9 * sm(u, 0.05, 0.95) : k === 'slam' ? 0.9 * (1 - sm(u, 0.1, 0.35)) : 0;
    const n = { door: open, slam: k === 'slam' ? 1 - sm(u, 0.25, 0.8) : 0, tap: k === 'heel' && up < 0.2 ? 1 : 0, fire: k === 'film' ? 1 : 0, crumple: k === 'film' ? 0.5 + 0.5 * Math.sin(c.t * 11) : 0, rec: k === 'ok' || k === 'take' || k === 'back' ? 0 : 1, head: frac(c.t / 26), scene: wrap(c.round, CAST.length) };
    const props = { heel: heelAt };
    // The handle goes round the hinge with the door.
    const hx = FT.doorX + (FT.handle[0] - FT.doorX) * Math.cos(open);
    const hz = FT.handle[2] + (FT.handle[0] - FT.doorX) * Math.sin(open);
    const onHandle: V = [hx, FT.handle[1], hz];
    const k1 = c.H / 1.6;
    switch (k) {
      case 'door':
        return { r: onHandle, gr: 0.8, palms: 0.2, l: c.bd(0.22, 0.82 * k1, 0.12), gl: 0.3, lean: 0.14, nod: 0.26, n, props };
      case 'slam':
        return { r: onHandle, gr: 0.85, palms: 0.2, l: c.bd(0.22, 0.82 * k1, 0.12), gl: 0.3, lean: 0.2, nod: 0.3, n, props };
      case 'take':
      case 'heel':
      case 'back':
        return { l: add(FT.plate, -0.2, 0.03, 0.06), gl: 0.15, palms: 0.05, tool: 'heel', lean: 0.15, nod: 0.3, n, props };
      case 'film': {
        const cr = 0.03 * Math.sin(c.t * 11);
        return { l: add(FT.film, -0.08 - cr, 0.05, 0.06), gl: 0.7, r: add(FT.film, 0.08 + cr, 0.05, 0.06), gr: 0.7, palms: 0.3, lean: 0.16, nod: 0.28, n, props };
      }
      default:
        return { ...easy(c), nod: 0.1, n, props };
    }
  },
};

// =============================================================================================
// 목 관리 차 코너 (vaTeaCorner, 2 × 1): a kettle, pear-and-balloon-flower tea, honey, a shelf of cups.

export const TC = {
  stand: 0.4,
  /** Where they stand, across. */
  at: 0.32,
  cup: [0.42, 0.93, 0.08] as V,
  button: [0.33, 1.1, 0.03] as V,
};
const TEA: Script = {
  seq: [['take', 1.6], ['fill', 3.0], ['carry', 1.0], ['steam', 3.6], ['sip', 2.4], ['ease', 2.4], ['sip2', 2.2], ['back', 1.4]],
  at: () => st(TC.at, TC.stand),
  key(k, u, c) {
    const k1 = c.H / 1.6;
    const chest = c.bd(-0.04, 1.08 * k1, 0.2);
    const chin = c.bd(-0.02, 1.32 * k1, 0.17);
    const mouth = c.bd(0, 1.39 * k1, 0.1);
    const cup: V = k === 'take' ? add(TC.cup, 0, 0.05 * sm(u, 0.4, 1), 0) : k === 'fill' ? add(TC.cup, 0, 0.05, 0) : k === 'carry' ? lerpV(add(TC.cup, 0, 0.05, 0), chest, sm(u, 0, 1)) : k === 'steam' ? lerpV(chest, chin, sm(u, 0, 0.3)) : k === 'sip' || k === 'sip2' ? lerpV(chest, mouth, sm(u, 0, 0.35) * (1 - sm(u, 0.72, 1))) : k === 'back' ? lerpV(chest, TC.cup, sm(u, 0.1, 0.9)) : chest;
    const n = { water: k === 'take' ? 0 : k === 'fill' ? u : 1, pouring: k === 'fill' && u < 0.9 ? 1 : 0, steam: k === 'take' ? 0 : 1, tilt: k === 'sip' || k === 'sip2' ? sm(u, 0.2, 0.4) * (1 - sm(u, 0.65, 0.85)) : 0 };
    const props = { cup };
    const free = c.bd(0.2, 0.84 * k1, 0.12);
    switch (k) {
      case 'fill':
        return { l: add(TC.button, 0, 0.03, 0.05), gl: 0.15, palms: 0.1, tap: u < 0.9, tool: 'cup', lean: 0.1, nod: 0.28, n, props };
      case 'steam':
        // The steam breathed in, eyes shut: it's for the throat.
        return { l: c.bd(0.1, 1.12 * k1, 0.14), gl: 0.3, tool: 'cup', nod: 0.2, lean: 0.04 + 0.02 * Math.sin(c.t * 1.5), shut: u > 0.3, n, props };
      case 'ease':
        // A hand round the throat, warm from the cup, a slow swallow.
        return { l: c.bd(0.05, 1.26 * k1, 0.09), gl: 0.15, palms: 0.9, tool: 'cup', nod: 0.05, lean: -0.02, shut: true, n, props };
      case 'sip':
      case 'sip2':
        return { l: free, gl: 0.3, tool: 'cup', nod: 0.08 - 0.22 * sm(u, 0.1, 0.4) * (1 - sm(u, 0.7, 1)), n, props };
      default:
        return { l: free, gl: 0.3, tool: 'cup', nod: 0.22, lean: 0.08, n, props };
    }
  },
};

// =============================================================================================
// 대본 선반 (vaScriptRack, 2 × 1): a tall rack of bound scripts by title; one comes out into the left arm.

export const SR = {
  stand: 0.42,
  slot: [-0.2, 1.14, 0.0] as V,
};
const PICK_SCRIPT: Script = {
  seq: [['scan', 2.0], ['pull', 1.4], ['read', 3.2], ['flip', 1.8], ['part', 2.6], ['back', 1.4]],
  at: () => st(-0.12, SR.stand),
  key(k, u, c) {
    const hold = c.bd(0.1, 1.05 * (c.H / 1.6), 0.28);
    const n = { page: c.p('flip', 0.1, 0.8), hi: c.p('part', 0.2, 0.5) * (1 - c.p('back', 0, 0.3)) };
    const script: V = k === 'pull' ? lerpV(SR.slot, hold, sm(u, 0.15, 1)) : k === 'back' ? lerpV(hold, SR.slot, sm(u, 0.2, 1)) : k === 'scan' ? SR.slot : hold;
    const props = { script };
    switch (k) {
      case 'scan':
        return { l: easy(c).l, gl: 0.3, r: c.bd(-0.14, 1.2 + 0.05 * Math.sin(c.t * 2), 0.3), gr: 0.2, palms: 0.2, nod: 0.05, lean: 0.08, n, props };
      case 'flip':
        return { tool: 'script', r: add(hold, 0.1 - 0.2 * sm(u, 0.1, 0.8), 0.06, 0), gr: 0.1, palms: 0.1, nod: 0.3, n, props };
      case 'part':
        return { tool: 'script', r: add(hold, 0.06, 0.05, 0.02 * Math.sin(c.t * 1.4)), gr: 0.15, palms: 0.1, nod: 0.34, lean: 0.03, n, props };
      case 'read':
        return { tool: 'script', r: add(hold, 0.13, 0.04, 0), gr: 0.1, palms: 0.1, nod: 0.3, n, props };
      default:
        return { tool: 'script', r: easy(c).r, gr: 0.3, nod: 0.26, lean: k === 'back' ? 0.1 : 0.05, n, props };
    }
  },
};

// =============================================================================================
// 연출석 (vaCrewDesk, 3 × 2): the director and the engineer seated at a long desk; standing at its left end, a clipboard on the arm.

export const CD = {
  director: [-0.1, 0.47, 0.38] as V,
  engineer: [0.85, 0.47, 0.38] as V,
  top: 0.78,
  stand: [-0.92, 0.42] as readonly [number, number],
  screen: [-0.42, 1.14, -0.68] as V,
};
const TAKE_YAW = PI - 0.25;
const PICK_TAKE: Script = {
  seq: [['look', 2.6], ['point', 2.6], ['talk', 3.0], ['listen', 2.6], ['write', 2.6], ['bow', 1.4]],
  at: () => st(CD.stand[0], CD.stand[1], TAKE_YAW),
  key(k, u, c) {
    const k1 = c.H / 1.6;
    const hold = c.bd(0.1, 1.02 * k1, 0.27);
    const n = { take: wrap(c.round, 6), picked: c.p('point', 0.4, 0.7), chosen: c.p('write', 0.1, 0.9), drTalks: k === 'listen' ? 1 : 0, drNods: k === 'talk' ? 1 : 0, drPoints: k === 'listen' ? 1 : 0 };
    const props = { clip: hold };
    switch (k) {
      case 'point':
        return { tool: 'clip', r: c.bd(-0.14, 1.26 * k1, 0.42), gr: 0.55, palms: 0.2, lean: 0.1, nod: -0.02, n, props };
      case 'talk':
        return { tool: 'clip', r: c.bd(-0.28, (1.08 + 0.04 * Math.sin(c.t * 3)) * k1, 0.24), gr: 0.15, palms: 0.5, nod: 0.08 + 0.04 * Math.sin(c.t * 3.2), n, props };
      case 'listen':
        return { tool: 'clip', r: easy(c).r, gr: 0.3, nod: 0.1 + 0.06 * Math.sin(c.t * 2.4), n, props };
      case 'write':
        return { tool: 'clip', r: add(hold, -0.04 + 0.08 * frac(u * 3), 0.05, 0), gr: 0.55, palms: 0.05, nod: 0.34, n, props };
      case 'bow':
        return { tool: 'clip', r: easy(c).r, gr: 0.3, nod: 0.2, lean: 0.05 + 0.2 * Math.sin(u * PI), n, props };
      default:
        return { tool: 'clip', r: easy(c).r, gr: 0.3, lean: 0.06, nod: 0.08, n, props };
    }
  },
};

const SCRIPTS: Record<VaMotion, Script> = {
  vaDub: DUB,
  vaUrgent: URGENT,
  vaStudy: STUDY,
  vaWatch: WATCH,
  vaWarm: WARM,
  vaVoice: VOICE,
  vaNarrate: NARR,
  vaCopy: COPY,
  vaMix: MIX,
  vaDirect: DIRECT,
  vaEnsemble: ENSEMBLE,
  vaWalla: WALLA,
  vaFoleySteps: STEPS,
  vaFoleyProps: PROPS,
  vaTea: TEA,
  vaPickScript: PICK_SCRIPT,
  vaPickTake: PICK_TAKE,
};
