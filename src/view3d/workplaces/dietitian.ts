import * as THREE from 'three';
import type { Motion } from '../activity';
import { marker, rod, spot, type Builder, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, caster, glass, glowing, label, litScreen, painted, picture, ring, text, type Paint } from './doctor';
import * as DT from './dietitianMotion';

/**
 * The 단체급식실 drawn as itself (2026-10-27 workplace pipeline, at the user's request): stainless
 * steel, white tile, steam. The 국솥 — a 300-litre tilting steam kettle on its trunnions with the
 * handwheel, the swing-arm tap and its console — stirred with a paddle as long as an oar; the 배식대
 * with its five wells (밥 · 국 · 반찬 셋) under a heat-lamp canopy and the pupils' tray rail along its
 * far side, a pupil coming along it with a steel 식판 that fills as they're served; the dietitian's
 * desk with the month's 식단표 pinned up behind; the hand basin with its knee valve, the mirror and
 * the swab shelf; the wire rack of the store with the 20 kg rice sacks. And what it was missing
 * (workFurniture/dietitian.ts): the 보존식 freezer, the 퇴식구 with its roller belt and 잔반 scale,
 * the conveyor dishwasher, the 오늘의 메뉴 sign with the allergy numbers over the sample tray, the
 * long cafeteria tables and the cold room's door.
 *
 * The school (햇살초등학교), its menu and everyone in it are made up. The dietitian's hands and what's
 * on the pieces go by one clock (dietitianMotion.ts): the paddle goes round with the hands, a tray
 * fills as it's served, the freezer door swings as it's pulled. Moving parts are drawn twice — at
 * rest in `idle` and moving in `inUse` — so nothing's left half-done when the work stops.
 */

const SCHOOL = '햇살초등학교';
const STAINLESS = '#cfd6db';
const STAINLESS_D = '#9aa6ae';
const TILE = '#f4f6f4';
const RICE = '#fbf8ee';
const SOUP = '#6b6233';
const SEAWEED = '#2f3d1d';
const EGG = '#f3cb4f';
const SPINACH = '#3f7d2c';
const KIMCHI = '#d2532f';
const CARD = '#fffdf6';
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const vp = (p: DT.P, dy = 0) => new THREE.Vector3(p[0], p[1] + dy, p[2]);
const mid = (a: DT.P, b: DT.P, dy = 0) => new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + dy, (a[2] + b[2]) / 2);
const UP = new THREE.Vector3(0, 1, 0);
const ss = DT.ss;
/** The dishwasher's tunnel (in the piece's frame). */
const WASHER_GEOM = { len: DT.WASHER.tunnel * 2, d: DT.WASHER.front + 0.42, zc: (DT.WASHER.front - 0.42) / 2 };

// ---------------------------------------------------------------------------------------------
// Small parts.

/** A group placed and turned in `parent`. */
function group(parent: THREE.Object3D, x = 0, y = 0, z = 0, ry = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}
/** A spot from the motions' table, and what's done there; `work` is the piece's clock mark (or where the hands go). */
function spotAt(g: THREE.Object3D, s: DT.SpotAt, how: 'sit' | 'stand', motion: Motion, work?: THREE.Object3D): Spot {
  const p = spot(g, how, s.x, s.y, s.z, s.yaw, how === 'sit' ? s.y : undefined);
  p.work = work;
  p.motion = motion;
  return p;
}
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
/** Which of a piece's uses is going on now (the spot a dweller's been posed at just now, the latest). */
function nowAt(spots: Record<string, Spot>, t: number): string | null {
  let best: string | null = null;
  for (const [k, s] of Object.entries(spots)) if (Math.abs(t - posedAt(s)) < 0.6 && (best === null || posedAt(s) > posedAt(spots[best]))) best = k;
  return best;
}
const tmp = new THREE.Vector3();
const phaseOf = (m: THREE.Object3D) => DT.dtPhase(m.getWorldPosition(tmp));
/** A cylinder stretched between two points each frame (an arm, a leg, a paddle's shaft, a stream). */
function limb(g: THREE.Object3D, r: number, color: string, material?: THREE.Material, outline = false): { set: (a: THREE.Vector3, b: THREE.Vector3) => void; mesh: THREE.Mesh } {
  const m = part(g, cyl(r, r * 0.9, 1, 8), color, 0, 0, 0, { outline, ...(material ? { material } : {}) });
  const d = new THREE.Vector3();
  return {
    mesh: m,
    set: (a, b) => {
      d.subVectors(b, a);
      m.position.copy(a).addScaledVector(d, 0.5);
      m.scale.set(1, Math.max(0.001, d.length()), 1);
      m.quaternion.setFromUnitVectors(UP, d.normalize());
    },
  };
}
/** A sheet lying flat on a top, readable from +z (turned `ry` about the vertical). */
function flat(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0): THREE.Mesh {
  const m = picture(g, tex, w, h, x, y, z);
  m.rotation.order = 'YXZ';
  m.rotation.set(-Math.PI / 2, ry, 0);
  return m;
}
const STEAM = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.4, depthWrite: false });
const MIST = new THREE.MeshBasicMaterial({ color: '#e3f2fd', transparent: true, opacity: 0.45, depthWrite: false });
const WATER = new THREE.MeshBasicMaterial({ color: '#b3e5fc', transparent: true, opacity: 0.7, depthWrite: false });
const FOAM = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9 });
const BAGGIE = new THREE.MeshToonMaterial({ color: '#eef7fb', transparent: true, opacity: 0.5, depthWrite: false });
const FLAME = new THREE.MeshBasicMaterial({ color: '#4fc3f7', transparent: true, opacity: 0.8, depthWrite: false });
/** Puffs rising off a point, `n` of them, `k` how strong (0 none), drifting up over `rise`. */
function puffs(g: THREE.Object3D, n: number, mat: THREE.Material, size: number): (at: DT.P, t: number, k: number, rise?: number, spread?: number) => void {
  const bs = Array.from({ length: n }, () => {
    const m = new THREE.Mesh(ball(size), mat);
    g.add(m);
    return m;
  });
  return (at, t, k, rise = 0.3, spread = 0.03) => {
    bs.forEach((m, i) => {
      const u = (t * 0.55 + i / n) % 1;
      m.visible = k > 0.02;
      m.position.set(at[0] + spread * Math.sin(u * 7 + i * 2.1), at[1] + u * rise, at[2] + spread * Math.cos(u * 5 + i * 1.7));
      const s = (0.5 + u * 1.6) * Math.min(1, k * 1.5) * (1 - u * 0.55);
      m.scale.setScalar(Math.max(0.001, s));
    });
  };
}
/** A thin stainless frame of four bars round a w × d opening at height y (a well's rim, a hole's lip). */
function rim(g: THREE.Object3D, w: number, d: number, x: number, y: number, z: number, t = 0.018, color = CHROME) {
  for (const sz of [-1, 1]) part(g, box(w + t, t, t), color, x, y, z + (sz * d) / 2, { outline: false });
  for (const sx of [-1, 1]) part(g, box(t, t, d), color, x + (sx * w) / 2, y, z, { outline: false });
}
/** A heap of food: lumps of a colour scattered over w × d, `h` high. */
function heap(g: THREE.Object3D, color: string, w: number, d: number, h: number, x: number, y: number, z: number, n = 6, seed = 1): THREE.Group {
  const m = group(g, x, y, z);
  for (let i = 0; i < n; i++) {
    const a = (i + seed) * 2.39996;
    const r = Math.sqrt((i + 0.5) / n);
    const lump = part(m, ball(Math.min(w, d) * 0.32), color, Math.cos(a) * r * w * 0.32, 0, Math.sin(a) * r * d * 0.32, { outline: false });
    lump.scale.set(1, (h / (Math.min(w, d) * 0.32)) * (0.7 + 0.3 * ((i * 7) % 3) / 2), 1);
  }
  return m;
}

// ---------------------------------------------------------------------------------------------
// The steel 식판: five hollows (rice and soup on the near side, three 반찬 behind), each filled in turn.

interface Tray {
  g: THREE.Group;
  /** 0 rice, 1 soup, 2–4 the 반찬. */
  fills: THREE.Object3D[];
}
/** A tray, its middle at the origin, its rice and soup towards +z. */
function tray(parent: THREE.Object3D, scraps = false): Tray {
  const g = group(parent);
  part(g, rbox(0.36, 0.022, 0.27, 0.03), CHROME, 0, 0.011, 0);
  part(g, box(0.32, 0.004, 0.006), STAINLESS_D, 0, 0.024, -0.02, { outline: false });
  part(g, box(0.006, 0.004, 0.12), STAINLESS_D, 0.0, 0.024, 0.06, { outline: false });
  for (const x of [-0.055, 0.055]) part(g, box(0.006, 0.004, 0.09), STAINLESS_D, x, 0.024, -0.075, { outline: false });
  const fills: THREE.Object3D[] = [];
  const rice = heap(g, RICE, 0.13, 0.1, scraps ? 0.012 : 0.03, -0.08, 0.026, 0.06, 7, 2);
  fills.push(rice);
  const soup = part(g, cyl(0.055, 0.05, 0.012, 16), SOUP, 0.08, 0.028, 0.06, { outline: false });
  part(soup, box(0.05, 0.004, 0.012), SEAWEED, 0.01, 0.007, 0.0, { ry: 0.6, outline: false });
  part(soup, box(0.03, 0.004, 0.01), SEAWEED, -0.02, 0.007, 0.015, { ry: -0.4, outline: false });
  fills.push(soup);
  const egg = group(g, -0.11, 0.026, -0.075);
  for (let i = 0; i < 3; i++) {
    const s = part(egg, cyl(0.022, 0.022, 0.025, 12), EGG, -0.022 + i * 0.022, 0.012, 0, { rz: Math.PI / 2, outline: false });
    part(s, ring(0.012, 0.003), '#e2a83a', 0, 0.0, 0, { rx: Math.PI / 2, outline: false });
  }
  fills.push(egg);
  fills.push(heap(g, SPINACH, 0.08, 0.07, 0.018, 0.0, 0.028, -0.075, 6, 5));
  fills.push(heap(g, KIMCHI, 0.08, 0.07, 0.02, 0.11, 0.028, -0.075, 6, 9));
  if (scraps) {
    // Leftovers: a little rice, the spinach mostly left (as the pupils do).
    (fills[1] as THREE.Mesh).scale.set(0.6, 1, 0.6);
    fills[2].visible = false;
    fills[4].scale.set(0.5, 0.6, 0.5);
  }
  return { g, fills };
}

// ---------------------------------------------------------------------------------------------
// People drawn in: the pupils in the queue, the cooks being briefed, the inspector from the 구청.

interface Look {
  top: string;
  bottom: string;
  hair: string;
  hairdo: 'short' | 'bob' | 'pony';
  skin?: string;
  shoes?: string;
  /** A cook's white cap (위생모) and apron. */
  cook?: boolean;
  /** A vest over the top, its words on the back and chest. */
  vest?: string;
  glasses?: boolean;
  scale?: number;
}
const LOOKS = {
  pupilA: { top: '#ffffff', bottom: '#1a237e', hair: '#1f1712', hairdo: 'short', shoes: '#eceff1', scale: 0.8 } as Look,
  pupilB: { top: '#f8bbd0', bottom: '#37474f', hair: '#2b1b10', hairdo: 'pony', shoes: '#ffffff', scale: 0.78, skin: '#f1cfb0' } as Look,
  pupilC: { top: '#ffe082', bottom: '#455a64', hair: '#1a1a1a', hairdo: 'bob', shoes: '#90caf9', scale: 0.76 } as Look,
  pupilD: { top: '#a5d6a7', bottom: '#263238', hair: '#3b2a20', hairdo: 'short', shoes: '#ffffff', scale: 0.82, skin: '#e6bd96' } as Look,
  cookA: { top: '#ffffff', bottom: '#eceff1', hair: '#2b1b10', hairdo: 'bob', cook: true, shoes: '#ffffff', skin: '#f1cfb0' } as Look,
  cookB: { top: '#ffffff', bottom: '#eceff1', hair: '#1a1a1a', hairdo: 'short', cook: true, shoes: '#ffffff', glasses: true } as Look,
  inspector: { top: '#e3edf5', bottom: '#37474f', hair: '#222222', hairdo: 'short', vest: '#1565c0', glasses: true, shoes: '#3e2723' } as Look,
};
const PUPILS = [LOOKS.pupilA, LOOKS.pupilB, LOOKS.pupilC, LOOKS.pupilD];

interface Fig {
  root: THREE.Group;
  upper: THREE.Group;
  head: THREE.Group;
  /** Puts the left / right hand at a point in the parent's frame, or back at rest. */
  armL(to: THREE.Vector3 | null): void;
  armR(to: THREE.Vector3 | null): void;
  mouth(open: number): void;
}
/** Someone drawn in, stood with the feet at the origin facing +z (turn and move `root`); the arms are worked out to where the hands go. */
function figure(parent: THREE.Object3D, look: Look): Fig {
  const root = group(parent);
  const k = look.scale ?? 1;
  root.scale.setScalar(k);
  const skin = look.skin ?? '#ecc6a3';
  const shoes = look.shoes ?? '#5d4037';
  for (const sx of [1, -1]) {
    part(root, cyl(0.062, 0.054, 0.78, 8), look.bottom, sx * 0.09, 0.47, 0.0);
    part(root, rbox(0.095, 0.07, 0.21, 0.03), shoes, sx * 0.09, 0.035, 0.04);
  }
  part(root, rbox(0.31, 0.16, 0.24, 0.06), look.bottom, 0, 0.86, 0);
  const upper = group(root, 0, 0.84, 0);
  part(upper, rbox(0.34, 0.46, 0.21, 0.08), look.top, 0, 0.27, 0);
  if (look.cook) {
    // The white apron over the front, its neck strap.
    part(upper, rbox(0.3, 0.5, 0.02, 0.01), '#fafafa', 0, 0.16, 0.112);
    part(root, rbox(0.32, 0.36, 0.02, 0.01), '#fafafa', 0, 0.68, 0.125);
  }
  if (look.vest) {
    for (const sx of [-1, 1]) part(upper, rbox(0.13, 0.42, 0.226, 0.04), look.vest, sx * 0.105, 0.26, 0);
    part(upper, rbox(0.34, 0.42, 0.02, 0.02), look.vest, 0, 0.26, -0.11);
    label(upper, '위생 점검', 0.24, 0.06, 0, 0.34, -0.122, look.vest, '#ffffff', Math.PI);
    label(upper, '구청', 0.08, 0.035, 0.1, 0.38, 0.116, '#ffffff', look.vest);
  }
  part(upper, cyl(0.045, 0.05, 0.08, 10), skin, 0, 0.53, 0, { outline: false });
  const head = group(upper, 0, 0.67, 0);
  part(head, ball(0.112), skin, 0, 0, 0);
  for (const sx of [-1, 1]) part(head, box(0.022, 0.016, 0.006), '#2b2b30', sx * 0.04, 0.0, 0.106, { outline: false });
  for (const sx of [-1, 1]) part(head, ball(0.018), '#f2a7a0', sx * 0.065, -0.03, 0.088, { outline: false }).scale.set(1, 0.6, 0.4);
  const mouthM = part(head, box(0.034, 0.01, 0.006), '#8d4f47', 0, -0.05, 0.104, { outline: false });
  if (look.cook) {
    // The 위생모 over all the hair, and a mask (as a cook in a 급식실 wears).
    part(head, ball(0.122), '#ffffff', 0, 0.04, -0.015).scale.set(1, 0.85, 1);
    part(head, cyl(0.12, 0.122, 0.04, 18), '#ffffff', 0, 0.02, -0.01, { outline: false });
    part(head, rbox(0.15, 0.07, 0.04, 0.02), '#e3f2fd', 0, -0.045, 0.095);
  } else
    switch (look.hairdo) {
      case 'bob':
        part(head, ball(0.121), look.hair, 0, 0.02, -0.025);
        part(head, rbox(0.25, 0.14, 0.18, 0.06), look.hair, 0, -0.04, -0.03);
        part(head, rbox(0.21, 0.05, 0.05, 0.02), look.hair, 0, 0.08, 0.08, { rx: -0.2 });
        break;
      case 'pony':
        part(head, ball(0.12), look.hair, 0, 0.025, -0.025);
        part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0, 0.08, 0.08, { rx: -0.25 });
        part(head, ball(0.05), look.hair, 0, 0.02, -0.15).scale.set(0.8, 1.4, 0.8);
        part(head, ball(0.018), '#e91e63', 0, 0.07, -0.13, { outline: false });
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
    const upperArm = limb(upper, 0.042, look.top);
    const fore = limb(upper, 0.035, look.top);
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
      } else loc.set(sx * 0.23, -0.02, 0.05);
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
      upperArm.set(shoulder, elbow);
      fore.set(elbow, loc);
      hand.position.copy(loc);
    };
  };
  const armL = arm(1);
  const armR = arm(-1);
  armL(null);
  armR(null);
  return { root, upper, head, armL, armR, mouth: (open) => mouthM.scale.set(1 - 0.3 * open, 1 + 3.2 * open, 1) };
}

// ---------------------------------------------------------------------------------------------
// Things held: a probe thermometer, a clipboard, a marker, a ladle, a rice paddle, the tongs.

const FILL = (c: CanvasRenderingContext2D, w: number, h: number, bg: string) => {
  c.fillStyle = bg;
  c.fillRect(0, 0, w, h);
};
const lcdTex = (s: string, bg = '#b9e3c6', fg = '#10301b') =>
  painted(`dtLcd|${s}|${bg}`, 128, 48, (c) => {
    FILL(c, 128, 48, bg);
    text(c, s, 120, 26, 28, fg, 'right');
  });
/** A screen of its own (its face swapped as it changes). */
function lcd(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, s: string, bg?: string, fg?: string): (s: string) => void {
  const mat = new THREE.MeshBasicMaterial({ map: lcdTex(s, bg, fg) });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  g.add(m);
  let shown = s;
  return (s2) => {
    if (s2 === shown) return;
    shown = s2;
    mat.map = lcdTex(s2, bg, fg);
    mat.needsUpdate = true;
  };
}
/** The probe thermometer, held at the body (the origin), the probe pointing down; returns its readout. */
function probe(parent: THREE.Object3D): { g: THREE.Group; read: (s: string) => void } {
  const g = group(parent);
  part(g, rbox(0.05, 0.1, 0.022, 0.01), '#fdd835', 0, 0.02, 0);
  part(g, cyl(0.0025, 0.0025, 0.2, 6), STEEL, 0, -0.13, 0, { outline: false });
  const read = lcd(g, 0.038, 0.022, 0, 0.04, 0.0115, '24.0℃');
  return { g, read };
}
/** A clipboard (its middle at the origin, lying in the xz plane, the sheet reading from +z). */
function clipboard(parent: THREE.Object3D, paint: Paint, key: string): THREE.Group {
  const g = group(parent);
  part(g, rbox(0.2, 0.01, 0.27, 0.006), '#8d6e63', 0, 0, 0);
  flat(g, painted(key, 256, 340, paint), 0.18, 0.24, 0, 0.006, 0.01);
  part(g, rbox(0.08, 0.014, 0.025, 0.004), STEEL, 0, 0.008, -0.12);
  return g;
}
/** A clipboard hung flat on a wall or a side (its face to +z). */
function hungBoard(parent: THREE.Object3D, paint: Paint, key: string, x: number, y: number, z: number, ry = 0): THREE.Group {
  const g = group(parent, x, y, z, ry);
  part(g, rbox(0.2, 0.27, 0.01, 0.006), '#8d6e63', 0, 0, 0);
  picture(g, painted(key, 256, 340, paint), 0.18, 0.24, 0, -0.01, 0.006);
  part(g, rbox(0.08, 0.025, 0.014, 0.004), STEEL, 0, 0.12, 0.008);
  return g;
}
/** A pen or marker (its tip at the origin, pointing down-forward). */
function pen(parent: THREE.Object3D, color = '#263238'): THREE.Group {
  const g = group(parent);
  part(g, cyl(0.006, 0.006, 0.13, 6), color, 0, 0.065, 0, { outline: false });
  part(g, cyl(0.007, 0.007, 0.03, 6), '#eceff1', 0, 0.115, 0, { outline: false });
  g.rotation.set(0.5, 0, 0.3);
  return g;
}
/** A long-handled ladle (its bowl at the origin, the handle up). */
function ladle(parent: THREE.Object3D, r = 0.045, len = 0.36): THREE.Group {
  const g = group(parent);
  const bowl = part(g, ball(r), CHROME, 0, 0, 0);
  bowl.scale.set(1, 0.6, 1);
  part(g, cyl(0.006, 0.006, len, 6), CHROME, 0, len / 2 + 0.02, -0.02, { rx: -0.12, outline: false });
  part(g, rbox(0.02, 0.05, 0.012, 0.005), '#263238', 0, len + 0.03, -0.06, { rx: -0.12 });
  return g;
}
/** The rice paddle (주걱), its blade at the origin. */
function ricePaddle(parent: THREE.Object3D): THREE.Group {
  const g = group(parent);
  part(g, rbox(0.07, 0.1, 0.012, 0.03), '#eceff1', 0, 0.0, 0);
  part(g, rbox(0.022, 0.14, 0.012, 0.008), '#eceff1', 0, 0.11, 0);
  return g;
}
/** The serving tongs, their jaws at the origin. */
function tongs(parent: THREE.Object3D): THREE.Group {
  const g = group(parent);
  for (const sx of [-1, 1]) part(g, box(0.008, 0.22, 0.004), CHROME, sx * 0.012, 0.11, 0, { rz: sx * 0.06, outline: false });
  part(g, rbox(0.03, 0.04, 0.012, 0.005), '#43a047', 0, 0.22, 0);
  return g;
}

// ---------------------------------------------------------------------------------------------
// What's painted on the screens, the boards and the sheets.

const MENU: Array<[string, string]> = [['차조밥', ''], ['소고기미역국', '5.6.16'], ['계란말이', '1'], ['시금치나물', '5.6'], ['배추김치', '9.13']];
const ALLERGENS = '①난류 ②우유 ③메밀 ④땅콩 ⑤대두 ⑥밀 ⑦고등어 ⑧게 ⑨새우 ⑩돼지고기 ⑪복숭아 ⑫토마토 ⑬아황산류 ⑭호두 ⑮닭고기 ⑯쇠고기 ⑰오징어 ⑱조개류 ⑲잣';
const paintHaccp: Paint = (c) => {
  FILL(c, 256, 340, '#ffffff');
  text(c, 'HACCP 조리 기록', 128, 22, 18, '#1b5e20', 'center');
  c.fillStyle = '#c8e6c9';
  c.fillRect(10, 40, 236, 24);
  text(c, '메뉴 · 중심온도 · 시각', 128, 52, 13, '#1b5e20', 'center', false);
  const rows = [['미역국', '92℃', '11:05'], ['계란말이', '78℃', '11:12'], ['나물', '데침', '11:20'], ['', '', '']];
  rows.forEach((r, i) => {
    c.strokeStyle = '#a5d6a7';
    c.strokeRect(10, 70 + i * 52, 236, 52);
    text(c, r[0], 18, 96 + i * 52, 15, '#263238', 'left', false);
    text(c, r[1], 150, 96 + i * 52, 15, '#c62828', 'center');
    text(c, r[2], 236, 96 + i * 52, 13, '#455a64', 'right', false);
  });
};
const paintCookerPanel: Paint = (c) => {
  FILL(c, 256, 160, '#102027');
  text(c, '가열 중', 14, 26, 24, '#ffb74d');
  text(c, '95℃', 242, 26, 26, '#ff8a65', 'right');
  text(c, '증기압 0.5 kgf', 14, 70, 18, '#80deea', 'left', false);
  text(c, '타이머 12:30', 14, 106, 20, '#e0f7fa');
  text(c, '교반 · 수동', 14, 140, 15, '#80cbc4', 'left', false);
};
/** The 식단 program's screens: the week's menu, the nutrition, a 치료식, the budget. */
const paintWeek: Paint = (c) => {
  FILL(c, 320, 200, '#f1f8e9');
  c.fillStyle = '#7cb342';
  c.fillRect(0, 0, 320, 26);
  text(c, '주간 식단 · 10월 4주', 10, 14, 15, '#ffffff');
  const days = ['월', '화', '수', '목', '금'];
  const food = [['잡곡밥', '된장국', '불고기'], ['차조밥', '미역국', '계란말이'], ['카레', '우동', '단무지'], ['현미밥', '어묵국', '생선'], ['비빔밥', '콩나물', '요구르트']];
  days.forEach((d, i) => {
    const x = 6 + i * 62;
    c.fillStyle = i === 1 ? '#fff59d' : '#ffffff';
    c.fillRect(x, 32, 58, 140);
    text(c, d, x + 29, 44, 14, '#33691e', 'center');
    food[i].forEach((f, j) => text(c, f, x + 29, 70 + j * 26, 11, '#37474f', 'center', false));
    text(c, `${[652, 685, 701, 668, 690][i]}`, x + 29, 160, 12, '#e65100', 'center');
  });
  text(c, 'kcal', 314, 188, 11, '#e65100', 'right', false);
};
const paintNutrition: Paint = (c) => {
  FILL(c, 320, 200, '#fffde7');
  c.fillStyle = '#f9a825';
  c.fillRect(0, 0, 320, 26);
  text(c, '영양 분석 · 10/27', 10, 14, 15, '#ffffff');
  const rows: Array<[string, number, string]> = [['에너지', 0.92, '685 kcal'], ['단백질', 1.0, '28.4 g'], ['칼슘', 0.74, '312 mg'], ['철', 0.85, '4.1 mg'], ['비타민A', 0.96, '231 μg']];
  rows.forEach(([n, v, s], i) => {
    const y = 46 + i * 30;
    text(c, n, 10, y, 13, '#37474f');
    c.fillStyle = '#eeeeee';
    c.fillRect(80, y - 8, 150, 16);
    c.fillStyle = v >= 0.9 ? '#66bb6a' : '#ffa726';
    c.fillRect(80, y - 8, 150 * v, 16);
    text(c, s, 312, y, 12, '#37474f', 'right', false);
  });
};
const paintTherapy: Paint = (c) => {
  FILL(c, 320, 200, '#e3f2fd');
  c.fillStyle = '#1e88e5';
  c.fillRect(0, 0, 320, 26);
  text(c, '치료식 처방', 10, 14, 15, '#ffffff');
  text(c, '당뇨식 1,800 kcal', 14, 50, 17, '#0d47a1');
  ['탄수화물 55% · 단백질 20%', '잡곡밥 2/3공기', '단 음식 · 과일주스 제한', '저염 (나트륨 2,000mg)'].forEach((s, i) => text(c, s, 14, 82 + i * 28, 13, '#37474f', 'left', false));
};
const paintBudget: Paint = (c) => {
  FILL(c, 320, 200, '#ffffff');
  c.fillStyle = '#5d4037';
  c.fillRect(0, 0, 320, 26);
  text(c, '급식 예산 · 11월', 10, 14, 15, '#ffffff');
  const rows: Array<[string, string]> = [['식재료비', '3,850'], ['인건비', '1,120'], ['소모품', '210'], ['연료비', '180']];
  rows.forEach(([a, b], i) => {
    c.strokeStyle = '#d7ccc8';
    c.strokeRect(10, 36 + i * 28, 300, 28);
    text(c, a, 18, 50 + i * 28, 13, '#37474f', 'left', false);
    text(c, `${b} 원`, 302, 50 + i * 28, 13, '#37474f', 'right');
  });
  text(c, '1식 단가 3,920원', 160, 178, 15, '#c62828', 'center');
};
const paintMonth: Paint = (c) => {
  FILL(c, 400, 280, '#ffffff');
  c.fillStyle = '#8bc34a';
  c.fillRect(0, 0, 400, 34);
  text(c, `10월 식단표 · ${SCHOOL}`, 200, 18, 18, '#ffffff', 'center');
  for (let r = 0; r < 5; r++)
    for (let d = 0; d < 5; d++) {
      const x = 6 + d * 78;
      const y = 40 + r * 47;
      c.strokeStyle = '#c5e1a5';
      c.strokeRect(x, y, 76, 45);
      text(c, `${r * 7 + d + 1}`, x + 6, y + 9, 10, '#558b2f');
      c.fillStyle = '#90a4ae';
      for (let l = 0; l < 3; l++) c.fillRect(x + 8, y + 18 + l * 8, 44 + ((r + d + l) % 3) * 8, 3);
    }
};
const paintAllergy: Paint = (c) => {
  FILL(c, 200, 260, '#fff3e0');
  text(c, '알레르기 유발 식품', 100, 18, 15, '#e65100', 'center');
  ALLERGENS.split(' ').forEach((s, i) => text(c, s, 12 + (i % 2) * 96, 42 + Math.floor(i / 2) * 22, 12, '#4e342e', 'left', false));
};
const paintOrder: Paint = (c) => {
  FILL(c, 256, 192, '#ffffff');
  c.fillStyle = '#1e88e5';
  c.fillRect(0, 0, 256, 30);
  text(c, '치료식 처방전', 128, 16, 16, '#ffffff', 'center');
  text(c, '5층 이OO님', 14, 50, 15, '#263238');
  text(c, '당뇨식 1800kcal', 14, 80, 15, '#0d47a1');
  text(c, '저염 · 잡곡', 14, 108, 14, '#37474f', 'left', false);
  text(c, '영양사 확인 ㊞', 242, 170, 13, '#c62828', 'right');
};
const paintPrint: Paint = (c) => {
  FILL(c, 256, 192, '#ffffff');
  text(c, '주간 식단표 (안)', 128, 16, 16, '#33691e', 'center');
  for (let i = 0; i < 5; i++) {
    c.strokeStyle = '#c5e1a5';
    c.strokeRect(8 + i * 48, 32, 46, 150);
    for (let l = 0; l < 6; l++) {
      c.fillStyle = '#90a4ae';
      c.fillRect(14 + i * 48, 46 + l * 22, 30, 3);
    }
  }
  c.fillStyle = 'rgba(255,235,59,0.6)';
  c.fillRect(58, 42, 40, 40);
};
const paintBook: Paint = (c) => {
  FILL(c, 320, 200, '#fbf8ef');
  text(c, '식품성분표', 80, 16, 14, '#2e7d32', 'center');
  for (let i = 0; i < 7; i++) {
    text(c, ['쌀', '차조', '미역', '쇠고기', '달걀', '시금치', '배추'][i], 14, 44 + i * 22, 12, '#37474f', 'left', false);
    text(c, `${[345, 368, 18, 218, 136, 30, 18][i]}`, 140, 44 + i * 22, 12, '#455a64', 'right', false);
  }
  c.fillStyle = '#c8c3b0';
  c.fillRect(158, 0, 4, 200);
  for (let i = 0; i < 7; i++) {
    c.fillStyle = '#b0bec5';
    c.fillRect(176, 40 + i * 22, 120, 3);
  }
};
const paintHands: Paint = (c) => {
  FILL(c, 200, 280, '#e1f5fe');
  text(c, '올바른 손 씻기', 100, 20, 17, '#01579b', 'center');
  const steps = ['손바닥', '손등', '손가락 사이', '두 손 모아', '엄지', '손톱 밑'];
  steps.forEach((s, i) => {
    const x = 14 + (i % 2) * 92;
    const y = 44 + Math.floor(i / 2) * 76;
    c.fillStyle = '#ffffff';
    c.fillRect(x, y, 82, 66);
    c.fillStyle = '#ffcc80';
    c.beginPath();
    c.arc(x + 41, y + 28, 16, 0, Math.PI * 2);
    c.fill();
    text(c, `${i + 1}. ${s}`, x + 41, y + 56, 11, '#0277bd', 'center');
  });
};
const paintDress: Paint = (c) => {
  FILL(c, 512, 64, '#00838f');
  text(c, '위생 복장 점검  ✓모자 ✓마스크 ✓앞치마 ✓위생화', 256, 33, 24, '#ffffff', 'center');
};
const paintCheck: Paint = (c) => {
  FILL(c, 256, 340, '#ffffff');
  text(c, '일일 위생 점검표', 128, 22, 18, '#006064', 'center');
  ['손 씻기', '위생 복장', '도마 · 칼 소독', '냉장 온도', '방충 · 방서', '보존식'].forEach((s, i) => {
    c.strokeStyle = '#b2ebf2';
    c.strokeRect(10, 44 + i * 46, 236, 46);
    text(c, s, 20, 67 + i * 46, 15, '#263238', 'left', false);
    text(c, '✓', 222, 67 + i * 46, 20, '#2e7d32', 'center');
  });
};
const paintInspect: Paint = (c) => {
  FILL(c, 256, 340, '#ffffff');
  text(c, '위생 점검 결과', 128, 22, 18, '#0d47a1', 'center');
  ['개인 위생', '식재료 관리', '조리 공정', '보존식', '세척 · 소독'].forEach((s, i) => {
    text(c, s, 20, 66 + i * 44, 15, '#263238', 'left', false);
    text(c, '적합', 230, 66 + i * 44, 15, '#2e7d32', 'right');
  });
  text(c, '확인: ________', 128, 310, 15, '#455a64', 'center', false);
};
const paintStock: Paint = (c) => {
  FILL(c, 256, 340, '#ffffff');
  text(c, '식재료 검수일지', 128, 22, 18, '#33691e', 'center');
  c.fillStyle = '#dcedc8';
  c.fillRect(8, 40, 240, 24);
  text(c, '품목 · 온도 · 유통기한 · 판정', 128, 52, 12, '#33691e', 'center', false);
  [['두부', '4℃', '10/30'], ['돼지고기', '3℃', '10/29'], ['쌀 20kg', '-', '26.10'], ['시금치', '-', '10/28']].forEach((r, i) => {
    c.strokeStyle = '#c5e1a5';
    c.strokeRect(8, 70 + i * 50, 240, 50);
    text(c, r[0], 16, 95 + i * 50, 14, '#263238', 'left', false);
    text(c, r[1], 120, 95 + i * 50, 14, '#1565c0', 'center');
    text(c, r[2], 178, 95 + i * 50, 12, '#455a64', 'center', false);
    text(c, '적합', 240, 95 + i * 50, 13, '#2e7d32', 'right');
  });
};
const paintSampleLog: Paint = (c) => {
  FILL(c, 256, 340, '#ffffff');
  text(c, '보존식 기록지', 128, 22, 18, '#01579b', 'center');
  text(c, '-18℃ 이하 · 144시간', 128, 46, 13, '#0277bd', 'center', false);
  ['10/22 화 · 6종', '10/23 수 · 5종', '10/24 목 · 6종', '10/25 금 · 5종', '10/27 월 · 5종'].forEach((s, i) => {
    c.strokeStyle = '#b3e5fc';
    c.strokeRect(10, 64 + i * 52, 236, 52);
    text(c, s, 20, 90 + i * 52, 14, '#263238', 'left', false);
    text(c, '㊞', 228, 90 + i * 52, 16, '#c62828', 'center');
  });
};
const paintWasteLog: Paint = (c) => {
  FILL(c, 256, 340, '#ffffff');
  text(c, '잔반량 조사표', 128, 22, 18, '#bf360c', 'center');
  [['월', 14.2], ['화', 12.6], ['수', 0], ['목', 0], ['금', 0]].forEach(([d, v], i) => {
    const y = 60 + i * 52;
    text(c, `${d}`, 20, y + 14, 15, '#263238');
    if ((v as number) > 0) {
      c.fillStyle = '#ffab91';
      c.fillRect(46, y, (v as number) * 12, 28);
      text(c, `${v} kg`, 240, y + 14, 13, '#bf360c', 'right');
    }
  });
};
const paintTag: Paint = (c) => {
  FILL(c, 128, 96, '#fffde7');
  c.strokeStyle = '#c62828';
  c.lineWidth = 4;
  c.strokeRect(4, 4, 120, 88);
  text(c, '검수필', 64, 32, 24, '#c62828', 'center');
  text(c, '10/27', 64, 68, 20, '#37474f', 'center', false);
};
const paintRiceSack: Paint = (c) => {
  FILL(c, 256, 160, '#f5efe0');
  c.fillStyle = '#2e7d32';
  c.fillRect(0, 0, 256, 34);
  text(c, '햅쌀 · 경기미', 128, 18, 20, '#ffffff', 'center');
  text(c, '20kg', 128, 82, 44, '#1b5e20', 'center');
  text(c, '도정일 2026.10.20', 128, 136, 16, '#5d4037', 'center', false);
};
const paintCrate: Paint = (c) => {
  FILL(c, 192, 128, '#ffffff');
  text(c, '국산 두부 4kg', 96, 22, 18, '#263238', 'center');
  c.fillStyle = '#ffecb3';
  c.fillRect(12, 42, 168, 70);
  text(c, '입고 10/27', 96, 62, 16, '#37474f', 'center', false);
  text(c, '유통기한 10/30', 96, 92, 17, '#c62828', 'center');
};

// ---------------------------------------------------------------------------------------------

let cookerCount = 0;
let lineCount = 0;

// ---------------------------------------------------------------------------------------------
// The hospital kitchen's meal cart (2026-11-04, the branch lots: workFurniture/dietitian.ts).

/**
 * 온·냉 배식차 (hdMealCart, 1 × 1): a tall stainless tray trolley on castors, split down the middle — the hot side's door red-trimmed,
 * the cold side's blue — the trays slid in by bed number, the diet card on each showing at the open shelf, the push bar. A changed diet
 * order is caught at it: the right tray found and swapped (dtSwapTray).
 */
function mealCart(g: THREE.Group, out: Parameters<Builder>[6]) {
  part(g, rbox(0.72, 1.32, 0.56, 0.03), STAINLESS, 0, 0.78, -0.04);
  for (const x of [-0.3, 0.3]) for (const z of [-0.26, 0.18]) part(g, cyl(0.05, 0.05, 0.04, 12), BLACK, x, 0.06, z, { rz: Math.PI / 2 });
  part(g, box(0.006, 1.2, 0.01), STAINLESS_D, 0, 0.78, 0.245, { outline: false });
  for (const [x, col, word] of [[-0.18, '#e53935', '온장'], [0.18, '#1e88e5', '냉장']] as Array<[number, string, string]>) {
    part(g, box(0.3, 0.03, 0.01), col, x, 1.36, 0.245, { outline: false });
    label(g, word, 0.14, 0.05, x, 1.28, 0.25, col, '#ffffff');
    part(g, rbox(0.03, 0.3, 0.03, 0.01), STAINLESS_D, x + (x < 0 ? 0.12 : -0.12), 0.85, 0.26);
  }
  // The open shelf at the top: the trays' fronts and their diet cards.
  for (let i = 0; i < 3; i++) {
    part(g, box(0.62, 0.012, 0.02), '#8d6e63', 0, 0.3 + i * 0.12, 0.25, { outline: false });
    part(g, box(0.1, 0.06, 0.004), i === 1 ? '#fff59d' : CARD, -0.2 + i * 0.2, 0.34 + i * 0.12, 0.252, { outline: false });
  }
  part(g, cyl(0.018, 0.018, 0.66, 10), STAINLESS_D, 0, 1.3, -0.36, { rz: Math.PI / 2 });
  label(g, '병동 배식', 0.3, 0.06, 0, 1.5, 0.25, '#558b2f', '#ffffff');
  const s = spot(g, 'stand', 0, 0, 0.66, Math.PI);
  s.work = marker(g, 0, 1.0, 0.26);
  out.work = s.work;
  out.spots = { '*': s };
}

export const BUILDERS: Record<string, Builder> = {
  hdMealCart(g, _W, _D, _c, _def, _ctx, out) {
    mealCart(g, out);
  },
  /**
   * The 국솥: a round stainless steam kettle on its trunnions between two pedestals, the gearbox and
   * red handwheel to tilt it on the right pedestal, a pouring lip at its front, its lid hinged at
   * the back; the swing-arm tap from the console over it; the console with its lit panel, the gas
   * valve, the HACCP clipboard and the ladle on its hook; a floor drain's grate in front. The paddle
   * as long as an oar rests against the console while it's shut.
   *
   * Checking the cooking: stood at its front, the lid up, the soup stirred with the paddle in both
   * hands round and round, a spoonful ladled into the little bowl and tasted, the probe thermometer
   * held in the soup (it climbs to 92℃) and read, the sheet written. Briefing the cooks (the 급식
   * branch): stood by the console, turned to two cooks in caps and masks who appear at the front.
   */
  bulkCooker(g, _W, _D, _c, _def, _ctx, out) {
    const n = cookerCount++;
    const K = DT.KETTLE;
    const C = K.console;
    // The floor drain in front, the pedestals and the trunnions.
    part(g, box(0.95, 0.012, 0.16), '#78909c', K.cx, 0.006, 0.38, { outline: false });
    for (let i = 0; i < 12; i++) part(g, box(0.012, 0.014, 0.15), '#546e7a', K.cx - 0.44 + i * 0.08, 0.008, 0.38, { outline: false });
    for (const sx of [-1, 1]) {
      const x = K.cx + sx * (K.r + 0.08);
      part(g, rbox(0.1, K.pivot, 0.2, 0.02), STAINLESS, x, K.pivot / 2, K.cz);
      part(g, rbox(0.16, 0.03, 0.26, 0.01), STAINLESS_D, x, 0.015, K.cz);
      part(g, cyl(0.04, 0.04, 0.08, 14), STAINLESS_D, x - sx * 0.07, K.pivot, K.cz, { rz: Math.PI / 2 });
    }
    // The gearbox and its handwheel on the right pedestal.
    const gx = K.cx + K.r + 0.08;
    part(g, rbox(0.14, 0.18, 0.2, 0.02), STAINLESS_D, gx + 0.04, K.pivot - 0.02, K.cz + 0.02);
    const wheel = group(g, gx + 0.04, K.pivot - 0.02, K.cz + 0.16);
    part(wheel, ring(0.1, 0.012), '#c62828', 0, 0, 0);
    for (let i = 0; i < 3; i++) part(wheel, box(0.2, 0.012, 0.012), STEEL, 0, 0, 0, { rz: (i * Math.PI) / 3, outline: false });
    part(wheel, cyl(0.012, 0.012, 0.07, 8), '#212121', 0.07, 0.07, 0.04, { rx: Math.PI / 2, outline: false });
    // The kettle (it tilts about the trunnions; drawn at rest, upright).
    const pot = group(g, K.cx, K.pivot, K.cz);
    const top = K.rim - K.pivot;
    part(pot, cyl(K.r, K.r * 0.9, 0.4, 30), STAINLESS, 0, top - 0.2, 0);
    const bottom = part(pot, ball(K.r * 0.9), STAINLESS, 0, top - 0.4, 0);
    bottom.scale.set(1, 0.35, 1);
    part(pot, ring(K.r, 0.02), CHROME, 0, top, 0, { rx: Math.PI / 2, outline: false });
    part(pot, cyl(K.r - 0.02, K.r - 0.02, 0.004, 28), '#6f7a80', 0, top - 0.004, 0, { outline: false });
    // The pouring lip.
    part(pot, rbox(0.14, 0.03, 0.08, 0.012), CHROME, 0, top - 0.005, K.r + 0.02, { rx: 0.25 });
    // The jacket's bands, the safety valve, its plate.
    for (const y of [top - 0.08, top - 0.3]) part(pot, cyl(K.r + 0.006, K.r + 0.006, 0.014, 30), STAINLESS_D, 0, y, 0, { outline: false });
    part(pot, cyl(0.016, 0.016, 0.08, 8), '#ffb300', -K.r * 0.7, top - 0.06, -K.r * 0.7, { outline: false });
    label(pot, `증기 국솥 300L · ${n % 2 + 1}호`, 0.26, 0.05, 0, top - 0.19, K.r + 0.005, '#eceff1', '#37474f');
    // Under it, the burner ring (lit while it cooks).
    part(g, cyl(0.2, 0.22, 0.05, 20), '#455a64', K.cx, 0.2, K.cz, { outline: false });
    // The console: its box, the panel, the knobs and the gas valve, the stop button.
    const cx = C.x;
    part(g, rbox(C.w, C.h, C.d, 0.02), STAINLESS, cx, C.h / 2, C.z);
    part(g, rbox(C.w + 0.02, 0.03, C.d + 0.02, 0.01), STAINLESS_D, cx, C.h + 0.015, C.z);
    const front = C.z + C.d / 2;
    part(g, rbox(0.32, 0.22, 0.02, 0.01), '#37474f', cx, 0.98, front + 0.005);
    out.screen = litScreen(g, painted('dtCookerPanel', 256, 160, paintCookerPanel), 0.26, 0.16, cx, 0.98, front + 0.016);
    for (const [i, col] of ['#43a047', '#fdd835'].entries()) part(g, cyl(0.022, 0.022, 0.025, 12), col, cx - 0.12 + i * 0.08, 0.78, front + 0.012, { rx: Math.PI / 2 });
    part(g, cyl(0.032, 0.032, 0.03, 14), '#e53935', cx + 0.15, 0.78, front + 0.014, { rx: Math.PI / 2 });
    part(g, cyl(0.04, 0.04, 0.015, 14), '#fdd835', cx + 0.15, 0.78, front + 0.003, { rx: Math.PI / 2, outline: false });
    part(g, ring(0.05, 0.008), '#1565c0', cx, 0.4, front + 0.03);
    for (let i = 0; i < 2; i++) part(g, box(0.1, 0.008, 0.008), STEEL, cx, 0.4, front + 0.03, { rz: (i * Math.PI) / 2, outline: false });
    label(g, '가스 밸브', 0.12, 0.03, cx, 0.31, front + 0.004, '#eceff1', '#1565c0');
    label(g, '비상 정지', 0.1, 0.025, cx + 0.15, 0.72, front + 0.004, '#fff8e1', '#c62828');
    // The swing-arm tap over the kettle.
    rod(g, v3(cx - C.w / 2 + 0.06, C.h, C.z - 0.1), v3(cx - C.w / 2 + 0.06, 1.42, C.z - 0.1), 0.018, CHROME);
    rod(g, v3(cx - C.w / 2 + 0.06, 1.42, C.z - 0.1), v3(K.cx + 0.08, 1.42, K.cz - 0.06), 0.014, CHROME);
    rod(g, v3(K.cx + 0.08, 1.42, K.cz - 0.06), v3(K.cx + 0.08, 1.32, K.cz - 0.06), 0.012, CHROME);
    part(g, cyl(0.03, 0.03, 0.03, 10), '#1565c0', cx - C.w / 2 + 0.06, 1.36, C.z - 0.1, { outline: false });
    // The HACCP clipboard on the console's front, the ladle on its hook.
    hungBoard(g, paintHaccp, 'dtHaccp', cx - 0.16, 0.62, front + 0.01);
    part(g, box(0.06, 0.012, 0.03), STEEL, cx + 0.15, 1.1, front + 0.01, { outline: false });

    // ---- At rest: the lid down, the paddle stood against the console.
    const idle = group(g);
    out.idle = idle;
    /** The lid on its hinge at the kettle's back; returns the hinge to swing. */
    const makeLid = (parent: THREE.Object3D) => {
      const h = group(parent, K.cx, K.rim + 0.01, K.cz - K.r);
      part(h, cyl(K.r + 0.015, K.r + 0.015, 0.025, 30), CHROME, 0, 0.0, K.r);
      const dome = part(h, ball(K.r), CHROME, 0, 0.0, K.r);
      dome.scale.set(1, 0.16, 1);
      part(h, rbox(0.2, 0.03, 0.04, 0.012), '#263238', 0, 0.035, 2 * K.r - 0.02);
      for (const sx of [-1, 1]) part(h, rbox(0.04, 0.04, 0.06, 0.01), STEEL, sx * 0.15, 0.0, -0.01);
      return h;
    };
    makeLid(idle);
    ladle(idle, 0.05, 0.4).position.set(cx + 0.15, 0.62, front + 0.06);
    /** The paddle (대형 주걱): a long white shaft, its flat blade at the end. */
    const makePaddle = (parent: THREE.Object3D) => {
      const shaft = limb(parent, 0.016, '#eceff1', undefined, true);
      const blade = part(parent, rbox(0.12, 0.26, 0.022, 0.02), '#eceff1', 0, 0, 0);
      const set = (pd: { blade: DT.P; top: DT.P }) => {
        const a = vp(pd.blade);
        const b = vp(pd.top);
        shaft.set(a, b);
        blade.position.copy(a).addScaledVector(b.clone().sub(a).normalize(), 0.08);
        blade.quaternion.copy(shaft.mesh.quaternion);
      };
      return { set, parts: [shaft.mesh, blade] };
    };
    makePaddle(idle).set({ blade: [cx - C.w / 2 + 0.04, 0.16, front + 0.05], top: [cx - C.w / 2 - 0.02, 1.5, front - 0.02] });

    // ---- In use: the lid up, the soup and its steam, the flame, the paddle and the tools.
    const use = group(g);
    out.inUse = use;
    const lid = makeLid(use);
    lid.rotation.x = -1.62;
    const soup = group(use, K.cx, K.soup, K.cz);
    part(soup, cyl(K.r - 0.03, K.r - 0.03, 0.01, 28), SOUP, 0, 0, 0, { outline: false });
    const bits = group(soup);
    for (let i = 0; i < 16; i++) {
      const a = i * 2.4;
      const r = 0.05 + ((i * 37) % 23) / 23 * 0.25;
      part(bits, box(0.05 + (i % 3) * 0.015, 0.006, 0.016), i % 4 === 0 ? '#8d5a3b' : SEAWEED, Math.cos(a) * r, 0.007, Math.sin(a) * r, { ry: a * 1.7, outline: false });
    }
    const flame = group(use, K.cx, 0.24, K.cz);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const f = new THREE.Mesh(cyl(0.004, 0.018, 0.06, 6), FLAME);
      f.position.set(Math.cos(a) * 0.16, 0.02, Math.sin(a) * 0.16);
      flame.add(f);
    }
    const steam = puffs(use, 8, STEAM, 0.05);
    const paddle = makePaddle(use);
    const ladleU = ladle(use, 0.05, 0.4);
    const hookLadle = ladle(use, 0.05, 0.4);
    hookLadle.position.set(cx + 0.15, 0.62, front + 0.06);
    const bowl = group(use);
    part(bowl, cyl(0.045, 0.03, 0.035, 14), CHROME, 0, 0.018, 0);
    const bowlSoup = part(bowl, cyl(0.038, 0.038, 0.004, 14), SOUP, 0, 0.03, 0, { outline: false });
    const pr = probe(use);
    const sheet = clipboard(use, paintHaccp, 'dtHaccp');
    const pencil = pen(use);
    // The two cooks, there only while they're briefed.
    const cooks = group(use);
    const cookFigs = DT.COOKS.map((c, i) => {
      const f = figure(cooks, i === 0 ? LOOKS.cookA : LOOKS.cookB);
      f.root.position.set(c.x, 0, c.z);
      f.root.rotation.y = c.yaw;
      return f;
    });
    const hand = (f: Fig, sx: number) => {
      // Hands clasped in front of the apron.
      const p = new THREE.Vector3(sx * 0.05, 0.95, 0.18).applyMatrix4(f.root.matrix);
      return p;
    };

    const mark = marker(g, K.cx, 1.0, K.cz);
    const spots: Record<string, Spot> = {
      checkCooking: spotAt(g, DT.COOK_AT, 'stand', 'dtStir', mark),
      dietitian_kitchenBriefing: spotAt(g, DT.BRIEF_AT, 'stand', 'gesture'),
      '*': spotAt(g, DT.COOK_AT, 'stand', 'dtStir', mark),
    };
    out.spots = spots;
    out.work = mark;
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const briefing = now === 'dietitian_kitchenBriefing';
      const ph = phaseOf(mark);
      cooks.visible = briefing;
      ladleU.visible = bowl.visible = pr.g.visible = sheet.visible = pencil.visible = false;
      hookLadle.visible = true;
      flame.children.forEach((f, i) => f.scale.set(1, 0.7 + 0.4 * Math.abs(Math.sin(t * 9 + i)), 1));
      bits.rotation.y = -t * 0.25;
      let stir = false;
      if (briefing) {
        cookFigs.forEach((f, i) => {
          f.root.updateMatrix();
          f.armL(hand(f, 1));
          f.armR(hand(f, -1));
          f.head.rotation.x = 0.06 * Math.max(0, Math.sin(t * 1.7 + i * 2));
          f.mouth(0);
        });
        paddle.set(DT.PADDLE_REST);
      } else {
        const b = DT.stirBeat(t, ph);
        const key = DT.dtKeyOf('dtStir', t, ph).key;
        stir = DT.paddleHeld(b);
        paddle.set(stir ? DT.paddleAt(t, ph) : DT.PADDLE_REST);
        if (stir) bits.rotation.y = -t * 3.4;
        if (DT.ladleHeld(b)) {
          hookLadle.visible = false;
          ladleU.visible = bowl.visible = true;
          ladleU.position.copy(vp(key.r, -0.36));
          bowl.position.copy(vp(key.l, -0.03));
          bowlSoup.visible = b.from === 'sip' || b.p > 0.75;
          if (b.from === 'sip') ladleU.position.copy(vp(key.r, -0.38));
        }
        if (DT.probeHeld(b)) {
          pr.g.visible = true;
          pr.g.position.copy(vp(key.r, 0.0));
          pr.read(`${DT.probeReads(b).toFixed(b.from === 'read' ? 1 : 0)}℃`);
        }
        if (DT.sheetHeld(b)) {
          sheet.visible = pencil.visible = true;
          sheet.position.copy(vp(key.l, -0.01));
          sheet.position.x += 0.04;
          sheet.rotation.set(0.85, 0, 0);
          pencil.position.copy(vp(key.r, -0.02));
        }
      }
      steam([K.cx, K.soup + 0.06, K.cz], t, stir ? 1 : 0.7, 0.55, 0.16);
    };
  },

  /**
   * The 배식대: a stainless steam table with warming cupboards under it on the server's side, five
   * wells across its top — the rice pan heaped with 차조밥 and its paddle, the soup pot of 미역국 with
   * its ladle, the 계란말이, the 시금치나물 and the 배추김치 with their tongs — under a canopy of heat
   * lamps whose glass lip and dish cards (with the allergy numbers) face the pupils; the tray rail
   * along the far side. At rest the wells are lidded.
   *
   * Serving: the dietitian steps along behind the line with each pupil, who comes up to the rail
   * with an empty steel tray and slides it along: rice scooped onto it, soup ladled, the three 반찬
   * with the tongs, a nod — and off they go with a full tray as the next comes up.
   */
  servingLine(g, _W, _D, _c, _def, _ctx, out) {
    const n = lineCount++;
    const L = DT.LINE;
    const depth = L.front - L.back;
    const zc = (L.front + L.back) / 2;
    // The body: the cupboards on the server's side, a plain panel to the pupils, the kick plinth.
    part(g, rbox(1.96, L.top - 0.06, depth, 0.02), STAINLESS, 0, (L.top - 0.06) / 2 + 0.04, zc);
    part(g, box(1.9, 0.06, depth - 0.06), '#455a64', 0, 0.03, zc, { outline: false });
    for (let i = 0; i < 4; i++) {
      const x = -0.72 + i * 0.48;
      part(g, rbox(0.44, 0.58, 0.012, 0.01), CHROME, x, 0.42, L.front + 0.004);
      part(g, rbox(0.12, 0.02, 0.02, 0.008), STAINLESS_D, x, 0.66, L.front + 0.016);
    }
    label(g, '온장고 · 65℃', 0.22, 0.04, -0.72, 0.8, L.front + 0.006, '#eceff1', '#bf360c');
    // The top, the wells.
    part(g, rbox(2.0, 0.03, depth + 0.04, 0.01), CHROME, 0, L.top, zc);
    const wellW = 0.3;
    const wellD = 0.38;
    for (const x of L.wells) {
      part(g, box(wellW, 0.004, wellD), '#5f6a70', x, L.top + 0.016, L.wz, { outline: false });
      rim(g, wellW, wellD, x, L.top + 0.022, L.wz);
    }
    // The canopy on its posts, its lamps, its glass lip and the dish cards (to the pupils).
    for (const sx of [-1, 1]) {
      rod(g, v3(sx * 0.97, L.top, L.back + 0.04), v3(sx * 0.97, 1.34, L.back + 0.04), 0.014, CHROME);
      rod(g, v3(sx * 0.97, L.top, L.front - 0.1), v3(sx * 0.97, 1.34, L.front - 0.1), 0.014, CHROME);
    }
    part(g, rbox(1.98, 0.04, 0.5, 0.012), STAINLESS, 0, 1.36, -0.12);
    glass(g, box(1.96, 0.16, 0.008), 0, 1.26, L.rail + 0.0);
    part(g, box(1.98, 0.012, 0.012), CHROME, 0, 1.18, L.rail);
    const cards = group(g, 0, 1.39, -0.375);
    MENU.forEach(([name, al], i) => {
      const x = L.wells[i];
      const tex = painted(`dtDishCard|${name}`, 192, 96, (c) => {
        FILL(c, 192, 96, CARD);
        c.fillStyle = '#7cb342';
        c.fillRect(0, 0, 192, 10);
        text(c, name, 96, 46, name.length > 4 ? 26 : 32, '#33691e', 'center');
        text(c, al ? `알레르기 ${al}` : '알레르기 없음', 96, 80, 16, al ? '#e65100' : '#78909c', 'center', false);
      });
      picture(cards, tex, 0.28, 0.14, x, 0, 0, '#ffffff', Math.PI);
    });
    part(g, box(1.98, 0.16, 0.012), STAINLESS_D, 0, 1.39, -0.368);
    label(g, '배식 순서: 밥 → 국 → 반찬', 0.6, 0.06, 0, 1.39, 0.135, '#eceff1', '#33691e');
    const lamps = [-0.68, 0, 0.68].map((x) => glowing(g, box(0.36, 0.012, 0.06), '#ffcc80', x, 1.335, -0.04));
    void lamps;
    // The tray rail on the far side, on its brackets.
    for (let i = 0; i < 3; i++) part(g, cyl(0.012, 0.012, 2.0, 10), CHROME, 0, L.tray - 0.035, L.rail - 0.03 - i * 0.07, { rz: Math.PI / 2, outline: false });
    for (const x of [-0.9, 0, 0.9]) part(g, box(0.03, 0.03, 0.2), STAINLESS_D, x, L.tray - 0.05, L.rail - 0.08);
    // The food in the wells (shared by idle and use: the lids come off).
    const food = group(g);
    const rx = L.wells[0];
    part(food, box(wellW - 0.03, 0.06, wellD - 0.03), STAINLESS, rx, L.top + 0.0, L.wz, { outline: false });
    heap(food, RICE, wellW - 0.06, wellD - 0.06, 0.04, rx, L.top + 0.04, L.wz, 14, 3);
    // The soup pot sat in its well.
    const sx = L.wells[1];
    part(food, cyl(0.14, 0.13, 0.16, 22), CHROME, sx, L.top + 0.06, L.wz);
    part(food, ring(0.14, 0.01), STAINLESS_D, sx, L.top + 0.14, L.wz, { rx: Math.PI / 2, outline: false });
    part(food, cyl(0.13, 0.13, 0.006, 22), SOUP, sx, L.top + 0.12, L.wz, { outline: false });
    for (let i = 0; i < 6; i++) part(food, box(0.05, 0.004, 0.014), SEAWEED, sx + Math.cos(i * 2.3) * 0.07, L.top + 0.125, L.wz + Math.sin(i * 2.3) * 0.07, { ry: i, outline: false });
    // 계란말이 slices in rows, the 나물 and the 김치 heaped.
    const ex = L.wells[2];
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++) {
        const s = part(food, cyl(0.026, 0.026, 0.03, 12), EGG, ex - 0.09 + c * 0.06, L.top + 0.045, L.wz - 0.12 + r * 0.08, { rz: Math.PI / 2, outline: false });
        part(s, ring(0.014, 0.004), '#e2a83a', 0, 0, 0, { rx: Math.PI / 2, outline: false });
      }
    heap(food, SPINACH, wellW - 0.06, wellD - 0.06, 0.03, L.wells[3], L.top + 0.035, L.wz, 14, 7);
    heap(food, KIMCHI, wellW - 0.06, wellD - 0.06, 0.035, L.wells[4], L.top + 0.035, L.wz, 14, 11);

    // ---- At rest: the wells lidded, the utensils laid on the counter's edge.
    const idle = group(g);
    out.idle = idle;
    for (const x of L.wells) {
      part(idle, rbox(wellW + 0.01, 0.025, wellD + 0.01, 0.01), CHROME, x, L.top + (x === L.wells[1] ? 0.16 : 0.08), L.wz);
      part(idle, rbox(0.08, 0.02, 0.02, 0.008), '#263238', x, L.top + (x === L.wells[1] ? 0.18 : 0.1), L.wz);
    }
    const restPaddle = ricePaddle(idle);
    restPaddle.position.set(-0.6, L.top + 0.025, L.front - 0.06);
    restPaddle.rotation.set(-Math.PI / 2, 0, 0.3);

    // ---- In use: the utensils in the wells and in hand, steam, the pupil and their tray.
    const use = group(g);
    out.inUse = use;
    const steam = [puffs(use, 5, STEAM, 0.035), puffs(use, 5, STEAM, 0.035)];
    const inPaddle = ricePaddle(use);
    const inLadle = ladle(use, 0.045, 0.32);
    const inTongs = tongs(use);
    const sideTongs = [2, 3, 4].map((i) => {
      const tg = tongs(use);
      tg.position.set(L.wells[i] + 0.08, L.top + 0.05, L.wz + 0.12);
      tg.rotation.set(-1.2, 0, 0);
      return tg;
    });
    const pupils = PUPILS.map((lk) => figure(use, lk));
    const trays = PUPILS.map(() => tray(use));
    /** Pupil i at x along the rail, `back` of the way off from it, turned `turn` to go, their tray held out in front. */
    const placePupil = (i: number, x: number, back: number, turn: number, t: number, walking: boolean) => {
      const f = pupils[i];
      const tr = trays[i];
      f.root.visible = tr.g.visible = back < 0.95;
      if (!f.root.visible) return;
      const z = -0.8 - 0.6 * back;
      const ry = Math.PI * turn;
      f.root.position.set(x, walking ? 0.012 * Math.abs(Math.sin(t * 9)) : 0, z);
      f.root.rotation.y = ry;
      const fwd = v3(Math.sin(ry), 0, Math.cos(ry));
      const left = v3(Math.cos(ry), 0, -Math.sin(ry));
      const c = v3(x, L.tray - 0.02, z).addScaledVector(fwd, 0.39);
      tr.g.position.copy(c);
      tr.g.rotation.y = ry + Math.PI;
      f.armL(c.clone().addScaledVector(left, 0.17).add(v3(0, 0.02, -0.0)));
      f.armR(c.clone().addScaledVector(left, -0.17).add(v3(0, 0.02, 0)));
      f.head.rotation.set(0.25 * (1 - turn), 0, 0);
    };
    const mark = marker(g, 0, 1.0, 0);
    const spots: Record<string, Spot> = {
      superviseServing: spotAt(g, DT.SERVE_AT, 'stand', 'dtServe', mark),
      '*': spotAt(g, DT.SERVE_AT, 'stand', 'dtServe', mark),
    };
    out.spots = spots;
    out.work = mark;
    out.animate = (t) => {
      const ph = phaseOf(mark);
      const b = DT.serveBeat(t, ph);
      const key = DT.dtKeyOf('dtServe', t, ph).key;
      // The server steps along with the pupil.
      const sxNow = DT.serverX(b);
      for (const s of Object.values(spots)) s.at.position.x = sxNow;
      pupils.forEach((f) => (f.root.visible = false));
      trays.forEach((tr) => (tr.g.visible = false));
      const who = (b.n + n) % PUPILS.length;
      const walking = b.from === 'come' || b.from === 'greet' || b.e > 0.05;
      placePupil(who, DT.trayX(b), DT.pupilBack(b), DT.pupilTurn(b), t, walking);
      trays[who].fills.forEach((f, i) => (f.visible = DT.served(b, i)));
      if (b.from === 'greet' && b.p < 0.3) pupils[who].head.rotation.set(0.1, -0.2 * ss(b.p, 0, 0.3), 0);
      pupils[who].mouth(b.from === 'greet' && b.p < 0.5 ? 0.5 * Math.max(0, Math.sin(t * 9)) : 0);
      // The tool in hand; the others rest in their wells.
      const tool = DT.toolOf(b);
      inPaddle.position.set(L.wells[0] + 0.1, L.top + 0.06, L.wz + 0.12);
      inPaddle.rotation.set(-1.1, 0, 0);
      inLadle.position.set(L.wells[1], L.top + 0.13, L.wz);
      inLadle.rotation.set(0.5, 0, 0);
      inTongs.visible = false;
      sideTongs.forEach((s) => (s.visible = true));
      const at = vp(key.r, -0.08);
      if (tool === 'paddle') {
        inPaddle.position.copy(at);
        inPaddle.rotation.set(-0.9, 0, 0);
      } else if (tool === 'ladle') {
        inLadle.position.copy(at).add(v3(0, -0.24, 0.0));
        inLadle.rotation.set(-0.15, 0, 0);
      } else if (tool === 'tongs') {
        const k = b.e > 0.5 ? b.to : b.from;
        const i = k === 'side0' ? 0 : k === 'side1' ? 1 : 2;
        sideTongs[i].visible = false;
        inTongs.visible = true;
        inTongs.position.copy(at).add(v3(0, -0.14, 0));
        inTongs.rotation.set(-0.3, 0, 0);
      }
      steam[0]([L.wells[0], L.top + 0.08, L.wz], t, 0.7, 0.3, 0.08);
      steam[1]([L.wells[1], L.top + 0.14, L.wz], t + 0.4, 0.9, 0.32, 0.06);
    };
  },

  /**
   * The menu desk: a white desk with a drawer pedestal, a cork partition at its back with the
   * month's 식단표, the allergy chart and a photo of a tray pinned on it; the monitor with the 식단
   * program, the keyboard, the calculator, the 식품성분표 open, the printed week, a cup of
   * highlighters, the nameplate and a mug; the office chair at its front.
   *
   * Sat at it: planning the menu (typing, a look up at the board, highlighting the printout), the
   * nutrition worked out (a finger down the table, the calculator punched, typed in), a 치료식 order
   * written on its card (the hospital branch), the budget typed into its spreadsheet (as head
   * dietitian) — the monitor shows each.
   */
  menuDesk(g, _W, _D, _c, _def, _ctx, out) {
    const K = DT.DESK;
    const WHITE = '#f5f5f2';
    part(g, rbox(K.w, 0.035, K.d, 0.01), WHITE, 0, K.top - 0.018, K.cz);
    part(g, rbox(0.3, K.top - 0.04, K.d - 0.04, 0.01), '#e0e0dc', 0.29, (K.top - 0.04) / 2, K.cz);
    for (let i = 0; i < 3; i++) {
      part(g, box(0.26, 0.19, 0.006), '#ececea', 0.29, 0.14 + i * 0.22, K.cz + K.d / 2 - 0.016, { outline: false });
      part(g, box(0.08, 0.012, 0.012), STEEL, 0.29, 0.2 + i * 0.22, K.cz + K.d / 2 - 0.008, { outline: false });
    }
    for (const sz of [-1, 1]) part(g, box(0.035, K.top - 0.04, 0.035), '#b0bec5', -K.w / 2 + 0.04, (K.top - 0.04) / 2, K.cz + sz * (K.d / 2 - 0.04));
    part(g, box(0.02, 0.4, K.d - 0.1), '#e0e0dc', -K.w / 2 + 0.04, 0.45, K.cz);
    // The cork partition and what's pinned on it.
    const pz = DT.BOARD[2];
    part(g, rbox(K.w, 0.64, 0.035, 0.01), '#90a4ae', 0, 1.08, pz - 0.02);
    part(g, box(K.w - 0.06, 0.58, 0.006), '#c8a26b', 0, 1.08, pz, { outline: false });
    picture(g, painted('dtMonth', 400, 280, paintMonth), 0.46, 0.32, -0.14, 1.14, pz + 0.006);
    picture(g, painted('dtAllergy', 200, 260, paintAllergy), 0.2, 0.26, 0.26, 1.16, pz + 0.006);
    const photo = painted('dtTrayPhoto', 160, 120, (c) => {
      FILL(c, 160, 120, '#fafafa');
      c.fillStyle = '#cfd8dc';
      c.fillRect(14, 12, 132, 96);
      c.fillStyle = RICE;
      c.fillRect(24, 64, 50, 36);
      c.fillStyle = SOUP;
      c.beginPath();
      c.arc(112, 82, 20, 0, Math.PI * 2);
      c.fill();
      [EGG, SPINACH, KIMCHI].forEach((col, i) => {
        c.fillStyle = col;
        c.fillRect(24 + i * 42, 20, 32, 30);
      });
    });
    picture(g, photo, 0.13, 0.1, 0.26, 0.92, pz + 0.006, '#ffffff', 0.08);
    for (const [x, y, col] of [[-0.14, 1.31, '#e53935'], [0.26, 1.3, '#1e88e5'], [0.26, 0.98, '#43a047']] as Array<[number, number, string]>) part(g, ball(0.012), col, x, y, pz + 0.012, { outline: false });
    part(g, box(0.07, 0.07, 0.004), '#fff176', -0.38, 0.9, pz + 0.008, { rz: 0.1, outline: false });
    part(g, box(0.07, 0.07, 0.004), '#f48fb1', -0.32, 0.86, pz + 0.009, { rz: -0.12, outline: false });
    // The monitor and keyboard, the mouse.
    const mon = group(g, -0.04, K.top, -0.34);
    part(mon, rbox(0.14, 0.012, 0.1, 0.004), BLACK, 0, 0.006, 0);
    part(mon, box(0.03, 0.13, 0.02), BLACK, 0, 0.075, -0.01);
    part(mon, rbox(0.4, 0.26, 0.025, 0.008), BLACK, 0, 0.26, 0);
    const screenTex: Record<string, THREE.Texture> = {
      week: painted('dtWeek', 320, 200, paintWeek),
      nutrition: painted('dtNutrition', 320, 200, paintNutrition),
      therapy: painted('dtTherapy', 320, 200, paintTherapy),
      budget: painted('dtBudget', 320, 200, paintBudget),
    };
    const screen = litScreen(mon, screenTex.week, 0.37, 0.23, 0, 0.26, 0.014);
    out.screen = screen;
    const kb = group(g, DT.KEYS[0], K.top, DT.KEYS[2]);
    part(kb, rbox(0.3, 0.015, 0.1, 0.004), '#eceff1', 0, 0.008, 0);
    for (let r = 0; r < 4; r++) part(kb, box(0.27, 0.004, 0.016), '#cfd8dc', 0, 0.017, -0.033 + r * 0.022, { outline: false });
    part(g, rbox(0.04, 0.02, 0.065, 0.015), '#eceff1', 0.18, K.top + 0.01, -0.02);
    // The calculator, the 식품성분표 book, the printed week, the highlighters, the nameplate, a mug.
    const calc = group(g, DT.CALC[0], K.top, DT.CALC[2], -0.15);
    part(calc, rbox(0.1, 0.018, 0.15, 0.008), '#37474f', 0, 0.009, 0);
    picture(calc, lcdTex('685.0', '#b0bec5', '#263238'), 0.075, 0.025, 0, 0.0185, -0.045, '#ffffff', 0, -Math.PI / 2);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) part(calc, box(0.016, 0.006, 0.014), c === 3 ? '#ff8a65' : '#eceff1', -0.03 + c * 0.02, 0.02, -0.01 + r * 0.022, { outline: false });
    const book = group(g, DT.BOOK[0], K.top, DT.BOOK[2], 0.12);
    part(book, box(0.26, 0.03, 0.2), '#2e7d32', 0, 0.015, 0);
    flat(book, painted('dtBook', 320, 200, paintBook), 0.25, 0.18, 0, 0.032, 0);
    flat(g, painted('dtPrint', 256, 192, paintPrint), 0.17, 0.13, DT.PRINT[0], DT.PRINT[1], DT.PRINT[2], 0.1);
    part(g, cyl(0.03, 0.03, 0.09, 12), '#455a64', 0.38, K.top + 0.045, -0.3);
    for (const [i, col] of ['#fff176', '#f48fb1', '#80deea'].entries()) part(g, cyl(0.007, 0.007, 0.12, 6), col, 0.37 + i * 0.01, K.top + 0.12, -0.3, { rz: (i - 1) * 0.15, outline: false });
    const plate = group(g, -0.33, K.top, -0.32, 0.2);
    part(plate, box(0.18, 0.05, 0.03), '#5d4037', 0, 0.03, 0, { rx: -0.3 });
    label(plate, '영양사', 0.16, 0.04, 0, 0.032, 0.017, '#5d4037', '#ffe0b2');
    part(g, cyl(0.035, 0.03, 0.08, 12), '#a5d6a7', -0.36, K.top + 0.04, -0.12);
    // The office chair at the front.
    const D = DT.DESK_AT;
    const chair = group(g, D.x, 0, D.z);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      part(chair, box(0.24, 0.025, 0.035), BLACK, Math.cos(a) * 0.12, 0.05, Math.sin(a) * 0.12, { ry: -a, outline: false });
      caster(chair, Math.cos(a) * 0.24, Math.sin(a) * 0.24, 0.025);
    }
    part(chair, cyl(0.03, 0.03, D.y - 0.1, 8), '#78909c', 0, (D.y - 0.1) / 2 + 0.05, 0, { outline: false });
    part(chair, rbox(0.46, 0.07, 0.44, 0.03), '#689f38', 0, D.y - 0.035, 0);
    part(chair, rbox(0.42, 0.42, 0.06, 0.04), '#689f38', 0, D.y + 0.27, 0.22);
    part(chair, box(0.04, 0.3, 0.03), BLACK, 0, D.y + 0.1, 0.2, { outline: false });

    // In use: the highlighter, the 치료식 card and a pen.
    const use = group(g);
    out.inUse = use;
    const marker1 = pen(use, '#fdd835');
    const card = flat(use, painted('dtOrder', 256, 192, paintOrder), 0.15, 0.11, DT.CARD[0], DT.CARD[1] + 0.003, DT.CARD[2], 0.08);
    const work = marker(g, DT.CARD[0], DT.CARD[1] + 0.02, DT.CARD[2]);
    const keys = marker(g, DT.KEYS[0], DT.KEYS[1], DT.KEYS[2]);
    const mark = marker(g, 0, 0.8, -0.1);
    const spots: Record<string, Spot> = {
      planMenu: spotAt(g, D, 'sit', 'dtMenu', mark),
      calcNutrition: spotAt(g, D, 'sit', 'dtCalc', mark),
      dietitian_therapeuticDiet: spotAt(g, D, 'sit', 'write', work),
      dietitian_mealBudget: spotAt(g, D, 'sit', 'type', keys),
      '*': spotAt(g, D, 'sit', 'dtMenu', mark),
    };
    out.spots = spots;
    out.work = keys;
    let shownTex = screenTex.week;
    out.animate = (t) => {
      const now = nowAt(spots, t) ?? 'planMenu';
      const ph = phaseOf(mark);
      marker1.visible = false;
      card.visible = now === 'dietitian_therapeuticDiet';
      const want = now === 'calcNutrition' ? screenTex.nutrition : now === 'dietitian_therapeuticDiet' ? screenTex.therapy : now === 'dietitian_mealBudget' ? screenTex.budget : screenTex.week;
      if (want !== shownTex) {
        shownTex = want;
        (screen.material as THREE.MeshBasicMaterial).map = want;
        (screen.material as THREE.MeshBasicMaterial).needsUpdate = true;
      }
      if (now === 'planMenu' || now === '*') {
        const b = DT.menuBeat(t, ph);
        if (DT.highlighterHeld(b)) {
          marker1.visible = true;
          marker1.position.copy(vp(DT.dtKeyOf('dtMenu', t, ph).key.r, -0.02));
        }
      }
    };
  },

  /**
   * The hygiene station: a white-tiled splashback, a stainless hand basin on legs with its knee
   * valve and gooseneck tap, the soap pump and the paper-towel box on the wall, the mirror with the
   * 위생 복장 strip over it, the 손 씻기 poster, the shelf of colour-coded chopping boards with the
   * ATP meter in its holder, white aprons and caps on their hooks, the day's check sheet on the side.
   *
   * The hygiene check: soap, a lather, a rinse under the tap (the water runs), a paper towel, the cap
   * set straight in the mirror, the chopping board swabbed and the swab read (12 RLU · 적합), the
   * sheet ticked. The inspection: the inspector from the 구청 in a blue vest stands at the front with
   * a clipboard; bowed to, shown the log binder and leafed through it, shown the meter, listened to,
   * and the report signed on their clipboard.
   */
  hygieneStation(g, _W, _D, _c, _def, _ctx, out) {
    const B = DT.BASIN;
    // The tiled splashback.
    const tiles = painted('dtTiles', 256, 512, (c) => {
      FILL(c, 256, 512, TILE);
      c.strokeStyle = '#cfd8dc';
      c.lineWidth = 3;
      for (let i = 0; i <= 8; i++) {
        c.beginPath();
        c.moveTo(0, i * 64);
        c.lineTo(256, i * 64);
        c.stroke();
      }
      for (let i = 0; i <= 4; i++) {
        c.beginPath();
        c.moveTo(i * 64, 0);
        c.lineTo(i * 64, 512);
        c.stroke();
      }
    });
    part(g, box(1.0, 1.95, 0.04), TILE, 0, 0.975, -0.48);
    picture(g, tiles, 0.98, 1.92, 0, 0.97, -0.459);
    // The basin on its legs (its back ledge holding the tap and the soap), the knee valve.
    part(g, rbox(0.58, 0.16, 0.52, 0.02), STAINLESS, 0, B.top - 0.08, B.z);
    part(g, box(0.5, 0.005, 0.42), '#8a969c', 0, B.top + 0.003, B.z, { outline: false });
    rim(g, 0.52, 0.44, 0, B.top + 0.005, B.z, 0.02);
    part(g, rbox(0.58, 0.1, 0.1, 0.01), STAINLESS, 0, B.top + 0.03, -0.4);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.016, 0.016, B.top - 0.16, 8), STEEL, sx * 0.25, (B.top - 0.16) / 2, B.z + sz * 0.22, { outline: false });
    part(g, cyl(0.03, 0.03, 0.22, 10), STEEL, 0, B.top - 0.27, B.z - 0.1, { outline: false });
    part(g, rbox(0.18, 0.1, 0.02, 0.01), CHROME, 0, 0.56, 0.17);
    label(g, '무릎 밸브', 0.14, 0.03, 0, 0.52, 0.182, '#eceff1', '#00838f');
    // The gooseneck tap off the ledge.
    rod(g, v3(0, B.top + 0.08, -0.38), v3(0, 1.12, -0.38), 0.014, CHROME);
    rod(g, v3(0, 1.12, -0.38), v3(0, 1.14, -0.24), 0.014, CHROME);
    rod(g, v3(0, 1.14, -0.24), v3(0, B.spout[1] + 0.03, B.spout[2]), 0.012, CHROME);
    part(g, cyl(0.016, 0.012, 0.03, 10), CHROME, B.spout[0], B.spout[1] + 0.02, B.spout[2], { outline: false });
    // The soap pump on the ledge.
    part(g, cyl(0.045, 0.045, 0.13, 14), '#ffcdd2', B.soap[0], B.top + 0.145, -0.38);
    label(g, '핸드워시', 0.07, 0.025, B.soap[0], B.top + 0.15, -0.334, '#ffffff', '#c62828');
    part(g, cyl(0.012, 0.012, 0.05, 8), '#eceff1', B.soap[0], B.top + 0.23, -0.38, { outline: false });
    part(g, rbox(0.03, 0.02, 0.12, 0.008), '#eceff1', B.soap[0], B.soap[1] + 0.03, -0.34);
    // The side panel with the paper-towel box on it.
    part(g, rbox(0.04, 0.6, 0.48, 0.01), STAINLESS, 0.48, B.top + 0.3, -0.24);
    part(g, rbox(0.1, 0.18, 0.2, 0.02), '#eceff1', B.towel[0] + 0.04, B.towel[1] + 0.1, B.towel[2]);
    part(g, box(0.004, 0.08, 0.13), '#ffffff', B.towel[0] - 0.012, B.towel[1] + 0.0, B.towel[2], { outline: false });
    label(g, '종이 타월', 0.12, 0.03, B.towel[0] + 0.04, B.towel[1] + 0.12, B.towel[2] + 0.102, '#eceff1', '#00838f');
    // The mirror and its strip, the poster.
    part(g, rbox(0.52, 0.44, 0.02, 0.01), STEEL, -0.02, 1.54, -0.455);
    glass(g, box(0.48, 0.4, 0.004), -0.02, 1.54, -0.443, new THREE.MeshBasicMaterial({ color: '#dceef5' }));
    picture(g, painted('dtDress', 512, 64, paintDress), 0.62, 0.078, -0.02, 1.82, -0.456);
    picture(g, painted('dtHands', 200, 280, paintHands), 0.17, 0.24, -0.39, 1.33, -0.456);
    // The left shelf: the chopping boards in their rack, the one for the swab, the ATP meter.
    part(g, rbox(0.2, 0.025, 0.5, 0.008), STAINLESS, -0.4, 0.88, -0.2);
    for (const sz of [-1, 1]) part(g, box(0.02, 0.18, 0.02), STEEL, -0.48, 0.8, -0.2 + sz * 0.18, { outline: false });
    for (const [i, col] of ['#e53935', '#1e88e5', '#43a047', '#fdd835'].entries()) part(g, rbox(0.16, 0.22, 0.014, 0.01), col, -0.4, 1.0, -0.42 + i * 0.03, { rx: -0.12 });
    part(g, rbox(0.15, 0.015, 0.2, 0.01), '#43a047', B.board[0], B.board[1] - 0.008, B.board[2]);
    part(g, rbox(0.06, 0.06, 0.05, 0.01), '#455a64', B.meter[0], B.meter[1] - 0.02, B.meter[2]);
    // The aprons and caps on their hooks (left of the mirror); the check sheet on the side panel.
    part(g, box(0.14, 0.02, 0.03), STEEL, -0.42, 1.93, -0.44, { outline: false });
    part(g, rbox(0.12, 0.4, 0.02, 0.01), '#fafafa', -0.42, 1.71, -0.42);
    part(g, rbox(0.1, 0.03, 0.08, 0.02), '#ffffff', -0.4, 1.94, -0.4);
    hungBoard(g, paintCheck, 'dtCheck', B.clip[0] - 0.02, B.clip[1], B.clip[2] + 0.01, 0);

    // ---- In use: the water, the foam, the towel, the swab and the meter; the inspector.
    const use = group(g);
    out.inUse = use;
    const stream = new THREE.Mesh(cyl(0.012, 0.016, 1, 10), WATER);
    use.add(stream);
    const foam = [0, 1, 2, 3, 4, 5].map(() => {
      const m = new THREE.Mesh(ball(0.02), FOAM);
      use.add(m);
      return m;
    });
    const towel = part(use, rbox(0.14, 0.004, 0.18, 0.004), '#ffffff', 0, 0, 0, { outline: false });
    const swab = group(use);
    part(swab, cyl(0.008, 0.008, 0.16, 8), '#fafafa', 0, 0.06, 0, { outline: false });
    part(swab, ball(0.01), '#ffffff', 0, -0.02, 0, { outline: false });
    const meter = group(use);
    part(meter, rbox(0.07, 0.15, 0.03, 0.012), '#455a64', 0, 0, 0);
    const meterRead = lcd(meter, 0.05, 0.03, 0, 0.03, 0.016, '12 RLU', '#c8e6c9', '#1b5e20');
    void meterRead;
    label(meter, '적합', 0.04, 0.016, 0, -0.01, 0.016, '#2e7d32', '#ffffff');
    const insp = figure(use, LOOKS.inspector);
    insp.root.position.set(DT.INSPECTOR.x, 0, DT.INSPECTOR.z);
    insp.root.rotation.y = DT.INSPECTOR.yaw;
    const inspBoard = clipboard(use, paintInspect, 'dtInspect');
    const inspPen = pen(use);
    const binder = group(use);
    part(binder, box(0.26, 0.012, 0.3), '#1565c0', 0, 0, 0);
    for (const sx of [-1, 1]) part(binder, box(0.12, 0.012, 0.28), '#ffffff', sx * 0.065, 0.01, 0, { rz: -sx * 0.06, outline: false });
    label(binder, '위생 관리 일지', 0.11, 0.025, -0.065, 0.018, -0.1, '#ffffff', '#1565c0');
    binder.children[binder.children.length - 1].rotation.set(-Math.PI / 2, 0, 0);
    const page = part(binder, box(0.12, 0.004, 0.28), '#f5f5f5', 0.065, 0.02, 0, { outline: false });

    const mark = marker(g, 0, 1.0, 0);
    const spots: Record<string, Spot> = {
      hygieneCheck: spotAt(g, DT.WASH_AT, 'stand', 'dtWash', mark),
      hygieneInspection: spotAt(g, DT.INSPECT_AT, 'stand', 'dtInspect', mark),
      '*': spotAt(g, DT.WASH_AT, 'stand', 'dtWash', mark),
    };
    out.spots = spots;
    out.work = mark;
    const inspAt = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(insp.root.matrix);
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const ph = phaseOf(mark);
      stream.visible = towel.visible = swab.visible = meter.visible = false;
      foam.forEach((f) => (f.visible = false));
      const inspecting = now === 'hygieneInspection';
      insp.root.visible = inspBoard.visible = inspecting;
      inspPen.visible = binder.visible = false;
      if (inspecting) {
        const b = DT.inspectBeat(t, ph);
        const key = DT.dtKeyOf('dtInspect', t, ph).key;
        insp.root.updateMatrix();
        // The inspector's clipboard held at the chest, held out to sign.
        const out2 = DT.signing(b) ? ss(b.p, 0, 0.25) : 0;
        const bp = inspAt(0, 1.08 + 0.02 * out2, 0.25 + 0.2 * out2);
        inspBoard.position.copy(bp);
        inspBoard.rotation.set(0.9 - 0.6 * out2, DT.INSPECTOR.yaw + Math.PI, 0, 'YXZ');
        insp.armL(inspAt(0.12, 1.06, 0.24 + 0.2 * out2));
        insp.armR(DT.signing(b) ? inspAt(-0.12, 1.06, 0.24 + 0.2 * out2) : inspAt(-0.06 + 0.03 * Math.sin(t * 6), 1.12, 0.3));
        insp.head.rotation.set(0.25 + 0.06 * Math.max(0, Math.sin(t * 1.3)), 0, 0);
        insp.mouth(b.from === 'listen' ? 0.5 * Math.max(0, Math.sin(t * 8)) : 0);
        if (DT.binderHeld(b)) {
          binder.visible = true;
          binder.position.copy(mid(key.l, key.r, 0.0));
          binder.rotation.set(0.5, DT.INSPECT_AT.yaw, 0, 'YXZ');
          page.rotation.z = b.from === 'flip' ? -Math.PI * ss((b.p * 3) % 1, 0.2, 0.7) : 0;
        }
        if (DT.meterShown(b)) {
          meter.visible = true;
          meter.position.copy(vp(key.r, 0.04));
          meter.rotation.set(0, DT.INSPECT_AT.yaw, 0);
        }
        if (DT.signing(b)) {
          inspPen.visible = true;
          inspPen.position.copy(vp(key.r, -0.02));
        }
        return;
      }
      const b = DT.washBeat(t, ph);
      const key = DT.dtKeyOf('dtWash', t, ph).key;
      if (DT.tapOn(b)) {
        stream.visible = true;
        const top = B.spout[1];
        const bot = B.top + 0.01;
        stream.position.set(B.spout[0], (top + bot) / 2, B.spout[2]);
        stream.scale.set(1, top - bot, 1);
      }
      if (DT.lathered(b)) {
        const hands = [vp(key.l), vp(key.r)];
        foam.forEach((f, i) => {
          f.visible = true;
          const h = hands[i % 2];
          f.position.set(h.x + 0.02 * Math.sin(i * 2.1 + t * 3), h.y + 0.012 * Math.cos(i * 1.7), h.z + 0.02 * Math.cos(i * 2.1 + t * 3));
          f.scale.setScalar(b.from === 'rinse' ? 1 - ss(b.p, 0, 0.5) : 0.7 + 0.3 * Math.sin(t * 5 + i));
        });
      }
      if (DT.towelHeld(b)) {
        towel.visible = true;
        towel.position.copy(mid(key.l, key.r));
        towel.rotation.set(1.2, 0, 0);
      }
      if (DT.swabHeld(b)) {
        swab.visible = true;
        swab.position.copy(vp(key.l, 0.0));
        swab.rotation.set(-0.5, 0, 0);
      }
      if (DT.meterHeld(b)) {
        meter.visible = true;
        meter.position.copy(mid(key.l, key.r, 0.04));
        meter.rotation.set(-0.5, 0, 0);
      }
    };
  },

  /**
   * The store shelf: a chrome wire rack of five shelves with its labels — two 20 kg rice sacks and a
   * third on top of them on a plastic pallet at the bottom, the meat in its foam box and a box of
   * potatoes, the delivery box of 두부 with its 입고 label, tubs of 고춧가루 · 소금 · 깨, an 18-litre
   * oil tin, 간장 jugs and tins of tuna, boxes of gloves and caps; the 검수일지 on the post.
   *
   * Checking the delivery: the box pulled out and its label read, pushed back; the probe into the
   * meat (3℃); down at the rice sacks to read the tag; the 검수일지 ticked. Learning the standards
   * (the 신입's): the manual read stood at the rack.
   */
  foodStorage(g, _W, _D, _c, _def, _ctx, out) {
    const R = DT.RACK;
    const hw = R.w / 2;
    // Posts, shelves (wire slats), the labels on their edges.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.014, 0.014, 1.86, 8), CHROME, sx * hw, 0.93, R.z + sz * (R.d / 2), { outline: false });
    R.shelves.forEach((y, i) => {
      part(g, box(R.w, 0.012, 0.012), CHROME, 0, y, R.z + R.d / 2, { outline: false });
      part(g, box(R.w, 0.012, 0.012), CHROME, 0, y, R.z - R.d / 2, { outline: false });
      for (let k = 0; k < 9; k++) part(g, box(0.006, 0.006, R.d), STEEL, -hw + 0.05 + k * 0.1, y, R.z, { outline: false });
      const names = ['쌀 · 곡류', '육류 · 채소', '두부 · 양념', '유지 · 통조림', '소모품'];
      label(g, names[i], 0.2, 0.04, -0.28, y - 0.03, R.z + R.d / 2 + 0.008, '#ffffff', '#33691e');
    });
    // Bottom: the pallet, the rice sacks.
    part(g, rbox(0.86, 0.06, 0.5, 0.01), '#1e88e5', 0, R.shelves[0] + 0.035, R.z);
    const sack = painted('dtRiceSack', 256, 160, paintRiceSack);
    const sackAt = (x: number, y: number) => {
      const s = part(g, rbox(0.4, 0.13, 0.5, 0.06), '#f5efe0', x, y, R.z);
      void s;
      picture(g, sack, 0.32, 0.1, x, y, R.z + 0.252);
    };
    sackAt(-0.21, R.shelves[0] + 0.13);
    sackAt(0.21, R.shelves[0] + 0.13);
    sackAt(0.0, R.shelves[0] + 0.26);
    picture(g, painted('dtTag', 128, 96, paintTag), 0.07, 0.05, DT.TAG[0], DT.TAG[1], R.z + 0.258, '#ffffff', 0.15);
    // Shelf 2: the meat box (its lid off in use), the potatoes.
    const M = DT.MEAT;
    part(g, rbox(0.34, 0.16, 0.28, 0.01), '#fafafa', M[0], M[1] + 0.08, M[2]);
    part(g, box(0.3, 0.02, 0.24), '#b3e5fc', M[0], M[1] + 0.15, M[2], { outline: false });
    part(g, rbox(0.12, 0.03, 0.16, 0.012), '#c75a5a', M[0] - 0.06, M[1] + 0.165, M[2], { outline: false });
    part(g, rbox(0.12, 0.03, 0.16, 0.012), '#d47272', M[0] + 0.08, M[1] + 0.165, M[2] + 0.02, { outline: false });
    part(g, rbox(0.34, 0.24, 0.3, 0.01), '#c8a26b', 0.22, R.shelves[1] + 0.12, R.z + 0.0);
    label(g, '감자 10kg', 0.18, 0.05, 0.22, R.shelves[1] + 0.14, R.z + 0.152, '#c8a26b', '#4e342e');
    for (let i = 0; i < 5; i++) part(g, ball(0.035), '#c9a66b', 0.14 + i * 0.04, R.shelves[1] + 0.25, R.z - 0.05 + (i % 2) * 0.06, { outline: false });
    // Shelf 3: the tubs of seasoning (the box is drawn twice: at rest and moving).
    for (const [i, [name, lidc]] of ([['고춧가루', '#c62828'], ['소금', '#eceff1'], ['참깨', '#d7b98e']] as Array<[string, string]>).entries()) {
      const x = -0.36 + i * 0.13;
      part(g, cyl(0.055, 0.055, 0.16, 14), '#ffffff', x, R.shelves[2] + 0.08, R.z - 0.02);
      part(g, cyl(0.057, 0.057, 0.025, 14), lidc, x, R.shelves[2] + 0.17, R.z - 0.02);
      label(g, name, 0.09, 0.03, x, R.shelves[2] + 0.08, R.z + 0.037, '#ffffff', '#37474f');
    }
    // Shelf 4: the oil tin, the soy jugs, tins of tuna.
    part(g, rbox(0.24, 0.32, 0.24, 0.02), '#fbc02d', -0.28, R.shelves[3] + 0.16, R.z);
    label(g, '식용유 18L', 0.18, 0.05, -0.28, R.shelves[3] + 0.18, R.z + 0.122, '#fbc02d', '#5d4037');
    for (let i = 0; i < 2; i++) {
      part(g, rbox(0.13, 0.26, 0.13, 0.03), '#3e2723', 0.0 + i * 0.15, R.shelves[3] + 0.13, R.z);
      part(g, cyl(0.02, 0.02, 0.04, 8), '#d32f2f', 0.0 + i * 0.15, R.shelves[3] + 0.28, R.z, { outline: false });
    }
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) part(g, cyl(0.04, 0.04, 0.04, 12), '#1976d2', 0.33 + (j - 0.5) * 0.09, R.shelves[3] + 0.02 + i * 0.042, R.z + 0.1);
    // Shelf 5: boxes of gloves and caps.
    for (const [i, [name, col]] of ([['위생장갑', '#e1f5fe'], ['위생모', '#f3e5f5'], ['마스크', '#e8f5e9']] as Array<[string, string]>).entries()) {
      part(g, rbox(0.26, 0.16, 0.3, 0.01), col, -0.3 + i * 0.3, R.shelves[4] + 0.08, R.z);
      label(g, name, 0.2, 0.05, -0.3 + i * 0.3, R.shelves[4] + 0.08, R.z + 0.152, col, '#37474f');
    }
    hungBoard(g, paintStock, 'dtStock', DT.CLIP[0] - 0.02, DT.CLIP[1], DT.CLIP[2], 0);
    /** The delivery box (its foot at the origin, label to +z). */
    const crate = (parent: THREE.Object3D) => {
      const c = group(parent);
      part(c, rbox(0.34, 0.22, 0.3, 0.01), '#d7b98e', 0, 0.11, 0);
      part(c, box(0.345, 0.03, 0.02), '#a1887f', 0, 0.2, 0, { outline: false });
      picture(c, painted('dtCrate', 192, 128, paintCrate), 0.2, 0.13, 0, 0.11, 0.152);
      return c;
    };
    const idle = group(g);
    out.idle = idle;
    crate(idle).position.set(DT.CRATE[0], DT.CRATE[1], DT.CRATE[2]);
    part(idle, rbox(0.35, 0.03, 0.29, 0.01), '#fafafa', M[0], M[1] + 0.175, M[2]);
    const use = group(g);
    out.inUse = use;
    const box2 = crate(use);
    const meatLid = part(use, rbox(0.35, 0.03, 0.29, 0.01), '#fafafa', M[0], M[1] + 0.175, M[2]);
    const pr = probe(use);
    const mark = marker(g, 0, 1.0, 0);
    const spots: Record<string, Spot> = {
      checkInventory: spotAt(g, DT.STOCK_AT, 'stand', 'dtStock', mark),
      dietitian_learnInspection: spotAt(g, DT.STOCK_AT, 'stand', 'read', mark),
      '*': spotAt(g, DT.STOCK_AT, 'stand', 'dtStock', mark),
    };
    out.spots = spots;
    out.work = mark;
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const ph = phaseOf(mark);
      box2.position.set(DT.CRATE[0], DT.CRATE[1], DT.CRATE[2]);
      box2.rotation.set(0, 0, 0);
      pr.g.visible = false;
      meatLid.visible = true;
      if (now === 'dietitian_learnInspection') return;
      const b = DT.stockBeat(t, ph);
      const key = DT.dtKeyOf('dtStock', t, ph).key;
      const o = DT.crateOut(b);
      box2.position.set(DT.CRATE[0], DT.CRATE[1] + 0.05 * o, DT.CRATE[2] + 0.26 * o);
      box2.rotation.set(-0.35 * (b.from === 'label' ? 1 : o * 0.5), 0, 0);
      if (b.from === 'probe' || b.from === 'sack') meatLid.visible = false;
      if (DT.stockProbe(b)) {
        pr.g.visible = true;
        pr.g.position.copy(vp(key.r, 0.0));
        pr.read(`${DT.stockProbeReads(b).toFixed(1)}℃`);
      }
    };
  },

  /**
   * The 보존식 freezer: an under-counter stainless freezer with its blue-lit −20℃ readout and
   * "보존식 전용" sticker, a frosted inside with wire shelves of labelled sample bags; on its top a
   * steel tray of today's four dishes in little bowls, the box of sample bags, a spoon and a marker;
   * over it on the wall the 보존식 기록지 and the sign (−18℃ 이하 · 144시간).
   *
   * Keeping the samples: a bag held open, a spoonful of each dish put in, the zip pressed shut, the
   * date and the dish written on it; crouched, the door swung open (the cold rolling out), the bag
   * laid in, the door shut; the log written up.
   */
  dtSampleFridge(g, _W, _D, _c, _def, _ctx, out) {
    const F = DT.FREEZER;
    const back = -0.43;
    // The body, the top, the plinth.
    part(g, rbox(0.94, F.top - 0.08, F.front - back, 0.02), STAINLESS, 0, (F.top - 0.08) / 2 + 0.06, (F.front + back) / 2);
    part(g, box(0.9, 0.06, F.front - back - 0.04), '#37474f', 0, 0.03, (F.front + back) / 2 - 0.02, { outline: false });
    part(g, rbox(0.96, 0.03, F.front - back + 0.02, 0.01), CHROME, 0, F.top - 0.015, (F.front + back) / 2);
    // The inside (seen when the door's open): frosted walls, the wire shelves, the bags.
    part(g, box(0.82, 0.62, 0.02), '#e3f2fd', 0, 0.45, back + 0.06, { outline: false });
    part(g, box(0.82, 0.02, F.front - back - 0.1), '#e3f2fd', 0, 0.15, (F.front + back) / 2, { outline: false });
    for (const y of [F.shelf, 0.62]) {
      part(g, box(0.8, 0.008, F.front - back - 0.12), STEEL, 0, y, (F.front + back) / 2 - 0.02, { outline: false });
      for (let i = 0; i < 6; i++) {
        const bag = part(g, rbox(0.1, 0.02, 0.14, 0.008), '#eaf4f8', -0.32 + i * 0.13, y + 0.015, -0.1, { outline: false });
        part(bag, box(0.06, 0.012, 0.08), [RICE, SOUP, EGG, SPINACH, KIMCHI, '#a1887f'][i], 0, 0.004, 0.01, { outline: false });
      }
    }
    /** The door (hung on its right, its foot at the floor). */
    const makeDoor = (parent: THREE.Object3D) => {
      const h = group(parent, F.hinge, 0, F.front);
      const w = 0.84;
      part(h, rbox(w, F.top - 0.16, 0.05, 0.015), STAINLESS, -w / 2, (F.top - 0.16) / 2 + 0.08, 0.025);
      part(h, rbox(0.025, 0.42, 0.03, 0.01), CHROME, -w + 0.06, 0.48, 0.06);
      part(h, rbox(0.2, 0.07, 0.01, 0.01), '#102027', -w / 2, F.top - 0.16, 0.052);
      const ro = lcd(h, 0.16, 0.05, -w / 2, F.top - 0.16, 0.058, '-20.3℃', '#0d47a1', '#e3f2fd');
      void ro;
      label(h, '보존식 전용 냉동고', 0.36, 0.05, -w / 2, 0.52, 0.051, '#e1f5fe', '#01579b');
      label(h, '-18℃ 이하 · 144시간', 0.36, 0.045, -w / 2, 0.45, 0.051, '#ffffff', '#c62828');
      return h;
    };
    // On the top: the tray of dishes, the bag box, a spoon, a marker.
    part(g, rbox(0.7, 0.012, 0.22, 0.01), CHROME, -0.08, F.top + 0.006, -0.06);
    const dishFood = [RICE, SOUP, EGG, SPINACH];
    F.dishes.forEach(([x, z], i) => {
      part(g, cyl(0.065, 0.045, 0.045, 16), CHROME, x, F.top + 0.034, z);
      if (i === 0) heap(g, RICE, 0.08, 0.08, 0.03, x, F.top + 0.05, z, 6, 1);
      else if (i === 2) for (let k = 0; k < 3; k++) part(g, cyl(0.02, 0.02, 0.022, 10), EGG, x - 0.02 + k * 0.02, F.top + 0.06, z, { rz: Math.PI / 2, outline: false });
      else part(g, cyl(0.055, 0.055, 0.006, 14), dishFood[i], x, F.top + 0.052, z, { outline: false });
    });
    part(g, rbox(0.12, 0.08, 0.12, 0.01), '#4fc3f7', F.box[0], F.top + 0.04, F.box[2]);
    label(g, '보존식 팩', 0.1, 0.03, F.box[0], F.top + 0.05, F.box[2] + 0.061, '#4fc3f7', '#ffffff');
    // The log and the sign on the wall.
    part(g, box(0.6, 0.5, 0.02), '#eceff1', 0, 1.3, -0.47);
    clipboard(g, paintSampleLog, 'dtSampleLog').position.set(F.clip[0], F.clip[1], F.clip[2]);
    label(g, '보존식 보관', 0.22, 0.06, -0.18, 1.42, -0.458, '#01579b', '#ffffff');
    label(g, '매회 1인분', 0.22, 0.05, -0.18, 1.34, -0.458, '#e1f5fe', '#01579b');
    label(g, '144시간', 0.22, 0.05, -0.18, 1.27, -0.458, '#e1f5fe', '#c62828');

    const idle = group(g);
    out.idle = idle;
    makeDoor(idle);
    const spoonRest = part(idle, box(0.02, 0.006, 0.15), CHROME, 0.04, F.top + 0.016, 0.13, { ry: 0.3, outline: false });
    void spoonRest;
    const use = group(g);
    out.inUse = use;
    const door = makeDoor(use);
    const mist = puffs(use, 6, MIST, 0.05);
    /** The sample bag (its middle at the origin, standing up), the food in it. */
    const bagG = group(use);
    const bagBody = new THREE.Mesh(box(0.12, 0.16, 0.02), BAGGIE);
    bagG.add(bagBody);
    part(bagG, box(0.122, 0.01, 0.022), '#1e88e5', 0, 0.075, 0, { outline: false });
    label(bagG, '10/27 중식', 0.08, 0.02, 0, 0.045, 0.012, '#ffffff', '#1565c0');
    const bagFood = [RICE, SOUP, EGG, SPINACH].map((col, i) => part(bagG, box(0.1, 0.026, 0.012), col, 0, -0.065 + i * 0.026, 0, { outline: false }));
    const lying = group(use);
    const lyingBag = new THREE.Mesh(box(0.12, 0.02, 0.16), BAGGIE);
    lying.add(lyingBag);
    part(lying, box(0.1, 0.012, 0.1), '#c9b38a', 0, 0, 0.01, { outline: false });
    const inBag = part(use, rbox(0.1, 0.02, 0.14, 0.008), '#eaf4f8', -0.04, F.shelf + 0.015, 0.0, { outline: false });
    const spoon = group(use);
    part(spoon, box(0.016, 0.005, 0.12), CHROME, 0, 0, -0.04, { outline: false });
    part(spoon, ball(0.018), CHROME, 0, 0, 0.03, { outline: false }).scale.set(1, 0.3, 1.3);
    const mk = pen(use, '#1e88e5');
    const mark = marker(g, 0, 1.0, 0);
    const spots: Record<string, Spot> = {
      dtKeepSample: spotAt(g, DT.SAMPLE_AT, 'stand', 'dtSample', mark),
      '*': spotAt(g, DT.SAMPLE_AT, 'stand', 'dtSample', mark),
    };
    out.spots = spots;
    out.work = mark;
    out.animate = (t) => {
      const ph = phaseOf(mark);
      const b = DT.sampleBeat(t, ph);
      const key = DT.dtKeyOf('dtSample', t, ph).key;
      const open = DT.doorOpen(b);
      door.rotation.y = 1.7 * open;
      mist([0, 0.55, F.front + 0.05], t, open, 0.3, 0.2);
      const bag = DT.bagOf(b);
      bagG.visible = bag.where === 'hand';
      lying.visible = bag.where === 'top';
      inBag.visible = bag.where === 'in';
      if (bag.where === 'hand') {
        bagG.position.copy(vp(key.l, 0.02));
        bagG.rotation.set(0, 0, 0);
        bagFood.forEach((f, i) => (f.visible = i < bag.fill));
        if (b.from === 'put' || b.from === 'open') {
          bagG.rotation.set(-1.3, 0, 0);
        }
      }
      if (bag.where === 'top') lying.position.set(-0.04, F.top + 0.025, 0.08);
      spoon.visible = DT.spoonHeld(b);
      if (spoon.visible) {
        spoon.position.copy(vp(key.r, -0.03));
        spoon.rotation.set(-0.5, 0, 0);
      }
      mk.visible = DT.markerHeld(b);
      if (mk.visible) mk.position.copy(vp(key.r, -0.02));
    };
  },

  /**
   * The 퇴식구: a long stainless counter where the pupils' trays come in from the right on a roller
   * belt, the 잔반 hole with its lip (the bin under it on a platform scale, seen through the
   * cupboard's opening), the 수저 반납통 in water, a blue rack of scraped trays at the left; behind,
   * the 퇴식구 sign, the 잔반 줄이기 poster and the scale's LED readout.
   *
   * Measuring the waste: a tray taken off the end of the belt, tipped over the hole and scraped
   * with the spatula (the scraps fall), the readout watched as it climbs, the tray put in the rack,
   * the figure written on the 잔반량 조사표.
   */
  dtTrayReturn(g, _W, _D, _c, _def, _ctx, out) {
    const R = DT.RETURN;
    const back = -0.4;
    const front = 0.25;
    const zc = (front + back) / 2;
    // The counter, with the opening onto the bin under the hole.
    part(g, rbox(1.96, R.top - 0.04, front - back, 0.02), STAINLESS, 0, (R.top - 0.04) / 2, zc);
    part(g, box(0.42, 0.66, 0.02), '#37474f', R.hole[0], 0.4, front + 0.002, { outline: false });
    part(g, rbox(0.32, 0.42, 0.32, 0.03), '#1e88e5', R.hole[0], 0.3, zc);
    part(g, rbox(0.38, 0.06, 0.36, 0.01), '#90a4ae', R.hole[0], 0.04, zc);
    label(g, '잔반 계량', 0.16, 0.04, R.hole[0], 0.68, front + 0.014, '#eceff1', '#bf360c');
    part(g, rbox(2.0, 0.03, front - back + 0.04, 0.01), CHROME, 0, R.top, zc);
    // The hole and its lip, the spatula by it.
    part(g, box(0.34, 0.006, 0.28), '#263238', R.hole[0], R.top + 0.016, R.hole[2], { outline: false });
    rim(g, 0.34, 0.28, R.hole[0], R.top + 0.024, R.hole[2], 0.025);
    // The roller belt from the right.
    const bx0 = R.beltEnd - 0.08;
    const bx1 = 0.98;
    for (const sz of [-1, 1]) part(g, box(bx1 - bx0, 0.04, 0.02), STAINLESS_D, (bx0 + bx1) / 2, R.top + 0.03, R.beltZ + sz * 0.2);
    const rollers = group(g);
    for (let x = bx0 + 0.03; x < bx1; x += 0.07) part(rollers, cyl(0.016, 0.016, 0.38, 10), '#b0bec5', x, R.top + 0.035, R.beltZ, { rx: Math.PI / 2, outline: false });
    label(g, '◀ 식판', 0.2, 0.05, 0.75, R.top + 0.055, R.beltZ + 0.212, '#fff59d', '#e65100');
    // The spoon box in water, the rack of scraped trays.
    part(g, rbox(0.18, 0.14, 0.14, 0.01), CHROME, 0.02, R.top + 0.07, -0.25);
    part(g, box(0.16, 0.004, 0.12), '#b3e5fc', 0.02, R.top + 0.13, -0.25, { outline: false });
    for (let i = 0; i < 9; i++) part(g, cyl(0.004, 0.004, 0.2, 5), STEEL, -0.04 + (i % 5) * 0.03, R.top + 0.17, -0.28 + Math.floor(i / 5) * 0.05, { rz: ((i * 13) % 7 - 3) * 0.05, outline: false });
    label(g, '수저 반납', 0.14, 0.035, 0.02, R.top + 0.07, -0.179, '#eceff1', '#37474f');
    const rack = group(g, R.rack[0], R.top + 0.02, R.rack[2]);
    part(rack, rbox(0.3, 0.12, 0.42, 0.02), '#1565c0', 0, 0.06, 0);
    for (let i = 0; i < 4; i++) part(rack, rbox(0.27, 0.36, 0.014, 0.02), CHROME, 0, 0.18, -0.15 + i * 0.06);
    // The back panel: the sign, the poster, the readout.
    part(g, box(2.0, 0.66, 0.03), '#eceff1', 0, R.top + 0.36, back - 0.015);
    label(g, '퇴 식 구', 0.5, 0.11, 0.55, R.top + 0.56, back + 0.002, '#00897b', '#ffffff');
    label(g, '남김없이 먹어요 · 잔반 ZERO', 0.62, 0.07, 0.55, R.top + 0.42, back + 0.002, '#e0f2f1', '#00695c');
    label(g, '음식물은 구멍에 · 식판은 오른쪽에', 0.62, 0.05, 0.55, R.top + 0.33, back + 0.002, '#ffffff', '#455a64');
    part(g, rbox(0.42, 0.18, 0.03, 0.01), '#102027', R.display[0], R.display[1], back + 0.01);
    label(g, '오늘 잔반', 0.2, 0.04, R.display[0], R.display[1] + 0.055, back + 0.027, '#102027', '#80cbc4');
    const readout = lcd(g, 0.34, 0.08, R.display[0], R.display[1] - 0.02, back + 0.027, '12.4 kg', '#102027', '#ff8a65');
    hungBoard(g, paintWasteLog, 'dtWasteLog', -0.78, R.top + 0.36, back + 0.01);

    // The trays on the belt (they creep along it in use), the tray in hand, the spatula, the scraps.
    const idle = group(g);
    out.idle = idle;
    [0.36, 0.6, 0.86].forEach((x) => (tray(idle, true).g.position.set(x, R.top + 0.055, R.beltZ)));
    const use = group(g);
    out.inUse = use;
    const belt = [0, 1, 2].map(() => tray(use, true));
    const held = tray(use, true);
    const scraper = group(use);
    part(scraper, rbox(0.08, 0.06, 0.008, 0.01), '#e53935', 0, -0.03, 0);
    part(scraper, cyl(0.007, 0.007, 0.16, 6), '#eceff1', 0, 0.06, 0, { outline: false });
    const scraps = [0, 1, 2, 3].map((i) => part(use, ball(0.012), i % 2 ? RICE : SPINACH, 0, 0, 0, { outline: false }));
    const clip = clipboard(use, paintWasteLog, 'dtWasteLog');
    clip.position.set(R.clip[0], R.clip[1], R.clip[2]);
    const pencil = pen(use);
    const mark = marker(g, 0, 1.0, 0);
    const spots: Record<string, Spot> = {
      dtPlateWaste: spotAt(g, DT.WASTE_AT, 'stand', 'dtWaste', mark),
      '*': spotAt(g, DT.WASTE_AT, 'stand', 'dtWaste', mark),
    };
    out.spots = spots;
    out.work = mark;
    out.animate = (t) => {
      const ph = phaseOf(mark);
      const b = DT.wasteBeat(t, ph);
      const key = DT.dtKeyOf('dtWaste', t, ph).key;
      const sxNow = DT.wasteAt(b).x;
      for (const sp of Object.values(spots)) sp.at.position.x = sxNow;
      // The belt creeps; the front tray waits at its end until it's taken.
      const creep = (t * 0.06) % 0.26;
      belt.forEach((tr, i) => {
        const x = R.beltEnd + 0.18 + i * 0.26 + 0.26 - creep;
        tr.g.position.set(Math.min(0.88, x), R.top + 0.055, R.beltZ);
      });
      const ht = DT.handTray(b, key);
      held.g.visible = ht.on;
      if (ht.on) {
        held.g.position.copy(mid(key.l, key.r, -0.02));
        held.g.rotation.set(-ht.tip, 0, 0);
        held.fills.forEach((f) => f.scale.set(1, Math.max(0.05, ht.full), 1));
      }
      scraper.visible = DT.scraperHeld(b);
      if (scraper.visible) {
        scraper.position.copy(vp(key.r, -0.04));
        scraper.rotation.set(0.6, 0, 0);
      }
      scraps.forEach((s, i) => {
        const u = (t * 1.4 + i / 4) % 1;
        s.visible = DT.scraperHeld(b) && b.p > 0.1 && b.p < 0.9;
        s.position.set(R.hole[0] + 0.03 * Math.sin(i * 2), R.top + 0.2 - u * 0.2, R.hole[2] + 0.03 * Math.cos(i * 3));
      });
      pencil.visible = DT.wasteNote(b);
      if (pencil.visible) pencil.position.copy(vp(key.r, -0.02));
      readout(`${DT.wasteKilos(b).toFixed(1)} kg`);
    };
  },

  /**
   * The dishwasher: a conveyor tunnel in stainless with rubber curtains at both ends, the window
   * onto its sprays, the lit panel (세척 62℃ · 헹굼 84℃), the hood and its exhaust duct up to the
   * ceiling; the entry table on the left with a rack of dirty trays and the pre-rinse spray on its
   * spring, the exit table on the right with the clean trays stacked.
   *
   * Checking the rinse: the rack pushed in through the curtain, the panel read with a finger on it,
   * a look through the window at the sprays, a clean tray lifted off the exit and tilted to the light,
   * stacked with the others.
   */
  dtDishwasher(g, _W, _D, _c, _def, _ctx, out) {
    const W = WASHER_GEOM;
    const T = DT.WASHER;
    // The tunnel and its hood.
    part(g, rbox(W.len, T.hoodTop - 0.04, W.d, 0.03), STAINLESS, 0, (T.hoodTop - 0.04) / 2, W.zc);
    part(g, rbox(W.len + 0.06, 0.08, W.d + 0.06, 0.02), STAINLESS_D, 0, T.hoodTop, W.zc);
    part(g, cyl(0.1, 0.1, 0.7, 16), CHROME, -0.2, T.hoodTop + 0.4, W.zc - 0.1);
    part(g, box(0.9, 0.006, 0.006), STAINLESS_D, 0, 0.5, T.front + 0.004, { outline: false });
    label(g, '컨베이어 식기 세척기', 0.42, 0.06, -0.12, 0.62, T.front + 0.004, '#eceff1', '#37474f');
    // The openings at either end, their curtains.
    for (const sx of [-1, 1]) {
      part(g, box(0.02, 0.32, 0.5), '#263238', sx * (W.len / 2 + 0.002), T.top + 0.16, W.zc, { outline: false });
      for (let i = 0; i < 6; i++) part(g, box(0.006, 0.3, 0.075), '#455a64', sx * (W.len / 2 + 0.012), T.top + 0.16, W.zc - 0.2 + i * 0.08, { outline: false });
    }
    // The window onto the sprays, the panel.
    part(g, rbox(0.34, 0.24, 0.02, 0.01), STAINLESS_D, T.window[0], T.window[1], T.front);
    part(g, box(0.3, 0.2, 0.006), '#263238', T.window[0], T.window[1], T.front + 0.006, { outline: false });
    part(g, rbox(0.26, 0.2, 0.03, 0.01), '#37474f', T.panel[0], T.panel[1], T.front);
    const scr = litScreen(g, painted('dtWasherPanel', 256, 160, (c) => {
      FILL(c, 256, 160, '#0b1e2d');
      text(c, '세척 62℃', 14, 30, 26, '#80deea');
      text(c, '헹굼 84℃', 14, 78, 30, '#ff8a65');
      text(c, '컨베이어 ▶ 1.2m/min', 14, 128, 17, '#a5d6a7', 'left', false);
    }), 0.22, 0.14, T.panel[0], T.panel[1] + 0.01, T.front + 0.017);
    out.screen = scr;
    for (const [i, col] of ['#43a047', '#e53935'].entries()) part(g, cyl(0.018, 0.018, 0.02, 10), col, T.panel[0] - 0.06 + i * 0.12, T.panel[1] - 0.15, T.front + 0.01, { rx: Math.PI / 2 });
    // The entry table, the pre-rinse spray on its spring.
    const tx0 = -1.0;
    part(g, rbox(-W.len / 2 - tx0, 0.03, W.d, 0.01), CHROME, (tx0 - W.len / 2) / 2, T.top, W.zc);
    for (const sz of [-1, 1]) part(g, cyl(0.016, 0.016, T.top, 8), STEEL, tx0 + 0.05, T.top / 2, W.zc + sz * 0.26, { outline: false });
    part(g, box(0.36, 0.006, 0.4), '#8a969c', (tx0 - W.len / 2) / 2, T.top + 0.018, W.zc, { outline: false });
    rod(g, v3(-0.82, T.top, W.zc - 0.28), v3(-0.82, 1.65, W.zc - 0.28), 0.014, CHROME);
    for (let i = 0; i < 10; i++) part(g, ring(0.03, 0.005), STEEL, -0.82, 1.15 + i * 0.045, W.zc - 0.22, { rx: Math.PI / 2, outline: false });
    part(g, cyl(0.02, 0.025, 0.12, 8), '#263238', -0.82, 1.08, W.zc - 0.22, { outline: false });
    // The exit table and its clean stack.
    part(g, rbox(1.0 - W.len / 2, 0.03, W.d, 0.01), CHROME, (1.0 + W.len / 2) / 2, T.top, W.zc);
    for (const sz of [-1, 1]) part(g, cyl(0.016, 0.016, T.top, 8), STEEL, 0.95, T.top / 2, W.zc + sz * 0.26, { outline: false });
    const stack = group(g, T.exit, T.top + 0.02, 0.05);
    for (let i = 0; i < 8; i++) part(stack, rbox(0.36, 0.018, 0.27, 0.02), CHROME, 0, i * 0.02, 0);
    /** A rack of trays standing in it (its foot at the origin). */
    const rackOf = (parent: THREE.Object3D, dirty: boolean) => {
      const r = group(parent);
      part(r, rbox(0.4, 0.1, 0.42, 0.02), '#1565c0', 0, 0.05, 0);
      for (let i = 0; i < 5; i++) {
        const tr = part(r, rbox(0.014, 0.27, 0.36, 0.02), CHROME, -0.12 + i * 0.06, 0.16, 0);
        if (dirty) part(tr, box(0.004, 0.06, 0.08), i % 2 ? KIMCHI : RICE, 0.008, -0.02, 0.05, { outline: false });
      }
      return r;
    };
    const idle = group(g);
    out.idle = idle;
    rackOf(idle, true).position.set(T.inRack, T.top + 0.02, W.zc);
    const use = group(g);
    out.inUse = use;
    const rk = rackOf(use, true);
    const sprays = group(use, T.window[0], T.window[1], T.front + 0.01);
    const jets = Array.from({ length: 6 }, (_, i) => {
      const j = new THREE.Mesh(box(0.008, 0.16, 0.004), WATER);
      j.position.set(-0.12 + i * 0.048, 0, 0);
      sprays.add(j);
      return j;
    });
    const steamOut = puffs(use, 6, STEAM, 0.045);
    const steamDuct = puffs(use, 5, STEAM, 0.06);
    const clean = tray(use);
    clean.fills.forEach((f) => (f.visible = false));
    const shine = glowing(use, box(0.2, 0.004, 0.02), '#ffffff', 0, 0, 0);
    const mark = marker(g, 0, 1.0, 0);
    const spots: Record<string, Spot> = {
      dtWashCheck: spotAt(g, DT.DISH_AT, 'stand', 'dtDish', mark),
      '*': spotAt(g, DT.DISH_AT, 'stand', 'dtDish', mark),
    };
    out.spots = spots;
    out.work = mark;
    out.animate = (t) => {
      const ph = phaseOf(mark);
      const b = DT.dishBeat(t, ph);
      const key = DT.dtKeyOf('dtDish', t, ph).key;
      // Stepping along the machine: the entry, the panel, the window, the exit.
      const sxNow = DT.dishAt(b).x;
      for (const sp of Object.values(spots)) sp.at.position.x = sxNow;
      rk.position.set(DT.rackX(b), T.top + 0.02, W.zc);
      rk.visible = DT.rackX(b) < -0.3;
      jets.forEach((j, i) => {
        j.position.y = 0.04 * Math.sin(t * 14 + i * 1.3);
        j.scale.y = 0.6 + 0.4 * Math.abs(Math.sin(t * 9 + i));
      });
      steamOut([W.len / 2 + 0.08, T.top + 0.2, W.zc], t, 0.8, 0.35, 0.08);
      steamDuct([-0.2, T.hoodTop + 0.75, W.zc - 0.1], t + 0.3, 0.5, 0.3, 0.05);
      clean.g.visible = DT.cleanHeld(b);
      shine.visible = clean.g.visible && b.from === 'lift' && b.p > 0.5;
      if (clean.g.visible) {
        clean.g.position.copy(mid(key.l, key.r, -0.01));
        clean.g.rotation.set(b.from === 'lift' ? -0.9 * ss(b.p, 0.3, 0.6) : 0, 0, 0);
        shine.position.copy(clean.g.position).add(v3(0.04 * Math.sin(t * 2), 0.06, 0.06));
      }
    };
  },

  /**
   * The 오늘의 메뉴 sign: a whiteboard on two posts over a little cabinet whose glass case holds
   * today's sample tray (실물 식단) — the header and date, the five dishes each with its allergy
   * numbers on a yellow magnet, the calories, and the allergy key along its foot.
   *
   * Putting up the menu: each line written with the marker (the board starts clean), the allergy
   * magnets stuck on after them, the sample tray in its case set square, a step back to look.
   */
  dtMenuSign(g, _W, _D, _c, _def, _ctx, out) {
    const S = DT.SIGN;
    // The cabinet and its glass case with the sample tray.
    part(g, rbox(0.86, 0.6, 0.4, 0.02), '#8d6e63', 0, 0.3, -0.05);
    part(g, rbox(0.88, 0.025, 0.42, 0.01), '#6d4c41', 0, 0.61, -0.05);
    label(g, `${SCHOOL} 급식실`, 0.5, 0.07, 0, 0.4, 0.152, '#8d6e63', '#fff8e1');
    glass(g, box(0.6, 0.22, 0.34), 0, S.caseTop - 0.11, -0.04);
    part(g, box(0.62, 0.012, 0.36), CHROME, 0, S.caseTop, -0.04, { outline: false });
    const sample = tray(g);
    sample.g.position.set(0, 0.63, -0.04);
    label(g, '오늘의 실물 식단', 0.2, 0.035, 0.18, 0.66, 0.13, '#ffffff', '#33691e');
    // The posts and the board.
    for (const sx of [-1, 1]) part(g, cyl(0.02, 0.02, S.y1 + 0.06 - 0.62, 10), CHROME, sx * 0.43, (S.y1 + 0.06 + 0.62) / 2, -0.2);
    part(g, rbox(S.w + 0.04, S.y1 - S.y0 + 0.04, 0.03, 0.01), '#b0bec5', 0, (S.y0 + S.y1) / 2, S.face - 0.03);
    const boardTex = (lines: number) =>
      painted(`dtMenuBoard|${lines}`, 512, 488, (c) => {
        FILL(c, 512, 488, '#fdfdfb');
        c.fillStyle = '#7cb342';
        c.fillRect(0, 0, 512, 84);
        text(c, '오늘의 메뉴', 256, 34, 40, '#ffffff', 'center');
        text(c, '10월 27일 (화) 중식', 256, 70, 20, '#f1f8e9', 'center', false);
        const ys = DT.LINES_Y.map((y) => ((S.y1 - y) / (S.y1 - S.y0)) * 488);
        for (let i = 0; i < lines; i++) text(c, MENU[i][0], 40, ys[i], 32, '#1a237e', 'left');
        if (lines >= 5) text(c, '685 kcal · 단백질 28.4 g', 40, ((S.y1 - 1.07) / (S.y1 - S.y0)) * 488, 20, '#e65100', 'left');
        c.fillStyle = '#fff3e0';
        c.fillRect(0, 440, 512, 48);
        text(c, '①난류 ⑤대두 ⑥밀 ⑨새우 ⑬아황산류 ⑯쇠고기', 256, 464, 17, '#bf360c', 'center', false);
      });
    const bmat = new THREE.MeshBasicMaterial({ map: boardTex(5) });
    const bmesh = new THREE.Mesh(new THREE.PlaneGeometry(S.w, S.y1 - S.y0), bmat);
    bmesh.userData.ownGeometry = bmesh.userData.ownMaterial = true;
    bmesh.position.set(0, (S.y0 + S.y1) / 2, S.face - 0.012);
    g.add(bmesh);
    part(g, box(S.w, 0.02, 0.05), '#b0bec5', 0, S.y0 - 0.01, S.face + 0.0);
    part(g, cyl(0.009, 0.009, 0.12, 8), '#1e88e5', -0.25, S.y0 + 0.012, S.face + 0.01, { rz: Math.PI / 2, outline: false });
    /** A yellow magnet with a dish's allergy numbers. */
    const magnet = (parent: THREE.Object3D, i: number) => label(parent, MENU[i][1] || '—', 0.12, 0.05, S.magnets[i][0], S.magnets[i][1], S.face + 0.0, '#ffeb3b', '#bf360c');
    const idle = group(g);
    out.idle = idle;
    MENU.forEach((_, i) => magnet(idle, i));
    const use = group(g);
    out.inUse = use;
    const mags = MENU.map((_, i) => magnet(use, i));
    const mk = pen(use, '#1a237e');
    const handMag = label(use, '1', 0.12, 0.05, 0, 0, 0, '#ffeb3b', '#bf360c');
    const mark = marker(g, 0, 1.2, 0);
    const spots: Record<string, Spot> = {
      dtPostMenu: spotAt(g, DT.POST_AT, 'stand', 'dtPost', mark),
      '*': spotAt(g, DT.POST_AT, 'stand', 'dtPost', mark),
    };
    out.spots = spots;
    out.work = mark;
    let shown = 5;
    out.animate = (t) => {
      const ph = phaseOf(mark);
      const b = DT.postBeat(t, ph);
      const key = DT.dtKeyOf('dtPost', t, ph).key;
      const lines = DT.linesWritten(b);
      if (lines !== shown) {
        shown = lines;
        bmat.map = boardTex(lines);
        bmat.needsUpdate = true;
      }
      const on = DT.magnetsOn(b);
      mags.forEach((m, i) => (m.visible = i < on));
      mk.visible = DT.penHeld(b);
      if (mk.visible) {
        mk.position.copy(vp(key.r, 0.0));
        mk.rotation.set(-1.2, 0, 0.2);
      }
      handMag.visible = b.from === 'stick' && on < 5;
      if (handMag.visible) handMag.position.copy(vp(key.r, 0.0)).add(v3(0, 0, 0.01));
    };
  },

  /**
   * The long cafeteria table: a light laminate top with a steel edge on a steel frame, a napkin box
   * and a little table tent (골고루 냠냠) in its middle. The pupils sit at it on the chairs either side.
   */
  dtMealTable(g) {
    const top = 0.74;
    part(g, rbox(1.9, 0.035, 0.74, 0.012), '#ece6d8', 0, top - 0.018, 0);
    part(g, box(1.91, 0.012, 0.75), STAINLESS_D, 0, top - 0.04, 0, { outline: false });
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) part(g, cyl(0.022, 0.022, top - 0.05, 8), STAINLESS_D, sx * 0.86, (top - 0.05) / 2, sz * 0.28, { outline: false });
      part(g, box(0.05, 0.03, 0.62), STAINLESS_D, sx * 0.86, 0.015, 0, { outline: false });
    }
    part(g, box(1.7, 0.03, 0.03), STAINLESS_D, 0, 0.18, 0, { outline: false });
    part(g, rbox(0.16, 0.07, 0.1, 0.01), '#ffffff', -0.1, top + 0.035, 0);
    part(g, box(0.06, 0.03, 0.04), '#f5f5f5', -0.1, top + 0.08, 0, { outline: false });
    const tent = group(g, 0.12, top, 0);
    for (const sz of [-1, 1]) {
      const p = picture(tent, painted('dtTent', 192, 128, (c) => {
        FILL(c, 192, 128, '#fff8e1');
        text(c, '골고루 냠냠', 96, 46, 28, '#e65100', 'center');
        text(c, '잔반 ZERO', 96, 92, 22, '#2e7d32', 'center');
      }), 0.14, 0.09, 0, 0.045, sz * 0.012, '#ffffff', sz > 0 ? 0 : Math.PI, sz * -0.25);
      void p;
    }
  },

  /**
   * The cold room's door: a white insulated panel wall with a heavy stainless door, its lever latch
   * and kick plate, a frosted porthole, the controller over it glowing 3.0℃, the sign (문을 꼭 닫아
   * 주세요), and a crate of 배추 waiting beside it.
   */
  dtColdRoom(g) {
    part(g, box(1.0, 2.3, 0.18), '#f5f7f8', 0, 1.15, -0.41);
    for (const x of [-0.45, 0.45]) part(g, box(0.006, 2.28, 0.005), '#cfd8dc', x, 1.15, -0.318, { outline: false });
    part(g, rbox(0.84, 2.04, 0.04, 0.01), STAINLESS_D, 0, 1.02, -0.31);
    part(g, rbox(0.76, 1.96, 0.06, 0.012), STAINLESS, 0, 1.0, -0.29);
    part(g, box(0.76, 0.22, 0.004), CHROME, 0, 0.13, -0.258, { outline: false });
    // The latch: a heavy lever on its plate.
    part(g, rbox(0.08, 0.22, 0.04, 0.01), STEEL, 0.3, 1.05, -0.25);
    part(g, rbox(0.04, 0.18, 0.04, 0.012), '#263238', 0.3, 1.0, -0.22, { rz: 0.3 });
    for (const y of [0.3, 1.75]) part(g, rbox(0.06, 0.14, 0.04, 0.01), STEEL, -0.38, y, -0.25);
    // The porthole, frosted.
    part(g, ring(0.1, 0.014), STEEL, 0, 1.5, -0.256);
    glass(g, cyl(0.095, 0.095, 0.006, 20), 0, 1.5, -0.258, new THREE.MeshBasicMaterial({ color: '#e1f5fe' }), Math.PI / 2);
    // The controller and the signs.
    part(g, rbox(0.2, 0.12, 0.05, 0.01), '#eceff1', 0, 2.12, -0.3);
    lcd(g, 0.13, 0.05, 0, 2.13, -0.274, '3.0℃', '#102027', '#69f0ae');
    label(g, '냉장 창고 0~5℃', 0.34, 0.07, 0, 1.78, -0.258, '#0277bd', '#ffffff');
    label(g, '문을 꼭 닫아 주세요', 0.34, 0.05, 0, 1.25, -0.258, '#ffffff', '#c62828');
    // A crate of cabbages waiting.
    part(g, rbox(0.3, 0.2, 0.26, 0.01), '#2e7d32', 0.33, 0.1, 0.12);
    for (let i = 0; i < 3; i++) {
      const c = part(g, ball(0.07), '#c5e1a5', 0.25 + i * 0.08, 0.22, 0.12, { outline: false });
      c.scale.set(0.8, 1, 0.8);
    }
  },
  // -------------------------------------------------------------------------------------------
  // The 급식실 laid out as it is (2026-11-04, the layout audit).

  /**
   * The 검수실's inspection bench by the yard door: a stainless bench with the platform scale (its read-out 12.40 kg) and a box of
   * 배추 on it, the probe thermometer reading a pack of pork (2.8℃), a crate of eggs, the clipboard with the day's 검수일지, and the
   * sign over it: what is checked (온도 · 중량 · 유통기한 · 원산지 · 포장 상태). Checking a delivery: stood at it.
   */
  dtInspectBench(g, W) {
    const top = 0.86;
    part(g, rbox(W - 0.1, 0.04, 0.62, 0.01), STAINLESS, 0, top, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.02, 0.02, top, 8), STAINLESS_D, sx * (W / 2 - 0.12), top / 2, sz * 0.24, { outline: false });
    part(g, rbox(W - 0.2, 0.02, 0.5, 0.01), STAINLESS_D, 0, 0.2, 0);
    // The scale and the box of cabbages on it.
    part(g, rbox(0.5, 0.06, 0.42, 0.01), STEEL, -0.45, top + 0.05, 0.02);
    part(g, rbox(0.42, 0.22, 0.34, 0.01), '#2e7d32', -0.45, top + 0.19, 0.02);
    for (let i = 0; i < 3; i++) part(g, ball(0.09), '#c5e1a5', -0.58 + i * 0.13, top + 0.33, 0.02, { outline: false }).scale.set(0.8, 1, 0.8);
    part(g, rbox(0.2, 0.12, 0.04, 0.01), '#eceff1', -0.45, top + 0.1, 0.26);
    lcd(g, 0.14, 0.05, -0.45, top + 0.1, 0.282, '12.40 kg', '#102027', '#69f0ae');
    // The pork pack and the probe in it.
    part(g, rbox(0.26, 0.05, 0.18, 0.02), '#f8bbd0', 0.18, top + 0.045, 0.05);
    part(g, cyl(0.004, 0.004, 0.14, 6), CHROME, 0.2, top + 0.11, 0.05, { rz: 0.5, outline: false });
    part(g, rbox(0.07, 0.11, 0.025, 0.01), '#ffca28', 0.25, top + 0.17, 0.06, { rz: 0.5 });
    // The eggs.
    part(g, rbox(0.3, 0.06, 0.3, 0.005), '#bcaaa4', 0.62, top + 0.05, -0.05);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) part(g, ball(0.024), '#fff3e0', 0.5 + i * 0.06, top + 0.09, -0.17 + j * 0.06, { outline: false }).scale.set(1, 1.25, 1);
    // The clipboard.
    part(g, rbox(0.22, 0.012, 0.3, 0.005), '#795548', 0.25, top + 0.03, -0.2);
    part(g, box(0.19, 0.004, 0.26), CARD, 0.25, top + 0.04, -0.19, { outline: false });
    for (let i = 0; i < 6; i++) part(g, box(0.15, 0.002, 0.004), '#90a4ae', 0.25, top + 0.043, -0.28 + i * 0.035, { outline: false });
    // The sign on the wall behind.
    part(g, rbox(1.2, 0.5, 0.02, 0.01), '#ffffff', 0, 1.65, -0.47);
    label(g, '식재료 검수', 0.5, 0.11, 0, 1.8, -0.455, '#558b2f', '#ffffff');
    label(g, '온도 · 중량 · 유통기한', 0.9, 0.08, 0, 1.65, -0.455, '#ffffff', '#33691e');
    label(g, '원산지 · 포장 상태 확인', 0.9, 0.08, 0, 1.53, -0.455, '#ffffff', '#33691e');
  },

  /** The trolley at the hall's door: stacks of steel 식판 on two shelves, the 수저통 of spoons and chopsticks on top, its card. */
  dtTrayStand(g) {
    const top = 0.9;
    for (const y of [0.12, 0.5, top]) part(g, rbox(0.7, 0.025, 0.5, 0.01), STAINLESS, 0, y, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.014, 0.014, top, 8), STAINLESS_D, sx * 0.33, top / 2, sz * 0.23, { outline: false });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) caster(g, sx * 0.31, sz * 0.21);
    // The trays.
    for (const [y, n] of [[0.135, 9], [0.515, 12]] as const)
      for (const sx of [-1, 1]) for (let i = 0; i < n; i++) part(g, rbox(0.3, 0.012, 0.4, 0.008), i % 2 ? STAINLESS : '#dfe5e8', sx * 0.17, y + 0.012 + i * 0.016, 0, { outline: false });
    // The spoon box, the spoons and chopsticks standing in it.
    part(g, rbox(0.4, 0.14, 0.18, 0.01), STAINLESS_D, 0, top + 0.08, 0);
    for (let i = 0; i < 9; i++) {
      part(g, cyl(0.005, 0.005, 0.2, 5), CHROME, -0.16 + i * 0.04, top + 0.2, -0.03 + (i % 2) * 0.05, { rz: (i % 3 - 1) * 0.08, outline: false });
      part(g, ball(0.016), CHROME, -0.16 + i * 0.04, top + 0.3, -0.03 + (i % 2) * 0.05, { outline: false }).scale.set(1, 0.4, 1.4);
    }
    label(g, '식판 · 수저', 0.26, 0.06, 0, top + 0.08, 0.092, '#ffffff', '#558b2f');
  },

  /**
   * The refrigerated truck that brings the morning's food: a white 1-ton cab-over with a 냉장 box behind, its side door slid open on
   * crates of vegetables, the fridge unit on the box's nose, the supplier's name on its side (초록들 식자재 · 학교급식 전문, made up),
   * the plates. Parked nose to the street.
   */
  dtSupplyTruck(g, _W, D) {
    const wd = 1.7;
    const front = D / 2 - 0.1;
    const cabL = 1.3;
    const box0 = -D / 2 + 0.15;
    const boxL = front - cabL - 0.08 - box0;
    // The cab.
    part(g, rbox(wd, 1.55, cabL, 0.18), '#f7f8f8', 0, 1.1, front - cabL / 2);
    part(g, box(wd - 0.16, 0.6, 0.01), '#2d3e50', 0, 1.45, front + 0.002, { outline: false });
    for (const s of [-1, 1]) part(g, box(0.01, 0.42, 0.6), '#2d3e50', s * (wd / 2 + 0.003), 1.45, front - 0.45, { outline: false });
    part(g, rbox(wd - 0.1, 0.22, 0.06, 0.03), '#cfd3d6', 0, 0.42, front + 0.01);
    for (const s of [-1, 1]) part(g, rbox(0.3, 0.1, 0.03, 0.02), '#fffde7', s * 0.6, 0.66, front + 0.012);
    label(g, '82가 3108', 0.4, 0.1, 0, 0.42, front + 0.045, '#ffffff', '#111111');
    for (const s of [-1, 1]) part(g, rbox(0.04, 0.14, 0.1, 0.02), BLACK, s * (wd / 2 + 0.06), 1.35, front - 0.2);
    // The box.
    const bz = box0 + boxL / 2;
    part(g, rbox(wd + 0.06, 1.9, boxL, 0.03), '#ffffff', 0, 1.35, bz);
    part(g, box(wd + 0.07, 0.12, boxL - 0.1), '#43a047', 0, 0.62, bz, { outline: false });
    for (const s of [-1, 1]) {
      const sx = s * (wd / 2 + 0.04);
      const ry = s > 0 ? Math.PI / 2 : -Math.PI / 2;
      label(g, '초록들 식자재', 1.4, 0.24, sx, 1.7, bz, 'none', '#2e7d32', ry);
      label(g, '학교급식 전문 · 냉장 0~5℃', 1.2, 0.12, sx, 1.42, bz, 'none', '#455a64', ry);
    }
    // The fridge unit on the box's nose, over the cab.
    part(g, rbox(1.0, 0.36, 0.22, 0.04), '#eceff1', 0, 2.1, front - cabL - 0.05);
    for (let i = 0; i < 5; i++) part(g, box(0.8, 0.012, 0.005), '#90a4ae', 0, 2.0 + i * 0.05, front - cabL + 0.065, { outline: false });
    // The rear doors and the bumper.
    part(g, box(wd - 0.1, 1.7, 0.01), '#f1f3f4', 0, 1.33, box0 - 0.005, { outline: false });
    part(g, box(0.01, 1.7, 0.01), '#b0b6bb', 0, 1.33, box0 - 0.012, { outline: false });
    part(g, rbox(wd, 0.12, 0.08, 0.03), '#37474f', 0, 0.36, box0 - 0.02);
    label(g, '82가 3108', 0.4, 0.1, 0, 0.5, box0 - 0.02, '#ffffff', '#111111', Math.PI);
    // The wheels.
    for (const z of [front - 0.55, box0 + 0.55])
      for (const s of [-1, 1]) {
        part(g, cyl(0.34, 0.34, 0.24, 20), BLACK, s * (wd / 2 - 0.1), 0.34, z, { rz: Math.PI / 2 });
        part(g, cyl(0.2, 0.2, 0.245, 14), STEEL, s * (wd / 2 - 0.1), 0.34, z, { rz: Math.PI / 2, outline: false });
      }
  },
};
