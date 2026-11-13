import * as THREE from 'three';
import { storyRound, STORYBOOK, type BarOffset, type Motion } from '../activity';
import { marker, rod, shade, spot, type Builder, type Spot } from '../parts';
import { ball, box, cyl, gradient, part, rbox } from '../toon';
import { glowing, label, painted, picture, ring, seeded, text, type Paint } from './doctor';
import { vroidFigure, type FigureOptions } from './vroidFigure';
import * as CC from './childcareCareMotion';
import type { HeldTool } from '../handTool';
import {
  BLOCKS_AT,
  CATCH_AT,
  CRAFT_AT,
  PAT_AT,
  SNACK_AT,
  STICKER_AT,
  TIDY_AT,
  WASH_AT,
  amountOf,
  blockInHand,
  blocksBeat,
  catchBeat,
  ccPhase,
  childcareKey,
  craftBeat,
  craftHeld,
  midLoc,
  rockBeat,
  snackBeat,
  snackOf,
  stickerBeat,
  stickerRow,
  stuck,
  tidyBeat,
  tidyCol,
  towerOf,
  washBeat,
  washOf,
  type ChildcareMotion,
  type Key,
  type Loc,
} from './childcareMotion';

/**
 * The 국공립 어린이집 drawn as itself (2026-10-27 workplace pipeline, at the user's request): soft,
 * bright and safe, a room for toddlers. The story corner — a foam puzzle mat, picture books faced out
 * on a low rack, cushions, the teacher's low chair — where a picture book (꼬마 구름 몽실이) is read to
 * four toddlers sat on their cushions, their heads following it round; the low craft table where the
 * teacher colours, cuts and glues an autumn leaf with the toddlers beside her, guiding a small hand;
 * the block mat printed with a little town, a tower built turn and turn about with a toddler until it
 * topples (and in 통합 놀이 a friend in a small wheelchair joining in); the snack counter where milk is
 * poured into four cups and apple laid out, the 알레르기 card checked; the nap mats, where a toddler is
 * patted to sleep (토닥토닥) and a crying one rocked in the arms until they settle. And what it was
 * missing (workFurniture/childcareTeacher.ts): the cubbies and shoe shelf by the door, the 출석 board,
 * the little sinks, an indoor slide, the nap room's blackout curtain and night light.
 *
 * The centre (구립 새싹어린이집), the class (햇살반), the children's names and the picture books are
 * made up. The toddlers drawn in show only while a piece is in use, and only for the use they belong to
 * (activity.ts spotPose marks the spot that's used). The story corner, the craft table, the block mat,
 * the snack counter and the nap mats are shared with the babysitter's 어린이집, the 유치원 and (the
 * block mat) the 작업치료실, so nothing on them names this centre.
 */

const CLASS = '햇살반';
const CENTRE = '새싹어린이집';
const UP = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const wave = (t: number, hz: number, ph = 0) => Math.sin((t * hz + ph) * Math.PI * 2);
const sstep = (x: number, a: number, b: number) => THREE.MathUtils.smoothstep(x, a, b);

const BIRCH = '#e9d3a8';
const BIRCH_DARK = '#c9a874';
const PAPER = '#fffdf6';
const SKIN = '#f6d2b5';
const PASTEL = ['#ffab91', '#ffe082', '#a5d6a7', '#81d4fa', '#ce93d8', '#f48fb1', '#fff59d', '#80cbc4'];
const CRAYONS = ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa', '#6d4c41', '#ec407a'];

// ---------------------------------------------------------------------------------------------
// Small parts and spots.

/** A group placed and turned in `parent`. */
function group(parent: THREE.Object3D, x = 0, y = 0, z = 0, ry = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}
/** A spot sat at (the seat's top `y`), facing `yaw`, and what's done there. */
function sitAt(g: THREE.Object3D, x: number, y: number, z: number, yaw: number, motion: Motion, work?: THREE.Object3D, cross = false): Spot {
  const s = spot(g, 'sit', x, y, z, yaw, y);
  s.work = work;
  s.motion = motion;
  if (cross) s.legs = 'cross';
  return s;
}
/** A spot stood at, facing `yaw`, and what's done there. */
function standAt(g: THREE.Object3D, x: number, z: number, yaw: number, motion: Motion, work?: THREE.Object3D): Spot {
  const s = spot(g, 'stand', x, 0, z, yaw);
  s.work = work;
  s.motion = motion;
  return s;
}
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
/** Of named spots, the one most lately used (within a moment), else null. */
function nowAt(spots: Record<string, Spot>, t: number): string | null {
  let best: string | null = null;
  for (const [k, s] of Object.entries(spots)) if (Math.abs(t - posedAt(s)) < 0.6 && (best === null || posedAt(s) > posedAt(spots[best]))) best = k;
  return best;
}
const tmp = new THREE.Vector3();
const phaseOf = (s: Spot) => ccPhase(s.at.getWorldPosition(tmp));
/** A place in a spot's frame, in the piece's frame (the one the spot's marker hangs in). */
function inFrame(s: Spot, p: Loc, out = new THREE.Vector3()): THREE.Vector3 {
  return out.set(p[0], p[1], p[2]).applyAxisAngle(UP, s.at.rotation.y).add(s.at.position);
}
/** The hands of a motion done at a spot, in the piece's frame. */
function handsAt(s: Spot, m: ChildcareMotion, t: number): { k: Key; l: THREE.Vector3; r: THREE.Vector3 } {
  const k = childcareKey(m as Exclude<ChildcareMotion, CC.CareMotion>, t, phaseOf(s));
  return { k, l: inFrame(s, k.l), r: inFrame(s, k.r) };
}
/** Points `o` (its +z) from `from` towards `to`, in its parent's frame. */
function aim(o: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3) {
  o.position.copy(from);
  const d = to.clone().sub(from);
  if (d.lengthSq() > 1e-8) o.quaternion.setFromUnitVectors(Z, d.normalize());
}
/** A sheet lying flat on a top, readable from +z (turned `ry` about the vertical). */
function flat(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0): THREE.Mesh {
  const m = picture(g, tex, w, h, x, y, z);
  m.rotation.order = 'YXZ';
  m.rotation.set(-Math.PI / 2, ry, 0);
  return m;
}
/** A cylinder stretched between two points each frame (a drawn arm, a stream of milk). */
function limb(g: THREE.Object3D, r: number, color: string, material?: THREE.Material): (a: THREE.Vector3, b: THREE.Vector3) => void {
  const m = part(g, cyl(r, r * 0.9, 1, 8), color, 0, 0, 0, { outline: false, material });
  const d = new THREE.Vector3();
  return (a, b) => {
    d.subVectors(b, a);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.scale.set(1, Math.max(0.001, d.length()), 1);
    m.quaternion.setFromUnitVectors(UP, d.normalize());
  };
}
/** A crayon (its tip to +y). */
function crayon(g: THREE.Object3D, color: string): THREE.Group {
  const c = group(g);
  part(c, cyl(0.007, 0.007, 0.07, 8), color, 0, 0, 0, { outline: false });
  part(c, cyl(0.0075, 0.0075, 0.04, 8), PAPER, 0, -0.005, 0, { outline: false });
  part(c, cyl(0.001, 0.007, 0.014, 8), color, 0, 0.042, 0, { outline: false });
  return c;
}
/** A wooden block (its middle at the origin). */
function block(g: THREE.Object3D, color: string, s = BLOCKS_AT.size, x = 0, y = 0, z = 0): THREE.Mesh {
  return part(g, rbox(s, s, s, 0.008), color, x, y, z);
}
/** A little chair for a toddler (seat's top at `h`), built facing +z. */
function tinyChair(g: THREE.Object3D, x: number, z: number, ry: number, color: string, h = 0.26, w = 0.28): THREE.Group {
  const c = group(g, x, 0, z, ry);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(c, cyl(0.016, 0.014, h - 0.025, 8), shade(color, 0.85), sx * (w / 2 - 0.03), (h - 0.025) / 2, sz * (w / 2 - 0.03), { outline: false });
  part(c, rbox(w, 0.03, w * 0.95, 0.012), color, 0, h - 0.015, 0);
  part(c, rbox(w, 0.2, 0.03, 0.012), color, 0, h + 0.13, -w / 2 + 0.02);
  // A cut-out heart in the back.
  part(c, ball(0.03), shade(color, 1.25), 0, h + 0.15, -w / 2 + 0.04, { outline: false }).scale.set(1, 0.8, 0.3);
  return c;
}

// ---------------------------------------------------------------------------------------------
// People drawn in: toddlers, and now and then the 담임 선생님 being watched at work.

type Hairdo = 'pig' | 'bob' | 'tuft' | 'short' | 'bun';
interface Look {
  top: string;
  bottom: string;
  hair: string;
  hairdo: Hairdo;
  /** Socks (indoors, no shoes) or a grown-up's slippers. */
  feet?: string;
  ribbon?: string;
  /** A teacher's apron and what's on its pocket. */
  apron?: string;
  /** A toddler (a big head on a little body). */
  kid?: boolean;
  /** A stripe across the top. */
  stripe?: string;
}
const KIDS: Look[] = [
  { top: '#f8bbd0', bottom: '#7986cb', hair: '#3b2a20', hairdo: 'pig', ribbon: '#ffeb3b', feet: '#ffffff', kid: true },
  { top: '#81d4fa', bottom: '#5d4037', hair: '#2a1d15', hairdo: 'tuft', feet: '#fff3e0', kid: true, stripe: '#ffffff' },
  { top: '#fff176', bottom: '#ef9a9a', hair: '#4e342e', hairdo: 'bob', feet: '#ffffff', kid: true },
  { top: '#a5d6a7', bottom: '#455a64', hair: '#1f1a17', hairdo: 'short', feet: '#e3f2fd', kid: true },
  { top: '#ffcc80', bottom: '#3949ab', hair: '#3e2723', hairdo: 'tuft', feet: '#ffffff', kid: true, stripe: '#ef6c00' },
  { top: '#ce93d8', bottom: '#f48fb1', hair: '#2b1b10', hairdo: 'bob', ribbon: '#ff80ab', feet: '#ffffff', kid: true },
];
const TEACHER: Look = { top: '#fff8e1', bottom: '#5c6bc0', hair: '#2b1b10', hairdo: 'bun', apron: '#f48fb1', feet: '#eceff1' };
const TOT = 0.55;

type Face = 'smile' | 'calm' | 'cry' | 'sleep';
type How = 'stand' | 'floor' | 'held' | { seat: number };
interface Figure {
  root: THREE.Group;
  head: THREE.Group;
  /** Puts the left / right hand at a point in the parent's frame, or back at rest. */
  armL(to: THREE.Vector3 | null): void;
  armR(to: THREE.Vector3 | null): void;
  face(f: Face): void;
}
/**
 * Someone drawn in, their feet (or their seat) at (x, z) in `parent`, turned `ry` (0 faces +z):
 * stood, sat cross-legged on the floor, held on a hip (the legs round the one holding them), or sat on
 * a seat `seat` high (in their own size). `k` scales them (a toddler is about half a grown-up).
 */
function figure(parent: THREE.Object3D, look: Look, x: number, z: number, ry: number, how: How, k = TOT): Figure {
  const root = group(parent, x, 0, z, ry);
  root.scale.setScalar(k);
  const kid = !!look.kid;
  const feet = look.feet ?? '#ffffff';
  const hr = kid ? 0.15 : 0.112;
  let shoulderY: number;
  let torsoY: number;
  let rest: (sx: number) => THREE.Vector3;
  const tz = how === 'stand' ? 0 : -0.02;
  if (how === 'stand') {
    for (const sx of [-1, 1]) {
      rod(root, v3(sx * 0.085, 0.84, 0), v3(sx * 0.09, 0.08, 0.01), 0.058, look.bottom);
      part(root, rbox(0.1, 0.07, 0.19, 0.03), feet, sx * 0.09, 0.035, 0.04);
    }
    part(root, rbox(0.3, 0.17, 0.21, 0.06), look.bottom, 0, 0.88, 0);
    shoulderY = 1.31;
    torsoY = 1.11;
    rest = (sx) => v3(sx * 0.23, 0.84, 0.06);
  } else if (how === 'floor') {
    part(root, rbox(0.32, 0.15, 0.25, 0.06), look.bottom, 0, 0.09, 0);
    for (const sx of [-1, 1]) {
      rod(root, v3(sx * 0.08, 0.08, 0.02), v3(sx * 0.26, 0.08, 0.22), 0.068, look.bottom);
      rod(root, v3(sx * 0.26, 0.07, 0.22), v3(-sx * 0.04, 0.06, 0.29), 0.055, look.bottom);
      part(root, rbox(0.12, 0.07, 0.08, 0.03), feet, -sx * 0.1, 0.05, 0.3, { ry: sx * 0.3 });
    }
    shoulderY = 0.62;
    torsoY = 0.4;
    rest = (sx) => v3(sx * 0.22, 0.14, 0.24);
  } else if (how === 'held') {
    part(root, rbox(0.3, 0.14, 0.24, 0.06), look.bottom, 0, 0.0, 0);
    for (const sx of [-1, 1]) {
      rod(root, v3(sx * 0.09, 0.01, 0.0), v3(sx * 0.17, 0.02, 0.27), 0.066, look.bottom);
      rod(root, v3(sx * 0.17, 0.02, 0.27), v3(sx * 0.17, -0.24, 0.3), 0.054, look.bottom);
      part(root, rbox(0.1, 0.07, 0.17, 0.03), feet, sx * 0.17, -0.28, 0.34);
    }
    shoulderY = 0.47;
    torsoY = 0.27;
    rest = (sx) => v3(sx * 0.16, 0.3, 0.2);
  } else {
    const sh = how.seat;
    for (const sx of [-1, 1]) {
      const hip = v3(sx * 0.09, sh + 0.07, -0.03);
      const knee = v3(sx * 0.1, sh + 0.06, 0.36);
      const ankle = v3(sx * 0.1, Math.max(0.07, sh + 0.06 - 0.4), 0.4);
      rod(root, hip, knee, 0.064, look.bottom);
      rod(root, knee, ankle, 0.052, look.bottom);
      part(root, rbox(0.1, 0.07, 0.19, 0.03), feet, sx * 0.1, ankle.y - 0.035, ankle.z + 0.05);
    }
    part(root, rbox(0.31, 0.15, 0.27, 0.06), look.bottom, 0, sh + 0.08, 0);
    shoulderY = sh + 0.53;
    torsoY = sh + 0.33;
    rest = (sx) => v3(sx * 0.11, sh + 0.17, 0.24);
  }
  part(root, rbox(0.34, 0.46, 0.22, 0.09), look.top, 0, torsoY, tz);
  if (look.stripe) part(root, box(0.345, 0.05, 0.225), look.stripe, 0, torsoY + 0.02, tz, { outline: false });
  if (kid) part(root, ball(0.06), shade(look.top, 1.12), 0, shoulderY - 0.04, tz + 0.1, { outline: false }).scale.set(1.6, 0.5, 0.4);
  if (look.apron) {
    part(root, rbox(0.32, 0.52, 0.02, 0.01), look.apron, 0, torsoY - 0.1, tz + 0.115);
    part(root, rbox(0.14, 0.08, 0.01, 0.005), shade(look.apron, 0.85), 0, torsoY - 0.16, tz + 0.128);
    label(root, '선생님', 0.12, 0.04, 0.0, torsoY + 0.1, tz + 0.128, '#ffffff', '#c2185b');
  }
  part(root, cyl(0.045, 0.05, kid ? 0.04 : 0.08, 10), SKIN, 0, shoulderY + (kid ? 0.03 : 0.06), tz, { outline: false });
  const head = group(root, 0, shoulderY + hr + (kid ? 0.03 : 0.09), tz);
  part(head, ball(hr), SKIN, 0, 0, 0);
  // The face: eyes open, shut (asleep or squeezed shut crying), a smile or a mouth open crying, tears, cheeks.
  const open: THREE.Mesh[] = [];
  const shut: THREE.Mesh[] = [];
  const squeeze: THREE.Mesh[] = [];
  const tears: THREE.Mesh[] = [];
  for (const sx of [-1, 1]) {
    open.push(part(head, ball(hr * 0.11), '#2b2b30', sx * hr * 0.36, hr * 0.02, hr * 0.93, { outline: false }));
    shut.push(part(head, box(hr * 0.26, hr * 0.045, hr * 0.04), '#3e2723', sx * hr * 0.36, -hr * 0.0, hr * 0.94, { outline: false }));
    squeeze.push(part(head, box(hr * 0.26, hr * 0.05, hr * 0.04), '#3e2723', sx * hr * 0.36, hr * 0.03, hr * 0.94, { outline: false, rz: sx * 0.45 }));
    tears.push(part(head, ball(hr * 0.09), '#81d4fa', sx * hr * 0.42, -hr * 0.28, hr * 0.92, { outline: false }));
    part(head, ball(hr * 0.15), '#f8a9b6', sx * hr * 0.55, -hr * 0.28, hr * 0.78, { outline: false }).scale.set(1.2, 0.6, 0.4);
  }
  const smile = part(head, ring(hr * 0.17, hr * 0.03, Math.PI), '#c2185b', 0, -hr * 0.36, hr * 0.94, { outline: false, rz: Math.PI });
  const calm = part(head, box(hr * 0.2, hr * 0.04, hr * 0.03), '#c2185b', 0, -hr * 0.42, hr * 0.94, { outline: false });
  const wail = part(head, ball(hr * 0.15), '#8e2430', 0, -hr * 0.45, hr * 0.9, { outline: false });
  wail.scale.set(1.1, 1.2, 0.5);
  const face = (f: Face) => {
    for (const m of open) m.visible = f === 'smile' || f === 'calm';
    for (const m of shut) m.visible = f === 'sleep';
    for (const m of squeeze) m.visible = f === 'cry';
    for (const m of tears) m.visible = f === 'cry';
    smile.visible = f === 'smile';
    calm.visible = f === 'calm' || f === 'sleep';
    wail.visible = f === 'cry';
  };
  face('smile');
  // Hair.
  switch (look.hairdo) {
    case 'pig':
      part(head, ball(hr * 1.05), look.hair, 0, hr * 0.22, -hr * 0.2);
      part(head, rbox(hr * 1.6, hr * 0.42, hr * 0.42, hr * 0.18), look.hair, 0, hr * 0.6, hr * 0.6, { rx: -0.35 });
      for (const sx of [-1, 1]) {
        part(head, ball(hr * 0.36), look.hair, sx * hr * 1.0, hr * 0.15, -hr * 0.3);
        part(head, ball(hr * 0.17), look.ribbon ?? '#ff80ab', sx * hr * 0.82, hr * 0.42, -hr * 0.3, { outline: false });
      }
      break;
    case 'bob':
      part(head, ball(hr * 1.08), look.hair, 0, hr * 0.16, -hr * 0.16);
      part(head, rbox(hr * 2.12, hr * 0.95, hr * 1.5, hr * 0.4), look.hair, 0, -hr * 0.32, -hr * 0.32);
      part(head, rbox(hr * 1.7, hr * 0.4, hr * 0.4, hr * 0.16), look.hair, 0, hr * 0.58, hr * 0.62, { rx: -0.3 });
      if (look.ribbon) part(head, ball(hr * 0.2), look.ribbon, hr * 0.6, hr * 0.75, hr * 0.1, { outline: false }).scale.set(1.4, 0.8, 0.7);
      break;
    case 'tuft':
      part(head, ball(hr * 1.04), look.hair, 0, hr * 0.22, -hr * 0.2);
      part(head, rbox(hr * 1.6, hr * 0.36, hr * 0.4, hr * 0.15), look.hair, 0, hr * 0.62, hr * 0.6, { rx: -0.3 });
      part(head, cyl(0.0, hr * 0.18, hr * 0.4, 6), look.hair, 0, hr * 1.2, 0, { rz: 0.4, outline: false });
      break;
    case 'bun':
      part(head, ball(hr * 1.05), look.hair, 0, hr * 0.2, -hr * 0.2);
      part(head, rbox(hr * 1.7, hr * 0.4, hr * 0.4, hr * 0.16), look.hair, 0, hr * 0.62, hr * 0.62, { rx: -0.3 });
      part(head, ball(hr * 0.45), look.hair, 0, hr * 0.75, -hr * 0.75);
      break;
    default:
      part(head, ball(hr * 1.04), look.hair, 0, hr * 0.2, -hr * 0.22);
      part(head, rbox(hr * 1.6, hr * 0.32, hr * 0.36, hr * 0.14), look.hair, 0, hr * 0.64, hr * 0.6, { rx: -0.3 });
  }
  // Arms that reach: two bones and a hand, the elbow bending down and out.
  const arm = (sx: number) => {
    const shoulder = v3(sx * 0.2, shoulderY, tz);
    const upper = limb(root, 0.044, look.top);
    const lower = limb(root, 0.036, kid ? look.top : SKIN);
    const hand = part(root, ball(0.04), SKIN, 0, 0, 0, { outline: false });
    const loc = new THREE.Vector3();
    const elbow = new THREE.Vector3();
    const d = new THREE.Vector3();
    const bend = new THREE.Vector3();
    return (to: THREE.Vector3 | null) => {
      if (to) loc.copy(to).sub(root.position).applyAxisAngle(UP, -root.rotation.y).divideScalar(k);
      else loc.copy(rest(sx));
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
  return { root, head, armL, armR, face };
}
/** Someone drawn played by a reduced VRoid body (the same orders); the face is only the drawn one's, a body's stays neutral. */
function played(f: Figure, opts: FigureOptions): Figure {
  // Once the body has come the drawn face stays hidden: showing it again (this was called every frame on
  // the slide) floated the drawn eyes and mouth on the VRoid face, the two figures looking mixed (2026-11-01).
  return { ...vroidFigure(f, opts), face: (x) => (f.head.userData.bodied ? undefined : f.face(x)) };
}
/** A point in a drawn person's own frame (x to their left, y up, z ahead), in the frame they're placed in. */
const on = (f: Figure, x: number, y: number, z: number) => v3(x, y, z).multiplyScalar(f.root.scale.x).applyAxisAngle(UP, f.root.rotation.y).add(f.root.position);

/**
 * A toddler asleep on a nap mat (2026-10-27): the head on the pillow at the origin, the body under a
 * blanket along +x, an arm out over it hugging a soft toy. The blanket rises and falls with the breath.
 */
function sleeper(g: THREE.Object3D, look: Look, x: number, z: number, blanket: string): { root: THREE.Group; cover: THREE.Mesh; face: (f: Face) => void; head: THREE.Group } {
  const root = group(g, x, 0, z);
  const f = figure(root, look, 0, 0, 0, 'stand', TOT);
  // Laid down on the back, the head towards -x: the figure tipped over so its +y runs along +x.
  f.root.rotation.set(0, Math.PI / 2, 0);
  f.root.rotation.order = 'YXZ';
  f.root.rotation.x = -Math.PI / 2;
  f.root.position.set(0.86, 0.13, 0);
  // Hide the standing body under the blanket; the head stays on the pillow.
  const cover = part(root, rbox(0.62, 0.15, 0.4, 0.06), blanket, 0.47, 0.14, 0);
  part(cover, box(0.6, 0.012, 0.02), shade(blanket, 1.15), 0, 0.076, -0.12, { outline: false });
  part(cover, box(0.6, 0.012, 0.02), shade(blanket, 1.15), 0, 0.076, 0.12, { outline: false });
  for (let i = 0; i < 4; i++) part(cover, ball(0.018), '#ffffff', -0.22 + i * 0.15, 0.077, ((i % 2) - 0.5) * 0.1, { outline: false }).scale.set(1, 0.3, 1);
  // The arm out over the blanket and a little bunny tucked in it.
  rod(root, v3(0.2, 0.225, 0.1), v3(0.4, 0.23, 0.14), 0.022, look.top);
  part(root, ball(0.022), SKIN, 0.41, 0.23, 0.14, { outline: false });
  const bun = group(root, 0.33, 0.235, 0.16);
  part(bun, ball(0.04), '#fafafa', 0, 0, 0);
  part(bun, ball(0.03), '#fafafa', -0.05, 0.01, 0);
  for (const s of [-1, 1]) part(bun, rbox(0.012, 0.05, 0.02, 0.006), '#fafafa', -0.07, 0.04, s * 0.012, { rz: 0.3 });
  f.face('sleep');
  return { root, cover, face: f.face, head: f.head };
}

// ---------------------------------------------------------------------------------------------
// What's painted: the picture book's pages, the plans, the signs.

/** 꼬마 구름 몽실이: a little cloud who wants to help, eight pages. */
const STORY = [
  '하늘에 꼬마 구름 몽실이가 살았어요.',
  '"나도 뭔가 돕고 싶어!"',
  '목마른 꽃밭에 비를 톡톡 뿌렸어요.',
  '꽃들이 방긋 웃었어요.',
  '더운 날엔 그늘을 만들어 주었어요.',
  '비가 그치자 무지개가 떴어요.',
  '친구 구름들이 박수를 쳤어요.',
  '"몽실아, 고마워!" 끝',
];
const STORY_SKY = ['#bbdefb', '#e3f2fd', '#cfd8dc', '#c8e6c9', '#fff9c4', '#e1f5fe', '#d1c4e9', '#ffe0b2'];
function cloud(c: CanvasRenderingContext2D, x: number, y: number, s: number, face = true) {
  c.fillStyle = '#ffffff';
  for (const [dx, dy, r] of [[-22, 4, 16], [0, -8, 22], [22, 4, 16], [0, 8, 18]] as const) {
    c.beginPath();
    c.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
    c.fill();
  }
  if (!face) return;
  c.fillStyle = '#37474f';
  for (const dx of [-8, 8]) {
    c.beginPath();
    c.arc(x + dx * s, y - 2 * s, 2.4 * s, 0, Math.PI * 2);
    c.fill();
  }
  c.strokeStyle = '#e57373';
  c.lineWidth = 2 * s;
  c.beginPath();
  c.arc(x, y + 3 * s, 5 * s, 0.2, Math.PI - 0.2);
  c.stroke();
  c.fillStyle = 'rgba(244,143,177,0.7)';
  for (const dx of [-14, 14]) {
    c.beginPath();
    c.arc(x + dx * s, y + 4 * s, 3.4 * s, 0, Math.PI * 2);
    c.fill();
  }
}
function flower(c: CanvasRenderingContext2D, x: number, y: number, color: string, happy: boolean) {
  c.strokeStyle = '#558b2f';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x, y - 30);
  c.stroke();
  c.fillStyle = color;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    c.beginPath();
    c.arc(x + Math.cos(a) * 7, y - 34 + Math.sin(a) * 7 * (happy ? 1 : 0.6), 6, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = '#fdd835';
  c.beginPath();
  c.arc(x, y - 34, 5, 0, Math.PI * 2);
  c.fill();
}
function storyPage(i: number): Paint {
  return (c) => {
    c.fillStyle = STORY_SKY[i];
    c.fillRect(0, 0, 160, 220);
    c.fillStyle = '#9ccc65';
    c.beginPath();
    c.ellipse(80, 206, 120, 50, 0, 0, Math.PI * 2);
    c.fill();
    if (i === 5) {
      ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa'].forEach((k, j) => {
        c.strokeStyle = k;
        c.lineWidth = 6;
        c.beginPath();
        c.arc(80, 150, 66 - j * 6, Math.PI, Math.PI * 2);
        c.stroke();
      });
    }
    if (i === 4) {
      c.fillStyle = '#fdd835';
      c.beginPath();
      c.arc(130, 30, 18, 0, Math.PI * 2);
      c.fill();
    }
    if (i >= 2 && i <= 5) [30, 62, 98, 130].forEach((x, j) => flower(c, x, 182, ['#f06292', '#ffb74d', '#ba68c8', '#4fc3f7'][j], i !== 2));
    if (i === 2) {
      c.fillStyle = '#4fc3f7';
      for (let j = 0; j < 14; j++) c.fillRect(40 + ((j * 37) % 90), 80 + ((j * 23) % 70), 2, 7);
    }
    if (i === 6) {
      cloud(c, 34, 60, 0.6);
      cloud(c, 128, 70, 0.6);
    }
    if (i === 4) {
      c.fillStyle = 'rgba(0,0,0,0.12)';
      c.beginPath();
      c.ellipse(80, 176, 40, 8, 0, 0, Math.PI * 2);
      c.fill();
    }
    cloud(c, 80, i === 2 ? 56 : 70, i === 0 || i === 7 ? 1.1 : 1);
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.fillRect(6, 188, 148, 28);
    const s = STORY[i];
    const cut = s.length > 12 ? s.lastIndexOf(' ', 13) : -1;
    if (cut > 0) {
      text(c, s.slice(0, cut), 80, 196, 11, '#3e2723', 'center', false);
      text(c, s.slice(cut + 1), 80, 209, 11, '#3e2723', 'center', false);
    } else text(c, s, 80, 202, 11, '#3e2723', 'center', false);
  };
}
const pageTex = (i: number) => painted(`cc-story-${((i % 8) + 8) % 8}`, 160, 220, storyPage(((i % 8) + 8) % 8));

const BOOKS: Array<[string, string]> = [['꼬마 구름 몽실이', '#64b5f6'], ['아기 오리 뒤뚱뒤뚱', '#ffd54f'], ['냠냠 당근', '#ff8a65'], ['잘 자요 아기 별', '#5c6bc0'], ['토끼의 생일', '#f48fb1'], ['무지개 우산', '#81c784']];
function coverTex(i: number): THREE.Texture {
  const [title, color] = BOOKS[i % BOOKS.length];
  return painted(`cc-cover-${i % BOOKS.length}`, 96, 120, (c) => {
    c.fillStyle = color;
    c.fillRect(0, 0, 96, 120);
    c.fillStyle = 'rgba(255,255,255,0.9)';
    c.beginPath();
    c.arc(48, 66, 26, 0, Math.PI * 2);
    c.fill();
    if (i % BOOKS.length === 0) cloud(c, 48, 66, 0.7);
    else {
      c.fillStyle = shade(color, 0.7);
      c.beginPath();
      c.arc(48, 66, 14, 0, Math.PI * 2);
      c.fill();
    }
    text(c, title, 48, 16, title.length > 6 ? 9 : 11, '#ffffff', 'center');
  });
}

const paintPlanChart: Paint = (c) => {
  c.fillStyle = '#fffdf3';
  c.fillRect(0, 0, 192, 256);
  c.fillStyle = '#ff8a65';
  c.fillRect(0, 0, 192, 40);
  text(c, '이번 주 놀이 계획', 96, 20, 16, '#ffffff', 'center');
  const rows: Array<[string, string, string]> = [['월', '낙엽 꾸미기', '#ffab91'], ['화', '동화 · 꼬마 구름', '#81d4fa'], ['수', '블록 성 쌓기', '#ffe082'], ['목', '산책 · 바깥놀이', '#a5d6a7'], ['금', '10월 생일 잔치', '#f48fb1']];
  rows.forEach(([d, s, k], i) => {
    const y = 56 + i * 38;
    c.fillStyle = k;
    c.beginPath();
    c.arc(24, y + 10, 14, 0, Math.PI * 2);
    c.fill();
    text(c, d, 24, y + 10, 13, '#ffffff', 'center');
    text(c, s, 46, y + 10, 13, '#37474f', 'left', false);
    c.fillStyle = '#eeeeee';
    c.fillRect(46, y + 26, 130, 1);
  });
  text(c, `${CLASS} · 만 2세`, 96, 246, 10, '#8d6e63', 'center', false);
};
const paintNotebook: Paint = (c) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 160, 120);
  c.fillStyle = '#ffcc80';
  c.fillRect(0, 0, 160, 18);
  text(c, '알림장 · 10월 27일 (화)', 80, 9, 10, '#5d4037', 'center');
  const lines = ['오늘 몽실이 동화를 들었어요.', '점심을 남김없이 먹었어요.', '낮잠: 12:50 ~ 14:30', '내일 산책 모자 챙겨 주세요.'];
  lines.forEach((s, i) => {
    c.fillStyle = '#e0e0e0';
    c.fillRect(8, 36 + i * 22, 144, 1);
    text(c, s, 10, 28 + i * 22, 9, '#37474f', 'left', false);
  });
};
const paintLeaf: Paint = (c) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 128, 96);
  c.fillStyle = '#ff9800';
  c.beginPath();
  c.moveTo(64, 10);
  c.bezierCurveTo(100, 20, 104, 60, 64, 84);
  c.bezierCurveTo(24, 60, 28, 20, 64, 10);
  c.fill();
  c.strokeStyle = '#bf360c';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(64, 14);
  c.lineTo(64, 90);
  for (let i = 0; i < 4; i++) {
    c.moveTo(64, 30 + i * 14);
    c.lineTo(46, 22 + i * 14);
    c.moveTo(64, 30 + i * 14);
    c.lineTo(82, 22 + i * 14);
  }
  c.stroke();
  c.fillStyle = '#e53935';
  c.beginPath();
  c.arc(88, 70, 7, 0, Math.PI * 2);
  c.fill();
};
function kidDrawing(i: number): Paint {
  return (c) => {
    const r = seeded(31 + i * 7);
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 96, 72);
    // A sun, a house or a person, in crayon.
    c.lineWidth = 3;
    c.strokeStyle = CRAYONS[i % CRAYONS.length];
    c.beginPath();
    if (i % 3 === 0) {
      c.arc(48, 36, 14, 0, Math.PI * 2);
      for (let j = 0; j < 8; j++) {
        const a = (j / 8) * Math.PI * 2;
        c.moveTo(48 + Math.cos(a) * 18, 36 + Math.sin(a) * 18);
        c.lineTo(48 + Math.cos(a) * 26, 36 + Math.sin(a) * 26);
      }
    } else if (i % 3 === 1) {
      c.rect(30, 34, 36, 26);
      c.moveTo(26, 36);
      c.lineTo(48, 14);
      c.lineTo(70, 36);
    } else {
      c.arc(48, 22, 9, 0, Math.PI * 2);
      c.moveTo(48, 31);
      c.lineTo(48, 52);
      c.moveTo(34, 40);
      c.lineTo(62, 40);
      c.moveTo(48, 52);
      c.lineTo(38, 66);
      c.moveTo(48, 52);
      c.lineTo(58, 66);
    }
    c.stroke();
    c.strokeStyle = CRAYONS[(i + 3) % CRAYONS.length];
    c.lineWidth = 2;
    c.beginPath();
    for (let j = 0; j < 5; j++) {
      c.moveTo(6 + r() * 80, 60 + r() * 8);
      c.lineTo(10 + r() * 80, 62 + r() * 8);
    }
    c.stroke();
  };
}
const paintWeeklyPlan: Paint = (c) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 192, 136);
  text(c, '주간 보육 계획안', 96, 12, 12, '#37474f', 'center');
  text(c, `${CLASS} · 10월 5주`, 186, 12, 8, '#9e9e9e', 'right', false);
  c.strokeStyle = '#bdbdbd';
  c.lineWidth = 1;
  const cols = ['', '월', '화', '수', '목', '금'];
  for (let i = 0; i <= 6; i++) {
    c.beginPath();
    c.moveTo(8 + i * 29.3, 24);
    c.lineTo(8 + i * 29.3, 130);
    c.stroke();
  }
  for (let j = 0; j <= 4; j++) {
    c.beginPath();
    c.moveTo(8, 24 + j * 26.5);
    c.lineTo(184, 24 + j * 26.5);
    c.stroke();
  }
  cols.forEach((s, i) => text(c, s, 22 + i * 29.3, 32, 9, '#5d4037', 'center'));
  ['실내', '바깥', '동화', '생활'].forEach((s, j) => text(c, s, 22, 56 + j * 26.5, 8, '#5d4037', 'center'));
  const r = seeded(5);
  for (let i = 1; i < 6; i++)
    for (let j = 0; j < 4; j++) {
      c.fillStyle = PASTEL[(i + j) % PASTEL.length];
      c.fillRect(11 + i * 29.3, 46 + j * 26.5, 24, 18);
      c.fillStyle = '#546e7a';
      c.fillRect(13 + i * 29.3, 50 + j * 26.5, 10 + r() * 10, 2);
      c.fillRect(13 + i * 29.3, 56 + j * 26.5, 8 + r() * 10, 2);
    }
};
const paintTown: Paint = (c) => {
  c.fillStyle = '#c5e1a5';
  c.fillRect(0, 0, 512, 256);
  c.fillStyle = '#90a4ae';
  c.fillRect(0, 108, 512, 40);
  c.fillRect(236, 0, 40, 256);
  c.fillStyle = '#ffffff';
  for (let x = 6; x < 512; x += 30) if (x < 226 || x > 286) c.fillRect(x, 126, 16, 4);
  for (let y = 6; y < 256; y += 30) if (y < 98 || y > 158) c.fillRect(254, y, 4, 16);
  // A crossing, a pond, little houses and trees.
  for (let i = 0; i < 6; i++) c.fillRect(190, 110 + i * 6.5, 30, 4);
  c.fillStyle = '#4fc3f7';
  c.beginPath();
  c.ellipse(400, 200, 60, 30, 0, 0, Math.PI * 2);
  c.fill();
  const houses: Array<[number, number, string]> = [[60, 40, '#ef9a9a'], [140, 50, '#fff59d'], [340, 40, '#ce93d8'], [80, 190, '#81d4fa']];
  for (const [x, y, k] of houses) {
    c.fillStyle = k;
    c.fillRect(x - 20, y - 14, 40, 30);
    c.fillStyle = '#e57373';
    c.beginPath();
    c.moveTo(x - 26, y - 12);
    c.lineTo(x, y - 34);
    c.lineTo(x + 26, y - 12);
    c.fill();
  }
  for (const [x, y] of [[440, 60], [470, 90], [180, 210], [300, 210]]) {
    c.fillStyle = '#558b2f';
    c.beginPath();
    c.arc(x, y, 16, 0, Math.PI * 2);
    c.fill();
  }
  c.strokeStyle = '#fff59d';
  c.lineWidth = 6;
  c.strokeRect(3, 3, 506, 250);
};
const paintSnackMenu: Paint = (c) => {
  c.fillStyle = '#fffef5';
  c.fillRect(0, 0, 192, 160);
  c.fillStyle = '#66bb6a';
  c.fillRect(0, 0, 192, 30);
  text(c, '이번 주 간식표', 96, 15, 15, '#ffffff', 'center');
  const rows: Array<[string, string]> = [['월', '바나나 · 우유'], ['화', '사과 · 우유'], ['수', '찐 감자 · 보리차'], ['목', '고구마 · 요구르트'], ['금', '귤 · 쌀과자']];
  rows.forEach(([d, s], i) => {
    const y = 44 + i * 23;
    if (i === 1) {
      c.fillStyle = '#fff59d';
      c.fillRect(6, y - 10, 180, 21);
    }
    text(c, d, 20, y, 12, '#2e7d32', 'center');
    text(c, s, 40, y, 12, '#37474f', 'left', false);
  });
};
const paintAllergy: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 96, 64);
  c.fillStyle = '#e53935';
  c.fillRect(0, 0, 96, 18);
  text(c, '알레르기 확인', 48, 9, 10, '#ffffff', 'center');
  text(c, '땅콩 ✕  견과류 ✕', 48, 30, 9, '#b71c1c', 'center');
  text(c, '우유 ○  사과 ○', 48, 46, 9, '#2e7d32', 'center');
};
const paintHandwash: Paint = (c) => {
  c.fillStyle = '#e0f7fa';
  c.fillRect(0, 0, 200, 160);
  c.fillStyle = '#00acc1';
  c.fillRect(0, 0, 200, 28);
  text(c, '손 씻기 6단계', 100, 14, 15, '#ffffff', 'center');
  const steps = ['손바닥', '손등', '손가락 사이', '두 손 모아', '엄지', '손톱 밑'];
  steps.forEach((s, i) => {
    const x = 8 + (i % 3) * 64;
    const y = 36 + Math.floor(i / 3) * 62;
    c.fillStyle = '#ffffff';
    c.fillRect(x, y, 56, 54);
    c.fillStyle = '#ffcc80';
    c.beginPath();
    c.ellipse(x + 22, y + 24, 9, 14, -0.3 + i * 0.15, 0, Math.PI * 2);
    c.ellipse(x + 34, y + 24, 9, 14, 0.3 - i * 0.1, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#b3e5fc';
    for (let j = 0; j < 3; j++) {
      c.beginPath();
      c.arc(x + 12 + j * 16, y + 8, 3, 0, Math.PI * 2);
      c.fill();
    }
    text(c, `${i + 1}`, x + 7, y + 7, 9, '#00838f', 'center');
    text(c, s, x + 28, y + 47, 8, '#006064', 'center', false);
  });
};
const NAMES = ['강이안', '오아린', '박서아', '최지호', '정예준', '강하윤', '조시우', '윤지안'];
const paintAttendance: Paint = (c) => {
  c.fillStyle = '#fffde7';
  c.fillRect(0, 0, 360, 280);
  c.fillStyle = '#ffb74d';
  c.fillRect(0, 0, 360, 34);
  text(c, `${CLASS} 출석부 · 오늘도 반가워요!`, 180, 17, 15, '#ffffff', 'center');
  // The register (names and the week, Monday stickered), the date and weather, today's word.
  const x0 = 12;
  const nameW = 84;
  const colW = 24;
  ['월', '화', '수', '목', '금'].forEach((d, i) => text(c, d, x0 + nameW + colW * i + colW / 2, 46, 10, '#6d4c41', 'center'));
  NAMES.forEach((n, j) => {
    const y = 64 + j * 26;
    c.fillStyle = j % 2 ? '#fff8e1' : '#ffffff';
    c.fillRect(x0, y - 12, nameW + colW * 5, 24);
    c.fillStyle = PASTEL[j % PASTEL.length];
    c.beginPath();
    c.arc(x0 + 10, y, 7, 0, Math.PI * 2);
    c.fill();
    text(c, n, x0 + 22, y, 11, '#37474f', 'left', false);
    // Monday's smiley sticker.
    c.fillStyle = '#ffd54f';
    c.beginPath();
    c.arc(x0 + nameW + colW / 2, y, 8, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#5d4037';
    c.fillRect(x0 + nameW + colW / 2 - 4, y - 3, 2, 2);
    c.fillRect(x0 + nameW + colW / 2 + 2, y - 3, 2, 2);
  });
  c.strokeStyle = '#ffcc80';
  c.lineWidth = 2;
  c.strokeRect(x0 + nameW + colW, 52, colW, 26 * 8 + 2);
  const rx = 248;
  c.fillStyle = '#e3f2fd';
  c.fillRect(rx, 46, 100, 90);
  text(c, '10월 27일', rx + 50, 62, 13, '#1565c0', 'center');
  text(c, '화요일', rx + 50, 80, 11, '#1e88e5', 'center', false);
  c.fillStyle = '#ffca28';
  c.beginPath();
  c.arc(rx + 50, 110, 14, 0, Math.PI * 2);
  c.fill();
  text(c, '맑음', rx + 80, 122, 9, '#f57f17', 'center', false);
  c.fillStyle = '#fce4ec';
  c.fillRect(rx, 146, 100, 120);
  text(c, '오늘의 한마디', rx + 50, 160, 11, '#ad1457', 'center');
  text(c, '"고마워"', rx + 50, 184, 12, '#c2185b', 'center');
  text(c, '말해 보아요', rx + 50, 200, 10, '#c2185b', 'center', false);
};
const paintNapSign: Paint = (c) => {
  c.fillStyle = '#283593';
  c.fillRect(0, 0, 160, 64);
  c.fillStyle = '#fff59d';
  c.beginPath();
  c.arc(24, 32, 16, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#283593';
  c.beginPath();
  c.arc(31, 27, 14, 0, Math.PI * 2);
  c.fill();
  text(c, '쉿! 낮잠 시간', 96, 26, 15, '#ffffff', 'center');
  text(c, '조용히 다녀요', 96, 46, 10, '#c5cae9', 'center', false);
};
const paintStars: Paint = (c) => {
  c.fillStyle = '#26326e';
  c.fillRect(0, 0, 128, 256);
  const r = seeded(17);
  for (let i = 0; i < 40; i++) {
    c.fillStyle = r() > 0.7 ? '#fff59d' : '#c5cae9';
    const x = r() * 128;
    const y = r() * 256;
    const s = 1.5 + r() * 2.5;
    c.beginPath();
    for (let j = 0; j < 10; j++) {
      const a = (j / 10) * Math.PI * 2 - Math.PI / 2;
      const rr = j % 2 ? s * 0.45 : s;
      c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.fill();
  }
  c.fillStyle = 'rgba(255,255,255,0.08)';
  for (let x = 10; x < 128; x += 22) c.fillRect(x, 0, 3, 256);
};
const ANIMALS = ['#ffb74d', '#81c784', '#64b5f6', '#f06292', '#ba68c8', '#ffd54f'];
function tagTex(name: string, i: number): THREE.Texture {
  return painted(`cc-tag|${name}`, 96, 40, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 96, 40);
    c.fillStyle = ANIMALS[i % ANIMALS.length];
    c.beginPath();
    c.arc(18, 20, 13, 0, Math.PI * 2);
    c.fill();
    // Ears: a bear, a rabbit, a cat… just ears and eyes.
    c.beginPath();
    c.arc(9, 9, 5, 0, Math.PI * 2);
    c.arc(27, 9, 5, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#3e2723';
    c.fillRect(13, 17, 2, 3);
    c.fillRect(21, 17, 2, 3);
    text(c, name, 60, 21, 14, '#37474f', 'center');
  });
}

// ---------------------------------------------------------------------------------------------
// The builders.

/** A foam puzzle mat of soft squares, `nx` × `nz`, its top at 0.02. */
function puzzleMat(g: THREE.Object3D, w: number, d: number, nx: number, nz: number, colors = ['#ffe0b2', '#c8e6c9', '#b3e5fc', '#f8bbd0']) {
  const sw = w / nx;
  const sd = d / nz;
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < nz; j++) {
      const x = -w / 2 + sw * (i + 0.5);
      const z = -d / 2 + sd * (j + 0.5);
      part(g, rbox(sw - 0.006, 0.02, sd - 0.006, 0.006), colors[(i + j * 3) % colors.length], x, 0.01, z, { outline: false });
      // The jigsaw tabs along the joins.
      if (i < nx - 1) part(g, cyl(0.03, 0.03, 0.021, 10), colors[(i + j * 3) % colors.length], x + sw / 2, 0.0105, z, { outline: false });
      if (j < nz - 1) part(g, cyl(0.03, 0.03, 0.021, 10), colors[(i + j * 3) % colors.length], x, 0.0105, z + sd / 2, { outline: false });
    }
}

// ---------------------------------------------------------------------------------------------
// The care work's own things (childcareCareMotion.ts).

/** A little one in a onesie, top and bottom one piece, long sleeves and socks. */
const ONESIE: Look = { top: '#b3e5fc', bottom: '#b3e5fc', hair: '#2a1d15', hairdo: 'tuft', feet: '#ffffff', kid: true, stripe: '#ffffff' };
const bubble = (s: string): Paint => (c) => {
  c.clearRect(0, 0, 256, 96);
  c.fillStyle = '#ffffff';
  c.strokeStyle = '#6d5a4b';
  c.lineWidth = 5;
  c.beginPath();
  c.roundRect(6, 6, 244, 72, 26);
  c.fill();
  c.stroke();
  text(c, s, 128, 44, s.length > 9 ? 24 : 31, '#5d4037', 'center');
};
/** Words in a bubble, one sprite that changes its picture. */
function words(parent: THREE.Object3D, w: number, x: number, y: number, z: number) {
  const mat = new THREE.SpriteMaterial({ transparent: true, depthWrite: false });
  const sp = new THREE.Sprite(mat);
  sp.userData.ownMaterial = true;
  sp.scale.set(w, w * 0.375, 1);
  sp.position.set(x, y, z);
  sp.renderOrder = 5;
  sp.visible = false;
  parent.add(sp);
  let was = '';
  return {
    say(s: string | undefined) {
      sp.visible = !!s;
      if (s && s !== was) {
        was = s;
        mat.map = painted(`ccBubble|${s}`, 256, 96, bubble(s));
        mat.needsUpdate = true;
      }
    },
  };
}
const NO_LINE = { outline: false };
/** What's in a pen's reach: from its grip down and in to the tip. */
const PEN_DOWN = new THREE.Vector3(0, -1, 0.25).normalize();
const PEN_LEN = 0.09;
/** The things taken up at the changing table: `place` poses this moment's and says how it's held. */
function changeTools(use: THREE.Object3D): (now: CC.DiaperNow | null) => HeldTool | null {
  const named = (name: string) => {
    const r = group(use);
    r.name = name;
    return r;
  };
  const oldNappy = named('oldNappy');
  part(oldNappy, rbox(0.085, 0.05, 0.06, 0.022), '#f5f5f0', 0, 0, 0, NO_LINE);
  part(oldNappy, box(0.09, 0.012, 0.022), '#b3e5fc', 0, 0, 0, NO_LINE);
  const newNappy = named('newNappy');
  part(newNappy, rbox(0.115, 0.03, 0.09, 0.012), '#fdfdfb', 0, 0, 0, NO_LINE);
  part(newNappy, box(0.117, 0.01, 0.01), '#b3e5fc', 0, 0, 0.04, NO_LINE);
  const glove = named('gloveHeld');
  part(glove, rbox(0.05, 0.012, 0.09, 0.005), '#90caf9', 0, 0, 0, NO_LINE);
  const cloth = named('tableCloth');
  part(cloth, rbox(0.15, 0.012, 0.11, 0.005), '#ffffff', 0, -0.018, 0, NO_LINE);
  const spray = named('changeSpray');
  const body = group(spray, 0, 0, 0, -Math.PI / 2);
  part(body, cyl(0.026, 0.03, 0.11, 12), '#b2ebf2', 0, -0.075, 0, NO_LINE);
  part(body, rbox(0.03, 0.05, 0.05, 0.008), '#00acc1', 0, 0.0, 0.0, NO_LINE);
  part(body, rbox(0.02, 0.02, 0.05, 0.005), '#00acc1', 0, 0.035, 0.03, NO_LINE);
  const pen = named('changePen');
  const inner = group(pen);
  inner.quaternion.setFromUnitVectors(v3(0, -1, 0), PEN_DOWN);
  part(inner, cyl(0.005, 0.005, PEN_LEN * 0.8 + 0.05, 8), '#26a69a', 0, (0.05 - PEN_LEN * 0.8) / 2, 0, NO_LINE);
  part(inner, cyl(0.005, 0.0015, PEN_LEN * 0.2, 8), '#37474f', 0, -PEN_LEN * 0.9, 0, NO_LINE);
  const all: Record<CC.DiaperTool, THREE.Object3D> = { oldNappy, newNappy, glove, cloth, spray, pen };
  const X = v3(1, 0, 0);
  const pinch = (radius: number): HeldTool['grips'] => ({ right: { at: v3(0, 0, 0), axis: X.clone(), shape: 'pinch', radius } });
  return (now) => {
    for (const o of Object.values(all)) o.visible = false;
    if (!now?.tool) return null;
    const tool = all[now.tool];
    tool.visible = true;
    tool.position.fromArray(now.toolAt);
    switch (now.tool) {
      case 'spray':
        return { tool, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'trigger', radius: 0.02 } } };
      case 'cloth':
        return { tool, lead: 'left', grips: { left: { at: v3(0, 0, 0), axis: X.clone(), palm: v3(0, -1, 0), shape: 'flat', radius: 0.012 } } };
      case 'pen':
        return { tool, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: PEN_DOWN.clone(), shape: 'pen', radius: 0.011, writes: PEN_LEN } } };
      default:
        return { tool, lead: 'right', grips: pinch(0.012) };
    }
  };
}
/** A 식판 with its wells; what's on it is shown as it's served. */
function lunchTray(parent: THREE.Object3D, name: string) {
  const root = group(parent);
  root.name = name;
  part(root, rbox(0.3, 0.014, 0.22, 0.012), '#b0bec5', 0, 0, 0, NO_LINE);
  part(root, rbox(0.28, 0.004, 0.2, 0.01), '#cfd8dc', 0, 0.008, 0, NO_LINE);
  const rice = part(root, ball(0.05), '#fffdf6', -0.07, 0.022, 0.04, NO_LINE);
  rice.scale.set(1.2, 0.45, 1);
  const soup = part(root, cyl(0.05, 0.05, 0.012, 14), '#e6b98a', 0.075, 0.016, 0.04, NO_LINE);
  const sides = ['#81c784', '#ffb74d', '#fff176'].map((k, i) => part(root, rbox(0.07, 0.014, 0.05, 0.006), k, -0.09 + i * 0.09, 0.016, -0.06, NO_LINE));
  const fill = (r: boolean, s: boolean, d: boolean) => {
    rice.visible = r;
    soup.visible = s;
    sides.forEach((m) => (m.visible = d));
  };
  fill(true, true, true);
  root.userData.fill = fill;
  return { root, fill };
}
/** The cart's tools at home, and the tray or tissue that are only in the hand. */
function lunchTools(g: THREE.Object3D): (now: CC.LunchNow | null) => HeldTool | null {
  const L = CC.LUNCH;
  const named = (name: string) => {
    const r = group(g);
    r.name = name;
    return r;
  };
  const stem = (r: THREE.Object3D, color: string, len = 0.2) => part(r, cyl(0.009, 0.011, len, 8), color, 0, -len / 2 + 0.06, 0, NO_LINE);
  const paddle = named('riceScoop');
  stem(paddle, '#fafafa', 0.17);
  part(paddle, rbox(0.06, 0.08, 0.012, 0.012), '#fafafa', 0, -0.13, 0, NO_LINE);
  const ladle = named('soupLadle');
  stem(ladle, '#90a4ae', 0.2);
  part(ladle, ball(0.04), '#90a4ae', 0, -0.17, 0, NO_LINE).scale.set(1, 0.7, 1);
  const tongs = named('sideTongs');
  for (const s of [-1, 1]) part(tongs, rbox(0.012, 0.2, 0.012, 0.004), '#9e9e9e', s * 0.011, -0.07, 0, { ...NO_LINE, rz: s * 0.06 });
  const tray = lunchTray(g, 'lunchTrayHeld');
  const tissue = named('tissue');
  part(tissue, rbox(0.06, 0.012, 0.06, 0.004), '#ffffff', 0, 0, 0, NO_LINE);
  const homes: Array<[THREE.Object3D, CC.P, CC.LunchTool]> = [[paddle, [L.rice[0] + 0.03, L.rice[1] + 0.13, L.rice[2]], 'paddle'], [ladle, [L.pot[0], L.pot[1] + 0.15, L.pot[2]], 'ladle'], [tongs, [L.sides[0], L.sides[1] + 0.13, L.sides[2]], 'tongs']];
  const power = (radius: number): HeldTool['grips'] => ({ right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'power', radius } });
  return (now) => {
    tray.root.visible = false;
    tissue.visible = false;
    for (const [o, h] of homes) {
      o.position.fromArray(h);
      o.rotation.set(0, 0, 0);
    }
    if (!now?.tool) return null;
    switch (now.tool) {
      case 'tray':
        tray.root.visible = true;
        tray.root.position.fromArray(now.toolAt);
        tray.root.rotation.y = now.trayYaw;
        return {
          tool: tray.root,
          lead: 'right',
          grips: {
            left: { at: v3(0.15, -0.012, 0), axis: v3(0, 0, 1), palm: v3(0, 1, 0), shape: 'flat', radius: 0.01 },
            right: { at: v3(-0.15, -0.012, 0), axis: v3(0, 0, 1), palm: v3(0, 1, 0), shape: 'flat', radius: 0.01 },
          },
        };
      case 'tissue':
        tissue.visible = true;
        tissue.position.fromArray(now.toolAt);
        return { tool: tissue, lead: now.who === 0 ? 'left' : 'right', grips: { [now.who === 0 ? 'left' : 'right']: { at: v3(0, 0, 0), axis: v3(1, 0, 0), shape: 'pinch', radius: 0.008 } } };
      default: {
        const o = now.tool === 'paddle' ? paddle : now.tool === 'ladle' ? ladle : tongs;
        o.position.fromArray(now.toolAt);
        o.rotation.z = now.tip;
        return { tool: o, lead: 'right', grips: power(0.011) };
      }
    }
  };
}

// =============================================================================================
// The centre redone as a real one (2026-11-04, the layout audit; workFurniture/childcareTeacher.ts).

/** 유아용 변기 · 칸막이 (ccToddlerToilet, 2 × 1): two low potties against the tiled wall with a low divider between, a step stool, the paper. */
function toddlerToilet(g: THREE.Group) {
  part(g, box(1.96, 1.1, 0.04), '#e1f5fe', 0, 0.55, -0.48);
  for (let i = 0; i < 8; i++) part(g, box(0.004, 1.1, 0.002), '#b3e5fc', -0.98 + i * 0.28, 0.55, -0.457, NO_LINE);
  for (const x of [-0.5, 0.5]) {
    part(g, cyl(0.14, 0.11, 0.26, 18), '#ffffff', x, 0.13, -0.18);
    part(g, rbox(0.3, 0.32, 0.12, 0.03), '#ffffff', x, 0.36, -0.38);
    part(g, cyl(0.15, 0.15, 0.03, 18), x < 0 ? '#ffcc80' : '#a5d6a7', x, 0.275, -0.18);
    part(g, cyl(0.1, 0.1, 0.005, 16), '#e3f2fd', x, 0.292, -0.18, NO_LINE);
    part(g, rbox(0.08, 0.03, 0.03, 0.01), '#90a4ae', x + 0.08, 0.5, -0.33);
    part(g, cyl(0.06, 0.06, 0.1, 12), '#fafafa', x - 0.3, 0.55, -0.42, { rz: Math.PI / 2 });
  }
  // The low divider, a duck on it; the step stool before the right one.
  part(g, rbox(0.04, 0.7, 0.5, 0.02), '#81d4fa', 0, 0.35, -0.22);
  part(g, ball(0.05), '#ffeb3b', 0, 0.74, -0.22);
  part(g, rbox(0.26, 0.1, 0.18, 0.02), '#4fc3f7', 0.5, 0.05, 0.1);
  label(g, '쉬~ 하고 물 내려요', 0.5, 0.08, 0, 0.9, -0.455, '#fffde7', '#0277bd');
}

/** 낮잠 이불장 (ccBeddingCloset, 2 × 1): a tall birch cupboard, one sliding door open on each child's folded bedding with a name tag. */
function beddingCloset(g: THREE.Group) {
  const H = 1.5;
  part(g, box(1.9, H, 0.03), BIRCH, 0, H / 2, -0.46);
  for (const x of [-0.935, 0, 0.935]) part(g, box(0.03, H, 0.55), BIRCH, x, H / 2, -0.2);
  for (const y of [0.02, H]) part(g, box(1.9, 0.04, 0.55), BIRCH, 0, y, -0.2);
  // The door slid over the right half: the left half shows the bedding on two shelves.
  part(g, box(0.9, H - 0.1, 0.02), BIRCH_DARK, 0.45, H / 2, 0.09);
  part(g, box(0.02, 0.24, 0.02), '#8d6e63', 0.06, H / 2, 0.11, NO_LINE);
  part(g, box(0.86, 0.025, 0.5), BIRCH_DARK, -0.47, 0.75, -0.2);
  const names = ['서윤', '하준', '지아', '도윤'];
  for (let shelf = 0; shelf < 2; shelf++)
    for (let i = 0; i < 2; i++) {
      const x = -0.69 + i * 0.44;
      const y0 = shelf ? 0.78 : 0.06;
      for (let k = 0; k < 3; k++) part(g, rbox(0.4, 0.1, 0.42, 0.04), PASTEL[(shelf * 2 + i + k) % PASTEL.length], x, y0 + 0.06 + k * 0.105, -0.2);
      label(g, names[shelf * 2 + i], 0.12, 0.05, x, y0 + 0.27, 0.016, '#ffffff', '#5d4037');
    }
  label(g, '이불장', 0.28, 0.08, 0.45, 1.3, 0.106, '#fff8e1', '#6d4c41');
}

/** 조합 놀이대 (ccPlayStructure, 3 × 3): a deck under a peaked roof, the slide down to the front, steps on the left, a climbing wall on the right, rubber matting below. */
function playStructure(g: THREE.Group) {
  part(g, rbox(2.96, 0.04, 2.96, 0.02), '#4caf50', 0, 0.02, 0);
  const deckY = 1.0;
  const DZ = -0.55;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.06, 0.06, 2.2, 12), '#1e88e5', sx * 0.5, 1.1, DZ + sz * 0.5);
  part(g, rbox(1.1, 0.08, 1.1, 0.02), '#ffb74d', 0, deckY, DZ);
  // Rails round the deck but the slide's opening at the front.
  part(g, box(1.0, 0.05, 0.05), '#fdd835', 0, deckY + 0.5, DZ - 0.5);
  for (const sx of [-1, 1]) part(g, box(0.05, 0.05, 1.0), '#fdd835', sx * 0.5, deckY + 0.5, DZ);
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) part(g, box(0.03, 0.5, 0.03), '#fdd835', sx * 0.5, deckY + 0.25, DZ - 0.36 + i * 0.24, NO_LINE);
  // The roof: two pitched halves.
  for (const sx of [-1, 1]) part(g, box(0.66, 0.05, 1.2), '#e53935', sx * 0.3, 2.35, DZ, { rz: -sx * 0.5 });
  // The slide down to the front.
  const top = v3(0, deckY + 0.04, DZ + 0.55);
  const end = v3(0, 0.2, 1.35);
  const len = top.distanceTo(end);
  const chute = group(g, 0, (top.y + end.y) / 2, (top.z + end.z) / 2);
  chute.rotation.x = Math.atan2(top.y - end.y, end.z - top.z);
  part(chute, rbox(0.46, 0.03, len, 0.015), '#ffeb3b', 0, 0, 0);
  for (const sx of [-1, 1]) part(chute, rbox(0.04, 0.12, len, 0.015), '#fbc02d', sx * 0.23, 0.06, 0);
  // The steps up on the left, their rail.
  for (let i = 0; i < 4; i++) part(g, rbox(0.4, 0.05, 0.22, 0.02), '#43a047', -0.85, 0.2 + i * 0.2, DZ + 0.75 - i * 0.24);
  rod(g, v3(-1.07, 0.2, DZ + 0.85), v3(-1.07, deckY + 0.5, DZ - 0.05), 0.025, '#1e88e5');
  // The climbing wall on the right with its holds.
  part(g, box(0.06, deckY + 0.1, 1.0), '#29b6f6', 0.8, (deckY + 0.1) / 2, DZ, { rz: 0.3 });
  const holds = ['#e53935', '#fdd835', '#8e24aa', '#43a047'];
  for (let i = 0; i < 8; i++) {
    const h = 0.15 + (i % 4) * 0.24;
    part(g, ball(0.045), holds[i % 4], 0.8 + 0.035 + (0.55 - h) * Math.tan(0.3), h, DZ - 0.3 + Math.floor(i / 4) * 0.5, NO_LINE);
  }
}

/** 모래 놀이장 (ccSandbox, 2 × 2): a timber frame of sand, buckets and spades, its cover rolled back along the far side. */
function sandbox(g: THREE.Group) {
  for (const [x, z, w, d] of [[0, -0.9, 1.9, 0.12], [0, 0.9, 1.9, 0.12], [-0.9, 0, 0.12, 1.9], [0.9, 0, 0.12, 1.9]] as const) part(g, rbox(w, 0.26, d, 0.03), '#a1887f', x, 0.13, z);
  part(g, box(1.7, 0.16, 1.7), '#f0d9a0', 0, 0.08, 0, NO_LINE);
  const sand = seeded(41);
  for (let i = 0; i < 18; i++) part(g, ball(0.06 + sand() * 0.05), '#e8cd8c', -0.7 + sand() * 1.4, 0.15, -0.7 + sand() * 1.4, NO_LINE);
  part(g, cyl(0.12, 0.12, 1.8, 16), '#1565c0', 0, 0.36, -0.9, { rz: Math.PI / 2 });
  for (const [x, z, c] of [[-0.4, 0.2, '#e53935'], [0.35, -0.3, '#fdd835']] as const) {
    part(g, cyl(0.09, 0.07, 0.14, 14), c, x, 0.24, z);
    part(g, rbox(0.05, 0.02, 0.22, 0.01), '#43a047', x + 0.15, 0.18, z + 0.1, { ry: 0.6 });
  }
  part(g, rbox(0.3, 0.1, 0.18, 0.03), '#8e24aa', 0.1, 0.2, 0.45);
}

/** 어린이 통학차량 (ccShuttleVan, 3 × 1): a yellow 15-seat van, its nose to +x and its passenger door on the +z side with the fold-down step, 어린이 보호차량 and 정지 signs. */
function shuttleVan(g: THREE.Group) {
  const L = 2.9;
  const bw = 0.95;
  const Y = '#fdd835';
  part(g, rbox(L - 0.5, 1.25, bw, 0.12), Y, -0.3, 1.0, 0);
  part(g, rbox(0.5, 0.6, bw - 0.04, 0.1), Y, 1.15, 0.68, 0);
  part(g, rbox(0.3, 0.5, bw - 0.08, 0.08), Y, 0.95, 1.2, 0, { rz: -0.5 });
  for (const x of [-0.9, 0.95]) for (const sz of [-1, 1]) part(g, cyl(0.2, 0.2, 0.14, 18), '#212121', x, 0.2, sz * (bw / 2 - 0.04), { rx: Math.PI / 2 });
  // The glass: windscreen and side windows.
  part(g, box(0.01, 0.42, bw - 0.16), '#90caf9', 1.11, 1.22, 0, { rz: -0.5, outline: false });
  for (let i = 0; i < 4; i++) for (const sz of [-1, 1]) part(g, box(0.44, 0.34, 0.01), '#90caf9', -1.25 + i * 0.52, 1.3, sz * (bw / 2 + 0.006), NO_LINE);
  // The door and its step on the +z side; the black band and the signs.
  part(g, box(0.5, 1.0, 0.012), '#f9a825', 0.45, 0.9, bw / 2 + 0.008, NO_LINE);
  part(g, rbox(0.5, 0.04, 0.2, 0.01), '#9e9e9e', 0.45, 0.28, bw / 2 + 0.1);
  label(g, '어린이 보호차량', 0.8, 0.13, -0.7, 0.6, bw / 2 + 0.02, Y, '#212121');
  label(g, '새싹어린이집', 0.8, 0.13, -0.7, 0.6, -(bw / 2 + 0.02), Y, '#212121', Math.PI);
  part(g, cyl(0.12, 0.12, 0.012, 8), '#d32f2f', -1.3, 0.62, bw / 2 + 0.03, { rx: Math.PI / 2 });
  label(g, '정지', 0.12, 0.06, -1.3, 0.62, bw / 2 + 0.045, '#d32f2f', '#ffffff');
  part(g, box(0.2, 0.06, 0.04), '#ff7043', -1.2, 1.66, 0);
  part(g, box(0.2, 0.06, 0.04), '#ff7043', 0.6, 1.66, 0);
}

/** 놀이터 울타리 (ccPlayFence, drawn from the playground's north-east tile at 24, 1): a low pastel picket fence round the playground, the building's wall on its west; a latched gate on the south. */
function playFence(g: THREE.Group) {
  const at = (x: number, y: number) => v3(x - 24.5, 0, y - 1.5);
  const run = (a: THREE.Vector3, b: THREE.Vector3, gate = false) => {
    const len = a.distanceTo(b);
    const ry = Math.atan2(b.z - a.z, b.x - a.x);
    const mid = a.clone().lerp(b, 0.5);
    for (const y of [0.3, 0.85]) part(g, box(len, 0.05, 0.04), gate ? '#ffb74d' : '#ffffff', mid.x, y, mid.z, { ry: -ry });
    const n = Math.max(2, Math.round(len / 0.2));
    for (let i = 0; i <= n; i++) {
      const p = a.clone().lerp(b, i / n);
      part(g, box(0.07, 1.0, 0.03), PASTEL[i % PASTEL.length], p.x, 0.5, p.z, { ry: -ry, outline: false });
    }
  };
  run(at(20.0, 1.05), at(24.95, 1.05));
  run(at(24.95, 1.05), at(24.95, 13.95));
  run(at(24.95, 13.95), at(22.0, 13.95));
  run(at(22.0, 13.95), at(21.0, 13.95), true);
  run(at(21.0, 13.95), at(20.0, 13.95));
  for (const x of [21.0, 22.0]) part(g, rbox(0.1, 1.15, 0.1, 0.02), '#ff8a65', at(x, 13.95).x, 0.58, at(x, 13.95).z);
  const sign = at(23.5, 13.95);
  label(g, '놀이터 · 문을 꼭 닫아 주세요', 0.9, 0.13, sign.x, 1.15, sign.z + 0.06, '#ffffff', '#2e7d32');
}

/** 옥외 피난계단 (ccFireStair, 1 × 4 along the west wall): a steel flight up from the ground at the south end to the landing at the upper floor's fire door, its rails, the 비상구 sign. */
function fireStair(g: THREE.Group) {
  const H = 3;
  const C = '#78909c';
  // The landing at the north end, at the upper floor, on its posts.
  part(g, box(0.9, 0.06, 1.1), C, 0, H, -0.55);
  for (const sz of [-1.05, -0.05]) part(g, box(0.07, H, 0.07), '#607d8b', -0.38, H / 2, sz);
  // The flight down to the south.
  const a = v3(0, H, 0.0);
  const b = v3(0, 0, 1.9);
  const len = Math.hypot(H, b.z - a.z);
  const fl = group(g, 0, H / 2, (a.z + b.z) / 2);
  fl.rotation.x = Math.atan2(H, b.z - a.z);
  for (const sx of [-1, 1]) part(fl, box(0.05, 0.16, len), C, sx * 0.4, 0, 0);
  const n = 14;
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    part(g, box(0.76, 0.03, 0.2), '#90a4ae', 0, H - H * u, a.z + (b.z - a.z) * u);
  }
  // The rails on the outer side.
  rod(g, v3(-0.42, H + 0.9, -1.1), v3(-0.42, H + 0.9, 0.0), 0.02, '#455a64');
  rod(g, v3(-0.42, H + 0.9, 0.0), v3(-0.42, 0.9, 1.9), 0.02, '#455a64');
  rod(g, v3(-0.42, H + 0.9, -1.1), v3(0.4, H + 0.9, -1.1), 0.02, '#455a64');
}

export const BUILDERS: Record<string, Builder> = {
  ccToddlerToilet(g) {
    toddlerToilet(g);
  },
  ccBeddingCloset(g) {
    beddingCloset(g);
  },
  ccPlayStructure(g) {
    playStructure(g);
  },
  ccSandbox(g) {
    sandbox(g);
  },
  ccShuttleVan(g) {
    shuttleVan(g);
  },
  ccPlayFence(g) {
    playFence(g);
  },
  ccFireStair(g) {
    fireStair(g);
  },
  /**
   * The story corner (동화 코너): a foam puzzle mat, four floor cushions in an arc, the picture books
   * faced out on a low birch rack at the back with a teddy on it, the 이번 주 놀이 계획 chart on its
   * easel, the teacher's low reading chair at the front facing in, and at the side the teacher's little
   * desk with the 알림장 notebooks. Reading a story: sat on the low chair with 꼬마 구름 몽실이 held up
   * open to the four toddlers on their cushions, reading it, pointing at the picture, showing it round,
   * turning the page — their heads following it, a hand going up. Watching the 담임 read (입문): sat on
   * the stool at the desk taking notes while she reads. Writing the 알림장: sat at the desk. A briefing
   * (new sitters, the parents' evening): stood by the easel turned to the room.
   */
  storyCorner(g, W, D, _c, _def, ctx, out) {
    puzzleMat(g, W - 0.04, D - 0.04, 4, 2);
    // The cushions where the toddlers sit, in an arc before the reader.
    const yaw = Math.PI;
    const seatY = 0.34;
    const seatZ = 0.64;
    const R = 0.66;
    const kidAt = [-50, -17, 17, 50].map((d) => {
      const a = (d * Math.PI) / 180;
      return { x: Math.sin(a) * R, z: seatZ - Math.cos(a) * R };
    });
    kidAt.forEach((p, i) => {
      part(g, cyl(0.15, 0.16, 0.05, 18), PASTEL[(i * 2 + 1) % PASTEL.length], p.x, 0.045, p.z);
      part(g, ring(0.13, 0.008), '#ffffff', p.x, 0.071, p.z, { rx: Math.PI / 2, outline: false });
    });
    // The reader's low chair at the front, facing in.
    const ch = group(g, 0, 0, seatZ);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(ch, cyl(0.018, 0.016, seatY - 0.03, 8), BIRCH_DARK, sx * 0.17, (seatY - 0.03) / 2, sz * 0.15, { outline: false });
    part(ch, rbox(0.42, 0.04, 0.36, 0.015), BIRCH, 0, seatY - 0.02, 0);
    part(ch, rbox(0.36, 0.03, 0.3, 0.015), '#ffab91', 0, seatY + 0.01, 0);
    for (const sx of [-1, 1]) part(ch, cyl(0.016, 0.016, 0.4, 8), BIRCH_DARK, sx * 0.17, seatY + 0.19, 0.16, { outline: false });
    part(ch, rbox(0.38, 0.13, 0.025, 0.01), BIRCH, 0, seatY + 0.32, 0.16);
    // The picture-book rack at the back: three ledges of covers faced out, a teddy on top.
    const rack = group(g, 0, 0, -D / 2 + 0.1);
    part(rack, rbox(1.16, 0.05, 0.16, 0.015), BIRCH, 0, 0.62, 0);
    for (const sx of [-1, 1]) part(rack, rbox(0.04, 0.64, 0.16, 0.012), BIRCH_DARK, sx * 0.58, 0.32, 0);
    part(rack, rbox(1.14, 0.6, 0.02, 0.01), '#fff3e0', 0, 0.32, -0.07);
    for (let row = 0; row < 3; row++) {
      const y = 0.06 + row * 0.19;
      part(rack, rbox(1.12, 0.025, 0.12, 0.008), BIRCH, 0, y, 0.0);
      part(rack, rbox(1.12, 0.04, 0.012, 0.005), BIRCH_DARK, 0, y + 0.025, 0.06);
      for (let i = 0; i < 4; i++) {
        const cover = picture(rack, coverTex(row * 4 + i + row), 0.17, 0.15, -0.42 + i * 0.28, y + 0.095, 0.0, '#ffffff', 0, -0.2);
        cover.position.z = -0.01;
      }
    }
    const ted = group(rack, 0.4, 0.645, 0.0, -0.3);
    part(ted, ball(0.07), '#bcaaa4', 0, 0.07, 0);
    part(ted, ball(0.055), '#bcaaa4', 0, 0.17, 0.01);
    for (const sx of [-1, 1]) {
      part(ted, ball(0.024), '#a1887f', sx * 0.04, 0.215, 0);
      part(ted, ball(0.028), '#bcaaa4', sx * 0.07, 0.09, 0.04);
    }
    part(ted, ball(0.022), '#efebe9', 0, 0.16, 0.055);
    // A little basket of soft toys on the rack's top.
    part(rack, cyl(0.09, 0.075, 0.08, 14), '#d7b98a', -0.38, 0.685, 0);
    PASTEL.slice(0, 3).forEach((k, i) => part(rack, ball(0.035), k, -0.42 + i * 0.04, 0.74, (i - 1) * 0.02, { outline: false }));
    // The easel with this week's play plan.
    const ex = -W / 2 + 0.16;
    const ez = -0.24;
    const easel = group(g, ex, 0, ez, 0.45);
    for (const sx of [-1, 1]) rod(easel, v3(sx * 0.18, 0, 0.1), v3(sx * 0.07, 1.32, 0), 0.013, BIRCH_DARK);
    rod(easel, v3(0, 0, -0.22), v3(0, 1.25, -0.02), 0.011, BIRCH_DARK);
    part(easel, box(0.38, 0.03, 0.06), BIRCH_DARK, 0, 0.66, 0.06);
    part(easel, rbox(0.36, 0.48, 0.014, 0.005), '#ffffff', 0, 0.92, 0.055, { rx: -0.08 });
    picture(easel, painted('cc-plan-chart', 192, 256, paintPlanChart), 0.34, 0.45, 0, 0.92, 0.064, '#ffffff', 0, -0.08);
    const chartAt = marker(g, ex + Math.sin(0.45) * 0.07, 0.95, ez + Math.cos(0.45) * 0.07);
    // The teacher's little desk at the side, the 알림장 notebooks, a pen pot, a little bell; its stool.
    const dx = W / 2 - 0.17;
    const dz = 0.26;
    const deskTop = 0.44;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.014, 0.014, deskTop - 0.02, 8), BIRCH_DARK, dx + sx * 0.13, (deskTop - 0.02) / 2, dz + sz * 0.11, { outline: false });
    part(g, rbox(0.32, 0.03, 0.28, 0.01), BIRCH, dx, deskTop - 0.015, dz);
    for (let i = 0; i < 4; i++) part(g, rbox(0.12, 0.012, 0.16, 0.004), ['#ffcc80', '#a5d6a7', '#90caf9', '#f8bbd0'][i], dx + 0.08, deskTop + 0.006 + i * 0.012, dz - 0.04, { ry: 0.1 * (i - 1.5) });
    part(g, cyl(0.025, 0.022, 0.07, 10), '#4fc3f7', dx - 0.1, deskTop + 0.035, dz - 0.08);
    for (let i = 0; i < 3; i++) part(g, cyl(0.004, 0.004, 0.1, 6), CRAYONS[i * 2], dx - 0.1 + (i - 1) * 0.008, deskTop + 0.09, dz - 0.08, { rz: (i - 1) * 0.15, outline: false });
    flat(g, painted('cc-notebook', 160, 120, paintNotebook), 0.16, 0.12, dx - 0.02, deskTop + 0.004, dz + 0.04);
    const noteAt = marker(g, dx - 0.02, deskTop + 0.01, dz + 0.04);
    const stoolZ = dz + 0.42;
    const stool = group(g, dx, 0, stoolZ);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(stool, cyl(0.014, 0.013, 0.28, 8), BIRCH_DARK, sx * 0.1, 0.14, sz * 0.1, { outline: false });
    part(stool, cyl(0.15, 0.15, 0.03, 16), '#81d4fa', 0, 0.295, 0);
    // The banner and the bunting on the wall behind.
    if (ctx.againstWall) {
      part(g, rbox(1.3, 0.22, 0.012, 0.01), '#fff8e1', 0, 1.42, -D / 2 + 0.012);
      label(g, `${CLASS} 이야기 나라`, 1.2, 0.13, 0, 1.42, -D / 2 + 0.02, '#fff8e1', '#ef6c00');
      for (let i = 0; i < 9; i++) {
        const x = -0.8 + i * 0.2;
        const tri = part(g, cyl(0.06, 0.0, 0.12, 3), PASTEL[i % PASTEL.length], x, 1.73 - Math.sin((i / 8) * Math.PI) * 0.06, -D / 2 + 0.02, { rz: Math.PI, outline: false });
        tri.scale.set(1, 1, 0.15);
      }
    }

    // In use: the toddlers, the book, and the 담임 when she's the one reading.
    const use = group(g);
    out.inUse = use;
    const seatAt = v3(0, seatY, seatZ);
    // The book's spine in the reader's hands: to their left, up, ahead (yaw π: their left is -x, ahead is -z).
    const W0 = v3(seatAt.x - 0.08, seatAt.y + 0.59, seatAt.z - 0.3);
    const workAt = marker(g, W0.x, W0.y, W0.z);
    // The toddlers sit cross-legged, which a body can't yet (vroidFigure has no crossed legs): they stay drawn.
    const kids = kidAt.map((p, i) => figure(use, KIDS[i], p.x, p.z + 0.02, Math.atan2(W0.x - p.x, W0.z - p.z), 'floor', TOT));
    const reader = played(figure(use, TEACHER, 0, seatZ, yaw, { seat: seatY }, 1), { seat: seatY, gender: 'female' });
    const bk = group(use, W0.x, W0.y, W0.z);
    const hw = STORYBOOK.wide / 2;
    const hh = STORYBOOK.high;
    part(bk, box(STORYBOOK.wide + 0.02, hh + 0.02, 0.01), '#64b5f6', 0, 0, -0.012);
    part(bk, box(0.02, hh + 0.02, 0.016), '#1e88e5', 0, 0, -0.008);
    label(bk, '꼬마 구름 몽실이', 0.18, 0.04, -hw / 2, 0.06, -0.018, '#64b5f6', '#ffffff', Math.PI);
    const pageL = picture(bk, pageTex(1), hw - 0.006, hh - 0.01, hw / 2, 0, -0.004);
    const pageR = picture(bk, pageTex(0), hw - 0.006, hh - 0.01, -hw / 2, 0, -0.004);
    const leaf = group(bk);
    const leafFront = picture(leaf, pageTex(1), hw - 0.006, hh - 0.01, hw / 2, 0, 0.0);
    const leafBack = picture(leaf, pageTex(2), hw - 0.006, hh - 0.01, hw / 2, 0, -0.001, '#ffffff', Math.PI);
    const setMap = (m: THREE.Mesh, tex: THREE.Texture) => {
      const mat = m.material as THREE.MeshBasicMaterial;
      if (mat.map !== tex) mat.map = tex;
    };
    const read = sitAt(g, 0, seatY, seatZ, yaw, 'storyRead', workAt);
    const desk = () => sitAt(g, dx, 0.31, stoolZ, Math.PI, 'write', noteAt);
    const brief = standAt(g, ex + 0.4, 0.34, 0.25, 'present', chartAt);
    const spots: Record<string, Spot> = {
      readStory: read,
      childcareTeacher_observeClass: desk(),
      babysitter_watchTeacher: desk(),
      childcareTeacher_observationNote: desk(),
      babysitter_guideNewSitter: brief,
      kindergartenTeacher_parentBriefing: brief,
      '*': read,
    };
    out.spots = spots;
    out.work = workAt;
    // The reader's frame (from the spine), for the 담임's hands.
    const left = v3(Math.cos(yaw), 0, -Math.sin(yaw));
    const fwd = v3(Math.sin(yaw), 0, Math.cos(yaw));
    const off = (o: BarOffset) => W0.clone().addScaledVector(left, o.side).addScaledVector(UP, o.up).addScaledVector(fwd, o.ahead);
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const reading = now === 'readStory' || now === '*';
      const watching = now === 'childcareTeacher_observeClass' || now === 'babysitter_watchTeacher';
      const story = reading || watching;
      bk.visible = story;
      reader.root.visible = watching;
      for (const k of kids) k.root.visible = story;
      if (!story) return;
      const k = storyRound(t, phaseOf(reading ? read : spots[now!]));
      bk.rotation.y = yaw + k.turn;
      const s = k.n * 2;
      setMap(pageR, pageTex(s));
      setMap(pageL, pageTex(k.flip > 0 ? s + 3 : s + 1));
      setMap(leafFront, pageTex(s + 1));
      setMap(leafBack, pageTex(s + 2));
      leaf.rotation.y = -k.flip * Math.PI;
      leaf.visible = k.flip > 0 && k.flip < 1;
      if (k.flip >= 1) setMap(pageR, pageTex(s + 2));
      if (watching) {
        reader.armL(off(k.l));
        reader.armR(off(k.r));
        reader.head.rotation.set(0.25 - 0.3 * Math.max(k.point, Math.abs(k.turn) / 0.35), 0.4 * k.turn, 0);
      }
      kids.forEach((c, i) => {
        const p = kidAt[i];
        const side = -Math.sign(p.x);
        const shown = Math.max(0, (side * k.turn) / 0.35);
        c.head.rotation.set(-0.3 + 0.04 * wave(t, 0.3, i * 0.21), 0.5 * k.turn + 0.08 * wave(t, 0.11, i * 0.4), 0);
        c.root.position.y = 0.07;
        // A hand up at the picture; leaning in when it's shown their way.
        const up = k.point > 0.5 && i === k.n % 4;
        c.armR(up ? on(c, -0.2, 1.05, 0.15) : null);
        c.armL(shown > 0.5 ? on(c, 0.14, 0.42, 0.3) : null);
        c.face(shown > 0.3 || up ? 'smile' : 'calm');
      });
    };
  },

  /**
   * The craft table (만들기 책상): a low rounded table in sunny yellow on pastel legs with the
   * toddlers' little chairs round it and the teacher's at the front; on it a box of crayons, paper,
   * round-ended scissors, a glue stick, coloured paper, a basket of autumn leaves; on the wall behind,
   * the children's drawings pegged on a line. Crafts: the teacher colours in a leaf, cuts it out, glues
   * it, guides the hand of the toddler beside her, holds the finished leaf up — four toddlers colouring
   * their own. Planning (the week's plan, a budget): sat at the same place writing up the plan sheet.
   */
  craftTable(g, W, D, _c, _def, ctx, out) {
    const top = 0.44;
    const tz = -0.02;
    const tw = Math.min(1.4, W - 0.5);
    const td = 0.46;
    part(g, rbox(tw, 0.04, td, 0.06), '#ffe082', 0, top - 0.02, tz);
    part(g, rbox(tw + 0.02, 0.02, td + 0.02, 0.06), '#ffffff', 0, top - 0.045, tz, { outline: false });
    const legC = ['#81d4fa', '#f48fb1', '#a5d6a7', '#ce93d8'];
    let li = 0;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.035, 0.03, top - 0.05, 12), legC[li++], sx * (tw / 2 - 0.1), (top - 0.05) / 2, tz + sz * (td / 2 - 0.08));
    // The teacher's chair at the front middle, the toddlers' round the table.
    const seatY = 0.3;
    const seatZ = tz + td / 2 + 0.24;
    tinyChair(g, 0, seatZ, Math.PI, '#4fc3f7', seatY, 0.36);
    const kidSeat = 0.26;
    const kidSpots: Array<{ x: number; z: number; ry: number }> = [
      { x: 0.46, z: seatZ - 0.04, ry: Math.PI },
      { x: -tw / 2 - 0.12, z: tz, ry: Math.PI / 2 },
      { x: -0.32, z: tz - td / 2 - 0.12, ry: 0 },
      { x: 0.32, z: tz - td / 2 - 0.12, ry: 0 },
    ];
    kidSpots.forEach((p, i) => tinyChair(g, p.x, p.z, p.ry, PASTEL[(i * 3 + 2) % PASTEL.length], kidSeat));
    // What's on the table.
    const box3 = group(g, 0.36, top, tz - 0.1, 0.2);
    part(box3, rbox(0.16, 0.05, 0.08, 0.008), '#fdd835', 0, 0.025, 0);
    label(box3, '크레파스', 0.12, 0.03, 0, 0.03, 0.041, '#fdd835', '#d84315');
    CRAYONS.forEach((k, i) => part(box3, cyl(0.006, 0.006, 0.06, 6), k, -0.065 + i * 0.0185, 0.06, -0.01, { rx: -0.3, outline: false }));
    const papers = group(g, -0.42, top + 0.004, tz - 0.08, -0.15);
    for (let i = 0; i < 3; i++) flat(papers, painted(`cc-kid-art-${i}`, 96, 72, kidDrawing(i)), 0.2, 0.15, i * 0.01, i * 0.002, i * 0.008, i * 0.1);
    const basket = group(g, -tw / 2 + 0.16, top, tz + 0.08);
    part(basket, cyl(0.08, 0.065, 0.06, 14), '#c8a26a', 0, 0.03, 0);
    ['#ef6c00', '#fbc02d', '#d84315', '#8d6e63', '#ff8f00'].forEach((k, i) => part(basket, ball(0.03), k, Math.cos(i * 1.3) * 0.04, 0.07, Math.sin(i * 1.3) * 0.04, { outline: false }).scale.set(1.4, 0.25, 0.9));
    part(g, cyl(0.014, 0.014, 0.08, 10), '#7e57c2', 0.18, top + 0.014, tz + 0.12, { rz: Math.PI / 2, ry: 0.4 });
    const sc = group(g, -0.16, top + 0.006, tz + 0.12, -0.5);
    for (const s of [-1, 1]) part(sc, ring(0.014, 0.004), '#43a047', s * 0.012, 0, -0.03, { rx: Math.PI / 2, outline: false });
    part(sc, rbox(0.012, 0.004, 0.05, 0.003), '#b0bec5', 0, 0, 0.012, { outline: false });
    ['#ef5350', '#42a5f5', '#66bb6a'].forEach((k, i) => part(g, box(0.07, 0.002, 0.07), k, 0.05 + i * 0.05, top + 0.002 + i * 0.002, tz - 0.12, { ry: i * 0.4, outline: false }));
    // The drawings on a line on the wall behind.
    if (ctx.againstWall) {
      const y = 1.3;
      rod(g, v3(-0.9, y + 0.12, -D / 2 + 0.03), v3(0.9, y + 0.12, -D / 2 + 0.03), 0.005, '#8d6e63');
      for (let i = 0; i < 5; i++) {
        const x = -0.72 + i * 0.36;
        const art = picture(g, painted(`cc-kid-art-${i + 3}`, 96, 72, kidDrawing(i + 3)), 0.26, 0.2, x, y, -D / 2 + 0.035, '#ffffff', 0, 0);
        art.rotation.z = (i % 2 ? 1 : -1) * 0.04;
        part(g, box(0.015, 0.04, 0.012), PASTEL[i % PASTEL.length], x, y + 0.11, -D / 2 + 0.042, { outline: false });
      }
      label(g, '우리들의 작품', 0.5, 0.08, 0, y + 0.26, -D / 2 + 0.02, '#fff8e1', '#ef6c00');
    }

    // In use.
    const use = group(g);
    out.inUse = use;
    const craftSet = group(use);
    const planSet = group(use);
    const sheetHome = v3(0, top + 0.004, seatZ - CRAFT_AT.sheet[2]);
    const workAt = marker(g, sheetHome.x, sheetHome.y + 0.006, sheetHome.z);
    // The teacher's leaf: on the table, or held up between the hands.
    const sheet = group(craftSet);
    sheet.rotation.order = 'YXZ';
    const leafPic = picture(sheet, painted('cc-leaf', 128, 96, paintLeaf), 0.24, 0.18, 0, 0, 0);
    leafPic.userData.keep = true;
    const crayonR = crayon(craftSet, '#ef6c00');
    const scissors = group(craftSet);
    for (const s of [-1, 1]) part(scissors, ring(0.014, 0.004), '#43a047', s * 0.012, -0.03, 0, { outline: false });
    part(scissors, rbox(0.012, 0.05, 0.004, 0.003), '#b0bec5', 0, 0.012, 0, { outline: false });
    const kids = kidSpots.map((p, i) => {
      const f = played(figure(craftSet, KIDS[(i + 1) % KIDS.length], p.x, p.z, p.ry, { seat: kidSeat / TOT }, TOT), { stage: 'child', seat: kidSeat, gender: i % 2 ? 'female' : 'male' });
      const fwd = v3(Math.sin(p.ry), 0, Math.cos(p.ry));
      const paperAt = v3(p.x, top + 0.004, p.z).addScaledVector(fwd, 0.26);
      const paper = flat(craftSet, painted(`cc-kid-art-${i + 5}`, 96, 72, kidDrawing(i + 5)), 0.17, 0.13, paperAt.x, paperAt.y + 0.002, paperAt.z, p.ry + Math.PI);
      void paper;
      const cr = crayon(craftSet, CRAYONS[(i * 3 + 1) % CRAYONS.length]);
      return { f, paperAt, cr };
    });
    // The planning sheet and a binder.
    flat(planSet, painted('cc-weekly-plan', 192, 136, paintWeeklyPlan), 0.3, 0.21, sheetHome.x, sheetHome.y + 0.002, sheetHome.z);
    part(planSet, rbox(0.24, 0.03, 0.3, 0.01), '#26a69a', 0.32, top + 0.015, tz - 0.02, { ry: 0.25 });
    label(planSet, '보육일지', 0.12, 0.04, 0.32, top + 0.031, tz - 0.02, '#26a69a', '#ffffff').rotation.set(-Math.PI / 2, 0, 0.25);
    const craftSpot = sitAt(g, 0, seatY, seatZ, Math.PI, 'ccCraft', workAt);
    const planSpot = () => sitAt(g, 0, seatY, seatZ, Math.PI, 'write', workAt);
    const spots: Record<string, Spot> = {
      craftWithKids: craftSpot,
      childcareTeacher_classPlan: planSpot(),
      babysitter_planPlay: planSpot(),
      kindergartenTeacher_weeklyPlan: planSpot(),
      kindergartenTeacher_programBudget: planSpot(),
      '*': craftSpot,
    };
    out.spots = spots;
    out.work = workAt;
    const fwdT = v3(0, 0, -1);
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const crafting = now === 'craftWithKids' || now === '*';
      craftSet.visible = crafting;
      planSet.visible = now !== null && !crafting;
      if (!crafting) return;
      const s = spots[now!];
      const b = craftBeat(t, phaseOf(s));
      const { k, l, r } = handsAt(s, 'ccCraft', t);
      void k;
      const held = craftHeld(b);
      // The leaf flat on the table, or up between the hands, its face to the toddlers across.
      const up = held.sheetUp;
      const mid = l.clone().lerp(r, 0.5).addScaledVector(UP, -0.02);
      // Flat it reads to the teacher; held up it's turned round to the table.
      sheet.position.copy(sheetHome).lerp(mid, up);
      sheet.rotation.set((-Math.PI / 2) * (1 - up), Math.PI * up, 0);
      crayonR.visible = held.crayon;
      if (held.crayon) {
        aim(crayonR, r.clone().addScaledVector(UP, 0.03), r.clone().addScaledVector(UP, -0.05).addScaledVector(fwdT, 0.02));
        crayonR.rotateX(Math.PI / 2);
      }
      scissors.visible = held.scissors;
      if (held.scissors) {
        scissors.position.copy(r);
        scissors.rotation.set(0, Math.PI, 0.5 + 0.2 * wave(t, 2.4));
      }
      // The toddlers colouring their own, heads down, one looking up when the leaf's shown.
      kids.forEach(({ f, paperAt, cr }, i) => {
        const guided = i === 0 && amountOf(b, 'help') > 0.5;
        const scrib = paperAt.clone().add(v3(0.03 * wave(t, 1.9 + i * 0.3, i * 0.3), 0.012, 0.025 * wave(t, 0.9, i * 0.5)));
        const hand = guided ? r.clone().addScaledVector(UP, -0.015) : scrib;
        f.armR(hand);
        f.armL(paperAt.clone().add(v3(0, 0.01, 0)).addScaledVector(v3(Math.cos(f.root.rotation.y), 0, -Math.sin(f.root.rotation.y)), 0.09));
        aim(cr, hand.clone().addScaledVector(UP, 0.035), hand.clone().addScaledVector(UP, -0.03));
        cr.rotateX(Math.PI / 2);
        const look = up > 0.6 && b.from === 'show';
        f.head.rotation.set(look ? -0.15 : 0.35 + 0.05 * wave(t, 0.4, i * 0.3), look ? Math.atan2(-f.root.position.x, seatZ - f.root.position.z) * 0.3 : 0, 0);
        f.face(look || guided ? 'smile' : 'calm');
      });
    };
  },

  /**
   * The block mat (블록 놀이 매트): a soft mat printed with a little town (roads, a crossing, a pond,
   * houses), a crate of wooden blocks at the back, a block castle with a red roof, a toy car. Block
   * play: sat cross-legged on the mat across from a toddler, building a tower turn and turn about —
   * a block from the pile set on top, steadied, the toddler adds theirs, a clap — until it's eight high
   * and topples over. 통합 놀이 (inclusive play): a friend in a small wheelchair at the end joins in,
   * clapping along. Watching the mentor (입문): sat on a stool at the corner with a notebook while the
   * 담임 builds. Drawing play (the 작업치료실): sat at a drawing board on the mat with the child.
   */
  blockMat(g, W, D, _c, _def, _ctx, out) {
    const mw = W - 0.04;
    const md = D - 0.04;
    part(g, rbox(mw, 0.03, md, 0.03), '#c5e1a5', 0, 0.015, 0);
    const town = new THREE.Mesh(new THREE.PlaneGeometry(mw - 0.02, md - 0.02), new THREE.MeshToonMaterial({ map: painted('cc-town', 512, 256, paintTown), gradientMap: gradient }));
    town.userData.ownGeometry = town.userData.ownMaterial = true;
    town.rotation.x = -Math.PI / 2;
    town.position.set(0, 0.031, 0);
    town.receiveShadow = true;
    g.add(town);
    const mat = 0.031;
    // The crate of blocks at the back left.
    const crate = group(g, -W / 2 + 0.3, mat, -D / 2 + 0.2);
    part(crate, rbox(0.42, 0.04, 0.26, 0.01), BIRCH, 0, 0.02, 0);
    for (const sx of [-1, 1]) part(crate, rbox(0.03, 0.18, 0.26, 0.01), BIRCH_DARK, sx * 0.195, 0.09, 0);
    for (const sz of [-1, 1]) part(crate, rbox(0.42, 0.18, 0.03, 0.01), BIRCH, 0, 0.09, sz * 0.115);
    label(crate, '블록', 0.16, 0.06, 0, 0.11, 0.132, BIRCH, '#6d4c41');
    for (let i = 0; i < 12; i++) block(crate, PASTEL[i % PASTEL.length], 0.07, -0.14 + (i % 4) * 0.09, 0.08 + Math.floor(i / 4) * 0.045, -0.06 + ((i * 7) % 3) * 0.05).rotation.y = i * 0.6;
    // The block castle at the back right.
    const castle = group(g, W / 2 - 0.34, mat, -D / 2 + 0.2);
    for (const [x, z] of [[-0.09, 0], [0.09, 0]]) for (let j = 0; j < 3; j++) block(castle, PASTEL[(j * 2 + (x > 0 ? 1 : 0)) % PASTEL.length], 0.08, x, 0.04 + j * 0.08, z);
    part(castle, rbox(0.28, 0.05, 0.1, 0.01), '#ffe082', 0, 0.265, 0);
    part(castle, cyl(0.1, 0.1, 0.12, 3), '#e53935', 0, 0.35, 0, { rx: Math.PI / 2, rz: Math.PI / 2 }).scale.set(1, 1, 1);
    part(castle, cyl(0.004, 0.004, 0.12, 6), '#795548', 0, 0.46, 0, { outline: false });
    part(castle, box(0.06, 0.035, 0.004), '#ffeb3b', 0.03, 0.5, 0, { outline: false });
    // A toy car on the road.
    const car = group(g, 0.62, mat, 0.22, 0.2);
    part(car, rbox(0.14, 0.05, 0.08, 0.02), '#e53935', 0, 0.04, 0);
    part(car, rbox(0.07, 0.04, 0.07, 0.02), '#ffcdd2', -0.01, 0.08, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(car, cyl(0.018, 0.018, 0.012, 10), '#37474f', sx * 0.045, 0.018, sz * 0.042, { rx: Math.PI / 2, outline: false });

    // The teacher's place, across from the toddler, the tower between.
    const teach = v3(0, mat, 0.3);
    const blocksSpot = () => sitAt(g, teach.x, teach.y, teach.z, Math.PI, 'ccBlocks', undefined, true);
    const play = blocksSpot();
    const towerAt = inFrame(play, BLOCKS_AT.tower);
    const workAt = marker(g, towerAt.x, towerAt.y + 0.1, towerAt.z);
    play.work = workAt;
    const pileAt = inFrame(play, BLOCKS_AT.pile);
    for (let i = 0; i < 5; i++) block(g, PASTEL[(i * 3) % PASTEL.length], BLOCKS_AT.size, pileAt.x + ((i % 3) - 1) * 0.08, mat + BLOCKS_AT.size / 2 + (i > 2 ? BLOCKS_AT.size : 0), pileAt.z + (i % 2) * 0.06).rotation.y = i * 0.5;

    const use = group(g);
    out.inUse = use;
    const towerSet = group(use);
    const tower = Array.from({ length: BLOCKS_AT.rounds * 2 }, (_, i) => block(towerSet, PASTEL[(i * 5 + 1) % PASTEL.length]));
    const inHand = block(towerSet, '#ef5350');
    const kidBlock = block(towerSet, '#42a5f5');
    const kidZ = -0.36;
    // Cross-legged on the mat, like the 담임 below: drawn until a body can (vroidFigure has no crossed legs).
    const kid = figure(use, KIDS[1], 0, kidZ, 0, 'floor', TOT);
    const kidPile = v3(-0.24, mat + 0.04, kidZ + 0.1);
    for (let i = 0; i < 3; i++) block(towerSet, PASTEL[(i * 2 + 3) % PASTEL.length], BLOCKS_AT.size, kidPile.x + (i - 1) * 0.08, mat + BLOCKS_AT.size / 2, kidPile.z - 0.04 + (i % 2) * 0.05);
    // 통합 놀이: a friend in a small wheelchair at the end, joining in.
    const chair = group(use, -W / 2 + 0.24, 0, 0.0, Math.PI / 2);
    const chairSeat = 0.3;
    for (const sx of [-1, 1]) {
      part(chair, ring(0.2, 0.014), '#455a64', sx * 0.17, 0.21, -0.03, { ry: Math.PI / 2 });
      part(chair, ring(0.17, 0.008), '#b0bec5', sx * 0.19, 0.21, -0.03, { ry: Math.PI / 2, outline: false });
      part(chair, cyl(0.035, 0.035, 0.02, 10), '#455a64', sx * 0.12, 0.035, 0.18, { rz: Math.PI / 2 });
      rod(chair, v3(sx * 0.14, chairSeat, -0.12), v3(sx * 0.14, chairSeat + 0.34, -0.16), 0.012, '#26a69a');
      rod(chair, v3(sx * 0.14, chairSeat, 0.14), v3(sx * 0.12, 0.08, 0.2), 0.01, '#26a69a');
    }
    part(chair, rbox(0.28, 0.04, 0.28, 0.015), '#26a69a', 0, chairSeat - 0.02, 0.0);
    part(chair, rbox(0.26, 0.24, 0.03, 0.015), '#4db6ac', 0, chairSeat + 0.18, -0.14);
    part(chair, rbox(0.22, 0.02, 0.08, 0.01), '#455a64', 0, 0.08, 0.22);
    // The feet on the wheelchair's footrest.
    const friend = played(figure(chair, KIDS[2], 0, 0.0, 0, { seat: chairSeat / TOT }, TOT), {
      stage: 'child',
      gender: 'female',
      seat: chairSeat,
      legs: () => ({ l: v3(0.07, 0.13, 0.2), r: v3(-0.07, 0.13, 0.2) }),
    });
    // The 담임 being watched building (입문), and the student's stool and notebook.
    const mentor = figure(use, TEACHER, teach.x, teach.z, Math.PI, 'floor', 1);
    mentor.root.position.y = mat;
    const stool = group(use, W / 2 - 0.16, 0, 0.66);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(stool, cyl(0.014, 0.013, 0.28, 8), BIRCH_DARK, sx * 0.1, 0.14, sz * 0.1, { outline: false });
    part(stool, cyl(0.15, 0.15, 0.03, 16), '#ffab91', 0, 0.295, 0);
    const stoolYaw = Math.PI + 0.45;
    const noteAt = marker(g, W / 2 - 0.16 + Math.sin(stoolYaw) * 0.34, 0.47, 0.66 + Math.cos(stoolYaw) * 0.34);
    // The clipboard held up before them, tipped back to be written on (its +z back to the student).
    const clip = group(use, noteAt.position.x, noteAt.position.y - 0.01, noteAt.position.z, stoolYaw + Math.PI);
    part(clip, rbox(0.2, 0.26, 0.012, 0.006), '#8d6e63', 0, 0, 0, { rx: -(Math.PI / 2 - 0.6) });
    picture(clip, painted('cc-notebook', 160, 120, paintNotebook), 0.18, 0.13, 0, 0.008 * Math.cos(0.6), 0.008 * Math.sin(0.6), '#ffffff', 0, -(Math.PI / 2 - 0.6));
    // 그리기 놀이: a drawing board on the mat between them.
    const drawSet = group(use);
    const boardAt = v3(towerAt.x, mat + 0.012, towerAt.z + 0.06);
    part(drawSet, rbox(0.42, 0.012, 0.32, 0.006), '#f5f5f5', boardAt.x, boardAt.y - 0.006, boardAt.z);
    flat(drawSet, painted('cc-kid-art-9', 96, 72, kidDrawing(9)), 0.36, 0.26, boardAt.x, boardAt.y + 0.002, boardAt.z);
    const drawAt = marker(g, boardAt.x, boardAt.y + 0.01, boardAt.z + 0.06);
    const drawCrayon = crayon(drawSet, '#1e88e5');

    const spots: Record<string, Spot> = {
      buildBlocks: play,
      childcareTeacher_inclusivePlay: (() => {
        const s = blocksSpot();
        s.work = workAt;
        return s;
      })(),
      kindergartenTeacher_observeMentor: sitAt(g, W / 2 - 0.16, 0.31, 0.66, stoolYaw, 'write', noteAt),
      occupationalTherapist_artPlay: sitAt(g, teach.x, teach.y, teach.z, Math.PI, 'write', drawAt, true),
      '*': play,
    };
    out.spots = spots;
    out.work = workAt;
    const tp = new THREE.Vector3();
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const watching = now === 'kindergartenTeacher_observeMentor';
      const drawing = now === 'occupationalTherapist_artPlay';
      const building = now !== null && !drawing;
      towerSet.visible = building;
      drawSet.visible = drawing;
      kid.root.visible = now !== null;
      friend.root.visible = now === 'childcareTeacher_inclusivePlay';
      chair.visible = friend.root.visible;
      mentor.root.visible = watching;
      stool.visible = clip.visible = watching;
      if (now === null) return;
      kid.root.position.y = mat;
      if (drawing) {
        // The child drawing too, across the board.
        const scrib = boardAt.clone().add(v3(0.05 * wave(t, 1.3), 0.012, -0.06 + 0.03 * wave(t, 0.7)));
        kid.armR(scrib);
        kid.armL(boardAt.clone().add(v3(0.14, 0.01, -0.1)));
        aim(drawCrayon, scrib.clone().addScaledVector(UP, 0.035), scrib.clone().addScaledVector(UP, -0.03));
        drawCrayon.rotateX(Math.PI / 2);
        kid.head.rotation.set(0.4, 0, 0);
        kid.face('calm');
        return;
      }
      // The tower, as high as the round has it, toppling at the end of the fourth.
      const s = watching ? play : spots[now!];
      const b = blocksBeat(t, phaseOf(s));
      const tw = towerOf(b);
      const sz = BLOCKS_AT.size;
      tower.forEach((m, i) => {
        m.visible = i < tw.up;
        const y = towerAt.y + sz / 2 + i * sz;
        if (tw.topple > 0) {
          const f = tw.topple;
          m.position.set(towerAt.x + Math.sin(i * 1.7 + 0.4) * 0.28 * f, THREE.MathUtils.lerp(y, mat + sz / 2, Math.min(1, f * 1.3)), towerAt.z + Math.cos(i * 2.3) * 0.22 * f);
          m.rotation.set(f * (i % 2 ? 1.2 : -0.9), i * 0.5 * f, f * (i % 3 ? 1.3 : -1.1));
        } else {
          m.position.set(towerAt.x + 0.004 * Math.sin(i * 2.1), y, towerAt.z);
          m.rotation.set(0, 0.06 * Math.sin(i * 1.3), 0);
        }
      });
      // The teacher's block in hand (or the 담임's, when she's the one building).
      const { k, l, r } = handsAt(s, 'ccBlocks', t);
      inHand.visible = blockInHand(b);
      if (inHand.visible) inHand.position.copy(r).addScaledVector(UP, -0.03);
      if (watching) {
        mentor.armL(l);
        mentor.armR(r);
        mentor.head.rotation.set(0.15 + k.nod * 0.6, 0, 0);
      }
      // The toddler: watching, reaching to put theirs on in the teacher's 'watch', clapping in the clap.
      const top = towerAt.clone().setY(towerAt.y + (tw.up + 0.6) * sz);
      kidBlock.visible = false;
      if (b.from === 'watch' && b.e === 0 && b.p > 0.15 && b.p < 0.55) {
        const u = sstep(b.p, 0.15, 0.5);
        const hand = kidPile.clone().lerp(top, u);
        tp.copy(hand).addScaledVector(UP, Math.sin(u * Math.PI) * 0.12);
        kid.armR(tp);
        kidBlock.visible = true;
        kidBlock.position.copy(tp).addScaledVector(UP, -0.03);
        kid.face('smile');
      } else if (b.from === 'clap') {
        const c = 0.04 * Math.abs(wave(t, 2.4));
        kid.armL(on(kid, 0.03 + c, 0.75, 0.3));
        kid.armR(on(kid, -0.03 - c, 0.75, 0.3));
        kid.face('smile');
      } else {
        kid.armL(null);
        kid.armR(null);
        kid.face(tw.up > 4 ? 'smile' : 'calm');
      }
      kid.head.rotation.set(0.25 - 0.04 * tw.up, 0.05 * wave(t, 0.2), 0);
      if (friend.root.visible) {
        const clap = b.from === 'clap';
        const c = 0.04 * Math.abs(wave(t, 2.2, 0.3));
        friend.armL(clap ? on(friend, 0.03 + c, 1.1, 0.3) : null);
        friend.armR(clap ? on(friend, -0.03 - c, 1.1, 0.3) : on(friend, -0.08, 0.95, 0.38));
        friend.face(clap || tw.up > 3 ? 'smile' : 'calm');
      }
    };
  },

  /**
   * The snack counter (간식대): a low cupboard topped in mint with a fruit decal on its doors; on top a
   * tray of four little cups, a jug of milk, a plate of apple slices and banana, a box of rice
   * crackers, the napkins, the 알레르기 card; this week's snack chart on the wall. Getting the snack
   * ready: the milk poured into each cup in turn (each fills as it's poured), the jug set down, the
   * apple laid out with the tongs, the allergy card checked against the tray. The teachers' meeting
   * (리더): stood at it with the notebook, the agenda pinned up by the chart.
   */
  snackCounter(g, W, D, _c, _def, ctx, out) {
    const top = 0.86;
    const cw = W - 0.08;
    const cd = 0.56;
    const cz = -D / 2 + cd / 2 + 0.02;
    part(g, rbox(cw, top - 0.06, cd, 0.02), '#fafafa', 0, (top - 0.06) / 2 + 0.02, cz);
    part(g, rbox(cw + 0.02, 0.04, cd + 0.02, 0.012), '#a5d6a7', 0, top - 0.02, cz);
    for (const sx of [-1, 1]) {
      part(g, rbox(cw / 2 - 0.03, top - 0.16, 0.012, 0.01), '#e8f5e9', sx * (cw / 4), (top - 0.12) / 2 + 0.06, cz + cd / 2 + 0.002);
      part(g, cyl(0.012, 0.012, 0.012, 10), '#66bb6a', sx * 0.04, top - 0.22, cz + cd / 2 + 0.012, { rx: Math.PI / 2, outline: false });
    }
    // An apple and a banana stuck on the doors.
    part(g, ball(0.06), '#ef5350', -cw / 4, 0.42, cz + cd / 2 + 0.01, { outline: false }).scale.set(1, 1, 0.2);
    part(g, box(0.012, 0.03, 0.01), '#6d4c41', -cw / 4, 0.49, cz + cd / 2 + 0.012, { outline: false });
    part(g, ring(0.06, 0.018, Math.PI * 0.7), '#fdd835', cw / 4, 0.44, cz + cd / 2 + 0.012, { outline: false, rz: Math.PI * 1.15 });
    // The things on top: the stand spot's frame puts the cups, the jug, the plate and the card.
    const stand = standAt(g, 0, cz + cd / 2 + 0.06 + 0.12, Math.PI, 'ccSnack');
    const L = (p: Loc) => inFrame(stand, p);
    const trayZ = L([0, 0, SNACK_AT.cupAhead]).z;
    part(g, rbox(0.5, 0.015, 0.16, 0.02), '#ffcc80', 0, top + 0.008, trayZ);
    const cups = SNACK_AT.cups.map((x, i) => {
      const p = L([x, 0, SNACK_AT.cupAhead]);
      const c = group(g, p.x, top + 0.016, p.z);
      part(c, cyl(0.032, 0.026, 0.075, 14), PASTEL[(i * 2 + 1) % PASTEL.length], 0, 0.0375, 0);
      part(c, ring(0.032, 0.004), '#ffffff', 0, 0.075, 0, { rx: Math.PI / 2, outline: false });
      part(c, ball(0.012), '#ffffff', 0, 0.04, 0.03, { outline: false }).scale.set(1, 1, 0.3);
      const milk = part(c, cyl(0.028, 0.025, 0.01, 14), '#fffef7', 0, 0.01, 0, { outline: false });
      return { c, milk };
    });
    const jugHome = L(SNACK_AT.jug);
    const jug = group(g, jugHome.x, top, jugHome.z);
    const jugBody = group(jug);
    part(jugBody, cyl(0.05, 0.055, 0.16, 16), '#ffffff', 0, 0.08, 0);
    part(jugBody, box(0.06, 0.04, 0.005), '#42a5f5', 0, 0.09, 0.054, { outline: false });
    label(jugBody, '우유', 0.05, 0.022, 0, 0.09, 0.058, '#42a5f5', '#ffffff');
    part(jugBody, cyl(0.012, 0.028, 0.04, 10), '#ffffff', -0.05, 0.155, 0, { rz: 0.9 });
    part(jugBody, ring(0.035, 0.008, Math.PI), '#ffffff', 0.055, 0.09, 0, { rz: -Math.PI / 2 });
    const plateAt = L(SNACK_AT.plate);
    part(g, cyl(0.1, 0.085, 0.015, 20), '#ffffff', plateAt.x, top + 0.008, plateAt.z);
    const slices: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const sl = part(g, cyl(0.03, 0.03, 0.014, 10, ), i % 2 ? '#fff9c4' : '#fffde7', plateAt.x + Math.cos(a) * 0.06, top + 0.022, plateAt.z + Math.sin(a) * 0.05, { rz: Math.PI / 2, ry: a, outline: false });
      sl.scale.set(1, 1, 0.5);
      part(sl, box(0.004, 0.018, 0.06), '#e53935', 0.0, 0.0, -0.028, { outline: false });
      slices.push(sl);
    }
    const tongs = group(g, plateAt.x + 0.13, top + 0.012, plateAt.z, 0.3);
    for (const s of [-1, 1]) part(tongs, rbox(0.012, 0.006, 0.14, 0.003), '#9e9e9e', s * 0.008, 0, 0, { outline: false });
    const cardAt = L(SNACK_AT.card);
    const card = group(g, cardAt.x, top + 0.002, cardAt.z);
    picture(card, painted('cc-allergy', 96, 64, paintAllergy), 0.11, 0.075, 0, 0.04, 0, '#ffffff', 0, -0.25);
    // Rice crackers and the napkins at the back.
    const crackers = group(g, -cw / 2 + 0.14, top, cz - cd / 2 + 0.1);
    part(crackers, rbox(0.13, 0.14, 0.07, 0.01), '#fff3e0', 0, 0.07, 0);
    label(crackers, '쌀과자', 0.1, 0.035, 0, 0.09, 0.036, '#fff3e0', '#e65100');
    const nap = group(g, cw / 2 - 0.12, top, cz - cd / 2 + 0.1);
    part(nap, rbox(0.12, 0.05, 0.1, 0.01), '#80cbc4', 0, 0.025, 0);
    part(nap, box(0.1, 0.03, 0.08), '#ffffff', 0, 0.06, 0, { outline: false });
    // This week's snack chart and the meeting's agenda on the wall.
    let agendaAt: THREE.Object3D;
    if (ctx.againstWall) {
      picture(g, painted('cc-snack-menu', 192, 160, paintSnackMenu), 0.5, 0.42, -0.08, 1.38, -D / 2 + 0.015);
      part(g, rbox(0.52, 0.44, 0.01, 0.01), '#a5d6a7', -0.08, 1.38, -D / 2 + 0.008);
      const ag = picture(g, painted('cc-weekly-plan', 192, 136, paintWeeklyPlan), 0.22, 0.16, 0.32, 1.32, -D / 2 + 0.015);
      ag.rotation.z = 0.05;
      agendaAt = marker(g, 0.32, 1.32, -D / 2 + 0.02);
    } else agendaAt = marker(g, 0, top + 0.2, cz);
    // In use: the milk pouring, a mug of tea at a meeting.
    const use = group(g);
    out.inUse = use;
    const stream = limb(use, 0.006, '#fffef7');
    const streamMesh = use.children[use.children.length - 1];
    const mug = group(use, 0.2, top, cz + 0.12);
    part(mug, cyl(0.035, 0.032, 0.08, 14), '#5c6bc0', 0, 0.04, 0);
    part(mug, ring(0.022, 0.006, Math.PI), '#5c6bc0', 0.04, 0.045, 0, { rz: -Math.PI / 2 });
    const spots: Record<string, Spot> = {
      prepareSnack: stand,
      childcareTeacher_teacherMeeting: standAt(g, 0, cz + cd / 2 + 0.3, Math.PI, 'meeting', agendaAt),
      '*': stand,
    };
    out.spots = spots;
    const spoutPt = new THREE.Vector3();
    const cupTop = new THREE.Vector3();
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const prep = now === 'prepareSnack' || now === '*';
      mug.visible = now === 'childcareTeacher_teacherMeeting';
      streamMesh.visible = false;
      if (!prep) {
        jug.position.set(jugHome.x, top, jugHome.z);
        jug.rotation.set(0, 0, 0);
        jugBody.rotation.set(0, 0, 0);
        for (const c of cups) c.milk.visible = false;
        return;
      }
      const s = spots[now!];
      const b = snackBeat(t, phaseOf(s));
      const sn = snackOf(b);
      const { r } = handsAt(s, 'ccSnack', t);
      cups.forEach((c, i) => {
        const pouring = b.from === `pour${i}` && b.e === 0;
        const fill = i < sn.full ? 1 : pouring ? sstep(b.p, 0.25, 0.85) : 0;
        c.milk.visible = fill > 0.02;
        c.milk.scale.y = 1 + 5 * fill;
        c.milk.position.y = 0.01 + 0.025 * fill;
      });
      if (sn.held) {
        // The handle in the right hand, the jug tipped towards the cup it's over (to the dweller's left: -x here).
        jug.position.copy(r).add(v3(-0.06, -0.11, 0));
        jugBody.rotation.set(0, 0, 0.9 * sn.tip);
        if (sn.tip > 0.6) {
          jugBody.updateMatrixWorld(true);
          spoutPt.set(-0.062, 0.17, 0).applyEuler(jugBody.rotation).add(jug.position);
          const c = cups[sn.pour].c;
          cupTop.set(c.position.x, top + 0.06, c.position.z);
          stream(spoutPt, cupTop);
          streamMesh.visible = true;
        }
      } else {
        jug.position.set(jugHome.x, top, jugHome.z);
        jugBody.rotation.set(0, 0, 0);
      }
      // The apple laid out: one slice lifted with the tongs and set down, round and round.
      const fruit = amountOf(b, 'fruit');
      slices.forEach((sl, i) => (sl.position.y = top + 0.022 + (fruit > 0.5 && i === Math.floor(t * 0.6) % 6 ? 0.03 * Math.abs(wave(t, 0.6)) : 0)));
      tongs.visible = fruit < 0.5;
    };
  },

  /**
   * The nap mats (낮잠 매트): two thin mats with their pillows and name tags, the blankets folded at the
   * foot, a soft bunny; a moon sign over them. Settling a nap: sat cross-legged beside the nearer mat
   * where a toddler lies under the blanket (another already asleep on the other), patting their tummy
   * (토닥토닥), stroking their hair, tucking the blanket up, a finger to the lips — their eyes closing.
   * A toddler woken crying (the alarm): stood holding them on the hip, rocking side to side, patting
   * their back, wiping a tear, until they calm and lay their head down.
   */
  napMats(g, W, D, _c, _def, ctx, out) {
    const mz = -0.17;
    const mats = [-W / 4, W / 4];
    const matC = ['#f8bbd0', '#90caf9'];
    const names = ['하린', '도윤'];
    mats.forEach((x, i) => {
      part(g, rbox(W / 2 - 0.08, 0.05, 0.52, 0.025), matC[i], x, 0.025, mz);
      for (let j = 1; j < 4; j++) part(g, box(0.006, 0.004, 0.5), shade(matC[i], 0.88), x - (W / 2 - 0.08) / 2 + j * ((W / 2 - 0.08) / 4), 0.051, mz, { outline: false });
      // The pillow at the -x end, the name tag at the foot.
      part(g, rbox(0.2, 0.06, 0.3, 0.03), '#ffffff', x - W / 4 + 0.16, 0.08, mz);
      part(g, ball(0.03), matC[i], x - W / 4 + 0.16, 0.112, mz + 0.08, { outline: false }).scale.set(1, 0.3, 1);
      const tag = picture(g, tagTex(names[i], i * 2), 0.12, 0.05, x + W / 4 - 0.1, 0.06, mz + 0.262);
      tag.rotation.x = -0.3;
    });
    // The blankets folded at the foot (put away while the mats aren't in use) and a bunny.
    const folded = mats.map((x, i) => part(g, rbox(0.24, 0.09, 0.42, 0.03), i ? '#fff59d' : '#c5e1a5', x + W / 4 - 0.2, 0.095, mz));
    const bun = group(g, -W / 2 + 0.36, 0.05, mz + 0.18, 0.4);
    part(bun, ball(0.05), '#fafafa', 0, 0.05, 0);
    part(bun, ball(0.04), '#fafafa', 0, 0.12, 0.01);
    for (const s of [-1, 1]) part(bun, rbox(0.018, 0.08, 0.025, 0.008), '#fafafa', s * 0.02, 0.19, 0, { rz: s * 0.15 });
    if (ctx.againstWall) picture(g, painted('cc-nap-sign', 160, 64, paintNapSign), 0.42, 0.17, 0, 1.25, -D / 2 + 0.015);
    // In use: the toddlers on their mats.
    const use = group(g);
    out.inUse = use;
    const near = sleeper(use, KIDS[0], mats[1] - W / 4 + 0.22, mz, '#fff59d');
    const far = sleeper(use, KIDS[3], mats[0] - W / 4 + 0.22, mz, '#c5e1a5');
    const thrown = part(use, rbox(0.3, 0.12, 0.42, 0.04), '#fff59d', mats[1] + 0.25, 0.1, mz);
    // Laid under a blanket, and crying on a hip: a body neither lies down here nor cries, so these stay drawn.
    const held = figure(use, KIDS[0], 0, 0, 0, 'held', TOT);
    // Where the teacher sits for the nap, and stands to rock.
    const patX = mats[1] - 0.03;
    const settle = sitAt(g, patX, 0.012, mz + PAT_AT.tummy[2], Math.PI, 'ccPat', undefined, true);
    const tummy = inFrame(settle, PAT_AT.tummy);
    settle.work = marker(g, tummy.x, tummy.y, tummy.z);
    const rock = standAt(g, patX, mz + 0.62, Math.PI, 'ccRock');
    const spots: Record<string, Spot> = { settleNap: settle, sootheCrying: rock, '*': settle };
    out.spots = spots;
    out.work = settle.work;
    let lastT = -1e9;
    let since = 0;
    out.animate = (t) => {
      const now = nowAt(spots, t);
      folded.forEach((f) => (f.visible = now === null));
      if (now === null) return;
      const soothe = now === 'sootheCrying';
      // How long they've been at it (the toddler settles as it goes on).
      if (t - lastT > 1) since = t;
      lastT = t;
      const el = t - since;
      const breathe = (m: THREE.Mesh, ph: number) => (m.scale.y = 1 + 0.07 * wave(t, 0.28, ph));
      breathe(far.cover, 0.3);
      far.face('sleep');
      near.root.visible = !soothe;
      thrown.visible = soothe;
      held.root.visible = soothe;
      if (!soothe) {
        breathe(near.cover, 0);
        // Drowsy, the eyes opening now and then, then asleep.
        const drowsy = el < 14 && wave(t, 0.18) > 0.6;
        near.face(drowsy ? 'calm' : 'sleep');
        near.head.rotation.set(0, 0, 0.1 * wave(t, 0.1));
        return;
      }
      // The crying toddler held on the hip, facing the teacher, arms round the neck; calmer as they're rocked.
      const s = rock;
      const b = rockBeat(t, phaseOf(s));
      const { k } = handsAt(s, 'ccRock', t);
      const seat = inFrame(s, midLoc(k.l, [k.l[0] - 0.1, k.l[1], k.l[2]]));
      held.root.position.copy(seat).add(v3(0, 0.04, 0));
      held.root.rotation.y = s.at.rotation.y + Math.PI + 0.25;
      held.armL(inFrame(s, [0.14, 1.32, 0.06]));
      held.armR(inFrame(s, [-0.12, 1.34, 0.06]));
      const calm = sstep(el, 8, 20);
      const sob = calm < 0.5 ? 0.06 * Math.abs(wave(t, 1.6)) : 0;
      held.root.position.y += sob * 0.3;
      held.head.rotation.set(-0.1 + 0.4 * calm, 0.6 * calm, 0.3 * calm);
      held.face(calm > 0.85 ? 'sleep' : calm > 0.45 ? 'calm' : amountOf(b, 'look') > 0.5 && calm > 0.3 ? 'calm' : 'cry');
    };
  },

  /**
   * The cubbies and shoe shelf by the door (개인 사물함 · 신발장, new): a birch unit of five
   * cubbies, each with a name tag (an animal and the child's name), a hook with their little backpack
   * and a spare set of clothes folded inside, the shoe shelf below with each child's small shoes; a
   * 신발은 가지런히 sign on top. Tidying before going home: crouched to pair a child's shoes and set
   * them toes-in, up to hang their bag on its hook, the name tag straightened, on to the next.
   */
  ccCubbies(g, W, D, _c, _def, _ctx, out) {
    const uw = W - 0.12;
    const ud = 0.4;
    const uz = -D / 2 + ud / 2 + 0.02;
    const h = 1.32;
    const n = 5;
    const cw = uw / n;
    part(g, rbox(uw, 0.04, ud, 0.01), BIRCH, 0, h - 0.02, uz);
    part(g, rbox(uw, 0.04, ud, 0.01), BIRCH, 0, 0.02, uz);
    part(g, rbox(uw, h, 0.02, 0.01), '#fff8e1', 0, h / 2, uz - ud / 2 + 0.01);
    for (let i = 0; i <= n; i++) part(g, rbox(0.025, h, ud, 0.008), BIRCH_DARK, -uw / 2 + i * cw, h / 2, uz);
    // Shelves: the shoes (two rows), the cubbies with hooks, the top cubbies.
    for (const y of [0.26, 0.5, 1.12]) part(g, rbox(uw, 0.025, ud, 0.008), BIRCH, 0, y, uz);
    const stand = standAt(g, 0, uz + ud / 2 + TIDY_AT.face - 0.02, Math.PI, 'ccTidy');
    const colX = (i: number) => -uw / 2 + cw * (i + 0.5);
    const kidNames = ['하린', '도윤', '서아', '지호', '예준'];
    const shoesAll: THREE.Group[] = [];
    const bags: THREE.Group[] = [];
    for (let i = 0; i < n; i++) {
      const x = colX(i);
      const fz = uz + ud / 2;
      picture(g, tagTex(kidNames[i], i), cw - 0.05, 0.08, x, 1.19, fz + 0.002);
      // A spare set of clothes folded in the top cubby, the hook and its bag.
      part(g, rbox(cw - 0.1, 0.06, 0.2, 0.02), PASTEL[(i + 2) % PASTEL.length], x, 0.56, uz);
      part(g, rbox(cw - 0.12, 0.05, 0.18, 0.02), PASTEL[(i + 5) % PASTEL.length], x, 0.61, uz);
      part(g, cyl(0.008, 0.008, 0.06, 6), '#90a4ae', x, TIDY_AT.hook + 0.02, fz - 0.17, { rx: Math.PI / 2, outline: false });
      const bag = group(g, x, TIDY_AT.hook - 0.14, fz - 0.12);
      part(bag, rbox(0.2, 0.22, 0.1, 0.05), ANIMALS[(i + 1) % ANIMALS.length], 0, 0, 0);
      part(bag, rbox(0.14, 0.08, 0.02, 0.02), shade(ANIMALS[(i + 1) % ANIMALS.length], 0.85), 0, -0.04, 0.055);
      for (const sx of [-1, 1]) part(bag, ball(0.025), shade(ANIMALS[(i + 1) % ANIMALS.length], 0.8), sx * 0.07, 0.12, 0, { outline: false });
      rod(bag, v3(-0.03, 0.11, 0), v3(0, 0.15, -0.02), 0.006, '#5d4037');
      bags.push(bag);
      // The shoes on the shelf, toes in.
      const shoes = group(g, x, 0.04, uz + 0.04);
      for (const sx of [-1, 1]) {
        const sh = group(shoes, sx * 0.045, 0, 0);
        part(sh, rbox(0.07, 0.05, 0.14, 0.025), ['#ef5350', '#42a5f5', '#fdd835', '#66bb6a', '#ab47bc'][i], 0, 0.025, 0);
        part(sh, rbox(0.072, 0.012, 0.142, 0.006), '#ffffff', 0, 0.006, 0, { outline: false });
        part(sh, box(0.05, 0.004, 0.03), '#ffffff', 0, 0.051, 0.02, { outline: false });
      }
      shoesAll.push(shoes);
      // Indoor slippers on the upper shoe shelf.
      for (const sx of [-1, 1]) part(g, rbox(0.06, 0.03, 0.12, 0.02), '#fff3e0', x + sx * 0.04, 0.29, uz + 0.04);
    }
    picture(g, painted('cc-shoe-sign', 160, 40, (c) => {
      c.fillStyle = '#fff59d';
      c.fillRect(0, 0, 160, 40);
      text(c, '신발은 가지런히!', 80, 21, 17, '#e65100', 'center');
    }), 0.5, 0.12, 0, h + 0.08, uz - ud / 2 + 0.05);
    out.spots = { ccTidyCubbies: stand, '*': stand };
    // The bag's column for this round: askew shoes paired, the bag in the hand and then hung.
    const spot0 = stand;
    const colIndex = (c: number) => Math.round((-TIDY_AT.cols[c]) / cw) + Math.floor(n / 2);
    out.animate = (t) => {
      const now = nowAt(out.spots!, t);
      for (let i = 0; i < n; i++) {
        shoesAll[i].rotation.y = 0;
        shoesAll[i].position.set(colX(i), 0.04, uz + 0.04);
        bags[i].position.set(colX(i), TIDY_AT.hook - 0.14, uz + ud / 2 - 0.12);
        bags[i].rotation.set(0, 0, 0);
      }
      if (now === null) {
        // Left a little untidy until someone sees to it: one pair askew.
        shoesAll[1].rotation.y = 0.5;
        shoesAll[1].position.z = uz + 0.12;
        return;
      }
      const b = tidyBeat(t, phaseOf(spot0));
      const col = colIndex(tidyCol(b));
      const { r } = handsAt(spot0, 'ccTidy', t);
      const sh = shoesAll[col];
      const fixed = b.from !== 'shoes' || b.p > 0.7;
      if (!fixed) {
        const u = sstep(b.p, 0.2, 0.7);
        sh.rotation.y = 0.6 * (1 - u);
        sh.position.z = uz + 0.14 - 0.1 * u;
      }
      const bag = bags[col];
      if (b.from === 'shoes' || (b.from === 'bag' && b.p < 0.4)) {
        // The bag waiting on the floor in front of its cubby, then lifted.
        if (b.from === 'shoes') bag.position.set(colX(col) + 0.12, 0.12, uz + ud / 2 + 0.08);
        else bag.position.copy(r).add(v3(0, -0.14, 0));
        bag.rotation.set(0, 0, b.from === 'shoes' ? 0.25 : 0);
      }
    };
  },

  /**
   * The 출석 · 알림 board by the door (new): a cork board framed in yellow with the 햇살반 register —
   * the eight children's names with Monday's smiley stickers and today's column waiting — the date and
   * the weather, 오늘의 한마디, a pocket of 알림장 notebooks and a sheet of stickers on a string. Taking
   * the register: a sticker peeled off and pressed on by the next name (one a round, the column filling
   * as the morning goes), smoothed down, a word written in the box.
   */
  ccAttendanceBoard(g, _W, D, _c, _def, _ctx, out) {
    const face = -D / 2 + 0.03;
    const bw = 0.92;
    const bh = 0.72;
    const by = 1.2;
    part(g, rbox(bw + 0.06, bh + 0.06, 0.03, 0.02), '#ffca28', 0, by, face - 0.012);
    picture(g, painted('cc-attendance', 360, 280, paintAttendance), bw, bh, 0, by, face + 0.005);
    // The 알림장 pocket below and the sticker sheet on its string.
    part(g, rbox(0.5, 0.16, 0.06, 0.02), '#4fc3f7', -0.1, 0.72, face + 0.02);
    label(g, `${CENTRE} 알림장`, 0.36, 0.05, -0.1, 0.76, face + 0.052, '#4fc3f7', '#ffffff');
    for (let i = 0; i < 5; i++) part(g, rbox(0.08, 0.12, 0.012, 0.004), PASTEL[i], -0.3 + i * 0.1, 0.82, face + 0.015);
    const sheet = group(g, 0.34, 0.74, face + 0.02);
    part(sheet, rbox(0.12, 0.16, 0.005, 0.003), '#ffffff', 0, 0, 0);
    for (let i = 0; i < 6; i++) part(sheet, cyl(0.016, 0.016, 0.004, 12), '#ffd54f', -0.03 + (i % 2) * 0.06, 0.05 - Math.floor(i / 2) * 0.05, 0.004, { rx: Math.PI / 2, outline: false });
    rod(g, v3(0.34, 0.82, face + 0.02), v3(0.38, 0.95, face + 0.01), 0.002, '#8d6e63');
    // The board's own stand spot, and today's stickers (one per row, by the round).
    const stand = standAt(g, 0, face + STICKER_AT.face + 0.01, Math.PI, 'ccSticker');
    // Today's column on the painted board: x of the 화 column, and each row's height.
    const colX = -bw / 2 + (12 + 84 + 24 * 1.5) * (bw / 360);
    const rowY = (j: number) => by + bh / 2 - (64 + j * 26) * (bh / 280);
    const stickers = NAMES.map((_, j) => {
      const s = part(g, cyl(0.018, 0.018, 0.004, 14), '#ffd54f', colX, rowY(j), face + 0.009, { rx: Math.PI / 2, outline: false });
      for (const sx of [-1, 1]) part(s, box(0.004, 0.002, 0.004), '#5d4037', sx * 0.006, 0.003, -0.004, { outline: false });
      return s;
    });
    const use = group(g);
    out.inUse = use;
    const inHand = part(use, cyl(0.018, 0.018, 0.004, 14), '#ffd54f', 0, 0, 0, { rx: Math.PI / 2, outline: false });
    const pen = part(use, cyl(0.005, 0.005, 0.12, 8), '#e91e63', 0, 0, 0, { outline: false });
    out.spots = { ccTakeAttendance: stand, '*': stand };
    out.animate = (t) => {
      const now = nowAt(out.spots!, t);
      inHand.visible = pen.visible = false;
      if (now === null) {
        // Not taken yet today, or all in: show the morning so far.
        stickers.forEach((s, j) => (s.visible = j < 3));
        return;
      }
      const b = stickerBeat(t, phaseOf(stand));
      const row = stickerRow(b);
      const on = stuck(b);
      stickers.forEach((s, j) => (s.visible = j < row || (j === row && on)));
      const { r } = handsAt(stand, 'ccSticker', t);
      if (!on && (b.from === 'peel' || b.from === 'stick')) {
        inHand.visible = true;
        inHand.position.copy(r).add(v3(0, 0, -0.015));
      }
      if (b.from === 'write' && b.e < 0.5) {
        pen.visible = true;
        aim(pen, r.clone().add(v3(0, 0.05, 0.03)), r.clone().add(v3(0, -0.03, -0.03)));
        pen.rotateX(Math.PI / 2);
      }
    };
  },

  /**
   * The little sinks (유아용 세면대, new): a low counter at a toddler's height with two round basins,
   * short lever taps, soap pumps shaped like a duck and a bear, round mirrors with animal ears, a row of
   * named toothbrush cups between the basins, a paper towel box, the 손 씻기 6단계 poster over it.
   * Washing a toddler's hands: crouched behind them at the basin, the tap on, their hands wet, a pump of
   * soap, rubbed together (bubbles), rinsed, the tap off, patted dry with a towel, a high five.
   */
  ccKidSink(g, W, D, _c, _def, ctx, out) {
    const top = 0.55;
    const cd = 0.5;
    const cz = -D / 2 + cd / 2 + 0.02;
    part(g, rbox(W - 0.1, top - 0.08, cd, 0.02), '#e0f7fa', 0, (top - 0.08) / 2 + 0.04, cz);
    part(g, rbox(W - 0.08, 0.04, cd + 0.02, 0.015), '#ffffff', 0, top - 0.02, cz);
    for (let i = 0; i < 4; i++) part(g, rbox((W - 0.2) / 4 - 0.02, top - 0.18, 0.012, 0.01), ['#80deea', '#b2ebf2', '#80deea', '#b2ebf2'][i], -W / 2 + 0.1 + ((W - 0.2) / 4) * (i + 0.5), (top - 0.12) / 2 + 0.05, cz + cd / 2 + 0.002);
    const basins = [-W / 4 + 0.05, W / 4 - 0.05];
    const wash = standAt(g, basins[0], cz + 0.03 + WASH_AT.water[2], Math.PI, 'ccWash');
    const Lw = (p: Loc) => inFrame(wash, p);
    const water = Lw(WASH_AT.water);
    const taps: THREE.Vector3[] = [];
    basins.forEach((x, i) => {
      const bz = water.z;
      part(g, cyl(0.16, 0.13, 0.012, 24), '#f5f5f5', x, top + 0.002, bz).scale.set(1, 1, 0.75);
      part(g, cyl(0.135, 0.11, 0.01, 24), '#cfd8dc', x, top + 0.006, bz).scale.set(1, 1, 0.72);
      // The tap: a short neck at the back, the spout over the basin, a lever on top.
      const tz = bz - 0.15;
      part(g, cyl(0.016, 0.018, 0.13, 10), '#cfd8dc', x, top + 0.065, tz);
      part(g, cyl(0.012, 0.012, 0.09, 10), '#cfd8dc', x, top + 0.125, tz + 0.04, { rx: Math.PI / 2 });
      part(g, rbox(0.014, 0.01, 0.06, 0.004), i ? '#42a5f5' : '#ef5350', x, top + 0.145, tz - 0.01);
      taps.push(v3(x, top + 0.12, tz + 0.085));
      // The soap pump: a duck by the left basin, a bear by the right.
      const pump = group(g, x - 0.17, top, bz - 0.08);
      part(pump, cyl(0.035, 0.04, 0.1, 14), i ? '#a1887f' : '#fdd835', 0, 0.05, 0);
      part(pump, ball(0.03), i ? '#a1887f' : '#fdd835', 0, 0.12, 0);
      part(pump, cyl(0.006, 0.006, 0.03, 6), '#ffffff', 0, 0.16, 0, { outline: false });
      part(pump, rbox(0.03, 0.008, 0.012, 0.004), '#ffffff', 0, 0.175, 0.01, { outline: false });
      if (i) for (const sx of [-1, 1]) part(pump, ball(0.012), '#8d6e63', sx * 0.022, 0.145, 0, { outline: false });
      else part(pump, cyl(0.0, 0.012, 0.02, 6), '#ff9800', 0, 0.12, 0.032, { rx: Math.PI / 2, outline: false });
      // The round mirror with animal ears.
      if (ctx.againstWall) {
        const my = 0.92;
        part(g, cyl(0.19, 0.19, 0.02, 24), PASTEL[i ? 3 : 0], x, my, -D / 2 + 0.012, { rx: Math.PI / 2 });
        part(g, cyl(0.165, 0.165, 0.01, 24), '#e1f5fe', x, my, -D / 2 + 0.024, { rx: Math.PI / 2, outline: false, material: new THREE.MeshBasicMaterial({ color: '#e1f5fe' }) }).userData.ownMaterial = true;
        for (const sx of [-1, 1]) part(g, cyl(0.06, 0.06, 0.02, 16), PASTEL[i ? 3 : 0], x + sx * 0.14, my + 0.15, -D / 2 + 0.01, { rx: Math.PI / 2 });
      }
    });
    // Toothbrush cups between the basins, each with a name.
    for (let i = 0; i < 5; i++) {
      const x = -0.2 + i * 0.1;
      part(g, cyl(0.025, 0.022, 0.08, 12), PASTEL[i], x, top + 0.04, cz - cd / 2 + 0.08);
      part(g, cyl(0.004, 0.004, 0.12, 6), CRAYONS[i], x + 0.005, top + 0.1, cz - cd / 2 + 0.08, { rz: 0.15, outline: false });
      part(g, rbox(0.012, 0.025, 0.012, 0.004), '#ffffff', x + 0.014, top + 0.16, cz - cd / 2 + 0.08, { outline: false });
    }
    // The towel box and the poster.
    if (ctx.againstWall) {
      part(g, rbox(0.24, 0.16, 0.1, 0.02), '#ffffff', 0, 0.9, -D / 2 + 0.06);
      part(g, box(0.12, 0.04, 0.02), '#f5f5f5', 0, 0.81, -D / 2 + 0.1, { outline: false });
      picture(g, painted('cc-handwash', 200, 160, paintHandwash), 0.42, 0.34, 0, 1.36, -D / 2 + 0.015);
    }
    // In use: the toddler at the basin, the water, the bubbles, the towel.
    const use = group(g);
    out.inUse = use;
    const tot = played(figure(use, KIDS[4], 0, 0, Math.PI, 'stand', TOT), { stage: 'toddler', gender: 'male' });
    const stream = limb(use, 0.008, '#b3e5fc', new THREE.MeshBasicMaterial({ color: '#b3e5fc', transparent: true, opacity: 0.75 }));
    const streamMesh = use.children[use.children.length - 1];
    (streamMesh as THREE.Mesh).userData.ownMaterial = true;
    const bubbles = Array.from({ length: 7 }, () => part(use, ball(0.016), '#ffffff', 0, 0, 0, { outline: false }));
    const towel = part(use, rbox(0.14, 0.004, 0.12, 0.002), '#ffffff', 0, 0, 0, { outline: false });
    out.spots = { ccWashHands: wash, '*': wash };
    out.animate = (t) => {
      const now = nowAt(out.spots!, t);
      if (now === null) return;
      const s = wash;
      const b = washBeat(t, phaseOf(s));
      const w = washOf(b);
      const { l, r } = handsAt(s, 'ccWash', t);
      // The toddler stood in front at the basin, their hands with the teacher's (between them).
      const at = inFrame(s, [0, 0, 0.22]);
      tot.root.position.copy(at);
      tot.root.rotation.y = s.at.rotation.y;
      const five = b.from === 'five';
      if (five) {
        tot.armL(null);
        tot.armR(r.clone().add(v3(0.02, 0.01, 0)));
        tot.head.rotation.set(-0.5, 0.6, 0);
        tot.face('smile');
      } else {
        tot.armL(l.clone().lerp(r, 0.25).addScaledVector(UP, -0.01));
        tot.armR(r.clone().lerp(l, 0.25).addScaledVector(UP, -0.01));
        tot.head.rotation.set(0.35, 0, 0);
        tot.face(b.from === 'rub' ? 'smile' : 'calm');
      }
      const tap = taps[0];
      streamMesh.visible = w.running;
      if (w.running) stream(tap, v3(tap.x, top + 0.01, tap.z + 0.01 * wave(t, 3)));
      const mid = l.clone().lerp(r, 0.5);
      bubbles.forEach((m, i) => {
        m.visible = w.soapy;
        if (!w.soapy) return;
        const a = i * 0.9 + t * 0.8;
        m.position.set(mid.x + Math.cos(a) * 0.05, mid.y + 0.02 + Math.sin(a * 1.3) * 0.02, mid.z + Math.sin(a) * 0.04);
        m.scale.setScalar(0.7 + 0.3 * Math.abs(Math.sin(a * 2)));
      });
      towel.visible = b.from === 'towel';
      if (towel.visible) towel.position.copy(mid).addScaledVector(UP, 0.03);
    };
  },

  /**
   * The indoor slide (실내 미끄럼틀, new): a toddler-sized slide in yellow and orange — three wide
   * steps with handrails up to a little platform under a striped canopy with a flag, the chute
   * running down to the front onto a soft blue landing mat. Spotting: stood at the foot of the chute,
   * the arms out while the toddler climbs and sits at the top; caught as they whizz down (hands up,
   * 와!), lifted off onto their feet, a clap as they run round to go again.
   */
  ccSlide(g, _W, D, _c, _def, _ctx, out) {
    const topY = 0.66;
    const backZ = -D / 2 + 0.12;
    const platZ = -D / 2 + 0.42;
    const endZ = D / 2 - 0.16;
    const endY = 0.12;
    const yellow = '#ffd54f';
    const orange = '#ff7043';
    // The steps at the back, the platform and its rails.
    for (let i = 0; i < 3; i++) {
      const y = 0.16 + i * 0.17;
      part(g, rbox(0.42, 0.05, 0.16, 0.02), '#4fc3f7', 0, y, backZ + i * 0.07);
    }
    for (const sx of [-1, 1]) {
      part(g, rbox(0.05, topY + 0.02, 0.36, 0.02), yellow, sx * 0.24, (topY + 0.02) / 2, backZ + 0.14);
      rod(g, v3(sx * 0.24, topY + 0.02, backZ + 0.0), v3(sx * 0.24, topY + 0.32, platZ - 0.02), 0.02, '#66bb6a');
      for (const z of [backZ + 0.02, platZ + 0.1]) part(g, cyl(0.03, 0.03, topY + 0.42, 10), yellow, sx * 0.24, (topY + 0.42) / 2, z);
    }
    part(g, rbox(0.46, 0.06, 0.32, 0.02), yellow, 0, topY, platZ - 0.06);
    // The canopy: stripes and a flag.
    for (let i = 0; i < 4; i++) part(g, rbox(0.13, 0.03, 0.42, 0.01), i % 2 ? '#ffffff' : '#ef5350', -0.18 + i * 0.12, topY + 0.44, platZ - 0.06, { rz: (i < 2 ? 1 : -1) * 0.25 });
    part(g, cyl(0.006, 0.006, 0.22, 6), '#795548', 0, topY + 0.58, platZ - 0.06, { outline: false });
    part(g, box(0.12, 0.07, 0.004), '#29b6f6', 0.06, topY + 0.65, platZ - 0.06, { outline: false });
    // The chute down to the front.
    const len = Math.hypot(endZ - platZ, topY - endY);
    const ang = Math.atan2(topY - endY, endZ - platZ);
    const chute = group(g, 0, (topY + endY) / 2 + 0.02, (platZ + endZ) / 2);
    chute.rotation.x = ang;
    part(chute, rbox(0.4, 0.03, len, 0.015), orange, 0, 0, 0);
    for (const sx of [-1, 1]) part(chute, rbox(0.04, 0.1, len, 0.015), shade(orange, 0.9), sx * 0.2, 0.05, 0);
    part(g, rbox(0.4, 0.03, 0.14, 0.015), orange, 0, endY + 0.015, endZ + 0.05);
    for (const sx of [-1, 1]) part(g, cyl(0.025, 0.025, endY + 0.25, 10), yellow, sx * 0.21, (endY + 0.25) / 2, endZ - 0.3);
    // The soft landing mat.
    part(g, rbox(0.6, 0.06, 0.24, 0.03), '#5c6bc0', 0, 0.03, D / 2 - 0.1);
    const catcher = standAt(g, 0, endZ + CATCH_AT.end[2] - 0.02, Math.PI, 'ccCatch');
    out.spots = { ccSpotSlide: catcher, '*': catcher };
    // In use: the toddler going round.
    const use = group(g);
    out.inUse = use;
    // A child in trousers (2026-11-01, at the user's request): nothing to ride up on the way down the chute.
    const drawnWalker = figure(use, KIDS[3], 0, 0, 0, 'stand', TOT);
    const drawnRider = figure(use, KIDS[3], 0, 0, 0, 'held', TOT);
    // One toddler, so one body: it stands in the walker's place and sits in the rider's, the legs down the chute.
    const onChute = new THREE.Vector3();
    const sat: FigureOptions = {
      stage: 'toddler',
      gender: 'male',
      wearing: 'jiho',
      hide: [...drawnRider.root.children],
      legs: () => {
        const a = drawnRider.root.rotation.x;
        if (sat.seat === undefined || a < 0.02) return {};
        onChute.set(0, 0.03 - Math.sin(a) * 0.28, Math.cos(a) * 0.28).add(drawnRider.root.position);
        return { l: onChute.clone().setX(onChute.x + 0.05), r: onChute.clone().setX(onChute.x - 0.05) };
      },
    };
    const walker = played(drawnWalker, sat);
    const bodied = () => !drawnWalker.root.children[0].visible;
    const rider: Figure = {
      ...drawnRider,
      armL(to) {
        drawnRider.armL(to);
        walker.armL(to);
      },
      armR(to) {
        drawnRider.armR(to);
        walker.armR(to);
      },
    };
    const down = inFrame(catcher, CATCH_AT.down);
    const foot = v3(-0.38, 0, backZ - 0.02);
    const side = v3(-0.38, 0, 0.3);
    const seatTop = v3(0, topY + 0.04, platZ - 0.02);
    const seatEnd = v3(0, endY + 0.05, endZ + 0.02);
    const along = (u: number) => seatTop.clone().lerp(seatEnd, u);
    out.animate = (t) => {
      const now = nowAt(out.spots!, t);
      if (now === null) return;
      const s = catcher;
      const b = catchBeat(t, phaseOf(s));
      const { l, r } = handsAt(s, 'ccCatch', t);
      walker.root.visible = false;
      rider.root.visible = false;
      const walk = (from: THREE.Vector3, to: THREE.Vector3, u: number) => {
        walker.root.visible = true;
        walker.root.position.copy(from).lerp(to, u);
        walker.root.position.y = Math.abs(Math.sin(u * Math.PI * 6)) * 0.02 + from.y + (to.y - from.y) * u;
        const d = to.clone().sub(from);
        walker.root.rotation.y = Math.atan2(d.x, d.z);
        walker.armL(null);
        walker.armR(null);
        walker.face('smile');
      };
      if (b.from === 'ready' && b.e === 0) {
        const p = b.p;
        if (p < 0.25) walk(side, foot, p / 0.25);
        else if (p < 0.62) {
          // Up the steps, the hands on the rails.
          const u = (p - 0.25) / 0.37;
          walker.root.visible = true;
          walker.root.position.set(THREE.MathUtils.lerp(foot.x, 0, sstep(u, 0, 0.2)), THREE.MathUtils.lerp(0.04, topY + 0.03, sstep(u, 0.15, 1)), THREE.MathUtils.lerp(backZ - 0.02, platZ - 0.12, u));
          walker.root.rotation.y = 0;
          walker.armL(on(walker, 0.36, 0.95, 0.2));
          walker.armR(on(walker, -0.36, 0.95, 0.2));
          walker.face('smile');
        } else {
          rider.root.visible = true;
          rider.root.position.copy(seatTop);
          rider.root.rotation.set(ang, 0, 0);
          rider.armL(on(rider, 0.4, 0.2, 0.0));
          rider.armR(on(rider, -0.4, 0.2, 0.0));
          rider.face('smile');
        }
      } else if (b.from === 'ready' || b.from === 'catch') {
        const u = b.from === 'ready' ? 0 : b.e > 0 ? 1 : Math.min(1, (b.p / 0.8) ** 2);
        rider.root.visible = true;
        rider.root.position.copy(along(u));
        rider.root.rotation.set(ang * (1 - u * 0.9), 0, 0);
        // Hands up on the way down!
        rider.armL(on(rider, 0.2, 0.95, 0.15));
        rider.armR(on(rider, -0.2, 0.95, 0.15));
        rider.face('smile');
      } else if (b.from === 'lift') {
        rider.root.visible = true;
        const mid = l.clone().lerp(r, 0.5);
        rider.root.position.copy(mid).add(v3(0, -0.08, 0));
        rider.root.rotation.set(0, 0, 0);
        rider.armL(l.clone().add(v3(0, 0.12, 0)));
        rider.armR(r.clone().add(v3(0, 0.12, 0)));
        rider.face('smile');
      } else {
        // Set down beside the teacher, a clap, then off round to the steps again.
        const p = b.e > 0 ? 1 : b.p;
        if (p < 0.4) {
          walker.root.visible = true;
          walker.root.position.copy(down);
          walker.root.rotation.y = s.at.rotation.y + Math.PI;
          const c = 0.04 * Math.abs(wave(t, 2.4));
          walker.armL(on(walker, 0.03 + c, 1.1, 0.3));
          walker.armR(on(walker, -0.03 - c, 1.1, 0.3));
          walker.face('smile');
        } else walk(down, side, (p - 0.4) / 0.6);
      }
      const riding = rider.root.visible;
      sat.seat = riding ? 0 : undefined;
      sat.floor = riding ? -0.22 : undefined;
      if (riding && bodied()) {
        walker.root.visible = true;
        walker.root.position.copy(rider.root.position);
        walker.root.rotation.y = 0;
      }
    };
  },

  /**
   * The nap room's blackout curtain and night light (낮잠방 암막 커튼 · 수면등, new): the window behind
   * drawn over with navy curtains printed with stars on a white rail, a sign pinned on them (쉿! 낮잠
   * 시간), and on a small cabinet a moon-shaped night light glowing soft yellow beside a humidifier
   * breathing out mist.
   */
  ccNapCurtain(g, W, D, _c, _def, _ctx, out) {
    const wz = -D / 2 + 0.02;
    part(g, rbox(0.84, 0.86, 0.03, 0.01), '#e8eaf6', 0, 1.3, wz - 0.005);
    rod(g, v3(-0.46, 1.8, wz + 0.05), v3(0.46, 1.8, wz + 0.05), 0.012, '#fafafa');
    const stars = painted('cc-stars', 128, 256, paintStars);
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const fold = picture(g, stars, 0.16, 1.0, sx * (0.07 + i * 0.13), 1.29, wz + 0.05 + (i % 2) * 0.02, '#ffffff', sx * (i % 2 ? 0.25 : -0.25));
        void fold;
        part(g, ring(0.014, 0.003), '#fafafa', sx * (0.07 + i * 0.13), 1.8, wz + 0.05, { outline: false });
      }
    }
    picture(g, painted('cc-nap-sign', 160, 64, paintNapSign), 0.28, 0.11, 0.0, 1.35, wz + 0.1);
    // The cabinet, the moon light and the humidifier.
    const cab = group(g, 0, 0, -D / 2 + 0.3);
    part(cab, rbox(0.5, 0.42, 0.3, 0.02), '#fff3e0', 0, 0.21, 0);
    part(cab, rbox(0.44, 0.16, 0.012, 0.01), '#ffe0b2', 0, 0.3, 0.152);
    part(cab, cyl(0.012, 0.012, 0.012, 8), '#8d6e63', 0, 0.3, 0.162, { rx: Math.PI / 2, outline: false });
    const moon = group(cab, -0.12, 0.42, 0);
    glowing(moon, ball(0.08), '#fff59d', 0, 0.09, 0);
    part(moon, cyl(0.05, 0.06, 0.02, 14), '#90a4ae', 0, 0.01, 0);
    part(moon, ball(0.065), '#ffffff', 0.04, 0.11, 0.03, { outline: false, material: new THREE.MeshBasicMaterial({ color: '#fffde7' }) }).userData.ownMaterial = true;
    const hum = group(cab, 0.13, 0.42, 0);
    part(hum, cyl(0.06, 0.07, 0.16, 16), '#ffffff', 0, 0.08, 0);
    part(hum, cyl(0.02, 0.02, 0.03, 10), '#e0e0e0', 0, 0.175, 0);
    glowing(hum, ball(0.008), '#80deea', 0, 0.06, 0.068);
    const MIST = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false });
    const puffs = Array.from({ length: 5 }, () => {
      const m = new THREE.Mesh(ball(0.03), MIST);
      hum.add(m);
      return m;
    });
    out.animate = (t) => {
      puffs.forEach((m, i) => {
        const u = (t * 0.25 + i / puffs.length) % 1;
        m.position.set(0.02 * Math.sin(u * 7 + i), 0.2 + u * 0.35, 0.02 * Math.cos(u * 5 + i));
        m.scale.setScalar(0.6 + u * 1.6);
        m.visible = u < 0.9;
      });
    };
    void W;
  },
  /**
   * The changing table (기저귀 교환대, new; the 포근둥지's bsNappyStation has a pad of 44 cm with its things round it, too small to lay
   * a child on): a low white cabinet, a long soft pad with a rim, a little basin with a tap and a pump, the nappies, gloves, spray and
   * cloth to hand, a lidded pedal bin on the floor, the order of work on the wall. Used in two ways. Looked after: sprayed and wiped,
   * the caddy filled, hands washed, noted, no child in it. A change: see childcareCareMotion.ts. The child stays dressed in a onesie
   * in every frame and a towel lies over the lower half through the work; only the things and the order tell what's going on.
   */
  ccChangingTable(g, _W, D, _c, _def, ctx, out) {
    const T = CC.TB;
    const P = CC.PLACE;
    const cw = T.right - T.left;
    const cx = (T.right + T.left) / 2;
    const cd = T.front - T.back;
    const cz = (T.front + T.back) / 2;
    part(g, rbox(cw, T.top - 0.05, cd, 0.02), '#fafafa', cx, (T.top - 0.05) / 2 + 0.02, cz);
    part(g, rbox(cw + 0.02, 0.03, cd + 0.02, 0.01), BIRCH, cx, T.top - 0.015, cz);
    // Drawers above, open baskets below.
    const fz = T.front + 0.002;
    [-0.72, -0.2, 0.32].forEach((x, i) => {
      part(g, rbox(0.48, 0.18, 0.014, 0.008), '#e0f2f1', x, 0.68, fz);
      part(g, cyl(0.012, 0.012, 0.012, 10), '#26a69a', x, 0.68, fz + 0.012, { rx: Math.PI / 2, outline: false });
      label(g, ['여벌 옷', '물티슈 · 수건', '장갑 · 소독'][i], 0.24, 0.045, x, 0.73, fz + 0.01, '#e0f2f1', '#00695c');
      const basket = group(g, x, 0.05, fz + 0.03);
      part(basket, rbox(0.44, 0.2, 0.09, 0.02), '#d7b98a', 0, 0.1, 0);
      for (let j = 0; j < 3; j++) part(basket, rbox(0.11, 0.035, 0.07, 0.014), j % 2 ? '#fdfdfb' : PASTEL[(i * 2 + j) % PASTEL.length], -0.13 + j * 0.13, 0.215, 0);
    });
    // The pad, with a soft rim on three sides and a little print.
    part(g, rbox(T.padW, 0.05, T.padD, 0.018), '#b2dfdb', T.padX, T.top + 0.025, T.padZ);
    for (let i = 0; i < 9; i++) part(g, ball(0.016), i % 2 ? '#ffffff' : '#80cbc4', T.padX - 0.4 + i * 0.1, T.padY + 0.001, T.padZ + (i % 3 - 1) * 0.13, { outline: false }).scale.set(1, 0.1, 1);
    part(g, rbox(T.padW + 0.04, 0.07, 0.04, 0.018), '#4db6ac', T.padX, T.top + 0.05, T.padZ - T.padD / 2 - 0.01);
    part(g, rbox(0.04, 0.07, T.padD, 0.018), '#4db6ac', T.padX - T.padW / 2 - 0.01, T.top + 0.05, T.padZ);
    // The basin and tap, the things behind it.
    part(g, rbox(0.34, 0.03, 0.26, 0.012), '#ffffff', 0.17, T.top + 0.015, -0.07);
    part(g, rbox(0.27, 0.006, 0.19, 0.01), '#b0bec5', 0.17, T.top + 0.032, -0.07, { outline: false });
    rod(g, v3(P.tap[0], T.top, P.tap[2] - 0.03), v3(P.tap[0], P.tap[1], P.tap[2] - 0.03), 0.01, '#b0bec5');
    rod(g, v3(P.tap[0], P.tap[1], P.tap[2] - 0.03), v3(P.tap[0], P.tap[1] - 0.02, P.tap[2] + 0.04), 0.009, '#b0bec5');
    const water = part(g, cyl(0.007, 0.007, P.tap[1] - T.top - 0.05, 8), '#b3e5fc', P.tap[0], (P.tap[1] + T.top) / 2 - 0.01, P.tap[2] + 0.04, { outline: false });
    const caddy = group(g, P.caddy[0], T.top, P.caddy[2]);
    part(caddy, rbox(0.15, 0.012, 0.14, 0.004), '#90a4ae', 0, 0.006, 0);
    for (const s of [-1, 1]) part(caddy, rbox(0.008, 0.07, 0.14, 0.003), '#90a4ae', s * 0.075, 0.035, 0);
    const stack = Array.from({ length: 5 }, (_, i) => {
      const n = part(caddy, rbox(0.115, 0.03, 0.09, 0.012), '#fdfdfb', 0, 0.03 + i * 0.03, 0);
      part(n, box(0.117, 0.01, 0.01), '#b3e5fc', 0, 0, 0.04, { outline: false });
      return n;
    });
    const gl = group(g, P.gloves[0], T.top, P.gloves[2]);
    part(gl, rbox(0.12, 0.08, 0.1, 0.008), '#e3f2fd', 0, 0.04, 0);
    label(gl, '장갑', 0.08, 0.03, 0, 0.045, 0.052, '#e3f2fd', '#1565c0');
    part(gl, ball(0.022), '#90caf9', 0, 0.085, 0, { outline: false }).scale.set(1.4, 0.5, 1);
    const pump = group(g, P.pump[0], T.top, P.pump[2]);
    part(pump, cyl(0.035, 0.04, 0.12, 14), '#e8f5e9', 0, 0.06, 0);
    part(pump, rbox(0.03, 0.012, 0.05, 0.004), '#43a047', 0, 0.15, 0.012);
    label(pump, '비누', 0.05, 0.022, 0, 0.06, 0.04, '#e8f5e9', '#2e7d32');
    // The sheet the change is noted on.
    part(g, rbox(0.15, 0.012, 0.2, 0.004), '#8d6e63', P.clip[0], T.top + 0.008, P.clip[2]);
    flat(g, painted('cc-change-log', 160, 200, (c) => {
      c.fillStyle = PAPER;
      c.fillRect(0, 0, 160, 200);
      text(c, '기저귀 교체 기록', 80, 18, 15, '#37474f', 'center');
      c.fillStyle = '#cfd8dc';
      for (let i = 0; i < 7; i++) c.fillRect(10, 44 + i * 22, 140, 1);
      ['하린', '도윤', '서아', '지호', '예준'].forEach((n, i) => text(c, n, 14, 55 + i * 22, 12, '#546e7a', 'left', false));
    }), 0.13, 0.17, P.clip[0], T.top + 0.016, P.clip[2]);
    // The lidded bin, in front of the basin's end.
    const bin = group(g, P.bin[0], 0, P.bin[2]);
    part(bin, cyl(0.11, 0.1, P.binTop - 0.03, 16), '#b2dfdb', 0, (P.binTop - 0.03) / 2, 0);
    const lid = group(bin, 0, P.binTop - 0.03, -0.11);
    part(lid, cyl(0.115, 0.115, 0.03, 16), '#4db6ac', 0, 0.015, 0.11);
    const pedal = part(bin, rbox(0.07, 0.012, 0.06, 0.004), '#607d8b', 0, 0.02, 0.12);
    label(bin, '뚜껑을 닫아요', 0.16, 0.035, 0, 0.32, 0.105, '#b2dfdb', '#00695c');
    // The folded towel at the pad's foot, while it isn't spread.
    const folded = part(g, rbox(0.17, 0.05, 0.3, 0.018), '#fff59d', -0.1, T.padY + 0.024, T.padZ);
    if (ctx.againstWall) {
      picture(g, painted('cc-change-steps', 192, 192, (c) => {
        c.fillStyle = '#fffdf3';
        c.fillRect(0, 0, 192, 192);
        c.fillStyle = '#80cbc4';
        c.fillRect(0, 0, 192, 36);
        text(c, '기저귀 교체 순서', 96, 18, 17, '#ffffff', 'center');
        ['손 씻기 · 장갑', '아이에게 말 걸기', '수건 덮고 교체', '장갑 벗어 버리기', '옷 정리 · 내려 주기', '소독 · 손 씻기'].forEach((s, i) => text(c, `${i + 1}. ${s}`, 12, 54 + i * 24, 14, '#37474f', 'left', false));
      }), 0.42, 0.42, -0.42, 1.42, -D / 2 + 0.015);
    }
    // In use: the child, the towel and what's in the hand.
    const use = group(g);
    out.inUse = use;
    const child = figure(use, ONESIE, 0, 0, 0, 'stand', CC.CHILD_K);
    const towel = group(use, CC.TOWEL.footX, T.padY, T.padZ);
    const cloth0 = part(towel, rbox(CC.TOWEL.len, CC.TOWEL.high, CC.TOWEL.wide, 0.05), '#fff59d', -CC.TOWEL.len / 2, CC.TOWEL.high / 2, 0);
    for (const s of [-1, 1]) part(cloth0, box(CC.TOWEL.len - 0.02, 0.006, 0.02), '#fff9c4', 0, CC.TOWEL.high / 2, s * 0.12, { outline: false });
    const hold = changeTools(use);
    const mist = Array.from({ length: 6 }, () => part(use, ball(0.012), '#e0f7fa', 0, 0, 0, { outline: false }));
    const say = words(use, 0.72, -0.62, 1.62, 0.1);
    const mark = marker(g, 0, 0, 0);
    const at = (motion: Motion) => {
      const s = spot(g, 'stand', CC.AT_WORK.x, 0, CC.AT_WORK.z, CC.AT_WORK.yaw);
      s.work = mark;
      s.motion = motion;
      return s;
    };
    const change = at('ccDiaper');
    const clean = at('ccTableClean');
    const spots: Record<string, Spot> = { xwChangeDiaper: change, ccCleanChangeTable: clean, '*': clean };
    out.spots = spots;
    out.work = mark;
    const scratch = new THREE.Vector3();
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const key = now === 'xwChangeDiaper' ? 'ccDiaper' : now ? 'ccTableClean' : null;
      water.visible = false;
      lid.rotation.x = 0;
      pedal.position.y = 0.02;
      if (!key) {
        hold(null);
        stack.forEach((n, i) => (n.visible = i < 3));
        folded.visible = true;
        change.held = clean.held = null;
        return;
      }
      const N = CC.careNowDiaper(key, t, CC.carePhase(mark.getWorldPosition(scratch)));
      const s = key === 'ccDiaper' ? change : clean;
      s.at.position.set(N.at.x, 0, N.at.z);
      const held = hold(N);
      change.held = s === change ? held : null;
      clean.held = s === clean ? held : null;
      water.visible = N.water;
      lid.rotation.x = -1.1 * N.lid;
      pedal.position.y = 0.02 - 0.012 * N.lid;
      stack.forEach((n, i) => (n.visible = i < (N.withChild ? 3 : 2 + (Math.floor(t / CC.CLEAN_ROUND) % 3 + 3) % 3)));
      child.root.visible = N.withChild;
      towel.visible = N.withChild && N.towel > 0.02;
      folded.visible = !towel.visible;
      towel.scale.x = Math.max(0.14, N.towel);
      if (N.withChild) {
        const c = CC.childAt(N.child);
        child.root.position.set(c.feet[0], c.feet[1], c.feet[2]);
        child.root.quaternion.copy(c.q);
        child.face(N.look > 0.5 ? 'smile' : 'calm');
        // Laid, the head turned to who's talking to them.
        child.head.rotation.set(0, N.child > 0.9 ? -0.55 * N.look : 0, 0);
        if (N.wave && N.child < 0.01) child.armR(on(child, -0.26, 1.42, 0.12).add(v3(0, 0.03 * wave(t, 1.6), 0)));
        else child.armR(null);
      }
      mist.forEach((m, i) => {
        m.visible = N.mist;
        if (!N.mist) return;
        const u = (t * 1.4 + i / 6) % 1;
        m.position.set(-0.22 - 0.28 * u, 1.05 - 0.17 * u, -0.1 + 0.07 * Math.sin(i * 2.1));
        m.scale.setScalar(0.6 + u);
      });
      say.say(N.say);
    };
  },

  /**
   * The serving cart and a low lunch table (배식 카트, new): a steel cart with the 식판 stack, the rice cooker, the soup pot with its
   * ladle, three side dishes and the day's menu with the allergy card; a low table with four little chairs. A tray filled and carried
   * to a child, down beside them (골고루 먹자), a mouth wiped with a tissue; the children eat with their spoons, each round the next.
   */
  ccLunchCart(g, _W, _D, _c, _def, _ctx, out) {
    const L = CC.LUNCH;
    const C = L.cart;
    const steel = '#cfd8dc';
    for (const y of [0.22, C.top - 0.02]) part(g, rbox(C.w, 0.03, C.d, 0.01), steel, C.x, y, C.z);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      part(g, cyl(0.012, 0.012, C.top - 0.08, 8), '#90a4ae', C.x + sx * (C.w / 2 - 0.03), (C.top + 0.05) / 2, C.z + sz * (C.d / 2 - 0.03), { outline: false });
      part(g, cyl(0.035, 0.035, 0.03, 12), '#546e7a', C.x + sx * (C.w / 2 - 0.03), 0.035, C.z + sz * (C.d / 2 - 0.03), { rz: Math.PI / 2 });
    }
    // Spare bowls below.
    for (let i = 0; i < 4; i++) part(g, cyl(0.07, 0.05, 0.05, 14), '#ffffff', C.x - 0.33 + i * 0.22, 0.265, C.z);
    // The stack of trays.
    for (let i = 0; i < 5; i++) part(g, rbox(0.3, 0.012, 0.22, 0.01), '#b0bec5', L.stack[0], C.top + 0.01 + i * 0.014, L.stack[2]);
    // Rice in its cooker, with its paddle.
    const rice = group(g, L.rice[0], C.top, L.rice[2]);
    part(rice, cyl(0.1, 0.095, 0.1, 18), '#eceff1', 0, 0.05, 0);
    part(rice, ball(0.085), '#fffdf6', 0, 0.09, 0, { outline: false }).scale.set(1, 0.35, 1);
    // The soup pot.
    const pot = group(g, L.pot[0], C.top, L.pot[2]);
    part(pot, cyl(0.11, 0.1, 0.14, 18), '#b0bec5', 0, 0.07, 0);
    part(pot, cyl(0.1, 0.1, 0.006, 18), '#e6b98a', 0, 0.128, 0, { outline: false });
    for (const s of [-1, 1]) part(pot, rbox(0.03, 0.012, 0.03, 0.004), '#78909c', s * 0.115, 0.11, 0);
    // Three side dishes.
    ['#81c784', '#ffb74d', '#fff176'].forEach((k, i) => {
      const d = group(g, L.sides[0] - 0.02 + (i - 1) * 0.0 , C.top, L.sides[2] - 0.11 + i * 0.11);
      part(d, rbox(0.17, 0.035, 0.1, 0.01), '#eceff1', 0, 0.018, 0);
      part(d, rbox(0.14, 0.012, 0.075, 0.006), k, 0, 0.04, 0, { outline: false });
    });
    // The menu.
    const menu = picture(g, painted('cc-lunch-menu', 160, 112, (c) => {
      c.fillStyle = '#fffdf3';
      c.fillRect(0, 0, 160, 112);
      text(c, '오늘의 점심', 80, 16, 15, '#e65100', 'center');
      ['쌀밥 · 맑은 뭇국', '두부조림 · 시금치나물', '배추김치(아기김치)', '알레르기: 대두'].forEach((s, i) => text(c, s, 8, 40 + i * 19, 12, i === 3 ? '#c62828' : '#37474f', 'left', false));
    }), 0.3, 0.21, C.x + 0.2, C.top + 0.24, C.z - C.d / 2 + 0.01);
    void menu;
    part(g, rbox(0.32, 0.23, 0.01, 0.004), '#90a4ae', C.x + 0.2, C.top + 0.24, C.z - C.d / 2 + 0.002);
    for (const s of [-1, 1]) part(g, cyl(0.006, 0.006, 0.14, 6), '#90a4ae', C.x + 0.2 + s * 0.13, C.top + 0.07, C.z - C.d / 2 + 0.002, { outline: false });
    // The low table and its chairs, seated round it when in use.
    const Tb = L.table;
    part(g, rbox(Tb.w, 0.03, Tb.d, 0.02), '#ffe0b2', Tb.x, Tb.top - 0.015, Tb.z);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.022, 0.018, Tb.top - 0.03, 8), BIRCH_DARK, Tb.x + sx * (Tb.w / 2 - 0.07), (Tb.top - 0.03) / 2, Tb.z + sz * (Tb.d / 2 - 0.06), { outline: false });
    const seats = [{ x: 0.05, z: -0.52, ry: 0 }, { x: 0.05, z: 0.52, ry: Math.PI }, { x: 0.8, z: -0.52, ry: 0 }, { x: 0.8, z: 0.52, ry: Math.PI }];
    seats.forEach((p, i) => tinyChair(g, p.x, p.z, p.ry, PASTEL[(i * 2 + 3) % PASTEL.length], L.seat));
    const tissues = group(g, L.tissue[0], Tb.top, L.tissue[2]);
    part(tissues, rbox(0.1, 0.04, 0.09, 0.008), '#b3e5fc', 0, 0.02, 0);
    part(tissues, box(0.03, 0.02, 0.02), '#ffffff', 0, 0.05, 0, { outline: false });
    // Tools at home on the cart; in the hand when they're used.
    const hold = lunchTools(g);
    // In use: the children and their trays.
    const use = group(g);
    out.inUse = use;
    const kids = seats.map((p, i) => {
      const f = played(figure(use, KIDS[(i + 2) % KIDS.length], p.x, p.z, p.ry, { seat: L.seat / TOT }, TOT), { stage: 'child', seat: L.seat, gender: i % 2 ? 'male' : 'female' });
      const fwd = v3(Math.sin(p.ry), 0, Math.cos(p.ry));
      const tray = lunchTray(use, `kidTray${i}`);
      tray.root.position.set(p.x, Tb.top + 0.005, p.z).addScaledVector(fwd, 0.35);
      tray.root.rotation.y = p.ry;
      const spoon = group(use);
      part(spoon, cyl(0.004, 0.004, 0.09, 6), '#b0bec5', 0, -0.045, 0, { outline: false });
      part(spoon, ball(0.012), '#b0bec5', 0, -0.095, 0, { outline: false }).scale.set(1, 0.4, 1.3);
      return { f, p, fwd, tray, spoon };
    });
    const moving = lunchTray(use, 'lunchTray');
    const say = words(use, 0.72, -0.1, 1.55, 0.2);
    const mark = marker(g, 0, 0, 0);
    const at = (motion: Motion) => {
      const s = spot(g, 'stand', CC.AT_CART.x, 0, CC.AT_CART.z, CC.AT_CART.yaw);
      s.work = mark;
      s.motion = motion;
      return s;
    };
    const serve = at('ccLunch');
    const prep = at('ccLunchPrep');
    const spots: Record<string, Spot> = { xwLunchTime: serve, ccSetLunchCart: prep, '*': prep };
    out.spots = spots;
    out.work = mark;
    const scratch = new THREE.Vector3();
    const hand = new THREE.Vector3();
    const bite = new THREE.Vector3();
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const key = now === 'xwLunchTime' ? 'ccLunch' : now ? 'ccLunchPrep' : null;
      if (!key) {
        hold(null);
        serve.held = prep.held = null;
        return;
      }
      const N = CC.careNowLunch(key, t, CC.carePhase(mark.getWorldPosition(scratch)));
      const s = key === 'ccLunch' ? serve : prep;
      s.at.position.set(N.at.x, 0, N.at.z);
      s.at.rotation.y = N.at.yaw;
      const held = hold(N);
      serve.held = s === serve ? held : null;
      prep.held = s === prep ? held : null;
      const inPlace = key === 'ccLunch' && N.tool === 'tray';
      moving.root.visible = !inPlace;
      moving.root.position.fromArray(N.trayAt);
      moving.root.rotation.y = N.trayYaw;
      moving.fill(N.rice, N.soup, N.side);
      if (inPlace) held!.tool.userData.fill?.(N.rice, N.soup, N.side);
      kids.forEach((k, i) => {
        const isTheOne = i === N.who && key === 'ccLunch';
        k.f.root.visible = key === 'ccLunch';
        // The one being served has only the moving tray; the rest are already eating.
        k.tray.root.visible = key === 'ccLunch' && !(isTheOne);
        const eats = key === 'ccLunch' && (!isTheOne || N.served) && !(isTheOne && N.wiping);
        const ph = i * 0.37;
        const up = Math.max(0, Math.sin((t * 0.4 + ph) * Math.PI * 2));
        k.spoon.visible = eats;
        if (eats) {
          hand.set(k.p.x, L.table.top + 0.06, k.p.z).addScaledVector(k.fwd, 0.32);
          bite.fromArray(L.mouth[i % 2]).setX(k.p.x);
          hand.lerp(bite, up * 0.9);
          k.f.armR(hand);
          k.spoon.position.copy(hand);
          k.spoon.rotation.set(0, k.p.ry, -1.1);
        } else k.f.armR(null);
        k.f.armL(null);
        k.f.face(isTheOne && N.tend ? 'smile' : 'calm');
        const toT = isTheOne && N.tend ? (k.p.z < 0 ? -0.55 : 0.55) : 0;
        k.f.head.rotation.set(0.12 * (1 - up), toT, 0);
      });
      say.say(N.say);
    };
  },
};
