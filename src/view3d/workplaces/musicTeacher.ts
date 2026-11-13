import * as THREE from 'three';
import { LESSON_LINE, PIANO_DESK, PIANO_TURN, lessonBeat, metronomeSwing, pianoBeat, toolPhase, type Motion, type PianoKey } from '../activity';
import { DARK, marker, rod, shade, spot, type Builder, type Spot } from '../parts';
import { ball, box, cyl, part, rbox, textured } from '../toon';
import { BLACK, CHROME, glass, glowing, label, painted, picture, ring, text, type Paint } from './doctor';

/**
 * The music academy drawn as itself (2026-10-27 workplace pipeline, at the user's request: a lesson
 * should look like a lesson). The lesson grand is a baby grand in polished black with its lid up on
 * the stick, the gold plate and strings inside, 88 keys, the pedal lyre, a metronome ticking on the
 * desk ledge; the pupil on the bench in front (a child on a footstool for a lesson, a teenager in a
 * concert dress before a 콩쿠르), the teacher on a chair at the treble end — beating time with the
 * metronome turned to the pupil, pointing a bar out in the score, playing the passage over, turning
 * the page, clapping (activity.ts pianoBeat; the piano turns the teacher's spot, turns its page and
 * takes the pupil's hands off the keys to watch by the same clock). The theory desk is a small
 * two-sided desk, the pupil across it doing their 이론 workbook. And what the academy was missing
 * (workFurniture/musicTeacher.ts): the practice rooms, the 오선 whiteboard, the conductor's stand
 * with its metronome, the rental-instrument wall, the 콩쿠르 case and the recital corner.
 */

const WALNUT = '#5d4037';
const BIRCH = '#e6d3b3';
const OAK = '#b98d5c';
const LACQUER = '#1b1b20';
const GOLD = '#d4af37';
const BRASS_C = '#c99a3e';
const VELVET = '#8e2430';
const PAPER = '#fbf8f0';
const SKIN = '#f6d5bd';
const INKC = '#263238';

// ---------------------------------------------------------------------------------------------
// Small helpers.

/** Shapes made once (never disposed). */
const shapes = new Map<string, THREE.BufferGeometry>();
function shape(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let s = shapes.get(key);
  if (!s) shapes.set(key, (s = make()));
  return s;
}
const UNIT = shape('unit', () => new THREE.CylinderGeometry(1, 1, 1, 8));
const UPV = new THREE.Vector3(0, 1, 0);
const tmpD = new THREE.Vector3();
/** A rod of unit length stretched between two points every frame (an arm, a string). */
function span(g: THREE.Object3D, r: number, color: string): THREE.Mesh {
  const m = part(g, UNIT, color, 0, 0, 0, { outline: false });
  m.scale.set(r, 1, r);
  return m;
}
function stretch(m: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3) {
  tmpD.subVectors(b, a);
  const len = tmpD.length();
  m.position.addVectors(a, b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(UPV, tmpD.divideScalar(len || 1));
  m.scale.y = len;
}
/** When a spot was last posed at (activity.ts spotPose marks it). */
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
/** The spot of these posed at most lately. */
const latest = (...s: Spot[]) => s.reduce((a, b) => (posedAt(b) > posedAt(a) ? b : a));
const tmpW = new THREE.Vector3();
const phaseOf = (s: Spot) => toolPhase(s.at.getWorldPosition(tmpW));

function at(g: THREE.Object3D, how: Spot['how'], x: number, y: number, z: number, yaw: number, motion: Motion, work?: THREE.Object3D): Spot {
  const s = spot(g, how, x, y, z, yaw, how === 'sit' ? y : undefined);
  s.motion = motion;
  if (work) s.work = work;
  return s;
}

/** Five staff lines from x0 to x1 about yc, `sp` apart. */
function staff(c: CanvasRenderingContext2D, x0: number, x1: number, yc: number, sp: number, color: string, lw = 1.5) {
  c.strokeStyle = color;
  c.lineWidth = lw;
  c.beginPath();
  for (let i = -2; i <= 2; i++) {
    c.moveTo(x0, yc + i * sp);
    c.lineTo(x1, yc + i * sp);
  }
  c.stroke();
}
/** A note: its head at x, `step` half-spaces up from the staff's middle line, a stem, maybe hollow, maybe a flag. */
function note(c: CanvasRenderingContext2D, x: number, yc: number, sp: number, step: number, color: string, kind: 'q' | 'h' | 'w' | 'e' = 'q') {
  const y = yc - (step * sp) / 2;
  c.save();
  c.translate(x, y);
  c.rotate(-0.35);
  c.beginPath();
  c.ellipse(0, 0, sp * 0.62, sp * 0.44, 0, 0, Math.PI * 2);
  c.restore();
  c.fillStyle = color;
  c.strokeStyle = color;
  c.lineWidth = Math.max(1, sp * 0.16);
  if (kind === 'q' || kind === 'e') c.fill();
  else c.stroke();
  // Ledger lines below or above the staff.
  for (let s = -6; s >= step; s -= 2) {
    c.beginPath();
    c.moveTo(x - sp, yc + (3 * sp) - ((s + 6) * sp) / 2);
    c.lineTo(x + sp, yc + (3 * sp) - ((s + 6) * sp) / 2);
    c.stroke();
  }
  if (kind === 'w') return;
  const up = step < 0;
  const sx = up ? x + sp * 0.55 : x - sp * 0.55;
  const sy = up ? y - sp * 3.3 : y + sp * 3.3;
  c.beginPath();
  c.moveTo(sx, y);
  c.lineTo(sx, sy);
  c.stroke();
  if (kind === 'e') {
    c.beginPath();
    c.moveTo(sx, sy);
    c.quadraticCurveTo(sx + sp * 1.1, sy + (up ? sp : -sp) * 1.2, sx + sp * 0.8, sy + (up ? sp : -sp) * 2.4);
    c.stroke();
  }
}
/** A treble clef, roughly, its curl round the G line. */
function clef(c: CanvasRenderingContext2D, x: number, yc: number, sp: number, color: string) {
  c.font = `${Math.round(sp * 7)}px serif`;
  c.fillStyle = color;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('𝄞', x, yc + sp * 0.4);
}

/** The keys from above, white keys with their gaps (and the black keys too, for an upright seen small). */
const keysTop = (blacks: boolean): THREE.Texture =>
  painted(`mtKeys${blacks}`, 1024, 64, (c) => {
    c.fillStyle = '#fbfaf6';
    c.fillRect(0, 0, 1024, 64);
    const g = c.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, 'rgba(0,0,0,0.12)');
    g.addColorStop(0.3, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 1024, 64);
    const wk = 1024 / 52;
    c.fillStyle = '#9e9e9e';
    for (let i = 1; i < 52; i++) c.fillRect(Math.round(i * wk), 0, 1.4, 64);
    if (blacks) {
      c.fillStyle = '#151515';
      for (let i = 0; i < 51; i++) if ([0, 2, 3, 5, 6].includes(i % 7)) c.fillRect((i + 1) * wk - wk * 0.3, 0, wk * 0.6, 38);
    }
  });
/** Black keys over a white keyboard `w` wide centred at x, its top at y, the back at zb. */
function blackKeys(g: THREE.Object3D, x: number, w: number, y: number, zb: number) {
  const wk = w / 52;
  for (let i = 0; i < 51; i++) if ([0, 2, 3, 5, 6].includes(i % 7)) part(g, box(wk * 0.55, 0.014, 0.09), '#141416', x - w / 2 + (i + 1) * wk, y + 0.007, zb + 0.045, { outline: false });
}

/** A pyramid metronome with its pendulum (returned, to swing); built facing +z. */
function metronome(g: THREE.Object3D, x: number, y: number, z: number, s = 1): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.scale.setScalar(s);
  g.add(m);
  part(m, cyl(0.025, 0.058, 0.2, 4), WALNUT, 0, 0.1, 0, { ry: Math.PI / 4 });
  part(m, box(0.05, 0.13, 0.004), '#efe2c4', 0, 0.11, 0.032, { rx: -0.14, outline: false });
  const arm = new THREE.Group();
  arm.position.set(0, 0.035, 0.04);
  m.add(arm);
  part(arm, cyl(0.003, 0.003, 0.15, 6), CHROME, 0, 0.075, 0, { outline: false });
  part(arm, rbox(0.022, 0.018, 0.012, 0.004), BRASS_C, 0, 0.11, 0, { outline: false });
  part(m, cyl(0.006, 0.006, 0.02, 8), BRASS_C, 0.05, 0.05, 0, { rz: Math.PI / 2, outline: false });
  return arm;
}

// ---------------------------------------------------------------------------------------------
// A pupil, drawn while a lesson's on (the real clients wait on the chairs; this is who's being taught).

interface Look {
  shirt: string;
  legs: string;
  hair: string;
  shoes: string;
  skirt?: string;
  long?: boolean;
  ribbon?: string;
}
interface Pupil {
  root: THREE.Group;
  head: THREE.Group;
  /** Where the hands go, in the pupil's own frame (facing +z, the seat's top at 0). */
  l: THREE.Vector3;
  r: THREE.Vector3;
  update: () => void;
}
/** A pupil sat on a seat at (x, y, z) facing `yaw`, `k` their size (1 a child of eight), the soles `sole` below the seat. */
function seatedPupil(parent: THREE.Object3D, x: number, y: number, z: number, yaw: number, k: number, look: Look, sole: number): Pupil {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = yaw;
  parent.add(root);
  part(root, rbox(0.25 * k, 0.11 * k, 0.24 * k, 0.04 * k), look.legs, 0, 0.055 * k, -0.01 * k);
  part(root, rbox(0.25 * k, 0.33 * k, 0.16 * k, 0.06 * k), look.shirt, 0, 0.27 * k, -0.03 * k, { rx: 0.1 });
  part(root, cyl(0.035 * k, 0.04 * k, 0.08 * k, 10), SKIN, 0, 0.45 * k, -0.01 * k, { outline: false });
  for (const sx of [-1, 1]) {
    const hip = new THREE.Vector3(sx * 0.065 * k, 0.05 * k, 0);
    const knee = new THREE.Vector3(sx * 0.065 * k, 0.06 * k, 0.29 * k);
    const ankle = new THREE.Vector3(sx * 0.065 * k, sole + 0.05 * k, 0.31 * k);
    rod(root, hip, knee, 0.05 * k, look.legs);
    rod(root, knee, ankle, 0.038 * k, look.skirt ? SKIN : look.legs);
    part(root, rbox(0.075 * k, 0.06 * k, 0.14 * k, 0.025 * k), look.shoes, sx * 0.065 * k, sole + 0.03 * k, 0.34 * k);
  }
  if (look.skirt) part(root, rbox(0.31 * k, 0.08 * k, 0.32 * k, 0.035 * k), look.skirt, 0, 0.08 * k, 0.08 * k);
  const head = new THREE.Group();
  head.position.set(0, 0.56 * k, 0);
  root.add(head);
  part(head, ball(0.1 * k), SKIN, 0, 0, 0);
  part(head, ball(0.106 * k), look.hair, 0, 0.026 * k, -0.024 * k);
  part(head, rbox(0.17 * k, 0.05 * k, 0.05 * k, 0.02 * k), look.hair, 0, 0.064 * k, 0.066 * k, { rx: -0.3 });
  for (const sx of [-1, 1]) part(head, ball(0.012 * k), '#2b2b30', sx * 0.034 * k, 0, 0.094 * k, { outline: false });
  part(head, ball(0.012 * k), '#f4a6a6', 0, -0.045 * k, 0.09 * k, { outline: false }).scale.set(1.4, 0.5, 0.5);
  if (look.long) part(head, rbox(0.19 * k, 0.26 * k, 0.07 * k, 0.03 * k), look.hair, 0, -0.08 * k, -0.065 * k);
  if (look.ribbon) for (const sx of [-1, 1]) part(head, ball(0.025 * k), look.ribbon, sx * 0.03 * k, 0.07 * k, -0.1 * k).scale.set(1.3, 0.8, 0.6);
  const L = 0.235 * k;
  const arms = [1, -1].map((side) => ({
    side,
    sh: new THREE.Vector3(side * 0.135 * k, 0.4 * k, -0.03 * k),
    up: span(root, 0.034 * k, look.shirt),
    fore: span(root, 0.027 * k, SKIN),
    hand: part(root, ball(0.03 * k), SKIN, 0, 0, 0, { outline: false }),
  }));
  const l = new THREE.Vector3(0.1 * k, 0.1 * k, 0.2 * k);
  const r = new THREE.Vector3(-0.1 * k, 0.1 * k, 0.2 * k);
  const d = new THREE.Vector3();
  const hand = new THREE.Vector3();
  const pole = new THREE.Vector3();
  const elbow = new THREE.Vector3();
  const update = () => {
    for (const a of arms) {
      d.subVectors(a.side > 0 ? l : r, a.sh);
      let len = d.length();
      const max = 2 * L * 0.98;
      if (len > max) {
        d.multiplyScalar(max / len);
        len = max;
      }
      hand.copy(a.sh).add(d);
      d.divideScalar(len || 1);
      pole.set(a.side * 0.45, -1, -0.25);
      pole.addScaledVector(d, -pole.dot(d)).normalize();
      elbow.copy(a.sh).addScaledVector(d, len / 2).addScaledVector(pole, Math.sqrt(Math.max(0, L * L - (len / 2) ** 2)));
      stretch(a.up, a.sh, elbow);
      stretch(a.fore, elbow, hand);
      a.hand.position.copy(hand);
    }
  };
  update();
  return { root, head, l, r, update };
}
const wave = (t: number, hz: number, ph = 0) => Math.sin((t * hz + ph) * Math.PI * 2);
/** A pupil playing: the fingers going on the keys `y` up and `z` out from the seat (in their frame). */
function playing(p: Pupil, t: number, y: number, z: number, k: number, ph = 0) {
  p.l.set((0.13 + 0.04 * wave(t, 0.4, ph)) * k, y + 0.012 * Math.max(0, wave(t, 3.6, ph)), z);
  p.r.set((-0.12 + 0.05 * wave(t, 0.33, ph + 0.3)) * k, y + 0.012 * Math.max(0, wave(t, 3.6, ph + 0.5)), z);
}

// ---------------------------------------------------------------------------------------------
// The grand.

/** A baby grand's outline from above: x across, s back from its front (the straight bass side at -x, the bentside curving in to the tail). */
function grandOutline(p: THREE.Path, f = 1) {
  const cx = -0.05;
  const cs = 0.43;
  const q = (x: number, s: number): [number, number] => [cx + (x - cx) * f, cs + (s - cs) * f];
  p.moveTo(...q(-0.74, -0.13));
  p.lineTo(...q(0.74, -0.13));
  p.lineTo(...q(0.74, 0.08));
  p.bezierCurveTo(...q(0.74, 0.42), ...q(0.22, 0.4), ...q(0.1, 0.68));
  p.bezierCurveTo(...q(0.0, 0.9), ...q(-0.25, 0.99), ...q(-0.55, 0.99));
  p.quadraticCurveTo(...q(-0.74, 0.99), ...q(-0.74, 0.82));
  p.lineTo(...q(-0.74, -0.13));
}
const outlineShape = (f = 1) => {
  const s = new THREE.Shape();
  grandOutline(s, f);
  return s;
};
/** The case: the outline stood up 0.34 (the plan's s becomes -z). */
const CASE = shape('mtCase', () => new THREE.ExtrudeGeometry(outlineShape(), { depth: 0.34, bevelEnabled: false, curveSegments: 14 }).rotateX(-Math.PI / 2));
/** The rim's lip round the open top. */
const RIM = shape('mtRim', () => {
  const s = outlineShape();
  const hole = new THREE.Path();
  grandOutline(hole, 0.94);
  s.holes.push(hole);
  return new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: false, curveSegments: 14 }).rotateX(-Math.PI / 2);
});
/** The lid, hinged along the straight side (x 0 at the hinge). */
const LID = shape('mtLid', () => new THREE.ExtrudeGeometry(outlineShape(), { depth: 0.018, bevelEnabled: false, curveSegments: 14 }).rotateX(-Math.PI / 2).translate(0.74, 0, 0));
/** The plate and strings inside, its texture laid across the outline. */
const PLATE = shape('mtPlate', () => {
  const geom = new THREE.ShapeGeometry(outlineShape(0.94), 14);
  geom.computeBoundingBox();
  const bb = geom.boundingBox!;
  const pos = geom.attributes.position;
  const uv = geom.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) - bb.min.x) / (bb.max.x - bb.min.x), 1 - (pos.getY(i) - bb.min.y) / (bb.max.y - bb.min.y));
  return geom.rotateX(-Math.PI / 2);
});
const paintPlate: Paint = (c) => {
  // The spruce soundboard, the gold plate over it with its round holes, the strings to the tail, the dampers at the front.
  c.fillStyle = '#e8c88f';
  c.fillRect(0, 0, 512, 512);
  c.fillStyle = '#d2a845';
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(512, 0);
  c.lineTo(512, 120);
  c.quadraticCurveTo(300, 260, 230, 512);
  c.lineTo(0, 512);
  c.closePath();
  c.fill();
  c.fillStyle = '#e8c88f';
  for (const [x, y, r] of [[120, 150, 36], [250, 120, 30], [150, 300, 40], [90, 420, 28], [360, 70, 24]]) {
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }
  c.strokeStyle = '#8d6e3f';
  c.lineWidth = 3;
  c.stroke();
  // Strings, front to back.
  for (let i = 0; i < 90; i++) {
    const x = 8 + i * 5.6;
    c.strokeStyle = i < 26 ? '#b0703a' : '#d9dde0';
    c.lineWidth = i < 26 ? 2.4 : 1.2;
    c.beginPath();
    c.moveTo(x, 40);
    c.lineTo(x * 0.92, 500);
    c.stroke();
  }
  // The dampers' felts in a row behind the keys, the tuning pins.
  c.fillStyle = '#3e3a36';
  for (let i = 0; i < 64; i++) c.fillRect(8 + i * 7.8, 18, 6, 16);
  c.fillStyle = '#cfd5da';
  for (let i = 0; i < 100; i++) c.fillRect(6 + i * 5, 4 + (i % 2) * 5, 3, 3);
};
/** A page of a piano book: the title, five lines of music. */
function paintScore(title: string, seed: number): Paint {
  return (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 256, 352);
    if (title) text(c, title, 128, 26, 17, INKC, 'center');
    const top = title ? 70 : 40;
    for (let r = 0; r < 5; r++) {
      const yc = top + r * 58;
      staff(c, 14, 242, yc, 5, '#5f6a70', 1);
      for (let i = 0; i < 9; i++) {
        const step = ((i * 3 + r * 5 + seed) % 9) - 4;
        note(c, 30 + i * 24, yc, 5, step, '#263238', (i + r + seed) % 4 === 3 ? 'h' : 'q');
      }
      for (const bx of [128, 242]) {
        c.fillStyle = '#263238';
        c.fillRect(bx, yc - 10, 1.2, 20);
      }
    }
    // The teacher's pencil: a circle round a bar, a fingering, a ✓.
    c.strokeStyle = '#d32f2f';
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(90 + seed * 20, top + 58, 34, 16, 0, 0, Math.PI * 2);
    c.stroke();
    text(c, '3', 66 + seed * 20, top + 34, 13, '#d32f2f', 'center');
  };
}

/**
 * The lesson grand (2 × 2): a baby grand in black lacquer — the case with its bentside, the gold
 * plate and strings showing under the lid propped open on its stick, 88 keys between the cheeks, the
 * fallboard with the maker's name, the music desk with the book open (체르니 30) and a metronome on
 * the ledge, three legs on brass casters, the pedal lyre. In front: the pupil's adjustable bench (a
 * footstool under a child's feet) and the teacher's chair at the treble end, angled in. While a
 * lesson's on a pupil sits at the keys — practising, then hands in the lap watching the passage
 * played over; a teenager in a concert dress for a 콩쿠르 lesson.
 */
const lessonPiano: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  part(g, CASE, LACQUER, 0, 0.6, 0);
  part(g, RIM, LACQUER, 0, 0.94, 0);
  const plate = new THREE.Mesh(PLATE, textured(painted('mtPlate', 512, 512, paintPlate)));
  plate.userData.ownMaterial = true;
  plate.position.y = 0.945;
  g.add(plate);
  // The lid up on its stick.
  const hinge = new THREE.Group();
  hinge.position.set(-0.74, 0.98, 0);
  hinge.rotation.z = 0.5;
  g.add(hinge);
  part(hinge, LID, LACQUER, 0, 0, 0);
  rod(g, new THREE.Vector3(0.66, 0.98, -0.2), new THREE.Vector3(0.436, 1.62, -0.2), 0.011, LACQUER);
  // Legs, casters, the pedal lyre.
  for (const [x, z] of [[-0.62, 0.02], [0.62, 0.02], [-0.42, -0.84]]) {
    part(g, cyl(0.05, 0.036, 0.56, 12), LACQUER, x, 0.32, z);
    part(g, cyl(0.04, 0.04, 0.05, 12), BRASS_C, x, 0.025, z, { outline: false });
  }
  for (const sx of [-1, 1]) rod(g, new THREE.Vector3(sx * 0.06, 0.6, 0.1), new THREE.Vector3(sx * 0.05, 0.09, 0.14), 0.018, LACQUER);
  part(g, rbox(0.26, 0.05, 0.09, 0.02), LACQUER, 0, 0.06, 0.15);
  for (const x of [-0.065, 0, 0.065]) part(g, rbox(0.032, 0.012, 0.1, 0.005), BRASS_C, x, 0.06, 0.23, { rx: 0.12, outline: false });
  // The keyboard between its cheeks.
  part(g, rbox(1.42, 0.09, 0.21, 0.01), LACQUER, 0, 0.655, 0.225);
  for (const sx of [-1, 1]) part(g, rbox(0.075, 0.18, 0.21, 0.02), LACQUER, sx * 0.735, 0.7, 0.225);
  part(g, box(1.42, 0.05, 0.022), LACQUER, 0, 0.705, 0.322);
  part(g, box(1.24, 0.022, 0.15), '#fbfaf6', 0, 0.729, 0.235, { outline: false });
  picture(g, keysTop(false), 1.24, 0.15, 0, 0.7405, 0.235, '#ffffff', 0, -Math.PI / 2);
  blackKeys(g, 0, 1.24, 0.74, 0.16);
  part(g, box(1.3, 0.075, 0.02), LACQUER, 0, 0.785, 0.15, { rx: -0.3 });
  label(g, '한음 PIANO', 0.16, 0.025, 0, 0.79, 0.163, '#1b1b20', GOLD).rotation.x = -0.3;
  // The music desk and the book open on it; the turning page; the ledge with the metronome and a pencil.
  const work = marker(g, 0.36, 0.745, 0.24);
  const sc = new THREE.Vector3(0.36 - PIANO_DESK.side, 0.745 + PIANO_DESK.up, 0.24 - PIANO_DESK.ahead);
  const desk = new THREE.Group();
  desk.position.copy(sc);
  desk.rotation.x = -0.22;
  g.add(desk);
  part(desk, rbox(0.8, 0.3, 0.02, 0.008), LACQUER, 0, -0.01, -0.016);
  part(g, box(0.84, 0.02, 0.06), LACQUER, 0, sc.y - 0.165, sc.z + 0.03);
  picture(desk, painted('mtScoreL', 256, 352, paintScore('체르니 30 · 12번', 1)), 0.2, 0.275, -0.101, 0, 0, '#ffffff', 0.06);
  picture(desk, painted('mtScoreR', 256, 352, paintScore('', 2)), 0.2, 0.275, 0.101, 0, 0, '#ffffff', -0.06);
  const turn = new THREE.Group();
  turn.position.z = 0.004;
  desk.add(turn);
  const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.275).translate(0.1, 0, 0), new THREE.MeshBasicMaterial({ map: painted('mtScoreT', 256, 352, paintScore('', 3)), side: THREE.DoubleSide }));
  leaf.userData.ownGeometry = leaf.userData.ownMaterial = true;
  turn.add(leaf);
  turn.visible = false;
  const tick = metronome(g, -0.36, sc.y - 0.155, sc.z + 0.03, 0.8);
  part(g, cyl(0.004, 0.004, 0.16, 6), '#fdd835', 0.25, sc.y - 0.148, sc.z + 0.035, { rz: Math.PI / 2, outline: false });
  // The pupil's bench: black leather on its frame, the height knobs; the footstool for small feet.
  const bx = -0.12;
  const bz = 0.68;
  part(g, rbox(0.6, 0.06, 0.32, 0.02), '#1f1f24', bx, 0.47, bz);
  part(g, box(0.54, 0.06, 0.26), LACQUER, bx, 0.41, bz, { outline: false });
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) part(g, rbox(0.04, 0.38, 0.04, 0.01), LACQUER, bx + sx * 0.26, 0.19, bz + sz * 0.12);
    part(g, cyl(0.025, 0.025, 0.03, 12), '#9e9e9e', bx + sx * 0.32, 0.41, bz, { rz: Math.PI / 2, outline: false });
  }
  // The teacher's chair at the treble end, angled in to the pupil.
  const tx = 0.62;
  const tz = 0.8;
  const chair = new THREE.Group();
  chair.position.set(tx, 0, tz);
  chair.rotation.y = Math.PI + 0.35;
  g.add(chair);
  part(chair, rbox(0.42, 0.05, 0.4, 0.02), WALNUT, 0, 0.44, 0);
  part(chair, rbox(0.38, 0.03, 0.36, 0.02), '#7b1fa2', 0, 0.475, 0.01);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(chair, rbox(0.035, 0.42, 0.035, 0.008), WALNUT, sx * 0.17, 0.21, sz * 0.17);
  for (const sx of [-1, 1]) part(chair, rbox(0.035, 0.45, 0.035, 0.008), WALNUT, sx * 0.17, 0.68, -0.18);
  part(chair, rbox(0.4, 0.14, 0.03, 0.01), WALNUT, 0, 0.82, -0.18);
  // The pupils, shown while the lesson's on.
  const use = new THREE.Group();
  g.add(use);
  out.inUse = use;
  const small = new THREE.Group();
  use.add(small);
  part(small, rbox(0.36, 0.04, 0.26, 0.01), OAK, bx, 0.18, 0.4);
  for (const sx of [-1, 1]) part(small, box(0.03, 0.16, 0.24), shade(OAK, 0.85), bx + sx * 0.16, 0.08, 0.4, { outline: false });
  const child = seatedPupil(small, bx, 0.5, bz, Math.PI, 1, { shirt: '#f8bbd0', legs: '#5c6bc0', hair: '#3e2723', shoes: '#ec407a', ribbon: '#e91e63' }, -0.3);
  part(small, rbox(0.15, 0.015, 0.2, 0.004), '#ffcc80', bx - 0.38, 0.508, bz, { outline: false });
  const big = new THREE.Group();
  use.add(big);
  const teen = seatedPupil(big, bx, 0.5, bz, Math.PI, 1.15, { shirt: '#1a237e', legs: '#1a237e', hair: '#212121', shoes: '#111111', skirt: '#283593', long: true, ribbon: '#fafafa' }, -0.5);
  // Sat beside the pupil, turned to them by the lesson; standing by the bentside planning a recital.
  const keys = (motion: Motion) => {
    const s = at(g, 'sit', tx, 0.48, tz, Math.PI, motion, work);
    return s;
  };
  const lesson = keys('pianoLesson');
  const coach = keys('pianoCoach');
  const plan = at(g, 'stand', 0.92, 0, -0.32, -Math.PI / 2, 'meeting', marker(g, 0.55, 0.99, -0.3));
  out.spots = { '*': lesson, giveLesson: lesson, competitionLesson: coach, musicTeacher_recitalPlan: plan };
  out.seat = marker(g, tx, 0.48, tz);
  out.work = work;
  const watchOf = (key: PianoKey) => (key === 'demo' || key === 'point' || key === 'clap' ? 1 : 0);
  out.animate = (t) => {
    const now = latest(lesson, coach, plan);
    const teaching = now !== plan;
    const show = now === coach ? 'pianoCoach' : 'pianoLesson';
    small.visible = teaching && show === 'pianoLesson';
    big.visible = teaching && show === 'pianoCoach';
    tick.rotation.z = metronomeSwing(t);
    const beat = pianoBeat(show, t, phaseOf(lesson));
    for (const s of [lesson, coach]) s.at.rotation.y = Math.PI + beat.turn * PIANO_TURN;
    turn.visible = teaching && beat.page > 0.01 && beat.page < 0.99;
    turn.rotation.y = -Math.PI * beat.page;
    const w = watchOf(beat.from) * (1 - beat.e) + watchOf(beat.to) * beat.e;
    const p = show === 'pianoLesson' ? child : teen;
    const k = show === 'pianoLesson' ? 1 : 1.15;
    playing(p, t, 0.245, 0.4, k);
    p.l.lerp(tmpL.set(0.09 * k, 0.1 * k, 0.2 * k), w);
    p.r.lerp(tmpR.set(-0.09 * k, 0.1 * k, 0.2 * k), w);
    p.update();
    p.head.rotation.set(0.38 * (1 - 0.5 * w), -0.55 * w, 0);
  };
};
const tmpL = new THREE.Vector3();
const tmpR = new THREE.Vector3();

// ---------------------------------------------------------------------------------------------
// The theory desk.

const paintWorkbook: Paint = (c) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 512, 352);
  c.fillStyle = '#cfc6b4';
  c.fillRect(254, 0, 4, 352);
  for (const [x0, title] of [[0, '음악 이론 2 · 12쪽'], [256, '박자 세기']] as Array<[number, string]>) {
    text(c, title, x0 + 128, 24, 18, '#6a1b9a', 'center');
    for (let r = 0; r < 4; r++) {
      const yc = 78 + r * 72;
      staff(c, x0 + 16, x0 + 240, yc, 6, '#78909c', 1.2);
      for (let i = 0; i < 5; i++) {
        note(c, x0 + 40 + i * 44, yc, 6, ((i * 2 + r * 3 + x0) % 9) - 4, '#37474f', (i + r) % 3 === 2 ? 'h' : 'q');
        // The answer boxes under the notes, some filled in pencil.
        c.strokeStyle = '#90a4ae';
        c.lineWidth = 1;
        c.strokeRect(x0 + 30 + i * 44, yc + 24, 22, 16);
        if (r < 2 || (r === 2 && i < 3)) text(c, ['도', '레', '미', '파', '솔', '라', '시'][(i + r * 2) % 7], x0 + 41 + i * 44, yc + 33, 12, '#455a64', 'center', false);
      }
    }
  }
  c.strokeStyle = '#e53935';
  c.lineWidth = 3;
  c.beginPath();
  c.arc(60, 330, 14, 0, Math.PI * 2);
  c.stroke();
  text(c, '참 잘했어요', 120, 330, 14, '#e53935', 'center');
};
const paintRoster: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 192, 256);
  text(c, '반 편성표', 96, 20, 18, '#4a148c', 'center');
  const rows: Array<[string, string]> = [['월수 3시', '바이엘 반'], ['월수 4시', '체르니 100'], ['화목 3시', '체르니 30'], ['화목 5시', '소나티네'], ['토 10시', '콩쿠르 반']];
  rows.forEach(([a, b], i) => {
    const y = 52 + i * 38;
    c.fillStyle = i % 2 ? '#f3e5f5' : '#ffffff';
    c.fillRect(8, y - 16, 176, 32);
    text(c, a, 14, y, 13, '#37474f', 'left');
    text(c, b, 90, y, 13, '#6a1b9a', 'left', false);
  });
  text(c, '수강료 ₩180,000', 96, 240, 13, '#2e7d32', 'center');
};
/** A wooden chair for a desk (built facing +z, its seat `h` up). */
function smallChair(g: THREE.Object3D, x: number, z: number, yaw: number, h: number, color: string) {
  const c = new THREE.Group();
  c.position.set(x, 0, z);
  c.rotation.y = yaw;
  g.add(c);
  part(c, rbox(0.38, 0.04, 0.36, 0.015), color, 0, h - 0.02, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(c, rbox(0.03, h - 0.04, 0.03, 0.008), shade(color, 0.8), sx * 0.16, (h - 0.04) / 2, sz * 0.15);
  for (const sx of [-1, 1]) part(c, rbox(0.03, 0.4, 0.03, 0.008), shade(color, 0.8), sx * 0.16, h + 0.2, -0.16);
  part(c, rbox(0.36, 0.14, 0.025, 0.01), color, 0, h + 0.32, -0.16);
}

/**
 * The theory desk (1 × 1): a small birch desk on walnut legs, a pupil's chair behind it and the
 * teacher's in front — the 이론 workbook open between them (staves, notes to name, the answers
 * pencilled in, a 참 잘했어요 stamp), note flash cards, a piano-key pencil case, an eraser; the 반
 * 편성표 on a clipboard at the teacher's right. While theory's taught the pupil sits across doing the
 * page, the teacher talking it through with a notebook; the timetable's planned sat writing on it.
 */
const theoryDesk: Builder = (g, _W, _D, c, _def, _ctx, out) => {
  const h = 0.72;
  const z = -0.05;
  part(g, rbox(0.8, 0.035, 0.5, 0.012), BIRCH, 0, h - 0.018, z);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, rbox(0.04, h - 0.035, 0.04, 0.008), c, sx * 0.36, (h - 0.035) / 2, z + sz * 0.21);
  part(g, box(0.72, 0.08, 0.02), shade(c, 0.9), 0, h - 0.08, z - 0.22, { outline: false });
  // The workbook, turned to the pupil.
  const book = picture(g, painted('mtWorkbook', 512, 352, paintWorkbook), 0.42, 0.29, 0, h + 0.004, z - 0.02, '#ffffff', Math.PI, -Math.PI / 2);
  book.rotation.set(-Math.PI / 2, 0, Math.PI);
  part(g, box(0.43, 0.006, 0.3), '#7e57c2', 0, h + 0.001, z - 0.02, { outline: false });
  // Flash cards, the pencil case, a pencil and an eraser.
  ['♩', '♪', '𝅗𝅥'].forEach((s, i) => label(g, s, 0.07, 0.1, -0.33 + i * 0.03, h + 0.003 + i * 0.002, z + 0.12 - i * 0.03, '#fff8e1', '#4a148c').rotation.set(-Math.PI / 2, 0, 0.2 * (i - 1)));
  part(g, rbox(0.2, 0.035, 0.06, 0.012), '#fafafa', -0.25, h + 0.018, z - 0.17);
  for (let i = 0; i < 4; i++) part(g, box(0.02, 0.004, 0.035), '#212121', -0.31 + i * 0.04, h + 0.037, z - 0.17, { outline: false });
  part(g, cyl(0.004, 0.004, 0.17, 6), '#fdd835', 0.05, h + 0.006, z + 0.14, { rz: Math.PI / 2, ry: 0.3, outline: false });
  part(g, rbox(0.045, 0.015, 0.025, 0.005), '#f48fb1', 0.12, h + 0.008, z + 0.17);
  // The clipboard with the class plan, at the teacher's right.
  part(g, rbox(0.2, 0.01, 0.27, 0.005), '#8d6e63', 0.28, h + 0.005, z + 0.06, { ry: 0.15 });
  const roster = picture(g, painted('mtRoster', 192, 256, paintRoster), 0.17, 0.23, 0.28, h + 0.012, z + 0.07, '#ffffff', 0, -Math.PI / 2);
  roster.rotation.set(-Math.PI / 2, 0, 0.15);
  part(g, box(0.07, 0.015, 0.02), CHROME, 0.27, h + 0.016, z - 0.06, { ry: 0.15, outline: false });
  // The chairs: the pupil's behind (facing the teacher), the teacher's in front.
  smallChair(g, 0, -0.36, 0, 0.47, '#ab47bc');
  smallChair(g, 0, 0.52, Math.PI, 0.46, OAK);
  // The pupil across, doing the page while it's taught.
  const use = new THREE.Group();
  g.add(use);
  out.inUse = use;
  const pupil = seatedPupil(use, 0, 0.49, -0.34, 0, 1, { shirt: '#81d4fa', legs: '#37474f', hair: '#4e342e', shoes: '#1e88e5' }, -0.45);
  const teachPt = marker(g, 0, h + 0.02, z - 0.02);
  const teach = at(g, 'sit', 0, 0.48, 0.52, Math.PI, 'meeting', teachPt);
  const plan = at(g, 'sit', 0, 0.48, 0.52, Math.PI, 'write', marker(g, 0.28, h + 0.02, z + 0.07));
  out.spots = { '*': teach, teachTheory: teach, musicTeacher_tuitionPlan: plan };
  out.seat = marker(g, 0, 0.48, 0.52);
  out.work = teachPt;
  out.animate = (t) => {
    pupil.root.visible = latest(teach, plan) === teach;
    const look = Math.max(0, wave(t, 0.09, 0.2)) ** 4;
    pupil.r.set(-0.05 + 0.03 * wave(t, 0.5), 0.245 + 0.004 * wave(t, 3), 0.27 + 0.01 * wave(t, 0.25));
    pupil.l.set(0.1, 0.235, 0.22);
    pupil.update();
    pupil.head.rotation.set(0.5 - 0.5 * look, 0.1 * wave(t, 0.1), 0);
  };
};

// ---------------------------------------------------------------------------------------------
// The practice room.

const paintFoam: Paint = (c) => {
  c.fillStyle = '#546e7a';
  c.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      const g = c.createRadialGradient(x * 32 + 16, y * 32 + 16, 2, x * 32 + 16, y * 32 + 16, 18);
      g.addColorStop(0, '#78909c');
      g.addColorStop(1, '#455a64');
      c.fillStyle = g;
      c.fillRect(x * 32 + 1, y * 32 + 1, 30, 30);
    }
};
const paintPracticeChart: Paint = (c) => {
  c.fillStyle = '#fffde7';
  c.fillRect(0, 0, 256, 192);
  text(c, '연습 체크 🍎', 128, 22, 20, '#c62828', 'center');
  const pieces = ['바이엘 78', '체르니 100-5', '하농 3번'];
  pieces.forEach((s, r) => {
    const y = 62 + r * 44;
    text(c, s, 10, y, 14, '#37474f', 'left');
    for (let i = 0; i < 10; i++) {
      c.beginPath();
      c.arc(108 + i * 14.5, y, 6, 0, Math.PI * 2);
      c.fillStyle = i < [10, 6, 3][r] ? '#e53935' : '#ffffff';
      c.fill();
      c.strokeStyle = '#8d6e63';
      c.lineWidth = 1;
      c.stroke();
    }
  });
  text(c, '10번 치면 사과 10개!', 128, 178, 13, '#6d4c41', 'center', false);
};

/**
 * A practice room (2 × 2): a little soundproofed room in pale panels, grey acoustic foam on the
 * inside walls, a wide window beside the door and a narrow one in it, a 연습 중 tag on the handle;
 * inside, an upright in walnut against the back with a book on its desk, a lamp and a metronome on
 * top, the 🍎 practice chart pinned over it (an apple coloured for every time through) and a stool.
 * The door swings open while it's used: the teacher looks in from the doorway with the notebook while
 * a child practises, or sits at the upright in an empty one to practise.
 */
const practiceRoom: Builder = (g, _W, _D, c, _def, ctx, out) => {
  const H = 1.95;
  const T = 0.05;
  const foam = painted('mtFoam', 256, 256, paintFoam);
  for (const sx of [-1, 1]) {
    part(g, rbox(T, H, 1.94, 0.01), c, sx * 0.97, H / 2, 0);
    picture(g, foam, 1.7, 0.9, sx * (0.97 - T / 2 - 0.004), 1.35, -0.05, '#ffffff', -sx * Math.PI / 2);
  }
  if (!ctx.againstWall) part(g, rbox(1.94, H, T, 0.01), c, 0, H / 2, -0.97);
  picture(g, foam, 1.8, 0.9, 0, 1.35, -0.94);
  part(g, box(1.88, 0.01, 1.88), '#8d8a9a', 0, 0.005, 0, { outline: false });
  // The front: a wall with a wide window on the left, the door on the right.
  const fz = 0.95;
  part(g, rbox(1.0, 0.85, T, 0.01), c, -0.47, 0.425, fz);
  part(g, rbox(1.0, 0.2, T, 0.01), c, -0.47, H - 0.1, fz);
  for (const x of [-0.95, 0.01]) part(g, rbox(0.06, H, T + 0.01, 0.01), shade(c, 0.85), x, H / 2, fz);
  part(g, rbox(0.06, H, T + 0.01, 0.01), shade(c, 0.85), 0.94, H / 2, fz);
  part(g, rbox(0.98, 0.04, T + 0.02, 0.01), shade(c, 0.85), -0.47, 0.86, fz);
  glass(g, box(0.92, 0.88, 0.01), -0.47, 1.31, fz);
  part(g, rbox(0.92, 0.1, T, 0.01), shade(c, 0.85), 0.47, H - 0.05, fz);
  label(g, '연습실', 0.3, 0.07, -0.47, H - 0.1, fz + 0.03, '#4a148c', '#ffffff');
  // The door, hung on the right, its narrow window.
  const hinge = new THREE.Group();
  hinge.position.set(0.9, 0, fz);
  hinge.userData.swing = 1;
  g.add(hinge);
  const leaf = new THREE.Group();
  leaf.position.x = -0.42;
  hinge.add(leaf);
  const dc = '#c9a77c';
  part(leaf, rbox(0.82, 1.0, 0.04, 0.01), dc, 0, 0.5, 0);
  part(leaf, rbox(0.82, 0.25, 0.04, 0.01), dc, 0, 1.725, 0);
  part(leaf, rbox(0.26, 0.6, 0.04, 0.01), dc, -0.28, 1.3, 0);
  part(leaf, rbox(0.38, 0.6, 0.04, 0.01), dc, 0.22, 1.3, 0);
  glass(leaf, box(0.18, 0.6, 0.01), -0.06, 1.3, 0);
  for (const s of [-1, 1]) {
    part(leaf, cyl(0.02, 0.02, 0.03, 10), CHROME, -0.34, 1.0, s * 0.03, { rx: Math.PI / 2, outline: false });
    part(leaf, rbox(0.12, 0.02, 0.02, 0.008), CHROME, -0.3, 1.0, s * 0.05, { outline: false });
  }
  label(leaf, '연습 중 ♪', 0.14, 0.06, -0.3, 0.9, 0.06, '#fff59d', '#c62828');
  rod(leaf, new THREE.Vector3(-0.36, 1.0, 0.05), new THREE.Vector3(-0.3, 0.93, 0.055), 0.002, '#5d4037');
  out.doors = [hinge];
  // The upright against the back.
  const ux = -0.15;
  const back = -0.92;
  part(g, rbox(1.36, 1.2, 0.36, 0.02), WALNUT, ux, 0.6, back + 0.18);
  part(g, rbox(1.36, 0.04, 0.38, 0.01), shade(WALNUT, 1.1), ux, 1.22, back + 0.19);
  part(g, rbox(1.3, 0.1, 0.22, 0.01), WALNUT, ux, 0.67, back + 0.47);
  for (const sx of [-1, 1]) {
    part(g, rbox(0.06, 0.16, 0.24, 0.01), WALNUT, ux + sx * 0.66, 0.7, back + 0.47);
    part(g, rbox(0.05, 0.62, 0.05, 0.01), WALNUT, ux + sx * 0.62, 0.31, back + 0.54);
  }
  part(g, box(1.22, 0.02, 0.14), '#fbfaf6', ux, 0.73, back + 0.5, { outline: false });
  picture(g, keysTop(true), 1.22, 0.14, ux, 0.7405, back + 0.5, '#ffffff', 0, -Math.PI / 2);
  part(g, box(1.24, 0.24, 0.02), shade(WALNUT, 0.85), ux, 0.92, back + 0.37, { rx: -0.1 });
  picture(g, painted('mtBeyer', 256, 352, paintScore('바이엘 78', 4)), 0.2, 0.27, ux, 0.98, back + 0.385, '#ffffff', 0, -0.1);
  for (const x of [ux - 0.6, ux + 0.6]) part(g, cyl(0.03, 0.03, 0.05, 10), BRASS_C, x, 0.025, back + 0.3, { outline: false });
  // On top: a lamp (lit while it's used), a metronome, a little cactus. The chart on the wall over it.
  part(g, cyl(0.06, 0.07, 0.03, 14), DARK, ux - 0.45, 1.255, back + 0.2);
  rod(g, new THREE.Vector3(ux - 0.45, 1.27, back + 0.2), new THREE.Vector3(ux - 0.4, 1.55, back + 0.28), 0.01, DARK);
  part(g, cyl(0.04, 0.09, 0.1, 14), '#ffb300', ux - 0.38, 1.52, back + 0.31, { rx: 0.4 });
  const lamp = glowing(g, cyl(0.075, 0.075, 0.005, 14), '#fff3c4', ux - 0.37, 1.47, back + 0.33, 0.4);
  const tick = metronome(g, ux + 0.25, 1.24, back + 0.2);
  part(g, cyl(0.04, 0.035, 0.06, 12), '#d7ccc8', ux + 0.5, 1.27, back + 0.2);
  part(g, cyl(0.022, 0.022, 0.07, 10), '#7cb342', ux + 0.5, 1.33, back + 0.2);
  picture(g, painted('mtApples', 256, 192, paintPracticeChart), 0.42, 0.315, ux, 1.65, -0.935);
  // The bench, a bag by the wall, a clock on the right wall.
  const bz = 0.06;
  part(g, rbox(0.6, 0.06, 0.32, 0.02), '#2b2b30', ux, 0.45, bz);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, rbox(0.035, 0.42, 0.035, 0.01), '#2b2b30', ux + sx * 0.26, 0.21, bz + sz * 0.12);
  part(g, rbox(0.26, 0.32, 0.14, 0.05), '#f06292', 0.75, 0.16, -0.35);
  part(g, rbox(0.2, 0.12, 0.03, 0.03), '#ec407a', 0.75, 0.14, -0.27);
  part(g, cyl(0.12, 0.12, 0.03, 24), '#fafafa', 0.93, 1.55, -0.3, { rz: Math.PI / 2 });
  part(g, box(0.004, 0.08, 0.008), DARK, 0.91, 1.57, -0.3, { outline: false });
  part(g, box(0.004, 0.006, 0.06), DARK, 0.91, 1.55, -0.28, { outline: false });
  // While it's used: a child practising on the bench (when the teacher's looking in).
  const use = new THREE.Group();
  g.add(use);
  out.inUse = use;
  use.add(lamp);
  const kid = seatedPupil(use, ux, 0.48, bz, Math.PI, 0.95, { shirt: '#ffe082', legs: '#795548', hair: '#212121', shoes: '#8d6e63' }, -0.4);
  const keysAt = marker(g, ux, 0.745, back + 0.5);
  const look = at(g, 'stand', 0.5, 0, 0.86, Math.PI + 0.35, 'meeting', marker(g, ux, 1.0, bz));
  const solo = at(g, 'sit', ux, 0.48, bz, Math.PI, 'keys', keysAt);
  out.spots = { '*': look, mtPracticeCheck: look, mtSoloPractice: solo };
  out.work = keysAt;
  out.animate = (t) => {
    const checking = latest(look, solo) === look;
    kid.root.visible = checking;
    tick.rotation.z = metronomeSwing(t);
    playing(kid, t, 0.265, 0.36, 0.95, 0.4);
    kid.update();
    kid.head.rotation.set(0.32, 0.05 * wave(t, 0.2), 0);
  };
};

// ---------------------------------------------------------------------------------------------
// The 오선 whiteboard.

const BW = 1.8;
const BH = 1.0;
const BY = 1.35;
const LINE_X = 0.08;
const LINE_Y = 1.6;
const WRITE_X = LINE_X + 0.24;
const bpx = (x: number) => ((x + BW / 2) / BW) * 1024;
const bpy = (y: number) => ((BY + BH / 2 - y) / BH) * 568;
const SP = (0.0115 / BH) * 568;
const paintStaffBoard: Paint = (c) => {
  c.fillStyle = '#fbfcfd';
  c.fillRect(0, 0, 1024, 568);
  // A row of keys along the top, the lesson's title.
  for (let i = 0; i < 64; i++) {
    c.fillStyle = '#ffffff';
    c.fillRect(i * 16, 0, 15, 26);
    if ([0, 1, 3, 4, 5].includes(i % 7)) {
      c.fillStyle = '#212121';
      c.fillRect(i * 16 + 11, 0, 9, 16);
    }
  }
  c.fillStyle = '#9e9e9e';
  c.fillRect(0, 26, 1024, 2);
  text(c, '오늘의 이론: 음이름과 박자', 24, 58, 30, '#4a148c');
  // Left: the big staff with the clef and the scale named under it.
  const yc = 190;
  staff(c, 24, 470, yc, 16, '#37474f', 2.5);
  clef(c, 58, yc, 16, '#37474f');
  const names = ['도', '레', '미', '파', '솔', '라', '시', '도'];
  names.forEach((n, i) => {
    note(c, 120 + i * 44, yc, 16, -6 + i, ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#3949ab', '#8e24aa', '#e53935'][i], 'q');
    text(c, n, 120 + i * 44, yc + 92, 24, '#37474f', 'center');
  });
  // Under it: how long each note lasts.
  const rows: Array<[string, 'w' | 'h' | 'q' | 'e', string]> = [['온음표', 'w', '4박'], ['2분음표', 'h', '2박'], ['4분음표', 'q', '1박'], ['8분음표', 'e', '½박']];
  rows.forEach(([n, k, b], i) => {
    const y = 360 + i * 48;
    note(c, 60, y + 8, 12, 0, '#1565c0', k);
    text(c, n, 100, y + 8, 22, '#263238');
    text(c, `= ${b}`, 220, y + 8, 22, '#c62828');
  });
  // Right: three empty staves for the lesson to be written on, a 4/4 at the start of the first.
  for (let r = 0; r < 3; r++) {
    const y = bpy(LINE_Y - r * LESSON_LINE.gap);
    staff(c, bpx(LINE_X - 0.06), bpx(LINE_X + LESSON_LINE.len + 0.04), y, SP, '#607d8b', 1.6);
    c.font = `bold ${Math.round(SP * 2)}px serif`;
    c.fillStyle = '#37474f';
    c.textAlign = 'center';
    c.fillText('4', bpx(LINE_X - 0.035), y - SP * 0.9);
    c.fillText('4', bpx(LINE_X - 0.035), y + SP * 1.1);
  }
  text(c, '따라 쳐 보기 ✎', bpx(LINE_X), bpy(LINE_Y + 0.07), 22, '#2e7d32');
  // Bottom right: the magnet notes, the homework.
  text(c, '숙제: 이론 교재 13쪽', bpx(0.45), 520, 22, '#c62828', 'center');
};
/** One line of the tune written on a staff: notes and bar lines along it in blue marker. */
function paintWritten(row: number): Paint {
  return (c) => {
    c.clearRect(0, 0, 512, 96);
    // The strip is 0.08 high; the staff in it 4 spaces of 0.0115 about its middle.
    const sp = (0.0115 / 0.08) * 96;
    const tune = [[0, 1, 2, 0], [2, 3, 4, -1], [4, 5, 4, 3], [2, 0, -1, -3], [-2, 0, 2, 4], [3, 1, -1, -2]];
    for (let bar = 0; bar < 2; bar++) {
      const notes = tune[(row * 2 + bar) % tune.length];
      notes.forEach((s, i) => {
        if (s === -1 && i === 3) note(c, 40 + bar * 240 + i * 52, 48, sp, -2, '#1565c0', 'h');
        else note(c, 40 + bar * 240 + i * 52, 48, sp, s, '#1565c0', 'q');
      });
      c.fillStyle = '#1565c0';
      c.fillRect(240 + bar * 240 - 12, 48 - 2 * sp, 3, 4 * sp);
    }
  };
}

/**
 * The 오선 whiteboard (2 × 1): a white board in an aluminium frame with a row of piano keys printed
 * along its top — the day's theory (the scale named under a big treble staff, how long each note
 * lasts) and three empty staves on the right that the tune is written on, a bar at a time, while
 * it's taught (activity.ts lessonBeat: written facing it, turned round to explain, pointing back,
 * asking who can sing it). The tray with the markers, the eraser and note magnets.
 */
const theoryBoard: Builder = (g, W, D, _c, _def, ctx, out) => {
  const wall = ctx.againstWall;
  const zb = -D / 2 + (wall ? 0.03 : 0.2);
  const Wb = Math.min(W - 0.1, BW);
  if (!wall) {
    for (const sx of [-1, 1]) {
      const x = sx * (Wb / 2 + 0.05);
      part(g, rbox(0.05, BY + BH / 2 + 0.1, 0.05, 0.01), CHROME, x, (BY + BH / 2 + 0.1) / 2, zb);
      part(g, rbox(0.07, 0.04, 0.6, 0.01), CHROME, x, 0.07, zb);
    }
  }
  part(g, rbox(Wb + 0.07, BH + 0.07, 0.04, 0.01), '#cfd5da', 0, BY, zb);
  part(g, box(Wb, BH, 0.006), '#ffffff', 0, BY, zb + 0.021, { outline: false });
  picture(g, painted('mtStaffBoard', 1024, 568, paintStaffBoard), Wb, BH, 0, BY, zb + 0.025);
  // Note magnets stuck on at the bottom right.
  ['#e53935', '#1e88e5', '#43a047', '#fdd835'].forEach((col, i) => {
    part(g, cyl(0.025, 0.025, 0.012, 14), col, 0.25 + i * 0.07, BY - BH / 2 + 0.15 + (i % 2) * 0.03, zb + 0.032, { rx: Math.PI / 2 });
    part(g, box(0.004, 0.06, 0.006), col, 0.27 + i * 0.07, BY - BH / 2 + 0.18 + (i % 2) * 0.03, zb + 0.032, { outline: false });
  });
  // The tray: markers, the eraser.
  const ty = BY - BH / 2 - 0.035;
  part(g, rbox(Wb + 0.04, 0.018, 0.09, 0.006), '#cfd5da', 0, ty, zb + 0.06);
  ['#212121', '#1565c0', '#c62828', '#2e7d32'].forEach((col, i) => {
    part(g, cyl(0.009, 0.009, 0.12, 8), '#fafafa', -0.6 + i * 0.05, ty + 0.018, zb + 0.06, { rz: Math.PI / 2, outline: false });
    part(g, cyl(0.01, 0.01, 0.03, 8), col, -0.53 + i * 0.05, ty + 0.018, zb + 0.06, { rz: Math.PI / 2, outline: false });
  });
  part(g, rbox(0.14, 0.04, 0.055, 0.01), '#283593', 0.55, ty + 0.03, zb + 0.06);
  part(g, box(0.13, 0.014, 0.05), '#cfd8dc', 0.55, ty + 0.012, zb + 0.06, { outline: false });
  if (wall) {
    part(g, rbox(0.62, 0.2, 0.03, 0.01), '#7b1fa2', 0, BY + BH / 2 + 0.2, zb);
    label(g, '♪ 이론반 ♪', 0.56, 0.15, 0, BY + BH / 2 + 0.2, zb + 0.017, '#7b1fa2', '#ffffff');
  }
  // The tune written up while it's taught: a line at a time, as far as it's been written.
  const zl = zb + 0.029;
  const lines = new THREE.Group();
  g.add(lines);
  out.inUse = lines;
  const rows = [0, 1, 2].map((i) => {
    const tex = painted(`mtWritten${i}`, 512, 96, paintWritten(i)).clone();
    tex.needsUpdate = true;
    const geom = new THREE.PlaneGeometry(LESSON_LINE.len, 0.08).translate(LESSON_LINE.len / 2, 0, 0);
    const m = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    m.userData.ownGeometry = m.userData.ownMaterial = true;
    m.position.set(LINE_X, LINE_Y - i * LESSON_LINE.gap, zl);
    lines.add(m);
    return { m, tex };
  });
  const teach = at(g, 'stand', WRITE_X, 0, zb + 0.5, Math.PI, 'teach', marker(g, LINE_X, LINE_Y, zb + 0.03));
  out.work = teach.work;
  out.spots = { '*': teach };
  out.animate = (t) => {
    const beat = lessonBeat(t);
    teach.at.rotation.y = beat.yaw;
    rows.forEach(({ m, tex }, i) => {
      const k = i < beat.row ? 1 : i === beat.row ? Math.max(0.001, beat.line) : 0;
      m.visible = k > 0;
      m.scale.x = Math.max(0.001, k);
      tex.repeat.x = Math.max(0.001, k);
    });
  };
};

// ---------------------------------------------------------------------------------------------
// The conductor's stand.

const paintCanon: Paint = (c) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 512, 352);
  text(c, 'Canon in D · 합주', 256, 24, 20, INKC, 'center');
  text(c, '♩=76', 30, 50, 15, '#c62828');
  for (let r = 0; r < 4; r++) {
    const yc = 90 + r * 66;
    for (const x0 of [12, 262]) {
      staff(c, x0, x0 + 238, yc, 5, '#5f6a70', 1);
      for (let i = 0; i < 8; i++) note(c, x0 + 16 + i * 28, yc, 5, ((i * 5 + r * 3 + x0) % 9) - 4, INKC, i % 4 === 3 ? 'h' : 'q');
    }
  }
  c.strokeStyle = '#c62828';
  c.lineWidth = 2;
  text(c, 'cresc. ⟨', 300, 330, 16, '#c62828');
};

/**
 * The conductor's stand (1 × 1): a black orchestral music stand on its tripod, the ensemble's score
 * open on it (Canon in D, ♩=76, a crescendo marked in red), a baton and a pencil on its ledge and a
 * clip-on tuner glowing on the desk's corner; beside it on a little round table a wooden metronome
 * ticking. Stood at it conducting in four in time with the metronome (activity.ts 'conduct').
 */
const conductStand: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  const sz = -0.12;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
    rod(g, new THREE.Vector3(0, 0.3, sz), new THREE.Vector3(Math.cos(a) * 0.26, 0.01, sz + Math.sin(a) * 0.26), 0.01, BLACK);
  }
  part(g, cyl(0.016, 0.016, 0.8, 8), BLACK, 0, 0.62, sz, { outline: false });
  part(g, cyl(0.022, 0.022, 0.05, 10), '#424242', 0, 0.62, sz, { outline: false });
  const desk = new THREE.Group();
  desk.position.set(0, 1.12, sz + 0.02);
  desk.rotation.x = -0.32;
  g.add(desk);
  part(desk, rbox(0.52, 0.36, 0.012, 0.006), BLACK, 0, 0, 0);
  part(desk, box(0.54, 0.03, 0.06), BLACK, 0, -0.19, 0.03);
  picture(desk, painted('mtCanon', 512, 352, paintCanon), 0.46, 0.316, 0, 0.005, 0.008);
  part(desk, cyl(0.005, 0.005, 0.36, 6), '#fafafa', 0.02, -0.17, 0.035, { rz: Math.PI / 2, outline: false });
  part(desk, cyl(0.009, 0.007, 0.07, 8), '#8d6e63', -0.19, -0.17, 0.035, { rz: Math.PI / 2, outline: false });
  part(desk, cyl(0.004, 0.004, 0.13, 6), '#fdd835', 0.2, -0.17, 0.045, { rz: Math.PI / 2, outline: false });
  part(desk, rbox(0.06, 0.04, 0.02, 0.008), BLACK, 0.23, 0.17, 0.02);
  glowing(desk, box(0.04, 0.022, 0.003), '#76ff03', 0.23, 0.17, 0.031);
  const score = marker(desk, 0, 0, 0.01);
  // The metronome on its little round table.
  const mx = 0.36;
  const mz = -0.28;
  part(g, cyl(0.15, 0.15, 0.025, 22), WALNUT, mx, 0.66, mz);
  part(g, cyl(0.022, 0.022, 0.64, 8), WALNUT, mx, 0.33, mz, { outline: false });
  part(g, cyl(0.13, 0.15, 0.02, 18), WALNUT, mx, 0.01, mz);
  const tick = metronome(g, mx, 0.675, mz, 1.1);
  tick.parent!.rotation.y = -0.5;
  const s = at(g, 'stand', 0, 0, 0.45, Math.PI, 'conduct', score);
  out.spots = { '*': s };
  out.work = score;
  out.animate = (t) => {
    tick.rotation.z = metronomeSwing(t);
  };
};

// ---------------------------------------------------------------------------------------------
// The rental-instrument wall.

/** A violin hung flat on the wall (or lying, `rx`), its scroll up; `s` its size (1 a full-size 4/4). */
function violin(g: THREE.Object3D, x: number, y: number, z: number, s: number, rx = 0): THREE.Group {
  const v = new THREE.Group();
  v.position.set(x, y, z);
  v.rotation.x = rx;
  v.scale.setScalar(s);
  g.add(v);
  const wood = '#a0521d';
  part(v, ball(0.1), wood, 0, -0.08, 0).scale.set(1, 1.05, 0.22);
  part(v, ball(0.085), wood, 0, 0.07, 0).scale.set(1, 1.0, 0.22);
  part(v, box(0.11, 0.06, 0.04), wood, 0, -0.005, 0, { outline: false });
  part(v, rbox(0.03, 0.26, 0.012, 0.005), '#1b1b1b', 0, 0.12, 0.022);
  part(v, rbox(0.025, 0.1, 0.02, 0.006), shade(wood, 0.85), 0, 0.27, 0);
  part(v, ball(0.02), shade(wood, 0.85), 0, 0.33, 0);
  part(v, box(0.05, 0.008, 0.012), '#e0c08f', 0, -0.06, 0.025, { outline: false });
  part(v, rbox(0.04, 0.05, 0.012, 0.006), '#1b1b1b', 0, -0.15, 0.022);
  for (const sx of [-1, 1]) part(v, box(0.006, 0.05, 0.003), '#2b1a10', sx * 0.04, -0.02, 0.023, { outline: false });
  for (let i = 0; i < 4; i++) part(v, box(0.0015, 0.42, 0.002), '#e0e0e0', -0.009 + i * 0.006, 0.05, 0.03, { outline: false });
  return v;
}
/** A guitar hung by its head on the wall, body down. */
function guitar(g: THREE.Object3D, x: number, y: number, z: number, s: number, wood: string) {
  const v = new THREE.Group();
  v.position.set(x, y, z);
  v.scale.setScalar(s);
  g.add(v);
  part(v, ball(0.19), wood, 0, -0.2, 0).scale.set(1, 1.05, 0.25);
  part(v, ball(0.15), wood, 0, 0.02, 0).scale.set(1, 1, 0.25);
  part(v, cyl(0.055, 0.055, 0.01, 18), '#2b1a10', 0, -0.06, 0.04, { rx: Math.PI / 2, outline: false });
  part(v, rbox(0.05, 0.45, 0.025, 0.008), '#5d4037', 0, 0.33, 0.01);
  part(v, rbox(0.07, 0.13, 0.02, 0.008), '#3e2723', 0, 0.6, 0.01);
  part(v, box(0.08, 0.012, 0.012), '#3e2723', 0, -0.26, 0.05, { outline: false });
  for (let i = 0; i < 6; i++) part(v, box(0.0015, 0.75, 0.002), '#cfd8dc', -0.015 + i * 0.006, 0.12, 0.05, { outline: false });
}

/**
 * The rental-instrument wall (2 × 1): a slatwall in light oak under a 대여 악기 sign — three violins
 * in their sizes (1/4, 1/2, 4/4) with bows, two guitars and a ukulele hung by their heads — over a
 * counter of cupboards: a rack of soprano recorders, a melodica in its blue case, a jar of rosin and
 * spare strings, and a violin case. While it's used the case lies open with a violin in it on the
 * blue plush, a packet of new strings beside it: stood at the counter restringing and tuning it.
 */
const instrumentWall: Builder = (g, W, D, _c, _def, _ctx, out) => {
  const zb = -D / 2 + 0.03;
  const w = W - 0.12;
  part(g, rbox(w, 1.45, 0.03, 0.01), BIRCH, 0, 1.33, zb);
  for (let y = 0.7; y < 2.05; y += 0.12) part(g, box(w - 0.02, 0.008, 0.006), shade(BIRCH, 0.82), 0, y, zb + 0.017, { outline: false });
  part(g, rbox(0.5, 0.13, 0.025, 0.01), WALNUT, 0, 2.12, zb + 0.01);
  label(g, '♪ 대여 악기', 0.46, 0.1, 0, 2.12, zb + 0.026, '#5d4037', '#fff3e0');
  // Violins in three sizes, each with its bow.
  ([[-0.78, 0.55], [-0.56, 0.7], [-0.3, 0.85]] as Array<[number, number]>).forEach(([x, s]) => {
    part(g, cyl(0.008, 0.008, 0.06, 6), CHROME, x, 1.72, zb + 0.04, { rx: Math.PI / 2, outline: false });
    violin(g, x, 1.72 - 0.34 * s, zb + 0.07, s);
    rod(g, new THREE.Vector3(x + 0.1, 1.74, zb + 0.05), new THREE.Vector3(x + 0.1 - 0.02, 1.74 - 0.7 * s, zb + 0.05), 0.004, '#4e342e');
  });
  ['1/4', '1/2', '4/4'].forEach((s, i) => label(g, s, 0.07, 0.035, [-0.78, -0.56, -0.3][i], 1.8, zb + 0.02, '#ffffff', '#5d4037'));
  // Guitars and a ukulele by their heads.
  for (const [x, s, wood] of [[0.12, 1, '#d7a86e'], [0.5, 1, '#8d4e2a'], [0.8, 0.55, '#f0c27b']] as Array<[number, number, string]>) {
    part(g, cyl(0.01, 0.01, 0.07, 6), CHROME, x, 1.98, zb + 0.04, { rx: Math.PI / 2, outline: false });
    guitar(g, x, 1.98 - 0.66 * s, zb + 0.08, s, wood);
  }
  // The counter of cupboards.
  const cz = -D / 2 + 0.23;
  part(g, rbox(w, 0.86, 0.4, 0.015), OAK, 0, 0.43, cz);
  part(g, rbox(w + 0.04, 0.035, 0.44, 0.01), shade(OAK, 0.85), 0, 0.875, cz);
  for (let i = 0; i < 4; i++) {
    const x = -w / 2 + w / 8 + (i * w) / 4;
    part(g, box(w / 4 - 0.03, 0.74, 0.01), shade(OAK, 1.08), x, 0.43, cz + 0.2, { outline: false });
    part(g, rbox(0.02, 0.1, 0.02, 0.006), CHROME, x + (i % 2 ? -1 : 1) * (w / 8 - 0.06), 0.55, cz + 0.215, { outline: false });
  }
  const top = 0.893;
  // The recorder rack, the melodica, the rosin and strings.
  part(g, rbox(0.34, 0.05, 0.08, 0.01), WALNUT, 0.6, top + 0.025, cz - 0.08);
  for (let i = 0; i < 6; i++) {
    part(g, cyl(0.011, 0.009, 0.32, 10), i % 2 ? '#efe6d2' : '#8d6e63', 0.47 + i * 0.052, top + 0.16, cz - 0.08);
    part(g, cyl(0.013, 0.011, 0.04, 10), '#efe6d2', 0.47 + i * 0.052, top + 0.33, cz - 0.08, { outline: false });
  }
  part(g, rbox(0.42, 0.08, 0.14, 0.03), '#1e88e5', 0.55, top + 0.04, cz + 0.08);
  label(g, '멜로디언', 0.16, 0.035, 0.55, top + 0.045, cz + 0.152, '#1e88e5', '#ffffff');
  part(g, cyl(0.035, 0.035, 0.04, 14), '#ffb300', 0.18, top + 0.02, cz - 0.1);
  part(g, rbox(0.08, 0.005, 0.12, 0.003), '#e3f2fd', 0.15, top + 0.003, cz + 0.08, { ry: 0.3, outline: false });
  // The violin case: shut, or open with the violin being restrung.
  const vx = -0.45;
  const idle = new THREE.Group();
  g.add(idle);
  out.idle = idle;
  part(idle, rbox(0.72, 0.12, 0.26, 0.05), '#263238', vx, top + 0.06, cz);
  part(idle, box(0.1, 0.02, 0.03), CHROME, vx, top + 0.07, cz + 0.135, { outline: false });
  const use = new THREE.Group();
  g.add(use);
  out.inUse = use;
  part(use, rbox(0.72, 0.07, 0.26, 0.04), '#263238', vx, top + 0.035, cz);
  part(use, box(0.66, 0.01, 0.21), '#1565c0', vx, top + 0.066, cz, { outline: false });
  part(use, rbox(0.72, 0.03, 0.26, 0.03), '#263238', vx, top + 0.18, cz - 0.21, { rx: -1.2 });
  violin(use, vx, top + 0.085, cz, 1, -Math.PI / 2).rotation.z = Math.PI / 2;
  part(use, rbox(0.08, 0.005, 0.12, 0.003), '#fff59d', vx + 0.42, top + 0.003, cz + 0.12, { ry: -0.2, outline: false });
  const s = at(g, 'stand', vx, 0, cz + 0.62, Math.PI, 'tinker', marker(g, vx, top + 0.1, cz));
  out.spots = { '*': s };
  out.work = s.work;
};

// ---------------------------------------------------------------------------------------------
// The 콩쿠르 case.

function paintCertificate(prize: string, name: string): Paint {
  return (c) => {
    c.fillStyle = '#fffaf0';
    c.fillRect(0, 0, 192, 256);
    c.strokeStyle = '#c9a227';
    c.lineWidth = 6;
    c.strokeRect(8, 8, 176, 240);
    c.lineWidth = 1.5;
    c.strokeRect(16, 16, 160, 224);
    text(c, '상 장', 96, 46, 28, '#3e2723', 'center');
    text(c, prize, 96, 86, 20, '#b71c1c', 'center');
    text(c, name, 96, 116, 16, '#3e2723', 'center', false);
    for (let i = 0; i < 4; i++) {
      c.fillStyle = '#bcaaa4';
      c.fillRect(34, 140 + i * 16, 124, 3);
    }
    text(c, '한음 피아노 콩쿠르', 96, 222, 13, '#3e2723', 'center');
    c.fillStyle = '#c62828';
    c.beginPath();
    c.arc(150, 214, 12, 0, Math.PI * 2);
    c.fill();
  };
}
const paintRecitalPhoto: Paint = (c) => {
  c.fillStyle = '#8e2430';
  c.fillRect(0, 0, 256, 176);
  c.fillStyle = '#5d1a22';
  for (let i = 0; i < 16; i++) c.fillRect(i * 16, 0, 6, 120);
  c.fillStyle = '#6d4c41';
  c.fillRect(0, 120, 256, 56);
  for (let i = 0; i < 9; i++) {
    const x = 20 + i * 27;
    const y = 96 + (i % 2) * 10;
    c.fillStyle = ['#f8bbd0', '#90caf9', '#fff59d', '#c5e1a5', '#ffffff'][i % 5];
    c.fillRect(x - 9, y, 18, 40);
    c.fillStyle = '#f6d5bd';
    c.beginPath();
    c.arc(x, y - 8, 9, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#3e2723';
    c.beginPath();
    c.arc(x, y - 11, 9, Math.PI, 0);
    c.fill();
  }
  text(c, '2026 봄 정기 연주회', 128, 18, 16, '#fff3e0', 'center');
};
/** A trophy cup on its plinth, `h` tall. */
function trophy(g: THREE.Object3D, x: number, y: number, z: number, h: number, color: string) {
  part(g, rbox(0.09 * h * 2, 0.05 * h * 2, 0.07 * h * 2, 0.01), '#3e2723', x, y + 0.05 * h, z);
  part(g, cyl(0.012 * h * 2, 0.02 * h * 2, 0.12 * h * 2, 10), color, x, y + 0.1 * h + 0.12 * h, z);
  part(g, cyl(0.05 * h * 2, 0.02 * h * 2, 0.1 * h * 2, 16), color, x, y + 0.34 * h + 0.1 * h, z);
  for (const sx of [-1, 1]) part(g, ring(0.022 * h * 2, 0.004 * h * 2), color, x + sx * 0.05 * h * 2, y + 0.46 * h, z, { outline: false });
}

/**
 * The 콩쿠르 case in the lobby (2 × 1): a walnut base cabinet under a glass case of three shelves —
 * gold, silver and bronze cups on their plinths, medals on ribbons, little framed certificates — the
 * academy's name on its frieze; on the wall over it two framed 상장 and a photo of the spring recital.
 */
const trophyShelf: Builder = (g, W, D, c, _def, _ctx, out) => {
  const w = W - 0.16;
  const d = 0.42;
  const z = -D / 2 + d / 2 + 0.03;
  part(g, rbox(w, 0.8, d, 0.015), c, 0, 0.4, z);
  for (const sx of [-1, 1]) part(g, box(w / 2 - 0.04, 0.68, 0.01), shade(c, 1.1), sx * (w / 4), 0.4, z + d / 2 + 0.002, { outline: false });
  // The glass case: its frame, its back, glass shelves.
  const y0 = 0.82;
  const y1 = 1.92;
  for (const sx of [-1, 1]) part(g, rbox(0.04, y1 - y0, d, 0.008), c, sx * (w / 2 - 0.02), (y0 + y1) / 2, z);
  part(g, rbox(w, 0.08, d, 0.01), c, 0, y1 + 0.04, z);
  label(g, '한음 음악학원 · 콩쿠르 입상', w * 0.7, 0.06, 0, y1 + 0.04, z + d / 2 + 0.004, '#4e342e', GOLD);
  part(g, box(w - 0.08, y1 - y0, 0.01), '#efe6d6', 0, (y0 + y1) / 2, z - d / 2 + 0.02, { outline: false });
  const shelves = [y0 + 0.02, y0 + 0.38, y0 + 0.74];
  for (const y of shelves) glass(g, box(w - 0.08, 0.012, d - 0.06), 0, y, z);
  // Cups and medals.
  trophy(g, 0, shelves[2], z, 0.4, GOLD);
  trophy(g, -0.45, shelves[2], z, 0.3, '#c0c0c0');
  trophy(g, 0.45, shelves[2], z, 0.3, '#cd7f32');
  trophy(g, -0.2, shelves[1], z - 0.04, 0.26, GOLD);
  trophy(g, 0.3, shelves[1], z - 0.04, 0.24, GOLD);
  for (let i = 0; i < 3; i++) {
    const x = -0.6 + i * 0.12;
    rod(g, new THREE.Vector3(x - 0.02, shelves[1] + 0.3, z - 0.15), new THREE.Vector3(x, shelves[1] + 0.12, z - 0.15), 0.008, ['#e53935', '#1e88e5', '#43a047'][i]);
    part(g, cyl(0.035, 0.035, 0.008, 18), [GOLD, '#c0c0c0', GOLD][i], x, shelves[1] + 0.09, z - 0.14, { rx: Math.PI / 2 });
  }
  ([['금상', '임이안'], ['대상', '이서준'], ['은상', '한선우']] as Array<[string, string]>).forEach(([p, n], i) => {
    const x = -0.5 + i * 0.5;
    part(g, rbox(0.17, 0.22, 0.015, 0.005), '#5d4037', x, shelves[0] + 0.12, z - 0.08, { rx: -0.15 });
    picture(g, painted(`mtCert${i}`, 192, 256, paintCertificate(p, n)), 0.14, 0.187, x, shelves[0] + 0.12, z - 0.07, '#ffffff', 0, -0.15);
  });
  glass(g, box(w - 0.06, y1 - y0, 0.008), 0, (y0 + y1) / 2, z + d / 2 - 0.01);
  // On the wall above: two certificates and the recital photo.
  ([[-0.62, '최우수상', '임수아'], [0.62, '금상', '정민호']] as Array<[number, string, string]>).forEach(([x, p, n], i) => {
    part(g, rbox(0.3, 0.38, 0.025, 0.008), GOLD, x, 2.3, -D / 2 + 0.02);
    picture(g, painted(`mtCertW${i}`, 192, 256, paintCertificate(p, n)), 0.26, 0.34, x, 2.3, -D / 2 + 0.035);
  });
  part(g, rbox(0.56, 0.4, 0.025, 0.008), BLACK, 0, 2.3, -D / 2 + 0.02);
  picture(g, painted('mtRecitalPhoto', 256, 176, paintRecitalPhoto), 0.52, 0.36, 0, 2.3, -D / 2 + 0.035);
  out.work = marker(g, 0, 1.3, z + d / 2);
};

// ---------------------------------------------------------------------------------------------
// The recital corner.

const paintBanner: Paint = (c) => {
  c.fillStyle = '#fff8e1';
  c.fillRect(0, 0, 1024, 160);
  c.fillStyle = '#c9a227';
  c.fillRect(0, 0, 1024, 10);
  c.fillRect(0, 150, 1024, 10);
  text(c, '♪ 한음 음악학원 봄 정기 연주회 ♪', 512, 74, 60, '#8e2430', 'center');
  text(c, '우리 아이들의 첫 무대에 박수를 보내 주세요', 512, 128, 30, '#5d4037', 'center', false);
};
const paintProgram: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 256, 352);
  c.fillStyle = '#8e2430';
  c.fillRect(0, 0, 256, 50);
  text(c, '프로그램', 128, 26, 24, '#ffffff', 'center');
  const items = ['바이엘 · 작은 별', '체르니 100 · 12번', '소나티네 Op.36-1', '바이올린 · 미뉴에트', '합주 · 캐논', '쇼팽 · 강아지 왈츠'];
  items.forEach((s, i) => {
    text(c, `${i + 1}.`, 18, 82 + i * 42, 17, '#8e2430');
    text(c, s, 42, 82 + i * 42, 16, '#37474f', 'left', false);
  });
};

/**
 * The recital corner (3 × 2): a low stage carpeted in wine red, a pleated velvet curtain behind it
 * under a gold-fringed valance, the 정기 연주회 banner over it, a gold star taped where the children
 * bow; a mic on its stand at the left, the program on an easel at the back, a flower stand with its
 * 축 발표회 sash at the front corner and a little spotlight on a stand lighting it while it's on.
 * The recital's hosted from the mic (the 'joke' motion's patter: the next pupil introduced, the room
 * asked for a hand).
 */
const recitalCorner: Builder = (g, W, D, _c, _def, _ctx, out) => {
  const top = 0.15;
  const zf = 0.55;
  const zb = -D / 2 + 0.05;
  const sw = W - 0.1;
  part(g, rbox(sw, top, zf - zb, 0.02), '#5d4037', 0, top / 2, (zf + zb) / 2);
  part(g, box(sw - 0.04, 0.006, zf - zb - 0.04), VELVET, 0, top + 0.003, (zf + zb) / 2, { outline: false });
  part(g, box(sw, 0.03, 0.02), GOLD, 0, top - 0.02, zf + 0.002, { outline: false });
  label(g, '★', 0.12, 0.12, 0, top + 0.008, 0.1, VELVET, GOLD).rotation.x = -Math.PI / 2;
  // The curtain: pleats of velvet, the valance with its fringe.
  const cz = -D / 2 + 0.08;
  const n = 26;
  for (let i = 0; i < n; i++) part(g, cyl(0.065, 0.065, 2.2, 10), i % 2 ? VELVET : shade(VELVET, 0.82), -sw / 2 + 0.06 + (i * (sw - 0.12)) / (n - 1), top + 1.1, cz, { outline: false });
  part(g, rbox(sw + 0.04, 0.26, 0.12, 0.03), shade(VELVET, 0.9), 0, top + 2.3, cz + 0.04);
  part(g, box(sw + 0.04, 0.05, 0.01), GOLD, 0, top + 2.15, cz + 0.105, { outline: false });
  // The banner hung in front of the curtain.
  for (const sx of [-1, 1]) rod(g, new THREE.Vector3(sx * 0.9, top + 2.18, cz + 0.12), new THREE.Vector3(sx * 0.9, top + 1.98, cz + 0.12), 0.004, '#9e9e9e');
  part(g, rbox(2.1, 0.34, 0.015, 0.005), '#fff8e1', 0, top + 1.82, cz + 0.13);
  picture(g, painted('mtBanner', 1024, 160, paintBanner), 2.06, 0.32, 0, top + 1.82, cz + 0.139);
  // The mic at the left.
  const mx = -1.05;
  const mz = 0.28;
  part(g, cyl(0.13, 0.15, 0.025, 18), BLACK, mx, top + 0.012, mz);
  part(g, cyl(0.012, 0.012, 1.4, 8), CHROME, mx, top + 0.7, mz, { outline: false });
  part(g, cyl(0.022, 0.016, 0.13, 12), BLACK, mx, top + 1.44, mz - 0.03, { rx: -0.5 });
  part(g, ball(0.03), '#616161', mx, top + 1.5, mz - 0.065);
  const mic = marker(g, mx, top + 1.5, mz - 0.07);
  // The program on its easel, at the back right.
  const ex = 0.95;
  const ez = -0.55;
  for (const sx of [-1, 1]) rod(g, new THREE.Vector3(ex + sx * 0.22, top, ez + 0.08), new THREE.Vector3(ex + sx * 0.06, top + 1.45, ez - 0.02), 0.012, OAK);
  rod(g, new THREE.Vector3(ex, top, ez - 0.25), new THREE.Vector3(ex, top + 1.4, ez - 0.03), 0.012, OAK);
  part(g, box(0.46, 0.025, 0.06), OAK, ex, top + 0.68, ez + 0.05);
  part(g, rbox(0.42, 0.58, 0.015, 0.005), '#fafafa', ex, top + 1.0, ez + 0.04, { rx: -0.1 });
  picture(g, painted('mtProgram', 256, 352, paintProgram), 0.4, 0.55, ex, top + 1.0, ez + 0.05, '#ffffff', 0, -0.1);
  // The flower stand at the front right corner, its sash.
  const fx = W / 2 - 0.22;
  const fz = 0.78;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    rod(g, new THREE.Vector3(fx, 1.0, fz), new THREE.Vector3(fx + Math.cos(a) * 0.18, 0, fz + Math.sin(a) * 0.18), 0.01, '#bdbdbd');
  }
  part(g, cyl(0.12, 0.08, 0.12, 14), '#efebe9', fx, 1.05, fz);
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4;
    const r = 0.06 + (i % 4) * 0.03;
    part(g, ball(0.055), ['#f48fb1', '#fff59d', '#ffffff', '#ce93d8', '#ef5350'][i % 5], fx + Math.cos(a) * r, 1.18 + (i % 3) * 0.07, fz + Math.sin(a) * r);
  }
  for (let i = 0; i < 6; i++) part(g, ball(0.05), '#66bb6a', fx + Math.cos(i) * 0.17, 1.1, fz + Math.sin(i) * 0.17, { outline: false });
  part(g, box(0.07, 0.6, 0.005), '#ffffff', fx - 0.05, 0.85, fz + 0.13, { rz: 0.08, outline: false });
  label(g, '축 발표회', 0.06, 0.24, fx - 0.05, 0.85, fz + 0.135, '#ffffff', '#c62828');
  // A little spotlight on a stand at the front left corner, lit while it's on.
  const lights = new THREE.Group();
  g.add(lights);
  {
    const lx = -(W / 2 - 0.15);
    part(g, cyl(0.12, 0.12, 0.02, 14), BLACK, lx, 0.01, 0.82);
    part(g, cyl(0.012, 0.012, 1.6, 8), BLACK, lx, 0.8, 0.82, { outline: false });
    part(g, cyl(0.07, 0.09, 0.2, 14), BLACK, lx, 1.62, 0.8, { rx: 0.9, rz: -0.4 });
    glowing(lights, cyl(0.07, 0.07, 0.005, 14), '#fff3c4', lx + 0.03, 1.56, 0.73, 0.9);
  }
  out.inUse = lights;
  // The host at the mic, facing the room.
  const host = at(g, 'stand', mx, top, mz - 0.38, 0, 'joke', mic);
  out.spots = { '*': host };
  out.work = mic;
};

/**
 * The 신발장 inside the academy's door (2026-11-05, the layout audit): a low birch cabinet of open cubbies, pupils' trainers in
 * some and the academy's slippers lined up on top, a little 실내화로 갈아 신어요 card.
 */
const shoeRack: Builder = (g, W) => {
  const h = 0.9;
  const d = 0.36;
  const z = -0.5 + d / 2 + 0.02;
  part(g, rbox(W - 0.08, h, d, 0.02), BIRCH, 0, h / 2, z);
  for (let r = 0; r < 3; r++) part(g, box(W - 0.14, 0.02, d - 0.04), OAK, 0, 0.12 + r * 0.27, z + 0.02, { outline: false });
  const n = 6;
  for (let i = 1; i < n; i++) part(g, box(0.02, h - 0.1, d - 0.04), OAK, -W / 2 + 0.04 + (i * (W - 0.08)) / n, h / 2, z + 0.02, { outline: false });
  const cols = ['#ef5350', '#42a5f5', '#fdd835', '#66bb6a', '#ab47bc', '#ff7043'];
  for (let r = 0; r < 3; r++)
    for (let i = 0; i < n; i++) {
      if ((r * 7 + i * 3) % 4 === 0) continue;
      const x = -W / 2 + 0.04 + ((i + 0.5) * (W - 0.08)) / n;
      for (const s of [-0.04, 0.04]) part(g, rbox(0.07, 0.07, 0.22, 0.02), cols[(i + r) % cols.length], x + s, 0.17 + r * 0.27, z + 0.04);
    }
  for (let i = 0; i < 4; i++) for (const s of [-0.05, 0.05]) part(g, rbox(0.09, 0.03, 0.24, 0.015), '#90caf9', -W / 2 + 0.3 + i * 0.4 + s, h + 0.015, z);
  label(g, '실내화로 갈아 신어요', 0.5, 0.08, 0, h - 0.06, z + d / 2 + 0.006, '#fff8e1', '#5d4037');
};

/**
 * The academy's A-frame sign out on the pavement by the door (2026-11-05, the layout audit): 한음 음악학원, 피아노 · 바이올린 ·
 * 이론 · 입시, and the arrow to the stairs (2층). The name is made up.
 */
const streetSign: Builder = (g) => {
  const tex = painted('mtStreetSign', 192, 320, (c) => {
    c.fillStyle = '#4a148c';
    c.fillRect(0, 0, 192, 320);
    c.fillStyle = '#ffffff';
    c.fillRect(10, 10, 172, 300);
    text(c, '🎹', 96, 58, 56, '#4a148c', 'center', false);
    text(c, '한음', 96, 122, 40, '#4a148c', 'center');
    text(c, '음악학원', 96, 166, 32, '#4a148c', 'center');
    text(c, '피아노 · 바이올린', 96, 212, 20, '#6a1b9a', 'center', false);
    text(c, '이론 · 입시', 96, 240, 20, '#6a1b9a', 'center', false);
    text(c, '▲ 2층 연습실', 96, 286, 22, '#c62828', 'center');
  });
  for (const s of [-1, 1]) {
    const leaf = new THREE.Group();
    leaf.position.set(0, 0, 0);
    leaf.rotation.x = s * 0.16;
    g.add(leaf);
    part(leaf, rbox(0.5, 0.92, 0.03, 0.01), '#4a148c', 0, 0.5, s * 0.08);
    picture(leaf, tex, 0.44, 0.8, 0, 0.52, s * 0.08 + s * 0.02, '#ffffff', s > 0 ? 0 : Math.PI);
  }
};

/** This workplace's furniture drawn as itself (2026-10-27 workplace pipeline), keyed by def id. */
export const BUILDERS: Record<string, Builder> = {
  lessonPiano,
  theoryDesk,
  mtPracticeRoom: practiceRoom,
  mtTheoryBoard: theoryBoard,
  mtConductStand: conductStand,
  mtInstrumentWall: instrumentWall,
  mtTrophyShelf: trophyShelf,
  mtRecitalCorner: recitalCorner,
  mtShoeRack: shoeRack,
  mtStreetSign: streetSign,
};

