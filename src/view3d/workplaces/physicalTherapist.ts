import * as THREE from 'three';
import type { Motion } from '../activity';
import { marker, rod, shade, spot, type Builder, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, WATER, caster, glass, glowing, label, litScreen, painted, picture, ring, seeded, text, type Paint } from './doctor';
import * as PT from './physicalTherapistMotion';
import { pavementSign } from './dentist';

/**
 * The 재활센터 drawn as itself (2026-10-27 workplace pipeline, at the user's request): a bright,
 * busy 운동치료실 and 물리치료실 where the patients are always really there, lying on the tables,
 * balancing on the balls, climbing the stairs, and the hands do real physical therapy. The electric
 * treatment table (two-part teal vinyl top with its breathing hole, paper roll, pillow, knee bolster,
 * the lift columns and the foot bar round the base, the hot-pack timer on its side), with a patient
 * lying on it for knee and shoulder range, a hot pack, a braced knee straight after surgery, a
 * trainee's watching and a plan measured with a goniometer; the gym ball on its mat with cuff
 * weights and a balance pad, a patient balancing on it, an athlete's knee taped. And what it was
 * missing (workFurniture/physicalTherapist.ts): the 늑목 stall bars hung with the coloured bands,
 * the training stairs, the modality corner (the ultrasound / 간섭파 cart and the patient's leaning
 * stool), the hot-pack heater, and a skeleton model.
 *
 * The centre (바른몸재활센터), its patients and its staff are made up. The therapist's hands and the
 * patient's body go by one clock (physicalTherapistMotion.ts), so the knee bends as it's pushed, the
 * arm lifts with the hand at the wrist, the patient steps up as the therapist steps up behind.
 */

const CENTRE = '바른몸재활센터';
const TEAL = '#00897b';
const VINYL = '#2a7f86';
const OAK = '#d2ad78';
const OAK_DARK = '#a8875e';
const PAPER = '#fbfaf5';
const TERRY = '#f2efe6';
const UP = new THREE.Vector3(0, 1, 0);
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const mix = (a: number, b: number, e: number) => a + (b - a) * e;
const V = (p: PT.P, dx = 0, dy = 0, dz = 0) => new THREE.Vector3(p[0] + dx, p[1] + dy, p[2] + dz);

// ---------------------------------------------------------------------------------------------
// Small parts.

function group(parent: THREE.Object3D, x = 0, y = 0, z = 0, ry = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}
/** A spot from the motions' table, and what's done there; `work` is the piece's clock mark. */
function spotAt(g: THREE.Object3D, s: PT.SpotAt, how: 'sit' | 'stand', motion: Motion, work: THREE.Object3D): Spot {
  const sp = spot(g, how, s.x, s.y, s.z, s.yaw, how === 'sit' ? s.y : undefined);
  sp.work = work;
  sp.motion = motion;
  return sp;
}
/** Moves a spot's marker to where the motion has it now (a therapist side-stepping, climbing). */
function moveSpot(s: Spot, at: PT.SpotAt) {
  s.at.position.set(at.x, at.y, at.z);
  s.at.rotation.y = at.yaw;
}
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
/** Which of a piece's uses is going on now (the spot a dweller's been posed at just now, the latest). */
function nowAt(spots: Record<string, Spot>, t: number): Spot | null {
  let best: Spot | null = null;
  for (const s of Object.values(spots)) if (Math.abs(t - posedAt(s)) < 0.6 && (!best || posedAt(s) > posedAt(best))) best = s;
  return best;
}
const tmp = new THREE.Vector3();
const phaseOf = (m: THREE.Object3D) => PT.ptPhase(m.getWorldPosition(tmp));

/** A cylinder stretched between two points each frame (an arm, a leg, a band). */
function limb(g: THREE.Object3D, r: number, color: string, outline = false): (a: THREE.Vector3, b: THREE.Vector3) => THREE.Mesh {
  const m = part(g, cyl(r, r * 0.92, 1, 10), color, 0, 0, 0, { outline });
  const d = new THREE.Vector3();
  return (a, b) => {
    d.subVectors(b, a);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.scale.set(1, Math.max(0.001, d.length()), 1);
    m.quaternion.setFromUnitVectors(UP, d.normalize());
    return m;
  };
}
/** A flat strip (tape) between two points, its face out along `n`. */
function strip(g: THREE.Object3D, w: number, color: string): (a: THREE.Vector3, b: THREE.Vector3, n: THREE.Vector3) => THREE.Mesh {
  const m = part(g, box(w, 1, 0.005), color, 0, 0, 0, { outline: false, shadow: false });
  const d = new THREE.Vector3();
  const x = new THREE.Vector3();
  const z = new THREE.Vector3();
  const mat = new THREE.Matrix4();
  return (a, b, n) => {
    d.subVectors(b, a);
    const L = d.length();
    m.visible = L > 0.004;
    if (!m.visible) return m;
    d.normalize();
    z.copy(n).addScaledVector(d, -n.dot(d)).normalize();
    x.crossVectors(d, z).normalize();
    mat.makeBasis(x, d, z);
    m.quaternion.setFromRotationMatrix(mat);
    m.position.copy(a).addScaledVector(d, L / 2);
    m.scale.set(1, L, 1);
    return m;
  };
}
/** Steam off a hot pack or the heater (see-through, shared). */
const STEAM = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.42, depthWrite: false });
/** Three puffs of steam rising off a point (call each frame). */
function steam(g: THREE.Object3D, size = 0.03): (at: THREE.Vector3 | null, t: number) => void {
  const puffs = [0, 1, 2].map(() => part(g, ball(size), '#ffffff', 0, 0, 0, { outline: false, shadow: false, material: STEAM }));
  return (at, t) => {
    puffs.forEach((p, i) => {
      p.visible = !!at;
      if (!at) return;
      const u = (t * 0.45 + i / 3) % 1;
      p.position.set(at.x + 0.03 * Math.sin(t * 1.3 + i * 2), at.y + 0.04 + u * 0.22, at.z + 0.02 * Math.cos(t + i));
      p.scale.setScalar(0.6 + u);
    });
  };
}

// ---------------------------------------------------------------------------------------------
// People drawn in: the patients (lying, sat on the ball, stood at the bars, on the stairs) and a senior therapist.

interface Look {
  top: string;
  bottom: string;
  hair: string;
  hairdo: 'short' | 'bob' | 'pony' | 'perm' | 'grey' | 'bald' | 'buzz';
  skin?: string;
  shoes?: string;
  /** Shorts (the thighs' lower half bare), short sleeves (the forearms bare), bare feet, socks. */
  shorts?: boolean;
  shortSleeves?: boolean;
  barefoot?: boolean;
  socks?: string;
  /** A hinged knee brace on the left leg, over a bandage (just after surgery). */
  brace?: boolean;
  glasses?: boolean;
  /** A stripe across the top (a 환자복's), a number on the back and front (a team shirt). */
  stripe?: string;
  number?: string;
  badge?: string;
}
const SKIN = '#ecc6a3';
const LOOKS = {
  /** On the treatment tables. */
  jeongsuk: { top: '#9fc8e8', bottom: '#3f51b5', hair: '#8d8a86', hairdo: 'perm', shorts: true, barefoot: true, shortSleeves: true } as Look,
  minho: { top: '#f5f5f5', bottom: '#263238', hair: '#1a1a1a', hairdo: 'short', shorts: true, barefoot: true, shortSleeves: true, skin: '#e5b98f' } as Look,
  yeonhee: { top: '#f3c6d3', bottom: '#5c6bc0', hair: '#3b2a20', hairdo: 'bob', shorts: true, barefoot: true, shortSleeves: true } as Look,
  /** In a 환자복 with the knee braced, a day after the operation. */
  postOp: { top: '#cfe0f0', stripe: '#9fbad6', bottom: '#cfe0f0', hair: '#bdbab4', hairdo: 'grey', shorts: true, barefoot: true, brace: true, shortSleeves: true } as Look,
  /** On the ball, at the bars, on the stairs, at the cart. */
  ballLady: { top: '#80cbc4', bottom: '#37474f', hair: '#4e342e', hairdo: 'pony', shoes: '#eceff1', shortSleeves: true } as Look,
  athlete: { top: '#e53935', bottom: '#212121', hair: '#1a1a1a', hairdo: 'buzz', shorts: true, socks: '#fafafa', shoes: '#1565c0', number: '7', shortSleeves: true, skin: '#deb08a' } as Look,
  bandMan: { top: '#9e9e9e', bottom: '#263238', hair: '#2b2b2b', hairdo: 'short', shoes: '#424242', shortSleeves: true, glasses: true } as Look,
  stairsGrandpa: { top: '#a1887f', bottom: '#5d5d66', hair: '#dcdcdc', hairdo: 'bald', shoes: '#4e342e', glasses: true } as Look,
  cartLady: { top: '#b3d4ec', bottom: '#7986cb', hair: '#2b1b10', hairdo: 'bob', shoes: '#f5f5f5' } as Look,
  senior: { top: '#dce5e2', bottom: '#354e59', hair: '#2b1b10', hairdo: 'short', skin: '#f1cfb0', shoes: '#fafafa', badge: '배근육', shortSleeves: true } as Look,
};

interface BodyPose {
  /** The hip line's middle, the way up the trunk, the way the chest faces. */
  pelvis: THREE.Vector3;
  up: THREE.Vector3;
  front: THREE.Vector3;
  ankleL: THREE.Vector3;
  ankleR: THREE.Vector3;
  /** Which way each knee bends (default: the front); where each foot's toes point (default: the front). */
  poleL?: THREE.Vector3;
  poleR?: THREE.Vector3;
  toeL?: THREE.Vector3;
  toeR?: THREE.Vector3;
  /** The hands (null or left out: hanging at the sides). */
  handL?: THREE.Vector3 | null;
  handR?: THREE.Vector3 | null;
  /** The head bowed, turned to their left, lifted off the trunk's line (on a pillow, into a breathing hole). */
  nod?: number;
  turn?: number;
  lift?: number;
}
interface Body {
  root: THREE.Group;
  /** The trunk (things worn on it: a gait belt). */
  trunk: THREE.Group;
  set(p: BodyPose): void;
  eyes(shut: number): void;
  mouth(open: number): void;
  /** The knees and hips as last posed (0 left, 1 right). */
  knee: [THREE.Vector3, THREE.Vector3];
  hip: [THREE.Vector3, THREE.Vector3];
}
/**
 * Someone drawn in, every joint put where it's wanted each pose (the trunk from its hips and its
 * up and front, the knees and elbows worked out from the hands and ankles), so they can lie, sit on a
 * ball, stand and step up stairs.
 */
function figure(parent: THREE.Object3D, look: Look): Body {
  const root = group(parent);
  const skin = look.skin ?? SKIN;
  const trunk = group(root);
  part(trunk, rbox(0.31, 0.17, 0.23, 0.06), look.bottom, 0, 0.02, 0);
  part(trunk, rbox(0.34, 0.44, 0.21, 0.08), look.top, 0, 0.28, 0);
  if (look.stripe) for (let i = 0; i < 4; i++) part(trunk, box(0.346, 0.022, 0.216), look.stripe, 0, 0.12 + i * 0.1, 0, { outline: false });
  if (look.number) {
    label(trunk, look.number, 0.12, 0.12, 0, 0.3, -0.107, look.top, '#ffffff', Math.PI);
    label(trunk, look.number, 0.08, 0.08, 0.08, 0.38, 0.107, look.top, '#ffffff');
    part(trunk, box(0.346, 0.03, 0.216), '#ffffff', 0, 0.47, 0, { outline: false });
  }
  if (look.badge) label(trunk, look.badge, 0.08, 0.026, -0.09, 0.4, 0.107, '#ffffff', '#00695c');
  part(trunk, cyl(0.045, 0.05, 0.08, 10), skin, 0, 0.53, 0, { outline: false });
  const head = group(trunk, 0, 0.67, 0);
  head.rotation.order = 'YXZ';
  part(head, ball(0.112), skin, 0, 0, 0);
  const eyesM = [1, -1].map((sx) => part(head, box(0.022, 0.016, 0.006), '#2b2b30', sx * 0.04, 0.0, 0.106, { outline: false }));
  for (const sx of [-1, 1]) part(head, ball(0.017), '#f2a7a0', sx * 0.065, -0.03, 0.088, { outline: false }).scale.set(1, 0.6, 0.4);
  const mouthM = part(head, box(0.034, 0.01, 0.006), '#8d4f47', 0, -0.05, 0.104, { outline: false });
  switch (look.hairdo) {
    case 'perm':
      part(head, ball(0.118), look.hair, 0, 0.035, -0.025);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        part(head, ball(0.044), look.hair, Math.cos(a) * 0.08, 0.08 + 0.02 * Math.sin(a * 2), -0.02 + Math.sin(a) * 0.07, { outline: false });
      }
      break;
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
    case 'grey':
      part(head, ball(0.117), look.hair, 0, 0.02, -0.035);
      part(head, ball(0.1), skin, 0, 0.05, 0.022, { outline: false });
      break;
    case 'bald':
      for (const sx of [-1, 1]) part(head, ball(0.05), look.hair, sx * 0.095, 0, -0.035, { outline: false });
      part(head, ball(0.075), look.hair, 0, -0.02, -0.07, { outline: false });
      break;
    case 'buzz':
      part(head, ball(0.115), look.hair, 0, 0.02, -0.02);
      part(head, ball(0.104), skin, 0, 0.0, 0.02, { outline: false });
      break;
    default:
      part(head, ball(0.118), look.hair, 0, 0.03, -0.03);
      part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0, 0.075, 0.075, { rx: -0.25 });
  }
  if (look.glasses) {
    for (const sx of [-1, 1]) part(head, ring(0.024, 0.003), '#37474f', sx * 0.042, 0.002, 0.11);
    part(head, box(0.02, 0.004, 0.004), '#37474f', 0, 0.002, 0.112, { outline: false });
  }
  // The legs: the thigh (bare below a pair of shorts), the shin, a sock, the foot.
  const bare = look.shorts ? skin : look.bottom;
  const legs = [0, 1].map((i) => ({
    thigh: limb(root, 0.062, bare),
    shortsLeg: look.shorts ? limb(root, 0.074, look.bottom) : null,
    shin: limb(root, 0.05, bare),
    sock: look.socks ? limb(root, 0.054, look.socks) : null,
    brace: look.brace && i === 0 ? { t: limb(root, 0.075, '#37474f'), s: limb(root, 0.068, '#37474f'), wrap: limb(root, 0.07, '#ffffff'), hinge: part(root, cyl(0.045, 0.045, 0.02, 14), '#b0bec5', 0, 0, 0) } : null,
    foot: part(root, rbox(0.095, 0.07, 0.21, 0.03), look.barefoot ? skin : look.shoes ?? '#424242', 0, 0, 0),
  }));
  const sleeve = look.top;
  const arms = [0, 1].map(() => ({
    upper: limb(root, 0.042, look.shortSleeves ? skin : sleeve),
    cuff: look.shortSleeves ? limb(root, 0.054, sleeve) : null,
    fore: limb(root, 0.035, look.shortSleeves ? skin : sleeve),
    hand: part(root, ball(0.036), skin, 0, 0, 0, { outline: false }),
  }));
  const left = new THREE.Vector3();
  const up = new THREE.Vector3();
  const front = new THREE.Vector3();
  const m4 = new THREE.Matrix4();
  const knee: [THREE.Vector3, THREE.Vector3] = [new THREE.Vector3(), new THREE.Vector3()];
  const hip: [THREE.Vector3, THREE.Vector3] = [new THREE.Vector3(), new THREE.Vector3()];
  const d = new THREE.Vector3();
  const bend = new THREE.Vector3();
  const a0 = new THREE.Vector3();
  const a1 = new THREE.Vector3();
  const top = new THREE.Vector3();
  const side = new THREE.Vector3();
  const elbow = new THREE.Vector3();
  const sh = new THREE.Vector3();
  const hand = new THREE.Vector3();
  const solveLeg = (i: number, ankle: THREE.Vector3, pole: THREE.Vector3, toe: THREE.Vector3) => {
    const L = legs[i];
    const h = hip[i];
    d.subVectors(ankle, h);
    const len = Math.min(PT.THIGH + PT.SHIN - 0.005, Math.max(0.1, d.length()));
    d.normalize();
    const cosA = THREE.MathUtils.clamp((PT.THIGH ** 2 + len * len - PT.SHIN ** 2) / (2 * PT.THIGH * len), -1, 1);
    bend.copy(pole).addScaledVector(d, -pole.dot(d)).normalize();
    knee[i].copy(h).addScaledVector(d, PT.THIGH * cosA).addScaledVector(bend, PT.THIGH * Math.sqrt(1 - cosA * cosA));
    a1.copy(h).addScaledVector(d, len);
    L.thigh(h, knee[i]);
    L.shin(knee[i], a1);
    if (L.shortsLeg) L.shortsLeg(h, a0.lerpVectors(h, knee[i], 0.45));
    if (L.sock) L.sock(a0.lerpVectors(knee[i], a1, 0.8), a1);
    if (L.brace) {
      L.brace.t(a0.lerpVectors(h, knee[i], 0.55), knee[i]);
      L.brace.s(knee[i], a0.lerpVectors(knee[i], a1, 0.55));
      L.brace.wrap(a0.lerpVectors(h, knee[i], 0.86), side.lerpVectors(knee[i], a1, 0.14));
      L.brace.hinge.position.copy(knee[i]).addScaledVector(left, (i === 0 ? 1 : -1) * 0.07);
      L.brace.hinge.quaternion.setFromUnitVectors(UP, left);
    }
    // The foot: from the ankle along the toes, its top towards the body's up.
    top.copy(up).addScaledVector(toe, -up.dot(toe));
    if (top.lengthSq() < 1e-4) top.copy(front);
    top.normalize();
    side.crossVectors(top, toe).normalize();
    m4.makeBasis(side, top, toe);
    L.foot.quaternion.setFromRotationMatrix(m4);
    L.foot.position.copy(a1).addScaledVector(toe, 0.05).addScaledVector(top, -0.04);
  };
  const solveArm = (i: number, to: THREE.Vector3 | null | undefined) => {
    const A = arms[i];
    const sx = i === 0 ? 1 : -1;
    sh.copy(trunk.position).addScaledVector(left, sx * 0.2).addScaledVector(up, 0.46);
    if (to) hand.copy(to);
    else hand.copy(sh).addScaledVector(up, -0.47).addScaledVector(left, sx * 0.04).addScaledVector(front, 0.06);
    d.subVectors(hand, sh);
    const L = Math.min(0.515, Math.max(0.05, d.length()));
    d.normalize();
    hand.copy(sh).addScaledVector(d, L);
    const a = 0.27;
    const b = 0.25;
    const cosA = THREE.MathUtils.clamp((a * a + L * L - b * b) / (2 * a * L), -1, 1);
    bend.copy(up).multiplyScalar(-1).addScaledVector(left, sx * 0.6).addScaledVector(front, -0.25);
    bend.addScaledVector(d, -bend.dot(d)).normalize();
    elbow.copy(sh).addScaledVector(d, a * cosA).addScaledVector(bend, a * Math.sqrt(1 - cosA * cosA));
    A.upper(sh, elbow);
    if (A.cuff) A.cuff(sh, a0.lerpVectors(sh, elbow, 0.45));
    A.fore(elbow, hand);
    A.hand.position.copy(hand);
  };
  const me: Body = {
    root,
    trunk,
    knee,
    hip,
    set(p) {
      up.copy(p.up).normalize();
      front.copy(p.front).addScaledVector(up, -p.front.dot(up)).normalize();
      left.crossVectors(up, front).normalize();
      m4.makeBasis(left, up, front);
      trunk.quaternion.setFromRotationMatrix(m4);
      trunk.position.copy(p.pelvis);
      head.position.set(0, 0.67, p.lift ?? 0);
      head.rotation.set(p.nod ?? 0, p.turn ?? 0, 0);
      hip[0].copy(p.pelvis).addScaledVector(left, 0.09);
      hip[1].copy(p.pelvis).addScaledVector(left, -0.09);
      solveLeg(0, p.ankleL, p.poleL ?? front, (p.toeL ?? front).clone().normalize());
      solveLeg(1, p.ankleR, p.poleR ?? front, (p.toeR ?? front).clone().normalize());
      solveArm(0, p.handL);
      solveArm(1, p.handR);
    },
    eyes: (shut) => eyesM.forEach((e) => e.scale.set(1, 1 - 0.78 * shut, 1)),
    mouth: (open) => mouthM.scale.set(1 - 0.3 * open, 1 + 3 * open, 1),
  };
  return me;
}
/** Stood at a spot (feet at its marker, facing its way), bent forward `lean`, the hands where they're put. */
function standAt(b: Body, at: PT.SpotAt, lean: number, hl: THREE.Vector3 | null, hr: THREE.Vector3 | null, nod = 0.3) {
  const f = v3(Math.sin(at.yaw), 0, Math.cos(at.yaw));
  const l = v3(Math.cos(at.yaw), 0, -Math.sin(at.yaw));
  const pel = v3(at.x, at.y + 0.87, at.z);
  b.set({
    pelvis: pel,
    up: UP.clone().multiplyScalar(Math.cos(lean)).addScaledVector(f, Math.sin(lean)),
    front: f.clone().multiplyScalar(Math.cos(lean)).addScaledVector(UP, -Math.sin(lean)),
    ankleL: v3(at.x, at.y + 0.08, at.z).addScaledVector(l, 0.11).addScaledVector(f, -0.02),
    ankleR: v3(at.x, at.y + 0.08, at.z).addScaledVector(l, -0.11).addScaledVector(f, -0.02),
    poleL: f,
    poleR: f,
    toeL: f,
    toeR: f,
    handL: hl,
    handR: hr,
    nod,
  });
}
/** A gait belt round someone's middle. */
function gaitBelt(b: Body) {
  part(b.trunk, rbox(0.37, 0.055, 0.235, 0.03), '#1e88e5', 0, 0.09, 0);
  part(b.trunk, box(0.06, 0.04, 0.01), CHROME, 0, 0.09, 0.12, { outline: false });
  for (const sx of [-1, 1]) part(b.trunk, rbox(0.03, 0.06, 0.02, 0.01), '#1565c0', sx * 0.14, 0.09, -0.12);
}

// ---------------------------------------------------------------------------------------------
// What's painted on the screens, the papers and the signs.

const FILL = (c: CanvasRenderingContext2D, w: number, h: number, bg: string) => {
  c.fillStyle = bg;
  c.fillRect(0, 0, w, h);
};
function scribble(c: CanvasRenderingContext2D, x: number, y: number, w: number, r: () => number, color = '#37474f') {
  c.strokeStyle = color;
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(x, y);
  for (let i = 0; i < w; i += 4) c.lineTo(x + i, y + Math.sin(i * 0.7 + r() * 6) * 1.6);
  c.stroke();
}
/** The evaluation sheet on the clipboard: the knee's range, the pain score, the plan. */
const paintEvalSheet: Paint = (c) => {
  FILL(c, 120, 160, PAPER);
  c.fillStyle = TEAL;
  c.fillRect(0, 0, 120, 18);
  text(c, '물리치료 평가지', 60, 9, 10, '#ffffff', 'center');
  text(c, 'ROM 무릎 굴곡', 6, 30, 8, '#263238');
  text(c, '95° → 110°', 114, 30, 8, '#c62828', 'right');
  text(c, 'VAS 통증', 6, 46, 8, '#263238');
  for (let i = 0; i <= 10; i++) {
    c.fillStyle = i === 4 ? '#ef6c00' : '#cfd8dc';
    c.fillRect(48 + i * 6, 41, 5, 9);
  }
  text(c, 'MMT 대퇴사두근 4/5', 6, 62, 8, '#263238');
  text(c, '치료 계획', 6, 80, 9, '#00695c');
  const r = seeded(17);
  for (let i = 0; i < 5; i++) scribble(c, 8, 94 + i * 12, 90 + r() * 16, r);
};
/** The band colours and their strengths. */
const paintBandChart: Paint = (c) => {
  FILL(c, 160, 220, '#ffffff');
  c.fillStyle = TEAL;
  c.fillRect(0, 0, 160, 34);
  text(c, '탄력 밴드 강도', 80, 17, 17, '#ffffff', 'center');
  const bands: Array<[string, string]> = [['#fdd835', '노랑 · 약함'], ['#e53935', '빨강 · 보통'], ['#43a047', '초록 · 중간'], ['#1e88e5', '파랑 · 강함'], ['#424242', '검정 · 아주 강함']];
  bands.forEach(([col, s], i) => {
    c.fillStyle = col;
    c.fillRect(12, 46 + i * 34, 40, 20);
    text(c, s, 60, 56 + i * 34, 12, '#263238');
  });
};
/** The stairs' reminder: up with the good leg, down with the bad. */
const paintStairRule: Paint = (c) => {
  FILL(c, 240, 96, '#fffde7');
  c.fillStyle = '#f9a825';
  c.fillRect(0, 0, 240, 8);
  text(c, '▲ 올라갈 때: 좋은 다리 먼저', 12, 34, 16, '#2e7d32');
  text(c, '▼ 내려갈 때: 아픈 다리 · 지팡이 먼저', 12, 66, 16, '#c62828');
};
/** The modality unit's screen: ICT and ultrasound, the time left. */
const paintModScreen: Paint = (c) => {
  FILL(c, 256, 160, '#0d2a3a');
  c.fillStyle = '#00acc1';
  c.fillRect(0, 0, 256, 26);
  text(c, '복합 물리치료기', 10, 13, 14, '#ffffff');
  text(c, 'CH1', 246, 13, 12, '#e0f7fa', 'right');
  text(c, 'ICT 간섭파', 12, 46, 14, '#80deea');
  text(c, '4000 Hz · 흡착 2', 12, 66, 12, '#b2ebf2', 'left', false);
  text(c, 'US 초음파', 140, 46, 14, '#ffcc80');
  text(c, '1 MHz · 1.0 W/㎠', 140, 66, 12, '#ffe0b2', 'left', false);
  c.strokeStyle = '#4dd0e1';
  c.lineWidth = 2;
  c.beginPath();
  for (let x = 0; x < 236; x++) c.lineTo(10 + x, 100 + 12 * Math.sin(x * 0.18) * Math.sin(x * 0.021));
  c.stroke();
  text(c, '치료 시간', 12, 140, 13, '#b0bec5');
  text(c, '15:00', 244, 140, 26, '#ffffff', 'right');
};
/** The 물리치료 순서 notice on the wall over the leaning rest. */
const paintModNotice: Paint = (c) => {
  FILL(c, 200, 260, '#ffffff');
  c.fillStyle = '#5c6bc0';
  c.fillRect(0, 0, 200, 40);
  text(c, '물리치료 순서', 100, 21, 20, '#ffffff', 'center');
  const steps = ['① 온열 (핫팩) 15분', '② 전기 (간섭파) 15분', '③ 초음파 5분', '④ 운동 치료'];
  steps.forEach((s, i) => text(c, s, 16, 70 + i * 40, 16, '#263238'));
  text(c, '불편하시면 말씀해 주세요', 100, 238, 12, '#e65100', 'center');
};
/** The heater's dial face. */
const paintDial: Paint = (c) => {
  FILL(c, 96, 96, '#fafafa');
  c.strokeStyle = '#263238';
  c.lineWidth = 2;
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * (0.8 + 1.4 * (i / 10));
    c.beginPath();
    c.moveTo(48 + Math.cos(a) * 36, 48 + Math.sin(a) * 36);
    c.lineTo(48 + Math.cos(a) * 42, 48 + Math.sin(a) * 42);
    c.stroke();
  }
  c.strokeStyle = '#d32f2f';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(48, 48);
  c.lineTo(48 + Math.cos(Math.PI * 1.85) * 34, 48 + Math.sin(Math.PI * 1.85) * 34);
  c.stroke();
  text(c, '70℃', 48, 72, 14, '#d32f2f', 'center');
};
/** A timer's lit digits. */
const paintTimer: Paint = (c) => {
  FILL(c, 96, 40, '#102018');
  text(c, '15:00', 48, 21, 26, '#69f0ae', 'center');
};

// ---------------------------------------------------------------------------------------------

let tableCount = 0;
let ballCount = 0;
const TABLE_FOLK: Look[] = [LOOKS.jeongsuk, LOOKS.minho, LOOKS.yeonhee];

export const BUILDERS: Record<string, Builder> = {
  /**
   * 베드 사이 커튼 (2026-11-05, the layout audit): a curtain on its rail between two treatment beds, front to back the length of a bed,
   * on two chrome posts with weighted feet; the fabric hangs in folds from the rail to a hand above the floor. The 한의원's beds have it too.
   */
  ptCurtain(g, _W, D, c) {
    const L = D - 0.08;
    for (const z of [-L / 2, L / 2]) {
      part(g, rbox(0.22, 0.025, 0.22, 0.01), STEEL, 0, 0.012, z);
      part(g, cyl(0.014, 0.014, 1.95, 8), CHROME, 0, 0.98, z, { outline: false });
    }
    part(g, box(0.03, 0.03, L), CHROME, 0, 1.95, 0, { outline: false });
    const n = 14;
    for (let i = 0; i < n; i++) {
      part(g, box(0.02, 1.58, L / n + 0.012), i % 2 ? c : shade(c, 0.9), (i % 2 ? 1 : -1) * 0.012, 1.13, -L / 2 + (i + 0.5) * (L / n), { outline: false });
      part(g, cyl(0.012, 0.012, 0.02, 6), CHROME, 0, 1.93, -L / 2 + (i + 0.5) * (L / n), { outline: false });
    }
    part(g, box(0.05, 0.05, L), shade(c, 0.85), 0, 0.36, 0, { outline: false });
  },
  ptStreetSign: pavementSign('ptStreetSign', '🦵', '바른몸|재활의학과', ['물리치료 · 운동치료', '도수치료 · 통증 클리닉', '휠체어 경사로 ▶'], TEAL),
  /**
   * The treatment table (전동 치료 테이블): a two-part teal vinyl top on a steel frame, the head section
   * with its breathing hole, a sheet of paper off the roll under it, a pillow, a half-round knee
   * bolster and folded towels at the foot; two lift columns, castors and the foot-switch bar round
   * the base; the hot-pack timer clipped on the near side, the bed's number at the foot.
   *
   * Manual therapy (manualTherapy): the patient on their back; stood at their left side, a hand under
   * the heel and one on the knee, the knee bent up towards the chest and straightened, three times;
   * the kneecap glided with both thumbs; side-stepped up the table, the arm lifted overhead twice (the
   * wrist held, the elbow cupped); back down, a pat on the shin. A hot pack (applyHeatPack): lying face
   * down, a bolster under the shins; the wrapped pack lowered onto the lower back, covered with a
   * towel and tucked, a corner lifted to check it's not too hot, the timer set, a hand on the shoulder
   * blade, lifted off. Straight after surgery (urgentRehab): in a 환자복 with the knee in its hinged
   * brace; ankle pumps, a quad set, the knee bent a little way, slowly, watching the wince, a thumbs
   * up. Watching a senior (the trainee's): at the foot with a notebook while 배근육 선생님 bends the
   * knee. A treatment plan: sat on the stool, the heel slid up, the goniometer laid at the knee and
   * read, written on the clipboard, explained.
   */
  therapyTable(g, _W, _D, _c, _def, _ctx, out) {
    const n = tableCount++;
    const T = PT.TABLE;
    const top = T.top;
    // The base: a frame on castors, the foot-switch bar round it, two lift columns.
    for (const sx of [-1, 1]) {
      part(g, box(0.05, 0.05, 1.5), '#455a64', sx * 0.25, 0.09, 0);
      for (const sz of [-1, 1]) caster(g, sx * 0.25, sz * 0.72, 0.04);
    }
    for (const sz of [-1, 1]) part(g, box(0.55, 0.05, 0.05), '#455a64', 0, 0.09, sz * 0.72);
    const bar = [v3(-0.31, 0.12, -0.78), v3(0.31, 0.12, -0.78), v3(0.31, 0.12, 0.78), v3(-0.31, 0.12, 0.78)];
    for (let i = 0; i < 4; i++) rod(g, bar[i], bar[(i + 1) % 4], 0.011, CHROME);
    for (const sz of [-0.42, 0.42]) {
      part(g, rbox(0.2, top - 0.25, 0.15, 0.03), '#eceff1', 0, (top - 0.25) / 2 + 0.11, sz);
      part(g, box(0.16, 0.005, 0.11), '#cfd8dc', 0, top * 0.5, sz + 0.076, { outline: false });
    }
    part(g, box(0.56, 0.06, 1.7), '#90a4ae', 0, top - 0.12, 0);
    // The top: the body section and the head section with its breathing hole (a seam between).
    part(g, rbox(T.half * 2, 0.09, 1.38, 0.03), VINYL, 0, top - 0.045, 0.24);
    part(g, rbox(T.half * 2, 0.09, 0.44, 0.03), VINYL, 0, top - 0.045, -0.71);
    part(g, box(T.half * 2 - 0.02, 0.004, 0.01), shade(VINYL, 0.7), 0, top - 0.002, -0.475, { outline: false });
    part(g, ring(0.07, 0.012), '#1d5b60', 0, top + 0.001, -0.72, { rx: Math.PI / 2 });
    part(g, cyl(0.065, 0.065, 0.004, 18), '#123b3e', 0, top + 0.001, -0.72, { outline: false });
    // The paper off its roll under the head end, over the head section.
    part(g, cyl(0.045, 0.045, 0.5, 14), PAPER, 0, top - 0.17, -0.88, { rz: Math.PI / 2 });
    for (const sx of [-1, 1]) part(g, box(0.02, 0.1, 0.03), '#90a4ae', sx * 0.27, top - 0.13, -0.88, { outline: false });
    const sheet = part(g, box(0.5, 0.003, 0.44), PAPER, 0, top + 0.002, -0.71, { outline: false });
    // A pillow (on its back), the knee bolster and towels at the foot.
    const pillow = part(g, rbox(0.4, 0.07, 0.24, 0.035), '#ffffff', 0, top + 0.035, -0.76);
    const bolster = group(g, 0, top, 0.7);
    part(bolster, new THREE.CylinderGeometry(0.09, 0.09, 0.5, 18, 1, false, 0, Math.PI), '#1d5b60', 0, 0, 0, { rz: Math.PI / 2, outline: false });
    const towels = group(g, 0.14, top, 0.78);
    for (let i = 0; i < 3; i++) part(towels, rbox(0.24, 0.04, 0.16, 0.02), ['#ffffff', '#b2dfdb', '#ffffff'][i], 0, 0.02 + i * 0.04, 0);
    // The timer on the near side, the bed's number on the foot.
    const tm = group(g, PT.TIMER[0], PT.TIMER[1], PT.TIMER[2]);
    part(tm, rbox(0.03, 0.07, 0.12, 0.01), '#fafafa', 0, 0, 0);
    const lcdOff = part(tm, box(0.004, 0.035, 0.09), '#1b2b22', 0.016, 0.01, 0, { outline: false });
    const lcdOn = picture(tm, painted('ptTimer', 96, 40, paintTimer), 0.09, 0.035, 0.018, 0.01, 0, '#ffffff', Math.PI / 2);
    lcdOn.visible = false;
    part(g, rbox(0.4, 0.09, 0.012, 0.004), '#ffffff', 0, top - 0.11, 0.851);
    label(g, `${CENTRE} · 베드 ${n + 1}`, 0.38, 0.06, 0, top - 0.11, 0.858, '#ffffff', '#00695c');

    // In use: the patient (on their back or face down), the same table's post-op patient, the senior, the stool and the props.
    const use = group(g);
    out.inUse = use;
    const pat = figure(use, TABLE_FOLK[n % TABLE_FOLK.length]);
    const postOp = figure(use, LOOKS.postOp);
    const senior = figure(use, LOOKS.senior);
    const postTag = group(use, T.half + 0.012, top - 0.08, -0.25);
    part(postTag, rbox(0.006, 0.09, 0.18, 0.003), '#ffffff', 0, 0, 0);
    label(postTag, '수술 후 1일 · 좌측 무릎', 0.17, 0.035, 0.005, 0.015, 0, '#ffffff', '#e65100', Math.PI / 2);
    label(postTag, '무리 금지', 0.1, 0.03, 0.005, -0.025, 0, '#ffcc80', '#bf360c', Math.PI / 2);
    // The rolling stool (for the plan), tucked by the table.
    const stool = group(use, PT.PLAN_AT.x, 0, PT.PLAN_AT.z);
    part(stool, cyl(0.2, 0.2, 0.07, 18), '#37474f', 0, PT.PLAN_AT.y - 0.035, 0);
    part(stool, cyl(0.025, 0.025, PT.PLAN_AT.y - 0.12, 8), CHROME, 0, (PT.PLAN_AT.y - 0.07) / 2 + 0.04, 0, { outline: false });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      rod(stool, v3(0, 0.07, 0), v3(Math.cos(a) * 0.22, 0.04, Math.sin(a) * 0.22), 0.012, '#455a64');
      part(stool, ball(0.025), BLACK, Math.cos(a) * 0.22, 0.025, Math.sin(a) * 0.22, { outline: false });
    }
    // The hot pack in its striped terry cover, the towel over it, steam.
    const pack = group(use);
    part(pack, rbox(0.3, 0.035, 0.26, 0.015), TERRY, 0, 0, 0);
    for (let i = 0; i < 3; i++) part(pack, box(0.302, 0.004, 0.02), '#ef9a9a', 0, 0.016, -0.08 + i * 0.08, { outline: false });
    const towel = group(use, PT.PACK_ON[0], PT.PACK_ON[1] + 0.02, PT.PACK_ON[2]);
    part(towel, rbox(0.5, 0.02, 0.4, 0.01), '#b2dfdb', 0, 0.0, 0);
    for (const sx of [-1, 1]) part(towel, box(0.012, 0.12, 0.4), '#b2dfdb', sx * 0.25, -0.05, 0, { outline: false });
    const puff = steam(use, 0.028);
    // The goniometer (two clear arms on a pivot), the clipboard, the trainee's notebook.
    const gonio = group(use);
    part(gonio, cyl(0.03, 0.03, 0.008, 16), '#eceff1', 0, 0, 0, { rz: Math.PI / 2 });
    const armA = group(gonio);
    const armB = group(gonio);
    part(armA, box(0.006, 0.22, 0.025), '#90caf9', 0, 0.11, 0, { outline: false });
    part(armB, box(0.006, 0.22, 0.025), '#ffcc80', 0, 0.11, 0, { outline: false });
    const clip = group(use);
    part(clip, rbox(0.23, 0.008, 0.31, 0.004), '#8d6e63', 0, 0, 0);
    picture(clip, painted('ptEvalSheet', 120, 160, paintEvalSheet), 0.2, 0.27, 0, 0.006, 0.01, '#ffffff', 0, -Math.PI / 2);
    part(clip, box(0.08, 0.012, 0.03), CHROME, 0, 0.006, -0.14, { outline: false });
    const notebook = group(use);
    part(notebook, rbox(0.13, 0.012, 0.18, 0.004), '#ffb74d', 0, 0, 0);
    part(notebook, box(0.12, 0.004, 0.17), PAPER, 0, 0.008, 0, { outline: false });

    const mark = marker(g, 0, 0.6, 0);
    const spots: Record<string, Spot> = {
      manualTherapy: spotAt(g, PT.manualAt(0.34), 'stand', 'ptManual', mark),
      applyHeatPack: spotAt(g, PT.HEAT_AT, 'stand', 'ptHeat', mark),
      urgentRehab: spotAt(g, PT.POSTOP_AT, 'stand', 'ptPostOp', mark),
      physicalTherapist_observeTherapy: spotAt(g, PT.OBSERVE_AT, 'stand', 'ptObserve', mark),
      physicalTherapist_treatmentPlan: spotAt(g, PT.PLAN_AT, 'sit', 'ptPlan', mark),
      '*': spotAt(g, PT.manualAt(0.34), 'stand', 'ptManual', mark),
    };
    out.spots = spots;
    out.work = mark;

    // Lying on the back / face down, with the left leg's ankle (and toes), the left hand, the head.
    const lie = (b: Body, prone: boolean, ankleL: THREE.Vector3, toeL: THREE.Vector3 | null, handL: THREE.Vector3 | null, turn: number, nod = 0) => {
      const L = prone ? PT.PRONE : PT.SUPINE;
      const pel = V(L.pelvis);
      const upv = V(L.up);
      const fr = V(L.front);
      if (prone) {
        const toe = v3(0, -0.55, 1).normalize();
        b.set({ pelvis: pel, up: upv, front: fr, ankleL: v3(-0.09, top + 0.13, 0.76), ankleR: v3(0.09, top + 0.13, 0.76), poleL: v3(0, -1, 0), poleR: v3(0, -1, 0), toeL: toe, toeR: toe, handL: v3(-0.25, top + 0.05, -0.08), handR: v3(0.25, top + 0.05, -0.08), lift: -0.04, turn, nod });
        return;
      }
      const toeRest = v3(0.12, 1, 0.3).normalize();
      b.set({
        pelvis: pel,
        up: upv,
        front: fr,
        ankleL,
        ankleR: V(PT.legRom(PT.HIP_R, 0)),
        poleL: UP,
        poleR: UP,
        toeL: toeL ?? toeRest,
        toeR: v3(-0.12, 1, 0.3).normalize(),
        handL: handL ?? v3(0.25, top + 0.05, -0.1),
        handR: v3(-0.25, top + 0.05, -0.1),
        lift: 0.06,
        turn,
        nod,
      });
    };
    const blink = (b: Body, t: number) => b.eyes(Math.sin(t * 1.3 + n * 2) > 0.97 ? 1 : 0);
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const m = now?.motion as PT.PtMotion | undefined;
      const ph = phaseOf(mark);
      use.visible = !!m;
      pat.root.visible = postOp.root.visible = senior.root.visible = false;
      stool.visible = pack.visible = towel.visible = gonio.visible = clip.visible = notebook.visible = postTag.visible = false;
      pillow.visible = sheet.visible = true;
      bolster.visible = towels.visible = !m;
      lcdOn.visible = false;
      lcdOff.visible = true;
      puff(null, t);
      if (!m) return;
      const key = PT.ptKeyOf(m, t, ph).key;
      if (m === 'ptManual') {
        const b = PT.manualBeat(t, ph);
        const z = PT.manualZ(b);
        moveSpot(spots.manualTherapy, PT.manualAt(z));
        moveSpot(spots['*'], PT.manualAt(z));
        const phi = PT.manualPhi(b);
        pat.root.visible = true;
        const talk = PT.amountOf(b, 'greet') + PT.amountOf(b, 'rest');
        lie(pat, false, V(PT.legRom(PT.HIP_L, PT.manualKnee(b))), null, phi > 0.01 ? V(PT.armFlex(phi).hand) : null, 0.35 + 0.2 * talk);
        blink(pat, t);
        pat.mouth(talk * 0.5 * Math.max(0, Math.sin(t * 6.5)));
      } else if (m === 'ptHeat') {
        const b = PT.heatBeat(t, ph);
        const hp = PT.heatPack(b);
        pat.root.visible = true;
        pillow.visible = false;
        bolster.visible = true;
        bolster.position.z = 0.66;
        lie(pat, true, v3(0, 0, 0), null, null, PT.amountOf(b, 'check') * 0.3);
        pat.eyes(1);
        pack.visible = hp.shown;
        pack.position.copy(V(hp.at));
        pack.rotation.set(0, 0, 0);
        towel.visible = hp.towel;
        towel.rotation.z = 0.25 * hp.lift;
        towel.position.y = PT.PACK_ON[1] + 0.02 + 0.03 * hp.lift;
        puff(hp.shown && !hp.towel ? V(hp.at, 0, 0.02, 0) : null, t);
        const timed = b.from === 'wait' || b.from === 'off' || (b.from === 'timer' && b.p > 0.5);
        lcdOn.visible = timed;
        lcdOff.visible = !timed;
      } else if (m === 'ptPostOp') {
        const b = PT.postOpBeat(t, ph);
        const kb = PT.postOpKnee(b);
        postOp.root.visible = true;
        postTag.visible = true;
        lie(postOp, false, V(PT.legRom(PT.HIP_L, kb)), V(PT.toeOnBack(PT.postOpFoot(b, t))), null, 0.3);
        const wince = PT.amountOf(b, 'bend') * Math.min(1, kb * 4);
        postOp.eyes(Math.max(wince * 0.7, Math.sin(t * 1.1) > 0.97 ? 1 : 0));
        postOp.mouth(0.25 * wince + PT.amountOf(b, 'explain') * 0.4 * Math.max(0, Math.sin(t * 6)));
      } else if (m === 'ptObserve') {
        const kb = PT.observeKnee(t, ph);
        pat.root.visible = senior.root.visible = true;
        lie(pat, false, V(PT.legRom(PT.HIP_L, kb)), null, null, 0.3);
        blink(pat, t);
        const sk = PT.seniorKey(kb);
        standAt(senior, PT.SENIOR_AT, sk.lean, V(sk.l), V(sk.r), sk.nod);
        notebook.visible = true;
        notebook.position.copy(V(key.l, 0.07, 0.02, 0));
        notebook.rotation.set(0.45, Math.PI, 0);
      } else if (m === 'ptPlan') {
        const b = PT.planBeat(t, ph);
        const slide = PT.planSlide(b);
        pat.root.visible = stool.visible = true;
        lie(pat, false, V(PT.heelSlide(PT.HIP_L, slide)), v3(0.1, 1, 0.15).normalize(), null, 0.4 + 0.2 * PT.amountOf(b, 'explain'));
        blink(pat, t);
        pat.mouth(PT.amountOf(b, 'explain') * 0.3 * Math.max(0, Math.sin(t * 5)));
        const gon = PT.goniometer(slide);
        const measuring = PT.amountOf(b, 'measure') > 0.5;
        const reading = PT.amountOf(b, 'read') > 0.5;
        gonio.visible = measuring || reading;
        if (measuring) {
          gonio.position.copy(V(gon.at));
        } else {
          gonio.position.copy(V(key.l)).lerp(V(key.r), 0.5);
        }
        armA.quaternion.setFromUnitVectors(UP, V(gon.thigh));
        armB.quaternion.setFromUnitVectors(UP, V(gon.shin));
        clip.visible = true;
        if (measuring || reading) {
          clip.position.set(0.12, top + 0.005, 0.78);
          clip.rotation.set(0, 0.2, 0);
        } else {
          clip.position.copy(V(key.l, -0.1, -0.02, 0));
          clip.rotation.set(0.35, -Math.PI / 2, 0);
        }
      }
    };
  },

  /**
   * The exercise ball (재활 운동 기구): a 55 cm gym ball on a blue exercise mat, a balance pad and a
   * pair of cuff weights (모래주머니) on a little rack behind it, a coloured ring band hung on the
   * rack. Balance on the ball (guideExercise): a patient sat on it, the therapist half kneeling at
   * their left side, a hand at the front and the back of the hips — marching (a foot lifted, arms
   * out), reaching for the therapist's raised hand, little bounces, a rest. Sports taping: an athlete
   * on the ball, the therapist kneeling in front of the left knee: measured, torn, the Y strip round
   * the kneecap and the I strip under it laid on, rubbed in, the knee kicked out to try it.
   */
  exerciseBall(g, _W, _D, c, _def, _ctx, out) {
    const n = ballCount++;
    const color = n % 2 ? '#7e57c2' : c || '#ff8a65';
    part(g, rbox(0.92, 0.02, 0.92, 0.01), '#3f6fb5', 0, 0.01, 0, { outline: false });
    part(g, box(0.88, 0.003, 0.004), '#5c8ad0', 0, 0.021, 0.3, { outline: false });
    const ballG = group(g, PT.BALL.x, PT.BALL.r, PT.BALL.z);
    part(ballG, new THREE.SphereGeometry(PT.BALL.r, 28, 20), color, 0, 0, 0);
    part(ballG, ring(PT.BALL.r * 0.999, 0.004), shade(color, 0.8), 0, 0, 0, { rx: Math.PI / 2 });
    part(ballG, cyl(0.012, 0.012, 0.01, 8), shade(color, 0.6), 0.0, 0.0, PT.BALL.r, { rx: Math.PI / 2, outline: false });
    // The rack behind: cuff weights, a ring band; the balance pad on the mat.
    const rack = group(g, 0.33, 0, -0.38);
    for (const sx of [-1, 1]) part(rack, box(0.02, 0.5, 0.02), STEEL, sx * 0.1, 0.25, 0, { outline: false });
    part(rack, cyl(0.012, 0.012, 0.24, 8), STEEL, 0, 0.48, 0, { rz: Math.PI / 2, outline: false });
    for (const [x, col] of [[-0.05, '#ef5350'], [0.05, '#42a5f5']] as const) {
      part(rack, rbox(0.06, 0.16, 0.05, 0.02), col, x, 0.39, 0.02);
      part(rack, box(0.062, 0.03, 0.052), '#212121', x, 0.33, 0.02, { outline: false });
    }
    part(rack, ring(0.07, 0.008), '#fdd835', 0, 0.42, 0.04);
    part(rack, rbox(0.24, 0.1, 0.2, 0.03), '#eceff1', 0, 0.05, 0.05);
    label(rack, '1kg · 2kg', 0.14, 0.04, 0, 0.07, 0.152, '#eceff1', '#455a64');
    const pad = part(g, new THREE.SphereGeometry(0.16, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#26c6da', -0.32, 0.02, -0.33);
    pad.scale.set(1, 0.45, 1);

    const use = group(g);
    out.inUse = use;
    const lady = figure(use, LOOKS.ballLady);
    const athlete = figure(use, LOOKS.athlete);
    // The kinesiology tape: the Y strip (pink: its base, two tails), the I strip (blue), and one in the hands.
    const yBase = strip(use, 0.05, '#ff4f81');
    const yTail = [strip(use, 0.045, '#ff4f81'), strip(use, 0.045, '#ff4f81')];
    const yEnd = [strip(use, 0.045, '#ff4f81'), strip(use, 0.045, '#ff4f81')];
    const iStrip = strip(use, 0.05, '#2f80ed');
    const held = strip(use, 0.05, '#ff4f81');
    const roll = part(use, cyl(0.04, 0.04, 0.05, 14), '#ff4f81', 0, 0, 0, { rz: Math.PI / 2 });
    // The foam block the athlete's foot rests on while it's taped.
    const block = part(use, rbox(0.2, 0.14, 0.26, 0.03), '#ffb74d', PT.TAPE_BLOCK[0], PT.TAPE_BLOCK[1], PT.TAPE_BLOCK[2]);

    const mark = marker(g, 0, 0.5, 0);
    const spots: Record<string, Spot> = {
      guideExercise: spotAt(g, PT.BALL_AT, 'stand', 'ptBall', mark),
      physicalTherapist_sportsTaping: spotAt(g, PT.TAPE_AT, 'stand', 'ptTape', mark),
      '*': spotAt(g, PT.BALL_AT, 'stand', 'ptBall', mark),
    };
    out.spots = spots;
    out.work = mark;
    const Y = UP;
    const FRONT = v3(0, 0, 1);
    const a = new THREE.Vector3();
    const b2 = new THREE.Vector3();
    const nT = new THREE.Vector3();
    const nS = new THREE.Vector3();
    const lat = v3(1, 0, 0);
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const m = now?.motion as PT.PtMotion | undefined;
      const ph = phaseOf(mark);
      use.visible = !!m;
      lady.root.visible = athlete.root.visible = false;
      block.visible = false;
      ballG.scale.set(1, 1, 1);
      ballG.position.y = PT.BALL.r;
      if (!m) return;
      const key = PT.ptKeyOf(m, t, ph).key;
      // Sat on, the ball squashes a little.
      ballG.scale.set(1.02, 0.97, 1.02);
      ballG.position.y = PT.BALL.r * 0.97;
      if (m === 'ptBall') {
        const b = PT.ballBeat(t, ph);
        const s = PT.ballState(b, t);
        lady.root.visible = true;
        const pel = V(PT.BALL_SEAT, s.sway, s.bob, 0);
        const upv = v3(0.35 * s.reach + s.sway * 0.8, 1, 0.3 * s.reach).normalize();
        const fr = v3(0.2 * s.reach, -0.2 * s.reach, 1).normalize();
        const [fl, fr2] = PT.BALL_FEET;
        const ankleL = V(fl, 0, 0.22 * s.liftL, 0.06 * s.liftL);
        const ankleR = V(fr2, 0, 0.22 * s.liftR, 0.06 * s.liftR);
        // Arms out to the sides marching, on the thighs settling and resting, on the ball bouncing, to the target reaching.
        const outL = v3(0.6, 1.1, -0.06);
        const outR = v3(-0.6, 1.1, -0.06);
        lady.set({ pelvis: pel, up: upv, front: fr, ankleL, ankleR });
        const thighL = a.copy(lady.hip[0]).lerp(lady.knee[0], 0.6).add(v3(0.01, 0.07, 0)).clone();
        const thighR = b2.copy(lady.hip[1]).lerp(lady.knee[1], 0.6).add(v3(-0.01, 0.07, 0)).clone();
        const o = PT.amountOf(b, 'march');
        const bo = PT.amountOf(b, 'bounce');
        let hl = thighL.clone().lerp(outL, o).lerp(v3(0.3, 0.5, -0.12), bo);
        let hr = thighR.clone().lerp(outR, o).lerp(v3(-0.3, 0.5, -0.12), bo);
        if (s.reach > 0) {
          hl = hl.lerp(V(PT.BALL_TARGET, -0.02, 0, 0.03), s.reach);
          hr = hr.lerp(V(PT.BALL_TARGET, -0.08, -0.03, 0.02), s.reach);
        }
        lady.set({ pelvis: pel, up: upv, front: fr, ankleL, ankleR, handL: hl, handR: hr, turn: 0.4 * s.reach, nod: o * 0.15 });
        lady.eyes(Math.sin(t * 1.2) > 0.97 ? 1 : 0);
        lady.mouth(PT.amountOf(b, 'rest') * 0.3 * Math.max(0, Math.sin(t * 6)));
        return;
      }
      // Taping.
      const b = PT.tapeBeat(t, ph);
      const ts = PT.tapeState(b);
      athlete.root.visible = true;
      block.visible = ts.kick < 0.05;
      const pel = V(PT.BALL_SEAT);
      const back = v3(0, 1, -0.18).normalize();
      athlete.set({ pelvis: pel, up: back, front: v3(0, 0.18, 1), ankleL: V(PT.tapeAnkle(ts.kick)), ankleR: V(PT.BALL_FEET[1]), poleL: v3(0, 0.2, 1), handL: v3(0.3, 0.56, -0.2), handR: v3(-0.3, 0.56, -0.2), nod: 0.45, turn: 0 });
      athlete.eyes(Math.sin(t * 1.4) > 0.97 ? 1 : 0);
      // The tape on the knee: surfaces of the thigh's top and the shin's front.
      const hip = athlete.hip[0];
      const knee = athlete.knee[0];
      const ankle = V(PT.tapeAnkle(ts.kick));
      const dt = a.subVectors(knee, hip).normalize().clone();
      const ds = b2.subVectors(ankle, knee).normalize().clone();
      nT.copy(Y).addScaledVector(dt, -Y.dot(dt)).normalize();
      nS.copy(FRONT).addScaledVector(ds, -FRONT.dot(ds)).normalize();
      const nK = nT.clone().add(nS).normalize();
      const onThigh = (u: number) => hip.clone().lerp(knee, u).addScaledVector(nT, 0.066);
      const onShin = (u: number, side: number, r = 0.056) => knee.clone().lerp(ankle, u).addScaledVector(nS, r).addScaledVector(lat, side);
      const aroundKnee = (side: number) => knee.clone().addScaledVector(nK, 0.05).addScaledVector(lat, side * 0.065);
      const y = ts.y;
      const base0 = onThigh(0.5);
      const base1 = onThigh(0.86);
      const seg = (u: number, a0: number, a1: number) => THREE.MathUtils.clamp((u - a0) / (a1 - a0), 0, 1);
      yBase(base0, base0.clone().lerp(base1, seg(y, 0, 0.35)), nT).visible = y > 0.01;
      [1, -1].forEach((sd, i) => {
        const k = aroundKnee(sd);
        const tail = yTail[i](base1, base1.clone().lerp(k, seg(y, 0.35, 0.7)), nK);
        tail.visible = tail.visible && y > 0.35;
        const end = yEnd[i](k, k.clone().lerp(onShin(0.24, sd * 0.03), seg(y, 0.7, 1)), nS);
        end.visible = end.visible && y > 0.7;
      });
      const ic = onShin(0.16, 0, 0.06);
      iStrip(ic.clone().addScaledVector(lat, -0.085 * ts.i), ic.clone().addScaledVector(lat, 0.085 * ts.i), nS).visible = ts.i > 0.01;
      // In the hands while measuring and tearing; the roll on the mat otherwise.
      const hl = V(key.l);
      const hr = V(key.r);
      held(hl, hr, v3(0, 1, 0)).visible = ts.held;
      roll.position.set(0.32, 0.045, 0.36);
    };
  },

  /**
   * The stall bars (늑목) and bands: two bays of oak rungs between three uprights against the wall,
   * the top rung standing out; resistance bands looped on the rungs (yellow, red, green, blue, black)
   * and coiled on hooks, the band-strength chart on the left upright, a grey mat in front. Band
   * exercise (ptBandExercise): a patient stood on the mat facing out; shown how, then a chest press
   * against the green band looped on the rung behind (five times, a hand at their elbow), the red
   * band from the bars' end for external rotation with a towel roll under the right elbow (the elbow
   * kept in, the forearm turned out), a thumbs up.
   */
  ptStallBars(g, _W, _D, _c, _def, _ctx, out) {
    const z0 = PT.STALL.z;
    part(g, rbox(1.9, 0.02, 0.7, 0.01), '#78909c', 0, 0.01, 0.12, { outline: false });
    for (const x of [-0.92, 0, 0.92]) {
      part(g, rbox(0.07, 2.3, 0.09, 0.02), OAK_DARK, x, 1.15, z0);
      part(g, box(0.05, 0.04, 0.12), '#78909c', x, 2.1, z0 - 0.05, { outline: false });
    }
    for (let i = 0; i < 14; i++) {
      const y = 0.15 + i * 0.15;
      const out14 = i === 13 ? 0.08 : 0;
      part(g, cyl(0.017, 0.017, 0.86, 10), OAK, -0.46, y, z0 + out14, { rz: Math.PI / 2 });
      part(g, cyl(0.017, 0.017, 0.86, 10), OAK, 0.46, y, z0 + out14, { rz: Math.PI / 2 });
    }
    // Bands looped over rungs on the right bay, hanging; coils on hooks.
    const BANDS = ['#fdd835', '#e53935', '#43a047', '#1e88e5', '#424242'];
    BANDS.forEach((col, i) => {
      const x = 0.2 + i * 0.13;
      const y = 1.65 - (i % 2) * 0.15;
      part(g, ring(0.025, 0.008), col, x, y, z0 + 0.02, { ry: Math.PI / 2 });
      for (const dx of [-0.012, 0.012]) part(g, box(0.02, 0.5, 0.004), col, x + dx, y - 0.27, z0 + 0.03, { outline: false });
    });
    const idleGreen = group(g, PT.ANCHOR_PRESS[0], PT.ANCHOR_PRESS[1], z0 + 0.03);
    part(idleGreen, ring(0.025, 0.008), '#43a047', 0, 0, 0, { ry: Math.PI / 2 });
    for (const dx of [-0.02, 0.02]) part(idleGreen, box(0.025, 0.6, 0.004), '#43a047', dx, -0.31, 0.005, { outline: false });
    for (const [x, col] of [[-0.75, '#e53935'], [-0.62, '#1e88e5']] as const) {
      part(g, cyl(0.008, 0.008, 0.06, 6), STEEL, x, 1.95, z0 + 0.05, { rx: Math.PI / 2, outline: false });
      for (let k = 0; k < 3; k++) part(g, ring(0.05 - k * 0.008, 0.007), col, x, 1.9, z0 + 0.07 + k * 0.006);
    }
    // The chart on the left upright, a towel roll on the shelf.
    picture(g, painted('ptBandChart', 160, 220, paintBandChart), 0.3, 0.41, -0.6, 1.25, z0 + 0.05);
    part(g, rbox(0.34, 0.45, 0.01, 0.004), '#ffffff', -0.6, 1.25, z0 + 0.044);
    label(g, '늑목 · 밴드 운동', 0.5, 0.08, 0, 2.38, z0, '#00695c', '#ffffff');

    const use = group(g);
    out.inUse = use;
    const man = figure(use, LOOKS.bandMan);
    const green = [limb(use, 0.012, '#43a047'), limb(use, 0.012, '#43a047')];
    const red = limb(use, 0.012, '#e53935');
    const towelRoll = part(use, cyl(0.035, 0.035, 0.16, 12), '#ffffff', PT.ER_ELBOW[0] + 0.065, PT.ER_ELBOW[1] - 0.02, PT.ER_ELBOW[2] - 0.02, { rx: Math.PI / 2 });
    const mark = marker(g, 0, 1, 0);
    const s = spotAt(g, PT.BAND_AT, 'stand', 'ptBand', mark);
    out.spots = { ptBandExercise: s, '*': s };
    out.work = mark;
    const anchorP = V(PT.ANCHOR_PRESS);
    const anchorE = V(PT.ANCHOR_ER);
    out.animate = (t) => {
      const on = Math.abs(t - posedAt(s)) < 0.6;
      use.visible = on;
      idleGreen.visible = true;
      if (!on) return;
      const b = PT.bandBeat(t, phaseOf(mark));
      const bs = PT.bandState(b);
      let hl: THREE.Vector3 | null = V(PT.pressHand(1, bs.press));
      let hr: THREE.Vector3 = V(PT.pressHand(-1, bs.press));
      if (bs.red) {
        hl = null;
        hr = V(PT.erHand(bs.er));
      }
      if (b.from === 'praise') {
        hl = null;
        hr = v3(-0.22, 0.85, 0.36);
      }
      man.set({ pelvis: V(PT.BAND_HIP), up: v3(0, 1, 0.04), front: v3(0, 0, 1), ankleL: V(PT.BAND_FEET[0]), ankleR: V(PT.BAND_FEET[1]), toeL: v3(0.2, 0, 1), toeR: v3(-0.2, 0, 1), handL: hl, handR: hr, turn: bs.red ? -0.3 : -0.25, nod: 0.05 });
      man.eyes(Math.sin(t * 1.2) > 0.97 ? 1 : 0);
      man.mouth((bs.press + bs.er) * 0.3);
      idleGreen.visible = !bs.green;
      green.forEach((f, i) => {
        const hand = i === 0 ? hl : hr;
        f(anchorP, hand ?? anchorP).visible = bs.green && !!hand;
      });
      red(anchorE, hr).visible = bs.red;
      towelRoll.visible = bs.red;
    };
  },

  /**
   * The training stairs (계단 보행 훈련대): a wooden platform with two steps up to it from either end,
   * grey non-slip treads with yellow nosings, chrome handrails along both sides sloping down the
   * flights to the floor landings, the reminder card (올라갈 때 좋은 다리 먼저 · 내려갈 때 아픈 다리
   * 먼저) on the platform's front. Stair training (ptStairTraining): an elderly patient with a cane
   * and a gait belt climbs a step at a time leading with the good leg, the left hand on the rail;
   * along the platform; turned round; down leading with the bad leg and the cane; a rest at the
   * bottom. The therapist guards a step below on the low side, a hand at the belt and one by the
   * shoulder — behind going up, in front coming down.
   */
  ptStairs(g, _W, _D, _c, _def, _ctx, out) {
    const S = PT.STAIRS;
    const dz = 0.38;
    const WOOD = '#c9a77c';
    const TREAD = '#5d6d7e';
    // The platform and the steps at each end.
    const blocks: Array<[number, number, number]> = [[-0.65, 0.65, S.top], [0.65, 0.9, 0.28], [0.9, 1.15, 0.14], [-0.9, -0.65, 0.28], [-1.15, -0.9, 0.14]];
    for (const [x0, x1, h] of blocks) {
      const w = x1 - x0;
      part(g, rbox(w, h - 0.02, dz * 2, 0.01), WOOD, (x0 + x1) / 2, (h - 0.02) / 2, 0);
      part(g, box(w - 0.004, 0.02, dz * 2 - 0.02), TREAD, (x0 + x1) / 2, h - 0.01, 0, { outline: false });
      // The yellow nosing along each step's edge (the platform's at both ends).
      const noses = h === S.top ? [x0, x1] : [Math.abs(x0) > Math.abs(x1) ? x0 : x1];
      for (const nx of noses) part(g, box(0.035, 0.022, dz * 2 - 0.02), '#fdd835', nx - Math.sign(nx) * 0.0175, h - 0.009, 0, { outline: false });
    }
    // The landings' mats.
    for (const sx of [-1, 1]) part(g, rbox(0.34, 0.012, dz * 2, 0.005), '#455a64', sx * 1.33, 0.006, 0, { outline: false });
    // Handrails: posts and sloping rails on both sides.
    const posts = [-1.42, -0.95, -0.62, 0, 0.62, 0.95, 1.42];
    for (const rz of [-S.railZ, S.railZ]) {
      for (const x of posts) {
        const y0 = PT.levelAt(x);
        part(g, cyl(0.02, 0.02, PT.railAt(x) - y0, 10), CHROME, x, (PT.railAt(x) + y0) / 2, rz, { outline: false });
        part(g, cyl(0.035, 0.035, 0.015, 12), '#90a4ae', x, y0 + 0.008, rz, { outline: false });
      }
      for (let i = 0; i < posts.length - 1; i++) rod(g, v3(posts[i], PT.railAt(posts[i]), rz), v3(posts[i + 1], PT.railAt(posts[i + 1]), rz), 0.022, '#eceff1');
      for (const x of [-1.42, 1.42]) part(g, ball(0.03), '#eceff1', x, PT.railAt(x), rz);
    }
    // The reminder card and the sign on the front of the platform.
    picture(g, painted('ptStairRule', 240, 96, paintStairRule), 0.6, 0.24, 0, 0.22, dz + 0.006);
    part(g, rbox(0.64, 0.28, 0.008, 0.004), '#f9a825', 0, 0.22, dz + 0.001);
    label(g, '계단 보행 훈련', 0.36, 0.07, 0, 0.36, -dz - 0.004, '#00695c', '#ffffff', Math.PI);

    const use = group(g);
    out.inUse = use;
    const grandpa = figure(use, LOOKS.stairsGrandpa);
    gaitBelt(grandpa);
    const caneShaft = limb(use, 0.012, '#5d4037', true);
    const caneGrip = part(use, rbox(0.12, 0.025, 0.03, 0.012), '#3e2723', 0, 0, 0);
    const caneTip = part(use, cyl(0.018, 0.02, 0.03, 10), BLACK, 0, 0, 0, { outline: false });
    const mark = marker(g, 0, 1, 0);
    const s = spotAt(g, PT.stairsAt(0, 0).coach, 'stand', 'ptStairs', mark);
    out.spots = { ptStairTraining: s, '*': s };
    out.work = mark;
    out.animate = (t) => {
      const ph = phaseOf(mark);
      const w = PT.stairsAt(t, ph);
      moveSpot(s, w.coach);
      const on = Math.abs(t - posedAt(s)) < 0.6;
      use.visible = on;
      if (!on) return;
      const f = v3(Math.sin(w.yaw), 0, Math.cos(w.yaw));
      const grip = V(w.cane, 0, 0.84 - (w.cane[1] - PT.levelAt(w.cane[0])), 0);
      grandpa.set({
        pelvis: V(w.hip),
        up: v3(0, 1, 0).addScaledVector(f, 0.1),
        front: f,
        ankleL: V(w.footL),
        ankleR: V(w.footR),
        toeL: f,
        toeR: f,
        handL: V(w.rail),
        handR: grip.clone().add(v3(0, 0.03, 0)),
        nod: w.beat === 'walk' ? 0.35 : 0.1,
        turn: w.beat === 'rest' ? 0.5 : 0,
      });
      grandpa.eyes(Math.sin(t * 1.1) > 0.97 ? 1 : 0);
      grandpa.mouth(w.beat === 'rest' ? 0.3 * Math.max(0, Math.sin(t * 5)) : 0);
      caneShaft(V(w.cane, 0, 0.02, 0), grip);
      caneGrip.position.copy(grip).addScaledVector(f, 0.04);
      caneGrip.rotation.set(0, w.yaw - Math.PI / 2, 0);
      caneTip.position.copy(V(w.cane, 0, 0.015, 0));
    };
  },

  /**
   * The modality corner (물리치료기 코너): a two-shelf trolley with the combined unit on it — its
   * screen (간섭파 ICT · 초음파 US · the time left), dials and jacks with their leads, the ultrasound
   * head in its holder, the gel bottle, a tray of suction cups — and beside it a padded stool facing
   * a leaning rest with a pillow, the 물리치료 순서 notice on the wall over it. Ultrasound
   * (ptUltrasound): a patient sat leaning forward on the rest, their back to the room; gel squeezed
   * onto the shoulder blade, the head taken from its holder and moved in slow little circles, a
   * button on the panel pressed, the head put back. Interferential current (ptIct): four suction
   * cups pressed onto the lower back one by one (their leads back to the unit), the dial turned up, a
   * hand on the shoulder (찌릿찌릿한 느낌 괜찮으세요?), and taken off again.
   */
  ptModality(g, _W, _D, _c, _def, _ctx, out) {
    const M = PT.MOD;
    // The trolley.
    const cart = group(g, M.cartX, 0, -0.18);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        part(cart, box(0.025, 0.74, 0.025), STEEL, sx * 0.24, 0.41, sz * 0.2, { outline: false });
        caster(cart, sx * 0.22, sz * 0.18, 0.035);
      }
    for (const y of [0.22, 0.78]) part(cart, rbox(0.52, 0.025, 0.44, 0.01), '#eceff1', 0, y, 0);
    part(cart, cyl(0.014, 0.014, 0.44, 8), STEEL, -0.29, 0.9, 0, { rx: Math.PI / 2 });
    for (let i = 0; i < 3; i++) part(cart, rbox(0.14, 0.08, 0.1, 0.02), ['#e1f5fe', '#f1f8e9', '#fff3e0'][i], -0.15 + i * 0.15, 0.275, 0.05);
    // The unit: a cream box with a sloped panel facing the room.
    const unit = group(cart, 0, 0.79, 0);
    part(unit, rbox(0.46, 0.14, 0.34, 0.03), '#f5f1e6', 0, 0.07, -0.02);
    const panel = group(unit, 0, 0.14, 0.02);
    panel.rotation.x = -0.55;
    part(panel, rbox(0.46, 0.2, 0.05, 0.02), '#f5f1e6', 0, 0.1, -0.05);
    out.screen = litScreen(panel, painted('ptModScreen', 256, 160, paintModScreen), 0.26, 0.16, -0.06, 0.11, -0.022);
    for (let i = 0; i < 2; i++) {
      part(panel, cyl(0.025, 0.025, 0.025, 14), '#37474f', 0.14, 0.15 - i * 0.08, -0.02, { rx: Math.PI / 2 });
      part(panel, box(0.004, 0.02, 0.004), '#ffffff', 0.14, 0.16 - i * 0.08, -0.006, { outline: false });
    }
    glowing(panel, cyl(0.008, 0.008, 0.006, 8), '#76ff03', 0.2, 0.03, -0.024, Math.PI / 2);
    label(unit, '복합 물리치료기', 0.22, 0.04, 0, 0.05, 0.151, '#f5f1e6', '#3949ab');
    // Jacks with leads coiled over the front, the head's holder at the right, the gel, the cup tray.
    for (let i = 0; i < 4; i++) {
      const col = i % 2 ? BLACK : '#e53935';
      part(unit, cyl(0.008, 0.008, 0.015, 8), col, -0.16 + i * 0.04, 0.03, 0.155, { rx: Math.PI / 2, outline: false });
      part(cart, ring(0.06 + i * 0.006, 0.004, Math.PI), col, 0.0, 0.73, 0.23, { rz: Math.PI });
    }
    const holderAt = PT.HOLDER;
    const hx = holderAt[0] - M.cartX;
    const hz = holderAt[2] + 0.18;
    part(cart, cyl(0.03, 0.025, 0.08, 12), '#455a64', hx, 0.86, hz);
    const head = group(g);
    part(head, cyl(0.022, 0.03, 0.04, 14), '#eceff1', 0, 0.02, 0);
    part(head, cyl(0.015, 0.015, 0.12, 10), '#90a4ae', 0, 0.1, 0, { outline: false });
    const cord = limb(g, 0.005, '#37474f');
    const jack = v3(M.cartX + 0.1, 0.83, -0.18 + 0.16);
    const gel = group(g);
    part(gel, cyl(0.025, 0.025, 0.12, 12), '#29b6f6', 0, 0.06, 0);
    part(gel, cyl(0.008, 0.012, 0.03, 8), '#ffffff', 0, 0.135, 0, { outline: false });
    const gelHome = v3(M.cartX - 0.16, 0.92, -0.08);
    const tray = group(g, PT.CUP_TRAY[0], PT.CUP_TRAY[1] - 0.05, PT.CUP_TRAY[2]);
    part(tray, rbox(0.2, 0.03, 0.12, 0.01), '#cfd8dc', 0, 0, 0);
    const trayCups = [0, 1, 2, 3].map((i) => part(tray, cyl(0.03, 0.035, 0.035, 14), '#78909c', -0.07 + i * 0.047, 0.03, 0));
    // The stool, the leaning rest and its pillow, the notice on the wall.
    const stool = group(g, M.patX, 0, 0.1);
    part(stool, cyl(0.19, 0.19, 0.07, 18), '#5c6bc0', 0, M.seat - 0.035, 0);
    part(stool, cyl(0.025, 0.025, M.seat - 0.1, 8), CHROME, 0, (M.seat - 0.07) / 2 + 0.03, 0, { outline: false });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      rod(stool, v3(0, 0.06, 0), v3(Math.cos(a) * 0.2, 0.03, Math.sin(a) * 0.2), 0.011, '#455a64');
    }
    const rest = group(g, M.patX, 0, -0.34);
    part(rest, rbox(0.46, 0.04, 0.26, 0.015), '#eceff1', 0, M.rest - 0.07, 0);
    for (const sx of [-1, 1]) part(rest, box(0.03, M.rest - 0.09, 0.03), STEEL, sx * 0.2, (M.rest - 0.09) / 2, -0.08, { outline: false });
    part(rest, rbox(0.42, 0.07, 0.24, 0.03), '#4f7cac', 0, M.rest - 0.02, 0.0);
    picture(g, painted('ptModNotice', 200, 260, paintModNotice), 0.34, 0.44, M.patX, 1.55, -0.488);

    const use = group(g);
    out.inUse = use;
    const lady = figure(use, LOOKS.cartLady);
    const cups = [0, 1, 2, 3].map(() => {
      const c = group(use);
      part(c, cyl(0.03, 0.035, 0.035, 14), '#78909c', 0, 0, 0);
      part(c, cyl(0.02, 0.02, 0.012, 10), '#37474f', 0, 0.022, 0, { outline: false });
      return c;
    });
    const leads = [0, 1, 2, 3].map((i) => limb(use, 0.005, i % 2 ? BLACK : '#e53935'));
    const heldCup = group(use);
    part(heldCup, cyl(0.03, 0.035, 0.035, 14), '#78909c', 0, 0, 0);
    const gelBlob = part(use, ball(0.025), '#b3e5fc', PT.US_AT_BACK[0], PT.US_AT_BACK[1], PT.US_AT_BACK[2], { outline: false });
    gelBlob.scale.set(1, 0.4, 1);

    const mark = marker(g, 0, 0.8, 0);
    const us = spotAt(g, PT.MOD_AT, 'stand', 'ptUltrasound', mark);
    const ict = spotAt(g, PT.MOD_AT, 'stand', 'ptIct', mark);
    out.spots = { ptUltrasound: us, ptIct: ict, '*': us };
    out.work = mark;
    const MB = PT.MOD_BODY;
    const backN = V(MB.front).multiplyScalar(-1);
    const placeHead = (at: THREE.Vector3 | null) => {
      if (at) {
        head.position.copy(at);
        head.quaternion.setFromUnitVectors(v3(0, -1, 0), backN.clone().multiplyScalar(-1));
      } else {
        head.position.set(holderAt[0], 0.88, holderAt[2]);
        head.quaternion.identity();
      }
      cord(jack, head.position.clone().addScaledVector(UP, 0.12));
    };
    placeHead(null);
    gel.position.copy(gelHome);
    out.animate = (t) => {
      const now = nowAt(out.spots!, t);
      const m = now?.motion as PT.PtMotion | undefined;
      const ph = phaseOf(mark);
      use.visible = !!m;
      trayCups.forEach((c) => (c.visible = true));
      placeHead(null);
      gel.position.copy(gelHome);
      gel.rotation.set(0, 0, 0);
      if (!m) return;
      const key = PT.ptKeyOf(m, t, ph).key;
      lady.set({
        pelvis: V(MB.pelvis),
        up: V(MB.up),
        front: V(MB.front),
        ankleL: v3(M.patX - 0.12, 0.08, -0.14),
        ankleR: v3(M.patX + 0.12, 0.08, -0.14),
        poleL: v3(0, 0.3, -1),
        poleR: v3(0, 0.3, -1),
        toeL: v3(0, 0, -1),
        toeR: v3(0, 0, -1),
        handL: v3(M.patX - 0.1, M.rest + 0.05, -0.3),
        handR: v3(M.patX + 0.1, M.rest + 0.05, -0.28),
        nod: 0.55,
        turn: 0.35,
      });
      lady.eyes(Math.sin(t * 0.9) > 0.9 ? 1 : 0.4);
      let on = 0;
      let heldAt: PT.P | null = null;
      if (m === 'ptUltrasound') {
        const b = PT.usBeat(t, ph);
        if (PT.usHeadHeld(b)) placeHead(V(key.l, 0, -0.02, -0.04));
        if (PT.usGelHeld(b)) {
          gel.position.copy(V(key.l, 0, -0.07, 0));
          gel.rotation.set(Math.PI * 0.8, 0, 0);
        }
        gelBlob.visible = !(b.from === 'gel' && b.p < 0.5);
      } else {
        const b = PT.ictBeat(t, ph);
        const c = PT.ictCups(b);
        on = c.on;
        heldAt = c.held;
        gelBlob.visible = false;
        lady.mouth(PT.amountOf(b, 'ask') * 0.35 * Math.max(0, Math.sin(t * 6)));
      }
      const offTray = on + (heldAt ? 1 : 0);
      trayCups.forEach((c, i) => (c.visible = i >= offTray));
      cups.forEach((c, i) => {
        c.visible = i < on;
        if (!c.visible) return;
        c.position.copy(V(PT.CUPS[i]));
        c.quaternion.setFromUnitVectors(UP, backN);
      });
      leads.forEach((f, i) => (f(jack, i < on ? V(PT.CUPS[i]).addScaledVector(backN, 0.03) : jack).visible = i < on));
      heldCup.visible = !!heldAt;
      if (heldAt) heldCup.position.copy(V(heldAt));
    };
  },

  /**
   * The hot-pack heater (핫팩 가온기): a stainless tank on castors, the 70℃ dial and the power lamp
   * on its front, '화상 주의'; inside under the hinged lid, quilted khaki packs hung on a rack in the
   * steaming water; a tray beside it stacked with striped terry covers, one laid open. Getting a pack
   * ready (ptPrepHotPack): the lid lifted, a pack drawn up out of the water with the tongs and held to
   * drip, laid on its cover and the cover folded over, the lid shut, the wrapped pack picked up.
   */
  ptHotPack(g, _W, _D, _c, _def, _ctx, out) {
    const H = PT.HEATER;
    const hw = H.w / 2;
    const zc = (H.back + H.front) / 2;
    const dd = H.front - H.back;
    for (const sx of [-1, 1])
      for (const sz of [H.back + 0.04, H.front - 0.04]) {
        part(g, box(0.03, 0.2, 0.03), STEEL, H.x + sx * (hw - 0.04), 0.12, sz, { outline: false });
        caster(g, H.x + sx * (hw - 0.04), sz, 0.035);
      }
    part(g, rbox(H.w, H.top - 0.22, dd, 0.02), '#cfd8dc', H.x, (H.top + 0.22) / 2, zc);
    part(g, box(H.w - 0.06, 0.004, dd - 0.06), '#9fb0ba', H.x, H.top + 0.001, zc, { outline: false });
    // The water inside (seen with the lid up), the packs on their rack.
    const inside = group(g);
    glass(inside, box(H.w - 0.07, 0.01, dd - 0.07), H.x, 0.74, zc, WATER);
    part(inside, cyl(0.01, 0.01, H.w - 0.08, 8), STEEL, H.x, 0.8, zc - 0.05, { rz: Math.PI / 2, outline: false });
    const KHAKI = '#a68d5b';
    const packs: THREE.Object3D[] = [];
    for (let i = 0; i < 4; i++) {
      const p = group(inside, H.x - 0.15 + i * 0.1, 0.62, -0.2);
      part(p, rbox(0.035, 0.24, 0.26, 0.015), KHAKI, 0, 0, 0);
      for (let k = 0; k < 3; k++) part(p, box(0.037, 0.004, 0.24), shade(KHAKI, 0.8), 0, -0.08 + k * 0.08, 0, { outline: false });
      part(p, ring(0.02, 0.004), STEEL, 0, 0.13, 0);
      packs.push(p);
    }
    // The front: the dial, the lamp, the switch, the labels.
    picture(g, painted('ptDial', 96, 96, paintDial), 0.12, 0.12, H.x - 0.12, 0.62, H.front + 0.003);
    part(g, ring(0.062, 0.008), CHROME, H.x - 0.12, 0.62, H.front + 0.004);
    glowing(g, cyl(0.014, 0.014, 0.01, 10), '#ff5252', H.x + 0.08, 0.66, H.front + 0.005, Math.PI / 2);
    part(g, rbox(0.05, 0.03, 0.02, 0.008), '#37474f', H.x + 0.16, 0.66, H.front + 0.008);
    label(g, '핫팩 가온기', 0.22, 0.05, H.x + 0.08, 0.52, H.front + 0.003, '#cfd8dc', '#37474f');
    label(g, '⚠ 화상 주의', 0.18, 0.045, H.x, 0.4, H.front + 0.003, '#ffd54f', '#bf360c');
    // The lid on its hinge at the back.
    const lid = group(g, H.x, H.top + 0.012, H.back);
    part(lid, rbox(H.w + 0.02, 0.025, dd + 0.01, 0.01), '#b0bec5', 0, 0, dd / 2);
    part(lid, rbox(0.14, 0.025, 0.03, 0.01), '#37474f', 0, 0.02, dd - 0.01);
    // The tray with the covers.
    const tray = group(g, H.trayX, 0, H.trayZ);
    part(tray, cyl(0.02, 0.02, H.trayTop - 0.04, 8), STEEL, 0, (H.trayTop - 0.04) / 2, -0.1, { outline: false });
    part(tray, cyl(0.12, 0.12, 0.02, 14), '#455a64', 0, 0.01, -0.1, { outline: false });
    part(tray, rbox(0.3, 0.02, 0.44, 0.01), '#eceff1', 0, H.trayTop - 0.03, 0);
    for (let i = 0; i < 3; i++) {
      part(tray, rbox(0.24, 0.035, 0.14, 0.015), TERRY, 0, H.trayTop + 0.0 + i * 0.035, -0.15);
      part(tray, box(0.242, 0.006, 0.02), '#ef9a9a', 0, H.trayTop + 0.004 + i * 0.035, -0.15, { outline: false });
    }
    // The cover laid open on the tray, its far half hanging over the tray's edge till it's folded over the pack.
    const cover = group(g, PT.PACK_TRAY[0], H.trayTop - 0.015, PT.PACK_TRAY[2]);
    part(cover, box(0.28, 0.008, 0.3), TERRY, 0, 0, 0, { outline: false });
    for (let i = 0; i < 3; i++) part(cover, box(0.28, 0.002, 0.02), '#ef9a9a', 0, 0.005, -0.1 + i * 0.1, { outline: false });
    const flap = group(cover, 0.14, 0.012, 0);
    part(flap, box(0.28, 0.008, 0.3), TERRY, 0.14, 0, 0, { outline: false });
    for (let i = 0; i < 3; i++) part(flap, box(0.28, 0.002, 0.02), '#ef9a9a', 0.14, 0.005, -0.1 + i * 0.1, { outline: false });
    const FLAP_DOWN = -Math.PI / 2;
    const puff = steam(g, 0.035);

    const use = group(g);
    out.inUse = use;
    const pack = group(use);
    part(pack, rbox(0.035, 0.24, 0.26, 0.015), KHAKI, 0, 0, 0);
    const wrapped = part(pack, rbox(0.05, 0.26, 0.28, 0.02), TERRY, 0, 0, 0);
    const tongs = group(use);
    for (const s of [-1, 1]) part(tongs, box(0.008, 0.26, 0.012), CHROME, s * 0.012, -0.13, 0, { rz: s * 0.06, outline: false });
    const mark = marker(g, 0, 0.8, 0);
    const s = spotAt(g, PT.HP_AT, 'stand', 'ptHotPack', mark);
    out.spots = { ptPrepHotPack: s, '*': s };
    out.work = mark;
    out.animate = (t) => {
      const on = Math.abs(t - posedAt(s)) < 0.6;
      use.visible = on;
      inside.visible = on;
      lid.rotation.x = 0;
      flap.rotation.z = FLAP_DOWN;
      cover.visible = true;
      packs[1].visible = true;
      puff(null, t);
      if (!on) return;
      const ph = phaseOf(mark);
      const b = PT.hotBeat(t, ph);
      const hs = PT.hotState(b, t);
      const key = PT.ptKeyOf('ptHotPack', t, ph).key;
      lid.rotation.x = -hs.lid;
      inside.visible = hs.lid > 0.05;
      const out1 = b.from !== 'lid';
      packs[1].visible = !out1;
      pack.visible = out1;
      pack.position.copy(V(hs.pack));
      // Hung upright out of the water; laid flat on the cover; carried flat in both hands, wrapped.
      const flat = b.from === 'wrap' ? THREE.MathUtils.smoothstep(b.e > 0 ? 1 : b.p, 0, 0.25) : b.from === 'close' || b.from === 'carry' ? 1 : 0;
      pack.rotation.set(0, 0, (Math.PI / 2) * flat);
      const done = b.from === 'close' || b.from === 'carry' || (b.from === 'wrap' && b.e > 0.5);
      wrapped.visible = done;
      cover.visible = !done;
      flap.rotation.z = mix(FLAP_DOWN, Math.PI * 0.97, hs.wrap);
      tongs.visible = hs.tongs;
      if (hs.tongs) tongs.position.copy(V(key.r, 0, 0.0, -0.06));
      puff(hs.lid > 0.4 ? v3(H.x, 0.82, zc) : b.from === 'drip' || b.from === 'lift' ? V(hs.pack, 0, 0.1, 0) : null, t);
    };
  },

  /**
   * A skeleton model (인체 골격 모형) on its castored stand: the skull and jaw, the spine's
   * vertebrae down to the pelvis, the ribs, the shoulder girdle, arms and legs, the kneecaps; the
   * stand's label. For explaining an injury; set dressing.
   */
  ptSkeleton(g) {
    const BONE = '#efe6d2';
    const JOINT = '#d9cdb2';
    const base = group(g, 0, 0, 0.05);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      rod(base, v3(0, 0.07, 0), v3(Math.cos(a) * 0.28, 0.04, Math.sin(a) * 0.28), 0.014, '#455a64');
      part(base, ball(0.028), BLACK, Math.cos(a) * 0.28, 0.028, Math.sin(a) * 0.28, { outline: false });
    }
    part(base, cyl(0.016, 0.016, 1.8, 8), CHROME, 0, 0.92, -0.16, { outline: false });
    part(base, box(0.03, 0.03, 0.18), CHROME, 0, 1.78, -0.08, { outline: false });
    label(base, '인체 골격 모형', 0.24, 0.06, 0, 0.12, 0.02, '#00695c', '#ffffff');
    const sk = group(g, 0, 0, 0.05);
    // The skull, the jaw, the eye holes.
    part(sk, ball(0.1), BONE, 0, 1.68, 0);
    part(sk, rbox(0.12, 0.06, 0.1, 0.03), BONE, 0, 1.58, 0.02);
    for (const sx of [-1, 1]) part(sk, ball(0.022), '#5d4b3b', sx * 0.036, 1.69, 0.085, { outline: false });
    part(sk, box(0.06, 0.012, 0.01), '#5d4b3b', 0, 1.6, 0.07, { outline: false });
    // The spine and its vertebrae.
    for (let i = 0; i < 18; i++) part(sk, cyl(0.022, 0.022, 0.025, 8), i % 2 ? JOINT : BONE, 0, 1.52 - i * 0.033, -0.03 + 0.012 * Math.sin(i * 0.35), { outline: false });
    // The ribs (rings narrowing down), the sternum, the collarbones.
    for (let i = 0; i < 6; i++) {
      const r = 0.12 - Math.abs(i - 1.5) * 0.008;
      const rib = part(sk, ring(r, 0.008), BONE, 0, 1.4 - i * 0.045, 0.0, { rx: Math.PI / 2 + 0.25 });
      rib.scale.set(1, 0.75, 1);
    }
    part(sk, box(0.025, 0.2, 0.012), BONE, 0, 1.33, 0.09, { outline: false });
    for (const sx of [-1, 1]) rod(sk, v3(0.02 * sx, 1.45, 0.06), v3(0.16 * sx, 1.47, 0.0), 0.011, BONE);
    // The pelvis.
    part(sk, new THREE.TorusGeometry(0.1, 0.03, 8, 18), BONE, 0, 0.95, 0, { rx: Math.PI / 2 + 0.3 }).scale.set(1.2, 1, 0.8);
    // Arms and legs.
    for (const sx of [-1, 1]) {
      part(sk, ball(0.03), JOINT, sx * 0.17, 1.45, 0);
      rod(sk, v3(sx * 0.17, 1.45, 0), v3(sx * 0.2, 1.17, 0.02), 0.016, BONE);
      part(sk, ball(0.022), JOINT, sx * 0.2, 1.17, 0.02);
      rod(sk, v3(sx * 0.2, 1.17, 0.02), v3(sx * 0.22, 0.93, 0.06), 0.011, BONE);
      rod(sk, v3(sx * 0.215, 1.17, 0.0), v3(sx * 0.235, 0.93, 0.03), 0.009, BONE);
      for (let k = 0; k < 4; k++) rod(sk, v3(sx * (0.215 + k * 0.008), 0.92, 0.05), v3(sx * (0.22 + k * 0.012), 0.83, 0.07), 0.005, BONE);
      part(sk, ball(0.032), JOINT, sx * 0.1, 0.9, 0);
      rod(sk, v3(sx * 0.1, 0.9, 0), v3(sx * 0.09, 0.5, 0.0), 0.02, BONE);
      part(sk, ball(0.03), JOINT, sx * 0.09, 0.5, 0.0);
      part(sk, ball(0.02), BONE, sx * 0.09, 0.5, 0.035);
      rod(sk, v3(sx * 0.09, 0.5, 0), v3(sx * 0.085, 0.14, -0.01), 0.016, BONE);
      rod(sk, v3(sx * 0.115, 0.48, -0.01), v3(sx * 0.11, 0.14, -0.02), 0.008, BONE);
      part(sk, rbox(0.06, 0.03, 0.15, 0.012), BONE, sx * 0.09, 0.12, 0.04);
    }
  },
};
