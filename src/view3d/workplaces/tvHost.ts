import * as THREE from 'three';
import { marker, rod, shade, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { SET_DETAIL } from '../furnitureSet';
import { BLACK, STEEL, label, painted, picture, seeded, text } from './doctor';
import { AB, BZ, CB, CC, CT, GB, ND, PC, RD, SAT_HEAD, ST, TK, tsNow, tsPhase } from './tvHostMotion';
import type { TsMotion, TsNow } from './tvHostMotion';
import { vroidFigure, type FigureOptions } from './vroidFigure';

/**
 * The 방송국 스튜디오 drawn as itself (2026-11-01 workplace pipeline, at the user's request), at the made-up 달빛방송: a
 * variety and talk show floor. The talk show set stays as it was redone (furnitureSet.ts), with its uses given poses of
 * their own and an ON AIR lamp. Round it: pedestal cameras with their operators, a floor manager's cue board, a bench of
 * audience under an applause sign, a game corner with three buzzers, a table of scripts, a low news desk; a gallery with
 * its wall of screens and a vision mixer; a visible-radio booth; a green room where a guest is being briefed.
 *
 * Everything that moves follows the scripts in tvHostMotion.ts. The set and the desk tell the room when it's on air, so
 * tallies, the screens, the sign and the crowd all go together. All shows and names are made up.
 */

const BRAND = '달빛방송';
const SHOW = '오늘 밤 토크';
const GAME = '달빛 퀴즈 대격돌';
const NIGHT = '#1d1930';
const PURPLE = '#4a2f7c';
const PINK = '#ff4fa3';
const AMBER = '#ffb300';
const RED = '#e53935';
const RED_D = '#5a1414';
const GREEN = '#43e97b';
const GREEN_D = '#143f24';
const PAPER = '#fbfaf6';
const WOOD = '#8d6e63';
const FOAM = '#3e4048';
const GLASS_C = '#cfe8f5';
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3();
type V = readonly [number, number, number];

// ---------------------------------------------------------------------------------------------
// The studio's one state: told by whoever is at work, read by everything else.

const ROOM = { air: -1e9, rehearse: -1e9, clap: -1e9, game: -1e9, cam: 0, news: -1e9 };
const live_ = (at: number, t: number) => Math.abs(t - at) < 0.6;
const onAir = (t: number) => live_(ROOM.air, t);
const working = (t: number) => onAir(t) || live_(ROOM.rehearse, t);

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
function pane(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, opacity = 0.2, ry = 0, color = GLASS_C): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
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
function standAt(g: THREE.Object3D, motion: TsMotion, x = 0, z = 0.6, yaw = Math.PI, y = 0): Spot {
  const s = spot(g, 'stand', x, y, z, yaw);
  s.motion = motion;
  return s;
}
function seatAt(g: THREE.Object3D, motion: TsMotion, p: V, yaw: number, floor = 0): Spot {
  const s = spot(g, 'sit', p[0], p[1], p[2], yaw, p[1] - floor);
  s.motion = motion;
  return s;
}
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
function nowAt(spots: Record<string, Spot>, t: number): string | null {
  let best: string | null = null;
  for (const [k, s] of Object.entries(spots)) if (k !== '*' && Math.abs(t - posedAt(s)) < 0.6 && (best === null || posedAt(s) > posedAt(spots[best]))) best = k;
  return best;
}
const heightOf = (sp: Spot | null) => (sp?.at.userData.height as number | undefined) ?? 1.6;
/** Every frame: which use is going on and where its script has got to. */
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, show: (now: string | null, N: TsNow | null, t: number, h: number) => void) {
  out.spots = spots;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const h = heightOf(sp);
    const N = sp ? tsNow(sp.motion as TsMotion, t, tsPhase(g.getWorldPosition(tmp)), h) : null;
    show(now, N, t, h);
  };
}
/** A canvas painted again only when what it says has changed. */
function live(w: number, h: number) {
  let tex: THREE.CanvasTexture | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let last = '';
  return (key: string, paint: (c: CanvasRenderingContext2D) => void): THREE.Texture | null => {
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
      paint(ctx);
      tex.needsUpdate = true;
      last = key;
    }
    return tex;
  };
}
function sheetMesh(g: THREE.Object3D, w = 0.2, d = 0.28): THREE.Group {
  const s = group(g);
  const m = part(s, box(w, 0.004, d), PAPER, 0, 0, 0, { outline: false });
  for (let i = 0; i < 5; i++) part(m, box(w * 0.74, 0.001, 0.007), '#90a4ae', 0, 0.0026, -d * 0.36 + i * d * 0.17, { outline: false });
  return s;
}
function clipboard(g: THREE.Object3D): THREE.Group {
  const b = group(g);
  const r = group(b);
  r.rotation.x = -0.9;
  part(r, box(0.2, 0.27, 0.012), WOOD, 0, 0, 0);
  part(r, box(0.18, 0.24, 0.002), PAPER, 0, -0.01, 0.008, { outline: false });
  part(r, box(0.08, 0.02, 0.012), STEEL, 0, 0.125, 0.008, { outline: false });
  for (let i = 0; i < 4; i++) part(r, box(0.14, 0.008, 0.001), '#90a4ae', 0, 0.06 - i * 0.04, 0.0095, { outline: false });
  return b;
}
function penMesh(g: THREE.Object3D, color = '#c62828'): THREE.Mesh {
  return part(g, cyl(0.006, 0.006, 0.14, 6), color, 0, 0, 0, { rz: 1.25, ry: 0.5, outline: false });
}
/** Headphones with a little mic arm, on a head, their band over the top. */
function headset(g: THREE.Object3D, mic = false): THREE.Group {
  const h = group(g);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.008, 6, 20, Math.PI), new THREE.MeshBasicMaterial({ color: BLACK }));
  band.userData.ownGeometry = band.userData.ownMaterial = true;
  band.scale.set(1, 1.16, 1);
  band.position.y = 0.01;
  h.add(band);
  for (const sx of [-1, 1]) part(h, cyl(0.042, 0.042, 0.03, 14), BLACK, sx * 0.1, -0.01, 0, { rz: Math.PI / 2 });
  if (mic) {
    rod(h, v3(0.1, -0.03, 0.01), v3(0.05, -0.1, 0.1), 0.004, BLACK);
    part(h, ball(0.012), BLACK, 0.05, -0.1, 0.1, { outline: false });
  }
  h.visible = false;
  return h;
}
/** Words that shine on a lit panel, with nothing behind them. */
function glowText(g: THREE.Object3D, s: string, w: number, h: number, x: number, y: number, z: number, fg: string): THREE.Mesh {
  const ch = 96;
  const cw = Math.round((ch * w) / h / 16) * 16 || 96;
  const tex = painted(`tsGlow|${s}|${fg}|${cw}`, cw, ch, (c) => {
    c.clearRect(0, 0, cw, ch);
    text(c, s, cw / 2, ch * 0.52, Math.round(ch * 0.66), fg, 'center');
  });
  const m = picture(g, tex, w, h, x, y, z);
  const mat = m.material as THREE.MeshBasicMaterial;
  mat.transparent = true;
  mat.depthWrite = false;
  return m;
}
function micHead(g: THREE.Object3D): void {
  part(g, cyl(0.03, 0.028, 0.14, 12), '#37474f', 0, 0, 0, { rx: Math.PI / 2 });
  part(g, ball(0.034), '#1f2228', 0, 0, 0.08);
}
function officeChair(g: THREE.Object3D, x: number, seatY: number, z: number, ry = Math.PI, color = '#20242a') {
  const c = group(g, x, 0, z, ry);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    rod(c, v3(0, 0.08, 0), v3(Math.sin(a) * 0.22, 0.035, Math.cos(a) * 0.22), 0.012, BLACK);
    part(c, ball(0.022), BLACK, Math.sin(a) * 0.22, 0.022, Math.cos(a) * 0.22, { outline: false });
  }
  part(c, cyl(0.025, 0.03, seatY - 0.1, 10), STEEL, 0, (seatY - 0.06 + 0.06) / 2, 0, { outline: false });
  part(c, rbox(0.44, 0.06, 0.42, 0.03), color, 0, seatY - 0.03, 0);
  part(c, rbox(0.4, 0.48, 0.05, 0.03), color, 0, seatY + 0.3, -0.21, { rx: -0.08 });
  return c;
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
  crew: { top: '#37474f', bottom: '#2f3940', hair: '#2b1b10' },
  crew2: { top: '#263238', bottom: '#3e4a52', hair: '#1a1a1a', skin: '#eac09a' },
  floor: { top: '#ef6c00', bottom: '#37474f', hair: '#2b1b10' },
  writer: { top: '#ec407a', bottom: '#455a64', hair: '#5b3a1e', skin: '#f8d9c0' },
  guest: { top: '#00897b', bottom: '#263238', hair: '#3a2415' },
  guest2: { top: '#fdd835', bottom: '#5d4037', hair: '#1a1a1a', skin: '#f8d9c0' },
  fan1: { top: '#7e57c2', bottom: '#37474f', hair: '#3a2415', skin: '#f8d9c0' },
  fan2: { top: '#42a5f5', bottom: '#455a64', hair: '#1a1a1a' },
  fan3: { top: '#ef9a9a', bottom: '#5d4037', hair: '#8a8a8a', skin: '#eac09a' },
  editor: { top: '#546e7a', bottom: '#2f3940', hair: '#2b1b10' },
};
interface Fig {
  root: THREE.Group;
  head: THREE.Group;
  armL(to: THREE.Vector3 | null): void;
  armR(to: THREE.Vector3 | null): void;
  opts: FigureOptions;
}
const UP = new THREE.Vector3(0, 1, 0);
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
/** Someone stood, or sat if given a `seat` height (the drawn one is bent to it, for until its body comes). */
function person(parent: THREE.Object3D, look: Look, x: number, z: number, ry: number, o: { gender?: 'female' | 'male'; seat?: number; y?: number } = {}): Fig {
  const root = group(parent, x, o.y ?? 0, z, ry);
  const skin = look.skin ?? SKIN;
  const seat = o.seat;
  const dy = seat !== undefined ? seat - 0.86 : 0;
  for (const sx of [-1, 1]) {
    if (seat === undefined) {
      rod(root, v3(sx * 0.085, 0.84, 0), v3(sx * 0.09, 0.08, 0.01), 0.056, look.bottom);
      part(root, rbox(0.09, 0.07, 0.2, 0.03), '#37474f', sx * 0.09, 0.035, 0.04);
    } else {
      rod(root, v3(sx * 0.085, seat + 0.03, 0), v3(sx * 0.09, seat + 0.03, 0.38), 0.056, look.bottom);
      rod(root, v3(sx * 0.09, seat + 0.03, 0.38), v3(sx * 0.09, 0.08, 0.4), 0.05, look.bottom);
      part(root, rbox(0.09, 0.07, 0.2, 0.03), '#37474f', sx * 0.09, 0.035, 0.44);
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
  const arm = (sx: number) => {
    const shoulder = v3(sx * 0.2, 1.31 + dy, 0);
    const rest = seat !== undefined ? v3(sx * 0.15, seat + 0.1, 0.24) : v3(sx * 0.23, 0.82, 0.05);
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
  const opts: FigureOptions = { gender: o.gender };
  if (seat !== undefined) {
    opts.seat = seat;
    opts.floor = 0;
  }
  const f = vroidFigure({ root, head, armL, armR }, opts);
  return { ...f, opts };
}
/** Someone who's only made when first wanted (a body is about 20,000 triangles). */
function lazy(make: () => Fig) {
  let f: Fig | null = null;
  return {
    get: () => {
      f ??= make();
      f.root.visible = true;
      return f;
    },
    hide: () => f && (f.root.visible = false),
  };
}
const a1 = new THREE.Vector3();
const a2 = new THREE.Vector3();

// ---------------------------------------------------------------------------------------------
// What the cameras see, for every screen in the place.

const FEEDS = ['tsFeedWide', 'tsFeedHost', 'tsFeedGuest', 'tsFeedNews', 'tsFeedGame', 'tsFeedCrowd'] as const;
function backdropPaint(c: CanvasRenderingContext2D) {
  const sky = c.createLinearGradient(0, 0, 0, 90);
  sky.addColorStop(0, '#141238');
  sky.addColorStop(1, '#a0427c');
  c.fillStyle = sky;
  c.fillRect(0, 0, 160, 90);
  const r = seeded(13);
  for (let i = 0; i < 9; i++) {
    c.fillStyle = '#1b1838';
    const h = 18 + r() * 34;
    c.fillRect(i * 18, 90 - h, 16, h);
  }
}
const personPaint = (c: CanvasRenderingContext2D, x: number, y: number, s: number, top: string) => {
  c.fillStyle = top;
  c.beginPath();
  c.ellipse(x, y + s * 1.5, s * 1.2, s * 1.1, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#f1c9a5';
  c.beginPath();
  c.arc(x, y, s * 0.68, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#2b1b10';
  c.beginPath();
  c.arc(x, y - s * 0.2, s * 0.68, Math.PI, 0);
  c.fill();
};
function feedTex(i: number): THREE.Texture {
  return painted(FEEDS[i], 160, 90, (c) => {
    if (i === 0) {
      backdropPaint(c);
      c.fillStyle = '#6a3f9c';
      c.fillRect(100, 58, 44, 24);
      c.fillStyle = '#d9973a';
      c.fillRect(14, 62, 50, 20);
      personPaint(c, 122, 40, 8, '#37474f');
      personPaint(c, 28, 44, 7, '#00897b');
      personPaint(c, 50, 44, 7, '#fdd835');
    } else if (i === 1) {
      backdropPaint(c);
      personPaint(c, 80, 38, 18, '#37474f');
      c.fillStyle = '#6a3f9c';
      c.fillRect(0, 74, 160, 16);
    } else if (i === 2) {
      backdropPaint(c);
      personPaint(c, 56, 38, 15, '#00897b');
      personPaint(c, 108, 38, 15, '#fdd835');
    } else if (i === 3) {
      c.fillStyle = '#0d2748';
      c.fillRect(0, 0, 160, 90);
      personPaint(c, 80, 34, 15, '#1565c0');
      c.fillStyle = '#10305c';
      c.fillRect(0, 66, 160, 24);
      text(c, '달빛 뉴스룸', 80, 78, 12, '#ffffff', 'center');
    } else if (i === 4) {
      c.fillStyle = '#ffb300';
      c.fillRect(0, 0, 160, 90);
      text(c, 'QUIZ', 80, 18, 18, '#4a2f7c', 'center');
      for (const x of [34, 80, 126]) {
        personPaint(c, x, 40, 9, '#7e57c2');
        c.fillStyle = '#4a2f7c';
        c.fillRect(x - 15, 62, 30, 26);
      }
    } else {
      c.fillStyle = '#2b2542';
      c.fillRect(0, 0, 160, 90);
      for (let row = 0; row < 3; row++) for (let i2 = 0; i2 < 7; i2++) personPaint(c, 12 + i2 * 23 + row * 6, 16 + row * 26, 7, ['#7e57c2', '#42a5f5', '#ef9a9a', '#fdd835'][(i2 + row) % 4]);
    }
  });
}
const barsTex = () =>
  painted('tsBars', 160, 90, (c) => {
    ['#eceff1', '#fdd835', '#26c6da', '#66bb6a', '#ec407a', '#e53935', '#3949ab'].forEach((k, i) => {
      c.fillStyle = k;
      c.fillRect((i * 160) / 7, 0, 160 / 7 + 1, 66);
    });
    c.fillStyle = '#1b1b24';
    c.fillRect(0, 66, 160, 24);
    text(c, BRAND, 80, 78, 13, '#ffffff', 'center');
  });

// =============================================================================================
// 토크쇼 세트 (talkShowSet): furnitureSet.ts's own, with a lamp and each of its uses posed.

function talkSet(g: THREE.Group, out: Built, W: number, D: number) {
  // An ON AIR lamp on the header, a stack of the guests' photos for the meeting, a card and pen for rehearsals.
  const lampBox = group(g, -W / 2 + 0.56, TK.floor + 2.22, -D / 2 + 0.16);
  part(lampBox, rbox(0.5, 0.2, 0.05, 0.02), BLACK, 0, 0, 0);
  const lamp = ownLit(lampBox, box(0.46, 0.16, 0.004), RED_D, 0, 0, 0.027);
  glowText(lampBox, 'ON AIR', 0.42, 0.13, 0, 0, 0.031, '#ffffff');
  const photos = TK.photos.map((p, i) => {
    const m = group(g);
    place(m, p);
    part(m, box(0.13, 0.004, 0.17), PAPER, 0, 0, 0, { outline: false });
    part(m, box(0.1, 0.002, 0.1), ['#90caf9', '#f8bbd0', '#c5e1a5'][i], 0, 0.003, -0.02, { outline: false });
    part(m, ball(0.022), '#f1c9a5', 0, 0.006, -0.03, { outline: false });
    m.visible = false;
    return m;
  });
  const card = group(g);
  part(card, box(0.1, 0.15, 0.004), '#fff8e1', 0, 0, 0);
  card.visible = false;
  const pen = group(g);
  penMesh(pen, '#1e88e5');
  pen.visible = false;
  const writer = lazy(() => person(g, LOOKS.writer, TK.writer[0], TK.writer[1], Math.PI, { y: TK.floor, gender: 'female' }));
  const board = group(g, TK.writer[0] + 0.14, TK.floor + 1.05, TK.writer[1] - 0.26);
  clipboard(board);
  board.visible = false;
  const host = out.spots!['*'];
  const spots: Record<string, Spot> = {
    '*': host,
    goLive: seatAt(g, 'tsLive', TK.seat, TK.yaw, TK.floor),
    rehearseShow: seatAt(g, 'tsRehearse', TK.seat, TK.yaw, TK.floor),
    tvHost_adLib: standAt(g, 'tsAdLib', -0.1, 0.62, -0.1, TK.floor),
    tvHost_castingMeeting: seatAt(g, 'tsCast', TK.seat, TK.yaw, TK.floor),
  };
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const air = (n.air ?? 0) > 0.5;
    if (air) ROOM.air = t;
    if (n.rehearse) ROOM.rehearse = t;
    if ((n.clap ?? 0) > 0.5) ROOM.clap = t;
    if (air || n.rehearse) ROOM.cam = Math.round(n.cam ?? 0);
    const count = n.count ?? 0;
    setLit(lamp, air ? (Math.sin(t * 4) > -0.6 ? RED : '#b71c1c') : count > 0 && Math.floor(t * 2) % 2 ? '#8a2020' : RED_D);
    photos.forEach((m, i) => at(m, now === 'tvHost_castingMeeting' ? (P[`p${i}`] as V | null) : null));
    at(card, (P.cardHeld as V | null) ?? null);
    at(pen, (P.pen as V | null) ?? null);
    if (now === 'tvHost_castingMeeting') {
      const f = writer.get();
      board.visible = true;
      f.armL(a1.set(TK.writer[0] + 0.14, TK.floor + 1.05, TK.writer[1] - 0.26));
      f.armR(a2.set(TK.writer[0] - 0.1, TK.floor + 1.0 + 0.05 * Math.sin(t * 4) * (n.talking ?? 0), TK.writer[1] - 0.3));
      f.opts.nod = 0.1 + 0.05 * Math.sin(t * 1.3);
      f.opts.lean = 0.05;
    } else {
      writer.hide();
      board.visible = false;
    }
  });
}

// =============================================================================================
// 뉴스 데스크 (newsDesk, 2 × 1): a low desk (it stands out on the floor, so nothing on it is tall); sat behind it.

function newsDesk(g: THREE.Group, out: Built, W: number) {
  const T = ND.top;
  part(g, rbox(W - 0.04, T - 0.05, 0.12, 0.04), '#10305c', 0, (T - 0.05) / 2, 0.38);
  for (const sx of [-1, 1]) part(g, rbox(0.06, T - 0.05, 0.56, 0.02), '#0b2142', sx * (W / 2 - 0.05), (T - 0.05) / 2, 0.12);
  part(g, rbox(W, 0.05, 0.66, 0.02), '#eceff1', 0, T - 0.025, 0.1);
  part(g, box(W - 0.1, 0.02, 0.006), AMBER, 0, T - 0.09, 0.442, { outline: false, material: new THREE.MeshBasicMaterial({ color: AMBER }) }).userData.ownMaterial = true;
  label(g, '달빛 뉴스룸', 1.1, 0.22, 0, 0.42, 0.444, '#10305c', '#ffffff');
  // The little desk screen, a tablet, a phone, a cup of pens.
  const scr = group(g, 0.72, T, 0.28);
  part(scr, rbox(0.34, 0.24, 0.02, 0.01), BLACK, 0, 0.17, 0);
  part(scr, box(0.04, 0.05, 0.04), BLACK, 0, 0.025, 0);
  const screen = swapPic(scr, 0.3, 0.2, 0, 0.17, -0.012, Math.PI);
  screen.set(feedTex(3));
  part(g, rbox(0.3, 0.012, 0.2, 0.01), BLACK, ND.tablet[0], T + 0.006, ND.tablet[2]);
  const tablet = swapPic(g, 0.27, 0.17, ND.tablet[0], T + 0.014, ND.tablet[2], 0, -Math.PI / 2);
  const paintT = live(256, 160);
  const paintTablet = (scroll: number, flag: boolean) =>
    tablet.set(
      paintT(`${Math.round(scroll * 4)}${flag}`, (c) => {
        c.fillStyle = '#f5f7f9';
        c.fillRect(0, 0, 256, 160);
        c.fillStyle = '#10305c';
        c.fillRect(0, 0, 256, 22);
        text(c, '시 통계 자료', 10, 12, 13, '#ffffff');
        ['방문객 3만 2천 명', '작년보다 5% 증가', '행사 기간 사흘'].forEach((s, i) => text(c, s, 12, 42 + i * 28 - scroll * 8, 15, flag && i === 0 ? '#c62828' : '#26332d'));
      }),
    );
  paintTablet(0, false);
  const phone = group(g);
  part(phone, rbox(0.06, 0.012, 0.13, 0.008), BLACK, 0, 0, 0);
  at(phone, ND.phone);
  part(g, cyl(0.035, 0.03, 0.09, 10), '#90a4ae', -0.72, T + 0.045, 0.25);
  for (const [dx, k] of [[-0.01, '#c62828'], [0.012, '#1565c0']] as const) part(g, cyl(0.005, 0.005, 0.14, 6), k, -0.72 + dx, T + 0.1, 0.25, { outline: false });
  const sheet = sheetMesh(g);
  at(sheet, ND.paper);
  const flag = ownLit(g, box(0.1, 0.002, 0.018), '#ffee58', ND.paper[0] - 0.01, ND.paper[1] + 0.004, ND.paper[2] - 0.02);
  const strike = ownLit(g, box(0.12, 0.002, 0.006), RED, ND.paper[0], ND.paper[1] + 0.005, ND.paper[2] + 0.04);
  const pen = group(g);
  penMesh(pen);
  officeChair(g, ND.seat[0], ND.seat[1], ND.seat[2] - 0.02, 0, '#10305c');
  const editor = lazy(() => person(g, LOOKS.editor, ND.editor[0], ND.editor[1], Math.PI / 2));
  const spots: Record<string, Spot> = { readNews: seatAt(g, 'tsNews', ND.seat, 0), tvHost_factCheckNews: seatAt(g, 'tsFact', ND.seat, 0), tvHost_editorialMeeting: seatAt(g, 'tsEditor', ND.seat, 0) };
  spots['*'] = spots.readNews;
  const paper = ND.paper;
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    if (n.cam === 3) ROOM.news = t;
    at(sheet, (P.sheet as V | null) ?? null, paper);
    at(phone, (P.phone as V | null) ?? null, ND.phone);
    at(pen, (P.pen as V | null) ?? null);
    flag.visible = (n.flag ?? 0) > 0.5 || (n.fixed ?? 0) > 0.5;
    setLit(flag, (n.fixed ?? 0) > 0.5 ? '#a5d6a7' : '#ffee58');
    strike.visible = (n.struck ?? 0) > 0.5;
    strike.scale.x = Math.max(0.01, n.struck ?? 0);
    if (now === 'tvHost_factCheckNews') paintTablet(n.scroll ?? 0, (n.flag ?? 0) > 0.5);
    if (now === 'tvHost_editorialMeeting') {
      const f = editor.get();
      f.armL(a1.set(ND.editor[0] + 0.3, 0.98 + 0.05 * Math.sin(t * 5) * (n.talking ?? 0), ND.editor[1] - 0.1));
      f.armR(a2.set(ND.editor[0] + 0.25, 1.0, ND.editor[1] + 0.12));
      f.opts.nod = 0.15;
      f.opts.lean = 0.08;
    } else editor.hide();
  });
  out.work = marker(g, ND.paper[0], ND.paper[1], ND.paper[2]);
}

// =============================================================================================
// 큐카드 책상 (cueCardTable, 1 × 1): a stand of cards in big black letters, thick markers, a stopwatch, rolled scripts.

function cueCardTable(g: THREE.Group, out: Built) {
  const T = CC.top;
  part(g, rbox(0.92, 0.05, 0.72, 0.015), WOOD, 0, T - 0.025, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.02, 0.016, T - 0.05, 8), BLACK, sx * 0.4, (T - 0.05) / 2, sz * 0.3, { outline: false });
  part(g, box(0.82, 0.02, 0.6), shade(WOOD, 0.8), 0, 0.26, 0, { outline: false });
  // A rack on the back edge holding finished cards up, their big words showing.
  const words = ['큐!', '박수', '30초', '광고 후', '웃으세요'];
  part(g, box(0.86, 0.04, 0.05), BLACK, 0, T + 0.02, -0.3);
  words.forEach((w, i) => {
    const r = group(g, -0.34 + i * 0.17, T + 0.17, -0.3 + (i % 2) * 0.012);
    r.rotation.x = -0.1;
    part(r, box(0.15, 0.27, 0.005), '#fff8e1', 0, 0, 0);
    picture(r, painted(`tsCardWord|${w}`, 128, 230, (c) => {
      c.fillStyle = '#fff8e1';
      c.fillRect(0, 0, 128, 230);
      text(c, w, 64, 115, w.length > 2 ? 28 : 44, i === 0 ? '#c62828' : '#1b1b24', 'center');
    }), 0.14, 0.25, 0, 0, 0.004);
  });
  // The piles: blank on the right as you stand at it, done on the left.
  for (let i = 0; i < 6; i++) part(g, box(0.34, 0.004, 0.22), '#fff8e1', CC.blank[0], T + 0.003 + i * 0.004, CC.blank[2], { ry: 0.02 * i, outline: false });
  for (let i = 0; i < 4; i++) part(g, box(0.34, 0.004, 0.22), i === 3 ? '#fff3c4' : '#fff8e1', CC.done[0], T + 0.003 + i * 0.004, CC.done[2], { ry: -0.03 * i, outline: false });
  // Markers, and a stopwatch on its cord.
  for (let i = 0; i < 3; i++) part(g, cyl(0.012, 0.012, 0.13, 8), ['#1b1b24', '#c62828', '#1565c0'][i], CC.marker[0] - 0.02 * i, T + 0.012, CC.marker[2] - i * 0.03, { rz: Math.PI / 2, ry: 0.3 });
  part(g, cyl(0.035, 0.035, 0.015, 16), STEEL, -0.32, T + 0.008, 0.26);
  part(g, cyl(0.028, 0.028, 0.002, 16), PAPER, -0.32, T + 0.017, 0.26, { outline: false });
  // The card worked on.
  const card = group(g);
  const cardFlat = group(card);
  part(cardFlat, box(0.36, 0.004, 0.24), '#fffdf0', 0, 0, 0);
  const inkLines = [0, 1, 2].map((i) => part(cardFlat, box(0.26 - i * 0.04, 0.002, 0.03), '#1b1b24', 0, 0.003, -0.07 + i * 0.07, { outline: false }));
  const marker1 = group(g);
  part(marker1, cyl(0.012, 0.012, 0.13, 8), '#1b1b24', 0, 0.06, 0, { rx: 0.5 });
  const held = group(g);
  part(held, box(0.36, 0.24, 0.005), '#fffdf0', 0, 0, 0);
  picture(held, painted('tsCardHeld', 256, 170, (c) => {
    c.fillStyle = '#fffdf0';
    c.fillRect(0, 0, 256, 170);
    text(c, '다음 코너', 128, 60, 44, '#1b1b24', 'center');
    text(c, '30초!', 128, 118, 44, '#c62828', 'center');
  }), 0.34, 0.22, 0, 0, 0.004);
  picture(held, painted('tsCardHeld', 256, 170, () => {}), 0.34, 0.22, 0, 0, -0.004, '#ffffff', Math.PI);
  held.visible = false;
  const phones = headset(g, true);
  const spots: Record<string, Spot> = { prepareCueCards: standAt(g, 'tsCards', 0, 0.62), tvHost_floorDirect: standAt(g, 'tsFloor', 0.02, 0.66, 0) };
  spots['*'] = spots.prepareCueCards;
  drive(g, out, spots, (now, N, _t, h) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    if (now === 'prepareCueCards') {
      const up = (n.up ?? 0) > 0.5;
      at(card, up ? null : (P.card as V | null) ?? null);
      inkLines.forEach((m, i) => (m.visible = (n.lines ?? 0) > i));
      at(marker1, (P.marker as V | null) ?? null);
      at(held, up ? (P.card as V | null) ?? null : null);
      if (up && N) held.rotation.y = N.st.yaw + Math.PI;
    } else if (now === 'tvHost_floorDirect') {
      card.visible = false;
      marker1.visible = false;
      at(held, (P.held as V | null) ?? null);
      held.rotation.y = 0;
    } else {
      at(card, null, [CC.work[0], CC.top + 0.004, CC.work[2]] as V);
      inkLines.forEach((m) => (m.visible = false));
      marker1.visible = false;
      held.visible = false;
    }
    const wearing = (n.phones ?? 0) > 0.5 && !!N;
    phones.visible = wearing;
    if (wearing && N) {
      phones.position.set(N.st.x, N.st.y + 0.92 * h, N.st.z);
      phones.rotation.y = N.st.yaw;
      phones.scale.setScalar(h / 1.6);
    }
  });
  out.work = marker(g, CC.work[0], CC.work[1], CC.work[2]);
}

// =============================================================================================
// 라디오 부스 (radioBooth, 2 × 1): a "visible radio": foam walls, a window, a console with its little camera and ring light.

function foamWall(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, ry: number) {
  const f = group(g, x, y, z, ry);
  part(f, box(w, h, 0.02), '#2c2e34', 0, 0, 0, { outline: false });
  for (let iy = 0; iy < Math.floor(h / 0.2); iy++) for (let ix = 0; ix < Math.floor(w / 0.2); ix++) if ((ix + iy) % 2 === 0) part(f, box(0.18, 0.18, 0.012), FOAM, -w / 2 + 0.1 + ix * 0.2, -h / 2 + 0.1 + iy * 0.2, 0.014, { outline: false });
}
function radioBooth(g: THREE.Group, out: Built, W: number) {
  const H = 2.14;
  part(g, box(W, H, 0.05), '#2b2d33', 0, H / 2, -0.47);
  for (const sx of [-1, 1]) part(g, box(0.05, H, 0.96), '#2b2d33', sx * (W / 2 - 0.025), H / 2, 0);
  foamWall(g, W - 0.1, H - 0.1, 0, H / 2, -0.44, 0);
  foamWall(g, 0.9, H - 0.1, -W / 2 + 0.055, H / 2, 0, Math.PI / 2);
  foamWall(g, 0.9, H - 0.1, W / 2 - 0.055, H / 2, 0, -Math.PI / 2);
  part(g, box(W, 0.06, 1.0), '#23252a', 0, H + 0.03, 0);
  part(g, box(W, 0.05, 1.0), '#383a40', 0, 0.025, 0, { outline: false });
  part(g, box(W, 0.08, 0.05), '#23252a', 0, H - 0.04, 0.475);
  part(g, box(W, 0.1, 0.05), '#23252a', 0, 0.05, 0.475);
  for (const x of [-W / 2 + 0.03, W / 2 - 0.03]) part(g, box(0.04, H - 0.1, 0.04), '#23252a', x, H / 2, 0.475, { outline: false });
  pane(g, W - 0.1, H - 0.18, 0, H / 2, 0.47, 0.11);
  ownLit(g, cyl(0.09, 0.09, 0.012, 12), '#ffe9b3', 0, H - 0.01, -0.1);
  // A show's name over the foam, and the sign outside.
  label(g, '달빛 라디오 보이는 스튜디오', 1.0, 0.13, 0, 1.75, -0.425, '#141622', '#ffd27f');
  const sign = group(g, 0, H + 0.2, 0.3);
  part(sign, rbox(0.86, 0.26, 0.08, 0.02), BLACK, 0, 0, 0);
  const lit = ownLit(sign, box(0.8, 0.2, 0.004), RED_D, 0, 0, 0.042);
  glowText(sign, 'ON AIR', 0.72, 0.18, 0, 0, 0.046, '#ffffff');
  // The console.
  const T = RD.top;
  part(g, rbox(W - 0.16, 0.05, 0.56, 0.015), '#3e2f26', 0, T - 0.025, 0.14);
  part(g, box(W - 0.16, T - 0.05, 0.05), '#2c211b', 0, (T - 0.05) / 2, 0.4);
  part(g, rbox(0.48, 0.04, 0.3, 0.008), '#20242a', RD.fader[0], T + 0.02, RD.fader[2]);
  const faderKnob = part(g, rbox(0.03, 0.022, 0.036, 0.004), '#eceff1', RD.fader[0], T + 0.052, RD.fader[2]);
  const r = seeded(21);
  for (let i = 0; i < 7; i++) {
    const x = RD.fader[0] - 0.2 + i * 0.066;
    if (i !== 3) part(g, rbox(0.02, 0.018, 0.03, 0.004), ['#e53935', '#90a4ae', '#fdd835', '#90a4ae'][i % 4], x, T + 0.05, RD.fader[2] - 0.05 + r() * 0.1, { outline: false });
    part(g, box(0.006, 0.002, 0.19), '#0f1114', x, T + 0.041, RD.fader[2], { outline: false });
  }
  // The little camera with a ring light on the console's left end, looking at the host; a jingle pad, a mug.
  const camAt = group(g, 0.62, T, 0.26);
  part(camAt, cyl(0.05, 0.06, 0.02, 12), BLACK, 0, 0.01, 0);
  part(camAt, cyl(0.008, 0.008, 0.26, 8), STEEL, 0, 0.14, 0, { outline: false });
  part(camAt, rbox(0.11, 0.07, 0.07, 0.012), BLACK, 0, 0.3, 0);
  const lens = part(camAt, cyl(0.022, 0.026, 0.03, 12), '#37474f', 0, 0.3, -0.05, { rx: Math.PI / 2 });
  lens.rotation.y = 0.5;
  const ringGeom = new THREE.TorusGeometry(0.1, 0.012, 8, 28);
  const ring = new THREE.Mesh(ringGeom, new THREE.MeshBasicMaterial({ color: '#7a7464' }));
  ring.userData.ownGeometry = ring.userData.ownMaterial = true;
  ring.position.set(0, 0.3, -0.03);
  camAt.add(ring);
  const tally = ownLit(camAt, ball(0.01), RED_D, 0.04, 0.345, 0);
  for (let i = 0; i < 6; i++) part(g, rbox(0.05, 0.016, 0.05, 0.006), ['#ffb300', '#ec407a', '#42a5f5'][i % 3], 0.14 + (i % 3) * 0.065, T + 0.008, 0.2 + Math.floor(i / 3) * 0.065, { outline: false });
  part(g, cyl(0.038, 0.034, 0.09, 10), '#fafafa', -0.78, T + 0.045, 0.22);
  // Mic on its arm, height to whoever's in the chair.
  const micAt = group(g);
  micHead(micAt);
  const armBase = v3(0.5, T + 0.04, -0.1);
  part(g, cyl(0.03, 0.03, 0.04, 10), BLACK, armBase.x, T + 0.02, armBase.z);
  const arm1 = part(g, cyl(0.008, 0.008, 1, 6), BLACK, 0, 0, 0, { outline: false });
  const placeMic = (h: number) => {
    const y = RD.seat[1] + SAT_HEAD * h - 0.22 * (h / 1.6);
    micAt.position.set(RD.seat[0] + 0.08, y, RD.seat[2] + 0.2);
    micAt.rotation.y = Math.PI + 0.3;
    const b = micAt.position.clone();
    b.z += 0.06;
    arm1.position.copy(armBase).add(b).multiplyScalar(0.5);
    arm1.scale.set(1, armBase.distanceTo(b), 1);
    arm1.quaternion.setFromUnitVectors(UP, b.sub(armBase).normalize());
  };
  placeMic(1.6);
  officeChair(g, RD.seat[0], RD.seat[1], RD.seat[2], 0);
  out.seat = marker(g, RD.seat[0], RD.seat[1], RD.seat[2]);
  // Headphones, hung up till wanted.
  const phones = headset(g);
  const hung = group(g, -0.72, T + 0.05, 0.05);
  part(hung, box(0.16, 0.05, 0.1), BLACK, 0, 0, 0);
  const letter = group(g);
  part(letter, box(0.16, 0.003, 0.11), '#fff59d', 0, 0, 0, { outline: false });
  const pad = group(g);
  place(pad, RD.pad);
  part(pad, box(0.2, 0.006, 0.26), PAPER, 0, 0, 0, { outline: false });
  const lines = [0, 1, 2, 3].map((i) => part(pad, box(0.15, 0.001, 0.008), i === 3 ? '#c62828' : '#90a4ae', 0, 0.004, -0.08 + i * 0.05, { outline: false }));
  const pen = group(g);
  penMesh(pen);
  const meter = [0, 1, 2, 3].map((i) => ownLit(g, box(0.03, 0.05, 0.004), GREEN_D, -0.8 + i * 0.05, T + 0.11, 0.42));
  const spots: Record<string, Spot> = { hostRadio: seatAt(g, 'tsRadio', RD.seat, 0), tvHost_ownSegment: seatAt(g, 'tsSegment', RD.seat, 0) };
  spots['*'] = spots.hostRadio;
  drive(g, out, spots, (now, N, t, h) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const air = (n.air ?? 0) > 0.9;
    setLit(lit, air ? RED : (n.air ?? 0) > 0.2 ? '#7a1f1f' : RED_D);
    setLit(tally, air ? '#ff3030' : RED_D);
    (ring.material as THREE.MeshBasicMaterial).color.set(air ? '#fff6dd' : '#7a7464');
    faderKnob.position.z = RD.fader[2] - 0.08 + 0.1 * (n.fader ?? 0);
    placeMic(h);
    phones.visible = !!now;
    hung.visible = !now;
    if (now) {
      const k = h / 1.6;
      phones.position.set(RD.seat[0], RD.seat[1] + SAT_HEAD * h - 0.135 * k, RD.seat[2] + 0.01);
      phones.scale.setScalar(k);
    }
    at(letter, (P.letter as V | null) ?? null, RD.letter);
    at(pen, (P.pen as V | null) ?? null);
    lines[3].visible = (n.lines ?? 4) > 3.5;
    const sound = (n.talking ?? 0) > 0.5 ? 0.7 + 0.3 * Math.abs(Math.sin(t * 6)) : (n.song ?? 0) > 0.5 ? 0.5 + 0.4 * Math.abs(Math.sin(t * 3.1)) : 0;
    meter.forEach((m, i) => setLit(m, sound > i / 4 + 0.05 ? (i === 3 ? '#ff5252' : '#69f0ae') : GREEN_D));
  });
  out.work = marker(g, RD.letter[0], RD.letter[1], RD.letter[2]);
}

// =============================================================================================
// 페데스탈 카메라 (tsPedestalCam, 1 × 1): a studio camera on a steerable column, with its operator. The lens to the back.

let camsBuilt = 0;
function pedestalCam(g: THREE.Group, out: Built) {
  const myCam = camsBuilt++ % 2 ? 1 : 2;
  // The base: three legs with wheels and skirts, the column and its steering ring.
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3 + Math.PI / 2;
    rod(g, v3(0, 0.2, 0), v3(Math.sin(a) * 0.36, 0.1, Math.cos(a) * 0.36), 0.03, '#37474f');
    part(g, cyl(0.055, 0.055, 0.05, 12), BLACK, Math.sin(a) * 0.36, 0.055, Math.cos(a) * 0.36, { rz: Math.PI / 2 });
  }
  part(g, cyl(0.1, 0.11, 0.2, 14), '#455a64', 0, 0.26, 0);
  const riser = group(g);
  part(riser, cyl(0.055, 0.055, 0.56, 12), '#90a4ae', 0, 0.64, 0, { outline: false });
  const ringGeom = new THREE.TorusGeometry(0.16, 0.012, 8, 28);
  const ring = new THREE.Mesh(ringGeom, new THREE.MeshToonMaterial({ color: '#b0bec5' }));
  ring.userData.ownGeometry = ring.userData.ownMaterial = true;
  ring.rotation.x = Math.PI / 2;
  ring.position.y = PC.ring[1];
  riser.add(ring);
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3;
    rod(riser, v3(0, PC.ring[1], 0), v3(Math.sin(a) * 0.16, PC.ring[1], Math.cos(a) * 0.16), 0.006, STEEL);
  }
  const head = group(riser, 0, PC.head, 0);
  part(head, cyl(0.09, 0.09, 0.05, 12), BLACK, 0, -0.05, 0);
  part(head, rbox(0.24, 0.24, 0.42, 0.02), '#263238', 0, 0.12, -0.02);
  part(head, cyl(0.07, 0.085, 0.2, 14), BLACK, 0, 0.12, -0.3, { rx: Math.PI / 2 });
  part(head, box(0.34, 0.26, 0.025), BLACK, 0, 0.12, -0.42);
  const prompt = swapPic(head, 0.3, 0.22, 0, 0.12, -0.434, Math.PI);
  label(head, BRAND, 0.2, 0.05, 0.123, 0.15, -0.02, '#263238', '#ffffff', Math.PI / 2);
  label(head, BRAND, 0.2, 0.05, -0.123, 0.15, -0.02, '#263238', '#ffffff', -Math.PI / 2);
  // The viewfinder toward the operator, big number and tally.
  part(head, rbox(0.24, 0.16, 0.06, 0.01), BLACK, 0, 0.32, 0.17, { rx: -0.2 });
  const finder = swapPic(head, 0.2, 0.12, 0, 0.32, 0.204, 0, -0.2);
  const tallyTop = ownLit(head, box(0.08, 0.03, 0.05), RED_D, 0, 0.26, 0.06);
  const tallyFront = ownLit(head, ball(0.024), RED_D, 0.13, 0.22, -0.44);
  label(head, String(myCam), 0.07, 0.07, 0, 0.14, 0.2, '#ffca28', '#1b1b24');
  // Pan bars.
  for (const sx of [-1, 1]) {
    const y = PC.grip[1] - PC.head;
    rod(head, v3(sx * 0.1, 0.05, 0.14), v3(sx * PC.grip[0], y, PC.grip[2]), 0.012, STEEL);
    part(head, cyl(0.018, 0.018, 0.1, 8), BLACK, sx * PC.grip[0], y, PC.grip[2], { rx: Math.PI / 2 });
  }
  // A cable off along the floor.
  rod(g, v3(0, 0.18, -0.08), v3(0.34, 0.012, -0.42), 0.008, BLACK);
  prompt.set(painted('tsPrompt', 200, 150, (c) => {
    c.fillStyle = '#080a10';
    c.fillRect(0, 0, 200, 150);
    ['오늘 밤도', '반갑습니다!', '첫 번째 손님,', '박수로 모실게요'].forEach((s, i) => text(c, s, 100, 28 + i * 32, 20, '#f5f5f5', 'center'));
  }));
  const op = person(g, myCam === 1 ? LOOKS.crew : LOOKS.crew2, 0, 0.62, Math.PI);
  const opSet = headset(op.head, true);
  opSet.visible = true;
  const spots: Record<string, Spot> = { tsFrameShot: standAt(g, 'tsFrame', 0, 0.62) };
  spots['*'] = spots.tsFrameShot;
  const g1 = new THREE.Vector3();
  const g2 = new THREE.Vector3();
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    const busy = working(t);
    const feed = myCam === 1 ? 1 : 2;
    const pgm = onAir(t) && ROOM.cam === feed;
    const prev = busy && ROOM.cam !== feed;
    setLit(tallyTop, pgm ? '#ff3030' : prev ? '#37c871' : RED_D);
    setLit(tallyFront, pgm ? '#ff3030' : RED_D);
    finder.set(feedTex(busy ? (myCam === 1 ? 1 : 2) : 0));
    const idlePan = busy ? 0.07 * Math.sin(t * 0.5 + myCam) : 0.04 * Math.sin(t * 0.15 + myCam);
    head.rotation.y = now ? (n.pan ?? 0) : idlePan;
    head.rotation.x = n.tilt ?? 0;
    riser.position.y = n.rise ?? 0;
    op.root.visible = !now;
    if (!now) {
      const p = idlePan;
      const c = Math.cos(p);
      const s = Math.sin(p);
      const X = PC.grip[0];
      const Z = PC.grip[2];
      g1.set(-X * c + Z * s, PC.grip[1], X * s + Z * c);
      g2.set(X * c + Z * s, PC.grip[1], -X * s + Z * c);
      op.armL(g1);
      op.armR(g2);
      op.opts.lean = busy ? 0.2 : 0.1;
      op.opts.nod = busy ? 0.16 : 0.08;
    }
  });
  out.work = marker(g, 0, PC.grip[1], PC.grip[2]);
}

// =============================================================================================
// 플로어 큐보드 (tsCueBoard, 1 × 1): a rolling board with the night's running order; a floor manager in a headset at it.

function cueBoard(g: THREE.Group, out: Built) {
  const top = CB.top + 0.14;
  for (const sx of [-1, 1]) {
    part(g, box(0.04, top, 0.04), '#78909c', sx * 0.45, top / 2, 0, { outline: false });
    part(g, box(0.05, 0.03, 0.42), '#455a64', sx * 0.45, 0.06, 0);
    for (const sz of [-1, 1]) part(g, cyl(0.03, 0.03, 0.03, 10), BLACK, sx * 0.45, 0.03, sz * 0.18, { rz: Math.PI / 2 });
  }
  part(g, box(0.9, 0.02, 0.2), '#78909c', 0, 0.45, 0.02);
  // Spare cards and markers on the tray.
  for (let i = 0; i < 3; i++) part(g, box(0.28, 0.2, 0.004), '#fff8e1', -0.22 + i * 0.05, 0.56, 0.05 - i * 0.008, { rz: 0.04 - i * 0.03 });
  part(g, rbox(0.92, 0.92, 0.03, 0.01), '#eceff1', 0, top - 0.46, 0);
  const face = swapPic(g, 0.86, 0.86, 0, top - 0.46, 0.018);
  const paint = live(344, 344);
  const ROWS = [['00:00', '오프닝'], ['02:30', '게스트 입장'], ['05:00', '토크 1'], ['14:00', '광고'], ['16:30', '게임 코너'], ['27:00', '클로징']];
  const paintBoard = (done: number, row: number, air: boolean) =>
    face.set(
      paint(`${done}|${row}|${air}`, (c) => {
        c.fillStyle = '#f7f9fa';
        c.fillRect(0, 0, 344, 344);
        c.fillStyle = PURPLE;
        c.fillRect(0, 0, 344, 44);
        text(c, `${SHOW} 큐시트`, 12, 23, 22, '#ffffff');
        if (air) {
          c.fillStyle = RED;
          c.fillRect(276, 8, 58, 28);
          text(c, 'LIVE', 305, 23, 18, '#ffffff', 'center');
        }
        ROWS.forEach(([tm, s], i) => {
          const y = 60 + i * 46;
          if (i === row) {
            c.fillStyle = '#fff3c4';
            c.fillRect(6, y - 6, 332, 42);
          }
          text(c, tm, 14, y + 15, 18, '#546e7a');
          text(c, s, 96, y + 15, 21, '#26332d');
          if (i < done) text(c, '✓', 310, y + 15, 26, '#2e7d32', 'center');
          c.fillStyle = '#cfd8dc';
          c.fillRect(6, y + 36, 332, 1);
        });
      }),
    );
  paintBoard(1, -1, false);
  // A desk clock on top with the time to the break.
  const clock = group(g, 0.26, top + 0.08, 0);
  part(clock, rbox(0.3, 0.14, 0.05, 0.01), BLACK, 0, 0, 0);
  const clockFace = swapPic(clock, 0.27, 0.11, 0, 0, 0.027);
  const paintC = live(135, 55);
  const fm = person(g, LOOKS.floor, CB.aside[0], CB.aside[1], CB.asideYaw);
  const fmSet = headset(fm.head, true);
  fmSet.visible = true;
  const board = clipboard(g);
  board.position.set(CB.aside[0] - 0.08, 1.04, CB.aside[1] - 0.26);
  const phones = headset(g, true);
  const spots: Record<string, Spot> = { tsGiveCue: standAt(g, 'tsCue', 0.02, 0.56) };
  spots['*'] = spots.tsGiveCue;
  const yaw = CB.asideYaw;
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  const lx = Math.cos(yaw);
  const lz = -Math.sin(yaw);
  const bd = (v: THREE.Vector3, side: number, up: number, ahead: number) => v.set(CB.aside[0] + lx * side + fx * ahead, up, CB.aside[1] + lz * side + fz * ahead);
  drive(g, out, spots, (now, N, t, h) => {
    const n = N?.n ?? {};
    const air = onAir(t);
    if ((n.go ?? 0) > 0.5) ROOM.clap = t;
    paintBoard(now ? Math.round(n.done ?? 1) : air ? 3 : 1, now ? Math.round(n.row ?? -1) : air ? 2 : -1, air);
    const sec = Math.floor(t);
    clockFace.set(paintC(`${sec}`, (c) => {
      c.fillStyle = '#10151a';
      c.fillRect(0, 0, 135, 55);
      const left = 600 - (sec % 600);
      text(c, `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`, 67, 28, 34, air ? '#ff5252' : '#ffb74d', 'center');
    }));
    // The floor manager gives way to whoever's using it.
    fm.root.visible = !now;
    board.visible = !now;
    if (!now) {
      const k = (t * 0.25) % 1;
      const cue = working(t) && k < 0.4;
      fm.armL(bd(a1, 0.14, 1.06, 0.28));
      if (cue) fm.armR(bd(a2, -0.22, 1.56 - 0.05 * Math.abs(Math.sin(t * 3)), 0.2));
      else fm.armR(bd(a2, -0.08, 1.02, 0.28));
      fm.opts.nod = cue ? -0.05 : 0.2;
      fm.opts.lean = 0.03;
    }
    phones.visible = !!N;
    if (N) {
      phones.position.set(N.st.x, N.st.y + 0.92 * h, N.st.z);
      phones.rotation.y = N.st.yaw;
      phones.scale.setScalar(h / 1.6);
    }
  });
  out.work = marker(g, 0, 1.0, 0.1);
}

// =============================================================================================
// 방청석 (tsAudienceBench, 4 × 2): two tiered benches with people on them; they clap when the sign or the warm-up says.

function audienceBench(g: THREE.Group, out: Built, W: number) {
  const STEP = 0.26;
  const SEAT = 0.44;
  // The rear riser and its carpet.
  part(g, rbox(W - 0.04, STEP, 0.92, 0.02), '#2f2550', 0, STEP / 2, -0.52);
  part(g, box(W - 0.1, 0.006, 0.88), '#4b3a78', 0, STEP + 0.003, -0.52, { outline: false });
  const lit = new THREE.MeshBasicMaterial({ color: PINK });
  part(g, box(W - 0.1, 0.012, 0.006), PINK, 0, STEP - 0.03, -0.055, { outline: false, material: lit });
  // Two rows of long benches on legs, cushions in the show's colours.
  const bench = (y: number, z: number) => {
    part(g, rbox(W - 0.2, 0.05, 0.42, 0.015), '#37304f', 0, y + SEAT - 0.08, z);
    for (let i = 0; i < 6; i++) part(g, rbox((W - 0.3) / 6 - 0.04, 0.05, 0.4, 0.02), i % 2 ? '#7e57c2' : '#5e35b1', -W / 2 + 0.2 + ((W - 0.4) * (i + 0.5)) / 6, y + SEAT - 0.025, z);
    for (const x of [-1.6, -0.55, 0.55, 1.6]) part(g, box(0.05, SEAT - 0.1, 0.36), BLACK, x, y + (SEAT - 0.1) / 2, z);
    part(g, box(W - 0.2, 0.3, 0.03), '#37304f', 0, y + SEAT + 0.2, z - 0.2, { rx: -0.06 });
  };
  bench(0, 0.36);
  bench(STEP, -0.5);
  // A sign on the front rail, a pair of little lamps for it to read by.
  part(g, box(W - 0.1, 0.04, 0.03), '#78909c', 0, 0.28, 0.76);
  for (const x of [-1.7, 0, 1.7]) part(g, cyl(0.016, 0.016, 0.26, 8), '#78909c', x, 0.14, 0.76, { outline: false });
  const banner = group(g, 0, 0.18, 0.78);
  part(banner, box(1.1, 0.16, 0.01), PURPLE, 0, 0, 0);
  label(banner, '방청객 여러분 환영합니다', 1.02, 0.12, 0, 0, 0.007, PURPLE, '#ffffff');
  // The people: three bodies at most, a row each spread out.
  const SEATS: Array<[number, number, number, Look, 'female' | 'male', number]> = [
    [-1.05, 0.36, 0, LOOKS.fan1, 'female', 0.11],
    [0.72, 0.36, 0, LOOKS.fan2, 'male', -0.1],
    [-0.1, -0.5, STEP, LOOKS.fan3, 'female', 0.02],
  ];
  const fans = SEATS.map(([x, z, y, look, gender, ry]) => ({ f: person(g, look, x, z, ry, { seat: SEAT, y, gender }), x, z, y, ph: x * 3 }));
  // Bags and coats on empty seats, a pair of light sticks.
  part(g, rbox(0.3, 0.24, 0.16, 0.05), '#a1887f', -0.18, SEAT + 0.12, 0.36);
  part(g, rbox(0.26, 0.2, 0.16, 0.05), '#546e7a', 1.25, STEP + SEAT + 0.1, -0.5);
  const spots: Record<string, Spot> = { tsWarmUp: standAt(g, 'tsWarm', AB.at[0], AB.at[1]) };
  spots['*'] = spots.tsWarmUp;
  const vL = new THREE.Vector3();
  const vR = new THREE.Vector3();
  drive(g, out, spots, (_now, N, t) => {
    const n = N?.n ?? {};
    if ((n.clap ?? 0) > 0.5) ROOM.clap = t;
    const clapping = live_(ROOM.clap, t);
    (lit.color as THREE.Color).set(clapping ? '#ff8ac6' : onAir(t) ? PINK : '#7a2a57');
    for (const a of fans) {
      const top = a.y + SEAT;
      if (clapping) {
        const apart = 0.02 + 0.05 * Math.abs(Math.sin(t * 8 + a.ph));
        a.f.armL(vL.set(a.x + apart, top + 0.36, a.z + 0.28));
        a.f.armR(vR.set(a.x - apart, top + 0.36, a.z + 0.28));
        a.f.opts.nod = -0.08;
        a.f.opts.lean = 0.03 * Math.sin(t * 6 + a.ph);
      } else if ((n.wave ?? 0) > 0.5) {
        a.f.armL(vL.set(a.x + 0.22 + 0.06 * Math.sin(t * 5 + a.ph), top + 0.72, a.z + 0.16));
        a.f.armR(null);
        a.f.opts.nod = -0.05;
      } else {
        a.f.armL(null);
        a.f.armR(null);
        // Talking to the neighbour, or watching the floor.
        a.f.head.rotation.y = 0.4 * Math.sin(t * 0.12 + a.ph);
        a.f.opts.nod = 0.04 * Math.sin(t * 0.5 + a.ph);
        a.f.opts.lean = 0;
      }
    }
  });
  out.work = marker(g, 0, 1.0, 0.3);
}

// =============================================================================================
// 박수 사인 (tsApplauseSign, 1 × 1): a lit box on a pole. Set dressing that the whole floor answers to.

function applauseSign(g: THREE.Group, out: Built) {
  part(g, cyl(0.2, 0.22, 0.05, 16), BLACK, 0, 0.03, -0.2);
  part(g, cyl(0.022, 0.022, 1.8, 8), STEEL, 0, 0.94, -0.2, { outline: false });
  const b = group(g, 0, 2.0, -0.17);
  part(b, rbox(0.9, 0.36, 0.14, 0.02), BLACK, 0, 0, 0);
  const lit = ownLit(b, box(0.84, 0.3, 0.004), '#3a1216', 0, 0, 0.072);
  glowText(b, '박수!', 0.6, 0.25, 0, 0, 0.076, '#fff8e1');
  const bulbs = Array.from({ length: 16 }, (_, i) => {
    const onTop = i < 8;
    return ownLit(b, ball(0.014), '#59481b', -0.39 + ((i % 8) * 0.78) / 7, onTop ? 0.17 : -0.17, 0.076);
  });
  out.away = (_o, t) => {
    const on = live_(ROOM.clap, t);
    setLit(lit, on ? (Math.sin(t * 9) > -0.3 ? RED : '#b71c1c') : '#3a1216');
    bulbs.forEach((m, i) => setLit(m, on && (Math.floor(t * 9) + i) % 2 ? '#ffe082' : '#59481b'));
  };
}

// =============================================================================================
// 게임 코너 부저 책상 (tsBuzzerDesk, 3 × 1): three podiums and their big buzzers before a board of chasing lights.

function buzzerDesk(g: THREE.Group, out: Built, W: number) {
  part(g, box(W - 0.02, 0.02, 0.98), '#332a58', 0, 0.01, 0, { outline: false });
  // The board.
  part(g, rbox(W - 0.04, 2.0, 0.07, 0.02), NIGHT, 0, 1.0, -0.46);
  picture(g, painted('tsGameBoard', 640, 200, (c) => {
    const grad = c.createLinearGradient(0, 0, 640, 0);
    grad.addColorStop(0, '#7b1fa2');
    grad.addColorStop(0.5, '#e91e63');
    grad.addColorStop(1, '#ff9800');
    c.fillStyle = grad;
    c.fillRect(0, 0, 640, 200);
    c.fillStyle = 'rgba(255,255,255,0.14)';
    for (let i = 0; i < 12; i++) {
      c.beginPath();
      c.moveTo(320, 220);
      c.lineTo(i * 60 - 20, -10);
      c.lineTo(i * 60 + 10, -10);
      c.fill();
    }
    text(c, GAME, 320, 92, 60, '#ffffff', 'center');
    text(c, '누르면 끝! 먼저 누른 사람의 기회', 320, 158, 24, '#fff3c4', 'center');
  }), W - 0.3, 0.88, 0, 1.44, -0.42);
  const chase = Array.from({ length: 24 }, (_, i) => ownLit(g, ball(0.02), '#59481b', -W / 2 + 0.1 + (i * (W - 0.2)) / 23, 1.94, -0.415));
  // The podiums, a score on each, a dome in a ring on its slanted top.
  const domes: THREE.Mesh[] = [];
  const caps: THREE.Group[] = [];
  const scores = BZ.xs.map((x, i) => {
    const pod = group(g, x, 0, 0.12);
    part(pod, rbox(0.72, BZ.top - 0.03, 0.42, 0.03), ['#7b1fa2', '#00838f', '#ef6c00'][i], 0, (BZ.top - 0.03) / 2, 0);
    part(pod, rbox(0.76, 0.04, 0.46, 0.01), '#fff3c4', 0, BZ.top - 0.02, 0);
    part(pod, box(0.72, 0.02, 0.005), '#ffe082', 0, 0.2, 0.213, { outline: false });
    const cap = group(g, x, BZ.top, BZ.buzz);
    part(cap, cyl(0.11, 0.12, 0.03, 18), BLACK, 0, 0.012, 0);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.09, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#7f1d1d' }));
    dome.userData.ownGeometry = dome.userData.ownMaterial = true;
    dome.position.y = 0.025;
    cap.add(dome);
    domes.push(dome);
    caps.push(cap);
    part(pod, box(0.48, 0.3, 0.012), BLACK, 0, 0.56, 0.214);
    const score = swapPic(pod, 0.44, 0.26, 0, 0.56, 0.222);
    const paint = live(176, 104);
    return (v: number, on: boolean) =>
      score.set(
        paint(`${v}${on}`, (c) => {
          c.fillStyle = on ? '#3a0d0d' : '#0d0f18';
          c.fillRect(0, 0, 176, 104);
          text(c, `${i + 1}번 팀`, 88, 20, 16, '#ffe082', 'center');
          text(c, String(v), 88, 66, 54, on ? '#ff8a80' : '#69f0ae', 'center');
        }),
      );
  });
  scores.forEach((s, i) => s([20, 10, 30][i], false));
  // Contestants only come for a game.
  const c2 = lazy(() => person(g, LOOKS.guest, BZ.xs[1], BZ.backZ, 0, { gender: 'male' }));
  const c3 = lazy(() => person(g, LOOKS.guest2, BZ.xs[2], BZ.backZ, 0, { gender: 'female' }));
  const card = group(g);
  part(card, box(0.14, 0.2, 0.004), '#fff8e1', 0, 0, 0);
  card.visible = false;
  const O = group(g, 0, 1.55, 0.2);
  glowText(O, 'O', 0.3, 0.3, 0, 0, 0, '#69f0ae');
  O.visible = false;
  const X = group(g, 0, 1.55, 0.2);
  glowText(X, 'X', 0.3, 0.3, 0, 0, 0, '#ff5252');
  X.visible = false;
  const rnd = seeded(5);
  const paper = Array.from({ length: 14 }, (_, i) => {
    const m = part(g, box(0.035, 0.005, 0.035), ['#ec407a', '#ffca28', '#42a5f5', '#66bb6a'][i % 4], 0, 0, 0, { outline: false });
    m.visible = false;
    return { m, x: -1 + rnd() * 2, z: 0.2 + rnd() * 0.6, ph: rnd() };
  });
  const spots: Record<string, Spot> = { tsRunGame: standAt(g, 'tsQuiz', BZ.mc[0], BZ.mc[1], BZ.mcYaw), tsTestBuzzer: standAt(g, 'tsBuzz', BZ.xs[0], 0.66) };
  spots['*'] = spots.tsRunGame;
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const lit = Math.round(n.lit ?? 0);
    if (now === 'tsRunGame') ROOM.game = t;
    if ((n.clap ?? 0) > 0.5) ROOM.clap = t;
    domes.forEach((m, i) => setLit(m as THREE.Mesh, lit === i + 1 ? '#ff3b30' : '#7f1d1d'));
    caps.forEach((cap, i) => {
      const pressed = now === 'tsTestBuzzer' ? lit === i + 1 : i === 1 ? (n.press2 ?? 0) > 0.3 : i === 2 ? (n.press3 ?? 0) > 0.3 : false;
      cap.position.y = BZ.top - (pressed ? 0.012 : 0);
    });
    const running = now === 'tsRunGame';
    scores.forEach((s, i) => s([20, 10 + Math.round(n.score2 ?? 0) * 10, 30][i], lit === i + 1));
    chase.forEach((m, i) => setLit(m, running ? ((Math.floor(t * 8) + i) % 3 === 0 ? '#ffe082' : '#59481b') : Math.floor(t * 0.6 + i * 0.3) % 5 === 0 ? '#b39b4f' : '#59481b'));
    at(card, (P.card as V | null) ?? null);
    if (card.visible && N) card.rotation.y = N.st.yaw + Math.PI;
    O.visible = (n.ding ?? 0) > 0.5;
    if (O.visible) O.position.x = BZ.xs[1];
    X.visible = (n.wrong ?? 0) > 0.5;
    if (X.visible) X.position.x = BZ.xs[2];
    if ((n.ding ?? 0) > 0.5) for (const p of paper) {
      p.m.visible = true;
      const u = (t * 0.5 + p.ph) % 1;
      p.m.position.set(p.x + 0.05 * Math.sin(t * 3 + p.ph * 8), 1.9 - u * 1.85, p.z);
      p.m.rotation.set(t * 3 + p.ph * 6, t * 2, 0);
    }
    else for (const p of paper) p.m.visible = false;
    if (running) {
      const f2 = c2.get();
      const f3 = c3.get();
      const raise = (f: Fig, x: number, press: number) => {
        f.armR(a1.set(x - 0.02, BZ.top + 0.08 + 0.1 * (1 - press), BZ.buzz - 0.02));
        f.armL(a2.set(x + 0.2, BZ.top + 0.02, BZ.buzz - 0.12));
        f.opts.lean = 0.18 + 0.1 * press;
        f.opts.nod = 0.1;
      };
      raise(f2, BZ.xs[1], n.press2 ?? 0);
      raise(f3, BZ.xs[2], n.press3 ?? 0);
    } else {
      c2.hide();
      c3.hide();
    }
  });
  out.work = marker(g, BZ.xs[1], BZ.top, BZ.buzz);
}

// =============================================================================================
// 부조정실 콘솔 (tsControlDesk, 4 × 2): the gallery. Every camera's screen, the big programme and preview, the mixer.

function controlDesk(g: THREE.Group, out: Built, W: number, D: number) {
  const back = -D / 2 + 0.08;
  // The wall.
  part(g, rbox(W - 0.04, 2.2, 0.12, 0.02), '#15161e', 0, 1.1, back);
  // The big two: programme in a red frame, preview in a green one.
  const big = (x: number, frame: string, name: string) => {
    part(g, box(1.1, 0.68, 0.012), frame, x, 1.5, back + 0.066, { outline: false, material: new THREE.MeshBasicMaterial({ color: frame }) }).userData.ownMaterial = true;
    label(g, name, 0.5, 0.08, x, 1.91, back + 0.066, '#15161e', frame);
    return swapPic(g, 1.04, 0.62, x, 1.5, back + 0.074);
  };
  const pgm = big(-0.65, RED, 'PGM 방송');
  const pvw = big(0.65, GREEN, 'PVW 미리보기');
  // A row of cameras under them, an edge row of bars and graphics at the sides.
  const smalls: Array<[number, number, number, string]> = [
    [-1.2, 0.94, 1, 'CAM 1'],
    [-0.6, 0.94, 2, 'CAM 2'],
    [0, 0.94, 0, 'CAM 3'],
    [0.6, 0.94, 4, '게임'],
    [1.2, 0.94, 5, '방청석'],
  ];
  for (const [x, y, i, name] of smalls) {
    part(g, box(0.56, 0.34, 0.01), BLACK, x, y, back + 0.064, { outline: false });
    picture(g, feedTex(i), 0.52, 0.29, x, y, back + 0.072);
    label(g, name, 0.3, 0.05, x, y + 0.2, back + 0.072, '#15161e', '#cfd8dc');
  }
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      part(g, box(0.34, 0.24, 0.01), BLACK, sx * 1.6, 1.68 - i * 0.34, back + 0.064, { outline: false });
      picture(g, i ? barsTex() : feedTex(sx < 0 ? 3 : 5), 0.3, 0.2, sx * 1.6, 1.68 - i * 0.34, back + 0.072);
    }
  }
  // The clock over the wall, and the sign of the room.
  const clock = swapPic(g, 0.5, 0.14, 0, 2.08, back + 0.072);
  const paintC = live(200, 56);
  label(g, '부조정실', 0.5, 0.12, -1.5, 2.08, back + 0.072, '#15161e', '#ffd27f');
  // The console: a long desk, a slope with the mixer in the middle.
  const T = CT.top;
  part(g, rbox(W - 0.1, 0.05, 0.64, 0.02), '#2b2d36', 0, T - 0.025, 0.2);
  part(g, box(W - 0.12, T - 0.05, 0.05), '#20222a', 0, (T - 0.05) / 2, -0.08);
  for (const sx of [-1, 1]) part(g, box(0.05, T - 0.05, 0.56), '#20222a', sx * (W / 2 - 0.08), (T - 0.05) / 2, 0.18);
  part(g, rbox(1.0, 0.04, 0.36, 0.008), '#17181e', -0.05, T + 0.02, 0.26);
  // Rows of buttons: the top row lit for what's on air, the bottom for what's next.
  const bus = (z: number) => Array.from({ length: 6 }, (_, i) => ownLit(g, box(0.05, 0.016, 0.04), '#3a3c44', CT.buttons[0] - 0.2 + i * 0.1, T + 0.046, z));
  const pgmRow = bus(0.2);
  const pvwRow = bus(0.28);
  const moreRow = bus(0.36);
  moreRow.forEach((m, i) => setLit(m, ['#455a64', '#37474f'][i % 2]));
  // The T-bar.
  const tb = group(g, CT.tbar[0], T + 0.04, 0.27);
  part(tb, box(0.12, 0.012, 0.2), '#0f1114', 0, 0, 0, { outline: false });
  const lever = group(tb);
  rod(lever, v3(0, 0, 0), v3(0, 0.1, 0), 0.008, STEEL);
  part(lever, rbox(0.13, 0.024, 0.024, 0.008), '#eceff1', 0, 0.11, 0);
  // Knobs for audio on one side, a sheet of the running order on the other, talkback on a gooseneck, mugs.
  const rr = seeded(9);
  for (let i = 0; i < 12; i++) part(g, cyl(0.014, 0.014, 0.02, 10), BLACK, -1.46 + (i % 6) * 0.08, T + 0.012, 0.12 + Math.floor(i / 6) * 0.1 + rr() * 0.005, { outline: false });
  rod(g, v3(CT.mic[0], T, CT.mic[2] - 0.12), v3(CT.mic[0], CT.mic[1], CT.mic[2]), 0.006, STEEL);
  part(g, cyl(0.015, 0.012, 0.05, 8), BLACK, CT.mic[0], CT.mic[1], CT.mic[2] + 0.015, { rx: Math.PI / 2, outline: false });
  const talkLit = ownLit(g, ball(0.012), RED_D, CT.mic[0] + 0.04, T + 0.012, CT.mic[2] - 0.1);
  const sheet = sheetMesh(g, 0.24, 0.3);
  place(sheet, CT.sheet);
  const pen = group(g);
  penMesh(pen);
  part(g, cyl(0.038, 0.034, 0.09, 10), '#fafafa', 1.0, T + 0.045, 0.32);
  // A blue line along the desk: it's dim in here, and it's lit.
  ownLit(g, box(W - 0.2, 0.006, 0.006), '#4fc3f7', 0, T - 0.054, 0.525);
  officeChair(g, CT.seat[0], CT.seat[1], CT.seat[2], Math.PI);
  officeChair(g, 1.25, 0.5, 0.74, Math.PI);
  // The technical director, always at the second seat.
  const td = person(g, LOOKS.crew, 1.25, 0.74, Math.PI, { seat: 0.5 });
  const tdSet = headset(td.head, true);
  tdSet.visible = true;
  part(g, rbox(0.36, 0.02, 0.2, 0.008), '#17181e', 1.25, T + 0.012, 0.3);
  const spots: Record<string, Spot> = { tsSwitchShots: seatAt(g, 'tsSwitch', CT.seat, Math.PI), tsCheckAir: seatAt(g, 'tsCheck', CT.seat, Math.PI) };
  spots['*'] = spots.tsSwitchShots;
  const bars = barsTex();
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const air = onAir(t);
    if (now === 'tsSwitchShots') ROOM.cam = Math.round(n.cam ?? 0);
    const busy = air || !!now || live_(ROOM.rehearse, t);
    const cam = live_(ROOM.game, t) ? 4 : live_(ROOM.news, t) ? 3 : ROOM.cam;
    pgm.set(busy ? feedTex(cam) : bars);
    const prev = now === 'tsSwitchShots' ? Math.round(n.prev ?? -1) : -1;
    pvw.set(busy ? feedTex(prev >= 0 ? prev : (cam + 1) % 3) : feedTex(5));
    lever.rotation.x = (n.tbar ?? 0) * -0.7 + 0.35;
    pgmRow.forEach((m, i) => setLit(m, busy && i === cam ? RED : '#3a3c44'));
    pvwRow.forEach((m, i) => setLit(m, busy && i === (prev >= 0 ? prev : (cam + 1) % 3) ? GREEN : '#3a3c44'));
    setLit(talkLit, (n.talkback ?? 0) > 0.5 ? '#ff5252' : RED_D);
    at(pen, (P.pen as V | null) ?? null);
    const sec = Math.floor(t);
    clock.set(paintC(`${sec}${air}`, (c) => {
      c.fillStyle = '#0d0f12';
      c.fillRect(0, 0, 200, 56);
      const m = Math.floor(sec / 60) % 60;
      text(c, `${air ? '● ' : ''}21:${String(m).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`, 100, 29, 30, air ? '#ff5252' : '#ffb74d', 'center');
    }));
    // The TD's hands on their own little panel.
    const tap = 0.012 * Math.abs(Math.sin(t * (busy ? 5 : 1.2)));
    td.armL(a1.set(1.11, T + 0.05 + tap, 0.32));
    td.armR(a2.set(1.39, T + 0.05 + 0.012 * Math.abs(Math.cos(t * (busy ? 4 : 1))), 0.32));
    td.opts.nod = busy ? 0.02 : 0.2;
    td.opts.lean = busy ? 0.08 : 0.03;
  });
  out.work = marker(g, CT.buttons[0], CT.buttons[1], CT.buttons[2]);
}

// =============================================================================================
// 대본 책상 (tsScriptTable, 3 × 1): a long table for the writers: tabbed scripts, a laptop, highlighters.

function scriptTable(g: THREE.Group, out: Built, W: number) {
  const T = ST.top;
  part(g, rbox(W - 0.08, 0.05, 0.76, 0.015), '#b08968', 0, T - 0.025, 0);
  for (const sx of [-1, 1]) {
    part(g, box(0.06, T - 0.05, 0.62), '#37304f', sx * (W / 2 - 0.16), (T - 0.05) / 2, 0);
  }
  part(g, box(W - 0.3, 0.3, 0.02), '#37304f', 0, T - 0.2, -0.28, { outline: false });
  // Stacks of scripts with coloured tabs along the back.
  const r = seeded(31);
  for (let s = 0; s < 6; s++) {
    const x = -1.25 + s * 0.28;
    const n = 3 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) part(g, box(0.21, 0.012, 0.29), i % 2 ? PAPER : '#f1ece0', x, T + 0.006 + i * 0.012, -0.2, { ry: (r() - 0.5) * 0.08, outline: false });
    part(g, box(0.05, 0.03, 0.01), ['#ec407a', '#ffca28', '#42a5f5', '#66bb6a'][s % 4], x + 0.05, T + 0.015 + n * 0.012, -0.05, { outline: false });
  }
  // The name of the show on the top script, standing up against the pile.
  const stood = group(g, 0.75, T + 0.16, -0.26);
  stood.rotation.x = -0.15;
  part(stood, box(0.26, 0.34, 0.012), PURPLE, 0, 0, 0);
  label(stood, SHOW, 0.22, 0.05, 0, 0.08, 0.008, PURPLE, '#ffffff');
  label(stood, '38회 대본', 0.18, 0.04, 0, 0.0, 0.008, PURPLE, '#ffd27f');
  // The laptop, open.
  part(g, rbox(0.36, 0.012, 0.24, 0.008), '#b0bec5', ST.keys[0], T + 0.008, ST.keys[2]);
  for (let i = 0; i < 4; i++) part(g, box(0.3, 0.002, 0.02), '#37474f', ST.keys[0], T + 0.015, ST.keys[2] - 0.08 + i * 0.03, { outline: false });
  const lid = group(g, ST.keys[0], T + 0.014, ST.keys[2] - 0.12);
  lid.rotation.x = -0.25;
  part(lid, box(0.36, 0.24, 0.01), '#b0bec5', 0, 0.12, 0);
  const screen = swapPic(lid, 0.32, 0.2, 0, 0.12, 0.007);
  const paint = live(192, 120);
  const paintLaptop = (typed: number) =>
    screen.set(
      paint(`${typed}`, (c) => {
        c.fillStyle = '#fbfaf6';
        c.fillRect(0, 0, 192, 120);
        c.fillStyle = PURPLE;
        c.fillRect(0, 0, 192, 18);
        text(c, '오프닝 멘트_최종_진짜최종', 6, 10, 10, '#ffffff');
        ['MC: 오늘 밤도 찾아와 주셔서', '감사합니다, 여러분!', '(박수) 오늘의 첫 손님은...', 'MC: 다들 놀라실 텐데요!'].slice(0, typed).forEach((s, i) => text(c, s, 8, 34 + i * 20, 12, '#26332d'));
      }),
    );
  paintLaptop(3);
  // The script being worked on, its yellow lines, a highlighter, a mug.
  const sc = sheetMesh(g, 0.22, 0.3);
  place(sc, ST.script);
  const marks = [0, 1, 2].map((i) => part(g, box(0.15, 0.001, 0.016), '#fff176', ST.script[0], ST.script[1] + 0.004, ST.script[2] - 0.05 + i * 0.05, { outline: false }));
  const pen = group(g);
  part(pen, cyl(0.009, 0.009, 0.12, 8), '#fdd835', 0, 0, 0, { rz: 1.25, ry: 0.5, outline: false });
  const mug = group(g);
  part(mug, cyl(0.036, 0.032, 0.09, 12), '#ec407a', 0, 0.045, 0);
  at(mug, ST.mug);
  const held = sheetMesh(g, 0.22, 0.3);
  held.rotation.x = 1.1;
  held.visible = false;
  // Chairs out front, a writer at the far one.
  officeChair(g, ST.seat[0], ST.seat[1], ST.seat[2], Math.PI, PURPLE);
  officeChair(g, ST.writer, 0.5, ST.seat[2], Math.PI, PURPLE);
  const writer = person(g, LOOKS.writer, ST.writer, ST.seat[2], Math.PI, { seat: 0.5, gender: 'female' });
  part(g, rbox(0.3, 0.012, 0.2, 0.008), '#90a4ae', ST.writer, T + 0.007, 0.18);
  const spots: Record<string, Spot> = { tsPunchUp: seatAt(g, 'tsPunch', ST.seat, Math.PI), tsReadThrough: seatAt(g, 'tsReading', ST.seat, Math.PI) };
  spots['*'] = spots.tsPunchUp;
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    marks.forEach((m, i) => (m.visible = (n.marked ?? 0) > (i + 0.2) / 3));
    at(pen, (P.pen as V | null) ?? null);
    at(mug, (P.mug as V | null) ?? null, ST.mug);
    const up = (n.up ?? 0) > 0.5;
    sc.visible = !up;
    at(held, up ? (P.script as V | null) ?? null : null);
    if (now === 'tsPunchUp') paintLaptop(1 + (Math.floor(t * 0.8) % 4));
    // The writer typing, and laughing at the funny bit.
    const laugh = (n.laughing ?? 0) > 0.5;
    const tap = 0.012 * Math.abs(Math.sin(t * 5));
    writer.armL(a1.set(ST.writer - 0.1, T + 0.04 + (laugh ? 0.18 : tap), 0.2 + (laugh ? 0.14 : 0)));
    writer.armR(a2.set(ST.writer + 0.1, T + 0.04 + (laugh ? 0.18 : 0.012 * Math.abs(Math.cos(t * 4))), 0.2 + (laugh ? 0.14 : 0)));
    writer.opts.lean = laugh ? -0.05 : 0.12;
    writer.opts.nod = laugh ? -0.08 : 0.28;
    writer.head.rotation.y = (n.reading ?? 0) > 0.5 ? 0.6 : 0;
  });
  out.work = marker(g, ST.script[0], ST.script[1], ST.script[2]);
}

// =============================================================================================
// 출연자 대기실 (tsGreenBrief, 3 × 2): a low screen, a couch with today's guest, an armchair for whoever's briefing them.

function greenBrief(g: THREE.Group, out: Built, W: number, D: number) {
  part(g, rbox(W - 0.06, 0.01, D - 0.06, 0.005), '#567568', 0, 0.006, 0, { outline: false });
  // The screen at the back, low so it hides nobody: the room's sign, a mirror-lit strip.
  const back = -D / 2 + 0.05;
  part(g, rbox(W - 0.1, 1.2, 0.05, 0.01), '#3f5a4f', 0, 0.6, back);
  label(g, '출연자 대기실', 0.74, 0.13, -0.8, 1.04, back + 0.03, '#26382f', '#e8f5e9');
  label(g, `오늘의 손님: ${SHOW}`, 0.86, 0.1, 0.6, 1.04, back + 0.03, '#26382f', '#ffd27f');
  ownLit(g, box(W - 0.3, 0.012, 0.006), '#fff3c4', 0, 1.17, back + 0.03);
  // The couch: a guest's own place, cushions, a pillow.
  const couch = group(g, GB.guest[0], 0, GB.guest[2], GB.guestYaw);
  part(couch, rbox(1.3, 0.28, 0.62, 0.05), '#6d8c7c', 0, 0.2, 0);
  for (const sx of [-1, 1]) part(couch, rbox(0.6, 0.1, 0.56, 0.04), '#7da08f', sx * 0.31, 0.39, 0.02);
  part(couch, rbox(1.3, 0.42, 0.14, 0.05), '#6d8c7c', 0, 0.56, -0.26, { rx: -0.08 });
  for (const sx of [-1, 1]) part(couch, rbox(0.12, 0.38, 0.62, 0.05), '#5f7c6d', sx * 0.63, 0.33, 0);
  part(couch, rbox(0.26, 0.24, 0.09, 0.04), PINK, 0.42, 0.56, -0.14, { rx: -0.2, rz: -0.15 });
  // The armchair for the briefing.
  const arm = group(g, GB.seat[0], 0, GB.seat[2], GB.yaw);
  part(arm, rbox(0.6, 0.3, 0.56, 0.05), '#a1887f', 0, 0.21, 0);
  part(arm, rbox(0.54, 0.1, 0.5, 0.04), '#bcaaa4', 0, 0.4, 0.02);
  part(arm, rbox(0.56, 0.48, 0.12, 0.05), '#a1887f', 0, 0.62, -0.24, { rx: -0.08 });
  for (const sx of [-1, 1]) part(arm, rbox(0.09, 0.26, 0.5, 0.04), '#8d6e63', sx * 0.3, 0.42, 0);
  // The low table: water, sweets, a vase, the guest's name card, the running order and a pen.
  const tb = GB.table;
  part(g, cyl(0.36, 0.36, 0.03, 26), '#eef2ef', tb[0], tb[1], tb[2]);
  part(g, cyl(0.04, 0.05, tb[1], 10), STEEL, tb[0], tb[1] / 2, tb[2], { outline: false });
  part(g, cyl(0.17, 0.2, 0.02, 18), STEEL, tb[0], 0.015, tb[2], { outline: false });
  const onT = tb[1] + 0.015;
  for (const [x, z] of [[-0.14, 0.12], [-0.05, 0.2]] as const) {
    part(g, cyl(0.026, 0.03, 0.14, 12), '#b3e5fc', tb[0] + x, onT + 0.07, tb[2] + z);
    part(g, cyl(0.012, 0.012, 0.03, 8), '#1565c0', tb[0] + x, onT + 0.155, tb[2] + z, { outline: false });
  }
  part(g, cyl(0.09, 0.05, 0.04, 16), '#fff3e0', tb[0] + 0.16, onT + 0.02, tb[2] - 0.08);
  for (let i = 0; i < 5; i++) part(g, ball(0.018), ['#ffb74d', '#f06292', '#81c784'][i % 3], tb[0] + 0.14 + (i % 3) * 0.022, onT + 0.05, tb[2] - 0.1 + (i % 2) * 0.03, { outline: false });
  part(g, cyl(0.03, 0.04, 0.14, 12), '#7d9a87', tb[0] - 0.1, onT + 0.07, tb[2] - 0.18);
  for (let i = 0; i < 4; i++) part(g, ball(0.024), ['#f8bbd0', '#fff59d'][i % 2], tb[0] - 0.1 + Math.cos(i * 1.6) * 0.03, onT + 0.17, tb[2] - 0.18 + Math.sin(i * 1.6) * 0.03, { outline: false });
  const nameCard = group(g, tb[0] + 0.08, onT + 0.04, tb[2] + 0.14);
  part(nameCard, box(0.18, 0.08, 0.006), PAPER, 0, 0, 0);
  label(nameCard, '출연자님', 0.16, 0.05, 0, 0, 0.004, PAPER, '#3a2415');
  // Today's guest, nodding along.
  const guest = person(g, LOOKS.guest2, GB.guest[0], GB.guest[2], GB.guestYaw + 0.6, { seat: GB.guest[1], gender: 'female' });
  // Whoever's briefing them when the dweller isn't: the writer in the armchair.
  const briefer = lazy(() => person(g, LOOKS.writer, GB.seat[0], GB.seat[2], GB.yaw, { seat: GB.seat[1], gender: 'female' }));
  const brBoard = group(g);
  clipboard(brBoard);
  const board = group(g);
  clipboard(board);
  board.visible = false;
  const pen = group(g);
  penMesh(pen, '#1565c0');
  pen.visible = false;
  const spots: Record<string, Spot> = { tsBriefGuest: seatAt(g, 'tsBrief', GB.seat, GB.yaw) };
  spots['*'] = spots.tsBriefGuest;
  const yaw = GB.yaw;
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  const lx = Math.cos(yaw);
  const lz = -Math.sin(yaw);
  const bd = (v: THREE.Vector3, side: number, up: number, ahead: number) => v.set(GB.seat[0] + lx * side + fx * ahead, GB.seat[1] + up, GB.seat[2] + lz * side + fz * ahead);
  const gv = new THREE.Vector3();
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    at(board, (P.board as V | null) ?? null);
    at(pen, (P.pen as V | null) ?? null);
    if (now) {
      briefer.hide();
      brBoard.visible = false;
    } else {
      const f = briefer.get();
      bd(a1, 0.1, 0.24, 0.3);
      brBoard.visible = true;
      brBoard.position.copy(a1).setY(a1.y + 0.03);
      f.armL(a1);
      f.armR(bd(a2, -0.16, 0.28 + 0.03 * Math.sin(t * 2), 0.32));
      f.opts.lean = 0.08;
      f.opts.nod = 0.05 + 0.04 * Math.sin(t * 0.8);
    }
    // The guest: nods when asked, talks with a hand when answering, laughs, reaches for the sheet, shakes hands.
    const talk = now ? (n.answering ?? 0) > 0.5 : Math.sin(t * 0.3) > 0;
    const laugh = (n.laughing ?? 0) > 0.5;
    guest.head.rotation.y = -0.2;
    guest.opts.lean = laugh ? -0.04 + 0.03 * Math.sin(t * 8) : (n.shown ?? 0) > 0.5 ? 0.14 : 0.03;
    guest.opts.nod = (n.asking ?? 0) > 0.5 ? 0.04 + 0.06 * Math.abs(Math.sin(t * 2.5)) : laugh ? -0.08 : (n.shown ?? 0) > 0.5 ? 0.2 : 0.02;
    if ((n.shake ?? 0) > 0.5) guest.armR(gv.set(GB.guest[0] + 0.7, GB.guest[1] + 0.24 + 0.02 * Math.sin(t * 19), GB.guest[2]));
    else if (talk) guest.armR(gv.set(GB.guest[0] + 0.3, GB.guest[1] + 0.3 + 0.03 * Math.sin(t * 3.3), GB.guest[2] + 0.2));
    else guest.armR(null);
  });
  out.work = marker(g, tb[0], onT + 0.02, tb[2]);
}

/**
 * The ON AIR light by a studio's door (2026-11-05, the layout audit): a black box on its bracket high on the wall, the red panel lit
 * and the words on it; under it the plate '방송 중 출입 금지'. Set dressing, against the wall beside the door.
 */
function onAirSign(g: THREE.Group, _W: number, D: number) {
  const back = -D / 2 + 0.04;
  part(g, box(0.06, 0.06, 0.16), BLACK, 0, 2.22, back + 0.08);
  const sign = group(g, 0, 2.22, back + 0.22);
  part(sign, rbox(0.62, 0.22, 0.08, 0.02), BLACK, 0, 0, 0);
  ownLit(sign, box(0.56, 0.16, 0.004), '#ff1744', 0, 0, 0.042);
  glowText(sign, 'ON AIR', 0.5, 0.14, 0, 0, 0.046, '#ffffff');
  part(g, box(0.5, 0.12, 0.02), '#eceff1', 0, 1.7, back + 0.01);
  label(g, '방송 중 출입 금지', 0.46, 0.09, 0, 1.7, back + 0.022, '#eceff1', '#c62828');
}

export const BUILDERS: Record<string, Builder> = {
  tsOnAirSign(g, W, D) {
    onAirSign(g, W, D);
  },
  talkShowSet(g, W, D, c, def, ctx, out) {
    SET_DETAIL.talkShowSet(g, W, D, c, def, ctx, out);
    talkSet(g, out, W, D);
  },
  newsDesk(g, W, _D, _c, _def, _ctx, out) {
    newsDesk(g, out, W);
  },
  cueCardTable(g, _W, _D, _c, _def, _ctx, out) {
    cueCardTable(g, out);
  },
  radioBooth(g, W, _D, _c, _def, _ctx, out) {
    radioBooth(g, out, W);
  },
  tsPedestalCam(g, _W, _D, _c, _def, _ctx, out) {
    pedestalCam(g, out);
  },
  tsCueBoard(g, _W, _D, _c, _def, _ctx, out) {
    cueBoard(g, out);
  },
  tsAudienceBench(g, W, _D, _c, _def, _ctx, out) {
    audienceBench(g, out, W);
  },
  tsApplauseSign(g, _W, _D, _c, _def, _ctx, out) {
    applauseSign(g, out);
  },
  tsBuzzerDesk(g, W, _D, _c, _def, _ctx, out) {
    buzzerDesk(g, out, W);
  },
  tsControlDesk(g, W, D, _c, _def, _ctx, out) {
    controlDesk(g, out, W, D);
  },
  tsScriptTable(g, W, _D, _c, _def, _ctx, out) {
    scriptTable(g, out, W);
  },
  tsGreenBrief(g, W, D, _c, _def, _ctx, out) {
    greenBrief(g, out, W, D);
  },
};
