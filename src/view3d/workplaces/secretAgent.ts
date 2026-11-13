import * as THREE from 'three';
import { marker, rod, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, label, painted, picture, ring, seeded, text } from './doctor';
import { BD, BT, CT, DM, DS, EB, GL, ID, SD, SW, add, icNow, icPhase } from './secretAgentMotion';
import type { IcMotion, IcNow } from './secretAgentMotion';
import { vroidFigure } from './vroidFigure';

/**
 * The 정보 분석센터 drawn as itself (2026-11-01 workplace pipeline, at the user's request): a made-up office in a made-up city
 * (해담시), a light game of code names. An analysts' pit of three-screen desks and a signals seat in its middle; a situation
 * wall as wide as the room with its console; security terminals in front of a rack; a cork board with red thread; a safe,
 * a badge desk at the door, a gear locker, a table with a map and tokens for meetings and a mat with a padded dummy.
 *
 * The same invented cases go round everything (the folder on the desk is the slide on the wall and the photo on the
 * board), and none of them is more serious than a stolen fish-bun recipe. Everything that moves follows secretAgentMotion.ts.
 */

const CENTER = '제7 분석과';
const NAVY = '#1c2533';
const NAVY_L = '#2c3a4e';
const GRAPHITE = '#23272e';
const STEEL_D = '#7c8791';
const CORK = '#b58a57';
const WOOD_D = '#4a3626';
const WOOD = '#8a6a4c';
const PAPER = '#f4efe2';
const MANILA = '#d9b873';
const SCREEN_BG = '#0c1420';
const CYAN = '#6fe0f2';
const AMBER = '#f5b942';
const RED = '#e5453a';
const GREEN = '#4ae07a';
const THREAD = '#d3302f';
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
type V = readonly [number, number, number];
type Ctx2 = CanvasRenderingContext2D;

// ---------------------------------------------------------------------------------------------
// The invented city and its cases.

interface Place {
  name: string;
  x: number;
  y: number;
}
const PLACES: Place[] = [
  { name: '시계탑', x: 0.27, y: 0.3 },
  { name: '철교', x: 0.52, y: 0.5 },
  { name: '구름시장', x: 0.72, y: 0.27 },
  { name: '유람선 부두', x: 0.76, y: 0.74 },
  { name: '달동네', x: 0.18, y: 0.72 },
  { name: '우표 박물관', x: 0.47, y: 0.17 },
  { name: '해담 등대', x: 0.9, y: 0.88 },
];
interface Case {
  code: string;
  title: string;
  a: number;
  b: number;
  color: string;
  shape: 'hat' | 'umbrella' | 'bun' | 'bag' | 'stamp' | 'fox';
  /** What the wiretap says, once it's been worked out. */
  signal: string;
}
const CASES: Case[] = [
  { code: '청매화', title: '시계탑 암호 쪽지', a: 0, b: 1, color: '#7fb6e6', shape: 'hat', signal: '시계는 세 번 울린다' },
  { code: '은제비', title: '사라진 붕어빵 설계도', a: 2, b: 3, color: '#f0c25a', shape: 'bun', signal: '붕어빵은 세 시에 굽는다' },
  { code: '푸른여우', title: '가짜 우표 조직', a: 5, b: 4, color: '#68c7a8', shape: 'stamp', signal: '여우는 우표를 핥지 않는다' },
  { code: '흑단우산', title: '철교 밑 비밀 우체통', a: 1, b: 4, color: '#b58be6', shape: 'umbrella', signal: '비가 오면 우산을 접어라' },
  { code: '달토끼', title: '유람선 가방 바꿔치기', a: 3, b: 6, color: '#f08aa5', shape: 'bag', signal: '토끼는 달에서 내리지 않는다' },
  { code: '황금감', title: '구름시장 위조 영수증', a: 2, b: 0, color: '#ef9a52', shape: 'fox', signal: '감은 까치밥만 남겨라' },
];
const caseOf = (i: number) => CASES[((i % CASES.length) + CASES.length) % CASES.length];

/** The map of 해담시 drawn in the box, the case's two places marked. */
function paintMap(c: Ctx2, W: number, H: number, o: { d?: Case; pin?: number; sweep?: number; alarm?: boolean; clear?: number; block?: number; dark?: boolean; labels?: boolean }) {
  const dark = o.dark ?? true;
  c.fillStyle = dark ? '#0d1a2a' : '#e8e2cf';
  c.fillRect(0, 0, W, H);
  const line = dark ? 'rgba(111,224,242,0.14)' : 'rgba(80,70,50,0.14)';
  c.strokeStyle = line;
  c.lineWidth = 1;
  c.beginPath();
  for (let x = 0; x <= 12; x++) {
    c.moveTo((x / 12) * W, 0);
    c.lineTo((x / 12) * W, H);
  }
  for (let y = 0; y <= 8; y++) {
    c.moveTo(0, (y / 8) * H);
    c.lineTo(W, (y / 8) * H);
  }
  c.stroke();
  // The sea at the bottom right, the river across, its one bridge, the ring road.
  c.fillStyle = dark ? '#123a57' : '#a8c9d6';
  c.beginPath();
  c.moveTo(W, 0.56 * H);
  c.bezierCurveTo(0.84 * W, 0.62 * H, 0.84 * W, 0.8 * H, 0.62 * W, H);
  c.lineTo(W, H);
  c.closePath();
  c.fill();
  c.strokeStyle = dark ? '#1f6a92' : '#88b4c6';
  c.lineWidth = Math.max(3, H * 0.035);
  c.beginPath();
  c.moveTo(0, 0.56 * H);
  c.bezierCurveTo(0.3 * W, 0.34 * H, 0.5 * W, 0.66 * H, 0.86 * W, 0.66 * H);
  c.stroke();
  c.strokeStyle = dark ? 'rgba(180,200,220,0.35)' : 'rgba(90,80,60,0.4)';
  c.lineWidth = Math.max(1.5, H * 0.012);
  c.beginPath();
  c.ellipse(0.46 * W, 0.46 * H, 0.32 * W, 0.34 * H, 0.1, 0, Math.PI * 2);
  c.moveTo(0.52 * W, 0.12 * H);
  c.lineTo(0.52 * W, 0.88 * H);
  c.moveTo(0.14 * W, 0.46 * H);
  c.lineTo(0.8 * W, 0.46 * H);
  c.stroke();
  // The places.
  const small = H / 22;
  for (const p of PLACES) {
    c.fillStyle = dark ? '#8fb2c8' : '#5a5040';
    c.beginPath();
    c.arc(p.x * W, p.y * H, Math.max(2, H * 0.011), 0, Math.PI * 2);
    c.fill();
    if (o.labels !== false) text(c, p.name, p.x * W + H * 0.02, p.y * H + H * 0.03, Math.max(9, small), dark ? '#b7d0de' : '#4d4436', 'left', false);
  }
  text(c, '해담시', 0.03 * W, 0.07 * H, Math.max(11, H * 0.06), dark ? '#e9f3f7' : '#3c3428');
  // The case's thread between its two places.
  if (o.d && (o.pin ?? 0) > 0) {
    const a = PLACES[o.d.a];
    const b = PLACES[o.d.b];
    const u = Math.min(1, o.pin ?? 0);
    c.strokeStyle = o.d.color;
    c.lineWidth = Math.max(2, H * 0.012);
    c.setLineDash([H * 0.02, H * 0.012]);
    c.beginPath();
    c.moveTo(a.x * W, a.y * H);
    c.lineTo((a.x + (b.x - a.x) * u) * W, (a.y + (b.y - a.y) * u) * H);
    c.stroke();
    c.setLineDash([]);
    for (const [q, on] of [[a, true], [b, u >= 0.98]] as const)
      if (on) {
        c.fillStyle = o.d.color;
        c.beginPath();
        c.arc(q.x * W, q.y * H, Math.max(4, H * 0.024), 0, Math.PI * 2);
        c.fill();
      }
  }
  // The sweep of a watch going round.
  if (o.sweep !== undefined) {
    const x = o.sweep * W;
    const g = c.createLinearGradient(x - W * 0.1, 0, x, 0);
    g.addColorStop(0, 'rgba(111,224,242,0)');
    g.addColorStop(1, 'rgba(111,224,242,0.3)');
    c.fillStyle = g;
    c.fillRect(x - W * 0.1, 0, W * 0.1, H);
  }
  if (o.alarm) {
    const on = 1 - (o.block ?? 0);
    c.fillStyle = `rgba(229,69,58,${0.1 + 0.12 * on})`;
    c.fillRect(0, 0, W, H);
    c.strokeStyle = RED;
    c.lineWidth = H * 0.008;
    const q = PLACES[2];
    for (const r of [0.04, 0.08, 0.12]) {
      c.beginPath();
      c.arc(q.x * W, q.y * H, r * H * (1 + on), 0, Math.PI * 2);
      c.stroke();
    }
  }
  if ((o.clear ?? 0) > 0) {
    c.fillStyle = `rgba(74,224,122,${0.22 * (o.clear ?? 0)})`;
    c.fillRect(0, 0, W, H);
  }
}
function drawBars(c: Ctx2, x: number, y: number, w: number, n: number, gap: number, h: number, u: number, col = '#b9c9d6') {
  for (let i = 0; i < n; i++) {
    const on = u * n > i;
    c.fillStyle = on ? col : 'rgba(180,200,220,0.14)';
    const ww = w * (0.55 + 0.45 * Math.abs(Math.sin(i * 2.3 + 1)));
    c.fillRect(x, y + i * gap, on ? ww * Math.min(1, u * n - i) : ww, h);
  }
}
/** A badge-sized picture for a case: not a person, a thing. */
function caseGlyph(c: Ctx2, d: Case, x: number, y: number, s: number) {
  c.save();
  c.translate(x, y);
  c.scale(s / 100, s / 100);
  c.fillStyle = d.color;
  c.strokeStyle = '#1b1b20';
  c.lineWidth = 3;
  c.beginPath();
  switch (d.shape) {
    case 'hat':
      c.ellipse(50, 66, 42, 11, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.beginPath();
      c.moveTo(26, 64);
      c.bezierCurveTo(28, 26, 72, 26, 74, 64);
      c.closePath();
      c.fill();
      c.stroke();
      break;
    case 'umbrella':
      c.moveTo(10, 50);
      c.quadraticCurveTo(50, -6, 90, 50);
      c.closePath();
      c.fill();
      c.stroke();
      c.beginPath();
      c.moveTo(50, 50);
      c.lineTo(50, 84);
      c.arc(42, 84, 8, 0, Math.PI);
      c.stroke();
      break;
    case 'bun':
      c.ellipse(52, 50, 32, 19, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.beginPath();
      c.moveTo(22, 50);
      c.lineTo(5, 34);
      c.lineTo(5, 66);
      c.closePath();
      c.fill();
      c.stroke();
      c.fillStyle = '#1b1b20';
      c.beginPath();
      c.arc(70, 44, 3, 0, Math.PI * 2);
      c.fill();
      break;
    case 'bag':
      c.rect(18, 36, 64, 44);
      c.fill();
      c.stroke();
      c.beginPath();
      c.moveTo(38, 36);
      c.lineTo(38, 22);
      c.lineTo(62, 22);
      c.lineTo(62, 36);
      c.stroke();
      break;
    case 'stamp':
      c.rect(20, 16, 60, 70);
      c.fill();
      c.stroke();
      c.fillStyle = '#ffffff';
      c.fillRect(30, 28, 40, 44);
      c.fillStyle = d.color;
      c.beginPath();
      c.arc(50, 50, 13, 0, Math.PI * 2);
      c.fill();
      break;
    default:
      c.moveTo(50, 84);
      c.lineTo(18, 42);
      c.lineTo(22, 12);
      c.lineTo(42, 30);
      c.lineTo(58, 30);
      c.lineTo(78, 12);
      c.lineTo(82, 42);
      c.closePath();
      c.fill();
      c.stroke();
  }
  c.restore();
}
const casePage = (i: number) => {
  const d = caseOf(i);
  return painted(`icPage${d.code}`, 180, 240, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 180, 240);
    c.strokeStyle = RED;
    c.lineWidth = 2;
    c.strokeRect(112, 8, 60, 22);
    text(c, '대외비', 142, 20, 14, RED, 'center');
    text(c, `작전명 ${d.code}`, 10, 22, 14, '#20242c');
    text(c, d.title, 10, 46, 12, '#3c424c', 'left', false);
    caseGlyph(c, d, 16, 58, 60);
    drawBars(c, 88, 66, 80, 6, 9, 3, 1, '#6a7078');
    drawBars(c, 12, 132, 156, 10, 10, 3, 1, '#6a7078');
  });
};
const casePhoto = (i: number) => {
  const d = caseOf(i);
  return painted(`icPhoto${d.code}`, 120, 150, (c) => {
    c.fillStyle = '#fbf8f0';
    c.fillRect(0, 0, 120, 150);
    c.fillStyle = '#3c4552';
    c.fillRect(8, 8, 104, 104);
    caseGlyph(c, d, 18, 16, 84);
    text(c, d.code, 60, 130, 18, '#20242c', 'center');
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
function at(m: THREE.Object3D, p: V | null | undefined, home?: V) {
  const q = p ?? home;
  m.visible = !!q;
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
function swapPic(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0) {
  const mat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.userData.ownGeometry = mesh.userData.ownMaterial = true;
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, 0, 'YXZ');
  g.add(mesh);
  return {
    mesh,
    set: (t: THREE.Texture | null) => {
      if (!t || mat.map === t) return;
      mat.map = t;
      mat.needsUpdate = true;
    },
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
/** A picture with a live canvas behind it. */
function liveScreen(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, res: number, ry = 0, rx = 0) {
  const pic = swapPic(g, w, h, x, y, z, ry, rx);
  const canvas = live(res, Math.round((res * h) / w));
  const RW = res;
  const RH = Math.round((res * h) / w);
  return {
    mesh: pic.mesh,
    show: (key: string, paint: (c: Ctx2, W: number, H: number) => void) => pic.set(canvas(key, (c) => paint(c, RW, RH))),
  };
}
function standAt(g: THREE.Object3D, motion: IcMotion, z = 0.6, x = 0): Spot {
  const s = spot(g, 'stand', x, 0, z, Math.PI);
  s.motion = motion;
  return s;
}
function seatAt(g: THREE.Object3D, motion: IcMotion, seat: V): Spot {
  const s = spot(g, 'sit', seat[0], seat[1], seat[2], Math.PI, 0);
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
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, show: (now: string | null, N: IcNow | null, t: number) => void) {
  out.spots = spots;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const N = sp ? icNow(sp.motion as IcMotion, t, icPhase(g.getWorldPosition(tmp)), (sp.at.userData.height as number | undefined) ?? 1.6) : null;
    show(now, N, t);
  };
}
const q = (x: number | undefined, steps = 30) => Math.round((x ?? 0) * steps);
const seedOf = (g: THREE.Object3D) => {
  const p = g.getWorldPosition(tmp);
  return Math.floor(Math.abs(p.x) / 2 + Math.abs(p.z));
};

/** A swivel chair, seat `top` high, its back behind +z. */
function officeChair(g: THREE.Object3D, x: number, z: number, top = 0.47): THREE.Group {
  const s = group(g, x, 0, z);
  part(s, rbox(0.42, 0.06, 0.42, 0.03), GRAPHITE, 0, top - 0.03, 0);
  part(s, cyl(0.022, 0.026, top - 0.1, 10), CHROME, 0, (top - 0.06) / 2 + 0.04, 0, { outline: false });
  part(s, rbox(0.4, 0.42, 0.05, 0.03), GRAPHITE, 0, top + 0.32, 0.23);
  rod(s, v3(0, top - 0.03, 0.14), v3(0, top + 0.14, 0.22), 0.016, STEEL_D);
  for (const sx of [-1, 1]) {
    rod(s, v3(sx * 0.2, top + 0.02, 0.06), v3(sx * 0.22, top + 0.2, 0.06), 0.011, GRAPHITE);
    part(s, rbox(0.05, 0.022, 0.2, 0.01), GRAPHITE, sx * 0.22, top + 0.21, 0.04);
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    rod(s, v3(0, 0.08, 0), v3(Math.cos(a) * 0.23, 0.035, Math.sin(a) * 0.23), 0.012, BLACK);
    part(s, ball(0.024), BLACK, Math.cos(a) * 0.23, 0.026, Math.sin(a) * 0.23, { outline: false });
  }
  return s;
}
/** A monitor on a foot; `base` the desktop's height. */
function monitor(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, ry: number, base: number, res = 300) {
  const m = group(g, x, y, z, ry);
  part(m, rbox(w, h, 0.03, 0.008), BLACK, 0, 0, 0);
  const scr = liveScreen(m, w - 0.024, h - 0.024, 0, 0, 0.017, res);
  part(m, cyl(0.016, 0.02, y - base - 0.02, 8), '#3d434c', 0, (base - y) / 2, -0.025, { outline: false });
  part(m, rbox(0.17, 0.012, 0.12, 0.004), '#3d434c', 0, base - y + 0.006, -0.02, { outline: false });
  return scr;
}
function keyboard(g: THREE.Object3D, p: V, w = 0.34) {
  part(g, rbox(w, 0.016, 0.12, 0.005), '#2f343c', p[0], p[1] - 0.008, p[2], { outline: false });
  for (let i = 0; i < 4; i++) part(g, box(w - 0.03, 0.003, 0.018), '#5c6570', p[0], p[1] + 0.001, p[2] - 0.038 + i * 0.026, { outline: false });
}
function mouseMesh(g: THREE.Object3D, p: V) {
  part(g, rbox(0.05, 0.022, 0.08, 0.012), '#2f343c', p[0], p[1] - 0.004, p[2], { outline: false });
}
function penMesh(g: THREE.Object3D, color = '#1d2230'): THREE.Group {
  const p = group(g);
  part(p, cyl(0.006, 0.002, 0.14, 8), color, 0.02, 0.065, 0.025, { rz: -0.3, rx: 0.42, outline: false });
  return p;
}
function folderMesh(g: THREE.Object3D) {
  const f = group(g);
  part(f, rbox(0.28, 0.012, 0.22, 0.004), MANILA, 0, 0, 0, { outline: false });
  const left = swapPic(f, 0.135, 0.2, -0.069, 0.008, 0, 0, -Math.PI / 2);
  const right = swapPic(f, 0.135, 0.2, 0.069, 0.008, 0, 0, -Math.PI / 2);
  const cover = part(f, box(0.14, 0.004, 0.21), '#c9a55f', 0.069, 0.012, 0, { outline: false });
  return { f, left, right, cover };
}
function handsetMesh(g: THREE.Object3D, color = BLACK): THREE.Group {
  const h = group(g);
  part(h, rbox(0.04, 0.03, 0.2, 0.012), color, 0, 0, 0);
  part(h, cyl(0.026, 0.026, 0.024, 12), color, 0, -0.018, 0.09, { outline: false });
  part(h, cyl(0.026, 0.026, 0.024, 12), color, 0, -0.018, -0.09, { outline: false });
  h.rotation.x = 1.25;
  return h;
}
function radioMesh(g: THREE.Object3D): { root: THREE.Group; led: THREE.Mesh } {
  const r = group(g);
  part(r, rbox(0.055, 0.13, 0.03, 0.008), '#22262c', 0, 0, 0);
  part(r, cyl(0.005, 0.006, 0.1, 6), BLACK, 0.016, 0.11, 0, { outline: false });
  part(r, box(0.04, 0.03, 0.002), '#7ad0b0', 0, 0.03, 0.016, { outline: false });
  const led = ownLit(r, ball(0.005), '#2a2f28', -0.018, 0.058, 0.014);
  return { root: r, led };
}
function binoMesh(g: THREE.Object3D): THREE.Group {
  const b = group(g);
  for (const sx of [-1, 1]) {
    part(b, cyl(0.026, 0.026, 0.12, 10), '#2f3540', sx * 0.04, 0, 0, { rx: Math.PI / 2 });
    part(b, cyl(0.03, 0.03, 0.02, 10), BLACK, sx * 0.04, 0, -0.065, { rx: Math.PI / 2, outline: false });
  }
  part(b, box(0.05, 0.022, 0.04), '#3d4450', 0, 0, 0, { outline: false });
  return b;
}
/** A strip of little lamps that twinkle by themselves; `amber` a share of them. */
function lampStrip(g: THREE.Object3D, x: number, y: number, z: number, n: number, gap: number, seed: number) {
  const r = seeded(seed);
  return Array.from({ length: n }, (_, i) => {
    const col = r() < 0.2 ? AMBER : GREEN;
    return { m: ownLit(g, ball(0.0065), col, x + i * gap, y, z), col, ph: r() * 6.3, hz: 0.6 + r() * 3 };
  });
}
function twinkle(strip: ReturnType<typeof lampStrip>, t: number, on = true) {
  for (const l of strip) setLit(l.m, on && Math.sin(t * l.hz + l.ph) > -0.25 ? l.col : '#20262a');
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
  // The staff, in the colours of the workplace's list.
  boss: { top: '#212121', bottom: '#2a2d33', hair: '#1a1a1a', skin: '#eac09a' },
  eunjae: { top: '#546e7a', bottom: '#2f3136', hair: '#2b1b10', skin: '#f8d9c0' },
  haram: { top: '#37474f', bottom: '#32363c', hair: '#5b3a1e', skin: '#c99a6e' },
  visitor: { top: '#a1887f', bottom: '#3a3e45', hair: '#2b1b10', skin: '#eac09a' },
  analyst: { top: '#6c7a89', bottom: '#2c3036', hair: '#1a1a1a', skin: '#f3d0b0' },
};
interface Fig {
  root: THREE.Group;
  head: THREE.Group;
  armL(to: THREE.Vector3 | null): void;
  armR(to: THREE.Vector3 | null): void;
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
/** Someone stood, or sat if `seat` is given. */
function person(parent: THREE.Object3D, look: Look, x: number, z: number, ry: number, gender: 'female' | 'male', seat?: number, seed?: number): Fig {
  const root = group(parent, x, 0, z, ry);
  const sitting = seat !== undefined;
  const base = sitting ? seat + 0.07 - 0.88 : 0;
  if (sitting) {
    for (const sx of [-1, 1]) {
      const ankle = v3(sx * 0.09, 0.08, 0.42);
      const knee = v3(sx * 0.09, seat + 0.03, 0.34);
      rod(root, v3(sx * 0.09, seat + 0.08, -0.08), knee, 0.056, look.bottom);
      rod(root, knee, ankle, 0.045, look.bottom);
      part(root, rbox(0.09, 0.07, 0.2, 0.03), '#37474f', ankle.x, ankle.y - 0.045, ankle.z + 0.04);
    }
    part(root, rbox(0.3, 0.17, 0.2, 0.06), look.bottom, 0, seat + 0.08, -0.08);
  } else {
    for (const sx of [-1, 1]) {
      rod(root, v3(sx * 0.085, 0.84, 0), v3(sx * 0.09, 0.08, 0.01), 0.056, look.bottom);
      part(root, rbox(0.09, 0.07, 0.2, 0.03), '#37474f', sx * 0.09, 0.035, 0.04);
    }
    part(root, rbox(0.3, 0.17, 0.2, 0.06), look.bottom, 0, 0.88, 0);
  }
  const dz = sitting ? -0.08 : 0;
  part(root, rbox(0.34, 0.46, 0.21, 0.08), look.top, 0, base + 1.11, dz);
  part(root, cyl(0.045, 0.05, 0.08, 10), look.skin, 0, base + 1.37, dz, { outline: false });
  const head = group(root, 0, base + 1.51, dz);
  part(head, ball(0.112), look.skin, 0, 0, 0);
  for (const sx of [-1, 1]) part(head, ball(0.012), '#2b2b30', sx * 0.04, 0, 0.104, { outline: false });
  part(head, box(0.03, 0.006, 0.004), '#a1665e', 0, -0.045, 0.104, { outline: false });
  part(head, ball(0.118), look.hair, 0, 0.03, -0.03);
  part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0, 0.075, 0.075, { rx: -0.25 });
  const arm = (sx: number) => {
    const shoulder = v3(sx * 0.2, base + 1.31, dz);
    const restAt = sitting ? v3(sx * 0.11, seat + 0.14, 0.2) : v3(sx * 0.23, 0.82, 0.05);
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
  const f = vroidFigure({ root, head, armL, armR }, {
    gender,
    ...(sitting ? { seat } : {}),
    ...(seed !== undefined ? { seed } : {}),
  });
  root.visible = false;
  return f;
}
function lazy(make: () => Fig) {
  let f: Fig | null = null;
  return { get: () => (f ??= make()), hide: () => f && (f.root.visible = false) };
}

// =============================================================================================
// 분석 단말기 (intelDesk, 1 × 1, drawn wide over the free tiles either side).

function paintLock(c: Ctx2, W: number, H: number) {
  c.fillStyle = '#0b1119';
  c.fillRect(0, 0, W, H);
  text(c, CENTER, W / 2, H * 0.42, H * 0.1, '#46607a', 'center');
  text(c, '잠김 · 출입증을 대세요', W / 2, H * 0.6, H * 0.065, '#34475a', 'center', false);
}
function paintCaseScreen(c: Ctx2, W: number, H: number, d: Case, n: Record<string, number>) {
  c.fillStyle = SCREEN_BG;
  c.fillRect(0, 0, W, H);
  c.fillStyle = '#16263a';
  c.fillRect(0, 0, W, H * 0.13);
  text(c, `사건 ${d.code}`, 8, H * 0.066, H * 0.075, CYAN);
  text(c, d.title, W - 8, H * 0.066, H * 0.055, '#9fb9c9', 'right', false);
  c.strokeStyle = '#2e4258';
  c.lineWidth = 1;
  c.strokeRect(8, H * 0.18, W - 16, H * 0.11);
  const words = `${PLACES[d.a].name} ${PLACES[d.b].name} 접촉 기록`;
  text(c, words.slice(0, Math.ceil(words.length * (n.query ?? 0))) + ((n.query ?? 0) < 1 ? '|' : ''), 14, H * 0.235, H * 0.06, '#d7e5ee', 'left', false);
  const res = n.results ?? 0;
  for (let i = 0; i < 4; i++) {
    if (res * 4 <= i) continue;
    const y = H * (0.34 + i * 0.13);
    c.fillStyle = i === 1 ? 'rgba(245,185,66,0.2)' : 'rgba(111,224,242,0.06)';
    c.fillRect(8, y, W - 16, H * 0.11);
    caseGlyph(c, d, 10, y, H * 0.1);
    text(c, ['우편 기록', '현장 사진 일치', 'CCTV 없음', '제보 1건'][i], 12 + H * 0.12, y + H * 0.055, H * 0.05, i === 1 ? AMBER : '#b9c9d6', 'left', false);
  }
  if ((n.rate ?? 0) > 0.5) {
    c.save();
    c.translate(W * 0.74, H * 0.74);
    c.rotate(-0.16);
    c.strokeStyle = AMBER;
    c.lineWidth = 4;
    c.strokeRect(-W * 0.2, -H * 0.1, W * 0.4, H * 0.2);
    text(c, '신뢰도 B', 0, 0, H * 0.09, AMBER, 'center');
    c.restore();
  }
}
function paintDoc(c: Ctx2, W: number, H: number, d: Case, n: Record<string, number>) {
  c.fillStyle = '#eef1f4';
  c.fillRect(0, 0, W, H);
  c.fillStyle = '#ffffff';
  c.fillRect(W * 0.1, 0, W * 0.8, H);
  text(c, '정보 보고서', W / 2, H * 0.08, H * 0.07, '#1f2a38', 'center');
  text(c, `작전명 ${d.code}`, W * 0.15, H * 0.18, H * 0.05, '#3c4a5a');
  drawBars(c, W * 0.15, H * 0.26, W * 0.7, 10, H * 0.066, H * 0.026, n.doc ?? 0, '#51606f');
  if ((n.sent ?? 0) > 0.5) {
    c.fillStyle = 'rgba(46,125,50,0.92)';
    c.fillRect(W * 0.2, H * 0.42, W * 0.6, H * 0.16);
    text(c, '전송 완료', W / 2, H * 0.5, H * 0.08, '#ffffff', 'center');
  }
}
function paintCall(c: Ctx2, W: number, H: number, talking: boolean, t: number) {
  c.fillStyle = '#1b2733';
  c.fillRect(0, 0, W, H);
  c.fillStyle = '#26394c';
  c.fillRect(0, H * 0.72, W, H * 0.28);
  // A partner in silhouette: the voice is what's wanted. A hat, because it's that sort of game.
  c.fillStyle = '#0e151d';
  c.beginPath();
  c.arc(W / 2, H * 0.44, H * 0.14, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.ellipse(W / 2, H * 0.98, W * 0.28, H * 0.36, 0, Math.PI, 0);
  c.fill();
  c.fillRect(W / 2 - H * 0.2, H * 0.33, H * 0.4, H * 0.025);
  c.fillRect(W / 2 - H * 0.12, H * 0.21, H * 0.24, H * 0.13);
  if (talking) for (let i = 0; i < 9; i++) {
    const hh = H * (0.02 + 0.05 * Math.abs(Math.sin(t * 6 + i)));
    c.fillStyle = GREEN;
    c.fillRect(W * 0.1 + i * W * 0.022, H * 0.9 - hh, W * 0.012, hh);
  }
  text(c, '협력관 L · 음성 변조', W - 6, H * 0.07, H * 0.06, '#cfe0ea', 'right', false);
  c.fillStyle = RED;
  c.beginPath();
  c.arc(10, H * 0.07, 4, 0, Math.PI * 2);
  c.fill();
}
function paintFeed(c: Ctx2, W: number, H: number, i: number, sweep: number) {
  c.fillStyle = SCREEN_BG;
  c.fillRect(0, 0, W, H);
  const items = ['구름시장 · 이상 없음', '시계탑 · 이상 없음', '철교 · 차량 1대 정차', '부두 · 유람선 입항', '등대 · 이상 없음', '박물관 · 우표 무사함', '달동네 · 고양이 소동'];
  for (let k = 0; k < 6; k++) {
    const it = items[((Math.floor(k + i) % items.length) + items.length) % items.length] ?? items[0];
    text(c, `${String(9 + k).padStart(2, '0')}:${String((i * 7 + k * 11) % 60).padStart(2, '0')}`, 6, H * (0.11 + k * 0.16), H * 0.07, CYAN, 'left', false);
    text(c, it, W * 0.26, H * (0.11 + k * 0.16), H * 0.07, it.includes('없음') || it.includes('무사') ? '#a8bccb' : AMBER, 'left', false);
  }
  c.fillStyle = 'rgba(111,224,242,0.12)';
  c.fillRect(0, sweep * H, W, H * 0.04);
}

function intelDesk(g: THREE.Group, out: Built) {
  const T = ID.top;
  const seedC = { v: -1 };
  // The steel desk, long, with a modesty panel, a lockable pedestal each end and a raised rail for the screens.
  part(g, rbox(1.66, 0.04, 0.86, 0.012), '#3a4350', 0, T - 0.02, -0.07);
  part(g, box(1.6, 0.003, 0.8), '#4b5564', 0, T + 0.001, -0.07, { outline: false });
  part(g, box(1.4, 0.52, 0.02), '#2a3039', 0, 0.42, -0.42);
  for (const sx of [-1, 1]) {
    part(g, rbox(0.38, 0.68, 0.72, 0.012), '#2d3540', sx * 0.62, 0.36, -0.08);
    for (let i = 0; i < 3; i++) {
      part(g, box(0.34, 0.19, 0.006), '#3a4350', sx * 0.62, 0.14 + i * 0.21, 0.283, { outline: false });
      part(g, box(0.12, 0.012, 0.014), CHROME, sx * 0.62, 0.2 + i * 0.21, 0.29, { outline: false });
    }
    part(g, cyl(0.012, 0.012, 0.006, 10), AMBER, sx * 0.75, 0.66, 0.289, { rx: Math.PI / 2, outline: false });
  }
  // Three screens: the map to the left, the case in the middle, the feed or the call to the right; a privacy hood over them.
  const center = monitor(g, 0.62, 0.38, 0, 1.06, -0.2, 0, T, 360);
  const left = monitor(g, 0.5, 0.32, -0.57, 1.03, -0.13, 0.42, T);
  const right = monitor(g, 0.5, 0.32, 0.57, 1.03, -0.13, -0.42, T);
  part(g, rbox(0.05, 0.022, 0.03, 0.008), BLACK, 0, 1.267, -0.2, { outline: false });
  // Keyboard, mouse, a mat; the phone; the tray; the pad; the small printer and the stamp; a mug, sticky notes, a little plant.
  keyboard(g, ID.keys);
  part(g, box(0.2, 0.003, 0.2), '#20262e', ID.mouse[0], T + 0.002, ID.mouse[2], { outline: false });
  mouseMesh(g, ID.mouse);
  const PH = ID.phone;
  part(g, rbox(0.17, 0.05, 0.2, 0.014), '#2b2f35', PH[0], T + 0.026, PH[2]);
  for (let i = 0; i < 9; i++) part(g, box(0.018, 0.005, 0.014), '#a4adb6', PH[0] + 0.03 + (i % 3) * 0.024, T + 0.053, PH[2] + 0.01 + Math.floor(i / 3) * 0.022, { outline: false });
  const cradled = handsetMesh(g);
  cradled.position.set(PH[0] - 0.05, T + 0.07, PH[2]);
  cradled.rotation.x = 0;
  const tr = ID.tray;
  part(g, rbox(0.27, 0.012, 0.24, 0.004), '#1e2228', tr[0], T + 0.01, tr[2], { outline: false });
  for (const [dx, dz, w, d] of [[-0.135, 0, 0.008, 0.24], [0.135, 0, 0.008, 0.24], [0, -0.12, 0.27, 0.008]] as const) part(g, box(w, 0.05, d), '#1e2228', tr[0] + dx, T + 0.035, tr[2] + dz, { outline: false });
  const stackF = group(g, tr[0], T + 0.02, tr[2]);
  for (let i = 0; i < 4; i++) part(stackF, box(0.24, 0.007, 0.2), i % 2 ? MANILA : '#c9a55f', 0, i * 0.009, 0, { ry: (i % 3) * 0.04 - 0.04, outline: false });
  label(g, '접수함', 0.09, 0.024, tr[0], T + 0.038, tr[2] + 0.122, '#1e2228', AMBER);
  // The notes pad.
  part(g, box(0.15, 0.006, 0.2), '#f7f4e8', ID.pad[0], T + 0.008, ID.pad[2] - 0.12, { outline: false });
  const notes = liveScreen(g, 0.14, 0.19, ID.pad[0], T + 0.012, ID.pad[2] - 0.12, 120, 0, -Math.PI / 2);
  const PR = ID.print;
  part(g, rbox(0.24, 0.13, 0.3, 0.014), '#dfe2e6', PR[0], T + 0.065, PR[2] - 0.2);
  part(g, box(0.16, 0.004, 0.14), '#2b2f35', PR[0], T + 0.133, PR[2] - 0.22, { outline: false });
  part(g, box(0.2, 0.006, 0.12), '#c9cdd2', PR[0], T + 0.05, PR[2] - 0.0, { outline: false });
  const prLamp = ownLit(g, ball(0.007), '#2a3a2a', PR[0] + 0.09, T + 0.135, PR[2] - 0.08);
  const S = ID.stamp;
  const homeStamp = group(g, S[0], S[1], S[2]);
  part(homeStamp, cyl(0.022, 0.026, 0.04, 10), '#3e2723', 0, 0.02, 0);
  part(homeStamp, ball(0.022), '#3e2723', 0, 0.05, 0, { outline: false });
  part(homeStamp, box(0.05, 0.008, 0.05), RED, 0, 0, 0, { outline: false });
  part(g, cyl(0.04, 0.036, 0.09, 12), '#efe7d6', -0.34, T + 0.045, -0.02);
  part(g, ring(0.024, 0.005), '#efe7d6', -0.385, T + 0.05, -0.02, { outline: false });
  for (const [x, y, col] of [[-0.3, 0.87, '#ffe680'], [0.3, 0.88, '#ffb0a0']] as const) part(g, box(0.05, 0.05, 0.002), col, x, y, -0.178, { outline: false, rz: 0.08 });
  part(g, cyl(0.03, 0.026, 0.05, 10), '#c98b5e', 0.2, T + 0.025, -0.3);
  for (let i = 0; i < 5; i++) part(g, ball(0.024), '#5b8f5b', 0.2 + 0.018 * Math.cos(i * 1.3), T + 0.075 + i * 0.008, -0.3 + 0.018 * Math.sin(i * 1.3), { outline: false });
  const chair = officeChair(g, 0, ID.seat[2]);
  const pen = penMesh(g);
  at(pen, null);
  const penHome = part(g, cyl(0.004, 0.004, 0.14, 6), '#1d2230', ID.pen[0], ID.pen[1], ID.pen[2], { rz: Math.PI / 2 - 0.1, outline: false });
  const markerP = penMesh(g, '#ffe14d');
  const file = folderMesh(g);
  const handset = handsetMesh(g);
  const sheet = group(g);
  part(sheet, box(0.2, 0.002, 0.27), '#fbfbf7', 0, 0, 0, { outline: false });
  const sheetPic = swapPic(sheet, 0.19, 0.26, 0, 0.002, 0, 0, -Math.PI / 2);
  const inked = swapPic(sheet, 0.09, 0.04, 0.03, 0.003, 0.08, 0, -Math.PI / 2);
  inked.set(painted('icStampMark', 90, 40, (c) => {
    c.fillStyle = '#fbfbf7';
    c.fillRect(0, 0, 90, 40);
    c.strokeStyle = RED;
    c.lineWidth = 3;
    c.strokeRect(4, 4, 82, 32);
    text(c, '대외비', 45, 20, 20, RED, 'center');
  }));
  const stampHand = group(g);
  part(stampHand, cyl(0.022, 0.026, 0.04, 10), '#3e2723', 0, 0.02, 0);
  part(stampHand, ball(0.022), '#3e2723', 0, 0.05, 0, { outline: false });
  const photo = group(g);
  const photoPic = swapPic(photo, 0.1, 0.13, 0, 0, 0.002);
  part(photo, box(0.104, 0.134, 0.002), '#fbf8f0', 0, 0, 0, { outline: false });
  const report = group(g);
  part(report, rbox(0.24, 0.3, 0.012, 0.004), MANILA, 0, 0, 0, { outline: false });
  const reportPic = swapPic(report, 0.22, 0.28, 0, 0, 0.008);
  const boss = lazy(() => person(g, LOOKS.boss, ID.boss[0], ID.boss[1], -Math.PI / 2, 'male', undefined, 11));
  const hl = part(g, box(0.14, 0.002, 0.018), '#ffe14d', 0, 0, 0, { outline: false });
  hl.visible = false;

  const spots: Record<string, Spot> = {
    analyzeIntel: seatAt(g, 'icAnalyze', ID.seat),
    writeBriefing: seatAt(g, 'icWrite', ID.seat),
    secretAgent_liaisonReport: seatAt(g, 'icLiaison', ID.seat),
    secretAgent_ownCase: seatAt(g, 'icCase', ID.seat),
  };
  spots['*'] = spots.analyzeIntel;
  out.seat = marker(g, 0, ID.seat[1], ID.seat[2]);
  out.work = marker(g, ID.keys[0], ID.keys[1], ID.keys[2]);

  drive(g, out, spots, (now, N, t) => {
    if (seedC.v < 0) seedC.v = seedOf(g);
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const round = (N?.b.n ?? 0) + seedC.v;
    const d = caseOf(round);
    const key = `${d.code}|${now}`;
    // The chair rolls under whoever's sat at it.
    chair.position.x = N?.st.sit ? N.st.x : 0;
    chair.position.z = N?.st.sit ? N.st.z : ID.seat[2];
    chair.rotation.y = N?.st.sit ? N.st.yaw - Math.PI : 0;
    // The screens.
    if (!now) {
      center.show('lock', paintLock);
      left.show('lock', paintLock);
      right.show('lock', paintLock);
    } else {
      const write = now === 'writeBriefing' || now === 'secretAgent_liaisonReport';
      center.show(`${key}|${q(n.query)}|${q(n.results, 4)}|${q(n.rate, 2)}|${q(n.doc)}|${q(n.sent, 2)}|${q(n.match, 8)}`, (c, W, H) => {
        if (write || now === 'secretAgent_ownCase') {
          paintDoc(c, W, H, d, n);
          if (now === 'secretAgent_ownCase' && (n.match ?? 0) > 0 && (n.doc ?? 0) === 0) {
            paintCaseScreen(c, W, H, d, { query: 1, results: 1 });
            caseGlyph(c, d, W * 0.58, H * 0.24, H * 0.46 * (n.match ?? 0));
            if ((n.match ?? 0) > 0.8) text(c, '일치 96%', W * 0.76, H * 0.86, H * 0.08, GREEN, 'center');
          }
        } else paintCaseScreen(c, W, H, d, n);
      });
      left.show(`${d.code}|${q(n.pin, 12)}`, (c, W, H) => paintMap(c, W, H, { d, pin: now === 'analyzeIntel' ? n.pin ?? 0 : 1 }));
      if ((n.call ?? 0) > 0.5) right.show(`call|${Math.floor(t * 8)}`, (c, W, H) => paintCall(c, W, H, true, t));
      else right.show(`feed|${round}|${Math.floor(t)}`, (c, W, H) => paintFeed(c, W, H, round, (t * 0.3) % 1));
    }
    notes.show(`${d.code}|${q(n.notes, 12)}`, (c, W, H) => {
      c.fillStyle = '#f7f4e8';
      c.fillRect(0, 0, W, H);
      drawBars(c, 8, 12, W - 16, 10, H * 0.09, 2.5, n.notes ?? 0, '#3c4a5a');
    });
    stackF.visible = !P.file;
    // The folder.
    at(file.f, P.file ?? null);
    if (P.file) {
      file.left.set(casePage(round));
      file.right.set(casePage(round + 1));
      file.cover.visible = (n.open ?? 1) < 0.5 && now === 'analyzeIntel';
    }
    hl.visible = !!P.file && now === 'analyzeIntel' && (n.mark ?? 0) > 0.02;
    if (hl.visible && P.file) {
      hl.position.set(P.file[0] - 0.07 + 0.07 * (n.mark ?? 0), P.file[1] + 0.012, P.file[2] - 0.03);
      hl.scale.x = Math.max(0.02, n.mark ?? 0);
    }
    at(markerP, P.marker ?? null);
    at(pen, P.pen ?? null);
    penHome.visible = !P.pen;
    at(handset, P.handset ?? null);
    cradled.visible = !P.handset;
    at(sheet, P.sheet ?? null);
    if (P.sheet) {
      sheetPic.set(casePage(round));
      inked.mesh.visible = (n.stamped ?? 0) > 0.5;
    }
    at(stampHand, P.stamp ?? null);
    homeStamp.visible = !P.stamp;
    setLit(prLamp, (n.printing ?? 0) > 0.02 && (n.printing ?? 0) < 0.9 ? GREEN : '#2a3a2a');
    at(photo, P.photo ?? null);
    if (P.photo) photoPic.set(casePhoto(round));
    at(report, P.report ?? null);
    if (P.report) reportPic.set(casePage(round));
    // The team leader comes for it.
    if (now === 'secretAgent_ownCase' && (n.boss ?? 0) > 0.02) {
      const f = boss.get();
      f.root.visible = true;
      f.root.position.x = ID.boss[0] + 0.5 * (1 - (n.boss ?? 0));
      f.head.rotation.x = 0.1 + (n.bossRead ?? 0) * 0.3 + (n.bossNod ?? 0) * 0.12 * Math.sin(t * 4);
      f.armR(P.report && (n.bossRead ?? 0) > 0.2 ? v3(P.report[0] + 0.03, P.report[1] - 0.02, P.report[2] - 0.1) : null);
      f.armL(P.report && (n.bossRead ?? 0) > 0.2 ? v3(P.report[0] + 0.03, P.report[1] - 0.02, P.report[2] + 0.1) : null);
    } else boss.hide();
  });
}

// =============================================================================================
// 상황실 대형 화면 (situationWall, 2 × 1; the screens spread along the wall either side of the footprint, up out of the way).

function paintSlide(c: Ctx2, W: number, H: number, d: Case, slide: number) {
  if (slide === 0) {
    c.fillStyle = '#10223a';
    c.fillRect(0, 0, W, H);
    text(c, '오늘의 분석 브리핑', W / 2, H * 0.34, H * 0.1, '#ffffff', 'center');
    text(c, `작전명 ${d.code}`, W / 2, H * 0.52, H * 0.08, d.color, 'center');
    text(c, `${CENTER} · 해담시`, W / 2, H * 0.68, H * 0.05, '#9fb9c9', 'center', false);
    return;
  }
  if (slide === 1) {
    paintMap(c, W, H, { d, pin: 1 });
    return;
  }
  c.fillStyle = '#10223a';
  c.fillRect(0, 0, W, H);
  text(c, d.title, W * 0.06, H * 0.1, H * 0.075, '#ffffff');
  caseGlyph(c, d, W * 0.06, H * 0.22, H * 0.46);
  (slide === 2 ? ['접촉 장소 두 곳 확인', '같은 시각, 같은 우산', '다음 접촉은 금요일'] : ['담당 1: 서은재 분석관', '담당 2: 임하람 정보관', '보고: 금요일 오전']).forEach((s, i) => text(c, `• ${s}`, W * 0.36, H * (0.3 + i * 0.14), H * 0.06, '#d7e5ee', 'left', false));
}
function situationWall(g: THREE.Group, out: Built) {
  const Z = SW.z;
  // The frame along the wall.
  part(g, box(3.7, 1.66, 0.07), '#141a22', 0, 1.62, Z - 0.05);
  part(g, box(3.76, 0.05, 0.12), NAVY_L, 0, 2.47, Z - 0.03);
  part(g, box(3.76, 0.05, 0.12), NAVY_L, 0, 0.77, Z - 0.03);
  const main = liveScreen(g, 2.14, 1.46, 0, SW.mainY, Z, 800);
  part(g, box(0.02, 1.5, 0.02), BLACK, -1.09, SW.mainY, Z, { outline: false });
  part(g, box(0.02, 1.5, 0.02), BLACK, 1.09, SW.mainY, Z, { outline: false });
  const panels = [
    liveScreen(g, 0.68, 0.71, -1.45, 1.99, Z, 300),
    liveScreen(g, 0.68, 0.71, -1.45, 1.25, Z, 300),
    liveScreen(g, 0.68, 0.71, 1.45, 1.99, Z, 300),
    liveScreen(g, 0.68, 0.71, 1.45, 1.25, Z, 300),
  ];
  // A red beacon over it, the clock of the office.
  part(g, cyl(0.06, 0.07, 0.03, 14), BLACK, 0, 2.52, Z);
  const beacon = ownLit(g, ball(0.055), '#4a1512', 0, 2.57, Z);
  const clock = liveScreen(g, 0.34, 0.1, -1.45, 2.42, Z + 0.03, 170);
  // The console: a low run of panel along the wall's foot, sloped, keyboards on it, the red phone, the big button, the radio, the log.
  part(g, rbox(2.1, 0.74, 0.5, 0.02), '#2a3340', 0, 0.42, -0.1);
  part(g, rbox(2.2, 0.05, 0.62, 0.016), '#3a4656', 0, SW.consoleTop - 0.025, -0.06);
  for (let i = 0; i < 5; i++) part(g, box(0.34, 0.5, 0.008), '#1f2630', -0.8 + i * 0.4, 0.4, 0.155, { outline: false });
  const strips = [-0.8, -0.4, 0, 0.4, 0.8].map((x, i) => lampStrip(g, x - 0.12, 0.58, 0.163, 8, 0.034, 40 + i));
  [SW.keysL, SW.keysC, SW.keysR].forEach((k) => keyboard(g, k));
  // Small screens set in the console.
  const small = [-0.72, 0, 0.72].map((x) => {
    part(g, rbox(0.36, 0.2, 0.03, 0.008), BLACK, x, 0.95, -0.15, { rx: -0.2 });
    return liveScreen(g, 0.33, 0.17, x, 0.95, -0.132, 240, 0, -0.2);
  });
  const PHN = SW.phone;
  part(g, rbox(0.15, 0.04, 0.17, 0.01), '#7a1d18', PHN[0], SW.consoleTop + 0.02, PHN[2]);
  const redHome = handsetMesh(g, '#b52a22');
  redHome.position.set(PHN[0], SW.consoleTop + 0.056, PHN[2]);
  redHome.rotation.x = 0;
  const BTN = SW.button;
  part(g, cyl(0.06, 0.066, 0.025, 16), '#f0c43a', BTN[0], SW.consoleTop + 0.012, BTN[2], { outline: false });
  const bigBtn = ownLit(g, cyl(0.042, 0.046, 0.03, 16), '#a0201a', BTN[0], SW.consoleTop + 0.036, BTN[2]);
  label(g, '차단', 0.09, 0.03, BTN[0], SW.consoleTop + 0.003, BTN[2] + 0.078, '#f0c43a', '#20242c').rotation.x = -Math.PI / 2;
  const radioHome = radioMesh(g);
  at(radioHome.root, SW.radio);
  part(g, box(0.17, 0.006, 0.23), '#f5f1e6', SW.log[0], SW.consoleTop + 0.003, SW.log[2], { outline: false });
  const logTex = liveScreen(g, 0.16, 0.22, SW.log[0], SW.consoleTop + 0.008, SW.log[2], 130, 0, -Math.PI / 2);
  // In the hands.
  const radio = radioMesh(g);
  const redHand = handsetMesh(g, '#b52a22');
  const pointer = group(g);
  part(pointer, cyl(0.009, 0.009, 0.14, 8), '#555c66', 0, 0, 0, { rx: Math.PI / 2, outline: false });
  const dotMat = new THREE.MeshBasicMaterial({ color: '#ff2a1a', transparent: true, opacity: 0.9 });
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.022, 14), dotMat);
  dot.userData.ownGeometry = dot.userData.ownMaterial = true;
  g.add(dot);
  dot.visible = false;
  const pen = penMesh(g);
  const helper = lazy(() => person(g, LOOKS.eunjae, -0.82, 0.52, Math.PI, 'female', undefined, 22));
  const listeners = [
    lazy(() => person(g, LOOKS.haram, -0.5, 4, Math.PI, 'male', 0.46, 23)),
    lazy(() => person(g, LOOKS.eunjae, 0.5, 4, Math.PI, 'female', 0.46, 24)),
  ];

  const spots: Record<string, Spot> = { monitorSituation: standAt(g, 'icMonitor'), crisisResponse: standAt(g, 'icCrisis'), secretAgent_teamBriefing: standAt(g, 'icTeamBrief', 0.42, 1.28) };
  spots['*'] = spots.monitorSituation;
  out.work = marker(g, 0, SW.consoleTop + 0.03, SW.keysC[2]);
  const seedC = { v: -1 };
  drive(g, out, spots, (now, N, t) => {
    if (seedC.v < 0) seedC.v = seedOf(g);
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const round = (N?.b.n ?? 0) + seedC.v;
    const d = caseOf(round);
    const crisis = now === 'crisisResponse';
    const alarm = crisis && (n.alarm ?? 0) > 0.5;
    const brief = now === 'secretAgent_teamBriefing';
    const clear = n.clear ?? 0;
    // The main wall: at rest a quiet map with the sweep going over it.
    const bucket = alarm ? Math.floor(t * 3) : Math.floor(t * 4);
    const sw = now ? n.sweep ?? (t * 0.08) % 1 : undefined;
    if (brief) main.show(`brief|${d.code}|${n.slide ?? 0}`, (c, W, H) => paintSlide(c, W, H, d, n.slide ?? 0));
    else if (crisis)
      main.show(`crisis|${q(n.block, 40)}|${q(clear, 6)}|${bucket}`, (c, W, H) => {
        paintMap(c, W, H, { alarm: true, block: n.block ?? 0, clear, sweep: sw });
        if ((n.alarm ?? 0) > 0.5 && (n.block ?? 0) < 1 && bucket % 2 === 0) {
          c.fillStyle = 'rgba(229,69,58,0.92)';
          c.fillRect(0, 0, W, H * 0.11);
          text(c, '사이버 공격 징후 — 구름시장 지선', W / 2, H * 0.055, H * 0.06, '#ffffff', 'center');
        }
        c.fillStyle = 'rgba(10,18,28,0.85)';
        c.fillRect(W * 0.2, H * 0.8, W * 0.6, H * 0.12);
        c.fillStyle = (n.block ?? 0) >= 1 ? GREEN : AMBER;
        c.fillRect(W * 0.22, H * 0.84, W * 0.56 * (n.block ?? 0), H * 0.04);
        text(c, clear > 0.3 ? '차단 완료' : `차단 진행 ${Math.round((n.block ?? 0) * 100)}%`, W / 2, H * 0.9, H * 0.04, '#ffffff', 'center');
      });
    else main.show(`quiet|${d.code}|${sw === undefined ? -1 : q(sw, 60)}|${q(n.zoom, 8)}`, (c, W, H) => {
      paintMap(c, W, H, { d, pin: 1, sweep: sw });
      const z = n.zoom ?? 0;
      if (z > 0.02) {
        const p = PLACES[d.a];
        c.strokeStyle = AMBER;
        c.lineWidth = 4;
        c.strokeRect(p.x * W - 90 * z, p.y * H - 60 * z, 180 * z, 120 * z);
        text(c, p.name, p.x * W, p.y * H - 70 * z, 22, AMBER, 'center');
      }
    });
    panels.forEach((s, i) => s.show(`p${i}|${Math.floor(t / 2) + i}|${crisis && (n.block ?? 0) < 1 ? 1 : 0}`, (c, W, H) => paintFeed(c, W, H, i + Math.floor(t / 2), ((t * 0.2 + i * 0.3) % 1))));
    small.forEach((s, i) => {
      const active = n.panel === i + 1;
      s.show(`s${i}|${active ? 1 : 0}|${d.code}|${crisis ? q(n.block, 10) : -1}`, (c, W, H) => {
        if (crisis) {
          c.fillStyle = SCREEN_BG;
          c.fillRect(0, 0, W, H);
          drawBars(c, 8, 8, W - 16, 8, H * 0.1, H * 0.04, n.block ?? 0, GREEN);
          return;
        }
        paintFeed(c, W, H, i + round, active ? 0.5 : 0.1);
        if (active) {
          c.strokeStyle = CYAN;
          c.lineWidth = 3;
          c.strokeRect(2, 2, W - 4, H - 4);
        }
      });
    });
    clock.show(`${Math.floor(t)}`, (c, W, H) => {
      c.fillStyle = '#0a0d10';
      c.fillRect(0, 0, W, H);
      const s = Math.floor(t) % 3600;
      text(c, `해담 ${String(14 + Math.floor(s / 60) % 8).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`, W / 2, H / 2, H * 0.6, alarm ? RED : GREEN, 'center');
    });
    strips.forEach((st) => twinkle(st, t));
    setLit(beacon, alarm && Math.sin(t * 10) > 0 ? '#ff3b2a' : clear > 0.1 ? GREEN : '#4a1512');
    bigBtn.position.y = SW.consoleTop + 0.036 - 0.014 * (n.pressed ?? 0);
    setLit(bigBtn, (n.pressed ?? 0) > 0.2 ? '#ff5a4a' : '#a0201a');
    logTex.show(`${q(n.logged, 12)}`, (c, W, H) => {
      c.fillStyle = '#f5f1e6';
      c.fillRect(0, 0, W, H);
      text(c, '상황 일지', 8, 12, 14, '#20242c');
      drawBars(c, 8, 30, W - 16, 10, 16, 3, 0.6 + 0.4 * (n.logged ?? 0), '#51606f');
    });
    at(radio.root, P.radio ?? null);
    radioHome.root.visible = !P.radio;
    setLit(radio.led, P.radio ? GREEN : '#2a2f28');
    at(redHand, P.handset ?? null);
    redHome.visible = !P.handset;
    at(pointer, P.pointer ?? null);
    at(pen, P.pen ?? null);
    if (P.pointer && P.dot) pointer.lookAt(pointer.parent!.localToWorld(tmp.set(P.dot[0], P.dot[1], P.dot[2])));
    dot.visible = !!P.dot;
    if (P.dot) dot.position.set(P.dot[0], P.dot[1], P.dot[2] + 0.004);
    // The colleague at the keys; the two listening from the far side of the table.
    if (crisis) {
      const f = helper.get();
      f.root.visible = true;
      const typing = (n.helperType ?? 0) > 0.5;
      f.armL(typing ? v3(-0.9, 0.9 + 0.01 * Math.sin(t * 18), 0.14) : null);
      f.armR(typing ? v3(-0.74, 0.9 + 0.01 * Math.sin(t * 21), 0.14) : (n.cheer ?? 0) > 0.5 ? v3(-1.02, 1.62, 0.5) : null);
      f.head.rotation.x = typing ? 0.28 : -0.05;
    } else helper.hide();
    if (brief) {
      listeners.forEach((L, i) => {
        const f = L.get();
        f.root.visible = true;
        f.head.rotation.x = (n.nods ?? 0) > 0.5 ? 0.12 + 0.12 * Math.sin(t * 3.4 + i) : -0.05;
        f.head.rotation.y = 0.1 * (i ? -1 : 1) + ((n.slide ?? 0) === 0 ? -0.35 : 0);
        const up = i === 0 && (n.hand ?? 0) > 0.5;
        f.armR(up ? v3(-0.66, 1.48, 3.92) : null);
        f.armL(null);
      });
    } else listeners.forEach((L) => L.hide());
  });
}

// =============================================================================================
// 사이버 보안 단말기 (cyberTerminal, 1 × 1): a short rack behind a low desk with its two green screens.

function paintGraph(c: Ctx2, W: number, H: number, round: number, hop: number, done: boolean) {
  c.fillStyle = '#071410';
  c.fillRect(0, 0, W, H);
  const r = seeded(round * 37 + 11);
  const pts = Array.from({ length: 9 }, (_, i) => [W * (0.08 + 0.84 * (i / 8)), H * (0.16 + 0.68 * r())] as const);
  c.strokeStyle = 'rgba(74,224,122,0.2)';
  c.lineWidth = 1;
  c.beginPath();
  pts.forEach((p, i) => {
    for (const j of [i + 1, i + 3]) if (pts[j]) {
      c.moveTo(p[0], p[1]);
      c.lineTo(pts[j][0], pts[j][1]);
    }
  });
  c.stroke();
  const at = hop * (pts.length - 1);
  c.strokeStyle = done ? RED : GREEN;
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    if (at >= i) c.lineTo(pts[i][0], pts[i][1]);
    else if (at > i - 1) {
      const e = at - (i - 1);
      c.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * e, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * e);
    }
  }
  c.stroke();
  pts.forEach((p, i) => {
    c.fillStyle = at >= i ? '#b6ffcf' : '#2c5a42';
    c.beginPath();
    c.arc(p[0], p[1], at >= i ? 5 : 3, 0, Math.PI * 2);
    c.fill();
  });
  text(c, '접속 경로 추적', 6, H * 0.08, H * 0.07, GREEN);
  if (done) {
    const p = pts[pts.length - 1];
    c.strokeStyle = RED;
    c.lineWidth = 3;
    c.strokeRect(p[0] - 14, p[1] - 14, 28, 28);
    text(c, '구름시장 PC방', W - 6, Math.min(H - 12, p[1] + 26), H * 0.07, RED, 'right');
  }
}
function paintTerm(c: Ctx2, W: number, H: number, lines: string[], u: number) {
  c.fillStyle = '#050c09';
  c.fillRect(0, 0, W, H);
  const shown = Math.ceil(lines.length * u);
  lines.slice(0, shown).forEach((s, i) => text(c, s, 8, H * (0.08 + i * 0.105), H * 0.066, s.includes('차단') || s.includes('완료') ? '#baffcf' : s.includes('!') ? AMBER : GREEN, 'left', false));
}
const TRACE_LINES = ['> scan --zone haedam', '접속 시도 41건 수집', '! 수상한 접속 1건', '> trace 7f.3a', '경유지 1 ... 2 ... 3', '> 출발지 확인', '> block 7f.3a', '차단 규칙 적용 완료'];
const PATCH_LINES = ['> audit --all', '! 인증 모듈 v2 취약', '인쇄 서버 정상', '메일 게이트 정상', '! 보드 1번 교체 필요', '> install 모듈 v3', '> reboot', '점검 완료 · 이상 없음'];
function cyberTerminal(g: THREE.Group, out: Built) {
  const T = 0.74;
  // The rack behind, filling the tile's back: panels, lamps, a bay with a module that pulls out, fans.
  part(g, rbox(1.0, 1.82, 0.28, 0.012), '#1c2026', 0, 0.91, -0.34);
  part(g, box(0.92, 1.68, 0.006), '#2b3038', 0, 0.94, -0.197, { outline: false });
  const rows: Array<ReturnType<typeof lampStrip>> = [];
  [1.74, 1.6, 1.46].forEach((y, i) => {
    part(g, box(0.86, 0.1, 0.006), '#3a414b', 0, y, -0.192, { outline: false });
    rows.push(lampStrip(g, -0.38, y, -0.186, 16, 0.05, 70 + i));
  });
  label(g, '해담망 코어', 0.17, 0.04, -0.36, 1.19, -0.188, '#2b3038', CYAN);
  // The module bay on the left of the rack; the spare beside the keyboard.
  const B = CT.bay;
  part(g, box(0.18, 0.13, 0.01), '#101318', B[0], B[1], -0.19, { outline: false });
  const module = group(g, B[0], B[1], B[2]);
  part(module, rbox(0.15, 0.1, 0.09, 0.006), '#39424e', 0, 0, 0);
  part(module, box(0.09, 0.012, 0.012), CHROME, 0, -0.03, 0.05, { outline: false });
  const modLamp = ownLit(module, ball(0.01), RED, 0.05, 0.03, 0.048);
  // Desk.
  part(g, rbox(1.02, 0.04, 0.66, 0.012), '#2c3540', 0, T - 0.02, 0.03);
  for (const sx of [-1, 1]) part(g, box(0.04, T - 0.04, 0.6), '#232a33', sx * 0.47, (T - 0.04) / 2, 0.02);
  part(g, box(0.9, 0.34, 0.02), '#1c2026', 0, 0.48, -0.2);
  const lower = monitor(g, 0.74, 0.3, 0, 0.93, -0.06, 0, T, 400);
  const upper = liveScreen(g, 0.56, 0.3, 0.17, 1.28, -0.178, 320);
  part(g, box(0.6, 0.34, 0.012), BLACK, 0.17, 1.28, -0.186, { outline: false });
  keyboard(g, CT.keys);
  mouseMesh(g, CT.mouse);
  // The hardware key, its slot; a sticker; a mug of pens; the cable to the rack.
  const K = CT.token;
  part(g, rbox(0.12, 0.05, 0.1, 0.008), '#262b32', K[0], T + 0.025, K[2]);
  const keyLamp = ownLit(g, ball(0.007), '#2a3a2a', K[0] + 0.03, T + 0.054, K[2] + 0.03);
  part(g, box(0.1, 0.05, 0.002), '#f2f2ee', 0.36, 1.02, -0.042, { outline: false, rz: 0.1 });
  part(g, cyl(0.035, 0.03, 0.09, 12), '#3a414b', 0.38, T + 0.045, 0.1);
  for (let i = 0; i < 3; i++) part(g, cyl(0.004, 0.004, 0.13, 6), ['#c9352e', '#2d6fa3', '#d9a63a'][i], 0.37 + i * 0.012, T + 0.09, 0.1, { rz: 0.1 - i * 0.08, outline: false });
  rod(g, v3(-0.26, T + 0.05, 0.14), v3(-0.3, T + 0.02, -0.15), 0.004, '#d3302f');
  rod(g, v3(-0.3, T + 0.02, -0.15), v3(-0.3, 1.0, -0.2), 0.004, '#d3302f');
  const chair = officeChair(g, 0, CT.seat[2]);
  const stick = group(g);
  part(stick, rbox(0.03, 0.012, 0.07, 0.004), '#d9a63a', 0, 0, 0, { outline: false });
  const spare = group(g);
  part(spare, rbox(0.15, 0.1, 0.09, 0.006), '#52627a', 0, 0, 0);

  const spots: Record<string, Spot> = { traceHacker: seatAt(g, 'icTrace', CT.seat), secretAgent_patchVuln: seatAt(g, 'icPatch', CT.seat) };
  spots['*'] = spots.traceHacker;
  out.seat = marker(g, 0, CT.seat[1], CT.seat[2]);
  out.work = marker(g, CT.keys[0], CT.keys[1], CT.keys[2]);
  const seedC = { v: -1 };
  drive(g, out, spots, (now, N, t) => {
    if (seedC.v < 0) seedC.v = seedOf(g);
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const round = (N?.b.n ?? 0) + seedC.v;
    const trace = now === 'traceHacker';
    const patch = now === 'secretAgent_patchVuln';
    if (trace) {
      const u = (n.scan ?? 0) * 0.4 + (n.pin ?? 0) * 0.2 + (n.block ?? 0) * 0.4;
      lower.show(`t|${q(u, 16)}`, (c, W, H) => paintTerm(c, W, H, TRACE_LINES, u));
      upper.show(`g|${round}|${q(n.hop, 40)}|${(n.block ?? 0) > 0.5 ? 1 : 0}`, (c, W, H) => paintGraph(c, W, H, round, n.hop ?? 0, (n.block ?? 0) > 0.5));
    } else if (patch) {
      const u = (n.list ?? 0) * 0.62 + (n.boot ?? 0) * 0.38;
      lower.show(`p|${q(u, 16)}`, (c, W, H) => paintTerm(c, W, H, PATCH_LINES, u));
      upper.show(`b|${q(n.boot, 12)}|${q(n.fixed, 2)}`, (c, W, H) => {
        c.fillStyle = '#071410';
        c.fillRect(0, 0, W, H);
        text(c, '점검 목록', 8, H * 0.1, H * 0.09, GREEN);
        ['인증 모듈', '인쇄 서버', '메일 게이트', '보드 1번'].forEach((s, i) => {
          const fix = (i === 0 || i === 3) && (n.fixed ?? 0) < 0.5;
          text(c, `${fix ? '✕' : '✓'} ${s}`, 10, H * (0.28 + i * 0.17), H * 0.1, fix ? RED : '#baffcf', 'left', false);
        });
        c.fillStyle = 'rgba(74,224,122,0.3)';
        c.fillRect(W * 0.5, H * 0.74, W * 0.44 * (n.boot ?? 0), H * 0.08);
      });
    } else {
      lower.show('idle', (c, W, H) => paintTerm(c, W, H, ['해담망 감시 중 ...', '이상 없음'], 1));
      upper.show(`idle|${seedC.v}`, (c, W, H) => paintGraph(c, W, H, seedC.v, 0, false));
    }
    rows.forEach((r) => twinkle(r, t));
    // The module: out in the hands, its lamp red until the new one's in.
    if (P.module) module.position.set(P.module[0], P.module[1], P.module[2]);
    else module.position.set(B[0], B[1], B[2]);
    setLit(modLamp, patch ? ((n.fixed ?? 0) > 0.5 ? GREEN : RED) : GREEN);
    spare.visible = patch && (n.out ?? 0) > 0.05;
    if (spare.visible) spare.position.set(CT.home[0], CT.home[1] + 0.05, CT.home[2]);
    at(stick, P.stick ?? null);
    setLit(keyLamp, (n.token ?? 0) > 0.5 && trace ? GREEN : '#2a3a2a');
    chair.position.set(N?.st.sit ? N.st.x : 0, 0, N?.st.sit ? N.st.z : CT.seat[2]);
  });
}

// =============================================================================================
// 단서 보드 (icEvidenceBoard, 2 × 1): cork the width of the footprint under its own light, a ledge at the foot, thread.

function threadMesh(g: THREE.Object3D, color = THREAD) {
  const m = part(g, cyl(0.0035, 0.0035, 1, 5), color, 0, 0, 0, { outline: false, shadow: false });
  const d = new THREE.Vector3();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  return {
    m,
    lay(p: V, r: V) {
      a.set(p[0], p[1], p[2]);
      b.set(r[0], r[1], r[2]);
      d.subVectors(b, a);
      m.position.copy(a).addScaledVector(d, 0.5);
      m.scale.set(1, Math.max(0.001, d.length()), 1);
      m.quaternion.setFromUnitVectors(UP, d.normalize());
    },
  };
}
function pin(g: THREE.Object3D, p: V) {
  part(g, ball(0.012), RED, p[0], p[1], p[2] + 0.006, { outline: false });
}
function evidenceBoard(g: THREE.Group, out: Built) {
  const Z = EB.z;
  part(g, box(2.08, 1.42, 0.05), CORK, 0, 1.44, Z - 0.03);
  for (const [w, h, y] of [[2.14, 0.05, 2.16], [2.14, 0.05, 0.72]] as const) part(g, box(w, h, 0.09), WOOD_D, 0, y, Z - 0.02);
  for (const sx of [-1, 1]) part(g, box(0.05, 1.49, 0.09), WOOD_D, sx * 1.05, 1.44, Z - 0.02);
  for (const sx of [-1, 1]) part(g, box(0.05, 0.7, 0.05), WOOD_D, sx * 1.0, 0.36, Z);
  const speck = painted('icCork', 256, 180, (c) => {
    c.fillStyle = CORK;
    c.fillRect(0, 0, 256, 180);
    const r = seeded(7);
    for (let i = 0; i < 700; i++) {
      c.fillStyle = r() < 0.5 ? 'rgba(90,60,30,0.3)' : 'rgba(230,200,150,0.3)';
      c.fillRect(r() * 256, r() * 180, 1 + r() * 2, 1 + r() * 2);
    }
  });
  picture(g, speck, 2.06, 1.4, 0, 1.44, Z, '#ffffff');
  // What's up there: the city map in the middle, four of the cases, receipts, sticky notes, a list of questions.
  const mapTex = painted('icBoardMap', 400, 280, (c) => paintMap(c, 400, 280, { dark: false }));
  picture(g, mapTex, 0.66, 0.46, -0.06, 1.46, Z + 0.006);
  pin(g, [-0.06, 1.68, Z]);
  const fixed: Array<{ p: V; i: number }> = [
    { p: [-0.78, 1.82, Z], i: 0 },
    { p: [-0.78, 1.14, Z], i: 2 },
    { p: [0.74, 1.14, Z], i: 3 },
    { p: [0.8, 1.84, Z], i: 4 },
  ];
  for (const { p, i } of fixed) {
    picture(g, casePhoto(i), 0.2, 0.25, p[0], p[1], p[2] + 0.008);
    pin(g, [p[0], p[1] + 0.11, p[2] + 0.01]);
  }
  const fromTex = casePhoto(1);
  picture(g, fromTex, 0.2, 0.25, EB.from[0], EB.from[1] - 0.12, Z + 0.008);
  pin(g, [EB.from[0], EB.from[1], Z + 0.01]);
  for (const [x, y, col, s] of [[-0.36, 1.92, '#ffe680', '누가?'], [0.34, 1.96, '#a8e6a0', '금요일?'], [0.26, 1.02, '#ffb0a0', '우산!']] as const) {
    part(g, box(0.13, 0.13, 0.002), col, x, y, Z + 0.008, { outline: false, rz: 0.06 });
    label(g, s, 0.11, 0.05, x, y, Z + 0.011, col, '#3c2a1c');
  }
  const receipt = painted('icReceipt', 80, 180, (c) => {
    c.fillStyle = '#fbfaf3';
    c.fillRect(0, 0, 80, 180);
    text(c, '구름시장', 40, 14, 12, '#333', 'center');
    drawBars(c, 8, 30, 64, 12, 11, 3, 1, '#777');
    text(c, '붕어빵 3,000', 40, 168, 10, '#333', 'center', false);
  });
  picture(g, receipt, 0.09, 0.2, 0.42, 1.28, Z + 0.008);
  pin(g, [0.42, 1.37, Z + 0.01]);
  // Threads that are always there.
  const tie = (a: V, b: V) => threadMesh(g).lay(add(a, 0, 0, 0.014), add(b, 0, 0, 0.014));
  tie([-0.78, 1.93, Z], [-0.06, 1.68, Z]);
  tie([-0.06, 1.68, Z], [0.8, 1.95, Z]);
  tie([-0.78, 1.25, Z], EB.from);
  tie([0.74, 1.25, Z], [0.42, 1.37, Z]);
  tie([-0.06, 1.68, Z], [0.42, 1.37, Z]);
  // The wrong thread, to come off; the new one and its photo.
  const wrong = threadMesh(g);
  pin(g, EB.wrongA);
  const wrongPin = part(g, ball(0.012), RED, EB.wrongB[0], EB.wrongB[1], EB.wrongB[2] + 0.006, { outline: false });
  const fresh = threadMesh(g);
  const hung = swapPic(g, 0.2, 0.25, EB.slot[0], EB.slot[1] - 0.12, Z + 0.008);
  const hungPin = part(g, ball(0.012), '#2d6fa3', EB.slot[0], EB.slot[1], Z + 0.012, { outline: false });
  const sticky = group(g);
  part(sticky, box(0.1, 0.1, 0.002), '#7fe0f2', 0, 0, 0, { outline: false });
  const stuck = part(g, box(0.1, 0.1, 0.002), '#7fe0f2', -0.26, 1.6, Z + 0.008, { outline: false, rz: -0.05 });
  // The ledge: pins in a tin, the spool of thread, tape, a stack of photos.
  part(g, box(2.06, 0.04, 0.34), WOOD, 0, EB.ledge[1] - 0.04, -0.24);
  const spoolHome = group(g, EB.spool[0], EB.spool[1], EB.spool[2]);
  part(spoolHome, cyl(0.035, 0.035, 0.06, 12), THREAD, 0, 0, 0);
  part(spoolHome, cyl(0.045, 0.045, 0.006, 12), WOOD, 0, -0.034, 0, { outline: false });
  part(g, cyl(0.04, 0.04, 0.02, 12), '#c4c9cf', -0.5, EB.ledge[1] - 0.01, -0.22);
  for (let i = 0; i < 5; i++) part(g, ball(0.006), [RED, '#2d6fa3', '#f0c43a'][i % 3], -0.5 + 0.02 * Math.cos(i * 1.4), EB.ledge[1] + 0.003, -0.22 + 0.02 * Math.sin(i * 1.4), { outline: false });
  part(g, cyl(0.03, 0.03, 0.022, 12), '#efe2a0', 0.22, EB.ledge[1] - 0.008, -0.22);
  for (let i = 0; i < 4; i++) part(g, box(0.1, 0.002, 0.125), '#fbf8f0', EB.ledge[0], EB.ledge[1] - 0.016 + i * 0.003, EB.ledge[2], { ry: i * 0.05, outline: false });
  // A bar light over it.
  part(g, box(1.7, 0.03, 0.05), BLACK, 0, 2.26, Z + 0.1);
  rod(g, v3(-0.8, 2.26, Z - 0.05), v3(-0.8, 2.26, Z + 0.1), 0.006, BLACK);
  rod(g, v3(0.8, 2.26, Z - 0.05), v3(0.8, 2.26, Z + 0.1), 0.006, BLACK);
  ownLit(g, box(1.6, 0.006, 0.03), '#fff3d0', 0, 2.242, Z + 0.1);
  label(g, '해담시 미해결 건', 0.76, 0.1, 0, 2.08, Z + 0.008, CORK, '#3a2614');
  // In the hands.
  const photo = group(g);
  part(photo, box(0.21, 0.26, 0.002), '#fbf8f0', 0, 0, 0, { outline: false });
  const photoPic = swapPic(photo, 0.2, 0.25, 0, 0, 0.002);
  const spool = group(g);
  part(spool, cyl(0.035, 0.035, 0.06, 12), THREAD, 0, 0, 0);
  const mate = lazy(() => person(g, LOOKS.haram, 0.58, 0.32, -2.45, 'male', undefined, 31));

  const spots: Record<string, Spot> = { icPinThread: standAt(g, 'icPin', 0.3), icReviewBoard: standAt(g, 'icReview', 0.3) };
  spots['*'] = spots.icPinThread;
  out.work = marker(g, 0, 1.4, Z + 0.06);
  const seedC = { v: -1 };
  drive(g, out, spots, (now, N, t) => {
    if (seedC.v < 0) seedC.v = seedOf(g);
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const round = (N?.b.n ?? 0) + seedC.v;
    const pinning = now === 'icPinThread';
    const review = now === 'icReviewBoard';
    // The new photo stays up until the next round takes it down to read.
    const showHung = pinning ? (n.placed ?? 0) > 0.5 : true;
    hung.mesh.visible = showHung;
    hungPin.visible = showHung;
    hung.set(casePhoto(round));
    const threadU = pinning ? n.thread ?? 0 : 1;
    fresh.m.visible = threadU > 0.02;
    if (fresh.m.visible) {
      const e: V = [EB.from[0] + (EB.slot[0] - EB.from[0]) * threadU, EB.from[1] + (EB.slot[1] - EB.from[1]) * threadU, EB.slot[2] + 0.016];
      fresh.lay([EB.from[0], EB.from[1], EB.slot[2] + 0.016], e);
    }
    stuck.visible = !pinning || (n.note ?? 0) > 0.5;
    at(sticky, P.sticky ?? null);
    // The wrong thread, its loose end following the hand in; it's back up by the next look.
    const off = review ? n.off ?? 0 : 0;
    wrong.m.visible = off < 0.98;
    wrongPin.visible = off < 0.5;
    wrong.lay(add(EB.wrongA, 0, 0, 0.014), [EB.wrongB[0] + (EB.wrongA[0] - EB.wrongB[0]) * off, EB.wrongB[1] + (EB.wrongA[1] - EB.wrongB[1]) * off, EB.wrongB[2] + 0.014]);
    at(photo, P.photo ?? null);
    if (P.photo) photoPic.set(casePhoto(round));
    at(spool, P.spool ?? null);
    spoolHome.visible = !P.spool;
    if (review) {
      const f = mate.get();
      f.root.visible = true;
      const up = (n.matePoint ?? 0) > 0.5;
      f.armR(up ? v3(0.36 + 0.06 * Math.sin(t * 3), 1.42, -0.1) : null);
      f.armL((n.mateNod ?? 0) > 0.5 ? v3(0.3, 1.14 + 0.03 * Math.sin(t * 4), 0.56) : null);
      f.head.rotation.x = (n.mateNod ?? 0) > 0.5 ? 0.14 * Math.sin(t * 4) : -0.06;
    } else mate.hide();
  });
}

// =============================================================================================
// 신호 청취석 (icSignalDesk, 1 × 1): low, so as not to hide the desks: receivers along the back of a console, a scope,
// a reel recorder, the tuning dial, the headset on its hook.

function signalDesk(g: THREE.Group, out: Built) {
  const T = 0.74;
  part(g, rbox(1.4, 0.04, 0.8, 0.012), '#46525f', 0, T - 0.02, -0.05);
  part(g, box(1.3, 0.5, 0.02), '#2e3640', 0, 0.42, -0.4);
  for (const sx of [-1, 1]) part(g, rbox(0.34, 0.68, 0.7, 0.012), '#303a45', sx * 0.52, 0.36, -0.06);
  // Back row: the receiver stack.
  part(g, rbox(1.34, 0.42, 0.24, 0.012), '#37414d', 0, T + 0.21, -0.32);
  part(g, box(1.28, 0.36, 0.006), '#232a33', 0, T + 0.21, -0.197, { outline: false });
  // The scope with its live trace, and a list of what's been decoded.
  const scope = liveScreen(g, 0.52, 0.28, -0.26, T + 0.21, -0.19, 300);
  const dec = liveScreen(g, 0.48, 0.28, 0.32, T + 0.21, -0.19, 300);
  part(g, box(0.54, 0.3, 0.004), BLACK, -0.26, T + 0.21, -0.193, { outline: false });
  part(g, box(0.5, 0.3, 0.004), BLACK, 0.32, T + 0.21, -0.193, { outline: false });
  label(g, '신호 청취', 0.26, 0.04, 0.54, T + 0.385, -0.196, '#37414d', CYAN);
  // The reels turning on the left of the desktop.
  const reels: THREE.Group[] = [];
  part(g, rbox(0.3, 0.04, 0.2, 0.01), '#22272e', -0.54, T + 0.02, -0.02);
  for (const dx of [-0.07, 0.07]) {
    const r = group(g, -0.54 + dx, T + 0.05, -0.02);
    part(r, cyl(0.055, 0.055, 0.01, 18), '#c9ced3', 0, 0, 0);
    for (let i = 0; i < 3; i++) part(r, box(0.012, 0.003, 0.05), '#22272e', Math.cos((i * 2 * Math.PI) / 3) * 0.025, 0.006, Math.sin((i * 2 * Math.PI) / 3) * 0.025, { ry: -(i * 2 * Math.PI) / 3 + Math.PI / 2, outline: false });
    reels.push(r);
  }
  const recLamp = ownLit(g, ball(0.008), '#3a1512', -0.42, T + 0.05, 0.07);
  // The dial and its faders; a keyboard; the pad; the code book, its pages.
  const D = SD.dial;
  part(g, rbox(0.34, 0.03, 0.18, 0.01), '#22272e', D[0] + 0.1, T + 0.015, D[2]);
  const knob = group(g, D[0], T + 0.03, D[2]);
  part(knob, cyl(0.05, 0.055, 0.04, 18), '#b8bfc6', 0, 0.02, 0);
  part(knob, box(0.008, 0.004, 0.04), RED, 0, 0.042, 0.022, { outline: false });
  for (let i = 0; i < 3; i++) part(g, box(0.014, 0.006, 0.09), '#c9ced3', D[0] + 0.1 + i * 0.05, T + 0.033, D[2], { outline: false });
  keyboard(g, SD.keys, 0.3);
  const P0 = SD.pad;
  part(g, box(0.16, 0.006, 0.2), '#f6f2e4', P0[0] - 0.05, T + 0.008, P0[2] - 0.13, { outline: false });
  const pad = liveScreen(g, 0.15, 0.19, P0[0] - 0.05, T + 0.012, P0[2] - 0.13, 120, 0, -Math.PI / 2);
  const B = SD.book;
  part(g, rbox(0.26, 0.03, 0.2, 0.004), '#7a1d18', B[0], T + 0.018, B[2]);
  const bookTex = painted('icCodeBook', 180, 140, (c) => {
    c.fillStyle = '#f6f2e4';
    c.fillRect(0, 0, 180, 140);
    c.fillStyle = '#ccc';
    c.fillRect(89, 0, 2, 140);
    text(c, '암호 대조표', 44, 14, 12, '#20242c', 'center');
    ['■■ 붕어빵', '■· 우산', '·■ 시계', '·· 금요일'].forEach((s, i) => text(c, s, 8, 40 + i * 24, 12, '#3c4a5a', 'left', false));
    drawBars(c, 98, 14, 74, 10, 11, 3, 1, '#6a7078');
  });
  picture(g, bookTex, 0.25, 0.19, B[0], T + 0.036, B[2], '#ffffff', 0, -Math.PI / 2);
  // The hook for the headset, on the end of the receiver stack.
  const H0 = SD.hook;
  part(g, cyl(0.04, 0.05, 0.02, 12), '#22272e', H0[0], T + 0.01, H0[2]);
  part(g, cyl(0.007, 0.007, H0[1] + 0.09 - T, 8), CHROME, H0[0], (H0[1] + 0.09 + T) / 2, H0[2], { outline: false });
  // The headset itself.
  const headset = group(g);
  part(headset, ring(0.112, 0.012, Math.PI), BLACK, 0, 0, 0);
  for (const sx of [-1, 1]) part(headset, cyl(0.045, 0.045, 0.032, 14), '#2d6fa3', sx * 0.115, -0.01, 0, { rz: Math.PI / 2 });
  officeChair(g, 0, SD.seat[2]);
  const pen = penMesh(g);

  const spots: Record<string, Spot> = { icDecodeSignal: seatAt(g, 'icDecode', SD.seat) };
  spots['*'] = spots.icDecodeSignal;
  out.seat = marker(g, 0, SD.seat[1], SD.seat[2]);
  out.work = marker(g, SD.keys[0], SD.keys[1], SD.keys[2]);
  const seedC = { v: -1 };
  drive(g, out, spots, (now, N, t) => {
    if (seedC.v < 0) seedC.v = seedOf(g);
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const round = (N?.b.n ?? 0) + seedC.v;
    const d = caseOf(round);
    const using = !!now;
    const tune = using ? n.tune ?? 0 : 0;
    scope.show(`${Math.floor(t * 12)}|${q(tune, 12)}`, (c, W, H) => {
      c.fillStyle = '#04100c';
      c.fillRect(0, 0, W, H);
      c.strokeStyle = 'rgba(74,224,122,0.18)';
      c.lineWidth = 1;
      for (let i = 1; i < 6; i++) {
        c.beginPath();
        c.moveTo((W * i) / 6, 0);
        c.lineTo((W * i) / 6, H);
        c.stroke();
      }
      const peak = 0.1 + 0.4 * tune;
      c.strokeStyle = GREEN;
      c.lineWidth = 2;
      c.beginPath();
      for (let x = 0; x <= W; x += 4) {
        const u = x / W;
        const bump = Math.exp(-Math.pow((u - peak) * 14, 2));
        const y = H * (0.86 - (using ? 0.72 * bump * (0.35 + 0.65 * tune) : 0) - 0.05 * Math.abs(Math.sin(u * 40 + t * 7)));
        if (x === 0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
      c.strokeStyle = 'rgba(245,185,66,0.7)';
      c.beginPath();
      c.moveTo(W * 0.5, 0);
      c.lineTo(W * 0.5, H);
      c.stroke();
      text(c, `${(146.2 + tune * 3.3).toFixed(1)} MHz`, 6, H * 0.1, H * 0.09, tune > 0.95 ? GREEN : AMBER);
    });
    const w = n.words ?? 0;
    dec.show(`${d.code}|${q(w, 18)}|${using ? 1 : 0}`, (c, W, H) => {
      c.fillStyle = '#0b131c';
      c.fillRect(0, 0, W, H);
      text(c, '해독 결과', 8, H * 0.1, H * 0.08, CYAN);
      if (!using) return;
      text(c, `작전명 ${d.code}`, 8, H * 0.28, H * 0.07, '#9fb9c9', 'left', false);
      text(c, `"${d.signal.slice(0, Math.ceil(d.signal.length * w))}${w < 1 ? '_' : '"'}`, 8, H * 0.54, H * 0.083, '#e8f3f8', 'left');
    });
    pad.show(`${q(n.dots, 24)}`, (c, W, H) => {
      c.fillStyle = '#f6f2e4';
      c.fillRect(0, 0, W, H);
      const r = seeded(9);
      const count = Math.floor((n.dots ?? 0) * 40);
      c.fillStyle = '#20242c';
      for (let i = 0; i < count; i++) {
        const x = 8 + (i % 10) * 10;
        const y = 12 + Math.floor(i / 10) * 18;
        if (r() < 0.5) c.fillRect(x, y, 6, 2.5);
        else c.fillRect(x + 1, y, 2.5, 2.5);
      }
    });
    const rec = (n.rec ?? 0) > 0.5;
    if (rec) for (const r of reels) r.rotation.y = t * 3;
    setLit(recLamp, rec && Math.sin(t * 6) > -0.3 ? '#ff3b2a' : '#3a1512');
    if (using) knob.rotation.y = -tune * 5;
    at(headset, P.headset ?? null, SD.hook);
    at(pen, P.pen ?? null);
  });
}

// =============================================================================================
// 보안 문서 금고 (icDocSafe, 1 × 1): a heavy door on the left hinge with a dial and a wheel, folders inside, a log on its side.

function docSafe(g: THREE.Group, out: Built) {
  const GREEN_S = '#3e5346';
  const GREEN_D = '#2a3a30';
  const Hh = 1.3;
  const hx = -0.29;
  // The body, hollow: back, sides, top and floor, then a door hung from x = hx.
  part(g, box(0.66, Hh, 0.04), GREEN_D, 0, Hh / 2 + 0.06, -0.44);
  for (const sx of [-1, 1]) part(g, box(0.05, Hh, 0.44), GREEN_D, sx * 0.31, Hh / 2 + 0.06, -0.24);
  part(g, box(0.66, 0.05, 0.44), GREEN_D, 0, Hh + 0.035, -0.24);
  part(g, box(0.66, 0.05, 0.44), GREEN_D, 0, 0.085, -0.24);
  part(g, box(0.56, Hh - 0.14, 0.01), '#d7d1bf', 0, Hh / 2 + 0.06, -0.415, { outline: false });
  part(g, box(0.72, 0.06, 0.48), '#1d2822', 0, 0.03, -0.24);
  // Shelves and folders inside.
  for (const y of [0.42, 0.74, 1.04]) part(g, box(0.56, 0.012, 0.34), '#a7a18e', 0, y, -0.22, { outline: false });
  const r = seeded(13);
  for (const [y, n0] of [[0.43, 6], [0.75, 5], [1.05, 7]] as const) for (let i = 0; i < n0; i++) part(g, box(0.05, 0.22 + r() * 0.05, 0.25), [MANILA, '#b9975a', '#7f8e9c', '#a8504a'][Math.floor(r() * 4)], -0.23 + i * 0.066, y + 0.12, -0.22, { outline: false });
  // The door.
  const door = group(g, hx, 0, 0.0);
  part(door, rbox(0.58, Hh - 0.03, 0.05, 0.01), GREEN_S, 0.29, Hh / 2 + 0.06, 0);
  part(door, box(0.48, Hh - 0.2, 0.004), '#465d4e', 0.29, Hh / 2 + 0.06, 0.028, { outline: false });
  for (const y of [0.16, 0.7, 1.24]) part(door, rbox(0.03, 0.09, 0.04, 0.008), STEEL_D, 0, y, 0.01);
  const dialP = [DS.dial[0] - hx, DS.dial[1], DS.dial[2]] as const;
  const dial = group(door, dialP[0], dialP[1], 0.04);
  part(dial, cyl(0.055, 0.058, 0.03, 20), CHROME, 0, 0, 0, { rx: Math.PI / 2 });
  part(dial, box(0.006, 0.05, 0.004), BLACK, 0, 0.022, 0.018, { outline: false });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    part(dial, box(0.004, 0.012, 0.004), BLACK, Math.cos(a) * 0.044, Math.sin(a) * 0.044, 0.017, { rz: a - Math.PI / 2, outline: false });
  }
  const hP = [DS.handle[0] - hx, DS.handle[1]] as const;
  const wheel = group(door, hP[0], hP[1], 0.05);
  part(wheel, cyl(0.016, 0.016, 0.04, 10), CHROME, 0, 0, -0.01, { rx: Math.PI / 2, outline: false });
  for (let i = 0; i < 3; i++) part(wheel, box(0.11, 0.012, 0.012), CHROME, 0, 0, 0.012, { rz: (i * Math.PI) / 3, outline: false });
  label(door, '보안 문서', 0.28, 0.08, 0.29, 1.14, 0.03, '#465d4e', '#f0e6c8');
  label(door, '2인 확인 · 개봉 일지 작성', 0.34, 0.035, 0.29, 1.05, 0.03, '#465d4e', '#d4c9a6');
  const lamp = ownLit(door, ball(0.012), '#4a1512', dialP[0] + 0.11, dialP[1] + 0.07, 0.03);
  // The sign-out clipboard, on a hook beside it; a burn bag at its foot.
  part(g, box(0.02, 0.5, 0.02), STEEL_D, DS.log[0], 0.82, -0.28, { outline: false });
  const LG = DS.log;
  part(g, rbox(0.17, 0.24, 0.012, 0.004), WOOD, LG[0], LG[1], LG[2] - 0.01, { rx: -0.24 });
  rod(g, v3(LG[0], 0.82, -0.28), v3(LG[0], LG[1] - 0.1, LG[2] - 0.05), 0.007, STEEL_D);
  const logScreen = liveScreen(g, 0.15, 0.21, LG[0], LG[1] + 0.003, LG[2] + 0.002, 110, 0, -0.24);
  part(g, cyl(0.1, 0.085, 0.36, 14), '#c0a678', 0.38, 0.18, 0.1);
  part(g, cyl(0.105, 0.105, 0.02, 14), '#a68c60', 0.38, 0.37, 0.1, { outline: false });
  label(g, '소각', 0.12, 0.04, 0.38, 0.2, 0.2, '#c0a678', '#7a1d18');
  // In the hands.
  const held = folderMesh(g);
  const held2 = folderMesh(g);
  const pen = penMesh(g);

  const spots: Record<string, Spot> = { icFileSecret: standAt(g, 'icSafe', 0.5, 0) };
  spots['*'] = spots.icFileSecret;
  out.work = marker(g, DS.dial[0], DS.dial[1], DS.dial[2] + 0.05);
  drive(g, out, spots, (now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const round = N?.b.n ?? 0;
    const open = n.open ?? 0;
    door.rotation.y = -open * 1.72;
    dial.rotation.z = (n.dial ?? 0) * Math.PI * 4 * Math.sin((n.dial ?? 0) * 3);
    wheel.rotation.z = (n.handle ?? 0) * 1.6;
    setLit(lamp, (n.unlocked ?? 0) > 0.5 ? GREEN : now ? RED : '#4a1512');
    logScreen.show(`${q(n.signed, 12)}|${round}`, (c, W, H) => {
      c.fillStyle = '#f5f1e6';
      c.fillRect(0, 0, W, H);
      text(c, '개봉 일지', W / 2, 12, 12, '#20242c', 'center');
      drawBars(c, 8, 28, W - 16, 7, 18, 3, 0.8, '#6a7078');
      if ((n.signed ?? 0) > 0) {
        c.strokeStyle = '#1d3f99';
        c.lineWidth = 2;
        c.beginPath();
        for (let i = 0; i < 16 * (n.signed ?? 0); i++) c.lineTo(10 + i * 5, H - 18 + 6 * Math.sin(i * 1.7));
        c.stroke();
      }
    });
    at(held.f, P.file ?? null);
    if (P.file) {
      held.left.set(casePage(round));
      held.right.set(casePage(round + 1));
    }
    at(held2.f, P.file2 ?? null);
    if (P.file2) {
      held2.left.set(casePage(round + 2));
      held2.right.set(casePage(round + 3));
    }
    at(pen, P.pen ?? null);
  });
}

// =============================================================================================
// 작전 회의 테이블 (icBriefTable, 3 × 1): takes the room's chairs as they stand, x -1 and 0 on each side.

function briefTable(g: THREE.Group, out: Built) {
  const T = BT.top;
  part(g, rbox(2.96, 0.05, 0.92, 0.03), '#2f3844', 0, T - 0.025, 0);
  for (const x of [-1.25, 1.25]) {
    part(g, rbox(0.1, T - 0.06, 0.62, 0.01), '#20272f', x, (T - 0.06) / 2, 0);
    part(g, rbox(0.14, 0.03, 0.72, 0.01), '#20272f', x, 0.015, 0);
  }
  part(g, box(2.4, 0.03, 0.03), '#20272f', 0, 0.42, 0);
  // The map under glass; the tokens; the route that's been drawn on it.
  const mapPic = liveScreen(g, 2.0, 0.72, -0.28, T + 0.003, 0, 720, 0, -Math.PI / 2);
  part(g, box(2.04, 0.006, 0.76), '#10161d', -0.28, T + 0.001, 0, { outline: false });
  const r = seeded(21);
  for (let i = 0; i < 4; i++) {
    const x = -1.1 + r() * 1.4;
    const z = -0.25 + r() * 0.5;
    part(g, cyl(0.018, 0.022, 0.03, 8), ['#d9a63a', '#2d6fa3', '#c9352e', '#ececec'][i], x, T + 0.018, z);
  }
  const token = group(g);
  part(token, cyl(0.024, 0.03, 0.04, 10), '#f0c43a', 0, 0, 0);
  part(token, ball(0.018), '#f0c43a', 0, 0.03, 0);
  // The long stick for pushing it.
  const stick = part(g, cyl(0.007, 0.007, 1, 6), WOOD, 0, 0, 0, { outline: false });
  const stickHead = part(g, box(0.07, 0.012, 0.03), WOOD_D, 0, 0, 0, { outline: false });
  const d = new THREE.Vector3();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  // Projector, its beam up to the wall; speakerphone; a folder and water at each chair, and the stack at the head of the table.
  const PR = BT.projector;
  part(g, rbox(0.3, 0.09, 0.26, 0.012), '#e0e2e6', PR[0], T + 0.05, PR[2]);
  part(g, cyl(0.04, 0.046, 0.03, 12), BLACK, PR[0], T + 0.05, PR[2] - 0.14, { rx: Math.PI / 2 });
  const prLamp = ownLit(g, ball(0.008), '#3a3a30', PR[0] + 0.11, T + 0.1, PR[2] + 0.1);
  const beamMat = new THREE.MeshBasicMaterial({ color: '#dff4ff', transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(0.3, 2.6, 16, 1, true), beamMat);
  beam.userData.ownGeometry = beam.userData.ownMaterial = true;
  beam.position.set(PR[0] - 0.05, 1.22, PR[2] - 1.32);
  beam.rotation.x = Math.PI / 2 + 0.28;
  beam.visible = false;
  g.add(beam);
  part(g, cyl(0.09, 0.1, 0.03, 16), '#262b32', 0.26, T + 0.016, 0.28);
  ownLit(g, ball(0.007), GREEN, 0.26, T + 0.035, 0.28);
  for (const [x, zz] of [[-1, -0.3], [0, -0.3], [-1, 0.3], [0, 0.3]] as const) {
    part(g, box(0.2, 0.012, 0.27), MANILA, x + 0.1, T + 0.012, zz, { outline: false, ry: 0.03 });
    label(g, '대외비', 0.09, 0.03, x + 0.1, T + 0.02, zz, MANILA, RED).rotation.x = -Math.PI / 2;
    part(g, cyl(0.028, 0.03, 0.15, 10), '#c5e6f6', x - 0.16, T + 0.078, zz);
    part(g, cyl(0.016, 0.016, 0.02, 8), '#2d6fa3', x - 0.16, T + 0.16, zz, { outline: false });
  }
  const stack = group(g, BT.stack[0], T + 0.01, BT.stack[2]);
  for (let i = 0; i < 4; i++) part(stack, box(0.2, 0.012, 0.27), MANILA, 0, i * 0.014, 0, { ry: i * 0.04, outline: false });
  const figures = BT.seats.map(([x, z, ry], i) => lazy(() => person(g, [LOOKS.boss, LOOKS.eunjae, LOOKS.haram, LOOKS.analyst][i], x, z, ry, i === 1 ? 'female' : 'male', 0.46, 40 + i)));

  const spots: Record<string, Spot> = { icConveneTeam: standAt(g, 'icConvene', BT.stand[1], BT.stand[0]) };
  spots['*'] = spots.icConveneTeam;
  out.work = marker(g, BT.stack[0], BT.stack[1], BT.stack[2]);
  const seedC = { v: -1 };
  drive(g, out, spots, (now, N, t) => {
    if (seedC.v < 0) seedC.v = seedOf(g);
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const round = (N?.b.n ?? 0) + seedC.v;
    const d0 = caseOf(round);
    const moved = n.moved ?? 0;
    mapPic.show(`${d0.code}|${q(moved, 10)}|${now ? 1 : 0}`, (c, W, H) => paintMap(c, W, H, { d: d0, pin: now ? 0.2 + moved * 0.8 : 1, dark: false }));
    const lit = (n.lit ?? 0) > 0.5;
    beam.visible = lit;
    setLit(prLamp, lit ? '#7fe0f2' : '#3a3a30');
    const tokenAt: V = P.stickEnd ?? (moved > 0.5 ? BT.tokenTo : BT.token);
    token.position.set(tokenAt[0], tokenAt[1] + 0.012, tokenAt[2]);
    if (P.stickEnd) {
      // From behind the hand (the dweller's right, at the table's end) to the token.
      const hand = N?.key.r ?? [BT.stand[0], 1.0, BT.stand[1]];
      a.set(hand[0], hand[1], hand[2]);
      b.set(P.stickEnd[0], P.stickEnd[1] + 0.016, P.stickEnd[2]);
      d.subVectors(b, a);
      stick.visible = stickHead.visible = true;
      stick.position.copy(a).addScaledVector(d, 0.5);
      stick.scale.set(1, d.length(), 1);
      stick.quaternion.setFromUnitVectors(UP, d.normalize());
      stickHead.position.copy(b);
      stickHead.rotation.y = Math.atan2(a.x - b.x, a.z - b.z);
    } else stick.visible = stickHead.visible = false;
    if (now) {
      figures.forEach((L, i) => {
        const f = L.get();
        f.root.visible = true;
        f.head.rotation.x = (n.nods ?? 0) > 0.5 ? 0.14 + 0.13 * Math.sin(t * 3.2 + i) : 0.24;
        f.head.rotation.y = 0;
        const up = i === 2 && (n.hand ?? 0) > 0.5;
        f.armR(up ? v3(BT.seats[i][0] + 0.2, 1.42, BT.seats[i][1] - 0.02) : null);
        f.armL(null);
      });
    } else figures.forEach((L) => L.hide());
  });
}

// =============================================================================================
// 출입 관리대 (icBadgeDesk, 2 × 1): by the door to the analysts' floor. A panel with the reader and camera; a counter.

function badgeDesk(g: THREE.Group, out: Built) {
  const T = BD.counterTop;
  // The left half: a wall panel, the reader, a dome camera, the sign, and a little glass gate.
  part(g, box(0.86, 1.96, 0.04), NAVY, -0.52, 1.06, -0.46);
  const signTex = painted('icBadgeSign', 340, 150, (c) => {
    c.fillStyle = '#c9352e';
    c.fillRect(0, 0, 340, 150);
    text(c, '보안 구역', 170, 46, 46, '#ffffff', 'center');
    text(c, '출입증을 대고 들어가세요', 170, 100, 20, '#ffe9d8', 'center');
    text(c, '휴대전화는 보관함에', 170, 128, 17, '#ffe9d8', 'center', false);
  });
  picture(g, signTex, 0.68, 0.3, -0.52, 1.75, -0.436);
  const R = BD.reader;
  part(g, rbox(0.15, 0.22, 0.04, 0.012), '#20262e', R[0], R[1], R[2] - 0.018);
  const scr = liveScreen(g, 0.11, 0.09, R[0], R[1] + 0.04, R[2] + 0.004, 90);
  part(g, cyl(0.03, 0.03, 0.006, 16), '#3a414b', R[0], R[1] - 0.05, R[2] + 0.004, { rx: Math.PI / 2, outline: false });
  const readerLamp = ownLit(g, ball(0.012), '#5a1a14', R[0] + 0.05, R[1] - 0.09, R[2] + 0.004);
  part(g, cyl(0.03, 0.05, 0.03, 12), '#d3d6db', -0.15, 2.0, -0.38);
  part(g, ball(0.033), '#2b2f35', -0.15, 1.975, -0.38, { outline: false });
  // A low gate of glass and steel along the wall's foot, for show.
  part(g, rbox(0.1, 0.92, 0.1, 0.01), STEEL_D, -0.92, 0.46, -0.22);
  const glassMat = new THREE.MeshBasicMaterial({ color: '#cfeaf5', transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide });
  const gate = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.7), glassMat);
  gate.userData.ownGeometry = gate.userData.ownMaterial = true;
  gate.position.set(-0.64, 0.52, -0.22);
  g.add(gate);
  // The right half: the counter, its front panel, a printer, the log, the phone box, a rack of lanyards behind.
  part(g, rbox(1.06, T - 0.02, 0.48, 0.016), NAVY_L, 0.45, (T - 0.02) / 2, -0.2);
  part(g, rbox(1.14, 0.03, 0.56, 0.01), '#d7dade', 0.45, T - 0.015, -0.18);
  label(g, '방문 접수', 0.46, 0.09, 0.45, 0.62, 0.044, NAVY_L, '#e6edf3');
  part(g, box(1.0, 1.0, 0.03), NAVY, 0.45, 1.5, -0.46);
  for (let i = 0; i < 6; i++) {
    const x = 0.05 + i * 0.15;
    part(g, ball(0.01), CHROME, x, 1.72, -0.44, { outline: false });
    rod(g, v3(x, 1.72, -0.44), v3(x - 0.03, 1.42, -0.43), 0.004, ['#c9352e', '#2d6fa3'][i % 2]);
    rod(g, v3(x, 1.72, -0.44), v3(x + 0.03, 1.42, -0.43), 0.004, ['#c9352e', '#2d6fa3'][i % 2]);
    part(g, rbox(0.07, 0.1, 0.004, 0.003), '#f4f4f0', x, 1.37, -0.43, { outline: false });
    label(g, '방문', 0.05, 0.022, x, 1.385, -0.426, '#f4f4f0', '#2d6fa3');
  }
  const P0 = BD.printer;
  part(g, rbox(0.22, 0.16, 0.26, 0.012), '#2b2f35', P0[0], T + 0.08, P0[2]);
  part(g, box(0.08, 0.004, 0.012), BLACK, P0[0], T + 0.08, P0[2] + 0.132, { outline: false });
  const prLamp = ownLit(g, ball(0.007), '#2a3a2a', P0[0] + 0.07, T + 0.135, P0[2] + 0.13);
  const LOG = BD.log;
  part(g, box(0.22, 0.012, 0.28), '#1d3f64', LOG[0], T + 0.008, LOG[2], { outline: false });
  const logS = liveScreen(g, 0.2, 0.26, LOG[0], T + 0.016, LOG[2], 130, 0, -Math.PI / 2);
  const BX = BD.box;
  part(g, rbox(0.2, 0.05, 0.16, 0.008), '#59626e', BX[0], T + 0.025, BX[2]);
  label(g, '휴대전화', 0.14, 0.024, BX[0], T + 0.03, BX[2] + 0.082, '#59626e', '#ffffff');
  const phoneIn = part(g, rbox(0.07, 0.008, 0.13, 0.004), '#101014', BX[0], T + 0.056, BX[2], { outline: false });
  // A badge coming out, or on the visitor.
  const badge = group(g);
  part(badge, rbox(0.07, 0.1, 0.004, 0.003), '#f4f4f0', 0, 0, 0, { outline: false });
  label(badge, '방문', 0.05, 0.022, 0, 0.018, 0.004, '#f4f4f0', '#2d6fa3');
  const card = group(g);
  part(card, rbox(0.085, 0.004, 0.055, 0.002), '#cfe1f1', 0, 0, 0, { outline: false });
  const pen = penMesh(g);
  const visitor = lazy(() => person(g, LOOKS.visitor, BD.wait[0], BD.wait[1], Math.PI / 2, 'male', undefined, 51));
  const worn = group(g);
  part(worn, rbox(0.07, 0.1, 0.004, 0.003), '#f4f4f0', 0, 0, 0, { outline: false });
  label(worn, '방문', 0.05, 0.022, 0, 0.018, 0.004, '#f4f4f0', '#2d6fa3');
  const lanyard = part(g, cyl(0.004, 0.004, 0.24, 6), '#c9352e', 0, 0, 0, { outline: false });

  const spots: Record<string, Spot> = { icIssueBadge: standAt(g, 'icBadge', 0.5, 0.34) };
  spots['*'] = spots.icIssueBadge;
  out.work = marker(g, LOG[0], LOG[1] + 0.02, LOG[2]);
  const seedC = { v: -1 };
  drive(g, out, spots, (now, N, t) => {
    if (seedC.v < 0) seedC.v = seedOf(g);
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const green = (n.green ?? 0) > 0.5;
    setLit(readerLamp, green ? GREEN : Math.sin(t * 1.4) > 0.6 ? '#ff3b2a' : '#5a1a14');
    scr.show(`${green ? 1 : 0}|${now ? 1 : 0}`, (c, W, H) => {
      c.fillStyle = green ? '#0f3a22' : '#0b131c';
      c.fillRect(0, 0, W, H);
      text(c, green ? '출입 확인' : '출입증', W / 2, H / 2, H * 0.27, green ? GREEN : '#7ea0b8', 'center');
    });
    logS.show(`${q(n.logged, 10)}`, (c, W, H) => {
      c.fillStyle = '#fbfaf3';
      c.fillRect(0, 0, W, H);
      text(c, '방문자 대장', W / 2, 12, 12, '#20242c', 'center');
      drawBars(c, 8, 28, W - 16, 9, 14, 2.5, 0.5 + 0.5 * (n.logged ?? 0), '#51606f');
    });
    setLit(prLamp, (n.printing ?? 0) > 0.02 && (n.printing ?? 0) < 0.8 ? GREEN : '#2a3a2a');
    at(badge, P.badge ?? null);
    at(card, P.card ?? null);
    at(pen, P.pen ?? null);
    phoneIn.visible = (n.phone ?? 0) > 0.5;
    if (now && (n.there ?? 0) > 0.05) {
      const f = visitor.get();
      f.root.visible = true;
      const to = n.toTap ?? 0;
      const x = BD.wait[0] + (BD.tap[0] - BD.wait[0]) * to;
      const z = BD.wait[1] + (BD.tap[1] - BD.wait[1]) * to;
      f.root.position.x = x;
      f.root.position.z = z;
      f.root.rotation.y = (n.faceDweller ?? 0) > 0.5 ? Math.PI / 2 : Math.PI;
      f.head.rotation.x = 0.04;
      f.armL(null);
      f.armR((n.gives ?? 0) > 0.5 ? v3(-0.14, 1.04, 0.5) : (n.tap ?? 0) > 0.5 ? v3(R[0], R[1] - 0.05, R[2] + 0.06) : (n.tap ?? 0) > 0.05 ? v3(R[0] + 0.02, R[1] - 0.1, R[2] + 0.2) : null);
      const wears = (n.wears ?? 0) > 0.5;
      worn.visible = lanyard.visible = wears;
      if (wears) {
        worn.position.set(x + Math.sin(f.root.rotation.y) * 0.12, 1.08, z + Math.cos(f.root.rotation.y) * 0.12);
        worn.rotation.y = f.root.rotation.y;
        lanyard.position.set(worn.position.x, 1.22, worn.position.z);
      }
    } else {
      visitor.hide();
      worn.visible = lanyard.visible = false;
    }
  });
}

// =============================================================================================
// 현장 장비 사물함 (icGearLocker, 2 × 1): one locker with its things, a peg board and a shelf.

function gearLocker(g: THREE.Group, out: Built) {
  const LK = '#5a6876';
  const Hh = 2.0;
  // The locker, open-fronted behind its door.
  part(g, box(0.88, Hh, 0.03), '#262c33', -0.48, Hh / 2, -0.46);
  for (const x of [-0.905, -0.055]) part(g, box(0.03, Hh, 0.46), '#3f4a55', x, Hh / 2, -0.24);
  part(g, box(0.88, 0.03, 0.46), '#3f4a55', -0.48, Hh - 0.015, -0.24);
  part(g, box(0.88, 0.03, 0.46), '#3f4a55', -0.48, 0.03, -0.24);
  part(g, box(0.8, 0.02, 0.4), '#59636d', -0.48, 1.6, -0.24, { outline: false });
  // Inside: a raincoat on a hanger, a hat, the fake moustaches for fun, boots.
  part(g, rbox(0.42, 0.9, 0.12, 0.05), '#a98e5c', -0.5, 1.06, -0.24);
  for (const sx of [-1, 1]) part(g, rbox(0.1, 0.7, 0.1, 0.04), '#9b8150', -0.5 + sx * 0.25, 1.14, -0.24);
  part(g, box(0.28, 0.012, 0.012), CHROME, -0.5, 1.52, -0.24, { outline: false });
  part(g, cyl(0.09, 0.11, 0.08, 14), '#3a3f47', -0.56, 1.66, -0.24);
  part(g, cyl(0.17, 0.17, 0.012, 16), '#3a3f47', -0.56, 1.625, -0.24, { outline: false });
  for (const sx of [-1, 1]) part(g, rbox(0.11, 0.2, 0.22, 0.03), '#2a2c30', -0.5 + sx * 0.1, 0.15, -0.24);
  part(g, rbox(0.22, 0.06, 0.12, 0.01), '#d7c9a7', -0.24, 1.645, -0.2);
  label(g, '변장 소품', 0.2, 0.04, -0.24, 1.645, -0.138, '#d7c9a7', '#5a3c20');
  // The door hung on the left, its checklist on the inside.
  const door = group(g, GL.door[0], 0, GL.door[1]);
  part(door, rbox(0.8, Hh - 0.06, 0.03, 0.006), LK, 0.4, Hh / 2, 0);
  for (let i = 0; i < 6; i++) part(door, box(0.2, 0.012, 0.004), '#3f4a55', 0.4, 1.75 + i * 0.03, 0.017, { outline: false });
  part(door, box(0.03, 0.14, 0.03), CHROME, 0.72, 1.05, 0.024);
  label(door, '현장 장비 A', 0.3, 0.06, 0.4, 1.6, 0.018, LK, '#eff3f6');
  // The checklist on the peg board.
  const LS = GL.list;
  part(g, box(0.2, 0.28, 0.006), '#7a5535', LS[0], LS[1], LS[2] - 0.01, { outline: false });
  const list = liveScreen(g, 0.18, 0.26, LS[0], LS[1], LS[2], 120);
  // The peg board on the right, its tools outlined; the shelf and a case below.
  part(g, box(0.96, 1.2, 0.03), '#d8d4c6', 0.48, 1.26, -0.42);
  const r = seeded(5);
  for (let i = 0; i < 90; i++) part(g, ball(0.004), '#a8a494', 0.04 + r() * 0.88, 0.7 + r() * 1.12, -0.404, { outline: false });
  const shadowAt = (x: number, y: number, w: number, h: number) => part(g, box(w, h, 0.002), '#a8a494', x, y, -0.402, { outline: false });
  shadowAt(GL.radio[0], GL.radio[1], 0.08, 0.2);
  shadowAt(GL.bino[0], GL.bino[1], 0.16, 0.08);
  const radioHome = radioMesh(g);
  radioHome.root.position.set(GL.radio[0], GL.radio[1], GL.radio[2]);
  const binoHome = binoMesh(g);
  binoHome.position.set(GL.bino[0], GL.bino[1], GL.bino[2]);
  // Flashlight, a coil of rope, a notebook on hooks.
  part(g, cyl(0.022, 0.018, 0.2, 10), '#2b2f35', 0.28, 1.0, -0.37, { rz: Math.PI / 2 });
  part(g, ring(0.08, 0.016), '#b0946a', 0.72, 1.0, -0.38);
  part(g, rbox(0.14, 0.2, 0.012, 0.004), '#7a1d18', 0.48, 1.66, -0.39);
  label(g, '현장 수첩', 0.12, 0.03, 0.48, 1.66, -0.382, '#7a1d18', '#ffffff');
  part(g, box(0.98, 0.03, 0.34), '#5a4a38', 0.48, GL.shelf[1] - 0.02, -0.26);
  for (const x of [0.05, 0.92]) part(g, box(0.03, GL.shelf[1] - 0.05, 0.3), '#3f4a55', x, (GL.shelf[1] - 0.05) / 2, -0.26);
  // A hard briefcase on the shelf, batteries charging.
  part(g, rbox(0.42, 0.26, 0.1, 0.012), '#3a3f47', 0.28, GL.shelf[1] + 0.13, -0.3);
  part(g, box(0.1, 0.018, 0.02), CHROME, 0.28, GL.shelf[1] + 0.27, -0.3, { outline: false });
  part(g, rbox(0.22, 0.05, 0.14, 0.008), '#2b2f35', 0.72, GL.shelf[1] + 0.025, -0.28);
  for (let i = 0; i < 4; i++) ownLit(g, ball(0.006), i < 3 ? GREEN : AMBER, 0.65 + i * 0.045, GL.shelf[1] + 0.055, -0.21);
  part(g, rbox(0.42, 0.34, 0.26, 0.02), '#39424e', 0.48, 0.17, -0.28);
  label(g, '응급 키트', 0.22, 0.05, 0.48, 0.2, -0.148, '#39424e', '#ffffff');
  // In the hands.
  const radio = radioMesh(g);
  const bino = binoMesh(g);
  const pen = penMesh(g);

  const spots: Record<string, Spot> = { icCheckKit: standAt(g, 'icKit', 0.5, -0.3) };
  spots['*'] = spots.icCheckKit;
  out.work = marker(g, -0.2, 1.1, -0.1);
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const open = now ? n.open ?? 0 : 0;
    door.rotation.y = -open * (Math.PI / 2 + 0.05);
    at(radio.root, P.radio ?? null);
    radioHome.root.visible = !P.radio;
    setLit(radio.led, (n.led ?? 0) > 0.5 && Math.sin(t * 8) > 0 ? '#ff3b2a' : '#2a2f28');
    at(bino, P.bino ?? null);
    binoHome.visible = !P.bino;
    at(pen, P.pen ?? null);
    list.show(`${q(n.ticks, 10)}|${now ? 1 : 0}`, (c, W, H) => {
      c.fillStyle = '#fbfaf3';
      c.fillRect(0, 0, W, H);
      text(c, '출동 전 점검', W / 2, 14, 13, '#20242c', 'center');
      ['무전기', '쌍안경', '손전등', '수첩', '변장 소품'].forEach((s, i) => {
        c.strokeStyle = '#555';
        c.lineWidth = 1;
        c.strokeRect(10, 34 + i * 26, 12, 12);
        if ((n.ticks ?? 0) * 5 > i + 0.2) {
          c.strokeStyle = '#2e7d32';
          c.lineWidth = 3;
          c.beginPath();
          c.moveTo(11, 40 + i * 26);
          c.lineTo(15, 44 + i * 26);
          c.lineTo(23, 32 + i * 26);
          c.stroke();
        }
        text(c, s, 30, 40 + i * 26, 12, '#333', 'left', false);
      });
    });
  });
}

// =============================================================================================
// 체력 단련 매트 (icDefenseMat, 2 × 2): low: blue mats, a padded dummy on its sprung base, dumbbells, a towel and water.

function defenseMat(g: THREE.Group, out: Built) {
  for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]] as const) {
    part(g, box(0.98, 0.04, 0.98), (x > 0) !== (z > 0) ? '#2f5f8c' : '#3a72a6', x, 0.02, z);
    part(g, box(0.9, 0.002, 0.9), (x > 0) !== (z > 0) ? '#3a6c9b' : '#4681b6', x, 0.041, z, { outline: false });
  }
  label(g, '체력 단련', 0.5, 0.1, 0.4, 0.043, 0.8, '#3a72a6', '#e6f2fb').rotation.x = -Math.PI / 2;
  // The dummy: a heavy round base, a sprung neck, a padded torso and a plain head with no face, bull's-eyes where it's hit.
  const [DX, DZ] = DM.dummy;
  part(g, cyl(0.26, 0.3, 0.14, 20), '#23272e', DX, 0.11, DZ);
  part(g, cyl(0.04, 0.05, 0.44, 10), '#6b7380', DX, 0.38, DZ, { outline: false });
  const dummy = group(g, DX, 0.56, DZ);
  dummy.rotation.order = 'YXZ';
  dummy.rotation.y = DM.yaw + Math.PI;
  part(dummy, cyl(0.17, 0.2, 0.62, 16), '#b6683a', 0, 0.34, 0);
  part(dummy, cyl(0.09, 0.1, 0.1, 12), '#a45e36', 0, 0.68, 0, { outline: false });
  part(dummy, ball(0.115), '#b6683a', 0, 0.82, 0);
  part(dummy, cyl(0.06, 0.06, 0.004, 14), RED, 0, 0.56, 0.174, { rx: Math.PI / 2, outline: false });
  part(dummy, cyl(0.03, 0.03, 0.005, 14), '#ffffff', 0, 0.56, 0.176, { rx: Math.PI / 2, outline: false });
  part(dummy, box(0.28, 0.02, 0.26), '#8f522e', 0, 0.36, 0, { outline: false });
  // A low rack of dumbbells at the back right, a towel over its end, water on the floor.
  part(g, box(0.62, 0.03, 0.2), '#2b2f35', 0.46, 0.3, -0.76);
  for (const x of [0.2, 0.72]) part(g, box(0.03, 0.28, 0.18), '#2b2f35', x, 0.15, -0.76);
  for (let i = 0; i < 3; i++) {
    const x = 0.26 + i * 0.2;
    part(g, cyl(0.012, 0.012, 0.15, 6), STEEL, x, 0.345, -0.76, { rx: Math.PI / 2, outline: false });
    for (const s of [-1, 1]) part(g, cyl(0.03 + i * 0.006, 0.03 + i * 0.006, 0.04, 10), BLACK, x, 0.345, -0.76 + s * 0.07, { rx: Math.PI / 2 });
  }
  const towelHome = part(g, rbox(0.2, 0.012, 0.22, 0.006), '#f4f4ef', DM.towel[0], 0.325, DM.towel[2], { outline: false });
  part(g, cyl(0.03, 0.035, 0.18, 10), '#9fd0e6', -0.82, 0.13, 0.78);
  const towel = group(g);
  part(towel, rbox(0.18, 0.02, 0.1, 0.008), '#f4f4ef', 0, 0, 0, { outline: false });
  const spots: Record<string, Spot> = { icSparTraining: standAt(g, 'icSpar', 0, 0.02) };
  spots['*'] = spots.icSparTraining;
  out.work = marker(g, DM.chest[0], DM.chest[1], DM.chest[2]);
  let swing = 0;
  let wasHit = 0;
  drive(g, out, spots, (_now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const hit = n.hit ?? 0;
    if (hit > 0.5 && wasHit < 0.5) swing = 1;
    wasHit = hit;
    swing *= 0.94;
    dummy.rotation.x = -0.14 * swing * Math.abs(Math.sin(t * 11));
    at(towel, P.towel ?? null);
    towelHome.visible = !P.towel;
  });
}

export const BUILDERS: Record<string, Builder> = {
  intelDesk(g, _W, _D, _c, _def, _ctx, out) {
    intelDesk(g, out);
  },
  situationWall(g, _W, _D, _c, _def, _ctx, out) {
    situationWall(g, out);
  },
  cyberTerminal(g, _W, _D, _c, _def, _ctx, out) {
    cyberTerminal(g, out);
  },
  icEvidenceBoard(g, _W, _D, _c, _def, _ctx, out) {
    evidenceBoard(g, out);
  },
  icSignalDesk(g, _W, _D, _c, _def, _ctx, out) {
    signalDesk(g, out);
  },
  icDocSafe(g, _W, _D, _c, _def, _ctx, out) {
    docSafe(g, out);
  },
  icBriefTable(g, _W, _D, _c, _def, _ctx, out) {
    briefTable(g, out);
  },
  icBadgeDesk(g, _W, _D, _c, _def, _ctx, out) {
    badgeDesk(g, out);
  },
  icGearLocker(g, _W, _D, _c, _def, _ctx, out) {
    gearLocker(g, out);
  },
  icDefenseMat(g, _W, _D, _c, _def, _ctx, out) {
    defenseMat(g, out);
  },
  icPhoneLocker(g, W, D) {
    phoneLocker(g, W, D);
  },
  icPerimeter(g) {
    perimeter(g);
  },
};

/**
 * 휴대폰 보관함 (icPhoneLocker, 2 × 1, 2026-11-05, the layout audit): against the wall by the badge desk, a cabinet of small
 * numbered doors each with its key, a few standing open, the notice above it that no phone goes past this point.
 */
function phoneLocker(g: THREE.Group, W: number, D: number) {
  const w = W - 0.16;
  const z = -D / 2 + 0.2;
  part(g, rbox(w, 1.5, 0.36, 0.02), '#5a6876', 0, 0.75, z);
  const cols = 6;
  const rows = 5;
  const cw = (w - 0.12) / cols;
  const chh = 1.2 / rows;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const x = -w / 2 + 0.06 + (c + 0.5) * cw;
      const y = 0.22 + (r + 0.5) * chh;
      const open = (r * cols + c) % 7 === 3;
      part(g, box(cw - 0.03, chh - 0.03, 0.012), open ? '#37414d' : '#8fa0b0', x, y, z + 0.186, { outline: false });
      if (!open) part(g, box(0.02, 0.02, 0.01), '#d4af37', x + cw / 2 - 0.05, y, z + 0.195, { outline: false });
    }
  part(g, box(0.9, 0.24, 0.02), '#fafafa', 0, 1.75, z + 0.1);
  label(g, '휴대폰은 여기에 맡겨 주세요', 0.86, 0.1, 0, 1.78, z + 0.112, '#fafafa', '#b71c1c');
  label(g, '보안 구역 반입 금지', 0.6, 0.07, 0, 1.68, z + 0.112, '#fafafa', '#37474f');
}

/**
 * 보안 울타리·경비 초소 (icPerimeter, 1 × 1 on the forecourt's south-west tile at 2, 13; 2026-11-05, the layout audit): drawn in the
 * lot's frame from there. A 2.4 m mesh fence with its wire on top up the forecourt's sides (x 1 and x 24) and along the street
 * (y 14), the gateway open from x 10 to 15; the barrier arm's post on the east side of it, the arm raised; the guard booth on the
 * fence line beside it with its window to the gate; the plate on the gatepost (no name, only that it's a secure site).
 */
const FENCE_MESH = new THREE.MeshToonMaterial({ color: '#90a4ae', transparent: true, opacity: 0.4, depthWrite: false });

function perimeter(g: THREE.Group) {
  // Lot tile (x, y) middle → this tile's frame (its middle at 2.5, 13.5).
  const X = (x: number) => x - 2.5;
  const Z = (y: number) => y - 13.5;
  const H = 2.4;
  const run = (x0: number, z0: number, x1: number, z1: number) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const ry = Math.atan2(-(z1 - z0), x1 - x0);
    const mx = (x0 + x1) / 2;
    const mz = (z0 + z1) / 2;
    part(g, box(len, H - 0.1, 0.02), '#90a4ae', mx, H / 2, mz, { ry, outline: false, material: FENCE_MESH });
    part(g, box(len, 0.05, 0.05), '#607d8b', mx, H, mz, { ry, outline: false });
    part(g, box(len, 0.25, 0.08), '#78909c', mx, 0.12, mz, { ry, outline: false });
    const n = Math.max(1, Math.round(len / 2));
    for (let k = 0; k <= n; k++) part(g, box(0.07, H + 0.4, 0.07), '#546e7a', x0 + ((x1 - x0) * k) / n, (H + 0.4) / 2, z0 + ((z1 - z0) * k) / n, { outline: false });
    for (const dy of [0.14, 0.28]) part(g, box(len, 0.015, 0.015), '#37474f', mx, H + dy, mz, { ry, outline: false });
  };
  const fz = Z(14);
  run(X(1), Z(10.5), X(1), fz);
  run(X(1), fz, X(9.5), fz);
  run(X(16.1), fz, X(24), fz);
  run(X(24), fz, X(24), Z(10.5));
  // The gateposts and the plate.
  for (const x of [X(9.5), X(14.6)]) part(g, rbox(0.35, 2.7, 0.35, 0.03), '#cfd8dc', x, 1.35, fz);
  part(g, box(0.9, 0.42, 0.03), '#fafafa', X(9.5), 1.65, fz + 0.2);
  label(g, '국가 보안 시설', 0.8, 0.14, X(9.5), 1.74, fz + 0.217, '#fafafa', '#0d47a1');
  label(g, '관계자 외 출입 금지', 0.8, 0.1, X(9.5), 1.56, fz + 0.217, '#fafafa', '#b71c1c');
  // The barrier arm, raised, its post by the east gatepost.
  part(g, rbox(0.3, 1.0, 0.3, 0.03), '#eceff1', X(14.2), 0.5, fz + 0.05);
  part(g, box(0.3, 0.08, 0.3), '#c62828', X(14.2), 0.9, fz + 0.05, { outline: false });
  const arm = new THREE.Group();
  arm.position.set(X(14.2), 0.95, fz + 0.05);
  arm.rotation.z = -1.35;
  g.add(arm);
  for (let k = 0; k < 8; k++) part(arm, box(0.4, 0.08, 0.06), k % 2 ? '#c62828' : '#fafafa', -0.2 - k * 0.4, 0, 0, { outline: false });
  // The guard booth on the fence line beside the gate: walls, the window to the gate, the roof, the lamp.
  const bx = X(15.6);
  const bz = fz;
  part(g, box(1.15, 2.2, 0.95), '#eceff1', bx, 1.1, bz);
  part(g, box(1.25, 0.12, 1.05), '#455a64', bx, 2.26, bz);
  part(g, box(0.02, 0.7, 0.6), '#9ec9e6', bx - 0.585, 1.45, bz, { outline: false });
  part(g, box(0.8, 0.6, 0.02), '#9ec9e6', bx, 1.45, bz - 0.48, { outline: false });
  part(g, box(0.8, 0.6, 0.02), '#9ec9e6', bx, 1.45, bz + 0.48, { outline: false });
  label(g, '경비실', 0.4, 0.1, bx, 2.0, bz + 0.485, '#eceff1', '#263238');
  part(g, cyl(0.06, 0.08, 0.1, 10), '#ffca28', bx, 2.37, bz, { outline: false });
}
