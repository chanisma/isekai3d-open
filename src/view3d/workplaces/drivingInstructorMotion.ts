import * as THREE from 'three';
import type { BarOffset, BodyAt, Doing, Work } from '../activity';

/*
 * A driving instructor's work at the 운전면허학원 (2026-10-27 workplace pipeline, at the user's
 * request: the work should look like the work). Sat in the training car's passenger seat beside the
 * student while the car pulls out of its bay and reverses back in (the 후진 주차): watching, pointing
 * the way ahead, a finger up at the mirror, a hand reached over onto the wheel, braced when the
 * dual brake goes down; a cone carried from the stack to its painted spot on the course and back;
 * the examiner sat in the 검정 booth scoring the run and leaning in to the mic; and pointing a
 * student through a screen (the simulator, the 학과시험 kiosk).
 *
 * The car's round (parkRound) and the coaching run by the same clock, so the brace comes when the
 * brake lights do (workplaces/drivingInstructor.ts moves the car with it); the cone's round gives the
 * hands as offsets (BarOffset: to the instructor's left, up, away from them) from where they work,
 * and where the cone is, so the piece moves the cone with the hands. Kept out of activity.ts (which
 * only hands these motions over here) so it imports nothing from it at run time.
 */
export type DriveMotion = 'diCoach' | 'diCone' | 'diExamine' | 'diPoint';
export const DRIVE_MOTIONS = new Set<string>(['diCoach', 'diCone', 'diExamine', 'diPoint']);

const bo = (side: number, up: number, ahead: number): BarOffset => ({ side, up, ahead });
const boMix = (a: BarOffset, b: BarOffset, e: number): BarOffset => bo(a.side + (b.side - a.side) * e, a.up + (b.up - a.up) * e, a.ahead + (b.ahead - a.ahead) * e);
const sstep = THREE.MathUtils.smoothstep;
const frac = (x: number) => ((x % 1) + 1) % 1;
const wave = (t: number, hz: number, ph = 0) => Math.sin((t * hz + ph) * Math.PI * 2);
/** Eased along keys [u, value]: held before the first and after the last. */
function keyed<T>(keys: Array<[number, T]>, u: number, mix: (a: T, b: T, e: number) => T): T {
  if (u <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (u < keys[i][0]) return mix(keys[i - 1][1], keys[i][1], sstep(u, keys[i - 1][0], keys[i][0]));
  return keys[keys.length - 1][1];
}
const num = (a: number, b: number, e: number) => a + (b - a) * e;
/** The clock offset of a fixed mark (as activity.ts toolPhase), so two pieces aren't in step. */
export const drvPhase = (p: THREE.Vector3) => frac(p.x * 0.373 + p.z * 0.619);

// ---------------------------------------------------------------------------------------------
// The training car's 후진 주차 (teachParking): the car's run and the instructor beside the student.

/** One run in and out of the bay, seconds. */
export const PARK_LEN = 36;
/**
 * Where the training car is in its run at `t` (all cars by the same clock): parked in its bay; it
 * pulls forward out of it, turning a little (`x` along its length, `yaw` about its middle, `steer` the
 * wheel's turn); stops; reverse in (the reversing lights on), straightening as it backs in; a sharp
 * stop on the line (the instructor's brake); sat a while with the handbrake on.
 */
export function parkRound(t: number) {
  const s = frac(t / PARK_LEN) * PARK_LEN;
  const x = keyed<number>([[5, 0], [13, 0.85], [17, 0.85], [27, 0.04], [28, 0]], s, num);
  const yaw = keyed<number>([[5, 0], [9, -0.05], [13, -0.13], [17, -0.13], [21, -0.15], [25, -0.03], [27.5, 0]], s, num);
  const steer = keyed<number>([[5, 0], [6.5, -1.6], [11, -1.6], [12.5, 0], [17.5, 0], [18.8, 1.9], [22, 1.9], [23.5, -0.6], [26.5, 0]], s, num);
  const reversing = s >= 16.5 && s < 28;
  const braking = (s >= 12.6 && s < 16.5) || (s >= 26.8 && s < 30);
  return { s, x, yaw, steer, reversing, braking };
}

type CoachKey = 'watch' | 'explain' | 'point' | 'mirror' | 'wheel' | 'brace';
/** What the instructor's doing through the run (seconds into it). */
const COACH: Array<[number, CoachKey]> = [
  [0, 'explain'], [4, 'watch'], [6, 'point'], [10.5, 'watch'], [13, 'explain'], [16.2, 'mirror'], [18.5, 'wheel'], [22.5, 'mirror'], [25.2, 'watch'],
  [26.6, 'brace'], [29.5, 'explain'], [33.5, 'watch'],
];
function coachAt(s: number): { from: CoachKey; to: CoachKey; e: number } {
  let i = COACH.length - 1;
  while (i > 0 && s < COACH[i][0]) i--;
  const next = COACH[(i + 1) % COACH.length];
  const end = i + 1 < COACH.length ? next[0] : PARK_LEN;
  // Each beat eases in over its first 0.6 s from the one before.
  const prev = COACH[(i + COACH.length - 1) % COACH.length][1];
  const e = sstep(s - COACH[i][0], 0, Math.min(0.6, end - COACH[i][0]));
  return { from: prev, to: COACH[i][1], e };
}

// ---------------------------------------------------------------------------------------------
// The cones (setupCourse): one carried from the stack to its painted spot, then back on the next round.

/** From where the instructor works (the floor ahead of them): the stack's place and the painted spot. */
export const CONE = { stack: bo(0.3, 0, -0.02), spot: bo(-0.2, 0, 0.06), grip: 0.4, nest: 0.07 };
/**
 * A cone moved, ~11 s a round, stood over it: crouched to the stack and the top cone taken in both
 * hands, lifted, carried across and set on its spot, its base nudged straight; stood up for a look
 * down the course. On the next round it's fetched back off the spot onto the stack. `cone` is where
 * the cone's base is (`held` while it's carried), `out` whether it's out on its spot.
 */
export function coneRound(t: number, ph: number) {
  const c = t / 11 + ph * 3;
  const n = Math.floor(c);
  const u = c - n;
  const there = n % 2 === 0;
  const from = there ? CONE.stack : CONE.spot;
  const to = there ? CONE.spot : CONE.stack;
  const fromUp = there ? CONE.nest : 0;
  const toUp = there ? 0 : CONE.nest;
  const lift = (o: BarOffset, up: number) => bo(o.side, o.up + up, o.ahead);
  const base = keyed<BarOffset>(
    [
      [0.2, lift(from, fromUp)],
      [0.32, lift(from, fromUp + 0.42)],
      [0.5, lift(boMix(from, to, 0.5), 0.48)],
      [0.62, lift(to, toUp + 0.12)],
      [0.68, lift(to, toUp)],
    ],
    u,
    boMix,
  );
  const held = u >= 0.2 && u < 0.68;
  const crouch = sstep(u, 0.06, 0.18) * (1 - sstep(u, 0.3, 0.4)) + sstep(u, 0.5, 0.6) * (1 - sstep(u, 0.8, 0.9));
  const nudge = u >= 0.68 && u < 0.8 ? 0.01 * Math.sin((u - 0.68) * 160) : 0;
  return { n, u, base, held, crouch, nudge, out: there ? u >= 0.68 : u < 0.2 };
}

// ---------------------------------------------------------------------------------------------
// The 검정 booth (superviseExam): scoring the run, the mic.

/** The mic's talk key from the score sheet (the booth's frame as the examiner sits facing it). */
export const MIC = bo(-0.25, 0.03, -0.07);
/** Leaning in to call the next one (`talk` 0–1), ~14 s a round. */
export function examRound(t: number, ph: number) {
  const u = frac(t / 14 + ph);
  const talk = sstep(u, 0.52, 0.58) * (1 - sstep(u, 0.78, 0.84));
  const look = u < 0.5 ? Math.max(0, wave(t, 0.11, ph)) ** 4 : 0;
  return { u, talk, look };
}

// ---------------------------------------------------------------------------------------------

/** The hands and the bend for a driving instructor's motion (activity.ts doing hands these over). */
export function driveDoing(m: DriveMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  const UP = new THREE.Vector3(0, 1, 0);
  const H = b.height;
  const k = H / 1.6;
  const y0 = b.base.y;
  const chest = y0 + (b.sitting ? 0.3 : 0.7) * H;
  const waist = y0 + (b.sitting ? 0.12 : 0.56) * H;
  const front = (ahead: number, side: number, y: number) => b.base.clone().addScaledVector(fwd, ahead).addScaledVector(left, side).setY(y);
  const off = (p: THREE.Vector3, o: BarOffset) => p.clone().addScaledVector(left, o.side).addScaledVector(UP, o.up).addScaledVector(fwd, o.ahead);
  const reachTo = (from: THREE.Vector3, p: THREE.Vector3, most: number) => from.clone().addScaledVector(p.clone().sub(from).normalize(), Math.min(most, p.distanceTo(from)));
  switch (m) {
    case 'diCoach': {
      // In the passenger seat, the student on their left; `work` the wheel's hub.
      const run = parkRound(t);
      const beat = coachAt(run.s);
      const lap = (side: number) => front(0.24 * k, side * 0.11 * k, y0 + 0.13 * k);
      const hub = work?.point ?? front(0.5 * k, 0.62 * k, chest + 0.1 * k);
      const shoulderL = front(0, 0.17 * k, chest + 0.12 * k);
      type Key = { l: THREE.Vector3; r: THREE.Vector3; lean: number; nod: number; palms: number; gl: number; gr: number };
      const pose = (key: CoachKey): Key => {
        switch (key) {
          case 'explain':
            return { l: front(0.3 * k, 0.12 * k, chest - 0.04 * k + 0.04 * k * wave(t, 0.7)), r: front(0.3 * k, -0.08 * k, chest - 0.06 * k + 0.03 * k * wave(t, 0.9, 0.3)), lean: 0.04, nod: 0, palms: -0.7, gl: 0.3, gr: 0.3 };
          case 'point': {
            // Out through the windscreen, the way to go.
            const way = front(1.2 * k, 0.35 * k, chest + 0.25 * k + 0.03 * k * wave(t, 0.5));
            return { l: reachTo(shoulderL, way, 0.56 * k), r: lap(-1), lean: 0.06, nod: -0.04, palms: 0.1, gl: 0.6, gr: 0.3 };
          }
          case 'mirror': {
            // A finger up at the mirror: check behind.
            const mirror = front(0.62 * k, 0.32 * k, y0 + 0.5 * H);
            return { l: reachTo(shoulderL, mirror, 0.55 * k), r: lap(-1), lean: 0, nod: -0.12, palms: 0.2, gl: 0.6, gr: 0.3 };
          }
          case 'wheel':
            // Reached over, a hand on the near side of the rim, turning it with the student.
            return { l: off(hub, bo(-0.15 * Math.cos(run.steer * 0.25), 0.15 * Math.sin(run.steer * 0.25) - 0.02, -0.02)), r: lap(-1), lean: 0.14, nod: 0.1, palms: 0.6, gl: 0.9, gr: 0.3 };
          case 'brace':
            // The dual brake stamped down: braced on the dash, the other arm out across the student.
            return { l: front(0.42 * k, 0.32 * k, chest + 0.02 * k), r: front(0.5 * k, -0.08 * k, chest + 0.06 * k), lean: -0.06, nod: 0.05, palms: 0.9, gl: 0.2, gr: 0.4 };
          default:
            return { l: lap(1), r: lap(-1), lean: 0.02, nod: 0.02 * wave(t, 0.2), palms: 1.4, gl: 0.25, gr: 0.25 };
        }
      };
      const a = pose(beat.from);
      const z = pose(beat.to);
      const e = beat.e;
      return {
        reach: {
          l: a.l.clone().lerp(z.l, e),
          r: a.r.clone().lerp(z.r, e),
          lean: num(a.lean, z.lean, e),
          nod: num(a.nod, z.nod, e),
          palms: num(a.palms, z.palms, e),
          grip: { l: num(a.gl, z.gl, e), r: num(a.gr, z.gr, e) },
        },
      };
    }
    case 'diCone': {
      // Stood over the course; `work` the floor between the stack and the cone's spot.
      const p = work?.point ?? front(0.45, 0, y0);
      const c = coneRound(t, drvPhase(b.base));
      const top = (o: BarOffset) => bo(o.side, o.up + CONE.grip, o.ahead);
      const restL = front(0.12, 0.22 * k, waist - 0.05 * k);
      const restR = front(0.12, -0.22 * k, waist - 0.05 * k);
      const hold = c.base;
      const atCone = c.crouch > 0.05 || c.held;
      const l = atCone ? off(p, top(bo(hold.side + 0.06, hold.up - 0.04, hold.ahead + c.nudge))) : restL;
      const r = atCone ? off(p, top(bo(hold.side - 0.06, hold.up - 0.04, hold.ahead + c.nudge))) : restR;
      return { reach: { l, r, lean: 0.12 + 0.3 * c.crouch, nod: 0.25 + 0.25 * c.crouch, palms: 0.9, grip: { l: c.held ? 0.85 : 0.3, r: c.held ? 0.85 : 0.3 } }, crouch: c.crouch };
    }
    case 'diExamine': {
      // Sat at the booth's desk; `work` the score sheet. Ticking the sheet, a look up at the screens,
      // the right hand to the mic's key and leaning in to call the next one.
      const p = work?.point ?? front(0.35, 0, y0 + 0.3);
      const ex = examRound(t, drvPhase(p));
      const pen = off(p, bo(-0.03 + 0.025 * wave(t, 2.1), 0.01 + 0.006 * wave(t, 4.2), 0.02 * wave(t, 1.1)));
      const key = off(p, bo(MIC.side, MIC.up + 0.01, MIC.ahead));
      const r = pen.clone().lerp(key, ex.talk);
      const l = off(p, bo(0.17, 0, -0.03));
      return { reach: { l, r, lean: 0.25 + 0.15 * ex.talk - 0.15 * ex.look, nod: 0.4 - 0.25 * ex.talk - 0.45 * ex.look, palms: 1.2, grip: { l: 0.2, r: 0.85 - 0.5 * ex.talk } } };
    }
    case 'diPoint': {
      // Stood at a screen beside a student (`work` on it): a clipboard in the left hand; the right
      // points things out on the screen, taps one, turns open-handed to explain, and back.
      const p = work?.point ?? front(0.5 * k, 0, chest + 0.1 * k);
      const u = frac(t / 9 + drvPhase(p));
      const shoulder = front(0, -0.17 * k, chest + 0.12 * k);
      const clip = front(0.22 * k, 0.1 * k, waist + 0.16 * k);
      const trace = off(p, bo(0.12 * Math.sin(u * Math.PI * 4), 0.06 * Math.cos(u * Math.PI * 6), -0.04));
      const tip = reachTo(shoulder, trace, 0.6 * k);
      const tap = 0.015 * Math.max(0, wave(t, 1.6)) ** 6;
      const open = front(0.3 * k, -0.24 * k, chest - 0.02 * k);
      const e = sstep(u, 0.55, 0.62) * (1 - sstep(u, 0.86, 0.94));
      const r = tip.addScaledVector(fwd, tap).lerp(open, e);
      return { reach: { l: clip, r, lean: 0.05, nod: 0.12 - 0.14 * e, palms: num(0.1, -0.6, e), grip: { l: 0.8, r: num(0.6, 0.25, e) } } };
    }
  }
}
