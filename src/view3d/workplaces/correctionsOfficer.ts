import * as THREE from 'three';
import type { HeldTool } from '../handTool';
import { marker, rod, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, glass, glow, label, painted, picture, ring, text } from './doctor';
import { BC, CN, COURSES, DP, GT, LK, MD, PEN_UP, RP, TB, VB, VISIT_MINUTES, WS, YD, doorOf, gjNow, gjPhase, wrap } from './correctionsOfficerMotion';
import type { GjMotion, GjNow, GjTool } from './correctionsOfficerMotion';
import { vroidFigure, type FigureOptions } from './vroidFigure';

/**
 * The 교정시설 drawn as itself (2026-11-01), of a made-up 새솔: plain, clean, kept with care, and shown with restraint. The work on
 * show is looking after people: a control room with its wall of cameras and door lamps, a corridor gate and its keys, a rounds log,
 * a visiting booth with glass and telephones, a counselling table with tea and a letter being started, a baking class, a library
 * cart, a yard with a hoop, a nurse's counter and the visitors' lockers. No weapon, restraint or force anywhere; a quarrel on the
 * yard is talked out. No real place, person or company. Everything that moves follows correctionsOfficerMotion.ts.
 * The desks and the archive shelf are shared and stay.
 */

const NAME = '새솔';
const MINT = '#b9cabf';
const MINT_D = '#7f9a8c';
const NAVY = '#2c3e50';
const NAVY_D = '#1f2c3a';
const CREAM = '#efe9db';
const WOOD = '#b98f62';
const WOOD_D = '#86653f';
const GREY = '#8f979c';
const GREY_D = '#566066';
const GRAPHITE = '#2f363c';
const PAPER = '#fbfaf5';
const INK = '#1f2428';
const SKIN = '#ecc6a3';
const GREEN = '#4f8a5b';
const STEEL = '#c6ccce';
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
function standAt(g: THREE.Object3D, motion: GjMotion, x = 0, z = 0.6): Spot {
  const s = spot(g, 'stand', x, 0, z, Math.PI);
  s.motion = motion;
  return s;
}
function seatAt(g: THREE.Object3D, motion: GjMotion, seat: V, yaw = Math.PI): Spot {
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
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, tools: Partial<Record<GjTool, HeldTool>>, show: (now: string | null, N: GjNow | null, t: number) => void) {
  out.spots = spots;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const H = (sp?.at.userData.height as number | undefined) ?? 1.6;
    const N = sp ? gjNow(sp.motion as GjMotion, t, gjPhase(g.getWorldPosition(tmp)), H) : null;
    show(now, N, t);
    for (const s of Object.values(spots)) s.held = s === sp && N?.tool ? (tools[N.tool] ?? null) : null;
  };
}
const paintBubble = (s: string) => (c: Ctx2) => {
  c.clearRect(0, 0, 256, 96);
  c.fillStyle = '#ffffff';
  c.strokeStyle = '#4a4238';
  c.lineWidth = 5;
  c.beginPath();
  c.roundRect(6, 6, 244, 72, 26);
  c.fill();
  c.stroke();
  text(c, s, 128, 44, s.length > 9 ? 25 : 31, NAVY, 'center');
};
function bubble(parent: THREE.Object3D, s: string, w: number, x: number, y: number, z: number): THREE.Sprite {
  const mat = new THREE.SpriteMaterial({ map: painted(`gjBubble|${s}`, 256, 96, paintBubble(s)), transparent: true, depthWrite: false });
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
/** A plain four-legged wooden chair; `back` the way its back stands. */
function plainChair(g: THREE.Object3D, x: number, T: number, z: number, back: number, color = WOOD) {
  const c = group(g, x, 0, z);
  part(c, rbox(0.42, 0.04, 0.4, 0.015), color, 0, T - 0.02, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(c, cyl(0.016, 0.014, T - 0.04, 8), WOOD_D, sx * 0.18, (T - 0.04) / 2, sz * 0.17, { outline: false });
  part(c, rbox(0.4, 0.28, 0.03, 0.012), color, 0, T + 0.3, back * 0.19);
  for (const sx of [-1, 1]) part(c, box(0.025, 0.22, 0.025), WOOD_D, sx * 0.17, T + 0.09, back * 0.19, { outline: false });
}
function stool(g: THREE.Object3D, x: number, T: number, z: number, color = MINT_D) {
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
/** Lines of handwriting on a page, as far as `lines` has got. */
function paintPage(c: Ctx2, w: number, h: number, title: string, lines: number, bg = '#fbf5e0') {
  c.fillStyle = bg;
  c.fillRect(0, 0, w, h);
  text(c, title, 12, 16, 13, NAVY);
  for (let i = 0; i < 6; i++) {
    const y = 42 + i * ((h - 56) / 6);
    c.fillStyle = '#d7d0b8';
    c.fillRect(10, y, w - 20, 1);
    const f = clamp01(lines - i);
    if (f > 0.02) {
      c.strokeStyle = '#34405e';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(14, y - 6);
      for (let x = 0; x < (w - 40 - i * 6) * f; x += 6) c.lineTo(14 + x, y - 8 + 3 * Math.sin(x * 0.6 + i));
      c.stroke();
    }
  }
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
/** What the drawn figures wear until their bodies come: plain and everyday. */
const RESIDENT = '#9db2bd';
const RESIDENT_B = '#55687a';
const OFFICER = '#c7c9b8';
const OFFICER_B = '#2e3a2e';

// ---------------------------------------------------------------------------------------------
// Tools designed for the hand. Each has its origin at the grip and is named for the probe.

const DOWN_IN = v3(-0.12, -1, -0.28).normalize();
function penInto(root: THREE.Object3D, color: string) {
  const inner = group(root);
  inner.quaternion.setFromUnitVectors(v3(0, -1, 0), DOWN_IN);
  part(inner, cyl(0.006, 0.006, PEN_UP * 0.78 + 0.05, 10), color, 0, (0.05 - PEN_UP * 0.78) / 2, 0, { outline: false });
  part(inner, cyl(0.006, 0.002, PEN_UP * 0.22, 10), BLACK, 0, -PEN_UP * 0.89, 0, { outline: false });
}
function penTool(g: THREE.Object3D, name: string, color = NAVY): { root: THREE.Group; held: HeldTool } {
  const root = group(g);
  root.name = name;
  penInto(root, color);
  return { root, held: { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: DOWN_IN.clone(), shape: 'pen', radius: 0.012, writes: PEN_UP } } } };
}
const FLAT_LEFT = { at: v3(0, -0.02, 0.05), axis: v3(1, 0, 0), palm: v3(0, 1, 0), shape: 'flat' as const, radius: 0.01 };
/**
 * A clipboard on the left arm with its pen. Two ways of holding: `board` in the left hand alone, the pen clipped; `write` with the
 * right hand on the pen, wherever on the sheet it has got to (the grip follows it).
 */
function logBoard(g: THREE.Object3D, name: string, title: string) {
  const root = group(g);
  root.name = name;
  root.rotation.order = 'YXZ';
  part(root, box(0.23, 0.008, 0.31), WOOD_D, 0, 0, 0, { outline: false });
  part(root, box(0.08, 0.018, 0.03), CHROME, 0, 0.008, -0.14, { outline: false });
  const sheet = liveScreen(root, 0.21, 0.28, 150, 200, 0, 0.0052, 0.01, 0, FLAT);
  const pen = group(root);
  penInto(pen, NAVY);
  const gripAt = v3(0, 0, 0);
  const onlyLeft: HeldTool = { tool: root, lead: 'left', grips: { left: FLAT_LEFT } };
  const both: HeldTool = { tool: root, lead: 'left', grips: { left: FLAT_LEFT, right: { at: gripAt, axis: DOWN_IN.clone(), shape: 'pen', radius: 0.012 } } };
  return {
    root,
    tools: { board: onlyLeft, write: both } as Partial<Record<GjTool, HeldTool>>,
    show(N: GjNow | null, home: V | null, yawHome: number, lines: number, extra?: (c: Ctx2) => void, key = '') {
      const b = N?.props.board ?? null;
      at(root, b, home);
      root.rotation.set(0.46, b ? (N?.st.yaw ?? 0) - Math.PI : yawHome, 0);
      const n = N?.n ?? {};
      const px = clamp01(n.px ?? 1);
      const pz = clamp01(n.pz ?? 0.9);
      // The tip on the sheet; the grip stands back along the pen from it.
      const tipX = -0.075 + 0.15 * px;
      const tipZ = -0.1 + 0.22 * pz;
      gripAt.set(tipX, 0.006, tipZ).addScaledVector(DOWN_IN, -PEN_UP);
      pen.position.copy(gripAt);
      sheet.draw(`${Math.floor(lines * 3)}|${key}`, (c) => {
        paintPage(c, 150, 200, title, lines, PAPER);
        extra?.(c);
      });
    },
  };
}

/** One camera's picture on the consoles and the wall: people only as dots, never a face. */
const CAMS = ['복도 A', '운동 마당', '실습실', '도서실', '접견실 앞', '복도 B'];
function paintCam(c: Ctx2, w: number, h: number, cam: number, t: number, zoom = 0, apart = -1) {
  const i = wrap(cam, CAMS.length);
  c.save();
  c.fillStyle = '#10181c';
  c.fillRect(0, 0, w, h);
  const z = 1 + 0.6 * clamp01(zoom);
  c.translate(w / 2, h / 2);
  c.scale(z, z);
  c.translate(-w / 2, -h / 2);
  c.lineWidth = Math.max(1, w / 120);
  const dot = (x: number, y: number, r = 0.035, color = '#ffe0b0') => {
    c.fillStyle = color;
    c.beginPath();
    c.arc(x * w, y * h, pos(r * w), 0, 6.3);
    c.fill();
  };
  c.strokeStyle = '#7fa59a';
  if (i === 1) {
    // The yard from up on its lamp: court lines and a hoop.
    c.fillStyle = '#3c4f46';
    c.fillRect(0, 0, w, h);
    c.strokeRect(w * 0.14, h * 0.12, w * 0.72, h * 0.76);
    c.beginPath();
    c.arc(w * 0.5, h * 0.12, pos(h * 0.28), 0, Math.PI);
    c.stroke();
    if (apart >= 0) {
      const d = 0.05 + 0.2 * clamp01(apart);
      dot(0.5 - d, 0.5, 0.04, apart < 0.3 ? '#ffb48a' : '#ffe0b0');
      dot(0.5 + d, 0.5, 0.04, apart < 0.3 ? '#ffb48a' : '#ffe0b0');
    } else {
      dot(0.36 + 0.1 * Math.sin(t * 0.5), 0.5, 0.03);
      dot(0.6 - 0.08 * Math.sin(t * 0.4), 0.4 + 0.1 * Math.cos(t * 0.5), 0.03);
    }
  } else if (i === 2 || i === 3) {
    c.fillStyle = '#2d3a3f';
    c.fillRect(0, 0, w, h);
    c.fillStyle = i === 2 ? '#7c8a8a' : '#6d5c48';
    for (let k = 0; k < 3; k++) c.fillRect(w * 0.14, h * (0.2 + k * 0.26), w * 0.72, h * 0.1);
    dot(0.3 + 0.2 * Math.sin(t * 0.3 + i), 0.34, 0.03);
    dot(0.7, 0.6, 0.03);
  } else {
    // A corridor going away, its doors along the sides.
    c.fillStyle = '#2b3a3c';
    c.fillRect(0, 0, w, h);
    c.beginPath();
    for (const [a, b] of [[0, 0.42], [1, 0.58]]) {
      c.moveTo(a * w, 0);
      c.lineTo(b * w, h * 0.44);
      c.moveTo(a * w, h);
      c.lineTo(b * w, h * 0.56);
    }
    c.stroke();
    c.strokeRect(w * 0.42, h * 0.44, w * 0.16, h * 0.12);
    if (i === 4) dot(0.5, 0.66, 0.03);
  }
  c.restore();
  c.fillStyle = 'rgba(0,0,0,0.45)';
  c.fillRect(0, 0, w, h * 0.17);
  text(c, `${i + 1} ${CAMS[i]}`, 5, h * 0.085, Math.max(9, h * 0.11), '#d7efe4', 'left', false);
  c.fillStyle = '#ff5a4a';
  c.beginPath();
  c.arc(w - 8, h * 0.085, pos(h * 0.035), 0, 6.3);
  c.fill();
}

// =============================================================================================
// 보안 관제 콘솔 (cctvConsole, 2 × 1).

function console3d(g: THREE.Group, out: Built) {
  const T = CN.top;
  part(g, rbox(1.96, 0.04, 0.62, 0.012), '#55636b', 0, T - 0.02, 0);
  part(g, box(1.9, T - 0.1, 0.03), NAVY, 0, (T - 0.1) / 2 + 0.03, -0.28);
  for (const sx of [-1, 1]) part(g, box(0.34, T - 0.06, 0.52), NAVY_D, sx * 0.8, (T - 0.06) / 2, -0.02);
  for (let i = 0; i < 3; i++) for (const sx of [-1, 1]) part(g, box(0.2, 0.012, 0.01), GREY, sx * 0.8, 0.2 + i * 0.18, 0.246, { outline: false });
  chair(g, CN.seat);
  // Three screens, the big one in the middle.
  const main = monitor(g, [0, T + 0.34, -0.14], 0.66, 0.4, T, 400, 244);
  const left = monitor(g, [-0.67, T + 0.3, -0.11], 0.44, 0.28, T, 240, 150, 0.34);
  const right = monitor(g, [0.67, T + 0.3, -0.11], 0.44, 0.28, T, 240, 150, -0.34);
  keyboard(g, CN.keys);
  // The camera's stick on its base.
  part(g, rbox(0.15, 0.03, 0.15, 0.012), GRAPHITE, CN.stick[0], T + 0.015, CN.stick[2], { outline: false });
  part(g, cyl(0.008, 0.01, 0.08, 8), CHROME, CN.stick[0], T + 0.065, CN.stick[2], { outline: false });
  part(g, ball(0.02), '#c8382c', CN.stick[0], T + 0.11, CN.stick[2], { outline: false });
  // The duty log, open, a pen; an alarm lamp; the speaker's microphone on its cradle.
  part(g, box(0.28, 0.008, 0.2), '#2f5f54', CN.log[0], T + 0.004, CN.log[2], { outline: false });
  const log = liveScreen(g, 0.26, 0.18, 200, 138, CN.log[0], T + 0.0095, CN.log[2], 0, FLAT);
  const pen = penTool(g, 'gjConsolePen');
  part(g, rbox(0.1, 0.05, 0.08, 0.012), GRAPHITE, CN.micHome[0], T + 0.025, CN.micHome[2], { outline: false });
  const mic = group(g);
  mic.name = 'gjSpeakerMic';
  part(mic, cyl(0.016, 0.018, 0.1, 10), GRAPHITE, 0, 0, 0, { outline: false });
  part(mic, ball(0.03), GREY, 0, 0.07, 0, { outline: false });
  part(mic, box(0.018, 0.024, 0.006), '#c8382c', 0, 0.01, 0.018, { outline: false });
  const lampMat = glow('#3a2020');
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), lampMat);
  lamp.userData.ownGeometry = lamp.userData.ownMaterial = true;
  lamp.position.set(-0.86, T + 0.075, -0.2);
  g.add(lamp);
  part(g, cyl(0.04, 0.045, 0.04, 12), GRAPHITE, -0.86, T + 0.02, -0.2, { outline: false });
  const spots: Record<string, Spot> = {
    monitorCells: seatAt(g, 'gjWatch', CN.seat),
    respondDisturbance: seatAt(g, 'gjCalm', CN.seat),
    correctionsOfficer_shadowSenior: seatAt(g, 'gjShadow', CN.seat),
  };
  spots['*'] = spots.monitorCells;
  out.seat = marker(g, CN.seat[0], CN.seat[1], CN.seat[2]);
  out.work = marker(g, CN.keys[0], CN.keys[1], CN.keys[2]);
  const senior = lazy(() => person(g, OFFICER, OFFICER_B, '#2a2622', CN.senior[0], CN.senior[1], -2.6, 'male', undefined, 81));
  const say = bubble(g, '말로 풀어 봅시다', 0.72, 0, 1.75, 0.1);
  const okay = bubble(g, '이상 없습니다', 0.6, 0, 1.75, 0.1);
  const good = bubble(g, '그렇지, 잘 보네', 0.66, CN.senior[0], 1.86, CN.senior[1]);
  const settled = bubble(g, '잘 정리됐어요', 0.6, 0, 1.75, 0.1);
  const to = new THREE.Vector3();
  const tools: Partial<Record<GjTool, HeldTool>> = {
    pen: pen.held,
    mic: { tool: mic, lead: 'left', grips: { left: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.018 } } },
  };
  drive(g, out, spots, tools, (_now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    at(pen.root, P.pen, CN.penHome);
    at(mic, P.mic, CN.micHome);
    const seed = Math.floor(t / 7);
    const cam = N ? Math.floor(n.cam ?? 0) : seed;
    const zoom = n.zoom ?? 0;
    const alert = n.alert ?? 0;
    const apart = n.yard ? n.apart ?? 0 : -1;
    const live = Math.floor(t * 2);
    main.draw(`${cam}|${q(zoom, 8)}|${q(apart, 8)}|${live}|${alert > 0.5 ? 1 : 0}`, (c) => {
      paintCam(c, 400, 244, cam, t, zoom, apart);
      if (alert > 0.5) {
        c.strokeStyle = '#ffb02e';
        c.lineWidth = 8;
        c.strokeRect(4, 4, 392, 236);
        text(c, '운동 마당 말다툼', 200, 222, 22, '#ffd27a', 'center');
      } else if ((n.settled ?? 0) > 0.5) text(c, '상황 정리됨', 200, 222, 22, '#a8e6a8', 'center');
    });
    left.draw(`${wrap(cam + 2, 6)}|${Math.floor(t / 2)}`, (c) => paintCam(c, 240, 150, cam + 2, t));
    right.draw(`${wrap(cam + 4, 6)}|${Math.floor(t / 2)}`, (c) => paintCam(c, 240, 150, cam + 4, t));
    log.draw(`${Math.floor((n.lines ?? 0) * 3)}`, (c) => paintPage(c, 200, 138, '근무 일지', n.lines ?? 0));
    lampMat.color.set(alert > 0.5 ? (Math.sin(t * 5) > 0 ? '#ff9a2e' : '#7a4a10') : '#3a2020');
    say.visible = (n.say ?? 0) > 0.5;
    okay.visible = (n.okay ?? 0) > 0.5;
    good.visible = (n.glad ?? 0) > 0.5;
    settled.visible = (n.settled ?? 0) > 0.5 && (n.lines ?? 0) < 0.1;
    if ((n.senior ?? 0) > 0.5) {
      const f = senior.get();
      f.root.visible = true;
      if ((n.point ?? 0) > 0.5) {
        to.set(0.5, 1.2 + 0.03 * Math.sin(t * 1.8), 0.28);
        f.armR(to);
      } else f.armR(null);
      f.armL(null);
      nodHead(f, (n.glad ?? 0) > 0.5 ? 0.14 + 0.08 * Math.sin(t * 2.6) : 0.06);
    } else senior.hide();
  });
}

// =============================================================================================
// 관제 벽 (gjCctvWall, 4 × 1): set dressing behind the consoles.

function cctvWall(g: THREE.Group, out: Built) {
  const W = 3.86;
  const H = 1.12;
  const cy = 1.86;
  part(g, box(W + 0.1, H + 0.1, 0.1), GRAPHITE, 0, cy, -0.42);
  part(g, box(W + 0.1, cy - H / 2 - 0.05, 0.3), NAVY, 0, (cy - H / 2 - 0.05) / 2, -0.32);
  for (let i = 0; i < 4; i++) part(g, box(0.76, 0.86, 0.012), NAVY_D, -1.44 + i * 0.96, 0.62, -0.165, { outline: false });
  const scr = liveScreen(g, W, H, 720, 210, 0, cy, -0.366);
  for (let i = 1; i < 6; i++) part(g, box(0.014, H, 0.008), BLACK, -W / 2 + (i * W) / 6, cy, -0.36, { outline: false });
  part(g, box(W, 0.014, 0.008), BLACK, 0, cy, -0.36, { outline: false });
  label(g, `${NAME} 중앙 관제실`, 0.8, 0.11, 0, 1.2, -0.16, NAVY, '#e8f0ec');
  out.away = (_o, t) => {
    scr.draw(`${Math.floor(t / 2.5)}`, (c) => {
      for (let r = 0; r < 2; r++)
        for (let k = 0; k < 6; k++) {
          c.save();
          c.translate(k * 120, r * 105);
          paintCam(c, 120, 105, k + r * 3, t);
          c.restore();
        }
    });
  };
}

// =============================================================================================
// 출입문 현황판 (gjDoorPanel, 2 × 1).

const DOOR_NAMES = ['1동 입구', '2동 입구', '실습동', '운동 마당', '접견동', '의무실'];
function paintDoors(c: Ctx2, trying: number, ok: number, base: number, blink: boolean) {
  c.fillStyle = '#23323a';
  c.fillRect(0, 0, 420, 320);
  text(c, '출입문 현황', 16, 22, 20, '#d7efe4');
  c.strokeStyle = '#7fa59a';
  c.lineWidth = 3;
  c.strokeRect(14, 44, 392, 262);
  DOOR_NAMES.forEach((s, i) => {
    const d = doorOf(i);
    // Over its button on the board.
    const x = 210 + (d[0] + 0.16) * 269;
    const y = 160 - (d[1] - 1.22) * 281 - 10;
    c.fillStyle = '#35484f';
    c.fillRect(x - 40, y - 40, 80, 62);
    text(c, s, x, y - 26, 13, '#cfe0d8', 'center', false);
    const done = i >= base && i < base + 3 && i - base < ok;
    const on = i === trying && blink;
    c.fillStyle = on ? '#ffb02e' : done || i < base || i >= base + 3 ? '#57d07a' : '#2d6b42';
    c.beginPath();
    c.arc(x, y + 2, pos(11), 0, 6.3);
    c.fill();
  });
}
function doorPanel(g: THREE.Group, out: Built) {
  // A steel-framed board on the wall, the plan and its lamps behind a sheet of perspex, the buttons on a ledge below each row.
  part(g, box(1.62, 1.2, 0.17), NAVY, -0.16, 1.22, DP.face - 0.095);
  const scr = liveScreen(g, 1.56, 1.14, 420, 320, -0.16, 1.22, DP.face - 0.008);
  // A button for each door, set in front of the picture.
  DP.doors.forEach((d, i) => {
    part(g, rbox(0.1, 0.05, 0.03, 0.008), GRAPHITE, d[0], d[1] - 0.1, DP.face + 0.012, { outline: false });
    part(g, cyl(0.016, 0.016, 0.012, 10), i < 3 ? '#e8e0c0' : '#c8d8e8', d[0], d[1] - 0.1, DP.face + 0.032, { rx: Math.PI / 2, outline: false });
  });
  // The telephone at its side.
  part(g, box(0.24, 0.34, 0.16), '#dfe3e0', DP.phone[0], 1.2, DP.face - 0.06);
  part(g, box(0.16, 0.05, 0.012), GRAPHITE, DP.phone[0], 1.05, DP.face + 0.03, { outline: false });
  const handset = group(g);
  handset.name = 'gjHandset';
  part(handset, rbox(0.04, 0.2, 0.04, 0.014), GRAPHITE, 0, 0, 0, { outline: false });
  part(handset, rbox(0.05, 0.05, 0.05, 0.016), GRAPHITE, 0, 0.09, 0.01, { outline: false });
  part(handset, rbox(0.05, 0.05, 0.05, 0.016), GRAPHITE, 0, -0.09, 0.01, { outline: false });
  label(g, '내선 전화', 0.2, 0.05, DP.phone[0], 1.42, DP.face + 0.03, '#dfe3e0', INK);
  const tools: Partial<Record<GjTool, HeldTool>> = { handset: { tool: handset, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.02 } } } };
  const spots: Record<string, Spot> = { gjDoors: standAt(g, 'gjDoors', -0.1, DP.stand) };
  spots['*'] = spots.gjDoors;
  out.work = marker(g, 0, 1.2, DP.face);
  const okBub = bubble(g, '문 이상 없음', 0.56, 0.28, 1.84, 0.12);
  drive(g, out, spots, tools, (_now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    at(handset, P.handset, DP.phone);
    const trying = N ? Math.round(n.trying ?? -1) : -1;
    const blink = (n.blink ?? 0) > 0.5 && Math.sin(t * 9) > -0.2;
    const ok = Math.floor(n.ok ?? 0);
    const base = Math.floor(n.base ?? 6);
    scr.draw(`${trying}|${blink ? 1 : 0}|${ok}|${base}`, (c) => paintDoors(c, trying, ok, base, blink));
    okBub.visible = (n.done ?? 0) > 0.5;
  });
}

// =============================================================================================
// 복도 출입문 (gjGate, 2 × 1).

function gate(g: THREE.Group, out: Built) {
  // The corridor beyond, painted on the wall behind.
  const beyond = painted('gjCorridor', 300, 340, (c) => {
    c.fillStyle = '#d9dfd6';
    c.fillRect(0, 0, 300, 340);
    c.fillStyle = '#a9b8ae';
    c.beginPath();
    c.moveTo(0, 340);
    c.lineTo(120, 170);
    c.lineTo(180, 170);
    c.lineTo(300, 340);
    c.fill();
    c.fillStyle = '#f4f2e6';
    c.fillRect(120, 90, 60, 80);
    c.strokeStyle = '#7f9a8c';
    c.lineWidth = 3;
    for (const x of [0, 300]) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x === 0 ? 120 : 180, 90);
      c.moveTo(x, 340);
      c.lineTo(x === 0 ? 120 : 180, 170);
      c.stroke();
    }
    c.fillStyle = '#8fa698';
    for (let i = 0; i < 3; i++) {
      c.fillRect(30 + i * 28, 130 - i * 8, 16, 112 - i * 30);
      c.fillRect(254 - i * 28, 130 - i * 8, 16, 112 - i * 30);
    }
    c.fillStyle = '#ffe9a8';
    c.fillRect(138, 20, 24, 6);
    c.fillRect(120, 46, 60, 3);
    text(c, '실습동 →', 150, 74, 20, NAVY, 'center');
  });
  picture(g, beyond, 1.5, 2, 0, 1.06, -0.46);
  // The frame and top track.
  const steel = MINT_D;
  for (const sx of [-1, 1]) part(g, box(0.1, 2.2, 0.14), steel, sx * 0.86, 1.1, GT.plane);
  part(g, box(1.82, 0.12, 0.16), steel, 0, 2.18, GT.plane);
  part(g, box(1.8, 0.02, 0.05), GREY_D, 0, 0.012, GT.plane, { outline: false });
  // The leaf: a rail frame and rounded uprights, a little square window; the handle and lock on its right.
  // One half fixed, a little behind; the other slides across it.
  const leaf = group(g);
  const panel = (m: THREE.Object3D, x: number, z: number) => {
    part(m, box(0.8, 0.05, 0.03), MINT, x, 2.04, z);
    part(m, box(0.8, 0.05, 0.03), MINT, x, 0.08, z);
    part(m, box(0.8, 0.5, 0.025), MINT, x, 0.44, z);
    part(m, box(0.8, 0.04, 0.03), MINT, x, 1.0, z);
    for (let i = 0; i < 8; i++) part(m, cyl(0.011, 0.011, 1.03, 8), MINT, x - 0.35 + i * 0.1, 1.52, z, { outline: false });
  };
  panel(g, -0.41, GT.plane - 0.06);
  panel(leaf, 0.41, GT.plane);
  part(leaf, box(0.09, 0.26, 0.05), steel, GT.lock[0], GT.lock[1], GT.plane + 0.02);
  const keyhole = part(leaf, cyl(0.017, 0.017, 0.01, 12), CHROME, GT.lock[0], GT.lock[1], GT.plane + 0.05, { rx: Math.PI / 2, outline: false });
  keyhole.castShadow = false;
  part(leaf, box(0.03, 0.2, 0.03), GREY_D, GT.handle[0], GT.handle[1], GT.handle[2], { outline: false });
  label(leaf, '3', 0.1, 0.1, 0.41, 0.5, GT.plane + 0.017, MINT, NAVY);
  label(g, '출입 시 잠금 확인', 0.46, 0.08, 0, 2.18, GT.plane + 0.084, steel, '#ffffff');
  // The key box at the left and its door; the key on a hook.
  part(g, box(0.24, 0.34, 0.08), '#ded9c8', GT.keyHome[0], GT.keyHome[1], -0.42);
  part(g, box(0.2, 0.3, 0.012), '#b7a98a', GT.keyHome[0], GT.keyHome[1], -0.375, { outline: false });
  const boxDoor = group(g, GT.keyHome[0] - 0.12, GT.keyHome[1], -0.372);
  part(boxDoor, box(0.24, 0.34, 0.012), '#c4bda6', 0.12, 0, 0);
  label(boxDoor, '열쇠', 0.14, 0.05, 0.12, 0.1, 0.008, '#c4bda6', INK);
  // The key ring: the key along -z from the fingers, the ring and the others hanging from it.
  const key = group(g);
  key.name = 'gjKeyRing';
  const shaft = group(key);
  part(shaft, cyl(0.004, 0.004, 0.06, 8), STEEL, 0, 0, -0.045, { rx: Math.PI / 2, outline: false });
  part(shaft, box(0.008, 0.012, 0.018), STEEL, 0, -0.008, -0.065, { outline: false });
  part(shaft, cyl(0.015, 0.015, 0.004, 14), STEEL, 0, 0, 0, { rx: 0, outline: false });
  const hanging = group(key, 0, -0.016, 0.012);
  const rg = part(hanging, ring(0.018, 0.002), '#d8c28a', 0, -0.018, 0, { outline: false });
  rg.rotation.y = Math.PI / 2;
  for (const dx of [-0.008, 0.008]) part(hanging, box(0.006, 0.05, 0.002), STEEL, dx, -0.054, 0, { outline: false, rz: dx * 12 });
  part(hanging, rbox(0.02, 0.04, 0.003, 0.002), '#c8382c', 0, -0.06, 0.006, { outline: false });
  const tools: Partial<Record<GjTool, HeldTool>> = { key: { tool: key, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 0, -1), shape: 'pinch', radius: 0.005 } } } };
  const spots: Record<string, Spot> = { gjGateRound: standAt(g, 'gjGateRound', 0.02, GT.stand) };
  spots['*'] = spots.gjGateRound;
  out.work = marker(g, GT.lock[0], GT.lock[1], GT.lock[2]);
  drive(g, out, spots, tools, (_now, N) => {
    const n = N?.n ?? {};
    leaf.position.x = -GT.slide * clamp01(n.open);
    boxDoor.rotation.y = -1.6 * clamp01(n.boxOpen);
    at(key, N?.props.key ?? null, GT.keyHome);
    shaft.rotation.z = 1.3 * clamp01(n.turn);
  });
}

// =============================================================================================
// 순찰 확인 지점 (gjRoundPost, 1 × 1).

function roundPost(g: THREE.Group, out: Built) {
  part(g, box(0.86, 1.28, 0.18), CREAM, 0, 1.26, RP.face - 0.09);
  part(g, box(0.9, 0.05, 0.05), WOOD_D, 0, 1.92, RP.face - 0.01);
  label(g, '순찰 확인', 0.5, 0.09, 0.14, 1.78, RP.face + 0.003, NAVY, '#ffffff');
  // A wall clock whose hands are the room's real ones, near enough.
  part(g, cyl(0.12, 0.12, 0.03, 24), '#f7f5ee', RP.clock[0], RP.clock[1], RP.face + 0.015, { rx: Math.PI / 2 });
  const hand1 = group(g, RP.clock[0], RP.clock[1], RP.face + 0.034);
  part(hand1, box(0.012, 0.09, 0.004), INK, 0, 0.04, 0, { outline: false });
  const hand2 = group(g, RP.clock[0], RP.clock[1], RP.face + 0.036);
  part(hand2, box(0.008, 0.06, 0.004), '#c8382c', 0, 0.026, 0, { outline: false });
  // The reader.
  part(g, rbox(0.12, 0.16, 0.03, 0.01), GRAPHITE, RP.reader[0], RP.reader[1], RP.face + 0.015, { outline: false });
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), glow('#2d5a3a'));
  light.userData.ownGeometry = light.userData.ownMaterial = true;
  light.position.set(RP.reader[0], RP.reader[1] + 0.05, RP.face + 0.034);
  g.add(light);
  // The shelf, the log and its chained pen.
  part(g, box(0.64, 0.03, 0.34), WOOD, 0, RP.book[1] - 0.03, RP.book[2] - 0.02);
  for (const sx of [-1, 1]) part(g, box(0.03, 0.14, 0.24), WOOD_D, sx * 0.28, RP.book[1] - 0.11, RP.face + 0.12, { outline: false });
  part(g, box(0.36, 0.012, 0.26), '#3b5b52', RP.book[0], RP.book[1] - 0.008, RP.book[2], { outline: false });
  const page = liveScreen(g, 0.33, 0.24, 240, 176, RP.book[0], RP.book[1] + 0.0005, RP.book[2], 0, FLAT);
  const pen = penTool(g, 'gjRoundPen');
  const card = group(g);
  card.name = 'gjDutyCard';
  part(card, box(0.054, 0.002, 0.085), '#e0ecf2', 0, 0, -0.03, { outline: false });
  part(card, box(0.03, 0.0015, 0.02), NAVY, 0, 0.0015, -0.05, { outline: false });
  const tools: Partial<Record<GjTool, HeldTool>> = {
    pen: pen.held,
    card: { tool: card, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 0, -1), palm: v3(0, -1, 0), shape: 'pinch', radius: 0.004 } } },
  };
  const spots: Record<string, Spot> = { gjRoundLog: standAt(g, 'gjRoundLog', 0, RP.stand) };
  spots['*'] = spots.gjRoundLog;
  out.work = marker(g, RP.book[0], RP.book[1], RP.book[2]);
  drive(g, out, spots, tools, (_now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    at(pen.root, P.pen, RP.penHome);
    at(card, N?.tool === 'card' ? P.card : null);
    hand1.rotation.z = -t * 0.02;
    hand2.rotation.z = -t * 0.8;
    (light.material as THREE.MeshBasicMaterial).color.set((n.beep ?? 0) > 0.5 ? '#6dff9a' : '#2d5a3a');
    const lines = n.lines ?? 0;
    const signed = n.signed ?? 0;
    page.draw(`${Math.floor(lines * 3)}|${q(signed, 3)}`, (c) => {
      paintPage(c, 240, 176, '순찰 기록부', 2 + lines, '#fbf5e0');
      if (signed > 0.1) {
        c.strokeStyle = '#2e3f7a';
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(170, 158);
        for (let x = 0; x < 50 * clamp01(signed); x += 4) c.lineTo(170 + x, 158 + 6 * Math.sin(x * 0.4));
        c.stroke();
      }
    });
  });
}

// =============================================================================================
// 접견실 칸막이 (visitBooth, 2 × 1).

function visitBooth(g: THREE.Group, out: Built) {
  const T = VB.top;
  // One counter through the glass, a wing between the two places and at each end, on both sides.
  part(g, rbox(1.98, 0.04, 0.6, 0.012), WOOD, 0, T - 0.02, 0);
  part(g, box(1.94, T - 0.04, 0.05), CREAM, 0, (T - 0.04) / 2, 0);
  for (const x of [-0.98, 0, 0.98]) {
    part(g, rbox(0.04, 1.7, 0.72, 0.012), MINT, x, 0.85, 0);
  }
  part(g, box(1.98, 0.08, 0.1), MINT_D, 0, T + 0.98, 0);
  glass(g, box(1.9, 0.92, 0.012), 0, T + 0.48, VB.glassZ);
  // A talk grille and a telephone on each side of each place.
  [-0.5, 0.5].forEach((x, i) => {
    for (const z of [-1, 1]) {
      part(g, box(0.1, 0.18, 0.03), GRAPHITE, x - 0.3, T + 0.2, z * 0.2, { outline: false });
      part(g, box(0.05, 0.14, 0.03), '#3a4348', x - 0.3, T + 0.2, z * 0.23, { outline: false });
    }
    label(g, `접견 ${i + 1}`, 0.2, 0.06, x, T + 0.98, 0.054, MINT_D, '#ffffff');
    label(g, `접견 ${i + 1}`, 0.2, 0.06, x, T + 0.98, -0.054, MINT_D, '#ffffff', Math.PI);
  });
  stool(g, -0.5, 0.47, 0.58);
  stool(g, 0.5, 0.47, 0.58);
  stool(g, -0.5, 0.47, -0.58);
  stool(g, 0.5, 0.47, -0.58);
  // The time left, on the frame over the place in use.
  part(g, box(0.34, 0.11, 0.03), BLACK, VB.sideX + 0.32, T + 1.1, 0);
  const left = liveScreen(g, 0.3, 0.09, 150, 44, VB.sideX + 0.32, T + 1.1, 0.017);
  // A small notice for the families, and a box of tissues.
  part(g, box(0.16, 0.09, 0.1), '#e7c9d4', 0.18, T + 0.045, 0.18);
  part(g, box(0.05, 0.03, 0.01), PAPER, 0.18, T + 0.11, 0.18, { outline: false });
  label(g, '편하게 이야기 나누세요', 0.36, 0.05, -0.62 + 0.6, T + 0.86, 0.012, '#fff4cf', '#6b4a10');
  // The door the other side comes in by, on the back wall.
  part(g, box(0.9, 2.04, 0.03), MINT_D, -0.5, 1.02, -1.46);
  part(g, box(0.82, 1.96, 0.012), MINT, -0.5, 1.02, -1.44, { outline: false });
  part(g, box(0.1, 0.02, 0.03), CHROME, -0.16, 1.02, -1.42, { outline: false });
  const log = logBoard(g, 'gjVisitLog', '접견 기록');
  const handF = group(g);
  const handB = group(g);
  for (const hs of [handF, handB]) part(hs, rbox(0.04, 0.18, 0.04, 0.014), GRAPHITE, 0, 0, 0, { outline: false });
  const spots: Record<string, Spot> = { superviseVisit: standAt(g, 'gjVisit', VB.stand[0], VB.stand[1]) };
  spots['*'] = spots.superviseVisit;
  out.work = marker(g, VB.sideX, T + 0.2, 0);
  let seed = -1;
  let visitor: ReturnType<typeof lazy> | null = null;
  let inside: ReturnType<typeof lazy> | null = null;
  const words = bubble(g, '건강하지? 또 올게', 0.72, VB.visitor[0] - 0.05, 1.5, VB.visitor[2]);
  const words2 = bubble(g, '네, 잘 지내요', 0.58, VB.inside[0], 1.5, VB.inside[2]);
  const time = bubble(g, '2분 남았어요', 0.56, VB.stand[0], 1.84, VB.stand[1]);
  const to = new THREE.Vector3();
  const looks: ReadonlyArray<readonly [string, string, string, 'female' | 'male', FigureOptions['stage']]> = [
    ['#a8836e', '#47525a', '#b9b9b4', 'female', 'elder'],
    ['#7f97ad', '#333c44', '#2a211a', 'female', undefined],
    ['#92a57c', '#3f4a52', '#3a2a1f', 'male', undefined],
  ];
  drive(g, out, spots, log.tools, (_now, N, t) => {
    if (seed < 0) {
      seed = seedOf(g);
      const L = looks[wrap(seed, looks.length)];
      visitor = lazy(() => person(g, L[0], L[1], L[2], VB.visitor[0], VB.visitor[2], Math.PI, L[3], VB.visitor[1], seed, L[4]));
      inside = lazy(() => person(g, RESIDENT, RESIDENT_B, '#2a2622', VB.inside[0], VB.inside[2], 0, 'male', VB.inside[1], seed + 9));
    }
    const n = N?.n ?? {};
    log.show(N, null, 0, n.lines ?? 0);
    const mins = n.left ?? 0;
    const amber = (n.amber ?? 0) > 0.5;
    const shown = Math.max(0, Math.ceil(N ? mins : VISIT_MINUTES));
    left.draw(`${N ? shown : -1}|${amber ? 1 : 0}`, (c) => {
      c.fillStyle = '#10181c';
      c.fillRect(0, 0, 150, 44);
      text(c, N ? `남은 ${shown}분` : '접견 대기', 75, 22, 22, amber ? '#ffb02e' : '#8fe6a8', 'center');
    });
    const here = (n.people ?? 0) > 0.5;
    const talk = (n.talk ?? 0) > 0.5;
    const on = (n.phones ?? 0) > 0.5;
    time.visible = amber;
    words.visible = talk && Math.sin(t * 0.7) > 0.2;
    words2.visible = talk && Math.sin(t * 0.7) < -0.2;
    handF.visible = handB.visible = here && on;
    if (!here || !visitor || !inside) {
      visitor?.hide();
      inside?.hide();
      return;
    }
    const a = visitor.get();
    const b = inside.get();
    a.root.visible = b.root.visible = (n.seated ?? 0) > 0.1;
    const palm = clamp01(n.palm);
    // Telephones at the ear; at the end one hand each up to the glass.
    to.set(VB.visitor[0] - 0.19, 1.14 + 0.01 * Math.sin(t * 1.3), VB.visitor[2] + 0.02);
    if (on) {
      a.armL(to);
      handF.position.copy(to);
      to.set(VB.inside[0] - 0.19, 1.14 + 0.01 * Math.cos(t * 1.1), VB.inside[2] - 0.02);
      b.armR(to);
      handB.position.copy(to);
    } else {
      a.armL(null);
      b.armR(null);
    }
    if (palm > 0.05) {
      to.set(VB.sideX + 0.04, T + 0.3, 0.05);
      a.armR(to);
      to.set(VB.sideX + 0.04, T + 0.3, -0.05);
      b.armL(to);
    } else {
      a.armR(null);
      b.armL(null);
    }
    nodHead(a, 0.05 + (talk ? 0.05 * Math.sin(t * 2) : 0));
    nodHead(b, 0.05 + (talk ? 0.05 * Math.cos(t * 1.8) : 0));
  });
}

// =============================================================================================
// 교화 상담 테이블 (counselTable, 2 × 1).

function paintPamphlet(c: Ctx2, sel: number, chosen: boolean) {
  c.fillStyle = '#fff6e6';
  c.fillRect(0, 0, 200, 240);
  c.fillStyle = GREEN;
  c.fillRect(0, 0, 200, 36);
  text(c, '직업훈련 과정 안내', 100, 19, 16, '#ffffff', 'center');
  COURSES.forEach((s, i) => {
    const y = 52 + i * 30;
    c.fillStyle = chosen && i === sel ? '#cfe9c8' : i === sel ? '#fff0b0' : '#ffffff';
    c.fillRect(12, y, 176, 24);
    text(c, s, 22, y + 12, 15, INK, 'left', false);
  });
  text(c, `${NAME} 사회복귀과`, 100, 228, 12, GREY_D, 'center', false);
}
function counselTable(g: THREE.Group, out: Built) {
  const T = TB.top;
  part(g, rbox(1.5, 0.04, 0.62, 0.02), WOOD, 0, T - 0.02, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.024, 0.02, T - 0.04, 10), WOOD_D, sx * 0.66, (T - 0.04) / 2, sz * 0.24, { outline: false });
  plainChair(g, TB.seat[0], TB.seat[1], TB.seat[2], 1);
  plainChair(g, TB.other[0], TB.other[1], TB.other[2], -1);
  // A warm lamp, tissues and a small plant: it's a table for talking.
  part(g, cyl(0.06, 0.07, 0.016, 14), WOOD_D, -0.6, T + 0.008, -0.14, { outline: false });
  part(g, cyl(0.008, 0.008, 0.26, 8), GREY_D, -0.6, T + 0.14, -0.14, { outline: false });
  part(g, cyl(0.07, 0.11, 0.12, 16), '#f2dfb6', -0.6, T + 0.31, -0.14);
  part(g, rbox(0.18, 0.08, 0.11, 0.012), '#e7c9d4', 0.58, T + 0.04, -0.14);
  part(g, box(0.05, 0.03, 0.01), PAPER, 0.58, T + 0.095, -0.14, { outline: false });
  part(g, cyl(0.035, 0.03, 0.05, 12), '#c98d62', 0.62, T + 0.025, 0.12);
  part(g, ball(0.04), GREEN, 0.62, T + 0.07, 0.12);
  // Notes in front of the dweller.
  part(g, box(0.22, 0.006, 0.29), '#efe6c8', TB.note[0], T + 0.003, TB.note[2], { outline: false });
  const note = liveScreen(g, 0.2, 0.27, 150, 200, TB.note[0], T + 0.0068, TB.note[2], 0, FLAT);
  const pen = penTool(g, 'gjCounselPen', '#3d5a7a');
  const cup = group(g);
  cup.name = 'gjTeaCup';
  part(cup, cyl(0.036, 0.028, 0.09, 14), PAPER, 0, 0, 0, { outline: false });
  part(cup, cyl(0.032, 0.032, 0.004, 14), '#a97646', 0, 0.044, 0, { outline: false });
  const myCup = part(g, cyl(0.036, 0.028, 0.09, 14), PAPER, 0.42, T + 0.045, 0.2, { outline: false });
  myCup.castShadow = false;
  // The course leaflet, the letter pad across the table, an envelope, a laptop for the record.
  const pam = group(g);
  part(pam, box(0.17, 0.003, 0.22), '#fff6e6', 0, 0, 0, { outline: false });
  const pamFace = liveScreen(pam, 0.165, 0.215, 200, 240, 0, 0.0022, 0, 0, FLAT);
  const pad = group(g, TB.pad[0], T + 0.004, TB.pad[2]);
  part(pad, box(0.19, 0.006, 0.26), PAPER, 0, 0, 0, { outline: false });
  // Written from the far side: turned for the one writing.
  const padFace = liveScreen(pad, 0.18, 0.25, 150, 200, 0, 0.0035, 0, Math.PI, FLAT);
  const env = part(g, box(0.17, 0.004, 0.1), '#f2e7cc', TB.pad[0], T + 0.012, TB.pad[2] - 0.02, { outline: false });
  const laptop = group(g, TB.laptop[0], T, TB.laptop[2]);
  part(laptop, rbox(0.3, 0.014, 0.2, 0.006), GREY, 0, 0.007, 0.06, { outline: false });
  const lid = group(laptop, 0, 0.014, -0.04);
  part(lid, box(0.3, 0.19, 0.008), GREY_D, 0, 0.095, 0, { outline: false });
  const lapScr = liveScreen(lid, 0.27, 0.165, 200, 122, 0, 0.095, 0.0052);
  const spots: Record<string, Spot> = {
    counselInmate: seatAt(g, 'gjCounsel', TB.seat),
    correctionsOfficer_jobTrainingPlan: seatAt(g, 'gjPlan', TB.seat),
    correctionsOfficer_caseRecord: seatAt(g, 'gjRecord', TB.seat),
    gjLetter: seatAt(g, 'gjLetter', TB.seat),
  };
  spots['*'] = spots.counselInmate;
  out.seat = marker(g, TB.seat[0], TB.seat[1], TB.seat[2]);
  out.work = marker(g, TB.note[0], TB.note[1], TB.note[2]);
  let seed = -1;
  let other: ReturnType<typeof lazy> | null = null;
  const thanks = bubble(g, '말해 보니 낫네요', 0.72, TB.other[0], 1.42, TB.other[2]);
  const picked = bubble(g, '제빵 해 볼게요', 0.62, TB.other[0], 1.42, TB.other[2]);
  const homeWord = bubble(g, '어머니께 드릴게요', 0.72, TB.other[0], 1.42, TB.other[2]);
  const toHand = new THREE.Vector3();
  const tools: Partial<Record<GjTool, HeldTool>> = {
    pen: pen.held,
    cup: { tool: cup, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'cradle', radius: 0.034 } } },
  };
  drive(g, out, spots, tools, (now, N, t) => {
    if (seed < 0) {
      seed = seedOf(g);
      other = lazy(() => person(g, RESIDENT, RESIDENT_B, ['#2a2622', '#3a2a1f', '#8f8f8a'][wrap(seed, 3)], TB.other[0], TB.other[2], 0, wrap(seed, 4) === 3 ? 'female' : 'male', TB.other[1], seed + 3));
    }
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    at(pen.root, P.pen, TB.penHome);
    const inTalk = now === 'counselInmate';
    at(cup, inTalk ? P.cup : null);
    const planning = (n.plan ?? 0) > 0.5;
    at(pam, planning ? P.pamphlet : null);
    const sel = Math.floor(n.sel ?? 0);
    const chosen = (n.chosen ?? 0) > 0.5;
    if (planning) pamFace.draw(`${sel}|${chosen ? 1 : 0}`, (c) => paintPamphlet(c, sel, chosen));
    const lines = n.lines ?? 0;
    const noteTitle = (n.record ?? 0) > 0.5 ? '처우 기록' : planning ? '훈련 계획' : '상담 메모';
    note.draw(`${Math.floor(lines * 3)}|${noteTitle}`, (c) => paintPage(c, 150, 200, noteTitle, lines));
    const lettering = (n.letter ?? 0) > 0.5;
    pad.visible = lettering && clamp01(n.env) < 0.9;
    env.visible = lettering && (n.env ?? 0) > 0.6;
    if (lettering) padFace.draw(`${q(n.written, 6)}`, (c) => paintPage(c, 150, 200, '어머니께', 1 + 4 * clamp01(n.written), '#fffdf4'));
    const showLap = (n.record ?? 0) > 0.5;
    laptop.visible = showLap;
    if (showLap) {
      lid.rotation.x = -0.3 - (1 - clamp01(n.lid)) * 1.24;
      lapScr.draw(`${q(n.fill, 6)}`, (c) => {
        c.fillStyle = '#eef3f4';
        c.fillRect(0, 0, 200, 122);
        c.fillStyle = NAVY;
        c.fillRect(0, 0, 200, 20);
        text(c, '처우 기록', 8, 11, 12, '#ffffff');
        ['생활 태도', '상담 내용', '다음 계획'].forEach((s, i) => {
          const y = 38 + i * 28;
          text(c, s, 8, y, 11, GREY_D, 'left', false);
          c.fillStyle = '#ffffff';
          c.fillRect(70, y - 9, 120, 18);
          const f = clamp01((n.fill ?? 0) - i);
          if (f > 0.02) {
            c.fillStyle = '#bcd9ce';
            c.fillRect(72, y - 6, 116 * f, 12);
          }
        });
      });
    }
    const glad = (n.glad ?? 0) > 0.5;
    thanks.visible = glad && inTalk;
    picked.visible = glad && planning;
    homeWord.visible = glad && lettering;
    if ((n.other ?? 0) > 0.5 && other) {
      const f = other.get();
      f.root.visible = true;
      if ((n.writes ?? 0) > 0.5) {
        toHand.set(TB.pad[0] + 0.06 * Math.sin(t * 3.4), T + 0.05, TB.pad[2] - 0.06 + 0.1 * clamp01(n.written));
        f.armR(toHand);
      } else if ((n.reach ?? 0) > 0.5) {
        toHand.set(TB.pamThere[0], T + 0.05, TB.pamThere[2]);
        f.armR(toHand);
      } else if ((n.speaks ?? 0) > 0.5) {
        toHand.set(TB.other[0] - 0.14, T + 0.08 + 0.05 * Math.sin(t * 2.8), TB.other[2] + 0.34);
        f.armR(toHand);
      } else f.armR(null);
      if (inTalk && (n.cupTaken ?? 0) > 0.5) {
        toHand.set(TB.cupThere[0], TB.cupThere[1], TB.cupThere[2] - 0.02);
        f.armL(toHand);
      } else f.armL(null);
      nodHead(f, (n.writes ?? 0) > 0.5 ? 0.32 : (n.nods ?? 0) > 0.5 ? 0.14 + 0.08 * Math.sin(t * 2.4) : 0.08);
    } else other?.hide();
  });
}

// =============================================================================================
// 제빵 실습실 (gjWorkshop, 4 × 2).

const UTENSILS = ['밀대', '스크레이퍼', '거품기', '붓', '계량컵', '밀대'];
function workshop(g: THREE.Group, out: Built) {
  const T = WS.top;
  const Z = WS.benchZ;
  // The floor of the class, washable and pale, then the long bench.
  part(g, box(3.96, 0.012, 1.96), '#dfe5df', 0, 0.006, 0, { outline: false });
  part(g, rbox(2.5, 0.05, 0.86, 0.01), '#d9c29a', -0.1, T - 0.025, Z);
  part(g, box(2.44, 0.04, 0.8), STEEL, -0.1, 0.32, Z, { outline: false });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.06, T - 0.05, 0.06), STEEL, -0.1 + sx * 1.18, (T - 0.05) / 2, Z + sz * 0.36);
  // Bowls and flour bags under it.
  for (let i = 0; i < 3; i++) part(g, cyl(0.12, 0.09, 0.08, 14), CHROME, -0.8 + i * 0.32, 0.38, Z, { outline: false });
  part(g, rbox(0.3, 0.24, 0.2, 0.04), '#ece5d3', 0.5, 0.46, Z);
  label(g, '밀가루', 0.16, 0.05, 0.5, 0.48, Z + 0.102, '#ece5d3', INK);
  // A dough board for each trainee and the dweller's own, a scale and a little flour.
  const r = (x: number, z: number, w = 0.44, d = 0.34) => part(g, rbox(w, 0.016, d, 0.005), WOOD, x, T + 0.008, z, { outline: false });
  r(WS.trainees[0][0], -0.1);
  r(WS.trainees[1][0], -0.1);
  r(WS.own[0], WS.own[2], 0.36, 0.22);
  const doughs = [WS.trainees[0][0], WS.trainees[1][0]].flatMap((x) => [-0.12, 0, 0.12].map((dx) => part(g, ball(0.045), '#f0dfb8', x + dx, T + 0.05, -0.14 + Math.abs(dx) * 0.2)));
  const mine = part(g, ball(0.05), '#f0dfb8', WS.own[0], T + 0.05, WS.own[2]);
  part(g, rbox(0.2, 0.05, 0.16, 0.012), '#dfe3e6', 0.2, T + 0.025, -0.2);
  part(g, cyl(0.075, 0.075, 0.012, 16), CHROME, 0.2, T + 0.057, -0.2, { outline: false });
  // The oven at the left end: its door comes down on a hinge at the foot.
  const ox = WS.ovenX;
  const oz = WS.ovenFace;
  part(g, rbox(0.8, 1.36, 0.6, 0.02), STEEL, ox, 0.68, oz - 0.3);
  part(g, box(0.62, 0.42, 0.012), '#2a2420', ox, 0.84, oz + 0.004, { outline: false });
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.38), glow('#6a3a1a'));
  inner.userData.ownGeometry = inner.userData.ownMaterial = true;
  inner.position.set(ox, 0.84, oz + 0.012);
  g.add(inner);
  const door = group(g, ox, 0.62, oz + 0.02);
  part(door, box(0.68, 0.48, 0.03), '#d8dcde', 0, 0.24, 0);
  glass(door, box(0.46, 0.26, 0.006), 0, 0.26, 0.018);
  part(door, cyl(0.012, 0.012, 0.5, 8), CHROME, 0, 0.45, 0.04, { rz: Math.PI / 2, outline: false });
  part(g, box(0.62, 0.14, 0.012), GRAPHITE, ox, 1.24, oz + 0.004, { outline: false });
  const heat = liveScreen(g, 0.16, 0.08, 96, 48, ox + 0.18, 1.24, oz + 0.012);
  part(g, cyl(0.03, 0.03, 0.02, 12), GREY, ox - 0.16, 1.24, oz + 0.014, { rx: Math.PI / 2, outline: false });
  // The proving rack at the right end, low, its trays filling.
  part(g, box(0.5, 0.03, 0.42), STEEL, 1.68, 1.24, -0.45);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.03, 1.24, 0.03), STEEL, 1.68 + sx * 0.22, 0.62, -0.45 + sz * 0.18, { outline: false });
  for (let k = 0; k < 4; k++) {
    part(g, box(0.44, 0.012, 0.38), GREY, 1.68, 0.24 + k * 0.26, -0.45, { outline: false });
    for (let i = 0; i < 3; i++) part(g, ball(0.04), '#ecd5a5', 1.56 + i * 0.12, 0.28 + k * 0.26, -0.45, { outline: false });
  }
  // The utensil board: a shape painted for each; what's out leaves its shape showing.
  const tb = WS.toolBoard;
  part(g, box(0.72, 0.5, 0.03), CREAM, tb[0] + 0.05, tb[1] - 0.02, tb[2] - 0.06);
  for (const sx of [-1, 1]) part(g, box(0.03, tb[1] - T - 0.25, 0.03), GREY_D, tb[0] + 0.05 + sx * 0.32, T + (tb[1] - T - 0.25) / 2, tb[2] - 0.06, { outline: false });
  const board = painted('gjToolShapes', 280, 190, (c) => {
    c.fillStyle = CREAM;
    c.fillRect(0, 0, 280, 190);
    text(c, '실습 도구 점검', 140, 20, 18, NAVY, 'center');
    c.fillStyle = '#c4bda6';
    for (let i = 0; i < WS.slots; i++) c.fillRect(22 + i * 42, 44, 22, 120);
  });
  picture(g, board, 0.7, 0.48, tb[0] + 0.05, tb[1] - 0.02, tb[2] - 0.044);
  const utensils = UTENSILS.map((_s, i) => {
    const x = tb[0] + 0.05 - 0.35 + (22 + i * 42 + 11) * (0.7 / 280);
    const m = group(g, x, tb[1] - 0.04, tb[2] - 0.036);
    const shape = i % 3;
    if (shape === 0) part(m, cyl(0.014, 0.014, 0.24, 10), WOOD, 0, 0, 0, { outline: false });
    else if (shape === 1) part(m, box(0.05, 0.1, 0.004), CHROME, 0, 0, 0, { outline: false });
    else {
      part(m, cyl(0.006, 0.006, 0.12, 6), CHROME, 0, -0.05, 0, { outline: false });
      part(m, ball(0.03), CHROME, 0, 0.05, 0, { outline: false });
    }
    return m;
  });
  // The class's sign and what they make, on a stand at the back.
  part(g, box(1.04, 0.56, 0.03), WOOD_D, 0.15, 1.17, -0.96);
  const sign = painted('gjClassSign', 300, 160, (c) => {
    c.fillStyle = '#fff6e6';
    c.fillRect(0, 0, 300, 160);
    c.fillStyle = GREEN;
    c.fillRect(0, 0, 300, 44);
    text(c, '제과·제빵 직업훈련반', 150, 22, 22, '#ffffff', 'center');
    text(c, '오늘: 단팥빵 성형', 150, 74, 20, INK, 'center');
    text(c, '기술은 다시 시작하는 힘', 150, 112, 17, GREEN, 'center', false);
    text(c, '수료 15명 · 자격 취득 9명', 150, 142, 14, GREY_D, 'center', false);
  });
  picture(g, sign, 1, 0.52, 0.15, 1.17, -0.942);
  for (const sx of [-1, 1]) part(g, box(0.04, 0.9, 0.04), WOOD_D, 0.15 + sx * 0.46, 0.45, -0.96, { outline: false });
  // A tray of buns, held in both hands on a cloth.
  const tray = group(g);
  tray.name = 'gjBunTray';
  part(tray, box(0.44, 0.016, 0.3), GREY_D, 0, 0, 0, { outline: false });
  const buns: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) for (let k = 0; k < 2; k++) buns.push(part(tray, ball(0.046), '#f0dfb8', -0.13 + i * 0.13, 0.032, -0.06 + k * 0.12, { outline: false }));
  const log = logBoard(g, 'gjToolLog', '실습 도구 점검');
  const tools: Partial<Record<GjTool, HeldTool>> = {
    tray: {
      tool: tray,
      lead: 'right',
      grips: {
        right: { at: v3(0.225, -0.01, 0.02), axis: v3(0, 0, -1), palm: v3(0, 1, 0), shape: 'flat', radius: 0.01 },
        left: { at: v3(-0.225, -0.01, 0.02), axis: v3(0, 0, -1), palm: v3(0, 1, 0), shape: 'flat', radius: 0.01 },
      },
    },
    ...log.tools,
  };
  const spots: Record<string, Spot> = { gjBake: standAt(g, 'gjBake', WS.dough[0], WS.stand), gjToolCheck: standAt(g, 'gjToolCheck', tb[0], WS.stand) };
  spots['*'] = spots.gjBake;
  out.work = marker(g, WS.own[0], WS.own[1], WS.own[2]);
  const A = lazy(() => person(g, RESIDENT, RESIDENT_B, '#2a2622', WS.trainees[0][0], WS.trainees[0][1], 0, 'male', undefined, 41));
  const B = lazy(() => person(g, RESIDENT, RESIDENT_B, '#3a2a1f', WS.trainees[1][0], WS.trainees[1][1], 0, 'male', undefined, 43));
  const glad = bubble(g, '와, 잘 구워졌어요', 0.72, WS.trainees[0][0], 1.84, WS.trainees[0][1]);
  const back = bubble(g, '제자리에 뒀습니다', 0.72, WS.trainees[1][0], 1.84, WS.trainees[1][1]);
  const to = new THREE.Vector3();
  drive(g, out, spots, tools, (now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const baking = now === 'gjBake';
    at(tray, baking ? P.tray : null);
    const oven = clamp01(n.door);
    door.rotation.x = 1.05 * oven;
    (inner.material as THREE.MeshBasicMaterial).color.set(oven > 0.1 ? '#ff9a4a' : '#6a3a1a');
    const baked = (n.baked ?? 0) > 0.5;
    for (const b of buns) (b.material as THREE.MeshToonMaterial).color.set(baked ? '#c98a45' : '#f0dfb8');
    const ball01 = clamp01(n.ball);
    mine.scale.setScalar(baking ? 0.85 + 0.35 * ball01 : 1);
    mine.scale.y = baking ? (n.shaping ?? 0) > 0.5 ? 0.7 + 0.15 * Math.sin(t * 5) : 1 : 1;
    doughs.forEach((d, i) => (d.visible = !N || i % 3 !== wrap(Math.floor(t / 4), 3) || (n.people ?? 0) < 0.5));
    heat.draw(baked && N ? '1' : oven > 0.1 ? '2' : '0', (c) => {
      c.fillStyle = '#10181c';
      c.fillRect(0, 0, 96, 48);
      text(c, '180℃', 48, 24, 22, '#ff9a4a', 'center');
    });
    const slot = Math.floor(n.slot ?? -1);
    const missing = now === 'gjToolCheck' && (n.returned ?? 0) < 0.5 && slot >= 0 ? WS.slots - 1 : -1;
    utensils.forEach((u, i) => (u.visible = i !== missing));
    log.show(now === 'gjToolCheck' ? N : null, null, 0, n.lines ?? 0, undefined, `${slot}`);
    glad.visible = baking && (n.glad ?? 0) > 0.5;
    back.visible = now === 'gjToolCheck' && (n.returned ?? 0) > 0.5 && (n.lines ?? 0) < WS.slots - 1 + 0.5;
    if ((n.people ?? 0) > 0.5) {
      const a = A.get();
      const b = B.get();
      a.root.visible = b.root.visible = true;
      const stir = Math.sin(t * 4);
      to.set(WS.trainees[0][0] + 0.06 + 0.03 * stir, T + 0.1, -0.2);
      a.armR(to);
      to.set(WS.trainees[0][0] - 0.1 - 0.02 * stir, T + 0.1, -0.2);
      a.armL(to);
      if ((n.giving ?? 0) > 0.5) {
        const e = clamp01(n.returned);
        to.set(tb[0] - 0.05 * e, tb[1] - 0.1 + 0.05 * e, tb[2] - 0.2 + 0.06 * e);
        b.armL(to);
        b.armR(null);
      } else {
        to.set(WS.trainees[1][0] + 0.08 + 0.03 * Math.sin(t * 3.6), T + 0.1, -0.2);
        b.armR(to);
        to.set(WS.trainees[1][0] - 0.08, T + 0.1, -0.22);
        b.armL(to);
      }
      nodHead(a, (n.nodA ?? 0) > 0.5 ? 0.3 + 0.06 * Math.sin(t * 2.2) : 0.28);
      nodHead(b, (n.giving ?? 0) > 0.5 ? 0.1 : 0.28);
    } else {
      A.hide();
      B.hide();
    }
  });
}

// =============================================================================================
// 도서 카트 (gjBookCart, 1 × 1).

const SPINES = ['#3b5b7a', '#7a4a2a', '#2f6d5a', '#8a6d3b', '#6a4a7a', '#a1503f', '#4a7a8a', '#b58a4a'];
function bookCart(g: THREE.Group, out: Built) {
  const cart = group(g);
  // Two sloping shelves on a low frame, a push rail at each end, four wheels.
  part(cart, box(0.8, 0.03, 0.42), WOOD, 0, 0.26, 0);
  part(cart, box(0.8, 0.03, 0.42), WOOD, 0, 0.72, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(cart, cyl(0.014, 0.014, 0.7, 8), GREY_D, sx * 0.38, 0.5, sz * 0.18, { outline: false });
  const wheels = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => part(cart, cyl(0.05, 0.05, 0.03, 12), BLACK, sx * 0.34, 0.05, sz * 0.18, { rx: Math.PI / 2, outline: false })));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(cart, cyl(0.012, 0.012, 0.18, 8), GREY_D, sx * 0.38, 0.16, sz * 0.18, { outline: false });
  for (const side of [-1, 1]) {
    for (const sz of [-1, 1]) rod(cart, v3(side * 0.38, 0.72, sz * 0.18), v3(side * BC.handleOff, BC.handleY, sz * 0.18), 0.012, GREY_D);
    part(cart, cyl(0.016, 0.016, 0.42, 10), '#3a4348', side * BC.handleOff, BC.handleY, 0, { rx: Math.PI / 2, outline: false });
  }
  for (const y of [0.28, 0.74]) {
    for (let k = 0; k < 14; k++) {
      const h = 0.15 + ((k * 37) % 5) * 0.012;
      const sz = k % 2 ? 1 : -1;
      if (y > 0.5 && k === 6) continue;
      part(cart, box(0.044, h, 0.15), SPINES[k % SPINES.length], -0.34 + (k >> 1) * 0.1 + (k % 2) * 0.03, y + h / 2, sz * 0.1, { outline: false, rx: -sz * 0.1 });
    }
  }
  label(cart, '이동 도서관', 0.34, 0.08, 0, 0.5, 0.212, '#fff6e6', NAVY);
  label(cart, '이동 도서관', 0.34, 0.08, 0, 0.5, -0.212, '#fff6e6', NAVY, Math.PI);
  // The book that's handed over: held by the spine, the boards away from the palm.
  const book = group(g);
  book.name = 'gjLibraryBook';
  part(book, box(0.03, 0.22, 0.15), '#2f6d5a', 0, -0.02, -0.05, { outline: false });
  part(book, box(0.024, 0.205, 0.14), PAPER, 0, -0.02, -0.052, { outline: false });
  const tools: Partial<Record<GjTool, HeldTool>> = { book: { tool: book, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'pinch', radius: 0.016 } } } };
  const spots: Record<string, Spot> = { gjBooks: standAt(g, 'gjBooks', -BC.stand, 0) };
  spots['*'] = spots.gjBooks;
  out.work = marker(g, 0, BC.handleY, 0);
  const reader = lazy(() => person(g, RESIDENT, RESIDENT_B, '#2a2622', BC.reader[0], BC.reader[1], Math.PI + 0.5, 'male', undefined, 47));
  const glad = bubble(g, '기다렸어요, 고맙습니다', 0.84, BC.reader[0], 1.84, BC.reader[1]);
  const to = new THREE.Vector3();
  drive(g, out, spots, tools, (_now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const cx = n.cx ?? 0;
    cart.position.x = cx;
    if ((n.rolling ?? 0) > 0.01) for (const w of wheels) w.rotation.y = cx * 18;
    at(book, P.book ?? null);
    glad.visible = (n.glad ?? 0) > 0.5;
    if ((n.reader ?? 0) > 0.5) {
      const f = reader.get();
      f.root.visible = true;
      if ((n.reach ?? 0) > 0.3) {
        to.set(BC.reader[0] - 0.1, 1.02 + 0.015 * Math.sin(t * 1.6), BC.reader[1] - 0.3);
        f.armR(to);
      } else f.armR(null);
      f.armL(null);
      nodHead(f, (n.glad ?? 0) > 0.5 ? 0.12 + 0.08 * Math.sin(t * 2.6) : 0.08);
    } else reader.hide();
  });
}

// =============================================================================================
// 운동 마당 (gjYard, 4 × 4).

function yard(g: THREE.Group, out: Built) {
  // Worn court: a plate over the floor, its lines; low netting at the left and front, nothing that closes the view.
  part(g, box(3.96, 0.012, 3.96), '#a8b294', 0, 0.006, 0, { outline: false });
  const court = painted('gjCourt', 256, 256, (c) => {
    c.fillStyle = '#a8b294';
    c.fillRect(0, 0, 256, 256);
    c.fillStyle = '#b6be9f';
    for (let i = 0; i < 40; i++) c.fillRect((i * 83) % 256, (i * 47) % 256, 14, 3);
    c.strokeStyle = '#f2efe2';
    c.lineWidth = 4;
    c.strokeRect(24, 8, 208, 240);
    c.strokeRect(84, 8, 88, 96);
    c.beginPath();
    c.arc(128, 104, pos(44), 0, Math.PI);
    c.stroke();
    c.beginPath();
    c.arc(128, 20, pos(104), 0.02, Math.PI - 0.02);
    c.stroke();
  });
  const courtMesh = picture(g, court, 3.9, 3.9, 0, 0.0135, 0, '#ffffff', 0, FLAT);
  courtMesh.castShadow = false;
  // (Out in the open since 2026-11-05, the layout audit: the 담장 behind it, gjPerimeter, and no painted sky on a wall.)
  // The hoop on its post: padded base, arm, backboard and rim; a net of a few strings.
  part(g, rbox(0.5, 0.1, 0.5, 0.03), NAVY, 0, 0.05, -1.82);
  part(g, cyl(0.05, 0.06, 2.4, 12), '#3a4f5e', 0, 1.25, -1.82);
  part(g, box(0.08, 0.08, 0.34), '#3a4f5e', 0, 2.38, -1.65);
  part(g, box(1.1, 0.72, 0.03), '#f5f5ef', 0, 2.3, -1.5);
  part(g, box(0.44, 0.3, 0.012), '#e7dfd2', 0, 2.2, -1.48, { outline: false });
  const rim = part(g, ring(0.17, 0.008), '#e8622c', YD.rim[0], YD.rim[1], YD.rim[2] + 0.0, { outline: false });
  rim.rotation.x = Math.PI / 2;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    rod(g, v3(YD.rim[0] + Math.cos(a) * 0.17, YD.rim[1], YD.rim[2] + Math.sin(a) * 0.17), v3(YD.rim[0] + Math.cos(a) * 0.1, YD.rim[1] - 0.24, YD.rim[2] + Math.sin(a) * 0.1), 0.003, '#f7f7f0');
  }
  // Low netting, waist high.
  const net = painted('gjNet', 128, 64, (c) => {
    c.clearRect(0, 0, 128, 64);
    c.strokeStyle = '#6d8079';
    c.lineWidth = 2;
    for (let i = 0; i <= 12; i++) {
      c.beginPath();
      c.moveTo(i * 11, 0);
      c.lineTo(i * 11, 64);
      c.stroke();
    }
    for (let i = 0; i <= 6; i++) {
      c.beginPath();
      c.moveTo(0, i * 11);
      c.lineTo(128, i * 11);
      c.stroke();
    }
  });
  const netMesh = (w: number, x: number, z: number, ry: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.9), new THREE.MeshBasicMaterial({ map: net, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    m.userData.ownGeometry = m.userData.ownMaterial = true;
    m.position.set(x, 0.46, z);
    m.rotation.y = ry;
    g.add(m);
  };
  netMesh(3.9, -1.96, 0, Math.PI / 2);
  netMesh(2.4, -0.76, 1.96, 0);
  for (const x of [-1.96, -0.76 + 1.2]) part(g, cyl(0.022, 0.022, 0.96, 8), GREY_D, x, 0.48, 1.96, { outline: false });
  for (const z of [-1.96, -0.65, 0.65]) part(g, cyl(0.022, 0.022, 0.96, 8), GREY_D, -1.96, 0.48, z, { outline: false });
  // A bench along the right, a water cooler, a lamp, a basket with a spare ball.
  part(g, rbox(0.42, 0.05, 1.5, 0.02), WOOD, 1.62, 0.44, 0.62);
  for (const z of [0, 1.24]) part(g, box(0.36, 0.42, 0.05), GREY_D, 1.62, 0.21, z, { outline: false });
  part(g, cyl(0.15, 0.13, 0.5, 14), '#e8ecef', 1.68, 0.25, -0.8);
  part(g, cyl(0.1, 0.1, 0.34, 14), '#8fcbea', 1.68, 0.66, -0.8);
  part(g, box(0.03, 0.03, 0.04), '#3a78b0', 1.68, 0.36, -0.65, { outline: false });
  part(g, cyl(0.03, 0.05, 2.6, 10), GREY_D, 1.82, 1.3, -1.72);
  const glowMat = glow('#fff2c8');
  const lampHead = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), glowMat);
  lampHead.userData.ownGeometry = lampHead.userData.ownMaterial = true;
  lampHead.position.set(1.7, 2.62, -1.62);
  g.add(lampHead);
  part(g, rbox(0.34, 0.28, 0.34, 0.03), '#6d8079', YD.ballRest[0], 0.14, YD.ballRest[2] - 0.1);
  label(g, '운동 시간 09:30–10:30', 0.82, 0.12, -1.0, 1.82, -1.965, CREAM, NAVY);
  // The ball.
  const ballG = group(g);
  ballG.name = 'gjBasketball';
  part(ballG, ball(0.115), '#d4692a', 0, 0, 0, { outline: false });
  for (let i = 0; i < 2; i++) {
    const seam = part(ballG, ring(0.116, 0.0025), '#3a2010', 0, 0, 0, { outline: false });
    seam.rotation.y = (i * Math.PI) / 2;
  }
  const seamH = part(ballG, ring(0.116, 0.0025), '#3a2010', 0, 0, 0, { outline: false });
  seamH.rotation.x = Math.PI / 2;
  const log = logBoard(g, 'gjYardLog', '운동 시간 기록');
  const tools: Partial<Record<GjTool, HeldTool>> = {
    ball: {
      tool: ballG,
      lead: 'right',
      grips: {
        right: { at: v3(0.118, -0.01, 0.01), axis: v3(0, 1, 0), palm: v3(-1, 0, 0), shape: 'cradle', radius: 0.11 },
        left: { at: v3(-0.118, -0.01, 0.01), axis: v3(0, 1, 0), palm: v3(1, 0, 0), shape: 'cradle', radius: 0.11 },
      },
    },
    ...log.tools,
  };
  const spots: Record<string, Spot> = { gjYardWatch: standAt(g, 'gjYardWatch', YD.dweller[0], YD.dweller[1]), gjYardTalk: standAt(g, 'gjYardTalk', YD.dweller[0], YD.dweller[1]) };
  spots['*'] = spots.gjYardWatch;
  out.work = marker(g, 0, 1, -0.4);
  const facing = (from: readonly [number, number], to: readonly [number, number]) => Math.atan2(to[0] - from[0], to[1] - from[1]);
  const aHoop = facing(YD.a, [YD.rim[0], YD.rim[2]]);
  const bHoop = facing(YD.b, YD.a);
  const aB = facing(YD.a, YD.b);
  const bA = facing(YD.b, YD.a);
  const A = lazy(() => person(g, '#9db2bd', RESIDENT_B, '#2a2622', YD.a[0], YD.a[1], aHoop, 'male', undefined, 51));
  const B = lazy(() => person(g, '#aebbc2', RESIDENT_B, '#3a2a1f', YD.b[0], YD.b[1], bHoop, 'male', undefined, 53));
  const sayA = bubble(g, '제 차례였잖아요', 0.72, YD.a[0], 1.86, YD.a[1]);
  const sayB = bubble(g, '그게 아니라요', 0.62, YD.b[0], 1.86, YD.b[1]);
  const calm = bubble(g, '잠깐, 한 사람씩 들어 볼게요', 0.92, YD.mid[0], 1.9, YD.mid[1]);
  const sorry = bubble(g, '제가 미안해요', 0.62, YD.a[0], 1.86, YD.a[1]);
  const glad = bubble(g, '고맙습니다!', 0.5, YD.a[0], 1.86, YD.a[1]);
  const to = new THREE.Vector3();
  drive(g, out, spots, tools, (now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    at(ballG, P.ball, YD.ballRest);
    if (N) ballG.rotation.y = N.tool === 'ball' ? N.st.yaw - Math.PI : t * 2.5;
    log.show(N?.tool === 'write' ? N : null, null, 0, n.lines ?? 0);
    sayA.visible = (n.sayA ?? 0) > 0.5;
    sayB.visible = (n.sayB ?? 0) > 0.5;
    calm.visible = (n.calmWord ?? 0) > 0.5;
    sorry.visible = (n.sorry ?? 0) > 0.5;
    glad.visible = now === 'gjYardWatch' && (n.glad ?? 0) > 0.5;
    if ((n.people ?? 0) > 0.5) {
      const a = A.get();
      const b = B.get();
      a.root.visible = b.root.visible = true;
      const f = clamp01(n.face);
      a.root.rotation.y = THREE.MathUtils.lerp(aB, aHoop, f);
      b.root.rotation.y = THREE.MathUtils.lerp(bA, bHoop, f);
      const heat = clamp01(n.quarrel);
      const shake = clamp01(n.shake);
      if (shake > 0.02) {
        // A hand out to the other, across the gap between them.
        const mx = (YD.a[0] + YD.b[0]) / 2;
        const mz = (YD.a[1] + YD.b[1]) / 2;
        to.set(YD.a[0] + (mx - YD.a[0]) * 0.55 * shake, 1.02, YD.a[1] + (mz - YD.a[1]) * 0.55 * shake);
        a.armR(to);
        to.set(YD.b[0] + (mx - YD.b[0]) * 0.55 * shake, 1.02, YD.b[1] + (mz - YD.b[1]) * 0.55 * shake);
        b.armR(to);
      } else if (heat > 0.05) {
        // Talking with their hands, kept low and open, nothing raised at anyone.
        to.set(YD.a[0] + 0.28, 1.04 + 0.05 * Math.sin(t * 4.2) * heat, YD.a[1] + 0.1);
        a.armR(to);
        to.set(YD.b[0] - 0.28, 1.04 + 0.05 * Math.sin(t * 3.6 + 1) * heat, YD.b[1] + 0.1);
        b.armR(to);
      } else {
        if ((n.aimA ?? 0) > 0.75) {
          to.set(YD.a[0] - 0.03, 1.56, YD.a[1] + 0.02);
          a.armR(to);
          to.set(YD.a[0] + 0.03, 1.56, YD.a[1] + 0.02);
          a.armL(to);
        } else {
          a.armR(null);
          a.armL(null);
        }
        if ((n.reachB ?? 0) > 0.5) {
          to.set(YD.b[0] - 0.12, 1.02, YD.b[1] + 0.05);
          b.armR(to);
          to.set(YD.b[0] + 0.12, 1.02, YD.b[1] + 0.05);
          b.armL(to);
        } else {
          b.armR(null);
          b.armL(null);
        }
      }
      if (heat > 0.05 || shake > 0.02) {
        a.armL(null);
        b.armL(null);
      }
      nodHead(a, (n.nodA ?? 0) > 0.5 ? 0.16 + 0.08 * Math.sin(t * 2.4) : 0.03);
      nodHead(b, (n.nodB ?? 0) > 0.5 ? 0.16 + 0.08 * Math.cos(t * 2.1) : 0.03);
    } else {
      A.hide();
      B.hide();
    }
  });
}

// =============================================================================================
// 의무 확인 창구 (gjMedCounter, 2 × 1).

function medCounter(g: THREE.Group, out: Built) {
  const T = MD.top;
  part(g, rbox(1.94, 0.04, 0.56, 0.012), '#eef1ee', 0, T - 0.02, -0.06);
  part(g, box(1.9, T - 0.06, 0.48), '#d9e4dd', 0, (T - 0.06) / 2, -0.06);
  for (let i = 0; i < 3; i++) part(g, box(0.56, T - 0.2, 0.01), '#c5d4cb', -0.62 + i * 0.62, T / 2 - 0.02, 0.185, { outline: false });
  // A low cabinet behind the nurse, with a green cross; low enough to see over.
  part(g, box(1.5, 1.2, 0.3), '#e8ece7', 0.1, 0.6, -1.22);
  for (let i = 0; i < 4; i++) part(g, box(0.34, 1.1, 0.006), '#d7ded7', -0.45 + i * 0.37, 0.6, -1.067, { outline: false });
  part(g, box(0.22, 0.07, 0.02), GREEN, 0.1, 1.05, -1.058, { outline: false });
  part(g, box(0.07, 0.22, 0.02), GREEN, 0.1, 1.05, -1.056, { outline: false });
  label(g, '의무 확인 창구', 0.5, 0.09, 0.42, T - 0.14, 0.2, '#d9e4dd', GREEN);
  // A blood-pressure monitor with a cuff, a small scale card, the record, the pen, the tray for cups.
  part(g, rbox(0.2, 0.14, 0.16, 0.014), '#f4f6f4', -0.68, T + 0.07, -0.12);
  const bp = liveScreen(g, 0.14, 0.08, 96, 56, -0.68, T + 0.1, -0.038);
  part(g, rbox(0.16, 0.05, 0.1, 0.02), '#3a5f7a', -0.68, T + 0.025, 0.04);
  part(g, rbox(0.24, 0.016, 0.16, 0.006), '#c5d4cb', MD.cupHome[0], T + 0.008, MD.cupHome[2], { outline: false });
  part(g, box(0.28, 0.006, 0.36), '#3b5b7a', MD.log[0], T + 0.003, MD.log[2], { outline: false });
  const record = liveScreen(g, 0.26, 0.34, 150, 200, MD.log[0], T + 0.0065, MD.log[2], 0, FLAT);
  const pen = penTool(g, 'gjMedPen', '#3b5b7a');
  // The thermometer on its stand.
  part(g, rbox(0.1, 0.014, 0.07, 0.005), GREY_D, MD.thermoHome[0], T + 0.007, MD.thermoHome[2], { outline: false });
  const thermo = group(g);
  thermo.name = 'gjThermometer';
  part(thermo, rbox(0.03, 0.12, 0.02, 0.008), '#f7f8f8', 0, 0, 0, { outline: false });
  part(thermo, cyl(0.012, 0.016, 0.03, 10), '#57b0d8', 0, 0.075, 0, { outline: false });
  const read = liveScreen(thermo, 0.022, 0.014, 56, 36, 0, 0.02, 0.0105);
  const cup = group(g);
  cup.name = 'gjWaterCup';
  part(cup, cyl(0.036, 0.028, 0.09, 14), PAPER, 0, 0, 0, { outline: false });
  part(cup, cyl(0.032, 0.032, 0.004, 14), '#9ad0e8', 0, 0.044, 0, { outline: false });
  stool(g, MD.patient[0], MD.patient[1], MD.patient[2]);
  const tools: Partial<Record<GjTool, HeldTool>> = {
    pen: pen.held,
    thermo: { tool: thermo, lead: 'right', grips: { right: { at: v3(0, -0.02, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.016 } } },
    cup: { tool: cup, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'cradle', radius: 0.034 } } },
  };
  const spots: Record<string, Spot> = { gjMedCheck: standAt(g, 'gjMedCheck', MD.dweller[0], MD.dweller[1]) };
  spots['*'] = spots.gjMedCheck;
  out.work = marker(g, MD.log[0], MD.log[1], MD.log[2]);
  const nurse = lazy(() => person(g, '#f2f4f2', '#6d8c9e', '#2a2622', MD.nurse[0], MD.nurse[1], 0, 'female', undefined, 61));
  const patient = lazy(() => person(g, RESIDENT, RESIDENT_B, '#8f8f8a', MD.patient[0], MD.patient[2], Math.PI / 2, 'male', MD.patient[1], 63));
  const hurts = bubble(g, '어젯밤부터 열이 나요', 0.84, MD.patient[0], 1.52, MD.patient[2]);
  const nurseWord = bubble(g, '물부터 드릴게요', 0.68, MD.nurse[0], 1.84, MD.nurse[1]);
  const glad = bubble(g, '좀 낫네요', 0.46, MD.patient[0], 1.52, MD.patient[2]);
  const to = new THREE.Vector3();
  drive(g, out, spots, tools, (_now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    at(pen.root, P.pen, MD.penHome);
    at(thermo, P.thermo, MD.thermoHome);
    at(cup, P.cup, MD.cupHome);
    const temp = n.temp ?? 0;
    read.draw(`${q(temp, 10)}`, (c) => {
      c.fillStyle = '#c8e6d0';
      c.fillRect(0, 0, 56, 36);
      if (temp > 1) text(c, temp.toFixed(1), 28, 18, 20, INK, 'center');
    });
    bp.draw(`${N ? 1 : 0}`, (c) => {
      c.fillStyle = '#c8e6d0';
      c.fillRect(0, 0, 96, 56);
      text(c, N ? '118/76' : '-- / --', 48, 28, 20, INK, 'center');
    });
    record.draw(`${Math.floor((n.lines ?? 0) * 3)}`, (c) => paintPage(c, 150, 200, '건강 확인 기록', n.lines ?? 0));
    hurts.visible = (n.hurts ?? 0) > 0.5;
    nurseWord.visible = (n.nurseTalk ?? 0) > 0.5;
    glad.visible = (n.glad ?? 0) > 0.5;
    if ((n.people ?? 0) > 0.5) {
      const a = nurse.get();
      const b = patient.get();
      a.root.visible = b.root.visible = true;
      if ((n.nurseTalk ?? 0) > 0.5) {
        to.set(MD.cupHome[0], T + 0.1, MD.cupHome[2] - 0.05);
        a.armR(to);
      } else {
        to.set(MD.nurse[0] + 0.14, T + 0.08, MD.nurse[1] + 0.34);
        a.armR(to);
      }
      a.armL(null);
      nodHead(a, (n.nurseTalk ?? 0) > 0.5 ? 0.1 : 0.2);
      if ((n.water ?? 0) > 0.5) {
        to.set(MD.patient[0] + 0.14, 1.0, MD.patient[2] + 0.02);
        b.armR(to);
      } else b.armR(null);
      b.armL(null);
      nodHead(b, (n.tilt ?? 0) > 0.5 ? -0.08 : (n.hurts ?? 0) > 0.5 ? 0.2 + 0.03 * Math.sin(t * 1.4) : 0.1);
    } else {
      nurse.hide();
      patient.hide();
    }
  });
}

// =============================================================================================
// 소지품 보관함 (gjLockers, 2 × 1).

function lockers(g: THREE.Group, out: Built) {
  const F = LK.face;
  const W = 0.33;
  const H = 0.38;
  // A grey-green steel bank from the shelf's height to above the head, two rows of five.
  part(g, box(1.72, 2, 0.26), MINT_D, 0, 1, F - 0.13);
  part(g, box(1.64, 0.76, 0.012), '#5d7468', 0, 0.42, F + 0.004, { outline: false });
  label(g, '접견 소지품 보관함', 0.8, 0.11, 0, 1.86, F + 0.008, MINT_D, '#ffffff');
  // Each locker's opening, then its door hinged on the left, a number, a key-tag plate.
  const doors: THREE.Group[] = [];
  LK.rows.forEach((y, r) => {
    LK.cols.forEach((x, k) => {
      part(g, box(W - 0.02, H - 0.02, 0.012), '#2b3532', x, y, F + 0.004, { outline: false });
      const d = group(g, x - W / 2 + 0.006, y, F + 0.012);
      part(d, box(W - 0.018, H - 0.018, 0.012), MINT, W / 2 - 0.006, 0, 0.006);
      label(d, `${r * 5 + k + 1}`, 0.08, 0.06, W / 2 - 0.006, 0.08, 0.014, MINT, NAVY);
      part(d, box(0.02, 0.07, 0.014), GREY_D, W - 0.05, 0, 0.018, { outline: false });
      doors.push(d);
    });
  });
  // The shelf for what's being put away, and a tray for the search of bags.
  part(g, rbox(1.72, 0.04, 0.46, 0.012), WOOD, 0, LK.shelfY, F + 0.2);
  for (const sx of [-1, 1]) part(g, box(0.05, LK.shelfY, 0.42), GREY_D, sx * 0.82, LK.shelfY / 2, F + 0.2);
  part(g, rbox(0.36, 0.06, 0.28, 0.012), '#8fa698', 0.22, LK.shelfY + 0.05, F + 0.2);
  label(g, '소지품 바구니', 0.3, 0.05, 0.22, LK.shelfY + 0.05, F + 0.342, '#8fa698', '#ffffff');
  part(g, box(0.12, 0.02, 0.07), '#333c44', 0.16, LK.shelfY + 0.09, F + 0.2, { outline: false });
  // The tags on their board, and one in the hand.
  part(g, box(0.14, 0.2, 0.012), CREAM, LK.tagHome[0], LK.tagHome[1] + 0.09, LK.tagHome[2] - 0.05, { outline: false });
  const tag = group(g);
  tag.name = 'gjLockerTag';
  part(tag, rbox(0.044, 0.002, 0.064, 0.002), '#d8a23a', 0, 0, -0.024, { outline: false });
  part(tag, ring(0.012, 0.0018), CHROME, 0, 0.001, 0.016, { outline: false }).rotation.x = Math.PI / 2;
  // The visitor's bag: from its handle down.
  const bag = group(g);
  bag.name = 'gjVisitorBag';
  part(bag, rbox(0.28, 0.2, 0.12, 0.03), '#7a5a4a', 0, -0.17, 0);
  const handle = part(bag, ring(0.05, 0.006), '#5a4030', 0, -0.05, 0, { outline: false });
  handle.rotation.y = Math.PI / 2 - Math.PI / 2;
  const tools: Partial<Record<GjTool, HeldTool>> = {
    tag: { tool: tag, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 0, -1), palm: v3(0, -1, 0), shape: 'pinch', radius: 0.004 } } },
    bag: { tool: bag, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(1, 0, 0), shape: 'power', radius: 0.009 } } },
  };
  const spots: Record<string, Spot> = { gjLockerGuide: standAt(g, 'gjLockerGuide', 0.02, LK.stand + 0.1) };
  spots['*'] = spots.gjLockerGuide;
  out.work = marker(g, 0, LK.rows[1], F);
  const visitor = lazy(() => person(g, '#a8836e', '#47525a', '#b9b9b4', LK.visitor[0], LK.visitor[1], Math.PI / 2, 'female', undefined, 71, 'elder'));
  const greet = bubble(g, '가방은 여기 보관해 드릴게요', 0.96, 0.02, 1.82, LK.stand + 0.1);
  const glad = bubble(g, '고맙습니다', 0.5, LK.visitor[0], 1.76, LK.visitor[1]);
  const to = new THREE.Vector3();
  drive(g, out, spots, tools, (_now, N) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const li = N ? (n.locker ?? 0) : -1;
    const open = clamp01(n.door);
    doors.forEach((d, i) => (d.rotation.y = i === Math.round(li) + 6 ? -1.6 * open : 0));
    at(bag, P.bag ?? null);
    at(tag, P.tag ?? null, LK.tagHome);
    greet.visible = (n.talk ?? 0) > 0.5;
    glad.visible = (n.glad ?? 0) > 0.5;
    if ((n.people ?? 0) > 0.5) {
      const f = visitor.get();
      f.root.visible = true;
      if ((n.reach ?? 0) > 0.3 || (n.has ?? 0) > 0.5) {
        to.set(LK.visitor[0] + 0.28, 1.02, LK.visitor[1] - 0.04);
        f.armR(to);
      } else f.armR(null);
      f.armL(null);
      nodHead(f, (n.glad ?? 0) > 0.5 ? 0.16 : 0.08);
    } else visitor.hide();
  });
}

// =============================================================================================
// 안내판 (gjSign, 1 × 1): set dressing.

function sign(g: THREE.Group) {
  part(g, box(0.86, 1.1, 0.05), NAVY, 0, 1.36, -0.44);
  part(g, box(0.8, 1.04, 0.012), CREAM, 0, 1.36, -0.414, { outline: false });
  const tex = painted('gjSign', 288, 374, (c) => {
    c.fillStyle = CREAM;
    c.fillRect(0, 0, 288, 374);
    c.fillStyle = NAVY;
    c.fillRect(0, 0, 288, 88);
    text(c, `${NAME} 교정시설`, 144, 30, 28, '#ffffff', 'center');
    text(c, '다시 시작하는 내일', 144, 66, 18, '#cfe0d8', 'center');
    ['1 접견 신청', '2 소지품 보관', '3 접견실', '4 민원 상담'].forEach((s, i) => text(c, s, 24, 118 + i * 38, 18, INK, 'left', false));
    c.fillStyle = '#efe0c0';
    c.fillRect(16, 268, 256, 88);
    ['접견 시간 09:00–16:00', '신분증을 준비해 주세요', '천천히 오셔도 괜찮아요'].forEach((s, i) => text(c, s, 144, 288 + i * 26, 15, '#5a4a30', 'center', false));
  });
  picture(g, tex, 0.76, 0.98, 0, 1.36, -0.405);
  part(g, cyl(0.1, 0.08, 0.2, 12), '#b58a5a', 0.34, 0.1, -0.34);
  part(g, ball(0.14), GREEN, 0.34, 0.3, -0.34);
}

// =============================================================================================
// 거실 비품 (gjCellKit, 3 × 1, 2026-11-05, the layout audit): along a cell's back wall. The 관물대 with the small TV on it, the 이불
// folded and stacked on the 장판, the low table, the 화장실 behind its half-height partition at the right; looked in on from the
// cell's middle on the round.

function cellKit(g: THREE.Group, out: Built) {
  const z0 = -0.5;
  // The 장판 the cell is lived on.
  part(g, box(2.94, 0.01, 0.96), '#d8b77a', 0, 0.005, 0, { outline: false });
  // The 관물대: an open shelf unit, the TV on top, folded clothes and a cup on the shelves.
  const sx = -0.95;
  part(g, rbox(0.9, 0.8, 0.34, 0.02), CREAM, sx, 0.4, z0 + 0.19);
  for (const y of [0.28, 0.55]) part(g, box(0.84, 0.02, 0.3), '#d9d0bb', sx, y, z0 + 0.21, { outline: false });
  for (const [x, y, col] of [[-0.2, 0.33, '#8fa3b8'], [0.05, 0.33, '#c9c2ad'], [-0.15, 0.6, '#a9b7a3']] as Array<[number, number, string]>) part(g, rbox(0.22, 0.07, 0.24, 0.02), col, sx + x, y, z0 + 0.22);
  part(g, cyl(0.035, 0.03, 0.08, 10), '#eeeeee', sx + 0.28, 0.6, z0 + 0.22);
  part(g, rbox(0.5, 0.32, 0.06, 0.015), GRAPHITE, sx, 0.98, z0 + 0.12);
  part(g, box(0.44, 0.26, 0.004), '#3c5a6e', sx, 0.98, z0 + 0.153, { outline: false });
  part(g, rbox(0.16, 0.02, 0.1, 0.008), GRAPHITE, sx, 0.81, z0 + 0.12);
  // The 이불 folded and stacked, the pillows on top.
  const bz = z0 + 0.3;
  ['#9fb4c7', '#e3dccb', '#b7c4ad', '#d9c3a8'].forEach((col, i) => part(g, rbox(0.66, 0.1, 0.44, 0.04), col, 0.05, 0.06 + i * 0.1, bz));
  for (const x of [-0.12, 0.2]) part(g, rbox(0.28, 0.08, 0.18, 0.04), '#f2efe6', x, 0.47, bz);
  // The low table out from the wall.
  part(g, rbox(0.6, 0.03, 0.38, 0.01), WOOD, -0.25, 0.3, 0.22);
  for (const [x, z] of [[-0.5, 0.08], [0, 0.08], [-0.5, 0.36], [0, 0.36]]) part(g, box(0.03, 0.28, 0.03), WOOD_D, x, 0.14, z, { outline: false });
  part(g, box(0.18, 0.006, 0.24), PAPER, -0.32, 0.318, 0.22, { outline: false });
  // The 화장실 behind its partition.
  const tx = 1.05;
  part(g, box(0.04, 1.1, 0.9), MINT, tx - 0.4, 0.55, 0.0);
  part(g, box(0.8, 1.1, 0.04), MINT, tx, 0.55, 0.43);
  part(g, box(0.36, 0.9, 0.012), MINT_D, tx + 0.1, 0.48, 0.452, { outline: false });
  part(g, cyl(0.17, 0.14, 0.38, 16), '#f4f4f0', tx + 0.05, 0.19, -0.1);
  part(g, rbox(0.36, 0.3, 0.16, 0.03), '#f4f4f0', tx + 0.05, 0.5, z0 + 0.1);
  // Looked in on from the middle of the cell.
  const look = marker(g, 0, 0.6, z0 + 0.2);
  out.work = look;
  const s = spot(g, 'stand', 0, 0, 0.5 + 0.35, Math.PI);
  s.motion = 'peer';
  s.work = look;
  out.spots = { '*': s };
}

// =============================================================================================
// 담장·감시대 (gjPerimeter, 1 × 1 on the yard's north-east tile at 23, 2; 2026-11-05, the layout audit): the 담장 in the wall tiles
// along the lot's back (y 1) and side (x 24), 4.5 m of concrete with a cap and coiled wire on top, and the 감시대 at the corner.

function perimeter(g: THREE.Group) {
  const H = 4.5;
  const CONC = '#bdbab1';
  const run = (x0: number, z0: number, x1: number, z1: number) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const ry = Math.atan2(-(z1 - z0), x1 - x0);
    const mx = (x0 + x1) / 2;
    const mz = (z0 + z1) / 2;
    part(g, box(len, H, 0.3), CONC, mx, H / 2, mz, { ry });
    part(g, box(len, 0.12, 0.42), '#9e9b92', mx, H + 0.06, mz, { ry });
    // Expansion joints, and the wire coiled along the top.
    const n = Math.round(len / 2);
    for (let k = 1; k < n; k++) part(g, box(0.02, H - 0.1, 0.32), '#a9a69e', x0 + ((x1 - x0) * k) / n, H / 2, z0 + ((z1 - z0) * k) / n, { ry, outline: false });
    const m = Math.round(len / 0.35);
    for (let k = 0; k <= m; k++) {
      const coil = part(g, ring(0.2, 0.01), '#8a9196', x0 + ((x1 - x0) * k) / m, H + 0.32, z0 + ((z1 - z0) * k) / m, { outline: false });
      coil.rotation.set(0, ry + Math.PI / 2, 0);
    }
    for (const dy of [0.14, 0.5]) part(g, box(len, 0.012, 0.012), '#6f777c', mx, H + dy, mz, { ry, outline: false });
  };
  run(-7.0, -0.68, 0.68, -0.68);
  run(0.68, -0.68, 0.68, 7.0);
  // The 감시대 over the corner: its column in the wall, the glazed cabin, the roof, a lamp.
  const tx = 0.95;
  const tz = -0.95;
  part(g, box(0.62, 5.0, 0.62), '#a9a69e', tx, 2.5, tz);
  part(g, box(1.6, 0.14, 1.6), '#8f8c84', tx, 5.05, tz);
  for (const [dx, dz, w, d] of [[0, -0.78, 1.6, 0.04], [0, 0.78, 1.6, 0.04], [-0.78, 0, 0.04, 1.6], [0.78, 0, 0.04, 1.6]] as Array<[number, number, number, number]>) {
    part(g, box(w, 0.5, d), CONC, tx + dx, 5.37, tz + dz, { outline: false });
    glass(g, box(w * 0.96, 0.62, d * 0.96), tx + dx, 5.93, tz + dz);
  }
  for (const [dx, dz] of [[-0.76, -0.76], [0.76, -0.76], [-0.76, 0.76], [0.76, 0.76]]) part(g, box(0.06, 1.2, 0.06), GREY_D, tx + dx, 5.7, tz + dz, { outline: false });
  part(g, box(1.9, 0.12, 1.9), NAVY_D, tx, 6.32, tz);
  part(g, cyl(0.1, 0.14, 0.16, 12), GRAPHITE, tx - 0.8, 6.0, tz + 0.8, { rx: -0.6 });
}

export const BUILDERS: Record<string, Builder> = {
  gjCellKit(g, _W, _D, _c, _def, _ctx, out) {
    cellKit(g, out);
  },
  gjPerimeter(g) {
    perimeter(g);
  },
  cctvConsole(g, _W, _D, _c, _def, _ctx, out) {
    console3d(g, out);
  },
  // Two tiles deep, the other side of the glass in the back one; the piece keeps its one-tile frame on the front one.
  visitBooth(g, _W, _D, _c, _def, _ctx, out) {
    visitBooth(group(g, 0, 0, 0.5), out);
  },
  counselTable(g, _W, _D, _c, _def, _ctx, out) {
    counselTable(group(g, 0, 0, 0.5), out);
  },
  gjCctvWall(g, _W, _D, _c, _def, _ctx, out) {
    cctvWall(g, out);
  },
  gjDoorPanel(g, _W, _D, _c, _def, _ctx, out) {
    doorPanel(g, out);
  },
  gjGate(g, _W, _D, _c, _def, _ctx, out) {
    gate(g, out);
  },
  gjRoundPost(g, _W, _D, _c, _def, _ctx, out) {
    roundPost(g, out);
  },
  gjWorkshop(g, _W, _D, _c, _def, _ctx, out) {
    workshop(g, out);
  },
  gjBookCart(g, _W, _D, _c, _def, _ctx, out) {
    bookCart(g, out);
  },
  gjYard(g, _W, _D, _c, _def, _ctx, out) {
    yard(g, out);
  },
  gjMedCounter(g, _W, _D, _c, _def, _ctx, out) {
    medCounter(group(g, 0, 0, 0.5), out);
  },
  gjLockers(g, _W, _D, _c, _def, _ctx, out) {
    lockers(g, out);
  },
  gjSign(g) {
    sign(g);
  },
};
