import * as THREE from 'three';
import { marker, rod, shade, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox, textured } from '../toon';
import { BLACK, CHROME, STEEL, label, painted, picture, text } from './doctor';
import { BT, GR, GS, GT, HB, IN, PL, PP, SB, SP, plasmaPath, wdNow, wdPhase } from './welderMotion';
import type { WdMotion, WdNow } from './welderMotion';
import { vroidFigure, type FigureOptions } from './vroidFigure';

/**
 * The 조선소 용접장 drawn as itself (2026-11-01 workplace pipeline, at the user's request): the welding shop of a
 * shipyard, the made-up 푸른돛조선, on a concrete yard with its walkways painted. At the back a hull block on its
 * stands with staging against it, a gantry crane with a plate on its chain and the safety board; in the middle the
 * welding booths with their curtains, the welding machine with its cylinders chained up and the plasma table; in
 * front the plates to burn, a grinding stand and the inspection cart; the protective gear's lockers on the office wall.
 *
 * Everything that moves follows the scripts in welderMotion.ts, and other people are played by VRoid bodies where
 * there are any (vroidFigure.ts). The arc only strikes with the mask down: sparks fly, the curtains light up, and a
 * bead grows behind the torch. The yard, the block's numbers and the brands are all made up.
 */

const BRAND = '푸른돛조선';
const PRIMER = '#8e3b2a';
const PRIMER_D = '#6e2c20';
const HULL = '#27506b';
const PLATE = '#7d8b92';
const PLATE_D = '#5d6a71';
const FRAME = '#4a565e';
const YELLOW = '#f9a825';
const ORANGE = '#ef6c00';
const INK = '#263238';
const RED = '#c62828';
const PAPER = '#fbfaf6';
const SKIN = '#f1c9a5';
const BEAD_C = '#b9c2c7';
const SLAG = '#3c3f41';
const LEATHER = '#a56a3a';
const CHALK = '#f5f0d8';
const UP = new THREE.Vector3(0, 1, 0);
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
/** At the script's place while it says so, hidden or at home otherwise. */
function at(m: THREE.Object3D, p: V | null | undefined, home?: V) {
  m.visible = !!(p ?? home);
  if (p) place(m, p);
  else if (home) place(m, home);
}
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
function standAt(g: THREE.Object3D, motion: WdMotion, z = 0.6): Spot {
  const s = spot(g, 'stand', 0, 0, z, Math.PI);
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
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, show: (now: string | null, N: WdNow | null, t: number) => void) {
  out.spots = spots;
  out.away = (_gone, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const N = sp ? wdNow(sp.motion as WdMotion, t, wdPhase(g.getWorldPosition(tmp)), (sp.at.userData.height as number | undefined) ?? 1.6) : null;
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
/** A shower of hot sparks from a place: they fly out, fall and go out, each on its own loop. */
function sparks(g: THREE.Object3D, n: number, size = 0.011) {
  const mat = new THREE.MeshBasicMaterial({ color: '#ffd180' });
  const list = Array.from({ length: n }, (_, i) => {
    const m = new THREE.Mesh(ball(size * (0.7 + (i % 3) * 0.3)), mat);
    m.userData.ownMaterial = true;
    m.visible = false;
    g.add(m);
    return m;
  });
  return (on: number, x: number, y: number, z: number, t: number, vx = 0, vz = 0.3, up = 0.7, wide = 0.5) => {
    list.forEach((m, i) => {
      m.visible = on > 0.05;
      if (!m.visible) return;
      const speed = 1.3 + ((i * 37) % 10) * 0.08;
      const u = (t * speed + i * 0.613) % 1;
      const a = i * 2.399;
      const fall = y + (up * (0.6 + 0.4 * Math.cos(a * 3))) * u - 1.5 * u * u;
      m.position.set(x + (vx + wide * Math.cos(a)) * u, Math.max(0.02, fall), z + (vz + wide * Math.sin(a) * 0.7) * u);
      m.scale.setScalar(1 - u * 0.75);
    });
  };
}
/** The arc itself: a hard white point and a haze of light round it, which flicker. */
function arcLight(g: THREE.Object3D, haze = 0.2, tint = '#bfe3ff') {
  const core = ownLit(g, ball(0.02), '#ffffff', 0, 0, 0);
  const mat = new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const halo = new THREE.Mesh(ball(haze), mat);
  halo.userData.ownMaterial = true;
  g.add(halo);
  core.visible = halo.visible = false;
  return (p: V | null | undefined, t: number) => {
    core.visible = halo.visible = !!p;
    if (!p) return;
    place(core, p);
    place(halo, p);
    const f = 0.7 + 0.3 * Math.sin(t * 61) * Math.sin(t * 37);
    core.scale.setScalar(0.8 + f * 0.6);
    halo.scale.setScalar(0.8 + f * 0.4);
    mat.opacity = 0.42 * f;
  };
}
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
/** A hose or cable from a fixed place to something that moves, sagging in the middle. */
function hose(g: THREE.Object3D, from: V, r: number, color: string, sag = 0.3): (to: V) => void {
  const a = limb(g, r, color);
  const b = limb(g, r, color);
  const c = limb(g, r, color);
  const p0 = v3(from[0], from[1], from[2]);
  const p1 = new THREE.Vector3();
  const p2 = new THREE.Vector3();
  const p3 = new THREE.Vector3();
  return (to) => {
    p3.set(to[0], to[1], to[2]);
    p1.lerpVectors(p0, p3, 0.33);
    p1.y -= sag;
    p2.lerpVectors(p0, p3, 0.67);
    p2.y -= sag * 0.8;
    a(p0, p1);
    b(p1, p2);
    c(p2, p3);
  };
}
/** A trestle a plate rests on. */
function trestle(g: THREE.Object3D, x: number, y: number, z: number, w: number) {
  for (const s of [-1, 1]) {
    part(g, box(0.07, y, 0.07), FRAME, x + (s * w) / 2, y / 2, z - 0.28);
    part(g, box(0.07, y, 0.07), FRAME, x + (s * w) / 2, y / 2, z + 0.28);
    part(g, box(0.08, 0.05, 0.66), YELLOW, x + (s * w) / 2, y, z);
  }
}
/** A spray can on a tray. */
function canMesh(g: THREE.Object3D, color: string, name: string): THREE.Group {
  const m = group(g);
  part(m, cyl(0.026, 0.026, 0.13, 12), color, 0, 0, 0);
  part(m, cyl(0.012, 0.018, 0.024, 10), '#eceff1', 0, 0.076, 0, { outline: false });
  label(m, name, 0.044, 0.05, 0, 0, 0.0265, '#ffffff', INK);
  return m;
}
function clipMesh(g: THREE.Object3D, tex: THREE.Texture, w = 0.2, h = 0.27): THREE.Group {
  const root = group(g);
  const tilt = group(root);
  tilt.rotation.x = -0.75;
  part(tilt, box(w + 0.02, h + 0.02, 0.008), '#6d4c41', 0, 0, 0, { outline: false });
  picture(tilt, tex, w, h, 0, -0.005, 0.006);
  part(tilt, box(0.07, 0.022, 0.012), CHROME, 0, h / 2 - 0.005, 0.01, { outline: false });
  return root;
}
const sheetTex = (title: string, rows: string[]) =>
  painted(`wd-sheet-${title}`, 128, 172, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 128, 172);
    text(c, title, 64, 18, 14, INK, 'center');
    rows.forEach((s, i) => {
      text(c, s, 8, 48 + i * 22, 11, INK);
      c.strokeStyle = '#2e7d32';
      c.lineWidth = 2;
      c.strokeRect(108, 38 + i * 22, 12, 12);
    });
  });
const CLIP = () => sheetTex('점검표', ['가스 압력', '호스 이음', '전류 설정', '접지 상태', '소화기']);

/** The welding mask: a band round the head and a dark shield that hinges at its sides. Its origin is the head's middle. */
interface Mask {
  root: THREE.Group;
  visor: THREE.Group;
  lens: THREE.Mesh;
}
function maskMesh(g: THREE.Object3D, clear = false): Mask {
  const root = group(g);
  const band = part(root, new THREE.TorusGeometry(0.128, 0.012, 6, 22), BLACK, 0, 0.055, 0, { rx: Math.PI / 2, outline: false });
  band.userData.ownGeometry = true;
  const over = part(root, new THREE.TorusGeometry(0.128, 0.01, 6, 22, Math.PI), BLACK, 0, 0.055, 0, { outline: false });
  over.userData.ownGeometry = true;
  for (const sx of [-1, 1]) part(root, cyl(0.022, 0.022, 0.014, 10), '#546e7a', sx * 0.132, 0.03, 0, { rz: Math.PI / 2, outline: false });
  const visor = group(root, 0, 0.03, 0);
  if (clear) {
    const mat = new THREE.MeshBasicMaterial({ color: '#d7f0f7', transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide });
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.3), mat);
    sh.userData.ownGeometry = sh.userData.ownMaterial = true;
    sh.position.set(0, -0.05, 0.145);
    visor.add(sh);
    part(visor, box(0.3, 0.03, 0.03), BLACK, 0, 0.11, 0.135, { outline: false });
    return { root, visor, lens: sh };
  }
  part(visor, rbox(0.27, 0.31, 0.025, 0.02), '#2f3438', 0, -0.05, 0.142);
  for (const sx of [-1, 1]) part(visor, box(0.015, 0.25, 0.13), '#2f3438', sx * 0.133, -0.05, 0.075);
  part(visor, box(0.27, 0.02, 0.1), '#2f3438', 0, -0.2, 0.09, { outline: false });
  part(visor, box(0.14, 0.075, 0.008), '#111518', 0, -0.015, 0.157, { outline: false });
  // Its one wide window is the only thing on its front, so it doesn't read as a face.
  const lens = ownLit(visor, box(0.115, 0.05, 0.004), '#21313a', 0, -0.015, 0.162);
  part(visor, box(0.09, 0.02, 0.006), YELLOW, 0, -0.145, 0.157, { outline: false });
  return { root, visor, lens };
}
/** Where the script has the mask, or on its hook. */
function showMask(m: Mask, P: Record<string, V | null>, n: Record<string, number>, home: V) {
  at(m.root, P.mask, home);
  const on = n.maskOn ?? 0;
  m.root.rotation.set((n.maskTilt ?? 0), (n.maskYaw ?? 0) * on, 0, 'YXZ');
  m.visor.rotation.x = -1.28 * (1 - (n.visor ?? 0)) * (on > 0.02 ? 1 : 0.4);
}
/** The torch: its tip at the origin, the gooseneck and handle coming back up towards the dweller's hand. */
function torchMesh(g: THREE.Object3D): THREE.Group {
  const m = group(g);
  part(m, cyl(0.014, 0.008, 0.05, 10), CHROME, 0, 0.022, 0.01, { rx: 0.4, outline: false });
  rod(m, v3(0, 0.045, 0.02), v3(0.01, 0.1, 0.1), 0.012, BLACK);
  part(m, cyl(0.016, 0.016, 0.14, 10), BLACK, 0.02, 0.125, 0.17, { rx: 1.2 });
  part(m, box(0.012, 0.025, 0.02), RED, 0.02, 0.1, 0.17, { outline: false });
  return m;
}
/** The gas cutting torch: longer, with its two valves. */
function cutTorchMesh(g: THREE.Object3D): THREE.Group {
  const m = group(g);
  part(m, cyl(0.009, 0.006, 0.05, 10), '#c9a13b', 0, 0.025, 0, { outline: false });
  rod(m, v3(0, 0.05, 0), v3(0.01, 0.11, 0.1), 0.009, '#c9a13b');
  part(m, cyl(0.016, 0.016, 0.2, 10), '#c9a13b', 0.02, 0.14, 0.2, { rx: 1.2 });
  for (const s of [-1, 1]) part(m, cyl(0.014, 0.014, 0.018, 10), s > 0 ? RED : '#2e7d32', 0.02 + s * 0.022, 0.135, 0.23, { rz: Math.PI / 2, outline: false });
  return m;
}
function hammerMesh(g: THREE.Object3D): THREE.Group {
  const m = group(g);
  part(m, box(0.13, 0.024, 0.024), STEEL, 0, 0, 0);
  rod(m, v3(0, 0, 0), v3(0.02, 0.05, 0.14), 0.009, '#6d4c41');
  return m;
}
function brushMesh(g: THREE.Object3D): THREE.Group {
  const m = group(g);
  part(m, box(0.13, 0.016, 0.035), '#8d6e63', 0, 0.02, 0.015);
  part(m, box(0.12, 0.018, 0.03), STEEL, 0, 0.004, 0.015, { outline: false });
  rod(m, v3(0, 0.02, 0.03), v3(0.015, 0.05, 0.16), 0.009, '#8d6e63');
  return m;
}
function angleGrinder(g: THREE.Object3D): { root: THREE.Group; disc: THREE.Mesh } {
  const root = group(g);
  const disc = part(root, cyl(0.06, 0.06, 0.006, 16), '#6d7276', 0, -0.05, 0, { outline: false });
  part(root, cyl(0.016, 0.016, 0.006, 8), STEEL, 0.03, -0.046, 0, { outline: false });
  part(root, cyl(0.03, 0.03, 0.05, 10), '#37474f', 0, -0.018, 0);
  part(root, cyl(0.075, 0.075, 0.01, 16, ), ORANGE, 0, -0.04, -0.018, { outline: false });
  part(root, cyl(0.026, 0.03, 0.18, 12), '#1b6ca8', 0.1, 0.005, 0, { rz: Math.PI / 2 });
  rod(root, v3(-0.02, 0, 0), v3(-0.11, 0.06, 0.06), 0.012, BLACK);
  return { root, disc };
}
/** A steel plate with a chalk number, its origin at the middle of its top. */
function plateMesh(g: THREE.Object3D, w: number, d: number, color = PLATE, t = 0.025): THREE.Group {
  const m = group(g);
  part(m, box(w, t, d), color, 0, -t / 2, 0);
  return m;
}

// ---------------------------------------------------------------------------------------------
// Other people: drawn, played by VRoid bodies when they've come. All in the yard's workwear with a hard hat on.

interface Look {
  top: string;
  bottom: string;
  hair: string;
  hat: string;
  skin?: string;
}
const LOOKS: Record<string, Look> = {
  chief: { top: '#37474f', bottom: '#263238', hair: '#444444', hat: '#fafafa', skin: '#eac09a' },
  foreman: { top: '#ff7043', bottom: '#3e4a50', hair: '#2b1b10', hat: '#fdd835' },
  mate: { top: '#546e7a', bottom: '#37474f', hair: '#1a1a1a', hat: '#fdd835', skin: '#eac09a' },
  watcher: { top: '#c62828', bottom: '#37474f', hair: '#3b2a18', hat: RED },
};
interface Fig {
  root: THREE.Group;
  head: THREE.Group;
  armL(to: THREE.Vector3 | null): void;
  armR(to: THREE.Vector3 | null): void;
  opts: FigureOptions;
}
function person(parent: THREE.Object3D, look: Look, x: number, z: number, ry: number, gender?: 'female' | 'male'): Fig {
  const root = group(parent, x, 0, z, ry);
  const skin = look.skin ?? SKIN;
  for (const sx of [-1, 1]) {
    rod(root, v3(sx * 0.085, 0.84, 0), v3(sx * 0.09, 0.08, 0.01), 0.056, look.bottom);
    part(root, rbox(0.09, 0.07, 0.2, 0.03), '#37474f', sx * 0.09, 0.035, 0.04);
  }
  part(root, rbox(0.3, 0.17, 0.2, 0.06), look.bottom, 0, 0.88, 0);
  part(root, rbox(0.34, 0.46, 0.21, 0.08), look.top, 0, 1.11, 0);
  part(root, cyl(0.045, 0.05, 0.08, 10), skin, 0, 1.37, 0, { outline: false });
  const head = group(root, 0, 1.51, 0);
  part(head, ball(0.112), skin, 0, 0, 0);
  for (const sx of [-1, 1]) part(head, ball(0.012), '#2b2b30', sx * 0.04, 0, 0.104, { outline: false });
  part(head, box(0.03, 0.006, 0.004), '#a1665e', 0, -0.045, 0.104, { outline: false });
  part(head, ball(0.118), look.hair, 0, 0.03, -0.03);
  const arm = (sx: number) => {
    const shoulder = v3(sx * 0.2, 1.31, 0);
    const rest = v3(sx * 0.23, 0.82, 0.05);
    const upper = limb(root, 0.042, look.top);
    const lower = limb(root, 0.035, skin);
    const hand = part(root, ball(0.036), skin, 0, 0, 0, { outline: false });
    const loc = new THREE.Vector3();
    const elbow = new THREE.Vector3();
    const d = new THREE.Vector3();
    const bend = new THREE.Vector3();
    return (to: THREE.Vector3 | null) => {
      if (to) loc.copy(to).sub(root.position).applyAxisAngle(UP, -root.rotation.y);
      else loc.copy(rest);
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
  const opts: FigureOptions = { gender };
  // `nod` is read off these options every frame.
  const f = vroidFigure({ root, head, armL, armR }, opts);
  // The hard hat goes on after, so it stays when a body takes over from the drawn head.
  const shell = new THREE.SphereGeometry(0.128, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  const hat = part(head, shell, look.hat, 0, 0.05, -0.008);
  hat.userData.ownGeometry = true;
  part(head, cyl(0.138, 0.138, 0.012, 20), look.hat, 0, 0.052, -0.008, { outline: false });
  part(head, box(0.14, 0.012, 0.05), look.hat, 0, 0.05, 0.135, { outline: false });
  root.visible = false;
  return { ...f, opts };
}

// =============================================================================================
// 용접 부스 (weldingBooth, 2 × 1).

function booth(g: THREE.Group, out: Built) {
  // The bay: a steel frame, a grey screen at the back, orange curtains down both sides, a fume hood on its arm.
  for (const x of [-0.97, 0.97]) for (const z of [-0.44, 0.44]) part(g, box(0.05, 2.14, 0.05), FRAME, x, 1.07, z);
  part(g, box(2, 0.05, 0.05), FRAME, 0, 2.14, -0.44);
  part(g, box(2, 0.05, 0.05), FRAME, 0, 2.14, 0.44);
  for (const x of [-0.97, 0.97]) part(g, box(0.05, 0.05, 0.9), FRAME, x, 2.14, 0);
  part(g, box(1.9, 2.04, 0.03), '#6f7b82', 0, 1.05, -0.46);
  label(g, '차광막 내리고 용접', 0.74, 0.1, 0, 1.94, -0.44, YELLOW, INK);
  label(g, `${BRAND} 용접 부스`, 0.5, 0.07, -0.56, 1.7, -0.44, INK, '#ffffff');
  picture(g, painted('wd-rule', 160, 200, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 160, 200);
    text(c, '용접 절차서', 80, 22, 16, INK, 'center');
    [['전류', '180 A'], ['전압', '26 V'], ['가스', 'CO₂ 18 L'], ['각장', '6 mm'], ['예열', '없음']].forEach(([a, b], i) => {
      text(c, a, 14, 60 + i * 26, 14, INK);
      text(c, b, 148, 60 + i * 26, 14, '#c62828', 'right');
    });
  }), 0.3, 0.38, 0.62, 1.55, -0.44);
  // The curtains: strips that light up with the arc on them.
  const curtain = new THREE.MeshBasicMaterial({ color: '#c75a12', transparent: true, opacity: 0.74, side: THREE.DoubleSide, depthWrite: false });
  const strip = (x: number, z: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.155, 2.0), curtain);
    m.userData.ownGeometry = m.userData.ownMaterial = true;
    m.position.set(x, 1.06, z);
    m.rotation.y = Math.PI / 2 + (((z * 37) | 0) % 2 ? 0.07 : -0.07);
    g.add(m);
  };
  for (const x of [-0.95, 0.95]) for (let i = 0; i < 5; i++) strip(x, -0.38 + i * 0.145);
  // A curtain's rest, gathered at the front post.
  for (const x of [-0.93, 0.93]) part(g, cyl(0.05, 0.06, 1.98, 10), '#b75210', x, 1.07, 0.4, { outline: false });
  // The hood over the work, its hose going up and away.
  const hood = group(g, 0.16, 1.72, -0.06);
  part(hood, cyl(0.11, 0.19, 0.14, 16), '#90a4ae', 0, 0, 0);
  rod(g, v3(0.16, 1.78, -0.06), v3(0.42, 2.1, -0.38), 0.05, '#546e7a');
  // The table: heavy steel, with its slag tray beneath and a coupon rack on the wall.
  for (const x of [-0.6, 0.6]) for (const z of [-0.26, 0.3]) part(g, box(0.07, BT.top, 0.07), FRAME, x, BT.top / 2, z);
  part(g, box(1.3, 0.05, 0.66), '#5d686f', 0, BT.top - 0.025, 0.02);
  part(g, box(1.14, 0.03, 0.5), '#3f464b', 0, 0.26, 0.02);
  for (let i = 0; i < 7; i++) part(g, ball(0.012 + (i % 3) * 0.004), '#20262a', -0.42 + i * 0.14, 0.285, -0.1 + ((i * 53) % 30) * 0.01, { outline: false });
  const rack = group(g, -0.42, 1.24, -0.43);
  part(rack, box(0.5, 0.02, 0.05), FRAME, 0, -0.1, 0.02);
  for (let i = 0; i < 4; i++) {
    part(rack, box(0.1, 0.17, 0.008), PLATE, -0.18 + i * 0.12, -0.01, 0.02);
    part(rack, box(0.012, 0.15, 0.012), BEAD_C, -0.18 + i * 0.12, -0.01, 0.03, { outline: false });
  }
  label(g, '합격 시편', 0.24, 0.05, -0.42, 1.05, -0.42, '#ffffff', INK);
  // The earth clamp on the table's edge and its cable.
  part(g, box(0.06, 0.04, 0.08), '#212121', -0.56, BT.top + 0.02, -0.2);
  rod(g, v3(-0.58, BT.top + 0.02, -0.22), v3(-0.9, 0.08, -0.32), 0.012, BLACK);
  // The wire feeder at the right, its spool turning.
  part(g, rbox(0.34, 0.22, 0.3, 0.02), '#2e7d32', 0.78, 1.0, -0.22);
  const spool = group(g, 0.78, 1.0, -0.06);
  part(spool, cyl(0.09, 0.09, 0.02, 14), '#b0bec5', 0, 0, 0, { rx: Math.PI / 2 });
  part(spool, box(0.02, 0.14, 0.024), '#546e7a', 0, 0, 0);
  part(g, box(0.34, 0.03, 0.34), FRAME, 0.78, 0.875, -0.2);
  part(g, box(0.05, 0.86, 0.05), FRAME, 0.78, 0.43, -0.3);
  // Home for the mask, the torch and the hand tools.
  part(g, box(0.02, 0.02, 0.2), STEEL, BT.hook[0], BT.hook[1] + 0.13, BT.hook[2] - 0.08, { outline: false });
  rod(g, v3(-0.94, BT.hook[1] + 0.13, BT.hook[2] - 0.08), v3(BT.hook[0], BT.hook[1] + 0.13, BT.hook[2] - 0.08), 0.008, STEEL);
  part(g, box(0.05, 0.07, 0.05), BLACK, BT.torch[0], BT.torch[1] - 0.04, BT.torch[2]);
  part(g, box(0.04, 0.2, 0.04), FRAME, BT.torch[0], BT.top + 0.0 + 0.02, BT.torch[2] - 0.12);
  const mask = maskMesh(g);
  const tool = torchMesh(g);
  const hammer = hammerMesh(g);
  const brush = brushMesh(g);
  const grinder = angleGrinder(g);
  const cable = hose(g, [0.7, 1.03, -0.1], 0.013, BLACK, 0.2);
  // The sheet from the supervisor.
  const order = group(g);
  picture(order, painted('wd-order', 128, 90, (c) => {
    c.fillStyle = '#fff3e0';
    c.fillRect(0, 0, 128, 90);
    text(c, '긴급 보수 지시', 64, 20, 14, RED, 'center');
    text(c, '진수 전 필수', 64, 44, 12, INK, 'center');
    text(c, '좌현 B-207 균열', 64, 66, 11, INK, 'center');
  }), 0.2, 0.14, 0, 0, 0, '#ffffff', 0, -0.7);
  // The work, in three forms: a T-joint, a practice coupon, a cracked repair plate. A strip of bead along each.
  const clamps = (m: THREE.Group, w: number) => {
    for (const s of [-1, 1]) {
      part(m, box(0.05, 0.1, 0.04), RED, (s * w) / 2, 0.01, -0.12);
      part(m, cyl(0.009, 0.009, 0.12, 8), STEEL, (s * w) / 2, 0.02, -0.08, { rx: Math.PI / 2, outline: false });
    }
  };
  const tee = group(g, 0, BT.y, BT.z);
  place(plateMesh(tee, 0.78, 0.3), [0, -0.012, 0.02]);
  part(tee, box(0.78, 0.12, 0.02), PLATE_D, 0, 0.05, -0.02);
  clamps(tee, 0.74);
  const teeBead = part(tee, cyl(0.014, 0.014, 1, 8), BEAD_C, 0, 0.002, 0, { rz: Math.PI / 2, outline: false });
  const teeSlag = part(tee, cyl(0.016, 0.016, 1, 8), SLAG, 0, 0.003, 0, { rz: Math.PI / 2, outline: false });
  const coupon = group(g, 0, BT.y, BT.z);
  place(plateMesh(coupon, 0.78, 0.3, '#8a979d'), [0, -0.012, 0]);
  clamps(coupon, 0.74);
  part(coupon, box(0.76, 0.004, 0.006), CHALK, 0, 0.002, BT.rows[0] - 0.03, { outline: false });
  const rows = BT.rows.map((z, i) => {
    const m = part(coupon, cyl(0.012, 0.012, 1, 8), BEAD_C, 0, 0.002, z, { rz: Math.PI / 2, outline: false });
    // The first row was the wobbly one.
    if (i === 0) m.scale.z = 1.15;
    return m;
  });
  const repair = group(g, 0, BT.y, BT.z);
  place(plateMesh(repair, 0.78, 0.3, PRIMER), [0, -0.012, 0]);
  clamps(repair, 0.74);
  label(repair, '보수', 0.12, 0.05, -0.3, 0.003, 0.1, YELLOW, INK).rotation.x = -Math.PI / 2;
  const crack = part(repair, box(0.62, 0.003, 0.006), '#101214', BT.x0 + 0.31, 0.002, 0, { ry: 0.03, outline: false });
  const gouge = part(repair, box(1, 0.004, 0.022), '#c4c7c2', 0, 0.002, 0, { outline: false });
  const repairBead = part(repair, cyl(0.016, 0.016, 1, 8), BEAD_C, 0, 0.002, 0, { rz: Math.PI / 2, outline: false });
  // The beacon on top for the emergency, and what's going off when the arc is on.
  const beacon = ownLit(g, cyl(0.055, 0.06, 0.1, 12), '#5a1414', 0.86, 2.22, 0.44);
  const spark = sparks(g, 18);
  const flakes = sparks(g, 6, 0.009);
  const arc = arcLight(g);
  const bossFig = person(g, LOOKS.foreman, BT.by[0], BT.by[1], 0.95 * Math.PI * 0.6, 'male');
  const superFig = person(g, LOOKS.chief, BT.by[0], BT.by[1], 0.95 * Math.PI * 0.6, 'male');
  const spots: Record<string, Spot> = { weldSeam: standAt(g, 'wdWeld'), welder_practiceBead: standAt(g, 'wdBead'), urgentWeld: standAt(g, 'wdUrgent') };
  spots['*'] = spots.weldSeam;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    showMask(mask, P, n, BT.hook);
    at(tool, P.torch, BT.torch);
    cable(P.torch ? [(P.torch as V)[0] + 0.02, (P.torch as V)[1] + 0.13, (P.torch as V)[2] + 0.24] : [BT.torch[0] + 0.02, BT.torch[1] + 0.13, BT.torch[2] + 0.24]);
    at(hammer, P.hammer, BT.hammer);
    at(brush, P.brush, BT.brush);
    at(grinder.root, P.grinder);
    grinder.disc.rotation.y = t * 30;
    at(order, P.order);
    // Which piece of work is on the table.
    const mode = now === 'welder_practiceBead' ? 1 : now === 'urgentWeld' ? 2 : 0;
    tee.visible = mode === 0;
    coupon.visible = mode === 1;
    repair.visible = mode === 2;
    // A bead between the two ends, as long as it's got.
    const lay = (m: THREE.Mesh, e: number) => {
      m.visible = e > 0.002;
      if (!m.visible) return;
      m.scale.y = (BT.x1 - BT.x0) * e;
      m.position.x = BT.x0 + ((BT.x1 - BT.x0) * e) / 2;
    };
    if (mode === 0) {
      // Idle, the last one stands finished.
      lay(teeBead, now ? (n.bead ?? 0) : 1);
      lay(teeSlag, n.slag ?? 0);
      teeSlag.scale.z = teeSlag.scale.x = 1;
    } else if (mode === 1) {
      lay(rows[0], n.b0 ?? 1);
      lay(rows[1], n.b1 ?? 0);
      lay(rows[2], n.b2 ?? 0);
    } else {
      crack.visible = (n.gouged ?? 0) < 0.9;
      gouge.visible = (n.gouged ?? 0) > 0.02;
      gouge.scale.x = (BT.x1 - BT.x0) * (n.gouged ?? 0);
      gouge.position.x = BT.x0 + gouge.scale.x / 2;
      lay(repairBead, n.bead ?? 0);
    }
    const on = (n.arc ?? 0) > 0.5;
    const tip = on ? (P.tip as V) : null;
    arc(tip, t);
    if (tip) spark(1, tip[0], tip[1], tip[2], t, 0.05, 0.28, 0.45, 0.42);
    else if ((n.grind ?? 0) > 0.5) spark(1, n.grindX ?? 0, BT.y + 0.03, BT.z + 0.03, t, 0.55, 0.12, 0.25, 0.22);
    else spark(0, 0, 0, 0, t);
    flakes(n.chips ?? 0, n.chipX ?? 0, BT.y + 0.03, BT.z + 0.02, t, 0, 0.12, 0.25, 0.14);
    // The lens and the curtains take the arc's colour; the spool feeds while it's on.
    setLit(mask.lens, on ? '#7fff6e' : '#21313a');
    const f = on ? 0.5 + 0.5 * Math.sin(t * 53) * Math.sin(t * 31) : 0;
    curtain.color.setRGB(0.78 + f * 0.22, 0.35 + f * 0.45, 0.07 + f * 0.25);
    curtain.opacity = 0.74 + f * 0.12;
    spool.rotation.z = on ? t * 4 : 0;
    setLit(beacon, (n.alarm ?? 0) > 0.5 && Math.sin(t * 9) > 0 ? '#ff3b30' : '#5a1414');
    // Who's by the curtain: the foreman teaching, or the site supervisor with the order.
    bossFig.root.visible = mode === 1;
    if (mode === 1) {
      const pointing = (n.point ?? 0) > 0.5;
      bossFig.armL(null);
      bossFig.armR(pointing ? tmp.set(-0.62, BT.y + 0.2, BT.z + 0.1).clone() : null);
      bossFig.opts.nod = 0.3 + 0.2 * (n.nodB ?? 0) * Math.abs(Math.sin(t * 2.4));
    }
    superFig.root.visible = mode === 2;
    if (mode === 2) {
      superFig.armL((n.order ?? 0) > 0.5 ? tmp.set(-0.72, 1.14, 0.62).clone() : null);
      superFig.armR((n.thumbs ?? 0) > 0.5 ? tmp.set(BT.by[0] + 0.36, 1.42, BT.by[1] - 0.05).clone() : null);
      superFig.opts.nod = 0.18;
    }
  });
  out.work = marker(g, 0, BT.y, BT.z);
}

// =============================================================================================
// 강판 더미 (steelPlates, 2 × 1).

function plates(g: THREE.Group, out: Built) {
  // A stack on timber bearers, the edges staggered, heat numbers chalked on them; offcuts stood against the back.
  for (const x of [-0.72, 0, 0.72]) part(g, box(0.14, 0.14, 0.86), '#7a5c40', x, 0.07, 0);
  for (let i = 0; i < 11; i++) {
    const c = i % 3 === 0 ? PLATE_D : i % 3 === 1 ? PLATE : '#6b7a81';
    part(g, box(1.84 - (i % 2) * 0.04, 0.05, 0.86), c, ((i * 7) % 3) * 0.012 - 0.012, 0.165 + i * 0.05, ((i * 5) % 3) * 0.01 - 0.01);
  }
  // The top plate: primer, with the line.
  part(g, box(1.86, 0.02, 0.86), '#6f8088', 0, SP.top - 0.01, 0);
  label(g, 'AH36 · 12t', 0.26, 0.07, -0.72, 0.5, 0.437, '#ffffff', INK);
  picture(g, painted('wd-heat', 256, 64, (c) => {
    c.clearRect(0, 0, 256, 64);
    text(c, 'HEAT 7A-3120  L6000', 8, 40, 26, CHALK);
  }), 0.5, 0.09, 0.42, 0.42, 0.438);
  // Stood at the back: strips and offcuts.
  for (let i = 0; i < 5; i++) part(g, box(0.34 + (i % 2) * 0.16, 0.74 + (i % 3) * 0.12, 0.02), i % 2 ? PLATE : PLATE_D, -0.66 + i * 0.3, 0.42 + (i % 3) * 0.06, -0.47, { rx: -0.1 });
  // The hose stand and goggles' hook at the right, the two hoses off to the cylinders.
  part(g, box(0.04, 1.02, 0.04), FRAME, 0.95, 0.51, 0.3);
  part(g, box(0.22, 0.02, 0.03), FRAME, 0.9, 1.02, 0.3);
  const mask = maskMesh(g);
  const torch = cutTorchMesh(g);
  const red = hose(g, [1.0, 0.1, 0.42], 0.009, RED, 0.22);
  const green = hose(g, [1.03, 0.1, 0.36], 0.009, '#2e7d32', 0.26);
  // The straightedge and the chalk, with its own rest; the cut strip separate from the plate.
  const edge = group(g);
  part(edge, box(1.5, 0.02, 0.06), STEEL, 0, 0, 0);
  for (let i = 0; i < 16; i++) part(edge, box(0.004, 0.002, 0.03), INK, -0.72 + i * 0.096, 0.011, -0.012, { outline: false });
  const chalkM = part(g, cyl(0.009, 0.009, 0.1, 8), CHALK, 0, 0, 0, { rz: 0.6, outline: false });
  const line = part(g, box(1, 0.002, 0.007), CHALK, 0, SP.top + 0.002, SP.line, { outline: false });
  const kerf = part(g, box(1, 0.003, 0.012), '#17191a', 0, SP.top + 0.002, SP.line, { outline: false });
  const hot = ownLit(g, box(0.1, 0.004, 0.016), '#ff6d00', 0, SP.top + 0.0035, SP.line);
  const stripM = group(g, 0, SP.top - 0.01, SP.line + 0.09);
  part(stripM, box(1.4, 0.02, 0.17), '#7e8e96', 0, 0, 0);
  const slagDrip = sparks(g, 12, 0.012);
  const flameCone = group(g);
  const fMat = new THREE.MeshBasicMaterial({ color: '#7fd2ff', transparent: true, opacity: 0.85, depthWrite: false });
  const fm = new THREE.Mesh(cyl(0.001, 0.012, 0.05, 8), fMat);
  fm.userData.ownMaterial = true;
  fm.rotation.x = Math.PI;
  fm.position.y = -0.016;
  flameCone.add(fm);
  const arc = arcLight(g, 0.13, '#ffb300');
  // The drawing, and what goes on it.
  const roll = group(g, SP.roll[0], SP.roll[1], SP.roll[2]);
  part(roll, cyl(0.03, 0.03, 0.72, 12), '#e6edf2', 0, 0, 0, { rz: Math.PI / 2 });
  const sheet = picture(g, painted('wd-blockplan', 512, 256, (c) => {
    c.fillStyle = '#e8f1f8';
    c.fillRect(0, 0, 512, 256);
    c.strokeStyle = '#1a4b8c';
    c.lineWidth = 2;
    c.strokeRect(8, 8, 496, 240);
    c.beginPath();
    c.moveTo(40, 190);
    c.quadraticCurveTo(250, 240, 470, 190);
    c.lineTo(470, 60);
    c.lineTo(40, 60);
    c.closePath();
    c.stroke();
    for (let i = 1; i < 8; i++) {
      c.beginPath();
      c.moveTo(40 + i * 54, 60);
      c.lineTo(40 + i * 54, 190 + 34 * Math.sin((i / 8) * Math.PI));
      c.stroke();
    }
    for (let i = 1; i < 3; i++) {
      c.beginPath();
      c.moveTo(40, 60 + i * 44);
      c.lineTo(470, 60 + i * 44);
      c.stroke();
    }
    text(c, '블록 B-207 구조도', 40, 42, 22, '#1a4b8c');
    text(c, '각장 6 · 판두께 12t · 축척 1:50', 280, 42, 14, '#1a4b8c');
  }), 1.2, 0.6, SP.sheet[0], SP.sheet[1] + 0.008, SP.sheet[2], '#ffffff', 0, -Math.PI / 2);
  const tape = group(g);
  part(tape, rbox(0.07, 0.04, 0.07, 0.012), YELLOW, 0, 0, 0);
  const blade = part(tape, box(1, 0.002, 0.018), '#fff59d', 0.5, -0.016, 0, { outline: false });
  const pen = part(g, cyl(0.005, 0.005, 0.13, 6), RED, 0, 0, 0, { rx: 0.5, rz: 0.3, outline: false });
  const inkLine = part(g, box(0.18, 0.001, 0.006), RED, 0.14, SP.sheet[1] + 0.011, 0.1, { outline: false });
  const spots: Record<string, Spot> = { cutSteel: standAt(g, 'wdCut'), welder_readBlueprint: standAt(g, 'wdPlan') };
  spots['*'] = spots.cutSteel;
  const SPAN = SP.x1 - SP.x0;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    showMask(mask, P, n, SP.hook);
    at(torch, P.torch, SP.torch);
    const tp = (P.torch as V | null) ?? SP.torch;
    red([tp[0] + 0.02, tp[1] + 0.14, tp[2] + 0.3]);
    green([tp[0] + 0.03, tp[1] + 0.13, tp[2] + 0.3]);
    at(edge, P.edge);
    at(chalkM, P.chalk);
    const planning = now === 'welder_readBlueprint';
    // The plate: chalked, burned along, the strip fallen and then taken off.
    const marked = n.marked ?? 0;
    line.visible = !planning && marked > 0.01 && (n.gone ?? 0) < 0.5;
    line.scale.x = SPAN * marked;
    line.position.x = SP.x0 + (SPAN * marked) / 2;
    const cut = n.cut ?? 0;
    kerf.visible = cut > 0.01 && (n.gone ?? 0) < 0.5;
    kerf.scale.x = SPAN * cut;
    kerf.position.x = SP.x0 + (SPAN * cut) / 2;
    hot.visible = (n.arc ?? 0) > 0.5;
    if (hot.visible) hot.position.x = SP.x0 + SPAN * cut - 0.05;
    const drop = n.dropped ?? 0;
    stripM.visible = !planning && (n.gone ?? 0) < 0.5;
    if (P.strip) place(stripM, P.strip);
    else stripM.position.set(0, SP.top - 0.01 - drop * 0.05, SP.line + 0.09);
    stripM.rotation.x = P.strip ? 0 : drop * 0.12;
    const fl = n.flame ?? 0;
    flameCone.visible = fl > 0.05 && !!P.torch;
    if (flameCone.visible) {
      place(flameCone, P.torch as V);
      fMat.opacity = 0.5 + 0.35 * Math.sin(t * 40);
    }
    const on = (n.arc ?? 0) > 0.5;
    arc(on ? (P.tip as V) : null, t);
    if (on) {
      const p = P.tip as V;
      slagDrip(1, p[0], SP.top - 0.01, SP.line + 0.01, t, 0, 0.1, 0.04, 0.09);
    } else slagDrip(0, 0, 0, 0, t);
    setLit(mask.lens, on ? '#7fff6e' : '#21313a');
    // The drawing.
    const lay = n.lay ?? 0;
    sheet.visible = planning && lay > 0.02;
    sheet.scale.x = Math.max(0.01, lay);
    sheet.position.x = SP.sheet[0] - 0.6 * (1 - lay);
    roll.visible = !planning || lay < 0.05;
    at(tape, P.tape);
    const bl = Math.max(0.001, n.blade ?? 0);
    blade.scale.x = bl;
    blade.position.x = bl / 2;
    at(pen, P.pen);
    inkLine.visible = planning && (n.inked ?? 0) > 0.5;
    inkLine.position.y = SP.sheet[1] + 0.011;
  });
  out.work = marker(g, 0, SP.top + 0.04, SP.line);
}

// =============================================================================================
// 그라인더 작업대 (grinderStation, 1 × 1).

function grinderStand(g: THREE.Group, out: Built) {
  for (const x of [-0.4, 0.4]) for (const z of [-0.34, 0.34]) part(g, box(0.06, 0.86, 0.06), FRAME, x, 0.43, z);
  part(g, box(0.92, 0.04, 0.76), '#5d686f', 0, 0.87, 0);
  part(g, box(0.82, 0.03, 0.6), '#3f464b', 0, 0.26, 0);
  // Grinding dust and a bin below; a spark guard on the right; a rack of discs at the back.
  part(g, cyl(0.15, 0.13, 0.2, 14), '#546e7a', -0.1, 0.38, 0);
  part(g, box(0.02, 0.86, 0.68), '#ab5a1e', 0.47, 1.3, -0.02);
  label(g, '불티 주의', 0.28, 0.06, 0.457, 1.55, 0, YELLOW, INK, -Math.PI / 2);
  part(g, box(0.88, 0.52, 0.02), '#6f7b82', 0, 1.15, -0.4);
  label(g, '보안면 착용 · 디스크 균열 확인', 0.72, 0.075, 0, 1.36, -0.388, YELLOW, INK);
  for (let i = 0; i < 4; i++) part(g, cyl(0.06, 0.06, 0.006, 16), i % 2 ? '#585d61' : '#6d7276', -0.3 + i * 0.13, 1.15, -0.385, { rx: Math.PI / 2, outline: false });
  // The vise and the piece clamped along the front.
  part(g, box(0.5, 0.08, 0.12), '#1565c0', 0, 0.93, GR.z - 0.04);
  part(g, box(0.1, 0.05, 0.05), CHROME, 0.27, 0.93, GR.z);
  const work = group(g, 0, GR.y, GR.z);
  part(work, box(0.56, 0.04, 0.16), PLATE, 0, 0.0, 0);
  // The weld: rough and scaly until it's been ground, then a flat bright band.
  const rough = group(work);
  for (let i = 0; i < 17; i++) part(rough, cyl(0.016, 0.018, 0.022, 7), i % 2 ? BEAD_C : '#8f999f', GR.x0 - 0.03 + i * 0.029, 0.026, 0, { rz: Math.PI / 2, outline: false });
  const smooth = part(work, box(1, 0.006, 0.042), '#dfe6ea', 0, 0.023, 0, { outline: false });
  const hook = marker(g, GR.hook[0], GR.hook[1], GR.hook[2]);
  part(hook, box(0.016, 0.016, 0.3), STEEL, 0, 0.13, -0.15, { outline: false });
  const mask = maskMesh(g, true);
  const tool = angleGrinder(g);
  part(g, box(0.28, 0.02, 0.12), FRAME, GR.tool[0], GR.tool[1] - 0.08, GR.tool[2]);
  const rag = part(g, rbox(0.12, 0.018, 0.09, 0.008), '#ffb74d', 0, 0, 0, { outline: false });
  const gauge = group(g);
  part(gauge, box(0.07, 0.05, 0.005), STEEL, 0, 0, 0);
  part(gauge, box(0.02, 0.02, 0.006), INK, 0.02, -0.02, 0, { outline: false });
  const spark = sparks(g, 22, 0.01);
  const cable = hose(g, [-0.42, 0.9, -0.34], 0.01, BLACK, 0.25);
  const spots: Record<string, Spot> = { grindWelds: standAt(g, 'wdGrind', 0.62) };
  spots['*'] = spots.grindWelds;
  drive(g, out, spots, (_now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    showMask(mask, P, n, GR.hook);
    at(tool.root, P.tool, GR.tool);
    const tp = (P.tool as V | null) ?? GR.tool;
    cable([tp[0] + 0.19, tp[1], tp[2]]);
    tool.disc.rotation.y = (n.spin ?? 0) > 0.1 ? t * 30 : 0;
    const s = N ? (n.smooth ?? 0) : 1;
    rough.children.forEach((m, i) => (m.visible = !(s * 17 > i + (i % 3))));
    smooth.scale.x = Math.max(0.001, 0.46 * s);
    smooth.position.x = GR.x0 - 0.03 + (0.46 * s) / 2;
    smooth.visible = s > 0.01;
    const on = (n.grind ?? 0) > 0.5;
    if (on) spark(1, n.grindX ?? 0, GR.y + 0.03, GR.z + 0.05, t, 0.42, 0.14, 0.32, 0.18);
    else spark(0, 0, 0, 0, t);
    at(rag, P.rag);
    at(gauge, P.gauge, GR.gauge);
  });
  out.work = marker(g, 0, GR.y, GR.z);
}

// =============================================================================================
// 비파괴 검사기 (inspectionRig, 1 × 1).

function inspection(g: THREE.Group, out: Built) {
  // A cart on castors: the plate on the front, the detector on the raised back.
  for (const x of [-0.38, 0.38]) for (const z of [-0.36, 0.36]) {
    part(g, box(0.05, IN.y - 0.08, 0.05), '#00796b', x, (IN.y - 0.08) / 2 + 0.05, z);
    part(g, cyl(0.04, 0.04, 0.03, 10), BLACK, x, 0.04, z, { rz: Math.PI / 2 });
  }
  part(g, box(0.86, 0.03, 0.82), '#00897b', 0, IN.y - 0.03, 0);
  part(g, box(0.76, 0.03, 0.66), '#00695c', 0, 0.34, 0);
  // On the shelf: the box of probes and blocks.
  part(g, rbox(0.34, 0.14, 0.26, 0.02), '#fbc02d', -0.14, 0.42, 0.04);
  part(g, box(0.22, 0.09, 0.14), STEEL, 0.2, 0.4, 0);
  label(g, '교정 시험편', 0.2, 0.05, 0.2, 0.4, 0.074, '#ffffff', INK);
  part(g, box(0.82, 0.12, 0.2), '#00695c', 0, IN.y + 0.03, -0.26);
  const inst = group(g, -0.02, IN.y + 0.24, -0.26);
  inst.rotation.x = -0.25;
  part(inst, rbox(0.58, 0.34, 0.1, 0.02), '#263238', 0, 0, 0);
  const screen = swapPic(inst, 0.36, 0.25, -0.08, 0.01, 0.055);
  for (let i = 0; i < 4; i++) part(inst, cyl(0.015, 0.015, 0.012, 10), i === 3 ? RED : '#90a4ae', 0.16 + (i % 2) * 0.055, 0.08 - (i >> 1) * 0.08, 0.057, { rx: Math.PI / 2, outline: false });
  label(inst, '초음파 탐상기', 0.28, 0.035, -0.08, -0.145, 0.052, '#263238', '#b0bec5');
  const idle = painted('wd-ut-idle', 256, 180, (c) => {
    c.fillStyle = '#071a14';
    c.fillRect(0, 0, 256, 180);
    c.strokeStyle = '#144b38';
    c.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      c.beginPath();
      c.moveTo(i * 26, 0);
      c.lineTo(i * 26, 180);
      c.stroke();
    }
    text(c, '대기', 128, 96, 24, '#2fbf8c', 'center');
  });
  const scope = live(256, 180);
  // The tray of three cans, the gel, the probe's clip.
  part(g, box(0.28, 0.02, 0.1), STEEL, IN.cans[1][0], IN.y + 0.04, IN.cans[1][2]);
  const cans = [canMesh(g, RED, '침투'), canMesh(g, '#fafafa', '현상'), canMesh(g, '#1565c0', '세척')];
  const bottle = group(g);
  part(bottle, cyl(0.026, 0.03, 0.1, 10), '#90caf9', 0, 0, 0);
  part(bottle, cyl(0.003, 0.012, 0.05, 8), '#fafafa', 0, 0.07, 0, { outline: false });
  const probe = group(g);
  part(probe, rbox(0.04, 0.036, 0.05, 0.008), '#37474f', 0, 0.002, 0);
  part(probe, cyl(0.011, 0.011, 0.04, 8), BLACK, 0, 0.03, 0, { outline: false });
  const lead = hose(g, [-0.2, IN.y + 0.08, -0.17], 0.005, '#37474f', 0.1);
  part(g, box(0.05, 0.05, 0.03), FRAME, IN.probe[0], IN.probe[1] - 0.03, IN.probe[2]);
  // The welded plate.
  const work = group(g, 0, IN.y + 0.002, IN.z);
  part(work, box(0.8, 0.02, 0.34), PLATE, 0, 0, 0);
  part(work, cyl(0.014, 0.014, 0.8, 8), BEAD_C, 0, 0.012, 0, { rz: Math.PI / 2, outline: false });
  for (let i = 0; i < 8; i++) part(work, box(0.002, 0.002, 0.03), CHALK, -0.35 + i * 0.1, 0.012, 0.08, { outline: false });
  const coat = (color: string, opacity: number) => {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.1), mat);
    m.userData.ownGeometry = m.userData.ownMaterial = true;
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, 0.03, 0.002);
    work.add(m);
    return { m, mat };
  };
  const gel = coat('#c8e6f7', 0.42);
  const dye = coat('#d81b60', 0.75);
  const dev = coat('#fafafa', 0.92);
  const crackRed = part(work, box(0.14, 0.001, 0.005), '#d81b60', IN.flaw, 0.034, 0.001, { ry: 0.08, outline: false });
  crackRed.renderOrder = 3;
  const mark = part(work, box(0.05, 0.002, 0.006), YELLOW, IN.flaw, 0.031, 0.05, { outline: false });
  const loupe = group(g);
  const lr = part(loupe, new THREE.TorusGeometry(0.04, 0.005, 6, 18), BLACK, 0, 0, 0, { rx: 1.1, outline: false });
  lr.userData.ownGeometry = true;
  rod(loupe, v3(0.03, 0, 0.03), v3(0.08, -0.01, 0.1), 0.007, BLACK);
  const rag = part(g, rbox(0.12, 0.018, 0.09, 0.008), '#ffb74d', 0, 0, 0, { outline: false });
  const ragMat = new THREE.MeshToonMaterial({ color: '#ffffff' });
  rag.material = ragMat;
  rag.userData.ownMaterial = true;
  const clip = clipMesh(g, sheetTex('검사 기록', ['UT 지시', '위치', '길이', 'PT 지시', '판정']));
  const chalk = part(g, cyl(0.009, 0.009, 0.1, 8), YELLOW, 0, 0, 0, { rz: 0.5, outline: false });
  const spray = sparks(g, 8, 0.008);
  const spots: Record<string, Spot> = { inspectWeld: standAt(g, 'wdInspect', IN.stand), welder_testMetal: standAt(g, 'wdDye', IN.stand) };
  spots['*'] = spots.inspectWeld;
  let lastHit = -1;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const dyeing = now === 'welder_testMetal';
    gel.m.visible = !dyeing && (n.gel ?? 0) > 0.02;
    gel.mat.opacity = 0.42 * (n.gel ?? 0);
    dye.m.visible = dyeing && (n.dye ?? 0) > 0.02;
    dye.mat.opacity = 0.75 * (n.dye ?? 0);
    dev.m.visible = dyeing && (n.white ?? 0) > 0.02;
    dev.mat.opacity = 0.92 * (n.white ?? 0);
    crackRed.visible = dyeing && (n.crack ?? 0) > 0.05;
    crackRed.scale.z = 0.6 + 1.6 * (n.crack ?? 0);
    mark.visible = !dyeing && (n.mark ?? 0) > 0.3;
    at(probe, P.probe, IN.probe);
    const pr = (P.probe as V | null) ?? IN.probe;
    lead([pr[0], pr[1] + 0.05, pr[2]]);
    at(bottle, P.bottle, IN.bottle);
    [0, 1, 2].forEach((i) => {
      at(cans[i], P[`can${i}`], IN.cans[i]);
    });
    if ((n.spray ?? 0) > 0.5) {
      const c = (P.can0 ?? P.can1) as V | undefined;
      if (c) spray(1, c[0], c[1] - 0.08, c[2], t * 1.4, 0, 0, -0.1, 0.1);
      else spray(0, 0, 0, 0, t);
    } else spray(0, 0, 0, 0, t);
    at(loupe, P.loupe);
    at(rag, P.rag);
    if (P.rag) ragMat.color.set((n.ragTint ?? 0) > 0.5 ? '#ec6a95' : '#fff3e0');
    at(clip, P.clip);
    at(chalk, P.chalk);
    // The screen: the scan's echoes, a spike rising with the flaw.
    const on = !dyeing && (n.scan ?? 0) > 0.01;
    if (!on) {
      screen.set(idle);
      lastHit = -1;
      return;
    }
    const found = n.found ?? 0;
    const key = Math.round(t * 18);
    if (key === lastHit) return;
    lastHit = key;
    screen.set(scope((c) => {
      c.fillStyle = '#071a14';
      c.fillRect(0, 0, 256, 180);
      c.strokeStyle = '#144b38';
      c.lineWidth = 1;
      for (let i = 0; i < 10; i++) {
        c.beginPath();
        c.moveTo(i * 26, 0);
        c.lineTo(i * 26, 180);
        c.stroke();
      }
      c.strokeStyle = '#3cff9e';
      c.lineWidth = 2;
      c.beginPath();
      for (let x = 0; x < 256; x += 2) {
        const noise = 3 * Math.abs(Math.sin(x * 0.7 + t * 11) * Math.sin(x * 0.31 - t * 7));
        const send = 125 * Math.exp(-((x - 20) ** 2) / 40);
        const back = 90 * Math.exp(-((x - 210) ** 2) / 50);
        const flaw = 100 * found * Math.exp(-((x - 130) ** 2) / 34);
        const y = 160 - noise - send - back - flaw;
        if (x === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
      c.strokeStyle = '#ff5252';
      c.strokeRect(112, 66, 40, 2);
      text(c, found > 0.5 ? '지시 깊이 7.4 mm' : '탐상 중', 10, 22, 15, found > 0.5 ? '#ffd54f' : '#2fbf8c');
    }));
  });
  out.work = marker(g, 0, IN.y + 0.03, IN.z);
}

// =============================================================================================
// 선체 블록 (wdHullBlock, 5 × 3).

function hullBlock(g: THREE.Group, out: Built) {
  // Standing on keel blocks, the bilge's curve underneath, its plating open along the top so the frames show.
  for (const x of [-1.9, -0.65, 0.65, 1.9]) {
    part(g, box(0.5, 0.26, 1.7), '#6d5236', x, 0.13, -0.2);
    part(g, box(0.34, 0.1, 1.5), YELLOW, x, 0.31, -0.2);
  }
  const BOTTOM = 0.4;
  const TOP = 2.75;
  const LEN = 4.7;
  const FACE = HB.face;
  const BACK = -1.34;
  // The front's plating in courses, and the back's; the deck frame on top.
  const courses: Array<[number, number, string]> = [[BOTTOM, 0.62, PRIMER_D], [0.62, 1.5, PRIMER], [1.5, 2.2, PRIMER], [2.2, TOP, HULL]];
  courses.forEach(([a, b, col]) => part(g, box(LEN, b - a - 0.006, 0.03), col, 0, (a + b) / 2, FACE));
  part(g, box(LEN, TOP - BOTTOM, 0.04), PRIMER_D, 0, (TOP + BOTTOM) / 2, BACK);
  part(g, box(LEN, 0.05, FACE - BACK), HULL, 0, BOTTOM, (FACE + BACK) / 2);
  for (const sx of [-1, 1]) {
    // The ends are open: floors with lightening holes, longitudinals through them.
    part(g, box(0.03, TOP - BOTTOM, FACE - BACK), PRIMER, (sx * LEN) / 2, (TOP + BOTTOM) / 2, (FACE + BACK) / 2);
    for (const y of [0.95, 1.65, 2.3]) for (const z of [-0.8, -0.05, 0.7]) {
      const hole = part(g, cyl(0.2, 0.2, 0.012, 16), '#1d1a18', (sx * (LEN + 0.03)) / 2, y, z, { rz: Math.PI / 2, outline: false });
      hole.userData.noShadow = true;
    }
  }
  // Inside from above: the frames across and stiffeners along.
  for (let i = -3; i <= 3; i++) part(g, box(0.05, 0.42, FACE - BACK - 0.08), PRIMER_D, i * 0.68, TOP - 0.2, (FACE + BACK) / 2);
  for (const z of [-0.8, -0.1, 0.6]) part(g, box(LEN - 0.08, 0.3, 0.05), '#7a3325', 0, TOP - 0.14, z);
  // Stiffeners already on the front: long L-bars with their welds, up the plating.
  for (const y of [1.72, 2.12]) {
    part(g, box(LEN, 0.08, 0.018), '#7a3325', 0, y, FACE + 0.03);
    part(g, box(LEN, 0.012, 0.05), '#7a3325', 0, y + 0.04, FACE + 0.055);
  }
  for (const x of [-1.8, -0.9, 0.9, 1.8]) part(g, box(0.04, TOP - BOTTOM - 0.06, 0.04), '#7a3325', x, (TOP + BOTTOM) / 2, FACE + 0.03);
  // Weld lines already done at the courses' joints, in pale.
  for (const y of [1.5, 2.2]) part(g, cyl(0.009, 0.009, LEN - 0.04, 6), BEAD_C, 0, y, FACE + 0.018, { rz: Math.PI / 2, outline: false });
  picture(g, painted('wd-blockno', 512, 200, (c) => {
    c.clearRect(0, 0, 512, 200);
    text(c, 'B-207', 256, 100, 96, '#ffffff', 'center');
    text(c, `${BRAND}  H.3317  좌현 이중저`, 256, 164, 30, '#ffe082', 'center');
  }), 1.55, 0.6, -1.15, 2.48, FACE + 0.02);
  // Chalk on the plate: frame numbers and the seam's marks.
  picture(g, painted('wd-chalks', 512, 128, (c) => {
    c.clearRect(0, 0, 512, 128);
    text(c, 'FR.42   FR.43   ← 맞대기 V 개선 →   FR.44', 256, 70, 26, CHALK, 'center');
  }), 1.6, 0.26, 0, 0.92, FACE + 0.02);
  // The staging: a tower either side with planks and a ladder, poles standing off the plating.
  const staging = (x: number) => {
    for (const sx of [-0.45, 0.45]) for (const z of [FACE + 0.08, FACE + 0.3]) part(g, cyl(0.022, 0.022, 3, 8), '#90a4ae', x + sx, 1.5, z, { outline: false });
    for (const y of [0.5, 1.45, 2.42]) {
      part(g, box(1, 0.04, 0.3), '#d4a95e', x, y, FACE + 0.2);
      part(g, cyl(0.02, 0.02, 1, 6), '#90a4ae', x, y + 0.5, FACE + 0.3, { rz: Math.PI / 2, outline: false });
    }
  };
  staging(-1.72);
  staging(1.72);
  // Where things wait: the mask's hook and the torch's holder on the left staging, the bars by the right.
  rod(g, v3(HB.hook[0], HB.hook[1] + 0.13, HB.hook[2] - 0.18), v3(HB.hook[0], HB.hook[1] + 0.13, HB.hook[2] + 0.02), 0.008, STEEL);
  part(g, box(0.06, 0.09, 0.06), BLACK, HB.torch[0], HB.torch[1] - 0.05, HB.torch[2]);
  rod(g, v3(HB.torch[0] + 0.03, HB.torch[1] - 0.08, HB.torch[2] - 0.02), v3(HB.torch[0] + 0.15, HB.torch[1] - 0.06, HB.face + 0.08), 0.012, FRAME);
  for (let i = 0; i < 3; i++) {
    const b = group(g, HB.bars[0], 0.08 + i * 0.04, HB.bars[2] + i * 0.02 - 0.08);
    part(b, box(0.9, 0.035, 0.018), '#6e6658', 0, 0, 0);
  }
  part(g, box(0.1, 0.06, 0.3), '#7a5c40', HB.bars[0] - 0.3, 0.03, HB.bars[2]);
  part(g, box(0.1, 0.06, 0.3), '#7a5c40', HB.bars[0] + 0.3, 0.03, HB.bars[2]);
  // A fire blanket on the floor under the seam.
  part(g, box(1.3, 0.012, 0.44), '#d7ccc8', 0, 0.018, FACE + 0.26, { outline: false });
  // Work in progress.
  const mask = maskMesh(g);
  const torch = torchMesh(g);
  const cable = hose(g, [-1.3, 0.25, HB.face + 0.24], 0.013, BLACK, 0.18);
  const bar = group(g);
  part(bar, box(0.9, 0.08, 0.018), '#7a3325', 0, 0, 0);
  part(bar, box(0.9, 0.012, 0.05), '#7a3325', 0, 0.04, 0.02);
  const tacks = HB.tacks.map((x) => ownLit(g, ball(0.016), '#ffb347', x, HB.barY - 0.04, HB.face + 0.03));
  const dogs = [-0.32, 0.32].map((x) => {
    const d = group(g, x, HB.barY + 0.08, HB.face + 0.05);
    part(d, box(0.06, 0.05, 0.03), PLATE_D, 0, 0, 0);
    part(d, box(0.03, 0.05, 0.04), '#ffb300', 0.02, -0.03, 0.03);
    return d;
  });
  const square = group(g);
  part(square, box(0.2, 0.012, 0.004), STEEL, 0, 0, 0);
  part(square, box(0.012, 0.15, 0.004), STEEL, -0.094, -0.07, 0);
  const hammer = hammerMesh(g);
  const bead = part(g, cyl(0.017, 0.017, 1, 8), BEAD_C, 0, HB.seamY, HB.face + 0.02, { rz: Math.PI / 2, outline: false });
  const slag = part(g, cyl(0.019, 0.019, 1, 8), SLAG, 0, HB.seamY, HB.face + 0.02, { rz: Math.PI / 2, outline: false });
  const groove = part(g, box(HB.x1 - HB.x0 + 0.1, 0.018, 0.004), '#191b1c', (HB.x0 + HB.x1) / 2, HB.seamY, HB.face + 0.017, { outline: false });
  const spark = sparks(g, 24, 0.012);
  const flakes = sparks(g, 6, 0.009);
  const arc = arcLight(g, 0.24);
  // A patch of the plating that takes the arc's light.
  const glowMat = new THREE.MeshBasicMaterial({ color: '#cfe6ff', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const glowP = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.1), glowMat);
  glowP.userData.ownGeometry = glowP.userData.ownMaterial = true;
  glowP.position.z = FACE + 0.021;
  g.add(glowP);
  const watcher = person(g, LOOKS.watcher, HB.fire[0], HB.fire[1], -Math.PI * 0.72, 'male');
  const ext = group(g, HB.fire[0] - 0.3, 0, HB.fire[1] - 0.12);
  part(ext, cyl(0.07, 0.07, 0.42, 14), RED, 0, 0.21, 0);
  part(ext, cyl(0.02, 0.03, 0.05, 8), BLACK, 0, 0.45, 0, { outline: false });
  ext.visible = false;
  const spots: Record<string, Spot> = { wdTackBlock: standAt(g, 'wdTack', HB.stand), wdSeamBlock: standAt(g, 'wdSeam', HB.stand) };
  spots['*'] = spots.wdTackBlock;
  const SPAN = HB.x1 - HB.x0;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    showMask(mask, P, n, HB.hook);
    at(torch, P.torch, HB.torch);
    const tp = (P.torch as V | null) ?? HB.torch;
    cable([tp[0] + 0.02, tp[1] + 0.13, tp[2] + 0.24]);
    const tacking = now === 'wdTackBlock';
    at(bar, tacking ? P.bar : null);
    tacks.forEach((m, i) => {
      const v = n[`t${i}`] ?? 0;
      m.visible = tacking && v > 0.1 && (n.gone ?? 0) < 0.5;
      setLit(m, v > 0.85 ? BEAD_C : '#ffb347');
    });
    dogs.forEach((d) => {
      d.visible = tacking && (n.wedged ?? 0) > 0.3 && (n.gone ?? 0) < 0.5;
    });
    at(square, P.square);
    at(hammer, P.hammer);
    const seaming = now === 'wdSeamBlock' || now === null;
    const be = now === null ? 1 : (n.bead ?? 0);
    bead.visible = seaming && be > 0.002;
    if (bead.visible) {
      bead.scale.y = SPAN * be;
      bead.position.x = HB.x0 + (SPAN * be) / 2;
    }
    const sl = n.slag ?? 0;
    slag.visible = seaming && sl > 0.002;
    if (slag.visible) {
      slag.scale.y = SPAN * sl;
      slag.position.x = HB.x0 + (SPAN * sl) / 2;
    }
    groove.visible = !bead.visible || be < 1;
    const on = (n.arc ?? 0) > 0.5;
    const tip = on ? (P.tip as V | null) : null;
    arc(tip, t);
    if (tip) spark(1, tip[0], tip[1], tip[2] + 0.02, t, 0, 0.45, 0.4, 0.42);
    else spark(0, 0, 0, 0, t);
    flakes(n.chips ?? 0, n.chipX ?? 0, HB.seamY + 0.02, HB.face + 0.03, t, 0, 0.14, 0.22, 0.12);
    glowP.visible = !!tip;
    if (tip) {
      glowP.position.x = tip[0];
      glowP.position.y = tip[1];
      glowMat.opacity = 0.16 + 0.1 * Math.sin(t * 47);
    }
    setLit(mask.lens, on ? '#7fff6e' : '#21313a');
    const watch = now === 'wdSeamBlock';
    watcher.root.visible = watch;
    ext.visible = watch;
    if (watch) {
      watcher.armL(tmp.set(HB.fire[0] - 0.3, 0.9, HB.fire[1] - 0.12).clone());
      watcher.armR(null);
      watcher.opts.nod = 0.3;
    }
  });
  out.work = marker(g, 0, HB.barY, HB.face);
}

// =============================================================================================
// 용접기·가스 (wdGasCart, 2 × 1).

function gasCart(g: THREE.Group, out: Built) {
  // The machine at the left: a box on wheels with its panel lit, a wire feeder on top, leads coiled on hooks.
  const MX = -0.52;
  part(g, rbox(0.62, 0.92, 0.6, 0.02), '#1b5e20', MX, 0.58, 0);
  for (const sx of [-0.24, 0.24]) for (const z of [-0.22, 0.22]) part(g, cyl(0.06, 0.06, 0.04, 12), BLACK, MX + sx, 0.06, z, { rz: Math.PI / 2 });
  for (let i = 0; i < 6; i++) part(g, box(0.5, 0.012, 0.004), '#144817', MX, 0.28 + i * 0.05, 0.302, { outline: false });
  part(g, box(0.42, 0.26, 0.012), '#263238', MX, 0.92, 0.298);
  const lcd = swapPic(g, 0.22, 0.09, MX - 0.06, 0.97, 0.306);
  const dial = group(g, GS.dial[0], GS.dial[1], 0.306);
  part(dial, cyl(0.034, 0.034, 0.024, 16), '#b0bec5', 0, 0, 0.008, { rx: Math.PI / 2 });
  part(dial, box(0.008, 0.03, 0.03), RED, 0, 0.016, 0.018, { outline: false });
  const pilot = ownLit(g, ball(0.012), '#154a18', MX + 0.15, 1.0, 0.306);
  label(g, `${BRAND} 공용`, 0.3, 0.05, MX, 0.72, 0.306, '#ffffff', INK);
  part(g, rbox(0.42, 0.22, 0.42, 0.02), '#37474f', MX, 1.15, -0.02);
  const sp = group(g, MX, 1.15, 0.2);
  part(sp, cyl(0.09, 0.09, 0.02, 14), '#b0bec5', 0, 0, 0, { rx: Math.PI / 2 });
  // Coils of lead on the machine's side.
  for (const [r, c] of [[0.11, BLACK], [0.09, '#c62828']] as Array<[number, string]>) {
    const coil = part(g, new THREE.TorusGeometry(r, 0.012, 6, 18), c, MX - 0.33, 0.62, 0.02 + (r - 0.1) * 0.5, { ry: Math.PI / 2, outline: false });
    coil.userData.ownGeometry = true;
  }
  // The cylinder rack at the right: three, painted by gas, chained.
  const RX = 0.42;
  part(g, box(0.92, 0.06, 0.52), FRAME, RX, 0.03, -0.02);
  for (const x of [-0.44, 0.44]) part(g, box(0.05, 1.42, 0.05), FRAME, RX + x, 0.71, -0.24);
  part(g, box(0.95, 0.05, 0.05), FRAME, RX, 1.42, -0.24);
  const cyls: Array<[number, string, string, string]> = [[0, '#1565c0', 'CO₂', '#ffffff'], [-0.3, '#2e7d32', '산소', '#ffffff'], [0.3, '#fbc02d', 'LPG', INK]];
  cyls.forEach(([dx, c, nm, fg]) => {
    part(g, cyl(0.105, 0.105, 1.15, 16), c, RX + dx, 0.64, -0.02);
    part(g, ball(0.105), c, RX + dx, 1.215, -0.02, { outline: false });
    part(g, cyl(0.04, 0.05, 0.1, 10), STEEL, RX + dx, 1.33, -0.02, { outline: false });
    label(g, nm, 0.15, 0.08, RX + dx, 0.8, 0.09, '#fafafa', fg === '#ffffff' ? c : INK);
  });
  // The chain across them.
  const chain = part(g, box(0.9, 0.016, 0.01), '#9e9e9e', RX, 1.1, 0.09, { outline: false });
  chain.position.y = 1.08;
  for (let i = 0; i < 12; i++) part(g, box(0.03, 0.02, 0.012), '#b0b0b0', RX - 0.42 + i * 0.077, 1.08, 0.09, { outline: false });
  // The regulator on the CO₂'s valve, its two gauges; a heater.
  const reg = group(g, RX, 1.38, 0.03);
  part(reg, cyl(0.03, 0.03, 0.1, 10), CHROME, 0, 0, 0, { rz: Math.PI / 2 });
  const gaugeFace = (x: number, y: number, max: string): THREE.Group => {
    const f = group(g, x, y, GS.gauge[2]);
    part(f, cyl(0.055, 0.055, 0.03, 18), BLACK, 0, 0, -0.012, { rx: Math.PI / 2 });
    picture(f, painted(`wd-gauge-${max}`, 96, 96, (c) => {
      c.fillStyle = PAPER;
      c.beginPath();
      c.arc(48, 48, 48, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = INK;
      c.lineWidth = 2;
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI * 0.75 + (i / 8) * Math.PI * 1.5;
        c.beginPath();
        c.moveTo(48 + Math.cos(a) * 34, 48 + Math.sin(a) * 34);
        c.lineTo(48 + Math.cos(a) * 44, 48 + Math.sin(a) * 44);
        c.stroke();
      }
      text(c, max, 48, 78, 13, INK, 'center');
    }), 0.1, 0.1, 0, 0, 0.005);
    const nd = group(f, 0, 0, 0.008);
    part(nd, box(0.004, 0.042, 0.002), RED, 0, 0.02, 0, { outline: false });
    return nd;
  };
  const needleA = gaugeFace(GS.gauge[0] - 0.07, GS.gauge[1], '150bar');
  const needleB = gaugeFace(GS.gauge[0] + 0.07, GS.gauge[1], '25L');
  const wheel = group(g, GS.valve[0], GS.valve[1], 0.04);
  part(wheel, cyl(0.04, 0.04, 0.016, 10), RED, 0, 0, 0, { rx: 0 });
  // A joint on the hose to soap, with its bubbles.
  rod(g, v3(GS.joint[0], GS.gauge[1] - 0.05, 0.12), v3(GS.joint[0], GS.joint[1], 0.26), 0.012, BLACK);
  part(g, cyl(0.02, 0.02, 0.05, 8), '#c9a13b', GS.joint[0], GS.joint[1], 0.26, { outline: false });
  rod(g, v3(GS.joint[0], GS.joint[1] - 0.02, 0.26), v3(MX + 0.1, 1.15, 0.2), 0.012, BLACK);
  const soap = group(g);
  part(soap, cyl(0.03, 0.035, 0.1, 10), '#fff59d', 0, 0, 0);
  part(soap, cyl(0.005, 0.015, 0.05, 8), '#fafafa', 0, 0.07, 0, { outline: false });
  part(g, box(0.13, 0.03, 0.12), FRAME, GS.soap[0], GS.soap[1] - 0.06, GS.soap[2]);
  part(g, box(0.03, GS.soap[1] - 0.06, 0.03), FRAME, GS.soap[0], (GS.soap[1] - 0.06) / 2, GS.soap[2]);
  const bubbles = Array.from({ length: 5 }, (_, i) => {
    const m = part(g, ball(0.012 + (i % 3) * 0.004), '#e3f4fb', GS.joint[0] - 0.03 + i * 0.015, GS.joint[1] - 0.02 + (i % 2) * 0.02, 0.29, { outline: false });
    m.visible = false;
    return m;
  });
  const clip = clipMesh(g, CLIP());
  const clipHome = group(g, GS.clip[0], GS.clip[1], GS.clip[2]);
  part(clipHome, box(0.03, 0.02, 0.05), FRAME, 0, -0.02, 0);
  const spots: Record<string, Spot> = { wdCheckGas: standAt(g, 'wdGas', GS.stand) };
  spots['*'] = spots.wdCheckGas;
  const face = live(128, 56);
  const drawAmps = (a: number) =>
    face((c) => {
      c.fillStyle = '#0a1a10';
      c.fillRect(0, 0, 128, 56);
      text(c, `${String(Math.round(a)).padStart(3, '0')} A`, 64, 38, 30, '#6dff8e', 'center');
    });
  let shown = -1;
  drive(g, out, spots, (_now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const open = N ? (n.open ?? 0) : 1;
    needleA.rotation.z = Math.PI * 0.75 - open * Math.PI * 0.98 + (N ? 0.01 * Math.sin(t * 9) : 0);
    needleB.rotation.z = Math.PI * 0.75 - open * Math.PI * 0.6;
    wheel.rotation.y = n.valveA ?? 0;
    const amps = 120 + 60 * (N ? (n.amps ?? 0) : 1);
    const a = Math.round(amps);
    if (a !== shown) {
      shown = a;
      lcd.set(drawAmps(a));
    }
    dial.rotation.z = -((n.amps ?? 1) * 1.8 - 0.9);
    setLit(pilot, N ? '#3dff6b' : '#154a18');
    at(soap, P.soap, GS.soap);
    bubbles.forEach((m, i) => {
      const b = n.bubble ?? 0;
      m.visible = b > 0.05;
      m.scale.setScalar(Math.max(0.05, b) * (0.8 + 0.3 * Math.sin(t * 3 + i)));
    });
    at(clip, P.clip, GS.clip);
  });
  out.work = marker(g, 0, 1.1, 0.3);
}

// =============================================================================================
// 플라즈마 절단기 (wdPlasmaTable, 3 × 2).

function plasma(g: THREE.Group, out: Built) {
  // The water table: a long steel tub on feet with slats across and a plate on them.
  const TW = 2.8;
  const TD = 1.42;
  const TZ = -0.15;
  for (const x of [-1.3, 1.3]) for (const z of [-0.74, 0.46]) part(g, box(0.1, PL.top - 0.14, 0.1), FRAME, x, (PL.top - 0.14) / 2, z);
  part(g, box(TW, 0.2, TD), '#3f464b', 0, PL.top - 0.1, TZ);
  part(g, box(TW - 0.1, 0.004, TD - 0.1), '#21282c', 0, PL.top + 0.002, TZ, { outline: false });
  for (let i = 0; i < 26; i++) part(g, box(0.012, 0.03, TD - 0.1), '#6d7276', -1.32 + i * 0.106, PL.top + 0.005, TZ, { outline: false });
  // The plate on the bed, with holes left by parts already cut.
  part(g, box(2.4, 0.02, 1.16), PLATE, -0.1, PL.y - 0.012, TZ + 0.05);
  for (const [x, z, w, d] of [[0.5, -0.3, 0.5, 0.3], [0.7, 0.2, 0.3, 0.26], [-0.85, -0.42, 0.4, 0.2], [-0.2, -0.42, 0.34, 0.2]]) part(g, box(w, 0.004, d), '#191b1c', x, PL.y, z, { outline: false });
  // The bridge: rails on both long sides, a gantry over, the head riding along it.
  for (const z of [-0.84, 0.54]) part(g, box(TW + 0.1, 0.05, 0.05), CHROME, 0, PL.top + 0.05, z);
  const bridge = group(g, -1.05, 0, 0);
  for (const z of [-0.84, 0.54]) part(bridge, rbox(0.2, 0.34, 0.14, 0.02), ORANGE, 0, PL.top + 0.22, z);
  part(bridge, rbox(0.14, 0.16, 1.5, 0.02), ORANGE, 0, PL.top + 0.42, -0.15);
  label(bridge, BRAND, 0.42, 0.08, 0.075, PL.top + 0.42, -0.15, ORANGE, '#ffffff', Math.PI / 2);
  const head = group(bridge, 0.1, 0, -0.4);
  part(head, rbox(0.1, 0.22, 0.1, 0.012), '#263238', 0, PL.top + 0.32, 0);
  part(head, cyl(0.022, 0.012, 0.2, 10), '#c9a13b', 0, PL.top + 0.14, 0);
  // Its hose in a track.
  rod(bridge, v3(0, PL.top + 0.52, -0.15), v3(0.04, PL.top + 0.72, -0.84), 0.02, BLACK);
  // The console on its arm at the front right.
  part(g, box(0.06, 0.88, 0.06), FRAME, PL.console[0] + 0.1, 0.44, PL.console[2] - 0.08);
  const con = group(g, PL.console[0], PL.console[1], PL.console[2]);
  con.rotation.x = -0.55;
  part(con, rbox(0.5, 0.3, 0.07, 0.015), '#263238', 0, 0, 0);
  const screen = swapPic(con, 0.3, 0.22, -0.06, 0, 0.038);
  part(con, cyl(0.022, 0.022, 0.014, 12), '#2e7d32', 0.17, -0.04, 0.04, { rx: Math.PI / 2, outline: false });
  part(con, cyl(0.028, 0.028, 0.02, 12), RED, 0.17, 0.08, 0.042, { rx: Math.PI / 2, outline: false });
  // The hood's duct and the bin for parts; the warning lamp.
  rod(g, v3(1.3, 0.2, -0.86), v3(1.45, 0.2, -0.95), 0.08, '#78909c');
  part(g, box(0.56, 0.5, 0.42), '#546e7a', PL.bin[0], 0.25, PL.bin[2] - 0.02);
  part(g, box(0.5, 0.01, 0.36), '#23282b', PL.bin[0], 0.505, PL.bin[2] - 0.02, { outline: false });
  label(g, '절단 부재', 0.3, 0.06, PL.bin[0], 0.3, PL.bin[2] + 0.2, YELLOW, INK);
  const inBin = group(g, PL.bin[0], 0.53, PL.bin[2] - 0.02);
  part(inBin, box(0.42, 0.02, 0.28), PLATE, 0, 0, 0);
  part(g, cyl(0.016, 0.016, 0.34, 8), FRAME, 1.36, PL.top + 0.17, 0.52);
  const lamp = ownLit(g, cyl(0.05, 0.05, 0.1, 12), '#134d1a', 1.36, PL.top + 0.38, 0.52);
  // The part being cut: its outline traced by a dark kerf as the head goes round.
  const partM = group(g);
  part(partM, box(PL.rw, 0.018, PL.rd), '#8a979d', 0, -0.009, 0);
  part(partM, cyl(0.05, 0.05, 0.022, 14), '#191b1c', 0, -0.009, 0, { outline: false });
  const kerfs = Array.from({ length: 4 }, () => part(g, box(1, 0.003, 1), '#17191a', 0, PL.y + 0.001, 0, { outline: false }));
  const hole = part(g, box(PL.rw, 0.004, PL.rd), '#191b1c', PL.cx, PL.y + 0.0, PL.cz, { outline: false });
  const hot = ownLit(g, ball(0.012), '#ffb300', 0, PL.y + 0.003, 0);
  const spark = sparks(g, 16, 0.009);
  const arc = arcLight(g, 0.13);
  const pic = live(192, 140);
  const idle = painted('wd-plasma-idle', 192, 140, (c) => {
    c.fillStyle = '#0d1b2a';
    c.fillRect(0, 0, 192, 140);
    text(c, '절단 프로그램', 96, 42, 17, '#90caf9', 'center');
    text(c, 'B207-FR43.nc', 96, 76, 15, '#ffffff', 'center');
    text(c, '대기', 96, 108, 15, '#ffd54f', 'center');
  });
  let key = -1;
  const spots: Record<string, Spot> = { wdPlasmaCut: standAt(g, 'wdPlasma', PL.front) };
  spots['*'] = spots.wdPlasmaCut;
  drive(g, out, spots, (_now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    bridge.position.x = n.hx ?? -1.05;
    head.position.z = (n.hz ?? -0.4) - 0;
    const cut = n.cut ?? 0;
    // The sides so far.
    const pts: Array<[number, number]> = [0, 0.25, 0.5, 0.75, 1].map((u) => plasmaPath(u % 1 === 0 && u === 1 ? 0.9999 : u));
    kerfs.forEach((k, i) => {
      const f = Math.min(1, Math.max(0, cut * 4 - i));
      k.visible = f > 0.01;
      if (!k.visible) return;
      const a = pts[i];
      const b = pts[i + 1];
      const horiz = Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]);
      const L = (horiz ? Math.abs(b[0] - a[0]) : Math.abs(b[1] - a[1])) * f;
      k.scale.set(horiz ? L : 0.012, 1, horiz ? 0.012 : L);
      k.position.x = a[0] + ((b[0] - a[0]) * f) / 2;
      k.position.z = a[1] + ((b[1] - a[1]) * f) / 2;
    });
    const lifted = n.out ?? 0;
    const finished = (n.inBin ?? 0) > 0.5;
    hole.visible = lifted > 0.02 || finished;
    at(partM, P.part);
    inBin.visible = finished;
    const on = (n.arc ?? 0) > 0.5;
    const p: V | null = on ? [n.hx ?? 0, PL.y + 0.005, n.hz ?? 0] : null;
    arc(p, t);
    hot.visible = on;
    if (p) {
      place(hot, p);
      spark(1, p[0], p[1], p[2], t, 0, 0.05, 0.14, 0.24);
    } else spark(0, 0, 0, 0, t);
    setLit(lamp, (n.run ?? 0) > 0.5 ? (Math.sin(t * 7) > 0 ? '#4cff5f' : '#1a7a24') : '#134d1a');
    const shown = N ? Math.round((n.program ?? 0) * 8) + Math.round(cut * 100) * 10 : -1;
    if (shown === key) return;
    key = shown;
    if (!N) {
      screen.set(idle);
      return;
    }
    screen.set(pic((c) => {
      c.fillStyle = '#0d1b2a';
      c.fillRect(0, 0, 192, 140);
      text(c, 'B207-FR43', 8, 20, 14, '#90caf9');
      c.strokeStyle = '#90caf9';
      c.lineWidth = 2;
      c.strokeRect(26, 40, 110, 66);
      c.strokeStyle = '#ffb300';
      c.lineWidth = 3;
      const w = 110;
      const h = 66;
      const tot = (w + h) * 2 * cut;
      c.beginPath();
      c.moveTo(26, 40);
      let left = tot;
      const seg = (dx: number, dy: number, len: number, sx: number, sy: number) => {
        const l = Math.min(left, len);
        if (l <= 0) return;
        c.lineTo(sx + dx * l, sy + dy * l);
        left -= l;
      };
      seg(1, 0, w, 26, 40);
      seg(0, 1, h, 136, 40);
      seg(-1, 0, w, 136, 106);
      seg(0, -1, h, 26, 106);
      c.stroke();
      text(c, `${Math.round(cut * 100)}%`, 150, 76, 17, '#ffd54f');
      text(c, cut > 0 ? '절단 중' : '불러오는 중', 8, 130, 13, '#ffffff');
    }));
  });
  out.work = marker(g, PL.cx, PL.y, PL.cz);
}

// =============================================================================================
// 천장 크레인 (wdGantry, 5 × 2).

function gantry(g: THREE.Group, out: Built) {
  const B = GT.beam;
  // Two A-frames on rails, a yellow box beam, the hazard stripes.
  for (const sx of [-1, 1]) {
    const x = sx * 2.34;
    part(g, box(0.12, 0.08, 1.9), FRAME, x, 0.05, 0);
    for (const z of [-0.72, 0.72]) rod(g, v3(x, 0.08, z), v3(x, B - 0.1, 0), 0.05, YELLOW);
    part(g, box(0.12, 0.08, 0.5), YELLOW, x, B - 0.1, 0);
    part(g, box(0.08, 0.06, 1.2), YELLOW, x, 1.4, 0);
  }
  part(g, box(4.82, 0.3, 0.26), YELLOW, 0, B, 0);
  label(g, `${BRAND} 10톤 · 정격하중 준수`, 1.3, 0.14, 0, B, 0.135, YELLOW, INK);
  for (let i = 0; i < 12; i++) part(g, box(0.1, 0.03, 0.006), i % 2 ? '#1a1a1a' : YELLOW, -2.2 + i * 0.4, B - 0.135, 0.132, { rz: 0.5, outline: false });
  // Two trestles, a stack of plates stood waiting at the far left under the leg, and a lamp on the beam.
  trestle(g, -GT.x, GT.low - 0.03, 0, 1.3);
  trestle(g, GT.x, GT.low - 0.03, 0, 1.3);
  part(g, box(0.9, 0.3, 0.7), PLATE_D, 0, 0.15, -0.3);
  label(g, '자재', 0.2, 0.08, 0, 0.15, 0.052, '#ffffff', INK);
  const beacon = ownLit(g, cyl(0.07, 0.08, 0.12, 12), '#5d3c0a', 0, B + 0.2, 0.05);
  part(g, box(0.16, 0.06, 0.16), FRAME, 0, B + 0.17, 0.05);
  // The trolley on the beam and its chain block, the hook on its chain.
  const trolley = group(g, -GT.x, B, 0);
  part(trolley, rbox(0.44, 0.22, 0.5, 0.02), '#37474f', 0, 0.26, 0);
  for (const sx of [-0.15, 0.15]) for (const z of [-0.2, 0.2]) part(trolley, cyl(0.05, 0.05, 0.03, 10), BLACK, sx, 0.18, z, { rx: Math.PI / 2, outline: false });
  part(trolley, rbox(0.26, 0.34, 0.26, 0.03), '#ef6c00', 0, -0.3, 0);
  label(trolley, '호이스트', 0.2, 0.05, 0, -0.3, 0.135, '#ef6c00', '#ffffff');
  const chain = part(trolley, cyl(0.011, 0.011, 1, 6), '#9e9e9e', 0, 0, 0, { outline: false });
  const hook = group(g);
  part(hook, cyl(0.026, 0.026, 0.08, 10), YELLOW, 0, 0.04, 0);
  const hkr = part(hook, new THREE.TorusGeometry(0.038, 0.012, 6, 14, Math.PI * 1.5), '#ef6c00', 0, -0.03, 0, { ry: Math.PI / 2 });
  hkr.userData.ownGeometry = true;
  // The plate and its four chains.
  const load = group(g);
  part(load, box(1.5, 0.03, 0.8), PLATE, 0, 0.015, 0);
  part(load, box(0.34, 0.08, 0.004), PLATE_D, 0.5, 0.032, 0, { rx: Math.PI / 2, outline: false });
  label(load, 'FR.43', 0.26, 0.06, -0.5, 0.032, 0, CHALK, INK).rotation.x = -Math.PI / 2;
  const slings = [[-0.56, 0.28], [0.56, 0.28], [-0.56, -0.28], [0.56, -0.28]].map(([x, z]) => ({ x, z, set: limb(load, 0.007, '#9e9e9e'), lug: part(load, box(0.05, 0.05, 0.02), PLATE_D, x, 0.05, z) }));
  const A = new THREE.Vector3();
  const C = new THREE.Vector3();
  // The pendant: on its own cable from the trolley; a hand grips it.
  const pendant = group(g);
  part(pendant, rbox(0.08, 0.2, 0.05, 0.012), YELLOW, 0, 0, 0);
  ownLit(pendant, cyl(0.012, 0.012, 0.006, 10), '#2e7d32', 0, 0.05, 0.026).rotation.x = Math.PI / 2;
  ownLit(pendant, cyl(0.012, 0.012, 0.006, 10), '#c62828', 0, 0, 0.026).rotation.x = Math.PI / 2;
  const cable = limb(g, 0.006, BLACK);
  const P0 = new THREE.Vector3();
  const P1 = new THREE.Vector3();
  const clip = clipMesh(g, sheetTex('양중 일지', ['품명 FR.43', '중량 1.2t', '슬링 점검', '신호수', '착지 확인']));
  const signaller = person(g, LOOKS.mate, -2.0, 1.28, Math.PI * 0.82, 'male');
  const spots: Record<string, Spot> = { wdLiftPlate: standAt(g, 'wdLift', GT.back) };
  spots['*'] = spots.wdLiftPlate;
  drive(g, out, spots, (_now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const px = N ? (n.px ?? -GT.x) : -GT.x;
    const py = N ? (n.py ?? GT.low) : GT.low;
    const tx = N ? (n.trolley ?? px) : -GT.x;
    trolley.position.x = tx;
    load.position.set(px, py, 0);
    // The hook hangs over the trolley, at a height it keeps above the plate when hooked and higher when it isn't.
    const hooked = N ? (n.hooked ?? 0) : 0;
    const hy = py + 0.62 + (1 - hooked) * 0.5;
    place(hook, [tx, hy, 0]);
    const top = B - 0.46;
    chain.scale.y = Math.max(0.01, top - hy - 0.08);
    chain.position.y = (top + hy + 0.08) / 2 - B;
    slings.forEach((s) => {
      if (hooked < 0.05) {
        // Slack: lying over the plate.
        C.set(s.x * 0.4, 0.06, s.z * 0.6);
      } else C.set(tx - px, hy - 0.06 - py, 0);
      A.set(s.x, 0.075, s.z);
      s.set(A, C);
    });
    // The pendant.
    const hang: V = [tx + 0.02, 1.22, 0.56];
    const pp = (P.pend as V | null) ?? hang;
    place(pendant, pp);
    P0.set(tx + 0.02, B - 0.2, 0.1);
    P1.set(pp[0], pp[1] + 0.1, pp[2]);
    cable(P0, P1);
    at(clip, P.clip);
    setLit(beacon, (n.beacon ?? 0) > 0.5 && Math.sin(t * 8) > 0 ? '#ffb300' : '#5d3c0a');
    // The signaller stands well off in his vest whenever it's lifting.
    signaller.root.visible = (n.beacon ?? 0) > 0.5;
    if (signaller.root.visible) {
      const up = 1.5 + 0.05 * Math.sin(t * 3);
      signaller.armR(tmp.set(-2.05, up, 1.15).clone());
      signaller.armL(null);
      signaller.opts.nod = -0.2;
    }
  });
  out.work = marker(g, 0, 1.0, 0.4);
}

// =============================================================================================
// 보호구 보관함 (wdPpeLocker, 2 × 1).

function lockers(g: THREE.Group, out: Built) {
  const LH = 1.86;
  // Five lockers along the back, the second's door opens; a shelf and an extinguisher.
  for (let i = 0; i < 5; i++) {
    const x = -0.76 + i * 0.36;
    if (i === 2) continue;
    part(g, box(0.34, LH, 0.5), '#546e7a', x, LH / 2 + 0.04, -0.2);
    part(g, box(0.32, LH - 0.04, 0.012), '#78909c', x, LH / 2 + 0.04, 0.052);
    label(g, ['조강철', '용불꽃', '', '마철판', '공용'][i], 0.2, 0.055, x, 1.68, 0.06, '#ffffff', INK);
    for (let k = 0; k < 3; k++) part(g, box(0.18, 0.012, 0.004), '#3b4b53', x, 1.56 - k * 0.04, 0.059, { outline: false });
  }
  part(g, box(1.84, 0.05, 0.52), FRAME, 0, LH + 0.065, -0.2);
  label(g, '보호구 착용은 용접의 시작', 1.1, 0.13, 0, LH + 0.18, -0.02, YELLOW, INK);
  // Inside the open one: a dark back, what's hung in it.
  part(g, box(0.34, LH, 0.012), '#1f2a30', -0.04, LH / 2 + 0.04, -0.44);
  for (const sx of [-1, 1]) part(g, box(0.012, LH, 0.5), '#546e7a', -0.04 + sx * 0.165, LH / 2 + 0.04, -0.2);
  part(g, box(0.34, 0.012, 0.5), '#3b4b53', -0.04, 0.05, -0.2);
  part(g, box(0.32, 0.012, 0.44), '#3b4b53', -0.04, PP.mask[1] - 0.19, -0.22);
  part(g, cyl(0.008, 0.008, 0.32, 6), STEEL, -0.04, PP.apron[1] + 0.34, -0.04, { rz: Math.PI / 2, outline: false });
  const door = group(g, -0.2, 0, 0.056);
  part(door, box(0.32, LH - 0.04, 0.012), '#78909c', 0.16, LH / 2 + 0.04, 0);
  part(door, box(0.02, 0.1, 0.02), CHROME, 0.3, 1.08, 0.014, { outline: false });
  label(door, '내 사물함', 0.2, 0.055, 0.16, 1.68, 0.008, '#ffffff', INK);
  // A bench in front, boots beneath, a tray with a check sheet.
  const apron = group(g);
  const apronShape = () => {
    part(apron, rbox(0.34, 0.62, 0.02, 0.05), LEATHER, 0, -0.12, 0);
    part(apron, box(0.14, 0.14, 0.02), shade(LEATHER, 0.85), -0.0, 0.25, 0);
    for (const s of [-1, 1]) rod(apron, v3(s * 0.06, 0.32, 0), v3(s * 0.15, 0.2, 0), 0.008, '#5d3b1f');
    // A burn or two.
    part(apron, ball(0.012), '#2b1a10', 0.08, -0.05, 0.012, { outline: false });
    part(apron, ball(0.008), '#2b1a10', -0.06, -0.24, 0.012, { outline: false });
    // The back.
    label(apron, '가죽 앞치마', 0.16, 0.045, 0, -0.36, -0.012, LEATHER, '#ffffff', Math.PI);
  };
  apronShape();
  const gloves = group(g);
  for (const s of [-1, 1]) {
    part(gloves, rbox(0.1, 0.22, 0.05, 0.02), LEATHER, s * 0.06, 0, 0);
    part(gloves, cyl(0.055, 0.06, 0.1, 10), '#c28a4f', s * 0.06, -0.14, 0, { outline: false });
  }
  const mask = maskMesh(g);
  // Boots under, the shelf at the right with the sheet, the extinguisher.
  for (const x of [-0.4, -0.28, 0.42, 0.54]) {
    part(g, rbox(0.1, 0.2, 0.22, 0.03), '#3e2723', x, 0.13, 0.28);
    part(g, rbox(0.1, 0.05, 0.1, 0.02), '#3e2723', x, 0.03, 0.36);
  }
  part(g, box(0.5, 0.03, 0.32), FRAME, PP.shelf[0], PP.shelf[1] - 0.03, PP.shelf[2] - 0.08);
  part(g, box(0.05, PP.shelf[1] - 0.03, 0.05), FRAME, PP.shelf[0], (PP.shelf[1] - 0.03) / 2, PP.shelf[2] - 0.2);
  picture(g, sheetTex('보호구 점검', ['앞치마', '장갑', '안전화', '차광 렌즈', '방진 마스크']), 0.2, 0.26, PP.shelf[0], PP.shelf[1] - 0.012, PP.shelf[2] - 0.08, '#ffffff', 0, -Math.PI / 2);
  part(g, cyl(0.08, 0.08, 0.48, 14), RED, -0.84, 0.28, 0.32);
  part(g, cyl(0.02, 0.03, 0.05, 8), BLACK, -0.84, 0.54, 0.32, { outline: false });
  rod(g, v3(-0.84, 0.56, 0.32), v3(-0.76, 0.42, 0.36), 0.008, BLACK);
  const spots: Record<string, Spot> = { wdCheckPpe: standAt(g, 'wdPpe', PP.stand) };
  spots['*'] = spots.wdCheckPpe;
  drive(g, out, spots, (_now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    door.rotation.y = -(n.door ?? 0) * 1.7;
    at(apron, P.apron, PP.apron);
    apron.rotation.y = n.turn ?? 0;
    at(gloves, P.gloves, PP.gloves);
    showMask(mask, P, n, PP.mask);
    setLit(mask.lens, (n.lens ?? 0) > 0.5 ? '#3f5c6b' : '#21313a');
  });
  out.work = marker(g, 0, 1.1, 0.1);
}

// =============================================================================================
// 안전 게시판 (wdSafetyBoard, 2 × 1).

function safetyBoard(g: THREE.Group, out: Built) {
  for (const x of [-0.92, 0.92]) part(g, box(0.07, 2.1, 0.07), '#2e7d32', x, 1.05, -0.34);
  part(g, box(1.95, 1.25, 0.04), '#2e7d32', 0, 1.42, -0.36);
  part(g, box(1.84, 1.14, 0.012), PAPER, 0, 1.42, -0.334);
  part(g, box(2.05, 0.06, 0.2), '#1b5e20', 0, 2.1, -0.3);
  const pad = group(g, -0.0, 0, 0);
  picture(pad, painted('wd-board', 512, 312, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 512, 312);
    c.fillStyle = '#2e7d32';
    c.fillRect(0, 0, 512, 46);
    text(c, `${BRAND} 용접장 안전 게시판`, 256, 30, 24, '#ffffff', 'center');
    text(c, '무재해', 18, 96, 22, INK);
    c.fillStyle = '#1b5e20';
    c.fillRect(18, 108, 118, 58);
    text(c, '2 1 7', 76, 150, 36, '#ffeb3b', 'center');
    text(c, '일째', 146, 150, 20, INK);
    text(c, '오늘의 화기 작업', 18, 202, 18, RED);
    ['B-207 좌현 맞대기', '용접 부스 1 · 2', '절단장'].forEach((s, i) => text(c, s, 18, 228 + i * 26, 15, INK));
    text(c, 'TBM 순서', 270, 80, 20, '#2e7d32');
    ['1. 가연물 치우기', '2. 환기·가스 측정', '3. 불티막이·소화기', '4. 보호구 서로 확인'].forEach((s, i) => text(c, s, 270, 112 + i * 30, 17, INK));
    c.strokeStyle = '#90a4ae';
    c.strokeRect(270, 234, 220, 64);
    text(c, '화기 작업 허가서', 380, 262, 15, '#607d8b', 'center');
    text(c, '(여기에 게시)', 380, 284, 12, '#90a4ae', 'center');
  }), 1.82, 1.11, 0, 1.42, -0.326);
  // A line lighting as it's gone through.
  const lit = [0, 1, 2].map((i) => ownLit(g, ball(0.018), '#3d5a3f', 0.02, 1.665 - i * 0.104, -0.32));
  // Hung on the sides: the gas detector, the clipboard.
  part(g, box(0.09, 0.14, 0.12), FRAME, SB.detector[0], SB.detector[1] - 0.05, SB.detector[2] - 0.2);
  rod(g, v3(SB.detector[0], SB.detector[1] - 0.12, SB.detector[2] - 0.2), v3(0.92, 0.9, -0.34), 0.015, FRAME);
  const det = group(g);
  part(det, rbox(0.08, 0.14, 0.04, 0.012), YELLOW, 0, 0, 0);
  const detScreen = swapPic(det, 0.058, 0.044, 0, 0.03, 0.021);
  const dg = live(96, 72);
  const clip = clipMesh(g, sheetTex('화기 작업 허가', ['작업 장소', '가스 측정', '소화기', '감시자', '서명']));
  part(g, box(0.09, 0.02, 0.1), FRAME, SB.clip[0], SB.clip[1] - 0.07, SB.clip[2] - 0.05);
  rod(g, v3(SB.clip[0], SB.clip[1] - 0.08, SB.clip[2] - 0.08), v3(-0.92, 0.9, -0.34), 0.015, FRAME);
  const sheet = picture(g, sheetTex('허가 완료', ['B-207', '산소 20.9%', '소화기 2', '화기 감시', '서명함']), 0.2, 0.2, 0.46, 1.33, -0.32);
  const chief = person(g, LOOKS.chief, SB.boss[0], SB.boss[1], Math.PI * 0.72, 'male');
  const m1 = person(g, LOOKS.foreman, SB.crew[0][0], SB.crew[0][1], -Math.PI * 0.86, 'female');
  const m2 = person(g, LOOKS.mate, SB.crew[1][0], SB.crew[1][1], Math.PI, 'male');
  const spots: Record<string, Spot> = { wdMorningTalk: standAt(g, 'wdTbm', SB.stand), wdHotPermit: standAt(g, 'wdPermit', SB.stand) };
  spots['*'] = spots.wdMorningTalk;
  let shown = -1;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const tbm = now === 'wdMorningTalk';
    chief.root.visible = m1.root.visible = m2.root.visible = tbm;
    const line = n.line ?? 0;
    lit.forEach((m, i) => setLit(m, tbm && Math.round(line) === i + 1 ? '#7dff7a' : '#3d5a3f'));
    if (tbm) {
      const shout = n.shout ?? 0;
      chief.armR(shout > 0.2 ? tmp.set(SB.boss[0] - 0.05, 1.82, SB.boss[1]).clone() : line > 0.5 ? tmp.set(0.0, 1.63 - (Math.round(line) - 1) * 0.1, -0.3).clone() : null);
      chief.armL(null);
      chief.opts.nod = -0.02 + 0.08 * Math.abs(Math.sin(t * 2.6)) * (n.speak ?? 0);
      for (const [f, [x, z]] of [[m1, SB.crew[0]], [m2, SB.crew[1]]] as Array<[Fig, [number, number]]>) {
        f.armR(shout > 0.2 ? tmp.set(x + 0.14, 1.78, z).clone() : null);
        f.armL(null);
        f.opts.nod = 0.1 + 0.05 * Math.sin(t * 1.3 + x);
      }
    }
    at(det, P.det, SB.detector);
    if (P.det) {
      const s = Math.round((n.reading ?? 0) * 10);
      if (s !== shown) {
        shown = s;
        detScreen.set(dg((c) => {
          c.fillStyle = '#0b2410';
          c.fillRect(0, 0, 96, 72);
          text(c, `O₂ ${(20 + 0.9 * (n.reading ?? 0)).toFixed(1)}`, 48, 30, 20, '#8dff94', 'center');
          text(c, 'LEL 0', 48, 56, 18, '#8dff94', 'center');
        }));
      }
    }
    at(clip, P.clip, SB.clip);
    sheet.visible = (n.pinned ?? 0) > 0.5;
  });
  out.work = marker(g, 0, 1.4, -0.28);
}

// =============================================================================================
// 조선소 콘크리트 야드 (wdYardSlab, 16 × 13): flat on the ground, walked over.

function yardSlab(g: THREE.Group, W: number, D: number) {
  const scale = 40;
  const tex = painted('wd-yard', W * scale, D * scale, (c) => {
    const w = W * scale;
    const h = D * scale;
    c.fillStyle = '#9a9c98';
    c.fillRect(0, 0, w, h);
    // Pours of concrete, each a little different, with its joints.
    for (let y = 0; y < D; y += 3) for (let x = 0; x < W; x += 4) {
      const v = 148 + ((x * 13 + y * 29) % 17);
      c.fillStyle = `rgb(${v},${v + 2},${v - 3})`;
      c.fillRect(x * scale + 1, y * scale + 1, 4 * scale - 2, 3 * scale - 2);
    }
    c.strokeStyle = '#6f716e';
    c.lineWidth = 2;
    for (let y = 0; y <= D; y += 3) {
      c.beginPath();
      c.moveTo(0, y * scale);
      c.lineTo(w, y * scale);
      c.stroke();
    }
    for (let x = 0; x <= W; x += 4) {
      c.beginPath();
      c.moveTo(x * scale, 0);
      c.lineTo(x * scale, h);
      c.stroke();
    }
    // Stains and scorches.
    for (let i = 0; i < 46; i++) {
      const x = ((i * 397) % 97) / 97;
      const y = ((i * 263) % 89) / 89;
      c.fillStyle = i % 3 ? 'rgba(60,56,50,0.13)' : 'rgba(120,70,40,0.12)';
      c.beginPath();
      c.ellipse(x * w, y * h, 10 + (i % 7) * 8, 7 + (i % 5) * 6, i, 0, Math.PI * 2);
      c.fill();
    }
    // The walkway: yellow lines across the middle and up the side, with its words and arrows.
    c.strokeStyle = '#e7b416';
    c.lineWidth = 6;
    const hline = (y0: number) => {
      c.beginPath();
      c.moveTo(0.3 * scale, y0 * scale);
      c.lineTo(15.6 * scale, y0 * scale);
      c.stroke();
    };
    hline(8.1);
    hline(8.9);
    c.save();
    c.translate(2.5 * scale, 8.62 * scale);
    c.font = `bold ${0.46 * scale}px sans-serif`;
    c.fillStyle = '#e7b416';
    c.fillText('안전 통로', 0, 0);
    c.fillText('→', 3 * scale, 0);
    c.fillText('안전 통로', 8 * scale, 0);
    c.restore();
    // Rails let into the floor under the crane.
    c.strokeStyle = '#4a4d4f';
    c.lineWidth = 4;
    for (const x of [8.16, 12.84]) {
      c.beginPath();
      c.moveTo(x * scale, 0.7 * scale);
      c.lineTo(x * scale, 3.3 * scale);
      c.stroke();
    }
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(W, D), textured(tex));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.012;
  m.receiveShadow = true;
  g.add(m);
}

// =============================================================================================
// The block assembly shop (2026-11-05, the layout audit: the welding yard was an open lawn with a block the size of a shed).

/**
 * 조립 공장 철골·천장 크레인 (anchored at the hall's back left corner, tile 0,3; the hall runs to world x 17 and z 15): H-section
 * columns down both sides, the crane runway on brackets along them, the roof trusses across, the corrugated cladding high on the
 * back and the side (open below, as a shop's lower walls are rolled up in summer), the shop's sign on the front header. The 30-ton
 * overhead crane spans the hall over the block, its hoist down to the spreader beam above the work.
 */
function shopFrame(g: THREE.Group) {
  const ox = 0.5;
  const oz = 3.5;
  const X = (x: number) => x - ox;
  const Z = (z: number) => z - oz;
  const H = 7.2;
  const RUN = 5.5;
  const xs = [0.25, 16.75];
  const zs = [3.25, 7.2, 11.15, 14.75];
  for (const x of xs)
    for (const z of zs) {
      part(g, box(0.3, H, 0.06), FRAME, X(x), H / 2, Z(z) - 0.12);
      part(g, box(0.3, H, 0.06), FRAME, X(x), H / 2, Z(z) + 0.12);
      part(g, box(0.06, H, 0.24), FRAME, X(x), H / 2, Z(z));
      part(g, box(0.5, 0.06, 0.5), '#37474f', X(x), 0.03, Z(z), { outline: false });
      // The runway bracket.
      part(g, box(0.5, 0.3, 0.3), FRAME, X(x) + (x < 8 ? 0.3 : -0.3), RUN - 0.15, Z(z));
      for (let i = 0; i < 4; i++) part(g, box(0.31, 0.25, 0.25), i % 2 ? BLACK : YELLOW, X(x), 0.15 + i * 0.25, Z(z), { outline: false });
    }
  // The crane runway along each side, its rail on top.
  for (const x of xs) {
    const xr = X(x) + (x < 8 ? 0.42 : -0.42);
    part(g, box(0.3, 0.55, 11.6), '#546e7a', xr, RUN + 0.27, Z(9));
    part(g, box(0.08, 0.06, 11.6), '#263238', xr, RUN + 0.58, Z(9), { outline: false });
  }
  // The roof trusses across, at each column line: top and bottom chords and the diagonals between.
  for (const z of zs) {
    part(g, box(16.6, 0.2, 0.16), '#78909c', X(8.5), H, Z(z));
    part(g, box(16.6, 0.12, 0.12), '#78909c', X(8.5), H - 0.9, Z(z), { outline: false });
    for (let i = 0; i < 12; i++) {
      const xa = 0.4 + i * 1.35;
      rod(g, v3(X(xa), H - 0.9, Z(z)), v3(X(xa + 1.35), H, Z(z)), 0.035, '#90a4ae');
    }
  }
  // Purlins along, so it reads as a roof frame from above.
  for (let i = 0; i < 7; i++) part(g, box(0.08, 0.1, 11.6), '#90a4ae', X(1.2 + i * 2.5), H + 0.12, Z(9), { outline: false });
  // Cladding high on the back (over the quay) and on the west side: corrugated panels with ribs.
  const clad = '#b0bec5';
  part(g, box(16.4, 2.8, 0.05), clad, X(8.5), H - 1.4, Z(3.1));
  for (let i = 0; i < 40; i++) part(g, box(0.05, 2.8, 0.07), '#90a4ae', X(0.6 + i * 0.41), H - 1.4, Z(3.1), { outline: false });
  part(g, box(0.05, 2.8, 11.6), clad, X(0.08), H - 1.4, Z(9));
  for (let i = 0; i < 28; i++) part(g, box(0.07, 2.8, 0.05), '#90a4ae', X(0.08), H - 1.4, Z(3.4 + i * 0.41), { outline: false });
  // The front header and the shop's sign.
  part(g, box(16.6, 0.6, 0.2), '#eceff1', X(8.5), H - 0.45, Z(14.85));
  label(g, `${BRAND} 블록 조립 2공장`, 3.6, 0.42, X(8.5), H - 0.45, Z(14.85) + 0.11, '#eceff1', HULL);
  label(g, '안전제일', 1.0, 0.4, X(2.2), H - 0.45, Z(14.85) + 0.11, '#2e7d32', '#ffffff');
  // The overhead crane: the box girder across the hall, its end trucks on the runways, the hoist trolley, the hook down to the
  // spreader beam over the block, the pendant hanging.
  const cz = Z(6.4);
  const girder = '#f9a825';
  part(g, box(15.6, 0.7, 0.6), girder, X(8.5), RUN + 1.0, cz);
  for (let i = 0; i < 20; i++) part(g, box(0.25, 0.08, 0.008), i % 2 ? BLACK : girder, X(1.4 + i * 0.75), RUN + 0.68, cz + 0.305, { rz: 0.6, outline: false });
  label(g, `${BRAND} 30톤 · 정격하중 준수`, 2.6, 0.32, X(8.5), RUN + 1.0, cz + 0.31, girder, INK);
  for (const x of xs) part(g, box(0.5, 0.45, 2.2), '#ef6c00', X(x) + (x < 8 ? 0.42 : -0.42), RUN + 0.85, cz);
  const tx = X(7.5);
  part(g, rbox(1.2, 0.7, 1.1, 0.04), '#37474f', tx, RUN + 1.7, cz);
  part(g, cyl(0.24, 0.24, 0.9, 16), '#455a64', tx, RUN + 1.75, cz, { rz: Math.PI / 2 });
  for (const dx of [-0.3, 0.3]) part(g, cyl(0.02, 0.02, 2.0, 6), '#212121', tx + dx, RUN - 0.0, cz, { outline: false });
  part(g, box(0.5, 0.35, 0.3), '#ef6c00', tx, RUN - 1.1, cz);
  part(g, box(4.2, 0.22, 0.22), YELLOW, tx, RUN - 1.6, cz);
  for (const dx of [-1.9, 1.9]) rod(g, v3(tx + dx, RUN - 1.6, cz), v3(tx + dx * 0.7, 3.2, cz + 0.4), 0.02, '#212121');
  rod(g, v3(X(10.5), RUN + 0.6, cz + 0.3), v3(X(10.5), 1.4, cz + 0.3), 0.008, '#212121');
  part(g, rbox(0.12, 0.3, 0.08, 0.02), YELLOW, X(10.5), 1.3, cz + 0.3);
  // Walkways painted on the floor: yellow lines down the hall and across the front.
  for (const x of [0.9, 15.6]) part(g, box(0.1, 0.004, 11.2), YELLOW, X(x), 0.012, Z(9), { outline: false });
  part(g, box(14.6, 0.004, 0.1), YELLOW, X(8.25), 0.012, Z(9.4), { outline: false });
}

/**
 * 선체 블록 (이중저·외판, 12 × 3, behind the working face wdHullBlock): the rest of the block, a double bottom 12 m long on its keel
 * blocks, the floors and girders standing open on top of it, the side shell rising behind with its bilge curve, the staging towers
 * at both ends, the block's number and the hull's.
 */
function blockMass(g: THREE.Group, W: number, D: number) {
  const L = W - 0.2;
  const BOTTOM = 0.4;
  const TOP = 2.75;
  for (let i = 0; i < 8; i++) {
    const x = -L / 2 + 0.6 + i * ((L - 1.2) / 7);
    part(g, box(0.5, 0.26, D - 0.5), '#6d5236', x, 0.13, 0);
    part(g, box(0.34, 0.1, D - 0.7), YELLOW, x, 0.31, 0);
  }
  const z0 = -D / 2 + 0.2;
  const z1 = D / 2 - 0.05;
  part(g, box(L, TOP - BOTTOM, z1 - z0), PRIMER, 0, (TOP + BOTTOM) / 2, (z0 + z1) / 2);
  part(g, box(L, 0.06, z1 - z0), HULL, 0, TOP, (z0 + z1) / 2);
  part(g, box(L, 0.04, z1 - z0 + 0.02), PRIMER_D, 0, 1.5, (z0 + z1) / 2, { outline: false });
  // On top: floors across and girders along, open, the inner bottom showing between.
  for (let i = 0; i <= 16; i++) part(g, box(0.05, 0.75, z1 - z0 - 0.3), PRIMER_D, -L / 2 + 0.2 + i * ((L - 0.4) / 16), TOP + 0.38, (z0 + z1) / 2 + 0.15);
  for (const z of [0.1, 0.9]) part(g, box(L - 0.3, 0.6, 0.05), '#7a3325', 0, TOP + 0.3, z);
  // The side shell behind, rising with the bilge's curve, frames inside it.
  const shellZ = z0 + 0.25;
  part(g, box(L, 2.5, 0.12), PRIMER, 0, TOP + 1.25, shellZ);
  part(g, box(L, 0.6, 0.6), PRIMER, 0, TOP - 0.05, shellZ + 0.15, { rx: 0.7 });
  part(g, box(L, 0.08, 0.5), HULL, 0, TOP + 2.5, shellZ + 0.2);
  for (let i = 0; i <= 12; i++) part(g, box(0.05, 2.4, 0.3), '#7a3325', -L / 2 + 0.3 + i * ((L - 0.6) / 12), TOP + 1.25, shellZ + 0.2);
  picture(g, painted('wd-block2', 512, 200, (c) => {
    c.clearRect(0, 0, 512, 200);
    text(c, 'B-206 · B-208', 256, 96, 80, '#ffffff', 'center');
    text(c, `${BRAND}  H.3317  좌현 이중저 · 외판`, 256, 166, 30, '#ffe082', 'center');
  }), 2.6, 1.0, -3.6, TOP + 1.5, shellZ + 0.07);
  // Weld seams, done and pale, at the plate joints of the shell.
  for (const x of [-3.6, 0, 3.6]) part(g, cyl(0.009, 0.009, 2.4, 6), BEAD_C, x, TOP + 1.25, shellZ + 0.065, { outline: false });
  // Staging towers at each end with a ladder.
  for (const sx of [-1, 1]) {
    const x = sx * (L / 2 + 0.05) - sx * 0.55;
    for (const dx of [-0.45, 0.45]) for (const dz of [-0.6, 0.6]) part(g, cyl(0.025, 0.025, 5.4, 8), '#90a4ae', x + dx, 2.7, dz, { outline: false });
    for (const y of [1.0, 2.8, 4.6]) part(g, box(1.0, 0.05, 1.3), '#d4a95e', x, y, 0);
    for (let i = 0; i < 12; i++) part(g, box(0.4, 0.03, 0.03), '#90a4ae', x + sx * 0.5, 0.3 + i * 0.4, 0.75, { outline: false });
  }
}

/** 용접 차광막 (1 × 1): a three-leaf steel frame with the red-tinted welding curtain hung in it, folded round the front of a seam. */
function weldScreen(g: THREE.Group) {
  const curtain = new THREE.MeshToonMaterial({ color: '#d84315', transparent: true, opacity: 0.72 });
  const leaves: Array<[number, number, number]> = [[-0.4, 0.05, 0.6], [0, -0.32, 0], [0.4, 0.05, -0.6]];
  for (const [x, z, ry] of leaves) {
    const leaf = group(g, x, 0, z, ry);
    for (const dx of [-0.38, 0.38]) part(leaf, box(0.03, 1.8, 0.03), '#78909c', dx, 0.9, 0, { outline: false });
    part(leaf, box(0.8, 0.03, 0.03), '#78909c', 0, 1.8, 0, { outline: false });
    for (const dx of [-0.38, 0.38]) part(leaf, box(0.03, 0.03, 0.4), '#78909c', dx, 0.02, 0, { outline: false });
    const m = new THREE.Mesh(box(0.74, 1.5, 0.01), curtain);
    m.position.set(0, 1.0, 0);
    leaf.add(m);
  }
  label(g, '차광막', 0.24, 0.07, 0, 1.65, -0.3, YELLOW, INK);
}

/** 사물함·방화복 걸이 (2 × 1, against the wall): four tall steel lockers with their names, a rail of fire-resistant jackets, helmets on top, a bench. */
function changeLockers(g: THREE.Group, W: number) {
  for (let i = 0; i < 4; i++) {
    const x = -W / 2 + 0.28 + i * 0.36;
    part(g, rbox(0.34, 1.8, 0.45, 0.01), '#78909c', x, 0.9, -0.24);
    part(g, box(0.3, 0.012, 0.01), '#455a64', x, 1.55, -0.012, { outline: false });
    part(g, box(0.03, 0.12, 0.02), '#cfd8dc', x + 0.11, 1.0, -0.01, { outline: false });
    part(g, ball(0.12), [YELLOW, '#fafafa', YELLOW, ORANGE][i], x, 1.92, -0.24).scale.set(1, 0.7, 1.1);
  }
  part(g, cyl(0.015, 0.015, 0.6, 8), CHROME, W / 2 - 0.35, 1.7, -0.3, { rz: Math.PI / 2, outline: false });
  for (let i = 0; i < 2; i++) {
    part(g, box(0.24, 0.7, 0.12), '#1f3d5a', W / 2 - 0.48 + i * 0.26, 1.3, -0.3);
    part(g, box(0.25, 0.04, 0.13), '#cddc39', W / 2 - 0.48 + i * 0.26, 1.15, -0.3, { outline: false });
  }
  part(g, box(W - 0.3, 0.06, 0.3), '#8d6e63', 0, 0.42, 0.25);
  for (const x of [-W / 2 + 0.3, W / 2 - 0.3]) part(g, box(0.05, 0.4, 0.26), '#455a64', x, 0.2, 0.25, { outline: false });
  label(g, '방화복 · 안전모 착용 후 입장', 0.9, 0.08, 0, 2.02, 0.0, YELLOW, INK);
}

/**
 * 안벽 의장 중인 선박 (18 × 2, on the water behind the shop): the side of a ship lying low at the fitting-out quay, its red bottom at
 * the waterline, the dark blue topside with the hull number, the bulwark, a deck crane with its jib lowered into its rest along the
 * deck, fenders against the quay. Kept low and clear of the shop's end (2026-11-06, the layout audit: a tall hull and deckhouse hid
 * the yard and the shop from the north), so the lot reads from every side; it stops short of the shop, whose end is the last 3 tiles.
 */
function quayShip(g: THREE.Group, W: number, D: number) {
  const L = W - 3.6;
  const cx = -1.6;
  part(g, box(L, 0.9, D - 0.4), '#a33a2a', cx, 0.25, -0.1);
  part(g, box(L, 1.2, D - 0.4), '#1f3d5a', cx, 1.3, -0.1);
  part(g, box(L, 0.08, D - 0.35), '#fafafa', cx, 0.72, -0.1, { outline: false });
  part(g, box(L, 0.45, 0.08), '#1f3d5a', cx, 2.12, D / 2 - 0.3);
  part(g, box(L, 0.05, 0.12), '#fafafa', cx, 2.36, D / 2 - 0.3, { outline: false });
  // The bow's rake at the west end, the stern's square end at the east.
  part(g, box(0.9, 1.6, D - 0.6), '#1f3d5a', cx - L / 2 - 0.3, 1.25, -0.1, { ry: 0.5 });
  label(g, 'H.3315', 1.4, 0.45, cx - L / 2 + 2.5, 1.35, D / 2 - 0.29, '#1f3d5a', '#ffffff');
  label(g, `${BRAND}`, 2.4, 0.4, cx + 1.5, 1.35, D / 2 - 0.29, '#1f3d5a', '#ffe082');
  // A deck crane, its jib lowered along the deck into its rest.
  part(g, cyl(0.3, 0.35, 1.0, 16), '#f9a825', cx + 2, 2.4, -0.2);
  rod(g, v3(cx + 2, 2.9, -0.2), v3(cx - 3.5, 2.75, -0.2), 0.1, '#f9a825');
  part(g, box(0.2, 0.5, 0.2), '#f9a825', cx - 3.5, 2.45, -0.2);
  // Fenders between ship and quay.
  for (let i = 0; i < 5; i++) part(g, cyl(0.22, 0.22, 0.8, 12), '#212121', cx - L / 2 + 1.5 + i * 3, 0.95, D / 2 - 0.15, { rz: Math.PI / 2 });
}

export const BUILDERS: Record<string, Builder> = {
  weldingBooth(g, _W, _D, _c, _def, _ctx, out) {
    booth(g, out);
  },
  steelPlates(g, _W, _D, _c, _def, _ctx, out) {
    plates(g, out);
  },
  grinderStation(g, _W, _D, _c, _def, _ctx, out) {
    grinderStand(g, out);
  },
  inspectionRig(g, _W, _D, _c, _def, _ctx, out) {
    inspection(g, out);
  },
  wdYardSlab(g, W, D) {
    yardSlab(g, W, D);
  },
  wdHullBlock(g, _W, _D, _c, _def, _ctx, out) {
    hullBlock(g, out);
  },
  wdGasCart(g, _W, _D, _c, _def, _ctx, out) {
    gasCart(g, out);
  },
  wdPlasmaTable(g, _W, _D, _c, _def, _ctx, out) {
    plasma(g, out);
  },
  wdGantry(g, _W, _D, _c, _def, _ctx, out) {
    gantry(g, out);
  },
  wdPpeLocker(g, _W, _D, _c, _def, _ctx, out) {
    lockers(g, out);
  },
  wdSafetyBoard(g, _W, _D, _c, _def, _ctx, out) {
    safetyBoard(g, out);
  },
  wdShopFrame(g) {
    shopFrame(g);
  },
  wdBlockMass(g, W, D) {
    blockMass(g, W, D);
  },
  wdWeldScreen(g) {
    weldScreen(g);
  },
  wdChangeLockers(g, W) {
    changeLockers(g, W);
  },
  wdQuayShip(g, W, D) {
    quayShip(g, W, D);
  },
};
