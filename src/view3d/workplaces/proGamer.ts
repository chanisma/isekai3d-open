import * as THREE from 'three';
import { marker, rod, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, label, painted, picture, ring, text } from './doctor';
import { DB, GB, PC, RS, SB, SD, SS, TW, add, egNow, egPhase, onScreen } from './proGamerMotion';
import type { EgMotion, EgNow } from './proGamerMotion';
import { vroidFigure } from './vroidFigure';

/**
 * The e스포츠 게임단 연습실 drawn as itself (2026-11-01 workplace pipeline, at the user's request): the made-up team 은하수
 * 게이밍 playing the made-up game 별무리 아레나. Rows of desks with high-refresh monitors, a racing chair and a tower with a lit
 * window, teammates on headsets at some of them; a coach's wall screen with a laser; a magnet draft board; a fan stream set
 * with a ring light; a wall of cups under the sponsors' banner; a corner where a physio sees to wrists; a bench for keyboards
 * and mice; a stage with an LED wall and fans with light sticks; the team van.
 *
 * What's on a screen is worked out from the script, so a fight there is the mouse flicking here. All team, game, hero and
 * sponsor names are made up. Everything that moves follows proGamerMotion.ts.
 */

const TEAM = '은하수 게이밍';
const GAME = '별무리 아레나';
const RIVALS = ['번개곰', '달토끼', '먹구름', '불꽃여우', '파도개구리'];
const HEROES = ['별지기', '철갑곰', '달궁수', '안개술사', '불꽃검', '얼음꽃', '바람칼', '돌거인', '먹그늘', '노을새', '은빛늑대', '구름창'];
const HERO_COLORS = ['#3d6fd0', '#a0623a', '#7c4dd0', '#2f9e8f', '#d0433a', '#59b6e0', '#59a84c', '#7c7f88', '#3f3a55', '#e08a3a', '#b8c0cc', '#c9b24c'];
const SPONSORS = ['번개물', '구름의자', '별빛통신', '달콤라면'];
const NAVY = '#17204a';
const NAVY_D = '#0d1230';
const VIOLET = '#6a3fd0';
const CYAN = '#3fd8e8';
const GOLD = '#e8b93f';
const CHAR = '#22242c';
const CARBON = '#2c2f38';
const WOOD = '#8a6242';
const PAPER = '#f4f2ea';
const SKIN = '#eec6a0';
const UP = new THREE.Vector3(0, 1, 0);
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const vec = (p: readonly [number, number, number]) => v3(p[0], p[1], p[2]);
const tmp = new THREE.Vector3();
type V = readonly [number, number, number];
type Ctx2 = CanvasRenderingContext2D;

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
function glass(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, ry = 0, opacity = 0.16): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: '#bfe6ff', transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  m.rotation.y = ry;
  g.add(m);
  return m;
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
function standAt(g: THREE.Object3D, motion: EgMotion, x = 0, z = 0.6): Spot {
  const s = spot(g, 'stand', x, 0, z, Math.PI);
  s.motion = motion;
  return s;
}
function seatAt(g: THREE.Object3D, motion: EgMotion, seat: V): Spot {
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
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, show: (now: string | null, N: EgNow | null, t: number, H: number) => void) {
  out.spots = spots;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const H = sp ? ((sp.at.userData.height as number | undefined) ?? 1.6) : 1.6;
    const N = sp ? egNow(sp.motion as EgMotion, t, egPhase(g.getWorldPosition(tmp)), H) : null;
    show(now, N, t, H);
  };
}
const q = (x: number | undefined, steps = 20) => Math.round((x ?? 0) * steps);
const seedOf = (g: THREE.Object3D) => {
  const p = g.getWorldPosition(tmp);
  return Math.floor(Math.abs(p.x) * 3 + Math.abs(p.z) * 7);
};
function penMesh(g: THREE.Object3D): THREE.Group {
  const p = group(g);
  part(p, cyl(0.006, 0.002, 0.14, 8), '#1d1d22', 0.02, 0.065, 0.025, { rz: -0.3, rx: 0.42, outline: false });
  return p;
}
/** A gaming headset, round the group's origin at the head's centre. */
function headset(g: THREE.Object3D, color = BLACK): THREE.Group {
  const h = group(g);
  const band = part(h, ring(0.128, 0.011, Math.PI), color, 0, 0, 0, { outline: false });
  band.rotation.z = 0;
  for (const sx of [-1, 1]) {
    part(h, cyl(0.05, 0.05, 0.03, 16), color, sx * 0.125, 0, 0, { rz: Math.PI / 2 });
    ownLit(h, cyl(0.022, 0.022, 0.004, 12), CYAN, sx * 0.142, 0, 0).rotation.z = Math.PI / 2;
  }
  rod(h, v3(-0.13, -0.03, 0.02), v3(-0.075, -0.09, 0.11), 0.005, color);
  part(h, ball(0.012), '#111114', -0.07, -0.095, 0.115, { outline: false });
  return h;
}
/** A racing chair: the seat's top at `seat`, the back behind it (+z, as it faces -z), a team badge across the back. */
function racingChair(g: THREE.Object3D, seat: V, accent = VIOLET, floor = 0) {
  const c = group(g, seat[0], floor, seat[2]);
  const T = seat[1] - floor;
  part(c, rbox(0.46, 0.08, 0.46, 0.035), CHAR, 0, T - 0.04, 0);
  part(c, box(0.3, 0.004, 0.36), accent, 0, T + 0.001, 0, { outline: false });
  part(c, cyl(0.024, 0.03, T - 0.14, 10), CHROME, 0, (T - 0.08) / 2 + 0.06, 0, { outline: false });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    rod(c, v3(0, 0.1, 0), v3(Math.cos(a) * 0.26, 0.05, Math.sin(a) * 0.26), 0.014, BLACK);
    part(c, ball(0.026), BLACK, Math.cos(a) * 0.26, 0.028, Math.sin(a) * 0.26, { outline: false });
  }
  const back = group(c, 0, T, 0.24);
  back.rotation.x = 0.12;
  part(back, rbox(0.46, 0.56, 0.08, 0.05), CHAR, 0, 0.27, 0);
  for (const sx of [-1, 1]) part(back, box(0.06, 0.5, 0.004), accent, sx * 0.14, 0.27, 0.042, { outline: false });
  part(back, rbox(0.2, 0.1, 0.06, 0.03), accent, 0, 0.5, -0.03);
  // The badge faces the room, behind them.
  picture(back, teamBadge(), 0.2, 0.2, 0, 0.32, 0.043);
  for (const sx of [-1, 1]) {
    part(c, box(0.04, 0.14, 0.04), BLACK, sx * 0.26, T + 0.08, 0.04);
    part(c, rbox(0.07, 0.03, 0.22, 0.012), CHAR, sx * 0.26, T + 0.16, 0.02);
  }
}
const teamBadge = () =>
  painted('egBadge', 128, 128, (c) => {
    c.fillStyle = NAVY_D;
    c.beginPath();
    c.arc(64, 64, 62, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = GOLD;
    c.lineWidth = 5;
    c.stroke();
    // A swirl of stars: the milky way of the team's name.
    c.strokeStyle = CYAN;
    c.lineWidth = 7;
    c.beginPath();
    c.arc(64, 64, 34, 0.4, 4.2);
    c.stroke();
    c.fillStyle = '#ffffff';
    for (const [x, y, r] of [[64, 64, 9], [90, 42, 5], [38, 88, 5], [86, 86, 3]] as const) {
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    }
    text(c, '은하수', 64, 108, 16, GOLD, 'center');
  });

// ---------------------------------------------------------------------------------------------
// The people in a scene.

interface Look {
  top: string;
  bottom: string;
  hair: string;
  skin: string;
}
const JERSEY: Look = { top: '#2b2f7a', bottom: '#1d1f2c', hair: '#1a1a1a', skin: '#f3d0b0' };
const LOOKS: Record<string, Look> = {
  mate1: JERSEY,
  mate2: { ...JERSEY, hair: '#402a1a', skin: '#eac09a' },
  mate3: { ...JERSEY, hair: '#5b3a1e', skin: '#f8d9c0' },
  // 류세찬 코치, as in the staff list.
  coach: { top: '#263238', bottom: '#1f2228', hair: '#5b3a1e', skin: '#c99a6e' },
  physio: { top: '#e8eef2', bottom: '#425868', hair: '#1a1a1a', skin: '#f3d0b0' },
  fan1: { top: '#d9476a', bottom: '#2f3e4a', hair: '#2b1b10', skin: '#eac09a' },
  fan2: { top: '#e0b53a', bottom: '#40382e', hair: '#1a1a1a', skin: '#f3d0b0' },
  fan3: { top: '#4e9d6f', bottom: '#34383f', hair: '#5b3a1e', skin: '#e8bd95' },
  fan4: { top: '#6f8ed9', bottom: '#2f3136', hair: '#1a1a1a', skin: '#f8d9c0' },
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
/** Someone stood, or sat if `seat` is given, played by a VRoid body once one is ready. */
function person(parent: THREE.Object3D, look: Look, x: number, z: number, ry: number, gender: 'female' | 'male', seat?: number, seed?: number): Fig {
  const root = group(parent, x, 0, z, ry);
  const sitting = seat !== undefined;
  const base = sitting ? seat + 0.07 - 0.88 : 0;
  if (sitting) {
    for (const sx of [-1, 1]) {
      const ankle = v3(sx * 0.09, 0.08, 0.5);
      const knee = v3(sx * 0.09, seat + 0.03, 0.36);
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
  const f = vroidFigure({ root, head, armL, armR }, { gender, ...(sitting ? { seat } : {}), ...(seed !== undefined ? { seed } : {}) });
  root.visible = false;
  return f;
}
function lazy(make: () => Fig) {
  let f: Fig | null = null;
  return { get: () => (f ??= make()), hide: () => f && (f.root.visible = false) };
}

// ---------------------------------------------------------------------------------------------
// What's on the screens.

interface Match {
  g: number;
  fight: boolean;
  ended: boolean;
  round: number;
  t: number;
}
const wonOf = (round: number) => ((round % 3) + 3) % 3 !== 0;
const rivalOf = (round: number) => RIVALS[((round % RIVALS.length) + RIVALS.length) % RIVALS.length];
/** 별무리 아레나: three lanes between two star bases, little units going up them, a score that follows the match. */
function paintGame(c: Ctx2, W: number, H: number, m: Match) {
  const won = wonOf(m.round);
  const k = W / 256;
  c.fillStyle = '#10243a';
  c.fillRect(0, 0, W, H);
  const hud = 22 * k;
  const y0 = hud;
  const h = H - hud;
  // The field: river across, lanes corner to corner.
  c.fillStyle = '#17364a';
  c.fillRect(0, y0, W, h);
  c.strokeStyle = '#2a7fa8';
  c.lineWidth = 12 * k;
  c.beginPath();
  c.moveTo(0, y0);
  c.bezierCurveTo(W * 0.3, y0 + h * 0.35, W * 0.7, y0 + h * 0.65, W, H);
  c.stroke();
  c.strokeStyle = '#5a6c5a';
  c.lineWidth = 7 * k;
  const lanes: Array<(u: number) => [number, number]> = [
    (u) => (u < 0.5 ? [14 * k, H - 14 * k - (h - 28 * k) * u * 2] : [14 * k + (W - 28 * k) * (u - 0.5) * 2, y0 + 14 * k]),
    (u) => [14 * k + (W - 28 * k) * u, H - 14 * k - (h - 28 * k) * u],
    (u) => (u < 0.5 ? [14 * k + (W - 28 * k) * u * 2, H - 14 * k] : [W - 14 * k, H - 14 * k - (h - 28 * k) * (u - 0.5) * 2]),
  ];
  for (const f of lanes) {
    c.beginPath();
    for (let i = 0; i <= 20; i++) {
      const [x, y] = f(i / 20);
      if (i) c.lineTo(x, y);
      else c.moveTo(x, y);
    }
    c.stroke();
  }
  // The bases and the towers.
  const baseHp = (side: number) => (m.ended && (side === 0) !== won ? 0 : 1);
  for (const [side, x, y, col] of [[0, 18 * k, H - 18 * k, '#4f9dff'], [1, W - 18 * k, y0 + 18 * k, '#ff5a5a']] as const) {
    c.fillStyle = baseHp(side) ? col : '#3a3a42';
    c.beginPath();
    c.arc(x, y, 11 * k, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(x, y, 4 * k, 0, Math.PI * 2);
    c.fill();
  }
  for (const f of lanes)
    for (const [u, col] of [[0.28, '#4f9dff'], [0.72, '#ff5a5a']] as const) {
      const [x, y] = f(u);
      c.fillStyle = col;
      c.fillRect(x - 3 * k, y - 3 * k, 6 * k, 6 * k);
    }
  // The little units: where the front has got to in each lane moves with the match.
  const lean = won ? m.g * 0.3 : -m.g * 0.26;
  lanes.forEach((f, li) => {
    const front = 0.5 + lean + 0.05 * Math.sin(m.t * 0.7 + li * 2);
    for (let i = 0; i < 4; i++) {
      const [xb, yb] = f(front - 0.05 - i * 0.035 + 0.008 * Math.sin(m.t * 3 + i));
      const [xr, yr] = f(front + 0.05 + i * 0.035 - 0.008 * Math.sin(m.t * 3 + i));
      c.fillStyle = '#9cd0ff';
      c.fillRect(xb - 1.5 * k, yb - 1.5 * k, 3 * k, 3 * k);
      c.fillStyle = '#ffb0a8';
      c.fillRect(xr - 1.5 * k, yr - 1.5 * k, 3 * k, 3 * k);
    }
  });
  // A team fight in the middle: heroes, sparks and rings.
  const cx = W * (0.5 + lean * 0.4);
  const cy = y0 + h * (0.5 - lean * 0.4);
  const n = m.fight ? 5 : 2;
  for (let i = 0; i < n; i++) {
    const r = (m.fight ? 24 : 40) * k;
    const a = m.t * (m.fight ? 1.8 : 0.5) + i * 1.3;
    for (const [sgn, col] of [[1, '#4f9dff'], [-1, '#ff5a5a']] as const) {
      const x = cx + sgn * (r * 0.55 + 7 * k * Math.cos(a * 1.7)) + 8 * k * Math.sin(a);
      const y = cy + r * 0.8 * Math.sin(a + i);
      c.fillStyle = col;
      c.beginPath();
      c.arc(x, y, 4 * k, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#7bea7b';
      c.fillRect(x - 5 * k, y - 8 * k, 10 * k * (0.35 + 0.6 * Math.abs(Math.sin(a * 0.7 + i))), 2 * k);
    }
  }
  if (m.fight) {
    for (let i = 0; i < 7; i++) {
      const a = i * 2.3 + m.t * 3;
      c.strokeStyle = i % 2 ? '#ffe08a' : '#ffffff';
      c.lineWidth = 1.6 * k;
      c.beginPath();
      c.arc(cx + 14 * k * Math.cos(a), cy + 12 * k * Math.sin(a * 1.3), (5 + 8 * ((((m.t * 2 + i * 0.2) % 1) + 1) % 1)) * k, 0, Math.PI * 2);
      c.stroke();
    }
  }
  // The bar across the top: teams, kills, the clock.
  const blue = Math.round(m.g * (won ? 18 : 9));
  const red = Math.round(m.g * (won ? 8 : 16));
  c.fillStyle = '#0a0f22';
  c.fillRect(0, 0, W, hud);
  text(c, '은하수', 6 * k, hud / 2, 11 * k, '#7bbcff');
  text(c, rivalOf(m.round), W - 6 * k, hud / 2, 11 * k, '#ff9c9c', 'right');
  text(c, `${blue} : ${red}`, W / 2, hud / 2, 13 * k, '#ffffff', 'center');
  const mins = Math.floor(m.g * 31);
  text(c, `${String(mins).padStart(2, '0')}:${String(Math.floor(m.g * 1860) % 60).padStart(2, '0')}`, W * 0.72, hud / 2, 9 * k, '#b8c2d8', 'center', false);
  // The kill feed.
  if (m.fight) {
    const i = Math.floor(m.t * 1.3);
    for (let j = 0; j < 2; j++) {
      const a = HEROES[(i + j * 5) % HEROES.length];
      const b = HEROES[(i * 3 + j + 7) % HEROES.length];
      c.fillStyle = 'rgba(0,0,0,0.6)';
      c.fillRect(W - 112 * k, hud + 3 * k + j * 13 * k, 110 * k, 12 * k);
      text(c, `${a} > ${b}`, W - 6 * k, hud + 9 * k + j * 13 * k, 9 * k, '#ffe08a', 'right', false);
    }
  }
  if (m.ended) {
    c.fillStyle = 'rgba(5,8,22,0.72)';
    c.fillRect(0, H / 2 - 26 * k, W, 52 * k);
    text(c, won ? '승리' : '패배', W / 2, H / 2, 34 * k, won ? GOLD : '#ff8d8d', 'center');
  }
}
function paintIdle(c: Ctx2, W: number, H: number, label2: string) {
  const grad = c.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, NAVY_D);
  grad.addColorStop(1, '#2a1a5e');
  c.fillStyle = grad;
  c.fillRect(0, 0, W, H);
  const k = W / 256;
  c.fillStyle = '#ffffff';
  for (let i = 0; i < 24; i++) c.fillRect((i * 97) % W, (i * 53) % H, 1.5 * k, 1.5 * k);
  text(c, GAME, W / 2, H * 0.44, 24 * k, '#ffffff', 'center');
  text(c, label2, W / 2, H * 0.66, 12 * k, CYAN, 'center', false);
}
function paintMap(c: Ctx2, W: number, H: number, routes: number, wards: number, t: number) {
  paintGame(c, W, H, { g: 0.05, fight: false, ended: false, round: 1, t: 0 });
  const k = W / 256;
  c.fillStyle = 'rgba(8,10,30,0.3)';
  c.fillRect(0, 22 * k, W, H - 22 * k);
  c.strokeStyle = GOLD;
  c.lineWidth = 3 * k;
  c.setLineDash([7 * k, 4 * k]);
  c.beginPath();
  const pts: Array<[number, number]> = [[0.06, 0.92], [0.28, 0.76], [0.42, 0.55], [0.6, 0.48], [0.74, 0.28]];
  const len = (pts.length - 1) * routes;
  pts.forEach(([x, y], i) => {
    if (i > len + 1) return;
    const e = i <= len ? 1 : len - (i - 1);
    const [px, py] = pts[Math.max(0, i - 1)];
    const X = (px + (x - px) * e) * W;
    const Y = (py + (y - py) * e) * H;
    if (i) c.lineTo(X, Y);
    else c.moveTo(X, Y);
  });
  c.stroke();
  c.setLineDash([]);
  for (let i = 0; i < Math.floor(wards); i++) {
    const [x, y] = [[0.34, 0.4], [0.62, 0.72], [0.82, 0.55], [0.2, 0.55]][i];
    c.fillStyle = '#7bffb0';
    c.beginPath();
    c.arc(x * W, y * H, 4 * k, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(123,255,176,0.6)';
    c.lineWidth = 1.4 * k;
    c.beginPath();
    c.arc(x * W, y * H, (10 + 4 * Math.sin(t * 3 + i)) * k, 0, Math.PI * 2);
    c.stroke();
  }
  text(c, '동선 · 시야 연구', 8 * k, H - 12 * k, 11 * k, '#ffffff');
}
function paintQueue(c: Ctx2, W: number, H: number, t: number, pick: number, gain: number, round: number, tierOnly: boolean) {
  const k = W / 256;
  c.fillStyle = NAVY_D;
  c.fillRect(0, 0, W, H);
  text(c, tierOnly ? '랭크 결과' : pick > 0 ? '영웅 선택' : '랭크 대기열', W / 2, 18 * k, 14 * k, '#ffffff', 'center');
  if (tierOnly) {
    const won = wonOf(round);
    text(c, won ? '+24 점' : '-18 점', W / 2, H * 0.4, 24 * k, won ? '#7bffb0' : '#ff8d8d', 'center');
    c.fillStyle = '#2a3158';
    c.fillRect(30 * k, H * 0.62, W - 60 * k, 12 * k);
    c.fillStyle = won ? '#7bffb0' : '#ffb0a8';
    c.fillRect(30 * k, H * 0.62, (W - 60 * k) * (0.52 + (won ? 0.2 : -0.14) * gain), 12 * k);
    text(c, '별빛 다이아 II', W / 2, H * 0.82, 12 * k, GOLD, 'center');
    return;
  }
  if (pick > 0) {
    for (let i = 0; i < 12; i++) {
      const x = 16 * k + (i % 6) * 38 * k;
      const y = 34 * k + Math.floor(i / 6) * 44 * k;
      c.fillStyle = HERO_COLORS[i];
      c.fillRect(x, y, 32 * k, 38 * k);
      if (i === Math.floor(pick * 11.99)) {
        c.strokeStyle = GOLD;
        c.lineWidth = 3 * k;
        c.strokeRect(x, y, 32 * k, 38 * k);
      }
      text(c, HEROES[i].slice(0, 2), x + 16 * k, y + 20 * k, 9 * k, '#ffffff', 'center');
    }
    return;
  }
  const cx = W / 2;
  const cy = H * 0.58;
  c.strokeStyle = CYAN;
  c.lineWidth = 5 * k;
  c.beginPath();
  c.arc(cx, cy, 26 * k, t * 3, t * 3 + 4.3);
  c.stroke();
  text(c, `${Math.floor(t * 3) % 100}초`, cx, cy, 12 * k, '#ffffff', 'center');
}
function paintAim(c: Ctx2, W: number, H: number, hits: number, score: boolean, speed: boolean) {
  const k = W / 256;
  c.fillStyle = '#10121c';
  c.fillRect(0, 0, W, H);
  c.strokeStyle = '#242838';
  c.lineWidth = 1;
  for (let i = 1; i < 10; i++) {
    c.beginPath();
    c.moveTo((W * i) / 10, 0);
    c.lineTo((W * i) / 10, H);
    c.moveTo(0, (H * i) / 10);
    c.lineTo(W, (H * i) / 10);
    c.stroke();
  }
  if (score) {
    text(c, '평균 반응 186ms', W / 2, H * 0.4, 20 * k, CYAN, 'center');
    text(c, `명중 ${Math.floor(hits)} / 36`, W / 2, H * 0.62, 14 * k, '#ffffff', 'center', false);
    return;
  }
  const i = Math.floor(hits);
  const u = hits - i;
  const x = (0.15 + 0.7 * (Math.sin(i * 2.4) * 0.5 + 0.5)) * W;
  const y = (0.2 + 0.6 * (Math.cos(i * 1.7) * 0.5 + 0.5)) * H;
  const r = (speed ? 9 : 13) * k * (1 - u * 0.35);
  for (const [s, col] of [[1, '#ff4e4e'], [0.65, '#ffffff'], [0.3, '#ff4e4e']] as const) {
    c.fillStyle = col;
    c.beginPath();
    c.arc(x, y, r * s, 0, Math.PI * 2);
    c.fill();
  }
  c.strokeStyle = '#7bffb0';
  c.lineWidth = 1.5 * k;
  c.beginPath();
  c.moveTo(W / 2 - 7 * k, H / 2);
  c.lineTo(W / 2 + 7 * k, H / 2);
  c.moveTo(W / 2, H / 2 - 7 * k);
  c.lineTo(W / 2, H / 2 + 7 * k);
  c.stroke();
  text(c, `명중 ${i}`, 8 * k, 14 * k, 12 * k, '#ffffff');
  text(c, speed ? '속도 2단계' : '속도 1단계', W - 8 * k, 14 * k, 11 * k, speed ? '#ff8d8d' : '#b8c2d8', 'right', false);
}
function paintDraft(c: Ctx2, W: number, H: number, placed: number, round: number, swapAt = -1, changed = false) {
  const k = W / 256;
  c.fillStyle = '#121838';
  c.fillRect(0, 0, W, H);
  text(c, '밴픽', W / 2, 13 * k, 12 * k, '#ffffff', 'center');
  text(c, '은하수', W * 0.2, 13 * k, 11 * k, '#7bbcff', 'center');
  text(c, rivalOf(round), W * 0.8, 13 * k, 11 * k, '#ff9c9c', 'center');
  const chip = (i: number, x: number, y: number, s: number) => {
    const shown = i < placed;
    c.fillStyle = shown ? HERO_COLORS[(i * 5 + round * 3 + 120) % 12] : '#2a3158';
    c.fillRect(x, y, s, s);
    if (shown) text(c, HEROES[(i * 5 + round * 3 + 120 + (changed && i === swapAt ? 2 : 0)) % 12].slice(0, 2), x + s / 2, y + s / 2, s * 0.32, '#ffffff', 'center');
    if (shown && i < 5) {
      c.strokeStyle = '#ff5a5a';
      c.lineWidth = 2 * k;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + s, y + s);
      c.stroke();
    }
  };
  for (let i = 0; i < 5; i++) chip(i, W * (i % 2 ? 0.56 : 0.06) + Math.floor(i / 2) * 26 * k, 26 * k, 22 * k);
  for (let i = 5; i < 10; i++) {
    const col = i % 2;
    chip(i, col ? W - 40 * k : 12 * k, 54 * k + Math.floor((i - 5) / 2) * 30 * k, 26 * k);
  }
}
function paintScout(c: Ctx2, W: number, H: number, round: number, line: number, compare: number, typed: number) {
  const k = W / 256;
  c.fillStyle = '#0e1426';
  c.fillRect(0, 0, W, H);
  text(c, `상대 분석: ${rivalOf(round)}`, 8 * k, 14 * k, 13 * k, '#ffffff');
  c.strokeStyle = '#2a3158';
  c.lineWidth = 1;
  c.strokeRect(10 * k, 28 * k, W * 0.55, H * 0.52);
  const pts = [0.3, 0.42, 0.36, 0.6, 0.54, 0.72, 0.8, 0.66];
  const draw = (arr: number[], col: string, e: number) => {
    c.strokeStyle = col;
    c.lineWidth = 2.4 * k;
    c.beginPath();
    arr.forEach((v, i) => {
      if (i / (arr.length - 1) > e) return;
      const x = 10 * k + (W * 0.55 * i) / (arr.length - 1);
      const y = 28 * k + H * 0.52 * (1 - v);
      if (i) c.lineTo(x, y);
      else c.moveTo(x, y);
    });
    c.stroke();
  };
  draw(pts, '#ff8d8d', line);
  draw(pts.map((v) => 1 - v * 0.8), '#7bbcff', compare);
  ['초반 교전', '밴 1순위', '시야 점수', '오브젝트'].forEach((s, i) => {
    text(c, s, W * 0.62, 36 * k + i * 22 * k, 10 * k, '#b8c2d8', 'left', false);
    c.fillStyle = '#2a3158';
    c.fillRect(W * 0.62, 43 * k + i * 22 * k, W * 0.34, 5 * k);
    c.fillStyle = i % 2 ? '#7bbcff' : '#ff8d8d';
    c.fillRect(W * 0.62, 43 * k + i * 22 * k, W * 0.34 * Math.min(1, line * (0.5 + 0.12 * i)), 5 * k);
  });
  text(c, '메모: ' + '두 번째 용 싸움 약함'.slice(0, Math.floor(typed * 11)), 10 * k, H - 16 * k, 11 * k, '#e8e8f0', 'left', false);
}

// =============================================================================================
// 연습용 게이밍 PC (scrimStation, 1 × 1).

function stationBits(g: THREE.Object3D, T: number, kb: V, mouse: V) {
  // The long mat, a keyboard with its lit rows, a mouse.
  part(g, rbox(0.76, 0.004, 0.3, 0.002), '#14151c', 0.08, T + 0.003, kb[2] - 0.01, { outline: false });
  part(g, rbox(0.34, 0.022, 0.13, 0.006), CHAR, kb[0], T + 0.015, kb[2]);
  for (let r = 0; r < 4; r++) ownLit(g, box(0.31, 0.003, 0.016), ['#ff4e7a', '#b05cff', '#4e9dff', '#3fd8e8'][r], kb[0], T + 0.028, kb[2] - 0.042 + r * 0.028);
  part(g, rbox(0.058, 0.03, 0.105, 0.024), '#191a20', mouse[0], T + 0.018, mouse[2]);
  ownLit(g, box(0.012, 0.004, 0.024), CYAN, mouse[0], T + 0.034, mouse[2] - 0.026);
}

function station(g: THREE.Group, out: Built) {
  const T = SS.top;
  const Z = SS.deskZ;
  part(g, rbox(0.94, 0.04, 0.62, 0.012), CARBON, 0, T - 0.02, Z);
  part(g, box(0.9, 0.004, 0.58), '#1d1f26', 0, T + 0.001, Z, { outline: false });
  for (const sx of [-1, 1]) {
    part(g, box(0.06, T - 0.05, 0.42), BLACK, sx * 0.42, (T - 0.05) / 2, Z);
    part(g, rbox(0.1, 0.02, 0.56, 0.008), VIOLET, sx * 0.42, 0.01, Z, { outline: false });
  }
  const strip = ownLit(g, box(0.88, 0.012, 0.008), VIOLET, 0, T - 0.05, Z + 0.3);
  // A tower with a window and its fans, by the left leg, low.
  part(g, rbox(0.2, 0.44, 0.42, 0.012), '#17181e', -0.26, 0.24, Z - 0.02);
  const lit = ownLit(g, box(0.004, 0.36, 0.34), '#2a1a5e', -0.156, 0.24, Z - 0.02);
  for (const y of [0.13, 0.33]) part(g, ring(0.05, 0.006), CYAN, -0.152, y, Z - 0.02, { ry: Math.PI / 2, outline: false });
  // The monitor: thin, high refresh, a sticker of what it's clocked at.
  const MZ = -0.28;
  part(g, cyl(0.1, 0.12, 0.012, 16), BLACK, 0, T + 0.008, MZ);
  part(g, box(0.04, 0.2, 0.02), BLACK, 0, T + 0.1, MZ - 0.03);
  part(g, rbox(0.66, 0.39, 0.03, 0.008), '#101116', 0, T + 0.31, MZ);
  const scr = liveScreen(g, 0.63, 0.355, 256, 144, 0, T + 0.312, MZ + 0.017);
  label(g, '360Hz', 0.08, 0.016, 0.26, T + 0.122, MZ + 0.017, '#101116', '#ffd65a');
  stationBits(g, T, SS.kb, SS.mouse);
  // Headset on its stand, a can of the team's sponsor, a spiral notebook.
  const stand = group(g, 0.37, T, -0.24);
  part(stand, cyl(0.05, 0.055, 0.012, 14), BLACK, 0, 0.006, 0);
  rod(stand, v3(0, 0, 0), v3(0, 0.26, 0), 0.008, BLACK);
  const parked = headset(stand);
  parked.position.set(0, 0.17, 0);
  parked.scale.setScalar(0.72);
  part(g, cyl(0.03, 0.03, 0.12, 12), '#2a56d0', -0.37, T + 0.06, -0.26);
  ownLit(g, box(0.05, 0.03, 0.002), '#ffe05a', -0.37, T + 0.07, -0.229);
  const N0 = SS.note;
  part(g, box(0.18, 0.012, 0.24), PAPER, N0[0], T + 0.008, N0[2]);
  part(g, box(0.012, 0.015, 0.24), BLACK, N0[0] - 0.09, T + 0.009, N0[2], { outline: false });
  const pen = penMesh(g);
  racingChair(g, SS.seat);
  const worn = headset(g);
  worn.visible = false;
  const tablet = group(g);
  part(tablet, rbox(0.26, 0.012, 0.18, 0.01), BLACK, 0, 0, 0);
  const tabPic = liveScreen(tablet, 0.24, 0.16, 256, 180, 0, 0.008, 0, 0, -Math.PI / 2);
  // Someone of the team sat at it when the player isn't: not at every desk.
  const mate = lazy(() => {
    const seed = seedOf(g);
    const f = person(g, LOOKS[`mate${(seed % 3) + 1}`], SS.seat[0], SS.seat[2], Math.PI, seed % 2 ? 'female' : 'male', SS.seat[1], seed);
    headset(f.head).position.set(0, 0.015, 0);
    return f;
  });
  const spots: Record<string, Spot> = {
    scrimPractice: seatAt(g, 'egScrim', SS.seat),
    soloQueue: seatAt(g, 'egSolo', SS.seat),
    proGamer_reflexTraining: seatAt(g, 'egReflex', SS.seat),
    proGamer_positionStudy: seatAt(g, 'egPosition', SS.seat),
    proGamer_draftStrategy: standAt(g, 'egPick', 0.28, 0.82),
  };
  spots['*'] = spots.scrimPractice;
  let seed = -1;
  let manned = false;
  drive(g, out, spots, (now, N, t, H) => {
    if (seed < 0) {
      seed = seedOf(g);
      manned = seed % 3 === 0;
    }
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const round = (N?.b.n ?? Math.floor(t / 24 + seed * 0.37)) + seed;
    // The headset on their head, following the lean; on its stand otherwise.
    const wearing = (n.hs ?? 0) > 0.5 && !!N;
    worn.visible = wearing;
    parked.visible = !wearing;
    if (wearing && N) {
      const lean = N.key.lean ?? 0.05;
      worn.position.set(SS.seat[0], SS.seat[1] + 0.44 * H * Math.cos(lean), SS.seat[2] - 0.44 * H * Math.sin(lean));
      worn.scale.setScalar(H / 1.6);
      worn.rotation.y = 0;
    }
    at(pen, P.pen ?? null);
    at(tablet, P.tablet ?? null);
    if (P.tablet) tablet.rotation.set(0.7, 0, 0);
    if (P.tablet) tabPic.draw(`${q(n.picks, 2)}|${round}`, (c) => paintDraft(c, 256, 180, n.picks ?? 0, round));
    const teammate = manned && !now;
    if (teammate) {
      const f = mate.get();
      f.root.visible = true;
      f.armL(vec(add(SS.kb, 0, 0.03, 0.02)));
      const wig = 0.025 * Math.sin(t * (3 + (seed % 5)));
      f.armR(v3(SS.mouse[0] + wig, SS.mouse[1] + 0.04, SS.mouse[2]));
      f.head.rotation.x = 0.15;
    } else mate.hide();
    // What's on the monitor.
    const fps = Math.floor(t * 6);
    if (N && n.drill) scr.draw(`a${q(n.hits, 1)}|${q(n.speed, 1)}`, (c) => paintAim(c, 256, 144, n.hits ?? 0, false, (n.speed ?? 0) > 0.5));
    else if (N && (n.score ?? 0) > 0.5) scr.draw('as', (c) => paintAim(c, 256, 144, n.hits ?? 0, true, false));
    else if (N && (n.map ?? 0) > 0.5) scr.draw(`m${q(n.routes)}|${q(n.wards, 1)}|${fps >> 1}`, (c) => paintMap(c, 256, 144, n.routes ?? 0, n.wards ?? 0, t));
    else if (N && (n.draftShown ?? 0) > 0.5) scr.draw(`d${q(n.picks, 2)}|${round}`, (c) => paintDraft(c, 256, 144, n.picks ?? 0, round));
    else if (N && now === 'soloQueue' && (n.queue ?? 0) > 0.5) scr.draw(`q${fps}`, (c) => paintQueue(c, 256, 144, t, 0, 0, round, false));
    else if (N && now === 'soloQueue' && (n.pick ?? 0) > 0) scr.draw(`p${q(n.pick)}`, (c) => paintQueue(c, 256, 144, t, n.pick ?? 0, 0, round, false));
    else if (N && now === 'soloQueue' && (n.ended ?? 0) > 0.5) scr.draw(`r${q(n.gain)}|${round}`, (c) => paintQueue(c, 256, 144, t, 0, n.gain ?? 0, round, true));
    else if (N) scr.draw(`g${fps}|${round}|${q(n.ended, 1)}`, (c) => paintGame(c, 256, 144, { g: n.g ?? 0, fight: (n.fight ?? 0) > 0.5, ended: (n.ended ?? 0) > 0.5, round, t }));
    else if (teammate) {
      const u = (t / 24 + seed * 0.37) % 1;
      scr.draw(`g${Math.floor(t * 2)}|${round}`, (c) => paintGame(c, 256, 144, { g: u, fight: u > 0.45 && u < 0.7, ended: u > 0.94, round, t }));
    } else scr.draw('idle', (c) => paintIdle(c, 256, 144, TEAM));
    const on = !!N || teammate;
    setLit(strip, on ? ((n.fight ?? 0) > 0.5 ? '#ff4e7a' : VIOLET) : '#2a2440');
    setLit(lit, on ? '#6a3fd0' : '#2a1a5e');
  });
  out.work = marker(g, SS.kb[0], SS.kb[1], SS.kb[2]);
}

// =============================================================================================
// 경기 분석 스크린 (replayScreen, 2 × 1).

function replayScreen(g: THREE.Group, out: Built) {
  const T = RS.top;
  // The low desk, the wall screen over it on two posts, its sound bar; a whiteboard strip of today's notes.
  part(g, rbox(1.92, 0.04, 0.62, 0.012), CARBON, 0, T - 0.02, -0.04);
  for (const sx of [-1, 1]) part(g, box(0.06, T - 0.04, 0.5), BLACK, sx * 0.88, (T - 0.04) / 2, -0.04);
  part(g, box(1.7, 0.2, 0.03), '#1d1f26', 0, 0.42, -0.32);
  for (const sx of [-1, 1]) part(g, box(0.05, 1.45, 0.04), BLACK, sx * 0.8, 0.82 + 0.5, -0.4);
  part(g, rbox(RS.screenW + 0.05, RS.screenH + 0.05, 0.05, 0.012), '#0c0d12', 0, RS.screenY, RS.screenZ - 0.03);
  const scr = liveScreen(g, RS.screenW, RS.screenH, 512, 290, 0, RS.screenY, RS.screenZ);
  part(g, rbox(1.3, 0.05, 0.05, 0.02), BLACK, 0, RS.screenY - RS.screenH / 2 - 0.08, RS.screenZ - 0.01);
  // The laptop, a stack of printed reports, the remote, the laser's cradle, a notebook.
  part(g, rbox(0.34, 0.016, 0.24, 0.008), '#c9cdd4', RS.laptop[0], T + 0.008, RS.laptop[2] + 0.04);
  const lid = group(g, RS.laptop[0], T + 0.016, RS.laptop[2] - 0.07);
  lid.rotation.x = -0.28;
  part(lid, rbox(0.34, 0.22, 0.012, 0.006), '#c9cdd4', 0, 0.11, 0);
  const lap = liveScreen(lid, 0.31, 0.19, 256, 158, 0, 0.11, 0.008);
  for (let i = 0; i < 4; i++) part(g, box(0.22, 0.01, 0.3), PAPER, 0.66 + i * 0.006, T + 0.006 + i * 0.01, -0.2 - i * 0.004);
  const homeRemote = group(g, RS.remote[0], T + 0.01, RS.remote[2]);
  part(homeRemote, rbox(0.04, 0.016, 0.13, 0.006), BLACK, 0, 0, 0);
  const N0 = RS.note;
  part(g, box(0.26, 0.012, 0.32), PAPER, N0[0], T + 0.008, N0[2] - 0.06);
  const noteMarks = liveScreen(g, 0.24, 0.3, 120, 150, N0[0], T + 0.016, N0[2] - 0.06, 0, -Math.PI / 2);
  const pen = penMesh(g);
  // The remote and laser in the coach's hands.
  const remote = group(g);
  part(remote, rbox(0.04, 0.13, 0.02, 0.006), BLACK, 0, 0, 0);
  const pointer = group(g);
  part(pointer, cyl(0.01, 0.01, 0.12, 8), '#b8bec6', 0, 0.02, 0);
  const beam = ownLit(g, cyl(0.002, 0.002, 1, 5), '#ff3a3a', 0, 0, 0);
  const dot = ownLit(g, ball(0.018), '#ff3a3a', 0, 0, 0);
  // Low stools, out only when the coach has the players in; two players on them.
  const stools = group(g);
  for (const s of [RS.stoolL, RS.stoolR]) {
    part(stools, cyl(0.16, 0.155, 0.05, 16), CHAR, s[0], s[1] - 0.025, s[2]);
    part(stools, cyl(0.02, 0.024, s[1] - 0.05, 10), CHROME, s[0], (s[1] - 0.05) / 2, s[2], { outline: false });
    part(stools, cyl(0.15, 0.17, 0.02, 14), BLACK, s[0], 0.01, s[2]);
  }
  const p1 = lazy(() => person(g, LOOKS.mate1, RS.stoolL[0], RS.stoolL[2], Math.PI, 'male', RS.stoolL[1], 21));
  const p2 = lazy(() => person(g, LOOKS.mate3, RS.stoolR[0], RS.stoolR[2], Math.PI, 'female', RS.stoolR[1], 22));
  const seatStool = group(g, RS.seat[0], 0, RS.seat[2]);
  part(seatStool, cyl(0.17, 0.165, 0.05, 16), CHAR, 0, RS.seat[1] - 0.025, 0);
  part(seatStool, cyl(0.02, 0.024, RS.seat[1] - 0.05, 10), CHROME, 0, (RS.seat[1] - 0.05) / 2, 0, { outline: false });
  part(seatStool, cyl(0.16, 0.18, 0.02, 14), BLACK, 0, 0.01, 0);
  const spots: Record<string, Spot> = {
    reviewReplay: standAt(g, 'egReview', -1.15, 0.72),
    proGamer_studyPros: seatAt(g, 'egStudy', RS.seat),
    proGamer_scoutOpponent: seatAt(g, 'egScout', RS.seat),
  };
  spots['*'] = spots.reviewReplay;
  let seed = -1;
  const d3 = new THREE.Vector3();
  const drawLine: Array<[number, number]> = [];
  for (let i = 0; i <= 18; i++) drawLine.push([-0.5 + i / 18, -0.3 + 0.55 * Math.sin((i / 18) * Math.PI)]);
  drive(g, out, spots, (now, N, t) => {
    if (seed < 0) seed = seedOf(g);
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const round = (N?.b.n ?? 0) + seed;
    const fps = Math.floor(t * 8);
    const review = (n.review ?? 0) > 0.5;
    stools.visible = review;
    seatStool.visible = now === 'proGamer_studyPros' || now === 'proGamer_scoutOpponent';
    homeRemote.visible = !P.remote;
    at(remote, P.remote ?? null);
    if (P.remote) remote.rotation.x = 0.6;
    at(pen, P.pen ?? null);
    at(pointer, P.pointer ?? null);
    const laser = (n.laser ?? 0) > 0.5 && !!P.pointer;
    beam.visible = dot.visible = laser;
    if (laser && P.pointer) {
      const S = onScreen(n.lx ?? 0, n.ly ?? 0);
      dot.position.set(S[0], S[1], S[2] + 0.005);
      const a = vec(P.pointer);
      d3.subVectors(dot.position, a);
      const L = d3.length();
      beam.position.copy(a).addScaledVector(d3, 0.5);
      beam.scale.set(1, L, 1);
      beam.quaternion.setFromUnitVectors(UP, d3.normalize());
      pointer.quaternion.copy(beam.quaternion);
    }
    // The two players at the review, on their stools, nodding when asked.
    if (review) {
      for (const [i, p] of [p1, p2].entries()) {
        const f = p.get();
        f.root.visible = true;
        f.armL(null);
        f.armR((n.nodders ?? 0) > 0.5 && i === 1 ? v3(RS.stoolR[0] - 0.2, 1.22 + 0.03 * Math.sin(t * 5), RS.stoolR[2] - 0.2) : null);
        f.head.rotation.x = -0.06 + ((n.nodders ?? 0) > 0.5 ? 0.09 * Math.sin(t * 4 + i * 2) : 0);
      }
    } else {
      p1.hide();
      p2.hide();
    }
    // The big screen.
    const key = `${now ?? 'idle'}|${round}|${q(n.g)}|${q(n.compare)}|${q(n.line)}|${q(n.typed)}|${q(n.drawn)}|${q(n.stopped, 1)}|${q(n.playing, 1)}|${q(n.rewind, 1)}|${(n.playing ?? 0) > 0.5 ? fps : 0}`;
    if (now === 'proGamer_scoutOpponent') scr.draw(key, (c) => paintScout(c, 512, 290, round, n.line ?? 0, n.compare ?? 0, n.typed ?? 0));
    else if (N)
      scr.draw(key, (c) => {
        paintGame(c, 512, 290, { g: n.g ?? 0, fight: (n.fight ?? 0) > 0.5, ended: false, round, t: (n.stopped ?? 0) > 0.5 ? 40 : (n.rewind ?? 0) > 0.5 ? -t * 2 : t });
        if (now === 'proGamer_studyPros') {
          c.fillStyle = 'rgba(5,8,22,0.7)';
          c.fillRect(0, 262, 512, 28);
          text(c, `프로 리그 다시 보기 · ${rivalOf(round)} 대 ${rivalOf(round + 2)}`, 12, 276, 15, '#ffffff');
        }
        if ((n.rewind ?? 0) > 0.5) text(c, '◀◀ 되감기', 256, 145, 32, '#ffffff', 'center');
        if ((n.stopped ?? 0) > 0.5) text(c, '일시 정지', 20, 60, 20, '#ffe08a');
        const d = n.drawn ?? 0;
        if (d > 0) {
          // What the coach draws over it.
          c.strokeStyle = '#ffe05a';
          c.lineWidth = 6;
          c.lineCap = 'round';
          c.beginPath();
          const upto = Math.floor(d * (drawLine.length - 1));
          for (let i = 0; i <= upto; i++) {
            const X = (0.5 + drawLine[i][0] * 0.48) * 512;
            const Y = (0.5 - drawLine[i][1] * 0.48) * 290;
            if (i) c.lineTo(X, Y);
            else c.moveTo(X, Y);
          }
          c.stroke();
        }
      });
    else scr.draw('idle', (c) => paintIdle(c, 512, 290, '경기 분석실'));
    lap.draw(now === 'proGamer_scoutOpponent' ? key : 'x', (c) => {
      if (now === 'proGamer_scoutOpponent') paintScout(c, 256, 158, round, n.line ?? 0, n.compare ?? 0, n.typed ?? 0);
      else paintIdle(c, 256, 158, '전력 분석');
    });
    noteMarks.draw(`${q(n.written)}|${q(n.mark)}`, (c) => {
      c.fillStyle = PAPER;
      c.fillRect(0, 0, 120, 150);
      const w = Math.max(n.written ?? 0, n.mark ?? 0);
      c.strokeStyle = '#334';
      c.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        if (i / 6 > w) break;
        c.beginPath();
        c.moveTo(10, 18 + i * 21);
        c.lineTo(10 + 94 * Math.min(1, (w - i / 6) * 6), 18 + i * 21);
        c.stroke();
      }
    });
  });
  out.work = marker(g, 0, T + 0.02, 0.1);
}

// =============================================================================================
// 밴픽 보드 (egDraftBoard, 2 × 1).

const heroChip = (i: number) =>
  painted(`egChip${i}`, 64, 64, (c) => {
    c.fillStyle = HERO_COLORS[i % 12];
    c.fillRect(0, 0, 64, 64);
    c.fillStyle = 'rgba(255,255,255,0.18)';
    c.beginPath();
    c.arc(32, 26, 18, 0, Math.PI * 2);
    c.fill();
    text(c, HEROES[i % 12].slice(0, 2), 32, 44, 22, '#ffffff', 'center');
  });

function draftBoard(g: THREE.Group, out: Built) {
  const Z = DB.z;
  part(g, rbox(1.92, 1.72, 0.05, 0.012), '#b8bec6', 0, 1.38, Z - 0.03);
  picture(g, painted('egBoard', 512, 454, (c) => {
    c.fillStyle = NAVY;
    c.fillRect(0, 0, 512, 454);
    text(c, '밴픽 보드', 256, 26, 28, '#ffffff', 'center');
    text(c, '은하수', 136, 60, 20, '#7bbcff', 'center');
    text(c, '상대', 376, 60, 20, '#ff9c9c', 'center');
    c.strokeStyle = 'rgba(255,255,255,0.3)';
    c.beginPath();
    c.moveTo(256, 48);
    c.lineTo(256, 440);
    c.stroke();
    const cell = 36;
    const toPx = (p: V) => [256 + (p[0] / 1.86) * 512, 454 - ((p[1] - 0.54) / 1.64) * 454] as const;
    for (const side of [0, 1])
      for (let i = 0; i < 10; i++) {
        const [x, y] = toPx(DB.slot(side, i));
        c.fillStyle = i < 5 ? '#46223a' : '#23305c';
        c.fillRect(x - cell / 2, y - cell / 2, cell, cell);
      }
    text(c, '금지', 26, 98, 14, '#ff9c9c', 'left', false);
    text(c, '선택', 26, 180, 14, '#7bbcff', 'left', false);
  }), 1.86, 1.64, 0, 1.38, Z, '#ffffff');
  // The tray along its foot, the heroes in it; two side legs; markers.
  part(g, box(1.8, 0.03, 0.14), '#8a9098', 0, DB.tray[1] - 0.02, DB.tray[2] - 0.02);
  const CHIP = 0.098;
  for (let i = 0; i < 7; i++) picture(g, heroChip(i), CHIP, CHIP, DB.tray[0] - 0.3 + i * 0.1, DB.tray[1] + 0.05, DB.tray[2] - 0.055, '#ffffff');
  for (const sx of [-1, 1]) {
    part(g, box(0.06, 0.6, 0.06), BLACK, sx * 0.9, 0.3, Z - 0.03);
    part(g, rbox(0.14, 0.02, 0.5, 0.008), BLACK, sx * 0.9, 0.012, Z + 0.05);
  }
  for (let i = 0; i < 3; i++) part(g, cyl(0.009, 0.009, 0.11, 8), ['#d0433a', '#3d6fd0', '#2e7d32'][i], 0.7 + i * 0.04, DB.tray[1] + 0.005, DB.tray[2], { rx: Math.PI / 2, outline: false });
  // A chip in each slot of both sides, shown as they're placed.
  const chips = Array.from({ length: 10 }, (_, i) => picture(g, heroChip((i * 5) % 12), CHIP, CHIP, DB.slot(i % 2, i)[0], DB.slot(i % 2, i)[1], DB.slot(i % 2, i)[2], '#ffffff'));
  const stroke = ownLit(g, box(0.66, 0.012, 0.004), '#d0433a', 0, 1.55, Z + 0.05);
  const carried = group(g);
  const carriedPic = picture(carried, heroChip(0), CHIP, CHIP, 0, 0, 0.006, '#ffffff');
  const coach = lazy(() => person(g, LOOKS.coach, 1.12, 0.62, Math.PI + 0.5, 'male', undefined, 31));
  const spots: Record<string, Spot> = { egPlanDraft: standAt(g, 'egDraft', 0, 0.62), egDraftDebate: standAt(g, 'egDebate', -0.35, 0.68) };
  spots['*'] = spots.egPlanDraft;
  let seed = -1;
  drive(g, out, spots, (now, N, t) => {
    if (seed < 0) seed = seedOf(g);
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const round = (N?.b.n ?? 0) + seed;
    const placed = N ? n.placed ?? 0 : 6;
    chips.forEach((m, i) => {
      m.visible = i < Math.floor(placed + 0.001) && !(i === 7 && (n.swap ?? 0) > 0.5);
      const hero = (i * 5 + round * 3 + (i === 7 && (n.changed ?? 0) > 0.5 ? 2 : 0) + 120) % 12;
      const mat = m.material as THREE.MeshBasicMaterial;
      const map = heroChip(hero);
      if (mat.map !== map) {
        mat.map = map;
        mat.needsUpdate = true;
      }
    });
    stroke.visible = (n.strike ?? 0) > 0.05;
    stroke.scale.x = Math.max(0.01, n.strike ?? 0);
    at(carried, P.magnet ?? null);
    if (P.magnet) {
      const i = Math.floor(placed);
      const mat = carriedPic.material as THREE.MeshBasicMaterial;
      const hero = now === 'egDraftDebate' ? ((7 * 5 + round * 3 + ((n.swap ?? 0) > 0.5 ? 2 : 0) + 120) % 12) : (i * 5 + round * 3 + 120) % 12;
      const map = heroChip(hero);
      if (mat.map !== map) {
        mat.map = map;
        mat.needsUpdate = true;
      }
    }
    if ((n.coach ?? 0) > 0.5) {
      const f = coach.get();
      f.root.visible = true;
      f.armL(null);
      const S = DB.slot(0, 7);
      f.armR((n.coachPoint ?? 0) > 0.5 ? v3(S[0] + 0.5, S[1] + 0.02 * Math.sin(t * 3), S[2] + 0.22) : null);
      f.head.rotation.x = (n.nod ?? 0) > 0.5 ? 0.08 + 0.1 * Math.sin(t * 5) : 0.04;
    } else coach.hide();
  });
  out.work = marker(g, 0, 1.3, Z + 0.05);
}

// =============================================================================================
// 팬 방송 세트 (egStreamDesk, 2 × 1).

function streamDesk(g: THREE.Group, out: Built) {
  const T = SD.top;
  part(g, rbox(1.94, 0.045, 0.66, 0.012), '#f1eef8', 0, T - 0.022, -0.1);
  for (const sx of [-1, 1]) part(g, box(0.06, T - 0.04, 0.5), '#d4cfe2', sx * 0.88, (T - 0.04) / 2, -0.1);
  // A wall of lit hexagons behind it, foam round them, plush mascots on the shelf.
  part(g, box(1.94, 1.5, 0.03), '#2b2346', 0, 1.26, -0.47);
  const hexes = Array.from({ length: 16 }, (_, i) => {
    const m = ownLit(g, cyl(0.1, 0.1, 0.012, 6), VIOLET, -0.72 + (i % 6) * 0.29 + (Math.floor(i / 6) % 2) * 0.14, 1.36 + Math.floor(i / 6) * 0.25, -0.445);
    m.rotation.x = Math.PI / 2;
    return m;
  });
  part(g, box(1.7, 0.03, 0.14), '#d4cfe2', 0, 1.14, -0.4);
  for (const [x, col] of [[-0.56, '#ffb0c8'], [-0.34, '#9cd0ff'], [0.42, '#ffe08a']] as const) {
    part(g, ball(0.07), col, x, 1.22, -0.4);
    for (const s of [-1, 1]) part(g, ball(0.024), col, x + s * 0.045, 1.285, -0.4, { outline: false });
    for (const s of [-1, 1]) part(g, ball(0.008), '#2b2b30', x + s * 0.022, 1.235, -0.34, { outline: false });
  }
  // On the desk: the main monitor, the chat monitor, keyboard, mouse, a can.
  const monitor = (x: number, ry: number) => {
    const m = group(g, x, T, -0.26, ry);
    part(m, cyl(0.1, 0.12, 0.012, 16), BLACK, 0, 0.006, 0);
    part(m, box(0.04, 0.16, 0.02), BLACK, 0, 0.08, -0.02);
    part(m, rbox(0.56, 0.33, 0.03, 0.008), '#101116', 0, 0.28, 0);
    return m;
  };
  const main = liveScreen(monitor(0.42, -0.14), 0.53, 0.3, 256, 145, 0, 0.28, 0.017);
  const chat = liveScreen(monitor(-0.42, 0.14), 0.53, 0.3, 256, 145, 0, 0.28, 0.017);
  stationBits(g, T, SD.kb, SD.mouse);
  // The ring light on its stand, the webcam in its middle; the mic on a boom from the desk's edge.
  const R = group(g, 0, T, -0.12);
  part(R, cyl(0.09, 0.1, 0.012, 16), BLACK, 0, 0.006, 0);
  rod(R, v3(0, 0, 0), v3(0, 0.54, 0), 0.01, BLACK);
  const ringMat = new THREE.MeshBasicMaterial({ color: '#5a5a62' });
  const ringM = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.014, 8, 28), ringMat);
  ringM.userData.ownGeometry = ringM.userData.ownMaterial = true;
  ringM.position.set(0, 0.54, 0);
  R.add(ringM);
  part(R, rbox(0.07, 0.04, 0.04, 0.01), BLACK, 0, 0.54, 0.01);
  const camLed = ownLit(R, ball(0.006), '#4a2222', 0.025, 0.552, 0.032);
  rod(g, v3(0.78, T, -0.28), v3(0.58, T + 0.42, -0.04), 0.009, BLACK);
  rod(g, v3(0.58, T + 0.42, -0.04), v3(0.14, T + 0.42, 0.26), 0.008, BLACK);
  part(g, rbox(0.05, 0.11, 0.05, 0.022), '#2b2b30', 0.12, T + 0.37, 0.28);
  // ON AIR, a framed gold plaque of the channel's first hundred thousand, a can.
  const air = liveScreen(g, 0.3, 0.1, 128, 44, 0.76, 1.84, -0.45);
  picture(g, painted('egPlaque', 96, 128, (c) => {
    c.fillStyle = GOLD;
    c.fillRect(0, 0, 96, 128);
    c.fillStyle = NAVY_D;
    c.fillRect(8, 8, 80, 112);
    text(c, '구독자', 48, 44, 14, GOLD, 'center');
    text(c, '10만', 48, 72, 22, '#ffffff', 'center');
  }), 0.2, 0.26, -0.76, 1.8, -0.45);
  const canHome = group(g);
  part(canHome, cyl(0.03, 0.03, 0.12, 12), '#2a56d0', 0, 0.06, 0);
  racingChair(g, SD.seat, '#d05ca8');
  const worn = headset(g, '#f1eef8');
  worn.visible = false;
  const spots: Record<string, Spot> = { egFanStream: seatAt(g, 'egStream', SD.seat) };
  spots['*'] = spots.egFanStream;
  let seed = -1;
  drive(g, out, spots, (_now, N, t, H) => {
    if (seed < 0) seed = seedOf(g);
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const round = (N?.b.n ?? 0) + seed;
    const live = (n.live ?? 0) > 0.5;
    ringMat.color.set(live ? '#fff4d8' : '#5a5a62');
    setLit(camLed, live ? '#ff3a3a' : '#4a2222');
    hexes.forEach((m, i) => setLit(m, live ? `hsl(${(250 + 40 * Math.sin(t * 0.8 + i * 0.5) + ((n.alert ?? 0) > 0.3 ? 80 : 0)) | 0},80%,62%)` : '#3a3060'));
    at(canHome, P.can ?? null, add(SD.can, 0, -0.02, 0));
    if (P.can) canHome.position.y -= 0.06;
    if ((n.hs ?? 0) > 0.5 && N) {
      worn.visible = true;
      const lean = N.key.lean ?? 0.05;
      worn.position.set(SD.seat[0], SD.seat[1] + 0.44 * H * Math.cos(lean), SD.seat[2] - 0.44 * H * Math.sin(lean));
      worn.scale.setScalar(H / 1.6);
    } else worn.visible = false;
    air.draw(live ? 'on' : 'off', (c) => {
      c.fillStyle = live ? '#d01f2f' : '#3a1f22';
      c.fillRect(0, 0, 128, 44);
      text(c, '방송 중', 64, 22, 22, live ? '#ffffff' : '#7a5a5e', 'center');
    });
    const fps = Math.floor(t * 5);
    main.draw(N ? `g${(n.gameOn ?? 0) > 0.5 ? fps : 0}|${round}|${q(n.g)}|${q(n.viewers, 0.02)}|${q(n.alert, 2)}` : 'idle', (c) => {
      if (!N) return paintIdle(c, 256, 145, '방송 준비');
      paintGame(c, 256, 145, { g: n.g ?? 0, fight: (n.fight ?? 0) > 0.5, ended: false, round, t });
      c.fillStyle = 'rgba(0,0,0,0.6)';
      c.fillRect(4, 124, 76, 18);
      text(c, `시청 ${Math.round(n.viewers ?? 0)}`, 42, 133, 11, '#ffffff', 'center');
      if ((n.alert ?? 0) > 0.3) {
        c.fillStyle = 'rgba(208,92,168,0.9)';
        c.fillRect(30, 44, 196, 54);
        text(c, '응원 별 1,000개 고마워요!', 128, 71, 15, '#ffffff', 'center');
      }
    });
    chat.draw(`${N ? Math.floor(t * ((n.chatting ?? 0) > 0.5 ? 3 : 1.2)) : -1}`, (c) => {
      c.fillStyle = '#16142a';
      c.fillRect(0, 0, 256, 145);
      text(c, '채팅', 8, 11, 12, '#c8b8ff');
      if (!N) return;
      const LINES = ['오늘도 왔어요', '방금 그 판 대박', 'ㅋㅋㅋㅋ', '손목 괜찮아요?', '결승 응원해요', '구도 좋다', '영웅 뭐 해요?', '은하수 파이팅', '채팅 읽어 주세요'];
      const NAMES = ['별빛팬', '라면왕', '달토', '은하1호', '구름이', '곰돌'];
      const top = Math.floor(t * ((n.chatting ?? 0) > 0.5 ? 3 : 1.2));
      for (let i = 0; i < 6; i++) {
        const k = top + i;
        text(c, `${NAMES[k % NAMES.length]}: ${LINES[(k * 4) % LINES.length]}`, 8, 30 + i * 20, 12, i === 5 ? '#ffffff' : '#a8a4c8', 'left', false);
      }
    });
  });
  out.work = marker(g, SD.kb[0], SD.kb[1], SD.kb[2]);
}

// =============================================================================================
// 트로피·후원사 벽 (egTrophyWall, 3 × 1).

function cupMesh(g: THREE.Object3D, s = 1, col = GOLD): THREE.Group {
  const c = group(g);
  c.scale.setScalar(s);
  part(c, cyl(0.075, 0.09, 0.05, 14), BLACK, 0, 0.025, 0);
  part(c, cyl(0.018, 0.03, 0.11, 10), col, 0, 0.105, 0, { outline: false });
  part(c, cyl(0.1, 0.03, 0.17, 16), col, 0, 0.245, 0);
  part(c, cyl(0.1, 0.1, 0.008, 16), '#8a6a1c', 0, 0.33, 0, { outline: false });
  for (const sx of [-1, 1]) {
    const h = part(c, ring(0.05, 0.008), col, sx * 0.112, 0.26, 0, { outline: false });
    h.rotation.y = 0;
  }
  return c;
}
function trophyWall(g: THREE.Group, out: Built) {
  const CT = 0.9;
  // A low cabinet with a counter; a glass case over it lit from within; the sponsors' banner on top.
  part(g, rbox(2.92, CT - 0.02, 0.5, 0.012), NAVY_D, 0, (CT - 0.02) / 2, -0.2);
  part(g, rbox(2.96, 0.04, 0.54, 0.01), WOOD, 0, CT, -0.2);
  for (let i = 0; i < 4; i++) part(g, box(0.66, 0.68, 0.01), NAVY, -1.05 + i * 0.7, 0.46, 0.056, { outline: false });
  part(g, box(2.92, 1.1, 0.03), NAVY_D, 0, 1.47, -0.45);
  ownLit(g, box(2.8, 0.012, 0.012), '#ffe9b8', 0, 1.98, -0.4);
  part(g, box(2.84, 0.025, 0.28), '#c9cdd4', 0, 1.54, -0.3);
  // The big cup's plinth, the row of small ones.
  part(g, rbox(0.3, 0.3, 0.3, 0.01), '#2a2f55', TW.cupHome[0], TW.cupHome[1] - 0.15, TW.cupHome[2]);
  label(g, '별무리 리그 우승', 0.28, 0.05, TW.cupHome[0], TW.cupHome[1] - 0.12, TW.cupHome[2] + 0.152, '#2a2f55', '#ffe9b8');
  const homeCup = cupMesh(g, 1.15);
  for (const [i, x] of [-1.25, -0.85, -0.45, 0.45, 0.85, 1.25].entries()) {
    const s = 0.5 + ((i * 3) % 4) * 0.08;
    const cc = cupMesh(g, s, i === 2 ? '#c5ccd4' : i === 4 ? '#c98a4a' : GOLD);
    cc.position.set(x, 1.552, -0.32);
  }
  for (let i = 0; i < 4; i++) {
    const x = -1.32 + i * 0.28;
    picture(g, painted(`egPhoto${i}`, 110, 80, (c) => {
      c.fillStyle = ['#2c3f6a', '#49306a', '#2e5560', '#6a3f30'][i];
      c.fillRect(0, 0, 110, 80);
      c.fillStyle = '#ffffff';
      for (let k = 0; k < 5; k++) {
        c.beginPath();
        c.arc(16 + k * 20, 48, 7, 0, Math.PI * 2);
        c.fill();
        c.fillRect(11 + k * 20, 54, 10, 22);
      }
      text(c, `${2021 + i} 시즌`, 55, 16, 13, '#ffe9b8', 'center');
    }), 0.25, 0.18, x, 1.2, -0.43);
  }
  // 4 sponsors over the case, 4 again on the side panel.
  picture(g, painted('egSponsors', 1024, 170, (c) => {
    c.fillStyle = '#0a0f22';
    c.fillRect(0, 0, 1024, 170);
    text(c, TEAM, 512, 44, 44, GOLD, 'center');
    const colors = ['#4e9dff', '#d0c8ff', '#7bffb0', '#ff9c6a'];
    SPONSORS.forEach((s, i) => {
      c.fillStyle = colors[i];
      c.fillRect(30 + i * 247, 86, 225, 66);
      text(c, s, 142 + i * 247, 119, 32, '#0a0f22', 'center');
    });
  }), 2.9, 0.48, 0, 2.28, -0.43);
  part(g, box(2.94, 0.52, 0.02), BLACK, 0, 2.28, -0.445);
  for (const sx of [-1, 1]) part(g, box(0.05, 2.3, 0.05), BLACK, sx * 1.44, 1.2, -0.43);
  // The product table: a pyramid of cans; a cloth; a tripod with its camera, on the near side, thin and low on the frame.
  for (let r = 0; r < 3; r++)
    for (let i = 0; i < 3 - r; i++) part(g, cyl(0.03, 0.03, 0.11, 12), '#2a56d0', TW.can[0] + 0.14 + (i - (2 - r) / 2) * 0.07, CT + 0.075 + r * 0.115, TW.can[2]);
  const homeCan = group(g, TW.can[0], CT + 0.02, TW.can[2]);
  part(homeCan, cyl(0.03, 0.03, 0.11, 12), '#2a56d0', 0, 0.055, 0);
  ownLit(homeCan, box(0.05, 0.03, 0.002), '#ffe05a', 0, 0.06, 0.031);
  const cloth = group(g, TW.cloth[0], TW.cloth[1], TW.cloth[2]);
  part(cloth, rbox(0.14, 0.015, 0.1, 0.006), '#fafafa', 0, 0.02, 0, { outline: false });
  const heldCan = group(g);
  part(heldCan, cyl(0.03, 0.03, 0.11, 12), '#2a56d0', 0, 0, 0);
  ownLit(heldCan, box(0.05, 0.03, 0.002), '#ffe05a', 0, 0.005, 0.031);
  ownLit(heldCan, box(0.002, 0.03, 0.05), '#ffe05a', 0.031, 0.005, 0);
  const T3 = TW.tripod;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    rod(g, v3(T3[0], T3[1] - 0.14, T3[2]), v3(T3[0] + Math.cos(a) * 0.24, 0.01, T3[2] + Math.sin(a) * 0.24), 0.012, BLACK);
  }
  part(g, rbox(0.14, 0.1, 0.12, 0.012), BLACK, T3[0], T3[1], T3[2], { ry: -0.7 });
  part(g, cyl(0.04, 0.04, 0.08, 12), '#191a20', T3[0] - 0.065, T3[1], T3[2] - 0.06, { rx: Math.PI / 2, rz: 0, ry: -0.7 });
  const flash = ownLit(g, box(0.1, 0.06, 0.03), '#3a3a42', T3[0], T3[1] + 0.09, T3[2]);
  const heldCup = cupMesh(g, 1.15);
  const wiper = group(g);
  part(wiper, rbox(0.11, 0.02, 0.09, 0.006), '#fafafa', 0, 0, 0, { outline: false });
  const glint = ownLit(g, ball(0.016), '#ffffff', 0, 0, 0);
  const spots: Record<string, Spot> = { egSponsorShoot: standAt(g, 'egSponsor', -0.8, 0.6), egPolishCup: standAt(g, 'egPolish', 0, 0.6) };
  spots['*'] = spots.egPolishCup;
  drive(g, out, spots, (_now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    homeCan.visible = !P.can;
    at(heldCan, P.can ?? null);
    at(homeCup, (n.off ?? 0) > 0.5 ? null : TW.cupHome);
    at(heldCup, P.cup ?? null);
    at(wiper, P.cloth ?? null);
    cloth.visible = !P.cloth;
    setLit(flash, (n.shot ?? 0) > 0.05 ? '#ffffff' : '#3a3a42');
    const spark = (n.sparkle ?? 0) > 0.5;
    glint.visible = spark;
    if (spark) {
      const a = t * 4;
      glint.position.set(TW.table[0] + 0.1 * Math.cos(a), TW.table[1] + 0.3, TW.table[2] + 0.1);
      glint.scale.setScalar(0.5 + 0.5 * Math.abs(Math.sin(t * 9)));
    }
  });
  out.work = marker(g, 0, CT + 0.02, -0.04);
}

// =============================================================================================
// 손목 관리 코너 (egPhysio, 2 × 2).

function physioCorner(g: THREE.Group, out: Built) {
  const T = PC.top;
  // A mat under it all; a padded treatment table; a stool either side.
  part(g, rbox(1.92, 0.012, 1.92, 0.01), '#3b6b6a', 0, 0.006, 0, { outline: false });
  part(g, rbox(1.14, 0.06, 0.66, 0.02), '#e8eef2', 0.0, T - 0.03, 0.0);
  for (const [x, z] of [[-0.5, -0.26], [0.5, -0.26], [-0.5, 0.26], [0.5, 0.26]] as const) part(g, cyl(0.022, 0.022, T - 0.06, 10), STEEL, x, (T - 0.06) / 2, z, { outline: false });
  part(g, box(1.02, 0.02, 0.5), '#b6c0c8', 0, 0.22, 0);
  for (let i = 0; i < 3; i++) part(g, rbox(0.26, 0.1, 0.22, 0.012), ['#3f8d8b', '#d9d2c3', '#5b6f8a'][i], -0.32 + i * 0.32, 0.29, 0);
  const stool = (x: number, z: number, top: number) => {
    const s = group(g, x, 0, z);
    part(s, cyl(0.16, 0.155, 0.05, 16), '#3f8d8b', 0, top - 0.025, 0);
    part(s, cyl(0.02, 0.024, top - 0.05, 10), CHROME, 0, (top - 0.05) / 2, 0, { outline: false });
    part(s, cyl(0.15, 0.17, 0.02, 14), BLACK, 0, 0.01, 0);
  };
  stool(PC.seat[0], PC.seat[2], PC.seat[1]);
  // The wrist pad, the hot pack and its warmer, a tray of grip balls and rubber bands, cream.
  part(g, rbox(0.28, 0.05, 0.2, 0.024), '#7b8c9c', PC.pad[0], T + 0.025, PC.pad[2]);
  const pack = group(g);
  part(pack, rbox(0.16, 0.024, 0.11, 0.012), '#e0643a', 0, 0, 0);
  part(g, rbox(0.26, 0.15, 0.2, 0.014), '#c9cdd4', PC.warm[0], T + 0.075, PC.warm[2] - 0.08);
  const warmLed = ownLit(g, box(0.05, 0.016, 0.003), '#ffb04a', PC.warm[0], T + 0.1, PC.warm[2] + 0.021);
  part(g, cyl(0.1, 0.09, 0.03, 18), '#b6c0c8', PC.ball[0], T + 0.015, PC.ball[2]);
  const ballHome = part(g, ball(0.034), '#ff7a59', PC.ball[0], T + 0.05, PC.ball[2]);
  part(g, ball(0.03), '#3d8bd0', PC.ball[0] + 0.05, T + 0.045, PC.ball[2] - 0.03);
  part(g, cyl(0.026, 0.03, 0.09, 12), '#f4efe1', -0.48, T + 0.045, -0.22);
  part(g, cyl(0.016, 0.016, 0.03, 8), '#2d6f6d', -0.48, T + 0.105, -0.22, { outline: false });
  // A chart on a low standing frame by the side.
  picture(g, painted('egHandChart', 240, 320, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 240, 320);
    text(c, '경기 전 손 풀기', 120, 24, 22, '#264', 'center');
    ['① 손 털기 20초', '② 합장 스트레칭', '③ 손가락 당기기', '④ 손목 돌리기', '⑤ 쥐었다 펴기'].forEach((s, i) => {
      c.fillStyle = '#d7efe9';
      c.fillRect(14, 50 + i * 52, 46, 46);
      c.fillStyle = SKIN;
      c.beginPath();
      c.ellipse(37, 75 + i * 52, 12, 16, 0, 0, Math.PI * 2);
      c.fill();
      text(c, s, 70, 73 + i * 52, 15, '#333', 'left', false);
    });
  }), 0.46, 0.62, 0.82, 0.96, -0.72, '#ffffff', -0.3);
  rod(g, v3(0.82, 0, -0.74), v3(0.82, 0.66, -0.74), 0.012, STEEL);
  part(g, rbox(0.24, 0.02, 0.24, 0.008), BLACK, 0.82, 0.012, -0.74);
  const physio = lazy(() => person(g, LOOKS.physio, PC.physio[0], PC.physio[1], 0, 'female', undefined, 41));
  const held = part(g, ball(0.034), '#ff7a59', 0, 0, 0);
  const spots: Record<string, Spot> = { egWristCare: seatAt(g, 'egWrist', PC.seat), egHandDrill: standAt(g, 'egWarm', PC.stand[0], PC.stand[1]) };
  spots['*'] = spots.egWristCare;
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    setLit(warmLed, (n.warmer ?? 0) > 0.5 ? '#ff5a2a' : '#ffb04a');
    at(pack, (n.warmer ?? 0) > 0.5 ? add(PC.pad, 0.06, 0.04, 0.02) : null, add(PC.warm, 0, 0.17, -0.08));
    ballHome.visible = !P.ballAt;
    held.visible = !!P.ballAt;
    if (P.ballAt) {
      held.position.set(P.ballAt[0], P.ballAt[1], P.ballAt[2]);
      held.scale.set(1 + 0.2 * (n.squeeze ?? 0), 1 - 0.3 * (n.squeeze ?? 0), 1 + 0.2 * (n.squeeze ?? 0));
    }
    if ((n.care ?? 0) > 0.5 && now) {
      const f = physio.get();
      f.root.visible = true;
      const pad = PC.pad;
      if ((n.press ?? 0) > 0.5) {
        const a = Math.sin(t * 3);
        f.armL(v3(pad[0] + 0.11 + 0.02 * a, pad[1] + 0.02, pad[2] + 0.02));
        f.armR(v3(pad[0] - 0.03 - 0.02 * a, pad[1] + 0.03, pad[2] + 0.03));
      } else if ((n.fingers ?? 0) > 0.5) {
        f.armL(v3(pad[0] + 0.09, pad[1] + 0.02, pad[2]));
        f.armR(v3(pad[0] + 0.02, pad[1] + 0.035 + 0.01 * Math.sin(t * 4), pad[2] + 0.1));
      } else if ((n.warmer ?? 0) > 0.5) {
        f.armL(v3(pad[0] + 0.1, pad[1] + 0.05, pad[2] + 0.02));
        f.armR(null);
      } else {
        f.armL(null);
        f.armR(null);
      }
      f.head.rotation.x = (n.nod ?? 0) > 0.5 ? 0.1 + 0.08 * Math.sin(t * 5) : 0.3;
    } else physio.hide();
  });
  out.work = marker(g, PC.pad[0], PC.pad[1], PC.pad[2]);
}

// =============================================================================================
// 장비 점검대 (egGearBench, 2 × 1).

function gearBench(g: THREE.Group, out: Built) {
  const T = GB.top;
  part(g, rbox(1.94, 0.05, 0.72, 0.012), WOOD, 0, T - 0.025, -0.08);
  for (const sx of [-1, 1]) part(g, box(0.06, T - 0.05, 0.6), BLACK, sx * 0.9, (T - 0.05) / 2, -0.08);
  part(g, box(1.8, 0.02, 0.56), '#4d5057', 0, 0.26, -0.08);
  for (let i = 0; i < 3; i++) part(g, rbox(0.42, 0.14, 0.34, 0.012), ['#2b5fb0', '#c9cdd4', '#b0562b'][i], -0.56 + i * 0.56, 0.34, -0.08);
  // A low pegboard with the spare keyboards, mice and cables on it (under 1.5 m, it sits in front of the room).
  part(g, box(1.9, 0.6, 0.03), '#8f97a0', 0, T + 0.34, -0.43);
  for (let i = 0; i < 18; i++) for (let j = 0; j < 5; j++) part(g, box(0.008, 0.008, 0.002), '#5a616a', -0.85 + i * 0.1, T + 0.1 + j * 0.11, -0.413, { outline: false });
  for (const [x, y, col] of [[-0.62, 0.42, CHAR], [-0.62, 0.22, '#d8d8e0']] as const) {
    part(g, rbox(0.42, 0.14, 0.022, 0.006), col, x, T + y, -0.4);
    for (let r = 0; r < 3; r++) part(g, box(0.38, 0.012, 0.003), col === CHAR ? '#4e9dff' : '#a0a0b0', x, T + y - 0.035 + r * 0.035, -0.387, { outline: false });
  }
  for (let i = 0; i < 4; i++) {
    part(g, rbox(0.06, 0.1, 0.03, 0.024), ['#191a20', '#d8d8e0', '#191a20', '#b05cff'][i], 0.0 + i * 0.13, T + 0.42, -0.4);
    rod(g, v3(i * 0.13, T + 0.47, -0.4), v3(i * 0.13 + 0.02, T + 0.2, -0.39), 0.004, '#30323a');
  }
  for (let i = 0; i < 3; i++) part(g, ring(0.06, 0.006), ['#2a2c33', '#c9352e', '#3d6fa0'][i], 0.66 + i * 0.1, T + 0.34, -0.4, { outline: false });
  // A keyboard opened on the mat, one cap off; the puller; the switch tester with its read-out; a magnifier lamp.
  part(g, rbox(0.58, 0.004, 0.32, 0.002), '#14282c', GB.board[0], T + 0.003, GB.board[2], { outline: false });
  part(g, rbox(0.42, 0.028, 0.16, 0.006), CHAR, GB.board[0], T + 0.019, GB.board[2]);
  for (let r = 0; r < 4; r++)
    for (let i = 0; i < 12; i++) {
      if (r === 1 && i === 8) continue;
      part(g, box(0.026, 0.012, 0.026), '#e4e4ec', GB.board[0] - 0.176 + i * 0.032, T + 0.038, GB.board[2] - 0.05 + r * 0.033, { outline: false });
    }
  const capKey = part(g, box(0.026, 0.012, 0.026), '#ff7a59', GB.board[0] + 0.08, T + 0.038, GB.board[2] - 0.017, { outline: false });
  ownLit(g, box(0.012, 0.006, 0.012), '#3ee07a', GB.board[0] + 0.08, T + 0.032, GB.board[2] - 0.017);
  const puller = group(g);
  rod(puller, v3(0, 0.0, 0), v3(0.01, 0.06, 0.01), 0.005, CHROME);
  rod(puller, v3(0.01, 0.06, 0.01), v3(0.02, 0.1, 0.03), 0.008, '#c9352e');
  const T1 = GB.tester;
  part(g, rbox(0.22, 0.05, 0.16, 0.008), BLACK, T1[0], T + 0.025, T1[2]);
  const pinS = part(g, box(0.03, 0.03, 0.03), '#f5c84a', T1[0], T + 0.065, T1[2] + 0.02, { outline: false });
  const read = liveScreen(g, 0.14, 0.05, 112, 40, T1[0], T + 0.052, T1[2] - 0.05, 0, -0.9);
  rod(g, v3(0.82, T, -0.3), v3(0.66, T + 0.3, -0.1), 0.01, STEEL);
  rod(g, v3(0.66, T + 0.3, -0.1), v3(0.48, T + 0.32, 0.04), 0.008, STEEL);
  part(g, cyl(0.075, 0.075, 0.016, 18), '#3a3a42', 0.48, T + 0.3, 0.04);
  ownLit(g, cyl(0.065, 0.065, 0.004, 18), '#fff4d8', 0.48, T + 0.288, 0.04);
  // The rule the mouse is dragged along for the distance to turn, with its screen.
  const R = GB.rule;
  part(g, box(0.5, 0.004, 0.16), '#14151c', R[0], T + 0.003, R[2], { outline: false });
  picture(g, painted('egRule', 256, 32, (c) => {
    c.fillStyle = '#f4f2ea';
    c.fillRect(0, 0, 256, 32);
    c.fillStyle = '#222';
    for (let i = 0; i <= 25; i++) c.fillRect(i * 10 + 2, 0, 1, i % 5 ? 10 : 18);
  }), 0.5, 0.05, R[0], T + 0.006, R[2] - 0.11, '#ffffff', 0, -Math.PI / 2);
  const mouse = group(g);
  part(mouse, rbox(0.058, 0.03, 0.105, 0.024), '#191a20', 0, 0.018, 0);
  const pen = penMesh(g);
  const stool = group(g, GB.seat[0], 0, GB.seat[2]);
  part(stool, cyl(0.17, 0.165, 0.05, 16), CHAR, 0, GB.seat[1] - 0.025, 0);
  part(stool, cyl(0.02, 0.024, GB.seat[1] - 0.05, 10), CHROME, 0, (GB.seat[1] - 0.05) / 2, 0, { outline: false });
  part(stool, cyl(0.16, 0.18, 0.02, 14), BLACK, 0, 0.01, 0);
  const cap = part(g, box(0.026, 0.012, 0.026), '#f5c84a', 0, 0, 0, { outline: false });
  const spots: Record<string, Spot> = { egTuneKeyboard: seatAt(g, 'egTune', GB.seat), egMeasureSens: seatAt(g, 'egSens', GB.seat) };
  spots['*'] = spots.egTuneKeyboard;
  drive(g, out, spots, (now, N) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    capKey.visible = (n.capOff ?? 0) < 0.5;
    at(puller, P.puller ?? null, add(GB.puller, 0, -0.03, 0));
    at(cap, P.cap ?? null);
    pinS.position.y = T + 0.065 - 0.012 * (n.pressed ?? 0);
    at(mouse, P.mouse ?? null, add(GB.rule, -0.2, 0, 0));
    mouse.position.y = T;
    at(pen, P.pen ?? null);
    read.draw(now === 'egMeasureSens' ? `s${q(n.cm)}` : `k${q(n.pressed, 8)}`, (c) => {
      c.fillStyle = '#071a10';
      c.fillRect(0, 0, 112, 40);
      if (now === 'egMeasureSens') text(c, `${(n.cm ?? 0).toFixed(1)}cm`, 56, 20, 20, '#5ef09a', 'center');
      else text(c, `${Math.round(35 + 20 * (n.pressed ?? 0))}g`, 56, 20, 20, '#5ef09a', 'center');
    });
  });
  out.work = marker(g, GB.board[0], GB.board[1], GB.board[2]);
}

// =============================================================================================
// 경기 무대 부스 (egStageBooth, 5 × 3).

function stageBooth(g: THREE.Group, out: Built) {
  const D = SB.deck;
  const deck = group(g, 0, D, 0);
  // The deck with its lit edge and sign, three steps at the left; a truss with lamps over it.
  part(g, rbox(4.9, D, 2.0, 0.012), '#20233a', 0, D / 2, -0.44);
  part(g, box(4.88, 0.004, 1.98), '#2b2f4d', 0, D + 0.002, -0.44, { outline: false });
  const edge = ownLit(g, box(4.88, 0.016, 0.008), CYAN, 0, D - 0.02, 0.565);
  picture(g, painted('egStageSign', 900, 48, (c) => {
    c.fillStyle = '#20233a';
    c.fillRect(0, 0, 900, 48);
    text(c, `${GAME} 리그 · 결승 무대 · 후원 ${SPONSORS[0]} ${SPONSORS[2]}`, 450, 25, 28, '#ffe9b8', 'center');
  }), 3.4, 0.18, 0, 0.14, 0.565, '#ffffff');
  for (let i = 0; i < 3; i++) part(g, box(0.56, 0.1 * (i + 1), 0.22), '#32364f', -2.15, 0.05 * (i + 1), 1.01 - i * 0.2);
  for (const sx of [-1, 1]) {
    part(g, box(0.08, 2.75, 0.08), BLACK, sx * 2.42, 1.375, -1.34);
  }
  part(g, box(4.92, 0.09, 0.09), BLACK, 0, 2.72, -1.34);
  // The LED wall behind.
  part(g, rbox(4.4, 1.9, 0.06, 0.01), '#07080e', 0, 1.68, -1.42);
  const led = liveScreen(g, 4.3, 1.82, 768, 325, 0, 1.68, -1.385);
  const lamps = [-1.7, -0.6, 0.6, 1.7].map((x) => {
    part(g, cyl(0.06, 0.08, 0.14, 12), BLACK, x, 2.62, -1.25, { rx: 0.5 });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.2, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#ffeec0', transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide }));
    cone.userData.ownGeometry = cone.userData.ownMaterial = true;
    cone.position.set(x, 1.5, -0.7);
    cone.rotation.x = 0.42;
    cone.visible = false;
    g.add(cone);
    return cone;
  });
  // The booth: glass at the sides and over the back, frames, the team's panels.
  const Bz = -0.15;
  for (const sx of [-1, 1]) {
    glass(deck, 1.5, 1.45, sx * 1.62, 0.76, Bz, Math.PI / 2);
    part(deck, box(0.04, 1.5, 0.04), BLACK, sx * 1.62, 0.75, Bz + 0.74);
    part(deck, box(0.04, 1.5, 0.04), BLACK, sx * 1.62, 0.75, Bz - 0.74);
    part(deck, box(0.04, 0.04, 1.5), BLACK, sx * 1.62, 1.5, Bz);
  }
  glass(deck, 3.24, 1.45, 0, 0.76, Bz - 0.74);
  part(deck, box(3.28, 0.04, 0.04), BLACK, 0, 1.5, Bz - 0.74);
  // The long desk, five monitors, keys, mice; a chair each.
  const dT = SB.kb[1] - D - 0.015;
  part(deck, rbox(3.16, 0.04, 0.5, 0.012), CARBON, 0, dT - 0.02, -0.52);
  for (const x of [-1.5, 1.5]) part(deck, box(0.06, dT - 0.04, 0.42), BLACK, x, (dT - 0.04) / 2, -0.52);
  const seatsX = [-1.2, SB.mates[0], 0, SB.mates[1], 1.2];
  const screens = seatsX.map((x) => {
    part(deck, cyl(0.09, 0.1, 0.012, 14), BLACK, x, dT + 0.006, -0.68);
    part(deck, box(0.03, 0.14, 0.02), BLACK, x, dT + 0.08, -0.7);
    part(deck, rbox(0.54, 0.31, 0.024, 0.006), '#101116', x, dT + 0.28, -0.68);
    return liveScreen(deck, 0.51, 0.285, 192, 108, x, dT + 0.28, -0.667);
  });
  for (const x of seatsX) {
    stationBits(deck, dT, [x - 0.1, 0, SB.kb[2]], [x + 0.26, 0, SB.mouse[2]]);
    racingChair(deck, [x, SB.seat[1] - D, SB.seat[2]], x < 0 ? '#3d6fd0' : VIOLET);
  }
  // The plug the check goes to, the mic in the hand.
  part(deck, rbox(0.3, 0.1, 0.1, 0.012), BLACK, SB.cable[0], SB.cable[1] - D, SB.cable[2]);
  const plugLed = ownLit(deck, ball(0.008), '#ff5a5a', SB.cable[0] + 0.1, SB.cable[1] - D + 0.03, SB.cable[2] + 0.05);
  const plug = group(g);
  part(plug, rbox(0.03, 0.03, 0.05, 0.008), '#c9cdd4', 0, 0, 0);
  const mic = group(g);
  part(mic, cyl(0.016, 0.012, 0.14, 10), BLACK, 0, -0.07, 0);
  part(mic, ball(0.026), '#8f97a0', 0, 0.01, 0);
  const worn = headset(g);
  worn.visible = false;
  // The two teammates sat with you.
  const mates = SB.mates.map((x, i) =>
    lazy(() => {
      const f = person(deck, LOOKS[`mate${i + 1}`], x, SB.seat[2], Math.PI, i ? 'female' : 'male', SB.seat[1] - D, 50 + i);
      headset(f.head).position.set(0, 0.015, 0);
      return f;
    }),
  );
  // Fans on a low bench at the front: their backs to the camera, light sticks going.
  part(g, rbox(1.72, SB.bench - 0.02, 0.36, 0.02), '#3a3f5c', -1.55, (SB.bench - 0.02) / 2, SB.benchZ);
  part(g, rbox(1.72, SB.bench - 0.02, 0.36, 0.02), '#3a3f5c', 1.55, (SB.bench - 0.02) / 2, SB.benchZ);
  const fans = SB.fans.map((x, i) => lazy(() => person(g, LOOKS[`fan${i + 1}`], x, SB.benchZ, Math.PI, i % 2 ? 'female' : 'male', SB.bench, 60 + i)));
  const sticks = SB.fans.map((_, i) => {
    const m = ownLit(g, cyl(0.016, 0.016, 0.24, 8), ['#7bffb0', '#ffb0e0', '#9cd0ff', '#ffe08a'][i], 0, 0, 0);
    m.visible = false;
    return m;
  });
  const spots: Record<string, Spot> = { egShowMatch: standAt(g, 'egShow', -1.7, 0.55), egStageTest: standAt(g, 'egCheck', -0.4, 0.62) };
  spots['*'] = spots.egShowMatch;
  let seed = -1;
  drive(g, out, spots, (now, N, t, H) => {
    if (seed < 0) seed = seedOf(g);
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const round = (N?.b.n ?? 0) + seed;
    const live = (n.live ?? 0) > 0.5;
    const won = wonOf(round);
    const fps = Math.floor(t * 6);
    setLit(edge, live ? `hsl(${(t * 80) % 360 | 0},85%,60%)` : '#2f6a78');
    lamps.forEach((c) => (c.visible = (n.spot ?? 0) > 0.5));
    // The screens: the game if it's on, a test pattern while checking.
    const check = (n.check ?? 0) > 0.5;
    led.draw(`${now ?? 'x'}|${live ? fps : 0}|${q(n.g)}|${round}|${q(n.ended, 1)}|${q(n.ping)}|${q(n.mic, 1)}`, (c) => {
      if (live) {
        if ((n.playing ?? 0) > 0.5 || (n.ended ?? 0) > 0.5) paintGame(c, 768, 325, { g: n.g ?? 0, fight: (n.fight ?? 0) > 0.5, ended: (n.ended ?? 0) > 0.5, round, t });
        else {
          paintIdle(c, 768, 325, `은하수 게이밍 대 ${rivalOf(round)}`);
          text(c, '결승 진출전', 384, 40, 40, GOLD, 'center');
        }
      } else if (check) {
        c.fillStyle = '#0a0e1c';
        c.fillRect(0, 0, 768, 325);
        const bars = ['#ff5a5a', '#ffd65a', '#5aff7a', '#5ad8ff', '#7a5aff', '#ff5ad0'];
        bars.forEach((col, i) => {
          c.fillStyle = col;
          c.fillRect(i * 128, 0, 128, 150);
        });
        text(c, `핑 ${Math.round(40 - 34 * (n.ping ?? 0))} ms`, 384, 214, 50, '#ffffff', 'center');
        text(c, (n.mic ?? 0) > 0.5 ? '마이크 테스트 하나 둘' : '화면·장비 점검', 384, 280, 28, '#b8c2d8', 'center', false);
      } else paintIdle(c, 768, 325, '오늘의 경기를 기다리고 있어요');
    });
    screens.forEach((s, i) => {
      s.draw(live && ((n.playing ?? 0) > 0.5 || (n.ended ?? 0) > 0.5) ? `g${fps + i * 3}|${round}|${q(n.ended, 1)}` : check ? `t${q(n.plugged, 1)}|${q(n.ping)}` : 'idle', (c) => {
        if (live && ((n.playing ?? 0) > 0.5 || (n.ended ?? 0) > 0.5)) paintGame(c, 192, 108, { g: n.g ?? 0, fight: (n.fight ?? 0) > 0.5, ended: (n.ended ?? 0) > 0.5, round, t: t + i });
        else paintIdle(c, 192, 108, check ? (((n.plugged ?? 0) > 0.5 || i !== 3) ? '연결됨' : '연결 안 됨') : TEAM);
      });
    });
    setLit(plugLed, (n.plugged ?? 0) > 0.5 || !check ? '#3ee07a' : '#ff5a5a');
    at(plug, P.plug ?? null);
    at(mic, P.mic ?? null);
    if ((n.hs ?? 0) > 0.5 && N) {
      worn.visible = true;
      const lean = N.key.lean ?? 0.05;
      worn.position.set(SB.seat[0], SB.seat[1] + 0.44 * H * Math.cos(lean), SB.seat[2] - 0.44 * H * Math.sin(lean));
      worn.scale.setScalar(H / 1.6);
    } else worn.visible = false;
    mates.forEach((m, i) => {
      if ((n.mates ?? 0) > 0.5) {
        const f = m.get();
        f.root.visible = true;
        const x = SB.mates[i];
        const ended = (n.ended ?? 0) > 0.5;
        if (ended && won) {
          const b = 0.05 * Math.sin(t * 9 + i);
          f.armL(v3(x + 0.22, SB.seat[1] - D + 0.9 + b, SB.seat[2] - 0.1));
          f.armR(v3(x - 0.22, SB.seat[1] - D + 0.9 - b, SB.seat[2] - 0.1));
        } else {
          f.armL(v3(x - 0.1, SB.kb[1] - D + 0.03, SB.kb[2] + 0.02));
          f.armR(v3(x + 0.26 + 0.03 * Math.sin(t * 4 + i * 2) * (n.playing ?? 0), SB.mouse[1] - D + 0.04, SB.mouse[2]));
        }
        f.head.rotation.x = 0.16;
      } else m.hide();
    });
    const cheer = n.cheer ?? 0;
    fans.forEach((m, i) => {
      if (live) {
        const f = m.get();
        f.root.visible = true;
        f.armL(null);
        const up = 0.25 + 0.5 * cheer;
        const x = SB.fans[i];
        const sway = 0.09 * Math.sin(t * (2 + cheer * 4) + i * 1.7);
        const to = v3(x - 0.18 + sway, SB.bench + 0.42 + up, SB.benchZ - 0.16);
        f.armR(to);
        const st = sticks[i];
        st.visible = true;
        st.position.copy(to).add(v3(0, 0.12, 0));
        st.rotation.z = -sway * 1.4;
        f.head.rotation.x = -0.12;
      } else {
        m.hide();
        sticks[i].visible = false;
      }
    });
  });
  out.work = marker(g, SB.kb[0], SB.kb[1], SB.kb[2]);
}

// =============================================================================================
// 게임단 차량 (teamVan, 2 × 1): pointing to +x, drives off for the match and comes back after.

function teamVan(g: THREE.Group, out: Built) {
  const van = group(g);
  const BODY = '#1d2554';
  // Long body, its windscreen and windows, the team's stripes and name, a roof rack of kit.
  part(van, rbox(3.5, 1.15, 1.64, 0.1), BODY, 0, 1.0, 0);
  part(van, rbox(0.75, 0.62, 1.58, 0.1), BODY, 1.45, 0.72, 0);
  part(van, box(0.03, 0.56, 1.42), '#a8d0e8', 1.76, 1.26, 0, { rz: -0.22 });
  for (const sz of [-1, 1]) {
    for (const [x, w] of [[1.14, 0.46], [0.42, 0.8], [-0.5, 0.8], [-1.28, 0.6]] as const) part(van, box(w, 0.4, 0.015), '#a8d0e8', x, 1.33, sz * 0.825, { outline: false });
    picture(van, painted('egVanSide', 1000, 220, (c) => {
      c.fillStyle = BODY;
      c.fillRect(0, 0, 1000, 220);
      c.fillStyle = VIOLET;
      c.beginPath();
      c.moveTo(0, 170);
      c.lineTo(1000, 60);
      c.lineTo(1000, 120);
      c.lineTo(0, 220);
      c.fill();
      c.fillStyle = CYAN;
      c.beginPath();
      c.moveTo(0, 150);
      c.lineTo(1000, 40);
      c.lineTo(1000, 56);
      c.lineTo(0, 166);
      c.fill();
      text(c, TEAM, 500, 72, 62, '#ffffff', 'center');
      text(c, `후원 ${SPONSORS[0]}`, 830, 160, 30, GOLD, 'center');
    }), 3.3, 0.66, 0, 0.77, sz * 0.828, '#ffffff', sz > 0 ? 0 : Math.PI);
  }
  // Wheels, lamps, grille, rack.
  const wheels = [-1.15, 1.2].flatMap((x) =>
    [-1, 1].map((sz) => {
      const w = group(van, x, 0.3, sz * 0.76);
      part(w, cyl(0.3, 0.3, 0.2, 18), '#1a1a1f', 0, 0, 0, { rx: Math.PI / 2 });
      part(w, cyl(0.16, 0.16, 0.21, 12), '#c3cad0', 0, 0, 0, { rx: Math.PI / 2, outline: false });
      return w;
    }),
  );
  for (const sz of [-1, 1]) {
    ownLit(van, box(0.02, 0.1, 0.22), '#fff4d0', 1.83, 0.8, sz * 0.58);
    ownLit(van, box(0.02, 0.1, 0.2), '#ff5a5a', -1.76, 0.82, sz * 0.6);
  }
  part(van, box(0.02, 0.2, 0.72), BLACK, 1.83, 0.66, 0, { outline: false });
  for (const sz of [-1, 1]) rod(van, v3(-1.3, 1.6, sz * 0.66), v3(1.0, 1.6, sz * 0.66), 0.018, CHROME);
  for (let i = 0; i < 3; i++) part(van, rbox(0.5, 0.2, 0.9, 0.04), ['#2b2f7a', '#32364f', '#c9352e'][i], -0.9 + i * 0.68, 1.72, 0);
  // Kit by the door when it's parked: a flight case and a bag.
  const kit = group(g);
  part(kit, rbox(0.56, 0.34, 0.36, 0.02), '#30323a', -0.6, 0.17, 1.14);
  for (const sx of [-1, 1]) part(kit, box(0.02, 0.34, 0.37), CHROME, -0.6 + sx * 0.28, 0.17, 1.14, { outline: false });
  label(kit, '은하수 장비', 0.3, 0.06, -0.6, 0.2, 1.325, '#30323a', '#ffe9b8');
  part(kit, rbox(0.46, 0.26, 0.26, 0.1), '#2b2f7a', -0.05, 0.13, 1.14);
  let state: 'parked' | 'ready' | 'leaving' | 'gone' | 'back' = 'parked';
  let since = 0;
  let travel = 0;
  let returnFrom = 1;
  out.away = (gone, t) => {
    if (gone && (state === 'parked' || state === 'back')) {
      state = 'ready';
      since = t;
    } else if (!gone && (state === 'ready' || state === 'leaving' || state === 'gone')) {
      returnFrom = travel;
      state = 'back';
      since = t;
    }
    if (state === 'ready' && t - since > 1.2) {
      state = 'leaving';
      since = t;
    }
    if (state === 'leaving') {
      travel = Math.min(1, (t - since) / 5) ** 2;
      if (travel === 1) state = 'gone';
    } else if (state === 'back') {
      travel = returnFrom * (1 - Math.min(1, (t - since) / 6)) ** 2;
      if (travel === 0) state = 'parked';
    }
    van.position.x = travel * 18;
    van.visible = state !== 'gone';
    kit.visible = state === 'parked';
    if (state === 'leaving' || state === 'back') wheels.forEach((w) => (w.rotation.z = -travel * 60));
  };
}

// =============================================================================================
// 구단 로고 월 (egLogoWall, 2 × 1; 2026-11-05, the layout audit): the club's name and its galaxy mark on a navy panel, lit from
// below, the sponsors' names under it; what greets you at the team house's door instead of fans' chairs.

function logoWall(g: THREE.Group, W: number) {
  part(g, box(W - 0.04, 2.2, 0.06), NAVY, 0, 1.2, -0.46);
  picture(g, painted('egLogoWall', 512, 400, (c) => {
    c.fillStyle = NAVY;
    c.fillRect(0, 0, 512, 400);
    // The mark: a swirl of stars in a ring.
    c.strokeStyle = CYAN;
    c.lineWidth = 10;
    c.beginPath();
    c.arc(256, 130, 86, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = VIOLET;
    c.lineWidth = 14;
    c.beginPath();
    for (let i = 0; i <= 60; i++) {
      const a = i * 0.16;
      const r = 8 + i * 1.2;
      const x = 256 + Math.cos(a) * r;
      const y = 130 + Math.sin(a) * r * 0.7;
      if (i) c.lineTo(x, y);
      else c.moveTo(x, y);
    }
    c.stroke();
    c.fillStyle = '#ffffff';
    for (const [x, y] of [[214, 92], [300, 110], [240, 170], [290, 168], [256, 130]]) {
      c.beginPath();
      c.arc(x, y, 6, 0, Math.PI * 2);
      c.fill();
    }
    text(c, TEAM, 256, 270, 52, '#ffffff', 'center');
    text(c, 'GALAXY GAMING · 프로게임단', 256, 314, 22, CYAN, 'center', false);
    text(c, SPONSORS.join('  ·  '), 256, 370, 20, GOLD, 'center', false);
  }), W - 0.2, 1.72, 0, 1.3, -0.425);
  // The light strip at the foot of the panel.
  const strip = part(g, box(W - 0.1, 0.03, 0.04), CYAN, 0, 0.12, -0.42, { outline: false, material: new THREE.MeshBasicMaterial({ color: CYAN }) });
  strip.userData.ownMaterial = true;
}

export const BUILDERS: Record<string, Builder> = {
  scrimStation(g, _W, _D, _c, _def, _ctx, out) {
    station(g, out);
  },
  replayScreen(g, _W, _D, _c, _def, _ctx, out) {
    replayScreen(g, out);
  },
  teamVan(g, _W, _D, _c, _def, _ctx, out) {
    teamVan(g, out);
  },
  egLogoWall(g, W) {
    logoWall(g, W);
  },
  egDraftBoard(g, _W, _D, _c, _def, _ctx, out) {
    draftBoard(g, out);
  },
  egStreamDesk(g, _W, _D, _c, _def, _ctx, out) {
    streamDesk(g, out);
  },
  egTrophyWall(g, _W, _D, _c, _def, _ctx, out) {
    trophyWall(g, out);
  },
  egPhysio(g, _W, _D, _c, _def, _ctx, out) {
    physioCorner(g, out);
  },
  egGearBench(g, _W, _D, _c, _def, _ctx, out) {
    gearBench(g, out);
  },
  egStageBooth(g, _W, _D, _c, _def, _ctx, out) {
    stageBooth(g, out);
  },
};
