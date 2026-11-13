import * as THREE from 'three';
import { marker, shade, spot, tint, type Builder, type Built, type Spot } from './parts';
import { box, cyl, part, rbox } from './toon';
import type { Grip, HeldTool } from './handTool';

/**
 * The cleaning tools for a house (2026-11-01, at the user's request), each standing where it's kept.
 * The dweller steps up, takes the tool out, turns round to the open floor in front, works it and puts it
 * back (handTool.ts): the head of the tool is what's choreographed, on the floor, and the hands hold it.
 */
const HANDLE = '#c9a77c';
const UP = new THREE.Vector3(0, 1, 0);
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const smooth = (u: number) => THREE.MathUtils.smoothstep(u, 0, 1);

/** Where a dweller stands to work (the middle of the tile side), and a step closer to take the tool. */
const STAND_Z = 0.56;
const NEAR_Z = 0.36;
const STEP = 0.7;
const TAKE = 0.7;
const TURN = 1.3;
const WORK = 11;

/** One moment of the work, in the dweller's own frame (+z the way they face, +x their left, y up from the floor). */
interface Stroke {
  /** The tool's head on the floor. */
  tip: THREE.Vector3;
  /** The way the tool's +y goes. */
  up: THREE.Vector3;
  /** The tool's turn about its own length. */
  spin: number;
  /** Their feet forward of where they stand (a step with a vacuum's push). */
  step: number;
}

interface LongTool {
  tool: THREE.Object3D;
  /** The head, on the tool. */
  tip: THREE.Vector3;
  grips: (height: number, stroke: Stroke) => Partial<Record<'left' | 'right', Grip>>;
  stroke: (t: number, height: number) => Stroke;
  lean: number;
  nod: number;
}

/** How long a tool stands in a dweller's hands and how its head goes round, for a piece's `away`. */
function longToolRound(s: Spot, out: Built, spec: LongTool) {
  const { tool, tip } = spec;
  const restP = tool.position.clone();
  const restQ = tool.quaternion.clone();
  const pose = new THREE.Object3D();
  let started: number | null = null;

  /** The stroke's pose in the piece's frame, with the dweller turned `yaw` at `z`. */
  const place = (k: Stroke, yaw: number, z: number) => {
    const q = new THREE.Quaternion().setFromAxisAngle(UP, yaw);
    pose.quaternion.copy(q).multiply(new THREE.Quaternion().setFromUnitVectors(UP, k.up.clone().normalize())).multiply(new THREE.Quaternion().setFromAxisAngle(UP, k.spin));
    const at = k.tip.clone().applyQuaternion(q).add(v(0, 0, z));
    pose.position.copy(at).sub(tip.clone().applyQuaternion(pose.quaternion));
  };
  const blend = (e: number) => {
    tool.position.lerpVectors(restP, pose.position, e);
    tool.quaternion.slerpQuaternions(restQ, pose.quaternion, e);
  };

  out.away = (_away, t) => {
    const posed = (s.at.userData.posedAt as number | undefined) ?? -1e9;
    const using = Math.abs(t - posed) < 0.6;
    if (!using) {
      started = null;
      s.held = null;
      s.at.position.z = STAND_Z;
      s.at.rotation.y = Math.PI;
      tool.position.copy(restP);
      tool.quaternion.copy(restQ);
      return;
    }
    started ??= t;
    const height = (s.at.userData.height as number | undefined) ?? 1.6;
    const round = 2 * (STEP + TAKE + TURN) + WORK;
    let e = (t - started) % round;
    const first = spec.stroke(0, height);
    // A round is mirrored about the work: step in, take it, turn; work; turn back, put it down, step back.
    const work = e > STEP + TAKE + TURN && e < STEP + TAKE + TURN + WORK;
    const k = work ? spec.stroke(e - (STEP + TAKE + TURN), height) : first;
    const grips = spec.grips(height, k);
    if (work) {
      place(k, 0, STAND_Z + k.step);
      tool.position.copy(pose.position);
      tool.quaternion.copy(pose.quaternion);
      s.at.rotation.y = 0;
      s.at.position.z = STAND_Z + k.step;
      s.held = { tool, grips, lead: 'right', anchor: tip, lean: spec.lean, nod: spec.nod };
      return;
    }
    if (e >= STEP + TAKE + TURN + WORK) e = round - e;
    if (e < STEP) {
      // Up to it, hands empty.
      s.at.position.z = THREE.MathUtils.lerp(STAND_Z, NEAR_Z, smooth(e / STEP));
      s.at.rotation.y = Math.PI;
      s.held = null;
      tool.position.copy(restP);
      tool.quaternion.copy(restQ);
    } else if (e < STEP + TAKE) {
      // Hands on it where it stands.
      s.at.position.z = NEAR_Z;
      s.at.rotation.y = Math.PI;
      tool.position.copy(restP);
      tool.quaternion.copy(restQ);
      s.held = { tool, grips, lead: 'right', resting: true, lean: 0.12, nod: 0.25 };
    } else {
      // Lifted out in front of them, then turned round with it to the open floor.
      const u = (e - STEP - TAKE) / TURN;
      const out1 = smooth(Math.min(1, u / 0.4));
      const turn = smooth(Math.max(0, (u - 0.4) / 0.6));
      const yaw = Math.PI * (1 - turn);
      const z = THREE.MathUtils.lerp(NEAR_Z, STAND_Z, out1);
      s.at.position.z = z;
      s.at.rotation.y = yaw;
      place(first, yaw, z);
      // Off the floor while it's carried round.
      pose.position.y += 0.06 * Math.sin(Math.PI * u);
      blend(out1);
      s.held = { tool, grips, lead: 'right', lean: 0.1, nod: 0.25 };
    }
  };
}

/** Takes a long-handled tool out of its piece: the dweller's spot at the front, the work on the floor beyond. */
function longToolPiece(g: THREE.Object3D, out: Built, spec: LongTool, workY: number) {
  out.work = marker(g, 0, workY, 0.12);
  const s = spot(g, 'stand', 0, 0, STAND_Z, Math.PI);
  s.motion = 'still';
  out.spots = { '*': s };
  longToolRound(s, out, spec);
}

/** How high the top hand is on a long handle, of their height: at the chest, so the lower hand at the waist is still within reach. */
const HANDS_UP = 0.7;

/** A handle held at the height of the hands: how far along it from the head that is. */
export function handleGrips(tipY: number, gap: number) {
  return (height: number, k: Stroke) => {
    const hands = v(-0.03, HANDS_UP * height, 0.26);
    const along = hands.distanceTo(k.tip) + tipY;
    const axis = v(0, 1, 0);
    return {
      right: { at: v(0, along, 0), axis, shape: 'power' as const },
      left: { at: v(0, along - gap * (height / 1.6), 0), axis, shape: 'power' as const, slide: true },
    };
  };
}

/** The handle from the head on the floor up through where the hands are. */
export const upTo = (tip: THREE.Vector3, height: number, handsX = -0.03) => v(handsX, HANDS_UP * height, 0.26).sub(tip).normalize();

/** Little round things, in few triangles: shared by size. */
const dots = new Map<number, THREE.SphereGeometry>();
function dot(r: number): THREE.SphereGeometry {
  let g = dots.get(r);
  if (!g) dots.set(r, (g = new THREE.SphereGeometry(r, 8, 6)));
  return g;
}

/** What a tool's work leaves on the floor or does to the piece, each frame after its hands are placed: `working` once it's turned to the open floor. */
function eachFrame(out: Built, s: Spot, f: (t: number, working: boolean, held: Spot['held']) => void) {
  const round = out.away!;
  out.away = (a, t) => {
    round(a, t);
    f(t, !!s.held?.anchor, s.held);
  };
}
/** The point `tip` of a tool, in the frame of the piece it's a child of. */
const onPiece = (tool: THREE.Object3D, tip: THREE.Vector3) => tip.clone().applyQuaternion(tool.quaternion).add(tool.position);

const STRAW = '#d8b566';

/** A straw broom, its foot at the origin, the handle up +y. */
export function broomTool(g: THREE.Object3D, c: string): THREE.Group {
  const broom = new THREE.Group();
  broom.name = 'broom';
  g.add(broom);
  part(broom, cyl(0.014, 0.014, 1.15, 8), HANDLE, 0, 0.72, 0, { outline: false });
  part(broom, cyl(0.016, 0.016, 0.03, 8), shade(c, 0.6), 0, 1.3, 0, { outline: false });
  // The head: the straw bound in three bands, fanning out to its foot.
  part(broom, rbox(0.15, 0.09, 0.05, 0.015), STRAW, 0, 0.19, 0, { outline: false });
  for (const y of [0.17, 0.195, 0.22]) part(broom, box(0.156, 0.008, 0.054), c, 0, y, 0, { outline: false });
  for (let i = 0; i < 11; i++) {
    const k = (i - 5) / 5;
    part(broom, box(0.024, 0.15, 0.04), i % 2 ? STRAW : shade(STRAW, 0.88), k * 0.115, 0.075, 0, { rz: k * 0.2, outline: false });
  }
  return broom;
}

/** A string mop, its clamp at the origin, the handle up +y; `handle` long. */
export function mopTool(g: THREE.Object3D, handle = 1.05): { mop: THREE.Group; strings: THREE.Group } {
  const mop = new THREE.Group();
  mop.name = 'mop';
  g.add(mop);
  part(mop, cyl(0.013, 0.013, handle, 8), HANDLE, 0, handle / 2 - 0.025, 0, { outline: false });
  part(mop, cyl(0.022, 0.03, 0.05, 10), '#78909c', 0, 0.045, 0, { outline: false });
  // The strings, splayed from the clamp, and turning a little with how it's pushed.
  const strings = new THREE.Group();
  mop.add(strings);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const r = i % 2 ? 0.05 : 0.075;
    part(strings, cyl(0.009, 0.007, 0.1, 5), i % 3 ? '#eceff1' : '#cfd8dc', Math.cos(a) * r, -0.005, Math.sin(a) * r, { rz: -Math.cos(a) * 0.9, rx: Math.sin(a) * 0.9, outline: false });
  }
  return { mop, strings };
}

export const CLEANING_DETAIL: Record<string, Builder> = {
  /** A straw broom hung on a wooden peg rack, a dustpan and hand brush at its foot; swept side to side, a little dust going before it and a pile that goes down. */
  broomSet(g, _W, _D, c, _def, _ctx, out) {
    part(g, rbox(0.36, 0.024, 0.28, 0.008), '#7a5a42', 0, 0.012, -0.05);
    for (const s of [-1, 1]) part(g, rbox(0.03, 1.02, 0.03, 0.008), '#7a5a42', s * 0.16, 0.52, -0.16);
    part(g, rbox(0.36, 0.06, 0.024, 0.008), '#8d6a4e', 0, 1.02, -0.16);
    part(g, rbox(0.36, 0.05, 0.024, 0.008), '#8d6a4e', 0, 0.6, -0.16);
    for (const x of [-0.05, 0.1]) part(g, cyl(0.008, 0.008, 0.05, 6), '#c9a24b', x, 1.02, -0.135, { rx: Math.PI / 2, outline: false });
    // A cloth hanging on the other peg.
    part(g, rbox(0.1, 0.2, 0.012, 0.005), tint(c, 0.5), 0.1, 0.91, -0.125);
    const broom = broomTool(g, c);
    broom.position.set(-0.05, 0, -0.08);
    broom.rotation.z = 0.05;
    const pan = new THREE.Group();
    pan.position.set(0.1, 0.024, 0.05);
    g.add(pan);
    part(pan, rbox(0.2, 0.012, 0.18, 0.004), tint(c, 0.15), 0, 0.01, 0);
    part(pan, rbox(0.2, 0.06, 0.012, 0.004), shade(c, 0.85), 0, 0.04, -0.09);
    for (const s of [-1, 1]) part(pan, box(0.008, 0.04, 0.17), shade(c, 0.85), s * 0.1, 0.03, 0, { outline: false });
    part(pan, cyl(0.009, 0.009, 0.2, 6), shade(c, 0.7), 0, 0.15, -0.095, { outline: false });
    part(pan, rbox(0.14, 0.03, 0.05, 0.01), '#a97d4c', 0.02, 0.035, 0.0, { ry: 0.3 });
    longToolPiece(g, out, {
      tool: broom,
      tip: v(0, 0, 0),
      grips: handleGrips(0, 0.2),
      lean: 0.2,
      nod: 0.42,
      stroke: (t, height) => {
        const a = (t * Math.PI * 2) / 1.5;
        // Drawn across along the floor, lifted a little on the way back for the next stroke.
        const tip = v(0.26 * Math.sin(a), 0.02 * Math.max(0, Math.cos(a)), 0.6 + 0.05 * Math.cos(a));
        return { tip, up: upTo(tip, height, -0.03 + 0.05 * Math.sin(a)), spin: Math.PI / 2 + 0.25 * Math.sin(a), step: 0 };
      },
    }, 0.92);
    // Dust: what's swept, on the floor ahead, and a puff at the bristles.
    const dust = new THREE.Group();
    dust.visible = false;
    g.add(dust);
    out.inUse = dust;
    const specks = Array.from({ length: 7 }, (_, i) => part(dust, dot(0.03), '#b7ab98', 0.26 * Math.sin(i * 2.3), 0.01, STAND_Z + 0.6 + 0.09 * Math.cos(i * 1.7), { outline: false, shadow: false }));
    const puffs = Array.from({ length: 3 }, () => part(dust, dot(0.03), '#d8d0c2', 0, 0, 0, { outline: false, shadow: false }));
    for (const p of puffs) p.scale.setScalar(0.001);
    let began: number | null = null;
    eachFrame(out, out.spots!['*'], (t, working) => {
      if (!working) {
        began = null;
        return;
      }
      began ??= t;
      const left = Math.max(0.001, 1 - (t - began) / WORK);
      specks.forEach((m, i) => m.scale.set(left * (1 + (i % 3) * 0.5), 0.35 * left, left * (1 + (i % 2) * 0.4)));
      const at = onPiece(broom, v(0, 0, 0));
      puffs.forEach((m, i) => {
        const u = (t * 1.3 + i / 3) % 1;
        m.position.set(at.x + 0.08 * Math.sin(i * 2.1), 0.02 + 0.14 * u, at.z + 0.05 * Math.cos(i * 1.3));
        m.scale.setScalar(Math.max(0.001, (0.6 + 1.2 * u) * (1 - u)));
      });
    });
  },
  /** A wringer bucket on casters with a string mop standing in it: the water rocks and the press comes down as the mop's taken out, and its head goes in an eight, leaving the floor wet behind it. */
  mopBucket(g, _W, _D, c, _def, _ctx, out) {
    part(g, cyl(0.17, 0.135, 0.27, 18), c, 0, 0.175, -0.03);
    for (const y of [0.08, 0.3]) part(g, cyl(y > 0.2 ? 0.174 : 0.15, y > 0.2 ? 0.174 : 0.15, 0.012, 18), shade(c, 0.8), 0, y, -0.03, { outline: false });
    const surface = part(g, cyl(0.155, 0.155, 0.006, 16), '#a9d6ee', 0, 0.309, -0.03, { outline: false });
    // The wringer: its yellow basket across the rim, and the press on its lever.
    part(g, rbox(0.34, 0.03, 0.09, 0.01), '#fdd835', 0, 0.325, -0.03);
    part(g, rbox(0.03, 0.12, 0.09, 0.01), '#fbc02d', 0.13, 0.385, -0.03);
    const press = new THREE.Group();
    press.name = 'press';
    press.position.set(0.14, 0.44, -0.03);
    g.add(press);
    part(press, rbox(0.11, 0.03, 0.08, 0.01), '#f9a825', -0.05, 0, 0);
    part(press, cyl(0.011, 0.011, 0.4, 8), '#78909c', 0.02, 0.2, 0, { rz: -0.1, outline: false });
    part(press, rbox(0.04, 0.05, 0.03, 0.012), '#37474f', 0.04, 0.41, 0);
    for (const [x, z] of [[-0.11, -0.13], [0.11, -0.13], [-0.11, 0.07], [0.11, 0.07]]) {
      part(g, cyl(0.026, 0.026, 0.024, 10), '#37474f', x, 0.03, z, { rz: Math.PI / 2 });
      part(g, box(0.02, 0.02, 0.02), '#90a4ae', x, 0.056, z, { outline: false });
    }
    const { mop, strings } = mopTool(g);
    mop.position.set(0.02, 0.28, -0.03);
    mop.rotation.z = -0.07;
    const tipY = -0.03;
    longToolPiece(g, out, {
      tool: mop,
      tip: v(0, tipY, 0),
      grips: handleGrips(tipY, 0.2),
      lean: 0.2,
      nod: 0.4,
      stroke: (t, height) => {
        const a = (t * Math.PI * 2) / 2.4;
        const tip = v(0.26 * Math.sin(a), 0, 0.6 + 0.1 * Math.sin(2 * a));
        return { tip, up: upTo(tip, height, -0.03 + 0.05 * Math.sin(a)), spin: 0, step: 0 };
      },
    }, 0.9);
    // Where it's been: wet patches that dry in turn.
    const wet = new THREE.Group();
    wet.visible = false;
    g.add(wet);
    out.inUse = wet;
    const wetMat = new THREE.MeshBasicMaterial({ color: '#cfe8f4', transparent: true, opacity: 0.42, depthWrite: false });
    const patches = Array.from({ length: 18 }, () => {
      const m = new THREE.Mesh(cyl(0.11, 0.11, 0.002, 12), wetMat);
      m.position.y = 0.006;
      m.castShadow = false;
      m.scale.setScalar(0.001);
      wet.add(m);
      return { m, at: -1e9 };
    });
    patches[0].m.userData.ownMaterial = true;
    let next = 0;
    let lastStamp = -1e9;
    let pressed = 0;
    let was = false;
    eachFrame(out, out.spots!['*'], (t, working, held) => {
      // Rocks while it's being worked from; the press comes down while it's being taken out.
      surface.rotation.z = held ? 0.05 * Math.sin(t * 3.1) : 0;
      surface.rotation.x = held ? 0.04 * Math.cos(t * 2.3) : 0;
      pressed = THREE.MathUtils.damp(pressed, held?.resting ? 1 : 0, 8, 0.016);
      press.rotation.z = -0.42 * pressed;
      strings.rotation.y = working ? 0.6 * Math.sin(t * 2.6) : 0;
      if (working && !was) for (const p of patches) p.at = -1e9;
      was = working;
      if (!working) return;
      if (t - lastStamp > 0.3) {
        lastStamp = t;
        const p = patches[next % patches.length];
        next = (next + 1) % patches.length;
        const at = onPiece(mop, v(0, tipY, 0));
        p.m.position.x = at.x;
        p.m.position.z = at.z;
        p.at = t;
      }
      for (const p of patches) p.m.scale.setScalar(Math.max(0.001, 1 - (t - p.at) / 5.4));
    });
  },
  /** An upright vacuum cleaner: the nozzle on the floor with its lamp, wheels, a bag that fills as it runs, the cord wound on its hooks, the handle. Pushed and pulled, a step with each push. */
  vacuumCleaner(g, _W, _D, c, _def, _ctx, out) {
    const vac = new THREE.Group();
    vac.name = 'vacuum';
    g.add(vac);
    part(vac, rbox(0.32, 0.06, 0.22, 0.024), '#37474f', 0, 0.04, 0.05, { outline: false });
    part(vac, box(0.3, 0.012, 0.02), shade(c, 0.9), 0, 0.055, 0.15, { outline: false });
    part(vac, rbox(0.3, 0.014, 0.05, 0.006), '#212121', 0, 0.01, 0.12, { outline: false });
    const lamp = new THREE.Mesh(rbox(0.1, 0.022, 0.012, 0.005), new THREE.MeshBasicMaterial({ color: '#8d8a78' }));
    lamp.userData.ownMaterial = true;
    lamp.position.set(0, 0.052, 0.163);
    vac.add(lamp);
    const wheels = [-1, 1].map((sx) => {
      const w = part(vac, cyl(0.045, 0.045, 0.028, 12), '#212121', sx * 0.17, 0.045, -0.04, { rz: Math.PI / 2, outline: false });
      part(w, box(0.01, 0.03, 0.06), '#90a4ae', 0, 0, 0, { outline: false });
      return w;
    });
    part(vac, cyl(0.03, 0.03, 0.26, 10), '#546e7a', 0, 0.06, -0.04, { rz: Math.PI / 2, outline: false });
    // The body: a motor at its foot, the bag above it.
    part(vac, rbox(0.2, 0.14, 0.15, 0.04), shade(c, 0.85), 0, 0.15, -0.04, { outline: false });
    const bag = part(vac, rbox(0.19, 0.34, 0.14, 0.06), c, 0, 0.38, -0.04, { outline: false });
    part(vac, rbox(0.12, 0.1, 0.008, 0.008), tint(c, 0.6), 0, 0.42, 0.034, { outline: false });
    part(vac, cyl(0.012, 0.012, 0.01, 10), '#f4f4f4', 0.06, 0.18, 0.036, { rx: Math.PI / 2, outline: false });
    const led = new THREE.Mesh(cyl(0.008, 0.008, 0.008, 8), new THREE.MeshBasicMaterial({ color: '#5a6a5a' }));
    led.userData.ownMaterial = true;
    led.rotation.x = Math.PI / 2;
    led.position.set(-0.05, 0.18, 0.036);
    vac.add(led);
    part(vac, cyl(0.016, 0.016, 0.62, 8), '#90a4ae', 0, 0.82, -0.05, { outline: false });
    part(vac, rbox(0.2, 0.03, 0.03, 0.01), '#212121', 0, 1.14, -0.05, { outline: false });
    // The cord wound on two hooks up the back.
    for (const y of [0.52, 0.76]) part(vac, box(0.05, 0.012, 0.03), '#37474f', 0, y, -0.08, { outline: false });
    for (let i = 0; i < 4; i++) part(vac, box(0.008 + i * 0.008, 0.225, 0.006), '#263238', 0, 0.64, -0.09 - i * 0.004, { outline: false });
    const LEN = 1.14;
    const tip = v(0, 0, -0.05);
    longToolPiece(g, out, {
      tool: vac,
      tip,
      grips: () => ({
        right: { at: v(-0.06, LEN, -0.05), axis: v(1, 0, 0), palm: v(0, -1, 0), shape: 'power' },
        left: { at: v(0.06, LEN, -0.05), axis: v(-1, 0, 0), palm: v(0, -1, 0), shape: 'power' },
      }),
      lean: 0.14,
      nod: 0.32,
      stroke: (t, height) => {
        // The handle at the height of the hands: the shorter the dweller the further it tips over.
        const sin = Math.min(0.95, (0.66 * height) / LEN);
        const cos = Math.sqrt(1 - sin * sin);
        const a = (t * Math.PI * 2) / 2.6;
        const push = 0.12 * Math.sin(a);
        return { tip: v(0.06 * Math.sin(a * 0.5), 0, 0.32 + cos * LEN + push), up: v(0, sin, -cos), spin: 0, step: 0.09 * Math.sin(a) };
      },
    }, 0.98);
    // A little dust on the floor drawn in under the nozzle as it comes.
    const air = new THREE.Group();
    air.visible = false;
    g.add(air);
    out.inUse = air;
    const motes = Array.from({ length: 4 }, () => part(air, dot(0.012), '#c9c1b2', 0, 0.02, 0, { outline: false, shadow: false }));
    let run = 0;
    eachFrame(out, out.spots!['*'], (t, working) => {
      run = THREE.MathUtils.damp(run, working ? 1 : 0, 3, 0.016);
      bag.scale.set(1 + 0.05 * run, 1 + 0.015 * run, 1 + 0.07 * run);
      (lamp.material as THREE.MeshBasicMaterial).color.set(working ? '#fff4c2' : '#8d8a78');
      (led.material as THREE.MeshBasicMaterial).color.set(working ? '#7dff9a' : '#5a6a5a');
      if (!working) return;
      for (const w of wheels) w.rotation.x = Math.sin((t * Math.PI * 2) / 2.6) * 1.6;
      const at = onPiece(vac, v(0, 0, 0.12));
      motes.forEach((m, i) => {
        const u = (t * 1.5 + i / 4) % 1;
        m.position.set(at.x + (i - 1.5) * 0.05 * (1 - u), 0.015 + 0.03 * u, at.z + 0.18 * (1 - u));
      });
    });
  },
  /** A cart of bottles, sponges and cloths: a push bar, a deep tray, gloves, a brush and a bin bag; the spray taken from the top, a puff on the shelf, wiped round with a cloth. */
  cleaningCart(g, _W, _D, c, _def, _ctx, out) {
    for (const y of [0.1, 0.42, 0.74]) {
      part(g, rbox(0.46, 0.02, 0.32, 0.01), c, 0, y, -0.03);
      part(g, box(0.46, 0.035, 0.008), shade(c, 0.85), 0, y + 0.018, 0.13, { outline: false });
    }
    for (const [x, z] of [[-0.22, -0.18], [0.22, -0.18], [-0.22, 0.12], [0.22, 0.12]]) {
      part(g, cyl(0.009, 0.009, 0.72, 6), shade(c, 0.7), x, 0.42, z, { outline: false });
      part(g, cyl(0.026, 0.026, 0.022, 10), '#37474f', x, 0.03, z, { rz: Math.PI / 2 });
    }
    // A push bar at the back, and a bin bag hung from its end.
    for (const s of [-1, 1]) part(g, cyl(0.009, 0.009, 0.22, 6), shade(c, 0.7), s * 0.22, 0.88, -0.18, { outline: false });
    part(g, cyl(0.012, 0.012, 0.46, 8), '#455a64', 0, 0.98, -0.18, { rz: Math.PI / 2 });
    part(g, rbox(0.09, 0.42, 0.12, 0.04), '#5f6b73', 0.3, 0.36, -0.03);
    part(g, box(0.1, 0.02, 0.13), '#8a969d', 0.3, 0.56, -0.03, { outline: false });
    // On the middle shelf, a row of bottles of different shapes; a pump, a cap, a trigger.
    const bottles = ['#ffca28', '#42a5f5', '#ef5350', '#66bb6a'];
    bottles.forEach((col, i) => {
      const x = -0.15 + i * 0.1;
      part(g, cyl(0.026 + (i % 2) * 0.006, 0.036, 0.14, 10), col, x, 0.5, -0.03);
      part(g, cyl(0.012, 0.018, 0.03, 8), '#fafafa', x, 0.585, -0.03, { outline: false });
      if (i % 2) part(g, box(0.008, 0.012, 0.03), '#fafafa', x, 0.6, -0.018, { outline: false });
      part(g, box(0.045, 0.06, 0.002), '#fbf6ea', x, 0.5, 0.008, { outline: false });
    });
    // At the bottom: two sponges, a scrubbing brush, a stack of folded cloths; yellow gloves over the edge up top.
    part(g, rbox(0.12, 0.05, 0.08, 0.015), '#fff176', -0.12, 0.14, 0.02);
    part(g, rbox(0.12, 0.018, 0.08, 0.006), '#558b2f', -0.12, 0.172, 0.02, { outline: false });
    part(g, rbox(0.12, 0.05, 0.08, 0.015), '#81c784', 0.04, 0.14, 0.02);
    part(g, rbox(0.12, 0.024, 0.06, 0.008), '#a97d4c', 0.14, 0.123, -0.1);
    part(g, box(0.1, 0.02, 0.05), '#efe3c8', 0.14, 0.144, -0.1, { outline: false });
    for (let i = 0; i < 3; i++) part(g, rbox(0.14, 0.022, 0.1, 0.006), ['#b3e5fc', '#f8bbd0', '#dcedc8'][i], -0.12, 0.122 + i * 0.024, -0.11);
    part(g, rbox(0.075, 0.14, 0.02, 0.008), '#ffd54f', -0.2, 0.7, 0.14);
    part(g, rbox(0.075, 0.12, 0.02, 0.008), '#ffca28', -0.13, 0.71, 0.145);
    // The cloth, folded on top, and the spray beside it, each its own thing to pick up.
    const clothRest = v(-0.1, 0.78, -0.03);
    const cloth = new THREE.Group();
    cloth.position.copy(clothRest);
    g.add(cloth);
    part(cloth, rbox(0.14, 0.05, 0.12, 0.01), '#e1f5fe', 0, 0, 0, { outline: false });
    part(cloth, box(0.142, 0.004, 0.122), '#b3e5fc', 0, 0, 0, { outline: false });
    const sprayRest = v(0.1, 0.83, -0.03);
    const spray = new THREE.Group();
    spray.name = 'spray';
    spray.position.copy(sprayRest);
    g.add(spray);
    part(spray, cyl(0.026, 0.036, 0.16, 10), '#26c6da', 0, 0, 0, { outline: false });
    part(spray, box(0.05, 0.07, 0.002), '#fbf6ea', 0, -0.01, 0.033, { outline: false });
    part(spray, cyl(0.012, 0.02, 0.03, 8), '#fafafa', 0, 0.09, 0, { outline: false });
    part(spray, rbox(0.04, 0.04, 0.11, 0.01), '#fafafa', 0, 0.12, -0.02, { outline: false });
    part(spray, rbox(0.012, 0.05, 0.016, 0.005), '#ef5350', 0, 0.085, -0.03, { rx: 0.25, outline: false });
    const puff = part(spray, cyl(0.004, 0.05, 0.14, 8), '#e1f5fe', 0, 0.12, -0.14, { rx: -Math.PI / 2, outline: false });
    puff.visible = false;

    out.work = marker(g, 0, 0.82, 0.12);
    const s = spot(g, 'stand', 0, 0, STAND_Z, Math.PI);
    s.motion = 'still';
    out.spots = { '*': s };
    // Facing the cart: their right is +x here.
    const grips: HeldTool['grips'] = { right: { at: v(0, 0.01, 0), axis: v(0, 1, 0), shape: 'trigger', radius: 0.032 } };
    const shelf = (x: number, z: number) => v(x, 0.78, z);
    const worldOf = (p: THREE.Vector3) => g.localToWorld(p.clone());
    let started: number | null = null;
    out.away = (_away, t) => {
      const posed = (s.at.userData.posedAt as number | undefined) ?? -1e9;
      if (Math.abs(t - posed) >= 0.6) {
        started = null;
        s.held = null;
        s.at.position.z = STAND_Z;
        spray.position.copy(sprayRest);
        spray.rotation.set(0, 0, 0);
        cloth.position.copy(clothRest);
        puff.visible = false;
        return;
      }
      started ??= t;
      const e = (t - started) % 15;
      const near = smooth(Math.min(1, e / STEP)) * (1 - smooth(Math.max(0, (e - 14.2) / 0.8)));
      s.at.position.z = THREE.MathUtils.lerp(STAND_Z, NEAR_Z, near);
      // Up and in front of them at the cart's top, tipped at what's to be sprayed.
      const lifted = smooth(THREE.MathUtils.clamp((e - 1.5) / 0.8, 0, 1)) * (1 - smooth(THREE.MathUtils.clamp((e - 11.6) / 0.8, 0, 1)));
      const aim = v(0.14, 0.98, 0.14);
      spray.position.lerpVectors(sprayRest, aim, lifted);
      spray.rotation.set(-0.5 * lifted, 0, 0);
      const squeezing = e > 2.6 && e < 4.4 && (e * 2.5) % 1 < 0.45;
      puff.visible = squeezing;
      // The cloth: picked up, round the shelf in loops, folded back.
      const wiping = e > 4.4 && e < 11;
      const a = (e - 4.4) * 3.2;
      const clothAt = wiping ? shelf(-0.04 + 0.1 * Math.cos(a), -0.03 + 0.08 * Math.sin(a)) : clothRest;
      const clothK = smooth(THREE.MathUtils.clamp((e - 3.8) / 0.6, 0, 1)) * (1 - smooth(THREE.MathUtils.clamp((e - 11) / 0.6, 0, 1)));
      cloth.position.lerpVectors(clothRest, clothAt, clothK);
      if (e < STEP) {
        s.held = null;
        return;
      }
      s.held = {
        tool: spray,
        grips,
        lead: 'right',
        resting: e < 1.5 || e > 12.4,
        lean: 0.2,
        nod: 0.42,
        free: e > 3.3 && e < 11.8 ? { left: worldOf(cloth.position.clone().add(v(0, 0.05, 0))) } : undefined,
        freeShape: 'flat',
      };
    };
  },
};
