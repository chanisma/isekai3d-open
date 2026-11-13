import * as THREE from 'three';
import { pavementSign } from './dentist';
import type { Motion } from '../activity';
import { marker, rod, shade, spot, type Builder, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, WATER, glass, label, litScreen, painted, picture, ring, seeded, starBase, text, type Paint } from './doctor';
import {
  ADL,
  COACH_YAW,
  COG,
  FMT,
  KIT,
  MIR,
  SPL,
  adlBeat,
  adlStanding,
  amountOf,
  assessBeat,
  assessPegs,
  cardAt,
  cogBeat,
  cogRound,
  guidedOf,
  handBeat,
  handCounts,
  holeAt,
  kitBeat,
  kitOf,
  mirrorBeat,
  mirrorHand,
  otKey,
  otPhase,
  pulse,
  splintBeat,
  splintState,
  tripOf,
  wave,
  type Loc,
} from './occupationalTherapistMotion';

/**
 * The 작업치료실 drawn as itself (2026-10-27 workplace pipeline, at the user's request): a bright,
 * practical room for getting back to everyday life — a rehabilitation hospital's OT room, its tables
 * set out with the things people practise with. The fine-motor table, the therapist's stool behind it
 * and the client's chair across, set with a pegboard and its peg well, a gel rest for the weak hand,
 * a buttoning board, beads and tweezers, therapy putty in its four strengths: a stroke patient in
 * their 환자복 puts the pegs in with the good hand while the therapist steadies the board, the weak
 * hand is guided over the board with the therapist's over it, the putty kneaded, the buttons done, the
 * beads picked out; a child's urgent 발달 평가 is timed there with the nine-hole peg test; the lead
 * stands beside it coaching a junior. And what it was missing (workFurniture/occupationalTherapist.ts):
 * the splint table with its 70℃ pan, where a resting splint is moulded on a forearm; the mirror box;
 * the ADL room with its bed, transfer pole and mock bathroom, where socks go on with the sock aid and
 * the client stands up off the bed's edge with a hand at the gait belt; the cognitive table (화투
 * pairs, a 무궁화 puzzle, the clock drawn); the assessment cabinet (the grip dynamometer, the
 * goniometer, the test kits and the forms).
 *
 * The hospital (해솔재활병원) and everyone in it are made up. The people drawn in show only while the
 * piece is in use, and only for the use they belong to (activity.ts spotPose marks the spot used).
 */

const HOSPITAL = '해솔재활병원';
const ORANGE = '#f57c00';
const BIRCH = '#e8d5b0';
const BIRCH_DARK = '#c9ae86';
const OAK = '#c9a27a';
const PAPER = '#fbfaf5';
const SKIN = '#f1c9a5';
const UP = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const PEGS = ['#e53935', '#1e88e5', '#fdd835', '#43a047'];

// ---------------------------------------------------------------------------------------------
// Small parts.

function group(parent: THREE.Object3D, x = 0, y = 0, z = 0, ry = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}
function sitAt(g: THREE.Object3D, s: Loc, yaw: number, motion: Motion, work?: THREE.Object3D): Spot {
  const p = spot(g, 'sit', s[0], s[1], s[2], yaw, s[1]);
  p.work = work;
  p.motion = motion;
  return p;
}
function standAt(g: THREE.Object3D, x: number, z: number, yaw: number, motion: Motion, work?: THREE.Object3D): Spot {
  const p = spot(g, 'stand', x, 0, z, yaw);
  p.work = work;
  p.motion = motion;
  return p;
}
/** Whether a spot's had a dweller posed at it just now (activity.ts spotPose marks it). */
const posed = (s: Spot, t: number) => Math.abs(t - ((s.at.userData.posedAt as number | undefined) ?? -1e9)) < 0.6;
const tmp = new THREE.Vector3();
const phaseOf = (s: Spot) => otPhase(s.at.getWorldPosition(tmp));
/** A place in a spot's frame, in the piece's. */
function inFrame(s: Spot, p: Loc, out = new THREE.Vector3()): THREE.Vector3 {
  return out.set(p[0], p[1], p[2]).applyAxisAngle(UP, s.at.rotation.y).add(s.at.position);
}
/** A sheet lying flat on a top, readable from +z (turned `ry` about the vertical: π to read it from -z). */
function flat(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0): THREE.Mesh {
  const m = picture(g, tex, w, h, x, y, z);
  m.rotation.order = 'YXZ';
  m.rotation.set(-Math.PI / 2, ry, 0);
  return m;
}
/** A cylinder stretched between two points each frame (a drawn person's limb, a cord). */
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
/** The therapist's round stool on casters, its top at 0.48. */
function therapyStool(g: THREE.Object3D, x: number, z: number, color = '#5d7c8a'): THREE.Group {
  const s = group(g, x, 0, z);
  starBase(s, 0, 0, 0.24, BLACK);
  part(s, cyl(0.024, 0.024, 0.3, 10), CHROME, 0, 0.3, 0, { outline: false });
  part(s, cyl(0.19, 0.19, 0.07, 20), color, 0, 0.445, 0);
  part(s, ring(0.19, 0.01), shade(color, 0.75), 0, 0.445, 0, { rx: Math.PI / 2 });
  return s;
}
/** A client's chair with arms (the kind rehab rooms have: high seat, firm, arms to push up from), facing +z, the seat's top at `h`. */
function clientChair(g: THREE.Object3D, x: number, z: number, ry: number, fabric: string, h = 0.46): THREE.Group {
  const c = group(g, x, 0, z, ry);
  const wood = '#8d6e63';
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(c, cyl(0.02, 0.017, h - 0.04, 8), wood, sx * 0.2, (h - 0.04) / 2, sz * 0.18, { outline: false });
  part(c, rbox(0.46, 0.04, 0.42, 0.015), wood, 0, h - 0.04, 0);
  part(c, rbox(0.42, 0.05, 0.39, 0.03), fabric, 0, h - 0.005, 0.005);
  for (const sx of [-1, 1]) {
    part(c, cyl(0.016, 0.016, 0.46, 8), wood, sx * 0.2, h + 0.21, -0.19, { outline: false });
    // The arms, to push up from.
    part(c, rbox(0.05, 0.035, 0.4, 0.015), wood, sx * 0.225, h + 0.2, 0.0);
    part(c, cyl(0.014, 0.014, 0.2, 8), wood, sx * 0.225, h + 0.1, 0.17, { outline: false });
  }
  part(c, rbox(0.42, 0.28, 0.05, 0.03), fabric, 0, h + 0.27, -0.2, { rx: -0.08 });
  return c;
}
/** A work table for therapy, its top `top` high across x0–x1 and z0–z1, on two height-adjustable T-legs. */
function therapyTable(g: THREE.Object3D, x0: number, x1: number, z0: number, z1: number, top: number, wood: string) {
  const zc = (z0 + z1) / 2;
  const d = z1 - z0;
  part(g, rbox(x1 - x0, 0.035, d, 0.014), wood, (x0 + x1) / 2, top - 0.0175, zc);
  // The soft front edge the client's forearms rest against.
  part(g, rbox(x1 - x0 - 0.06, 0.04, 0.035, 0.016), '#78909c', (x0 + x1) / 2, top - 0.012, z1 + 0.004);
  for (const x of [x0 + 0.12, x1 - 0.12]) {
    part(g, rbox(0.06, top - 0.3, 0.06, 0.01), '#cfd8dc', x, 0.33 + (top - 0.3) / 2 - 0.035, zc);
    part(g, rbox(0.045, 0.3, 0.045, 0.008), STEEL, x, 0.18, zc, { outline: false });
    part(g, rbox(0.06, 0.04, d - 0.04, 0.012), '#90a4ae', x, 0.02, zc);
    part(g, cyl(0.012, 0.012, 0.03, 8), BLACK, x + (x > 0 ? 0.04 : -0.04), 0.5, zc, { rz: Math.PI / 2, outline: false });
  }
  part(g, box(x1 - x0 - 0.3, 0.05, 0.03), '#b0bec5', (x0 + x1) / 2, 0.38, zc, { outline: false });
}

// ---------------------------------------------------------------------------------------------
// The people drawn in.

interface Look {
  top: string;
  bottom: string;
  hair: string;
  skin?: string;
  shoes?: string;
  hairdo: 'short' | 'bob' | 'pony' | 'grey' | 'kid' | 'perm';
  glasses?: boolean;
  /** 환자복 stripes down the top and trousers. */
  stripes?: string;
  /** Scrubs' V-neck, and the name badge. */
  scrubs?: boolean;
  cardigan?: boolean;
  /** A gait belt round the waist. */
  belt?: boolean;
}
const LOOKS = {
  /** A stroke patient in the hospital's blue 환자복. */
  patientM: { top: '#9ec9e6', bottom: '#9ec9e6', hair: '#cfcfcf', hairdo: 'grey', stripes: '#5d8fb5', shoes: '#eceff1' } as Look,
  /** A patient in the women's pink 환자복. */
  patientF: { top: '#f3bfcf', bottom: '#f3bfcf', hair: '#3b2f2a', hairdo: 'bob', stripes: '#c9809a', glasses: true, shoes: '#eceff1' } as Look,
  /** The ADL patient, a gait belt on. */
  patientAdl: { top: '#9ec9e6', bottom: '#9ec9e6', hair: '#1a1a1a', hairdo: 'short', stripes: '#5d8fb5', shoes: '#eceff1', belt: true } as Look,
  child: { top: '#ffca28', bottom: '#1e88e5', hair: '#1a1a1a', hairdo: 'kid', shoes: '#e53935' } as Look,
  junior: { top: '#ffb74d', bottom: '#ffb74d', hair: '#2b1b10', hairdo: 'pony', scrubs: true, shoes: '#fafafa' } as Look,
  grandpa: { top: '#8d7b68', bottom: '#4b4f58', hair: '#e0e0e0', hairdo: 'grey', cardigan: true, glasses: true, shoes: '#2b2b30' } as Look,
  grandma: { top: '#b5838d', bottom: '#5d4e60', hair: '#6d5a4b', hairdo: 'perm', cardigan: true, shoes: '#4e342e' } as Look,
};

interface Figure {
  root: THREE.Group;
  head: THREE.Group;
  /** Puts the left / right hand at a point in the parent's frame, or back at rest. */
  armL(to: THREE.Vector3 | null): void;
  armR(to: THREE.Vector3 | null): void;
  handL: THREE.Mesh;
  handR: THREE.Mesh;
  /** Where a hand or elbow is now, in the parent's frame. */
  at(o: 'handL' | 'handR' | 'elbowL' | 'elbowR', out?: THREE.Vector3): THREE.Vector3;
}
/**
 * Someone drawn in, their feet (or the seat under them) at (x, z) in `parent`, turned `ry` (0 faces
 * +z): stood, or sat on a seat whose top is `seat` high (in their own size); `k` scales them (a
 * child). Their hands rest in the lap or at the sides until put somewhere.
 */
function person(parent: THREE.Object3D, look: Look, x: number, z: number, ry: number, seat?: number, k = 1): Figure {
  const root = group(parent, x, 0, z, ry);
  root.scale.setScalar(k);
  const skin = look.skin ?? SKIN;
  const shoes = look.shoes ?? '#2b2b30';
  const sat = seat !== undefined;
  const sh = seat ?? 0;
  const shoulderY = sat ? sh + 0.53 : 1.31;
  const torsoY = sat ? sh + 0.33 : 1.11;
  if (sat) {
    for (const sx of [-1, 1]) {
      const hip = v3(sx * 0.09, sh + 0.07, -0.03);
      const knee = v3(sx * 0.1, sh + 0.06, 0.36);
      const ankle = v3(sx * 0.1, Math.max(0.07, sh + 0.06 - 0.4), 0.4);
      rod(root, hip, knee, 0.062, look.bottom);
      rod(root, knee, ankle, 0.05, look.bottom);
      if (look.stripes) rod(root, v3(sx * 0.1, sh + 0.115, 0.0), v3(sx * 0.1, sh + 0.115, 0.34), 0.008, look.stripes);
      part(root, rbox(0.09, 0.07, 0.2, 0.03), shoes, sx * 0.1, ankle.y - 0.035, ankle.z + 0.05);
    }
    part(root, rbox(0.31, 0.15, 0.26, 0.06), look.bottom, 0, sh + 0.08, 0);
  } else {
    for (const sx of [-1, 1]) {
      rod(root, v3(sx * 0.085, 0.84, 0), v3(sx * 0.09, 0.08, 0.01), 0.056, look.bottom);
      if (look.stripes) rod(root, v3(sx * 0.085, 0.8, 0.055), v3(sx * 0.09, 0.12, 0.062), 0.008, look.stripes);
      part(root, rbox(0.09, 0.07, 0.2, 0.03), shoes, sx * 0.09, 0.035, 0.04);
    }
    part(root, rbox(0.3, 0.17, 0.2, 0.06), look.bottom, 0, 0.88, 0);
  }
  const tz = sat ? -0.02 : 0;
  part(root, rbox(0.34, 0.46, 0.21, 0.08), look.top, 0, torsoY, tz);
  if (look.stripes) for (const sx of [-0.11, -0.04, 0.04, 0.11]) part(root, box(0.012, 0.42, 0.004), look.stripes, sx, torsoY, tz + 0.106, { outline: false });
  if (look.stripes) for (let i = 0; i < 4; i++) part(root, ball(0.01), '#ffffff', 0.0, torsoY + 0.14 - i * 0.09, tz + 0.108, { outline: false });
  if (look.cardigan) for (let i = 0; i < 4; i++) part(root, ball(0.011), '#f5f0e6', 0, torsoY + 0.14 - i * 0.09, tz + 0.106, { outline: false });
  if (look.scrubs) {
    part(root, box(0.1, 0.1, 0.004), skin, 0, torsoY + 0.18, tz + 0.106, { rz: Math.PI / 4, outline: false });
    part(root, box(0.07, 0.05, 0.004), '#ffffff', 0.08, torsoY + 0.09, tz + 0.107, { outline: false });
    part(root, box(0.06, 0.008, 0.004), ORANGE, 0.08, torsoY + 0.1, tz + 0.109, { outline: false });
  }
  if (look.belt) {
    part(root, rbox(0.37, 0.06, 0.24, 0.025), '#1565c0', 0, sat ? sh + 0.16 : 0.96, tz);
    part(root, rbox(0.07, 0.05, 0.02, 0.01), CHROME, 0, sat ? sh + 0.16 : 0.96, tz + 0.122);
  }
  part(root, cyl(0.045, 0.05, 0.08, 10), skin, 0, shoulderY + 0.06, tz, { outline: false });
  const head = group(root, 0, shoulderY + 0.2, tz);
  part(head, ball(0.112), skin, 0, 0, 0);
  for (const sx of [-1, 1]) part(head, ball(0.012), '#2b2b30', sx * 0.04, 0.0, 0.104, { outline: false });
  part(head, box(0.03, 0.006, 0.004), '#a1665e', 0, -0.045, 0.104, { outline: false });
  switch (look.hairdo) {
    case 'perm':
      part(head, ball(0.118), look.hair, 0, 0.035, -0.025);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        part(head, ball(0.045), look.hair, Math.cos(a) * 0.08, 0.08 + 0.02 * Math.sin(a * 2), -0.02 + Math.sin(a) * 0.07, { outline: false });
      }
      break;
    case 'grey':
      part(head, ball(0.117), look.hair, 0, 0.02, -0.035);
      part(head, ball(0.1), skin, 0, 0.05, 0.02, { outline: false });
      break;
    case 'bob':
      part(head, ball(0.122), look.hair, 0, 0.025, -0.02);
      part(head, rbox(0.26, 0.12, 0.2, 0.05), look.hair, 0, -0.04, -0.03);
      part(head, rbox(0.21, 0.05, 0.05, 0.02), look.hair, 0, 0.07, 0.08, { rx: -0.3 });
      break;
    case 'pony':
      part(head, ball(0.12), look.hair, 0, 0.03, -0.03);
      part(head, rbox(0.2, 0.06, 0.06, 0.02), look.hair, 0, 0.075, 0.07, { rx: -0.3 });
      part(head, rbox(0.06, 0.2, 0.06, 0.03), look.hair, 0, -0.06, -0.14, { rx: 0.3 });
      break;
    case 'kid':
      part(head, ball(0.12), look.hair, 0, 0.035, -0.02);
      part(head, rbox(0.22, 0.05, 0.05, 0.02), look.hair, 0, 0.065, 0.085);
      break;
    default:
      part(head, ball(0.118), look.hair, 0, 0.03, -0.03);
      part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0, 0.075, 0.075, { rx: -0.25 });
  }
  if (look.glasses) {
    for (const sx of [-1, 1]) part(head, ring(0.024, 0.003), '#5d4037', sx * 0.042, 0.002, 0.11);
    part(head, box(0.02, 0.004, 0.004), '#5d4037', 0, 0.002, 0.112, { outline: false });
  }
  const hands: Record<string, THREE.Mesh> = {};
  const elbows: Record<string, THREE.Vector3> = {};
  const arm = (sx: number) => {
    const name = sx > 0 ? 'L' : 'R';
    const shoulder = v3(sx * 0.2, shoulderY, tz);
    const rest = sat ? v3(sx * 0.11, sh + 0.16, 0.24) : v3(sx * 0.23, 0.82, 0.05);
    const upper = limb(root, 0.042, look.top);
    const lower = limb(root, 0.035, look.top);
    const hand = part(root, ball(0.036), skin, 0, 0, 0, { outline: false });
    hands[name] = hand;
    const loc = new THREE.Vector3();
    const elbow = new THREE.Vector3();
    elbows[name] = elbow;
    const d = new THREE.Vector3();
    const bend = new THREE.Vector3();
    return (to: THREE.Vector3 | null) => {
      if (to) loc.copy(to).sub(root.position).applyAxisAngle(UP, -root.rotation.y).divideScalar(k);
      else loc.copy(rest);
      d.subVectors(loc, shoulder);
      const L = Math.min(0.55, Math.max(0.05, d.length()));
      d.normalize();
      loc.copy(shoulder).addScaledVector(d, L);
      const a = 0.29;
      const b = 0.27;
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
  const at = (o: 'handL' | 'handR' | 'elbowL' | 'elbowR', out = new THREE.Vector3()) => {
    const p = o === 'handL' ? hands.L.position : o === 'handR' ? hands.R.position : o === 'elbowL' ? elbows.L : elbows.R;
    return out.copy(p).multiplyScalar(k).applyAxisAngle(UP, root.rotation.y).add(root.position);
  };
  return { root, head, armL, armR, handL: hands.L, handR: hands.R, at };
}

// ---------------------------------------------------------------------------------------------
// What's painted on the forms, the cards, the screens and the signs.

const paintSessionNote: Paint = (c) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 128, 170);
  c.fillStyle = ORANGE;
  c.fillRect(0, 0, 128, 20);
  text(c, '손 기능 훈련 기록지', 64, 11, 11, '#ffffff', 'center');
  const rows = ['페그보드 16개', '퍼티 (노랑)', '단추 3개', '구슬 옮기기', '보호자 교육'];
  rows.forEach((r, i) => {
    c.strokeStyle = '#90a4ae';
    c.strokeRect(8, 30 + i * 26, 12, 12);
    if (i < 3) text(c, '✓', 14, 37 + i * 26, 12, '#2e7d32', 'center');
    text(c, r, 26, 37 + i * 26, 11, '#37474f');
  });
  text(c, '우측 편마비 · 3주차', 64, 160, 10, '#78909c', 'center', false);
};
const paintAssessForm: Paint = (c) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 128, 170);
  c.fillStyle = '#1e88e5';
  c.fillRect(0, 0, 128, 20);
  text(c, '아동 발달 평가지', 64, 11, 11, '#ffffff', 'center');
  text(c, '9-Hole Peg Test', 8, 32, 10, '#37474f');
  for (let i = 0; i < 4; i++) {
    c.strokeStyle = '#b0bec5';
    c.beginPath();
    c.moveTo(8, 52 + i * 24);
    c.lineTo(120, 52 + i * 24);
    c.stroke();
  }
  text(c, '오른손  24.6초', 10, 46, 10, '#37474f', 'left', false);
  text(c, '왼손  31.2초', 10, 70, 10, '#37474f', 'left', false);
  text(c, '눈-손 협응 ★★★☆', 10, 94, 10, '#37474f', 'left', false);
  text(c, '집중 시간 ', 10, 118, 10, '#37474f', 'left', false);
  text(c, '평가자 서명', 120, 158, 9, '#90a4ae', 'right', false);
};
/** The clock-drawing sheet: a circle with some of the numbers in. */
const paintClock: Paint = (c) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 128, 128);
  text(c, '시계 그리기', 64, 10, 10, '#78909c', 'center');
  c.strokeStyle = '#37474f';
  c.lineWidth = 2;
  c.beginPath();
  c.arc(64, 70, 46, 0, Math.PI * 2);
  c.stroke();
  for (let h = 1; h <= 12; h++) {
    if (h > 8) continue;
    const a = (h / 12) * Math.PI * 2 - Math.PI / 2;
    text(c, String(h), 64 + Math.cos(a) * 36, 70 + Math.sin(a) * 36, 11, '#1a237e', 'center', false);
  }
  c.beginPath();
  c.moveTo(64, 70);
  c.lineTo(64 + 18, 70 - 10);
  c.stroke();
};
const HWATU: Array<{ bg: string; motif: (c: CanvasRenderingContext2D) => void; name: string }> = [
  { name: '송학', bg: '#fffaf0', motif: (c) => { c.fillStyle = '#e53935'; c.beginPath(); c.arc(32, 26, 13, 0, Math.PI * 2); c.fill(); c.fillStyle = '#2e7d32'; c.fillRect(6, 60, 52, 14); c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(32, 52, 14, 7, 0, 0, Math.PI * 2); c.fill(); } },
  { name: '매조', bg: '#fffaf0', motif: (c) => { c.strokeStyle = '#4e342e'; c.lineWidth = 4; c.beginPath(); c.moveTo(6, 80); c.lineTo(50, 20); c.stroke(); c.fillStyle = '#e53935'; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(16 + i * 8, 64 - i * 10, 5, 0, Math.PI * 2); c.fill(); } c.fillStyle = '#fdd835'; c.beginPath(); c.arc(44, 46, 6, 0, Math.PI * 2); c.fill(); } },
  { name: '벚꽃', bg: '#fffaf0', motif: (c) => { c.fillStyle = '#f48fb1'; for (let i = 0; i < 7; i++) { c.beginPath(); c.arc(12 + (i % 3) * 18, 18 + Math.floor(i / 3) * 18, 7, 0, Math.PI * 2); c.fill(); } c.fillStyle = '#e53935'; c.fillRect(8, 66, 48, 12); } },
  { name: '난초', bg: '#fffaf0', motif: (c) => { c.strokeStyle = '#2e7d32'; c.lineWidth = 3; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(32, 86); c.quadraticCurveTo(12 + i * 10, 40, 6 + i * 13, 10); c.stroke(); } c.fillStyle = '#7e57c2'; c.beginPath(); c.arc(40, 34, 6, 0, Math.PI * 2); c.fill(); } },
  { name: '모란', bg: '#fffaf0', motif: (c) => { c.fillStyle = '#c2185b'; c.beginPath(); c.arc(32, 36, 16, 0, Math.PI * 2); c.fill(); c.fillStyle = '#f06292'; c.beginPath(); c.arc(32, 36, 9, 0, Math.PI * 2); c.fill(); c.fillStyle = '#2e7d32'; c.fillRect(10, 62, 44, 10); } },
  { name: '국진', bg: '#fffaf0', motif: (c) => { c.fillStyle = '#fdd835'; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; c.beginPath(); c.ellipse(32 + Math.cos(a) * 10, 36 + Math.sin(a) * 10, 7, 3, a, 0, Math.PI * 2); c.fill(); } c.fillStyle = '#f57f17'; c.beginPath(); c.arc(32, 36, 6, 0, Math.PI * 2); c.fill(); } },
];
function hwatuFace(i: number): THREE.Texture {
  const h = HWATU[i % HWATU.length];
  return painted(`ot-hwatu-${i % HWATU.length}`, 64, 96, (c) => {
    c.fillStyle = '#1a1a1a';
    c.fillRect(0, 0, 64, 96);
    c.fillStyle = h.bg;
    c.fillRect(3, 3, 58, 90);
    h.motif(c);
  });
}
const paintHwatuBack: Paint = (c) => {
  c.fillStyle = '#b71c1c';
  c.fillRect(0, 0, 64, 96);
  c.strokeStyle = '#7f0000';
  c.lineWidth = 3;
  c.strokeRect(5, 5, 54, 86);
};
/** The 무궁화 puzzle's picture (the sky, the hill, the flowers). */
const paintPuzzle: Paint = (c) => {
  const g = c.createLinearGradient(0, 0, 0, 96);
  g.addColorStop(0, '#81d4fa');
  g.addColorStop(1, '#e1f5fe');
  c.fillStyle = g;
  c.fillRect(0, 0, 128, 96);
  c.fillStyle = '#66bb6a';
  c.beginPath();
  c.ellipse(64, 104, 90, 40, 0, 0, Math.PI * 2);
  c.fill();
  const flower = (x: number, y: number, r: number) => {
    c.fillStyle = '#f8bbd0';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      c.beginPath();
      c.ellipse(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.55, r * 0.4, a, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = '#c2185b';
    c.beginPath();
    c.arc(x, y, r * 0.28, 0, Math.PI * 2);
    c.fill();
  };
  flower(40, 50, 18);
  flower(88, 40, 14);
  flower(100, 70, 11);
  c.strokeStyle = 'rgba(0,0,0,0.25)';
  c.lineWidth = 1;
  for (let x = 32; x < 128; x += 32) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, 96);
    c.stroke();
  }
  for (let y = 32; y < 96; y += 32) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(128, y);
    c.stroke();
  }
};
const paintTablet: Paint = (c) => {
  c.fillStyle = '#263238';
  c.fillRect(0, 0, 160, 110);
  text(c, '기억력 훈련 · 2단계', 80, 12, 11, '#ffcc80', 'center');
  const cols = ['#ef5350', '#42a5f5', '#66bb6a', '#ffca28', '#ab47bc', '#26a69a'];
  for (let i = 0; i < 6; i++) {
    c.fillStyle = i === 1 || i === 4 ? cols[i] : '#455a64';
    c.fillRect(14 + (i % 3) * 46, 26 + Math.floor(i / 3) * 38, 40, 32);
  }
  text(c, '점수 80', 150, 102, 10, '#b0bec5', 'right');
};
const paintCalendar: Paint = (c) => {
  c.fillStyle = '#fffde7';
  c.fillRect(0, 0, 128, 96);
  c.fillStyle = '#ef6c00';
  c.fillRect(0, 0, 128, 22);
  text(c, '오늘은', 64, 12, 12, '#ffffff', 'center');
  text(c, '10월 27일', 64, 42, 18, '#37474f', 'center');
  text(c, '화요일', 64, 64, 14, '#e53935', 'center');
  text(c, '날씨: 맑음 ☀', 64, 84, 11, '#546e7a', 'center', false);
};
const paintSplintChart: Paint = (c) => {
  c.fillStyle = '#fff8e1';
  c.fillRect(0, 0, 256, 128);
  text(c, '맞춤 손 보조기', 128, 14, 15, '#e65100', 'center');
  const names = ['휴식 보조기', '손목 보조기', '엄지 보조기', '손가락 보조기'];
  names.forEach((n, i) => {
    const x = 32 + i * 64;
    c.fillStyle = '#ffe0b2';
    c.beginPath();
    c.ellipse(x, 62, 16 - i * 2, 30 - i * 5, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#1565c0';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(x - 16, 54);
    c.lineTo(x + 16, 54);
    c.stroke();
    text(c, n, x, 110, 10, '#5d4037', 'center');
  });
};
const paintAdlSteps: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 256, 96);
  c.fillStyle = '#26a69a';
  c.fillRect(0, 0, 256, 22);
  text(c, '혼자서 옷 입기 · 일어서기', 128, 12, 13, '#ffffff', 'center');
  const steps = ['① 양말 보조기', '② 단추 고리', '③ 발 당기기', '④ 하나 둘 셋!'];
  steps.forEach((s, i) => {
    c.fillStyle = '#e0f2f1';
    c.fillRect(6 + i * 62, 30, 58, 44);
    c.fillStyle = '#00897b';
    c.beginPath();
    c.arc(35 + i * 62, 48, 10, 0, Math.PI * 2);
    c.fill();
    text(c, s, 35 + i * 62, 84, 10, '#37474f', 'center', false);
  });
};
const paintCalibration: Paint = (c) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 128, 160);
  text(c, '평가 도구 점검표', 64, 12, 11, '#37474f', 'center');
  const rows = ['악력계', '핀치게이지', '각도계', '9HPT', 'Box&Block'];
  rows.forEach((r, i) => {
    text(c, r, 8, 36 + i * 24, 10, '#455a64', 'left', false);
    c.strokeStyle = '#90a4ae';
    c.strokeRect(96, 29 + i * 24, 14, 14);
    if (i < 3) text(c, '✓', 103, 37 + i * 24, 13, '#2e7d32', 'center');
  });
};
const paintPanDisplay: Paint = (c) => {
  c.fillStyle = '#101418';
  c.fillRect(0, 0, 96, 40);
  text(c, '70℃', 48, 21, 24, '#ff7043', 'center');
};

// ---------------------------------------------------------------------------------------------
// Props.

function peg(g: THREE.Object3D, color: string): THREE.Mesh {
  const m = part(g, cyl(0.0085, 0.0085, 0.05, 8), color, 0, 0, 0, { outline: false });
  part(m, ball(0.011), color, 0, 0.026, 0, { outline: false });
  return m;
}
/** A tub of therapy putty, its lid off beside it. */
function puttyTub(g: THREE.Object3D, x: number, y: number, z: number, color: string, lid = true) {
  part(g, cyl(0.035, 0.032, 0.04, 14), '#fafafa', x, y + 0.02, z);
  part(g, cyl(0.03, 0.03, 0.005, 14), color, x, y + 0.041, z, { outline: false });
  if (lid) part(g, cyl(0.037, 0.037, 0.01, 14), color, x + 0.06, y + 0.005, z + 0.02);
}
function tweezers(g: THREE.Object3D, color = '#1e88e5'): THREE.Group {
  const t = group(g);
  for (const sx of [-1, 1]) part(t, box(0.006, 0.004, 0.11), color, sx * 0.006, 0, 0, { ry: sx * 0.06, outline: false });
  return t;
}
/** A stopwatch, face up (+y). */
function stopwatch(g: THREE.Object3D): THREE.Group {
  const s = group(g);
  part(s, cyl(0.03, 0.03, 0.014, 18), '#eceff1', 0, 0, 0);
  part(s, cyl(0.024, 0.024, 0.002, 18), '#263238', 0, 0.008, 0, { outline: false });
  part(s, box(0.01, 0.012, 0.012), '#e53935', 0, 0, -0.035, { outline: false });
  return s;
}
/** A grip dynamometer (the Jamar's grey handle and round dial), upright. */
function dynamometer(g: THREE.Object3D): { root: THREE.Group; needle: THREE.Object3D } {
  const d = group(g);
  part(d, rbox(0.035, 0.13, 0.03, 0.01), '#9e9e9e', 0, 0, 0);
  part(d, rbox(0.03, 0.12, 0.022, 0.01), '#616161', 0, 0, 0.04);
  part(d, cyl(0.045, 0.045, 0.02, 20), '#bdbdbd', 0, 0.1, 0.0, { rx: Math.PI / 2 });
  part(d, cyl(0.039, 0.039, 0.004, 20), '#fafafa', 0, 0.1, 0.011, { rx: Math.PI / 2, outline: false });
  const needle = group(d, 0, 0.1, 0.014);
  part(needle, box(0.003, 0.032, 0.002), '#e53935', 0, 0.014, 0, { outline: false });
  return { root: d, needle };
}
/** A goniometer: two clear arms on a protractor head, opened `a` radians. */
function goniometer(g: THREE.Object3D): { root: THREE.Group; arm: THREE.Group } {
  const r = group(g);
  const clear = new THREE.MeshToonMaterial({ color: '#b3e5fc', transparent: true, opacity: 0.7 });
  const m1 = new THREE.Mesh(box(0.2, 0.004, 0.025), clear);
  m1.position.set(0.1, 0, 0);
  r.add(m1);
  part(r, cyl(0.035, 0.035, 0.005, 20), '#e1f5fe', 0, 0, 0, { outline: false });
  const arm = group(r);
  const m2 = new THREE.Mesh(box(0.2, 0.004, 0.025), clear);
  m2.position.set(0.1, 0.004, 0);
  arm.add(m2);
  part(r, cyl(0.008, 0.008, 0.012, 10), '#37474f', 0, 0.002, 0, { outline: false });
  return { root: r, arm };
}

// ---------------------------------------------------------------------------------------------

let fmtCount = 0;
let splintCount = 0;
let cogCount = 0;

export const BUILDERS: Record<string, Builder> = {
  // The hospital's pole sign on the pavement (2026-11-05, the layout audit).
  otStreetSign: pavementSign('otStreetSign', '🧩', '해솔|재활병원', ['재활의학과', '작업치료 · 아동발달', '보호자 상담'], ORANGE),
  /**
   * The fine-motor table (손 기능 훈련 테이블): a birch therapy table on height-adjustable legs, a soft
   * front edge, the therapist's stool behind and the client's armchair across. Set out: the pegboard
   * with its peg well, the gel rest for the weak hand, the buttoning board (a shirt's placket on a
   * tilted board), a tray of beads with tweezers and a cup, therapy putty in its four strengths, the
   * session note, stacking cones and a hand gripper. Hand training (handTraining): sat behind it, a
   * stroke patient in 환자복 across — pegs in with the good hand while the board's steadied, the weak
   * hand guided over the board under the therapist's, putty kneaded together, the buttons, the beads,
   * a clap. The urgent 발달 평가 (urgentAssessment): the table cleared for the nine-hole peg test, a
   * child on a booster across, timed with the stopwatch, the form filled in, a sticker. The lead's
   * coaching (superviseJuniors): stood at its corner while a junior works with the patient — watching,
   * pointing, leaning in to show the grip, a note on the clipboard.
   */
  fineMotorTable(g, _W, _D, _c, _def, _ctx, out) {
    const n = fmtCount++;
    const top = FMT.top;
    therapyTable(g, -0.8, 0.8, -0.14, 0.34, top, BIRCH);
    therapyStool(g, FMT.seat[0], FMT.seat[2]);
    clientChair(g, FMT.chair[0], FMT.chair[1], Math.PI, '#ffb74d');

    // The training set (put away for an assessment).
    const trainSet = group(g);
    const [bx, bz] = FMT.board;
    part(trainSet, rbox(0.2, 0.022, 0.2, 0.01), '#fafafa', bx, top + 0.011, bz);
    for (let i = 0; i < 16; i++) {
      const [hx, hz] = holeAt(i);
      part(trainSet, cyl(0.01, 0.01, 0.002, 8), '#9e9e9e', hx, top + 0.023, hz, { outline: false });
    }
    // The peg well along its front, a few pegs lying in it.
    part(trainSet, rbox(0.2, 0.02, 0.05, 0.01), '#fafafa', FMT.well[0], top + 0.01, FMT.well[1]);
    part(trainSet, box(0.18, 0.004, 0.035), '#e0e0e0', FMT.well[0], top + 0.019, FMT.well[1], { outline: false });
    for (let i = 0; i < 6; i++) {
      const p = peg(trainSet, PEGS[i % 4]);
      p.position.set(FMT.well[0] - 0.07 + i * 0.028, top + 0.026, FMT.well[1] + (i % 2) * 0.008);
      p.rotation.set(0, 0.2 * i, Math.PI / 2);
    }
    const pegs: THREE.Mesh[] = [];
    for (let i = 0; i < 16; i++) {
      const p = peg(trainSet, PEGS[i % 4]);
      const [hx, hz] = holeAt(i);
      p.position.set(hx, top + 0.035, hz);
      pegs.push(p);
    }
    // The weak hand's gel rest.
    part(trainSet, rbox(0.15, 0.04, 0.19, 0.02), '#81d4fa', FMT.cushion[0], top + 0.02, FMT.cushion[1]);
    // Beads, tweezers and the cup.
    part(trainSet, rbox(0.11, 0.016, 0.075, 0.006), '#fafafa', FMT.beads[0], top + 0.008, FMT.beads[1]);
    const rr = seeded(5 + n);
    const beadCols = ['#e91e63', '#ffeb3b', '#00bcd4', '#8bc34a', '#ff9800'];
    for (let i = 0; i < 9; i++) part(trainSet, ball(0.007), beadCols[i % 5], FMT.beads[0] - 0.04 + rr() * 0.08, top + 0.022, FMT.beads[1] - 0.025 + rr() * 0.05, { outline: false });
    part(trainSet, cyl(0.026, 0.022, 0.05, 14), '#ffffff', FMT.cup[0], top + 0.025, FMT.cup[1]);
    const cupBeads: THREE.Mesh[] = [];
    for (let i = 0; i < 5; i++) {
      const b = part(trainSet, ball(0.007), beadCols[i], FMT.cup[0] - 0.008 + (i % 2) * 0.016, top + 0.012 + Math.floor(i / 2) * 0.012, FMT.cup[1] + (i % 3 - 1) * 0.008, { outline: false });
      cupBeads.push(b);
    }
    const tw = tweezers(trainSet);
    // The buttoning board: a shirt's placket on a board tilted to the client.
    const bb = group(trainSet, FMT.buttons[0], top, FMT.buttons[1], Math.PI);
    part(bb, rbox(0.22, 0.016, 0.16, 0.006), OAK, 0, 0.04, 0, { rx: -0.35 });
    part(bb, box(0.07, 0.03, 0.12), OAK, 0, 0.015, -0.06, { outline: false });
    part(bb, box(0.1, 0.004, 0.14), '#64b5f6', -0.04, 0.052, 0.002, { rx: -0.35, outline: false });
    part(bb, box(0.1, 0.004, 0.14), '#90caf9', 0.05, 0.054, 0.006, { rx: -0.35, outline: false });
    for (let i = 0; i < 3; i++) part(bb, cyl(0.012, 0.012, 0.006, 12), '#fafafa', 0.01, 0.07 - i * 0.017, -0.045 + i * 0.045, { rx: Math.PI / 2 - 0.35 });
    // The putty in its four strengths, the session note, cones, a gripper, a timer.
    ['#fdd835', '#e53935', '#43a047', '#1e88e5'].forEach((col, i) => puttyTub(g, FMT.putty[0] - 0.06 + (i % 2) * 0.09, top, FMT.putty[1] - 0.06 + Math.floor(i / 2) * 0.09, col, i === 0));
    part(g, rbox(0.15, 0.006, 0.2, 0.004), '#795548', -0.66, top + 0.003, 0.12);
    flat(g, painted('otSessionNote', 128, 170, paintSessionNote), 0.13, 0.18, -0.66, top + 0.0075, 0.12, Math.PI);
    for (let i = 0; i < 4; i++) part(g, cyl(0.004, 0.032, 0.07, 12), PEGS[i], 0.66, top + 0.035 + i * 0.012, 0.12, { outline: i === 3 });
    part(g, ring(0.03, 0.008), '#455a64', 0.62, top + 0.008, -0.04, { rx: Math.PI / 2 });
    part(g, cyl(0.03, 0.03, 0.035, 16), '#ffffff', 0.7, top + 0.018, -0.06);
    part(g, cyl(0.024, 0.024, 0.002, 16), ORANGE, 0.7, top + 0.036, -0.06, { outline: false });
    if (n % 2 === 0) label(g, `${HOSPITAL} 작업치료실`, 0.4, 0.06, 0, top + 0.03, -0.142, BIRCH_DARK, '#ffffff', Math.PI);

    // The assessment set: the nine-hole peg test, the stopwatch, the form, the stickers; a booster on the chair.
    const test = group(g);
    const [tx, tz] = FMT.test;
    part(test, rbox(0.18, 0.022, 0.12, 0.01), '#eceff1', tx, top + 0.011, tz);
    const tPegs: THREE.Mesh[] = [];
    for (let i = 0; i < 9; i++) {
      const hx = tx - 0.03 + (i % 3) * 0.03;
      const hz = tz - 0.03 + Math.floor(i / 3) * 0.025;
      part(test, cyl(0.008, 0.008, 0.002, 8), '#757575', hx, top + 0.023, hz, { outline: false });
      const p = peg(test, '#fafafa');
      p.position.set(hx, top + 0.035, hz);
      tPegs.push(p);
    }
    part(test, cyl(0.03, 0.03, 0.012, 16), '#eceff1', tx + 0.05, top + 0.03, tz + 0.03, { outline: false });
    flat(test, painted('otAssessForm', 128, 170, paintAssessForm), 0.14, 0.19, FMT.form[0], top + 0.004, FMT.form[1], Math.PI);
    const sticker = group(test, 0.3, top + 0.003, 0.05);
    part(sticker, box(0.07, 0.003, 0.09), '#ffffff', 0, 0, 0, { outline: false });
    for (let i = 0; i < 6; i++) part(sticker, cyl(0.01, 0.01, 0.002, 10), ['#fdd835', '#f06292', '#4fc3f7'][i % 3], -0.017 + (i % 2) * 0.034, 0.003, -0.03 + Math.floor(i / 2) * 0.03, { outline: false });
    const watch = stopwatch(test);
    part(test, rbox(0.36, 0.1, 0.34, 0.04), '#4fc3f7', FMT.chair[0], 0.51, FMT.chair[1] + 0.02);
    test.visible = false;

    // Spots: sat behind (training, assessing); the lead stood at the corner.
    const workAt = marker(g, bx, top + 0.03, bz);
    const trainAt = sitAt(g, FMT.seat, 0, 'otHand', workAt);
    const assess = sitAt(g, FMT.seat, 0, 'otAssess', workAt);
    const coach = standAt(g, FMT.coach[0], FMT.coach[1], COACH_YAW, 'otCoach', workAt);
    out.spots = { handTraining: trainAt, urgentAssessment: assess, occupationalTherapist_superviseJuniors: coach, '*': trainAt };
    out.work = workAt;

    // In use: the patient, the child, the junior.
    const use = group(g);
    out.inUse = use;
    const [cx, cz] = FMT.chair;
    const patient = person(use, n % 2 === 0 ? LOOKS.patientM : LOOKS.patientF, cx, cz, Math.PI, 0.46);
    const child = person(use, LOOKS.child, cx, cz, Math.PI, 0.56 / 0.62, 0.62);
    const junior = person(use, LOOKS.junior, FMT.seat[0], FMT.seat[2], 0, 0.48);
    const putty = part(use, ball(0.022), '#fdd835', 0, 0, 0, { outline: false });
    const heldPegs = PEGS.map((col) => peg(use, col));
    const pegThere = new THREE.Vector3();
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const q = new THREE.Vector3();
    const tablePt = (x: number, z: number, dy = 0.03) => q.set(x, top + dy, z);
    const goodRest = v3(0.15, top + 0.02, 0.3);
    const weakRest = v3(FMT.cushion[0], top + 0.05, FMT.cushion[1]);
    const restTweezers = () => {
      tw.position.set(FMT.beads[0] - 0.02, top + 0.004, FMT.beads[1] - 0.06);
      tw.rotation.set(0, 0.3, 0);
    };
    restTweezers();

    /** The patient (and the junior's hands, when the lead is coaching) through a round of hand training. */
    const runTraining = (fig: Figure, s: Spot, t: number) => {
      const ph = phaseOf(s);
      const sd = ph * 7.1;
      const bt = handBeat(t, ph);
      const { pegs: up, beads } = handCounts(bt);
      pegs.forEach((p, i) => (p.visible = i < up));
      cupBeads.forEach((m, i) => (m.visible = i < beads));
      const trip = tripOf(t, sd);
      const going = ((t * 1 + sd) % 1 + 1) % 1 < 0.5;
      // The good hand (their right, the table's +x side).
      let good: THREE.Vector3 | null = goodRest;
      let weak: THREE.Vector3 | null = weakRest;
      heldPegs.forEach((h) => (h.visible = false));
      putty.visible = false;
      restTweezers();
      if (amountOf(bt, 'pegs') > 0.5) {
        const [hx, hz] = holeAt(Math.min(15, up));
        a.set(FMT.well[0] + 0.03, top + 0.03, FMT.well[1]);
        b.set(hx, top + 0.05, hz);
        good = pegThere.lerpVectors(a, b, trip).setY(top + 0.04 + 0.05 * Math.sin(Math.PI * trip));
        const hp = heldPegs[up % 4];
        hp.visible = going;
        hp.position.copy(good).add(v3(0, -0.02, 0));
      } else if (amountOf(bt, 'guide') > 0.5) {
        const [hx, hz] = holeAt(5);
        a.set(FMT.cushion[0], top + 0.05, FMT.cushion[1]);
        b.set(hx, top + 0.05, hz);
        weak = pegThere.lerpVectors(a, b, guidedOf(t, sd)).setY(top + 0.05 + 0.03 * Math.sin(Math.PI * guidedOf(t, sd)));
      } else if (amountOf(bt, 'putty') > 0.5) {
        good = tablePt(0.12, 0.28, 0.05);
        putty.visible = true;
        putty.position.copy(good).add(v3(0, -0.012, 0));
        const sq = pulse(t, 1.1, sd + 0.3, 2);
        putty.scale.set(1 + 0.4 * sq, 1 - 0.35 * sq, 1 + 0.3 * sq);
      } else if (amountOf(bt, 'button') > 0.5) {
        good = tablePt(FMT.buttons[0] - 0.02 + 0.015 * wave(t, 0.8, sd), FMT.buttons[1] + 0.06, 0.08);
      } else if (amountOf(bt, 'beads') > 0.5) {
        const u = tripOf(t * 0.6, sd);
        a.set(FMT.beads[0], top + 0.05, FMT.beads[1]);
        b.set(FMT.cup[0], top + 0.08, FMT.cup[1]);
        good = pegThere.lerpVectors(a, b, u);
        tw.position.copy(good).add(v3(-0.03, -0.02, -0.04));
        tw.rotation.set(0.5, 0.6, 0);
      }
      fig.armR(good);
      fig.armL(weak);
      fig.head.rotation.x = 0.35 - 0.3 * amountOf(bt, 'praise');
      return bt;
    };

    out.animate = (t) => {
      const doTrain = posed(trainAt, t);
      const doAssess = posed(assess, t);
      const doCoach = posed(coach, t);
      patient.root.visible = doTrain || doCoach;
      junior.root.visible = doCoach;
      child.root.visible = doAssess;
      heldPegs.forEach((h) => (h.visible = false));
      putty.visible = false;
      trainSet.visible = !doAssess;
      test.visible = doAssess;
      if (doTrain || doCoach) {
        const s = doCoach ? coach : trainAt;
        runTraining(patient, s, t);
        if (doCoach) {
          // The junior's hands go where a therapist's would at this table.
          const k = otKey('otHand', t, phaseOf(coach));
          junior.armL(inFrame(trainAt, k.l, a));
          junior.armR(inFrame(trainAt, k.r, b));
          junior.head.rotation.x = 0.4;
        }
      } else if (!doAssess) {
        pegs.forEach((p, i) => (p.visible = i < 6 + (n % 5)));
        cupBeads.forEach((m, i) => (m.visible = i < 2));
      }
      if (doAssess) {
        const ph = phaseOf(assess);
        const sd = ph * 7.1;
        const bt = assessBeat(t, ph);
        const inn = assessPegs(bt);
        tPegs.forEach((p, i) => (p.visible = i < inn));
        const timing = amountOf(bt, 'time') > 0.5;
        child.root.rotation.y = Math.PI + 0.05 * wave(t, 0.3, sd);
        // The child's right hand (the table's +x side) between the dish and the holes while timed.
        if (timing) {
          const u = tripOf(t * 1.2, sd);
          a.set(tx + 0.05, top + 0.05, tz + 0.03);
          const hole = Math.min(8, inn);
          b.set(tx - 0.03 + (hole % 3) * 0.03, top + 0.05, tz - 0.03 + Math.floor(hole / 3) * 0.025);
          child.armR(pegThere.lerpVectors(a, b, u).setY(top + 0.05 + 0.04 * Math.sin(Math.PI * u)));
          child.armL(tablePt(tx - 0.1, tz + 0.05, 0.02));
        } else if (amountOf(bt, 'sticker') > 0.5) {
          const k = otKey('otAssess', t, ph);
          child.armR(inFrame(assess, k.r, a).add(v3(0, 0, 0.04)));
          child.armL(null);
        } else {
          child.armR(null);
          child.armL(null);
        }
        child.head.rotation.x = timing ? 0.45 : 0.05;
        // The stopwatch in the therapist's left hand while timing, else on the table.
        if (timing) {
          const k = otKey('otAssess', t, ph);
          inFrame(assess, k.l, a);
          watch.position.copy(a).add(v3(0, 0.02, 0));
          watch.rotation.set(-0.9, 0, 0);
        } else {
          watch.position.set(0.15, top + 0.008, -0.02);
          watch.rotation.set(0, 0, 0);
        }
      }
    };
  },

  /**
   * The splint table (손 재활 · 보조기 제작 테이블): the 70℃ splint pan at the therapist's right (its
   * water steaming, the thermoplastic sheet in it, the temperature lit when it's on), a foam forearm
   * wedge, the heat gun in its holder, the big splint scissors, velcro rolls and a traced hand pattern,
   * finished splints on a pegboard behind with the chart of kinds. Making a splint (otMakeSplint): sat
   * behind it, the patient's forearm across on the wedge — measured, the sheet lifted out, draped on,
   * moulded round the wrist and palm, trimmed, strapped, the fit checked.
   */
  otSplintTable(g, _W, _D, _c, _def, ctx, out) {
    const n = splintCount++;
    const top = SPL.top;
    therapyTable(g, -0.8, 0.8, -0.14, 0.34, top, '#dcc7a1');
    therapyStool(g, SPL.seat[0], SPL.seat[2], '#8d6e63');
    clientChair(g, SPL.chair[0], SPL.chair[1], Math.PI, '#4db6ac');
    // The splint pan: a steel water bath with its panel, the lid propped behind.
    const [px, pz] = SPL.pan;
    part(g, rbox(0.36, 0.11, 0.26, 0.02), STEEL, px, top + 0.055, pz);
    part(g, box(0.32, 0.004, 0.22), '#90a4ae', px, top + 0.106, pz, { outline: false });
    glass(g, box(0.32, 0.004, 0.22), px, top + 0.1, pz, WATER);
    const sheet = part(g, box(0.18, 0.004, 0.12), '#ffe0cc', px, top + 0.103, pz, { outline: false });
    part(g, rbox(0.34, 0.02, 0.22, 0.01), '#b0bec5', px, top + 0.2, pz - 0.15, { rx: -1.2 });
    part(g, rbox(0.14, 0.05, 0.012, 0.004), '#263238', px, top + 0.05, pz + 0.132);
    const display = litScreen(g, painted('otPanDisplay', 96, 40, paintPanDisplay), 0.1, 0.04, px, top + 0.05, pz + 0.139);
    out.screen = display;
    part(g, box(0.02, 0.006, 0.18), '#9e9e9e', px + 0.21, top + 0.003, pz + 0.04, { ry: 0.2 });
    // Steam over the water (in use).
    const steam = group(g);
    const steamMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false });
    const puffs: THREE.Mesh[] = [];
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(ball(0.03), steamMat);
      m.userData.ownMaterial = i === 0;
      steam.add(m);
      puffs.push(m);
    }
    // The forearm wedge.
    part(g, rbox(0.14, 0.05, 0.24, 0.02), '#80cbc4', SPL.rest[0], top + 0.025, SPL.rest[1], { rx: 0.08 });
    // Tools: the heat gun in its holder, the scissors, velcro, the pattern.
    part(g, rbox(0.07, 0.06, 0.08, 0.01), '#37474f', 0.5, top + 0.03, -0.04);
    const gun = group(g, 0.5, top + 0.06, -0.04);
    part(gun, cyl(0.026, 0.03, 0.14, 12), ORANGE, 0, 0.0, 0.03, { rx: Math.PI / 2 });
    part(gun, rbox(0.03, 0.09, 0.035, 0.01), BLACK, 0, 0.04, -0.03, { rx: 0.2 });
    for (const sx of [-1, 1]) part(g, box(0.012, 0.004, 0.13), '#cfd8dc', 0.36 + sx * 0.01, top + 0.003, 0.18, { ry: 0.3 + sx * 0.12, outline: false });
    part(g, ring(0.018, 0.005), BLACK, 0.33, top + 0.005, 0.25, { rx: Math.PI / 2 });
    part(g, ring(0.018, 0.005), BLACK, 0.35, top + 0.005, 0.27, { rx: Math.PI / 2 });
    part(g, cyl(0.04, 0.04, 0.03, 16), '#1565c0', 0.66, top + 0.015, 0.2);
    part(g, cyl(0.04, 0.04, 0.03, 16), '#d7ccc8', 0.66, top + 0.045, 0.2);
    part(g, cyl(0.015, 0.015, 0.062, 10), '#fafafa', 0.66, top + 0.031, 0.2, { outline: false });
    part(g, box(0.16, 0.003, 0.22), PAPER, 0.62, top + 0.002, -0.02, { outline: false });
    part(g, cyl(0.003, 0.003, 0.12, 6), '#ffb300', 0.58, top + 0.006, 0.0, { rz: Math.PI / 2, ry: 0.4, outline: false });
    // The finished splints behind on their board, and the chart of kinds.
    const back = ctx.againstWall ? -0.47 : -0.3;
    const board = group(g, 0, 0, back);
    part(board, rbox(1.3, 0.5, 0.02, 0.01), '#efebe9', 0, 1.22, 0);
    for (let i = 0; i < 9; i++) for (let j = 0; j < 4; j++) part(board, cyl(0.004, 0.004, 0.002, 6), '#bcaaa4', -0.6 + i * 0.15, 1.04 + j * 0.12, 0.011, { rx: Math.PI / 2, outline: false });
    const splintCols = ['#ffe0cc', '#ffccbc', '#e1f5fe'];
    for (let i = 0; i < 3; i++) {
      const s = group(board, -0.52 + i * 0.17, 1.2, 0.03);
      part(s, rbox(0.075, 0.2 - i * 0.03, 0.03, 0.015), splintCols[i], 0, 0, 0);
      part(s, box(0.085, 0.015, 0.035), '#1565c0', 0, 0.04, 0, { outline: false });
      part(s, box(0.085, 0.015, 0.035), '#1565c0', 0, -0.04, 0, { outline: false });
    }
    picture(board, painted('otSplintChart', 256, 128, paintSplintChart), 0.6, 0.3, 0.3, 1.22, 0.012);
    label(board, n % 2 === 0 ? '보조기 제작 · 화상 주의' : '손 재활 클리닉', 0.5, 0.06, 0, 1.52, 0.012, ORANGE, '#ffffff');

    const workAt = marker(g, SPL.wrist[0], SPL.wrist[1], SPL.wrist[2]);
    const make = sitAt(g, SPL.seat, 0, 'otSplint', workAt);
    out.spots = { '*': make };
    out.work = workAt;

    // In use: the patient's forearm on the wedge, the splint on it as it's made.
    const use = group(g);
    out.inUse = use;
    use.add(steam);
    const patient = person(use, n % 2 === 0 ? LOOKS.patientF : LOOKS.patientM, SPL.chair[0], SPL.chair[1], Math.PI, 0.46);
    const splint = group(use);
    const slab = part(splint, rbox(0.085, 0.016, 1, 0.006), '#ffe0cc', 0, -0.038, 0);
    const wallL = part(splint, rbox(0.012, 0.04, 1, 0.005), '#ffe0cc', 0.045, -0.022, 0, { rz: 0.35 });
    const wallR = part(splint, rbox(0.012, 0.04, 1, 0.005), '#ffe0cc', -0.045, -0.022, 0, { rz: -0.35 });
    const palm = part(splint, rbox(0.1, 0.016, 0.1, 0.006), '#ffe0cc', 0, -0.034, 0);
    const straps = [0, 1].map(() => part(splint, ring(0.05, 0.007), '#1565c0', 0, 0, 0));
    const carried = part(use, box(0.18, 0.004, 0.12), '#ffe0cc', 0, 0, 0, { outline: false });
    const hand = new THREE.Vector3();
    const elbow = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const wrist = v3(SPL.wrist[0], SPL.wrist[1], SPL.wrist[2]);
    out.animate = (t) => {
      const on = posed(make, t);
      patient.root.visible = on;
      steam.visible = on;
      puffs.forEach((p, i) => {
        const u = ((t * 0.4 + i / 5) % 1 + 1) % 1;
        p.position.set(px - 0.1 + i * 0.05, top + 0.12 + u * 0.18, pz + 0.02 * Math.sin(t + i));
        p.scale.setScalar(0.6 + u);
      });
      if (!on) {
        sheet.visible = true;
        return;
      }
      const ph = phaseOf(make);
      const sd = ph * 7.1;
      const bt = splintBeat(t, ph);
      const state = splintState(bt);
      // The forearm on the wedge; lifted a little when the fit's checked.
      const lift = 0.04 * amountOf(bt, 'check') * pulse(t, 0.5, sd, 2);
      patient.armR(a.copy(wrist).add(v3(0, lift, 0)));
      patient.armL(null);
      patient.head.rotation.x = 0.3;
      patient.at('handR', hand);
      patient.at('elbowR', elbow);
      dir.subVectors(hand, elbow);
      const len = dir.length();
      dir.normalize();
      sheet.visible = state === 0;
      carried.visible = state === 1;
      splint.visible = state >= 2;
      straps.forEach((s) => (s.visible = state === 3));
      if (state === 1) {
        const k = otKey('otSplint', t, ph);
        inFrame(make, k.l, a);
        inFrame(make, k.r, b);
        carried.position.lerpVectors(a, b, 0.5).add(v3(0, -0.01, 0));
        carried.rotation.set(0, Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2, 0);
      }
      if (state >= 2) {
        splint.position.copy(elbow).addScaledVector(dir, len * 0.55);
        splint.quaternion.setFromUnitVectors(Z, dir);
        const L = len * 0.8;
        slab.scale.set(1, 1, L);
        wallL.scale.set(1, 1, L * 0.9);
        wallR.scale.set(1, 1, L * 0.9);
        palm.position.set(0, -0.034, L / 2 + 0.06);
        straps[0].position.set(0, -0.005, -L * 0.3);
        straps[1].position.set(0, -0.005, L * 0.25);
      }
    };
  },

  /**
   * The mirror box table (거울 치료 테이블): a small table, the stool behind and the client's chair
   * across, and on it the mirror box — a birch box open to the client, its side a mirror facing their
   * good hand, the weak one hidden behind it (seen in the glass, it seems to move as the good one does).
   * A soft brush, a spiky ball and the note pad beside it. Mirror therapy (otMirrorTherapy): sat
   * behind it — the fist opened and closed for them to copy, fingers tapped in time, the good hand
   * brushed, a ball rolled under the palm, a note.
   */
  otMirrorBox(g, _W, _D, _c, _def, _ctx, out) {
    const top = MIR.top;
    therapyTable(g, -0.4, 0.4, -0.12, 0.3, top, BIRCH);
    therapyStool(g, MIR.seat[0], MIR.seat[2], '#7e57c2');
    clientChair(g, MIR.chair[0], MIR.chair[1], Math.PI, '#9575cd');
    // The box: the compartment at the table's -x, open to the client, its +x side the mirror.
    const [mx, mz] = MIR.box;
    const bz0 = mz - 0.14;
    const bz1 = mz + 0.16;
    const h = 0.26;
    part(g, rbox(0.23, 0.014, bz1 - bz0, 0.006), BIRCH_DARK, mx - 0.11, top + h, (bz0 + bz1) / 2);
    part(g, rbox(0.014, h, bz1 - bz0, 0.006), BIRCH_DARK, mx - 0.22, top + h / 2, (bz0 + bz1) / 2);
    part(g, rbox(0.23, h, 0.014, 0.006), BIRCH_DARK, mx - 0.11, top + h / 2, bz0);
    part(g, rbox(0.016, h + 0.02, bz1 - bz0 + 0.02, 0.006), '#8d6e63', mx, top + h / 2, (bz0 + bz1) / 2);
    const mirrorMat = new THREE.MeshToonMaterial({ color: '#dfeef7', transparent: true, opacity: 0.45, depthWrite: false });
    const mirror = glass(g, box(0.004, h - 0.02, bz1 - bz0 - 0.02), mx + 0.01, top + h / 2, (bz0 + bz1) / 2, mirrorMat);
    mirror.userData.ownMaterial = true;
    part(g, box(0.003, 0.02, bz1 - bz0 - 0.04), '#ffffff', mx + 0.013, top + h - 0.04, (bz0 + bz1) / 2 - 0.01, { outline: false });
    label(g, '거울 치료', 0.16, 0.04, mx - 0.11, top + h / 2 + 0.04, bz0 - 0.009, BIRCH_DARK, '#ffffff', Math.PI);
    // A soft brush, a spiky ball, the note pad, a cup of textured cards.
    const brush = group(g, 0.28, top + 0.01, 0.0, 0.4);
    part(brush, rbox(0.12, 0.016, 0.02, 0.006), '#8d6e63', 0, 0, 0);
    part(brush, rbox(0.05, 0.025, 0.03, 0.01), '#f5f5f5', 0.07, 0.006, 0);
    const spiky = part(g, ball(0.03), '#ef5350', 0.3, top + 0.03, 0.2);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      part(spiky, cyl(0.002, 0.006, 0.014, 5), '#ef5350', Math.cos(a) * 0.028, Math.sin(a) * 0.028, 0, { rz: a - Math.PI / 2, outline: false });
    }
    const [padX, padZ] = MIR.pad;
    part(g, rbox(0.12, 0.006, 0.16, 0.004), '#795548', padX, top + 0.003, padZ);
    flat(g, painted('otSessionNote', 128, 170, paintSessionNote), 0.11, 0.14, padX, top + 0.0075, padZ, Math.PI);

    const workAt = marker(g, MIR.hand[0], MIR.hand[1], MIR.hand[2]);
    const sit = sitAt(g, MIR.seat, 0, 'otMirror', workAt);
    out.spots = { '*': sit };
    out.work = workAt;

    const use = group(g);
    out.inUse = use;
    const client = person(use, LOOKS.patientM, MIR.chair[0], MIR.chair[1], Math.PI, 0.46);
    const heldBrush = group(use);
    part(heldBrush, rbox(0.12, 0.016, 0.02, 0.006), '#8d6e63', 0, 0, 0);
    part(heldBrush, rbox(0.05, 0.025, 0.03, 0.01), '#f5f5f5', 0.07, -0.01, 0);
    const a = new THREE.Vector3();
    const good = new THREE.Vector3();
    const weak = new THREE.Vector3();
    out.animate = (t) => {
      const on = posed(sit, t);
      client.root.visible = on;
      heldBrush.visible = false;
      brush.visible = true;
      if (!on) {
        spiky.position.set(0.3, top + 0.03, 0.2);
        return;
      }
      const ph = phaseOf(sit);
      const sd = ph * 7.1;
      const bt = mirrorBeat(t, ph);
      const m = mirrorHand(bt, t, sd);
      good.set(MIR.hand[0] + m.dx, MIR.hand[1] + m.dy, MIR.hand[2] + m.dz);
      // The hidden hand mirrors the good one across the glass (what the client sees in the mirror).
      weak.set(2 * mx - good.x, good.y, good.z);
      client.armR(good);
      client.armL(weak);
      const fist = 1 - 0.3 * m.close;
      client.handR.scale.set(fist, fist, fist);
      client.handL.scale.set(fist, fist, fist);
      // Looking into the mirror, at their good hand's reflection.
      client.head.rotation.set(0.35, -0.25, 0);
      const roll = amountOf(bt, 'roll');
      spiky.position.set(roll > 0.3 ? good.x : 0.3, top + 0.03, roll > 0.3 ? good.z : 0.2);
      if (amountOf(bt, 'touch') > 0.5) {
        const k = otKey('otMirror', t, ph);
        heldBrush.visible = true;
        brush.visible = false;
        heldBrush.position.copy(inFrame(sit, k.r, a)).add(v3(0, 0.02, 0));
        heldBrush.rotation.set(0, Math.PI / 2 + 0.3, 0);
      }
    };
  },

  /**
   * The ADL room (일상생활 훈련실): a corner fitted out as a bedroom and a bathroom — a low care bed
   * with its pillow and folded blanket, a transfer pole by its edge, a mock bathroom (a toilet with
   * its grab bars, a basin with a lever tap and a tilted mirror, tiles behind and a non-slip mat), a
   * shirt on a stand, the dressing aids laid on the bed (sock aid, long shoehorn, reacher, button hook)
   * and the step card on the wall. Training (otAdlTransfer): stood before a patient on the bed's edge
   * — crouched to their feet with the sock aid, pointing them through the buttons, hands on their
   * shoulders (하나, 둘, 셋), the gait belt held as they stand to the pole, guarded, lowered back down.
   */
  otAdlRoom(g, _W, _D, _c, _def, _ctx, out) {
    // The floor: a rug by the bed, a non-slip mat in the bathroom.
    part(g, box(0.9, 0.006, 0.7), '#c5e1a5', 0.0, 0.003, 0.35, { outline: false });
    part(g, box(0.82, 0.006, 0.8), '#b3e5fc', 0.56, 0.004, -0.55, { outline: false });
    for (let i = 0; i < 6; i++) part(g, box(0.8, 0.002, 0.01), '#81d4fa', 0.56, 0.008, -0.9 + i * 0.14, { outline: false });
    // The bed: frame, mattress, pillow, folded blanket, a rail on the far side, casters.
    const bx0 = -0.95;
    const bx1 = -0.02;
    const bz0 = -0.95;
    const bz1 = 0.6;
    const bxc = (bx0 + bx1) / 2;
    const bzc = (bz0 + bz1) / 2;
    part(g, rbox(bx1 - bx0, 0.1, bz1 - bz0, 0.02), '#d7ccc8', bxc, 0.3, bzc);
    part(g, rbox(bx1 - bx0 - 0.04, 0.12, bz1 - bz0 - 0.04, 0.05), '#fafafa', bxc, ADL.seat - 0.06, bzc);
    part(g, rbox(bx1 - bx0 + 0.02, 0.6, 0.05, 0.02), '#a1887f', bxc, 0.5, bz0 - 0.02);
    part(g, rbox(bx1 - bx0 + 0.02, 0.3, 0.05, 0.02), '#a1887f', bxc, 0.38, bz1 + 0.02);
    part(g, rbox(0.5, 0.1, 0.3, 0.05), '#e3f2fd', bxc, ADL.seat + 0.05, bz0 + 0.22);
    part(g, rbox(0.7, 0.07, 0.35, 0.03), '#80cbc4', bxc - 0.05, ADL.seat + 0.035, bz1 - 0.25);
    for (const z of [bz0 + 0.25, bz0 + 0.75]) {
      part(g, cyl(0.012, 0.012, 0.25, 8), CHROME, bx0 + 0.02, ADL.seat + 0.1, z, { outline: false });
    }
    rod(g, v3(bx0 + 0.02, ADL.seat + 0.22, bz0 + 0.1), v3(bx0 + 0.02, ADL.seat + 0.22, bz0 + 0.9), 0.014, CHROME);
    for (const x of [bx0 + 0.08, bx1 - 0.08]) for (const z of [bz0 + 0.08, bz1 - 0.08]) {
      part(g, cyl(0.015, 0.015, 0.2, 8), '#9e9e9e', x, 0.15, z, { outline: false });
      part(g, cyl(0.035, 0.035, 0.03, 12), BLACK, x, 0.035, z, { rx: Math.PI / 2 });
    }
    // The dressing aids on the bed: the sock aid, a long shoehorn, a reacher, a button hook.
    const aids = group(g, -0.55, ADL.seat + 0.005, 0.1);
    part(aids, rbox(0.09, 0.02, 0.16, 0.02), '#ffffff', 0, 0.01, 0);
    rod(aids, v3(-0.03, 0.02, -0.08), v3(-0.06, 0.012, -0.32), 0.004, '#1565c0');
    rod(aids, v3(0.03, 0.02, -0.08), v3(0.06, 0.012, -0.32), 0.004, '#1565c0');
    part(aids, box(0.03, 0.01, 0.55), '#455a64', 0.17, 0.006, -0.05, { ry: 0.1, outline: false });
    part(aids, box(0.02, 0.012, 0.6), '#ef6c00', 0.27, 0.006, -0.12, { ry: -0.08 });
    part(aids, rbox(0.03, 0.02, 0.09, 0.01), '#fdd835', -0.15, 0.01, 0.06);
    const sockAid = aids.children[0] as THREE.Mesh;
    // The transfer pole by the bed's edge.
    const [plx, plz] = ADL.pole;
    part(g, cyl(0.17, 0.19, 0.03, 20), '#78909c', plx, 0.015, plz);
    part(g, cyl(0.02, 0.02, 1.3, 12), CHROME, plx, 0.68, plz, { outline: false });
    part(g, ring(0.09, 0.016, Math.PI), '#ef6c00', plx, 1.0, plz + 0.0, { ry: Math.PI / 2 });
    part(g, cyl(0.028, 0.028, 0.18, 12), '#ef6c00', plx, 0.95, plz, { outline: false });
    // The mock bathroom: tiles on the back panel, a basin with a lever tap and a tilted mirror, the toilet and its bars.
    const tiles = group(g, 0.56, 0, -0.97);
    part(tiles, box(0.82, 1.5, 0.03), '#e0f7fa', 0, 0.75, 0);
    for (let i = 1; i < 8; i++) part(tiles, box(0.82, 0.004, 0.032), '#b2ebf2', 0, i * 0.19, 0, { outline: false });
    for (let i = 1; i < 5; i++) part(tiles, box(0.004, 1.5, 0.032), '#b2ebf2', -0.41 + i * 0.164, 0.75, 0, { outline: false });
    part(g, rbox(0.3, 0.12, 0.22, 0.04), '#fafafa', 0.32, 0.78, -0.84);
    part(g, cyl(0.1, 0.06, 0.06, 18), '#eceff1', 0.32, 0.82, -0.84, { outline: false });
    part(g, cyl(0.012, 0.012, 0.1, 8), CHROME, 0.32, 0.9, -0.93, { outline: false });
    part(g, box(0.1, 0.012, 0.014), CHROME, 0.32, 0.95, -0.9, { outline: false });
    part(g, rbox(0.3, 0.4, 0.02, 0.01), '#cfd8dc', 0.32, 1.25, -0.94, { rx: 0.15 });
    glass(g, box(0.27, 0.37, 0.004), 0.32, 1.25, -0.928, undefined, 0.15);
    const loo = group(g, 0.75, 0, -0.72);
    part(loo, rbox(0.36, 0.38, 0.2, 0.05), '#fafafa', 0, 0.62, -0.17);
    part(loo, rbox(0.24, 0.36, 0.3, 0.08), '#fafafa', 0, 0.18, 0.05);
    part(loo, cyl(0.19, 0.17, 0.05, 20), '#fafafa', 0, 0.4, 0.1);
    part(loo, cyl(0.17, 0.17, 0.02, 20), '#eceff1', 0, 0.43, 0.1, { outline: false });
    // The grab bars: an L on the side, a fold-down on the other.
    rod(loo, v3(0.24, 0.7, -0.2), v3(0.24, 0.7, 0.3), 0.016, '#ef6c00');
    rod(loo, v3(0.24, 0.7, -0.2), v3(0.24, 1.3, -0.2), 0.016, '#ef6c00');
    rod(loo, v3(-0.25, 0.72, -0.18), v3(-0.25, 0.72, 0.3), 0.016, '#ef6c00');
    part(loo, cyl(0.03, 0.03, 0.06, 10), '#bdbdbd', 0.26, 0.7, -0.22, { rz: Math.PI / 2, outline: false });
    // A shirt on its stand for the buttons.
    const stand = group(g, 0.85, 0, 0.75);
    part(stand, cyl(0.12, 0.13, 0.025, 16), '#90a4ae', 0, 0.012, 0);
    part(stand, cyl(0.012, 0.012, 1.3, 8), STEEL, 0, 0.66, 0, { outline: false });
    part(stand, rbox(0.34, 0.42, 0.06, 0.04), '#e3f2fd', 0, 1.06, 0.04);
    part(stand, box(0.02, 0.4, 0.065), '#bbdefb', 0, 1.06, 0.04, { outline: false });
    for (let i = 0; i < 4; i++) part(stand, cyl(0.01, 0.01, 0.006, 10), '#fafafa', 0.015, 1.2 - i * 0.09, 0.075, { rx: Math.PI / 2, outline: false });
    // The step card and the room's sign on the bed's wall.
    picture(g, painted('otAdlSteps', 256, 96, paintAdlSteps), 0.7, 0.26, bxc, 1.15, -0.97);
    label(g, '일상생활 훈련실 (ADL)', 0.7, 0.08, bxc, 1.36, -0.97, '#26a69a', '#ffffff');

    const workAt = marker(g, ADL.client[0] + 0.15, 0.7, ADL.client[1]);
    const train = standAt(g, ADL.stand[0], ADL.stand[1], -Math.PI / 2, 'otAdl', workAt);
    out.spots = { '*': train };
    out.work = workAt;

    const use = group(g);
    out.inUse = use;
    const seated = person(use, LOOKS.patientAdl, ADL.client[0], ADL.client[1], Math.PI / 2, ADL.seat);
    const stood = person(use, LOOKS.patientAdl, ADL.up[0], ADL.up[1], Math.PI / 2);
    const heldAid = group(use);
    part(heldAid, rbox(0.09, 0.02, 0.16, 0.02), '#ffffff', 0, 0, 0);
    const cordL = limb(use, 0.004, '#1565c0');
    const cordR = limb(use, 0.004, '#1565c0');
    const cords = use.children.slice(-2);
    const hook = part(use, rbox(0.02, 0.02, 0.08, 0.008), '#fdd835', 0, 0, 0);
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const pole = v3(plx, 0.98, plz + 0.04);
    out.animate = (t) => {
      const on = posed(train, t);
      seated.root.visible = false;
      stood.root.visible = false;
      heldAid.visible = false;
      hook.visible = false;
      cords.forEach((c) => (c.visible = false));
      sockAid.visible = true;
      if (!on) return;
      const ph = phaseOf(train);
      const sd = ph * 7.1;
      const bt = adlBeat(t, ph);
      const up = adlStanding(bt);
      const fig = up ? stood : seated;
      fig.root.visible = true;
      fig.head.rotation.x = up ? 0.15 : 0.3;
      if (up) {
        // Up on their feet, a hand on the pole, the other at their side.
        fig.armL(pole);
        fig.armR(null);
        return;
      }
      const [cx, cz] = ADL.client;
      if (amountOf(bt, 'sock') > 0.5) {
        // The sock aid at the right foot, pulled up by its cords.
        sockAid.visible = false;
        heldAid.visible = true;
        const pull = 0.5 + 0.5 * wave(t, 0.4, sd);
        heldAid.position.set(ADL.feet - 0.02, 0.1 + 0.05 * pull, cz - 0.1);
        heldAid.rotation.set(-0.9, Math.PI / 2, 0);
        a.set(cx + 0.28, 0.62 + 0.1 * pull, cz + 0.08);
        b.set(cx + 0.28, 0.62 + 0.1 * pull, cz - 0.08);
        fig.armL(a);
        fig.armR(b);
        cords.forEach((c) => (c.visible = true));
        cordL(a, heldAid.position);
        cordR(b, heldAid.position);
        fig.head.rotation.x = 0.55;
      } else if (amountOf(bt, 'button') > 0.5) {
        // The button hook at the shirt's front.
        a.set(cx + 0.18, 0.88 - 0.04 * ((t * 0.5 + sd) % 1), cz - 0.02);
        b.set(cx + 0.18, 0.84, cz + 0.06);
        fig.armR(a);
        fig.armL(b);
        hook.visible = true;
        hook.position.copy(a).add(v3(0.02, 0, 0));
        hook.rotation.set(0, Math.PI / 2, 0.4);
        fig.head.rotation.x = 0.5;
      } else {
        // Ready to stand: a hand on the pole, the other pushing on the bed.
        fig.armL(pole);
        fig.armR(a.set(cx - 0.02, ADL.seat + 0.02, cz + 0.22));
      }
    };
  },

  /**
   * The cognitive table (인지 재활 테이블): an oak table set for a session with an older patient — 화투
   * cards laid face down in a grid for 짝 맞추기, a 무궁화 jigsaw half done with its pieces in a tray,
   * the clock-drawing sheet and a pencil, the 오늘은 orientation calendar, a desk clock and a tablet
   * on its stand with the memory game (lit in use). Cognitive training (otCognitive): sat behind it,
   * the patient across — a card turned and its pair found, a puzzle piece handed over and fitted, the
   * clock drawn with the numbers pointed out, praise.
   */
  otCognitiveTable(g, _W, _D, _c, _def, _ctx, out) {
    const n = cogCount++;
    const top = COG.top;
    therapyTable(g, -0.8, 0.8, -0.14, 0.34, top, OAK);
    therapyStool(g, COG.seat[0], COG.seat[2], '#6d4c41');
    clientChair(g, COG.chair[0], COG.chair[1], Math.PI, '#a5d6a7');
    // The 화투 grid on a felt mat.
    part(g, rbox(0.3, 0.006, 0.3, 0.004), '#2e7d32', COG.grid[0], top + 0.003, COG.grid[1]);
    const backTex = painted('otHwatuBack', 64, 96, paintHwatuBack);
    const cards: Array<{ back: THREE.Mesh; face: THREE.Mesh }> = [];
    for (let i = 0; i < 12; i++) {
      const [x, z] = cardAt(i);
      const back = flat(g, backTex, 0.042, 0.064, x, top + 0.008, z, Math.PI);
      const face = flat(g, hwatuFace(0), 0.042, 0.064, x, top + 0.009, z, Math.PI);
      face.visible = false;
      cards.push({ back, face });
    }
    // The puzzle: a board, its picture showing where pieces are in, the tray of pieces.
    const [qx, qz] = COG.puzzle;
    part(g, rbox(0.26, 0.012, 0.2, 0.004), '#d7ccc8', qx, top + 0.006, qz);
    flat(g, painted('otPuzzle', 128, 96, paintPuzzle), 0.24, 0.18, qx, top + 0.013, qz, Math.PI);
    const holes: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) holes.push(part(g, box(0.06, 0.003, 0.06), '#a1887f', qx - 0.06 + i * 0.06, top + 0.0145, qz + 0.06, { outline: false }));
    const [trx, trz] = COG.tray;
    part(g, rbox(0.16, 0.02, 0.1, 0.008), '#fafafa', trx, top + 0.01, trz);
    const rr = seeded(31 + n);
    for (let i = 0; i < 5; i++) part(g, box(0.05, 0.006, 0.05), ['#f8bbd0', '#81d4fa', '#66bb6a'][i % 3], trx - 0.05 + rr() * 0.1, top + 0.024, trz - 0.025 + rr() * 0.05, { ry: rr() * 3, outline: false });
    // The clock-drawing sheet and a pencil.
    const [sx, sz] = COG.sheet;
    flat(g, painted('otClockSheet', 128, 128, paintClock), 0.15, 0.15, sx, top + 0.004, sz, Math.PI);
    part(g, cyl(0.004, 0.004, 0.13, 6), '#ffb300', sx + 0.11, top + 0.006, sz - 0.02, { rz: Math.PI / 2, ry: 0.5, outline: false });
    // The orientation calendar, a desk clock, the tablet on its stand.
    const cal = group(g, -0.6, top, -0.04, 0.25);
    part(cal, rbox(0.17, 0.13, 0.03, 0.01), '#ffe0b2', 0, 0.065, 0, { rx: -0.2 });
    picture(cal, painted('otCalendar', 128, 96, paintCalendar), 0.15, 0.11, 0, 0.067, 0.018, '#ffffff', 0, -0.2);
    const clk = group(g, -0.7, top, 0.18, 0.4);
    part(clk, cyl(0.06, 0.06, 0.03, 24), '#5d4037', 0, 0.07, 0, { rx: Math.PI / 2 });
    part(clk, cyl(0.052, 0.052, 0.004, 24), '#fffde7', 0, 0.07, 0.016, { rx: Math.PI / 2, outline: false });
    part(clk, box(0.004, 0.04, 0.003), BLACK, 0, 0.085, 0.019, { outline: false });
    part(clk, box(0.03, 0.004, 0.003), BLACK, 0.012, 0.07, 0.019, { outline: false });
    part(clk, box(0.06, 0.03, 0.04), '#5d4037', 0, 0.015, 0);
    const tab = group(g, 0.66, top, 0.12, Math.PI + 0.35);
    part(tab, box(0.08, 0.02, 0.06), '#90a4ae', 0, 0.01, -0.03);
    part(tab, rbox(0.22, 0.16, 0.012, 0.01), BLACK, 0, 0.1, 0, { rx: -0.25 });
    const screen = litScreen(tab, painted('otTablet', 160, 110, paintTablet), 0.2, 0.14, 0, 0.1, 0.007);
    screen.rotation.x = -0.25;
    out.screen = screen;

    const workAt = marker(g, COG.grid[0], top + 0.02, COG.grid[1]);
    const sit = sitAt(g, COG.seat, 0, 'otCognitive', workAt);
    out.spots = { '*': sit };
    out.work = workAt;

    const use = group(g);
    out.inUse = use;
    const client = person(use, n % 2 === 0 ? LOOKS.grandpa : LOOKS.grandma, COG.chair[0], COG.chair[1], Math.PI, 0.46);
    const piece = part(use, box(0.05, 0.006, 0.05), '#f8bbd0', 0, 0, 0, { outline: false });
    const a = new THREE.Vector3();
    const q = new THREE.Vector3();
    out.animate = (t) => {
      const on = posed(sit, t);
      client.root.visible = on;
      piece.visible = false;
      if (!on) {
        cards.forEach((c) => {
          c.back.visible = true;
          c.face.visible = false;
        });
        holes.forEach((h) => (h.visible = true));
        return;
      }
      const ph = phaseOf(sit);
      const sd = ph * 7.1;
      const bt = cogBeat(t, ph);
      const r = cogRound(bt);
      const month = ((bt.n % 6) + 6) % 6;
      cards.forEach((c, i) => {
        const shown = (i === r.a && r.up >= 1) || (i === r.b && r.up >= 2);
        const taken = r.up >= 3 && (i === r.a || i === r.b);
        c.back.visible = !shown && !taken;
        c.face.visible = shown && !taken;
        if (shown) (c.face.material as THREE.MeshBasicMaterial).map = hwatuFace(month);
      });
      holes.forEach((h, i) => (h.visible = i >= r.pieces));
      // The patient's hands: the left on the cards, the right on the puzzle and the clock.
      let left: THREE.Vector3 | null = null;
      let right: THREE.Vector3 | null = null;
      if (amountOf(bt, 'flip') > 0.5) {
        const [x, z] = cardAt(r.b);
        left = r.up >= 1 ? q.set(x, top + 0.03 + 0.03 * pulse(t, 0.8, sd, 2), z) : null;
      } else if (amountOf(bt, 'match') > 0.5) {
        const [x, z] = cardAt(r.a);
        left = q.set(x, top + 0.06, z + 0.04);
      } else if (amountOf(bt, 'puzzle') > 0.5) {
        const k = otKey('otCognitive', t, ph);
        inFrame(sit, k.r, a);
        right = a;
        piece.visible = true;
        piece.position.copy(a).add(v3(0, -0.015, 0.02));
      } else if (amountOf(bt, 'clock') > 0.5) {
        const ang = t * 0.9 + sd;
        right = q.set(sx + 0.04 * Math.cos(ang) + 0.02, top + 0.03, sz + 0.04 * Math.sin(ang) + 0.02);
      }
      client.armL(left);
      client.armR(right);
      client.head.rotation.x = 0.3 - 0.25 * amountOf(bt, 'praise');
    };
  },

  /**
   * The assessment cabinet (평가 도구장): a tall white cabinet, drawers below, the calibration log
   * clipped to its middle panel, a glass door over three shelves of the kit — the Box and Block test,
   * the Purdue pegboard, the Jamar grip dynamometer and a pinch gauge, the nine-hole peg test, the
   * monofilaments, the binders (MMSE-K, K-MBI, COPM), goniometers hung inside the door, a hand model on
   * top. Checking the kit (otCheckTools): stood at it — the door opened, the dynamometer squeezed (its
   * needle up), the goniometer opened and closed, the log ticked, the door shut.
   */
  otAssessCabinet(g, _W, _D, _c, _def, _ctx, out) {
    const x0 = -0.44;
    const x1 = 0.44;
    const z0 = -0.48;
    const z1 = KIT.face;
    const zc = (z0 + z1) / 2;
    const W = x1 - x0;
    const D = z1 - z0;
    const WHITE = '#f5f5f5';
    part(g, rbox(W, 0.7, D, 0.015), WHITE, 0, 0.35, zc);
    for (let i = 0; i < 3; i++) {
      part(g, box(W - 0.04, 0.004, 0.004), '#bdbdbd', 0, 0.24 + i * 0.22, z1 + 0.001, { outline: false });
      part(g, rbox(0.14, 0.02, 0.02, 0.008), STEEL, 0, 0.13 + i * 0.22, z1 + 0.012);
    }
    label(g, '평가 도구', 0.2, 0.04, 0.0, 0.62, z1 + 0.002, '#eceff1', '#455a64');
    part(g, rbox(W, 0.3, D, 0.015), WHITE, 0, 0.85, zc);
    part(g, rbox(0.17, 0.22, 0.012, 0.006), '#795548', KIT.log[0], KIT.log[1], z1 + 0.008);
    picture(g, painted('otCalibration', 128, 160, paintCalibration), 0.15, 0.19, KIT.log[0], KIT.log[1] - 0.005, z1 + 0.015);
    part(g, box(0.06, 0.015, 0.012), CHROME, KIT.log[0], KIT.log[1] + 0.1, z1 + 0.016, { outline: false });
    // The glass part: sides, back, top, shelves.
    const gy0 = 1.0;
    const gy1 = 1.82;
    for (const sx of [-1, 1]) part(g, box(0.02, gy1 - gy0, D), WHITE, sx * (W / 2 - 0.01), (gy0 + gy1) / 2, zc);
    part(g, box(W, gy1 - gy0, 0.02), '#eceff1', 0, (gy0 + gy1) / 2, z0 + 0.01);
    part(g, rbox(W + 0.02, 0.04, D + 0.02, 0.01), WHITE, 0, gy1 + 0.02, zc);
    const shelves = [gy0, 1.28, 1.55];
    for (const y of shelves) part(g, box(W - 0.04, 0.015, D - 0.03), '#e0e0e0', 0, y, zc - 0.01);
    // Shelf one: the Box and Block test, the Purdue pegboard.
    const s0 = shelves[0] + 0.008;
    part(g, rbox(0.3, 0.08, 0.2, 0.01), '#d7b98e', -0.2, s0 + 0.04, zc);
    part(g, box(0.012, 0.1, 0.2), '#a1887f', -0.2, s0 + 0.05, zc, { outline: false });
    const rr = seeded(77);
    for (let i = 0; i < 8; i++) part(g, box(0.025, 0.025, 0.025), ['#e53935', '#1e88e5', '#fdd835', '#43a047'][i % 4], -0.3 + rr() * 0.07, s0 + 0.09, zc - 0.05 + rr() * 0.1, { ry: rr(), outline: false });
    part(g, rbox(0.12, 0.03, 0.3, 0.008), '#eeeeee', 0.2, s0 + 0.015, zc, { ry: Math.PI / 2 });
    for (let i = 0; i < 8; i++) part(g, cyl(0.004, 0.004, 0.02, 6), '#78909c', 0.07 + i * 0.035, s0 + 0.035, zc, { outline: false });
    // Shelf two: the dynamometer and pinch gauge (taken off), the nine-hole peg test, monofilaments.
    const s1 = shelves[1] + 0.008;
    const shelfDyna = dynamometer(g);
    shelfDyna.root.position.set(KIT.shelf[0], s1 + 0.065, KIT.shelf[2] + 0.04);
    part(g, rbox(0.03, 0.015, 0.12, 0.006), '#ffca28', 0.2, s1 + 0.008, zc);
    part(g, rbox(0.15, 0.025, 0.1, 0.008), '#eceff1', -0.24, s1 + 0.012, zc);
    for (let i = 0; i < 9; i++) part(g, cyl(0.004, 0.004, 0.02, 6), '#fafafa', -0.28 + (i % 3) * 0.03, s1 + 0.03, zc - 0.03 + Math.floor(i / 3) * 0.025, { outline: false });
    part(g, rbox(0.1, 0.06, 0.06, 0.01), '#7e57c2', 0.32, s1 + 0.03, zc);
    // Shelf three: the binders.
    const s2 = shelves[2] + 0.008;
    const binders: Array<[string, string]> = [['MMSE-K', '#1e88e5'], ['K-MBI', '#43a047'], ['COPM', ORANGE], ['아동발달', '#8e24aa'], ['손기능', '#e53935']];
    binders.forEach(([t, col], i) => {
      part(g, rbox(0.06, 0.24, 0.2, 0.008), col, -0.3 + i * 0.075, s2 + 0.12, zc);
      label(g, t, 0.05, 0.04, -0.3 + i * 0.075, s2 + 0.16, zc + 0.101, '#ffffff', col);
    });
    // A hand model on top, and the sign.
    const hand = group(g, 0.25, gy1 + 0.04, zc);
    part(hand, rbox(0.12, 0.02, 0.1, 0.01), '#5d4037', 0, 0.01, 0);
    part(hand, rbox(0.07, 0.1, 0.025, 0.012), '#ffe0b2', 0, 0.08, 0);
    for (let i = 0; i < 4; i++) part(hand, cyl(0.007, 0.007, 0.07, 6), '#ffe0b2', -0.026 + i * 0.017, 0.16, 0, { outline: false });
    part(hand, cyl(0.007, 0.007, 0.05, 6), '#ffe0b2', 0.045, 0.1, 0, { rz: -0.7, outline: false });
    label(g, '작업치료 평가실', 0.3, 0.05, -0.12, gy1 + 0.065, zc, ORANGE, '#ffffff');
    // The glass door on its hinge, goniometers hung on its inside.
    const door = group(g, KIT.hinge, (gy0 + gy1) / 2, z1);
    const dw = KIT.handle[0] - KIT.hinge + 0.04;
    for (const y of [-1, 1]) part(door, box(dw, 0.03, 0.02), WHITE, dw / 2, y * ((gy1 - gy0) / 2 - 0.015), 0);
    for (const x of [0.015, dw - 0.015]) part(door, box(0.03, gy1 - gy0, 0.02), WHITE, x, 0, 0);
    glass(door, box(dw - 0.04, gy1 - gy0 - 0.04, 0.004), dw / 2, 0, 0);
    part(door, rbox(0.015, 0.12, 0.02, 0.006), CHROME, KIT.handle[0] - KIT.hinge, KIT.handle[1] - (gy0 + gy1) / 2, 0.02);
    for (let i = 0; i < 2; i++) {
      const gm = goniometer(door);
      gm.root.position.set(0.15 + i * 0.25, 0.2, -0.02);
      gm.root.rotation.set(Math.PI / 2, 0, -Math.PI / 2);
    }

    const workAt = marker(g, KIT.shelf[0], KIT.shelf[1], KIT.shelf[2]);
    const check = standAt(g, KIT.stand[0], KIT.stand[1], Math.PI, 'otKit', workAt);
    out.spots = { '*': check };
    out.work = workAt;

    const use = group(g);
    out.inUse = use;
    const held = dynamometer(use);
    const gon = goniometer(use);
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    out.animate = (t) => {
      const on = posed(check, t);
      held.root.visible = false;
      gon.root.visible = false;
      shelfDyna.root.visible = true;
      if (!on) {
        door.rotation.y = 0;
        return;
      }
      const ph = phaseOf(check);
      const sd = ph * 7.1;
      const bt = kitBeat(t, ph);
      const k = otKey('otKit', t, ph);
      const st = kitOf(bt);
      door.rotation.y = -st.door * 1.75;
      if (st.dyna) {
        shelfDyna.root.visible = false;
        held.root.visible = true;
        inFrame(check, k.r, a);
        held.root.position.copy(a).add(v3(0, 0.02, 0));
        held.root.rotation.set(0, 0, 0);
        held.needle.rotation.z = -2.2 * pulse(t, 0.7, sd, 2);
      }
      if (st.goni) {
        gon.root.visible = true;
        inFrame(check, k.l, a);
        inFrame(check, k.r, b);
        gon.root.position.copy(a).lerp(b, 0.5).add(v3(0, 0.01, 0));
        gon.root.rotation.set(-Math.PI / 2 + 0.4, 0, 0);
        gon.arm.rotation.y = 0.6 + 0.5 * wave(t, 0.4, sd);
      }
    };
  },
};
