import * as THREE from 'three';
import type { HeldTool } from '../handTool';
import { marker, rod, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, glass, label, painted, picture, ring, seeded, text } from './doctor';
import { CC, FS, KI, MP, NB, PEN_UP, RC, RS, SHEET_GRIP, STAMP_UP, WB, carriageX, juNow, juPhase, nbSlot, plateAt, wrap } from './civilServantMotion';
import type { JuMotion, JuNow, JuTool } from './civilServantMotion';
import { vroidFigure, type FigureOptions } from './vroidFigure';
import { pavementSign } from './dentist';

/**
 * The 주민센터 drawn as itself (2026-11-01), of a made-up 은샘1동: warm, patient, a little worn. A counter behind glass with its own
 * number board and a resident on a stool who comes when called; a certificate kiosk an elder is helped with; a form stand with
 * reading glasses and a magnifier; a welfare booth with low screens and a cup of tea; a cork board of neighbourhood news; rolling
 * record shelves that open an aisle where it's wanted; a wire cage of relief supplies; a cabinet of what a meeting needs; a number
 * ticket machine and the centre's sign. No party, candidate, real place, person or company here.
 * Everything that moves follows civilServantMotion.ts. The desks, copier, whiteboard and archive shelf are shared and stay.
 */

const DONG = '은샘1동';
const CREAM = '#f3ecdc';
const WOOD = '#c29a6c';
const WOOD_D = '#8d6a45';
const BLUE = '#2f6d9e';
const BLUE_D = '#234f75';
const BLUE_L = '#cfe2ee';
const GREEN = '#4f8a5b';
const GREY = '#8f979c';
const GREY_D = '#566066';
const GRAPHITE = '#2f363c';
const PAPER = '#fbfaf5';
const SEAL = '#c62828';
const SUN = '#f2b54a';
const INK = '#1f2428';
const SKIN = '#ecc6a3';
const ORANGE = '#e8763a';
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UP = v3(0, 1, 0);
const tmp = new THREE.Vector3();
const FLAT = -Math.PI / 2;
type V = readonly [number, number, number];
type Ctx2 = CanvasRenderingContext2D;
const q = (x: number | undefined, steps = 20) => Math.round((x ?? 0) * steps);
const clamp01 = (x: number | undefined) => THREE.MathUtils.clamp(x ?? 0, 0, 1);
const pos = (r: number) => Math.max(0.5, r);
const seedOf = (g: THREE.Object3D) => {
  const p = g.getWorldPosition(tmp);
  return Math.floor(Math.abs(p.x) * 3 + Math.abs(p.z) * 7);
};

const CERTS = ['주민등록표 등본', '주민등록표 초본', '가족관계증명서', '건축물대장', '전입 사실 확인'];
const certOf = (i: number) => CERTS[wrap(i, CERTS.length)];
const PERMITS = ['골목 화단 조성 신청', '동네 장터 사용 허가', '마을 간판 정비 신고', '경로당 보수 신청'];
const permitOf = (i: number) => PERMITS[wrap(i, PERMITS.length)];
const NEWS: ReadonlyArray<readonly [string, string, string]> = [
  ['경로당 김장 나눔', '11월 둘째 토요일', '#ffe2b8'],
  ['골목 화단 가꾸기', '모종과 삽을 드려요', '#d9efc9'],
  ['어린이 책 읽는 날', '작은도서관, 매주 수요일', '#d5e8f7'],
  ['분리배출 요일 안내', '재활용은 화·금 저녁', '#e3f0d6'],
  ['우리 동네 사진전', '주민센터 2층 복도', '#f4d9e4'],
  ['반찬 나눔 봉사자', '함께하실 분을 찾아요', '#fff1b8'],
];
const newsOf = (i: number) => NEWS[wrap(i, NEWS.length)];
const newsTex = (i: number) => {
  const [a, b, bg] = newsOf(i);
  return painted(`juNews|${a}`, 160, 200, (c) => {
    c.fillStyle = bg;
    c.fillRect(0, 0, 160, 200);
    c.fillStyle = 'rgba(255,255,255,0.65)';
    c.fillRect(10, 62, 140, 92);
    text(c, '마을 소식', 80, 22, 15, BLUE_D, 'center');
    text(c, a.slice(0, 8), 80, 44, 16, INK, 'center');
    text(c, b.slice(0, 11), 80, 78, 13, INK, 'center', false);
    if (b.length > 11) text(c, b.slice(11), 80, 98, 13, INK, 'center', false);
    c.fillStyle = BLUE;
    c.beginPath();
    c.arc(80, 128, pos(14), 0, 6.3);
    c.fill();
    text(c, `${DONG} 주민센터`, 80, 178, 12, GREY_D, 'center', false);
  });
};

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
function standAt(g: THREE.Object3D, motion: JuMotion, x = 0, z = 0.6): Spot {
  const s = spot(g, 'stand', x, 0, z, Math.PI);
  s.motion = motion;
  return s;
}
function seatAt(g: THREE.Object3D, motion: JuMotion, seat: V, yaw = Math.PI): Spot {
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
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, tools: Partial<Record<JuTool, HeldTool>>, show: (now: string | null, N: JuNow | null, t: number) => void) {
  out.spots = spots;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const H = (sp?.at.userData.height as number | undefined) ?? 1.6;
    const N = sp ? juNow(sp.motion as JuMotion, t, juPhase(g.getWorldPosition(tmp)), H) : null;
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
  text(c, s, 128, 44, 32, BLUE_D, 'center');
};
function bubble(parent: THREE.Object3D, s: string, w: number, x: number, y: number, z: number): THREE.Sprite {
  const mat = new THREE.SpriteMaterial({ map: painted(`juBubble|${s}`, 256, 96, paintBubble(s)), transparent: true, depthWrite: false });
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
function chair(g: THREE.Object3D, seat: V, color = BLUE) {
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
function stool(g: THREE.Object3D, x: number, T: number, z: number, color = SUN) {
  const c = group(g, x, 0, z);
  part(c, cyl(0.17, 0.17, 0.05, 16), color, 0, T - 0.025, 0);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    rod(c, v3(Math.cos(a) * 0.1, T - 0.05, Math.sin(a) * 0.1), v3(Math.cos(a) * 0.17, 0.01, Math.sin(a) * 0.17), 0.012, GRAPHITE);
  }
  return c;
}
function keyboard(g: THREE.Object3D, p: V, w = 0.28, d = 0.11) {
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
/** Glasses on a head group, close to it: a thin wire, no face of their own. */
function specs(parent: THREE.Object3D, color = '#6d4c41'): THREE.Group {
  const s = group(parent, 0, 0.012, 0.102);
  for (const sx of [-1, 1]) part(s, ring(0.024, 0.0028), color, sx * 0.036, 0, 0, { outline: false });
  part(s, box(0.024, 0.004, 0.004), color, 0, 0.004, 0, { outline: false });
  return s;
}

// ---------------------------------------------------------------------------------------------
// Tools designed for the hand. Each has its origin at the grip and is named for the probe.

const DOWN_IN = v3(-0.12, -1, -0.28).normalize();
function penTool(g: THREE.Object3D, name: string, color = BLUE): { root: THREE.Group; held: HeldTool } {
  const root = group(g);
  root.name = name;
  const inner = group(root);
  inner.quaternion.setFromUnitVectors(v3(0, -1, 0), DOWN_IN);
  part(inner, cyl(0.006, 0.006, PEN_UP * 0.78 + 0.05, 10), color, 0, (0.05 - PEN_UP * 0.78) / 2, 0, { outline: false });
  part(inner, cyl(0.006, 0.002, PEN_UP * 0.22, 10), BLACK, 0, -PEN_UP * 0.89, 0, { outline: false });
  return { root, held: { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: DOWN_IN.clone(), shape: 'pen', radius: 0.012, writes: PEN_UP } } } };
}
function stampTool(g: THREE.Object3D): { root: THREE.Group; held: HeldTool } {
  const root = group(g);
  root.name = 'juStamp';
  part(root, cyl(0.016, 0.018, 0.09, 12), '#3a2616', 0, 0.002, 0, { outline: false });
  part(root, ball(0.021), '#3a2616', 0, 0.058, 0, { outline: false });
  part(root, cyl(0.024, 0.024, 0.012, 14), '#c49a3c', 0, -0.05, 0, { outline: false });
  part(root, cyl(0.03, 0.03, 0.022, 16), '#5a4028', 0, -STAMP_UP + 0.012, 0, { outline: false });
  part(root, cyl(0.028, 0.028, 0.002, 16), SEAL, 0, -STAMP_UP + 0.001, 0, { outline: false });
  return { root, held: { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.017 } } } };
}
/** A sheet held by its near right corner, the middle of it off towards -x, -z. */
function sheetTool(g: THREE.Object3D, name: string): { root: THREE.Group; face: THREE.Mesh; held: HeldTool } {
  const root = group(g);
  root.name = name;
  part(root, box(0.21, 0.002, 0.297), PAPER, -SHEET_GRIP[0], -SHEET_GRIP[1], -SHEET_GRIP[2], { outline: false });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.285), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  face.userData.ownGeometry = face.userData.ownMaterial = true;
  face.position.set(-SHEET_GRIP[0], -SHEET_GRIP[1] + 0.0016, -SHEET_GRIP[2]);
  face.rotation.x = FLAT;
  root.add(face);
  return { root, face, held: { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 0, -1), palm: v3(0, -1, 0), shape: 'pinch', radius: 0.004 } } } };
}
function cardTool(g: THREE.Object3D): { root: THREE.Group; held: HeldTool } {
  const root = group(g);
  root.name = 'juCard';
  part(root, box(0.085, 0.002, 0.054), '#dfe9f2', 0, 0, 0, { outline: false });
  part(root, box(0.02, 0.0015, 0.028), '#b9a184', -0.024, 0.0015, 0, { outline: false });
  part(root, box(0.04, 0.0015, 0.006), BLUE_D, 0.016, 0.0015, -0.01, { outline: false });
  part(root, box(0.04, 0.0015, 0.006), GREY, 0.016, 0.0015, 0.006, { outline: false });
  return { root, held: { tool: root, lead: 'left', grips: { left: { at: v3(0.03, 0, 0.012), axis: v3(0, 0, -1), palm: v3(0, -1, 0), shape: 'pinch', radius: 0.004 } } } };
}
/** A magnifier: the handle along z, towards whoever holds it, the lens flat out ahead. */
function magnifierTool(g: THREE.Object3D): { root: THREE.Group; held: HeldTool } {
  const root = group(g);
  root.name = 'juMagnifier';
  const handle = part(root, cyl(0.013, 0.015, 0.12, 12), '#7a4a2a', 0, 0, 0.0, { outline: false });
  handle.rotation.x = Math.PI / 2;
  part(root, cyl(0.007, 0.007, 0.03, 8), CHROME, 0, 0, -0.07, { outline: false, rx: Math.PI / 2 });
  const rim = part(root, ring(0.05, 0.0045), CHROME, 0, 0, -0.135, { outline: false });
  rim.rotation.x = Math.PI / 2;
  glass(root, cyl(0.048, 0.048, 0.003, 22), 0, 0, -0.135);
  return { root, held: { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 0, 1), shape: 'power', radius: 0.015 } } } };
}
function glassesTool(g: THREE.Object3D): { root: THREE.Group; held: HeldTool } {
  const root = group(g);
  root.name = 'juGlasses';
  for (const sx of [-1, 1]) {
    const r = part(root, ring(0.024, 0.0028), '#6d4c41', sx * 0.034, 0, 0, { outline: false });
    r.rotation.x = 0.3;
    rod(root, v3(sx * 0.058, 0, 0), v3(sx * 0.058, -0.008, -0.11), 0.0022, '#6d4c41');
  }
  part(root, box(0.022, 0.004, 0.004), '#6d4c41', 0, 0.004, 0, { outline: false });
  // Held by one temple, so the lenses stand clear of the hand.
  return { root, held: { tool: root, lead: 'right', grips: { right: { at: v3(0.058, -0.004, -0.06), axis: v3(0, 0, -1), shape: 'pinch', radius: 0.004 } } } };
}
const FLAT_LEFT: HeldTool['grips'] = { left: { at: v3(0, -0.02, 0.05), axis: v3(1, 0, 0), palm: v3(0, 1, 0), shape: 'flat', radius: 0.01 } };

// =============================================================================================
// 민원 창구 (civilCounter, 1 × 1).

const counterKey = (N: JuNow | null, num: number, seed: number) => `${N ? 1 : 0}|${num}|${seed}`;
function paintBoard(c: Ctx2, num: number, win: number, queue: number) {
  c.fillStyle = '#171a1d';
  c.fillRect(0, 0, 240, 72);
  c.fillStyle = '#ff5a3c';
  text(c, `${String(wrap(num, 1000)).padStart(3, '0')}`, 18, 38, 46, '#ff6a4a');
  text(c, '번', 112, 42, 20, '#ff9a7a');
  text(c, `${win}번 창구`, 228, 22, 15, '#ffd28c', 'right');
  text(c, `대기 ${Math.max(0, queue)}명`, 228, 52, 15, queue > 20 ? '#ff8d6a' : '#a8e6a8', 'right');
}
function paintStaffScreen(c: Ctx2, w: number, h: number, mode: number, name: string, fill: number, sealed: number, rule: number, queue: number) {
  c.fillStyle = '#eff4f8';
  c.fillRect(0, 0, w, h);
  c.fillStyle = BLUE_D;
  c.fillRect(0, 0, w, 24);
  text(c, mode === 1 ? '인허가 접수' : mode === 2 ? '민원 조정 기록' : '증명 발급', 8, 13, 13, '#ffffff');
  text(c, queue > 0 ? `대기 ${queue}` : DONG, w - 8, 13, 12, '#ffffff', 'right', false);
  text(c, name, 12, 42, 15, INK);
  const rows = mode === 2 ? ['접수 내용 확인', '관련 규정 찾기', '안내 문구'] : ['신청인 확인', '신청 내용', '수수료·교부'];
  rows.forEach((s, i) => {
    const y = 66 + i * 28;
    const f = clamp01(fill - i);
    c.fillStyle = '#ffffff';
    c.fillRect(10, y - 11, w - 20, 22);
    text(c, s, 16, y, 12, GREY_D, 'left', false);
    if (f > 0.02) {
      c.fillStyle = i === 1 ? '#bcd9ee' : '#c8e4c8';
      c.fillRect(110, y - 6, (w - 130) * f, 12);
    }
  });
  if (mode === 2 && rule > 0.05) {
    c.globalAlpha = clamp01(rule);
    c.fillStyle = '#fff2c8';
    c.fillRect(10, h - 36, w - 20, 26);
    text(c, '제3조 처리 기간 안내', 18, h - 23, 12, '#6b4a10');
    c.globalAlpha = 1;
  }
  if (sealed > 0.5) text(c, '발급 완료', w - 14, h - 22, 15, '#2e7d32', 'right');
}
/** The sheet itself: a title, its lines, and the seal once it's had it. */
function paintCert(c: Ctx2, w: number, h: number, title: string, sealed: boolean, ticks: number) {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, w, h);
  text(c, title, w / 2, 26, 15, INK, 'center');
  c.strokeStyle = '#9aa3a8';
  c.lineWidth = 1;
  c.strokeRect(12, 46, w - 24, h - 112);
  for (let i = 0; i < 6; i++) {
    const y = 66 + i * 22;
    c.fillStyle = '#c9cfd3';
    c.fillRect(20, y, w - 40 - (i % 3) * 18, 4);
    if (i < ticks) text(c, '✓', w - 26, y + 2, 14, BLUE, 'center');
  }
  text(c, `${DONG}장`, w / 2 - 12, h - 34, 13, INK, 'center');
  if (sealed) {
    c.strokeStyle = SEAL;
    c.lineWidth = 2.5;
    c.strokeRect(w / 2 + 12, h - 52, 34, 34);
    text(c, '직인', w / 2 + 29, h - 35, 12, SEAL, 'center');
  }
}
function civilCounter(g: THREE.Group, out: Built) {
  const T = CC.top;
  // The slab through the glass, with a wooden front to the hall side and a drawer pedestal.
  part(g, rbox(0.98, 0.04, 0.68, 0.01), WOOD, 0, T - 0.02, -0.04);
  part(g, box(0.96, T - 0.04, 0.02), WOOD_D, 0, (T - 0.04) / 2, -0.36, { outline: false });
  part(g, box(0.3, T - 0.1, 0.42), CREAM, 0.32, (T - 0.1) / 2 + 0.03, 0.02);
  for (let i = 0; i < 3; i++) part(g, box(0.1, 0.012, 0.01), GREY_D, 0.32, 0.2 + i * 0.2, 0.24, { outline: false });
  part(g, box(0.04, T - 0.04, 0.5), GREY_D, -0.46, (T - 0.04) / 2, 0.02, { outline: false });
  chair(g, CC.seat);
  // The glass, standing just clear of the slab so a sheet goes under it, with a talk hole, and posts.
  for (const sx of [-1, 1]) part(g, box(0.025, 0.7, 0.03), GREY_D, sx * 0.48, T + 0.35, CC.glassZ, { outline: false });
  part(g, box(0.98, 0.04, 0.03), GREY_D, 0, T + 0.72, CC.glassZ);
  glass(g, box(0.93, 0.62, 0.008), 0, T + 0.05 + 0.31, CC.glassZ);
  const hole = part(g, ring(0.05, 0.004), CHROME, 0.1, T + 0.36, CC.glassZ + 0.006, { outline: false });
  hole.castShadow = false;
  // Number board on top of it, turned to the room, and the window's number.
  part(g, box(0.56, 0.2, 0.05), BLACK, 0, T + 0.86, CC.glassZ);
  const board = liveScreen(g, 0.52, 0.16, 240, 72, 0, T + 0.86, CC.glassZ + 0.027);
  // Screen, keys, the call button, the printer with its out-tray.
  const scr = monitor(g, CC.screen, 0.42, 0.26, T, 300, 186);
  keyboard(g, CC.keys);
  part(g, cyl(0.04, 0.046, 0.018, 16), GRAPHITE, CC.bell[0], T + 0.009, CC.bell[2], { outline: false });
  part(g, cyl(0.024, 0.024, 0.012, 14), '#e53935', CC.bell[0], T + 0.024, CC.bell[2], { outline: false });
  label(g, '호출', 0.06, 0.024, CC.bell[0], T + 0.05, CC.bell[2] - 0.05, GRAPHITE, '#ffffff');
  part(g, rbox(0.25, 0.11, 0.26, 0.012), '#dfe3e6', CC.printer[0], T + 0.055, CC.printer[2]);
  part(g, box(0.2, 0.012, 0.13), GREY, CC.tray[0], T + 0.116, CC.tray[2] - 0.03, { outline: false });
  // Ink pad, the stamp's stand, trays, a little cactus and the officer's name plate.
  part(g, rbox(0.09, 0.014, 0.07, 0.005), BLACK, CC.pad[0], T + 0.007, CC.pad[2], { outline: false });
  part(g, box(0.078, 0.003, 0.058), SEAL, CC.pad[0], T + 0.015, CC.pad[2], { outline: false });
  part(g, rbox(0.07, 0.008, 0.07, 0.004), GREY_D, CC.stampHome[0], T + 0.004, CC.stampHome[2], { outline: false });
  part(g, box(0.25, 0.04, 0.34), BLUE_L, CC.inTray[0], T + 0.02, CC.inTray[2], { outline: false });
  const pile = group(g, CC.inTray[0], T + 0.042, CC.inTray[2]);
  for (let i = 0; i < 5; i++) part(pile, box(0.21, 0.008, 0.29), i % 2 ? PAPER : '#efe6c8', 0.003 * Math.sin(i * 2), i * 0.009, 0.003 * Math.cos(i * 3), { outline: false });
  part(g, cyl(0.03, 0.026, 0.05, 12), '#c98d62', -0.42, T + 0.025, -0.28);
  part(g, ball(0.03), '#5f9a55', -0.42, T + 0.07, -0.28);
  // The sheet being worked on: on the desk when it isn't in the hand.
  const stamp = stampTool(g);
  const pen = penTool(g, 'juCounterPen');
  const sheet = sheetTool(g, 'juCertSheet');
  const card = cardTool(g);
  const folder = group(g, CC.paper[0], T + 0.006, CC.paper[2]);
  part(folder, box(0.25, 0.008, 0.33), '#e8c88f', 0, 0, 0, { outline: false });
  const folderFace = liveScreen(folder, 0.21, 0.297, 150, 212, 0, 0.0055, 0, 0, FLAT);
  folder.visible = false;
  const sealMark = group(g, CC.outTray[0], T + 0.02, CC.outTray[2]);
  part(sealMark, box(0.25, 0.04, 0.3), BLUE_L, 0, 0, 0, { outline: false });
  const donePile = group(sealMark, 0, 0.022, 0);
  for (let i = 0; i < 3; i++) part(donePile, box(0.21, 0.006, 0.28), '#e8c88f', 0, i * 0.007, 0, { outline: false });
  const certTex = (key: string, title: string, sealed: boolean) =>
    painted(`juCert|${key}|${sealed ? 1 : 0}`, 150, 212, (c) => paintCert(c, 150, 212, title, sealed, 0));
  const spots: Record<string, Spot> = {
    issueCertificate: seatAt(g, 'juCert', CC.seat),
    processPermit: seatAt(g, 'juPermit', CC.seat),
    rushCounter: seatAt(g, 'juRush', CC.seat),
    civilServant_resolveComplaint: seatAt(g, 'juMediate', CC.seat),
  };
  spots['*'] = spots.issueCertificate;
  out.seat = marker(g, CC.seat[0], CC.seat[1], CC.seat[2]);
  out.work = marker(g, CC.keys[0], CC.keys[1], CC.keys[2]);
  const seatC = stool(g, CC.client[0], CC.client[1], CC.client[2]);
  seatC.visible = false;
  const looks: ReadonlyArray<readonly [string, string, string, 'female' | 'male', FigureOptions['stage']]> = [
    ['#8c9a6a', '#47525a', '#b9b9b4', 'female', 'elder'],
    ['#6b86a6', '#333c44', '#2a211a', 'male', undefined],
    ['#c08a78', '#3f4a52', '#3a2a1f', 'female', undefined],
  ];
  let seed = -1;
  let client: ReturnType<typeof lazy> | null = null;
  const thanks = bubble(g, '고맙습니다', 0.56, CC.client[0] + 0.12, 1.46, CC.client[2]);
  const cross = bubble(g, '왜 안 되나요?', 0.62, CC.client[0] + 0.12, 1.46, CC.client[2]);
  const toHand = new THREE.Vector3();
  const show = (now: string | null, N: JuNow | null, t: number) => {
    if (seed < 0) {
      seed = seedOf(g);
      const L = looks[wrap(seed, looks.length)];
      client = lazy(() => person(g, L[0], L[1], L[2], CC.client[0], CC.client[2], 0, L[3], CC.client[1], seed, L[4]));
      label(g, ['주무관 배', '주무관 김', '주무관 이', '주무관 한'][wrap(seed, 4)], 0.14, 0.04, -0.3, T + 0.04, 0.3, BLUE_D, '#ffffff');
    }
    const n = N?.n ?? {};
    const round = (N?.b.n ?? 0) + seed;
    const name = certOf(round);
    const mode = n.mode ?? 0;
    const sealed = (n.sealed ?? 0) > 0.5;
    const num = wrap(seed * 7, 300) + 40 + wrap((n.called ?? 0) > 0.5 ? round : round - 1, 400);
    const queue = n.rush ? (n.queue ?? 0) : N ? wrap(seed + round, 9) + 2 : wrap(seed, 6) + 1;
    board.draw(counterKey(N, num, queue), (c) => paintBoard(c, num, wrap(seed, 4) + 1, queue));
    const title = mode === 1 ? permitOf(round) : mode === 2 ? '민원 안내' : name;
    scr.draw(`${mode}|${title}|${q(n.fill, 6)}|${sealed ? 1 : 0}|${q(n.rule, 4)}|${n.rush ? queue : 0}`, (c) => paintStaffScreen(c, 300, 186, mode, title, n.fill ?? 0, sealed ? 1 : 0, n.rule ?? 0, n.rush ? queue : 0));
    // The certificate on its way: the same sheet from the printer to the stamp to the glass.
    const hasSheet = !!N?.props.sheet;
    sheet.root.visible = hasSheet;
    if (hasSheet) {
      at(sheet.root, N!.props.sheet);
      const m = sheet.face.material as THREE.MeshBasicMaterial;
      const tex = certTex(name, name, sealed);
      if (m.map !== tex) {
        m.map = tex;
        m.needsUpdate = true;
      }
    }
    at(stamp.root, N?.props.stamp ?? null, [CC.stampHome[0], CC.stampHome[1] + STAMP_UP, CC.stampHome[2]]);
    at(pen.root, N?.props.pen ?? null, [CC.paper[0] + 0.17, T + 0.02, CC.paper[2] + 0.1]);
    at(card.root, N?.props.card ?? null);
    // A folder under permit work.
    const fold = mode === 1 ? clamp01(n.folder) : mode === 2 ? clamp01(n.doc) : 0;
    folder.visible = fold > 0.02;
    if (folder.visible) {
      const moved = clamp01(n.moved);
      folder.position.set(CC.paper[0] + (CC.outTray[0] - CC.paper[0]) * moved, T + 0.006 + 0.05 * Math.sin(moved * Math.PI), CC.paper[2] + (CC.outTray[2] - CC.paper[2]) * moved);
      const ticks = Math.floor(n.ticks ?? 0);
      folderFace.draw(`${mode}|${title}|${ticks}|${sealed ? 1 : 0}`, (c) => paintCert(c, 150, 212, title, sealed, ticks));
    }
    pile.scale.y = mode === 1 && (n.filed ?? 0) > 0.5 ? 0.7 : 1;
    donePile.visible = wrap(round, 3) > 0 || (n.filed ?? 0) > 0.5;
    // The resident across the glass.
    const here = (n.client ?? 0) > 0.5;
    seatC.visible = here;
    const angry = n.cross ?? 0;
    cross.visible = angry > 0.6 && now === 'civilServant_resolveComplaint';
    thanks.visible = (n.thanks ?? 0) > 0.5 || (n.ok ?? 0) > 0.5;
    if (here && client) {
      const f = client.get();
      f.root.visible = true;
      if ((n.reach ?? 0) > 0.5) {
        toHand.set(0.04, T + 0.05, -0.26);
        f.armR(toHand);
      } else if (angry > 0.1) {
        toHand.set(CC.client[0] + 0.18, T + 0.14 + 0.1 * Math.abs(Math.sin(t * 4.2)) * angry, CC.client[2] + 0.34);
        f.armR(toHand);
      } else f.armR(null);
      f.armL(null);
      nodHead(f, (n.nods ?? 0) > 0.5 ? 0.14 + 0.08 * Math.sin(t * 2.6) : (n.thanks ?? 0) > 0.5 ? 0.22 : 0.04);
    } else client?.hide();
  };
  const tools: Partial<Record<JuTool, HeldTool>> = { stamp: stamp.held, pen: pen.held, sheet: sheet.held, card: card.held };
  drive(g, out, spots, tools, show);
}

// =============================================================================================
// 무인민원발급기 (juKiosk, 1 × 1).

function paintKiosk(c: Ctx2, w: number, h: number, step: number, press: number) {
  c.fillStyle = '#e9f2f8';
  c.fillRect(0, 0, w, h);
  c.fillStyle = BLUE;
  c.fillRect(0, 0, w, 34);
  text(c, '무인민원발급기', w / 2, 18, 18, '#ffffff', 'center');
  if (step === 0) {
    CERTS.slice(0, 4).forEach((s, i) => {
      const x = 12 + (i % 2) * ((w - 18) / 2);
      const y = 48 + Math.floor(i / 2) * 72;
      c.fillStyle = '#ffffff';
      c.fillRect(x, y, (w - 36) / 2, 62);
      text(c, s.slice(0, 7), x + (w - 36) / 4, y + 31, 13, INK, 'center');
    });
  } else if (step === 1) {
    text(c, '주민등록표 등본', w / 2, 62, 18, INK, 'center');
    c.fillStyle = '#ffffff';
    c.fillRect(20, 84, w - 40, 40);
    text(c, '주민번호를 눌러 주세요', w / 2, 104, 14, GREY_D, 'center', false);
    text(c, '큰 글씨 보기', w / 2, 150, 15, BLUE_D, 'center');
  } else if (step === 2) {
    text(c, '번호를 눌러 주세요', w / 2, 52, 15, INK, 'center');
    const dots = wrap(press, 7);
    for (let i = 0; i < 6; i++) {
      c.fillStyle = i < dots ? BLUE : '#c6d3db';
      c.beginPath();
      c.arc(40 + i * ((w - 80) / 5), 74, pos(7), 0, 6.3);
      c.fill();
    }
    for (let i = 0; i < 9; i++) {
      c.fillStyle = i === wrap(press, 9) ? SUN : '#ffffff';
      c.fillRect(32 + (i % 3) * 68, 92 + Math.floor(i / 3) * 34, 60, 28);
      text(c, `${i + 1}`, 62 + (i % 3) * 68, 106 + Math.floor(i / 3) * 34, 16, INK, 'center');
    }
  } else if (step === 3) {
    text(c, '수수료 200원', w / 2, 74, 22, INK, 'center');
    text(c, '동전 또는 카드를 넣어 주세요', w / 2, 112, 13, GREY_D, 'center', false);
    c.fillStyle = GREEN;
    c.fillRect(w / 2 - 60, 140, 120, 44);
    text(c, '확인', w / 2, 162, 18, '#ffffff', 'center');
  } else {
    text(c, '발급하고 있어요', w / 2, 90, 20, INK, 'center');
    text(c, '아래에서 받아 가세요', w / 2, 130, 14, GREY_D, 'center', false);
    text(c, '↓', w / 2, 172, 30, BLUE, 'center');
  }
}
function kiosk(g: THREE.Group, out: Built) {
  // A cream cabinet on a plinth, a raked head with its screen, a slot and tray at a comfortable height.
  part(g, rbox(0.64, 0.08, 0.44, 0.02), GREY_D, 0, 0.04, -0.2);
  part(g, rbox(0.6, 0.98, 0.42, 0.03), CREAM, 0, 0.56, -0.2);
  part(g, box(0.5, 0.04, 0.012), BLUE, 0, 0.3, 0.012, { outline: false });
  const head = group(g, 0, 1.2, -0.18);
  head.rotation.x = -0.32;
  part(head, rbox(0.6, 0.5, 0.2, 0.03), BLUE_D, 0, 0, -0.03);
  const scr = liveScreen(head, 0.5, 0.4, 340, 272, 0, 0, 0.074);
  part(g, rbox(0.6, 0.15, 0.2, 0.02), BLUE, 0, 1.56, -0.25);
  label(g, '증명서 발급', 0.46, 0.11, 0, 1.56, -0.148, BLUE, '#ffffff');
  // Tray.
  part(g, rbox(0.3, 0.05, 0.14, 0.01), GRAPHITE, KI.tray[0], KI.tray[1] - 0.028, KI.tray[2] - 0.05);
  part(g, box(0.24, 0.012, 0.012), BLACK, KI.tray[0], KI.tray[1] + 0.05, 0.012, { outline: false });
  // Coin and card, and a large-print card on a chain.
  part(g, rbox(0.1, 0.04, 0.02, 0.006), GREY, 0.2, 0.86, 0.015, { outline: false });
  part(g, box(0.05, 0.004, 0.006), BLACK, 0.2, 0.87, 0.026, { outline: false });
  label(g, '어려우면 직원을 불러 주세요', 0.5, 0.05, 0, 0.72, 0.014, '#fff4cf', '#6b4a10');
  const sheet = sheetTool(g, 'juKioskSheet');
  sheet.root.visible = false;
  const tex = painted('juCert|kiosk|0', 150, 212, (c) => paintCert(c, 150, 212, CERTS[0], true, 0));
  (sheet.face.material as THREE.MeshBasicMaterial).map = tex;
  (sheet.face.material as THREE.MeshBasicMaterial).needsUpdate = true;
  const spots: Record<string, Spot> = { juHelp: standAt(g, 'juHelp', KI.dweller[0], KI.dweller[1]) };
  spots['*'] = spots.juHelp;
  out.work = marker(g, KI.screen[0], KI.screen[1], KI.screen[2] + 0.05);
  const elder = lazy(() => person(g, '#7d8a66', '#4a4f52', '#c9c9c4', KI.elder[0], KI.elder[1], Math.PI, 'female', undefined, 71, 'elder'));
  const thanks = bubble(g, '아이고, 고마워요', 0.7, KI.elder[0], 1.82, KI.elder[1]);
  const to = new THREE.Vector3();
  const tools: Partial<Record<JuTool, HeldTool>> = { sheet: sheet.held };
  drive(g, out, spots, tools, (_now, N, t) => {
    const n = N?.n ?? {};
    const step = Math.floor(n.step ?? 0);
    const press = n.press ? Math.floor(t * 1.1) : 0;
    scr.draw(`${N ? step : 0}|${press}`, (c) => paintKiosk(c, 340, 272, N ? step : 0, press));
    at(sheet.root, N?.props.sheet ?? null);
    thanks.visible = (n.glad ?? 0) > 0.5;
    if ((n.elder ?? 0) > 0.5) {
      const f = elder.get();
      f.root.visible = true;
      if (n.press) {
        const dy = 0.05 * Math.sin(t * 2.2);
        to.set(KI.key[0] - 0.02 * Math.cos(t), KI.key[1] + dy - 0.05, KI.key[2] + 0.1 + 0.02 * Math.abs(Math.sin(t * 3.3)));
        f.armR(to);
      } else if (n.handing) {
        to.set(KI.handOver[0], KI.handOver[1], KI.handOver[2]);
        f.armR(to);
      } else f.armR(null);
      f.armL(null);
      nodHead(f, n.press ? 0.28 : (n.glad ?? 0) > 0.5 ? 0.2 + 0.1 * Math.sin(t * 2.4) : (n.talking ?? 0) > 0.5 ? 0.08 + 0.04 * Math.sin(t * 2) : 0.14);
    } else elder.hide();
  });
}

// =============================================================================================
// 기재대 (juFormStand, 2 × 1).

const FORM_NAMES = ['전입신고서', '각종 증명 신청서', '복지 신청서', '건의 메모'];
function paintFormSample(c: Ctx2) {
  c.fillStyle = '#fff6d8';
  c.fillRect(0, 0, 256, 128);
  text(c, '작성 예시', 128, 18, 17, '#6b4a10', 'center');
  ['성명: 홍길동', '주소: 은샘로 12', '연락처: 010-0000-0000'].forEach((s, i) => text(c, s, 16, 48 + i * 24, 14, INK, 'left', false));
  c.strokeStyle = SEAL;
  c.lineWidth = 3;
  c.beginPath();
  c.arc(214, 92, pos(22), 0, 6.3);
  c.stroke();
  text(c, '서명', 214, 92, 13, SEAL, 'center');
}
function formStand(g: THREE.Group, out: Built) {
  const T = FS.top;
  // Oak top on two panels with a footrest; a raised back carrying the pockets of forms.
  part(g, rbox(1.92, 0.04, 0.42, 0.012), WOOD, 0, T - 0.02, -0.04);
  for (const sx of [-1, 1]) part(g, box(0.05, T - 0.04, 0.34), WOOD_D, sx * 0.86, (T - 0.04) / 2, -0.06);
  part(g, box(1.72, 0.05, 0.05), WOOD_D, 0, 0.14, -0.08, { outline: false });
  part(g, box(1.92, 0.44, 0.03), CREAM, 0, T + 0.22, -0.24);
  part(g, box(1.92, 0.05, 0.05), WOOD_D, 0, T + 0.44, -0.24, { outline: false });
  label(g, '민원 서식 기재대', 0.52, 0.08, 0, T + 0.385, -0.223, BLUE_D, '#ffffff');
  // The pockets.
  const fills = FS.pockets.map((x, i) => {
    part(g, box(0.34, 0.02, 0.05), GREY, x, FS.pocketY - 0.09, FS.pocketZ - 0.04, { outline: false });
    part(g, box(0.34, 0.1, 0.008), BLUE_L, x, FS.pocketY - 0.05, FS.pocketZ - 0.012);
    label(g, FORM_NAMES[i], 0.3, 0.05, x, FS.pocketY - 0.055, FS.pocketZ - 0.006, BLUE_L, BLUE_D);
    const stack = group(g, x, FS.pocketY - 0.03, FS.pocketZ - 0.04);
    part(stack, box(0.28, 0.13, 0.024), PAPER, 0, 0.05, 0, { outline: false });
    return stack;
  });
  // A worked example, the stock box, the chained pen's pot, the magnifier's cradle, the glasses' stand.
  const sample = painted('juFormSample', 256, 128, paintFormSample);
  picture(g, sample, 0.34, 0.17, 0, T + 0.09, -0.222);
  part(g, box(0.28, 0.14, 0.2), '#d7b98a', FS.box[0], T + 0.07, FS.box[2]);
  part(g, box(0.26, 0.05, 0.18), PAPER, FS.box[0], T + 0.15, FS.box[2], { outline: false });
  label(g, '서식 보충', 0.16, 0.04, FS.box[0], T + 0.08, FS.box[2] + 0.102, '#d7b98a', '#4a3417');
  part(g, cyl(0.03, 0.03, 0.08, 12), GREY_D, FS.penHome[0] - 0.08, T + 0.04, FS.penHome[2] - 0.06);
  part(g, rbox(0.17, 0.016, 0.07, 0.005), WOOD_D, FS.magHome[0], T + 0.008, FS.magHome[2] - 0.02, { outline: false });
  part(g, rbox(0.12, 0.012, 0.06, 0.004), '#f4ead6', FS.glassHome[0], T + 0.006, FS.glassHome[2], { outline: false });
  label(g, '돋보기·안경 쓰세요', 0.28, 0.04, 0.02, T + 0.03, 0.03, '#fff4cf', '#6b4a10');
  // The form lying at the elder's end: its boxes fill in as they write.
  const form = liveScreen(g, 0.21, 0.297, 150, 212, FS.form[0], FS.form[1] + 0.002, FS.form[2], 0, FLAT);
  part(g, box(0.22, 0.002, 0.305), PAPER, FS.form[0], FS.form[1], FS.form[2], { outline: false });
  const pen = penTool(g, 'juFormPen', '#2c7d53');
  const mag = magnifierTool(g);
  const gl = glassesTool(g);
  const stackHeld = group(g);
  stackHeld.name = 'juFormStack';
  part(stackHeld, box(0.26, 0.05, 0.2), PAPER, 0, 0, 0, { outline: false });
  part(stackHeld, box(0.27, 0.006, 0.02), BLUE, 0, 0.02, 0, { outline: false });
  stackHeld.visible = false;
  const tools: Partial<Record<JuTool, HeldTool>> = {
    pen: pen.held,
    mag: mag.held,
    glasses: gl.held,
    stack: { tool: stackHeld, lead: 'left', grips: FLAT_LEFT },
  };
  const spots: Record<string, Spot> = { juFormHelp: standAt(g, 'juFormHelp', -0.02, FS.stand), juFormStock: standAt(g, 'juFormStock', -0.56, FS.stand) };
  spots['*'] = spots.juFormHelp;
  out.work = marker(g, FS.form[0], FS.form[1] + 0.02, FS.form[2]);
  const elder = lazy(() => {
    const f = person(g, '#a26d58', '#4a4f52', '#bfbfba', FS.elder[0], FS.elder[1], Math.PI, 'male', undefined, 73, 'elder');
    return f;
  });
  let onHead: THREE.Group | null = null;
  const thanks = bubble(g, '잘 보이네요', 0.56, FS.elder[0], 1.82, FS.elder[1]);
  const to = new THREE.Vector3();
  drive(g, out, spots, tools, (now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    at(pen.root, P.pen, FS.penHome);
    at(mag.root, P.mag, FS.magHome);
    at(gl.root, P.glasses, now === 'juFormHelp' ? null : FS.glassHome);
    at(stackHeld, P.stack ?? null);
    const pocket = now === 'juFormStock' ? (n.pocket ?? -1) : -1;
    fills.forEach((s, i) => (s.scale.y = i === pocket ? 0.35 + 0.65 * clamp01(n.filling) : 1));
    const written = n.written ?? 0;
    const marked = n.marked ?? 0;
    form.draw(`${q(written, 8)}|${q(marked, 4)}`, (c) => {
      c.fillStyle = PAPER;
      c.fillRect(0, 0, 150, 212);
      text(c, '각종 증명 신청서', 75, 18, 13, INK, 'center');
      for (let i = 0; i < 4; i++) {
        const y = 42 + i * 34;
        c.strokeStyle = '#9aa3a8';
        c.lineWidth = 1;
        c.strokeRect(12, y, 126, 26);
        const f = clamp01(written * 4 - i);
        if (f > 0.02) {
          c.strokeStyle = '#2c3e70';
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(18, y + 16);
          for (let x = 0; x <= 110 * f; x += 6) c.lineTo(18 + x, y + 12 + 5 * Math.sin(x * 0.5 + i));
          c.stroke();
        }
      }
      if (marked > 0.05) {
        c.strokeStyle = SEAL;
        c.lineWidth = 2.5;
        c.beginPath();
        c.arc(106, 190, pos(16), 0, clamp01(marked) * 6.3);
        c.stroke();
        text(c, '서명', 106, 190, 11, SEAL, 'center');
      }
    });
    thanks.visible = (n.glad ?? 0) > 0.5;
    if ((n.elder ?? 0) > 0.5) {
      const f = elder.get();
      f.root.visible = true;
      if (!onHead) onHead = specs(f.head);
      onHead.visible = (n.on ?? 0) > 0.5;
      if ((n.writing ?? 0) > 0.5) {
        to.set(FS.form[0] + 0.05 + 0.04 * Math.sin(t * 3.4), FS.form[1] + 0.05, FS.form[2] + 0.08 - 0.1 * clamp01(written));
        f.armR(to);
        f.armL(null);
      } else {
        f.armR(null);
        f.armL(null);
      }
      nodHead(f, (n.leanIn ?? 0) > 0.5 ? 0.3 : (n.glad ?? 0) > 0.5 ? 0.2 + 0.1 * Math.sin(t * 2.4) : 0.1);
    } else elder.hide();
  });
}

// =============================================================================================
// 복지 상담 부스 (juWelfareBooth, 2 × 2).

function paintLeaflet(c: Ctx2) {
  c.fillStyle = '#fff2d9';
  c.fillRect(0, 0, 150, 212);
  c.fillStyle = ORANGE;
  c.fillRect(0, 0, 150, 34);
  text(c, '함께 살피는 복지', 75, 18, 14, '#ffffff', 'center');
  ['돌봄 안내', '난방비 도움', '반찬 나눔', '말벗 방문'].forEach((s, i) => {
    c.fillStyle = '#ffffff';
    c.fillRect(12, 46 + i * 38, 126, 30);
    text(c, s, 22, 61 + i * 38, 13, INK, 'left', false);
  });
  text(c, DONG, 75, 200, 11, GREY_D, 'center', false);
}
function paintWelfareScreen(c: Ctx2, fill: number) {
  c.fillStyle = '#f7f1e6';
  c.fillRect(0, 0, 280, 180);
  c.fillStyle = ORANGE;
  c.fillRect(0, 0, 280, 24);
  text(c, '상담 기록', 8, 13, 13, '#ffffff');
  ['어떻게 지내시는지', '도와드릴 수 있는 것', '다음에 찾아뵐 날'].forEach((s, i) => {
    const y = 46 + i * 42;
    text(c, s, 12, y, 12, GREY_D, 'left', false);
    c.fillStyle = '#ffffff';
    c.fillRect(12, y + 8, 256, 18);
    const f = clamp01(fill - i);
    if (f > 0.02) {
      c.fillStyle = '#f2c698';
      c.fillRect(14, y + 11, 250 * f, 12);
    }
  });
}
function welfareBooth(g: THREE.Group, out: Built) {
  const T = WB.top;
  // Low fabric screens on three sides, kept seated-head high so the room still sees over them; the front left open to the room.
  const fabric = '#b9c6a9';
  part(g, rbox(1.94, 1.22, 0.06, 0.02), fabric, 0, 0.64, -0.95);
  for (const sx of [-1, 1]) part(g, rbox(0.06, 1.22, 1.66, 0.02), fabric, sx * 0.95, 0.64, -0.14);
  for (const sx of [-1, 1]) part(g, box(0.03, 0.05, 0.3), GREY_D, sx * 0.95, 0.025, 0.6, { outline: false });
  label(g, '복지 상담', 0.42, 0.11, -0.66, 1.1, -0.915, ORANGE, '#ffffff');
  part(g, rbox(0.62, 0.42, 0.012, 0.004), CREAM, 0.46, 0.95, -0.914);
  picture(g, painted('juWelfareNote', 240, 160, (c) => {
    c.fillStyle = '#fff8e6';
    c.fillRect(0, 0, 240, 160);
    text(c, '이야기는 이 안에서만', 120, 40, 18, BLUE_D, 'center');
    text(c, '천천히 말씀하세요', 120, 86, 18, ORANGE, 'center');
    text(c, '따뜻한 차 드릴게요', 120, 126, 15, GREY_D, 'center', false);
  }), 0.56, 0.37, 0.46, 0.95, -0.905);
  // The desk across, a monitor at the side, a tissue box, a small plant, the pen and notes.
  part(g, rbox(1.3, 0.04, 0.52, 0.012), WOOD, 0, T - 0.02, 0.54);
  for (const sx of [-1, 1]) part(g, box(0.04, T - 0.04, 0.42), WOOD_D, sx * 0.6, (T - 0.04) / 2, 0.54, { outline: false });
  part(g, box(1.16, 0.34, 0.02), WOOD_D, 0, T - 0.21, 0.32, { outline: false });
  chair(g, WB.seat);
  stool(g, WB.client[0], WB.client[1], WB.client[2], '#d9a06a');
  const scr = monitor(g, [-0.42, T + 0.26, 0.5], 0.32, 0.2, T, 280, 180, 0.35);
  keyboard(g, WB.keys, 0.22, 0.09);
  part(g, rbox(0.16, 0.09, 0.1, 0.012), '#e7c9d4', 0.48, T + 0.045, 0.48);
  part(g, box(0.05, 0.03, 0.01), PAPER, 0.48, T + 0.11, 0.48, { outline: false });
  part(g, cyl(0.04, 0.034, 0.05, 12), '#c98d62', 0.5, T + 0.025, 0.72);
  part(g, ball(0.045), GREEN, 0.5, T + 0.08, 0.72);
  // Notes: fills in with the hand.
  const note = liveScreen(g, 0.2, 0.28, 150, 212, WB.note[0], WB.note[1] + 0.003, WB.note[2], 0, FLAT);
  part(g, box(0.21, 0.004, 0.29), '#efe6c8', WB.note[0], WB.note[1], WB.note[2], { outline: false });
  // A paper cup of barley tea, the leaflet, the pen.
  const cup = group(g);
  cup.name = 'juTeaCup';
  part(cup, cyl(0.036, 0.028, 0.09, 14), PAPER, 0, 0, 0, { outline: false });
  part(cup, cyl(0.032, 0.032, 0.004, 14), '#a97646', 0, 0.044, 0, { outline: false });
  const leaf = group(g);
  part(leaf, box(0.16, 0.002, 0.22), '#fff2d9', 0, 0, 0, { outline: false });
  picture(leaf, painted('juLeaflet', 150, 212, paintLeaflet), 0.155, 0.215, 0, 0.002, 0, '#ffffff', 0, FLAT);
  const pen = penTool(g, 'juWelfarePen', '#7a5a3f');
  const spots: Record<string, Spot> = { juWelfare: seatAt(g, 'juWelfare', WB.seat) };
  spots['*'] = spots.juWelfare;
  out.seat = marker(g, WB.seat[0], WB.seat[1], WB.seat[2]);
  out.work = marker(g, WB.note[0], WB.note[1], WB.note[2]);
  const client = lazy(() => person(g, '#927b9a', '#3f4a52', '#8f8f8a', WB.client[0], WB.client[2], 0, 'female', WB.client[1], 77, 'elder'));
  const glad = bubble(g, '말씀 고마워요', 0.6, WB.client[0] + 0.1, 1.46, WB.client[2]);
  const to = new THREE.Vector3();
  const tools: Partial<Record<JuTool, HeldTool>> = {
    pen: pen.held,
    cup: { tool: cup, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'cradle', radius: 0.034 } } },
  };
  drive(g, out, spots, tools, (_now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    at(pen.root, P.pen, WB.penHome);
    at(cup, P.cup, WB.cupHome);
    at(leaf, P.leaflet, WB.leaflet);
    const lines = Math.floor(n.lines ?? 0);
    note.draw(`${lines}`, (c) => {
      c.fillStyle = '#fbf5e0';
      c.fillRect(0, 0, 150, 212);
      text(c, '상담 메모', 12, 16, 13, BLUE_D);
      for (let i = 0; i < 6; i++) {
        c.fillStyle = '#d7d0b8';
        c.fillRect(10, 40 + i * 28, 130, 1);
        if (i < lines) {
          c.strokeStyle = '#3a3a48';
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(14, 34 + i * 28);
          for (let x = 0; x < 110 - i * 8; x += 6) c.lineTo(14 + x, 32 + i * 28 + 3 * Math.sin(x * 0.6 + i));
          c.stroke();
        }
      }
    });
    scr.draw(`${q(n.fill, 6)}`, (c) => paintWelfareScreen(c, n.fill ?? 0));
    glad.visible = (n.glad ?? 0) > 0.5;
    if ((n.client ?? 0) > 0.5) {
      const f = client.get();
      f.root.visible = true;
      if ((n.reach ?? 0) > 0.5) {
        to.set(WB.leafThere[0] + 0.04 * Math.sin(t * 2), WB.leafThere[1] + 0.04, WB.leafThere[2] - 0.04);
        f.armR(to);
      } else if ((n.talks ?? 0) > 0.5) {
        to.set(WB.client[0] + 0.14, T + 0.08 + 0.05 * Math.sin(t * 2.8), WB.client[2] + 0.34);
        f.armR(to);
      } else f.armR(null);
      to.set(WB.cupThere[0], WB.cupThere[1], WB.cupThere[2] - 0.02);
      f.armL((n.talks ?? 0) > 0.5 ? to : null);
      nodHead(f, (n.nods ?? 0) > 0.5 ? 0.14 + 0.08 * Math.sin(t * 2.4) : 0.04);
    } else client.hide();
  });
}

// =============================================================================================
// 마을 소식판 (juNoticeBoard, 2 × 1).

function noticeBoard(g: THREE.Group, out: Built) {
  const w = 1.74;
  const h = 1.08;
  const cy = 1.26;
  const face = NB.face;
  // A wooden frame round cork, a small roof of its own and a heading.
  part(g, box(w + 0.08, h + 0.08, 0.05), WOOD_D, 0, cy, face - 0.022);
  part(g, box(w, h, 0.012), '#c8a06f', 0, cy, face + 0.006, { outline: false });
  const r = seeded(19);
  for (let i = 0; i < 70; i++) part(g, box(0.01 + r() * 0.012, 0.006, 0.002), '#9c7849', -w / 2 + r() * w, cy - h / 2 + r() * h, face + 0.013, { outline: false });
  part(g, rbox(w + 0.2, 0.05, 0.16, 0.012), GREEN, 0, cy + h / 2 + 0.07, face + 0.03);
  part(g, box(0.72, 0.13, 0.02), WOOD_D, 0, cy + h / 2 + 0.18, face - 0.01);
  label(g, `${DONG} 마을 소식`, 0.68, 0.1, 0, cy + h / 2 + 0.18, face + 0.002, GREEN, '#ffffff');
  // Six places, each with its sheet and two pins; the one worked on is emptied and refilled.
  const sheets = Array.from({ length: 6 }, (_, i) => {
    const S = nbSlot(i);
    const m = picture(g, newsTex(i), 0.32, 0.4, S[0], S[1], S[2], '#ffffff');
    const pins = [-0.1, 0.1].map((dx) => part(g, ball(0.011), i % 2 ? SEAL : BLUE, S[0] + dx, S[1] + 0.15, S[2] + 0.008, { outline: false }));
    return { m, pins };
  });
  const pin = group(g);
  pin.name = 'juPushPin';
  part(pin, cyl(0.009, 0.006, 0.014, 10), SEAL, 0, 0, 0.012, { outline: false, rx: Math.PI / 2 });
  part(pin, cyl(0.0015, 0.0015, 0.014, 6), CHROME, 0, 0, 0, { outline: false, rx: Math.PI / 2 });
  pin.visible = false;
  const oldSheet = picture(g, newsTex(0), 0.32, 0.4, 0, 0, 0);
  oldSheet.visible = false;
  const tools: Partial<Record<JuTool, HeldTool>> = { pin: { tool: pin, lead: 'right', grips: { right: { at: v3(0, 0, 0.012), axis: v3(0, 0, -1), shape: 'pinch', radius: 0.006 } } } };
  const spots: Record<string, Spot> = { juPostNotice: standAt(g, 'juPostNotice', 0, NB.read) };
  spots['*'] = spots.juPostNotice;
  out.work = marker(g, 0, cy, face + 0.02);
  drive(g, out, spots, tools, (_now, N) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    at(pin, P.pin ?? null);
    const slot = N ? (n.slot ?? -1) : -1;
    const round = N?.b.n ?? 0;
    sheets.forEach((s, i) => {
      if (i !== slot) {
        s.m.visible = true;
        s.pins.forEach((p) => (p.visible = true));
        return;
      }
      const isNew = (n.new ?? 0) > 0.05;
      const isOld = (n.old ?? 0) > 0.05;
      s.m.visible = isNew || isOld;
      const m = s.m.material as THREE.MeshBasicMaterial;
      const t = newsTex(isNew ? round + 3 : i);
      if (m.map !== t) {
        m.map = t;
        m.needsUpdate = true;
      }
      m.color.setScalar(1);
      s.pins[0].visible = isOld ? true : (n.pinA ?? 0) > 0.5;
      s.pins[1].visible = isOld ? (n.pins ?? 0) < 0.5 : (n.pinB ?? 0) > 0.5;
    });
    const O = P.oldSheet;
    oldSheet.visible = !!O;
    if (O) oldSheet.position.set(O[0], O[1], O[2]);
  });
}

// =============================================================================================
// 이동식 서고 (juRollStack, 2 × 2).

function rollStack(g: THREE.Group, out: Built) {
  // Rails in the floor, a fixed back wall of shelving; the carriages on their rails with a wheel at the end of each.
  for (const z of [-0.7, 0, 0.7]) part(g, box(1.9, 0.016, 0.03), GREY_D, 0, 0.008, z, { outline: false });
  const LEN = RS.end + 0.85;
  const zc = (RS.end - 0.85) / 2;
  const H = 2.05;
  const r = seeded(29);
  const spines = ['#3b5b7a', '#7a4a2a', '#2f6d5a', '#8a6d3b', '#6a4a7a', '#a1503f'];
  const carriages = Array.from({ length: RS.count }, (_, i) => {
    const c = group(g);
    const w = RS.width - 0.012;
    part(c, box(w, H, 0.03), '#c7ccc9', 0, H / 2 + 0.02, RS.end);
    part(c, box(w, H, 0.03), '#c7ccc9', 0, H / 2 + 0.02, -0.85);
    part(c, box(0.012, H, LEN), '#9aa4a0', 0, H / 2 + 0.02, zc, { outline: false });
    part(c, box(w, 0.03, LEN), '#b0b6b2', 0, H + 0.03, zc);
    part(c, box(w, 0.03, LEN), GREY_D, 0, 0.04, zc, { outline: false });
    RS.shelfY.forEach((y, si) => {
      part(c, box(w - 0.02, 0.012, LEN - 0.04), '#d9dcd9', 0, y - 0.015, zc, { outline: false });
      for (const side of [-1, 1]) {
        for (let k = 0; k < 9; k++) {
          const zz = -0.74 + k * 0.17;
          const tall = 0.26 + r() * 0.06;
          const col = spines[Math.floor(r() * spines.length)];
          if (side === 1 && si === 2 && k === 6) continue; // The one that gets drawn.
          part(c, box(0.1, tall, 0.14), col, side * (w / 2 - 0.058), y + tall / 2 - 0.005, zz, { outline: false });
        }
      }
    });
    // The end panel: its wheel and the range it holds.
    const wheel = group(c, 0, RS.wheelY, RS.end + 0.04);
    const rim = part(wheel, ring(0.11, 0.009), CHROME, 0, 0, 0.02, { outline: false });
    rim.castShadow = false;
    for (let s = 0; s < 3; s++) part(wheel, box(0.2, 0.014, 0.012), CHROME, 0, 0, 0.02, { rz: (s * Math.PI) / 3, outline: false });
    part(wheel, cyl(0.022, 0.022, 0.03, 12), GREY_D, 0, 0, 0.012, { rx: Math.PI / 2, outline: false });
    label(c, ['~1990', '~2005', '~2015', '현재'][i], 0.2, 0.08, 0, 1.56, RS.end + 0.018, BLUE_D, '#ffffff');
    label(c, ['가옥 대장', '토지 대장', '복지 기록', '주민 민원'][i], 0.26, 0.07, 0, 1.42, RS.end + 0.018, CREAM, INK);
    return { c, wheel };
  });
  label(g, '기록물 서고', 0.5, 0.11, 0, 2.24, -0.96, BLUE_D, '#ffffff');
  // A binder drawn from a shelf: held by its spine in the hand, then flat along the arm to read.
  const binder = group(g);
  binder.name = 'juBinder';
  part(binder, rbox(0.04, 0.3, 0.23, 0.006), '#7a4a2a', 0, 0, 0, { outline: false });
  part(binder, box(0.034, 0.27, 0.21), PAPER, 0.003, 0, 0, { outline: false });
  label(binder, '대장', 0.12, 0.05, 0, 0.06, 0.117, '#7a4a2a', '#ffffff');
  binder.visible = false;
  const reading = group(g);
  reading.name = 'juBinderOpen';
  part(reading, box(0.34, 0.02, 0.24), '#7a4a2a', 0, -0.012, 0, { outline: false });
  part(reading, box(0.31, 0.008, 0.215), PAPER, 0, 0.002, 0, { outline: false });
  const pageFace = picture(reading, painted('juOldLedger', 200, 140, (c) => {
    c.fillStyle = '#efe6cc';
    c.fillRect(0, 0, 200, 140);
    c.fillStyle = '#b6a780';
    for (let i = 0; i < 9; i++) c.fillRect(10, 14 + i * 13, 180 - (i % 4) * 22, 2);
    c.fillStyle = '#7a4a2a';
    c.fillRect(99, 0, 2, 140);
  }), 0.3, 0.205, 0, 0.0075, 0, '#ffffff', 0, FLAT);
  pageFace.castShadow = false;
  reading.rotation.x = 0.46;
  reading.visible = false;
  const tools: Partial<Record<JuTool, HeldTool>> = {
    binderPull: { tool: binder, lead: 'right', grips: { right: { at: v3(0.022, 0, 0), axis: v3(0, 1, 0), shape: 'pinch', radius: 0.022 } } },
    binder: { tool: reading, lead: 'left', grips: FLAT_LEFT },
  };
  const spots: Record<string, Spot> = { juFindRecord: standAt(g, 'juFindRecord', 0, RS.stand) };
  spots['*'] = spots.juFindRecord;
  out.work = marker(g, 0, RS.wheelY, RS.end + 0.08);
  drive(g, out, spots, tools, (_now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const gap = N ? (n.g ?? 1) : 1;
    carriages.forEach((C, i) => {
      C.c.position.x = carriageX(i, gap);
      C.wheel.rotation.z = (n.spin ?? 0) > 0.5 ? t * 2.4 : 0;
    });
    const b = P.binder ?? null;
    const isRead = N?.tool === 'binder';
    at(binder, isRead ? null : b);
    at(reading, isRead ? b : null);
  });
}

// =============================================================================================
// 재난 구호 물품함 (juReliefCage, 2 × 1).

const KIT_NAMES = ['담요', '비상식량', '응급 세트', '손전등', '위생 키트', '식수'];
function reliefCage(g: THREE.Group, out: Built) {
  const W = 1.92;
  const Dp = 0.62;
  const zb = RC.face - Dp;
  const zc = RC.face - Dp / 2;
  const H = 1.96;
  const STEELC = '#5c7380';
  // The frame and shelves, then a wire mesh front, sides and back.
  for (const x of [-W / 2, W / 2]) for (const z of [zb, RC.face]) part(g, box(0.035, H, 0.035), STEELC, x, H / 2, z);
  for (const y of [0.06, H]) part(g, box(W, 0.035, Dp), STEELC, 0, y, zc);
  RC.shelves.forEach((y) => part(g, box(W - 0.05, 0.02, Dp - 0.04), '#9daab0', 0, y - 0.012, zc));
  const mesh = (w: number, h: number) =>
    painted(`juMesh|${w}|${h}`, 128, 128, (c) => {
      c.clearRect(0, 0, 128, 128);
      c.strokeStyle = STEELC;
      c.lineWidth = 3;
      for (let i = 0; i <= 8; i++) {
        c.beginPath();
        c.moveTo(i * 16, 0);
        c.lineTo(i * 16, 128);
        c.moveTo(0, i * 16);
        c.lineTo(128, i * 16);
        c.stroke();
      }
    });
  const wire = (parent: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, ry = 0) => {
    const tex = mesh(w, h).clone();
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(w * 4, h * 4);
    tex.needsUpdate = true;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    m.userData.ownGeometry = m.userData.ownMaterial = true;
    m.position.set(x, y, z);
    m.rotation.y = ry;
    parent.add(m);
    return m;
  };
  wire(g, W, H - 0.06, 0, H / 2, zb);
  for (const sx of [-1, 1]) wire(g, Dp, H - 0.06, (sx * W) / 2, H / 2, zc, Math.PI / 2);
  wire(g, 1, H - 0.06, 0.46, H / 2, RC.face);
  wire(g, W / 2 - 0.5, H - 0.06, (-W / 2 - 0.5) / 2, H / 2, RC.face);
  // The door: hinged at RC.door, meshed, with the lock's hasp.
  const door = group(g, RC.door, 0, RC.face);
  part(door, box(RC.doorW, 0.03, 0.02), STEELC, RC.doorW / 2, 0.08, 0.006);
  part(door, box(RC.doorW, 0.03, 0.02), STEELC, RC.doorW / 2, 1.9, 0.006);
  part(door, box(0.03, 1.82, 0.02), STEELC, 0.015, 0.99, 0.006);
  part(door, box(0.03, 1.82, 0.02), STEELC, RC.doorW - 0.015, 0.99, 0.006);
  wire(door, RC.doorW - 0.03, 1.8, RC.doorW / 2, 0.99, 0.006);
  part(door, box(0.04, 0.09, 0.024), CHROME, RC.doorW - 0.03, 1.06, 0.022, { outline: false });
  // The padlock, on the frame's hasp when it's locked.
  const lock = group(g, RC.lock[0] - 0.008, RC.lock[1] - 0.02, RC.face + 0.03);
  part(lock, rbox(0.044, 0.04, 0.016, 0.006), '#c49a3c', 0, -0.015, 0, { outline: false });
  part(lock, ring(0.015, 0.003), CHROME, 0, 0.012, 0, { outline: false });
  // What's in it: stacked by kind, each kind labelled.
  const rng = seeded(61);
  const kinds: Array<[string, string, number, number]> = [['#9e8ac0', KIT_NAMES[0], 0.42, 0.28], ['#d7b98a', KIT_NAMES[1], 0.3, 0.24], ['#c9604f', KIT_NAMES[2], 0.26, 0.2], ['#607d8b', KIT_NAMES[3], 0.22, 0.16], ['#76a8a0', KIT_NAMES[4], 0.28, 0.22], ['#6db0d6', KIT_NAMES[5], 0.34, 0.3]];
  RC.shelves.forEach((y, si) => {
    let x = -W / 2 + 0.12;
    let kindAt = (si * 2 + 1) % kinds.length;
    while (x < W / 2 - 0.26) {
      const [col, nm, w, h0] = kinds[kindAt % kinds.length];
      const h = Math.min(h0, si === RC.shelves.length - 1 ? 0.24 : 0.36);
      const zz = zc + (rng() - 0.5) * 0.04;
      // Skip what the door swings round by a bit, not what's behind it.
      part(g, rbox(w - 0.02, h, Dp - 0.2, 0.012), col, x + w / 2, y + h / 2, zz);
      label(g, nm, Math.min(0.18, w - 0.06), 0.05, x + w / 2, y + h * 0.6, zz + (Dp - 0.2) / 2 + 0.003, '#fbfaf5', INK);
      x += w;
      kindAt++;
    }
  });
  // The sign, the list's flap, a torch hanging by the frame.
  part(g, box(0.72, 0.17, 0.018), '#ffd24d', 0.42, 1.78, RC.face + 0.02);
  label(g, '재난 구호 물품', 0.66, 0.11, 0.42, 1.78, RC.face + 0.031, '#ffd24d', '#7a3510');
  part(g, box(0.34, 0.02, 0.2), STEELC, RC.flap[0], RC.flap[1] - 0.01, RC.flap[2] - 0.02);
  rod(g, v3(RC.flap[0] - 0.16, RC.flap[1] - 0.02, RC.flap[2] + 0.08), v3(RC.flap[0] - 0.16, RC.flap[1] - 0.2, RC.face + 0.01), 0.005, STEELC);
  rod(g, v3(RC.flap[0] + 0.16, RC.flap[1] - 0.02, RC.flap[2] + 0.08), v3(RC.flap[0] + 0.16, RC.flap[1] - 0.2, RC.face + 0.01), 0.005, STEELC);
  // A water bottle read for its date; the clipboard and pen.
  const bottle = group(g);
  part(bottle, cyl(0.032, 0.034, 0.17, 14), '#a8d6ee', 0, 0.085, 0, { outline: false });
  part(bottle, cyl(0.014, 0.014, 0.022, 10), '#2a7ec2', 0, 0.18, 0, { outline: false });
  label(bottle, '식수', 0.05, 0.03, 0, 0.09, 0.036, '#ffffff', BLUE_D);
  const board = group(g);
  board.name = 'juClipboard';
  board.rotation.x = 0.46;
  part(board, box(0.23, 0.008, 0.31), '#8a6d3b', 0, 0, 0, { outline: false });
  part(board, box(0.08, 0.018, 0.03), CHROME, 0, 0.008, -0.14, { outline: false });
  const list = liveScreen(board, 0.21, 0.28, 150, 200, 0, 0.0052, 0.01, 0, FLAT);
  const pen = penTool(g, 'juCagePen', '#26587e');
  const tools: Partial<Record<JuTool, HeldTool>> = {
    pen: pen.held,
    board: { tool: board, lead: 'left', grips: FLAT_LEFT },
  };
  const spots: Record<string, Spot> = { juReliefCheck: standAt(g, 'juReliefCheck', 0.06, RC.stand) };
  spots['*'] = spots.juReliefCheck;
  out.work = marker(g, 0, 1.0, RC.face);
  drive(g, out, spots, tools, (_now, N) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    door.rotation.y = -1.3 * clamp01(n.open);
    lock.visible = (n.lockOff ?? 0) < 0.5;
    at(bottle, P.bottle ?? null, RC.bottle);
    at(board, P.board ?? null, RC.flap);
    at(pen.root, P.pen ?? null, [RC.flap[0] + 0.14, RC.flap[1] + 0.015, RC.flap[2]]);
    const ticks = Math.floor(n.ticks ?? 0);
    const hl = Math.floor(n.count ?? 0);
    list.draw(`${ticks}|${hl}`, (c) => {
      c.fillStyle = PAPER;
      c.fillRect(0, 0, 150, 200);
      text(c, '구호 물품 점검표', 75, 16, 12, INK, 'center');
      KIT_NAMES.slice(0, 5).forEach((s, i) => {
        const y = 40 + i * 30;
        if (i === hl && !ticks) {
          c.fillStyle = '#fff0b0';
          c.fillRect(8, y - 12, 134, 24);
        }
        text(c, s, 14, y, 12, INK, 'left', false);
        c.strokeStyle = '#7a8388';
        c.strokeRect(118, y - 8, 16, 16);
        if (i < ticks) text(c, '✓', 126, y, 14, BLUE, 'center');
      });
      text(c, '유통기한 확인', 14, 188, 11, GREY_D, 'left', false);
    });
  });
}

// =============================================================================================
// 회의 준비대 (juMeetingPrep, 2 × 1).

const NAMEPLATES = ['통장', '이장', '주민대표', '담당자'];
function meetingPrep(g: THREE.Group, out: Built) {
  const T = MP.top;
  // A low two-door cabinet in the same oak: agendas, a box of name plates, cups, a small recorder.
  part(g, rbox(1.9, 0.04, 0.56, 0.012), WOOD, 0, T - 0.02, -0.08);
  part(g, box(1.84, T - 0.12, 0.5), WOOD_D, 0, (T - 0.12) / 2 + 0.06, -0.08);
  for (const sx of [-1, 1]) {
    part(g, box(0.88, T - 0.2, 0.012), WOOD, sx * 0.46, (T - 0.12) / 2 + 0.06, 0.175);
    part(g, box(0.1, 0.014, 0.014), CHROME, sx * 0.1, 0.46, 0.186, { outline: false });
  }
  label(g, '주민자치 회의', 0.46, 0.08, 0, 0.66, 0.185, WOOD_D, '#fff6e0');
  const stack = group(g, MP.stack[0], T, MP.stack[2]);
  for (let i = 0; i < 8; i++) part(stack, box(0.21, 0.008, 0.29), i % 3 ? PAPER : '#e7f0f6', 0.006 * Math.sin(i * 2.1), 0.006 + i * 0.009, 0.006 * Math.cos(i * 1.3), { outline: false });
  label(stack, '안건', 0.12, 0.05, 0, 0.0795, 0, PAPER, BLUE_D).rotation.x = FLAT;
  part(g, box(0.26, 0.09, 0.14), '#d7b98a', MP.box[0], T + 0.045, MP.box[2]);
  label(g, '명패', 0.12, 0.04, MP.box[0], T + 0.05, MP.box[2] + 0.072, '#d7b98a', '#4a3417');
  // Paper cups and a thermos on a tray.
  part(g, rbox(0.3, 0.012, 0.2, 0.004), '#a97646', 0.2, T + 0.006, -0.18, { outline: false });
  for (let i = 0; i < 5; i++) part(g, cyl(0.03, 0.024, 0.07, 12), PAPER, 0.11 + (i % 3) * 0.07, T + 0.047, -0.22 + Math.floor(i / 3) * 0.07, { outline: false });
  part(g, cyl(0.04, 0.04, 0.2, 14), '#b56a4a', 0.46, T + 0.1, -0.2);
  part(g, cyl(0.026, 0.03, 0.03, 10), GRAPHITE, 0.46, T + 0.215, -0.2, { outline: false });
  // The recorder; its light goes on when it's tried.
  part(g, rbox(0.12, 0.024, 0.07, 0.008), GRAPHITE, MP.rec[0], T + 0.012, MP.rec[2], { outline: false });
  const recLamp = part(g, ball(0.008), '#5a1f1f', MP.rec[0] + 0.04, T + 0.028, MP.rec[2] - 0.02, { outline: false });
  // The plates that go up along the front.
  const plates = NAMEPLATES.map((s, i) => {
    const P = plateAt(i);
    const m = group(g, P[0], P[1], P[2]);
    part(m, box(0.2, 0.07, 0.008), BLUE_D, 0, 0, 0, { rx: -0.2, outline: false });
    label(m, s, 0.18, 0.06, 0, 0.001, 0.008, BLUE_D, '#ffffff');
    m.visible = false;
    return m;
  });
  const inHand = group(g);
  inHand.name = 'juNamePlate';
  part(inHand, box(0.2, 0.07, 0.008), BLUE_D, 0, 0, 0, { rx: -0.2, outline: false });
  inHand.visible = false;
  const pile = group(g);
  for (let i = 0; i < 3; i++) part(pile, box(0.2, 0.012, 0.07), BLUE_D, 0, i * 0.014, 0, { outline: false });
  pile.visible = false;
  const tools: Partial<Record<JuTool, HeldTool>> = { plate: { tool: inHand, lead: 'right', grips: { right: { at: v3(0.085, -0.02, 0), axis: v3(0, 1, 0), shape: 'pinch', radius: 0.006 } } } };
  const spots: Record<string, Spot> = { juMeetingSet: standAt(g, 'juMeetingSet', -0.42, MP.stand) };
  spots['*'] = spots.juMeetingSet;
  out.work = marker(g, MP.stack[0], T + 0.06, MP.stack[2]);
  drive(g, out, spots, tools, (now, N) => {
    const n = N?.n ?? {};
    const placed = Math.round(n.placed ?? 0);
    plates.forEach((p, i) => (p.visible = now === 'juMeetingSet' && i < placed));
    at(inHand, N?.props.plate ?? null);
    at(pile, N?.props.pile ?? null);
    (recLamp.material as THREE.MeshToonMaterial).color.set((n.rec ?? 0) > 0.5 ? '#ff3b30' : '#5a1f1f');
  });
}

// =============================================================================================
// 번호표 발권기 (juTicket, 1 × 1) and the centre's sign (juSign): set dressing.

function ticketMachine(g: THREE.Group, out: Built) {
  part(g, rbox(0.34, 0.03, 0.3, 0.01), GREY_D, 0, 0.015, 0);
  part(g, cyl(0.03, 0.04, 0.82, 12), CHROME, 0, 0.42, 0, { outline: false });
  part(g, rbox(0.36, 0.42, 0.2, 0.03), CREAM, 0, 1.03, 0);
  part(g, rbox(0.36, 0.1, 0.2, 0.02), BLUE, 0, 1.28, 0);
  label(g, '번호표', 0.26, 0.07, 0, 1.28, 0.104, BLUE, '#ffffff');
  const scr = liveScreen(g, 0.26, 0.09, 200, 70, 0, 1.13, 0.102);
  part(g, cyl(0.03, 0.03, 0.02, 14), '#e53935', 0, 1.0, 0.104, { rx: Math.PI / 2, outline: false });
  part(g, box(0.18, 0.012, 0.012), BLACK, 0, 0.9, 0.104, { outline: false });
  // The slip sticking out.
  part(g, box(0.09, 0.05, 0.002), PAPER, 0, 0.87, 0.11, { outline: false });
  label(g, '받고 앉아 기다려 주세요', 0.32, 0.04, 0, 0.78, 0.045, '#fff4cf', '#6b4a10');
  let seed = -1;
  out.away = (_o, t) => {
    if (seed < 0) seed = seedOf(g);
    const num = wrap(seed + Math.floor(t / 11), 300) + 100;
    scr.draw(`${num}`, (c) => {
      c.fillStyle = '#171a1d';
      c.fillRect(0, 0, 200, 70);
      text(c, `다음 ${num}번`, 100, 36, 30, '#ff7a5a', 'center');
    });
  };
}
function centreSign(g: THREE.Group) {
  part(g, box(0.86, 0.96, 0.05), BLUE_D, 0, 1.32, -0.44);
  part(g, box(0.8, 0.9, 0.012), CREAM, 0, 1.32, -0.414, { outline: false });
  const tex = painted('juSign', 288, 324, (c) => {
    c.fillStyle = CREAM;
    c.fillRect(0, 0, 288, 324);
    c.fillStyle = BLUE;
    c.fillRect(0, 0, 288, 88);
    text(c, DONG, 144, 30, 30, '#ffffff', 'center');
    text(c, '주민센터', 144, 66, 22, BLUE_L, 'center');
    ['1 민원 창구', '2 복지 상담', '3 회의실', '4 기록물 서고'].forEach((s, i) => text(c, s, 24, 118 + i * 38, 18, INK, 'left', false));
    text(c, '천천히 오세요', 144, 296, 18, GREEN, 'center');
  });
  picture(g, tex, 0.76, 0.86, 0, 1.32, -0.405);
  part(g, cyl(0.1, 0.08, 0.2, 12), '#b58a5a', 0.34, 0.1, -0.34);
}

export const BUILDERS: Record<string, Builder> = {
  // The centre's pole sign on the pavement (2026-11-05, the layout audit).
  juFrontSign: pavementSign('juFrontSign', '🏛️', `${DONG}|행정복지센터`, ['민원실 1층 · 작은도서관 2층', '평일 9:00 ~ 18:00', '무인발급기 24시간'], '#234f75'),
  civilCounter(g, _W, _D, _c, _def, _ctx, out) {
    civilCounter(g, out);
  },
  juKiosk(g, _W, _D, _c, _def, _ctx, out) {
    kiosk(g, out);
  },
  juFormStand(g, _W, _D, _c, _def, _ctx, out) {
    formStand(g, out);
  },
  juWelfareBooth(g, _W, _D, _c, _def, _ctx, out) {
    welfareBooth(g, out);
  },
  juNoticeBoard(g, _W, _D, _c, _def, _ctx, out) {
    noticeBoard(g, out);
  },
  juRollStack(g, _W, _D, _c, _def, _ctx, out) {
    rollStack(g, out);
  },
  juReliefCage(g, _W, _D, _c, _def, _ctx, out) {
    reliefCage(g, out);
  },
  juMeetingPrep(g, _W, _D, _c, _def, _ctx, out) {
    meetingPrep(g, out);
  },
  juTicket(g, _W, _D, _c, _def, _ctx, out) {
    ticketMachine(g, out);
  },
  juSign(g) {
    centreSign(g);
  },
};
