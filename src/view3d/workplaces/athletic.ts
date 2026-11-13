import * as THREE from 'three';
import { marker, rod, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, gradient, part, rbox } from '../toon';
import { CHROME, STEEL, WATER, glass, glowing, label, painted, picture, ring, text, type Paint } from './doctor';
import * as A from './athleticMotion';
import { fenceRun } from './busDriver';

/**
 * The 스포츠 구단 훈련장 drawn as itself (2026-10-27 workplace pipeline, at the user's request): the
 * training ground of 솔뫼 FC (green and white, of the made-up 누리 리그). The sprint lane with its
 * starting blocks, the start lights and the finish clock, sprinted from a crouch (제자리에 — 차렷 —
 * 탕!), the time stopping on the clock as they cross the line; the obstacle course (tyres, a hurdle, a
 * crawl net) and the pull-up bar, plain enough for the 군 기지 too; the weight racks — a half rack for
 * the back squat, a bench press station — lifted at, or a junior spotted and a member's programme
 * written up while they lift; the tactics board on its wheels (the magnets moved, a run drawn and
 * wiped, the opponent's shape copied off a tablet, a team talk given to the players on their bench);
 * the physio table with the physio at the leg (the hamstring stretched, the knee bent, the calf
 * worked); the team bus (a coach in the club's colours, its luggage bay loaded, driven off to the
 * match and backed in again). And what it was missing (workFurniture/athletic.ts): the agility zone
 * (the ladder, the cones and a little goal; the coach and the 기본기), the ice bath, the players'
 * bench, the lockers with the shirts hung in them, the water station and the trophy cabinet.
 *
 * Everything moves by the clock of the spot it's used from (athleticMotion.ts athPhase), the same as
 * the dweller's body, so the bar goes down as they squat, the ball goes in as they shoot.
 */

const CLUB = '솔뫼 FC';
const GREEN = '#1f8a4c';
const GREEN_DARK = '#13643a';
const WHITE = '#f7f7f2';
const TRACK = '#c4553f';
const TURF = '#3d8c45';
const SKIN = '#ecc6a3';
const UP = new THREE.Vector3(0, 1, 0);
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const mix = (a: number, b: number, e: number) => a + (b - a) * e;

// ---------------------------------------------------------------------------------------------
// Small parts.

function group(parent: THREE.Object3D, x = 0, y = 0, z = 0, ry = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}
/** A group for something carried about, hidden until it's put somewhere. */
function loose(parent: THREE.Object3D): THREE.Group {
  const m = group(parent);
  m.visible = false;
  return m;
}
/** Put a loose thing at `p` (hidden if there's nowhere), turned `yaw`. */
function placeAt(m: THREE.Object3D, p: THREE.Vector3 | null | undefined, yaw = 0, pitch = 0) {
  m.visible = !!p;
  if (!p) return;
  m.position.copy(p);
  m.rotation.set(pitch, yaw, 0, 'YXZ');
}
/** A cylinder stretched between two points each frame (an arm, a leg, a jet of water). */
function limb(g: THREE.Object3D, r: number, color: string | THREE.Material, outline = false): (a: THREE.Vector3 | null, b?: THREE.Vector3) => THREE.Mesh {
  const m = typeof color === 'string' ? part(g, cyl(r, r * 0.92, 1, 10), color, 0, 0, 0, { outline }) : part(g, cyl(r, r, 1, 8), '#ffffff', 0, 0, 0, { outline: false, shadow: false, material: color });
  const d = new THREE.Vector3();
  return (a, b) => {
    m.visible = !!a && !!b;
    if (!a || !b) return m;
    d.subVectors(b, a);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.scale.set(1, Math.max(0.001, d.length()), 1);
    m.quaternion.setFromUnitVectors(UP, d.normalize());
    return m;
  };
}
/** A bubble of words over something, turned to the camera. */
const paintBubble = (s: string, size = 40): Paint => (c) => {
  c.clearRect(0, 0, 512, 160);
  c.fillStyle = '#ffffff';
  c.strokeStyle = '#3b2b2b';
  c.lineWidth = 6;
  c.beginPath();
  c.roundRect(8, 8, 496, 112, 40);
  c.fill();
  c.stroke();
  c.beginPath();
  c.moveTo(220, 118);
  c.lineTo(250, 152);
  c.lineTo(270, 118);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = '#ffffff';
  c.fillRect(222, 110, 46, 12);
  text(c, s, 256, 66, size, '#263238', 'center');
};
function bubble(parent: THREE.Object3D, s: string, w: number, size = 40): THREE.Sprite {
  const mat = new THREE.SpriteMaterial({ map: painted(`athBubble|${s}`, 512, 160, paintBubble(s, size)), transparent: true, depthWrite: false });
  const sp = new THREE.Sprite(mat);
  sp.userData.ownMaterial = true;
  sp.scale.set(w, w * 0.3125, 1);
  sp.renderOrder = 5;
  sp.visible = false;
  parent.add(sp);
  return sp;
}
/** A face whose words change as it's told (a clock, a timer); blank outside a browser. */
function liveText(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, ry: number, fg: string, bg = '#0d0f12', px = 128): (s: string) => void {
  const cw = px;
  const ch = Math.round((px * h) / w);
  const canvas = typeof document === 'undefined' ? null : document.createElement('canvas');
  const tex = canvas ? new THREE.CanvasTexture(canvas) : new THREE.Texture();
  if (canvas) {
    canvas.width = cw;
    canvas.height = ch;
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
  mesh.userData.ownGeometry = mesh.userData.ownMaterial = true;
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  g.add(mesh);
  let last = '\u0000';
  return (s) => {
    if (s === last || !canvas) return;
    last = s;
    const c = canvas.getContext('2d')!;
    c.fillStyle = bg;
    c.fillRect(0, 0, cw, ch);
    text(c, s, cw / 2, ch / 2 + 1, Math.round(ch * 0.7), fg, 'center');
    tex.needsUpdate = true;
  };
}
/** A flat picture lying on the floor (a painted number, a line). */
function onFloor(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, z: number, ry = 0, y = 0.046): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.rotation.set(-Math.PI / 2, ry, 0, 'YXZ');
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

// ---------------------------------------------------------------------------------------------
// Whose spot it is, and points in its frame.

const tmp = new THREE.Vector3();
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
/** Whether a dweller's posed at a spot just now (activity.ts spotPose marks it). */
const posed = (s: Spot, t: number) => Math.abs(t - posedAt(s)) < 0.6;
/** How tall the one posed there is, against a 1.6 m body. */
const kOf = (s: Spot) => ((s.at.userData.height as number | undefined) ?? 1.6) / 1.6;
const phaseOf = (s: Spot) => A.athPhase(s.at.getWorldPosition(tmp));
/** A spot at (x, z) facing `yaw` for a motion of ours (its work mark over it). */
function use(g: THREE.Object3D, motion: A.AthMotion, x: number, z: number, yaw: number): Spot {
  const s = spot(g, 'stand', x, 0, z, yaw);
  s.motion = motion;
  s.work = marker(g, x, 1, z);
  return s;
}
/** A point in a spot's frame (+x the dweller's left, +z the way it faces), in the piece's. */
function at(s: Spot, p: A.P3): THREE.Vector3 {
  return new THREE.Vector3(p.x, p.y, p.z).applyAxisAngle(UP, s.at.rotation.y).add(s.at.position);
}
/** Of a piece's spots, the one used just now (the latest), if any. */
function nowAt(spots: Spot[], t: number): Spot | null {
  let best: Spot | null = null;
  for (const s of spots) if (posed(s, t) && (!best || posedAt(s) > posedAt(best))) best = s;
  return best;
}

// ---------------------------------------------------------------------------------------------
// People drawn in: the physio, the coach, a junior and a gym member lifting, the players on their bench.

interface Look {
  top: string;
  bottom: string;
  hair: string;
  hairdo: 'short' | 'buzz' | 'pony' | 'bob';
  skin?: string;
  shoes?: string;
  socks?: string;
  shorts?: boolean;
  shortSleeves?: boolean;
  /** A number on the back and the chest (a club shirt), a stripe down the sleeves (a tracksuit). */
  number?: string;
  trim?: string;
  /** A whistle on its cord, a cap. */
  whistle?: boolean;
  cap?: string;
}
const KIT: Look = { top: GREEN, bottom: '#1b1b1f', hair: '#1a1a1a', hairdo: 'short', shorts: true, shortSleeves: true, socks: WHITE, shoes: '#fafafa', trim: WHITE };
const LOOKS = {
  physio: { top: '#eceff1', bottom: '#263238', hair: '#3b2a20', hairdo: 'pony', shoes: '#ffffff', trim: GREEN, shortSleeves: true, number: '' } as Look,
  coach: { top: '#263159', bottom: '#263159', hair: '#1a1a1a', hairdo: 'short', shoes: '#212121', trim: WHITE, whistle: true, cap: GREEN_DARK } as Look,
  junior: { ...KIT, number: '27', hairdo: 'buzz', skin: '#e3b48c' } as Look,
  member: { top: '#9e9e9e', bottom: '#212121', hair: '#5b3a1e', hairdo: 'bob', shoes: '#ec407a', shortSleeves: true } as Look,
  bench: [
    { ...KIT, number: '9', hair: '#2b1b10' },
    { ...KIT, number: '14', hairdo: 'buzz', skin: '#d9a77c' },
    { ...KIT, number: '21', hair: '#4e342e', hairdo: 'pony' },
  ] as Look[],
};
interface FigPose {
  /** The hip line's middle, the way up the trunk, the way the chest faces. */
  pelvis: THREE.Vector3;
  up: THREE.Vector3;
  front: THREE.Vector3;
  ankleL: THREE.Vector3;
  ankleR: THREE.Vector3;
  /** Which way each knee bends, where the toes point (default: the front). */
  poleL?: THREE.Vector3;
  poleR?: THREE.Vector3;
  toe?: THREE.Vector3;
  handL?: THREE.Vector3 | null;
  handR?: THREE.Vector3 | null;
  nod?: number;
  turn?: number;
}
interface Fig {
  root: THREE.Group;
  set(p: FigPose): void;
}
const THIGH = 0.42;
const SHIN = 0.41;
/** Someone drawn in, every joint put where it's wanted each pose (the knees and elbows worked out from the ankles and hands). */
function figure(parent: THREE.Object3D, look: Look): Fig {
  const root = group(parent);
  const skin = look.skin ?? SKIN;
  const trunk = group(root);
  part(trunk, rbox(0.31, 0.17, 0.23, 0.06), look.bottom, 0, 0.02, 0);
  part(trunk, rbox(0.34, 0.44, 0.21, 0.08), look.top, 0, 0.28, 0);
  if (look.trim) for (const sx of [-1, 1]) part(trunk, box(0.02, 0.4, 0.214), look.trim, sx * 0.165, 0.28, 0, { outline: false });
  if (look.number) {
    label(trunk, look.number, 0.13, 0.13, 0, 0.3, -0.107, look.top, WHITE, Math.PI);
    label(trunk, look.number, 0.07, 0.07, -0.08, 0.38, 0.107, look.top, WHITE);
    part(trunk, ball(0.022), WHITE, 0.08, 0.38, 0.106, { outline: false }).scale.set(1, 1, 0.3);
  }
  if (look.whistle) {
    part(trunk, ring(0.1, 0.004), '#eceff1', 0, 0.44, 0.02, { rx: 0.5, outline: false });
    part(trunk, rbox(0.03, 0.02, 0.045, 0.008), '#cfd8dc', 0, 0.36, 0.115);
  }
  part(trunk, cyl(0.045, 0.05, 0.08, 10), skin, 0, 0.53, 0, { outline: false });
  const head = group(trunk, 0, 0.67, 0);
  head.rotation.order = 'YXZ';
  part(head, ball(0.112), skin, 0, 0, 0);
  for (const sx of [-1, 1]) part(head, box(0.022, 0.016, 0.006), '#2b2b30', sx * 0.04, 0.0, 0.106, { outline: false });
  part(head, box(0.034, 0.01, 0.006), '#8d4f47', 0, -0.05, 0.104, { outline: false });
  switch (look.hairdo) {
    case 'buzz':
      part(head, ball(0.115), look.hair, 0, 0.02, -0.02);
      part(head, ball(0.104), skin, 0, 0.0, 0.02, { outline: false });
      break;
    case 'pony':
      part(head, ball(0.12), look.hair, 0, 0.03, -0.03);
      part(head, rbox(0.2, 0.06, 0.06, 0.02), look.hair, 0, 0.075, 0.07, { rx: -0.3 });
      part(head, rbox(0.06, 0.2, 0.06, 0.03), look.hair, 0, -0.06, -0.14, { rx: 0.3 });
      break;
    case 'bob':
      part(head, ball(0.122), look.hair, 0, 0.025, -0.02);
      part(head, rbox(0.26, 0.13, 0.2, 0.05), look.hair, 0, -0.04, -0.03);
      break;
    default:
      part(head, ball(0.118), look.hair, 0, 0.03, -0.03);
      part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0, 0.075, 0.075, { rx: -0.25 });
  }
  if (look.cap) {
    part(head, cyl(0.122, 0.122, 0.07, 16), look.cap, 0, 0.07, -0.005);
    part(head, rbox(0.17, 0.012, 0.11, 0.005), look.cap, 0, 0.045, 0.13);
  }
  const bare = look.shorts ? skin : look.bottom;
  const legs = [0, 1].map(() => ({
    thigh: limb(root, 0.062, bare),
    shortsLeg: look.shorts ? limb(root, 0.074, look.bottom) : null,
    shin: limb(root, 0.05, bare),
    sock: look.socks ? limb(root, 0.054, look.socks) : null,
    foot: part(root, rbox(0.095, 0.07, 0.22, 0.03), look.shoes ?? '#424242', 0, 0, 0),
  }));
  const arms = [0, 1].map(() => ({
    upper: limb(root, 0.042, look.shortSleeves ? skin : look.top),
    cuff: look.shortSleeves ? limb(root, 0.054, look.top) : null,
    fore: limb(root, 0.035, look.shortSleeves ? skin : look.top),
    hand: part(root, ball(0.036), skin, 0, 0, 0, { outline: false }),
  }));
  const left = new THREE.Vector3();
  const up = new THREE.Vector3();
  const front = new THREE.Vector3();
  const m4 = new THREE.Matrix4();
  const hip = [new THREE.Vector3(), new THREE.Vector3()];
  const knee = new THREE.Vector3();
  const d = new THREE.Vector3();
  const bend = new THREE.Vector3();
  const a0 = new THREE.Vector3();
  const a1 = new THREE.Vector3();
  const top = new THREE.Vector3();
  const side = new THREE.Vector3();
  const elbow = new THREE.Vector3();
  const sh = new THREE.Vector3();
  const hand = new THREE.Vector3();
  const toe = new THREE.Vector3();
  const solveLeg = (i: number, ankle: THREE.Vector3, pole: THREE.Vector3) => {
    const L = legs[i];
    const h = hip[i];
    d.subVectors(ankle, h);
    const len = Math.min(THIGH + SHIN - 0.005, Math.max(0.1, d.length()));
    d.normalize();
    const cosA = THREE.MathUtils.clamp((THIGH ** 2 + len * len - SHIN ** 2) / (2 * THIGH * len), -1, 1);
    bend.copy(pole).addScaledVector(d, -pole.dot(d)).normalize();
    knee.copy(h).addScaledVector(d, THIGH * cosA).addScaledVector(bend, THIGH * Math.sqrt(1 - cosA * cosA));
    a1.copy(h).addScaledVector(d, len);
    L.thigh(h, knee);
    L.shin(knee, a1);
    if (L.shortsLeg) L.shortsLeg(h, a0.lerpVectors(h, knee, 0.45));
    if (L.sock) L.sock(a0.lerpVectors(knee, a1, 0.7), a1);
    top.copy(up).addScaledVector(toe, -up.dot(toe));
    if (top.lengthSq() < 1e-4) top.copy(front);
    top.normalize();
    side.crossVectors(top, toe).normalize();
    m4.makeBasis(side, top, toe);
    L.foot.quaternion.setFromRotationMatrix(m4);
    L.foot.position.copy(a1).addScaledVector(toe, 0.05).addScaledVector(top, -0.04);
  };
  const solveArm = (i: number, to: THREE.Vector3 | null | undefined) => {
    const Ar = arms[i];
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
    Ar.upper(sh, elbow);
    if (Ar.cuff) Ar.cuff(sh, a0.lerpVectors(sh, elbow, 0.45));
    Ar.fore(elbow, hand);
    Ar.hand.position.copy(hand);
  };
  return {
    root,
    set(p) {
      up.copy(p.up).normalize();
      front.copy(p.front).addScaledVector(up, -p.front.dot(up)).normalize();
      left.crossVectors(up, front).normalize();
      m4.makeBasis(left, up, front);
      trunk.quaternion.setFromRotationMatrix(m4);
      trunk.position.copy(p.pelvis);
      head.rotation.set(p.nod ?? 0, p.turn ?? 0, 0);
      hip[0].copy(p.pelvis).addScaledVector(left, 0.09);
      hip[1].copy(p.pelvis).addScaledVector(left, -0.09);
      toe.copy(p.toe ?? front).normalize();
      solveLeg(0, p.ankleL, p.poleL ?? front);
      solveLeg(1, p.ankleR, p.poleR ?? front);
      solveArm(0, p.handL);
      solveArm(1, p.handR);
    },
  };
}
/** Stood with the feet at (x, z) facing `yaw`, bent forward `lean`, knees bent `crouch` (0–1), the hands where they're put. */
function standAt(f: Fig, x: number, z: number, yaw: number, lean: number, hl: THREE.Vector3 | null, hr: THREE.Vector3 | null, nod = 0.2, crouch = 0, turn = 0) {
  const fw = v3(Math.sin(yaw), 0, Math.cos(yaw));
  const l = v3(Math.cos(yaw), 0, -Math.sin(yaw));
  const pel = v3(x, 0.87 - 0.3 * crouch, z).addScaledVector(fw, -0.12 * crouch);
  f.set({
    pelvis: pel,
    up: UP.clone().multiplyScalar(Math.cos(lean)).addScaledVector(fw, Math.sin(lean)),
    front: fw.clone().multiplyScalar(Math.cos(lean)).addScaledVector(UP, -Math.sin(lean)),
    ankleL: v3(x, 0.08, z).addScaledVector(l, 0.11),
    ankleR: v3(x, 0.08, z).addScaledVector(l, -0.11),
    poleL: fw,
    poleR: fw,
    toe: fw,
    handL: hl,
    handR: hr,
    nod,
    turn,
  });
}
/** Sat on a seat whose top is `y` up at (x, z), facing `yaw`, the feet `reach` out, the hands where they're put. */
function sitAt(f: Fig, x: number, y: number, z: number, yaw: number, hl: THREE.Vector3 | null, hr: THREE.Vector3 | null, nod = 0, turn = 0, lean = 0, reach = 0.44) {
  const fw = v3(Math.sin(yaw), 0, Math.cos(yaw));
  const l = v3(Math.cos(yaw), 0, -Math.sin(yaw));
  f.set({
    pelvis: v3(x, y + 0.06, z),
    up: UP.clone().multiplyScalar(Math.cos(lean)).addScaledVector(fw, Math.sin(lean)),
    front: fw.clone().multiplyScalar(Math.cos(lean)).addScaledVector(UP, -Math.sin(lean)),
    ankleL: v3(x, 0.08, z).addScaledVector(l, 0.12).addScaledVector(fw, reach),
    ankleR: v3(x, 0.08, z).addScaledVector(l, -0.12).addScaledVector(fw, reach),
    poleL: UP,
    poleR: UP,
    toe: fw,
    handL: hl,
    handR: hr,
    nod,
    turn,
  });
}

// ---------------------------------------------------------------------------------------------
// Painted things: the club crest, the pitch on the tactics board, the bus's sides, the trophy photo.

/** The club's crest: a green shield, a white pine over a hill, 솔뫼 FC, its founding year. */
const crestPaint: Paint = (c) => {
  c.clearRect(0, 0, 128, 152);
  c.fillStyle = GREEN;
  c.strokeStyle = WHITE;
  c.lineWidth = 6;
  c.beginPath();
  c.moveTo(10, 10);
  c.lineTo(118, 10);
  c.lineTo(118, 80);
  c.quadraticCurveTo(118, 128, 64, 146);
  c.quadraticCurveTo(10, 128, 10, 80);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = WHITE;
  c.beginPath();
  c.moveTo(64, 26);
  for (const [w, y] of [[16, 46], [24, 64], [32, 84]] as Array<[number, number]>) {
    c.lineTo(64 + w, y);
    c.lineTo(64 + w * 0.45, y);
  }
  c.lineTo(64 - 32 * 0.45, 84);
  for (const [w, y] of [[32, 84], [24, 64], [16, 46]] as Array<[number, number]>) {
    c.lineTo(64 - w, y);
    c.lineTo(64 - w * 0.45, y - 18);
  }
  c.closePath();
  c.fill();
  c.fillRect(60, 84, 8, 10);
  text(c, '솔뫼 FC', 64, 108, 20, WHITE, 'center');
  text(c, 'EST. 1998', 64, 128, 11, '#c8e6c9', 'center');
};
const crestTex = painted('athCrest', 128, 152, crestPaint);
function crest(g: THREE.Object3D, w: number, x: number, y: number, z: number, ry = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 1.19), new THREE.MeshBasicMaterial({ map: crestTex, transparent: true }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  m.rotation.y = ry;
  g.add(m);
  return m;
}
/** The tactics board's pitch: sideways, our half on the left, theirs on the right, the boxes and the centre circle. */
const pitchTex = painted('athPitch', 512, 304, (c) => {
  c.fillStyle = '#2e8b47';
  c.fillRect(0, 0, 512, 304);
  for (let i = 0; i < 8; i++) {
    c.fillStyle = i % 2 ? '#34964f' : '#2e8b47';
    c.fillRect(16 + i * 60, 16, 60, 272);
  }
  c.strokeStyle = '#ffffff';
  c.lineWidth = 3;
  c.strokeRect(16, 16, 480, 272);
  c.beginPath();
  c.moveTo(256, 16);
  c.lineTo(256, 288);
  c.stroke();
  c.beginPath();
  c.arc(256, 152, 40, 0, Math.PI * 2);
  c.stroke();
  for (const x of [16, 496]) {
    const s = x === 16 ? 1 : -1;
    c.strokeRect(Math.min(x, x + s * 72), 76, 72, 152);
    c.strokeRect(Math.min(x, x + s * 26), 116, 26, 72);
    c.beginPath();
    c.arc(x + s * 52, 152, 3, 0, Math.PI * 2);
    c.fillStyle = '#ffffff';
    c.fill();
  }
  text(c, '솔뫼 FC', 20, 300, 10, '#c8e6c9');
  text(c, 'vs 해오름 유나이티드', 492, 300, 10, '#c8e6c9', 'right');
});
/** The coach's notes on the board's margin (written a line at a time while scouting). */
const notesTex = painted('athNotes', 128, 160, (c) => {
  c.clearRect(0, 0, 128, 160);
  const lines = ['4-3-3 고압박', '7번 스피드 주의', '왼쪽 뒷공간!', '세트피스 높이', '후반 체력 ↓'];
  lines.forEach((l, i) => text(c, l, 4, 16 + i * 30, 15, '#1a237e'));
});
/** The opponent's shape on the scout's tablet. */
const tabletTex = painted('athTablet', 192, 128, (c) => {
  c.fillStyle = '#10161f';
  c.fillRect(0, 0, 192, 128);
  c.fillStyle = '#2e7d32';
  c.fillRect(8, 22, 176, 98);
  c.strokeStyle = '#c8e6c9';
  c.lineWidth = 1.5;
  c.strokeRect(8, 22, 176, 98);
  c.beginPath();
  c.moveTo(96, 22);
  c.lineTo(96, 120);
  c.stroke();
  text(c, '해오름 유나이티드  4-3-3', 96, 11, 11, '#90caf9', 'center');
  const pts = [[30, 71], [56, 40], [56, 61], [56, 82], [56, 102], [82, 50], [80, 71], [82, 92], [112, 38], [118, 71], [112, 104]];
  for (const [x, y] of pts) {
    c.fillStyle = '#1e88e5';
    c.beginPath();
    c.arc(x, y, 5, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = '#ffeb3b';
  c.beginPath();
  c.arc(150, 80, 3, 0, Math.PI * 2);
  c.fill();
});
/** The season's fixtures, taped to the back of the board. */
const fixturesTex = painted('athFixtures', 160, 200, (c) => {
  c.fillStyle = '#fafafa';
  c.fillRect(0, 0, 160, 200);
  c.fillStyle = GREEN;
  c.fillRect(0, 0, 160, 28);
  text(c, '2026 누리 리그 일정', 80, 14, 13, '#ffffff', 'center');
  const rows = [['10.04', '해오름 유', '2:1 승'], ['10.11', '청파 시티', '0:0 무'], ['10.18', '금강 FC', '3:1 승'], ['10.25', '바람골', '1:2 패'], ['11.01', '해오름 유', '원정'], ['11.08', '백두 레인저스', '홈']];
  rows.forEach(([d, o, r], i) => {
    text(c, d, 8, 44 + i * 26, 11, '#455a64', 'left', false);
    text(c, o, 48, 44 + i * 26, 11, '#263238');
    text(c, r, 154, 44 + i * 26, 11, r.includes('승') ? '#2e7d32' : r.includes('패') ? '#c62828' : '#1565c0', 'right');
  });
});
/** The team photo in the trophy cabinet: two rows of green shirts behind a cup. */
const teamPhotoTex = painted('athTeamPhoto', 192, 128, (c) => {
  c.fillStyle = '#87b8de';
  c.fillRect(0, 0, 192, 128);
  c.fillStyle = '#4caf50';
  c.fillRect(0, 84, 192, 44);
  for (let row = 0; row < 2; row++)
    for (let i = 0; i < 7; i++) {
      const x = 20 + i * 25 + (row ? 12 : 0);
      const y = row ? 56 : 80;
      c.fillStyle = GREEN;
      c.fillRect(x - 9, y, 18, 24);
      c.fillStyle = '#e8c09a';
      c.beginPath();
      c.arc(x, y - 6, 7, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#2b2b2b';
      c.fillRect(x - 7, y - 14, 14, 5);
    }
  c.fillStyle = '#ffd54f';
  c.fillRect(88, 98, 16, 18);
  text(c, '2023 누리 리그 우승', 96, 12, 13, '#ffffff', 'center');
});

// =============================================================================================
// The sprint lane (3 × 1): blocks at the left end, the run along the lane to the finish at the right.

function sprintTrack(g: THREE.Group, out: Built) {
  const SX = -1.1;
  // The rubber lane, its white edges and the lane number, the start line, the chequered finish.
  part(g, rbox(3.0, 0.04, 1.0, 0.01), TRACK, 0, 0.02, 0, { outline: false });
  for (const z of [-0.46, 0.46]) part(g, box(3.0, 0.006, 0.035), WHITE, 0, 0.043, z, { outline: false });
  part(g, box(0.05, 0.006, 0.9), WHITE, SX + A.LANE.line + 0.05, 0.043, 0, { outline: false });
  for (let i = 0; i < 12; i++) for (let j = 0; j < 2; j++) part(g, box(0.05, 0.007, 0.075), (i + j) % 2 ? '#212121' : WHITE, SX + A.LANE.finish + j * 0.05, 0.043, -0.41 + i * 0.075, { outline: false });
  const numTex = painted('athLaneNo', 64, 64, (c) => {
    c.clearRect(0, 0, 64, 64);
    text(c, '3', 32, 34, 54, WHITE, 'center');
  });
  onFloor(g, numTex, 0.3, 0.3, SX + A.LANE.line + 0.3, 0, -Math.PI / 2);
  for (const [d, s] of [[0.9, '30m'], [1.5, '60m']] as Array<[number, string]>) label(g, s, 0.16, 0.06, SX + d, 0.12, 0.475, TRACK, WHITE);
  // The starting blocks: a rail down the lane with its two angled pedals (the front for the left foot).
  part(g, rbox(0.62, 0.03, 0.06, 0.01), STEEL, SX - 0.2, 0.055, 0);
  for (const [dx, dz] of [[0, -0.09], [-0.38, 0.09]]) {
    const ped = group(g, SX + dx - 0.07, 0.07, dz);
    part(ped, box(0.02, 0.15, 0.12), '#1565c0', 0, 0.04, 0, { rz: -0.75 });
    part(ped, box(0.1, 0.02, 0.1), STEEL, 0.03, -0.01, 0);
  }
  // The start light on its post, the starter's speaker; the finish clock on its stand, a photo-finish camera.
  const lightPost = group(g, SX - 0.32, 0, -0.43);
  part(lightPost, cyl(0.02, 0.025, 1.25, 10), '#455a64', 0, 0.62, 0);
  part(lightPost, cyl(0.14, 0.16, 0.03, 16), '#37474f', 0, 0.015, 0);
  part(lightPost, rbox(0.14, 0.4, 0.1, 0.02), '#212121', 0, 1.35, 0);
  part(lightPost, rbox(0.16, 0.12, 0.1, 0.02), '#37474f', 0, 1.1, 0.03);
  part(lightPost, cyl(0.035, 0.035, 0.01, 12), '#90a4ae', 0, 1.1, 0.085, { rx: Math.PI / 2 });
  const lamps = (['red', 'amber', 'green'] as const).map((k, i) => {
    const color = k === 'red' ? '#e53935' : k === 'amber' ? '#ffb300' : '#43a047';
    part(lightPost, cyl(0.036, 0.036, 0.02, 14), '#1a1a1a', 0, 1.47 - i * 0.12, 0.05, { rx: Math.PI / 2 });
    const lit = glowing(lightPost, cyl(0.033, 0.033, 0.022, 14), color, 0, 1.47 - i * 0.12, 0.055, Math.PI / 2);
    lit.visible = false;
    return { k, lit };
  });
  const clockPost = group(g, 1.33, 0, -0.43);
  for (const sx of [-1, 1]) part(clockPost, cyl(0.018, 0.018, 1.5, 8), '#455a64', sx * 0.2, 0.75, 0);
  part(clockPost, rbox(0.56, 0.26, 0.08, 0.02), '#1a1a1a', 0, 1.58, 0);
  label(clockPost, `${CLUB} 기록계`, 0.4, 0.05, 0, 1.43, 0.041, '#1a1a1a', '#a5d6a7');
  const clock = liveText(clockPost, 0.48, 0.17, 0, 1.6, 0.042, 0, '#ff3d00');
  const cam = group(g, A.LANE.finish + SX + 0.05, 0, 0.44);
  for (const a of [0, 2.1, 4.2]) rod(cam, v3(0, 0.75, 0), v3(Math.cos(a) * 0.1, 0, Math.sin(a) * 0.1), 0.008, '#37474f');
  part(cam, rbox(0.1, 0.08, 0.14, 0.02), '#263238', 0, 0.8, 0);
  part(cam, cyl(0.03, 0.03, 0.05, 12), '#111111', 0, 0.8, -0.09, { rx: Math.PI / 2 });
  const gun = bubble(g, '탕!', 0.55, 60);
  gun.position.set(SX - 0.2, 1.9, -0.1);
  const s = use(g, 'athSprint', SX, 0, Math.PI / 2);
  out.spots = { '*': s };
  out.work = s.work;
  out.away = (_o, t) => {
    if (!posed(s, t)) {
      lamps.forEach((l) => (l.lit.visible = false));
      clock('0.00');
      gun.visible = false;
      return;
    }
    const n = A.sprintNow(t, phaseOf(s));
    lamps.forEach((l) => (l.lit.visible = l.k === n.light));
    clock(n.clock === null ? '0.00' : n.clock.toFixed(2));
    gun.visible = n.gun;
  };
}

// =============================================================================================
// The obstacle course (3 × 1, the 군 기지's too): tyres, a hurdle, a crawl net, run left to right.

function obstacleCourse(g: THREE.Group, out: Built) {
  const SX = -1.3;
  const SZ = -0.15;
  // In the course's own terms (along it from the start, across to the runner's left) → the piece.
  const P = (along: number, across: number, y = 0) => v3(SX + along, y, SZ - across);
  part(g, rbox(3.0, 0.03, 1.0, 0.01), TURF, 0, 0.015, 0, { outline: false });
  for (const z of [-0.47, 0.47]) part(g, box(3.0, 0.005, 0.03), WHITE, 0, 0.033, z, { outline: false });
  label(g, 'START', 0.22, 0.06, SX - 0.1, 0.11, 0.48, TURF, WHITE);
  // The tyres, a pair at each step.
  A.OBST.tyres.forEach((along) => {
    for (const s of [-1, 1]) {
      const p = P(along, s * A.OBST.tyreX);
      part(g, ring(0.13, 0.055), '#262626', p.x, 0.07, p.z, { rx: Math.PI / 2 });
      part(g, cyl(0.08, 0.08, 0.01, 14), '#3e2f22', p.x, 0.035, p.z, { outline: false });
    }
  });
  // The hurdle: two T-feet, the posts, a red-and-white bar.
  const h = P(A.OBST.hurdle, 0);
  for (const s of [-1, 1]) {
    part(g, box(0.26, 0.025, 0.04), '#eceff1', h.x - 0.06, 0.03, h.z + s * 0.3);
    part(g, box(0.035, A.OBST.hurdleH, 0.035), '#eceff1', h.x, A.OBST.hurdleH / 2, h.z + s * 0.3);
  }
  for (let i = 0; i < 6; i++) part(g, box(0.05, 0.08, 0.1), i % 2 ? '#e53935' : WHITE, h.x, A.OBST.hurdleH - 0.03, h.z - 0.25 + i * 0.1, { outline: i === 0 });
  // The crawl net: four short stakes and a cargo net between them, sagging a little in the middle.
  const n0 = P(A.OBST.netFrom, 0);
  const n1 = P(A.OBST.netTo, 0);
  const H = A.OBST.netH;
  for (const x of [n0.x, n1.x]) for (const s of [-1, 1]) {
    part(g, cyl(0.022, 0.026, H + 0.04, 8), '#6d4c41', x, (H + 0.04) / 2, SZ + s * 0.32);
    part(g, ball(0.03), '#5d4037', x, H + 0.05, SZ + s * 0.32, { outline: false });
  }
  const sag = (x: number, z: number) => H - 0.06 * Math.sin(((x - n0.x) / (n1.x - n0.x)) * Math.PI) * Math.cos(((z - SZ) / 0.64) * Math.PI);
  for (let i = 0; i <= 8; i++) {
    const x = mix(n0.x, n1.x, i / 8);
    for (let j = 0; j < 8; j++) {
      const z0 = SZ - 0.32 + (j / 8) * 0.64;
      const z1 = SZ - 0.32 + ((j + 1) / 8) * 0.64;
      rod(g, v3(x, sag(x, z0), z0), v3(x, sag(x, z1), z1), 0.006, '#3e3a2e');
    }
  }
  for (let j = 0; j <= 8; j++) {
    const z = SZ - 0.32 + (j / 8) * 0.64;
    for (let i = 0; i < 8; i++) {
      const xa = mix(n0.x, n1.x, i / 8);
      const xb = mix(n0.x, n1.x, (i + 1) / 8);
      rod(g, v3(xa, sag(xa, z), z), v3(xb, sag(xb, z), z), 0.006, '#3e3a2e');
    }
  }
  part(g, rbox(n1.x - n0.x + 0.1, 0.012, 0.66, 0.005), '#8d7a5a', (n0.x + n1.x) / 2, 0.036, SZ, { outline: false });
  // The finish: a little flag on a stake.
  const f = P(A.OBST.end + 0.12, 0.3);
  part(g, cyl(0.012, 0.012, 1.0, 8), '#eceff1', f.x, 0.5, f.z);
  const flag = new THREE.Shape();
  flag.moveTo(0, 0);
  flag.lineTo(0.24, -0.07);
  flag.lineTo(0, -0.14);
  const fm = part(g, new THREE.ShapeGeometry(flag), '#ff7043', f.x, 0.98, f.z, { outline: false });
  (fm.material as THREE.Material).side = THREE.DoubleSide;
  fm.userData.ownGeometry = true;
  const s = use(g, 'athObstacle', SX, SZ, Math.PI / 2);
  out.spots = { '*': s };
  out.work = s.work;
  out.away = (_o, t) => (fm.rotation.y = 0.25 * Math.sin(t * 1.7));
}

// =============================================================================================
// The pull-up bar (1 × 1, the 군 기지's too): two posts, the high bar, a mat, a chalk bowl.

function pullUpBar(g: THREE.Group, out: Built) {
  part(g, rbox(0.95, 0.025, 0.95, 0.01), '#2b2b2b', 0, 0.0125, 0, { outline: false });
  for (const sx of [-1, 1]) {
    part(g, rbox(0.06, 2.45, 0.06, 0.01), '#37474f', sx * 0.48, 1.225, A.BAR.z);
    part(g, rbox(0.18, 0.015, 0.3, 0.005), '#455a64', sx * 0.48, 0.0075, A.BAR.z);
    // A brace back to the floor.
    rod(g, v3(sx * 0.48, 1.6, A.BAR.z - 0.02), v3(sx * 0.48, 0.02, A.BAR.z - 0.42), 0.018, '#455a64');
  }
  part(g, rbox(1.02, 0.06, 0.06, 0.01), '#37474f', 0, 2.45, A.BAR.z);
  part(g, cyl(0.018, 0.018, 0.92, 12), CHROME, 0, A.BAR.y, A.BAR.z, { rz: Math.PI / 2 });
  for (const sx of [-1, 1]) part(g, cyl(0.0185, 0.0185, 0.16, 12), '#9aa3a8', sx * A.BAR.grip, A.BAR.y, A.BAR.z, { rz: Math.PI / 2, outline: false });
  // The chalk bowl on its bracket on the left post, a sign.
  const c = A.BAR.chalk;
  part(g, box(0.1, 0.02, 0.04), '#455a64', c.x + 0.05, c.y - 0.06, c.z - 0.02);
  part(g, cyl(0.07, 0.05, 0.07, 14), '#eceff1', c.x, c.y - 0.03, c.z);
  part(g, cyl(0.06, 0.06, 0.01, 14), '#ffffff', c.x, c.y + 0.003, c.z, { outline: false });
  label(g, '턱걸이', 0.16, 0.06, -0.48, 1.5, A.BAR.z + 0.031, '#37474f', '#ffffff');
  // A puff of chalk off the hands as they're clapped.
  const puffs = [0, 1, 2, 3, 4].map(() => part(g, ball(0.03), '#ffffff', 0, 0, 0, { outline: false, shadow: false, material: new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false }) }));
  puffs.forEach((p) => (p.userData.ownMaterial = true));
  const s = use(g, 'athPullUp', 0, 0, 0);
  out.spots = { '*': s };
  out.work = s.work;
  out.away = (_o, t) => {
    const p = posed(s, t) ? A.pullNow(t, phaseOf(s)).puff : 0;
    const k = kOf(s);
    puffs.forEach((m, i) => {
      m.visible = p > 0.05;
      if (!m.visible) return;
      const a = i * 1.3 + t;
      const c0 = at(s, A.p3(0, 1.12 * k, 0.3 * k));
      m.position.set(c0.x + Math.cos(a) * 0.12 * p, c0.y + 0.08 * p + i * 0.02, c0.z + Math.sin(a) * 0.1 * p);
      m.scale.setScalar(0.6 + 1.6 * p);
    });
  };
}

// =============================================================================================
// The weight rack (2 × 1): a half rack for the back squat, or a bench press station (rackKind).

/** The barbell: a 1.9 m bar with a red bumper and a collar each end (about its middle, along x). */
function barbell(parent: THREE.Object3D): THREE.Group {
  const b = group(parent);
  part(b, cyl(0.014, 0.014, 1.9, 10), CHROME, 0, 0, 0, { rz: Math.PI / 2 });
  for (const sx of [-1, 1]) {
    part(b, cyl(0.025, 0.025, 0.05, 12), '#9aa3a8', sx * 0.6, 0, 0, { rz: Math.PI / 2 });
    part(b, cyl(A.SQUAT.plateR, A.SQUAT.plateR, 0.055, 24), '#c62828', sx * 0.68, 0, 0, { rz: Math.PI / 2 });
    part(b, cyl(0.17, 0.17, 0.04, 20), '#1565c0', sx * 0.735, 0, 0, { rz: Math.PI / 2 });
    part(b, cyl(0.035, 0.035, 0.03, 12), '#eceff1', sx * 0.775, 0, 0, { rz: Math.PI / 2 });
  }
  return b;
}
/** A plate standing on its edge or leaning (on the tree, against the rack). */
function plate(g: THREE.Object3D, r: number, color: string, x: number, y: number, z: number, rz = Math.PI / 2, ry = 0) {
  const p = part(g, cyl(r, r, 0.045, 22), color, x, y, z, { rz, ry });
  part(p, cyl(0.03, 0.03, 0.05, 10), '#cfd8dc', 0, 0, 0, { outline: false });
}

function weightRack(g: THREE.Group, out: Built) {
  // The rubber platform with its wooden middle.
  part(g, rbox(2.0, 0.03, 1.0, 0.01), '#1e1e1e', 0, 0.015, 0, { outline: false });
  part(g, box(0.9, 0.006, 0.92), '#b88a55', 0, 0.033, 0, { outline: false });
  // The half rack: uprights with numbered holes, J-hooks, safety arms out the front, a plate tree behind.
  const squat = group(g);
  for (const sx of [-1, 1]) {
    for (const z of [-0.1, -0.45]) part(squat, rbox(0.07, 2.05, 0.07, 0.01), '#212121', sx * 0.62, 1.025, z);
    part(squat, rbox(0.07, 0.07, 0.42, 0.01), '#212121', sx * 0.62, 2.02, -0.275);
    part(squat, rbox(0.07, 0.07, 0.42, 0.01), '#212121', sx * 0.62, 0.1, -0.275);
    for (let i = 0; i < 18; i++) part(squat, box(0.02, 0.02, 0.005), '#bdbdbd', sx * 0.62, 0.4 + i * 0.075, -0.064, { outline: false });
    // J-hook (a cup the bar sits in), safety arm.
    part(squat, rbox(0.06, 0.05, 0.1, 0.01), '#c62828', sx * 0.56, A.SQUAT.hooks - 0.02, A.SQUAT.hookZ + 0.03);
    part(squat, rbox(0.05, 0.08, 0.02, 0.005), '#c62828', sx * 0.56, A.SQUAT.hooks + 0.02, A.SQUAT.hookZ + 0.08);
    part(squat, rbox(0.05, 0.05, 0.55, 0.01), '#9e9e9e', sx * 0.62, 0.62, 0.17);
    // Plates stored on its back pegs.
    part(squat, cyl(0.025, 0.025, 0.2, 10), STEEL, sx * 0.72, 0.5, -0.45, { rz: Math.PI / 2 });
    plate(squat, 0.22, '#c62828', sx * 0.78, 0.5, -0.45);
    plate(squat, 0.17, '#1565c0', sx * 0.83, 0.5, -0.45);
  }
  part(squat, rbox(1.32, 0.07, 0.07, 0.01), '#212121', 0, 2.02, -0.45);
  label(squat, CLUB, 0.4, 0.08, 0, 1.9, -0.41, '#212121', '#a5d6a7');
  // The bench press station: the flat bench along it, its uprights with the hooks at the head end.
  const bench = group(g);
  bench.visible = false;
  part(bench, rbox(0.3, 0.07, 1.17, 0.03), '#1b1b1f', 0, A.BENCH.top - 0.035, (A.BENCH.head + A.BENCH.foot) / 2);
  part(bench, box(0.3, 0.005, 0.5), GREEN_DARK, 0, A.BENCH.top + 0.002, -0.25, { outline: false });
  for (const z of [A.BENCH.head + 0.15, A.BENCH.foot - 0.12]) {
    part(bench, rbox(0.06, A.BENCH.top - 0.07, 0.06, 0.01), '#424242', 0, (A.BENCH.top - 0.07) / 2, z);
    part(bench, rbox(0.4, 0.04, 0.06, 0.01), '#424242', 0, 0.02, z);
  }
  for (const sx of [-1, 1]) {
    part(bench, rbox(0.06, 1.25, 0.06, 0.01), '#212121', sx * 0.55, 0.625, A.BENCH.hookZ - 0.05);
    rod(bench, v3(sx * 0.55, 0.5, A.BENCH.hookZ - 0.05), v3(sx * 0.55, 0.02, A.BENCH.hookZ - 0.4), 0.02, '#212121');
    part(bench, rbox(0.06, 0.05, 0.1, 0.01), '#c62828', sx * 0.52, A.BENCH.hooks - 0.02, A.BENCH.hookZ);
    part(bench, cyl(0.025, 0.025, 0.2, 10), STEEL, sx * 0.62, 0.4, A.BENCH.hookZ - 0.05, { rz: Math.PI / 2 });
    plate(bench, 0.22, '#c62828', sx * 0.68, 0.4, A.BENCH.hookZ - 0.05);
  }
  // A towel on the bench end, a water bottle and a chalk bowl on the floor.
  part(g, rbox(0.25, 0.03, 0.18, 0.01), WHITE, 0.82, 0.05, 0.36);
  part(g, cyl(0.035, 0.035, 0.2, 12), GREEN, -0.85, 0.13, 0.38);
  part(g, cyl(0.02, 0.025, 0.04, 10), WHITE, -0.85, 0.25, 0.38);
  const bar = barbell(g);
  // The NPCs: a junior on a heavy set (spotted), a member on a light one (programme written up).
  const junior = figure(g, LOOKS.junior);
  const member = figure(g, LOOKS.member);
  junior.root.visible = member.root.visible = false;
  const clipboard = loose(g);
  part(clipboard, rbox(0.23, 0.31, 0.012, 0.01), '#8d6e63', 0, 0, 0);
  part(clipboard, box(0.2, 0.26, 0.004), '#fafafa', 0, -0.015, 0.008, { outline: false });
  part(clipboard, box(0.08, 0.025, 0.02), '#9e9e9e', 0, 0.15, 0.008);
  const pen = loose(g);
  part(pen, cyl(0.005, 0.005, 0.13, 6), '#1565c0', 0, 0.04, 0, { rx: 0.4, outline: false });

  // The spots, set once it's known which this is.
  const spots: Record<string, Spot> = {};
  out.spots = spots;
  let kind: 'squat' | 'bench' | undefined;
  let lift: Spot | null = null;
  let spotter: Spot | null = null;
  let program: Spot | null = null;
  out.away = (_o, t) => {
    if (!kind) {
      g.getWorldPosition(tmp);
      kind = A.rackKind(tmp);
      squat.visible = kind === 'squat';
      bench.visible = kind === 'bench';
      if (kind === 'squat') {
        lift = use(g, 'athSquat', 0, A.SQUAT.spotZ, 0);
        spotter = use(g, 'athSpotSquat', A.SPOTTER.squat.x, A.SPOTTER.squat.z, 0);
        program = use(g, 'athProgram', 0.95, 0.42, -Math.PI / 2 - 0.35);
      } else {
        lift = use(g, 'athBench', 0, A.BENCH.hipZ, 0);
        spotter = use(g, 'athSpotBench', A.SPOTTER.bench.x, A.SPOTTER.bench.z, 0);
        program = use(g, 'athProgram', 0.78, 0.4, -Math.PI / 2 - 0.3);
      }
      Object.assign(spots, { liftWeights: lift, athletic_coachContest: spotter, athletic_clientProgram: program, '*': lift });
      out.work = lift.work;
    }
    const L = lift!;
    const S = spotter!;
    const Pg = program!;
    const who = nowAt([L, S, Pg], t);
    junior.root.visible = who === S;
    member.root.visible = who === Pg;
    clipboard.visible = pen.visible = who === Pg;
    // Where the bar is: on its hooks, or with whoever's lifting it (the dweller, or the lifter drawn in).
    const ph = who ? phaseOf(who) : 0;
    const lifter = who === S ? junior : who === Pg ? member : null;
    if (kind === 'squat') {
      const hooks = v3(0, A.SQUAT.hooks + 0.04, A.SQUAT.hookZ);
      let p = hooks;
      if (who === L) {
        const sq = A.squatNow(t, ph);
        p = sq.onBack ? at(L, A.squatBar(sq.down, kOf(L))) : hooks;
      } else if (lifter) {
        const sq = A.squatNow(t, ph);
        const e = A.sm(sq.down, 0, 1);
        const bp = A.squatBar(sq.down, A.LIFTER_K);
        p = sq.onBack ? v3(0, bp.y, A.SQUAT.spotZ + bp.z) : hooks;
        const pitch = mix(0.04, 0.62, e) * (sq.at.key === 'reps' ? 1 : 0.3);
        const z0 = A.SQUAT.spotZ - 0.17 * e * (sq.at.key === 'reps' ? 1 : 0);
        const resting = sq.at.key === 'shake' || sq.at.key === 'rest';
        const hy = sq.at.key === 'reps' ? mix(0.88, 0.5, e) : 0.88 - 0.3 * sq.down;
        lifter.set({
          pelvis: v3(0, hy, resting ? 0.2 : z0),
          up: v3(0, Math.cos(pitch), Math.sin(pitch)),
          front: v3(0, -Math.sin(pitch), Math.cos(pitch)),
          ankleL: v3(0.14, 0.08, (resting ? 0.2 : A.SQUAT.spotZ) + 0.02),
          ankleR: v3(-0.14, 0.08, (resting ? 0.2 : A.SQUAT.spotZ) + 0.02),
          poleL: v3(0.45, 0, 1),
          poleR: v3(-0.45, 0, 1),
          handL: resting ? null : v3(0.42, p.y, p.z + 0.02),
          handR: resting ? null : v3(-0.42, p.y, p.z + 0.02),
          nod: -0.2,
        });
      }
      bar.position.copy(p);
    } else {
      const hooks = v3(0, A.BENCH.hooks + 0.03, A.BENCH.hookZ);
      let p = hooks;
      if (who === L) {
        const b = A.benchNow(t, ph, kOf(L));
        p = v3(0, b.bar.y, b.bar.z);
      } else if (lifter) {
        const b = A.benchNow(t, ph, A.LIFTER_K);
        p = v3(0, b.bar.y, b.bar.z);
        const sitting = b.at.key === 'sit' || b.at.key === 'rest';
        const lie = sitting ? 0 : b.at.key === 'lie' ? A.sm(b.at.u, 0, 1) : b.at.key === 'sitUp' ? 1 - A.sm(b.at.u, 0, 1) : 1;
        const a = (lie * Math.PI) / 2;
        lifter.set({
          pelvis: v3(0, A.BENCH.top + 0.1, mix(0.3, A.BENCH.hipZ, lie)),
          up: v3(0, Math.cos(a), -Math.sin(a)),
          front: v3(0, Math.sin(a), Math.cos(a)),
          ankleL: v3(0.25, 0.08, 0.66),
          ankleR: v3(-0.25, 0.08, 0.66),
          poleL: v3(0.3, 1, 0.4),
          poleR: v3(-0.3, 1, 0.4),
          toe: v3(0, 0, 1),
          handL: b.held ? v3(0.4, p.y, p.z) : null,
          handR: b.held ? v3(-0.4, p.y, p.z) : null,
          nod: lie > 0.5 ? 0.1 : 0.2,
        });
      }
      bar.position.copy(p);
    }
    if (who === Pg) {
      const h = A.athHands('athProgram', t, ph, kOf(Pg));
      placeAt(clipboard, at(Pg, h.l), Pg.at.rotation.y, -0.5);
      placeAt(pen, at(Pg, h.r), Pg.at.rotation.y, 0);
    }
  };
}

// =============================================================================================
// The tactics board (2 × 1): a magnetic board on wheels, the pitch, the magnets, the marker tray.

/** A round magnet (red ours, blue theirs) with a number. */
function magnet(parent: THREE.Object3D, color: string): THREE.Group {
  const m = group(parent);
  part(m, cyl(0.028, 0.028, 0.014, 14), color, 0, 0, 0, { rx: Math.PI / 2 });
  part(m, cyl(0.016, 0.016, 0.016, 10), WHITE, 0, 0, 0.002, { rx: Math.PI / 2, outline: false });
  return m;
}

function tacticsBoard(g: THREE.Group, out: Built) {
  const B = A.BOARD;
  const F = B.face0;
  const W = 1.6;
  const H = 0.96;
  const yc = 1.31;
  // The stand: two T-feet on casters, the posts, the board's aluminium frame.
  for (const sx of [-1, 1]) {
    part(g, rbox(0.06, 0.04, 0.6, 0.01), '#9e9e9e', sx * 0.78, 0.09, 0);
    for (const z of [-0.26, 0.26]) {
      part(g, cyl(0.03, 0.03, 0.025, 10), '#212121', sx * 0.78, 0.035, z, { rz: Math.PI / 2 });
      part(g, box(0.03, 0.04, 0.03), '#757575', sx * 0.78, 0.065, z);
    }
    part(g, rbox(0.05, 1.9, 0.05, 0.01), '#b0bec5', sx * 0.82, 1.0, 0);
  }
  part(g, rbox(W + 0.06, H + 0.06, 0.05, 0.01), '#cfd8dc', 0, yc, 0);
  picture(g, pitchTex, W - 0.04, H - 0.06, 0, yc, F - 0.034);
  // The marker tray along the bottom: markers and an eraser.
  part(g, rbox(1.2, 0.03, 0.08, 0.01), '#b0bec5', 0, B.tray - 0.01, F);
  const markerAt = 0.1;
  for (const [x, c] of [[-0.3, '#212121'], [-0.22, '#c62828'], [0.24, '#1565c0']] as Array<[number, string]>) part(g, cyl(0.009, 0.009, 0.12, 8), c, x, B.tray + 0.01, F + 0.01, { rz: Math.PI / 2 });
  const trayMarker = part(g, cyl(0.009, 0.009, 0.12, 8), '#212121', markerAt, B.tray + 0.01, F + 0.01, { rz: Math.PI / 2 });
  const trayEraser = part(g, rbox(0.12, 0.03, 0.05, 0.01), '#37474f', -0.45, B.tray + 0.015, F + 0.01);
  part(trayEraser, box(0.12, 0.012, 0.05), '#eceff1', 0, -0.018, 0, { outline: false });
  // The margin's notes (shown a line at a time as they're written), the magnets.
  const notesMesh = picture(g, notesTex, 0.22, 0.28, A.SCOUT.notes[0] + 0.1, A.SCOUT.notes[1] - 0.13, F - 0.03);
  notesMesh.visible = false;
  const ours: Array<[number, number]> = [[-0.66, 1.31], [-0.5, 1.08], [-0.52, 1.24], [-0.52, 1.4], [-0.5, 1.56], [-0.3, 1.38], [-0.32, 1.66], [-0.08, 1.22], [-0.12, 1.05], [-0.06, 1.52]];
  for (const [x, y] of ours) magnet(g, '#e53935').position.set(x, y, F - 0.02);
  const theirs: Array<[number, number]> = [[0.66, 1.31], [0.5, 1.1], [0.5, 1.52], [0.48, 1.31], [0.12, 1.5], [0.14, 1.14]];
  for (const [x, y] of theirs) magnet(g, '#1e88e5').position.set(x, y, F - 0.02);
  const scoutMags = A.SCOUT.magnets.map(([x, y]) => {
    const m = magnet(g, '#1e88e5');
    m.position.set(x, y, F - 0.02);
    return m;
  });
  const moving = magnet(g, '#e53935');
  // The run drawn after a magnet's moved: dashes along its line, an arrowhead.
  const dashes = Array.from({ length: 14 }, () => part(g, box(0.035, 0.008, 0.004), '#111111', 0, 0, F - 0.029, { outline: false }));
  const head = group(g, 0, 0, F - 0.029);
  part(head, cyl(0.022, 0.022, 0.004, 3), '#111111', 0, 0, 0, { rx: Math.PI / 2, outline: false });
  // The back: the crest, the season's fixtures taped on.
  crest(g, 0.34, -0.35, yc + 0.05, -0.03, Math.PI);
  picture(g, fixturesTex, 0.32, 0.4, 0.35, yc, -0.031, '#ffffff', Math.PI);
  label(g, `${CLUB} 전술판`, 0.4, 0.06, 0, yc + H / 2 + 0.06, 0.03, '#37474f', '#ffffff');
  // What's held: the marker, the eraser, the scout's tablet; the coach's words.
  const handMarker = loose(g);
  part(handMarker, cyl(0.009, 0.009, 0.12, 8), '#212121', 0, 0, 0.03, { rx: Math.PI / 2 });
  const handEraser = loose(g);
  part(handEraser, rbox(0.12, 0.05, 0.03, 0.01), '#37474f', 0, 0, 0);
  const tablet = loose(g);
  part(tablet, rbox(0.26, 0.18, 0.012, 0.01), '#212121', 0, 0, 0);
  const tabFace = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.16), new THREE.MeshBasicMaterial({ map: tabletTex }));
  tabFace.userData.ownGeometry = tabFace.userData.ownMaterial = true;
  tabFace.position.z = 0.007;
  tablet.add(tabFace);
  const words = ['압박! 압박!', '뒷공간 노려!', '할 수 있다!', '화이팅!'].map((w) => bubble(g, w, 0.9, 44));

  const plays = use(g, 'athPlays', B.plays, F + B.face, Math.PI);
  const scout = use(g, 'athScout', B.scout, F + B.face, Math.PI);
  const talk = use(g, 'athTeamTalk', A.TALK.spotX, A.TALK.spotZ, A.TALK.yaw);
  out.spots = { studyPlays: plays, athletic_scoutOpponent: scout, athletic_captainTalk: talk, '*': plays };
  out.work = plays.work;
  const onFace = (bx: number, by: number, dz = 0.02) => v3(bx, by, F - dz);
  out.away = (_o, t) => {
    const who = nowAt([plays, scout, talk], t);
    // The round's play: one red magnet slid, the run drawn, tapped, wiped, the magnet slid back.
    let drawn = 0;
    let markerIn = false;
    let eraserIn = false;
    if (who === plays) {
      const ph = phaseOf(plays);
      const n = A.playsNow(t, ph);
      const p = A.playOf(n.at.n);
      moving.position.copy(onFace(n.magnet[0], n.magnet[1]));
      drawn = n.drawn;
      markerIn = n.marker;
      eraserIn = n.eraser;
      const h = A.athHands('athPlays', t, ph, kOf(plays));
      if (markerIn) placeAt(handMarker, at(plays, h.r), Math.PI, 0);
      if (eraserIn) placeAt(handEraser, at(plays, h.l), Math.PI, 0);
      dashes.forEach((d, i) => {
        const s = (i + 0.5) / dashes.length;
        d.visible = s <= drawn;
        if (!d.visible) return;
        const [x, y] = A.alongRun(p.arrow, s);
        const [x2, y2] = A.alongRun(p.arrow, Math.min(1, s + 0.02));
        d.position.set(x, y, F - 0.029);
        d.rotation.z = Math.atan2(y2 - y, x2 - x);
      });
      const end = p.arrow[p.arrow.length - 1];
      const prev = p.arrow[p.arrow.length - 2];
      head.visible = drawn > 0.97;
      head.position.set(end[0], end[1], F - 0.029);
      head.rotation.z = Math.atan2(end[1] - prev[1], end[0] - prev[0]) + Math.PI / 2;
    } else {
      moving.position.copy(onFace(A.PLAYS[0].from[0], A.PLAYS[0].from[1]));
      dashes.forEach((d) => (d.visible = false));
      head.visible = false;
    }
    handMarker.visible = markerIn;
    handEraser.visible = eraserIn;
    trayMarker.visible = !markerIn;
    trayEraser.visible = !eraserIn;
    // Scouting: the tablet in the left hand, the blue magnets set out to match it one a round, the notes.
    if (who === scout) {
      const ph = phaseOf(scout);
      const n = A.scoutNow(t, ph);
      scoutMags.forEach((m, i) => {
        m.visible = i < n.placed;
        const [x, y] = A.SCOUT.magnets[i];
        m.position.copy(onFace(x, y));
      });
      if (n.inHand) {
        const j = ((n.at.n % 5) + 5) % 5;
        scoutMags[j].visible = true;
        scoutMags[j].position.copy(onFace(n.inHand[0], n.inHand[1], 0.03));
      }
      const h = A.athHands('athScout', t, ph, kOf(scout));
      placeAt(tablet, at(scout, h.l), Math.PI, -0.7);
      notesMesh.visible = n.lines > 0.2;
      if (n.at.key === 'note') {
        placeAt(handMarker, at(scout, h.r), Math.PI, 0);
        handMarker.visible = true;
        trayMarker.visible = false;
      }
    } else {
      scoutMags.forEach((m) => (m.visible = true));
      tablet.visible = false;
      notesMesh.visible = true;
    }
    // The team talk: the marker pointed back at the board, the words over the coach's head.
    words.forEach((w) => (w.visible = false));
    if (who === talk) {
      const ph = phaseOf(talk);
      const a = A.talkNow(t, ph);
      const k = kOf(talk);
      const h = A.athHands('athTeamTalk', t, ph, k);
      if (a.key === 'point' || a.key === 'point2') {
        placeAt(handMarker, at(talk, h.r), talk.at.rotation.y, 0);
        handMarker.visible = true;
        trayMarker.visible = false;
      }
      const w = a.key === 'fist' ? words[3] : a.key === 'explain' ? words[(a.n % 2) + (a.u > 0.5 ? 2 : 0)] : a.key === 'point2' ? words[1] : null;
      if (w) {
        w.visible = true;
        w.position.copy(at(talk, A.p3(0, 2.05 * k, 0)));
      }
    }
  };
}

// =============================================================================================
// The physio table (1 × 2): the athlete lies on it, the physio works the left leg from its side.

function physioTable(g: THREE.Group, out: Built) {
  const T = A.TABLE;
  // The padded top in two parts, the head end raised a touch, the paper roll; the scissor base and foot bar.
  part(g, rbox(0.66, 0.1, 1.9, 0.04), '#2a7f86', 0, T.top - 0.05, 0);
  part(g, box(0.5, 0.004, 1.86), '#fbfaf5', 0, T.top + 0.002, 0, { outline: false });
  part(g, rbox(0.42, 0.08, 0.26, 0.04), '#e0f2f1', 0, T.top + 0.04, T.head + 0.2);
  part(g, cyl(0.06, 0.06, 0.6, 14), '#fbfaf5', 0, T.top - 0.12, T.head + 0.02, { rz: Math.PI / 2 });
  part(g, rbox(0.56, 0.06, 1.6, 0.02), '#cfd8dc', 0, 0.3, 0);
  for (const sz of [-1, 1]) {
    rod(g, v3(-0.22, 0.06, sz * 0.6), v3(-0.22, T.top - 0.12, -sz * 0.3), 0.022, '#90a4ae');
    rod(g, v3(0.22, 0.06, sz * 0.6), v3(0.22, T.top - 0.12, -sz * 0.3), 0.022, '#90a4ae');
    part(g, rbox(0.6, 0.05, 0.08, 0.02), '#607d8b', 0, 0.04, sz * 0.7);
  }
  part(g, box(0.6, 0.02, 0.03), '#455a64', 0, 0.1, 0.93);
  // The side shelf of the trolley at the foot: kinesio tape, massage oil, a foam roller under.
  const cart = group(g, -0.45, 0, 0.75);
  part(cart, rbox(0.22, 0.02, 0.3, 0.01), '#eceff1', 0, 0.82, 0);
  part(cart, rbox(0.22, 0.02, 0.3, 0.01), '#eceff1', 0, 0.4, 0);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) part(cart, cyl(0.01, 0.01, 0.82, 6), STEEL, sx * 0.1, 0.41, sz * 0.14, { outline: false });
  for (const [i, c] of [[0, '#e91e63'], [1, '#2196f3'], [2, '#212121']] as Array<[number, string]>) part(cart, cyl(0.04, 0.04, 0.05, 14), c, -0.05 + i * 0.05, 0.86, -0.08);
  part(cart, cyl(0.025, 0.03, 0.14, 10), '#ffe082', 0.06, 0.9, 0.08);
  part(cart, cyl(0.075, 0.075, 0.32, 14), '#1565c0', 0, 0.48, 0.02, { rx: Math.PI / 2 });
  label(g, `${CLUB} 메디컬`, 0.3, 0.06, 0, 0.31, 0.81, '#cfd8dc', '#00695c');
  // The physio: at the left side of the table, hands on the leg.
  const physio = figure(g, LOOKS.physio);
  physio.root.visible = false;
  const s = use(g, 'athPhysio', 0, T.hipZ, 0);
  s.work = marker(g, 0, T.top, T.hipZ);
  out.spots = { '*': s };
  out.work = s.work;
  out.away = (_o, t) => {
    physio.root.visible = posed(s, t);
    if (!physio.root.visible) return;
    const k = kOf(s);
    const p = A.physioNow(t, phaseOf(s));
    const leg = A.physioLeg(p, k);
    const P = (q: A.P3, dx = 0, dy = 0, dz = 0) => at(s, A.p3(q.x + dx, q.y + dy, q.z + dz));
    const knee = P(leg.knee, 0.02, 0.06, 0);
    const heel = P(leg.heel, 0, -0.05, 0.04);
    const mid = (a: A.P3, b: A.P3, e: number) => A.pMix(a, b, e);
    let hl: THREE.Vector3;
    let hr: THREE.Vector3;
    let z = 0.5;
    let lean = 0.35;
    const knead = 0.02 * Math.sin(t * 6);
    switch (p.at.key) {
      case 'hamUp':
      case 'ham':
      case 'hamDown':
        // A hand under the heel lifting, the other flat on the front of the knee keeping it straight.
        hl = knee;
        hr = heel;
        z = mix(0.75, 0.62, p.lift / 1.3);
        lean = 0.15;
        break;
      case 'kneeUp':
      case 'knee':
      case 'kneeDown':
        hl = P(leg.knee, 0.0, 0.07, -0.02);
        hr = heel;
        z = 0.55;
        lean = 0.25;
        break;
      case 'calf': {
        const c = mid(leg.knee, leg.heel, 0.45);
        hl = P(c, 0.05, 0.05 + knead, 0.05);
        hr = P(c, 0.05, 0.05 - knead, -0.07);
        z = 0.62;
        lean = 0.5;
        break;
      }
      case 'quad': {
        const c = mid(leg.hip, leg.knee, 0.6);
        hl = P(c, 0.03, 0.08 + knead, 0.06);
        hr = P(c, 0.03, 0.08 - knead, -0.06);
        z = 0.35;
        lean = 0.5;
        break;
      }
      default:
        // Feeling round the knee.
        hl = P(leg.knee, 0.06, 0.07, 0.04 + knead);
        hr = P(leg.knee, -0.02, 0.08, -0.04 - knead);
        z = 0.45;
        lean = 0.45;
    }
    standAt(physio, 0.62, T.hipZ + z, -Math.PI / 2, lean, hl, hr, 0.45);
  };
}

// =============================================================================================
// The team bus (2 × 1 where it parks; the coach itself lies along it, 8 m, its nose to the right).

const BUS = { L: 8, W: 2.1, z: -0.5, floor: 0.34, roof: 3.05, fAxle: 2.75, rAxle: -2.3, wheelR: 0.48, door: 3.2 };
/** The coach's side: the green swoosh, the club's name, a crest. */
const busSideTex = painted('athBusSide', 1024, 160, (c) => {
  c.clearRect(0, 0, 1024, 160);
  const grd = c.createLinearGradient(0, 0, 1024, 0);
  grd.addColorStop(0, GREEN_DARK);
  grd.addColorStop(1, GREEN);
  c.fillStyle = grd;
  c.beginPath();
  c.moveTo(0, 30);
  c.bezierCurveTo(300, 10, 600, 130, 1024, 60);
  c.lineTo(1024, 160);
  c.lineTo(0, 160);
  c.closePath();
  c.fill();
  text(c, '솔뫼 FC', 520, 108, 64, '#ffffff', 'center');
  text(c, 'SOLMOE FOOTBALL CLUB · 누리 리그', 520, 148, 22, '#c8e6c9', 'center');
});
const busDestTex = painted('athBusDest', 256, 48, (c) => {
  c.fillStyle = '#121212';
  c.fillRect(0, 0, 256, 48);
  text(c, '솔뫼 FC 선수단', 128, 25, 28, '#ffab40', 'center');
});

function teamBus(g: THREE.Group, out: Built) {
  const L = BUS.L;
  const W = BUS.W;
  const bus = group(g, 0, 0, BUS.z);
  const sideZ = W / 2;
  // The body: white below, the green band, the tinted glass all along, the roof and its air-con pod.
  part(bus, rbox(L, 1.2, W, 0.12), WHITE, 0, BUS.floor + 0.6, 0);
  part(bus, rbox(L - 0.1, BUS.roof - BUS.floor - 1.2, W - 0.04, 0.16), '#20262c', 0, BUS.floor + 1.2 + (BUS.roof - BUS.floor - 1.2) / 2, 0);
  part(bus, rbox(L, 0.14, W, 0.08), WHITE, 0, BUS.roof - 0.02, 0);
  part(bus, rbox(2.2, 0.2, 1.4, 0.08), '#eceff1', -1.2, BUS.roof + 0.15, 0);
  for (const sz of [-1, 1]) {
    picture(bus, busSideTex, L - 0.6, 0.94, -0.1, BUS.floor + 0.66, sz * (sideZ + 0.002), '#ffffff', sz > 0 ? 0 : Math.PI);
    // The window pillars.
    for (let i = 0; i < 7; i++) part(bus, box(0.06, 1.3, 0.01), WHITE, -3.4 + i * 1.0, BUS.floor + 1.86, sz * (sideZ - 0.01), { outline: false });
  }
  // The nose: the windscreen, the destination sign, the lights, the grille, the mirrors; the back's lights.
  const nose = L / 2;
  part(bus, box(0.02, 1.25, W - 0.24), '#2c3a46', nose + 0.005, BUS.floor + 1.85, 0);
  picture(bus, busDestTex, 0.9, 0.17, nose + 0.02, BUS.roof - 0.26, 0, '#ffffff', Math.PI / 2);
  for (const sz of [-1, 1]) {
    glowing(bus, rbox(0.04, 0.12, 0.26, 0.02), '#fffde7', nose + 0.01, BUS.floor + 0.42, sz * 0.72);
    rod(bus, v3(nose - 0.1, BUS.roof - 0.3, sz * (sideZ + 0.02)), v3(nose + 0.35, BUS.roof - 0.55, sz * (sideZ + 0.12)), 0.02, '#212121');
    part(bus, rbox(0.06, 0.32, 0.18, 0.03), '#212121', nose + 0.36, BUS.roof - 0.78, sz * (sideZ + 0.13));
    part(bus, rbox(0.04, 0.2, 0.2, 0.02), '#b71c1c', -nose - 0.01, BUS.floor + 0.55, sz * 0.75);
  }
  part(bus, rbox(0.05, 0.22, 1.2, 0.02), '#37474f', nose + 0.01, BUS.floor + 0.25, 0);
  crest(bus, 0.32, nose + 0.025, BUS.floor + 0.9, 0, Math.PI / 2);
  crest(bus, 0.42, -nose - 0.025, BUS.floor + 1.0, 0, -Math.PI / 2);
  label(bus, '경기 72 바 3017', 0.5, 0.12, -nose - 0.02, BUS.floor + 0.32, 0, '#ffd600', '#1b2a1b', -Math.PI / 2);
  // The wheels.
  const wheels: THREE.Object3D[] = [];
  for (const x of [BUS.fAxle, BUS.rAxle]) for (const sz of [-1, 1]) {
    const w = group(bus, x, BUS.wheelR, sz * (sideZ - 0.12));
    part(w, cyl(BUS.wheelR, BUS.wheelR, 0.3, 22), '#1a1a1a', 0, 0, 0, { rx: Math.PI / 2 });
    part(w, cyl(0.26, 0.26, 0.31, 16), '#b0bec5', 0, 0, 0, { rx: Math.PI / 2, outline: false });
    wheels.push(w);
    part(bus, box(1.15, 0.06, 0.05), '#212121', x, BUS.wheelR * 2 + 0.06, sz * (sideZ + 0.01));
  }
  // The door near the nose on the right (+z), its steps.
  part(bus, box(0.8, 2.0, 0.02), '#30404c', BUS.door, BUS.floor + 1.12, sideZ + 0.012);
  part(bus, box(0.02, 2.0, 0.025), WHITE, BUS.door, BUS.floor + 1.12, sideZ + 0.014);
  // The luggage bays between the axles, the middle one opening (its bags inside).
  for (const x of [-1.5, 0.5]) part(bus, box(0.95, 0.55, 0.02), '#e0e0e0', x, 0.7, sideZ + 0.012);
  const BX = -0.5;
  const hinge = group(bus, BX, 0.98, sideZ + 0.015);
  part(hinge, box(0.95, 0.56, 0.025), '#e0e0e0', 0, -0.28, 0);
  part(hinge, box(0.2, 0.03, 0.03), '#9e9e9e', 0, -0.5, 0.02);
  part(bus, box(0.9, 0.5, 0.01), '#1a1a1a', BX, 0.7, sideZ + 0.004, { outline: false });
  const kitBag = (parent: THREE.Object3D) => {
    const b = group(parent);
    part(b, rbox(0.5, 0.26, 0.26, 0.1), GREEN_DARK, 0, 0, 0);
    part(b, box(0.502, 0.04, 0.262), WHITE, 0, 0.04, 0, { outline: false });
    for (const sx of [-1, 1]) part(b, ring(0.05, 0.01, Math.PI), '#212121', sx * 0.1, 0.13, 0, { outline: false });
    return b;
  };
  const inBay = [0, 1, 2].map((i) => {
    const b = kitBag(bus);
    b.position.set(BX - 0.25 + i * 0.25, 0.6, sideZ - 0.35 - (i % 2) * 0.05);
    b.rotation.y = Math.PI / 2;
    b.visible = false;
    return b;
  });
  const carried = kitBag(g);
  carried.visible = false;
  // Who's aboard when it goes: the driver at the wheel on the left, the team's heads along the windows.
  const driver = group(bus, nose - 0.75, BUS.floor + 1.55, -0.55);
  part(driver, ball(0.12), SKIN, 0, 0.1, 0);
  part(driver, ball(0.124), '#2b1b10', -0.02, 0.15, 0).scale.set(1, 0.7, 1);
  part(driver, rbox(0.3, 0.4, 0.4, 0.08), WHITE, 0, -0.22, 0);
  const heads = Array.from({ length: 8 }, (_, i) => {
    const h = group(bus, -3.0 + i * 0.75, BUS.floor + 1.72, (i % 2 ? 1 : -1) * 0.6);
    part(h, ball(0.11), SKIN, 0, 0, 0);
    part(h, ball(0.114), i % 3 ? '#1a1a1a' : '#4e342e', -0.02, 0.05, 0).scale.set(1, 0.7, 1);
    part(h, rbox(0.32, 0.25, 0.34, 0.08), GREEN, 0, -0.25, 0);
    return h;
  });
  driver.visible = false;
  heads.forEach((h) => (h.visible = false));
  const honk = bubble(g, '빵빵! 출발합니다', 1.3, 38);
  const tails: THREE.Mesh[] = [];
  for (const sz of [-1, 1]) {
    const m = glowing(bus, rbox(0.045, 0.18, 0.18, 0.02), '#ff1744', -nose - 0.02, BUS.floor + 0.55, sz * 0.75);
    m.visible = false;
    tails.push(m);
  }

  const load = use(g, 'athLoadKit', BX, sideZ + BUS.z + 0.42, Math.PI);
  out.spots = { athLoadKit: load, '*': load };
  out.work = load.work;
  let state: 'parked' | 'leaving' | 'gone' | 'back' | undefined;
  let since = 0;
  let open = 0;
  let last = 0;
  const RUN = 13;
  out.away = (isOut, t) => {
    const dt = Math.min(0.1, Math.max(0, t - last));
    last = t;
    if (state === undefined) state = isOut ? 'gone' : 'parked';
    else if (isOut && (state === 'parked' || state === 'back')) [state, since] = ['leaving', t];
    else if (!isOut && (state === 'leaving' || state === 'gone')) [state, since] = ['back', t];
    let x = 0;
    if (state === 'leaving') {
      const u = Math.min(1, (t - since) / 5);
      x = RUN * u * u;
      if (u >= 1) state = 'gone';
    } else if (state === 'back') {
      const u = Math.min(1, (t - since) / 6.5);
      x = RUN * (1 - u) * (1 - u);
      if (u >= 1) state = 'parked';
    }
    bus.position.x = x;
    bus.visible = state !== 'gone';
    wheels.forEach((w) => (w.rotation.z = -x / BUS.wheelR));
    const moving = state === 'leaving' || state === 'back';
    driver.visible = moving;
    heads.forEach((h) => (h.visible = moving));
    tails.forEach((m) => (m.visible = state === 'back' || (moving && Math.sin(t * 6) > 0)));
    honk.visible = state === 'leaving' && t - since < 1.6;
    honk.position.set(bus.position.x + 2.5, 3.6, BUS.z);
    // Loading the kit: the bay's door up, the bag in the hands, the bags in the bay.
    const loading = state === 'parked' && posed(load, t);
    open = THREE.MathUtils.damp(open, loading ? 1 : 0, 5, dt);
    hinge.rotation.x = -1.35 * open;
    if (loading) {
      const k = kOf(load);
      const n = A.loadNow(t, phaseOf(load), k);
      inBay.forEach((b, i) => (b.visible = i < n.loaded));
      if (n.bag) {
        placeAt(carried, at(load, n.bag), Math.PI + Math.PI / 2, 0);
        carried.visible = true;
      } else carried.visible = false;
    } else {
      inBay.forEach((b) => (b.visible = open > 0.05));
      carried.visible = false;
    }
  };
}

// =============================================================================================
// The agility zone (3 × 1): the ladder, two cones, a little goal at the far end; the coach for the 기본기.

function agility(g: THREE.Group, out: Built) {
  const SX = -1.3;
  const SZ = 0.05;
  const P = (along: number, across: number, y = 0) => v3(SX + along, y, SZ - across);
  part(g, rbox(3.0, 0.03, 1.0, 0.01), TURF, 0, 0.015, 0, { outline: false });
  for (let i = 0; i < 6; i++) part(g, box(0.5, 0.004, 1.0), i % 2 ? '#43964b' : TURF, -1.25 + i * 0.5, 0.032, 0, { outline: false });
  // The ladder: two yellow straps and their flat rungs.
  const R = A.AGIL.rungs;
  for (const s of [-1, 1]) {
    const a = P(R[0], s * 0.22, 0.036);
    const b = P(R[R.length - 1], s * 0.22, 0.036);
    part(g, box(b.x - a.x + 0.02, 0.006, 0.03), '#fdd835', (a.x + b.x) / 2, 0.036, a.z, { outline: false });
  }
  for (const r of R) {
    const p = P(r, 0);
    part(g, box(0.03, 0.01, 0.46), '#fbc02d', p.x, 0.038, p.z, { outline: false });
  }
  // The cones.
  for (const c of A.AGIL.cones) {
    const p = P(c.z, c.x);
    part(g, cyl(0.02, 0.09, 0.22, 14), '#ff6d00', p.x, 0.14, p.z);
    part(g, box(0.17, 0.02, 0.17), '#ff6d00', p.x, 0.04, p.z);
    part(g, cyl(0.05, 0.065, 0.03, 12), WHITE, p.x, 0.15, p.z, { outline: false });
  }
  // The little goal: a white frame, its net sagging back, pushed out when the ball goes in.
  const gx = SX + A.AGIL.goal;
  const back = SX + A.AGIL.back - 0.02;
  const gz = SZ - 0.12;
  const GW = 0.42;
  const GH = 0.55;
  for (const s of [-1, 1]) {
    part(g, cyl(0.02, 0.02, GH, 8), WHITE, gx, GH / 2 + 0.03, gz + s * GW);
    rod(g, v3(gx, GH + 0.03, gz + s * GW), v3(back, 0.06, gz + s * GW), 0.012, WHITE);
    rod(g, v3(gx, 0.04, gz + s * GW), v3(back, 0.04, gz + s * GW), 0.012, WHITE);
  }
  part(g, cyl(0.02, 0.02, GW * 2, 8), WHITE, gx, GH + 0.03, gz, { rx: Math.PI / 2 });
  const NET = new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap: gradient, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });
  const netMesh = new THREE.Mesh(new THREE.PlaneGeometry(GW * 2, 0.7, 6, 6), NET);
  netMesh.userData.ownGeometry = netMesh.userData.ownMaterial = true;
  const netG = group(g, (gx + back) / 2, 0.32, gz, Math.PI / 2);
  netMesh.rotation.x = -0.9;
  netG.add(netMesh);
  // A bag of balls at the start, the ball in play.
  const bagP = P(-0.05, -0.42);
  part(g, cyl(0.15, 0.13, 0.3, 14), '#212121', bagP.x, 0.18, bagP.z);
  for (let i = 0; i < 4; i++) part(g, ball(0.1), i % 2 ? WHITE : '#fafafa', bagP.x - 0.05 + (i % 2) * 0.1, 0.33 + Math.floor(i / 2) * 0.04, bagP.z - 0.05 + Math.floor(i / 2) * 0.08);
  const footy = group(g);
  part(footy, ball(0.11), WHITE, 0, 0, 0);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    part(footy, ball(0.035), '#212121', Math.cos(a) * 0.095, Math.sin(a) * 0.05, Math.sin(a + 1) * 0.06, { outline: false });
  }
  // The coach (for the 기본기): whistle, claps, shows the steps.
  const coach = figure(g, LOOKS.coach);
  coach.root.visible = false;
  const calls = ['하나 둘! 하나 둘!', '발 빠르게!', '좋아, 그거야!'].map((w) => bubble(g, w, 0.95, 42));
  const drill = use(g, 'athLadder', SX, SZ, Math.PI / 2);
  const basic = use(g, 'athDrill', SX, SZ, Math.PI / 2);
  const match = use(g, 'athDribble', SX, SZ, Math.PI / 2);
  out.spots = { athLadder: drill, athletic_basicDrills: basic, athletic_practiceMatch: match, '*': drill };
  out.work = drill.work;
  out.away = (_o, t) => {
    const who = nowAt([drill, basic, match], t);
    // The ball: rolling with the dribbler, into the net; otherwise waiting at the start.
    let net = 0;
    let ballAt: THREE.Vector3 | null = at(match, A.AGIL.ballStart);
    if (who === match) {
      const d = A.dribbleNow(t, phaseOf(match));
      ballAt = d.ball ? at(match, d.ball) : null;
      net = d.net;
      footy.rotation.z = -(d.ball?.z ?? 0) / 0.11;
    }
    placeAt(footy, ballAt);
    netMesh.rotation.x = -0.9 + 0.35 * net;
    netG.position.x = (gx + back) / 2 + 0.06 * net;
    // The coach: by the ladder, showing the footwork, whistling the start, clapping the rhythm.
    coach.root.visible = who === basic;
    calls.forEach((c) => (c.visible = false));
    if (who === basic) {
      const ph = phaseOf(basic);
      const a = A.ladderNow(t, ph, true);
      const cx = SX + 0.65;
      const cz = SZ + 0.78;
      const yaw = Math.PI + 0.25;
      const fw = v3(Math.sin(yaw), 0, Math.cos(yaw));
      const lf = v3(Math.cos(yaw), 0, -Math.sin(yaw));
      const pt = (side: number, up: number, ahead: number) => v3(cx, up, cz).addScaledVector(lf, side).addScaledVector(fw, ahead);
      if (a.key === 'watch') {
        // Quick feet on the spot, pointing at the ladder.
        const hop = Math.abs(Math.sin(t * 9)) * 0.03;
        standAt(coach, cx, cz, yaw - 0.6, 0.1, pt(0.2, 0.95, 0.15), pt(-0.45, 1.25, 0.45), 0.3, 0.15 + hop);
        calls[0].visible = true;
      } else if (a.key === 'ready') {
        standAt(coach, cx, cz, yaw, 0.02, pt(0.15, 1.0, 0.1), pt(-0.02, 1.5, 0.12), 0.1);
      } else if (a.key === 'ladder') {
        const c = Math.abs(Math.sin(t * 6));
        standAt(coach, cx, cz, yaw, 0.05, pt(0.04 + 0.06 * c, 1.15, 0.3), pt(-0.04 - 0.06 * c, 1.15, 0.3), 0.15);
        calls[a.u < 0.5 ? 1 : 0].visible = true;
      } else {
        standAt(coach, cx, cz, yaw, 0.02, pt(0.2, 0.95, 0.08), pt(-0.3, 1.6, 0.2), 0.0);
        if (a.key === 'stop') calls[2].visible = true;
      }
      for (const c of calls) c.position.set(cx, 2.15, cz);
    }
  };
}

// =============================================================================================
// The ice bath (2 × 1): a steel tub of iced water, its chiller, the thermometer and timer, the steps.

function iceBath(g: THREE.Group, out: Built) {
  const T = A.TUB;
  const RIM = 0.76;
  // The tub: steel walls round, its rolled rim, the water with ice floating in it.
  part(g, rbox(1.75, RIM, 0.86, 0.18), '#b0bec5', -0.05, RIM / 2, 0);
  part(g, rbox(1.62, 0.02, 0.72, 0.1), '#37474f', -0.05, RIM + 0.002, 0, { outline: false });
  part(g, rbox(1.8, 0.05, 0.9, 0.025), CHROME, -0.05, RIM, 0);
  part(g, rbox(1.6, 0.015, 0.7, 0.1), '#7fb8d6', -0.05, T.water - 0.01, 0, { outline: false });
  const surface = part(g, rbox(1.6, 0.02, 0.7, 0.1), '#b3e5fc', -0.05, T.water, 0, { outline: false, shadow: false, material: WATER });
  const ice = Array.from({ length: 11 }, (_, i) => {
    const m = part(g, rbox(0.07, 0.05, 0.07, 0.015), '#e1f5fe', -0.75 + (i % 6) * 0.28 + (i > 5 ? 0.12 : 0), T.water + 0.01, i > 5 ? -0.18 : 0.2, { ry: i * 0.7 });
    return { m, x: m.position.x, z: m.position.z, ph: i * 0.37 };
  });
  // The chiller box at the right end with its hoses, the thermometer and the timer on its face.
  const ch = group(g, 0.92, 0, -0.1);
  part(ch, rbox(0.14, 0.62, 0.46, 0.03), '#eceff1', 0, 0.31, 0);
  for (let i = 0; i < 6; i++) part(ch, box(0.005, 0.02, 0.36), '#90a4ae', 0.071, 0.12 + i * 0.05, 0, { outline: false });
  part(ch, rbox(0.02, 0.2, 0.28, 0.01), '#263238', 0.075, 0.5, 0);
  const temp = liveText(ch, 0.12, 0.05, 0.086, 0.55, 0.06, Math.PI / 2, '#4fc3f7');
  const timer = liveText(ch, 0.12, 0.05, 0.086, 0.47, 0.06, Math.PI / 2, '#ffca28');
  label(ch, '냉탕', 0.12, 0.05, 0.086, 0.55, -0.08, '#263238', '#ffffff', Math.PI / 2);
  for (const z of [-0.12, 0.12]) rod(g, v3(0.85, 0.3, -0.1 + z), v3(0.8, RIM + 0.02, z * 0.7), 0.018, '#455a64');
  // The two-step stool, a towel on the rail behind, the club's crest on the tub's side.
  part(g, rbox(0.4, 0.18, 0.3, 0.03), '#78909c', -0.55, 0.09, 0.62);
  part(g, rbox(0.4, 0.36, 0.15, 0.03), '#78909c', -0.55, 0.18, 0.55);
  for (const x of [-0.75, 0.55]) part(g, cyl(0.012, 0.012, 1.0, 8), STEEL, x, 0.5, -0.48);
  part(g, cyl(0.014, 0.014, 1.32, 8), STEEL, -0.1, 1.0, -0.48, { rz: Math.PI / 2 });
  part(g, rbox(0.45, 0.4, 0.03, 0.01), GREEN, -0.25, 0.82, -0.48);
  part(g, box(0.45, 0.04, 0.032), WHITE, -0.25, 0.7, -0.48, { outline: false });
  crest(g, 0.16, -0.05, 0.42, 0.432);
  const brr = bubble(g, '으으 차가워!', 0.95, 44);
  const drops = [0, 1, 2, 3, 4, 5].map(() => part(g, ball(0.015), '#b3e5fc', 0, 0, 0, { outline: false, shadow: false, material: WATER }));
  const s = use(g, 'athIceBath', -0.5, 0, Math.PI / 2);
  out.spots = { '*': s };
  out.work = s.work;
  let since = -1;
  out.away = (_o, t) => {
    const on = posed(s, t);
    if (on && since < 0) since = t;
    if (!on) since = -1;
    temp('6.0°C');
    const left = on ? Math.max(0, 600 - (t - since) * 20) : 600;
    timer(`${String(Math.floor(left / 60)).padStart(2, '0')}:${String(Math.floor(left % 60)).padStart(2, '0')}`);
    // The ice bobbing, more when someone's in.
    for (const c of ice) {
      const b = on ? 0.02 : 0.006;
      c.m.position.set(c.x + b * Math.sin(t * 0.9 + c.ph * 7), T.water + 0.01 + b * 0.5 * Math.sin(t * 1.7 + c.ph * 5), c.z + b * Math.cos(t * 0.7 + c.ph * 3));
    }
    surface.position.y = T.water + (on ? 0.012 : 0);
    const a = on ? A.tubNow(t, phaseOf(s)) : null;
    brr.visible = !!a && a.key === 'shiver' && a.u < 0.6;
    brr.position.copy(at(s, A.p3(0, 1.55, 0.1)));
    const splash = !!a && a.key === 'splash';
    drops.forEach((d, i) => {
      d.visible = splash;
      if (!splash) return;
      const u = (t * 1.8 + i / 6) % 1;
      const p = at(s, A.p3((i % 2 ? 1 : -1) * (0.12 + 0.04 * i), 0.9 + 0.3 * Math.sin(Math.PI * u), 0.15 + 0.05 * i));
      d.position.copy(p);
    });
  };
}

// =============================================================================================
// The players' bench (3 × 1): three players sat facing the tactics board, waiting on the team talk.

function teamBench(g: THREE.Group) {
  const SEAT = 0.44;
  part(g, rbox(2.8, 0.07, 0.42, 0.03), GREEN, 0, SEAT - 0.035, -0.05);
  part(g, rbox(2.8, 0.4, 0.06, 0.03), GREEN, 0, SEAT + 0.24, -0.27, { rx: -0.08 });
  label(g, CLUB, 0.5, 0.1, 0, SEAT + 0.28, -0.305, GREEN, WHITE, Math.PI);
  for (const x of [-1.25, 0, 1.25]) {
    part(g, rbox(0.05, SEAT - 0.07, 0.05, 0.01), '#9e9e9e', x, (SEAT - 0.07) / 2, -0.05);
    part(g, rbox(0.05, 0.03, 0.42, 0.01), '#9e9e9e', x, 0.015, -0.05);
  }
  // Under it: a bag, water bottles, a pair of boots; a towel on the end.
  part(g, rbox(0.5, 0.22, 0.25, 0.08), GREEN_DARK, -0.8, 0.11, -0.12);
  for (const x of [0.4, 0.5]) part(g, cyl(0.035, 0.035, 0.2, 12), GREEN, x, 0.1, 0.15);
  part(g, rbox(0.25, 0.03, 0.38, 0.01), WHITE, 1.25, SEAT + 0.015, -0.05);
  const players = LOOKS.bench.map((look) => figure(g, look));
  const notebook = loose(g);
  part(notebook, rbox(0.12, 0.16, 0.012, 0.004), '#fbc02d', 0, 0, 0);
  const bottle = loose(g);
  part(bottle, cyl(0.035, 0.035, 0.2, 12), GREEN, 0, 0, 0);
  part(bottle, cyl(0.015, 0.02, 0.04, 10), WHITE, 0, 0.12, 0);
  const pen = loose(g);
  part(pen, cyl(0.005, 0.005, 0.12, 6), '#1565c0', 0, 0, 0, { rx: 0.5, outline: false });
  const xs = [-0.95, 0.05, 0.95];
  return (t: number) => {
    players.forEach((f, i) => {
      const x = xs[i];
      const ph = i * 1.7;
      const look = 0.08 * Math.sin(t * 0.21 + ph);
      if (i === 0) {
        // Leaning in, elbows on the knees, nodding along.
        const hl = v3(x + 0.08, 0.62, 0.32);
        const hr = v3(x - 0.08, 0.62, 0.32);
        sitAt(f, x, SEAT, -0.05, 0, hl, hr, 0.0 + 0.08 * Math.max(0, Math.sin(t * 1.3)), look, 0.35);
      } else if (i === 1) {
        // Notes in the little notebook, looking up at the board now and then.
        const up = Math.sin(t * 0.35 + ph) > 0.2;
        const nb = v3(x + 0.05, 0.68, 0.24);
        sitAt(f, x, SEAT, -0.05, 0, nb, v3(x - 0.03 + 0.02 * Math.sin(t * 5), 0.69, 0.27), up ? -0.05 : 0.45, look, 0.12);
        placeAt(notebook, nb, 0, -1.1);
        placeAt(pen, v3(x - 0.03 + 0.02 * Math.sin(t * 5), 0.71, 0.27), 0, 0);
      } else {
        // A drink from the bottle every so often, otherwise held on the knee.
        const w = Math.max(0, Math.sin(t * 0.4 + ph));
        const drink = THREE.MathUtils.smoothstep(w, 0.7, 0.9);
        const hb = v3(x - 0.12, mix(0.62, 1.12, drink), mix(0.32, 0.1, drink));
        sitAt(f, x, SEAT, -0.05, 0, v3(x + 0.14, 0.58, 0.25), hb, mix(0.05, -0.45, drink), look, 0.02);
        placeAt(bottle, hb.clone().add(v3(0, 0.05, 0)), 0, mix(0, 2.3, drink));
      }
    });
  };
}

// =============================================================================================
// The lockers (2 × 1): four open wooden stalls, a shirt on each hook, boots on the shelf, names on top.

const LOCKER_NAMES = [
  [['1', '오태양'], ['9', '모재현'], ['10', '강한결'], ['17', '서진우']],
  [['4', '윤도겸'], ['8', '차시우'], ['14', '남태민'], ['21', '류하람']],
];
function shirt(parent: THREE.Object3D, num: string): THREE.Group {
  const s = group(parent);
  part(s, rbox(0.34, 0.42, 0.04, 0.03), GREEN, 0, -0.21, 0);
  for (const sx of [-1, 1]) part(s, rbox(0.1, 0.14, 0.04, 0.02), GREEN, sx * 0.19, -0.06, 0, { rz: sx * 0.5 });
  part(s, box(0.346, 0.03, 0.042), WHITE, 0, -0.03, 0, { outline: false });
  if (num) label(s, num, 0.16, 0.16, 0, -0.2, 0.022, GREEN, WHITE);
  return s;
}
function lockers(g: THREE.Group, out: Built) {
  const L = A.LOCKERS;
  const FZ = -0.05;
  const BACK = -0.48;
  const D = FZ - BACK;
  const spot0 = FZ + L.face;
  // The carcass: back, sides, top cornice, the boot shelf and the seat shelf across the front.
  part(g, rbox(2.0, 2.05, 0.04, 0.01), '#8d6e63', 0, 1.025, BACK);
  part(g, rbox(2.04, 0.1, D + 0.04, 0.02), '#6d4c41', 0, 2.05, (FZ + BACK) / 2);
  for (let i = 0; i <= 4; i++) part(g, rbox(0.03, 2.0, D, 0.01), '#a1887f', -1.0 + i * 0.5, 1.0, (FZ + BACK) / 2);
  part(g, rbox(2.0, 0.04, D, 0.01), '#a1887f', 0, L.boots - 0.02, (FZ + BACK) / 2);
  part(g, rbox(2.0, 0.04, D, 0.01), '#a1887f', 0, 1.78, (FZ + BACK) / 2);
  part(g, rbox(2.0, 0.06, 0.3, 0.02), GREEN_DARK, 0, 0.45, FZ + 0.05);
  for (const x of [-0.9, 0, 0.9]) part(g, rbox(0.05, 0.42, 0.05, 0.01), '#5d4037', x, 0.21, FZ + 0.12);
  crest(g, 0.18, 0, 1.92, BACK + 0.03);
  const shirts: THREE.Group[] = [];
  const boots: THREE.Group[] = [];
  const plates: Array<{ x: number; num: string; name: string }> = [];
  [0, 1, 2, 3].forEach((i) => {
    // Locker i: its middle across (piece x) from the tidy motion's (the body's) frame.
    const x = -L.across[i];
    rod(g, v3(x, L.hook + 0.04, BACK + 0.02), v3(x, L.hook + 0.04, FZ - 0.1), 0.01, CHROME);
    const sh = shirt(g, '');
    sh.position.set(x, L.hook + 0.02, FZ - 0.12);
    shirts.push(sh);
    const bt = group(g, x, L.boots, FZ - 0.17);
    for (const sx of [-1, 1]) {
      part(bt, rbox(0.09, 0.08, 0.24, 0.03), '#212121', sx * 0.06, 0.04, 0);
      part(bt, box(0.092, 0.012, 0.18), '#fdd835', sx * 0.06, 0.012, -0.01, { outline: false });
    }
    boots.push(bt);
    // Folded shorts on the top shelf, a towel; a shin pad leaning.
    part(g, rbox(0.3, 0.06, 0.24, 0.02), '#1b1b1f', x, 1.83, BACK + 0.2);
    part(g, rbox(0.06, 0.18, 0.1, 0.02), '#eceff1', x + 0.15, L.boots + 0.09, BACK + 0.12, { rz: 0.2 });
    plates.push({ x, num: '', name: '' });
  });
  const basket = group(g, -L.basket.x, 0, spot0 - L.basket.z);
  part(basket, rbox(0.36, 0.3, 0.28, 0.05), '#d7ccc8', 0, 0.15, 0);
  part(basket, box(0.33, 0.02, 0.25), '#2e7d32', 0, 0.29, 0, { outline: false });
  label(basket, '세탁 완료', 0.2, 0.05, 0, 0.18, 0.142, '#d7ccc8', '#5d4037');
  const carried = loose(g);
  part(carried, rbox(0.28, 0.06, 0.24, 0.02), GREEN, 0, 0, 0);
  part(carried, box(0.282, 0.012, 0.242), WHITE, 0, 0.02, 0, { outline: false });
  const s = use(g, 'athTidy', 0, spot0, Math.PI);
  out.spots = { '*': s };
  out.work = s.work;
  let set = -1;
  out.away = (_o, t) => {
    if (set < 0) {
      g.getWorldPosition(tmp);
      set = (((Math.round(tmp.x) + Math.round(tmp.z)) % 2) + 2) % 2;
      // The names over the stalls and the numbers on the shirts, once it's known which row of players this is.
      LOCKER_NAMES[set].forEach(([num, name], i) => {
        label(g, `${num}  ${name}`, 0.4, 0.07, plates[i].x, 1.97, FZ + 0.005, '#3e2723', '#ffe082');
        label(shirts[i], num, 0.14, 0.14, 0, -0.2, 0.022, GREEN, WHITE);
      });
    }
    const on = posed(s, t);
    const n = on ? A.tidyNow(t, phaseOf(s)) : null;
    shirts.forEach((sh, i) => (sh.visible = !n || i !== n.j || n.hung));
    boots.forEach((b, i) => {
      const messy = !!n && i === n.j && !n.bootsTidy;
      b.rotation.y = messy ? 0.5 : 0;
      b.position.x = plates[i].x + (messy ? 0.06 : 0);
    });
    carried.visible = !!n && n.inHand;
    if (n?.inHand) {
      const h = A.athHands('athTidy', t, phaseOf(s), kOf(s));
      placeAt(carried, at(s, A.pMix(h.l, h.r, 0.5)), Math.PI, 0);
    }
  };
}

// =============================================================================================
// The water station (1 × 1): the water jug and the ion-drink cooler on a cart, the bottle carrier.

function hydration(g: THREE.Group, out: Built) {
  const W = A.WATER;
  const SZ = 0.45;
  // Body-frame → piece: the spot faces the cart (−z) from SZ.
  const B = (p: A.P3) => v3(-p.x, p.y, SZ - p.z);
  part(g, rbox(0.74, 0.04, 0.5, 0.01), '#eceff1', 0, 0.8, -0.1);
  part(g, rbox(0.74, 0.04, 0.5, 0.01), '#eceff1', 0, 0.42, -0.1);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    part(g, cyl(0.014, 0.014, 0.8, 8), STEEL, sx * 0.35, 0.4, -0.1 + sz * 0.23, { outline: false });
    part(g, cyl(0.03, 0.03, 0.03, 10), '#212121', sx * 0.35, 0.02, -0.1 + sz * 0.23, { rz: Math.PI / 2 });
  }
  // The water jug: a blue bottle upside down on its tap box.
  const tap = B(W.tap);
  part(g, rbox(0.22, 0.12, 0.22, 0.03), '#eceff1', tap.x, 0.88, -0.08);
  glass(g, cyl(0.13, 0.13, 0.36, 18), tap.x, 1.12, -0.08, new THREE.MeshToonMaterial({ color: '#4fc3f7', gradientMap: gradient, transparent: true, opacity: 0.55, depthWrite: false }));
  part(g, cyl(0.04, 0.05, 0.05, 12), '#4fc3f7', tap.x, 0.95, -0.08, { outline: false });
  part(g, rbox(0.04, 0.05, 0.05, 0.01), '#1565c0', tap.x, tap.y, tap.z - 0.02);
  // The ion-drink cooler (orange, with the club's sticker), its tap.
  const dt = B(W.drinkTap);
  part(g, cyl(0.15, 0.15, 0.36, 20), '#ff8f00', dt.x + 0.06, 1.0, -0.12);
  part(g, cyl(0.155, 0.155, 0.05, 20), WHITE, dt.x + 0.06, 1.2, -0.12);
  label(g, 'ION', 0.12, 0.06, dt.x + 0.06, 1.02, 0.032, '#ff8f00', WHITE);
  part(g, rbox(0.04, 0.05, 0.05, 0.01), WHITE, dt.x, dt.y, dt.z - 0.02);
  // The cup tube on the side, the bin below, the bottle carrier on the low shelf.
  const cups = B(W.cups);
  part(g, cyl(0.04, 0.04, 0.3, 12), '#cfd8dc', cups.x + 0.08, cups.y - 0.05, -0.05);
  part(g, cyl(0.045, 0.035, 0.05, 12), '#fafafa', cups.x + 0.08, cups.y - 0.22, -0.05);
  part(g, cyl(0.12, 0.1, 0.3, 14), '#546e7a', 0.36, 0.15, 0.3);
  part(g, rbox(0.3, 0.08, 0.2, 0.02), '#37474f', B(W.slot(1)).x, 0.47, B(W.slot(1)).z - 0.04);
  const bottles = Array.from({ length: A.BOTTLES }, (_, j) => {
    const b = group(g);
    part(b, cyl(0.032, 0.032, 0.2, 12), '#e8f5e9', 0, 0.1, 0, { material: new THREE.MeshToonMaterial({ color: '#e8f5e9', gradientMap: gradient, transparent: true, opacity: 0.7 }) }).userData.ownMaterial = true;
    const fill = part(b, cyl(0.028, 0.028, 0.18, 10), '#29b6f6', 0, 0.09, 0, { outline: false });
    part(b, cyl(0.014, 0.024, 0.05, 10), GREEN, 0, 0.22, 0);
    const home = B(W.slot(j));
    return { b, fill, home };
  });
  const cup = loose(g);
  part(cup, cyl(0.035, 0.026, 0.09, 12), '#fafafa', 0, 0.045, 0);
  const cupFill = part(cup, cyl(0.03, 0.024, 0.07, 10), '#ff9800', 0, 0.04, 0, { outline: false });
  const jet = limb(g, 0.006, WATER);
  const s = use(g, 'athFill', 0, SZ, Math.PI);
  const d = use(g, 'athDrink', 0, SZ, Math.PI);
  out.spots = { athFillBottles: s, athDrink: d, '*': s };
  out.work = s.work;
  out.away = (_o, t) => {
    const who = nowAt([s, d], t);
    const f = who === s ? A.fillNow(t, phaseOf(s)) : null;
    const h = who === s ? A.athHands('athFill', t, phaseOf(s), kOf(s)) : null;
    bottles.forEach((o, j) => {
      const inHand = !!f && f.inHand && j === f.j;
      const full = f ? j < f.full || (j === f.j && f.level > 0.99) : true;
      if (inHand && h) {
        const p = at(s, h.r);
        o.b.position.set(p.x, p.y - 0.12, p.z);
      } else o.b.position.set(o.home.x, 0.44 + 0.0, o.home.z);
      const lvl = inHand && f ? Math.max(0.02, f.level) : full ? 1 : 0.02;
      o.fill.scale.y = lvl;
      o.fill.position.y = 0.09 * lvl;
    });
    let flow: THREE.Vector3 | null = null;
    let flowTo: THREE.Vector3 | undefined;
    if (f?.flowing && h) {
      flow = tap.clone().add(v3(0, -0.03, 0.01));
      flowTo = at(s, h.r).add(v3(0, 0.1, 0));
    }
    const dk = who === d ? A.drinkNow(t, phaseOf(d)) : null;
    if (dk) {
      const hd = A.athHands('athDrink', t, phaseOf(d), kOf(d));
      const p = at(d, hd.r);
      placeAt(cup, dk.cup ? p.add(v3(0, -0.04, 0)) : null, Math.PI, -1.6 * dk.tip);
      cupFill.scale.y = Math.max(0.02, dk.level);
      if (dk.flowing) {
        flow = dt.clone().add(v3(0, -0.03, 0.01));
        flowTo = cup.position.clone().add(v3(0, 0.06, 0));
      }
    } else cup.visible = false;
    jet(flow, flowTo);
  };
}

// =============================================================================================
// The trophy cabinet (2 × 1): glass doors, lit shelves of cups and medals, the team photo, pennants.

function trophyCase(g: THREE.Group) {
  part(g, rbox(1.9, 0.5, 0.48, 0.02), '#4e342e', 0, 0.25, -0.2);
  part(g, rbox(1.9, 0.08, 0.48, 0.02), '#4e342e', 0, 2.0, -0.2);
  part(g, box(1.86, 1.42, 0.02), '#3e2723', 0, 1.24, -0.43);
  for (const x of [-0.94, 0.94]) part(g, rbox(0.04, 1.5, 0.48, 0.01), '#5d4037', x, 1.24, -0.2);
  for (const y of [0.95, 1.4]) part(g, box(1.84, 0.015, 0.42), '#d7f1fb', 0, y, -0.2, { outline: false });
  // The lights along the top, the glass front with its two doors.
  glowing(g, box(1.8, 0.015, 0.03), '#fff8e1', 0, 1.94, -0.05);
  glass(g, box(1.84, 1.42, 0.01), 0, 1.24, 0.03);
  part(g, box(0.012, 1.42, 0.02), '#5d4037', 0, 1.24, 0.035);
  for (const x of [-0.06, 0.06]) part(g, cyl(0.008, 0.008, 0.12, 8), CHROME, x, 1.2, 0.05);
  const gold = '#ffca28';
  // Cups: a big league cup in the middle, two smaller, a plate trophy, a ball on its stand, medals.
  const cup = (x: number, y: number, s: number, c = gold) => {
    part(g, rbox(0.12 * s, 0.06 * s, 0.12 * s, 0.01), '#3e2723', x, y + 0.03 * s, -0.2);
    part(g, cyl(0.025 * s, 0.035 * s, 0.14 * s, 12), c, x, y + 0.13 * s, -0.2);
    part(g, cyl(0.09 * s, 0.04 * s, 0.16 * s, 16), c, x, y + 0.28 * s, -0.2);
    for (const sx of [-1, 1]) part(g, ring(0.04 * s, 0.008 * s, Math.PI), c, x + sx * 0.1 * s, y + 0.3 * s, -0.2, { rz: sx * Math.PI / 2 });
  };
  cup(0, 0.5, 1.5);
  cup(-0.55, 0.5, 1.0, '#cfd8dc');
  cup(0.55, 0.5, 1.1);
  cup(-0.25, 0.96, 0.8);
  part(g, cyl(0.12, 0.12, 0.015, 20), gold, 0.3, 1.1, -0.3, { rx: Math.PI / 2 - 0.2 });
  part(g, rbox(0.08, 0.04, 0.08, 0.01), '#3e2723', 0.65, 0.98, -0.2);
  part(g, ball(0.1), WHITE, 0.65, 1.1, -0.2);
  for (let i = 0; i < 4; i++) {
    const x = -0.75 + i * 0.13;
    rod(g, v3(x - 0.03, 1.85, -0.36), v3(x, 1.68, -0.36), 0.006, i % 2 ? '#c62828' : '#1565c0');
    rod(g, v3(x + 0.03, 1.85, -0.36), v3(x, 1.68, -0.36), 0.006, i % 2 ? '#c62828' : '#1565c0');
    part(g, cyl(0.035, 0.035, 0.008, 14), i === 3 ? '#cfd8dc' : gold, x, 1.65, -0.35, { rx: Math.PI / 2 });
  }
  picture(g, teamPhotoTex, 0.48, 0.32, 0.45, 1.68, -0.415);
  // Pennants on the back wall, the plate under the glass.
  for (const [x, c] of [[-0.2, GREEN], [0.05, '#1565c0']] as Array<[number, string]>) {
    const tri = new THREE.Shape();
    tri.moveTo(-0.08, 0);
    tri.lineTo(0.08, 0);
    tri.lineTo(0, -0.28);
    const m = part(g, new THREE.ShapeGeometry(tri), c, x, 1.88, -0.41, { outline: false });
    m.userData.ownGeometry = true;
  }
  label(g, `${CLUB} · 누리 리그 우승 2019 · 2023 · 누리컵 2021`, 1.4, 0.08, 0, 0.36, 0.045, '#3e2723', '#ffe082');
  crest(g, 0.18, -0.75, 0.32, 0.05);
}

export const BUILDERS: Record<string, Builder> = {
  /**
   * The sprint lane: red rubber with white edges, lane 3 painted by the start line, distance marks,
   * the chequered finish; the starting blocks on their rail (the front pedal for the left foot); the
   * start light (red, amber, green) on its post by the blocks; the finish clock on its stand and a
   * photo-finish camera. 스프린트 훈련 (athSprint): walked into the blocks and down into 제자리에
   * (the rear knee down, the hands on the line; red), up into 차렷 (the hips high; amber), 탕! (green)
   * — driven out low and accelerating up through the strides, braking past the finish as the clock
   * stops, the hands on the knees, a look back at the time, then turned and walked back to the blocks.
   */
  sprintTrack(g, _W, _D, _c, _def, _ctx, out) {
    sprintTrack(g, out);
  },
  /**
   * The obstacle course (the 군 기지's too): a turf strip with three pairs of tyres, a hurdle with its
   * red-and-white bar, a cargo net pegged low over a mud mat, a little flag at the end. 장애물 코스
   * (athObstacle): high knees through the tyres, over the hurdle (the lead leg out, the trail knee to
   * the side), down onto the belly and crawled elbow over elbow under the net, up, a fist up, and the
   * walk back along the front.
   */
  obstacleCourse(g, _W, _D, _c, _def, _ctx, out) {
    obstacleCourse(g, out);
  },
  /**
   * The pull-up bar (the 군 기지's too): two braced posts, the high chrome bar with its grips, a rubber
   * mat, the chalk bowl on the left post. 턱걸이 (athPullUp): the hands dipped in the chalk and clapped
   * (a puff), a reach, a jump up to the bar, six pull-ups (the chin over the bar, the knees drawn back),
   * dropped down, the arms shaken out, hands on the hips.
   */
  pullUpBar(g, _W, _D, _c, _def, _ctx, out) {
    pullUpBar(g, out);
  },
  /**
   * The weight rack on its platform: a half rack (the J-hooks, the safety arms, plates on its pegs) or,
   * the other one in the gym, a flat bench under its uprights; a barbell with red and blue bumpers.
   * 웨이트 트레이닝: at the half rack a back squat (athSquat: under the bar, unracked, five reps down
   * with the hips back and up, reracked, shaken out); at the bench a bench press (athBench: sat, lay
   * back, unracked, five reps to the chest, reracked, sat up). 대회 준비 코칭: a junior (27) does the
   * set while the dweller spots (behind the squat, hands under the bar following it down; at the bench's
   * head, hands just under the bar). 회원 운동 프로그램: a gym member lifts while the dweller watches from
   * the side with a clipboard, writing, cueing with a hand ("무릎은 바깥으로"), pointing.
   */
  weightRack(g, _W, _D, _c, _def, _ctx, out) {
    weightRack(g, out);
  },
  /**
   * The tactics board: a magnetic board on wheeled T-feet, the pitch printed sideways (솔뫼 FC vs
   * 해오름 유나이티드), red magnets ours and blue theirs, the marker tray, the coach's notes in the
   * margin; on the back the crest and the season's fixtures. 작전 분석 (athPlays): a hand on the chin,
   * a red magnet slid up the pitch, the marker taken and a run drawn after it (dash by dash, the
   * arrowhead), tapped, wiped with the eraser, the magnet slid back. 상대 팀 분석 (athScout): their
   * 4-3-3 on a tablet in the left hand, a blue magnet set out to match each round, a look from one to
   * the other, a line of notes written. 팀 미팅 (athTeamTalk): stood at the board's end turned to the
   * players' bench, the marker pointed back at the board, the hands opened out, a fist up (화이팅!), a
   * clap, the words over their head.
   */
  tacticsBoard(g, _W, _D, _c, _def, _ctx, out) {
    tacticsBoard(g, out);
  },
  /**
   * The physio table: teal padding with paper down it, a pillow, the paper roll, the scissor base and
   * foot bar; a trolley of kinesio tape, oil and a foam roller. 물리 치료 받기 (athPhysio): lying on
   * the back, eyes shut, while the physio (drawn in, at the left side) feels round the knee; the
   * straight leg lifted for the hamstring (a hand under the heel, one on the knee), the knee bent to
   * 90/90 and pumped, the calf and the thigh kneaded.
   */
  physioTable(g, _W, _D, _c, _def, _ctx, out) {
    physioTable(g, out);
  },
  /**
   * The team bus: a coach (8 m, laid along where it parks, the nose to the right) in white with the
   * green swoosh, 솔뫼 FC down its sides, tinted glass, the crest on the nose and the back, the
   * destination sign (솔뫼 FC 선수단), the door and its luggage bays on the near side. 원정 장비 싣기
   * (athLoadKit): the middle bay's door swings up, kit bags lifted off the kerb and shoved in, three a
   * round. 경기 출전: it pulls away with a toot, the driver at the wheel and the team at the windows,
   * and backs in again after.
   */
  teamBus(g, _W, _D, _c, _def, _ctx, out) {
    teamBus(g, out);
  },
  /**
   * The agility zone: turf, a yellow ladder, two cones, a little goal with its net, a bag of balls.
   * 사다리 스텝 훈련 (athLadder): two feet in every box, side-stepped round the cones, jogged back.
   * 기본기 (athDrill): the coach (drawn in, whistle and cap) shows the quick feet and points, whistles
   * the start, claps the rhythm (하나 둘!) as it's done slower. 연습 경기 (athDribble): the ball
   * dribbled through the cones, a plant and a shot, the net pushed back, both fists up, a new ball from
   * the bag.
   */
  athAgility(g, _W, _D, _c, _def, _ctx, out) {
    agility(g, out);
  },
  /**
   * The ice bath: a steel tub of water and floating ice, its chiller with the thermometer (6.0°C) and
   * the timer counting down, the step stool, a towel on the rail. 냉탕 (athIceBath): stepped in and
   * sat, the legs out under the water; hugging the shoulders and shivering (으으 차가워!), water
   * splashed over the shoulders, then sat back with the hands on the rim, eyes shut, breathing.
   */
  athIceBath(g, _W, _D, _c, _def, _ctx, out) {
    iceBath(g, out);
  },
  /** The players' bench: three players in the club's kit sat facing the tactics board — one leaning in, nodding; one taking notes; one drinking from a bottle. */
  athTeamBench(g, _W, _D, _c, _def, _ctx, out) {
    const tick = teamBench(g);
    out.away = (_o, t) => tick(t);
  },
  /**
   * The lockers: four wooden stalls with the players' names and numbers over them, a shirt on each
   * hook, shorts folded above, boots on the shelf, a seat across the front, the laundry basket.
   * 라커룸 정리하기 (athTidy): a clean shirt from the basket hung in its stall and smoothed down, its
   * boots straightened, one stall a round.
   */
  athLockers(g, _W, _D, _c, _def, _ctx, out) {
    lockers(g, out);
  },
  /**
   * The water station: a cart with the water jug on its tap, the orange ion-drink cooler, the cup
   * tube, a bin; six squeeze bottles in their carrier. 물병 채우기 (athFill): a bottle out of the
   * carrier, held under the tap (the water runs, it fills), capped, put back, the next. 이온 음료
   * (athDrink): a cup off the tube, filled at the cooler, drunk down, tossed in the bin, the mouth wiped.
   */
  athHydration(g, _W, _D, _c, _def, _ctx, out) {
    hydration(g, out);
  },
  /** The trophy cabinet: lit glass shelves of cups (the league cup in the middle), medals hung, a ball on its stand, the 2023 team photo, pennants and the plate of honours. */
  athTrophyCase(g) {
    trophyCase(g);
  },
  /**
   * The training pitch's lines (new, 2026-11-05, the layout audit; flat, walked over), drawn from the corner tile it's held by: the
   * mown stripes, the goal line and the boxes in front of the goal, the penalty spot and its arc, the touchline, and the sprint lane
   * running up the touchline from the starting blocks with its 10 m marks.
   */
  athPitch(g) {
    pitch(g);
  },
  /**
   * The fence round the training ground (new, 2026-11-05, the layout audit; flat, walked over), drawn from its corner tile: mesh
   * along the back and the side and along the street up to the guard booth, the gateway open beside it; the tall ball-stop net on
   * its poles behind the goal; 관계자 외 출입 금지 on the street side.
   */
  athGroundFence(g) {
    groundFence(g);
  },
  /** A full-size goal (new, 2026-11-05, the layout audit): white posts and bar 7.32 by 2.44 m on the goal line, the net back to its frame, a few balls in it. */
  athGoal(g, W, D) {
    goal(g, W, D);
  },
  /** The guard booth at the gate (new, 2026-11-05, the layout audit): a white cabin with its window on the gateway, 경비실, the barrier's arm raised for the bus. */
  athGateBooth(g) {
    gateBooth(g);
  },
  /** The analysis room's screen (new, 2026-11-05, the layout audit): a big screen on its stand, last match's footage paused from above with the runs and the pressing lines drawn over it. */
  athMatchScreen(g, W) {
    matchScreen(g, W);
  },
};

function matchScreen(g: THREE.Group, W: number) {
  const sw = W - 0.2;
  const sh = sw * 0.56;
  const cy = 1.45;
  const z = -0.3;
  for (const sx of [-1, 1]) part(g, box(0.05, cy, 0.05), '#37474f', sx * (sw / 2 - 0.2), cy / 2, z - 0.04);
  part(g, rbox(sw + 0.06, sh + 0.06, 0.06, 0.02), '#1b1b1f', 0, cy, z);
  const tex = painted('athMatchScreen', 320, 180, (c) => {
    c.fillStyle = '#2f7d3a';
    c.fillRect(0, 0, 320, 180);
    c.fillStyle = '#378a42';
    for (let i = 0; i < 8; i += 2) c.fillRect(i * 40, 0, 40, 180);
    c.strokeStyle = '#e8f5e9';
    c.lineWidth = 2;
    c.strokeRect(10, 20, 300, 150);
    c.beginPath();
    c.moveTo(160, 20);
    c.lineTo(160, 170);
    c.stroke();
    c.beginPath();
    c.arc(160, 95, 22, 0, Math.PI * 2);
    c.stroke();
    const dots: Array<[number, number, string]> = [[60, 60, '#ffffff'], [90, 120, '#ffffff'], [140, 80, '#ffffff'], [200, 110, '#ffffff'], [120, 140, '#ffffff'], [180, 60, '#1e88e5'], [230, 90, '#1e88e5'], [250, 140, '#1e88e5'], [210, 40, '#1e88e5']];
    for (const [x, y, col] of dots) {
      c.fillStyle = col;
      c.beginPath();
      c.arc(x, y, 5, 0, Math.PI * 2);
      c.fill();
    }
    c.strokeStyle = '#ffeb3b';
    c.lineWidth = 3;
    c.setLineDash([8, 5]);
    c.beginPath();
    c.moveTo(140, 80);
    c.quadraticCurveTo(190, 70, 230, 60);
    c.stroke();
    c.setLineDash([]);
    c.fillStyle = 'rgba(0,0,0,0.6)';
    c.fillRect(0, 0, 320, 18);
    text(c, '솔뫼 FC 1 : 0 해오름  ·  전반 23:14  일시정지', 160, 10, 12, '#ffffff', 'center');
  });
  picture(g, tex, sw, sh, 0, cy, z + 0.032);
  label(g, '경기 영상 분석', 0.36, 0.06, sw / 2 - 0.25, cy - sh / 2 - 0.02, z + 0.034, '#1b1b1f', '#90a4ae');
}

// =============================================================================================
// The ground out of doors (2026-11-05, the layout audit).

const NO_OUTLINE = { outline: false, shadow: false };
const paint = (g: THREE.Object3D, w: number, d: number, x: number, z: number, color = WHITE, y = 0.012) => part(g, box(w, 0.004, d), color, x, y, z, NO_OUTLINE);

/** Held by the tile (1, 1): a lot point (x, y) is (x - 1.5, y - 1.5) from its middle. */
function pitch(g: THREE.Group) {
  const at = (x: number) => x - 1.5;
  // The mown stripes across the pitch.
  for (let i = 0; i < 9; i++) if (i % 2) paint(g, 9.8, 1.5, at(7.1), at(0.6 + i * 1.5 + 0.75), '#4f9d47', 0.006);
  // The goal line, the touchline, the boxes, the spot and its arc.
  const L = 2.2;
  const R = 12.0;
  const G = 3.0;
  paint(g, R - L, 0.1, at((L + R) / 2), at(G));
  paint(g, 0.1, 14.4 - G, at(L), at((G + 14.4) / 2));
  const box2 = (x0: number, x1: number, y1: number) => {
    paint(g, 0.1, y1 - G, at(x0), at((G + y1) / 2));
    paint(g, 0.1, y1 - G, at(x1), at((G + y1) / 2));
    paint(g, x1 - x0 + 0.1, 0.1, at((x0 + x1) / 2), at(y1));
  };
  box2(3.6, 9.4, 5.2);
  box2(2.6, 10.4, 9.0);
  part(g, cyl(0.12, 0.12, 0.004, 14), WHITE, at(6.5), 0.012, at(7.6), NO_OUTLINE);
  for (let i = 0; i <= 10; i++) {
    const a = -0.9 + (1.8 * i) / 10;
    part(g, cyl(0.05, 0.05, 0.004, 8), WHITE, at(6.5 + 2.2 * Math.sin(a)), 0.012, at(7.6 + 2.2 * Math.cos(a)), NO_OUTLINE);
  }
  // The sprint lane up the touchline from the blocks (the blocks' own stretch is the sprint track piece, y 10..13).
  paint(g, 0.96, 9.0, at(1.5), at(5.5), TRACK, 0.009);
  for (const sx of [-0.46, 0.46]) paint(g, 0.035, 9.0, at(1.5 + sx), at(5.5));
  // From the blocks at the lane's foot (y 12.6), north up the touchline.
  ([[7.6, '5m'], [2.6, '10m']] as Array<[number, string]>).forEach(([y, s]) => {
    paint(g, 0.9, 0.05, at(1.5), at(y));
    const tex = painted(`athLane|${s}`, 96, 48, (c) => {
      c.clearRect(0, 0, 96, 48);
      text(c, s, 48, 26, 30, WHITE, 'center');
    });
    const m = picture(g, tex, 0.5, 0.25, at(1.5), 0.014, at(y) + 0.3, '#ffffff', 0, -Math.PI / 2);
    m.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
  });
}

/** Held by the corner tile (0, 0): a lot point (x, y) is (x - 0.5, y - 0.5) from its middle. */
function groundFence(g: THREE.Group) {
  const at = (x: number) => x - 0.5;
  fenceRun(g, at(0.05), at(0.05), at(16), at(0.05));
  fenceRun(g, at(0.05), at(0.05), at(0.05), at(14.9));
  fenceRun(g, at(0.05), at(14.9), at(10.9), at(14.9));
  // The ball-stop net behind the goal: tall green poles, a fine net between them.
  const netMat = new THREE.MeshToonMaterial({ color: '#2e7d32', transparent: true, opacity: 0.22, depthWrite: false, gradientMap: gradient, side: THREE.DoubleSide });
  const H = 6;
  for (const x of [1.5, 6.5, 11.5]) part(g, cyl(0.06, 0.07, H, 10), '#2e7d32', at(x), H / 2, at(0.25));
  const net = new THREE.Mesh(box(10, H - 0.2, 0.01), netMat);
  net.userData.ownMaterial = true;
  net.position.set(at(6.5), H / 2, at(0.25));
  net.renderOrder = 2;
  g.add(net);
  part(g, box(10, 0.04, 0.04), '#2e7d32', at(6.5), H - 0.1, at(0.25), { outline: false });
  // The notice on the street side.
  part(g, rbox(1.1, 0.4, 0.03, 0.01), '#1b5e20', at(6), 1.3, at(14.9) + 0.04);
  label(g, '솔뫼 FC 훈련장 · 관계자 외 출입 금지', 1.04, 0.32, at(6), 1.3, at(14.9) + 0.06, '#1b5e20', '#ffffff');
}

function goal(g: THREE.Group, _W: number, D: number) {
  const gw = 7.32;
  const gh = 2.44;
  const zf = D / 2 - 0.12;
  const zb = -D / 2 + 0.25;
  const POST = '#fafafa';
  for (const sx of [-1, 1]) {
    part(g, cyl(0.06, 0.06, gh, 12), POST, sx * (gw / 2), gh / 2, zf);
    // The frame the net hangs off, back to the ground behind.
    rod(g, v3(sx * (gw / 2), gh, zf), v3(sx * (gw / 2), 1.6, zb), 0.02, '#cfd8dc');
    rod(g, v3(sx * (gw / 2), 1.6, zb), v3(sx * (gw / 2), 0, zb), 0.02, '#cfd8dc');
    rod(g, v3(sx * (gw / 2), 0.02, zf), v3(sx * (gw / 2), 0.02, zb), 0.02, '#cfd8dc');
  }
  part(g, cyl(0.06, 0.06, gw + 0.12, 12), POST, 0, gh, zf, { rz: Math.PI / 2 });
  rod(g, v3(-gw / 2, 1.6, zb), v3(gw / 2, 1.6, zb), 0.02, '#cfd8dc');
  // The net: back, top and sides, see-through.
  const netMat = new THREE.MeshToonMaterial({ color: '#ffffff', transparent: true, opacity: 0.32, depthWrite: false, gradientMap: gradient, side: THREE.DoubleSide });
  const sheet = (geom: THREE.BufferGeometry, x: number, y: number, z: number, rx = 0, ry = 0) => {
    const m = new THREE.Mesh(geom, netMat);
    m.userData.ownMaterial = m.userData.ownGeometry = true;
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, 0);
    m.renderOrder = 2;
    g.add(m);
  };
  sheet(new THREE.PlaneGeometry(gw, 1.6), 0, 0.8, zb);
  const topLen = Math.hypot(zf - zb, gh - 1.6);
  sheet(new THREE.PlaneGeometry(gw, topLen), 0, (gh + 1.6) / 2, (zf + zb) / 2, -Math.PI / 2 + Math.atan2(gh - 1.6, zf - zb));
  for (const sx of [-1, 1]) sheet(new THREE.PlaneGeometry(zf - zb, 2.0), sx * (gw / 2), 1.0, (zf + zb) / 2, 0, Math.PI / 2);
  // Balls left in the net.
  for (const [x, z] of [[-1.8, zb + 0.3], [-1.2, zb + 0.5], [2.4, zb + 0.35]]) {
    part(g, ball(0.11), '#ffffff', x, 0.11, z);
    part(g, ball(0.06), '#212121', x + 0.05, 0.17, z + 0.06, { outline: false });
  }
}

function gateBooth(g: THREE.Group) {
  const W = 0.9;
  const H = 2.3;
  part(g, rbox(W, 0.1, W, 0.02), '#9e9e9e', 0, 0.05, 0);
  part(g, rbox(W, H - 0.1, W, 0.04), '#eceff1', 0, H / 2, 0);
  part(g, box(0.62, 0.62, 0.02), '#9ec5d6', 0, 1.45, W / 2 + 0.005, { outline: false });
  part(g, box(0.02, 0.62, 0.6), '#9ec5d6', W / 2 + 0.005, 1.45, 0, { outline: false });
  part(g, rbox(W + 0.2, 0.12, W + 0.2, 0.03), GREEN_DARK, 0, H + 0.04, 0);
  label(g, '경비실', 0.5, 0.13, 0, H - 0.22, W / 2 + 0.012, GREEN_DARK, '#ffffff');
  // The barrier: its post at the gateway side, the arm stood up for the bus.
  part(g, rbox(0.26, 0.9, 0.26, 0.03), '#fbc02d', W / 2 + 0.2, 0.45, 0.2);
  part(g, box(0.08, 3.0, 0.08), '#e53935', W / 2 + 0.2, 0.9 + 1.5, 0.2);
  for (let i = 0; i < 3; i++) part(g, box(0.085, 0.4, 0.085), '#ffffff', W / 2 + 0.2, 1.3 + i * 0.9, 0.2, { outline: false });
}
