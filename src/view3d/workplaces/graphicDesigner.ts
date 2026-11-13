import * as THREE from 'three';
import { deskChair, marker, rod, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, label, painted, picture, ring, seeded, text } from './doctor';
import { CS, CW, DK, MK, PR, SW, TW, VB, dgNow, dgPhase } from './graphicDesignerMotion';
import type { DgMotion, DgNow } from './graphicDesignerMotion';
import { vroidFigure } from './vroidFigure';

/**
 * The 디자인 스튜디오 drawn as itself (2026-11-01 workplace pipeline, at the user's request), the made-up 모아결
 * 스튜디오. Hooded colour monitors with pen tablets, a wide printer whose proofs come out into a basket and hang on a
 * rail, a felt wall of pinned work for critique, type specimens over a drawer of wood type, a shelf of colour fans and
 * paper samples, a cutting table where a printed net is folded into a box, a client screen, a daylight viewing booth.
 *
 * The same invented designs go round everything: what's made on the screen is what comes out of the printer and what
 * is shown on the wall. Everything that moves follows the scripts in graphicDesignerMotion.ts.
 */

const BRAND = '모아결 스튜디오';
const INK = '#23252b';
const PAPER = '#fbfaf5';
const FELT = '#3c4048';
const BIRCH = '#d9c29c';
const BIRCH_D = '#a98d66';
const ACCENT = '#ff5a3c';
const UI = '#2b2d33';
const UI_D = '#1d1e22';
const UP = new THREE.Vector3(0, 1, 0);
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3();
type V = readonly [number, number, number];
type Ctx2 = CanvasRenderingContext2D;

// ---------------------------------------------------------------------------------------------
// The studio's invented work, drawn on 256 × 360.

interface Design {
  title: string;
  sub: string;
  bg: string;
  fg: string;
  accent: string;
  art(c: Ctx2): void;
}
const disc = (c: Ctx2, x: number, y: number, r: number, color: string) => {
  c.fillStyle = color;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
};
const DESIGNS: Design[] = [
  {
    title: '봄꽃 음악회', sub: '4.12 해오름 홀', bg: '#ffd7dc', fg: '#7b1e3b', accent: '#ff6b81',
    art(c) {
      c.globalAlpha = 0.85;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        disc(c, 128 + Math.cos(a) * 50, 150 + Math.sin(a) * 50, 42, i % 2 ? '#ff6b81' : '#ffa8b5');
      }
      c.globalAlpha = 1;
      disc(c, 128, 150, 24, '#ffe066');
    },
  },
  {
    title: '달빛 서점', sub: '밤 열 시까지 엽니다', bg: '#14213d', fg: '#fdf6d8', accent: '#fca311',
    art(c) {
      disc(c, 170, 110, 56, '#fdf0b2');
      disc(c, 150, 96, 50, '#14213d');
      ['#fca311', '#e5e5e5', '#8ecae6', '#fb8500', '#ffb4a2'].forEach((col, i) => {
        c.fillStyle = col;
        c.fillRect(40 + i * 36, 250 - 30 - (i % 3) * 16, 28, 30 + (i % 3) * 16);
      });
    },
  },
  {
    title: '초록 달리기', sub: '시민 10km · 5.3', bg: '#0b6e4f', fg: '#f4ffe9', accent: '#d9ed92',
    art(c) {
      c.lineWidth = 22;
      ['#d9ed92', '#99d98c', '#52b69a'].forEach((col, i) => {
        c.strokeStyle = col;
        c.beginPath();
        c.moveTo(-20, 240 - i * 40);
        c.bezierCurveTo(80, 120 - i * 40, 150, 280 - i * 40, 280, 110 - i * 40);
        c.stroke();
      });
    },
  },
  {
    title: '숲결 차', sub: '첫물 녹차 선물 세트', bg: '#f3ecd8', fg: '#2d4a32', accent: '#7fa650',
    art(c) {
      for (let i = 0; i < 5; i++) {
        c.save();
        c.translate(128, 200);
        c.rotate(-0.9 + i * 0.45);
        c.fillStyle = i % 2 ? '#7fa650' : '#47713f';
        c.beginPath();
        c.ellipse(0, -74, 26, 72, 0, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
    },
  },
  {
    title: '바다 영화제', sub: '9월 물결 극장', bg: '#0077b6', fg: '#ffffff', accent: '#ffd166',
    art(c) {
      disc(c, 128, 120, 58, '#ffd166');
      ['#90e0ef', '#48cae4', '#00b4d8'].forEach((col, i) => {
        c.fillStyle = col;
        c.beginPath();
        c.moveTo(0, 190 + i * 26);
        for (let x = 0; x <= 256; x += 8) c.lineTo(x, 190 + i * 26 + Math.sin(x / 26 + i) * 10);
        c.lineTo(256, 280);
        c.lineTo(0, 280);
        c.fill();
      });
    },
  },
  {
    title: '우리 글자전', sub: '글꼴 백 가지 이야기', bg: '#16161a', fg: '#ffffff', accent: '#ff5a3c',
    art(c) {
      text(c, '가', 104, 150, 170, '#ff5a3c', 'center');
      text(c, '나', 176, 200, 104, '#ffffff', 'center');
    },
  },
];
const designOf = (i: number) => DESIGNS[((i % DESIGNS.length) + DESIGNS.length) % DESIGNS.length];
/** A finished poster filling the canvas at (x, y). `show`: how far down its picture has come. */
function posterOn(c: Ctx2, d: Design, x: number, y: number, w: number, h: number, parts: { art?: number; head?: number } = {}) {
  const artShare = parts.art ?? 1;
  const head = parts.head ?? 1;
  c.save();
  c.translate(x, y);
  c.scale(w / 256, h / 360);
  c.fillStyle = d.bg;
  c.fillRect(0, 0, 256, 360);
  if (artShare > 0) {
    c.save();
    c.beginPath();
    c.rect(0, 0, 256, 280 * artShare);
    c.clip();
    d.art(c);
    c.restore();
  }
  if (head > 0) {
    const n = Math.ceil(d.title.length * head);
    text(c, d.title.slice(0, n), 18, 300, 34, d.fg);
    if (head >= 1) {
      text(c, d.sub, 18, 336, 16, d.fg, 'left', false);
      c.fillStyle = d.accent;
      c.fillRect(204, 322, 34, 22);
    }
  }
  c.restore();
}
const posterTex = (i: number) => {
  const d = designOf(i);
  return painted(`dgPoster${d.title}`, 256, 360, (c) => posterOn(c, d, 0, 0, 256, 360));
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
function at(m: THREE.Object3D, p: V | null | undefined, home?: V) {
  m.visible = !!(p ?? home);
  const q = p ?? home;
  if (q) m.position.set(q[0], q[1], q[2]);
}
function ownLit(g: THREE.Object3D, geom: THREE.BufferGeometry, color: string, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color }));
  m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
const setLit = (m: THREE.Mesh, c: string) => (m.material as THREE.MeshBasicMaterial).color.set(c);
function swapPic(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0): { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; set: (t: THREE.Texture | null) => void } {
  const mat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.userData.ownGeometry = mesh.userData.ownMaterial = true;
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, 0, 'YXZ');
  g.add(mesh);
  return {
    mesh,
    mat,
    set: (t) => {
      if (!t || mat.map === t) return;
      mat.map = t;
      mat.needsUpdate = true;
    },
  };
}
function standAt(g: THREE.Object3D, motion: DgMotion): Spot {
  const s = spot(g, 'stand', 0, 0, 0.6, Math.PI);
  s.motion = motion;
  return s;
}
function seatAt(g: THREE.Object3D, motion: DgMotion): Spot {
  const s = spot(g, 'sit', DK.seat[0], DK.seat[1], DK.seat[2], Math.PI, 0);
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
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, show: (now: string | null, N: DgNow | null, t: number) => void) {
  out.spots = spots;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const N = sp ? dgNow(sp.motion as DgMotion, t, dgPhase(g.getWorldPosition(tmp)), (sp.at.userData.height as number | undefined) ?? 1.6) : null;
    show(now, N, t);
  };
}
/** A canvas repainted only when `key` changes. */
function live(w: number, h: number) {
  let tex: THREE.CanvasTexture | null = null;
  let ctx: Ctx2 | null = null;
  let last = '';
  return (key: string, paint: (c: Ctx2) => void): THREE.Texture | null => {
    if (typeof document === 'undefined') return null;
    if (!tex) {
      const can = document.createElement('canvas');
      can.width = w;
      can.height = h;
      ctx = can.getContext('2d');
      tex = new THREE.CanvasTexture(can);
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    if (key !== last && ctx) {
      last = key;
      paint(ctx);
      tex.needsUpdate = true;
    }
    return tex;
  };
}
const q = (x: number | undefined, steps = 40) => Math.round((x ?? 0) * steps);

function penMesh(g: THREE.Object3D, color = '#26282e'): THREE.Group {
  const p = group(g);
  // The point at the group's origin, the barrel up towards the hand.
  part(p, cyl(0.007, 0.002, 0.15, 8), color, 0.02, 0.07, 0.03, { rz: -0.28, rx: 0.42, outline: false });
  return p;
}
function pencilMesh(g: THREE.Object3D): THREE.Group {
  const p = group(g);
  part(p, cyl(0.005, 0.002, 0.14, 6), '#f4b942', 0.02, 0.065, 0.025, { rz: -0.3, rx: 0.4, outline: false });
  return p;
}
function sheetMesh(g: THREE.Object3D, w: number, d: number, tex: THREE.Texture | null, color = PAPER): THREE.Group {
  const s = group(g);
  part(s, box(w, 0.003, d), color, 0, 0, 0, { outline: false });
  if (tex) picture(s, tex, w * 0.96, d * 0.96, 0, 0.003, 0, '#ffffff', 0, -Math.PI / 2);
  return s;
}
function loupeMesh(g: THREE.Object3D): THREE.Group {
  const l = group(g);
  part(l, cyl(0.024, 0.028, 0.03, 14), BLACK, 0, 0, 0, { rx: Math.PI / 2 });
  part(l, cyl(0.021, 0.021, 0.002, 14), '#cfeaf2', 0, 0, 0.016, { rx: Math.PI / 2, outline: false });
  return l;
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

// ---------------------------------------------------------------------------------------------
// Other people: drawn, played by VRoid bodies when they've come.

interface Look {
  top: string;
  bottom: string;
  hair: string;
  skin: string;
}
const LOOKS: Record<string, Look> = {
  // 채윤아 디렉터, in black with red hair as in the workplace's staff list.
  director: { top: '#212121', bottom: '#2f3136', hair: '#c62828', skin: '#f8d9c0' },
  client: { top: '#546e7a', bottom: '#37474f', hair: '#2b1b10', skin: '#eac09a' },
};
interface Fig {
  root: THREE.Group;
  head: THREE.Group;
  armL(to: THREE.Vector3 | null): void;
  armR(to: THREE.Vector3 | null): void;
}
function person(parent: THREE.Object3D, look: Look, x: number, z: number, ry: number, gender: 'female' | 'male'): Fig {
  const root = group(parent, x, 0, z, ry);
  for (const sx of [-1, 1]) {
    rod(root, v3(sx * 0.085, 0.84, 0), v3(sx * 0.09, 0.08, 0.01), 0.056, look.bottom);
    part(root, rbox(0.09, 0.07, 0.2, 0.03), '#37474f', sx * 0.09, 0.035, 0.04);
  }
  part(root, rbox(0.3, 0.17, 0.2, 0.06), look.bottom, 0, 0.88, 0);
  part(root, rbox(0.34, 0.46, 0.21, 0.08), look.top, 0, 1.11, 0);
  part(root, cyl(0.045, 0.05, 0.08, 10), look.skin, 0, 1.37, 0, { outline: false });
  const head = group(root, 0, 1.51, 0);
  part(head, ball(0.112), look.skin, 0, 0, 0);
  for (const sx of [-1, 1]) part(head, ball(0.012), '#2b2b30', sx * 0.04, 0, 0.104, { outline: false });
  part(head, box(0.03, 0.006, 0.004), '#a1665e', 0, -0.045, 0.104, { outline: false });
  part(head, ball(0.118), look.hair, 0, 0.03, -0.03);
  part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0, 0.075, 0.075, { rx: -0.25 });
  const arm = (sx: number) => {
    const shoulder = v3(sx * 0.2, 1.31, 0);
    const restAt = v3(sx * 0.23, 0.82, 0.05);
    const upper = limb(root, 0.042, look.top);
    const lower = limb(root, 0.035, look.skin);
    const hand = part(root, ball(0.036), look.skin, 0, 0, 0, { outline: false });
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
  const f = vroidFigure({ root, head, armL, armR }, { gender });
  root.visible = false;
  return f;
}
function lazy(make: () => Fig) {
  let f: Fig | null = null;
  return { get: () => (f ??= make()), hide: () => f && (f.root.visible = false) };
}
/** Comes in from the side; `there` 0–1. */
function comes(f: Fig, there: number, x: number, z: number, dx: number, t: number) {
  f.root.visible = there > 0.02;
  if (!f.root.visible) return;
  const off = 1 - there;
  f.root.position.set(x + dx * off, off > 0.01 ? 0.012 * Math.abs(Math.sin(t * 9)) : 0, z);
}

// =============================================================================================
// What the monitor shows.

const SW_W = 512;
const SW_H = 300;
/** The design program's frame: title bar, tool strip and layers; the artboard is left to `board`. */
function appFrame(c: Ctx2, file: string, tool: number, board: (x: number, y: number, w: number, h: number) => void) {
  c.fillStyle = UI;
  c.fillRect(0, 0, SW_W, SW_H);
  c.fillStyle = UI_D;
  c.fillRect(0, 0, SW_W, 22);
  text(c, file, 34, 12, 12, '#d7d9de');
  for (let i = 0; i < 3; i++) disc(c, 9 + i * 8, 11, 3, ['#ff5f56', '#ffbd2e', '#27c93f'][i]);
  for (let i = 0; i < 8; i++) {
    c.fillStyle = i === tool ? ACCENT : '#4b4e56';
    c.fillRect(6, 30 + i * 22, 18, 18);
  }
  c.fillStyle = '#35373e';
  c.fillRect(424, 22, 88, SW_H - 22);
  text(c, '레이어', 432, 34, 11, '#d7d9de');
  for (let i = 0; i < 5; i++) {
    c.fillStyle = i === 1 ? '#50545e' : '#3f424a';
    c.fillRect(430, 46 + i * 22, 76, 18);
  }
  text(c, '색상', 432, 170, 11, '#d7d9de');
  ['#ff5a3c', '#ffd166', '#06d6a0', '#118ab2', '#073b4c', '#f4f1de'].forEach((col, i) => {
    c.fillStyle = col;
    c.fillRect(432 + (i % 3) * 24, 182 + Math.floor(i / 3) * 24, 20, 20);
  });
  c.fillStyle = '#44464e';
  c.fillRect(30, 28, 388, SW_H - 34);
  board(30, 28, 388, SW_H - 34);
}
function cursor(c: Ctx2, x: number, y: number, down: number) {
  c.fillStyle = '#ffffff';
  c.strokeStyle = '#000000';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x + 3, y + 12);
  c.lineTo(x + 6, y + 8);
  c.lineTo(x + 12, y + 7);
  c.closePath();
  c.fill();
  c.stroke();
  if (down > 0.5) disc(c, x, y, 2, ACCENT);
}
function toast(c: Ctx2, s: string, color = '#2e9e6b') {
  c.fillStyle = color;
  c.fillRect(156, 252, 220, 28);
  text(c, s, 266, 266, 13, '#ffffff', 'center');
}
function screenIdle(c: Ctx2, i: number) {
  appFrame(c, `${designOf(i).title}_시안.dgn`, 1, (x, y, w, h) => {
    const pw = (h - 16) * (256 / 360);
    posterOn(c, designOf(i), x + w / 2 - pw / 2, y + 8, pw, h - 16);
  });
}
function screenLayout(c: Ctx2, i: number, n: Record<string, number>, file: string, doneMsg: string) {
  const d = designOf(i);
  appFrame(c, file, 2, (x, y, w, h) => {
    const pw = (h - 16) * (256 / 360);
    const ax = x + w / 2 - pw / 2;
    const ay = y + 8;
    c.fillStyle = '#ffffff';
    c.fillRect(ax, ay, pw, h - 16);
    if ((n.img ?? 0) > 0.05) {
      c.globalAlpha = n.img ?? 0;
      posterOn(c, d, ax, ay, pw, h - 16, { art: n.draw ?? 0, head: n.head ?? 0 });
      c.globalAlpha = 1;
    }
    if ((n.grid ?? 0) > 0 && (n.saved ?? 0) < 0.5) {
      c.strokeStyle = '#26c6da';
      c.lineWidth = 1;
      const cols = Math.ceil(4 * (n.grid ?? 0));
      for (let k = 0; k <= cols; k++) {
        c.beginPath();
        c.moveTo(ax + (pw * k) / 4, ay);
        c.lineTo(ax + (pw * k) / 4, ay + h - 16);
        c.moveTo(ax, ay + ((h - 16) * k) / 4);
        c.lineTo(ax + pw, ay + ((h - 16) * k) / 4);
        c.stroke();
      }
    }
  });
  if ((n.saved ?? 0) > 0.3) toast(c, doneMsg);
}
function screenRetouch(c: Ctx2, n: Record<string, number>) {
  appFrame(c, '숲결차_제품컷_보정.dgn', 4, (x, y, w, h) => {
    const z = 1 + 0.7 * (n.zoom ?? 0);
    const can = (cx: number, clean: number) => {
      c.save();
      c.translate(cx, y + h / 2);
      c.scale(z, z);
      c.fillStyle = '#dfd8c8';
      c.fillRect(-90, -100, 180, 200);
      c.fillStyle = '#2d4a32';
      c.fillRect(-42, -66, 84, 136);
      c.fillStyle = '#3f6647';
      c.fillRect(-42, -66, 20, 136);
      c.fillStyle = '#f3ecd8';
      c.fillRect(-32, -30, 64, 56);
      text(c, '숲결 차', 0, -4, 15, '#2d4a32', 'center');
      c.fillStyle = 'rgba(70,50,30,0.8)';
      const r = seeded(77);
      for (let k = 0; k < 10; k++) {
        const px = -40 + r() * 80;
        const py = -60 + r() * 120;
        const sz = 2 + r() * 2;
        if (k / 10 >= clean) c.fillRect(px, py, sz, sz);
      }
      c.restore();
    };
    c.save();
    c.beginPath();
    c.rect(x, y, w, h);
    c.clip();
    can(x + w / 2, n.healed ?? 0);
    const split = n.split ?? 0;
    if (split > 0) {
      c.beginPath();
      c.rect(x, y, w * split, h);
      c.clip();
      can(x + w / 2, 0);
      c.restore();
      c.save();
      c.fillStyle = '#ffffff';
      c.fillRect(x + w * split - 1, y, 2, h);
      text(c, '전', x + 10, y + 14, 12, '#ffffff');
      text(c, '후', x + w - 22, y + 14, 12, '#ffffff');
    }
    c.restore();
  });
  if ((n.applied ?? 0) > 0.3) toast(c, '보정 저장 완료');
}
function screenRush(c: Ctx2, n: Record<string, number>) {
  appFrame(c, '로고_최종_진짜최종_v7.dgn', 3, (x, y, w, h) => {
    c.fillStyle = '#ffffff';
    c.fillRect(x + 8, y + 8, w - 16, h - 16);
    const s = n.size ?? 1;
    disc(c, x + w / 2, y + h / 2 - 8, 36 * s, ACCENT);
    text(c, '해오름', x + w / 2, y + h / 2 - 8, 22 * s, '#ffffff', 'center');
    c.strokeStyle = '#26c6da';
    c.strokeRect(x + w / 2 - 40 * s, y + h / 2 - 48 * s, 80 * s, 80 * s);
  });
  c.fillStyle = '#c62828';
  c.fillRect(30, 28, 388, 24);
  text(c, (n.said ?? 0) > 0.5 ? '"로고를 더 크게, 그런데 작게요"' : '오늘 안에 수정 요청', 224, 40, 13, '#ffffff', 'center');
  const bar = n.bar ?? 0;
  if (bar > 0 && (n.sent ?? 0) < 0.5) {
    c.fillStyle = '#111';
    c.fillRect(120, 250, 220, 18);
    c.fillStyle = '#4caf50';
    c.fillRect(122, 252, 216 * bar, 14);
    text(c, '내보내는 중', 230, 240, 12, '#ffffff', 'center');
  }
  if ((n.sent ?? 0) > 0.3) toast(c, '보냈어요! 통과를 기다리는 중');
}
const SHORTCUTS: Array<[string, string]> = [['V', '선택'], ['P', '펜'], ['T', '글자'], ['G', '그레이디언트'], ['Z', '확대'], ['M', '사각형']];
function screenKeys(c: Ctx2, n: Record<string, number>) {
  appFrame(c, '단축키_연습.dgn', 0, (x, y, w) => {
    const done = n.drills ?? 0;
    SHORTCUTS.forEach(([k, lab], i) => {
      const ky = y + 16 + i * 38;
      c.fillStyle = i < done ? '#2e9e6b' : i === done ? ACCENT : '#5a5d66';
      c.fillRect(x + 40, ky, 34, 30);
      text(c, k, x + 57, ky + 15, 18, '#ffffff', 'center');
      text(c, lab, x + 90, ky + 15, 16, '#ffffff');
      text(c, i < done ? '완료' : i === done ? '누르세요' : '', x + w - 50, ky + 15, 13, i < done ? '#a5d6a7' : '#ffd166', 'right');
    });
  });
}
function screenFlow(c: Ctx2, n: Record<string, number>) {
  appFrame(c, '바른걸음_앱_사용자흐름.dgn', 5, (x, y, w, h) => {
    c.fillStyle = '#f7f7f4';
    c.fillRect(x + 6, y + 6, w - 12, h - 12);
    const nodes: Array<[number, number, string]> = [[0.14, 0.5, '첫 화면'], [0.38, 0.5, '가입'], [0.62, 0.5, '코스 고르기'], [0.86, 0.26, '결제'], [0.86, 0.74, '둘러보기']];
    const links = [[0, 1], [1, 2], [2, 3], [2, 4]];
    const N = n.nodes ?? 0;
    c.strokeStyle = INK;
    c.lineWidth = 2;
    links.forEach(([a, b]) => {
      if (N < b - 0.2) return;
      c.beginPath();
      c.moveTo(x + nodes[a][0] * w, y + nodes[a][1] * h);
      c.lineTo(x + nodes[b][0] * w, y + nodes[b][1] * h);
      c.stroke();
    });
    nodes.forEach(([nx, ny, s], i) => {
      if (N < i) return;
      c.fillStyle = i >= 3 ? '#ffd166' : '#8ecae6';
      c.fillRect(x + nx * w - 40, y + ny * h - 16, 80, 32);
      text(c, s, x + nx * w, y + ny * h, 12, INK, 'center');
    });
  });
}

// =============================================================================================
// 디자인 PC (designDesk, 1 × 1): a birch top on steel legs, the hooded monitor, the tablet, a chair on the front tile.

function designDesk(g: THREE.Group, out: Built) {
  const T = DK.top;
  part(g, rbox(0.96, 0.035, 0.9, 0.012), BIRCH, 0, T - 0.018, -0.03);
  for (const sx of [-1, 1]) {
    part(g, box(0.04, T - 0.04, 0.72), STEEL, sx * 0.44, (T - 0.04) / 2, -0.03);
    part(g, box(0.08, 0.02, 0.76), STEEL, sx * 0.44, 0.01, -0.03);
  }
  part(g, box(0.86, 0.3, 0.02), BIRCH_D, 0, T - 0.2, -0.44);
  // A drawer of proofs on the left under the top, a tower on the right.
  part(g, rbox(0.3, 0.2, 0.42, 0.01), '#e8e4da', -0.26, T - 0.14, -0.2);
  part(g, rbox(0.2, 0.42, 0.4, 0.015), '#3a3c42', 0.28, 0.23, -0.18);
  const towerLed = ownLit(g, ball(0.008), '#2f8f5a', 0.28, 0.36, 0.023);
  towerLed.visible = true;
  // The monitor with its light hood, on a stand; a calibration puck hanging over its face when not in use.
  const mon = group(g, 0, 1.1, -0.24);
  part(mon, rbox(0.78, 0.48, 0.05, 0.012), BLACK, 0, 0, 0);
  part(mon, box(0.82, 0.012, 0.22), '#1f2024', 0, 0.26, 0.09);
  for (const sx of [-1, 1]) part(mon, box(0.012, 0.5, 0.22), '#1f2024', sx * 0.41, 0, 0.09);
  part(g, box(0.06, 0.24, 0.05), STEEL, 0, T + 0.1, -0.29);
  part(g, rbox(0.3, 0.018, 0.2, 0.006), STEEL, 0, T + 0.01, -0.27);
  const screen = swapPic(mon, 0.74, 0.434, 0, 0, 0.027);
  // The pen tablet, its express keys; the keyboard; a mug; the phone; a colour strip.
  part(g, rbox(0.34, 0.016, 0.22, 0.006), '#26282e', DK.tablet[0], T + 0.008, DK.tablet[2]);
  part(g, box(0.27, 0.001, 0.16), '#3a3d46', DK.tablet[0], T + 0.0165, DK.tablet[2], { outline: false });
  for (let i = 0; i < 4; i++) part(g, box(0.022, 0.003, 0.03), '#6d7078', DK.tablet[0] - 0.15, T + 0.017, DK.tablet[2] - 0.07 + i * 0.045, { outline: false });
  part(g, rbox(0.3, 0.018, 0.11, 0.006), '#e8e8e8', DK.keys[0], T + 0.012, DK.keys[2]);
  part(g, box(0.27, 0.002, 0.09), '#c9cacf', DK.keys[0], T + 0.022, DK.keys[2], { outline: false });
  part(g, cyl(0.035, 0.03, 0.08, 12), ACCENT, 0.4, T + 0.04, -0.1);
  part(g, cyl(0.03, 0.03, 0.002, 12), '#4a2c1a', 0.4, T + 0.078, -0.1, { outline: false });
  picture(g, painted('dgStrip', 128, 16, (c) => {
    ['#00aeef', '#ec008c', '#fff200', '#111111', '#f7941d', '#00a651', '#92278f', '#ed1c24'].forEach((col, i) => {
      c.fillStyle = col;
      c.fillRect(i * 16, 0, 16, 16);
    });
  }), 0.24, 0.03, 0.0, T + 0.002, 0.33, '#ffffff', 0, -Math.PI / 2);
  // A pinned thumbnail on the hood's side, sticky notes on the frame.
  const noteA = part(g, box(0.05, 0.05, 0.002), '#ffe066', -0.36, 0.92, -0.2, { outline: false });
  noteA.rotation.z = 0.06;
  // The chair.
  deskChair(g, DK.seat[2] - 0.2);
  // What moves.
  const pen = penMesh(g);
  const phone = group(g);
  part(phone, rbox(0.07, 0.012, 0.14, 0.006), '#111', 0, 0.006, 0);
  const phoneLit = ownLit(phone, box(0.06, 0.001, 0.125), '#223', 0, 0.013, 0);
  const card = sheetMesh(g, 0.16, 0.11, painted('dgCard', 160, 110, (c) => {
    c.fillStyle = '#fff8d6';
    c.fillRect(0, 0, 160, 110);
    text(c, '단축키', 80, 14, 15, ACCENT, 'center');
    SHORTCUTS.forEach(([k, lab], i) => text(c, `${k} ${lab}`, 10 + (i % 2) * 70, 38 + Math.floor(i / 2) * 26, 13, INK));
  }));
  const pad = sheetMesh(g, 0.26, 0.18, null);
  pad.position.set(DK.pad[0], DK.pad[1], DK.pad[2]); // Laid over the tablet while sketching.
  const thumbs = [0, 1, 2].map((i) => {
    const th = sheetMesh(pad, 0.07, 0.11, painted(`dgThumb${i}`, 70, 110, (c) => {
      c.fillStyle = '#fff';
      c.fillRect(0, 0, 70, 110);
      c.strokeStyle = '#555';
      c.lineWidth = 2;
      c.strokeRect(3, 3, 64, 104);
      if (i === 0) {
        c.beginPath();
        c.arc(35, 42, 22, 0, Math.PI * 2);
        c.stroke();
      } else if (i === 1) {
        c.strokeRect(14, 18, 42, 42);
      } else {
        c.beginPath();
        c.moveTo(8, 60);
        c.bezierCurveTo(24, 20, 44, 80, 62, 30);
        c.stroke();
      }
      for (let k = 0; k < 2; k++) c.fillRect(10, 76 + k * 12, 50 - k * 16, 3);
    }));
    th.position.set(-0.085 + i * 0.085, 0.003, -0.01);
    return th;
  });
  const pickRing = part(pad, ring(0.05, 0.003), '#e53935', 0, 0.006, -0.01, { rx: Math.PI / 2, outline: false });
  const pencil = pencilMesh(g);
  const sheet = sheetMesh(g, 0.15, 0.2, painted('dgBriefSheet', 150, 200, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 150, 200);
    text(c, '디자인 의뢰서', 75, 18, 15, INK, 'center');
    ['해오름 문화재단', '행사 포스터 A2', '봄, 밝게, 따뜻하게', '마감: 금요일'].forEach((s, i) => text(c, s, 10, 50 + i * 28, 13, '#44464e'));
  }));
  const liveS = live(SW_W, SW_H);
  const spots: Record<string, Spot> = {
    designLayout: seatAt(g, 'dgLayout'),
    retouchImage: seatAt(g, 'dgRetouch'),
    rushRevision: seatAt(g, 'dgRush'),
    graphicDesigner_learnTools: seatAt(g, 'dgKeys'),
    graphicDesigner_userFlow: seatAt(g, 'dgFlow'),
    graphicDesigner_ownBrief: seatAt(g, 'dgBrief'),
  };
  spots['*'] = spots.designLayout;
  // Each desk idles on a design of its own.
  let idleI = -1;
  drive(g, out, spots, (now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const round = N?.b.n ?? 0;
    const cx = 30 + (n.cx ?? 0.5) * 388;
    const cy = 28 + (n.cy ?? 0.5) * 266;
    const k = `${now}|${round}|${Object.entries(n).map(([a, b]) => `${a}${q(b)}`).join()}`;
    let tex: THREE.Texture | null;
    if (!now) {
      if (idleI < 0) idleI = Math.floor(Math.abs(g.getWorldPosition(tmp).x) / 3);
      tex = liveS(`idle${idleI}`, (c) => screenIdle(c, idleI));
    } else
      tex = liveS(k, (c) => {
        if (now === 'retouchImage') screenRetouch(c, n);
        else if (now === 'rushRevision') screenRush(c, n);
        else if (now === 'graphicDesigner_learnTools') screenKeys(c, n);
        else if (now === 'graphicDesigner_userFlow') screenFlow(c, n);
        else if (now === 'graphicDesigner_ownBrief') screenLayout(c, round, { grid: 1, img: 1, draw: n.made ?? 0, head: n.made ?? 0, saved: 0 }, `${designOf(round).title}_의뢰.dgn`, '');
        else screenLayout(c, round, n, `${designOf(round).title}_시안.dgn`, '시안 저장 완료');
        cursor(c, cx, cy, n.down ?? 0);
      });
    screen.set(tex);
    at(pen, P.pen, [DK.tablet[0] + 0.19, T + 0.018, DK.tablet[2] - 0.08]);
    const brief = now === 'graphicDesigner_ownBrief';
    at(phone, P.phone, DK.phone);
    setLit(phoneLit, now === 'rushRevision' ? '#7fc4ff' : '#223');
    at(card, P.card, DK.card);
    pad.visible = brief;
    thumbs.forEach((th, i) => (th.visible = (n.thumbs ?? 0) > i + 0.2));
    pickRing.visible = (n.picked ?? 0) > 0.2;
    at(pencil, brief ? P.pencil : null);
    at(sheet, brief ? P.sheet : null, DK.sheet);
    if (!brief) sheet.visible = false;
  });
  out.seat = marker(g, DK.seat[0], DK.seat[1], DK.seat[2]);
  out.work = marker(g, DK.tablet[0], T + 0.03, DK.tablet[2]);
}

// =============================================================================================
// 대형 프린터 (largePrinter, 2 × 1): a wide printer on its stand, a roll behind, a basket before, a rail of proofs over.

function largePrinter(g: THREE.Group, out: Built) {
  // The stand, on casters; the catch basket of cloth on two rods.
  for (const sx of [-1, 1]) {
    part(g, box(0.05, 0.92, 0.05), '#44474e', sx * 0.8, 0.5, -0.02);
    part(g, rbox(0.08, 0.04, 0.54, 0.012), '#44474e', sx * 0.8, 0.07, -0.02);
    for (const sz of [-1, 1]) part(g, ball(0.03), BLACK, sx * 0.8, 0.03, -0.02 + sz * 0.24, { outline: false });
  }
  part(g, box(1.6, 0.03, 0.03), '#44474e', 0, 0.28, -0.02);
  rod(g, v3(-0.78, 0.5, 0.34), v3(0.78, 0.5, 0.34), 0.012, STEEL);
  rod(g, v3(-0.78, 0.5, 0.34), v3(-0.78, 0.8, 0.02), 0.012, STEEL);
  rod(g, v3(0.78, 0.5, 0.34), v3(0.78, 0.8, 0.02), 0.012, STEEL);
  const cloth = part(g, box(1.5, 0.008, 0.46), '#d8d5cc', 0, 0.42, 0.14, { rx: -0.1, outline: false });
  cloth.scale.y = 1;
  // The body: dark, a long window on the carriage's track, a slot along the front.
  part(g, rbox(1.84, 0.28, 0.4, 0.03), '#2f3237', 0, 1.1, 0);
  part(g, box(1.84, 0.015, 0.41), ACCENT, 0, 0.98, 0, { outline: false });
  part(g, box(1.36, 0.1, 0.012), '#16181c', -0.14, 1.14, 0.2, { outline: false });
  part(g, box(1.3, 0.012, 0.02), STEEL, -0.14, 1.15, 0.192, { outline: false });
  const carriage = part(g, rbox(0.12, 0.08, 0.04, 0.008), '#d3d6da', 0, 1.14, 0.2, { outline: false });
  label(g, 'MOA 2400', 0.22, 0.04, -0.68, 1.21, 0.204, '#2f3237', '#c8ccd2');
  // The panel; its lamp; the ink tanks along its side.
  part(g, rbox(0.2, 0.12, 0.02, 0.006), '#1b1c20', PR.panel[0], PR.panel[1], 0.205);
  const panel = swapPic(g, 0.17, 0.09, PR.panel[0], PR.panel[1], 0.217);
  const liveP = live(170, 90);
  const inks = group(g, -0.7, 0.72, 0.03);
  part(inks, rbox(0.34, 0.14, 0.16, 0.012), '#44474e', 0, 0, 0);
  ['#00aeef', '#ec008c', '#fff200', '#111111'].forEach((col, i) => part(inks, box(0.06, 0.09, 0.006), col, -0.12 + i * 0.08, 0, 0.082, { outline: false }));
  // The roll behind on its spindle.
  part(g, cyl(0.075, 0.075, 1.6, 16), '#f6f4ee', 0, 1.12, -0.28, { rz: Math.PI / 2 });
  part(g, cyl(0.02, 0.02, 1.76, 8), STEEL, 0, 1.12, -0.28, { rz: Math.PI / 2, outline: false });
  // The rail of proofs: two posts at the back, the sheets clipped on.
  for (const sx of [-1, 1]) part(g, box(0.03, 1.94, 0.03), STEEL, sx * 0.88, 0.97, -0.26);
  part(g, box(1.78, 0.025, 0.025), CHROME, 0, 1.92, -0.26);
  const hungAt = (x: number, tex: THREE.Texture) => {
    const pic = swapPic(g, 0.5, 0.7, x, PR.rail[1] - 0.35, PR.rail[2]);
    pic.set(tex);
    part(g, box(0.05, 0.03, 0.02), BLACK, x - 0.14, PR.rail[1] + 0.005, PR.rail[2] + 0.01, { outline: false });
    part(g, box(0.05, 0.03, 0.02), BLACK, x + 0.14, PR.rail[1] + 0.005, PR.rail[2] + 0.01, { outline: false });
    return pic;
  };
  hungAt(-0.56, posterTex(1));
  const hung = hungAt(PR.rail[0], posterTex(4));
  // The sheet coming out: the top of the design first, more and more of it.
  const arts = DESIGNS.map((_, i) => {
    const t = posterTex(i).clone();
    t.needsUpdate = true;
    return t;
  });
  const sheet = swapPic(g, 0.5, 0.7, 0, 0, 0.212);
  sheet.mesh.visible = false;
  const slider = part(g, rbox(0.05, 0.03, 0.03, 0.008), ACCENT, 0, 0, 0, { outline: false });
  const proof = swapPic(g, 0.5, 0.7, 0, 0, 0);
  proof.mesh.visible = false;
  const loupe = loupeMesh(g);
  loupe.visible = false;
  const spots: Record<string, Spot> = { printProofs: standAt(g, 'dgPrint') };
  spots['*'] = spots.printProofs;
  drive(g, out, spots, (_now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const round = N?.b.n ?? 0;
    const o = n.out ?? 0;
    carriage.position.x = -0.14 + ((n.printing ?? 0) > 0.5 ? Math.sin(t * 5) * 0.58 : -0.58);
    panel.set(liveP(`${q(o, 20)}|${N ? 1 : 0}|${n.printing ?? 0}`, (c) => {
      c.fillStyle = N ? '#0d3b5c' : '#16232e';
      c.fillRect(0, 0, 170, 90);
      text(c, N ? ((n.printing ?? 0) > 0.5 ? '인쇄 중' : o >= 1 ? '완료' : '작업 받기') : '대기', 85, 26, 18, '#ffffff', 'center');
      c.fillStyle = '#33556f';
      c.fillRect(14, 54, 142, 16);
      c.fillStyle = '#7fe0a0';
      c.fillRect(14, 54, 142 * o, 16);
    }));
    const showSheet = !!N && o > 0.01 && (n.cut ?? 0) < 0.98 && !P.proof;
    sheet.mesh.visible = showSheet;
    if (showSheet) {
      const art = arts[((round % arts.length) + arts.length) % arts.length];
      art.repeat.set(1, o);
      art.offset.set(0, 1 - o);
      sheet.set(art);
      sheet.mesh.scale.y = o;
      sheet.mesh.position.y = 0.98 - (0.7 * o) / 2;
    }
    at(slider, P.slider, [-0.66, 1.0, 0.22]);
    proof.mesh.visible = !!P.proof;
    if (P.proof) {
      proof.mesh.position.set(P.proof[0], P.proof[1], P.proof[2]);
      proof.set(posterTex(round));
    }
    at(loupe, P.loupe ?? null);
    hung.set(posterTex((n.hung ?? 0) > 0.5 ? round : (N ? round - 1 : 4)));
  });
  out.work = marker(g, 0, 0.98, 0.22);
}

// =============================================================================================
// 크리틱 벽 (dgCritWall, 3 × 1): dark felt on the wall, pinned posters, track lights and a bin of rolls.

function critWall(g: THREE.Group, out: Built) {
  const Z = CW.slot[2];
  part(g, box(2.9, 1.76, 0.2), FELT, 0, 1.3, Z - 0.11);
  part(g, box(2.94, 0.03, 0.07), BIRCH_D, 0, 0.41, Z - 0.03);
  part(g, box(2.94, 0.03, 0.07), BIRCH_D, 0, 2.19, Z - 0.03);
  label(g, '금요 크리틱', 0.54, 0.09, -1.14, 2.07, Z, FELT, '#f4f1ea');
  // Pinned work on either side of the bare place, a few sticky remarks on it.
  const pin = (x: number, y: number) => part(g, ball(0.012), ACCENT, x, y, Z + 0.012, { outline: false });
  [[-1.16, 1.22, 0], [-0.62, 1.32, 2], [0.62, 1.3, 3], [1.16, 1.22, 5]].forEach(([x, y, i], k) => {
    picture(g, posterTex(i), 0.46, 0.65, x, y, Z, '#ffffff', 0, 0);
    pin(x - 0.2, y + 0.3);
    pin(x + 0.2, y + 0.3);
    part(g, box(0.09, 0.09, 0.002), ['#ffe066', '#ffadad', '#a0e7a0', '#ffe066'][k], x + 0.14, y - 0.22, Z + 0.006, { outline: false });
  });
  // The track and its lamps, lit.
  part(g, box(2.6, 0.03, 0.05), '#1d1e22', 0, 2.3, Z + 0.1);
  for (const x of [-0.9, 0, 0.9]) {
    part(g, cyl(0.04, 0.055, 0.1, 10), '#1d1e22', x, 2.24, Z + 0.14, { rx: 0.5 });
    ownLit(g, cyl(0.045, 0.045, 0.004, 12), '#fff3c4', x, 2.2, Z + 0.17);
  }
  // A low ledge with markers and a tin of pins.
  part(g, box(2.2, 0.025, 0.1), BIRCH, 0, 0.62, Z + 0.04);
  part(g, cyl(0.03, 0.03, 0.05, 10), STEEL, -0.8, 0.66, Z + 0.05);
  for (let i = 0; i < 3; i++) part(g, cyl(0.008, 0.008, 0.12, 6), ['#e53935', '#1e88e5', '#212121'][i], -0.5 + i * 0.05, 0.65, Z + 0.05, { rz: Math.PI / 2, outline: false });
  // The bin of rolled sheets.
  part(g, cyl(0.15, 0.13, 0.52, 14), '#7d8088', CW.bin[0], 0.26, CW.bin[2]);
  const r = seeded(9);
  for (let i = 0; i < 5; i++) part(g, cyl(0.032, 0.032, 0.8, 10), ['#fbfaf5', '#ffd7dc', '#d0efff'][i % 3], CW.bin[0] - 0.08 + r() * 0.15, 0.48, CW.bin[2] - 0.08 + r() * 0.15, { rz: 0.06 - r() * 0.12 });
  // What moves: the roll, the poster going up, its pins, the note.
  const roll = part(g, cyl(0.032, 0.032, 0.62, 10), '#fbfaf5', 0, 0, 0, { rz: Math.PI / 2 });
  const rollV = part(g, cyl(0.032, 0.032, 0.62, 10), '#fbfaf5', 0, 0, 0, { rz: Math.PI / 2 });
  const poster = swapPic(g, CW.w, CW.h, CW.slot[0], CW.slot[1], Z + 0.004);
  const pins = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sy]) => part(g, ball(0.012), ACCENT, sx * (CW.w / 2 - 0.02), CW.slot[1] + sy * (CW.h / 2 - 0.02), Z + 0.016, { outline: false }));
  const redRing = part(g, ring(0.13, 0.006), '#e53935', 0.02, 1.38, Z + 0.012, { outline: false });
  const stuck = part(g, box(0.11, 0.11, 0.003), '#ffe066', 0.2, 1.46, Z + 0.012, { outline: false });
  const noteTex = painted('dgNote', 88, 88, (c) => {
    c.fillStyle = '#ffe066';
    c.fillRect(0, 0, 88, 88);
    text(c, '제목', 44, 26, 18, '#c62828', 'center');
    text(c, '더 크게!', 44, 58, 16, '#c62828', 'center');
  });
  picture(stuck, noteTex, 0.1, 0.1, 0, 0, 0.003);
  const noteHand = part(g, box(0.11, 0.11, 0.003), '#ffe066', 0, 0, 0, { outline: false });
  const pad = sheetMesh(g, 0.14, 0.2, null, '#fff8d6');
  const penI = penMesh(g, '#c62828');
  const director = lazy(() => person(g, LOOKS.director, CW.boss[0], CW.boss[1], Math.PI - 0.45, 'female'));
  const spots: Record<string, Spot> = { dgPinUp: standAt(g, 'dgCrit') };
  spots['*'] = spots.dgPinUp;
  const pointAt = v3(0, 0, 0);
  drive(g, out, spots, (_now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const round = N?.b.n ?? 3;
    at(roll, P.roll ?? null);
    at(rollV, P.rollX ?? null);
    const s = N ? n.sheet ?? 0 : 1;
    poster.mesh.visible = s > 0.02;
    poster.set(posterTex(N ? round : 0));
    poster.mesh.scale.y = Math.max(0.02, s);
    poster.mesh.position.y = CW.slot[1] + (CW.h * (1 - s)) / 2;
    const pc = N ? n.pins ?? 0 : 4;
    pins.forEach((p, i) => (p.visible = pc > i + 0.45));
    redRing.visible = !!N && (n.ring ?? 0) > 0.1;
    redRing.scale.setScalar(0.5 + 0.5 * (n.ring ?? 0));
    stuck.visible = !!N && (n.sticky ?? 0) > 0.5;
    at(noteHand, P.note ?? null);
    at(pad, P.pad ?? null);
    pad.rotation.x = 0.9;
    at(penI, P.pen ?? null);
    const there = N ? n.boss ?? 0 : 0;
    if (there > 0.02) {
      const f = director.get();
      comes(f, there, CW.boss[0], CW.boss[1], 1.1, t);
      const talking = (n.talking ?? 0) > 0.5;
      f.armR(talking ? pointAt.set(0.02 + 0.05 * Math.sin(t * 2.4), 1.38 + 0.03 * Math.sin(t * 3.2), Z + 0.05) : null);
      f.armL(null);
      f.head.rotation.x = 0.05 * Math.sin(t * 1.7);
    } else director.hide();
  });
  out.work = marker(g, 0, CW.slot[1], Z + 0.05);
}

// =============================================================================================
// 글꼴 견본 벽 (dgTypeWall, 2 × 1): four specimen boards over a cabinet of wood type drawers.

const FACES: Array<{ name: string; css: string; big: string; bg: string; fg: string; note: string }> = [
  { name: '봄날고딕', css: 'bold {s}px "Malgun Gothic",sans-serif', big: '가', bg: '#f4f1ea', fg: '#23252b', note: '본문 · 제목 어디든' },
  { name: '새벽명조', css: '{s}px "Batang","Gungsuh",serif', big: '나', bg: '#23252b', fg: '#f4f1ea', note: '책과 차분한 글' },
  { name: '둥근바람', css: 'bold {s}px "Malgun Gothic",sans-serif', big: '다', bg: '#ffd166', fg: '#6a3b00', note: '어린이 · 축제' },
  { name: '굵은먹체', css: '900 {s}px "Gungsuh","Batang",serif', big: '라', bg: '#ff5a3c', fg: '#ffffff', note: '포스터 큰 글자' },
];
const faceTex = (i: number) => {
  const f = FACES[i];
  return painted(`dgFace${i}`, 220, 500, (c) => {
    c.fillStyle = f.bg;
    c.fillRect(0, 0, 220, 500);
    c.fillStyle = f.fg;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = f.css.replace('{s}', '170');
    c.fillText(f.big, 110, 120);
    c.font = f.css.replace('{s}', '30');
    c.fillText(f.name, 110, 240);
    c.font = f.css.replace('{s}', '18');
    c.fillText('다람쥐 헌 쳇바퀴에', 110, 290);
    c.fillText('타고파 ABC 123', 110, 318);
    c.font = f.css.replace('{s}', '32');
    c.fillText('한글 글자', 110, 372);
    c.font = '13px "Malgun Gothic",sans-serif';
    c.fillText(f.note, 110, 440);
    c.fillText('Rg · Md · Bd · Bk', 110, 466);
  });
};
function typeWall(g: THREE.Group, out: Built) {
  const Z = TW.z;
  // The cabinet of shallow drawers, with brass pulls.
  part(g, rbox(1.94, 0.86, 0.44, 0.012), BIRCH_D, 0, 0.43, -0.08);
  part(g, box(1.98, 0.03, 0.5), BIRCH, 0, 0.875, -0.08);
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 4; x++) {
      if (y === 4 && x === 2) continue;
      part(g, box(0.44, 0.13, 0.012), BIRCH, -0.72 + x * 0.48, 0.13 + y * 0.16, 0.145, { outline: false });
      part(g, box(0.09, 0.016, 0.02), '#b08d3f', -0.72 + x * 0.48, 0.13 + y * 0.16, 0.156, { outline: false });
    }
  // The drawer that comes out, its blocks of type.
  const drawer = group(g, TW.drawer[0], TW.drawer[1] - 0.09, TW.drawer[2]);
  part(drawer, box(0.44, 0.13, 0.012), BIRCH, 0, 0, 0.23, { outline: false });
  part(drawer, box(0.09, 0.016, 0.02), '#b08d3f', 0, 0, 0.241, { outline: false });
  part(drawer, box(0.44, 0.012, 0.44), BIRCH_D, 0, -0.05, 0.01);
  for (let i = 0; i < 18; i++) {
    const col = i % 6;
    const row = Math.floor(i / 6);
    part(drawer, box(0.05, 0.04, 0.05), i === 7 ? ACCENT : '#7c5a36', -0.16 + col * 0.064, -0.024, -0.1 + row * 0.1, { outline: false });
  }
  // The boards, framed, each with a lamp strip that lights when it's picked.
  part(g, box(1.98, 1.2, 0.04), '#e9e5db', 0, TW.y, Z - 0.03);
  const lits = TW.boards.map((x, i) => {
    picture(g, faceTex(i), 0.44, 1.0, x, TW.y, Z);
    return ownLit(g, box(0.46, 0.014, 0.012), '#55524a', x, TW.y - 0.52, Z + 0.003);
  });
  label(g, '글꼴 견본', 0.5, 0.08, 0, TW.y + 0.56, Z + 0.002, '#e9e5db', INK);
  // What moves: a block in hand, a title strip, a tag.
  const block = group(g);
  part(block, box(0.05, 0.05, 0.05), '#7c5a36', 0, 0, 0);
  picture(block, painted('dgBlock', 48, 48, (c) => {
    c.fillStyle = '#31241a';
    c.fillRect(0, 0, 48, 48);
    text(c, '결', 24, 25, 38, '#d8c6a8', 'center');
  }), 0.044, 0.044, 0, 0, 0.026);
  const strip = group(g);
  part(strip, box(0.44, 0.1, 0.002), PAPER, 0, 0, 0, { outline: false });
  const stripTex = (i: number) => painted(`dgStripT${i}`, 440, 100, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 440, 100);
    c.fillStyle = INK;
    c.font = FACES[i].css.replace('{s}', '52');
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(designOf(i).title, 220, 52, 420);
  });
  const stripPic = swapPic(strip, 0.42, 0.095, 0, 0, 0.002);
  const tagOn = part(g, box(0.1, 0.05, 0.002), '#e53935', TW.boards[2] + 0.14, TW.y + 0.38, Z + 0.006, { outline: false });
  const tagHand = part(g, box(0.1, 0.05, 0.002), '#e53935', 0, 0, 0, { outline: false });
  const spots: Record<string, Spot> = { dgStudyType: standAt(g, 'dgType') };
  spots['*'] = spots.dgStudyType;
  drive(g, out, spots, (_now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const round = N?.b.n ?? 0;
    drawer.position.z = TW.drawer[2] + 0.28 * (n.open ?? 0);
    const lit = N ? n.lit ?? 0 : -1;
    lits.forEach((m, i) => setLit(m, i === lit ? '#ffe9a8' : '#55524a'));
    at(block, P.block ?? null);
    at(strip, P.strip ?? null);
    stripPic.set(stripTex(((round % 4) + 4) % 4));
    tagOn.visible = !!N && (n.chosen ?? 0) > 0.5;
    at(tagHand, P.tag ?? null);
  });
  out.work = marker(g, 0, TW.y, Z + 0.05);
}

// =============================================================================================
// 색 견본·종이 선반 (dgSwatchShelf, 2 × 1): chips on rails up top, fans and books mid-way, paper boxes low down.

function swatchShelf(g: THREE.Group, out: Built) {
  const Hh = 1.96;
  for (const sx of [-1, 1]) part(g, box(0.04, Hh, 0.44), BIRCH_D, sx * 0.95, Hh / 2, -0.12);
  part(g, box(1.94, Hh, 0.02), '#e9e5db', 0, Hh / 2, -0.33);
  for (const y of [0.06, 0.5, 1.06, 1.94]) part(g, box(1.9, 0.03, 0.44), BIRCH, 0, y, -0.12);
  // Top: a board of hundreds of colour chips, numbered.
  picture(g, painted('dgChips', 512, 200, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 512, 200);
    for (let x = 0; x < 26; x++)
      for (let y = 0; y < 8; y++) {
        c.fillStyle = `hsl(${(x / 26) * 360},${82 - y * 3}%,${22 + y * 8.5}%)`;
        c.fillRect(6 + x * 19.4, 6 + y * 23.6, 17, 21);
      }
  }), 1.82, 0.72, 0, 1.5, -0.3);
  label(g, '모아결 색상표', 0.44, 0.06, 0.66, 1.87, -0.298, '#e9e5db', INK);
  // Middle: fan decks standing, binders of spot colours, a tin of paint and a grey card.
  for (let i = 0; i < 7; i++) {
    if (i === 0) continue;
    const x = -0.72 + i * 0.1;
    part(g, rbox(0.075, 0.26, 0.07, 0.006), ['#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#073b4c', '#8338ec'][i - 1], x, 1.205, -0.04);
  }
  for (let i = 0; i < 6; i++) {
    const x = 0.14 + i * 0.13;
    part(g, rbox(0.11, 0.3, 0.26, 0.006), ['#37474f', '#5d4037', '#455a64', '#263238', '#6d4c41', '#37474f'][i], x, 1.225, -0.14);
    label(g, ['유광', '무광', '금별색', '은별색', '형광', '파스텔'][i], 0.09, 0.04, x, 1.27, -0.008, '#f4f1ea', INK);
  }
  // Below: boxes of paper samples, a corner of each sheet showing, with their weights.
  const papers: Array<[string, string]> = [['백색 모조 120g', '#fbfaf5'], ['미색 랑데뷰 190g', '#f4ead2'], ['크라프트 250g', '#c49a6c'], ['블랙 차콜 300g', '#2c2c30'], ['한지 결 90g', '#e9e2cf'], ['무늬 레더 216g', '#b5cbbf']];
  papers.forEach(([nm, col], i) => {
    const row = i < 3 ? 0 : 1;
    const x = -0.62 + (i % 3) * 0.62;
    const y = row === 0 ? 0.53 : 0.09;
    part(g, rbox(0.56, 0.3, 0.34, 0.01), '#d9d4c5', x, y + 0.15, -0.14);
    part(g, box(0.5, 0.05, 0.3), col, x, y + 0.325, -0.14);
    label(g, nm, 0.5, 0.075, x, y + 0.16, 0.034, '#fbfaf5', INK);
  });
  // The fan deck: seven blades on a pivot; a sheet of paper.
  const deck = group(g);
  const blades = Array.from({ length: 7 }, (_, i) => {
    return part(deck, box(0.06, 0.22, 0.003), `hsl(${i * 48},75%,55%)`, 0, 0, 0.001 * i);
  });
  const chipRing = part(deck, ring(0.022, 0.0025), '#111', 0, 0, 0.012, { outline: false });
  const sheet = group(g);
  part(sheet, box(0.26, 0.34, 0.002), '#f4ead2', 0, 0, 0, { outline: false });
  const tag = part(g, box(0.08, 0.05, 0.002), '#e53935', 0.66, 1.18, 0.09, { outline: false });
  const spots: Record<string, Spot> = { dgPickSwatch: standAt(g, 'dgSwatch') };
  spots['*'] = spots.dgPickSwatch;
  drive(g, out, spots, (_now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    at(deck, P.deck ?? null, SW.deck);
    const f = n.fan ?? 0;
    blades.forEach((b, i) => {
      const a = (i - 3) * 0.34 * f;
      // Each blade turns about the pivot at its foot.
      b.position.set(-Math.sin(a) * 0.11, Math.cos(a) * 0.11, 0.001 * i);
      b.rotation.z = a;
    });
    chipRing.visible = (n.chip ?? 0) > 0.5;
    chipRing.position.set(-Math.sin(0.34) * 0.17, Math.cos(0.34) * 0.17, 0.012);
    at(sheet, P.sheet ?? null);
    tag.visible = !!N && (n.picked ?? 0) > 0.5;
  });
  out.work = marker(g, 0, 1.2, 0.05);
}

// =============================================================================================
// 목업 작업대 (dgMockTable, 3 × 1): a cutting mat, a printed net that becomes a box; finished mock-ups on the riser.

function mockTable(g: THREE.Group, out: Built, W: number) {
  const T = MK.top;
  part(g, rbox(W - 0.04, 0.05, 0.92, 0.012), BIRCH, 0, T - 0.025, 0);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) part(g, box(0.06, T - 0.05, 0.06), '#44474e', sx * (W / 2 - 0.1), (T - 0.05) / 2, sz * 0.38);
  // Below: flat files and rolls.
  part(g, box(W - 0.3, 0.02, 0.72), '#44474e', 0, 0.26, 0);
  for (let i = 0; i < 4; i++) {
    part(g, rbox(0.5, 0.18, 0.56, 0.008), '#e0dcd0', -0.9 + i * 0.6, 0.38, 0);
    label(g, ['골판지', '폼보드', '코팅지', '스티커'][i], 0.3, 0.06, -0.9 + i * 0.6, 0.38, 0.283, '#fbfaf5', INK);
  }
  // The mat with its grid.
  picture(g, painted('dgMat', 512, 256, (c) => {
    c.fillStyle = '#1f6e5a';
    c.fillRect(0, 0, 512, 256);
    c.strokeStyle = '#7fc6b3';
    c.lineWidth = 1;
    for (let x = 0; x <= 512; x += 16) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, 256);
      c.stroke();
    }
    for (let y = 0; y <= 256; y += 16) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(512, y);
      c.stroke();
    }
    c.lineWidth = 2;
    c.strokeRect(8, 8, 496, 240);
  }), 1.2, 0.6, MK.net[0], T + 0.002, 0.14, '#ffffff', 0, -Math.PI / 2);
  // The riser at the back with finished mock-ups of made-up things.
  part(g, box(W - 0.2, 0.025, 0.26), BIRCH_D, 0, 1.09, -0.26);
  for (const sx of [-1, 1]) part(g, box(0.03, 0.2, 0.22), BIRCH_D, sx * (W / 2 - 0.14), 0.99, -0.26);
  const riser = 1.1;
  // A tea tin.
  part(g, cyl(0.055, 0.055, 0.17, 16), '#2d4a32', -1.1, riser + 0.085, -0.26);
  label(g, '숲결 차', 0.08, 0.04, -1.1, riser + 0.09, -0.204, '#f3ecd8', '#2d4a32');
  // A shopping bag with a rope handle.
  part(g, box(0.2, 0.24, 0.08), '#ffd7dc', -0.76, riser + 0.12, -0.26);
  label(g, '봄꽃', 0.12, 0.06, -0.76, riser + 0.13, -0.218, '#ffd7dc', '#7b1e3b');
  rod(g, v3(-0.81, riser + 0.24, -0.26), v3(-0.76, riser + 0.3, -0.26), 0.004, '#7b1e3b');
  rod(g, v3(-0.76, riser + 0.3, -0.26), v3(-0.71, riser + 0.24, -0.26), 0.004, '#7b1e3b');
  // A bottle.
  part(g, cyl(0.04, 0.045, 0.2, 14), '#0b6e4f', -0.42, riser + 0.1, -0.26);
  part(g, cyl(0.016, 0.03, 0.06, 10), '#0b6e4f', -0.42, riser + 0.23, -0.26);
  part(g, cyl(0.046, 0.046, 0.08, 14), '#f4ffe9', -0.42, riser + 0.09, -0.26, { outline: false });
  // Boxes in a stack.
  part(g, box(0.18, 0.1, 0.14), '#14213d', -0.1, riser + 0.05, -0.26);
  part(g, box(0.14, 0.08, 0.12), '#fca311', -0.1, riser + 0.14, -0.26);
  // Business cards fanned.
  for (let i = 0; i < 4; i++) part(g, box(0.11, 0.002, 0.065), ['#fbfaf5', '#ff5a3c', '#16161a', '#ffd166'][i], 0.24, riser + 0.004 + i * 0.002, -0.24, { ry: -0.35 + i * 0.24, outline: false });
  label(g, '패키지 목업', 0.42, 0.07, 1.14, 0.965, -0.13, BIRCH_D, '#fff');
  // Tools: the steel ruler, the knife, the bone folder, the glue; a scrap bin at the end.
  const ruler = group(g);
  part(ruler, box(0.62, 0.004, 0.035), CHROME, 0, 0, 0);
  for (let i = 0; i < 12; i++) part(ruler, box(0.002, 0.0006, 0.012), BLACK, -0.28 + i * 0.05, 0.0024, -0.008, { outline: false });
  const knife = group(g);
  part(knife, cyl(0.009, 0.009, 0.13, 8), '#f4b942', 0.03, 0.05, 0.03, { rz: -0.5, rx: 0.5, outline: false });
  part(knife, box(0.006, 0.02, 0.001), CHROME, 0, 0.006, 0, { outline: false });
  const tube = group(g);
  part(tube, cyl(0.022, 0.022, 0.09, 10), '#ef476f', 0, 0.045, 0);
  part(tube, cyl(0.008, 0.016, 0.03, 8), '#fafafa', 0, 0.105, 0, { outline: false });
  const bone = group(g);
  part(bone, rbox(0.018, 0.006, 0.13, 0.003), '#f0ebda', 0, 0.006, 0.03, { rx: 0.2 });
  // The printed sheet the net's cut from.
  const printed = group(g);
  part(printed, box(0.74, 0.002, 0.54), PAPER, 0, 0, 0, { outline: false });
  // The box: base and four sides that fold up, the lid on the back side.
  const box3 = group(g);
  const S = 0.2;
  const Hb = 0.14;
  const COL = '#2d4a32';
  part(box3, box(S, 0.003, S), COL, 0, 0.002, 0, { outline: false });
  const hinge = (x: number, z: number, ry: number) => {
    const h = group(box3, x, 0.002, z, ry);
    part(h, box(S, 0.003, Hb), COL, 0, 0, Hb / 2, { outline: false });
    return h;
  };
  const front = hinge(0, S / 2, 0);
  const backS = hinge(0, -S / 2, Math.PI);
  const left = hinge(-S / 2, 0, -Math.PI / 2);
  const right = hinge(S / 2, 0, Math.PI / 2);
  // The label on the front panel, on the outside when folded.
  picture(front, painted('dgBoxFace', 200, 140, (c) => {
    c.fillStyle = '#f3ecd8';
    c.fillRect(0, 0, 200, 140);
    text(c, '숲결 차', 100, 56, 40, '#2d4a32', 'center');
    text(c, '첫물 녹차', 100, 104, 20, '#47713f', 'center');
  }), 0.17, 0.11, 0, -0.003, Hb / 2, '#ffffff', 0, Math.PI / 2);
  const lidH = group(backS, 0, 0, Hb);
  part(lidH, box(S, 0.003, S), '#47713f', 0, 0, S / 2, { outline: false });
  const glueLine = part(box3, box(0.14, 0.002, 0.004), '#ffffff', 0, Hb * 0.5, S / 2 + 0.002, { outline: false });
  // A finished one stays on the riser's end until it's made again.
  const made = group(g, MK.shelf[0], MK.shelf[1], MK.shelf[2]);
  part(made, box(S, Hb, S), COL, 0, Hb / 2, 0);
  label(made, '숲결 차', 0.16, 0.07, 0, Hb / 2, S / 2 + 0.002, '#f3ecd8', '#2d4a32');
  const spots: Record<string, Spot> = { dgMakeMock: standAt(g, 'dgMock') };
  spots['*'] = spots.dgMakeMock;
  drive(g, out, spots, (_now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const fold = n.fold ?? 0;
    at(ruler, P.ruler ?? null, MK.ruler);
    at(knife, P.knife ?? null, MK.knife);
    at(tube, P.tube ?? null, MK.glue);
    at(bone, P.bone ?? null);
    at(box3, P.box ?? null);
    box3.rotation.y = n.spin ?? 0;
    printed.visible = !!N && (n.trim ?? 0) < 0.5;
    if (printed.visible && P.box) printed.position.set(P.box[0], P.box[1] - 0.001, P.box[2]);
    const a = -fold * (Math.PI / 2);
    for (const h of [front, backS, left, right]) h.rotation.x = 0;
    front.rotation.set(a, 0, 0);
    backS.rotation.set(a, Math.PI, 0, 'YXZ');
    left.rotation.set(a, -Math.PI / 2, 0, 'YXZ');
    right.rotation.set(a, Math.PI / 2, 0, 'YXZ');
    lidH.rotation.x = -(n.lid ?? 0) * (Math.PI / 2);
    glueLine.visible = !!N && (n.glued ?? 0) > 0.2 && (n.lid ?? 0) < 0.5;
    made.visible = !N || (n.placed ?? 0) > 0.8;
  });
  out.work = marker(g, MK.net[0], T + 0.05, MK.net[2]);
}

// =============================================================================================
// 클라이언트 화면 (dgClientScreen, 3 × 1): a wide wall screen over a low credenza.

function clientScreen(g: THREE.Group, out: Built) {
  const Z = CS.z;
  // The credenza with sample books and a little plant-free tray of cards.
  part(g, rbox(2.5, 0.5, 0.36, 0.015), '#3a3c42', 0, 0.3, -0.12);
  part(g, box(2.54, 0.03, 0.4), BIRCH, 0, 0.56, -0.12);
  for (const sx of [-1, 0, 1]) part(g, box(0.78, 0.42, 0.01), '#44474e', sx * 0.82, 0.3, 0.065, { outline: false });
  for (let i = 0; i < 4; i++) part(g, rbox(0.3, 0.03, 0.22, 0.006), ['#ff5a3c', '#fbfaf5', '#16161a', '#ffd166'][i], -0.9, 0.59 + i * 0.03, -0.12);
  part(g, rbox(0.26, 0.03, 0.14, 0.008), '#26282e', 0.9, 0.59, -0.1);
  const hub = ownLit(g, ball(0.008), '#2a6', 1.0, 0.61, -0.03);
  hub.visible = true;
  // The screen.
  part(g, rbox(2.44, 1.32, 0.05, 0.012), BLACK, 0, CS.screenY, Z - 0.03);
  const screen = swapPic(g, 2.36, 1.24, 0, CS.screenY, Z);
  const circled = part(g, ring(0.26, 0.009), '#e53935', -0.26, CS.screenY + 0.1, Z + 0.012, { outline: false });
  const clicker = group(g);
  part(clicker, rbox(0.03, 0.02, 0.1, 0.006), '#26282e', 0, 0, 0);
  const lamp = ownLit(clicker, ball(0.005), '#ff3030', 0, 0.012, 0.04);
  lamp.visible = true;
  const liveS = live(768, 404);
  const client = lazy(() => person(g, LOOKS.client, CS.client[0], CS.client[1], Math.PI + 0.32, 'male'));
  const spots: Record<string, Spot> = { dgPresentDeck: standAt(g, 'dgPresent') };
  spots['*'] = spots.dgPresentDeck;
  drive(g, out, spots, (_now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const round = N?.b.n ?? 0;
    const d = designOf(round);
    const slide = n.slide ?? 0;
    const sl = Math.round(slide);
    screen.set(liveS(N ? `${round}|${sl}|${q(n.on, 6)}` : 'idle', (c) => {
      c.fillStyle = N ? '#ffffff' : '#101114';
      c.fillRect(0, 0, 768, 404);
      if (!N) {
        text(c, BRAND, 384, 186, 44, '#f4f1ea', 'center');
        c.fillStyle = ACCENT;
        c.fillRect(330, 224, 108, 6);
        return;
      }
      c.globalAlpha = n.on ?? 1;
      if (sl === 0) {
        c.fillStyle = d.bg;
        c.fillRect(0, 0, 768, 404);
        text(c, d.title, 384, 170, 62, d.fg, 'center');
        text(c, '브랜드 시안 제안', 384, 238, 26, d.fg, 'center', false);
        text(c, BRAND, 384, 350, 18, d.fg, 'center', false);
      } else if (sl === 1) {
        text(c, '콘셉트', 40, 44, 32, INK);
        ['밝게', '따뜻하게', '한눈에'].forEach((s, i) => {
          disc(c, 150 + i * 234, 186, 90, [d.accent, d.bg, d.fg][i]);
          text(c, s, 150 + i * 234, 186, 28, i === 2 ? d.bg : i === 0 ? '#16161a' : d.fg, 'center');
        });
        [d.bg, d.fg, d.accent, '#f4f1ea'].forEach((col, i) => {
          c.fillStyle = col;
          c.fillRect(40 + i * 60, 322, 54, 54);
        });
      } else if (sl === 2) {
        text(c, '시안', 40, 44, 32, INK);
        for (let i = 0; i < 2; i++) posterOn(c, designOf(round), 150 + i * 270, 70, 220, 310);
        text(c, 'A안', 240, 392, 14, INK, 'center');
        text(c, 'B안', 510, 392, 14, INK, 'center');
      } else {
        text(c, '일정 · 적용', 40, 44, 32, INK);
        ['이번 주  수정', '다음 주  인쇄 교정', '셋째 주  납품'].forEach((s, i) => text(c, s, 60, 110 + i * 46, 22, '#44464e'));
        posterOn(c, d, 500, 80, 200, 280);
        text(c, '의견을 들려 주세요', 60, 330, 28, ACCENT);
      }
      c.globalAlpha = 1;
    }));
    circled.visible = !!N && (n.circled ?? 0) > 0.1;
    circled.scale.setScalar(0.6 + 0.4 * (n.circled ?? 0));
    at(clicker, P.clicker ?? null);
    const there = N ? n.there ?? 0 : 0;
    if (there > 0.02) {
      const f = client.get();
      comes(f, there, CS.client[0], CS.client[1], 0.8, t);
      f.head.rotation.x = (n.nodClient ?? 0) > 0.5 ? 0.08 + 0.09 * Math.sin(t * 3.2) : 0.02;
      f.armL(null);
      f.armR((n.talk ?? 0) > 0.5 ? v3(CS.client[0] - 0.12 + 0.05 * Math.sin(t * 3.4), 1.14 + 0.04 * Math.sin(t * 2.4), CS.client[1] - 0.26) : null);
    } else client.hide();
  });
  out.work = marker(g, 0, CS.screenY, Z + 0.05);
}

// =============================================================================================
// 표준광 부스 (dgViewBooth, 2 × 1): a neutral grey hood on a counter, its daylight lamp, a sheet beside a sheet.

function viewBooth(g: THREE.Group, out: Built) {
  const D = VB.deck;
  const GREY = '#8c8e90';
  part(g, rbox(1.94, D - 0.02, 0.62, 0.012), '#d9dade', 0, (D - 0.02) / 2, -0.06);
  part(g, box(1.98, 0.03, 0.72), '#f0f0f0', 0, D, -0.04);
  for (let i = 0; i < 3; i++) part(g, box(0.56, 0.74, 0.008), '#cfd1d5', -0.62 + i * 0.62, 0.42, 0.25, { outline: false });
  // The hood: back, sides, roof, a lamp bar under the roof's lip, all a flat neutral grey.
  part(g, box(1.42, 0.8, 0.02), GREY, -0.16, 1.32, -0.3);
  for (const x of [-0.88, 0.56]) part(g, box(0.02, 0.84, 0.42), GREY, x, 1.34, -0.1);
  part(g, box(1.46, 0.02, 0.44), GREY, -0.16, 1.76, -0.09);
  part(g, box(1.46, 0.09, 0.02), '#6d6f72', -0.16, 1.72, 0.12);
  label(g, '표준광 D50', 0.44, 0.06, -0.16, 1.72, 0.132, '#6d6f72', '#ffffff');
  const lampBar = ownLit(g, box(1.26, 0.03, 0.05), '#6b6d70', -0.16, 1.7, -0.02);
  const glowBack = ownLit(g, box(1.4, 0.76, 0.002), GREY, -0.16, 1.32, -0.288);
  // A slanted viewing board.
  part(g, box(1.3, 0.56, 0.015), '#a0a2a4', -0.1, 1.2, -0.13, { rx: -0.14 });
  // The approved sheet on the left, a colour strip along it.
  const okS = picture(g, posterTex(3), 0.34, 0.46, VB.ok[0] - 0.08, VB.ok[1] + 0.13, VB.ok[2]);
  okS.rotation.x = -0.14;
  label(g, '승인본', 0.16, 0.05, VB.ok[0] - 0.08, VB.ok[1] - 0.14, VB.ok[2] + 0.04, '#2e9e6b', '#ffffff');
  // The proof, its tint drawn off as it's corrected.
  const proof = swapPic(g, 0.34, 0.46, 0, 0, 0, 0, -0.14);
  proof.set(posterTex(3));
  const redRing = part(g, ring(0.06, 0.004), '#e53935', VB.proof[0] + 0.03, VB.proof[1] + 0.04, VB.proof[2] + 0.02, { outline: false });
  const noteM = label(g, 'M -3', 0.1, 0.04, VB.proof[0] + 0.02, VB.proof[1] - 0.14, VB.proof[2] + 0.04, '#e53935', '#ffffff');
  // On the counter's end: a switch, a tray of proofs, a loupe, a densitometer.
  part(g, rbox(0.14, 0.09, 0.03, 0.008), '#2b2b30', VB.switch[0], VB.switch[1] - 0.02, VB.switch[2] - 0.12);
  const led = ownLit(g, ball(0.012), '#3a2020', VB.switch[0] + 0.03, VB.switch[1], VB.switch[2] - 0.1);
  part(g, box(0.36, 0.02, 0.26), '#b5b7ba', VB.tray[0], D + 0.025, VB.tray[2]);
  part(g, box(0.3, 0.012, 0.22), PAPER, VB.tray[0], D + 0.04, VB.tray[2], { outline: false });
  part(g, rbox(0.08, 0.05, 0.13, 0.012), '#37474f', 0.82, D + 0.04, -0.2);
  const loupe = loupeMesh(g);
  const pen = penMesh(g, '#c62828');
  const spots: Record<string, Spot> = { dgCheckProof: standAt(g, 'dgBooth') };
  spots['*'] = spots.dgCheckProof;
  drive(g, out, spots, (_now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const on = N ? n.lamp ?? 0 : 0;
    setLit(lampBar, on > 0.5 ? '#fffdf2' : '#6b6d70');
    setLit(glowBack, on > 0.5 ? '#c6c7c5' : GREY);
    setLit(led, on > 0.5 ? '#ff4d4d' : '#3a2020');
    at(proof.mesh, P.proof ?? null, N ? undefined : VB.proof);
    const ok = n.ok ?? 0;
    // The proof's a little magenta until it's been corrected.
    proof.mat.color.setRGB(1, 0.76 + 0.24 * ok, 0.86 + 0.14 * ok);
    if (!N) proof.mat.color.set('#ffffff');
    redRing.visible = !!N && (n.ring ?? 0) > 0.1 && ok < 0.6;
    redRing.scale.setScalar(0.6 + 0.4 * (n.ring ?? 0));
    noteM.visible = !!N && (n.ring ?? 0) > 0.7 && ok < 0.6;
    at(loupe, P.loupe ?? null, [VB.tray[0] + 0.14, D + 0.05, VB.tray[2] - 0.06]);
    at(pen, P.pen ?? null);
  });
  out.work = marker(g, 0, VB.proof[1], VB.proof[2] + 0.05);
}

// =============================================================================================
// 작업 전시 선반 (dgPortfolio, 2 × 1, decor): the lobby's wall of the studio's name and its best work.

function portfolio(g: THREE.Group, W: number) {
  part(g, box(W - 0.04, 1.3, 0.04), '#16161a', 0, 1.46, -0.33);
  picture(g, painted('dgSign', 512, 96, (c) => {
    c.fillStyle = '#16161a';
    c.fillRect(0, 0, 512, 96);
    disc(c, 56, 48, 26, ACCENT);
    text(c, BRAND, 96, 50, 42, '#f4f1ea');
  }), 1.6, 0.3, 0, 1.92, -0.307);
  [[-0.58, 1.34, 0], [0, 1.34, 4], [0.58, 1.34, 3]].forEach(([x, y, i]) => picture(g, posterTex(i), 0.4, 0.56, x, y, -0.307));
  // A low plinth with books and a little trophy.
  part(g, rbox(W - 0.1, 0.76, 0.4, 0.012), BIRCH, 0, 0.38, -0.1);
  for (let i = 0; i < 5; i++) part(g, rbox(0.05, 0.26, 0.2, 0.004), ['#ff5a3c', '#fbfaf5', '#118ab2', '#16161a', '#ffd166'][i], -0.72 + i * 0.056, 0.89, -0.14);
  part(g, cyl(0.02, 0.05, 0.14, 10), '#c9a227', 0.2, 0.83, -0.1);
  part(g, ball(0.05), '#e6c544', 0.2, 0.95, -0.1);
  label(g, '올해의 포장 상', 0.26, 0.05, 0.2, 0.79, -0.05, '#16161a', '#e6c544');
  part(g, box(0.2, 0.14, 0.14), '#2d4a32', 0.62, 0.83, -0.12);
  label(g, '숲결 차', 0.16, 0.06, 0.62, 0.83, -0.048, '#f3ecd8', '#2d4a32');
  for (const x of [-0.58, 0, 0.58]) ownLit(g, box(0.34, 0.012, 0.03), '#fff3c4', x, 1.68, -0.28);
}

export const BUILDERS: Record<string, Builder> = {
  designDesk(g, _W, _D, _c, _def, _ctx, out) {
    designDesk(g, out);
  },
  largePrinter(g, _W, _D, _c, _def, _ctx, out) {
    largePrinter(g, out);
  },
  dgCritWall(g, _W, _D, _c, _def, _ctx, out) {
    critWall(g, out);
  },
  dgTypeWall(g, _W, _D, _c, _def, _ctx, out) {
    typeWall(g, out);
  },
  dgSwatchShelf(g, _W, _D, _c, _def, _ctx, out) {
    swatchShelf(g, out);
  },
  dgMockTable(g, W, _D, _c, _def, _ctx, out) {
    mockTable(g, out, W);
  },
  dgClientScreen(g, _W, _D, _c, _def, _ctx, out) {
    clientScreen(g, out);
  },
  dgViewBooth(g, _W, _D, _c, _def, _ctx, out) {
    viewBooth(g, out);
  },
  dgPortfolio(g, W) {
    portfolio(g, W);
  },
  /** The guillotine cutter (재단기, 2026-11-05, the layout audit): a heavy paper cutter on its stand, a stack of trimmed proofs beside. */
  dgCutter(g) {
    part(g, box(0.6, 0.75, 0.5), '#455a64', 0, 0.375, -0.05);
    part(g, box(0.62, 0.06, 0.55), '#eceff1', 0, 0.78, -0.05);
    part(g, box(0.06, 0.45, 0.06), '#263238', -0.26, 1.03, -0.25);
    part(g, box(0.06, 0.45, 0.06), '#263238', 0.26, 1.03, -0.25);
    part(g, box(0.58, 0.07, 0.08), '#c62828', 0, 1.22, -0.25);
    part(g, box(0.56, 0.02, 0.4), '#fbfaf5', 0, 0.82, -0.02);
    part(g, box(0.2, 0.08, 0.28), '#fbfaf5', 0.18, 0.86, 0.06, { outline: false });
    label(g, '손 조심', 0.14, 0.05, 0, 0.6, 0.205, '#ffeb3b', '#212121');
  },
  /** The proof rack (출력물 건조 선반): wire shelves of fresh prints laid out flat to dry before they're trimmed. */
  dgPrintRack(g, W) {
    const w = W - 0.12;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.03, 1.6, 0.03), STEEL, sx * (w / 2 - 0.02), 0.8, -0.1 + sz * 0.22, { outline: false });
    for (let k = 0; k < 8; k++) {
      const y = 0.2 + k * 0.18;
      part(g, box(w, 0.012, 0.46), '#9e9e9e', 0, y, -0.1, { outline: false });
      if (k % 3 !== 2) picture(g, posterTex(k % 5), 0.32, 0.42, -w / 4 + (k % 2) * (w / 2), y + 0.008, -0.1, '#ffffff', 0, -Math.PI / 2);
    }
    part(g, box(w, 0.1, 0.03), '#16161a', 0, 1.62, 0.12);
    label(g, '출력물 건조 중', 0.4, 0.07, 0, 1.62, 0.137, '#16161a', '#f4f1ea');
  },
  /** The building's tenant board by the street door (입주 안내판): the floors and who is on them, the studio among them. */
  dgFrontSign(g) {
    part(g, box(0.06, 1.1, 0.06), '#424242', 0, 0.55, 0);
    part(g, box(0.5, 0.7, 0.05), '#263238', 0, 1.35, 0);
    label(g, '입주 안내', 0.36, 0.07, 0, 1.62, 0.028, '#263238', '#ffffff');
    ['1F ' + BRAND, '2F 한빛 세무회계', '3F 숲길 출판사'].forEach((s, i) => label(g, s, 0.42, 0.06, 0, 1.48 - i * 0.12, 0.028, i ? '#37474f' : ACCENT, '#ffffff'));
  },
};
