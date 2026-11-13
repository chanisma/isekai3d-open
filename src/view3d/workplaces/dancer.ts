import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import type { Asana, AsanaKey } from '../asana';
import { ASANAS } from '../asana';
import { marker, rod, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, label, painted, picture, seeded, text } from './doctor';
import { BR, CR, FC, LM, MR, SD, SG, STAGE_NOW, VB, danceAt, dnNow, dnPhase } from './dancerMotion';
import type { DnMotion, DnNow } from './dancerMotion';

/**
 * The 댄스 스튜디오 drawn as itself (2026-10-31 workplace pipeline, at the user's request): a working room
 * of the made-up 무브온 무용단. A wall of real mirrors (the glass reflects the room while it's being danced
 * at, so the dweller's face is seen from behind them), a maple sprung floor taped for spacing, a double barre with
 * a ballet teacher who comes over and corrects, a proper little stage with curtains, lamps on a truss, a
 * stage manager and a house of seats that claps; and what the studio was missing: a sound desk whose count
 * display runs 5-6-7-8, a stretching corner with a foam roller, a rack of costumes and pointe shoes, a
 * video review bench, and a crash mat where a partner is lifted (and now and then dropped, safely).
 *
 * The drawn dancers turn the same bones by the same table as the dweller's own poses (dancerMotion.ts), so the
 * line of students really is doing the phrase. Everything that moves follows the scripts there.
 */

const MAPLE = '#d9b37c';
const MAPLE_D = '#c79e66';
const WOOD = '#8d6e4f';
const ROSE = '#c2185b';
const CURTAIN = '#8e1b3a';
const PAPER = '#fbfaf6';
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3();
type V = readonly [number, number, number];

// ---------------------------------------------------------------------------------------------
// Small parts.

function group(parent: THREE.Object3D, x = 0, y = 0, z = 0, ry = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}
const place = (m: THREE.Object3D, p: V) => m.position.set(p[0], p[1], p[2]);
function ownLit(g: THREE.Object3D, geom: THREE.BufferGeometry, color: string, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color }));
  m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
const setLit = (m: THREE.Mesh, c: string) => (m.material as THREE.MeshBasicMaterial).color.set(c);
function swapPic(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0): { mesh: THREE.Mesh; set: (t: THREE.Texture | null) => void } {
  const mat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.userData.ownGeometry = mesh.userData.ownMaterial = true;
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, 0, 'YXZ');
  g.add(mesh);
  return {
    mesh,
    set: (t) => {
      if (!t || mat.map === t) return;
      mat.map = t;
      mat.needsUpdate = true;
    },
  };
}
const frames = (key: string, w: number, h: number, paint: (c: CanvasRenderingContext2D, i: number) => void) => (i: number) => painted(`dn${key}${i}`, w, h, (c) => paint(c, i));
function flat(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0): THREE.Mesh {
  const m = picture(g, tex, w, h, x, y, z);
  m.rotation.set(-Math.PI / 2, ry, 0, 'YXZ');
  return m;
}
/** A soft see-through thing of its own (a beam of light, a haze). */
function beam(g: THREE.Object3D, geom: THREE.BufferGeometry, color: string, opacity: number): THREE.Mesh {
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const m = new THREE.Mesh(geom, mat);
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.renderOrder = 3;
  g.add(m);
  return m;
}
function standAt(g: THREE.Object3D, motion: DnMotion): Spot {
  const s = spot(g, 'stand', 0, 0, 0.6, Math.PI);
  s.motion = motion;
  return s;
}
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
function nowAt(spots: Record<string, Spot>, t: number): string | null {
  let best: string | null = null;
  for (const [k, s] of Object.entries(spots)) if (k !== '*' && Math.abs(t - posedAt(s)) < 0.6 && (best === null || posedAt(s) > posedAt(spots[best]))) best = k;
  return best;
}
/** Every frame: which use is going on and where its script has got to. */
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, show: (now: string | null, N: DnNow | null, t: number) => void) {
  out.spots = spots;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const N = sp ? dnNow(sp.motion as DnMotion, t, dnPhase(g.getWorldPosition(tmp)), (sp.at.userData.height as number | undefined) ?? 1.6) : null;
    show(now, N, t);
  };
}
/** A picture drawn afresh each frame while something's going on: one small canvas, made when first needed. */
function live(w: number, h: number) {
  let tex: THREE.CanvasTexture | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  return (paint: (c: CanvasRenderingContext2D) => void): THREE.Texture | null => {
    if (typeof document === 'undefined') return null;
    if (!tex) {
      const can = document.createElement('canvas');
      can.width = w;
      can.height = h;
      ctx = can.getContext('2d');
      tex = new THREE.CanvasTexture(can);
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    if (ctx) paint(ctx);
    tex.needsUpdate = true;
    return tex;
  };
}
const towelMesh = (g: THREE.Object3D, color = '#fafafa'): THREE.Group => {
  const t = group(g);
  part(t, rbox(0.2, 0.3, 0.03, 0.012), color, 0, -0.15, 0);
  part(t, box(0.205, 0.03, 0.033), ROSE, 0, -0.26, 0, { outline: false });
  return t;
};
function waterBottle(g: THREE.Object3D, color = '#42a5f5'): THREE.Group {
  const b = group(g);
  part(b, cyl(0.034, 0.036, 0.17, 10), color, 0, 0.085, 0);
  part(b, cyl(0.02, 0.026, 0.025, 8), '#eceff1', 0, 0.18, 0);
  return b;
}
function pencil(g: THREE.Object3D, color = '#37474f'): THREE.Mesh {
  return part(g, cyl(0.006, 0.006, 0.13, 6), color, 0, 0, 0, { rz: 1.2, ry: 0.5, outline: false });
}

// ---------------------------------------------------------------------------------------------
// A drawn dancer: built on the same bones in the same rest pose (a T) as the dweller's body, turned by the
// same table, so a phrase looks the same on them. Set down on the floor as avatar.ts sets the dweller.

interface Look {
  top: string;
  legs: string;
  hair: string;
  skin?: string;
  bun?: boolean;
  skirt?: string;
  shoes?: string;
  jacket?: string;
  headset?: boolean;
  glasses?: boolean;
}
const LOOKS: Record<string, Look> = {
  a: { top: '#37474f', legs: '#263238', hair: '#2b1b10', bun: true, skin: '#f8d9c0', shoes: '#f8bbd0' },
  b: { top: '#ad1457', legs: '#3e2723', hair: '#1a1a1a', skin: '#eac09a', shoes: '#fafafa' },
  c: { top: '#7c4dff', legs: '#1a237e', hair: '#5b3a1e', skin: '#c99a6e', shoes: '#fafafa' },
  teacher: { top: '#212121', legs: '#212121', hair: '#6d6d6d', bun: true, skin: '#f1c9a5', skirt: '#4a4a4a', shoes: '#f5f5f5', glasses: true },
  partner: { top: '#00897b', legs: '#37474f', hair: '#2b1b10', bun: true, skin: '#f8d9c0', skirt: '#4db6ac', shoes: '#f8bbd0' },
  mate: { top: '#ffa000', legs: '#263238', hair: '#1f1a17', skin: '#eac09a', shoes: '#fafafa' },
  manager: { top: '#212121', legs: '#212121', hair: '#3b2a20', skin: '#f1c9a5', shoes: '#37474f', headset: true },
  director: { top: '#880e4f', legs: '#212121', hair: '#1a1a1a', bun: true, skin: '#f8d9c0', shoes: '#37474f' },
};
type BoneName = keyof Asana['bones'];
const BONE_NAMES: BoneName[] = ['hips', 'spine', 'chest', 'neck', 'head', 'leftUpperLeg', 'rightUpperLeg', 'leftLowerLeg', 'rightLowerLeg', 'leftFoot', 'rightFoot', 'leftUpperArm', 'rightUpperArm', 'leftLowerArm', 'rightLowerArm', 'leftHand', 'rightHand'];
const qa = new THREE.Quaternion();
const qb = new THREE.Quaternion();
const ea = new THREE.Euler();
const ZERO: [number, number, number] = [0, 0, 0];
export interface DanceFig {
  root: THREE.Group;
  /** From one pose to the next at the place given (in the parent's frame), on the floor at `y`. */
  pose(from: string, to: string, e: number, x: number, y: number, z: number, yaw: number): void;
  /** A phrase at a time, its steps added to the place. */
  dance(name: string, time: number, x: number, y: number, z: number, yaw: number): void;
}
function dancerFig(parent: THREE.Object3D, look: Look): DanceFig {
  const root = group(parent);
  const skin = look.skin ?? '#f1c9a5';
  const shoes = look.shoes ?? '#fafafa';
  const nodes = {} as Record<BoneName, THREE.Group>;
  const hips = group(root, 0, 0.93, 0);
  nodes.hips = hips;
  part(hips, rbox(0.3, 0.16, 0.2, 0.06), look.legs, 0, -0.01, 0);
  if (look.skirt) part(hips, cyl(0.14, 0.27, 0.16, 12), look.skirt, 0, -0.1, 0);
  const spine = group(hips, 0, 0.08, 0);
  nodes.spine = spine;
  part(spine, rbox(0.27, 0.16, 0.18, 0.06), look.top, 0, 0.07, 0);
  const chest = group(spine, 0, 0.14, 0);
  nodes.chest = chest;
  part(chest, rbox(0.33, 0.22, 0.2, 0.07), look.jacket ?? look.top, 0, 0.1, 0);
  const neck = group(chest, 0, 0.22, 0);
  nodes.neck = neck;
  part(neck, cyl(0.045, 0.05, 0.08, 10), skin, 0, 0.03, 0, { outline: false });
  const head = group(neck, 0, 0.17, 0);
  nodes.head = head;
  part(head, ball(0.112), skin, 0, 0, 0);
  for (const sx of [-1, 1]) part(head, ball(0.012), '#2b2b30', sx * 0.04, 0, 0.104, { outline: false });
  part(head, box(0.03, 0.006, 0.004), '#a1665e', 0, -0.045, 0.104, { outline: false });
  part(head, ball(0.118), look.hair, 0, 0.03, -0.03);
  part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0, 0.075, 0.075, { rx: -0.25 });
  if (look.bun) part(head, ball(0.055), look.hair, 0, 0.1, -0.1);
  if (look.glasses) for (const sx of [-1, 1]) part(head, cyl(0.026, 0.026, 0.004, 12), '#37474f', sx * 0.042, 0.002, 0.11, { rx: Math.PI / 2, outline: false });
  if (look.headset) {
    part(head, box(0.012, 0.03, 0.2), BLACK, 0, 0.125, -0.01, { outline: false });
    part(head, cyl(0.03, 0.03, 0.02, 10), BLACK, 0.115, 0.01, 0, { rz: Math.PI / 2, outline: false });
    rod(head, v3(0.115, -0.02, 0.01), v3(0.05, -0.07, 0.1), 0.004, BLACK);
  }
  for (const [side, sx] of [['left', 1], ['right', -1]] as const) {
    const up = group(chest, sx * 0.17, 0.18, 0);
    nodes[`${side}UpperArm`] = up;
    part(up, cyl(0.042, 0.04, 0.27, 8), look.jacket ?? skin, sx * 0.135, 0, 0, { rz: Math.PI / 2, outline: false });
    const lo = group(up, sx * 0.27, 0, 0);
    nodes[`${side}LowerArm`] = lo;
    part(lo, cyl(0.036, 0.032, 0.25, 8), look.jacket ?? skin, sx * 0.125, 0, 0, { rz: Math.PI / 2, outline: false });
    part(lo, ball(0.04), look.jacket ?? skin, 0, 0, 0, { outline: false });
    const h = group(lo, sx * 0.25, 0, 0);
    nodes[`${side}Hand`] = h;
    part(h, rbox(0.09, 0.03, 0.06, 0.012), skin, sx * 0.04, 0, 0, { outline: false });
    const th = group(hips, sx * 0.085, -0.05, 0);
    nodes[`${side}UpperLeg`] = th;
    part(th, cyl(0.075, 0.058, 0.42, 8), look.legs, 0, -0.21, 0, { outline: false });
    const sh = group(th, 0, -0.42, 0);
    nodes[`${side}LowerLeg`] = sh;
    part(sh, cyl(0.055, 0.04, 0.4, 8), look.legs, 0, -0.2, 0, { outline: false });
    const ft = group(sh, 0, -0.4, 0);
    nodes[`${side}Foot`] = ft;
    part(ft, rbox(0.085, 0.06, 0.21, 0.025), shoes, 0, -0.035, 0.05);
  }
  const rests: Array<[THREE.Object3D, number, number, number]> = [
    [nodes.leftFoot, 0, -0.065, 0.14], [nodes.rightFoot, 0, -0.065, 0.14], [nodes.leftFoot, 0, -0.065, -0.05], [nodes.rightFoot, 0, -0.065, -0.05],
    [nodes.leftLowerLeg, 0, -0.03, 0], [nodes.rightLowerLeg, 0, -0.03, 0], [nodes.hips, 0, -0.1, 0], [nodes.spine, 0, 0.2, -0.08], [nodes.chest, 0, 0.15, -0.1],
  ];
  const set = (from: string, to: string, e: number) => {
    const a = ASANAS[from as AsanaKey];
    const b = ASANAS[to as AsanaKey];
    for (const n of BONE_NAMES) {
      const node = nodes[n];
      if (!node) continue;
      const ra = a?.bones[n] ?? ZERO;
      const rb = b?.bones[n] ?? ZERO;
      qa.setFromEuler(ea.set(ra[0], ra[1], ra[2]));
      qb.setFromEuler(ea.set(rb[0], rb[1], rb[2]));
      node.quaternion.slerpQuaternions(qa, qb, e);
    }
  };
  const settle = (x: number, y: number, z: number, yaw: number) => {
    root.position.set(x, y, z);
    root.rotation.y = yaw;
    root.updateMatrixWorld(true);
    const floor = (root.parent ? root.parent.localToWorld(tmp.set(x, y, z)) : tmp.set(x, y, z)).y;
    let low = Infinity;
    for (const [n, rx, ry, rz] of rests) low = Math.min(low, n.localToWorld(tmp.set(rx, ry, rz)).y);
    root.position.y = y + (floor - low);
  };
  return {
    root,
    pose(from, to, e, x, y, z, yaw) {
      set(from, to, e);
      settle(x, y, z, yaw);
    },
    dance(name, time, x, y, z, yaw) {
      const d = danceAt(name, time);
      set(d.from, d.to, d.e);
      const lx = Math.cos(yaw);
      const lz = -Math.sin(yaw);
      const fx = Math.sin(yaw);
      const fz = Math.cos(yaw);
      settle(x + d.dx * lx + d.dz * fx, y + d.dy, z + d.dx * lz + d.dz * fz, yaw + d.turn);
    },
  };
}
/** Made the first time it's needed: most pieces are never used on a given day. */
function lazyFig(parent: THREE.Object3D, look: Look) {
  let f: DanceFig | null = null;
  return {
    get: () => (f ??= dancerFig(parent, look)),
    hide: () => {
      if (f) f.root.visible = false;
    },
    show: () => {
      const x = (f ??= dancerFig(parent, look));
      x.root.visible = true;
      return x;
    },
  };
}
/** Eases a figure from the pose it was given last to the one it's given now. */
function poser(fig: ReturnType<typeof lazyFig>) {
  let from = 'dnReady';
  let to = 'dnReady';
  let at = -1e9;
  return (pose: string, t: number, x: number, y: number, z: number, yaw: number) => {
    if (pose !== to) {
      from = to;
      to = pose;
      at = t;
    }
    fig.show().pose(from, to, THREE.MathUtils.smoothstep(t - at, 0, 0.35), x, y, z, yaw);
  };
}

// ---------------------------------------------------------------------------------------------
// The glass: a painted room when nobody's at it; a real reflection while somebody is. Two at most at
// once, shared by all the mirrors: each costs a second drawing of the room.

const POOL: Array<{ mesh: Reflector; owner: unknown }> = [];
function borrowGlass(owner: unknown, w: number, h: number): Reflector | null {
  if (typeof document === 'undefined') return null;
  const mine = POOL.find((p) => p.owner === owner);
  if (mine) return mine.mesh;
  const free = POOL.find((p) => p.owner === null);
  if (free) {
    free.owner = owner;
    return free.mesh;
  }
  if (POOL.length >= 2) return null;
  const mesh = new Reflector(new THREE.PlaneGeometry(w, h), { textureWidth: 1024, textureHeight: 576, color: '#8a8a8a', clipBias: 0.002 });
  POOL.push({ mesh, owner });
  return mesh;
}
function returnGlass(owner: unknown) {
  const mine = POOL.find((p) => p.owner === owner);
  if (!mine) return;
  mine.owner = null;
  mine.mesh.removeFromParent();
}

const glassTex = () =>
  painted('dnGlass', 256, 256, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#dfe8ec');
    g.addColorStop(0.72, '#c9d7dd');
    g.addColorStop(0.73, '#d7bf9b');
    g.addColorStop(1, '#c6a77d');
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 256);
    // Floorboards running away in the glass, a soft sheen across.
    c.strokeStyle = 'rgba(120,90,50,0.35)';
    for (let i = 0; i < 9; i++) {
      c.beginPath();
      c.moveTo(128 + (i - 4) * 16, 188);
      c.lineTo(128 + (i - 4) * 64, 256);
      c.stroke();
    }
    c.strokeStyle = 'rgba(255,255,255,0.5)';
    c.lineWidth = 12;
    for (const x of [46, 80, 198]) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x - 50, 186);
      c.stroke();
    }
  });

/** A little figure caught on a phone or a screen. Poses by joints: head, hips, feet and hands. */
const STICKS: number[][] = [
  [50, 16, 50, 52, 38, 92, 62, 92, 30, 36, 70, 36],
  [46, 18, 48, 54, 22, 62, 58, 92, 22, 22, 76, 30],
  [50, 22, 50, 58, 28, 92, 72, 92, 22, 58, 78, 58],
  [54, 14, 50, 50, 50, 92, 74, 52, 36, 10, 66, 10],
  [50, 30, 50, 64, 26, 92, 74, 92, 24, 18, 76, 18],
];
function stick(c: CanvasRenderingContext2D, u: number, x: number, y: number, s: number, color: string) {
  const f = (((u * STICKS.length) % STICKS.length) + STICKS.length) % STICKS.length;
  const a = STICKS[Math.floor(f)];
  const b = STICKS[(Math.floor(f) + 1) % STICKS.length];
  const e = THREE.MathUtils.smoothstep(f - Math.floor(f), 0, 0.4);
  const p = (i: number) => [x + ((a[i * 2] + (b[i * 2] - a[i * 2]) * e) - 50) * s, y + (a[i * 2 + 1] + (b[i * 2 + 1] - a[i * 2 + 1]) * e) * s];
  const [head, hip, fl, fr, hl, hr] = [p(0), p(1), p(2), p(3), p(4), p(5)];
  const neck = [head[0], head[1] + 9 * s];
  c.strokeStyle = color;
  c.lineWidth = 5 * s;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  const line = (...pts: number[][]) => {
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (const q of pts.slice(1)) c.lineTo(q[0], q[1]);
    c.stroke();
  };
  line(neck, hip);
  line(fl, [(hip[0] + fl[0]) / 2 + 2 * s, (hip[1] + fl[1]) / 2], hip, [(hip[0] + fr[0]) / 2 - 2 * s, (hip[1] + fr[1]) / 2], fr);
  line(hl, [(neck[0] + hl[0]) / 2, (neck[1] + hl[1]) / 2 + 4 * s], [neck[0], neck[1] + 4 * s], [(neck[0] + hr[0]) / 2, (neck[1] + hr[1]) / 2 + 4 * s], hr);
  c.fillStyle = color;
  c.beginPath();
  c.arc(head[0], head[1], 8 * s, 0, Math.PI * 2);
  c.fill();
}
/** A notebook page of floor patterns and counts, more of it as it's written. */
const notebook = frames('Note', 96, 128, (c, i) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 96, 128);
  c.strokeStyle = '#cfd8dc';
  for (let k = 0; k < 8; k++) {
    c.beginPath();
    c.moveTo(4, 16 + k * 14);
    c.lineTo(92, 16 + k * 14);
    c.stroke();
  }
  text(c, '안무 노트', 6, 8, 9, ROSE);
  c.strokeStyle = '#1a237e';
  c.fillStyle = '#1a237e';
  const r = seeded(21);
  for (let k = 0; k < Math.min(9, i); k++) {
    const x = 8 + (k % 3) * 28;
    const y = 22 + Math.floor(k / 3) * 34;
    c.strokeRect(x, y, 24, 28);
    c.beginPath();
    c.arc(x + 6 + r() * 12, y + 6 + r() * 16, 2, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.moveTo(x + 4, y + 22);
    c.lineTo(x + 20, y + 6);
    c.stroke();
    text(c, `${k + 1}`, x + 2, y + 25, 7, '#c62828');
  }
});

// =============================================================================================
// The 연습실 거울 (danceMirror): a floor-to-ceiling panel, chromed along its top, a towel rail at one side.

function danceMirror(g: THREE.Group, out: Built) {
  const Z = -0.46;
  const H = 2.34;
  part(g, box(2.0, H + 0.1, 0.04), '#b9c3c7', 0, (H + 0.1) / 2, Z - 0.03, { outline: false });
  picture(g, glassTex(), 1.98, H, 0, 0.08 + H / 2, Z);
  // The frame: a thin chrome line along the top and between panels, a baseboard.
  part(g, box(2.0, 0.035, 0.03), CHROME, 0, 0.08 + H, Z + 0.005);
  for (const x of [-1, 1]) part(g, box(0.018, H, 0.02), CHROME, x * 0.99, 0.08 + H / 2, Z + 0.004, { outline: false });
  part(g, box(2.0, 0.08, 0.05), '#6d5a45', 0, 0.04, Z + 0.015);
  // What lies along the wall changes piece by piece: a towel on a hook, a bottle, a bag; chosen on the first frame.
  const rail = group(g);
  part(rail, box(0.34, 0.018, 0.03), CHROME, MR.towel[0], MR.towel[1] + 0.015, -0.4, { outline: false });
  const towelRest = towelMesh(rail);
  place(towelRest, [MR.towel[0], MR.towel[1], -0.38]);
  const towel = towelMesh(g);
  towel.visible = false;
  const bottle = waterBottle(g);
  place(bottle, MR.bottle);
  const bag = group(g);
  part(bag, rbox(0.42, 0.22, 0.22, 0.08), ['#6a1b9a', '#37474f', '#ad1457'][1], -0.5, 0.13, -0.26);
  part(bag, cyl(0.1, 0.1, 0.02, 8), '#fafafa', -0.5, 0.25, -0.26, { rz: Math.PI / 2, outline: false });
  const phoneRig = group(g);
  // The tripod and the phone on it, for a take.
  for (const a of [0.3, 2.4, 4.5]) rod(phoneRig, v3(MR.phone[0], 1.0, MR.phone[2]), v3(MR.phone[0] + Math.cos(a) * 0.2, 0.01, MR.phone[2] + Math.sin(a) * 0.2), 0.009, BLACK);
  part(phoneRig, cyl(0.012, 0.012, 0.14, 6), BLACK, MR.phone[0], 1.07, MR.phone[2], { outline: false });
  const phone = group(g);
  part(phone, rbox(0.08, 0.15, 0.012, 0.005), BLACK, 0, 0, 0);
  const screen = swapPic(phone, 0.07, 0.135, 0, 0, 0.0075);
  const recDot = ownLit(phone, ball(0.008), '#ff1744', 0.022, 0.058, -0.009);
  const screenLive = live(72, 136);
  const book = group(g);
  part(book, box(0.2, 0.012, 0.26), '#ad1457', 0, 0, 0);
  const pageMesh = swapPic(book, 0.185, 0.245, 0, 0.0065, 0, 0, -Math.PI / 2);
  const pen = pencil(g, '#1a237e');
  // Students (the company), each on the same count as the dweller.
  const line = [lazyFig(g, LOOKS.a), lazyFig(g, LOOKS.b), lazyFig(g, LOOKS.c)];
  const posers = line.map((f) => poser(f));
  const SPOT = [v3(MR.students[0][0], 0, MR.students[0][1]), v3(MR.fix[0], 0, MR.fix[1]), v3(MR.students[2][0], 0, MR.students[2][1])];
  let varied = false;
  const spots: Record<string, Spot> = { practiceChoreo: standAt(g, 'dnPhrase'), dancer_choreoDraft: standAt(g, 'dnDraft'), dancer_companyRehearsal: standAt(g, 'dnLead') };
  spots['*'] = spots.practiceChoreo;
  drive(g, out, spots, (now, N, t) => {
    if (!varied) {
      varied = true;
      const p = g.getWorldPosition(tmp);
      const pick = Math.abs(Math.round(p.x)) % 3;
      rail.visible = pick !== 2;
      bag.visible = pick === 1;
    }
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    // The real reflection, while it's being danced at.
    if (now) {
      const glass = borrowGlass(g, 4, 2.34);
      if (glass && glass.parent !== g) {
        glass.position.set(0, 0.08 + 2.34 / 2, Z + 0.012);
        glass.rotation.set(0, 0, 0);
        g.add(glass);
      }
    } else returnGlass(g);
    towel.visible = !!P.towel;
    if (P.towel) place(towel, P.towel);
    towelRest.visible = !P.towel;
    place(bottle, P.bottle ?? MR.bottle);
    // The tripod and notebook are out for choreographing only.
    const draft = now === 'dancer_choreoDraft';
    phoneRig.visible = draft;
    phone.visible = draft;
    book.visible = draft;
    pen.visible = !!P.pen;
    if (P.pen) place(pen, P.pen);
    if (draft) {
      place(phone, P.phone ?? [MR.phone[0], MR.phone[1] + 0.05, MR.phone[2]]);
      phone.rotation.y = P.phone ? 0 : 0;
      place(book, P.book ?? MR.book);
      book.rotation.x = P.book ? -0.7 : 0;
      pageMesh.set(notebook(Math.round(n.lines ?? 0)));
      const recOn = (n.rec ?? 0) > 0.5;
      setLit(recDot, recOn && Math.floor(t * 2) % 2 === 0 ? '#ff1744' : '#3d0a14');
      screen.set(screenLive((c) => {
        c.fillStyle = (n.video ?? 0) > 0.5 ? '#eadfce' : '#101418';
        c.fillRect(0, 0, 72, 136);
        if ((n.video ?? 0) > 0.5) {
          stick(c, (n.vt ?? 0) * (n.video === 1 ? 2 : 3), 36, 34, 0.7, '#6a1b9a');
          c.fillStyle = 'rgba(0,0,0,0.5)';
          c.fillRect(0, 122, 72, 14);
          c.fillStyle = ROSE;
          c.fillRect(0, 124, 72 * (n.vt ?? 0), 10);
        } else {
          text(c, recOn ? '● REC' : '대기', 36, 68, 14, recOn ? '#ff5252' : '#90a4ae', 'center');
        }
      }));
    }
    // The line of students.
    if (now === 'dancer_companyRehearsal' && N) {
      const fig = N.fig;
      line.forEach((f, i) => {
        const s = SPOT[i];
        const wrong = i === 1 && (n.wrong ?? 0) > 0.5;
        if (N.ph) f.show().dance(N.ph, N.pt - (wrong ? 0.46 : i * 0.03), s.x, 0, s.z, Math.PI);
        else posers[i](fig[['a', 'b', 'c'][i]] ?? 'dnReady', t, s.x, 0, s.z, Math.PI);
      });
    } else line.forEach((f) => f.hide());
  });
  out.work = marker(g, 0, 1.1, -0.4);
}

// =============================================================================================
// The 발레 바 (balletBarre): two rails on uprights, free-standing, a rosin box and a teacher who walks over.

function balletBarre(g: THREE.Group, out: Built) {
  const rail = '#c8a06a';
  for (const y of [BR.yHi, BR.yLo]) part(g, cyl(0.024, 0.024, 2.9, 10), rail, 0, y, BR.z, { rz: Math.PI / 2 });
  for (const x of [-1.36, 0, 1.36]) {
    part(g, cyl(0.022, 0.026, BR.yHi + 0.02, 10), '#37474f', x, (BR.yHi + 0.02) / 2, BR.z - 0.05);
    part(g, rbox(0.1, 0.03, 0.42, 0.012), '#37474f', x, 0.016, BR.z - 0.05);
    for (const y of [BR.yHi, BR.yLo]) part(g, cyl(0.016, 0.016, 0.07, 8), '#37474f', x, y, BR.z - 0.025, { rx: Math.PI / 2, outline: false });
  }
  // The rosin box, sheet of class notes taped to an upright, a bag, ankle weights, a little speaker.
  part(g, box(0.5, 0.06, 0.36), '#a1887f', -0.75, 0.03, -0.32);
  part(g, box(0.44, 0.012, 0.3), '#efe2c8', -0.75, 0.062, -0.32, { outline: false });
  part(g, rbox(0.24, 0.18, 0.14, 0.03), BLACK, 0.82, 0.09, -0.32);
  part(g, cyl(0.05, 0.05, 0.012, 12), '#546e7a', 0.82, 0.1, -0.245, { rx: Math.PI / 2, outline: false });
  const lamp = ownLit(g, ball(0.012), '#37474f', 0.92, 0.16, -0.25);
  for (const x of [0.32, 0.46]) part(g, cyl(0.04, 0.04, 0.2, 8), '#ad1457', x, 0.04, -0.34, { rz: Math.PI / 2, outline: false });
  picture(g, painted('dnBarreNotes', 96, 128, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 96, 128);
    text(c, '바 순서', 48, 14, 13, ROSE, 'center');
    ['플리에 8', '탕뒤 16', '데가제 8', '롱드장브', '퐁뒤', '프라페', '그랑바트망'].forEach((s, i) => text(c, s, 8, 34 + i * 13, 10, '#37474f'));
  }), 0.18, 0.24, 1.36, 1.28, BR.z - 0.05);
  part(g, box(0.02, 0.32, 0.02), '#37474f', 1.36, 1.2, BR.z - 0.07, { outline: false });
  const towel = towelMesh(g, '#f8bbd0');
  place(towel, [-1.2, BR.yHi + 0.03, BR.z + 0.03]);
  // The teacher, a thin stick for counting.
  const tFig = lazyFig(g, LOOKS.teacher);
  const tPose = poser(tFig);
  const baton = part(g, cyl(0.006, 0.004, 0.6, 6), WOOD, 0, 0, 0, { outline: false });
  baton.visible = false;
  const spots: Record<string, Spot> = { stretchRoutine: standAt(g, 'dnBarreStretch'), dancer_basicsDrill: standAt(g, 'dnBarre') };
  spots['*'] = spots.stretchRoutine;
  let lastX = BR.teacher[0];
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    setLit(lamp, (n.music ?? 0) > 0.5 ? (Math.floor(t / 0.46) % 2 ? '#66bb6a' : '#1b5e20') : '#37474f');
    if (now === 'dancer_basicsDrill' && N) {
      const x = n.tx ?? BR.teacher[0];
      lastX = x;
      const pose = N.fig.t ?? 'dnArmsCross';
      tPose(pose, t, x, 0, BR.teacher[1], Math.PI + 0.4);
      baton.visible = pose === 'dnPoint';
      if (baton.visible) {
        baton.position.set(x - 0.3, 1.05, BR.teacher[1] - 0.3);
        baton.rotation.set(1.1, 0, 0.7);
      }
    } else {
      tFig.hide();
      baton.visible = false;
      void lastX;
    }
  });
  out.work = marker(g, 0, BR.yHi, BR.z);
}

// =============================================================================================
// The 공연 무대 (performStage): a real little theatre stage, deck, proscenium, curtain, truss, wings, a
// backdrop; a stage manager with a cue board; a pool of light that follows.

const cueBoard = frames('Cue', 180, 110, (c, i) => {
  c.fillStyle = '#0d0f12';
  c.fillRect(0, 0, 180, 110);
  text(c, 'LX', 12, 18, 14, '#ffb300');
  text(c, `CUE ${i}`, 90, 54, 32, i >= 17 ? '#66bb6a' : '#ffb300', 'center');
  text(c, i >= 17 ? '끝 — 수고했어요' : i % 2 ? '대기' : '진행', 90, 92, 15, '#cfd8dc', 'center');
});
const backdropTex = () =>
  painted('dnBackdrop', 512, 256, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#120a2e');
    g.addColorStop(0.6, '#3a1b5e');
    g.addColorStop(1, '#a23d6c');
    c.fillStyle = g;
    c.fillRect(0, 0, 512, 256);
    const r = seeded(11);
    c.fillStyle = '#ffffff';
    for (let i = 0; i < 60; i++) c.fillRect(r() * 512, r() * 150, 1.6, 1.6);
    c.fillStyle = '#fff4cf';
    c.beginPath();
    c.arc(380, 66, 36, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#25123f';
    c.beginPath();
    c.moveTo(0, 256);
    for (let x = 0; x <= 512; x += 32) c.lineTo(x, 200 - 34 * Math.sin(x * 0.019) - 14 * Math.sin(x * 0.05));
    c.lineTo(512, 256);
    c.fill();
    text(c, '무브온 무용단 정기 공연', 256, 232, 20, '#fce4ec', 'center');
  });
function performStage(g: THREE.Group, out: Built, showcase = false) {
  const DK = SG.deck;
  const X = 2.46;
  const backZ = SG.back;
  const frontZ = SG.front;
  // The deck: black sides, marley on top, spike tape, footlights along the lip.
  part(g, rbox(X * 2, DK, frontZ - backZ, 0.02), '#2a2a2f', 0, DK / 2, (frontZ + backZ) / 2);
  part(g, box(X * 2 - 0.1, 0.012, frontZ - backZ - 0.06), '#37343a', 0, DK + 0.006, (frontZ + backZ) / 2, { outline: false });
  part(g, box(X * 2, 0.04, 0.04), MAPLE_D, 0, DK + 0.01, frontZ);
  const spike = (x: number, z: number, col: string) => {
    part(g, box(0.16, 0.003, 0.03), col, x, DK + 0.014, z, { rz: 0, ry: 0.78, outline: false });
    part(g, box(0.16, 0.003, 0.03), col, x, DK + 0.014, z, { ry: -0.78, outline: false });
  };
  SG.marks.forEach(([x, z], i) => spike(x, z, ['#ffeb3b', '#4fc3f7', '#ff7043'][i]));
  spike(0, SG.center[2], '#ffffff');
  const foots: THREE.Mesh[] = [];
  for (let i = 0; i < 9; i++) {
    const x = -2.0 + i * 0.5;
    part(g, rbox(0.14, 0.06, 0.08, 0.015), BLACK, x, DK + 0.04, frontZ - 0.05);
    foots.push(ownLit(g, box(0.1, 0.03, 0.01), '#4a3b20', x, DK + 0.045, frontZ - 0.005));
  }
  // The stair at the left of the front, a rail.
  for (let i = 0; i < 3; i++) {
    const h = DK * ((3 - i) / 4);
    part(g, box(0.72, h, 0.22), '#3a3a40', -1.95, h / 2, frontZ + 0.11 + i * 0.22);
  }
  rod(g, v3(-2.32, 0.92, frontZ + 0.66), v3(-2.32, DK + 0.46, frontZ - 0.02), 0.013, STEEL);
  for (const [z, y] of [[frontZ + 0.66, 0], [frontZ + 0.3, 0.26]] as const) part(g, cyl(0.012, 0.012, 0.92 - 0.2 * (y > 0 ? 1 : 0), 6), STEEL, -2.32, y + 0.46 - 0.1 * (y > 0 ? 0 : 0), z, { outline: false });
  // The studio's showcase riser (dnShowcaseRiser): no backdrop, proscenium or curtain, the lamp bar on two stands.
  const curtains: THREE.Group[] = [];
  if (showcase) {
    for (const sx of [-1, 1]) {
      part(g, cyl(0.2, 0.22, 0.03, 14), BLACK, sx * (X - 0.12), DK + 0.015, -0.2);
      part(g, cyl(0.025, 0.025, 2.9 - DK, 8), '#3a3a40', sx * (X - 0.12), DK + (2.9 - DK) / 2, -0.2);
    }
    label(g, '무브온 무용단 · 월간 쇼케이스', 1.9, 0.24, 0, DK + 1.75, backZ + 0.03, '#2a2a2f', '#ffe082');
  } else {
  // The backdrop on the back wall, black legs either side, the proscenium's posts and valance.
  picture(g, backdropTex(), X * 2 - 0.2, 2.2, 0, DK + 1.12, backZ + 0.02);
  const PH = 2.72;
  for (const sx of [-1, 1]) {
    part(g, box(0.16, PH, 0.2), '#2a1420', sx * (X - 0.05), PH / 2, frontZ - 0.32);
    part(g, box(0.03, DK + 2.1, 1.2), '#17151a', sx * (X - 0.5), (DK + 2.1) / 2 + 0.02, -0.65);
  }
  part(g, box(X * 2 + 0.06, 0.38, 0.22), CURTAIN, 0, PH - 0.12, frontZ - 0.32);
  for (let i = 0; i < 12; i++) part(g, box(0.05, 0.36, 0.03), '#6f1530', -2.2 + i * 0.4, PH - 0.12, frontZ - 0.2, { outline: false });
  label(g, '무브온 스테이지', 1.4, 0.2, 0, PH - 0.13, frontZ - 0.205, CURTAIN, '#ffe082');
  // A fixed drape outside the right half; the left stays open as the way on.
  part(g, box(0.82, 2.02, 0.05), '#7b1633', 1.98, DK + 1.03, frontZ - 0.38, { outline: false });
  // Curtains: two halves that gather to the sides.
  for (const sx of [-1, 1]) {
    // Each half closes to the middle from ±1.55: the stair's way in is the gap on the left, masked by the leg behind it.
    const hang = group(g, sx * 1.55, DK + 0.02, frontZ - 0.38);
    for (let i = 0; i < 5; i++) {
      const w = 0.31;
      part(hang, box(w, 2.02, 0.05), i % 2 ? CURTAIN : '#7b1633', -sx * (w * (i + 0.5)), 1.01, i % 2 ? 0.02 : 0, { outline: false });
    }
    curtains.push(hang);
  }
  }
  // The lamp truss, lamps that come on, a beam that follows the dancer.
  part(g, box(X * 2 - 0.1, 0.05, 0.05), '#3a3a40', 0, 2.9, -0.2);
  part(g, box(X * 2 - 0.1, 0.05, 0.05), '#3a3a40', 0, 2.68, -0.2);
  for (let i = 0; i < 12; i++) rod(g, v3(-2.3 + i * 0.42, 2.68, -0.2), v3(-2.3 + (i + 1) * 0.42, 2.9, -0.2), 0.008, '#54545c');
  const colors = ['#ff7eb3', '#7eb6ff', '#ffe08a', '#b388ff', '#7eb6ff', '#ff7eb3'];
  const heads: THREE.Mesh[] = [];
  const washes: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const x = -1.9 + i * 0.76;
    part(g, cyl(0.07, 0.09, 0.2, 10), BLACK, x, 2.54, -0.2, { rx: 0.35 });
    heads.push(ownLit(g, cyl(0.075, 0.075, 0.008, 10), '#2a2420', x, 2.45, -0.17));
    const w = beam(g, new THREE.ConeGeometry(0.55, 2.0, 18, 1, true), colors[i], 0.07);
    w.position.set(x, DK + 1.0, -0.12);
    w.visible = false;
    washes.push(w);
  }
  const follow = beam(g, new THREE.ConeGeometry(0.62, 2.1, 22, 1, true), '#fff7d6', 0.14);
  follow.visible = false;
  const pool = new THREE.Mesh(new THREE.CircleGeometry(0.62, 26), new THREE.MeshBasicMaterial({ color: '#fff7d6', transparent: true, opacity: 0.4, depthWrite: false }));
  pool.userData.ownGeometry = pool.userData.ownMaterial = true;
  pool.rotation.x = -Math.PI / 2;
  pool.visible = false;
  g.add(pool);
  // The prompt corner: a stand with the cue board and a cue light, a stage manager on headset.
  const standPole = part(g, box(0.08, 1.05, 0.08), '#2a2a2f', SG.sm[0] - 0.42, DK + 0.525, SG.sm[1] - 0.04);
  const cue = swapPic(g, 0.4, 0.24, SG.sm[0] - 0.42, DK + 1.14, SG.sm[1]);
  cue.set(cueBoard(10));
  const go = ownLit(g, ball(0.025), '#1b5e20', SG.sm[0] - 0.42, DK + 1.3, SG.sm[1]);
  const smFig = lazyFig(g, LOOKS.manager);
  const smPose = poser(smFig);
  const dirFig = lazyFig(g, LOOKS.director);
  const dirPose = poser(dirFig);
  // Confetti at the finish, a bouquet.
  const bits = group(g);
  const r = seeded(70);
  const pieces: Array<{ m: THREE.Mesh; x: number; z: number; s: number; o: number }> = [];
  for (let i = 0; i < 40; i++) {
    const m = part(bits, box(0.03, 0.03, 0.002), ['#ff5252', '#ffd740', '#40c4ff', '#b388ff', '#ffffff'][i % 5], 0, 0, 0, { outline: false, shadow: false });
    pieces.push({ m, x: -2 + r() * 4, z: -1.0 + r() * 1.6, s: 0.5 + r() * 0.6, o: r() });
  }
  bits.visible = false;
  const flowers = group(g);
  part(flowers, cyl(0.03, 0.022, 0.26, 8), '#558b2f', 0, -0.1, 0, { rz: 0.4 });
  for (let i = 0; i < 7; i++) part(flowers, ball(0.042), ['#f06292', '#fff176', '#ffffff'][i % 3], Math.cos(i * 1.2) * 0.05, 0.05 + (i % 3) * 0.02, Math.sin(i * 1.2) * 0.05, { outline: false });
  flowers.visible = false;
  const spots: Record<string, Spot> = { rehearseStage: standAt(g, 'dnCue'), performShow: standAt(g, 'dnShow'), dancer_soloExpression: standAt(g, 'dnSolo') };
  spots['*'] = spots.rehearseStage;
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    // The curtain half-drawn when nobody's on, open in use.
    const open = now ? n.curtain ?? 0 : 0.35;
    curtains.forEach((h, i) => {
      h.scale.x = 1 - 0.8 * open;
      h.position.x = (i === 0 ? -1 : 1) * 1.55;
    });
    const lit = n.lit ?? 0;
    const work = (n.work ?? 0) > 0.5;
    const fxOn = (n.fx ?? 0) > 0.5;
    heads.forEach((h, i) => {
      const beat = fxOn ? 0.5 + 0.5 * Math.sin(t * 6.8 + i * (n.fx ?? 1)) : 1;
      setLit(h, lit > 0.05 ? new THREE.Color(colors[i]).multiplyScalar(0.3 + 0.7 * lit * beat).getStyle() : '#2a2420');
      washes[i].visible = lit > 0.05 && !work;
      if (washes[i].visible) (washes[i].material as THREE.MeshBasicMaterial).opacity = 0.09 * lit * beat;
    });
    foots.forEach((f) => setLit(f, lit > 0.05 ? (n.solo ? '#6a5a3a' : '#ffe9a8') : '#4a3b20'));
    // A follow spot on the dancer, or the marked pools of a cue-to-cue.
    let px = 0;
    let pz = -0.2;
    if (N) {
      const d = N.key.d;
      const yaw = N.st.yaw;
      px = N.st.x + (d ? d.dx * Math.cos(yaw) + d.dz * Math.sin(yaw) : 0);
      pz = N.st.z + (d ? -d.dx * Math.sin(yaw) + d.dz * Math.cos(yaw) : 0);
    }
    const spotOn = (n.spot ?? 0) > 0.5;
    const cueOn = work && lit > 0.3 && N;
    const poolOn = spotOn || !!cueOn;
    pool.visible = poolOn;
    follow.visible = spotOn;
    if (poolOn) {
      const m = cueOn ? SG.marks[Math.round(n.pool ?? 0)] : null;
      const x = m ? m[0] : px;
      const z = m ? m[1] : pz;
      pool.position.set(x, DK + 0.016, z);
      const warm = (n.warm ?? 0) > 0.5;
      (pool.material as THREE.MeshBasicMaterial).color.set(warm ? '#ffcf9e' : m ? ['#ffeb3b', '#4fc3f7', '#ff7043'][Math.round(n.pool ?? 0)] : '#fff7d6');
      (pool.material as THREE.MeshBasicMaterial).opacity = cueOn ? 0.3 : 0.45;
      follow.position.set(x, DK + 1.05, z);
    }
    // The cue board and the stage manager, the director out at the front of the stage.
    const rehearsing = now === 'rehearseStage';
    standPole.visible = cue.mesh.visible = go.visible = rehearsing;
    cue.set(cueBoard(Math.round(n.cue ?? 10)));
    setLit(go, (n.go ?? 0) > 0.5 ? '#66ff77' : (n.hold ?? 0) > 0.5 ? '#ff5252' : '#1b5e20');
    if (now === 'rehearseStage' && N) smPose(N.fig.sm ?? 'dnHandsHips', t, SG.sm[0], DK, SG.sm[1], -Math.PI / 2 - 0.3);
    else smFig.hide();
    if (now === 'dancer_soloExpression' && N) dirPose(N.fig.sm ?? 'dnArmsCross', t, SG.sm[0], DK, SG.sm[1], -Math.PI / 2 - 0.3);
    else dirFig.hide();
    // Paper in the air at the end of the show.
    const cheer = n.cheer ?? 0;
    bits.visible = cheer > 0.3;
    if (bits.visible) for (const q of pieces) {
      const fall = ((t * q.s * 0.5 + q.o) % 1);
      q.m.position.set(q.x + 0.1 * Math.sin(t * 2 + q.o * 9), DK + 2.2 - 2.2 * fall, q.z);
      q.m.rotation.set(t * 3 * q.s, t * 2, q.o * 6);
    }
    flowers.visible = !!P.flowers;
    if (P.flowers) place(flowers, P.flowers);
    // The house listens to this.
    if (now === 'performShow') {
      STAGE_NOW.show = n.house ?? 0;
      STAGE_NOW.cheer = cheer;
      STAGE_NOW.t = t;
    }
  });
  out.work = marker(g, 0, DK + 1, SG.center[2]);
}

// =============================================================================================
// 객석 (dnHouseSeats): decor, a row of folding seats; the audience comes in for the show.

function houseSeats(g: THREE.Group, out: Built, W: number) {
  const n = Math.max(2, Math.round(W / 0.72));
  const pitch = W / n;
  const folks = [LOOKS.b, LOOKS.c, LOOKS.mate, LOOKS.a, LOOKS.director].map((l) => lazyFig(g, { ...l, skirt: undefined }));
  const xs: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + pitch * (i + 0.5);
    xs.push(x);
    part(g, rbox(0.46, 0.05, 0.42, 0.015), '#7a1730', x, 0.46, 0.0);
    part(g, rbox(0.46, 0.48, 0.05, 0.015), '#7a1730', x, 0.72, -0.2);
    for (const sx of [-1, 1]) part(g, box(0.03, 0.48, 0.34), '#37343a', x + sx * 0.25, 0.24, -0.04);
  }
  part(g, box(W, 0.04, 0.1), '#2a2a2f', 0, 0.02, -0.04, { outline: false });
  label(g, '객석 A열', 0.34, 0.08, xs[0], 0.72, -0.17, '#7a1730', '#ffe082');
  out.away = (_o, t) => {
    const on = Math.abs(t - STAGE_NOW.t) < 0.6 && STAGE_NOW.show > 0.5;
    xs.forEach((x, i) => {
      const f = folks[i % folks.length];
      if (!on) return f.hide();
      const clap = STAGE_NOW.cheer > 0.3;
      const beat = Math.floor(t * 3.2 + i * 0.3) % 2;
      const stand = clap && i % 2 === 0;
      const pose = !clap ? 'dnSeat' : stand ? 'dnSeatCheer' : beat ? 'dnSeatClapA' : 'dnSeatClapB';
      f.show().pose(pose, pose, 1, x, 0, 0.02, 0);
    });
  };
}

// =============================================================================================
// 사운드 데스크 (dnSoundDesk): a mixer, a laptop with the waveform, a tap-tempo pad, two monitors on poles and
// the LED count display everyone in the room can read.

const waveShape = (x: number) => 0.2 + 0.8 * Math.abs(Math.sin(x * 0.13) * Math.sin(x * 0.041 + 1));
function soundDesk(g: THREE.Group, out: Built) {
  const T = SD.top;
  // The desk: dark wood with a shelf, open on the front.
  part(g, rbox(1.94, 0.05, 0.76, 0.012), '#2f2a28', 0, T - 0.025, -0.02);
  for (const x of [-0.92, 0.92]) part(g, box(0.05, T - 0.05, 0.7), '#3e3734', x, (T - 0.05) / 2, -0.02);
  part(g, box(1.8, 0.03, 0.5), '#3e3734', 0, 0.28, -0.12);
  // On the shelf: an amp, a CD wallet, spare cable.
  part(g, rbox(0.5, 0.14, 0.34, 0.012), BLACK, -0.5, 0.37, -0.14);
  for (let i = 0; i < 4; i++) part(g, cyl(0.012, 0.012, 0.01, 8), CHROME, -0.68 + i * 0.1, 0.38, 0.032, { rx: Math.PI / 2, outline: false });
  part(g, rbox(0.3, 0.05, 0.25, 0.02), '#6a1b9a', 0.3, 0.32, -0.1);
  // The mixer with faders that move.
  part(g, rbox(0.86, 0.04, 0.42, 0.01), '#3b3f45', -0.28, T + 0.02, 0.13);
  const faders: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) {
    const x = -0.62 + i * 0.1;
    part(g, box(0.012, 0.004, 0.18), '#15171a', x, T + 0.042, 0.2, { outline: false });
    faders.push(part(g, box(0.05, 0.022, 0.03), i === 4 ? ROSE : '#d8dde0', x, T + 0.052, 0.2, { outline: false }));
    for (let k = 0; k < 3; k++) part(g, cyl(0.012, 0.014, 0.018, 8), ['#ffd740', '#40c4ff', '#ff5252'][k], x, T + 0.05, 0.0 + k * 0.035 - 0.07, { outline: false });
  }
  // The tap-tempo pad, big and rubbery, a play button.
  part(g, rbox(0.14, 0.03, 0.12, 0.012), '#212121', SD.pad[0], T + 0.018, SD.pad[2]);
  const pad = ownLit(g, box(0.1, 0.006, 0.08), '#37474f', SD.pad[0], T + 0.034, SD.pad[2]);
  part(g, rbox(0.1, 0.03, 0.1, 0.012), '#212121', SD.play[0], T + 0.018, SD.play[2]);
  const play = ownLit(g, cyl(0.03, 0.03, 0.006, 3), '#1b5e20', SD.play[0], T + 0.034, SD.play[2]);
  // The laptop with a waveform.
  const L = SD.laptop;
  part(g, rbox(0.42, 0.016, 0.3, 0.008), '#b0bec5', L[0], T + 0.008, L[2] + 0.08);
  part(g, box(0.36, 0.003, 0.16), '#37474f', L[0], T + 0.018, L[2] + 0.06, { outline: false });
  part(g, rbox(0.42, 0.28, 0.012, 0.008), '#90a4ae', L[0], T + 0.15, L[2] - 0.09, { rx: -0.22 });
  const scr = swapPic(g, 0.385, 0.25, L[0], T + 0.15, L[2] - 0.082, 0, -0.22);
  const scrLive = live(256, 166);
  // The cue sheet, a pen.
  const S = SD.sheet;
  part(g, box(0.22, 0.003, 0.3), PAPER, S[0], T + 0.002, S[2] - 0.05, { outline: false });
  const sheetTex = frames('CueSheet', 88, 120, (c, i) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 88, 120);
    text(c, '음악 큐시트', 44, 10, 10, ROSE, 'center');
    ['01 오프닝 0:12', '02 군무 1:36', '03 솔로 3:04', '04 피날레 4:40', i ? '→ 8×4 후 진입' : ''].forEach((s, k) => text(c, s, 4, 26 + k * 16, 8.5, k === 4 ? '#c62828' : '#37474f'));
  });
  const sheet = swapPic(g, 0.21, 0.29, S[0], T + 0.005, S[2] - 0.05, 0, -Math.PI / 2);
  sheet.set(sheetTex(0));
  const pen = pencil(g, '#c62828');
  pen.visible = false;
  // The count display on a pole at the back: 5 6 7 8.
  part(g, cyl(0.022, 0.03, 0.82, 8), '#37343a', -0.72, T + 0.41, -0.3);
  part(g, rbox(0.72, 0.34, 0.06, 0.012), BLACK, -0.3, T + 0.78, -0.3);
  const countTex = frames('Count', 192, 90, (c, i) => {
    c.fillStyle = '#080a0c';
    c.fillRect(0, 0, 192, 90);
    if (i === 0) {
      text(c, '--', 96, 45, 46, '#3a2420', 'center');
      return;
    }
    text(c, `${i}`, 62, 48, 74, i === 1 ? '#66ff77' : '#ff9e40', 'center');
    for (let k = 1; k <= 8; k++) {
      c.fillStyle = k === i ? (i === 1 ? '#66ff77' : '#ff9e40') : '#262a2e';
      c.fillRect(106 + ((k - 1) % 4) * 20, 22 + Math.floor((k - 1) / 4) * 24, 14, 16);
    }
  });
  const count = swapPic(g, 0.66, 0.29, -0.3, T + 0.78, -0.265);
  count.set(countTex(0));
  const bpmTex = frames('Bpm', 90, 36, (c, i) => {
    c.fillStyle = '#080a0c';
    c.fillRect(0, 0, 90, 36);
    text(c, i ? '130 BPM' : '--- BPM', 45, 19, 17, i ? '#40c4ff' : '#37474f', 'center');
  });
  const bpm = swapPic(g, 0.2, 0.08, -0.3, T + 0.55, -0.265);
  bpm.set(bpmTex(0));
  part(g, box(0.22, 0.1, 0.03), BLACK, -0.3, T + 0.55, -0.29);
  // Two monitors, one each side, on poles; cones that throb.
  const cones: THREE.Mesh[] = [];
  for (const x of [-1.0, 1.0]) {
    const sx = x < 0 ? -0.86 : 0.86;
    part(g, cyl(0.02, 0.02, 1.0, 8), '#37343a', sx, 0.5 + T * 0.0, -0.4);
    part(g, rbox(0.3, 0.46, 0.24, 0.02), BLACK, sx, 1.22, -0.4);
    cones.push(part(g, cyl(0.095, 0.095, 0.015, 14), '#37474f', sx, 1.17, -0.272, { rx: Math.PI / 2, outline: false }));
    part(g, cyl(0.036, 0.036, 0.015, 10), '#90a4ae', sx, 1.34, -0.272, { rx: Math.PI / 2, outline: false });
  }
  label(g, '음향', 0.3, 0.08, 0.6, 0.15, 0.36, '#2f2a28', '#ffd740');
  const spots: Record<string, Spot> = { dnCueMusic: standAt(g, 'dnSound'), dnFreestyle: standAt(g, 'dnFree') };
  spots['*'] = spots.dnCueMusic;
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const music = (n.music ?? 0) > 0.3;
    count.set(countTex(music ? Math.max(1, Math.min(8, Math.round(n.count ?? 1))) : (n.count ?? 0) > 0.5 ? Math.round(n.count ?? 0) : 0));
    bpm.set(bpmTex((n.bpm ?? 0) > 0.5 ? 1 : 0));
    setLit(pad, (n.pad ?? 0) > 0.5 ? '#ff4081' : '#37474f');
    setLit(play, music ? '#66ff77' : '#1b5e20');
    const hit = music ? Math.max(0, 1 - ((t / 0.46) % 1) * 2) : 0;
    cones.forEach((c) => (c.scale.y = 1 + 2.4 * hit, c.scale.x = c.scale.z = 1 + 0.06 * hit));
    const fader = n.fader ?? 0;
    faders.forEach((f, i) => (f.position.z = 0.2 + 0.07 - 0.14 * (i === 4 ? fader : 0.25 + 0.3 * ((i * 3) % 4) / 3 + (music ? 0.05 * Math.sin(t * 3 + i) : 0))));
    if (now && (n.screen ?? 0) > 0.5) {
      const playhead = music ? ((t * 0.04) % 1) : n.scrub ?? 0.3;
      scr.set(scrLive((c) => {
        c.fillStyle = '#10151c';
        c.fillRect(0, 0, 256, 166);
        c.fillStyle = '#1d2733';
        c.fillRect(0, 0, 256, 20);
        text(c, (n.screen ?? 0) < 1.5 ? '곡 목록' : '02_군무_편집.wav', 8, 10, 12, '#cfd8dc');
        if ((n.screen ?? 0) < 1.5) {
          ['01 오프닝', '02 군무', '03 솔로', '04 피날레'].forEach((s, k) => {
            if (k === 1) {
              c.fillStyle = '#ad1457';
              c.fillRect(6, 30 + k * 24, 244, 22);
            }
            text(c, s, 14, 41 + k * 24, 14, '#ffffff');
          });
          return;
        }
        for (let x = 0; x < 256; x += 2) {
          const h = 46 * waveShape(x);
          c.fillStyle = x / 256 < playhead ? '#ff4081' : '#40c4ff';
          c.fillRect(x, 86 - h, 1.5, h * 2);
        }
        for (let i = 0; i < 8; i++) {
          c.strokeStyle = 'rgba(255,255,255,0.14)';
          c.beginPath();
          c.moveTo(i * 32, 26);
          c.lineTo(i * 32, 146);
          c.stroke();
          text(c, `${i + 1}`, i * 32 + 3, 34, 9, 'rgba(255,255,255,0.5)');
        }
        c.fillStyle = '#ffffff';
        c.fillRect(playhead * 256, 24, 2, 124);
        if ((n.cut ?? 0) > 0.05) {
          const x = 128 + 40 * (n.cut ?? 0);
          c.fillStyle = '#ffd740';
          c.fillRect(x, 24, 3, 124);
          text(c, '진입', x + 6, 136, 12, '#ffd740');
        }
      }));
    } else if (!now) {
      scr.set(painted('dnLaptopIdle', 256, 166, (c) => {
        c.fillStyle = '#1a2230';
        c.fillRect(0, 0, 256, 166);
        text(c, '음악 편집', 128, 83, 22, '#546e7a', 'center');
      }));
    }
    sheet.set(sheetTex((n.lines ?? 0) > 0.4 || (n.cut ?? 0) > 0.8 ? 1 : 0));
    pen.visible = !!P.pen;
    if (P.pen) place(pen, P.pen);
  });
  out.work = marker(g, -0.2, T + 0.05, 0.14);
}

// =============================================================================================
// 스트레칭 코너 (dnStretchCorner): a big mat, a foam roller, a band hung on the wall bar, a massage ball.

function stretchCorner(g: THREE.Group, out: Built) {
  part(g, rbox(1.86, 0.03, 1.86, 0.012), '#6a4c93', FC.mat[0] - 0.05, 0.016, FC.mat[2] - 0.05, { outline: false });
  part(g, box(1.7, 0.002, 1.7), '#7d5fa8', FC.mat[0] - 0.05, 0.032, FC.mat[2] - 0.05, { outline: false });
  // Wall bars at the back, hung with a band and a rolled mat.
  for (const x of [-0.8, 0.8]) part(g, box(0.05, 2.0, 0.05), MAPLE_D, x, 1.0, -0.92);
  for (let i = 0; i < 8; i++) part(g, cyl(0.016, 0.016, 1.6, 8), MAPLE, 0, 0.3 + i * 0.24, -0.92, { rz: Math.PI / 2, outline: false });
  const bandRest = group(g);
  rod(bandRest, v3(-0.42, 1.74, -0.88), v3(-0.46, 1.0, -0.86), 0.012, '#26c6da');
  rod(bandRest, v3(-0.34, 1.74, -0.88), v3(-0.3, 1.04, -0.86), 0.012, '#26c6da');
  part(g, cyl(0.075, 0.075, 0.55, 12), '#546e7a', 0.34, 1.42, -0.88, { rz: Math.PI / 2 });
  // The roller, spare blocks, the massage ball.
  const roller = group(g);
  roller.rotation.order = 'YXZ';
  part(roller, cyl(0.072, 0.072, 0.48, 14), '#ff7043', 0, 0, 0, { rz: Math.PI / 2 });
  for (const x of [-0.16, 0, 0.16]) part(roller, cyl(0.075, 0.075, 0.03, 14), '#e64a19', x, 0, 0, { rz: Math.PI / 2, outline: false });
  place(roller, FC.roller);
  for (const [x, c] of [[-0.3, '#7e57c2'], [-0.08, '#26a69a']] as const) part(g, rbox(0.2, 0.09, 0.14, 0.015), c, x + 0.1, 0.07, -0.68);
  const ball1 = part(g, ball(0.038), '#ef5350', 0.8, 0.07, -0.34);
  // A band in the hands, loop to the foot.
  const band: THREE.Mesh[] = [rod(g, v3(0, 0, 0), v3(0, 1, 0), 0.01, '#26c6da'), rod(g, v3(0, 0, 0), v3(0, 1, 0), 0.01, '#26c6da')];
  band.forEach((b) => (b.visible = false));
  const spots: Record<string, Spot> = { dnFoamRoll: standAt(g, 'dnRoll'), dnSplitStretch: standAt(g, 'dnSplits') };
  spots['*'] = spots.dnFoamRoll;
  const A = new THREE.Vector3();
  const B = new THREE.Vector3();
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    let p: V = FC.roller;
    if (P.roller) p = P.roller;
    else if (now === 'dnFoamRoll' && n.rolled !== undefined && n.rolled !== 2) {
      // Under the body as it rolls: along x of the dweller's facing.
      const d = N?.key.d;
      const at = (N?.st.x ?? 0) + (d?.dz ?? 0);
      p = [at + (n.rolled ?? 0), 0.105, FC.sit[2]];
    } else if (now === 'dnFoamRoll' && n.rolled === 2) p = [FC.sit[0] + 0.62, 0.105, FC.sit[2] + 0.34];
    place(roller, p);
    roller.rotation.y = now === 'dnFoamRoll' && (n.rolled !== undefined || P.roller) ? Math.PI / 2 : 0;
    if (now === 'dnFoamRoll' && n.rolled !== undefined && n.rolled !== 2) roller.rotation.x = t * 1.4;
    else roller.rotation.x = 0;
    const onBall = (n.ball ?? 0) > 0.5;
    ball1.position.set(onBall ? FC.sit[0] + 0.86 : 0.8, 0.07, onBall ? FC.sit[2] + 0.08 + 0.05 * Math.sin(t * 3) : -0.34);
    const bh = P.band;
    bandRest.visible = !bh;
    band.forEach((b) => (b.visible = !!bh));
    if (bh) {
      A.set(bh[0], bh[1], bh[2]);
      const lx = 0.05;
      const foot: V = [lx, 0.3, 0.85];
      B.set(foot[0], foot[1], foot[2]);
      for (const [i, sx] of [[0, 1], [1, -1]] as const) {
        const a = A.clone().add(tmp.set(sx * 0.03, 0, 0));
        const dir = B.clone().sub(a);
        band[i].position.copy(a).addScaledVector(dir, 0.5);
        band[i].scale.set(1, dir.length(), 1);
        band[i].quaternion.setFromUnitVectors(tmp.set(0, 1, 0), dir.normalize());
      }
    }
  });
  out.work = marker(g, 0.05, 0.05, 0.05);
}

// =============================================================================================
// 슈즈·의상 랙 (dnCostumeRack): a rail of costumes, a shelf of pointe shoes, a stool, a rosin tray, a tiny mirror.

function costume(g: THREE.Object3D, kind: number): THREE.Group {
  const c = group(g);
  part(c, cyl(0.004, 0.004, 0.34, 6), '#bdbdbd', 0, -0.03, 0, { rz: Math.PI / 2, outline: false });
  const body = ['#c2185b', '#ffffff', '#212121', '#6a1b9a', '#00897b'][kind % 5];
  part(c, rbox(0.3, 0.42, 0.08, 0.04), body, 0, -0.26, 0);
  if (kind % 5 === 1) {
    // A tutu: its stiff plate.
    part(c, cyl(0.32, 0.32, 0.05, 16), '#f8bbd0', 0, -0.46, 0);
    part(c, cyl(0.27, 0.27, 0.055, 16), '#fce4ec', 0, -0.46, 0, { outline: false });
  } else if (kind % 5 === 0) {
    part(c, cyl(0.15, 0.3, 0.42, 12), body, 0, -0.64, 0);
    for (let i = 0; i < 5; i++) part(c, ball(0.012), '#ffd740', -0.1 + i * 0.05, -0.24, 0.042, { outline: false });
  } else if (kind % 5 === 2) {
    part(c, box(0.3, 0.68, 0.08), '#212121', 0, -0.78, 0);
    part(c, box(0.02, 0.4, 0.086), '#ffd740', 0, -0.28, 0, { outline: false });
  } else {
    part(c, cyl(0.17, 0.25, 0.4, 12), body, 0, -0.64, 0);
  }
  return c;
}
function shoePair(g: THREE.Object3D, color = '#f8bbd0'): THREE.Group {
  const s = group(g);
  for (const sx of [-1, 1]) {
    part(s, rbox(0.06, 0.05, 0.2, 0.024), color, sx * 0.04, 0.025, 0);
    part(s, ball(0.03), color, sx * 0.04, 0.03, 0.09, { outline: false });
    part(s, box(0.01, 0.002, 0.14), '#f06292', sx * 0.04, 0.052, -0.02, { outline: false });
  }
  return s;
}
function costumeRack(g: THREE.Group, out: Built) {
  // The rail.
  for (const x of [-0.92, 0.92]) {
    part(g, cyl(0.022, 0.022, 1.82, 10), CHROME, x, 0.91, 0.02);
    part(g, box(0.06, 0.03, 0.56), '#37343a', x, 0.02, 0.02);
  }
  part(g, cyl(0.018, 0.018, 1.86, 10), CHROME, 0, 1.8, 0.02, { rz: Math.PI / 2 });
  const hung: THREE.Group[] = [];
  for (let i = 0; i < 6; i++) {
    const c = costume(g, i);
    place(c, [0.72 - i * 0.26, 1.78, 0.02]);
    c.rotation.y = 0.12 * (i % 2 ? 1 : -1) + Math.PI / 2 * 0.7;
    hung.push(c);
  }
  // Shelves below, the shoes in rows, tagged.
  part(g, box(1.7, 0.03, 0.34), '#a1887f', -0.1, 0.58, 0.2);
  for (const x of [-0.92, 0.72]) part(g, box(0.03, 0.56, 0.32), '#8d6e63', x, 0.28, 0.2);
  part(g, box(1.7, 0.03, 0.34), '#a1887f', -0.1, 0.22, 0.2);
  const shelved = [shoePair(g), shoePair(g, '#ffffff'), shoePair(g, '#ffe0b2')];
  const ph = [[-0.56, 0.6, 0.2], [-0.2, 0.6, 0.2], [0.14, 0.6, 0.2]] as V[];
  shelved.forEach((s, i) => place(s, ph[i]));
  for (let i = 0; i < 4; i++) {
    const s = shoePair(g, i % 2 ? '#212121' : '#d7ccc8');
    place(s, [-0.65 + i * 0.32, 0.24, 0.2]);
  }
  label(g, '토슈즈', 0.28, 0.07, -0.56, 0.5, 0.372, '#fafafa', ROSE);
  label(g, '의상 대여', 0.34, 0.08, 0.72, 1.92, 0.04, ROSE, '#ffffff');
  // The stool, the rosin tray, a little standing mirror.
  part(g, cyl(0.17, 0.17, 0.04, 14), '#ad1457', CR.stool[0], CR.stool[1] - 0.02, CR.stool[2]);
  part(g, cyl(0.022, 0.028, CR.stool[1] - 0.04, 8), CHROME, CR.stool[0], (CR.stool[1] - 0.04) / 2, CR.stool[2]);
  part(g, cyl(0.15, 0.15, 0.02, 12), '#37343a', CR.stool[0], 0.012, CR.stool[2]);
  part(g, box(0.36, 0.04, 0.26), '#6d4c41', CR.rosin[0], 0.02, CR.rosin[2]);
  const dust = part(g, box(0.32, 0.004, 0.22), '#fff3d6', CR.rosin[0], 0.042, CR.rosin[2], { outline: false });
  label(g, '송진', 0.14, 0.05, CR.rosin[0], 0.02, CR.rosin[2] + 0.132, '#6d4c41', '#fff3d6');
  part(g, box(0.05, 1.3, 0.05), '#37343a', CR.glass[0] - 0.0, 0.65, CR.glass[2] - 0.03);
  part(g, rbox(0.32, 0.72, 0.03, 0.01), CHROME, CR.glass[0], 1.3, CR.glass[2]);
  picture(g, glassTex(), 0.28, 0.68, CR.glass[0], 1.3, CR.glass[2] + 0.018);
  // What's taken up.
  const shoesHeld = shoePair(g);
  shoesHeld.visible = false;
  const shoeOne = group(g);
  part(shoeOne, rbox(0.06, 0.05, 0.2, 0.024), '#f8bbd0', 0, 0, 0);
  shoeOne.visible = false;
  const gown = costume(g, 0);
  gown.visible = false;
  const pinned = part(g, ball(0.01), CHROME, 0, 0, 0, { outline: false });
  pinned.visible = false;
  const spots: Record<string, Spot> = { dnTiePointe: standAt(g, 'dnShoes'), dnFitCostume: standAt(g, 'dnCostume') };
  spots['*'] = spots.dnTiePointe;
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const usingShoes = now === 'dnTiePointe' && !!P.shoes;
    shelved[0].visible = !usingShoes && !(now === 'dnTiePointe' && (n.worn ?? 0) > 0.05);
    shoesHeld.visible = usingShoes;
    if (P.shoes) place(shoesHeld, P.shoes);
    shoeOne.visible = !!P.shoeOne;
    if (P.shoeOne) {
      place(shoeOne, P.shoeOne);
      shoeOne.rotation.x = (n.flex ?? 0) * 4;
    }
    (dust.material as THREE.Material).visible = true;
    gown.visible = !!P.gown;
    hung[5].visible = !P.gown;
    if (P.gown) {
      place(gown, P.gown);
      gown.position.y += 0.1;
      gown.rotation.y = n.swish ?? 0;
    }
    hung.forEach((c, i) => {
      const push = n.push ?? 0;
      c.position.x = 0.72 - i * 0.26 - (now === 'dnFitCostume' ? 0.08 * Math.sin(push * Math.PI) * ((i % 3) - 1) : 0);
      c.rotation.z = now === 'dnFitCostume' ? 0.03 * Math.sin(t * 2 + i) : 0;
    });
    pinned.visible = !!P.pinned;
    if (P.pinned) place(pinned, P.pinned);
  });
  out.work = marker(g, -0.2, 0.6, 0.2);
}

// =============================================================================================
// 영상 리뷰 벤치 (dnVideoBench): a padded bench, a big screen on a cart showing the week's take; a colleague.

function videoBench(g: THREE.Group, out: Built) {
  // The screen at the back, on a cart.
  part(g, rbox(1.2, 0.72, 0.06, 0.015), BLACK, 0, 1.25, -0.4);
  const scr = swapPic(g, 1.12, 0.64, 0, 1.25, -0.365);
  const idle = () => painted('dnScreenIdle', 320, 182, (c) => {
    c.fillStyle = '#17202a';
    c.fillRect(0, 0, 320, 182);
    text(c, '이번 주 리허설 영상', 160, 80, 20, '#90a4ae', 'center');
    text(c, '▶ 재생', 160, 116, 16, '#546e7a', 'center');
  });
  scr.set(idle());
  const liveScr = live(320, 182);
  part(g, cyl(0.03, 0.03, 0.9, 8), '#37343a', 0, 0.46, -0.42);
  part(g, box(0.9, 0.04, 0.3), '#37343a', 0, 0.09, -0.4);
  for (const x of [-0.4, 0.4]) for (const z of [-0.5, -0.3]) part(g, ball(0.035), BLACK, x, 0.035, z);
  part(g, rbox(0.34, 0.1, 0.22, 0.015), '#546e7a', -0.2, 0.17, -0.4);
  // The bench: a long padded seat.
  part(g, rbox(1.84, 0.1, 0.42, 0.03), '#6a1b9a', 0, 0.4, 0.3);
  for (const x of [-0.8, 0.8]) part(g, box(0.05, 0.36, 0.34), '#37343a', x, 0.18, 0.3);
  part(g, cyl(0.04, 0.04, 0.5, 8), '#2b2b30', 0, 0.2, 0.3, { rx: 0 });
  const tablet = group(g);
  part(tablet, rbox(0.25, 0.012, 0.18, 0.008), BLACK, 0, 0, 0);
  const tabS = swapPic(tablet, 0.23, 0.165, 0, 0.0075, 0, 0, -Math.PI / 2);
  const tabLive = live(184, 132);
  const remote = group(g);
  part(remote, rbox(0.05, 0.02, 0.14, 0.008), BLACK, 0, 0, 0);
  const pen = pencil(g, '#c62828');
  pen.visible = false;
  // The colleague: on the other half of the bench.
  const mate = lazyFig(g, LOOKS.mate);
  const matePose = poser(mate);
  const spots: Record<string, Spot> = { dnVideoReview: standAt(g, 'dnVideo') };
  spots['*'] = spots.dnVideoReview;
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const v = n.v ?? 0;
    if (now && v > 0.5) {
      scr.set(liveScr((c) => {
        c.fillStyle = '#d7bf9b';
        c.fillRect(0, 100, 320, 82);
        c.fillStyle = '#e9edef';
        c.fillRect(0, 0, 320, 100);
        c.fillStyle = 'rgba(160,190,200,0.5)';
        for (let i = 0; i < 4; i++) c.fillRect(i * 84, 6, 78, 92);
        const u = v > 1.5 ? (n.vt ?? 0) : (n.vt ?? 0) + ((t * 0.2) % 0.6);
        stick(c, u * 2, 110, 36, 1.3, '#6a1b9a');
        stick(c, u * 2 + 0.02, 214, 40, 1.2, '#37474f');
        // The line drawn over the arm of the frozen frame.
        const d = n.drawn ?? 0;
        if (d > 0.02) {
          c.strokeStyle = '#ff1744';
          c.lineWidth = 3;
          c.beginPath();
          c.moveTo(62, 110);
          c.lineTo(62 + 96 * d, 110 - 62 * d);
          c.stroke();
          if (d > 0.8) text(c, '팔 더 높게!', 170, 40, 15, '#ff1744');
        }
        c.fillStyle = 'rgba(0,0,0,0.65)';
        c.fillRect(0, 164, 320, 18);
        c.fillStyle = ROSE;
        c.fillRect(4, 170, 312 * Math.min(1, u), 6);
        text(c, v > 1.5 ? '⏸ 2:14' : '▶ 2:14', 6, 155, 12, '#ffffff');
      }));
    } else scr.set(idle());
    const tb = P.tablet;
    tablet.visible = !!tb;
    if (tb) {
      place(tablet, tb);
      tabS.set(tabLive((c) => {
        c.fillStyle = PAPER;
        c.fillRect(0, 0, 184, 132);
        text(c, '수정 메모', 8, 12, 12, ROSE);
        stick(c, 0.55 * 2, 50, 26, 0.8, '#90a4ae');
        const d = n.drawn ?? 0;
        c.strokeStyle = '#ff1744';
        c.lineWidth = 2.5;
        c.beginPath();
        c.moveTo(22, 72);
        c.lineTo(22 + 60 * d, 72 - 30 * d);
        c.stroke();
        const w = n.written ?? 0;
        ['2:14 팔 높이', '4카운트 시선', '5번 동선 왼쪽'].forEach((s, i) => {
          if (w * 3 > i) text(c, s, 96, 40 + i * 24, 11, '#37474f');
        });
      }));
    }
    const rem = P.remote;
    place(remote, rem ?? VB.remote);
    pen.visible = !!P.pen;
    if (P.pen) place(pen, P.pen);
    if (now && N) {
      const m = n.mate ?? 0;
      const pose = m > 0.5 ? 'dnSeatClapA' : 'dnSeat';
      matePose(pose, t, VB.mate[0], 0, VB.mate[2] - 0.04, Math.PI);
    } else mate.hide();
  });
  out.work = marker(g, 0, 1.2, -0.3);
}

// =============================================================================================
// 리프트 매트 (dnLiftMat): a thick blue crash mat, a chalk bowl, the partner who's lifted.

function liftMat(g: THREE.Group, out: Built) {
  part(g, rbox(2.9, LM.top, 1.9, 0.05), '#1e6fb8', 0, LM.top / 2, 0);
  part(g, box(2.74, 0.004, 1.74), '#2980cf', 0, LM.top + 0.001, 0, { outline: false });
  for (const x of [-0.72, 0.72]) part(g, box(0.02, 0.003, 1.74), '#16588f', x, LM.top + 0.004, 0, { outline: false });
  label(g, '착지 매트', 0.56, 0.1, 0, 0.1, 0.96, '#1e6fb8', '#ffffff');
  flat(g, painted('dnMatX', 64, 64, (c) => {
    c.clearRect(0, 0, 64, 64);
    c.fillStyle = '#2980cf';
    c.fillRect(0, 0, 64, 64);
    c.strokeStyle = '#ffeb3b';
    c.lineWidth = 7;
    c.beginPath();
    c.moveTo(10, 10);
    c.lineTo(54, 54);
    c.moveTo(54, 10);
    c.lineTo(10, 54);
    c.stroke();
  }), 0.2, 0.2, LM.base[0], LM.top + 0.004, LM.base[2]);
  part(g, cyl(0.12, 0.09, 0.09, 12), '#90a4ae', 1.28, LM.top + 0.045, -0.78);
  part(g, cyl(0.1, 0.1, 0.004, 12), '#ffffff', 1.28, LM.top + 0.09, -0.78, { outline: false });
  const fig = lazyFig(g, LOOKS.partner);
  const pose = poser(fig);
  const spots: Record<string, Spot> = { dnPartnerLift: standAt(g, 'dnLift') };
  spots['*'] = spots.dnPartnerLift;
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    if (now && N && (n.partner ?? 0) > 0.5) pose(N.fig.p ?? 'dnReady', t, n.px ?? 0.7, n.py ?? LM.top, n.pz ?? LM.base[2], n.pyaw ?? -Math.PI / 2);
    else fig.hide();
  });
  out.work = marker(g, 0, LM.top + 1, 0);
}

// =============================================================================================
// The sprung floor (dnSprungFloor): walked on. Maple boards, taped marks for spacing, numbers along the edge.

function sprungFloor(g: THREE.Group, _out: Built, W: number, D: number) {
  const tex = painted(`dnFloor${W}x${D}`, Math.round(W * 64), Math.round(D * 64), (c) => {
    const w = W * 64;
    const h = D * 64;
    c.fillStyle = MAPLE;
    c.fillRect(0, 0, w, h);
    const r = seeded(5);
    for (let y = 0; y < h; y += 10) {
      c.fillStyle = `rgba(120,80,40,${0.03 + r() * 0.07})`;
      c.fillRect(0, y, w, 9);
      c.fillStyle = 'rgba(90,60,30,0.28)';
      c.fillRect(0, y + 9, w, 1);
      for (let x = r() * 60; x < w; x += 70 + r() * 90) c.fillRect(x, y, 1, 9);
    }
    // Scuffs from turns.
    c.strokeStyle = 'rgba(70,50,30,0.1)';
    for (let i = 0; i < 16; i++) {
      c.beginPath();
      c.arc(r() * w, r() * h, 6 + r() * 12, 0, 5);
      c.stroke();
    }
    // Centre line and the eighths along the front.
    c.fillStyle = '#e53935';
    c.fillRect(w / 2 - 1.5, 0, 3, h);
    c.fillStyle = 'rgba(250,250,250,0.85)';
    c.fillRect(0, h * 0.5, w, 2);
    for (let i = 0; i <= 8; i++) {
      const x = (i / 8) * w;
      c.fillStyle = '#fafafa';
      c.fillRect(x - 2, h - 20, 4, 20);
      c.fillRect(x - 2, 0, 4, 16);
      text(c, `${Math.abs(i - 4)}`, x + 7, h - 10, 12, '#fafafa');
    }
    // Spacing marks in coloured tape: a formation.
    const mark = (x: number, y: number, col: string) => {
      c.strokeStyle = col;
      c.lineWidth = 3.4;
      c.beginPath();
      c.moveTo(x - 8, y - 8);
      c.lineTo(x + 8, y + 8);
      c.moveTo(x + 8, y - 8);
      c.lineTo(x - 8, y + 8);
      c.stroke();
    };
    for (let i = 0; i < 5; i++) mark(w * (0.18 + i * 0.16), h * 0.3 + (i % 2) * h * 0.22, ['#ffeb3b', '#4fc3f7', '#ff7043', '#81c784', '#ba68c8'][i]);
  });
  flat(g, tex, W, D, 0, 0.006, 0);
}

// =============================================================================================
// The lobby's pieces (2026-11-05, the layout audit): the timetable board, the shoe cubbies, the A-frame on the pavement.

/** 수업 시간표 게시판 (dnTimetable, 2 × 1): a cork board on the wall, the week's classes in a grid, notices pinned beside. */
function timetable(g: THREE.Group) {
  part(g, box(1.8, 1.0, 0.04), WOOD, 0, 1.45, -0.46);
  picture(g, painted('dnTimetable', 512, 280, (c) => {
    c.fillStyle = '#f6efe3';
    c.fillRect(0, 0, 512, 280);
    c.fillStyle = ROSE;
    c.fillRect(0, 0, 512, 44);
    text(c, '무브온 댄스 스튜디오 · 수업 시간표', 256, 30, 24, '#ffffff', 'center');
    const days = ['월', '화', '수', '목', '금', '토'];
    const rows = ['10:00 발레 기초', '14:00 키즈 방송댄스', '17:00 입시 현대무용', '19:30 K-POP 취미반', '21:00 걸스힙합'];
    days.forEach((d, i) => text(c, d, 190 + i * 52, 70, 18, '#4a148c', 'center'));
    rows.forEach((r, j) => {
      text(c, r, 12, 104 + j * 36, 17, '#3e2723', 'left', false);
      days.forEach((_, i) => {
        if ((i + j) % 3 === 0 || (j === 3 && i < 5)) {
          c.fillStyle = ['#f8bbd0', '#d1c4e9', '#b3e5fc', '#ffe0b2', '#c8e6c9'][j];
          c.fillRect(170 + i * 52, 88 + j * 36, 40, 24);
        }
      });
    });
  }), 1.4, 0.76, -0.16, 1.45, -0.435);
  // Two notices pinned at the right.
  picture(g, painted('dnNotice', 128, 170, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 128, 170);
    text(c, '공지', 64, 30, 22, ROSE, 'center');
    text(c, '이번 달', 64, 70, 16, '#3e2723', 'center', false);
    text(c, '쇼케이스', 64, 94, 16, '#3e2723', 'center', false);
    text(c, '마지막 토요일', 64, 118, 16, '#3e2723', 'center', false);
    text(c, '신청은 데스크', 64, 150, 14, '#6a1b9a', 'center', false);
  }), 0.3, 0.4, 0.74, 1.5, -0.434);
}

/** 신발장 (dnShoeRack, 2 × 1): an open cubby shelf against the wall, street shoes in some, a bench before it. */
function shoeRack(g: THREE.Group) {
  const W = 1.84;
  part(g, rbox(W, 1.0, 0.36, 0.01), '#a1887f', 0, 0.5, -0.28);
  const r = seeded(31);
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 6; col++) {
      const x = -W / 2 + 0.16 + col * 0.305;
      const y = 0.17 + row * 0.31;
      part(g, box(0.27, 0.27, 0.02), '#6d4c41', x, y + 0.02, -0.11, { outline: false });
      if (r() < 0.55) for (const s of [-1, 1]) part(g, rbox(0.09, 0.07, 0.22, 0.03), ['#212121', '#eceff1', '#8d6e63', '#c62828'][Math.floor(r() * 4)], x + s * 0.055, y - 0.07, -0.18);
    }
  // The low bench to sit on and change shoes.
  part(g, rbox(W - 0.1, 0.06, 0.3, 0.02), MAPLE, 0, 0.42, 0.2);
  for (const sx of [-1, 1]) part(g, box(0.05, 0.4, 0.26), WOOD, sx * (W / 2 - 0.15), 0.2, 0.2);
}

/** 댄스 스튜디오 입간판 (dnStreetSign, 1 × 1): the A-frame by the door with the studio's name and classes. */
function streetSign(g: THREE.Group) {
  const tex = painted('dnStreetSign', 192, 320, (c) => {
    c.fillStyle = '#2a1430';
    c.fillRect(0, 0, 192, 320);
    c.fillStyle = ROSE;
    c.fillRect(0, 96, 192, 6);
    text(c, '무브온', 96, 50, 40, '#ffffff', 'center');
    text(c, '댄스 스튜디오', 96, 84, 24, '#f8bbd0', 'center');
    text(c, '발레 · 현대무용', 96, 140, 20, '#ffffff', 'center', false);
    text(c, 'K-POP · 힙합', 96, 170, 20, '#ffffff', 'center', false);
    text(c, '입시반 · 취미반', 96, 200, 20, '#ffffff', 'center', false);
    text(c, '체험 레슨 환영', 96, 250, 22, '#ffe082', 'center');
    text(c, '수강 상담 ▶ 안으로', 96, 290, 18, '#f8bbd0', 'center', false);
  });
  for (const s of [-1, 1]) {
    const leaf = new THREE.Group();
    leaf.rotation.x = s * 0.16;
    g.add(leaf);
    part(leaf, rbox(0.5, 0.92, 0.03, 0.01), '#2a1430', 0, 0.5, s * 0.08);
    picture(leaf, tex, 0.44, 0.8, 0, 0.52, s * 0.08 + s * 0.02, '#ffffff', s > 0 ? 0 : Math.PI);
  }
}

export const BUILDERS: Record<string, Builder> = {
  danceMirror(g, _W, _D, _c, _def, _ctx, out) {
    danceMirror(g, out);
  },
  balletBarre(g, _W, _D, _c, _def, _ctx, out) {
    balletBarre(g, out);
  },
  performStage(g, _W, _D, _c, _def, _ctx, out) {
    performStage(g, out);
  },
  dnShowcaseRiser(g, _W, _D, _c, _def, _ctx, out) {
    performStage(g, out, true);
  },
  dnTimetable(g) {
    timetable(g);
  },
  dnShoeRack(g) {
    shoeRack(g);
  },
  dnStreetSign(g) {
    streetSign(g);
  },
  dnHouseSeats(g, W, _D, _c, _def, _ctx, out) {
    houseSeats(g, out, W);
  },
  dnSoundDesk(g, _W, _D, _c, _def, _ctx, out) {
    soundDesk(g, out);
  },
  dnStretchCorner(g, _W, _D, _c, _def, _ctx, out) {
    stretchCorner(g, out);
  },
  dnCostumeRack(g, _W, _D, _c, _def, _ctx, out) {
    costumeRack(g, out);
  },
  dnVideoBench(g, _W, _D, _c, _def, _ctx, out) {
    videoBench(g, out);
  },
  dnLiftMat(g, _W, _D, _c, _def, _ctx, out) {
    liftMat(g, out);
  },
  dnSprungFloor(g, W, D, _c, _def, _ctx, out) {
    sprungFloor(g, out, W, D);
  },
};
