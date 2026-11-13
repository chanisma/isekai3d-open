import * as THREE from 'three';
import { marker, rod, shade, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, label, painted, picture, seeded, text } from './doctor';
import { BP, CB, CO, DT, DV, DW, FR, OT, PK, PS, TM, drawerAt, rxNow, rxPhase } from './pharmacistMotion';
import type { RxMotion, RxNow } from './pharmacistMotion';
import { vroidFigure, type FigureOptions } from './vroidFigure';
import { pavementSign } from './dentist';

/**
 * The 약국 drawn as itself (2026-11-01 workplace pipeline, at the user's request), the made-up 새봄약국. The long
 * counter with its screen, its acrylic shield and a card reader on the customers' side; behind it the dispensary:
 * a wall of pill drawers, an automatic packer whose strip of printed sachets comes out into a basket, counting
 * tables, a bench with an ointment slab, a medicine fridge and a terminal for checking clashes. A wall of medicines
 * off the shelf, a blood-pressure chair and a waiting bench on the shop floor, the cartons in the stock room.
 *
 * Everything that moves follows the scripts in pharmacistMotion.ts. Every drug name here is made up.
 */

const BRAND = '새봄약국';
const GREEN = '#2e9e6b';
const GREEN_D = '#1b7a4f';
const MINT = '#dff3e8';
const INK = '#26332d';
const PAPER = '#fbfaf6';
const WHITE = '#f4f6f6';
const CARD = '#c79a6b';
const GLASS_C = '#cfeaf2';
const AMBER = '#7a4a22';
const UP = new THREE.Vector3(0, 1, 0);
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3();
type V = readonly [number, number, number];

/** Made-up medicines. */
const DRUGS = ['코시원정', '하루큐', '위편안', '노바린', '미소펜정', '페리온', '파스온', '비타모아', '솔비엔', '마이텐', '온목캡슐', '라온시럽'];
const TONES = ['#2e9e6b', '#1e88e5', '#ef5350', '#fb8c00', '#8e24aa', '#00897b', '#f9a825', '#5c6bc0'];

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
function pane(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, opacity = 0.26, ry = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: GLASS_C, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  m.rotation.y = ry;
  g.add(m);
  return m;
}
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
function standAt(g: THREE.Object3D, motion: RxMotion): Spot {
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
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, show: (now: string | null, N: RxNow | null, t: number) => void) {
  out.spots = spots;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const N = sp ? rxNow(sp.motion as RxMotion, t, rxPhase(g.getWorldPosition(tmp)), (sp.at.userData.height as number | undefined) ?? 1.6) : null;
    show(now, N, t);
  };
}
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
/** The pharmacy's green plate with its 약 mark. */
const signTex = () =>
  painted('rxSign', 320, 80, (c) => {
    c.fillStyle = GREEN_D;
    c.fillRect(0, 0, 320, 80);
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(40, 40, 28, 0, Math.PI * 2);
    c.fill();
    text(c, '약', 40, 41, 36, GREEN_D, 'center');
    text(c, BRAND, 84, 41, 38, '#ffffff');
  });
/** A slip with a clinic's heading and lines of (made-up) medicine. */
const slipTex = (name: string, lines: string[], flag = -1) =>
  painted(`rxSlip${name}`, 128, 180, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 128, 180);
    c.fillStyle = '#90a4ae';
    c.fillRect(0, 0, 128, 18);
    text(c, '처방전', 64, 10, 12, '#ffffff', 'center');
    text(c, name, 8, 30, 11, INK);
    lines.forEach((s, i) => {
      if (i === flag) {
        c.fillStyle = '#ffcdd2';
        c.fillRect(4, 44 + i * 22, 120, 20);
      }
      text(c, s, 8, 54 + i * 22, 13, INK);
    });
    c.fillStyle = '#c62828';
    c.beginPath();
    c.arc(104, 160, 11, 0, Math.PI * 2);
    c.fill();
  });
/** A row of medicine boxes, seen from the front, for a shelf. */
const rowTex = (key: string, n: number, seed: number) =>
  painted(`rxRow${key}`, 512, 72, (c) => {
    const r = seeded(seed);
    const w = 512 / n;
    for (let i = 0; i < n; i++) {
      const tone = TONES[Math.floor(r() * TONES.length)];
      const name = DRUGS[Math.floor(r() * DRUGS.length)];
      const h = 50 + r() * 22;
      c.fillStyle = '#ffffff';
      c.fillRect(i * w + 1, 72 - h, w - 2, h);
      c.fillStyle = tone;
      c.fillRect(i * w + 1, 72 - h, w - 2, h * 0.3);
      text(c, name, i * w + w / 2, 72 - h * 0.42, Math.min(13, w / 3.6), INK, 'center');
      c.fillStyle = tone;
      c.fillRect(i * w + 6, 62, w - 12, 4);
    }
  });

function medBox(g: THREE.Object3D, tone: string, name: string, w = 0.15, h = 0.1, d = 0.08): THREE.Group {
  const b = group(g);
  part(b, box(w, h, d), '#ffffff', 0, 0, 0);
  part(b, box(w + 0.002, h * 0.32, d + 0.002), tone, 0, h * 0.28, 0, { outline: false });
  label(b, name, w * 0.86, h * 0.34, 0, -h * 0.12, d / 2 + 0.002, '#ffffff', INK);
  return b;
}
function bottleMesh(g: THREE.Object3D, color = AMBER, cap = '#fafafa', r = 0.036, h = 0.12): THREE.Group {
  const b = group(g);
  part(b, cyl(r, r, h, 12), color, 0, h / 2, 0);
  part(b, cyl(r * 0.8, r * 0.8, 0.03, 10), cap, 0, h + 0.015, 0);
  part(b, cyl(r + 0.0015, r + 0.0015, h * 0.5, 12), PAPER, 0, h * 0.48, 0, { outline: false });
  return b;
}
function paperBag(g: THREE.Object3D): THREE.Group {
  const b = group(g);
  part(b, rbox(0.18, 0.24, 0.07, 0.012), '#fdfbf4', 0, 0.12, 0);
  part(b, box(0.182, 0.05, 0.072), GREEN, 0, 0.21, 0, { outline: false });
  label(b, '약 봉투', 0.13, 0.04, 0, 0.1, 0.037, '#fdfbf4', GREEN_D);
  return b;
}
function sachetMesh(g: THREE.Object3D, big = false): THREE.Group {
  const s = group(g);
  const k = big ? 1.5 : 1;
  part(s, box(0.11 * k, 0.09 * k, 0.003), '#f5fbff', 0, 0, 0, { outline: false });
  if (big)
    picture(s, painted('rxSachet', 128, 96, (c) => {
      c.fillStyle = '#f5fbff';
      c.fillRect(0, 0, 128, 96);
      text(c, '아침 · 점심 · 저녁', 64, 16, 15, GREEN_D, 'center');
      text(c, '식후 30분', 64, 38, 14, INK, 'center');
      c.fillStyle = '#ffffff';
      c.fillRect(30, 54, 68, 34);
      for (const [x, cc] of [[46, '#ffb74d'], [64, '#e57373'], [82, '#90caf9']] as const) {
        c.fillStyle = cc;
        c.beginPath();
        c.arc(x, 71, 7, 0, Math.PI * 2);
        c.fill();
      }
    }), 0.16, 0.13, 0, 0, 0.002);
  else part(s, box(0.085, 0.022, 0.0036), GREEN, 0, 0.022, 0, { outline: false });
  return s;
}
function clipboard(g: THREE.Object3D): THREE.Group {
  const b = group(g);
  part(b, box(0.2, 0.27, 0.012), '#8d6e63', 0, 0, 0);
  part(b, box(0.18, 0.24, 0.002), PAPER, 0, -0.01, 0.008, { outline: false });
  part(b, box(0.08, 0.02, 0.012), STEEL, 0, 0.125, 0.008, { outline: false });
  for (let i = 0; i < 4; i++) part(b, box(0.14, 0.008, 0.001), '#90a4ae', 0, 0.06 - i * 0.04, 0.0095, { outline: false });
  return b;
}
function penMesh(g: THREE.Object3D): THREE.Mesh {
  return part(g, cyl(0.006, 0.006, 0.13, 6), '#1565c0', 0, 0, 0, { rz: 1.2, ry: 0.5, outline: false });
}
function handset(g: THREE.Object3D): THREE.Group {
  const h = group(g);
  part(h, rbox(0.04, 0.18, 0.035, 0.012), BLACK, 0, 0, 0);
  part(h, rbox(0.05, 0.05, 0.05, 0.012), BLACK, 0, 0.08, 0.008, { outline: false });
  part(h, rbox(0.05, 0.05, 0.05, 0.012), BLACK, 0, -0.08, 0.008, { outline: false });
  return h;
}
function spatula(g: THREE.Object3D): THREE.Group {
  const s = group(g);
  part(s, cyl(0.009, 0.009, 0.12, 8), '#6d4c41', 0.09, 0.06, 0.03, { rz: 1.0, outline: false });
  part(s, box(0.11, 0.003, 0.028), CHROME, 0, 0.002, 0, { outline: false });
  return s;
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
function crateMesh(g: THREE.Object3D, color = '#2f7fc1'): THREE.Group {
  const b = group(g);
  part(b, box(0.46, 0.025, 0.34), shade(color, 0.85), 0, 0.012, 0);
  for (const sx of [-1, 1]) part(b, box(0.02, 0.24, 0.34), color, sx * 0.23, 0.12, 0);
  for (const sz of [-1, 1]) part(b, box(0.46, 0.24, 0.02), color, 0, 0.12, sz * 0.17);
  for (let i = 0; i < 4; i++) part(b, box(0.1, 0.12, 0.26), ['#ffffff', '#e3f2fd', '#fff3e0', '#e8f5e9'][i], -0.16 + i * 0.105, 0.14, 0, { outline: false });
  return b;
}

// ---------------------------------------------------------------------------------------------
// Other people: drawn, played by VRoid bodies when they've come.

interface Look {
  top: string;
  bottom: string;
  hair: string;
  skin?: string;
}
const SKIN = '#f1c9a5';
const LOOKS: Record<string, Look> = {
  a: { top: '#5c6bc0', bottom: '#37474f', hair: '#2b1b10' },
  elder: { top: '#8d6e63', bottom: '#4e4a44', hair: '#c8c8c8', skin: '#eac09a' },
  coat: { top: '#f5f7f7', bottom: '#455a64', hair: '#1a1a1a', skin: '#f8d9c0' },
};
interface Fig {
  root: THREE.Group;
  head: THREE.Group;
  armL(to: THREE.Vector3 | null): void;
  armR(to: THREE.Vector3 | null): void;
  opts: FigureOptions;
}
function person(parent: THREE.Object3D, look: Look, x: number, z: number, ry: number, gender?: 'female' | 'male', seat?: number): Fig {
  const root = group(parent, x, 0, z, ry);
  const skin = look.skin ?? SKIN;
  const dy = seat === undefined ? 0 : seat + 0.07 - 0.84;
  for (const sx of [-1, 1]) {
    if (seat === undefined) {
      rod(root, v3(sx * 0.085, 0.84, 0), v3(sx * 0.09, 0.08, 0.01), 0.056, look.bottom);
      part(root, rbox(0.09, 0.07, 0.2, 0.03), '#37474f', sx * 0.09, 0.035, 0.04);
    } else {
      rod(root, v3(sx * 0.09, seat + 0.07, -0.02), v3(sx * 0.1, seat + 0.06, 0.36), 0.056, look.bottom);
      rod(root, v3(sx * 0.1, seat + 0.06, 0.36), v3(sx * 0.1, 0.08, 0.4), 0.05, look.bottom);
      part(root, rbox(0.09, 0.07, 0.2, 0.03), '#37474f', sx * 0.1, 0.035, 0.44);
    }
  }
  part(root, rbox(0.3, 0.17, 0.2, 0.06), look.bottom, 0, 0.88 + dy, 0);
  part(root, rbox(0.34, 0.46, 0.21, 0.08), look.top, 0, 1.11 + dy, 0);
  part(root, cyl(0.045, 0.05, 0.08, 10), skin, 0, 1.37 + dy, 0, { outline: false });
  const head = group(root, 0, 1.51 + dy, 0);
  part(head, ball(0.112), skin, 0, 0, 0);
  for (const sx of [-1, 1]) part(head, ball(0.012), '#2b2b30', sx * 0.04, 0, 0.104, { outline: false });
  part(head, box(0.03, 0.006, 0.004), '#a1665e', 0, -0.045, 0.104, { outline: false });
  part(head, ball(0.118), look.hair, 0, 0.03, -0.03);
  part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0, 0.075, 0.075, { rx: -0.25 });
  const arm = (sx: number) => {
    const shoulder = v3(sx * 0.2, 1.31 + dy, 0);
    const restAt = v3(sx * 0.23, 0.82 + dy, 0.05);
    const upper = limb(root, 0.042, look.top);
    const lower = limb(root, 0.035, skin);
    const hand = part(root, ball(0.036), skin, 0, 0, 0, { outline: false });
    const loc = new THREE.Vector3();
    const elbow = new THREE.Vector3();
    const d = new THREE.Vector3();
    const bend = new THREE.Vector3();
    return (to: THREE.Vector3 | null) => {
      if (to) loc.copy(to).sub(root.position).applyAxisAngle(UP, -root.rotation.y);
      else loc.copy(restAt);
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
  const opts: FigureOptions = seat === undefined ? { gender } : { gender, seat, floor: 0 };
  const f = vroidFigure({ root, head, armL, armR }, opts);
  root.visible = false;
  return { ...f, opts };
}
function comes(f: Fig, there: number, x: number, z: number, dx: number, t: number) {
  f.root.visible = there > 0.02;
  if (!f.root.visible) return;
  const off = 1 - there;
  f.root.position.set(x + dx * off, off > 0.01 ? 0.012 * Math.abs(Math.sin(t * 9)) : 0, z);
}

// =============================================================================================
// 조제대 (dispensingTable, 2 × 1): a steel table, its shelf of stock along the back.

function dispensingTable(g: THREE.Group, out: Built, W: number) {
  const top = DT.top;
  part(g, rbox(W - 0.04, 0.04, 0.92, 0.012), WHITE, 0, top - 0.02, 0);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) part(g, box(0.05, top - 0.04, 0.05), STEEL, sx * (W / 2 - 0.1), (top - 0.04) / 2, sz * 0.38);
    part(g, box(0.03, 0.42, 0.03), STEEL, sx * (W / 2 - 0.1), top + 0.21, -0.38);
  }
  // Below: a shelf of paper bags and bins of vials.
  part(g, box(W - 0.2, 0.02, 0.76), STEEL, 0, 0.24, 0);
  for (let i = 0; i < 4; i++) {
    part(g, rbox(0.3, 0.16, 0.44, 0.012), ['#90caf9', '#a5d6a7', '#ffcc80', '#ce93d8'][i], -0.56 + i * 0.37, 0.33, 0.03);
    label(g, ['약병', '봉투', '라벨', '스푼'][i], 0.15, 0.05, -0.56 + i * 0.37, 0.33, 0.252, '#ffffff', INK);
  }
  // The stock shelf: bottles and boxes at a hand's reach, a gap where the one in use goes back.
  part(g, box(W - 0.2, 0.02, 0.2), WHITE, 0, 1.15, -0.32);
  const r = seeded(11);
  for (let i = 0; i < 11; i++) {
    const x = -0.76 + i * 0.15;
    if (Math.abs(x - DT.shelfBottle[0]) < 0.07) continue;
    const m = bottleMesh(g, i % 3 === 2 ? '#fafafa' : AMBER, ['#fafafa', '#e53935', '#1e88e5'][Math.floor(r() * 3)]);
    m.position.set(x, 1.16, -0.31);
  }
  label(g, '조제 · 검수 이중 확인', 1.1, 0.07, 0, 1.33, -0.27, MINT, GREEN_D);
  // The red lamp for what the emergency room rings for.
  const lamp = ownLit(g, ball(0.035), '#5a2020', 0.86, 1.33, -0.3);
  // The monitor, the keyboard.
  const mon = group(g, DT.screen[0], DT.screen[1], DT.screen[2]);
  part(mon, rbox(0.44, 0.28, 0.025, 0.012), BLACK, 0, 0, 0);
  part(g, cyl(0.02, 0.05, 0.1, 8), BLACK, DT.screen[0], top + 0.05, DT.screen[2] - 0.02);
  const screen = swapPic(mon, 0.4, 0.24, 0, 0, 0.014);
  const idle = painted('rxDtIdle', 256, 154, (c) => {
    c.fillStyle = '#eefaf3';
    c.fillRect(0, 0, 256, 154);
    c.fillStyle = GREEN;
    c.fillRect(0, 0, 256, 26);
    text(c, '조제 대기', 128, 14, 15, '#ffffff', 'center');
    ['홍○○  솔비엔 외 2', '김○○  노바린 외 1', '박○○  마이텐'].forEach((s, i) => text(c, s, 14, 52 + i * 32, 15, INK));
  });
  screen.set(idle);
  const liveS = live(256, 154);
  part(g, rbox(0.3, 0.018, 0.11, 0.006), '#37474f', DT.keys[0], top + 0.012, DT.keys[2]);
  // The label printer and a roll, the phone, the slip, the finished bags.
  part(g, rbox(0.2, 0.15, 0.22, 0.02), '#37474f', DT.printer[0], top + 0.075, DT.printer[2]);
  part(g, box(0.1, 0.003, 0.05), PAPER, DT.printer[0], top + 0.11, DT.printer[2] + 0.12, { outline: false });
  const printLed = ownLit(g, ball(0.01), '#1a3a22', DT.printer[0] + 0.07, top + 0.15, DT.printer[2] + 0.08);
  part(g, rbox(0.12, 0.03, 0.17, 0.01), BLACK, DT.phone[0], top + 0.015, DT.phone[2]);
  const phone = handset(g);
  phone.rotation.x = Math.PI / 2;
  const pad = group(g, 0, 0, 0);
  const slip = swapPic(pad, 0.13, 0.18, 0, 0, 0, 0, -Math.PI / 2);
  const slipPaper = slipTex('행복의원', ['코시원정  3일', '하루큐    3일', '위편안    3일']);
  slip.set(slipPaper);
  for (let i = 0; i < 2; i++) {
    const b = paperBag(g);
    b.position.set(DT.pile[0] + (i ? 0.11 : -0.09), top + 0.005, DT.pile[2] - 0.08 * i);
  }
  const bag = paperBag(g);
  const down = bottleMesh(g, AMBER, '#e53935');
  const tray = group(g);
  part(tray, rbox(0.32, 0.018, 0.22, 0.008), '#1976d2', 0, 0, 0);
  for (const sx of [-1, 1]) part(tray, box(0.008, 0.03, 0.22), '#1565c0', sx * 0.16, 0.02, 0, { outline: false });
  part(tray, box(0.32, 0.03, 0.008), '#1565c0', 0, 0.02, -0.11, { outline: false });
  part(tray, box(0.09, 0.012, 0.22), '#90caf9', -0.11, 0.012, 0, { outline: false });
  const pr = seeded(23);
  const pills = Array.from({ length: 18 }, (_, i) => {
    const m = part(tray, ball(0.014), i % 5 === 0 ? '#ffe082' : '#fafafa', 0, 0.018, 0);
    m.scale.y = 0.55;
    return { m, x: pr() * 0.12 + 0.0, z: (pr() - 0.5) * 0.15, side: -0.12 + pr() * 0.06, i };
  });
  const spat = spatula(g);
  const lab = group(g);
  part(lab, box(0.09, 0.05, 0.002), '#ffffff', 0, 0, 0, { outline: false });
  part(lab, box(0.07, 0.008, 0.0024), GREEN, 0, 0.012, 0, { outline: false });
  const labelOn = part(bag, box(0.1, 0.05, 0.003), '#ffffff', 0, 0.1, 0.04, { outline: false });
  // Two slips side by side for the review, a pen, a sheet for the trial's notes.
  const slipA = group(g);
  picture(slipA, slipTex('행복의원', ['코시원정  3일', '하루큐    3일', '위편안    3일']), 0.13, 0.18, 0, 0, 0, '#ffffff', 0, -Math.PI / 2);
  const slipB = group(g);
  picture(slipB, slipTex('다정내과', ['노바린    7일', '미소펜정  7일', '솔비엔    7일'], 1), 0.13, 0.18, 0, 0, 0, '#ffffff', 0, -Math.PI / 2);
  const circle = part(slipB, cyl(0.04, 0.04, 0.002, 18), '#ef5350', 0.01, 0.002, 0, { outline: false });
  circle.scale.z = 0.3;
  const tick = part(slipA, box(0.04, 0.002, 0.008), '#2e7d32', 0.03, 0.002, 0.07, { outline: false, ry: -0.5 });
  const sheet = group(g);
  part(sheet, box(0.18, 0.003, 0.25), PAPER, 0, 0, 0, { outline: false });
  for (let i = 0; i < 6; i++) part(sheet, box(0.13, 0.001, 0.006), '#90a4ae', 0, 0.002, -0.08 + i * 0.03, { outline: false });
  const pen = penMesh(group(g, 0, 0, 0));
  const penG = pen.parent as THREE.Group;
  const spots: Record<string, Spot> = { dispenseMeds: standAt(g, 'rxDispense'), urgentPrescription: standAt(g, 'rxUrgent'), pharmacist_trialData: standAt(g, 'rxTrial'), pharmacist_medReview: standAt(g, 'rxReview') };
  spots['*'] = spots.dispenseMeds;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const disp = now === 'dispenseMeds' || now === 'urgentPrescription';
    const trial = now === 'pharmacist_trialData';
    const review = now === 'pharmacist_medReview';
    setLit(lamp, now === 'urgentPrescription' ? (Math.sin(t * 8) > 0 ? '#ff3b30' : '#a02020') : '#5a2020');
    setLit(printLed, (n.printing ?? 0) > 0.05 ? '#66ff99' : '#1a3a22');
    at(pad, disp ? P.slip : null, disp ? undefined : DT.slip);
    at(bag, disp ? P.bag : null);
    labelOn.visible = (n.labelled ?? 0) > 0.5;
    if (disp) {
      at(down, P.bottle);
      down.rotation.z = -(n.tilt ?? 0) * 1.75;
    } else {
      at(down, DT.shelfBottle);
      down.rotation.z = 0;
    }
    at(tray, disp ? P.tray : null, DT.tray);
    tray.rotation.z = (n.trayTilt ?? 0) * 0.7;
    const shown = disp ? Math.round((n.pills ?? 0) * pills.length) : 0;
    const cnt = n.counted ?? 0;
    pills.forEach((p) => {
      p.m.visible = p.i < shown;
      const counted = p.i / pills.length < cnt / 5;
      p.m.position.set(counted ? p.side : p.x - 0.03, 0.022, p.z);
    });
    at(spat, disp ? P.spat : null);
    at(lab, disp ? P.lab : null);
    at(phone, review ? P.phone : null, DT.phone);
    slipA.visible = slipB.visible = review;
    if (review) {
      at(slipA, P.slipA);
      at(slipB, P.slipB);
      circle.visible = (n.circled ?? 0) > 0.05;
      circle.scale.x = 0.4 + 0.6 * (n.circled ?? 0);
      tick.visible = (n.ticked ?? 0) > 0.3;
    }
    at(sheet, trial ? P.sheet : null);
    at(penG, trial || review ? P.pen : null);
    if (trial || review || now === 'urgentPrescription') {
      const chart = n.chart ?? 0;
      const mark = n.mark ?? 0;
      screen.set(liveS((c) => {
        c.fillStyle = '#f8fbfa';
        c.fillRect(0, 0, 256, 154);
        const urgent = now === 'urgentPrescription';
        c.fillStyle = urgent ? '#c62828' : review ? '#6a4fb3' : GREEN;
        c.fillRect(0, 0, 256, 26);
        text(c, urgent ? '응급 처방 — 먼저 조제' : review ? '복용 약 중복 검토' : `임상 자료 ${['1', '2', '3'][Math.round(chart)]}`, 128, 14, 15, '#ffffff', 'center');
        if (urgent) {
          text(c, '응급실 요청', 14, 54, 16, INK);
          text(c, '페리온 주사 전 복용분', 14, 84, 15, INK);
          text(c, `${Math.round(100 * (n.bagFull ?? 0))}%`, 240, 124, 20, '#c62828', 'right');
        } else if (review) {
          text(c, '행복의원 + 다정내과', 14, 50, 14, INK);
          text(c, '코시원정 × 미소펜정', 14, 78, 15, (n.circled ?? 0) > 0.3 ? '#c62828' : INK);
          text(c, (n.ticked ?? 0) > 0.5 ? '의사 확인 완료' : (n.circled ?? 0) > 0.3 ? '함께 복용 주의' : '검토 중', 14, 110, 15, (n.ticked ?? 0) > 0.5 ? GREEN_D : '#c62828');
        } else {
          for (let i = 0; i < 8; i++) {
            const h = 20 + ((i * 37 + Math.round(chart) * 19) % 70);
            c.fillStyle = i < mark * 8 ? '#26a69a' : '#b2dfdb';
            c.fillRect(20 + i * 28, 140 - h, 20, h);
          }
        }
      }));
    } else screen.set(idle);
  });
  out.work = marker(g, DT.tray[0], top + 0.05, DT.tray[2]);
}

// =============================================================================================
// 약품 진열장 (pharmacyShelf, 1 × 1): an open steel rack of boxes.

function pharmacyShelf(g: THREE.Group, out: Built) {
  const H = 1.86;
  for (const sx of [-1, 1]) part(g, box(0.04, H, 0.5), WHITE, sx * 0.46, H / 2, -0.08);
  part(g, box(0.92, H, 0.02), MINT, 0, H / 2, -0.32, { outline: false });
  part(g, box(0.96, 0.12, 0.54), WHITE, 0, 0.06, -0.08);
  part(g, box(0.96, 0.04, 0.52), WHITE, 0, H, -0.08);
  PS.decks.forEach((y, row) => {
    part(g, box(0.88, 0.02, 0.48), '#ffffff', 0, y - 0.01, -0.08);
    part(g, box(0.88, 0.026, 0.005), ['#e8f5ee', '#fff3e0'][row % 2], 0, y - 0.015, 0.165, { outline: false });
    picture(g, rowTex(`S${row}`, 7, 40 + row * 3), 0.84, 0.15, 0, y + 0.085, -0.2);
  });
  // Single boxes at the front that can be taken out or are missing.
  const made = (x: number, y: number, tone: string, name: string) => {
    const m = medBox(g, tone, name);
    m.position.set(x, y + 0.055, PS.face);
    return m;
  };
  const gaps = PS.gaps.map(([x, y], i) => made(x, y, TONES[i], DRUGS[i]));
  const reads = PS.read.map(([x, y], i) => made(x, y, TONES[i + 3], DRUGS[i + 3]));
  for (const [x, y] of [[0.22, 0.38], [0.28, 1.14], [-0.3, 0.76], [-0.18, 1.52]] as const) made(x, y, TONES[Math.floor((x + 1) * 3) % 8], DRUGS[Math.floor((y + 1) * 3) % 12]);
  label(g, '의약품', 0.34, 0.09, 0, H + 0.075, -0.04, GREEN_D, '#ffffff');
  part(g, box(0.4, 0.11, 0.02), GREEN_D, 0, H + 0.075, -0.06);
  const crate = crateMesh(g);
  const basket = group(g);
  part(basket, cyl(0.17, 0.14, 0.26, 12), '#ef9a9a', 0, 0.13, 0);
  label(basket, '폐기', 0.14, 0.06, 0, 0.16, 0.172, '#ffffff', '#c62828');
  const tossed = medBox(basket, '#c62828', '페리온');
  tossed.position.set(0.02, 0.22, 0);
  const carried = medBox(g, TONES[0], DRUGS[0]);
  const dateBad = part(carried, box(0.1, 0.04, 0.002), '#c62828', 0, 0, 0.042, { outline: false });
  const tablet = group(g);
  part(tablet, rbox(0.2, 0.28, 0.012, 0.012), BLACK, 0, 0, 0);
  const tabS = swapPic(tablet, 0.18, 0.25, 0, 0, 0.008);
  const liveT = live(120, 160);
  const spots: Record<string, Spot> = { organizeStock: standAt(g, 'rxStock'), checkExpiry: standAt(g, 'rxExpiry'), pharmacist_orderStock: standAt(g, 'rxOrder') };
  spots['*'] = spots.organizeStock;
  drive(g, out, spots, (now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const stock = now === 'organizeStock';
    const exp = now === 'checkExpiry';
    const filled = n.filled ?? 0;
    gaps.forEach((m, i) => (m.visible = !stock || i < filled));
    const which = n.which;
    reads.forEach((m, i) => (m.visible = !exp || (i === 1 ? (n.gone ?? 0) < 0.5 && !(which === 1 && P.box) : !(which === i && P.box))));
    at(crate, stock ? P.crate : null);
    at(basket, exp ? P.basket : null);
    tossed.visible = (n.inBasket ?? 0) > 0.5;
    at(carried, P.box);
    carried.rotation.y = (n.turned ?? 0) * Math.PI * 0.9;
    dateBad.visible = (n.bad ?? 0) > 0.5;
    at(tablet, now === 'pharmacist_orderStock' || exp ? P.pad : null);
    if (tablet.visible) {
      tablet.rotation.x = -0.5;
      tabS.set(liveT((c) => {
        c.fillStyle = '#f7fbf9';
        c.fillRect(0, 0, 120, 160);
        c.fillStyle = GREEN;
        c.fillRect(0, 0, 120, 22);
        text(c, exp ? '유통기한 기록' : (n.sent ?? 0) > 0.5 ? '발주 완료' : '의약품 발주', 60, 12, 12, '#ffffff', 'center');
        const rows = exp ? ['코시원정 OK', '페리온 폐기', '라온시럽 OK'] : [`노바린  ${(n.qty ?? 0) > 0.5 ? 20 : 0}`, `솔비엔  ${(n.qty ?? 0) > 1.5 ? 10 : 0}`, '파스온  0'];
        rows.forEach((s, i) => text(c, s, 8, 46 + i * 30, 13, INK));
      }));
    }
  });
  out.work = marker(g, 0, 1.0, PS.face);
}

// =============================================================================================
// 약국 계산대 (pharmacyCounter, 2 × 1): front to the staff; customers on its back.

/** The long counter's body, shared with the wing: a green face to the customers, a pale top. */
function counterBody(g: THREE.Group, W: number) {
  const top = CO.top;
  part(g, rbox(W - 0.02, top - 0.05, 0.84, 0.015), GREEN, 0, (top - 0.05) / 2, -0.04);
  part(g, rbox(W, 0.05, 0.94, 0.012), '#f6f4ec', 0, top - 0.025, -0.03);
  part(g, box(W - 0.02, 0.07, 0.84), INK, 0, 0.035, -0.04, { outline: false });
  // The staff's side: shelves with bags and paper.
  part(g, box(W - 0.06, top - 0.16, 0.02), WHITE, 0, (top - 0.16) / 2 + 0.08, 0.37, { outline: false });
  part(g, box(W - 0.1, 0.02, 0.28), STEEL, 0, 0.5, 0.22);
  // The acrylic shield, an opening low down in the middle.
  for (const x of [-(W / 2) + 0.05, W / 2 - 0.05]) part(g, box(0.02, 0.45, 0.02), CHROME, x, top + 0.225, -0.08, { outline: false });
  pane(g, W - 0.1, 0.32, 0, top + 0.29, -0.08, 0.2);
  part(g, box(W - 0.1, 0.012, 0.015), CHROME, 0, top + 0.45, -0.08, { outline: false });
}
function pharmacyCounter(g: THREE.Group, out: Built, W: number) {
  const top = CO.top;
  counterBody(g, W);
  picture(g, signTex(), 1.2, 0.3, 0, 0.58, -0.462, '#ffffff', Math.PI);
  part(g, box(W - 0.14, 0.14, 0.2), '#fdfbf4', 0, 0.58, 0.22, { outline: false });
  // The screen to the staff, keys, the slip scanner, the tray for what goes to the dispensary.
  const sc = group(g, CO.screen[0], CO.screen[1], CO.screen[2]);
  sc.rotation.x = -0.14;
  part(sc, rbox(0.42, 0.28, 0.025, 0.012), BLACK, 0, 0, 0);
  part(g, cyl(0.016, 0.05, 0.2, 8), BLACK, CO.screen[0], top + 0.08, CO.screen[2] - 0.02);
  const screen = swapPic(sc, 0.38, 0.24, 0, 0, 0.014);
  const idle = painted('rxCoIdle', 256, 154, (c) => {
    c.fillStyle = '#eefaf3';
    c.fillRect(0, 0, 256, 154);
    c.fillStyle = GREEN;
    c.fillRect(0, 0, 256, 26);
    text(c, `${BRAND} 처방 접수`, 128, 14, 15, '#ffffff', 'center');
    text(c, '처방전을 스캔하세요', 128, 86, 17, INK, 'center');
  });
  screen.set(idle);
  const liveS = live(256, 154);
  part(g, rbox(0.34, 0.018, 0.13, 0.006), '#37474f', CO.keys[0], top + 0.012, CO.keys[2]);
  const scanner = group(g, CO.scan[0], top, CO.scan[2]);
  part(scanner, rbox(0.26, 0.04, 0.2, 0.012), '#37474f', 0, 0.02, 0);
  const beam = ownLit(scanner, box(0.2, 0.004, 0.012), '#20402c', 0, 0.042, 0);
  part(g, rbox(0.32, 0.06, 0.2, 0.012), '#a5d6a7', CO.basket[0], top + 0.03, CO.basket[2]);
  label(g, '조제실로', 0.2, 0.05, CO.basket[0], top + 0.03, CO.basket[2] + 0.102, '#ffffff', GREEN_D);
  const waiting = swapPic(group(g, CO.basket[0], top + 0.066, CO.basket[2]), 0.13, 0.18, 0, 0, 0, 0, -Math.PI / 2);
  waiting.set(slipTex('행복의원', ['코시원정  3일', '하루큐    3일', '위편안    3일']));
  // The card reader to the customer, little OTC temptations, a sign with the day's rules.
  const term = group(g, CO.term[0], CO.term[1], CO.term[2]);
  part(term, rbox(0.1, 0.05, 0.16, 0.012), BLACK, 0, 0, 0, { rx: 0.5 });
  const termLed = ownLit(term, box(0.07, 0.003, 0.06), '#1a2f22', 0, 0.03, 0.012);
  termLed.rotation.x = 0.5;
  part(g, box(0.34, 0.22, 0.1), WHITE, 0.72, top + 0.11, -0.4);
  for (let i = 0; i < 10; i++) part(g, box(0.05, 0.08, 0.024), TONES[i % 8], 0.59 + (i % 5) * 0.066, top + 0.06 + Math.floor(i / 5) * 0.09, -0.46, { outline: false });
  label(g, '복약 설명을 꼭 들으세요', 0.72, 0.07, -0.1, top + 0.4, -0.092, '#ffffff', GREEN_D, Math.PI);
  // What travels.
  const slip = group(g);
  picture(slip, slipTex('행복의원', ['코시원정  3일', '하루큐    3일', '위편안    3일']), 0.13, 0.18, 0, 0, 0, '#ffffff', 0, -Math.PI / 2);
  const bag = paperBag(g);
  const sachet = sachetMesh(g, true);
  const finger = part(g, cyl(0.02, 0.02, 0.002, 12), '#ffd54f', 0, 0, 0, { rx: Math.PI / 2, outline: false });
  // Who's come in. Only made when first needed.
  let cust: Fig | null = null;
  const custFig = () => (cust ??= person(g, LOOKS.a, CO.cust[0], CO.cust[1], 0));
  let junior: Fig | null = null;
  const juniorFig = () => (junior ??= person(g, LOOKS.coat, CO.junior[0], CO.junior[1], Math.PI / 2 + 0.3, 'female'));
  const card = part(g, box(0.085, 0.003, 0.055), '#1e88e5', 0, 0, 0, { outline: false });
  const spots: Record<string, Spot> = { checkPrescription: standAt(g, 'rxTakeRx'), rxExplainMeds: standAt(g, 'rxExplain'), pharmacist_trainStaff: standAt(g, 'rxTrain') };
  spots['*'] = spots.checkPrescription;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const lesson = now === 'pharmacist_trainStaff';
    at(slip, P.slip);
    at(bag, P.bag);
    at(sachet, P.sachet);
    if (sachet.visible) sachet.rotation.x = 0;
    waiting.mesh.visible = !now ? false : (n.inBasket ?? 0) > 0.5;
    setLit(beam, (n.scanning ?? 0) > 0.5 ? '#7cffb0' : '#20402c');
    setLit(termLed, (n.paid ?? 0) > 0.5 ? '#66ff99' : (n.cTap ?? 0) > 0.2 ? '#ffe082' : '#1a2f22');
    const pt = Math.round(n.pt ?? 0);
    finger.visible = pt > 0 && !!P.sachet;
    if (finger.visible && P.sachet) finger.position.set(P.sachet[0] - 0.05 + (pt - 1) * 0.05, P.sachet[1] + 0.05, P.sachet[2] + 0.004);
    if (now) {
      const L = n.lines ?? 0;
      screen.set(liveS((c) => {
        c.fillStyle = '#f8fbfa';
        c.fillRect(0, 0, 256, 154);
        c.fillStyle = (n.wrong ?? 0) > 0.5 ? '#c62828' : GREEN;
        c.fillRect(0, 0, 256, 26);
        if (now === 'rxExplainMeds') {
          text(c, (n.paid ?? 0) > 0.5 ? '수납 완료' : '복약 안내', 128, 14, 15, '#ffffff', 'center');
          ['아침  코시원정', '점심  하루큐', '저녁  위편안'].forEach((s, i) => text(c, s, 16, 52 + i * 30, 15, pt === i + 1 ? '#c62828' : INK));
        } else {
          text(c, (n.wrong ?? 0) > 0.5 ? '다시 확인하세요' : lesson ? '교육 모드' : '처방 확인', 128, 14, 15, '#ffffff', 'center');
          ['행복의원 · 3일분', '코시원정  1정 3회', '하루큐    1정 3회', '위편안    1포 3회'].slice(0, Math.floor(L)).forEach((s, i) => text(c, s, 14, 46 + i * 26, 14, INK));
        }
      }));
    } else screen.set(idle);
    if (now && !lesson) {
      const f = custFig();
      comes(f, n.cust ?? 0, CO.cust[0], CO.cust[1], -1.8, t);
      if (f.root.visible) {
        f.opts.lean = 0.14 * (n.cBow ?? 0) + 0.05;
        f.opts.nod = 0.1 + 0.16 * (n.cNod ?? 0) + 0.2 * (n.cBow ?? 0);
        const hand = n.cHand ?? 0;
        const tp = n.cTap ?? 0;
        f.armR(tp > 0.05 ? v3(CO.term[0], CO.term[1] + 0.06 + 0.03 * (1 - tp), CO.term[2] - 0.04 * (1 - tp)) : hand > 0.05 ? v3(CO.drop[0] + 0.02, CO.drop[1] + 0.05, CO.drop[2] - 0.14 * (1 - hand)) : null);
        f.armL((n.took ?? 0) > 0.5 ? v3(CO.bagFar[0] + 0.1, 1.03, CO.cust[1] + 0.3) : null);
        card.visible = tp > 0.05;
        if (card.visible) card.position.set(CO.term[0], CO.term[1] + 0.06 + 0.03 * (1 - tp), CO.term[2] - 0.04 * (1 - tp));
      } else card.visible = false;
    } else {
      if (cust) cust.root.visible = false;
      card.visible = false;
    }
    if (lesson) {
      const f = juniorFig();
      f.root.visible = true;
      f.armR((n.jTap ?? 0) > 0.5 ? v3(CO.keys[0] - 0.05 + 0.03 * Math.sin(t * 10), CO.keys[1] + 0.03, CO.keys[2]) : null);
      f.armL(null);
      f.opts.nod = (n.jNod ?? 0) > 0.5 ? 0.14 + 0.1 * Math.abs(Math.sin(t * 3)) : 0.24;
      f.opts.lean = (n.jTap ?? 0) > 0.5 ? 0.12 : 0.03;
    } else if (junior) junior.root.visible = false;
  });
  out.work = marker(g, CO.scan[0], top + 0.08, CO.scan[2]);
}

// =============================================================================================
// 약 수령 창구 (rxCounterWing, 3 × 1): the rest of the long counter, with its number board and bags waiting.

function counterWing(g: THREE.Group, W: number) {
  const top = CO.top;
  counterBody(g, W);
  picture(g, painted('rxWingFront', 512, 96, (c) => {
    c.fillStyle = GREEN;
    c.fillRect(0, 0, 512, 96);
    text(c, '처방약 받는 곳', 24, 34, 30, '#ffffff');
    text(c, '이름을 불러 드리면 오세요', 24, 72, 20, MINT);
  }), 1.6, 0.3, 0, 0.58, -0.462, '#ffffff', Math.PI);
  part(g, box(W - 0.14, 0.14, 0.2), '#fdfbf4', 0, 0.58, 0.22, { outline: false });
  // The number board facing the customers.
  part(g, rbox(0.56, 0.2, 0.05, 0.012), BLACK, 0.7, top + 0.14, -0.3);
  picture(g, painted('rxNumber', 224, 80, (c) => {
    c.fillStyle = '#10211a';
    c.fillRect(0, 0, 224, 80);
    text(c, '대기 번호', 56, 40, 20, '#9ff0c4', 'center');
    text(c, '027', 162, 40, 44, '#ffd54f', 'center');
  }), 0.5, 0.17, 0.7, top + 0.14, -0.327, '#ffffff', Math.PI);
  // Bags ready on the shelf behind the shield, a rack of cough sweets and masks for the customers.
  for (let i = 0; i < 5; i++) {
    const b = paperBag(g);
    b.position.set(-1.1 + i * 0.25, top, 0.2 - (i % 2) * 0.05);
  }
  part(g, box(0.56, 0.26, 0.12), WHITE, -0.72, top + 0.13, -0.38);
  for (let i = 0; i < 14; i++) part(g, box(0.06, 0.09, 0.024), TONES[(i * 3) % 8], -0.95 + (i % 7) * 0.076, top + 0.06 + Math.floor(i / 7) * 0.11, -0.45, { outline: false });
  label(g, '오늘의 약사  도은솔', 0.72, 0.07, 0, top + 0.08, -0.47, '#ffffff', GREEN_D, Math.PI);
  label(g, '오늘의 처방 준비 중', 0.72, 0.07, -0.3, top + 0.4, -0.092, MINT, GREEN_D);
}

// =============================================================================================
// 약장 (rxDrawerWall, 3 × 1): a whole wall of small labelled drawers, big bottles on top.

function drawerFront(g: THREE.Object3D, col: number, row: number, name: string, tone: string): THREE.Group {
  const d = group(g);
  part(d, rbox(0.34, 0.18, 0.012, 0.004), '#fbfcfb', 0, 0, 0.14);
  part(d, box(0.14, 0.012, 0.018), CHROME, 0, -0.045, 0.15, { outline: false });
  part(d, box(0.32, 0.016, 0.002), tone, 0, 0.076, 0.147, { outline: false });
  label(d, name, 0.24, 0.05, 0, 0.022, 0.1472, '#ffffff', INK);
  // The box behind the front, seen when it's pulled.
  part(d, box(0.3, 0.13, 0.28), '#eef2f2', 0, -0.015, 0, { outline: false });
  const [x, y, z] = drawerAt(col, row);
  d.position.set(x, y, z);
  return d;
}
function drawerWall(g: THREE.Group, out: Built, W: number) {
  const H = 1.95;
  part(g, rbox(W - 0.03, H, 0.36, 0.012), '#e8eded', 0, H / 2, -0.32);
  const r = seeded(101);
  const drawers: THREE.Group[] = [];
  for (let col = 0; col < 8; col++)
    for (let row = 0; row < 7; row++) {
      const isA = col === DW.a[0] && row === DW.a[1];
      const isB = col === DW.b[0] && row === DW.b[1];
      const name = DRUGS[Math.floor(r() * DRUGS.length)];
      const d = drawerFront(g, col, row, isA ? '코시원정' : isB ? '하루큐' : name, TONES[(col + row) % 8]);
      if (isA) drawers[0] = d;
      if (isB) drawers[1] = d;
    }
  // The ledge between them, pulled out to work on; bottles on the top.
  part(g, rbox(W - 0.06, 0.03, 0.56, 0.008), WHITE, 0, DW.ledge, -0.13);
  part(g, box(W - 0.1, 0.012, 0.012), GREEN, 0, DW.ledge - 0.012, 0.15, { outline: false });
  for (let i = 0; i < 12; i++) {
    const m = bottleMesh(g, i % 2 ? '#8d5a2b' : '#fafafa', ['#e53935', '#1e88e5', '#fafafa'][i % 3], 0.05, 0.16);
    m.position.set(-1.32 + i * 0.24, H, -0.3);
  }
  label(g, '조제용 약장  가나다순', 1.2, 0.08, 0, H - 0.08, -0.13, GREEN_D, '#ffffff');
  const fills = [0, 1].map((i) => {
    const f = part(drawers[i], box(0.27, 0.05, 0.25), i ? '#ffcdd2' : '#fff9c4', 0, 0.02, 0, { outline: false });
    f.scale.y = 0.2;
    return f;
  });
  const carton = group(g);
  part(carton, rbox(0.26, 0.15, 0.17, 0.006), CARD, 0, 0.075, 0);
  label(carton, '코시원정 100T', 0.2, 0.05, 0, 0.08, 0.087, '#ffffff', INK);
  const flow = Array.from({ length: 6 }, () => {
    const m = part(g, ball(0.012), '#fafafa', 0, 0, 0, { outline: false });
    m.visible = false;
    return m;
  });
  const pad = clipboard(g);
  const spots: Record<string, Spot> = { rxFillDrawers: standAt(g, 'rxFill') };
  spots['*'] = spots.rxFillDrawers;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const [ax, ay, az] = drawerAt(DW.a[0], DW.a[1]);
    const [bx, by, bz] = drawerAt(DW.b[0], DW.b[1]);
    drawers[0].position.set(ax, ay, az + 0.24 * (n.dA ?? 0));
    drawers[1].position.set(bx, by, bz + 0.24 * (n.dB ?? 0));
    fills[0].scale.y = 0.2 + 0.8 * (n.fA ?? 0);
    fills[1].scale.y = 0.2 + 0.8 * (n.fB ?? 0);
    at(carton, now ? P.carton : null);
    carton.rotation.x = (n.tilt ?? 0) * -0.9;
    const pouring = (n.tilt ?? 0) > 0.3;
    flow.forEach((m, i) => {
      m.visible = pouring && !!P.carton;
      if (m.visible && P.carton) {
        const u = (t * 2.2 + i / 6) % 1;
        m.position.set(P.carton[0] + 0.05 * Math.sin(i * 3.1), P.carton[1] - 0.05 - u * 0.2, P.carton[2] - 0.1 - u * 0.1);
      }
    });
    at(pad, P.pad);
    if (pad.visible) pad.rotation.x = -0.6;
  });
  out.work = marker(g, 0, DW.ledge + 0.1, 0);
}

// =============================================================================================
// 자동 포장기 (rxPacker, 2 × 1): rows of cassettes, a dose tray, a strip of printed sachets.

const STRIP = 11;
function packer(g: THREE.Group, out: Built, W: number) {
  part(g, rbox(W - 0.06, 0.74, 0.86, 0.02), '#dfe5e8', 0, 0.37, -0.07);
  part(g, rbox(W - 0.06, 0.1, 0.86, 0.02), '#cfd8dc', 0, 0.78, -0.07);
  // The cassette bank above, behind a tinted window: columns of little drums with made-up labels.
  const hood = 0.76;
  part(g, rbox(W - 0.06, hood, 0.8, 0.02), '#e9eef0', 0, 0.82 + hood / 2, -0.09);
  part(g, box(W - 0.3, hood - 0.14, 0.01), '#25343b', 0.1, 0.84 + hood / 2, 0.315, { outline: false });
  const leds: THREE.Mesh[] = [];
  const r = seeded(7);
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 10; col++) {
      const x = -0.56 + col * 0.15;
      const y = 0.96 + row * 0.135;
      part(g, rbox(0.12, 0.105, 0.012, 0.004), ['#90a4ae', '#b0bec5', '#cfd8dc'][Math.floor(r() * 3)], x, y, 0.324);
      part(g, box(0.09, 0.024, 0.002), TONES[(row * 2 + col) % 8], x, y + 0.02, 0.331, { outline: false });
      leds.push(ownLit(g, ball(0.008), '#23402e', x + 0.045, y - 0.03, 0.334));
    }
  // The touch screen on the left.
  const screen = swapPic(g, 0.22, 0.18, PK.touch[0], PK.touch[1], PK.touch[2] - 0.005);
  const screenBack = part(g, box(0.25, 0.21, 0.015), BLACK, PK.touch[0], PK.touch[1], PK.touch[2] - 0.016);
  void screenBack;
  const liveS = live(120, 100);
  const idle = painted('rxPkIdle', 120, 100, (c) => {
    c.fillStyle = '#e7f6ee';
    c.fillRect(0, 0, 120, 100);
    text(c, '자동 포장', 60, 30, 16, GREEN_D, 'center');
    text(c, '대기', 60, 66, 18, INK, 'center');
  });
  screen.set(idle);
  label(g, '자동 조제 포장기', 0.9, 0.08, 0.1, 1.51, 0.326, '#e9eef0', GREEN_D);
  // The dose tray that slides out at the front: a grid of cells, each filling.
  const tray = group(g, PK.tray[0], PK.tray[1], PK.tray[2]);
  part(tray, rbox(0.56, 0.03, 0.24, 0.008), '#37474f', 0, 0, 0);
  const cells: THREE.Mesh[] = [];
  for (let z = 0; z < 4; z++)
    for (let x = 0; x < 7; x++) {
      part(tray, box(0.06, 0.012, 0.042), '#90caf9', -0.21 + x * 0.07, 0.017, -0.08 + z * 0.052, { outline: false });
      const p = part(tray, ball(0.012), ['#fafafa', '#ffb74d', '#e57373'][(x + z) % 3], -0.21 + x * 0.07, 0.03, -0.08 + z * 0.052, { outline: false });
      p.visible = false;
      cells.push(p);
    }
  const jar = bottleMesh(g, AMBER, '#fafafa', 0.04, 0.12);
  // The slot and its basket; the strip curving down, a sachet at a time; what's held to the light.
  part(g, box(0.28, 0.05, 0.03), BLACK, PK.slot[0], PK.slot[1], 0.37);
  const printing = ownLit(g, box(0.2, 0.012, 0.005), '#2e3a2f', PK.slot[0], PK.slot[1] + 0.05, 0.372);
  const bk = group(g, PK.basket[0], 0, PK.basket[2]);
  for (const sx of [-1, 1]) part(bk, box(0.012, 0.3, 0.26), '#90a4ae', sx * 0.16, 0.15, 0);
  for (const sz of [-1, 1]) part(bk, box(0.32, 0.3, 0.012), '#90a4ae', 0, 0.15, sz * 0.13);
  part(bk, box(0.32, 0.012, 0.26), '#78909c', 0, 0.01, 0);
  const strip = Array.from({ length: STRIP }, (_, i) => {
    const s = sachetMesh(g);
    const u = i / (STRIP - 1);
    s.position.set(PK.slot[0], PK.slot[1] - 0.04 - u * 0.36, 0.42 + 0.02 * Math.sin(u * 7));
    s.visible = false;
    return s;
  });
  // Printed sachets already in the basket, more each round.
  for (let i = 0; i < 5; i++) {
    const s = sachetMesh(bk);
    s.position.set(-0.06 + i * 0.03, 0.05 + i * 0.012, 0);
    s.rotation.x = -1.3;
  }
  const held = group(g);
  for (let i = 0; i < 4; i++) {
    const s = sachetMesh(held);
    s.position.set(-0.17 + i * 0.113, 0, 0);
  }
  const spots: Record<string, Spot> = { rxRunPacker: standAt(g, 'rxPack') };
  spots['*'] = spots.rxRunPacker;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const running = (n.running ?? 0) > 0.5;
    tray.position.z = PK.tray[2] + PK.trayOut * (n.out ?? 0);
    tray.visible = true;
    const filled = Math.round((n.fill ?? 0) * cells.length);
    cells.forEach((c, i) => (c.visible = i < filled));
    at(jar, P.jar);
    const k = Math.round((n.strip ?? 0) * STRIP);
    strip.forEach((s, i) => (s.visible = STRIP - i <= k));
    leds.forEach((m, i) => setLit(m, running && (Math.floor(t * 6) + i) % 7 === 0 ? '#66ff99' : (n.started ?? 0) > 0.5 ? '#2f7a4a' : '#23402e'));
    setLit(printing, running && Math.floor(t * 8) % 2 === 0 ? '#7cffb0' : '#2e3a2f');
    at(held, P.held);
    if (now) {
      screen.set(liveS((c) => {
        c.fillStyle = running ? '#2e7d32' : '#e7f6ee';
        c.fillRect(0, 0, 120, 100);
        const col = running ? '#ffffff' : INK;
        text(c, running ? '포장 중' : (n.screenStep ?? 0) > 1 ? '수동 트레이' : '환자 선택', 60, 28, 16, col, 'center');
        text(c, running ? `${Math.round((n.strip ?? 0) * 21)} / 21 포` : '홍○○  7일', 60, 64, 15, col, 'center');
      }));
    } else screen.set(idle);
  });
  out.work = marker(g, PK.tray[0], PK.tray[1] + 0.06, PK.tray[2]);
}

// =============================================================================================
// 연고 조제대 (rxCompoundBench, 2 × 1): a slab, a spatula, a balance and rows of jars.

function compoundBench(g: THREE.Group, out: Built, W: number) {
  const top = CB.top;
  part(g, rbox(W - 0.04, top - 0.04, 0.84, 0.012), '#e6ebec', 0, (top - 0.04) / 2, -0.03);
  part(g, rbox(W, 0.04, 0.96, 0.01), '#fafbfa', 0, top - 0.02, -0.02);
  for (const x of [-0.62, 0, 0.62]) {
    part(g, box(0.58, 0.34, 0.012), WHITE, x, 0.55, 0.395, { outline: false });
    part(g, box(0.14, 0.012, 0.018), CHROME, x, 0.65, 0.41, { outline: false });
    part(g, box(0.58, 0.28, 0.012), WHITE, x, 0.2, 0.395, { outline: false });
  }
  // A back shelf of brown jars (kept below the level of the wall's window of sight).
  part(g, box(W - 0.1, 0.02, 0.2), WHITE, 0, 1.24, -0.36);
  for (const sx of [-1, 1]) part(g, box(0.02, 0.36, 0.2), WHITE, sx * (W / 2 - 0.05), 1.06, -0.36);
  for (let i = 0; i < 12; i++) {
    const m = bottleMesh(g, i % 3 === 1 ? '#fafafa' : AMBER, '#fafafa', 0.035, 0.1);
    m.position.set(-0.84 + i * 0.152, 1.25, -0.36);
  }
  label(g, '연고 · 시럽 조제', 0.84, 0.07, 0, 1.46, -0.3, GREEN_D, '#ffffff');
  // The slab, the mound on it.
  part(g, rbox(0.48, 0.03, 0.34, 0.012), '#ffffff', CB.slab[0], top + 0.015, CB.slab[2]);
  const mound = ownLit(g, ball(0.08), '#f8f6ee', CB.slab[0], CB.slab[1] + 0.01, CB.slab[2]);
  mound.scale.y = 0.34;
  // The balance with its live reading.
  part(g, rbox(0.26, 0.05, 0.22, 0.012), BLACK, CB.balance[0], top + 0.025, CB.balance[2]);
  part(g, cyl(0.09, 0.09, 0.01, 18), CHROME, CB.balance[0], top + 0.06, CB.balance[2] - 0.02);
  const weigh = swapPic(g, 0.1, 0.035, CB.balance[0], top + 0.03, CB.balance[2] + 0.112);
  const liveW = live(96, 34);
  const zero = painted('rxScaleZero', 96, 34, (c) => {
    c.fillStyle = '#d7f5d5';
    c.fillRect(0, 0, 96, 34);
    text(c, '0.0 g', 90, 18, 20, INK, 'right');
  });
  weigh.set(zero);
  // The base's tub, the jar and its lid, a mortar, the dropper.
  part(g, cyl(0.1, 0.09, 0.14, 14), '#fafafa', CB.tub[0], top + 0.07, CB.tub[2]);
  label(g, '바셀린 기제', 0.14, 0.04, CB.tub[0], top + 0.07, CB.tub[2] + 0.1, '#ffffff', INK);
  part(g, cyl(0.075, 0.05, 0.08, 14), '#eceff1', 0.66, top + 0.04, -0.28);
  part(g, cyl(0.012, 0.016, 0.14, 8), '#eceff1', 0.7, top + 0.1, -0.26, { rz: -0.7 });
  const jar = group(g, CB.jar[0], top, CB.jar[2]);
  part(jar, cyl(0.055, 0.055, 0.06, 14), '#fafafa', 0, 0.03, 0);
  const lid = part(jar, cyl(0.058, 0.058, 0.02, 14), GREEN, 0, 0.07, 0);
  const jl = part(jar, box(0.07, 0.03, 0.002), PAPER, 0, 0.03, 0.057, { outline: false });
  const inJar = part(jar, cyl(0.05, 0.05, 0.01, 14), '#efe6b2', 0, 0.06, 0, { outline: false });
  const dropBottle = bottleMesh(g, AMBER, '#2b2b30', 0.03, 0.08);
  dropBottle.position.set(CB.dropper[0], top, CB.dropper[2]);
  const dropper = group(g);
  part(dropper, cyl(0.007, 0.004, 0.09, 8), '#e0f2f1', 0, 0, 0);
  part(dropper, ball(0.016), BLACK, 0, 0.055, 0);
  const dropBall = ownLit(g, ball(0.007), '#d9c86b', 0, 0, 0);
  const spat = spatula(g);
  const restSpat = spatula(g);
  restSpat.position.set(CB.slab[0] + 0.3, top + 0.004, CB.slab[2] + 0.14);
  const spots: Record<string, Spot> = { rxMixOintment: standAt(g, 'rxOintment') };
  spots['*'] = spots.rxMixOintment;
  const base = new THREE.Color('#f8f6ee');
  const mixed = new THREE.Color('#efe6b2');
  const swirl = new THREE.Color('#d8c15d');
  drive(g, out, spots, (now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const m = n.mound ?? 0;
    mound.visible = !!now && m > 0.03;
    mound.scale.set(0.5 + 1.1 * m, 0.1 + 0.26 * m * (1 - 0.35 * (n.mix ?? 0)), 0.5 + 0.8 * m);
    const mx = n.mix ?? 0;
    const col = (mound.material as THREE.MeshBasicMaterial).color;
    col.copy(base).lerp(mx < 0.5 ? swirl : mixed, mx < 0.5 ? mx * 1.4 : 1).lerp(mixed, Math.max(0, mx - 0.5) * 2);
    at(spat, P.spat);
    restSpat.visible = !P.spat;
    at(dropper, P.dropper);
    dropBall.visible = !!P.dropper;
    if (P.dropper) dropBall.position.set(P.dropper[0], P.dropper[1] - 0.05 - 0.14 * (n.drop ?? 0), P.dropper[2]);
    inJar.visible = (n.jar ?? 0) > 0.05;
    inJar.scale.y = 1 + (n.jar ?? 0) * 3;
    inJar.position.y = 0.015 + 0.03 * (n.jar ?? 0);
    lid.visible = !now || (n.lid ?? 0) > 0.5;
    jl.visible = !now || (n.labelled ?? 0) > 0.5;
    if (now && (n.grams ?? 0) > 0.05) {
      const grams = n.grams ?? 0;
      weigh.set(liveW((c) => {
        c.fillStyle = '#d7f5d5';
        c.fillRect(0, 0, 96, 34);
        text(c, `${grams.toFixed(1)} g`, 90, 18, 20, INK, 'right');
      }));
    } else weigh.set(zero);
  });
  out.work = marker(g, CB.slab[0], CB.slab[1] + 0.03, CB.slab[2]);
}

// =============================================================================================
// 의약품 냉장고 (rxMedFridge, 1 × 1): a glass-door pharmacy fridge, its shelves lit, a log at the side.

function medFridge(g: THREE.Group, out: Built) {
  const H = 1.86;
  // Shell: back, sides, top, base.
  part(g, box(0.86, H, 0.03), WHITE, 0, H / 2, -0.42);
  for (const sx of [-1, 1]) part(g, box(0.04, H, 0.84), WHITE, sx * 0.42, H / 2, 0);
  part(g, box(0.88, 0.18, 0.84), '#dfe5e8', 0, 0.09, 0);
  part(g, box(0.88, 0.14, 0.84), WHITE, 0, H - 0.07, 0);
  ownLit(g, box(0.78, 0.015, 0.04), '#d7f2ff', 0, H - 0.15, 0.2);
  ownLit(g, box(0.8, H - 0.36, 0.005), '#eaf7fd', 0, H / 2 + 0.02, -0.39);
  [0.42, 0.72, 1.02, 1.32].forEach((y, row) => {
    part(g, box(0.78, 0.015, 0.68), '#d3e7ef', 0, y, 0, { outline: false });
    for (let i = 0; i < 5; i++) {
      const m = medBox(g, TONES[(i + row) % 8], DRUGS[(i * 2 + row) % 12], 0.12, 0.13, 0.1);
      m.position.set(-0.28 + i * 0.14, y + 0.08, row === 2 && i === 2 ? -0.12 : 0.14);
    }
  });
  // The digital reading, a plate: 2~8℃.
  part(g, rbox(0.3, 0.1, 0.02, 0.006), BLACK, 0.08, 1.74, 0.43);
  const temp = swapPic(g, 0.26, 0.08, 0.08, 1.74, 0.442);
  temp.set(painted('rxFridgeT', 104, 32, (c) => {
    c.fillStyle = '#071c12';
    c.fillRect(0, 0, 104, 32);
    text(c, '4.2 ℃', 52, 17, 22, '#7cffb0', 'center');
  }));
  label(g, '2~8℃ 보관', 0.24, 0.06, -0.26, 1.74, 0.43, '#e3f2fd', '#1565c0');
  // The door, hung on its left.
  const door = group(g, -0.42, 0, 0.42);
  pane(door, 0.8, H - 0.46, 0.4, H / 2 + 0.02, 0.008, 0.3);
  for (const y of [0.22, H - 0.22]) part(door, box(0.84, 0.04, 0.03), WHITE, 0.42, y, 0);
  for (const x of [0.02, 0.82]) part(door, box(0.04, H - 0.44, 0.03), WHITE, x, H / 2, 0);
  part(door, rbox(0.02, 0.28, 0.03, 0.008), CHROME, 0.8, 1.08, 0.03);
  // The log on its clip (on the side, where it's seen from the front).
  const log = clipboard(g);
  log.position.set(0.442, 1.02, 0.1);
  log.rotation.y = Math.PI / 2;
  const box1 = medBox(g, '#1e88e5', '라온 주사', 0.16, 0.12, 0.1);
  const pad = clipboard(g);
  const spots: Record<string, Spot> = { rxCheckFridge: standAt(g, 'rxFridge') };
  spots['*'] = spots.rxCheckFridge;
  drive(g, out, spots, (_now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    door.rotation.y = -(n.door ?? 0) * FR.swing;
    at(box1, P.box);
    box1.rotation.y = (n.turned ?? 0) * Math.PI * 0.8;
    at(pad, P.pad);
    if (pad.visible) pad.rotation.x = -0.55;
    log.visible = !pad.visible;
  });
  out.work = marker(g, 0, 1.2, 0.4);
}

// =============================================================================================
// 처방 조회 단말 (rxCheckTerminal, 1 × 1): a stand-up desk with its screen, a phone at the side.

function checkTerminal(g: THREE.Group, out: Built) {
  const top = 0.98;
  part(g, rbox(0.9, 0.04, 0.72, 0.012), '#eef1f0', 0, top - 0.02, 0.0);
  part(g, box(0.06, top - 0.06, 0.5), STEEL, -0.36, (top - 0.06) / 2, -0.04);
  part(g, box(0.06, top - 0.06, 0.5), STEEL, 0.36, (top - 0.06) / 2, -0.04);
  part(g, box(0.7, 0.3, 0.02), WHITE, 0, 0.55, -0.26, { outline: false });
  part(g, rbox(0.3, 0.18, 0.3, 0.012), '#b0bec5', 0.18, 0.24, -0.02);
  label(g, '약품 정보', 0.2, 0.05, 0.18, 0.28, 0.135, '#ffffff', INK);
  const mon = group(g, 0, top + 0.24, -0.16);
  part(mon, rbox(0.5, 0.32, 0.03, 0.012), BLACK, 0, 0, 0);
  part(g, cyl(0.02, 0.06, 0.1, 8), BLACK, 0, top + 0.05, -0.18);
  const screen = swapPic(mon, 0.46, 0.28, 0, 0, 0.018);
  const idle = painted('rxTmIdle', 256, 156, (c) => {
    c.fillStyle = '#eef6fb';
    c.fillRect(0, 0, 256, 156);
    c.fillStyle = '#1565c0';
    c.fillRect(0, 0, 256, 26);
    text(c, '병용 금기 조회', 128, 14, 15, '#ffffff', 'center');
    text(c, '약품명을 입력하세요', 128, 90, 16, INK, 'center');
  });
  screen.set(idle);
  const liveS = live(256, 156);
  part(g, rbox(0.34, 0.018, 0.12, 0.006), '#37474f', TM.keys[0], top + 0.012, TM.keys[2]);
  part(g, rbox(0.12, 0.03, 0.18, 0.01), BLACK, TM.phone[0], top + 0.015, TM.phone[2]);
  const phone = handset(g);
  phone.rotation.x = Math.PI / 2;
  const slip = swapPic(group(g, TM.slip[0], TM.slip[1] + 0.003, TM.slip[2]), 0.13, 0.18, 0, 0, 0, 0, -Math.PI / 2);
  slip.set(slipTex('다정내과', ['노바린    7일', '미소펜정  7일', '솔비엔    7일'], 1));
  part(g, cyl(0.03, 0.025, 0.08, 10), '#90a4ae', -0.34, top + 0.04, -0.22);
  const spots: Record<string, Spot> = { rxLookupDrugs: standAt(g, 'rxLookup') };
  spots['*'] = spots.rxLookupDrugs;
  drive(g, out, spots, (now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    at(phone, P.phone, TM.phone);
    if (now) {
      const warn = (n.warn ?? 0) > 0.5;
      const ok = (n.ok ?? 0) > 0.5;
      screen.set(liveS((c) => {
        c.fillStyle = warn ? '#fff1f0' : ok ? '#ecfbf1' : '#eef6fb';
        c.fillRect(0, 0, 256, 156);
        c.fillStyle = warn ? '#c62828' : ok ? GREEN_D : '#1565c0';
        c.fillRect(0, 0, 256, 26);
        text(c, warn ? '함께 복용 금기' : ok ? '확인 완료' : '병용 금기 조회', 128, 14, 15, '#ffffff', 'center');
        const typed = '노바린 + 미소펜정'.slice(0, Math.floor((n.typed ?? 0) * 11));
        text(c, typed, 14, 58, 17, INK);
        if (warn) text(c, '처방의에게 확인하세요', 14, 100, 16, '#c62828');
        if (ok) text(c, '미소펜정 → 솔비엔 변경', 14, 100, 15, GREEN_D);
      }));
    } else screen.set(idle);
  });
  out.work = marker(g, TM.keys[0], top + 0.05, TM.keys[2]);
}

// =============================================================================================
// 일반의약품 진열 벽 (rxOtcWall, 3 × 1): a tall wall of medicines off the shelf, by what they're for.

function otcWall(g: THREE.Group, out: Built, W: number) {
  const H = 2.0;
  // Only the back: the shelves and what's on them stand in front of it.
  part(g, rbox(W - 0.02, H, 0.2, 0.012), '#f2f7f4', 0, H / 2, -0.39);
  part(g, box(W - 0.02, 0.14, 0.62), GREEN, 0, 0.07, -0.18);
  const heads = ['감기 · 해열', '소화 · 위장', '파스 · 통증', '비타민 · 영양', '상처 · 소독'];
  OT.decks.forEach((y, row) => {
    part(g, box(W - 0.08, 0.02, 0.5), '#ffffff', 0, y - 0.01, -0.18);
    part(g, box(W - 0.08, 0.03, 0.006), ['#e8f5ee', '#fff3e0'][row % 2], 0, y - 0.02, 0.07, { outline: false });
    picture(g, rowTex(`O${row}`, 14, 70 + row * 7), W - 0.1, 0.2, 0, y + 0.115, -0.2);
  });
  // The heads on the shoulders of the shelf.
  [-1, 0, 1].forEach((i) => label(g, heads[i + 1], 0.8, 0.11, i * 0.96, H - 0.03, 0.082, GREEN_D, '#ffffff'));
  label(g, '복용 전 약사와 상담하세요', 1.5, 0.08, 0, 0.17, 0.125, GREEN, '#ffffff');
  part(g, box(W - 0.02, 0.15, 0.5), GREEN_D, 0, H + 0.0, -0.17);
  // Boxes a customer left askew: they go straight as the hand passes.
  const r = seeded(29);
  const sets: Array<Array<{ m: THREE.Group; z0: number; ry: number }>> = [[], [], []];
  const groupOf = (x: number, y: number, s: number) => {
    const m = medBox(g, TONES[Math.floor(r() * 8)], DRUGS[Math.floor(r() * DRUGS.length)], 0.15, 0.13, 0.08);
    const z0 = OT.face - 0.13 - r() * 0.05;
    const ry = (r() - 0.5) * 0.7;
    m.position.set(x, y + 0.065, z0);
    m.rotation.y = ry;
    sets[s].push({ m, z0, ry });
  };
  for (let i = 0; i < 4; i++) groupOf(-1.12 + i * 0.2, OT.decks[2], 0);
  for (let i = 0; i < 2; i++) groupOf(-0.9 + i * 0.4, OT.decks[1], 0);
  for (let i = 0; i < 5; i++) groupOf(-0.3 + i * 0.15, OT.decks[0], 1);
  for (let i = 0; i < 4; i++) groupOf(0.5 + i * 0.2, OT.decks[3], 2);
  for (let i = 0; i < 2; i++) groupOf(0.6 + i * 0.3, OT.decks[2], 2);
  const tag = part(g, box(0.1, 0.05, 0.002), '#ffeb3b', 0, 0, 0, { outline: false });
  const hung = part(g, box(0.1, 0.05, 0.002), '#ffeb3b', 0.86, OT.decks[2] - 0.03, OT.face + 0.122, { outline: false, rz: 0.2 });
  const spots: Record<string, Spot> = { rxFaceOtc: standAt(g, 'rxFace') };
  spots['*'] = spots.rxFaceOtc;
  drive(g, out, spots, (now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const parts = [n.a ?? 0, n.b ?? 0, n.c ?? 0];
    sets.forEach((s, i) =>
      s.forEach(({ m, z0, ry }, j) => {
        const e = Math.min(1, Math.max(0, parts[i] * s.length - j));
        m.position.z = z0 + (OT.face - z0) * e;
        m.rotation.y = ry * (1 - e);
      }),
    );
    at(tag, now ? P.tag : null);
    hung.visible = !P.tag && !(now && (n.tag ?? 0) > 0.5);
  });
  out.work = marker(g, 0, 1.0, OT.face);
}

// =============================================================================================
// 혈압 측정 의자 (rxBpChair, 2 × 1): a cushioned chair and the machine with its cuff and big display.

function bpChair(g: THREE.Group, out: Built) {
  const [cx, cz] = BP.chair;
  // The chair.
  part(g, rbox(0.52, 0.09, 0.5, 0.03), '#26a69a', cx, BP.seat - 0.045, cz);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.02, 0.016, BP.seat - 0.09, 8), CHROME, cx + sx * 0.22, (BP.seat - 0.09) / 2, cz + sz * 0.2, { outline: false });
  part(g, rbox(0.52, 0.56, 0.08, 0.03), '#26a69a', cx, BP.seat + 0.28, cz - 0.28, { rx: -0.1 });
  part(g, box(0.05, 0.03, 0.42), CHROME, cx - 0.28, BP.seat + 0.2, cz, { outline: false });
  // The machine on its pedestal.
  part(g, cyl(0.2, 0.24, 0.05, 16), STEEL, 0.32, 0.025, 0);
  part(g, cyl(0.04, 0.05, 0.62, 10), STEEL, 0.32, 0.34, 0);
  part(g, rbox(0.52, 0.34, 0.44, 0.03), '#f2f5f4', 0.26, 0.82, 0);
  // The cuff tunnel, an arm's way through it from the chair's side.
  const tunnel = group(g, BP.cuff[0], BP.cuff[1] + 0.1, BP.cuff[2]);
  part(tunnel, cyl(0.09, 0.09, 0.3, 16), '#37474f', 0, 0, 0, { rz: Math.PI / 2 });
  part(tunnel, cyl(0.065, 0.065, 0.302, 16), '#101518', 0, 0, 0, { rz: Math.PI / 2, outline: false });
  const inflate = part(tunnel, cyl(0.067, 0.067, 0.22, 14), '#1e88e5', 0, 0, 0, { rz: Math.PI / 2, outline: false });
  // The big display and start button.
  part(g, rbox(0.34, 0.24, 0.03, 0.012), BLACK, 0.34, 1.12, 0.1);
  const disp = swapPic(g, 0.3, 0.2, 0.34, 1.12, 0.117);
  const idle = painted('rxBpIdle', 192, 128, (c) => {
    c.fillStyle = '#0d1f18';
    c.fillRect(0, 0, 192, 128);
    text(c, '혈압 측정', 96, 34, 22, '#9ff0c4', 'center');
    text(c, '팔을 넣고', 96, 72, 18, '#ffffff', 'center');
    text(c, '시작을 누르세요', 96, 100, 16, '#ffffff', 'center');
  });
  disp.set(idle);
  const liveD = live(192, 128);
  part(g, cyl(0.035, 0.035, 0.02, 12), '#2e7d32', BP.start[0], BP.start[1] + 0.03, BP.start[2], { rx: Math.PI / 2 });
  const startLed = ownLit(g, cyl(0.022, 0.022, 0.024, 12), '#2d6b3b', BP.start[0], BP.start[1] + 0.03, BP.start[2]);
  startLed.rotation.x = Math.PI / 2;
  // The chart of what counts as what.
  picture(g, painted('rxBpChart', 128, 96, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 128, 96);
    text(c, '혈압 기준', 64, 14, 13, INK, 'center');
    [['정상', '120 / 80', '#43a047'], ['주의', '130 / 85', '#fb8c00'], ['높음', '140 / 90', '#e53935']].forEach(([a, b, col], i) => {
      c.fillStyle = col;
      c.fillRect(6, 30 + i * 22, 24, 18);
      text(c, a, 18, 40 + i * 22, 11, '#ffffff', 'center');
      text(c, b, 40, 40 + i * 22, 13, INK);
    });
  }), 0.24, 0.18, 0.76, 0.82, 0.225);
  const book = group(g);
  part(book, box(0.16, 0.2, 0.012), '#00897b', 0, 0, 0);
  part(book, box(0.13, 0.17, 0.002), PAPER, 0, 0, 0.008, { outline: false });
  let elder: Fig | null = null;
  const elderFig = () => (elder ??= person(g, LOOKS.elder, cx, cz + 0.02, 0, 'female', BP.seat));
  const spots: Record<string, Spot> = { rxTakeBp: standAt(g, 'rxBp') };
  spots['*'] = spots.rxTakeBp;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const p = n.pressure ?? 0;
    inflate.scale.set(1, 1, 1);
    inflate.visible = (n.running ?? 0) > 0.5;
    if (inflate.visible) inflate.scale.set(0.75 + 0.28 * p, 1, 0.75 + 0.28 * p);
    setLit(startLed, (n.running ?? 0) > 0.5 && Math.sin(t * 7) > 0 ? '#9dff9d' : '#2d6b3b');
    at(book, P.book);
    if (book.visible) book.rotation.x = -0.55;
    if (now) {
      const f = elderFig();
      f.root.visible = (n.cust ?? 0) > 0.02;
      f.opts.nod = 0.14 + 0.12 * (n.cNod ?? 0);
      const inArm = n.armIn ?? 0;
      f.armR(null);
      // The arm on the machine's side goes into the cuff.
      f.armL(inArm > 0.02 ? v3(cx + 0.26 + (BP.cuff[0] - cx - 0.26) * inArm, BP.cuff[1] + 0.06, BP.cuff[2] + 0.1 * (1 - inArm)) : null);
      const shown = (n.shown ?? 0) > 0.5;
      const v = Math.round(60 + p * 140);
      disp.set(liveD((c) => {
        c.fillStyle = '#0d1f18';
        c.fillRect(0, 0, 192, 128);
        if (shown) {
          text(c, '최고 128', 96, 36, 26, '#ffd54f', 'center');
          text(c, '최저 82', 96, 70, 24, '#9ff0c4', 'center');
          text(c, '맥박 74', 96, 104, 18, '#ffffff', 'center');
        } else if ((n.running ?? 0) > 0.5) {
          text(c, '측정 중', 96, 30, 18, '#9ff0c4', 'center');
          text(c, String(v), 96, 76, 44, '#ffffff', 'center');
        } else {
          text(c, '시작을 누르세요', 96, 64, 18, '#ffffff', 'center');
        }
      }));
    } else {
      if (elder) elder.root.visible = false;
      disp.set(idle);
    }
  });
  out.work = marker(g, BP.start[0], BP.start[1], BP.start[2]);
}

// =============================================================================================
// 대기 의자 (rxWaitBench, 3 × 1): three linked seats, a low table of leaflets beside them.

function waitBench(g: THREE.Group, W: number) {
  part(g, box(W - 0.3, 0.05, 0.05), STEEL, 0, 0.3, -0.05);
  for (const x of [-0.95, 0.65]) {
    part(g, box(0.05, 0.3, 0.05), STEEL, x, 0.15, -0.05);
    part(g, box(0.4, 0.03, 0.05), STEEL, x, 0.02, -0.05, { ry: Math.PI / 2 });
  }
  [-0.95, -0.42, 0.11].forEach((x, i) => {
    part(g, rbox(0.48, 0.06, 0.46, 0.025), ['#80cbc4', '#4db6ac', '#80cbc4'][i], x, 0.44, 0);
    part(g, rbox(0.48, 0.5, 0.05, 0.025), ['#80cbc4', '#4db6ac', '#80cbc4'][i], x, 0.72, -0.24, { rx: -0.1 });
    part(g, box(0.04, 0.12, 0.05), STEEL, x, 0.37, 0, { outline: false });
  });
  // The leaflets, a water dispenser's cups, a box of masks.
  part(g, rbox(0.56, 0.44, 0.48, 0.02), '#e8f5ee', 0.92 - 0.02, 0.22, 0);
  picture(g, painted('rxLeaflet', 128, 96, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 128, 96);
    c.fillStyle = GREEN;
    c.fillRect(0, 0, 128, 22);
    text(c, '건강 소식', 64, 11, 13, '#ffffff', 'center');
    text(c, '약은 꼭 물과 함께', 64, 46, 12, INK, 'center');
    text(c, '남은 약은 약국에', 64, 70, 12, INK, 'center');
  }), 0.2, 0.15, 0.9, 0.52, -0.1, '#ffffff', 0, -1.1);
  for (let i = 0; i < 3; i++) part(g, box(0.1, 0.02, 0.14), TONES[i], 0.76 + i * 0.1, 0.45, 0.1, { outline: false });
}

// =============================================================================================
// 의약품 입고 상자 (rxDelivery, 2 × 1): cartons on a dolly from the wholesaler, a cold box.

function delivery(g: THREE.Group, out: Built, W: number) {
  part(g, rbox(W - 0.2, 0.04, 0.72, 0.012), '#546e7a', 0, 0.09, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.03, 0.03, 0.04, 10), BLACK, sx * (W / 2 - 0.2), 0.03, sz * 0.26, { rz: Math.PI / 2 });
  // The open carton on the left, its flaps and tape.
  const cartonBase = group(g, DV.open[0], 0.11, DV.open[2]);
  const body = part(cartonBase, rbox(0.56, 0.38, 0.42, 0.006), CARD, 0, 0.19, 0);
  void body;
  part(cartonBase, box(0.5, 0.012, 0.36), '#8e6a43', 0, 0.382, 0, { outline: false });
  const tape = part(cartonBase, box(0.58, 0.004, 0.06), '#e7c98f', 0, 0.384, 0, { outline: false });
  label(cartonBase, '늘벗약품 납품', 0.34, 0.05, 0, 0.26, 0.212, '#ffffff', INK);
  const flaps = [-1, 1].map((sz) => {
    const f = group(cartonBase, 0, 0.385, sz * 0.21);
    part(f, box(0.56, 0.004, 0.2), CARD, 0, 0, sz * 0.1, { outline: false });
    f.userData.sz = sz;
    return f;
  });
  const inside = [0, 1, 2].map((i) => {
    const b = medBox(cartonBase, TONES[i + 1], DRUGS[i + 2]);
    b.position.set(-0.1 + i * 0.1, 0.42, 0);
    return b;
  });
  // The stack on the right: the cold box, a carton.
  part(g, rbox(0.46, 0.34, 0.42, 0.012), CARD, DV.side[0], 0.28, DV.side[2] - 0.02);
  label(g, '늘벗약품', 0.28, 0.05, DV.side[0], 0.3, DV.side[2] + 0.192, '#ffffff', INK);
  part(g, rbox(0.34, 0.24, 0.28, 0.02), '#1e88e5', DV.side[0] - 0.02, 0.57, DV.side[2] - 0.06);
  part(g, rbox(0.35, 0.05, 0.29, 0.015), '#fafafa', DV.side[0] - 0.02, 0.71, DV.side[2] - 0.06);
  label(g, '냉장', 0.14, 0.05, DV.side[0] - 0.02, 0.57, DV.side[2] + 0.085, '#fafafa', '#1565c0');
  const placed = [0, 1, 2].map((i) => {
    const b = medBox(g, TONES[i + 1], DRUGS[i + 2]);
    b.position.set(DV.side[0] - 0.12 + i * 0.12, 0.8, DV.side[2] + 0.02);
    b.visible = false;
    return b;
  });
  const held = medBox(g, TONES[1], DRUGS[2]);
  const pad = clipboard(g);
  const knife = group(g);
  part(knife, rbox(0.1, 0.02, 0.025, 0.006), '#ffc107', 0, 0, 0);
  part(knife, box(0.05, 0.003, 0.012), CHROME, -0.07, 0, 0, { outline: false });
  const gun = group(g);
  part(gun, rbox(0.06, 0.13, 0.03, 0.01), BLACK, 0, 0, 0);
  const led = ownLit(gun, ball(0.01), '#5a1a1a', 0, 0.075, 0.015);
  const carried = group(g);
  part(carried, rbox(0.56, 0.38, 0.42, 0.006), CARD, 0, 0, 0);
  const spots: Record<string, Spot> = { rxCheckDelivery: standAt(g, 'rxDelivery') };
  spots['*'] = spots.rxCheckDelivery;
  drive(g, out, spots, (now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    tape.scale.x = 1;
    const cut = n.cut ?? 0;
    tape.visible = !now ? true : cut < 0.96;
    const op = now ? (n.flaps ?? 0) : 0;
    flaps.forEach((f) => (f.rotation.x = (f.userData.sz as number) * op * -2.1));
    const out_ = Math.floor(n.out ?? 0);
    inside.forEach((b, i) => (b.visible = op > 0.3 && i >= out_ && !P.carton));
    placed.forEach((b, i) => (b.visible = !!now && i < out_));
    cartonBase.visible = !P.carton;
    at(held, P.box);
    at(pad, P.pad);
    if (pad.visible) pad.rotation.x = -0.55;
    at(knife, P.knife);
    at(gun, P.gun);
    setLit(led, (n.beep ?? 0) > 0.5 ? '#ff5252' : '#5a1a1a');
    at(carried, P.carton);
  });
  out.work = marker(g, DV.open[0], 0.62, DV.open[2]);
}

// ---------------------------------------------------------------------------------------------
// The 제약 연구소's tablet press (2026-11-04, the branch lots: workFurniture/pharmacist.ts).

/**
 * 타정기 (phTabletPress, 1 × 1): a single-punch press on a steel bench: its grey frame and column, the hopper of trial granules over
 * the die, the handwheel, the clear guard, the tray of white tablets in front and the hardness tester beside it. Worked stood at it.
 */
function tabletPress(g: THREE.Group, out: Built) {
  part(g, rbox(0.86, 0.06, 0.6, 0.02), STEEL, 0, 0.8, -0.05);
  for (const x of [-0.38, 0.38]) for (const z of [-0.3, 0.2]) part(g, box(0.04, 0.78, 0.04), '#8d99a3', x, 0.39, z, { outline: false });
  part(g, box(0.76, 0.03, 0.46), '#8d99a3', 0, 0.2, -0.05, { outline: false });
  // The press.
  part(g, rbox(0.34, 0.12, 0.32, 0.02), '#607d8b', -0.12, 0.89, -0.12);
  part(g, rbox(0.12, 0.5, 0.12, 0.02), '#607d8b', -0.12, 1.2, -0.22);
  part(g, rbox(0.3, 0.12, 0.26, 0.02), '#607d8b', -0.12, 1.48, -0.12);
  part(g, cyl(0.03, 0.03, 0.2, 10), CHROME, -0.12, 1.32, -0.06);
  part(g, cyl(0.1, 0.06, 0.16, 16), '#cfd8dc', -0.04, 1.08, -0.05);
  for (let i = 0; i < 6; i++) part(g, ball(0.012), '#f5f5f5', -0.06 + (i % 3) * 0.02, 1.15, -0.05 + Math.floor(i / 3) * 0.02, { outline: false });
  part(g, cyl(0.12, 0.12, 0.02, 20), BLACK, 0.08, 1.48, -0.12, { rz: Math.PI / 2 });
  // The tray of tablets; the hardness tester.
  part(g, rbox(0.22, 0.03, 0.16, 0.01), '#eceff1', -0.1, 0.845, 0.14);
  for (let i = 0; i < 9; i++) part(g, cyl(0.016, 0.016, 0.008, 10), WHITE, -0.17 + (i % 3) * 0.06, 0.865, 0.1 + Math.floor(i / 3) * 0.04, { outline: false });
  part(g, rbox(0.18, 0.12, 0.16, 0.02), '#eceff1', 0.27, 0.89, -0.1);
  part(g, box(0.1, 0.05, 0.004), '#0b3d2a', 0.27, 0.91, -0.018, { outline: false });
  label(g, '타정기', 0.18, 0.05, -0.12, 0.89, 0.042, '#607d8b', '#ffffff');
  const s = spot(g, 'stand', 0, 0, 0.6, Math.PI);
  s.work = marker(g, -0.08, 0.9, 0.12);
  out.work = s.work;
  out.spots = { '*': s };
}

export const BUILDERS: Record<string, Builder> = {
  phTabletPress(g, _W, _D, _c, _def, _ctx, out) {
    tabletPress(g, out);
  },
  dispensingTable(g, W, _D, _c, _def, _ctx, out) {
    dispensingTable(g, out, W);
  },
  pharmacyShelf(g, _W, _D, _c, _def, _ctx, out) {
    pharmacyShelf(g, out);
  },
  pharmacyCounter(g, W, _D, _c, _def, _ctx, out) {
    pharmacyCounter(g, out, W);
  },
  rxCounterWing(g, W) {
    counterWing(g, W);
  },
  rxDrawerWall(g, W, _D, _c, _def, _ctx, out) {
    drawerWall(g, out, W);
  },
  rxPacker(g, W, _D, _c, _def, _ctx, out) {
    packer(g, out, W);
  },
  rxCompoundBench(g, W, _D, _c, _def, _ctx, out) {
    compoundBench(g, out, W);
  },
  rxMedFridge(g, _W, _D, _c, _def, _ctx, out) {
    medFridge(g, out);
  },
  rxCheckTerminal(g, _W, _D, _c, _def, _ctx, out) {
    checkTerminal(g, out);
  },
  rxOtcWall(g, W, _D, _c, _def, _ctx, out) {
    otcWall(g, out, W);
  },
  rxBpChair(g, _W, _D, _c, _def, _ctx, out) {
    bpChair(g, out);
  },
  rxWaitBench(g, W) {
    waitBench(g, W);
  },
  rxDelivery(g, W, _D, _c, _def, _ctx, out) {
    delivery(g, out, W);
  },
  // The green 약 lightbox on the pavement (2026-11-05, the layout audit).
  rxStreetSign: pavementSign('rxStreetSign', '약', BRAND, ['처방 조제 · 복약 상담', '일반약 · 건강기능식품', '평일 9:00 ~ 21:00'], GREEN_D),
};
