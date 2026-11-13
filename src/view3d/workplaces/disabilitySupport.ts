import * as THREE from 'three';
import type { Motion } from '../activity';
import { marker, rod, shade, spot, type Builder, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, glass, glowing, label, litScreen, painted, picture, ring, seeded, text, type Paint } from './doctor';
import {
  AAC,
  AAC_ANSWER,
  AAC_MODEL,
  ACCESS,
  ACCESS_CLIP,
  ART,
  ART_OFFER,
  BARS,
  BENCH,
  BENCH_PASS,
  KITCHEN,
  PC,
  READ,
  SENSE,
  SENSE_PALMS,
  aacAnswerAt,
  aacBeat,
  aacCell,
  aacModelAt,
  abs,
  accessBeat,
  amountOf,
  artBeat,
  ballOut,
  clipOut,
  coachBeat,
  cookBeat,
  demoBeat,
  demoPart,
  dsKey,
  dsPhase,
  fibreOut,
  healthBeat,
  jigSlide,
  lidOpen,
  pageTurn,
  passOut,
  pcBeat,
  readBeat,
  riseOf,
  sensoryBeat,
  switchDown,
  transferBeat,
  transferHips,
  walkAt,
  type Loc,
  type SpotAt,
} from './disabilitySupportMotion';

/**
 * The 장애인 복지관 drawn as itself (2026-10-27 workplace pipeline, at the user's request): bright,
 * calm and made for everyone — level floors, contrasting edges, pictures beside the words — and the
 * users drawn doing things themselves, the worker beside them, never over them. The sensory room's
 * padded mat with its bubble tube and fibre-optic strands, a user curled in the beanbag; the
 * 보호작업장 bench where pens are put together and soap is boxed, the step card in pictures, the
 * worker on the stool beside showing how; the parallel bars on their deck with the step lines and the
 * gait mirror, walked along with a hand at the user's belt, and a sit-to-stand from the wheelchair;
 * the training kitchen with its lowered counter and knee space, the tilted mirror over the hob, a user
 * cooking 라면 from the picture recipe; the centre's van with its wheelchair lift, which lowers and
 * takes the user aboard before it drives off. And what it was missing (workFurniture/disabilitySupport.ts):
 * the picture-symbol board and its talker, the braille and large-print corner, the accessible
 * computer, the art table with the users' paintings on a line, the tactile map by the door.
 *
 * The centre (다온장애인복지관) and everyone in it are made up. The users drawn in show only while the
 * piece is in use, and only for the use they belong to (activity.ts spotPose marks the spot used).
 * The sensory mat, the bars and the kitchen are shared with the 작업치료실 and the 재활센터, so they
 * carry no centre's name.
 */

const CENTRE = '다온장애인복지관';
const BLUE = '#1565c0';
const SKY = '#42a5f5';
const OAK = '#c9a27a';
const OAK_DARK = '#9c7653';
const BIRCH = '#e8d5b0';
const PAPER = '#fbfaf5';
const SKIN = '#f1c9a5';
const EDGE = '#ff8f00';
const UP = new THREE.Vector3(0, 1, 0);
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const P = (l: Loc) => v3(l[0], l[1], l[2]);

// ---------------------------------------------------------------------------------------------
// Small parts.

function group(parent: THREE.Object3D, x = 0, y = 0, z = 0, ry = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}
/** A spot where the motion file says it is: sat on the seat's top (cross-legged on a mat) or stood. */
function spotAt(g: THREE.Object3D, how: 'sit' | 'stand', s: SpotAt, motion: Motion, work: THREE.Object3D, cross = false): Spot {
  const p = spot(g, how, s.x, s.y, s.z, s.yaw, how === 'sit' ? s.y : undefined);
  p.work = work;
  p.motion = motion;
  if (cross) p.legs = 'cross';
  return p;
}
/** Whether a spot's had a dweller posed at it just now (activity.ts spotPose marks it). */
const posed = (s: Spot, t: number) => Math.abs(t - ((s.at.userData.posedAt as number | undefined) ?? -1e9)) < 0.6;
const tmp = new THREE.Vector3();
/** The piece's clock, from its fixed mark (as the motions have it). */
const clockOf = (m: THREE.Object3D) => dsPhase(m.getWorldPosition(tmp));
/** A place in a spot's frame, in the piece's. */
const inPiece = (s: SpotAt, l: Loc, dx = 0, dy = 0, dz = 0) => {
  const p = abs(s, l);
  return v3(p[0] + dx, p[1] + dy, p[2] + dz);
};
/** A sheet lying flat on a top, readable from +z (turned `ry` about the vertical). */
function flat(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0): THREE.Mesh {
  const m = picture(g, tex, w, h, x, y, z);
  m.rotation.order = 'YXZ';
  m.rotation.set(-Math.PI / 2, ry, 0);
  return m;
}
/** A cylinder stretched between two points each frame (a drawn person's limb). */
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
/** A lit part with a colour of its own (to change as it glows). */
function ownGlow(g: THREE.Object3D, geom: THREE.BufferGeometry, color: string, x: number, y: number, z: number, opacity = 1): THREE.Mesh {
  const mat = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
  const m = new THREE.Mesh(geom, mat);
  m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
/** A visitor's chair (wooden frame, padded seat and back), built facing +z, the seat's top at `h`. */
function guestChair(g: THREE.Object3D, x: number, z: number, ry: number, fabric: string, h = 0.46, wood = OAK_DARK): THREE.Group {
  const c = group(g, x, 0, z, ry);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(c, cyl(0.018, 0.015, h - 0.04, 8), wood, sx * 0.19, (h - 0.04) / 2, sz * 0.18, { outline: false });
  part(c, rbox(0.44, 0.04, 0.42, 0.015), wood, 0, h - 0.04, 0);
  part(c, rbox(0.41, 0.05, 0.39, 0.03), fabric, 0, h - 0.005, 0.005);
  for (const sx of [-1, 1]) part(c, cyl(0.016, 0.016, 0.42, 8), wood, sx * 0.19, h + 0.19, -0.19, { outline: false });
  part(c, rbox(0.4, 0.26, 0.05, 0.03), fabric, 0, h + 0.24, -0.2, { rx: -0.08 });
  return c;
}
/** A round work stool, its top at `h`. */
function stool(g: THREE.Object3D, x: number, z: number, color: string, h = 0.48): THREE.Group {
  const s = group(g, x, 0, z);
  part(s, rbox(0.36, 0.045, 0.36, 0.02), color, 0, h - 0.022, 0);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    rod(s, v3(Math.cos(a) * 0.11, h - 0.04, Math.sin(a) * 0.11), v3(Math.cos(a) * 0.16, 0, Math.sin(a) * 0.16), 0.014, '#78909c');
  }
  part(s, ring(0.13, 0.008), '#78909c', 0, 0.2, 0, { rx: Math.PI / 2 });
  return s;
}

// ---------------------------------------------------------------------------------------------
// The people drawn in: the centre's users (이용자), each with their own style.

interface Look {
  top: string;
  bottom: string;
  hair: string;
  skin?: string;
  shoes?: string;
  hairdo: 'short' | 'bob' | 'pony' | 'curly' | 'long' | 'grey';
  glasses?: boolean;
  band?: string;
  /** A hoodie's strings and pocket. */
  hoodie?: boolean;
  /** A stripe across the chest. */
  stripe?: string;
}
const LOOKS = {
  minjun: { top: '#4db6ac', bottom: '#455a64', hair: '#1a1a1a', hairdo: 'short', hoodie: true, shoes: '#eceff1' } as Look,
  seoyeon: { top: '#f06292', bottom: '#5c6bc0', hair: '#2b1b10', hairdo: 'bob', band: '#fff176', shoes: '#fafafa' } as Look,
  daeho: { top: '#8d6e63', bottom: '#3e3e46', hair: '#9e9e9e', hairdo: 'grey', glasses: true, shoes: '#3e2723' } as Look,
  jiwoo: { top: '#9575cd', bottom: '#37474f', hair: '#3b2f2a', hairdo: 'pony', stripe: '#ede7f6', shoes: '#ffffff' } as Look,
  haneul: { top: '#ffb74d', bottom: '#5d4037', hair: '#2b1b10', hairdo: 'curly', hoodie: true, shoes: '#263238' } as Look,
  sumin: { top: '#81c784', bottom: '#546e7a', hair: '#1a1a1a', hairdo: 'long', glasses: true, shoes: '#5d4037' } as Look,
};

interface Pose {
  /** The hips' height and how far forward of the feet's origin they are, in their own frame. */
  hipY: number;
  hipZ?: number;
  /** Bent forward at the hips, radians (back in a beanbag: below 0). */
  lean?: number;
  /** The ankles, in their own frame (x to their left, z ahead). */
  ankleL?: THREE.Vector3;
  ankleR?: THREE.Vector3;
}
interface Person {
  root: THREE.Group;
  pelvis: THREE.Group;
  head: THREE.Group;
  pose(p: Pose): void;
  /** Puts the left / right hand at a point in the parent's frame, or back at rest. */
  armL(to: THREE.Vector3 | null): void;
  armR(to: THREE.Vector3 | null): void;
}
const STAND: Pose = { hipY: 0.88, hipZ: 0, lean: 0, ankleL: v3(0.09, 0.08, 0.02), ankleR: v3(-0.09, 0.08, 0.02) };
/** Sat on a seat whose top is `h` high, the feet `foot` ahead on the floor (or a footplate `fy` up). */
const SEATED = (h: number, foot = 0.42, fy = 0.08, lean = 0.05): Pose => ({ hipY: h + 0.07, hipZ: -0.03, lean, ankleL: v3(0.1, fy, foot), ankleR: v3(-0.1, fy, foot) });
/** Sat in a wheelchair (seat 0.48, the feet on its footplates). */
const IN_CHAIR = (lean = 0.08): Pose => SEATED(0.48, 0.36, 0.14, lean);

/**
 * A user drawn in, their feet's origin at (x, y, z) in `parent`, turned `ry` (0 faces +z). Posed by
 * `pose` (stood, sat, walking, rising), their hands put where they're working.
 */
function person(parent: THREE.Object3D, look: Look, x: number, z: number, ry: number, pose: Pose = STAND, y = 0): Person {
  const root = group(parent, x, y, z, ry);
  const skin = look.skin ?? SKIN;
  const shoes = look.shoes ?? '#2b2b30';
  const pelvis = group(root);
  part(pelvis, rbox(0.3, 0.16, 0.21, 0.06), look.bottom, 0, 0, 0);
  const torso = group(pelvis);
  part(torso, rbox(0.34, 0.44, 0.21, 0.08), look.top, 0, 0.27, 0);
  if (look.hoodie) {
    part(torso, rbox(0.2, 0.08, 0.02, 0.02), shade(look.top, 0.85), 0, 0.14, 0.106, { outline: false });
    for (const sx of [-1, 1]) part(torso, cyl(0.004, 0.004, 0.1, 6), '#fafafa', sx * 0.04, 0.38, 0.11, { outline: false });
    part(torso, rbox(0.3, 0.07, 0.12, 0.03), shade(look.top, 0.9), 0, 0.47, -0.07);
  }
  if (look.stripe) part(torso, box(0.345, 0.05, 0.215), look.stripe, 0, 0.3, 0, { outline: false });
  part(torso, cyl(0.045, 0.05, 0.08, 10), skin, 0, 0.5, 0, { outline: false });
  const head = group(torso, 0, 0.66, 0);
  part(head, ball(0.112), skin, 0, 0, 0);
  for (const sx of [-1, 1]) part(head, ball(0.012), '#2b2b30', sx * 0.04, 0.0, 0.104, { outline: false });
  part(head, box(0.034, 0.006, 0.004), '#c0726a', 0, -0.045, 0.104, { outline: false });
  switch (look.hairdo) {
    case 'bob':
      part(head, ball(0.122), look.hair, 0, 0.025, -0.02);
      part(head, rbox(0.26, 0.13, 0.2, 0.05), look.hair, 0, -0.04, -0.03);
      part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0, 0.075, 0.08, { rx: -0.25 });
      break;
    case 'pony':
      part(head, ball(0.12), look.hair, 0, 0.03, -0.03);
      part(head, rbox(0.2, 0.06, 0.06, 0.02), look.hair, 0, 0.075, 0.07, { rx: -0.3 });
      part(head, rbox(0.06, 0.2, 0.06, 0.03), look.hair, 0, -0.06, -0.14, { rx: 0.3 });
      break;
    case 'curly':
      part(head, ball(0.118), look.hair, 0, 0.035, -0.025);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        part(head, ball(0.042), look.hair, Math.cos(a) * 0.085, 0.07 + 0.02 * Math.sin(a * 2), -0.02 + Math.sin(a) * 0.075, { outline: false });
      }
      break;
    case 'long':
      part(head, ball(0.12), look.hair, 0, 0.03, -0.03);
      part(head, rbox(0.25, 0.32, 0.12, 0.05), look.hair, 0, -0.1, -0.07);
      part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0, 0.075, 0.075, { rx: -0.25 });
      break;
    case 'grey':
      part(head, ball(0.117), look.hair, 0, 0.02, -0.035);
      part(head, ball(0.1), skin, 0, 0.05, 0.02, { outline: false });
      break;
    default:
      part(head, ball(0.118), look.hair, 0, 0.03, -0.03);
      part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0, 0.075, 0.075, { rx: -0.25 });
  }
  if (look.band) part(head, ring(0.115, 0.012, Math.PI), look.band, 0, 0.05, -0.01, { rx: -0.3 });
  if (look.glasses) {
    for (const sx of [-1, 1]) part(head, ring(0.024, 0.003), '#37474f', sx * 0.042, 0.002, 0.11);
    part(head, box(0.02, 0.004, 0.004), '#37474f', 0, 0.002, 0.112, { outline: false });
  }
  // The legs (hip, knee, ankle: two bones, the knee bending forward) and the shoes.
  const thigh = [limb(root, 0.062, look.bottom), limb(root, 0.062, look.bottom)];
  const shin = [limb(root, 0.05, look.bottom), limb(root, 0.05, look.bottom)];
  const shoe = [part(root, rbox(0.09, 0.07, 0.2, 0.03), shoes, 0, 0, 0), part(root, rbox(0.09, 0.07, 0.2, 0.03), shoes, 0, 0, 0)];
  const hip = new THREE.Vector3();
  const knee = new THREE.Vector3();
  const d = new THREE.Vector3();
  const bend = new THREE.Vector3();
  const leg = (i: number, sx: number, ankle: THREE.Vector3) => {
    hip.set(sx * 0.09, pelvis.position.y - 0.03, pelvis.position.z);
    d.subVectors(ankle, hip);
    const L = Math.min(0.82, Math.max(0.1, d.length()));
    d.normalize();
    const a = 0.42;
    const b = 0.41;
    const cosA = THREE.MathUtils.clamp((a * a + L * L - b * b) / (2 * a * L), -1, 1);
    bend.set(0, 0, 1).addScaledVector(d, -d.z).normalize();
    knee.copy(hip).addScaledVector(d, a * cosA).addScaledVector(bend, a * Math.sqrt(1 - cosA * cosA));
    const foot = hip.clone().addScaledVector(d, L);
    thigh[i](hip, knee);
    shin[i](knee, foot);
    shoe[i].position.set(foot.x, foot.y - 0.035, foot.z + 0.05);
  };
  // The arms: shoulder, elbow, hand.
  const targets: Array<THREE.Vector3 | null> = [null, null];
  const lean = () => torso.rotation.x;
  const shoulderOf = (sx: number, out: THREE.Vector3) => {
    const c = Math.cos(lean());
    const s = Math.sin(lean());
    return out.set(sx * 0.2, pelvis.position.y + 0.46 * c, pelvis.position.z + 0.46 * s);
  };
  const arm = (i: number, sx: number) => {
    const upper = limb(root, 0.042, look.top);
    const lower = limb(root, 0.035, look.top);
    const hand = part(root, ball(0.036), skin, 0, 0, 0, { outline: false });
    const shoulder = new THREE.Vector3();
    const loc = new THREE.Vector3();
    const elbow = new THREE.Vector3();
    const dd = new THREE.Vector3();
    const bb = new THREE.Vector3();
    return () => {
      shoulderOf(sx, shoulder);
      const to = targets[i];
      const sat = pelvis.position.y < 0.7;
      if (to) loc.copy(to).sub(root.position).applyAxisAngle(UP, -root.rotation.y);
      else if (sat) loc.set(sx * 0.12, pelvis.position.y + 0.1, pelvis.position.z + 0.25);
      else loc.set(sx * 0.23, pelvis.position.y - 0.06, pelvis.position.z + 0.05);
      dd.subVectors(loc, shoulder);
      const L = Math.min(0.5, Math.max(0.05, dd.length()));
      dd.normalize();
      loc.copy(shoulder).addScaledVector(dd, L);
      const a = 0.27;
      const b = 0.25;
      const cosA = THREE.MathUtils.clamp((a * a + L * L - b * b) / (2 * a * L), -1, 1);
      bb.set(sx * 0.6, -1, -0.25).normalize();
      bb.addScaledVector(dd, -bb.dot(dd)).normalize();
      elbow.copy(shoulder).addScaledVector(dd, a * cosA).addScaledVector(bb, a * Math.sqrt(1 - cosA * cosA));
      upper(shoulder, elbow);
      lower(elbow, loc);
      hand.position.copy(loc);
    };
  };
  const solveL = arm(0, 1);
  const solveR = arm(1, -1);
  const me: Person = {
    root,
    pelvis,
    head,
    pose(p) {
      pelvis.position.set(0, p.hipY, p.hipZ ?? 0);
      torso.rotation.x = p.lean ?? 0;
      leg(0, 1, p.ankleL ?? STAND.ankleL!);
      leg(1, -1, p.ankleR ?? STAND.ankleR!);
      solveL();
      solveR();
    },
    armL(to) {
      targets[0] = to ? to.clone() : null;
      solveL();
    },
    armR(to) {
      targets[1] = to ? to.clone() : null;
      solveR();
    },
  };
  me.pose(pose);
  return me;
}
/** A point in a drawn person's own frame (x to their left), in the frame they're placed in. */
const on = (f: Person, x: number, y: number, z: number) => v3(x, y, z).applyAxisAngle(UP, f.root.rotation.y).add(f.root.position);
/** A point in the parent's frame, in a drawn person's own frame. */
const own = (f: Person, p: THREE.Vector3) => p.clone().sub(f.root.position).applyAxisAngle(UP, -f.root.rotation.y);
/** A gait belt round a user's waist, with its handles at the sides, front and back. */
function gaitBelt(f: Person) {
  part(f.pelvis, rbox(0.335, 0.06, 0.245, 0.03), '#1e88e5', 0, 0.05, 0);
  for (const [x, z, ry] of [[0.17, 0, Math.PI / 2], [-0.17, 0, Math.PI / 2], [0, 0.125, 0], [0, -0.125, 0]] as const) part(f.pelvis, ring(0.03, 0.007, Math.PI), '#0d47a1', x, 0.05, z, { ry, rz: Math.PI });
}

/**
 * A manual wheelchair, built facing +z, its seat's middle at the origin and its top 0.48 up: the
 * sling seat and back, push handles, armrests, the big wheels with their hand rims and spokes, the
 * castors, and the footplates (swung away when it's stood up from).
 */
function wheelchair(g: THREE.Object3D, x: number, z: number, ry: number, frame: string, footplates = true): THREE.Group {
  const c = group(g, x, 0, z, ry);
  const top = 0.48;
  part(c, rbox(0.44, 0.05, 0.42, 0.02), '#263238', 0, top - 0.025, 0);
  part(c, rbox(0.42, 0.38, 0.04, 0.02), '#263238', 0, top + 0.24, -0.22, { rx: -0.08 });
  for (const sx of [-1, 1]) {
    const X = sx * 0.235;
    rod(c, v3(X, top - 0.04, 0.22), v3(X, top - 0.04, -0.22), 0.014, frame);
    rod(c, v3(X, 0.2, -0.24), v3(X, 0.96, -0.27), 0.014, frame);
    rod(c, v3(X, 0.96, -0.27), v3(X, 0.97, -0.37), 0.014, frame);
    part(c, cyl(0.02, 0.02, 0.09, 10), BLACK, X, 0.97, -0.35, { rx: Math.PI / 2 });
    rod(c, v3(X, top - 0.04, 0.2), v3(X, 0.17, 0.24), 0.014, frame);
    rod(c, v3(X, 0.2, -0.24), v3(X, 0.17, 0.24), 0.013, frame);
    rod(c, v3(X, top - 0.04, -0.15), v3(X, 0.68, -0.15), 0.012, frame);
    rod(c, v3(X, top - 0.04, 0.1), v3(X, 0.68, 0.1), 0.012, frame);
    part(c, rbox(0.06, 0.035, 0.3, 0.015), '#263238', X, 0.69, -0.03);
    const wx = sx * 0.3;
    part(c, ring(0.29, 0.022), '#212121', wx, 0.3, -0.1, { ry: Math.PI / 2 });
    part(c, ring(0.255, 0.007), CHROME, wx + sx * 0.035, 0.3, -0.1, { ry: Math.PI / 2 });
    for (let i = 0; i < 4; i++) part(c, box(0.005, 0.52, 0.005), '#cfd8dc', wx, 0.3, -0.1, { rx: (i * Math.PI) / 4, outline: false });
    part(c, cyl(0.035, 0.035, 0.06, 12), STEEL, wx, 0.3, -0.1, { rz: Math.PI / 2 });
    rod(c, v3(sx * 0.22, 0.2, 0.24), v3(sx * 0.22, 0.11, 0.27), 0.01, frame);
    part(c, cyl(0.065, 0.065, 0.03, 14), '#212121', sx * 0.22, 0.065, 0.28, { rz: Math.PI / 2 });
    if (footplates) {
      rod(c, v3(X, 0.3, 0.24), v3(sx * 0.12, 0.13, 0.36), 0.011, frame);
      part(c, rbox(0.15, 0.015, 0.12, 0.005), '#37474f', sx * 0.1, 0.12, 0.38);
    }
  }
  return c;
}
/** A user sat in a wheelchair at (x, z) turned `ry`: the chair and them in it. */
function chairUser(g: THREE.Object3D, look: Look, x: number, z: number, ry: number, frame: string, lean = 0.08): Person {
  wheelchair(g, x, z, ry, frame);
  return person(g, look, x, z, ry, IN_CHAIR(lean));
}

// ---------------------------------------------------------------------------------------------
// What's painted: the cards, the boards, the screens.

const FILL = (c: CanvasRenderingContext2D, w: number, h: number, bg: string) => {
  c.fillStyle = bg;
  c.fillRect(0, 0, w, h);
};
function circle(c: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, stroke = false) {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  if (stroke) {
    c.strokeStyle = color;
    c.stroke();
  } else {
    c.fillStyle = color;
    c.fill();
  }
}
/** A little stick figure (the picture symbols' person). */
function stick(c: CanvasRenderingContext2D, x: number, y: number, s: number, color = '#263238') {
  c.strokeStyle = color;
  c.lineWidth = Math.max(2, s * 0.12);
  circle(c, x, y - s * 0.9, s * 0.22, color);
  c.beginPath();
  c.moveTo(x, y - s * 0.68);
  c.lineTo(x, y - s * 0.1);
  c.moveTo(x - s * 0.35, y - s * 0.5);
  c.lineTo(x + s * 0.35, y - s * 0.5);
  c.moveTo(x, y - s * 0.1);
  c.lineTo(x - s * 0.25, y + s * 0.35);
  c.moveTo(x, y - s * 0.1);
  c.lineTo(x + s * 0.25, y + s * 0.35);
  c.stroke();
}
/** A heart (the font's heart would be an emoji). */
function heart(c: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(x, y + s * 0.9);
  c.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.7, y - s * 1.1, x, y - s * 0.35);
  c.bezierCurveTo(x + s * 0.7, y - s * 1.1, x + s * 1.4, y - s * 0.1, x, y + s * 0.9);
  c.fill();
}
/** Braille: a cell's six dots, raised where `bits` says (1–6 down the left, then the right). */
function brailleCell(c: CanvasRenderingContext2D, x: number, y: number, s: number, bits: number, color = '#5d4037') {
  for (let i = 0; i < 6; i++) {
    const col = i < 3 ? 0 : 1;
    const row = i % 3;
    const on = (bits >> i) & 1;
    circle(c, x + col * s, y + row * s, s * 0.28, on ? color : 'rgba(0,0,0,0.06)');
  }
}

/** The 6 × 4 picture symbols, coloured by kind (people, doing, things, feelings and answers). */
const AAC_WORDS: string[][] = [
  ['나', '너', '선생님', '엄마', '친구', '우리'],
  ['먹다', '마시다', '그리다', '가다', '듣다', '도와줘요'],
  ['밥', '그림', '물', '음악', '산책', '화장실'],
  ['좋아요', '싫어요', '더', '그만', '네', '아니요'],
];
const AAC_ROW_COLOR = ['#fff59d', '#c5e1a5', '#ffcc80', '#f8bbd0'];
function aacSymbol(c: CanvasRenderingContext2D, word: string, x: number, y: number, s: number) {
  const k = s / 50;
  c.strokeStyle = '#263238';
  c.lineWidth = 2.5 * k;
  switch (word) {
    case '나':
      stick(c, x, y + 4 * k, 26 * k, '#263238');
      c.beginPath();
      c.moveTo(x + 22 * k, y - 4 * k);
      c.lineTo(x + 8 * k, y - 4 * k);
      c.stroke();
      break;
    case '너':
      stick(c, x + 4 * k, y + 4 * k, 26 * k, '#263238');
      c.beginPath();
      c.moveTo(x - 22 * k, y - 4 * k);
      c.lineTo(x - 6 * k, y - 4 * k);
      c.stroke();
      break;
    case '선생님':
      stick(c, x - 6 * k, y + 4 * k, 26 * k);
      c.fillStyle = '#5d4037';
      c.fillRect(x + 8 * k, y - 18 * k, 16 * k, 12 * k);
      break;
    case '엄마':
      stick(c, x, y + 4 * k, 26 * k, '#ad1457');
      break;
    case '친구':
      stick(c, x - 9 * k, y + 4 * k, 22 * k);
      stick(c, x + 9 * k, y + 4 * k, 22 * k, '#1565c0');
      break;
    case '우리':
      for (const dx of [-14, 0, 14]) stick(c, x + dx * k, y + 6 * k, 18 * k);
      break;
    case '먹다':
      circle(c, x, y + 4 * k, 14 * k, '#ffffff');
      circle(c, x, y + 4 * k, 14 * k, '#263238', true);
      c.beginPath();
      c.moveTo(x + 16 * k, y - 16 * k);
      c.lineTo(x + 6 * k, y + 2 * k);
      c.stroke();
      break;
    case '마시다':
      c.strokeRect(x - 9 * k, y - 12 * k, 18 * k, 26 * k);
      c.fillStyle = '#4fc3f7';
      c.fillRect(x - 8 * k, y - 2 * k, 16 * k, 15 * k);
      break;
    case '그리다':
      c.fillStyle = '#e53935';
      c.save();
      c.translate(x, y);
      c.rotate(-0.7);
      c.fillRect(-4 * k, -18 * k, 8 * k, 30 * k);
      c.restore();
      c.beginPath();
      c.moveTo(x - 18 * k, y + 16 * k);
      c.quadraticCurveTo(x - 6 * k, y + 6 * k, x + 4 * k, y + 16 * k);
      c.stroke();
      break;
    case '가다':
      c.beginPath();
      c.moveTo(x - 16 * k, y);
      c.lineTo(x + 14 * k, y);
      c.lineTo(x + 6 * k, y - 8 * k);
      c.moveTo(x + 14 * k, y);
      c.lineTo(x + 6 * k, y + 8 * k);
      c.stroke();
      break;
    case '듣다':
      c.beginPath();
      c.arc(x - 2 * k, y, 12 * k, -Math.PI * 0.6, Math.PI * 0.8);
      c.stroke();
      for (const r of [16, 22]) {
        c.beginPath();
        c.arc(x + 4 * k, y, r * k, -0.6, 0.6);
        c.stroke();
      }
      break;
    case '도와줘요':
      c.fillStyle = '#ffe0b2';
      c.fillRect(x - 16 * k, y - 4 * k, 14 * k, 18 * k);
      c.fillRect(x + 2 * k, y - 4 * k, 14 * k, 18 * k);
      heart(c, x, y - 10 * k, 7 * k, '#e53935');
      break;
    case '밥':
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(x, y + 2 * k, 15 * k, Math.PI, 0);
      c.fill();
      c.stroke();
      c.fillStyle = '#90a4ae';
      c.fillRect(x - 15 * k, y + 2 * k, 30 * k, 10 * k);
      break;
    case '그림':
      c.strokeRect(x - 16 * k, y - 12 * k, 32 * k, 24 * k);
      circle(c, x - 6 * k, y - 4 * k, 4 * k, '#fdd835');
      c.fillStyle = '#66bb6a';
      c.beginPath();
      c.moveTo(x - 14 * k, y + 11 * k);
      c.lineTo(x, y - 2 * k);
      c.lineTo(x + 14 * k, y + 11 * k);
      c.fill();
      break;
    case '물':
      c.fillStyle = '#29b6f6';
      c.beginPath();
      c.moveTo(x, y - 16 * k);
      c.quadraticCurveTo(x + 14 * k, y + 4 * k, x, y + 14 * k);
      c.quadraticCurveTo(x - 14 * k, y + 4 * k, x, y - 16 * k);
      c.fill();
      break;
    case '음악':
      c.fillStyle = '#263238';
      circle(c, x - 8 * k, y + 10 * k, 5 * k, '#263238');
      circle(c, x + 10 * k, y + 6 * k, 5 * k, '#263238');
      c.fillRect(x - 4 * k, y - 14 * k, 2.5 * k, 24 * k);
      c.fillRect(x + 14 * k, y - 18 * k, 2.5 * k, 24 * k);
      c.fillRect(x - 4 * k, y - 16 * k, 20 * k, 4 * k);
      break;
    case '산책':
      c.fillStyle = '#66bb6a';
      circle(c, x + 12 * k, y - 4 * k, 8 * k, '#66bb6a');
      c.fillRect(x + 11 * k, y + 2 * k, 2 * k, 12 * k);
      stick(c, x - 6 * k, y + 6 * k, 22 * k);
      break;
    case '화장실':
      stick(c, x - 9 * k, y + 6 * k, 20 * k, '#1565c0');
      stick(c, x + 9 * k, y + 6 * k, 20 * k, '#d81b60');
      break;
    case '좋아요':
      circle(c, x, y, 15 * k, '#ffd54f');
      c.beginPath();
      c.arc(x, y + 2 * k, 8 * k, 0.2, Math.PI - 0.2);
      c.stroke();
      circle(c, x - 5 * k, y - 4 * k, 2 * k, '#263238');
      circle(c, x + 5 * k, y - 4 * k, 2 * k, '#263238');
      break;
    case '싫어요':
      circle(c, x, y, 15 * k, '#90caf9');
      c.beginPath();
      c.arc(x, y + 11 * k, 7 * k, Math.PI + 0.3, -0.3);
      c.stroke();
      circle(c, x - 5 * k, y - 4 * k, 2 * k, '#263238');
      circle(c, x + 5 * k, y - 4 * k, 2 * k, '#263238');
      break;
    case '더':
      c.lineWidth = 5 * k;
      c.beginPath();
      c.moveTo(x - 12 * k, y);
      c.lineTo(x + 12 * k, y);
      c.moveTo(x, y - 12 * k);
      c.lineTo(x, y + 12 * k);
      c.stroke();
      break;
    case '그만':
      c.fillStyle = '#e53935';
      c.fillRect(x - 13 * k, y - 13 * k, 26 * k, 26 * k);
      c.fillStyle = '#ffffff';
      c.fillRect(x - 3 * k, y - 9 * k, 6 * k, 18 * k);
      break;
    case '네':
      c.strokeStyle = '#2e7d32';
      c.lineWidth = 5 * k;
      circle(c, x, y, 13 * k, '#2e7d32', true);
      break;
    default:
      c.strokeStyle = '#c62828';
      c.lineWidth = 5 * k;
      c.beginPath();
      c.moveTo(x - 11 * k, y - 11 * k);
      c.lineTo(x + 11 * k, y + 11 * k);
      c.moveTo(x + 11 * k, y - 11 * k);
      c.lineTo(x - 11 * k, y + 11 * k);
      c.stroke();
  }
}
const paintAac: Paint = (c) => {
  const W = 600;
  const H = 368;
  FILL(c, W, H, '#ffffff');
  const cw = W / 6;
  const ch = H / 4;
  for (let r = 0; r < 4; r++)
    for (let col = 0; col < 6; col++) {
      const x = col * cw;
      const y = r * ch;
      c.fillStyle = AAC_ROW_COLOR[r];
      c.fillRect(x + 3, y + 3, cw - 6, ch - 6);
      c.strokeStyle = '#90a4ae';
      c.lineWidth = 2;
      c.strokeRect(x + 3, y + 3, cw - 6, ch - 6);
      aacSymbol(c, AAC_WORDS[r][col], x + cw / 2, y + ch * 0.42, 52);
      text(c, AAC_WORDS[r][col], x + cw / 2, y + ch - 14, AAC_WORDS[r][col].length > 3 ? 13 : 16, '#263238', 'center');
    }
};
const paintTalker: Paint = (c) => {
  FILL(c, 240, 160, '#eceff1');
  c.fillStyle = '#ffffff';
  c.fillRect(6, 6, 228, 30);
  ['나', '그림', '그리다', '좋아요'].forEach((w, i) => {
    c.fillStyle = ['#fff59d', '#ffcc80', '#c5e1a5', '#f8bbd0'][i];
    c.fillRect(10 + i * 48, 9, 44, 24);
    text(c, w, 32 + i * 48, 21, 10, '#263238', 'center');
  });
  text(c, '🔊', 218, 21, 14, '#1565c0', 'center', false);
  for (let r = 0; r < 3; r++)
    for (let col = 0; col < 5; col++) {
      const x = 8 + col * 46;
      const y = 44 + r * 38;
      c.fillStyle = AAC_ROW_COLOR[(r + col) % 4];
      c.fillRect(x, y, 42, 34);
      aacSymbol(c, AAC_WORDS[(r + 1) % 4][(col + r) % 6], x + 21, y + 15, 26);
    }
};
const paintSteps = (product: 'pen' | 'soap'): Paint => (c) => {
  FILL(c, 260, 180, '#ffffff');
  c.fillStyle = BLUE;
  c.fillRect(0, 0, 260, 30);
  text(c, product === 'pen' ? '작업 순서 · 볼펜 조립' : '작업 순서 · 비누 포장', 130, 15, 14, '#ffffff', 'center');
  const steps = product === 'pen' ? ['심 넣기', '뚜껑 끼우기', '10개 담기'] : ['비누 넣기', '상자 접기', '스티커 붙이기'];
  steps.forEach((s, i) => {
    const x = 10 + i * 84;
    c.fillStyle = ['#e3f2fd', '#fff8e1', '#e8f5e9'][i];
    c.fillRect(x, 38, 78, 132);
    circle(c, x + 14, 52, 11, BLUE);
    text(c, String(i + 1), x + 14, 53, 13, '#ffffff', 'center');
    // The picture.
    c.save();
    c.translate(x + 39, 100);
    if (product === 'pen') {
      c.fillStyle = i === 0 ? '#90a4ae' : '#1e88e5';
      c.fillRect(-26, -5, 52, 10);
      if (i === 0) {
        c.fillStyle = '#263238';
        c.fillRect(-34, -2, 22, 4);
      }
      if (i >= 1) {
        c.fillStyle = '#1565c0';
        c.fillRect(18, -7, 14, 14);
      }
      if (i === 2) {
        c.strokeStyle = '#8d6e63';
        c.lineWidth = 3;
        c.strokeRect(-30, -20, 60, 40);
      }
    } else {
      c.fillStyle = i === 0 ? '#f8bbd0' : '#ffffff';
      c.fillRect(-18, -12, 36, 24);
      c.strokeStyle = '#8d6e63';
      c.lineWidth = 3;
      if (i >= 1) c.strokeRect(-24, -16, 48, 32);
      if (i === 2) circle(c, 0, 0, 9, '#ffca28');
    }
    c.restore();
    text(c, s, x + 39, 152, s.length > 4 ? 11 : 13, '#263238', 'center');
  });
};
const paintTally: Paint = (c) => {
  FILL(c, 160, 200, '#ffffff');
  text(c, '오늘의 작업', 80, 14, 14, BLUE, 'center');
  text(c, '목표 100개', 80, 34, 11, '#546e7a', 'center', false);
  const names = ['민준', '서연', '하늘', '지우'];
  names.forEach((n, i) => {
    const y = 60 + i * 34;
    text(c, n, 8, y, 12, '#263238', 'left');
    for (let k = 0; k < 6; k++) {
      const got = k < 3 + ((i * 5) % 4);
      if (got) {
        circle(c, 52 + k * 17, y, 7, ['#ffca28', '#ef5350', '#66bb6a', '#42a5f5'][(k + i) % 4]);
        text(c, '★', 52 + k * 17, y + 1, 9, '#ffffff', 'center');
      } else circle(c, 52 + k * 17, y, 7, '#e0e0e0', true);
    }
  });
  text(c, '잘하고 있어요!', 80, 188, 11, '#e65100', 'center');
};
const paintRecipe: Paint = (c) => {
  FILL(c, 180, 240, '#fffdf5');
  c.fillStyle = '#e65100';
  c.fillRect(0, 0, 180, 30);
  text(c, '라면 끓이기', 90, 15, 16, '#ffffff', 'center');
  const steps: Array<[string, (x: number, y: number) => void]> = [
    ['물 550mL', (x, y) => {
      c.fillStyle = '#4fc3f7';
      c.fillRect(x - 10, y - 8, 20, 18);
      c.strokeStyle = '#263238';
      c.lineWidth = 2;
      c.strokeRect(x - 11, y - 12, 22, 23);
    }],
    ['끓으면 면 · 스프', (x, y) => {
      c.fillStyle = '#ffd54f';
      for (let i = 0; i < 4; i++) {
        c.beginPath();
        c.arc(x - 9 + i * 6, y, 4, 0, Math.PI);
        c.lineWidth = 2;
        c.strokeStyle = '#f9a825';
        c.stroke();
      }
    }],
    ['4분 기다리기', (x, y) => {
      circle(c, x, y, 11, '#ffffff');
      circle(c, x, y, 11, '#263238', true);
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x, y - 8);
      c.moveTo(x, y);
      c.lineTo(x + 6, y + 2);
      c.stroke();
    }],
    ['불 끄기', (x, y) => {
      circle(c, x, y, 10, '#e53935');
      c.strokeStyle = '#ffffff';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(x - 6, y - 6);
      c.lineTo(x + 6, y + 6);
      c.stroke();
    }],
  ];
  steps.forEach(([s, draw], i) => {
    const y = 58 + i * 50;
    c.fillStyle = i % 2 ? '#fff3e0' : '#ffffff';
    c.fillRect(4, y - 22, 172, 46);
    circle(c, 18, y, 10, '#e65100');
    text(c, String(i + 1), 18, y + 1, 12, '#ffffff', 'center');
    draw(52, y);
    text(c, s, 74, y, 13, '#263238', 'left');
  });
};
const paintLog: Paint = (c) => {
  FILL(c, 140, 180, PAPER);
  text(c, '건강 기록지', 70, 12, 12, BLUE, 'center');
  const rows: Array<[string, string]> = [['혈압', '124 / 80'], ['맥박', '72'], ['체온', '36.5℃'], ['약', '아침 ✓ 점심 ✓'], ['기분', '좋음']];
  rows.forEach(([k, v], i) => {
    const y = 36 + i * 26;
    c.fillStyle = '#e0e0e0';
    c.fillRect(6, y + 11, 128, 1);
    text(c, k, 8, y, 10, '#78909c', 'left', false);
    text(c, v, 46, y, 11, '#263238', 'left');
  });
};
const paintBp: Paint = (c) => {
  FILL(c, 96, 64, '#d7e8d3');
  text(c, '124', 70, 18, 20, '#1b2a1b', 'right');
  text(c, '80', 70, 42, 16, '#1b2a1b', 'right');
  text(c, '♡72', 92, 56, 9, '#c62828', 'right');
  text(c, 'mmHg', 6, 10, 8, '#33691e', 'left', false);
};
const paintTimer: Paint = (c) => {
  FILL(c, 96, 48, '#263238');
  text(c, '4:00', 48, 25, 30, '#ffeb3b', 'center');
};
const paintLargePrint = (left: boolean): Paint => (c) => {
  FILL(c, 160, 220, '#fffef8');
  if (left) {
    text(c, '봄날의 산책', 80, 22, 20, '#1a1a1a', 'center');
    ['바람이 불어요.', '꽃이 피었어요.', '우리는 천천히', '함께 걸어요.'].forEach((s, i) => text(c, s, 12, 64 + i * 38, 18, '#1a1a1a', 'left'));
  } else {
    ['새가 노래해요.', '햇살이 따뜻해요.', '오늘은 참', '좋은 날이에요.'].forEach((s, i) => text(c, s, 12, 30 + i * 38, 18, '#1a1a1a', 'left'));
    text(c, '- 12 -', 80, 204, 12, '#757575', 'center', false);
  }
};
const paintBraille: Paint = (c) => {
  FILL(c, 220, 150, '#fbf6ea');
  const r = seeded(17);
  for (let line = 0; line < 7; line++)
    for (let cell = 0; cell < 13; cell++) {
      if (line === 0 && cell > 7) continue;
      brailleCell(c, 10 + cell * 16, 12 + line * 19, 5, Math.floor(r() * 63) + 1, '#a1887f');
    }
};
const paintMagnifier: Paint = (c) => {
  FILL(c, 200, 140, '#000000');
  text(c, '봄날의', 100, 50, 46, '#ffeb3b', 'center');
  text(c, '산책', 100, 108, 46, '#ffeb3b', 'center');
};
const paintPcScreen: Paint = (c) => {
  FILL(c, 320, 200, '#000000');
  c.fillStyle = '#ffeb3b';
  c.fillRect(0, 0, 320, 30);
  text(c, '쉬운 화면 · 화면 낭독 켜짐', 10, 15, 13, '#000000', 'left');
  const items: Array<[string, string]> = [['음악 듣기', '♪'], ['사진 보기', '▣'], ['메시지', '✉'], ['날씨', '☀']];
  items.forEach(([s, ic], i) => {
    const x = 12 + (i % 2) * 154;
    const y = 42 + Math.floor(i / 2) * 76;
    c.fillStyle = i === 0 ? '#ffeb3b' : '#1a1a1a';
    c.fillRect(x, y, 142, 66);
    c.strokeStyle = '#ffeb3b';
    c.lineWidth = 3;
    c.strokeRect(x, y, 142, 66);
    text(c, ic, x + 26, y + 34, 26, i === 0 ? '#000000' : '#ffeb3b', 'center');
    text(c, s, x + 52, y + 34, 18, i === 0 ? '#000000' : '#ffffff', 'left');
  });
  text(c, '🔊 "음악 듣기, 버튼"', 160, 190, 12, '#80deea', 'center', false);
};
const paintKeys: Paint = (c) => {
  FILL(c, 240, 90, '#263238');
  const rows = ['ㅂㅈㄷㄱㅅㅛ', 'ㅁㄴㅇㄹㅎㅗ', 'ㅋㅌㅊㅍㅠㅜ'];
  rows.forEach((row, r) =>
    [...row].forEach((ch, i) => {
      const x = 6 + i * 39;
      const y = 4 + r * 28;
      c.fillStyle = '#fdd835';
      c.fillRect(x, y, 35, 24);
      text(c, ch, x + 17, y + 13, 16, '#000000', 'center');
    }),
  );
};
const paintPainting = (i: number): Paint => (c) => {
  FILL(c, 128, 110, '#ffffff');
  const r = seeded(31 + i);
  if (i === 0) {
    c.fillStyle = '#bbdefb';
    c.fillRect(0, 0, 128, 70);
    c.fillStyle = '#a5d6a7';
    c.fillRect(0, 70, 128, 40);
    circle(c, 100, 22, 14, '#ffca28');
    for (let k = 0; k < 7; k++) {
      const x = 12 + k * 16;
      c.fillStyle = '#2e7d32';
      c.fillRect(x, 72, 2, 18);
      circle(c, x + 1, 70, 6, ['#e53935', '#f06292', '#ffca28', '#ab47bc'][k % 4]);
    }
  } else if (i === 1) {
    for (let k = 0; k < 26; k++) circle(c, r() * 128, r() * 110, 4 + r() * 12, ['#ef5350', '#42a5f5', '#ffca28', '#66bb6a', '#ab47bc'][k % 5]);
  } else if (i === 2) {
    c.fillStyle = '#fff3e0';
    c.fillRect(0, 0, 128, 110);
    c.fillStyle = '#ef6c00';
    c.fillRect(34, 50, 60, 44);
    c.beginPath();
    c.moveTo(28, 52);
    c.lineTo(64, 20);
    c.lineTo(100, 52);
    c.fillStyle = '#c62828';
    c.fill();
    c.fillStyle = '#5d4037';
    c.fillRect(58, 72, 14, 22);
  } else {
    c.fillStyle = '#e1f5fe';
    c.fillRect(0, 0, 128, 110);
    circle(c, 64, 64, 30, '#8d6e63');
    circle(c, 64, 34, 20, '#8d6e63');
    for (const sx of [-1, 1]) {
      c.fillStyle = '#8d6e63';
      c.beginPath();
      c.moveTo(64 + sx * 18, 22);
      c.lineTo(64 + sx * 10, 4);
      c.lineTo(64 + sx * 4, 18);
      c.fill();
      circle(c, 64 + sx * 7, 32, 3, '#263238');
    }
  }
  text(c, ['서연', '하늘', '민준', '지우'][i % 4], 120, 102, 9, '#616161', 'right', false);
};
const paintMap: Paint = (c) => {
  FILL(c, 256, 184, '#37474f');
  c.fillStyle = '#546e7a';
  c.fillRect(10, 10, 236, 164);
  const rooms: Array<[number, number, number, number, string, string]> = [
    [16, 16, 110, 70, '#ffb74d', '활동실'],
    [132, 16, 108, 44, '#4fc3f7', '회의실'],
    [132, 66, 108, 44, '#aed581', '사무실'],
    [16, 112, 224, 40, '#fff176', '로비'],
  ];
  for (const [x, y, w, h, col, s] of rooms) {
    c.fillStyle = col;
    c.fillRect(x, y, w, h);
    text(c, s, x + w / 2, y + h / 2, 14, '#1a1a1a', 'center');
  }
  c.fillStyle = '#ffffff';
  c.fillRect(110, 152, 30, 22);
  text(c, '입구', 125, 164, 10, '#1a1a1a', 'center');
  circle(c, 200, 136, 10, '#e53935');
  text(c, '현재 위치', 200, 160, 9, '#ffffff', 'center');
};
const paintChecklist: Paint = (c) => {
  FILL(c, 120, 160, PAPER);
  text(c, '편의시설 점검표', 60, 12, 11, BLUE, 'center');
  ['경사로 기울기', '점자블록', '음성 안내', '손잡이', '엘리베이터', '화장실 호출'].forEach((s, i) => {
    const y = 34 + i * 21;
    c.strokeStyle = '#90a4ae';
    c.lineWidth = 1.2;
    c.strokeRect(6, y - 6, 12, 12);
    if (i < 4) text(c, '✓', 12, y, 12, '#2e7d32', 'center');
    text(c, s, 24, y, 10, '#263238', 'left', false);
  });
};

// ---------------------------------------------------------------------------------------------
// Things in the hands.

/** A ballpoint pen (its middle at the origin, along x): the barrel, the refill's tip, the cap. */
function pen(g: THREE.Object3D, color: string, capped = true): THREE.Group {
  const p = group(g);
  part(p, cyl(0.006, 0.006, 0.12, 8), '#eceff1', 0, 0, 0, { rz: Math.PI / 2, outline: false });
  part(p, cyl(0.002, 0.004, 0.015, 6), '#455a64', 0.067, 0, 0, { rz: -Math.PI / 2, outline: false });
  if (capped) part(p, cyl(0.0075, 0.0075, 0.045, 8), color, -0.04, 0, 0, { rz: Math.PI / 2, outline: false });
  return p;
}
/** A bar of handmade soap in its little printed box. */
function soap(g: THREE.Object3D, color: string, boxed = true): THREE.Group {
  const s = group(g);
  part(s, rbox(0.07, 0.028, 0.05, 0.01), color, 0, 0, 0);
  if (boxed) {
    part(s, box(0.076, 0.034, 0.056), '#ffffff', 0, 0, 0);
    part(s, box(0.077, 0.012, 0.057), BLUE, 0, 0, 0, { outline: false });
  }
  return s;
}
/** A spiky tactile ball. */
function tactileBall(g: THREE.Object3D, color: string, r = 0.045): THREE.Group {
  const b = group(g);
  part(b, ball(r), color, 0, 0, 0);
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4;
    const yy = 1 - (2 * (i + 0.5)) / 14;
    const rr = Math.sqrt(1 - yy * yy);
    part(b, ball(r * 0.22), shade(color, 1.15), Math.cos(a) * rr * r, yy * r, Math.sin(a) * rr * r, { outline: false });
  }
  return b;
}

let benchCount = 0;

export const BUILDERS: Record<string, Builder> = {
  /**
   * The sensory room's mat (감각 통합 매트): soft padded squares in pastel colours over the floor; a
   * bubble tube on its padded plinth in the back right corner, the water lit and turning slowly
   * through the colours, bubbles and two little fish rising in it, a mirror panel behind; a light box
   * at the back left spilling fibre-optic strands over the mat, their tips glowing; a beanbag, a
   * weighted blanket folded, a basket of spiky tactile balls. A session: sat cross-legged on the
   * mat, turned to the user curled in the beanbag (drawn in) — a ball offered to their hands, the
   * glowing strands drawn over their open palms, the tube pointed out (they turn to look), breathing
   * slowly together.
   */
  sensoryMat(g, _W, _D, _c, _def, _ctx, out) {
    const T = SENSE.top;
    part(g, rbox(1.96, 0.04, 0.98, 0.02), '#cfd8dc', 0, 0.02, 0);
    const PADS = ['#ce93d8', '#80deea', '#ffcc80', '#a5d6a7', '#90caf9', '#f8bbd0', '#fff59d', '#b39ddb'];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) part(g, rbox(0.47, 0.04, 0.47, 0.03), PADS[(i + j * 5) % 8], -0.735 + i * 0.49, 0.06, -0.245 + j * 0.49);
    // The bubble tube in the back right corner.
    const [tx, , tz] = SENSE.tube;
    part(g, box(0.7, 1.7, 0.02), '#dde7ec', tx + 0.02, 0.93, -0.47);
    part(g, box(0.66, 1.64, 0.004), '#eef5f8', tx + 0.02, 0.93, -0.458, { outline: false });
    part(g, rbox(0.38, 0.3, 0.38, 0.06), '#b39ddb', tx, T + 0.15, tz);
    part(g, cyl(0.125, 0.125, 0.06, 24), CHROME, tx, T + 0.33, tz);
    const tubeY = T + 0.36 + 0.68;
    const water = ownGlow(g, cyl(0.088, 0.088, 1.32, 24), '#7e57c2', tx, tubeY, tz, 0.6);
    glass(g, cyl(0.1, 0.1, 1.36, 24), tx, tubeY, tz);
    part(g, cyl(0.115, 0.11, 0.05, 24), CHROME, tx, tubeY + 0.7, tz);
    const WATER = water.material as THREE.MeshBasicMaterial;
    // A few bubbles caught when it's still, and the fish.
    const BUB = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7, depthWrite: false });
    const bubbles: THREE.Mesh[] = [];
    for (let i = 0; i < 9; i++) {
      const m = new THREE.Mesh(ball(0.012 + (i % 3) * 0.004), BUB);
      m.position.set(tx + 0.04 * Math.sin(i * 2.1), T + 0.45 + i * 0.14, tz + 0.04 * Math.cos(i * 1.7));
      g.add(m);
      bubbles.push(m);
    }
    const fish = [0, 1].map((i) => {
      const f = group(g, tx, 0.8 + i * 0.35, tz);
      part(f, ball(0.022), i ? '#ffca28' : '#ff7043', 0, 0, 0, { outline: false }).scale.set(1.6, 1, 0.7);
      part(f, cyl(0, 0.02, 0.03, 6), i ? '#ffca28' : '#ff7043', -0.045, 0, 0, { rz: Math.PI / 2, outline: false });
      return f;
    });
    // The fibre-optic light box at the back left, its strands spilling over the mat.
    const [fx, , fz] = SENSE.fibre;
    part(g, rbox(0.24, 0.12, 0.18, 0.02), '#37474f', fx, T + 0.06, fz);
    for (let i = 0; i < 5; i++) part(g, box(0.16, 0.006, 0.004), '#263238', fx, T + 0.03 + i * 0.015, fz + 0.091, { outline: false });
    const tipMats = ['#4fc3f7', '#f06292', '#aed581'].map((c) => new THREE.MeshBasicMaterial({ color: c }));
    const rr = seeded(13);
    const p0 = v3(fx, T + 0.13, fz);
    for (let i = 0; i < 18; i++) {
      const a = 0.25 + (i / 17) * 2.1 + (rr() - 0.5) * 0.1;
      const r = 0.24 + rr() * 0.14;
      const dx = -Math.cos(a) * r * 0.9;
      const dz = Math.sin(a) * r;
      const p1 = v3(fx + dx * 0.3, T + 0.42 + rr() * 0.12, fz + dz * 0.3);
      const p2 = v3(fx + dx * 0.75, T + 0.22, fz + dz * 0.75);
      const p3 = v3(fx + dx, T + 0.012, fz + dz);
      rod(g, p0, p1, 0.0035, '#eceff1');
      rod(g, p1, p2, 0.0035, '#eceff1');
      rod(g, p2, p3, 0.0035, '#eceff1');
      const tip = new THREE.Mesh(ball(0.011), tipMats[i % 3]);
      tip.position.copy(p3);
      g.add(tip);
    }
    // The beanbag, its back bulging up behind where they sit; a blanket; a basket of tactile balls.
    const bag = group(g, SENSE.user.x - 0.03, T, SENSE.user.z - 0.03, SENSE.user.yaw);
    part(bag, ball(0.34), '#4db6ac', 0, 0.17, 0, { outline: true }).scale.set(1.15, 0.55, 1.1);
    part(bag, ball(0.28), '#4db6ac', 0, 0.3, -0.2).scale.set(1.1, 0.95, 0.6);
    part(g, rbox(0.42, 0.07, 0.32, 0.03), '#7986cb', -0.62, T + 0.035, 0.3);
    part(g, box(0.42, 0.005, 0.02), '#5c6bc0', -0.62, T + 0.07, 0.24, { outline: false });
    part(g, cyl(0.15, 0.12, 0.12, 16), '#d7b98e', 0.78, T + 0.06, 0.28);
    ['#ef5350', '#42a5f5', '#ffca28', '#66bb6a'].forEach((col, i) => {
      const b = tactileBall(g, col, 0.042);
      b.position.set(0.78 + Math.cos(i * 1.6) * 0.06, T + 0.14 + (i % 2) * 0.02, 0.28 + Math.sin(i * 1.6) * 0.06);
    });

    const clock = marker(g, 0, 0.5, 0);
    const sit = spotAt(g, 'sit', SENSE.dweller, 'dsSensory', clock, true);
    out.spots = { '*': sit };

    // In use: the user in the beanbag, the ball and the strands in the hands, the water alive.
    const use = group(g);
    out.inUse = use;
    const user = person(use, LOOKS.haneul, SENSE.user.x, SENSE.user.z, SENSE.user.yaw, { hipY: SENSE.user.seat + 0.06, hipZ: -0.05, lean: -0.32, ankleL: v3(0.13, T + 0.06, 0.5), ankleR: v3(-0.11, T + 0.06, 0.46) }, 0);
    const held = group(use);
    const heldBall = tactileBall(held, '#ff7043', 0.045);
    const bundle = group(use);
    for (let i = 0; i < 6; i++) {
      rod(bundle, v3(0, 0, 0), v3(-0.02 + i * 0.008, -0.04, 0.06 + i * 0.012), 0.003, '#eceff1');
      const tip = new THREE.Mesh(ball(0.009), tipMats[i % 3]);
      tip.position.set(-0.02 + i * 0.008, -0.04, 0.06 + i * 0.012);
      bundle.add(tip);
    }
    const left = new THREE.Vector3(Math.cos(SENSE.user.yaw), 0, -Math.sin(SENSE.user.yaw));
    const palms = P(SENSE_PALMS);
    const c = new THREE.Color();
    out.animate = (t) => {
      const ph = clockOf(clock);
      const b = sensoryBeat(t, ph);
      const k = dsKey('dsSensory', t, ph);
      // The tube: slowly through the colours, bubbles rising, the fish drifting.
      const hue = (t * 0.035 + ph) % 1;
      WATER.color.copy(c.setHSL(hue, 0.75, 0.62));
      tipMats.forEach((m, i) => m.color.setHSL((hue + 0.33 * i + 0.1) % 1, 0.9, 0.62));
      bubbles.forEach((m, i) => {
        const u = (t * 0.22 + i / bubbles.length) % 1;
        m.position.set(tx + 0.045 * Math.sin(t * 2 + i * 2.1), T + 0.42 + u * 1.25, tz + 0.04 * Math.cos(t * 1.7 + i));
      });
      fish.forEach((f, i) => {
        f.position.y = 0.95 + 0.38 * Math.sin(t * 0.21 + i * 2.4);
        f.rotation.y = t * 0.5 + i * 3;
        f.position.x = tx + 0.03 * Math.cos(t * 0.5 + i * 3);
        f.position.z = tz - 0.03 * Math.sin(t * 0.5 + i * 3);
      });
      held.visible = ballOut(b);
      held.position.copy(inPiece(SENSE.dweller, k.r, 0, 0.015, 0));
      heldBall.rotation.y = t * 0.6;
      bundle.visible = fibreOut(b);
      bundle.position.copy(inPiece(SENSE.dweller, k.r, 0, 0.03, 0));
      bundle.rotation.y = SENSE.dweller.yaw;
      // Their hands: open palms held out for the ball and the strands, on the tummy breathing.
      const open = amountOf(b, 'offer') + amountOf(b, 'fibre');
      const breathe = amountOf(b, 'breathe');
      if (open > 0.4) {
        user.armL(palms.clone().addScaledVector(left, 0.07));
        user.armR(amountOf(b, 'offer') > 0.7 && b.p > 0.4 ? held.position : palms.clone().addScaledVector(left, -0.07));
      } else if (breathe > 0.5) {
        user.armL(on(user, 0.06, SENSE.user.seat + 0.3, 0.05));
        user.armR(on(user, -0.05, SENSE.user.seat + 0.22, 0.1));
      } else {
        user.armL(null);
        user.armR(null);
      }
      // They turn to the tube when it's pointed out.
      user.head.rotation.y = 0.75 * amountOf(b, 'point');
      user.head.rotation.x = 0.25 * open - 0.1 * amountOf(b, 'point') + 0.05 * Math.sin(t * 0.5);
    };
  },

  /**
   * The 보호작업장 bench (보호작업장 작업대): a long beech-topped work table on steel legs, a pegboard
   * behind with tape, scissors, the day's sticker chart (오늘의 작업 · 목표 100개) and the workshop's
   * sign; along the back a row of parts bins (barrels, refills, caps — or soap, boxes and stickers on
   * the second bench), a wooden jig before each stool, the step card in pictures on its stand in the
   * middle, the demo tray and the box of finished work. Showing the job (assembleCraft): sat on the
   * stool beside the user, a part taken from the bin, put together slowly over the jig, held out for
   * them to see, laid in the tray; watching them do it (drawn in, working at their own jig), a part
   * passed across, a thumbs up. Fitting the job to them (jobCoach): stood behind between the stools,
   * their jig slid nearer their hand and tightened, a finger down the step card, a little clap.
   */
  workshopBench(g, _W, _D, _c, _def, _ctx, out) {
    const n = benchCount++;
    const product: 'pen' | 'soap' = n % 2 ? 'soap' : 'pen';
    const top = BENCH.top;
    const z0 = -0.44;
    const z1 = BENCH.front;
    const zc = (z0 + z1) / 2;
    part(g, rbox(1.94, 0.04, z1 - z0, 0.012), '#d7b98e', 0, top - 0.02, zc);
    part(g, box(1.94, 0.012, 0.012), EDGE, 0, top - 0.025, z1 + 0.001, { outline: false });
    for (const sx of [-1, 1])
      for (const z of [z0 + 0.05, z1 - 0.05]) part(g, box(0.04, top - 0.04, 0.04), '#90a4ae', sx * 0.9, (top - 0.04) / 2, z);
    part(g, box(1.8, 0.03, 0.5), '#b0bec5', 0, 0.16, zc);
    // Under the bench: crates of material.
    for (const sx of [-0.55, 0.0, 0.55]) {
      part(g, rbox(0.4, 0.2, 0.32, 0.02), sx === 0 ? '#ffb74d' : '#4fc3f7', sx, 0.275, zc - 0.04);
      part(g, box(0.36, 0.01, 0.28), '#ffffff', sx, 0.38, zc - 0.04, { outline: false });
    }
    // The pegboard behind, the tools, the chart and the sign.
    part(g, rbox(1.9, 0.62, 0.025, 0.01), '#efe6d8', 0, top + 0.36, z0 + 0.01);
    const pr = seeded(5 + n);
    for (let i = 0; i < 70; i++) part(g, box(0.008, 0.008, 0.002), '#bcaaa4', -0.9 + (i % 14) * 0.13 + 0.03, top + 0.1 + Math.floor(i / 14) * 0.12, z0 + 0.024, { outline: false });
    part(g, rbox(1.2, 0.1, 0.02, 0.01), BLUE, -0.25, top + 0.6, z0 + 0.03);
    label(g, product === 'pen' ? '다온 보호작업장 · 볼펜 조립반' : '다온 보호작업장 · 비누 포장반', 1.1, 0.075, -0.25, top + 0.6, z0 + 0.041, BLUE, '#ffffff');
    picture(g, painted('dsTally', 160, 200, paintTally), 0.22, 0.28, 0.66, top + 0.32, z0 + 0.026);
    // Tape and scissors on pegs.
    part(g, cyl(0.045, 0.045, 0.03, 16), '#fff59d', -0.7, top + 0.32, z0 + 0.06, { rx: Math.PI / 2 });
    part(g, cyl(0.022, 0.022, 0.032, 12), '#8d6e63', -0.7, top + 0.32, z0 + 0.06, { rx: Math.PI / 2, outline: false });
    for (const s of [-1, 1]) part(g, ring(0.018, 0.005), '#e53935', -0.5 + s * 0.02, top + 0.26, z0 + 0.04);
    part(g, box(0.012, 0.1, 0.004), CHROME, -0.5, top + 0.34, z0 + 0.04, { rz: 0.1, outline: false });
    part(g, box(0.012, 0.1, 0.004), CHROME, -0.49, top + 0.34, z0 + 0.04, { rz: -0.1, outline: false });
    // The bins along the back and what's in them.
    const binColors = ['#ef5350', '#42a5f5', '#ffca28'];
    BENCH.bins.forEach((bx, i) => {
      const col = binColors[i % 3];
      const bg = group(g, bx, top, BENCH.binZ - 0.02);
      part(bg, rbox(0.17, 0.1, 0.2, 0.012), col, 0, 0.05, 0);
      part(bg, box(0.15, 0.004, 0.18), shade(col, 0.7), 0, 0.085, 0, { outline: false });
      for (let k = 0; k < 6; k++) {
        const px = (pr() - 0.5) * 0.11;
        const pz = (pr() - 0.5) * 0.12;
        if (product === 'pen') {
          const col2 = i % 3 === 0 ? '#eceff1' : i % 3 === 1 ? '#455a64' : '#1e88e5';
          part(bg, cyl(i % 3 === 2 ? 0.008 : 0.005, i % 3 === 2 ? 0.008 : 0.005, i % 3 === 2 ? 0.04 : 0.11, 6), col2, px, 0.095, pz, { rz: Math.PI / 2, ry: pr() * 3, outline: false });
        } else if (i % 3 === 0) part(bg, rbox(0.06, 0.025, 0.045, 0.01), ['#f8bbd0', '#c5e1a5', '#fff59d'][k % 3], px, 0.1, pz, { ry: pr() * 3 });
        else if (i % 3 === 1) part(bg, box(0.08, 0.004, 0.11), '#ffffff', px * 0.3, 0.09 + k * 0.005, pz * 0.3, { outline: false });
        else part(bg, cyl(0.012, 0.012, 0.004, 10), '#ffca28', px, 0.09, pz, { outline: false });
      }
    });
    // The jigs: the user's slides towards them as it's fitted.
    const jig = (x: number) => {
      const j = group(g, x, top, BENCH.jigZ);
      part(j, rbox(0.24, 0.03, 0.1, 0.01), '#a1887f', 0, 0.015, 0);
      for (let k = 0; k < 5; k++) part(j, cyl(0.009, 0.009, 0.004, 10), '#4e342e', -0.08 + k * 0.04, 0.031, 0, { outline: false });
      part(j, box(0.24, 0.012, 0.012), '#6d4c41', 0, 0.036, -0.044, { outline: false });
      return j;
    };
    jig(BENCH.demo.x);
    const userJig = jig(BENCH.user.x);
    // The step card on its stand, the demo tray, the box of finished work.
    const cs = group(g, BENCH.card[0], top, BENCH.card[2]);
    part(cs, rbox(0.16, 0.012, 0.08, 0.004), '#cfd8dc', 0, 0.006, 0);
    part(cs, box(0.012, 0.12, 0.012), '#cfd8dc', 0, 0.07, -0.02, { outline: false });
    const card = picture(cs, painted(`dsSteps|${product}`, 260, 180, paintSteps(product)), 0.28, 0.194, 0, BENCH.card[1] - top, 0.0, '#ffffff', 0, -0.35);
    card.renderOrder = 1;
    part(g, rbox(0.2, 0.02, 0.14, 0.006), '#cfd8dc', BENCH.tray[0], top + 0.01, BENCH.tray[2]);
    for (let k = 0; k < 3; k++) {
      const it = product === 'pen' ? pen(g, '#1e88e5') : soap(g, ['#f8bbd0', '#c5e1a5', '#fff59d'][k]);
      it.position.set(BENCH.tray[0] + (product === 'pen' ? 0 : -0.05 + k * 0.05), top + 0.03, BENCH.tray[2] - 0.04 + k * 0.035);
    }
    const bx = group(g, BENCH.box[0], top, BENCH.box[2]);
    part(bx, box(0.24, 0.08, 0.17), '#d7b98e', 0, 0.04, 0);
    part(bx, box(0.22, 0.002, 0.15), '#bfa078', 0, 0.075, 0, { outline: false });
    for (let k = 0; k < 6; k++) {
      const it = product === 'pen' ? pen(bx, '#1e88e5') : soap(bx, ['#f8bbd0', '#c5e1a5', '#fff59d'][k % 3]);
      it.position.set(product === 'pen' ? 0 : -0.07 + (k % 3) * 0.07, 0.085, -0.06 + (product === 'pen' ? k * 0.024 : Math.floor(k / 3) * 0.06));
    }
    label(bx, '완성품', 0.14, 0.04, 0, 0.04, 0.086, '#d7b98e', '#4e342e');
    // The stools.
    stool(g, BENCH.user.x, BENCH.user.z, '#ff8a65');
    stool(g, BENCH.demo.x, BENCH.demo.z, '#64b5f6');

    const clock = marker(g, 0, 1, 0);
    const demo = spotAt(g, 'sit', BENCH.demo, 'dsDemo', clock);
    const coach = spotAt(g, 'stand', BENCH.coach, 'dsCoach', clock);
    out.spots = { assembleCraft: demo, disabilitySupport_jobCoach: coach, '*': demo };

    // In use: the user at their jig; the part in the worker's hand; the part passed.
    const use = group(g);
    out.inUse = use;
    const user = person(use, n % 2 ? LOOKS.jiwoo : LOOKS.minjun, BENCH.user.x, BENCH.user.z, BENCH.user.yaw, SEATED(0.48, 0.36));
    const piece = () => (product === 'pen' ? pen(use, '#1e88e5', true) : soap(use, '#f8bbd0', true));
    const inHand = piece();
    const passed = piece();
    const theirs = piece();
    const jigAt = v3(BENCH.user.x, top + 0.06, BENCH.jigZ);
    out.animate = (t) => {
      const ph = clockOf(clock);
      const coaching = posed(coach, t) && !posed(demo, t);
      // Their own work: putting one together over the jig, a look up now and then.
      const work = (dz: number) => {
        const w = Math.sin(t * 2.3);
        user.armL(jigAt.clone().add(v3(-0.06, 0.01, 0.02 + dz)));
        user.armR(jigAt.clone().add(v3(0.06 + 0.01 * w, 0.02 + 0.01 * Math.sin(t * 4.6), 0.02 + dz)));
        theirs.visible = true;
        theirs.position.copy(jigAt).add(v3(0, 0.0, 0.02 + dz));
      };
      inHand.visible = passed.visible = false;
      user.head.rotation.set(0.45, 0, 0);
      if (coaching) {
        const b = coachBeat(t, ph);
        const slide = jigSlide(b);
        userJig.position.z = BENCH.jigZ + 0.06 * slide;
        if (amountOf(b, 'jig') > 0.5) {
          user.armL(null);
          user.armR(null);
          theirs.visible = false;
          user.head.rotation.x = 0.5;
        } else {
          work(0.06 * slide);
          user.head.rotation.x = amountOf(b, 'card') > 0.5 ? 0.15 : amountOf(b, 'clap') > 0.5 ? -0.05 : 0.45;
        }
        return;
      }
      userJig.position.z = BENCH.jigZ;
      const b = demoBeat(t, ph);
      const k = dsKey('dsDemo', t, ph);
      const hand = demoPart(b);
      inHand.visible = hand !== null;
      if (hand) inHand.position.copy(inPiece(BENCH.demo, hand === 'r' ? k.r : k.l, 0, 0.01, 0));
      inHand.rotation.y = hand === 'r' && amountOf(b, 'show') > 0.5 ? 0.5 : 0;
      const pass = passOut(b);
      passed.visible = pass;
      if (pass) passed.position.copy(inPiece(BENCH.demo, k.r, 0, 0.01, 0));
      const watchingDemo = amountOf(b, 'join') + amountOf(b, 'show') > 0.5;
      if (watchingDemo) {
        // Hands down, looking over at what's shown.
        user.armL(null);
        user.armR(on(user, -0.08, 0.64, 0.24));
        theirs.visible = false;
        user.head.rotation.set(0.3 - 0.25 * amountOf(b, 'show'), 0.55, 0);
      } else if (amountOf(b, 'pass') > 0.5) {
        user.armL(P(BENCH_PASS).add(v3(0.04, 0, 0.03)));
        user.armR(null);
        theirs.visible = false;
        user.head.rotation.set(0.35, 0.4, 0);
      } else {
        work(0);
        user.head.rotation.set(amountOf(b, 'praise') > 0.5 ? 0.05 : 0.5, amountOf(b, 'praise') > 0.5 ? 0.45 : 0, 0);
      }
    };
  },

  /**
   * The parallel bars (보행 훈련 평행봉): a low deck with a grey non-slip mat and yellow step lines,
   * two oak rails on chrome posts with their height pins, a tall gait mirror at the far end, '천천히
   * 안전하게' on the near post. Walking with a user (walkTraining, and the 재활센터's goal-setting
   * walk): their wheelchair left at the end, they walk the bars with a hand on each rail, a gait belt
   * round the waist (drawn in, the feet stepping) — the worker side-steps along outside the front rail
   * with a hand at the belt and the other ready by their shoulder, a thumbs up at the end, turned
   * round together and back. A sit-to-stand practised (learnTransfer): crouched in front of the
   * wheelchair, both hands on the belt, rocked forward on 하나 둘 셋 and up together, the user's hands
   * going to the bars' ends, stood steady, lowered back down.
   */
  parallelBars(g, _W, _D, _c, _def, _ctx, out) {
    const deck = BARS.deck;
    part(g, rbox(1.94, deck, 0.86, 0.015), '#8d6e63', 0, deck / 2, 0);
    part(g, box(1.86, 0.004, 0.8), '#607d8b', 0, deck + 0.002, 0, { outline: false });
    for (const sx of [-1, 1]) part(g, box(0.06, 0.004, 0.8), '#ffd54f', sx * 0.94, deck + 0.003, 0, { outline: false });
    const s = (BARS.x1 - BARS.x0) / 8;
    for (let i = 0; i <= 8; i++) part(g, box(0.018, 0.003, 0.36), '#fdd835', BARS.x0 + i * s, deck + 0.005, 0, { outline: false });
    // Posts, rails and pins.
    for (const z of [-BARS.railZ, BARS.railZ]) {
      for (const x of [-BARS.railX, 0, BARS.railX]) {
        part(g, rbox(0.1, 0.02, 0.1, 0.008), '#455a64', x, deck + 0.01, z);
        part(g, cyl(0.022, 0.022, BARS.rail - deck - 0.02, 12), CHROME, x, (BARS.rail + deck) / 2 - 0.01, z, { outline: false });
        part(g, cyl(0.03, 0.03, 0.06, 12), '#90a4ae', x, 0.55, z);
        part(g, ball(0.014), '#e53935', x, 0.55, z + (z > 0 ? 0.035 : -0.035), { outline: false });
      }
      part(g, cyl(0.022, 0.022, BARS.railX * 2 + 0.08, 14), OAK, 0, BARS.rail, z, { rz: Math.PI / 2 });
      for (const sx of [-1, 1]) part(g, ball(0.026), OAK_DARK, sx * (BARS.railX + 0.04), BARS.rail, z);
    }
    // The gait mirror at the far end.
    const mx = 0.95;
    part(g, rbox(0.05, 1.6, 0.74, 0.015), '#eceff1', mx, 0.98, 0);
    part(g, box(0.006, 1.5, 0.66), '#cfe3ec', mx - 0.028, 0.98, 0, { outline: false });
    part(g, box(0.004, 1.2, 0.08), '#ffffff', mx - 0.032, 1.1, -0.18, { outline: false });
    part(g, rbox(0.3, 0.03, 0.7, 0.01), '#455a64', mx, 0.015, 0);
    // The sign on the near post.
    label(g, '천천히 · 안전하게', 0.3, 0.07, -BARS.railX, 0.75, BARS.railZ + 0.03, '#ffffff', BLUE);

    const clock = marker(g, 0, 1, 0);
    const walk = spotAt(g, 'stand', { x: BARS.x0, y: 0, z: BARS.dwellerZ, yaw: Math.PI }, 'dsWalk', clock);
    const transfer = spotAt(g, 'stand', BARS.transfer, 'dsTransfer', clock);
    out.spots = { walkTraining: walk, physicalTherapist_motivateStroke: walk, disabilitySupport_learnTransfer: transfer, '*': walk };

    // In use: the wheelchair at the end, the user (walking, or rising from it).
    const use = group(g);
    out.inUse = use;
    wheelchair(use, BARS.chair.x, BARS.chair.z, BARS.chair.yaw, '#00897b', false);
    const user = person(use, LOOKS.daeho, BARS.x0, 0, Math.PI / 2, STAND, deck);
    gaitBelt(user);
    const al = new THREE.Vector3();
    const ar = new THREE.Vector3();
    out.animate = (t) => {
      const ph = clockOf(clock);
      if (posed(transfer, t) && !posed(walk, t)) {
        const b = transferBeat(t, ph);
        const { up, lean } = riseOf(b);
        const hips = transferHips(up);
        user.root.position.set(BARS.chair.x, 0, BARS.chair.z);
        user.root.rotation.y = BARS.chair.yaw;
        const feetZ = BARS.feetX - BARS.chair.x;
        user.pose({ hipY: hips[1], hipZ: hips[0] - BARS.chair.x, lean, ankleL: v3(0.1, deck + 0.08, feetZ), ankleR: v3(-0.1, deck + 0.08, feetZ) });
        if (up > 0.55) {
          user.armL(v3(-BARS.railX + 0.02, BARS.rail + 0.02, -BARS.railZ));
          user.armR(v3(-BARS.railX + 0.02, BARS.rail + 0.02, BARS.railZ));
        } else {
          // On the armrests, pushing up.
          user.armL(on(user, 0.24, 0.72, -0.02));
          user.armR(on(user, -0.24, 0.72, -0.02));
        }
        user.head.rotation.set(0.15 + 0.25 * (1 - up), 0, 0);
        return;
      }
      const w = walkAt(t, ph);
      walk.at.position.x = w.sx;
      user.root.position.set(w.px, deck, 0);
      user.root.rotation.y = w.yaw;
      const lv = v3(Math.cos(w.yaw), 0, -Math.sin(w.yaw));
      const foot = (x: number, side: number, lift: number, out3: THREE.Vector3) => own(user, out3.set(x, deck + 0.08 + lift, 0).addScaledVector(lv, side * 0.1));
      const bob = w.beat === 'walk' ? 0.012 * Math.abs(Math.sin(w.u * Math.PI * 9)) : 0;
      user.pose({ hipY: 0.87 + bob, hipZ: 0, lean: 0.08, ankleL: foot(w.footL, 1, w.liftL, al), ankleR: foot(w.footR, -1, w.liftR, ar) });
      // A hand on each rail a little ahead, sliding along; both on the front rail as they turn.
      const fv = v3(Math.sin(w.yaw), 0, Math.cos(w.yaw));
      if (w.beat === 'turn') {
        user.armL(v3(w.px + 0.14, BARS.rail + 0.02, BARS.railZ));
        user.armR(v3(w.px - 0.14, BARS.rail + 0.02, BARS.railZ));
      } else {
        const ahead = 0.12 + 0.03 * Math.sin(t * 2.1);
        const railOf = (side: number) => Math.sign(lv.z * side || side) * BARS.railZ;
        user.armL(v3(w.px + fv.x * ahead, BARS.rail + 0.02, railOf(1)));
        user.armR(v3(w.px + fv.x * (ahead + 0.04), BARS.rail + 0.02, railOf(-1)));
      }
      // Eyes on the feet and the step lines; at the end of the bars, a look round to the worker (they're to the front).
      user.head.rotation.set(w.beat === 'rest' ? -0.05 : 0.25, w.beat === 'rest' ? (w.dir > 0 ? -0.7 : 0.7) : 0, 0);
    };
  },

  /**
   * The training kitchen (일상 훈련 주방): a lowered counter (76 cm) with open knee space under the
   * sink and the hob, an orange edge along its front to see it by, a lever tap, an induction hob
   * with tactile dots on its controls and the 라면 pot on it, a tilted mirror over the hob to see into
   * the pot from sitting, a wall cupboard with its pull-down rack lowered; the picture recipe (라면
   * 끓이기) on its stand, a big-button timer, an edged cutting board with a rocker knife, the 요일별
   * 약통, the wrist blood-pressure monitor and the health log. Cooking (dailySkills, and the 작업치료실's
   * return-home training): stood beside the user, who cooks in their wheelchair at the hob (drawn in,
   * stirring) — a finger down the recipe, a hand steadying the pot's handle, the timer pressed, a
   * thumbs up; the pot steams and the hob's rings glow. A health check (medicationCheck): the cuff on
   * their wrist, the reading, today's lid of the 약통 opened, the log written.
   */
  adaptiveKitchen(g, _W, _D, _c, _def, _ctx, out) {
    const top = KITCHEN.top;
    const z0 = -0.48;
    const z1 = KITCHEN.front;
    const zc = (z0 + z1) / 2;
    const WHITE = '#f5f5f0';
    const MINT = '#80cbc4';
    part(g, rbox(1.98, 0.035, z1 - z0, 0.012), WHITE, 0, top - 0.0175, zc);
    part(g, box(1.98, 0.02, 0.012), EDGE, 0, top - 0.012, z1 + 0.001, { outline: false });
    part(g, box(1.94, 0.06, 0.02), '#e0e0e0', 0, top - 0.065, z1 - 0.02);
    // The left cupboard (big D handles), the open knee space, a low drawer unit at the right end.
    part(g, rbox(0.36, top - 0.06, z1 - z0 - 0.04, 0.012), MINT, -0.8, (top - 0.06) / 2, zc);
    for (let i = 0; i < 3; i++) {
      part(g, box(0.32, 0.004, 0.004), shade(MINT, 0.75), -0.8, 0.2 + i * 0.18, z1 - 0.02, { outline: false });
      part(g, ring(0.03, 0.007, Math.PI), '#546e7a', -0.8, 0.29 + i * 0.18, z1 - 0.01, { rz: Math.PI });
    }
    part(g, rbox(0.26, top - 0.06, z1 - z0 - 0.04, 0.012), MINT, 0.86, (top - 0.06) / 2, zc);
    part(g, box(1.2, top - 0.1, 0.02), '#eceff1', 0.06, (top - 0.1) / 2, z0 + 0.02);
    // The sink, shallow, its pipes boxed in under it; the lever tap.
    part(g, rbox(0.44, 0.012, 0.32, 0.03), '#b0bec5', -0.36, top + 0.001, -0.15);
    part(g, rbox(0.38, 0.1, 0.26, 0.03), '#90a4ae', -0.36, top - 0.05, -0.15);
    part(g, rbox(0.16, 0.24, 0.12, 0.02), '#cfd8dc', -0.36, top - 0.22, -0.3);
    part(g, cyl(0.02, 0.022, 0.06, 12), CHROME, -0.36, top + 0.03, -0.36);
    rod(g, v3(-0.36, top + 0.06, -0.36), v3(-0.36, top + 0.2, -0.3), 0.012, CHROME);
    rod(g, v3(-0.36, top + 0.2, -0.3), v3(-0.36, top + 0.17, -0.2), 0.01, CHROME);
    rod(g, v3(-0.36, top + 0.08, -0.36), v3(-0.24, top + 0.1, -0.32), 0.008, CHROME);
    part(g, ball(0.014), '#e53935', -0.24, top + 0.1, -0.32, { outline: false });
    // The hob and the pot.
    const [hx, , hz] = [KITCHEN.pot[0], 0, KITCHEN.pot[2] - 0.02];
    part(g, rbox(0.52, 0.012, 0.42, 0.01), '#212121', hx, top + 0.006, hz);
    for (const [dx, dz, r] of [[0, 0.06, 0.1], [0.12, -0.12, 0.07], [-0.14, -0.12, 0.07]] as const) part(g, ring(r, 0.004), '#616161', hx + dx, top + 0.013, hz + dz, { rx: Math.PI / 2 });
    for (let i = 0; i < 3; i++) {
      part(g, cyl(0.018, 0.018, 0.004, 12), '#424242', hx - 0.12 + i * 0.12, top + 0.014, hz + 0.18, { outline: false });
      part(g, ball(0.005), '#ffca28', hx - 0.12 + i * 0.12, top + 0.018, hz + 0.18, { outline: false });
    }
    const [px, py, pz] = KITCHEN.pot;
    part(g, cyl(0.1, 0.09, 0.11, 20), STEEL, px, py + 0.055, pz);
    part(g, cyl(0.092, 0.092, 0.004, 20), '#90caf9', px, py + 0.095, pz, { outline: false });
    rod(g, v3(px - 0.1, py + 0.09, pz + 0.005), P(KITCHEN.handle), 0.012, '#263238');
    // The tilted mirror over the hob, the wall cupboard with its rack pulled down.
    const mirror = group(g, hx, top + 0.66, z0 + 0.04);
    mirror.rotation.x = 0.45;
    part(mirror, rbox(0.6, 0.42, 0.03, 0.012), '#b0bec5', 0, 0, 0);
    part(mirror, box(0.54, 0.36, 0.004), '#d5e8f0', 0, 0, 0.017, { outline: false });
    part(g, rbox(0.9, 0.36, 0.3, 0.012), MINT, -0.45, 1.75, z0 + 0.15);
    for (const sx of [-1, 1]) rod(g, v3(-0.45 + sx * 0.4, 1.58, z0 + 0.15), v3(-0.45 + sx * 0.4, 1.3, z0 + 0.22), 0.008, CHROME);
    part(g, rbox(0.84, 0.02, 0.24, 0.006), '#eceff1', -0.45, 1.28, z0 + 0.2);
    for (let i = 0; i < 4; i++) part(g, cyl(0.09, 0.09, 0.015, 16), ['#ffffff', '#ffe0b2', '#c8e6c9', '#bbdefb'][i], -0.75 + i * 0.2, 1.3, z0 + 0.2);
    // The recipe on its stand, the timer, the cutting board, the 약통, the blood pressure monitor, the log.
    const rs = group(g, KITCHEN.card[0], top, KITCHEN.card[2]);
    part(rs, rbox(0.14, 0.012, 0.08, 0.004), '#8d6e63', 0, 0.006, 0);
    rod(rs, v3(0, 0.01, -0.03), v3(0, 0.22, -0.06), 0.006, '#8d6e63');
    picture(rs, painted('dsRecipe', 180, 240, paintRecipe), 0.2, 0.27, 0, KITCHEN.card[1] - top, 0.0, '#ffffff', 0, -0.25);
    const [ttx, tty, ttz] = KITCHEN.timer;
    part(g, rbox(0.11, 0.07, 0.07, 0.015), '#fdd835', ttx, tty - 0.005, ttz);
    picture(g, painted('dsTimer', 96, 48, paintTimer), 0.08, 0.04, ttx, tty, ttz + 0.036);
    part(g, cyl(0.022, 0.022, 0.015, 14), '#e53935', ttx, tty + 0.035, ttz);
    part(g, rbox(0.32, 0.02, 0.22, 0.01), '#f5f5f5', -0.8, top + 0.01, -0.22);
    for (const [cx, cz] of [[-0.95, -0.32], [-0.95, -0.12]] as const) part(g, box(0.02, 0.03, 0.02), '#9e9e9e', cx, top + 0.03, cz, { outline: false });
    part(g, cyl(0.009, 0.009, 0.2, 8), '#7cb342', -0.8, top + 0.03, -0.22, { rz: Math.PI / 2, outline: false });
    part(g, cyl(0.009, 0.009, 0.06, 8), '#f1f8e9', -0.93, top + 0.03, -0.22, { rz: Math.PI / 2, outline: false });
    const knife = group(g, -0.72, top + 0.05, -0.16, 0.3);
    part(knife, new THREE.CylinderGeometry(0.06, 0.06, 0.004, 16, 1, false, 0, Math.PI), CHROME, 0, 0, 0, { rx: Math.PI / 2 });
    part(knife, rbox(0.12, 0.03, 0.025, 0.01), '#5d4037', 0, 0.035, 0);
    const [lx, ly, lz] = KITCHEN.pills;
    part(g, rbox(0.3, 0.035, 0.07, 0.01), '#ffffff', lx, ly - 0.02, lz);
    const lids: THREE.Mesh[] = [];
    ['월', '화', '수', '목', '금', '토', '일'].forEach((d, i) => {
      const x = lx - 0.126 + i * 0.042;
      lids.push(part(g, rbox(0.038, 0.008, 0.062, 0.003), ['#ef5350', '#ffa726', '#ffee58', '#66bb6a', '#42a5f5', '#7e57c2', '#ec407a'][i], x, ly + 0.0, lz));
      label(g, d, 0.026, 0.016, x, ly - 0.02, lz + 0.036, '#ffffff', '#263238');
    });
    const today = lids[1];
    part(g, ball(0.007), '#ffffff', today.position.x - 0.006, ly - 0.01, lz, { outline: false });
    part(g, ball(0.006), '#ffd54f', today.position.x + 0.008, ly - 0.01, lz + 0.01, { outline: false });
    const [bpx, bpy, bpz] = KITCHEN.bp;
    part(g, rbox(0.1, 0.03, 0.07, 0.012), '#eceff1', bpx, bpy - 0.015, bpz);
    picture(g, painted('dsBp', 96, 64, paintBp), 0.06, 0.04, bpx, bpy + 0.001, bpz, '#ffffff', 0, -Math.PI / 2);
    const [lgx, lgy, lgz] = KITCHEN.log;
    part(g, rbox(0.15, 0.008, 0.2, 0.004), '#8d6e63', lgx, lgy - 0.004, lgz);
    flat(g, painted('dsLog', 140, 180, paintLog), 0.13, 0.17, lgx, lgy + 0.002, lgz, Math.PI + 0.35);

    const clock = marker(g, 0, 1, 0);
    const cook = spotAt(g, 'stand', KITCHEN.dweller, 'dsCook', clock);
    const health = spotAt(g, 'stand', KITCHEN.dweller, 'dsHealth', clock);
    out.spots = { dailySkills: cook, occupationalTherapist_returnHome: cook, disabilitySupport_medicationCheck: health, '*': cook };

    // In use: the user in their wheelchair at the hob, the spoon, the steam, the cuff, the open lid.
    const use = group(g);
    out.inUse = use;
    const user = chairUser(use, LOOKS.seoyeon, KITCHEN.user.x, KITCHEN.user.z, KITCHEN.user.yaw, '#e53935', 0.2);
    const spoon = group(use);
    part(spoon, cyl(0.006, 0.006, 0.3, 8), '#5d4037', 0, -0.13, 0, { outline: false });
    part(spoon, ball(0.022), '#5d4037', 0, -0.28, 0, { outline: false }).scale.set(1, 0.4, 1.3);
    const noodles = part(use, cyl(0.088, 0.088, 0.02, 18), '#ffd54f', px, py + 0.09, pz, { outline: false });
    const STEAM = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.32, depthWrite: false });
    const steam: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(ball(0.04), STEAM);
      use.add(m);
      steam.push(m);
    }
    const rings = glowing(use, ring(0.1, 0.006), '#ff7043', hx, top + 0.015, hz + 0.06, Math.PI / 2);
    const cuff = group(use);
    part(cuff, cyl(0.035, 0.035, 0.07, 14), '#546e7a', 0, 0, 0, { rz: Math.PI / 2 });
    const openLid = part(use, rbox(0.038, 0.008, 0.062, 0.003), '#ffa726', today.position.x, ly + 0.03, lz - 0.035, { rx: -1.3 });
    const wrist = P(KITCHEN.wrist);
    const potAt = v3(px, py + 0.12, pz);
    out.animate = (t) => {
      const ph = clockOf(clock);
      const checking = posed(health, t) && !posed(cook, t);
      today.visible = true;
      openLid.visible = false;
      if (checking) {
        const b = healthBeat(t, ph);
        const open = lidOpen(b);
        today.visible = !open;
        openLid.visible = open;
        spoon.visible = noodles.visible = rings.visible = false;
        steam.forEach((m) => (m.visible = false));
        cuff.visible = true;
        cuff.position.copy(wrist).add(v3(0.02, 0, 0.02));
        user.armL(wrist);
        user.armR(null);
        user.head.rotation.set(0.3 + 0.15 * amountOf(b, 'read'), 0.35 * amountOf(b, 'note'), 0);
        return;
      }
      cuff.visible = false;
      spoon.visible = noodles.visible = rings.visible = true;
      const b = cookBeat(t, ph);
      // Stirring the 라면, the left hand on the counter's edge.
      const a = t * Math.PI * 2 * 0.7;
      const hand = potAt.clone().add(v3(0.04 * Math.cos(a), 0.12, 0.04 * Math.sin(a) + 0.02));
      const stir = amountOf(b, 'card') < 0.5;
      user.armR(stir ? hand : on(user, -0.12, 0.64, 0.24));
      user.armL(v3(KITCHEN.user.x - 0.18, top + 0.02, KITCHEN.front - 0.02));
      spoon.visible = stir;
      spoon.position.copy(hand);
      spoon.rotation.set(0.25 * Math.sin(a), 0, 0.25 * Math.cos(a));
      user.head.rotation.set(amountOf(b, 'card') > 0.5 ? 0.1 : 0.5, amountOf(b, 'card') * 0.55 + amountOf(b, 'praise') * 0.5, 0);
      steam.forEach((m, i) => {
        const u = (t * 0.4 + i / steam.length) % 1;
        m.position.set(px + 0.04 * Math.sin(t * 0.9 + i * 2), py + 0.14 + u * 0.4, pz + 0.03 * Math.cos(t * 0.7 + i));
        m.scale.setScalar(0.6 + u * 1.4);
        m.visible = true;
      });
    };
  },

  /**
   * The centre's van (복지관 송영 차량): a white 15-seater with the centre's blue stripe and name, '함께
   * 가요' on the sliding door, the wheelchair lift at the back behind two rear doors, '♿ 휠체어 탑승'
   * over them, the plates. Off with a user to the hospital (escortOuting): the rear doors swing open,
   * the lift unfolds and lowers, the user in their wheelchair (drawn in) rolls on, is lifted up and
   * rolls in, the doors close and it pulls away; back again it reverses in and the lift brings them
   * down. Driven: sat at the wheel.
   */
  supportVan(g, _W, _D, _c, _def, _ctx, out) {
    const van = group(g);
    const L = 4.8;
    const Wd = 1.7;
    const zc = 0.12;
    const WHITE_VAN = '#f7f8f8';
    const side = (s: number) => zc + s * (Wd / 2);
    part(van, rbox(L - 0.42, 1.55, Wd, 0.2), WHITE_VAN, -0.21, 1.1, zc);
    part(van, rbox(0.72, 0.62, Wd - 0.02, 0.16), WHITE_VAN, L / 2 - 0.4, 0.66, zc);
    part(van, box(0.06, 0.78, Wd - 0.16), '#2d3e50', L / 2 - 0.47, 1.38, zc, { rz: 0.55 });
    part(van, rbox(L - 0.6, 0.06, Wd - 0.08, 0.03), shade(WHITE_VAN, 0.94), -0.26, 1.9, zc);
    for (const s of [-1, 1]) {
      const zz = side(s) + s * 0.004;
      const ry = s > 0 ? 0 : Math.PI;
      for (const [x, w] of [[1.05, 0.62], [0.25, 0.82], [-0.65, 0.82], [-1.5, 0.66]] as const) part(van, rbox(w, 0.42, 0.01, 0.04), '#2d3e50', x, 1.5, zz, { outline: false });
      part(van, box(L - 0.6, 0.13, 0.006), BLUE, -0.2, 0.86, zz, { outline: false });
      part(van, box(L - 0.6, 0.035, 0.006), SKY, -0.2, 0.76, zz, { outline: false });
      label(van, CENTRE, 1.7, 0.16, -0.3, 1.1, zz + s * 0.003, 'none', BLUE, ry);
      label(van, '함께 가요 ♡', 0.62, 0.1, -0.3, 0.64, zz + s * 0.003, 'none', '#e53935', ry);
      part(van, box(0.008, 1.0, 0.007), '#b0b6bb', -0.15, 1.05, zz, { outline: false });
      part(van, rbox(0.12, 0.025, 0.02, 0.008), '#9aa0a6', 0.0, 1.1, zz + s * 0.01, { outline: false });
      part(van, rbox(0.1, 0.13, 0.08, 0.02), BLACK, 1.45, 1.36, side(s) + s * 0.08);
    }
    for (const x of [-1.5, 1.45])
      for (const s of [-1, 1]) {
        const wz = side(s) - s * 0.12;
        part(van, cyl(0.33, 0.33, 0.22, 22), BLACK, x, 0.33, wz, { rx: Math.PI / 2 });
        part(van, cyl(0.2, 0.2, 0.225, 16), STEEL, x, 0.33, wz, { rx: Math.PI / 2, outline: false });
      }
    const fx = L / 2 - 0.05;
    part(van, rbox(0.04, 0.16, 0.8, 0.02), '#37474f', fx, 0.72, zc);
    for (const s of [-1, 1]) part(van, rbox(0.05, 0.1, 0.3, 0.03), '#fffde7', fx - 0.01, 0.86, zc + s * 0.58);
    part(van, rbox(0.12, 0.2, Wd - 0.06, 0.05), '#cfd3d6', fx + 0.02, 0.42, zc);
    label(van, '71바 1004', 0.4, 0.1, fx + 0.085, 0.45, zc, '#ffffff', '#111111', Math.PI / 2);
    // The back: the two rear doors (opening), the lift folded up behind them, lights, sign, plate.
    const bx = -L / 2;
    for (const s of [-1, 1]) part(van, rbox(0.04, 0.3, 0.12, 0.02), '#d32f2f', bx + 0.02, 1.05, zc + s * 0.78);
    part(van, rbox(0.1, 0.18, Wd - 0.06, 0.05), '#cfd3d6', bx - 0.02, 0.4, zc);
    label(van, '71바 1004', 0.4, 0.1, bx - 0.075, 0.42, zc, '#ffffff', '#111111', -Math.PI / 2);
    part(van, box(0.01, 1.05, Wd - 0.3), '#1c262e', bx + 0.004, 1.1, zc, { outline: false });
    const doors = [-1, 1].map((s) => {
      const hinge = group(van, bx - 0.01, 0, zc + s * (Wd / 2 - 0.14));
      const dw = Wd / 2 - 0.15;
      part(hinge, rbox(0.04, 1.1, dw, 0.02), WHITE_VAN, -0.02, 1.12, -s * dw / 2);
      part(hinge, rbox(0.012, 0.42, dw - 0.12, 0.03), '#2d3e50', -0.04, 1.42, -s * dw / 2, { outline: false });
      part(hinge, box(0.008, 0.12, dw - 0.02), BLUE, -0.043, 0.86, -s * dw / 2, { outline: false });
      label(hinge, s < 0 ? '♿ 휠체어' : '탑승', 0.4, 0.09, -0.045, 1.1, -s * dw / 2, BLUE, '#ffffff', -Math.PI / 2);
      return { hinge, s };
    });
    // The lift: a platform hinged at the cabin's floor, folded up behind the doors.
    const floorY = 0.58;
    const liftArm = group(van, bx + 0.08, floorY, zc);
    const platform = group(liftArm);
    part(platform, rbox(0.95, 0.04, 0.82, 0.01), '#9e9e9e', -0.48, 0, 0);
    part(platform, box(0.9, 0.004, 0.76), '#616161', -0.48, 0.022, 0, { outline: false });
    part(platform, box(0.06, 0.005, 0.76), '#fdd835', -0.92, 0.024, 0, { outline: false });
    for (const s of [-1, 1]) part(platform, box(0.9, 0.06, 0.02), '#757575', -0.48, 0.05, s * 0.4);
    for (const s of [-1, 1]) rod(van, v3(bx + 0.06, 0.1, zc + s * 0.45), v3(bx + 0.06, 1.5, zc + s * 0.45), 0.02, '#616161');
    // Who rides: a user in their wheelchair (shown while they board or get off).
    const rider = group(van);
    chairUser(rider, LOOKS.sumin, 0, 0, Math.PI / 2, '#1e88e5', 0.06);
    rider.visible = false;
    // Driven: sat at the wheel (the driver's side, at the back of the lot).
    const wheel = marker(van, 1.15, 1.2, side(-1) + 0.42);
    part(van, ring(0.15, 0.015), BLACK, 1.15, 1.2, side(-1) + 0.42, { ry: Math.PI / 2, rz: 0.5 });
    const drive = spot(van, 'sit', 0.75, 0.95, side(-1) + 0.42, Math.PI / 2, 0.95);
    drive.work = wheel;
    drive.motion = 'steer';
    out.spots = { '*': drive };
    /**
     * The lift's part of a boarding at `u` (0–1; run backwards to get off): the doors open, the
     * platform folds down level and lowers to the ground, the rider rolls on, it rises, they roll in.
     */
    const lift = (u: number) => {
      const seg = (a: number, b: number) => THREE.MathUtils.smoothstep(u, a, b);
      const open = seg(0, 0.12) * (1 - seg(0.9, 1));
      doors.forEach(({ hinge, s }) => (hinge.rotation.y = s * open * 1.75));
      const fold = seg(0.1, 0.24) * (1 - seg(0.8, 0.9));
      liftArm.rotation.z = -(1 - fold) * (Math.PI / 2);
      const down = seg(0.24, 0.36) * (1 - seg(0.52, 0.66));
      liftArm.position.y = floorY - down * (floorY - 0.03);
      // The rider: rolls on from behind, rides up, rolls in.
      const onTo = seg(0.36, 0.5);
      const inTo = seg(0.66, 0.8);
      rider.visible = u > 0.3 && u < 0.82;
      rider.position.set(bx - 1.6 + onTo * 1.12 + inTo * 0.9, liftArm.position.y - 0.0 + (onTo > 0.02 ? 0.025 : 0), zc);
      if (onTo < 0.05) rider.position.y = 0;
    };
    lift(0);
    let state: 'parked' | 'boarding' | 'leaving' | 'gone' | 'back' | 'alighting' | undefined;
    let since = 0;
    const PULL = 4.5;
    const BOARD = 9;
    out.away = (isOut, t) => {
      if (state === undefined) state = isOut ? 'gone' : 'parked';
      else if (isOut && (state === 'parked' || state === 'alighting')) [state, since] = ['boarding', t];
      else if (!isOut && (state === 'boarding' || state === 'leaving' || state === 'gone')) [state, since] = ['back', t];
      let x = 0;
      if (state === 'boarding') {
        const u = Math.min(1, (t - since) / BOARD);
        lift(u);
        if (u >= 1) [state, since] = ['leaving', t];
      } else if (state === 'leaving') {
        const u = Math.min(1, (t - since) / 3);
        x = PULL * u * u;
        if (u >= 1) state = 'gone';
      } else if (state === 'back') {
        lift(0);
        const u = Math.min(1, (t - since) / 4.5);
        x = PULL * (1 - u) * (1 - u);
        if (u >= 1) [state, since] = ['alighting', t];
      } else if (state === 'alighting') {
        const u = Math.min(1, (t - since) / BOARD);
        lift(1 - u);
        if (u >= 1) state = 'parked';
      }
      van.position.x = x;
      van.visible = state !== 'gone';
    };
  },

  /**
   * The picture-symbol board (그림 상징 의사소통 보드): a big board of 24 picture symbols in a 6 × 4 grid,
   * coloured by kind (people yellow, doing green, things orange, feelings and answers pink), '함께
   * 말해요' over it, a sentence strip of velcro cards along its foot; a talker tablet on a floor stand
   * between the worker and the user. A chat (dsAacTalk): stood beside the user in their wheelchair
   * (drawn in) — a sentence modelled, a finger on each symbol as it's said (나 · 그림 · 그리다 ·
   * 좋아요, each lit as it's touched); waiting while the user points out their answer (음악 · 듣다 ·
   * 더); a nod and an open hand; the talker tapped and it says the sentence (its speaker lit).
   */
  dsAacWall(g, _W, _D, _c, _def, ctx, out) {
    const yc = AAC.y0 + AAC.h / 2;
    const zb = AAC.z;
    if (!ctx.againstWall)
      for (const sx of [-1, 1]) {
        part(g, cyl(0.025, 0.025, 1.7, 10), '#90a4ae', sx * 0.82, 0.85, zb - 0.03);
        part(g, rbox(0.08, 0.04, 0.4, 0.015), '#90a4ae', sx * 0.82, 0.02, zb + 0.05);
      }
    part(g, rbox(AAC.w + 0.1, AAC.h + 0.1, 0.04, 0.015), SKY, 0, yc, zb - 0.025);
    picture(g, painted('dsAacBoard', 600, 368, paintAac), AAC.w, AAC.h, 0, yc, zb - 0.003);
    part(g, rbox(AAC.w + 0.1, 0.16, 0.05, 0.015), BLUE, 0, AAC.y0 + AAC.h + 0.13, zb - 0.02);
    label(g, '함께 말해요 · 그림 의사소통판', AAC.w - 0.2, 0.11, 0, AAC.y0 + AAC.h + 0.13, zb + 0.007, BLUE, '#ffffff');
    // The sentence strip and its cards.
    part(g, rbox(1.2, 0.12, 0.03, 0.01), '#eceff1', -0.1, AAC.y0 - 0.1, zb - 0.01);
    ['나', '음악', '좋아요'].forEach((w, i) => label(g, w, 0.14, 0.09, -0.5 + i * 0.17, AAC.y0 - 0.1, zb + 0.008, ['#fff59d', '#ffcc80', '#f8bbd0'][i], '#263238'));
    // The talker on its stand.
    const [tx, ty, tz] = AAC.tablet;
    part(g, cyl(0.16, 0.18, 0.03, 18), '#455a64', tx - 0.1, 0.015, tz - 0.2);
    rod(g, v3(tx - 0.1, 0.03, tz - 0.2), v3(tx - 0.1, 0.72, tz - 0.2), 0.016, '#90a4ae');
    rod(g, v3(tx - 0.1, 0.72, tz - 0.2), v3(tx, ty - 0.06, tz - 0.04), 0.012, '#263238');
    const tab = group(g, tx, ty, tz);
    tab.rotation.x = -0.75;
    part(tab, rbox(0.28, 0.2, 0.018, 0.02), '#263238', 0, 0, 0);
    out.screen = litScreen(tab, painted('dsTalker', 240, 160, paintTalker), 0.25, 0.165, 0, 0, 0.011);
    part(tab, box(0.04, 0.012, 0.01), '#37474f', 0.1, -0.105, 0.0, { outline: false });

    const clock = marker(g, 0, 1, 0);
    const talk = spotAt(g, 'stand', AAC.dweller, 'dsAac', clock);
    out.spots = { '*': talk };
    // In use: the user, the lit symbol, the talker's speaker.
    const use = group(g);
    out.inUse = use;
    const user = chairUser(use, LOOKS.minjun, AAC.user.x, AAC.user.z, AAC.user.yaw, '#7e57c2', 0.18);
    const cellW = AAC.w / AAC.cols;
    const cellH = AAC.h / AAC.rows;
    const lit = group(use);
    const LIT = '#ffeb3b';
    for (const [w, h, x, y] of [[cellW, 0.014, 0, cellH / 2], [cellW, 0.014, 0, -cellH / 2], [0.014, cellH, cellW / 2, 0], [0.014, cellH, -cellW / 2, 0]] as const) glowing(lit, box(w, h, 0.004), LIT, x, y, 0);
    const lit2 = lit.clone();
    use.add(lit2);
    const speaker = glowing(use, ball(0.012), '#4caf50', tx + 0.1, ty - 0.08, tz + 0.04);
    out.animate = (t) => {
      const ph = clockOf(clock);
      const b = aacBeat(t, ph);
      const mi = aacModelAt(b);
      lit.visible = mi >= 0;
      if (mi >= 0) lit.position.copy(P(aacCell(...AAC_MODEL[mi]))).add(v3(0, 0, 0.004));
      const ai = aacAnswerAt(b);
      lit2.visible = ai >= 0;
      if (ai >= 0) {
        const c = aacCell(...AAC_ANSWER[ai]);
        lit2.position.set(c[0], c[1], c[2] + 0.004);
        user.armR(v3(c[0] + 0.02, c[1] - 0.04, c[2] + 0.05));
        user.armL(null);
      } else if (amountOf(b, 'talker') > 0.5) {
        user.armR(null);
        user.armL(v3(tx + 0.05, ty + 0.02, tz + 0.05));
      } else {
        user.armR(null);
        user.armL(null);
      }
      speaker.visible = amountOf(b, 'talker') > 0.5 && Math.sin(t * 9) > -0.3;
      user.head.rotation.set(ai >= 0 ? -0.05 : mi >= 0 ? -0.1 : 0.1, amountOf(b, 'answer') * 0.6 + amountOf(b, 'talker') * 0.4, 0);
    };
  },

  /**
   * The braille and large-print corner (점자 · 큰글씨 열람 코너): a low oak bookcase of thick braille
   * volumes (점자) and bright large-print books (큰글씨), a DAISY talking-book player and headphones
   * on top; a reading table with a video magnifier (its screen showing the line huge, yellow on black)
   * and a Perkins brailler; the large-print book open on a tilted bookrest at the worker's place and
   * the braille book at the user's, a folded white cane by them. Reading together (dsReadTogether):
   * sat side by side, the worker reading the big print aloud, a finger along the lines, listening
   * while the user (drawn in) reads the same story in braille, their fingertips running along the
   * dots, the page turned.
   */
  dsReadingNook(g, _W, _D, _c, _def, _ctx, out) {
    const top = READ.top;
    // The bookcase.
    const bz = -0.37;
    part(g, rbox(1.92, 0.9, 0.24, 0.015), OAK, 0, 0.45, bz);
    part(g, box(1.84, 0.82, 0.01), OAK_DARK, 0, 0.46, bz - 0.11, { outline: false });
    part(g, box(1.84, 0.025, 0.22), OAK, 0, 0.45, bz + 0.005);
    const br = seeded(23);
    for (const [y0, kind] of [[0.06, 'braille'], [0.475, 'large']] as const) {
      let x = -0.88;
      while (x < 0.86) {
        const w = kind === 'braille' ? 0.07 + br() * 0.02 : 0.035 + br() * 0.03;
        const h = kind === 'braille' ? 0.32 : 0.24 + br() * 0.08;
        const col = kind === 'braille' ? ['#f5f0e1', '#e8e0cc', '#fafafa'][Math.floor(br() * 3)] : ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#fb8c00'][Math.floor(br() * 6)];
        part(g, box(w - 0.004, h, 0.18), col, x + w / 2, y0 + h / 2, bz + 0.01);
        if (kind === 'braille') for (let k = 0; k < 3; k++) part(g, ball(0.004), '#bcaaa4', x + w / 2, y0 + 0.2 + k * 0.012, bz + 0.1, { outline: false });
        x += w;
      }
    }
    label(g, '점자 도서', 0.22, 0.05, -0.6, 0.86, bz + 0.121, OAK, '#ffffff');
    label(g, '큰글씨 도서', 0.26, 0.05, 0.6, 0.86, bz + 0.121, OAK, '#ffffff');
    part(g, rbox(0.2, 0.05, 0.14, 0.01), '#37474f', -0.2, 0.925, bz);
    part(g, box(0.06, 0.02, 0.004), '#80deea', -0.2, 0.93, bz + 0.071, { outline: false });
    part(g, ring(0.07, 0.012, Math.PI), '#263238', 0.1, 0.92, bz, { ry: Math.PI / 2 });
    for (const s of [-1, 1]) part(g, cyl(0.03, 0.03, 0.025, 12), '#263238', 0.1, 0.92, bz + s * 0.07, { rx: Math.PI / 2 });
    // The table.
    part(g, rbox(1.8, 0.035, 0.52, 0.012), BIRCH, 0, top - 0.0175, 0.04);
    part(g, box(1.8, 0.01, 0.012), EDGE, 0, top - 0.025, 0.3, { outline: false });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.022, 0.022, top - 0.035, 8), OAK_DARK, sx * 0.84, (top - 0.035) / 2, 0.04 + sz * 0.2, { outline: false });
    // The video magnifier at the right end, the brailler at the left.
    const vm = group(g, 0.72, top, -0.06);
    part(vm, rbox(0.3, 0.02, 0.3, 0.01), '#cfd8dc', 0, 0.01, 0.04);
    part(vm, box(0.04, 0.5, 0.04), '#455a64', 0, 0.27, -0.12);
    part(vm, rbox(0.36, 0.26, 0.03, 0.01), BLACK, 0, 0.56, -0.1);
    picture(vm, painted('dsMagnifier', 200, 140, paintMagnifier), 0.33, 0.23, 0, 0.56, -0.084);
    part(vm, rbox(0.06, 0.03, 0.08, 0.01), '#37474f', 0, 0.34, -0.08);
    const pk = group(g, -0.74, top, -0.05);
    part(pk, rbox(0.3, 0.1, 0.2, 0.02), '#9e9e9e', 0, 0.05, 0);
    part(pk, box(0.28, 0.02, 0.06), '#757575', 0, 0.1, -0.06);
    for (let i = 0; i < 7; i++) part(pk, rbox(0.024, 0.014, 0.03, 0.005), '#eceff1', -0.09 + i * 0.03, 0.105, 0.06);
    part(pk, box(0.2, 0.002, 0.12), '#fffef0', 0, 0.115, -0.07, { rx: -0.3, outline: false });
    // The bookrest with the large-print book; the braille book; the folded cane.
    const [qx, qy, qz] = READ.page;
    const rest = group(g, qx, top, qz);
    part(rest, rbox(0.36, 0.012, 0.06, 0.004), '#8d6e63', 0, 0.006, 0.08);
    const slope = group(rest, 0, qy - top, 0);
    slope.rotation.x = -0.9;
    part(slope, rbox(0.38, 0.26, 0.012, 0.006), '#a1887f', 0, 0, -0.008);
    picture(slope, painted('dsPageL', 160, 220, paintLargePrint(true)), 0.17, 0.235, -0.088, 0, 0.001);
    picture(slope, painted('dsPageR', 160, 220, paintLargePrint(false)), 0.17, 0.235, 0.088, 0, 0.001);
    part(slope, box(0.004, 0.235, 0.006), '#bcaaa4', 0, 0, 0.002, { outline: false });
    const turning = group(slope, 0, 0, 0.003);
    const leaf = picture(turning, painted('dsPageR', 160, 220, paintLargePrint(false)), 0.17, 0.235, 0.085, 0, 0.0);
    (leaf.material as THREE.MeshBasicMaterial).side = THREE.DoubleSide;
    const [ux, uy, uz] = READ.braille;
    part(g, rbox(0.4, 0.014, 0.27, 0.006), '#d7ccc8', ux, uy - 0.006, uz);
    flat(g, painted('dsBraille', 220, 150, paintBraille), 0.37, 0.25, ux, uy + 0.002, uz, Math.PI);
    const cane = group(g, 0.32, top + 0.012, 0.25, 0.3);
    for (let i = 0; i < 4; i++) part(cane, cyl(0.008, 0.008, 0.26, 8), i === 3 ? '#e53935' : '#fafafa', -0.03 + i * 0.018, 0, 0, { rz: Math.PI / 2 });
    // The chairs.
    guestChair(g, READ.dweller.x, READ.dweller.z, Math.PI, '#ffcc80');
    guestChair(g, READ.user.x, READ.user.z, Math.PI, '#a5d6a7');

    const clock = marker(g, 0, 1, 0);
    const read = spotAt(g, 'sit', READ.dweller, 'dsRead', clock);
    out.spots = { '*': read };
    const use = group(g);
    out.inUse = use;
    const user = person(use, LOOKS.daeho, READ.user.x, READ.user.z, Math.PI, SEATED(READ.user.seat, 0.36));
    out.animate = (t) => {
      const ph = clockOf(clock);
      const b = readBeat(t, ph);
      turning.rotation.y = -Math.PI * pageTurn(b);
      leaf.visible = b.from === 'turn';
      // Fingertips along the braille line, both index fingers; resting while the worker reads.
      const reading = amountOf(b, 'listen') > 0.5 || amountOf(b, 'follow') > 0.5;
      const u = (t * 0.12 + ph) % 1;
      const line = Math.floor(u * 6);
      const across = (u * 6) % 1;
      const y = uy + 0.02;
      const z = uz - 0.09 + line * 0.035;
      if (reading) {
        user.armR(v3(ux - 0.15 + across * 0.28, y, z));
        user.armL(v3(ux - 0.17 + across * 0.28 + 0.05, y, z + 0.005));
      } else {
        user.armR(v3(ux - 0.06, y, uz + 0.05));
        user.armL(v3(ux + 0.08, y, uz + 0.05));
      }
      user.head.rotation.set(amountOf(b, 'listen') > 0.5 ? -0.05 : 0.15, amountOf(b, 'aloud') * 0.35, 0);
    };
  },

  /**
   * The accessible computer (접근성 컴퓨터 자리): a height-adjustable desk on two motor columns (its
   * up / down paddle at the front), a big monitor on an arm with the 쉬운 화면 in yellow on black and the
   * screen reader on, a head-tracking camera over it, speakers; a big-key keyboard in yellow under its
   * keyguard, a trackball, two big jelly-bean switches; the worker's chair turned in beside. Helping
   * (dsPcCoach): the menu pointed out, the switch pressed to show it (the reader says the item), the
   * user (drawn in, in their wheelchair) trying it with the trackball and the switch, an open hand,
   * a thumbs up.
   */
  dsAccessPc(g, _W, _D, _c, _def, _ctx, out) {
    const top = PC.top;
    const z0 = -0.45;
    const z1 = 0.21;
    part(g, rbox(1.9, 0.035, z1 - z0, 0.012), '#eceff1', 0, top - 0.0175, (z0 + z1) / 2);
    part(g, box(1.9, 0.01, 0.012), EDGE, 0, top - 0.025, z1 + 0.001, { outline: false });
    for (const sx of [-1, 1]) {
      part(g, rbox(0.08, top - 0.1, 0.08, 0.01), '#78909c', sx * 0.8, (top - 0.1) / 2 + 0.03, -0.12);
      part(g, rbox(0.1, 0.06, 0.6, 0.015), '#546e7a', sx * 0.8, 0.03, -0.12);
      part(g, rbox(0.12, 0.08, 0.12, 0.01), '#455a64', sx * 0.8, top - 0.08, -0.12);
    }
    const pad = group(g, 0.86, top - 0.04, z1 + 0.02);
    part(pad, rbox(0.08, 0.03, 0.06, 0.01), '#263238', 0, 0, 0);
    label(pad, '▲▼', 0.05, 0.02, 0, 0.0, 0.031, '#263238', '#ffffff');
    // The monitor on its arm, the camera, the speakers.
    const [sx0, sy0, sz0] = PC.screen;
    rod(g, v3(sx0, top, sz0 - 0.08), v3(sx0, sy0 - 0.2, sz0 - 0.06), 0.02, '#455a64');
    part(g, rbox(0.18, 0.02, 0.14, 0.01), '#455a64', sx0, top + 0.01, sz0 - 0.08);
    part(g, rbox(0.74, 0.46, 0.03, 0.012), BLACK, sx0, sy0, sz0);
    out.screen = litScreen(g, painted('dsPcScreen', 320, 200, paintPcScreen), 0.7, 0.42, sx0, sy0, sz0 + 0.017);
    part(g, rbox(0.14, 0.035, 0.04, 0.01), '#212121', sx0, sy0 + 0.25, sz0 + 0.01);
    part(g, cyl(0.012, 0.012, 0.01, 12), '#4fc3f7', sx0, sy0 + 0.25, sz0 + 0.032, { rx: Math.PI / 2, outline: false });
    for (const s of [-1, 1]) part(g, rbox(0.09, 0.16, 0.09, 0.02), '#37474f', sx0 + s * 0.48, top + 0.08, sz0 + 0.02);
    // The keyboard under its keyguard, the trackball, the switches.
    const [kx, ky, kz] = PC.keys;
    part(g, rbox(0.46, 0.03, 0.17, 0.01), '#263238', kx, ky, kz);
    flat(g, painted('dsKeys', 240, 90, paintKeys), 0.44, 0.15, kx, ky + 0.016, kz, 0);
    glass(g, box(0.46, 0.006, 0.17), kx, ky + 0.03, kz);
    const [bx2, by2, bz2] = PC.ball;
    part(g, rbox(0.14, 0.04, 0.14, 0.03), '#37474f', bx2, by2 - 0.01, bz2);
    part(g, ball(0.045), '#e53935', bx2, by2 + 0.03, bz2);
    const [wx, wy, wz] = PC.switchA;
    part(g, cyl(0.065, 0.07, 0.03, 20), '#37474f', wx, wy - 0.015, wz);
    const capA = part(g, cyl(0.058, 0.058, 0.02, 20), '#43a047', wx, wy + 0.01, wz);
    part(g, cyl(0.065, 0.07, 0.03, 20), '#37474f', wx + 0.16, wy - 0.015, wz + 0.02);
    part(g, cyl(0.058, 0.058, 0.02, 20), '#e53935', wx + 0.16, wy + 0.01, wz + 0.02);
    label(g, '누구나 컴퓨터', 0.3, 0.06, -0.55, top + 0.06, -0.3, '#ffffff', BLUE);
    part(g, box(0.3, 0.1, 0.01), '#ffffff', -0.55, top + 0.05, -0.31, { rx: -0.2 });
    guestChair(g, PC.dweller.x, PC.dweller.z, PC.dweller.yaw, '#90caf9');

    const clock = marker(g, 0, 1, 0);
    const help = spotAt(g, 'sit', PC.dweller, 'dsPc', clock);
    out.spots = { '*': help };
    const use = group(g);
    out.inUse = use;
    const user = chairUser(use, LOOKS.jiwoo, PC.user.x, PC.user.z, PC.user.yaw, '#00897b', 0.12);
    out.animate = (t) => {
      const ph = clockOf(clock);
      const b = pcBeat(t, ph);
      const tryIt = amountOf(b, 'watch') > 0.5;
      const press = switchDown(b, t, ph) || (tryIt && Math.sin(t * 2.6) > 0.7);
      capA.position.y = wy + (press ? 0.0 : 0.01);
      user.armR(v3(bx2 + 0.01 * Math.sin(t * 1.3), by2 + 0.07, bz2 + 0.02 * Math.cos(t * 1.1)));
      user.armL(tryIt ? v3(wx + 0.02, wy + (Math.sin(t * 2.6) > 0.7 ? 0.035 : 0.06), wz + 0.02) : v3(kx - 0.1, ky + 0.04, kz + 0.03));
      user.head.rotation.set(0.12, amountOf(b, 'explain') * 0.45 + amountOf(b, 'praise') * 0.5, 0);
    };
  },

  /**
   * The art table (미술 활동 테이블): a wheelchair-height table with a tabletop easel and the user's
   * painting under way (flowers in a field), paint cups, brushes with thick foam grips and a
   * hand-strap holder in a jar, the water jar; behind at the left a line strung between two stands
   * with the users' paintings pegged to it under '우리들의 작품전'. Painting together (dsArtTogether):
   * stood beside the user, the palette on the left hand and a colour mixed on it, held out for them to
   * dip their brush, the brush rinsed, stood back admiring; the user (drawn in) paints, and a few more
   * flowers bloom on the canvas each time round.
   */
  dsArtTherapy(g, _W, _D, _c, _def, _ctx, out) {
    const top = ART.top;
    part(g, rbox(1.12, 0.035, 0.6, 0.012), BIRCH, 0.4, top - 0.0175, -0.08);
    part(g, box(1.12, 0.01, 0.012), EDGE, 0.4, top - 0.025, 0.22, { outline: false });
    for (const sx of [-0.12, 0.92]) for (const sz of [-0.34, 0.18]) part(g, cyl(0.022, 0.022, top - 0.035, 8), '#90a4ae', sx, (top - 0.035) / 2, sz, { outline: false });
    // The easel and the canvas.
    const [cx, cy, cz] = ART.canvas;
    const easel = group(g, cx, top, cz - 0.02);
    rod(easel, v3(-0.14, 0, 0.06), v3(0, 0.5, -0.06), 0.01, OAK_DARK);
    rod(easel, v3(0.14, 0, 0.06), v3(0, 0.5, -0.06), 0.01, OAK_DARK);
    rod(easel, v3(0, 0, -0.14), v3(0, 0.45, -0.05), 0.01, OAK_DARK);
    part(easel, box(0.32, 0.015, 0.04), OAK_DARK, 0, cy - top - 0.18, 0.04);
    const canvas = group(g, cx, cy, cz);
    canvas.rotation.x = -0.25;
    part(canvas, box(0.42, 0.34, 0.02), '#ffffff', 0, 0, -0.01);
    picture(canvas, painted('dsPaint0', 128, 110, paintPainting(0)), 0.4, 0.32, 0, 0, 0.001);
    // Paint cups, brushes in the jar, the water jar.
    const cups = ['#e53935', '#fdd835', '#1e88e5', '#43a047', '#ab47bc', '#ffffff'];
    cups.forEach((col, i) => {
      part(g, cyl(0.025, 0.022, 0.035, 12), '#eceff1', 0.72 + (i % 3) * 0.06, top + 0.0175, -0.22 + Math.floor(i / 3) * 0.06);
      part(g, cyl(0.022, 0.022, 0.004, 12), col, 0.72 + (i % 3) * 0.06, top + 0.034, -0.22 + Math.floor(i / 3) * 0.06, { outline: false });
    });
    part(g, cyl(0.04, 0.035, 0.12, 14), '#8d6e63', 0.86, top + 0.06, 0.02);
    for (let i = 0; i < 4; i++) {
      const a = i * 1.6;
      rod(g, v3(0.86, top + 0.08, 0.02), v3(0.86 + Math.cos(a) * 0.04, top + 0.28, 0.02 + Math.sin(a) * 0.04), 0.005, '#d7b98e');
      part(g, cyl(0.016, 0.016, 0.06, 10), ['#ff8a65', '#4fc3f7', '#aed581', '#ffd54f'][i], 0.86 + Math.cos(a) * 0.02, top + 0.15, 0.02 + Math.sin(a) * 0.02, { outline: false });
    }
    const [jx, , jz] = ART.jar;
    glass(g, cyl(0.045, 0.04, 0.11, 16), jx, top + 0.055, jz);
    part(g, cyl(0.04, 0.036, 0.07, 16), '#90caf9', jx, top + 0.037, jz, { outline: false });
    // The users' paintings on the line at the back left.
    for (const x of [-0.95, -0.1]) {
      part(g, cyl(0.15, 0.17, 0.03, 16), '#455a64', x, 0.015, -0.4);
      part(g, cyl(0.016, 0.016, 1.6, 8), '#90a4ae', x, 0.8, -0.4, { outline: false });
    }
    part(g, cyl(0.003, 0.003, 0.86, 6), '#eceff1', -0.525, 1.5, -0.4, { rz: Math.PI / 2, outline: false });
    for (let i = 0; i < 4; i++) {
      const x = -0.86 + i * 0.22;
      const m = picture(g, painted(`dsPaint${i}`, 128, 110, paintPainting(i)), 0.18, 0.155, x, 1.41, -0.395);
      m.rotation.z = (i % 2 ? 1 : -1) * 0.04;
      part(g, box(0.012, 0.04, 0.01), '#8d6e63', x, 1.49, -0.395, { outline: false });
    }
    part(g, rbox(0.7, 0.11, 0.02, 0.01), '#f06292', -0.525, 1.66, -0.4);
    label(g, '우리들의 작품전', 0.62, 0.08, -0.525, 1.66, -0.389, '#f06292', '#ffffff');

    const clock = marker(g, 0, 1, 0);
    const paint = spotAt(g, 'stand', ART.dweller, 'dsArt', clock);
    out.spots = { '*': paint };
    const use = group(g);
    out.inUse = use;
    const user = chairUser(use, LOOKS.seoyeon, ART.user.x, ART.user.z, ART.user.yaw, '#ec407a', 0.16);
    // The palette and the worker's brush; the user's thick-handled brush; the new flowers.
    const palette = group(use);
    part(palette, cyl(0.12, 0.12, 0.008, 20), '#d7b98e', 0, 0, 0).scale.set(1, 1, 0.75);
    ['#e53935', '#fdd835', '#1e88e5', '#43a047', '#ab47bc'].forEach((col, i) => part(palette, cyl(0.016, 0.016, 0.006, 10), col, Math.cos(i * 0.9 - 1.6) * 0.08, 0.006, Math.sin(i * 0.9 - 1.6) * 0.06, { outline: false }));
    const brush = group(use);
    part(brush, cyl(0.005, 0.004, 0.2, 8), '#d7b98e', 0, -0.06, 0, { outline: false });
    part(brush, cyl(0.007, 0.002, 0.03, 8), '#ab47bc', 0, -0.17, 0, { outline: false });
    const theirs = group(use);
    part(theirs, cyl(0.016, 0.016, 0.08, 10), '#ff8a65', 0, 0.02, 0, { outline: false });
    part(theirs, cyl(0.005, 0.005, 0.1, 8), '#d7b98e', 0, -0.06, 0, { outline: false });
    part(theirs, cyl(0.007, 0.002, 0.03, 8), '#e53935', 0, -0.12, 0, { outline: false });
    const blooms: THREE.Mesh[] = [];
    const rr = seeded(51);
    for (let i = 0; i < 7; i++) {
      const m = part(canvas, cyl(0.016, 0.016, 0.002, 10), ['#e53935', '#f06292', '#ffca28', '#ab47bc', '#ff7043'][i % 5], -0.16 + rr() * 0.32, -0.06 + rr() * 0.08, 0.004, { rx: Math.PI / 2, outline: false });
      blooms.push(m);
    }
    out.animate = (t) => {
      const ph = clockOf(clock);
      const b = artBeat(t, ph);
      const k = dsKey('dsArt', t, ph);
      palette.position.copy(inPiece(ART.dweller, k.l, 0, 0.02, 0));
      palette.rotation.y = ART.dweller.yaw;
      brush.position.copy(inPiece(ART.dweller, k.r, 0, 0.01, 0));
      brush.rotation.set(0.5, 0, 0);
      // The user: dipping in the palette when it's held out, else painting on the canvas.
      const dip = amountOf(b, 'offer') > 0.5 && b.p > 0.3;
      const u = (t * 0.25 + ph) % 1;
      const onCanvas = canvas.localToWorld(v3(-0.1 + 0.2 * Math.sin(u * Math.PI * 2) * 0.6, -0.04 + 0.06 * Math.cos(t * 1.7), 0.03));
      g.worldToLocal(onCanvas);
      const hand = dip ? P(ART_OFFER).add(v3(0.02, 0.06, 0.02)) : onCanvas;
      user.armR(hand);
      user.armL(v3(ART.user.x - 0.18, top + 0.02, 0.18));
      theirs.position.copy(hand);
      theirs.rotation.set(dip ? 0.2 : -0.9, 0, 0);
      user.head.rotation.set(dip ? 0.3 : 0.1, dip ? 0.4 : amountOf(b, 'admire') * 0.45, 0);
      // The flowers bloom one after another over the round.
      const shown = Math.floor(((t / 12 + ph) % 1) * (blooms.length + 1));
      blooms.forEach((m, i) => (m.visible = i < shown));
    };
  },

  /**
   * The tactile map by the door (촉지도 · 경사로 안내판): a stainless pedestal with the centre's plan
   * on its sloped top, the rooms in raised colours and the routes as raised lines, '현재 위치' a bump,
   * a braille strip along its foot and a voice guide button at its right; behind it a post with the
   * blue sign (♿ 경사로 · 엘리베이터 →); yellow 점자블록 on the floor in front (dots to stop, bars to go).
   * Checking access (dsCheckAccess): stood on the blocks, both hands over the raised routes, a
   * fingertip along the braille, the voice guide pressed (it lights), ticks on the 편의시설 점검표, a
   * look up at the sign.
   */
  dsAccessMap(g, _W, _D, _c, _def, _ctx, out) {
    part(g, rbox(0.3, 0.86, 0.18, 0.02), '#b0bec5', 0, 0.43, -0.08);
    part(g, rbox(0.4, 0.03, 0.3, 0.01), '#90a4ae', 0, 0.015, -0.08);
    const [mx, my, mz] = ACCESS.map;
    const slab = group(g, mx, my, mz);
    slab.rotation.x = 0.55;
    part(slab, rbox(0.62, 0.04, 0.42, 0.012), '#37474f', 0, -0.02, 0);
    flat(slab, painted('dsMap', 256, 184, paintMap), 0.58, 0.38, 0, 0.001, 0, 0);
    // The raised routes and the 현재 위치 bump.
    for (const [x, z, w, d] of [[-0.12, 0.1, 0.34, 0.012], [0.05, -0.02, 0.012, 0.24], [0.12, 0.1, 0.012, 0.1]] as const) part(slab, box(w, 0.006, d), '#eceff1', x, 0.004, z, { outline: false });
    part(slab, ball(0.012), '#e53935', 0.18, 0.006, 0.09, { outline: false });
    // The braille strip and the voice guide.
    part(g, rbox(0.5, 0.01, 0.05, 0.005), '#eceff1', ACCESS.braille[0], ACCESS.braille[1] - 0.01, ACCESS.braille[2]);
    const dr = seeded(3);
    for (let i = 0; i < 40; i++) if (dr() > 0.45) part(g, ball(0.0035), '#78909c', -0.22 + (i % 20) * 0.022 + (Math.floor(i / 20) ? 0.006 : 0), ACCESS.braille[1] - 0.004, ACCESS.braille[2] - 0.008 + Math.floor(i / 20) * 0.012, { outline: false });
    const [bx, by, bz] = ACCESS.button;
    part(g, cyl(0.045, 0.045, 0.02, 16), '#455a64', bx, by - 0.01, bz);
    const btn = part(g, cyl(0.035, 0.035, 0.015, 16), '#fdd835', bx, by + 0.005, bz);
    label(g, '음성 안내', 0.12, 0.03, bx, by - 0.04, bz + 0.05, '#263238', '#ffffff');
    // The sign post behind.
    part(g, cyl(0.025, 0.025, 2.1, 10), '#90a4ae', 0.34, 1.05, -0.38);
    part(g, rbox(0.5, 0.22, 0.03, 0.01), BLUE, 0.14, 1.85, -0.38);
    label(g, '♿ 경사로 · 엘리베이터 →', 0.46, 0.09, 0.14, 1.89, -0.363, BLUE, '#ffffff');
    label(g, '점자 안내도 · 음성 안내', 0.42, 0.06, 0.14, 1.79, -0.363, BLUE, '#bbdefb');
    // The 점자블록 in front: dots (stop) before the map, bars (go) leading to it.
    const YEL = '#fdd835';
    for (const x of [-0.16, 0.16]) {
      part(g, box(0.3, 0.012, 0.3), YEL, x, 0.006, 0.34);
      for (let i = 0; i < 16; i++) part(g, cyl(0.012, 0.014, 0.008, 8), shade(YEL, 0.9), x - 0.1 + (i % 4) * 0.066, 0.016, 0.24 + Math.floor(i / 4) * 0.066, { outline: false });
    }

    const clock = marker(g, 0, 1, 0);
    const check = spotAt(g, 'stand', ACCESS.dweller, 'dsAccess', clock);
    out.spots = { '*': check };
    const use = group(g);
    out.inUse = use;
    const clip = group(use);
    part(clip, rbox(0.17, 0.23, 0.01, 0.006), '#8d6e63', 0, 0, 0);
    part(clip, box(0.06, 0.02, 0.014), CHROME, 0, 0.105, 0.003, { outline: false });
    picture(clip, painted('dsChecklist', 120, 160, paintChecklist), 0.15, 0.2, 0, -0.01, 0.0065);
    const lit = glowing(use, cyl(0.036, 0.036, 0.004, 16), '#fff59d', bx, by + 0.014, bz);
    out.animate = (t) => {
      const ph = clockOf(clock);
      const b = accessBeat(t, ph);
      clip.visible = clipOut(b);
      clip.position.copy(inPiece(ACCESS.dweller, ACCESS_CLIP, 0, 0.0, 0.02));
      clip.rotation.set(-0.5, ACCESS.dweller.yaw + Math.PI, 0);
      const pressed = amountOf(b, 'button') > 0.5;
      btn.position.y = by + (pressed ? 0.0 : 0.005);
      lit.visible = pressed || (b.from === 'tick' && b.p < 0.4);
    };
  },

  /**
   * The drop-off at the front door (2026-11-04, the layout audit), stood on the tile at its right end and drawn out to the left: a
   * glass-and-steel canopy hung off the building's face 3.2 m up, from over the door to past the van's bay, on three slim posts along
   * the wall (none on the kerb side, so the van drives on clear under it), the centre's name on its fascia, lights under it; on the
   * ground the yellow tactile paving up the path to the door and the bay marked out with the wheelchair sign.
   */
  dsCanopy(g) {
    const H = 3.2;
    // In the piece's frame: x from -7.5 (over the path's left) to 0.45, z from -0.5 (the wall) to 2.0 (out past the van).
    const x0 = -7.5;
    const x1 = 0.45;
    const z0 = -0.5;
    const z1 = 2.0;
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    // The frame, the glass, the fascia with the name, the lights under.
    part(g, box(x1 - x0, 0.14, 0.1), '#78909c', cx, H, z1);
    part(g, box(x1 - x0, 0.1, 0.08), '#78909c', cx, H, z0 + 0.04);
    for (const x of [x0, x0 + 2, x0 + 4, x0 + 6, x1]) part(g, box(0.08, 0.1, z1 - z0), '#78909c', x, H, cz);
    glass(g, box(x1 - x0 - 0.08, 0.02, z1 - z0 - 0.08), cx, H + 0.06, cz);
    part(g, box(4.2, 0.36, 0.04), '#ffffff', -3.5, H + 0.05, z1 + 0.07);
    label(g, CENTRE, 3.6, 0.28, -3.5, H + 0.05, z1 + 0.095, '#ffffff', BLUE);
    for (const x of [-6.5, -4.5, -2.5, -0.5]) glowing(g, cyl(0.1, 0.1, 0.02, 14), '#fff8e1', x, H - 0.08, cz);
    // The posts along the wall, the tie-rods up to the wall.
    for (const x of [x0 + 0.3, -4.3, x1 - 0.25]) {
      part(g, cyl(0.06, 0.06, H, 12), '#90a4ae', x, H / 2, z0 + 0.25);
      part(g, cyl(0.14, 0.14, 0.04, 14), '#78909c', x, 0.02, z0 + 0.25);
      rod(g, new THREE.Vector3(x, H + 0.05, z1 - 0.05), new THREE.Vector3(x, H + 1.0, z0 + 0.02), 0.015, STEEL);
    }
    // The tactile paving up the path to the door (the path is x -6 here).
    part(g, box(0.36, 0.008, 2.0), '#fdd835', -6, 0.004, 0.5, { outline: false });
    for (let i = 0; i < 10; i++) part(g, box(0.3, 0.012, 0.012), '#f9a825', -6, 0.008, -0.4 + i * 0.2, { outline: false });
    // The bay, marked out, its sign on the ground.
    for (const z of [0.25, 1.95]) part(g, box(5.0, 0.006, 0.06), '#ffffff', -2.5, 0.004, z, { outline: false });
    for (const x of [-5.0, 0.0]) part(g, box(0.06, 0.006, 1.7), '#ffffff', x, 0.004, 1.1, { outline: false });
    part(g, box(1.0, 0.006, 0.6), BLUE, -2.5, 0.005, 1.1, { outline: false });
    part(g, cyl(0.16, 0.16, 0.004, 18), '#ffffff', -2.5, 0.008, 1.1, { outline: false });
    part(g, cyl(0.12, 0.12, 0.005, 18), BLUE, -2.5, 0.009, 1.1, { outline: false });
  },
};
