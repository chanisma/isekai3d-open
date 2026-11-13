import * as THREE from 'three';
import type { Motion } from '../activity';
import { marker, spot, type Builder, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, glass, glowing, label, litScreen, painted, picture, seeded, text, type Paint } from './doctor';
import * as OP from './opticianMotion';
import { glassWall, neighbourShop, shopFront } from './shopFront';

/**
 * The 안경원 drawn as itself (2026-10-27 workplace pipeline, at the user's request): white, pale wood
 * and navy, lit shelves of frames. The 검안 unit — the refraction chair, the phoropter hung from its
 * column in front of the customer's eyes (dials, apertures, the forehead rest), the controller on its
 * stand and the LCD chart on the wall that lights a line, then the red-green; the lens edger on its
 * cabinet with the lid over the chamber (the lens clamped between the shafts, the wheel, the spray),
 * the touch screen and the blocker with its lit centring stage and the job tray; the frame wall, a
 * lit glass cabinet of sunglasses under four rails of frames, each one drawn; the fitting table with
 * the frame warmer, the pliers stand, the fitting mat and the mirror turned to the customer across
 * it. And what the shop was missing (workFurniture/optician.ts): the autorefractor on its lift
 * table, the lensometer, the contact-lens counter, the try-on mirror, the ultrasonic cleaner and the
 * lens price board with its cut-away lenses.
 *
 * The shop (맑은눈안경), its lens brands and everyone in it are made up. The optician's hands and
 * what's on the pieces go by one clock (opticianMotion.ts): the dial clicks as it's turned, the lens
 * is in the hand when the hand's at the tray, the glasses land on the nose as they're set there.
 * Moving parts are drawn twice — at rest in `idle` and moving in `inUse` — so nothing's left
 * half-open when the work stops.
 */

const SHOP = '맑은눈안경';
const NAVY = '#1f3a68';
const NAVY_D = '#152847';
const PALE = '#f4f1ea';
const WHITE = '#fafafa';
const OAK = '#d8b98c';
const OAK_D = '#a9845a';
const SKIN = '#ecc6a3';
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const vp = (p: OP.P, dy = 0) => new THREE.Vector3(p[0], p[1] + dy, p[2]);
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
function spotAt(g: THREE.Object3D, s: OP.SpotAt, how: 'sit' | 'stand', motion: Motion, work: THREE.Object3D): Spot {
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
const nowMotion = (spots: Record<string, Spot>, t: number, fallback: OP.OpMotion) => {
  const k = nowAt(spots, t);
  return ((k ? spots[k].motion : fallback) ?? fallback) as OP.OpMotion;
};
const tmp = new THREE.Vector3();
const phaseOf = (m: THREE.Object3D) => OP.opPhase(m.getWorldPosition(tmp));
/** A cylinder stretched between two points each frame (an arm, a leg, a stick). */
function limb(g: THREE.Object3D, r: number, color: string, material?: THREE.Material): (a: THREE.Vector3, b: THREE.Vector3) => void {
  const m = part(g, cyl(r, r * 0.9, 1, 8), color, 0, 0, 0, { outline: false, ...(material ? { material } : {}) });
  const d = new THREE.Vector3();
  return (a, b) => {
    d.subVectors(b, a);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.scale.set(1, Math.max(0.001, d.length()), 1);
    m.quaternion.setFromUnitVectors(UP, d.normalize());
  };
}
/** A lit part with a material of its own (dimmed, recoloured, swapped). */
function ownGlow(g: THREE.Object3D, geom: THREE.BufferGeometry, color: string, x: number, y: number, z: number, opacity = 1): THREE.Mesh {
  const m = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }));
  m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
/** A face whose picture changes (a screen, the chart): swap `show(i)`. */
function swapScreen(g: THREE.Object3D, texes: THREE.Texture[], w: number, h: number, x: number, y: number, z: number, rx = 0): { mesh: THREE.Mesh; show: (i: number) => void } {
  const mat = new THREE.MeshBasicMaterial({ map: texes[0] });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.userData.ownGeometry = mesh.userData.ownMaterial = true;
  mesh.position.set(x, y, z);
  mesh.rotation.x = rx;
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
/**
 * Put back at rest whenever the piece isn't in use: an invisible speck in `idle` (shown only then)
 * calls `reset` as it's drawn, so a lid isn't left up or a chart left lit when the work stops.
 */
function whenIdle(out: { idle?: THREE.Object3D; root: THREE.Group }, g: THREE.Object3D, reset: () => void): void {
  if (!out.idle) out.idle = group(g);
  const speck = new THREE.Mesh(box(0.001, 0.001, 0.001), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  speck.userData.ownMaterial = true;
  speck.frustumCulled = false;
  speck.onBeforeRender = reset;
  out.idle.add(speck);
  reset();
}
const GLASS = new THREE.MeshToonMaterial({ color: '#e1f5fe', transparent: true, opacity: 0.35, depthWrite: false });
const SMOKY = new THREE.MeshToonMaterial({ color: '#90a4ae', transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide });
const WATER = new THREE.MeshBasicMaterial({ color: '#b3e5fc', transparent: true, opacity: 0.7, depthWrite: false });
const SPRAY = new THREE.MeshBasicMaterial({ color: '#e1f5fe', transparent: true, opacity: 0.75, depthWrite: false });
const BUBBLE = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, depthWrite: false });
const HEAT = new THREE.MeshBasicMaterial({ color: '#ff8a65', transparent: true, opacity: 0.18, depthWrite: false });
const MIRROR = new THREE.MeshBasicMaterial({ color: '#dfeaf0' });
const SOFT_LENS = new THREE.MeshBasicMaterial({ color: '#81d4fa', transparent: true, opacity: 0.75, depthWrite: false });

const shapes = new Map<string, THREE.BufferGeometry>();
function shape(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let s = shapes.get(key);
  if (!s) shapes.set(key, (s = make()));
  return s;
}
/** A glasses rim: round, square-ish or a wide oval. */
type Rim = 'round' | 'square' | 'oval';
const rimGeom = (k: Rim, r: number, t: number) => shape(`rim${k}${r}${t}`, () => (k === 'square' ? new THREE.TorusGeometry(r, t, 6, 4) : new THREE.TorusGeometry(r, t, 6, 22)));
const disc = (r: number) => shape(`disc${r}`, () => new THREE.CircleGeometry(r, 22));

/**
 * A pair of glasses facing +z at the bridge (the temples back along -z, or folded behind, or none
 * for a frame on the wall). About the size of a face.
 */
function specs(parent: THREE.Object3D, kind: Rim, color: string, temples: 'open' | 'folded' | 'none' = 'open', lens = true): THREE.Group {
  const g = group(parent);
  const r = 0.026;
  for (const sx of [-1, 1]) {
    const m = part(g, rimGeom(kind, r, 0.0032), color, sx * 0.042, 0, 0, { outline: false });
    if (kind === 'square') m.rotation.z = Math.PI / 4;
    if (kind === 'oval') m.scale.set(1.25, 0.85, 1);
    if (kind === 'square') m.scale.set(1.15, 0.85, 1);
    if (lens) {
      const l = glass(g, disc(r), sx * 0.042, 0, 0, GLASS);
      if (kind !== 'round') l.scale.set(1.15, 0.85, 1);
    }
  }
  part(g, box(0.024, 0.005, 0.005), color, 0, 0.008, 0, { outline: false });
  if (temples === 'open') for (const sx of [-1, 1]) part(g, box(0.005, 0.007, 0.13), color, sx * 0.076, 0.006, -0.065, { outline: false });
  if (temples === 'folded') for (const sx of [-1, 1]) part(g, box(0.07, 0.006, 0.005), color, sx * 0.03, 0.006, -0.012, { rz: sx * 0.05, outline: false });
  return g;
}

/** A bubble of words over someone (the optician's question), turned to the camera. */
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
  text(c, s, 256, 66, 40, '#263238', 'center');
};
function bubbles(parent: THREE.Object3D, says: string[], x: number, y: number, z: number): (i: number) => void {
  const sprites = says.map((s, i) => {
    const mat = new THREE.SpriteMaterial({ map: painted(`opBubble${i}|${s}`, 512, 160, paintBubble(s)), transparent: true, depthWrite: false });
    const sp = new THREE.Sprite(mat);
    sp.userData.ownMaterial = true;
    sp.scale.set(0.62, 0.194, 1);
    sp.position.set(x, y, z);
    sp.renderOrder = 5;
    sp.visible = false;
    parent.add(sp);
    return sp;
  });
  return (i) => sprites.forEach((s, j) => (s.visible = j === i - 1));
}

// ---------------------------------------------------------------------------------------------
// People drawn in: the customers (sat behind the phoropter, across the fitting table, stood at the
// mirror) and a junior at the edger.

interface Look {
  top: string;
  bottom: string;
  hair: string;
  hairdo: 'perm' | 'short' | 'bob' | 'long';
  skin?: string;
  shoes?: string;
  cardigan?: string;
  /** A staff vest with a name tag. */
  vest?: string;
}
const LOOKS = {
  young: { top: '#f8bbd0', bottom: '#5c6bc0', hair: '#3b2a20', hairdo: 'long', shoes: '#fafafa', skin: '#f1cfb0' } as Look,
  dad: { top: '#90a4ae', bottom: '#37474f', hair: '#222222', hairdo: 'short', shoes: '#3e2723' } as Look,
  granny: { top: '#efe6f6', bottom: '#6d5e7a', hair: '#bdb8b2', hairdo: 'perm', cardigan: '#9575cd', shoes: '#6d4c41' } as Look,
  student: { top: '#ffe082', bottom: '#455a64', hair: '#2b1b10', hairdo: 'bob', shoes: '#eceff1', skin: '#f1cfb0' } as Look,
  office: { top: '#e1f5fe', bottom: '#263238', hair: '#4e342e', hairdo: 'perm', shoes: '#212121', skin: '#e6bd96' } as Look,
  junior: { top: '#eceff1', bottom: '#263238', hair: '#1a1a1a', hairdo: 'short', vest: NAVY, shoes: '#212121' } as Look,
};

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
/** Someone drawn in, built stood with the feet at the origin facing +z (turn and move `root`). */
function figure(parent: THREE.Object3D, look: Look): Fig {
  const root = group(parent);
  const skin = look.skin ?? SKIN;
  const shoes = look.shoes ?? '#8d6e63';
  const sleeve = look.cardigan ?? look.top;
  const legs = [1, -1].map((sx) => ({ sx, thigh: limb(root, 0.062, look.bottom), shin: limb(root, 0.052, look.bottom), shoe: part(root, rbox(0.095, 0.07, 0.21, 0.03), shoes, 0, 0, 0) }));
  const pelvis = part(root, rbox(0.31, 0.16, 0.24, 0.06), look.bottom, 0, 0.85, 0);
  const upper = group(root, 0, 0.84, 0);
  part(upper, rbox(0.34, 0.46, 0.21, 0.08), look.top, 0, 0.27, 0);
  if (look.cardigan) {
    for (const sx of [-1, 1]) part(upper, rbox(0.13, 0.44, 0.226, 0.05), look.cardigan, sx * 0.11, 0.26, 0);
    for (let i = 0; i < 4; i++) part(upper, ball(0.011), '#f5f0e6', 0.05, 0.4 - i * 0.09, 0.114, { outline: false });
  }
  if (look.vest) {
    for (const sx of [-1, 1]) part(upper, rbox(0.12, 0.4, 0.226, 0.04), look.vest, sx * 0.11, 0.24, 0);
    part(upper, rbox(0.34, 0.22, 0.226, 0.05), look.vest, 0, 0.12, -0.002);
    label(upper, '안경사', 0.07, 0.025, 0.09, 0.36, 0.115, '#ffffff', NAVY);
  }
  part(upper, cyl(0.045, 0.05, 0.08, 10), skin, 0, 0.53, 0, { outline: false });
  const head = group(upper, 0, 0.67, 0);
  part(head, ball(0.112), skin, 0, 0, 0);
  const eyesM = [1, -1].map((sx) => part(head, box(0.022, 0.016, 0.006), '#2b2b30', sx * 0.04, 0.0, 0.106, { outline: false }));
  for (const sx of [-1, 1]) part(head, ball(0.018), '#f2a7a0', sx * 0.065, -0.03, 0.088, { outline: false }).scale.set(1, 0.6, 0.4);
  const mouthM = part(head, box(0.034, 0.01, 0.006), '#8d4f47', 0, -0.05, 0.104, { outline: false });
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
/** Glasses worn: a pair on the head, at the eyes. */
function worn(f: Fig, kind: Rim, color: string): THREE.Group {
  const g = specs(f.head, kind, color);
  g.position.set(0, 0.002, 0.112);
  return g;
}
/** Talks now and then (`k` how much). */
const chatter = (f: Fig, t: number, k: number, seed: number) => f.mouth(k * 0.5 * Math.max(0, Math.sin(t * 6.5 + seed)));
const blinkOf = (t: number, seed: number) => Math.sin(t * 1.3 + seed * 2.1) > 0.97;

// ---------------------------------------------------------------------------------------------
// What's painted: the chart, the screens, the signs.

const KOR_FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
/** The 시력표 on the LCD: rows of numbers and Landolt rings shrinking, the line being read lit. */
function paintChart(lit: number): Paint {
  return (c) => {
    c.fillStyle = '#fbfbf8';
    c.fillRect(0, 0, 320, 240);
    const rows: Array<{ s: string[]; size: number; v: string }> = [
      { s: ['3', 'C'], size: 54, v: '0.1' },
      { s: ['5', '7', 'C'], size: 36, v: '0.3' },
      { s: ['2', 'C', '9', '4'], size: 24, v: '0.6' },
      { s: ['8', '3', 'C', '6', '5'], size: 16, v: '0.8' },
      { s: ['4', 'C', '2', '7', '9', 'C'], size: 11, v: '1.0' },
    ];
    let y = 34;
    rows.forEach((r, i) => {
      const on = i === lit;
      if (lit >= 0 && on) {
        c.fillStyle = '#fff59d';
        c.fillRect(20, y - r.size * 0.62, 260, r.size * 1.24);
        c.strokeStyle = '#e53935';
        c.lineWidth = 3;
        c.strokeRect(20, y - r.size * 0.62, 260, r.size * 1.24);
      }
      const gap = 240 / r.s.length;
      r.s.forEach((ch, j) => {
        const x = 40 + gap * (j + 0.5);
        const col = lit >= 0 && !on ? '#9e9e9e' : '#111111';
        if (ch === 'C') {
          c.strokeStyle = col;
          c.lineWidth = r.size * 0.2;
          c.beginPath();
          const a = ((i + j) % 4) * (Math.PI / 2);
          c.arc(x, y, r.size * 0.36, a + 0.35, a + Math.PI * 2 - 0.35);
          c.stroke();
        } else text(c, ch, x, y + 2, r.size, col, 'center');
      });
      text(c, r.v, 304, y, 12, '#757575', 'right', false);
      y += r.size * 1.25 + 10;
    });
    text(c, '한국식 시력표', 12, 228, 11, '#9e9e9e', 'left', false);
  };
}
/** The red-green (적록 검사): the same rings on red and on green. */
const paintDuo: Paint = (c) => {
  c.fillStyle = '#d32f2f';
  c.fillRect(0, 0, 160, 240);
  c.fillStyle = '#2e7d32';
  c.fillRect(160, 0, 160, 240);
  for (const [cx, n] of [[80, 0], [240, 1]] as Array<[number, number]>) {
    for (let i = 0; i < 3; i++) {
      c.strokeStyle = '#111111';
      c.lineWidth = 7 - i * 2;
      c.beginPath();
      c.arc(cx, 60 + i * 62, 22 - i * 5, 0, Math.PI * 2);
      c.stroke();
    }
    text(c, n ? '2' : '1', cx, 222, 18, '#ffffff', 'center');
  }
};
const paintDark: Paint = (c) => {
  c.fillStyle = '#1c2530';
  c.fillRect(0, 0, 320, 240);
  text(c, SHOP, 160, 120, 22, '#455a64', 'center');
};
/** The edger's touch screen: the frame's shape traced, the lens, the job. */
const paintEdger: Paint = (c) => {
  c.fillStyle = '#0d2238';
  c.fillRect(0, 0, 256, 176);
  c.fillStyle = '#1565c0';
  c.fillRect(0, 0, 256, 24);
  text(c, '가공 · JOB 0427', 8, 13, 13, '#ffffff');
  text(c, 'R', 244, 13, 13, '#ffeb3b', 'right');
  c.strokeStyle = '#4fc3f7';
  c.lineWidth = 3;
  c.beginPath();
  c.ellipse(82, 92, 54, 40, 0, 0, Math.PI * 2);
  c.stroke();
  c.strokeStyle = '#ffffff';
  c.setLineDash([4, 4]);
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(20, 92);
  c.lineTo(144, 92);
  c.moveTo(82, 44);
  c.lineTo(82, 140);
  c.stroke();
  c.setLineDash([]);
  const rows = ['S -2.25', 'C -0.50  A180', 'PD 32.0', '1.60 블루', '베벨 자동'];
  rows.forEach((r, i) => text(c, r, 156, 44 + i * 20, 12, i < 2 ? '#e3f2fd' : '#90caf9', 'left', i < 2));
  c.fillStyle = '#263238';
  c.fillRect(10, 152, 236, 14);
};
/** The autorefractor's monitor: the eye in the ring, then the readings. */
function paintRef(stage: 0 | 1 | 2 | 3): Paint {
  return (c) => {
    c.fillStyle = '#05080c';
    c.fillRect(0, 0, 256, 192);
    if (stage === 0) {
      text(c, 'AUTO REF / KERATO', 128, 86, 15, '#4fc3f7', 'center');
      text(c, SHOP, 128, 112, 13, '#546e7a', 'center');
      return;
    }
    const g = c.createRadialGradient(118, 92, 4, 118, 92, 80);
    g.addColorStop(0, '#111');
    g.addColorStop(0.22, '#111');
    g.addColorStop(0.24, '#6d4c41');
    g.addColorStop(0.55, '#8d6e63');
    g.addColorStop(0.58, '#d7ccc8');
    g.addColorStop(1, '#3e2723');
    c.fillStyle = g;
    c.fillRect(30, 10, 180, 170);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 2;
    for (const r of [22, 38]) {
      c.beginPath();
      c.arc(118, 92, r, 0, Math.PI * 2);
      c.stroke();
    }
    c.strokeStyle = '#76ff03';
    c.beginPath();
    c.moveTo(118, 72);
    c.lineTo(118, 112);
    c.moveTo(98, 92);
    c.lineTo(138, 92);
    c.stroke();
    c.fillStyle = 'rgba(0,0,0,0.6)';
    c.fillRect(176, 8, 76, stage === 1 ? 26 : 70);
    text(c, stage === 3 ? 'L' : 'R', 182, 20, 13, '#ffeb3b');
    if (stage >= 2) {
      text(c, 'R S-2.25', 182, 20, 11, '#ffffff');
      text(c, '  C-0.50 A180', 182, 36, 10, '#cfd8dc', 'left', false);
    }
    if (stage === 3) {
      text(c, 'L S-2.00', 182, 54, 11, '#ffffff');
      text(c, '  C-0.25 A5', 182, 70, 10, '#cfd8dc', 'left', false);
    }
  };
}
/** The lensometer's screen: the target, then each lens's power. */
function paintLm(stage: 0 | 1 | 2): Paint {
  return (c) => {
    c.fillStyle = '#0b1a12';
    c.fillRect(0, 0, 192, 144);
    c.strokeStyle = '#69f0ae';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(60, 72, 34, 0, Math.PI * 2);
    c.moveTo(20, 72);
    c.lineTo(100, 72);
    c.moveTo(60, 32);
    c.lineTo(60, 112);
    c.stroke();
    if (stage > 0) {
      c.fillStyle = '#ffeb3b';
      c.beginPath();
      c.arc(stage === 1 ? 66 : 57, stage === 1 ? 68 : 75, 5, 0, Math.PI * 2);
      c.fill();
    }
    const R = stage >= 1;
    const L = stage >= 2;
    text(c, 'R', 112, 24, 13, '#ffeb3b');
    text(c, R ? 'S -2.25' : 'S ---', 112, 44, 12, '#e8f5e9');
    text(c, R ? 'C -0.75' : 'C ---', 112, 60, 11, '#a5d6a7', 'left', false);
    text(c, 'L', 112, 86, 13, '#ffeb3b');
    text(c, L ? 'S -2.00' : 'S ---', 112, 106, 12, '#e8f5e9');
    text(c, L ? 'C -0.50' : 'C ---', 112, 122, 11, '#a5d6a7', 'left', false);
  };
}
const paintHeader: Paint = (c) => {
  c.fillStyle = NAVY;
  c.fillRect(0, 0, 512, 64);
  text(c, SHOP, 24, 33, 30, '#ffffff');
  text(c, 'EYEWEAR · SINCE 2009', 488, 34, 16, '#c5cae9', 'right', false);
};
const paintSunSign: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 256, 48);
  text(c, '선글라스 20% SALE', 128, 25, 22, '#c62828', 'center');
};
const paintContactPoster: Paint = (c) => {
  const g = c.createLinearGradient(0, 0, 0, 320);
  g.addColorStop(0, '#e1f5fe');
  g.addColorStop(1, '#f8bbd0');
  c.fillStyle = g;
  c.fillRect(0, 0, 256, 320);
  // An eye with a coloured lens.
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.ellipse(128, 130, 92, 46, 0, 0, Math.PI * 2);
  c.fill();
  const iris = c.createRadialGradient(128, 130, 8, 128, 130, 40);
  iris.addColorStop(0, '#1b1b1b');
  iris.addColorStop(0.35, '#1b1b1b');
  iris.addColorStop(0.4, '#8d6e63');
  iris.addColorStop(1, '#4e342e');
  c.fillStyle = iris;
  c.beginPath();
  c.arc(128, 130, 40, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#3e2723';
  c.lineWidth = 4;
  c.beginPath();
  c.ellipse(128, 130, 92, 46, 0, Math.PI, Math.PI * 2);
  c.stroke();
  text(c, '원데이 컬러렌즈', 128, 214, 26, '#ad1457', 'center');
  text(c, '촉촉하게 하루 종일', 128, 248, 16, '#6a1b9a', 'center', false);
  text(c, '1+1 이벤트', 128, 288, 22, '#ffffff', 'center');
};
const paintContactSign: Paint = (c) => {
  c.fillStyle = '#0277bd';
  c.fillRect(0, 0, 512, 56);
  text(c, '콘택트렌즈 · CONTACT LENS', 256, 30, 26, '#ffffff', 'center');
};
const paintTrySign: Paint = (c) => {
  c.fillStyle = '#fffdf7';
  c.fillRect(0, 0, 256, 128);
  text(c, '편하게', 128, 40, 30, '#5d4037', 'center');
  text(c, '써 보세요 :)', 128, 86, 30, '#5d4037', 'center');
};
const paintCleanSign: Paint = (c) => {
  c.fillStyle = '#e3f2fd';
  c.fillRect(0, 0, 256, 128);
  text(c, '안경 무료 세척', 128, 44, 30, '#0d47a1', 'center');
  text(c, '언제든 들러 주세요', 128, 90, 20, '#1565c0', 'center', false);
};
function paintUc(on: boolean): Paint {
  return (c) => {
    c.fillStyle = '#10161c';
    c.fillRect(0, 0, 128, 48);
    text(c, on ? '03:00' : '00:00', 64, 26, 26, on ? '#ff5252' : '#5d4037', 'center');
  };
}
const paintBoard: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 640, 320);
  c.fillStyle = NAVY;
  c.fillRect(0, 0, 640, 56);
  text(c, '렌즈 가격표', 24, 30, 30, '#ffffff');
  text(c, '안경테 + 렌즈 맞춤 · 당일 완성', 616, 30, 16, '#c5cae9', 'right', false);
  const head = ['굴절률', '일반 코팅', '블루라이트', '변색 렌즈'];
  const rows = [
    ['1.56', '30,000', '50,000', '90,000'],
    ['1.60', '60,000', '80,000', '130,000'],
    ['1.67', '120,000', '150,000', '210,000'],
    ['1.74', '220,000', '260,000', '-'],
  ];
  const xs = [40, 200, 360, 520];
  c.fillStyle = '#e8eaf6';
  c.fillRect(16, 66, 608, 34);
  head.forEach((h, i) => text(c, h, xs[i] + 40, 84, 17, NAVY, 'center'));
  rows.forEach((r, j) => {
    const y = 122 + j * 34;
    if (j % 2) {
      c.fillStyle = '#f5f5f5';
      c.fillRect(16, y - 17, 608, 34);
    }
    r.forEach((v, i) => text(c, i ? (v === '-' ? '-' : v + '원') : v, xs[i] + 40, y, i ? 16 : 18, i ? '#37474f' : '#c62828', 'center', i === 0));
  });
  text(c, '비전라이트 · 클리어뷰 · 누리렌즈', 24, 268, 16, '#5c6bc0');
  text(c, '누진다초점 · 근용 · 운전용 상담 환영', 24, 296, 14, '#78909c', 'left', false);
  text(c, '굴절률이 높을수록 렌즈가 얇아요', 616, 296, 14, '#78909c', 'right', false);
};
const paintNearCard: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 128, 96);
  c.fillStyle = '#c62828';
  c.beginPath();
  c.arc(44, 48, 22, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#2e7d32';
  c.beginPath();
  c.arc(84, 48, 22, 0, Math.PI * 2);
  c.fill();
  c.font = `bold 16px ${KOR_FONT}`;
};
const paintTag = (s: string): Paint => (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 96, 32);
  text(c, s, 48, 17, 16, '#37474f', 'center');
};

// ---------------------------------------------------------------------------------------------
// The pieces.

let examCount = 0;
let fitCount = 0;
let edgerCount = 0;
let frameCount = 0;
const CUSTOMERS: Look[] = [LOOKS.young, LOOKS.dad, LOOKS.granny, LOOKS.student, LOOKS.office];
const FRAME_COLORS = ['#212121', '#6d4c41', '#8d6e63', '#b71c1c', '#1a237e', '#c9a43a', '#9e9e9e', '#4a148c', '#004d40', '#e0a96d'];

/** A stool with a round seat this high (and a back), turned `ry`. */
function stool(g: THREE.Object3D, x: number, z: number, seat: number, ry = 0, back = true, color = NAVY): void {
  const s = group(g, x, 0, z, ry);
  part(s, cyl(0.2, 0.22, 0.03, 5), '#37474f', 0, 0.03, 0, { outline: false });
  part(s, cyl(0.025, 0.025, seat - 0.06, 8), CHROME, 0, (seat - 0.06) / 2 + 0.03, 0, { outline: false });
  part(s, cyl(0.19, 0.19, 0.06, 20), color, 0, seat - 0.03, 0);
  if (back) {
    part(s, box(0.03, 0.3, 0.03), '#37474f', 0, seat + 0.1, -0.17);
    part(s, rbox(0.34, 0.16, 0.05, 0.03), color, 0, seat + 0.28, -0.18);
  }
}

/** 안경테 진열 테이블 (opFrameTable, 2 × 1): a low glass-topped table in the middle of the floor, frames and sunglasses laid in rows on its trays, a small mirror on a stand. */
function frameTable(g: THREE.Group, W: number, D: number) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.06, 0.78, 0.06), '#5d4037', sx * (W / 2 - 0.12), 0.39, sz * (D / 2 - 0.14), { outline: false });
  part(g, box(W - 0.14, 0.06, D - 0.2), '#efebe9', 0, 0.8, 0);
  for (let r = 0; r < 3; r++)
    for (let i = 0; i < 7; i++) {
      const x = -W / 2 + 0.3 + i * 0.24;
      const z = -0.24 + r * 0.24;
      const c = ['#212121', '#6d4c41', '#c0a062', '#90a4ae'][(i + r) % 4];
      part(g, box(0.15, 0.04, 0.012), c, x, 0.85, z, { outline: false });
      part(g, box(0.06, 0.035, 0.008), r === 2 ? '#37474f' : '#e3f2fd', x - 0.04, 0.85, z + 0.008, { outline: false });
      part(g, box(0.06, 0.035, 0.008), r === 2 ? '#37474f' : '#e3f2fd', x + 0.04, 0.85, z + 0.008, { outline: false });
    }
  part(g, cyl(0.02, 0.06, 0.3, 10), '#bdbdbd', W / 2 - 0.25, 0.98, 0.2, { outline: false });
  part(g, box(0.22, 0.28, 0.02), '#cfd8dc', W / 2 - 0.25, 1.24, 0.2, { outline: false });
}

export const BUILDERS: Record<string, Builder> = {
  // The street front, the edging room's glass, the frame table, the next unit (2026-11-05, the layout audit; shopFront.ts).
  opShopFront(g) {
    shopFront(g, { ax: 1, x0: 2, x1: 17, door: 12, name: SHOP, sub: '안경 · 콘택트렌즈 · 시력검사', bg: '#1a237e', fg: '#ffffff', frame: '#90a4ae', posters: [['다초점 상담', '#e3f2fd', '#1a237e', 7.5], ['선글라스', '#fffde7', '#37474f', 15.5]] });
  },
  opGlassWall(g, W, D) {
    glassWall(g, W, D, '#90a4ae');
  },
  opFrameTable(g, W, D) {
    frameTable(g, W, D);
  },
  opNeighbor(g, W, D) {
    neighbourShop(g, W, D, { name: '바로폰 휴대폰', color: '#c62828', wall: '#dfe6ea' });
  },
  // ===========================================================================================
  // The 검안 unit (2 × 1, against a wall).
  eyeTestChart(g, _W, _D, _c, _def, _ctx, out) {
    const n = examCount++;
    const C = OP.EX.chair;
    // A platform for the unit, its edge in navy.
    part(g, rbox(1.94, 0.03, 0.94, 0.01), '#e0e0e0', 0, 0.015, 0);
    part(g, box(1.94, 0.012, 0.01), NAVY, 0, 0.026, 0.465, { outline: false });
    // The LCD chart on the wall: the screen in a white frame, its remote's cradle under it.
    const [cx, cy, cz] = OP.EX.chart;
    part(g, rbox(0.66, 0.5, 0.04, 0.012), WHITE, cx, cy, cz);
    const chart = swapScreen(g, [paintDark, paintChart(-1), paintChart(0), paintChart(1), paintChart(2), paintChart(3), paintDuo].map((p, i) => painted(`opChart${i}`, 320, 240, p)), 0.6, 0.45, cx, cy, cz + 0.022);
    part(g, rbox(0.12, 0.03, 0.05, 0.01), WHITE, cx + 0.38, cy - 0.2, cz + 0.02);
    label(g, '시력표', 0.1, 0.025, cx, cy - 0.27, cz + 0.022, NAVY, '#ffffff');
    // The refraction chair (it swivels): base, column, seat, arms, back and headrest, footrest.
    const chairG = group(g, C.x, 0, C.z, Math.PI);
    part(chairG, cyl(0.24, 0.27, 0.06, 24), '#cfd8dc', 0, 0.06, 0);
    part(chairG, cyl(0.06, 0.07, C.seat - 0.14, 12), CHROME, 0, 0.09 + (C.seat - 0.14) / 2, 0);
    part(chairG, rbox(0.48, 0.1, 0.46, 0.05), NAVY, 0, C.seat - 0.05, 0);
    part(chairG, rbox(0.46, 0.62, 0.1, 0.05), NAVY, 0, C.seat + 0.3, -0.24, { rx: -0.08 });
    part(chairG, rbox(0.24, 0.14, 0.08, 0.04), NAVY_D, 0, C.seat + 0.68, -0.27, { rx: -0.08 });
    for (const sx of [-1, 1]) {
      part(chairG, rbox(0.07, 0.06, 0.38, 0.03), NAVY_D, sx * 0.26, C.seat + 0.18, -0.02);
      part(chairG, box(0.03, 0.18, 0.03), CHROME, sx * 0.26, C.seat + 0.07, -0.14);
    }
    part(chairG, rbox(0.36, 0.03, 0.14, 0.01), '#455a64', 0, 0.14, 0.34);
    part(chairG, box(0.03, 0.12, 0.2), CHROME, 0, 0.12, 0.24);
    // The column, telescoping, and the arm out to the phoropter.
    const [px, pz] = OP.EX.column;
    part(g, rbox(0.3, 0.04, 0.24, 0.01), '#cfd8dc', px, 0.05, pz);
    part(g, cyl(0.055, 0.06, 1.3, 14), WHITE, px, 0.7, pz);
    const lifter = group(g);
    part(lifter, cyl(0.045, 0.045, 0.64, 14), CHROME, px, 1.28, pz, { outline: false });
    part(lifter, cyl(0.07, 0.07, 0.08, 14), WHITE, px, 1.6, pz);
    const ph = OP.EX.phor;
    const dx = ph[0] - px;
    const dz = ph[2] - pz;
    const len = Math.hypot(dx, dz);
    const armG = group(lifter, px, 1.62, pz, Math.atan2(-dz, dx));
    part(armG, rbox(len, 0.06, 0.07, 0.02), WHITE, len / 2, 0, 0);
    part(armG, box(len - 0.1, 0.012, 0.072), NAVY, len / 2, -0.02, 0, { outline: false });
    // The hanger down to the phoropter.
    part(lifter, cyl(0.016, 0.016, 1.62 - ph[1] - 0.11, 8), STEEL, ph[0], (1.62 + ph[1] + 0.11) / 2, ph[2], { outline: false });
    const phor = group(lifter, ph[0], ph[1], ph[2]);
    // Two lens housings (the patient's side +z), the body between, the forehead rest, the dials.
    part(phor, rbox(0.1, 0.13, 0.08, 0.02), '#eceae4', 0, 0.02, 0);
    for (const sx of [-1, 1]) {
      part(phor, cyl(0.082, 0.082, 0.075, 26), '#eceae4', sx * 0.088, 0, 0, { rx: Math.PI / 2 });
      part(phor, cyl(0.084, 0.084, 0.012, 26), '#37474f', sx * 0.088, 0, 0.032, { rx: Math.PI / 2, outline: false });
      part(phor, cyl(0.084, 0.084, 0.012, 26), '#37474f', sx * 0.088, 0, -0.032, { rx: Math.PI / 2, outline: false });
      // The aperture at the eye, both faces.
      for (const fz of [-1, 1]) {
        part(phor, cyl(0.018, 0.018, 0.012, 16), BLACK, sx * 0.042, 0.0, fz * 0.04, { rx: Math.PI / 2, outline: false });
        glass(phor, disc(0.013), sx * 0.042, 0.0, fz * 0.047, GLASS).rotation.y = fz > 0 ? 0 : Math.PI;
      }
      // The little dials round each housing.
      for (let i = 0; i < 4; i++) {
        const a = Math.PI * (0.55 + i * 0.3) * (sx > 0 ? 1 : -1) + (sx > 0 ? 0 : Math.PI);
        part(phor, cyl(0.012, 0.012, 0.03, 10), BLACK, sx * 0.088 + Math.cos(a) * 0.075, Math.sin(a) * 0.075, 0.03, { rx: Math.PI / 2, outline: false });
      }
    }
    part(phor, rbox(0.14, 0.025, 0.03, 0.01), '#cfd8dc', 0, 0.065, 0.05);
    part(phor, rbox(0.3, 0.03, 0.05, 0.012), '#eceae4', 0, 0.1, 0);
    glowing(phor, box(0.03, 0.008, 0.008), '#76ff03', 0, 0.118, 0.012);
    // The dial the optician turns (on the right housing's outer edge), with its ribs; the lens wheel showing through.
    const dial = group(phor, OP.EX.dial[0] - ph[0], OP.EX.dial[1] - ph[1], 0);
    part(dial, cyl(0.03, 0.03, 0.03, 16), BLACK, 0, 0, 0, { rz: Math.PI / 2 });
    for (let i = 0; i < 6; i++) part(dial, box(0.034, 0.004, 0.008), '#616161', 0, Math.cos((i / 6) * Math.PI * 2) * 0.029, Math.sin((i / 6) * Math.PI * 2) * 0.029, { rx: (i / 6) * Math.PI * 2, outline: false });
    const wheel = group(phor, 0.088, 0, 0.044);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      part(wheel, cyl(0.009, 0.009, 0.004, 10), ['#4fc3f7', '#e57373', '#fff176', '#aed581'][i % 4], Math.cos(a) * 0.058, Math.sin(a) * 0.058, 0, { rx: Math.PI / 2, outline: false });
    }
    // The reading rod folded up on top, its near card.
    part(phor, box(0.008, 0.008, 0.22), STEEL, 0, 0.12, -0.1, { outline: false });
    // The stand with the controller (keys and a little screen), the trial lens box, a pen.
    const P = OP.EX.pad;
    part(g, cyl(0.03, 0.03, P[1] - 0.06, 8), STEEL, P[0] + 0.05, (P[1] - 0.06) / 2, P[2] - 0.08, { outline: false });
    part(g, rbox(0.34, 0.03, 0.3, 0.01), WHITE, P[0] + 0.05, P[1] - 0.03, P[2] - 0.04);
    const pad = group(g, P[0], P[1], P[2], 0.6);
    part(pad, rbox(0.2, 0.025, 0.14, 0.01), '#37474f', 0, 0.012, 0, { rx: -0.2 });
    const padScreen = litScreen(pad, painted('opPad', 256, 176, paintEdger), 0.1, 0.06, -0.03, 0.03, -0.02);
    padScreen.rotation.x = -Math.PI / 2 - 0.2;
    for (let i = 0; i < 6; i++) glowing(pad, box(0.016, 0.006, 0.016), i === 5 ? '#ff7043' : '#cfd8dc', 0.05 + (i % 2) * 0.025, 0.028, -0.03 + Math.floor(i / 2) * 0.025);
    part(g, rbox(0.14, 0.05, 0.1, 0.01), '#5d4037', P[0] + 0.15, P[1] + 0.025, P[2] - 0.12);
    for (let i = 0; i < 5; i++) part(g, cyl(0.012, 0.012, 0.004, 10), '#b0bec5', P[0] + 0.1 + i * 0.022, P[1] + 0.052, P[2] - 0.12, { outline: false });
    // A tissue box for the chin, a small bin at the column's foot.
    part(g, rbox(0.12, 0.06, 0.08, 0.01), '#e1f5fe', P[0] + 0.15, P[1] + 0.03, P[2] + 0.06);
    part(g, cyl(0.08, 0.07, 0.24, 14), '#b0bec5', 0.75, 0.12, -0.3);

    // In use: the customer sat in the chair; the stick and card for training; the questions.
    const use = group(g);
    out.inUse = use;
    const custG = group(use, C.x, 0, C.z, Math.PI);
    const look = CUSTOMERS[(n * 2 + 1) % CUSTOMERS.length];
    const cust = seated(custG, look, 0, 0, 0, C.seat, 0.02);
    const stick = group(use);
    part(stick, cyl(0.004, 0.004, 0.24, 6), '#eceff1', 0, -0.12, 0, { outline: false });
    part(stick, box(0.04, 0.04, 0.004), '#ffffff', 0, 0.0, 0);
    label(stick, '가', 0.018, 0.018, 0, 0.0, 0.003, '#ffffff', '#d32f2f', 0);
    const card = group(use);
    part(card, box(0.22, 0.15, 0.004), '#ffffff', 0, 0, 0);
    picture(card, painted('opVecto', 128, 96, paintNearCard), 0.2, 0.13, 0, 0, 0.003);
    const ask = bubbles(use, ['1번이 잘 보여요?', '2번은요?', '빨강, 초록 어느 쪽이 선명해요?'], -0.1, 1.78, 0.12);

    const mark = marker(g, 0, 0.8, 0);
    const pt = marker(g, OP.EX.pad[0], OP.EX.pad[1] + 0.02, OP.EX.pad[2]);
    const spots: Record<string, Spot> = {
      eyeExam: spotAt(g, OP.EXAM_AT, 'stand', 'opExam', mark),
      optician_visionTraining: spotAt(g, OP.TRAIN_AT, 'stand', 'opTrain', mark),
      '*': spotAt(g, OP.EXAM_AT, 'stand', 'opExam', mark),
    };
    out.spots = spots;
    out.work = pt;
    out.animate = (t) => {
      const m = nowMotion(spots, t, 'opExam');
      const ph0 = phaseOf(mark);
      cust.armL(null);
      cust.armR(null);
      cust.eyes(blinkOf(t, n));
      cust.mouth(0);
      cust.head.rotation.set(0, 0, 0);
      stick.visible = card.visible = false;
      ask(0);
      if (m === 'opTrain') {
        const b = OP.trainBeat(t, ph0);
        const up = OP.phorUp(b);
        lifter.position.y = OP.EX.lift * up;
        // Swivelled round to face the optician once it's up.
        const turn = Math.PI - (Math.PI / 2) * OP.ss(up, 0.3, 1);
        chairG.rotation.y = custG.rotation.y = turn;
        chart.show(0);
        const key = OP.opKeyOf('opTrain', t, ph0).key;
        if (b.from === 'push') {
          stick.visible = true;
          const tip = OP.targetAt(OP.targetNear(b));
          stick.position.copy(vp(tip));
          stick.rotation.set(0, -Math.PI / 2, 0);
          // Eyes on it, crossing as it comes in.
          cust.head.rotation.set(0.05, 0, 0);
          cust.eyes(false);
        } else if (b.from === 'card') {
          card.visible = true;
          card.position.copy(vp(OP.mixP(key.l, key.r, 0.5), 0.02));
          card.rotation.set(0, -Math.PI / 2, 0);
        } else if (b.from === 'talk') chatter(cust, t, 0.3, n);
        if (b.from === 'talk') cust.head.rotation.set(0, 0, 0.05 * Math.sin(t * 2));
      } else {
        const b = OP.examBeat(t, ph0);
        lifter.position.y = 0;
        chairG.rotation.y = custG.rotation.y = Math.PI;
        const ch = OP.chartOf(b);
        chart.show(ch.mode === 'duo' ? 6 : 2 + ch.row);
        dial.rotation.x = OP.dialTurn(b);
        wheel.rotation.z = OP.dialTurn(b) * 0.5;
        ask(OP.examAsks(b));
        chatter(cust, t, OP.examTalk(b), n);
        // Hands in the lap, now and then a tilt of the head to read.
        cust.head.rotation.set(-0.04, 0.03 * Math.sin(t * 0.7 + n), 0);
      }
    };
    // At rest: the phoropter parked up, the chair turned back, the chart dark.
    whenIdle(out, g, () => {
      lifter.position.y = OP.EX.lift;
      chairG.rotation.y = Math.PI;
      chart.show(0);
    });
  },

  // ===========================================================================================
  // The lens edger (1 × 1).
  lensEdger(g, _W, _D, _c, _def, _ctx, out) {
    const n = edgerCount++;
    const E = OP.ED;
    // The cabinet: doors, a drawer of tools, the top.
    part(g, rbox(0.94, E.top - 0.04, 0.62, 0.02), '#eceff1', 0, (E.top - 0.04) / 2, -0.15);
    part(g, rbox(0.98, 0.04, 0.66, 0.012), '#b0bec5', 0, E.top - 0.02, -0.14);
    for (const sx of [-1, 1]) {
      part(g, box(0.44, 0.5, 0.01), '#e0e0e0', sx * 0.23, 0.32, 0.165, { outline: false });
      part(g, box(0.012, 0.12, 0.02), STEEL, sx * 0.04, 0.42, 0.175, { outline: false });
    }
    part(g, box(0.9, 0.14, 0.01), '#e0e0e0', 0, 0.71, 0.165, { outline: false });
    part(g, box(0.16, 0.014, 0.02), STEEL, 0, 0.71, 0.175, { outline: false });
    // The edger: a body with a well at its front left under the lid, the screen on the right block.
    const B = E.body;
    const bx0 = B.x - B.w / 2;
    const bx1 = B.x + B.w / 2;
    const wellX0 = bx0 + 0.03;
    const wellX1 = B.x + 0.1;
    const top = E.top + B.h;
    part(g, rbox(B.w, 0.14, B.d, 0.02), WHITE, B.x, E.top + 0.07, B.z);
    part(g, rbox(B.w, B.h, 0.12, 0.02), WHITE, B.x, E.top + B.h / 2, B.z - B.d / 2 + 0.06);
    part(g, rbox(bx1 - wellX1, B.h, B.d, 0.02), WHITE, (bx1 + wellX1) / 2, E.top + B.h / 2, B.z);
    part(g, box(0.03, B.h - 0.14, B.d - 0.12), WHITE, bx0 + 0.015, E.top + 0.14 + (B.h - 0.14) / 2, B.z + 0.06);
    part(g, box(wellX1 - wellX0, 0.004, 0.24), '#37474f', (wellX0 + wellX1) / 2, E.top + 0.142, B.z + 0.07, { outline: false });
    part(g, box(B.w + 0.01, 0.02, 0.01), NAVY, B.x, E.top + 0.04, B.z + B.d / 2 + 0.002, { outline: false });
    label(g, 'SHAPE·EDGE', 0.14, 0.024, B.x - 0.08, E.top + 0.1, B.z + B.d / 2 + 0.004, WHITE, NAVY);
    // Inside the well: the two clamp shafts, the lens between, the grinding wheel behind, the nozzle.
    const ch = E.chamber;
    for (const sx of [-1, 1]) part(g, cyl(0.012, 0.012, 0.07, 10), STEEL, ch[0] + sx * 0.045, ch[1], ch[2], { rz: Math.PI / 2, outline: false });
    const wheelG = group(g, ch[0], ch[1] - 0.025, ch[2] - 0.075);
    part(wheelG, cyl(0.05, 0.05, 0.05, 18), '#8d6e63', 0, 0, 0, { rz: Math.PI / 2 });
    for (let i = 0; i < 6; i++) part(wheelG, box(0.052, 0.006, 0.01), '#5d4037', 0, Math.cos(i) * 0.05, Math.sin(i) * 0.05, { rx: i, outline: false });
    part(g, cyl(0.006, 0.006, 0.06, 6), STEEL, ch[0], ch[1] + 0.08, ch[2] - 0.03, { outline: false });
    // The lid, hinged at its back on the top.
    const lid = group(g, E.hinge[0], top, E.hinge[2]);
    const lidMesh = new THREE.Mesh(box(0.28, 0.012, E.lidD), SMOKY);
    lidMesh.position.set(0, 0.006, E.lidD / 2);
    lid.add(lidMesh);
    const lip = new THREE.Mesh(box(0.28, 0.15, 0.01), SMOKY);
    lip.position.set(0, -0.07, E.lidD);
    lid.add(lip);
    part(lid, box(0.08, 0.016, 0.02), '#37474f', 0, 0.014, E.lidD - 0.01);
    // The screen, tilted, its progress bar.
    const scr = group(g, E.screen[0], E.screen[1], E.screen[2]);
    scr.rotation.x = -0.35;
    part(scr, rbox(0.11, 0.085, 0.02, 0.008), '#263238', 0, 0, -0.008);
    out.screen = litScreen(scr, painted('opEdgerScreen', 256, 176, paintEdger), 0.1, 0.07, 0, 0, 0.004);
    const bar = ownGlow(scr, box(0.09, 0.005, 0.002), '#4fc3f7', 0, -0.028, 0.007);
    // The job tray on the top behind the lid: a frame and the lenses in their envelope.
    const T = E.tray;
    part(g, rbox(0.2, 0.04, 0.15, 0.01), ['#1e88e5', '#e53935', '#43a047'][n % 3], T[0], T[1] + 0.02, T[2]);
    specs(g, 'square', FRAME_COLORS[n % FRAME_COLORS.length], 'folded', false).position.set(T[0] + 0.02, T[1] + 0.045, T[2] - 0.02);
    part(g, box(0.07, 0.003, 0.05), '#fff8e1', T[0] - 0.05, T[1] + 0.042, T[2] + 0.03, { outline: false });
    const trayLens = part(g, cyl(0.03, 0.03, 0.006, 18), '#e1f5fe', T[0] + 0.05, T[1] + 0.045, T[2] + 0.035, { outline: false });
    // The blocker: base, its lit centring stage, the column and the arm with the cup.
    const S = E.stage;
    part(g, rbox(0.18, 0.08, 0.26, 0.015), WHITE, S[0], E.top + 0.04, S[2] - 0.08);
    glowing(g, cyl(0.04, 0.04, 0.008, 20), '#fffde7', S[0], S[1] - 0.006, S[2]);
    part(g, box(0.06, 0.002, 0.002), '#e53935', S[0], S[1] - 0.001, S[2], { outline: false });
    part(g, box(0.002, 0.002, 0.06), '#e53935', S[0], S[1] - 0.001, S[2], { outline: false });
    part(g, rbox(0.05, E.lever[1] - E.top, 0.05, 0.01), WHITE, S[0], (E.lever[1] + E.top) / 2, -0.1);
    part(g, rbox(0.05, 0.04, 0.22, 0.01), WHITE, S[0], E.lever[1], 0.0);
    // The press that comes down with the cup, and the handle that works it.
    const press = group(g, S[0], E.lever[1], S[2]);
    part(press, cyl(0.008, 0.008, 0.1, 8), STEEL, 0, -0.05, 0, { outline: false });
    part(press, cyl(0.014, 0.018, 0.012, 12), '#e53935', 0, -0.105, 0, { outline: false });
    const handle = group(g, E.lever[0], E.lever[1], E.lever[2]);
    part(handle, box(0.012, 0.012, E.leverLen), STEEL, 0, 0, E.leverLen / 2, { outline: false });
    part(handle, ball(0.018), '#e53935', 0, 0, E.leverLen);
    // A shelf on the wall: blank lenses in their envelopes, a spare tray, the 가공실 sign.
    part(g, rbox(0.9, 0.025, 0.2, 0.008), OAK, 0, 1.55, -0.38);
    for (let i = 0; i < 9; i++) part(g, box(0.07, 0.11, 0.1), ['#fff8e1', '#e3f2fd', '#fce4ec'][i % 3], -0.36 + i * 0.09, 1.62, -0.38);
    label(g, '가공실', 0.2, 0.06, 0, 1.78, -0.46, NAVY, '#ffffff');
    // Coolant in its jug at the side.
    part(g, rbox(0.1, 0.16, 0.08, 0.015), '#4fc3f7', 0.4, E.top + 0.08, -0.32);

    // In use: the lens (in hand, on the stage, clamped), the spray, the junior.
    const use = group(g);
    out.inUse = use;
    const lens = part(use, cyl(0.03, 0.03, 0.006, 18), '#e1f5fe', 0, 0, 0, { outline: false });
    const drops = Array.from({ length: 7 }, () => {
      const m = new THREE.Mesh(ball(0.006), SPRAY);
      use.add(m);
      return m;
    });
    const mist = new THREE.Mesh(ball(0.05), SPRAY);
    mist.scale.set(1.4, 0.8, 1);
    use.add(mist);
    const junior = standing(use, LOOKS.junior, OP.TRAINEE.x, OP.TRAINEE.z, Math.PI);

    const mark = marker(g, 0, 0.8, 0);
    const spots: Record<string, Spot> = {
      cutLenses: spotAt(g, OP.EDGE_AT, 'stand', 'opEdge', mark),
      rushGlasses: spotAt(g, OP.EDGE_AT, 'stand', 'opRush', mark),
      optician_trainStaff: spotAt(g, OP.TEACH_AT, 'stand', 'opTeach', mark),
      '*': spotAt(g, OP.EDGE_AT, 'stand', 'opEdge', mark),
    };
    out.spots = spots;
    out.work = marker(g, E.screen[0], E.screen[1], E.screen[2]);
    const spin = (t: number, k: number) => {
      wheelG.rotation.x = -t * 30 * k;
      drops.forEach((d, i) => {
        const u = (t * 2.2 + i / drops.length) % 1;
        d.visible = k > 0.05;
        d.position.set(ch[0] + 0.03 * Math.sin(i * 2.3), ch[1] + 0.07 - u * 0.1, ch[2] - 0.02 + 0.04 * Math.cos(i * 1.7) * u);
      });
      mist.visible = k > 0.05;
      mist.position.set(ch[0], ch[1] + 0.01, ch[2] - 0.02);
      mist.scale.setScalar(0.6 + 0.2 * Math.sin(t * 9));
    };
    out.animate = (t) => {
      const m = nowMotion(spots, t, 'opEdge');
      const ph0 = phaseOf(mark);
      junior.root.visible = m === 'opTeach';
      lens.rotation.set(0, 0, 0);
      let where: 'tray' | 'hand' | 'stage' | 'chamber' = 'tray';
      let grind = 0;
      let open = 0;
      let down = 0;
      let prog = 0;
      let held: OP.P | null = null;
      if (m === 'opTeach') {
        const b = OP.teachBeat(t, ph0);
        const key = OP.opKeyOf('opTeach', t, ph0).key;
        where = b.from === 'show' ? 'hand' : b.from === 'watch' ? 'chamber' : 'tray';
        held = OP.mixP(key.l, key.r, 0.5);
        grind = b.from === 'watch' ? OP.ss(b.p, 0, 0.1) * (1 - OP.ss(b.p, 0.9, 1)) : 0;
        prog = b.from === 'watch' ? b.p : 0;
        // The junior: hands on the screen and the lid while it runs, looking round when spoken to.
        junior.armL(v3(E.hinge[0], top + 0.03, E.hinge[2] + E.lidD - 0.02));
        junior.armR(b.from === 'watch' ? v3(E.screen[0], E.screen[1] + 0.02, E.screen[2] + 0.03) : v3(0.0, E.top + 0.04, 0.3));
        junior.head.rotation.set(0.25, b.from === 'show' || b.from === 'praise' ? -0.7 : 0, 0);
        junior.mouth(b.from === 'praise' ? 0.6 : 0);
        junior.eyes(blinkOf(t, n + 3));
      } else {
        const rush = m === 'opRush';
        const b = OP.edgeBeat(t, ph0, rush);
        const key = OP.opKeyOf(m, t, ph0).key;
        where = OP.lensWhere(b);
        held = key.r;
        grind = OP.grinding(b);
        open = OP.lidOpen(b);
        down = OP.leverDown(b);
        prog = OP.edgeProgress(b);
        if (b.from === 'check' || b.from === 'fit') held = OP.mixP(key.l, key.r, 0.5);
      }
      trayLens.visible = where === 'tray';
      lens.visible = where !== 'tray';
      if (where === 'hand' && held) {
        lens.position.copy(vp(held, 0.02));
        lens.rotation.set(Math.PI / 2, 0, 0);
      } else if (where === 'stage') lens.position.set(E.stage[0], E.stage[1] + 0.004, E.stage[2]);
      else if (where === 'chamber') {
        lens.position.set(ch[0], ch[1], ch[2]);
        lens.rotation.z = Math.PI / 2;
      }
      spin(t, grind);
      lid.rotation.x = -1.15 * open;
      press.position.y = E.lever[1] - 0.12 * down;
      handle.rotation.x = 0.88 * down;
      bar.scale.x = Math.max(0.01, prog);
      bar.position.x = -0.045 * (1 - prog);
    };
    whenIdle(out, g, () => {
      lid.rotation.x = 0;
      press.position.y = E.lever[1];
      handle.rotation.x = 0;
      trayLens.visible = true;
      wheelG.rotation.x = 0;
    });
  },

  // ===========================================================================================
  // The frame wall (2 × 1, against a wall).
  frameDisplay(g, _W, _D, _c, _def, _ctx, out) {
    const n = frameCount++;
    const F = OP.FD;
    const rnd = seeded(91 + n * 17);
    // The cabinet below: plinth, two drawers a side, the lit glass case of sunglasses.
    const cabD = F.cabFront + 0.5;
    const cz = -0.5 + cabD / 2;
    part(g, box(1.94, 0.08, cabD - 0.02), '#37474f', 0, 0.04, cz);
    part(g, rbox(1.96, 0.36, cabD, 0.012), PALE, 0, 0.26, cz);
    for (const sx of [-1, 1]) {
      part(g, box(0.9, 0.003, 0.004), '#cfc6b4', sx * 0.48, 0.26, F.cabFront + 0.001, { outline: false });
      part(g, box(0.14, 0.012, 0.02), OAK_D, sx * 0.48, 0.3, F.cabFront + 0.01, { outline: false });
    }
    glass(g, box(1.92, 0.4, 0.006), 0, 0.64, F.cabFront - 0.003);
    part(g, box(1.96, 0.02, cabD), PALE, 0, F.cab - 0.01, cz);
    glowing(g, box(1.9, 0.01, cabD - 0.04), '#fff8e1', 0, 0.45, cz);
    part(g, box(1.9, 0.02, cabD - 0.06), '#37474f', 0, 0.46, cz);
    for (let i = 0; i < 7; i++) {
      const sg = specs(g, i % 2 ? 'oval' : 'square', i % 3 ? '#212121' : '#6d4c41', 'folded', true);
      sg.position.set(-0.78 + i * 0.26, 0.52, cz + 0.02);
      sg.rotation.x = -0.6;
      sg.scale.setScalar(1.1);
    }
    picture(g, painted('opSun', 256, 48, paintSunSign), 0.3, 0.056, 0.62, 0.8, F.cabFront + 0.004);
    // The wall above: the back board, posts, the lit header.
    part(g, box(1.96, 1.08, 0.04), WHITE, 0, F.cab + 0.54, -0.48);
    for (const sx of [-1, 1]) part(g, rbox(0.05, 1.08, 0.14, 0.01), OAK, sx * 0.955, F.cab + 0.54, -0.43);
    part(g, rbox(1.96, 0.14, 0.14, 0.012), NAVY, 0, F.cab + 1.15, -0.43);
    picture(g, painted('opHeader', 512, 64, paintHeader), 1.2, 0.12, 0, F.cab + 1.15, -0.358);
    // The rails, each lit from under, and the frames on them.
    const tilted: Array<{ m: THREE.Object3D; col: number; tilt: number }> = [];
    let picked: THREE.Group | null = null;
    let pickedColor = '#212121';
    let pickedKind: Rim = 'square';
    F.rows.forEach((y, row) => {
      part(g, box(1.84, 0.012, 0.09), '#eceff1', 0, y - 0.034, -0.41);
      glowing(g, box(1.8, 0.006, 0.01), '#fffde7', 0, y - 0.044, -0.37);
      for (let col = 0; col < F.cols; col++) {
        const kind: Rim = (['round', 'square', 'oval'] as Rim[])[Math.floor(rnd() * 3)];
        const color = FRAME_COLORS[Math.floor(rnd() * FRAME_COLORS.length)];
        const [x, fy, fz] = OP.frameAt(row, col);
        const sg = specs(g, kind, color, 'none', false);
        sg.position.set(x, fy, fz);
        sg.scale.setScalar(1.2);
        if (row === OP.PICK.row && col === OP.PICK.col) {
          picked = sg;
          pickedColor = color;
          pickedKind = kind;
        }
        if (row === 0) tilted.push({ m: sg, col, tilt: (rnd() - 0.5) * 0.35 });
        if ((row + col) % 3 === 0) picture(g, painted(`opTag${(row * 7 + col) % 5}`, 96, 32, paintTag(['89,000', '129,000', '159,000', '69,000', '210,000'][(row * 7 + col) % 5])), 0.06, 0.02, x, y - 0.055, -0.36);
      }
    });
    // In use: the frame in the hand, the cloth, the tablet, the drawer.
    const use = group(g);
    out.inUse = use;
    const held = specs(use, pickedKind, pickedColor, 'open', true);
    held.scale.setScalar(1.2);
    const cloth = part(use, rbox(0.1, 0.01, 0.08, 0.004), '#ffcc80', 0, 0, 0, { outline: false });
    const tablet = group(use);
    part(tablet, rbox(0.2, 0.012, 0.14, 0.006), BLACK, 0, 0, 0);
    picture(tablet, painted('opOrderTab', 256, 176, paintEdger), 0.18, 0.12, 0, 0.007, 0, '#ffffff', 0, -Math.PI / 2);
    const drawer = group(g, OP.DRAWER[0], 0, F.cabFront);
    part(drawer, box(0.86, 0.16, 0.26), '#e8e1d4', 0, 0.3, -0.13);
    for (let i = 0; i < 6; i++) part(drawer, rbox(0.12, 0.04, 0.06, 0.01), ['#212121', '#6d4c41', NAVY][i % 3], -0.32 + i * 0.13, 0.4, -0.1);
    drawer.visible = false;
    const mark = marker(g, 0, 1.2, -0.3);
    const spots: Record<string, Spot> = {
      arrangeFrames: spotAt(g, OP.FRAME_AT, 'stand', 'opFrames', mark),
      optician_inventoryOrder: spotAt(g, OP.FRAME_AT, 'stand', 'opOrder', mark),
      '*': spotAt(g, OP.FRAME_AT, 'stand', 'opFrames', mark),
    };
    out.spots = spots;
    out.work = mark;
    out.animate = (t) => {
      const m = nowMotion(spots, t, 'opFrames');
      const ph0 = phaseOf(mark);
      const key = OP.opKeyOf(m, t, ph0).key;
      held.visible = cloth.visible = tablet.visible = false;
      drawer.visible = false;
      for (const f of tilted) f.m.rotation.z = 0;
      if (picked) (picked as THREE.Group).visible = true;
      if (m === 'opOrder') {
        const b = OP.orderBeat(t, ph0);
        tablet.visible = b.from !== 'drawer';
        tablet.position.copy(vp(key.l, 0.01));
        tablet.rotation.set(1.1, 0, 0);
        const out0 = OP.drawerOut(b);
        drawer.visible = out0 > 0.01;
        drawer.position.z = F.cabFront + 0.26 * out0;
      } else {
        const b = OP.framesBeat(t, ph0);
        if (OP.frameHeld(b)) {
          if (picked) (picked as THREE.Group).visible = false;
          held.visible = true;
          held.position.copy(vp(b.from === 'wipe' ? OP.mixP(key.l, key.r, 0.6) : key.r, 0.03));
          held.rotation.set(0, b.from === 'show' ? 1.0 : 0, 0);
        }
        cloth.visible = b.from === 'wipe';
        cloth.position.copy(vp(key.l, 0.01));
        cloth.rotation.set(1.2, 0, 0);
        // The bottom row's frames askew till the finger's passed them.
        const c = OP.tidyCol(b);
        const done = b.from === 'tidy' ? c : -1;
        for (const f of tilted) f.m.rotation.z = f.col > done ? f.tilt : 0;
      }
    };
    whenIdle(out, g, () => {
      for (const f of tilted) f.m.rotation.z = 0;
      if (picked) (picked as THREE.Group).visible = true;
      drawer.visible = false;
    });
  },

  // ===========================================================================================
  // The fitting table (2 × 1): the optician sat at the front, the customer across.
  fittingTable(g, _W, _D, _c, _def, _ctx, out) {
    const n = fitCount++;
    const F = OP.FT;
    // The table: a pale oak top with a glass sheet and a black fitting mat, end panels, a drawer unit at the left.
    part(g, rbox(F.w, 0.04, F.d, 0.012), OAK, 0, F.top - 0.02, F.cz);
    glass(g, box(F.w - 0.06, 0.006, F.d - 0.04), 0, F.top + 0.003, F.cz);
    for (const sx of [-1, 1]) part(g, rbox(0.05, F.top - 0.04, F.d - 0.04, 0.01), OAK_D, sx * (F.w / 2 - 0.04), (F.top - 0.04) / 2, F.cz);
    part(g, rbox(0.34, 0.3, F.d - 0.08, 0.01), PALE, -0.62, F.top - 0.19, F.cz);
    for (let i = 0; i < 2; i++) part(g, box(0.1, 0.012, 0.02), OAK_D, -0.62, F.top - 0.1 - i * 0.14, F.cz + F.d / 2 - 0.035, { outline: false });
    part(g, rbox(0.42, 0.006, 0.28, 0.004), '#263238', -0.04, F.top + 0.007, 0.08, { outline: false });
    // The frame warmer: a box with a grille, glowing red when it blows; its switch.
    const W0 = F.warmer;
    part(g, rbox(0.18, 0.12, 0.16, 0.02), '#eceff1', W0[0], W0[1] + 0.06, W0[2]);
    for (let i = 0; i < 5; i++) part(g, box(0.15, 0.004, 0.012), '#424242', W0[0], W0[1] + 0.122, W0[2] - 0.05 + i * 0.025, { outline: false });
    const heater = ownGlow(g, box(0.14, 0.004, 0.12), '#5d4037', W0[0], W0[1] + 0.118, W0[2]);
    const heatLed = ownGlow(g, ball(0.007), '#5d4037', W0[0] + 0.06, W0[1] + 0.07, W0[2] + 0.081);
    label(g, '프레임 히터', 0.09, 0.02, W0[0] - 0.02, W0[1] + 0.07, W0[2] + 0.081, '#eceff1', '#37474f');
    const shimmer = Array.from({ length: 4 }, () => {
      const m = new THREE.Mesh(ball(0.03), HEAT);
      g.add(m);
      return m;
    });
    // The pliers stand: a block with five pairs standing in it, coloured grips.
    const Pl = F.pliers;
    part(g, rbox(0.16, 0.06, 0.1, 0.01), '#5d4037', Pl[0], Pl[1] + 0.03, Pl[2]);
    for (let i = 0; i < 5; i++) {
      const px = Pl[0] - 0.06 + i * 0.03;
      for (const sx of [-1, 1]) part(g, box(0.008, 0.14, 0.008), ['#e53935', '#1e88e5', '#fdd835', '#43a047', '#8e24aa'][i], px + sx * 0.006, Pl[1] + 0.13, Pl[2], { rz: sx * 0.08, outline: false });
      part(g, box(0.01, 0.03, 0.01), STEEL, px, Pl[1] + 0.06, Pl[2], { outline: false });
    }
    // The mirror on its stand, turned to the customer (its back to us).
    const Mi = F.mirror;
    const mir = group(g, Mi[0], Mi[1], Mi[2], Math.PI);
    part(mir, cyl(0.06, 0.07, 0.02, 18), CHROME, 0, 0.01, 0);
    part(mir, cyl(0.008, 0.008, 0.16, 8), CHROME, 0, 0.1, 0, { outline: false });
    part(mir, cyl(0.1, 0.1, 0.015, 24), CHROME, 0, 0.27, 0, { rx: Math.PI / 2 - 0.1 });
    const face = new THREE.Mesh(cyl(0.09, 0.09, 0.004, 24), MIRROR);
    face.position.set(0, 0.27, 0.009);
    face.rotation.x = Math.PI / 2 - 0.1;
    mir.add(face);
    // Small things: the screwdriver set, the nose-pad box, a spray, a cloth, cards, a pen cup.
    part(g, rbox(0.16, 0.02, 0.06, 0.006), '#1565c0', 0.32, F.top + 0.01, -0.12);
    for (let i = 0; i < 5; i++) part(g, cyl(0.005, 0.005, 0.1, 6), ['#e53935', '#fdd835', '#43a047', '#1e88e5', '#212121'][i], 0.26 + i * 0.03, F.top + 0.026, -0.12, { rx: Math.PI / 2, outline: false });
    part(g, rbox(0.1, 0.025, 0.07, 0.006), '#eceff1', 0.38, F.top + 0.012, 0.02);
    for (let i = 0; i < 6; i++) part(g, ball(0.007), '#e1f5fe', 0.35 + (i % 3) * 0.03, F.top + 0.028, 0.0 + Math.floor(i / 3) * 0.03, { outline: false });
    part(g, cyl(0.025, 0.025, 0.13, 12), '#4fc3f7', 0.82, F.top + 0.065, -0.1);
    part(g, cyl(0.012, 0.012, 0.03, 8), WHITE, 0.82, F.top + 0.145, -0.1, { outline: false });
    part(g, rbox(0.12, 0.004, 0.1, 0.002), '#ffcc80', 0.6, F.top + 0.004, 0.08, { outline: false });
    part(g, cyl(0.03, 0.03, 0.09, 12), NAVY, -0.84, F.top + 0.045, 0.08);
    for (let i = 0; i < 3; i++) part(g, cyl(0.004, 0.004, 0.12, 6), ['#212121', '#c62828', '#1565c0'][i], -0.85 + i * 0.01, F.top + 0.1, 0.08, { rz: (i - 1) * 0.15, outline: false });
    label(g, SHOP, 0.18, 0.04, 0.78, F.top + 0.03, 0.12, NAVY, '#ffffff');
    // The stools: the optician's at the front, the customer's across.
    stool(g, OP.FIT_AT.x, OP.FIT_AT.z, OP.FIT_AT.y, Math.PI, false, NAVY);
    stool(g, OP.CUST.x, OP.CUST.z, OP.CUST.seat, 0, true, '#c5cae9');

    // In use: the customer (and their glasses, worn or in the hands), the pliers, the head form.
    const use = group(g);
    out.inUse = use;
    const look = CUSTOMERS[(n * 3 + 2) % CUSTOMERS.length];
    const cust = seated(use, look, OP.CUST.x, OP.CUST.z, 0, OP.CUST.seat, OP.CUST.lean);
    const kind: Rim = (['round', 'square', 'oval'] as Rim[])[n % 3];
    const color = FRAME_COLORS[(n * 3 + 1) % FRAME_COLORS.length];
    const onFace = worn(cust, kind, color);
    const inHand = specs(use, kind, color);
    const pliers = group(use);
    for (const sx of [-1, 1]) part(pliers, box(0.008, 0.11, 0.008), '#e53935', sx * 0.008, -0.05, 0, { rz: sx * 0.1, outline: false });
    part(pliers, box(0.012, 0.03, 0.01), STEEL, 0, 0.02, 0, { outline: false });
    const bust = group(use, OP.BUST[0], OP.BUST[1], OP.BUST[2]);
    part(bust, cyl(0.05, 0.07, 0.12, 14), '#e0d6c8', 0, 0.06, 0);
    part(bust, ball(0.1), '#efe6d8', 0, 0.22, 0);
    part(bust, box(0.02, 0.03, 0.02), '#e0d6c8', 0, 0.21, 0.1, { outline: false });
    const onBust = specs(use, 'square', '#424242');
    onBust.position.copy(vp(OP.ON_BUST, 0.01));
    const book = group(use, -0.22, F.top + 0.005, 0.14);
    part(book, box(0.2, 0.012, 0.14), '#fff8e1', 0, 0, 0);
    part(book, box(0.004, 0.014, 0.14), '#8d6e63', 0, 0.001, 0, { outline: false });

    const mark = marker(g, 0, 0.9, 0);
    const spots: Record<string, Spot> = {
      adjustFrames: spotAt(g, OP.FIT_AT, 'sit', 'opFit', mark),
      optician_learnFitting: spotAt(g, OP.FIT_AT, 'sit', 'opFitLearn', mark),
      '*': spotAt(g, OP.FIT_AT, 'sit', 'opFit', mark),
    };
    out.spots = spots;
    out.work = marker(g, -0.04, F.top + 0.02, 0.08);
    out.animate = (t) => {
      const m = nowMotion(spots, t, 'opFit');
      const ph0 = phaseOf(mark);
      const key = OP.opKeyOf(m, t, ph0).key;
      const learn = m === 'opFitLearn';
      cust.root.visible = !learn;
      bust.visible = book.visible = learn;
      cust.armL(null);
      cust.armR(null);
      cust.mouth(0);
      cust.eyes(blinkOf(t, n));
      cust.head.rotation.set(0, 0, 0);
      let heat = 0;
      let pl = false;
      let where: 'hand' | 'face' = 'hand';
      if (learn) {
        const b = OP.learnBeat(t, ph0);
        heat = OP.amountOf(b, 'warm');
        pl = b.from === 'bend';
        onBust.visible = OP.learnOnBust(b);
        inHand.visible = !onBust.visible;
        onFace.visible = false;
      } else {
        onBust.visible = false;
        const b = OP.fitBeat(t, ph0);
        heat = OP.warming(b);
        pl = OP.pliersHeld(b);
        where = OP.glassesWhere(b);
        onFace.visible = where === 'face';
        inHand.visible = where === 'hand';
        // The customer: looking up as they're set on, turning the head side to side, then at the mirror.
        if (b.from === 'look') {
          cust.head.rotation.set(0, 0.35 * Math.sin(b.p * Math.PI * 2), 0);
          chatter(cust, t, 0.5, n);
        }
        if (b.from === 'mirror') {
          cust.head.rotation.set(0.05, 0.7, 0);
          cust.armR(v3(OP.CUST.x - 0.12, 1.2, OP.CUST.z + 0.22));
          chatter(cust, t, 0.35, n);
        }
        if (b.from === 'on' || b.from === 'on2') cust.head.rotation.set(-0.08, 0, 0);
      }
      if (inHand.visible) {
        inHand.position.copy(vp(OP.mixP(key.l, key.r, 0.5), 0.01));
        inHand.rotation.set(0, 0, 0);
      }
      pliers.visible = pl;
      if (pl) pliers.position.copy(vp(key.r, 0.04));
      // The warmer's grille glows and the air shimmers over it.
      (heater.material as THREE.MeshBasicMaterial).color.set(heat > 0.3 ? '#ff5722' : '#5d4037');
      (heatLed.material as THREE.MeshBasicMaterial).color.set(heat > 0.3 ? '#ff1744' : '#5d4037');
      shimmer.forEach((s, i) => {
        const u = (t * 0.8 + i / shimmer.length) % 1;
        s.visible = heat > 0.3;
        s.position.set(W0[0] + 0.03 * Math.sin(i * 2 + t), W0[1] + 0.14 + u * 0.2, W0[2]);
        s.scale.setScalar(0.6 + u);
      });
    };
    whenIdle(out, g, () => {
      (heater.material as THREE.MeshBasicMaterial).color.set('#5d4037');
      (heatLed.material as THREE.MeshBasicMaterial).color.set('#5d4037');
      shimmer.forEach((m) => (m.visible = false));
    });
    // At rest: a pair in its case waiting on the mat.
    const caseG = group(out.idle!, -0.04, F.top + 0.01, 0.06);
    part(caseG, rbox(0.17, 0.05, 0.07, 0.02), NAVY, 0, 0.025, 0);
    specs(caseG, kind, color, 'folded').position.set(0, 0.06, 0.08);
  },

  // ===========================================================================================
  // The autorefractor (1 × 2): the customer at the back, chin on the rest; the optician sat at the front.
  opAutoRefractor(g, _W, _D, _c, _def, _ctx, out) {
    const R = OP.REF;
    // The lift table: foot, column, top; its up/down switch.
    part(g, rbox(0.46, 0.04, 0.56, 0.012), '#cfd8dc', 0, 0.02, -0.02);
    part(g, rbox(0.12, R.top - 0.08, 0.2, 0.02), WHITE, 0, (R.top - 0.04) / 2, -0.06);
    part(g, rbox(0.6, 0.03, 0.54, 0.01), WHITE, 0, R.top - 0.015, 0.0);
    part(g, box(0.6, 0.01, 0.02), NAVY, 0, R.top - 0.02, 0.27, { outline: false });
    glowing(g, box(0.03, 0.012, 0.02), '#76ff03', 0.22, R.top - 0.02, 0.272);
    // The device: base, carriage (slides across), housing, measuring window, chin rest and forehead bar.
    part(g, rbox(0.34, 0.05, 0.46, 0.012), '#eceff1', 0, R.top + 0.025, 0.0);
    const head = group(g);
    part(head, rbox(0.24, 0.05, 0.3, 0.012), '#cfd8dc', 0, R.top + 0.075, 0.02);
    part(head, rbox(0.22, 0.28, 0.24, 0.03), WHITE, 0, R.top + 0.24, -0.0);
    part(head, rbox(0.23, 0.04, 0.25, 0.02), NAVY, 0, R.top + 0.36, 0.0);
    part(head, cyl(0.045, 0.05, 0.05, 20), '#263238', 0, R.eyes[1], -0.14, { rx: Math.PI / 2 });
    glass(head, disc(0.03), 0, R.eyes[1], -0.166, GLASS).rotation.y = Math.PI;
    const flash = ownGlow(head, disc(0.028), '#e3f2fd', 0, R.eyes[1], -0.168, 0.9);
    flash.rotation.y = Math.PI;
    label(head, 'AR-K', 0.07, 0.025, 0.0, R.top + 0.3, 0.121, WHITE, NAVY);
    // The monitor on the optician's side, tilted up, and the joystick.
    const mon = group(head, 0, R.screen[1], R.screen[2]);
    mon.rotation.x = -0.45;
    part(mon, rbox(0.21, 0.16, 0.025, 0.01), '#263238', 0, 0, -0.01);
    const screen = swapScreen(mon, [0, 1, 2, 3].map((i) => painted(`opRef${i}`, 256, 192, paintRef(i as 0 | 1 | 2 | 3))), 0.19, 0.14, 0, 0, 0.004);
    const flashScr = ownGlow(mon, box(0.19, 0.14, 0.001), '#ffffff', 0, 0, 0.006, 0.8);
    const joy = group(g, R.joy[0], R.top + 0.05, R.joy[2]);
    part(joy, cyl(0.03, 0.035, 0.02, 14), '#37474f', 0, 0.01, 0);
    part(joy, cyl(0.007, 0.007, 0.06, 8), STEEL, 0, 0.05, 0, { outline: false });
    part(joy, ball(0.02), BLACK, 0, 0.085, 0);
    glowing(joy, cyl(0.008, 0.008, 0.006, 10), '#ff7043', 0, 0.104, 0);
    // The printer slot and its paper.
    part(g, box(0.08, 0.004, 0.012), '#37474f', R.slot[0], R.top + 0.052, R.slot[2] + 0.01, { outline: false });
    const paper = part(g, box(0.05, 0.001, 0.06), '#ffffff', R.slot[0], R.top + 0.054, R.slot[2] + 0.04, { outline: false });
    // Chin rest and forehead bar on the customer's side, with the paper pads.
    for (const sx of [-1, 1]) part(g, rbox(0.022, 0.6, 0.022, 0.008), WHITE, sx * 0.13, R.top + 0.33, -0.2);
    part(g, rbox(0.28, 0.03, 0.03, 0.012), WHITE, 0, 1.3, -0.2);
    part(g, rbox(0.14, 0.012, 0.025, 0.006), '#b0bec5', 0, 1.28, -0.22);
    part(g, cyl(0.008, 0.008, 0.26, 8), STEEL, 0, R.top + 0.18, -0.21, { outline: false });
    part(g, rbox(0.1, 0.02, 0.06, 0.01), '#eceff1', 0, R.chin[1] - 0.02, -0.21);
    part(g, rbox(0.08, 0.004, 0.05, 0.002), '#fffde7', 0, R.chin[1] - 0.008, -0.21, { outline: false });
    // The stools.
    stool(g, OP.REF_AT.x, OP.REF_AT.z, OP.REF_AT.y, Math.PI, false, NAVY);
    stool(g, OP.CUST_R.x, OP.CUST_R.z, OP.CUST_R.seat, 0, true, '#c5cae9');
    // A tissue box at the table's corner.
    part(g, rbox(0.12, 0.06, 0.08, 0.01), '#e1f5fe', -0.22, R.top + 0.03, 0.18);

    const use = group(g);
    out.inUse = use;
    const cust = seated(use, CUSTOMERS[3], OP.CUST_R.x, OP.CUST_R.z, 0, OP.CUST_R.seat, OP.CUST_R.lean);
    const slip = part(use, box(0.05, 0.001, 0.12), '#ffffff', 0, 0, 0, { outline: false });
    const mark = marker(g, 0, 0.9, 0);
    const spots: Record<string, Spot> = { '*': spotAt(g, OP.REF_AT, 'sit', 'opRefract', mark) };
    out.spots = spots;
    out.work = marker(g, R.joy[0], R.joy[1], R.joy[2]);
    out.screen = screen.mesh;
    flash.visible = flashScr.visible = false;
    out.animate = (t) => {
      const ph0 = phaseOf(mark);
      const b = OP.refBeat(t, ph0);
      const key = OP.opKeyOf('opRefract', t, ph0).key;
      const slide = OP.headSlide(b);
      head.position.x = 0.032 * slide;
      joy.position.x = R.joy[0] + 0.012 * slide;
      const done = OP.refDone(b);
      screen.show(b.from === 'chin' ? 0 : done === 0 ? 1 : done === 1 ? (b.from === 'other' || b.from === 'shot2' ? 2 : 2) : 3);
      flash.visible = flashScr.visible = OP.refFlash(b) > 0;
      const po = OP.paperOut(b);
      paper.scale.z = 1 + po * 1.6;
      paper.visible = po < 0.5;
      slip.visible = po >= 0.5;
      if (slip.visible) {
        slip.position.copy(vp(OP.mixP(key.l, key.r, 0.5), 0.02));
        slip.rotation.set(-1.1, 0, 0);
      }
      // The customer: chin on the rest, hands on the table's edge, eyes held open for the shots.
      cust.armL(v3(0.16, R.top + 0.02, -0.24));
      cust.armR(v3(-0.16, R.top + 0.02, -0.24));
      cust.eyes(b.from === 'chin' || b.from === 'print' ? blinkOf(t, 4) : false);
      cust.head.rotation.set(-0.3, 0, 0);
      cust.root.position.x = OP.CUST_R.x;
      chatter(cust, t, b.from === 'chin' ? 0.3 : 0, 4);
    };
    whenIdle(out, g, () => {
      head.position.x = 0;
      joy.position.x = R.joy[0];
      flash.visible = flashScr.visible = false;
      paper.scale.z = 1;
      paper.visible = true;
      screen.show(0);
    });
  },

  // ===========================================================================================
  // The lensometer (1 × 1, on a cabinet).
  opLensMeter(g, _W, _D, _c, _def, _ctx, out) {
    const L = OP.LM;
    part(g, rbox(0.84, L.top - 0.04, 0.5, 0.02), PALE, 0, (L.top - 0.04) / 2, -0.2);
    part(g, rbox(0.88, 0.04, 0.54, 0.012), OAK, 0, L.top - 0.02, -0.18);
    for (let i = 0; i < 3; i++) {
      part(g, box(0.78, 0.003, 0.004), '#cfc6b4', 0, 0.28 + i * 0.2, 0.051, { outline: false });
      part(g, box(0.12, 0.012, 0.02), OAK_D, 0, 0.36 + i * 0.2, 0.06, { outline: false });
    }
    // The lensometer: base, column, the screen head on top, the nose piece and frame table, the holder lever.
    const lx = L.stage[0];
    part(g, rbox(0.22, 0.06, 0.28, 0.015), WHITE, lx, L.top + 0.03, -0.08);
    part(g, rbox(0.15, 0.32, 0.14, 0.02), WHITE, lx, L.top + 0.2, -0.14);
    const headG = group(g, lx, L.screen[1], L.screen[2]);
    headG.rotation.x = -0.35;
    part(headG, rbox(0.2, 0.15, 0.08, 0.02), WHITE, 0, 0, -0.03);
    const scr = swapScreen(headG, [0, 1, 2].map((i) => painted(`opLm${i}`, 192, 144, paintLm(i as 0 | 1 | 2))), 0.17, 0.12, 0, 0, 0.012);
    out.screen = scr.mesh;
    part(g, cyl(0.022, 0.03, 0.06, 16), '#37474f', lx, L.stage[1] - 0.03, L.stage[2]);
    part(g, cyl(0.016, 0.016, 0.006, 16), '#90caf9', lx, L.stage[1] + 0.002, L.stage[2], { outline: false });
    part(g, rbox(0.2, 0.014, 0.02, 0.005), '#37474f', lx, L.stage[1] - 0.02, L.stage[2] + 0.07);
    const holder = group(g, lx, 1.08, -0.08);
    part(holder, rbox(0.03, 0.025, 0.14, 0.008), '#37474f', 0, 0, 0.06);
    part(holder, cyl(0.02, 0.02, 0.03, 12), '#37474f', 0, -0.025, 0.12, { outline: false });
    part(g, rbox(0.03, 0.03, 0.03, 0.01), '#e53935', L.btn[0], L.btn[1], L.btn[2] - 0.04);
    part(g, rbox(0.06, 0.02, 0.01, 0.004), '#37474f', lx + 0.07, L.top + 0.08, -0.07, { outline: false });
    label(g, 'LENSMETER', 0.1, 0.022, lx, L.top + 0.27, -0.069, WHITE, NAVY);
    // The basket of glasses waiting to be read, the PD meter, record cards, a cloth.
    const Bk = L.basket;
    part(g, rbox(0.22, 0.07, 0.16, 0.02), '#d7b98e', Bk[0], Bk[1] + 0.035, Bk[2]);
    part(g, box(0.18, 0.004, 0.12), '#bfa077', Bk[0], Bk[1] + 0.071, Bk[2], { outline: false });
    const waiting = specs(g, 'oval', '#6d4c41', 'folded');
    waiting.position.set(Bk[0], Bk[1] + 0.08, Bk[2] + 0.02);
    waiting.rotation.x = -1.2;
    specs(g, 'round', '#c9a43a', 'folded').position.set(Bk[0] + 0.02, Bk[1] + 0.074, Bk[2] - 0.03);
    const pd = group(g, 0.25, L.top, -0.3);
    part(pd, rbox(0.14, 0.06, 0.08, 0.02), '#eceff1', 0, 0.06, 0);
    for (const sx of [-1, 1]) part(pd, cyl(0.016, 0.016, 0.04, 12), BLACK, sx * 0.035, 0.06, 0.05, { rx: Math.PI / 2, outline: false });
    part(pd, box(0.03, 0.03, 0.03), '#37474f', 0, 0.015, 0);
    for (let i = 0; i < 3; i++) part(g, box(0.1, 0.004, 0.07), '#fff8e1', -0.3, L.top + 0.003 + i * 0.004, 0.0, { ry: i * 0.1, outline: false });
    label(g, '도수 측정', 0.14, 0.035, -0.3, L.top + 0.4, -0.44, NAVY, '#ffffff');

    const use = group(g);
    out.inUse = use;
    const pair = specs(use, 'oval', '#6d4c41');
    const markDots = Array.from({ length: 3 }, (_, i) => {
      const m = ownGlow(use, ball(0.003), '#ff1744', 0, 0, 0);
      m.userData.i = i;
      return m;
    });
    const mark = marker(g, 0, 0.9, 0);
    const spots: Record<string, Spot> = { '*': spotAt(g, OP.LM_AT, 'stand', 'opLensmeter', mark) };
    out.spots = spots;
    out.work = marker(g, L.stage[0], L.stage[1], L.stage[2]);
    out.animate = (t) => {
      const ph0 = phaseOf(mark);
      const b = OP.lmBeat(t, ph0);
      const key = OP.opKeyOf('opLensmeter', t, ph0).key;
      const st = OP.lmGlasses(b);
      waiting.visible = st.where === 'basket';
      pair.visible = st.where !== 'basket';
      if (st.where === 'hand') {
        pair.position.copy(vp(b.from === 'set' ? key.r : key.r, 0.02));
        pair.rotation.set(0, Math.PI, 0);
      } else {
        // Lying on the stage, lens down, temples up and away from us; slid across for the other lens.
        pair.position.set(L.stage[0] + 0.042 - 0.084 * st.slide, L.stage[1] + 0.012, L.stage[2] + 0.01);
        pair.rotation.set(Math.PI / 2 - 0.25, 0, 0);
      }
      holder.rotation.x = -0.5 * (1 - OP.lmHolder(b));
      scr.show(OP.lmReading(b));
      markDots.forEach((d, i) => {
        d.visible = st.where === 'stage' && (b.from === 'mark' ? b.p > 0.5 : OP.lmReading(b) > 0 && b.from !== 'read');
        d.position.set(L.stage[0] + 0.042 - 0.084 * st.slide + (i - 1) * 0.008, L.stage[1] + 0.017, L.stage[2] + 0.01);
      });
    };
    whenIdle(out, g, () => {
      holder.rotation.x = 0;
      waiting.visible = true;
      scr.show(0);
    });
  },

  // ===========================================================================================
  // The contact-lens counter (2 × 1, against a wall).
  opContactCounter(g, _W, _D, _c, _def, _ctx, out) {
    const C = OP.CL;
    const zc = (-0.5 + C.front) / 2;
    const dc = C.front + 0.5;
    // The counter: white with a lit blue strip and the sign, a quartz top.
    part(g, rbox(1.94, C.top - 0.04, dc, 0.015), WHITE, 0, (C.top - 0.04) / 2, zc);
    part(g, rbox(1.98, 0.04, dc + 0.04, 0.012), '#eceff1', 0, C.top - 0.02, zc + 0.01);
    glowing(g, box(1.9, 0.02, 0.006), '#4fc3f7', 0, 0.12, C.front + 0.002);
    picture(g, painted('opContactSign', 512, 56, paintContactSign), 0.9, 0.1, 0, 0.62, C.front + 0.003);
    // The shelves on the wall over it: the boxes, each colour a line, the colour-lens poster in the middle.
    part(g, box(1.96, 0.92, 0.03), '#f5fbff', 0, 1.47, -0.485);
    const rnd = seeded(7);
    const BOXES = ['#29b6f6', '#66bb6a', '#ec407a', '#ffa726', '#7e57c2', '#26c6da', '#ef5350', '#9ccc65'];
    for (const y of C.rows) {
      part(g, box(1.94, 0.016, 0.2), WHITE, 0, y - 0.04, -0.39);
      for (const side of [-1, 1])
        for (let i = 0; i < 7; i++) {
          const x = side * (0.32 + i * 0.09);
          if (OP.SLOTS.some((s) => Math.abs(s[0] - x) < 0.05 && Math.abs(s[1] - y) < 0.01)) continue;
          const col = BOXES[Math.floor(rnd() * BOXES.length)];
          part(g, box(0.07, 0.06, 0.12), '#ffffff', x, y - 0.002, -0.38);
          part(g, box(0.071, 0.025, 0.121), col, x, y + 0.012, -0.38, { outline: false });
        }
    }
    picture(g, painted('opContactPoster', 256, 320, paintContactPoster), 0.44, 0.55, 0, 1.46, -0.466);
    part(g, rbox(0.48, 0.6, 0.02, 0.01), WHITE, 0, 1.46, -0.476);
    // On the counter: the round mirror turned to the customer, tissues, the sanitizer pump, trial lenses, saline, an eye model.
    const Mi = C.mirror;
    part(g, cyl(0.07, 0.08, 0.02, 18), CHROME, Mi[0], Mi[1] + 0.01, Mi[2]);
    part(g, cyl(0.008, 0.008, 0.2, 8), CHROME, Mi[0], Mi[1] + 0.12, Mi[2], { outline: false });
    part(g, cyl(0.13, 0.13, 0.016, 26), CHROME, Mi[0], Mi[1] + 0.33, Mi[2], { rx: Math.PI / 2 - 0.12 });
    const mf = new THREE.Mesh(cyl(0.118, 0.118, 0.004, 26), MIRROR);
    mf.position.set(Mi[0], Mi[1] + 0.33, Mi[2] + 0.01);
    mf.rotation.x = Math.PI / 2 - 0.12;
    g.add(mf);
    part(g, rbox(0.14, 0.07, 0.1, 0.012), '#f8bbd0', -0.75, C.top + 0.035, -0.12);
    part(g, rbox(0.06, 0.014, 0.04, 0.004), WHITE, -0.75, C.top + 0.075, -0.12, { outline: false });
    const Pu = C.pump;
    part(g, cyl(0.03, 0.03, 0.12, 14), '#e1f5fe', Pu[0], Pu[1] + 0.06, Pu[2]);
    part(g, cyl(0.008, 0.008, 0.04, 8), WHITE, Pu[0], Pu[1] + 0.14, Pu[2], { outline: false });
    part(g, box(0.04, 0.01, 0.012), WHITE, Pu[0], Pu[1] + 0.16, Pu[2] + 0.012, { outline: false });
    part(g, rbox(0.24, 0.02, 0.14, 0.006), '#eceff1', 0.18, C.top + 0.01, -0.12);
    for (let i = 0; i < 8; i++) part(g, rbox(0.04, 0.012, 0.03, 0.004), ['#29b6f6', '#ec407a'][i % 2], 0.1 + (i % 4) * 0.05, C.top + 0.026, -0.15 + Math.floor(i / 4) * 0.05, { outline: false });
    for (let i = 0; i < 3; i++) part(g, cyl(0.022, 0.022, 0.14, 12), ['#e3f2fd', '#e8f5e9', '#e3f2fd'][i], 0.82 + i * 0.05, C.top + 0.07, -0.22);
    const eye = group(g, 0.36, C.top, -0.22);
    part(eye, cyl(0.03, 0.04, 0.02, 14), '#455a64', 0, 0.01, 0);
    part(eye, ball(0.05), '#ffffff', 0, 0.07, 0);
    part(eye, cyl(0.022, 0.022, 0.006, 16), '#4e342e', 0, 0.07, 0.047, { rx: Math.PI / 2, outline: false });
    part(eye, cyl(0.01, 0.01, 0.008, 12), BLACK, 0, 0.07, 0.05, { rx: Math.PI / 2, outline: false });
    // The lens case left out on the counter, and the carton of new boxes.
    const caseIdle = group(g, C.case_[0], C.top, C.case_[2]);
    for (const sx of [-1, 1]) part(caseIdle, cyl(0.016, 0.016, 0.02, 14), sx > 0 ? '#29b6f6' : '#ffffff', sx * 0.02, 0.01, 0);
    const Ca = C.carton;
    part(g, box(0.26, 0.14, 0.2), '#c8a165', Ca[0], Ca[1] + 0.07, Ca[2]);
    for (const sx of [-1, 1]) part(g, box(0.12, 0.004, 0.2), '#b38b52', Ca[0] + sx * 0.14, Ca[1] + 0.15, Ca[2], { rz: sx * 0.6, outline: false });
    const inCarton = Array.from({ length: 3 }, (_, i) => part(g, box(0.07, 0.06, 0.11), BOXES[i * 2], Ca[0] - 0.08 + i * 0.08, Ca[1] + 0.12, Ca[2], { outline: false }));
    // The boxes that go onto the shelves (in their slots once shelved).
    const shelved = OP.SLOTS.map((s, i) => {
      const m = group(g, s[0], s[1] - 0.002, -0.38);
      part(m, box(0.07, 0.06, 0.12), '#ffffff', 0, 0, 0);
      part(m, box(0.071, 0.025, 0.121), BOXES[i * 2], 0, 0.014, 0, { outline: false });
      return m;
    });

    const use = group(g);
    out.inUse = use;
    const cust = standing(use, LOOKS.student, OP.CL_CUST.x, OP.CL_CUST.z, Math.PI);
    const tip = new THREE.Mesh(ball(0.012), SOFT_LENS);
    tip.scale.set(1, 0.45, 1);
    use.add(tip);
    const caseHeld = group(use);
    for (const sx of [-1, 1]) part(caseHeld, cyl(0.016, 0.016, 0.02, 14), sx > 0 ? '#29b6f6' : '#ffffff', sx * 0.02, 0, 0);
    const boxHeld = group(use);
    part(boxHeld, box(0.07, 0.06, 0.12), '#ffffff', 0, 0, 0);
    const boxBand = part(boxHeld, box(0.071, 0.025, 0.121), BOXES[0], 0, 0.014, 0, { outline: false });

    const mark = marker(g, 0, 0.9, 0);
    const spots: Record<string, Spot> = {
      opFitContacts: spotAt(g, OP.CL_AT, 'stand', 'opContacts', mark),
      opStockContacts: spotAt(g, OP.STOCK_AT, 'stand', 'opStock', mark),
      '*': spotAt(g, OP.CL_AT, 'stand', 'opContacts', mark),
    };
    out.spots = spots;
    out.work = mark;
    out.animate = (t) => {
      const m = nowMotion(spots, t, 'opContacts');
      const ph0 = phaseOf(mark);
      const key = OP.opKeyOf(m, t, ph0).key;
      tip.visible = caseHeld.visible = boxHeld.visible = false;
      caseIdle.visible = true;
      cust.root.visible = m === 'opContacts';
      shelved.forEach((s) => (s.visible = true));
      inCarton.forEach((s) => (s.visible = true));
      if (m === 'opStock') {
        const b = OP.stockBeat(t, ph0);
        const i = OP.boxHeld(b);
        const shelvedN = OP.boxesIn(b);
        shelved.forEach((s, j) => (s.visible = j < shelvedN));
        inCarton.forEach((s, j) => (s.visible = j >= shelvedN && j !== i));
        if (i >= 0) {
          boxHeld.visible = true;
          boxHeld.position.copy(vp(key.r, 0.0));
          boxBand.material = (shelved[i].children[1] as THREE.Mesh).material;
        }
        return;
      }
      const b = OP.clBeat(t, ph0);
      cust.armL(null);
      cust.armR(null);
      cust.eyes(blinkOf(t, 2));
      cust.mouth(0);
      cust.head.rotation.set(0, 0, 0);
      if (OP.lensOnTip(b)) {
        tip.visible = true;
        tip.position.copy(vp(key.r, 0.03));
        caseIdle.visible = false;
      }
      const F = OP.CL_FACE;
      if (b.from === 'tip' || b.from === 'demo') {
        // Watching the optician.
        cust.head.rotation.set(0, -0.6, 0);
      } else if (b.from === 'help') {
        // At the mirror: the lower lid down with one hand, the lens to the eye with the other.
        cust.head.rotation.set(0.12, 0, 0);
        cust.armL(v3(F[0] - 0.035, F[1] - 0.04, F[2] - 0.02));
        cust.armR(v3(F[0] + 0.03, F[1] + 0.0, F[2] - 0.05 + 0.02 * Math.sin(t * 2)));
        tip.visible = true;
        tip.position.set(F[0] + 0.03, F[1] + 0.012, F[2] - 0.08);
      } else if (b.from === 'blink') {
        cust.eyes(Math.sin(t * 9) > 0.4);
        cust.head.rotation.set(0, 0.3 * Math.sin(t * 1.5), 0);
        chatter(cust, t, 0.5, 2);
      } else if (b.from === 'case') {
        caseIdle.visible = false;
        caseHeld.visible = true;
        caseHeld.position.copy(vp(key.r, 0.02));
        cust.head.rotation.set(0.2, -0.5, 0);
        if (b.p > 0.6) cust.armR(vp(key.r, 0.0));
      }
    };
    whenIdle(out, g, () => {
      caseIdle.visible = true;
      shelved.forEach((m) => (m.visible = true));
      inCarton.forEach((m) => (m.visible = true));
    });
  },

  // ===========================================================================================
  // The try-on mirror (1 × 1, against a wall).
  opTryMirror(g, _W, _D, _c, _def, _ctx, out) {
    const T = OP.TRY;
    // The console: slim legs, a drawer, the velvet tray of frames, the little sign.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.016, 0.012, T.top - 0.03, 8), OAK_D, sx * 0.36, (T.top - 0.03) / 2, -0.28 + sz * 0.14);
    part(g, rbox(0.8, 0.035, 0.36, 0.012), OAK, 0, T.top - 0.017, -0.28);
    part(g, box(0.7, 0.08, 0.3), OAK, 0, T.top - 0.08, -0.28);
    part(g, box(0.12, 0.012, 0.02), '#c9a43a', 0, T.top - 0.08, -0.12, { outline: false });
    const Tr = T.tray;
    part(g, rbox(0.34, 0.025, 0.16, 0.008), '#4a148c', Tr[0], Tr[1] + 0.012, Tr[2]);
    const trayFrames: THREE.Group[] = [];
    const TRY_FRAMES: Array<[Rim, string]> = [['round', '#c9a43a'], ['square', '#212121'], ['oval', '#8d6e63'], ['square', '#b71c1c']];
    TRY_FRAMES.forEach(([k, c], i) => {
      const f = specs(g, k, c, 'folded');
      f.position.set(Tr[0] - 0.12 + i * 0.08, Tr[1] + 0.03, Tr[2] + 0.02);
      f.rotation.set(-1.3, 0, 0);
      f.scale.setScalar(0.85);
      trayFrames.push(f);
    });
    const tent = group(g, -0.24, T.top, -0.2, 0.25);
    for (const sz of [-1, 1]) part(tent, box(0.16, 0.09, 0.003), '#fffdf7', 0, 0.04, sz * 0.018, { rx: sz * 0.4, outline: false });
    picture(tent, painted('opTrySign', 256, 128, paintTrySign), 0.15, 0.075, 0, 0.042, 0.036, '#ffffff', 0, -0.4);
    part(g, rbox(0.12, 0.06, 0.08, 0.01), '#e1f5fe', 0.3, T.top + 0.03, -0.36);
    // The mirror on the wall: a tall pane in an oak frame, a light bar over it.
    part(g, rbox(0.62, 1.0, 0.04, 0.02), OAK, 0, 1.47, -0.47);
    const pane = new THREE.Mesh(box(0.54, 0.92, 0.006), MIRROR);
    pane.position.set(0, 1.47, -0.447);
    g.add(pane);
    for (let i = 0; i < 3; i++) part(g, box(0.04 + i * 0.02, 0.5, 0.002), '#ffffff', -0.12 + i * 0.1, 1.55 - i * 0.05, -0.443, { rz: 0.5, outline: false });
    part(g, rbox(0.5, 0.04, 0.06, 0.01), '#eceff1', 0, 2.0, -0.44);
    glowing(g, box(0.44, 0.012, 0.01), '#fffde7', 0, 1.98, -0.41);

    const use = group(g);
    out.inUse = use;
    const cust = standing(use, LOOKS.office, OP.TRY_CUST.x, OP.TRY_CUST.z, Math.PI);
    const variants = TRY_FRAMES.map(([k, c]) => ({ mine: specs(use, k, c), face: worn(cust, k, c) }));
    const mark = marker(g, 0, 0.9, 0);
    const spots: Record<string, Spot> = { '*': spotAt(g, OP.TRY_AT, 'stand', 'opTryOn', mark) };
    out.spots = spots;
    out.work = mark;
    out.animate = (t) => {
      const ph0 = phaseOf(mark);
      const b = OP.tryBeat(t, ph0);
      const key = OP.opKeyOf('opTryOn', t, ph0).key;
      const k = ((b.n % TRY_FRAMES.length) + TRY_FRAMES.length) % TRY_FRAMES.length;
      const where = OP.tryFrame(b);
      trayFrames.forEach((f, i) => (f.visible = i !== k || where === 'tray'));
      variants.forEach((v, i) => {
        v.mine.visible = i === k && (where === 'mine' || where === 'theirs');
        v.face.visible = i === k && where === 'face';
      });
      const F = OP.TRY_FACE;
      const v = variants[k];
      cust.armL(null);
      cust.armR(null);
      cust.head.rotation.set(0, 0, 0);
      cust.eyes(blinkOf(t, 5));
      cust.mouth(0);
      if (where === 'mine') {
        v.mine.position.copy(vp(key.r, 0.03));
        v.mine.rotation.set(0, Math.PI, 0);
      }
      if (where === 'theirs') {
        // In the customer's two hands, going up to (or down from) the face.
        const up = b.from === 'puton' ? OP.ss(b.p, 0.25, 0.85) : 1 - OP.ss(b.p, 0.3, 0.65);
        const at = v3(F[0], mix(1.2, F[1], up), F[2] - mix(0.12, 0.01, up));
        v.mine.position.copy(at);
        v.mine.rotation.set(0, Math.PI, 0);
        cust.armL(at.clone().add(v3(-0.07, 0, 0)));
        cust.armR(at.clone().add(v3(0.07, 0, 0)));
      }
      if (b.from === 'offer') cust.armR(vp(OP.OFFER, -0.02));
      if (b.from === 'look') {
        cust.head.rotation.set(0, 0.4 * Math.sin(b.p * Math.PI * 2), 0);
        chatter(cust, t, 0.4, 5);
      }
      if (b.from === 'point') {
        cust.head.rotation.set(0, -0.5, 0);
        cust.mouth(0.4 * Math.max(0, Math.sin(t * 5)));
      }
    };
    whenIdle(out, g, () => trayFrames.forEach((f) => (f.visible = true)));
  },

  // ===========================================================================================
  // The ultrasonic cleaner (1 × 1).
  opUltraCleaner(g, _W, _D, _c, _def, _ctx, out) {
    const U = OP.UC;
    part(g, rbox(0.72, U.top - 0.04, 0.5, 0.02), WHITE, 0, (U.top - 0.04) / 2, -0.15);
    part(g, rbox(0.76, 0.04, 0.54, 0.012), OAK, 0, U.top - 0.02, -0.14);
    part(g, box(0.62, 0.003, 0.004), '#d0d0d0', 0, 0.5, 0.101, { outline: false });
    // The bath: steel, the water, the basket, the clear lid on its hinge, the display and buttons.
    const B = U.bath;
    part(g, rbox(0.28, 0.13, 0.22, 0.015), CHROME, B[0], B[1] + 0.065, B[2]);
    part(g, box(0.24, 0.004, 0.18), '#455a64', B[0], B[1] + 0.128, B[2], { outline: false });
    const water = new THREE.Mesh(box(0.235, 0.004, 0.175), WATER);
    water.position.set(B[0], B[1] + 0.124, B[2]);
    g.add(water);
    part(g, box(0.2, 0.004, 0.14), STEEL, B[0], B[1] + 0.11, B[2], { outline: false });
    const lid = group(g, B[0], B[1] + 0.135, U.hingeZ);
    const lidM = new THREE.Mesh(box(0.26, 0.008, 0.21), SMOKY);
    lidM.position.set(0, 0.004, 0.105);
    lid.add(lidM);
    part(lid, box(0.06, 0.012, 0.016), '#37474f', 0, 0.01, 0.2);
    const disp = swapScreen(g, [painted('opUc0', 128, 48, paintUc(false)), painted('opUc1', 128, 48, paintUc(true))], 0.08, 0.03, B[0] + 0.05, B[1] + 0.07, B[2] + 0.112);
    part(g, rbox(0.03, 0.02, 0.012, 0.004), '#e53935', U.btn[0], U.btn[1] - 0.015, U.btn[2]);
    part(g, rbox(0.1, 0.06, 0.12, 0.012), '#eceff1', U.btn[0], U.top + 0.03, U.btn[2] - 0.06);
    // The sign, the spray, the cloth, the little organiser of screws and pads, an air blower.
    const tent = group(g, 0.2, U.top, -0.25, -0.2);
    for (const sz of [-1, 1]) part(tent, box(0.18, 0.1, 0.003), '#e3f2fd', 0, 0.045, sz * 0.02, { rx: sz * 0.4, outline: false });
    picture(tent, painted('opCleanSign', 256, 128, paintCleanSign), 0.17, 0.085, 0, 0.046, 0.04, '#ffffff', 0, -0.4);
    part(g, cyl(0.022, 0.022, 0.12, 12), '#4fc3f7', -0.3, U.top + 0.06, -0.3);
    part(g, rbox(0.03, 0.03, 0.04, 0.008), WHITE, -0.3, U.top + 0.13, -0.295);
    const clothIdle = part(g, rbox(0.12, 0.006, 0.1, 0.003), '#ffcc80', U.cloth[0], U.cloth[1] + 0.004, U.cloth[2], { outline: false });
    part(g, rbox(0.14, 0.03, 0.08, 0.006), '#eceff1', -0.24, U.top + 0.015, 0.1);
    for (let i = 0; i < 8; i++) part(g, box(0.028, 0.004, 0.03), ['#b0bec5', '#e1f5fe'][i % 2], -0.29 + (i % 4) * 0.034, U.top + 0.032, 0.083 + Math.floor(i / 4) * 0.035, { outline: false });
    part(g, cyl(0.03, 0.022, 0.08, 12), '#212121', 0.3, U.top + 0.04, -0.1);

    const use = group(g);
    out.inUse = use;
    const pair = specs(use, 'round', '#6d4c41');
    const basket = group(use);
    part(basket, box(0.16, 0.004, 0.1), STEEL, 0, 0, 0, { outline: false });
    for (const sx of [-1, 1]) part(basket, box(0.004, 0.08, 0.004), STEEL, sx * 0.07, 0.04, 0, { outline: false });
    const cloth = part(use, rbox(0.1, 0.01, 0.08, 0.004), '#ffcc80', 0, 0, 0, { outline: false });
    const bubblesM = Array.from({ length: 8 }, () => {
      const m = new THREE.Mesh(ball(0.006), BUBBLE);
      use.add(m);
      return m;
    });
    const drips = Array.from({ length: 3 }, () => {
      const m = new THREE.Mesh(ball(0.005), WATER);
      use.add(m);
      return m;
    });
    const mark = marker(g, 0, 0.9, 0);
    const spots: Record<string, Spot> = { '*': spotAt(g, OP.UC_AT, 'stand', 'opClean', mark) };
    out.spots = spots;
    out.work = marker(g, B[0], B[1] + 0.13, B[2]);
    out.animate = (t) => {
      const ph0 = phaseOf(mark);
      const b = OP.cleanBeat(t, ph0);
      const key = OP.opKeyOf('opClean', t, ph0).key;
      lid.rotation.x = -1.3 * OP.ucLid(b);
      const buzz = OP.ucBuzz(b);
      disp.show(buzz > 0 ? 1 : 0);
      water.position.y = B[1] + 0.124 + 0.002 * Math.sin(t * 60) * buzz;
      const where = OP.ucGlasses(b);
      pair.visible = where !== 'counter';
      basket.visible = where === 'bath' || (b.from === 'lift' || b.from === 'dip');
      const inBath = v3(B[0], B[1] + 0.1, B[2]);
      if (where === 'bath') {
        pair.position.copy(inBath).add(v3(0, 0.012, 0));
        pair.rotation.set(-Math.PI / 2 + 0.2, 0, 0);
        basket.position.copy(inBath);
      } else if (where === 'hand') {
        const at = b.from === 'dry' ? vp(OP.mixP(key.l, key.r, 0.6), 0.02) : vp(key.r, 0.01);
        pair.position.copy(at);
        pair.rotation.set(0, Math.PI, 0);
        basket.position.copy(vp(key.r, -0.04));
        if (b.from !== 'dip' && b.from !== 'lift') basket.visible = false;
      }
      bubblesM.forEach((m, i) => {
        const u = (t * 1.5 + i / bubblesM.length) % 1;
        m.visible = buzz > 0.05;
        m.position.set(B[0] - 0.09 + (i % 4) * 0.06, B[1] + 0.06 + u * 0.06, B[2] - 0.05 + Math.floor(i / 4) * 0.08);
      });
      drips.forEach((d, i) => {
        const u = (t * 1.8 + i / drips.length) % 1;
        d.visible = OP.ucDrip(b);
        d.position.copy(pair.position).add(v3((i - 1) * 0.03, -0.02 - u * 0.12, 0));
      });
      cloth.visible = b.from === 'dry';
      clothIdle.visible = !cloth.visible;
      if (cloth.visible) {
        cloth.position.copy(vp(key.l, 0.01));
        cloth.rotation.set(1.2, 0, 0);
      }
    };
    whenIdle(out, g, () => {
      lid.rotation.x = 0;
      disp.show(0);
      water.position.y = B[1] + 0.124;
      clothIdle.visible = true;
    });
  },

  // ===========================================================================================
  // The lens price board (2 × 1, decor): the board on the wall, a low cabinet of cut-away lenses.
  opLensBoard(g) {
    part(g, rbox(1.84, 0.68, 0.38, 0.015), PALE, 0, 0.34, -0.3);
    part(g, rbox(1.88, 0.03, 0.42, 0.01), OAK, 0, 0.695, -0.29);
    for (const sx of [-1, 1]) part(g, box(0.86, 0.003, 0.004), '#cfc6b4', sx * 0.46, 0.4, -0.108, { outline: false });
    // The board, framed, lit by a strip over it.
    part(g, rbox(1.76, 0.9, 0.04, 0.012), NAVY, 0, 1.5, -0.47);
    picture(g, painted('opBoard', 640, 320, paintBoard), 1.68, 0.84, 0, 1.5, -0.448);
    part(g, rbox(1.2, 0.04, 0.08, 0.01), '#eceff1', 0, 2.0, -0.44);
    glowing(g, box(1.1, 0.012, 0.01), '#fffde7', 0, 1.98, -0.4);
    // The cut-away lenses in their stands, thinner as the index goes up, each labelled.
    const idx = [['1.56', 0.026], ['1.60', 0.02], ['1.67', 0.015], ['1.74', 0.011]] as const;
    idx.forEach(([s, th], i) => {
      const x = -0.7 + i * 0.22;
      part(g, rbox(0.12, 0.03, 0.08, 0.008), '#37474f', x, 0.725, -0.22);
      const l = glass(g, cyl(0.045, 0.045, th, 22), x, 0.8, -0.22, GLASS);
      l.rotation.x = Math.PI / 2;
      part(g, ring45(0.045, th), '#90caf9', x, 0.8, -0.22, { rx: Math.PI / 2, outline: false });
      label(g, s, 0.08, 0.025, x, 0.725, -0.179, '#37474f', '#ffffff');
    });
    // The blue-light demo: a torch shining through two lenses onto a card.
    const demo = group(g, 0.42, 0.71, -0.22);
    part(demo, rbox(0.34, 0.03, 0.14, 0.008), '#eceff1', 0, 0.015, 0);
    part(demo, cyl(0.018, 0.018, 0.1, 12), BLACK, -0.12, 0.06, 0, { rz: Math.PI / 2 });
    glowing(demo, cyl(0.014, 0.014, 0.004, 12), '#536dfe', -0.07, 0.06, 0, Math.PI / 2).rotation.z = Math.PI / 2;
    const beam = new THREE.Mesh(cyl(0.012, 0.03, 0.14, 12), new THREE.MeshBasicMaterial({ color: '#536dfe', transparent: true, opacity: 0.25, depthWrite: false }));
    beam.userData.ownMaterial = true;
    beam.rotation.z = Math.PI / 2;
    beam.position.set(0.0, 0.06, 0);
    demo.add(beam);
    part(demo, rbox(0.02, 0.1, 0.08, 0.006), '#ffecb3', 0.02, 0.07, 0);
    part(demo, rbox(0.01, 0.1, 0.08, 0.004), WHITE, 0.14, 0.07, 0);
    label(demo, '블루라이트 차단', 0.16, 0.03, 0, 0.0155, 0.071, '#eceff1', '#3949ab');
    // Brochures in a stand at the end.
    part(g, rbox(0.14, 0.22, 0.08, 0.01), '#cfd8dc', 0.82, 0.82, -0.24);
    for (let i = 0; i < 3; i++) part(g, box(0.11, 0.16, 0.006), ['#e3f2fd', '#fce4ec', '#e8f5e9'][i], 0.82, 0.86, -0.22 + i * 0.012, { rx: -0.1, outline: false });
  },
};
/** A lens's edge ring (its thickness showing). */
function ring45(r: number, th: number): THREE.BufferGeometry {
  return shape(`edge${r}${th}`, () => new THREE.CylinderGeometry(r, r, th, 22, 1, true));
}

