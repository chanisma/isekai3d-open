import * as THREE from 'three';
import type { HeldTool } from '../handTool';
import { marker, rod, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, glass, label, painted, picture, ring, text } from './doctor';
import { AD, BR, CB, CD, MB, PD, PEN_UP, RW, STAMP_UP, VB, bhNow, bhPhase, fileAt, fileOf, pocketAt, pocketOf, starAt, wrap } from './insuranceAgentMotion';
import type { BhMotion, BhNow, BhTool } from './insuranceAgentMotion';
import { vroidFigure, type FigureOptions } from './vroidFigure';

/**
 * A branch of the made-up 봄볕보험 (2026-11-01), warm rather than slick: the desks where plans are built with a family photo pinned up,
 * consultation booths with a family across and a screen both sides can see, a claims window with photos of a little car that met a
 * flowerpot and a payout that's really summed, a morning meeting at a board that counts thanks as well as plans, an appointment desk,
 * a rack of leaflets, a wall of contracts, a bag packed to go out to a client, and a corner for the children who came along.
 * No real company, country, party or person. Everything that moves follows insuranceAgentMotion.ts. The whiteboard and archive shelf are shared and stay.
 */

const COMPANY = '봄볕보험';
const BRANCH = '은솔지점';
const CREAM = '#f6efe0';
const WOOD = '#c9a274';
const WOOD_D = '#8f6c48';
const NAVY = '#27496d';
const NAVY_D = '#1b3550';
const SKY = '#d5e5f0';
const SUN = '#f4b13f';
const SUN_L = '#ffe6ad';
const CORAL = '#e8785a';
const GREEN = '#5a9a68';
const GREY = '#969ea3';
const GREY_D = '#59636a';
const GRAPHITE = '#30373d';
const PAPER = '#fbfaf5';
const SEAL = '#c62828';
const INK = '#21262b';
const SKIN = '#ecc6a3';
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UP = v3(0, 1, 0);
const tmp = new THREE.Vector3();
const FLAT = -Math.PI / 2;
type V = readonly [number, number, number];
type Ctx2 = CanvasRenderingContext2D;
const q = (x: number | undefined, steps = 20) => Math.round((x ?? 0) * steps);
const clamp01 = (x: number | undefined) => THREE.MathUtils.clamp(x ?? 0, 0, 1);
const pos = (r: number) => Math.max(0.5, r);
const won = (n: number) => `${Math.round(n).toLocaleString('en-US')}원`;
const seedOf = (g: THREE.Object3D) => {
  const p = g.getWorldPosition(tmp);
  return Math.floor(Math.abs(p.x) * 3 + Math.abs(p.z) * 7);
};

const CLIENTS = ['김○○ 님 네 식구', '이○○ 님 부부', '박○○ 어르신', '최○○ 님 가족', '정○○ 님 새댁'];
const clientOf = (i: number) => CLIENTS[wrap(i, CLIENTS.length)];
const COVERS = ['입원·수술비', '아이 치아 치료', '집 화재·누수', '가족 일상 사고'];
const LEAFLETS: ReadonlyArray<readonly [string, string, string]> = [
  ['가족 든든', '온 식구 한 장으로', '#f6c667'],
  ['어린이 튼튼', '뛰다 다쳐도 괜찮아', '#9fd4a8'],
  ['어르신 안심', '병원비 걱정 덜고', '#e8a48f'],
  ['우리 집 지킴', '불·물 사고 대비', '#a6c8e4'],
  ['자동차 동행', '작은 접촉에도', '#c7b6e0'],
  ['여행 살핌', '멀리 가도 마음 편히', '#f1b6c8'],
];
const leafletOf = (i: number) => LEAFLETS[wrap(i, LEAFLETS.length)];
const leafletTex = (i: number) => {
  const [a, b, bg] = leafletOf(i);
  return painted(`bhLeaf|${a}`, 128, 180, (c) => {
    c.fillStyle = bg;
    c.fillRect(0, 0, 128, 180);
    c.fillStyle = 'rgba(255,255,255,0.72)';
    c.fillRect(8, 74, 112, 72);
    text(c, COMPANY, 64, 16, 13, NAVY_D, 'center');
    c.fillStyle = SUN;
    c.beginPath();
    c.arc(64, 46, pos(16), 0, 6.3);
    c.fill();
    text(c, a, 64, 92, 17, INK, 'center');
    text(c, b.slice(0, 9), 64, 118, 11, INK, 'center', false);
    if (b.length > 9) text(c, b.slice(9), 64, 134, 11, INK, 'center', false);
    text(c, '상담은 편하게', 64, 164, 11, NAVY_D, 'center', false);
  });
};
/** The little accident: a white car's bumper and a flowerpot in a car park, three photos of it. */
const accidentTex = (i: number) => {
  const k = wrap(i, 3);
  return painted(`bhAccident|${k}`, 180, 130, (c) => {
    c.fillStyle = '#8d9498';
    c.fillRect(0, 0, 180, 130);
    c.fillStyle = '#d7dadb';
    c.fillRect(0, 0, 180, 42);
    c.strokeStyle = '#f2ecd0';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(20, 130);
    c.lineTo(46, 42);
    c.stroke();
    const scale = k === 1 ? 1.8 : 1;
    const cx = k === 1 ? 44 : k === 2 ? 42 : 76;
    const cy = k === 1 ? 74 : 72;
    c.fillStyle = '#f4f5f6';
    c.beginPath();
    c.roundRect(cx - 50 * scale, cy - 18 * scale, 100 * scale, 36 * scale, pos(9 * scale));
    c.fill();
    c.fillStyle = '#64808f';
    c.fillRect(cx - 28 * scale, cy - 32 * scale, 56 * scale, 18 * scale);
    c.fillStyle = '#26292c';
    for (const sx of [-1, 1]) {
      c.beginPath();
      c.arc(cx + sx * 32 * scale, cy + 18 * scale, pos(11 * scale), 0, 6.3);
      c.fill();
    }
    // The scratch.
    c.strokeStyle = CORAL;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(cx + 34 * scale, cy - 2 * scale);
    c.lineTo(cx + 49 * scale, cy + 8 * scale);
    c.moveTo(cx + 30 * scale, cy + 4 * scale);
    c.lineTo(cx + 44 * scale, cy + 13 * scale);
    c.stroke();
    if (k !== 1) {
      const px = cx + 66;
      c.fillStyle = '#b5683f';
      c.fillRect(px - 12, 80, 24, 26);
      c.fillStyle = '#4f8a5b';
      c.beginPath();
      c.arc(px, 70, pos(15), 0, 6.3);
      c.fill();
      c.fillStyle = '#e8785a';
      c.beginPath();
      c.arc(px + 4, 66, pos(4), 0, 6.3);
      c.fill();
    }
    text(c, ['전체', '범퍼 긁힘', '화분 옆'][k], 8, 12, 13, INK);
  });
};
function amounts(round: number) {
  const repair = [184000, 126000, 232000][wrap(round, 3)];
  const care = [62000, 40000, 28000][wrap(round, 3)];
  const self = 30000;
  return { repair, care, self, pay: repair + care - self };
}

// ---------------------------------------------------------------------------------------------
// Small parts.

function group(parent: THREE.Object3D, x = 0, y = 0, z = 0, ry = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}
function at(m: THREE.Object3D, p: V | null | undefined, home?: V | null) {
  const w = p ?? home;
  m.visible = !!w;
  if (w) m.position.set(w[0], w[1], w[2]);
}
/** A plane whose canvas is repainted only when its key changes. */
function liveScreen(g: THREE.Object3D, w: number, h: number, px: number, py: number, x: number, y: number, z: number, ry = 0, rx = 0) {
  const mat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.userData.ownGeometry = mesh.userData.ownMaterial = true;
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, 0, 'YXZ');
  g.add(mesh);
  let tex: THREE.CanvasTexture | null = null;
  let ctx: Ctx2 | null = null;
  let last = '';
  return {
    mesh,
    draw(key: string, paint: (c: Ctx2) => void) {
      if (typeof document === 'undefined') return;
      if (!tex) {
        const can = document.createElement('canvas');
        can.width = px;
        can.height = py;
        ctx = can.getContext('2d');
        tex = new THREE.CanvasTexture(can);
        tex.colorSpace = THREE.SRGBColorSpace;
        mat.map = tex;
        mat.needsUpdate = true;
      }
      if (key !== last && ctx) {
        last = key;
        paint(ctx);
        tex.needsUpdate = true;
      }
    },
  };
}
function setMap(m: THREE.Mesh, tex: THREE.Texture) {
  const mat = m.material as THREE.MeshBasicMaterial;
  if (mat.map !== tex) {
    mat.map = tex;
    mat.needsUpdate = true;
  }
}
/** A small heart, drawn: the emoji font is kept to what it has. */
function heart(c: Ctx2, x: number, y: number, r: number) {
  c.fillStyle = CORAL;
  c.beginPath();
  c.moveTo(x, y + r);
  c.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.7, y - r * 1.2, x, y - r * 0.3);
  c.bezierCurveTo(x + r * 0.7, y - r * 1.2, x + r * 1.6, y - r * 0.2, x, y + r);
  c.fill();
}
/** A flat plane lying face up on something, its picture changed as wanted. */
function lyingPlane(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  m.rotation.x = FLAT;
  g.add(m);
  return m;
}
function standAt(g: THREE.Object3D, motion: BhMotion, x = 0, z = 0.6): Spot {
  const s = spot(g, 'stand', x, 0, z, Math.PI);
  s.motion = motion;
  return s;
}
function seatAt(g: THREE.Object3D, motion: BhMotion, seat: V, yaw = Math.PI): Spot {
  const s = spot(g, 'sit', seat[0], seat[1], seat[2], yaw, 0);
  s.motion = motion;
  return s;
}
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
function nowAt(spots: Record<string, Spot>, t: number): string | null {
  let best: string | null = null;
  for (const [k, s] of Object.entries(spots)) if (k !== '*' && s.motion && Math.abs(t - posedAt(s)) < 0.6 && (best === null || posedAt(s) > posedAt(spots[best]))) best = k;
  return best;
}
/** Every frame: which use is going on and where its script has got to; what the script says is in the hand goes in the hand. */
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, tools: Partial<Record<BhTool, HeldTool>>, show: (now: string | null, N: BhNow | null, t: number) => void) {
  out.spots = spots;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const H = (sp?.at.userData.height as number | undefined) ?? 1.6;
    const N = sp ? bhNow(sp.motion as BhMotion, t, bhPhase(g.getWorldPosition(tmp)), H) : null;
    show(now, N, t);
    for (const s of Object.values(spots)) s.held = s === sp && N?.tool ? (tools[N.tool] ?? null) : null;
  };
}
/** A word over someone's head. */
const paintBubble = (s: string) => (c: Ctx2) => {
  c.clearRect(0, 0, 256, 96);
  c.fillStyle = '#ffffff';
  c.strokeStyle = '#4a4238';
  c.lineWidth = 5;
  c.beginPath();
  c.roundRect(6, 6, 244, 72, 26);
  c.fill();
  c.stroke();
  text(c, s, 128, 44, Math.min(32, 400 / Math.max(1, s.length)), NAVY_D, 'center');
};
function bubble(parent: THREE.Object3D, s: string, w: number, x: number, y: number, z: number): THREE.Sprite {
  const mat = new THREE.SpriteMaterial({ map: painted(`bhBubble|${s}`, 256, 96, paintBubble(s)), transparent: true, depthWrite: false });
  const sp = new THREE.Sprite(mat);
  sp.userData.ownMaterial = true;
  sp.scale.set(w, w * 0.375, 1);
  sp.position.set(x, y, z);
  sp.renderOrder = 5;
  sp.visible = false;
  parent.add(sp);
  return sp;
}
function limb(g: THREE.Object3D, r: number, color: string): (a: THREE.Vector3, b: THREE.Vector3) => void {
  const m = part(g, cyl(r, r * 0.9, 1, 8), color, 0, 0, 0, { outline: false });
  const d = new THREE.Vector3();
  return (a, b) => {
    d.subVectors(b, a);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.scale.set(1, Math.max(0.001, d.length()), 1);
    if (d.lengthSq() > 1e-9) m.quaternion.setFromUnitVectors(UP, d.normalize());
  };
}
function chair(g: THREE.Object3D, seat: V, color = NAVY) {
  const c = group(g, seat[0], 0, seat[2]);
  const T = seat[1];
  part(c, rbox(0.44, 0.07, 0.42, 0.03), color, 0, T - 0.035, 0);
  part(c, cyl(0.024, 0.03, T - 0.14, 10), CHROME, 0, (T - 0.08) / 2 + 0.06, 0, { outline: false });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    rod(c, v3(0, 0.1, 0), v3(Math.cos(a) * 0.23, 0.05, Math.sin(a) * 0.23), 0.014, BLACK);
    part(c, ball(0.024), BLACK, Math.cos(a) * 0.23, 0.026, Math.sin(a) * 0.23, { outline: false });
  }
  part(c, rbox(0.4, 0.42, 0.06, 0.04), color, 0, T + 0.3, 0.23, { rx: 0.1 });
}
/** A visitor's chair: wooden legs, a cushion, a low back, facing +z. */
function guestChair(g: THREE.Object3D, x: number, T: number, z: number, color = SUN, w = 0.42) {
  const c = group(g, x, 0, z);
  part(c, rbox(w, 0.05, w - 0.02, 0.02), color, 0, T - 0.025, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(c, cyl(0.016, 0.014, T - 0.05, 8), WOOD_D, (sx * w) / 2.4, (T - 0.05) / 2, (sz * w) / 2.4, { outline: false });
  if (w > 0.36) {
    part(c, rbox(w, 0.24, 0.035, 0.015), WOOD, 0, T + 0.27, -w / 2.2);
    for (const sx of [-1, 1]) part(c, box(0.025, 0.16, 0.025), WOOD_D, (sx * w) / 2.4, T + 0.08, -w / 2.2, { outline: false });
  }
  return c;
}
function keyboard(g: THREE.Object3D, p: V, w = 0.26, d = 0.11) {
  part(g, rbox(w, 0.018, d, 0.006), GRAPHITE, p[0], p[1] - 0.022, p[2], { outline: false });
  for (let j = 0; j < 4; j++) part(g, box(w - 0.03, 0.002, 0.012), GREY, p[0], p[1] - 0.012, p[2] - d / 2 + 0.02 + j * 0.024, { outline: false });
}
/** A monitor on a stem; the screen's plane stands in front of its case. */
function monitor(g: THREE.Object3D, p: V, w: number, h: number, T: number, px: number, py: number, ry = 0) {
  const m = group(g, p[0], 0, p[2], ry);
  part(m, box(w + 0.03, h + 0.03, 0.025), BLACK, 0, p[1], -0.016, { outline: false });
  const stem = Math.max(0.02, p[1] - T - h / 2 + 0.06);
  part(m, cyl(0.02, 0.026, stem, 10), GREY_D, 0, T + stem / 2, -0.05, { outline: false });
  part(m, rbox(0.22, 0.016, 0.15, 0.006), GREY_D, 0, T + 0.008, -0.05, { outline: false });
  return liveScreen(m, w, h, px, py, 0, p[1], 0.001);
}
/** A desk slab on two wooden panels: open underneath, so knees fit from either side. */
function deskTop(g: THREE.Object3D, w: number, T: number, zBack = -0.38, zFront = 0.32) {
  const d = zFront - zBack;
  const z = (zBack + zFront) / 2;
  part(g, rbox(w, 0.04, d, 0.012), WOOD, 0, T - 0.02, z);
  for (const sx of [-1, 1]) part(g, box(0.035, T - 0.04, d - 0.08), WOOD_D, sx * (w / 2 - 0.05), (T - 0.04) / 2, z, { outline: false });
  part(g, box(w - 0.14, 0.12, 0.02), WOOD_D, 0, T - 0.1, z, { outline: false });
}
function calculator(g: THREE.Object3D, p: V) {
  const y = p[1] - 0.03;
  part(g, rbox(0.1, 0.022, 0.15, 0.008), '#e7e4d8', p[0], y + 0.011, p[2], { outline: false });
  const led = liveScreen(g, 0.08, 0.026, 112, 36, p[0], y + 0.0235, p[2] - 0.05, 0, FLAT);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) part(g, box(0.014, 0.004, 0.012), i === 3 ? CORAL : GREY_D, p[0] - 0.03 + i * 0.02, y + 0.024, p[2] - 0.022 + j * 0.022, { outline: false });
  return (s: string) => {
    led.draw(s, (c) => {
      c.fillStyle = '#c8d6b0';
      c.fillRect(0, 0, 112, 36);
      text(c, s, 106, 19, 22, '#22301a', 'right');
    });
  };
}
function phoneBase(g: THREE.Object3D, p: V) {
  const y = p[1] - 0.075;
  part(g, rbox(0.15, 0.04, 0.22, 0.014), GRAPHITE, p[0], y + 0.02, p[2]);
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) part(g, box(0.02, 0.005, 0.014), '#d8dcdf', p[0] - 0.024 + i * 0.024, y + 0.042, p[2] + 0.03 + j * 0.022, { outline: false });
  part(g, box(0.14, 0.012, 0.05), BLACK, p[0], y + 0.046, p[2] - 0.05, { outline: false });
}
function penCup(g: THREE.Object3D, p: V) {
  part(g, cyl(0.032, 0.03, 0.08, 14), '#b5683f', p[0], p[1] - PEN_UP + 0.035, p[2]);
  for (let i = 0; i < 3; i++) part(g, cyl(0.004, 0.004, 0.13, 6), [CORAL, GREEN, GRAPHITE][i], p[0] - 0.014 + i * 0.014, p[1] - PEN_UP + 0.065, p[2] - 0.014 + (i % 2) * 0.02, { outline: false });
}
function stampPad(g: THREE.Object3D, pad: V, home: V) {
  part(g, rbox(0.09, 0.014, 0.07, 0.005), BLACK, pad[0], pad[1] + 0.007, pad[2], { outline: false });
  part(g, box(0.078, 0.003, 0.058), SEAL, pad[0], pad[1] + 0.015, pad[2], { outline: false });
  part(g, rbox(0.07, 0.008, 0.07, 0.004), GREY_D, home[0], home[1] - STAMP_UP + 0.004, home[2], { outline: false });
}
/** A little framed family picture, the sort someone keeps on a desk. */
function photoFrame(g: THREE.Object3D, x: number, y: number, z: number, ry = 0) {
  const f = group(g, x, y, z, ry);
  part(f, box(0.14, 0.11, 0.012), WOOD_D, 0, 0.055, 0, { outline: false, rx: -0.2 });
  const tex = painted('bhFamilyPhoto', 96, 76, (c) => {
    c.fillStyle = '#bfe0ee';
    c.fillRect(0, 0, 96, 76);
    c.fillStyle = '#8cc08f';
    c.fillRect(0, 54, 96, 22);
    ['#e8785a', '#27496d', '#f4b13f'].forEach((col, i) => {
      const px = 24 + i * 24;
      const h = i === 2 ? 14 : 24;
      c.fillStyle = col;
      c.fillRect(px - 7, 62 - h, 14, h);
      c.fillStyle = '#ecc6a3';
      c.beginPath();
      c.arc(px, 62 - h - 6, pos(6), 0, 6.3);
      c.fill();
    });
  });
  picture(f, tex, 0.12, 0.09, 0, 0.055, 0.008, '#ffffff', 0, -0.2);
}

// ---------------------------------------------------------------------------------------------
// Other people: drawn, played by VRoid bodies when they've come.

interface Fig {
  root: THREE.Group;
  head: THREE.Group;
  armL(to: THREE.Vector3 | null): void;
  armR(to: THREE.Vector3 | null): void;
  opts: FigureOptions;
}
function person(parent: THREE.Object3D, top: string, bottom: string, hair: string, x: number, z: number, ry: number, gender: 'female' | 'male', seat?: number, seed?: number, stage?: FigureOptions['stage']): Fig {
  const root = group(parent, x, 0, z, ry);
  const sitting = seat !== undefined;
  const base = sitting ? seat + 0.07 - 0.88 : 0;
  if (sitting) {
    for (const sx of [-1, 1]) {
      const ankle = v3(sx * 0.09, 0.08, 0.42);
      const knee = v3(sx * 0.09, seat + 0.03, 0.3);
      rod(root, v3(sx * 0.09, seat + 0.08, -0.08), knee, 0.056, bottom);
      rod(root, knee, ankle, 0.045, bottom);
      part(root, rbox(0.09, 0.07, 0.2, 0.03), '#37474f', ankle.x, ankle.y - 0.045, ankle.z + 0.04);
    }
    part(root, rbox(0.3, 0.17, 0.2, 0.06), bottom, 0, seat + 0.08, -0.08);
  } else {
    for (const sx of [-1, 1]) {
      rod(root, v3(sx * 0.085, 0.84, 0), v3(sx * 0.09, 0.08, 0.01), 0.056, bottom);
      part(root, rbox(0.09, 0.07, 0.2, 0.03), '#37474f', sx * 0.09, 0.035, 0.04);
    }
    part(root, rbox(0.3, 0.17, 0.2, 0.06), bottom, 0, 0.88, 0);
  }
  const dz = sitting ? -0.08 : 0;
  part(root, rbox(0.34, 0.46, 0.21, 0.08), top, 0, base + 1.11, dz);
  part(root, cyl(0.045, 0.05, 0.08, 10), SKIN, 0, base + 1.37, dz, { outline: false });
  const head = group(root, 0, base + 1.51, dz);
  part(head, ball(0.112), SKIN, 0, 0, 0);
  for (const sx of [-1, 1]) part(head, ball(0.012), '#2b2b30', sx * 0.04, 0, 0.104, { outline: false });
  part(head, ball(0.118), hair, 0, 0.03, -0.03);
  const arm = (sx: number) => {
    const shoulder = v3(sx * 0.2, base + 1.31, dz);
    const rest = sitting ? v3(sx * 0.11, seat + 0.14, 0.2) : v3(sx * 0.23, 0.82, 0.05);
    const upper = limb(root, 0.042, top);
    const lower = limb(root, 0.035, SKIN);
    const hand = part(root, ball(0.036), SKIN, 0, 0, 0, { outline: false });
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
      elbow.copy(shoulder).addScaledVector(d, a * cosA).addScaledVector(bend, a * Math.sqrt(Math.max(0, 1 - cosA * cosA)));
      upper(shoulder, elbow);
      lower(elbow, loc);
      hand.position.copy(loc);
    };
  };
  const armL = arm(1);
  const armR = arm(-1);
  armL(null);
  armR(null);
  const opts: FigureOptions = { gender, seat, seed, stage };
  const f = vroidFigure({ root, head, armL, armR }, opts);
  root.visible = false;
  return { ...f, opts };
}
function lazy(make: () => Fig) {
  let f: Fig | null = null;
  return { get: () => (f ??= make()), hide: () => void (f && (f.root.visible = false)) };
}
const nodHead = (F: Fig, v: number) => {
  F.opts.nod = v;
  F.head.rotation.x = v;
};

// ---------------------------------------------------------------------------------------------
// Tools designed for the hand. Each has its origin at the grip and is named for the probe.

const DOWN_IN = v3(-0.12, -1, -0.28).normalize();
interface Tool {
  root: THREE.Group;
  held: HeldTool;
}
function penTool(g: THREE.Object3D, name: string, color = NAVY): Tool {
  const root = group(g);
  root.name = name;
  const inner = group(root);
  inner.quaternion.setFromUnitVectors(v3(0, -1, 0), DOWN_IN);
  part(inner, cyl(0.006, 0.006, PEN_UP * 0.78 + 0.05, 10), color, 0, (0.05 - PEN_UP * 0.78) / 2, 0, { outline: false });
  part(inner, cyl(0.006, 0.002, PEN_UP * 0.22, 10), BLACK, 0, -PEN_UP * 0.89, 0, { outline: false });
  return { root, held: { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: DOWN_IN.clone(), shape: 'pen', radius: 0.012, writes: PEN_UP } } } };
}
function stampTool(g: THREE.Object3D, name: string): Tool {
  const root = group(g);
  root.name = name;
  part(root, cyl(0.016, 0.018, 0.09, 12), '#3a2616', 0, 0.002, 0, { outline: false });
  part(root, ball(0.021), '#3a2616', 0, 0.058, 0, { outline: false });
  part(root, cyl(0.024, 0.024, 0.012, 14), '#c49a3c', 0, -0.05, 0, { outline: false });
  part(root, cyl(0.03, 0.03, 0.022, 16), '#5a4028', 0, -STAMP_UP + 0.012, 0, { outline: false });
  part(root, cyl(0.028, 0.028, 0.002, 16), SEAL, 0, -STAMP_UP + 0.001, 0, { outline: false });
  return { root, held: { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.017 } } } };
}
/** A desk handset: +y to the earpiece. `set(lift)` turns it from lying on its cradle to the ear's slant. */
function handsetTool(g: THREE.Object3D, name: string): Tool & { set(lift: number): void } {
  const root = group(g);
  root.name = name;
  part(root, cyl(0.016, 0.016, 0.13, 10), GRAPHITE, 0, 0, 0, { outline: false });
  part(root, rbox(0.044, 0.05, 0.05, 0.012), GRAPHITE, 0, 0.085, 0.008, { outline: false });
  part(root, rbox(0.044, 0.05, 0.05, 0.012), GRAPHITE, 0, -0.085, 0.008, { outline: false });
  const rest = new THREE.Quaternion().setFromUnitVectors(UP, v3(0, 0, -1));
  const ear = new THREE.Quaternion().setFromUnitVectors(UP, v3(0, 0.93, 0.36).normalize());
  return {
    root,
    held: { tool: root, lead: 'left', grips: { left: { at: v3(0, 0, 0), axis: v3(0, 1, 0), palm: v3(1, 0, 0), shape: 'power', radius: 0.018 } } },
    set: (lift) => void root.quaternion.slerpQuaternions(rest, ear, clamp01(lift)),
  };
}
/** A book or binder laid open, held at its outer edges from beneath. */
function bookTool(g: THREE.Object3D, name: string, cover: string, paint: (c: Ctx2) => void): Tool & { face: THREE.Mesh; leaf: THREE.Group } {
  const root = group(g);
  root.name = name;
  part(root, box(0.31, 0.008, 0.215), cover, 0, -0.004, 0, { outline: false });
  part(root, box(0.29, 0.018, 0.2), PAPER, 0, 0.009, 0, { outline: false });
  const face = lyingPlane(root, 0.285, 0.195, 0, 0.0185, 0);
  setMap(face, painted(`bhBook|${name}`, 300, 204, paint));
  const leaf = group(root, 0, 0.02, 0);
  part(leaf, box(0.14, 0.001, 0.195), '#f4f1e6', 0.07, 0, 0, { outline: false });
  leaf.visible = false;
  const grip = (x: number) => ({ at: v3(x, -0.012, 0.02), axis: v3(0, 0, -1), palm: v3(0, 1, 0), shape: 'flat' as const, radius: 0.012 });
  return { root, face, leaf, held: { tool: root, lead: 'right', grips: { right: grip(0.145), left: grip(-0.145) } } };
}
function bizCardTool(g: THREE.Object3D): Tool {
  const root = group(g);
  root.name = 'bhBizCard';
  part(root, box(0.09, 0.002, 0.052), PAPER, 0, 0, 0, { outline: false });
  part(root, cyl(0.009, 0.009, 0.002, 12), SUN, -0.03, 0.0018, -0.012, { outline: false });
  part(root, box(0.04, 0.0012, 0.005), NAVY_D, 0.012, 0.0016, -0.008, { outline: false });
  part(root, box(0.05, 0.0012, 0.003), GREY, 0.008, 0.0016, 0.008, { outline: false });
  const grip = (x: number) => ({ at: v3(x, 0, 0.018), axis: v3(0, 0, -1), palm: v3(0, -1, 0), shape: 'pinch' as const, radius: 0.004 });
  return { root, held: { tool: root, lead: 'right', grips: { right: grip(0.04), left: grip(-0.04) } } };
}
/** A small flat thing held by a near corner: a photo, a leaflet, a schedule card. */
function cardTool(g: THREE.Object3D, name: string, w: number, d: number, side: 'left' | 'right' = 'right'): Tool & { face: THREE.Mesh } {
  const root = group(g);
  root.name = name;
  const inner = group(root, side === 'right' ? -w / 2 + 0.012 : w / 2 - 0.012, 0, -d / 2 + 0.012);
  part(inner, box(w, 0.002, d), PAPER, 0, 0, 0, { outline: false });
  const face = lyingPlane(inner, w - 0.006, d - 0.006, 0, 0.0016, 0);
  const grip = { at: v3(0, 0, 0), axis: v3(0, 0, -1), palm: v3(0, -1, 0), shape: 'pinch' as const, radius: 0.004 };
  return { root, face, held: { tool: root, lead: side, grips: { [side]: grip } } };
}
/** A magnifier: the handle along z, towards whoever holds it, the lens flat out ahead. */
function magnifierTool(g: THREE.Object3D): Tool {
  const root = group(g);
  root.name = 'bhMagnifier';
  const handle = part(root, cyl(0.013, 0.015, 0.12, 12), '#7a4a2a', 0, 0, 0, { outline: false });
  handle.rotation.x = Math.PI / 2;
  part(root, cyl(0.007, 0.007, 0.03, 8), CHROME, 0, 0, -0.07, { outline: false, rx: Math.PI / 2 });
  part(root, ring(0.05, 0.0045), CHROME, 0, 0, -0.135, { outline: false, rx: Math.PI / 2 });
  glass(root, cyl(0.048, 0.048, 0.003, 22), 0, 0, -0.135);
  return { root, held: { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 0, 1), shape: 'power', radius: 0.015 } } } };
}

// ---------------------------------------------------------------------------------------------
// 설계 책상 (agentDesk, 1 × 1).

function paintDeskScreen(c: Ctx2, w: number, h: number, mode: number, n: Record<string, number>, round: number) {
  c.fillStyle = '#f2f6f9';
  c.fillRect(0, 0, w, h);
  c.fillStyle = NAVY;
  c.fillRect(0, 0, w, 26);
  text(c, ['보장 설계', '고객 관리 전화', '상품 공부', '청구 심사', '보장 분석'][wrap(mode, 5)], 8, 14, 13, '#ffffff');
  text(c, COMPANY, w - 8, 14, 11, SUN_L, 'right', false);
  text(c, mode === 2 ? '새 특약 살펴보기' : clientOf(round), 12, 44, 14, INK);
  const fill = n.fill ?? 0;
  if (mode === 1) {
    for (let i = 0; i < 4; i++) {
      const y = 70 + i * 26;
      c.fillStyle = i === 1 ? SUN_L : '#ffffff';
      c.fillRect(10, y - 11, w - 20, 22);
      text(c, clientOf(round + i), 16, y, 12, INK, 'left', false);
      text(c, ['생일 안부', '만기 안내', '보장 점검', '방문 약속'][i], w - 14, y, 11, GREY_D, 'right', false);
      if (i === 1 && (n.ticks ?? 0) > 0.5) text(c, '✓', w - 80, y, 15, GREEN, 'center');
    }
    if (fill > 0.1) {
      c.fillStyle = '#e9f3e6';
      c.fillRect(10, h - 34, (w - 20) * clamp01(fill / 2), 24);
      text(c, '메모: 다음 주 목요일 방문', 16, h - 22, 12, INK, 'left', false);
    }
    return;
  }
  COVERS.forEach((s, i) => {
    const y = 70 + i * 26;
    const f = clamp01(fill - i);
    c.fillStyle = '#ffffff';
    c.fillRect(10, y - 11, w - 20, 22);
    text(c, s, 16, y, 12, GREY_D, 'left', false);
    if (f > 0.02) {
      const need = [0.82, 0.55, 0.68, 0.45][i];
      if (mode === 4) {
        c.fillStyle = '#e4d7c3';
        c.fillRect(120, y - 7, (w - 136) * need, 14);
        c.fillStyle = (n.gap ?? 0) > 0.4 && i === 2 ? CORAL : NAVY;
        c.fillRect(120, y - 4, (w - 136) * need * f * (i === 2 ? 0.45 : 0.95), 8);
      } else {
        c.fillStyle = [GREEN, SUN, NAVY, CORAL][i];
        c.fillRect(120, y - 6, (w - 136) * need * f, 12);
      }
    }
  });
  if ((n.sum ?? 0) > 0.5) text(c, `월 보험료 ${won(38000 + wrap(round, 6) * 3000)}`, w - 12, h - 18, 14, NAVY_D, 'right');
  if (mode === 3 && (n.sealed ?? 0) > 0.5) text(c, '심사 완료', w - 14, h - 18, 15, GREEN, 'right');
  if (mode === 4 && (n.sent ?? 0) > 0.5) text(c, '리포트 보냄', w - 14, h - 18, 14, GREEN, 'right');
}
function paintNeeds(c: Ctx2, w: number, h: number, name: string, marked: boolean, ticks: number) {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, w, h);
  text(c, name, w / 2, 24, 15, INK, 'center');
  c.strokeStyle = '#9aa3a8';
  c.lineWidth = 1;
  c.strokeRect(12, 44, w - 24, h - 60);
  for (let i = 0; i < 7; i++) {
    const y = 62 + i * 21;
    c.fillStyle = '#c9cfd3';
    c.fillRect(20, y, w - 44 - (i % 3) * 18, 4);
    if (i < ticks) text(c, '✓', w - 26, y + 2, 14, NAVY, 'center');
    if (marked && i === 3) {
      c.fillStyle = 'rgba(244,177,63,0.5)';
      c.fillRect(18, y - 6, w - 40, 15);
    }
  }
}
function agentDesk(g: THREE.Group, out: Built) {
  const T = AD.top;
  deskTop(g, 0.98, T);
  // A low fabric partition behind, pinned with what someone here keeps: a thank-you note, a family, this month's line.
  part(g, rbox(0.98, 1.22, 0.04, 0.012), '#9fb2bf', 0, 0.61, -0.4);
  part(g, box(0.98, 0.03, 0.05), WOOD_D, 0, 1.235, -0.4, { outline: false });
  const note = painted('bhThanksNote', 128, 96, (c) => {
    c.fillStyle = '#fff4c8';
    c.fillRect(0, 0, 128, 96);
    text(c, '고맙습니다', 64, 26, 17, '#6b4a10', 'center');
    text(c, '덕분에 수술 잘', 64, 52, 12, INK, 'center', false);
    text(c, '받았어요', 64, 70, 12, INK, 'center', false);
    heart(c, 96, 70, 6);
  });
  picture(g, note, 0.14, 0.105, 0.36, 1.1, -0.378);
  label(g, '이번 달: 고객 안부 30통', 0.34, 0.05, -0.28, 1.17, -0.378, NAVY, '#ffffff');
  const scr = monitor(g, AD.screen, 0.46, 0.28, T, 320, 195);
  chair(g, AD.seat);
  keyboard(g, AD.keys, 0.24);
  phoneBase(g, AD.phone);
  stampPad(g, AD.pad, AD.stampHome);
  penCup(g, AD.penHome);
  const calc = calculator(g, AD.calc);
  photoFrame(g, 0.34, T, -0.25, -0.2);
  // Product binders against the partition, and a mug.
  ['#d98c5f', '#6e9fbd', '#7fae85'].forEach((col, i) => part(g, box(0.04, 0.26, 0.2), col, -0.44 + i * 0.045, T + 0.13, -0.26));
  part(g, cyl(0.036, 0.032, 0.08, 14), CREAM, 0.44, T + 0.04, -0.14);
  part(g, ring(0.02, 0.005), CREAM, 0.48, T + 0.04, -0.14, { outline: false });
  const tray = group(g, AD.outTray[0], T + 0.01, AD.outTray[2] - 0.04);
  part(tray, box(0.2, 0.02, 0.1), SKY, 0, 0, 0, { outline: false });
  const seat = AD.seat;
  const sheet = group(g, AD.paper[0], AD.paper[1], AD.paper[2]);
  part(sheet, box(0.21, 0.002, 0.297), PAPER, 0, 0, 0, { outline: false });
  const sheetFace = liveScreen(sheet, 0.2, 0.285, 150, 212, 0, 0.0016, 0, 0, FLAT);
  sheet.visible = false;
  const pen = penTool(g, 'bhDeskPen');
  const stamp = stampTool(g, 'bhDeskStamp');
  const phone = handsetTool(g, 'bhDeskHandset');
  const book = bookTool(g, 'bhProductBook', '#d98c5f', (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 300, 204);
    c.fillStyle = '#d9d4c5';
    c.fillRect(148, 0, 4, 204);
    text(c, '가족 든든 특약', 74, 22, 15, NAVY_D, 'center');
    for (let i = 0; i < 7; i++) {
      c.fillStyle = '#c9cfd3';
      c.fillRect(14, 46 + i * 20, 116 - (i % 3) * 14, 4);
      c.fillRect(168, 24 + i * 22, 116 - ((i + 1) % 3) * 14, 4);
    }
    c.fillStyle = 'rgba(244,177,63,0.45)';
    c.fillRect(162, 62, 124, 14);
  });
  book.root.visible = false;
  const spots: Record<string, Spot> = {
    designPlan: seatAt(g, 'bhDesign', seat),
    callClients: seatAt(g, 'bhCall', seat),
    insuranceAgent_studyProducts: seatAt(g, 'bhStudy', seat),
    insuranceAgent_reviewClaim: seatAt(g, 'bhReview', seat),
    insuranceAgent_coverageReview: seatAt(g, 'bhCoverage', seat),
  };
  spots['*'] = spots.designPlan;
  out.seat = marker(g, seat[0], seat[1], seat[2]);
  out.work = marker(g, AD.keys[0], AD.keys[1], AD.keys[2]);
  const tools: Partial<Record<BhTool, HeldTool>> = { pen: pen.held, stamp: stamp.held, phone: phone.held, book: book.held };
  let seed = -1;
  drive(g, out, spots, tools, (_now, N) => {
    if (seed < 0) {
      seed = seedOf(g);
      label(g, ['설계사 오', '설계사 나', '설계사 윤', '설계사 강'][wrap(seed, 4)], 0.16, 0.04, 0.14, T + 0.04, -0.3, NAVY, '#ffffff');
    }
    const n = N?.n ?? {};
    const round = (N?.b.n ?? 0) + seed;
    const mode = n.mode ?? 0;
    scr.draw(`${mode}|${wrap(round, 40)}|${q(n.fill, 8)}|${q(n.sum, 2)}|${q(n.ticks, 2)}|${q(n.sealed, 2)}|${q(n.gap, 2)}|${q(n.sent, 2)}`, (c) => paintDeskScreen(c, 320, 195, mode, n, round));
    const paper = (n.paper ?? 0) > 0.5 || (n.folder ?? 0) > 0.02;
    sheet.visible = paper;
    if (paper) {
      const moved = clamp01(n.moved);
      sheet.position.set(AD.paper[0] + (AD.outTray[0] - AD.paper[0]) * moved, AD.paper[1] + 0.05 * Math.sin(moved * Math.PI), AD.paper[2] + (AD.outTray[2] - AD.paper[2]) * moved);
      const ticks = Math.floor(n.ticks ?? 0);
      const marked = (n.marked ?? 0) > 0.5;
      const title = mode === 3 ? '보험금 청구서' : mode === 1 ? '오늘 전화할 분' : clientOf(round);
      sheetFace.draw(`${title}|${ticks}|${marked ? 1 : 0}|${q(n.sealed, 2)}`, (c) => {
        paintNeeds(c, 150, 212, title, marked, ticks);
        if ((n.sealed ?? 0) > 0.5) {
          c.strokeStyle = SEAL;
          c.lineWidth = 2.5;
          c.strokeRect(100, 164, 34, 34);
          text(c, '심사', 117, 181, 12, SEAL, 'center');
        }
      });
    }
    calc((n.sum ?? 0) > 0.5 ? `${38000 + wrap(round, 6) * 3000}` : mode === 0 && N ? `${Math.floor((n.sum ?? 0) * 38000)}` : '0');
    at(pen.root, N?.props.pen ?? null, AD.penHome);
    at(stamp.root, N?.props.stamp ?? null, AD.stampHome);
    at(phone.root, N?.props.phone ?? null, AD.phone);
    phone.set(n.lift ?? 0);
    at(book.root, N?.props.book ?? null);
    book.leaf.visible = (n.turn ?? 0) > 0.02;
    book.leaf.rotation.z = Math.PI * clamp01(n.turn);
  });
}

// ---------------------------------------------------------------------------------------------
// 상담 부스 (consultBooth, 2 × 1).

function paintPlanScreen(c: Ctx2, w: number, h: number, plan: number, page: number, sealed: boolean, signed: boolean) {
  c.fillStyle = '#fdf9ef';
  c.fillRect(0, 0, w, h);
  c.fillStyle = SUN;
  c.fillRect(0, 0, w, 40);
  text(c, plan === 2 ? '우리 회사 단체 보장 안내' : '우리 가족 보장 한눈에', 14, 21, 21, NAVY_D);
  const rows = plan === 2 ? ['직원 48명 상해', '입원·수술', '건강 검진 지원', '가족까지 함께'] : COVERS;
  const amt = plan === 2 ? ['1인 3천만원', '하루 3만원', '해마다 1회', '선택 가능'] : ['하루 4만원', '연 50만원', '최대 1억원', '건당 1천만원'];
  rows.forEach((s, i) => {
    const y = 72 + i * 44;
    const on = Math.floor(page) === i + 1 || page >= 4.5;
    c.fillStyle = Math.floor(page) === i + 1 ? SUN_L : '#ffffff';
    c.fillRect(12, y - 19, w - 24, 38);
    c.strokeStyle = '#e4dcc9';
    c.strokeRect(12, y - 19, w - 24, 38);
    text(c, s, 24, y, 18, on ? INK : GREY_D);
    text(c, amt[i], w - 22, y, 16, on ? NAVY : GREY, 'right', false);
  });
  if (signed || sealed) text(c, sealed ? '계약 성사, 고맙습니다' : '서명 완료, 고맙습니다', w / 2, h - 22, 19, '#2e7d32', 'center');
  else text(c, `${COMPANY} ${BRANCH}`, w / 2, h - 22, 13, GREY_D, 'center', false);
}
function paintPolicy(c: Ctx2, w: number, h: number, big: boolean, signed: boolean, sealed: boolean) {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, w, h);
  text(c, big ? '단체 보험 계약서' : '보장 내용 확인서', w / 2, 24, 15, INK, 'center');
  c.fillStyle = SUN;
  c.fillRect(14, 40, w - 28, 3);
  for (let i = 0; i < 6; i++) {
    c.fillStyle = '#c9cfd3';
    c.fillRect(20, 58 + i * 20, w - 44 - (i % 3) * 16, 4);
  }
  c.strokeStyle = '#9aa3a8';
  c.strokeRect(20, h - 54, 70, 30);
  text(c, '서명', 34, h - 66, 10, GREY_D, 'center', false);
  if (signed) {
    c.strokeStyle = NAVY_D;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(26, h - 36);
    c.bezierCurveTo(40, h - 56, 50, h - 26, 62, h - 42);
    c.lineTo(82, h - 34);
    c.stroke();
  }
  if (sealed) {
    c.strokeStyle = SEAL;
    c.lineWidth = 2.5;
    c.beginPath();
    c.arc(w - 40, h - 40, pos(18), 0, 6.3);
    c.stroke();
    text(c, '봄볕', w - 40, h - 40, 12, SEAL, 'center');
  }
}
function consultBooth(g: THREE.Group, out: Built) {
  const T = CB.top;
  deskTop(g, 1.96, T);
  // Frosted side screens at each end, reaching round the visitors' chairs.
  for (const sx of [-1, 1]) {
    part(g, box(0.035, 0.62, 1.42), CREAM, sx * 0.985, 0.31, -0.42);
    glass(g, box(0.012, 0.56, 1.34), sx * 0.985, 0.92, -0.42);
    part(g, box(0.035, 0.03, 1.42), WOOD_D, sx * 0.985, 1.21, -0.42, { outline: false });
  }
  label(g, '상담', 0.2, 0.07, 0.96, 1.02, 0.29, SUN, NAVY_D);
  chair(g, CB.seat);
  keyboard(g, CB.keys);
  // The screen on an arm at the left end, turned so that both sides of the desk can read it.
  const arm = group(g, CB.screen[0], 0, CB.screen[2], CB.screenRy);
  part(arm, box(0.66, 0.45, 0.03), BLACK, 0, CB.screen[1], -0.018, { outline: false });
  part(g, cyl(0.022, 0.03, CB.screen[1] - T, 10), GREY_D, CB.screen[0] - 0.06, T + (CB.screen[1] - T) / 2, CB.screen[2], { outline: false });
  part(g, rbox(0.22, 0.016, 0.18, 0.006), GREY_D, CB.screen[0] - 0.06, T + 0.008, CB.screen[2], { outline: false });
  const scr = liveScreen(arm, 0.63, 0.42, 420, 280, 0, CB.screen[1], 0.001);
  stampPad(g, CB.pad, CB.stampHome);
  penCup(g, CB.penHome);
  part(g, cyl(0.05, 0.05, 0.11, 14), '#7fae85', 0.86, T + 0.055, -0.24);
  part(g, ball(0.08), '#5f9a55', 0.86, T + 0.16, -0.24);
  // Tissues, ready to be pushed over. Tea when it's poured.
  const tissue = group(g, CB.tissue[0], T, CB.tissue[2]);
  part(tissue, rbox(0.17, 0.07, 0.09, 0.012), SUN_L, 0, 0.035, 0);
  part(tissue, box(0.06, 0.03, 0.02), PAPER, 0, 0.08, 0, { outline: false });
  const cups = [-0.1, 0.34].map((x) => {
    const m = group(g, x, T, CB.cup[2]);
    part(m, cyl(0.034, 0.028, 0.06, 12), CREAM, 0, 0.03, 0);
    part(m, cyl(0.028, 0.028, 0.002, 12), '#b98a4a', 0, 0.058, 0, { outline: false });
    m.visible = false;
    return m;
  });
  // The paper they go through.
  const doc = group(g, CB.doc[0], CB.doc[1], CB.doc[2]);
  part(doc, box(0.21, 0.002, 0.297), PAPER, 0, 0, 0, { outline: false });
  const docFace = liveScreen(doc, 0.2, 0.285, 150, 212, 0, 0.0016, 0, 0, FLAT);
  const pen = penTool(g, 'bhBoothPen');
  const stamp = stampTool(g, 'bhBoothStamp');
  const card = bizCardTool(g);
  card.root.visible = false;
  // Visitors' chairs, there before anyone comes.
  CB.people.forEach((p, i) => guestChair(g, p[0], p[1], p[2], i === 2 ? CORAL : SUN, i === 2 ? 0.32 : 0.42));
  const seat = CB.seat;
  const spots: Record<string, Spot> = {
    insuranceConsult: seatAt(g, 'bhConsult', seat),
    bigContract: seatAt(g, 'bhBig', seat),
    insuranceAgent_listenNeeds: seatAt(g, 'bhListen', seat),
  };
  spots['*'] = spots.insuranceConsult;
  out.seat = marker(g, seat[0], seat[1], seat[2]);
  out.work = marker(g, CB.keys[0], CB.keys[1], CB.keys[2]);
  const P = CB.people;
  const mum = lazy(() => person(g, '#c98a78', '#47525a', '#3a2a1f', P[0][0], P[0][2], 0, 'female', P[0][1], 12));
  const dad = lazy(() => person(g, '#6b86a6', '#333c44', '#2a211a', P[1][0], P[1][2], 0, 'male', P[1][1], 23));
  const kid = lazy(() => person(g, '#f0c14f', '#5a7fa8', '#2a211a', P[2][0], P[2][2], 0, 'female', P[2][1], 34, 'child'));
  const boss = lazy(() => person(g, '#3c4a58', '#2e3740', '#59524a', P[1][0], P[1][2], 0, 'male', P[1][1], 45, 'elder'));
  const worry = bubble(g, '아이가 아프면 어쩌죠', 0.86, P[0][0], 1.52, P[0][2]);
  const eased = bubble(g, '마음이 놓여요', 0.66, P[0][0], 1.52, P[0][2]);
  const thanks = bubble(g, '잘 부탁드려요', 0.66, P[1][0], 1.52, P[1][2]);
  const dealt = bubble(g, '직원들이 좋아하겠어요', 0.9, P[1][0], 1.74, P[1][2]);
  const to = new THREE.Vector3();
  const tools: Partial<Record<BhTool, HeldTool>> = { pen: pen.held, stamp: stamp.held, bizcard: card.held };
  let seed = -1;
  drive(g, out, spots, tools, (_now, N, t) => {
    if (seed < 0) {
      seed = seedOf(g);
      label(g, `상담실 ${'ABCD'[wrap(seed, 4)]}`, 0.2, 0.05, 0.24, T + 0.04, -0.3, NAVY, '#ffffff');
    }
    const n = N?.n ?? {};
    const plan = n.plan ?? 0;
    const signed = (n.signed ?? 0) > 0.5;
    const sealed = (n.sealed ?? 0) > 0.5;
    scr.draw(`${plan}|${Math.floor(n.page ?? 0)}|${signed ? 1 : 0}|${sealed ? 1 : 0}`, (c) => paintPlanScreen(c, 420, 280, plan === 2 ? 2 : 1, n.page ?? 0, sealed, signed));
    at(doc, N?.props.doc ?? null, CB.doc);
    docFace.draw(`${plan}|${signed ? 1 : 0}|${sealed ? 1 : 0}`, (c) => paintPolicy(c, 150, 212, plan === 2, signed, sealed));
    at(pen.root, N?.props.pen ?? null, CB.penHome);
    at(stamp.root, N?.props.stamp ?? null, CB.stampHome);
    at(card.root, N?.props.bizcard ?? null);
    at(tissue, N?.props.tissue ?? null, CB.tissue);
    const tea = clamp01(n.teaOut);
    cups.forEach((m, i) => {
      m.visible = !!N && tea > 0.01;
      m.position.z = CB.cup[2] + 0.16 * (1 - tea);
      m.position.x = i ? 0.34 : -0.1;
    });
    const family = (n.family ?? 0) > 0.5;
    worry.visible = (n.worry ?? 0) > 0.5;
    eased.visible = (n.ok ?? 0) > 0.5;
    thanks.visible = (n.thanks ?? 0) > 0.5;
    dealt.visible = (n.deal ?? 0) > 0.5;
    const look = (n.look ?? 0) > 0.5 ? -0.75 : 0;
    const bob = (n.nods ?? 0) > 0.5 ? 0.14 + 0.08 * Math.sin(t * 2.6) : 0.05;
    if (family) {
      const m = mum.get();
      m.root.visible = true;
      m.head.rotation.y = look;
      nodHead(m, (n.worry ?? 0) > 0.5 ? 0.2 : bob);
      if ((n.worry ?? 0) > 0.5) m.armR(to.set(P[0][0] - 0.02, T + 0.05, P[0][2] + 0.34));
      else m.armR(null);
      m.armL(null);
      const d = dad.get();
      d.root.visible = true;
      d.head.rotation.y = look;
      nodHead(d, (n.thanks ?? 0) > 0.5 ? 0.25 : bob);
      if ((n.signing ?? 0) > 0.5) d.armR(to.set(CB.docOver[0] + 0.03 * Math.sin(t * 7), T + 0.03, Math.max(CB.docOver[2] - 0.14, -0.26)));
      else d.armR(null);
      d.armL(null);
      if ((n.duo ?? 0) < 0.5) {
        const k = kid.get();
        k.root.visible = true;
        k.head.rotation.y = 0.25 * Math.sin(t * 0.7);
        nodHead(k, 0.1 + 0.05 * Math.sin(t * 2.1));
      } else kid.hide();
    } else {
      mum.hide();
      dad.hide();
      kid.hide();
    }
    if ((n.boss ?? 0) > 0.5) {
      const b = boss.get();
      b.root.visible = true;
      b.head.rotation.y = look;
      const given = clamp01(n.cardGiven);
      if (given > 0.02 && given < 0.98) b.armR(to.set(0.12, 1.0, P[1][2] + 0.42));
      else b.armR(null);
      b.armL(null);
      nodHead(b, 0.06 + 0.35 * clamp01(n.bow) + ((n.nods ?? 0) > 0.5 ? 0.08 * Math.sin(t * 2.3) : 0));
    } else boss.hide();
  });
}

// ---------------------------------------------------------------------------------------------
// 실적 현황판 (bhMorningBoard, 2 × 1).

const TEAM = ['나보장 팀장', '오설계', '윤다정', '강미소'];
function paintBoard(c: Ctx2, w: number, h: number, row: number, word: boolean, round: number, wrote: number) {
  c.fillStyle = '#f8f5ea';
  c.fillRect(0, 0, w, h);
  c.fillStyle = NAVY;
  c.fillRect(0, 0, w, 62);
  text(c, `${BRANCH} 이달의 현황`, 20, 32, 30, '#ffffff');
  text(c, '11월', w - 20, 32, 26, SUN_L, 'right');
  text(c, '보장 설계', 240, 84, 17, GREY_D, 'center');
  text(c, '안부 전화', 350, 84, 17, GREY_D, 'center');
  text(c, '칭찬 별', 450, 84, 17, GREY_D, 'center');
  text(c, '고마움', 590, 84, 17, GREY_D, 'center');
  TEAM.forEach((s, i) => {
    const y = 122 + i * 52;
    const bar = 0.35 + ((wrap(i * 3 + round, 7) + 1) / 7) * 0.6;
    c.fillStyle = i === row ? SUN_L : i % 2 ? '#ffffff' : '#f1ece0';
    c.fillRect(10, y - 25, w - 20, 50);
    text(c, s, 22, y, 20, INK);
    c.fillStyle = '#ddd5c2';
    c.fillRect(160, y - 9, 160, 18);
    c.fillStyle = [GREEN, SUN, NAVY, CORAL][i];
    c.fillRect(160, y - 9, 160 * bar, 18);
    text(c, `${10 + wrap(i * 5 + round, 18)}통`, 350, y, 20, INK, 'center', false);
    for (let k = 0; k <= wrap(i + 2, 4); k++) heart(c, 558 + k * 22, y, 8);
  });
  // The day's word, and room at the bottom for the stars.
  c.fillStyle = word ? SUN : SUN_L;
  c.fillRect(10, 334, w - 20, 54);
  text(c, '오늘의 한마디: 걱정부터 먼저 들어요', w / 2, 361, 24, NAVY_D, 'center');
  // A figure written up by hand, top right, as it goes.
  if (wrote > 0.05) {
    c.fillStyle = 'rgba(39,73,109,0.9)';
    text(c, `상담 ${20 + wrap(round, 30)}`.slice(0, Math.ceil(wrote * 6)), w - 150, 95, 24, CORAL);
  }
}
function morningBoard(g: THREE.Group, out: Built) {
  const z = MB.plane;
  // On the wall: a frame, a ledge for the pointer and marker.
  part(g, rbox(1.92, 1.32, 0.05, 0.02), WOOD_D, 0, 1.36, z - 0.02);
  part(g, box(0.05, 0.74, 0.05), WOOD_D, -0.88, 0.37, z - 0.02, { outline: false });
  part(g, box(0.05, 0.74, 0.05), WOOD_D, 0.88, 0.37, z - 0.02, { outline: false });
  part(g, box(1.86, 0.03, 0.12), WOOD, 0, 0.72, z + 0.04);
  const board = liveScreen(g, 1.82, 1.2, 720, 475, 0, 1.36, z + 0.008);
  // A pot of magnets and a marker in its clip, up by the working end.
  part(g, cyl(0.03, 0.026, 0.05, 12), '#7fae85', MB.tray[0], MB.tray[1] - 0.04, MB.tray[2]);
  part(g, box(0.04, 0.012, 0.09), GREY_D, MB.clip[0], MB.clip[1] - 0.012, MB.clip[2], { outline: false });
  const pts: V[] = Array.from({ length: 10 }, (_, i) => starAt(i));
  const stars = pts.map((p) => {
    const m = part(g, cyl(0.026, 0.026, 0.01, 5), SUN, p[0], p[1], p[2], { outline: false });
    m.rotation.x = Math.PI / 2;
    m.visible = false;
    return m;
  });
  const pointerT = (() => {
    const root = group(g);
    root.name = 'bhPointer';
    part(root, cyl(0.013, 0.015, 0.11, 10), GRAPHITE, 0, 0, 0, { outline: false });
    part(root, cyl(0.005, 0.003, 0.46, 8), CHROME, 0, 0.28, 0, { outline: false });
    part(root, ball(0.009), CORAL, 0, 0.51, 0, { outline: false });
    const held: HeldTool = { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.015 } } };
    return { root, held };
  })();
  const aimed = new THREE.Quaternion().setFromUnitVectors(UP, v3(0.48, 0.08, -0.87).normalize());
  const lying = new THREE.Quaternion().setFromUnitVectors(UP, v3(1, 0, 0));
  const magnet = (() => {
    const root = group(g);
    root.name = 'bhStarMagnet';
    const m = part(root, cyl(0.026, 0.026, 0.012, 5), SUN, 0, 0, 0, { outline: false });
    m.rotation.x = Math.PI / 2;
    const held: HeldTool = { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0.012), axis: v3(0, 1, 0), palm: v3(0, 0, -1), shape: 'pinch', radius: 0.006 } } };
    return { root, held };
  })();
  magnet.root.visible = false;
  const penT = (() => {
    const root = group(g);
    root.name = 'bhMarker';
    const a = v3(0, -0.2, -1).normalize();
    const inner = group(root);
    inner.quaternion.setFromUnitVectors(v3(0, 0, -1), a);
    part(inner, cyl(0.01, 0.01, 0.12, 10), '#c7372f', 0, 0, -0.015, { outline: false, rx: Math.PI / 2 });
    part(inner, cyl(0.009, 0.003, 0.03, 8), BLACK, 0, 0, -0.09, { outline: false, rx: Math.PI / 2 });
    const held: HeldTool = { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: a.clone(), shape: 'pen', radius: 0.012 } } };
    return { root, held };
  })();
  const spots: Record<string, Spot> = {
    bhMorning: standAt(g, 'bhMorning', MB.speaker[0], MB.speaker[1]),
    bhPostResult: standAt(g, 'bhPostResult', 0.1, 0.14),
  };
  spots['*'] = spots.bhMorning;
  out.work = marker(g, 0, 1.3, z + 0.1);
  const crew = MB.people.map((p, i) =>
    lazy(() => person(g, ['#3c5a78', '#7a8a9a', '#9a6f6a'][i], ['#2e3740', '#39424a', '#3f3a3e'][i], ['#59524a', '#2a211a', '#3a2a1f'][i], p[0], p[1], p[2], i === 2 ? 'female' : 'male', undefined, 60 + i, i === 0 ? 'elder' : undefined)),
  );
  const cheer = bubble(g, '오늘도 마음을 다해요!', 0.86, 0.72, 1.92, MB.people[1][1]);
  const to = new THREE.Vector3();
  const tools: Partial<Record<BhTool, HeldTool>> = { pointer: pointerT.held, magnet: magnet.held, marker: penT.held };
  drive(g, out, spots, tools, (_now, N, t) => {
    const n = N?.n ?? {};
    const round = N?.b.n ?? 0;
    const row = Math.round(n.row ?? -1);
    board.draw(`${row}|${(n.word ?? 0) > 0.5 ? 1 : 0}|${wrap(round, 60)}|${q(n.wrote, 6)}`, (c) => paintBoard(c, 720, 475, row, (n.word ?? 0) > 0.5, wrap(round, 60), n.wrote ?? 0));
    stars.forEach((m, s) => {
      const ago = wrap(round - s, 10);
      m.visible = (ago >= 1 && ago <= 4) || (ago === 0 && (n.stuck ?? 0) > 0.5);
    });
    at(pointerT.root, N?.props.pointer ?? null, MB.pointerHome);
    pointerT.root.quaternion.copy(N?.tool === 'pointer' ? aimed : lying);
    at(magnet.root, N?.props.magnet ?? null);
    at(penT.root, N?.props.marker ?? null, MB.clip);
    cheer.visible = (n.cheer ?? 0) > 0.5;
    const on = (n.team ?? 0) > 0.5;
    crew.forEach((c, i) => {
      if (!on) return c.hide();
      const f = c.get();
      f.root.visible = true;
      const p = MB.people[i];
      nodHead(f, (n.nods ?? 0) > 0.5 ? 0.08 + 0.06 * Math.sin(t * 2.1 + i) : 0.03);
      if ((n.claps ?? 0) > 0.5) {
        const gap = 0.03 + 0.05 * Math.abs(Math.sin(t * 7 + i));
        f.armL(to.set(p[0] - 0.3, 1.08, p[1] + gap));
        f.armR(to.set(p[0] - 0.3, 1.08, p[1] - gap));
      } else if ((n.cheer ?? 0) > 0.5) {
        f.armR(to.set(p[0] - 0.08, 1.84 - 0.05 * Math.abs(Math.sin(t * 6 + i)), p[1] - 0.14));
        f.armL(null);
      } else {
        f.armL(null);
        f.armR(null);
      }
    });
  });
}

// ---------------------------------------------------------------------------------------------
// 보상 창구 (bhClaimDesk, 2 × 1).

function paintClaimScreen(c: Ctx2, w: number, h: number, mode: number, fill: number, sum: number, round: number, sealed: boolean) {
  c.fillStyle = '#f2f6f9';
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#b5683f';
  c.fillRect(0, 0, w, 26);
  text(c, mode ? '보험금 계산' : '사고 접수', 8, 14, 13, '#ffffff');
  text(c, '작은 접촉 사고', w - 8, 14, 11, SUN_L, 'right', false);
  const a = amounts(round);
  const rows: Array<[string, string]> = mode ? [['수리비', won(a.repair)], ['치료비', won(a.care)], ['자기 부담금', `- ${won(a.self)}`]] : [['사고 장소', '마트 주차장'], ['다친 곳', '없어요 (가벼운 놀람)'], ['차량', '뒤 범퍼 긁힘']];
  rows.forEach(([s, v], i) => {
    const y = 48 + i * 30;
    const show = mode ? sum >= i + 1 || fill - i > 0.5 : fill - i > 0.1;
    c.fillStyle = '#ffffff';
    c.fillRect(10, y - 12, w - 20, 24);
    text(c, s, 16, y, 13, GREY_D, 'left', false);
    if (show) text(c, v, w - 16, y, 13, INK, 'right');
  });
  if (mode && sum >= 3.9) {
    c.fillStyle = SUN_L;
    c.fillRect(10, h - 42, w - 20, 32);
    text(c, '지급액', 16, h - 26, 14, NAVY_D);
    text(c, won(a.pay), w - 16, h - 26, 17, NAVY_D, 'right');
  }
  if (sealed) text(c, '승인', w - 40, 14, 12, '#a6f0a6', 'right');
}
function paintSlip(c: Ctx2, round: number, sealed: boolean) {
  const a = amounts(round);
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 150, 212);
  text(c, '보험금 계산서', 75, 22, 15, INK, 'center');
  ([['수리비', won(a.repair)], ['치료비', won(a.care)], ['자기 부담', `-${won(a.self)}`]] as Array<[string, string]>).forEach(([s, v], i) => {
    text(c, s, 12, 56 + i * 24, 11, GREY_D, 'left', false);
    text(c, v, 138, 56 + i * 24, 11, INK, 'right');
  });
  c.fillStyle = SUN_L;
  c.fillRect(8, 128, 134, 28);
  text(c, '지급액', 14, 142, 12, NAVY_D);
  text(c, won(a.pay), 138, 142, 13, NAVY_D, 'right');
  if (sealed) {
    c.strokeStyle = SEAL;
    c.lineWidth = 2.5;
    c.strokeRect(100, 164, 34, 34);
    text(c, '승인', 117, 181, 12, SEAL, 'center');
  }
}
function claimDesk(g: THREE.Group, out: Built) {
  const T = CD.top;
  deskTop(g, 1.96, T);
  chair(g, CD.seat);
  keyboard(g, CD.keys);
  guestChair(g, CD.client[0], CD.client[1], CD.client[2], SUN);
  const scr = monitor(g, CD.screen, 0.46, 0.3, T, 320, 208);
  const calc = calculator(g, CD.calc);
  stampPad(g, CD.pad, CD.stampHome);
  penCup(g, CD.penHome);
  // A low sign and folders of claims at the back of the desk.
  part(g, box(0.52, 0.14, 0.03), SUN, 0.46, T + 0.07, -0.3);
  label(g, '보상 창구', 0.48, 0.1, 0.46, T + 0.07, -0.283, SUN, NAVY_D);
  ['#d98c5f', '#6e9fbd', '#c7b6e0'].forEach((col, i) => part(g, box(0.05, 0.28, 0.22), col, -0.86 + i * 0.055, T + 0.14, -0.2));
  part(g, cyl(0.035, 0.03, 0.08, 14), CREAM, 0.84, T + 0.04, 0.02);
  // The three photos: stacked until they're spread.
  const P = CD.photos;
  const photos = [0, 1, 2].map((i) => {
    const m = group(g, P[0], P[1], P[2]);
    part(m, box(0.12, 0.002, 0.09), PAPER, 0, 0, 0, { outline: false });
    const f = lyingPlane(m, 0.112, 0.082, 0, 0.0016, 0);
    setMap(f, accidentTex(i));
    return m;
  });
  const slip = group(g, CD.slip[0], CD.slip[1], CD.slip[2]);
  part(slip, box(0.21, 0.002, 0.297), PAPER, 0, 0, 0, { outline: false });
  const slipFace = liveScreen(slip, 0.2, 0.285, 150, 212, 0, 0.0016, 0, 0, FLAT);
  slip.visible = false;
  const photo = cardTool(g, 'bhClaimPhoto', 0.12, 0.09);
  setMap(photo.face, accidentTex(1));
  photo.root.visible = false;
  const pen = penTool(g, 'bhClaimPen');
  const stamp = stampTool(g, 'bhClaimStamp');
  const mag = magnifierTool(g);
  const seat = CD.seat;
  const spots: Record<string, Spot> = { bhClaimPhotos: seatAt(g, 'bhClaimPhotos', seat), bhClaimPay: seatAt(g, 'bhClaimPay', seat) };
  spots['*'] = spots.bhClaimPay;
  out.seat = marker(g, seat[0], seat[1], seat[2]);
  out.work = marker(g, CD.keys[0], CD.keys[1], CD.keys[2]);
  const client = lazy(() => person(g, '#8c9a6a', '#47525a', '#3a2a1f', CD.client[0], CD.client[2], 0, 'female', CD.client[1], 77));
  const told = bubble(g, '화분만 살짝 부딪혔어요', 0.9, CD.client[0], 1.52, CD.client[2]);
  const glad = bubble(g, '정말 다행이에요', 0.7, CD.client[0], 1.52, CD.client[2]);
  const to = new THREE.Vector3();
  const tools: Partial<Record<BhTool, HeldTool>> = { pen: pen.held, stamp: stamp.held, mag: mag.held, photo: photo.held };
  let seed = -1;
  drive(g, out, spots, tools, (_now, N, t) => {
    if (seed < 0) seed = seedOf(g);
    const n = N?.n ?? {};
    const round = (N?.b.n ?? 0) + seed;
    const mode = n.mode ?? 0;
    const sum = n.sum ?? 0;
    const sealed = (n.sealed ?? 0) > 0.5;
    scr.draw(`${mode}|${q(n.fill, 6)}|${Math.floor(sum)}|${wrap(round, 3)}|${sealed ? 1 : 0}`, (c) => paintClaimScreen(c, 320, 208, mode, n.fill ?? 0, sum, round, sealed));
    const a = amounts(round);
    const step = Math.floor(sum);
    calc(mode ? `${step >= 3 ? a.pay : step === 2 ? a.repair + a.care : step === 1 ? a.repair : 0}` : '0');
    const spread = clamp01(n.spread);
    const liftOne = (n.lifted ?? 0) > 0.5;
    const zoom = clamp01(n.zoom);
    photos.forEach((m, i) => {
      m.visible = i === 1 ? !liftOne && (!N || (n.photos ?? 0) > 0.5 || i === 1) : !N || (n.photos ?? 0) > 0.5;
      const y = P[1] + i * 0.0025;
      if (mode) m.position.set(P[0] - 0.34 + i * 0.13, y, P[2] - 0.1);
      else m.position.set(P[0] + (i - 1) * 0.13 * spread, y, P[2] + (i === 1 ? 0.03 * spread : -0.03 * spread));
    });
    photos[1].scale.setScalar(1 + 0.22 * zoom);
    at(photo.root, N?.props.photo ?? null);
    slip.visible = (n.slip ?? 0) > 0.5;
    if (slip.visible) {
      at(slip, N?.props.slipAt ?? null, CD.slip);
      slipFace.draw(`${wrap(round, 3)}|${sealed ? 1 : 0}`, (c) => paintSlip(c, round, sealed));
    }
    at(pen.root, N?.props.pen ?? null, CD.penHome);
    at(stamp.root, N?.props.stamp ?? null, CD.stampHome);
    at(mag.root, N?.props.mag ?? null, CD.magHome);
    const here = (n.client ?? 0) > 0.5;
    told.visible = here && mode === 0 && (n.nods ?? 0) > 0.5;
    glad.visible = (n.glad ?? 0) > 0.5;
    if (here) {
      const f = client.get();
      f.root.visible = true;
      if ((n.over ?? 0) > 0.5) f.armR(to.set(CD.client[0] + 0.02, T + 0.02, -0.26));
      else f.armR(null);
      f.armL(null);
      nodHead(f, (n.nods ?? 0) > 0.5 ? 0.14 + 0.08 * Math.sin(t * 2.6) : (n.glad ?? 0) > 0.5 ? 0.22 : 0.05);
    } else client.hide();
  });
}

// ---------------------------------------------------------------------------------------------
// 약속 책상 (bhPlannerDesk, 2 × 1).

const DAYS = ['월', '화', '수', '목', '금'];
function plannerDesk(g: THREE.Group, out: Built) {
  const T = PD.top;
  deskTop(g, 1.9, T);
  chair(g, PD.seat);
  phoneBase(g, PD.phone);
  penCup(g, PD.penHome);
  // A back panel with the month on a wall calendar: the map of who's being visited.
  part(g, rbox(1.9, 1.72, 0.04, 0.012), '#a7b9c4', 0, 0.86, -0.42);
  part(g, box(1.9, 0.03, 0.05), WOOD_D, 0, 1.735, -0.42, { outline: false });
  const month = painted('bhMonth', 400, 260, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 400, 260);
    c.fillStyle = CORAL;
    c.fillRect(0, 0, 400, 36);
    text(c, '11월 고객 방문', 200, 19, 20, '#ffffff', 'center');
    for (let j = 0; j < 5; j++)
      for (let i = 0; i < 7; i++) {
        const x = 6 + i * 56;
        const y = 44 + j * 42;
        c.strokeStyle = '#d9d5ca';
        c.strokeRect(x, y, 54, 40);
        text(c, `${j * 7 + i + 1}`, x + 6, y + 10, 11, i === 6 ? CORAL : GREY_D, 'left', false);
        if ((j * 3 + i * 5) % 7 === 0) {
          c.fillStyle = [SUN_L, '#d5e5f0', '#d9efc9'][(i + j) % 3];
          c.fillRect(x + 6, y + 20, 42, 14);
        }
      }
  });
  picture(g, month, 0.8, 0.52, -0.42, 1.38, -0.395);
  label(g, '약속은 꼭 지켜요', 0.56, 0.08, 0.46, 1.5, -0.395, SUN, NAVY_D);
  // The week's pockets, on a low slanted rack across the desk.
  const R = PD.rack;
  part(g, box(0.56, 0.17, 0.04), WOOD_D, R[0] + PD.rackStep * 2, T + 0.09, R[2] - 0.04);
  const cardTex = (s: string, col: string) =>
    painted(`bhCard|${s}|${col}`, 64, 96, (c) => {
      c.fillStyle = col;
      c.fillRect(0, 0, 64, 96);
      text(c, s, 32, 18, 12, INK, 'center');
      c.fillStyle = 'rgba(0,0,0,0.3)';
      c.fillRect(10, 40, 44, 4);
      c.fillRect(10, 54, 34, 4);
    });
  const COLS = [SUN_L, '#d5e5f0', '#d9efc9'];
  const pockets = DAYS.map((d, i) => {
    const p = pocketAt(i);
    part(g, box(0.09, 0.07, 0.012), CREAM, p[0], T + 0.05, p[2] + 0.012, { outline: false });
    label(g, d, 0.05, 0.03, p[0], T + 0.05, p[2] + 0.02, CREAM, NAVY_D);
    const m = picture(g, cardTex('방문', COLS[i % 3]), 0.07, 0.1, p[0], T + 0.11, p[2] - 0.004);
    m.visible = i % 2 === 0;
    return m;
  });
  // The planner, open before the chair.
  const pl = PD.planner;
  part(g, rbox(0.34, 0.012, 0.22, 0.004), NAVY_D, pl[0], pl[1] - 0.006, pl[2]);
  const face = liveScreen(g, 0.325, 0.205, 325, 205, pl[0], pl[1] + 0.003, pl[2], 0, FLAT);
  // A sticky pad and a little stack of cards.
  part(g, box(0.09, 0.018, 0.09), SUN_L, PD.cardPad[0], T + 0.009, PD.cardPad[2], { outline: false });
  photoFrame(g, 0.76, T, -0.26, -0.2);
  part(g, cyl(0.04, 0.034, 0.09, 12), '#c98d62', -0.82, T + 0.045, -0.26);
  part(g, ball(0.06), '#5f9a55', -0.82, T + 0.13, -0.26);
  const phone = handsetTool(g, 'bhPlanHandset');
  const pen = penTool(g, 'bhPlanPen');
  const card = cardTool(g, 'bhVisitCard', 0.07, 0.1);
  setMap(card.face, cardTex('방문', SUN_L));
  card.root.visible = false;
  const seat = PD.seat;
  const spots: Record<string, Spot> = { bhBookVisit: seatAt(g, 'bhBookVisit', seat), bhPlanWeek: seatAt(g, 'bhPlanWeek', seat) };
  spots['*'] = spots.bhBookVisit;
  out.seat = marker(g, seat[0], seat[1], seat[2]);
  out.work = marker(g, pl[0], pl[1], pl[2]);
  const tools: Partial<Record<BhTool, HeldTool>> = { phone: phone.held, pen: pen.held, card: card.held };
  drive(g, out, spots, tools, (_now, N) => {
    const n = N?.n ?? {};
    const round = N?.b.n ?? 0;
    const wrote = n.wrote ?? 0;
    face.draw(`${wrap(round, 20)}|${q(wrote, 5)}|${q(n.leaf, 2)}`, (c) => {
      c.fillStyle = PAPER;
      c.fillRect(0, 0, 325, 205);
      c.fillStyle = '#d9d4c5';
      c.fillRect(160, 0, 5, 205);
      text(c, `${11 + wrap(round + ((n.leaf ?? 0) > 0.5 ? 1 : 0), 18)}일 이번 주`, 12, 16, 13, NAVY_D);
      for (let i = 0; i < 7; i++) {
        c.fillStyle = '#d7dadd';
        c.fillRect(12, 38 + i * 23, 136, 2);
        c.fillRect(176, 22 + i * 25, 136, 2);
        text(c, `${9 + i}시`, 14, 30 + i * 23, 10, GREY_D, 'left', false);
      }
      if (wrote > 0.05) text(c, `${clientOf(round)} 댁 방문`.slice(0, Math.ceil(wrote * 12)), 42, 98, 12, CORAL);
      text(c, '해야 할 일', 180, 12, 11, NAVY_D);
      text(c, '· 생일 축하 전화', 180, 40, 10, INK, 'left', false);
      text(c, '· 만기 안내', 180, 66, 10, INK, 'left', false);
    });
    pockets.forEach((m, i) => {
      // The week as it stands: this round's moves and any new card.
      let on = wrap(i + round, 2) === 0;
      if (n.week) {
        if (i === Math.round(n.from ?? -1)) on = (n.moved ?? 0) < 0.5 ? true : false;
        if (i === Math.round(n.to ?? -1)) on = (n.moved ?? 0) > 0.5;
        if (i === Math.round(n.from2 ?? -1)) on = (n.moved2 ?? 0) < 0.5;
        if (i === Math.round(n.to2 ?? -1)) on = (n.moved2 ?? 0) > 0.5;
      } else if (N && i === Math.round(n.day ?? -1)) on = (n.carded ?? 0) > 0.5;
      m.visible = on;
    });
    at(phone.root, N?.props.phone ?? null, PD.phone);
    phone.set(n.lift ?? 0);
    at(pen.root, N?.props.pen ?? null, PD.penHome);
    at(card.root, N?.props.card ?? null);
  });
}

// ---------------------------------------------------------------------------------------------
// 안내장 꽂이 (bhBrochureRack, 2 × 1).

function brochureRack(g: THREE.Group, out: Built) {
  // A cream frame with three rows of clear pockets, a little roof with the name, a carton of fresh ones at the left foot.
  part(g, rbox(1.56, 1.42, 0.05, 0.012), CREAM, 0, 0.8, -0.12);
  part(g, box(1.56, 0.1, 0.36), WOOD_D, 0, 0.05, -0.02);
  for (const sx of [-1, 1]) part(g, box(0.04, 1.46, 0.2), WOOD, sx * 0.79, 0.78, -0.03);
  part(g, rbox(1.62, 0.12, 0.2, 0.02), SUN, 0, 1.55, -0.04);
  label(g, '필요한 분은 편히 가져가세요', 1.3, 0.09, 0, 1.55, 0.064, SUN, NAVY_D);
  const stacks: THREE.Group[][] = [];
  BR.rows.forEach((y, r) => {
    const row: THREE.Group[] = [];
    BR.columns.forEach((x, i) => {
      const s = group(g, x, y, -0.05);
      part(s, box(0.3, 0.23, 0.06), PAPER, 0, 0, 0, { outline: false });
      picture(s, leafletTex(r * 4 + i), 0.16, 0.23, 0, 0, 0.032);
      part(g, box(0.3, 0.085, 0.006), CHROME, x, y - 0.085, 0.022, { outline: false });
      row.push(s);
    });
    stacks.push(row);
  });
  // The carton, open-flapped.
  const B = BR.box;
  part(g, box(0.28, B[1], 0.26), '#c49a6c', B[0], B[1] / 2, B[2]);
  part(g, box(0.22, 0.05, 0.2), PAPER, B[0], B[1] + 0.02, B[2], { outline: false });
  part(g, box(0.28, 0.01, 0.12), '#b08858', B[0], B[1] + 0.03, B[2] + 0.15, { outline: false, rx: 0.5 });
  const stack = (() => {
    const root = group(g);
    root.name = 'bhLeafletStack';
    part(root, box(0.16, 0.05, 0.22), PAPER, 0, 0.03, 0, { outline: false });
    picture(root, leafletTex(0), 0.15, 0.21, 0, 0.056, 0, '#ffffff', 0, FLAT);
    const held: HeldTool = { tool: root, lead: 'left', grips: { left: { at: v3(0, -0.012, 0.03), axis: v3(0, 0, -1), palm: v3(0, 1, 0), shape: 'flat', radius: 0.012 } } };
    return { root, held };
  })();
  stack.root.visible = false;
  const leaf = cardTool(g, 'bhLeaflet', 0.13, 0.18);
  setMap(leaf.face, leafletTex(1));
  leaf.root.visible = false;
  const spots: Record<string, Spot> = { bhBrochureStock: standAt(g, 'bhBrochureStock', 0, 0.42), bhBrochureHand: standAt(g, 'bhBrochureHand', 0.28, 0.62) };
  spots['*'] = spots.bhBrochureStock;
  out.work = marker(g, 0, 1.1, 0.12);
  const elder = lazy(() => person(g, '#7d8a66', '#4a4f52', '#c9c9c4', BR.guest[0], BR.guest[1], -1.7, 'female', undefined, 81, 'elder'));
  const glad = bubble(g, '이게 딱이네요', 0.66, BR.guest[0], 1.82, BR.guest[1]);
  const to = new THREE.Vector3();
  const tools: Partial<Record<BhTool, HeldTool>> = { stack: stack.held, leaflet: leaf.held };
  drive(g, out, spots, tools, (_now, N, t) => {
    const n = N?.n ?? {};
    const round = N?.b.n ?? 0;
    stacks.forEach((row) => row.forEach((s) => (s.scale.y = 1)));
    if ((n.stocking ?? 0) > 0.5) {
      const filled = n.filled ?? 0;
      for (let i = 0; i < 3; i++) {
        const c = BR.columns.findIndex((x) => x === pocketOf(round, i)[0]);
        const r = BR.rows.findIndex((y) => y + 0.09 === pocketOf(round, i)[1]);
        if (c >= 0 && r >= 0) stacks[r][c].scale.y = filled > i + 0.5 ? 1 : 0.4;
      }
    }
    at(stack.root, N?.props.stack ?? null);
    at(leaf.root, N?.props.leaflet ?? null);
    glad.visible = (n.glad ?? 0) > 0.5;
    if ((n.guest ?? 0) > 0.5) {
      const f = elder.get();
      f.root.visible = true;
      if ((n.handing ?? 0) > 0.5 || (n.reading ?? 0) > 0.5) {
        const y = (n.handing ?? 0) > 0.5 ? 1 : 1.04 + 0.01 * Math.sin(t);
        f.armR(to.set(0.74, y, 0.62));
        f.armL((n.reading ?? 0) > 0.5 ? to.set(0.72, y + 0.01, 0.76) : null);
      } else {
        f.armR(null);
        f.armL(null);
      }
      nodHead(f, (n.glad ?? 0) > 0.5 ? 0.22 + 0.08 * Math.sin(t * 2.4) : (n.reading ?? 0) > 0.5 ? 0.3 : 0.1);
    } else elder.hide();
  });
}

// ---------------------------------------------------------------------------------------------
// 계약 기록 벽 (bhRecordsWall, 3 × 1).

const YEARS = ['21', '22', '23', '24', '25', '26'];
const SPINES = ['#d98c5f', '#6e9fbd', '#7fae85', '#c7b6e0', '#e3c26d', '#b5766b'];
function spineTex(shelf: number) {
  return painted(`bhSpines|${shelf}`, 660, 120, (c) => {
    for (let i = 0; i < RW.columns; i++) {
      const x = (660 / RW.columns) * i;
      const w = 660 / RW.columns - 4;
      c.fillStyle = SPINES[wrap(i + shelf * 2, SPINES.length)];
      c.fillRect(x + 2, 4, w, 112);
      c.fillStyle = '#fbfaf5';
      c.fillRect(x + 8, 16, w - 12, 44);
      text(c, YEARS[wrap(i + shelf, YEARS.length)], x + 2 + w / 2, 30, 16, INK, 'center');
      text(c, '계약', x + 2 + w / 2, 48, 12, GREY_D, 'center', false);
      c.fillStyle = 'rgba(0,0,0,0.35)';
      c.beginPath();
      c.arc(x + 2 + w / 2, 88, pos(7), 0, 6.3);
      c.fill();
    }
  });
}
function recordsWall(g: THREE.Group, out: Built) {
  const span = RW.span;
  part(g, box(span + 0.14, RW.top, 0.04), WOOD_D, 0, RW.top / 2, -0.28);
  for (const sx of [-1, 1]) part(g, box(0.04, RW.top, 0.34), WOOD, (sx * (span + 0.1)) / 2, RW.top / 2, -0.12);
  part(g, box(span + 0.14, 0.08, 0.36), WOOD_D, 0, RW.top - 0.04, -0.11);
  part(g, box(span + 0.14, 0.06, 0.36), WOOD_D, 0, 0.03, -0.11);
  label(g, '계약 기록', 0.6, 0.06, 0, RW.top - 0.04, 0.075, WOOD_D, '#ffffff');
  RW.shelves.forEach((y, s) => {
    part(g, box(span, 0.024, 0.34), WOOD, 0, y - 0.03, -0.11, { outline: false });
    part(g, box(span - 0.01, 0.33, 0.24), '#5a4a3a', 0, y + 0.15, -0.14, { outline: false });
    picture(g, spineTex(s), span - 0.02, 0.33, 0, y + 0.15, -0.018);
  });
  // The ledge a binder's read on, its arm folded into the shelves.
  const L = RW.ledge;
  part(g, box(0.62, 0.03, 0.3), WOOD, L[0], L[1] - 0.015, L[2], {});
  part(g, box(0.5, 0.02, 0.16), GREY_D, L[0], L[1] - 0.04, L[2] - 0.15, { outline: false });
  part(g, box(0.05, L[1] - 0.05, 0.05), GREY_D, L[0], (L[1] - 0.05) / 2, -0.03, { outline: false });
  // Where the wanted file came from, a dark gap in its row.
  const gap = part(g, box(span / RW.columns - 0.006, 0.31, 0.01), '#2a211b', 0, 0, -0.013, { outline: false });
  gap.visible = false;
  // The file itself: held by the spine.
  const file = (() => {
    const root = group(g);
    root.name = 'bhRecordFile';
    part(root, box(0.2, 0.3, 0.018), '#6e9fbd', -0.1, 0, -0.012, { outline: false });
    part(root, cyl(0.022, 0.022, 0.3, 10), '#4f7d9a', 0, 0, 0, { outline: false });
    const held: HeldTool = { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.022 } } };
    return { root, held };
  })();
  file.root.visible = false;
  // Open on the ledge.
  const open = group(g, L[0], L[1] + 0.01, L[2] + 0.02);
  part(open, box(0.42, 0.016, 0.28), '#6e9fbd', 0, 0, 0, { outline: false });
  part(open, box(0.39, 0.012, 0.25), PAPER, 0, 0.012, 0, { outline: false });
  const openTex = painted('bhContract', 300, 192, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 300, 192);
    c.fillStyle = '#d9d4c5';
    c.fillRect(148, 0, 4, 192);
    text(c, '보험 계약서', 74, 20, 15, INK, 'center');
    for (let i = 0; i < 6; i++) {
      c.fillStyle = '#c9cfd3';
      c.fillRect(14, 44 + i * 22, 118 - (i % 3) * 16, 4);
      c.fillRect(166, 26 + i * 24, 118 - ((i + 1) % 3) * 16, 4);
    }
    c.strokeStyle = SEAL;
    c.lineWidth = 2;
    c.beginPath();
    c.arc(116, 168, pos(13), 0, 6.3);
    c.stroke();
  });
  const openFace = lyingPlane(open, 0.385, 0.245, 0, 0.0185, 0);
  setMap(openFace, openTex);
  open.visible = false;
  const pen = penTool(g, 'bhRecordPen');
  pen.root.visible = false;
  const spots: Record<string, Spot> = { bhFindPolicy: standAt(g, 'bhFindPolicy', 0, 0.72) };
  spots['*'] = spots.bhFindPolicy;
  out.work = marker(g, 0, 1.2, 0.2);
  const tools: Partial<Record<BhTool, HeldTool>> = { binder: file.held, pen: pen.held };
  drive(g, out, spots, tools, (_now, N) => {
    const n = N?.n ?? {};
    const F = N ? fileOf(N.b.n) : null;
    const out1 = (n.out ?? 0) > 0.5;
    gap.visible = !!F && out1;
    if (F && out1) {
      const p = fileAt(F.col, F.shelf);
      gap.position.set(p[0], RW.shelves[F.shelf] + 0.15, -0.013);
    }
    at(file.root, N?.props.binder ?? null);
    open.visible = (n.ledge ?? 0) > 0.5;
    at(pen.root, N?.props.pen ?? null);
  });
}

// ---------------------------------------------------------------------------------------------
// 방문 가방 (bhVisitBag, 2 × 1).

function visitBag(g: THREE.Group, out: Built) {
  const T = VB.top;
  // A console at a good height with a drawer, the panel behind it with a coat, an umbrella and today's visits.
  part(g, rbox(1.84, 0.04, 0.56, 0.012), WOOD, 0, T - 0.02, 0.03);
  part(g, box(1.76, T - 0.14, 0.4), CREAM, 0, (T - 0.14) / 2 + 0.06, -0.04);
  part(g, box(1.84, 0.08, 0.4), WOOD_D, 0, 0.04, -0.04, { outline: false });
  for (const sx of [-1, 1]) {
    part(g, box(0.82, 0.3, 0.012), '#ece3cf', sx * 0.43, 0.56, 0.166, { outline: false });
    part(g, box(0.14, 0.015, 0.02), GREY_D, sx * 0.43, 0.58, 0.18, { outline: false });
  }
  part(g, rbox(1.88, 0.86, 0.04, 0.012), '#a7b9c4', 0, T + 0.43, -0.28);
  part(g, box(1.84, 0.03, 0.05), WOOD_D, 0, T + 0.85, -0.28, { outline: false });
  // Hooks with a coat and a folded umbrella.
  for (const x of [0.54, 0.82]) part(g, cyl(0.008, 0.008, 0.05, 6), CHROME, x, T + 0.76, -0.24, { outline: false, rx: Math.PI / 2 });
  part(g, rbox(0.22, 0.58, 0.05, 0.03), '#6e7f8e', 0.54, T + 0.45, -0.22);
  part(g, cyl(0.02, 0.008, 0.52, 10), CORAL, 0.82, T + 0.48, -0.225, { outline: false });
  part(g, ring(0.018, 0.005, Math.PI), WOOD_D, 0.82, T + 0.75, -0.225, { outline: false });
  const list = painted('bhVisitsToday', 256, 200, (c) => {
    c.fillStyle = SUN_L;
    c.fillRect(0, 0, 256, 200);
    text(c, '오늘 찾아뵐 분', 128, 24, 20, NAVY_D, 'center');
    ['10시 이○○ 어르신', '14시 박○○ 님 가게', '16시 김○○ 님 댁'].forEach((s, i) => text(c, s, 16, 66 + i * 38, 17, INK, 'left', false));
  });
  picture(g, list, 0.46, 0.36, -0.46, T + 0.46, -0.257);
  // What goes in the bag, each with its place.
  const tablet = (() => {
    const root = group(g);
    root.name = 'bhTablet';
    part(root, rbox(0.22, 0.009, 0.16, 0.008), BLACK, 0, 0, 0, { outline: false });
    const f = lyingPlane(root, 0.2, 0.14, 0, 0.0052, 0);
    setMap(f, painted('bhTabletFace', 160, 112, (c) => {
      c.fillStyle = '#fdf9ef';
      c.fillRect(0, 0, 160, 112);
      c.fillStyle = SUN;
      c.fillRect(0, 0, 160, 20);
      text(c, '보장 한눈에', 80, 11, 12, NAVY_D, 'center');
      for (let i = 0; i < 3; i++) {
        c.fillStyle = [GREEN, NAVY, CORAL][i];
        c.fillRect(14, 36 + i * 24, 40 + i * 30, 12);
      }
    }));
    const held: HeldTool = { tool: root, lead: 'right', grips: { right: { at: v3(0.1, -0.002, 0.02), axis: v3(0, 0, -1), palm: v3(0, 1, 0), shape: 'flat', radius: 0.01 } } };
    return { root, held };
  })();
  const pack = (() => {
    const root = group(g);
    root.name = 'bhLeafletPack';
    part(root, box(0.15, 0.05, 0.2), PAPER, 0, 0, 0, { outline: false });
    picture(root, leafletTex(2), 0.14, 0.19, 0, 0.026, 0, '#ffffff', 0, FLAT);
    part(root, box(0.16, 0.052, 0.016), CORAL, 0, 0, 0, { outline: false });
    const held: HeldTool = { tool: root, lead: 'right', grips: { right: { at: v3(0.06, 0, 0.04), axis: v3(0, 0, -1), palm: v3(0, -1, 0), shape: 'flat', radius: 0.026 } } };
    return { root, held };
  })();
  const gift = (() => {
    const root = group(g);
    root.name = 'bhGiftBox';
    part(root, rbox(0.14, 0.11, 0.1, 0.008), SUN_L, 0, 0, 0, { outline: false });
    part(root, box(0.024, 0.112, 0.102), CORAL, 0, 0, 0, { outline: false });
    part(root, box(0.142, 0.112, 0.022), CORAL, 0, 0, 0, { outline: false });
    const held: HeldTool = { tool: root, lead: 'right', grips: { right: { at: v3(0.075, 0, 0), axis: v3(0, 0, -1), palm: v3(-1, 0, 0), shape: 'cradle', radius: 0.05 } } };
    return { root, held };
  })();
  const cards = group(g, VB.cards[0], T + 0.015, VB.cards[2]);
  part(cards, rbox(0.1, 0.03, 0.065, 0.004), PAPER, 0, 0, 0, { outline: false });
  part(cards, cyl(0.009, 0.009, 0.002, 12), SUN, -0.03, 0.016, 0, { outline: false });
  // The bag: origin at its handle, the mouth just beneath, the sides open away from each other.
  const bag = (() => {
    const root = group(g);
    root.name = 'bhVisitBagTool';
    const BROWN = '#7a4f30';
    part(root, rbox(0.42, 0.26, 0.13, 0.02), BROWN, 0, -0.18, 0);
    part(root, box(0.12, 0.03, 0.015), '#c49a3c', 0, -0.13, 0.068, { outline: false });
    const flap = (s: number) => {
      const f = group(root, 0, -0.05, s * 0.06);
      part(f, box(0.42, 0.018, 0.075), BROWN, 0, -0.008, s * 0.03, { outline: false });
      return f;
    };
    const flaps = [flap(-1), flap(1)];
    for (const s of [-1, 1]) {
      part(root, cyl(0.007, 0.007, 0.06, 8), '#5a3a22', s * 0.09, -0.024, 0, { outline: false });
    }
    const handle = part(root, cyl(0.012, 0.012, 0.2, 10), '#5a3a22', 0, 0, 0, { outline: false });
    handle.rotation.z = Math.PI / 2;
    const held: HeldTool = { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(-1, 0, 0), shape: 'power', radius: 0.012 } } };
    return { root, held, flaps };
  })();
  const spots: Record<string, Spot> = { bhPackBag: standAt(g, 'bhPackBag', VB.stand[0], VB.stand[1]) };
  spots['*'] = spots.bhPackBag;
  out.work = marker(g, VB.mouth[0], VB.mouth[1], VB.mouth[2]);
  const ready = bubble(g, '다녀오겠습니다!', 0.7, VB.stand[0], 1.92, VB.stand[1]);
  const tools: Partial<Record<BhTool, HeldTool>> = { tablet: tablet.held, pack: pack.held, gift: gift.held, bag: bag.held };
  drive(g, out, spots, tools, (_now, N) => {
    const n = N?.n ?? {};
    const inOrHome = (held: V | null | undefined, inBag: number | undefined, home: V) => (held ? held : (inBag ?? 0) > 0.5 ? null : home);
    at(tablet.root, inOrHome(N?.props.tablet, n.tabletIn, VB.tablet));
    at(pack.root, inOrHome(N?.props.pack, n.packIn, VB.pack));
    at(gift.root, inOrHome(N?.props.gift, n.giftIn, VB.gift));
    at(bag.root, N?.props.bag ?? null, VB.bag);
    bag.root.rotation.y = (-Math.PI / 2) * clamp01(n.turn);
    const lid = clamp01(n.lid);
    bag.flaps[0].rotation.x = 1.15 * lid;
    bag.flaps[1].rotation.x = -1.15 * lid;
    ready.visible = (n.done ?? 0) > 0.5;
  });
}

// ---------------------------------------------------------------------------------------------
// Set dressing: the children's corner and the branch sign.

function kidsCorner(g: THREE.Group) {
  // A soft mat, a low table with drawings and crayons, little stools, blocks and a bear.
  part(g, box(1.8, 0.02, 0.86), '#ffe6ad', 0, 0.01, 0);
  const squares = painted('bhMat', 128, 64, (c) => {
    const COL = [SUN_L, '#d5e5f0', '#d9efc9', '#f7d7d0'];
    for (let j = 0; j < 4; j++) for (let i = 0; i < 8; i++) {
      c.fillStyle = COL[(i + j) % 4];
      c.fillRect(i * 16, j * 16, 16, 16);
    }
  });
  const mat = picture(g, squares, 1.78, 0.84, 0, 0.022, 0);
  mat.rotation.x = FLAT;
  part(g, rbox(0.62, 0.03, 0.42, 0.012), WOOD, -0.36, 0.42, -0.05);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.016, 0.014, 0.4, 8), WOOD_D, -0.36 + sx * 0.26, 0.2, -0.05 + sz * 0.16, { outline: false });
  const drawing = painted('bhDrawing', 128, 96, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 128, 96);
    c.fillStyle = SUN;
    c.beginPath();
    c.arc(100, 22, pos(14), 0, 6.3);
    c.fill();
    c.fillStyle = CORAL;
    c.fillRect(30, 50, 40, 32);
    c.fillStyle = NAVY;
    c.beginPath();
    c.moveTo(24, 50);
    c.lineTo(50, 28);
    c.lineTo(76, 50);
    c.fill();
    text(c, '우리 집', 64, 88, 11, INK, 'center');
  });
  const d = picture(g, drawing, 0.22, 0.165, -0.42, 0.437, -0.04);
  d.rotation.x = FLAT;
  [CORAL, GREEN, NAVY, SUN].forEach((col, i) => part(g, cyl(0.005, 0.005, 0.07, 6), col, -0.2 + i * 0.016, 0.442, 0.02 + i * 0.012, { outline: false, rz: Math.PI / 2 }));
  for (const x of [-0.56, -0.14]) part(g, cyl(0.11, 0.1, 0.24, 14), x < -0.3 ? '#9fd4a8' : CORAL, x, 0.14, 0.26);
  [[0.32, 0.1, '#e8785a'], [0.46, 0.14, '#6e9fbd'], [0.56, -0.02, '#f4b13f'], [0.42, -0.04, '#7fae85']].forEach(([x, z, col]) => part(g, rbox(0.1, 0.1, 0.1, 0.012), col as string, x as number, 0.07, z as number));
  part(g, rbox(0.1, 0.1, 0.1, 0.012), '#c7b6e0', 0.46, 0.17, 0.08);
  // A bear with a sunny bow, sat against the mat's edge.
  const bear = group(g, 0.68, 0, 0.26, -0.3);
  part(bear, ball(0.095), '#c49a6c', 0, 0.12, 0);
  part(bear, ball(0.075), '#c49a6c', 0, 0.26, 0.01);
  for (const sx of [-1, 1]) {
    part(bear, ball(0.026), '#a87f55', sx * 0.06, 0.32, 0, { outline: false });
    part(bear, ball(0.036), '#c49a6c', sx * 0.09, 0.08, 0.06, { outline: false });
    part(bear, ball(0.009), '#2b2b30', sx * 0.025, 0.28, 0.07, { outline: false });
  }
}
function branchSign(g: THREE.Group) {
  // A wooden stand with the sun of the company's name and its hours.
  part(g, rbox(0.46, 0.05, 0.3, 0.012), WOOD_D, 0, 0.025, -0.05);
  part(g, cyl(0.022, 0.026, 1.1, 10), WOOD_D, 0, 0.58, -0.05, { outline: false });
  part(g, rbox(0.66, 0.5, 0.05, 0.02), CREAM, 0, 1.28, -0.05);
  const tex = painted('bhSign', 264, 200, (c) => {
    c.fillStyle = CREAM;
    c.fillRect(0, 0, 264, 200);
    c.fillStyle = SUN;
    c.beginPath();
    c.arc(132, 52, pos(30), 0, 6.3);
    c.fill();
    c.strokeStyle = SUN;
    c.lineWidth = 4;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      c.beginPath();
      c.moveTo(132 + Math.cos(a) * 38, 52 + Math.sin(a) * 38);
      c.lineTo(132 + Math.cos(a) * 48, 52 + Math.sin(a) * 48);
      c.stroke();
    }
    text(c, COMPANY, 132, 118, 34, NAVY_D, 'center');
    text(c, BRANCH, 132, 150, 19, GREY_D, 'center');
    text(c, '평일 9시 ~ 6시 · 상담 환영', 132, 180, 14, INK, 'center', false);
  });
  picture(g, tex, 0.62, 0.46, 0, 1.28, -0.02);
}

export const BUILDERS: Record<string, Builder> = {
  agentDesk(g, _W, _D, _c, _def, _ctx, out) {
    agentDesk(g, out);
  },
  consultBooth(g, _W, _D, _c, _def, _ctx, out) {
    consultBooth(g, out);
  },
  bhMorningBoard(g, _W, _D, _c, _def, _ctx, out) {
    morningBoard(g, out);
  },
  bhClaimDesk(g, _W, _D, _c, _def, _ctx, out) {
    claimDesk(g, out);
  },
  bhPlannerDesk(g, _W, _D, _c, _def, _ctx, out) {
    plannerDesk(g, out);
  },
  bhBrochureRack(g, _W, _D, _c, _def, _ctx, out) {
    brochureRack(g, out);
  },
  bhRecordsWall(g, _W, _D, _c, _def, _ctx, out) {
    recordsWall(g, out);
  },
  bhVisitBag(g, _W, _D, _c, _def, _ctx, out) {
    visitBag(g, out);
  },
  bhKidsCorner(g) {
    kidsCorner(g);
  },
  bhBranchSign(g) {
    branchSign(g);
  },
};
