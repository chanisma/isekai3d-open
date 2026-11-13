import * as THREE from 'three';
import type { BarOffset, BodyAt, Doing, Work } from '../activity';

/*
 * At a 카센터's lift, tyre changer and tool wall (2026-10-27, the 자동차 정비소, at the user's request:
 * working under a car should look like it). Each round gives the hands as offsets (BarOffset: to the
 * mechanic's left, up, away from them) from where they work, and what the tools, the wheel, the plug
 * and the scanner are doing by the same clock (mechPhase of the mechanic's spot), so the pieces
 * (workplaces/mechanic.ts) move them in step with the hands. Kept out of activity.ts (which only
 * hands these motions over here) so it imports nothing from it at run time.
 */
export type MechanicMotion = 'underCar' | 'impactWrench' | 'obdScan' | 'tyreLever' | 'hangTool';
export const MECHANIC_MOTIONS = new Set<string>(['underCar', 'impactWrench', 'obdScan', 'tyreLever', 'hangTool']);

const bo = (side: number, up: number, ahead: number): BarOffset => ({ side, up, ahead });
const boAdd = (a: BarOffset, b: BarOffset): BarOffset => bo(a.side + b.side, a.up + b.up, a.ahead + b.ahead);
const boMix = (a: BarOffset, b: BarOffset, e: number): BarOffset => bo(a.side + (b.side - a.side) * e, a.up + (b.up - a.up) * e, a.ahead + (b.ahead - a.ahead) * e);
const numMix = (a: number, b: number, e: number) => a + (b - a) * e;
const sstep = THREE.MathUtils.smoothstep;
/** Eased along keys [u, value]: held before the first and after the last. */
function keyed<T>(keys: Array<[number, T]>, u: number, mix: (a: T, b: T, e: number) => T): T {
  if (u <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (u < keys[i][0]) return mix(keys[i - 1][1], keys[i][1], sstep(u, keys[i - 1][0], keys[i][0]));
  return keys[keys.length - 1][1];
}
const frac = (x: number) => ((x % 1) + 1) % 1;
/** The same clock offset as activity.ts toolPhase: from where the mechanic stands, so two lifts aren't in step. */
export const mechPhase = (p: THREE.Vector3) => frac(p.x * 0.373 + p.z * 0.619);

// ---------------------------------------------------------------------------------------------
// Under the raised car (underCar): the oil pan's drain plug and the bolts round it.

/**
 * Stood under a car up on the lift, the arms up, ~16 s round (`work` the drain plug on the oil pan's
 * underside, straight ahead and overhead). The ratchet on the plug, the right hand working its handle
 * round in short strokes (a quick flick back between), the left palm flat on the pan steadying; the
 * ratchet off (`ratchet` false: it goes back on the caddy's tray) and the last turns by the fingers;
 * the plug drawn down and out, the oil running (`oil` 0–1) into the caddy's funnel while the plug is
 * held aside and the eyes follow the stream; the plug back in and finger-tight. `swing` is the
 * ratchet handle's angle about the plug (in the mechanic's frame: 0 straight back to the right),
 * `plug` where the plug is.
 */
export const UNDER = { handle: 0.2, back: -Math.PI * 0.75 };
export function underCarRound(t: number, phase: number) {
  const u = frac(t / 16 + phase);
  const s = frac(t * 0.85 + phase * 3);
  const swing = s < 0.72 ? -0.45 + 0.9 * sstep(s, 0, 0.72) : 0.45 - 0.9 * sstep(s, 0.72, 1);
  const th = UNDER.back + swing;
  const grip = bo(Math.cos(th) * UNDER.handle, -0.035, Math.sin(th) * UNDER.handle);
  const fingers = bo(-0.035, -0.035, -0.01);
  const twist = bo(0.012 * Math.sin(t * Math.PI * 2 * 1.4), 0, 0);
  const aside = bo(-0.22, -0.42, -0.2);
  const ratchet = u < 0.5;
  let r: BarOffset;
  if (u < 0.5) r = grip;
  else if (u < 0.62) r = boAdd(boMix(grip, fingers, sstep(u, 0.5, 0.54)), twist);
  else if (u < 0.88) r = keyed<BarOffset>([[0.62, fingers], [0.66, bo(-0.08, -0.12, -0.06)], [0.72, aside]], u, boMix);
  else if (u < 0.96) r = boAdd(keyed<BarOffset>([[0.88, aside], [0.92, fingers]], u, boMix), u > 0.92 ? twist : bo(0, 0, 0));
  else r = boMix(fingers, grip, sstep(u, 0.96, 1));
  const l = keyed<BarOffset>([[0.48, bo(0.2, -0.008, 0.04)], [0.52, bo(0.05, -0.03, 0.0)], [0.62, bo(0.05, -0.03, 0.0)], [0.68, bo(0.26, -0.008, -0.08)], [0.9, bo(0.26, -0.008, -0.08)], [0.94, bo(0.05, -0.03, 0.0)]], u, boMix);
  const plugOut = u >= 0.62 && u < 0.93;
  const plug = plugOut ? boAdd(r, bo(0.0, 0.03, 0.0)) : bo(0, -0.012, 0);
  const oil = sstep(u, 0.64, 0.68) * (1 - sstep(u, 0.86, 0.9));
  return { u, l, r, swing, ratchet, plug, plugOut, oil };
}

// ---------------------------------------------------------------------------------------------
// A tyre changed on the lift (impactWrench): the wheel's five nuts, the wheel off and on.

/** The lug nuts' circle (`nutR`), where the gun's grip and the left hand are from its nose, and where it's put down. */
export const IMPACT = {
  nutR: 0.058,
  grip: bo(-0.01, -0.075, -0.17),
  hold: bo(0.035, 0.025, -0.07),
  rest: bo(-0.36, -0.37, -0.18),
  /** Where the wheel's set down while it's off (its middle, leaning on the mechanic's left). */
  down: bo(0.4, -0.1, -0.16),
};
export const lugNut = (k: number) => {
  const a = Math.PI / 2 + (((k % 5) + 5) % 5) * ((Math.PI * 2) / 5);
  return bo(Math.cos(a) * IMPACT.nutR, Math.sin(a) * IMPACT.nutR, 0);
};
/**
 * Crouched at a wheel of a car just off the ground, ~22 s round (`work` the middle of the wheel's
 * face). The impact gun run onto each nut in turn (`buzz` while it rattles them loose); the gun put
 * down on the floor; both hands on the tyre and the wheel drawn straight off the studs and set down
 * against the mechanic's left side; a look at the brake disc, a hand on it; the wheel lifted back
 * onto the studs; the gun taken up and each nut run tight again. `gun` is the gun's nose (`held` in
 * the hand, else lying at IMPACT.rest), `wheel` how far the wheel's moved from its place on the hub.
 */
export function impactRound(t: number, phase: number) {
  const u = frac(t / 22 + phase);
  const nose = (k0: number, span: number, from: number) => {
    const v = (u - from) / span;
    const k = Math.floor(v);
    const w = v - k;
    const move = sstep(w, 0, 0.28);
    const a = boMix(lugNut(k0 + k - 1), lugNut(k0 + k), move);
    // Backed off a little while it moves across, then pushed home on the nut.
    return { at: boAdd(a, bo(0, 0, -0.035 * Math.sin(move * Math.PI))), buzz: w > 0.32 && w < 0.92 };
  };
  let gun = IMPACT.rest;
  let held = false;
  let buzz = false;
  if (u < 0.3) {
    const n = nose(0, 0.06, 0);
    gun = n.at;
    held = true;
    buzz = n.buzz;
  } else if (u < 0.35) {
    gun = boMix(lugNut(4), IMPACT.rest, sstep(u, 0.3, 0.35));
    held = true;
  } else if (u >= 0.73 && u < 0.78) {
    gun = boMix(IMPACT.rest, lugNut(0), sstep(u, 0.73, 0.78));
    held = true;
  } else if (u >= 0.78) {
    const n = nose(1, 0.04, 0.78);
    gun = u < 0.98 ? n.at : lugNut(4);
    held = true;
    buzz = u < 0.98 && n.buzz;
  }
  const wheel = keyed<BarOffset>([[0.4, bo(0, 0, 0)], [0.45, bo(0, 0.0, -0.21)], [0.5, IMPACT.down], [0.63, IMPACT.down], [0.69, bo(0, 0.0, -0.21)], [0.73, bo(0, 0, 0)]], u, boMix);
  const rim = (sx: number) => boAdd(wheel, bo(sx * 0.25, 0.04, -0.07));
  let l: BarOffset;
  let r: BarOffset;
  if (held) {
    r = boAdd(gun, IMPACT.grip);
    l = u > 0.33 && u < 0.76 ? boAdd(gun, bo(0.3, 0.1, 0.05)) : boAdd(gun, IMPACT.hold);
    if (u > 0.31 && u < 0.35) l = boMix(boAdd(lugNut(4), IMPACT.hold), rim(1), sstep(u, 0.31, 0.35));
    if (u > 0.73 && u < 0.78) l = boMix(rim(1), boAdd(lugNut(0), IMPACT.hold), sstep(u, 0.73, 0.78));
  } else if (u < 0.5 || u >= 0.62) {
    const e = u < 0.5 ? sstep(u, 0.35, 0.39) : 1;
    l = rim(1);
    r = boMix(boAdd(IMPACT.rest, IMPACT.grip), rim(-1), e);
    if (u >= 0.5) r = boMix(bo(-0.16, -0.18, -0.3), rim(-1), sstep(u, 0.62, 0.65));
  } else {
    // The wheel's down: a hand to the brake disc behind the studs, the other on the knee.
    const look = sstep(u, 0.5, 0.53);
    l = boMix(rim(1), bo(0.03, 0.07, 0.07), look);
    r = boMix(rim(-1), bo(-0.16, -0.18, -0.3), look);
  }
  return { u, l, r, gun, held, buzz, wheel, off: u >= 0.42 && u < 0.71 };
}

// ---------------------------------------------------------------------------------------------
// The OBD scanner (obdScan): plugged in under the dash at the open driver's door, read on a tablet.

/** The tablet held low in the left hand (crouched), and up before the chest in both (stood). */
export const OBD = { low: bo(0.16, 0.3, -0.32), up: bo(0, 0.66, -0.3), half: 0.12 };
/**
 * At a car's open driver's door, ~18 s round (`work` the OBD-II port under the dash). Crouched, the
 * tablet in the left hand, the right takes the VCI off its edge and pushes it into the port till its
 * light comes on (`plugged`); up on the feet, the tablet in both hands before the chest, the live
 * data read, a finger tapping through the codes (`tap`); crouched again, the VCI pulled and put back on
 * the tablet. `tablet` its middle, `dongle` where the VCI is, `crouch` 0–1.
 */
export function obdRound(t: number, phase: number) {
  const u = frac(t / 18 + phase);
  const crouch = keyed<number>([[0.22, 0.72], [0.3, 0], [0.82, 0], [0.88, 0.72]], u, numMix);
  const tablet = keyed<BarOffset>([[0.22, OBD.low], [0.3, OBD.up], [0.82, OBD.up], [0.88, OBD.low]], u, boMix);
  const edgeR = boAdd(tablet, bo(-OBD.half - 0.01, 0, 0));
  const edgeL = boAdd(tablet, bo(OBD.half + 0.01, 0, 0));
  const lowEdge = boAdd(OBD.low, bo(-OBD.half - 0.01, 0, 0));
  const tapping = u > 0.36 && u < 0.8;
  const tap = tapping ? Math.max(0, Math.sin(t * Math.PI * 2 * 0.8 + phase * 9)) ** 6 : 0;
  const tapAt = boAdd(tablet, bo(-0.04 + 0.05 * Math.sin(t * 0.7), 0.02 + 0.03 * tap, -0.02 + 0.02 * tap));
  let r: BarOffset;
  if (u < 0.22) r = keyed<BarOffset>([[0.03, lowEdge], [0.1, bo(0, 0.02, -0.1)], [0.14, bo(0, 0, -0.025)], [0.17, bo(0, 0, 0)], [0.21, bo(-0.02, 0.0, -0.04)]], u, boMix);
  else if (u < 0.82) r = u < 0.36 ? boMix(bo(-0.02, 0, -0.04), edgeR, sstep(u, 0.22, 0.32)) : boMix(edgeR, tapAt, tapping ? sstep(u, 0.36, 0.4) : 0);
  else r = keyed<BarOffset>([[0.84, edgeR], [0.89, bo(0, 0, -0.01)], [0.92, bo(0, 0, -0.01)], [0.95, bo(0, 0.02, -0.12)], [1, lowEdge]], u, boMix);
  const l = edgeL;
  const plugged = u >= 0.17 && u < 0.925;
  const dongle = plugged ? bo(0, 0, 0) : r;
  const low = crouch / 0.72;
  return { u, l, r, crouch, tablet, dongle, plugged, tap, lean: numMix(0.12, 0.36, low), nod: numMix(0.5, 0.3, low) };
}

// ---------------------------------------------------------------------------------------------
// The tyre changer (tyreLever): the bead levered over the mount head, the table turned.

/** The mount head (over the rim's far edge) and the tyre lever's length. */
export const LEVER = { head: bo(0, 0.05, 0.17), len: 0.56 };
/**
 * At a tyre changer, ~12 s round (`work` the middle of the wheel clamped flat on its turntable). Both
 * hands take the tyre lever stood hooked under the bead at the mount head and lever it down towards
 * them, the bead riding up over the head; held down, the left hand pressing the tyre's near wall
 * while the pedal turns the table (`spin`); the lever lifted out and stood up again. `handle` is the
 * lever's grip end, its tip at LEVER.head.
 */
export function leverRound(t: number, phase: number) {
  const u = frac(t / 12 + phase);
  const raised = boAdd(LEVER.head, bo(-0.04, 0.47, -0.27));
  const down = boAdd(LEVER.head, bo(-0.04, 0.12, -0.53));
  const handle = keyed<BarOffset>([[0.08, raised], [0.25, down], [0.7, down], [0.82, raised]], u, boMix);
  const r = boAdd(handle, bo(-0.03, 0.0, 0.0));
  const press = bo(0.15, 0.06, -0.16);
  const l = keyed<BarOffset>([[0.25, boAdd(raised, bo(0.08, -0.04, 0.05))], [0.25, boAdd(handle, bo(0.08, -0.04, 0.05))], [0.32, press], [0.66, press], [0.74, boAdd(raised, bo(0.08, -0.04, 0.05))]], u, boMix);
  const lHand = u < 0.25 || u > 0.74 ? boAdd(handle, bo(0.08, -0.04, 0.05)) : l;
  const spin = u > 0.3 && u < 0.68;
  return { u, l: lHand, r, handle, spin, lean: 0.18 + 0.22 * sstep(u, 0.08, 0.25) * (1 - sstep(u, 0.7, 0.82)) };
}

// ---------------------------------------------------------------------------------------------
// The tool wall (hangTool): a tool off the bench ledge and onto its outline.

/** The ledge below the board (from the board's middle), and the outlines' hooks this round goes to. */
export const HANG = {
  ledge: -0.42,
  ledgeOut: -0.08,
  slots: [bo(-0.32, 0.14, 0), bo(0.22, 0.26, 0), bo(-0.05, -0.08, 0), bo(0.36, -0.02, 0), bo(-0.22, 0.32, 0)],
};
/** Where this round's tool lies on the ledge. */
export const hangPick = (n: number) => bo(-0.3 + frac(n * 0.37) * 0.55, HANG.ledge + 0.02, HANG.ledgeOut);
/**
 * Putting the tools back (organizeTools), stood at the wall, ~7 s a tool: the right hand takes one off
 * the ledge, brings it up to look it over, carries it to its painted outline and slides it onto the
 * hook (`hung`), and comes back; the left rests on the ledge. `n` the round, `slot` its outline,
 * `tool` where it is while `held`.
 */
export function hangRound(t: number, phase: number) {
  const c = t / 7 + phase * 5;
  const n = Math.floor(c);
  const u = c - n;
  const slot = (((n % HANG.slots.length) + HANG.slots.length) % HANG.slots.length);
  const at = HANG.slots[slot];
  const pick = hangPick(n);
  const rest = bo(-0.2, -0.62, -0.28);
  const look = bo(-0.06, -0.12, -0.24);
  const r = keyed<BarOffset>([[0.04, rest], [0.14, boAdd(pick, bo(0, 0.02, 0))], [0.18, boAdd(pick, bo(0, 0.02, 0))], [0.3, look], [0.38, look], [0.5, boAdd(at, bo(0, 0.04, -0.07))], [0.56, boAdd(at, bo(0, 0.02, -0.015))], [0.6, at], [0.66, at], [0.8, rest]], u, boMix);
  const held = u >= 0.17 && u < 0.62;
  const hung = u >= 0.62;
  const tool = held ? r : hung ? at : pick;
  const l = bo(0.3, HANG.ledge + 0.03, HANG.ledgeOut - 0.02);
  return { n, u, slot, r, l, tool, held, hung };
}

// ---------------------------------------------------------------------------------------------

/** The hands and the bend for a mechanic's motion (activity.ts doing hands these over). */
export function mechanicDoing(m: MechanicMotion, b: BodyAt, work: Work | null, t: number): Doing {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  const H = b.height;
  const y0 = b.base.y;
  const across = work?.across ?? left;
  const sl = across.dot(left) >= 0 ? 1 : -1;
  const UP = new THREE.Vector3(0, 1, 0);
  const ph = mechPhase(b.base);
  const ahead = (d: number, y: number) => b.base.clone().addScaledVector(fwd, d).setY(y);
  const off = (p: THREE.Vector3, o: BarOffset) => p.clone().addScaledVector(across, o.side * sl).addScaledVector(UP, o.up).addScaledVector(fwd, o.ahead);
  switch (m) {
    case 'underCar': {
      const p = work?.point ?? ahead(0.4, y0 + 1.12 * H);
      const k = underCarRound(t, ph);
      const watch = k.oil > 0.5 ? 0.18 : 0;
      return { reach: { l: off(p, k.l), r: off(p, k.r), lean: -0.1 + watch, nod: -0.62 + watch * 2.4, palms: 0.2, grip: { l: k.u > 0.5 && k.u < 0.62 ? 0.5 : 0.1, r: k.ratchet || k.plugOut ? 0.9 : 0.55 } } };
    }
    case 'impactWrench': {
      const p = work?.point ?? ahead(0.45, y0 + 0.4);
      const k = impactRound(t, ph);
      const shake = k.buzz ? 0.004 * Math.sin(t * 90) : 0;
      return { reach: { l: off(p, k.l), r: off(p, boAdd(k.r, bo(shake, shake, 0))), lean: 0.32, nod: 0.38, palms: k.held ? 0.5 : 1.0, grip: { l: 0.7, r: k.held ? 0.95 : 0.7 } }, crouch: 1 };
    }
    case 'obdScan': {
      const p = work?.point ?? ahead(0.5, y0 + 0.45);
      const k = obdRound(t, ph);
      return { reach: { l: off(p, k.l), r: off(p, k.r), lean: k.lean, nod: k.nod, palms: 0.9, grip: { l: 0.75, r: k.u > 0.3 && k.u < 0.82 ? 0.3 : 0.8 }, tap: k.tap > 0.2 }, crouch: k.crouch };
    }
    case 'tyreLever': {
      const p = work?.point ?? ahead(0.5, y0 + 0.85);
      const k = leverRound(t, ph);
      return { reach: { l: off(p, k.l), r: off(p, k.r), lean: k.lean, nod: 0.42, palms: 1.0, grip: { l: k.spin ? 0.15 : 0.9, r: 0.95 } } };
    }
    case 'hangTool': {
      const p = work?.point ?? ahead(0.45, y0 + 0.8 * H);
      const k = hangRound(t, ph);
      const y = off(p, k.r).y - y0;
      return { reach: { l: off(p, k.l), r: off(p, k.r), lean: 0.06, nod: THREE.MathUtils.clamp((1.35 - y) * 0.7, -0.2, 0.45), palms: 0.4, grip: { l: 0.2, r: k.held ? 0.85 : 0.35 } } };
    }
  }
}
