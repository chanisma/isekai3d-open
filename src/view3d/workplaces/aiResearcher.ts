import * as THREE from 'three';
import type { HeldTool } from '../handTool';
import { boardGrip } from '../handTool';
import { marker, rod, shade, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, label, painted, picture, seeded, text } from './doctor';
import { DM, EQ_LINES, EW, GR, IMAGES, LS, PB, POINTS, PS, QA, RN, TD, arNow, arPhase, onBoard, wrap } from './aiResearcherMotion';
import type { ArMotion, ArNow, ArTool } from './aiResearcherMotion';
import { vroidFigure, type FigureOptions } from './vroidFigure';

/**
 * The 인공지능 연구소 drawn as itself (2026-11-01, a new career at the user's request), the lab of a made-up company, 솔결랩.
 * Desks where a model's loss really falls on the dashboard as the dweller works, a labelling station where the box follows the
 * stylus, a whiteboard with invented equations written live, a small GPU rack that spins and warms, a big screen where the
 * invented assistant 도란이 answers and sometimes answers wrongly, a wall of results, a corner of printed papers and a poster
 * board. Everything that moves follows aiResearcherMotion.ts. All names, models and equations are made up.
 */

const LAB = '솔결랩';
const BOT = '도란이';
const MODELS = ['솔결-1', '솔결-2', '솔결-미니', '솔결-3'];
const WHITE = '#f4f6f7';
const PANEL = '#e4e8ea';
const GREY = '#8d99a3';
const GREY_D = '#55616b';
const GRAPHITE = '#2f363c';
const NAVY = '#1f2d5c';
const INDIGO = '#3949ab';
const AMBER = '#ffb300';
const AMBER_L = '#ffe08a';
const RED = '#e53935';
const GREEN = '#43a047';
const MINT = '#7ee89e';
const TEAL = '#00897b';
const BLUE = '#2f6fd0';
const PAPER = '#fbfaf6';
const WOOD = '#b08a63';
const SKIN = '#f1c9a5';
const INK = '#0f1720';
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UP = v3(0, 1, 0);
const tmp = new THREE.Vector3();
type V = readonly [number, number, number];
type Ctx2 = CanvasRenderingContext2D;
const q = (x: number | undefined, steps = 20) => Math.round((x ?? 0) * steps);
const pos = (r: number) => Math.max(0.5, r);
const clamp01 = (x: number | undefined) => THREE.MathUtils.clamp(x ?? 0, 0, 1);
/** The first part of a line, as it's being typed. */
const typed = (s: string, e: number | undefined) => s.slice(0, Math.floor(s.length * clamp01(e) + 0.001));

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
function ownLit(g: THREE.Object3D, geom: THREE.BufferGeometry, color: string, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color }));
  m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
const setLit = (m: THREE.Mesh, c: string) => (m.material as THREE.MeshBasicMaterial).color.set(c);
function haze(g: THREE.Object3D, geom: THREE.BufferGeometry, color: string, opacity: number, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
const fade = (m: THREE.Mesh, o: number) => {
  m.visible = o > 0.01;
  (m.material as THREE.MeshBasicMaterial).opacity = o;
};
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
function standAt(g: THREE.Object3D, motion: ArMotion, x = 0, z = 0.6): Spot {
  const s = spot(g, 'stand', x, 0, z, Math.PI);
  s.motion = motion;
  return s;
}
function seatAt(g: THREE.Object3D, motion: ArMotion, seat: V, yaw = Math.PI): Spot {
  const s = spot(g, 'sit', seat[0], seat[1], seat[2], yaw, 0);
  s.motion = motion;
  return s;
}
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
function nowAt(spots: Record<string, Spot>, t: number): string | null {
  let best: string | null = null;
  for (const [k, s] of Object.entries(spots)) if (k !== '*' && Math.abs(t - posedAt(s)) < 0.6 && (best === null || posedAt(s) > posedAt(spots[best]))) best = k;
  return best;
}
/**
 * Every frame: which use is going on and where its script has got to. What the script says is in the hand goes in the hand
 * (handTool.ts); `tools` are the ways each is held.
 */
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, tools: Partial<Record<ArTool, HeldTool>>, show: (now: string | null, N: ArNow | null, t: number, H: number) => void) {
  out.spots = spots;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const H = (sp?.at.userData.height as number | undefined) ?? 1.6;
    const N = sp ? arNow(sp.motion as ArMotion, t, arPhase(g.getWorldPosition(tmp)), H) : null;
    show(now, N, t, H);
    for (const s of Object.values(spots)) s.held = s === sp && N?.tool ? (tools[N.tool] ?? null) : null;
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
function chair(g: THREE.Object3D, seat: V, color = NAVY) {
  const c = group(g, seat[0], 0, seat[2]);
  const T = seat[1];
  part(c, rbox(0.46, 0.07, 0.44, 0.03), color, 0, T - 0.035, 0);
  part(c, cyl(0.024, 0.03, T - 0.14, 10), CHROME, 0, (T - 0.08) / 2 + 0.06, 0, { outline: false });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    rod(c, v3(0, 0.1, 0), v3(Math.cos(a) * 0.25, 0.05, Math.sin(a) * 0.25), 0.014, BLACK);
    part(c, ball(0.026), BLACK, Math.cos(a) * 0.25, 0.028, Math.sin(a) * 0.25, { outline: false });
  }
  part(c, rbox(0.42, 0.42, 0.06, 0.04), color, 0, T + 0.3, 0.24, { rx: 0.1 });
}
/** A desk top on four legs, with a modesty panel. */
function desk(g: THREE.Object3D, T: number) {
  part(g, rbox(1.92, 0.045, 0.84, 0.012), '#e6dccd', 0, T - 0.022, -0.04);
  for (const sx of [-0.88, 0.88]) {
    part(g, box(0.05, T - 0.045, 0.72), GREY_D, sx, (T - 0.045) / 2, -0.04, { outline: false });
  }
  part(g, box(1.7, 0.36, 0.02), GREY, 0, T - 0.26, -0.4, { outline: false });
}
/** A monitor on an arm; returns the screen. */
function monitor(g: THREE.Object3D, p: V, w: number, h: number, T: number, px: number, py: number, ry = 0) {
  const m = group(g, p[0], 0, p[2], ry);
  part(m, box(w + 0.03, h + 0.03, 0.025), BLACK, 0, p[1], -0.016, { outline: false });
  part(m, cyl(0.022, 0.028, p[1] - T - h / 2 + 0.06, 10), GREY_D, 0, T + (p[1] - T - h / 2 + 0.06) / 2, -0.05, { outline: false });
  part(m, rbox(0.24, 0.016, 0.16, 0.006), GREY_D, 0, T + 0.008, -0.05, { outline: false });
  return liveScreen(m, w, h, px, py, 0, p[1], 0);
}
function keyboard(g: THREE.Object3D, p: V, w = 0.36, d = 0.13) {
  part(g, rbox(w, 0.018, d, 0.006), GRAPHITE, p[0], p[1] - 0.012, p[2], { outline: false });
  for (let j = 0; j < 4; j++) part(g, box(w - 0.03, 0.002, 0.012), GREY, p[0], p[1] - 0.002, p[2] - d / 2 + 0.02 + j * 0.028, { outline: false });
}

// ---------------------------------------------------------------------------------------------
// Tools designed for the hand. Each has its origin at the grip and is named for the probe.

/** A pen-shaped thing, its tip `len` along `dir` from the grip. */
function penShaped(g: THREE.Object3D, name: string, dir: THREE.Vector3, len: number, back: number, r: number, color: string, tip = BLACK): THREE.Group {
  const root = group(g);
  root.name = name;
  const inner = group(root);
  inner.quaternion.setFromUnitVectors(v3(0, -1, 0), dir.clone().normalize());
  part(inner, cyl(r, r, len * 0.78 + back, 10), color, 0, (back - len * 0.78) / 2, 0, { outline: false });
  part(inner, cyl(r, r * 0.3, len * 0.22, 10), tip, 0, -len * 0.89, 0, { outline: false });
  return root;
}
const penGrip = (axis: THREE.Vector3, radius = 0.012, writes?: number): HeldTool['grips'] => ({ right: { at: v3(0, 0, 0), axis: axis.clone().normalize(), shape: 'pen', radius, writes } });
const DOWN = v3(-0.12, -1, -0.28).normalize();

function eraserTool(g: THREE.Object3D): THREE.Group {
  const root = group(g);
  root.name = 'arEraser';
  part(root, cyl(0.016, 0.016, 0.11, 10), GRAPHITE, 0, 0, -0.012, { outline: false });
  part(root, rbox(0.2, 0.1, 0.05, 0.012), '#37474f', 0, 0, -0.058, { outline: false });
  part(root, box(0.2, 0.1, 0.018), '#eceff1', 0, 0, -0.095, { outline: false });
  return root;
}
function thermoTool(g: THREE.Object3D): { root: THREE.Group; beam: THREE.Mesh; lcd: ReturnType<typeof liveScreen> } {
  const root = group(g);
  root.name = 'arThermo';
  part(root, cyl(0.016, 0.018, 0.1, 10), '#f9a825', 0, 0, 0, { rx: 0.25, outline: false });
  part(root, rbox(0.05, 0.05, 0.14, 0.012), '#37474f', 0, 0.065, -0.03, { outline: false });
  part(root, box(0.012, 0.02, 0.014), RED, 0, 0.03, -0.018, { outline: false });
  const lcd = liveScreen(root, 0.04, 0.03, 64, 48, 0, 0.066, 0.041);
  const beam = haze(root, new THREE.PlaneGeometry(0.006, 0.5), '#ff3b30', 0.7, 0, 0.055, -0.35);
  beam.rotation.x = -Math.PI / 2;
  return { root, beam, lcd };
}
function clickerTool(g: THREE.Object3D): THREE.Group {
  const root = group(g);
  root.name = 'arClicker';
  part(root, cyl(0.014, 0.014, 0.11, 10), GRAPHITE, 0, 0, 0, { outline: false });
  ownLit(root, ball(0.006), '#ff5252', 0, 0.056, 0);
  part(root, box(0.012, 0.018, 0.004), GREY, 0, 0.02, 0.014, { outline: false });
  return root;
}
function clipTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'arClip';
  const tilt = group(root);
  tilt.rotation.x = -0.55;
  part(tilt, box(0.2, 0.28, 0.008), '#8a6242', 0, 0, 0, { outline: false });
  part(tilt, box(0.17, 0.23, 0.002), PAPER, 0, -0.015, 0.006, { outline: false });
  part(tilt, box(0.07, 0.02, 0.012), CHROME, 0, 0.125, 0.008, { outline: false });
  for (let i = 0; i < 4; i++) part(tilt, box(0.11, 0.004, 0.001), GREY_D, -0.02, 0.06 - i * 0.05, 0.0075, { outline: false });
  const ticks = [0, 1].map((i) => part(tilt, box(0.02, 0.016, 0.002), GREEN, 0.06, 0.06 - i * 0.05, 0.008, { outline: false }));
  return { root, ticks };
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
function person(parent: THREE.Object3D, top: string, bottom: string, hair: string, x: number, z: number, ry: number, gender?: 'female' | 'male'): Fig {
  const root = group(parent, x, 0, z, ry);
  for (const sx of [-1, 1]) {
    rod(root, v3(sx * 0.085, 0.84, 0), v3(sx * 0.09, 0.08, 0.01), 0.056, bottom);
    part(root, rbox(0.09, 0.07, 0.2, 0.03), '#37474f', sx * 0.09, 0.035, 0.04);
  }
  part(root, rbox(0.3, 0.17, 0.2, 0.06), bottom, 0, 0.88, 0);
  part(root, rbox(0.34, 0.46, 0.21, 0.08), top, 0, 1.11, 0);
  part(root, cyl(0.045, 0.05, 0.08, 10), SKIN, 0, 1.37, 0, { outline: false });
  const head = group(root, 0, 1.51, 0);
  part(head, ball(0.112), SKIN, 0, 0, 0);
  for (const sx of [-1, 1]) part(head, ball(0.012), '#2b2b30', sx * 0.04, 0, 0.104, { outline: false });
  part(head, ball(0.118), hair, 0, 0.03, -0.03);
  const arm = (sx: number) => {
    const shoulder = v3(sx * 0.2, 1.31, 0);
    const rest = v3(sx * 0.23, 0.82, 0.05);
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
  const opts: FigureOptions = { gender };
  const f = vroidFigure({ root, head, armL, armR }, opts);
  root.visible = false;
  return { ...f, opts };
}
const nodHead = (F: Fig, v: number) => {
  F.opts.nod = v;
  F.head.rotation.x = v;
};

// =============================================================================================
// 학습 현황 책상 (arTrainDesk, 2 × 1): the dashboard, the code, a tower that glows, a notebook, a mug.

/** The loss over a run: x from 0 to 1. Each run settles a little lower than the last, up to four, then a new experiment. */
function lossAt(x: number, run: number): number {
  const r = wrap(run, 4);
  const floor = 0.3 - r * 0.05;
  return (0.92 - floor) * Math.exp(-4.2 * x) + floor + 0.016 * Math.sin(x * 37 + r) + 0.01 * Math.sin(x * 91 + r * 2);
}
function paintDash(c: Ctx2, w: number, h: number, p: number, run: number, blow: number, lr: number, tune: boolean, live: boolean) {
  c.fillStyle = INK;
  c.fillRect(0, 0, w, h);
  c.fillStyle = NAVY;
  c.fillRect(0, 0, w, 28);
  text(c, `${LAB} · 솔결-3 학습 현황`, 8, 14, 15, '#ffffff');
  const blowing = blow > 0.02 && lr < 0.5;
  text(c, !live ? '대기' : blowing ? '발산!' : '학습 중', w - 8, 14, 14, blowing ? '#ff8a80' : MINT, 'right');
  const x0 = 34;
  const x1 = w - 12;
  const y0 = 44;
  const y1 = h - 44;
  c.strokeStyle = 'rgba(160,200,240,0.2)';
  c.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = y0 + ((y1 - y0) * i) / 4;
    c.beginPath();
    c.moveTo(x0, y);
    c.lineTo(x1, y);
    c.stroke();
  }
  text(c, '손실', 4, y0 + 2, 12, '#9fb3c8');
  text(c, '에폭', x1, y1 + 12, 12, '#9fb3c8', 'right');
  const X = (u: number) => x0 + (x1 - x0) * u;
  const Y = (v: number) => y1 - (y1 - y0) * THREE.MathUtils.clamp(v, 0, 1);
  const line = (color: string, width: number, end: number, f: (u: number) => number) => {
    c.strokeStyle = color;
    c.lineWidth = width;
    c.beginPath();
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const u = (i / steps) * end;
      if (i === 0) c.moveTo(X(u), Y(f(u)));
      else c.lineTo(X(u), Y(f(u)));
    }
    c.stroke();
  };
  const e = clamp01(p);
  if (blowing) {
    // The rate's too high: up and off the chart.
    const b = clamp01(blow);
    line('#ff5252', 2.5, Math.max(0.01, b * 0.7), (u) => 0.55 + 0.7 * u * u + 0.03 * Math.sin(u * 40));
  } else {
    if (e > 0.001) {
      line('#ffb74d', 1.5, e, (u) => lossAt(u, run) + 0.05 + 0.05 * u);
      line(MINT, 2.5, e, (u) => lossAt(u, run));
    }
    if (e > 0.001) {
      c.fillStyle = MINT;
      c.beginPath();
      c.arc(X(e), Y(lossAt(e, run)), pos(4), 0, Math.PI * 2);
      c.fill();
    }
  }
  const val = blowing ? 0.55 + 0.7 * clamp01(blow) * 0.5 : e > 0.001 ? lossAt(e, run) : 0.92;
  const rateText = tune ? (lr > 0.5 ? '학습률 0.0003' : '학습률 3.0') : '학습률 0.0003';
  text(c, `손실 ${val.toFixed(3)}`, 8, h - 28, 16, blowing ? '#ff8a80' : MINT);
  text(c, `에폭 ${Math.round(e * 50)}/50`, 8, h - 11, 13, '#c9d6e3');
  text(c, rateText, w - 8, h - 28, 14, tune && lr < 0.5 ? AMBER_L : '#c9d6e3', 'right');
  text(c, `실험 ${wrap(run, 4) + 11}번`, w - 8, h - 11, 13, '#c9d6e3', 'right');
}
const CODE = ['# 솔결-3 학습 설정', '데이터 = 불러오기("연구소_말뭉치")', '모델 = 솔결(층=12, 결=8)', '반복 = 50  # 에폭', '학습률 = 0.0003', '학습(모델, 데이터, 반복)', '저장("솔결-3_체크포인트")'];
function paintCode(c: Ctx2, w: number, h: number, e: number, saved: number, noted: number, running: boolean) {
  c.fillStyle = '#10151c';
  c.fillRect(0, 0, w, h);
  c.fillStyle = '#26303b';
  c.fillRect(0, 0, w, 22);
  text(c, '학습.코드', 8, 11, 12, '#c9d6e3');
  const lines = Math.ceil(clamp01(e) * CODE.length);
  CODE.slice(0, lines).forEach((s, i) => {
    text(c, `${i + 1}`, 6, 34 + i * 19, 11, '#5e6c7a', 'left', false);
    const last = i === lines - 1;
    const part01 = clamp01(e) * CODE.length - i;
    text(c, last ? typed(s, part01) : s, 26, 34 + i * 19, 13, s[0] === '#' ? '#7c8a98' : '#a5d6ff', 'left', false);
  });
  if (running) {
    c.fillStyle = '#1b2a1f';
    c.fillRect(0, h - 34, w, 34);
    text(c, saved > 0.5 ? '저장 완료 ✓' : '> 학습 실행 중...', 8, h - 17, 13, MINT, 'left', false);
  }
  if (noted > 0.5) {
    c.fillStyle = 'rgba(255,224,138,0.9)';
    c.fillRect(w - 66, 28, 58, 34);
    text(c, '메모함', w - 37, 45, 12, BLACK, 'center');
  }
}
function trainDesk(g: THREE.Group, out: Built) {
  const T = TD.top;
  desk(g, T);
  chair(g, TD.seat);
  const dash = monitor(g, TD.dash, 0.76, 0.46, T, 340, 206);
  const code = monitor(g, TD.code, 0.62, 0.42, T, 280, 190);
  code.mesh.parent!.rotation.y = -0.12;
  keyboard(g, TD.keys);
  part(g, rbox(0.06, 0.03, 0.1, 0.012), GRAPHITE, TD.mouse[0], T + 0.015, TD.mouse[2], { outline: false });
  // The notebook, a mug, stickies on the monitor's edge, a small tower that glows under the desk's end.
  part(g, box(0.2, 0.012, 0.27), '#37474f', TD.note[0], T + 0.006, TD.note[2], { outline: false });
  part(g, box(0.18, 0.002, 0.25), PAPER, TD.note[0], T + 0.013, TD.note[2], { outline: false });
  const notes = [0, 1, 2].map((i) => part(g, box(0.1, 0.001, 0.004), GREY_D, TD.note[0] - 0.01, T + 0.0146, TD.note[2] - 0.06 + i * 0.03, { outline: false }));
  part(g, cyl(0.04, 0.036, 0.09, 14), '#c5cae9', -0.72, T + 0.045, 0.22);
  label(g, '논문 마감 D-3', 0.2, 0.05, -0.72, T + 0.3, -0.33, AMBER_L, BLACK);
  part(g, box(0.2, 0.42, 0.42), GRAPHITE, 0.72, 0.21, -0.14);
  const ring = ownLit(g, cyl(0.05, 0.05, 0.006, 16), '#64b5f6', 0.72, 0.3, 0.076);
  ring.rotation.x = Math.PI / 2;
  const pen = penShaped(g, 'arPen', DOWN, TD.penUp, 0.05, 0.006, BLUE);
  const tools: Partial<Record<ArTool, HeldTool>> = { pen: { tool: pen, lead: 'right', grips: penGrip(DOWN, 0.012, TD.penUp) } };
  const spots: Record<string, Spot> = { arTrain: seatAt(g, 'arTrain', TD.seat), arTune: seatAt(g, 'arTune', TD.seat) };
  const show = (now: string | null, N: ArNow | null, t: number) => {
    const n = N?.n ?? {};
    at(pen, N?.props.pen ?? null, [TD.note[0] + 0.11, T + 0.02, TD.note[2] - 0.06]);
    const run = N?.b.n ?? 0;
    const tune = (n.tune ?? 0) > 0.5;
    const p = N ? clamp01(n.loss) : 1;
    const noted = clamp01(n.noted);
    notes.forEach((m, i) => (m.visible = !N || noted > (i + 0.4) / 3));
    setLit(ring, N && (n.running ?? 0) > 0.5 ? (Math.sin(t * 6) > 0 ? '#ffb74d' : '#ff8a65') : '#64b5f6');
    dash.draw(`${q(p, 60)}|${wrap(run, 4)}|${q(n.blow, 30)}|${q(n.lr, 2)}|${tune ? 1 : 0}|${N ? 1 : 0}`, (c) => paintDash(c, 340, 206, p, run, clamp01(n.blow), clamp01(n.lr), tune, !!N && now !== null));
    const e = N ? clamp01(n.code) : 1;
    code.draw(`${q(e, 40)}|${q(n.saved, 2)}|${q(n.noted, 2)}|${q(n.running, 2)}`, (c) => paintCode(c, 280, 190, e, clamp01(n.saved), noted, (n.running ?? 0) > 0.5));
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, TD.keys[0], TD.keys[1], TD.keys[2]);
}

// =============================================================================================
// 라벨링 책상 (arLabelStation, 2 × 1): a big monitor showing the picture, a pen tablet, shortcut keys, a stack of label rules.

/** The invented pictures: flat shapes, one room each, all drawn from the same few strokes. */
function paintScene(c: Ctx2, scene: number, x: number, y: number, w: number, h: number) {
  const bg = ['#dfe9d8', '#d6e4f0', '#ece0d2', '#e6dff0'][wrap(scene, 4)];
  c.fillStyle = bg;
  c.fillRect(x, y, w, h);
  c.fillStyle = 'rgba(0,0,0,0.08)';
  c.fillRect(x, y + h * 0.82, w, h * 0.18);
  const IM = IMAGES[wrap(scene, IMAGES.length)];
  const blob = (b: readonly [number, number, number, number], name: string) => {
    const bx = x + b[0] * w;
    const by = y + b[1] * h;
    const bw = b[2] * w;
    const bh = b[3] * h;
    const cx = bx + bw / 2;
    const cy = by + bh / 2;
    const r = Math.min(bw, bh) / 2;
    const dot = (px: number, py: number, rr: number, col: string) => {
      c.fillStyle = col;
      c.beginPath();
      c.arc(px, py, pos(rr), 0, Math.PI * 2);
      c.fill();
    };
    switch (name) {
      case '고양이':
        dot(cx, cy + r * 0.3, r * 0.7, '#a1887f');
        dot(cx, cy - r * 0.55, r * 0.46, '#a1887f');
        c.fillStyle = '#a1887f';
        c.fillRect(cx - r * 0.42, cy - r, r * 0.2, r * 0.3);
        c.fillRect(cx + r * 0.22, cy - r, r * 0.2, r * 0.3);
        break;
      case '화분':
        dot(cx, cy - r * 0.3, r * 0.65, '#66bb6a');
        c.fillStyle = '#bf7a4c';
        c.fillRect(cx - r * 0.5, cy + r * 0.1, r, r * 0.8);
        break;
      case '자전거':
        dot(cx - r * 0.95, cy + r * 0.3, r * 0.5, '#455a64');
        dot(cx + r * 0.95, cy + r * 0.3, r * 0.5, '#455a64');
        dot(cx - r * 0.95, cy + r * 0.3, r * 0.34, bg);
        dot(cx + r * 0.95, cy + r * 0.3, r * 0.34, bg);
        c.strokeStyle = RED;
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(cx - r * 0.95, cy + r * 0.3);
        c.lineTo(cx, cy - r * 0.2);
        c.lineTo(cx + r * 0.95, cy + r * 0.3);
        c.stroke();
        break;
      case '러버콘':
        c.fillStyle = '#ff7043';
        c.beginPath();
        c.moveTo(cx, by);
        c.lineTo(bx + bw, by + bh);
        c.lineTo(bx, by + bh);
        c.closePath();
        c.fill();
        break;
      case '우산':
        c.fillStyle = INDIGO;
        c.beginPath();
        c.arc(cx, cy - r * 0.2, pos(r * 0.9), Math.PI, 0);
        c.fill();
        c.fillStyle = GREY_D;
        c.fillRect(cx - 1.5, cy - r * 0.2, 3, r * 1.1);
        break;
      case '강아지':
        dot(cx, cy + r * 0.2, r * 0.72, '#d7b98e');
        dot(cx + r * 0.5, cy - r * 0.4, r * 0.42, '#d7b98e');
        dot(cx + r * 0.25, cy - r * 0.5, r * 0.16, '#8d6e63');
        break;
      case '사과':
        dot(cx, cy, r * 0.8, '#e53935');
        c.fillStyle = '#5d4037';
        c.fillRect(cx - 1.5, cy - r, 3, r * 0.3);
        break;
      default:
        dot(cx, cy + r * 0.2, r * 0.72, '#90a4ae');
        c.fillStyle = '#90a4ae';
        c.fillRect(cx + r * 0.6, cy - r * 0.1, r * 0.5, r * 0.18);
        c.fillRect(cx - r * 0.3, cy - r * 0.75, r * 0.6, r * 0.2);
    }
  };
  blob(IM.a, IM.an);
  blob(IM.b, IM.bn);
}
function paintBox(c: Ctx2, x: number, y: number, w: number, h: number, b: readonly [number, number, number, number], e: number, color: string, name: string | null) {
  const bx = x + b[0] * w;
  const by = y + b[1] * h;
  const bw = b[2] * w * clamp01(e);
  const bh = b[3] * h * clamp01(e);
  c.strokeStyle = color;
  c.lineWidth = 3;
  c.strokeRect(bx, by, bw, bh);
  if (name) {
    c.fillStyle = color;
    c.fillRect(bx, Math.max(y, by - 20), name.length * 15 + 8, 20);
    text(c, name, bx + 4, Math.max(y, by - 20) + 10, 14, '#ffffff');
  }
}
function labelStation(g: THREE.Group, out: Built) {
  const T = LS.top;
  desk(g, T);
  chair(g, LS.seat, '#37474f');
  const screen = monitor(g, LS.screen, 1.0, 0.58, T, 440, 256);
  keyboard(g, LS.keys, 0.24, 0.12);
  // The pen tablet: its active area is the picture.
  part(g, rbox(LS.padW + 0.05, 0.012, LS.padD + 0.05, 0.006), GRAPHITE, LS.pad[0], T + 0.008, LS.pad[2], { outline: false });
  part(g, box(LS.padW, 0.002, LS.padD), '#47535e', LS.pad[0], LS.pad[1] - 0.009, LS.pad[2], { outline: false });
  // The rules for labelling, a stack of pictures printed.
  part(g, box(0.2, 0.02, 0.28), PAPER, -0.74, T + 0.01, 0.1, { outline: false });
  label(g, '라벨 기준 3판', 0.16, 0.04, -0.74, T + 0.022, 0.05, NAVY, '#ffffff').rotation.x = -Math.PI / 2;
  part(g, cyl(0.04, 0.036, 0.09, 14), '#ffe0b2', 0.76, T + 0.045, 0.2);
  const stylus = penShaped(g, 'arStylus', DOWN, LS.stylusUp, 0.07, 0.0085, '#37474f', '#90a4ae');
  const tools: Partial<Record<ArTool, HeldTool>> = { stylus: { tool: stylus, lead: 'right', grips: penGrip(DOWN, 0.011, LS.stylusUp) } };
  const senior = person(g, '#90a4ae', '#37474f', '#2b1b10', 0.68, 0.86, Math.PI - 0.45, 'female');
  const spots: Record<string, Spot> = { arLabel: seatAt(g, 'arLabel', LS.seat), arAudit: seatAt(g, 'arAudit', LS.seat), aiResearcher_learnLabel: seatAt(g, 'arLearn', LS.seat) };
  const tgt = new THREE.Vector3();
  const home: V = [LS.pad[0] + LS.padW / 2 + 0.05, LS.pad[1] + 0.03, LS.pad[2] - 0.02];
  const show = (now: string | null, N: ArNow | null, t: number) => {
    const n = N?.n ?? {};
    at(stylus, N?.props.stylus ?? null, home);
    senior.root.visible = now === 'aiResearcher_learnLabel';
    if (senior.root.visible) {
      tgt.set(LS.screen[0] + 0.3, LS.screen[1], LS.screen[2] + 0.1);
      senior.armR((n.point ?? 0) > 0.5 ? tgt : null);
      senior.armL(null);
      nodHead(senior, (n.nodSr ?? 0) > 0.5 ? 0.25 * Math.sin(t * 6) : 0.14);
    }
    const round = N?.b.n ?? 0;
    const idx = wrap(round, IMAGES.length);
    const im = IMAGES[idx];
    const audit = (n.audit ?? 0) > 0.5;
    const fix = clamp01(n.fix);
    const named = clamp01(n.named);
    const b1 = N ? clamp01(n.b1) : 1;
    const b2 = N ? clamp01(n.b2) : 1;
    const c1 = N ? clamp01(n.c1) : 1;
    const c2 = N ? clamp01(n.c2) : 1;
    const sl = clamp01(n.sloppy);
    const pass = clamp01(n.pass);
    screen.draw(`${idx}|${q(b1, 24)}|${q(b2, 24)}|${q(c1, 2)}|${q(c2, 2)}|${audit ? 1 : 0}|${q(fix, 24)}|${q(named, 2)}|${q(sl, 2)}|${q(pass, 2)}|${q(n.done, 2)}`, (c) => {
      const w = 440;
      const h = 256;
      c.fillStyle = '#1b222b';
      c.fillRect(0, 0, w, h);
      c.fillStyle = NAVY;
      c.fillRect(0, 0, w, 24);
      text(c, `${audit ? '라벨 검수' : '라벨링'} · 사진 ${1204 + idx}`, 8, 12, 14, '#ffffff');
      text(c, `오늘 ${134 + idx * 7}장`, w - 8, 12, 13, AMBER_L, 'right');
      const x = 10;
      const y = 32;
      const iw = 320;
      const ih = 214;
      paintScene(c, idx, x, y, iw, ih);
      const wrongName = IMAGES[wrap(idx + 1, IMAGES.length)].bn;
      if (audit) {
        // Someone else's box: off to one side, the wrong name, until it's put right.
        const off = 0.1 * (1 - fix);
        paintBox(c, x, y, iw, ih, [im.a[0] + off, im.a[1] - off * 0.6, im.a[2], im.a[3]], 1, named > 0.5 ? GREEN : RED, named > 0.5 ? im.an : wrongName);
        paintBox(c, x, y, iw, ih, im.b, 1, GREEN, im.bn);
      } else {
        const a: readonly [number, number, number, number] = [im.a[0], im.a[1], im.a[2] + 0.14 * sl, im.a[3] + 0.08 * sl];
        if (b1 > 0.01) paintBox(c, x, y, iw, ih, a, b1, sl > 0.5 ? AMBER : GREEN, c1 > 0.5 ? im.an : null);
        if (b2 > 0.01 && (n.senior ?? 0) < 0.5) paintBox(c, x, y, iw, ih, im.b, b2, BLUE, c2 > 0.5 ? im.bn : null);
      }
      // The list of names at the side.
      c.fillStyle = '#26303b';
      c.fillRect(338, 32, 94, 214);
      text(c, '이름표', 345, 46, 13, '#c9d6e3');
      ['고양이', '자전거', '우산', '사과', '강아지', '화분'].forEach((s, i) => {
        c.fillStyle = (s === im.an && c1 > 0.5) || (s === im.bn && c2 > 0.5) ? '#2e7d32' : '#37474f';
        c.fillRect(344, 58 + i * 28, 82, 23);
        text(c, s, 385, 70 + i * 28, 13, '#ffffff', 'center', false);
      });
      if (pass > 0.5) {
        c.fillStyle = 'rgba(46,125,50,0.85)';
        c.fillRect(110, 110, 120, 44);
        text(c, '검수 통과', 170, 132, 20, '#ffffff', 'center');
      }
    });
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, LS.pad[0], LS.pad[1], LS.pad[2]);
}

// =============================================================================================
// 논문 토론 화이트보드 (arPaperBoard, 3 × 1): the board, the equations going up under the marker, a paper taped by it, two people.

const EQS = ['손실(θ) = Σ 번짐(x, θ) + λ·결(θ)', '∂손실/∂θ ≈ 결(θ) − 결(θ₀)', 'θ′ = θ − η · 결(θ)'];
function paintBoard(c: Ctx2, w: number, h: number, ls: number[], design: number, wipe: number) {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, w, h);
  c.save();
  // What's been wiped is gone from the right.
  c.beginPath();
  c.rect(0, 0, w * (0.66 - 0.66 * clamp01(wipe)) + 2, h);
  c.clip();
  EQ_LINES.forEach((L, i) => {
    const e = clamp01(ls[i]);
    if (e <= 0) return;
    c.save();
    c.beginPath();
    c.rect(L[0] * w, 0, (L[1] - L[0]) * w * e + 4, h);
    c.clip();
    text(c, EQS[i], L[0] * w + 2, (1 - L[2]) * h, 30, i === 2 ? RED : BLUE, 'left', false);
    c.restore();
  });
  const d = clamp01(design);
  if (d > 0) {
    c.save();
    c.beginPath();
    c.rect(0.16 * w, 0, 0.5 * w * d + 2, h);
    c.clip();
    c.strokeStyle = GREEN;
    c.lineWidth = 3;
    ['입력', '결 층×12', '압축', '출력'].forEach((s, i) => {
      const x = (0.18 + i * 0.125) * w;
      const y = (0.34 + (i % 2) * 0.08) * h;
      c.strokeRect(x, y, 0.1 * w, 0.2 * h);
      text(c, s, x + 0.05 * w, y + 0.1 * h, 20, GREEN, 'center', false);
      if (i < 3) {
        c.beginPath();
        c.moveTo(x + 0.1 * w, y + 0.1 * h);
        c.lineTo(x + 0.125 * w, y + 0.1 * h);
        c.stroke();
      }
    });
    c.restore();
  }
  c.restore();
}
function paperBoard(g: THREE.Group, out: Built) {
  const zB = PB.board;
  part(g, box(2.9, 1.34, 0.05), '#eef1f2', -0.0, 1.44, zB - 0.03);
  part(g, box(2.94, 0.04, 0.09), GREY, 0, 0.76, zB - 0.01, { outline: false });
  for (const sx of [-1.36, 1.36]) part(g, box(0.05, 2.06, 0.05), GREY_D, sx, 1.03, zB - 0.05, { outline: false });
  // The tray along the bottom, the pens that stay.
  part(g, box(1.3, 0.03, 0.14), GREY, 0.2, PB.tray[1] - 0.03, zB + 0.08, { outline: false });
  part(g, cyl(0.01, 0.01, 0.12, 8), BLUE, 0.62, PB.tray[1] - 0.003, zB + 0.1, { rz: Math.PI / 2, outline: false });
  part(g, cyl(0.01, 0.01, 0.12, 8), GREEN, 0.74, PB.tray[1] - 0.003, zB + 0.1, { rz: Math.PI / 2, outline: false });
  const W = PB.x1 - PB.x0;
  const H = PB.y1 - PB.y0;
  const mid = onBoard(0.5, 0.5);
  const board = liveScreen(g, W, H, 960, 464, mid[0], mid[1], zB + 0.002);
  // What's always on it: the left column, a title, what's being argued about.
  label(g, '금주 논문: 결 정규화', 0.56, 0.08, PB.x0 + 0.32, 1.86, zB + 0.004, NAVY, '#ffffff');
  picture(g, painted('arBoardNotes', 200, 300, (c) => {
    c.fillStyle = '#fff9c4';
    c.fillRect(0, 0, 200, 300);
    text(c, '궁금한 점', 100, 26, 24, BLACK, 'center');
    ['왜 8결이지?', '데이터 부족?', '과적합 아닌가', '다음 주 재현!'].forEach((s, i) => text(c, s, 12, 80 + i * 52, 22, GREY_D, 'left', false));
  }), 0.3, 0.45, PB.x0 + 0.2, 1.42, zB + 0.004);
  // A printed paper taped up, invented.
  picture(g, painted('arBoardPaper', 256, 360, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 256, 360);
    text(c, '결 정규화에 대하여', 128, 28, 22, BLACK, 'center');
    text(c, `${LAB} 연구진`, 128, 54, 15, GREY_D, 'center', false);
    c.fillStyle = '#b0bec5';
    for (let i = 0; i < 16; i++) c.fillRect(18, 82 + i * 16, 220 - (i % 5) * 12, 6);
    c.fillStyle = '#cfd8dc';
    c.fillRect(18, 262 + 20, 220, 60);
  }), 0.36, 0.5, PB.paper[0], PB.paper[1], PB.paper[2]);
  for (const sx of [-1, 1]) part(g, box(0.07, 0.022, 0.004), '#fff176', PB.paper[0] + sx * 0.13, PB.paper[1] + 0.25, PB.paper[2] + 0.004, { outline: false });
  const A = person(g, '#c5cae9', '#37474f', '#1a1a1a', -1.22, 0.42, Math.PI - 0.6, 'male');
  const B = person(g, '#b2dfdb', '#455a64', '#5b3a1e', 1.24, 0.42, Math.PI + 0.55, 'female');
  A.root.visible = B.root.visible = true;
  const mk = group(g);
  mk.name = 'arMarker';
  part(mk, cyl(0.011, 0.011, 0.13, 10), BLUE, 0, 0, 0, { rx: Math.PI / 2, outline: false });
  part(mk, cyl(0.011, 0.005, 0.02, 10), BLUE, 0, 0, -0.075, { rx: Math.PI / 2, outline: false });
  part(mk, cyl(0.004, 0.002, 0.024, 6), BLACK, 0, 0, -0.098, { rx: Math.PI / 2, outline: false });
  const er = eraserTool(g);
  const tools: Partial<Record<ArTool, HeldTool>> = {
    marker: { tool: mk, lead: 'right', grips: penGrip(v3(0, 0, -1)) },
    eraser: { tool: er, lead: 'right', grips: { right: { at: v3(0, 0, -0.012), axis: v3(0, 1, 0), shape: 'power', radius: 0.016 } } },
  };
  const spots: Record<string, Spot> = { arDiscuss: standAt(g, 'arDiscuss', 0.8, PB.stand + 0.1), aiResearcher_newModel: standAt(g, 'arDesign', -0.3, PB.stand + 0.42) };
  const homeM: V = [PB.tray[0], PB.tray[1] + 0.02, PB.tray[2] + 0.09];
  const homeE: V = [PB.tray[0] - 0.3, PB.tray[1] + 0.05, PB.tray[2] + 0.09];
  const nodV = new THREE.Vector3();
  const show = (_now: string | null, N: ArNow | null, t: number) => {
    const n = N?.n ?? {};
    at(mk, N?.props.marker ?? null, homeM);
    at(er, N?.props.eraser ?? null, homeE);
    const says = (n.says ?? 0) > 0.5;
    const nods = (n.nods ?? 0) > 0.5;
    for (const [i, F] of [A, B].entries()) {
      nodHead(F, nods ? 0.14 + 0.16 * Math.sin(t * 6 + i) : 0.05);
      nodV.set(i === 0 ? -0.9 : 0.9, 1.5 + 0.05 * Math.sin(t * 4), 0.05);
      F.armR(i === 0 && says ? nodV : null);
      F.armL(i === 1 && says ? nodV : null);
    }
    // Left alone, the last argument stays up.
    const ls = N ? [clamp01(n.l1), clamp01(n.l2), clamp01(n.l3)] : [1, 1, 0];
    const d = clamp01(n.design);
    const wipe = clamp01(n.wipe);
    board.draw(`${ls.map((x) => q(x, 24)).join(',')}|${q(d, 24)}|${q(wipe, 24)}`, (c) => paintBoard(c, 960, 464, ls, d, wipe));
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, mid[0], 1.3, zB);
}

// =============================================================================================
// 소형 GPU 랙 (arGpuRack, 2 × 1): two short racks; cards with spinning fans behind a glass door, a panel, a spare-card shelf.

function gpuCardMesh(g: THREE.Object3D, color = '#263238'): { root: THREE.Group; fans: THREE.Group[]; led: THREE.Mesh } {
  const root = group(g);
  part(root, box(0.36, 0.05, 0.26), color, 0, 0, 0);
  part(root, box(0.34, 0.012, 0.24), '#37474f', 0, 0.03, 0, { outline: false });
  const fans = [-0.09, 0.09].map((x) => {
    const f = group(root, x, 0.038, 0.01);
    for (let i = 0; i < 3; i++) part(f, box(0.03, 0.004, 0.1), '#90a4ae', 0, 0, 0, { ry: (i / 3) * Math.PI, outline: false });
    return f;
  });
  const led = ownLit(root, box(0.04, 0.01, 0.006), MINT, 0.14, 0, 0.133);
  return { root, fans, led };
}
function gpuRack(g: THREE.Group, out: Built) {
  const Top = 1.72;
  const shell = (x: number) => {
    part(g, box(0.9, Top, 0.04), GRAPHITE, x, Top / 2, -0.38);
    for (const sx of [-1, 1]) part(g, box(0.04, Top, 0.74), GRAPHITE, x + sx * 0.43, Top / 2, -0.03);
    part(g, box(0.9, 0.05, 0.76), GRAPHITE, x, Top - 0.025, -0.03);
    part(g, box(0.9, 0.08, 0.76), BLACK, x, 0.04, -0.03);
  };
  shell(GR.left);
  shell(GR.right);
  label(g, `${LAB} 학습 서버 A`, 0.5, 0.07, GR.left, Top - 0.09, 0.36, NAVY, '#ffffff');
  // Six cards in the left rack, fans turning. The fourth up is the one changed.
  const cards: Array<ReturnType<typeof gpuCardMesh>> = [];
  for (let i = 0; i < 6; i++) {
    const c = gpuCardMesh(g);
    c.root.position.set(GR.left, 0.42 + i * 0.2, 0.08);
    c.root.scale.set(2.05, 1.1, 1.2);
    cards.push(c);
    part(g, box(0.82, 0.012, 0.6), GREY_D, GR.left, 0.36 + i * 0.2, -0.04, { outline: false });
  }
  // The glass door on its hinge.
  const door = group(g, GR.left - 0.43, 0, GR.door);
  haze(door, new THREE.PlaneGeometry(0.84, Top - 0.2), '#a7d8f0', 0.2, 0.43, Top / 2 + 0.02, 0);
  part(door, box(0.04, Top - 0.14, 0.03), STEEL, 0.02, Top / 2 + 0.02, 0, { outline: false });
  part(door, box(0.04, Top - 0.14, 0.03), STEEL, 0.84, Top / 2 + 0.02, 0, { outline: false });
  part(door, box(0.84, 0.03, 0.03), STEEL, 0.43, Top - 0.1, 0, { outline: false });
  part(door, box(0.84, 0.03, 0.03), STEEL, 0.43, 0.12, 0, { outline: false });
  part(door, box(0.02, 0.26, 0.04), GREY_D, 0.76, 1.1, 0.03, { outline: false });
  // The right rack: fan wall above, panel, keys, shelf.
  const bigFans: THREE.Group[] = [];
  for (let i = 0; i < 2; i++) {
    const x = GR.right + (i === 0 ? -0.2 : 0.2);
    part(g, cyl(0.1, 0.1, 0.02, 20), BLACK, x, 1.59, 0.34, { rx: Math.PI / 2, outline: false });
    const f = group(g, x, 1.59, 0.356);
    for (let j = 0; j < 5; j++) part(f, box(0.03, 0.18, 0.004), GREY, 0, 0, 0, { rz: (j / 5) * Math.PI, outline: false });
    bigFans.push(f);
  }
  const panel = liveScreen(g, 0.6, 0.3, 280, 140, GR.panel[0], GR.panel[1] - 0.02, GR.panel[2] - 0.02);
  part(g, box(0.64, 0.34, 0.04), BLACK, GR.panel[0], GR.panel[1] - 0.02, GR.panel[2] - 0.05, { outline: false });
  part(g, box(0.5, 0.03, 0.2), GRAPHITE, GR.keys[0], GR.keys[1] - 0.04, GR.keys[2] - 0.08);
  keyboard(g, [GR.keys[0], GR.keys[1], GR.keys[2] - 0.06], 0.3, 0.12);
  // The shelf with its spare, the card being worked on sits on it.
  part(g, box(0.72, 0.03, 0.34), STEEL, GR.shelf[0], GR.shelf[1] - 0.015, GR.shelf[2] - 0.16);
  const spare = gpuCardMesh(g, '#1b5e20');
  spare.root.position.set(GR.shelf[0] + 0.18, GR.shelf[1] + 0.03, GR.shelf[2] - 0.2);
  spare.root.scale.setScalar(0.72);
  part(g, box(0.2, 0.06, 0.02), GREY, GR.hook[0], GR.hook[1] + 0.05, GR.hook[2] - 0.08, { outline: false });
  // A warm shimmer above, a warm strip inside.
  const heat = [0, 1].map((i) => haze(g, new THREE.PlaneGeometry(0.7, 0.34), '#ffccbc', 0, GR.left + (i ? 0.92 : 0), Top + 0.2, 0));
  const strip = ownLit(g, box(0.78, 0.016, 0.01), '#ff8a65', GR.left, 0.3, 0.32);
  const moved = gpuCardMesh(g);
  moved.root.scale.setScalar(1);
  const th = thermoTool(g);
  const tools: Partial<Record<ArTool, HeldTool>> = { thermo: { tool: th.root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0).applyAxisAngle(v3(1, 0, 0), 0.25), shape: 'trigger', radius: 0.018 } } } };
  const spots: Record<string, Spot> = { arGpuCheck: standAt(g, 'arGpuCheck', GR.right, GR.stand), arGpuSwap: standAt(g, 'arGpuSwap', GR.left, GR.stand) };
  const show = (now: string | null, N: ArNow | null, t: number) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    at(th.root, P.thermo ?? null, GR.hook);
    const beam = (n.beam ?? 0) > 0.5;
    th.beam.visible = beam;
    door.rotation.y = -1.25 * clamp01(n.door);
    const gone = clamp01(n.gone) > 0.5;
    const swapping = now === 'arGpuSwap';
    const fresh = clamp01(n.fresh) > 0.5;
    const booted = clamp01(n.booted);
    const warm = clamp01(n.temp);
    cards.forEach((c, i) => {
      c.root.visible = !(i === 3 && gone);
      const down = swapping && i === 3 && booted < 0.5;
      setLit(c.led, down ? '#ff5252' : Math.sin(t * (3 + i * 1.3) + i) > -0.6 ? MINT : '#1b5e20');
      for (const f of c.fans) f.rotation.y = down ? 0 : t * (14 + i * 2);
    });
    for (const f of bigFans) f.rotation.z = t * (9 + 10 * warm);
    at(moved.root, P.card ?? null, null);
    for (const f of moved.fans) f.rotation.y = 0;
    setLit(moved.led, fresh ? MINT : '#ff5252');
    spare.root.visible = !(swapping && fresh);
    heat.forEach((m, i) => {
      fade(m, 0.05 + 0.13 * warm + 0.025 * Math.sin(t * 3 + i * 2));
      m.position.y = Top + 0.2 + 0.03 * Math.sin(t * 1.7 + i);
    });
    setLit(strip, warm > 0.5 ? '#ff7043' : warm > 0.1 ? '#ffab91' : '#ffccbc');
    const temp = Math.round(61 + 11 * warm);
    const load = N ? clamp01(n.load) : 0.62;
    th.lcd.draw(`${q(n.read, 2)}|${temp}`, (c) => {
      c.fillStyle = '#c5e1a5';
      c.fillRect(0, 0, 64, 48);
      text(c, (n.read ?? 0) > 0.3 ? `${temp + ((n.read ?? 0) > 0.8 ? 4 : 0)}°` : '--', 32, 24, 26, BLACK, 'center');
    });
    panel.draw(`${q(load, 20)}|${temp}|${q(booted, 2)}|${swapping ? 1 : 0}|${gone ? 1 : 0}|${Math.floor(t * 2) % 2}`, (c) => {
      const w = 280;
      const h = 140;
      c.fillStyle = INK;
      c.fillRect(0, 0, w, h);
      text(c, `GPU 사용률 ${Math.round(load * 100)}%`, 8, 14, 15, MINT);
      text(c, `${temp}°C`, w - 8, 14, 16, temp > 68 ? '#ff8a80' : AMBER_L, 'right');
      for (let i = 0; i < 6; i++) {
        const off = swapping && i === 3 && booted < 0.5;
        const u = off ? 0 : THREE.MathUtils.clamp(load + 0.12 * Math.sin(i * 2.1), 0, 1);
        c.fillStyle = '#26303b';
        c.fillRect(10 + i * 44, 34, 34, 70);
        c.fillStyle = off ? '#ff5252' : u > 0.85 ? '#ffb74d' : MINT;
        c.fillRect(10 + i * 44, 104 - 70 * Math.max(u, off ? 0.06 : 0), 34, 70 * Math.max(u, off ? 0.06 : 0));
        text(c, `${i}`, 27 + i * 44, 116, 11, '#9fb3c8', 'center', false);
      }
      text(c, `대기 작업 ${load > 0.8 ? 1 : 3}건`, 8, 130, 13, '#c9d6e3', 'left', false);
    });
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, GR.panel[0], 1.2, GR.panel[2]);
}

// =============================================================================================
// 시연 화면 (arDemoScreen, 3 × 1): the big screen on a stand, a lectern with keys and a red stop button, a beacon, two colleagues.

function paintDemo(c: Ctx2, w: number, h: number, round: number, n: Record<string, number>, live: boolean) {
  const crash = (n.crash ?? 0) > 0.5;
  const fixMode = (n.fixMode ?? 0) > 0.5;
  c.fillStyle = '#f2f4fa';
  c.fillRect(0, 0, w, h);
  c.fillStyle = crash && (n.calm ?? 0) < 0.5 ? '#b71c1c' : NAVY;
  c.fillRect(0, 0, w, 44);
  text(c, `${BOT} · ${MODELS[3]} ${crash ? '서비스 현황' : fixMode ? '오답 고치기' : '시연'}`, 16, 22, 24, '#ffffff');
  const qa = QA[wrap(round, QA.length)];
  const bubble = (x: number, y: number, bw: number, s: string, bg: string, fg: string) => {
    c.fillStyle = bg;
    c.fillRect(x, y, bw, 52);
    text(c, s, x + 14, y + 26, 22, fg, 'left', false);
  };
  const chatX = crash || fixMode ? w * 0.46 : 26;
  const chatW = crash || fixMode ? w * 0.5 : w - 52;
  // The assistant's face, small and made up.
  const face = (x: number, y: number, r: number, sad: boolean) => {
    c.fillStyle = INDIGO;
    c.beginPath();
    c.arc(x, y, pos(r), 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ffffff';
    for (const sx of [-1, 1]) {
      c.beginPath();
      c.arc(x + sx * r * 0.36, y - r * 0.15, pos(r * 0.14), 0, Math.PI * 2);
      c.fill();
    }
    c.strokeStyle = '#ffffff';
    c.lineWidth = 3;
    c.beginPath();
    if (sad) c.arc(x, y + r * 0.55, pos(r * 0.3), Math.PI + 0.3, -0.3);
    else c.arc(x, y + r * 0.2, pos(r * 0.3), 0.3, Math.PI - 0.3);
    c.stroke();
  };
  const qp = clamp01(n.q);
  const ap = clamp01(n.a);
  const fixedNow = clamp01(n.fixed) > 0.5 || (n.good ?? 0) > 0.3;
  let question = qa.q;
  let answer = qa.a;
  let wrongShown = qa.wrong && (n.wrongNow ?? 0) > 0.5;
  if (crash || fixMode) {
    question = crash ? '고양이는 무슨 동물이야?' : qa.wrong ? qa.q : QA[1].q;
    const src = crash ? QA[3] : qa.wrong ? qa : QA[1];
    answer = fixedNow ? src.fixed : src.a;
    wrongShown = !fixedNow && ap > 0.5;
  }
  if (qp > 0.02) bubble(chatX + chatW * 0.3, 60, chatW * 0.7, typed(question, qp), '#c5cae9', BLACK);
  if (ap > 0.02) {
    face(chatX + 24, 148, 22, wrongShown);
    bubble(chatX + 54, 122, chatW - 54, typed(answer, ap), wrongShown ? '#ffcdd2' : '#ffffff', BLACK);
  }
  if (!live) {
    face(w / 2, 150, 44, false);
    text(c, `안녕하세요, ${BOT}예요`, w / 2, 222, 26, NAVY, 'center');
  }
  if (wrongShown) text(c, '✗ 오답', chatX + chatW - 8, 196, 26, RED, 'right');
  if ((crash || fixMode) && fixedNow && ap > 0.6) text(c, '✓ 고침', chatX + chatW - 8, 196, 26, GREEN, 'right');
  // The left column: reports climbing, or the log.
  if (crash || fixMode) {
    const rep = crash ? Math.round(12 + 340 * clamp01(n.reports)) : Math.round(40 * clamp01(n.logs));
    const calm = clamp01(n.calm);
    c.fillStyle = '#ffffff';
    c.fillRect(16, 58, w * 0.42, h - 72);
    text(c, crash ? '오답 신고' : '오답 기록', 30, 80, 22, GREY_D);
    text(c, crash ? `${rep}건` : `${rep}건`, 30, 124, 42, calm > 0.5 ? GREEN : RED);
    if (crash) {
      const stopped = clamp01(n.stopped) > 0.5;
      text(c, stopped ? '이전 모델로 되돌림 ✓' : '답변 품질 경보!', 30, 166, 20, stopped ? GREEN : RED);
    } else {
      const rate = clamp01(n.rate);
      text(c, `정답률 ${(86 + 9 * rate).toFixed(1)}%`, 30, 166, 22, rate > 0.5 ? GREEN : AMBER);
    }
    // Lines of the log.
    for (let i = 0; i < 4; i++) {
      c.fillStyle = i % 2 ? '#eceff1' : '#ffebee';
      c.fillRect(30, 188 + i * 22, w * 0.42 - 30, 18);
      text(c, `사용자 ${(i * 37 + 12) % 90}: ${['채소?!', '틀렸어요', '이상해요', '다시요'][i]}`, 36, 197 + i * 22, 13, GREY_D, 'left', false);
    }
  }
}
function demoScreen(g: THREE.Group, out: Built) {
  const S = DM.screen;
  part(g, box(DM.w + 0.1, DM.h + 0.1, 0.06), BLACK, S[0], S[1], S[2] - 0.04);
  for (const sx of [-1, 1]) {
    part(g, box(0.06, 0.9, 0.06), GREY_D, S[0] + sx * 0.7, 0.45, S[2] - 0.06, { outline: false });
    part(g, box(0.1, 0.03, 0.46), GREY_D, S[0] + sx * 0.7, 0.015, S[2] - 0.06, { outline: false });
  }
  const screen = liveScreen(g, DM.w, DM.h, 720, 382, S[0], S[1], S[2] - 0.005);
  label(g, `${LAB} 시연실`, 0.44, 0.07, S[0], S[1] - DM.h / 2 - 0.12, S[2] + 0.002, NAVY, '#ffffff');
  // The lectern: keys on a slope, the red button, a laptop's small mirror of it.
  const L = DM.lectern;
  part(g, rbox(0.56, L[1] - 0.05, 0.42, 0.02), '#cfd8dc', L[0], (L[1] - 0.05) / 2, L[2] - 0.02);
  part(g, box(0.6, 0.03, 0.44), GRAPHITE, L[0], L[1] - 0.03, L[2] - 0.02);
  label(g, '솔결-3', 0.28, 0.09, L[0], 0.62, L[2] + 0.195, NAVY, '#ffffff');
  keyboard(g, [L[0] - 0.04, L[1] - 0.003, L[2] + 0.02], 0.34, 0.14);
  const btn = ownLit(g, cyl(0.04, 0.045, 0.025, 16), '#a12d2d', DM.button[0], DM.button[1] - 0.012, DM.button[2]);
  const beacon = ownLit(g, cyl(0.04, 0.045, 0.08, 14), '#5a1a1a', L[0] + 0.2, L[1] + 0.04, L[2] - 0.17);
  // Two who've come to watch.
  const A = person(g, '#d1c4e9', '#37474f', '#1a1a1a', -1.32, 0.38, -0.5 + Math.PI, 'male');
  const B = person(g, '#ffe0b2', '#455a64', '#4e342e', -0.86, 0.62, Math.PI - 0.15, 'female');
  A.root.visible = B.root.visible = false;
  const ck = clickerTool(g);
  const tools: Partial<Record<ArTool, HeldTool>> = { clicker: { tool: ck, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.014 } } } };
  const spots: Record<string, Spot> = {
    arDemo: standAt(g, 'arDemo', DM.beside[0], DM.beside[1]),
    arAskTest: standAt(g, 'arAskTest', L[0], DM.stand),
    arWrongAlarm: standAt(g, 'arWrongAlarm', 0.2, DM.stand + 0.2),
    aiResearcher_fixAnswers: standAt(g, 'arFix', L[0], DM.stand),
  };
  const home: V = [L[0] + 0.14, L[1] + 0.03, L[2] + 0.06];
  const show = (now: string | null, N: ArNow | null, t: number) => {
    const n = N?.n ?? {};
    at(ck, N?.props.clicker ?? null, home);
    const crash = (n.crash ?? 0) > 0.5;
    setLit(beacon, crash && (n.beacon ?? 0) > 0.5 && Math.sin(t * 9) > 0 ? '#ff3b30' : '#5a1a1a');
    const stopped = clamp01(n.stopped);
    setLit(btn, stopped > 0.5 ? '#ff5252' : '#a12d2d');
    btn.position.y = DM.button[1] - 0.012 - 0.008 * stopped;
    // The audience only comes for a demo.
    const watching = now === 'arDemo';
    A.root.visible = B.root.visible = watching;
    if (watching) {
      for (const [i, F] of [A, B].entries()) {
        nodHead(F, (n.laugh ?? 0) > 0.5 ? 0.12 + 0.12 * Math.sin(t * 9 + i) : (n.clap ?? 0) > 0.5 ? 0.14 * Math.sin(t * 5 + i) + 0.08 : -0.02);
        tmp.set(F.root.position.x + (i ? -0.08 : 0.08), 1.16 + ((n.clap ?? 0) > 0.5 ? 0.03 * Math.sin(t * 16) : 0), F.root.position.z - 0.2);
        F.armR((n.clap ?? 0) > 0.5 ? tmp : null);
        F.armL((n.clap ?? 0) > 0.5 ? tmp : null);
      }
    }
    const round = N?.b.n ?? 0;
    const key = `${wrap(round, QA.length)}|${q(n.q, 24)}|${q(n.a, 24)}|${q(n.wrongNow, 2)}|${crash ? 1 : 0}|${q(n.reports, 30)}|${q(n.stopped, 2)}|${q(n.fixed, 2)}|${q(n.calm, 2)}|${q(n.logs, 16)}|${q(n.rate, 20)}|${q(n.good, 2)}|${q(n.fixMode, 2)}|${N ? 1 : 0}`;
    screen.draw(key, (c) => paintDemo(c, 720, 382, round, n, !!N));
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, L[0], L[1], L[2]);
}

// =============================================================================================
// 평가 결과 벽 (arEvalWall, 3 × 1): a table of models and scores, bars, today's card, a shelf of printed results, the review's stamp.

const SCORES = [71.2, 78.4, 74.9, 83.6];
const NEW_SCORE = 88.1;
function evalWall(g: THREE.Group, out: Built) {
  const zW = EW.wall;
  part(g, box(2.9, 1.5, 0.05), '#dfe6ea', 0, 1.34, zW - 0.03);
  for (const sx of [-1.4, 1.4]) part(g, box(0.05, 2.1, 0.05), GREY_D, sx, 1.05, zW - 0.05, { outline: false });
  label(g, `${LAB} · 모델 평가 결과`, 1.1, 0.1, -0.2, 2.0, zW + 0.002, NAVY, '#ffffff');
  const table = liveScreen(g, 1.1, 0.86, 440, 344, EW.table, EW.y, zW + 0.002);
  const bars = liveScreen(g, 1.0, 0.86, 400, 344, EW.bars, EW.y, zW + 0.002);
  // Today's card goes in the slot; a shelf of them under the bars.
  part(g, box(0.34, 0.44, 0.012), '#b0bec5', EW.slot[0], EW.slot[1] - 0.02, zW + 0.002, { outline: false });
  part(g, box(1.5, 0.03, 0.2), GREY, EW.shelf[0], EW.shelf[1] - 0.03, EW.shelf[2], { outline: false });
  part(g, box(0.28, 0.03, 0.2), PAPER, EW.shelf[0] + 0.3, EW.shelf[1], EW.shelf[2], { outline: false });
  const cardTex = painted('arEvalCard', 128, 160, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 128, 160);
    c.fillStyle = TEAL;
    c.fillRect(0, 0, 128, 34);
    text(c, '오늘 결과', 64, 17, 18, '#ffffff', 'center');
    text(c, '솔결-3.1', 64, 62, 18, BLACK, 'center');
    text(c, `${NEW_SCORE}`, 64, 102, 30, TEAL, 'center');
    text(c, '정답률 %', 64, 136, 14, GREY_D, 'center', false);
  });
  const card = group(g);
  picture(card, cardTex, 0.28, 0.36, 0, 0, 0);
  // The review's decision: a stamp-sized magnet.
  part(g, box(0.28, 0.16, 0.03), GRAPHITE, EW.stamp[0], EW.stamp[1], zW + 0.008, { outline: false });
  const stampMark = ownLit(g, box(0.22, 0.1, 0.012), '#37474f', EW.stamp[0], EW.stamp[1], zW + 0.03);
  label(g, '채택', 0.18, 0.06, EW.stamp[0], EW.stamp[1] - 0.14, zW + 0.004, '#ffffff', RED);
  const clip = clipTool(g);
  const A = person(g, '#b3e5fc', '#37474f', '#1a1a1a', -1.16, 0.46, Math.PI - 0.5, 'female');
  const B = person(g, '#c8e6c9', '#455a64', '#3e2723', 1.3, 0.72, Math.PI + 0.3, 'male');
  const tools: Partial<Record<ArTool, HeldTool>> = { clip: { tool: clip.root, lead: 'left', grips: { left: boardGrip(0.55) } } };
  const spots: Record<string, Spot> = { arEval: standAt(g, 'arEval', EW.table, EW.stand), aiResearcher_leadReview: standAt(g, 'arEvalLead', -0.05, EW.stand + 0.14) };
  const homeClip: V = [EW.shelf[0] - 0.46, EW.shelf[1] + 0.02, EW.shelf[2] + 0.02];
  const onWall: V = [EW.slot[0], EW.slot[1], EW.slot[2] + 0.02];
  const show = (now: string | null, N: ArNow | null, t: number) => {
    const n = N?.n ?? {};
    at(clip.root, N?.props.clip ?? null, homeClip);
    clip.ticks.forEach((m, i) => (m.visible = (n.ticks ?? 0) > i + 0.5));
    at(card, N?.props.card ?? null, N ? (now === 'aiResearcher_leadReview' ? onWall : null) : onWall);
    const leading = now === 'aiResearcher_leadReview';
    A.root.visible = B.root.visible = leading;
    if (leading) {
      for (const [i, F] of [A, B].entries()) {
        nodHead(F, (n.nods ?? 0) > 0.5 ? 0.14 + 0.16 * Math.sin(t * 6 + i) : 0.05);
        tmp.set(i === 0 ? -0.9 : 1.0, 1.42 + 0.05 * Math.sin(t * 4), 0.15);
        F.armR(i === 0 && (n.says ?? 0) > 0.5 ? tmp : null);
        F.armL(null);
      }
    }
    const chosen = clamp01(n.chosen);
    setLit(stampMark, chosen > 0.5 ? '#ff5252' : '#37474f');
    const bar = N ? clamp01(n.bar) : 1;
    const row = N ? clamp01(n.row) : 0;
    const pinned = N ? clamp01(n.pinned) : 1;
    table.draw(`${q(row, 8)}|${q(pinned, 2)}|${q(chosen, 2)}`, (c) => {
      const w = 440;
      const h = 344;
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, w, h);
      c.fillStyle = NAVY;
      c.fillRect(0, 0, w, 40);
      text(c, '모델', 14, 20, 20, '#ffffff');
      text(c, '정답률', 210, 20, 20, '#ffffff');
      text(c, '속도', 340, 20, 20, '#ffffff');
      const list = MODELS.map((m, i) => [m, SCORES[i], 90 - i * 12] as const);
      list.forEach(([m, s, sp], i) => {
        const y = 40 + i * 50;
        c.fillStyle = i === Math.min(3, Math.floor(row * 4)) && row > 0.01 && row < 0.99 ? '#fff9c4' : i % 2 ? '#f4f6f7' : '#ffffff';
        c.fillRect(0, y, w, 50);
        text(c, m, 14, y + 25, 20, BLACK, 'left', false);
        text(c, `${s}%`, 210, y + 25, 20, BLACK, 'left', false);
        text(c, `${sp}자/초`, 340, y + 25, 18, GREY_D, 'left', false);
      });
      if (pinned > 0.5) {
        const y = 40 + 4 * 50;
        c.fillStyle = chosen > 0.5 ? '#c8e6c9' : '#e0f2f1';
        c.fillRect(0, y, w, 50);
        text(c, '솔결-3.1', 14, y + 25, 20, TEAL);
        text(c, `${NEW_SCORE}%`, 210, y + 25, 20, TEAL);
        text(c, '48자/초', 340, y + 25, 18, TEAL, 'left', false);
      }
      text(c, '평가 질문 5,000개 · 연구소 자체 시험', 14, h - 20, 15, GREY_D, 'left', false);
    });
    bars.draw(`${q(bar, 16)}`, (c) => {
      const w = 400;
      const h = 344;
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, w, h);
      text(c, '정답률 %', 12, 20, 18, GREY_D);
      const y0 = h - 44;
      const barH = (s: number) => ((s - 60) / 35) * (y0 - 44);
      SCORES.forEach((s, i) => {
        c.fillStyle = i === 3 ? INDIGO : '#90a4ae';
        c.fillRect(24 + i * 72, y0 - barH(s), 50, barH(s));
        text(c, MODELS[i].replace('솔결', ''), 49 + i * 72, y0 + 16, 14, GREY_D, 'center', false);
      });
      if (bar > 0.01) {
        c.fillStyle = TEAL;
        const H = barH(NEW_SCORE) * bar;
        c.fillRect(24 + 4 * 72, y0 - H, 50, H);
        text(c, '-3.1', 49 + 4 * 72, y0 + 16, 14, TEAL, 'center');
      }
      c.strokeStyle = BLACK;
      c.beginPath();
      c.moveTo(14, y0);
      c.lineTo(w - 10, y0);
      c.stroke();
    });
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, EW.table, 1.2, zW);
}

// =============================================================================================
// 논문 읽는 코너 (arReadingNook, 2 × 2): an armchair facing out, stacks on a side table, a lit lamp, a low shelf of binders.

function readingNook(g: THREE.Group, out: Built) {
  const S = RN.seat;
  // A rug under it.
  part(g, box(1.86, 0.012, 1.86), '#7e8fa3', 0, 0.006, 0, { outline: false });
  // The armchair: its back to the wall, faced out (+z).
  const BR = '#8d6e63';
  part(g, rbox(0.66, S[1] - 0.06, 0.62, 0.05), BR, S[0], (S[1] - 0.06) / 2 + 0.03, S[2] - 0.02);
  part(g, rbox(0.56, 0.08, 0.54, 0.03), shade(BR, 1.12), S[0], S[1] - 0.04, S[2] + 0.02);
  part(g, rbox(0.66, 0.68, 0.14, 0.05), BR, S[0], S[1] + 0.26, S[2] - 0.31);
  for (const sx of [-1, 1]) part(g, rbox(0.1, 0.22, 0.58, 0.04), shade(BR, 0.92), S[0] + sx * 0.33, S[1] + 0.06, S[2] - 0.02);
  // The side table and its stacks of print.
  const Tb = RN.table;
  part(g, cyl(0.24, 0.24, 0.025, 20), WOOD, Tb[0], Tb[1], Tb[2]);
  part(g, cyl(0.022, 0.03, Tb[1], 10), GREY_D, Tb[0], Tb[1] / 2, Tb[2], { outline: false });
  part(g, cyl(0.15, 0.17, 0.018, 16), GREY_D, Tb[0], 0.02, Tb[2], { outline: false });
  const R = seeded(23);
  for (let i = 0; i < 5; i++) part(g, box(0.2, 0.012, 0.28), i % 2 ? PAPER : '#f1ece0', Tb[0] + (R() - 0.5) * 0.02, Tb[1] + 0.02 + i * 0.012, Tb[2] + (R() - 0.5) * 0.02, { ry: (R() - 0.5) * 0.2, outline: false });
  part(g, box(0.03, 0.03, 0.002), '#ef5350', Tb[0] + 0.08, Tb[1] + 0.085, Tb[2] - 0.12, { outline: false });
  // The lamp at the outer corner, lit.
  const lx = 0.84;
  part(g, cyl(0.12, 0.13, 0.025, 16), GRAPHITE, lx, 0.02, -0.76, { outline: false });
  rod(g, v3(lx, 0.03, -0.76), v3(lx, 1.28, -0.76), 0.012, GRAPHITE);
  rod(g, v3(lx, 1.28, -0.76), v3(lx - 0.34, 1.42, -0.5), 0.01, GRAPHITE);
  part(g, cyl(0.07, 0.13, 0.13, 16), '#ffe0b2', lx - 0.34, 1.38, -0.5);
  ownLit(g, ball(0.05), '#fff3c4', lx - 0.34, 1.31, -0.5);
  haze(g, new THREE.ConeGeometry(0.42, 0.8, 16, 1, true), '#fff3c4', 0.08, lx - 0.34, 0.92, -0.5);
  // The low shelf behind: binders with invented years.
  part(g, box(1.0, 0.56, 0.2), WOOD, -0.26, 0.28, -0.88);
  const binders = ['#3949ab', '#00897b', '#c62828', '#6d4c41', '#546e7a', '#7b1fa2', '#ef6c00'];
  binders.forEach((col, i) => part(g, box(0.1, 0.42, 0.14), col, -0.66 + i * 0.13, 0.28, -0.8, { outline: false }));
  label(g, '읽을 논문', 0.26, 0.05, -0.26, 0.6, -0.775, PAPER, BLACK);
  // The paper in the hands: its printed side to the reader, tipped back.
  const paperTool = group(g);
  paperTool.name = 'arPaper';
  const tilt = group(paperTool);
  tilt.rotation.x = 0.6;
  part(tilt, box(0.21, 0.29, 0.004), PAPER, 0, 0, 0, { outline: false });
  const pageTex = (key: string, title: boolean) =>
    painted(key, 128, 180, (c) => {
      c.fillStyle = PAPER;
      c.fillRect(0, 0, 128, 180);
      if (title) text(c, '결 정규화', 64, 16, 15, BLACK, 'center');
      c.fillStyle = '#90a4ae';
      for (let i = 0; i < 13; i++) c.fillRect(10, (title ? 34 : 12) + i * 11, 108 - (i % 4) * 8, 4);
    });
  const pageA = picture(tilt, pageTex('arPageA', true), 0.2, 0.28, 0, 0, -0.0035, '#ffffff', Math.PI);
  const pageB = picture(tilt, pageTex('arPageB', false), 0.2, 0.28, 0, 0, -0.0035, '#ffffff', Math.PI);
  const marks = haze(tilt, new THREE.PlaneGeometry(0.15, 0.016), '#fff176', 0, 0, 0.03, -0.0045);
  const hi = penShaped(g, 'arHighlighter', v3(0.2, -1, 0.15), 0.09, 0.05, 0.01, '#fff176', '#fbc02d');
  const paperGrips: HeldTool['grips'] = {
    left: { at: v3(0.098, -0.05, -0.032), axis: v3(0, 0.83, 0.56), palm: v3(-1, 0, 0), shape: 'pinch', radius: 0.006 },
    right: { at: v3(-0.098, -0.05, -0.032), axis: v3(0, 0.83, 0.56), palm: v3(1, 0, 0), shape: 'pinch', radius: 0.006 },
  };
  const tools: Partial<Record<ArTool, HeldTool>> = {
    paper: { tool: paperTool, lead: 'left', grips: paperGrips },
    highlighter: { tool: hi, lead: 'right', grips: penGrip(v3(0.2, -1, 0.15), 0.012, 0.09) },
  };
  const spots: Record<string, Spot> = { arRead: seatAt(g, 'arRead', S, 0) };
  const homeHi: V = [Tb[0] - 0.12, Tb[1] + 0.03, Tb[2] + 0.14];
  const show = (_now: string | null, N: ArNow | null) => {
    const n = N?.n ?? {};
    const seen = (n.seen ?? 0) > 0.5;
    at(paperTool, seen ? N?.props.paper : null, null);
    at(hi, N?.props.hi ?? null, homeHi);
    const flipped = clamp01(n.page) > 0.5;
    pageA.visible = !flipped;
    pageB.visible = flipped;
    fade(marks, 0.7 * clamp01(n.marked));
    marks.scale.x = Math.max(0.05, clamp01(n.marked));
  };
  show(null, null);
  drive(g, out, spots, tools, show);
  out.work = marker(g, RN.hold[0], RN.hold[1], RN.hold[2]);
}

// =============================================================================================
// 포스터 세션 보드 (arPosterBoard, 2 × 1): a felt board, the talk's poster, the new one, a visitor with a badge.

const posterPaint = (key: string, title: string, accent: string) =>
  painted(key, 256, 340, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 256, 340);
    c.fillStyle = accent;
    c.fillRect(0, 0, 256, 50);
    text(c, title, 128, 25, 20, '#ffffff', 'center');
    text(c, `${LAB} 연구 발표회`, 128, 64, 12, GREY_D, 'center', false);
    // Three sections: the question, the curve, the numbers.
    c.fillStyle = '#eceff1';
    c.fillRect(12, 78, 110, 92);
    c.fillStyle = '#90a4ae';
    for (let i = 0; i < 6; i++) c.fillRect(18, 86 + i * 13, 96 - (i % 3) * 14, 5);
    c.strokeStyle = accent;
    c.lineWidth = 3;
    c.strokeRect(134, 78, 110, 92);
    c.beginPath();
    c.moveTo(138, 88);
    c.bezierCurveTo(160, 150, 190, 160, 240, 162);
    c.stroke();
    c.fillStyle = '#eceff1';
    c.fillRect(12, 182, 232, 96);
    for (let i = 0; i < 4; i++) {
      c.fillStyle = i === 3 ? accent : '#90a4ae';
      const hh = 26 + i * 14;
      c.fillRect(32 + i * 50, 268 - hh, 34, hh);
    }
    text(c, '결론: 데이터를 더 모으자', 128, 310, 15, BLACK, 'center');
  });
function posterBoard(g: THREE.Group, out: Built) {
  const zB = PS.board;
  part(g, box(1.94, 1.26, 0.04), '#5d7a8c', 0, 1.34, zB - 0.02);
  part(g, box(1.98, 0.03, 0.06), GREY_D, 0, 1.98, zB - 0.02, { outline: false });
  part(g, box(1.98, 0.03, 0.06), GREY_D, 0, 0.7, zB - 0.02, { outline: false });
  for (const sx of [-0.92, 0.92]) {
    part(g, box(0.04, 1.98, 0.04), GREY_D, sx, 0.99, zB - 0.02, { outline: false });
    part(g, box(0.06, 0.03, 0.56), GREY_D, sx, 0.015, zB - 0.02, { outline: false });
  }
  picture(g, posterPaint('arPosterA', '결 정규화의 효과', INDIGO), 0.8, 1.06, -0.46, 1.34, zB + 0.002);
  for (const [sx, sy] of [[-0.82, 1.84], [-0.1, 1.84], [-0.82, 0.84], [-0.1, 0.84]]) part(g, ball(0.012), RED, sx, sy, zB + 0.006, { outline: false });
  // The section lit up as it's pointed at.
  const hiA = POINTS.map((P) => haze(g, new THREE.PlaneGeometry(0.4, 0.3), '#fff176', 0, P[0], P[1], zB + 0.004));
  // The new poster and its two pins.
  const fresh = group(g);
  picture(fresh, posterPaint('arPosterB', '라벨 품질과 오답률', TEAL), 0.8, 1.06, 0, 0, 0);
  const pins = [-1, 1].map((sx) => part(fresh, ball(0.012), RED, sx * 0.36, 0.48, 0.006, { outline: false }));
  // A tube and a tray with the pointer.
  part(g, cyl(0.04, 0.04, 0.76, 12), '#a1887f', 0.8, 0.38, -0.05, { rx: 0.05 });
  part(g, box(0.34, 0.02, 0.1), GREY, PS.tray[0], PS.tray[1] - 0.012, PS.tray[2], { outline: false });
  const dirV = v3(PS.dir[0], PS.dir[1], PS.dir[2]);
  const ptr = penShaped(g, 'arPointer', dirV, PS.reach, 0.06, 0.008, GREY_D, RED);
  const visitor = person(g, '#ffccbc', '#37474f', '#3e2723', 0.1, 0.72, Math.PI - 0.5, 'female');
  part(visitor.root, box(0.07, 0.1, 0.004), '#ffffff', 0.06, 1.14, 0.108, { outline: false });
  const tools: Partial<Record<ArTool, HeldTool>> = { pointer: { tool: ptr, lead: 'right', grips: penGrip(dirV, 0.012) } };
  const spots: Record<string, Spot> = { arPoster: standAt(g, 'arPoster', PS.x, PS.stand), arPin: standAt(g, 'arPin', PS.newAt[0], PS.stand - 0.08) };
  const final: V = PS.newAt;
  const nodV = new THREE.Vector3();
  const show = (now: string | null, N: ArNow | null, t: number) => {
    const n = N?.n ?? {};
    at(ptr, N?.props.pointer ?? null, [PS.tray[0], PS.tray[1] + 0.01, PS.tray[2]]);
    const which = Math.round(n.hi ?? 0);
    hiA.forEach((m, i) => fade(m, which === i + 1 ? 0.35 : 0));
    const pinning = now === 'arPin';
    const u = pinning ? clamp01(n.unroll) : 1;
    const up = pinning ? clamp01(n.up) : 1;
    fresh.visible = !pinning || u > 0.03;
    fresh.scale.set(1, Math.max(0.04, u), 1);
    if (pinning && N) fresh.position.set(final[0], 0.96 + (final[1] - 0.96) * up, final[2] + 0.22 * (1 - up));
    else fresh.position.set(final[0], final[1], final[2]);
    pins[0].visible = !pinning || (n.pinA ?? 0) > 0.5;
    pins[1].visible = !pinning || (n.pinB ?? 0) > 0.5;
    visitor.root.visible = now === 'arPoster';
    if (visitor.root.visible) {
      nodHead(visitor, (n.nods ?? 0) > 0.5 ? 0.12 + 0.12 * Math.sin(t * 5) : 0.02);
      nodV.set(-0.3, 1.5 + 0.03 * Math.sin(t * 4), 0.1);
      visitor.armR((n.asks ?? 0) > 0.5 ? nodV : null);
      visitor.armL(null);
    }
  };
  show(null, null, 0);
  drive(g, out, spots, tools, show);
  out.work = marker(g, -0.46, 1.3, zB);
}

// =============================================================================================
// Set dressing.

function printer(g: THREE.Group) {
  part(g, box(0.6, 0.62, 0.6), WHITE, 0, 0.31, 0);
  part(g, rbox(0.56, 0.2, 0.56, 0.03), PANEL, 0, 0.72, 0);
  part(g, box(0.4, 0.008, 0.26), PAPER, 0, 0.83, -0.02, { outline: false });
  part(g, box(0.34, 0.03, 0.22), PAPER, 0, 0.56, 0.29, { outline: false });
  part(g, box(0.14, 0.05, 0.01), BLACK, 0.16, 0.72, 0.285, { outline: false });
  ownLit(g, ball(0.01), MINT, 0.26, 0.72, 0.285);
  label(g, '논문 출력 전용', 0.3, 0.05, -0.1, 0.42, 0.303, NAVY, '#ffffff');
}
function paperCart(g: THREE.Group) {
  for (const y of [0.2, 0.55, 0.9]) part(g, box(0.72, 0.03, 0.46), STEEL, 0, y, 0, { outline: false });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    part(g, box(0.025, 0.96, 0.025), GREY, sx * 0.34, 0.5, sz * 0.21, { outline: false });
    part(g, ball(0.03), BLACK, sx * 0.34, 0.03, sz * 0.21, { outline: false });
  }
  const R = seeded(31);
  for (const y of [0.22, 0.57]) {
    let x = -0.3;
    while (x < 0.28) {
      const w = 0.04 + R() * 0.05;
      part(g, box(w, 0.22 + R() * 0.06, 0.28), ['#3949ab', '#00897b', '#c62828', '#6d4c41', '#546e7a'][Math.floor(R() * 5)], x + w / 2, y + 0.13, 0, { outline: false });
      x += w + 0.008;
    }
  }
  for (let i = 0; i < 5; i++) part(g, box(0.22, 0.012, 0.3), i % 2 ? PAPER : '#f1ece0', -0.12, 0.925 + i * 0.012, 0, { outline: false });
}
function modelMap(g: THREE.Group) {
  part(g, box(1.9, 1.1, 0.04), GRAPHITE, 0, 1.4, -0.34);
  for (const sx of [-0.88, 0.88]) part(g, box(0.05, 1.96, 0.05), GREY_D, sx, 0.98, -0.38, { outline: false });
  picture(g, painted('arModelMap', 512, 288, (c) => {
    c.fillStyle = '#1a237e';
    c.fillRect(0, 0, 512, 288);
    text(c, '솔결-3 구조도 (연구소 내부용)', 256, 26, 24, '#ffffff', 'center');
    const names = ['입력', '쪼개기', '결 층', '결 층', '압축', '답 만들기'];
    names.forEach((s, i) => {
      const x = 22 + i * 80;
      const y = 80 + (i % 2) * 46;
      c.fillStyle = i === 2 || i === 3 ? '#00bfa5' : '#5c6bc0';
      c.fillRect(x, y, 66, 70);
      text(c, s, x + 33, y + 35, 15, '#ffffff', 'center');
      if (i < names.length - 1) {
        c.strokeStyle = '#c5cae9';
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(x + 66, y + 35);
        c.lineTo(x + 80, 80 + ((i + 1) % 2) * 46 + 35);
        c.stroke();
      }
    });
    text(c, '층 12 · 결 8 · 매개변수 (대외비)', 256, 250, 20, AMBER_L, 'center', false);
  }), 1.78, 1.0, 0, 1.4, -0.316);
}
function labSign(g: THREE.Group) {
  part(g, cyl(0.2, 0.22, 0.03, 18), GREY_D, 0, 0.015, 0, { outline: false });
  part(g, cyl(0.022, 0.022, 1.25, 10), GREY, 0, 0.64, 0, { outline: false });
  part(g, box(0.62, 0.84, 0.03), NAVY, 0, 1.55, 0);
  picture(g, painted('arLabSign', 192, 256, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 192, 256);
    c.fillStyle = NAVY;
    c.fillRect(0, 0, 192, 60);
    text(c, LAB, 96, 22, 26, '#ffffff', 'center');
    text(c, '인공지능 연구소', 96, 46, 15, AMBER_L, 'center');
    ['연구실 ← 왼쪽 문', '시연실 ↑ 오른쪽 문', 'GPU 실 → 오른쪽 복도', '방문증을 패용해 주세요'].forEach((s, i) => text(c, s, 12, 88 + i * 40, 15, BLACK, 'left', false));
  }), 0.56, 0.78, 0, 1.55, 0.018);
}

export const BUILDERS: Record<string, Builder> = {
  arTrainDesk(g, _W, _D, _c, _def, _ctx, out) {
    trainDesk(g, out);
  },
  arLabelStation(g, _W, _D, _c, _def, _ctx, out) {
    labelStation(g, out);
  },
  arPaperBoard(g, _W, _D, _c, _def, _ctx, out) {
    paperBoard(g, out);
  },
  arGpuRack(g, _W, _D, _c, _def, _ctx, out) {
    gpuRack(g, out);
  },
  arDemoScreen(g, _W, _D, _c, _def, _ctx, out) {
    demoScreen(g, out);
  },
  arEvalWall(g, _W, _D, _c, _def, _ctx, out) {
    evalWall(g, out);
  },
  arReadingNook(g, _W, _D, _c, _def, _ctx, out) {
    readingNook(g, out);
  },
  arPosterBoard(g, _W, _D, _c, _def, _ctx, out) {
    posterBoard(g, out);
  },
  arPrinter(g) {
    printer(g);
  },
  arPaperCart(g) {
    paperCart(g);
  },
  arModelMap(g) {
    modelMap(g);
  },
  arLabSign(g) {
    labSign(g);
  },
};
