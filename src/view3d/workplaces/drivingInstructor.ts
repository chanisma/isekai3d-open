import * as THREE from 'three';
import { marker, rod, shade, spot, tint, type Builder, type Spot } from '../parts';
import type { Motion } from '../activity';
import { ball, box, canvasTexture, cyl, part, rbox, textured } from '../toon';
import { CONE, MIC, coneRound, drvPhase, parkRound } from './drivingInstructorMotion';

/**
 * The 운전면허학원 drawn as itself (2026-10-27 workplace pipeline, at the user's request): the
 * training car, the road-test car, the course cones and the 검정 booth redone, and what the school
 * was missing — the 기능시험 course painted on the yard with its traffic light, the 도로주행 course
 * map, the 합격자 board, a driving simulator and a 학과시험 kiosk. Each use puts the instructor where
 * it's done: in the passenger seat beside a nervous student while the car backs into its bay, crouched
 * setting a cone on its painted spot, sat in the booth scoring the run with the mic to hand, stood at
 * a screen pointing the student through it.
 */

const FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
const BLACK = '#24262b';
const STEEL = '#b9c1c7';
const CHROME = '#dfe4e8';
const ASPHALT = '#4b5056';
const PAINT = '#f4f4ef';
const YELLOW_LINE = '#f2c230';
const SCHOOL = '한빛자동차운전전문학원';

/** Lit parts (lamps, LEDs): one unlit material a colour, shared. */
const lit = new Map<string, THREE.MeshBasicMaterial>();
function glow(color: string): THREE.MeshBasicMaterial {
  let m = lit.get(color);
  if (!m) lit.set(color, (m = new THREE.MeshBasicMaterial({ color })));
  return m;
}
/** A car's glass: the seats and whoever's in them show through. */
const GLASS = new THREE.MeshToonMaterial({ color: '#a9cfe0', transparent: true, opacity: 0.3, depthWrite: false });
/** A traffic light's visors, open underneath (seen from inside too). */
const HOOD = new THREE.MeshToonMaterial({ color: '#1f2226', side: THREE.DoubleSide });
/** A booth's windows. */
const PANE = new THREE.MeshToonMaterial({ color: '#d7eef7', transparent: true, opacity: 0.28, depthWrite: false });

/** Shapes made once (never disposed, like toon.ts's shared geometry). */
const shapes = new Map<string, THREE.BufferGeometry>();
function shape(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let s = shapes.get(key);
  if (!s) shapes.set(key, (s = make()));
  return s;
}
const ring = (r: number, t: number, arc = Math.PI * 2) => shape(`ring${r},${t},${arc.toFixed(3)}`, () => new THREE.TorusGeometry(r, t, 8, 24, arc));
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UP = new THREE.Vector3(0, 1, 0);
const tmp = new THREE.Vector3();

/** Pictures painted once a key (maps, screens, boards, labels). */
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
function label(g: THREE.Object3D, text: string, w: number, h: number, x: number, y: number, z: number, bg: string, fg: string, ry = 0, rx = 0, bold = true): THREE.Mesh {
  const ch = 64;
  const cw = Math.max(64, Math.round((ch * w) / h / 16) * 16);
  const tex = painted(`label|${text}|${bg}|${fg}|${cw}|${bold}`, cw, ch, (c) => {
    if (bg !== 'none') {
      c.fillStyle = bg;
      c.fillRect(0, 0, cw, ch);
    }
    c.fillStyle = fg;
    c.font = `${bold ? 'bold ' : ''}${Math.round(ch * 0.62)}px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, cw / 2, ch * 0.54, cw * 0.94);
  });
  return sheet(g, tex, w, h, x, y, z, ry, rx);
}
/** A screen the lot lights while it's used (dark when off, its picture lit when on): `out.screen`. */
function screenOf(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, color: '#2a3140' }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, 0, 'YXZ');
  g.add(m);
  return m;
}
/** A group placed and turned in `parent`. */
function group(parent: THREE.Object3D, x = 0, y = 0, z = 0, ry = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}
/** A spot stood at, facing `yaw`, and what's done there. */
function standAt(g: THREE.Object3D, x: number, z: number, yaw: number, motion: Motion, work?: THREE.Object3D): Spot {
  const s = spot(g, 'stand', x, 0, z, yaw);
  s.work = work;
  s.motion = motion;
  return s;
}
/** A spot sat at (the seat's top `y`, over the floor `drop` below), facing `yaw`, and what's done there. */
function sitAt(g: THREE.Object3D, x: number, y: number, z: number, yaw: number, motion: Motion, work?: THREE.Object3D, drop = y): Spot {
  const s = spot(g, 'sit', x, y, z, yaw, drop);
  s.work = work;
  s.motion = motion;
  return s;
}
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
/** Whether a dweller's posed at a spot just now (activity.ts spotPose marks it). */
const posed = (s: Spot, t: number) => Math.abs(t - posedAt(s)) < 0.6;

// ---------------------------------------------------------------------------------------------
// People drawn in: the students at the wheel, an examiner, a senior instructor.

interface Look {
  top: string;
  bottom: string;
  hair: string;
  hairdo: 'short' | 'pony' | 'bob';
  skin?: string;
  shoes?: string;
  glasses?: boolean;
  /** A vest over the top and what's printed on it. */
  vest?: string;
  vestText?: string;
}
const SKIN = '#f1c9a5';
const LOOKS = {
  studentA: { top: '#f8bbd0', bottom: '#3f51b5', hair: '#2b1b10', hairdo: 'pony', shoes: '#fafafa' } as Look,
  studentB: { top: '#90a4ae', bottom: '#263238', hair: '#1a1a1a', hairdo: 'short', glasses: true, shoes: '#37474f' } as Look,
  studentC: { top: '#ffe082', bottom: '#5d4037', hair: '#4e342e', hairdo: 'bob', shoes: '#8d6e63' } as Look,
  examiner: { top: '#eceff1', bottom: '#263238', hair: '#3a3a3a', hairdo: 'short', vest: '#1565c0', vestText: '검정원', shoes: '#212121' } as Look,
  instructor: { top: '#fafafa', bottom: '#37474f', hair: '#1a1a1a', hairdo: 'short', vest: '#f9a825', vestText: '강사', shoes: '#212121' } as Look,
};

interface Figure {
  root: THREE.Group;
  /** Puts the left / right hand at a point in the parent's frame, or back at rest. */
  armL(to: THREE.Vector3 | null): void;
  armR(to: THREE.Vector3 | null): void;
}
/** A limb between two points (stretched and turned each time it's set). */
function limb(g: THREE.Object3D, r: number, color: string): (a: THREE.Vector3, b: THREE.Vector3) => void {
  const m = part(g, cyl(r, r * 0.9, 1, 8), color, 0, 0, 0, { outline: false });
  const d = new THREE.Vector3();
  return (a, b) => {
    d.subVectors(b, a);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.scale.set(1, Math.max(0.001, d.length()), 1);
    m.quaternion.setFromUnitVectors(UP, d.normalize());
  };
}
/**
 * Someone drawn in, their feet (or the seat under them) at (x, z) in `parent`, turned `ry` (0 faces
 * +z): stood, or sat on a seat whose top is `seat` high. The hands rest in the lap or at the sides
 * until put somewhere.
 */
function person(parent: THREE.Object3D, look: Look, x: number, z: number, ry: number, seat?: number): Figure {
  const root = group(parent, x, 0, z, ry);
  const skin = look.skin ?? SKIN;
  const shoes = look.shoes ?? '#2b2b30';
  const sat = seat !== undefined;
  const sh = seat ?? 0;
  const shoulderY = sat ? sh + 0.53 : 1.31;
  const torsoY = sat ? sh + 0.33 : 1.11;
  if (sat) {
    for (const sx of [-1, 1]) {
      const hip = v3(sx * 0.09, sh + 0.07, -0.03);
      const knee = v3(sx * 0.1, sh + 0.1, 0.36);
      const ankle = v3(sx * 0.1, Math.max(0.1, sh - 0.3), 0.5);
      rod(root, hip, knee, 0.062, look.bottom);
      rod(root, knee, ankle, 0.05, look.bottom);
      part(root, rbox(0.09, 0.07, 0.2, 0.03), shoes, sx * 0.1, ankle.y - 0.035, ankle.z + 0.05);
    }
    part(root, rbox(0.31, 0.15, 0.26, 0.06), look.bottom, 0, sh + 0.08, 0);
  } else {
    for (const sx of [-1, 1]) {
      rod(root, v3(sx * 0.085, 0.84, 0), v3(sx * 0.09, 0.08, 0.01), 0.056, look.bottom);
      part(root, rbox(0.09, 0.07, 0.2, 0.03), shoes, sx * 0.09, 0.035, 0.04);
    }
    part(root, rbox(0.3, 0.17, 0.2, 0.06), look.bottom, 0, 0.88, 0);
  }
  const tz = sat ? -0.02 : 0;
  part(root, rbox(0.34, 0.46, 0.21, 0.08), look.top, 0, torsoY, tz);
  if (look.vest) {
    part(root, rbox(0.36, 0.4, 0.23, 0.08), look.vest, 0, torsoY - 0.02, tz);
    part(root, box(0.08, 0.16, 0.235), look.top, 0, torsoY + 0.14, tz, { outline: false });
    if (look.vestText) label(root, look.vestText, 0.2, 0.06, 0, torsoY - 0.06, tz + 0.117, look.vest, '#ffffff');
  }
  part(root, cyl(0.045, 0.05, 0.08, 10), skin, 0, shoulderY + 0.06, tz, { outline: false });
  const head = group(root, 0, shoulderY + 0.2, tz);
  part(head, ball(0.112), skin, 0, 0, 0);
  for (const sx of [-1, 1]) part(head, ball(0.012), '#2b2b30', sx * 0.04, 0.0, 0.104, { outline: false });
  part(head, box(0.03, 0.006, 0.004), '#a1665e', 0, -0.045, 0.104, { outline: false });
  switch (look.hairdo) {
    case 'pony':
      part(head, ball(0.12), look.hair, 0, 0.03, -0.03);
      part(head, rbox(0.2, 0.06, 0.06, 0.02), look.hair, 0, 0.075, 0.07, { rx: -0.3 });
      part(head, rbox(0.06, 0.2, 0.06, 0.03), look.hair, 0, -0.06, -0.14, { rx: 0.3 });
      break;
    case 'bob':
      part(head, ball(0.122), look.hair, 0, 0.025, -0.03);
      for (const sx of [-1, 1]) part(head, rbox(0.05, 0.16, 0.14, 0.025), look.hair, sx * 0.1, -0.03, -0.02);
      part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0, 0.08, 0.08, { rx: -0.2 });
      break;
    default:
      part(head, ball(0.118), look.hair, 0, 0.03, -0.03);
      part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0, 0.075, 0.075, { rx: -0.25 });
  }
  if (look.glasses) {
    for (const sx of [-1, 1]) part(head, ring(0.024, 0.003), '#37474f', sx * 0.042, 0.002, 0.11);
    part(head, box(0.02, 0.004, 0.004), '#37474f', 0, 0.002, 0.112, { outline: false });
  }
  const arm = (sx: number) => {
    const shoulder = v3(sx * 0.2, shoulderY, tz);
    const rest = sat ? v3(sx * 0.11, sh + 0.16, 0.24) : v3(sx * 0.23, 0.82, 0.05);
    const upper = limb(root, 0.042, look.vest ?? look.top);
    const lower = limb(root, 0.035, look.top);
    const hand = part(root, ball(0.036), skin, 0, 0, 0, { outline: false });
    const loc = new THREE.Vector3();
    const elbow = new THREE.Vector3();
    const d = new THREE.Vector3();
    const bend = new THREE.Vector3();
    return (to: THREE.Vector3 | null) => {
      if (to) loc.copy(to).sub(root.position).applyAxisAngle(UP, -root.rotation.y);
      else loc.copy(rest);
      d.subVectors(loc, shoulder);
      const L = Math.min(0.5, Math.max(0.05, d.length()));
      d.normalize();
      loc.copy(shoulder).addScaledVector(d, L);
      const a = 0.27;
      const b = 0.25;
      const cosA = THREE.MathUtils.clamp((a * a + L * L - b * b) / (2 * a * L), -1, 1);
      bend.set(sx * 0.6, -1, -0.25).normalize();
      bend.addScaledVector(d, -bend.dot(d)).normalize();
      elbow.copy(shoulder).addScaledVector(d, a * cosA).addScaledVector(bend, a * Math.sqrt(1 - cosA * cosA));
      upper(shoulder, elbow);
      lower(elbow, loc);
      hand.position.copy(loc);
    };
  };
  const armL = arm(1);
  const armR = arm(-1);
  armL(null);
  armR(null);
  return { root, armL, armR };
}

// ---------------------------------------------------------------------------------------------
// Cars: the shell both school cars are built on.

interface Shell {
  seatY: number;
  /** The driver's side (the left, -z) and the passenger's (+z), across the car. */
  dz: number;
  pz: number;
  /** Where the front seats are along the car, and the back seat. */
  sx: number;
  rx: number;
  /** The steering wheel (turned about its column by `wheel.rotation.x`), its hub, two places on its rim. */
  wheel: THREE.Group;
  hubAt: THREE.Object3D;
  rimL: THREE.Object3D;
  rimR: THREE.Object3D;
  fx: number;
  bx: number;
  side: (s: number) => number;
  roofY: number;
  /** Where the windscreen's top and its foot are along the car. */
  wsTop: number;
  wsFoot: number;
  /** Lamps shown when they're on. */
  reverse: THREE.Group;
  brake: THREE.Group;
  heads: THREE.Group;
}
/**
 * A car facing +x, its middle across at `zc`: the body and the sills, the bumpers, a glasshouse you
 * can see in through (a hatchback's steep tail or a sedan's boot), the roof and pillars, the mirrors
 * and handles, wheels under their arches, the lamps and the cabin — seats, the dash and the wheel.
 */
function carShell(car: THREE.Object3D, o: { L: number; Wd: number; zc: number; body: string; seat: string; hatch: boolean; key: string }): Shell {
  const { L, Wd, zc, body } = o;
  const fx = L / 2;
  const bx = -L / 2;
  const side = (s: number) => zc + s * (Wd / 2);
  part(car, rbox(L, 0.48, Wd, 0.16), body, 0, 0.57, zc);
  part(car, rbox(L * 0.97, 0.1, Wd - 0.02, 0.05), '#3a3d42', 0, 0.33, zc);
  // Bumpers.
  part(car, rbox(0.14, 0.2, Wd - 0.04, 0.06), shade(body, 0.92), fx - 0.03, 0.43, zc);
  part(car, rbox(0.14, 0.2, Wd - 0.04, 0.06), shade(body, 0.92), bx + 0.03, 0.43, zc);
  part(car, box(0.02, 0.06, Wd - 0.5), '#2b2e33', fx + 0.04, 0.38, zc, { outline: false });
  // The glasshouse.
  const wsFoot = fx - (o.hatch ? 0.95 : 1.05);
  const wsTop = wsFoot - (o.hatch ? 0.55 : 0.6);
  const tailFoot = bx + (o.hatch ? 0.12 : 0.45);
  const tailTop = bx + (o.hatch ? 0.32 : 0.95);
  const gh = 0.48;
  const geom = shape(`cabin|${o.key}`, () => {
    const p = new THREE.Shape();
    p.moveTo(tailFoot, 0);
    p.lineTo(wsFoot, 0);
    p.lineTo(wsTop, gh);
    p.lineTo(tailTop, gh);
    p.closePath();
    const g = new THREE.ExtrudeGeometry(p, { depth: Wd - 0.14, bevelEnabled: false });
    g.translate(0, 0, -(Wd - 0.14) / 2);
    return g;
  });
  part(car, geom, '#a9cfe0', 0, 0.81, zc, { material: GLASS, outline: false, shadow: false });
  const roofY = 0.81 + gh + 0.025;
  part(car, rbox(wsTop - tailTop + 0.08, 0.05, Wd - 0.1, 0.025), body, (wsTop + tailTop) / 2, roofY, zc);
  if (!o.hatch) part(car, rbox(tailFoot - bx, 0.05, Wd - 0.08, 0.03), body, (tailFoot + bx) / 2 + 0.04, 0.82, zc);
  part(car, rbox(fx - wsFoot, 0.05, Wd - 0.08, 0.03), body, (fx + wsFoot) / 2 - 0.03, 0.82, zc);
  const bPillar = (wsTop + tailTop) / 2 + 0.05;
  for (const s of [-1, 1]) {
    const zz = zc + s * (Wd / 2 - 0.07);
    rod(car, v3(wsFoot, 0.81, zz), v3(wsTop, 0.81 + gh, zz), 0.03, body);
    rod(car, v3(tailFoot, 0.81, zz), v3(tailTop, 0.81 + gh, zz), 0.04, body);
    rod(car, v3(bPillar, 0.81, zz), v3(bPillar, 0.81 + gh, zz), 0.035, body);
    // Door lines, handles, the mirror.
    const zs = side(s) + s * 0.002;
    for (const x of [wsFoot + 0.05, bPillar, bPillar - (o.hatch ? 0.78 : 0.85)]) part(car, box(0.008, 0.44, 0.006), shade(body, 0.7), x, 0.58, zs, { outline: false });
    for (const x of [bPillar + 0.14, bPillar - 0.62]) part(car, rbox(0.13, 0.025, 0.02, 0.008), CHROME, x, 0.72, zs + s * 0.008, { outline: false });
    part(car, rbox(0.13, 0.09, 0.09, 0.02), body, wsFoot - 0.04, 0.92, side(s) + s * 0.06);
    part(car, box(0.004, 0.06, 0.07), '#90caf9', wsFoot - 0.105, 0.92, side(s) + s * 0.06, { outline: false });
  }
  // Wheels under their arches.
  const ax = L / 2 - 0.66;
  for (const x of [-ax, ax])
    for (const s of [-1, 1]) {
      const wz = side(s) - s * 0.11;
      part(car, cyl(0.3, 0.3, 0.22, 22), '#141414', x, 0.3, wz, { rx: Math.PI / 2 });
      part(car, cyl(0.19, 0.19, 0.225, 16), STEEL, x, 0.3, wz, { rx: Math.PI / 2, outline: false });
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        part(car, box(0.04, 0.15, 0.01), shade(STEEL, 0.75), x + Math.cos(a) * 0.08, 0.3 + Math.sin(a) * 0.08, wz + s * 0.115, { rz: a + Math.PI / 2, outline: false });
      }
      part(car, ring(0.35, 0.035, Math.PI), '#26282c', x, 0.3, side(s) + s * 0.005, { outline: false });
    }
  // Lamps: headlamps and tail lamps (unlit), the lit ones in groups shown when they're on.
  const heads = group(car);
  const brake = group(car);
  const reverse = group(car);
  for (const s of [-1, 1]) {
    part(car, rbox(0.05, 0.1, 0.32, 0.03), '#eceff1', fx - 0.01, 0.69, zc + s * (Wd / 2 - 0.24));
    part(heads, box(0.012, 0.08, 0.28), '#fffde7', fx + 0.018, 0.69, zc + s * (Wd / 2 - 0.24), { outline: false, material: glow('#fffde7') });
    part(car, rbox(0.05, 0.12, 0.3, 0.03), '#8e1b1b', bx + 0.01, 0.7, zc + s * (Wd / 2 - 0.22));
    part(brake, box(0.012, 0.1, 0.26), '#ff3d3d', bx - 0.018, 0.7, zc + s * (Wd / 2 - 0.22), { outline: false, material: glow('#ff5252') });
    part(car, box(0.02, 0.05, 0.1), '#e0e0e0', bx - 0.01, 0.55, zc + s * (Wd / 2 - 0.3), { outline: false });
    part(reverse, box(0.012, 0.045, 0.09), '#ffffff', bx - 0.022, 0.55, zc + s * (Wd / 2 - 0.3), { outline: false, material: glow('#ffffff') });
  }
  part(car, rbox(0.04, 0.12, 0.62, 0.02), '#2b2e33', fx + 0.005, 0.58, zc);
  brake.visible = reverse.visible = heads.visible = false;
  // The cabin: the front seats, the back seat, the dash, the wheel.
  const seatY = 0.42;
  const dz = zc - 0.33;
  const pz = zc + 0.33;
  const sx = wsFoot - 1.0;
  const rx = sx - (o.hatch ? 0.82 : 0.9);
  for (const z of [dz, pz]) {
    part(car, rbox(0.48, 0.12, 0.48, 0.05), o.seat, sx, seatY - 0.06, z);
    part(car, rbox(0.12, 0.6, 0.48, 0.05), o.seat, sx - 0.28, seatY + 0.26, z, { rz: 0.14 });
    part(car, rbox(0.1, 0.14, 0.26, 0.04), shade(o.seat, 0.85), sx - 0.34, seatY + 0.64, z);
  }
  part(car, rbox(0.5, 0.12, Wd - 0.3, 0.05), o.seat, rx, seatY - 0.06, zc);
  part(car, rbox(0.12, 0.55, Wd - 0.3, 0.05), o.seat, rx - 0.28, seatY + 0.24, zc, { rz: 0.16 });
  part(car, rbox(0.42, 0.18, Wd - 0.2, 0.05), '#2f3237', wsFoot - 0.12, 0.76, zc);
  part(car, box(0.2, 0.07, 0.004), '#4fc3f7', wsFoot - 0.34, 0.83, dz, { ry: Math.PI / 2, outline: false, material: glow('#81d4fa') });
  // The rear-view mirror at the windscreen's top.
  part(car, rbox(0.04, 0.06, 0.22, 0.015), BLACK, wsTop + 0.06, 0.81 + gh - 0.07, zc);
  part(car, box(0.004, 0.045, 0.2), '#cfe8f3', wsTop + 0.035, 0.81 + gh - 0.07, zc, { outline: false });
  const hubX = sx + 0.5;
  const hub = group(car, hubX, 0.86, dz);
  hub.rotation.z = 0.5;
  const wheel = group(hub);
  part(wheel, ring(0.17, 0.016), '#1a1a1a', 0, 0, 0, { ry: Math.PI / 2 });
  part(wheel, cyl(0.045, 0.045, 0.04, 12), '#2b2b2b', 0, 0, 0, { rz: Math.PI / 2, outline: false });
  for (const [y, z] of [[-0.16, 0], [0.05, 0.16], [0.05, -0.16]] as const) rod(wheel, v3(0, 0, 0), v3(0, y, z), 0.012, '#1a1a1a');
  rod(car, v3(hubX + 0.02, 0.86, dz), v3(hubX + 0.25, 0.73, dz), 0.025, '#1a1a1a');
  const hubAt = marker(wheel, 0, 0, 0);
  const rimL = marker(wheel, -0.01, 0.1, -0.14);
  const rimR = marker(wheel, -0.01, 0.1, 0.14);
  return { seatY, dz, pz, sx, rx, wheel, hubAt, rimL, rimR, fx, bx, side, roofY, wsTop, wsFoot, reverse, brake, heads };
}

/** A painted parking bay on its asphalt pad, under a car `L` long at `zc` across: open at the front. */
function parkingBay(g: THREE.Object3D, L: number, zc: number, no: string) {
  const pw = L + 0.9;
  part(g, box(pw, 0.012, 2.5), ASPHALT, -0.1, 0.006, zc, { outline: false, shadow: false });
  const back = -L / 2 - 0.22;
  part(g, box(0.07, 0.004, 2.0), PAINT, back, 0.014, zc, { outline: false, shadow: false });
  for (const s of [-1, 1]) part(g, box(L + 0.1, 0.004, 0.07), PAINT, back + (L + 0.1) / 2, 0.014, zc + s * 0.98, { outline: false, shadow: false });
  label(g, no, 0.5, 0.26, back + 0.36, 0.016, zc - 0.62, 'none', PAINT, Math.PI / 2, -Math.PI / 2);
}

/** Who's at a car's wheel: their hands kept on its two rim marks as it turns. */
function handsOnWheel(car: THREE.Object3D, who: Figure, s: Shell) {
  car.updateMatrixWorld(true);
  who.armL(car.worldToLocal(s.rimL.getWorldPosition(tmp)).clone());
  who.armR(car.worldToLocal(s.rimR.getWorldPosition(tmp)).clone());
}

// ---------------------------------------------------------------------------------------------
// What's painted on the course, the boards and the screens.

/** The 기능시험 course seen from above, 128 px a metre (9 × 4 m): canvas top is the course's back. */
function courseTex(): THREE.Texture {
  return painted('diCourse', 1152, 512, (c) => {
    c.fillStyle = ASPHALT;
    c.fillRect(0, 0, 1152, 512);
    // Grain in the asphalt.
    for (let i = 0; i < 1600; i++) {
      const x = (i * 733) % 1152;
      const y = (i * 389) % 512;
      c.fillStyle = i % 3 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.12)';
      c.fillRect(x, y, 3, 3);
    }
    const line = (pts: Array<[number, number]>, color: string, w: number) => {
      c.strokeStyle = color;
      c.lineWidth = w;
      c.beginPath();
      pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.stroke();
    };
    const text = (s: string, x: number, y: number, size: number, color = PAINT, rot = 0) => {
      c.save();
      c.translate(x, y);
      c.rotate(rot);
      c.fillStyle = color;
      c.font = `bold ${size}px ${FONT}`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(s, 0, 0);
      c.restore();
    };
    // The border.
    c.strokeStyle = PAINT;
    c.lineWidth = 7;
    c.strokeRect(10, 10, 1132, 492);
    // The T자 코스 (left): a lane across the top and the bay going down off it.
    line([[24, 70], [372, 70]], YELLOW_LINE, 8);
    line([[24, 210], [150, 210], [150, 470], [290, 470], [290, 210], [372, 210]], YELLOW_LINE, 8);
    line([[150, 455], [290, 455]], PAINT, 6);
    text('T자 코스', 220, 340, 40);
    text('▼ 후진', 220, 400, 26);
    // The S자 코스 (middle): two curves a lane apart.
    c.strokeStyle = YELLOW_LINE;
    c.lineWidth = 8;
    for (const dx of [0, 160]) {
      c.beginPath();
      c.moveTo(440 + dx, 24);
      c.bezierCurveTo(660 + dx, 150, 380 + dx, 330, 560 + dx, 490);
      c.stroke();
    }
    text('S자 코스', 600, 256, 40, PAINT, -0.35);
    // The crossing (top right): the lane, its stop line, the crosswalk under the light.
    line([[780, 50], [1135, 50]], YELLOW_LINE, 6);
    line([[780, 200], [1135, 200]], YELLOW_LINE, 6);
    line([[1000, 55], [1000, 195]], PAINT, 14);
    c.fillStyle = PAINT;
    for (let i = 0; i < 6; i++) c.fillRect(1030, 62 + i * 23, 70, 13);
    text('정지선', 940, 125, 28);
    text('교차로', 880, 236, 30, YELLOW_LINE);
    // The 경사로 (bottom right): a hatched box, its stop line and an arrow up the slope.
    c.strokeStyle = PAINT;
    c.lineWidth = 6;
    c.strokeRect(800, 270, 320, 200);
    c.save();
    c.beginPath();
    c.rect(800, 270, 320, 200);
    c.clip();
    for (let x = 700; x < 1200; x += 46) line([[x, 470], [x + 200, 270]], 'rgba(244,244,239,0.35)', 10);
    c.restore();
    text('경사로', 960, 335, 40);
    text('정지 후 출발 ▶', 960, 395, 28, YELLOW_LINE);
    line([[930, 445], [990, 445]], PAINT, 12);
    // Start and finish boxes.
    c.strokeStyle = PAINT;
    c.lineWidth = 5;
    c.strokeRect(24, 250, 110, 90);
    text('출발', 79, 295, 32);
    c.strokeRect(24, 370, 110, 90);
    text('종료', 79, 415, 32, YELLOW_LINE);
    // A fade of 기능시험장 in the middle of the crossing lane.
    text(`${SCHOOL} 기능시험장`, 576, 496, 18, 'rgba(244,244,239,0.6)');
  });
}

/** The course seen from a pole camera, as on the 검정 booth's left monitor. */
function cctvTex(): THREE.Texture {
  return painted('diCctv', 256, 160, (c) => {
    c.fillStyle = '#3d4247';
    c.fillRect(0, 0, 256, 160);
    c.strokeStyle = YELLOW_LINE;
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(40, 0);
    c.bezierCurveTo(150, 50, 20, 110, 120, 160);
    c.moveTo(110, 0);
    c.bezierCurveTo(220, 50, 90, 110, 190, 160);
    c.stroke();
    // The car going through.
    c.save();
    c.translate(118, 78);
    c.rotate(0.7);
    c.fillStyle = '#f7cf2e';
    c.fillRect(-14, -24, 28, 48);
    c.fillStyle = '#6d8796';
    c.fillRect(-11, -10, 22, 16);
    c.restore();
    c.fillStyle = 'rgba(0,0,0,0.55)';
    c.fillRect(0, 0, 256, 22);
    c.fillStyle = '#ffffff';
    c.font = `bold 14px ${FONT}`;
    c.fillText('CAM 2 · S자 코스', 8, 16);
    c.fillStyle = '#ff1744';
    c.beginPath();
    c.arc(238, 11, 5, 0, Math.PI * 2);
    c.fill();
  });
}
/** The 전자채점 screen: the candidate on the course and the points off. */
function scoreTex(): THREE.Texture {
  return painted('diScore', 256, 160, (c) => {
    c.fillStyle = '#0d2a4a';
    c.fillRect(0, 0, 256, 160);
    c.fillStyle = '#1565c0';
    c.fillRect(0, 0, 256, 26);
    c.fillStyle = '#ffffff';
    c.font = `bold 15px ${FONT}`;
    c.fillText('전자채점 시스템 · 기능시험', 8, 18);
    c.font = `13px ${FONT}`;
    const rows: Array<[string, string, string]> = [
      ['수험번호', '0427', '#ffffff'],
      ['코스', 'S자 → 경사로', '#ffffff'],
      ['감점', '-10 (검지선 접촉)', '#ffab40'],
    ];
    rows.forEach(([k, v, col], i) => {
      c.fillStyle = '#90caf9';
      c.fillText(k, 10, 48 + i * 22);
      c.fillStyle = col;
      c.fillText(v, 80, 48 + i * 22);
    });
    c.fillStyle = '#69f0ae';
    c.font = `bold 34px ${FONT}`;
    c.fillText('90점', 12, 145);
    c.fillStyle = '#00c853';
    c.fillRect(150, 112, 96, 38);
    c.fillStyle = '#ffffff';
    c.font = `bold 24px ${FONT}`;
    c.fillText('합격', 172, 140);
  });
}
/** The road-test car's 전자채점 tablet on the dash. */
function tabletTex(): THREE.Texture {
  return painted('diTablet', 192, 128, (c) => {
    c.fillStyle = '#102030';
    c.fillRect(0, 0, 192, 128);
    c.fillStyle = '#ffffff';
    c.font = `bold 15px ${FONT}`;
    c.fillText('도로주행 전자채점', 10, 22);
    c.fillStyle = '#ffab40';
    c.font = `bold 22px ${FONT}`;
    c.fillText('감점 -5', 10, 56);
    c.fillStyle = '#69f0ae';
    c.font = `bold 30px ${FONT}`;
    c.fillText('95점', 10, 96);
    c.fillStyle = '#90caf9';
    c.font = `12px ${FONT}`;
    c.fillText('합격 기준 70점 · B코스', 10, 118);
    c.fillStyle = '#ff5252';
    c.beginPath();
    c.arc(170, 18, 6, 0, Math.PI * 2);
    c.fill();
  });
}
/** The 도로주행 course map: the four routes through town and their legend. */
function routeMapTex(): THREE.Texture {
  return painted('diRouteMap', 768, 384, (c) => {
    c.fillStyle = '#fafafa';
    c.fillRect(0, 0, 768, 384);
    c.fillStyle = '#1565c0';
    c.fillRect(0, 0, 768, 52);
    c.fillStyle = '#ffffff';
    c.font = `bold 30px ${FONT}`;
    c.fillText('도로주행 시험 코스 안내', 18, 37);
    c.font = `bold 18px ${FONT}`;
    c.fillText('A · B · C · D 코스', 600, 35);
    // The town.
    const mx = 14;
    const my = 64;
    const mw = 520;
    const mh = 306;
    c.fillStyle = '#efe9dc';
    c.fillRect(mx, my, mw, mh);
    c.fillStyle = '#c8e6c9';
    c.fillRect(mx + 330, my + 20, 120, 80);
    c.fillStyle = '#90caf9';
    c.fillRect(mx, my + 200, mw, 26);
    c.strokeStyle = '#bdbdbd';
    c.lineWidth = 12;
    for (const x of [70, 190, 310, 460]) {
      c.beginPath();
      c.moveTo(mx + x, my);
      c.lineTo(mx + x, my + mh);
      c.stroke();
    }
    for (const y of [40, 130, 260]) {
      c.beginPath();
      c.moveTo(mx, my + y);
      c.lineTo(mx + mw, my + y);
      c.stroke();
    }
    c.fillStyle = '#5d4037';
    c.font = `bold 14px ${FONT}`;
    c.fillText('시청', mx + 200, my + 110);
    c.fillText('초등학교', mx + 80, my + 290);
    c.fillText('공원', mx + 370, my + 66);
    c.fillText('한강대교', mx + 330, my + 218);
    // The school zone.
    c.strokeStyle = '#e53935';
    c.lineWidth = 3;
    c.strokeRect(mx + 54, my + 240, 110, 60);
    c.fillStyle = '#e53935';
    c.beginPath();
    c.arc(mx + 150, my + 252, 13, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ffffff';
    c.font = `bold 13px ${FONT}`;
    c.fillText('30', mx + 141, my + 257);
    // The four routes.
    const routes: Array<[string, string, Array<[number, number]>]> = [
      ['A', '#e53935', [[70, 40], [190, 40], [190, 130], [310, 130], [310, 40], [70, 40]]],
      ['B', '#1e88e5', [[70, 40], [70, 260], [310, 260], [310, 130], [190, 130], [190, 40]]],
      ['C', '#43a047', [[70, 40], [460, 40], [460, 260], [190, 260], [190, 130], [70, 130], [70, 40]]],
      ['D', '#8e24aa', [[70, 40], [70, 130], [460, 130], [460, 40], [70, 40]]],
    ];
    routes.forEach(([name, col, pts], i) => {
      const o = (i - 1.5) * 4;
      c.strokeStyle = col;
      c.lineWidth = 4;
      c.beginPath();
      pts.forEach(([x, y], j) => (j ? c.lineTo(mx + x + o, my + y + o) : c.moveTo(mx + x + o, my + y + o)));
      c.stroke();
      const [lx, ly] = pts[2];
      c.fillStyle = col;
      c.beginPath();
      c.arc(mx + lx + o, my + ly + o, 11, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#ffffff';
      c.font = `bold 14px ${FONT}`;
      c.fillText(name, mx + lx + o - 5, my + ly + o + 5);
    });
    // The school, where they all start.
    c.fillStyle = '#f9a825';
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 ? 7 : 16;
      c.lineTo(mx + 70 + Math.cos(a) * r, my + 40 + Math.sin(a) * r);
    }
    c.fill();
    c.fillStyle = '#212121';
    c.font = `bold 13px ${FONT}`;
    c.fillText('학원 출발', mx + 86, my + 30);
    // The legend.
    const lx = 552;
    const legend: Array<[string, string, string]> = [
      ['A', '#e53935', '시청 순환 5.2km'],
      ['B', '#1e88e5', '학교 앞 경유 5.8km'],
      ['C', '#43a047', '대로 외곽 6.1km'],
      ['D', '#8e24aa', '공원 순환 4.9km'],
    ];
    legend.forEach(([n, col, s], i) => {
      c.fillStyle = col;
      c.fillRect(lx, 76 + i * 42, 30, 30);
      c.fillStyle = '#ffffff';
      c.font = `bold 20px ${FONT}`;
      c.fillText(n, lx + 8, 99 + i * 42);
      c.fillStyle = '#263238';
      c.font = `bold 16px ${FONT}`;
      c.fillText(s, lx + 40, 97 + i * 42);
    });
    c.fillStyle = '#c62828';
    c.font = `bold 15px ${FONT}`;
    c.fillText('· 어린이보호구역 30km/h', lx, 268);
    c.fillText('· 우회전 시 일시정지', lx, 292);
    c.fillStyle = '#37474f';
    c.fillText('· 합격 기준 70점 이상', lx, 316);
    c.fillText('· 시험 시간 약 20분', lx, 340);
  });
}
/** The 합격자 board: this week's passes, the pass rate. */
function passBoardTex(): THREE.Texture {
  return painted('diPassBoard', 512, 384, (c) => {
    c.fillStyle = '#fffdf5';
    c.fillRect(0, 0, 512, 384);
    c.fillStyle = '#c62828';
    c.fillRect(0, 0, 512, 70);
    c.fillStyle = '#ffeb3b';
    c.font = `bold 40px ${FONT}`;
    c.fillText('祝 합격', 18, 50);
    c.fillStyle = '#ffffff';
    c.font = `bold 24px ${FONT}`;
    c.fillText('이번 주 합격자 명단', 230, 46);
    const names = ['김*현 1종보통', '이*영 2종보통', '박*준 1종보통', '최*아 2종보통', '정*우 1종대형', '강*희 2종보통', '조*민 1종보통', '윤*서 2종소형', '장*혁 1종보통', '한*름 2종보통'];
    c.font = `bold 19px ${FONT}`;
    names.forEach((n, i) => {
      const x = 22 + (i % 2) * 165;
      const y = 108 + Math.floor(i / 2) * 44;
      c.fillStyle = '#e53935';
      c.beginPath();
      c.arc(x + 6, y - 6, 6, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#263238';
      c.fillText(n, x + 18, y);
    });
    // The pass rate in a ring.
    c.strokeStyle = '#eceff1';
    c.lineWidth = 18;
    c.beginPath();
    c.arc(420, 190, 62, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = '#2e7d32';
    c.beginPath();
    c.arc(420, 190, 62, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 0.93);
    c.stroke();
    c.fillStyle = '#2e7d32';
    c.font = `bold 36px ${FONT}`;
    c.textAlign = 'center';
    c.fillText('93%', 420, 200);
    c.font = `bold 16px ${FONT}`;
    c.fillText('기능 합격률', 420, 284);
    c.fillStyle = '#5d4037';
    c.font = `bold 18px ${FONT}`;
    c.fillText(`${SCHOOL} · 축하합니다!`, 256, 366);
  });
}
/** The simulator's three screens: the course ahead as one picture across them (a third each). */
function dwellerTex(i: number): THREE.Texture {
  const key = `diDweller${i}`;
  let t = paints.get(key);
  if (t) return t;
  const whole = painted('diSimWhole', 768, 192, (c) => {
    const sky = c.createLinearGradient(0, 0, 0, 90);
    sky.addColorStop(0, '#64b5f6');
    sky.addColorStop(1, '#e3f2fd');
    c.fillStyle = sky;
    c.fillRect(0, 0, 768, 90);
    c.fillStyle = '#81c784';
    c.fillRect(0, 90, 768, 102);
    for (let i = 0; i < 14; i++) {
      c.fillStyle = '#388e3c';
      c.beginPath();
      c.arc(30 + i * 56, 86, 16 + (i % 3) * 5, Math.PI, 0);
      c.fill();
    }
    c.fillStyle = '#555b61';
    c.beginPath();
    c.moveTo(370, 90);
    c.lineTo(398, 90);
    c.lineTo(640, 192);
    c.lineTo(128, 192);
    c.closePath();
    c.fill();
    c.strokeStyle = YELLOW_LINE;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(372, 90);
    c.lineTo(150, 192);
    c.moveTo(396, 90);
    c.lineTo(618, 192);
    c.stroke();
    c.strokeStyle = PAINT;
    c.setLineDash([10, 12]);
    c.beginPath();
    c.moveTo(384, 92);
    c.lineTo(384, 192);
    c.stroke();
    c.setLineDash([]);
    // Cones along the way.
    for (const [x, y, s] of [[300, 130, 8], [470, 130, 8], [250, 160, 12], [520, 160, 12]] as const) {
      c.fillStyle = '#ff6d00';
      c.beginPath();
      c.moveTo(x, y - s * 2);
      c.lineTo(x + s, y);
      c.lineTo(x - s, y);
      c.fill();
    }
    // The dash HUD.
    c.fillStyle = 'rgba(0,0,0,0.55)';
    c.fillRect(296, 158, 176, 34);
    c.fillStyle = '#69f0ae';
    c.font = `bold 18px ${FONT}`;
    c.fillText('20 km/h · 1단', 312, 182);
    c.fillStyle = 'rgba(0,0,0,0.5)';
    c.fillRect(0, 0, 256, 26);
    c.fillStyle = '#ffffff';
    c.font = `bold 14px ${FONT}`;
    c.fillText('운전 시뮬레이터 · 기능 코스', 8, 18);
    c.fillStyle = 'rgba(0,0,0,0.5)';
    c.fillRect(560, 0, 208, 26);
    c.fillStyle = '#ffab40';
    c.fillText('▶ 좌회전 신호 대기', 576, 18);
  });
  t = whole.clone();
  t.offset.set(i / 3, 0);
  t.repeat.set(1 / 3, 1);
  t.needsUpdate = true;
  paints.set(key, t);
  return t;
}
/** The 학과시험 kiosk's screen: a question on a road sign, four answers, the time left. */
function kioskTex(): THREE.Texture {
  return painted('diKiosk', 256, 320, (c) => {
    c.fillStyle = '#f5f7fa';
    c.fillRect(0, 0, 256, 320);
    c.fillStyle = '#1565c0';
    c.fillRect(0, 0, 256, 40);
    c.fillStyle = '#ffffff';
    c.font = `bold 16px ${FONT}`;
    c.fillText('학과시험 연습 · 12 / 40', 10, 26);
    // The sign: a red-rimmed triangle with children crossing.
    c.fillStyle = '#ffffff';
    c.strokeStyle = '#d32f2f';
    c.lineWidth = 8;
    c.beginPath();
    c.moveTo(128, 56);
    c.lineTo(176, 136);
    c.lineTo(80, 136);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = '#212121';
    for (const dx of [-12, 12]) {
      c.beginPath();
      c.arc(128 + dx, 96, 5, 0, Math.PI * 2);
      c.fill();
      c.fillRect(124 + dx, 102, 8, 18);
    }
    c.fillStyle = '#263238';
    c.font = `bold 15px ${FONT}`;
    c.fillText('문 12. 이 안전표지의 뜻은?', 14, 164);
    const opts = ['① 어린이 보호', '② 횡단보도', '③ 자전거 통행', '④ 노인 보호'];
    opts.forEach((s, i) => {
      c.fillStyle = i === 0 ? '#bbdefb' : '#ffffff';
      c.fillRect(14, 176 + i * 30, 228, 24);
      c.strokeStyle = '#90a4ae';
      c.lineWidth = 1;
      c.strokeRect(14, 176 + i * 30, 228, 24);
      c.fillStyle = '#263238';
      c.font = `14px ${FONT}`;
      c.fillText(s, 22, 193 + i * 30);
    });
    c.fillStyle = '#c62828';
    c.font = `bold 14px ${FONT}`;
    c.fillText('남은 시간 23:41', 14, 310);
    c.fillStyle = '#1565c0';
    c.fillRect(170, 294, 72, 22);
    c.fillStyle = '#ffffff';
    c.fillText('다음 ▶', 182, 310);
  });
}
/** The 도로교통법 poster on the booth's front. */
function lawTex(): THREE.Texture {
  return painted('diLaw', 256, 192, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 256, 192);
    c.fillStyle = '#2e7d32';
    c.fillRect(0, 0, 256, 34);
    c.fillStyle = '#ffffff';
    c.font = `bold 18px ${FONT}`;
    c.fillText('도로교통법 꼭 알아두세요', 12, 24);
    const signs: Array<[string, string]> = [
      ['30', '어린이보호구역 시속 30km'],
      ['⟳', '우회전 시 일시정지'],
      ['0.03', '음주운전 혈중알코올 0.03%'],
    ];
    signs.forEach(([s, t], i) => {
      const y = 62 + i * 46;
      c.fillStyle = '#ffffff';
      c.strokeStyle = '#d32f2f';
      c.lineWidth = 5;
      c.beginPath();
      c.arc(30, y, 17, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.fillStyle = '#212121';
      c.font = `bold ${s.length > 2 ? 11 : 15}px ${FONT}`;
      c.textAlign = 'center';
      c.fillText(s, 30, y + 5);
      c.textAlign = 'left';
      c.font = `bold 14px ${FONT}`;
      c.fillText(t, 58, y + 5);
    });
  });
}

// ---------------------------------------------------------------------------------------------
// Small parts.

/** A 라바콘 standing on the ground at (x, y, z) in `g`: the black base, the orange cone, two reflective bands. */
function cone(g: THREE.Object3D, x: number, y: number, z: number, s = 1): THREE.Group {
  const c = group(g, x, y, z);
  c.scale.setScalar(s);
  part(c, rbox(0.32, 0.035, 0.32, 0.03), '#212121', 0, 0.018, 0);
  part(c, cyl(0.025, 0.13, 0.46, 16), '#ff6d00', 0, 0.26, 0);
  part(c, cyl(0.073, 0.093, 0.06, 16), '#f5f5f5', 0, 0.24, 0, { outline: false });
  part(c, cyl(0.045, 0.058, 0.05, 16), '#f5f5f5', 0, 0.37, 0, { outline: false });
  return c;
}
/** A striped 콘바 between two points. */
function coneBar(g: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3) {
  rod(g, a, b, 0.022, '#fdd835');
  const n = 6;
  for (let i = 0; i < n; i += 2) {
    const p = a.clone().lerp(b, (i + 0.5) / n);
    const q = a.clone().lerp(b, (i + 1.5) / n);
    rod(g, p, q, 0.024, BLACK);
  }
}
/** An office chair facing +z, its seat `h` up. */
function chair(g: THREE.Object3D, x: number, z: number, ry: number, h: number, color: string) {
  const c = group(g, x, 0, z, ry);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    rod(c, v3(0, 0.07, 0), v3(Math.sin(a) * 0.22, 0.04, Math.cos(a) * 0.22), 0.014, BLACK);
  }
  part(c, cyl(0.022, 0.022, h - 0.08, 10), CHROME, 0, 0.07 + (h - 0.08) / 2, 0, { outline: false });
  part(c, rbox(0.44, 0.08, 0.42, 0.035), color, 0, h + 0.0, 0);
  part(c, rbox(0.4, 0.44, 0.06, 0.04), color, 0, h + 0.3, -0.2, { rx: -0.08 });
}

// ---------------------------------------------------------------------------------------------

export const BUILDERS: Record<string, Builder> = {
  /**
   * The training car (연수용 차량): a yellow school hatchback in its painted parking bay, the
   * school's name in a lit sign on the roof, 연습차량 big on the doors and 보조브레이크 장착 under the
   * passenger window, a 연습 plate on the hatch. Inside (seen through the glass) the instructor's own
   * brake pedal on the passenger side and a second mirror for them. While it's used a nervous student
   * sits at the wheel (driver's side, the left), hands at ten to two, and the car pulls forward out
   * of its bay and reverses back in, its reversing and brake lights coming on. Teaching (teachParking)
   * the instructor sits beside them, watching, pointing the way, a finger up at the mirror, a hand
   * over on the wheel, braced when the brake goes down; riding along as a junior (rideAlong) they sit
   * in the back with a notebook while a senior instructor teaches.
   */
  drivingCar(g, _W, _D, _c, _def, _ctx, out) {
    const zc = 0.22;
    const L = 3.7;
    const Wd = 1.5;
    parkingBay(g, L, zc, '연습 1');
    const car = group(g);
    const YEL = '#f7cf2e';
    const s = carShell(car, { L, Wd, zc, body: YEL, seat: '#455a64', hatch: true, key: 'hatch' });
    // The school's livery: a green band, the words on both sides.
    for (const sd of [-1, 1]) {
      const zz = s.side(sd) + sd * 0.006;
      const ry = sd > 0 ? 0 : Math.PI;
      part(car, box(L - 0.4, 0.06, 0.006), '#2e7d32', -0.05, 0.46, zz, { outline: false });
      label(car, '연습차량', 0.82, 0.2, -0.12, 0.64, zz + sd * 0.002, 'none', '#1b1b1b', ry);
      label(car, SCHOOL, 1.4, 0.09, -0.15, 0.4, zz + sd * 0.004, 'none', '#ffffff', ry);
    }
    label(car, '보조브레이크 장착', 0.56, 0.065, 0.52, 0.775, s.side(1) + 0.01, 'none', '#c62828');
    // The roof sign: a lit box along the roof.
    const ry0 = s.roofY + 0.02;
    part(car, rbox(0.14, 0.03, 0.5, 0.01), BLACK, -0.35, ry0, zc);
    part(car, rbox(0.95, 0.22, 0.12, 0.04), '#fafafa', -0.35, ry0 + 0.13, zc);
    for (const sd of [-1, 1]) label(car, '운전학원 교습중', 0.86, 0.15, -0.35, ry0 + 0.13, zc + sd * 0.062, '#2e7d32', '#ffffff', sd > 0 ? 0 : Math.PI);
    // The 연습 plate on the hatch and the plates.
    label(car, '연습', 0.17, 0.17, s.bx - 0.016, 0.72, zc + 0.22, '#ffffff', '#d32f2f', -Math.PI / 2);
    label(car, '초보운전', 0.28, 0.09, s.bx - 0.016, 0.72, zc - 0.22, '#fdd835', '#212121', -Math.PI / 2);
    label(car, '35하 1027', 0.4, 0.1, s.fx + 0.045, 0.45, zc, '#ffffff', '#111111', Math.PI / 2);
    label(car, '35하 1027', 0.4, 0.1, s.bx - 0.05, 0.5, zc, '#ffffff', '#111111', -Math.PI / 2);
    // The instructor's brake on the passenger side, their own mirror.
    part(car, rbox(0.03, 0.11, 0.09, 0.01), '#c62828', s.wsFoot - 0.25, 0.22, s.pz);
    rod(car, v3(s.wsFoot - 0.2, 0.42, s.pz), v3(s.wsFoot - 0.25, 0.25, s.pz), 0.012, '#555');
    part(car, rbox(0.03, 0.05, 0.14, 0.012), BLACK, s.wsTop + 0.07, 0.81 + 0.48 - 0.1, s.pz - 0.05);
    part(car, box(0.004, 0.035, 0.12), '#cfe8f3', s.wsTop + 0.05, 0.81 + 0.48 - 0.1, s.pz - 0.05, { outline: false });
    // The student at the wheel and a senior instructor beside them, there while it's used.
    const crew = group(car);
    out.inUse = crew;
    const student = person(crew, LOOKS.studentA, s.sx + 0.02, s.dz, Math.PI / 2, s.seatY);
    const seniorG = group(crew);
    const senior = person(seniorG, LOOKS.instructor, s.sx + 0.02, s.pz, Math.PI / 2, s.seatY);
    senior.armL(v3(s.sx + 0.45, s.seatY + 0.42, s.pz - 0.12));
    // The junior's notebook in the back.
    const note = group(car, s.rx + 0.28, s.seatY + 0.16, s.pz);
    part(note, box(0.2, 0.012, 0.26), '#6d4c41', 0, 0, 0, { rz: -0.35, outline: false });
    part(note, box(0.18, 0.004, 0.24), '#fafafa', 0.004, 0.008, 0, { rz: -0.35, outline: false });
    const noteAt = marker(note, 0.02, 0.01, 0);
    const teach = sitAt(car, s.sx + 0.02, s.seatY, s.pz, Math.PI / 2, 'diCoach', s.hubAt);
    const ride = sitAt(car, s.rx + 0.02, s.seatY - 0.02, s.pz, Math.PI / 2, 'write', noteAt);
    const door = marker(g, s.sx - 0.1, 0.75, s.side(1) + 0.03);
    const by = standAt(g, s.sx - 0.1, s.side(1) + 0.42, Math.PI, 'talk', door);
    out.work = s.hubAt;
    out.spots = { teachParking: teach, drivingInstructor_rideAlong: ride, '*': by };
    // The run in and out of the bay while it's used; parked and dark otherwise. Done every frame
    // (Built.away is told each frame) so the car comes back to its bay when the lesson's over.
    out.away = (_out, t) => {
      const on = posed(teach, t) || posed(ride, t);
      seniorG.visible = posed(ride, t);
      note.visible = posed(ride, t);
      if (!on) {
        car.position.x = 0;
        car.rotation.y = 0;
        s.wheel.rotation.x = 0;
        s.reverse.visible = s.brake.visible = s.heads.visible = false;
        return;
      }
      const r = parkRound(t);
      // Turned about the back axle, so the nose swings out as it pulls forward.
      const px = -L / 2 + 0.66;
      const c = Math.cos(r.yaw);
      const sn = Math.sin(r.yaw);
      car.rotation.y = r.yaw;
      car.position.set(r.x + px - (px * c + zc * sn), 0, zc - (-px * sn + zc * c));
      s.wheel.rotation.x = r.steer;
      s.reverse.visible = r.reversing;
      s.brake.visible = r.braking;
      s.heads.visible = true;
      handsOnWheel(car, student, s);
    };
    handsOnWheel(car, student, s);
  },

  /**
   * The road-test car (도로 연수 차량): a white sedan with a blue band and a yellow stripe, '도로주행
   * 시험차량' on the doors, a yellow roof sign and the 전자채점 GPS dome behind it, '시험중 · 양보
   * 부탁드립니다' across the boot. On the dash the 전자채점 tablet shows the points off as it goes
   * (감점 -5, 95점, 합격 기준 70). Off on a road lesson (roadTraining) it pulls forward out of its
   * bay, turns down the lane to the gate and drives off with the student at the wheel and the
   * instructor beside them; it comes back reversing up the lane into its bay. Stood at, the
   * instructor's at the passenger door.
   */
  roadTestCar(g, _W, _D, _c, _def, _ctx, out) {
    const zc = 0.24;
    const L = 4.3;
    const Wd = 1.52;
    parkingBay(g, L, zc, '도로주행');
    const car = group(g);
    const WH = '#f6f7f8';
    const s = carShell(car, { L, Wd, zc, body: WH, seat: '#37474f', hatch: false, key: 'sedan' });
    for (const sd of [-1, 1]) {
      const zz = s.side(sd) + sd * 0.006;
      const ry = sd > 0 ? 0 : Math.PI;
      part(car, box(L - 0.5, 0.12, 0.006), '#1565c0', -0.05, 0.45, zz, { outline: false });
      part(car, box(L - 0.5, 0.035, 0.006), '#fdd835', -0.05, 0.535, zz, { outline: false });
      label(car, '도로주행 시험차량', 1.2, 0.15, -0.2, 0.68, zz + sd * 0.002, 'none', '#0d47a1', ry);
    }
    // The roof sign and the GPS dome of the 전자채점.
    const ry0 = s.roofY + 0.02;
    part(car, rbox(0.12, 0.03, 0.5, 0.01), BLACK, -0.1, ry0, zc);
    part(car, rbox(0.85, 0.2, 0.12, 0.04), '#fdd835', -0.1, ry0 + 0.12, zc);
    for (const sd of [-1, 1]) label(car, '도로주행 시험중', 0.78, 0.14, -0.1, ry0 + 0.12, zc + sd * 0.062, '#fdd835', '#c62828', sd > 0 ? 0 : Math.PI);
    part(car, cyl(0.09, 0.11, 0.06, 18), '#eceff1', -0.75, ry0 + 0.03, zc);
    part(car, ball(0.07), '#eceff1', -0.75, ry0 + 0.06, zc);
    part(car, cyl(0.006, 0.006, 0.3, 6), BLACK, -0.95, ry0 + 0.15, zc + 0.3, { outline: false });
    // The boot's sign and the plates.
    label(car, '시험중 · 양보 부탁드립니다', 0.66, 0.06, s.bx - 0.016, 0.785, zc, '#1565c0', '#ffffff', -Math.PI / 2);
    label(car, '12허 0703', 0.4, 0.1, s.fx + 0.045, 0.45, zc, '#ffffff', '#111111', Math.PI / 2);
    label(car, '12허 0703', 0.4, 0.1, s.bx - 0.05, 0.5, zc, '#ffffff', '#111111', -Math.PI / 2);
    // The 전자채점 tablet on its mount in the middle of the dash, facing the cabin.
    part(car, rbox(0.03, 0.15, 0.22, 0.01), BLACK, s.wsFoot - 0.3, 0.97, zc);
    rod(car, v3(s.wsFoot - 0.28, 0.85, zc), v3(s.wsFoot - 0.3, 0.92, zc), 0.01, BLACK);
    sheet(car, tabletTex(), 0.2, 0.13, s.wsFoot - 0.318, 0.97, zc, -Math.PI / 2);
    // Who's in it while it's out: the student at the wheel and the instructor beside them.
    const crew = group(car);
    const student = person(crew, LOOKS.studentB, s.sx + 0.02, s.dz, Math.PI / 2, s.seatY);
    const coach = person(crew, LOOKS.instructor, s.sx + 0.02, s.pz, Math.PI / 2, s.seatY);
    coach.armL(v3(s.sx + 0.52, s.seatY + 0.36, s.pz - 0.2));
    crew.visible = false;
    // Out on a lesson: out of the bay, round the corner to the right, down the lane and away; back:
    // reversing up the lane and round into the bay.
    const R = 1.2;
    const s1 = 0.6;
    const arc = (Math.PI * R) / 2;
    const far = 22;
    const along = (d: number) => {
      if (d <= s1) return { x: d, z: 0, yaw: 0 };
      if (d <= s1 + arc) {
        const th = (d - s1) / R;
        return { x: s1 + R * Math.sin(th), z: R * (1 - Math.cos(th)), yaw: -th };
      }
      return { x: s1 + R, z: R + (d - s1 - arc), yaw: -Math.PI / 2 };
    };
    let state: 'parked' | 'leaving' | 'gone' | 'back' | undefined;
    let since = 0;
    out.away = (isOut, t) => {
      if (state === undefined) state = isOut ? 'gone' : 'parked';
      else if (isOut && (state === 'parked' || state === 'back')) [state, since] = ['leaving', t];
      else if (!isOut && (state === 'leaving' || state === 'gone')) [state, since] = ['back', t];
      const e = t - since;
      let d = 0;
      if (state === 'leaving') {
        const r = Math.max(0, e - 1.2);
        d = Math.min(far, 0.75 * r * r);
        if (d >= far) state = 'gone';
      } else if (state === 'back') {
        const u = Math.min(1, e / 8);
        d = far * (1 - u) * (1 - u);
        if (u >= 1) state = 'parked';
      }
      const p = along(d);
      car.position.set(p.x, 0, p.z);
      car.rotation.y = p.yaw;
      s.wheel.rotation.x = d > s1 * 0.6 && d < s1 + arc ? -1.8 : 0;
      car.visible = state !== 'gone';
      const moving = state === 'leaving' || state === 'back';
      crew.visible = moving;
      s.heads.visible = moving;
      s.reverse.visible = state === 'back';
      s.brake.visible = state === 'back' && d < 1;
      if (moving) handsOnWheel(car, student, s);
    };
    handsOnWheel(car, student, s);
    const door = marker(g, s.sx - 0.1, 0.75, s.side(1) + 0.03);
    out.work = s.hubAt;
    out.spots = { '*': standAt(g, s.sx - 0.1, s.side(1) + 0.42, Math.PI, 'gesture', door) };
  },

  /**
   * The course cones (기능 코스 라바콘): on the course's painted edge line, a stack of nested cones, a
   * cone set out on its painted spot, and behind them two more cones with a striped 콘바 across.
   * Setting the course (setupCourse) the instructor crouches, takes the top cone off the stack in both
   * hands, carries it over and sets it on its spot, nudges its base square and stands for a look;
   * next round it's fetched back. Giving the instructors' safety talk (instructorMeeting) they stand
   * beside the barrier turned out to the others, pointing back at it as they make each point.
   */
  trafficCone(g, _W, _D, _c, _def, _ctx, out) {
    // The painted edge line and the cone's spot.
    part(g, box(1.0, 0.004, 0.08), PAINT, 0, 0.004, -0.05, { outline: false, shadow: false });
    const at = standAt(g, 0, 0.78, Math.PI, 'diCone');
    const work = marker(g, 0, 0, 0.36);
    at.work = work;
    // The cone offsets (to the instructor's left, up, away) in this piece's frame: they face -z, so
    // their left is -x and away is -z.
    const local = (o: { side: number; up: number; ahead: number }) => v3(work.position.x - o.side, work.position.y + o.up, work.position.z - o.ahead);
    const dot = local(CONE.spot);
    part(g, cyl(0.1, 0.1, 0.004, 18), PAINT, dot.x, 0.005, dot.z, { outline: false, shadow: false });
    // The stack: two nested, the moving one on top when it's in.
    const st = local(CONE.stack);
    cone(g, st.x, 0, st.z);
    cone(g, st.x, CONE.nest * 0.5, st.z);
    const moving = cone(g, st.x, CONE.nest, st.z);
    // The barrier behind.
    cone(g, -0.32, 0, -0.3, 0.9);
    cone(g, 0.32, 0, -0.3, 0.9);
    coneBar(g, v3(-0.32, 0.36, -0.3), v3(0.32, 0.36, -0.3));
    const barTop = marker(g, 0, 0.4, -0.3);
    const talk = standAt(g, 0.72, 0.1, 0, 'present', barTop);
    out.work = work;
    out.spots = { setupCourse: at, drivingInstructor_instructorMeeting: talk, '*': at };
    const atWorld = new THREE.Vector3();
    out.away = (_o, t) => {
      if (!posed(at, t)) {
        moving.position.set(st.x, CONE.nest, st.z);
        moving.rotation.set(0, 0, 0);
        return;
      }
      const c = coneRound(t, drvPhase(at.at.getWorldPosition(atWorld)));
      const p = local({ side: c.base.side, up: c.base.up, ahead: c.base.ahead + c.nudge });
      moving.position.copy(p);
      moving.rotation.z = c.held ? 0.08 * Math.sin(c.u * 30) : 0;
    };
  },

  /**
   * The 검정 booth (기능 검정 부스): a small white cabin on a step, glass on three sides over a white
   * lower panel, a flat roof with '기능검정실' across the front, a horn speaker and an orange beacon on
   * top, an air-conditioner on its side. Inside a desk under the front window with the course camera
   * on the left monitor and the 전자채점 scores on the right (lit while it's used), the score sheets,
   * a desk mic with its talk key, a keyboard; the examiner's chair. Supervising (superviseExam) the
   * examiner sits ticking the sheet, glances up at the screens and leans in to the mic to call the
   * next candidate; analysing enrolment (academyRevenue) they sit typing; teaching the law
   * (lawLesson) they stand at the booth's front by the 도로교통법 poster, turned out to the students.
   */
  examBooth(g, _W, _D, _c, _def, _ctx, out) {
    examDesk(g, out, true);
  },

  /**
   * The control room's examiner desk (new, 2026-11-05, the layout audit: the 기능시험 is watched from the 관제실 upstairs, not a box
   * on the yard). The booth's desk without its cabin, turned to the window behind it: the course camera and the 전자채점 screens,
   * the score sheets, the PA mic, the keyboard, the chair; the examiner sits with their back to the room looking out over the course.
   */
  diControlDesk(g, _W, _D, _c, _def, _ctx, out) {
    const r = group(g, 0, 0, 0, Math.PI);
    examDesk(r, out, false);
  },

  /**
   * The 장내 기능 course (new, 2026-11-05, the layout audit; flat, walked over), drawn from the tile (1, 1): the lane round the yard
   * between its white edges, the arrows the way it's driven, 출발 on the south lane, the 경사로 up the west lane (its own piece), the
   * 가속 구간 along the north lane, the stop line and crosswalk at the signal on the east lane, 종료 before the road-test car's bay.
   */
  diCircuit(g) {
    circuit(g);
  },
  /** The school's fence (new, 2026-11-05, the layout audit; flat, walked over), from the corner tile: mesh round the yard, the gate on the street open for the road-test car, the school's name on it. */
  diYardFence(g) {
    yardFence(g);
  },
  /** The 경사로 (new, 2026-11-05, the layout audit): a concrete hump on the lane, up, a flat top with its stop line where the car must stop and pull away, and down; the striped edges, its sign. */
  diHill(g, W, D) {
    hill(g, W, D);
  },
  /** The bench at the start (new, 2026-11-05, the layout audit): a blue canopy on four posts over a long bench, 대기석, where students wait for their turn on the course. */
  diWaitShelter(g, W, D) {
    waitShelter(g, W, D);
  },

  /**
   * The 기능시험 course painted on the yard (walked over, not round): dark asphalt in a white border,
   * the T자 코스 (a lane with the reversing bay off it), the two yellow curves of the S자 코스, the
   * crossing with its stop line and crosswalk under the traffic light, the hatched 경사로 box with
   * its stop line, the 출발 and 종료 boxes.
   */
  diCourse(g, W, D) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(W, D), textured(courseTex()));
    m.userData.ownGeometry = m.userData.ownMaterial = true;
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.008;
    m.receiveShadow = true;
    g.add(m);
  },

  /**
   * The course's traffic light: a grey pole on a concrete footing, the Korean four-lamp head across
   * the top (red, yellow, the green left arrow, green) in its black housing with visors, a 기능시험
   * plate on the pole; it cycles through green, yellow, red and red with the left arrow all day.
   */
  diTrafficLight(g, _W, _D, _c, _def, _ctx, out) {
    part(g, rbox(0.4, 0.12, 0.4, 0.03), '#bdbdbd', 0, 0.06, -0.2);
    part(g, cyl(0.055, 0.065, 2.6, 14), '#90a4ae', 0, 1.42, -0.2);
    const hy = 2.6;
    const hw = 1.06;
    rod(g, v3(0, hy - 0.05, -0.2), v3(0, hy - 0.05, -0.06), 0.03, '#90a4ae');
    part(g, rbox(hw, 0.3, 0.2, 0.04), '#1f2226', 0, hy, 0.02);
    const xs = [-0.39, -0.13, 0.13, 0.39];
    const cols = ['#e53935', '#ffb300', '#43a047', '#43a047'];
    const lamps: THREE.Mesh[] = [];
    const hood = shape('diHood', () => new THREE.CylinderGeometry(0.11, 0.11, 0.13, 16, 1, true, Math.PI / 2, Math.PI));
    xs.forEach((x, i) => {
      part(g, hood, '#1f2226', x, hy + 0.01, 0.19, { rx: Math.PI / 2 + 0.12, outline: false, material: HOOD });
      part(g, cyl(0.1, 0.1, 0.012, 20), shade(cols[i], 0.35), x, hy, 0.125, { rx: Math.PI / 2, outline: false });
      const on = part(g, cyl(0.095, 0.095, 0.014, 20), cols[i], x, hy, 0.128, { rx: Math.PI / 2, outline: false, material: glow(tint(cols[i], 0.25)) });
      lamps.push(on);
    });
    // The arrow over the third lamp.
    const arrow = painted('diArrow', 64, 64, (c) => {
      c.fillStyle = '#1b5e20';
      c.beginPath();
      c.moveTo(10, 32);
      c.lineTo(30, 14);
      c.lineTo(30, 25);
      c.lineTo(54, 25);
      c.lineTo(54, 39);
      c.lineTo(30, 39);
      c.lineTo(30, 50);
      c.closePath();
      c.fill();
    });
    sheet(g, arrow, 0.15, 0.15, xs[2], hy, 0.137);
    label(g, '기능시험 신호', 0.3, 0.07, 0, 1.6, -0.14, '#1565c0', '#ffffff');
    // Green 9 s, yellow 3 s, red 9 s, red with the left arrow 5 s.
    out.away = (_o, t) => {
      const u = ((t % 26) + 26) % 26;
      const phase = u < 9 ? 'green' : u < 12 ? 'yellow' : u < 21 ? 'red' : 'left';
      lamps[0].visible = phase === 'red' || phase === 'left';
      lamps[1].visible = phase === 'yellow';
      lamps[2].visible = phase === 'left';
      lamps[3].visible = phase === 'green';
    };
    out.away(false, 0);
  },

  /**
   * The 도로주행 course map: a big board on two blue posts under a little roof, the four test routes
   * drawn over the town in red, blue, green and purple from the school's star, the school zone ringed
   * with its 30, a legend of the routes' lengths and the rules to watch. Briefing a road lesson
   * (diRouteBrief) the instructor stands by its right end turned out to the students, pointing back
   * at the route.
   */
  diRouteMap(g, W, D, _c, _def, _ctx, out) {
    const bw = W - 0.16;
    const bh = bw / 2;
    const y = 1.35;
    const z = -D / 2 + 0.2;
    for (const sx of [-1, 1]) {
      part(g, rbox(0.08, y + bh / 2 + 0.15, 0.08, 0.02), '#1565c0', sx * (bw / 2 + 0.02), (y + bh / 2 + 0.15) / 2, z - 0.03);
      part(g, rbox(0.22, 0.06, 0.4, 0.02), '#9e9e9e', sx * (bw / 2 + 0.02), 0.03, z);
    }
    part(g, rbox(bw + 0.08, bh + 0.08, 0.05, 0.015), '#0d47a1', 0, y, z);
    sheet(g, routeMapTex(), bw, bh, 0, y, z + 0.027);
    part(g, rbox(bw + 0.3, 0.05, 0.36, 0.015), '#0d47a1', 0, y + bh / 2 + 0.17, z + 0.06, { rx: 0.15 });
    const point = marker(g, 0.25, y + 0.05, z + 0.03);
    out.work = point;
    const brief = standAt(g, bw / 2 - 0.12, 0.5, 0, 'present', point);
    out.spots = { diRouteBrief: brief, '*': brief };
  },

  /**
   * The 합격자 board by the gate: a red-framed notice board on legs under a '祝 합격' header, this
   * week's passes listed with their licence class, the pass rate in a green ring, a bunch of balloons
   * tied at one corner. Posting the list (diPostPasses) the instructor stands at it pinning it up.
   */
  diPassBoard(g, W, D, _c, _def, _ctx, out) {
    const bw = W - 0.3;
    const bh = bw * 0.75;
    const y = 1.3;
    const z = -D / 2 + 0.18;
    for (const sx of [-1, 1]) {
      part(g, cyl(0.03, 0.03, y + bh / 2, 10), '#8d6e63', sx * (bw / 2 - 0.05), (y + bh / 2) / 2, z - 0.03);
      part(g, rbox(0.06, 0.04, 0.36, 0.015), '#6d4c41', sx * (bw / 2 - 0.05), 0.02, z);
    }
    part(g, rbox(bw + 0.08, bh + 0.08, 0.05, 0.015), '#b71c1c', 0, y, z);
    sheet(g, passBoardTex(), bw, bh, 0, y, z + 0.027);
    // Balloons tied at the top right.
    const knot = v3(bw / 2 + 0.02, y + bh / 2, z + 0.03);
    const cols = ['#e53935', '#fdd835', '#42a5f5', '#ec407a'];
    cols.forEach((col, i) => {
      const b = v3(knot.x + 0.08 + (i % 2) * 0.12, knot.y + 0.3 + Math.floor(i / 2) * 0.16, knot.z + (i - 1.5) * 0.06);
      rod(g, knot, b, 0.003, '#9e9e9e');
      part(g, ball(0.09), col, b.x, b.y + 0.08, b.z);
    });
    const pin = marker(g, -0.2, y + 0.05, z + 0.03);
    out.work = pin;
    const post = standAt(g, -0.2, 0.5, Math.PI, 'board', pin);
    out.spots = { diPostPasses: post, '*': post };
  },

  /**
   * The driving simulator: a black frame on a low platform, a bucket seat with harness slots, the
   * wheel on its column, three pedals (1종 has the clutch), the gear stick, and three screens on a
   * bar showing the course ahead as one view (lit while it's used), '운전 시뮬레이터' on the base. In a
   * lesson (diSimLesson) a student sits in it, hands on the wheel, while the instructor stands at
   * their shoulder pointing at the screens; demonstrating (diSimDemo) the instructor sits and drives.
   */
  diSimulator(g, W, D, _c, _def, _ctx, out) {
    // The platform and frame.
    part(g, rbox(W - 0.1, 0.1, D - 0.06, 0.03), '#263238', 0, 0.05, 0);
    label(g, '운전 시뮬레이터', 0.7, 0.07, 0, 0.05, D / 2 - 0.025, '#263238', '#4fc3f7');
    const seatZ = 0.12;
    const seatX = -0.2;
    const seatY = 0.5;
    // The bucket seat, facing the screens (-z).
    const seat = group(g, seatX, 0, seatZ, Math.PI);
    part(seat, rbox(0.06, 0.3, 0.06, 0.02), '#37474f', 0, 0.25, 0);
    part(seat, rbox(0.5, 0.1, 0.48, 0.05), '#212121', 0, seatY - 0.05, 0);
    part(seat, rbox(0.5, 0.7, 0.12, 0.06), '#212121', 0, seatY + 0.33, -0.25, { rx: -0.12 });
    for (const sx of [-1, 1]) part(seat, rbox(0.08, 0.36, 0.42, 0.04), '#c62828', sx * 0.25, seatY + 0.12, -0.05);
    for (const sx of [-1, 1]) part(seat, box(0.05, 0.06, 0.02), '#424242', sx * 0.08, seatY + 0.6, -0.3, { outline: false });
    // The wheel on its column, the pedals, the gear stick on the seat's right (+x).
    const wz = seatZ - 0.46;
    part(g, rbox(0.12, 0.62, 0.12, 0.03), '#37474f', seatX, 0.4, wz - 0.08);
    const hub = group(g, seatX, 0.82, wz);
    hub.rotation.x = 0.35;
    part(hub, ring(0.16, 0.016), '#1a1a1a', 0, 0, 0);
    part(hub, cyl(0.045, 0.045, 0.05, 12), '#c62828', 0, 0, 0, { rx: Math.PI / 2, outline: false });
    for (const [x, y] of [[0, -0.15], [0.15, 0.04], [-0.15, 0.04]] as const) rod(hub, v3(0, 0, 0), v3(x, y, 0), 0.012, '#1a1a1a');
    const hubAt = marker(hub, 0, 0, 0);
    for (const [i, col] of ['#9e9e9e', '#9e9e9e', '#9e9e9e'].entries()) part(g, rbox(0.07, 0.11, 0.03, 0.01), col, seatX - 0.13 + i * 0.13, 0.17, wz - 0.12, { rx: 0.5 });
    part(g, rbox(0.12, 0.25, 0.14, 0.02), '#37474f', seatX + 0.36, 0.22, seatZ - 0.15);
    part(g, cyl(0.012, 0.012, 0.22, 8), '#9e9e9e', seatX + 0.36, 0.45, seatZ - 0.15, { outline: false });
    part(g, ball(0.035), '#212121', seatX + 0.36, 0.57, seatZ - 0.15);
    // The three screens on their bar.
    const sz = -D / 2 + 0.06;
    const sy = 1.2;
    part(g, rbox(0.08, sy, 0.08, 0.02), '#37474f', seatX, sy / 2, sz - 0.04);
    part(g, rbox(1.5, 0.04, 0.04, 0.01), '#37474f', seatX, sy, sz - 0.03);
    const screens: Array<[number, number, number]> = [[-0.52, 0.45, 0], [0, 0, 1], [0.52, -0.45, 2]];
    for (const [x, ry, i] of screens) {
      const m = group(g, seatX + x, sy, sz + Math.abs(x) * 0.22, ry);
      part(m, rbox(0.52, 0.32, 0.03, 0.01), BLACK, 0, 0, 0);
      if (i === 1) out.screen = screenOf(m, dwellerTex(i), 0.49, 0.29, 0, 0, 0.016);
      else sheet(m, dwellerTex(i), 0.49, 0.29, 0, 0, 0.016);
    }
    // The instructor's tablet on a stand at the side.
    part(g, cyl(0.015, 0.015, 1.0, 8), '#9e9e9e', W / 2 - 0.22, 0.55, -0.15, { outline: false });
    part(g, rbox(0.24, 0.17, 0.02, 0.01), BLACK, W / 2 - 0.22, 1.1, -0.15, { rx: -0.4 });
    sheet(g, scoreTex(), 0.22, 0.14, W / 2 - 0.22, 1.1, -0.138, 0, -0.4);
    // The student, there for a lesson.
    const studentG = group(g);
    const student = person(studentG, LOOKS.studentC, seatX, seatZ + 0.02, Math.PI, seatY);
    student.armL(v3(seatX - 0.12, 0.88, wz + 0.03));
    student.armR(v3(seatX + 0.12, 0.88, wz + 0.03));
    studentG.visible = false;
    const screenAt = marker(g, seatX + 0.05, sy, sz + 0.02);
    const lesson = standAt(g, seatX + 0.55, seatZ - 0.05, Math.PI + 0.35, 'diPoint', screenAt);
    const demo = sitAt(g, seatX, seatY, seatZ, Math.PI, 'steer', hubAt, seatY);
    out.work = screenAt;
    out.spots = { diSimLesson: lesson, diSimDemo: demo, '*': lesson };
    out.away = (_o, t) => {
      studentG.visible = posed(lesson, t);
    };
  },

  /**
   * The 학과시험 practice kiosk: a white pedestal with a blue header '학과시험 연습', a tilted touch
   * screen of the test (a road sign, the question, four answers, the time left; lit while it's used),
   * a card reader for the 수험표 and a slot that prints the result. Guiding a student through it
   * (diKioskGuide) the instructor stands at it, clipboard in hand, pointing to the answer and tapping.
   */
  diTestKiosk(g, _W, _D, _c, _def, _ctx, out) {
    part(g, rbox(0.5, 0.05, 0.4, 0.02), '#cfd8dc', 0, 0.025, -0.1);
    part(g, rbox(0.34, 0.95, 0.24, 0.05), '#f5f5f5', 0, 0.52, -0.12);
    part(g, rbox(0.3, 0.06, 0.005, 0.01), '#1565c0', 0, 0.85, 0.003);
    label(g, '결과표 출력', 0.2, 0.04, 0, 0.75, 0.002, 'none', '#455a64');
    part(g, box(0.18, 0.012, 0.01), '#212121', 0, 0.7, 0.002, { outline: false });
    // The tilted screen head.
    const head = group(g, 0, 1.15, -0.05);
    head.rotation.x = -0.35;
    part(head, rbox(0.48, 0.6, 0.06, 0.03), '#eceff1', 0, 0, 0);
    out.screen = screenOf(head, kioskTex(), 0.38, 0.48, 0, -0.02, 0.032);
    part(g, rbox(0.44, 0.1, 0.06, 0.02), '#1565c0', 0, 1.55, -0.12);
    label(g, '학과시험 연습', 0.4, 0.08, 0, 1.55, -0.088, '#1565c0', '#ffffff');
    // The card reader.
    part(g, rbox(0.12, 0.04, 0.1, 0.01), '#455a64', 0.12, 0.9, 0.0, { rx: -0.3 });
    part(g, box(0.05, 0.004, 0.04), '#76ff03', 0.12, 0.925, 0.01, { rx: -0.3, outline: false, material: glow('#b2ff59') });
    const tap = marker(head, 0, -0.06, 0.04);
    out.work = tap;
    const guide = standAt(g, 0.08, 0.5, Math.PI, 'diPoint', tap);
    out.spots = { diKioskGuide: guide, '*': guide };
  },
};

/** The 검정 booth (with its cabin) or the control room's desk (without): the examiner's desk, screens, mic and chair, and their spots. */
function examDesk(g: THREE.Group, out: Parameters<Builder>[6], cabin: boolean) {
  {
    const w = 0.96;
    const d = 0.96;
    const H = 2.1;
    const WH = '#f3f4f2';
    if (cabin) {
    // The step and floor, the back wall, the lower panels, the posts, the glass.
    part(g, rbox(w + 0.04, 0.08, d + 0.04, 0.02), '#9e9e9e', 0, 0.04, 0);
    part(g, box(w, 0.02, d), '#b0a48e', 0, 0.09, 0, { outline: false });
    part(g, rbox(w, H - 0.1, 0.05, 0.015), WH, 0, H / 2 + 0.05, -d / 2 + 0.025);
    for (const sx of [-1, 1]) part(g, rbox(0.05, 0.85, d, 0.015), WH, sx * (w / 2 - 0.025), 0.5, 0);
    part(g, rbox(w, 0.85, 0.05, 0.015), WH, 0, 0.5, d / 2 - 0.025);
    for (const [px, pz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) part(g, rbox(0.05, H - 0.1, 0.05, 0.012), '#cfd4d8', px * (w / 2 - 0.025), H / 2 + 0.05, pz * (d / 2 - 0.025));
    const gy = 0.925 + (H - 0.95) / 2;
    const gh = H - 0.95 - 0.08;
    part(g, box(w - 0.08, gh, 0.012), '#d7eef7', 0, gy, d / 2 - 0.025, { material: PANE, outline: false, shadow: false });
    for (const sx of [-1, 1]) part(g, box(0.012, gh, d - 0.08), '#d7eef7', sx * (w / 2 - 0.025), gy, 0, { material: PANE, outline: false, shadow: false });
    // The roof, the sign, the speaker, the beacon, the air-conditioner.
    part(g, rbox(w + 0.14, 0.1, d + 0.14, 0.03), '#eceff1', 0, H + 0.05, 0);
    label(g, '기능검정실', w + 0.06, 0.09, 0, H + 0.05, d / 2 + 0.072, '#1565c0', '#ffffff');
    part(g, cyl(0.04, 0.12, 0.2, 14), '#eeeeee', 0.28, H + 0.2, 0.1, { rx: Math.PI / 2 + 0.3 });
    part(g, cyl(0.05, 0.05, 0.08, 12), '#bdbdbd', 0.28, H + 0.14, 0.0);
    part(g, cyl(0.06, 0.07, 0.1, 14), '#ff9800', -0.3, H + 0.15, 0, { material: glow('#ffb74d') });
    part(g, rbox(0.16, 0.42, 0.3, 0.02), '#e0e0e0', w / 2 + 0.08, 1.5, -0.15);
    for (let i = 0; i < 5; i++) part(g, box(0.004, 0.36, 0.006), '#9e9e9e', w / 2 + 0.162, 1.5, -0.27 + i * 0.06, { outline: false });
    // The front: the law poster, the booth's name, a step light.
    sheet(g, lawTex(), 0.5, 0.38, -0.12, 0.55, d / 2 + 0.003);
    label(g, '기능시험 검정원실', 0.36, 0.06, 0.24, 0.8, d / 2 + 0.003, '#1565c0', '#ffffff');
    } else {
      // The control desk's front panel under its top, and the PA amplifier beside it.
      part(g, rbox(w - 0.1, 0.62, 0.04, 0.01), '#cfd8dc', 0, 0.42, d / 2 - 0.05);
    }
    // The desk under the front window.
    const top = 0.74;
    const dz = d / 2 - 0.05 - 0.17;
    part(g, rbox(w - 0.12, 0.03, 0.34, 0.01), '#d7ccc8', 0, top, dz);
    part(g, rbox(0.03, top - 0.1, 0.3, 0.01), '#bcaaa4', -(w / 2 - 0.1), (top + 0.1) / 2, dz);
    part(g, rbox(0.03, top - 0.1, 0.3, 0.01), '#bcaaa4', w / 2 - 0.1, (top + 0.1) / 2, dz);
    const ty = top + 0.015;
    // Two monitors in the corners, turned in.
    const mon = (x: number, ry: number, tex: THREE.Texture, lit: boolean) => {
      const m = group(g, x, ty, dz + 0.04, ry);
      part(m, rbox(0.06, 0.012, 0.06, 0.005), BLACK, 0, 0.006, 0);
      part(m, cyl(0.01, 0.01, 0.12, 8), BLACK, 0, 0.07, -0.01, { outline: false });
      part(m, rbox(0.3, 0.2, 0.02, 0.008), BLACK, 0, 0.22, 0);
      if (lit) out.screen = screenOf(m, tex, 0.28, 0.175, 0, 0.22, 0.011);
      else sheet(m, tex, 0.28, 0.175, 0, 0.22, 0.011);
    };
    mon(-0.28, Math.PI - 0.5, cctvTex(), false);
    mon(0.28, Math.PI + 0.5, scoreTex(), true);
    // The score sheets on a clipboard, the mic by them, the keyboard.
    const sheetAt = marker(g, 0.05, ty + 0.005, dz - 0.02);
    part(g, box(0.2, 0.01, 0.27), '#6d4c41', 0.05, ty + 0.005, dz - 0.02, { ry: 0.1, outline: false });
    part(g, box(0.18, 0.004, 0.24), '#fafafa', 0.05, ty + 0.012, dz - 0.03, { ry: 0.1, outline: false });
    for (let i = 0; i < 6; i++) part(g, box(0.13, 0.002, 0.005), '#90a4ae', 0.05, ty + 0.015, dz - 0.12 + i * 0.035, { ry: 0.1, outline: false });
    // The examiner faces +z, so their left is +x and away is +z.
    const micX = sheetAt.position.x + MIC.side;
    const micZ = sheetAt.position.z + MIC.ahead;
    part(g, rbox(0.1, 0.03, 0.12, 0.012), BLACK, micX, ty + 0.015, micZ);
    part(g, rbox(0.035, 0.012, 0.03, 0.006), '#e53935', micX, ty + 0.035, micZ + 0.03);
    rod(g, v3(micX, ty + 0.03, micZ - 0.03), v3(micX + 0.06, ty + 0.3, micZ - 0.11), 0.007, '#424242');
    part(g, cyl(0.016, 0.012, 0.06, 10), '#212121', micX + 0.07, ty + 0.33, micZ - 0.13, { rx: -0.9 });
    const kb = marker(g, -0.02, ty + 0.02, dz + 0.05);
    part(g, rbox(0.3, 0.018, 0.1, 0.006), '#37474f', -0.02, ty + 0.01, dz + 0.06, { ry: 0.05 });
    // The examiner's chair, facing the window.
    const cz = -0.12;
    chair(g, 0, cz, 0, 0.46, '#1565c0');
    out.seat = marker(g, 0, 0.5, cz);
    out.work = sheetAt;
    const score = sitAt(g, 0, 0.5, cz, 0, 'diExamine', sheetAt);
    out.spots = {
      superviseExam: score,
      drivingInstructor_academyRevenue: sitAt(g, 0, 0.5, cz, 0, 'type', kb),
      drivingInstructor_lawLesson: standAt(g, 0.36, d / 2 + 0.42, 0, 'present', marker(g, -0.12, 0.62, d / 2 + 0.01)),
      '*': score,
    };
  }
}

// ---------------------------------------------------------------------------------------------
// The yard laid out as a school's (2026-11-05, the layout audit).

const FLATLINE = { outline: false, shadow: false };
/** A painted stripe on the ground, w along x and d along z. */
const stripe = (g: THREE.Object3D, w: number, d: number, x: number, z: number, c = PAINT) => part(g, box(w, 0.004, d), c, x, 0.012, z, FLATLINE);
/** Words painted on the ground, read from the south. */
const groundWords = (g: THREE.Object3D, s: string, w: number, x: number, z: number, ry = 0) => label(g, s, w, w * 0.3, x, 0.014, z, 'none', PAINT, ry, -Math.PI / 2);
/** An arrow painted on the lane, pointing along `ry` (0: north). */
function laneArrow(g: THREE.Object3D, x: number, z: number, ry: number) {
  const tex = painted('diLaneArrow', 64, 128, (c) => {
    c.clearRect(0, 0, 64, 128);
    c.fillStyle = PAINT;
    c.beginPath();
    c.moveTo(32, 4);
    c.lineTo(60, 44);
    c.lineTo(42, 44);
    c.lineTo(42, 124);
    c.lineTo(22, 124);
    c.lineTo(22, 44);
    c.lineTo(4, 44);
    c.closePath();
    c.fill();
  });
  sheet(g, tex, 0.5, 1.0, x, 0.014, z, ry, -Math.PI / 2);
}

/** Held by the tile (1, 1): a lot point (x, y) is (x - 1.5, y - 1.5) from its middle. */
function circuit(g: THREE.Group) {
  const at = (v: number) => v - 1.5;
  const hLine = (x0: number, x1: number, y: number, c = PAINT) => stripe(g, x1 - x0, 0.1, at((x0 + x1) / 2), at(y), c);
  const vLine = (y0: number, y1: number, x: number, c = PAINT) => stripe(g, 0.1, y1 - y0, at(x), at((y0 + y1) / 2), c);
  // The lane's edges: outside along the fence, inside round the island; open at the south-east, the road-test car's bay.
  hLine(0.95, 15.95, 0.95);
  vLine(0.95, 12.95, 0.95);
  hLine(0.95, 11.6, 12.95);
  vLine(0.95, 9.6, 15.95);
  hLine(3.0, 14.0, 3.0, YELLOW_LINE);
  vLine(3.0, 11.0, 3.0, YELLOW_LINE);
  hLine(3.0, 11.6, 11.0, YELLOW_LINE);
  vLine(3.0, 9.6, 14.0, YELLOW_LINE);
  // 출발 across the south lane, the way west; 종료 across the east lane.
  stripe(g, 0.3, 1.9, at(11.3), at(12.0));
  groundWords(g, '출발', 1.0, at(10.4), at(12.0), Math.PI / 2);
  stripe(g, 1.9, 0.3, at(15.0), at(9.3));
  groundWords(g, '종료', 1.0, at(15.0), at(8.6));
  laneArrow(g, at(7.5), at(12.0), Math.PI / 2);
  laneArrow(g, at(2.0), at(10.0), 0);
  laneArrow(g, at(5.5), at(2.0), -Math.PI / 2);
  laneArrow(g, at(15.0), at(3.6), Math.PI);
  // The 가속 구간 along the north lane: its start and end lines, the words, 20km/h.
  stripe(g, 0.12, 1.9, at(7.0), at(2.0), YELLOW_LINE);
  stripe(g, 0.12, 1.9, at(12.5), at(2.0), YELLOW_LINE);
  groundWords(g, '가속 구간', 1.8, at(9.7), at(2.0), -Math.PI / 2);
  groundWords(g, '20km/h 이상', 1.4, at(11.4), at(2.0), -Math.PI / 2);
  // The crossing at the signal on the east lane: the stop line, the crosswalk.
  stripe(g, 1.9, 0.18, at(15.0), at(6.3));
  for (let i = 0; i < 5; i++) stripe(g, 1.9, 0.18, at(15.0), at(6.8 + i * 0.36));
  groundWords(g, '신호 교차로', 1.4, at(15.0), at(5.5));
}

/** Held by the corner tile (0, 0): a lot point (x, y) is (x - 0.5, y - 0.5) from its middle. */
function yardFence(g: THREE.Group) {
  const at = (v: number) => v - 0.5;
  const MESH = new THREE.MeshToonMaterial({ color: '#6f8f7a', transparent: true, opacity: 0.35, depthWrite: false });
  const run = (x0: number, z0: number, x1: number, z1: number) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const along = z0 === z1;
    const n = Math.max(1, Math.round(len / 2));
    for (let i = 0; i <= n; i++) part(g, cyl(0.04, 0.04, 1.8, 8), '#5f7d6a', x0 + ((x1 - x0) * i) / n, 0.9, z0 + ((z1 - z0) * i) / n, { outline: false });
    for (const y of [0.1, 1.75]) part(g, along ? box(len, 0.035, 0.035) : box(0.035, 0.035, len), '#5f7d6a', (x0 + x1) / 2, y, (z0 + z1) / 2, { outline: false });
    const mesh = new THREE.Mesh(along ? box(len, 1.62, 0.01) : box(0.01, 1.62, len), MESH);
    mesh.userData.ownMaterial = true;
    mesh.position.set((x0 + x1) / 2, 0.92, (z0 + z1) / 2);
    mesh.renderOrder = 2;
    g.add(mesh);
  };
  run(at(0.05), at(0.05), at(17), at(0.05));
  run(at(0.05), at(0.05), at(0.05), at(14.9));
  run(at(0.05), at(14.9), at(11.9), at(14.9));
  // The gatepost and the school's name facing the street.
  part(g, rbox(0.3, 2.2, 0.3, 0.04), '#eceff1', at(11.9), 1.1, at(14.9));
  part(g, rbox(2.6, 0.5, 0.04, 0.01), '#f9a825', at(7), 1.35, at(14.9) + 0.05);
  label(g, SCHOOL, 2.5, 0.42, at(7), 1.35, at(14.9) + 0.075, '#f9a825', '#1b1b1b');
}

function hill(g: THREE.Group, W: number, D: number) {
  const h = 0.45;
  const run = 1.0;
  const top = D - 2 * run;
  const prof = new THREE.Shape();
  prof.moveTo(-D / 2, 0);
  prof.lineTo(-D / 2 + run, h);
  prof.lineTo(-D / 2 + run + top, h);
  prof.lineTo(D / 2, 0);
  prof.closePath();
  const depth = W - 0.1;
  const geom = new THREE.ExtrudeGeometry(prof, { depth, bevelEnabled: false });
  const m = new THREE.Mesh(geom, new THREE.MeshToonMaterial({ color: '#8f9297' }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.rotation.y = Math.PI / 2;
  m.position.set(-depth / 2, 0, 0);
  m.castShadow = m.receiveShadow = true;
  g.add(m);
  // The stop line on the top, the striped edges along both sides.
  part(g, box(depth - 0.1, 0.006, 0.14), PAINT, 0, h + 0.004, 0, FLATLINE);
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) part(g, box(0.04, 0.006, 0.22), i % 2 ? '#212121' : YELLOW_LINE, sx * (depth / 2 - 0.06), h + 0.004, -top / 2 + 0.14 + i * 0.24, FLATLINE);
  // Its sign on a post at the foot.
  part(g, cyl(0.03, 0.03, 1.5, 8), STEEL, W / 2 - 0.08, 0.75, D / 2 - 0.15);
  part(g, rbox(0.5, 0.36, 0.03, 0.01), '#1565c0', W / 2 - 0.08, 1.5, D / 2 - 0.13);
  label(g, '경사로', 0.44, 0.14, W / 2 - 0.08, 1.56, D / 2 - 0.11, '#1565c0', '#ffffff');
  label(g, '정지 후 출발', 0.44, 0.1, W / 2 - 0.08, 1.42, D / 2 - 0.11, '#1565c0', '#ffeb3b');
}

function waitShelter(g: THREE.Group, W: number, D: number) {
  const z0 = -D / 2 + 0.25;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.035, 0.035, 2.3, 8), STEEL, sx * (W / 2 - 0.15), 1.15, sz * (D / 2 - 0.12));
  part(g, rbox(W, 0.08, D + 0.1, 0.03), '#1565c0', 0, 2.33, 0);
  part(g, box(W, 0.18, 0.02), '#1565c0', 0, 2.22, D / 2 + 0.04, FLATLINE);
  label(g, '대기석 · 순서를 기다려 주세요', W - 0.4, 0.14, 0, 2.22, D / 2 + 0.06, '#1565c0', '#ffffff');
  part(g, rbox(W - 0.4, 0.06, 0.4, 0.02), '#90a4ae', 0, 0.45, z0 + 0.1);
  part(g, rbox(W - 0.4, 0.4, 0.05, 0.02), '#90a4ae', 0, 0.7, z0 - 0.1);
  for (const x of [-(W / 2 - 0.4), 0, W / 2 - 0.4]) part(g, box(0.05, 0.42, 0.35), BLACK, x, 0.21, z0 + 0.1);
}
