import * as THREE from 'three';
import { marker, rod, shade, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, label, painted, picture, seeded, text } from './doctor';
import { AD, CM, MK, MR, MW, OB, PD, PS, RB, RC, SAT_HEAD, anNow, anPhase } from './announcerMotion';
import type { AnMotion, AnNow } from './announcerMotion';
import { vroidFigure, type FigureOptions } from './vroidFigure';

/**
 * The 방송국 아나운서실 drawn as itself (2026-11-01 workplace pipeline, at the user's request), at the made-up
 * 별빛방송. A curved anchor desk before a news set of its own, a studio camera whose tally goes red with its
 * prompter; a monitor wall and a board of cards for the night's run-down; script desks with their red pens; the
 * standard pronunciation dictionary on its rest; a practice mirror beside a mouth chart (not the home mirror);
 * radio booths with an ON AIR sign; a narration booth in foam; a makeup vanity with its bulbs and a rail of
 * jackets.
 *
 * Everything that moves follows the scripts in announcerMotion.ts. The desk tells the room when it's on air, so
 * the set, the monitor wall and the cameras light together. All the news is made up and harmless.
 */

const BRAND = '별빛방송';
const NEWS_NAME = '별빛뉴스';
const NAVY = '#0d2b5e';
const NAVY_D = '#081a3c';
const BLUE = '#1976d2';
const GOLD = '#ffca28';
const RED = '#e53935';
const RED_D = '#5a1414';
const PAPER = '#fbfaf6';
const WOOD = '#8d6e63';
const FOAM = '#3e4048';
const GLASS_C = '#cfe8f5';
const STORIES = ['별빛시 벚꽃 축제 오늘 개막', '새 시내버스 7번 노선 개통', '시립 도서관 밤 10시까지 개방', '내일 날씨 맑고 포근해요'];
const BREAKING = '별빛대교 짙은 안개, 서행 운전 당부';
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3();
type V = readonly [number, number, number];

// ---------------------------------------------------------------------------------------------
// The room's one on-air state: told by the desk every frame, read by the set, the wall and the cameras.

const AIR = { at: -1e9, breaking: false, story: 0 };
const onAir = (t: number) => Math.abs(t - AIR.at) < 0.6;

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
function standAt(g: THREE.Object3D, motion: AnMotion): Spot {
  const s = spot(g, 'stand', 0, 0, 0.6, Math.PI);
  s.motion = motion;
  return s;
}
function seatAt(g: THREE.Object3D, motion: AnMotion, p: V, yaw: number): Spot {
  const s = spot(g, 'sit', p[0], p[1], p[2], yaw, 0);
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
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, show: (now: string | null, N: AnNow | null, t: number, h: number) => void) {
  out.spots = spots;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const h = heightOf(sp);
    const N = sp ? anNow(sp.motion as AnMotion, t, anPhase(g.getWorldPosition(tmp)), h) : null;
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
function logoTex() {
  return painted('anLogo', 256, 64, (c) => {
    c.fillStyle = NAVY;
    c.fillRect(0, 0, 256, 64);
    c.fillStyle = GOLD;
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 ? 9 : 20;
      c.lineTo(34 + Math.cos(a) * r, 32 + Math.sin(a) * r);
    }
    c.fill();
    text(c, BRAND, 62, 33, 34, '#ffffff');
  });
}
function sheetMesh(g: THREE.Object3D, w = 0.2, d = 0.28, flat = true): THREE.Group {
  const s = group(g);
  const m = part(s, box(w, 0.004, d), PAPER, 0, 0, 0, { outline: false });
  for (let i = 0; i < 5; i++) part(m, box(w * 0.74, 0.001, 0.007), '#90a4ae', 0, 0.0026, -d * 0.36 + i * d * 0.17, { outline: false });
  if (!flat) s.rotation.x = 1.1;
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
function phoneSet(g: THREE.Object3D): THREE.Group {
  const b = group(g);
  part(b, rbox(0.05, 0.12, 0.02, 0.008), BLACK, 0, 0, 0);
  return b;
}
/** Headphones on a head, their band over the top, centred on the ears. */
function headset(g: THREE.Object3D): THREE.Group {
  const h = group(g);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.008, 6, 20, Math.PI), new THREE.MeshBasicMaterial({ color: BLACK }));
  band.userData.ownGeometry = band.userData.ownMaterial = true;
  band.scale.set(1, 1.16, 1);
  band.position.y = 0.01;
  h.add(band);
  for (const sx of [-1, 1]) part(h, cyl(0.042, 0.042, 0.03, 14), BLACK, sx * 0.1, -0.01, 0, { rz: Math.PI / 2 });
  h.visible = false;
  return h;
}
function micHead(g: THREE.Object3D): void {
  part(g, cyl(0.03, 0.028, 0.14, 12), '#37474f', 0, 0, 0, { rx: Math.PI / 2 });
  part(g, ball(0.034), '#1f2228', 0, 0, 0.08);
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
  chief: { top: '#37474f', bottom: '#263238', hair: '#8a8a8a', skin: '#eac09a' },
  anchor: { top: '#1565c0', bottom: '#263238', hair: '#2b1b10' },
  runner: { top: '#78909c', bottom: '#3e4a52', hair: '#1a1a1a' },
  rookie: { top: '#f8bbd0', bottom: '#455a64', hair: '#3a2415', skin: '#f8d9c0' },
  artist: { top: '#212121', bottom: '#212121', hair: '#5b3a1e', skin: '#f8d9c0' },
  crew: { top: '#455a64', bottom: '#2f3940', hair: '#2b1b10' },
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
/** Someone who's only made when first wanted (a body is about 20,000 triangles). */
function lazy(make: () => Fig) {
  let f: Fig | null = null;
  return { get: () => (f ??= make()), hide: () => f && (f.root.visible = false) };
}

// =============================================================================================
// 앵커 데스크 (anchorDesk, 2 × 1): the dweller sits behind it (-z), facing out; two together make the long desk.

function anchorDesk(g: THREE.Group, out: Built, W: number) {
  // The curved front in navy with a gold line and the name lit; a pale top.
  part(g, rbox(W - 0.02, AD.top - 0.05, 0.14, 0.04), NAVY, 0, (AD.top - 0.05) / 2, 0.36);
  part(g, rbox(W, 0.04, 0.68, 0.03), '#e9edf2', 0, AD.top - 0.02, 0.1);
  part(g, box(W - 0.02, 0.012, 0.145), GOLD, 0, 0.1, 0.365, { outline: false });
  part(g, box(W - 0.02, 0.09, 0.14), NAVY_D, 0, 0.045, 0.36, { outline: false });
  const name = ownLit(g, box(W * 0.5, 0.16, 0.004), '#123a7c', 0, 0.42, 0.436);
  picture(g, logoTex(), W * 0.46, W * 0.115, 0, 0.42, 0.441);
  // End panels, one each side, under the top.
  for (const sx of [-1, 1]) part(g, box(0.05, AD.top - 0.05, 0.4), NAVY, sx * (W / 2 - 0.03), (AD.top - 0.05) / 2, 0.11);
  // The chair behind: a high-backed swivel chair, the back to the set.
  part(g, cyl(0.03, 0.04, 0.34, 10), STEEL, AD.seat[0], 0.2, AD.seat[2], { outline: false });
  part(g, rbox(0.46, 0.07, 0.44, 0.03), '#263238', AD.seat[0], AD.seat[1] - 0.04, AD.seat[2]);
  part(g, rbox(0.42, 0.6, 0.07, 0.03), '#263238', AD.seat[0], AD.seat[1] + 0.32, AD.seat[2] - 0.24);
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    part(g, box(0.05, 0.022, 0.26), STEEL, AD.seat[0] + Math.sin(a) * 0.13, 0.04, AD.seat[2] + Math.cos(a) * 0.13, { ry: a, outline: false });
  }
  // On the desk: a small on-air monitor set in, the mic, a mug, the phone, a pen, a glass of water.
  const scr = group(g, -0.6, AD.top + 0.006, 0.1);
  part(scr, box(0.32, 0.012, 0.22), BLACK, 0, 0, 0);
  const screen = swapPic(scr, 0.28, 0.18, 0, 0.008, 0, 0, -Math.PI / 2);
  const paint = live(240, 150);
  const mic = group(g, 0.14, AD.top, 0.2);
  part(mic, cyl(0.04, 0.05, 0.02, 12), BLACK, 0, 0.01, 0);
  rod(mic, v3(0, 0.02, 0), v3(-0.02, 0.24, -0.12), 0.006, BLACK);
  const micTip = group(mic, -0.02, 0.25, -0.13);
  part(micTip, ball(0.022), '#37474f', 0, 0, 0);
  part(g, cyl(0.03, 0.034, 0.09, 10), PAPER, 0.75, AD.top + 0.045, 0.28);
  part(g, cyl(0.032, 0.03, 0.11, 10), '#b3e5fc', -0.2, AD.top + 0.055, 0.28, { outline: false });
  const pen = group(g);
  place(pen, AD.pen);
  penMesh(pen);
  const phone = phoneSet(g);
  place(phone, AD.phone);
  phone.rotation.x = -Math.PI / 2;
  // The script.
  const sheet = sheetMesh(g);
  place(sheet, AD.paper);
  const sheet2 = sheetMesh(g);
  sheet2.visible = false;
  const stack = sheetMesh(g, 0.2, 0.28);
  place(stack, [AD.paper[0] + 0.02, AD.paper[1] - 0.004, AD.paper[2] + 0.01]);
  const seen = ownLit(g, ball(0.012), RED_D, 0.14, AD.top + 0.26, 0.09);
  // Who brings a sheet in.
  const runner = lazy(() => person(g, LOOKS.runner, AD.runner[0], AD.runner[1], -Math.PI / 2 - 0.3));
  const spots: Record<string, Spot> = {
    readHeadlines: seatAt(g, 'anNews', AD.seat, 0),
    breakingNews: seatAt(g, 'anBreak', AD.seat, 0),
    announcer_checkFacts: seatAt(g, 'anFacts', AD.seat, 0),
  };
  spots['*'] = spots.readHeadlines;
  const paintScreen = (key: string, head: string, line: string, red: boolean) => {
    screen.set(
      paint(key, (c) => {
        c.fillStyle = red ? '#7a1010' : NAVY;
        c.fillRect(0, 0, 240, 150);
        c.fillStyle = red ? RED : BLUE;
        c.fillRect(0, 0, 240, 28);
        text(c, head, 120, 15, 15, '#ffffff', 'center');
        wrap(c, line, 120, 64, 208, 24, 19, '#ffffff');
      }),
    );
  };
  paintScreen('idle', NEWS_NAME, '방송 대기 중', false);
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    at(sheet, P.sheet, AD.paper);
    at(sheet2, P.sheet2);
    at(phone, P.phone ?? null, AD.phone);
    phone.rotation.x = P.phone && P.phone !== AD.phone && (n.talking ?? 0) > 0.5 ? 0 : -Math.PI / 2;
    place(pen, (now === 'announcer_checkFacts' || now === 'breakingNews') && N?.key.r && (N.key.gr ?? 0) > 0.8 ? N.key.r : AD.pen);
    const air = (n.air ?? 0) > 0.5;
    setLit(seen, air ? RED : RED_D);
    setLit(name, (n.red ?? 0) > 0.5 && Math.sin(t * 8) > 0 ? '#a52020' : air ? '#1a4d9e' : '#123a7c');
    if (now === 'announcer_checkFacts') {
      const fixed = (n.fixed ?? 0) > 0.5;
      const checked = (n.checked ?? 0) > 0.5;
      paintScreen(`f${fixed}${checked}${n.wrong}`, '사실 확인', checked ? '확인 완료' : fixed ? '관람객 3만 명' : (n.wrong ?? 0) > 0.5 ? '관람객 30만 명?' : '수치 대조 중', (n.wrong ?? 0) > 0.5);
    } else if (air) {
      const red = (n.red ?? 0) > 0.5;
      const st = Math.round(n.story ?? 0);
      paintScreen(`a${red}${st}`, red ? '속보' : 'ON AIR', red ? BREAKING : STORIES[Math.min(st, 3)], red);
    } else if (now && (n.cue ?? 0) > 0) paintScreen(`c${Math.round(n.cue ?? 0)}`, '곧 방송', String(Math.round(n.cue ?? 0)), false);
    else paintScreen('idle', NEWS_NAME, '방송 대기 중', false);
    if (air) {
      AIR.at = t;
      AIR.breaking = (n.red ?? 0) > 0.5;
      AIR.story = Math.round(n.story ?? 0);
    }
    if ((n.runner ?? 0) > 0.02) {
      const f = runner.get();
      comes(f, n.runner, AD.runner[0], AD.runner[1], 1.1, t);
      const has = P.sheet && (n.runner ?? 0) > 0.6;
      f.armR(has ? v3(P.sheet![0], P.sheet![1] - 0.02, P.sheet![2]) : null);
    } else runner.hide();
  });
  out.work = marker(g, AD.paper[0], AD.paper[1], AD.paper[2]);
}
function wrap(c: CanvasRenderingContext2D, s: string, x: number, y: number, w: number, lh: number, size: number, color: string) {
  c.font = `bold ${size}px sans-serif`;
  const lines: string[] = [];
  let cur = '';
  for (const ch of s) {
    if (c.measureText(cur + ch).width > w) {
      lines.push(cur);
      cur = ch;
    } else cur += ch;
  }
  lines.push(cur);
  lines.forEach((l, i) => text(c, l, x, y + (i - (lines.length - 1) / 2) * lh, size, color, 'center'));
}

// =============================================================================================
// 뉴스 세트 배경 (anNewsSet, 4 × 1): an LED wall of a night city behind the desk, a light rig over it.

function newsSet(g: THREE.Group, out: Built, W: number) {
  const H = 2.4;
  part(g, box(W, H, 0.1), NAVY_D, 0, H / 2, -0.42);
  const cityTex = painted('anCity', 512, 256, (c) => {
    const grad = c.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#0a1e46');
    grad.addColorStop(0.7, '#1a4a8c');
    grad.addColorStop(1, '#2d6fb3');
    c.fillStyle = grad;
    c.fillRect(0, 0, 512, 256);
    const r = seeded(31);
    for (let i = 0; i < 26; i++) {
      const w = 12 + r() * 26;
      const h = 40 + r() * 110;
      const x = i * 20 - 4;
      c.fillStyle = '#0d2748';
      c.fillRect(x, 256 - h, w, h);
      c.fillStyle = '#ffe9a0';
      for (let wy = 256 - h + 6; wy < 250; wy += 12) for (let wx = x + 3; wx < x + w - 4; wx += 8) if (r() > 0.55) c.fillRect(wx, wy, 3, 5);
    }
  });
  picture(g, cityTex, W - 0.2, H - 0.55, 0, 1.18, -0.365);
  const brand = swapPic(g, W - 0.2, 0.36, 0, 2.2, -0.36);
  const paint = live(512, 46);
  const banner = (key: string, red: boolean, s: string) =>
    brand.set(
      paint(key, (c) => {
        c.fillStyle = red ? '#b71c1c' : NAVY;
        c.fillRect(0, 0, 512, 46);
        c.fillStyle = red ? '#ffeb3b' : GOLD;
        c.fillRect(0, 42, 512, 4);
        text(c, s, 256, 22, 26, '#ffffff', 'center');
      }),
    );
  banner('idle', false, `${NEWS_NAME}  ${BRAND}`);
  // The rig above: a truss with its row of lamps, lit.
  part(g, box(W, 0.05, 0.05), BLACK, 0, 2.62, -0.2);
  part(g, box(W, 0.05, 0.05), BLACK, 0, 2.62, 0.05);
  for (const sx of [-1, 1]) part(g, cyl(0.016, 0.016, 2.6, 8), BLACK, sx * (W / 2 - 0.06), 1.31, -0.28, { outline: false });
  const lamps: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const x = -W / 2 + 0.5 + i * ((W - 1) / 3);
    part(g, cyl(0.07, 0.09, 0.16, 12), '#20242a', x, 2.52, -0.08, { rx: 0.5 });
    lamps.push(ownLit(g, cyl(0.07, 0.07, 0.006, 12), '#d7d0b0', x, 2.45, -0.03));
  }
  part(g, box(W, 0.05, 0.48), NAVY_D, 0, 0.025, -0.2, { outline: false });
  // The rule of the wall: its frame.
  out.away = (_o, t) => {
    const on = onAir(t);
    if (on && AIR.breaking) banner('red', true, `속보  ${BREAKING}`);
    else if (on) banner(`s${AIR.story}`, false, `${NEWS_NAME}  ${STORIES[Math.min(AIR.story, 3)]}`);
    else banner('idle', false, `${NEWS_NAME}  ${BRAND}`);
    lamps.forEach((l) => setLit(l, on ? '#fff8d8' : '#d7d0b0'));
  };
}

// =============================================================================================
// 원고 데스크 (prompterDesk, 1 × 1): a monitor with the script up, the printer's tray, the dictionary, a chair.

function prompterDesk(g: THREE.Group, out: Built) {
  part(g, rbox(0.96, 0.04, 0.72, 0.012), '#b08968', 0, PD.top - 0.02, -0.08);
  for (const [x, z] of [[-0.43, -0.38], [0.43, -0.38], [-0.43, 0.24], [0.43, 0.24]] as const) part(g, cyl(0.016, 0.016, PD.top - 0.04, 8), STEEL, x, (PD.top - 0.04) / 2, z, { outline: false });
  part(g, box(0.86, 0.34, 0.012), '#a07858', 0, 0.42, -0.42, { outline: false });
  part(g, box(0.26, 0.5, 0.56), '#90a4ae', -0.33, 0.27, -0.12);
  for (let i = 0; i < 3; i++) part(g, box(0.2, 0.014, 0.01), STEEL, -0.33, 0.12 + i * 0.16, 0.162, { outline: false });
  // The monitor with the script, the keyboard, a mouse.
  part(g, box(0.1, 0.012, 0.08), BLACK, 0.14, PD.top + 0.006, -0.25);
  part(g, cyl(0.012, 0.012, 0.13, 6), BLACK, 0.14, PD.top + 0.065, -0.25, { outline: false });
  const mon = group(g, 0.14, PD.top + 0.26, -0.25);
  part(mon, rbox(0.46, 0.3, 0.025, 0.012), BLACK, 0, 0, 0);
  const screen = swapPic(mon, 0.42, 0.26, 0, 0, 0.014);
  const paint = live(256, 160);
  const script = ['앵커 멘트', '오늘 별빛시 벚꽃 축제가', '막을 올렸습니다.', '관람객은 3만 명으로', '예상됩니다.'];
  const paintDoc = (lines: number, red: number) =>
    screen.set(
      paint(`${lines}/${red}`, (c) => {
        c.fillStyle = '#fbfaf6';
        c.fillRect(0, 0, 256, 160);
        c.fillStyle = NAVY;
        c.fillRect(0, 0, 256, 20);
        text(c, '방송 원고', 8, 11, 12, '#ffffff');
        script.slice(0, Math.max(1, lines)).forEach((s, i) => text(c, s, 10, 36 + i * 24, 15, i === red ? '#c62828' : '#26332d'));
        if (lines > 0 && lines < 5) {
          c.fillStyle = '#26332d';
          c.fillRect(14 + c.measureText(script[lines - 1]).width, 28 + (lines - 1) * 24, 2, 16);
        }
      }),
    );
  paintDoc(5, -1);
  part(g, rbox(0.3, 0.018, 0.12, 0.006), '#37474f', PD.keys[0], PD.keys[1] - 0.008, PD.keys[2]);
  part(g, rbox(0.05, 0.022, 0.08, 0.012), '#37474f', PD.keys[0] + 0.21, PD.keys[1] - 0.008, PD.keys[2]);
  // A small desk dictionary, a pen pot, a tray of printed scripts.
  part(g, box(0.16, 0.05, 0.22), '#1565c0', -0.34, PD.top + 0.025, -0.25);
  label(g, '발음 사전', 0.1, 0.03, -0.34, PD.top + 0.028, -0.138, '#1565c0', '#ffffff');
  part(g, cyl(0.035, 0.03, 0.09, 10), '#455a64', -0.12, PD.top + 0.045, -0.32);
  for (const [dx, col] of [[-0.01, '#c62828'], [0.012, '#1565c0'], [0, '#212121']] as const) part(g, cyl(0.004, 0.004, 0.13, 6), col, -0.12 + dx, PD.top + 0.1, -0.32 + dx, { rz: dx * 4, outline: false });
  part(g, box(0.22, 0.02, 0.3), '#cfd8dc', PD.out[0], PD.top + 0.012, PD.out[2]);
  part(g, box(0.19, 0.008, 0.26), PAPER, PD.out[0], PD.top + 0.025, PD.out[2], { outline: false });
  // A chair at the front, pulled in.
  part(g, cyl(0.022, 0.03, 0.34, 10), STEEL, PD.seat[0], 0.2, PD.seat[2], { outline: false });
  part(g, rbox(0.42, 0.06, 0.4, 0.03), NAVY, PD.seat[0], PD.seat[1] - 0.03, PD.seat[2]);
  part(g, rbox(0.38, 0.42, 0.05, 0.03), NAVY, PD.seat[0], PD.seat[1] + 0.26, PD.seat[2] + 0.2);
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5;
    part(g, box(0.045, 0.02, 0.24), STEEL, PD.seat[0] + Math.sin(a) * 0.12, 0.035, PD.seat[2] + Math.cos(a) * 0.12, { ry: a, outline: false });
  }
  // What's being worked on.
  const sheet = sheetMesh(g);
  place(sheet, PD.paper);
  const pen = group(g);
  penMesh(pen);
  const slip = sheetMesh(g, 0.18, 0.26);
  slip.visible = false;
  const senior = lazy(() => person(g, LOOKS.chief, PD.senior[0], PD.senior[1], 1.2));
  const spots: Record<string, Spot> = { editScript: seatAt(g, 'anEdit', PD.seat, Math.PI), announcer_readAloud: seatAt(g, 'anAloud', PD.seat, Math.PI) };
  spots['*'] = spots.editScript;
  const redDot = part(g, box(0.1, 0.002, 0.012), '#e53935', PD.paper[0], PD.paper[1] + 0.004, PD.paper[2] - 0.04, { outline: false });
  redDot.visible = false;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    at(sheet, P.sheet, PD.paper);
    at(slip, P.slip);
    pen.visible = (n.redPen ?? 0) > 0.5;
    if (pen.visible && N?.key.r) place(pen, N.key.r);
    redDot.visible = (n.redMark ?? 0) > 0.5 && now === 'editScript';
    if (now === 'editScript') paintDoc(Math.round(n.lines ?? 0), (n.redPen ?? 0) > 0.5 ? 3 : -1);
    else paintDoc(5, -1);
    if ((n.senior ?? 0) > 0.02) {
      const f = senior.get();
      comes(f, n.senior ?? 0, PD.senior[0], PD.senior[1], -0.7, t);
      f.armR((n.sPoint ?? 0) > 0.5 && P.sheet ? v3(P.sheet[0], P.sheet[1] + 0.02, P.sheet[2]) : null);
      f.opts.nod = (n.sNod ?? 0) > 0.5 ? 0.14 + 0.12 * Math.abs(Math.sin(t * 3)) : 0.14;
    } else senior.hide();
  });
  out.work = marker(g, PD.keys[0], PD.keys[1], PD.keys[2]);
}

// =============================================================================================
// 표준 발음 자료함 (pronunciationShelf, 1 × 1): volumes on shelves, the big dictionary on a slanted rest.

function pronunciationShelf(g: THREE.Group, out: Built) {
  const H = 1.9;
  part(g, box(0.94, H, 0.03), '#5d4037', 0, H / 2, -0.33);
  for (const sx of [-1, 1]) part(g, box(0.03, H, 0.3), '#6d4c41', sx * 0.455, H / 2, -0.19);
  part(g, box(0.94, 0.04, 0.3), '#6d4c41', 0, H, -0.19);
  part(g, box(0.94, 0.86, 0.46), '#6d4c41', 0, 0.43, -0.11);
  const r = seeded(47);
  const SPINES = ['#1565c0', '#c62828', '#2e7d32', '#ef6c00', '#6a1b9a', '#37474f', '#fbc02d'];
  for (const y of [1.16, 1.5]) {
    part(g, box(0.88, 0.02, 0.28), '#795548', 0, y, -0.19, { outline: false });
    let x = -0.42;
    while (x < 0.38) {
      const w = 0.05 + r() * 0.04;
      const h = 0.22 + r() * 0.08;
      part(g, box(w, h, 0.2), SPINES[Math.floor(r() * SPINES.length)], x + w / 2, y + 0.01 + h / 2, -0.2);
      x += w + 0.004;
    }
  }
  // The top shelf's series, labelled.
  part(g, box(0.88, 0.02, 0.28), '#795548', 0, 1.84, -0.19, { outline: false });
  label(g, '표준 발음 자료', 0.74, 0.1, 0, 1.76, -0.03, '#3e2723', '#ffe0b2');
  // A shelf gap for the dictionary and the slanted rest out front.
  const rest = group(g, PS.rest[0], 0.86, PS.rest[2]);
  part(rest, box(0.5, 0.03, 0.34), '#4e342e', 0, 0.06, -0.08, { rx: 0.42 });
  part(rest, box(0.5, 0.03, 0.03), '#3e2723', 0, 0.02, 0.09);
  label(g, '간장 공장 공장장', 0.42, 0.06, 0, 0.68, 0.126, '#fff8e1', '#3e2723');
  // The drawer of index cards below.
  for (const x of [-0.24, 0.24]) {
    part(g, box(0.4, 0.5, 0.01), '#7b5a4d', x, 0.3, 0.127, { outline: false });
    part(g, box(0.1, 0.015, 0.02), CHROME, x, 0.42, 0.135, { outline: false });
  }
  // The book.
  const book = group(g);
  const closed = part(book, box(0.26, 0.09, 0.32), '#1565c0', 0, 0, 0, { rx: 0.42 });
  void closed;
  const open = group(g, PS.rest[0], PS.rest[1] + 0.02, PS.rest[2] - 0.02);
  open.rotation.x = 0.42;
  const openPaint = live(256, 160);
  const page = swapPic(open, 0.46, 0.32, 0, 0.002, 0, 0, -Math.PI / 2);
  page.set(
    openPaint('0', (c) => {
      c.fillStyle = PAPER;
      c.fillRect(0, 0, 256, 160);
      c.fillStyle = '#90a4ae';
      c.fillRect(127, 0, 2, 160);
      text(c, '표준 발음 사전', 64, 16, 15, NAVY, 'center');
      text(c, '[발음 → 바름]', 64, 44, 15, '#26332d', 'center');
      text(c, '[국물 → 궁물]', 64, 72, 15, '#26332d', 'center');
      text(c, '[맑다 → 막따]', 64, 100, 15, '#26332d', 'center');
      text(c, '[밟다 → 밥따]', 192, 44, 15, '#26332d', 'center');
      text(c, '[넓다 → 널따]', 192, 72, 15, '#26332d', 'center');
      text(c, '[값어치]', 192, 100, 15, '#26332d', 'center');
    }),
  );
  part(open, box(0.47, 0.012, 0.33), '#1565c0', 0, -0.012, 0);
  const spots: Record<string, Spot> = { drillPronunciation: standAt(g, 'anDict') };
  spots['*'] = spots.drillPronunciation;
  const glowWord = ownLit(g, box(0.2, 0.004, 0.02), '#fdd835', PS.rest[0] + 0.08, PS.rest[1] + 0.04, PS.rest[2] + 0.02);
  glowWord.rotation.x = 0.42;
  drive(g, out, spots, (now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const isOpen = (n.open ?? 0) > 0.4;
    at(book, P.book, PS.shelfBook);
    book.visible = !isOpen;
    open.visible = isOpen;
    glowWord.visible = (n.word ?? 0) > 0.5;
    void now;
  });
  out.work = marker(g, PS.rest[0], PS.rest[1], PS.rest[2]);
}

// =============================================================================================
// 라디오 온에어 부스 (onAirBooth, 2 × 1): foam walls, a console inside, a front of glass, the lit sign on top.

function foamWall(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, ry: number) {
  const tex = painted('anFoam', 64, 64, (c) => {
    c.fillStyle = FOAM;
    c.fillRect(0, 0, 64, 64);
    for (let yy = 0; yy < 4; yy++)
      for (let xx = 0; xx < 4; xx++) {
        c.fillStyle = (xx + yy) % 2 ? '#4a4d56' : '#32343b';
        c.beginPath();
        c.moveTo(xx * 16, yy * 16 + 16);
        c.lineTo(xx * 16 + 8, yy * 16);
        c.lineTo(xx * 16 + 16, yy * 16 + 16);
        c.fill();
      }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  picture(g, tex, w, h, x, y, z, '#ffffff', ry);
}
function boothShell(g: THREE.Group, W: number, signText: string): THREE.Mesh {
  const H = 2.14;
  // Back and sides.
  part(g, box(W, H, 0.05), '#2b2d33', 0, H / 2, -0.47);
  for (const sx of [-1, 1]) part(g, box(0.05, H, 0.96), '#2b2d33', sx * (W / 2 - 0.025), H / 2, 0);
  foamWall(g, W - 0.1, H - 0.1, 0, H / 2, -0.44, 0);
  foamWall(g, 0.9, H - 0.1, -W / 2 + 0.055, H / 2, 0, Math.PI / 2);
  foamWall(g, 0.9, H - 0.1, W / 2 - 0.055, H / 2, 0, -Math.PI / 2);
  // The roof, a low step at the front, the frame of the window.
  part(g, box(W, 0.06, 1.0), '#23252a', 0, H + 0.03, 0);
  part(g, box(W, 0.05, 1.0), '#383a40', 0, 0.025, 0, { outline: false });
  part(g, box(W, 0.08, 0.05), '#23252a', 0, H - 0.04, 0.475);
  part(g, box(W, 0.1, 0.05), '#23252a', 0, 0.05, 0.475);
  for (const x of [-W / 2 + 0.03, W / 2 - 0.03]) part(g, box(0.04, H - 0.1, 0.04), '#23252a', x, H / 2, 0.475, { outline: false });
  pane(g, W - 0.1, H - 0.18, 0, H / 2, 0.47, 0.13);
  // A warm lamp in the ceiling, lit.
  ownLit(g, cyl(0.09, 0.09, 0.012, 12), '#ffe9b3', 0, H - 0.01, -0.1);
  // The sign.
  const sign = group(g, 0, H + 0.2, 0.3);
  part(sign, rbox(0.86, 0.26, 0.08, 0.02), BLACK, 0, 0, 0);
  const lit = ownLit(sign, box(0.8, 0.2, 0.004), RED_D, 0, 0, 0.042);
  picture(sign, painted(`anSign|${signText}`, 256, 64, (c) => {
    c.clearRect(0, 0, 256, 64);
    text(c, signText, 128, 33, 36, '#ffffff', 'center');
  }), 0.76, 0.19, 0, 0, 0.046).material = new THREE.MeshBasicMaterial({ map: painted(`anSign|${signText}`, 256, 64, () => {}), transparent: true });
  return lit;
}

function onAirBooth(g: THREE.Group, out: Built, W: number) {
  const lit = boothShell(g, W, 'ON AIR');
  // The console: a desk over the dweller's knees, a bank of faders, meters, a screen of messages and a mic on its arm.
  part(g, rbox(W - 0.16, 0.05, 0.56, 0.015), '#3e2f26', 0, OB.top - 0.025, 0.14);
  part(g, box(W - 0.16, OB.top - 0.05, 0.05), '#2c211b', 0, (OB.top - 0.05) / 2, 0.4);
  part(g, rbox(0.48, 0.04, 0.3, 0.008), '#20242a', OB.fader[0], OB.top + 0.02, OB.fader[2]);
  const faderKnob = part(g, rbox(0.03, 0.022, 0.036, 0.004), '#eceff1', OB.fader[0], OB.top + 0.052, OB.fader[2]);
  const r = seeded(11);
  for (let i = 0; i < 7; i++) {
    const x = OB.fader[0] - 0.2 + i * 0.066;
    if (i !== 3) part(g, rbox(0.02, 0.018, 0.03, 0.004), ['#e53935', '#90a4ae', '#fdd835', '#90a4ae'][i % 4], x, OB.top + 0.05, OB.fader[2] - 0.05 + r() * 0.1, { outline: false });
    part(g, box(0.006, 0.002, 0.19), '#0f1114', x, OB.top + 0.041, OB.fader[2], { outline: false });
    part(g, cyl(0.01, 0.01, 0.012, 8), '#b0bec5', x, OB.top + 0.046, OB.fader[2] - 0.12, { outline: false });
  }
  const scr = group(g, 0.34, OB.top + 0.17, 0.3);
  part(scr, rbox(0.5, 0.3, 0.025, 0.01), BLACK, 0, 0, 0);
  const screen = swapPic(scr, 0.46, 0.26, 0, 0, -0.014, Math.PI);
  const paint = live(256, 144);
  const paintScr = (key: string, f: (c: CanvasRenderingContext2D) => void) => screen.set(paint(key, f));
  const MSG = ['#3827: 오늘 첫 출근 했어요', '#1204: 신청곡 부탁드려요', '#7711: 할머니 생신 축하해 주세요'];
  const msgs = (count: number, red: boolean) =>
    paintScr(`${count}${red}`, (c) => {
      c.fillStyle = '#10151f';
      c.fillRect(0, 0, 256, 144);
      c.fillStyle = red ? '#b71c1c' : '#1b3a5e';
      c.fillRect(0, 0, 256, 22);
      text(c, red ? '별빛 라디오 ON AIR' : '청취자 사연함', 8, 12, 13, '#ffffff');
      MSG.slice(0, count).forEach((s, i) => text(c, s, 8, 40 + i * 22, 12, '#e0e0e0'));
    });
  msgs(3, false);
  // Mic on its boom, a mug, a pile of postcards, a pad.
  const micArm = group(g, 0.56, OB.top, -0.1);
  part(micArm, cyl(0.03, 0.03, 0.04, 10), BLACK, 0, 0.02, 0);
  const micAt = group(g);
  micHead(micAt);
  const arm1 = part(g, cyl(0.008, 0.008, 1, 6), BLACK, 0, 0, 0, { outline: false });
  const placeMic = (h: number) => {
    const y = OB.seat[1] + SAT_HEAD * h - 0.22 * (h / 1.6);
    micAt.position.set(OB.seat[0] + 0.08, y, OB.seat[2] + 0.2);
    micAt.rotation.y = Math.PI + 0.3;
    const a = v3(0.56, OB.top + 0.04, -0.1);
    const b = micAt.position.clone();
    b.z += 0.06;
    arm1.position.copy(a).add(b).multiplyScalar(0.5);
    arm1.scale.set(1, a.distanceTo(b), 1);
    arm1.quaternion.setFromUnitVectors(UP, b.sub(a).normalize());
  };
  placeMic(1.6);
  part(g, cyl(0.038, 0.034, 0.09, 10), '#fafafa', -0.7, OB.top + 0.045, 0.22);
  const pile = group(g);
  place(pile, OB.pile);
  for (let i = 0; i < 6; i++) part(pile, box(0.12, 0.004, 0.09), ['#fff59d', '#b3e5fc', '#f8bbd0', PAPER][i % 4], (i % 3) * 0.006, i * 0.005, (i % 2) * 0.006, { ry: 0.1 * (i - 2), outline: false });
  part(g, box(0.18, 0.01, 0.13), '#fff9c4', OB.pad[0], OB.pad[1] - 0.004, OB.pad[2]);
  // The chair and the headphones.
  part(g, cyl(0.03, 0.04, 0.34, 10), STEEL, OB.seat[0], 0.22, OB.seat[2], { outline: false });
  part(g, rbox(0.42, 0.06, 0.4, 0.03), '#20242a', OB.seat[0], OB.seat[1] - 0.03, OB.seat[2]);
  part(g, rbox(0.38, 0.46, 0.05, 0.03), '#20242a', OB.seat[0], OB.seat[1] + 0.28, OB.seat[2] - 0.2);
  const phones = headset(g);
  const hung = group(g, -0.72, OB.top + 0.05, 0.05);
  part(hung, box(0.16, 0.05, 0.1), BLACK, 0, 0, 0);
  // The letter being read.
  const letter = group(g);
  part(letter, box(0.16, 0.003, 0.11), '#fff59d', 0, 0, 0, { outline: false });
  const meter = [0, 1, 2, 3].map((i) => ownLit(g, box(0.03, 0.05, 0.004), '#123f24', -0.72 + i * 0.05, OB.top + 0.11, 0.42));
  const spots: Record<string, Spot> = { hostRadioShow: seatAt(g, 'anRadio', OB.seat, 0), announcer_readLetters: seatAt(g, 'anLetters', OB.seat, 0) };
  spots['*'] = spots.hostRadioShow;
  drive(g, out, spots, (now, N, t, h) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const air = (n.air ?? 0) > 0.9;
    setLit(lit, air ? '#e53935' : (n.air ?? 0) > 0.2 ? '#7a1f1f' : RED_D);
    faderKnob.position.z = OB.fader[2] - 0.08 + 0.1 * (n.fader ?? 0);
    placeMic(h);
    phones.visible = !!now;
    hung.visible = !now;
    if (now) {
      const k = h / 1.6;
      phones.position.set(OB.seat[0], OB.seat[1] + SAT_HEAD * h - 0.135 * k, OB.seat[2] + 0.01);
      phones.scale.setScalar(k);
    }
    at(letter, P.letter ?? null);
    if (now === 'announcer_readLetters') msgs(Math.max(1, Math.min(3, Math.round(n.inbox ?? 0))), false);
    else if (now) msgs(0, air);
    else msgs(3, false);
    const sound = (n.talking ?? 0) > 0.5 ? 0.7 + 0.3 * Math.abs(Math.sin(t * 6)) : (n.song ?? 0) > 0.5 ? 0.5 + 0.4 * Math.abs(Math.sin(t * 3.1)) : 0;
    meter.forEach((m, i) => setLit(m, sound > i / 4 + 0.05 ? (i === 3 ? '#ff5252' : '#69f0ae') : '#123f24'));
  });
  out.work = marker(g, OB.letter[0], OB.letter[1], OB.letter[2]);
}

// =============================================================================================
// 내레이션 녹음 부스 (anRecordBooth, 2 × 1): stood at a mic in foam, a music stand with the script.

function recordBooth(g: THREE.Group, out: Built, W: number) {
  const lit = boothShell(g, W, 'REC');
  // The rug, the stand, the script on it.
  part(g, box(W - 0.3, 0.012, 0.7), '#5d4037', 0, 0.055, 0.02, { outline: false });
  part(g, cyl(0.1, 0.12, 0.02, 12), BLACK, RC.stand[0], 0.07, RC.stand[2]);
  part(g, cyl(0.009, 0.009, 1.0, 8), BLACK, RC.stand[0], 0.56, RC.stand[2], { outline: false });
  const desk = group(g, RC.stand[0], RC.stand[1], RC.stand[2]);
  desk.rotation.set(-1.05, Math.PI, 0, 'YXZ');
  part(desk, box(0.42, 0.3, 0.012), BLACK, 0, 0, 0);
  part(desk, box(0.4, 0.02, 0.05), BLACK, 0, -0.15, 0.03, { outline: false });
  const page = swapPic(desk, 0.36, 0.25, 0, 0.005, 0.008);
  const paint = live(216, 150);
  const paintPage = (marked: boolean, take: number) =>
    page.set(
      paint(`${marked}${take}`, (c) => {
        c.fillStyle = PAPER;
        c.fillRect(0, 0, 216, 150);
        text(c, `자연 다큐 내레이션 #${take}`, 108, 14, 13, NAVY, 'center');
        ['바다 깊은 곳,', '작은 물고기 떼가', '달빛을 따라', '천천히 움직입니다.'].forEach((s, i) => text(c, s, 12, 42 + i * 24, 15, marked && i === 2 ? '#c62828' : '#26332d'));
        if (marked) {
          c.fillStyle = '#c62828';
          c.fillRect(12, 100, 100, 2);
        }
      }),
    );
  paintPage(false, 1);
  // The mic in its shock mount and pop filter, hung from a boom off the ceiling; its height follows who's reading.
  const rig = group(g);
  const mic = group(rig, 0, 0, 0);
  part(mic, cyl(0.032, 0.032, 0.15, 12), CHROME, 0, 0, 0);
  part(mic, ball(0.034), '#8a9199', 0, 0.08, 0);
  const pop = part(rig, cyl(0.06, 0.06, 0.006, 16), '#1f2228', 0, 0, -0.08, { rx: Math.PI / 2, outline: false });
  void pop;
  const boom = part(rig, cyl(0.007, 0.007, 1, 6), BLACK, 0, 0.6, -0.01, { outline: false });
  // On the wall behind: a small talkback box and a light; a stool in the corner, a bottle of water.
  part(g, box(0.34, 0.2, 0.05), BLACK, RC.talkback[0], RC.talkback[1], RC.talkback[2] - 0.75);
  const recLed = ownLit(g, box(0.1, 0.05, 0.004), RED_D, RC.talkback[0] - 0.05, RC.talkback[1] + 0.03, RC.talkback[2] - 0.72);
  const levels = [0, 1, 2, 3, 4].map((i) => ownLit(g, box(0.022, 0.1, 0.004), '#123f24', RC.talkback[0] + 0.02 + i * 0.03, RC.talkback[1] - 0.02, RC.talkback[2] - 0.72));
  part(g, cyl(0.15, 0.16, 0.02, 12), '#5d4037', -0.7, 0.5, -0.2);
  for (let i = 0; i < 3; i++) part(g, cyl(0.012, 0.012, 0.44, 6), STEEL, -0.7 + 0.1 * Math.cos(i * 2.1), 0.28, -0.2 + 0.1 * Math.sin(i * 2.1), { outline: false });
  part(g, cyl(0.03, 0.03, 0.15, 10), '#b3e5fc', -0.7, 0.58, -0.2, { outline: false });
  const phones = headset(g);
  const hook = group(g, 0.82, 1.3, -0.3);
  part(hook, box(0.1, 0.12, 0.06), BLACK, 0, 0, 0);
  const spots: Record<string, Spot> = { anNarrate: standAt(g, 'anNarr') };
  spots['*'] = spots.anNarrate;
  drive(g, out, spots, (now, N, t, h) => {
    const n = N?.n ?? {};
    const k = h / 1.6;
    const rec = (n.rec ?? 0) > 0.5;
    setLit(lit, rec ? '#e53935' : now ? '#7a1f1f' : RED_D);
    setLit(recLed, rec ? '#ff5252' : (n.ok ?? 0) > 0.5 ? '#69f0ae' : RED_D);
    rig.position.set(RC.at[0] + 0.03, 0.875 * h - 0.02 * k, RC.at[1] + 0.2);
    boom.scale.y = Math.max(0.1, 2.08 - (0.875 * h - 0.02 * k));
    boom.position.y = boom.scale.y / 2 + 0.05;
    phones.visible = !!now;
    hook.visible = !now;
    if (now) {
      phones.position.set(RC.at[0], h - 0.135 * k, RC.at[1] + 0.01);
      phones.scale.setScalar(k);
    }
    levels.forEach((m, i) => setLit(m, (n.level ?? 0) > (i + 0.5) / 5 ? (i === 4 ? '#ff5252' : '#69f0ae') : '#123f24'));
    paintPage((n.marked ?? 0) > 0.5, Math.round(n.take ?? 1));
    void t;
  });
  out.work = marker(g, RC.stand[0], RC.stand[1], RC.stand[2]);
}

// =============================================================================================
// 스튜디오 카메라 (anCamera, 1 × 1): pedestal, body, the prompter hood towards the desk (-z), tally on top.
// Kept below head height (1.42 m) so it doesn't hide the anchor it points at.

function studioCamera(g: THREE.Group, out: Built) {
  // The dolly: three legs on wheels, a column.
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3 + 0.5;
    rod(g, v3(0, 0.22, 0), v3(Math.sin(a) * 0.36, 0.08, Math.cos(a) * 0.36), 0.022, '#37474f');
    part(g, cyl(0.05, 0.05, 0.05, 10), BLACK, Math.sin(a) * 0.36, 0.05, Math.cos(a) * 0.36, { rz: Math.PI / 2 });
  }
  part(g, cyl(0.06, 0.07, 0.62, 12), '#455a64', 0, 0.5, 0);
  part(g, cyl(0.09, 0.09, 0.05, 12), BLACK, 0, 0.84, 0);
  const head = group(g, 0, 0.9, 0);
  // Body and lens.
  part(head, rbox(0.24, 0.24, 0.44, 0.02), '#263238', 0, 0.18, -0.02);
  part(head, cyl(0.075, 0.09, 0.2, 14), BLACK, 0, 0.17, -0.3, { rx: Math.PI / 2 });
  label(head, BRAND, 0.2, 0.05, 0.125, 0.2, -0.02, '#263238', '#ffffff', Math.PI / 2);
  label(head, BRAND, 0.2, 0.05, -0.125, 0.2, -0.02, '#263238', '#ffffff', -Math.PI / 2);
  // The prompter: a hood over the lens with a slanted mirror, its screen up from below, towards the desk.
  part(head, box(0.4, 0.32, 0.03), BLACK, 0, 0.18, -0.44);
  pane(head, 0.34, 0.26, 0, 0.18, -0.46, 0.5, Math.PI, '#101820');
  const prompt = swapPic(head, 0.32, 0.24, 0, 0.18, -0.462, Math.PI);
  const paintP = live(256, 192);
  // The viewfinder on top, tilted to the operator; the tally on top.
  part(head, rbox(0.26, 0.18, 0.06, 0.01), BLACK, 0, 0.42, 0.21, { rx: -0.2 });
  const finder = swapPic(head, 0.22, 0.14, 0, 0.42, 0.244, 0, -0.2);
  const paintF = live(240, 150);
  const tallyTop = ownLit(head, box(0.08, 0.03, 0.05), RED_D, 0, 0.3, 0.14);
  const tallyFront = ownLit(head, ball(0.022), RED_D, 0.18, 0.34, -0.44);
  // Pan handles and the keyboard shelf, its cable looped.
  for (const sx of [-1, 1]) {
    const hx = sx * 0.28;
    rod(head, v3(sx * 0.1, 0.14, 0.12), v3(hx, CM.grip - 0.9, 0.24), 0.012, STEEL);
    part(head, cyl(0.018, 0.018, 0.1, 8), BLACK, hx, CM.grip - 0.9, 0.24, { rx: Math.PI / 2 });
  }
  part(g, rbox(0.34, 0.018, 0.18, 0.006), '#37474f', CM.keys[0], CM.keys[1] - 0.012, CM.keys[2]);
  part(g, box(0.02, 0.2, 0.02), STEEL, CM.keys[0], CM.keys[1] - 0.12, 0.2, { outline: false });
  part(g, box(0.02, 0.02, 0.22), STEEL, CM.keys[0], 0.78, 0.13, { outline: false });
  const script = ['별빛시 벚꽃 축제가', '오늘 막을 올렸습니다.', '관람객은', '3만 명으로', '예상됩니다.', '교통 통제에', '유의하세요.'];
  const paintScreens = (key: string, scroll: number, wrong: boolean, on: boolean) => {
    prompt.set(
      paintP(`${key}${Math.round(scroll * 8)}`, (c) => {
        c.fillStyle = '#080a10';
        c.fillRect(0, 0, 256, 192);
        script.forEach((s, i) => text(c, wrong && i === 3 ? '30만 명으로' : s, 128, 40 + i * 42 - scroll * 120, 26, wrong && i === 3 ? '#ff6e6e' : '#f5f5f5', 'center'));
      }),
    );
    finder.set(
      paintF(key, (c) => {
        c.fillStyle = '#1a4a8c';
        c.fillRect(0, 0, 240, 150);
        c.fillStyle = '#0d2748';
        for (let i = 0; i < 10; i++) c.fillRect(i * 26, 70 - (i % 3) * 16, 18, 90);
        c.fillStyle = NAVY;
        c.fillRect(48, 92, 144, 46);
        c.fillStyle = '#f1c9a5';
        c.beginPath();
        c.arc(120, 62, 18, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#263238';
        c.fillRect(100, 80, 40, 22);
        c.strokeStyle = '#ffffff55';
        c.strokeRect(10, 8, 220, 134);
        if (on) {
          c.fillStyle = RED;
          c.fillRect(190, 10, 36, 16);
          text(c, 'ON', 208, 18, 12, '#ffffff', 'center');
        }
      }),
    );
  };
  paintScreens('idle', 0, false, false);
  // The operator: at it while the news is on and nobody else is using it.
  const op = lazy(() => person(g, LOOKS.crew, 0, 0.64, Math.PI));
  const spots: Record<string, Spot> = { anCheckPrompter: standAt(g, 'anPrompt') };
  spots['*'] = spots.anCheckPrompter;
  const handle = new THREE.Vector3();
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    const air = onAir(t);
    head.rotation.x = n.tilt ?? 0;
    setLit(tallyTop, air ? '#ff3030' : RED_D);
    setLit(tallyFront, air ? '#ff3030' : RED_D);
    if (now) paintScreens(`w${n.wrong}${n.fixed}`, n.scroll ?? 0, (n.wrong ?? 0) > 0.5, air);
    else paintScreens(air ? `a${AIR.story}` : 'idle', air ? 0.3 + ((t * 0.04) % 0.7) : 0, false, air);
    if (air && !now) {
      const f = op.get();
      f.root.visible = true;
      f.armR(handle.set(CM.handle[0], CM.handle[1], CM.handle[2]));
      f.armL(handle.clone().setX(-CM.handle[0]));
      f.opts.lean = 0.14;
      f.opts.nod = 0.08;
    } else op.hide();
  });
  out.work = marker(g, CM.keys[0], CM.keys[1], CM.keys[2]);
}

// =============================================================================================
// 모니터 월 (anMonitorWall, 3 × 1): a rack of screens round the programme feed, a ledge with a talkback.

function monitorWall(g: THREE.Group, out: Built, W: number) {
  const H = 2.34;
  part(g, box(W, H, 0.22), '#1c2026', 0, H / 2, -0.36);
  part(g, box(W, 0.78, 0.5), '#2a2f36', 0, 0.39, -0.22);
  part(g, rbox(W + 0.04, 0.05, 0.54, 0.012), '#3a4048', 0, MW.ledge - 0.09, -0.22);
  // The feeds: invented clips, each drawn once.
  const clip = (key: string, paint: (c: CanvasRenderingContext2D) => void) => painted(`anClip${key}`, 160, 90, paint);
  const CLIPS = [
    clip('fest', (c) => {
      c.fillStyle = '#ffd6e4';
      c.fillRect(0, 0, 160, 90);
      c.fillStyle = '#6d4c41';
      c.fillRect(30, 40, 6, 50);
      c.fillRect(110, 36, 6, 54);
      c.fillStyle = '#f48fb1';
      for (const [x, y] of [[33, 32], [113, 28]]) {
        c.beginPath();
        c.arc(x, y, 24, 0, Math.PI * 2);
        c.fill();
      }
      text(c, '벚꽃 축제', 80, 80, 15, NAVY, 'center');
    }),
    clip('bus', (c) => {
      c.fillStyle = '#b3e5fc';
      c.fillRect(0, 0, 160, 90);
      c.fillStyle = '#546e7a';
      c.fillRect(0, 64, 160, 26);
      c.fillStyle = '#43a047';
      c.fillRect(32, 30, 96, 40);
      c.fillStyle = '#e0f7fa';
      for (let i = 0; i < 4; i++) c.fillRect(38 + i * 22, 36, 18, 14);
      text(c, '7번 노선', 80, 82, 13, '#ffffff', 'center');
    }),
    clip('lib', (c) => {
      c.fillStyle = '#3e2723';
      c.fillRect(0, 0, 160, 90);
      const r = seeded(5);
      for (let y = 8; y < 76; y += 22) for (let x = 6; x < 150; x += 9) {
        c.fillStyle = ['#c62828', '#1565c0', '#2e7d32', '#ef6c00'][Math.floor(r() * 4)];
        c.fillRect(x, y, 7, 18);
      }
      text(c, '야간 개방', 80, 80, 13, '#ffffff', 'center');
    }),
    clip('sky', (c) => {
      c.fillStyle = '#4fc3f7';
      c.fillRect(0, 0, 160, 90);
      c.fillStyle = '#ffd54f';
      c.beginPath();
      c.arc(40, 30, 16, 0, Math.PI * 2);
      c.fill();
      text(c, '내일 18도', 100, 50, 18, '#ffffff', 'center');
    }),
    clip('bars', (c) => {
      ['#ffffff', '#ffeb3b', '#26c6da', '#66bb6a', '#ec407a', '#e53935', '#3f51b5'].forEach((col, i) => {
        c.fillStyle = col;
        c.fillRect((i * 160) / 7, 0, 160 / 7 + 1, 90);
      });
    }),
    clip('radio', (c) => {
      c.fillStyle = '#1b2433';
      c.fillRect(0, 0, 160, 90);
      c.fillStyle = '#69f0ae';
      for (let i = 0; i < 20; i++) c.fillRect(8 + i * 7, 45 - 10 - (i * 37) % 24, 4, 20 + (i * 37) % 24);
      text(c, '별빛 라디오', 80, 78, 13, '#ffffff', 'center');
    }),
    clip('mic', (c) => {
      c.fillStyle = '#263238';
      c.fillRect(0, 0, 160, 90);
      text(c, '스튜디오 2', 80, 22, 13, '#b0bec5', 'center');
      c.fillStyle = '#90a4ae';
      c.fillRect(60, 40, 40, 34);
      text(c, '대기', 80, 56, 14, '#263238', 'center');
    }),
  ];
  const side = [[-1.14, 1.92], [-1.14, 1.56], [-1.14, 1.2], [1.14, 1.92], [1.14, 1.56], [1.14, 1.2]] as const;
  side.forEach(([x, y], i) => {
    part(g, box(0.64, 0.33, 0.02), BLACK, x, y, -0.25);
    picture(g, CLIPS[i], 0.6, 0.3, x, y, -0.235);
  });
  part(g, box(0.48, 0.28, 0.02), BLACK, -0.55, 1.0, -0.25);
  picture(g, CLIPS[6], 0.44, 0.24, -0.55, 1.0, -0.235);
  part(g, box(0.48, 0.28, 0.02), BLACK, 0.55, 1.0, -0.25);
  picture(g, CLIPS[4], 0.44, 0.24, 0.55, 1.0, -0.235);
  // The programme feed in the middle, big, with its tally above.
  part(g, box(1.56, 0.86, 0.03), BLACK, 0, MW.pgm[1], -0.25);
  const pgm = swapPic(g, 1.5, 0.8, 0, MW.pgm[1], -0.232);
  const paintPgm = live(384, 216);
  const tally = ownLit(g, box(0.5, 0.08, 0.01), RED_D, 0.3, 2.12, -0.24);
  label(g, '주조정 PGM', 0.5, 0.08, -0.3, 2.12, -0.232, '#1c2026', '#ffffff');
  const feed = (key: string, breaking: boolean, story: number, on: boolean) =>
    pgm.set(
      paintPgm(key, (c) => {
        const g2 = c.createLinearGradient(0, 0, 0, 216);
        g2.addColorStop(0, '#0a1e46');
        g2.addColorStop(1, '#2d6fb3');
        c.fillStyle = g2;
        c.fillRect(0, 0, 384, 216);
        if (on) {
          c.fillStyle = NAVY;
          c.fillRect(110, 110, 164, 66);
          c.fillStyle = '#f1c9a5';
          c.beginPath();
          c.arc(192, 80, 26, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = '#263238';
          c.fillRect(160, 104, 64, 38);
          c.fillStyle = breaking ? '#b71c1c' : NAVY_D;
          c.fillRect(0, 172, 384, 44);
          text(c, breaking ? `속보 ${BREAKING}` : STORIES[Math.min(story, 3)], 192, 194, 19, '#ffffff', 'center');
        } else {
          text(c, NEWS_NAME, 192, 90, 40, '#ffffff', 'center');
          text(c, '다음 방송까지 대기', 192, 138, 20, GOLD, 'center');
        }
      }),
    );
  feed('idle', false, 0, false);
  // The ledge: a talkback box with its key, an audio meter, a clipboard, a headset on a hook.
  part(g, rbox(0.3, 0.07, 0.2, 0.01), '#20242a', MW.talkback[0], MW.ledge - 0.03, MW.talkback[2]);
  const talk = ownLit(g, box(0.1, 0.012, 0.06), '#3a4a3a', MW.talkback[0], MW.ledge + 0.01, MW.talkback[2]);
  part(g, cyl(0.006, 0.006, 0.18, 6), BLACK, MW.talkback[0] - 0.1, MW.ledge + 0.08, MW.talkback[2] + 0.02, { outline: false });
  const meter = [0, 1, 2, 3, 4, 5].map((i) => ownLit(g, box(0.05, 0.022, 0.004), '#123f24', -0.92, MW.ledge - 0.02 + i * 0.03, 0.02));
  part(g, box(0.09, 0.2, 0.012), BLACK, -0.92, MW.ledge + 0.05, 0.01);
  label(g, BRAND, 0.4, 0.06, 0, MW.ledge - 0.2, 0.031, '#2a2f36', '#90a4ae');
  // Clock.
  part(g, cyl(0.1, 0.1, 0.02, 20), '#20242a', 1.14, 2.2, -0.24, { rx: Math.PI / 2 });
  const board = clipboard(g);
  board.visible = false;
  const spots: Record<string, Spot> = { anWatchAir: standAt(g, 'anWatch') };
  spots['*'] = spots.anWatchAir;
  drive(g, out, spots, (_now, N, t) => {
    const n = N?.n ?? {};
    const on = onAir(t);
    if (on) feed(`a${AIR.breaking}${AIR.story}`, AIR.breaking, AIR.story, true);
    else feed('idle', false, 0, false);
    setLit(tally, on ? '#e53935' : RED_D);
    setLit(talk, (n.talk ?? 0) > 0.5 ? '#69f0ae' : '#3a4a3a');
    at(board, N?.props.board ?? null);
    const lvl = on ? 0.6 + 0.3 * Math.abs(Math.sin(t * 4.3)) : 0.15;
    meter.forEach((m, i) => setLit(m, lvl > i / 6 ? (i === 5 ? '#ff5252' : '#69f0ae') : '#123f24'));
  });
  out.work = marker(g, MW.pgm[0], MW.ledge, MW.pgm[2] + 0.3);
}

// =============================================================================================
// 런다운 보드 (anRundownBoard, 2 × 1): tonight's order on cards on a magnetic board, a clock counting down.

function rundownBoard(g: THREE.Group, out: Built, W: number) {
  const H = 2.2;
  part(g, box(W, H - 0.1, 0.04), '#cfd8dc', 0, H / 2 + 0.05, -0.36);
  part(g, box(W + 0.04, 0.04, 0.06), '#546e7a', 0, H + 0.1, -0.36);
  part(g, box(W + 0.04, 0.04, 0.1), '#546e7a', 0, 0.32, -0.34);
  label(g, `${NEWS_NAME} 오늘의 런다운`, 1.34, 0.14, -0.26, 2.08, -0.335, NAVY, '#ffffff');
  // The columns: times down the left, cards down the middle, reader's names at the right.
  const rows = ['20:00 오프닝', '20:02 (미정)', '20:05 새 버스 노선', '벚꽃 축제 개막', '20:11 인터뷰: 벚꽃 지기', '20:15 스포츠 단신', '20:18 내일 날씨', '20:20 클로징'];
  rows.forEach((s, i) => {
    const y = 1.96 - i * 0.2;
    if (i === 3) return;
    if (i === 1) {
      label(g, s, 1.06, 0.13, -0.32, y, -0.335, '#dfe6ea', '#78909c');
      return;
    }
    part(g, box(1.12, 0.17, 0.006), i % 2 ? '#fff9c4' : '#ffffff', -0.32, y, -0.335, { outline: false });
    label(g, s, 1.06, 0.13, -0.32, y, -0.331, i % 2 ? '#fff9c4' : '#ffffff', '#26332d');
    part(g, ball(0.012), RED, -0.86, y + 0.05, -0.33, { outline: false });
    label(g, i % 3 ? '유창한' : '나또박', 0.28, 0.13, 0.48, y, -0.331, '#e3f2fd', NAVY);
  });
  // The card moved in the meeting: the festival goes up into the open slot.
  const card = group(g);
  part(card, box(1.12, 0.17, 0.006), '#ffcc80', 0, 0, 0, { outline: false });
  label(card, rows[3], 1.06, 0.13, 0, 0, 0.004, '#ffcc80', '#26332d');
  part(card, ball(0.012), RED, -0.54, 0.05, 0.004, { outline: false });
  // A clock counting down, a marker tray.
  part(g, box(0.52, 0.2, 0.04), BLACK, 0.72, 2.02, -0.33);
  const clockS = swapPic(g, 0.48, 0.17, 0.72, 2.02, -0.309);
  const paint = live(144, 52);
  const clock = (n: number) =>
    clockS.set(
      paint(String(n), (c) => {
        c.fillStyle = '#100808';
        c.fillRect(0, 0, 144, 52);
        const m = Math.floor(n / 60);
        text(c, `-${String(m).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`, 72, 27, 36, '#ff5252', 'center');
      }),
    );
  clock(754);
  for (const [x, col] of [[-0.6, '#c62828'], [-0.48, '#1565c0'], [-0.36, '#212121']] as const) part(g, cyl(0.009, 0.009, 0.1, 6), col, x, 0.36, -0.3, { rz: Math.PI / 2, outline: false });
  // Who's round it: the 국장 and the 메인 앵커.
  const a = lazy(() => person(g, LOOKS.chief, RB.people[0][0], RB.people[0][1], RB.people[0][2]));
  const b = lazy(() => person(g, LOOKS.anchor, RB.people[1][0], RB.people[1][1], RB.people[1][2], 'female'));
  const spots: Record<string, Spot> = { anEditMeeting: standAt(g, 'anMeet') };
  spots['*'] = spots.anEditMeeting;
  const fromHome: V = [-0.32, 1.96 - 3 * 0.2, RB.from[2]];
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    clock(754 - Math.floor(t) % 300);
    at(card, P.card ?? null, fromHome);
    if (now) {
      const fa = a.get();
      const fb = b.get();
      fa.root.visible = fb.root.visible = true;
      const talking = (n.talk ?? 0) > 0.5;
      fa.opts.nod = 0.1 + (talking ? 0.05 * Math.sin(t * 2.6) : 0);
      fb.opts.nod = (n.agree ?? 0) > 0.5 ? 0.12 + 0.12 * Math.abs(Math.sin(t * 3)) : 0.08 + 0.04 * Math.sin(t * 1.7);
      fa.armR(talking ? v3(-0.5, 1.22 + 0.05 * Math.sin(t * 3), 0.55) : null);
      fb.armL(null);
    } else {
      a.hide();
      b.hide();
    }
  });
  out.work = marker(g, 0.2, 1.4, RB.z);
}

// =============================================================================================
// 발음 연습 거울 (anDictionMirror, 2 × 1): a broad mirror, the mouth chart at its side, a ledge of practice things.

function dictionMirror(g: THREE.Group, out: Built, W: number) {
  const H = 2.04;
  part(g, box(W, H, 0.04), '#eceff1', 0, H / 2, -0.44);
  // The mirror: not glass in the game, so a painted silver with a light across it, and someone in it when used.
  part(g, box(1.16, 1.6, 0.03), '#78909c', 0.26, 1.2, -0.41);
  const mirrorTex = painted('anMirror', 200, 280, (c) => {
    const g2 = c.createLinearGradient(0, 0, 200, 280);
    g2.addColorStop(0, '#dff0f7');
    g2.addColorStop(0.5, '#b7cfdb');
    g2.addColorStop(1, '#d6e8f0');
    c.fillStyle = g2;
    c.fillRect(0, 0, 200, 280);
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.beginPath();
    c.moveTo(20, 0);
    c.lineTo(70, 0);
    c.lineTo(0, 110);
    c.lineTo(0, 40);
    c.fill();
  });
  picture(g, mirrorTex, 1.1, 1.54, 0.26, 1.2, -0.392);
  // Someone reflected: a pale bust in the glass.
  const refl = group(g, 0.26, 0, -0.388);
  const reflMat = new THREE.MeshBasicMaterial({ color: '#90a4ae', transparent: true, opacity: 0.5 });
  const rHead = new THREE.Mesh(new THREE.CircleGeometry(0.1, 16), reflMat);
  rHead.position.y = 1.4;
  rHead.userData.ownGeometry = rHead.userData.ownMaterial = true;
  const rBody = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.5), reflMat);
  rBody.position.y = 1.0;
  rBody.userData.ownGeometry = rBody.userData.ownMaterial = true;
  refl.add(rHead, rBody);
  refl.visible = false;
  // The lamp over the mirror, lit.
  part(g, rbox(1.16, 0.06, 0.1, 0.02), '#cfd8dc', 0.26, 2.04, -0.36);
  ownLit(g, box(1.06, 0.012, 0.05), '#fff7dc', 0.26, 2.005, -0.34);
  // The mouth chart at the left.
  const chartTex = painted('anMouthChart', 200, 320, (c) => {
    c.fillStyle = '#fffdf6';
    c.fillRect(0, 0, 200, 320);
    c.fillStyle = NAVY;
    c.fillRect(0, 0, 200, 34);
    text(c, '입 모양 표', 100, 18, 20, '#ffffff', 'center');
    const vs: Array<[string, number, number]> = [['아', 28, 22], ['에', 26, 12], ['이', 30, 5], ['오', 14, 18], ['우', 9, 11]];
    vs.forEach(([s, rx, ry], i) => {
      const y = 62 + i * 52;
      c.fillStyle = '#f8c7b0';
      c.beginPath();
      c.ellipse(60, y, rx + 8, ry + 6, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#6a1b1b';
      c.beginPath();
      c.ellipse(60, y, rx, ry, 0, 0, Math.PI * 2);
      c.fill();
      text(c, s, 140, y, 28, NAVY, 'center');
    });
  });
  picture(g, chartTex, 0.56, 0.9, MR.chart[0], MR.chart[1], MR.chart[2] + 0.05);
  label(g, '간장 공장 공장장 · 내가 그린 기린 그림', 0.64, 0.11, MR.chart[0], 0.93, MR.chart[2] + 0.055, '#fff8e1', '#3e2723');
  // The ledge: water, pens in a cup, a timer, tissues.
  part(g, rbox(W - 0.04, 0.04, 0.3, 0.01), '#b0bec5', 0, MR.ledge - 0.02, -0.24);
  for (const sx of [-1, 1]) part(g, box(0.04, MR.ledge - 0.04, 0.24), '#90a4ae', sx * (W / 2 - 0.08), (MR.ledge - 0.04) / 2, -0.28, { outline: false });
  const water = group(g);
  part(water, cyl(0.03, 0.032, 0.17, 10), '#b3e5fc', 0, 0.085, 0, { outline: false });
  part(water, cyl(0.018, 0.02, 0.03, 8), '#eceff1', 0, 0.185, 0, { outline: false });
  const pen = group(g);
  part(pen, cyl(0.006, 0.006, 0.14, 6), '#1565c0', 0, 0, 0, { rz: Math.PI / 2, outline: false });
  part(g, rbox(0.18, 0.09, 0.14, 0.015), '#f8bbd0', -0.82, MR.ledge + 0.045, -0.24);
  part(g, cyl(0.05, 0.05, 0.04, 14), '#ef6c00', 0.86, MR.ledge + 0.02, -0.24);
  // The syllables being said, up in the corner of the mirror on a small screen.
  part(g, box(0.5, 0.16, 0.02), BLACK, 0.26, 1.82, -0.38);
  const sylS = swapPic(g, 0.47, 0.13, 0.26, 1.82, -0.369);
  const paint = live(192, 52);
  const WORDS = ['간', '장', '공', '장', '공', '장장은', '강', '공장장'];
  const syl = (i: number) =>
    sylS.set(
      paint(String(i), (c) => {
        c.fillStyle = '#10151f';
        c.fillRect(0, 0, 192, 52);
        text(c, i < 0 ? '발음 연습' : WORDS[i % WORDS.length], 96, 27, 30, i < 0 ? '#90a4ae' : '#ffd54f', 'center');
      }),
    );
  syl(-1);
  const board = clipboard(g);
  board.visible = false;
  const rookie = lazy(() => person(g, LOOKS.rookie, MR.rookie[0], MR.rookie[1], Math.PI + 0.5, 'female'));
  const spots: Record<string, Spot> = { anMouthDrill: standAt(g, 'anMouth'), announcer_coachRookies: standAt(g, 'anCoach') };
  spots['*'] = spots.anMouthDrill;
  drive(g, out, spots, (now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    at(water, P.water, MR.water);
    at(pen, P.pen, MR.pen);
    at(board, P.board ?? null);
    refl.visible = !!now;
    if (N) refl.position.x = N.st.x * 0.6 + 0.1;
    syl(Math.round(n.syll ?? -1));
    if (now === 'announcer_coachRookies') {
      const f = rookie.get();
      f.root.visible = true;
      f.opts.nod = (n.rNod ?? 0) > 0.5 ? 0.12 + 0.12 * Math.abs(Math.sin(t * 3)) : 0.02 + ((n.rTry ?? 0) > 0.5 ? 0.04 * Math.sin(t * 8) : 0);
      const mouthY = 1.4;
      const hand = (n.rHand ?? 0) > 0.5 || (n.rTry ?? 0) > 0.5;
      f.armR(hand ? v3(MR.rookie[0] + 0.08, mouthY - 0.05 * Math.abs(Math.sin(t * 2.4)), MR.rookie[1] - 0.05) : null);
      f.armL(hand ? v3(MR.rookie[0] - 0.08, mouthY - 0.05 * Math.abs(Math.sin(t * 2.4)), MR.rookie[1] - 0.05) : null);
    } else rookie.hide();
  });
  out.work = marker(g, 0, MR.ledge, -0.2);
}

// =============================================================================================
// 분장·의상 코너 (anMakeupCorner, 3 × 1): a vanity with its row of bulbs, a stool, a rail of jackets.

function makeupCorner(g: THREE.Group, out: Built) {
  const vx = MK.seat[0];
  // The vanity: a top with a drawer each side, the mirror and its bulbs.
  part(g, rbox(1.3, 0.04, 0.5, 0.012), '#f5eee6', vx, MK.top - 0.02, -0.2);
  for (const sx of [-1, 1]) part(g, box(0.36, MK.top - 0.04, 0.46), '#e8ddd3', vx + sx * 0.46, (MK.top - 0.04) / 2, -0.2);
  for (const sx of [-1, 1])
    for (let i = 0; i < 3; i++) {
      part(g, box(0.32, 0.18, 0.006), '#f5eee6', vx + sx * 0.46, 0.14 + i * 0.22, 0.033, { outline: false });
      part(g, ball(0.012), '#c9a24b', vx + sx * 0.46, 0.14 + i * 0.22, 0.04, { outline: false });
    }
  part(g, box(1.0, 1.1, 0.03), '#8d6e63', vx, 1.38, -0.42);
  picture(g, painted('anVanity', 200, 220, (c) => {
    const g2 = c.createLinearGradient(0, 0, 200, 220);
    g2.addColorStop(0, '#e7f2f7');
    g2.addColorStop(1, '#bcd4df');
    c.fillStyle = g2;
    c.fillRect(0, 0, 200, 220);
  }), 0.94, 1.04, vx, 1.38, -0.402);
  const bulbs: THREE.Mesh[] = [];
  const bulb = (x: number, y: number) => bulbs.push(ownLit(g, ball(0.032), '#ffe9b3', x, y, -0.385));
  for (let i = 0; i < 6; i++) bulb(vx - 0.45 + i * 0.18, 1.95);
  for (let i = 0; i < 4; i++) {
    bulb(vx - 0.53, 0.98 + i * 0.26);
    bulb(vx + 0.53, 0.98 + i * 0.26);
  }
  // On the vanity: a powder compact, brushes in a pot, foundation, a sponge, a lip palette, tissues.
  const POT = [vx + 0.38, MK.top, -0.22] as const;
  part(g, cyl(0.04, 0.035, 0.1, 10), '#212121', POT[0], POT[1] + 0.05, POT[2]);
  for (let i = 0; i < 4; i++) {
    part(g, cyl(0.005, 0.005, 0.13, 6), '#6d4c41', POT[0] + (i - 1.5) * 0.012, POT[1] + 0.16, POT[2], { rz: (i - 1.5) * 0.08, outline: false });
    part(g, cyl(0.009, 0.006, 0.03, 6), '#ffccbc', POT[0] + (i - 1.5) * 0.016, POT[1] + 0.235, POT[2], { outline: false });
  }
  part(g, cyl(0.05, 0.05, 0.018, 12), '#c2a07c', vx - 0.34, MK.top + 0.01, -0.12);
  part(g, cyl(0.022, 0.024, 0.09, 8), '#ffccbc', vx - 0.2, MK.top + 0.045, -0.3);
  part(g, rbox(0.12, 0.012, 0.08, 0.004), '#ad1457', vx + 0.14, MK.top + 0.006, -0.12);
  part(g, rbox(0.14, 0.07, 0.09, 0.012), '#f8bbd0', vx + 0.46, MK.top + 0.035, -0.08);
  // The stool.
  part(g, cyl(0.03, 0.04, 0.38, 10), STEEL, vx, 0.21, MK.seat[2], { outline: false });
  part(g, cyl(0.18, 0.18, 0.05, 14), '#ad1457', vx, MK.seat[1] - 0.025, MK.seat[2]);
  part(g, cyl(0.2, 0.22, 0.03, 12), STEEL, vx, 0.03, MK.seat[2]);
  // The rail: jackets and a blouse on hangers, a mirror on the wall beside, a shoe rack below.
  const rx = MK.rail[0];
  for (const sx of [-1, 1]) part(g, cyl(0.016, 0.016, 1.78, 8), STEEL, rx + sx * 0.66, 0.89, MK.rail[2], { outline: false });
  part(g, cyl(0.014, 0.014, 1.36, 8), STEEL, rx, 1.72, MK.rail[2], { rz: Math.PI / 2, outline: false });
  const COATS = ['#0d47a1', '#37474f', '#ad1457', '#6d4c41', '#00695c'];
  const coat = (x: number, color: string, parent: THREE.Object3D = g, y = MK.rail[1]) => {
    const c = group(parent, x, y, MK.rail[2]);
    part(c, cyl(0.005, 0.005, 0.1, 6), STEEL, 0, 0.1, 0, { outline: false });
    part(c, rbox(0.34, 0.6, 0.1, 0.05), color, 0, -0.26, 0);
    part(c, box(0.12, 0.28, 0.01), '#ffffff', 0, -0.1, 0.052, { outline: false });
    part(c, box(0.06, 0.14, 0.012), shade(color, 0.8), -0.06, -0.08, 0.056, { outline: false });
    part(c, box(0.06, 0.14, 0.012), shade(color, 0.8), 0.06, -0.08, 0.056, { outline: false });
    return c;
  };
  COATS.forEach((col, i) => {
    if (i !== 2) coat(rx - 0.52 + i * 0.26, col);
  });
  const jacket = coat(0, COATS[2]);
  place(jacket, MK.rail);
  part(g, box(1.34, 0.04, 0.3), '#6d4c41', rx, 0.12, MK.rail[2]);
  for (let i = 0; i < 3; i++) part(g, rbox(0.2, 0.08, 0.1, 0.03), ['#212121', '#6d4c41', '#ad1457'][i], rx - 0.38 + i * 0.38, 0.18, MK.rail[2]);
  label(g, '분장실', 0.34, 0.1, rx - 0.54, 1.88, MK.rail[2], '#fff3e0', '#ad1457');
  // What the artist holds.
  const brush = group(g);
  part(brush, cyl(0.006, 0.006, 0.13, 6), '#6d4c41', 0, -0.05, 0, { outline: false });
  part(brush, cyl(0.016, 0.008, 0.035, 8), '#ffccbc', 0, 0.03, 0, { outline: false });
  brush.visible = false;
  const puff = part(g, ball(0.03), '#ffffff', 0, 0, 0, { outline: false });
  puff.visible = false;
  const artist = lazy(() => person(g, LOOKS.artist, MK.artist[0], MK.artist[1], -Math.PI / 2 - 0.25, 'female'));
  const spots: Record<string, Spot> = { anGetReady: seatAt(g, 'anMakeup', MK.seat, Math.PI) };
  spots['*'] = spots.anGetReady;
  const P = new THREE.Vector3();
  drive(g, out, spots, (now, N, t) => {
    const p = N?.props ?? {};
    const n = N?.n ?? {};
    at(jacket, p.jacket, now ? undefined : MK.rail);
    const there = n.artist ?? 0;
    if (now && there > 0.02) {
      const f = artist.get();
      comes(f, there, MK.artist[0], MK.artist[1], 0.5, t);
      const tool = n.brush ?? 0;
      const w = n.w ?? 0;
      if (tool > 0.5 && there > 0.8) {
        const dx = tool === 3 ? 0.11 : 0.05 * w;
        const dy = tool === 2 ? -0.03 : tool === 3 ? 0.14 + 0.03 * w : 0.02 + 0.03 * w;
        P.set((n.bx ?? 0) + 0.06 + dx, (n.by ?? 0) + dy, (n.bz ?? 0) + 0.12);
        f.armR(P);
        brush.visible = true;
        brush.position.copy(P);
        brush.rotation.z = 0.9;
      } else {
        f.armR(null);
        brush.visible = false;
      }
      f.armL(null);
      f.opts.lean = 0.14;
      f.opts.nod = 0.2;
    } else {
      artist.hide();
      brush.visible = false;
    }
  });
  out.work = marker(g, vx, MK.top, -0.1);
}

export const BUILDERS: Record<string, Builder> = {
  anchorDesk(g, W, _D, _c, _def, _ctx, out) {
    anchorDesk(g, out, W);
  },
  prompterDesk(g, _W, _D, _c, _def, _ctx, out) {
    prompterDesk(g, out);
  },
  pronunciationShelf(g, _W, _D, _c, _def, _ctx, out) {
    pronunciationShelf(g, out);
  },
  onAirBooth(g, W, _D, _c, _def, _ctx, out) {
    onAirBooth(g, out, W);
  },
  anNewsSet(g, W, _D, _c, _def, _ctx, out) {
    newsSet(g, out, W);
  },
  anCamera(g, _W, _D, _c, _def, _ctx, out) {
    studioCamera(g, out);
  },
  anMonitorWall(g, W, _D, _c, _def, _ctx, out) {
    monitorWall(g, out, W);
  },
  anRundownBoard(g, W, _D, _c, _def, _ctx, out) {
    rundownBoard(g, out, W);
  },
  anDictionMirror(g, W, _D, _c, _def, _ctx, out) {
    dictionMirror(g, out, W);
  },
  anMakeupCorner(g, _W, _D, _c, _def, _ctx, out) {
    makeupCorner(g, out);
  },
  anRecordBooth(g, W, _D, _c, _def, _ctx, out) {
    recordBooth(g, out, W);
  },
};
