import * as THREE from 'three';
import type { Motion } from '../activity';
import { marker, rod, shade, spot, type Builder, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, glowing, label, painted, picture, seeded, text, type Paint } from './doctor';
import { vroidFigure, type FigureOptions } from './vroidFigure';
import * as AT from './academyTutorMotion';
import { sceneClock } from '../sceneClock';

/**
 * The 입시학원 drawn as itself (2026-10-27 workplace pipeline, at the user's request): white
 * laminate, steel and navy with an orange stripe — 한빛입시학원. The 교탁: a stretch of whiteboard on
 * the front wall with today's 강 at its head, the problem written up a line at a time as it's taught
 * (in red, starred, before an exam; in blue by a junior being coached), the lectern with the 교재
 * open, the headset mic on its stand, the marker cup and the lecture timer; the 질문 책상 with its
 * pinboard partition, the monitor (the 문제지 being typed, the 모집 계획), a pupil sat beside the
 * 강사 with their 문제집 open while it's gone over — circled in red, the step written in the margin
 * — a stack of word tests marked O and X; the 인강 camera on its tripod behind the teleprompter's
 * glass, its scrolling script, softboxes either side, the return monitor and the tape mark on the
 * floor where the 강사 stands. And what the 학원 was missing (workFurniture/academyTutor.ts): the
 * lecture room's long whiteboards, its two-seat desks and the back rows of pupils taking notes (one
 * nodding off), the 자습실 carrels, the studio's 전자칠판, the D-day 성적 게시판, the 상담 table with
 * the parents, the copier printing 모의고사 and the 교재 shelf.
 *
 * The 학원, its 강사 and pupils are made up. The 강사's hands and what's on the pieces go by one clock
 * (academyTutorMotion.ts): the marker's where the line's got to, the pupil nods when they get it,
 * the sheets come out of the copier as it's watched.
 */

const ACADEMY = '한빛입시학원';
const NAVY = '#1f3a68';
const NAVY_D = '#14284a';
const ORANGE = '#f57c00';
const LAMI = '#f1efe9';
const ALU = '#cfd5da';
const BIRCH = '#e3cfa8';
const WOOD = '#a77b55';
const FELT = '#d9cdb8';
const SKIN = '#ecc6a3';
const RED_INK = '#d32f2f';
const BLUE_INK = '#1e4fb3';
const BLACK_INK = '#263238';
const KOR_FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const vp = (p: AT.P, dy = 0) => new THREE.Vector3(p[0], p[1] + dy, p[2]);
const mix = (a: number, b: number, e: number) => a + (b - a) * e;
const UP = new THREE.Vector3(0, 1, 0);

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
function spotAt(g: THREE.Object3D, s: AT.SpotAt, how: 'sit' | 'stand', motion: Motion, work: THREE.Object3D): Spot {
  const p = spot(g, how, s.x, s.y, s.z, s.yaw, how === 'sit' ? s.y : undefined);
  p.work = work;
  p.motion = motion;
  return p;
}
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
/** Which of a piece's uses is going on now (the spot a dweller's been posed at just now). */
function nowAt(spots: Record<string, Spot>, t: number): string | null {
  let best: string | null = null;
  for (const [k, s] of Object.entries(spots)) if (Math.abs(t - posedAt(s)) < 0.6 && (best === null || posedAt(s) > posedAt(spots[best]))) best = k;
  return best;
}
function nowMotion(spots: Record<string, Spot>, t: number, fallback: Motion): Motion {
  const k = nowAt(spots, t);
  return (k ? spots[k].motion : fallback) ?? fallback;
}
const tmp = new THREE.Vector3();
const phaseOf = (m: THREE.Object3D) => AT.atPhase(m.getWorldPosition(tmp));
/** A cylinder stretched between two points each frame (an arm, a leg). */
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
/** A face whose picture changes (a screen): swap `show(i)`. */
function swapScreen(g: THREE.Object3D, texes: THREE.Texture[], w: number, h: number, x: number, y: number, z: number, rx = 0, ry = 0): { mesh: THREE.Mesh; show: (i: number) => void } {
  const mat = new THREE.MeshBasicMaterial({ map: texes[0] });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.userData.ownGeometry = mesh.userData.ownMaterial = true;
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, 0);
  g.add(mesh);
  let cur = 0;
  return {
    mesh,
    show: (i) => {
      if (i === cur) return;
      cur = i;
      mat.map = texes[i];
      mat.needsUpdate = true;
    },
  };
}
/** A sheet lying flat (its top away from +z, or turned `ry`), painted. */
function flat(g: THREE.Object3D, tex: THREE.Texture, w: number, d: number, x: number, y: number, z: number, ry = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.rotation.order = 'YXZ';
  m.rotation.set(-Math.PI / 2, ry, 0);
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
/** A painted decal with see-through parts (marker on a board). */
function decal(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
/**
 * Put back at rest whenever the piece isn't in use: an invisible speck in `idle` (shown only then)
 * calls `reset` as it's drawn, so nothing's left half-done when the work stops.
 */
function whenIdle(out: { idle?: THREE.Object3D }, g: THREE.Object3D, reset: () => void): void {
  if (!out.idle) out.idle = group(g);
  out.idle.add(speck(reset));
  reset();
}
/** Something done every frame it's drawn, in use or not (the pupils' pens moving), by the clock. */
function ambient(g: THREE.Object3D, tick: (t: number) => void): void {
  g.add(speck(() => tick(sceneClock.now)));
}
function speck(fn: () => void): THREE.Mesh {
  const s = new THREE.Mesh(box(0.001, 0.001, 0.001), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  s.userData.ownMaterial = true;
  s.frustumCulled = false;
  s.onBeforeRender = fn;
  return s;
}
const lit = new Map<string, THREE.MeshBasicMaterial>();
function litMat(color: string): THREE.MeshBasicMaterial {
  let m = lit.get(color);
  if (!m) lit.set(color, (m = new THREE.MeshBasicMaterial({ color })));
  return m;
}
const GLASS = new THREE.MeshToonMaterial({ color: '#cfe8f3', transparent: true, opacity: 0.32, depthWrite: false });
const DIFFUSER_OFF = new THREE.MeshToonMaterial({ color: '#e6e6e0' });
const RING = new THREE.TorusGeometry(0.024, 0.004, 6, 18);
const RED_RING = new THREE.TorusGeometry(0.035, 0.0035, 6, 24);

/** A bubble of words over someone, turned to the camera. */
const paintBubble = (s: string): Paint => (c) => {
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
  c.font = `bold 40px ${KOR_FONT}`;
  c.fillStyle = '#263238';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(s, 256, 66, 470);
};
function bubbles(parent: THREE.Object3D, says: string[], x: number, y: number, z: number, scale = 1): (i: number) => void {
  const sprites = says.map((s, i) => {
    const mat = new THREE.SpriteMaterial({ map: painted(`atBubble${i}|${s}`, 512, 160, paintBubble(s)), transparent: true, depthWrite: false });
    const sp = new THREE.Sprite(mat);
    sp.userData.ownMaterial = true;
    sp.scale.set(0.62 * scale, 0.194 * scale, 1);
    sp.position.set(x, y, z);
    sp.renderOrder = 5;
    sp.visible = false;
    parent.add(sp);
    return sp;
  });
  return (i) => sprites.forEach((s, j) => (s.visible = j === i - 1));
}

// ---------------------------------------------------------------------------------------------
// People drawn in: the pupils (교복, a hoodie, the 롱패딩), the parents, a junior 강사.

interface Look {
  top: string;
  bottom: string;
  hair: string;
  hairdo: 'perm' | 'short' | 'bob' | 'long';
  skin?: string;
  shoes?: string;
  /** A cardigan or a jacket open over the top. */
  cardigan?: string;
  /** A school knit vest, and a tie. */
  vest?: string;
  tie?: string;
  /** A school skirt (the thighs in it), and the legs below in tights or socks. */
  skirt?: string;
  legs?: string;
  hood?: boolean;
  /** A long padded coat (롱패딩), quilted, to the knees. */
  padding?: boolean;
  glasses?: boolean;
  /** A lanyard with a name card. */
  tag?: string;
}
const LOOKS = {
  boy: { top: '#f5f5f5', bottom: '#37474f', hair: '#1a1a1a', hairdo: 'short', vest: '#1f3a68', tie: '#8e1b1b', shoes: '#eceff1' } as Look,
  girl: { top: '#f5f5f5', bottom: '#3c4a6e', skirt: '#3c4a6e', legs: '#e9cdb4', hair: '#2b1b10', hairdo: 'long', vest: '#1f3a68', tie: '#8e1b1b', shoes: '#eceff1', skin: '#f1cfb0' } as Look,
  hoodie: { top: '#9e9e9e', bottom: '#263238', hair: '#2b1b10', hairdo: 'short', hood: true, glasses: true, shoes: '#fafafa' } as Look,
  padding: { top: '#212121', bottom: '#263238', hair: '#3b2a20', hairdo: 'bob', padding: true, shoes: '#fafafa', skin: '#f1cfb0' } as Look,
  girlHoodie: { top: '#ce93d8', bottom: '#455a64', hair: '#4e342e', hairdo: 'bob', hood: true, shoes: '#fafafa', skin: '#f1cfb0' } as Look,
  boyGlasses: { top: '#f5f5f5', bottom: '#37474f', hair: '#222222', hairdo: 'short', vest: '#4e5b6e', tie: '#1f3a68', glasses: true, shoes: '#eceff1' } as Look,
  mom: { top: '#efe6dc', bottom: '#5d4037', hair: '#4e342e', hairdo: 'perm', cardigan: '#8d6e63', shoes: '#6d4c41' } as Look,
  dad: { top: '#e3f2fd', bottom: '#37474f', hair: '#222222', hairdo: 'short', cardigan: '#455a64', glasses: true, shoes: '#3e2723' } as Look,
  junior: { top: '#e3f2fd', bottom: '#263238', hair: '#1a1a1a', hairdo: 'short', tag: '강사', shoes: '#212121' } as Look,
};
const PUPILS: Look[] = [LOOKS.boy, LOOKS.girl, LOOKS.hoodie, LOOKS.padding, LOOKS.girlHoodie, LOOKS.boyGlasses];

interface Fig {
  root: THREE.Group;
  upper: THREE.Group;
  head: THREE.Group;
  pose(sit: number, seat?: number, lean?: number): void;
  armL(to: THREE.Vector3 | null): void;
  armR(to: THREE.Vector3 | null): void;
  mouth(open: number): void;
  eyes(shut: boolean): void;
}
/** Someone drawn in, built stood with the feet at the origin facing +z (turn and move `root`); arms reach points in the root's parent's frame. */
function figure(parent: THREE.Object3D, look: Look): Fig {
  const root = group(parent);
  const skin = look.skin ?? SKIN;
  const shoes = look.shoes ?? '#8d6e63';
  const sleeve = look.cardigan ?? look.top;
  const thighCol = look.skirt ?? (look.padding ? look.top : look.bottom);
  const shinCol = look.legs ?? look.bottom;
  const legs = [1, -1].map((sx) => ({ sx, thigh: limb(root, look.skirt || look.padding ? 0.075 : 0.062, thighCol), shin: limb(root, 0.05, shinCol), shoe: part(root, rbox(0.095, 0.07, 0.21, 0.03), shoes, 0, 0, 0) }));
  const pelvis = part(root, rbox(0.31, 0.16, 0.24, 0.06), thighCol, 0, 0.85, 0);
  // A skirt's flare (only stood: sat, the thighs in the skirt's colour read as the skirt on the lap).
  const flare = look.skirt ? part(root, cyl(0.17, 0.215, 0.2, 14), look.skirt, 0, 0.74, 0) : null;
  const upper = group(root, 0, 0.84, 0);
  part(upper, rbox(0.34, 0.46, 0.21, 0.08), look.top, 0, 0.27, 0);
  if (look.padding) for (let i = 0; i < 5; i++) part(upper, rbox(0.355, 0.05, 0.225, 0.025), shade(look.top, 0.8), 0, 0.06 + i * 0.1, 0, { outline: false });
  if (look.vest) {
    for (const sx of [-1, 1]) part(upper, rbox(0.12, 0.38, 0.226, 0.04), look.vest, sx * 0.11, 0.22, 0);
    part(upper, rbox(0.34, 0.2, 0.226, 0.05), look.vest, 0, 0.1, -0.002);
  }
  if (look.tie) part(upper, box(0.035, 0.2, 0.012), look.tie, 0, 0.33, 0.11, { outline: false });
  if (look.cardigan) {
    for (const sx of [-1, 1]) part(upper, rbox(0.13, 0.44, 0.226, 0.05), look.cardigan, sx * 0.11, 0.26, 0);
    for (let i = 0; i < 4; i++) part(upper, ball(0.011), '#f5f0e6', 0.05, 0.4 - i * 0.09, 0.114, { outline: false });
  }
  if (look.hood) {
    part(upper, rbox(0.26, 0.1, 0.12, 0.04), look.top, 0, 0.5, -0.1);
    for (const sx of [-1, 1]) part(upper, box(0.008, 0.12, 0.008), '#fafafa', sx * 0.04, 0.42, 0.112, { outline: false });
    part(upper, rbox(0.2, 0.1, 0.03, 0.02), shade(look.top, 0.85), 0, 0.14, 0.105, { outline: false });
  }
  if (look.tag) {
    part(upper, box(0.006, 0.18, 0.006), '#1e88e5', 0.05, 0.42, 0.11, { rz: 0.3, outline: false });
    part(upper, box(0.006, 0.18, 0.006), '#1e88e5', -0.05, 0.42, 0.11, { rz: -0.3, outline: false });
    label(upper, look.tag, 0.07, 0.045, 0, 0.3, 0.116, '#ffffff', NAVY);
  }
  part(upper, cyl(0.045, 0.05, 0.08, 10), skin, 0, 0.53, 0, { outline: false });
  const head = group(upper, 0, 0.67, 0);
  part(head, ball(0.112), skin, 0, 0, 0);
  const eyesM = [1, -1].map((sx) => part(head, box(0.022, 0.016, 0.006), '#2b2b30', sx * 0.04, 0.0, 0.106, { outline: false }));
  for (const sx of [-1, 1]) part(head, ball(0.018), '#f2a7a0', sx * 0.065, -0.03, 0.088, { outline: false }).scale.set(1, 0.6, 0.4);
  const mouthM = part(head, box(0.034, 0.01, 0.006), '#8d4f47', 0, -0.05, 0.104, { outline: false });
  if (look.glasses) {
    for (const sx of [-1, 1]) part(head, RING, '#37474f', sx * 0.042, 0.0, 0.112, { outline: false });
    part(head, box(0.03, 0.004, 0.004), '#37474f', 0, 0.006, 0.114, { outline: false });
  }
  switch (look.hairdo) {
    case 'perm':
      part(head, ball(0.118), look.hair, 0, 0.035, -0.025);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        part(head, ball(0.045), look.hair, Math.cos(a) * 0.08, 0.08 + 0.02 * Math.sin(a * 2), -0.02 + Math.sin(a) * 0.07, { outline: false });
      }
      break;
    case 'bob':
      part(head, ball(0.121), look.hair, 0, 0.02, -0.025);
      part(head, rbox(0.25, 0.14, 0.18, 0.06), look.hair, 0, -0.04, -0.03);
      part(head, rbox(0.21, 0.05, 0.05, 0.02), look.hair, 0, 0.08, 0.08, { rx: -0.2 });
      break;
    case 'long':
      part(head, ball(0.121), look.hair, 0, 0.025, -0.025);
      part(head, rbox(0.24, 0.32, 0.12, 0.06), look.hair, 0, -0.12, -0.07);
      part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0.02, 0.08, 0.08, { rx: -0.2, rz: 0.15 });
      break;
    default:
      part(head, ball(0.118), look.hair, 0, 0.03, -0.03);
      part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0, 0.075, 0.075, { rx: -0.25 });
  }
  let sitNow = 0;
  const m4 = new THREE.Matrix4();
  const arm = (sx: number) => {
    const shoulder = v3(sx * 0.2, 0.47, 0);
    const upperArm = limb(upper, 0.042, sleeve);
    const fore = limb(upper, 0.035, sleeve);
    const hand = part(upper, ball(0.036), skin, 0, 0, 0, { outline: false });
    const loc = new THREE.Vector3();
    const elbow = new THREE.Vector3();
    const d = new THREE.Vector3();
    const bend = new THREE.Vector3();
    return (to: THREE.Vector3 | null) => {
      if (to) {
        root.updateMatrix();
        upper.updateMatrix();
        m4.multiplyMatrices(root.matrix, upper.matrix).invert();
        loc.copy(to).applyMatrix4(m4);
      } else loc.set(sx * mix(0.23, 0.11, sitNow), mix(-0.02, 0.09, sitNow), mix(0.05, 0.27, sitNow));
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
      upperArm(shoulder, elbow);
      fore(elbow, loc);
      hand.position.copy(loc);
    };
  };
  const armL = arm(1);
  const armR = arm(-1);
  const hip = new THREE.Vector3();
  const knee = new THREE.Vector3();
  const ankle = new THREE.Vector3();
  const pose = (sit: number, seat = 0.46, lean = 0) => {
    sitNow = sit;
    const hipY = mix(0.84, seat + 0.07, sit);
    const hz = mix(0, -0.03, sit);
    pelvis.position.set(0, hipY + 0.01, hz);
    upper.position.set(0, hipY, hz);
    upper.rotation.x = lean;
    if (flare) flare.visible = sit < 0.5;
    for (const L of legs) {
      hip.set(L.sx * 0.09, hipY, hz);
      knee.set(L.sx * 0.09, 0.47, 0.03).lerp(v3(L.sx * 0.1, seat + 0.06, 0.36), sit);
      ankle.set(L.sx * 0.09, 0.08, 0.01).lerp(v3(L.sx * 0.1, Math.max(0.07, seat + 0.06 - 0.4), 0.4), sit);
      L.thigh(hip, knee);
      L.shin(knee, ankle);
      L.shoe.position.set(ankle.x, ankle.y - 0.035, ankle.z + 0.05);
    }
  };
  pose(0);
  armL(null);
  armR(null);
  return {
    root,
    upper,
    head,
    pose,
    armL,
    armR,
    mouth: (open) => mouthM.scale.set(1 - 0.3 * open, 1 + 3.2 * open, 1),
    eyes: (shut) => eyesM.forEach((e) => e.scale.set(1, shut ? 0.22 : 1, 1)),
  };
}
function seated(parent: THREE.Object3D, look: Look, x: number, z: number, ry: number, seat: number, lean = 0): Fig {
  const f = figure(parent, look);
  f.root.position.set(x, 0, z);
  f.root.rotation.y = ry;
  f.pose(1, seat, lean);
  return f;
}
function standing(parent: THREE.Object3D, look: Look, x: number, z: number, ry: number): Fig {
  const f = figure(parent, look);
  f.root.position.set(x, 0, z);
  f.root.rotation.y = ry;
  return f;
}
const GIRLS = new Set<Look>([LOOKS.girl, LOOKS.padding, LOOKS.girlHoodie]);
/**
 * Someone drawn played by a VRoid body. Its mouth, its eyes shut and a lean over the desk aren't a
 * body's to do (it sits upright), so whoever's asleep on the desk stays drawn.
 */
function bodied(f: Fig, opts: FigureOptions): Fig {
  const b = vroidFigure({ root: f.root, head: f.head, armL: f.armL, armR: f.armR }, opts);
  return { ...f, armL: b.armL, armR: b.armR };
}
/** A pupil's body, by their look. */
const pupilBody = (f: Fig, look: Look, seat: number) => bodied(f, { stage: 'teen', gender: GIRLS.has(look) ? 'female' : 'male', seat });

/** Talks now and then (`k` how much). */
const chatter = (f: Fig, t: number, k: number, seed: number) => f.mouth(k * 0.5 * Math.max(0, Math.sin(t * 6.5 + seed)));
const blinkOf = (t: number, seed: number) => Math.sin(t * 1.3 + seed * 2.1) > 0.97;

// ---------------------------------------------------------------------------------------------
// Furniture bits.

/** A classroom chair: a moulded seat and back on a steel frame, the seat `h` high (built facing +z). */
function classChair(g: THREE.Object3D, x: number, z: number, ry: number, h = 0.45, color = '#546e7a'): void {
  const c = group(g, x, 0, z, ry);
  const r = 0.011;
  for (const sx of [-1, 1]) {
    rod(c, v3(sx * 0.17, 0, 0.16), v3(sx * 0.17, h - 0.02, 0.15), r, STEEL);
    rod(c, v3(sx * 0.17, 0, -0.16), v3(sx * 0.17, h + 0.36, -0.2), r, STEEL);
  }
  part(c, rbox(0.4, 0.035, 0.38, 0.015), color, 0, h, 0);
  part(c, rbox(0.4, 0.2, 0.03, 0.015), color, 0, h + 0.3, -0.19, { rx: -0.1 });
}
/** The 강사's swivel chair (built facing +z). */
function swivelChair(g: THREE.Object3D, x: number, z: number, ry: number, color = NAVY, seat = 0.48): void {
  const c = group(g, x, 0, z, ry);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    rod(c, v3(0, 0.08, 0), v3(Math.sin(a) * 0.24, 0.045, Math.cos(a) * 0.24), 0.015, BLACK);
    part(c, ball(0.024), BLACK, Math.sin(a) * 0.24, 0.024, Math.cos(a) * 0.24, { outline: false });
  }
  part(c, cyl(0.024, 0.024, seat - 0.12, 10), CHROME, 0, (seat - 0.12) / 2 + 0.08, 0, { outline: false });
  part(c, rbox(0.46, 0.08, 0.44, 0.035), color, 0, seat - 0.03, 0);
  part(c, rbox(0.42, 0.5, 0.06, 0.04), color, 0, seat + 0.34, -0.21, { rx: -0.08 });
  part(c, rbox(0.04, 0.28, 0.04, 0.01), BLACK, 0, seat + 0.1, -0.22, { outline: false });
  for (const sx of [-1, 1]) part(c, rbox(0.05, 0.03, 0.22, 0.012), BLACK, sx * 0.25, seat + 0.2, -0.01);
}
/** A round stool for a pupil beside a desk. */
function stool(g: THREE.Object3D, x: number, z: number, seat: number, color = ORANGE): void {
  part(g, cyl(0.17, 0.19, 0.03, 16), '#37474f', x, 0.03, z, { outline: false });
  part(g, cyl(0.022, 0.022, seat - 0.06, 8), CHROME, x, (seat - 0.06) / 2 + 0.03, z, { outline: false });
  part(g, cyl(0.17, 0.17, 0.06, 18), color, x, seat - 0.03, z);
}
/** A book lying flat or stood on a shelf. */
function book(g: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, color: string, ry = 0, rz = 0): THREE.Mesh {
  return part(g, box(w, h, d), color, x, y + h / 2, z, { ry, rz, outline: false });
}
/** An open 문제집 lying flat for someone at its +z (turned `ry`): the covers, the two pages. */
function openBook(g: THREE.Object3D, tex: THREE.Texture, x: number, y: number, z: number, cover: string, ry = 0, w = 0.3, d = 0.21): void {
  const b = group(g, x, y, z, ry);
  part(b, box(w + 0.012, 0.006, d + 0.01), cover, 0, 0.003, 0, { outline: false });
  part(b, box(w, 0.012, d), '#fbf8f0', 0, 0.009, 0, { outline: false });
  flat(b, tex, w * 0.98, d * 0.96, 0, 0.0156, 0);
}
/** A pencil case, a highlighter, a mechanical pencil — a pupil's things on the desk. */
function pupilThings(g: THREE.Object3D, x: number, y: number, z: number, rand: () => number): void {
  const pc = ['#ce93d8', '#80cbc4', '#ffcc80', '#90caf9', '#f48fb1'][Math.floor(rand() * 5)];
  part(g, rbox(0.19, 0.04, 0.07, 0.018), pc, x - 0.22, y + 0.02, z - 0.08, { ry: 0.12 });
  part(g, cyl(0.007, 0.007, 0.12, 6), ['#fff176', '#f48fb1', '#80deea'][Math.floor(rand() * 3)], x + 0.2, y + 0.008, z + 0.02, { rz: Math.PI / 2, ry: -0.5, outline: false });
  part(g, cyl(0.004, 0.004, 0.14, 6), '#37474f', x + 0.04, y + 0.016, z + 0.06, { rz: Math.PI / 2, ry: 0.3, outline: false });
  part(g, rbox(0.03, 0.012, 0.018, 0.004), '#f5f5f5', x + 0.18, y + 0.006, z - 0.07, { outline: false });
  if (rand() < 0.5) {
    // A bottle of water.
    part(g, cyl(0.03, 0.03, 0.2, 12), '#b3e5fc', x - 0.32, y + 0.1, z - 0.1, { material: GLASS });
    part(g, cyl(0.018, 0.018, 0.025, 10), '#1e88e5', x - 0.32, y + 0.212, z - 0.1, { outline: false });
  }
}

// ---------------------------------------------------------------------------------------------
// What's painted.

/** A line of the problem in marker, as wide as the board's line. */
const paintInk = (s: string, color: string): Paint => (c) => {
  c.clearRect(0, 0, 640, 64);
  c.font = `bold 38px ${KOR_FONT}`;
  c.fillStyle = color;
  c.textAlign = 'left';
  c.textBaseline = 'middle';
  c.fillText(s, 6, 34, 628);
};
const paintStar: Paint = (c) => {
  c.clearRect(0, 0, 64, 64);
  c.font = `bold 54px ${KOR_FONT}`;
  c.fillStyle = RED_INK;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('★', 32, 34);
};
const LECT_LINES = ['f(x) = x³ − 3x² + 2', "f′(x) = 3x² − 6x = 0", '∴ x = 0 또는 x = 2', '극대 f(0)=2, 극소 f(2)=−2'];
const CRAM_LINES = ['★ 출제 1순위: 접선의 방정식', "y − f(a) = f′(a)(x − a)", "기울기 = f′(a) ← 꼭 외우기!", '작년 9평 21번 그대로 나옴!!'];
const COACH_LINES = ['lim(x→2) (x² − 4)/(x − 2)', '= lim(x→2) (x + 2)', '= 4', '→ 0/0 꼴은 인수분해!'];

function boardHeader(s: string, sub: string): Paint {
  return (c) => {
    c.clearRect(0, 0, 640, 80);
    text(c, s, 8, 30, 34, NAVY);
    text(c, sub, 8, 64, 20, '#607d8b', 'left', false);
    c.fillStyle = ORANGE;
    c.fillRect(8, 76, 300, 3);
  };
}
/** The cubic and its tangent, drawn in marker. */
function cubic(c: CanvasRenderingContext2D, ox: number, oy: number, s: number, color: string) {
  c.strokeStyle = '#90a4ae';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(ox - 2.2 * s, oy);
  c.lineTo(ox + 3.4 * s, oy);
  c.moveTo(ox, oy + 2.6 * s);
  c.lineTo(ox, oy - 2.8 * s);
  c.stroke();
  c.strokeStyle = color;
  c.lineWidth = 5;
  c.beginPath();
  for (let i = 0; i <= 60; i++) {
    const x = -1.1 + (i / 60) * 4.1;
    const y = x * x * x - 3 * x * x + 2;
    if (i === 0) c.moveTo(ox + x * s, oy - y * s * 0.55);
    else c.lineTo(ox + x * s, oy - y * s * 0.55);
  }
  c.stroke();
  c.strokeStyle = RED_INK;
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(ox - 1.6 * s, oy - 2 * s * 0.55);
  c.lineTo(ox + 1.6 * s, oy - 2 * s * 0.55);
  c.stroke();
  c.fillStyle = RED_INK;
  for (const [x, y] of [[0, 2], [2, -2]]) {
    c.beginPath();
    c.arc(ox + x * s, oy - y * s * 0.55, 7, 0, Math.PI * 2);
    c.fill();
  }
}
const paintBoardLeft: Paint = (c) => {
  c.fillStyle = '#fdfdfb';
  c.fillRect(0, 0, 1024, 640);
  text(c, '오늘의 진도  수학Ⅱ · 3강', 30, 50, 44, NAVY);
  c.fillStyle = ORANGE;
  c.fillRect(30, 82, 420, 5);
  text(c, '미분의 활용 — 극대·극소와 그래프', 30, 122, 32, BLACK_INK, 'left', false);
  cubic(c, 250, 380, 80, BLUE_INK);
  text(c, 'y = x³ − 3x² + 2', 470, 210, 34, BLUE_INK);
  c.strokeStyle = RED_INK;
  c.lineWidth = 4;
  c.strokeRect(470, 270, 500, 150);
  text(c, "f′(a) = 0 이고", 495, 310, 32, RED_INK);
  text(c, '부호가 + → − 이면 극대!', 495, 365, 32, RED_INK);
  text(c, '① 미분  ② f′=0  ③ 증감표  ④ 그래프', 470, 480, 28, BLACK_INK);
  text(c, '※ 증감표는 꼭 그리기 (서술형 감점 주의)', 470, 540, 24, '#607d8b', 'left', false);
};
const paintBoardRight: Paint = (c) => {
  c.fillStyle = '#fdfdfb';
  c.fillRect(0, 0, 1024, 640);
  text(c, '★ 오늘의 숙제', 30, 50, 42, RED_INK);
  const hw = ['수능특강 p.84 ~ 91 (짝수 번)', '자체 교재 3강 확인 문제 1 ~ 20', '오답노트: 10월 모의고사 21, 29, 30번', '단어 TEST 범위: Day 15 ~ 16'];
  hw.forEach((s, i) => text(c, `${i + 1}. ${s}`, 40, 112 + i * 52, 30, BLACK_INK, 'left', false));
  c.strokeStyle = BLUE_INK;
  c.lineWidth = 4;
  c.strokeRect(30, 340, 450, 190);
  text(c, '공지', 50, 372, 30, BLUE_INK);
  text(c, '· 토요일 오전 10시 주말 특강', 50, 418, 26, BLACK_INK, 'left', false);
  text(c, '· 11월 첫째 주 실전 모의고사', 50, 458, 26, BLACK_INK, 'left', false);
  text(c, '· 질문은 강사실 질문 책상으로!', 50, 498, 26, BLACK_INK, 'left', false);
  // The D-day in the corner, boxed in red.
  c.fillStyle = '#fff3e0';
  c.fillRect(560, 330, 420, 220);
  c.strokeStyle = RED_INK;
  c.lineWidth = 6;
  c.strokeRect(560, 330, 420, 220);
  text(c, '2027 수능', 770, 380, 34, BLACK_INK, 'center');
  text(c, 'D-23', 770, 470, 96, RED_INK, 'center');
  text(c, '1등급 컷 84 → 목표 92점!', 530, 600, 26, '#607d8b', 'left', false);
};
const paintBanner = (s: string): Paint => (c) => {
  c.fillStyle = NAVY;
  c.fillRect(0, 0, 512, 64);
  c.fillStyle = ORANGE;
  c.fillRect(0, 56, 512, 8);
  c.font = `bold 32px ${KOR_FONT}`;
  c.fillStyle = '#ffffff';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(s, 256, 30, 490);
};
const paintLogo: Paint = (c) => {
  c.fillStyle = NAVY;
  c.fillRect(0, 0, 256, 128);
  c.fillStyle = ORANGE;
  c.beginPath();
  c.arc(60, 64, 34, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#ffffff';
  c.font = `bold 40px ${KOR_FONT}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('빛', 60, 66);
  c.font = `bold 30px ${KOR_FONT}`;
  c.textAlign = 'left';
  c.fillText('한빛', 108, 48);
  c.font = `20px ${KOR_FONT}`;
  c.fillText('입시학원', 108, 86);
};
const paintTextbook: Paint = (c) => {
  c.fillStyle = '#fffdf7';
  c.fillRect(0, 0, 256, 176);
  c.fillStyle = '#e0e0e0';
  c.fillRect(127, 0, 2, 176);
  text(c, '3강 미분의 활용', 62, 16, 14, NAVY, 'center');
  c.fillStyle = '#cfd8dc';
  for (let i = 0; i < 8; i++) c.fillRect(12, 34 + i * 15, i % 3 === 2 ? 70 : 104, 4);
  text(c, '예제 3', 192, 16, 14, ORANGE, 'center');
  c.strokeStyle = BLUE_INK;
  c.lineWidth = 2;
  c.beginPath();
  for (let i = 0; i <= 30; i++) {
    const x = -1.1 + (i / 30) * 4.1;
    const y = x * x * x - 3 * x * x + 2;
    if (i === 0) c.moveTo(150 + x * 20, 110 - y * 10);
    else c.lineTo(150 + x * 20, 110 - y * 10);
  }
  c.stroke();
  c.fillStyle = '#fff59d';
  c.fillRect(140, 146, 100, 10);
};
/** A pupil's 문제집 open: two problems, their working in pencil. */
function paintWorkbook(seed: number): Paint {
  return (c) => {
    const r = seeded(seed * 97 + 13);
    c.fillStyle = '#fffdf8';
    c.fillRect(0, 0, 256, 180);
    c.fillStyle = '#d7d7d7';
    c.fillRect(127, 0, 2, 180);
    for (const ox of [10, 138]) {
      text(c, `${Math.floor(r() * 20) + 10}.`, ox, 14, 13, NAVY);
      c.fillStyle = '#b0bec5';
      for (let i = 0; i < 3; i++) c.fillRect(ox + 22, 10 + i * 10, 80 - i * 12, 3);
      c.strokeStyle = '#78909c';
      c.lineWidth = 1.5;
      c.beginPath();
      for (let i = 0; i < 6; i++) {
        const y = 60 + i * 16;
        c.moveTo(ox + 4, y);
        for (let k = 0; k < 6; k++) c.lineTo(ox + 4 + k * 18, y + (r() - 0.5) * 6);
      }
      c.stroke();
      c.fillStyle = '#fff59d';
      if (r() < 0.6) c.fillRect(ox + 20, 40, 70, 8);
    }
  };
}
/** The pupil's problem, gone over at the 질문 책상: a graph question, their working, a blank. */
const paintQuestion: Paint = (c) => {
  c.fillStyle = '#fffdf8';
  c.fillRect(0, 0, 320, 220);
  c.fillStyle = '#d7d7d7';
  c.fillRect(159, 0, 2, 220);
  text(c, '21. 함수 f(x)=x³−3x²+k의', 8, 16, 13, BLACK_INK);
  text(c, '극솟값이 −2일 때, k의 값은?', 8, 34, 13, BLACK_INK);
  c.strokeStyle = '#78909c';
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(14, 70);
  c.lineTo(120, 70);
  c.moveTo(14, 96);
  c.lineTo(90, 96);
  c.moveTo(14, 122);
  c.lineTo(110, 122);
  c.stroke();
  text(c, "f′(x) = 3x² − 6x", 14, 64, 13, '#455a64', 'left', false);
  text(c, 'x = 0, 2 ?', 14, 90, 13, '#455a64', 'left', false);
  text(c, '??', 14, 116, 14, '#455a64', 'left', false);
  text(c, '① 0  ② 1  ③ 2  ④ 3  ⑤ 4', 8, 200, 12, BLACK_INK, 'left', false);
  text(c, '22.', 168, 16, 13, BLACK_INK);
  c.fillStyle = '#b0bec5';
  for (let i = 0; i < 6; i++) c.fillRect(190, 10 + i * 14, 110 - (i % 2) * 30, 3);
};
const paintStep: Paint = (c) => {
  c.clearRect(0, 0, 256, 96);
  c.font = `bold 22px ${KOR_FONT}`;
  c.fillStyle = RED_INK;
  c.textBaseline = 'middle';
  c.fillText('f(2) = 8−12+k = −2', 4, 22);
  c.fillText('∴ k = 2  (③)', 4, 58);
};
const paintQuiz: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 160, 220);
  text(c, '영단어 TEST  Day 15', 8, 14, 13, NAVY);
  text(c, '이름: ________', 96, 32, 10, '#607d8b', 'left', false);
  const w = ['abandon', 'scarce', 'derive', 'hinder', 'vivid', 'imply', 'sustain', 'yield'];
  w.forEach((s, i) => {
    text(c, `${i + 1}. ${s}`, 10, 54 + i * 20, 12, BLACK_INK, 'left', false);
    c.fillStyle = '#b0bec5';
    c.fillRect(84, 58 + i * 20, 52, 2);
  });
};
const paintOX = (ok: boolean): Paint => (c) => {
  c.clearRect(0, 0, 64, 64);
  c.strokeStyle = RED_INK;
  c.lineWidth = 8;
  c.beginPath();
  if (ok) c.arc(32, 32, 20, 0, Math.PI * 2);
  else {
    c.moveTo(14, 14);
    c.lineTo(50, 50);
    c.moveTo(50, 14);
    c.lineTo(14, 50);
  }
  c.stroke();
};
const paintScore: Paint = (c) => {
  c.clearRect(0, 0, 128, 64);
  c.font = `bold 44px ${KOR_FONT}`;
  c.fillStyle = RED_INK;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('90', 64, 34);
};
const paintDark: Paint = (c) => {
  c.fillStyle = '#1b222c';
  c.fillRect(0, 0, 320, 200);
};
const paintEditor: Paint = (c) => {
  c.fillStyle = '#eceff1';
  c.fillRect(0, 0, 320, 200);
  c.fillStyle = '#1565c0';
  c.fillRect(0, 0, 320, 20);
  text(c, '한빛 3강 확인문제.hwp', 8, 11, 11, '#ffffff', 'left', false);
  c.fillStyle = '#ffffff';
  c.fillRect(40, 26, 240, 170);
  text(c, '3강 확인 문제', 160, 40, 12, NAVY, 'center');
  for (let i = 0; i < 5; i++) {
    text(c, `${i + 1}.`, 50, 62 + i * 26, 10, BLACK_INK);
    c.fillStyle = '#b0bec5';
    c.fillRect(66, 59 + i * 26, 150 - (i % 3) * 30, 3);
    c.fillStyle = '#90caf9';
    c.fillRect(66, 67 + i * 26, 80, 3);
  }
  c.fillStyle = '#ff7043';
  c.fillRect(140, 162, 2, 12);
};
const paintPlan: Paint = (c) => {
  c.fillStyle = '#f1f8e9';
  c.fillRect(0, 0, 320, 200);
  c.fillStyle = '#2e7d32';
  c.fillRect(0, 0, 320, 20);
  text(c, '겨울방학 특강 모집 계획.xlsx', 8, 11, 11, '#ffffff', 'left', false);
  c.strokeStyle = '#a5d6a7';
  c.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    c.beginPath();
    c.moveTo(6, 30 + i * 18);
    c.lineTo(190, 30 + i * 18);
    c.stroke();
  }
  ['반', '정원', '모집', '예비 고3 수학', '고1 수학', '의대반'].forEach((s, i) => text(c, s, 10 + (i % 3) * 60, 40 + Math.floor(i / 3) * 18, 10, BLACK_INK, 'left', false));
  c.fillStyle = NAVY;
  c.fillRect(205, 30, 105, 150);
  text(c, '겨울방학', 257, 52, 14, '#ffffff', 'center');
  text(c, '수학 특강', 257, 74, 16, ORANGE, 'center');
  text(c, '12/22 개강', 257, 150, 11, '#ffffff', 'center', false);
};
const paintPinboard: Paint = (c) => {
  c.fillStyle = FELT;
  c.fillRect(0, 0, 512, 192);
  const note = (x: number, y: number, w: number, h: number, bg: string, lines: string[], rot: number) => {
    c.save();
    c.translate(x, y);
    c.rotate(rot);
    c.fillStyle = bg;
    c.fillRect(0, 0, w, h);
    lines.forEach((s, i) => text(c, s, 8, 18 + i * 22, i === 0 ? 17 : 14, BLACK_INK, 'left', i === 0));
    c.fillStyle = RED_INK;
    c.beginPath();
    c.arc(w / 2, 6, 5, 0, Math.PI * 2);
    c.fill();
    c.restore();
  };
  note(16, 16, 150, 82, '#fff59d', ['질문 환영 ✋', '언제든 오세요!'], -0.04);
  note(186, 12, 170, 110, '#ffffff', ['질의응답 시간', '평일 18:00 ~ 22:00', '토 10:00 ~ 13:00'], 0.02);
  note(372, 20, 124, 90, '#b3e5fc', ['오늘 상담', '17시 김○○ 학부모'], 0.05);
  note(36, 112, 130, 66, '#f8bbd0', ['단어 TEST', '재시험 3명'], 0.03);
};
const paintTimer = (on: boolean): Paint => (c) => {
  c.fillStyle = '#111';
  c.fillRect(0, 0, 128, 48);
  c.font = `bold 34px monospace`;
  c.fillStyle = on ? '#ff5252' : '#4a1515';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('38:12', 64, 26);
};
const paintSlide: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 192, 128);
  c.fillStyle = NAVY;
  c.fillRect(0, 0, 192, 18);
  text(c, '3강 미분의 활용', 6, 10, 11, '#ffffff', 'left', false);
  c.strokeStyle = BLUE_INK;
  c.lineWidth = 2;
  c.beginPath();
  for (let i = 0; i <= 30; i++) {
    const x = -1.1 + (i / 30) * 4.1;
    const y = x * x * x - 3 * x * x + 2;
    if (i === 0) c.moveTo(70 + x * 22, 80 - y * 11);
    else c.lineTo(70 + x * 22, 80 - y * 11);
  }
  c.stroke();
  text(c, '극대·극소', 140, 60, 12, RED_INK, 'center');
};
/** The teleprompter's script, a tall strip scrolled up line by line (seen through the glass from in front). */
const paintScript: Paint = (c) => {
  c.fillStyle = '#000000';
  c.fillRect(0, 0, 256, 512);
  const lines = ['안녕하세요, 한빛 수학입니다.', '오늘은 미분 마무리!', '세 가지만 기억하세요.', '첫째, 미분한다.', '둘째, f′(x)=0.', '셋째, 증감표!', '칠판 보시면…', '이건 꼭 나옵니다!', '다음 시간에 만나요~', '안녕하세요, 한빛 수학입니다.', '오늘은 미분 마무리!', '세 가지만 기억하세요.'];
  lines.forEach((s, i) => text(c, s, 128, 24 + i * 42, 22, i % 4 === 1 ? '#ffeb3b' : '#ffffff', 'center'));
};
const paintReturn: Paint = (c) => {
  c.fillStyle = '#263238';
  c.fillRect(0, 0, 256, 160);
  c.fillStyle = '#3f5161';
  c.fillRect(8, 8, 240, 144);
  c.fillStyle = '#16233a';
  c.fillRect(150, 20, 90, 70);
  c.fillStyle = '#80deea';
  c.fillRect(160, 36, 60, 3);
  c.fillRect(160, 50, 48, 3);
  c.fillStyle = '#ecc6a3';
  c.beginPath();
  c.arc(90, 64, 22, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = NAVY;
  c.fillRect(56, 88, 68, 64);
  c.fillStyle = '#e53935';
  c.beginPath();
  c.arc(22, 22, 7, 0, Math.PI * 2);
  c.fill();
  text(c, 'REC 00:12:34', 34, 23, 13, '#ffffff', 'left');
  text(c, '4K 30p', 246, 146, 11, '#cfd8dc', 'right', false);
};
const paintStudioBoard: Paint = (c) => {
  c.fillStyle = '#0f1f33';
  c.fillRect(0, 0, 1024, 576);
  text(c, '수학Ⅱ · 미분 마무리', 40, 52, 40, '#ffd54f');
  c.strokeStyle = '#ffd54f';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(40, 82);
  c.lineTo(420, 82);
  c.stroke();
  ['① 미분한다', "② f′(x) = 0 인 x 찾기", '③ 증감표 그리기', '④ 극대 · 극소 · 그래프'].forEach((s, i) => text(c, s, 60, 140 + i * 62, 34, i === 2 ? '#ff8a80' : '#ffffff'));
  c.strokeStyle = '#80d8ff';
  c.lineWidth = 5;
  c.beginPath();
  for (let i = 0; i <= 60; i++) {
    const x = -1.1 + (i / 60) * 4.1;
    const y = x * x * x - 3 * x * x + 2;
    if (i === 0) c.moveTo(700 + x * 75, 300 - y * 42);
    else c.lineTo(700 + x * 75, 300 - y * 42);
  }
  c.stroke();
  c.strokeStyle = '#90a4ae';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(600, 300);
  c.lineTo(960, 300);
  c.moveTo(700, 460);
  c.lineTo(700, 120);
  c.stroke();
  c.strokeStyle = '#ff8a80';
  c.lineWidth = 4;
  c.strokeRect(40, 420, 520, 110);
  text(c, '증감표 없으면 서술형 감점!', 64, 476, 34, '#ff8a80');
  text(c, '한빛 인강', 980, 548, 22, '#546e7a', 'right');
};
const paintStudioSide = (title: string, sub: string): Paint => (c) => {
  c.fillStyle = NAVY;
  c.fillRect(0, 0, 256, 512);
  c.fillStyle = ORANGE;
  c.fillRect(0, 440, 256, 10);
  c.fillStyle = '#ffffff';
  c.globalAlpha = 0.08;
  for (let i = 0; i < 6; i++) {
    c.beginPath();
    c.arc(128, 220, 40 + i * 30, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
  c.font = `bold 44px ${KOR_FONT}`;
  c.fillStyle = '#ffffff';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(title, 128, 200);
  c.font = `24px ${KOR_FONT}`;
  c.fillStyle = '#ffcc80';
  c.fillText(sub, 128, 256);
};
const paintCarrelNotes = (seed: number): Paint => (c) => {
  const r = seeded(seed * 31 + 7);
  c.fillStyle = '#e7dccb';
  c.fillRect(0, 0, 256, 128);
  const notes: Array<[string, string, string]> = [
    ['수능 D-23', '화이팅!!', '#fff59d'],
    ['국어 비문학', '하루 3지문', '#b3e5fc'],
    ['수학 오답', '21·29·30번', '#f8bbd0'],
    ['영어 단어', 'Day 15~16', '#c8e6c9'],
  ];
  for (let i = 0; i < 3; i++) {
    const [a, b, bg] = notes[(seed + i) % notes.length];
    c.save();
    c.translate(12 + i * 82, 14 + r() * 20);
    c.rotate((r() - 0.5) * 0.15);
    c.fillStyle = bg;
    c.fillRect(0, 0, 72, 64);
    text(c, a, 6, 18, 13, BLACK_INK);
    text(c, b, 6, 42, 12, '#455a64', 'left', false);
    c.restore();
  }
};
function paintDday(n: number): Paint {
  return (c) => {
    c.fillStyle = '#212121';
    c.fillRect(0, 0, 192, 128);
    c.fillStyle = '#000000';
    c.fillRect(0, 62, 192, 4);
    c.font = `bold 92px ${KOR_FONT}`;
    c.fillStyle = '#ffffff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(String(n), 96, 68);
  };
}
const paintDdayBoard: Paint = (c) => {
  c.fillStyle = '#f7f3ea';
  c.fillRect(0, 0, 1024, 576);
  c.fillStyle = NAVY;
  c.fillRect(0, 0, 1024, 70);
  text(c, '2027학년도 대학수학능력시험', 24, 36, 34, '#ffffff');
  text(c, ACADEMY, 1000, 36, 24, '#ffcc80', 'right');
  // The D-day panel at the left (the card's drawn on it).
  c.fillStyle = '#ffffff';
  c.fillRect(24, 96, 330, 300);
  c.strokeStyle = RED_INK;
  c.lineWidth = 6;
  c.strokeRect(24, 96, 330, 300);
  text(c, 'D -', 50, 245, 80, RED_INK);
  text(c, '11월 19일 (목)', 190, 370, 26, BLACK_INK, 'center');
  text(c, '수능까지', 190, 128, 24, '#607d8b', 'center', false);
  // 명예의 전당 along the bottom.
  text(c, '명예의 전당 — 2026 합격', 24, 438, 26, NAVY);
  const unis = ['○○대 의예과', '△△대 경영', '□□대 컴공', '◇◇교대', '☆☆대 약학'];
  unis.forEach((s, i) => {
    const x = 24 + i * 196;
    c.fillStyle = '#cfd8dc';
    c.fillRect(x, 460, 64, 80);
    c.fillStyle = '#ecc6a3';
    c.beginPath();
    c.arc(x + 32, 492, 16, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = NAVY;
    c.fillRect(x + 14, 512, 36, 28);
    text(c, s, x + 72, 486, 18, BLACK_INK, 'left');
    text(c, '최종 합격', x + 72, 516, 14, RED_INK, 'left', false);
  });
};
const paintRanking: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 256, 320);
  c.fillStyle = '#fff3e0';
  c.fillRect(0, 0, 256, 50);
  text(c, '10월 모의고사', 128, 18, 20, ORANGE, 'center');
  text(c, '성적 우수자 ★', 128, 40, 18, NAVY, 'center');
  const names = ['김○준 392', '이○아 388', '박○우 381', '최○린 377', '정○호 375', '한○서 371'];
  names.forEach((s, i) => text(c, `${i + 1}. ${s}`, 22, 76 + i * 34, 20, BLACK_INK, 'left', i < 3));
};
const paintChartSheet: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 256, 320);
  text(c, '반별 수학 평균', 128, 22, 20, NAVY, 'center');
  const v = [72, 81, 65, 88, 77];
  v.forEach((x, i) => {
    c.fillStyle = i === 3 ? ORANGE : '#90a4ae';
    c.fillRect(30 + i * 44, 290 - x * 2.6, 30, x * 2.6);
    text(c, ['A', 'B', 'C', 'S', 'D'][i], 45 + i * 44, 304, 14, BLACK_INK, 'center', false);
  });
};
const paintNewSheet: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 192, 272);
  c.fillStyle = '#e3f2fd';
  c.fillRect(0, 0, 192, 44);
  text(c, '11월 주간 모의고사', 96, 16, 15, BLUE_INK, 'center');
  text(c, '수학 1등급', 96, 34, 14, RED_INK, 'center');
  const names = ['김○준 96', '박○우 92', '오○람 92', '서○민 88'];
  names.forEach((s, i) => text(c, `${i + 1}. ${s}`, 18, 70 + i * 30, 16, BLACK_INK, 'left', i === 0));
  c.fillStyle = '#cfd8dc';
  for (let i = 0; i < 4; i++) c.fillRect(18, 196 + i * 16, 150 - i * 20, 4);
};
const paintPlacement: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 384, 272);
  text(c, '2027 정시 배치표 (자연)', 192, 18, 18, NAVY, 'center');
  const bands = ['#ef9a9a', '#ffcc80', '#fff59d', '#c5e1a5', '#90caf9', '#b39ddb'];
  bands.forEach((col, i) => {
    c.fillStyle = col;
    c.fillRect(12, 36 + i * 38, 360, 34);
    text(c, `${398 - i * 8}`, 20, 53 + i * 38, 14, BLACK_INK, 'left');
    const u = [['의예', '치의예', '한의예'], ['약학', '수의예', '공대'], ['자연계', '컴퓨터', '전자'], ['간호', '생명', '화공'], ['수학교육', '물리', '건축'], ['환경', '농생명', '기계']][i];
    u.forEach((s, k) => text(c, `○○대 ${s}`, 80 + k * 98, 53 + i * 38, 13, '#37474f', 'left', false));
  });
  c.strokeStyle = RED_INK;
  c.lineWidth = 4;
  c.strokeRect(70, 112, 210, 36);
};
const paintTrend: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 256, 192);
  text(c, '성적 추이 · 김○준', 128, 16, 15, NAVY, 'center');
  c.strokeStyle = '#cfd8dc';
  c.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    c.beginPath();
    c.moveTo(20, 40 + i * 30);
    c.lineTo(240, 40 + i * 30);
    c.stroke();
  }
  const pts = [150, 140, 120, 118, 92, 70];
  c.strokeStyle = RED_INK;
  c.lineWidth = 3;
  c.beginPath();
  pts.forEach((y, i) => (i ? c.lineTo(30 + i * 40, y) : c.moveTo(30 + i * 40, y)));
  c.stroke();
  c.fillStyle = RED_INK;
  pts.forEach((y, i) => {
    c.beginPath();
    c.arc(30 + i * 40, y, 4, 0, Math.PI * 2);
    c.fill();
  });
  ['3월', '4월', '6평', '7월', '9평', '10월'].forEach((s, i) => text(c, s, 30 + i * 40, 182, 11, '#607d8b', 'center', false));
};
const paintMemo: Paint = (c) => {
  c.fillStyle = '#fffde7';
  c.fillRect(0, 0, 160, 200);
  c.strokeStyle = '#e0d9a8';
  for (let i = 0; i < 9; i++) {
    c.beginPath();
    c.moveTo(6, 30 + i * 19);
    c.lineTo(154, 30 + i * 19);
    c.stroke();
  }
  text(c, '목표: 수학 2→1등급', 8, 24, 13, BLUE_INK);
  text(c, '· 주 2회 클리닉', 8, 48, 12, BLUE_INK, 'left', false);
  text(c, '· 오답노트 점검', 8, 67, 12, BLUE_INK, 'left', false);
  text(c, '· 정시 가/나군', 8, 86, 12, BLUE_INK, 'left', false);
};
const paintLeaflet: Paint = (c) => {
  c.fillStyle = NAVY;
  c.fillRect(0, 0, 160, 220);
  c.fillStyle = ORANGE;
  c.fillRect(0, 150, 160, 8);
  text(c, '겨울방학', 80, 40, 22, '#ffffff', 'center');
  text(c, '집중 특강', 80, 72, 26, '#ffcc80', 'center');
  text(c, '예비 고3 수학', 80, 110, 16, '#ffffff', 'center', false);
  text(c, ACADEMY, 80, 190, 14, '#ffffff', 'center');
};
const paintSchedule: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 384, 256);
  c.fillStyle = NAVY;
  c.fillRect(0, 0, 384, 44);
  text(c, '2027 대입 주요 일정', 192, 23, 22, '#ffffff', 'center');
  const rows = [['9.9 ~ 9.13', '수시 원서 접수'], ['11.19 (목)', '대학수학능력시험'], ['12.5', '수능 성적 통지'], ['12.29 ~ 1.2', '정시 원서 접수'], ['2.10', '정시 최종 발표']];
  rows.forEach(([a, b], i) => {
    text(c, a, 24, 74 + i * 38, 18, i === 1 ? RED_INK : BLACK_INK, 'left', i === 1);
    text(c, b, 170, 74 + i * 38, 18, i === 1 ? RED_INK : BLACK_INK, 'left', false);
  });
};
const paintCopier = (n: number, running: boolean): Paint => (c) => {
  c.fillStyle = '#0d47a1';
  c.fillRect(0, 0, 192, 112);
  c.fillStyle = '#e3f2fd';
  c.fillRect(6, 6, 180, 100);
  text(c, running ? '인쇄 중…' : '복사 준비 완료', 96, 26, 16, NAVY, 'center');
  text(c, `${n} / 120 부`, 96, 58, 22, BLACK_INK, 'center');
  c.fillStyle = '#bbdefb';
  c.fillRect(20, 80, 152, 12);
  c.fillStyle = '#43a047';
  c.fillRect(20, 80, (152 * n) / 120, 12);
};
const paintExamCover: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 192, 272);
  c.fillStyle = '#eceff1';
  c.fillRect(0, 0, 192, 60);
  text(c, '2027학년도 수능 대비', 96, 18, 13, '#455a64', 'center', false);
  text(c, '한빛 실전 모의고사', 96, 42, 16, NAVY, 'center');
  c.strokeStyle = BLACK_INK;
  c.lineWidth = 2;
  c.strokeRect(36, 80, 120, 50);
  text(c, '수학 영역', 96, 105, 22, BLACK_INK, 'center');
  text(c, '제 2 교시', 96, 150, 13, '#455a64', 'center', false);
  c.fillStyle = '#cfd8dc';
  for (let i = 0; i < 5; i++) c.fillRect(24, 180 + i * 16, 144 - (i % 2) * 30, 3);
};
const paintShelfSign: Paint = (c) => {
  c.fillStyle = NAVY;
  c.fillRect(0, 0, 512, 64);
  c.fillStyle = ORANGE;
  c.fillRect(0, 58, 512, 6);
  text(c, '교재 판매 · 문의는 데스크로', 256, 32, 30, '#ffffff', 'center');
};
/** A book's cover, face out on the shelf. */
function paintCover(title: string, sub: string, bg: string): Paint {
  return (c) => {
    c.fillStyle = bg;
    c.fillRect(0, 0, 128, 176);
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.fillRect(0, 56, 128, 52);
    c.font = `bold 22px ${KOR_FONT}`;
    c.fillStyle = '#263238';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(title, 64, 76, 120);
    c.font = `15px ${KOR_FONT}`;
    c.fillText(sub, 64, 98, 120);
    c.fillStyle = '#ffffff';
    c.font = `bold 14px ${KOR_FONT}`;
    c.fillText('2027 수능 대비', 64, 24, 120);
  };
}

// ---------------------------------------------------------------------------------------------
// Boards: the lecture room's whiteboard, the same frame on the 교탁's stretch of wall.

const BOARD = { y: 1.45, h: 1.22, z: -0.47 };
/** A whiteboard `w` wide on the wall (or on a stand), its marker tray with the markers and the eraser. */
function whiteboard(g: THREE.Object3D, w: number, onWall: boolean): void {
  const { y, h, z } = BOARD;
  if (!onWall) {
    for (const sx of [-1, 1]) {
      part(g, rbox(0.05, y + h / 2, 0.05, 0.01), STEEL, sx * (w / 2 - 0.03), (y + h / 2) / 2, z);
      part(g, rbox(0.07, 0.04, 0.5, 0.01), STEEL, sx * (w / 2 - 0.03), 0.06, z);
    }
  }
  part(g, rbox(w - 0.02, h + 0.05, 0.035, 0.01), ALU, 0, y, z);
  part(g, box(w - 0.07, h, 0.006), '#fdfdfb', 0, y, z + 0.019, { outline: false });
  // The tray, and on it the markers (black, blue, red) and the eraser.
  const ty = y - h / 2 - 0.03;
  part(g, rbox(w - 0.06, 0.018, 0.08, 0.006), ALU, 0, ty, z + 0.05);
  const cols = [BLACK_INK, BLUE_INK, RED_INK, BLACK_INK];
  for (let i = 0; i < 4; i++) {
    const x = -w / 2 + 0.2 + i * 0.07;
    part(g, cyl(0.011, 0.011, 0.12, 8), '#fafafa', x, ty + 0.02, z + 0.05, { rz: Math.PI / 2, outline: false });
    part(g, cyl(0.012, 0.012, 0.03, 8), cols[i], x - 0.07, ty + 0.02, z + 0.05, { rz: Math.PI / 2, outline: false });
  }
  part(g, rbox(0.14, 0.04, 0.055, 0.008), NAVY, w / 2 - 0.22, ty + 0.03, z + 0.05);
  part(g, box(0.13, 0.014, 0.05), '#cfd8dc', w / 2 - 0.22, ty + 0.01, z + 0.05, { outline: false });
}
/** A banner along the wall over a board. */
function banner(g: THREE.Object3D, s: string, w: number, y: number, z: number): void {
  picture(g, painted(`atBanner|${s}`, 512, 64, paintBanner(s)), w, w / 8, 0, y, z);
}

// ---------------------------------------------------------------------------------------------
// The pieces.

let podiumCount = 0;
let tutorCount = 0;
let boardCount = 0;
let deskCount = 0;
let rowCount = 0;
let carrelCount = 0;
let ddayCount = 0;

export const BUILDERS: Record<string, Builder> = {
  // ===========================================================================================
  /**
   * The 교탁 (1 × 1, against the front wall): a stretch of whiteboard in the same aluminium frame as
   * the long boards either side, today's 강 at its head and the 학원's motto over it; the lectern in
   * front, white laminate with a navy front and the 학원's emblem, its top sloped to the 강사 — the
   * 교재 open, the lecture tablet showing the slide, the headset mic on its little stand (taken off
   * it to teach), the marker cup, the laser pointer, the 생수 and the lecture timer (lit while it's
   * on). The lecture is written up a line at a time where the board's clear (four lines a problem,
   * then wiped) — red and starred before an exam, in blue by the junior being coached, who stands at
   * the board while the 강사 watches from its side with a clipboard.
   */
  lecturePodium(g, _W, _D, _c, _def, ctx, out) {
    const n = podiumCount++;
    const onWall = ctx.againstWall;
    whiteboard(g, 1.0, onWall);
    const fz = BOARD.z + 0.024;
    decal(g, painted('atPodiumHead', 640, 80, boardHeader('3강  미분의 활용', '예제 3 · 극대와 극소')), 0.8, 0.1, -0.04, BOARD.y + 0.5, fz);
    if (onWall) banner(g, '꿈은 크게, 오늘은 한 문제 더', 0.96, BOARD.y + BOARD.h / 2 + 0.16, BOARD.z + 0.01);
    // The lectern: the carcass open at the back with a shelf, the navy front with the emblem.
    const L = AT.PD.lectern;
    const H = L.top;
    for (const sx of [-1, 1]) part(g, rbox(0.03, H - 0.04, L.d, 0.01), LAMI, sx * (L.w / 2 - 0.015), (H - 0.04) / 2, L.z);
    part(g, rbox(L.w, 0.06, L.d + 0.02, 0.01), '#455a64', 0, 0.03, L.z);
    part(g, rbox(L.w - 0.03, H - 0.1, 0.025, 0.01), NAVY, 0, (H - 0.1) / 2 + 0.05, L.z + L.d / 2 - 0.0125);
    part(g, box(L.w - 0.03, 0.03, 0.026), ORANGE, 0, 0.3, L.z + L.d / 2 - 0.012, { outline: false });
    picture(g, painted('atLogo', 256, 128, paintLogo), 0.36, 0.18, 0, 0.72, L.z + L.d / 2 + 0.002);
    part(g, rbox(L.w - 0.06, 0.02, L.d - 0.04, 0.006), shade(LAMI, 0.92), 0, 0.5, L.z);
    for (let i = 0; i < 5; i++) book(g, -0.22 + i * 0.045, 0.51, L.z - 0.03, 0.035, 0.22, 0.17, ['#1565c0', '#ef6c00', '#2e7d32', '#6a1b9a', '#c62828'][i]);
    part(g, rbox(0.16, 0.05, 0.1, 0.01), '#eceff1', 0.18, 0.535, L.z - 0.04);
    // The top, sloped down to the 강사's side, a lip to stop things sliding.
    const top = group(g, 0, H, L.z);
    top.rotation.x = -0.13;
    part(top, rbox(L.w + 0.04, 0.03, L.d + 0.06, 0.01), shade(LAMI, 1.02), 0, 0, 0);
    part(top, box(L.w + 0.02, 0.02, 0.015), '#90a4ae', 0, 0.02, (L.d + 0.06) / 2 - 0.01, { outline: false });
    part(top, box(0.3, 0.012, 0.2), NAVY, -0.12, 0.021, 0.0, { outline: false });
    flat(top, painted('atTextbook', 256, 176, paintTextbook), 0.29, 0.19, -0.12, 0.028, 0.0, Math.PI);
    // The lecture tablet on its stand, the slide lit while it's on.
    const tab = group(top, 0.17, 0.02, 0.04);
    part(tab, rbox(0.17, 0.12, 0.012, 0.008), BLACK, 0, 0.06, 0, { rx: 0.35 });
    const slide = swapScreen(tab, [painted('atSlideOff', 32, 32, paintDark), painted('atSlide', 192, 128, paintSlide)], 0.15, 0.1, 0, 0.062, -0.008, 0.35, Math.PI);
    // The lecture timer, the marker cup, the laser pointer, the water.
    const timer = swapScreen(top, [painted('atTimerOff', 128, 48, paintTimer(false)), painted('atTimerOn', 128, 48, paintTimer(true))], 0.09, 0.034, 0.23, 0.04, -0.14, 0.4, Math.PI);
    part(top, rbox(0.1, 0.045, 0.03, 0.008), '#212121', 0.23, 0.03, -0.13);
    timer.mesh.position.z = -0.147;
    part(top, cyl(0.03, 0.028, 0.09, 12), ORANGE, -0.25, 0.06, 0.1);
    for (const [dx, col] of [[-0.01, BLACK_INK], [0.01, BLUE_INK], [0, RED_INK]] as Array<[number, string]>) part(top, cyl(0.008, 0.008, 0.13, 8), col, -0.25 + dx, 0.1, 0.1 + dx, { outline: false });
    part(top, cyl(0.006, 0.006, 0.12, 8), '#424242', 0.02, 0.022, -0.12, { rz: Math.PI / 2, ry: 0.4, outline: false });
    part(top, cyl(0.032, 0.032, 0.21, 12), '#b3e5fc', 0.26, 0.12, 0.12, { material: GLASS });
    part(top, cyl(0.02, 0.02, 0.025, 10), '#1e88e5', 0.26, 0.23, 0.12, { outline: false });
    // The headset mic on its stand (idle: taken off to teach), its receiver's light.
    const idle = group(g);
    out.idle = idle;
    const hs = group(idle, -0.27, H + 0.06, L.z - 0.06);
    part(hs, cyl(0.004, 0.004, 0.1, 6), '#424242', 0, 0.0, 0, { outline: false });
    const band = part(hs, new THREE.TorusGeometry(0.07, 0.006, 6, 18, Math.PI), '#212121', 0, 0.08, 0, { outline: false });
    band.userData.ownGeometry = true;
    part(hs, ball(0.018), '#212121', 0.07, 0.08, 0, { outline: false });
    rod(hs, v3(0.07, 0.08, 0), v3(0.03, 0.04, 0.06), 0.003, '#212121');
    part(hs, ball(0.009), '#424242', 0.03, 0.04, 0.06, { outline: false });
    part(g, rbox(0.12, 0.04, 0.08, 0.01), '#263238', 0.18, 0.55, L.z + 0.06);
    glowing(g, box(0.012, 0.008, 0.004), '#76ff03', 0.15, 0.56, L.z + 0.101);

    // In use: the lines on the board (the lecture's, the 특강's, the junior's), the stars, the junior, the words.
    const use = group(g);
    out.inUse = use;
    const sets = [LECT_LINES, CRAM_LINES, COACH_LINES].map((lines, si) => {
      const color = si === 1 ? RED_INK : si === 2 ? BLUE_INK : BLACK_INK;
      const set = group(use);
      const rows = lines.map((s, i) => {
        const tex = painted(`atInk${si}|${i}|${s}`, 640, 64, paintInk(s, color)).clone();
        tex.needsUpdate = true;
        const geom = new THREE.PlaneGeometry(AT.PD.len, 0.07).translate(AT.PD.len / 2, 0, 0);
        const m = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
        m.userData.ownGeometry = m.userData.ownMaterial = true;
        m.position.set(AT.PD.x0, AT.PD.y0 - AT.PD.gap * i, BOARD.z + 0.026);
        set.add(m);
        return { m, tex };
      });
      const stars = lines.map((_, i) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.06), new THREE.MeshBasicMaterial({ map: painted('atStar', 64, 64, paintStar), transparent: true, depthWrite: false }));
        m.userData.ownGeometry = m.userData.ownMaterial = true;
        m.position.set(AT.PD.x0 + AT.PD.len + 0.05, AT.PD.y0 - AT.PD.gap * i, BOARD.z + 0.027);
        set.add(m);
        return m;
      });
      return { set, rows, stars };
    });
    const writeTo = (si: number, row: number, along: number, star: boolean) => {
      sets.forEach((S, k) => (S.set.visible = k === si));
      const S = sets[si];
      S.rows.forEach(({ m, tex }, i) => {
        const k = i < row ? 1 : i === row ? Math.max(0.001, along) : 0;
        m.visible = k > 0.002;
        m.scale.x = Math.max(0.001, k);
        tex.repeat.x = Math.max(0.001, k);
      });
      S.stars.forEach((m, i) => (m.visible = si !== 2 && (i < row || (i === row && star))));
    };
    const junior = bodied(standing(use, LOOKS.junior, AT.JUNIOR.x, AT.JUNIOR.z, Math.PI), { gender: 'male' });
    const say = bubbles(use, ['자, 여기까지 이해됐죠?', '이 부분 시험에 나와요!', '★★★ 무조건 나온다!', '학생들 쪽을 보면서 쓰세요'], 0.3, 2.05, -0.05);

    const mark = marker(g, 0, 1.0, 0.0);
    const spots: Record<string, Spot> = {
      lectureClass: spotAt(g, AT.LECT_AT, 'stand', 'atLecture', mark),
      academyTutor_ownClass: spotAt(g, AT.LECT_AT, 'stand', 'atLecture', mark),
      examCramming: spotAt(g, AT.LECT_AT, 'stand', 'atCram', mark),
      academyTutor_trainInstructors: spotAt(g, AT.COACH_AT, 'stand', 'atCoach', mark),
      '*': spotAt(g, AT.LECT_AT, 'stand', 'atLecture', mark),
    };
    out.spots = spots;
    out.work = marker(g, 0, H + 0.05, L.z);
    out.animate = (t) => {
      const m = nowMotion(spots, t, 'atLecture');
      const ph = phaseOf(mark);
      slide.show(1);
      timer.show(Math.floor(t * 1.5) % 2 === 0 || m !== 'atCram' ? 1 : 0);
      junior.root.visible = m === 'atCoach';
      if (m === 'atCoach') {
        const b = AT.coachBeat(t, ph);
        const B = AT.coachBoard(b);
        writeTo(2, B.row, B.along, false);
        // The junior writes the line, turns to listen when told, the 교재 in the left hand.
        const turn = B.listening ? 1 : 0;
        junior.root.rotation.y = mix(Math.PI, Math.PI - 2.2, AT.ss(turn));
        junior.armL(null);
        if (B.listening) {
          junior.armR(null);
          chatter(junior, t, 0, n);
          junior.head.rotation.set(0, 0, 0.05 * Math.sin(t * 2));
        } else {
          junior.armR(vp(AT.linePt(B.row, B.along), 0.01 * Math.sin(t * 17)));
          junior.head.rotation.set(-0.15, 0, 0);
        }
        say(AT.coachSays(b) ? 4 : 0);
        for (const k of ['lectureClass', 'academyTutor_ownClass', 'examCramming', '*']) spots[k].at.rotation.y = AT.LECT_AT.yaw;
      } else {
        const cram = m === 'atCram';
        const b = AT.lectBeat(t, ph, cram);
        const B = AT.lectBoard(b);
        writeTo(cram ? 1 : 0, B.row, B.along, B.star);
        const yaw = AT.lectYaw(b);
        for (const k of ['lectureClass', 'academyTutor_ownClass', 'examCramming', '*']) spots[k].at.rotation.y = yaw;
        const s = AT.lectSays(b);
        say(s === 1 ? (cram ? 3 : 1) : s === 2 ? (cram ? 3 : 2) : 0);
      }
    };
    whenIdle(out, g, () => {
      slide.show(0);
      timer.show(0);
      for (const k of Object.keys(spots)) spots[k].at.rotation.y = k === 'academyTutor_trainInstructors' ? AT.COACH_AT.yaw : AT.LECT_AT.yaw;
    });
  },

  // ===========================================================================================
  /**
   * The 질문 책상 (1 × 1, against a wall): a birch top on steel legs, a felt pinboard partition at
   * the back (질문 환영, the 질의응답 hours, today's 상담) with a shelf of 문제집 on it; the monitor
   * at the left over the keyboard (the 문제지 being typed, the 모집 계획), an arm lamp, the stack of
   * answer sheets to go over under a clip, the red pens, a mug. The 강사's swivel chair at the front
   * left, an orange stool beside it at the right where a pupil sits with their 문제집 while it's gone
   * over — the answer circled in red, the step written in the margin, the pupil nodding.
   */
  tutorDesk(g, _W, _D, _c, _def, _ctx, out) {
    const n = tutorCount++;
    const T = AT.TD;
    const z = T.z;
    // The frame and the top.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, rbox(0.035, T.top - 0.02, 0.035, 0.008), STEEL, sx * (T.w / 2 - 0.04), (T.top - 0.02) / 2, z + sz * (T.d / 2 - 0.04));
    part(g, rbox(T.w - 0.08, 0.3, 0.015, 0.006), '#b0bec5', 0, T.top - 0.2, z - T.d / 2 + 0.04);
    part(g, rbox(T.w, 0.03, T.d, 0.008), BIRCH, 0, T.top - 0.015, z);
    // The partition at the back with its pinboard, and a shelf of 문제집 on it.
    part(g, rbox(T.w, 0.5, 0.03, 0.01), '#90a4ae', 0, T.top + 0.25, -0.46);
    picture(g, painted('atPinboard', 512, 192, paintPinboard), T.w - 0.06, 0.34, 0, T.top + 0.23, -0.443);
    part(g, rbox(T.w, 0.02, 0.16, 0.006), BIRCH, 0, T.top + 0.51, -0.4);
    const r = seeded(n * 11 + 3);
    for (let i = 0; i < 12; i++) book(g, -0.42 + i * 0.05 + (i > 6 ? 0.08 : 0), T.top + 0.52, -0.4, 0.04, 0.17 + r() * 0.06, 0.14, ['#1565c0', '#ef6c00', '#2e7d32', '#6a1b9a', '#c62828', '#00838f', '#f9a825'][Math.floor(r() * 7)]);
    // The monitor and keyboard, the mouse.
    part(g, rbox(0.16, 0.012, 0.1, 0.004), '#37474f', -0.2, T.top + 0.006, -0.36);
    part(g, rbox(0.03, 0.18, 0.03, 0.008), '#37474f', -0.2, T.top + 0.1, -0.37);
    part(g, rbox(0.46, 0.29, 0.03, 0.012), '#263238', -0.2, T.top + 0.32, -0.36);
    const screen = swapScreen(g, [painted('atMonOff', 32, 32, paintDark), painted('atEditor', 320, 200, paintEditor), painted('atPlan', 320, 200, paintPlan)], 0.43, 0.26, -0.2, T.top + 0.32, -0.343);
    part(g, rbox(0.36, 0.016, 0.12, 0.004), '#eceff1', T.kb[0], T.top + 0.008, T.kb[2]);
    part(g, box(0.34, 0.004, 0.1), '#b0bec5', T.kb[0], T.top + 0.018, T.kb[2], { outline: false });
    part(g, rbox(0.05, 0.02, 0.08, 0.02), '#eceff1', T.mouse[0], T.top + 0.01, T.mouse[2]);
    // The arm lamp at the back right, its head lit while the desk's in use.
    part(g, cyl(0.05, 0.05, 0.02, 14), '#37474f', 0.4, T.top + 0.01, -0.36);
    rod(g, v3(0.4, T.top + 0.02, -0.36), v3(0.36, T.top + 0.38, -0.3), 0.008, '#37474f');
    rod(g, v3(0.36, T.top + 0.38, -0.3), v3(0.2, T.top + 0.42, -0.16), 0.008, '#37474f');
    part(g, cyl(0.03, 0.06, 0.06, 14), '#37474f', 0.2, T.top + 0.4, -0.16);
    // The stack to go over, the red pens, the mug.
    for (let i = 0; i < 6; i++) part(g, box(0.16, 0.004, 0.22), i % 2 ? '#fafafa' : '#f1f1ec', T.stack[0] + (i % 2) * 0.004, T.top + 0.003 + i * 0.004, T.stack[2], { ry: (i - 3) * 0.02, outline: false });
    part(g, box(0.04, 0.012, 0.03), '#9e9e9e', T.stack[0], T.top + 0.03, T.stack[2] - 0.1, { outline: false });
    part(g, cyl(0.03, 0.028, 0.09, 12), NAVY, 0.44, T.top + 0.045, -0.12);
    for (const dx of [-0.01, 0.01]) part(g, cyl(0.006, 0.006, 0.13, 8), RED_INK, 0.44 + dx, T.top + 0.1, -0.12, { outline: false });
    part(g, cyl(0.035, 0.032, 0.09, 14), '#fafafa', -0.42, T.top + 0.045, -0.24);
    label(g, '한빛', 0.05, 0.025, -0.42, T.top + 0.05, -0.204, '#fafafa', NAVY);
    // The marked pile (grows as it's marked).
    const pile = group(g, T.done[0], T.top, T.done[2]);
    const pileSheets = Array.from({ length: 8 }, (_, i) => part(pile, box(0.16, 0.004, 0.22), '#fafafa', 0, 0.003 + i * 0.004, 0, { ry: (i % 3 - 1) * 0.04, outline: false }));
    // The chairs: the 강사's swivel chair, the pupil's stool.
    swivelChair(g, AT.TUTOR_AT.x, 0.42, Math.PI);
    stool(g, T.stool.x, T.stool.z, T.stool.seat);

    // In use: the pupil and their 문제집 (circled, the step written), the test being marked, the draft.
    const use = group(g);
    out.inUse = use;
    glowing(use, cyl(0.055, 0.055, 0.004, 14), '#fff8e1', 0.2, T.top + 0.368, -0.16);
    const pupilLook = PUPILS[(n * 3 + 1) % PUPILS.length];
    const pupil = pupilBody(seated(use, pupilLook, T.stool.x, T.stool.z, Math.PI + 0.36, T.stool.seat, 0.12), pupilLook, T.stool.seat);
    const S = T.sheet;
    const qbook = group(use);
    openBook(qbook, painted('atQuestion', 320, 220, paintQuestion), S[0], T.top, S[2], ORANGE, 0, 0.3, 0.2);
    const circle = part(qbook, RED_RING, RED_INK, S[0] + 0.03, T.top + 0.018, S[2] - 0.035, { rx: Math.PI / 2, outline: false });
    circle.scale.set(1.3, 0.8, 1);
    const stepTex = painted('atStep', 256, 96, paintStep).clone();
    stepTex.needsUpdate = true;
    const stepM = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.04).translate(0.05, 0, 0), new THREE.MeshBasicMaterial({ map: stepTex, transparent: true, depthWrite: false }));
    stepM.userData.ownGeometry = stepM.userData.ownMaterial = true;
    stepM.rotation.x = -Math.PI / 2;
    stepM.position.set(S[0] + 0.045, T.top + 0.018, S[2] + 0.05);
    qbook.add(stepM);
    // The word test: a sheet that's taken, marked, put on the pile; its O and X, its score.
    const quiz = group(use);
    part(quiz, box(0.16, 0.003, 0.22), '#ffffff', 0, 0, 0, { outline: false });
    flat(quiz, painted('atQuiz', 160, 220, paintQuiz), 0.155, 0.215, 0, 0.003, 0);
    const okRows = [true, true, false, true, true, true, false, true];
    const marks = okRows.map((ok, i) => flat(quiz, painted(`atOX${ok}`, 64, 64, paintOX(ok)), 0.022, 0.022, 0.05, 0.005, -0.075 + i * 0.02));
    const score = flat(quiz, painted('atScore', 128, 64, paintScore), 0.05, 0.025, 0.05, 0.005, -0.1);
    // The handout draft, picked up to proofread.
    const draft = group(use);
    part(draft, box(0.16, 0.003, 0.22), '#ffffff', 0, 0, 0, { outline: false });
    flat(draft, painted('atEditor', 320, 200, paintEditor), 0.15, 0.2, 0, 0.003, 0);
    const say = bubbles(use, ['그래프부터 그려 볼까?', '아, 이제 알겠어요!'], 0.12, 1.62, 0.25);

    const mark = marker(g, 0, 0.8, 0);
    const kb = marker(g, T.kb[0], T.top + 0.02, T.kb[2]);
    const typing = spot(g, 'sit', AT.TUTOR_AT.x, AT.TUTOR_AT.y, AT.TUTOR_AT.z, AT.TUTOR_AT.yaw, AT.TUTOR_AT.y);
    typing.work = kb;
    typing.motion = 'type';
    const spots: Record<string, Spot> = {
      gradeEssays: spotAt(g, AT.TUTOR_AT, 'sit', 'atExplain', mark),
      academyTutor_gradeQuizzes: spotAt(g, AT.TUTOR_AT, 'sit', 'atMark', mark),
      prepareHandouts: spotAt(g, AT.TUTOR_AT, 'sit', 'atHandout', mark),
      academyTutor_enrollmentPlan: typing,
      '*': spotAt(g, AT.TUTOR_AT, 'sit', 'atExplain', mark),
    };
    out.spots = spots;
    out.work = kb;
    const sheetTo = (o: THREE.Object3D, p: AT.P, held: boolean) => {
      o.position.set(p[0], held ? p[1] - 0.02 : T.top + 0.004, p[2]);
      o.rotation.set(held ? -0.25 : 0, 0, 0);
    };
    out.animate = (t) => {
      const m = nowMotion(spots, t, 'atExplain');
      const ph = phaseOf(mark);
      pupil.root.visible = qbook.visible = m === 'atExplain';
      quiz.visible = m === 'atMark';
      draft.visible = false;
      say(0);
      screen.show(m === 'type' ? 2 : 1);
      pileSheets.forEach((s, i) => (s.visible = i < 3));
      if (m === 'atExplain') {
        const b = AT.explainBeat(t, ph);
        const ink = AT.explainInk(b);
        circle.visible = ink.circle;
        const k = Math.max(0.001, typeof ink.step === 'number' ? ink.step : 1);
        stepM.visible = k > 0.01;
        stepM.scale.x = k;
        stepTex.repeat.x = k;
        say(AT.explainSays(b));
        // The pupil: pencil in hand on the page, looking at it, turned to the 강사 to listen, nodding as they get it.
        const toTutor = AT.amountOf(b, 'talk') + AT.amountOf(b, 'ask');
        pupil.head.rotation.set(mix(0.45, 0.05, toTutor), mix(0, -0.4, AT.amountOf(b, 'talk')), 0);
        if (b.from === 'talk' || b.from === 'ask') pupil.head.rotation.x += 0.12 * Math.max(0, Math.sin(t * 5)) * (b.from === 'ask' ? 1 : 0.4);
        pupil.armL(v3(S[0], T.top + 0.04, S[2] + 0.12));
        pupil.armR(b.from === 'ask' ? v3(S[0] + 0.16, T.top + 0.06, S[2] + 0.06) : v3(S[0] + 0.07, T.top + 0.03, S[2] + 0.03));
        chatter(pupil, t, AT.explainSays(b) === 2 ? 1 : 0, n);
        pupil.eyes(blinkOf(t, n));
      } else if (m === 'atMark') {
        const b = AT.markBeat(t, ph);
        const where = AT.markSheet(b);
        const key = AT.atKeyOf('atMark', t, ph).key;
        if (where === 'stack') {
          sheetTo(quiz, T.stack, false);
          quiz.position.y = T.top + 0.03;
        } else if (where === 'hand') sheetTo(quiz, key.r, b.from === 'take');
        else sheetTo(quiz, S, false);
        const rows = AT.markRows(b);
        marks.forEach((mm, i) => (mm.visible = where !== 'stack' && b.from !== 'take' && rows * 8 > i + 0.5));
        score.visible = b.from === 'set' || (b.from === 'score' && b.p > 0.5);
        pileSheets.forEach((s, i) => (s.visible = i < ((((b.n % 8) + 8) % 8) + 1)));
      } else if (m === 'atHandout') {
        const b = AT.handoutBeat(t, ph);
        if (AT.handoutHeld(b)) {
          draft.visible = true;
          const key = AT.atKeyOf('atHandout', t, ph).key;
          const mid = AT.mixP(key.l, key.r, 0.5);
          draft.position.set(mid[0], mid[1] + 0.02, mid[2]);
          draft.rotation.set(1.1, 0, 0);
        }
      }
    };
    whenIdle(out, g, () => {
      screen.show(0);
      pileSheets.forEach((s, i) => (s.visible = i < 3));
    });
  },

  // ===========================================================================================
  /**
   * The 인강 camera (1 × 1, the 강사 stood a tile out in front of it): a cinema camera on a fluid head
   * and tripod (a sandbag on a leg), its lens looking out through the teleprompter's glass — the
   * script scrolling up it as it's read, lit while recording — the REC light blinking on top; two
   * softboxes on stands either side angled at the 강사 (lit in use), the return monitor showing the
   * shot, a cable run along the floor and an X of tape where the 강사 stands.
   */
  lectureCamera(g, _W, _D, _c, _def, _ctx, out) {
    const top = 1.32;
    // The tripod: three legs out to the floor, the spreader, the head.
    const hub = v3(0, top - 0.06, -0.08);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI;
      const foot = v3(Math.sin(a) * 0.32, 0, -0.08 + Math.cos(a) * 0.32);
      rod(g, hub, foot, 0.015, BLACK);
      rod(g, v3(0, 0.5, -0.08), v3(Math.sin(a) * 0.2, 0.5 - 0.06, -0.08 + Math.cos(a) * 0.2), 0.008, '#616161');
      part(g, cyl(0.02, 0.02, 0.02, 8), '#424242', foot.x, 0.01, foot.z, { outline: false });
      if (i === 1) part(g, rbox(0.14, 0.06, 0.08, 0.03), ORANGE, foot.x * 0.85, 0.12, foot.z * 0.85 - 0.01, { ry: a });
    }
    part(g, cyl(0.06, 0.05, 0.08, 14), '#37474f', 0, top - 0.03, -0.08);
    rod(g, v3(0, top, -0.12), v3(0, top - 0.1, -0.5), 0.012, '#424242');
    // The camera body, its handle and the lens out the front.
    const camG = group(g, 0, top + 0.08, -0.08);
    part(camG, rbox(0.15, 0.14, 0.28, 0.02), '#212121', 0, 0.03, 0);
    part(camG, rbox(0.04, 0.03, 0.2, 0.01), '#37474f', 0, 0.12, -0.02);
    part(camG, cyl(0.045, 0.05, 0.14, 18), '#263238', 0, 0.03, 0.2, { rx: Math.PI / 2 });
    part(camG, cyl(0.05, 0.05, 0.015, 18), '#c62828', 0, 0.03, 0.17, { rx: Math.PI / 2, outline: false });
    part(camG, rbox(0.1, 0.07, 0.02, 0.01), '#37474f', -0.1, 0.06, -0.08, { ry: -0.6 });
    // The teleprompter: a black hood round the lens, the glass at 45° with the script on it.
    const tp = group(g, 0, top + 0.11, 0.3);
    part(tp, rbox(0.36, 0.03, 0.3, 0.01), '#212121', 0, -0.16, -0.04);
    part(tp, rbox(0.32, 0.02, 0.24, 0.006), '#111111', 0, -0.14, -0.04);
    for (const sx of [-1, 1]) part(tp, box(0.012, 0.32, 0.3), '#212121', sx * 0.18, 0.0, -0.04);
    part(tp, box(0.36, 0.012, 0.3), '#212121', 0, 0.16, -0.04);
    part(tp, box(0.36, 0.32, 0.012), '#212121', 0, 0.0, -0.19);
    const scriptTex = painted('atScript', 256, 512, paintScript).clone();
    scriptTex.needsUpdate = true;
    scriptTex.repeat.set(1, 0.25);
    scriptTex.offset.set(0, 0.75);
    const scriptMat = new THREE.MeshBasicMaterial({ map: scriptTex, transparent: true, opacity: 0.25, depthWrite: false });
    const glassM = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.34), scriptMat);
    glassM.userData.ownGeometry = glassM.userData.ownMaterial = true;
    glassM.rotation.x = -Math.PI / 4;
    glassM.position.set(0, 0, -0.03);
    tp.add(glassM);
    rod(g, v3(0, top - 0.04, -0.08), v3(0, top - 0.05, 0.28), 0.012, '#424242');
    // REC light on top.
    const recOn = new THREE.Mesh(ball(0.014), litMat('#ff1744'));
    recOn.position.set(0.05, top + 0.23, -0.12);
    g.add(recOn);
    part(g, ball(0.014), '#5d1a1a', 0.05, top + 0.23, -0.12, { outline: false });
    // The softboxes either side, on stands, turned to the 강사.
    const faces: THREE.Mesh[] = [];
    for (const sx of [-1, 1]) {
      const x = sx * 0.4;
      const zz = -0.28;
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        rod(g, v3(x, 0.4, zz), v3(x + Math.sin(a) * 0.14, 0, zz + Math.cos(a) * 0.14), 0.007, '#424242');
      }
      part(g, cyl(0.012, 0.012, 1.4, 8), '#424242', x, 1.1, zz, { outline: false });
      const head = group(g, x, 1.82, zz, -sx * 0.35);
      head.rotation.x = 0.18;
      part(head, cyl(0.18, 0.06, 0.24, 4), '#212121', 0, 0, -0.06, { rx: -Math.PI / 2, ry: Math.PI / 4 });
      part(head, box(0.34, 0.34, 0.01), '#e6e6e0', 0, 0, 0.065, { material: DIFFUSER_OFF });
      const face = new THREE.Mesh(box(0.33, 0.33, 0.012), litMat('#fffbe8'));
      face.position.set(0, 0, 0.07);
      head.add(face);
      faces.push(face);
    }
    // The return monitor on a little stand at the right.
    part(g, cyl(0.1, 0.1, 0.02, 14), '#37474f', 0.3, 0.01, 0.15);
    part(g, cyl(0.012, 0.012, 1.0, 8), '#424242', 0.3, 0.5, 0.15, { outline: false });
    part(g, rbox(0.26, 0.17, 0.025, 0.01), '#212121', 0.3, 1.08, 0.15, { ry: -0.25 });
    const ret = swapScreen(g, [painted('atRetOff', 32, 32, paintDark), painted('atReturn', 256, 160, paintReturn)], 0.24, 0.15, 0.3 + 0.014 * Math.sin(-0.25), 1.08, 0.15 + 0.014 * Math.cos(-0.25), 0, -0.25);
    // A cable run along the floor and the 강사's tape mark.
    part(g, box(0.04, 0.012, 0.9), '#212121', -0.12, 0.006, 0.42, { outline: false });
    for (const r of [0.6, -0.6]) part(g, box(0.18, 0.004, 0.03), ORANGE, 0, 0.003, AT.REC_AT.z, { ry: r, outline: false });

    const use = group(g);
    out.inUse = use;
    const say = bubbles(use, ['오늘은 미분 마무리!', '세 가지만 기억하세요', '칠판 보시면…', '이건 꼭 나옵니다!', '다음 시간에 만나요~'], 0.28, 2.1, AT.REC_AT.z);

    const mark = marker(g, 0, 1.0, 0);
    const rec = spotAt(g, AT.REC_AT, 'stand', 'atRecord', mark);
    const spots: Record<string, Spot> = { recordLecture: rec, '*': rec };
    out.spots = spots;
    out.work = marker(g, 0, top + 0.1, 0.3);
    out.animate = (t) => {
      const ph = phaseOf(mark);
      const b = AT.recBeat(t, ph);
      rec.at.rotation.y = AT.recYaw(b);
      recOn.visible = Math.floor(t * 1.6) % 2 === 0;
      for (const f of faces) f.visible = true;
      scriptMat.opacity = 0.95;
      scriptTex.offset.y = 0.75 - (AT.recLine(b) / 5) * 0.75 * 0.33;
      ret.show(1);
      const keys = ['talk', 'count', 'back', 'lean', 'wave'] as const;
      const i = keys.indexOf(b.from);
      say(b.e === 0 && b.p > 0.1 && b.p < 0.85 ? i + 1 : 0);
    };
    whenIdle(out, g, () => {
      rec.at.rotation.y = AT.REC_AT.yaw;
      recOn.visible = false;
      for (const f of faces) f.visible = false;
      scriptMat.opacity = 0.25;
      ret.show(0);
    });
  },

  // ===========================================================================================
  /**
   * The lecture room's long whiteboard (2 × 1, on the front wall): the same aluminium frame as the
   * 교탁's, the marker tray; on it today's 진도 (the cubic with its tangent, the rule boxed in red)
   * or the 숙제 and 공지 with the D-day boxed in the corner; a banner over it.
   */
  atLectureBoard(g, W, _D, _c, _def, ctx, _out) {
    const n = boardCount++;
    whiteboard(g, W, ctx.againstWall);
    const left = n % 2 === 0;
    picture(g, painted(left ? 'atBoardL' : 'atBoardR', 1024, 640, left ? paintBoardLeft : paintBoardRight), W - 0.12, 1.12, 0, BOARD.y, BOARD.z + 0.024);
    // A notice held by magnets on the right-hand board.
    if (!left) {
      for (const [dx, col] of [[-0.06, '#e53935'], [0.06, '#1e88e5']] as Array<[number, string]>) part(g, cyl(0.016, 0.016, 0.012, 12), col, 0.7 + dx, BOARD.y + 0.42, BOARD.z + 0.034, { rx: Math.PI / 2 });
    }
    if (ctx.againstWall) banner(g, left ? '2027 수능 · 수학 1등급반' : `${ACADEMY} · 실력이 답이다`, Math.min(1.9, W - 0.06), BOARD.y + BOARD.h / 2 + 0.16, BOARD.z + 0.01);
  },

  // ===========================================================================================
  /**
   * A two-seat lecture desk (2 × 1, the front row): a long white laminate top with a grey edge on
   * steel T-legs, a modesty panel and a bag shelf under; at each seat a 문제집 open, a pencil case,
   * a highlighter and a mechanical pencil, now and then a bottle of water — the pupils who come in
   * sit at it on the chairs behind.
   */
  atLectureDesk(g, W, _D, _c, _def, _ctx, _out) {
    const n = deskCount++;
    lectureDesk(g, W, 0.2, n);
  },

  // ===========================================================================================
  /**
   * The back rows (2 × 2): the same two-seat desk at the back, its classroom chairs in front, a
   * pupil in each taking notes — pens moving, looking up at the board now and then, one with their
   * chin in their hand, one nodding off — a bag on the floor, a 롱패딩 over a chair back.
   */
  atClassRow(g, W, _D, _c, _def, _ctx, _out) {
    const n = rowCount++;
    const dz = -0.55;
    lectureDesk(g, W, dz, n + 7);
    const seat = 0.45;
    // Pulled up: a body sits upright and has only its arms to reach the page with.
    const chairZ = -0.06;
    const figs: Array<{ f: Fig; x: number; mode: number; seed: number }> = [];
    for (const [i, x] of [-W / 4, W / 4].entries()) {
      classChair(g, x, chairZ + 0.06, Math.PI, seat);
      const look = PUPILS[(n * 2 + i + 1) % PUPILS.length];
      // 0 writing, 1 chin in hand, 2 asleep on the desk (the third row's left pupil only: drawn, a body can't lie forward).
      const mode = n === 1 && i === 0 ? 2 : (n + i) % 3 === 2 ? 1 : 0;
      const sat = seated(g, look, x, chairZ, Math.PI, seat, 0.18);
      const f = mode === 2 ? sat : pupilBody(sat, look, seat + 0.018);
      figs.push({ f, x, mode, seed: n * 2 + i });
      if ((n + i) % 3 === 0) {
        // A bag on the floor by the chair.
        part(g, rbox(0.26, 0.3, 0.14, 0.05), ['#37474f', '#8d6e63', '#5c6bc0'][(n + i) % 3], x + 0.32, 0.15, chairZ + 0.1, { ry: 0.3 });
      }
      if (look.padding) part(g, rbox(0.42, 0.5, 0.08, 0.04), '#212121', x, seat + 0.18, chairZ + 0.29, { rx: 0.1 });
    }
    const deskTop = 0.72;
    const front = dz + 0.25;
    const pose = (t: number) => {
      for (const { f, x, mode, seed } of figs) {
        const s = seed * 1.7;
        if (mode === 2) {
          // Asleep, head down on the folded arms.
          f.upper.rotation.x = 0.62;
          f.head.rotation.set(0.5, 0.3, 0);
          f.armL(v3(x - 0.12, deskTop + 0.05, front - 0.12));
          f.armR(v3(x + 0.12, deskTop + 0.05, front - 0.12));
          f.eyes(true);
          continue;
        }
        const up = Math.sin(t * 0.21 + s) > 0.6 ? 1 : 0;
        f.upper.rotation.x = mix(0.2, 0.06, up);
        f.eyes(blinkOf(t, seed));
        if (mode === 1) {
          f.head.rotation.set(0.1, 0.15, -0.12);
          // At the chin: leaning on the desk when drawn; a body sits upright, its eyes known once it's posed (the head's place then).
          const e = f.head.position;
          f.armR(e.y > 0.85 ? v3(x + 0.05, e.y - 0.17, chairZ - e.z - 0.12) : v3(x + 0.06, deskTop + 0.24, front - 0.08));
          f.armL(v3(x - 0.12, deskTop + 0.03, front - 0.12));
        } else {
          f.head.rotation.set(mix(0.45, -0.12, up), 0.05 * Math.sin(t * 0.3 + s), 0);
          const w = up ? 0 : 1;
          f.armR(v3(x + 0.06 - 0.06 * w * ((t * 0.6 + s) % 1), deskTop + 0.03 + 0.008 * w * Math.abs(Math.sin(t * 9 + s)), front - 0.14));
          f.armL(v3(x - 0.12, deskTop + 0.03, front - 0.1));
        }
      }
    };
    pose(0);
    ambient(g, pose);
  },

  // ===========================================================================================
  /**
   * A 자습실 carrel (1 × 1): a 독서실 desk boxed in by tall felt partitions with oak edges, a shelf
   * of 문제집 over it and the LED strip under the shelf lit warm, sticky notes on the back (D-23
   * 화이팅!!); a pupil at it with their back to the room — writing, or asleep on their arms — a
   * 롱패딩 over the chair. Patrolled stood behind them: the hands behind the back, a tap on the
   * shoulder (they jolt up), a problem whispered through, a note on the clipboard.
   */
  atStudyCarrel(g, _W, _D, _c, _def, _ctx, out) {
    const n = carrelCount++;
    const C = AT.SC;
    const z = C.z;
    // The desk and the partitions.
    part(g, rbox(0.9, 0.03, 0.55, 0.008), BIRCH, 0, C.top - 0.015, z);
    for (const sx of [-1, 1]) {
      part(g, rbox(0.03, 1.28, 0.64, 0.01), FELT, sx * 0.465, 0.64, z + 0.04);
      part(g, box(0.035, 1.28, 0.02), '#a1887f', sx * 0.465, 0.64, z + 0.36, { outline: false });
      part(g, box(0.035, 0.02, 0.64), '#a1887f', sx * 0.465, 1.28, z + 0.04, { outline: false });
    }
    part(g, rbox(0.93, 1.28, 0.03, 0.01), FELT, 0, 0.64, -0.475);
    part(g, rbox(0.86, 0.3, 0.02, 0.006), shade(FELT, 0.9), 0, 0.5, z - 0.1);
    picture(g, painted(`atNotes${n % 4}`, 256, 128, paintCarrelNotes(n)), 0.5, 0.25, -0.12, C.top + 0.17, -0.458);
    // The shelf and its books, the LED strip under it.
    part(g, rbox(0.88, 0.02, 0.2, 0.006), BIRCH, 0, C.top + 0.46, -0.37);
    const r = seeded(n * 17 + 5);
    for (let i = 0; i < 9; i++) book(g, -0.38 + i * 0.06, C.top + 0.47, -0.37, 0.045, 0.16 + r() * 0.07, 0.15, ['#1565c0', '#ef6c00', '#2e7d32', '#6a1b9a', '#c62828', '#00838f', '#f9a825', '#5d4037'][Math.floor(r() * 8)]);
    glowing(g, box(0.7, 0.012, 0.02), '#fff3c4', 0, C.top + 0.444, -0.3);
    // On the desk: the 문제집 open, a timer, a stack, earplugs' case.
    openBook(g, painted(`atWb${n % 5}`, 256, 180, paintWorkbook(n)), C.book[0], C.top, C.book[2], ['#1565c0', '#ef6c00', '#2e7d32'][n % 3], 0, 0.3, 0.21);
    for (let i = 0; i < 3; i++) book(g, -0.33, C.top + i * 0.02, -0.33, 0.21, 0.02, 0.28, ['#ffca28', '#42a5f5', '#ef5350'][i], 0.1);
    part(g, rbox(0.07, 0.05, 0.04, 0.012), '#fafafa', 0.32, C.top + 0.025, -0.3);
    glowing(g, box(0.05, 0.016, 0.003), '#ff5252', 0.32, C.top + 0.03, -0.279);
    // The chair.
    swivelChair(g, 0, C.chairZ + 0.08, Math.PI, '#5d4037', C.seat);
    const look = PUPILS[(n * 5 + 2) % PUPILS.length];
    const pupil = seated(g, look, 0, C.chairZ, Math.PI, C.seat, 0.2);
    if (look.padding || n % 3 === 1) part(g, rbox(0.42, 0.46, 0.08, 0.04), look.padding ? '#212121' : '#37474f', 0, C.seat + 0.34, C.chairZ + 0.32, { rx: 0.08 });
    const B = C.book;
    // 0 asleep, 1 just woken (sat bolt upright), 2 looking at the finger on the page, 3 writing.
    const posePupil = (state: number, t: number) => {
      pupil.eyes(state === 0 ? true : blinkOf(t, n));
      if (state === 0) {
        pupil.upper.rotation.x = 0.62;
        pupil.head.rotation.set(0.5, -0.3, 0);
        pupil.armL(v3(-0.12, C.top + 0.05, B[2] + 0.06));
        pupil.armR(v3(0.12, C.top + 0.05, B[2] + 0.06));
      } else if (state === 1) {
        pupil.upper.rotation.x = -0.02;
        pupil.head.rotation.set(-0.05, 0.25, 0);
        pupil.armL(v3(-0.16, C.top + 0.03, B[2] + 0.16));
        pupil.armR(v3(0.16, C.top + 0.03, B[2] + 0.16));
      } else {
        pupil.upper.rotation.x = 0.2;
        pupil.head.rotation.set(0.5, state === 2 ? 0.12 : 0.04 * Math.sin(t * 0.4 + n), 0);
        pupil.armL(v3(-0.12, C.top + 0.03, B[2] + 0.1));
        const w = state === 3 ? 1 : 0;
        pupil.armR(v3(0.04 + 0.08 * w * ((t * 0.5 + n * 0.3) % 1), C.top + 0.03 + 0.008 * w * Math.abs(Math.sin(t * 9 + n)), B[2] + 0.02));
      }
    };
    // Left alone: writing (one in four asleep).
    let supervised = -1e9;
    ambient(g, (t) => {
      if (performance.now() - supervised < 400) return;
      posePupil(n % 4 === 2 ? 0 : 3, t);
    });
    posePupil(3, 0);
    const use = group(g);
    out.inUse = use;
    const say = bubbles(use, ['앗! 안 잤어요…', '여기 부호 다시 봐'], 0.12, 1.55, 0.35, 0.8);
    const mark = marker(g, 0, 0.8, 0);
    const sup = spotAt(g, AT.SUP_AT, 'stand', 'atSupervise', mark);
    out.spots = { atSuperviseStudy: sup, '*': sup };
    out.work = marker(g, B[0], B[1], B[2]);
    out.animate = (t) => {
      supervised = performance.now();
      const b = AT.supBeat(t, phaseOf(mark));
      const state = AT.supPupil(b);
      posePupil(state, t);
      say(b.from === 'tap' && b.p > 0.6 ? 1 : AT.during(b, 'whisper', 0.15, 0.8) ? 2 : 0);
    };
  },

  // ===========================================================================================
  /**
   * The 인강 studio's backdrop (3 × 1, on a wall): an 86-inch 전자칠판 in a black bezel on its wall
   * mount, the lesson in glowing pen on it (미분 마무리, the cubic, a red box), the 학원's navy
   * backdrop panels either side (한빛 인강 · 수학 마스터 클래스), a light bar over it, a low
   * cabinet under it with a plant and the board's pens.
   */
  atStudioBoard(g, W, _D, _c, _def, _ctx, _out) {
    const z = -0.46;
    // The backdrop panels.
    for (const sx of [-1, 1]) {
      part(g, rbox(0.62, 2.1, 0.04, 0.01), NAVY_D, sx * (W / 2 - 0.33), 1.1, z);
      picture(g, painted(sx < 0 ? 'atSideL' : 'atSideR', 256, 512, sx < 0 ? paintStudioSide('한빛 인강', '수학 마스터 클래스') : paintStudioSide('2027 수능', '미적분 · 수학Ⅱ 완성')), 0.56, 1.12, sx * (W / 2 - 0.33), 1.3, z + 0.022);
    }
    part(g, rbox(W - 1.3, 2.1, 0.03, 0.01), '#cfd8dc', 0, 1.1, z - 0.01);
    // The 전자칠판 in its bezel, on the wall mount.
    const bw = Math.min(1.9, W - 1.3);
    part(g, rbox(bw + 0.08, 1.14, 0.07, 0.02), '#111111', 0, 1.45, z + 0.04);
    picture(g, painted('atStudioBoard', 1024, 576, paintStudioBoard), bw, 1.07, 0, 1.45, z + 0.077);
    glowing(g, box(0.02, 0.01, 0.004), '#29b6f6', bw / 2 - 0.05, 0.91, z + 0.077);
    part(g, rbox(0.4, 0.03, 0.06, 0.01), '#212121', 0, 0.86, z + 0.06);
    for (let i = 0; i < 3; i++) part(g, cyl(0.01, 0.01, 0.13, 8), ['#fafafa', '#29b6f6', '#ff5252'][i], -0.08 + i * 0.08, 0.885, z + 0.06, { rz: Math.PI / 2, outline: false });
    // The light bar over it.
    part(g, rbox(bw, 0.06, 0.12, 0.02), '#263238', 0, 2.2, z + 0.12);
    glowing(g, box(bw - 0.1, 0.012, 0.08), '#fffde7', 0, 2.17, z + 0.12);
    // The low cabinet, a plant on it, a mic in its stand.
    part(g, rbox(0.9, 0.5, 0.36, 0.02), '#eceff1', -0.95, 0.25, -0.3);
    part(g, box(0.88, 0.02, 0.37), ORANGE, -0.95, 0.4, -0.3, { outline: false });
    part(g, cyl(0.09, 0.07, 0.16, 12), '#fafafa', -1.25, 0.58, -0.3);
    for (let i = 0; i < 6; i++) part(g, ball(0.06), '#43a047', -1.25 + Math.cos(i) * 0.06, 0.72 + (i % 3) * 0.05, -0.3 + Math.sin(i) * 0.06, { outline: false });
    part(g, rbox(0.9, 0.5, 0.36, 0.02), '#eceff1', 0.95, 0.25, -0.3);
    part(g, box(0.88, 0.02, 0.37), ORANGE, 0.95, 0.4, -0.3, { outline: false });
    for (let i = 0; i < 4; i++) book(g, 0.75 + i * 0.07, 0.5, -0.32, 0.05, 0.22, 0.17, ['#1565c0', '#ef6c00', '#2e7d32', '#c62828'][i]);
  },

  // ===========================================================================================
  /**
   * The D-day 성적 게시판 (2 × 1, on a wall): a navy-framed board — 2027학년도 수능 and the D-day
   * panel with its flip card, 명예의 전당 along the bottom (last year's 합격), the 10월 모의고사
   * 성적 우수자 and the class averages pinned at the right. A new sheet's pinned up at its four
   * corners, then the D-day card flipped over to the next day.
   */
  atDdayBoard(g, W, _D, _c, _def, _ctx, out) {
    const n = ddayCount++;
    const z = AT.DB.z;
    part(g, rbox(W - 0.04, 1.16, 0.04, 0.01), NAVY, 0, 1.4, z - 0.02);
    picture(g, painted('atDdayBoard', 1024, 576, paintDdayBoard), W - 0.12, 1.06, 0, 1.4, z + 0.002);
    picture(g, painted('atRanking', 256, 320, paintRanking), 0.24, 0.3, 0.12, 1.5, z + 0.004);
    picture(g, painted('atChartSheet', 256, 320, paintChartSheet), 0.24, 0.3, 0.68, 1.5, z + 0.004);
    for (const [x, y] of [[0.02, 1.64], [0.22, 1.64], [0.58, 1.64], [0.78, 1.64]]) part(g, ball(0.012), RED_INK, x, y, z + 0.012, { outline: false });
    // The flip card on the D-day panel.
    const C = AT.DB.card;
    part(g, rbox(0.2, 0.15, 0.03, 0.008), '#111111', C[0], C[1], C[2] - 0.012);
    const nums = new Map<number, THREE.Texture>();
    const numTex = (k: number) => {
      let t = nums.get(k);
      if (!t) nums.set(k, (t = painted(`atDday${k}`, 192, 128, paintDday(k))));
      return t;
    };
    const cardMat = new THREE.MeshBasicMaterial({ map: numTex(23) });
    const card = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.12), cardMat);
    card.userData.ownGeometry = card.userData.ownMaterial = true;
    card.position.set(C[0], C[1], C[2] + 0.005);
    g.add(card);
    let cardNum = 23;
    const showNum = (k: number) => {
      if (k === cardNum) return;
      cardNum = k;
      cardMat.map = numTex(k);
      cardMat.needsUpdate = true;
    };
    // In use: the new sheet (in the hand, held up, pinned), its pins.
    const use = group(g);
    out.inUse = use;
    const sheet = group(use);
    part(sheet, box(0.21, 0.3, 0.003), '#ffffff', 0, 0, 0, { outline: false });
    picture(sheet, painted('atNewSheet', 192, 272, paintNewSheet), 0.2, 0.28, 0, 0, 0.003);
    const pins = [[-0.1, 0.14], [0.1, 0.14], [0.1, -0.14], [-0.1, -0.14]].map(([x, y]) => part(sheet, ball(0.012), ['#e53935', '#1e88e5', '#fdd835', '#43a047'][Math.abs(Math.round(x * 10 + y * 10)) % 4], x, y, 0.01, { outline: false }));
    const mark = marker(g, 0, 1.0, 0);
    const post = spotAt(g, AT.POST_AT, 'stand', 'atPost', mark);
    out.spots = { atPostScores: post, '*': post };
    out.work = marker(g, AT.DB.sheet[0], AT.DB.sheet[1], AT.DB.sheet[2]);
    out.animate = (t) => {
      const ph = phaseOf(mark);
      const b = AT.postBeat(t, ph);
      const where = AT.postSheet(b);
      const key = AT.atKeyOf('atPost', t, ph).key;
      if (where === 'up') {
        sheet.position.set(...AT.DB.sheet);
        sheet.rotation.set(0, 0, 0);
      } else if (where === 'held') {
        const mid = AT.mixP(key.l, key.r, 0.5);
        sheet.position.set(mid[0], mid[1] - 0.1, mid[2] + 0.01);
        sheet.rotation.set(0, 0, 0);
      } else {
        sheet.position.set(key.l[0], key.l[1] + 0.02, key.l[2]);
        sheet.rotation.set(-1.2, 0, 0);
      }
      const pinned = b.from === 'pin' ? Math.floor(b.p * 4 + 0.3) : where === 'up' ? 4 : 0;
      pins.forEach((p, i) => (p.visible = i < pinned));
      // The card: squashed shut and opened again on the next day's number.
      const base = 23 - (((b.n % 20) + 20) % 20);
      const f = AT.postFlip(b);
      card.scale.y = Math.max(0.02, Math.abs(Math.cos(f * Math.PI)));
      showNum(f > 0.5 ? Math.max(1, base - 1) : Math.max(1, base));
    };
    whenIdle(out, g, () => {
      card.scale.y = 1;
      showNum(23 - (n % 3));
    });
  },

  // ===========================================================================================
  /**
   * The 입시 상담 table (2 × 2): a warm wood table on two pedestals, padded chairs for the parents on
   * the far side and the 강사's at the near; on it the 정시 배치표 turned to the parents with its
   * line boxed in red, the 성적 추이 graph climbing, the 강사's memo pad, the 겨울방학 특강 leaflet,
   * a tissue box, two paper cups of 녹차 and the 입시 상담 plate; the 대입 일정 on the wall behind.
   * In use the mother and father sit across: she asks (정시로 가능할까요?), a hand at her cheek;
   * he listens with his arms folded; both nod as it's explained, and she takes the leaflet.
   */
  atConsultTable(g, _W, _D, _c, _def, _ctx, out) {
    const T = AT.CT;
    // The table on its pedestals.
    part(g, rbox(T.w, 0.04, T.d, 0.015), WOOD, 0, T.top - 0.02, T.z);
    part(g, box(T.w - 0.02, 0.006, T.d - 0.02), shade(WOOD, 1.1), 0, T.top + 0.001, T.z, { outline: false });
    for (const sx of [-1, 1]) {
      part(g, rbox(0.08, T.top - 0.06, 0.08, 0.01), '#5d4037', sx * 0.45, (T.top - 0.06) / 2 + 0.02, T.z);
      part(g, rbox(0.12, 0.03, 0.56, 0.01), '#5d4037', sx * 0.45, 0.015, T.z);
    }
    // The chairs: the parents' two, the 강사's.
    const padded = (x: number, zz: number, ry: number, color: string) => {
      const c = group(g, x, 0, zz, ry);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(c, cyl(0.015, 0.015, 0.44, 8), '#5d4037', sx * 0.18, 0.22, sz * 0.17, { outline: false });
      part(c, rbox(0.44, 0.08, 0.42, 0.03), color, 0, 0.46, 0);
      part(c, rbox(0.44, 0.44, 0.07, 0.03), color, 0, 0.76, -0.2, { rx: -0.08 });
    };
    padded(T.mom.x, T.mom.z - 0.04, 0, '#8d6e63');
    padded(T.dad.x, T.dad.z - 0.04, 0, '#8d6e63');
    padded(0, AT.CONS_AT.z + 0.06, Math.PI, NAVY);
    // On the table.
    const C = T.chart;
    flat(g, painted('atPlacement', 384, 272, paintPlacement), 0.4, 0.28, C[0], T.top + 0.006, C[2], Math.PI);
    part(g, box(0.41, 0.003, 0.29), '#ffffff', C[0], T.top + 0.003, C[2], { outline: false });
    const G = T.grades;
    part(g, box(0.25, 0.003, 0.19), '#ffffff', G[0], T.top + 0.003, G[2], { ry: 0.15, outline: false });
    flat(g, painted('atTrend', 256, 192, paintTrend), 0.24, 0.18, G[0], T.top + 0.006, G[2], 0.15);
    const M = T.memo;
    part(g, box(0.16, 0.01, 0.2), '#f9a825', M[0], T.top + 0.005, M[2], { outline: false });
    flat(g, painted('atMemo', 160, 200, paintMemo), 0.15, 0.19, M[0], T.top + 0.011, M[2]);
    part(g, cyl(0.005, 0.005, 0.14, 6), BLUE_INK, M[0] + 0.12, T.top + 0.008, M[2] + 0.02, { rz: Math.PI / 2, ry: 0.4, outline: false });
    part(g, rbox(0.22, 0.09, 0.12, 0.02), '#e1f5fe', -0.5, T.top + 0.045, T.z - 0.2);
    part(g, box(0.1, 0.03, 0.02), '#ffffff', -0.5, T.top + 0.1, T.z - 0.2, { outline: false });
    for (const x of [T.mom.x + 0.1, T.dad.x - 0.1]) {
      part(g, cyl(0.03, 0.025, 0.085, 12), '#fafafa', x, T.top + 0.043, T.z - 0.3);
      part(g, cyl(0.026, 0.026, 0.004, 12), '#9ccc65', x, T.top + 0.08, T.z - 0.3, { outline: false });
    }
    // The plate, facing the room.
    const plate = group(g, -0.5, T.top, T.z + 0.22, 0);
    part(plate, box(0.2, 0.07, 0.015), '#37474f', 0, 0.035, 0, { rx: -0.3 });
    label(plate, '입시 상담', 0.18, 0.05, 0, 0.037, 0.01, NAVY, '#ffffff').rotation.x = -0.3;
    // The 대입 일정 on the wall behind the parents.
    picture(g, painted('atSchedule', 384, 256, paintSchedule), 0.66, 0.44, 0, 1.55, -0.98);
    part(g, rbox(0.7, 0.48, 0.02, 0.006), NAVY, 0, 1.55, -0.995);

    // In use: the parents, the leaflet.
    const use = group(g);
    out.inUse = use;
    const mom = bodied(seated(use, LOOKS.mom, T.mom.x, T.mom.z, 0, T.seat, 0.08), { gender: 'female', seat: T.seat + 0.04 });
    const dad = bodied(seated(use, LOOKS.dad, T.dad.x, T.dad.z, 0, T.seat, 0.02), { gender: 'male', seat: T.seat + 0.04 });
    const leaflet = group(use);
    part(leaflet, box(0.15, 0.004, 0.21), '#ffffff', 0, 0, 0, { outline: false });
    flat(leaflet, painted('atLeaflet', 160, 220, paintLeaflet), 0.15, 0.21, 0, 0.004, 0, Math.PI);
    const say = bubbles(use, ['정시로 인서울 가능할까요?', '수학 한 등급만 올리면 충분해요'], 0, 1.78, -0.2);
    const mark = marker(g, 0, 0.8, 0);
    const cons = spotAt(g, AT.CONS_AT, 'sit', 'atConsult', mark);
    out.spots = { atAdmissionConsult: cons, '*': cons };
    out.work = marker(g, C[0], C[1], C[2]);
    out.animate = (t) => {
      const ph = phaseOf(mark);
      const b = AT.consBeat(t, ph);
      const who = AT.consSays(b);
      say(who);
      const key = AT.atKeyOf('atConsult', t, ph).key;
      // Where the leaflet is.
      const lw = AT.consLeaflet(b);
      if (lw === 'desk') leaflet.position.set(M[0] - 0.02, T.top + 0.02, M[2] - 0.18);
      else if (lw === 'tutor') leaflet.position.set(key.r[0], key.r[1] - 0.01, key.r[2]);
      else leaflet.position.set(T.mom.x + 0.1, T.top + 0.09, T.mom.z + 0.36);
      leaflet.rotation.set(lw === 'mom' ? 0.6 : 0, 0, 0);
      // The mother: talks when she asks, a hand at her cheek while she listens, nods when it's explained, takes the leaflet.
      const worried = AT.amountOf(b, 'listen');
      chatter(mom, t, who === 1 ? 1 : 0, 1);
      mom.eyes(blinkOf(t, 2));
      const nod = b.from === 'explain' ? 0.12 * Math.max(0, Math.sin(t * 2.5)) : 0;
      mom.head.rotation.set(0.15 + nod, 0.05 * Math.sin(t * 0.6), worried * 0.12);
      mom.armL(v3(T.mom.x + 0.08, T.top + 0.04, T.mom.z + 0.36));
      if (lw === 'mom' || (b.from === 'hand' && b.p > 0.5)) mom.armR(v3(T.mom.x + 0.1, T.top + 0.1, T.mom.z + 0.38));
      else if (worried > 0.5) mom.armR(v3(T.mom.x - 0.08, 1.12, T.mom.z + 0.14));
      else mom.armR(v3(T.mom.x - 0.06, T.top + 0.04, T.mom.z + 0.34));
      // The father: arms folded, nodding as it's explained.
      dad.eyes(blinkOf(t, 3));
      dad.head.rotation.set(0.1 + (b.from === 'explain' || b.from === 'trace' ? 0.1 * Math.max(0, Math.sin(t * 2 + 1)) : 0), -0.08, 0);
      dad.armL(v3(T.dad.x - 0.1, 0.98, T.dad.z + 0.17));
      dad.armR(v3(T.dad.x + 0.1, 0.96, T.dad.z + 0.17));
    };
  },

  // ===========================================================================================
  /**
   * The 모의고사 copier (1 × 1): a big office copier — two paper drawers with their level windows,
   * the output bay on its left side with the tray, the document feeder on top, the touch panel at
   * the front right (copies counted up while it prints, the progress bar), the scan light running
   * under the lid, the finished pile and the long-reach stapler on top, a misprint box beside it.
   * In use a ream's loaded, the sheets pile out, and the stack's knocked even and stapled.
   */
  atExamPrinter(g, _W, _D, _c, _def, _ctx, out) {
    const P = AT.PR;
    const z = P.z;
    // The cabinet with its drawers, the body over it, the output bay.
    part(g, rbox(P.w, 0.6, P.d, 0.02), '#eceff1', 0, 0.32, z);
    part(g, rbox(P.w + 0.02, 0.04, P.d + 0.02, 0.01), '#90a4ae', 0, 0.02, z);
    const drawer = group(g, 0, 0, 0);
    part(drawer, rbox(P.w - 0.04, 0.24, 0.02, 0.01), '#e0e0e0', 0, P.drawer[1], z + P.d / 2 + 0.005);
    part(drawer, rbox(0.2, 0.025, 0.02, 0.008), '#78909c', 0, P.drawer[1] + 0.07, z + P.d / 2 + 0.02);
    part(drawer, box(P.w - 0.08, 0.04, P.d - 0.1), '#ffffff', 0, P.drawer[1] + 0.02, z + 0.02, { outline: false });
    part(g, rbox(P.w - 0.04, 0.2, 0.02, 0.01), '#e0e0e0', 0, 0.1 + 0.03, z + P.d / 2 + 0.005);
    part(g, rbox(0.2, 0.025, 0.02, 0.008), '#78909c', 0, 0.2, z + P.d / 2 + 0.02);
    for (const y of [0.15, P.drawer[1]]) glowing(g, box(0.05, 0.03, 0.004), '#a5d6a7', 0.22, y, z + P.d / 2 + 0.018);
    part(g, rbox(P.w, 0.36, P.d, 0.02), '#f5f5f5', 0, 0.8, z);
    part(g, box(0.02, 0.2, P.d - 0.06), '#37474f', -P.w / 2 + 0.01, 0.82, z, { outline: false });
    part(g, box(P.w + 0.01, 0.012, P.d + 0.01), NAVY, 0, 0.64, z, { outline: false });
    // The output tray out the left side.
    const tray = group(g, P.out[0], P.out[1] - 0.02, P.out[2]);
    tray.rotation.z = 0.12;
    part(tray, rbox(0.22, 0.012, 0.3, 0.004), '#90a4ae', 0, 0, 0);
    // The feeder on top, the scan light under it.
    part(g, rbox(P.w - 0.02, 0.06, P.d - 0.06, 0.015), '#e0e0e0', 0, P.top + 0.01, z - 0.02);
    part(g, rbox(0.3, 0.03, 0.22, 0.01), '#cfd8dc', -0.1, P.top + 0.055, z - 0.04);
    const scan = new THREE.Mesh(box(P.w - 0.08, 0.008, 0.02), litMat('#b2ff59'));
    scan.position.set(0, P.top - 0.022, z);
    // The touch panel.
    const panel = group(g, P.panel[0], P.panel[1], P.panel[2]);
    panel.rotation.x = -0.6;
    part(panel, rbox(0.22, 0.03, 0.14, 0.01), '#37474f', 0, 0, 0);
    const counts = [0, 24, 48, 72, 96, 120];
    const screen = swapScreen(panel, [...counts.map((k) => painted(`atCopier${k}`, 192, 112, paintCopier(k, k > 0 && k < 120))), painted('atCopierIdle', 192, 112, paintCopier(0, false))], 0.17, 0.1, 0, 0.016, 0, -Math.PI / 2);
    screen.show(6);
    for (let i = 0; i < 3; i++) glowing(panel, cyl(0.01, 0.01, 0.006, 10), ['#4caf50', '#ffb300', '#e53935'][i], -0.09 + i * 0.03, 0.017, 0.058);
    // The finished pile and the stapler on top.
    const pile = group(g, P.pile[0], P.top + 0.04, P.pile[2]);
    const pileSets = Array.from({ length: 5 }, (_, i) => {
      const s = group(pile, 0, i * 0.03, 0, (i % 2 ? 1 : -1) * 0.06);
      part(s, box(0.21, 0.028, 0.29), '#fafafa', 0, 0.014, 0, { outline: false });
      flat(s, painted('atExamCover', 192, 272, paintExamCover), 0.2, 0.28, 0, 0.029, 0);
      return s;
    });
    const stp = group(g, P.stapler[0], P.top + 0.04, P.stapler[2]);
    part(stp, rbox(0.06, 0.03, 0.3, 0.01), '#37474f', 0, 0.015, 0);
    const arm = group(stp, 0, 0.035, -0.12);
    part(arm, rbox(0.05, 0.03, 0.28, 0.01), '#e53935', 0, 0.015, 0.12);
    // The misprint box.
    part(g, rbox(0.22, 0.2, 0.18, 0.01), '#1e88e5', 0.38, 0.1, 0.3);
    for (let i = 0; i < 4; i++) part(g, ball(0.035), '#fafafa', 0.32 + (i % 2) * 0.1, 0.2 + Math.floor(i / 2) * 0.02, 0.26 + (i % 3) * 0.04, { outline: false });
    label(g, '이면지', 0.14, 0.04, 0.38, 0.12, 0.392, '#1e88e5', '#ffffff');

    // In use: the scan light, the ream, the printed stack.
    const use = group(g);
    out.inUse = use;
    use.add(scan);
    const ream = group(use);
    part(ream, box(0.21, 0.05, 0.3), '#fafafa', 0, 0, 0);
    part(ream, box(0.215, 0.052, 0.08), '#1565c0', 0, 0, 0, { outline: false });
    label(ream, 'A4 80g', 0.08, 0.03, 0, 0.0, 0.151, '#ffffff', '#1565c0');
    const stack = group(use);
    const stackBody = part(stack, box(0.21, 1, 0.29), '#fafafa', 0, 0.5, 0, { outline: false });
    const cover = flat(stack, painted('atExamCover', 192, 272, paintExamCover), 0.2, 0.28, 0, 1.001, 0);
    const mark = marker(g, 0, 0.8, 0);
    const pr = spotAt(g, AT.PRINT_AT, 'stand', 'atPrint', mark);
    out.spots = { atPrintExams: pr, '*': pr };
    out.work = marker(g, P.panel[0], P.panel[1], P.panel[2]);
    const stackH = 0.05;
    const setStack = (x: number, y: number, zz: number, h: number, rz = 0) => {
      stack.position.set(x, y, zz);
      stack.rotation.set(0, 0, rz);
      stackBody.scale.y = Math.max(0.002, h);
      stackBody.position.y = h / 2;
      cover.position.y = h + 0.001;
    };
    out.animate = (t) => {
      const ph = phaseOf(mark);
      const b = AT.printBeat(t, ph);
      const key = AT.atKeyOf('atPrint', t, ph).key;
      drawer.position.z = AT.printDrawer(b);
      ream.visible = AT.printReam(b);
      if (ream.visible) {
        const mid = AT.mixP(key.l, key.r, 0.5);
        ream.position.set(mid[0], mid[1] - 0.02, mid[2]);
      }
      const o = AT.printOut(b);
      scan.visible = o.running;
      scan.position.z = z + 0.2 * Math.sin(t * 5);
      screen.show(o.running ? Math.min(5, 1 + Math.floor(o.k * 5)) : b.from === 'gather' || b.from === 'even' || b.from === 'staple' ? 5 : 6);
      const where = AT.printStack(b);
      stack.visible = where !== 'none' && !(where === 'tray' && o.k < 0.02);
      if (where === 'tray') setStack(P.out[0] + 0.01, P.out[1] - 0.006, P.out[2], stackH * Math.max(0.05, o.k), 0.12);
      else if (where === 'hands') {
        const mid = AT.mixP(key.l, key.r, 0.5);
        setStack(mid[0], mid[1] - 0.03, mid[2] - 0.02, stackH);
      } else if (where === 'pile') setStack(P.pile[0], P.top + 0.04 + 0.03 * 5, P.pile[2], stackH * 0.6);
      const done = ((b.n % 5) + 5) % 5;
      pileSets.forEach((s, i) => (s.visible = i < Math.max(1, done)));
      arm.rotation.x = 0.18 * (1 - AT.printClick(b));
    };
    whenIdle(out, g, () => {
      drawer.position.z = 0;
      screen.show(6);
      arm.rotation.x = 0.18;
      pileSets.forEach((s, i) => (s.visible = i < 2));
    });
  },

  // ===========================================================================================
  /**
   * The 교재 shelf in the lobby (2 × 1, against a wall): a tall oak shelf, its top two shelves
   * showing covers face out on ledges (수능특강, 수능완성, the 학원's own 기출 1000제 and 개념 노트,
   * 주간 모의고사) with price tags, the lower ones packed with spines; the 교재 판매 sign over it, a
   * rack of 학원 brochures at the side.
   */
  atWorkbookShelf(g, W, _D, _c, _def, _ctx, _out) {
    const z = -0.3;
    const d = 0.36;
    const h = 1.8;
    for (const sx of [-1, 1]) part(g, rbox(0.03, h, d, 0.008), WOOD, sx * (W / 2 - 0.05), h / 2, z);
    part(g, rbox(W - 0.08, h, 0.02, 0.006), shade(WOOD, 0.8), 0, h / 2, z - d / 2 + 0.01);
    const shelves = [0.06, 0.42, 0.78, 1.14, 1.5, 1.8];
    for (const y of shelves) part(g, rbox(W - 0.1, 0.025, d, 0.006), WOOD, 0, y, z);
    // The top two shelves: covers face out on a ledge, a price tag under each.
    const covers: Array<[string, string, string]> = [
      ['수능특강', '수학Ⅰ', '#1565c0'],
      ['수능완성', '수학Ⅱ', '#2e7d32'],
      ['기출 1000제', '한빛 자체', NAVY],
      ['개념 노트', '미적분', '#6a1b9a'],
      ['주간 모의고사', '수학 영역', '#c62828'],
      ['오답노트', '한빛', ORANGE],
    ];
    const per = 3;
    covers.forEach(([title, sub, bg], i) => {
      const y = i < per ? 1.5 : 1.14;
      const x = -W / 2 + 0.36 + (i % per) * ((W - 0.5) / (per - 1)) * 0.92;
      for (let k = 0; k < 3; k++) part(g, box(0.24, 0.32, 0.02), bg, x, y + 0.18, z - 0.06 + k * 0.022, { rx: -0.12, outline: false });
      const c = picture(g, painted(`atCover|${title}`, 128, 176, paintCover(title, sub, bg)), 0.23, 0.31, x, y + 0.185, z + 0.012);
      c.rotation.x = -0.12;
      part(g, box(0.26, 0.03, 0.015), shade(WOOD, 0.9), x, y + 0.03, z + 0.06, { outline: false });
      label(g, `${(9 + i * 3) * 1000}원`, 0.09, 0.03, x, y + 0.032, z + 0.069, '#fffde7', RED_INK);
    });
    // The lower shelves packed with spines.
    const r = seeded(29);
    for (const y of [0.06, 0.42, 0.78]) {
      let x = -W / 2 + 0.1;
      while (x < W / 2 - 0.14) {
        const w = 0.03 + r() * 0.03;
        const hh = 0.22 + r() * 0.1;
        book(g, x + w / 2, y + 0.0125, z + 0.02, w, hh, 0.24, ['#1565c0', '#ef6c00', '#2e7d32', '#6a1b9a', '#c62828', '#00838f', '#f9a825', '#eceff1', NAVY][Math.floor(r() * 9)]);
        x += w + 0.005;
      }
    }
    // The sign over it, the brochure rack at the side.
    picture(g, painted('atShelfSign', 512, 64, paintShelfSign), Math.min(1.6, W - 0.2), 0.2, 0, h + 0.2, z - 0.15);
    const rx = W / 2 - 0.02;
    part(g, rbox(0.03, 0.5, 0.2, 0.006), '#b0bec5', rx + 0.02, 1.0, z + 0.06);
    for (let i = 0; i < 3; i++) {
      part(g, box(0.008, 0.16, 0.12), [NAVY, ORANGE, '#2e7d32'][i], rx + 0.04, 0.84 + i * 0.16, z + 0.06, { outline: false });
    }
  },
  /**
   * The A-frame sign on the pavement by the door (2026-11-05, the layout audit): the 학원's name, 수학 · 국어 · 영어, 고1~고3 내신 ·
   * 수능, 자습실 운영, and the arrow up to the 자습실 on the 2층; navy with the orange stripe.
   */
  atStreetSign(g) {
    const tex = painted('atStreetSign', 192, 320, (c) => {
      c.fillStyle = NAVY;
      c.fillRect(0, 0, 192, 320);
      c.fillStyle = '#ffffff';
      c.fillRect(10, 10, 172, 300);
      c.fillStyle = ORANGE;
      c.fillRect(10, 100, 172, 8);
      text(c, '한빛', 96, 56, 40, NAVY, 'center');
      text(c, '입시학원', 96, 92, 30, NAVY, 'center');
      text(c, '수학 · 국어 · 영어', 96, 144, 20, NAVY_D, 'center', false);
      text(c, '고1~고3 내신 · 수능', 96, 174, 20, NAVY_D, 'center', false);
      text(c, '상담 환영', 96, 218, 24, ORANGE, 'center');
      text(c, '▲ 2층 자습실', 96, 282, 22, RED_INK, 'center');
    });
    for (const s of [-1, 1]) {
      const leaf = new THREE.Group();
      leaf.rotation.x = s * 0.16;
      g.add(leaf);
      part(leaf, rbox(0.5, 0.92, 0.03, 0.01), NAVY, 0, 0.5, s * 0.08);
      picture(leaf, tex, 0.44, 0.8, 0, 0.52, s * 0.08 + s * 0.02, '#ffffff', s > 0 ? 0 : Math.PI);
    }
  },
};

/** The two-seat desk (front row and back rows): its middle `dz` out from the tile's, its things for the pupils at its +z. */
function lectureDesk(g: THREE.Object3D, W: number, dz: number, seed: number): void {
  const w = W - 0.1;
  const d = 0.5;
  const h = 0.72;
  // The T-legs, the modesty panel, the bag shelf.
  for (const sx of [-1, 1]) {
    const x = sx * (w / 2 - 0.08);
    part(g, rbox(0.04, h - 0.03, 0.04, 0.01), '#78909c', x, (h - 0.03) / 2, dz - 0.05);
    part(g, rbox(0.05, 0.03, d - 0.06, 0.01), '#78909c', x, 0.015, dz);
  }
  part(g, rbox(w - 0.2, 0.3, 0.015, 0.006), '#b0bec5', 0, h - 0.2, dz - d / 2 + 0.03);
  part(g, rbox(w - 0.24, 0.015, d - 0.14, 0.006), '#90a4ae', 0, h - 0.16, dz);
  // The top with its grey edge.
  part(g, rbox(w, 0.03, d, 0.008), '#5f6b74', 0, h - 0.015, dz);
  part(g, box(w - 0.02, 0.006, d - 0.02), LAMI, 0, h + 0.001, dz, { outline: false });
  // At each seat: the 문제집, a pupil's things.
  const r = seeded(seed * 13 + 1);
  for (const [i, x] of [-W / 4, W / 4].entries()) {
    openBook(g, painted(`atWb${(seed + i) % 5}`, 256, 180, paintWorkbook(seed + i)), x + 0.02, h, dz + 0.08, ['#1565c0', '#ef6c00', '#2e7d32', '#c62828'][(seed + i) % 4], (r() - 0.5) * 0.15, 0.3, 0.21);
    pupilThings(g, x, h, dz, r);
    if (r() < 0.5) for (let k = 0; k < 2; k++) book(g, x - 0.32, h + k * 0.022, dz - 0.15, 0.2, 0.022, 0.27, ['#ffca28', '#42a5f5', '#ef5350', '#9575cd'][Math.floor(r() * 4)], 0.1);
  }
  // A small seat-number sticker at each seat's edge.
  for (const [i, x] of [-W / 4, W / 4].entries()) {
    const l = label(g, `${seed % 9 + 1}-${i + 1}`, 0.06, 0.025, x - 0.2, h + 0.004, dz + d / 2 - 0.03, '#fffde7', NAVY);
    l.rotation.x = -Math.PI / 2;
  }
}
