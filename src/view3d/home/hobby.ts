import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { marker, rod, shade, spot, tint, screenMesh, type Builder, type Spot } from '../parts';
import type { Grip, HeldTool, Side } from '../handTool';
import { box, canvasTexture, cyl, part, rbox, textured } from '../toon';
import {
  BK, CH, CM, EZ, GT, MR, PAINT_N, PT, SC, VI, WD,
  basisQ, chessNow, chessSquare, easelY, hfLive, hfNow, paintBeat, paintPlan, scopeAim, scopePivotY,
  type BookKind, type BookPlace, type ChessHand, type HfMotion, type HfNow, type V,
} from './hobbyMotion';

/*
 * The hobbies, redone (2026-11-01, at the user's request; docs/workplaces/PIPELINE.md, 집 가구). What the game does with
 * these stays as it was: the wardrobe's and the mirror's interactions open the styler from the UI, a painting finished
 * sells from game.ts, chess is played from the table's two side tiles (lot3d.ts picks `<id>:l` or `<id>:r` by the side a
 * dweller came to), the treadmill's walker stays where lot3d.ts has always put them (the belt's top 0.16 m up), and a mirror
 * hangs on a wall when there is one. The piano is left out: workplaces/kindergartenTeacher.ts already redid it.
 * No '*' spots: a repair or a clean still goes the family's way, to Built.work. Tools go through handTool.ts.
 *
 * Everything that moves runs from Built.away, which comes every frame, so a piece settles back when nobody's at it.
 */

const WALNUT = '#6f4a33';
const OAK = '#b58a5c';
const BEECH = '#d0a878';
const BRASS = '#c79f4f';
const BRASS_D = '#94733a';
const IRON = '#2e2d33';
const CREAM = '#f3ecdc';
const STEEL = '#b9bfc5';
const INK_BLUE = '#2f4a68';

const basic = (color: string, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
const LENS = basic('#6fb6d6');
const LAMP_RED = basic('#ff6a55');
const LAMP_WARM = basic('#ffe2a8');
const SHUTTER = basic('#ffffff', 0.9);
const WATER = basic('#bfe6fb', 0.75);

const dots = new Map<number, THREE.SphereGeometry>();
function dot(r: number): THREE.SphereGeometry {
  let g = dots.get(r);
  if (!g) dots.set(r, (g = new THREE.SphereGeometry(r, 8, 6)));
  return g;
}
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const vv = (a: V) => new THREE.Vector3(a[0], a[1], a[2]);
const UP = v(0, 1, 0);
const bit = (g: THREE.Object3D, geom: THREE.BufferGeometry, color: string, x: number, y: number, z: number, o: { rx?: number; ry?: number; rz?: number } = {}) => part(g, geom, color, x, y, z, { ...o, outline: false });
const glow = (g: THREE.Object3D, geom: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, o: { rx?: number; ry?: number; rz?: number } = {}) => part(g, geom, '#ffffff', x, y, z, { ...o, outline: false, shadow: false, material: mat });
const group = (g: THREE.Object3D, x = 0, y = 0, z = 0, name?: string) => {
  const n = new THREE.Group();
  n.position.set(x, y, z);
  if (name) n.name = name;
  g.add(n);
  return n;
};

/** A picture painted once on a plane. */
function picture(g: THREE.Object3D, w: number, h: number, px: number, draw: (c: CanvasRenderingContext2D, W: number, H: number) => void, x: number, y: number, z: number): THREE.Mesh {
  const W = Math.max(4, Math.round(w * px));
  const H = Math.max(4, Math.round(h * px));
  const mat = textured(canvasTexture(W, H, (c) => draw(c, W, H)));
  mat.transparent = true;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}

/** A canvas that's painted again as things go on; `ctx` is null with no document (the tests), so painting does nothing. */
function liveCanvas(W: number, H: number, first: (c: CanvasRenderingContext2D) => void) {
  const tex = canvasTexture(W, H, first);
  const canvas = tex.image as HTMLCanvasElement | undefined;
  const ctx = canvas && typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
  return { tex, ctx };
}

/** Moves a rod made with `rod` (its length 1) between two points. */
function setRod(m: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3) {
  const d = b.clone().sub(a);
  const len = d.length();
  m.visible = len > 1e-3;
  if (!m.visible) return;
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(UP, d.multiplyScalar(1 / len));
  m.scale.set(1, len, 1);
}
const strapRod = (g: THREE.Object3D, color: string, w = 0.007) => {
  const m = part(g, new THREE.CylinderGeometry(w, w, 1, 5), color, 0, 0, 0, { outline: false });
  m.userData.ownGeometry = true;
  return m;
};

/** Sets where a tool is, from a beat. */
function placeTool(tool: THREE.Object3D, n: HfNow) {
  if (n.tool) tool.position.set(n.tool[0], n.tool[1], n.tool[2]);
  if (n.q) tool.quaternion.copy(n.q);
}

/** Puts a tool in the hands for this frame; a hand that isn't on it goes where the beat says. */
function hold(s: Spot, g: THREE.Object3D, n: HfNow, tool: THREE.Object3D, lead: Side, grips: Partial<Record<Side, Grip>>) {
  const free: HeldTool['free'] = {};
  if (!grips.left) free.left = g.localToWorld(vv(n.l));
  if (!grips.right) free.right = g.localToWorld(vv(n.r));
  s.held = { tool, lead, grips, resting: !!n.resting, lean: n.lean, nod: n.nod, free, freeShape: n.shape };
}

function use(g: THREE.Object3D, m: HfMotion, x: number, z: number): Spot {
  const s = spot(g, 'stand', x, 0, z, Math.PI);
  s.motion = m;
  return s;
}
const heightOf = (s: Spot) => (s.at.userData.height as number | undefined) ?? 1.6;

function liveOf(uses: Array<[HfMotion, Spot]>, t: number): { m: HfMotion; s: Spot; u: number; H: number } | null {
  for (const [m, s] of uses) {
    const u = hfLive(m, s, t);
    if (u !== null) return { m, s, u, H: heightOf(s) };
  }
  return null;
}

// -------------------------------------------------------------------------------------------------
// The telescope: a brass refractor on a wooden tripod, tilted up, its eyepiece on a riser at the back.

const telescope: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  const hub = 0.86;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI;
    const foot = v(Math.sin(a) * 0.36, 0.02, Math.cos(a) * 0.36);
    rod(g, v(Math.sin(a) * 0.05, hub, Math.cos(a) * 0.05), foot, 0.017, OAK);
    bit(g, cyl(0.02, 0.024, 0.04, 8), BRASS_D, foot.x, 0.02, foot.z);
    rod(g, v(Math.sin(a) * 0.17, hub * 0.55, Math.cos(a) * 0.17), v(0, hub * 0.55, 0), 0.006, BRASS_D);
  }
  part(g, cyl(0.06, 0.07, 0.05, 12), BRASS_D, 0, hub, 0);
  // The tray between the legs: an eyepiece box, a star chart, a little red lamp to read it by.
  part(g, cyl(0.15, 0.15, 0.014, 14), WALNUT, 0, hub * 0.55, 0);
  part(g, box(0.09, 0.04, 0.07), WALNUT, -0.06, hub * 0.55 + 0.028, 0.04);
  picture(g, 0.14, 0.1, 500, (c, W, H) => {
    c.fillStyle = '#16233f';
    c.fillRect(0, 0, W, H);
    c.fillStyle = '#f5eeb8';
    for (let i = 0; i < 26; i++) c.fillRect(((i * 37) % 97) / 97 * W, ((i * 53) % 89) / 89 * H, 1 + (i % 3 ? 0 : 1), 1 + (i % 3 ? 0 : 1));
    c.strokeStyle = '#7fa3d9';
    c.beginPath();
    c.moveTo(W * 0.2, H * 0.7);
    c.lineTo(W * 0.4, H * 0.45);
    c.lineTo(W * 0.65, H * 0.55);
    c.lineTo(W * 0.8, H * 0.25);
    c.stroke();
  }, 0.05, hub * 0.55 + 0.009, -0.04).rotation.x = -Math.PI / 2;
  const lit = group(g);
  out.inUse = lit;
  glow(lit, dot(0.012), LAMP_RED, 0.09, hub * 0.55 + 0.03, 0.07);

  // The column rises from the hub as far as who's at it needs; the mount turns on it; the tube tips in the mount.
  const column = part(g, new THREE.CylinderGeometry(0.018, 0.018, 1, 8), STEEL, 0, hub, SC.pivotZ / 2, { outline: false });
  column.userData.ownGeometry = true;
  const mount = group(g, 0, SC.pivotY, SC.pivotZ, 'mount');
  bit(mount, cyl(0.035, 0.04, 0.05, 10), BRASS_D, 0, -0.075, 0);
  for (const sx of [-1, 1]) part(mount, box(0.012, 0.12, 0.04), BRASS_D, sx * 0.075, -0.03, 0);
  const tube = group(mount, 0, 0, 0, 'tube');
  const along = (m: THREE.Mesh) => (m.rotation.x = Math.PI / 2);
  // Out to the objective at -z; the eyepiece end back at +z.
  along(part(tube, cyl(0.052, 0.052, 0.72, 16), BRASS, 0, 0, -0.1));
  along(part(tube, cyl(0.07, 0.056, 0.2, 16), BRASS_D, 0, 0, -0.55));
  glow(tube, new THREE.CircleGeometry(0.061, 16), LENS, 0, 0, -0.651, { ry: Math.PI }).userData.ownGeometry = true;
  for (const z of [-0.42, -0.1, 0.16]) along(bit(tube, cyl(0.056, 0.056, 0.016, 16), IRON, 0, 0, z));
  // The focuser and its knobs at the back, a little finder along the top.
  along(part(tube, cyl(0.034, 0.042, 0.12, 12), BRASS_D, 0, 0, SC.back - 0.06));
  const knobs = group(tube, 0, -0.03, SC.back - 0.1, 'knobs');
  part(knobs, cyl(0.016, 0.016, 0.14, 10), IRON, 0, 0, 0, { rz: Math.PI / 2 });
  for (const sx of [-1, 1]) part(knobs, cyl(0.022, 0.022, 0.016, 10), BRASS, sx * 0.07, 0, 0, { rz: Math.PI / 2 });
  along(part(tube, cyl(0.015, 0.015, 0.24, 8), IRON, 0, 0.085, -0.02));
  for (const z of [-0.08, 0.05]) bit(tube, box(0.012, 0.035, 0.012), BRASS_D, 0, 0.065, z);
  // The riser stays upright, however the tube tips, so the eye comes to it from above.
  const riser = group(tube, 0, 0, SC.back, 'riser');
  bit(riser, cyl(0.02, 0.02, SC.riser - 0.03, 10), IRON, 0, (SC.riser - 0.03) / 2, 0);
  part(riser, cyl(0.022, 0.018, 0.035, 10), IRON, 0, SC.riser - 0.012, 0);

  const star = use(g, 'hfStar', 0, 0.5);
  const sky = use(g, 'hfSky', 0, 0.5);
  const spy = use(g, 'hfSpy', 0, 0.5);
  out.spots = { stargaze: star, observeSkies: sky, watchNeighbors: spy };
  out.work = marker(g, 0, 1.2, 0.2);
  const uses: Array<[HfMotion, Spot]> = [['hfStar', star], ['hfSky', sky], ['hfSpy', spy]];
  let was = -1;
  const pose = (alt: number, az: number, y: number, dt: number) => {
    const k = dt > 0.5 ? 1 : 1 - Math.exp(-dt * 6);
    tube.rotation.x += (alt - tube.rotation.x) * k;
    mount.rotation.y += (az - mount.rotation.y) * k;
    mount.position.y += (y - mount.position.y) * k;
    riser.rotation.x = -tube.rotation.x;
    const h = mount.position.y - hub;
    column.scale.y = Math.max(0.01, h);
    column.position.set(0, hub + h / 2, SC.pivotZ * 0.6);
  };
  pose(0.82, 0, SC.pivotY, 1);
  out.away = (_o, t) => {
    const dt = was < 0 ? 1 : Math.abs(t - was);
    was = t;
    const now = liveOf(uses, t);
    if (!now) return pose(0.82, 0, SC.pivotY, dt);
    const a = scopeAim(now.m as 'hfStar', now.u);
    pose(a.alt, a.az, scopePivotY(now.H, a.alt), dt);
    knobs.rotation.x = Math.sin(t * 2.4) * 0.8;
  };
};

// -------------------------------------------------------------------------------------------------
// The chess table: a pedestal table with a real board, the two stools tucked under until they're wanted.

/** The pieces, turned on a lathe: heights as they stand. */
const PIECE: Record<string, { h: number; p: Array<[number, number]> }> = {
  p: { h: 0.034, p: [[0.012, 0], [0.012, 0.004], [0.006, 0.012], [0.005, 0.02], [0.009, 0.024], [0.008, 0.032], [0.001, 0.035]] },
  r: { h: 0.042, p: [[0.014, 0], [0.014, 0.005], [0.008, 0.012], [0.007, 0.03], [0.012, 0.033], [0.012, 0.042], [0.004, 0.042]] },
  n: { h: 0.046, p: [[0.014, 0], [0.014, 0.005], [0.008, 0.012], [0.007, 0.028]] },
  b: { h: 0.052, p: [[0.014, 0], [0.014, 0.005], [0.007, 0.014], [0.005, 0.03], [0.009, 0.034], [0.007, 0.046], [0.001, 0.053]] },
  q: { h: 0.062, p: [[0.015, 0], [0.015, 0.005], [0.008, 0.016], [0.005, 0.04], [0.011, 0.046], [0.009, 0.056], [0.003, 0.058], [0.001, 0.063]] },
  k: { h: 0.068, p: [[0.015, 0], [0.015, 0.005], [0.008, 0.016], [0.005, 0.044], [0.011, 0.05], [0.009, 0.058], [0.002, 0.06]] },
};
const lathes = new Map<string, THREE.LatheGeometry>();
function pieceGeom(kind: string): THREE.LatheGeometry {
  let g = lathes.get(kind);
  if (!g) lathes.set(kind, (g = new THREE.LatheGeometry(PIECE[kind].p.map(([r, y]) => new THREE.Vector2(r, y)), 8)));
  return g;
}
interface Man {
  mesh: THREE.Object3D;
  kind: string;
  white: boolean;
  home: [number, number];
  at: [number, number] | null;
}
const LINE = 'rnbqkbnr';
/** A quiet game, every square within reach of the one who plays there: castled, a bishop taken, a queen out. */
const GAME = ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5', 'c2c3', 'g8f6', 'd2d3', 'd7d6', 'e1g1', 'h1f1', 'e8g8', 'h8f8', 'c1g5', 'c8g4', 'b1d2', 'h7h6', 'g5f6', 'd8f6', 'h2h3', 'g4e6', 'c4e6', 'f7e6'];
const parseSquare = (s: string, i: number): [number, number] => [s.charCodeAt(i) - 97, s.charCodeAt(i + 1) - 49];
/** A try at the board alone: moved out and taken back. */
const TRIES: Record<string, string[]> = { l: ['e2e4', 'd2d4', 'g1f3', 'b1c3', 'c2c3'], r: ['e7e5', 'd7d5', 'g8f6', 'b8c6', 'c7c6'] };

const chessTable: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  // The table: a central turned pedestal on a cross foot, so knees fit under from either side.
  part(g, rbox(0.66, 0.035, 0.66, 0.015), WALNUT, 0, CH.top - 0.03, 0);
  part(g, box(0.56, 0.05, 0.56), shade(WALNUT, 0.8), 0, CH.top - 0.07, 0);
  part(g, cyl(0.05, 0.075, 0.5, 10), shade(WALNUT, 0.85), 0, 0.33, 0);
  part(g, cyl(0.085, 0.05, 0.08, 10), shade(WALNUT, 0.85), 0, 0.57, 0);
  part(g, cyl(0.07, 0.095, 0.08, 10), shade(WALNUT, 0.85), 0, 0.09, 0);
  for (const a of [0, Math.PI / 2]) part(g, rbox(0.5, 0.04, 0.07, 0.015), shade(WALNUT, 0.72), 0, 0.03, 0, { ry: a + Math.PI / 4 });
  // The board, inlaid, with its border and coordinates of nothing in particular.
  picture(g, CH.sq * 8 + 0.03, CH.sq * 8 + 0.03, 720, (c, W, H) => {
    c.fillStyle = '#3f2a1c';
    c.fillRect(0, 0, W, H);
    const m = (0.015 / (CH.sq * 8 + 0.03)) * W;
    const q = (W - 2 * m) / 8;
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      c.fillStyle = (i + j) % 2 ? '#7a5234' : '#ecd9b4';
      c.fillRect(m + i * q, m + j * q, q + 0.5, q + 0.5);
    }
  }, 0, CH.top + 0.0015, 0).rotation.x = -Math.PI / 2;
  // A clock on the +z edge, pressed from either side.
  part(g, rbox(0.15, 0.05, 0.05, 0.008), WALNUT, 0, CH.top + 0.025, CH.clock[2]);
  for (const sx of [-1, 1]) {
    picture(g, 0.04, 0.04, 400, (c, W, H) => {
      c.fillStyle = CREAM;
      c.beginPath();
      c.arc(W / 2, H / 2, Math.max(1, W / 2 - 1), 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = IRON;
      c.beginPath();
      c.moveTo(W / 2, H / 2);
      c.lineTo(W / 2 + sx * W * 0.25, H * 0.25);
      c.stroke();
    }, sx * 0.04, CH.top + 0.028, CH.clock[2] + 0.0255);
  }
  const buttons = [-1, 1].map((sx) => part(g, cyl(0.011, 0.011, 0.014, 8), BRASS, sx * 0.04, CH.top + 0.056, CH.clock[2]));

  // The stools: each a padded round top on three legs.
  const stools = [-1, 1].map((side) => {
    const st = group(g, side * CH.tuck, 0, 0, 'stool');
    part(st, cyl(0.135, 0.135, 0.05, 12), '#7b3f35', 0, CH.seatY - 0.025, 0);
    bit(st, cyl(0.14, 0.14, 0.012, 12), shade(WALNUT, 0.9), 0, CH.seatY - 0.055, 0);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      rod(st, v(Math.sin(a) * 0.08, CH.seatY - 0.06, Math.cos(a) * 0.08), v(Math.sin(a) * 0.12, 0, Math.cos(a) * 0.12), 0.012, shade(WALNUT, 0.9));
    }
    return st;
  });

  // The men.
  const men: Man[] = [];
  const addMan = (kind: string, white: boolean, file: number, rank: number) => {
    const color = white ? '#efe2c4' : '#35261e';
    const m = group(g, 0, 0, 0, 'chessPiece');
    bit(m, pieceGeom(kind), color, 0, 0, 0);
    if (kind === 'n') {
      part(m, box(0.012, 0.02, 0.022), color, 0, 0.034, 0.002, { rx: 0.3, outline: false });
    } else if (kind === 'k') {
      bit(m, box(0.003, 0.016, 0.003), color, 0, 0.066, 0);
      bit(m, box(0.01, 0.003, 0.003), color, 0, 0.068, 0);
    }
    men.push({ mesh: m, kind, white, home: [file, rank], at: [file, rank] });
  };
  for (let f = 0; f < 8; f++) {
    addMan(LINE[f], true, f, 0);
    addMan('p', true, f, 1);
    addMan('p', false, f, 6);
    addMan(LINE[f], false, f, 7);
  }
  const manAt = (f: number, r: number) => men.find((m) => m.at && m.at[0] === f && m.at[1] === r);
  let gone = 0;
  const setDown = (m: Man) => {
    if (m.at) m.mesh.position.fromArray(chessSquare(m.at[0], m.at[1]));
  };
  const reset = () => {
    gone = 0;
    for (const m of men) {
      m.at = [...m.home];
      setDown(m);
    }
  };
  reset();
  const take = (m: Man) => {
    // Off the board, to the side of whoever took it (x is who, z along the table's edge).
    m.at = null;
    const i = gone++;
    m.mesh.position.set((m.white ? 1 : -1) * (0.24 + 0.03 * (i % 2)), CH.top - 0.013, -0.22 + 0.04 * (i % 11));
  };

  const makeSpot = (m: HfMotion, side: number) => {
    const s = spot(g, 'sit', side * CH.seat, CH.seatY, 0, side < 0 ? Math.PI / 2 : -Math.PI / 2, CH.seatY);
    s.motion = m;
    s.at.userData.side = side;
    return s;
  };
  const play = [makeSpot('hfChess', -1), makeSpot('hfChess', 1)];
  const think = [makeSpot('hfChess', -1), makeSpot('hfChess', 1)];
  out.spots = { 'playChess:l': play[0], 'playChess:r': play[1], 'ponder:l': think[0], 'ponder:r': think[1] };
  out.work = marker(g, 0, CH.top + 0.02, 0.2);

  const grip = (m: Man): Grip => ({ at: v(0, PIECE[m.kind].h * 0.72, 0), axis: v(0, 1, 0), shape: 'pinch', radius: 0.008 });
  const carry = (m: Man, from: V, to: V, f: number) => {
    // From reaching (to 0.2) through the carry (to 0.62), arcing over what's in the way.
    const k = Math.min(1, Math.max(0, (f - 0.2) / 0.42));
    const e = k * k * (3 - 2 * k);
    const p: V = [from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e + Math.sin(e * Math.PI) * 0.07, from[2] + (to[2] - from[2]) * e];
    m.mesh.position.fromArray(p);
    return p;
  };
  const bump = (f: number, a: number, b: number) => (f <= a || f >= b ? 0 : Math.sin(((f - a) / (b - a)) * Math.PI));

  /** A hand at a move: the piece carried by the hand and how far on it is. */
  const moving = (s: Spot, side: number, m: Man, from: V, to: V, f: number, H: number, t: number, tap: boolean) => {
    const p = carry(m, from, to, f);
    const ud = s.at.userData;
    const hand: ChessHand = f < 0.78 ? { piece: [p[0], p[1] + PIECE[m.kind].h * 0.72, p[2]], u: f / 0.78 } : {};
    if (tap) hand.tap = bump(f, 0.78, 0.94);
    ud.chess = hand;
    if (f < 0.64) {
      const c = chessNow(side, hand, H, t);
      s.held = { tool: m.mesh, lead: 'right', grips: { right: grip(m) }, resting: f < 0.2, lean: c.lean, nod: c.nod, free: { left: g.localToWorld(vv(c.l)) } };
    }
  };

  let ply = -1;
  let began = 0;
  let wasLive = false;
  const pressed = [0, 0];
  out.away = (_o, t) => {
    play[0].held = play[1].held = think[0].held = think[1].held = null;
    const lp = [hfLive('hfChess', play[0], t) !== null, hfLive('hfChess', play[1], t) !== null];
    const lt = [hfLive('hfChess', think[0], t) !== null, hfLive('hfChess', think[1], t) !== null];
    const seatedNow = [lp[0] || lt[0], lp[1] || lt[1]];
    // The stools come out for whoever's sitting, and back in after.
    stools.forEach((st, i) => {
      const side = i ? 1 : -1;
      const goal = side * (seatedNow[i] ? CH.seat : CH.tuck);
      st.position.x += (goal - st.position.x) * 0.18;
    });
    pressed[0] = pressed[1] = 0;
    const any = seatedNow[0] || seatedNow[1];
    if (any && !wasLive) reset();
    if (!any && wasLive) for (const m of men) setDown(m);
    wasLive = any;
    for (const s of [...play, ...think]) s.at.userData.chess = null;
    if (lp[0] && lp[1]) {
      // A game: a ply every few seconds, from whichever side's move it is.
      if (ply < 0) {
        began = t;
        ply = 0;
        reset();
      }
      const T = 3.4;
      const now = Math.floor((t - began) / T);
      const f = (t - began) / T - now;
      while (ply < now && ply < GAME.length) {
        const mv = GAME[ply++];
        const m = manAt(...parseSquare(mv, 0));
        const to = parseSquare(mv, 2);
        const there = manAt(to[0], to[1]);
        if (there && there !== m) take(there);
        if (m) {
          m.at = to;
          setDown(m);
        }
      }
      if (ply >= GAME.length) return;
      const mv = GAME[ply];
      const m = manAt(...parseSquare(mv, 0));
      if (!m) return;
      const to = parseSquare(mv, 2);
      const there = manAt(to[0], to[1]);
      if (there && there !== m && f > 0.5) take(there);
      const i = m.white ? 0 : 1;
      const s = play[i];
      moving(s, i ? 1 : -1, m, chessSquare(m.at![0], m.at![1]), chessSquare(to[0], to[1]), f, heightOf(s), t, true);
      pressed[i] = bump(f, 0.78, 0.94);
    } else {
      ply = -1;
      // Alone: a long look, a try at a move, a long look at that, and it's taken back. Each side tries its own.
      [0, 1].forEach((i) => {
        const s = lp[i] ? play[i] : lt[i] ? think[i] : null;
        if (!s) return;
        const cycle = 11;
        const w = (t + i * 3.1) / cycle;
        const n = Math.floor(w);
        const u = w - n;
        const inA = u >= 0.3 && u < 0.54;
        const inB = u >= 0.76 && u < 1;
        const list = TRIES[i ? 'r' : 'l'];
        const pick = list.map((x) => ({ from: parseSquare(x, 0), to: parseSquare(x, 2) })).find((x, k) => k >= n % list.length && manAt(x.from[0], x.from[1])?.white === !i && !manAt(x.to[0], x.to[1]));
        const m = pick && manAt(pick.from[0], pick.from[1]);
        if (!m || !pick) return;
        if (inA) moving(s, i ? 1 : -1, m, chessSquare(pick.from[0], pick.from[1]), chessSquare(pick.to[0], pick.to[1]), (u - 0.3) / 0.24, heightOf(s), t, false);
        else if (u >= 0.54 && u < 0.76) m.mesh.position.fromArray(chessSquare(pick.to[0], pick.to[1]));
        else if (inB) moving(s, i ? 1 : -1, m, chessSquare(pick.to[0], pick.to[1]), chessSquare(pick.from[0], pick.from[1]), (u - 0.76) / 0.24, heightOf(s), t, false);
        else setDown(m);
      });
    }
    buttons.forEach((b, i) => (b.position.y = CH.top + 0.056 - pressed[i] * 0.006));
  };
};

// -------------------------------------------------------------------------------------------------
// The mirror: tall, in a carved walnut frame, on a stand or against a wall, its glass painted with the room it faces.

// A real reflection while someone's at it; two at most at once, shared by all the mirrors, as each costs a second drawing of the room.
const GLASSES: Array<{ mesh: Reflector; owner: unknown; w: number; h: number }> = [];
function borrowGlass(owner: unknown, w: number, h: number): Reflector | null {
  if (typeof document === 'undefined') return null;
  const mine = GLASSES.find((p) => p.owner === owner);
  if (mine) return mine.mesh;
  const free = GLASSES.find((p) => p.owner === null && p.w === w && p.h === h);
  if (free) {
    free.owner = owner;
    return free.mesh;
  }
  if (GLASSES.length >= 2) return null;
  const mesh = new Reflector(new THREE.PlaneGeometry(w, h), { textureWidth: 512, textureHeight: 1024, color: '#d4dcde', clipBias: 0.002 });
  GLASSES.push({ mesh, owner, w, h });
  return mesh;
}
function returnGlass(owner: unknown) {
  const mine = GLASSES.find((p) => p.owner === owner);
  if (!mine) return;
  mine.owner = null;
  mine.mesh.removeFromParent();
}

const mirror: Builder = (g, W, D, _c, _def, ctx, out) => {
  const w = W > 1 ? W - 0.3 : 0.62;
  const hG = 1.72;
  const glass = ctx.againstWall ? -D / 2 + 0.05 : -0.1;
  const y = 1.03;
  const z = glass - 0.018;
  // The frame, a little proud of the glass, with a crest on top.
  part(g, rbox(w + 0.11, hG + 0.12, 0.05, 0.02), WALNUT, 0, y, glass - 0.03, { outline: false }); // Its face just behind the glass; an ink hull would stand in front of the reflection's clip plane.
  for (const sx of [-1, 1]) bit(g, box(0.012, hG + 0.02, 0.008), BRASS, sx * (w / 2 + 0.018), y, glass);
  for (const sy of [-1, 1]) bit(g, box(w + 0.05, 0.012, 0.008), BRASS, 0, y + sy * (hG / 2 + 0.018), glass);
  part(g, cyl(0.08, 0.08, 0.04, 16), WALNUT, 0, y + hG / 2 + 0.06, z, { rx: Math.PI / 2 });
  part(g, rbox(0.1, 0.02, 0.05, 0.008), shade(WALNUT, 0.8), 0, y + hG / 2 + 0.125, z);
  bit(g, dot(0.018), BRASS, 0, y + hG / 2 + 0.07, glass);
  // The reflection: a room behind you, window light on its wall, the floor coming up to meet it; the silver going dark at the edges, a long sheen.
  picture(g, w, hG, 300, (c, W2, H2) => {
    const wall = c.createLinearGradient(0, 0, 0, H2 * 0.72);
    wall.addColorStop(0, '#c9d6d8');
    wall.addColorStop(1, '#e4e6dc');
    c.fillStyle = wall;
    c.fillRect(0, 0, W2, H2);
    const floor = c.createLinearGradient(0, H2 * 0.72, 0, H2);
    floor.addColorStop(0, '#b59b7c');
    floor.addColorStop(1, '#8d7358');
    c.fillStyle = floor;
    c.fillRect(0, H2 * 0.72, W2, H2 * 0.28);
    c.fillStyle = '#6d5a48';
    c.fillRect(0, H2 * 0.715, W2, H2 * 0.012);
    // A window across the room, bright, with its bars and its light on the floor.
    c.fillStyle = '#f8fbf6';
    c.fillRect(W2 * 0.62, H2 * 0.14, W2 * 0.3, H2 * 0.3);
    c.fillStyle = '#8fa2a5';
    c.fillRect(W2 * 0.76, H2 * 0.14, W2 * 0.012, H2 * 0.3);
    c.fillRect(W2 * 0.62, H2 * 0.28, W2 * 0.3, H2 * 0.007);
    c.fillStyle = 'rgba(255,250,225,0.28)';
    c.beginPath();
    c.moveTo(W2 * 0.55, H2 * 0.76);
    c.lineTo(W2 * 0.86, H2 * 0.76);
    c.lineTo(W2 * 0.7, H2 * 0.98);
    c.lineTo(W2 * 0.3, H2 * 0.98);
    c.fill();
    // Something of the room: a picture and a low chest.
    c.fillStyle = '#a58b6d';
    c.fillRect(W2 * 0.1, H2 * 0.24, W2 * 0.2, H2 * 0.13);
    c.fillStyle = '#d7dfdc';
    c.fillRect(W2 * 0.125, H2 * 0.255, W2 * 0.15, H2 * 0.1);
    c.fillStyle = '#907155';
    c.fillRect(W2 * 0.06, H2 * 0.6, W2 * 0.3, H2 * 0.125);
    // The sheen, and the silver darkening at the edge.
    c.fillStyle = 'rgba(255,255,255,0.22)';
    c.beginPath();
    c.moveTo(W2 * 0.05, 0);
    c.lineTo(W2 * 0.4, 0);
    c.lineTo(W2 * 0.02, H2 * 0.55);
    c.lineTo(0, H2 * 0.3);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.12)';
    c.beginPath();
    c.moveTo(W2 * 0.48, 0);
    c.lineTo(W2 * 0.56, 0);
    c.lineTo(W2 * 0.1, H2 * 0.68);
    c.lineTo(W2 * 0.05, H2 * 0.6);
    c.fill();
    const edge = c.createRadialGradient(W2 / 2, H2 / 2, Math.max(1, H2 * 0.3), W2 / 2, H2 / 2, Math.max(2, H2 * 0.6));
    edge.addColorStop(0, 'rgba(50,70,80,0)');
    edge.addColorStop(1, 'rgba(50,70,80,0.32)');
    c.fillStyle = edge;
    c.fillRect(0, 0, W2, H2);
  }, 0, y, glass);
  // Who's stood in front of it: half their size on the glass, as a reflection is; they move as they move.
  const lit = group(g);
  out.inUse = lit;
  const person = group(lit, 0, 0, glass + 0.002, 'reflection');
  person.visible = false;
  const figure = picture(person, 0.32, 0.8, 160, (c, W2, H2) => {
    const mid = W2 / 2;
    const u = H2 / 16;
    c.fillStyle = 'rgba(62,70,95,0.92)';
    c.beginPath();
    c.moveTo(mid - 2.6 * u, 3.4 * u);
    c.lineTo(mid + 2.6 * u, 3.4 * u);
    c.lineTo(mid + 2.1 * u, 9 * u);
    c.lineTo(mid - 2.1 * u, 9 * u);
    c.fill();
    c.fillStyle = 'rgba(44,48,62,0.92)';
    c.fillRect(mid - 2 * u, 9 * u, 1.8 * u, 7 * u);
    c.fillRect(mid + 0.2 * u, 9 * u, 1.8 * u, 7 * u);
    c.fillStyle = 'rgba(232,200,172,0.95)';
    c.beginPath();
    c.arc(mid, 1.8 * u, Math.max(1, 1.45 * u), 0, Math.PI * 2);
    c.fill();
    c.fillRect(mid - 0.5 * u, 2.9 * u, u, u);
    c.fillStyle = 'rgba(52,38,32,0.95)';
    c.beginPath();
    c.arc(mid, 1.5 * u, Math.max(1, 1.55 * u), Math.PI, 0);
    c.fill();
    c.fillStyle = 'rgba(30,24,22,0.9)';
    c.fillRect(mid - 0.75 * u, 1.75 * u, 0.28 * u, 0.28 * u);
    c.fillRect(mid + 0.47 * u, 1.75 * u, 0.28 * u, 0.28 * u);
  }, 0, 0, 0);
  const hands = [glow(person, dot(0.016), basic('#e8c8ac', 0.95), 0, 0, 0.001), glow(person, dot(0.016), basic('#e8c8ac', 0.95), 0, 0, 0.001)];
  // The ledge on the frame's side: a comb and a brush to hand.
  part(g, rbox(0.22, 0.016, 0.1, 0.006), shade(WALNUT, 0.9), MR.comb[0], MR.comb[1] - 0.016, glass + 0.045);
  const comb = group(g, 0, 0, 0, 'comb');
  part(comb, new THREE.BoxGeometry(0.014, 0.1, 0.008), '#7a5234', 0, 0.015, 0, { outline: false }).userData.ownGeometry = true;
  bit(comb, box(0.016, 0.1, 0.006), '#7a5234', 0, 0.11, 0);
  for (let i = 0; i < 9; i++) bit(comb, box(0.012, 0.0035, 0.003), '#5e3f28', -0.012, 0.07 + i * 0.011, 0);
  part(g, rbox(0.045, 0.02, 0.1, 0.008), '#d9a8a0', MR.comb[0] + 0.06, MR.comb[1] - 0.001, glass + 0.045);

  const combGrips: Partial<Record<Side, Grip>> = { right: { at: v(0, 0, 0), axis: v(0, 1, 0), shape: 'power', radius: 0.007 } };
  const placeComb = () => {
    comb.position.set(MR.comb[0], MR.comb[1], glass + MR.comb[2]);
    comb.quaternion.copy(basisQ([-1, 0, 0], [0, 1, 0]));
  };
  placeComb();
  const list: Array<[string, HfMotion]> = [['psychUp', 'hfPsych'], ['sillyFace', 'hfSilly'], ['gussyUp', 'hfGussy'], ['calmDown', 'hfCalm'], ['practiceRomance', 'hfRomance'], ['practiceComedy', 'hfComedy'], ['speech', 'hfSpeech'], ['styleHair', 'hfHair']];
  out.spots = {};
  const uses: Array<[HfMotion, Spot]> = list.map(([id, m]) => {
    const s = use(g, m, 0, glass + MR.stand);
    s.at.userData.glass = glass;
    out.spots![id] = s;
    return [m, s];
  });
  out.work = marker(g, 0, 1.1, glass + 0.03);
  out.away = (_o, t) => {
    for (const [, s] of uses) s.held = null;
    const now = liveOf(uses, t);
    if (!now) {
      person.visible = false;
      returnGlass(g);
      placeComb();
      return;
    }
    // The real thing if one's free, else the painted stand-in below.
    const real = borrowGlass(g, w, hG);
    if (real && real.parent !== g) {
      real.position.set(0, y, glass + 0.004);
      g.add(real);
    }
    person.visible = !real;
    const n = hfNow(now.m as Exclude<HfMotion, 'hfChess'>, now.u, now.H, t, { glass });
    // The reflection stands where they do, half as tall on the glass, its feet coming up from the floor behind.
    const hh = now.H * 0.5;
    const feet = y - hG / 2 + 0.35;
    const fig = figure;
    fig.scale.set(hh / 0.8, hh / 0.8, 1);
    fig.position.set(n.st[0] * 0.5, feet + hh / 2, 0);
    fig.rotation.z = -n.st[0] * 0.2;
    const mirrorHand = (m: THREE.Mesh, h: V) => {
      m.position.set((n.st[0] + (h[0] - n.st[0]) * 0.5), feet + h[1] * 0.5, 0.001);
    };
    mirrorHand(hands[0], n.l);
    mirrorHand(hands[1], n.r);
    if (n.hold === 'comb' && n.tool) {
      placeTool(comb, n);
      hold(now.s, g, n, comb, 'right', combGrips);
    } else placeComb();
  };
};

// -------------------------------------------------------------------------------------------------
// The wardrobe: two doors on Built.doors; behind them a lit rail of clothes, a shelf of folded things, drawers below.

const clothesCabinet: Builder = (g, W, D, c, _def, _ctx, out) => {
  const w = Math.min(W - 0.06, 0.94);
  const H = 2.0;
  const d = Math.min(D, 0.6);
  const back = WD.front - d + 0.02;
  const zm = back + (d - 0.02) / 2;
  const body = shade(tint(WALNUT, 0.12), 0.95);
  void c;
  // The carcass, open at the front.
  part(g, box(w, H, 0.03), shade(body, 0.75), 0, H / 2, back + 0.015);
  for (const sx of [-1, 1]) part(g, rbox(0.03, H, d - 0.02, 0.008), body, sx * (w / 2 - 0.015), H / 2, zm);
  part(g, rbox(w + 0.04, 0.05, d + 0.02, 0.012), shade(body, 0.85), 0, H - 0.01, zm);
  part(g, rbox(w + 0.02, 0.08, d, 0.012), shade(body, 0.7), 0, 0.04, zm);
  // Drawers below the doors, with brass pulls.
  for (let i = 0; i < 2; i++) {
    const y = 0.165 + i * 0.19;
    part(g, rbox(w - 0.05, 0.17, 0.02, 0.008), body, 0, y, WD.front - 0.012);
    for (const sx of [-1, 1]) part(g, cyl(0.012, 0.012, 0.02, 8), BRASS, sx * 0.2, y, WD.front + 0.005, { rx: Math.PI / 2, outline: false });
  }
  part(g, box(w - 0.06, 0.02, d - 0.05), shade(body, 0.8), 0, 0.46, zm);
  // A shelf on top: folded jumpers and a hat box. The rail under it, with what hangs there.
  part(g, box(w - 0.06, 0.02, d - 0.05), shade(body, 0.8), 0, 1.72, zm);
  ['#b7c9d6', '#d9b7a0', '#a7b79b', '#c7a5b8'].forEach((col, i) => {
    part(g, rbox(0.17, 0.05, 0.3, 0.012), col, -0.3 + i * 0.05, 1.755 + (i % 2) * 0.05, zm + 0.02, { outline: false });
  });
  part(g, cyl(0.1, 0.1, 0.13, 12), '#cdb79a', 0.26, 1.795, zm + 0.02);
  bit(g, cyl(0.104, 0.104, 0.024, 12), '#b39a7c', 0.26, 1.85, zm + 0.02);
  bit(g, cyl(0.009, 0.009, w - 0.08, 8), STEEL, 0, WD.hook[1] - 0.04, WD.hook[2], { rz: Math.PI / 2 });
  const hang = (x: number, col: string, len: number, kind: number, tg: THREE.Object3D = g, z = WD.hook[2]) => {
    const a = group(tg, x, WD.hook[1], z);
    // The hanger's plane runs front to back on the rail.
    bit(a, box(0.005, 0.03, 0.005), STEEL, 0, -0.02, 0);
    bit(a, box(0.006, 0.012, 0.34), BEECH, 0, -0.05, 0);
    part(a, rbox(0.022, len, 0.31, 0.01), col, 0, -0.06 - len / 2, 0);
    if (kind === 1) part(a, rbox(0.024, len * 0.45, 0.36, 0.01), shade(col, 0.88), 0, -0.06 - len * 0.75, 0);
    if (kind === 2) for (const s of [-1, 1]) part(a, rbox(0.02, len * 0.55, 0.05, 0.01), shade(col, 0.9), 0, -0.07 - len * 0.27, s * 0.17);
    return a;
  };
  [['#44597a', 0.92, 2], ['#a24f46', 0.72, 1], ['#e6e0d2', 0.62, 2], ['#51704d', 0.68, 2], ['#7a5b8e', 0.98, 1], ['#3c3a44', 1.02, 2]].forEach(([col, len, kind], i) => {
    const x = -0.36 + i * 0.09 + (i > 3 ? 0.14 : 0);
    hang(x, col as string, len as number, kind as number);
  });
  // A little lamp over the rail, and a belt on a peg.
  const lit = group(g);
  out.inUse = lit;
  glow(lit, box(0.3, 0.012, 0.03), LAMP_WARM, 0, 1.695, zm + 0.08);
  bit(g, box(0.02, 0.5, 0.012), '#5a3b28', -w / 2 + 0.05, 1.28, back + 0.05);
  // The doors, on their hinges; on the left's inside, a long mirror.
  const dw = (w - 0.03) / 2;
  const doors = [-1, 1].map((side) => {
    const hinge = group(g, side * (w / 2 - 0.012), 0, WD.front);
    hinge.userData.swing = side;
    const leaf = group(hinge, -side * dw / 2, 0, 0);
    const h = H - 0.5;
    const yc = 0.48 + h / 2 - 0.01;
    part(leaf, rbox(dw - 0.006, h, 0.026, 0.008), body, 0, yc, 0.013);
    for (const [fw, fh, y0] of [[dw - 0.12, 0.8, yc + 0.27], [dw - 0.12, 0.42, yc - 0.42]] as const) {
      bit(leaf, box(fw, fh, 0.005), shade(body, 0.86), 0, y0, 0.0275);
      bit(leaf, box(fw - 0.03, fh - 0.03, 0.005), tint(body, 0.08), 0, y0, 0.03);
    }
    part(leaf, cyl(0.009, 0.009, 0.15, 8), BRASS, -side * (-dw / 2 + 0.04), yc - 0.05, 0.05, { outline: false });
    if (side < 0) {
      const inner = new THREE.Mesh(new THREE.PlaneGeometry(dw - 0.1, h - 0.2), new THREE.MeshBasicMaterial({ color: '#cfdde0' }));
      inner.userData.ownGeometry = inner.userData.ownMaterial = true;
      inner.position.set(0, yc, -0.002);
      inner.rotation.y = Math.PI;
      leaf.add(inner);
    }
    return hinge;
  });
  out.doors = doors;
  // The hanger taken down: its hook at the origin, the clothes hung below it in its own plane.
  const outfit = group(g, 0, 0, 0, 'outfit');
  bit(outfit, cyl(0.004, 0.004, 0.05, 6), STEEL, 0, -0.01, 0);
  bit(outfit, box(0.34, 0.012, 0.006), BEECH, 0, -0.05, 0);
  part(outfit, rbox(0.32, 0.56, 0.018, 0.01), '#c4693f', 0, -0.33, 0);
  for (const s of [-1, 1]) part(outfit, rbox(0.075, 0.42, 0.016, 0.01), shade('#c4693f', 0.9), s * 0.195, -0.27, 0, { rz: s * 0.12 });
  bit(outfit, box(0.12, 0.03, 0.022), tint('#c4693f', 0.5), 0, -0.07, 0.002);
  for (let i = 0; i < 4; i++) bit(outfit, dot(0.006), CREAM, 0, -0.13 - i * 0.11, 0.012);
  const hook = vv(WD.hook);
  const rest = () => {
    outfit.position.copy(hook);
    outfit.quaternion.setFromEuler(new THREE.Euler(0, Math.PI / 2, 0));
  };
  rest();
  const s = use(g, 'hfWardrobe', 0, WD.stand);
  out.spots = { changeClothes: s };
  out.work = marker(g, 0, 1.1, WD.front + 0.04);
  const grips: Partial<Record<Side, Grip>> = { right: { at: v(0, -0.02, 0), axis: v(0, 1, 0), shape: 'power', radius: 0.008 } };
  out.away = (_o, t) => {
    s.held = null;
    const u = hfLive('hfWardrobe', s, t);
    if (u === null) return rest();
    const n = hfNow('hfWardrobe', u, heightOf(s), t);
    if (!n.hold) return rest();
    placeTool(outfit, n);
    hold(s, g, n, outfit, 'right', grips);
  };
};

// -------------------------------------------------------------------------------------------------
// The treadmill: a home one, with its belt and rollers, a console that counts, a towel on the rail, a bottle in the holder.

const treadmill: Builder = (g, _W, D, c, _def, _ctx, out) => {
  const L = D - 0.15;
  const head = -L / 2;
  const run = L - 0.42;
  const zr = head + 0.29;
  const frame = shade(c, 0.9);
  part(g, rbox(0.78, 0.11, L, 0.03), '#34363c', 0, 0.075, 0.02);
  for (const sx of [-1, 1]) {
    part(g, rbox(0.1, 0.05, L - 0.08, 0.02), frame, sx * 0.34, 0.16, 0.05);
    bit(g, box(0.09, 0.006, L - 0.2), '#70757c', sx * 0.34, 0.187, 0.06);
    for (const z of [0.72, -0.5]) bit(g, cyl(0.03, 0.03, 0.02, 10), IRON, sx * 0.34, 0.025, z);
  }
  bit(g, box(0.56, 0.012, run), '#24252a', 0, 0.15, zr + run / 2);
  // The roller at each end of the belt, and a warning strip of paler stuff at the back.
  for (const z of [zr + 0.005, zr + run - 0.005]) bit(g, cyl(0.03, 0.03, 0.56, 10), '#585a60', 0, 0.128, z, { rz: Math.PI / 2 });
  const slats = Array.from({ length: 14 }, (_v, k) => bit(g, box(0.54, 0.004, 0.018), '#4a4b52', 0, 0.158, zr + (k * run) / 14));
  part(g, rbox(0.78, 0.22, 0.3, 0.06), shade(c, 0.85), 0, 0.15, head + 0.14);
  bit(g, box(0.5, 0.012, 0.012), tint(c, 0.3), 0, 0.26, head + 0.26);
  // Uprights up to the console, and the rails at a walker's hand height, foam-gripped.
  for (const sx of [-1, 1]) {
    part(g, rbox(0.05, 1.15, 0.06, 0.02), STEEL, sx * 0.33, 0.72, head + 0.14, { rx: 0.18 });
    bit(g, cyl(0.022, 0.022, 0.6, 8), '#e0e0e0', sx * 0.33, 1.02, head + 0.55, { rx: Math.PI / 2 });
    bit(g, cyl(0.026, 0.026, 0.26, 8), '#2c2d31', sx * 0.33, 1.02, head + 0.72, { rx: Math.PI / 2 });
  }
  // A towel over the left rail, a bottle in the holder.
  part(g, rbox(0.012, 0.26, 0.16, 0.004), '#7fb3c9', -0.355, 0.91, head + 0.44, { outline: false });
  part(g, rbox(0.012, 0.26, 0.16, 0.004), '#7fb3c9', -0.305, 0.91, head + 0.44, { outline: false });
  bit(g, box(0.06, 0.02, 0.16), '#7fb3c9', -0.33, 1.045, head + 0.44);
  const con = group(g, 0, 1.28, head + 0.05);
  con.rotation.x = -0.5;
  part(con, rbox(0.7, 0.26, 0.11, 0.04), c, 0, 0, 0);
  bit(con, box(0.46, 0.18, 0.01), '#15161a', 0, 0.01, 0.055);
  for (const sx of [-1, 1]) {
    for (let k = 0; k < 2; k++) bit(con, cyl(0.016, 0.016, 0.012, 10), k ? '#e6503a' : '#49b56a', sx * 0.29, 0.04 - k * 0.06, 0.056, { rx: Math.PI / 2 });
  }
  bit(con, cyl(0.032, 0.03, 0.075, 10), '#2d2e33', 0.285, -0.1, 0.075);
  part(con, cyl(0.026, 0.026, 0.13, 10), '#5fb3a8', 0.285, -0.03, 0.075);
  bit(con, cyl(0.014, 0.014, 0.03, 8), '#ece8d9', 0.285, 0.05, 0.075);
  // The display: the time, the distance, the calories and the pace, counted from when they stepped on. Off with the power, by Built.screen.
  const face = liveCanvas(256, 96, () => undefined);
  const mat = new THREE.MeshBasicMaterial({ map: face.tex, color: '#2a3140' });
  const s = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.165), mat);
  s.userData.ownGeometry = s.userData.ownMaterial = true;
  s.position.set(0, 0.01, 0.0615);
  con.add(s);
  out.screen = s;
  const draw = (secs: number) => {
    const x = face.ctx;
    if (!x) return;
    const min = Math.floor(secs / 60) % 100;
    const sec = Math.floor(secs % 60);
    x.fillStyle = '#071410';
    x.fillRect(0, 0, 256, 96);
    x.textBaseline = 'middle';
    x.fillStyle = '#9ff5c3';
    x.font = 'bold 34px monospace';
    x.fillText(`${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`, 12, 30);
    x.font = 'bold 19px monospace';
    x.fillStyle = '#ffd77a';
    x.fillText(`${((secs / 3600) * 5.2).toFixed(2)}km`, 140, 20);
    x.fillStyle = '#ff9d7a';
    x.fillText(`${Math.floor(secs * 0.11)}kcal`, 140, 44);
    x.fillStyle = '#9ad7ff';
    x.font = '15px monospace';
    x.fillText('5.2km/h', 12, 62);
    // A course's bars with the place you've got to.
    const n = 24;
    const on = Math.floor(secs / 110) % n;
    for (let i = 0; i < n; i++) {
      const h = 7 + ((i * 7) % 5) * 3;
      x.fillStyle = i === on ? '#ffffff' : i < on ? '#4fd08b' : '#1f4a38';
      x.fillRect(90 + i * 6.6, 90 - h, 5, h);
    }
    face.tex.needsUpdate = true;
  };
  let began = -1;
  let last = -1e9;
  let shown = -1;
  out.animate = (t) => {
    if (t - last > 0.6) began = t;
    last = t;
    // The belt runs back under the walker, at their pace.
    slats.forEach((m, k) => (m.position.z = zr + ((((k * run) / 14 + t * 1.3) % run) + run) % run));
    // In the game's time, 2 minutes to the second at normal speed; painted a few times a second.
    const tick = Math.floor(t * 5);
    if (tick !== shown) {
      shown = tick;
      draw(Math.max(0, t - began) * 120);
    }
  };
  draw(0);
  out.work = marker(g, 0, 0.5, head + 0.3);
};

// -------------------------------------------------------------------------------------------------
// The easel: a canvas that fills stroke by stroke, a palette and brush off the stand beside it, jars and tubes, a dust sheet.

const easel: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  // The dust sheet under it all, flecked with paint.
  picture(g, 0.96, 0.96, 160, (c, W, H) => {
    c.fillStyle = '#ded3bd';
    c.fillRect(0, 0, W, H);
    const cols = ['#c9543f', '#3f7cb0', '#e0b33f', '#4f9a62', '#8a5aa8'];
    for (let i = 0; i < 40; i++) {
      c.fillStyle = cols[i % cols.length];
      c.beginPath();
      c.arc(((i * 61) % 97) / 97 * W, ((i * 37) % 89) / 89 * H, Math.max(0.5, 1 + (i % 4)), 0, Math.PI * 2);
      c.fill();
    }
  }, 0, 0.006, 0).rotation.x = -Math.PI / 2;
  // The A-frame: two front legs and a back one, a cross brace, a mast the ledge runs on.
  const wood = BEECH;
  for (const sx of [-1, 1]) rod(g, v(sx * 0.06, 1.62, -0.04), v(sx * 0.34, 0.01, 0.2), 0.018, wood);
  rod(g, v(0, 1.62, -0.05), v(0, 0.01, -0.4), 0.018, wood);
  rod(g, v(-0.24, 0.55, 0.13), v(0.24, 0.55, 0.13), 0.012, shade(wood, 0.85));
  rod(g, v(0, 1.0, -0.14), v(0, 0.56, 0.12), 0.01, shade(wood, 0.85));
  rod(g, v(0, 1.66, -0.02), v(0, 0.62, 0.11), 0.014, shade(wood, 0.92));
  part(g, rbox(0.1, 0.04, 0.05, 0.01), shade(wood, 0.8), 0, 1.65, -0.02);
  bit(g, cyl(0.012, 0.012, 0.14, 8), BRASS_D, 0, 0.72, 0.135, { rz: Math.PI / 2 });

  // The ledge and the canvas move together, down to a shorter painter.
  const rig = group(g, 0, EZ.y, EZ.z, 'canvasRig');
  rig.rotation.x = -EZ.tilt;
  part(rig, rbox(EZ.w + 0.06, 0.028, 0.08, 0.008), shade(wood, 0.9), 0, -EZ.h / 2 - 0.018, 0.012);
  part(rig, rbox(0.1, 0.03, 0.03, 0.008), shade(wood, 0.8), 0, EZ.h / 2 + 0.018, 0);
  part(rig, rbox(EZ.w, EZ.h, 0.03, 0.004), '#ece6d6', 0, 0, 0);
  const CW = 256;
  const CH2 = 208;
  const paint = liveCanvas(CW, CH2, (c) => {
    c.fillStyle = '#f6f2e6';
    c.fillRect(0, 0, CW, CH2);
  });
  const mat = textured(paint.tex);
  const canvas = new THREE.Mesh(new THREE.PlaneGeometry(EZ.w - 0.01, EZ.h - 0.01), mat);
  canvas.userData.ownGeometry = canvas.userData.ownMaterial = true;
  canvas.position.z = 0.0165;
  canvas.name = 'painting';
  rig.add(canvas);
  let drawn = 0;
  let plan = paintPlan(0);
  const clear = () => {
    if (paint.ctx) {
      paint.ctx.fillStyle = '#f6f2e6';
      paint.ctx.fillRect(0, 0, CW, CH2);
    }
    drawn = 0;
    paint.tex.needsUpdate = true;
  };
  const strokes = (to: number) => {
    const x = paint.ctx;
    const end = Math.max(0, Math.min(PAINT_N, Math.floor(to)));
    if (!plan.length) return;
    while (drawn < end) {
      const st = plan[drawn % plan.length];
      drawn++;
      if (!x) continue;
      x.strokeStyle = st.c;
      x.lineCap = 'round';
      x.lineWidth = Math.max(1, Math.abs(st.w) * CH2 * 0.45);
      x.beginPath();
      x.moveTo(((st.x0 + 1) / 2) * CW, ((1 - st.y0) / 2) * CH2);
      x.lineTo(((st.x1 + 1) / 2) * CW, ((1 - st.y1) / 2) * CH2);
      x.stroke();
    }
    paint.tex.needsUpdate = true;
  };
  // Something left standing on it from before: begun, not finished.
  strokes(26);

  // The taboret on the left: jars of brushes, tubes, a rag; the palette and brush rest on its top.
  const tx = EZ.rest[0];
  const tz = EZ.rest[2];
  const top = EZ.rest[1] - 0.012;
  part(g, rbox(0.24, 0.025, 0.3, 0.01), shade(wood, 0.8), tx, top - 0.012, tz);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) rod(g, v(tx + sx * 0.09, top - 0.02, tz + sz * 0.12), v(tx + sx * 0.1, 0.01, tz + sz * 0.13), 0.012, shade(wood, 0.8));
  part(g, rbox(0.2, 0.012, 0.26, 0.004), shade(wood, 0.8), tx, 0.3, tz);
  // Below on the shelf: tubes, a jar, a rag.
  ['#c9543f', '#3f7cb0', '#e0b33f', '#4f9a62'].forEach((col, i) => {
    bit(g, cyl(0.012, 0.015, 0.09, 8), col, tx - 0.06 + i * 0.04, 0.32, tz + 0.03, { rx: Math.PI / 2 });
  });
  bit(g, cyl(0.035, 0.03, 0.1, 10), '#9fc4cf', tx + 0.04, 0.36, tz - 0.07);
  for (let i = 0; i < 3; i++) bit(g, cyl(0.004, 0.004, 0.2, 6), i ? '#b98a4a' : '#7a4f2c', tx + 0.03 + i * 0.012, 0.44, tz - 0.075, { rz: (i - 1) * 0.12 });
  // The jar of brushes on top, at the back of it.
  part(g, cyl(0.035, 0.03, 0.1, 10), '#cfd8dc', tx, top + 0.05, tz - 0.1);
  for (let i = 0; i < 4; i++) bit(g, cyl(0.004, 0.004, 0.22, 6), ['#b98a4a', '#7a4f2c', '#c9543f', '#3f7cb0'][i], tx - 0.012 + i * 0.008, top + 0.15, tz - 0.1, { rz: (i - 1.5) * 0.12 });
  part(g, rbox(0.1, 0.012, 0.1, 0.004), '#c7c0a8', tx + 0.05, top + 0.006, tz + 0.09, { outline: false });

  // The palette, on the left hand: its thumb hole, its colours. The brush is the tool, in the right hand, on its own.
  const palette = group(g, 0, 0, 0, 'palette');
  const shape = new THREE.Shape();
  shape.ellipse(0, 0, 0.125, 0.09, 0, Math.PI * 2, false, 0);
  const hole = new THREE.Path();
  hole.absellipse(-0.07, -0.03, 0.016, 0.016, 0, Math.PI * 2, true, 0);
  shape.holes.push(hole);
  const pg = new THREE.ExtrudeGeometry(shape, { depth: 0.006, bevelEnabled: false, curveSegments: 12 });
  pg.rotateX(-Math.PI / 2);
  const pm = part(palette, pg, '#b98a5a', 0, 0, 0, { outline: false });
  pm.userData.ownGeometry = true;
  ['#c9543f', '#e0b33f', '#3f7cb0', '#4f9a62', '#f4efe2', '#8a5aa8'].forEach((col, i) => {
    const a = -0.5 + (i / 5) * 2.6;
    bit(palette, dot(0.012), col, 0.03 + Math.cos(a) * 0.065, 0.008, Math.sin(a) * 0.052 - 0.005).scale.y = 0.45;
  });
  const brush = group(g, 0, 0, 0, 'brush');
  part(brush, new THREE.CylinderGeometry(0.0052, 0.0036, 0.22, 8), '#7a4f2c', 0, -0.05, 0, { outline: false }).userData.ownGeometry = true;
  bit(brush, cyl(0.0058, 0.0055, 0.022, 8), STEEL, 0, 0.07, 0);
  const tipMat = new THREE.MeshToonMaterial({ color: '#d9c8a0' });
  const tipMesh = part(brush, new THREE.ConeGeometry(0.0062, 0.026, 8), '#fff', 0, 0.094, 0, { outline: false, material: tipMat });
  tipMesh.userData.ownGeometry = tipMesh.userData.ownMaterial = true;
  const restPal = () => {
    palette.position.fromArray(EZ.rest);
    palette.quaternion.identity();
    brush.position.set(EZ.rest[0] + 0.07, EZ.rest[1] + 0.012, EZ.rest[2] + 0.03);
    brush.quaternion.setFromUnitVectors(UP, v(-0.8, 0.02, 0.5).normalize());
  };
  restPal();
  const s = use(g, 'hfPaint', 0, EZ.stand);
  out.spots = { paint: s };
  out.work = marker(g, 0, EZ.y, EZ.z + 0.04);
  const grips: Partial<Record<Side, Grip>> = { right: { at: v(0, 0, 0), axis: v(0, 1, 0), shape: 'pen', radius: 0.006 } };
  let runs = 0;
  let wasOn = false;
  let shownY = EZ.y;
  out.away = (_o, t) => {
    s.held = null;
    const u = hfLive('hfPaint', s, t);
    if (u === null) {
      wasOn = false;
      restPal();
      if (Math.abs(rig.position.y - EZ.y) > 0.001) rig.position.y += (EZ.y - rig.position.y) * 0.1;
      return;
    }
    const H = heightOf(s);
    if (!wasOn) {
      // A fresh canvas for a new use; each one a different picture.
      wasOn = true;
      runs++;
      s.at.userData.picture = runs;
      plan = paintPlan(runs);
      clear();
    }
    shownY = easelY(H);
    rig.position.y += (shownY - rig.position.y) * 0.2;
    const b = paintBeat(u);
    strokes(b.done);
    const st = plan.length ? plan[b.at % plan.length] : undefined;
    if (st) tipMat.color.set(b.dip > 0.4 ? '#d9c8a0' : st.c);
    const n = hfNow('hfPaint', u, H, t, { picture: runs });
    if (n.sub) palette.position.fromArray(n.sub);
    placeTool(brush, n);
    hold(s, g, n, brush, 'right', grips);
  };
};

// -------------------------------------------------------------------------------------------------
// The violin: lying in its open case on a small table, the bow beside it, a music stand with a page of music.

function violinModel(): THREE.Group {
  // Its end pin at the origin, the neck along +y, the face +z: 0.37 m of body, 0.2 m of neck and peg box, about 0.58 m in all.
  const m = new THREE.Group();
  const tone = '#a4582a';
  const half: Array<[number, number]> = [[0, 0], [0.075, 0.013], [0.104, 0.069], [0.092, 0.122], [0.057, 0.159], [0.056, 0.201], [0.084, 0.243], [0.085, 0.301], [0.051, 0.354], [0, 0.37]];
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.splineThru(half.slice(1).map(([x, y]) => new THREE.Vector2(x, y)));
  s.splineThru(half.slice(0, -1).reverse().map(([x, y]) => new THREE.Vector2(-x, y)));
  const geom = new THREE.ExtrudeGeometry(s, { depth: 0.036, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.003, bevelSegments: 1, curveSegments: 6 });
  geom.translate(0, 0, -0.018);
  part(m, geom, tone, 0, 0, 0, { outline: false }).userData.ownGeometry = true;
  const f = 0.024;
  // The f-holes, the bridge, the tailpiece, the chin rest.
  for (const sx of [-1, 1]) {
    bit(m, box(0.004, 0.05, 0.002), '#26170f', sx * 0.04, 0.175, f);
    bit(m, dot(0.004), '#26170f', sx * 0.042, 0.2, f);
    bit(m, dot(0.004), '#26170f', sx * 0.038, 0.15, f);
  }
  bit(m, box(0.045, 0.004, 0.022), '#e2c28d', 0, 0.175, f + 0.011);
  bit(m, box(0.035, 0.09, 0.006), '#201712', 0, 0.075, f + 0.008);
  part(m, rbox(0.07, 0.05, 0.012, 0.01), '#201712', 0.028, 0.04, f + 0.006, { outline: false });
  // The neck, fingerboard, peg box, scroll and pegs.
  bit(m, box(0.022, 0.13, 0.02), shade(tone, 0.75), 0, 0.42, 0.004);
  bit(m, box(0.025, 0.2, 0.006), '#1b1716', 0, 0.375, f + 0.012);
  bit(m, box(0.022, 0.06, 0.02), shade(tone, 0.75), 0, 0.51, 0.004);
  bit(m, cyl(0.017, 0.017, 0.022, 10), shade(tone, 0.85), 0, 0.555, 0.006, { rz: Math.PI / 2 });
  for (const y of [0.495, 0.525]) bit(m, cyl(0.004, 0.004, 0.056, 5), '#1b1716', 0, y, 0.004, { rz: Math.PI / 2 });
  for (let i = 0; i < 4; i++) bit(m, box(0.0012, 0.36, 0.0012), '#e8e6dc', (i - 1.5) * 0.0055, 0.3, f + 0.019);
  return m;
}
function bowModel(): THREE.Group {
  // The frog at the origin, the stick along +y for 0.7 m, the hair just under it towards -z.
  const b = new THREE.Group();
  b.name = 'bow';
  bit(b, cyl(0.0035, 0.0045, 0.7, 6), '#6a3f24', 0, 0.35, 0.012);
  bit(b, box(0.008, 0.68, 0.001), '#efe9d9', 0, 0.35, 0);
  part(b, rbox(0.014, 0.04, 0.022, 0.004), '#1f1a18', 0, 0.002, 0.006, { outline: false });
  bit(b, box(0.01, 0.018, 0.016), '#d9d1bc', 0, 0.697, 0.006);
  return b;
}

const violin: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  // A small table with a turned look; on it the case, its lid propped, blue inside.
  part(g, rbox(0.84, 0.03, 0.42, 0.012), OAK, 0, 0.7, -0.22);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) rod(g, v(sx * 0.36, 0.69, -0.22 + sz * 0.16), v(sx * 0.38, 0, -0.22 + sz * 0.18), 0.016, shade(OAK, 0.8));
  part(g, rbox(0.8, 0.05, 0.3, 0.02), '#2c2c33', 0, 0.74, -0.2);
  bit(g, box(0.75, 0.004, 0.25), INK_BLUE, 0, 0.7655, -0.2);
  part(g, rbox(0.8, 0.26, 0.018, 0.012), '#2c2c33', 0, 0.86, -0.36, { rx: -0.28 });
  bit(g, box(0.74, 0.22, 0.004), INK_BLUE, 0, 0.86, -0.348, { rx: -0.28 });
  // A cake of rosin in the case, a cloth.
  part(g, cyl(0.022, 0.022, 0.016, 10), '#bb7a2c', 0.32, 0.775, -0.26, { outline: false });
  part(g, rbox(0.1, 0.008, 0.08, 0.003), '#b76b78', -0.32, 0.772, -0.13, { outline: false });
  // The music stand, turned to who's playing, its page of music in front of them.
  const ms = group(g, 0.31, 0, 0.14);
  ms.rotation.y = -0.45;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    rod(ms, v(0, 0.3, 0), v(Math.sin(a) * 0.15, 0, Math.cos(a) * 0.15), 0.006, IRON);
  }
  bit(ms, cyl(0.008, 0.008, 0.85, 6), IRON, 0, 0.72, 0);
  part(ms, box(0.34, 0.24, 0.006), IRON, 0, 1.2, 0, { rx: -0.42 });
  bit(ms, box(0.34, 0.012, 0.03), IRON, 0, 1.09, 0.05);
  picture(ms, 0.3, 0.21, 400, (c, W, H) => {
    c.fillStyle = CREAM;
    c.fillRect(0, 0, W, H);
    c.strokeStyle = '#4c4a44';
    c.fillStyle = '#23211c';
    for (let r = 0; r < 5; r++) {
      const y0 = 8 + r * (H / 5);
      for (let l = 0; l < 5; l++) {
        c.beginPath();
        c.moveTo(4, y0 + l * 3);
        c.lineTo(W - 4, y0 + l * 3);
        c.stroke();
      }
      for (let n = 0; n < 12; n++) {
        const x = 10 + n * (W / 13);
        const y = y0 + ((n * 5 + r * 3) % 5) * 3;
        c.beginPath();
        c.ellipse(x, y, 2.2, 1.6, 0, 0, Math.PI * 2);
        c.fill();
        c.fillRect(x + 1.6, y - 8, 0.8, 8);
      }
    }
  }, 0, 1.2, 0.006).rotation.x = -0.42;

  const tool = violinModel();
  tool.name = 'violin';
  g.add(tool);
  const bow = bowModel();
  tool.add(bow);
  const s = use(g, 'hfViolin', 0, VI.stand);
  out.spots = { playViolin: s };
  out.work = marker(g, 0, 0.9, 0.05);
  const left: Grip = { at: v(0, 0.4, 0.006), axis: v(0, 1, 0), shape: 'power', radius: 0.013 };
  // On the stick just up from the frog, the palm over it: the fingers closed round it, the first one out along the stick.
  const right: Grip = { at: v(0, 0, 0), axis: v(0, 1, 0), palm: v(0, 0, -1), shape: 'trigger', radius: 0.008 };
  const grips: Partial<Record<Side, Grip>> = { left, right };
  const rest = () => {
    const n = hfNow('hfViolin', 0, 1.6, 0);
    tool.scale.setScalar(1);
    placeTool(tool, n);
    if (n.sub && n.subAxis) {
      bow.position.fromArray(n.sub);
      bow.quaternion.copy(basisQ(n.subAxis, [0, 0, 1]));
    }
  };
  rest();
  let atRest = true;
  out.away = (_o, t) => {
    s.held = null;
    const u = hfLive('hfViolin', s, t);
    if (u === null) {
      if (!atRest) rest();
      atRest = true;
      return;
    }
    atRest = false;
    const n = hfNow('hfViolin', u, heightOf(s), t);
    placeTool(tool, n);
    tool.scale.setScalar(n.v.scale);
    if (n.sub && n.subAxis) {
      bow.position.fromArray(n.sub);
      // The stick's own +z, its hair under it, kept off the violin's face.
      bow.quaternion.copy(basisQ(n.subAxis, [0, 0, 1]));
      right.at.fromArray(n.sub).addScaledVector(vv(n.subAxis).normalize(), 0.035).addScaledVector(v(0, 0, 1), 0.012);
      right.axis.fromArray(n.subAxis);
    }
    left.at.y = 0.385 + (n.v.shift ?? 0) * 0.8 + (n.v.vibrato ?? 0);
    hold(s, g, n, tool, 'left', grips);
  };
};

// -------------------------------------------------------------------------------------------------
// The guitar: on its stand, a stool beside it with a song book and a dish of picks; taken up on its strap to be played.

function guitarModel(): THREE.Group {
  // The middle of the body at the origin, the neck along +y, the face +z: 0.5 m of body, 0.3 m of neck, 0.16 m of head, about 0.97 m in all.
  const m = new THREE.Group();
  const top = '#d7a86e';
  const half: Array<[number, number]> = [[0, -0.24], [0.15, -0.205], [0.19, -0.07], [0.125, 0.05], [0.14, 0.15], [0.09, 0.245], [0, 0.26]];
  const s = new THREE.Shape();
  s.moveTo(0, -0.24);
  s.splineThru(half.slice(1).map(([x, y]) => new THREE.Vector2(x, y)));
  s.splineThru(half.slice(0, -1).reverse().map(([x, y]) => new THREE.Vector2(-x, y)));
  const depth = 0.09;
  const geom = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.004, bevelSegments: 1, curveSegments: 7 });
  geom.translate(0, 0, -depth / 2);
  part(m, geom, '#7a4c2c', 0, 0, 0, { outline: false }).userData.ownGeometry = true;
  const face = depth / 2 + 0.0065;
  const faceG = new THREE.ShapeGeometry(s, 7);
  part(m, faceG, top, 0, 0, face, { outline: false }).userData.ownGeometry = true;
  // The rosette and hole, a pick guard, the bridge.
  const circle = (r: number) => new THREE.CircleGeometry(r, 18);
  const ring = part(m, circle(0.058), '#4a2e1c', 0, 0.09, face + 0.001, { outline: false });
  ring.userData.ownGeometry = true;
  const inner = part(m, circle(0.05), '#d7a86e', 0, 0.09, face + 0.0015, { outline: false });
  inner.userData.ownGeometry = true;
  const hole = part(m, circle(0.044), '#17100b', 0, 0.09, face + 0.002, { outline: false });
  hole.userData.ownGeometry = true;
  bit(m, box(0.06, 0.09, 0.0012), '#3a2015', 0.07, 0.03, face + 0.0015, { rz: -0.3 });
  bit(m, box(0.12, 0.018, 0.009), '#2a1a12', 0, -0.13, face + 0.004);
  // The neck and fingerboard with frets, the head with tuners.
  bit(m, box(0.05, 0.31, 0.024), '#8d5e3a', 0, 0.405, 0.012);
  bit(m, box(0.048, 0.31, 0.005), '#2c211b', 0, 0.405, 0.0265);
  for (let i = 0; i < 12; i++) bit(m, box(0.048, 0.0025, 0.0025), '#d6d3cc', 0, 0.555 - (0.29 * (1 - 0.86 ** i)) / (1 - 0.86 ** 12), 0.03);
  part(m, rbox(0.075, 0.16, 0.018, 0.008), '#5c3a24', 0, 0.64, 0.008, { outline: false });
  for (const y of [0.595, 0.64, 0.685]) for (const sx of [-1, 1]) bit(m, cyl(0.005, 0.005, 0.03, 5), '#d6d3cc', sx * 0.05, y, 0.008, { rz: Math.PI / 2 });
  for (let i = 0; i < 6; i++) bit(m, box(0.0012, 0.69, 0.0012), '#e8e6dc', (i - 2.5) * 0.0075, 0.215, face + 0.008);
  return m;
}

const guitar: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  // The stand: an A-frame with a padded yoke and a cradle at the foot.
  const z0 = GT.rest[2];
  for (const sx of [-1, 1]) rod(g, v(sx * 0.03, 0.78, z0 - 0.1), v(sx * 0.19, 0.01, z0 + 0.13), 0.009, IRON);
  rod(g, v(0, 0.78, z0 - 0.1), v(0, 0.01, z0 - 0.26), 0.009, IRON);
  part(g, rbox(0.3, 0.025, 0.06, 0.012), IRON, 0, 0.15, z0 + 0.03);
  bit(g, box(0.07, 0.016, 0.03), '#6e4f2f', 0, 0.8, z0 - 0.1);
  for (const sx of [-1, 1]) bit(g, box(0.012, 0.04, 0.03), IRON, sx * 0.04, 0.82, z0 - 0.1);
  // The stool: its book, a dish of picks, a capo.
  const sx = 0.33;
  const sz = 0.12;
  part(g, cyl(0.14, 0.14, 0.035, 12), BEECH, sx, 0.47, sz);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    rod(g, v(sx + Math.sin(a) * 0.08, 0.455, sz + Math.cos(a) * 0.08), v(sx + Math.sin(a) * 0.12, 0, sz + Math.cos(a) * 0.12), 0.012, shade(BEECH, 0.8));
  }
  part(g, rbox(0.17, 0.02, 0.12, 0.004), '#a6463c', sx - 0.02, 0.5, sz, { outline: false });
  bit(g, cyl(0.03, 0.022, 0.012, 10), CREAM, sx + 0.08, 0.494, sz - 0.07);
  for (let i = 0; i < 3; i++) bit(g, cyl(0.009, 0.012, 0.002, 3), ['#e0b33f', '#3f7cb0', '#c9543f'][i], sx + 0.074 + i * 0.005, 0.502, sz - 0.075 + i * 0.006);
  const tool = guitarModel();
  tool.name = 'guitar';
  g.add(tool);
  // The strap: from the heel up to the left shoulder, stopping at the chest's front (round the back it would only go through the body); on only when it's up.
  const strap = group(tool);
  const qPlay = hfNow('hfGuitar', 0.5, 1.6, 0).q!.clone();
  const toLocal = (p: V, c: V) => vv(p).sub(vv(c)).applyQuaternion(qPlay.clone().invert());
  const cPlay: V = [0.04, 0.98, GT.stand + 0.04 - 0.21];
  const stand = GT.stand + 0.04;
  rod(strap, v(0, 0.27, 0), toLocal([-0.135, 1.4, stand - 0.1], cPlay), 0.008, '#6e3b2a');
  const s = use(g, 'hfGuitar', 0, GT.stand);
  out.spots = { playGuitar: s };
  out.work = marker(g, 0, 0.9, 0.05);
  const left: Grip = { at: v(0, 0.46, 0.012), axis: v(0, 1, 0), shape: 'power', radius: 0.022 };
  const grips: Partial<Record<Side, Grip>> = { left };
  const rest = () => {
    const n = hfNow('hfGuitar', 0, 1.6, 0);
    tool.scale.setScalar(1);
    placeTool(tool, n);
    strap.visible = false;
  };
  rest();
  let atRest = true;
  out.away = (_o, t) => {
    s.held = null;
    const u = hfLive('hfGuitar', s, t);
    if (u === null) {
      if (!atRest) rest();
      atRest = true;
      return;
    }
    atRest = false;
    const n = hfNow('hfGuitar', u, heightOf(s), t);
    placeTool(tool, n);
    tool.scale.setScalar(n.v.scale);
    strap.visible = (n.v.lifted ?? 0) > 0.8;
    left.at.y = n.v.fret ?? 0.46;
    hold(s, g, n, tool, 'left', grips);
  };
};

// -------------------------------------------------------------------------------------------------
// The camera: on its tripod, a strap hanging from it; taken off, raised to the eye, its shutter fired.

const camera: Builder = (g, _W, _D, c, _def, _ctx, out) => {
  const hub = CM.rest[1] - 0.2;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI;
    rod(g, v(Math.sin(a) * 0.035, hub, CM.rest[2] + Math.cos(a) * 0.035), v(Math.sin(a) * 0.33, 0.015, CM.rest[2] + Math.cos(a) * 0.33), 0.012, IRON);
    bit(g, cyl(0.016, 0.02, 0.03, 8), '#1d1d20', Math.sin(a) * 0.33, 0.015, CM.rest[2] + Math.cos(a) * 0.33);
    rod(g, v(0, hub * 0.5, CM.rest[2]), v(Math.sin(a) * 0.19, hub * 0.48, CM.rest[2] + Math.cos(a) * 0.19), 0.005, STEEL);
  }
  part(g, cyl(0.04, 0.036, 0.05, 10), IRON, 0, hub, CM.rest[2]);
  bit(g, cyl(0.013, 0.013, 0.16, 8), STEEL, 0, hub + 0.08, CM.rest[2]);
  part(g, rbox(0.1, 0.022, 0.08, 0.008), IRON, 0, CM.rest[1] - 0.06, CM.rest[2]);
  rod(g, v(0.05, CM.rest[1] - 0.06, CM.rest[2] + 0.03), v(0.12, CM.rest[1] - 0.16, CM.rest[2] + 0.2), 0.006, IRON);
  // The camera, its origin in the middle of its body, the lens along -z, its screen on the back at +z.
  const body = c === '#424242' ? '#34343a' : c;
  const tool = group(g, 0, 0, 0, 'camera');
  part(tool, rbox(0.15, 0.095, 0.06, 0.014), body, 0, 0, 0);
  part(tool, rbox(0.04, 0.075, 0.07, 0.012), shade(body, 0.8), 0.062, -0.006, 0.002);
  part(tool, rbox(0.06, 0.028, 0.05, 0.008), shade(body, 0.85), 0, 0.058, 0);
  part(tool, cyl(0.036, 0.04, 0.05, 14), '#1f1f23', 0, 0, -0.052, { rx: Math.PI / 2 });
  bit(tool, cyl(0.039, 0.039, 0.012, 14), STEEL, 0, 0, -0.036, { rx: Math.PI / 2 });
  part(tool, cyl(0.041, 0.037, 0.02, 14), '#2a2a2f', 0, 0, -0.086, { rx: Math.PI / 2 });
  glow(tool, new THREE.CircleGeometry(0.028, 14), LENS, 0, 0, -0.097, { ry: Math.PI }).userData.ownGeometry = true;
  bit(tool, cyl(0.008, 0.008, 0.008, 8), STEEL, 0.06, 0.05, 0.002);
  bit(tool, cyl(0.009, 0.009, 0.008, 8), '#c9423a', 0.06, 0.053, -0.01);
  // Its screen, lit by Built.screen; a flash of a white square as it fires.
  const sc = screenMesh(0.09, 0.06);
  sc.position.set(-0.015, -0.002, 0.024);
  tool.add(sc);
  out.screen = sc;
  bit(tool, box(0.024, 0.016, 0.006), '#101014', -0.015, 0.045, 0.03);
  const fire = glow(tool, new THREE.CircleGeometry(0.03, 10), SHUTTER, 0, 0.066, -0.026, { ry: Math.PI });
  fire.visible = false;
  fire.userData.ownGeometry = true;
  const straps = [strapRod(g, '#6e4a2c', 0.006), strapRod(g, '#6e4a2c', 0.006)];
  const ends = [v(-0.08, 0.03, 0), v(0.08, 0.03, 0)];
  const s = use(g, 'hfPhoto', 0, CM.stand);
  out.spots = { takePhoto: s };
  out.work = marker(g, 0, CM.rest[1], CM.rest[2] + 0.08);
  const grips: Partial<Record<Side, Grip>> = {
    right: { at: v(0.075, -0.012, 0), axis: v(0, 1, 0), palm: v(-1, 0, 0), shape: 'power', radius: 0.028 },
    left: { at: v(-0.012, -0.042, -0.04), axis: v(-0.85, 0, -0.5), palm: v(0, 1, 0), shape: 'cradle', radius: 0.02 },
  };
  const rest = () => {
    tool.position.fromArray(CM.rest);
    tool.quaternion.identity();
    fire.visible = false;
  };
  const drape = (neck: (i: number) => THREE.Vector3) => {
    tool.updateMatrix();
    straps.forEach((m, i) => setRod(m, ends[i].clone().applyMatrix4(tool.matrix), neck(i)));
  };
  const restStrap = () => {
    rest();
    drape((i) => v(i ? 0.12 : -0.12, CM.rest[1] - 0.34, CM.rest[2] + 0.02));
  };
  restStrap();
  out.away = (_o, t) => {
    s.held = null;
    const u = hfLive('hfPhoto', s, t);
    if (u === null) return restStrap();
    const n = hfNow('hfPhoto', u, heightOf(s), t);
    placeTool(tool, n);
    fire.visible = (n.v.click ?? 0) > 0.5;
    const k = n.v.take ?? 0;
    drape((i) => {
      const hang = v(i ? 0.12 : -0.12, CM.rest[1] - 0.34, CM.rest[2] + 0.02);
      const round = v((n.v.neckX ?? 0) + (i ? 0.075 : -0.075), n.v.neck ?? 1.36, (n.v.neckZ ?? 0) - 0.02);
      return hang.lerp(round, k);
    });
    hold(s, g, n, tool, 'right', grips);
  };
};

// -------------------------------------------------------------------------------------------------
// The planter: a raised bed of three plants that grow by stage, a side shelf with a can, a packet of seed and a basket.

export interface PlantState {
  growth: number;
  water: number;
  weeds: number;
}

const planter: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  const cx = -0.06;
  const w = 0.66;
  const d = 0.42;
  const z = PT.z;
  const top = PT.soil + 0.03;
  // The box of boards on four square legs.
  part(g, box(w, 0.2, d), shade(OAK, 0.82), cx, top - 0.1, z);
  for (let i = 0; i < 3; i++) {
    const y = top - 0.03 - i * 0.07;
    bit(g, box(w + 0.015, 0.058, 0.012), i % 2 ? OAK : tint(OAK, 0.08), cx, y, z + d / 2 + 0.005);
    bit(g, box(w + 0.015, 0.058, 0.012), i % 2 ? OAK : tint(OAK, 0.08), cx, y, z - d / 2 - 0.005);
    bit(g, box(0.012, 0.058, d), OAK, cx - w / 2 - 0.005, y, z);
    bit(g, box(0.012, 0.058, d), OAK, cx + w / 2 + 0.005, y, z);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.05, top - 0.04, 0.05), shade(OAK, 0.75), cx + sx * (w / 2 - 0.01), (top - 0.04) / 2, z + sz * (d / 2 - 0.01));
  part(g, box(w - 0.08, 0.016, d - 0.05), shade(OAK, 0.72), cx, 0.26, z);
  // A pair of terracotta pots and a trowel below.
  part(g, cyl(0.055, 0.04, 0.09, 10), '#b9694a', cx - 0.14, 0.313, z);
  part(g, cyl(0.045, 0.034, 0.075, 10), '#c7795a', cx + 0.03, 0.306, z + 0.06);
  bit(g, box(0.03, 0.006, 0.11), STEEL, cx + 0.18, 0.272, z - 0.03, { ry: 0.5 });
  bit(g, cyl(0.009, 0.009, 0.09, 6), WALNUT, cx + 0.14, 0.273, z + 0.06, { ry: 0.5, rx: Math.PI / 2 });
  // The soil, dark when it's been watered and pale when it's dry, the furrows raked in.
  const soil = (col: string) => part(g, box(w - 0.015, 0.012, d - 0.015), col, cx, PT.soil, z, { outline: false });
  const dry = soil('#8d6b4a');
  const wet = soil('#4c3424');
  wet.visible = false;
  for (let i = 0; i < 3; i++) bit(g, box(w - 0.06, 0.006, 0.012), '#3b2a1e', cx, PT.soil + 0.006, z - 0.09 + i * 0.09);
  // The shelf on the right.
  const sx0 = PT.can[0];
  part(g, rbox(0.2, 0.02, 0.5, 0.006), BEECH, sx0, PT.can[1] - 0.24, -0.04);
  for (const sz of [-1, 1]) rod(g, v(sx0, PT.can[1] - 0.25, -0.04 + sz * 0.2), v(sx0 + 0.02, 0, -0.04 + sz * 0.22), 0.016, shade(BEECH, 0.8));
  rod(g, v(sx0 - 0.1, top - 0.1, z), v(sx0, PT.can[1] - 0.26, -0.1), 0.012, shade(BEECH, 0.8));
  // The basket, on the shelf.
  const bk = PT.basket;
  part(g, cyl(0.07, 0.055, 0.075, 10), '#b98d53', bk[0], bk[1] - 0.05, bk[2]);
  bit(g, new THREE.TorusGeometry(0.06, 0.005, 5, 12, Math.PI), '#94703f', bk[0], bk[1] - 0.012, bk[2]).userData.ownGeometry = true;
  const inBasket = Array.from({ length: 4 }, (_x, i) => {
    const f = bit(g, dot(0.022), i % 2 ? '#e0a53a' : '#d9412e', bk[0] - 0.024 + (i % 2) * 0.046, bk[1] - 0.012 + (i > 1 ? 0.018 : 0), bk[2] - 0.02 + (i > 1 ? 0.03 : 0));
    f.visible = false;
    return f;
  });

  // Each plant: seedling, leafy stage on a stake, flowers, then fruit, all under one group that takes the growth.
  interface Grown {
    root: THREE.Group;
    sprout: THREE.Group;
    leafy: THREE.Group;
    flowers: THREE.Group;
    fruit: THREE.Mesh[];
  }
  const plants: Grown[] = PT.plants.map((x, i) => {
    const root = group(g, x, PT.soil + 0.006, PT.z, 'plant');
    const sprout = group(root);
    bit(sprout, cyl(0.003, 0.004, 0.05, 5), '#6fae4c', 0, 0.025, 0);
    for (const s of [-1, 1]) bit(sprout, dot(0.016), '#86c45c', s * 0.018, 0.053, 0).scale.set(1.3, 0.35, 0.8);
    const leafy = group(root);
    bit(leafy, cyl(0.006, 0.008, 0.32, 6), '#4f8c3e', 0, 0.16, 0);
    // The stake and its ties.
    bit(leafy, box(0.01, 0.42, 0.01), BEECH, 0.03, 0.21, 0.015);
    for (const y of [0.13, 0.28]) bit(leafy, box(0.035, 0.005, 0.012), '#e8dcb8', 0.014, y, 0.01);
    const col = ['#5a9c42', '#4f8c3e', '#6aa84f'];
    for (let k = 0; k < 11; k++) {
      const a = k * 2.4 + i;
      const y = 0.05 + k * 0.03;
      const r = 0.075 - k * 0.002;
      bit(leafy, dot(0.034), col[k % 3], Math.cos(a) * r, y, Math.sin(a) * r * 0.75).scale.set(1.25, 0.42, 0.95);
    }
    const flowers = group(root);
    for (let k = 0; k < 6; k++) {
      const a = k * 1.9 + i * 0.7;
      bit(flowers, dot(0.011), '#f7e27a', Math.cos(a) * 0.075, 0.16 + (k % 4) * 0.045, Math.sin(a) * 0.075 + 0.02);
    }
    const fruitCol = i === 1 ? '#e0a53a' : '#d9412e';
    const fruit: THREE.Mesh[] = [];
    for (let k = 0; k < 6; k++) {
      const a = k * 2.5 + i * 0.9;
      const m = bit(root, dot(0.022 + (k % 3) * 0.003), fruitCol, Math.cos(a) * 0.075, 0.13 + (k % 4) * 0.05, Math.sin(a) * 0.06 + 0.03);
      fruit.push(m);
    }
    return { root, sprout, leafy, flowers, fruit };
  });
  // The fruit that's picked is where the motion goes: two near the front.
  const pickFruit = PT.fruit.slice(0, 2).map((p, i) => bit(g, dot(0.024), i === 1 ? '#e0a53a' : '#d9412e', p[0], p[1], p[2]));
  const weeds = PT.weeds.map(([x, y, zz]) => {
    const t = group(g, x, y, zz, 'weedTuft');
    for (let k = 0; k < 3; k++) bit(t, cyl(0.0015, 0.004, 0.06, 4), '#7a9a3a', (k - 1) * 0.008, 0.03, 0, { rz: (k - 1) * 0.35 });
    t.visible = false;
    return t;
  });
  const seeds = Array.from({ length: 9 }, (_x, i) => {
    const m = bit(g, dot(0.005), '#e8d8a0', PT.plants[i % 3] + ((i * 7) % 5 - 2) * 0.014, PT.soil + 0.012, PT.z + ((i * 3) % 5 - 2) * 0.016);
    m.visible = false;
    return m;
  });

  // ---- The tools.
  const can = group(g, 0, 0, 0, 'wateringCan');
  const zinc = '#7fa6a0';
  part(can, cyl(0.075, 0.09, 0.17, 12), zinc, 0, -0.145, 0);
  bit(can, cyl(0.076, 0.076, 0.012, 12), shade(zinc, 0.8), 0, -0.058, 0);
  // The bail, over the top, for the hand; a second handle at the back; the spout out along -z with its rose.
  rod(can, v(-0.07, -0.06, 0), v(-0.06, -0.012, 0), 0.006, shade(zinc, 0.7));
  rod(can, v(0.07, -0.06, 0), v(0.06, -0.012, 0), 0.006, shade(zinc, 0.7));
  rod(can, v(-0.065, 0, 0), v(0.065, 0, 0), 0.0105, shade(zinc, 0.7));
  rod(can, v(0, -0.19, -0.07), v(0, -0.09, -0.3), 0.013, zinc);
  part(can, cyl(0.04, 0.018, 0.035, 10), shade(zinc, 0.85), 0, -0.085, -0.31, { rx: -1.1 });
  const stream = Array.from({ length: 8 }, () => glow(g, dot(0.007), WATER, 0, 0, 0));
  stream.forEach((m) => (m.visible = false));
  const rose = v(0, -0.085, -0.325);
  const placeCan = () => {
    can.position.fromArray(PT.can);
    can.quaternion.identity();
  };
  placeCan();

  const packet = group(g, 0, 0, 0, 'seedPacket');
  part(packet, new THREE.BoxGeometry(0.085, 0.12, 0.006), '#e8dcb8', 0, 0, 0, { outline: false }).userData.ownGeometry = true;
  bit(packet, box(0.066, 0.06, 0.001), '#8bbf5c', 0, -0.012, 0.0036);
  bit(packet, dot(0.012), '#d9412e', 0, -0.012, 0.004);
  bit(packet, box(0.06, 0.012, 0.001), '#7a5a38', 0, 0.042, 0.0036);
  const placePacket = () => {
    packet.position.fromArray(PT.packet);
    packet.rotation.set(0, 0, 0);
  };
  placePacket();
  const weed = group(g, 0, 0, 0, 'pulledWeed');
  for (let k = 0; k < 3; k++) bit(weed, cyl(0.0015, 0.004, 0.07, 4), '#7a9a3a', (k - 1) * 0.008, 0.035, 0, { rz: (k - 1) * 0.35 });
  bit(weed, dot(0.012), '#4c3424', 0, -0.006, 0);
  weed.visible = false;
  const fruit = group(g, 0, 0, 0, 'pickedFruit');
  bit(fruit, dot(0.024), '#d9412e', 0, 0, 0);
  bit(fruit, cyl(0.002, 0.004, 0.012, 4), '#4f8c3e', 0, 0.026, 0);
  fruit.visible = false;

  const sow = use(g, 'hfSow', PT.x, PT.stand);
  const water = use(g, 'hfWater', PT.x, PT.stand);
  const weeding = use(g, 'hfWeed', PT.x, PT.stand);
  const pick = use(g, 'hfPick', PT.x, PT.stand);
  out.spots = { plantSeeds: sow, waterPlant: water, weedPlant: weeding, harvest: pick };
  out.work = marker(g, cx, PT.soil + 0.04, z + 0.06);
  const uses: Array<[HfMotion, Spot]> = [['hfSow', sow], ['hfWater', water], ['hfWeed', weeding], ['hfPick', pick]];

  const canGrips: Partial<Record<Side, Grip>> = { right: { at: v(0, 0, 0), axis: v(-1, 0, 0), shape: 'power', radius: 0.012 } };
  const packetGrips: Partial<Record<Side, Grip>> = { right: { at: v(0, 0.05, 0), axis: v(1, 0, 0), shape: 'pinch', radius: 0.006 } };
  const weedGrips: Partial<Record<Side, Grip>> = { right: { at: v(0, 0.02, 0), axis: v(0, 1, 0), shape: 'pinch', radius: 0.006 } };
  const fruitGrips: Partial<Record<Side, Grip>> = { right: { at: v(0, 0, 0), axis: v(0, 1, 0), shape: 'pinch', radius: 0.02 } };

  // The plant as the game has it: nothing, or growing. `stage` is shown; for the tests and the lab, its last state stays readable on the group.
  let key = '';
  let ripeNow = false;
  const showPlant = (p: PlantState | undefined) => {
    const g0 = p ? Math.min(1, Math.max(0, p.growth)) : -1;
    const water0 = p ? p.water : 50;
    const weeds0 = p ? p.weeds : 0;
    const k = `${g0.toFixed(2)}|${Math.round(water0 / 5)}|${Math.round(weeds0 / 5)}`;
    if (k === key) return;
    key = k;
    ripeNow = g0 >= 1;
    const droop = water0 < 25 && g0 >= 0 ? 0.26 : 0;
    plants.forEach((pl, i) => {
      pl.root.visible = g0 >= 0;
      pl.sprout.visible = g0 >= 0 && g0 < 0.3;
      pl.leafy.visible = g0 >= 0.3;
      pl.flowers.visible = g0 >= 0.68 && g0 < 1;
      const size = g0 < 0.3 ? 0.55 + g0 * 1.5 : 0.65 + (g0 - 0.3) * 0.65;
      pl.root.scale.setScalar(Math.max(0.1, size * (i === 1 ? 1.06 : 1)));
      pl.root.rotation.z = (i - 1) * droop;
      pl.root.rotation.x = droop * 0.6;
      pl.fruit.forEach((f, n) => (f.visible = g0 >= 1 && n % 3 !== 2));
    });
    pickFruit.forEach((f) => (f.visible = g0 >= 1));
    dry.visible = water0 < 60;
    wet.visible = !dry.visible;
    weeds.forEach((t, i) => {
      t.visible = weeds0 >= 30 + i * 14;
      t.scale.setScalar(0.7 + Math.min(1, weeds0 / 100) * 0.7);
    });
  };
  showPlant(undefined);
  out.plant = showPlant;
  out.away = (_o, t) => {
    sow.held = water.held = weeding.held = pick.held = null;
    stream.forEach((m) => (m.visible = false));
    weed.visible = false;
    fruit.visible = false;
    seeds.forEach((m) => (m.visible = false));
    const now = liveOf(uses, t);
    const n = now ? hfNow(now.m as Exclude<HfMotion, 'hfChess'>, now.u, now.H, t) : null;
    if (!now || !n) {
      placeCan();
      placePacket();
      return;
    }
    if (now.m === 'hfWater' && n.hold) {
      placeTool(can, n);
      hold(now.s, g, n, can, 'right', canGrips);
      if (n.v.pour) {
        const head = rose.clone().applyQuaternion(can.quaternion).add(can.position);
        stream.forEach((m, i) => {
          const p = (t * 1.8 + i / stream.length) % 1;
          m.visible = true;
          const yy = head.y + (PT.soil - head.y) * p;
          m.position.set(head.x + Math.sin(i * 2.1) * 0.03 * p, Math.max(PT.soil + 0.01, yy), head.z + Math.cos(i * 1.7) * 0.025 * p);
        });
      }
    } else placeCan();
    if (now.m === 'hfSow') {
      const on = (n.v.seeds ?? 0) > 0.5;
      seeds.forEach((m) => (m.visible = on));
      if (n.hold) {
        placeTool(packet, n);
        hold(now.s, g, n, packet, 'right', packetGrips);
      } else placePacket();
    } else placePacket();
    if (now.m === 'hfWeed') {
      const pulled = n.v.pulled ?? 0;
      weeds.forEach((tuft, i) => {
        if (i < pulled) tuft.visible = false;
      });
      if (n.hold) {
        weed.visible = true;
        placeTool(weed, n);
        hold(now.s, g, n, weed, 'right', weedGrips);
      }
    }
    if (now.m === 'hfPick') {
      const picked = n.v.pickedNow ?? 0;
      pickFruit.forEach((f, i) => (f.visible = ripeNow && i >= picked));
      inBasket.forEach((f, i) => (f.visible = i < picked));
      if (n.hold) {
        fruit.visible = true;
        placeTool(fruit, n);
        hold(now.s, g, n, fruit, 'right', fruitGrips);
      }
    }
  };
};

// -------------------------------------------------------------------------------------------------
// The bookshelf: shelves of all sorts, each kind of book in its own place, the right one taken down and read.

const COVER: Record<BookKind, string> = { novel: '#3f6a8a', psych: '#b3627d', logic: '#3f4c78', cook: '#d9823f', garden: '#4f8c4a', gourmet: '#2c2826' };
const pageCache = new Map<BookKind, THREE.Material>();
/** A page of each kind of book: text, and a recipe's picture, a plant's drawing, a puzzle, a diagram. */
function pageOf(kind: BookKind): THREE.Material {
  let m = pageCache.get(kind);
  if (m) return m;
  const W = 128;
  const H = 180;
  m = textured(canvasTexture(W, H, (c) => {
    c.fillStyle = kind === 'gourmet' ? '#f7f0dc' : '#fbf6e8';
    c.fillRect(0, 0, W, H);
    c.fillStyle = '#3a342c';
    const text = (y0: number, n: number) => {
      for (let i = 0; i < n; i++) c.fillRect(12, y0 + i * 9, W - 24 - ((i * 13) % 26), 3);
    };
    if (kind === 'novel') text(14, 17);
    else if (kind === 'psych') {
      text(14, 7);
      c.strokeStyle = '#b3627d';
      c.lineWidth = 2;
      for (const r of [14, 26, 38]) {
        c.beginPath();
        c.arc(W / 2, 112, r, 0, Math.PI * 2);
        c.stroke();
      }
      text(158, 2);
    } else if (kind === 'logic') {
      c.strokeStyle = '#3f4c78';
      for (let i = 0; i <= 6; i++) {
        c.lineWidth = i % 3 ? 1 : 2;
        c.beginPath();
        c.moveTo(20 + i * 15, 18);
        c.lineTo(20 + i * 15, 108);
        c.moveTo(20, 18 + i * 15);
        c.lineTo(110, 18 + i * 15);
        c.stroke();
      }
      c.fillStyle = '#3f4c78';
      for (let i = 0; i < 12; i++) c.fillRect(25 + ((i * 2) % 6) * 15, 23 + ((i * 5) % 6) * 15, 5, 5);
      text(122, 5);
    } else if (kind === 'cook' || kind === 'gourmet') {
      c.fillStyle = kind === 'cook' ? '#e6a15a' : '#2c2826';
      c.fillRect(12, 12, W - 24, 60);
      c.fillStyle = '#f7f0dc';
      c.beginPath();
      c.ellipse(W / 2, 46, 30, 18, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = kind === 'cook' ? '#c9543f' : '#a5502a';
      c.beginPath();
      c.ellipse(W / 2, 44, 18, 9, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#3a342c';
      text(84, 10);
    } else {
      c.strokeStyle = '#4f8c4a';
      c.fillStyle = '#6fae55';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(W / 2, 98);
      c.lineTo(W / 2, 20);
      c.stroke();
      for (let i = 0; i < 4; i++) {
        for (const s of [-1, 1]) {
          c.beginPath();
          c.ellipse(W / 2 + s * 16, 38 + i * 17, 14, 6, s * 0.5, 0, Math.PI * 2);
          c.fill();
        }
      }
      c.fillStyle = '#3a342c';
      text(112, 7);
    }
  }));
  pageCache.set(kind, m);
  return m;
}


const bookshelf: Builder = (g, W, D, c, _def, _ctx, out) => {
  const w = Math.min(W - 0.08, 0.92);
  const d = 0.34;
  const H = 1.96;
  const back = -D / 2 + 0.03;
  const front = back + d;
  const zm = back + d / 2;
  const wood = c === '#6d4c41' ? WALNUT : c;
  part(g, box(w, H, 0.02), shade(wood, 0.72), 0, H / 2, back + 0.01);
  for (const sx of [-1, 1]) part(g, rbox(0.03, H, d, 0.008), wood, sx * (w / 2 - 0.015), H / 2, zm);
  part(g, rbox(w + 0.04, 0.04, d + 0.03, 0.01), shade(wood, 0.92), 0, H, zm + 0.005);
  part(g, rbox(w + 0.02, 0.08, d + 0.01, 0.01), shade(wood, 0.8), 0, 0.04, zm);
  const rows = [0.08, 0.42, 0.76, 1.1, 1.44];
  for (const y of [...rows, 1.78].slice(1)) part(g, box(w - 0.05, 0.022, d - 0.03), shade(wood, 0.88), 0, y, zm + 0.005);
  // The stood books: a run of them along a shelf from x0 to x1, a few lying flat, what's between them showing.
  const rowBooks = (row: number, x0: number, x1: number, colors: string[], seed: number, hMin = 0.18, hMax = 0.26) => {
    const y = rows[row] + 0.011;
    let x = x0;
    let i = 0;
    while (x < x1) {
      const n = (seed + i * 7) % 13;
      const t = 0.022 + (n % 4) * 0.008;
      const h = hMin + ((n * 5) % 9) / 8 * (hMax - hMin);
      if (x + t > x1) break;
      const dep = 0.16 + (n % 3) * 0.025;
      const col = colors[(seed + i) % colors.length];
      const lean = n === 7 ? 0.09 : 0;
      part(g, box(t, h, dep), col, x + t / 2, y + h / 2, front - 0.045 - dep / 2, { outline: false, rz: lean });
      // A band or a title on its spine, in fewer than one in two.
      if (n % 2) bit(g, box(t * 0.8, 0.016, 0.002), tint(col, 0.55), x + t / 2, y + h * 0.72, front - 0.044);
      if (n % 3 === 0) bit(g, box(t * 0.6, 0.05, 0.002), shade(col, 0.72), x + t / 2, y + h * 0.42, front - 0.044);
      x += t + 0.002 + lean * 0.2;
      i++;
    }
  };
  // Top: odds and ends and some old volumes. Second down: the novels (left) and psychology (right).
  rowBooks(4, -0.42, -0.1, ['#6a4632', '#8d6a44', '#4e3a2c'], 3, 0.2, 0.26);
  // A small globe, a photo in a frame.
  part(g, cyl(0.04, 0.05, 0.022, 10), BRASS_D, 0.13, rows[4] + 0.022, zm);
  part(g, new THREE.SphereGeometry(0.075, 12, 9), '#5f93b8', 0.13, rows[4] + 0.11, zm).userData.ownGeometry = true;
  bit(g, new THREE.TorusGeometry(0.083, 0.004, 4, 16), BRASS_D, 0.13, rows[4] + 0.11, zm, { ry: 0.5 }).userData.ownGeometry = true;
  part(g, rbox(0.12, 0.15, 0.014, 0.004), WALNUT, 0.33, rows[4] + 0.085, zm + 0.04, { rx: -0.14 });
  bit(g, box(0.095, 0.125, 0.002), '#d9c5a2', 0.33, rows[4] + 0.085, zm + 0.05, { rx: -0.14 });
  const novel = ['#3f6a8a', '#7a4436', '#ad8a4a', '#54744e', '#c9b48a', '#8d5e7a', '#2f4a68'];
  rowBooks(3, -0.43, -0.03, novel, 5, 0.17, 0.24);
  const psych = ['#b3627d', '#c98aa0', '#8d4d68', '#d9b3bf'];
  rowBooks(3, 0.03, 0.43, psych, 2, 0.19, 0.25);
  // Next: logic puzzles (left) with a cube on them; cookbooks, wide and bright (right).
  const logic = ['#3f4c78', '#55648f', '#2f3a5e', '#7686ad'];
  rowBooks(2, -0.43, -0.05, logic, 7, 0.18, 0.24);
  const cook = ['#d9823f', '#e0a53a', '#c9543f', '#efc48a'];
  rowBooks(2, 0.0, 0.43, cook, 1, 0.22, 0.28);
  // Low down: gardening (left), big gourmet volumes in black and gold (right).
  const garden = ['#4f8c4a', '#6faa55', '#3a6e40', '#a0bf72'];
  rowBooks(1, -0.43, -0.03, garden, 4, 0.2, 0.26);
  const gourmet = ['#2c2826', '#3a2a22', '#50301f', '#201c1a'];
  rowBooks(1, 0.05, 0.43, gourmet, 6, 0.24, 0.3);
  // The bottom: a basket and two tall atlases on their sides.
  part(g, rbox(0.34, 0.2, 0.24, 0.03), '#b98d53', -0.2, rows[0] + 0.11, zm);
  for (let i = 0; i < 4; i++) bit(g, box(0.34, 0.006, 0.244), '#94703f', -0.2, rows[0] + 0.04 + i * 0.05, zm);
  part(g, box(0.3, 0.035, 0.24), '#5b3a2a', 0.22, rows[0] + 0.03, zm);
  part(g, box(0.28, 0.035, 0.22), '#2f5563', 0.21, rows[0] + 0.065, zm);
  bit(g, box(0.1, 0.015, 0.002), BRASS, 0.22, rows[0] + 0.03, zm + 0.122);

  // The space where each book stands, and the book itself: shown until it's taken down.
  const slots: Record<string, THREE.Mesh> = {};
  for (const [id, b] of Object.entries(BK)) {
    // A gap is cleared in front of the run by a book drawn proud of it, so the one you take reads.
    const col = COVER[b.kind];
    const m = part(g, box(0.034, b.h, 0.2), col, b.slot[0], b.slot[1], front - 0.07 - 0.1 + 0.05, { outline: false });
    bit(m, box(0.03, 0.02, 0.002), tint(col, 0.6), 0, b.h * 0.26, 0.101);
    slots[id] = m;
  }
  // The book in the hand: two halves on a hinge at the spine; a leaf that turns. Its covers and pages change with the kind.
  const tool = group(g, 0, 0, 0, 'book');
  const coverMat = new THREE.MeshToonMaterial({ color: COVER.novel });
  const half = (side: number) => {
    const h = group(tool, 0, 0, 0);
    const cover = part(h, box(1, 1, 1), '#fff', side / 2, 0, -0.004, { outline: false, material: coverMat });
    cover.userData.ownMaterial = true;
    const pages = part(h, box(1, 1, 1), '#f4eddc', side / 2, 0, 0.004, { outline: false });
    const page = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), pageOf('novel'));
    page.userData.ownGeometry = true;
    page.position.set(side / 2, 0, 0.0095);
    h.add(page);
    return { h, cover, pages, page };
  };
  const a = half(-1);
  const b = half(1);
  const spine = part(tool, box(1, 1, 1), '#fff', 0, 0, -0.008, { outline: false, material: coverMat });
  spine.userData.ownMaterial = true;
  const leafPivot = group(tool, 0, 0, 0.01);
  const leaf = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0.5, 0, 0), new THREE.MeshBasicMaterial({ color: '#fbf6e8', side: THREE.DoubleSide }));
  leaf.userData.ownGeometry = leaf.userData.ownMaterial = true;
  leafPivot.add(leaf);
  tool.visible = false;
  let current: BookPlace | null = null;
  const dress = (bk: BookPlace) => {
    if (current === bk) return;
    current = bk;
    coverMat.color.set(COVER[bk.kind]);
    for (const hf of [a, b]) {
      hf.cover.scale.set(bk.w + 0.006, bk.h + 0.006, 0.004);
      hf.pages.scale.set(bk.w, bk.h, 0.012);
      hf.page.scale.set(bk.w - 0.006, bk.h - 0.008, 1);
      hf.page.material = pageOf(bk.kind);
      hf.cover.position.x = Math.sign(hf.cover.position.x) * (bk.w / 2);
      hf.pages.position.x = Math.sign(hf.pages.position.x) * (bk.w / 2);
      hf.page.position.x = Math.sign(hf.page.position.x) * (bk.w / 2);
    }
    spine.scale.set(0.024, bk.h + 0.006, 0.006);
    leaf.scale.set(bk.w - 0.006, bk.h - 0.01, 1);
  };
  dress(BK.read);
  // The spots: stood where each book is, with the book's time and kind.
  out.spots = {};
  const uses: Array<[HfMotion, Spot, string]> = Object.entries(BK).map(([id, bk]) => {
    const s = use(g, 'hfRead', bk.slot[0] * 0.55, 0.22);
    s.at.userData.book = bk;
    s.at.userData.hfSeconds = bk.seconds;
    out.spots![id] = s;
    return ['hfRead', s, id];
  });
  out.work = marker(g, 0, 1.1, front + 0.03);
  const carryGrip: Grip = { at: v(0, 0.02, 0.05), axis: v(0, 1, 0), shape: 'power', radius: 0.018 };
  const readLeft: Grip = { at: v(-0.08, -0.04, -0.012), axis: v(0, 1, 0), palm: v(0, 0, 1), shape: 'flat', radius: 0.008 };
  const readRight: Grip = { at: v(0.08, -0.04, -0.012), axis: v(0, 1, 0), palm: v(0, 0, 1), shape: 'flat', radius: 0.008 };
  out.away = (_o, t) => {
    for (const [, s] of uses) s.held = null;
    let live: { s: Spot; u: number; id: string } | null = null;
    for (const [m, s, id] of uses) {
      const u = hfLive(m, s, t);
      if (u !== null) {
        live = { s, u, id };
        break;
      }
    }
    for (const id of Object.keys(slots)) slots[id].visible = true;
    if (!live) {
      tool.visible = false;
      return;
    }
    const bk = BK[live.id];
    dress(bk);
    const n = hfNow('hfRead', live.u, heightOf(live.s), t, { book: bk });
    const out2 = (n.v.gone ?? 0) > 0.5;
    slots[live.id].visible = !out2;
    tool.visible = out2;
    if (!out2) return;
    placeTool(tool, n);
    const open = n.v.open ?? 0;
    const closed = (1 - open) * (Math.PI / 2);
    a.h.rotation.y = closed;
    b.h.rotation.y = -closed;
    leaf.visible = (n.v.leaf ?? 0) > 0.001 && (n.v.leaf ?? 0) < 0.999;
    leafPivot.rotation.y = -(n.v.leaf ?? 0) * Math.PI;
    if (!n.hold) return;
    readLeft.at.x = -bk.w * 0.62;
    readRight.at.x = bk.w * 0.62;
    if (open < 0.5) hold(live.s, g, n, tool, 'right', { right: carryGrip });
    else if ((n.v.hand ?? 0) > 0.4) hold(live.s, g, n, tool, 'left', { left: readLeft });
    else hold(live.s, g, n, tool, 'left', { left: readLeft, right: readRight });
  };
};

export const BUILDERS: Record<string, Builder> = { telescope, chessTable, mirror, clothesCabinet, treadmill, easel, violin, guitar, camera, planter, bookshelf };
