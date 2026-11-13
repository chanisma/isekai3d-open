import * as THREE from 'three';
import type { HeldTool } from '../handTool';
import { boardGrip } from '../handTool';
import { marker, rod, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, label, painted, picture, text } from './doctor';
import { BR, BR_EMPTY, BUS, DC, GT, IT, PEN_UP, PLACES, PW, STAMP_UP, TM, brSlot, gtSlot, mapPoint, pwSlot, routeOf, tgNow, tgPhase, wrap } from './tourGuideMotion';
import type { TgMotion, TgNow, TgTool } from './tourGuideMotion';
import { vroidFigure, type FigureOptions } from './vroidFigure';
import { neighbourShop, shopFront } from './shopFront';

/**
 * The 여행사 drawn as itself (2026-11-01), the invented agency 구름나들. Consultation desks whose screen builds a trip day by day; a
 * wall map of an invented world with pins and strings; a stand of brochures for places that don't exist; a passport and visa
 * counter with invented forms; a small coach at the kerb with a flag, a mic and a stool for whoever's tired; a table of luggage
 * tags and tour receivers; a wall of past groups. No country, city, party, person or company here is real.
 * Everything that moves follows tourGuideMotion.ts.
 */

const CO = '구름나들';
const WALNUT = '#7a5a3f';
const OAK = '#c9a87e';
const CREAM = '#efe6d4';
const GREY = '#8f979c';
const GREY_D = '#566066';
const GRAPHITE = '#2f363c';
const TEAL = '#00897b';
const TEAL_D = '#00695c';
const TEAL_L = '#b2dfdb';
const SUN = '#ffb74d';
const CORAL = '#e8603c';
const RED = '#d32f2f';
const SEAL = '#c62828';
const GREEN = '#2e7d32';
const PAPER = '#fbfaf5';
const SEA = '#9fd3dc';
const SKIN = '#f1c9a5';
const INK = '#1c2024';
const WHITE = '#f6f7f4';
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UP = v3(0, 1, 0);
const tmp = new THREE.Vector3();
type V = readonly [number, number, number];
type Ctx2 = CanvasRenderingContext2D;
const q = (x: number | undefined, steps = 20) => Math.round((x ?? 0) * steps);
const pos = (r: number) => Math.max(0.5, r);
const clamp01 = (x: number | undefined) => THREE.MathUtils.clamp(x ?? 0, 0, 1);
const seedOf = (g: THREE.Object3D) => {
  const p = g.getWorldPosition(tmp);
  return Math.floor(Math.abs(p.x) * 3 + Math.abs(p.z) * 7);
};

// ---------------------------------------------------------------------------------------------
// The trips on sale. All invented, and the numbers with them.

interface Trip {
  name: string;
  place: number;
  days: readonly string[];
  costs: readonly number[];
}
const TRIPS: readonly Trip[] = [
  { name: '나르벨 제도 5일', place: 0, days: ['배로 입도 · 등대 마을', '섬 일주 · 조개 시장', '고래 바위 전망대', '자유 시간 · 귀항'], costs: [48, 36, 12, 9] },
  { name: '미르코 고원 4일', place: 2, days: ['산악 열차 · 고원 숙소', '구름 목장 걷기', '별 보기 야영', '치즈 공방 · 하산'], costs: [42, 28, 16, 8] },
  { name: '테와라 사막 6일', place: 3, days: ['모래 도시 도착', '낙타 길 따라 오아시스', '붉은 언덕 해돋이', '유목 천막 저녁'], costs: [61, 33, 22, 11] },
  { name: '아셀린 호수 3일', place: 4, days: ['호숫가 기차 여행', '나룻배 · 수상 시장', '온천 마을 · 귀가', '선택 일정: 자전거'], costs: [24, 22, 7, 6] },
];
const COST_ROWS = ['교통', '숙박', '현지 차량', '안내비'];
const tripOf = (i: number) => TRIPS[wrap(i, TRIPS.length)];
const place = (i: number) => PLACES[wrap(i, PLACES.length)];

function paperCanvas(c: Ctx2, w: number, h: number, bg = PAPER) {
  c.fillStyle = bg;
  c.fillRect(0, 0, w, h);
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
function ownLit(g: THREE.Object3D, geom: THREE.BufferGeometry, color: string, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color }));
  m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
const setLit = (m: THREE.Mesh, c: string) => (m.material as THREE.MeshBasicMaterial).color.set(c);
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
function standAt(g: THREE.Object3D, motion: TgMotion, x = 0, z = 0.6): Spot {
  const s = spot(g, 'stand', x, 0, z, Math.PI);
  s.motion = motion;
  return s;
}
function seatAt(g: THREE.Object3D, motion: TgMotion, seat: V, yaw = Math.PI): Spot {
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
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, tools: Partial<Record<TgTool, HeldTool>>, show: (now: string | null, N: TgNow | null, t: number, H: number) => void) {
  out.spots = spots;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const H = (sp?.at.userData.height as number | undefined) ?? 1.6;
    const N = sp ? tgNow(sp.motion as TgMotion, t, tgPhase(g.getWorldPosition(tmp)), H) : null;
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
    if (d.lengthSq() > 1e-9) m.quaternion.setFromUnitVectors(UP, d.normalize());
  };
}
/** An office chair; `yaw` is the way the sitter faces (π, into the piece, as at a desk). */
function chair(g: THREE.Object3D, seat: V, color = TEAL, yaw = Math.PI) {
  const c = group(g, seat[0], 0, seat[2], yaw - Math.PI);
  const T = seat[1];
  part(c, rbox(0.44, 0.07, 0.42, 0.03), color, 0, T - 0.035, 0);
  part(c, cyl(0.024, 0.03, T - 0.14, 10), CHROME, 0, (T - 0.08) / 2 + 0.06, 0, { outline: false });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    rod(c, v3(0, 0.1, 0), v3(Math.cos(a) * 0.23, 0.05, Math.sin(a) * 0.23), 0.014, BLACK);
    part(c, ball(0.024), BLACK, Math.cos(a) * 0.23, 0.026, Math.sin(a) * 0.23, { outline: false });
  }
  part(c, rbox(0.4, 0.42, 0.06, 0.04), color, 0, T + 0.3, 0.23, { rx: 0.1 });
  return c;
}
/** A round stool, for whoever's come in or is having a sit. */
function stool(g: THREE.Object3D, x: number, T: number, z: number, color = SUN) {
  const c = group(g, x, 0, z);
  part(c, cyl(0.17, 0.17, 0.05, 16), color, 0, T - 0.025, 0);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    rod(c, v3(Math.cos(a) * 0.1, T - 0.05, Math.sin(a) * 0.1), v3(Math.cos(a) * 0.17, 0.01, Math.sin(a) * 0.17), 0.012, GRAPHITE);
  }
  return c;
}
/** A monitor on a stem; the screen's plane stands in front of its case. */
function monitor(g: THREE.Object3D, p: V, w: number, h: number, T: number, px: number, py: number, ry = 0) {
  const m = group(g, p[0], 0, p[2], ry);
  part(m, box(w + 0.03, h + 0.03, 0.025), BLACK, 0, p[1], -0.016, { outline: false });
  const stem = Math.max(0.02, p[1] - T - h / 2 + 0.06);
  part(m, cyl(0.02, 0.026, stem, 10), GREY_D, 0, T + stem / 2, -0.05, { outline: false });
  part(m, rbox(0.22, 0.016, 0.15, 0.006), GREY_D, 0, T + 0.008, -0.05, { outline: false });
  return liveScreen(m, w, h, px, py, 0, p[1], 0);
}
function keyboard(g: THREE.Object3D, p: V, w = 0.3, d = 0.12) {
  part(g, rbox(w, 0.018, d, 0.006), GRAPHITE, p[0], p[1] - 0.022, p[2], { outline: false });
  for (let j = 0; j < 4; j++) part(g, box(w - 0.03, 0.002, 0.012), GREY, p[0], p[1] - 0.012, p[2] - d / 2 + 0.02 + j * 0.026, { outline: false });
}
const mug = (g: THREE.Object3D, x: number, T: number, z: number, c = '#d7ccc8') => part(g, cyl(0.038, 0.034, 0.085, 14), c, x, T + 0.043, z);

// ---------------------------------------------------------------------------------------------
// Tools designed for the hand. Each has its origin at the grip and is named for the probe.

const DOWN_IN = v3(-0.12, -1, -0.28).normalize();
function penTool(g: THREE.Object3D, color = '#2f6fd0'): { root: THREE.Group; held: HeldTool } {
  const root = group(g);
  root.name = 'tgPen';
  const inner = group(root);
  inner.quaternion.setFromUnitVectors(v3(0, -1, 0), DOWN_IN);
  part(inner, cyl(0.006, 0.006, PEN_UP * 0.78 + 0.05, 10), color, 0, (0.05 - PEN_UP * 0.78) / 2, 0, { outline: false });
  part(inner, cyl(0.006, 0.002, PEN_UP * 0.22, 10), BLACK, 0, -PEN_UP * 0.89, 0, { outline: false });
  return { root, held: { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: DOWN_IN.clone(), shape: 'pen', radius: 0.012, writes: PEN_UP } } } };
}
/** What's carried flat on the left forearm: a guidebook, a stack of brochures, a passport. */
const FLAT_LEFT: HeldTool['grips'] = { left: boardGrip(0.6) };
const stampGrip: HeldTool['grips'] = { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.017 } };

// ---------------------------------------------------------------------------------------------
// Other people: drawn, played by VRoid bodies when they've come.

interface Fig {
  root: THREE.Group;
  head: THREE.Group;
  armL(to: THREE.Vector3 | null): void;
  armR(to: THREE.Vector3 | null): void;
  opts: FigureOptions;
}
function person(parent: THREE.Object3D, top: string, bottom: string, hair: string, x: number, z: number, ry: number, gender: 'female' | 'male', seat?: number, seed?: number): Fig {
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
  const opts: FigureOptions = { gender, seat, seed };
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

// =============================================================================================
// The screen a consultant works on: the trip day by day, or what it costs.

interface PlanView {
  trip: number;
  days: number;
  mode: number;
  rows: number;
  margin: number;
  done: number;
  print: number;
}
function paintPlan(c: Ctx2, w: number, h: number, v: PlanView) {
  const T = tripOf(v.trip);
  paperCanvas(c, w, h, '#f0f5f3');
  c.fillStyle = TEAL;
  c.fillRect(0, 0, w, 26);
  text(c, `${CO} 일정표 · ${T.name}`, 8, 13, 13, '#ffffff');
  if (v.mode < 0.5) {
    const n = T.days.length;
    const colW = (w - 16) / n;
    for (let i = 0; i < n; i++) {
      const x = 8 + i * colW;
      c.fillStyle = '#ffffff';
      c.fillRect(x + 2, 34, colW - 4, h - 92);
      c.fillStyle = TEAL_D;
      c.fillRect(x + 2, 34, colW - 4, 20);
      text(c, `${i + 1}일째`, x + colW / 2, 44, 12, '#ffffff', 'center');
      const f = clamp01(v.days - i);
      if (f > 0.02) {
        c.globalAlpha = f;
        c.fillStyle = i % 2 ? '#ffe7c2' : TEAL_L;
        c.fillRect(x + 6, 60, colW - 12, 62);
        const [a, b] = T.days[i].split(' · ');
        text(c, a.slice(0, 7), x + 9, 76, 10, INK, 'left', false);
        text(c, a.slice(7), x + 9, 92, 10, INK, 'left', false);
        if (b) text(c, b.slice(0, 7), x + 9, 108, 10, GREY_D, 'left', false);
        c.globalAlpha = 1;
      }
    }
    // The route along the bottom, one stop a day.
    const y = h - 36;
    c.strokeStyle = '#b8c6c2';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(24, y);
    c.lineTo(w - 24, y);
    c.stroke();
    for (let i = 0; i < n; i++) {
      const x = 24 + (i * (w - 48)) / (n - 1);
      const lit = v.days > i + 0.5;
      c.fillStyle = lit ? CORAL : '#cfd8dc';
      c.beginPath();
      c.arc(x, y, pos(lit ? 6 : 4), 0, 6.3);
      c.fill();
    }
    text(c, v.print > 0.5 ? '인쇄했어요' : `${Math.min(n, Math.floor(clamp01(v.days / n) * n + 0.01))}/${n}일 완성`, w / 2, h - 13, 11, v.print > 0.5 ? GREEN : GREY_D, 'center');
  } else {
    let total = 0;
    COST_ROWS.forEach((row, i) => {
      const y = 46 + i * 26;
      const f = clamp01(v.rows - i);
      c.fillStyle = i % 2 ? '#ffffff' : '#e7efec';
      c.fillRect(8, y - 12, w - 16, 24);
      text(c, row, 16, y, 13, INK, 'left', false);
      if (f > 0.5) {
        const a = T.costs[i];
        total += a;
        text(c, `${a}만 원`, 210, y, 13, INK, 'right', false);
        c.fillStyle = TEAL;
        c.fillRect(224, y - 6, (w - 240) * clamp01((a / 65) * f), 12);
      }
    });
    c.fillStyle = '#d6e4e0';
    c.fillRect(8, h - 74, w - 16, 28);
    text(c, '원가 합계', 16, h - 60, 14, INK);
    text(c, `${total}만 원`, 210, h - 60, 14, INK, 'right');
    if (v.margin > 0.05) {
      c.globalAlpha = clamp01(v.margin);
      text(c, `판매가 ${Math.round(total * 1.18)}만 원 · 이윤 18%`, 16, h - 28, 15, v.done > 0.5 ? GREEN : CORAL);
      c.globalAlpha = 1;
    }
  }
}
const planKey = (v: PlanView) => `${wrap(v.trip, TRIPS.length)}|${q(v.days, 16)}|${q(v.mode, 1)}|${q(v.rows, 4)}|${q(v.margin, 4)}|${q(v.done, 1)}|${q(v.print, 1)}`;

/** A small printed brochure of an invented place: a sky, what's there, its name. */
function paintBrochure(c: Ctx2, w: number, h: number, i: number) {
  const P = place(i);
  const skies = ['#7fd0e6', '#ffc58a', '#a7d8a8', '#c6b4ea', '#f2a6a0', '#8fc7f0', '#f6d76b', '#9ee0cf'];
  c.fillStyle = skies[wrap(i, skies.length)];
  c.fillRect(0, 0, w, h);
  // A sun and a land of its own shape.
  c.fillStyle = 'rgba(255,255,240,0.85)';
  c.beginPath();
  c.arc(w * 0.72, h * 0.22, pos(w * 0.11), 0, 6.3);
  c.fill();
  c.fillStyle = ['#2f8e7a', '#c1793b', '#4e8a55', '#6e5aa8'][wrap(i, 4)];
  c.beginPath();
  c.moveTo(0, h * 0.68);
  for (let k = 0; k <= 8; k++) c.lineTo((k / 8) * w, h * (0.55 + 0.1 * Math.sin(k * 1.3 + i * 2.1)));
  c.lineTo(w, h);
  c.lineTo(0, h);
  c.fill();
  c.fillStyle = '#ffffff';
  c.fillRect(0, h * 0.72, w, h * 0.28);
  text(c, P.name, w / 2, h * 0.8, Math.round(w * 0.12), INK, 'center');
  text(c, CO, w / 2, h * 0.92, Math.round(w * 0.085), TEAL, 'center', false);
}
const brochureTex = (i: number) => painted(`tgBrochure${wrap(i, PLACES.length)}`, 128, 176, (c) => paintBrochure(c, 128, 176, i));

// =============================================================================================
// 여행 일정 책상 (itineraryDesk, 1 × 1).

function deskBody(g: THREE.Object3D) {
  const T = IT.top;
  part(g, rbox(0.98, 0.04, 0.78, 0.01), OAK, 0, T - 0.02, -0.08);
  part(g, box(0.34, 0.3, 0.46), WALNUT, 0.3, T - 0.19, -0.2, { outline: false });
  part(g, box(0.04, T - 0.04, 0.5), GREY_D, -0.46, (T - 0.04) / 2, -0.2, { outline: false });
  part(g, box(0.96, 0.4, 0.02), WALNUT, 0, T - 0.24, -0.45, { outline: false });
  keyboard(g, IT.keys, 0.27);
}
/** A little fan of brochures and the things that make a desk someone's. */
function deskBits(g: THREE.Object3D, seed: number) {
  const T = IT.top;
  for (let i = 0; i < 3; i++) picture(g, brochureTex(seed + i), 0.13, 0.18, -0.3 + i * 0.09, T + 0.12, -0.3 - i * 0.008, '#ffffff', 0, -0.2);
  part(g, box(0.34, 0.14, 0.05), WALNUT, -0.21, T + 0.07, -0.335, { rx: -0.2, outline: false });
  if (seed % 2) mug(g, 0.42, T, -0.16);
  else {
    // A desk globe of nowhere in particular.
    part(g, cyl(0.05, 0.06, 0.016, 12), GRAPHITE, 0.4, T + 0.008, -0.18, { outline: false });
    rod(g, v3(0.4, T, -0.18), v3(0.4, T + 0.08, -0.18), 0.005, GRAPHITE);
    part(g, ball(0.075), SEA, 0.4, T + 0.15, -0.18);
    part(g, ball(0.045), '#7bb17b', 0.43, T + 0.18, -0.13, { outline: false });
  }
  label(g, seed % 3 ? '오늘 출발 2팀' : '비자 서류 확인!', 0.17, 0.05, 0.3, T + 0.42, -0.25, '#fff4b8', '#6b4a10');
}
function calculator(g: THREE.Object3D) {
  const T = IT.top;
  part(g, rbox(0.11, 0.022, 0.16, 0.006), '#3b4248', IT.calc[0], T + 0.011, IT.calc[2], { outline: false });
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) part(g, box(0.016, 0.004, 0.016), i === 3 && j === 3 ? CORAL : '#d6dade', IT.calc[0] - 0.033 + i * 0.022, T + 0.024, IT.calc[2] - 0.016 + j * 0.022, { outline: false });
  return liveScreen(g, 0.09, 0.03, 90, 30, IT.calc[0], T + 0.0235, IT.calc[2] - 0.055, 0, -Math.PI / 2);
}
function itineraryDesk(g: THREE.Group, out: Built) {
  const T = IT.top;
  deskBody(g);
  chair(g, IT.seat);
  const scr = monitor(g, IT.screen, 0.54, 0.31, T, 400, 230);
  const calc = calculator(g);
  // The open brochure or the ledger, on one plate at the right hand.
  part(g, box(0.21, 0.004, 0.29), '#d8d2bf', IT.paper[0], T + 0.002, IT.paper[2], { outline: false });
  const paper = liveScreen(g, 0.2, 0.28, 180, 252, IT.paper[0], T + 0.005, IT.paper[2], 0, -Math.PI / 2);
  const printed = liveScreen(g, 0.2, 0.28, 160, 224, IT.print[0], T + 0.006, IT.print[2], Math.PI, -Math.PI / 2);
  printed.mesh.visible = false;
  const pen = penTool(g, CORAL);
  const tools: Partial<Record<TgTool, HeldTool>> = { pen: pen.held };
  const spots: Record<string, Spot> = {
    draftItinerary: seatAt(g, 'tgDraft', IT.seat),
    tourGuide_costPackage: seatAt(g, 'tgCost', IT.seat),
  };
  const seatC = stool(g, IT.client[0], IT.client[1], IT.client[2]);
  seatC.visible = false;
  const client = lazy(() => person(g, '#b8a18f', '#3f4a52', '#2b1b10', IT.client[0], IT.client[2], 0, 'female', IT.client[1]));
  const reach = new THREE.Vector3();
  let seed = -1;
  const show = (_now: string | null, N: TgNow | null, t: number) => {
    if (seed < 0) {
      seed = seedOf(g);
      deskBits(g, seed);
    }
    const n = N?.n ?? {};
    const trip = (N?.b.n ?? 0) + seed;
    const T0 = tripOf(trip);
    const costMode = (n.mode ?? 0) > 0.5;
    const circle = n.circle ?? 0;
    const opened = n.opened ?? 0;
    const lines = n.lines ?? 0;
    paper.draw(`${costMode ? 1 : 0}|${wrap(trip, TRIPS.length)}|${q(opened, 1)}|${q(circle, 8)}|${q(lines, 2)}|${q(n.done, 1)}`, (c) => {
      if (costMode) {
        paperCanvas(c, 180, 252, '#fbf8ea');
        c.fillStyle = TEAL;
        c.fillRect(0, 0, 180, 22);
        text(c, '상품 원가 장부', 90, 11, 13, '#ffffff', 'center');
        c.fillStyle = '#d3d8da';
        for (let i = 0; i < 8; i++) c.fillRect(6, 44 + i * 26, 168, 1);
        const sum = T0.costs.reduce((a, b) => a + b, 0);
        const rows = [T0.name, `원가 ${sum}만 원`, `판매가 ${Math.round(sum * 1.18)}만 원`];
        rows.forEach((s, i) => {
          if (lines > i + 0.3) text(c, s, 10, 32 + i * 26, 14, '#1a2b6d');
        });
        if ((n.done ?? 0) > 0.5) {
          c.strokeStyle = RED;
          c.lineWidth = 3;
          c.beginPath();
          c.arc(136, 206, pos(22), 0, 6.3);
          c.stroke();
          text(c, '확인', 136, 206, 14, RED, 'center');
        }
      } else if (opened > 0.5 || !N) {
        paintBrochure(c, 180, 252, T0.place);
        if (circle > 0.02) {
          c.strokeStyle = CORAL;
          c.lineWidth = 4;
          c.beginPath();
          c.arc(90, 126, pos(46), 0, clamp01(circle) * 6.3);
          c.stroke();
        }
      } else {
        paperCanvas(c, 180, 252, TEAL);
        text(c, CO, 90, 90, 26, '#ffffff', 'center');
        text(c, '여행 안내', 90, 130, 16, TEAL_L, 'center');
      }
    });
    const showPrint = !costMode && (n.print ?? 0) > 0.5;
    printed.mesh.visible = showPrint;
    if (showPrint) {
      printed.draw(`${wrap(trip, TRIPS.length)}`, (c) => {
        paperCanvas(c, 160, 224);
        text(c, T0.name, 80, 18, 14, TEAL_D, 'center');
        T0.days.forEach((d, i) => {
          text(c, `${i + 1}일째`, 8, 48 + i * 42, 12, CORAL);
          text(c, d.slice(0, 13), 8, 66 + i * 42, 11, INK, 'left', false);
        });
      });
    }
    const press = n.press ?? 0;
    calc.draw(`${costMode ? 1 : 0}|${q(n.rows, 8)}|${press > 0.5 ? 1 : 0}`, (c) => {
      c.fillStyle = '#a6c7a3';
      c.fillRect(0, 0, 90, 30);
      const sum = T0.costs.slice(0, Math.max(0, Math.floor(n.rows ?? 0))).reduce((a, b) => a + b, 0);
      text(c, `${sum}`, 84, 16, 20, '#1b2a1b', 'right');
    });
    at(pen.root, N?.props.pen ?? null, [IT.paper[0] + 0.13, T + 0.02, IT.paper[2] - 0.15]);
    const v: PlanView = N ? { trip, days: n.days ?? 0, mode: n.mode ?? 0, rows: n.rows ?? 0, margin: n.margin ?? 0, done: n.done ?? 0, print: n.print ?? 0 } : { trip: seed, days: 2 + wrap(seed, 3), mode: 0, rows: 0, margin: 0, done: 0, print: 0 };
    scr.draw(planKey(v), (c) => paintPlan(c, 400, 230, v));
    // The customer across the desk, on the stool that's brought when they come.
    const here = (n.client ?? 0) > 0.5;
    seatC.visible = here;
    if (here) {
      const f = client.get();
      f.root.visible = true;
      const talk = (n.clTalks ?? 0) > 0.5;
      reach.set(IT.client[0] + 0.14, T + 0.1 + (talk ? 0.06 * Math.sin(t * 3.4) : 0), IT.client[2] + 0.42);
      f.armR(talk ? reach : null);
      f.armL(null);
      nodHead(f, (n.clNods ?? 0) > 0.5 ? 0.14 + 0.08 * Math.sin(t * 2.6) : 0.05);
    } else client.hide();
  };
  drive(g, out, spots, tools, show);
  out.work = marker(g, IT.keys[0], IT.keys[1], IT.keys[2]);
}

// =============================================================================================
// 동료 상담 책상 (tgMateDesk, 1 × 1): the same desk, a colleague building a trip of their own by the clock.

function mateDesk(g: THREE.Group, out: Built) {
  const T = IT.top;
  deskBody(g);
  chair(g, IT.seat, '#58707a');
  const scr = monitor(g, IT.screen, 0.54, 0.31, T, 400, 230);
  part(g, box(0.2, 0.012, 0.28), TEAL, IT.paper[0], T + 0.006, IT.paper[2], { outline: false });
  let seed = -1;
  let mate: Fig | null = null;
  const lk = new THREE.Vector3();
  const rk = new THREE.Vector3();
  out.away = (_o, t) => {
    if (seed < 0) {
      seed = seedOf(g);
      deskBits(g, seed);
      const looks: Array<[string, string, string, 'female' | 'male']> = [['#80cbc4', '#3e4a50', '#1a1a1a', 'female'], ['#ffcc80', '#455a64', '#3e2723', 'male'], ['#b2dfdb', '#37474f', '#2b1b10', 'female']];
      const L = looks[wrap(seed, looks.length)];
      mate = person(g, L[0], L[1], L[2], IT.seat[0], IT.seat[2], Math.PI, L[3], IT.seat[1], seed);
      mate.root.visible = true;
    }
    const len = 26;
    const u = ((t / len + seed * 0.29) % 1 + 1) % 1;
    const typing = u < 0.7;
    if (mate) {
      lk.set(IT.keys[0] - 0.09, IT.keys[1] + 0.03 + (typing ? 0.006 * Math.sin(t * 11) : 0), IT.keys[2]);
      rk.set(IT.keys[0] + 0.09, IT.keys[1] + 0.03 + (typing ? 0.006 * Math.sin(t * 13) : 0), IT.keys[2]);
      mate.armL(lk);
      mate.armR(rk);
      mate.head.rotation.y = typing ? 0.03 * Math.sin(t * 0.7) : 0.5;
      nodHead(mate, typing ? 0.12 : 0.05 + 0.03 * Math.sin(t * 1.3));
    }
    const v: PlanView = { trip: seed + Math.floor(t / len + seed * 0.29), days: clamp01(u / 0.85) * 4, mode: 0, rows: 0, margin: 0, done: 0, print: 0 };
    scr.draw(planKey(v), (c) => paintPlan(c, 400, 230, v));
  };
  out.work = marker(g, IT.keys[0], IT.keys[1], IT.keys[2]);
}

// =============================================================================================
// 관광 지도 (travelMap, 2 × 1): a wall map of an invented world.

function paintWorld(c: Ctx2, w: number, h: number) {
  c.fillStyle = SEA;
  c.fillRect(0, 0, w, h);
  c.strokeStyle = 'rgba(255,255,255,0.35)';
  c.lineWidth = 1;
  for (let i = 1; i < 8; i++) {
    c.beginPath();
    c.moveTo((i / 8) * w, 0);
    c.lineTo((i / 8) * w, h);
    c.moveTo(0, (i / 8) * h);
    c.lineTo(w, (i / 8) * h);
    c.stroke();
  }
  // Lands of no real shape: blobs round each place, joined up in twos and threes.
  const lands = ['#d9c88e', '#b9cf8d', '#e0b67c', '#a8c79a'];
  const blob = (u: number, v: number, r: number, seed: number, color: string) => {
    c.fillStyle = color;
    c.strokeStyle = '#8c7c52';
    c.lineWidth = 2;
    c.beginPath();
    for (let k = 0; k <= 20; k++) {
      const a = (k / 20) * Math.PI * 2;
      const R = r * (0.72 + 0.28 * Math.sin(a * 3 + seed) * Math.cos(a * 2 + seed * 0.7));
      const X = u * w + Math.cos(a) * R * 1.25;
      const Y = v * h + Math.sin(a) * R;
      if (k) c.lineTo(X, Y);
      else c.moveTo(X, Y);
    }
    c.closePath();
    c.fill();
    c.stroke();
  };
  blob(0.14, 0.3, 42, 1, lands[0]);
  blob(0.09, 0.42, 22, 4, lands[0]);
  blob(0.38, 0.38, 112, 2, lands[1]);
  blob(0.68, 0.3, 118, 5, lands[2]);
  blob(0.6, 0.7, 84, 3, lands[3]);
  blob(0.78, 0.76, 34, 6, lands[1]);
  blob(0.9, 0.5, 44, 7, lands[2]);
  // Mountains and a compass rose.
  c.fillStyle = '#8a7a58';
  for (const [u, v] of [[0.72, 0.21], [0.76, 0.26], [0.68, 0.25], [0.44, 0.2], [0.48, 0.22]] as const) {
    c.beginPath();
    c.moveTo(u * w - 10, v * h + 8);
    c.lineTo(u * w, v * h - 10);
    c.lineTo(u * w + 10, v * h + 8);
    c.fill();
  }
  c.strokeStyle = '#3f5560';
  c.lineWidth = 2;
  c.beginPath();
  c.arc(w * 0.08, h * 0.84, 28, 0, 6.3);
  c.moveTo(w * 0.08, h * 0.84 - 34);
  c.lineTo(w * 0.08, h * 0.84 + 34);
  c.moveTo(w * 0.08 - 34, h * 0.84);
  c.lineTo(w * 0.08 + 34, h * 0.84);
  c.stroke();
  text(c, '북', w * 0.08, h * 0.84 - 44, 16, '#3f5560', 'center');
  // Names.
  PLACES.forEach((P) => {
    const tw = P.name.length * 15 + 12;
    c.fillStyle = 'rgba(255,255,245,0.82)';
    c.fillRect(P.u * w - tw / 2, P.v * h + 12, tw, 22);
    text(c, P.name, P.u * w, P.v * h + 23, 16, INK, 'center');
  });
  c.fillStyle = TEAL_D;
  c.fillRect(0, 0, w, 34);
  text(c, `${CO} 세계 지도`, w / 2, 17, 20, '#ffffff', 'center');
  text(c, '이 지도의 땅은 모두 우리 여행지입니다', w - 12, h - 14, 13, '#3f5560', 'right', false);
}
function travelMap(g: THREE.Group, out: Built) {
  const F = TM.face;
  // Backboard behind the map's plane, a frame, two posts to the floor, a shelf of folded maps below.
  part(g, box(TM.w + 0.1, TM.h + 0.1, 0.03), WALNUT, 0, TM.cy, F - 0.018);
  for (const sx of [-1, 1]) part(g, box(0.05, TM.cy + TM.h / 2, 0.04), WALNUT, (sx * (TM.w + 0.06)) / 2, (TM.cy + TM.h / 2) / 2, F - 0.03);
  const tex = painted('tgWorld', 1020, 660, (c) => paintWorld(c, 1020, 660));
  picture(g, tex, TM.w, TM.h, 0, TM.cy, F);
  part(g, rbox(1.3, 0.03, 0.16, 0.01), OAK, 0, 0.7, F + 0.05);
  for (let i = 0; i < 7; i++) part(g, box(0.1, 0.13, 0.11), ['#00897b', '#ffb74d', '#26a69a', '#e8603c'][i % 4], -0.52 + i * 0.17, 0.78, F + 0.05, { rz: 0.04 * (i % 3), outline: false });
  // Pins and strings: every route up, the one being set down taken off for the moment.
  const pins = PLACES.map((_, i) => {
    const p = mapPoint(i, 0.012);
    const b = group(g, p[0], p[1], p[2]);
    part(b, ball(0.014), i % 2 ? CORAL : '#2f6fd0', 0, 0, 0.012, { outline: false });
    return b;
  });
  const strings = [0, 1, 2, 3].map(() => {
    const m = part(g, cyl(0.0028, 0.0028, 1, 6), RED, 0, 0, 0, { outline: false });
    const d = new THREE.Vector3();
    const set = (a: V, b: V) => {
      d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
      m.scale.set(1, Math.max(0.001, d.length()), 1);
      if (d.lengthSq() > 1e-9) m.quaternion.setFromUnitVectors(UP, d.normalize());
    };
    return { m, set };
  });
  const homeString = (i: number) => {
    const [a, b] = routeOf(i);
    strings[i].m.visible = true;
    strings[i].set(mapPoint(a), mapPoint(b));
  };
  for (let i = 0; i < 4; i++) homeString(i);
  // A bright bead that runs under the finger along the route being learned.
  const bead = ownLit(g, ball(0.018), '#ffe27a', 0, 0, F + 0.02);
  bead.visible = false;
  // The guidebook on the arm, its pages filling with pencil.
  const book = group(g);
  book.name = 'tgGuidebook';
  const tilt = group(book);
  tilt.rotation.x = -0.6;
  part(tilt, box(0.3, 0.22, 0.012), TEAL_D, 0, 0, 0, { outline: false });
  const pages = liveScreen(tilt, 0.285, 0.205, 256, 184, 0, 0, 0.0075);
  // A pin with its string's end.
  const pinTool = group(g);
  pinTool.name = 'tgPin';
  part(pinTool, ball(0.013), CORAL, 0, 0.016, 0, { outline: false });
  part(pinTool, cyl(0.002, 0.001, 0.03, 6), CHROME, 0, -0.002, 0, { outline: false });
  const tools: Partial<Record<TgTool, HeldTool>> = {
    book: { tool: book, lead: 'left', grips: FLAT_LEFT },
    pin: { tool: pinTool, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'pinch', radius: 0.008 } } },
  };
  const spots: Record<string, Spot> = {
    studySites: standAt(g, 'tgStudy', 0, TM.read),
    tourGuide_followGuide: standAt(g, 'tgFollow', 0, TM.read),
  };
  const show = (now: string | null, N: TgNow | null) => {
    const n = N?.n ?? {};
    const following = now === 'tourGuide_followGuide';
    const r = wrap(n.route ?? 0, 4);
    const [ai, bi] = routeOf(r);
    for (let i = 0; i < 4; i++) homeString(i);
    pins.forEach((p) => (p.visible = true));
    if (following) {
      pins[ai].visible = (n.pinA ?? 0) > 0.5;
      pins[bi].visible = (n.pinB ?? 0) > 0.5;
      const end = N?.props.end ?? null;
      if ((n.strung ?? 0) > 0.5) strings[r].set(mapPoint(ai), mapPoint(bi));
      else if (end) strings[r].set(mapPoint(ai), end);
      else strings[r].m.visible = false;
    }
    bead.visible = !!N && !following && (n.lit ?? 0) > 0.01 && (n.lit ?? 0) < 0.99;
    if (bead.visible) {
      const A = mapPoint(ai, 0.022);
      const B = mapPoint(bi, 0.022);
      const u = clamp01(n.lit);
      bead.position.set(A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u, A[2]);
    }
    at(book, N?.tool === 'book' ? N.props.book : null);
    if (N?.tool === 'book') {
      const notes = n.notes ?? 0;
      pages.draw(`${r}|${q(notes, 4)}`, (c) => {
        paperCanvas(c, 256, 184);
        c.fillStyle = '#d7d2c4';
        c.fillRect(127, 0, 2, 184);
        text(c, place(ai).name, 64, 20, 14, TEAL_D, 'center');
        text(c, '볼거리 · 인사말', 64, 44, 11, GREY_D, 'center', false);
        for (let i = 0; i < 5; i++) {
          c.fillStyle = '#c9c4b4';
          c.fillRect(10, 62 + i * 22, 108, 3);
        }
        text(c, '해설 메모', 192, 20, 13, CORAL, 'center');
        ['첫인사 짧게', '시장은 오전에', '사진 자리 알려 주기', '길 건널 때 조심'].forEach((s, i) => {
          if (notes > (i + 0.5) / 4) text(c, s, 136, 50 + i * 26, 12, '#1a2b6d', 'left', false);
        });
      });
    }
    at(pinTool, N?.tool === 'pin' ? N.props.pin : null);
  };
  drive(g, out, spots, tools, show);
  out.work = marker(g, 0, TM.cy, F + 0.05);
}

// =============================================================================================
// 관광버스 (tourBus, 2 × 1 under a small coach): along x, the nose at +x, the door on the side the camera sees.

const busSideTex = () =>
  painted('tgBusSide', 1024, 160, (c) => {
    c.fillStyle = WHITE;
    c.fillRect(0, 0, 1024, 160);
    c.fillStyle = TEAL;
    c.beginPath();
    c.moveTo(0, 150);
    c.bezierCurveTo(300, 150, 500, 60, 1024, 40);
    c.lineTo(1024, 160);
    c.lineTo(0, 160);
    c.fill();
    c.fillStyle = SUN;
    c.beginPath();
    c.moveTo(0, 160);
    c.bezierCurveTo(300, 160, 560, 100, 1024, 86);
    c.lineTo(1024, 110);
    c.bezierCurveTo(560, 124, 320, 160, 120, 160);
    c.fill();
    text(c, `${CO} 여행`, 220, 62, 54, TEAL_D, 'center');
  });
function busBody(bus: THREE.Group) {
  const { L, W, floor, roof } = BUS;
  const nose = L / 2;
  const side = W / 2;
  part(bus, rbox(L, 1.0, W, 0.14), WHITE, 0, floor + 0.5, 0);
  part(bus, rbox(L - 0.08, roof - floor - 1.0, W - 0.04, 0.16), '#27323a', 0, floor + 1.0 + (roof - floor - 1.0) / 2, 0);
  part(bus, rbox(L, 0.12, W, 0.06), WHITE, 0, roof - 0.02, 0);
  part(bus, rbox(1.6, 0.16, 1.2, 0.06), '#e4e8e6', -0.9, roof + 0.12, 0);
  const tex = busSideTex();
  for (const sz of [-1, 1]) {
    picture(bus, tex, L - 0.6, 0.72, -0.2, floor + 0.46, sz * (side + 0.003), '#ffffff', sz > 0 ? 0 : Math.PI);
    for (let i = 0; i < 6; i++) part(bus, box(0.06, 1.0, 0.012), WHITE, -2.4 + i * 0.72, floor + 1.5, sz * (side - 0.012), { outline: false });
  }
  // Nose: the screen, the destination, lights, a grille; the back's lights.
  part(bus, box(0.02, 1.0, W - 0.2), '#2c3a46', nose + 0.003, floor + 1.48, 0);
  const dest = painted('tgBusDest', 256, 48, (c) => {
    c.fillStyle = '#111';
    c.fillRect(0, 0, 256, 48);
    text(c, '구름나들 단체', 128, 25, 28, SUN, 'center');
  });
  picture(bus, dest, 0.9, 0.17, nose + 0.018, roof - 0.2, 0, '#ffffff', Math.PI / 2);
  for (const sz of [-1, 1]) {
    ownLit(bus, rbox(0.04, 0.12, 0.24, 0.02), '#fffde7', nose + 0.005, floor + 0.34, sz * 0.66);
    rod(bus, v3(nose - 0.1, roof - 0.26, sz * (side + 0.02)), v3(nose + 0.3, roof - 0.5, sz * (side + 0.1)), 0.02, '#212121');
    part(bus, rbox(0.06, 0.3, 0.16, 0.03), '#212121', nose + 0.31, roof - 0.72, sz * (side + 0.11));
    part(bus, rbox(0.04, 0.2, 0.2, 0.02), '#b71c1c', -nose - 0.008, floor + 0.46, sz * 0.7);
  }
  part(bus, rbox(0.05, 0.2, 1.1, 0.02), '#37474f', nose + 0.008, floor + 0.14, 0);
  label(bus, '여행 72 사 1004', 0.5, 0.12, -nose - 0.02, floor + 0.24, 0, '#ffd600', '#1b2a1b', -Math.PI / 2);
  // Wheels, and the luggage bays between them.
  for (const x of [BUS.fAxle, BUS.rAxle]) for (const sz of [-1, 1]) {
    const w = group(bus, x, BUS.wheelR, sz * (side - 0.12));
    part(w, cyl(BUS.wheelR, BUS.wheelR, 0.26, 20), '#1a1a1a', 0, 0, 0, { rx: Math.PI / 2 });
    part(w, cyl(0.2, 0.2, 0.27, 14), '#b0bec5', 0, 0, 0, { rx: Math.PI / 2, outline: false });
    part(bus, box(0.9, 0.05, 0.05), '#212121', x, BUS.wheelR * 2 + 0.05, sz * (side + 0.008));
  }
  for (const x of [-0.8, 0.3]) {
    part(bus, box(0.95, 0.42, 0.012), '#e6e9e6', x, 0.55, side + 0.008);
    part(bus, box(0.16, 0.025, 0.02), '#9e9e9e', x, 0.42, side + 0.018);
  }
}
function busHeads(bus: THREE.Group) {
  return Array.from({ length: 7 }, (_, i) => {
    const h = group(bus, -2.2 + i * 0.68, BUS.floor + 1.32, (i % 2 ? 1 : -1) * 0.44);
    part(h, ball(0.11), SKIN, 0, 0, 0);
    part(h, ball(0.114), i % 3 ? '#1a1a1a' : '#4e342e', -0.02, 0.05, 0).scale.set(1, 0.7, 1);
    part(h, rbox(0.32, 0.25, 0.34, 0.08), [TEAL_L, SUN, '#c5cae9', '#f8bbd0'][i % 4], 0, -0.25, 0);
    h.visible = false;
    return h;
  });
}
function tourBus(g: THREE.Group, out: Built) {
  // The kerb: a stone edge along the coach's side, and everything that stays on it when it's gone.
  part(g, box(BUS.L + 0.5, 0.06, 0.14), '#b8bdb9', 0, 0.03, 0.56);
  const bus = group(g, 0, 0, BUS.z);
  busBody(bus);
  const side = BUS.W / 2;
  // The door, two leaves folding back from the middle, its two steps inside.
  const leaves = [-1, 1].map((sx) => {
    const hinge = group(bus, BUS.doorX + sx * 0.44, 0, side + 0.012);
    part(hinge, box(0.42, 1.92, 0.02), '#30404c', -sx * 0.21, BUS.floor + 1.0, 0, { outline: false });
    part(hinge, box(0.03, 1.92, 0.026), WHITE, -sx * 0.42, BUS.floor + 1.0, 0, { outline: false });
    return { hinge, sx };
  });
  part(bus, box(0.86, 0.9, 0.3), '#1a2024', BUS.doorX, 0.45, side - 0.16, { outline: false });
  part(bus, box(0.86, 0.04, 0.34), '#c9b56a', BUS.doorX, 0.22, side - 0.14, { outline: false });
  part(bus, box(0.86, 0.04, 0.2), '#c9b56a', BUS.doorX, 0.46, side - 0.2, { outline: false });
  const heads = busHeads(bus);
  const driver = group(bus, BUS.L / 2 - 0.72, BUS.floor + 1.26, -0.5);
  part(driver, ball(0.11), SKIN, 0, 0.1, 0);
  part(driver, ball(0.114), '#2b1b10', -0.02, 0.15, 0).scale.set(1, 0.7, 1);
  part(driver, rbox(0.3, 0.38, 0.38, 0.08), TEAL_D, 0, -0.2, 0);
  driver.visible = false;
  // A guide's flag in the windscreen while they're out.
  const windowFlag = part(bus, box(0.02, 0.2, 0.3), SUN, BUS.L / 2 - 0.05, BUS.floor + 1.2, 0.5, { outline: false });
  windowFlag.visible = false;

  // The post on the kerb: the meeting-place sign, the flag's socket, the mic's clip.
  const POST = BUS.socket[0];
  part(g, cyl(0.12, 0.14, 0.03, 12), GRAPHITE, POST, 0.015, 0.56);
  part(g, cyl(0.022, 0.022, 0.62, 10), GREY_D, POST, 0.32, 0.56, { outline: false });
  part(g, cyl(0.034, 0.03, 0.14, 10), GRAPHITE, POST, 0.6, 0.56, { outline: false });
  part(g, cyl(0.016, 0.016, 1.3, 10), GREY_D, BUS.clip[0], 0.65, BUS.clip[2], { outline: false });
  part(g, cyl(0.1, 0.12, 0.03, 12), GRAPHITE, BUS.clip[0], 0.015, BUS.clip[2]);
  part(g, box(0.05, 0.03, 0.06), BLACK, BUS.clip[0], BUS.clip[1] - 0.07, BUS.clip[2] + 0.015, { outline: false });
  label(g, '구름나들 집합 장소', 0.42, 0.14, BUS.clip[0], 1.34, BUS.clip[2] + 0.016, TEAL, '#ffffff');
  part(g, box(0.44, 0.16, 0.02), TEAL_D, BUS.clip[0], 1.34, BUS.clip[2], { outline: false });
  // The cool box on its folding stand.
  const CB = BUS.cool;
  for (const sx of [-1, 1]) rod(g, v3(CB[0] + sx * 0.14, 0.02, 0.56 - sx * 0.08), v3(CB[0] - sx * 0.14, 0.82, 0.56 + sx * 0.08), 0.011, GREY_D);
  part(g, rbox(0.36, 0.16, 0.22, 0.03), '#2f7fb8', CB[0], 0.9, 0.56);
  part(g, box(0.37, 0.02, 0.23), WHITE, CB[0], 0.96, 0.56, { outline: false });
  // The folding stool, a suitcase by it.
  const seatT = stool(g, BUS.stool[0], BUS.stool[1], BUS.stool[2], '#607d8b');
  seatT.visible = false;
  part(g, rbox(0.3, 0.46, 0.18, 0.03), CORAL, -0.62, 0.27, 0.86);
  part(g, cyl(0.008, 0.008, 0.18, 6), GREY_D, -0.62, 0.59, 0.86, { outline: false });

  // Tools.
  const flag = group(g);
  flag.name = 'tgFlag';
  part(flag, cyl(0.013, 0.013, 1.68, 10), '#ece7da', 0, 0.12, 0, { outline: false });
  part(flag, ball(0.024), SUN, 0, 0.97, 0, { outline: false });
  const cloth = group(flag, 0, 0.74, 0);
  cloth.rotation.y = 0;
  const clothTex = painted('tgFlagCloth', 192, 128, (c) => {
    c.fillStyle = TEAL;
    c.fillRect(0, 0, 192, 128);
    c.fillStyle = SUN;
    c.beginPath();
    c.arc(44, 40, 22, 0, 6.3);
    c.fill();
    text(c, CO, 104, 88, 34, '#ffffff', 'center');
  });
  const clothM = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.24), new THREE.MeshBasicMaterial({ map: clothTex, side: THREE.DoubleSide }));
  clothM.userData.ownGeometry = clothM.userData.ownMaterial = true;
  clothM.position.set(0.18, 0, 0);
  cloth.add(clothM);
  const mic = group(g);
  mic.name = 'tgMic';
  part(mic, cyl(0.016, 0.014, 0.13, 12), '#23272c', 0, 0, 0, { outline: false });
  part(mic, ball(0.026), '#8d969c', 0, 0.082, 0, { outline: false });
  const bottle = group(g);
  bottle.name = 'tgBottle';
  part(bottle, cyl(0.032, 0.032, 0.16, 12), '#b7dcea', 0, 0, 0, { outline: false });
  part(bottle, cyl(0.016, 0.03, 0.03, 10), '#b7dcea', 0, 0.095, 0, { outline: false });
  part(bottle, cyl(0.016, 0.016, 0.02, 10), '#2f6fd0', 0, 0.12, 0, { outline: false });
  const coolBottle = part(g, cyl(0.032, 0.032, 0.1, 12), '#b7dcea', CB[0], 1.0, 0.56, { outline: false });
  const theirBottle = group(g);
  part(theirBottle, cyl(0.032, 0.032, 0.16, 12), '#b7dcea', 0, 0, 0, { outline: false });
  part(theirBottle, cyl(0.016, 0.016, 0.02, 10), '#2f6fd0', 0, 0.11, 0, { outline: false });
  theirBottle.visible = false;

  const tools: Partial<Record<TgTool, HeldTool>> = {
    flag: { tool: flag, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'power' } } },
    mic: { tool: mic, lead: 'right', grips: { right: { at: v3(0, -0.015, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.016 } } },
    bottle: { tool: bottle, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.032 } } },
  };
  const go = spot(g, 'stand', 1.0, 0, 1.0, Math.PI);
  const spots: Record<string, Spot> = {
    tgBoarding: standAt(g, 'tgBoarding', BUS.guide[0], BUS.guide[1]),
    tourGuide_careTraveler: standAt(g, 'tgCare', BUS.careAt[0], BUS.careAt[1]),
    '*': go,
  };

  // The group that's gathered, and whoever's tired.
  const looks: Array<[string, string, string, 'female' | 'male', number]> = [['#90caf9', '#37474f', '#1a1a1a', 'female', -0.1], ['#ffcc80', '#455a64', '#3e2723', 'male', -0.72], ['#f48fb1', '#2f2a28', '#1a1a1a', 'female', -1.36]];
  const group3 = looks.map((L, i) => lazy(() => person(g, L[0], L[1], L[2], L[4], 1.04 + (i % 2) * 0.1, Math.PI / 2, L[3], undefined, i + 11)));
  const traveller = lazy(() => person(g, '#c5cae9', '#3f4a52', '#6d6d6d', BUS.stool[0], BUS.stool[2], Math.PI / 2, 'female', BUS.stool[1], 7));
  const hand = new THREE.Vector3();
  const tilt = (n: number) => -0.32 * n;
  const show = (_now: string | null, N: TgNow | null, t: number) => {
    const n = N?.n ?? {};
    const door = n.door ?? 0;
    for (const { hinge, sx } of leaves) hinge.rotation.y = sx * door * 1.4;
    const wave = n.wave ?? 0;
    cloth.rotation.y = wave * 0.35 * Math.sin(t * 5.5);
    flag.rotation.z = tilt(n.flagTilt ?? 0) + wave * 0.1 * Math.sin(t * 3.4);
    at(flag, N?.props.flag ?? null, BUS.socket);
    at(mic, N?.props.mic ?? null, BUS.clip);
    const held = N?.tool === 'bottle';
    at(bottle, held ? N?.props.bottle : null);
    coolBottle.visible = !held;
    // The group, in a loose knot facing the guide.
    if ((n.group ?? 0) > 0.5) {
      group3.forEach((L, i) => {
        const f = L.get();
        f.root.visible = true;
        f.armL(null);
        f.armR(null);
        const counted = (n.grpCounted ?? 0) > i + 0.5;
        const bow = (n.grpBow ?? 0) > 0.5;
        nodHead(f, bow ? 0.3 : counted ? 0.1 + 0.08 * Math.sin(t * 3 + i) : (n.grpLook ?? 0) > 0.5 ? -0.08 : 0.04 * Math.sin(t * 1.3 + i));
        f.head.rotation.y = (n.grpLook ?? 0) > 0.5 ? -0.3 : 0.08 * Math.sin(t * 0.8 + i);
      });
    } else group3.forEach((L) => L.hide());
    // The tired one on the stool.
    const care = (n.traveller ?? 0) > 0.5;
    seatT.visible = care;
    if (care) {
      const f = traveller.get();
      f.root.visible = true;
      const drink = (n.drinking ?? 0) > 0.5;
      const took = (n.took ?? 0) > 0.5;
      const better = n.better ?? 0;
      theirBottle.visible = took;
      hand.set(BUS.stool[0] + 0.22, drink ? BUS.stool[1] + 0.6 + 0.2 * Math.max(0, Math.sin(t * 1.1)) : BUS.stool[1] + 0.3, BUS.stool[2] - 0.1);
      if (took) theirBottle.position.copy(hand);
      f.armR(took ? hand : null);
      hand.set(BUS.stool[0] + 0.2, BUS.stool[1] + 0.34 + (n.trTalks ?? 0) * 0.05 * Math.sin(t * 3), BUS.stool[2] + 0.12);
      f.armL((n.trTalks ?? 0) > 0.5 ? hand : null);
      nodHead(f, (n.trNods ?? 0) > 0.5 ? 0.12 + 0.1 * Math.sin(t * 3) : 0.34 - 0.22 * clamp01(better));
    } else {
      traveller.hide();
      theirBottle.visible = false;
    }
  };
  drive(g, out, spots, tools, show);
  const drawn = out.away!;
  // Off on a tour: everyone's aboard, the coach pulls out along the road, and comes back.
  let state: 'parked' | 'leaving' | 'gone' | 'back' | undefined;
  let since = 0;
  const RUN = 11;
  out.away = (isOut, t) => {
    drawn(isOut, t);
    if (state === undefined) state = isOut ? 'gone' : 'parked';
    else if (isOut && (state === 'parked' || state === 'back')) [state, since] = ['leaving', t];
    else if (!isOut && (state === 'leaving' || state === 'gone')) [state, since] = ['back', t];
    let x = 0;
    if (state === 'leaving') {
      const u = clamp01((t - since) / 6);
      x = RUN * u * u;
      if (u >= 1) state = 'gone';
    } else if (state === 'back') {
      const u = clamp01((t - since) / 6);
      x = -RUN * (1 - u) * (1 - u);
      if (u >= 1) state = 'parked';
    } else if (state === 'gone') x = RUN;
    bus.position.x = x;
    bus.visible = state !== 'gone';
    const aboard = isOut || state === 'back';
    for (const h of heads) h.visible = aboard;
    driver.visible = aboard;
    windowFlag.visible = aboard;
  };
  out.work = marker(g, BUS.doorX, 1.1, 0.6);
}

// =============================================================================================
// 안내 책자 진열대 (tgBrochureRack, 2 × 1).

function brochureRack(g: THREE.Group, out: Built) {
  const F = BR.face;
  const H = 1.82;
  part(g, box(1.9, H, 0.03), TEAL_D, 0, H / 2, F - 0.06);
  for (const sx of [-1, 1]) {
    part(g, box(0.04, H, 0.3), WALNUT, sx * 0.93, H / 2, F + 0.06);
    part(g, box(0.06, 0.04, 0.5), GRAPHITE, sx * 0.93, 0.02, F + 0.1, { outline: false });
  }
  const sign = painted('tgRackSign', 512, 64, (c) => {
    paperCanvas(c, 512, 64, TEAL);
    text(c, `${CO} 여행 안내 · 가져가세요`, 256, 33, 34, '#ffffff', 'center');
  });
  picture(g, sign, 1.8, 0.2, 0, H - 0.12, F - 0.043);
  // Every pocket with its lip; the brochures, a place to each; the empties are the ones a hand fills.
  const empty = new Set(BR_EMPTY.map(([cx, r]) => `${cx}|${r}`));
  let n0 = 0;
  BR.rows.forEach((y, r) => {
    part(g, box(1.8, 0.018, 0.09), WALNUT, 0, y, F + 0.0, { outline: false });
    BR.cols.forEach((x, cx) => {
      part(g, box(0.25, 0.1, 0.008), CREAM, x, y + 0.05, F + 0.045, { outline: false });
      if (empty.has(`${cx}|${r}`)) return;
      picture(g, brochureTex(n0++), 0.21, 0.28, x, y + 0.14, F + 0.012, '#ffffff', 0, -0.1);
    });
  });
  // Lips in front of the brochures are drawn above; those that fill.
  const filled = BR_EMPTY.map((_, i) => picture(g, brochureTex(i + 3), 0.21, 0.28, 0, 0, 0, '#ffffff', 0, -0.1));
  // The carton it comes from.
  part(g, box(0.42, 0.32, 0.34), '#c79f6b', BR.crate[0] + 0.1, 0.16, BR.crate[2] + 0.1);
  part(g, box(0.42, 0.012, 0.05), '#a57d4b', BR.crate[0] + 0.1, 0.325, BR.crate[2] + 0.1, { outline: false });
  label(g, '안내 책자', 0.2, 0.06, BR.crate[0] + 0.1, 0.2, BR.crate[2] + 0.272, '#c79f6b', '#3f2d15');
  // The stack, on the left arm.
  const stack = group(g);
  stack.name = 'tgBrochureStack';
  const tiltS = group(stack);
  tiltS.rotation.x = -0.5;
  const pile = part(tiltS, box(0.22, 0.29, 0.06), '#e8e4d6', 0, 0, 0, { outline: false });
  const topP = picture(tiltS, brochureTex(2), 0.21, 0.28, 0, 0, 0.032);
  const tools: Partial<Record<TgTool, HeldTool>> = { stack: { tool: stack, lead: 'left', grips: { left: { ...boardGrip(0.5), radius: 0.03 } } } };
  const spots: Record<string, Spot> = { tgRestock: standAt(g, 'tgRestock', 0, BR.stand) };
  const show = (_now: string | null, N: TgNow | null) => {
    const n = N?.n ?? {};
    BR_EMPTY.forEach((_, i) => {
      const f = N ? clamp01(n[`f${i}`] ?? 0) : 1;
      const m = filled[i];
      const p = brSlot(i, 0.012);
      m.visible = f > 0.01;
      m.position.set(p[0], p[1] + (1 - f) * 0.1, p[2] + (1 - f) * 0.06);
    });
    at(stack, N?.tool === 'stack' ? N.props.stack : null);
    const left = clamp01(n.left ?? 1);
    pile.scale.z = 0.3 + 0.7 * left;
    topP.position.z = 0.006 + 0.026 * (0.3 + 0.7 * left);
  };
  drive(g, out, spots, tools, show);
  out.work = marker(g, 0, 1.2, F + 0.1);
}

// =============================================================================================
// 여권·사증 창구 (tgDocCounter, 2 × 1). Placed facing back into the room: the far side (-z) is the customer's and the camera's.

function docCounter(g: THREE.Group, out: Built) {
  const T = DC.top;
  part(g, box(1.9, T - 0.03, 0.56), CREAM, 0, (T - 0.03) / 2, -0.01);
  part(g, rbox(1.96, 0.04, 0.72, 0.012), WALNUT, 0, T - 0.02, -0.01);
  part(g, box(1.9, 0.1, 0.01), WALNUT, 0, 0.05, -0.295, { outline: false });
  part(g, box(1.5, 0.3, 0.01), TEAL, 0, 0.62, -0.295, { outline: false });
  label(g, '여권 · 사증 접수 창구', 1.3, 0.22, 0, 0.62, -0.302, TEAL, '#fdf7e3', Math.PI);
  // A little sign of what to bring, the forms in a tray, the ink, the stamp's stand, a pen's block.
  part(g, box(0.3, 0.2, 0.012), WALNUT, -0.72, T + 0.1, -0.26, { rx: 0.2, outline: false });
  label(g, '준비 서류 안내', 0.27, 0.07, -0.72, T + 0.13, -0.27, CREAM, INK, Math.PI);
  part(g, box(0.28, 0.03, 0.34), GRAPHITE, -0.68, T + 0.015, 0.1, { outline: false });
  for (let i = 0; i < 5; i++) part(g, box(0.21, 0.004, 0.29), i % 2 ? PAPER : '#e3efe9', -0.68 + 0.003 * (i % 3), T + 0.035 + i * 0.005, 0.1, { ry: 0.03 * (i - 2), outline: false });
  part(g, rbox(0.13, 0.016, 0.1, 0.004), '#2b1616', DC.ink[0], T + 0.008, DC.ink[2], { outline: false });
  part(g, box(0.115, 0.002, 0.085), SEAL, DC.ink[0], T + 0.017, DC.ink[2], { outline: false });
  part(g, rbox(0.11, 0.008, 0.11, 0.004), GREY_D, DC.stampHome[0], T + 0.004, DC.stampHome[2], { outline: false });
  // A small date stand, a bell for the customer.
  part(g, cyl(0.03, 0.04, 0.03, 12), '#c49a3c', 0.76, T + 0.015, -0.24);
  part(g, ball(0.02), '#c49a3c', 0.76, T + 0.04, -0.24, { outline: false });
  // The form.
  const formG = group(g);
  const form = liveScreen(formG, 0.2, 0.28, 180, 252, 0, 0, 0, 0, -Math.PI / 2);
  const pen = penTool(g, '#14224e');
  // The passport: a little booklet of an invented state, shut on the counter or open with its photo up in the left hand.
  const pass = group(g);
  pass.name = 'tgPassport';
  const tiltP = group(pass);
  part(tiltP, box(0.2, 0.135, 0.012), '#233a6b', 0, 0, 0, { outline: false });
  const inner = liveScreen(tiltP, 0.19, 0.125, 190, 125, 0, 0, 0.0065);
  const cover = liveScreen(tiltP, 0.095, 0.13, 95, 130, 0.05, 0, 0.007);
  const stamp = group(g);
  stamp.name = 'tgStamp';
  part(stamp, cyl(0.016, 0.018, 0.09, 12), '#20242b', 0, 0.002, 0, { outline: false });
  part(stamp, cyl(0.02, 0.018, 0.016, 14), '#20242b', 0, 0.052, 0, { outline: false });
  part(stamp, cyl(0.024, 0.024, 0.012, 14), '#c49a3c', 0, -0.05, 0, { outline: false });
  part(stamp, cyl(0.032, 0.032, 0.022, 16), '#3a2616', 0, -STAMP_UP + 0.012, 0, { outline: false });
  part(stamp, cyl(0.03, 0.03, 0.002, 16), SEAL, 0, -STAMP_UP + 0.001, 0, { outline: false });
  const tools: Partial<Record<TgTool, HeldTool>> = {
    stamp: { tool: stamp, lead: 'right', grips: stampGrip },
    pen: pen.held,
    passport: { tool: pass, lead: 'left', grips: { left: boardGrip(0.55, { down: 0.015 }) } },
  };
  const client = lazy(() => person(g, '#a1887f', '#37474f', '#1a1a1a', DC.client[0], DC.client[1], 0, 'male'));
  const spots: Record<string, Spot> = { tgVisa: standAt(g, 'tgVisa', DC.x, DC.stand) };
  const reach = new THREE.Vector3();
  const show = (_now: string | null, N: TgNow | null, t: number) => {
    const n = N?.n ?? {};
    const sealed = n.sealed ?? 0;
    const ticks = n.ticks ?? 0;
    const gone = n.gone ?? 0;
    const round = N?.b.n ?? 0;
    const on = (n.onCounter ?? 0) > 0.5 && gone < 0.98;
    const dest = place(wrap(round, PLACES.length));
    formG.visible = on;
    if (on) {
      formG.position.set(DC.form[0] + (DC.away[0] - DC.form[0]) * gone, T + 0.005, DC.form[2] + (DC.away[2] - DC.form[2]) * gone);
      form.draw(`${wrap(round, PLACES.length)}|${q(ticks, 2)}|${q(sealed, 6)}|${q(n.hi, 1)}`, (c) => {
        paperCanvas(c, 180, 252);
        c.strokeStyle = '#7f9a94';
        c.lineWidth = 2;
        c.strokeRect(5, 5, 170, 242);
        text(c, `${dest.name} 사증`, 90, 24, 15, TEAL_D, 'center');
        text(c, '방문 신청서 (가-7호)', 90, 44, 12, GREY_D, 'center', false);
        ['이름·사진', '여권 번호', '머무는 날짜', '돌아올 표'].forEach((s, i) => {
          const y = 76 + i * 28;
          c.strokeStyle = '#6b7a78';
          c.lineWidth = 1.5;
          c.strokeRect(14, y - 8, 16, 16);
          text(c, s, 38, y, 13, INK, 'left', false);
          if (ticks > i + 0.5) {
            c.strokeStyle = GREEN;
            c.lineWidth = 3;
            c.beginPath();
            c.moveTo(16, y);
            c.lineTo(21, y + 5);
            c.lineTo(29, y - 7);
            c.stroke();
          }
        });
        if ((n.hi ?? 0) > 0.5) {
          c.fillStyle = 'rgba(255,214,70,0.4)';
          c.fillRect(10, 66, 160, 20);
        }
        if (sealed > 0.02) {
          c.globalAlpha = clamp01(sealed);
          c.strokeStyle = SEAL;
          c.lineWidth = 4;
          c.beginPath();
          c.arc(126, 210, pos(26), 0, 6.3);
          c.stroke();
          text(c, '접수', 126, 210, 20, SEAL, 'center');
          c.globalAlpha = 1;
        }
      });
    }
    const inHand = N?.tool === 'passport';
    at(pass, N?.props.pass ?? null, DC.pass);
    pass.visible = !!N;
    tiltP.rotation.x = inHand ? -0.55 : -Math.PI / 2;
    const open = (n.passOpen ?? 0) > 0.5;
    inner.mesh.visible = open;
    cover.mesh.visible = !open;
    if (N) {
      inner.draw(`${wrap(round, 4)}`, (c) => {
        paperCanvas(c, 190, 125, '#ece5d0');
        c.fillStyle = '#c7b89a';
        c.fillRect(8, 16, 56, 72);
        c.fillStyle = SKIN;
        c.beginPath();
        c.arc(36, 44, 16, 0, 6.3);
        c.fill();
        c.fillStyle = '#1a1a1a';
        c.fillRect(20, 26, 32, 11);
        c.fillStyle = '#556';
        c.fillRect(16, 68, 40, 20);
        ['방문자', `번호 가${wrap(round, 4) + 3}17`, '구름나들 대행'].forEach((s, i) => text(c, s, 72, 28 + i * 20, 12, INK, 'left', false));
        c.fillStyle = '#7c6f54';
        for (let i = 0; i < 2; i++) c.fillRect(8, 98 + i * 10, 174, 3);
      });
      cover.draw('cover', (c) => {
        paperCanvas(c, 95, 130, '#233a6b');
        c.strokeStyle = '#d6b45a';
        c.lineWidth = 2;
        c.beginPath();
        c.arc(47, 54, pos(20), 0, 6.3);
        c.stroke();
        text(c, '여권', 47, 100, 18, '#d6b45a', 'center');
      });
    }
    at(pen.root, N?.props.pen ?? null, DC.penHome);
    at(stamp, N?.props.stamp ?? null, [DC.stampHome[0], DC.stampHome[1] + STAMP_UP, DC.stampHome[2]]);
    if ((n.client ?? 0) > 0.5) {
      const f = client.get();
      f.root.visible = true;
      reach.set(DC.away[0] - 0.08, T + 0.04 + (n.clTalks ?? 0) * 0.08 * Math.max(0, Math.sin(t * 3)), DC.away[2] - 0.02);
      f.armR((n.clReach ?? 0) > 0.5 || (n.clTalks ?? 0) > 0.5 ? reach : null);
      f.armL(null);
      nodHead(f, (n.clBow ?? 0) > 0.5 ? 0.34 : 0.12);
    } else client.hide();
  };
  drive(g, out, spots, tools, show);
  out.work = marker(g, DC.form[0], DC.form[1], DC.form[2]);
}

// =============================================================================================
// 수하물·장비 탁자 (tgGearTable, 2 × 1).

const TAG_COLOURS = ['#e8603c', '#2f6fd0', '#2e9e6b', '#ffb74d'];
function gearTable(g: THREE.Group, out: Built) {
  const T = GT.top;
  part(g, rbox(1.9, 0.05, 0.72, 0.012), OAK, 0, T - 0.025, -0.08);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.05, T - 0.05, 0.05), GREY_D, sx * 0.86, (T - 0.05) / 2, -0.08 + sz * 0.3, { outline: false });
  part(g, box(1.72, 0.03, 0.6), WALNUT, 0, 0.3, -0.08, { outline: false });
  // Under it: spare cartons of vests and rain ponchos.
  part(g, box(0.5, 0.26, 0.46), '#c79f6b', -0.48, 0.45, -0.08);
  label(g, '조끼', 0.18, 0.08, -0.48, 0.46, 0.156, '#c79f6b', '#3f2d15');
  part(g, box(0.5, 0.26, 0.46), '#c79f6b', 0.2, 0.45, -0.08);
  label(g, '우비', 0.18, 0.08, 0.2, 0.46, 0.156, '#c79f6b', '#3f2d15');
  // On it. The box of blank tags and the cut thread.
  part(g, box(0.2, 0.04, 0.14), '#3b4248', GT.tags[0], T + 0.02, GT.tags[2], { outline: false });
  for (let i = 0; i < 4; i++) part(g, box(0.05, 0.003, 0.1), TAG_COLOURS[i], GT.tags[0] - 0.066 + i * 0.044, T + 0.042, GT.tags[2], { outline: false });
  // The suitcase standing on the table, its handle where a hand gets to.
  const C = GT.case;
  part(g, rbox(0.34, 0.24, 0.17, 0.03), '#37617a', C[0], T + 0.13, C[2] + 0.02);
  for (const x of [-0.11, 0, 0.11]) part(g, box(0.012, 0.22, 0.175), '#2c4f64', C[0] + x, T + 0.13, C[2] + 0.02, { outline: false });
  rod(g, v3(C[0] - 0.05, T + 0.25, C[2] + 0.03), v3(C[0] - 0.05, GT.handle[1], GT.handle[2]), 0.006, GRAPHITE);
  rod(g, v3(C[0] + 0.05, T + 0.25, C[2] + 0.03), v3(C[0] + 0.05, GT.handle[1], GT.handle[2]), 0.006, GRAPHITE);
  part(g, rbox(0.14, 0.018, 0.022, 0.006), GRAPHITE, GT.handle[0], GT.handle[1], GT.handle[2], { outline: false });
  // The tied tag.
  const tiedTags = TAG_COLOURS.map((col) => part(g, box(0.05, 0.1, 0.004), col, GT.handle[0] - 0.02, GT.handle[1] - 0.075, GT.handle[2] + 0.015, { outline: false }));
  const thread = part(g, box(0.003, 0.03, 0.003), PAPER, GT.handle[0] - 0.02, GT.handle[1] - 0.015, GT.handle[2] + 0.012, { outline: false });
  // The charging rack of tour receivers.
  part(g, rbox(0.66, 0.05, 0.13, 0.012), GRAPHITE, GT.rack[0] + 0.25, T + 0.025, GT.rack[2]);
  const recs = [0, 1, 2, 3, 4, 5].map((i) => {
    const p = gtSlot(i);
    const m = group(g, p[0], p[1], p[2]);
    part(m, rbox(0.044, 0.09, 0.02, 0.006), '#3b4248', 0, 0, 0, { outline: false });
    part(m, box(0.03, 0.03, 0.002), '#7be3c7', 0, 0.018, 0.0105, { outline: false });
    return m;
  });
  const lamps = [0, 1, 2, 3, 4, 5].map((i) => {
    const p = gtSlot(i);
    return ownLit(g, ball(0.007), '#7a2020', p[0], T + 0.056, p[2] + 0.052);
  });
  const testBtn = ownLit(g, cyl(0.016, 0.016, 0.01, 10), '#ffa000', GT.rack[0] + 0.5, T + 0.055, GT.rack[2] + 0.02);
  // Flags in a bucket at the back, low enough to be seen over; a stack of folded vests.
  part(g, cyl(0.11, 0.09, 0.2, 14), '#546e7a', 0.42, T + 0.1, -0.3);
  for (let i = 0; i < 3; i++) {
    const x = 0.38 + i * 0.04;
    rod(g, v3(x, T + 0.05, -0.3), v3(x - 0.04 + i * 0.04, T + 0.6, -0.33), 0.006, '#ece7da');
    part(g, box(0.16, 0.1, 0.006), [TEAL, SUN, CORAL][i], x - 0.04 + i * 0.04 + 0.08, T + 0.55, -0.33, { outline: false });
  }
  for (let i = 0; i < 4; i++) part(g, rbox(0.26, 0.022, 0.2, 0.006), i % 2 ? '#ffb300' : '#ffca28', 0.75, T + 0.012 + i * 0.022, -0.2, { outline: false });
  // The check-off sheet.
  const sheet = liveScreen(g, 0.16, 0.22, 144, 198, GT.sheet[0], T + 0.003, GT.sheet[2], 0, -Math.PI / 2);
  const pen = penTool(g, '#14224e');
  // The writing tag, then the tag in the hand.
  const tag = group(g);
  tag.name = 'tgLuggageTag';
  const tiltT = group(tag);
  const face = liveScreen(tiltT, 0.13, 0.06, 130, 60, 0, 0, 0.0015);
  part(tiltT, box(0.135, 0.065, 0.002), TAG_COLOURS[0], 0, 0, 0, { outline: false });
  // The receiver in the hand.
  const radio = group(g);
  radio.name = 'tgReceiver';
  part(radio, rbox(0.044, 0.09, 0.02, 0.006), '#3b4248', 0, 0, 0, { outline: false });
  const radLamp = ownLit(radio, ball(0.006), '#7a2020', 0, 0.03, 0.012);
  rod(radio, v3(0, 0.045, 0), v3(0.02, 0.06, 0.03), 0.003, GRAPHITE);
  const tools: Partial<Record<TgTool, HeldTool>> = {
    pen: pen.held,
    tag: { tool: tag, lead: 'right', grips: { right: { at: v3(-0.05, 0, 0), axis: v3(0, 1, 0), shape: 'pinch', radius: 0.006 } } },
    radio: { tool: radio, lead: 'right', grips: { right: { at: v3(0, -0.01, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.022 } } },
  };
  const spots: Record<string, Spot> = {
    tgTags: standAt(g, 'tgTags', -0.06, GT.stand),
    tgRadio: standAt(g, 'tgRadio', -0.08, GT.stand),
  };
  const show = (now: string | null, N: TgNow | null, t: number) => {
    const n = N?.n ?? {};
    const round = N?.b.n ?? 0;
    const tags = now === 'tgTags';
    const radios = now === 'tgRadio';
    // Tags.
    const inTag = tags && (n.inTag ?? 0) > 0.5;
    at(tag, inTag ? N?.props.tag : null);
    tiltT.rotation.x = N?.tool === 'tag' ? -0.5 : -Math.PI / 2;
    if (inTag) {
      const lines = n.lines ?? 0;
      face.draw(`${wrap(round, 4)}|${q(lines, 2)}`, (c) => {
        paperCanvas(c, 130, 60, TAG_COLOURS[wrap(round, TAG_COLOURS.length)]);
        c.fillStyle = '#ffffff';
        c.fillRect(4, 4, 122, 52);
        if (lines > 0.5) text(c, `${place(round).name}`, 8, 18, 12, INK);
        if (lines > 1.5) text(c, `${wrap(round, 40) + 1}번 손님`, 8, 38, 12, INK, 'left', false);
        if (lines > 2.5) text(c, CO, 122, 48, 9, TEAL, 'right');
      });
    }
    const showTied = tags ? (n.tied ?? 0) > 0.5 : true;
    thread.visible = showTied;
    tiedTags.forEach((m, i) => {
      m.visible = showTied && i === wrap(round, TAG_COLOURS.length);
      m.rotation.z = 0.08 * Math.sin(t * 1.4);
    });
    // Receivers.
    const slot = wrap(n.slot ?? 0, 6);
    recs.forEach((m, i) => (m.visible = !(radios && i === slot && (n.out ?? 0) > 0.5)));
    lamps.forEach((m, i) => setLit(m, radios ? (i < (n.ticks ?? 0) ? '#66bb6a' : '#7a2020') : i < 4 ? '#66bb6a' : '#7a2020'));
    const inRadio = radios && N?.tool === 'radio';
    at(radio, inRadio ? N?.props.radio : null);
    setLit(radLamp, (n.ok ?? 0) > 0.5 ? '#66bb6a' : '#d9a520');
    setLit(testBtn, (n.press ?? 0) > 0.5 ? '#fff176' : '#ffa000');
    at(pen.root, N?.props.pen ?? null, [GT.writing[0] + 0.2, T + 0.02, GT.writing[2] - 0.14]);
    const ticks = radios ? (n.ticks ?? 0) : 4;
    sheet.draw(`${q(ticks, 2)}`, (c) => {
      paperCanvas(c, 144, 198);
      text(c, '수신기 점검표', 72, 14, 12, TEAL_D, 'center');
      for (let i = 0; i < 6; i++) {
        const y = 40 + i * 26;
        text(c, `${i + 1}번`, 10, y, 12, INK, 'left', false);
        c.strokeStyle = '#6b7a78';
        c.lineWidth = 1.5;
        c.strokeRect(108, y - 8, 16, 16);
        if (ticks > i + 0.5) {
          c.strokeStyle = GREEN;
          c.lineWidth = 3;
          c.beginPath();
          c.moveTo(110, y);
          c.lineTo(114, y + 5);
          c.lineTo(122, y - 7);
          c.stroke();
        }
      }
    });
  };
  drive(g, out, spots, tools, show);
  out.work = marker(g, GT.writing[0], GT.writing[1], GT.writing[2]);
}

// =============================================================================================
// 단체 사진 벽 (tgPhotoWall, 2 × 1).

/** A group shot: a place of no real name behind, a row of people, a banner. */
function paintGroup(c: Ctx2, w: number, h: number, i: number) {
  const P = place(i);
  const sky = ['#a6dbea', '#ffd9a8', '#b8e0b8', '#d7c9f1'][wrap(i, 4)];
  c.fillStyle = sky;
  c.fillRect(0, 0, w, h);
  c.fillStyle = ['#5f9e7e', '#c98b53', '#6f9d62', '#7f6fb0'][wrap(i, 4)];
  c.beginPath();
  c.moveTo(0, h * 0.62);
  for (let k = 0; k <= 8; k++) c.lineTo((k / 8) * w, h * (0.42 + 0.12 * Math.sin(k * 1.7 + i)));
  c.lineTo(w, h);
  c.lineTo(0, h);
  c.fill();
  const n = 6 + wrap(i, 4);
  const tops = ['#ef9a9a', '#90caf9', '#ffe082', '#a5d6a7', '#ce93d8', '#ffab91'];
  for (let r = 0; r < 2; r++)
    for (let k = 0; k < n - r; k++) {
      const x = ((k + 0.5 + r * 0.5) / n) * w;
      const y = h * (0.56 + r * 0.16);
      c.fillStyle = tops[wrap(k + r + i, tops.length)];
      c.fillRect(x - 8, y + 7, 16, 22);
      c.fillStyle = '#f1c9a5';
      c.beginPath();
      c.arc(x, y, pos(7), 0, 6.3);
      c.fill();
      c.fillStyle = wrap(k + i, 3) ? '#2b1b10' : '#5b3a1e';
      c.beginPath();
      c.arc(x, y - 2, pos(7), Math.PI, 0);
      c.fill();
    }
  c.fillStyle = TEAL;
  c.fillRect(w * 0.12, h * 0.08, w * 0.76, 20);
  text(c, `${P.name} 단체`, w / 2, h * 0.08 + 11, 13, '#ffffff', 'center');
  c.strokeStyle = '#ffffff';
  c.lineWidth = 6;
  c.strokeRect(0, 0, w, h);
}
const groupTex = (i: number) => painted(`tgGroupPhoto${wrap(i, 8)}`, 192, 132, (c) => paintGroup(c, 192, 132, i));
function photoWall(g: THREE.Group, out: Built) {
  const F = PW.face;
  part(g, box(1.84, 1.3, 0.03), WALNUT, 0, 1.28, F - 0.018);
  for (const sx of [-1, 1]) part(g, box(0.05, 1.93, 0.04), WALNUT, sx * 0.92, 0.965, F - 0.03);
  const cork = painted('tgCork', 256, 180, (c) => {
    c.fillStyle = '#c9a26f';
    c.fillRect(0, 0, 256, 180);
    for (let i = 0; i < 700; i++) {
      c.fillStyle = i % 2 ? 'rgba(90,60,30,0.14)' : 'rgba(255,240,210,0.14)';
      c.fillRect((i * 37) % 256, (i * 61) % 180, 2, 2);
    }
  });
  picture(g, cork, 1.76, 1.22, 0, 1.28, F);
  label(g, `${CO}와 함께한 여행`, 0.9, 0.11, 0, 1.815, F + 0.006, TEAL, '#ffffff');
  // Photos already up, each with a pin; the four spots left for the new.
  const fixed: Array<[number, number, number]> = [[-0.68, 1.56, 0], [-0.68, 1.26, 1], [-0.68, 0.98, 2], [0, 1.56, 3], [0, 1.26, 4], [0, 0.98, 5], [0.66, 1.56, 6], [0.66, 1.26, 7]];
  fixed.forEach(([x, y, i]) => {
    picture(g, groupTex(i), 0.3, 0.21, x, y, F + 0.012, '#ffffff', 0, 0);
    part(g, ball(0.012), i % 2 ? CORAL : '#2f6fd0', x, y + 0.09, F + 0.024, { outline: false });
  });
  const newOnes = [0, 1, 2, 3].map((i) => {
    const p = pwSlot(i);
    const m = picture(g, groupTex(i + 2), 0.26, 0.18, p[0], p[1], p[2]);
    const pin = part(g, ball(0.012), SUN, p[0], p[1] + 0.075, p[2] + 0.012, { outline: false });
    return { m, pin };
  });
  // The ledge, with the new prints in their envelope.
  part(g, rbox(0.46, 0.024, 0.18, 0.008), OAK, PW.ledge[0], PW.ledge[1] - 0.012, PW.ledge[2]);
  for (const sx of [-0.18, 0.18]) rod(g, v3(PW.ledge[0] + sx, PW.ledge[1] - 0.03, F - 0.01), v3(PW.ledge[0] + sx, PW.ledge[1] - 0.22, F + 0.0), 0.01, GREY_D);
  part(g, box(0.28, 0.02, 0.14), '#c79f6b', PW.ledge[0], PW.ledge[1] + 0.012, PW.ledge[2], { outline: false });
  // The photo in the hand.
  const photo = group(g);
  photo.name = 'tgPhoto';
  const photoM = picture(photo, groupTex(0), 0.26, 0.18, 0, 0, 0.0015);
  part(photo, box(0.262, 0.182, 0.002), PAPER, 0, 0, 0, { outline: false });
  const tools: Partial<Record<TgTool, HeldTool>> = { photo: { tool: photo, lead: 'right', grips: { right: { at: v3(0.1, -0.06, 0), axis: v3(0, 1, 0), shape: 'pinch', radius: 0.006 } } } };
  const spots: Record<string, Spot> = { tgPinPhoto: standAt(g, 'tgPinPhoto', 0.34, PW.back) };
  const show = (_now: string | null, N: TgNow | null) => {
    const n = N?.n ?? {};
    const slot = wrap(n.slot ?? 0, 4);
    newOnes.forEach(({ m, pin }, i) => {
      // A round's own photo isn't up until it's pinned; those before it are.
      const on = !N || i !== slot || (n.placed ?? 0) > 0.5;
      m.visible = pin.visible = on;
    });
    const held = N?.tool === 'photo';
    at(photo, held ? N?.props.photo : null);
    if (held) (photoM.material as THREE.MeshBasicMaterial).map = groupTex(slot + 2);
  };
  drive(g, out, spots, tools, show);
  out.work = marker(g, 0, 1.3, F + 0.05);
}

// =============================================================================================
// 여행사 안내판 (tgAgencySign, 1 × 1): decor.

function agencySign(g: THREE.Group) {
  part(g, cyl(0.16, 0.2, 0.03, 16), GRAPHITE, 0, 0.015, -0.1);
  part(g, cyl(0.016, 0.016, 1.1, 10), GRAPHITE, 0, 0.56, -0.1, { outline: false });
  part(g, box(0.72, 0.92, 0.03), WALNUT, 0, 0.94, -0.12);
  const tex = painted('tgSignBoard', 288, 370, (c) => {
    paperCanvas(c, 288, 370, CREAM);
    c.fillStyle = TEAL;
    c.fillRect(0, 0, 288, 92);
    text(c, CO, 144, 34, 34, '#ffffff', 'center');
    text(c, '여행사', 144, 72, 18, TEAL_L, 'center');
    ['여행 상담 · 일정 짜기', '여권 · 사증 대행', '단체 관광 · 가이드', '이달의 여행지'].forEach((s, i) => text(c, s, 22, 120 + i * 34, 18, i === 3 ? CORAL : INK, 'left', i === 3));
    ['나르벨 제도 5일', '아셀린 호수 3일'].forEach((s, i) => text(c, s, 34, 280 + i * 30, 17, INK, 'left', false));
  });
  picture(g, tex, 0.68, 0.88, 0, 0.94, -0.102);
}

export const BUILDERS: Record<string, Builder> = {
  // The street front, the shop next door, the meeting point (2026-11-05, the layout audit; shopFront.ts).
  tgFront(g) {
    shopFront(g, { ax: 1, x0: 2, x1: 18, door: 12, name: `${CO} 여행`, sub: '국내 · 해외 패키지 · 단체 여행', bg: TEAL, fg: '#ffffff', frame: '#455a64', awning: TEAL_D, posters: [['제주 2박 3일 299,000원~', '#fff8e1', TEAL_D, 4.5], ['단풍 당일 여행', '#fff3e0', '#e65100', 8.5], ['해외 패키지 상담', '#e0f2f1', TEAL_D, 15.5]] });
  },
  tgNeighbor(g, W, D) {
    neighbourShop(g, W, D, { name: '해솔 약국', color: '#2e7d32', wall: '#e8e4da' });
  },
  /** 단체 집결 피켓 (on the pavement by the coach): a pole with the agency's flag and the board telling the group where to gather and when. */
  tgMeetSign(g) {
    part(g, cyl(0.03, 0.03, 2.4, 8), '#90a4ae', 0, 1.2, 0);
    part(g, cyl(0.16, 0.18, 0.06, 14), '#607d8b', 0, 0.03, 0);
    part(g, box(0.5, 0.34, 0.01), SUN, 0.26, 2.2, 0);
    label(g, CO, 0.4, 0.12, 0.26, 2.22, 0.008, SUN, TEAL_D);
    part(g, rbox(0.8, 0.56, 0.03, 0.01), TEAL, 0, 1.45, 0.03);
    label(g, `${CO} 여행 집결`, 0.72, 0.16, 0, 1.56, 0.05, TEAL, '#ffffff');
    label(g, '단풍 당일 · 07:30 출발', 0.72, 0.12, 0, 1.36, 0.05, TEAL, '#fff8e1');
  },
  itineraryDesk(g, _W, _D, _c, _def, _ctx, out) {
    itineraryDesk(g, out);
  },
  travelMap(g, _W, _D, _c, _def, _ctx, out) {
    travelMap(g, out);
  },
  tourBus(g, _W, _D, _c, _def, _ctx, out) {
    tourBus(g, out);
  },
  tgMateDesk(g, _W, _D, _c, _def, _ctx, out) {
    mateDesk(g, out);
  },
  tgBrochureRack(g, _W, _D, _c, _def, _ctx, out) {
    brochureRack(g, out);
  },
  tgDocCounter(g, _W, _D, _c, _def, _ctx, out) {
    docCounter(g, out);
  },
  tgGearTable(g, _W, _D, _c, _def, _ctx, out) {
    gearTable(g, out);
  },
  tgPhotoWall(g, _W, _D, _c, _def, _ctx, out) {
    photoWall(g, out);
  },
  tgAgencySign(g) {
    agencySign(g);
  },
};
