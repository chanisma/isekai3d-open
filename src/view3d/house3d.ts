import * as THREE from 'three';
import { WALL_BY_ID, type WallStyle } from '../game/decor';
import { TILE } from '../game/gfx/draw';
import { SIDING, drawFloor, drawGrass, drawPath, drawWater, floorOf, roomAt, wallOf } from '../game/gfx/house';
import type { Paint } from '../game/lots';
import type { Tile } from '../game/types';
import { edgeLevel, edgeTiles, type EdgeKind, type Walls } from '../game/walls';
import { LEVEL_TILES, MAP_H, MAP_W } from '../game/world';
import { ball, box, canvasTexture, part, textured, toon } from './toon';

/**
 * The house in 3D (docs/3d/01-view.md): one metre a tile, a floor three metres above the last.
 * Walls stand on the lines between tiles (game/walls.ts, as 참고 게임 builds them), centred on the
 * line; floors are the 2D lot's floor art laid as a texture.
 */
export const FLOOR_H = 3;
export const WALL_H = 3;
/** Wall thickness, metres. */
export const WALL_T = 0.16;
/** How tall a wall cut away (참고 게임 cutaway / walls down) stands. */
export const LOW_H = 0.4;
const DOOR_W = 0.84;
const DOOR_H = 2.15;
const SILL = 0.9;
const HEAD = 2.15;

const indoor = (t: Tile | undefined) => t === 'wood' || t === 'tile' || t === 'carpet';

/** Tile centre in the world, for a tile in the lot's stacked rows. */
export function tileToWorld(x: number, y: number): THREE.Vector3 {
  const level = Math.floor(y / MAP_H);
  return new THREE.Vector3(x + 0.5, level * FLOOR_H, (y - level * MAP_H) + 0.5);
}

/** An edge as drawn on its floor: along x (a tile's north side) or z (its west side), from (x, z) one metre on. */
export interface EdgeLine {
  key: string;
  axis: 'x' | 'z';
  x: number;
  z: number;
  kind: EdgeKind;
}

/** The edges of one floor (walls.ts keys), as lines in that floor's metres. */
export function edgeLines(walls: Walls, level: number): EdgeLine[] {
  const out: EdgeLine[] = [];
  for (const [key, kind] of Object.entries(walls)) {
    if (edgeLevel(key) !== level) continue;
    const i = parseInt(key, 10);
    const x = i % MAP_W;
    const z = Math.floor(i / MAP_W) - level * MAP_H;
    out.push({ key, axis: key.endsWith('n') ? 'x' : 'z', x, z, kind });
  }
  return out;
}

/**
 * Where a wall along one axis begins and ends, so corners close without two walls overlapping:
 * one along x reaches half its thickness past a corner it turns (nothing goes on along x there);
 * one along z stops at the face of a wall along x it meets.
 */
export function edgeSpan(walls: Walls, level: number, l: EdgeLine): [number, number] {
  const T = WALL_T / 2;
  const has = (axis: 'x' | 'z', x: number, z: number) => {
    if (x < 0 || z < 0 || x >= MAP_W || z >= MAP_H) return false;
    return !!walls[`${(z + level * MAP_H) * MAP_W + x}${axis === 'x' ? 'n' : 'w'}`];
  };
  if (l.axis === 'x') {
    // The corner at each end: a wall along z there, and none going on along x.
    const turnsAt = (vx: number, on: number) => (has('z', vx, l.z - 1) || has('z', vx, l.z)) && !has('x', on, l.z);
    return [l.x - (turnsAt(l.x, l.x - 1) ? T : 0), l.x + 1 + (turnsAt(l.x + 1, l.x + 1) ? T : 0)];
  }
  const meetsAt = (vz: number) => has('x', l.x - 1, vz) || has('x', l.x, vz);
  return [l.z + (meetsAt(l.z) ? T : 0), l.z + 1 - (meetsAt(l.z + 1) ? T : 0)];
}

/**
 * The walls a camera looking along (dx, dz) would have cut away (참고 게임 cutaway): those with a
 * room behind them as it looks, so the rooms show and the back walls stay. Walls.ts keys.
 */
export function cutaway(walls: Walls, tiles: Tile[], level: number, dx: number, dz: number): Set<string> {
  const out = new Set<string>();
  const sx = Math.sign(Math.round(dx * 1000));
  const sz = Math.sign(Math.round(dz * 1000));
  for (const key of Object.keys(walls)) {
    if (edgeLevel(key) !== level) continue;
    const [a, b] = edgeTiles(key);
    const s = key.endsWith('n') ? sz : sx;
    if (!s) continue;
    const behind = s > 0 ? b : a;
    if (indoor(tiles[behind.y * MAP_W + behind.x])) out.add(key);
  }
  return out;
}

// ---- Wallpaper ----

const PX_PER_M = 96;
const papers = new Map<string, THREE.Texture>();
/** A metre-wide strip of wall, floor to top, in a wallpaper's pattern (with a skirting board indoors). */
function paperTexture(style: WallStyle): THREE.Texture {
  let t = papers.get(style.id);
  if (t) return t;
  const W = PX_PER_M;
  const H = Math.round(PX_PER_M * WALL_H);
  t = canvasTexture(W, H, (g) => {
    g.fillStyle = style.base;
    g.fillRect(0, 0, W, H);
    g.fillStyle = style.accent;
    g.strokeStyle = style.accent;
    const p = style.pattern;
    if (p === 'stripes') for (let x = 0; x < W; x += 32) g.fillRect(x, 0, 12, H);
    else if (p === 'dots') for (let y = 12; y < H; y += 24) for (let x = (y / 24) % 2 ? 8 : 20; x < W; x += 24) g.fillRect(x, y, 4, 4);
    else if (p === 'tiles') {
      g.lineWidth = 2;
      for (let y = 0; y < H; y += 24) (g.beginPath(), g.moveTo(0, y), g.lineTo(W, y), g.stroke());
      for (let x = 0; x < W; x += 24) (g.beginPath(), g.moveTo(x, 0), g.lineTo(x, H), g.stroke());
    } else if (p === 'wainscot') {
      const top = H - SILL * PX_PER_M;
      g.fillRect(0, top, W, H - top);
      g.fillStyle = 'rgba(0,0,0,0.12)';
      for (let x = 6; x < W; x += 32) g.fillRect(x, top + 10, 20, H - top - 24);
      g.fillStyle = '#ffffff';
      g.fillRect(0, top - 5, W, 6);
    } else if (p === 'brick') {
      g.fillStyle = 'rgba(255,255,255,0.35)';
      for (let y = 0, r = 0; y < H; y += 16, r++) {
        g.fillRect(0, y, W, 2);
        for (let x = r % 2 ? 0 : 24; x < W; x += 48) g.fillRect(x, y, 2, 16);
      }
    } else if (p === 'siding') {
      g.fillStyle = 'rgba(0,0,0,0.1)';
      for (let y = 0; y < H; y += 18) g.fillRect(0, y, W, 3);
    }
    if (style.id !== SIDING.id) {
      g.fillStyle = '#fbf8f2';
      g.fillRect(0, H - 12, W, 12);
      g.fillStyle = 'rgba(0,0,0,0.15)';
      g.fillRect(0, H - 13, W, 1.5);
    } else {
      g.fillStyle = '#a69c90';
      g.fillRect(0, H - 14, W, 14);
    }
  });
  papers.set(style.id, t);
  return t;
}

const wallMats = new Map<string, THREE.Material>();
/**
 * Wallpaper on a face `w` metres wide whose pattern starts `u` metres along the wall: the strip
 * repeated to that width and lined up with the world, so the paper runs on unbroken from one piece
 * of wall to the next.
 */
function paper(style: WallStyle, w: number, u = 0): THREE.Material {
  const off = (((u % 1) + 1) % 1);
  const key = `${style.id}|${w.toFixed(3)}|${off.toFixed(2)}`;
  let m = wallMats.get(key);
  if (!m) {
    const t = paperTexture(style).clone();
    t.repeat.set(w, 1);
    t.offset.set(off, 0);
    t.needsUpdate = true;
    wallMats.set(key, (m = textured(t)));
  }
  return m;
}
const CAP = toon('#efe4d2');
export const GLASS = new THREE.MeshToonMaterial({ color: '#bfe3f5', transparent: true, opacity: 0.35, depthWrite: false });
const UNDER = toon('#d9cfc0');

/** The paper a wall shows each side: [the +side, the -side] along its normal (+z for a wall along x, +x for one along z). */
type Sides = [WallStyle, WallStyle];

/**
 * A straight piece of wall from `a` to `b` along `axis` (world metres), on the line `line` across
 * it, from `y0` to `y1` up: papered each side, the paper lined up with the world.
 */
function slab(parent: THREE.Object3D, axis: 'x' | 'z', a: number, b: number, line: number, y0: number, y1: number, [pos, neg]: Sides) {
  const len = b - a;
  if (len <= 0.001 || y1 - y0 <= 0.001) return;
  const h = y1 - y0;
  // Box faces: +x, -x, +y, -y, +z, -z. A face's u runs along +x on +z and -x, the other way on -z and +x.
  const mats =
    axis === 'x'
      ? [paper(pos, WALL_T), paper(pos, WALL_T), CAP, UNDER, paper(pos, len, a), paper(neg, len, -b)]
      : [paper(pos, len, -b), paper(neg, len, a), CAP, UNDER, paper(pos, WALL_T), paper(pos, WALL_T)];
  const m = new THREE.Mesh(axis === 'x' ? box(len, h, WALL_T) : box(WALL_T, h, len), mats);
  m.castShadow = m.receiveShadow = true;
  const c = (a + b) / 2;
  m.position.set(axis === 'x' ? c : line, (y0 + y1) / 2, axis === 'x' ? line : c);
  parent.add(m);
}

// ---- Floors ----

/** The floor art of one floor of the lot as a texture (the 2D lot's own drawings), air left clear. */
function floorTexture(all: Tile[], paint: Paint, level: number, holes: Set<number>): THREE.Texture {
  const base = level * LEVEL_TILES;
  const res = 2;
  return canvasTexture(MAP_W * TILE * res, MAP_H * TILE * res, (g) => {
    g.scale(res, res);
    for (let y = 0; y < MAP_H; y++)
      for (let x = 0; x < MAP_W; x++) {
        const i = base + y * MAP_W + x;
        const t = all[i];
        // The stairwell stays open: the flight shows through from below.
        if (holes.has(i)) continue;
        // Ground laid over the grass outdoors (a work lot's yard, quay or apron), else the lawn.
        if ((t === 'grass' || t === 'path') && paint.floor[i]) drawFloor(g, x, y, floorOf(i, t, paint));
        else if (t === 'water') drawWater(g, x, y);
        else if (t === 'grass') drawGrass(g, x, y);
        else if (t === 'path') drawPath(g, x, y);
        else if (indoor(t)) drawFloor(g, x, y, floorOf(i, t, paint));
      }
  });
}

// ---- The house ----

export interface Door3D {
  /** Where the doorway is, in the lot's tile units (stacked rows): the middle of its edge. */
  x: number;
  y: number;
  /** The axis the wall runs along: the door swings out of it towards whichever side it's pushed. */
  axis: 'x' | 'z';
  leaf: THREE.Object3D;
  open: number;
  /** Which way it swings: +1 towards +z (+x), -1 the other way. */
  side: number;
}

export interface Wall3D {
  /** The wall standing, and as it is when cut away (low, with no door or window). */
  full: THREE.Group;
  low: THREE.Group;
  level: number;
}

export interface House3D {
  root: THREE.Group;
  /** Each floor's group (floor, walls, everything built on it). */
  levels: THREE.Group[];
  /** Each wall (walls.ts key), standing or cut away. */
  walls: Map<string, Wall3D>;
  doors: Door3D[];
  /** The floors to aim clicks at: one plane per floor. */
  pickPlanes: THREE.Mesh[];
  dispose(): void;
}

/**
 * Builds the house: floors, walls with their paper, doors and windows, for every floor of the lot,
 * the floor left open over `holes` (stairwells: tile indices on the floor above a flight).
 */
export function buildHouse(tiles: Tile[], paint: Paint, walls: Walls, levels: number, holes: number[] = []): House3D {
  const open = new Set(holes);
  const root = new THREE.Group();
  root.name = 'house';
  const built = new Map<string, Wall3D>();
  const doors: Door3D[] = [];
  const pickPlanes: THREE.Mesh[] = [];
  const own: Array<{ dispose(): void }> = [];
  const groups: THREE.Group[] = [];
  for (let level = 0; level < levels; level++) {
    const g = new THREE.Group();
    g.name = `floor${level}`;
    g.position.y = level * FLOOR_H;
    root.add(g);
    groups.push(g);
    const tex = floorTexture(tiles, paint, level, open);
    own.push(tex);
    const mat = new THREE.MeshToonMaterial({ map: tex, transparent: false, alphaTest: 0.5, side: level ? THREE.DoubleSide : THREE.FrontSide });
    own.push(mat);
    const geom = new THREE.PlaneGeometry(MAP_W, MAP_H);
    own.push(geom);
    const floor = new THREE.Mesh(geom, mat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(MAP_W / 2, 0.004, MAP_H / 2);
    floor.receiveShadow = true;
    g.add(floor);
    if (level > 0) {
      // The slab under an upper floor, where it's built, so it has an edge from below.
      for (let y = 0; y < MAP_H; y++)
        for (let x = 0; x < MAP_W; x++) {
          const t = tiles[level * LEVEL_TILES + y * MAP_W + x];
          if (t === 'void' || t === undefined || open.has(level * LEVEL_TILES + y * MAP_W + x)) continue;
          const slabMesh = new THREE.Mesh(box(1, 0.18, 1), UNDER);
          slabMesh.position.set(x + 0.5, -0.09, y + 0.5);
          slabMesh.receiveShadow = true;
          g.add(slabMesh);
        }
    }
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(MAP_W, MAP_H), new THREE.MeshBasicMaterial({ visible: false }));
    own.push(plane.geometry, plane.material as THREE.Material);
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(MAP_W / 2, level * FLOOR_H, MAP_H / 2);
    plane.userData.level = level;
    pickPlanes.push(plane);
    root.add(plane);

    // The paper a face shows: its room's, on that side of the tile (outside, the siding).
    const face = (x: number, y: number, side: string): WallStyle => {
      const i = level * LEVEL_TILES + y * MAP_W + x;
      if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H || !indoor(tiles[i])) return SIDING;
      return wallOf(i, side, roomAt(x, y + level * MAP_H), paint);
    };
    for (const l of edgeLines(walls, level)) {
      const full = new THREE.Group();
      const low = new THREE.Group();
      low.visible = false;
      const wall = new THREE.Group();
      wall.userData.edge = l.key;
      wall.add(full, low);
      g.add(wall);
      built.set(l.key, { full, low, level });
      // +z / +x side first: the tile south of a wall along x, east of one along z.
      const sides: Sides = l.axis === 'x' ? [face(l.x, l.z, 'n'), face(l.x, l.z - 1, 's')] : [face(l.x, l.z, 'w'), face(l.x - 1, l.z, 'e')];
      const line = l.axis === 'x' ? l.z : l.x;
      const [a, b] = edgeSpan(walls, level, l);
      const c = (l.axis === 'x' ? l.x : l.z) + 0.5;
      const both = (fill: (into: THREE.Group, h: number) => void) => {
        fill(full, WALL_H);
        fill(low, LOW_H);
      };
      if (l.kind === 'wall') {
        both((into, h) => slab(into, l.axis, a, b, line, 0, h, sides));
        continue;
      }
      // A door or window: the wall either side of the opening, and over (and under) it.
      const opening = l.kind;
      const half = opening === 'door' ? DOOR_W / 2 : 0.36;
      both((into, h) => {
        slab(into, l.axis, a, c - half, line, 0, h, sides);
        slab(into, l.axis, c + half, b, line, 0, h, sides);
        if (opening === 'window') slab(into, l.axis, c - half, c + half, line, 0, Math.min(h, SILL), sides);
        if (h > HEAD) slab(into, l.axis, c - half, c + half, line, opening === 'door' ? DOOR_H : HEAD, h, sides);
      });
      const at = l.axis === 'x' ? new THREE.Vector3(c, 0, line) : new THREE.Vector3(line, 0, c);
      // In tile units, as dwellers stand: tile centres are whole numbers.
      if (opening === 'door') doors.push({ x: at.x - 0.5, y: at.z - 0.5 + level * MAP_H, axis: l.axis, leaf: doorway(full, l.axis, at), open: 0, side: 1 });
      else windowed(full, l.axis, at);
    }
  }
  return {
    root,
    levels: groups,
    walls: built,
    doors,
    pickPlanes,
    dispose() {
      for (const o of own) o.dispose();
    },
  };
}

/** A door frame in an opening centred at `at` and a door that swings open; returns the door's hinge. */
function doorway(wall: THREE.Group, axis: 'x' | 'z', at: THREE.Vector3): THREE.Object3D {
  const half = DOOR_W / 2;
  const frame = '#8d6e4f';
  const piece = (u: number, y: number, w: number, h: number) => {
    const geom = axis === 'x' ? box(w, h, WALL_T + 0.04) : box(WALL_T + 0.04, h, w);
    part(wall, geom, frame, at.x + (axis === 'x' ? u : 0), y, at.z + (axis === 'x' ? 0 : u), { outline: false });
  };
  piece(-half - 0.03, DOOR_H / 2, 0.06, DOOR_H);
  piece(half + 0.03, DOOR_H / 2, 0.06, DOOR_H);
  piece(0, DOOR_H + 0.03, DOOR_W + 0.12, 0.06);
  const hinge = new THREE.Group();
  hinge.position.set(at.x - (axis === 'x' ? half : 0), 0, at.z - (axis === 'x' ? 0 : half));
  const leaf = new THREE.Group();
  hinge.add(leaf);
  const w = DOOR_W - 0.02;
  const geom = axis === 'x' ? box(w, DOOR_H - 0.02, 0.05) : box(0.05, DOOR_H - 0.02, w);
  part(leaf, geom, '#b08b65', axis === 'x' ? w / 2 : 0, DOOR_H / 2, axis === 'x' ? 0 : w / 2);
  for (const side of [-1, 1]) {
    const knob = new THREE.Mesh(ball(0.035), toon('#e8c547'));
    knob.position.set(axis === 'x' ? w - 0.1 : side * 0.05, 1.0, axis === 'x' ? side * 0.05 : w - 0.1);
    leaf.add(knob);
  }
  wall.add(hinge);
  return hinge;
}

/** Glass and its frame in a window opening centred at `at` (the wall round it is built by the caller). */
function windowed(wall: THREE.Group, axis: 'x' | 'z', at: THREE.Vector3) {
  const half = 0.36;
  const glass = new THREE.Mesh(axis === 'x' ? box(half * 2, HEAD - SILL, 0.02) : box(0.02, HEAD - SILL, half * 2), GLASS);
  glass.position.set(at.x, (SILL + HEAD) / 2, at.z);
  wall.add(glass);
  const frame = '#fbf8f2';
  const piece = (u: number, y: number, w: number, h: number) => {
    const geom = axis === 'x' ? box(w, h, WALL_T + 0.05) : box(WALL_T + 0.05, h, w);
    part(wall, geom, frame, at.x + (axis === 'x' ? u : 0), y, at.z + (axis === 'x' ? 0 : u), { outline: false });
  };
  piece(0, SILL, half * 2 + 0.1, 0.06);
  piece(0, HEAD, half * 2 + 0.1, 0.06);
  piece(-half, (SILL + HEAD) / 2, 0.05, HEAD - SILL);
  piece(half, (SILL + HEAD) / 2, 0.05, HEAD - SILL);
  piece(0, (SILL + HEAD) / 2, 0.035, HEAD - SILL);
}

/** The wallpaper style a wall tile shows (for tests and tools). */
export const styleOf = (id: string | undefined) => WALL_BY_ID[id ?? ''] ?? SIDING;
