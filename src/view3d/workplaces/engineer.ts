import * as THREE from 'three';
import { marker, rod, shade, spot, type Builder, type Spot } from '../parts';
import { PROBE_POINTS, SOLDER_PADS, probeRound, solderRound, toolPhase, type BarOffset, type Motion } from '../activity';
import { ball, box, canvasTexture, cyl, part, rbox } from '../toon';
import { pavementSign } from './dentist';
import { frontDesk } from './frontDesk';

/**
 * The engineering lab drawn as itself (2026-10-27 workplace pipeline, at the user's request):
 * 한결로보틱스 기술연구소, a Korean robotics R&D lab — aluminium-extrusion benches on blue ESD mats,
 * safety yellow and black, white cobots with blue joints, an orange industrial arm in its cage.
 *
 * The robot bench: a half-built delivery robot (AMR) on its stand, one wheel still off, with the
 * cobot beside it holding the checkerboard up to the robot's camera for its calibration. The soldering
 * bench: the board in its holder under the magnifier's ring light, the iron and the solder wire in the
 * hands joint by joint (activity.ts solderRound), the fumes drawn off to the extractor. The scope
 * bench: the probe set on one test point after another while the trace changes on the oscilloscope
 * (probeRound). The test rig: a load frame pressing a beam in three-point bending and a shaker table
 * rattling a battery module, behind the guard, the cycles counted on the controller. The HIL racks:
 * a simulator chassis, the boards under test on their JTAG debuggers, the GPU nodes above; the KVM
 * pulled out with the debugger or the training run on it. The production line's control cabinet: the
 * HMI and its buttons on the doors, the stack light on top, the conveyor beside it carrying housings
 * past the photo-eye; in a breakdown the doors open on the PLC and the stack light flashes red.
 *
 * And what it was missing: the measurement bench, the caged robot cell taught from the pendant (the
 * arm picking and placing parts as it's jogged), the prototyping corner (a desktop CNC mill cutting a
 * pocket, a 3D printer building a bracket layer by layer), the parts kanban, the whiteboard of the
 * robot's block diagram, and the EMC chamber lined with absorber pyramids, its turntable turning the
 * board under test while the spectrum analyser sweeps against the limit line.
 */

const ALU = '#c5cbd0';
const FRAME = '#7d8790';
const DARK = '#2b2f35';
const ESD = '#2f6fa3';
const YELLOW = '#f2c230';
const ROBOT = '#eef1f3';
const JOINT = '#1e88e5';
const ORANGE = '#ff8f1f';
const PCB = '#1f7a4a';
const FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
const MONO = '"Consolas","D2Coding","Menlo",monospace';
const PI = Math.PI;

/** Lit parts (LEDs, displays, beams): one unlit material a colour, shared. */
const lit = new Map<string, THREE.MeshBasicMaterial>();
function glow(color: string): THREE.MeshBasicMaterial {
  let m = lit.get(color);
  if (!m) lit.set(color, (m = new THREE.MeshBasicMaterial({ color })));
  return m;
}
const GLASS = new THREE.MeshToonMaterial({ color: '#d7eef7', transparent: true, opacity: 0.22, depthWrite: false });
const SMOKE = new THREE.MeshToonMaterial({ color: '#1b2430', transparent: true, opacity: 0.45, depthWrite: false });
const FUME = new THREE.MeshBasicMaterial({ color: '#eceff1', transparent: true, opacity: 0.35, depthWrite: false });

const shapes = new Map<string, THREE.BufferGeometry>();
function shape(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let s = shapes.get(key);
  if (!s) shapes.set(key, (s = make()));
  return s;
}
const ring = (r: number, t: number, arc = PI * 2) => shape(`ering${r},${t},${arc.toFixed(3)}`, () => new THREE.TorusGeometry(r, t, 8, 28, arc));
/** A square pyramid of side `s` and height `h`, point up (an absorber cone). */
const pyramid = (s: number, h: number) => shape(`epyr${s},${h}`, () => new THREE.CylinderGeometry(0, s * Math.SQRT1_2, h, 4, 1).rotateY(PI / 4));
/** A coil (a probe's or a pendant's cable) of `turns` round radius `r`, `len` long along y. */
const coil = (r: number, len: number, turns: number) =>
  shape(`ecoil${r},${len},${turns}`, () => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= turns * 16; i++) {
      const a = (i / 16) * PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, (i / (turns * 16)) * len, Math.sin(a) * r));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), turns * 16, 0.004, 5, false);
  });

const paints = new Map<string, THREE.Texture>();
function painted(key: string, cw: number, ch: number, paint: (x: CanvasRenderingContext2D) => void): THREE.Texture {
  let t = paints.get(key);
  if (!t) paints.set(key, (t = canvasTexture(cw, ch, paint)));
  return t;
}
/** A flat picture facing +z (turned by `ry`, tipped by `rx`), always seen in its own colours. */
function sheet(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, 0, 'YXZ');
  g.add(m);
  return m;
}
/** Words on a plate, `bg` behind them (or nothing for 'none'). */
function label(g: THREE.Object3D, text: string, w: number, h: number, x: number, y: number, z: number, bg: string, fg: string, ry = 0, rx = 0, font = FONT): THREE.Mesh {
  const ch = 64;
  const cw = Math.max(64, Math.round((ch * w) / h / 16) * 16);
  const tex = painted(`elabel|${text}|${bg}|${fg}|${cw}|${font}`, cw, ch, (x2) => {
    if (bg !== 'none') {
      x2.fillStyle = bg;
      x2.fillRect(0, 0, cw, ch);
    }
    x2.fillStyle = fg;
    x2.font = `bold ${Math.round(ch * 0.62)}px ${font}`;
    x2.textAlign = 'center';
    x2.textBaseline = 'middle';
    x2.fillText(text, cw / 2, ch * 0.54, cw * 0.94);
  });
  return sheet(g, tex, w, h, x, y, z, ry, rx);
}
/** A screen with a picture on it that the lot lights while it's used: handed out as `out.screen`. */
function screenOf(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, color: '#2a3140' }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, 0, 'YXZ');
  g.add(m);
  return m;
}
/** A group placed and turned in `g`. */
function frame(g: THREE.Object3D, x: number, y: number, z: number, ry = 0, rx = 0, rz = 0): THREE.Group {
  const f = new THREE.Group();
  f.position.set(x, y, z);
  f.rotation.set(rx, ry, rz, 'YXZ');
  g.add(f);
  return f;
}
function satAt(g: THREE.Object3D, x: number, z: number, motion: Motion, work: THREE.Object3D, seat = 0.48, yaw = PI): Spot {
  const s = spot(g, 'sit', x, seat, z, yaw, seat);
  s.work = work;
  s.motion = motion;
  return s;
}
function stoodAt(g: THREE.Object3D, x: number, z: number, motion: Motion, work: THREE.Object3D, yaw = PI): Spot {
  const s = spot(g, 'stand', x, 0, z, yaw);
  s.work = work;
  s.motion = motion;
  return s;
}
/** Whether someone's been posed at a spot just now (activity.ts spotPose marks it). */
const posed = (s: Spot, t: number) => Math.abs(t - ((s.at.userData.posedAt as number | undefined) ?? -1e9)) < 0.6;
const tmp = new THREE.Vector3();
const phaseAt = (s: Spot) => toolPhase(s.at.getWorldPosition(tmp));
/** A point at an offset (activity.ts BarOffset) from `ref`, for a worker facing -z. */
const offAt = (ref: THREE.Vector3, o: BarOffset, v = new THREE.Vector3()) => v.set(ref.x - o.side, ref.y + o.up, ref.z - o.ahead);
const Y = new THREE.Vector3(0, 1, 0);
/** A thin round wire (a cable, the solder) stretched each frame between two points. */
function wire(g: THREE.Object3D, r: number, color: string): THREE.Mesh {
  return part(g, cyl(r, r, 1, 6), color, 0, 0, 0, { outline: false, shadow: false });
}
function stretch(m: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3) {
  const d = tmp.copy(b).sub(a);
  const len = Math.max(1e-4, d.length());
  m.position.copy(a).addScaledVector(d, 0.5);
  m.scale.set(1, len, 1);
  m.quaternion.setFromUnitVectors(Y, d.divideScalar(len));
}
/** Points the group's +y from `from` towards `to` (an iron or a probe, tip first). */
function aim(m: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3) {
  m.position.copy(from);
  m.quaternion.setFromUnitVectors(Y, tmp.copy(to).sub(from).normalize());
}
const sm = THREE.MathUtils.smoothstep;

// ---- A robot arm ----

interface Arm {
  yaw: THREE.Group;
  j1: THREE.Group;
  j2: THREE.Group;
  j3: THREE.Group;
  roll: THREE.Group;
  tool: THREE.Group;
  L1: number;
  L2: number;
  L3: number;
  h0: number;
}
/** Where an arm's tool is: turned `yaw` (0 to the object's front), `r` out and `h` up from its base, tipped `tp` from straight up (π: pointing down), rolled `roll`, the gripper `grip` open (0–1). */
interface ArmPose {
  yaw: number;
  r: number;
  h: number;
  tp: number;
  roll: number;
  grip: number;
}
const P = (yaw: number, r: number, h: number, tp: number, roll = 0, grip = 1): ArmPose => ({ yaw, r, h, tp, roll, grip });
const mixPose = (a: ArmPose, b: ArmPose, e: number): ArmPose => ({
  yaw: a.yaw + (b.yaw - a.yaw) * e,
  r: a.r + (b.r - a.r) * e,
  h: a.h + (b.h - a.h) * e,
  tp: a.tp + (b.tp - a.tp) * e,
  roll: a.roll + (b.roll - a.roll) * e,
  grip: a.grip + (b.grip - a.grip) * e,
});
function keyedPose(keys: Array<[number, ArmPose]>, u: number): ArmPose {
  if (u <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (u < keys[i][0]) return mixPose(keys[i - 1][1], keys[i][1], sm(u, keys[i - 1][0], keys[i][0]));
  return keys[keys.length - 1][1];
}

/**
 * A six-axis arm on its base at (x, y, z), `s` its scale (1: a cobot, about 0.85 m reach): the base
 * turning, the shoulder, the upper arm, the elbow, the forearm, the wrist bending and rolling, the
 * flange; `toolLen` how far the tool's working point is past the flange. Joints in `accent`.
 */
function robotArm(parent: THREE.Object3D, x: number, y: number, z: number, s: number, body: string, accent: string, toolLen: number): Arm {
  const root = frame(parent, x, y, z);
  part(root, cyl(0.1 * s, 0.11 * s, 0.04 * s, 24), '#4a4f55', 0, 0.02 * s, 0);
  const yaw = frame(root, 0, 0.04 * s, 0);
  part(yaw, cyl(0.08 * s, 0.09 * s, 0.13 * s, 24), body, 0, 0.065 * s, 0);
  part(yaw, cyl(0.083 * s, 0.083 * s, 0.016 * s, 24), accent, 0, 0.12 * s, 0, { outline: false });
  const j1 = frame(yaw, 0, 0.17 * s, 0);
  part(j1, cyl(0.075 * s, 0.075 * s, 0.17 * s, 20), body, 0, 0, 0, { rz: PI / 2 });
  for (const sx of [-1, 1]) part(j1, cyl(0.06 * s, 0.06 * s, 0.012 * s, 20), accent, sx * 0.088 * s, 0, 0, { rz: PI / 2, outline: false });
  part(j1, rbox(0.1 * s, 0.38 * s, 0.1 * s, 0.04 * s), body, 0, 0.19 * s, 0);
  const j2 = frame(j1, 0, 0.38 * s, 0);
  part(j2, cyl(0.063 * s, 0.063 * s, 0.15 * s, 20), body, 0, 0, 0, { rz: PI / 2 });
  for (const sx of [-1, 1]) part(j2, cyl(0.05 * s, 0.05 * s, 0.012 * s, 20), accent, sx * 0.078 * s, 0, 0, { rz: PI / 2, outline: false });
  part(j2, cyl(0.042 * s, 0.05 * s, 0.3 * s, 16), body, 0, 0.16 * s, 0);
  const j3 = frame(j2, 0, 0.32 * s, 0);
  part(j3, cyl(0.046 * s, 0.046 * s, 0.11 * s, 16), body, 0, 0, 0, { rz: PI / 2 });
  part(j3, cyl(0.038 * s, 0.038 * s, 0.012 * s, 16), accent, 0.06 * s, 0, 0, { rz: PI / 2, outline: false });
  const roll = frame(j3, 0, 0.045 * s, 0);
  part(roll, cyl(0.036 * s, 0.036 * s, 0.06 * s, 16), body, 0, 0.03 * s, 0);
  part(roll, cyl(0.037 * s, 0.037 * s, 0.01 * s, 16), accent, 0, 0.052 * s, 0, { outline: false });
  part(roll, cyl(0.042 * s, 0.042 * s, 0.014 * s, 16), '#3a3d42', 0, 0.067 * s, 0);
  const tool = frame(roll, 0, 0.074 * s, 0);
  return { yaw, j1, j2, j3, roll, tool, L1: 0.38 * s, L2: 0.32 * s, L3: 0.119 * s + toolLen, h0: 0.21 * s };
}
/** Bends the arm so its tool's working point is where `p` says (two-link IK, elbow up). */
function poseArm(a: Arm, p: ArmPose) {
  const wr = p.r - a.L3 * Math.sin(p.tp);
  const wy = p.h - a.h0 - a.L3 * Math.cos(p.tp);
  const d = THREE.MathUtils.clamp(Math.hypot(wr, wy), Math.abs(a.L1 - a.L2) + 0.01, a.L1 + a.L2 - 0.001);
  const a2 = Math.acos(THREE.MathUtils.clamp((d * d - a.L1 * a.L1 - a.L2 * a.L2) / (2 * a.L1 * a.L2), -1, 1));
  const a1 = Math.atan2(wr, wy) - Math.atan2(a.L2 * Math.sin(a2), a.L1 + a.L2 * Math.cos(a2));
  a.yaw.rotation.y = p.yaw;
  a.j1.rotation.x = a1;
  a.j2.rotation.x = a2;
  a.j3.rotation.x = p.tp - a1 - a2;
  a.roll.rotation.y = p.roll;
}

// ---- Small things ----

/** A lab chair facing +z in its own group, its seat `h` up: five-star base on casters, gas lift, seat and back in `accent` (an ESD chair's). */
function labChair(c: THREE.Object3D, h: number, accent: string) {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * PI * 2 + 0.3;
    rod(c, new THREE.Vector3(0, 0.08, 0), new THREE.Vector3(Math.sin(a) * 0.26, 0.045, Math.cos(a) * 0.26), 0.016, '#3a3d44');
    part(c, ball(0.025), DARK, Math.sin(a) * 0.26, 0.025, Math.cos(a) * 0.26, { outline: false });
  }
  part(c, cyl(0.025, 0.025, h - 0.12, 10), '#dfe4e8', 0, 0.08 + (h - 0.12) / 2, 0, { outline: false });
  part(c, ring(0.2, 0.012), '#dfe4e8', 0, 0.3, 0, { rx: PI / 2, outline: false });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * PI * 2;
    rod(c, new THREE.Vector3(0, 0.3, 0), new THREE.Vector3(Math.sin(a) * 0.2, 0.3, Math.cos(a) * 0.2), 0.008, '#dfe4e8');
  }
  part(c, rbox(0.46, 0.08, 0.44, 0.04), accent, 0, h, 0.01);
  const back = frame(c, 0, h + 0.05, -0.22, 0, -0.12);
  part(back, cyl(0.014, 0.014, 0.2, 8), '#3a3d44', 0, 0.1, -0.01, { outline: false });
  part(back, rbox(0.42, 0.3, 0.06, 0.04), accent, 0, 0.32, 0);
  part(back, box(0.36, 0.04, 0.002), '#ffd54f', 0, 0.42, 0.031, { outline: false });
}

/**
 * An electronics bench (ESD 작업대): a grey steel frame, a light top with a blue anti-static mat and
 * its ground snap, a riser shelf on two posts along the back with a power strip under it. Returns
 * where the top and the shelf are.
 */
function labDesk(g: THREE.Object3D, W: number, D: number) {
  const w = Math.min(W - 0.04, 0.96);
  const d = Math.min(D - 0.34, 0.66);
  const z = -D / 2 + d / 2 + 0.02;
  const ty = 0.75;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) part(g, box(0.045, ty - 0.04, 0.045), FRAME, sx * (w / 2 - 0.04), (ty - 0.04) / 2, z + sz * (d / 2 - 0.05));
    part(g, box(0.05, 0.03, d - 0.04), FRAME, sx * (w / 2 - 0.04), 0.015, z);
  }
  part(g, box(w - 0.1, 0.04, 0.03), FRAME, 0, 0.3, z - d / 2 + 0.05);
  part(g, rbox(w, 0.04, d, 0.012), '#d5d9dc', 0, ty - 0.02, z);
  part(g, box(w + 0.004, 0.02, 0.006), '#9aa3ab', 0, ty - 0.02, z + d / 2, { outline: false });
  part(g, box(w - 0.1, 0.004, d - 0.12), ESD, 0, ty + 0.002, z + 0.04, { outline: false });
  part(g, cyl(0.008, 0.008, 0.006, 10), '#cfd8dc', w / 2 - 0.08, ty + 0.006, z + d / 2 - 0.05, { outline: false });
  // The riser.
  const sy = 1.0;
  const sd = 0.22;
  const sz = z - d / 2 + sd / 2 + 0.01;
  for (const sx of [-1, 1]) part(g, box(0.035, sy - ty, 0.035), FRAME, sx * (w / 2 - 0.03), (sy + ty) / 2, sz - sd / 2 + 0.03);
  part(g, rbox(w - 0.02, 0.025, sd, 0.008), '#b0bec5', 0, sy, sz);
  part(g, rbox(w - 0.2, 0.04, 0.05, 0.01), '#eceff1', 0, sy - 0.04, sz - sd / 2 + 0.04);
  for (let i = 0; i < 5; i++) part(g, box(0.03, 0.02, 0.003), '#455a64', -0.24 + i * 0.12, sy - 0.04, sz - sd / 2 + 0.066, { outline: false });
  label(g, 'ESD 보호 구역', 0.16, 0.035, -w / 2 + 0.14, sy - 0.04, sz - sd / 2 + 0.067, '#ffd600', '#212121');
  return { w, d, z, ty, front: z + d / 2, sy: sy + 0.0125, sz, sd };
}

/** A coloured component drawer cabinet (부품 서랍장) at (x, y, z): rows of little clear drawers. */
function partsDrawers(g: THREE.Object3D, x: number, y: number, z: number, w: number, h: number) {
  part(g, rbox(w, h, 0.12, 0.008), '#eceff1', x, y + h / 2, z);
  const cols = Math.round(w / 0.05);
  const rows = Math.round(h / 0.035);
  const cs = ['#ef5350', '#42a5f5', '#66bb6a', '#ffca28', '#ab47bc'];
  for (let r = 0; r < rows; r++)
    for (let k = 0; k < cols; k++) {
      const dx = x - w / 2 + (k + 0.5) * (w / cols);
      const dy = y + (r + 0.5) * (h / rows);
      part(g, box(w / cols - 0.008, h / rows - 0.008, 0.004), '#cfd8dc', dx, dy, z + 0.061, { outline: false });
      part(g, box(0.012, 0.005, 0.004), cs[(r * 3 + k) % 5], dx, dy - 0.004, z + 0.064, { outline: false });
    }
}

/** Hazard tape (yellow and black stripes) `len` long on the floor at (x, z), turned `ry`. */
function hazardTape(g: THREE.Object3D, x: number, z: number, len: number, ry: number) {
  const tex = painted(`ehaz${Math.round(len * 10)}`, Math.max(32, Math.round(len * 160)), 16, (c) => {
    const W = Math.max(32, Math.round(len * 160));
    c.fillStyle = YELLOW;
    c.fillRect(0, 0, W, 16);
    c.fillStyle = '#212121';
    for (let i = -16; i < W; i += 16) {
      c.beginPath();
      c.moveTo(i, 16);
      c.lineTo(i + 8, 16);
      c.lineTo(i + 16, 0);
      c.lineTo(i + 8, 0);
      c.fill();
    }
  });
  sheet(g, tex, len, 0.05, x, 0.004, z, ry, -PI / 2);
}

/** A stack light tower (적·황·녹) on a pole at (x, y, z); returns its three lit lamps (red, amber, green). */
function stackLight(g: THREE.Object3D, x: number, y: number, z: number, use: THREE.Object3D): THREE.Mesh[] {
  part(g, cyl(0.022, 0.026, 0.03, 12), DARK, x, y + 0.015, z);
  part(g, cyl(0.008, 0.008, 0.08, 8), ALU, x, y + 0.07, z, { outline: false });
  const cols = ['#e53935', '#ffb300', '#43a047'];
  const lamps: THREE.Mesh[] = [];
  cols.forEach((col, i) => {
    const ly = y + 0.27 - i * 0.055;
    part(g, cyl(0.03, 0.03, 0.05, 14), shade(col, 0.6), x, ly, z);
    const l = part(use, cyl(0.031, 0.031, 0.048, 14), col, x, ly, z, { outline: false, material: glow(col) });
    l.visible = false;
    lamps.push(l);
  });
  part(g, cyl(0.03, 0.03, 0.02, 14), DARK, x, y + 0.31, z);
  return lamps;
}

/** A thin laptop open at (x, y, z) turned `ry`, its lid's inside `tex` (lit as `out.screen` if `lit`). */
function laptop(g: THREE.Object3D, x: number, y: number, z: number, ry: number, tex: THREE.Texture, w = 0.3): { screen: THREE.Mesh; keys: THREE.Object3D } {
  const d = w * 0.68;
  const f = frame(g, x, y, z, ry);
  part(f, rbox(w, 0.014, d, 0.006), '#9ea7ad', 0, 0.007, 0);
  part(f, box(w * 0.86, 0.002, d * 0.42), '#2a2d33', 0, 0.0145, -d * 0.12, { outline: false });
  const lid = frame(f, 0, 0.014, -d / 2, 0, -0.3);
  part(lid, rbox(w, d, 0.01, 0.006), '#9ea7ad', 0, d / 2, -0.004);
  part(lid, box(w * 0.93, d * 0.88, 0.001), '#15171b', 0, d / 2, 0.0015, { outline: false });
  const screen = screenOf(lid, tex, w * 0.9, d * 0.84, 0, d / 2, 0.0025);
  for (const [i, col] of [JOINT, YELLOW, '#ef5350'].entries()) part(lid, cyl(0.022, 0.022, 0.002, 14), col, -0.07 + i * 0.07, d / 2 + (i % 2) * 0.04, -0.0095, { rx: PI / 2, outline: false });
  return { screen, keys: marker(f, 0, 0.02, -d * 0.1) };
}

/** A green board (PCB) `w`×`d` lying at (x, y, z): chips, a crystal, resistors, header pins, mounting holes. */
function board(g: THREE.Object3D, x: number, y: number, z: number, w: number, d: number, col = PCB) {
  part(g, box(w, 0.003, d), col, x, y, z, { outline: false });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) part(g, cyl(0.004, 0.004, 0.0035, 8), '#d4af37', x + sx * (w / 2 - 0.008), y + 0.0005, z + sz * (d / 2 - 0.008), { outline: false });
  part(g, box(0.03, 0.005, 0.03), '#212121', x - w * 0.18, y + 0.004, z - d * 0.12, { outline: false });
  part(g, box(0.012, 0.006, 0.02), '#37474f', x + w * 0.22, y + 0.004, z - d * 0.2, { outline: false });
  part(g, box(0.008, 0.004, 0.004), '#c0c4c8', x + w * 0.05, y + 0.003, z - d * 0.28, { outline: false });
  for (let i = 0; i < 4; i++) part(g, box(0.006, 0.003, 0.003), i % 2 ? '#8d6e63' : '#bcaaa4', x + w * 0.2 + i * 0.009, y + 0.003, z + d * 0.1, { outline: false });
  part(g, cyl(0.006, 0.006, 0.014, 10), '#1565c0', x - w * 0.3, y + 0.008, z + d * 0.25, { outline: false });
}

// ---- Pictures ----

function screenBg(x: CanvasRenderingContext2D, w: number, h: number, bg = '#0d1117') {
  x.fillStyle = bg;
  x.fillRect(0, 0, w, h);
}
function text(x: CanvasRenderingContext2D, s: string, px: number, py: number, col: string, size: number, font = FONT, bold = false) {
  x.fillStyle = col;
  x.font = `${bold ? 'bold ' : ''}${size}px ${font}`;
  x.fillText(s, px, py);
}

/** The checkerboard on the cobot's calibration plate. */
const checkerTex = () =>
  painted('eChecker', 140, 100, (x) => {
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, 140, 100);
    x.fillStyle = '#111111';
    for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) if ((r + c) % 2 === 0) x.fillRect(5 + c * 18.6, 4 + r * 18.4, 18.6, 18.4);
  });

/** The laptop on the robot bench: the robot's camera seeing the board, the corners found, the error. */
const calibTex = () =>
  painted('eCalib', 192, 128, (x) => {
    screenBg(x, 192, 128, '#1e2228');
    text(x, '카메라-라이다 캘리브레이션', 6, 12, '#e0e0e0', 9, FONT, true);
    x.fillStyle = '#5d6670';
    x.fillRect(6, 18, 110, 78);
    x.save();
    x.translate(60, 57);
    x.rotate(-0.18);
    x.fillStyle = '#f5f5f5';
    x.fillRect(-36, -26, 72, 52);
    x.fillStyle = '#111';
    for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) if ((r + c) % 2 === 0) x.fillRect(-34 + c * 9.7, -24 + r * 9.6, 9.7, 9.6);
    const cs = ['#ff1744', '#ff9100', '#ffea00', '#00e676', '#2979ff', '#d500f9'];
    for (let r = 1; r < 5; r++)
      for (let c = 1; c < 7; c++) {
        x.fillStyle = cs[(r + c) % 6];
        x.beginPath();
        x.arc(-34 + c * 9.7, -24 + r * 9.6, 1.6, 0, PI * 2);
        x.fill();
      }
    x.restore();
    text(x, '프레임 18 / 25', 122, 30, '#90a4ae', 8);
    text(x, '재투영 오차', 122, 48, '#90a4ae', 8);
    text(x, '0.21 px', 122, 62, '#69f0ae', 12, MONO, true);
    x.fillStyle = '#263238';
    x.fillRect(122, 74, 64, 6);
    x.fillStyle = '#29b6f6';
    x.fillRect(122, 74, 46, 6);
    text(x, '[캡처] [보정 실행]', 6, 112, '#ffd54f', 9);
  });

/** The IDE on the soldering bench's laptop: the toy's or the board's firmware. */
const ideTex = () =>
  painted('eIde', 192, 128, (x) => {
    screenBg(x, 192, 128, '#1e1e1e');
    x.fillStyle = '#007acc';
    x.fillRect(0, 0, 192, 10);
    text(x, 'motor_ctrl.c  — 펌웨어', 4, 8, '#ffffff', 7);
    const rows: Array<[string, string]> = [
      ['#569cd6', 'void setup() {'],
      ['#d4d4d4', '  servo.attach(PIN_SERVO);'],
      ['#d4d4d4', '  can_init(500000);'],
      ['#6a9955', '  // PWM 20kHz, 데드타임 1us'],
      ['#d4d4d4', '  pwm_config(20000, 1);'],
      ['#569cd6', '}'],
      ['#569cd6', 'void loop() {'],
      ['#d4d4d4', '  float rpm = enc_read();'],
      ['#d4d4d4', '  duty = pid_step(&pid, rpm);'],
      ['#ce9178', '  printf("rpm=%.1f\\n", rpm);'],
      ['#569cd6', '}'],
    ];
    rows.forEach(([c, t], i) => text(x, t, 6, 20 + i * 9.2, c, 7, MONO));
    x.fillStyle = '#16825d';
    x.fillRect(0, 118, 192, 10);
    text(x, '✔ 빌드 성공 · 업로드 완료', 4, 126, '#ffffff', 7);
  });

/** The oscilloscope's four signals (one a test point): a clock, PWM, a UART byte, a ripple. */
const scopeTex = (i: number) =>
  painted(`eScope${i}`, 160, 104, (x) => {
    screenBg(x, 160, 104, '#050a0a');
    x.strokeStyle = '#1d3b3b';
    x.lineWidth = 1;
    for (let k = 0; k <= 10; k++) {
      x.beginPath();
      x.moveTo(5 + k * 15, 8);
      x.lineTo(5 + k * 15, 88);
      x.stroke();
    }
    for (let k = 0; k <= 8; k++) {
      x.beginPath();
      x.moveTo(5, 8 + k * 10);
      x.lineTo(155, 8 + k * 10);
      x.stroke();
    }
    const cols = ['#ffeb3b', '#00e5ff', '#ff4081', '#69f0ae'];
    x.strokeStyle = cols[i];
    x.lineWidth = 1.6;
    x.beginPath();
    for (let px = 0; px <= 150; px++) {
      let v = 0;
      if (i === 0) v = Math.floor(px / 12) % 2 ? 0.8 : 0.2;
      else if (i === 1) v = px % 30 < 21 ? 0.75 : 0.25;
      else if (i === 2) {
        const bits = [1, 0, 1, 1, 0, 0, 1, 0, 1, 1];
        v = px < 20 || px > 130 ? 0.8 : bits[Math.floor((px - 20) / 11) % 10] ? 0.8 : 0.25;
      } else v = 0.5 + 0.08 * Math.sin(px * 0.21) + 0.03 * Math.sin(px * 1.3);
      x.lineTo(5 + px, 88 - v * 80);
    }
    x.stroke();
    x.fillStyle = '#0d1b1b';
    x.fillRect(0, 90, 160, 14);
    const meas = ['CH1 주파수 1.000MHz', 'CH1 듀티 70.0%', 'UART 115200 0xB4', 'CH1 리플 48mVpp'];
    text(x, meas[i], 4, 100, cols[i], 8, FONT, true);
    text(x, 'T', 80, 7, '#ff9100', 7, MONO, true);
  });

/** The test rig's controller: load against cycles, the shaker's spectrum, the count. */
const rigTex = () =>
  painted('eRig', 192, 128, (x) => {
    screenBg(x, 192, 128, '#101820');
    text(x, '피로 내구 시험 · 브래킷 B-07', 6, 11, '#e0e0e0', 9, FONT, true);
    x.strokeStyle = '#263238';
    x.strokeRect(6, 16, 120, 56);
    x.strokeStyle = '#4fc3f7';
    x.lineWidth = 1.4;
    x.beginPath();
    for (let i = 0; i <= 118; i++) x.lineTo(7 + i, 44 - 20 * Math.sin(i * 0.26));
    x.stroke();
    text(x, '하중 ±2.0 kN · 3 Hz', 8, 68, '#90a4ae', 7);
    x.strokeStyle = '#263238';
    x.strokeRect(132, 16, 54, 56);
    x.strokeStyle = '#ffb74d';
    x.beginPath();
    for (let i = 0; i <= 52; i++) x.lineTo(133 + i, 60 - 22 * Math.exp(-((i - 18) ** 2) / 40) - 2 - 2 * Math.sin(i * 2.3));
    x.stroke();
    text(x, '진동 PSD', 136, 26, '#90a4ae', 7);
    text(x, '사이클', 6, 88, '#90a4ae', 8);
    text(x, '48,210 / 100,000', 40, 89, '#69f0ae', 11, MONO, true);
    x.fillStyle = '#263238';
    x.fillRect(6, 96, 180, 7);
    x.fillStyle = '#66bb6a';
    x.fillRect(6, 96, 87, 7);
    text(x, '● 시험 중   균열 감지: 없음', 6, 120, '#a5d6a7', 8);
  });

/** The HIL rack's console: the debugger stopped at a breakpoint, or the training run's loss. */
const gdbTex = () =>
  painted('eGdb', 192, 112, (x) => {
    screenBg(x, 192, 112);
    const rows: Array<[string, string]> = [
      ['#7ee787', '(gdb) target remote :3333'],
      ['#8b949e', 'Breakpoint 2, can_rx_isr () at can.c:212'],
      ['#c9d1d9', '212    if (frame.id == 0x18F) {'],
      ['#7ee787', '(gdb) p/x frame.data[0]'],
      ['#ffa657', '$1 = 0xb4'],
      ['#7ee787', '(gdb) info registers pc'],
      ['#c9d1d9', 'pc  0x08004f2a <can_rx_isr+38>'],
      ['#7ee787', '(gdb) next'],
    ];
    rows.forEach(([c, t], i) => text(x, t, 4, 11 + i * 9.5, c, 6.6, MONO));
    x.fillStyle = '#161b22';
    x.fillRect(0, 88, 192, 24);
    text(x, 'HIL 시나리오: 급제동 #14  ● RUN', 4, 100, '#58a6ff', 7.5);
    text(x, 'ECU-A ✔  ECU-B ✔  CAN 오류 0', 4, 109, '#8b949e', 7);
  });
const trainTex = () =>
  painted('eTrain', 192, 112, (x) => {
    screenBg(x, 192, 112);
    text(x, '경로 인식 모델 학습 · epoch 37/60', 4, 10, '#c9d1d9', 7.5, FONT, true);
    x.strokeStyle = '#30363d';
    x.strokeRect(4, 16, 120, 70);
    x.strokeStyle = '#f78166';
    x.lineWidth = 1.4;
    x.beginPath();
    for (let i = 0; i <= 118; i++) x.lineTo(5 + i, 22 + 56 * (1 - Math.exp(-i / 22)) + 2 * Math.sin(i * 0.9));
    x.stroke();
    x.strokeStyle = '#58a6ff';
    x.beginPath();
    for (let i = 0; i <= 118; i++) x.lineTo(5 + i, 84 - 52 * (1 - Math.exp(-i / 30)));
    x.stroke();
    text(x, 'loss 0.082', 130, 30, '#f78166', 8, MONO);
    text(x, 'mAP 0.874', 130, 44, '#58a6ff', 8, MONO);
    for (let g = 0; g < 4; g++) {
      text(x, `GPU${g}`, 130, 60 + g * 9, '#8b949e', 7, MONO);
      x.fillStyle = '#21262d';
      x.fillRect(156, 54 + g * 9, 32, 6);
      x.fillStyle = '#3fb950';
      x.fillRect(156, 54 + g * 9, 27 + g, 6);
    }
    text(x, '남은 시간 01:42:10', 4, 100, '#8b949e', 7.5);
  });

/** The line's HMI: the stations along the line, their states, the count and the OEE. */
const hmiTex = () =>
  painted('eHmi', 192, 128, (x) => {
    screenBg(x, 192, 128, '#eceff1');
    x.fillStyle = '#37474f';
    x.fillRect(0, 0, 192, 14);
    text(x, '3라인 · 모터 하우징 조립', 5, 10, '#ffffff', 8, FONT, true);
    text(x, '자동', 162, 10, '#69f0ae', 8, FONT, true);
    x.fillStyle = '#90a4ae';
    x.fillRect(8, 52, 176, 8);
    const st = ['투입', '압입', '체결', '검사', '배출'];
    st.forEach((s2, i) => {
      x.fillStyle = i === 3 ? '#ffb300' : '#43a047';
      x.fillRect(10 + i * 36, 30, 28, 20);
      text(x, s2, 13 + i * 36, 44, '#ffffff', 8, FONT, true);
    });
    for (let k = 0; k < 7; k++) {
      x.fillStyle = '#546e7a';
      x.fillRect(14 + k * 25, 53, 8, 6);
    }
    text(x, '생산 1,284 / 계획 1,600', 8, 78, '#263238', 9, FONT, true);
    text(x, 'OEE 86.4%   불량 0.4%', 8, 92, '#263238', 9);
    text(x, '택트 22.1 s', 8, 106, '#263238', 9);
    x.fillStyle = '#c62828';
    x.fillRect(140, 100, 46, 22);
    text(x, '알람 0', 148, 115, '#ffffff', 9, FONT, true);
  });

/** The pendant's screen: the program's points, the jog speed, T1 manual mode. */
const pendantTex = () =>
  painted('ePendant', 128, 96, (x) => {
    screenBg(x, 128, 96, '#e3f2fd');
    x.fillStyle = '#1565c0';
    x.fillRect(0, 0, 128, 12);
    text(x, 'PICK_PLACE.prg  T1 25%', 3, 9, '#ffffff', 7, MONO, true);
    const rows = ['1 MoveJ HOME', '2 MoveL P_PICK_UP', '3 MoveL P_PICK', '4 Grip CLOSE', '5 MoveL P_PICK_UP', '6 MoveJ P_PLACE_UP', '7 MoveL P_PLACE'];
    rows.forEach((r, i) => {
      if (i === 3) {
        x.fillStyle = '#ffe082';
        x.fillRect(0, 15 + i * 10, 128, 10);
      }
      text(x, r, 4, 23 + i * 10, '#263238', 7, MONO);
    });
  });

/** The CNC's controller and the printer's touchscreen. */
const cncTex = () =>
  painted('eCnc', 96, 72, (x) => {
    screenBg(x, 96, 72, '#0b1a10');
    text(x, 'O1024 포켓 가공', 3, 9, '#69f0ae', 8, FONT, true);
    ['X  12.480', 'Y -06.215', 'Z -02.000'].forEach((r, i) => text(x, r, 3, 24 + i * 11, '#b9f6ca', 9, MONO, true));
    text(x, 'S 12000  F 600', 3, 60, '#ffd54f', 8, MONO);
    text(x, 'CYCLE ●', 56, 68, '#ff5252', 7, MONO);
  });
const printerTex = () =>
  painted('ePrinter', 96, 64, (x) => {
    screenBg(x, 96, 64, '#1a237e');
    text(x, '브래킷_v3.gcode', 3, 10, '#ffffff', 8, FONT, true);
    x.fillStyle = '#3949ab';
    x.fillRect(4, 18, 88, 8);
    x.fillStyle = '#00e5ff';
    x.fillRect(4, 18, 52, 8);
    text(x, '노즐 215℃  베드 60℃', 3, 40, '#c5cae9', 8);
    text(x, '남은 시간 0:38', 3, 54, '#c5cae9', 8);
  });

/** The spectrum analyser: noise floor, emissions, the class B limit line, one peak marked. */
const spectrumTex = () =>
  painted('eSpectrum', 160, 104, (x) => {
    screenBg(x, 160, 104, '#03070c');
    x.strokeStyle = '#18303f';
    for (let k = 0; k <= 10; k++) {
      x.beginPath();
      x.moveTo(6 + k * 14.8, 12);
      x.lineTo(6 + k * 14.8, 86);
      x.stroke();
    }
    for (let k = 0; k <= 7; k++) {
      x.beginPath();
      x.moveTo(6, 12 + k * 10.6);
      x.lineTo(154, 12 + k * 10.6);
      x.stroke();
    }
    x.strokeStyle = '#ff1744';
    x.lineWidth = 1.4;
    x.beginPath();
    x.moveTo(6, 34);
    x.lineTo(70, 34);
    x.lineTo(70, 28);
    x.lineTo(154, 28);
    x.stroke();
    x.strokeStyle = '#ffee58';
    x.lineWidth = 1;
    x.beginPath();
    for (let i = 0; i <= 148; i++) {
      const peaks = [[22, 30], [48, 22], [61, 36], [97, 18], [118, 26]];
      let v = 76 + 4 * Math.sin(i * 1.7) + 3 * Math.sin(i * 0.53);
      for (const [c, hgt] of peaks) v -= hgt * Math.exp(-((i - c) ** 2) / 3);
      x.lineTo(6 + i, v);
    }
    x.stroke();
    x.fillStyle = '#ff9100';
    x.beginPath();
    x.moveTo(67, 36);
    x.lineTo(63, 30);
    x.lineTo(71, 30);
    x.fill();
    text(x, 'M1 61.4MHz 마진 -1.8dB', 4, 98, '#ff9100', 8, FONT, true);
    text(x, 'CISPR 32 Class B', 96, 9, '#ff5252', 7);
    text(x, '30MHz–1GHz', 4, 9, '#90a4ae', 7);
  });

/** The fence's wire mesh: see-through, a grid of dark wire. */
const meshTex = () =>
  painted('eMesh', 128, 128, (x) => {
    x.clearRect(0, 0, 128, 128);
    x.strokeStyle = 'rgba(40,44,52,0.85)';
    x.lineWidth = 1.2;
    for (let i = 0; i <= 128; i += 7) {
      x.beginPath();
      x.moveTo(i, 0);
      x.lineTo(i, 128);
      x.stroke();
      x.beginPath();
      x.moveTo(0, i);
      x.lineTo(128, i);
      x.stroke();
    }
  });

/** The pegboard's holes. */
const pegTex = () =>
  painted('ePeg', 384, 144, (x) => {
    x.fillStyle = '#d7dadc';
    x.fillRect(0, 0, 384, 144);
    x.fillStyle = '#8f979d';
    for (let r = 0; r < 24; r++)
      for (let c = 0; c < 64; c++) {
        x.beginPath();
        x.arc(3 + c * 6, 3 + r * 6, 1.1, 0, PI * 2);
        x.fill();
      }
  });

/** The whiteboard: the delivery robot's system block diagram in marker, notes stuck round it. */
const blockTex = () =>
  painted('eBlock', 512, 288, (x) => {
    x.fillStyle = '#fbfbf8';
    x.fillRect(0, 0, 512, 288);
    const blk = (bx: number, by: number, w: number, h: number, t: string, col: string) => {
      x.strokeStyle = col;
      x.lineWidth = 2.5;
      x.strokeRect(bx, by, w, h);
      text(x, t, bx + 6, by + h / 2 + 5, col, 13, FONT, true);
    };
    const arrow = (x0: number, y0: number, x1: number, y1: number, col: string) => {
      x.strokeStyle = col;
      x.lineWidth = 2;
      x.beginPath();
      x.moveTo(x0, y0);
      x.lineTo(x1, y1);
      x.stroke();
      const a = Math.atan2(y1 - y0, x1 - x0);
      x.beginPath();
      x.moveTo(x1, y1);
      x.lineTo(x1 - 8 * Math.cos(a - 0.4), y1 - 8 * Math.sin(a - 0.4));
      x.lineTo(x1 - 8 * Math.cos(a + 0.4), y1 - 8 * Math.sin(a + 0.4));
      x.fill();
    };
    text(x, 'AMR-02 시스템 블록도', 16, 30, '#1a237e', 22, FONT, true);
    const B = '#1565c0';
    const K = '#212121';
    const R = '#c62828';
    const G = '#2e7d32';
    blk(16, 60, 100, 34, '배터리 48V', K);
    blk(16, 120, 100, 34, 'BMS', K);
    blk(150, 120, 100, 34, 'DC-DC 12/5V', K);
    blk(150, 190, 130, 40, 'MCU STM32', B);
    blk(320, 190, 150, 40, '모터 드라이버', B);
    blk(320, 246, 150, 30, 'BLDC 모터 ×2', K);
    blk(300, 60, 190, 40, '메인 PC (ROS 2)', G);
    blk(300, 120, 60, 30, '라이다', G);
    blk(370, 120, 60, 30, '카메라', G);
    blk(440, 120, 56, 30, 'IMU', G);
    arrow(66, 94, 66, 120, R);
    arrow(116, 137, 150, 137, R);
    arrow(200, 154, 200, 190, R);
    arrow(280, 210, 320, 210, B);
    arrow(395, 230, 395, 246, K);
    arrow(330, 120, 340, 100, G);
    arrow(400, 120, 400, 100, G);
    arrow(468, 120, 460, 100, G);
    x.strokeStyle = '#6a1b9a';
    x.lineWidth = 3;
    x.setLineDash([10, 6]);
    x.beginPath();
    x.moveTo(16, 268);
    x.lineTo(300, 268);
    x.stroke();
    x.setLineDash([]);
    text(x, 'CAN 500kbps', 20, 262, '#6a1b9a', 13, FONT, true);
    x.strokeStyle = '#6a1b9a';
    x.beginPath();
    x.moveTo(215, 230);
    x.lineTo(215, 268);
    x.moveTo(280, 100);
    x.lineTo(240, 100);
    x.lineTo(240, 190);
    x.stroke();
    const note = (nx: number, ny: number, col: string, t1: string, t2: string, rot: number) => {
      x.save();
      x.translate(nx, ny);
      x.rotate(rot);
      x.fillStyle = col;
      x.fillRect(0, 0, 64, 52);
      text(x, t1, 5, 20, '#37474f', 11, FONT, true);
      text(x, t2, 5, 38, '#37474f', 11);
      x.restore();
    };
    note(150, 24, '#fff176', 'EMC', '재시험 11/3', -0.05);
    note(226, 30, '#80deea', '토크', '부족?', 0.04);
    note(440, 200, '#f48fb1', '펌웨어', 'v0.9 배포', 0.06);
  });

/** The kanban card in a bin's holder. */
const kanbanCardTex = () =>
  painted('eKanban', 64, 40, (x) => {
    x.fillStyle = '#fff59d';
    x.fillRect(0, 0, 64, 40);
    x.strokeStyle = '#f57f17';
    x.strokeRect(1, 1, 62, 38);
    text(x, '칸반', 4, 13, '#e65100', 10, FONT, true);
    text(x, '보충 2/2', 4, 30, '#37474f', 9);
  });

// ---- Pieces ----

/** The cobot's calibration plate on its flange: a short stem and the checkerboard, its face along the tool's axis. */
function checkerTool(tool: THREE.Object3D) {
  part(tool, cyl(0.016, 0.016, 0.04, 12), '#455a64', 0, 0.02, 0);
  part(tool, box(0.15, 0.006, 0.11), '#eceff1', 0, 0.045, 0);
  sheet(tool, checkerTex(), 0.14, 0.1, 0, 0.0485, 0, 0, -PI / 2);
}
/** A drive wheel (axis along z, or lying flat) at (x, y, z) in `g`. */
function amrWheel(g: THREE.Object3D, x: number, y: number, z: number, flat = false) {
  const w = frame(g, x, y, z, 0, flat ? 0 : PI / 2);
  part(w, cyl(0.065, 0.065, 0.034, 22), '#263238', 0, 0, 0);
  part(w, cyl(0.032, 0.032, 0.037, 14), ALU, 0, 0, 0, { outline: false });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * PI * 2;
    part(w, cyl(0.004, 0.004, 0.039, 6), DARK, Math.cos(a) * 0.02, 0, Math.sin(a) * 0.02, { outline: false });
  }
  return w;
}
/** A soldering iron, its tip at the group's origin and the handle up its +y. */
function iron(g: THREE.Object3D): THREE.Group {
  const f = frame(g, 0, 0, 0);
  part(f, cyl(0.0035, 0.0008, 0.02, 8), '#90a4ae', 0, 0.01, 0, { outline: false });
  part(f, cyl(0.0035, 0.0035, 0.055, 8), '#cfd8dc', 0, 0.0475, 0, { outline: false });
  part(f, cyl(0.009, 0.006, 0.012, 10), '#37474f', 0, 0.08, 0, { outline: false });
  part(f, cyl(0.011, 0.012, 0.1, 12), '#1565c0', 0, 0.135, 0);
  for (let i = 0; i < 4; i++) part(f, cyl(0.0122, 0.0122, 0.004, 12), '#0d47a1', 0, 0.1 + i * 0.012, 0, { outline: false });
  part(f, cyl(0.006, 0.008, 0.02, 8), DARK, 0, 0.195, 0, { outline: false });
  return f;
}
/** An oscilloscope probe, its hook tip at the origin and the body up its +y. */
function probe(g: THREE.Object3D): THREE.Group {
  const f = frame(g, 0, 0, 0);
  part(f, cyl(0.002, 0.0008, 0.016, 6), '#cfd8dc', 0, 0.008, 0, { outline: false });
  part(f, cyl(0.006, 0.004, 0.02, 10), '#9e9e9e', 0, 0.026, 0, { outline: false });
  part(f, cyl(0.007, 0.007, 0.08, 10), '#455a64', 0, 0.075, 0);
  part(f, cyl(0.0072, 0.0072, 0.006, 10), '#ffeb3b', 0, 0.06, 0, { outline: false });
  part(f, cyl(0.004, 0.006, 0.025, 8), DARK, 0, 0.125, 0, { outline: false });
  // The ground lead's little clip, hanging off the side.
  part(f, box(0.003, 0.05, 0.003), '#212121', 0.009, 0.075, 0, { rz: 0.25, outline: false });
  return f;
}
/** Which of two spots is in use now: the later posed (or `a` if neither is). */
function later(a: Spot, b: Spot, t: number): Spot {
  const pa = posed(a, t) ? (a.at.userData.posedAt as number) : -1e9;
  const pb = posed(b, t) ? (b.at.userData.posedAt as number) : -1e9;
  return pb > pa ? b : a;
}

export const BUILDERS: Record<string, Builder> = {
  /**
   * The robot bench (로봇 조립대): an aluminium-extrusion bench with a grey top and a blue ESD mat, bins
   * on the shelf under it beside the cobot's controller, the pegboard behind hung with wrenches,
   * screwdrivers, pliers, hex keys, a coil of cable and a tape measure under an LED bar and the
   * '로봇 조립대' plate. On it a half-built delivery robot (AMR-02) up on its stand — white shell, black
   * bumper, the lidar on its deck, a stereo camera on its side, the side panel off showing the battery,
   * the motor-driver board and the harness, one wheel on and the other lying on the mat with the torque
   * driver and a tray of screws — and a white cobot with blue joints holding a checkerboard plate, its
   * pendant hung on the bench's leg, the laptop beside it. Assembling the robot: stood at it, hands in
   * its side, the wheel on its axle and the driver turning at its hub. Calibrating its sensors: stood
   * typing at the laptop while the cobot holds the checkerboard up to the robot's camera in pose after
   * pose (the camera's light blinks at each capture, the lidar spins).
   */
  robotBench(g, W, D, _c, _def, _ctx, out) {
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const idle = new THREE.Group();
    g.add(idle);
    out.idle = idle;
    const w = W - 0.06;
    const d = Math.min(D - 0.24, 0.74);
    const z = -D / 2 + d / 2 + 0.02;
    const ty = 0.9;
    const front = z + d / 2;
    // The frame, its feet, the stretchers, the shelf and its bins; the cobot's controller on the shelf.
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        part(g, box(0.045, ty - 0.04, 0.045), ALU, sx * (w / 2 - 0.04), (ty - 0.04) / 2, z + sz * (d / 2 - 0.05));
        part(g, cyl(0.025, 0.03, 0.02, 10), DARK, sx * (w / 2 - 0.04), 0.01, z + sz * (d / 2 - 0.05), { outline: false });
      }
    for (const sz of [-1, 1]) part(g, box(w - 0.08, 0.04, 0.045), ALU, 0, 0.16, z + sz * (d / 2 - 0.05));
    part(g, rbox(w - 0.08, 0.025, d - 0.08, 0.008), '#9aa3ab', 0, 0.2, z);
    for (let i = 0; i < 4; i++) {
      const bx = -0.1 + i * 0.27;
      part(g, rbox(0.24, 0.12, 0.3, 0.01), i % 2 ? '#1e88e5' : '#fdd835', bx, 0.275, z + 0.06);
      part(g, box(0.2, 0.002, 0.26), shade(i % 2 ? '#1e88e5' : '#fdd835', 0.55), bx, 0.336, z + 0.06, { outline: false });
    }
    part(g, rbox(0.36, 0.2, 0.3, 0.015), '#cfd8dc', -w / 2 + 0.3, 0.315, z);
    label(g, 'CB-3 코봇 제어기', 0.2, 0.035, -w / 2 + 0.3, 0.36, z + 0.152, '#37474f', '#ffffff');
    part(g, box(0.03, 0.03, 0.004), '#43a047', -w / 2 + 0.2, 0.28, z + 0.152, { outline: false, material: glow('#43a047') });
    // The top and the mat.
    part(g, rbox(w, 0.04, d, 0.012), '#8a9198', 0, ty - 0.02, z);
    part(g, box(w * 0.62, 0.004, d - 0.1), ESD, w * 0.17, ty + 0.002, z + 0.03, { outline: false });
    // The pegboard, its tools, the plate and the light bar.
    const pz = -D / 2 + 0.04;
    const ph = 0.78;
    for (const sx of [-1, 1]) part(g, box(0.045, ph, 0.045), ALU, sx * (w / 2 - 0.04), ty + ph / 2, pz);
    part(g, box(w - 0.04, 0.045, 0.06), ALU, 0, ty + ph, pz + 0.01);
    sheet(g, pegTex(), w - 0.1, ph - 0.1, 0, ty + ph / 2 - 0.02, pz + 0.024);
    const peg = pz + 0.03;
    const hy = ty + 0.5;
    for (let i = 0; i < 5; i++) part(g, rbox(0.018, 0.1 + i * 0.02, 0.006, 0.004), '#cfd8dc', -0.82 + i * 0.05, hy - i * 0.01, peg, { outline: false });
    ['#e53935', '#fdd835', '#1e88e5', '#43a047', '#212121'].forEach((col, i) => {
      part(g, cyl(0.012, 0.012, 0.08, 10), col, -0.5 + i * 0.05, hy + 0.08, peg + 0.01);
      part(g, cyl(0.003, 0.003, 0.11, 6), '#b0bec5', -0.5 + i * 0.05, hy - 0.015, peg + 0.01, { outline: false });
    });
    for (const s of [-1, 1]) part(g, rbox(0.016, 0.16, 0.008, 0.004), '#c62828', -0.17 + s * 0.012, hy, peg, { rz: s * 0.12 });
    part(g, rbox(0.12, 0.05, 0.02, 0.006), '#263238', 0.05, hy + 0.1, peg);
    for (let i = 0; i < 7; i++) part(g, box(0.004, 0.06 + i * 0.008, 0.004), '#78909c', 0.005 + i * 0.015, hy + 0.05 - i * 0.004, peg + 0.012, { outline: false });
    part(g, ring(0.07, 0.012), '#ff7043', 0.32, hy + 0.04, peg + 0.02, { outline: false });
    part(g, ring(0.055, 0.012), '#ff7043', 0.32, hy + 0.04, peg + 0.025, { outline: false });
    part(g, rbox(0.08, 0.08, 0.04, 0.015), '#fdd835', 0.62, hy + 0.06, peg + 0.01);
    part(g, rbox(0.11, 0.07, 0.02, 0.01), '#455a64', 0.8, hy + 0.1, peg + 0.01);
    label(g, '로봇 조립대 · ESD 구역', 0.5, 0.06, 0, ty + ph - 0.08, peg + 0.004, '#ffd600', '#212121');
    part(g, box(w - 0.3, 0.02, 0.04), '#eceff1', 0, ty + ph - 0.035, pz + 0.05);
    part(g, box(w - 0.32, 0.004, 0.03), '#fffde7', 0, ty + ph - 0.047, pz + 0.05, { outline: false, material: glow('#fffde7') });
    // The pendant hung on the left leg, its cable looped under it.
    const pen = frame(g, -w / 2 - 0.02, ty - 0.2, front - 0.06, -PI / 2);
    part(pen, rbox(0.17, 0.12, 0.035, 0.012), '#37474f', 0, 0, 0);
    part(pen, box(0.09, 0.065, 0.002), '#90caf9', -0.02, 0.01, 0.018, { outline: false });
    part(pen, cyl(0.012, 0.012, 0.012, 12), '#e53935', 0.06, 0.04, 0.02, { rx: PI / 2, outline: false });
    part(g, coil(0.03, 0.3, 6), '#263238', -w / 2 - 0.025, ty - 0.6, front - 0.06, { outline: false });
    // The cobot: one at rest (nobody at the bench) and one that moves.
    const cobotAt = new THREE.Vector3(-0.62, ty, -0.2);
    const rest = P(PI / 2, 0.25, 0.45, PI);
    const still = robotArm(idle, cobotAt.x, cobotAt.y, cobotAt.z, 1, ROBOT, JOINT, 0.05);
    checkerTool(still.tool);
    poseArm(still, rest);
    const arm = robotArm(use, cobotAt.x, cobotAt.y, cobotAt.z, 1, ROBOT, JOINT, 0.05);
    checkerTool(arm.tool);
    poseArm(arm, rest);
    // The delivery robot on its stand.
    const ax = 0.3;
    const az = -0.06;
    const amr = frame(g, ax, ty, az);
    for (const sx of [-1, 1]) part(amr, rbox(0.08, 0.06, 0.28, 0.01), DARK, sx * 0.12, 0.03, 0);
    part(amr, rbox(0.44, 0.13, 0.32, 0.03), ROBOT, 0, 0.135, 0);
    part(amr, box(0.45, 0.025, 0.33), DARK, 0, 0.085, 0);
    part(amr, rbox(0.4, 0.02, 0.28, 0.008), '#37474f', 0, 0.21, 0);
    label(amr, 'AMR-02', 0.1, 0.025, 0.1, 0.17, -0.161, ROBOT, '#1565c0', PI);
    // Its open side: the battery, the motor-driver board, the harness.
    part(amr, box(0.36, 0.09, 0.004), '#263238', -0.02, 0.135, 0.161, { outline: false });
    part(amr, rbox(0.15, 0.07, 0.02, 0.006), '#212121', -0.1, 0.13, 0.17);
    label(amr, '48V', 0.05, 0.02, -0.1, 0.13, 0.181, '#fdd835', '#212121');
    part(amr, box(0.1, 0.06, 0.003), PCB, 0.07, 0.14, 0.168, { outline: false });
    part(amr, box(0.02, 0.02, 0.006), '#212121', 0.06, 0.145, 0.171, { outline: false });
    for (const [i, col] of ['#e53935', '#212121', '#fdd835', '#1e88e5'].entries()) part(amr, cyl(0.004, 0.004, 0.08, 6), col, 0.005 + i * 0.008, 0.13, 0.172, { rz: 1.2, outline: false });
    // The lidar (spins while it's calibrated) and the stereo camera on its left side.
    part(amr, cyl(0.045, 0.045, 0.02, 18), DARK, 0.1, 0.23, 0);
    const lidar = frame(amr, 0.1, 0.24, 0);
    part(lidar, cyl(0.04, 0.042, 0.045, 18), '#263238', 0, 0.022, 0);
    part(lidar, cyl(0.0415, 0.0415, 0.012, 18), '#1e88e5', 0, 0.026, 0, { outline: false });
    part(lidar, box(0.01, 0.008, 0.004), '#ff1744', 0, 0.026, 0.042, { outline: false, material: glow('#ff1744') });
    part(amr, rbox(0.02, 0.045, 0.09, 0.006), DARK, -0.228, 0.15, 0);
    part(amr, cyl(0.013, 0.013, 0.01, 14), '#0d47a1', -0.24, 0.15, 0.02, { rz: PI / 2, outline: false });
    part(amr, cyl(0.013, 0.013, 0.01, 14), '#0d47a1', -0.24, 0.15, -0.02, { rz: PI / 2, outline: false });
    const flash = part(use, box(0.004, 0.008, 0.008), '#76ff03', ax - 0.241, ty + 0.172, az, { outline: false, material: glow('#76ff03') });
    // The back wheel on; the front one on the mat (idle, calibrating), or on its axle (assembling).
    amrWheel(amr, 0, 0.09, -0.175);
    amrWheel(idle, 0.74, ty + 0.017, 0.08, true);
    const onMat = amrWheel(use, 0.74, ty + 0.017, 0.08, true);
    const onAxle = amrWheel(use, ax, ty + 0.09, az + 0.18);
    // The side panel off on the mat, the torque driver, the tray of screws.
    part(g, rbox(0.3, 0.01, 0.11, 0.004), ROBOT, 0.68, ty + 0.007, -0.17);
    const tray = frame(g, 0.48, ty, 0.14);
    part(tray, rbox(0.16, 0.025, 0.1, 0.006), '#ffca28', 0, 0.0125, 0);
    for (let i = 0; i < 6; i++) part(tray, ball(0.006), '#b0bec5', -0.05 + (i % 3) * 0.05, 0.026, -0.02 + Math.floor(i / 3) * 0.04, { outline: false });
    const drv = (p: THREE.Object3D) => {
      part(p, cyl(0.018, 0.016, 0.12, 12), '#1565c0', 0, 0.06, 0);
      part(p, cyl(0.02, 0.02, 0.025, 12), '#212121', 0, 0.11, 0, { outline: false });
      part(p, cyl(0.004, 0.004, 0.07, 6), '#cfd8dc', 0, -0.035, 0, { outline: false });
    };
    drv(frame(idle, 0.12, ty + 0.02, 0.17, 0, 0, PI / 2));
    // At the hub, pointing in at it (its bit along -z).
    const drvUse = frame(use, ax + 0.01, ty + 0.09, az + 0.27);
    drv(frame(drvUse, 0, 0, 0, 0, PI / 2));
    // The laptop with the calibration on it.
    const lap = laptop(g, -0.16, ty, 0.1, 0.15, calibTex());
    out.screen = lap.screen;
    const workA = marker(g, ax, ty + 0.12, az + 0.2);
    const asm = stoodAt(g, ax, front + 0.36, 'tinker', workA);
    const cal = stoodAt(g, -0.16, front + 0.36, 'type', lap.keys);
    out.work = workA;
    out.spots = { '*': asm, assembleRobot: asm, calibrateSensors: cal };
    // Hand-eye calibration: the plate held up to the camera in five poses, a capture at each.
    const poses = [P(PI / 2, 0.42, 0.18, PI / 2), P(PI / 2 + 0.22, 0.4, 0.25, PI / 2 - 0.25, 0.35), P(PI / 2 - 0.2, 0.44, 0.12, PI / 2 + 0.2, -0.35), P(PI / 2 + 0.1, 0.36, 0.28, PI / 2 + 0.15, 0.6), P(PI / 2 - 0.12, 0.46, 0.2, PI / 2 - 0.15, -0.2)];
    out.animate = (t) => {
      const calibrating = later(asm, cal, t) === cal;
      onAxle.visible = drvUse.visible = !calibrating;
      onMat.visible = calibrating;
      if (calibrating) {
        const c = t / 2.4;
        const n = Math.floor(c);
        const u = c - n;
        poseArm(arm, mixPose(poses[(n + 4) % 5], poses[n % 5], sm(u, 0, 0.45)));
        flash.visible = u > 0.62 && u < 0.72;
        lidar.rotation.y = t * 9;
      } else {
        poseArm(arm, rest);
        flash.visible = false;
        drvUse.rotation.z = t * 6;
      }
    };
  },

  /**
   * The soldering bench (회로 작업대): an ESD bench with the blue mat, a riser carrying the bench power
   * supply (12.00 V, 0.35 A), the component drawers and the soldering station (350 ℃); the board in
   * its holder with a three-pin header to solder, under a magnifier lamp on its arm with the ring light
   * (lit in use); the iron in its coiled stand by the brass wool, the reel of solder on its stand, the
   * fume extractor turned to the board, tweezers and a flux pen, a laptop with the firmware; an ESD
   * chair. Soldering: sat bent over the board, the iron in the right hand like a pen and the solder
   * wire in the left, joint after joint — the tip set on the pad, the wire fed in, the joint filling
   * silver, the flux smoking off to the extractor (solderRound). Coding a toy: sat turned to the laptop.
   */
  circuitStation(g, W, D, _c, _def, _ctx, out) {
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const idle = new THREE.Group();
    g.add(idle);
    out.idle = idle;
    const k = labDesk(g, W, D);
    const { ty, front } = k;
    // The board's holder and the board, the header and its three pads, the joints (filled as they're soldered).
    const wz = front - 0.2;
    const wy = ty + 0.075;
    part(g, rbox(0.24, 0.015, 0.1, 0.005), DARK, 0, ty + 0.0075, wz);
    for (const sx of [-1, 1]) {
      part(g, box(0.015, 0.065, 0.02), '#455a64', sx * 0.11, ty + 0.04, wz);
      part(g, rbox(0.025, 0.016, 0.11, 0.004), '#78909c', sx * 0.095, wy, wz);
    }
    board(g, 0, wy, wz, 0.17, 0.1);
    part(g, box(0.1, 0.01, 0.01), '#212121', 0, wy + 0.007, wz - 0.016, { outline: false });
    const blobs: THREE.Mesh[] = [];
    for (const side of SOLDER_PADS) {
      const x = -side;
      part(g, cyl(0.005, 0.005, 0.002, 10), '#d4af37', x, wy + 0.0025, wz, { outline: false });
      part(g, box(0.002, 0.012, 0.002), '#e0e0e0', x, wy + 0.007, wz, { outline: false });
      blobs.push(part(use, ball(0.0068), '#d7dde2', x, wy + 0.004, wz, { outline: false }));
    }
    const work = marker(g, 0, wy, wz);
    // The riser: the power supply, the drawers, the soldering station.
    const sy = k.sy;
    const psu = frame(g, -0.27, sy, k.sz);
    part(psu, rbox(0.24, 0.13, 0.17, 0.012), '#eceff1', 0, 0.065, 0);
    part(psu, box(0.22, 0.11, 0.004), '#263238', 0, 0.065, 0.086, { outline: false });
    label(psu, '12.00V', 0.08, 0.03, -0.055, 0.09, 0.089, '#1b0000', '#ff3d00', 0, 0, MONO);
    label(psu, '0.35A', 0.08, 0.03, 0.045, 0.09, 0.089, '#001b05', '#00e676', 0, 0, MONO);
    for (const [i, col] of ['#e53935', '#212121', '#43a047'].entries()) part(psu, cyl(0.009, 0.009, 0.02, 10), col, -0.06 + i * 0.05, 0.035, 0.095, { rx: PI / 2, outline: false });
    partsDrawers(g, 0.03, sy, k.sz, 0.17, 0.14);
    const st = frame(g, 0.31, sy, k.sz);
    part(st, rbox(0.16, 0.09, 0.15, 0.012), '#263238', 0, 0.045, 0);
    label(st, '350℃', 0.07, 0.03, -0.02, 0.055, 0.077, '#120000', '#ff1744', 0, 0, MONO);
    part(st, cyl(0.014, 0.014, 0.015, 12), '#b0bec5', 0.05, 0.05, 0.08, { rx: PI / 2 });
    const socket = new THREE.Vector3(0.36, sy + 0.02, k.sz + 0.078);
    // The iron's stand: the coil, the brass wool; the iron in it while nobody's soldering.
    const hx = 0.36;
    const hz = front - 0.16;
    part(g, cyl(0.045, 0.05, 0.02, 16), DARK, hx, ty + 0.01, hz);
    part(g, cyl(0.028, 0.03, 0.022, 14), '#cfa22e', hx - 0.035, ty + 0.03, hz + 0.02, { outline: false });
    const coilF = frame(g, hx + 0.01, ty + 0.03, hz - 0.01, 0, 0, 0.75);
    part(coilF, coil(0.016, 0.11, 6), '#b0bec5', 0, 0, 0, { outline: false });
    const restTip = new THREE.Vector3(hx - 0.045, ty + 0.025, hz - 0.01);
    const restGrip = new THREE.Vector3(hx + 0.08, ty + 0.12, hz - 0.03);
    aim(iron(idle), restTip, restGrip);
    const restBack = restTip.clone().add(restGrip.clone().sub(restTip).normalize().multiplyScalar(0.2));
    stretch(wire(idle, 0.004, '#212121'), restBack, socket);
    const ir = iron(use);
    const irCable = wire(use, 0.004, '#212121');
    const tipGlow = part(use, ball(0.004), '#ff6d00', 0, 0, 0, { outline: false, material: glow('#ff9100') });
    // The reel of solder and its wire.
    const rx0 = -0.2;
    const rz0 = k.z - k.d / 2 + 0.28;
    part(g, rbox(0.08, 0.015, 0.06, 0.005), DARK, rx0, ty + 0.0075, rz0);
    for (const s of [-1, 1]) part(g, box(0.006, 0.06, 0.01), '#78909c', rx0 + s * 0.025, ty + 0.04, rz0, { outline: false });
    part(g, cyl(0.035, 0.035, 0.03, 18), '#90a4ae', rx0, ty + 0.06, rz0, { rz: PI / 2 });
    part(g, cyl(0.036, 0.036, 0.02, 18), '#cfd8dc', rx0, ty + 0.06, rz0, { rz: PI / 2, outline: false });
    const reelOut = new THREE.Vector3(rx0, ty + 0.09, rz0 + 0.02);
    stretch(wire(idle, 0.0012, '#cfd8dc'), reelOut, new THREE.Vector3(rx0 + 0.02, ty + 0.004, rz0 + 0.08));
    const w1 = wire(use, 0.0012, '#cfd8dc');
    const w2 = wire(use, 0.0012, '#cfd8dc');
    // The magnifier lamp on its arm, clamped to the riser's left post, the ring over the board.
    const lx = -k.w / 2 + 0.03;
    const j0 = new THREE.Vector3(lx, sy + 0.05, k.sz - 0.08);
    const j1 = new THREE.Vector3(lx + 0.12, sy + 0.32, k.sz + 0.02);
    const head = new THREE.Vector3(0.01, ty + 0.25, wz - 0.06);
    part(g, rbox(0.04, 0.06, 0.05, 0.008), '#eceff1', lx, sy + 0.02, k.sz - 0.08);
    rod(g, j0, j1, 0.009, '#eceff1');
    rod(g, j1, head.clone().add(new THREE.Vector3(-0.09, 0.03, 0)), 0.009, '#eceff1');
    part(g, ball(0.014), '#90a4ae', j1.x, j1.y, j1.z, { outline: false });
    const mag = frame(g, head.x, head.y, head.z, 0, -1.0);
    part(mag, ring(0.08, 0.014), '#eceff1', 0, 0, 0);
    part(mag, cyl(0.072, 0.072, 0.004, 28), '#d7eef7', 0, 0, 0, { rx: PI / 2, material: GLASS, outline: false });
    part(mag, ring(0.066, 0.006), '#9e9e9e', 0, 0, -0.008, { outline: false });
    const ringOn = frame(use, head.x, head.y, head.z, 0, -1.0);
    part(ringOn, ring(0.066, 0.0065), '#ffffff', 0, 0, -0.009, { outline: false, material: glow('#fffde7') });
    // The fume extractor turned in at the board; the puffs drawn off to it.
    const ex = new THREE.Vector3(0.3, ty, k.z - 0.12);
    const ext = frame(g, ex.x, ex.y, ex.z, -1.0);
    part(ext, rbox(0.15, 0.17, 0.08, 0.012), '#212121', 0, 0.12, 0);
    part(ext, box(0.12, 0.14, 0.004), '#455a64', 0, 0.12, 0.041, { outline: false });
    for (let i = 0; i < 7; i++) part(ext, box(0.12, 0.004, 0.003), '#212121', 0, 0.06 + i * 0.02, 0.044, { outline: false });
    part(ext, box(0.05, 0.04, 0.06), '#37474f', 0, 0.02, 0);
    const exMouth = new THREE.Vector3(ex.x - 0.04, ty + 0.12, ex.z + 0.04);
    const puffs: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) puffs.push(part(use, ball(0.012), '#eceff1', 0, 0, 0, { outline: false, shadow: false, material: FUME }));
    // Tweezers, the flux pen, a desoldering pump; the laptop with the firmware.
    part(g, box(0.004, 0.003, 0.11), '#b0bec5', 0.18, ty + 0.006, front - 0.08, { ry: 0.3, outline: false });
    part(g, cyl(0.007, 0.007, 0.12, 8), '#ffb300', 0.2, ty + 0.009, front - 0.12, { rz: PI / 2, ry: -0.4 });
    part(g, cyl(0.011, 0.011, 0.16, 10), '#90a4ae', -0.08, ty + 0.012, k.z - 0.08, { rz: PI / 2, ry: 0.2 });
    const lap = laptop(g, -0.32, ty, front - 0.12, 0.45, ideTex(), 0.26);
    out.screen = lap.screen;
    // The chair.
    const c = frame(g, 0, 0, front + 0.24, PI);
    labChair(c, 0.44, ESD);
    const sold = satAt(g, 0, front + 0.24, 'solder', work);
    const code = satAt(g, 0, front + 0.24, 'type', lap.keys, 0.48, PI + 0.35);
    out.work = work;
    out.spots = { '*': sold, solderCircuit: sold, toymaker_codeToy: code };
    const tip = new THREE.Vector3();
    const grip = new THREE.Vector3();
    const we = new THREE.Vector3();
    const lh = new THREE.Vector3();
    const v = new THREE.Vector3();
    out.animate = (t) => {
      const coding = later(sold, code, t) === code;
      ir.visible = irCable.visible = w1.visible = w2.visible = !coding;
      if (coding) {
        tipGlow.visible = false;
        for (const p of puffs) p.visible = false;
        return;
      }
      const s = solderRound(t, phaseAt(sold));
      offAt(work.position, s.tip, tip);
      offAt(work.position, s.r, grip);
      aim(ir, tip, grip);
      v.copy(grip).sub(tip).normalize().multiplyScalar(0.2).add(tip);
      stretch(irCable, v, socket);
      offAt(work.position, s.wire, we);
      offAt(work.position, s.l, lh);
      v.copy(lh).sub(we).multiplyScalar(0.7).add(lh);
      stretch(w1, we, v);
      stretch(w2, v, reelOut);
      blobs.forEach((b, i) => {
        const k2 = i < s.j ? 1 : i === s.j ? Math.max(0.01, s.flow) : 0.01;
        b.scale.set(k2, k2 * 0.55, k2);
      });
      tipGlow.position.copy(tip);
      tipGlow.visible = s.heat > 0.5;
      puffs.forEach((p, i) => {
        const f = (t * 0.6 + i / 4) % 1;
        p.visible = s.heat > 0.2;
        p.position.copy(tip).lerp(exMouth, f * 0.85);
        p.position.y += 0.06 * Math.sin(f * PI) + 0.01 * Math.sin(t * 3 + i);
        p.scale.setScalar(0.5 + f * 1.3);
      });
    };
  },

  /**
   * The measurement bench (계측 작업대): an ESD bench whose riser carries a four-channel oscilloscope
   * (the trace lit in use: a clock, PWM, a UART byte or the supply's ripple, whichever test point the
   * probe's on) and a function generator (1.000 kHz); on the mat a blue board under test on its
   * standoffs with its test-point loops, the logic analyser's rainbow lead clipped to its header, a
   * handheld multimeter reading 3.297 V on its leads, the lab notebook; an ESD chair. Probing: sat at
   * the board, the probe pen in the right hand set on one test point after another, the left steadying
   * the board, then reaching up to turn the scope's knob while looking up at the trace (probeRound).
   */
  engScopeBench(g, W, D, _c, _def, _ctx, out) {
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const idle = new THREE.Group();
    g.add(idle);
    out.idle = idle;
    const k = labDesk(g, W, D);
    const { ty, front } = k;
    // The board under test on its standoffs, its test points.
    const wx = 0.05;
    const wz = front - 0.18;
    const wy = ty + 0.035;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) part(g, cyl(0.004, 0.004, 0.03, 6), '#d4af37', wx + sx * 0.077, ty + 0.017, wz + sz * 0.052, { outline: false });
    board(g, wx, wy, wz, 0.17, 0.12, '#1565c0');
    const tpCols = ['#e53935', '#fdd835', '#43a047', '#ffffff'];
    PROBE_POINTS.forEach((p, i) => {
      const x = wx - p.side;
      const z = wz - p.ahead;
      part(g, cyl(0.0035, 0.0035, 0.004, 8), '#d4af37', x, wy + 0.003, z, { outline: false });
      part(g, ring(0.005, 0.0012), tpCols[i], x, wy + 0.009, z, { outline: false });
    });
    const led = part(use, box(0.006, 0.004, 0.004), '#76ff03', wx + 0.06, wy + 0.004, wz + 0.04, { outline: false, material: glow('#76ff03') });
    const work = marker(g, wx, wy, wz);
    // The oscilloscope on the riser: its screen, the big knob (SCOPE_KNOB from the board), the channel buttons, the inputs.
    const sy = k.sy;
    const faceZ = wz - 0.27;
    const sx0 = -0.18;
    part(g, rbox(0.36, 0.2, 0.15, 0.015), '#d9dee2', sx0, sy + 0.1, faceZ - 0.075);
    part(g, box(0.35, 0.19, 0.004), '#37474f', sx0, sy + 0.1, faceZ + 0.001, { outline: false });
    const scopes = [0, 1, 2, 3].map((i) => scopeTex(i));
    const scr = screenOf(g, scopes[0], 0.19, 0.125, sx0 - 0.065, sy + 0.11, faceZ + 0.004);
    out.screen = scr;
    label(g, 'OSC-4  1 GHz', 0.1, 0.018, sx0 - 0.1, sy + 0.185, faceZ + 0.004, '#37474f', '#eceff1');
    const kx = wx - 0.13;
    const ky = wy + 0.3;
    part(g, cyl(0.016, 0.016, 0.016, 16), '#212121', kx, ky, faceZ + 0.009, { rx: PI / 2 });
    for (let i = 0; i < 4; i++) {
      part(g, cyl(0.008, 0.008, 0.012, 10), '#424242', sx0 + 0.085 + (i % 2) * 0.045, sy + 0.165 - Math.floor(i / 2) * 0.03, faceZ + 0.007, { rx: PI / 2, outline: false });
      part(g, box(0.014, 0.01, 0.006), ['#ffeb3b', '#00e5ff', '#ff4081', '#69f0ae'][i], sx0 + 0.07 + i * 0.022, sy + 0.06, faceZ + 0.004, { outline: false });
    }
    const bnc: THREE.Vector3[] = [];
    for (let i = 0; i < 4; i++) {
      const bx = sx0 + 0.065 + i * 0.022;
      part(g, cyl(0.006, 0.006, 0.014, 10), '#b0bec5', bx, sy + 0.03, faceZ + 0.008, { rx: PI / 2, outline: false });
      bnc.push(new THREE.Vector3(bx, sy + 0.03, faceZ + 0.016));
    }
    const trig = part(use, box(0.006, 0.006, 0.003), '#ff9100', sx0 + 0.15, sy + 0.18, faceZ + 0.004, { outline: false, material: glow('#ff9100') });
    // The function generator beside it; the multimeter and its leads; the logic analyser; the notebook.
    const fg = frame(g, 0.2, sy, k.sz);
    part(fg, rbox(0.26, 0.1, 0.15, 0.01), '#d9dee2', 0, 0.05, 0);
    part(fg, box(0.25, 0.09, 0.004), '#37474f', 0, 0.05, 0.076, { outline: false });
    label(fg, '1.000 kHz', 0.11, 0.03, -0.05, 0.06, 0.079, '#001a10', '#00e676', 0, 0, MONO);
    part(fg, cyl(0.014, 0.014, 0.014, 14), '#212121', 0.07, 0.05, 0.083, { rx: PI / 2 });
    const dmm = frame(g, 0.34, ty + 0.06, front - 0.22, -0.3, -0.9);
    part(dmm, rbox(0.085, 0.16, 0.035, 0.012), '#fdd835', 0, 0, 0);
    part(dmm, box(0.07, 0.13, 0.004), '#37474f', 0, -0.005, 0.018, { outline: false });
    label(dmm, '3.297 V', 0.06, 0.025, 0, 0.035, 0.021, '#c5e1a5', '#1b1b1b', 0, 0, MONO);
    part(dmm, cyl(0.016, 0.016, 0.01, 14), '#212121', 0, -0.02, 0.022, { rx: PI / 2, outline: false });
    rod(g, new THREE.Vector3(0.33, ty + 0.01, front - 0.17), new THREE.Vector3(wx + 0.08, wy + 0.004, wz + 0.05), 0.0025, '#e53935');
    rod(g, new THREE.Vector3(0.35, ty + 0.01, front - 0.17), new THREE.Vector3(wx + 0.085, wy + 0.004, wz - 0.05), 0.0025, '#212121');
    part(g, rbox(0.07, 0.025, 0.1, 0.008), '#212121', -0.25, ty + 0.0125, wz);
    ['#795548', '#e53935', '#ff9800', '#fdd835', '#43a047', '#1e88e5', '#8e24aa', '#9e9e9e'].forEach((col, i) =>
      rod(g, new THREE.Vector3(-0.22, ty + 0.02, wz - 0.035 + i * 0.01), new THREE.Vector3(wx - 0.08, wy + 0.008, wz - 0.03 + i * 0.008), 0.0018, col),
    );
    const nb = frame(g, -0.3, ty, front - 0.08, 0.2);
    part(nb, rbox(0.16, 0.012, 0.22, 0.004), '#263238', 0, 0.006, 0);
    part(nb, box(0.145, 0.003, 0.205), '#fafafa', 0.004, 0.0135, 0, { outline: false });
    for (let i = 0; i < 6; i++) part(nb, box(0.11, 0.0015, 0.004), '#90a4ae', 0.01, 0.0155, -0.07 + i * 0.026, { outline: false });
    // The probe: lying on the mat when nobody's measuring, in the hand when they are, its cable to CH1.
    const pr0 = new THREE.Vector3(wx + 0.12, ty + 0.01, front - 0.1);
    const pr1 = new THREE.Vector3(wx + 0.12, ty + 0.012, front - 0.24);
    aim(probe(idle), pr0, pr1);
    stretch(wire(idle, 0.003, '#37474f'), pr1.clone().add(new THREE.Vector3(0, 0, -0.01)), bnc[0]);
    const pr = probe(use);
    const c1 = wire(use, 0.003, '#37474f');
    const c2 = wire(use, 0.003, '#37474f');
    // The chair.
    const c = frame(g, 0, 0, front + 0.24, PI);
    labChair(c, 0.44, '#455a64');
    const sp = satAt(g, 0, front + 0.24, 'probe', work);
    out.work = work;
    out.spots = { '*': sp, engProbeSignal: sp };
    const tip = new THREE.Vector3();
    const grip = new THREE.Vector3();
    const back = new THREE.Vector3();
    const mid = new THREE.Vector3();
    out.animate = (t) => {
      const kk = probeRound(t, phaseAt(sp));
      offAt(work.position, kk.tip, tip);
      offAt(work.position, kk.r, grip);
      aim(pr, tip, grip);
      back.copy(grip).sub(tip).normalize().multiplyScalar(0.14).add(tip);
      mid.copy(back).lerp(bnc[0], 0.5);
      mid.y -= 0.06;
      stretch(c1, back, mid);
      stretch(c2, mid, bnc[0]);
      const m = scr.material as THREE.MeshBasicMaterial;
      if (m.map !== scopes[kk.i]) m.map = scopes[kk.i];
      trig.visible = Math.sin(t * 9) > 0;
      led.visible = Math.sin(t * 4) > 0;
    };
  },

  /**
   * The test rig (시험 장비): a cast T-slot bed on its legs with hazard paint along its edge, behind a
   * polycarbonate guard on an aluminium frame ('시험 중 접근 금지') with a stack light. On the left a
   * load frame — two chrome columns, the blue crosshead, the actuator, the load cell and its cable, the
   * loading nose — pressing a white bracket beam in three-point bending on its two supports (a strain
   * gauge on it); on the right a shaker on its trunnion with a battery-module prototype clamped to its
   * table and an accelerometer on top. In front, the controller on its pedestal: the monitor with load
   * against time, the vibration spectrum and the cycle count, the keyboard on its tray, an E-stop. In
   * use the nose cycles down and up and the beam bends with it, the shaker's table rattles, the stack
   * light's green. Stood at the controller typing, watching it run.
   */
  testRig(g, W, D, _c, _def, _ctx, out) {
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const bz = -D / 2 + 0.33;
    const by = 0.6;
    const bw = Math.min(W - 0.12, 1.86);
    // The bed: legs, the table, its T-slots, the hazard edge.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.12, by - 0.1, 0.12), '#4e5a63', sx * (bw / 2 - 0.12), (by - 0.1) / 2, bz + sz * 0.22);
    part(g, rbox(bw, 0.1, 0.62, 0.015), '#6b7a85', 0, by - 0.05, bz);
    for (let i = 0; i < 5; i++) part(g, box(bw - 0.04, 0.003, 0.014), '#3d474f', 0, by + 0.001, bz - 0.24 + i * 0.12, { outline: false });
    const haz = painted('ehazEdge', 256, 16, (c) => {
      c.fillStyle = YELLOW;
      c.fillRect(0, 0, 256, 16);
      c.fillStyle = '#212121';
      for (let i = -16; i < 256; i += 16) {
        c.beginPath();
        c.moveTo(i, 16);
        c.lineTo(i + 8, 16);
        c.lineTo(i + 16, 0);
        c.lineTo(i + 8, 0);
        c.fill();
      }
    });
    sheet(g, haz, bw - 0.02, 0.05, 0, by - 0.05, bz + 0.312);
    // The load frame on the left.
    const lx = -0.45;
    const lz = bz - 0.04;
    for (const sx of [-1, 1]) part(g, cyl(0.028, 0.028, 1.02, 16), '#e3e7ea', lx + sx * 0.27, by + 0.51, lz);
    part(g, rbox(0.7, 0.14, 0.18, 0.02), '#3f6fa0', lx, by + 0.75, lz);
    part(g, rbox(0.66, 0.05, 0.16, 0.015), '#3f6fa0', lx, by + 1.02, lz);
    label(g, '하중 시험기 10kN', 0.28, 0.05, lx, by + 0.75, lz + 0.092, '#3f6fa0', '#ffffff');
    part(g, cyl(0.06, 0.06, 0.18, 18), '#90a4ae', lx, by + 0.6, lz);
    const act = frame(g, lx, by + 0.51, lz);
    part(act, cyl(0.02, 0.02, 0.1, 12), '#eceff1', 0, -0.05, 0, { outline: false });
    part(act, cyl(0.04, 0.04, 0.05, 16), '#455a64', 0, -0.125, 0);
    part(act, rbox(0.05, 0.035, 0.08, 0.008), '#607d8b', 0, -0.17, 0);
    part(act, cyl(0.012, 0.012, 0.09, 10), '#cfd8dc', 0, -0.2, 0, { rx: PI / 2 });
    rod(g, new THREE.Vector3(lx + 0.04, by + 0.39, lz), new THREE.Vector3(lx + 0.27, by + 0.6, lz + 0.03), 0.004, '#212121');
    // The supports and the beam in two halves, bent at its middle as it's pressed.
    const span = 0.17;
    for (const s of [-1, 1]) {
      part(g, box(0.05, 0.25, 0.08), '#78909c', lx + s * span, by + 0.125, lz);
      part(g, cyl(0.012, 0.012, 0.09, 10), '#cfd8dc', lx + s * span, by + 0.262, lz, { rx: PI / 2, outline: false });
    }
    const halves = [-1, 1].map((s) => {
      const h = frame(g, lx + s * span, by + 0.286, lz);
      part(h, box(span + 0.04, 0.024, 0.06), '#eceff1', -s * (span + 0.04) / 2 + s * 0.04, 0, 0);
      if (s < 0) {
        part(h, box(0.03, 0.002, 0.02), '#ff9800', span - 0.03, 0.013, 0, { outline: false });
        part(h, box(0.04, 0.0015, 0.004), '#e53935', span - 0.065, 0.013, 0.004, { outline: false });
      }
      return h;
    });
    // The shaker on the right: the body on its trunnion, the table, the module clamped to it, the accelerometer.
    const shx = 0.48;
    const shz = bz - 0.02;
    for (const s of [-1, 1]) part(g, rbox(0.04, 0.32, 0.3, 0.01), '#455a64', shx + s * 0.25, by + 0.16, shz);
    part(g, cyl(0.21, 0.21, 0.26, 28), '#37474f', shx, by + 0.2, shz);
    part(g, cyl(0.215, 0.215, 0.02, 28), '#ffb300', shx, by + 0.32, shz, { outline: false });
    rod(g, new THREE.Vector3(shx, by + 0.15, shz - 0.2), new THREE.Vector3(shx + 0.2, by + 0.05, shz - 0.3), 0.025, '#212121');
    label(g, '진동 시험기', 0.16, 0.035, shx, by + 0.18, shz + 0.212, '#37474f', '#ffffff');
    const table = frame(g, shx, by + 0.335, shz);
    part(table, cyl(0.15, 0.15, 0.03, 26), ALU, 0, 0.015, 0);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2;
      part(table, cyl(0.008, 0.008, 0.032, 6), '#455a64', Math.cos(a) * 0.12, 0.016, Math.sin(a) * 0.12, { outline: false });
    }
    part(table, rbox(0.2, 0.1, 0.14, 0.012), '#ff7043', 0, 0.08, 0);
    label(table, '배터리 모듈 시제품', 0.16, 0.025, 0, 0.09, 0.071, '#ff7043', '#ffffff');
    for (const s of [-1, 1]) part(table, box(0.24, 0.015, 0.025), '#263238', 0, 0.137, s * 0.05);
    part(table, box(0.02, 0.02, 0.02), '#1565c0', 0.05, 0.155, 0, { outline: false });
    rod(g, new THREE.Vector3(shx + 0.05, by + 0.5, shz), new THREE.Vector3(0.62, 1.0, 0.36), 0.003, '#1565c0');
    // The guard: the frame, see-through panels, the sliding front doors, the sign, the stack light.
    const gx = bw / 2 - 0.02;
    const gz0 = bz - 0.3;
    const gz1 = bz + 0.3;
    const gh = 1.12;
    for (const x of [-gx, 0, gx]) for (const zz of [gz0, gz1]) part(g, box(0.03, gh, 0.03), ALU, x, by + gh / 2, zz);
    for (const zz of [gz0, gz1]) part(g, box(bw - 0.02, 0.03, 0.03), ALU, 0, by + gh, zz);
    for (const x of [-gx, gx]) part(g, box(0.03, 0.03, gz1 - gz0), ALU, x, by + gh, bz);
    part(g, box(bw - 0.06, gh - 0.04, 0.006), '#d7eef7', 0, by + gh / 2, gz0, { material: GLASS, outline: false });
    for (const x of [-gx, gx]) part(g, box(0.006, gh - 0.04, gz1 - gz0 - 0.04), '#d7eef7', x, by + gh / 2, bz, { material: GLASS, outline: false });
    for (const s of [-1, 1]) {
      part(g, box(gx - 0.03, gh - 0.06, 0.006), '#d7eef7', (s * gx) / 2, by + gh / 2, gz1 + 0.01 * (s + 1), { material: GLASS, outline: false });
      part(g, rbox(0.025, 0.2, 0.025, 0.008), '#212121', s * 0.1, by + 0.55, gz1 + 0.035);
    }
    label(g, '⚠ 시험 중 접근 금지', 0.5, 0.06, -0.45, by + gh - 0.06, gz1 + 0.03, YELLOW, '#212121');
    const lamps = stackLight(g, gx - 0.05, by + gh + 0.015, gz0 + 0.05, use);
    lamps[2].visible = true;
    // The controller on its pedestal at the front right.
    const cx = 0.62;
    const cz = D / 2 - 0.16;
    part(g, rbox(0.34, 0.02, 0.3, 0.006), '#37474f', cx, 0.01, cz - 0.05);
    part(g, box(0.08, 1.0, 0.08), '#455a64', cx, 0.5, cz - 0.1);
    part(g, rbox(0.42, 0.025, 0.22, 0.008), '#37474f', cx, 0.99, cz);
    part(g, rbox(0.34, 0.015, 0.11, 0.005), '#eceff1', cx - 0.02, 1.012, cz + 0.02);
    for (let r = 0; r < 4; r++) part(g, box(0.31, 0.003, 0.018), '#90a4ae', cx - 0.02, 1.021, cz - 0.02 + r * 0.025, { outline: false });
    part(g, rbox(0.04, 0.012, 0.06, 0.006), '#263238', cx + 0.17, 1.01, cz + 0.02);
    const kb = marker(g, cx - 0.02, 1.03, cz + 0.02);
    part(g, box(0.04, 0.32, 0.04), '#455a64', cx, 1.16, cz - 0.1);
    const mon = frame(g, cx, 1.38, cz - 0.08, 0, -0.12);
    part(mon, rbox(0.36, 0.25, 0.03, 0.01), DARK, 0, 0, 0);
    out.screen = screenOf(mon, rigTex(), 0.33, 0.22, 0, 0, 0.016);
    const es = frame(g, cx + 0.06, 0.88, cz - 0.1, PI / 2);
    part(es, rbox(0.07, 0.07, 0.05, 0.01), YELLOW, 0, 0, 0);
    part(es, cyl(0.026, 0.02, 0.025, 16), '#d50000', 0, 0, 0.035, { rx: PI / 2 });
    const sp = stoodAt(g, cx, D / 2 + 0.36, 'type', kb);
    out.work = kb;
    out.spots = { '*': sp, stressTest: sp };
    out.animate = (t) => {
      const disp = 0.012 * (0.5 + 0.5 * Math.sin(t * PI * 2 * 1.2));
      act.position.y = by + 0.51 - disp;
      halves[0].rotation.z = -disp / span;
      halves[1].rotation.z = disp / span;
      table.position.y = by + 0.335 + 0.003 * Math.sin(t * 81) + 0.002 * Math.sin(t * 47);
      table.rotation.x = 0.004 * Math.sin(t * 63);
    };
  },

  /**
   * A HIL test rack (서버 랙, kept to the tech company's server racks' look): a 42U cabinet on a raised
   * floor tile with a vented one in front, its smoked perforated door swung open. In it, bottom up: a
   * UPS, a programmable power supply (24.0 V and 12.0 V), the 4U real-time simulator with its IO cards'
   * LEDs, an open shelf with the two boards under test on their JTAG debuggers and the CAN interface
   * and its twisted pair, the KVM drawer, two GPU nodes with green light strips and fans, the switch
   * with its patch cables looping down the side; 'HIL 시험 랙' on top. In use the KVM's pulled out and
   * its lid raised, the LEDs flicker. Debugging firmware: stood at it typing, the debugger stopped at a
   * breakpoint on its screen; training a model: the same, the loss coming down on it.
   */
  serverRack(g, W, D, _c, _def, _ctx, out) {
    const rw = Math.min(W - 0.3, 0.62);
    const rd = Math.min(D - 0.2, 0.8);
    const rh = 1.95;
    const z = -D / 2 + rd / 2 + 0.03;
    const zf = z + rd / 2;
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const blink: THREE.Mesh[] = [];
    part(g, box(W - 0.04, 0.03, D - 0.04), '#b0bec5', 0, 0.015, 0);
    for (let r = 0; r < 3; r++) for (let k = 0; k < 8; k++) part(g, box(0.05, 0.002, 0.012), '#546e7a', -0.2 + k * 0.057, 0.032, zf + 0.06 + r * 0.025, { outline: false });
    part(g, rbox(rw, rh, rd, 0.012), '#1c1f24', 0, rh / 2 + 0.03, z);
    part(g, box(rw - 0.08, rh - 0.12, 0.01), '#0f1114', 0, rh / 2 + 0.03, zf - 0.03, { outline: false });
    for (let k = 0; k < 2; k++) part(g, ring(0.07, 0.008), '#37474f', -0.12 + k * 0.24, rh + 0.035, z, { rx: PI / 2, outline: false });
    const iw = rw - 0.1;
    const fz = zf - 0.025;
    const led = (x: number, y: number, col: string, flick: boolean) => {
      const m = part(flick ? use : g, box(0.008, 0.008, 0.003), col, x, y, fz + 0.002, { outline: false, material: glow(col) });
      if (flick) blink.push(m);
    };
    // The UPS and the power supply.
    part(g, box(iw, 0.14, 0.02), '#202326', 0, 0.2, fz - 0.01, { outline: false });
    label(g, 'UPS 98%', 0.08, 0.025, -iw / 2 + 0.08, 0.22, fz + 0.001, '#0b2a12', '#69f0ae', 0, 0, MONO);
    part(g, box(iw, 0.13, 0.02), '#c9ced3', 0, 0.345, fz - 0.01, { outline: false });
    label(g, '24.0V 3.2A', 0.12, 0.028, -0.1, 0.36, fz + 0.001, '#1b0000', '#ff3d00', 0, 0, MONO);
    label(g, '12.0V 1.1A', 0.12, 0.028, 0.08, 0.36, fz + 0.001, '#001b05', '#00e676', 0, 0, MONO);
    // The real-time simulator: IO cards in a row, their LEDs.
    part(g, box(iw, 0.29, 0.02), '#2d3a4a', 0, 0.575, fz - 0.01, { outline: false });
    label(g, 'HIL DWELLER · 실시간 시뮬레이터', 0.3, 0.03, 0, 0.7, fz + 0.001, '#2d3a4a', '#cfd8dc');
    for (let c = 0; c < 8; c++) {
      const cx = -iw / 2 + 0.04 + c * ((iw - 0.08) / 7);
      part(g, box(0.04, 0.2, 0.004), '#3b4a5c', cx, 0.56, fz + 0.001, { outline: false });
      for (let r = 0; r < 4; r++) led(cx, 0.62 - r * 0.035, r === 0 ? '#448aff' : '#00e676', r > 0 && (c + r) % 2 === 0);
    }
    // The open shelf: the boards under test, the debuggers and their ribbons, the CAN interface.
    part(g, box(iw, 0.01, 0.42), '#2b303a', 0, 0.75, fz - 0.2, { outline: false });
    for (const s of [-1, 1]) {
      const bx = s * 0.12;
      board(g, bx, 0.76, fz - 0.12, 0.16, 0.12);
      part(g, rbox(0.06, 0.022, 0.08, 0.006), '#263238', bx, 0.772, fz - 0.3);
      part(g, box(0.04, 0.002, 0.12), '#9e9e9e', bx, 0.785, fz - 0.21, { rx: -0.08, outline: false });
      led(bx + 0.02, 0.785, '#ffd740', true);
      led(bx - 0.05, 0.766, '#76ff03', true);
    }
    part(g, rbox(0.08, 0.04, 0.06, 0.008), '#1565c0', 0.2, 0.78, fz - 0.05);
    label(g, 'CAN', 0.04, 0.016, 0.2, 0.785, fz - 0.019, '#1565c0', '#ffffff');
    for (const col of ['#ff9800', '#43a047']) rod(g, new THREE.Vector3(0.2, 0.78, fz - 0.08), new THREE.Vector3(0.13, 0.77, fz - 0.2), 0.0025, col);
    // The KVM drawer: shut, and pulled out with its lid up in use.
    const ky = 1.08;
    part(g, box(iw, 0.04, 0.02), '#2e3440', 0, ky, fz - 0.005, { outline: false });
    const tray = frame(use, 0, ky, zf + 0.18);
    part(tray, rbox(rw - 0.12, 0.02, 0.42, 0.006), '#2e3440', 0, 0, 0);
    part(tray, box(rw - 0.2, 0.004, 0.16), '#1c1f24', 0, 0.012, 0.08, { outline: false });
    for (let r = 0; r < 4; r++) part(tray, box(rw - 0.24, 0.003, 0.02), '#4c566a', 0, 0.015, 0.03 + r * 0.03, { outline: false });
    for (const s of [-1, 1]) part(tray, box(0.012, 0.012, 0.4), '#dfe4e8', s * ((rw - 0.12) / 2 + 0.006), 0, 0, { outline: false });
    const lid = frame(tray, 0, 0.012, -0.01, 0, -0.18);
    part(lid, rbox(rw - 0.14, 0.27, 0.014, 0.006), '#2e3440', 0, 0.135, 0);
    const gdb = gdbTex();
    const train = trainTex();
    const kvm = sheet(lid, gdb, rw - 0.2, 0.22, 0, 0.14, 0.008);
    const keys = marker(tray, 0, 0.03, 0.1);
    // The GPU nodes, the switch and its cables, the label.
    for (const [i, y] of [1.29, 1.6].entries()) {
      part(g, box(iw, 0.29, 0.02), '#15171a', 0, y, fz - 0.01, { outline: false });
      part(g, box(iw - 0.04, 0.012, 0.004), '#76ff03', 0, y + 0.12, fz + 0.001, { outline: false, material: glow('#76ff03') });
      label(g, `GPU NODE 0${i + 1}`, 0.16, 0.03, -iw / 2 + 0.11, y + 0.08, fz + 0.001, '#15171a', '#b9f6ca', 0, 0, MONO);
      for (let f = 0; f < 3; f++) part(g, ring(0.045, 0.006), '#37474f', -0.12 + f * 0.12, y - 0.04, fz + 0.002, { outline: false });
      led(iw / 2 - 0.04, y + 0.08, '#76ff03', true);
    }
    part(g, box(iw, 0.05, 0.02), '#111317', 0, 1.8, fz - 0.01, { outline: false });
    for (let p = 0; p < 12; p++) part(g, box(0.014, 0.012, 0.006), p % 4 === 3 ? '#fdd835' : '#29b6f6', -iw / 2 + 0.04 + p * 0.037, 1.8, fz + 0.002, { outline: false });
    for (const [k, col] of [[0, '#29b6f6'], [1, '#fdd835'], [2, '#29b6f6']] as Array<[number, string]>) part(g, cyl(0.006, 0.006, 1.0, 6), col, iw / 2 - 0.02 - k * 0.012, 1.3, fz + 0.004, { outline: false });
    label(g, 'HIL 시험 랙', 0.22, 0.04, 0, rh - 0.02, zf + 0.004, '#0f1114', '#cfd8dc');
    // The door swung open to the left.
    const door = frame(g, -rw / 2, 0, zf, -1.9);
    part(door, box(rw - 0.04, rh - 0.06, 0.012), '#1b2430', (rw - 0.04) / 2, rh / 2 + 0.03, 0, { material: SMOKE, outline: false });
    part(door, box(0.02, rh - 0.06, 0.02), '#2b3440', rw - 0.04, rh / 2 + 0.03, 0, { outline: false });
    part(door, box(0.02, rh - 0.06, 0.02), '#2b3440', 0, rh / 2 + 0.03, 0, { outline: false });
    const dbg = stoodAt(g, 0, zf + 0.72, 'type', keys);
    const ai = stoodAt(g, 0, zf + 0.72, 'type', keys);
    out.work = keys;
    out.spots = { '*': dbg, debugFirmware: dbg, engineer_aiModelTrain: ai };
    out.animate = (t) => {
      blink.forEach((b, i) => (b.visible = Math.sin(t * (7 + (i % 5) * 1.7) + i * 1.3) > -0.2));
      const m = kvm.material as THREE.MeshBasicMaterial;
      const want = later(dbg, ai, t) === ai ? train : gdb;
      if (m.map !== want) m.map = want;
    };
  },

  /**
   * The production line's control panel (생산 라인 제어반): a grey control cabinet on its black plinth,
   * double doors — the HMI on the left one (the line's five stations, the count, OEE; lit while it's
   * checked), on the right the 운전 / 정지 / 리셋 buttons, the AUTO/MAN selector, the red E-stop on its
   * yellow plate and the high-voltage sticker — a stack light on top; beside it a length of the line, a
   * belt conveyor carrying motor housings past a photo-eye (its beam lit) under the cable tray and the
   * '3라인' sign. Inside, behind the doors: the PLC and its IO cards' LEDs, the 24 V supply, a row of
   * breakers, contactors, the terminal blocks, grey wire ducts and the wires. Checking the line: stood
   * at the HMI, a hand on its screen, the housings riding by and the light green. In a breakdown: the
   * doors swung open, stood in between them working at the breakers and terminals, the line stopped,
   * a fault LED blinking and the stack light flashing red.
   */
  productionPanel(g, W, D, _c, _def, _ctx, out) {
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const idle = new THREE.Group();
    g.add(idle);
    out.idle = idle;
    const cx = -W / 4;
    const cw = 0.8;
    const cd = 0.45;
    const ch = 1.9;
    const cz = -D / 2 + cd / 2 + 0.03;
    const czf = cz + cd / 2;
    const GREY = '#c9ccc5';
    // The shell: plinth, back, sides, top; the mounting plate.
    part(g, box(cw, 0.1, cd), DARK, cx, 0.05, cz);
    part(g, box(cw, ch - 0.1, 0.02), GREY, cx, 0.1 + (ch - 0.1) / 2, cz - cd / 2 + 0.01);
    for (const s of [-1, 1]) part(g, box(0.02, ch - 0.1, cd), GREY, cx + s * (cw / 2 - 0.01), 0.1 + (ch - 0.1) / 2, cz);
    part(g, box(cw, 0.02, cd), GREY, cx, ch, cz);
    part(g, box(cw - 0.04, 0.02, cd - 0.02), shade(GREY, 0.8), cx, 0.11, cz, { outline: false });
    const pz = cz - cd / 2 + 0.025;
    part(g, box(cw - 0.08, ch - 0.3, 0.01), '#e9ecef', cx, 0.15 + (ch - 0.3) / 2, pz, { outline: false });
    const fz = pz + 0.005;
    // Wire ducts.
    for (const y of [1.66, 1.3, 0.94, 0.58]) part(g, box(cw - 0.12, 0.05, 0.05), '#9e9e9e', cx, y, fz + 0.025, { outline: false });
    for (const s of [-1, 1]) part(g, box(0.05, 1.2, 0.05), '#9e9e9e', cx + s * (cw / 2 - 0.08), 1.12, fz + 0.025, { outline: false });
    // The PLC, its IO cards, the supply.
    part(g, rbox(0.08, 0.13, 0.09, 0.006), '#455a64', cx - 0.24, 1.48, fz + 0.045);
    label(g, 'PLC', 0.05, 0.02, cx - 0.24, 1.52, fz + 0.091, '#455a64', '#ffffff');
    const ioLeds: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      const x = cx - 0.17 + i * 0.035;
      part(g, rbox(0.03, 0.13, 0.09, 0.004), '#37474f', x, 1.48, fz + 0.045);
      for (let r = 0; r < 5; r++) {
        const m = part(use, box(0.006, 0.006, 0.003), '#76ff03', x, 1.52 - r * 0.016, fz + 0.092, { outline: false, material: glow('#76ff03') });
        if ((i + r) % 2 === 0) ioLeds.push(m);
      }
    }
    const fault = part(use, box(0.01, 0.01, 0.003), '#ff1744', cx - 0.26, 1.45, fz + 0.092, { outline: false, material: glow('#ff1744') });
    part(g, rbox(0.1, 0.13, 0.09, 0.006), '#90a4ae', cx + 0.2, 1.48, fz + 0.045);
    label(g, '24V DC', 0.07, 0.02, cx + 0.2, 1.5, fz + 0.091, '#90a4ae', '#212121');
    // Breakers and contactors.
    for (let i = 0; i < 9; i++) {
      const x = cx - 0.27 + i * 0.022;
      part(g, box(0.018, 0.085, 0.07), '#f5f5f5', x, 1.12, fz + 0.035, { outline: false });
      part(g, box(0.008, 0.02, 0.012), i === 5 ? '#d50000' : '#212121', x, i === 5 ? 1.1 : 1.13, fz + 0.075, { outline: false });
    }
    for (let i = 0; i < 3; i++) {
      part(g, rbox(0.05, 0.08, 0.08, 0.006), '#cfd8dc', cx + 0.05 + i * 0.065, 1.12, fz + 0.04);
      part(g, box(0.035, 0.015, 0.003), '#ffffff', cx + 0.05 + i * 0.065, 1.15, fz + 0.081, { outline: false });
    }
    // Terminal blocks and their wires.
    const tcols = ['#9e9e9e', '#9e9e9e', '#1e88e5', '#9e9e9e', '#cddc39'];
    for (let i = 0; i < 26; i++) part(g, box(0.006, 0.055, 0.05), tcols[i % 5], cx - 0.26 + i * 0.0105 * 2, 0.76, fz + 0.025, { outline: false });
    const wcols = ['#1565c0', '#6d4c41', '#212121', '#cddc39', '#e53935'];
    for (let i = 0; i < 12; i++) part(g, cyl(0.003, 0.003, 0.14, 5), wcols[i % 5], cx - 0.25 + i * 0.045, 0.86, fz + 0.03, { outline: false });
    for (let i = 0; i < 8; i++) part(g, cyl(0.003, 0.003, 0.12, 5), wcols[(i + 2) % 5], cx - 0.2 + i * 0.05, 1.21, fz + 0.03, { outline: false });
    const fixAt = marker(g, cx - 0.1, 1.12, fz + 0.1);
    // The doors: shut (nobody at it), shut with the HMI lit (checking), swung open (fixing).
    const doors = (p: THREE.Object3D, open: boolean): THREE.Mesh => {
      let screen: THREE.Mesh | null = null;
      for (const s of [-1, 1]) {
        const hx = cx + s * (cw / 2);
        const leaf = frame(p, hx, 0, czf, open ? s * 1.9 : 0);
        const dir = -s;
        const lw = cw / 2 - 0.005;
        const mx = (dir * lw) / 2;
        part(leaf, box(lw, ch - 0.12, 0.022), GREY, mx, 0.1 + (ch - 0.1) / 2, 0.011);
        for (let i = 0; i < 6; i++) part(leaf, box(lw - 0.12, 0.008, 0.004), shade(GREY, 0.7), mx, 0.2 + i * 0.022, 0.024, { outline: false });
        part(leaf, rbox(0.03, 0.14, 0.03, 0.008), '#37474f', dir * (lw - 0.04), 1.0, 0.035);
        if (s < 0) {
          // The HMI.
          part(leaf, rbox(0.3, 0.22, 0.03, 0.01), DARK, mx, 1.4, 0.035);
          screen = screenOf(leaf, hmiTex(), 0.27, 0.18, mx, 1.4, 0.051);
          label(leaf, '3라인 제어반', 0.2, 0.035, mx, 1.6, 0.023, '#37474f', '#ffffff');
        } else {
          // The buttons, the selector, the E-stop, the sticker.
          const bcols: Array<[string, string]> = [['#43a047', '운전'], ['#e53935', '정지'], ['#fdd835', '리셋']];
          bcols.forEach(([col, word], i) => {
            const bx = mx - 0.1 + i * 0.1;
            part(leaf, cyl(0.022, 0.022, 0.012, 14), '#9e9e9e', bx, 1.12, 0.026, { rx: PI / 2, outline: false });
            part(leaf, cyl(0.017, 0.017, 0.02, 14), col, bx, 1.12, 0.032, { rx: PI / 2 });
            label(leaf, word, 0.06, 0.022, bx, 1.075, 0.023, '#212121', '#ffffff');
          });
          part(leaf, cyl(0.022, 0.022, 0.012, 14), '#212121', mx + 0.1, 1.22, 0.028, { rx: PI / 2 });
          part(leaf, box(0.01, 0.034, 0.012), '#eceff1', mx + 0.1, 1.22, 0.036, { rz: 0.6, outline: false });
          label(leaf, 'AUTO  MAN', 0.08, 0.018, mx + 0.1, 1.255, 0.023, 'none', '#212121');
          part(leaf, cyl(0.05, 0.05, 0.006, 20), YELLOW, mx - 0.05, 1.3, 0.025, { rx: PI / 2, outline: false });
          part(leaf, cyl(0.03, 0.024, 0.03, 18), '#d50000', mx - 0.05, 1.3, 0.04, { rx: PI / 2 });
          label(leaf, '비상 정지', 0.08, 0.02, mx - 0.05, 1.235, 0.023, 'none', '#212121');
          label(leaf, '⚡ 고압 주의', 0.14, 0.05, mx, 0.62, 0.023, YELLOW, '#212121');
        }
      }
      return screen!;
    };
    doors(idle, false);
    const shut = new THREE.Group();
    use.add(shut);
    out.screen = doors(shut, false);
    const opened = new THREE.Group();
    use.add(opened);
    doors(opened, true);
    const lamps = stackLight(g, cx + 0.25, ch + 0.01, cz, use);
    // The cable tray along the wall to the line, dropping down to it.
    part(g, box(W / 2 - 0.1, 0.04, 0.12), '#9e9e9e', W / 4, 1.62, -D / 2 + 0.08);
    part(g, box(0.12, 0.7, 0.04), '#9e9e9e', W / 2 - 0.12, 1.25, -D / 2 + 0.08);
    label(g, '3라인 · 모터 하우징 조립', 0.44, 0.07, W / 4, 1.75, -D / 2 + 0.03, '#37474f', '#ffffff');
    // The conveyor.
    const vx0 = 0.04;
    const vx1 = W / 2 - 0.04;
    const vy = 0.85;
    const vz = -0.08;
    const vw = 0.36;
    const vl = vx1 - vx0;
    const vmx = (vx0 + vx1) / 2;
    for (const x of [vx0 + 0.06, vx1 - 0.06]) for (const s of [-1, 1]) part(g, box(0.04, vy - 0.06, 0.04), ALU, x, (vy - 0.06) / 2, vz + s * (vw / 2 - 0.02));
    for (const s of [-1, 1]) {
      part(g, box(vl, 0.08, 0.03), ALU, vmx, vy - 0.02, vz + s * (vw / 2 + 0.015));
      rod(g, new THREE.Vector3(vx0, vy + 0.06, vz + s * (vw / 2 - 0.01)), new THREE.Vector3(vx1, vy + 0.06, vz + s * (vw / 2 - 0.01)), 0.006, '#cfd8dc');
    }
    part(g, box(vl - 0.04, 0.02, vw), '#263238', vmx, vy, vz);
    for (const x of [vx0 + 0.02, vx1 - 0.02]) part(g, cyl(0.03, 0.03, vw, 16), '#90a4ae', x, vy - 0.005, vz, { rx: PI / 2 });
    part(g, cyl(0.05, 0.05, 0.12, 16), '#1565c0', vx1 - 0.06, vy - 0.12, vz + vw / 2 + 0.07, { rx: PI / 2 });
    // The photo-eye and its reflector, the beam.
    const ex = vmx + 0.15;
    part(g, box(0.02, 0.12, 0.02), ALU, ex, vy + 0.03, vz + vw / 2 + 0.04);
    part(g, rbox(0.03, 0.04, 0.03, 0.006), DARK, ex, vy + 0.08, vz + vw / 2 + 0.03);
    part(g, box(0.006, 0.006, 0.003), '#ff9100', ex, vy + 0.09, vz + vw / 2 + 0.047, { outline: false, material: glow('#ff9100') });
    part(g, box(0.02, 0.12, 0.02), ALU, ex, vy + 0.03, vz - vw / 2 - 0.04);
    part(g, box(0.03, 0.03, 0.006), '#e53935', ex, vy + 0.08, vz - vw / 2 - 0.028);
    const beam = part(use, box(0.003, 0.003, vw + 0.04), '#ff1744', ex, vy + 0.08, vz, { outline: false, material: glow('#ff5252') });
    // The housings riding along (in use), standing on the belt (idle).
    const housing = (p: THREE.Object3D, x: number): THREE.Group => {
      const h = frame(p, x, vy + 0.01, vz);
      part(h, rbox(0.1, 0.02, 0.1, 0.006), '#78909c', 0, 0.01, 0);
      part(h, cyl(0.04, 0.042, 0.07, 18), ALU, 0, 0.055, 0);
      part(h, cyl(0.02, 0.02, 0.072, 14), '#455a64', 0, 0.056, 0, { outline: false });
      return h;
    };
    for (let i = 0; i < 3; i++) housing(idle, vx0 + 0.12 + i * 0.3);
    const riding = [0, 1, 2, 3].map(() => housing(use, 0));
    const hmiAt = marker(g, cx - cw / 4, 1.4, czf + 0.06);
    const check = stoodAt(g, cx - cw / 4 + 0.05, czf + 0.5, 'board', hmiAt);
    const fix = stoodAt(g, cx, czf + 0.12, 'tinker', fixAt);
    out.work = hmiAt;
    out.spots = { '*': check, monitorLine: check, fixProductionLine: fix };
    out.animate = (t) => {
      const broke = later(check, fix, t) === fix;
      opened.visible = broke;
      shut.visible = !broke;
      lamps[0].visible = broke && Math.sin(t * 9) > 0;
      lamps[1].visible = false;
      lamps[2].visible = !broke;
      fault.visible = broke && Math.sin(t * 6) > 0;
      ioLeds.forEach((m, i) => (m.visible = broke ? i % 3 === 0 : Math.sin(t * (5 + (i % 4) * 2) + i) > -0.3));
      beam.visible = !broke;
      riding.forEach((h, i) => {
        const u = broke ? (0.4 + i / 4) % 1 : (t * 0.1 + i / 4) % 1;
        h.position.x = vx0 + 0.06 + u * (vl - 0.12);
        h.visible = u > 0.02 && u < 0.98;
      });
    };
  },

  /**
   * The robot cell (산업용 로봇 셀): an orange six-axis industrial arm on its pedestal inside a safety
   * fence — yellow posts, wire-mesh panels, the interlocked gate, '로봇 작동 중 · 출입 금지', hazard tape
   * round it on the floor, a stack light on a post — with the infeed table and its tray of parts on
   * one side, the fixture it places them in on the other, its controller cabinet in the corner and the
   * operator's start/stop box outside. The teach pendant hangs on the gate post. Teaching it: stood
   * outside the fence with the pendant in both hands, jogging on its keys and looking up at the arm as
   * it runs the taught pick-and-place (over the part, down, grip, up, round, down, release), the stack
   * light's amber blinking for manual mode.
   */
  engRobotCell(g, W, D, _c, _def, _ctx, out) {
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const idle = new THREE.Group();
    g.add(idle);
    out.idle = idle;
    const fx = W / 2 - 0.07;
    const fb = -D / 2 + 0.07;
    const ff = D / 2 - 0.45;
    const fh = 1.6;
    // The floor plate inside and the tape round the fence.
    part(g, box(2 * fx, 0.01, ff - fb), '#8d99a3', 0, 0.005, (ff + fb) / 2, { outline: false });
    hazardTape(g, 0, ff + 0.06, 2 * fx + 0.1, 0);
    hazardTape(g, 0, fb - 0.04, 2 * fx + 0.1, 0);
    for (const s of [-1, 1]) hazardTape(g, s * (fx + 0.04), (ff + fb) / 2, ff - fb + 0.1, PI / 2);
    // The fence: posts, mesh panels in their frames, the gate.
    const zm = (ff + fb) / 2;
    const posts: Array<[number, number]> = [[-fx, fb], [0, fb], [fx, fb], [-fx, zm], [fx, zm], [-fx, ff], [0, ff], [fx, ff]];
    for (const [x, zz] of posts) {
      part(g, box(0.05, fh, 0.05), YELLOW, x, fh / 2, zz);
      part(g, box(0.12, 0.012, 0.12), DARK, x, 0.006, zz, { outline: false });
    }
    const mesh = meshTex();
    const panel = (x0: number, z0: number, x1: number, z1: number) => {
      const len = Math.hypot(x1 - x0, z1 - z0) - 0.06;
      const ry = Math.atan2(-(z1 - z0), x1 - x0);
      const f = frame(g, (x0 + x1) / 2, 0, (z0 + z1) / 2, ry);
      for (const y of [0.15, fh - 0.08]) part(f, box(len, 0.025, 0.025), '#37474f', 0, y, 0, { outline: false });
      for (const s of [-1, 1]) part(f, box(0.025, fh - 0.23, 0.025), '#37474f', s * (len / 2 - 0.012), (0.15 + fh - 0.08) / 2, 0, { outline: false });
      const m = sheet(f, mesh, len - 0.03, fh - 0.26, 0, (0.15 + fh - 0.08) / 2, 0);
      (m.material as THREE.MeshBasicMaterial).side = THREE.DoubleSide;
      (m.material as THREE.MeshBasicMaterial).depthWrite = false;
      return f;
    };
    panel(-fx, fb, 0, fb);
    panel(0, fb, fx, fb);
    for (const s of [-1, 1]) {
      panel(s * fx, fb, s * fx, zm);
      panel(s * fx, zm, s * fx, ff);
    }
    const gate = panel(-fx, ff, 0, ff);
    part(gate, rbox(0.03, 0.25, 0.03, 0.01), YELLOW, fx / 2 - 0.08, 1.0, 0.04);
    panel(0, ff, fx, ff);
    part(g, rbox(0.05, 0.09, 0.05, 0.008), '#d50000', 0, 1.2, ff + 0.04);
    label(g, '안전 인터록', 0.12, 0.025, -0.45, 1.36, ff + 0.02, '#37474f', '#ffffff');
    label(g, '⚠ 로봇 작동 중 · 출입 금지', 0.6, 0.08, fx / 2, 1.3, ff + 0.02, YELLOW, '#212121');
    const lamps = stackLight(g, fx, fh, fb, use);
    lamps[2].visible = true;
    // The pedestal, the arm (still at home, or running), its gripper.
    const rx0 = 0;
    const rz0 = (ff + fb) / 2 - 0.05;
    part(g, rbox(0.36, 0.3, 0.36, 0.02), '#5f6b73', rx0, 0.15, rz0);
    part(g, box(0.4, 0.02, 0.4), '#455a64', rx0, 0.3, rz0);
    const home = P(0, 0.35, 0.75, 2.2, 0, 1);
    const gripper = (a: Arm) => {
      part(a.tool, rbox(0.1, 0.04, 0.06, 0.008), DARK, 0, 0.02, 0);
      const fingers = [-1, 1].map((s) => part(a.tool, box(0.012, 0.06, 0.04), '#b0bec5', s * 0.036, 0.07, 0));
      return fingers;
    };
    const parked = robotArm(idle, rx0, 0.31, rz0, 1.25, ORANGE, '#424242', 0.075);
    gripper(parked);
    poseArm(parked, home);
    const arm = robotArm(use, rx0, 0.31, rz0, 1.25, ORANGE, '#424242', 0.075);
    const fingers = gripper(arm);
    poseArm(arm, home);
    label(g, 'HG-R12', 0.12, 0.03, rx0, 0.2, rz0 + 0.181, '#5f6b73', '#ffffff');
    // The infeed table and its tray, the fixture table.
    const reach = 0.55;
    const tableTop = 0.72;
    const partBox = (p: THREE.Object3D, x: number, y: number, z: number) => {
      const m = part(p, rbox(0.05, 0.05, 0.05, 0.006), '#b0bec5', x, y, z);
      part(m, cyl(0.012, 0.012, 0.052, 10), '#546e7a', 0, 0, 0, { outline: false });
      return m;
    };
    for (const s of [-1, 1]) {
      const tx = rx0 + s * reach;
      for (const a of [-1, 1]) for (const b of [-1, 1]) part(g, box(0.035, tableTop - 0.03, 0.035), '#78909c', tx + a * 0.13, (tableTop - 0.03) / 2, rz0 + b * 0.13);
      part(g, rbox(0.34, 0.03, 0.34, 0.008), '#90a4ae', tx, tableTop - 0.015, rz0);
    }
    part(g, rbox(0.26, 0.02, 0.26, 0.006), '#1e88e5', rx0 - reach, tableTop + 0.01, rz0);
    for (let i = 0; i < 9; i++) {
      if (i === 4) continue;
      partBox(g, rx0 - reach - 0.07 + (i % 3) * 0.07, tableTop + 0.045, rz0 - 0.07 + Math.floor(i / 3) * 0.07);
    }
    part(g, rbox(0.16, 0.03, 0.16, 0.006), '#263238', rx0 + reach, tableTop + 0.015, rz0);
    for (const s of [-1, 1]) part(g, box(0.02, 0.04, 0.12), '#ffb300', rx0 + reach + s * 0.05, tableTop + 0.05, rz0);
    const pickY = tableTop + 0.045;
    const atPick = partBox(use, rx0 - reach, pickY, rz0);
    const atPlace = partBox(use, rx0 + reach, tableTop + 0.055, rz0);
    const held = partBox(arm.tool, 0, 0.075, 0);
    partBox(idle, rx0 - reach, pickY, rz0);
    // The controller cabinet in the corner, its cable to the arm; the operator's box outside.
    const ccx = -fx + 0.24;
    const ccz = fb + 0.2;
    part(g, rbox(0.34, 0.85, 0.28, 0.012), '#cfd8dc', ccx, 0.425, ccz);
    label(g, 'RC-7 컨트롤러', 0.22, 0.04, ccx, 0.7, ccz + 0.142, '#cfd8dc', '#263238');
    part(g, cyl(0.035, 0.035, 0.03, 14), '#fdd835', ccx + 0.08, 0.5, ccz + 0.15, { rx: PI / 2 });
    part(g, box(0.05, 0.015, 0.02), '#d50000', ccx + 0.08, 0.5, ccz + 0.17, { outline: false });
    part(g, ring(0.06, 0.008), '#455a64', ccx - 0.06, 0.4, ccz + 0.142, { outline: false });
    rod(g, new THREE.Vector3(ccx + 0.17, 0.03, ccz), new THREE.Vector3(rx0, 0.03, rz0 - 0.18), 0.018, '#212121');
    const ob = frame(g, fx + 0.07, 1.0, ff - 0.12, PI / 2);
    part(ob, rbox(0.14, 0.2, 0.08, 0.01), '#eceff1', 0, 0, 0);
    part(ob, cyl(0.018, 0.018, 0.02, 14), '#43a047', -0.03, 0.04, 0.045, { rx: PI / 2 });
    part(ob, cyl(0.018, 0.018, 0.02, 14), '#e53935', 0.03, 0.04, 0.045, { rx: PI / 2 });
    part(ob, cyl(0.016, 0.016, 0.02, 14), '#212121', 0, -0.04, 0.045, { rx: PI / 2 });
    label(ob, '시작  정지', 0.1, 0.02, 0, 0.075, 0.041, 'none', '#212121');
    // The pendant: hung on the gate post (idle), in the hands (in use), its cable through the fence.
    const pendant = (p: THREE.Object3D) => {
      part(p, rbox(0.24, 0.17, 0.045, 0.02), '#37474f', 0, 0, 0);
      sheet(p, pendantTex(), 0.13, 0.1, -0.025, 0.015, 0.024);
      for (let i = 0; i < 6; i++) part(p, box(0.018, 0.012, 0.006), '#cfd8dc', 0.075 + (i % 2) * 0.025, 0.035 - Math.floor(i / 2) * 0.025, 0.024, { outline: false });
      part(p, cyl(0.018, 0.018, 0.02, 14), '#d50000', 0.09, 0.07, 0.025, { rx: PI / 2 });
      part(p, rbox(0.03, 0.08, 0.02, 0.006), '#fdd835', -0.125, -0.01, -0.01);
      part(p, rbox(0.03, 0.08, 0.02, 0.006), '#fdd835', 0.125, -0.01, -0.01);
    };
    const hung = frame(idle, 0.1, 1.15, ff + 0.05);
    pendant(hung);
    part(idle, coil(0.035, 0.45, 8), '#263238', 0.1, 0.6, ff + 0.06, { outline: false });
    const penAt = marker(g, 0, 1.06, D / 2 - 0.3);
    const held2 = frame(use, 0, 1.06, D / 2 - 0.3, 0, -0.65);
    pendant(held2);
    const port = new THREE.Vector3(0.03, 0.35, ff + 0.03);
    stretch(wire(use, 0.006, '#263238'), new THREE.Vector3(0, 0.98, D / 2 - 0.27), port);
    const sp = stoodAt(g, 0, D / 2 - 0.02, 'pendant', penAt);
    out.work = penAt;
    out.spots = { '*': sp, engTeachRobot: sp };
    const keys: Array<[number, ArmPose]> = [
      [0, home],
      [0.12, P(-PI / 2, reach, 0.6, PI, 0, 1)],
      [0.2, P(-PI / 2, reach, pickY - 0.31, PI, 0, 1)],
      [0.26, P(-PI / 2, reach, pickY - 0.31, PI, 0, 0)],
      [0.34, P(-PI / 2, reach, 0.62, PI, 0, 0)],
      [0.55, P(PI / 2, reach, 0.62, PI, PI / 2, 0)],
      [0.63, P(PI / 2, reach, pickY - 0.3, PI, PI / 2, 0)],
      [0.69, P(PI / 2, reach, pickY - 0.3, PI, PI / 2, 1)],
      [0.77, P(PI / 2, reach, 0.62, PI, PI / 2, 1)],
      [0.92, home],
      [1, home],
    ];
    out.animate = (t) => {
      const u = (((t / 10 + phaseAt(sp)) % 1) + 1) % 1;
      const p = keyedPose(keys, u);
      poseArm(arm, p);
      fingers[0].position.x = -(0.022 + 0.016 * p.grip);
      fingers[1].position.x = 0.022 + 0.016 * p.grip;
      atPick.visible = u < 0.26;
      held.visible = u >= 0.26 && u < 0.69;
      atPlace.visible = u >= 0.69;
      lamps[1].visible = Math.sin(t * 6) > 0;
    };
  },

  /**
   * The prototyping corner (시제품 제작 코너): a steel drawer cabinet with, on the left, a desktop CNC mill
   * in its enclosure — the gantry and the spindle over an aluminium block in a blue vice on the T-slot
   * bed, the work light, the window doors, its controller hung at the side (the program, X/Y/Z,
   * spindle and feed, cycle start and the E-stop) — and on the right an enclosed 3D printer with its
   * spool of teal filament, the toolhead on its gantry over the gold build plate, its touchscreen;
   * finished prints and a gear or two between them. Machining a part: stood at the mill's controller,
   * the spindle spinning and stepping round the pocket, chips flying, the light on. Printing: stood at
   * the printer at its screen while the toolhead weaves and the bracket grows up off the plate.
   */
  engFabCorner(g, W, D, _c, _def, _ctx, out) {
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const ty = 0.8;
    const bz = -D / 2 + 0.36;
    // The cabinet: its drawers, the top.
    part(g, rbox(W - 0.06, ty - 0.04, 0.66, 0.015), '#4f5b66', 0, (ty - 0.04) / 2, bz);
    for (let c = 0; c < 4; c++)
      for (let r = 0; r < 3; r++) {
        const dx = -W / 2 + 0.03 + (c + 0.5) * ((W - 0.06) / 4);
        const dy = 0.15 + r * 0.2;
        part(g, box((W - 0.06) / 4 - 0.03, 0.17, 0.006), '#5d6b77', dx, dy, bz + 0.332, { outline: false });
        part(g, box(0.14, 0.015, 0.012), '#cfd8dc', dx, dy + 0.06, bz + 0.338, { outline: false });
      }
    part(g, rbox(W - 0.04, 0.04, 0.7, 0.01), '#9aa3ab', 0, ty - 0.02, bz);
    // The CNC mill's enclosure: frame, panels, window doors, the light.
    const mx = -0.48;
    const mz = bz - 0.05;
    const mw = 0.74;
    const mh = 0.62;
    const md = 0.56;
    const y0 = ty;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.03, mh, 0.03), '#263238', mx + sx * (mw / 2 - 0.015), y0 + mh / 2, mz + sz * (md / 2 - 0.015));
    for (const sz of [-1, 1]) part(g, box(mw, 0.03, 0.03), '#263238', mx, y0 + mh, mz + sz * (md / 2 - 0.015));
    part(g, box(mw - 0.02, 0.02, md - 0.02), '#cfd8dc', mx, y0 + mh, mz);
    part(g, box(mw - 0.04, mh - 0.03, 0.01), '#cfd8dc', mx, y0 + mh / 2, mz - md / 2 + 0.01);
    for (const sx of [-1, 1]) part(g, box(0.01, mh - 0.03, md - 0.04), '#cfd8dc', mx + sx * (mw / 2 - 0.01), y0 + mh / 2, mz, { material: sx < 0 ? undefined : GLASS, outline: sx < 0 });
    for (const s of [-1, 1]) {
      part(g, box(mw / 2 - 0.02, mh - 0.08, 0.008), '#d7eef7', mx + (s * mw) / 4, y0 + mh / 2, mz + md / 2 + 0.005 * (s + 1), { material: GLASS, outline: false });
      part(g, rbox(0.02, 0.16, 0.02, 0.006), '#212121', mx + s * 0.06, y0 + mh / 2, mz + md / 2 + 0.03);
    }
    label(g, 'CNC 밀링 HG-M3', 0.22, 0.035, mx, y0 + mh - 0.04, mz + md / 2 + 0.016, '#263238', '#ffffff');
    part(g, box(mw - 0.1, 0.012, 0.03), '#fffde7', mx, y0 + mh - 0.03, mz - 0.1, { outline: false });
    const light = part(use, box(mw - 0.1, 0.006, 0.026), '#ffffff', mx, y0 + mh - 0.038, mz - 0.1, { outline: false, material: glow('#ffffff') });
    // The bed, the vice and the block.
    part(g, box(mw - 0.1, 0.04, md - 0.12), '#37474f', mx, y0 + 0.02, mz);
    for (let i = 0; i < 4; i++) part(g, box(mw - 0.12, 0.003, 0.012), '#212121', mx, y0 + 0.041, mz - 0.15 + i * 0.1, { outline: false });
    part(g, rbox(0.16, 0.05, 0.1, 0.006), '#1565c0', mx, y0 + 0.065, mz + 0.02);
    for (const s of [-1, 1]) part(g, box(0.02, 0.04, 0.1), '#b0bec5', mx + s * 0.06, y0 + 0.1, mz + 0.02);
    part(g, box(0.1, 0.035, 0.08), '#d6dbdf', mx, y0 + 0.105, mz + 0.02);
    part(g, box(0.05, 0.002, 0.03), '#90a4ae', mx, y0 + 0.1235, mz + 0.02, { outline: false });
    // The gantry (moves in and out) and the spindle (side to side).
    const gantry = frame(g, 0, 0, 0);
    for (const s of [-1, 1]) part(gantry, box(0.04, 0.38, 0.06), '#eceff1', mx + s * 0.3, y0 + 0.22, mz);
    part(gantry, box(0.64, 0.06, 0.06), '#eceff1', mx, y0 + 0.43, mz);
    const head = frame(gantry, mx, y0 + 0.43, mz + 0.05);
    part(head, rbox(0.1, 0.14, 0.06, 0.01), '#eceff1', 0, 0, 0);
    part(head, cyl(0.035, 0.035, 0.2, 16), DARK, 0, -0.14, 0.01);
    const bit = frame(head, 0, -0.25, 0.01);
    part(bit, cyl(0.012, 0.012, 0.02, 10), '#90a4ae', 0, 0, 0, { outline: false });
    part(bit, cyl(0.005, 0.005, 0.05, 8), '#cfd8dc', 0, -0.035, 0, { outline: false });
    part(bit, box(0.012, 0.03, 0.002), '#cfd8dc', 0, -0.04, 0, { outline: false });
    const chips: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) chips.push(part(use, box(0.006, 0.003, 0.004), '#cfd8dc', 0, 0, 0, { outline: false, shadow: false }));
    // Its controller at the side.
    const cb = frame(g, mx + mw / 2 + 0.07, y0 + 0.36, mz + md / 2 - 0.02, -0.25);
    part(cb, rbox(0.14, 0.22, 0.05, 0.01), '#37474f', 0, 0, 0);
    sheet(cb, cncTex(), 0.11, 0.08, 0, 0.05, 0.026);
    part(cb, cyl(0.014, 0.014, 0.015, 12), '#43a047', -0.035, -0.05, 0.03, { rx: PI / 2 });
    part(cb, cyl(0.018, 0.014, 0.02, 14), '#d50000', 0.035, -0.05, 0.032, { rx: PI / 2 });
    part(cb, cyl(0.012, 0.012, 0.015, 12), '#212121', 0, -0.085, 0.03, { rx: PI / 2 });
    rod(g, new THREE.Vector3(mx + mw / 2, y0 + 0.4, mz + md / 2 - 0.05), new THREE.Vector3(mx + mw / 2 + 0.05, y0 + 0.36, mz + md / 2 - 0.04), 0.012, '#455a64');
    const cncAt = marker(g, mx + mw / 2 + 0.08, y0 + 0.3, mz + md / 2 + 0.03);
    // The 3D printer: frame, glass, the plate, the gantry and toolhead, the spool, the screen.
    const px = 0.5;
    const pz = bz - 0.05;
    const pw = 0.5;
    const phh = 0.56;
    const pd = 0.5;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.025, phh, 0.025), '#212121', px + sx * (pw / 2 - 0.012), ty + phh / 2, pz + sz * (pd / 2 - 0.012));
    for (const y of [ty + 0.05, ty + phh]) for (const sz of [-1, 1]) part(g, box(pw, 0.025, 0.025), '#212121', px, y, pz + sz * (pd / 2 - 0.012));
    for (const y of [ty + 0.05, ty + phh]) for (const sx of [-1, 1]) part(g, box(0.025, 0.025, pd), '#212121', px + sx * (pw / 2 - 0.012), y, pz);
    part(g, box(pw - 0.03, phh - 0.06, 0.006), '#d7eef7', px, ty + phh / 2 + 0.02, pz + pd / 2, { material: GLASS, outline: false });
    part(g, box(pw - 0.03, 0.006, pd - 0.03), '#d7eef7', px, ty + phh + 0.012, pz, { material: GLASS, outline: false });
    for (const sx of [-1, 1]) part(g, box(0.006, phh - 0.06, pd - 0.03), '#d7eef7', px + sx * (pw / 2 - 0.003), ty + phh / 2 + 0.02, pz, { material: GLASS, outline: false });
    part(g, box(pw - 0.03, phh - 0.06, 0.006), '#263238', px, ty + phh / 2 + 0.02, pz - pd / 2 + 0.01, { outline: false });
    const plateY = ty + 0.09;
    part(g, box(0.36, 0.012, 0.36), '#263238', px, plateY - 0.006, pz);
    part(g, box(0.34, 0.003, 0.34), '#c9a227', px, plateY + 0.0015, pz, { outline: false });
    for (const s of [-1, 1]) rod(g, new THREE.Vector3(px - pw / 2 + 0.03, ty + phh - 0.06, pz + s * 0.18), new THREE.Vector3(px + pw / 2 - 0.03, ty + phh - 0.06, pz + s * 0.18), 0.005, '#cfd8dc');
    const bar = frame(g, px, ty + phh - 0.06, pz);
    part(bar, box(0.03, 0.02, 0.4), '#37474f', 0, 0, 0);
    const toolhead = frame(g, px, ty + 0.2, pz);
    part(toolhead, rbox(0.07, 0.07, 0.06, 0.01), '#ff6d00', 0, 0.02, 0);
    part(toolhead, ring(0.018, 0.004), '#212121', 0, 0.02, 0.031, { outline: false });
    part(toolhead, cyl(0.006, 0.002, 0.02, 8), '#d4af37', 0, -0.025, 0, { outline: false });
    // The bracket being printed: grown from the plate as the print goes on.
    const print = frame(g, px, plateY + 0.003, pz);
    part(print, box(0.16, 0.03, 0.08), '#00bfa5', 0, 0.015, 0);
    part(print, box(0.03, 0.1, 0.08), '#00bfa5', -0.065, 0.05, 0);
    part(print, cyl(0.012, 0.012, 0.031, 10), '#004d40', 0.04, 0.0155, 0, { outline: false });
    print.scale.y = 0.6;
    // The spool on its holder; the tube to the toolhead.
    part(g, cyl(0.008, 0.008, 0.12, 8), '#cfd8dc', px + pw / 2 + 0.06, ty + 0.4, pz, { rz: PI / 2, outline: false });
    part(g, cyl(0.1, 0.1, 0.065, 24), '#00bfa5', px + pw / 2 + 0.07, ty + 0.4, pz, { rz: PI / 2 });
    part(g, cyl(0.04, 0.04, 0.07, 16), '#263238', px + pw / 2 + 0.07, ty + 0.4, pz, { rz: PI / 2, outline: false });
    const tube = wire(g, 0.004, '#eceff1');
    const tubeFrom = new THREE.Vector3(px + pw / 2 + 0.02, ty + phh, pz);
    const th = new THREE.Vector3();
    stretch(tube, tubeFrom, th.copy(toolhead.position).setY(toolhead.position.y + 0.06));
    // The touchscreen on the front bar.
    const scr = frame(g, px + 0.12, ty + 0.05, pz + pd / 2 + 0.02, 0, -0.6);
    part(scr, rbox(0.12, 0.08, 0.015, 0.005), '#212121', 0, 0, 0);
    out.screen = screenOf(scr, printerTex(), 0.1, 0.065, 0, 0, 0.008);
    const printAt = marker(g, px + 0.08, ty + 0.12, pz + pd / 2 + 0.06);
    label(g, '3D 프린터', 0.14, 0.03, px - 0.08, ty + phh - 0.02, pz + pd / 2 + 0.008, '#212121', '#ffffff');
    // Finished prints between them.
    for (const [i, col] of ['#ff7043', '#00bfa5', '#ffca28'].entries()) part(g, cyl(0.028, 0.028, 0.012, 10), col, -0.03 + i * 0.04, ty + 0.006 + i * 0.012, bz + 0.22 - i * 0.03, { outline: false });
    part(g, rbox(0.06, 0.04, 0.05, 0.006), '#00bfa5', -0.02, ty + 0.02, bz + 0.12);
    const mill = stoodAt(g, mx + mw / 2 + 0.02, D / 2 + 0.08, 'tinker', cncAt);
    const printing = stoodAt(g, px + 0.06, D / 2 + 0.08, 'tinker', printAt);
    out.work = cncAt;
    out.spots = { '*': mill, engineer_partMachining: mill, engPrintPrototype: printing };
    out.animate = (t) => {
      const milling = later(printing, mill, t) === mill;
      light.visible = milling;
      if (milling) {
        const a = t * 1.4;
        head.position.x = mx + 0.035 * Math.cos(a);
        gantry.position.z = 0.025 * Math.sin(a);
        bit.rotation.y = t * 40;
        chips.forEach((c, i) => {
          const f = (t * 2.2 + i / 6) % 1;
          const ang = i * 1.7 + t;
          c.visible = true;
          c.position.set(head.position.x + Math.cos(ang) * f * 0.1, y0 + 0.125 + Math.sin(f * PI) * 0.06, mz + 0.05 + gantry.position.z + Math.sin(ang) * f * 0.08);
          c.rotation.set(t * 9 + i, t * 7, 0);
        });
      } else {
        for (const c of chips) c.visible = false;
        const p = ((t / 28) % 1) * 0.95 + 0.05;
        print.scale.y = p;
        toolhead.position.set(px + 0.06 * Math.sin(t * 6.3), plateY + 0.13 * p + 0.03, pz + 0.035 * Math.sin(t * 4.1));
        bar.position.x = toolhead.position.x;
        stretch(tube, tubeFrom, th.copy(toolhead.position).setY(toolhead.position.y + 0.06));
      }
    };
  },

  /**
   * The parts kanban (부품 칸반 선반): a blue steel flow rack in two bays against the wall, its shelves
   * sloping to the front, open-fronted bins in four colours down every level, each labelled with its
   * part (M3×8, 608 베어링, SG90 서보…) with a few showing the yellow kanban card that goes to the red
   * '발주' post on the side when a bin's emptied; the two-bin header across the top. Picking parts:
   * stood at the rack reaching into a bin pulled forward on its slide.
   */
  engKanbanRack(g, W, D, _c, _def, _ctx, out) {
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const idle = new THREE.Group();
    g.add(idle);
    out.idle = idle;
    const rz = -D / 2 + 0.28;
    const rd = 0.5;
    const rh = 1.85;
    const BLUE = '#1565c0';
    for (const x of [-W / 2 + 0.05, 0, W / 2 - 0.05]) for (const s of [-1, 1]) part(g, box(0.04, rh, 0.04), BLUE, x, rh / 2, rz + s * (rd / 2 - 0.02));
    for (const x of [-W / 2 + 0.05, 0, W / 2 - 0.05]) for (const y of [0.1, rh - 0.02]) part(g, box(0.04, 0.04, rd), BLUE, x, y, rz);
    const names = ['M3×8 볼트', 'M4 너트', '608 베어링', '스페이서', '케이블타이', 'SG90 서보', 'JST 커넥터', '저항 1kΩ', '커패시터', 'M5 와셔', '타이밍벨트', '리밋 스위치', '퓨즈 5A', '방열판', '스프링', 'O링'];
    const cols = ['#1e88e5', '#fdd835', '#e53935', '#43a047'];
    const levels = [0.3, 0.72, 1.14, 1.56];
    const tilt = 0.16;
    const card = kanbanCardTex();
    const bin = (p: THREE.Object3D, x: number, y: number, z: number, col: string, name: string, withCard: boolean) => {
      const b = frame(p, x, y, z, 0, tilt);
      part(b, rbox(0.2, 0.13, 0.3, 0.012), col, 0, 0.065, 0);
      part(b, box(0.18, 0.004, 0.27), shade(col, 0.45), 0, 0.131, -0.005, { outline: false });
      part(b, box(0.18, 0.06, 0.004), shade(col, 0.8), 0, 0.1, 0.151, { outline: false });
      label(b, name, 0.15, 0.035, 0, 0.055, 0.152, '#ffffff', '#212121');
      for (let i = 0; i < 4; i++) part(b, ball(0.012), i % 2 ? '#b0bec5' : '#90a4ae', -0.05 + i * 0.03, 0.135, 0.05 - (i % 2) * 0.05, { outline: false });
      if (withCard) sheet(b, card, 0.07, 0.044, 0.05, 0.11, 0.155);
      return b;
    };
    let n = 0;
    levels.forEach((y, li) => {
      for (const bay of [-1, 1]) {
        part(g, box(W / 2 - 0.1, 0.02, rd - 0.04), '#90a4ae', (bay * W) / 4, y - 0.01, rz, { rx: tilt });
        for (let i = 0; i < 4; i++) {
          const x = (bay * W) / 4 - 0.33 + i * 0.22;
          const picked = li === 2 && bay === 1 && i === 1;
          const args: [number, number, string, string, boolean] = [y, rz + 0.02, cols[(i + li) % 4], names[n % names.length], (n * 7) % 5 === 0];
          if (picked) {
            bin(idle, x, ...args);
            bin(use, x, args[0] - 0.02, args[1] + 0.14, args[2], args[3], args[4]);
          } else bin(g, x, ...args);
          n++;
        }
      }
    });
    label(g, '부품 칸반 · 투빈 보충', 1.2, 0.1, 0, rh + 0.08, rz + rd / 2 - 0.02, BLUE, '#ffffff');
    // The order post on the right upright.
    const post = frame(g, W / 2 - 0.0, 1.2, rz + 0.1, PI / 2);
    part(post, rbox(0.14, 0.2, 0.08, 0.01), '#e53935', 0, 0, 0);
    part(post, box(0.08, 0.008, 0.01), '#212121', 0, 0.07, 0.04, { outline: false });
    label(post, '발주 카드함', 0.11, 0.03, 0, 0.02, 0.041, '#e53935', '#ffffff');
    sheet(post, card, 0.06, 0.038, -0.01, 0.1, 0.02, 0, 0);
    const at = marker(g, W / 4 - 0.11, levels[2] + 0.1, rz + 0.25);
    const sp = stoodAt(g, W / 4 - 0.11, rz + 0.75, 'rummage', at);
    out.work = at;
    out.spots = { '*': sp, engPickParts: sp };
  },

  /**
   * The block-diagram whiteboard (블록 다이어그램 화이트보드): a wide board on the wall in its aluminium
   * frame, the delivery robot's system drawn on it in marker — battery, BMS, DC-DC, the MCU, the motor
   * driver and the motors, the main PC with the lidar, camera and IMU, the CAN bus dashed along the
   * bottom — with sticky notes ('EMC 재시험 11/3', '토크 부족?'), the motor driver's datasheet held up by
   * magnets, the marker tray with four markers and the eraser. Drawing: stood at it, the marker going,
   * a new red block ('안전 PLC') being drawn in, line by line.
   */
  engBlockBoard(g, W, D, _c, _def, _ctx, out) {
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const bz = -D / 2 + 0.04;
    const bw = Math.min(W - 0.16, 1.84);
    const bh = 1.0;
    const by = 1.45;
    part(g, rbox(bw, bh, 0.03, 0.01), ALU, 0, by, bz);
    sheet(g, blockTex(), bw - 0.05, bh - 0.05, 0, by, bz + 0.017);
    part(g, box(1.2, 0.03, 0.07), ALU, 0, by - bh / 2 - 0.02, bz + 0.04);
    for (const [i, col] of ['#212121', '#1565c0', '#c62828', '#2e7d32'].entries()) {
      part(g, cyl(0.009, 0.009, 0.11, 10), '#fafafa', -0.4 + i * 0.07, by - bh / 2 - 0.0, bz + 0.05, { rz: PI / 2 });
      part(g, cyl(0.0095, 0.0095, 0.03, 10), col, -0.4 + i * 0.07 + 0.055, by - bh / 2, bz + 0.05, { rz: PI / 2, outline: false });
    }
    part(g, rbox(0.13, 0.04, 0.05, 0.008), '#455a64', 0.35, by - bh / 2 + 0.005, bz + 0.05);
    part(g, box(0.12, 0.012, 0.045), '#eceff1', 0.35, by - bh / 2 - 0.02, bz + 0.05, { outline: false });
    // The datasheet held up by two magnets.
    part(g, box(0.21, 0.28, 0.002), '#ffffff', bw / 2 - 0.22, by + 0.2, bz + 0.019, { rz: -0.04 });
    for (let i = 0; i < 9; i++) part(g, box(0.15, 0.006, 0.001), '#9e9e9e', bw / 2 - 0.22, by + 0.28 - i * 0.025, bz + 0.0205, { rz: -0.04, outline: false });
    label(g, 'DRV8353 데이터시트', 0.16, 0.025, bw / 2 - 0.22, by + 0.31, bz + 0.021, 'none', '#212121');
    for (const sx of [-0.08, 0.08]) part(g, cyl(0.016, 0.016, 0.012, 12), '#e53935', bw / 2 - 0.22 + sx, by + 0.33, bz + 0.024, { rx: PI / 2 });
    // The new block being drawn: its four sides growing in turn, then its name.
    const x0 = -0.15;
    const x1 = 0.2;
    const y0 = by - 0.33;
    const y1 = by - 0.2;
    const zz = bz + 0.018;
    const edges: Array<{ m: THREE.Mesh; from: THREE.Vector3; to: THREE.Vector3 }> = [
      [new THREE.Vector3(x0, y1, zz), new THREE.Vector3(x1, y1, zz)],
      [new THREE.Vector3(x1, y1, zz), new THREE.Vector3(x1, y0, zz)],
      [new THREE.Vector3(x1, y0, zz), new THREE.Vector3(x0, y0, zz)],
      [new THREE.Vector3(x0, y0, zz), new THREE.Vector3(x0, y1, zz)],
    ].map(([from, to]) => ({ m: part(use, box(1, 1, 1), '#c62828', 0, 0, 0, { outline: false, shadow: false }), from, to }));
    const name = label(use, '안전 PLC', 0.22, 0.06, (x0 + x1) / 2, (y0 + y1) / 2, zz + 0.001, 'none', '#c62828');
    const capOff = part(use, cyl(0.0095, 0.0095, 0.03, 10), '#c62828', 0.1, by - bh / 2 + 0.005, bz + 0.07, { rz: 0.4, outline: false });
    capOff.visible = true;
    const at = marker(g, (x0 + x1) / 2, (y0 + y1) / 2, bz + 0.03);
    const sp = stoodAt(g, (x0 + x1) / 2 + 0.05, bz + 0.48, 'board', at);
    out.work = at;
    out.spots = { '*': sp, engBlockDiagram: sp };
    const v = new THREE.Vector3();
    out.animate = (t) => {
      const u = (t / 9) % 1;
      edges.forEach((e, i) => {
        const k = sm(u, i * 0.18, i * 0.18 + 0.16);
        e.m.visible = k > 0.01;
        v.copy(e.to).sub(e.from).multiplyScalar(k);
        e.m.position.copy(e.from).addScaledVector(v, 0.5);
        e.m.scale.set(Math.abs(v.x) + 0.006, Math.abs(v.y) + 0.006, 0.002);
      });
      name.visible = u > 0.78;
    };
  },

  /**
   * The EMC chamber (EMC 시험 챔버): a compact shielded chamber on its stand, its door heavy with copper
   * finger-stock and a lever latch, lined inside with dark absorber pyramids on the back, the sides and
   * the ceiling; a turntable carrying the board under test on a foam block, a log-periodic antenna on
   * its mast aimed at it; N-type bulkheads on its side cabled to the spectrum analyser on its cart
   * (emissions against the red CISPR 32 class B line, one peak 1.8 dB under it, marked), the
   * pre-amp below. Left open when nobody's testing; testing shuts the door, lights '시험 중' over it and
   * turns the table, the analyser sweeping: stood at the analyser at its keys.
   */
  engEmcChamber(g, W, D, _c, _def, _ctx, out) {
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const idle = new THREE.Group();
    g.add(idle);
    out.idle = idle;
    const cw = 1.12;
    const cd = 0.8;
    const ch = 0.98;
    const cx = -W / 2 + cw / 2 + 0.04;
    const cz = -D / 2 + cd / 2 + 0.04;
    const y0 = 0.5;
    const STEEL = '#b0bec5';
    // The stand.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.05, y0, 0.05), '#455a64', cx + sx * (cw / 2 - 0.05), y0 / 2, cz + sz * (cd / 2 - 0.05));
    part(g, box(cw, 0.03, cd), '#455a64', cx, y0 - 0.015, cz);
    // The shell, open at the front.
    const t = 0.03;
    part(g, box(cw, ch, t), STEEL, cx, y0 + ch / 2, cz - cd / 2 + t / 2);
    for (const s of [-1, 1]) part(g, box(t, ch, cd), STEEL, cx + s * (cw / 2 - t / 2), y0 + ch / 2, cz);
    part(g, box(cw, t, cd), STEEL, cx, y0 + ch - t / 2, cz);
    part(g, box(cw, t, cd), STEEL, cx, y0 + t / 2, cz);
    // The jamb with its copper finger-stock.
    const jz = cz + cd / 2;
    for (const s of [-1, 1]) part(g, box(0.04, ch, 0.02), '#c77d3a', cx + s * (cw / 2 - 0.02), y0 + ch / 2, jz, { outline: false });
    for (const y of [y0 + 0.02, y0 + ch - 0.02]) part(g, box(cw, 0.04, 0.02), '#c77d3a', cx, y, jz, { outline: false });
    // The absorbers: back wall, sides, ceiling; ferrite tiles on the floor.
    const ABS = '#1f2a36';
    const ps = 0.11;
    const iw = cw - 2 * t;
    const ih = ch - 2 * t;
    const idp = cd - t - 0.03;
    const nx = Math.floor(iw / ps);
    const ny = Math.floor(ih / ps);
    const nz = Math.floor(idp / ps);
    const pyr = pyramid(ps * 0.95, 0.13);
    const ix0 = cx - ((nx - 1) * ps) / 2;
    const iy0 = y0 + t + ps / 2 + (ih - ny * ps) / 2;
    const iz0 = cz - cd / 2 + t + ps / 2;
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) part(g, pyr, ABS, ix0 + i * ps, iy0 + j * ps, cz - cd / 2 + t + 0.065, { rx: PI / 2, outline: false });
    for (const s of [-1, 1]) for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) part(g, pyr, ABS, cx + s * (cw / 2 - t - 0.065), iy0 + j * ps, iz0 + k * ps, { rz: s * PI / 2, outline: false });
    for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) part(g, pyr, ABS, ix0 + i * ps, y0 + ch - t - 0.065, iz0 + k * ps, { rx: PI, outline: false });
    part(g, box(iw, 0.01, idp), '#2b2b2b', cx, y0 + t + 0.005, cz, { outline: false });
    // The turntable, the foam block, the board under test.
    const tt = frame(g, cx - 0.08, y0 + t + 0.01, cz + 0.08);
    part(tt, cyl(0.17, 0.17, 0.025, 28), '#eceff1', 0, 0.0125, 0);
    part(tt, box(0.12, 0.1, 0.12), '#e0e0e0', 0, 0.075, 0);
    part(tt, rbox(0.16, 0.045, 0.11, 0.008), '#455a64', 0, 0.148, 0);
    part(tt, box(0.004, 0.06, 0.004), '#212121', 0.06, 0.1, 0.05, { outline: false });
    const dutLed = part(use, box(0.008, 0.006, 0.004), '#76ff03', 0, 0, 0, { outline: false, material: glow('#76ff03') });
    // The antenna on its mast in the back corner, aimed at the board.
    const ax = cx + iw / 2 - 0.2;
    const az = cz - cd / 2 + 0.25;
    part(g, cyl(0.01, 0.012, 0.48, 8), '#eceff1', ax, y0 + t + 0.24, az, { outline: false });
    const ant = frame(g, ax, y0 + 0.5, az, Math.atan2(tt.position.x - ax, tt.position.z - az), 0.35);
    part(ant, box(0.015, 0.015, 0.3), ALU, 0, 0, 0.1);
    for (let i = 0; i < 8; i++) {
      const len = 0.28 - i * 0.03;
      part(ant, box(len, 0.007, 0.007), ALU, 0, 0.012, -0.03 + i * 0.035, { outline: false });
    }
    // The bulkheads on the side, cabled to the analyser.
    for (let i = 0; i < 3; i++) part(g, cyl(0.014, 0.014, 0.03, 10), '#cfd8dc', cx + cw / 2 + 0.015, y0 + 0.3 + i * 0.08, cz + 0.1, { rz: PI / 2, outline: false });
    // The door: open beside the jamb (idle), shut and latched with '시험 중' lit (in use).
    const door = (p: THREE.Object3D, open: boolean) => {
      // Two leaves hung at the jamb's sides, swung right back when open.
      for (const s of [-1, 1]) {
        const lw = cw / 2 - 0.01;
        const d = frame(p, cx + s * (cw / 2), 0, jz + 0.01, open ? s * 1.9 : 0);
        const mx = (-s * lw) / 2;
        part(d, box(lw, ch - 0.02, 0.05), STEEL, mx, y0 + ch / 2, 0.03);
        part(d, box(lw - 0.06, ch - 0.08, 0.004), shade(STEEL, 0.88), mx, y0 + ch / 2, 0.057, { outline: false });
        part(d, box(0.012, ch - 0.06, 0.006), '#c77d3a', -s * (lw - 0.006), y0 + ch / 2, 0.004, { outline: false });
        if (s > 0) {
          part(d, rbox(0.04, 0.3, 0.05, 0.01), '#37474f', -s * (lw - 0.06), y0 + ch / 2, 0.08);
          for (const y of [-0.1, 0.1]) part(d, cyl(0.012, 0.012, 0.04, 10), '#90a4ae', -s * (lw - 0.06), y0 + ch / 2 + y, 0.06, { rx: PI / 2, outline: false });
        } else label(d, 'RF 차폐 챔버 · 시험 중 개방 금지', 0.46, 0.05, mx, y0 + ch - 0.15, 0.059, YELLOW, '#212121');
      }
    };
    door(idle, true);
    door(use, false);
    label(g, '시험 중', 0.18, 0.06, cx, y0 + ch + 0.06, jz, '#3e2723', '#6d4c41');
    label(use, '시험 중', 0.18, 0.06, cx, y0 + ch + 0.06, jz + 0.003, '#d50000', '#ffffff');
    part(g, box(0.2, 0.08, 0.04), '#263238', cx, y0 + ch + 0.06, jz - 0.022);
    // The analyser's cart: casters, shelves, the pre-amp, the analyser.
    const ux = W / 2 - 0.3;
    const uz = cz + 0.02;
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        part(g, box(0.03, 0.86, 0.03), '#78909c', ux + sx * 0.22, 0.46, uz + sz * 0.2);
        part(g, ball(0.025), DARK, ux + sx * 0.22, 0.025, uz + sz * 0.2, { outline: false });
      }
    for (const y of [0.25, 0.86]) part(g, rbox(0.5, 0.02, 0.45, 0.006), '#90a4ae', ux, y, uz);
    part(g, rbox(0.24, 0.07, 0.16, 0.008), '#37474f', ux - 0.06, 0.295, uz);
    label(g, 'PRE-AMP 30dB', 0.12, 0.022, ux - 0.06, 0.3, uz + 0.082, '#37474f', '#ffffff');
    const an = frame(g, ux, 0.87, uz - 0.03);
    part(an, rbox(0.44, 0.24, 0.36, 0.015), '#d9dee2', 0, 0.12, 0);
    part(an, box(0.42, 0.22, 0.004), '#37474f', 0, 0.12, 0.181, { outline: false });
    out.screen = screenOf(an, spectrumTex(), 0.25, 0.16, -0.07, 0.13, 0.184);
    part(an, cyl(0.026, 0.026, 0.02, 18), '#212121', 0.14, 0.12, 0.19, { rx: PI / 2 });
    for (let r = 0; r < 3; r++) for (let c2 = 0; c2 < 3; c2++) part(an, box(0.022, 0.016, 0.006), '#eceff1', 0.11 + c2 * 0.03, 0.2 - r * 0.025, 0.185, { outline: false });
    part(an, cyl(0.012, 0.012, 0.02, 10), '#cfd8dc', 0.16, 0.04, 0.19, { rx: PI / 2, outline: false });
    label(an, 'SPECTRUM 9kHz–6GHz', 0.16, 0.02, -0.07, 0.225, 0.184, '#37474f', '#eceff1');
    const sweep = part(use, box(0.003, 0.15, 0.002), '#ffffff', 0, 0, 0, { outline: false, material: glow('#ffffff') });
    rod(g, new THREE.Vector3(cx + cw / 2 + 0.03, y0 + 0.3, cz + 0.1), new THREE.Vector3(ux - 0.06, 0.33, uz - 0.08), 0.006, '#212121');
    rod(g, new THREE.Vector3(ux + 0.02, 0.33, uz - 0.08), new THREE.Vector3(ux + 0.16, 0.91, uz + 0.16), 0.006, '#212121');
    const keys = marker(g, ux + 0.04, 0.95, uz + 0.2);
    const sp = stoodAt(g, ux, D / 2 + 0.3, 'type', keys);
    out.work = keys;
    out.spots = { '*': sp, engEmcTest: sp };
    out.animate = (t2) => {
      tt.rotation.y = t2 * 0.35;
      dutLed.position.set(tt.position.x + Math.sin(t2 * 0.35) * 0.05, tt.position.y + 0.172, tt.position.z + Math.cos(t2 * 0.35) * 0.05);
      dutLed.visible = Math.sin(t2 * 5) > 0;
      const u = (t2 * 0.45) % 1;
      sweep.position.set(ux - 0.07 - 0.12 + 0.24 * u, 0.87 + 0.13, uz - 0.03 + 0.186);
    };
  },
  /** The front desk at the gates, where a supplier's engineer gets a pass (2026-11-05, the layout audit; frontDesk.ts). */
  engReception(g, W, D) {
    frontDesk(g, W, D, { name: '기술연구소', body: ESD, top: ALU, fg: '#ffffff', bg: ESD });
  },
  /**
   * The EMC chamber's lining (2026-11-05, the layout audit: the chamber is a shielded room), drawn from the room's south-east tile
   * (23, 5) over the room x 21..23, y 2..5: dark absorber pyramids up its back, its far side and its front, and along the door's wall
   * either side of the door (20, 4), the ferrite tiles' grid on its floor, the shielded door's copper fingers round its frame.
   */
  engAbsorberWall(g) {
    const ABS = '#1f2a36';
    const ps = 0.3;
    const pyr = pyramid(ps * 0.92, 0.32);
    const H = 2.4;
    const ny = Math.floor(H / ps);
    // Wall lines in the anchor's frame: the room's west edge x = -2.5, east 0.5, north z = -3.5, south 0.5.
    const wall = (x0: number, z0: number, x1: number, z1: number, nx: number, nz: number, skip?: (u: number) => boolean) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const n = Math.floor(len / ps);
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n;
        if (skip?.(u)) continue;
        const x = x0 + (x1 - x0) * u;
        const z = z0 + (z1 - z0) * u;
        for (let j = 0; j < ny; j++) {
          const rx = nz !== 0 ? (nz > 0 ? PI / 2 : -PI / 2) : 0;
          const rz = nx !== 0 ? (nx > 0 ? -PI / 2 : PI / 2) : 0;
          part(g, pyr, ABS, x + nx * 0.16, ps / 2 + j * ps, z + nz * 0.16, { rx, rz, outline: false });
        }
      }
    };
    wall(-2.5, -3.5, 0.5, -3.5, 0, 1);
    wall(0.5, -3.5, 0.5, 0.5, -1, 0);
    wall(-2.5, 0.5, 0.5, 0.5, 0, -1);
    // The door's wall: the door at z -1 (y = 4) left clear.
    wall(-2.5, -3.5, -2.5, 0.5, 1, 0, (u) => Math.abs(-3.5 + 4 * u - -1) < 0.55);
    for (let i = 0; i <= 12; i++) part(g, box(0.01, 0.004, 4), '#3a4450', -2.5 + i * 0.25, 0.004, -1.5, { outline: false });
    for (const z of [-1.5, -0.5]) part(g, box(0.03, 2.1, 0.06), '#c77d3a', -2.42, 1.05, z, { outline: false });
    label(g, 'RF 차폐실 · 시험 중 개방 금지', 0.7, 0.09, -2.36, 2.2, -1, YELLOW, '#212121', PI / 2);
  },
  /** The lab's name by the path (2026-11-05, the layout audit): the made-up firm's 기술연구소 on its plate. */
  engLabSign: pavementSign('engLabSign', '⚙️', '한결로보틱스|기술연구소', ['기업부설연구소', '방문객은 1층 안내 데스크', '보안 서약 후 출입'], ESD, 2.1),
};
