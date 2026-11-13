import * as THREE from 'three';
import type { HeldTool } from '../handTool';
import { boardGrip } from '../handTool';
import { SPACE_DETAIL, centrifugeArm, hazardRing, own, twoSided } from '../furnitureSpace';
import { marker, rod, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, gradient, part, rbox } from '../toon';
import { BLACK, CHROME, label, painted, picture, seeded, text } from './doctor';
import { AT, GB, LG, MC, PEN_DIR, PEN_UP, PW, SD, SR, SV, asNow, asPhase, cardSlot, wrap } from './astronautMotion';
import type { AsMotion, AsNow, AsTool } from './astronautMotion';
import type { V } from './busDriverMotion';
import { vroidFigure, type FigureOptions } from './vroidFigure';

/**
 * The 우주 센터 drawn as itself (2026-11-01), under the invented agency 하늘마루 우주기구 and its invented mission 별마루 7호. A control room:
 * consoles whose screens run the go/no-go poll, the crew's loop and a red anomaly, under a big ground-track wall over an invented
 * world which shows whatever training is going on in the room right now (the mock-up, the centrifuge, the rig, the arm). A low-gravity
 * rig with a travelling cable; a robotic-arm trainer with two hand controllers; a science glovebox; a survival corner of parachute,
 * stake and fire; a suit on its stand and a fitting rack with helmets carried in the hands; a press and school-visit wall. The
 * centrifuge, mock-up and wind tunnel are furnitureSpace.ts's and stay as they are. Everything that moves follows astronautMotion.ts.
 */

const AGENCY = '하늘마루 우주기구';
const MISSION = '별마루 7호';
const STATION = '마루 정거장';
const NAVY = '#16263f';
const NAVY_L = '#27496d';
const PANEL = '#dfe4e8';
const SHELL = '#f2f4f5';
const GREY = '#8f979c';
const GREY_D = '#566066';
const GRAPHITE = '#2f363c';
const STEEL = '#aeb6bc';
const ORANGE = '#ef6c00';
const GOLD = '#e0a526';
const RED = '#d32f2f';
const GREEN = '#66bb6a';
const AMBER = '#ffca28';
const SCREEN_BG = '#07131f';
const TEAL = '#4dd0c4';
const SKIN = '#f1c9a5';
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UP = v3(0, 1, 0);
const tmp = new THREE.Vector3();
type Ctx2 = CanvasRenderingContext2D;
const q = (x: number | undefined, steps = 20) => Math.round((x ?? 0) * steps);
const clamp01 = (x: number | undefined) => THREE.MathUtils.clamp(x ?? 0, 0, 1);
const pos = (r: number) => Math.max(0.5, r);
const NO = { outline: false } as const;

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
  const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide });
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
function standAt(g: THREE.Object3D, motion: AsMotion, x = 0, z = 0.6): Spot {
  const s = spot(g, 'stand', x, 0, z, Math.PI);
  s.motion = motion;
  return s;
}
function seatAt(g: THREE.Object3D, motion: AsMotion, seat: V): Spot {
  const s = spot(g, 'sit', seat[0], seat[1], seat[2], Math.PI, 0);
  s.motion = motion;
  return s;
}
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
function nowAt(spots: Record<string, Spot>, t: number): string | null {
  let best: string | null = null;
  for (const [k, s] of Object.entries(spots)) if (Math.abs(t - posedAt(s)) < 0.6 && (best === null || posedAt(s) > posedAt(spots[best]))) best = k;
  return best;
}
/** Every frame: which use is going on and where its script has got to; what the script says is in the hand goes in the hand. */
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, tools: Partial<Record<AsTool, HeldTool>>, show: (now: string | null, N: AsNow | null, t: number, H: number) => void) {
  out.spots = spots;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const H = (sp?.at.userData.height as number | undefined) ?? 1.6;
    const N = sp ? asNow(sp.motion as AsMotion, t, asPhase(g.getWorldPosition(tmp)), H) : null;
    show(now, N, t, H);
    for (const s of Object.values(spots)) s.held = s === sp && N?.tool ? (tools[N.tool] ?? null) : null;
  };
}
function limb(g: THREE.Object3D, r: number, color: string): (a: THREE.Vector3, b: THREE.Vector3) => void {
  const m = part(g, cyl(r, r * 0.9, 1, 8), color, 0, 0, 0, NO);
  const d = new THREE.Vector3();
  return (a, b) => {
    d.subVectors(b, a);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.scale.set(1, Math.max(0.001, d.length()), 1);
    if (d.lengthSq() > 1e-8) m.quaternion.setFromUnitVectors(UP, d.normalize());
  };
}
const vOf = (p: V) => v3(p[0], p[1], p[2]);

// ---------------------------------------------------------------------------------------------
// What's going on in the room: each training piece puts its spots on a list, and the wall and the consoles read who's at them.

type Mode = 'dock' | 'eva' | 'g' | 'low' | 'arm' | 'science' | 'survival' | 'launch' | 'comms' | 'anomaly';
const RANK: Record<Mode, number> = { anomaly: 9, dock: 6, eva: 6, g: 6, low: 6, arm: 6, science: 5, survival: 5, launch: 2, comms: 2 };
const MODE_LABEL: Record<Mode, string> = {
  anomaly: '이상 신호 대응',
  dock: '도킹 절차 훈련',
  eva: '선외 활동 절차',
  g: '원심 가속 훈련',
  low: '저중력 보행 훈련',
  arm: '로봇팔 포획 훈련',
  science: '궤도 과학 실험',
  survival: '귀환 후 생존 훈련',
  launch: '발사 데이터 감시',
  comms: `${STATION} 교신`,
};
interface Enrolled {
  g: THREE.Object3D;
  spots: Record<string, Spot>;
  mode: (k: string) => Mode;
}
const LIVE: Enrolled[] = [];
function enrol(g: THREE.Object3D, spots: Record<string, Spot> | undefined, mode: (k: string) => Mode) {
  if (!spots) return;
  LIVE.push({ g, spots, mode });
  if (LIVE.length > 48) LIVE.shift();
}
const topOf = (o: THREE.Object3D) => {
  let n = o;
  while (n.parent) n = n.parent;
  return n;
};
let seenT = Number.NaN;
let seenTop: THREE.Object3D | null = null;
let seenMode: Mode | null = null;
function liveMode(g: THREE.Object3D, t: number): Mode | null {
  const top = topOf(g);
  if (t === seenT && top === seenTop) return seenMode;
  let best: Mode | null = null;
  for (const e of LIVE) {
    if (topOf(e.g) !== top) continue;
    for (const [k, s] of Object.entries(e.spots)) {
      if (Math.abs(t - posedAt(s)) >= 0.6) continue;
      const m = e.mode(k);
      if (!best || RANK[m] > RANK[best]) best = m;
    }
  }
  seenT = t;
  seenTop = top;
  seenMode = best;
  return best;
}
/** A figure for what the mode is doing now, always in range. */
function metricOf(mode: Mode | null, t: number): string {
  const k = Math.abs(t);
  const p = (k % 40) / 40;
  switch (mode) {
    case 'dock':
      return `접근 거리 ${(38 * (1 - p)).toFixed(1)} m · 상대 속도 ${(0.06 + 0.3 * (1 - p)).toFixed(2)} m/s`;
    case 'eva':
      return `손잡이 ${1 + Math.floor(p * 12)} / 12 · 슈트 압력 29.6 kPa`;
    case 'g':
      return `가속 ${(3.2 + 1.6 * Math.sin(k * 0.7)).toFixed(1)} G · 심박 ${Math.round(118 + 14 * Math.sin(k * 0.4))}`;
    case 'low':
      return `하중 경감 ${Math.round(82 + 3 * Math.sin(k))}% · 보폭 ${(1.4 + 0.3 * Math.sin(k * 0.8)).toFixed(1)} m`;
    case 'arm':
      return `로봇팔 끝점 오차 ${(14 * (1 - p) + 0.4).toFixed(1)} cm`;
    case 'science':
      return `실험 ${1 + Math.floor(p * 4)} / 4 · 글러브박스 음압 정상`;
    case 'survival':
      return `비콘 신호 수신 · 회수조 대기`;
    case 'launch':
      return `발사 전 점검 T-${String(Math.floor((1 - p) * 40)).padStart(2, '0')}:00`;
    case 'comms':
      return `음성 고리 1 · 지연 ${(0.3 + 0.1 * Math.sin(k)).toFixed(1)} 초`;
    case 'anomaly':
      return '자세 제어 경보 — 절차서 4-2 수행';
    default:
      return `${STATION} 궤도 유지 · 전 계통 정상`;
  }
}

// ---------------------------------------------------------------------------------------------
// The invented world and the ground track.

let worldCanvas: HTMLCanvasElement | null = null;
const WORLD_W = 880;
const WORLD_H = 340;
function worldMap(): HTMLCanvasElement | null {
  if (worldCanvas) return worldCanvas;
  if (typeof document === 'undefined') return null;
  const can = document.createElement('canvas');
  can.width = WORLD_W;
  can.height = WORLD_H;
  const c = can.getContext('2d');
  if (!c) return null;
  c.fillStyle = '#0a2238';
  c.fillRect(0, 0, WORLD_W, WORLD_H);
  c.strokeStyle = 'rgba(120,180,210,0.16)';
  c.lineWidth = 1;
  for (let i = 1; i < 12; i++) {
    c.beginPath();
    c.moveTo((i * WORLD_W) / 12, 0);
    c.lineTo((i * WORLD_W) / 12, WORLD_H);
    c.stroke();
  }
  for (let i = 1; i < 6; i++) {
    c.beginPath();
    c.moveTo(0, (i * WORLD_H) / 6);
    c.lineTo(WORLD_W, (i * WORLD_H) / 6);
    c.stroke();
  }
  // Invented lands: blobs of overlapping ellipses, named by nobody real.
  const rnd = seeded(77);
  const lands: Array<[number, number, number, number, string]> = [
    [150, 110, 95, 58, '마루 대륙'],
    [330, 235, 80, 62, '너울 대륙'],
    [560, 110, 120, 52, '달빛 대륙'],
    [730, 240, 74, 46, '바람 군도'],
  ];
  c.fillStyle = '#2b6a5a';
  for (const [x, y, rx, ry] of lands) {
    for (let i = 0; i < 9; i++) {
      c.beginPath();
      c.ellipse(x + (rnd() - 0.5) * rx * 1.3, y + (rnd() - 0.5) * ry * 1.2, pos(rx * (0.35 + rnd() * 0.4)), pos(ry * (0.35 + rnd() * 0.4)), rnd() * 3, 0, Math.PI * 2);
      c.fill();
    }
  }
  for (const [x, y, , , name] of lands) text(c, name, x, y, 15, 'rgba(235,245,240,0.8)', 'center', false);
  // The ground stations.
  for (const [x, y, name] of [[190, 90, '제1 지상국'], [590, 95, '제2 지상국'], [345, 250, '제3 지상국']] as const) {
    c.fillStyle = AMBER;
    c.fillRect(x - 3, y - 3, 6, 6);
    text(c, name, x + 7, y - 9, 12, AMBER, 'left', false);
  }
  worldCanvas = can;
  return can;
}
const trackY = (lon: number) => WORLD_H / 2 + 118 * Math.sin(lon * Math.PI * 4 + 0.7);
/** The whole wall: the map and its track on the left, the mode, figures and a live trace on the right. */
function paintWall(c: Ctx2, t: number, mode: Mode | null) {
  const px = 1200;
  const py = 340;
  c.fillStyle = SCREEN_BG;
  c.fillRect(0, 0, px, py);
  const map = worldMap();
  if (map) c.drawImage(map, 0, 0);
  const speed = mode && mode !== 'launch' && mode !== 'comms' ? 90 : 240;
  const lon = (((t / speed) % 1) + 1) % 1;
  // The orbit behind, ahead dashed, the station on it.
  c.lineWidth = 2.5;
  c.strokeStyle = '#fff176';
  c.beginPath();
  for (let i = 0; i <= 60; i++) {
    const u = lon - 0.5 + (i / 60) * 0.5;
    const w = ((u % 1) + 1) % 1;
    const x = w * WORLD_W;
    if (i === 0 || Math.abs(x - (((lon - 0.5 + ((i - 1) / 60) * 0.5) % 1) + 1) % 1 * WORLD_W) > 200) c.moveTo(x, trackY(u));
    else c.lineTo(x, trackY(u));
  }
  c.stroke();
  c.setLineDash([5, 7]);
  c.strokeStyle = 'rgba(255,241,118,0.5)';
  c.beginPath();
  for (let i = 0; i <= 40; i++) {
    const u = lon + (i / 40) * 0.35;
    const x = (((u % 1) + 1) % 1) * WORLD_W;
    if (i === 0 || x < 8) c.moveTo(x, trackY(u));
    else c.lineTo(x, trackY(u));
  }
  c.stroke();
  c.setLineDash([]);
  const sx = lon * WORLD_W;
  const sy = trackY(lon);
  c.strokeStyle = 'rgba(255,255,255,0.3)';
  c.beginPath();
  c.arc(sx, sy, 34, 0, Math.PI * 2);
  c.stroke();
  c.fillStyle = mode === 'anomaly' ? '#ff5252' : '#ffffff';
  c.fillRect(sx - 12, sy - 2, 24, 4);
  c.fillRect(sx - 4, sy - 5, 8, 10);
  text(c, MISSION, sx + 14, sy - 14, 14, '#ffffff');
  // The right-hand panel.
  const lx = WORLD_W + 16;
  const alarm = mode === 'anomaly';
  c.fillStyle = alarm ? (Math.floor(t * 2) % 2 === 0 ? '#7a1414' : '#4a0c0c') : '#0e2238';
  c.fillRect(WORLD_W, 0, px - WORLD_W, py);
  text(c, AGENCY, lx, 26, 19, '#cfe4f2');
  text(c, `임무 ${MISSION}`, lx, 54, 16, '#8fb6cf', 'left', false);
  const met = Math.floor(Math.abs(t));
  text(c, `경과 ${String(Math.floor(met / 3600)).padStart(2, '0')}:${String(Math.floor(met / 60) % 60).padStart(2, '0')}:${String(met % 60).padStart(2, '0')}`, lx, 82, 22, '#fff176');
  c.fillStyle = 'rgba(255,255,255,0.14)';
  c.fillRect(lx, 100, px - lx - 16, 1);
  text(c, mode ? MODE_LABEL[mode] : '훈련 대기 중', lx, 128, 25, alarm ? '#ffffff' : mode ? '#69f0ae' : '#90a4ae');
  // Too long for one line on the big ones: it wraps at the dot.
  const parts = metricOf(mode, t).split(' · ');
  parts.forEach((s, i) => text(c, s, lx, 164 + i * 24, 17, '#e3edf3', 'left', false));
  // A live trace.
  const y0 = 234;
  const bw = px - lx - 16;
  c.fillStyle = '#071a2a';
  c.fillRect(lx, y0, bw, 92);
  c.strokeStyle = alarm ? '#ff8a80' : '#4dd0c4';
  c.lineWidth = 2;
  c.beginPath();
  for (let i = 0; i <= 80; i++) {
    const u = t * 1.2 + i * 0.16;
    const a = alarm ? 30 : mode ? 20 : 8;
    const y = y0 + 46 + a * Math.sin(u) * Math.cos(u * 0.37);
    if (i === 0) c.moveTo(lx + (i / 80) * bw, y);
    else c.lineTo(lx + (i / 80) * bw, y);
  }
  c.stroke();
}

// 지상 궤적 대형 화면 (asGroundTrack, 6 × 1): the wall of the control room.
function groundTrack(g: THREE.Group, W: number, out: Built) {
  const w = W - 0.16;
  const zb = -0.42;
  // Two posts, the frame, a clock bar and a sign along the top; high enough to be read over the consoles.
  for (const sx of [-1, 1]) part(g, box(0.12, 2.75, 0.12), GRAPHITE, sx * (w / 2 - 0.1), 1.375, zb, NO);
  part(g, rbox(w, 1.68, 0.12, 0.02), '#11171d', 0, 1.74, zb);
  part(g, rbox(w, 0.24, 0.12, 0.02), NAVY, 0, 2.72, zb);
  const sign = painted('asWallSign', 960, 48, (c) => {
    c.fillStyle = NAVY;
    c.fillRect(0, 0, 960, 48);
    text(c, `${AGENCY} · 비행 관제실`, 480, 26, 28, '#e3edf3', 'center');
  });
  picture(g, sign, Math.min(4.6, w * 0.82), 0.2, 0, 2.72, zb + 0.065);
  const wall = liveScreen(g, w - 0.16, 1.56, 1200, 340, 0, 1.74, zb + 0.066);
  const lamps = [-1, 1].map((sx) => ownLit(g, ball(0.04), '#3a4a3c', sx * (w / 2 - 0.1), 2.72, zb + 0.09));
  // A cable tray and a low desk of status lamps under it.
  part(g, rbox(w - 0.3, 0.7, 0.1, 0.01), '#2a333b', 0, 0.48, zb);
  for (let i = 0; i < 10; i++) ownLit(g, box(0.1, 0.04, 0.006), i % 3 === 2 ? AMBER : GREEN, -((w - 0.8) / 2) + (i * (w - 0.8)) / 9, 0.6, zb + 0.055);
  out.away = (_o, t) => {
    const mode = liveMode(g, t);
    wall.draw(`${mode}|${q(t, 3)}`, (c) => paintWall(c, t, mode));
    lamps.forEach((l, i) => setLit(l, mode === 'anomaly' ? (Math.floor(t * 3 + i) % 2 === 0 ? '#ff3b30' : '#5a0d0a') : mode ? '#69f0ae' : '#3a4a3c'));
  };
  out.work = marker(g, 0, 1.2, 0);
}

// ---------------------------------------------------------------------------------------------
// Tools designed for the hand: origin at the grip, named for the probe, no ink line.

/** A pen or pipette: its point goes along PEN_DIR from the hand. */
function penTool(g: THREE.Object3D, name: string, body: string, tip: string, thick = 0.005, writes = true): { root: THREE.Group; held: HeldTool } {
  const root = group(g);
  root.name = name;
  const inner = group(root);
  const d = vOf(PEN_DIR).normalize();
  inner.quaternion.setFromUnitVectors(v3(0, -1, 0), d);
  part(inner, cyl(thick, thick, PEN_UP * 0.78 + 0.07, 10), body, 0, (0.07 - PEN_UP * 0.78) / 2, 0, NO);
  part(inner, cyl(thick, 0.0015, PEN_UP * 0.22, 8), tip, 0, -PEN_UP * 0.89, 0, NO);
  return { root, held: { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: d.clone(), shape: 'pen', radius: 0.011, writes: writes ? PEN_UP : undefined } } } };
}
/** A clipboard carried on the left forearm, its page live. */
function clipTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'asClip';
  const tilt = group(root);
  tilt.rotation.x = -0.75;
  part(tilt, rbox(0.23, 0.31, 0.01, 0.006), '#5b6770', 0, 0, 0, NO);
  part(tilt, box(0.09, 0.02, 0.012), CHROME, 0, 0.145, 0.008, NO);
  const page = liveScreen(tilt, 0.205, 0.27, 160, 210, 0, -0.008, 0.008);
  const held: HeldTool = { tool: root, lead: 'left', grips: { left: boardGrip(0.75) } };
  return { root, page, held };
}
function paintClip(c: Ctx2, title: string, rows: readonly string[], ticks: number) {
  c.fillStyle = '#f7f7f2';
  c.fillRect(0, 0, 160, 210);
  text(c, title, 80, 18, 14, NAVY, 'center');
  rows.forEach((s, i) => {
    const y = 50 + i * 36;
    text(c, s, 12, y, 13, '#26262c', 'left', false);
    c.strokeStyle = '#7a7a7a';
    c.lineWidth = 1;
    c.strokeRect(128, y - 8, 15, 15);
    if (ticks > i + 0.5) {
      c.strokeStyle = '#1565c0';
      c.lineWidth = 2.5;
      c.beginPath();
      c.moveTo(130, y);
      c.lineTo(135, y + 6);
      c.lineTo(144, y - 8);
      c.stroke();
    }
  });
}
/** A hand pressure gauge: a handle down from a dial that faces the user. */
function gaugeTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'asGauge';
  part(root, cyl(0.014, 0.014, 0.1, 10), '#37474f', 0, 0, 0, NO);
  part(root, cyl(0.042, 0.042, 0.02, 18), CHROME, 0, 0.07, 0, { rx: Math.PI / 2, outline: false });
  ownLit(root, new THREE.CircleGeometry(0.036, 18), '#fafafa', 0, 0.07, 0.0115).userData.ownGeometry = true;
  const needle = group(root, 0, 0.07, 0.013);
  part(needle, box(0.003, 0.03, 0.001), RED, 0, 0.015, 0, NO);
  // The hose from its nose.
  rod(root, v3(0, 0.05, -0.01), v3(-0.015, 0.09, -0.08), 0.006, BLACK);
  const held: HeldTool = { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'power' } } };
  return { root, needle, held };
}
/** A length of tape held between two hands, fixed in the piece's frame. */
function tapeTool(g: THREE.Object3D, a: V, b: V) {
  const root = group(g);
  root.name = 'asTape';
  const A = vOf(a);
  const B = vOf(b);
  const d = B.clone().sub(A);
  const L = d.length();
  const inner = group(root);
  inner.position.copy(A).add(B).multiplyScalar(0.5);
  inner.quaternion.setFromUnitVectors(UP, d.clone().normalize());
  part(inner, box(0.018, L + 0.14, 0.002), '#f2d24b', 0, 0, 0, NO);
  for (let i = 0; i < 10; i++) part(inner, box(0.019, 0.003, 0.0026), BLACK, 0, -L / 2 + (i * L) / 9, 0, NO);
  const held: HeldTool = { tool: root, lead: 'right', grips: { left: { at: A, axis: v3(0, 1, 0), shape: 'pinch', radius: 0.006 }, right: { at: B, axis: v3(0, 1, 0), shape: 'pinch', radius: 0.006 } } };
  return { root, held };
}
/** A spanner: the handle down through the fist, the jaws above it. */
function spannerTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'asSpanner';
  part(root, box(0.024, 0.15, 0.01), STEEL, 0, 0.0, 0, NO);
  part(root, cyl(0.024, 0.024, 0.012, 10), STEEL, 0, 0.085, 0, { rx: Math.PI / 2, outline: false });
  const held: HeldTool = { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.012 } } };
  return { root, held };
}
/** The helmet: its gold visor to +z, held at the sides in both hands. */
function helmetBody(m: THREE.Object3D) {
  part(m, ball(0.145), SHELL, 0, 0, 0);
  part(m, cyl(0.105, 0.115, 0.05, 20), '#b0bec5', 0, -0.145, 0, NO);
  part(m, cyl(0.11, 0.11, 0.012, 20), BLACK, 0, -0.17, 0, NO);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.135, 18, 12, -Math.PI / 2 - 0.9, 1.8, 0.75, 1.2), new THREE.MeshToonMaterial({ color: GOLD, emissive: '#5a3c00' }));
  visor.userData.ownGeometry = visor.userData.ownMaterial = true;
  visor.position.set(0, 0, 0.018);
  // SphereGeometry's phi starts on -x and runs round through +z: turned to centre on the front.
  visor.rotation.y = Math.PI;
  m.add(visor);
  for (const sx of [-1, 1]) part(m, rbox(0.03, 0.06, 0.05, 0.01), '#cfd8dc', sx * 0.138, 0.05, 0.03, NO);
  ownLit(m, ball(0.012), '#fff3c4', 0.06, 0.135, 0.06);
  return visor;
}
function helmetTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'asHelmet';
  const visor = helmetBody(root);
  const held: HeldTool = {
    tool: root,
    lead: 'right',
    grips: {
      left: { at: v3(-0.15, -0.02, 0), axis: v3(0, 0, -1), palm: v3(1, 0, 0), shape: 'cradle', radius: 0.05 },
      right: { at: v3(0.15, -0.02, 0), axis: v3(0, 0, -1), palm: v3(-1, 0, 0), shape: 'cradle', radius: 0.05 },
    },
  };
  return { root, visor, held };
}
/** A soft folded cloth, pressed flat against what it cleans. */
function clothTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'asCloth';
  part(root, rbox(0.11, 0.075, 0.014, 0.006), '#90caf9', 0, 0, -0.012, NO);
  const held: HeldTool = { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), palm: v3(0, 0, -1), shape: 'flat', radius: 0.012 } } };
  return { root, held };
}
/** Long sample tongs: the rod from the hand to the jaws at LG.tip, a rock in them when one's caught. */
function tongsTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'asTongs';
  const tip = vOf(LG.tip);
  const d = tip.clone().normalize();
  part(root, cyl(0.013, 0.013, 0.14, 10), BLACK, d.x * 0.02, d.y * 0.02, d.z * 0.02, NO).quaternion.setFromUnitVectors(UP, d);
  rod(root, v3(0, 0, 0), tip, 0.007, STEEL);
  rod(root, tip, tip.clone().add(v3(0.03, -0.03, 0)), 0.006, STEEL);
  rod(root, tip, tip.clone().add(v3(-0.03, -0.03, 0)), 0.006, STEEL);
  const rock = part(root, ball(0.05), '#7d7a74', tip.x, tip.y - 0.05, tip.z, NO);
  rock.scale.set(1.1, 0.8, 0.9);
  rock.visible = false;
  const held: HeldTool = { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: d.clone(), shape: 'power' } } };
  return { root, rock, held };
}
/** A mallet: the handle towards -z from the fist, the head upright at its end. */
function malletTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'asMallet';
  part(root, cyl(0.014, 0.014, 0.3, 10), '#8d6e4f', 0, 0, -0.1, { rx: Math.PI / 2, outline: false });
  part(root, cyl(0.045, 0.045, 0.11, 14), '#6d4c41', 0, 0, -SV.head, NO);
  const held: HeldTool = { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 0, -1), palm: v3(-1, 0, 0), shape: 'power' } } };
  return { root, held };
}
/** A survival radio held up by the mouth, its aerial up. */
function radioTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'asRadio';
  part(root, rbox(0.06, 0.13, 0.03, 0.008), '#37474f', 0, 0, 0, NO);
  ownLit(root, box(0.04, 0.03, 0.002), '#7cf29a', 0, 0.035, 0.016);
  rod(root, v3(0.02, 0.06, 0), v3(0.02, 0.2, 0), 0.004, BLACK);
  part(root, box(0.03, 0.002, 0.002), GREY, 0, -0.02, 0.016, NO);
  const held: HeldTool = { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.022 } } };
  return { root, held };
}
/** A signal mirror, tipped to throw the light up and out. */
function mirrorTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'asMirror';
  const tilt = group(root);
  tilt.rotation.x = 0.4;
  part(tilt, rbox(0.08, 0.1, 0.006, 0.004), GREY_D, 0, 0.03, 0, NO);
  const glass = ownLit(tilt, box(0.068, 0.088, 0.002), '#cfe9f5', 0, 0.03, 0.0045);
  const held: HeldTool = { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'pinch', radius: 0.006 } } };
  return { root, glass, held };
}
/** A flint rod with a loop on its end. */
function strikerTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'asStriker';
  part(root, cyl(0.013, 0.013, 0.09, 10), '#4e342e', 0, 0, 0, NO);
  part(root, cyl(0.006, 0.006, 0.08, 8), GREY, 0, -0.08, 0, NO);
  const held: HeldTool = { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'power' } } };
  return { root, held };
}
/** A display model of the launcher, gripped round its waist. */
function rocketModel(m: THREE.Object3D) {
  part(m, cyl(0.022, 0.03, 0.22, 14), SHELL, 0, 0.02, 0, NO);
  part(m, cyl(0.003, 0.022, 0.07, 14), RED, 0, 0.165, 0, NO);
  part(m, cyl(0.03, 0.022, 0.03, 14), GREY_D, 0, -0.105, 0, NO);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    part(m, box(0.004, 0.05, 0.03), NAVY_L, Math.sin(a) * 0.035, -0.08, Math.cos(a) * 0.035, { ry: a, outline: false });
  }
}
function rocketTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'asRocket';
  rocketModel(root);
  const held: HeldTool = { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.028 } } };
  return { root, held };
}
/** A question card in the fingers, facing the reader. */
function cardTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'asCard';
  const face = liveScreen(root, 0.13, 0.09, 104, 72, 0.05, -0.01, 0.003);
  part(root, box(0.13, 0.09, 0.002), '#fffdf2', 0.05, -0.01, 0, NO);
  const held: HeldTool = { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'pinch', radius: 0.004 } } };
  return { root, face, held };
}

// ---------------------------------------------------------------------------------------------
// Other people: drawn, played by VRoid bodies when they've come. All grown-ups.

interface Fig {
  root: THREE.Group;
  head: THREE.Group;
  armL(to: THREE.Vector3 | null): void;
  armR(to: THREE.Vector3 | null): void;
  opts: FigureOptions;
}
function person(parent: THREE.Object3D, top: string, bottom: string, hair: string, x: number, z: number, ry: number, gender: 'female' | 'male', seed: number): Fig {
  const root = group(parent, x, 0, z, ry);
  for (const sx of [-1, 1]) {
    rod(root, v3(sx * 0.085, 0.84, 0), v3(sx * 0.09, 0.08, 0.01), 0.056, bottom);
    part(root, rbox(0.09, 0.07, 0.2, 0.03), '#37474f', sx * 0.09, 0.035, 0.04);
  }
  part(root, rbox(0.3, 0.17, 0.2, 0.06), bottom, 0, 0.88, 0);
  part(root, rbox(0.34, 0.46, 0.21, 0.08), top, 0, 1.11, 0);
  part(root, cyl(0.045, 0.05, 0.08, 10), SKIN, 0, 1.37, 0, NO);
  const head = group(root, 0, 1.51, 0);
  part(head, ball(0.112), SKIN, 0, 0, 0);
  for (const sx of [-1, 1]) part(head, ball(0.012), '#2b2b30', sx * 0.04, 0, 0.104, NO);
  part(head, ball(0.118), hair, 0, 0.03, -0.03);
  const arm = (sx: number) => {
    const shoulder = v3(sx * 0.2, 1.31, 0);
    const rest = v3(sx * 0.23, 0.82, 0.05);
    const upper = limb(root, 0.042, top);
    const lower = limb(root, 0.035, SKIN);
    const hand = part(root, ball(0.036), SKIN, 0, 0, 0, NO);
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
  const opts: FigureOptions = { gender, seed };
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
// 관제 콘솔 (missionConsole, 2 × 1): three screens on a tier, a slope of switches, a chair that rolls back when you stand.

const DESKS: readonly string[] = ['비행 역학', '교신 담당', '생명 유지', '추진 계통', '자세 제어', '전력 계통'];
const POLL: readonly string[] = ['추진', '유도', '전력', '통신', '생명 유지', '기상'];
function paintDesk(c: Ctx2, title: string, sub: string, colour: string) {
  c.fillStyle = SCREEN_BG;
  c.fillRect(0, 0, 400, 256);
  c.fillStyle = colour;
  c.fillRect(0, 0, 400, 30);
  text(c, title, 10, 16, 16, '#07131f');
  text(c, sub, 390, 16, 13, '#07131f', 'right', false);
}
function paintPoll(c: Ctx2, ticks: number, t: number) {
  paintDesk(c, '발사 전 점검', MISSION, TEAL);
  POLL.forEach((s, i) => {
    const y = 56 + i * 32;
    text(c, s, 16, y, 17, '#cfe4f2', 'left', false);
    const go = ticks > i + 0.5;
    c.fillStyle = go ? '#1b5e20' : '#3a3f22';
    c.fillRect(290, y - 12, 94, 24);
    text(c, go ? 'GO' : '확인 중', 337, y, 15, go ? '#b9f6ca' : '#ffe082', 'center');
  });
  const secs = Math.floor(Math.abs(t)) % 60;
  text(c, `T-00:${String(59 - secs).padStart(2, '0')}`, 16, 244, 13, '#fff176', 'left', false);
}
function paintLoop(c: Ctx2, talk: number, hear: number, logged: number, t: number) {
  paintDesk(c, `${STATION} 교신`, '음성 고리 1', '#ffb74d');
  // The crew on the video: an invented cabin, a figure afloat.
  c.fillStyle = '#10222f';
  c.fillRect(14, 40, 190, 128);
  c.fillStyle = '#26404f';
  for (let i = 0; i < 5; i++) c.fillRect(20 + i * 37, 46, 28, 18);
  const by = 112 + 5 * Math.sin(t * 0.8);
  c.fillStyle = '#3f6b8a';
  c.fillRect(92, by, 34, 46);
  c.fillStyle = '#f1c9a5';
  c.beginPath();
  c.arc(109, by - 13, 14, 0, Math.PI * 2);
  c.fill();
  // The voice trace for whoever's talking.
  const col = talk > 0.5 ? '#69f0ae' : hear > 0.5 ? '#ffb74d' : '#46606f';
  c.strokeStyle = col;
  c.lineWidth = 2;
  c.beginPath();
  for (let i = 0; i <= 40; i++) {
    const a = talk > 0.5 || hear > 0.5 ? 18 * Math.abs(Math.sin(t * 7 + i * 0.5)) * Math.sin(i * 1.7) : 1;
    const x = 216 + i * 4.3;
    if (i === 0) c.moveTo(x, 100 + a);
    else c.lineTo(x, 100 + a);
  }
  c.stroke();
  text(c, talk > 0.5 ? '송신 중' : hear > 0.5 ? '수신 중' : '대기', 306, 60, 19, col, 'center');
  text(c, '다음: 3번 해치 점검', 14, 192, 14, '#cfe4f2', 'left', false);
  text(c, logged > 0.5 ? '✓ 복창 기록' : '복창 기록 대기', 14, 222, 14, logged > 0.5 ? '#b9f6ca' : '#90a4ae', 'left', false);
}
function paintAlarm(c: Ctx2, fixed: number, page: number, guard: number, thrown: number, t: number) {
  if (fixed > 0.5) {
    paintDesk(c, '자세 제어 정상', '복구 완료', '#69f0ae');
    text(c, '경보 해제', 200, 110, 36, '#b9f6ca', 'center');
    text(c, '위성 자세 오차 0.02°', 200, 160, 16, '#cfe4f2', 'center', false);
    return;
  }
  const blink = Math.floor(Math.abs(t) * 3) % 2 === 0;
  c.fillStyle = blink ? '#5e0f0f' : '#2f0808';
  c.fillRect(0, 0, 400, 256);
  c.fillStyle = '#ff5252';
  c.fillRect(0, 0, 400, 30);
  text(c, '⚠ 이상 신호', 10, 16, 16, '#ffffff');
  text(c, '절차서 4-2', 390, 16, 13, '#ffffff', 'right', false);
  const steps = ['1. 경보 내용 확인', '2. 절차서 찾기', '3. 안전 덮개 열기', '4. 백업 계통 전환', '5. 명령 입력'];
  const done = (page > 0.5 ? 2 : 1) + (guard > 0.5 ? 1 : 0) + (thrown > 0.5 ? 1 : 0);
  steps.forEach((s, i) => text(c, `${i < done ? '✓' : ' '} ${s}`, 16, 58 + i * 30, 16, i < done ? '#b9f6ca' : '#ffe0e0', 'left', false));
  text(c, `자세 오차 ${(2.4 + 0.6 * Math.sin(t * 2)).toFixed(1)}°`, 16, 222, 18, '#ffeb3b');
}
function paintIdle(c: Ctx2, name: string, mode: Mode | null, t: number) {
  paintDesk(c, name, MISSION, '#90caf9');
  text(c, mode ? MODE_LABEL[mode] : '궤도 유지', 16, 56, 18, mode ? '#69f0ae' : '#cfe4f2');
  metricOf(mode, t)
    .split(' · ')
    .forEach((s, i) => text(c, s, 16, 84 + i * 22, 14, '#cfe4f2', 'left', false));
  c.strokeStyle = TEAL;
  c.lineWidth = 2;
  c.beginPath();
  for (let i = 0; i <= 60; i++) {
    const y = 192 + 30 * Math.sin(t * 0.9 + i * 0.18) * Math.cos(i * 0.05 + 1);
    if (i === 0) c.moveTo(16 + i * 6.1, y);
    else c.lineTo(16 + i * 6.1, y);
  }
  c.stroke();
}
function paintStrip(c: Ctx2, seed: number) {
  const rnd = seeded(seed + 5);
  c.fillStyle = SCREEN_BG;
  c.fillRect(0, 0, 256, 164);
  for (let k = 0; k < 3; k++) {
    c.strokeStyle = [TEAL, '#ffb74d', '#90caf9'][wrap(k, 3)];
    c.beginPath();
    let y = 30 + k * 50;
    for (let i = 0; i < 48; i++) {
      y += (rnd() - 0.5) * 12;
      if (i === 0) c.moveTo(0, y);
      else c.lineTo(i * 5.4, y);
    }
    c.stroke();
  }
  text(c, '텔레메트리', 6, 12, 12, '#cfe4f2', 'left', false);
}
function missionConsole(g: THREE.Group, out: Built) {
  const T = MC.top;
  const seed = Math.abs(Math.floor(g.position.x * 3 + g.position.z * 7));
  const name = DESKS[wrap(seed, DESKS.length)];
  // The long desk on two pedestals, a modesty panel, the top with a rolled edge.
  part(g, rbox(1.94, 0.04, 0.86, 0.01), '#39434c', 0, T - 0.02, -0.09);
  part(g, box(1.96, 0.012, 0.016), TEAL, 0, T - 0.03, 0.345, NO);
  for (const sx of [-1, 1]) {
    part(g, rbox(0.44, T - 0.04, 0.72, 0.01), '#4a555f', sx * 0.72, (T - 0.04) / 2, -0.12);
    part(g, box(0.34, 0.26, 0.012), '#3a444d', sx * 0.72, 0.34, 0.245, NO);
    for (let i = 0; i < 4; i++) part(g, box(0.28, 0.006, 0.014), '#2a333b', sx * 0.72, 0.25 + i * 0.05, 0.25, NO);
  }
  part(g, box(1.4, 0.56, 0.03), '#4a555f', 0, 0.32, -0.46, NO);
  // The tier of screens behind.
  const zf = -0.33;
  part(g, rbox(1.92, 0.56, 0.12, 0.015), '#2a333b', 0, T + 0.3, -0.39);
  part(g, rbox(1.92, 0.05, 0.22, 0.012), '#39434c', 0, T + 0.6, -0.36);
  // A desk's name on a plate along the top.
  label(g, name, 0.46, 0.05, 0, T + 0.6, -0.248, NAVY, '#e3edf3');
  const bez = (x: number, w: number) => part(g, rbox(w + 0.03, 0.39, 0.012, 0.005), BLACK, x, T + 0.3, zf + 0.004, NO);
  bez(-0.62, 0.56);
  bez(0, 0.6);
  bez(0.62, 0.56);
  const left = liveScreen(g, 0.56, 0.358, 400, 256, -0.62, T + 0.3, zf + 0.012);
  const main = liveScreen(g, 0.6, 0.358, 400, 256, 0, T + 0.3, zf + 0.012);
  const strip = painted(`asStrip${wrap(seed, 4)}`, 256, 164, (c) => paintStrip(c, wrap(seed, 4)));
  picture(g, strip, 0.56, 0.358, 0.62, T + 0.3, zf + 0.012);
  // The slope of switches behind the keyboard.
  part(g, rbox(1.3, 0.1, 0.2, 0.01), '#566066', 0, T + 0.05, 0.02, { rx: 0.35 });
  const lights: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const p = MC.poll;
    part(g, box(0.03, 0.012, 0.02), '#e0e0e0', p[0] + i * 0.045, p[1], p[2], NO);
    lights.push(ownLit(g, box(0.03, 0.008, 0.012), '#3a3f22', p[0] + i * 0.045, p[1] + 0.012, p[2] - 0.022));
  }
  const reset = ownLit(g, cyl(0.022, 0.024, 0.016, 14), '#7a1414', MC.reset[0], MC.reset[1], MC.reset[2]);
  for (let i = 0; i < 4; i++) part(g, box(0.024, 0.012, 0.018), i % 2 ? AMBER : '#e0e0e0', -0.54 + i * 0.05, 0.85, 0.05, NO);
  // The guarded switch under its red cover.
  part(g, box(0.03, 0.016, 0.03), '#e0e0e0', MC.guard[0], MC.guard[1], MC.guard[2], NO);
  const sw = part(g, box(0.008, 0.03, 0.008), CHROME, MC.guard[0], MC.guard[1] + 0.016, MC.guard[2], NO);
  const cover = group(g, MC.guard[0], MC.guard[1] + 0.012, MC.guard[2] - 0.022);
  part(cover, box(0.042, 0.006, 0.05), '#e53935', 0, 0, 0.022, NO);
  // Keyboard, trackball, the loop key on its base, the gooseneck mic, the log, the binder.
  part(g, rbox(0.42, 0.018, 0.13, 0.006), '#20262c', 0, T + 0.01, MC.kbL[2]);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 14; j++) part(g, box(0.022, 0.005, 0.022), '#4a555f', -0.18 + j * 0.028, T + 0.021, MC.kbL[2] - 0.035 + i * 0.033, NO);
  part(g, rbox(0.1, 0.02, 0.1, 0.008), '#20262c', MC.ball[0], T + 0.01, MC.ball[2]);
  part(g, ball(0.024), '#90caf9', MC.ball[0], T + 0.025, MC.ball[2], NO);
  part(g, rbox(0.11, 0.024, 0.09, 0.008), '#20262c', MC.ptt[0], T + 0.012, MC.ptt[2]);
  const ptt = ownLit(g, box(0.05, 0.012, 0.04), '#5f4a1b', MC.ptt[0], MC.ptt[1] - 0.012, MC.ptt[2]);
  rod(g, v3(MC.ptt[0] - 0.07, T, 0.1), v3(MC.ptt[0] - 0.02, T + 0.2, 0.17), 0.004, GRAPHITE);
  part(g, cyl(0.012, 0.012, 0.03, 8), BLACK, MC.ptt[0] - 0.02, T + 0.21, 0.175, { rx: 0.7, outline: false });
  part(g, box(0.18, 0.006, 0.24), '#fbf8ef', MC.log[0], T + 0.003, MC.log[2], NO);
  for (let i = 0; i < 6; i++) part(g, box(0.15, 0.001, 0.003), '#b0bec5', MC.log[0], T + 0.0065, MC.log[2] - 0.09 + i * 0.03, NO);
  const logLine = part(g, box(0.1, 0.0012, 0.006), '#1565c0', MC.log[0], T + 0.007, MC.log[2] - 0.03, NO);
  part(g, rbox(0.26, 0.05, 0.2, 0.008), RED, MC.binder[0], T + 0.025, MC.binder[2]);
  const pageT = part(g, box(0.11, 0.002, 0.18), '#fbf8ef', MC.binder[0] - 0.06, T + 0.051, MC.binder[2], NO);
  const pageB = part(g, box(0.11, 0.002, 0.18), '#fbf8ef', MC.binder[0] + 0.06, T + 0.051, MC.binder[2], NO);
  const pen = penTool(g, 'asPen', '#1565c0', '#222222');
  const clip = clipTool(g);
  // A beacon on a stalk at the desk's far end: red in an alarm.
  rod(g, v3(0.9, T, -0.42), v3(0.9, T + 0.72, -0.42), 0.01, GRAPHITE);
  const beacon = ownLit(g, ball(0.035), '#4a1212', 0.9, T + 0.75, -0.42);
  // The chair.
  const chair = group(g, MC.seat[0], 0, MC.seat[2]);
  chair.rotation.y = Math.PI;
  part(chair, cyl(0.03, 0.03, 0.34, 8), GRAPHITE, 0, 0.22, 0, NO);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    rod(chair, v3(0, 0.06, 0), v3(Math.cos(a) * 0.24, 0.04, Math.sin(a) * 0.24), 0.014, GRAPHITE);
  }
  part(chair, rbox(0.46, 0.08, 0.44, 0.03), NAVY_L, 0, 0.43, 0);
  part(chair, rbox(0.44, 0.48, 0.06, 0.03), NAVY_L, 0, 0.74, -0.22);
  const spots: Record<string, Spot> = {
    monitorLaunch: seatAt(g, 'asMonitor', MC.seat),
    stationComms: seatAt(g, 'asComms', MC.seat),
    resolveAnomaly: seatAt(g, 'asAnomaly', MC.seat),
    astronaut_missionBriefing: standAt(g, 'asBriefing', -0.86, 0.62),
  };
  spots['*'] = spots.monitorLaunch;
  spots.astronaut_missionBriefing.at.rotation.y = 0.35;
  enrol(g, spots, (k) => (k === 'resolveAnomaly' ? 'anomaly' : k === 'stationComms' ? 'comms' : 'launch'));
  const homeLog: V = [MC.log[0] + 0.13, MC.log[1] + 0.02, MC.log[2] + 0.02];
  let wrote = -1;
  drive(g, out, spots, { pen: pen.held, clip: clip.held }, (now, N, t) => {
    const n = N?.n ?? {};
    const mode = liveMode(g, t);
    const alarm = now === 'resolveAnomaly' && (n.fixed ?? 0) < 0.5;
    if (now === 'monitorLaunch') main.draw(`p${q(n.poll, 1)}|${q(t, 1)}`, (c) => paintPoll(c, n.poll ?? 0, t));
    else if (now === 'stationComms') main.draw(`c${q(n.talk, 1)}${q(n.hear, 1)}${q(n.logged, 1)}|${q(t, 6)}`, (c) => paintLoop(c, n.talk ?? 0, n.hear ?? 0, n.logged ?? 0, t));
    else if (now === 'resolveAnomaly') main.draw(`a${q(n.fixed, 1)}${q(n.page, 1)}${q(n.guard, 1)}${q(n.thrown, 1)}|${q(t, 3)}`, (c) => paintAlarm(c, n.fixed ?? 0, n.page ?? 0, n.guard ?? 0, n.thrown ?? 0, t));
    else main.draw(`i${mode}|${q(t, 1)}`, (c) => paintIdle(c, name, mode, t));
    left.draw(`l${mode}|${q(t, 1)}`, (c) => paintIdle(c, '훈련 현황', mode, t + 3));
    lights.forEach((l, i) => setLit(l, (n.poll ?? 0) > i + 0.5 ? '#69f0ae' : '#3a3f22'));
    setLit(ptt, (n.talk ?? 0) > 0.5 || (n.loop ?? 0) > 0.5 ? '#ffca28' : '#5f4a1b');
    setLit(beacon, alarm ? (Math.floor(t * 4) % 2 === 0 ? '#ff3b30' : '#6a1410') : '#4a1212');
    setLit(reset, alarm ? '#ff5252' : '#7a1414');
    cover.rotation.x = -1.9 * clamp01(n.guard);
    sw.rotation.x = 0.5 - clamp01(n.thrown);
    chair.position.z = MC.seat[2] + 0.34 * clamp01(n.chair);
    const leaf = clamp01(n.page);
    pageT.visible = pageB.visible = leaf > 0.02;
    logLine.visible = (n.logged ?? 0) > 0.2;
    logLine.scale.x = Math.max(0.05, clamp01(n.logged));
    at(pen.root, N?.props.pen ?? null, homeLog);
    at(clip.root, N?.tool === 'clip' ? N.props.clip : null);
    const w = q(n.ticks, 2);
    if (clip.root.visible && w !== wrote) {
      wrote = w;
      clip.page.draw(`${w}`, (c) => paintClip(c, '임무 브리핑', ['발사 창', '승무원 상태', '궤도 삽입', '비상 절차'], n.ticks ?? 0));
    }
  });
  out.work = marker(g, 0, T + 0.04, 0.16);
}

// =============================================================================================
// 훈련용 우주복 (spacesuitDisplay, 1 × 1): a whole suit up on its stand, with a pack, panel, wrist rings and its port lamps.

function suitBody(g: THREE.Object3D) {
  const suit = '#f5f5f2';
  const SOFT = '#e7e8e4';
  for (const sx of [-1, 1]) {
    part(g, rbox(0.15, 0.1, 0.25, 0.04), '#8f979c', sx * 0.1, 0.11, 0.03);
    part(g, box(0.15, 0.022, 0.25), BLACK, sx * 0.1, 0.05, 0.03, NO);
    part(g, cyl(0.075, 0.07, 0.45, 14), suit, sx * 0.1, 0.38, 0);
    part(g, cyl(0.084, 0.084, 0.03, 14), '#b0bec5', sx * 0.1, 0.6, 0, NO);
    part(g, cyl(0.086, 0.08, 0.38, 14), suit, sx * 0.1, 0.8, 0);
    part(g, cyl(0.088, 0.088, 0.018, 14), ORANGE, sx * 0.1, 0.7, 0, NO);
  }
  part(g, rbox(0.42, 0.18, 0.28, 0.08), SOFT, 0, 1.03, 0);
  part(g, rbox(0.46, 0.5, 0.32, 0.12), suit, 0, 1.34, 0);
  part(g, cyl(0.12, 0.12, 0.04, 20), '#b0bec5', 0, 1.6, 0, NO);
  const rings: THREE.Mesh[] = [];
  for (const sx of [-1, 1]) {
    part(g, ball(0.1), suit, sx * 0.26, 1.49, 0);
    part(g, cyl(0.07, 0.065, 0.32, 12), suit, sx * 0.32, 1.33, 0.02, { rz: sx * 0.25 });
    part(g, cyl(0.072, 0.072, 0.024, 12), '#b0bec5', sx * 0.355, 1.17, 0.03, { rz: sx * 0.25, outline: false });
    part(g, cyl(0.065, 0.06, 0.2, 12), suit, sx * 0.37, 1.07, 0.07, { rz: sx * 0.1, rx: -0.3 });
    rings.push(part(g, cyl(0.066, 0.066, 0.02, 14), '#e65100', sx * 0.375, 0.99, 0.1, { rx: -0.3, outline: false }));
    part(g, rbox(0.1, 0.12, 0.07, 0.03), '#eceff1', sx * 0.385, 0.91, 0.12);
  }
  // The pack, the chest panel, the stripes and an invented patch.
  part(g, rbox(0.42, 0.56, 0.2, 0.05), '#dcdfe0', 0, 1.34, -0.26);
  part(g, rbox(0.24, 0.13, 0.05, 0.02), '#37474f', 0, 1.2, 0.17);
  for (const [x, k] of [[-0.07, '#ef5350'], [0, '#ffee58'], [0.07, GREEN]] as const) ownLit(g, ball(0.012), k, x, 1.22, 0.2);
  part(g, box(0.05, 0.03, 0.012), '#90a4ae', SD.port[0], SD.port[1], SD.port[2] - 0.012, NO);
  part(g, cyl(0.016, 0.016, 0.02, 10), CHROME, SD.port[0], SD.port[1], SD.port[2], { rx: Math.PI / 2, outline: false });
  label(g, '별마루', 0.12, 0.05, -0.15, 1.46, 0.168, NAVY, '#e3edf3');
  part(g, ball(0.17), suit, 0, 1.76, 0);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.145, 18, 12, -Math.PI / 2 - 0.9, 1.8, 0.7, 1.3), new THREE.MeshToonMaterial({ color: GOLD, emissive: '#5a3c00' }));
  visor.userData.ownGeometry = visor.userData.ownMaterial = true;
  visor.position.set(0, 1.76, 0.04);
  visor.rotation.y = Math.PI;
  g.add(visor);
  return rings;
}
function spacesuitDisplay(g: THREE.Group, out: Built) {
  part(g, cyl(0.32, 0.34, 0.05, 22), GRAPHITE, 0, 0.025, 0);
  part(g, cyl(0.025, 0.025, 1.0, 8), STEEL, 0, 0.5, -0.2, NO);
  suitBody(g);
  // A little trolley beside it with the gauge and the sheet.
  rod(g, v3(0.42, 0.03, 0.3), v3(0.42, 0.55, 0.3), 0.01, GREY);
  part(g, cyl(0.075, 0.075, 0.014, 12), '#cfd8dc', 0.42, 0.555, 0.3, NO);
  const gauge = gaugeTool(g);
  const clip = clipTool(g);
  const lamp = ownLit(g, ball(0.012), '#5a3c10', SD.port[0] + 0.04, SD.port[1] + 0.03, SD.port[2]);
  const spots: Record<string, Spot> = { checkSpacesuit: standAt(g, 'asSuitCheck', 0, SD.stand) };
  let wrote = -1;
  drive(g, out, spots, { gauge: gauge.held, clip: clip.held }, (_now, N) => {
    const n = N?.n ?? {};
    at(gauge.root, N?.props.gauge ?? null, SD.gaugeRest);
    gauge.needle.rotation.z = 1.9 - 2.6 * clamp01(n.reading);
    setLit(lamp, (n.reading ?? 0) > 0.9 ? '#69f0ae' : '#5a3c10');
    at(clip.root, N?.tool === 'clip' ? N.props.clip : null);
    const w = q(n.ticks, 2);
    if (clip.root.visible && w !== wrote) {
      wrote = w;
      clip.page.draw(`${w}`, (c) => paintClip(c, '우주복 점검표', ['가슴 포트 압력', '왼손목 링', '오른손목 링', '앞면 봉합선'], n.ticks ?? 0));
    }
  });
  out.work = marker(g, 0, 1.3, 0.25);
}

// =============================================================================================
// 우주복 피팅 랙 (asSuitRack, 2 × 1): a hard torso on a pedestal, a helmet shelf, a table with a peg, gloves laid out, a chart of sizes.

function suitRack(g: THREE.Group, out: Built) {
  const zb = -0.4;
  for (const x of [-0.94, 0.94]) part(g, box(0.05, 2.05, 0.05), GREY_D, x, 1.025, zb, NO);
  part(g, box(1.94, 0.05, 0.05), GREY_D, 0, 2.04, zb, NO);
  part(g, box(1.92, 1.7, 0.012), '#dfe5e9', 0, 1.1, zb + 0.015, NO);
  const chart = painted('asSizes', 240, 200, (c) => {
    c.fillStyle = '#f7f7f2';
    c.fillRect(0, 0, 240, 200);
    text(c, '우주복 치수표', 120, 18, 16, NAVY, 'center');
    const rows = [['어깨 너비', '45~49'], ['상체 길이', '60~68'], ['팔 길이', '57~63'], ['손 둘레', '20~23']];
    rows.forEach(([a, b], i) => {
      const y = 50 + i * 34;
      text(c, a, 14, y, 14, '#26262c', 'left', false);
      text(c, `${b} cm`, 226, y, 14, '#26262c', 'right', false);
      c.fillStyle = '#b0bec5';
      c.fillRect(14, y + 14, 212, 1);
    });
  });
  picture(g, chart, 0.46, 0.38, 0.05, 1.56, zb + 0.024);
  label(g, '우주복 피팅', 0.54, 0.09, 0.05, 1.86, zb + 0.024, NAVY, '#e3edf3');
  // The hard torso on its pedestal, sizing rings at the shoulders.
  const tx = SR.torsoX;
  part(g, cyl(0.2, 0.22, 0.04, 16), GRAPHITE, tx, 0.02, -0.04);
  part(g, cyl(0.03, 0.03, 1.1, 8), STEEL, tx, 0.55, -0.04, NO);
  part(g, rbox(0.46, 0.42, 0.3, 0.1), SHELL, tx, 1.3, 0.02);
  part(g, cyl(0.12, 0.12, 0.03, 18), '#b0bec5', tx, 1.53, 0.02, NO);
  part(g, rbox(0.38, 0.52, 0.17, 0.05), '#dcdfe0', tx, 1.3, -0.2);
  part(g, rbox(0.22, 0.11, 0.05, 0.02), '#37474f', tx, 1.18, 0.16);
  const rings: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const ring = group(g, tx + sx * 0.21, 1.26, 0.09);
    ring.rotation.z = Math.PI / 2;
    part(ring, cyl(0.07, 0.07, 0.03, 16), '#90a4ae', 0, 0, 0, NO);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      part(ring, box(0.012, 0.036, 0.012), CHROME, Math.cos(a) * 0.066, 0, Math.sin(a) * 0.066, NO);
    }
    rings.push(ring);
  }
  // The legs of a suit hanging from the rail behind the table, boots on the floor under.
  for (const sx of [-1, 1]) {
    part(g, cyl(0.07, 0.065, 0.62, 10), '#ecece6', 0.05 + sx * 0.1, 1.06, zb + 0.09);
    part(g, rbox(0.13, 0.09, 0.26, 0.04), GREY, 0.05 + sx * 0.1, 0.05, zb + 0.14);
  }
  part(g, rbox(0.34, 0.24, 0.2, 0.06), '#ecece6', 0.05, 1.46, zb + 0.09);
  rod(g, v3(0.05, 1.58, zb + 0.08), v3(0.05, 2.02, zb + 0.03), 0.008, GREY_D);
  // The table with the peg, the gloves, the spanner, a tray.
  part(g, rbox(0.72, 0.04, 0.42, 0.01), PANEL, 0.05, SR.table - 0.02, 0.11);
  for (const [x, z] of [[-0.27, -0.05], [0.37, -0.05], [-0.27, 0.27], [0.37, 0.27]] as const) part(g, box(0.035, SR.table - 0.04, 0.035), GREY_D, x, (SR.table - 0.04) / 2, z, NO);
  part(g, cyl(0.016, 0.03, 0.1, 10), STEEL, SR.peg[0], SR.table + 0.05, SR.peg[2], NO);
  const glove = group(g, SR.glove[0], SR.table + 0.018, SR.glove[2]);
  part(glove, rbox(0.1, 0.03, 0.11, 0.012), '#eceff1', 0, 0, 0);
  for (let i = 0; i < 4; i++) part(glove, rbox(0.02, 0.02, 0.07, 0.008), '#eceff1', -0.033 + i * 0.022, 0, -0.08, NO);
  part(glove, cyl(0.04, 0.04, 0.05, 12), '#e65100', 0, 0, 0.07, { rx: Math.PI / 2, outline: false });
  part(g, rbox(0.14, 0.012, 0.1, 0.003), '#90a4ae', SR.clothRest[0], SR.table + 0.006, SR.clothRest[2], NO);
  // The helmet shelf at the right, helmets on it, one the dweller's.
  for (const y of [1.0, 1.54]) {
    part(g, rbox(0.62, 0.03, 0.46, 0.008), GREY_D, SR.shelf[0], y, -0.15);
  }
  const still = group(g, SR.shelf[0], 1.72, -0.12);
  helmetBody(still);
  ownLit(g, box(0.5, 0.012, 0.012), '#fff3c4', SR.shelf[0], 1.5, 0.05);
  const low = group(g, SR.shelf[0], 0.28, -0.1);
  part(low, rbox(0.54, 0.46, 0.5, 0.012), '#5b6770', 0, 0, 0);
  label(low, '장갑·내피', 0.3, 0.06, 0, 0.1, 0.252, '#37474f', '#e3edf3');
  const tape = tapeTool(g, SR.tapeL, SR.tapeR);
  const spanner = spannerTool(g);
  const clip = clipTool(g);
  const helmet = helmetTool(g);
  const cloth = clothTool(g);
  const smudge = part(g, box(0.1, 0.05, 0.001), '#caa76a', SR.peg[0], SR.peg[1] + 0.03, SR.peg[2] + 0.148, NO);
  const spots: Record<string, Spot> = { asFitSuit: standAt(g, 'asFitSuit', SR.torsoX, SR.stand), asCarryHelmet: standAt(g, 'asCarryHelmet', SR.peg[0], 0.58) };
  let wrote = -1;
  drive(g, out, spots, { tape: tape.held, spanner: spanner.held, clip: clip.held, helmet: helmet.held, cloth: cloth.held }, (now, N) => {
    const n = N?.n ?? {};
    tape.root.visible = N?.tool === 'tape';
    at(spanner.root, N?.props.spanner ?? null, SR.spannerRest);
    spanner.root.rotation.x = N?.tool === 'spanner' ? 0.35 : Math.PI / 2;
    rings.forEach((r) => (r.rotation.x = clamp01(n.ring) * 3));
    glove.scale.y = 1 - 0.3 * clamp01(n.press);
    at(helmet.root, N?.props.helmet ?? null, SR.shelf);
    at(cloth.root, N?.props.cloth ?? null, SR.clothRest);
    smudge.visible = now === 'asCarryHelmet' && (N?.props.helmet?.[0] ?? 9) < SR.peg[0] + 0.02 && (n.clean ?? 0) < 0.85;
    smudge.scale.y = Math.max(0.05, 1 - clamp01(n.clean));
    at(clip.root, N?.tool === 'clip' ? N.props.clip : null);
    const w = q(n.ticks, 2);
    if (clip.root.visible && w !== wrote) {
      wrote = w;
      clip.page.draw(`${w}`, (c) => paintClip(c, '피팅 기록', ['어깨 47 cm', '링 2단 조임', '장갑 M 착용감', '다음 피팅 일정'], n.ticks ?? 0));
    }
  });
  out.work = marker(g, SR.peg[0], SR.peg[1], SR.peg[2]);
}

// =============================================================================================
// 저중력 훈련 장치 (asLowGravRig, 3 × 2): a gantry, a bridge and trolley above; a cable; a harness; a grey mat with craters and rocks; a counterweight.

function lowGravRig(g: THREE.Group, W: number, D: number, out: Built) {
  const hw = W / 2 - 0.06;
  const hd = D / 2 - 0.06;
  const TOP = 2.4;
  for (const [x, z] of [[-hw, -hd], [hw, -hd], [-hw, hd], [hw, hd]] as const) {
    part(g, box(0.08, TOP, 0.08), HAZARD_OF(x, z), x, TOP / 2, z, NO);
    part(g, rbox(0.2, 0.03, 0.2, 0.006), GREY_D, x, 0.015, z, NO);
  }
  for (const z of [-hd, hd]) part(g, box(W - 0.1, 0.09, 0.09), GRAPHITE, 0, TOP, z, NO);
  for (const x of [-hw, hw]) part(g, box(0.09, 0.09, D - 0.1), GRAPHITE, x, TOP, 0, NO);
  // The mat of grey regolith.
  const mat = painted('asRegolith', 512, 340, (c) => {
    const rnd = seeded(21);
    c.fillStyle = '#8c8d8a';
    c.fillRect(0, 0, 512, 340);
    for (let i = 0; i < 500; i++) {
      c.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
      c.fillRect(rnd() * 512, rnd() * 340, 2 + rnd() * 6, 2 + rnd() * 4);
    }
    for (const [x, y, r] of [[90, 70, 34], [400, 90, 44], [300, 250, 30], [70, 270, 22]] as const) {
      c.fillStyle = 'rgba(40,40,44,0.45)';
      c.beginPath();
      c.arc(x, y, pos(r), 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = 'rgba(235,235,230,0.55)';
      c.lineWidth = 3;
      c.beginPath();
      c.arc(x, y, pos(r + 2), 0, Math.PI * 2);
      c.stroke();
    }
  });
  part(g, box(W - 0.2, 0.05, D - 0.2), '#7c7d7a', 0, 0.025, 0, NO);
  picture(g, mat, W - 0.24, D - 0.24, 0, 0.052, 0, '#ffffff', 0, -Math.PI / 2);
  for (const [x, z, r] of [[-0.9, -0.6, 0.08], [-0.2, -0.72, 0.11], [0.9, -0.58, 0.06], [-1.1, 0.72, 0.07]] as const) part(g, ball(r), '#726f69', x, 0.052 + r * 0.6, z).scale.set(1.2, 0.8, 1);
  const rock = part(g, ball(0.06), '#7d7a74', LG.rock[0], LG.rock[1] - 0.05, LG.rock[2], NO);
  rock.scale.set(1.2, 0.8, 1);
  // The sample bin, low, by the far post.
  part(g, rbox(0.3, LG.bin[1] - 0.05, 0.28, 0.01), '#546e7a', LG.bin[0], (LG.bin[1] - 0.05) / 2 + 0.05, LG.bin[2]);
  label(g, '표본', 0.18, 0.06, LG.bin[0], 0.18, LG.bin[2] + 0.143, '#37474f', '#e3edf3');
  const stored = [0, 1, 2].map((i) => {
    const m = part(g, ball(0.045), '#6f6c66', LG.bin[0] - 0.08 + i * 0.08, LG.bin[1] + 0.02, LG.bin[2], NO);
    m.scale.y = 0.75;
    m.visible = false;
    return m;
  });
  // The counterweight column by the near-left post.
  const cwX = -hw + 0.02;
  const cwZ = -hd + 0.18;
  part(g, box(0.16, TOP - 0.1, 0.12), '#2a333b', cwX, (TOP - 0.1) / 2, cwZ, NO);
  const weight = part(g, rbox(0.18, 0.4, 0.14, 0.01), '#ffb74d', cwX, 1.0, cwZ);
  label(g, '하중 경감 82%', 0.42, 0.08, -0.85, 2.27, -hd + 0.05, NAVY, '#e3edf3');
  // The bridge that follows along x, and the trolley along it.
  const bridge = group(g, -0.2, TOP - 0.06, 0);
  part(bridge, box(0.12, 0.12, D - 0.1), '#ffb300', 0, 0, 0, NO);
  const trolley = group(bridge, 0, -0.1, 0);
  part(trolley, rbox(0.2, 0.08, 0.22, 0.01), GRAPHITE, 0, 0, 0);
  const cable = limb(g, 0.006, BLACK);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  cable(a.set(-0.2, 2.2, 0), b.set(-0.2, 1.3, 0));
  // The harness: a waist band, straps up to the spreader the cable comes down on.
  const hrn = group(g);
  part(hrn, new THREE.TorusGeometry(0.19, 0.022, 6, 24).rotateX(Math.PI / 2), '#ef6c00', 0, 0, 0, NO).userData.ownGeometry = true;
  part(hrn, rbox(0.1, 0.05, 0.04, 0.01), '#d84315', 0, 0.0, 0.19, NO);
  part(hrn, box(0.5, 0.02, 0.02), GREY_D, 0, 0.52, 0, NO);
  const strapL = limb(hrn, 0.006, '#ef6c00');
  const strapR = limb(hrn, 0.006, '#ef6c00');
  strapL(v3(0.18, 0, 0), v3(0.24, 0.52, 0));
  strapR(v3(-0.18, 0, 0), v3(-0.24, 0.52, 0));
  hrn.visible = false;
  const tongs = tongsTool(g);
  const spotter = lazy(() => person(g, '#ef6c00', '#37474f', '#5b3a1e', -1.18, 0.74, 0.5, 'male', 77));
  const spots: Record<string, Spot> = { asLowWalk: standAt(g, 'asLowWalk', LG.xa, LG.lane), asLowSample: standAt(g, 'asLowSample', LG.xa, 0.52) };
  enrol(g, spots, () => 'low');
  const hand = new THREE.Vector3();
  drive(g, out, spots, { tongs: tongs.held }, (_now, N, t, H) => {
    const n = N?.n ?? {};
    const st = N?.st;
    const on = (n.on ?? 0) > 0.5;
    const sx = st ? st.x : -0.2 + 0.04 * Math.sin(t * 0.3);
    const sz = st ? st.z : 0;
    bridge.position.x = sx;
    trolley.position.z = sz;
    hrn.visible = on;
    const waist = (st?.y ?? 0) + 0.56 * H;
    if (st) {
      hrn.position.set(sx, waist, sz);
      hrn.rotation.y = st.yaw;
    }
    // Slack and coiled up near the top when it's not on anyone.
    const endY = on ? waist + 0.52 : TOP - 0.55;
    cable(a.set(sx, TOP - 0.2, sz), b.set(sx, endY, sz));
    weight.position.y = 1.0 + (on && st ? 0.9 * st.y : 0) + (on ? 0.5 : 0);
    // Rocks in the bin build up, one a round; the one on the mat comes back with the next.
    const round = N?.b.n ?? 0;
    const got = (n.got ?? 0) > 0.5;
    const held = (n.rock ?? 0) > 0.5;
    rock.visible = !held && !got;
    tongs.rock.visible = held;
    stored.forEach((m, i) => (m.visible = !!N && wrap(round, 3) + (got ? 1 : 0) > i));
    at(tongs.root, N?.tool === 'tongs' ? N.props.tongs : null);
    if (N?.tool === 'tongs' && st) tongs.root.rotation.y = st.yaw - Math.PI;
    // Someone stands by, ready with a hand on the line.
    if (N) {
      const F = spotter.get();
      F.root.visible = true;
      nodHead(F, 0.06);
      F.armR(hand.set(-0.85, 1.15, 0.48));
      F.armL(null);
    } else spotter.hide();
  });
  out.work = marker(g, 0, 1, 0.3);
}
function HAZARD_OF(x: number, z: number): string {
  return x * z > 0 ? '#fbc02d' : '#f9a825';
}

// =============================================================================================
// 로봇팔 훈련기 (asArmTrainer, 2 × 1): a star-field board with a scale arm and a drifting module; a desk with two controllers and a view screen.

function armTrainer(g: THREE.Group, out: Built) {
  const T = AT.top;
  part(g, rbox(1.94, 0.04, 0.66, 0.01), '#39434c', 0, T - 0.02, 0.01);
  part(g, box(1.96, 0.012, 0.016), ORANGE, 0, T - 0.03, 0.345, NO);
  for (const sx of [-1, 1]) part(g, rbox(0.3, T - 0.04, 0.56, 0.01), '#4a555f', sx * 0.78, (T - 0.04) / 2, 0.02);
  // The board with its invented stars and planet limb.
  const zb = -0.42;
  const board = painted('asStarBoard', 512, 216, (c) => {
    const rnd = seeded(11);
    c.fillStyle = '#060c18';
    c.fillRect(0, 0, 512, 216);
    for (let i = 0; i < 120; i++) {
      c.fillStyle = `rgba(255,255,255,${0.3 + rnd() * 0.7})`;
      c.fillRect(rnd() * 512, rnd() * 216, 1.6, 1.6);
    }
    c.fillStyle = '#1f6f8b';
    c.beginPath();
    c.arc(120, 330, 200, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(160,220,255,0.6)';
    c.lineWidth = 4;
    c.beginPath();
    c.arc(120, 330, 204, 0, Math.PI * 2);
    c.stroke();
  });
  part(g, rbox(1.94, 0.88, 0.05, 0.01), GRAPHITE, 0, 1.2, zb - 0.02);
  picture(g, board, 1.88, 0.8, 0, 1.2, zb + 0.008);
  // The station truss along the board, the arm's base, the port.
  part(g, box(1.86, 0.03, 0.03), '#b0bec5', 0, 0.98, zb + 0.04, NO);
  for (let i = 0; i < 12; i++) part(g, box(0.008, 0.08, 0.02), '#90a4ae', -0.88 + i * 0.16, 1.02, zb + 0.04, NO);
  const P = AT.port;
  part(g, cyl(0.05, 0.05, 0.05, 14), '#cfd8dc', P[0], P[1] + 0.09, P[2] - 0.03, NO);
  part(g, rbox(0.3, 0.08, 0.05, 0.01), '#b0bec5', P[0], P[1] + 0.13, zb + 0.05);
  const portLamp = ownLit(g, ball(0.012), '#5a3c10', P[0] + 0.1, P[1] + 0.13, zb + 0.08);
  const B = vOf(AT.base);
  part(g, cyl(0.04, 0.05, 0.08, 12), '#90a4ae', B.x, B.y - 0.06, B.z, NO);
  const seg1 = limb(g, 0.018, SHELL);
  const seg2 = limb(g, 0.015, SHELL);
  const elbow = part(g, ball(0.027), '#90a4ae', 0, 0, 0, NO);
  const effector = part(g, cyl(0.02, 0.03, 0.05, 10), '#546e7a', 0, 0, 0, NO);
  // The module: a drum with panels and a grapple pin.
  const mod = group(g, AT.fly[0], AT.fly[1], AT.fly[2]);
  part(mod, cyl(0.055, 0.055, 0.14, 14), '#eceff1', 0, 0, 0, { rz: Math.PI / 2 });
  for (const sx of [-1, 1]) part(mod, box(0.16, 0.002, 0.07), '#1a3a70', sx * 0.17, 0, 0, NO);
  part(mod, cyl(0.008, 0.008, 0.04, 8), ORANGE, 0, -0.07, 0, NO);
  // The screen on the desk: the end camera, a cross and a distance.
  part(g, rbox(0.5, 0.3, 0.014, 0.006), BLACK, 0, T + 0.2, -0.16, { rx: -0.12 });
  const view = liveScreen(g, 0.47, 0.27, 320, 184, 0, T + 0.2, -0.15, 0, -0.12);
  // The two controllers. Each is a base with a stick that tilts.
  const sticks = [AT.stickL, AT.stickR].map((p, i) => {
    part(g, rbox(0.14, 0.03, 0.14, 0.01), '#20262c', p[0], T + 0.015, p[2]);
    const s = group(g, p[0], T + 0.03, p[2]);
    part(s, cyl(0.009, 0.011, 0.08, 8), GREY, 0, 0.04, 0, NO);
    part(s, rbox(0.04, 0.06, 0.04, 0.015), '#37474f', 0, 0.085, 0, NO);
    part(s, cyl(0.01, 0.01, 0.006, 8), i ? RED : AMBER, 0, 0.118, 0, NO);
    return s;
  });
  label(g, '병진', 0.08, 0.03, AT.stickL[0], T + 0.002, AT.stickL[2] + 0.1, '#20262c', '#e3edf3').rotation.x = -Math.PI / 2;
  label(g, '회전', 0.08, 0.03, AT.stickR[0], T + 0.002, AT.stickR[2] + 0.1, '#20262c', '#e3edf3').rotation.x = -Math.PI / 2;
  part(g, cyl(0.17, 0.16, 0.05, 16), NAVY_L, AT.seat[0], AT.seat[1] - 0.025, AT.seat[2]);
  part(g, cyl(0.022, 0.026, AT.seat[1] - 0.1, 10), STEEL, AT.seat[0], (AT.seat[1] - 0.05) / 2 + 0.02, AT.seat[2], NO);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.6;
    rod(g, v3(AT.seat[0], 0.1, AT.seat[2]), v3(AT.seat[0] + Math.cos(a) * 0.2, 0.02, AT.seat[2] + Math.sin(a) * 0.2), 0.012, STEEL);
  }
  const spots: Record<string, Spot> = { asArmCapture: seatAt(g, 'asArmCapture', AT.seat), asArmBerth: seatAt(g, 'asArmBerth', AT.seat) };
  enrol(g, spots, () => 'arm');
  const tip = new THREE.Vector3();
  const el = new THREE.Vector3();
  const d = new THREE.Vector3();
  const flyAt = new THREE.Vector3();
  const home = vOf(AT.home);
  drive(g, out, spots, {}, (_now, N, t) => {
    const n = N?.n ?? {};
    sticks[0].rotation.set(-0.3 * (n.ty ?? 0), 0, -0.3 * (n.tx ?? 0));
    sticks[1].rotation.set(0.14 * Math.cos(t * 0.9) * (N ? 1 : 0), 0, 0.14 * Math.sin(t * 0.7) * (N ? 1 : 0));
    const drift = clamp01(N ? n.drift : 1);
    flyAt.set(AT.fly[0] + 0.05 * Math.sin(t * 0.31) * drift, AT.fly[1] + 0.05 * Math.sin(t * 0.23) * drift, AT.fly[2]);
    const reach = clamp01(n.reach);
    const caught = (n.caught ?? 0) > 0.5;
    const move = clamp01(n.move);
    tip.copy(home).lerp(flyAt, reach);
    if (caught || move > 0) tip.lerp(vOf(AT.port), move);
    // Two links, the elbow up, the far end kept within what they reach.
    d.subVectors(tip, B);
    const L = Math.max(0.05, Math.min(AT.link * 2 - 0.002, d.length()));
    d.normalize();
    tip.copy(B).addScaledVector(d, L);
    const h = Math.sqrt(Math.max(0, AT.link * AT.link - (L * L) / 4));
    el.copy(B).addScaledVector(d, L / 2).add(tmp.set(-d.y, d.x, 0).multiplyScalar(h));
    seg1(B, el);
    seg2(el, tip);
    elbow.position.copy(el);
    effector.position.copy(tip);
    // Taken with the arm once caught; left where it was let go; berthed on the port.
    if (caught) mod.position.copy(tip).add(tmp.set(0, 0.065, 0));
    else if (move > 0.98 || (n.berthed ?? 0) > 0.5) mod.position.set(AT.port[0], AT.port[1] + 0.065, AT.port[2]);
    else mod.position.copy(flyAt);
    setLit(portLamp, (n.berthed ?? 0) > 0.5 ? '#69f0ae' : '#5a3c10');
    const dist = tip.distanceTo(flyAt);
    view.draw(`${q(dist, 40)}|${caught ? 1 : 0}|${q(n.berthed, 1)}|${q(t, 2)}`, (c) => {
      c.fillStyle = '#06101c';
      c.fillRect(0, 0, 320, 184);
      const r = pos(14 + 44 * Math.max(0, 1 - dist * 1.1));
      c.fillStyle = '#d7dee3';
      c.beginPath();
      c.arc(160 + 26 * Math.sin(t * 0.3) * Math.min(1, dist), 92 + 14 * Math.sin(t * 0.23) * Math.min(1, dist), r, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = caught ? '#69f0ae' : '#ffca28';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(160, 40);
      c.lineTo(160, 144);
      c.moveTo(108, 92);
      c.lineTo(212, 92);
      c.stroke();
      text(c, caught ? '포획 완료' : `거리 ${(dist * 24).toFixed(1)} m`, 8, 14, 15, caught ? '#69f0ae' : '#ffca28');
      if ((n.berthed ?? 0) > 0.5) text(c, '결합 완료', 312, 14, 15, '#69f0ae', 'right');
    });
  });
  out.work = marker(g, 0, T + 0.12, 0.17);
}

// =============================================================================================
// 과학 글러브박스 (asGlovebox, 2 × 1): a clear box on a bench, ports with rubber gloves, a plate of wells, vials and a wire loop; a small monitor beside it.

const ACRYLIC = new THREE.MeshToonMaterial({ color: '#cfeefa', transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
function glovebox(g: THREE.Group, out: Built) {
  const F = GB.floor;
  // The bench on legs, a drawer, the steel box floor.
  part(g, rbox(1.94, 0.04, 0.8, 0.01), PANEL, 0, F - 0.04, -0.06);
  for (const sx of [-1, 1]) part(g, rbox(0.34, F - 0.06, 0.66, 0.01), '#cfd8dc', sx * 0.74, (F - 0.06) / 2, -0.08);
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) part(g, box(0.28, 0.012, 0.012), GREY, sx * 0.74, 0.18 + i * 0.26, 0.255, NO);
  part(g, rbox(1.12, 0.02, 0.58, 0.006), '#9aa4aa', 0, F - 0.01, -0.03);
  // The clear case: a back panel, ends and top in frame, the front sloped.
  const zb = -0.32;
  const zf = 0.22;
  const top = 1.48;
  part(g, box(1.12, top - F, 0.012), '#b8c2c8', 0, (top + F) / 2, zb, NO);
  for (const sx of [-1, 1]) {
    part(g, new THREE.BoxGeometry(0.008, top - F, zf - zb), '#ffffff', sx * 0.56, (top + F) / 2, (zb + zf) / 2, { material: ACRYLIC, outline: false, shadow: false }).userData.ownGeometry = true;
    rod(g, v3(sx * 0.56, F, zf), v3(sx * 0.56, top, zf - 0.08), 0.012, GREY_D);
    rod(g, v3(sx * 0.56, F, zb), v3(sx * 0.56, top, zb), 0.012, GREY_D);
    rod(g, v3(sx * 0.56, top, zb), v3(sx * 0.56, top, zf - 0.08), 0.012, GREY_D);
  }
  rod(g, v3(-0.56, top, zf - 0.08), v3(0.56, top, zf - 0.08), 0.012, GREY_D);
  rod(g, v3(-0.56, F, zf), v3(0.56, F, zf), 0.012, GREY_D);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.008, zf - zb - 0.08), ACRYLIC);
  lid.userData.ownGeometry = true;
  lid.position.set(0, top, (zb + zf - 0.08) / 2);
  g.add(lid);
  const face = new THREE.Mesh(new THREE.BoxGeometry(1.12, Math.hypot(top - F, 0.08), 0.008), ACRYLIC);
  face.userData.ownGeometry = true;
  face.position.set(0, (top + F) / 2, zf - 0.04);
  face.rotation.x = Math.atan2(-0.08, top - F) * -1;
  g.add(face);
  // A lit strip inside; the ports' rings; the sleeves.
  ownLit(g, box(0.9, 0.012, 0.02), '#fff8e1', 0, top - 0.03, -0.1);
  for (const p of [GB.portL, GB.portR]) part(g, new THREE.TorusGeometry(0.07, 0.014, 8, 22), GREY_D, p[0], p[1], p[2], { outline: false }).userData.ownGeometry = true;
  const sleeveL = limb(g, 0.045, '#23262b');
  const sleeveR = limb(g, 0.045, '#23262b');
  const handL = part(g, rbox(0.075, 0.03, 0.09, 0.012), '#23262b', 0, 0, 0, NO);
  const handR = part(g, rbox(0.075, 0.03, 0.09, 0.012), '#23262b', 0, 0, 0, NO);
  // The plate of four wells, and its lid, the vial rack, the loop on its stand.
  part(g, rbox(0.34, 0.02, 0.13, 0.006), '#eceff1', -0.035, F + 0.012, GB.well(0)[2]);
  const wells = [0, 1, 2, 3].map((i) => {
    const w = GB.well(i);
    part(g, cyl(0.022, 0.022, 0.006, 14), '#bcd6e4', w[0], F + 0.024, w[2], NO);
    const drop = ownLit(g, cyl(0.018, 0.018, 0.004, 14), '#4dd0c4', w[0], F + 0.027, w[2]);
    const crystal = part(g, box(0.014, 0.014, 0.014), '#e1f5fe', w[0], F + 0.034, w[2], { ry: 0.6, rx: 0.5, outline: false });
    drop.visible = false;
    crystal.visible = false;
    return { drop, crystal };
  });
  const cover = part(g, box(0.34, 0.006, 0.13), '#ffffff', 0, 0, 0, { material: ACRYLIC, outline: false, shadow: false });
  part(g, rbox(0.16, 0.05, 0.1, 0.006), '#607d8b', GB.vial[0], F + 0.025, GB.vial[2]);
  for (let i = 0; i < 3; i++) {
    part(g, cyl(0.012, 0.012, 0.06, 10), '#b3e5fc', GB.vial[0] - 0.045 + i * 0.045, F + 0.06, GB.vial[2], NO);
    part(g, cyl(0.013, 0.013, 0.012, 10), ['#ef5350', '#ffca28', '#66bb6a'][i], GB.vial[0] - 0.045 + i * 0.045, F + 0.095, GB.vial[2], NO);
  }
  part(g, rbox(0.14, 0.02, 0.09, 0.005), '#607d8b', GB.tipRest[0], F + 0.01, GB.tipRest[2], NO);
  const loopArm = group(g, GB.loop[0], GB.loop[1], GB.loop[2]);
  part(loopArm, cyl(0.006, 0.006, 0.2, 8), CHROME, 0, -0.1, 0, NO);
  part(loopArm, new THREE.TorusGeometry(0.03, 0.002, 6, 20), CHROME, 0, 0.03, 0, { outline: false }).userData.ownGeometry = true;
  const film = new THREE.Mesh(new THREE.CircleGeometry(0.028, 20), new THREE.MeshBasicMaterial({ color: '#90caf9', transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
  film.userData.ownGeometry = film.userData.ownMaterial = true;
  film.position.y = 0.03;
  loopArm.add(film);
  const bead = ownLit(loopArm, ball(0.012), '#29b6f6', 0, 0.03, 0);
  const pipette = penTool(g, 'asPipette', '#eceff1', '#90caf9', 0.008, false);
  // Beside it: the screen of the microscope view, a small rack, a sign.
  rod(g, v3(0.76, F, -0.2), v3(0.76, F + 0.36, -0.2), 0.012, GREY_D);
  part(g, rbox(0.42, 0.3, 0.02, 0.006), BLACK, 0.76, F + 0.46, -0.19);
  const micro = liveScreen(g, 0.38, 0.26, 256, 176, 0.76, F + 0.46, -0.178);
  part(g, rbox(0.24, 0.16, 0.2, 0.01), '#607d8b', -0.76, F + 0.08, -0.14);
  ownLit(g, ball(0.012), GREEN, -0.82, F + 0.13, -0.035);
  label(g, '음압 정상', 0.18, 0.04, -0.72, F + 0.1, -0.038, '#37474f', '#e3edf3');
  label(g, '궤도 과학 실험', 0.5, 0.07, 0, top + 0.08, zb + 0.02, NAVY, '#e3edf3');
  part(g, box(0.52, 0.08, 0.02), NAVY, 0, top + 0.08, zb + 0.005, NO);
  const spots: Record<string, Spot> = { asGloveCrystal: standAt(g, 'asGloveCrystal', 0, GB.stand), asGloveFluid: standAt(g, 'asGloveFluid', 0, GB.stand) };
  enrol(g, spots, () => 'science');
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const pl = vOf(GB.portL);
  const pr = vOf(GB.portR);
  drive(g, out, spots, { pipette: pipette.held }, (now, N, t) => {
    const n = N?.n ?? {};
    const inBox = N ? clamp01(n.inBox) : 0;
    const lk = N?.key.l ?? GB.restL;
    const rk = N?.tool === 'pipette' ? (N.props.pipette ?? GB.restR) : (N?.key.r ?? GB.restR);
    // A sleeve draws to the wrist, a little short of where the hand is; hanging in the box when no one's in it.
    a.copy(vOf(lk)).lerp(vOf(GB.restL), 1 - inBox);
    b.copy(vOf(rk)).lerp(vOf(GB.restR), 1 - inBox);
    sleeveL(pl, a.clone().lerp(pl, 0.1));
    sleeveR(pr, b.clone().lerp(pr, 0.1));
    handL.position.copy(a).setY(a.y - 0.01);
    handR.position.copy(b).setY(b.y - 0.01);
    handL.visible = handR.visible = true;
    at(pipette.root, N?.props.pipette ?? null, [GB.tipRest[0], F + 0.03 + PEN_UP, GB.tipRest[2]]);
    const crystalOn = now === 'asGloveCrystal';
    const filled = crystalOn ? (n.wells ?? 0) : 0;
    const grow = clamp01(n.grow);
    wells.forEach((w, i) => {
      w.drop.visible = filled > i + 0.1;
      w.crystal.visible = w.drop.visible && grow > 0.1;
      w.crystal.scale.setScalar(Math.max(0.05, grow));
    });
    const sealed = clamp01(n.sealed);
    cover.visible = crystalOn && sealed > 0.01;
    cover.position.set(-0.035 + 0.6 * (1 - sealed), F + 0.034, GB.well(0)[2] - 0.2 * (1 - sealed));
    const fluidOn = now === 'asGloveFluid';
    at(loopArm, fluidOn ? (N?.props.loopAt ?? GB.loop) : GB.loop);
    film.visible = fluidOn && (n.film ?? 0) > 0.3;
    const dropR = clamp01(n.drop);
    bead.visible = fluidOn && dropR > 0.02;
    const wob = (n.wob ?? 0) > 0.5 ? 0.15 * Math.sin(t * 9) : 0;
    bead.scale.set(Math.max(0.05, dropR) * (1 + wob), Math.max(0.05, dropR) * (1 - wob), Math.max(0.05, dropR));
    micro.draw(`${now}|${q(grow, 12)}|${q(dropR, 12)}|${q(n.film, 3)}|${wob ? q(t, 8) : 0}`, (c) => {
      c.fillStyle = '#0b1a24';
      c.fillRect(0, 0, 256, 176);
      c.strokeStyle = 'rgba(255,255,255,0.12)';
      c.beginPath();
      c.arc(128, 88, 80, 0, Math.PI * 2);
      c.stroke();
      if (fluidOn) {
        c.strokeStyle = 'rgba(144,202,249,0.8)';
        c.lineWidth = 2;
        c.beginPath();
        c.arc(128, 88, 62, 0, Math.PI * 2);
        c.stroke();
        c.fillStyle = '#29b6f6';
        c.beginPath();
        c.ellipse(128, 88, pos(42 * dropR * (1 + wob)), pos(42 * dropR * (1 - wob)), 0, 0, Math.PI * 2);
        c.fill();
        text(c, '표면 장력 관찰', 8, 14, 14, '#cfe4f2');
      } else {
        const size = pos(10 + 42 * grow);
        c.fillStyle = '#b3e5fc';
        c.save();
        c.translate(128, 88);
        c.rotate(0.6);
        c.fillRect(-size / 2, -size / 2, size, size);
        c.strokeStyle = '#ffffff';
        c.lineWidth = 2;
        c.strokeRect(-size / 2, -size / 2, size, size);
        c.restore();
        text(c, grow > 0.05 ? `결정 성장 ${Math.round(grow * 100)}%` : '결정 실험 대기', 8, 14, 14, '#cfe4f2');
      }
    });
  });
  out.work = marker(g, 0, F + 0.1, 0.2);
}

// =============================================================================================
// 생존 훈련 코너 (asSurvivalCorner, 2 × 2): a patch of grass and gravel; a parachute canopy on a pole; stake and line; a bench with a fire tray and beacon; a raft behind.

function survivalCorner(g: THREE.Group, W: number, D: number, out: Built) {
  const ground = painted('asGrass', 320, 320, (c) => {
    const rnd = seeded(41);
    c.fillStyle = '#6f8a55';
    c.fillRect(0, 0, 320, 320);
    for (let i = 0; i < 700; i++) {
      c.fillStyle = rnd() > 0.5 ? 'rgba(40,70,30,0.3)' : 'rgba(180,200,120,0.25)';
      c.fillRect(rnd() * 320, rnd() * 320, 2, 3 + rnd() * 5);
    }
    c.fillStyle = '#a79a84';
    c.beginPath();
    c.ellipse(230, 220, 80, 70, 0.3, 0, Math.PI * 2);
    c.fill();
    for (let i = 0; i < 90; i++) {
      c.fillStyle = rnd() > 0.5 ? '#8c8069' : '#c6baa3';
      c.fillRect(170 + rnd() * 120, 170 + rnd() * 100, 4, 3);
    }
  });
  part(g, rbox(W - 0.06, 0.04, D - 0.06, 0.01), '#5d7247', 0, 0.02, 0, NO);
  picture(g, ground, W - 0.1, D - 0.1, 0, 0.042, 0, '#ffffff', 0, -Math.PI / 2);
  // The canopy's cloth, striped; two slopes hinged on a ridge going back to the ground.
  const cloth = painted('asCanopy', 256, 128, (c) => {
    for (let i = 0; i < 8; i++) {
      c.fillStyle = i % 2 ? '#ef6c00' : '#f5f5f2';
      c.fillRect((i * 256) / 8, 0, 32, 128);
    }
  });
  const clothMat = new THREE.MeshToonMaterial({ map: cloth, side: THREE.DoubleSide });
  const L = 0.95;
  const slopes = [-1, 1].map((sx) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, L), clothMat);
    m.userData.ownGeometry = m.userData.ownMaterial = true;
    m.userData.side = sx;
    m.castShadow = true;
    g.add(m);
    return m;
  });
  const poleX = SV.pole[0];
  const poleZ = SV.pole[2];
  const pole = part(g, cyl(0.016, 0.018, 1, 8), '#8d6e4f', poleX, 0, poleZ, NO);
  // The stake, the post the guy line ties to, the line; a heap of line.
  const stake = part(g, cyl(0.022, 0.012, 0.62, 8), '#a1887f', SV.stake[0], SV.stake[1] - 0.31, SV.stake[2], NO);
  part(g, cyl(0.03, 0.04, SV.knot[1] - 0.02, 10), '#6d4c41', SV.knot[0], (SV.knot[1] - 0.02) / 2 + 0.03, SV.knot[2] - 0.03);
  const line = limb(g, 0.004, '#fff176');
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  // Mallet's crate, the raft behind with its paddle, a pack, water.
  part(g, rbox(0.28, 0.24, 0.26, 0.01), '#7a5a3f', -0.08, 0.16, 0.66);
  label(g, '비상 장비', 0.2, 0.05, -0.08, 0.2, 0.795, '#5b4331', '#f3ecdf');
  part(g, new THREE.TorusGeometry(0.34, 0.09, 10, 26).rotateX(Math.PI / 2), ORANGE, 0.42, 0.13, -0.5, NO).userData.ownGeometry = true;
  part(g, cyl(0.3, 0.3, 0.02, 22), '#f9a825', 0.42, 0.06, -0.5, NO);
  rod(g, v3(0.8, 0.05, -0.8), v3(0.2, 0.26, -0.45), 0.012, '#37474f');
  part(g, rbox(0.1, 0.02, 0.2, 0.008), '#37474f', 0.8, 0.05, -0.8);
  part(g, rbox(0.3, 0.42, 0.18, 0.05), '#546e7a', 0.86, 0.25, -0.18);
  part(g, cyl(0.035, 0.035, 0.18, 12), '#90caf9', 0.72, 0.13, 0.0);
  // The bench: stands in for a stump, with the fire tray, stones and kindling.
  const S = SV.stump;
  part(g, rbox(0.66, 0.06, 0.44, 0.015), '#8d6e4f', S[0], S[1] - 0.03, S[2]);
  for (const [x, z] of [[-0.26, -0.14], [0.26, -0.14], [-0.26, 0.14], [0.26, 0.14]] as const) part(g, cyl(0.04, 0.05, S[1] - 0.06, 8), '#6d4c41', S[0] + x, (S[1] - 0.06) / 2 + 0.04, S[2] + z, NO);
  part(g, cyl(0.12, 0.13, 0.03, 16), '#4a4a4a', S[0], S[1] + 0.015, S[2] - 0.05, NO);
  for (let i = 0; i < 7; i++) {
    const t = (i / 7) * Math.PI * 2;
    part(g, ball(0.028), '#8d8a84', S[0] + Math.cos(t) * 0.12, S[1] + 0.035, S[2] - 0.05 + Math.sin(t) * 0.12, NO);
  }
  for (let i = 0; i < 4; i++) part(g, cyl(0.007, 0.007, 0.12, 6), '#6d4c41', S[0], S[1] + 0.05, S[2] - 0.05, { ry: i * 1.1, rz: Math.PI / 2 - 0.3, outline: false });
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 10), new THREE.MeshBasicMaterial({ color: '#ff9800' }));
  flame.userData.ownGeometry = flame.userData.ownMaterial = true;
  flame.position.set(S[0], S[1] + 0.11, S[2] - 0.05);
  flame.visible = false;
  g.add(flame);
  const sparks = [0, 1, 2].map((i) => {
    const m = ownLit(g, ball(0.005), '#ffe082', S[0], S[1] + 0.07, S[2] - 0.05);
    m.userData.i = i;
    m.visible = false;
    return m;
  });
  // The beacon on the bench, its aerial rises; a lamp winks.
  const Bc = SV.beacon;
  part(g, rbox(0.1, 0.32, 0.08, 0.012), '#fbc02d', Bc[0], Bc[1] - 0.17, Bc[2]);
  label(g, '비콘', 0.07, 0.03, Bc[0], Bc[1] - 0.1, Bc[2] + 0.042, '#fbc02d', '#26262c');
  const aerial = part(g, cyl(0.004, 0.004, 1, 6), BLACK, Bc[0] + 0.02, 0, Bc[2], NO);
  const wink = ownLit(g, ball(0.012), '#5a1010', Bc[0] - 0.02, Bc[1] - 0.005, Bc[2]);
  // The flash the mirror throws, on the wall behind.
  const flash = ownLit(g, ball(0.05), '#ffffe0', -0.1, 1.7, -0.9);
  flash.visible = false;
  // The tools.
  const mallet = malletTool(g);
  const radio = radioTool(g);
  const mirror = mirrorTool(g);
  const striker = strikerTool(g);
  // A small sign.
  rod(g, v3(-0.85, 0.04, 0.7), v3(-0.85, 0.82, 0.7), 0.014, '#6d4c41');
  label(g, '귀환 후 생존 훈련', 0.56, 0.1, -0.85, 0.88, 0.72, '#3e5a33', '#f3ecdf');
  part(g, rbox(0.6, 0.14, 0.02, 0.006), '#6d4c41', -0.85, 0.88, 0.705, NO);
  const spots: Record<string, Spot> = { asShelter: standAt(g, 'asShelter', SV.pole[0], 0.68), asSignal: standAt(g, 'asSignal', 0.3, 0.64) };
  enrol(g, spots, () => 'survival');
  const ridgeBack = v3(poleX, 0.1, poleZ - 0.9);
  const setCanopy = (open: number) => {
    const h = 0.12 + (SV.pole[1] + 0.02 - 0.12) * open;
    pole.scale.y = Math.max(0.05, h);
    pole.position.y = h / 2 + 0.04;
    const mid = (poleZ + ridgeBack.z) / 2;
    const halfW = 0.58;
    const slant = Math.hypot(h, halfW);
    const tilt = Math.atan2(h, halfW);
    slopes.forEach((m) => {
      const sx = m.userData.side as number;
      m.scale.set(slant, 1, 1);
      m.position.set(poleX + (sx * halfW) / 2, 0.04 + h / 2, mid);
      m.rotation.set(-Math.PI / 2, 0, 0, 'YXZ');
      m.rotateY(sx * tilt);
    });
  };
  setCanopy(0.06);
  let lastOpen = -1;
  drive(g, out, spots, { mallet: mallet.held, radio: radio.held, mirror: mirror.held, striker: striker.held }, (now, N, t) => {
    const n = N?.n ?? {};
    const open = now === 'asShelter' ? clamp01(n.tarp) : 0.06;
    if (Math.abs(open - lastOpen) > 0.003) {
      lastOpen = open;
      setCanopy(Math.max(0.06, open));
    }
    const tug = n.tug ?? 0;
    const tied = (n.tied ?? 0) > 0.3;
    // Tied, the line runs taut from the pole's top to the post; before that it hangs from the post.
    if (tied) line(a.set(poleX, Math.max(0.1, 0.12 + (SV.pole[1] - 0.1) * open), poleZ), b.set(SV.knot[0], SV.knot[1], SV.knot[2] - 0.01 + 0.015 * tug));
    else line(a.set(SV.knot[0], SV.knot[1], SV.knot[2] - 0.01), b.set(SV.knot[0] + 0.04, 0.06, SV.knot[2] - 0.01));
    stake.position.y = SV.stake[1] - 0.31 - 0.1 * clamp01(n.driven);
    at(mallet.root, N?.props.mallet ?? null, SV.malletRest);
    at(radio.root, N?.props.radio ?? null, SV.radioRest);
    at(mirror.root, N?.props.mirror ?? null, SV.mirrorRest);
    at(striker.root, N?.props.striker ?? null, SV.strikerRest);
    // The radio's and striker's rest lying on the bench.
    radio.root.rotation.x = N?.tool === 'radio' ? 0 : -Math.PI / 2;
    striker.root.rotation.z = N?.tool === 'striker' ? 0 : Math.PI / 2;
    mirror.root.rotation.x = N?.tool === 'mirror' ? 0 : -Math.PI / 2;
    setLit(mirror.glass, (n.flash ?? 0) > 0.5 ? '#ffffff' : '#cfe9f5');
    flash.visible = (n.flash ?? 0) > 0.5;
    aerial.scale.y = Math.max(0.02, 0.06 + 0.24 * clamp01(n.aerial));
    aerial.position.y = Bc[1] - 0.01 + aerial.scale.y / 2;
    setLit(wink, (n.blink ?? 0) > 0.5 && Math.floor(t * 2) % 2 === 0 ? '#ff5252' : '#5a1010');
    const fire = clamp01(n.fire);
    flame.visible = fire > 0.05;
    flame.scale.set(Math.max(0.1, fire), Math.max(0.1, fire * (1 + 0.2 * Math.sin(t * 13))), Math.max(0.1, fire));
    sparks.forEach((m, i) => {
      m.visible = (n.spark ?? 0) > 0.5 && Math.floor(t * 9 + i) % 2 === 0;
      m.position.set(S[0] + 0.04 * Math.sin(t * 17 + i * 2), S[1] + 0.07 + 0.03 * Math.abs(Math.sin(t * 13 + i)), S[2] - 0.05 + 0.03 * Math.cos(t * 11 + i));
    });
  });
  out.work = marker(g, 0, 0.8, 0.4);
}

// =============================================================================================
// 언론·견학 벽 (asPressWall, 3 × 1): the agency's backdrop, a lectern with a rocket on a stand beside it; the board of the children's question cards.

const QUESTIONS: readonly string[] = ['우주에서 어떻게 자요?', '똥은 어떻게 눠요?', '별이 더 잘 보여요?', '무섭지 않아요?', '라면 먹을 수 있어요?', '나도 갈 수 있어요?'];
function paintCard(c: Ctx2, i: number, answered: number, wide: number, high: number) {
  c.fillStyle = '#fffdf2';
  c.fillRect(0, 0, wide, high);
  text(c, QUESTIONS[wrap(i, QUESTIONS.length)], wide / 2, high * 0.3, Math.round(high * 0.19), '#26262c', 'center', false);
  if (answered > 0.1) {
    c.strokeStyle = '#1565c0';
    c.lineWidth = 2;
    c.beginPath();
    const n = Math.min(1, Math.max(0, answered));
    c.moveTo(wide * 0.1, high * 0.68);
    for (let k = 0; k <= 20 * n; k++) c.lineTo(wide * 0.1 + (k / 20) * wide * 0.8, high * 0.68 + Math.sin(k * 1.7) * high * 0.06);
    c.stroke();
  }
}
function pressWall(g: THREE.Group, W: number, out: Built) {
  const zb = -0.42;
  part(g, rbox(W - 0.08, 2.3, 0.06, 0.012), NAVY, 0, 1.15, zb);
  const back = painted('asBackdrop', 640, 500, (c) => {
    c.fillStyle = NAVY;
    c.fillRect(0, 0, 640, 500);
    // Tiled agency marks, an invented emblem of a ridge and a star.
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 6; x++) {
        const px = 58 + x * 110 + (y % 2) * 40;
        const py = 58 + y * 96;
        c.strokeStyle = '#6f93b5';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(px - 26, py + 14);
        c.lineTo(px - 6, py - 8);
        c.lineTo(px + 6, py + 4);
        c.lineTo(px + 26, py - 12);
        c.stroke();
        c.fillStyle = '#ffd54f';
        c.fillRect(px + 15, py - 22, 6, 6);
        text(c, '하늘마루', px, py + 30, 14, '#a9c4dd', 'center', false);
      }
    }
  });
  picture(g, back, 1.42, 2.16, -0.72, 1.17, zb + 0.032);
  // Tile stands in the show: the lectern, and a stand with a rocket on it.
  const lx = PW.lecternX;
  part(g, rbox(0.5, PW.top - 0.04, 0.3, 0.02), '#2c4466', lx, (PW.top - 0.04) / 2, PW.lecternZ);
  part(g, rbox(0.56, 0.04, 0.36, 0.01), '#1b2f4d', lx, PW.top - 0.02, PW.lecternZ - 0.01, { rx: -0.12 });
  const crest = painted('asLectern', 240, 200, (c) => {
    c.fillStyle = '#2c4466';
    c.fillRect(0, 0, 240, 200);
    c.strokeStyle = '#ffd54f';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(60, 120);
    c.lineTo(100, 70);
    c.lineTo(125, 100);
    c.lineTo(180, 58);
    c.stroke();
    text(c, AGENCY, 120, 160, 20, '#e3edf3', 'center');
  });
  picture(g, crest, 0.42, 0.35, lx, 0.72, PW.lecternZ + 0.153);
  rod(g, v3(lx - 0.1, PW.top, PW.lecternZ - 0.06), v3(lx, PW.top + 0.28, PW.lecternZ - 0.16), 0.005, GRAPHITE);
  part(g, cyl(0.016, 0.014, 0.05, 10), BLACK, lx, PW.top + 0.3, PW.lecternZ - 0.17, { rx: -0.5, outline: false });
  // The rocket's plinth, and the rocket.
  const rr = PW.rocketRest;
  part(g, cyl(0.1, 0.12, rr[1] - 0.12, 14), '#f2f4f5', rr[0], (rr[1] - 0.12) / 2, rr[2]);
  // The children's side: a cork board, a ledge to write on, drawings and thanks around it.
  const bx = PW.boardX;
  part(g, rbox(1.08, 2.0, 0.34, 0.012), '#4c5b68', bx, 1.0, -0.22);
  const cork = painted('asCork', 400, 260, (c) => {
    const rnd = seeded(61);
    c.fillStyle = '#b98f5e';
    c.fillRect(0, 0, 400, 260);
    for (let i = 0; i < 700; i++) {
      c.fillStyle = rnd() > 0.5 ? 'rgba(90,60,30,0.2)' : 'rgba(240,210,160,0.2)';
      c.fillRect(rnd() * 400, rnd() * 260, 2, 2);
    }
    text(c, '우주인에게 물어봐요!', 200, 22, 24, '#fffdf2', 'center');
  });
  picture(g, cork, 0.96, 0.62, bx, PW.board[1] + 0.03, PW.board[2] + 0.01);
  // The upper strip: drawings from a school, each its own rocket and star.
  const drawing = (i: number) =>
    painted(`asDraw${i}`, 140, 170, (c) => {
      const rnd = seeded(i * 13 + 3);
      c.fillStyle = '#fbf8ef';
      c.fillRect(0, 0, 140, 170);
      c.fillStyle = ['#ffb74d', '#81d4fa', '#c5e1a5', '#f48fb1'][wrap(i, 4)];
      c.fillRect(8, 8, 124, 110);
      c.fillStyle = '#eceff1';
      c.fillRect(58, 30, 24, 60);
      c.fillStyle = RED;
      c.beginPath();
      c.moveTo(58, 30);
      c.lineTo(70, 12);
      c.lineTo(82, 30);
      c.fill();
      for (let k = 0; k < 7; k++) {
        c.fillStyle = '#ffee58';
        c.fillRect(14 + rnd() * 110, 12 + rnd() * 96, 4, 4);
      }
      text(c, ['우주 최고!', '달에 가요', '나도 우주인', '고마워요'][wrap(i, 4)], 70, 142, 15, '#26262c', 'center', false);
    });
  for (let i = 0; i < 4; i++) picture(g, drawing(i), 0.2, 0.24, bx - 0.34 + i * 0.23, 1.82, PW.board[2] + 0.012, '#ffffff', 0.02 * (i - 1.5));
  // The answered cards, in their places; the ledge below; a box of new ones.
  const cards = [0, 1, 2, 3, 4, 5].map((i) => {
    const s = cardSlot(i);
    const m = liveScreen(g, 0.14, 0.105, 128, 96, s[0], s[1], s[2]);
    m.draw('0', (c) => paintCard(c, i, 1, 128, 96));
    part(g, ball(0.008), '#d9445c', s[0], s[1] + 0.05, s[2] + 0.006, NO);
    m.mesh.visible = false;
    return m;
  });
  const lg = PW.ledge;
  part(g, rbox(1.0, 0.03, 0.26, 0.008), '#d8dee2', bx, lg[1] - 0.012, lg[2] - 0.03);
  for (const sx of [-1, 1]) rod(g, v3(bx + sx * 0.46, lg[1] - 0.03, 0.0), v3(bx + sx * 0.46, lg[1] - 0.2, -0.04), 0.01, GREY_D);
  part(g, rbox(0.16, 0.06, 0.12, 0.006), '#8d6e4f', PW.box[0], PW.box[1] - 0.03, PW.box[2] - 0.02);
  for (let i = 0; i < 3; i++) part(g, box(0.13, 0.002, 0.09), '#fffdf2', PW.box[0], PW.box[1] + 0.002 + i * 0.003, PW.box[2] - 0.02, NO);
  rod(g, v3(1.26, 0.0, 0.1), v3(1.26, PW.box[1] - 0.06, PW.box[2] - 0.02), 0.012, GREY_D);
  const pen = penTool(g, 'asPenM', '#1565c0', '#1565c0', 0.006);
  const card = cardTool(g);
  const rocket = rocketTool(g);
  // The reporter across the lectern, and a camera on legs.
  const reporter = lazy(() => person(g, '#8e3b46', '#2f3a44', '#1a1a1a', lx, 1.22, Math.PI, 'female', 51));
  rod(g, v3(lx - 0.42, 0.02, 1.25), v3(lx - 0.42, 1.2, 1.25), 0.012, GRAPHITE);
  for (const [dx, dz] of [[0.14, 0.08], [-0.1, 0.1], [0, -0.14]] as const) rod(g, v3(lx - 0.42, 0.72, 1.25), v3(lx - 0.42 + dx, 0.02, 1.25 + dz), 0.008, GRAPHITE);
  part(g, rbox(0.1, 0.1, 0.2, 0.012), BLACK, lx - 0.42, 1.25, 1.2);
  part(g, cyl(0.035, 0.04, 0.08, 12), '#37474f', lx - 0.42, 1.25, 1.08, { rx: Math.PI / 2, outline: false });
  const tally = ownLit(g, ball(0.01), '#5a1010', lx - 0.38, 1.31, 1.13);
  const spots: Record<string, Spot> = { asPress: spot(g, 'stand', lx, 0, PW.speakZ, 0), asCards: standAt(g, 'asCards', bx, PW.stand) };
  spots.asPress.motion = 'asPress';
  const hand = new THREE.Vector3();
  let cardKey = -1;
  drive(g, out, spots, { pen: pen.held, card: card.held, rocket: rocket.held }, (now, N, t) => {
    const n = N?.n ?? {};
    at(pen.root, N?.props.pen ?? null, PW.penRest);
    at(rocket.root, N?.props.rocket ?? null, rr);
    const inHand = now === 'asCards' && N?.props.card;
    at(card.root, inHand ? N.props.card : null);
    if (card.root.visible) {
      const w = (N?.b.n ?? 0) * 10 + q(n.written, 6);
      if (w !== cardKey) {
        cardKey = w;
        card.face.draw(`${w}`, (c) => paintCard(c, N?.b.n ?? 0, n.written ?? 0, 104, 72));
      }
    }
    // Answered up to the round before; this round's when it's pinned.
    const slot = now === 'asCards' ? (n.slot ?? 0) : 0;
    const up = n.up ?? 0;
    cards.forEach((m, i) => (m.mesh.visible = i < slot || (i === slot && up > 0.5 && now === 'asCards')));
    card.root.visible = card.root.visible && up < 0.5;
    if (now === 'asPress') {
      const F = reporter.get();
      F.root.visible = true;
      nodHead(F, 0.06 + 0.03 * Math.sin(t * 1.3));
      F.armR(hand.set(lx - 0.16, 1.24 + 0.02 * Math.sin(t), 1.0));
      F.armL(hand.set(lx + 0.12, 1.1, 0.96));
      setLit(tally, Math.floor(t * 1.5) % 2 === 0 ? '#ff3b30' : '#6a1410');
    } else {
      reporter.hide();
      setLit(tally, '#5a1010');
    }
  });
  out.work = marker(g, bx, 1.1, 0.2);
}

// =============================================================================================

export const BUILDERS: Record<string, Builder> = {
  missionConsole(g, _W, _D, _c, _def, _ctx, out) {
    missionConsole(g, out);
  },
  asGroundTrack(g, W, _D, _c, _def, _ctx, out) {
    groundTrack(g, W, out);
  },
  spacesuitDisplay(g, _W, _D, _c, _def, _ctx, out) {
    spacesuitDisplay(g, out);
  },
  asSuitRack(g, _W, _D, _c, _def, _ctx, out) {
    suitRack(g, out);
  },
  asLowGravRig(g, W, D, _c, _def, _ctx, out) {
    lowGravRig(g, W, D, out);
  },
  asArmTrainer(g, _W, _D, _c, _def, _ctx, out) {
    armTrainer(g, out);
  },
  asGlovebox(g, _W, _D, _c, _def, _ctx, out) {
    glovebox(g, out);
  },
  asSurvivalCorner(g, W, D, _c, _def, _ctx, out) {
    survivalCorner(g, W, D, out);
  },
  asPressWall(g, W, _D, _c, _def, _ctx, out) {
    pressWall(g, W, out);
  },
  // furnitureSpace.ts's, as they were; only put on the list the wall reads.
  spacecraftMockup(g, W, D, c, def, ctx, out) {
    SPACE_DETAIL.spacecraftMockup(g, W, D, c, def, ctx, out);
    enrol(g, out.spots, (k) => (k === 'evaDrill' || k === 'astronaut_evaRehearsal' ? 'eva' : 'dock'));
  },
  centrifuge(g, W, D, c, def, ctx, out) {
    SPACE_DETAIL.centrifuge(g, W, D, c, def, ctx, out);
    enrol(g, out.spots, () => 'g');
  },
  asModuleMockup(g, W, D) {
    moduleMockup(g, W, D);
  },
  asNbPool(g, W, D, _c, _def, _ctx, out) {
    nbPool(g, W, D, out);
  },
  asBigCentrifuge(g, W, D, c, _def, _ctx, out) {
    bigCentrifuge(g, W, D, c, out);
    enrol(g, out.spots, () => 'g');
  },
  asGalleryGlass(g, W, D) {
    galleryGlass(g, W, D);
  },
  asLaunchDisplay(g, W, D) {
    launchDisplay(g, W, D);
  },
  asDishAntenna(g, W, D) {
    dishAntenna(g, W, D);
  },
};

// =============================================================================================
// The centre made over for its space (2026-11-05, the layout audit).

const WATER = new THREE.MeshToonMaterial({ color: '#29b6f6', transparent: true, opacity: 0.42, depthWrite: false, gradientMap: gradient, side: THREE.DoubleSide });
const PANE = new THREE.MeshToonMaterial({ color: '#cfeefa', transparent: true, opacity: 0.22, depthWrite: false, gradientMap: gradient, side: THREE.DoubleSide });
const HAZ = '#fbc02d';

/**
 * The station module mock-up (정거장 모듈 실물 모형, 5 × 2): a full-size laboratory module of the invented 마루 정거장 lying on its
 * cradles, cut open down its front so the racks are seen: the hull in white with its panel seams and yellow handrails, the
 * blue-grey lining, the racks along the back with their lights, the deck, the cabin light; the docking hatch at the left end, the
 * cone to the berthing ring at the right; a grated step up at the front and its name plate. Astronauts learn the racks in it.
 */
function moduleMockup(g: THREE.Group, W: number, D: number) {
  const xa = -W / 2 + 0.4;
  const xb = W / 2 - 0.55;
  const L = xb - xa;
  const xm = (xa + xb) / 2;
  const R = 0.82;
  const ay = 1.12;
  const zc = -0.12;
  const deck = ay - 0.55;
  part(g, rbox(L + 0.2, 0.12, D - 0.3, 0.03), '#b0bec5', xm, 0.06, -0.1);
  for (const x of [xa + 0.45, xm, xb - 0.45]) part(g, rbox(0.18, ay - R + 0.08, 1.3, 0.03), '#78909c', x, (ay - R + 0.08) / 2, zc);
  const open0 = Math.PI * 0.32;
  const wrap = Math.PI * 1.4;
  own(g, new THREE.CylinderGeometry(R, R, L, 48, 1, true, open0, wrap).rotateZ(Math.PI / 2), twoSided(SHELL), xm, ay, zc);
  own(g, new THREE.CylinderGeometry(R - 0.05, R - 0.05, L, 48, 1, true, open0, wrap).rotateZ(Math.PI / 2), twoSided('#b8c7d3', THREE.BackSide), xm, ay, zc);
  for (const a of [open0, open0 + wrap]) rod(g, v3(xa, ay + (R - 0.02) * Math.sin(a), zc + (R - 0.02) * Math.cos(a)), v3(xb, ay + (R - 0.02) * Math.sin(a), zc + (R - 0.02) * Math.cos(a)), 0.035, '#90a4ae');
  // The panels' seams round the hull and the end rings.
  for (let x = xa + 0.5; x < xb - 0.2; x += 0.55) own(g, new THREE.TorusGeometry(R + 0.004, 0.012, 4, 48, wrap).rotateZ(Math.PI - open0 - wrap).rotateY(Math.PI / 2), twoSided('#cfd8dc'), x, ay, zc);
  for (const x of [xa, xb]) own(g, new THREE.TorusGeometry(R, 0.05, 8, 56).rotateY(Math.PI / 2), twoSided('#90a4ae'), x, ay, zc);
  // Yellow handrails along the top of the hull.
  for (const a of [Math.PI * 0.6, Math.PI * 0.78]) {
    const y = ay + (R + 0.06) * Math.sin(a);
    const z = zc + (R + 0.06) * Math.cos(a);
    rod(g, v3(xa + 0.3, y, z), v3(xb - 0.3, y, z), 0.016, HAZ);
    for (let x = xa + 0.3; x <= xb - 0.29; x += 0.9) rod(g, v3(x, y, z), v3(x, ay + R * Math.sin(a), zc + R * Math.cos(a)), 0.012, HAZ);
  }
  // The left end: its wall inside, the docking hatch and ring outside.
  own(g, new THREE.CircleGeometry(R - 0.03, 48).rotateY(Math.PI / 2), twoSided('#b8c7d3'), xa + 0.01, ay, zc);
  own(g, new THREE.TorusGeometry(0.42, 0.06, 8, 40).rotateY(Math.PI / 2), twoSided('#78909c'), xa - 0.08, ay, zc);
  part(g, rbox(0.06, 0.7, 0.7, 0.2), '#cfd8dc', xa - 0.05, ay, zc);
  // The right end: the cone to the berthing ring.
  own(g, new THREE.CylinderGeometry(R, 0.5, 0.36, 48, 1, true).rotateZ(Math.PI / 2), twoSided(SHELL), xb + 0.18, ay, zc);
  own(g, new THREE.TorusGeometry(0.5, 0.055, 8, 40).rotateY(Math.PI / 2), twoSided('#90a4ae'), xb + 0.36, ay, zc);
  own(g, new THREE.CircleGeometry(0.48, 40).rotateY(Math.PI / 2), twoSided('#e8e8e4'), xb + 0.36, ay, zc);
  // Inside: the deck, the racks along the back with their lights, the cabin light.
  part(g, rbox(L - 0.08, 0.05, 1.1, 0.01), '#78909c', xm, deck - 0.025, zc);
  const rz = zc - 0.5;
  const racks = Math.floor((L - 0.2) / 0.55);
  for (let i = 0; i < racks; i++) {
    const x = xa + 0.25 + (i + 0.5) * ((L - 0.5) / racks);
    part(g, rbox(0.48, 0.95, 0.14, 0.01), i % 3 === 1 ? '#eceff1' : '#cfd8dc', x, deck + 0.52, rz);
    for (let j = 0; j < 4; j++) part(g, box(0.4, 0.012, 0.01), '#90a4ae', x, deck + 0.18 + j * 0.22, rz + 0.075, NO);
    for (let j = 0; j < 3; j++) ownLit(g, box(0.025, 0.025, 0.01), [GREEN, AMBER, '#4fc3f7'][(i + j) % 3], x - 0.16 + j * 0.05, deck + 0.9, rz + 0.08);
    if (i % 2 === 0) part(g, rbox(0.3, 0.2, 0.02, 0.01), '#263238', x, deck + 0.62, rz + 0.08);
  }
  ownLit(g, box(L - 0.6, 0.02, 0.08), '#fffde7', xm, ay + 0.68, zc - 0.2);
  // The step up at the front, grated, and the name plate on the plinth.
  part(g, rbox(1.4, 0.05, 0.4, 0.01), '#78909c', xm, deck - 0.03, zc + R + 0.15);
  for (const [y, z] of [[0.38, zc + R + 0.45], [0.19, zc + R + 0.7]] as const) part(g, rbox(1.4, 0.04, 0.24, 0.01), '#78909c', xm, y, z);
  label(g, `${STATION} 실험 모듈 · 훈련용 실물 모형`, 1.6, 0.13, xm + 1.25, 0.25, D / 2 - 0.06, NAVY, '#e3edf3');
}

/** A diver or a suited astronaut lying in the water, face down, head to +x: a body, the tank or the backpack, a head. */
function swimmer(g: THREE.Object3D, x: number, y: number, z: number, ry: number, suit: boolean): THREE.Group {
  const m = group(g, x, y, z, ry);
  if (suit) {
    part(m, rbox(0.8, 0.32, 0.4, 0.12), '#f5f5f5', 0, 0, 0);
    part(m, rbox(0.4, 0.2, 0.44, 0.06), '#e0e0e0', 0.05, 0.2, 0);
    part(m, ball(0.17), '#fafafa', 0.5, 0.03, 0);
    part(m, ball(0.12), '#ffb300', 0.6, 0.0, 0, NO);
    for (const sz of [-1, 1]) rod(m, v3(-0.35, 0, sz * 0.12), v3(-0.85, -0.05, sz * 0.14), 0.09, '#f5f5f5');
    for (const sz of [-1, 1]) rod(m, v3(0.3, 0, sz * 0.22), v3(0.62, -0.12, sz * 0.32), 0.07, '#f5f5f5');
  } else {
    part(m, rbox(0.62, 0.18, 0.28, 0.08), '#212121', 0, 0, 0);
    part(m, cyl(0.07, 0.07, 0.5, 10), HAZ, -0.02, 0.15, 0, { rz: Math.PI / 2 });
    part(m, ball(0.1), '#212121', 0.4, 0.02, 0);
    part(m, box(0.06, 0.08, 0.16), '#90caf9', 0.48, 0.03, 0, NO);
    for (const sz of [-1, 1]) {
      rod(m, v3(-0.28, 0, sz * 0.08), v3(-0.75, -0.04, sz * 0.1), 0.055, '#212121');
      part(m, box(0.22, 0.02, 0.12), '#1565c0', -0.86, -0.05, sz * 0.1, NO);
    }
  }
  return m;
}

/**
 * The neutral-buoyancy pool (중성부력 수조, 7 × 4): the tank's walls standing waist-high, tiled blue inside, the water over it; a
 * module mock-up on the bottom, an astronaut in a white training suit working along its handrail with two safety divers beside
 * them, bubbles going up; the gantry crane over the pool with its lift platform lowered to the water, the ladder, the rail round
 * the rim, the viewing windows in the near wall, the depth sign and the safety rules.
 */
function nbPool(g: THREE.Group, W: number, D: number, out: Built) {
  const rimH = 0.6;
  const t = 0.18;
  const iw = W - 2 * t - 0.08;
  const id = D - 2 * t - 0.08;
  // The walls round it: concrete outside, the coping on top, blue tile inside.
  for (const sz of [-1, 1]) {
    part(g, box(W - 0.08, rimH, t), '#b0bec5', 0, rimH / 2, sz * (D / 2 - 0.04 - t / 2));
    part(g, box(W - 0.04, 0.05, t + 0.06), '#eceff1', 0, rimH + 0.025, sz * (D / 2 - 0.04 - t / 2));
  }
  for (const sx of [-1, 1]) {
    part(g, box(t, rimH, D - 0.08), '#b0bec5', sx * (W / 2 - 0.04 - t / 2), rimH / 2, 0);
    part(g, box(t + 0.06, 0.05, D - 0.04), '#eceff1', sx * (W / 2 - 0.04 - t / 2), rimH + 0.025, 0);
  }
  part(g, box(iw, 0.02, id), '#0d47a1', 0, 0.01, 0, NO);
  for (let x = -iw / 2 + 0.5; x < iw / 2; x += 0.5) part(g, box(0.02, 0.004, id), '#1976d2', x, 0.022, 0, { outline: false, shadow: false });
  for (const sz of [-1, 1]) part(g, box(iw, rimH - 0.04, 0.01), '#4fc3f7', 0, rimH / 2, sz * (id / 2 + 0.005), NO);
  for (const sx of [-1, 1]) part(g, box(0.01, rimH - 0.04, id), '#4fc3f7', sx * (iw / 2 + 0.005), rimH / 2, 0, NO);
  // On the bottom: the module mock-up on its stands, a handrail along it.
  const my = 0.3;
  own(g, new THREE.CylinderGeometry(0.26, 0.26, 3.2, 28).rotateZ(Math.PI / 2), twoSided('#eceff1'), -0.4, my, -0.2);
  own(g, new THREE.TorusGeometry(0.2, 0.03, 6, 24).rotateY(Math.PI / 2), twoSided('#90a4ae'), -2.02, my, -0.2);
  for (const x of [-1.6, 0.8]) part(g, box(0.12, my - 0.1, 0.4), '#78909c', x, (my - 0.1) / 2 + 0.02, -0.2, NO);
  rod(g, v3(-1.8, my + 0.3, -0.05), v3(1.0, my + 0.3, -0.05), 0.012, HAZ);
  // The astronaut along the handrail, the safety divers either side, the bubbles going up.
  const astro = swimmer(g, 0.1, my + 0.42, 0.25, -0.1, true);
  const d1 = swimmer(g, -1.2, my + 0.35, 0.55, 0.4, false);
  const d2 = swimmer(g, 1.5, my + 0.3, -0.1, Math.PI - 0.3, false);
  const bubbles: THREE.Mesh[] = [];
  for (let i = 0; i < 12; i++) bubbles.push(part(g, ball(0.025 + (i % 3) * 0.01), '#e1f5fe', 0, 0, 0, NO));
  const vents = [v3(0.6, my + 0.45, 0.25), v3(-0.85, my + 0.4, 0.62), v3(1.1, my + 0.35, -0.2)];
  // The water over it all.
  own(g, new THREE.PlaneGeometry(iw, id).rotateX(-Math.PI / 2), WATER, 0, rimH - 0.08, 0).castShadow = false;
  // The viewing windows in the near wall.
  for (const x of [-1.6, 0, 1.6]) {
    part(g, rbox(0.9, 0.36, 0.03, 0.01), '#263238', x, 0.32, D / 2 - 0.03);
    part(g, box(0.82, 0.28, 0.005), '#0277bd', x, 0.32, D / 2 - 0.012, NO);
  }
  // The rail round the back and sides of the rim; the ladder at the near right.
  const ry = rimH + 1.0;
  const bz = -D / 2 + 0.1;
  for (let x = -W / 2 + 0.12; x <= W / 2 - 0.1; x += 0.85) rod(g, v3(x, rimH + 0.05, bz), v3(x, ry, bz), 0.016, HAZ);
  rod(g, v3(-W / 2 + 0.12, ry, bz), v3(W / 2 - 0.12, ry, bz), 0.02, HAZ);
  for (const sx of [-1, 1]) {
    rod(g, v3(sx * (W / 2 - 0.12), ry, bz), v3(sx * (W / 2 - 0.12), ry, D / 2 - 0.4), 0.02, HAZ);
    rod(g, v3(sx * (W / 2 - 0.12), rimH + 0.05, D / 2 - 0.4), v3(sx * (W / 2 - 0.12), ry, D / 2 - 0.4), 0.016, HAZ);
  }
  const lx = W / 2 - 0.55;
  for (const sx of [-1, 1]) rod(g, v3(lx + sx * 0.2, 0.05, D / 2 - 0.32), v3(lx + sx * 0.2, rimH + 0.6, D / 2 - 0.32), 0.016, STEEL);
  for (let y = 0.15; y < rimH + 0.5; y += 0.2) rod(g, v3(lx - 0.2, y, D / 2 - 0.32), v3(lx + 0.2, y, D / 2 - 0.32), 0.01, STEEL);
  // The gantry crane: a leg at each end on the rim, the beam over the pool, the trolley, the lift platform at the water.
  const gy = 2.6;
  const gz = 0.1;
  for (const sx of [-1, 1]) {
    const x = sx * (W / 2 - 0.12);
    rod(g, v3(x, rimH, gz - 0.5), v3(x, gy, gz), 0.05, ORANGE);
    rod(g, v3(x, rimH, gz + 0.5), v3(x, gy, gz), 0.05, ORANGE);
  }
  part(g, box(W - 0.2, 0.22, 0.2), ORANGE, 0, gy, gz);
  part(g, rbox(0.4, 0.2, 0.3, 0.02), GRAPHITE, -0.6, gy - 0.2, gz);
  for (const sz of [-1, 1]) rod(g, v3(-0.6, gy - 0.3, gz + sz * 0.1), v3(-0.6, rimH - 0.05, gz + sz * 0.4), 0.008, '#37474f');
  part(g, box(1.0, 0.04, 0.9), '#90a4ae', -0.6, rimH - 0.06, gz);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) rod(g, v3(-0.6 + sx * 0.48, rimH - 0.06, gz + sz * 0.42), v3(-0.6 + sx * 0.48, rimH + 0.3, gz + sz * 0.42), 0.01, HAZ);
  label(g, '중성부력 수조 · 수심 10 m', 1.4, 0.16, -W / 2 + 1.0, rimH + 0.75, bz + 0.02, NAVY, '#e3edf3');
  label(g, '잠수 안전 수칙 · 2인 1조', 0.9, 0.11, W / 2 - 1.2, rimH + 0.75, bz + 0.02, '#e3edf3', NAVY);
  // The water lives: the bubbles rise and wrap, the swimmers drift a little.
  out.animate = (time) => {
    bubbles.forEach((b, i) => {
      const v = vents[i % 3];
      const u = (((time * 0.35 + i / 12) % 1) + 1) % 1;
      b.position.set(v.x + 0.04 * Math.sin(time * 3 + i), v.y + u * (rimH - 0.1 - v.y), v.z + 0.03 * Math.cos(time * 2 + i));
      b.visible = u < 0.98;
    });
    astro.position.y = my + 0.42 + 0.02 * Math.sin(time * 0.7);
    d1.position.y = my + 0.35 + 0.025 * Math.sin(time * 0.9 + 1);
    d2.position.y = my + 0.3 + 0.025 * Math.sin(time * 0.8 + 2);
  };
}

/**
 * The human centrifuge at a centrifuge's size (유인 원심 가속기, 5 × 5): the round pit striped at its edge, the big hub on its
 * drive housing, the long arm with its counterweight out on the other side and the gondola lying across the end of it (the same
 * gondola as the small rig, furnitureSpace.ts), the beacon on its post and the operator's console in the corner. At rest the
 * gondola waits at the front; in use the arm winds up and swings it round with the dweller in it.
 */
function bigCentrifuge(g: THREE.Group, W: number, D: number, c: string, out: Built) {
  const rest = -Math.PI / 2;
  const Rp = Math.min(W, D) / 2 - 0.08;
  const Ra = Rp - 0.62;
  part(g, cyl(Rp, Rp, 0.03, 64), '#9ea7ad', 0, 0.015, 0, NO);
  hazardRing(g, Rp - 0.1, Rp, 0.032, 40);
  part(g, cyl(0.5, 0.62, 0.32, 32), '#37474f', 0, 0.16, 0);
  part(g, cyl(0.24, 0.3, 0.4, 24), '#455a64', 0, 0.42, 0);
  const arm = (parent: THREE.Object3D) => {
    const m = group(parent, 0, 0, 0, rest);
    part(m, cyl(0.28, 0.28, 0.16, 24), '#78909c', 0, 0.62, 0);
    part(m, rbox(Ra - 0.25, 0.16, 0.24, 0.03), c, (Ra - 0.25) / 2 + 0.15, 0.6, 0);
    for (const sz of [-1, 1]) part(m, box(Ra - 0.6, 0.03, 0.005), HAZ, (Ra - 0.25) / 2 + 0.15, 0.6, sz * 0.122, NO);
    part(m, rbox(0.9, 0.14, 0.22, 0.03), c, -0.55, 0.6, 0);
    part(m, rbox(0.36, 0.5, 0.5, 0.05), '#455a64', -1.0, 0.6, 0);
    const end = group(m, Ra - 0.68, 0.12, 0);
    return centrifugeArm(end, c);
  };
  const still = group(g);
  arm(still);
  out.idle = still;
  const live = group(g);
  out.inUse = live;
  const spinner = group(live);
  const seat = arm(spinner);
  const bx = -W / 2 + 0.15;
  const bz = -D / 2 + 0.15;
  part(g, cyl(0.025, 0.025, 1.8, 8), '#546e7a', bx, 0.9, bz, NO);
  part(g, ball(0.07), '#ffb74d', bx, 1.84, bz);
  const beacon = group(live, bx, 1.84, bz);
  ownLit(beacon, box(0.16, 0.025, 0.006), '#fff8e1', 0, 0, 0);
  // The operator's console in the front-right corner, turned out to the room.
  const desk = group(g, W / 2 - 0.3, 0, D / 2 - 0.3, Math.PI / 4);
  part(desk, rbox(0.5, 0.95, 0.3, 0.03), '#455a64', 0, 0.475, 0);
  part(desk, rbox(0.54, 0.05, 0.38, 0.02), '#37474f', 0, 0.98, 0.03, { rx: 0.3 });
  part(desk, rbox(0.34, 0.2, 0.02, 0.01), SCREEN_BG, 0, 1.12, -0.08, { rx: -0.2 });
  part(desk, cyl(0.04, 0.04, 0.03, 12), RED, 0.18, 1.02, 0.08);
  label(g, '유인 원심 가속기 · 최대 8G', 1.3, 0.14, 0, 0.034, D / 2 - 0.22, '#37474f', '#e3edf3').rotation.x = -Math.PI / 2;
  let last = -1;
  let t0 = 0;
  out.animate = (t) => {
    if (t < last || t - last > 0.5) t0 = t;
    last = t;
    const k = t - t0;
    const T = 6;
    const w = 1.8;
    spinner.rotation.y = k < T ? (w * k * k) / (2 * T) : w * (k - T / 2);
    beacon.rotation.y = t * 7;
  };
  out.spots = { '*': seat };
}

/**
 * The glass between mission control and its visitors' gallery (관람석 유리창, 11 × 1): a navy parapet, tall panes over it in
 * slim frames, a handrail on the visitors' side and the plaque that says what they're looking at.
 */
function galleryGlass(g: THREE.Group, W: number, D: number) {
  const z = -D / 2 + 0.2;
  part(g, rbox(W - 0.04, 0.9, 0.16, 0.02), NAVY, 0, 0.45, z);
  part(g, rbox(W, 0.04, 0.26, 0.01), '#cfd8dc', 0, 0.92, z + 0.02);
  const top = 2.45;
  own(g, new THREE.PlaneGeometry(W - 0.06, top - 0.94), PANE, 0, (top + 0.94) / 2, z).castShadow = false;
  for (let x = -W / 2 + 0.02; x <= W / 2; x += W / 8) part(g, box(0.04, top - 0.94, 0.06), '#37474f', x, (top + 0.94) / 2, z, NO);
  part(g, box(W, 0.06, 0.08), '#37474f', 0, top, z, NO);
  rod(g, v3(-W / 2 + 0.1, 0.95, z + 0.3), v3(W / 2 - 0.1, 0.95, z + 0.3), 0.022, '#b0bec5');
  for (let x = -W / 2 + 0.2; x < W / 2; x += 1.3) rod(g, v3(x, 0.5, z + 0.1), v3(x, 0.95, z + 0.3), 0.012, '#b0bec5');
  label(g, `${AGENCY} 비행 관제실 · 유리 너머로 보세요`, 2.2, 0.15, 0, 0.62, z + 0.085, NAVY, '#e3edf3');
}

/**
 * The launch-vehicle display (발사체 전시, 2 × 2): a three-stage launcher of the invented 별마루 line at a quarter of its size on a
 * stepped plinth before the centre, its fins and its fairing, the agency's name down its side and the plate in front.
 */
function launchDisplay(g: THREE.Group, W: number, D: number) {
  part(g, rbox(W - 0.1, 0.35, D - 0.1, 0.04), '#b0bec5', 0, 0.175, 0);
  part(g, rbox(W - 0.5, 0.2, D - 0.5, 0.03), '#cfd8dc', 0, 0.45, 0);
  const y0 = 0.55;
  const r = 0.26;
  part(g, cyl(r, r + 0.03, 2.4, 24), '#fafafa', 0, y0 + 1.2, 0);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const fin = group(g, Math.sin(a) * (r + 0.1), y0 + 0.35, Math.cos(a) * (r + 0.1), a);
    part(fin, box(0.03, 0.6, 0.24), GRAPHITE, 0, 0, 0);
  }
  for (const [y, k] of [[y0 + 0.05, GRAPHITE], [y0 + 2.4, '#90a4ae'], [y0 + 3.9, '#90a4ae']] as const) part(g, cyl(r + 0.02, r + 0.02, 0.06, 24), k, 0, y, 0, NO);
  part(g, cyl(r - 0.04, r, 1.5, 24), '#fafafa', 0, y0 + 3.15, 0);
  part(g, cyl(r - 0.04, r - 0.04, 0.6, 24), '#eceff1', 0, y0 + 4.2, 0);
  part(g, new THREE.ConeGeometry(r - 0.04, 0.7, 24), '#eceff1', 0, y0 + 4.85, 0).userData.ownGeometry = true;
  label(g, '하늘마루', 0.2, 0.9, 0, y0 + 1.6, r + 0.035, '#fafafa', NAVY);
  label(g, `${MISSION} 발사체 · 1/4 축소 모형`, 1.3, 0.13, 0, 0.2, D / 2 - 0.04, NAVY, '#e3edf3');
}

/**
 * The tracking antenna (추적 안테나, 3 × 3): a white dish on its yoke over a round pedestal, tipped up at the sky, the feed held at
 * its focus on four struts, a small equipment hut at its foot and a low fence round it.
 */
function dishAntenna(g: THREE.Group, W: number, D: number) {
  part(g, rbox(W - 0.1, 0.12, D - 0.1, 0.03), '#b0bec5', 0, 0.06, 0);
  part(g, cyl(0.42, 0.55, 1.6, 20), '#eceff1', 0, 0.92, 0);
  part(g, cyl(0.5, 0.5, 0.14, 20), '#cfd8dc', 0, 1.78, 0);
  for (const sx of [-1, 1]) part(g, box(0.12, 0.6, 0.3), '#eceff1', sx * 0.45, 2.1, 0);
  const dish = group(g, 0, 2.25, 0);
  dish.rotation.x = -0.75;
  own(dish, new THREE.SphereGeometry(1.6, 36, 8, 0, Math.PI * 2, 0, 0.62).rotateX(Math.PI), twoSided('#f5f5f5'), 0, 1.6, 0);
  part(dish, cyl(0.18, 0.18, 0.2, 14), '#b0bec5', 0, 0.08, 0);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    rod(dish, v3(Math.cos(a) * 0.95, 0.38, Math.sin(a) * 0.95), v3(0, 1.15, 0), 0.015, '#b0bec5');
  }
  part(dish, cyl(0.08, 0.1, 0.22, 12), GRAPHITE, 0, 1.2, 0);
  part(g, rbox(0.8, 0.8, 0.6, 0.03), '#cfd8dc', W / 2 - 0.55, 0.52, D / 2 - 0.45);
  part(g, box(0.3, 0.55, 0.01), GREY_D, W / 2 - 0.55, 0.4, D / 2 - 0.145, NO);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    rod(g, v3(Math.cos(a) * (W / 2 - 0.12), 0.12, Math.sin(a) * (D / 2 - 0.12)), v3(Math.cos(a) * (W / 2 - 0.12), 0.75, Math.sin(a) * (D / 2 - 0.12)), 0.012, GREY);
  }
  label(g, `${AGENCY} 추적 관제소`, 0.7, 0.1, W / 2 - 0.55, 0.85, D / 2 - 0.14, NAVY, '#e3edf3');
}
