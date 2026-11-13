import * as THREE from 'three';
import type { Motion } from '../activity';
import { marker, rod, spot, type Builder, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, caster, glass, glowing, label, painted, picture, ring, seeded, text, type Paint } from './doctor';
import * as RG from './radiographerMotion';

/**
 * The 영상의학센터 drawn as itself (2026-10-27 workplace pipeline, at the user's request): clinical
 * white and pale grey with a blue line, lead-grey screens with their greenish lead glass, the yellow
 * trefoil and the red 촬영 중 lamps. The chest stand with its detector, grips and painted feet, the
 * ceiling-high tube column and collimator, a lead screen with the generator's console and the hand
 * switch behind it; the CT's gantry with its lit bore, lasers, buttons and breathing display over a
 * table that rises and slides, its console behind lead glass in the corner; the MRI's big magnet
 * (3.0T, 자기장 주의), the head coil, headphones and squeeze ball; the linac's drum and the gantry
 * that swings right round the couch, the green lasers, its pendant, CCTV and BEAM ON. And what the
 * centre was missing (workFurniture/radiographer.ts): the control-room console behind its lead-glass
 * window, the lead apron rack, the contrast injector, the changing booth with its gowns, the
 * radiation warning sign with its lamp.
 *
 * The centre (한빛영상의학센터), its machines' names and everyone in it are made up. What the
 * radiographer does and what the machines do go by one clock (radiographerMotion.ts): the table
 * slides as the button's held, the slices come up as the scan runs, the gantry turns while the beam
 * is on. Moving parts are drawn twice — at rest in `idle` and moving in `inUse` — so nothing's left
 * halfway when the work stops.
 */

const CENTRE = '한빛영상의학센터';
const MACH = '#eef1f4';
const MACH_D = '#d3dae0';
const MACH_DD = '#aeb8c1';
const ACCENT = '#1e88e5';
const NAVY = '#263c5a';
const LEAD = '#8d99a5';
const LEAD_D = '#6f7b87';
const PAD = '#5f7d95';
const SKIN = '#ecc6a3';
const GOWN = '#b9d7ea';
const GOWN_D = '#8fb4cf';
const RED = '#e53935';
const LASER_R = '#ff1744';
const LASER_G = '#00e676';
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const vp = (p: RG.P, dy = 0) => new THREE.Vector3(p[0], p[1] + dy, p[2]);
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
/** A spot from the motions' table, and what's done there; `work` is the piece's fixed clock mark. */
function spotAt(g: THREE.Object3D, s: RG.SpotAt, how: 'sit' | 'stand', motion: Motion, work: THREE.Object3D): Spot {
  const p = spot(g, how, s.x, s.y, s.z, s.yaw, how === 'sit' ? s.y : undefined);
  p.work = work;
  p.motion = motion;
  return p;
}
/** Moves a spot's marker to where the motion has the radiographer now (stepping to the console and back). */
function moveSpot(s: Spot, a: RG.SpotAt) {
  s.at.position.set(a.x, a.y, a.z);
  s.at.rotation.y = a.yaw;
}
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
/** Which of a piece's uses is going on now (the spot a dweller's been posed at just now, the latest). */
function nowAt(spots: Record<string, Spot>, t: number): string | null {
  let best: string | null = null;
  for (const [k, s] of Object.entries(spots)) if (Math.abs(t - posedAt(s)) < 0.6 && (best === null || posedAt(s) > posedAt(spots[best]))) best = k;
  return best;
}
const tmp = new THREE.Vector3();
const phaseOf = (m: THREE.Object3D) => RG.rgPhase(m.getWorldPosition(tmp));
/** A cylinder stretched between two points each frame (an arm, a leg, a line). */
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
/** A lit part with a material of its own (shown, hidden, faded). */
function ownGlow(g: THREE.Object3D, geom: THREE.BufferGeometry, color: string, x: number, y: number, z: number, opacity = 1): THREE.Mesh {
  const m = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }));
  m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
const fade = (m: THREE.Mesh, k: number, max = 1) => {
  m.visible = k > 0.01;
  (m.material as THREE.MeshBasicMaterial).opacity = max * k;
};
/** A picture whose texture is swapped as it changes (a slice coming up). */
const show = (m: THREE.Mesh, tex: THREE.Texture) => {
  const mat = m.material as THREE.MeshBasicMaterial;
  if (mat.map !== tex) mat.map = tex;
};
/** A picture facing +x (on a face looking along x). */
const facingX = (g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, sign = 1, color = '#ffffff') => picture(g, tex, w, h, x, y, z, color, (sign * Math.PI) / 2);
/** Lead glass: faintly green, heavy-looking. */
const LEAD_GLASS = new THREE.MeshToonMaterial({ color: '#cfe6c8', transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide });
/** MRI window glass, the copper mesh of the RF shield in it. */
const RF_GLASS = new THREE.MeshToonMaterial({ color: '#f2d7b8', transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide });
const CLEAR = new THREE.MeshToonMaterial({ color: '#eaf6fb', transparent: true, opacity: 0.45, depthWrite: false });
const CONTRAST = new THREE.MeshBasicMaterial({ color: '#fff1b8', transparent: true, opacity: 0.85 });
const SALINE = new THREE.MeshBasicMaterial({ color: '#c8ecfb', transparent: true, opacity: 0.8 });

/** A rounded slab with a round hole through it (a gantry's or magnet's face), extruded `depth` along -x from x = 0. */
function holed(w: number, h: number, corner: number, holeY: number, holeR: number, depth: number): THREE.ExtrudeGeometry {
  const s = new THREE.Shape();
  const x0 = -w / 2;
  const x1 = w / 2;
  const r = corner;
  s.moveTo(x0 + 0.05, 0);
  s.lineTo(x1 - 0.05, 0);
  s.quadraticCurveTo(x1, 0, x1, 0.05);
  s.lineTo(x1, h - r);
  s.quadraticCurveTo(x1, h, x1 - r, h);
  s.lineTo(x0 + r, h);
  s.quadraticCurveTo(x0, h, x0, h - r);
  s.lineTo(x0, 0.05);
  s.quadraticCurveTo(x0, 0, x0 + 0.05, 0);
  const hole = new THREE.Path();
  hole.absarc(0, holeY, holeR, 0, Math.PI * 2, true);
  s.holes.push(hole);
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 28 });
}
/** The slab placed in a piece: its face at x `face`, its middle across at z, going back (-x) `depth`. */
function slab(g: THREE.Object3D, geom: THREE.ExtrudeGeometry, color: string, face: number, z: number, depth: number): THREE.Mesh {
  const m = part(g, geom, color, face - depth, 0, z, { outline: false, ry: Math.PI / 2 });
  m.userData.ownGeometry = true;
  // Extruded along its +z, which (turned a quarter) runs along +x from face - depth to face.
  return m;
}
/** The inside of a bore (a tube seen from inside), along x from `x0` to `x1`. */
function bore(g: THREE.Object3D, x0: number, x1: number, y: number, z: number, r: number, color: string): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, x1 - x0, 32, 1, true), new THREE.MeshToonMaterial({ color, side: THREE.BackSide }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set((x0 + x1) / 2, y, z);
  m.rotation.z = Math.PI / 2;
  g.add(m);
  return m;
}
/** A lit tube inside a bore, faded up as it lights. */
function boreLight(g: THREE.Object3D, x0: number, x1: number, y: number, z: number, r: number, color: string): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, x1 - x0, 32, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, side: THREE.BackSide, depthWrite: false }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set((x0 + x1) / 2, y, z);
  m.rotation.z = Math.PI / 2;
  g.add(m);
  return m;
}

// ---------------------------------------------------------------------------------------------
// People drawn in: the patients, in the centre's gown.

interface Look {
  hair: string;
  hairdo: 'short' | 'bob' | 'grey' | 'long';
  bottom: string;
  skin?: string;
  gown?: string;
  glasses?: boolean;
}
const LOOKS = {
  man: { hair: '#2b2018', hairdo: 'short', bottom: '#5d6d7e', glasses: true } as Look,
  woman: { hair: '#3b2a20', hairdo: 'bob', bottom: '#6d7f8d', skin: '#f1cfb0' } as Look,
  elder: { hair: '#c9c4bd', hairdo: 'grey', bottom: '#5f5a6b', skin: '#e3bf9f' } as Look,
  young: { hair: '#1a1a1a', hairdo: 'long', bottom: '#4a5a6a', skin: '#f3d2b5', gown: '#c5dbe9' } as Look,
  worker: { hair: '#111111', hairdo: 'short', bottom: '#3d4f5f', skin: '#d9ad86' } as Look,
};
interface Fig {
  root: THREE.Group;
  upper: THREE.Group;
  head: THREE.Group;
  /** Puts a hand at a point in the figure's own frame (stood at the origin facing +z), or back at rest. */
  armL(to: THREE.Vector3 | null): void;
  armR(to: THREE.Vector3 | null): void;
  eyes(shut: boolean): void;
  mouth(open: number): void;
}
/** Where a hand rests, in the figure's frame (hanging at the side). */
const REST = (sx: number) => v3(sx * 0.23, 0.82, 0.05);
/**
 * A patient in the centre's gown (pale blue with a fine print, tied at the side), trousers and
 * slippers, built stood with the feet at the origin facing +z. The arms are worked out each pose.
 */
function patient(parent: THREE.Object3D, look: Look): Fig {
  const root = group(parent);
  const skin = look.skin ?? SKIN;
  const gown = look.gown ?? GOWN;
  for (const sx of [1, -1]) {
    part(root, cyl(0.062, 0.055, 0.42, 8), look.bottom, sx * 0.09, 0.64, 0, { outline: false });
    part(root, cyl(0.054, 0.048, 0.4, 8), look.bottom, sx * 0.09, 0.27, 0, { outline: false });
    part(root, rbox(0.1, 0.06, 0.22, 0.03), '#9fb6c8', sx * 0.09, 0.035, 0.04);
  }
  part(root, rbox(0.31, 0.16, 0.24, 0.06), look.bottom, 0, 0.86, 0);
  const upper = group(root, 0, 0.84, 0);
  part(upper, rbox(0.35, 0.47, 0.215, 0.08), gown, 0, 0.27, 0);
  // The gown's hem flaring over the hips, its ties at the side, the fine print.
  part(upper, rbox(0.37, 0.16, 0.235, 0.06), gown, 0, 0.02, 0);
  part(upper, box(0.004, 0.06, 0.05), GOWN_D, 0.18, 0.2, 0.06, { outline: false });
  part(upper, box(0.004, 0.06, 0.05), GOWN_D, 0.18, 0.17, 0.08, { outline: false, rz: 0.4 });
  const rnd = seeded(look.hair.length * 977 + look.bottom.charCodeAt(2));
  for (let i = 0; i < 10; i++) part(upper, box(0.018, 0.018, 0.003), GOWN_D, (rnd() - 0.5) * 0.28, 0.06 + rnd() * 0.38, 0.109, { outline: false });
  part(upper, box(0.12, 0.05, 0.006), skin, 0, 0.46, 0.106, { outline: false });
  part(upper, cyl(0.045, 0.05, 0.08, 10), skin, 0, 0.53, 0, { outline: false });
  const head = group(upper, 0, 0.67, 0);
  part(head, ball(0.112), skin, 0, 0, 0);
  const eyesM = [1, -1].map((sx) => part(head, box(0.022, 0.016, 0.006), '#2b2b30', sx * 0.04, 0.0, 0.106, { outline: false }));
  for (const sx of [-1, 1]) part(head, ball(0.018), '#f2a7a0', sx * 0.065, -0.03, 0.088, { outline: false }).scale.set(1, 0.6, 0.4);
  const mouthM = part(head, box(0.034, 0.01, 0.006), '#8d4f47', 0, -0.05, 0.104, { outline: false });
  switch (look.hairdo) {
    case 'bob':
      part(head, ball(0.121), look.hair, 0, 0.02, -0.025);
      part(head, rbox(0.25, 0.14, 0.18, 0.06), look.hair, 0, -0.04, -0.03);
      part(head, rbox(0.21, 0.05, 0.05, 0.02), look.hair, 0, 0.08, 0.08, { rx: -0.2 });
      break;
    case 'long':
      part(head, ball(0.12), look.hair, 0, 0.025, -0.025);
      part(head, rbox(0.24, 0.3, 0.1, 0.05), look.hair, 0, -0.12, -0.07);
      part(head, rbox(0.21, 0.05, 0.05, 0.02), look.hair, 0, 0.08, 0.08, { rx: -0.2 });
      break;
    case 'grey':
      part(head, ball(0.117), look.hair, 0, 0.02, -0.035);
      part(head, ball(0.1), skin, 0, 0.05, 0.022, { outline: false });
      break;
    default:
      part(head, ball(0.118), look.hair, 0, 0.03, -0.03);
      part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0, 0.075, 0.075, { rx: -0.25 });
  }
  if (look.glasses) {
    for (const sx of [-1, 1]) part(head, ring(0.024, 0.003), '#37474f', sx * 0.042, 0.002, 0.11);
    part(head, box(0.02, 0.004, 0.004), '#37474f', 0, 0.002, 0.112, { outline: false });
  }
  const m4 = new THREE.Matrix4();
  const arm = (sx: number) => {
    const shoulder = v3(sx * 0.2, 0.47, 0);
    const upperArm = limb(upper, 0.044, gown);
    const fore = limb(upper, 0.035, skin);
    const hand = part(upper, ball(0.036), skin, 0, 0, 0, { outline: false });
    const loc = new THREE.Vector3();
    const elbow = new THREE.Vector3();
    const d = new THREE.Vector3();
    const bend = new THREE.Vector3();
    return (to: THREE.Vector3 | null) => {
      upper.updateMatrix();
      m4.copy(upper.matrix).invert();
      loc.copy(to ?? REST(sx)).applyMatrix4(m4);
      d.subVectors(loc, shoulder);
      const L = Math.min(0.5, Math.max(0.12, d.length()));
      d.normalize();
      loc.copy(shoulder).addScaledVector(d, L);
      const a = 0.27;
      const b = 0.25;
      const cosA = THREE.MathUtils.clamp((a * a + L * L - b * b) / (2 * a * L), -1, 1);
      bend.set(sx * 0.7, -1, -0.3).normalize();
      bend.addScaledVector(d, -bend.dot(d)).normalize();
      elbow.copy(shoulder).addScaledVector(d, a * cosA).addScaledVector(bend, a * Math.sqrt(1 - cosA * cosA));
      upperArm(shoulder, elbow);
      fore(elbow, loc);
      hand.position.copy(loc);
    };
  };
  const armL = arm(1);
  const armR = arm(-1);
  armL(null);
  armR(null);
  return {
    root,
    upper,
    head,
    armL,
    armR,
    eyes: (shut) => eyesM.forEach((e) => e.scale.set(1, shut ? 0.22 : 1, 1)),
    mouth: (open) => mouthM.scale.set(1 - 0.3 * open, 1 + 3 * open, 1),
  };
}
/** A patient lying face up along a table's x (the head toward -x), their feet at `feet`, on a top at y = 0 of `parent`. */
function lying(parent: THREE.Object3D, look: Look, feet: number, k = 0.92): Fig {
  const f = patient(parent, look);
  f.root.rotation.order = 'YXZ';
  f.root.rotation.set(-Math.PI / 2, Math.PI / 2, 0);
  f.root.scale.setScalar(k);
  f.root.position.set(feet, 0.105 * k, 0);
  // The hands by the hips, palms down on the mattress.
  f.armL(v3(0.25, 0.84, -0.02));
  f.armR(v3(-0.25, 0.84, -0.02));
  return f;
}

// ---------------------------------------------------------------------------------------------
// What's painted on the screens, the films and the signs.

const FILL = (c: CanvasRenderingContext2D, w: number, h: number, bg: string) => {
  c.fillStyle = bg;
  c.fillRect(0, 0, w, h);
};
const ell = (c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string, rot = 0) => {
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), rot, 0, Math.PI * 2);
  c.fill();
};
const bone = (a: number) => `rgba(236,236,230,${a})`;
/** A PA chest film: the lungs dark, ribs, spine, collarbones, the heart's shadow, the R marker. */
const paintChest: Paint = (c) => {
  FILL(c, 160, 192, '#060606');
  ell(c, 80, 112, 74, 92, '#3a3a3a');
  for (const sx of [-1, 1]) ell(c, 80 + sx * 31, 98, 26, 58, '#111111', sx * -0.08);
  ell(c, 90, 128, 30, 26, bone(0.45), -0.3);
  c.fillStyle = bone(0.5);
  c.fillRect(74, 18, 12, 174);
  c.strokeStyle = bone(0.42);
  c.lineWidth = 3;
  for (let i = 0; i < 8; i++)
    for (const sx of [-1, 1]) {
      c.beginPath();
      c.ellipse(80 + sx * 32, 52 + i * 15, 34, 10, 0, sx > 0 ? Math.PI * 1.05 : -0.05, sx > 0 ? Math.PI * 2.02 : Math.PI * 0.98);
      c.stroke();
    }
  c.lineWidth = 5;
  c.strokeStyle = bone(0.55);
  for (const sx of [-1, 1]) {
    c.beginPath();
    c.moveTo(80 + sx * 8, 34);
    c.quadraticCurveTo(80 + sx * 34, 26, 80 + sx * 66, 34);
    c.stroke();
  }
  text(c, 'R', 14, 18, 16, '#ffffff', 'left');
  text(c, 'PA', 146, 18, 11, '#bdbdbd', 'right', false);
};
/** An axial CT slice of the chest at depth `u` (0 the top of the lungs … 1 the liver), with contrast or not; or a head. */
function paintSlice(kind: 'chest' | 'contrast' | 'head', u: number): Paint {
  return (c) => {
    FILL(c, 160, 160, '#000000');
    if (kind === 'head') {
      // The skull, the brain's grey, the ventricles; the eyes in the lowest slices.
      const r = 52 + 10 * Math.sin(u * Math.PI);
      ell(c, 80, 82, r + 6, r * 1.15 + 6, bone(0.95));
      ell(c, 80, 82, r, r * 1.15, '#6e6e6e');
      ell(c, 80, 82, r * 0.82, r * 0.95, '#7d7d7d');
      if (u > 0.25 && u < 0.8) for (const sx of [-1, 1]) ell(c, 80 + sx * 8, 78, 5, 18 * (1 - Math.abs(u - 0.5)), '#2a2a2a', sx * 0.3);
      if (u < 0.3) for (const sx of [-1, 1]) ell(c, 80 + sx * 22, 30, 9, 8, '#3a3a3a');
      text(c, `${Math.round(u * 120)} mm`, 154, 152, 9, '#9e9e9e', 'right', false);
      return;
    }
    const w = 64 + 6 * u;
    ell(c, 80, 84, w, 50, '#7a7a7a');
    ell(c, 80, 84, w - 4, 46, '#8f8f8f');
    // The lungs shrinking as the liver comes up from below.
    const lung = Math.max(0, 1 - u * 1.15);
    for (const sx of [-1, 1]) ell(c, 80 + sx * 30, 80, 22 * (0.4 + 0.6 * lung), 32 * (0.3 + 0.7 * lung), '#141414');
    if (u > 0.55) ell(c, 66, 90, 34 * (u - 0.45) * 1.6, 30 * (u - 0.45) * 1.6, kind === 'contrast' ? '#b0b0b0' : '#9a9a9a');
    // The heart and the great vessels (bright with contrast in).
    if (u > 0.2 && u < 0.75) ell(c, 88, 90, 22 * Math.sin((u - 0.2) * 5.7), 18 * Math.sin((u - 0.2) * 5.7), kind === 'contrast' ? '#e6e6e6' : '#9c9c9c', -0.4);
    ell(c, 82, 66, 7, 7, kind === 'contrast' ? '#ffffff' : '#a5a5a5');
    ell(c, 80, 116, 9, 9, bone(0.95));
    ell(c, 80, 128, 5, 6, bone(0.8));
    c.strokeStyle = bone(0.7);
    c.lineWidth = 2.5;
    c.beginPath();
    c.ellipse(80, 84, w - 2, 48, 0, Math.PI * 0.15, Math.PI * 0.85);
    c.stroke();
    text(c, kind === 'contrast' ? 'C+' : 'C-', 8, 10, 10, kind === 'contrast' ? '#ffd54f' : '#9e9e9e');
    text(c, `${Math.round(u * 300)} mm`, 154, 152, 9, '#9e9e9e', 'right', false);
  };
}
/** A sagittal MRI slice of the head (T2, the fluid bright), `u` across from one side to the middle. */
function paintMr(u: number): Paint {
  return (c) => {
    FILL(c, 160, 160, '#000000');
    ell(c, 82, 72, 58, 50, '#5d5d5d');
    ell(c, 82, 72, 54, 46, '#9a9a9a');
    // Folds of the cortex.
    c.strokeStyle = '#d6d6d6';
    c.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (1.05 + i * 0.1);
      c.beginPath();
      c.moveTo(82 + Math.cos(a) * 52, 72 + Math.sin(a) * 44);
      c.lineTo(82 + Math.cos(a) * (36 + 6 * u), 72 + Math.sin(a) * (30 + 5 * u));
      c.stroke();
    }
    if (u > 0.5) ell(c, 84, 74, 18 * (u - 0.4), 8, '#efefef', -0.2);
    ell(c, 104, 104, 22, 14, '#7b7b7b');
    ell(c, 74, 112, 9, 30 * (0.6 + 0.4 * u), '#8a8a8a', 0.15);
    ell(c, 66, 140, 8, 20, '#6a6a6a', 0.2);
    ell(c, 30, 84, 8, 18, '#2c2c2c');
    text(c, 'T2 SAG', 8, 10, 10, '#80deea');
    text(c, `${(u * 40 - 20).toFixed(0)} mm`, 154, 152, 9, '#9e9e9e', 'right', false);
  };
}
const CHEST_N = 10;
const sliceTex = (kind: 'chest' | 'contrast' | 'head', i: number, n = CHEST_N) => painted(`rg-${kind}-${i}`, 160, 160, paintSlice(kind, i / (n - 1)));
const mrTex = (i: number) => painted(`rg-mr-${i}`, 160, 160, paintMr(i / 7));
/** A ribcage and spine drawn in 3D (a volume rendering), turned `a` about the vertical. */
function paintVolume(a: number): Paint {
  return (c) => {
    const g = c.createLinearGradient(0, 0, 0, 160);
    g.addColorStop(0, '#0b1a2a');
    g.addColorStop(1, '#000000');
    c.fillStyle = g;
    c.fillRect(0, 0, 160, 160);
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    // The spine, then each rib pair as an ellipse seen turned.
    for (let i = 0; i < 10; i++) {
      const y = 30 + i * 11;
      const w = 46 + 8 * Math.sin((i / 9) * Math.PI);
      const sx = 80 + 14 * sa;
      c.strokeStyle = `rgba(${230 - i * 4},${214 - i * 6},${190 - i * 8},0.92)`;
      c.lineWidth = 3;
      c.beginPath();
      c.ellipse(80, y + 4, Math.abs(w * ca) + 6, 9 + 10 * Math.abs(sa), 0, 0, Math.PI * 2);
      c.stroke();
      ell(c, sx, y + 4, 6, 4.5, '#efe3cc');
    }
    ell(c, 80 - 18 * sa, 26, 40 * Math.abs(ca) + 8, 6, '#e8dcc2');
    ell(c, 80, 146, 34 * Math.abs(ca) + 10, 10, '#d9caa8');
    text(c, 'VR', 8, 10, 10, '#80cbc4');
    text(c, `${Math.round(((a * 180) / Math.PI) % 360)}°`, 152, 10, 9, '#80cbc4', 'right', false);
  };
}
const volTex = (i: number) => painted(`rg-vol-${i}`, 160, 160, paintVolume((i / 12) * Math.PI * 2));
/** A console's frame round its images: the patient bar, the series, the buttons. */
function paintConsole(title: string, lines: string[], accent: string): Paint {
  return (c) => {
    FILL(c, 320, 200, '#141b24');
    c.fillStyle = accent;
    c.fillRect(0, 0, 320, 22);
    text(c, title, 8, 11, 12, '#ffffff');
    text(c, '김○○ M/56 · 등록 2210-3381', 312, 11, 10, '#e3f2fd', 'right', false);
    c.fillStyle = '#000000';
    c.fillRect(8, 28, 164, 164);
    lines.forEach((s, i) => text(c, s, 182, 40 + i * 19, 11, i === 0 ? '#ffffff' : '#b0bec5', 'left', i === 0));
    c.fillStyle = '#263238';
    c.fillRect(182, 168, 130, 24);
    c.fillStyle = accent;
    c.fillRect(184, 170, 60, 20);
    text(c, '스캔', 214, 180, 11, '#ffffff', 'center');
    text(c, '정지', 278, 180, 11, '#ef9a9a', 'center');
  };
}
/** Words lit on a dark face (a lamp, a display). */
function paintLamp(s: string, fg: string, bg: string, w = 192, h = 64): Paint {
  return (c) => {
    FILL(c, w, h, bg);
    c.strokeStyle = 'rgba(255,255,255,0.25)';
    c.lineWidth = 3;
    c.strokeRect(4, 4, w - 8, h - 8);
    text(c, s, w / 2, h / 2 + 2, Math.round(h * 0.48), fg, 'center');
  };
}
/** The radiation trefoil on yellow, with words under it. */
function paintTrefoil(top: string, under: string): Paint {
  return (c) => {
    FILL(c, 192, 256, '#ffd600');
    c.strokeStyle = '#212121';
    c.lineWidth = 6;
    c.strokeRect(6, 6, 180, 244);
    const cx = 96;
    const cy = 92;
    c.fillStyle = '#212121';
    for (let i = 0; i < 3; i++) {
      const a0 = -Math.PI / 2 + (i * Math.PI * 2) / 3 - Math.PI / 6;
      c.beginPath();
      c.moveTo(cx, cy);
      c.arc(cx, cy, 62, a0, a0 + Math.PI / 3);
      c.closePath();
      c.fill();
    }
    c.fillStyle = '#ffd600';
    c.beginPath();
    c.arc(cx, cy, 16, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#212121';
    c.beginPath();
    c.arc(cx, cy, 11, 0, Math.PI * 2);
    c.fill();
    text(c, top, 96, 182, 24, '#212121', 'center');
    text(c, under, 96, 218, 15, '#212121', 'center', false);
  };
}
const TREFOIL = () => painted('rg-trefoil', 192, 256, paintTrefoil('방사선 관리구역', '관계자 외 출입 금지'));
const MAGNET = () =>
  painted('rg-magnet', 192, 256, (c) => {
    FILL(c, 192, 256, '#ffffff');
    c.fillStyle = '#d32f2f';
    c.fillRect(0, 0, 192, 52);
    text(c, '자기장 주의', 96, 27, 26, '#ffffff', 'center');
    c.strokeStyle = '#d32f2f';
    c.lineWidth = 8;
    c.beginPath();
    c.arc(96, 128, 52, 0, Math.PI * 2);
    c.stroke();
    text(c, '🧲', 96, 128, 50, '#212121', 'center', false);
    c.beginPath();
    c.moveTo(60, 92);
    c.lineTo(132, 164);
    c.stroke();
    text(c, '금속 반입 금지', 96, 204, 20, '#212121', 'center');
    text(c, '심박동기 · 금속 삽입물 확인', 96, 234, 12, '#616161', 'center', false);
  });
/** Painted feet on the floor where the patient stands. */
const FEET = () =>
  painted('rg-feet', 128, 128, (c) => {
    c.clearRect(0, 0, 128, 128);
    c.fillStyle = 'rgba(255,214,0,0.85)';
    for (const sx of [-1, 1]) {
      c.beginPath();
      c.ellipse(64 + sx * 22, 70, 13, 30, sx * 0.08, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = '#5d4037';
    c.font = 'bold 14px sans-serif';
    c.textAlign = 'center';
    c.fillText('발 위치', 64, 120);
  });

// ---------------------------------------------------------------------------------------------
// The console corner of the CT, the MRI and the linac (in their front right corner).

interface Corner {
  /** The monitor faces whose pictures change (main, second), the 촬영 중 lamp, its dark twin. */
  main: THREE.Mesh;
  side: THREE.Mesh;
  lampOn: THREE.Mesh;
  lampOff: THREE.Mesh;
}
/**
 * A lead-glass screen across z = CON.shield from x0 to x1 (its glass window), the console desk behind
 * it with two monitors, a keyboard and mouse, the intercom's gooseneck mic, a 촬영 중 lamp on top.
 */
function corner(g: THREE.Object3D, glassMat: THREE.Material, lampWord: string, mainTex: THREE.Texture, sideTex: THREE.Texture): Corner {
  const C = RG.CON;
  const z = C.shield;
  const W = C.x1 - C.x0;
  const cx = (C.x0 + C.x1) / 2;
  // The screen: solid below and above the window, posts at its ends, on a wheeled foot.
  part(g, rbox(W, 1.18, 0.05, 0.015), LEAD, cx, 0.62, z);
  part(g, rbox(W, 0.32, 0.05, 0.015), LEAD, cx, 1.86, z);
  for (const x of [C.x0 + 0.04, C.x1 - 0.04]) part(g, rbox(0.08, 0.5, 0.05, 0.012), LEAD_D, x, 1.45, z);
  glass(g, box(W - 0.16, 0.5, 0.012), cx, 1.45, z, glassMat);
  part(g, box(W - 0.14, 0.018, 0.06), LEAD_D, cx, 1.2, z, { outline: false });
  part(g, box(W - 0.14, 0.018, 0.06), LEAD_D, cx, 1.7, z, { outline: false });
  label(g, glassMat === RF_GLASS ? 'RF 차폐창' : '납유리 2.0mmPb', 0.22, 0.04, cx, 1.98, z - 0.028, '#eceff1', '#455a64', Math.PI);
  picture(g, TREFOIL(), 0.18, 0.24, C.x0 + 0.18, 0.78, z - 0.028, '#ffffff', Math.PI);
  // The 촬영 중 lamp on top, lit both ways.
  part(g, rbox(0.3, 0.1, 0.1, 0.02), '#37474f', cx, 2.07, z);
  const offTex = painted(`rg-lamp-off-${lampWord}`, 192, 64, paintLamp(lampWord, '#6d2b2b', '#2a1414'));
  const onTex = painted(`rg-lamp-on-${lampWord}`, 192, 64, paintLamp(lampWord, '#ffffff', '#e53935'));
  const lampOff = group(g);
  picture(lampOff, offTex, 0.27, 0.075, cx, 2.07, z + 0.052);
  picture(lampOff, offTex, 0.27, 0.075, cx, 2.07, z - 0.052, '#ffffff', Math.PI);
  const lampOnG = group(g);
  const on1 = picture(lampOnG, onTex, 0.27, 0.075, cx, 2.07, z + 0.053);
  picture(lampOnG, onTex, 0.27, 0.075, cx, 2.07, z - 0.053, '#ffffff', Math.PI);
  lampOnG.visible = false;
  // The desk behind it, its drawers, the monitors, keyboard, mouse, mic, a paper worklist.
  const dz = C.desk + 0.08;
  part(g, rbox(W - 0.02, 0.04, 0.24, 0.012), '#e8e2d8', cx, C.top, dz);
  part(g, rbox(0.2, C.top - 0.04, 0.22, 0.012), '#d7d0c4', C.x1 - 0.12, (C.top - 0.04) / 2, dz);
  part(g, rbox(0.03, C.top - 0.04, 0.2, 0.01), '#bfb6a8', C.x0 + 0.03, (C.top - 0.04) / 2, dz);
  for (let i = 0; i < 3; i++) part(g, box(0.06, 0.012, 0.004), STEEL, C.x1 - 0.12, 0.25 + i * 0.25, dz + 0.112, { outline: false });
  const mon = (x: number, tex: THREE.Texture) => {
    part(g, cyl(0.012, 0.012, 0.12, 8), BLACK, x, C.top + 0.08, C.desk - 0.03, { outline: false });
    part(g, rbox(0.1, 0.012, 0.07, 0.01), BLACK, x, C.top + 0.026, C.desk - 0.03, { outline: false });
    part(g, rbox(0.27, 0.18, 0.02, 0.008), '#1c2229', x, C.top + 0.22, C.desk - 0.02);
    return picture(g, tex, 0.25, 0.157, x, C.top + 0.22, C.desk - 0.008, '#8a96a3');
  };
  const main = mon(C.x0 + 0.17, mainTex);
  const side = mon(C.x1 - 0.17, sideTex);
  part(g, rbox(0.22, 0.012, 0.07, 0.005), '#37474f', C.kb[0], C.top + 0.026, C.kb[2]);
  for (let i = 0; i < 3; i++) part(g, box(0.2, 0.002, 0.012), '#90a4ae', C.kb[0], C.top + 0.033, C.kb[2] - 0.022 + i * 0.022, { outline: false });
  part(g, rbox(0.04, 0.016, 0.065, 0.012), '#37474f', C.mouse[0], C.top + 0.028, C.mouse[2]);
  // The intercom: its box and button, the mic on its gooseneck.
  part(g, rbox(0.08, 0.035, 0.06, 0.01), '#546e7a', C.mic[0], C.top + 0.037, C.mic[2] + 0.02);
  glowing(g, ball(0.008), '#66bb6a', C.mic[0] + 0.025, C.top + 0.058, C.mic[2] + 0.04);
  rod(g, v3(C.mic[0], C.top + 0.05, C.mic[2] + 0.01), v3(C.mic[0] + 0.01, C.top + 0.17, C.mic[2] + 0.05), 0.005, BLACK);
  part(g, cyl(0.012, 0.012, 0.04, 8), BLACK, C.mic[0] + 0.01, C.top + 0.18, C.mic[2] + 0.06, { rx: 1.0, outline: false });
  return { main, side, lampOn: on1, lampOff: lampOff.children[0] as THREE.Mesh };
}
/** Lights the corner's lamp (or puts it out). */
function lamp(cn: Corner, on: boolean) {
  (cn.lampOn.parent as THREE.Object3D).visible = on;
  (cn.lampOff.parent as THREE.Object3D).visible = !on;
}
/** The patient's hold-your-breath on a gantry's display. */
const BREATH = () => painted('rg-breath', 256, 96, (c) => {
  FILL(c, 256, 96, '#0d2a3f');
  text(c, '숨을 들이쉬고', 128, 30, 22, '#ffffff', 'center');
  text(c, '참으세요', 128, 66, 28, '#ffd54f', 'center');
});
const BREATH_OK = () => painted('rg-breath-ok', 256, 96, (c) => {
  FILL(c, 256, 96, '#0d2a3f');
  text(c, '편하게', 128, 30, 22, '#ffffff', 'center');
  text(c, '숨 쉬세요', 128, 66, 28, '#80deea', 'center');
});

// ---------------------------------------------------------------------------------------------
// The tables that rise and slide (the CT's and MRI's), drawn in their own group.

interface Table {
  lift: THREE.Group;
  cradle: THREE.Group;
  /** The bellows between the base and the lift, stretched as it rises. */
  bellows: THREE.Mesh;
}
/**
 * The lift (the support under the cradle, from `x0` to `x1`) and the cradle (its pad, the head
 * holder at its -x end) in `g`; the base is drawn once in the piece. The cradle's top is at the lift's y.
 */
function slideTable(g: THREE.Object3D, x0: number, x1: number, half: number, home: number, low: number, padColor: string): Table {
  const lift = group(g, 0, low, RG.BORE_Z);
  const bellows = part(g, box(x1 - x0 - 0.12, 1, 0.3), '#3d4650', (x0 + x1) / 2, 0.35, RG.BORE_Z, { outline: false });
  part(lift, rbox(x1 - x0, 0.08, 0.42, 0.02), MACH_D, (x0 + x1) / 2, -0.07, 0);
  part(lift, box(x1 - x0 - 0.04, 0.012, 0.012), ACCENT, (x0 + x1) / 2, -0.06, 0.212, { outline: false });
  const cradle = group(lift, home, 0, 0);
  part(cradle, rbox(half * 2, 0.04, 0.44, 0.015), '#c7cfd6', 0, -0.02, 0);
  part(cradle, rbox(half * 2 - 0.12, 0.04, 0.4, 0.02), padColor, 0.04, 0.012, 0);
  // The head holder: a padded dish at the head end.
  part(cradle, rbox(0.26, 0.06, 0.3, 0.06), padColor, -half + 0.13, 0.02, 0);
  for (const sz of [-1, 1]) part(cradle, rbox(0.2, 0.08, 0.04, 0.02), '#4a647a', -half + 0.13, 0.07, sz * 0.13);
  // A bolster under the knees.
  part(cradle, cyl(0.045, 0.045, 0.34, 12), padColor, half - 0.36, 0.06, 0, { rx: Math.PI / 2 });
  return { lift, cradle, bellows };
}
function setTable(tb: Table, low: number, high: number, home: number, s: RG.TableAt) {
  const y = mix(low, high, s.lift);
  tb.lift.position.y = y;
  tb.cradle.position.x = home + s.slide;
  tb.bellows.scale.y = Math.max(0.01, y - 0.4);
  tb.bellows.position.y = 0.38 + (y - 0.4) / 2 - 0.04;
}

// ---------------------------------------------------------------------------------------------

let xrCount = 0;
let ctCount = 0;
let deskCount = 0;
let signCount = 0;

export const BUILDERS: Record<string, Builder> = {
  /**
   * The chest stand (흉부 촬영대): at the left the detector in its housing on a tall wall stand (the
   * three AEC fields and the cross painted on its face, grips either side for the arms, yellow feet
   * painted on the floor); in the middle the tube column with its tube and collimator aimed back at
   * it (a little display, the light's knob); at the right the lead screen with its lead-glass window,
   * the generator's panel (kV · mAs), the film monitor on its arm and the hand switch on its coiled
   * cord, the 촬영 중 lamp on top. In use a patient in a gown stands at it.
   *
   * Taking an X-ray: stood behind the patient, the chest pressed to the detector, the arms brought
   * round it, the chin lifted; at the collimator, the light lined up on the back; round behind the
   * screen, the exposure set, 숨 들이마시고 참으세요, the switch pressed (the lamp lit), the film up on
   * the monitor; back to them, the arms let down.
   */
  xrayMachine(g, _W, _D, _c, _def, _ctx, out) {
    const n = xrCount++;
    const X = RG.XR;
    // ---- The wall stand and the detector.
    part(g, rbox(0.3, 0.03, 0.3, 0.01), MACH_D, -0.9, 0.015, -0.33);
    part(g, rbox(0.11, 2.05, 0.12, 0.02), MACH, -0.93, 1.04, -0.38);
    for (const z of [-0.41, -0.35]) part(g, box(0.012, 1.8, 0.01), MACH_DD, -0.875, 1.05, z, { outline: false });
    part(g, rbox(0.1, 0.16, 0.14, 0.02), MACH_D, -0.9, X.det.y, -0.3);
    part(g, rbox(0.1, X.det.half * 2 + 0.08, X.det.half * 2 + 0.1, 0.03), MACH, -0.85, X.det.y, 0);
    const detFace = painted('rg-detector', 128, 128, (c) => {
      FILL(c, 128, 128, '#e9eef2');
      c.strokeStyle = '#90a4ae';
      c.lineWidth = 3;
      c.strokeRect(8, 8, 112, 112);
      c.strokeStyle = '#ef6c00';
      c.lineWidth = 2;
      for (const [x, y] of [[36, 46], [92, 46], [64, 86]]) c.strokeRect(x - 11, y - 9, 22, 18);
      c.strokeStyle = '#546e7a';
      c.beginPath();
      c.moveTo(64, 14);
      c.lineTo(64, 114);
      c.moveTo(14, 64);
      c.lineTo(114, 64);
      c.stroke();
    });
    facingX(g, detFace, X.det.half * 2, X.det.half * 2, X.det.x + 0.002, X.det.y, 0);
    label(g, 'DR', 0.08, 0.035, -0.85, X.det.y + X.det.half + 0.02, 0.28, '#eceff1', ACCENT);
    // The grips either side, for the arms round it.
    for (const sz of [-1, 1]) {
      rod(g, v3(-0.86, X.det.y + 0.1, sz * 0.27), v3(-0.86, X.det.y + 0.1, sz * 0.33), 0.012, MACH_DD);
      rod(g, v3(-0.86, X.det.y + 0.1, sz * 0.33), v3(-0.86, X.det.y + 0.3, sz * 0.33), 0.016, '#455a64');
      rod(g, v3(-0.86, X.det.y + 0.3, sz * 0.33), v3(-0.86, X.det.y + 0.3, sz * 0.27), 0.012, MACH_DD);
    }
    const feet = picture(g, FEET(), 0.42, 0.42, X.pat.x + 0.02, 0.004, 0, '#ffffff', 0, -Math.PI / 2);
    feet.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
    Object.assign(feet.material as THREE.MeshBasicMaterial, { transparent: true, depthWrite: false });
    // ---- The tube column, the tube and the collimator.
    part(g, rbox(0.34, 0.04, 0.28, 0.01), MACH_D, 0.3, 0.02, -0.36);
    part(g, rbox(0.12, 2.2, 0.12, 0.02), MACH, 0.3, 1.1, -0.4);
    part(g, box(0.014, 2.0, 0.01), ACCENT, 0.3, 1.1, -0.338, { outline: false });
    part(g, rbox(0.16, 0.16, 0.16, 0.03), MACH_D, 0.3, X.coll.y + 0.1, -0.38);
    part(g, rbox(0.08, 0.08, 0.36, 0.02), MACH_DD, 0.32, X.coll.y + 0.1, -0.16);
    part(g, cyl(0.1, 0.1, 0.34, 18), MACH, 0.36, X.coll.y + 0.06, 0, { rx: Math.PI / 2 });
    for (const sz of [-1, 1]) part(g, cyl(0.105, 0.105, 0.03, 18), MACH_DD, 0.36, X.coll.y + 0.06, sz * 0.16, { rx: Math.PI / 2 });
    part(g, rbox(0.16, 0.22, 0.24, 0.03), '#e3e8ec', 0.2, X.coll.y, 0);
    part(g, rbox(0.012, 0.13, 0.13, 0.004), '#455a64', X.coll.x - 0.002, X.coll.y, 0, { outline: false });
    part(g, cyl(0.02, 0.02, 0.03, 12), '#37474f', X.knob[0], X.knob[1], X.knob[2], { rx: Math.PI / 2 });
    part(g, rbox(0.12, 0.02, 0.02, 0.008), '#607d8b', 0.08, X.coll.y - 0.13, 0.13, { outline: false });
    const disp = painted('rg-sid', 128, 48, paintLamp('SID 100cm', '#80deea', '#0d1b26', 128, 48));
    picture(g, disp, 0.1, 0.038, 0.2, X.coll.y + 0.06, 0.122);
    // ---- The lead screen, its window, the console and the hand switch.
    const L = X.wall;
    const wz = (L.z0 + L.z1) / 2;
    const ww = L.z1 - L.z0;
    part(g, rbox(0.05, L.win[0], ww, 0.015), LEAD, L.x, L.win[0] / 2, wz);
    part(g, rbox(0.05, 2.0 - L.win[1], ww, 0.015), LEAD, L.x, (2.0 + L.win[1]) / 2, wz);
    part(g, rbox(0.05, L.win[1] - L.win[0], 0.12, 0.012), LEAD_D, L.x, (L.win[0] + L.win[1]) / 2, L.z0 + 0.06);
    part(g, rbox(0.05, L.win[1] - L.win[0], 0.1, 0.012), LEAD_D, L.x, (L.win[0] + L.win[1]) / 2, L.z1 - 0.05);
    const gw = glass(g, box(0.012, L.win[1] - L.win[0], ww - 0.22), L.x, (L.win[0] + L.win[1]) / 2, wz + 0.01, LEAD_GLASS);
    gw.renderOrder = 3;
    facingX(g, TREFOIL(), 0.18, 0.24, L.x - 0.027, 0.85, wz, -1);
    // The shelf on its back, the generator panel, the monitor on its arm, the holster.
    part(g, rbox(0.14, 0.03, ww - 0.04, 0.01), '#e3dfd6', L.x + 0.095, 1.0, wz);
    part(g, rbox(0.1, 0.12, 0.26, 0.02), '#37474f', X.panel[0], X.panel[1], X.panel[2], { rz: 0.35 });
    const lcd = painted('rg-kv', 192, 96, (c) => {
      FILL(c, 192, 96, '#0b1f12');
      text(c, '125 kV', 12, 28, 26, '#69f0ae');
      text(c, '3.2 mAs', 12, 70, 22, '#b9f6ca');
      text(c, 'PA 흉부', 182, 28, 14, '#ffd54f', 'right');
      text(c, 'AEC', 182, 70, 14, '#80deea', 'right');
    });
    const lcdM = facingX(g, lcd, 0.2, 0.1, X.panel[0] + 0.045, X.panel[1] + 0.01, X.panel[2], 1);
    lcdM.rotation.order = 'YXZ';
    lcdM.rotation.set(-0.35, Math.PI / 2, 0);
    for (let i = 0; i < 4; i++) part(g, cyl(0.009, 0.009, 0.006, 8), ['#43a047', '#1e88e5', '#fdd835', '#e53935'][i], X.panel[0] + 0.03, X.panel[1] - 0.045, X.panel[2] - 0.08 + i * 0.05, { rz: Math.PI / 2 - 0.35, outline: false });
    rod(g, v3(L.x + 0.03, 1.5, -0.42), v3(L.x + 0.12, 1.42, -0.36), 0.012, BLACK);
    part(g, rbox(0.02, 0.17, 0.24, 0.008), '#1c2229', L.x + 0.13, 1.4, -0.32, { ry: 0.3 });
    const monOff = facingX(g, painted('rg-xr-mon-off', 160, 192, (c) => FILL(c, 160, 192, '#1d2731')), 0.13, 0.16, L.x + 0.142, 1.4, -0.31, 1);
    monOff.rotation.y = Math.PI / 2 + 0.3;
    part(g, rbox(0.05, 0.08, 0.05, 0.01), '#455a64', X.holster[0], X.holster[1], X.holster[2]);
    const handSwitch = (parent: THREE.Object3D) => {
      const h = group(parent);
      part(h, cyl(0.02, 0.022, 0.11, 10), '#eceff1', 0, 0.055, 0);
      part(h, cyl(0.012, 0.012, 0.012, 10), '#e53935', 0, 0.115, 0, { outline: false });
      return h;
    };
    const idle = group(g);
    out.idle = idle;
    const sw0 = handSwitch(idle);
    sw0.position.copy(vp(X.holster, 0.02));
    // Its coiled cord, hanging from the shelf.
    for (let i = 0; i < 9; i++) part(g, ring(0.015, 0.003), '#cfd8dc', X.holster[0] + 0.02, 0.97 - i * 0.022, X.holster[2] - 0.02, { rx: Math.PI / 2 });
    // The lamp on top of the screen, lit both ways along x and to the front.
    part(g, rbox(0.1, 0.1, 0.3, 0.02), '#37474f', L.x, 2.06, wz);
    const offT = painted('rg-lamp-off-촬영 중', 192, 64, paintLamp('촬영 중', '#6d2b2b', '#2a1414'));
    const onT = painted('rg-lamp-on-촬영 중', 192, 64, paintLamp('촬영 중', '#ffffff', '#e53935'));
    for (const s of [-1, 1]) facingX(idle, offT, 0.27, 0.075, L.x + s * 0.052, 2.06, wz, s);
    label(g, `${n % 2 + 1}번 촬영실 · 일반촬영`, 0.4, 0.06, -0.3, 2.0, -0.47, '#eceff1', NAVY);

    // ---- In use: the patient, the light, the switch in the hand, the film, the lamp.
    const use = group(g);
    out.inUse = use;
    const lampOn = group(use);
    for (const s of [-1, 1]) facingX(lampOn, onT, 0.27, 0.075, L.x + s * 0.053, 2.06, wz, s);
    const lampOff2 = group(use);
    for (const s of [-1, 1]) facingX(lampOff2, offT, 0.27, 0.075, L.x + s * 0.052, 2.06, wz, s);
    const look = [LOOKS.man, LOOKS.woman, LOOKS.elder][n % 3];
    const pat = patient(use, look);
    pat.root.position.set(X.pat.x, 0, X.pat.z);
    pat.root.rotation.y = -Math.PI / 2;
    const sw = handSwitch(use);
    const film = facingX(use, painted('rg-chest', 160, 192, paintChest), 0.13, 0.16, L.x + 0.143, 1.4, -0.31, 1);
    film.rotation.y = Math.PI / 2 + 0.3;
    // The collimator's light: its window lit, the field and cross on the patient's back.
    const collLit = ownGlow(use, box(0.006, 0.12, 0.12), '#fff59d', X.coll.x - 0.006, X.coll.y, 0);
    const field = new THREE.Group();
    use.add(field);
    const fieldM = ownGlow(field, box(0.003, 0.36, 0.34), '#fff176', 0, 0, 0, 0.35);
    fieldM.renderOrder = 3;
    const crossV = ownGlow(field, box(0.004, 0.36, 0.006), '#5d4037', 0.001, 0, 0, 0.55);
    const crossH = ownGlow(field, box(0.004, 0.006, 0.34), '#5d4037', 0.001, 0, 0, 0.55);
    crossV.renderOrder = crossH.renderOrder = 4;
    field.position.set(XR_BACK_X, X.det.y + 0.02, 0);

    const mark = marker(g, 0, 1.0, 0);
    const spots: Record<string, Spot> = { takeXray: spotAt(g, RG.XR_POS, 'stand', 'rgXray', mark), '*': spotAt(g, RG.XR_POS, 'stand', 'rgXray', mark) };
    out.spots = spots;
    out.work = mark;
    const local = new THREE.Vector3();
    /** A point in the piece to the patient's own frame (they face -x at XR.pat). */
    const toPat = (p: THREE.Vector3) => local.set(p.z - X.pat.z, p.y, X.pat.x - p.x);
    const grip = (sz: number) => v3(-0.86, X.det.y + 0.18, sz * 0.31);
    out.animate = (t) => {
      const ph = phaseOf(mark);
      const b = RG.xrBeat(t, ph);
      for (const s of Object.values(spots)) moveSpot(s, b.at);
      const key = RG.rgKeyOf('rgXray', t, ph).key;
      const s = RG.xrState(b);
      // The patient: leaning in, the arms round the detector, the chin up, the chest swelling and held.
      pat.upper.rotation.x = 0.06 + 0.04 * s.press + 0.03 * s.arms;
      pat.upper.scale.set(1, 1, 1 + 0.06 * s.breath);
      pat.head.rotation.set(-0.28 * s.chin, 0, 0);
      for (const [sx, fn] of [[1, pat.armL], [-1, pat.armR]] as const) {
        const hug = toPat(grip(sx)).clone();
        fn(REST(sx).lerp(hug, s.arms));
      }
      pat.mouth(s.breath > 0.5 ? 0 : 0.1);
      pat.eyes(s.expose);
      collLit.visible = s.light;
      field.visible = s.light;
      lampOn.visible = s.expose;
      lampOff2.visible = !s.expose;
      film.visible = s.image;
      const held = RG.xrSwitchHeld(b);
      sw.visible = true;
      if (held) {
        sw.position.copy(vp(key.r, -0.06));
        sw.rotation.set(0, 0, 0);
      } else sw.position.copy(vp(X.holster, 0.02));
    };
  },

  /**
   * The CT (CT 스캐너): the gantry, a big rounded slab with its bore facing +x, a blue ring round the
   * bore, LEDs that run round it while it scans, the table buttons either side and a breathing
   * display over it, CT and SOMA 128 on its side; the table that rises on its bellows and slides its
   * padded cradle (head holder, knee bolster) through the bore; the red lasers; and in the front
   * right corner the console behind its lead glass (two monitors, keyboard, the intercom mic, the 촬영
   * 중 lamp). In use a patient lies on it (in a neck collar for an urgent scan, the injector's line to
   * their arm for a contrast one).
   *
   * A scan: at the table's side, a hand on the shoulder, the head settled, the strap across; at the
   * gantry, the table raised under the lasers and slid in; round to the console — the scan run, the
   * slices coming up one by one; back, the table out and down. Reconstructing (3D 재구성): at the
   * console, the volume dragged round.
   */
  ctScanner(g, _W, _D, _c, _def, _ctx, out) {
    const n = ctCount++;
    const C = RG.CT;
    const Z = RG.BORE_Z;
    const depth = 0.45;
    // ---- The gantry.
    slab(g, holed(1.36, 1.86, 0.32, C.boreY, C.boreR + 0.02, depth), MACH, C.face, Z, depth);
    bore(g, C.face - depth - 0.02, C.face + 0.02, C.boreY, Z, C.boreR + 0.015, '#e3e8ec');
    for (const x of [C.face + 0.022, C.face - depth - 0.022]) part(g, ring(C.boreR + 0.025, 0.022), MACH_DD, x, C.boreY, Z, { ry: Math.PI / 2, outline: false });
    part(g, ring(C.boreR + 0.09, 0.012), ACCENT, C.face + 0.025, C.boreY, Z, { ry: Math.PI / 2, outline: false });
    part(g, rbox(depth + 0.04, 0.06, 1.38, 0.02), MACH_D, C.face - depth / 2, 0.03, Z);
    // Its side, seen from the room: the name and the blue line.
    const side = painted('rg-ct-side', 256, 128, (c) => {
      FILL(c, 256, 128, MACH);
      c.fillStyle = ACCENT;
      c.fillRect(0, 84, 256, 8);
      text(c, 'CT', 22, 46, 44, NAVY);
      text(c, 'SOMA 128', 104, 50, 20, '#607d8b', 'left', false);
    });
    picture(g, side, 0.42, 0.21, C.face - depth / 2, 1.5, Z + 0.705);
    // The breathing display over the bore; the buttons either side; the laser windows.
    part(g, rbox(0.03, 0.14, 0.32, 0.02), '#263238', C.face + 0.02, 1.58, Z);
    const dispIdle = facingX(g, painted('rg-ct-logo', 256, 96, paintLamp('CT', '#80deea', '#0d2a3f', 256, 96)), 0.29, 0.11, C.face + 0.037, 1.58, Z);
    for (const z of [RG.CT_BTN[2], 2 * Z - RG.CT_BTN[2]]) {
      part(g, rbox(0.03, 0.16, 0.12, 0.02), '#cfd8dc', C.face + 0.02, RG.CT_BTN[1], z);
      [['#43a047', 0.04], ['#1e88e5', 0], ['#1e88e5', -0.04]].forEach(([col, dy]) => part(g, cyl(0.014, 0.014, 0.01, 10), col as string, C.face + 0.038, RG.CT_BTN[1] + (dy as number), z, { rz: Math.PI / 2, outline: false }));
      part(g, cyl(0.016, 0.016, 0.012, 10), RED, C.face + 0.04, RG.CT_BTN[1] - 0.09, z, { rz: Math.PI / 2, outline: false });
    }
    for (const y of [C.boreY + C.boreR + 0.14]) part(g, box(0.01, 0.02, 0.1), '#37474f', C.face + 0.03, y, Z, { outline: false });
    // ---- The table's base (the lift and cradle drawn at rest and in use).
    part(g, rbox(0.86, 0.06, 0.48, 0.02), MACH_D, 0.3, 0.03, Z);
    part(g, rbox(0.82, 0.32, 0.4, 0.04), MACH, 0.3, 0.2, Z);
    part(g, box(0.8, 0.012, 0.012), ACCENT, 0.3, 0.3, Z + 0.205, { outline: false });
    const idle = group(g);
    out.idle = idle;
    const t0 = slideTable(idle, -0.12, 0.72, C.half, C.home, C.low, PAD);
    setTable(t0, C.low, C.high, C.home, { lift: 0, slide: 0 });
    part(idle, rbox(0.4, 0.05, 0.3, 0.02), '#ffffff', C.home + 0.3, C.low + 0.05, Z);
    // The console corner.
    const ctTex = sliceTex('chest', 4);
    const frame = painted('rg-ct-frame', 320, 200, paintConsole('CT 촬영 · 흉부', ['흉부 CT', '120 kV · 자동 mA', '절편 두께 1.0 mm', '피치 0.98', 'DLP 312 mGy·cm'], '#1565c0'));
    const cn = corner(g, LEAD_GLASS, '촬영 중', frame, painted('rg-ct-scout', 160, 100, (c) => {
      FILL(c, 160, 100, '#000000');
      ell(c, 80, 50, 70, 26, '#4a4a4a');
      for (const sx of [-1, 1]) ell(c, 60, 50 + sx * 10, 24, 8, '#151515');
      c.fillStyle = 'rgba(255,213,79,0.35)';
      c.fillRect(34, 18, 64, 64);
      text(c, '스카우트', 6, 9, 9, '#ffd54f');
    }));
    label(g, `CT실 ${n % 2 + 1}`, 0.24, 0.06, C.face - depth / 2, 1.95, Z + 0.705, NAVY, '#ffffff');

    // ---- In use.
    const use = group(g);
    out.inUse = use;
    const tb = slideTable(use, -0.12, 0.72, C.half, C.home, C.low, PAD);
    const look = [LOOKS.man, LOOKS.elder, LOOKS.woman][n % 3];
    const pat = lying(tb.cradle, look, C.half);
    const urgentPat = lying(tb.cradle, LOOKS.worker, C.half);
    // The neck collar on the urgent one.
    const collar = group(urgentPat.upper, 0, 0.53, 0);
    part(collar, cyl(0.075, 0.08, 0.09, 14), '#eceff1', 0, 0, 0);
    part(collar, cyl(0.077, 0.077, 0.02, 14), '#1565c0', 0, -0.03, 0, { outline: false });
    // The strap over the hips, the cannula and the injector's line.
    const strap = part(tb.cradle, rbox(0.12, 0.012, 0.5, 0.004), '#37474f', C.half - 0.86 * 0.92, 0.25, 0, { outline: false });
    const sideStrap = [1, -1].map((s) => part(tb.cradle, box(0.12, 0.2, 0.006), '#37474f', C.half - 0.86 * 0.92, 0.14, s * 0.25, { outline: false }));
    const cannula = part(use, box(0.03, 0.012, 0.02), '#ffffff', 0, 0, 0, { outline: false });
    const line1 = limb(use, 0.004, '#e0f7fa');
    const line2 = limb(use, 0.004, '#e0f7fa');
    const lineGroup = [cannula];
    // The lasers: a red line across the patient at the gantry's face, one down their middle.
    const lasers = group(use);
    const lzX = C.face + 0.08;
    ownGlow(lasers, box(0.006, 0.004, 0.5), LASER_R, lzX, 0, 0);
    ownGlow(lasers, box(1.1, 0.004, 0.006), LASER_R, lzX + 0.55, 0, 0);
    ownGlow(lasers, box(0.008, 0.008, 0.008), LASER_R, C.face + 0.032, C.boreY + C.boreR + 0.14, Z);
    // The bore lit, the LEDs that run round, the display, the slices on the console.
    const boreLit = boreLight(use, C.face - depth, C.face + 0.01, C.boreY, Z, C.boreR - 0.005, '#bbdefb');
    const ringLit = ownGlow(use, ring(C.boreR + 0.09, 0.014), '#64b5f6', C.face + 0.027, C.boreY, Z);
    ringLit.rotation.y = Math.PI / 2;
    const leds = Array.from({ length: 6 }, () => ownGlow(use, ball(0.012), '#e3f2fd', 0, 0, 0));
    const dispHold = facingX(use, BREATH(), 0.29, 0.11, C.face + 0.038, 1.58, Z);
    const dispOk = facingX(use, BREATH_OK(), 0.29, 0.11, C.face + 0.038, 1.58, Z);
    const slice = picture(use, ctTex, 0.105, 0.105, cn.main.position.x - 0.065, cn.main.position.y - 0.005, cn.main.position.z + 0.002);
    const injectTag = label(use, '조영제 주입 중 3.0 mL/s', 0.12, 0.016, cn.main.position.x + 0.06, cn.main.position.y - 0.06, cn.main.position.z + 0.003, '#ffd54f', '#3e2723');
    const sideLit = picture(use, painted('rg-ct-scout-lit', 160, 100, (c) => {
      FILL(c, 160, 100, '#000000');
      ell(c, 80, 50, 70, 26, '#5a5a5a');
      for (const sx of [-1, 1]) ell(c, 60, 50 + sx * 10, 24, 8, '#151515');
      c.fillStyle = 'rgba(100,181,246,0.4)';
      c.fillRect(34, 18, 64, 64);
      text(c, '스캔 범위', 6, 9, 9, '#90caf9');
    }), 0.25, 0.157, cn.side.position.x, cn.side.position.y, cn.side.position.z + 0.002);
    const vol = picture(use, volTex(0), 0.105, 0.105, cn.main.position.x - 0.065, cn.main.position.y - 0.005, cn.main.position.z + 0.003);

    const mark = marker(g, 0, 1.0, 0);
    const spots: Record<string, Spot> = {
      runCtScan: spotAt(g, RG.CT_SET, 'stand', 'rgCt', mark),
      urgentScan: spotAt(g, RG.CT_SET, 'stand', 'rgCtUrgent', mark),
      radiographer_contrastScan: spotAt(g, RG.CT_SET, 'stand', 'rgCtContrast', mark),
      radiographer_reconstructImages: spotAt(g, RG.AT_CON, 'stand', 'rgRecon', mark),
      '*': spotAt(g, RG.CT_SET, 'stand', 'rgCt', mark),
    };
    out.spots = spots;
    out.work = mark;
    const elbow = new THREE.Vector3();
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const m = (now ? spots[now].motion : 'rgCt') as RG.RgMotion;
      const ph = phaseOf(mark);
      dispIdle.visible = true;
      if (m === 'rgRecon') {
        const b = RG.reconBeat(t, ph);
        moveSpot(spots[now ?? '*'], b.at);
        setTable(tb, C.low, C.high, C.home, { lift: 0, slide: 0 });
        pat.root.visible = urgentPat.root.visible = false;
        strap.visible = false;
        sideStrap.forEach((x) => (x.visible = false));
        lineGroup.forEach((x) => (x.visible = false));
        line1(v3(0, -1, 0), v3(0, -1.001, 0));
        line2(v3(0, -1, 0), v3(0, -1.001, 0));
        lasers.visible = false;
        fade(boreLit, 0);
        ringLit.visible = false;
        leds.forEach((l) => (l.visible = false));
        dispHold.visible = dispOk.visible = false;
        slice.visible = false;
        injectTag.visible = false;
        sideLit.visible = true;
        vol.visible = true;
        const a = b.from === 'drag' ? t * 0.9 : Math.floor(t * 0.9);
        show(vol, volTex(Math.floor(a * 2) % 12));
        lamp(cn, false);
        return;
      }
      vol.visible = false;
      const kind = m as RG.CtKind;
      const b = RG.ctBeat(kind, t, ph);
      for (const [k, s] of Object.entries(spots)) if (k !== 'radiographer_reconstructImages') moveSpot(s, b.at);
      const s = RG.ctState(kind, b);
      setTable(tb, C.low, C.high, C.home, s.table);
      const urgent = kind === 'rgCtUrgent';
      pat.root.visible = !urgent;
      urgentPat.root.visible = urgent;
      const who = urgent ? urgentPat : pat;
      who.eyes(s.scanning && Math.sin(t * 0.7) > 0.6);
      who.upper.scale.set(1, 1, s.hold ? 1.04 : 1 + 0.02 * Math.sin(t * 1.4 + n));
      strap.visible = s.strap && !urgent;
      sideStrap.forEach((x) => (x.visible = s.strap && !urgent));
      // The contrast line: from the cannula at the inside of the elbow, sagging off to the injector beside the gantry.
      const top = mix(C.low, C.high, s.table.lift);
      const P0 = RG.supine(C.home + s.table.slide + C.half, top, Z);
      cannula.visible = s.line;
      if (s.line) {
        elbow.copy(vp(P0.elbowR, 0.0));
        cannula.position.copy(elbow);
        const sag = v3(mix(elbow.x, 1.0, 0.5), top - 0.25, mix(elbow.z, -0.6, 0.5));
        line1(elbow, sag);
        line2(sag, v3(1.02, 1.05, -0.62));
      } else {
        line1(v3(0, -1, 0), v3(0, -1.001, 0));
        line2(v3(0, -1, 0), v3(0, -1.001, 0));
      }
      lasers.visible = s.lasers;
      lasers.children[0].position.set(lzX, top + 0.21, Z);
      lasers.children[1].position.set(lzX + 0.55, top + 0.215, Z);
      fade(boreLit, s.bore, 0.75);
      ringLit.visible = s.bore > 0;
      leds.forEach((l, i) => {
        l.visible = s.scanning;
        const a = t * 5 + (i / leds.length) * Math.PI * 2;
        l.position.set(C.face + 0.03, C.boreY + Math.sin(a) * (C.boreR + 0.05), Z + Math.cos(a) * (C.boreR + 0.05));
      });
      dispHold.visible = s.hold;
      dispOk.visible = !s.hold && s.series;
      dispIdle.visible = !s.hold && !s.series;
      // The slices coming up as it scans (a head for an urgent CT, bright vessels with contrast).
      const sk = urgent ? 'head' : kind === 'rgCtContrast' ? 'contrast' : 'chest';
      slice.visible = s.series;
      show(slice, sliceTex(sk, Math.min(CHEST_N - 1, Math.floor(s.slice * (CHEST_N - 1) + (b.from === 'review' ? Math.floor(t * 2) % 3 : 0)))));
      injectTag.visible = s.inject;
      sideLit.visible = s.series || b.from === 'scan';
      lamp(cn, s.scanning);
    };
  },

  /**
   * The MRI (MRI): a big rounded magnet, deeper and softer than the CT, its bore lit, a blue light
   * strip round it, 3.0T and 자기장 주의 on it, the 5-gauss line yellow-and-black on the floor; the
   * table with its pad, the head coil waiting on its tray, the headphones and the squeeze ball on its
   * tube; the console corner behind the RF-shielded window (its copper mesh). In use a patient lies on
   * it.
   *
   * A scan: a hand on the shoulder; the headphones on; the head coil over the head; the squeeze ball
   * into the hand; the table up and in; at the console the sequence run (the bore bright, the
   * progress bar, the slices), a word over the intercom; checked; back, out, the coil off.
   */
  mriScanner(g, _W, _D, _c, _def, _ctx, out) {
    const M = RG.MR;
    const Z = RG.BORE_Z;
    const depth = M.face - M.back;
    slab(g, holed(1.46, 1.92, 0.5, M.boreY, M.boreR + 0.02, depth), '#f4f6f8', M.face, Z, depth);
    bore(g, M.back - 0.02, M.face + 0.02, M.boreY, Z, M.boreR + 0.015, '#eef2f5');
    part(g, ring(M.boreR + 0.03, 0.03), '#cfd8dc', M.face + 0.022, M.boreY, Z, { ry: Math.PI / 2, outline: false });
    part(g, ring(M.boreR + 0.16, 0.016), '#90caf9', M.face + 0.024, M.boreY, Z, { ry: Math.PI / 2, outline: false });
    part(g, rbox(depth + 0.04, 0.06, 1.48, 0.02), MACH_D, (M.face + M.back) / 2, 0.03, Z);
    const side = painted('rg-mr-side', 256, 128, (c) => {
      FILL(c, 256, 128, '#f4f6f8');
      c.fillStyle = '#7e57c2';
      c.fillRect(0, 88, 256, 6);
      text(c, 'MR', 18, 46, 42, '#4527a0');
      text(c, '3.0T', 104, 48, 26, '#607d8b');
    });
    picture(g, side, 0.42, 0.21, (M.face + M.back) / 2, 1.5, Z + 0.755);
    picture(g, MAGNET(), 0.15, 0.2, M.face + 0.025, 0.55, Z + 0.5, '#ffffff', Math.PI / 2);
    // The buttons on its face, the little display over the bore.
    part(g, rbox(0.03, 0.16, 0.12, 0.02), '#cfd8dc', M.face + 0.02, RG.MR_BTN[1], RG.MR_BTN[2]);
    for (const [col, dy] of [['#43a047', 0.04], ['#7e57c2', 0], ['#7e57c2', -0.04]] as const) part(g, cyl(0.014, 0.014, 0.01, 10), col, M.face + 0.038, RG.MR_BTN[1] + dy, RG.MR_BTN[2], { rz: Math.PI / 2, outline: false });
    part(g, rbox(0.03, 0.12, 0.28, 0.02), '#263238', M.face + 0.02, 1.62, Z);
    facingX(g, painted('rg-mr-disp', 256, 96, paintLamp('MR 3.0T', '#b39ddb', '#1a1035', 256, 96)), 0.25, 0.095, M.face + 0.037, 1.62, Z);
    // The 5-gauss line on the floor, round the table end.
    for (let i = 0; i < 10; i++) part(g, box(0.1, 0.004, 0.04), i % 2 ? '#212121' : '#fdd835', 0.32 + i * 0.07, 0.003, 0.08, { outline: false });
    // The table's base; the coil tray at its head end.
    part(g, rbox(0.84, 0.06, 0.46, 0.02), MACH_D, 0.38, 0.03, Z);
    part(g, rbox(0.8, 0.32, 0.4, 0.04), '#f4f6f8', 0.38, 0.2, Z);
    part(g, box(0.78, 0.012, 0.012), '#7e57c2', 0.38, 0.3, Z + 0.205, { outline: false });
    const trayAt: RG.P = [M.face + 0.12, M.low + 0.04, Z + 0.28];
    part(g, rbox(0.3, 0.025, 0.2, 0.01), '#cfd8dc', trayAt[0], trayAt[1], trayAt[2]);
    rod(g, v3(trayAt[0], 0.32, trayAt[2] - 0.02), v3(trayAt[0], trayAt[1] - 0.012, trayAt[2] - 0.02), 0.015, MACH_DD);
    /** The head coil: a white cage of bars round the head, its mirror, the cable. */
    const headCoil = (parent: THREE.Object3D) => {
      const c = group(parent);
      part(c, rbox(0.3, 0.025, 0.26, 0.01), '#eceff1', 0, -0.07, 0);
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (0.1 + (i / 6) * 0.8);
        part(c, rbox(0.28, 0.02, 0.03, 0.008), i % 2 ? '#e3e8ec' : '#ffffff', 0, -0.07 + Math.sin(a) * 0.15, Math.cos(a) * 0.13);
      }
      part(c, ring(0.13, 0.012, Math.PI), '#ffffff', 0.13, 0.0, 0, { ry: Math.PI / 2, outline: false });
      part(c, ring(0.13, 0.012, Math.PI), '#ffffff', -0.13, 0.0, 0, { ry: Math.PI / 2, outline: false });
      part(c, box(0.08, 0.004, 0.06), '#b3e5fc', 0.02, 0.1, 0, { rz: 0.6, outline: false });
      part(c, cyl(0.008, 0.008, 0.12, 6), '#90a4ae', 0.16, -0.06, 0.08, { rz: Math.PI / 2, outline: false });
      return c;
    };
    const idle = group(g);
    out.idle = idle;
    const t0 = slideTable(idle, 0.0, 0.76, M.half, M.home, M.low, '#6f8aa0');
    setTable(t0, M.low, M.high, M.home, { lift: 0, slide: 0 });
    const coil0 = headCoil(idle);
    coil0.position.copy(vp(trayAt, 0.085));
    // Folded sheet, the headphones and the ball laid ready on the pad.
    part(idle, rbox(0.36, 0.05, 0.3, 0.02), '#ffffff', M.home + 0.3, M.low + 0.05, Z);
    const phones = (parent: THREE.Object3D) => {
      const h = group(parent);
      for (const s of [-1, 1]) part(h, cyl(0.045, 0.045, 0.03, 12), '#37474f', 0, 0, s * 0.12, { rx: Math.PI / 2 });
      part(h, ring(0.12, 0.01, Math.PI), '#546e7a', 0, 0, 0, { ry: Math.PI / 2, rz: 0, outline: false });
      return h;
    };
    const ph0 = phones(idle);
    ph0.position.set(M.home - 0.1, M.low + 0.04, Z + 0.1);
    ph0.rotation.set(Math.PI / 2, 0, 0);
    const bulb = (parent: THREE.Object3D) => {
      const b = group(parent);
      part(b, ball(0.03), '#ff7043', 0, 0, 0).scale.set(1, 1.3, 1);
      part(b, cyl(0.004, 0.004, 0.18, 6), '#cfd8dc', 0, -0.11, 0, { outline: false });
      return b;
    };
    bulb(idle).position.set(M.home + 0.15, M.low + 0.05, Z - 0.12);
    const cn = corner(g, RF_GLASS, '촬영 중', painted('rg-mr-frame', 320, 200, paintConsole('MRI · 뇌 검사', ['T2 FLAIR 시상면', 'TR 9000 · TE 85', '절편 4 mm × 24', '남은 시간 3:12', 'SAR 정상'], '#5e35b1')), painted('rg-mr-cctv', 160, 100, (c) => {
      FILL(c, 160, 100, '#101418');
      ell(c, 80, 56, 60, 34, '#2c3640');
      ell(c, 80, 56, 26, 26, '#0b0d10');
      text(c, 'CCTV 1', 6, 9, 9, '#a5d6a7');
    }));
    // The RF window's copper mesh.
    for (let i = 0; i < 8; i++) part(g, box(0.003, 0.5, 0.002), '#b87333', RG.CON.x0 + 0.1 + i * 0.06, 1.45, RG.CON.shield + 0.008, { outline: false });
    label(g, 'MRI실', 0.2, 0.06, (M.face + M.back) / 2, 2.0, Z + 0.755, '#4527a0', '#ffffff');

    // ---- In use.
    const use = group(g);
    out.inUse = use;
    const tb = slideTable(use, 0.0, 0.76, M.half, M.home, M.low, '#6f8aa0');
    const pat = lying(tb.cradle, LOOKS.young, M.half);
    const coil = headCoil(use);
    const phonesOn = phones(pat.head);
    phonesOn.position.set(0, 0.01, 0);
    phonesOn.rotation.set(0, Math.PI / 2, 0);
    const ball1 = bulb(use);
    const boreLit = boreLight(use, M.back, M.face + 0.01, M.boreY, Z, M.boreR, '#e1f5fe');
    const ringLit = ownGlow(use, ring(M.boreR + 0.16, 0.018), '#b39ddb', M.face + 0.026, M.boreY, Z);
    ringLit.rotation.y = Math.PI / 2;
    const slice = picture(use, mrTex(0), 0.105, 0.105, cn.main.position.x - 0.065, cn.main.position.y - 0.005, cn.main.position.z + 0.002);
    const bar = ownGlow(use, box(0.08, 0.008, 0.002), '#b39ddb', 0, 0, 0);
    const talk = ownGlow(use, ball(0.009), '#ff5252', RG.CON.mic[0] + 0.025, RG.CON.top + 0.058, RG.CON.mic[2] + 0.042);
    const mark = marker(g, 0, 1.0, 0);
    const spots: Record<string, Spot> = { runMriScan: spotAt(g, RG.MR_SET, 'stand', 'rgMri', mark), '*': spotAt(g, RG.MR_SET, 'stand', 'rgMri', mark) };
    out.spots = spots;
    out.work = mark;
    out.animate = (t) => {
      const ph = phaseOf(mark);
      const b = RG.mrBeat(t, ph);
      for (const s of Object.values(spots)) moveSpot(s, b.at);
      const key = RG.rgKeyOf('rgMri', t, ph).key;
      const s = RG.mrState(b);
      setTable(tb, M.low, M.high, M.home, s.table);
      const top = mix(M.low, M.high, s.table.lift);
      const P0 = RG.supine(M.home + s.table.slide + M.half, top, Z);
      phonesOn.visible = s.phones;
      // The coil carried between the hands, then sat over the head (moving in with the table).
      if (s.coil >= 1) coil.position.copy(vp(P0.head, 0.05));
      else if (s.coil > 0) coil.position.set((key.l[0] + key.r[0]) / 2, (key.l[1] + key.r[1]) / 2 - 0.08, (key.l[2] + key.r[2]) / 2);
      else coil.position.copy(vp(trayAt, 0.085));
      ball1.visible = true;
      if (s.ball) ball1.position.copy(vp(P0.handR, 0.03));
      else ball1.position.set(M.home + s.table.slide + 0.15, top + 0.05, Z - 0.12);
      pat.eyes(s.scanning);
      pat.upper.scale.set(1, 1, 1 + 0.02 * Math.sin(t * 1.3));
      fade(boreLit, s.bore, 0.8);
      ringLit.visible = s.bore > 0;
      // A little shudder of the table with each knock of the gradients (쿵쿵).
      tb.cradle.position.y = s.scanning ? 0.002 * Math.max(0, Math.sin(t * 22)) : 0;
      slice.visible = s.series;
      show(slice, mrTex(Math.min(7, Math.floor(s.slice * 7.99))));
      bar.visible = s.series;
      bar.scale.x = Math.max(0.02, s.slice);
      bar.position.set(cn.main.position.x + 0.035 + 0.04 * (s.slice - 1), cn.main.position.y - 0.065, cn.main.position.z + 0.003);
      talk.visible = s.talk;
      lamp(cn, s.scanning);
    };
  },

  /**
   * The linac (방사선 치료기): the drum stand at the left with its big turning disc, and on it the
   * gantry — the arm reaching over the couch to the treatment head (its round collimator, the light
   * field) and the imaging panel opposite — that swings right round the patient; the black carbon
   * couch on its turntable and column, a blue vacuum cushion on it, the pendant on its hook; the green
   * lasers from the wall and the ceiling; the console corner with the CCTV, the plan and the BEAM ON
   * light, 치료 중 on the lamp.
   *
   * Treating: a hand on the shoulder; the patient drawn straight by the sheet to the lasers; the marks
   * checked under the cross; the couch raised from the pendant; at the console the gantry swung right
   * round them (치료 중); back, the couch down, a hand on the shoulder. A quiet word with them: stood
   * at their shoulder, a hand over theirs.
   */
  linacMachine(g, _W, _D, _c, _def, _ctx, out) {
    const L = RG.LN;
    const Z = RG.BORE_Z;
    const iso = vp(L.iso);
    // ---- The drum stand.
    part(g, rbox(0.38, 1.95, 1.4, 0.08), '#f4f6f8', -0.81, 0.975, Z);
    part(g, cyl(0.7, 0.7, 0.04, 40), '#e8edf1', L.drum + 0.02, iso.y, Z, { rz: Math.PI / 2 });
    part(g, ring(0.7, 0.012), MACH_DD, L.drum + 0.042, iso.y, Z, { ry: Math.PI / 2, outline: false });
    part(g, box(0.38, 0.012, 1.4), '#26a69a', -0.81, 0.3, Z + 0.001, { outline: false });
    const side = painted('rg-ln-side', 256, 128, (c) => {
      FILL(c, 256, 128, '#f4f6f8');
      c.fillStyle = '#26a69a';
      c.fillRect(0, 90, 256, 6);
      text(c, 'HALCYON-K', 16, 46, 26, '#00695c');
      text(c, '선형가속기', 18, 76, 16, '#607d8b', 'left', false);
    });
    picture(g, side, 0.36, 0.18, -0.81, 1.62, Z + 0.705);
    /** The gantry: the arm, the head and its collimator (light window), the imaging panel opposite. */
    const gantry = (parent: THREE.Object3D) => {
      const r = group(parent, L.drum + 0.04, iso.y, Z);
      const hx = iso.x - (L.drum + 0.04);
      part(r, rbox(hx + 0.12, 0.22, 0.46, 0.06), '#f4f6f8', (hx + 0.12) / 2, L.arm + 0.1, 0);
      part(r, rbox(0.42, 0.34, 0.46, 0.08), '#f4f6f8', hx, L.arm - 0.05, 0);
      part(r, box(0.43, 0.012, 0.462), '#26a69a', hx, L.arm + 0.06, 0, { outline: false });
      part(r, cyl(0.17, 0.19, 0.08, 24), '#cfd8dc', hx, L.arm - 0.25, 0);
      part(r, cyl(0.1, 0.1, 0.006, 20), '#455a64', hx, L.arm - 0.292, 0, { outline: false });
      // The imaging panel on its arm, opposite.
      part(r, rbox(hx - 0.1, 0.08, 0.1, 0.02), MACH_D, (hx - 0.1) / 2, -0.52, 0);
      part(r, rbox(0.44, 0.04, 0.44, 0.02), '#cfd8dc', hx, -0.5, 0);
      part(r, box(0.38, 0.004, 0.38), '#37474f', hx, -0.478, 0, { outline: false });
      return { r, hx };
    };
    // ---- The couch: turntable, column, carbon top, the cushion.
    part(g, cyl(0.42, 0.42, 0.02, 32), MACH_D, 0.55, 0.01, Z);
    part(g, rbox(0.36, 0.34, 0.32, 0.04), '#f4f6f8', 0.6, 0.18, Z);
    const couch = (parent: THREE.Object3D) => {
      const c = group(parent, 0, L.low, Z);
      const col = part(c, rbox(0.26, 1, 0.24, 0.03), MACH_D, 0.6, -0.5, 0);
      part(c, rbox(L.half * 2, 0.05, 0.52, 0.02), '#2b2f33', L.couch, -0.025, 0);
      for (let i = 0; i < 14; i++) for (const s of [-1, 1]) part(c, box(0.01, 0.003, 0.03), '#eceff1', L.couch - L.half + 0.08 + i * 0.1, 0.002, s * 0.24, { outline: false });
      part(c, rbox(0.8, 0.06, 0.48, 0.05), '#3f6fb5', L.couch - 0.28, 0.02, 0);
      part(c, cyl(0.05, 0.05, 0.36, 12), '#3f6fb5', L.couch + L.half - 0.38, 0.06, 0, { rx: Math.PI / 2 });
      return { c, col };
    };
    const setCouch = (cc: ReturnType<typeof couch>, lift: number) => {
      const y = mix(L.low, L.high, lift);
      cc.c.position.y = y;
      cc.col.scale.y = Math.max(0.05, y - 0.32);
      cc.col.position.y = -(y - 0.32) / 2;
    };
    const pendant = (parent: THREE.Object3D) => {
      const p = group(parent);
      part(p, rbox(0.06, 0.12, 0.03, 0.012), '#eceff1', 0, -0.06, 0);
      for (let i = 0; i < 3; i++) part(p, cyl(0.008, 0.008, 0.006, 8), ['#43a047', '#1e88e5', '#1e88e5'][i], 0, -0.03 - i * 0.03, 0.017, { rx: Math.PI / 2, outline: false });
      return p;
    };
    // The lasers' boxes: on the ceiling post over the couch and on the far wall.
    part(g, rbox(0.06, 0.06, 0.06, 0.01), '#37474f', iso.x, 2.1, Z);
    part(g, box(0.012, 0.25, 0.012), STEEL, iso.x, 2.27, Z, { outline: false });
    part(g, rbox(0.06, 0.06, 0.05, 0.01), '#37474f', iso.x, iso.y, -0.97);
    const idle = group(g);
    out.idle = idle;
    gantry(idle);
    const cc0 = couch(idle);
    setCouch(cc0, 0);
    pendant(idle).position.copy(vp(RG.LN_HOOK));
    part(idle, rbox(0.34, 0.05, 0.3, 0.02), '#ffffff', L.couch + 0.35, L.low + 0.05, Z);
    const plan = painted('rg-plan', 320, 200, paintConsole('방사선 치료 · 흉부', ['VMAT 1 arc · 6 MV', '분할 12 / 25회', '선량 2.0 Gy', 'MU 486', '셋업 확인 완료'], '#00897b'));
    const cn = corner(g, LEAD_GLASS, '치료 중', plan, painted('rg-ln-cctv', 160, 100, (c) => {
      FILL(c, 160, 100, '#0d1114');
      c.fillStyle = '#2b2f33';
      c.fillRect(20, 40, 120, 22);
      ell(c, 52, 51, 11, 9, '#c9a98a');
      c.fillStyle = '#9fc3dd';
      c.fillRect(62, 42, 64, 18);
      c.fillStyle = '#d0d4d8';
      c.fillRect(10, 10, 40, 26);
      text(c, 'CCTV 2', 6, 92, 9, '#a5d6a7');
    }));
    label(g, '치료실 · 선형가속기', 0.36, 0.06, -0.81, 2.05, Z + 0.705, '#00695c', '#ffffff');

    // ---- In use.
    const use = group(g);
    out.inUse = use;
    const gt = gantry(use);
    const cc = couch(use);
    const pat = lying(cc.c, LOOKS.elder, L.couch + L.half - 0.0);
    const pend = pendant(use);
    const fieldLit = ownGlow(gt.r, box(0.2, 0.003, 0.2), '#fff9c4', gt.hx, L.arm - 0.297, 0);
    const lasers = group(use);
    ownGlow(lasers, box(0.006, 0.004, 0.56), LASER_G, 0, 0, 0);
    ownGlow(lasers, box(1.2, 0.004, 0.006), LASER_G, 0, 0, 0);
    ownGlow(lasers, box(1.0, 0.006, 0.004), LASER_G, 0, 0, 0);
    const field = ownGlow(use, box(0.2, 0.003, 0.2), '#fff59d', 0, 0, 0, 0.35);
    const beamOn = label(use, 'BEAM ON', 0.1, 0.03, cn.main.position.x + 0.06, cn.main.position.y - 0.055, cn.main.position.z + 0.003, '#ffd600', '#212121');
    const dose = picture(use, painted('rg-dose', 160, 160, (c) => {
      FILL(c, 160, 160, '#000000');
      ell(c, 80, 84, 66, 48, '#7a7a7a');
      for (const sx of [-1, 1]) ell(c, 80 + sx * 30, 80, 22, 30, '#141414');
      const gr = c.createRadialGradient(64, 78, 4, 64, 78, 34);
      gr.addColorStop(0, 'rgba(255,23,68,0.85)');
      gr.addColorStop(0.5, 'rgba(255,214,0,0.6)');
      gr.addColorStop(1, 'rgba(0,229,255,0.0)');
      c.fillStyle = gr;
      c.fillRect(0, 0, 160, 160);
      text(c, '선량 분포', 6, 10, 10, '#ffd54f');
    }), 0.105, 0.105, cn.main.position.x - 0.065, cn.main.position.y - 0.005, cn.main.position.z + 0.002);
    const mark = marker(g, 0, 1.0, 0);
    const spots: Record<string, Spot> = {
      radiationTherapy: spotAt(g, RG.LN_SET, 'stand', 'rgLinac', mark),
      radiographer_comfortRadiotherapy: spotAt(g, RG.LN_TALK, 'stand', 'rgComfort', mark),
      '*': spotAt(g, RG.LN_SET, 'stand', 'rgLinac', mark),
    };
    out.spots = spots;
    out.work = mark;
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const m = (now ? spots[now].motion : 'rgLinac') as RG.RgMotion;
      const ph = phaseOf(mark);
      const key = RG.rgKeyOf(m, t, ph).key;
      pat.head.rotation.set(0, 0, 0);
      if (m === 'rgComfort') {
        const b = RG.comfortBeat(t, ph);
        moveSpot(spots.radiographer_comfortRadiotherapy, b.at);
        setCouch(cc, 0);
        gt.r.rotation.x = 0;
        lasers.visible = field.visible = fieldLit.visible = beamOn.visible = false;
        pend.position.copy(vp(RG.LN_HOOK));
        // Turned to them, talking a little when they're listened to.
        pat.head.rotation.set(0, -0.5, 0);
        pat.mouth(b.from === 'listen' ? 0.3 * Math.max(0, Math.sin(t * 6)) : 0);
        pat.armR(v3(-0.26, 0.86, 0.02));
        dose.visible = true;
        lamp(cn, false);
        return;
      }
      const b = RG.lnBeat(t, ph);
      for (const [k, s] of Object.entries(spots)) if (k !== 'radiographer_comfortRadiotherapy') moveSpot(s, b.at);
      const s = RG.lnState(b);
      setCouch(cc, s.lift);
      cc.c.position.z = Z + s.shift;
      gt.r.rotation.x = s.gantry;
      pat.mouth(0);
      pat.eyes(s.beaming);
      pat.upper.scale.set(1, 1, 1 + 0.02 * Math.sin(t * 1.3));
      const top = mix(L.low, L.high, s.lift);
      lasers.visible = s.lasers;
      lasers.children[0].position.set(iso.x, top + 0.215, Z);
      lasers.children[1].position.set(L.couch, top + 0.215, Z);
      lasers.children[2].position.set(L.couch, top + 0.11, Z + 0.2);
      field.visible = fieldLit.visible = s.field;
      field.position.set(iso.x, top + 0.218, Z);
      beamOn.visible = s.beaming;
      dose.visible = true;
      if (s.pendant) pend.position.copy(vp(key.r, 0.02));
      else pend.position.copy(vp(RG.LN_HOOK));
      lamp(cn, s.beaming);
    };
  },

  /**
   * The control-room console (판독 · 조정실 콘솔): a long desk under a lead-glass window (the X-RAY
   * ON lamp over it), two tall diagnostic monitors and a worklist screen, keyboard and mouse, the
   * dictation mic in its cradle, a dose log binder, a phone, a desk lamp, a swivel chair. Sat at it:
   * a series scrolled through and measured, the report typed and dictated; the dose log filled in.
   */
  rgControlDesk(g, _W, _D, _c, _def, _ctx, out) {
    const n = deskCount++;
    const D = RG.DESK;
    const T = D.top;
    // The desk.
    part(g, rbox(1.84, 0.05, 0.62, 0.02), '#ece6dc', 0, T - 0.025, -0.16);
    for (const x of [-0.82, 0.82]) part(g, rbox(0.06, T - 0.05, 0.56, 0.015), '#cfc6b8', x, (T - 0.05) / 2, -0.16);
    part(g, rbox(0.42, T - 0.05, 0.56, 0.015), '#d9d1c4', 0.62, (T - 0.05) / 2, -0.16);
    for (let i = 0; i < 3; i++) part(g, box(0.12, 0.012, 0.005), STEEL, 0.62, 0.15 + i * 0.22, 0.123, { outline: false });
    // The window over it: solid below, the lead glass, the header with the lamp.
    part(g, rbox(1.9, 0.3, 0.06, 0.015), LEAD, 0, T + 0.15, -0.47);
    part(g, rbox(1.9, 0.26, 0.06, 0.015), LEAD, 0, 2.0, -0.47);
    for (const x of [-0.92, 0, 0.92]) part(g, rbox(0.06, 0.78, 0.06, 0.012), LEAD_D, x, T + 0.69, -0.47);
    glass(g, box(1.8, 0.76, 0.014), 0, T + 0.69, -0.47, LEAD_GLASS);
    part(g, rbox(0.42, 0.11, 0.08, 0.02), '#37474f', 0, 2.0, -0.42);
    const lampOff = picture(g, painted('rg-xon-off', 192, 64, paintLamp('X-RAY ON', '#6d2b2b', '#2a1414')), 0.38, 0.09, 0, 2.0, -0.378);
    label(g, n % 2 ? '치료 조정실' : '조정실 · 판독', 0.36, 0.06, -0.6, 2.0, -0.438, '#eceff1', NAVY);
    // The monitors: two tall ones, a worklist screen, on their stands.
    const tall = (x: number, ry: number) => {
      const m = group(g, x, T, -0.28, ry);
      part(m, rbox(0.16, 0.012, 0.12, 0.01), BLACK, 0, 0.006, 0);
      part(m, cyl(0.014, 0.014, 0.2, 8), BLACK, 0, 0.1, -0.02, { outline: false });
      part(m, rbox(0.32, 0.44, 0.03, 0.01), '#1c2229', 0, 0.42, 0);
      return m;
    };
    const mL = tall(-0.2, 0.08);
    const mR = tall(0.18, -0.08);
    const ws = group(g, 0.62, T, -0.25, -0.3);
    part(ws, rbox(0.12, 0.012, 0.1, 0.01), BLACK, 0, 0.006, 0);
    part(ws, rbox(0.3, 0.2, 0.025, 0.01), '#1c2229', 0, 0.2, 0);
    const worklist = painted('rg-worklist', 192, 128, (c) => {
      FILL(c, 192, 128, '#eef3f6');
      c.fillStyle = '#1565c0';
      c.fillRect(0, 0, 192, 18);
      text(c, '검사 목록', 6, 10, 11, '#ffffff');
      ['09:10 흉부 PA', '09:25 복부 CT C+', '09:40 뇌 MRI', '10:05 무릎 2방향', '10:20 흉부 CT'].forEach((s, i) => {
        text(c, s, 6, 30 + i * 20, 11, i === 1 ? '#c62828' : '#37474f', 'left', i === 1);
        text(c, i < 2 ? '완료' : '대기', 186, 30 + i * 20, 10, i < 2 ? '#2e7d32' : '#78909c', 'right', false);
      });
    });
    picture(ws, worklist, 0.28, 0.18, 0, 0.2, 0.014, '#9aa6b0');
    // The keyboard, mouse, the dictation mic in its cradle, a binder, a phone, a lamp.
    part(g, rbox(0.4, 0.016, 0.13, 0.006), '#37474f', D.kb[0], T + 0.008, D.kb[2]);
    for (let i = 0; i < 4; i++) part(g, box(0.38, 0.002, 0.016), '#90a4ae', D.kb[0], T + 0.017, D.kb[2] - 0.045 + i * 0.03, { outline: false });
    part(g, rbox(0.045, 0.018, 0.07, 0.014), '#37474f', D.mouse[0], T + 0.009, D.mouse[2]);
    part(g, rbox(0.2, 0.004, 0.22, 0.004), '#263238', D.mouse[0], T + 0.002, D.mouse[2], { outline: false });
    part(g, rbox(0.06, 0.03, 0.08, 0.01), '#455a64', D.mic[0], T + 0.015, D.mic[2]);
    const micShape = (parent: THREE.Object3D) => {
      const m = group(parent);
      part(m, rbox(0.04, 0.16, 0.03, 0.014), '#eceff1', 0, 0.08, 0);
      part(m, cyl(0.016, 0.016, 0.02, 10), '#455a64', 0, 0.16, 0, { outline: false });
      glowing(m, ball(0.005), RED, 0, 0.12, 0.016);
      return m;
    };
    const binder = painted('rg-dosebook', 128, 160, (c) => {
      FILL(c, 128, 160, '#2e7d32');
      c.fillStyle = '#ffffff';
      c.fillRect(14, 30, 100, 54);
      text(c, '환자 선량', 64, 48, 16, '#1b5e20', 'center');
      text(c, '기록부', 64, 70, 16, '#1b5e20', 'center');
    });
    part(g, rbox(0.24, 0.035, 0.3, 0.008), '#2e7d32', -0.62, T + 0.018, -0.05, { ry: 0.12 });
    const bk = picture(g, binder, 0.2, 0.25, -0.62, T + 0.037, -0.05);
    bk.rotation.set(-Math.PI / 2, 0, 0.12);
    part(g, rbox(0.16, 0.05, 0.2, 0.02), '#eceff1', 0.82, T + 0.025, -0.3);
    part(g, rbox(0.05, 0.03, 0.18, 0.015), '#cfd8dc', 0.82, T + 0.06, -0.3);
    rod(g, v3(-0.84, T, -0.38), v3(-0.82, T + 0.38, -0.34), 0.01, '#455a64');
    part(g, cyl(0.03, 0.06, 0.07, 12), '#455a64', -0.78, T + 0.38, -0.3, { rz: 0.6 });
    // The chair.
    const ch = group(g, 0, 0, RG.DESK_AT.z);
    part(ch, cyl(0.035, 0.035, 0.38, 8), BLACK, 0, 0.21, 0, { outline: false });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      rod(ch, v3(0, 0.05, 0), v3(Math.sin(a) * 0.24, 0.04, Math.cos(a) * 0.24), 0.012, BLACK);
    }
    part(ch, rbox(0.46, 0.07, 0.44, 0.04), '#37474f', 0, D.seat - 0.035, 0);
    part(ch, rbox(0.44, 0.48, 0.06, 0.04), '#37474f', 0, D.seat + 0.3, 0.22, { rx: -0.1 });
    // At rest: the screens dim with a study left up, the mic in its cradle, the lamp unlit.
    const ctImg = sliceTex('chest', 5);
    const idle = group(g);
    out.idle = idle;
    for (const [m, tex] of [[mL, ctImg], [mR, painted('rg-chest', 160, 192, paintChest)]] as const) picture(idle, tex, 0.29, 0.4, m.position.x, T + 0.42, -0.262, '#5d6873', m.rotation.y);
    micShape(idle).position.set(D.mic[0], T + 0.02, D.mic[2]);
    // In use: the series lit and scrolling, a measuring line, the mic in the hand, X-RAY ON lit for the scan next door.
    const use = group(g);
    out.inUse = use;
    const left = picture(use, ctImg, 0.29, 0.4, mL.position.x, T + 0.42, -0.26, '#ffffff', mL.rotation.y);
    const right = picture(use, painted('rg-chest', 160, 192, paintChest), 0.29, 0.4, mR.position.x, T + 0.42, -0.26, '#ffffff', mR.rotation.y);
    const doseSheet = painted('rg-dose-table', 160, 192, (c) => {
      FILL(c, 160, 192, '#f5f7f9');
      c.fillStyle = '#2e7d32';
      c.fillRect(0, 0, 160, 22);
      text(c, '환자 선량 기록', 8, 11, 12, '#ffffff');
      [['흉부 PA', '0.02 mSv'], ['흉부 CT', 'DLP 312'], ['복부 CT C+', 'DLP 486'], ['뇌 MRI', '—'], ['무릎', '0.01 mSv']].forEach(([a, b2], i) => {
        text(c, a, 8, 40 + i * 26, 11, '#263238');
        text(c, b2, 152, 40 + i * 26, 11, '#37474f', 'right', false);
      });
      text(c, '기준 이내 ✓', 80, 176, 12, '#2e7d32', 'center');
    });
    const measure = ownGlow(use, box(0.08, 0.003, 0.002), '#ffeb3b', 0, 0, 0);
    measure.position.set(mL.position.x, T + 0.44, -0.24);
    measure.rotation.z = 0.4;
    const rec = ownGlow(use, ball(0.01), RED, mL.position.x + 0.11, T + 0.6, -0.24);
    const mic = micShape(use);
    const lampOn = picture(use, painted('rg-xon-on', 192, 64, paintLamp('X-RAY ON', '#ffffff', '#e53935')), 0.38, 0.09, 0, 2.0, -0.376);
    lampOff.visible = true;
    const mark = marker(g, 0, T, -0.1);
    const spots: Record<string, Spot> = { rgReviewImages: spotAt(g, RG.DESK_AT, 'sit', 'rgPacs', mark), rgDoseLog: spotAt(g, RG.DESK_AT, 'sit', 'rgPacs', mark), '*': spotAt(g, RG.DESK_AT, 'sit', 'rgPacs', mark) };
    out.spots = spots;
    out.work = mark;
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const ph = phaseOf(mark);
      const b = RG.deskBeat(t, ph);
      const key = RG.rgKeyOf('rgPacs', t, ph).key;
      const doseLog = now === 'rgDoseLog';
      const i = b.from === 'scroll' ? Math.floor(b.p * 18) % CHEST_N : 5;
      show(left, n % 2 ? sliceTex('contrast', i) : sliceTex('chest', i));
      show(right, doseLog ? doseSheet : painted('rg-chest', 160, 192, paintChest));
      measure.visible = b.from === 'measure' && !doseLog;
      measure.scale.x = Math.max(0.05, Math.min(1, (b.p * 2) % 1.2));
      rec.visible = RG.micHeld(b) && Math.sin(t * 6) > -0.3;
      if (b.from === 'dictate') {
        mic.position.copy(vp(key.l, -0.08));
        mic.rotation.set(-0.2, 0, 0);
      } else {
        mic.position.set(D.mic[0], T + 0.02, D.mic[2]);
        mic.rotation.set(0, 0, 0);
      }
      // X-RAY ON lights now and then: someone's scanning next door.
      const xon = Math.sin(t * 0.35 + ph * 6) > 0.55;
      lampOn.visible = xon;
      lampOff.visible = !xon;
    };
  },

  /**
   * The lead apron rack (납 가운 걸이): a wheeled stand with a rail and four aprons on their hangers
   * (navy, wine, teal, plum, each with its 0.5mmPb tag), thyroid collars on hooks at the side, lead
   * glasses on the little shelf on top, the check card clipped to the post. Checking one: lifted off,
   * held up and looked over, bent gently along it, turned round, hung back and ticked.
   */
  rgApronRack(g, _W, _D, _c, _def, _ctx, out) {
    const R = RG.RACK;
    for (const sx of [-1, 1]) {
      part(g, rbox(0.05, R.rail + 0.06, 0.05, 0.012), '#b0bec5', sx * 0.38, (R.rail + 0.06) / 2, R.z);
      part(g, rbox(0.06, 0.04, 0.5, 0.012), '#90a4ae', sx * 0.38, 0.06, R.z);
      for (const dz of [-0.2, 0.2]) caster(g, sx * 0.38, R.z + dz, 0.03);
    }
    part(g, cyl(0.016, 0.016, 0.8, 10), CHROME, 0, R.rail, R.z + 0.06, { rz: Math.PI / 2 });
    part(g, rbox(0.82, 0.02, 0.18, 0.006), '#cfd8dc', 0, R.rail + 0.14, R.z);
    for (const sx of [-1, 1]) part(g, box(0.02, 0.12, 0.02), '#b0bec5', sx * 0.38, R.rail + 0.08, R.z);
    // Lead glasses on the shelf.
    for (const x of [-0.2, 0.12]) {
      const gg = group(g, x, R.rail + 0.17, R.z);
      for (const s of [-1, 1]) part(gg, ring(0.028, 0.006), '#263238', s * 0.035, 0.02, 0, { outline: false });
      part(gg, box(0.13, 0.004, 0.006), '#263238', 0, 0.02, 0, { outline: false });
    }
    /** An apron hung from its hanger (its top at the origin), facing +z. */
    const apron = (parent: THREE.Object3D, color: string) => {
      const a = group(parent);
      part(a, rbox(0.26, 0.02, 0.02, 0.008), '#455a64', 0, 0, 0);
      part(a, cyl(0.006, 0.006, 0.06, 6), '#455a64', 0, 0.04, 0, { outline: false });
      part(a, ring(0.02, 0.004, Math.PI), '#455a64', 0, 0.075, 0, { outline: false });
      for (const s of [-1, 1]) part(a, rbox(0.08, 0.14, 0.03, 0.02), color, s * 0.1, -0.07, 0);
      part(a, rbox(0.42, 0.62, 0.035, 0.06), color, 0, -0.44, 0);
      part(a, rbox(0.43, 0.04, 0.038, 0.02), '#cfd8dc', 0, -0.73, 0, { outline: false });
      label(a, '0.5mmPb', 0.12, 0.035, 0.1, -0.24, 0.02, '#eceff1', '#263238');
      return a;
    };
    const COLORS = ['#7a2e3a', '#16707a', '#5a3d75'];
    COLORS.forEach((c, i) => apron(g, c).position.set(-0.03 + i * 0.03, R.rail, R.front - 0.05 - i * 0.045));
    // Thyroid collars on the hooks at the left post.
    for (let i = 0; i < 2; i++) {
      part(g, box(0.06, 0.012, 0.012), STEEL, -0.42, 1.25 - i * 0.18, R.z + 0.04, { outline: false });
      part(g, ring(0.06, 0.018, Math.PI * 1.4), i ? '#16707a' : NAVY, -0.45, 1.2 - i * 0.18, R.z + 0.06, { rz: -0.4, outline: false });
    }
    // The check card on the right post.
    const card = (ticked: number) =>
      painted(`rg-apron-card-${ticked}`, 128, 160, (c) => {
        FILL(c, 128, 160, '#ffffff');
        c.fillStyle = NAVY;
        c.fillRect(0, 0, 128, 24);
        text(c, '납 가운 점검표', 64, 12, 13, '#ffffff', 'center');
        ['1번 남색', '2번 와인', '3번 청록', '4번 보라'].forEach((s, i) => {
          text(c, s, 8, 42 + i * 26, 12, '#37474f');
          if (i < ticked) text(c, '✓', 112, 42 + i * 26, 16, '#2e7d32', 'center');
          else {
            c.strokeStyle = '#b0bec5';
            c.strokeRect(104, 34 + i * 26, 16, 16);
          }
        });
        text(c, '균열 · 찢김 확인', 64, 150, 10, '#78909c', 'center', false);
      });
    part(g, rbox(0.11, 0.15, 0.01, 0.004), '#a1887f', 0.38, 1.2, R.z + 0.035);
    const cardM = picture(g, card(3), 0.1, 0.13, 0.38, 1.19, R.z + 0.042);
    label(g, '납 가운', 0.24, 0.06, 0, R.rail + 0.06, R.z + 0.035, NAVY, '#ffffff');
    const idle = group(g);
    out.idle = idle;
    apron(idle, NAVY).position.set(0, R.rail, R.front);
    const use = group(g);
    out.inUse = use;
    const held = apron(use, NAVY);
    const mark = marker(g, 0, 1.2, 0);
    const spots: Record<string, Spot> = { rgCheckAprons: spotAt(g, RG.RACK_AT, 'stand', 'rgApron', mark), '*': spotAt(g, RG.RACK_AT, 'stand', 'rgApron', mark) };
    out.spots = spots;
    out.work = mark;
    out.animate = (t) => {
      const ph = phaseOf(mark);
      const b = RG.apronBeat(t, ph);
      const key = RG.rgKeyOf('rgApron', t, ph).key;
      const s = RG.apronState(b);
      if (s.held) {
        held.position.set((key.l[0] + key.r[0]) / 2, (key.l[1] + key.r[1]) / 2 + 0.03, (key.l[2] + key.r[2]) / 2 - 0.02);
        held.rotation.set(-0.15 - s.bend, s.turn, 0);
        held.scale.set(1 - s.bend * 0.3, 1, 1);
      } else {
        held.position.set(0, R.rail, R.front);
        held.rotation.set(0, 0, 0);
        held.scale.set(1, 1, 1);
      }
      show(cardM, card(s.ticked ? 4 : 3));
    };
  },

  /**
   * The contrast injector (조영제 자동 주입기): a five-wheeled base and column, the head with its two
   * syringes (A, contrast, faintly yellow; B, saline) that tips up to fill and down to inject, the
   * line coiled off it, the touch screen on its arm (the protocol), and the bottle warmer at 37 ℃ with
   * bottles in it. Got ready: a warmed bottle spiked over A, A drawn full, then B, tapped and tipped
   * up to push the air out, the protocol set, tipped down ready.
   */
  rgInjector(g, _W, _D, _c, _def, _ctx, out) {
    const I = RG.INJ;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3;
      rod(g, v3(0, 0.08, -0.08), v3(Math.sin(a) * 0.28, 0.06, -0.08 + Math.cos(a) * 0.28), 0.016, '#b0bec5');
      caster(g, Math.sin(a) * 0.28, -0.08 + Math.cos(a) * 0.28, 0.03);
    }
    part(g, cyl(0.035, 0.04, I.pivot[1] - 0.12, 12), '#eceff1', 0, (I.pivot[1] - 0.12) / 2 + 0.06, -0.08);
    // The warmer on its shelf, the bottles in it.
    part(g, rbox(0.22, 0.02, 0.2, 0.006), '#cfd8dc', I.warmer[0], 0.82, I.warmer[2]);
    rod(g, v3(I.warmer[0] + 0.1, 0.82, I.warmer[2] - 0.02), v3(-0.03, 0.82, -0.08), 0.012, '#b0bec5');
    part(g, rbox(0.2, 0.16, 0.18, 0.02), '#eceff1', I.warmer[0], 0.91, I.warmer[2]);
    glass(g, box(0.15, 0.1, 0.005), I.warmer[0], 0.92, I.warmer[2] + 0.092);
    for (const dx of [-0.045, 0.0, 0.045]) part(g, cyl(0.02, 0.02, 0.08, 10), '#fff8e1', I.warmer[0] + dx, 0.9, I.warmer[2] + 0.03, { outline: false });
    picture(g, painted('rg-warm', 96, 40, paintLamp('37.0℃', '#ff8a65', '#1a0f0a', 96, 40)), 0.06, 0.025, I.warmer[0] + 0.05, 0.97, I.warmer[2] + 0.092);
    label(g, '조영제 가온기', 0.15, 0.03, I.warmer[0], 1.0, I.warmer[2] + 0.092, '#eceff1', '#bf360c');
    // The screen's arm and the screen.
    rod(g, v3(0.03, 1.0, -0.08), v3(I.screen[0] - 0.02, I.screen[1] - 0.1, I.screen[2] - 0.04), 0.012, '#b0bec5');
    part(g, rbox(0.24, 0.17, 0.03, 0.012), '#263238', I.screen[0], I.screen[1], I.screen[2] - 0.02, { rx: -0.3 });
    const prot = painted('rg-inj-screen', 192, 136, (c) => {
      FILL(c, 192, 136, '#0e2235');
      c.fillStyle = '#ffd54f';
      c.fillRect(8, 30, 84, 70);
      c.fillStyle = '#4fc3f7';
      c.fillRect(100, 30, 84, 70);
      text(c, '주입 프로토콜', 8, 14, 13, '#ffffff');
      text(c, 'A 조영제', 50, 46, 12, '#3e2723', 'center');
      text(c, '80 mL', 50, 70, 18, '#3e2723', 'center');
      text(c, '3.0 mL/s', 50, 90, 11, '#3e2723', 'center', false);
      text(c, 'B 식염수', 142, 46, 12, '#01579b', 'center');
      text(c, '40 mL', 142, 70, 18, '#01579b', 'center');
      text(c, '3.0 mL/s', 142, 90, 11, '#01579b', 'center', false);
      c.fillStyle = '#43a047';
      c.fillRect(56, 108, 80, 22);
      text(c, '준비 완료', 96, 119, 12, '#ffffff', 'center');
    });
    const screenM = picture(g, prot, 0.22, 0.155, I.screen[0], I.screen[1], I.screen[2] - 0.003, '#5d6873');
    screenM.rotation.x = -0.3;
    label(g, '조영제 자동 주입기', 0.2, 0.035, 0, 0.98, -0.04, '#eceff1', ACCENT);
    /** The head on its pivot (tilted `a`, up positive), its syringes' fills shown as `fa`, `fb`. */
    const head = (parent: THREE.Object3D) => {
      const h = group(parent, I.pivot[0], I.pivot[1], I.pivot[2]);
      part(h, rbox(0.26, 0.13, 0.22, 0.04), '#eceff1', 0, 0, -0.02);
      part(h, box(0.262, 0.01, 0.222), ACCENT, 0, 0.04, -0.02, { outline: false });
      for (const [sx, tag, col] of [[-0.06, 'A', '#fbc02d'], [0.06, 'B', '#29b6f6']] as const) {
        part(h, cyl(0.036, 0.036, 0.02, 14), '#b0bec5', sx, 0, 0.1, { rx: Math.PI / 2 });
        const barrel = new THREE.Mesh(cyl(0.032, 0.032, 0.22, 14), CLEAR);
        barrel.position.set(sx, 0, 0.21);
        barrel.rotation.x = Math.PI / 2;
        barrel.renderOrder = 2;
        h.add(barrel);
        part(h, cyl(0.01, 0.03, 0.03, 10), '#eceff1', sx, 0, 0.335, { rx: Math.PI / 2 });
        label(h, tag, 0.03, 0.03, sx, 0.068, 0.0, col, '#ffffff');
      }
      const fill = [-0.06, 0.06].map((sx, i) => {
        const f = new THREE.Mesh(cyl(0.028, 0.028, 1, 12), i ? SALINE : CONTRAST);
        f.rotation.x = Math.PI / 2;
        f.position.set(sx, 0, 0.21);
        h.add(f);
        const plunger = part(h, cyl(0.03, 0.03, 0.012, 12), '#455a64', sx, 0, 0.11, { rx: Math.PI / 2, outline: false });
        return { f, plunger };
      });
      const set = (fa: number, fb: number, tilt: number) => {
        h.rotation.x = -tilt;
        [fa, fb].forEach((k, i) => {
          const L = 0.2 * Math.max(0.02, k);
          fill[i].f.scale.set(1, L, 1);
          fill[i].f.position.z = 0.32 - L / 2;
          fill[i].plunger.position.z = 0.32 - L - 0.006;
        });
      };
      return { h, set };
    };
    // The line off the tips, looped and hanging off to the left (to the table it's for).
    const idle = group(g);
    out.idle = idle;
    const h0 = head(idle);
    h0.set(0.15, 0.1, -0.45);
    const tubeIdle = limb(idle, 0.004, '#e0f7fa');
    tubeIdle(v3(0, 0.98, 0.22), v3(-0.5, 0.95, 0.0));
    const use = group(g);
    out.inUse = use;
    const h1 = head(use);
    const tube1 = limb(use, 0.004, '#e0f7fa');
    const tube2 = limb(use, 0.004, '#e0f7fa');
    const bottle = group(use);
    part(bottle, cyl(0.035, 0.035, 0.12, 12), '#fff8e1', 0, 0, 0, { outline: false });
    part(bottle, cyl(0.018, 0.03, 0.03, 10), '#fff8e1', 0, -0.075, 0, { outline: false });
    part(bottle, cyl(0.02, 0.02, 0.012, 10), '#7e57c2', 0, -0.095, 0, { outline: false });
    label(bottle, '조영제', 0.05, 0.03, 0, 0.0, 0.036, '#ffffff', '#4527a0');
    const bubbles = [0, 1, 2].map(() => ownGlow(use, ball(0.006), '#ffffff', 0, 0, 0, 0.9));
    const screenLit = picture(use, prot, 0.22, 0.155, I.screen[0], I.screen[1], I.screen[2] - 0.001);
    screenLit.rotation.x = -0.3;
    const mark = marker(g, 0, 1.0, 0);
    const spots: Record<string, Spot> = { rgLoadInjector: spotAt(g, RG.INJ_AT, 'stand', 'rgInject', mark), '*': spotAt(g, RG.INJ_AT, 'stand', 'rgInject', mark) };
    out.spots = spots;
    out.work = mark;
    const tip = new THREE.Vector3();
    out.animate = (t) => {
      const ph = phaseOf(mark);
      const b = RG.injBeat(t, ph);
      const key = RG.rgKeyOf('rgInject', t, ph).key;
      const s = RG.injState(b);
      h1.set(s.a, s.b, s.tilt);
      // Where syringe A's tip is now (the head's turned about its pivot).
      tip.set(-0.06, 0, 0.35).applyAxisAngle(v3(1, 0, 0), -s.tilt).add(vp(I.pivot));
      tube1(tip, v3(-0.1, mix(tip.y - 0.25, 0.75, 0.5), 0.15));
      tube2(v3(-0.1, mix(tip.y - 0.25, 0.75, 0.5), 0.15), v3(-0.5, 0.95, 0.0));
      bottle.visible = s.bottle > 0;
      if (s.bottle >= 1) {
        bottle.position.copy(tip).add(v3(0, 0.11, 0));
        bottle.rotation.set(Math.PI, 0, 0);
      } else if (s.bottle > 0) {
        bottle.position.copy(vp(key.l, 0.02));
        bottle.rotation.set(b.p > 0.5 ? Math.PI : 0, 0, 0);
      }
      bubbles.forEach((m, i) => {
        m.visible = s.bubbles;
        const u = (t * 0.8 + i / 3) % 1;
        const along = 0.12 + 0.2 * u;
        m.position.set(-0.06, 0.02, along).applyAxisAngle(v3(1, 0, 0), -s.tilt).add(vp(I.pivot));
      });
      screenLit.visible = s.screen;
    };
  },

  /**
   * The changing booth (탈의실): two cubicles side by side, laminate partitions under a curtain rail;
   * the left one open — a slatted bench, a hook with a gown hung on it, a shelf of folded gowns, a
   * small mirror, the basket for valuables (금속류는 바구니에) — the right one's curtain drawn, a pair
   * of slippers and feet under it. Tidied: a used gown off the bench shaken out, folded, put on the
   * stack, a fresh one hung on the hook, the basket set straight.
   */
  rgChangeBooth(g, _W, _D, _c, _def, _ctx, out) {
    const B = RG.BOOTH;
    const BODY = '#e6ded2';
    const D0 = -0.48;
    const D1 = 0.32;
    for (const x of [-0.98, 0, 0.98]) part(g, rbox(0.04, 1.9, D1 - D0, 0.012), BODY, x, 0.98, (D0 + D1) / 2);
    part(g, rbox(1.98, 1.9, 0.03, 0.012), '#efe9df', 0, 0.98, D0);
    part(g, cyl(0.012, 0.012, 1.96, 8), CHROME, 0, 1.95, D1, { rz: Math.PI / 2 });
    for (const [x, word] of [[-0.5, '탈의실 1'], [0.5, '탈의실 2']] as const) label(g, word, 0.2, 0.05, x, 2.02, D1, '#eceff1', NAVY);
    // The left cubicle: bench, hook, shelf of gowns, mirror, basket.
    part(g, rbox(0.7, 0.04, 0.3, 0.01), '#c49a6c', B.bench[0], B.bench[1] - 0.02, B.bench[2]);
    for (const dx of [-0.3, 0.3]) part(g, box(0.04, B.bench[1] - 0.04, 0.26), '#a07c52', B.bench[0] + dx, (B.bench[1] - 0.04) / 2, B.bench[2]);
    part(g, rbox(0.06, 0.02, 0.04, 0.008), CHROME, B.hook[0], B.hook[1], B.hook[2] - 0.03);
    part(g, rbox(0.28, 0.02, 0.24, 0.006), '#cfc6b8', B.shelf[0] + 0.1, B.shelf[1] - 0.02, B.shelf[2]);
    part(g, rbox(0.012, 0.36, 0.26, 0.004), '#b3e5fc', -0.955, 1.4, -0.1, { outline: false });
    part(g, rbox(0.3, 0.12, 0.22, 0.02), '#42a5f5', B.basket[0], B.basket[1] - 0.06, B.basket[2]);
    label(g, '귀중품', 0.1, 0.03, B.basket[0], B.basket[1] - 0.06, B.basket[2] + 0.112, '#42a5f5', '#ffffff');
    picture(g, painted('rg-booth-note', 160, 120, (c) => {
      FILL(c, 160, 120, '#fffde7');
      c.fillStyle = '#1565c0';
      c.fillRect(0, 0, 160, 26);
      text(c, '검사복으로 갈아입어 주세요', 80, 14, 12, '#ffffff', 'center');
      text(c, '목걸이 · 벨트 · 머리핀 등', 80, 50, 12, '#37474f', 'center');
      text(c, '금속류는 바구니에', 80, 74, 14, '#c62828', 'center');
      text(c, '임신 가능성은 직원에게', 80, 100, 11, '#6d4c41', 'center', false);
    }), 0.26, 0.2, -0.5, 1.5, D0 + 0.018);
    /** A folded gown (its bottom at the origin). */
    const folded = (parent: THREE.Object3D, y: number) => part(parent, rbox(0.24, 0.04, 0.2, 0.012), GOWN, 0, y + 0.02, 0);
    const stack = group(g, B.shelf[0] + 0.1, B.shelf[1], B.shelf[2]);
    for (let i = 0; i < 3; i++) folded(stack, i * 0.042);
    const hungGown = (parent: THREE.Object3D) => {
      const h = group(parent, B.hook[0], B.hook[1] - 0.02, B.hook[2] + 0.02);
      part(h, rbox(0.26, 0.04, 0.03, 0.01), GOWN_D, 0, 0, 0);
      part(h, rbox(0.36, 0.62, 0.04, 0.05), GOWN, 0, -0.33, 0.01);
      return h;
    };
    // The right cubicle: the curtain drawn, slippers and feet under it.
    for (let i = 0; i < 9; i++) part(g, box(0.11, 1.62, 0.02), i % 2 ? '#7fa7c9' : '#8fb4d6', 0.06 + i * 0.105, 1.14, D1 - 0.01 + (i % 2) * 0.02, { outline: false });
    for (const sx of [-1, 1]) {
      part(g, rbox(0.1, 0.05, 0.22, 0.03), '#9fb6c8', 0.5 + sx * 0.08, 0.025, D1 - 0.2);
      part(g, cyl(0.045, 0.045, 0.24, 10), '#4a5a6a', 0.5 + sx * 0.08, 0.17, D1 - 0.25, { outline: false });
    }
    // The left's curtain bunched open at its side.
    for (let i = 0; i < 4; i++) part(g, cyl(0.035, 0.035, 1.62, 10), i % 2 ? '#7fa7c9' : '#8fb4d6', -0.9 + i * 0.05, 1.14, D1 - 0.01, { outline: false });
    const idle = group(g);
    out.idle = idle;
    hungGown(idle);
    part(idle, rbox(0.3, 0.06, 0.2, 0.04), GOWN, B.bench[0] + 0.05, B.bench[1] + 0.03, B.bench[2], { ry: 0.3 });
    const use = group(g);
    out.inUse = use;
    const hung = hungGown(use);
    const crumpled = part(use, rbox(0.3, 0.06, 0.2, 0.04), GOWN, B.bench[0] + 0.05, B.bench[1] + 0.03, B.bench[2], { ry: 0.3 });
    const extra = folded(use, 0);
    const held = part(use, rbox(0.42, 1, 0.03, 0.02), GOWN, 0, 0, 0);
    const fresh = part(use, rbox(0.24, 0.04, 0.2, 0.012), GOWN, 0, 0, 0);
    const mark = marker(g, 0, 1.0, 0);
    const spots: Record<string, Spot> = { rgFoldGowns: spotAt(g, RG.BOOTH_AT, 'stand', 'rgGown', mark), '*': spotAt(g, RG.BOOTH_AT, 'stand', 'rgGown', mark) };
    out.spots = spots;
    out.work = mark;
    out.animate = (t) => {
      const ph = phaseOf(mark);
      const b = RG.gownBeat(t, ph);
      const key = RG.rgKeyOf('rgGown', t, ph).key;
      const s = RG.gownState(b);
      crumpled.visible = s.onBench;
      held.visible = s.held;
      if (s.held) {
        const h = mix(0.22, 0.62, s.open);
        held.scale.set(mix(0.6, 1, s.open), h, mix(4, 1, s.open));
        held.position.set((key.l[0] + key.r[0]) / 2, (key.l[1] + key.r[1]) / 2 - h / 2 + 0.03, (key.l[2] + key.r[2]) / 2);
      }
      extra.visible = s.stacked;
      extra.position.set(B.shelf[0] + 0.1, B.shelf[1] + 3 * 0.042 + 0.02, B.shelf[2]);
      hung.visible = s.hung;
      fresh.visible = s.fresh;
      if (s.fresh) fresh.position.copy(vp(key.r, -0.02));
    };
  },

  /**
   * The radiation warning sign (방사선 관리구역 안내): the 촬영 중 lamp box (lit red), under it the
   * yellow trefoil sign and a pink notice for anyone who may be pregnant; on the wall, or on a post
   * where there's none. Set dressing by the door.
   */
  rgWarnSign(g, _W, D, _c, _def, ctx, _out) {
    const n = signCount++;
    const wall = ctx.againstWall;
    const z = wall ? -D / 2 + 0.03 : 0;
    if (!wall) {
      part(g, cyl(0.2, 0.22, 0.03, 20), '#90a4ae', 0, 0.015, 0);
      part(g, cyl(0.02, 0.02, 1.9, 8), STEEL, 0, 0.95, -0.02, { outline: false });
    }
    const word = n % 2 ? '치료 중' : '촬영 중';
    part(g, rbox(0.46, 0.15, 0.08, 0.02), '#37474f', 0, 2.02, z + 0.04);
    picture(g, painted(`rg-lamp-on-${word}`, 192, 64, paintLamp(word, '#ffffff', '#e53935')), 0.42, 0.12, 0, 2.02, z + 0.082);
    glowing(g, box(0.4, 0.01, 0.01), '#ff8a80', 0, 1.94, z + 0.08);
    part(g, rbox(0.3, 0.4, 0.015, 0.008), '#fbc02d', 0, 1.56, z + 0.01);
    picture(g, TREFOIL(), 0.28, 0.37, 0, 1.56, z + 0.019);
    const note = painted('rg-preg', 192, 96, (c) => {
      FILL(c, 192, 96, '#fce4ec');
      c.strokeStyle = '#ec407a';
      c.lineWidth = 4;
      c.strokeRect(3, 3, 186, 90);
      text(c, '임신 중이거나 가능성이 있으면', 96, 32, 14, '#880e4f', 'center');
      text(c, '촬영 전 직원에게 알려 주세요', 96, 62, 14, '#880e4f', 'center');
    });
    picture(g, note, 0.32, 0.16, 0, 1.2, z + 0.012);
    label(g, CENTRE, 0.3, 0.05, 0, 1.04, z + 0.012, '#eceff1', NAVY);
  },
};

/** Where the patient's back is on the chest stand (the light field falls there). */
const XR_BACK_X = RG.XR.pat.x + 0.12;
