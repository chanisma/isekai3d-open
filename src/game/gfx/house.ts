import type { Tile } from '../types';
import { gridBetween, wallGrid, type Walls } from '../walls';
import { MAP_H, MAP_W, buildTiles, idx } from '../world';
import { TILE, ellipse, fillRound, hash, shade } from './draw';

import { FLOOR_BY_ID, NEW_ROOM_WALL, WALL_BY_ID, type FloorStyle, type Room, type WallStyle } from '../decor';
import type { Paint } from '../lots';

const FLOORS = new Set<Tile>(['wood', 'tile', 'carpet']);

/**
 * Rooms like 참고 게임 finds them: floor enclosed by walls (doors close a room too). Floor that runs out
 * onto the lawn is outdoors. Rooms are numbered as found ('room1', 'room2', …); nothing hangs on
 * the numbers (paint is kept per tile, names come from what is in a room). The walls are on the
 * edges (walls.ts); a plan's tiles, with walls a tile thick, give their rooms without them.
 */
export function computeRooms(tiles: Tile[], walls?: Walls): Room[] {
  const rooms: Room[] = new Array(tiles.length).fill('outside');
  const seen = new Uint8Array(tiles.length);
  const grid = walls && wallGrid(walls, tiles.length);
  const rows = tiles.length / MAP_W;
  let n = 0;
  for (let start = 0; start < tiles.length; start++) {
    if (seen[start] || !FLOORS.has(tiles[start])) continue;
    const cells: number[] = [];
    let open = false;
    const stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const i = stack.pop()!;
      cells.push(i);
      const x = i % MAP_W;
      const y = Math.floor(i / MAP_W);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        // Each floor's edge is the lot's edge.
        if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= rows || Math.floor(ny / MAP_H) !== Math.floor(y / MAP_H)) {
          open = true;
          continue;
        }
        const j = idx(nx, ny);
        if (grid && gridBetween(grid, i, j)) continue;
        const t = tiles[j];
        if (t === 'grass' || t === 'path' || t === 'void' || t === 'water') open = true;
        if (seen[j] || !FLOORS.has(t)) continue;
        seen[j] = 1;
        stack.push(j);
      }
    }
    if (open) continue;
    const name = `room${++n}`;
    for (const i of cells) rooms[i] = name;
  }
  return rooms;
}

let roomGrid: Room[] | null = null;
let lights: Array<{ x: number; y: number; radius: number }> = [];
/** Rooms are worked out per lot: the home and a workplace each keep theirs. */
let current: Tile[] | null = null;
const perLot = new WeakMap<Tile[], { grid: Room[]; lights: Array<{ x: number; y: number; radius: number }> }>();

/** Makes `tiles` the lot that roomAt() and the lights answer for (computing its rooms once). */
export function useRooms(tiles: Tile[], walls?: Walls) {
  if (current === tiles) return;
  const known = perLot.get(tiles);
  if (!known) return setRooms(tiles, walls);
  roomGrid = known.grid;
  lights = known.lights;
  current = tiles;
}

/** Recomputes the rooms (and their ceiling lights) after the walls change. */
export function setRooms(tiles: Tile[], walls?: Walls) {
  current = tiles;
  roomGrid = computeRooms(tiles, walls);
  const cells = new Map<Room, Array<[number, number]>>();
  roomGrid.forEach((r, i) => {
    if (r === 'outside') return;
    if (!cells.has(r)) cells.set(r, []);
    cells.get(r)!.push([i % MAP_W, Math.floor(i / MAP_W)]);
  });
  lights = [];
  for (const list of cells.values()) {
    // One light per room, two side by side in a long one.
    const parts = list.length > 60 ? splitByX(list) : [list];
    for (const part of parts) {
      const cx = part.reduce((s, [x]) => s + x, 0) / part.length + 0.5;
      const cy = part.reduce((s, [, y]) => s + y, 0) / part.length + 0.5;
      lights.push({ x: cx, y: cy, radius: Math.max(3, Math.min(6.5, Math.sqrt(part.length) * 0.9)) });
    }
  }
  perLot.set(tiles, { grid: roomGrid, lights });
}

function splitByX(list: Array<[number, number]>): Array<Array<[number, number]>> {
  const xs = list.map(([x]) => x).sort((a, b) => a - b);
  const mid = xs[Math.floor(xs.length / 2)];
  return [list.filter(([x]) => x < mid), list.filter(([x]) => x >= mid)].filter((p) => p.length);
}

export function roomAt(x: number, y: number): Room {
  if (!roomGrid) setRooms(buildTiles());
  if (x < 0 || y < 0 || x >= MAP_W || idx(x, y) >= roomGrid!.length) return 'outside';
  return roomGrid![idx(x, y)];
}

/** Ceiling lights, one per room (two in a long one), at tile centres. */
export function roomLights(): Array<{ x: number; y: number; radius: number }> {
  if (!roomGrid) setRooms(buildTiles());
  return lights;
}

export const SIDING: WallStyle = { id: 'siding', label: '외벽', base: '#c9d6df', accent: '#aebdc8', pattern: 'siding', price: 0 };

/** The wallpaper on the face of a wall on side `side` of tile i: its own paint, else plain cream; siding outdoors. */
export function wallOf(i: number, side: string, room: Room, paint: Paint): WallStyle {
  if (room === 'outside') return SIDING;
  return WALL_BY_ID[paint.wall[`${i}${side}`] ?? NEW_ROOM_WALL] ?? SIDING;
}

/** A floor tile's own paint, else the usual one for its kind (a new floor is oak, tiles cream, carpet lilac). */
const FLOOR_DEFAULT: Partial<Record<Tile, string>> = { wood: 'oakWood', tile: 'creamTile', carpet: 'lilacCarpet' };
export function floorOf(i: number, tile: Tile, paint: Paint): FloorStyle {
  return FLOOR_BY_ID[paint.floor[i] ?? FLOOR_DEFAULT[tile] ?? 'oakWood'] ?? FLOOR_BY_ID.oakWood;
}

export function drawGrass(g: CanvasRenderingContext2D, x: number, y: number) {
  const px = x * TILE;
  const py = y * TILE;
  const tone = hash(x, y) * 14 - 7;
  g.fillStyle = shade('#6db343', tone);
  g.fillRect(px, py, TILE, TILE);
  for (let i = 0; i < 9; i++) {
    const bx = px + hash(x, y, i) * TILE;
    const by = py + hash(x, y, i + 20) * TILE;
    g.strokeStyle = hash(x, y, i + 40) > 0.5 ? 'rgba(40,90,20,0.45)' : 'rgba(170,220,120,0.45)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(bx, by);
    g.lineTo(bx + (hash(x, y, i + 60) - 0.5) * 3, by - 4);
    g.stroke();
  }
  if (hash(x, y, 99) > 0.86) {
    const colors = ['#ffffff', '#ffd54f', '#f48fb1', '#ce93d8'];
    const c = colors[Math.floor(hash(x, y, 98) * colors.length)];
    const fx = px + 8 + hash(x, y, 97) * (TILE - 16);
    const fy = py + 8 + hash(x, y, 96) * (TILE - 16);
    for (let k = 0; k < 5; k++) ellipse(g, fx + Math.cos((k * Math.PI * 2) / 5) * 2.2, fy + Math.sin((k * Math.PI * 2) / 5) * 2.2, 1.6, 1.6, c);
    ellipse(g, fx, fy, 1.2, 1.2, '#fbc02d');
  }
}

function drawWood(g: CanvasRenderingContext2D, x: number, y: number, style: FloorStyle) {
  const px = x * TILE;
  const py = y * TILE;
  const plank = TILE / 4;
  for (let i = 0; i < 4; i++) {
    const row = y * 4 + i;
    const tone = hash(x, row, 3) * 22 - 11;
    g.fillStyle = shade(style.a, tone);
    g.fillRect(px, py + i * plank, TILE, plank);
    // grain
    g.strokeStyle = 'rgba(110,60,25,0.18)';
    g.lineWidth = 0.6;
    g.beginPath();
    const gy = py + i * plank + 2 + hash(x, row, 5) * (plank - 4);
    g.moveTo(px, gy);
    g.bezierCurveTo(px + TILE * 0.3, gy - 1.2, px + TILE * 0.6, gy + 1.2, px + TILE, gy);
    g.stroke();
    // plank seams, staggered per row
    const off = ((row * 37) % 5) / 5;
    if ((x + off * 3) % 3 < 1) {
      g.fillStyle = 'rgba(80,40,15,0.35)';
      g.fillRect(px + off * TILE, py + i * plank, 1, plank);
    }
    g.fillStyle = 'rgba(80,40,15,0.28)';
    g.fillRect(px, py + (i + 1) * plank - 0.6, TILE, 0.6);
  }
}

function drawTileFloor(g: CanvasRenderingContext2D, x: number, y: number, style: FloorStyle) {
  const px = x * TILE;
  const py = y * TILE;
  const half = TILE / 2;
  const { a, b } = style;
  for (let j = 0; j < 2; j++) {
    for (let i = 0; i < 2; i++) {
      const checker = (x * 2 + i + y * 2 + j) % 2 === 0;
      g.fillStyle = shade(checker ? a : b, hash(x * 2 + i, y * 2 + j, 7) * 8 - 4);
      g.fillRect(px + i * half, py + j * half, half, half);
    }
  }
  g.strokeStyle = 'rgba(120,120,120,0.35)';
  g.lineWidth = 0.8;
  g.strokeRect(px + 0.4, py + 0.4, TILE - 0.8, TILE - 0.8);
  g.beginPath();
  g.moveTo(px + half, py);
  g.lineTo(px + half, py + TILE);
  g.moveTo(px, py + half);
  g.lineTo(px + TILE, py + half);
  g.stroke();
}

function drawCarpet(g: CanvasRenderingContext2D, x: number, y: number, style: FloorStyle) {
  const px = x * TILE;
  const py = y * TILE;
  g.fillStyle = style.a;
  g.fillRect(px, py, TILE, TILE);
  for (let i = 0; i < 26; i++) {
    g.fillStyle = hash(x, y, i) > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(40,20,80,0.08)';
    g.fillRect(px + hash(x, y, i + 30) * TILE, py + hash(x, y, i + 60) * TILE, 2, 2);
  }
}

function drawStone(g: CanvasRenderingContext2D, x: number, y: number, style: FloorStyle) {
  const px = x * TILE;
  const py = y * TILE;
  g.fillStyle = style.b;
  g.fillRect(px, py, TILE, TILE);
  const off = (y % 2) * (TILE / 2);
  for (let i = -1; i < 2; i++) {
    const sx = px + off + i * TILE * 0.5;
    for (let j = 0; j < 2; j++) {
      const sy = py + j * (TILE / 2);
      fillRound(g, Math.max(px, sx + 1), sy + 1, Math.min(TILE / 2 - 2, px + TILE - sx - 1), TILE / 2 - 2, 2, shade(style.a, hash(x * 3 + i, y * 2 + j, 9) * 16 - 8));
    }
  }
}

/** Asphalt: dark, speckled with the aggregate. */
function drawAsphalt(g: CanvasRenderingContext2D, x: number, y: number, style: FloorStyle) {
  const px = x * TILE;
  const py = y * TILE;
  g.fillStyle = shade(style.a, hash(x, y, 11) * 6 - 3);
  g.fillRect(px, py, TILE, TILE);
  for (let i = 0; i < 30; i++) {
    g.fillStyle = hash(x, y, i + 5) > 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.12)';
    g.fillRect(px + hash(x, y, i + 31) * TILE, py + hash(x, y, i + 67) * TILE, 1.5, 1.5);
  }
}

/** Concrete: poured in slabs of two tiles, the joints between them. */
function drawConcrete(g: CanvasRenderingContext2D, x: number, y: number, style: FloorStyle) {
  const px = x * TILE;
  const py = y * TILE;
  g.fillStyle = shade(style.a, hash(x >> 1, y >> 1, 13) * 8 - 4);
  g.fillRect(px, py, TILE, TILE);
  for (let i = 0; i < 14; i++) {
    g.fillStyle = 'rgba(90,85,75,0.1)';
    g.fillRect(px + hash(x, y, i + 3) * TILE, py + hash(x, y, i + 41) * TILE, 2, 2);
  }
  g.fillStyle = style.b;
  if (x % 2 === 0) g.fillRect(px, py, 0.8, TILE);
  if (y % 2 === 0) g.fillRect(px, py, TILE, 0.8);
}

/** Bare earth: brown, lumpy, with crumbs of lighter and darker soil and a stone here and there. */
function drawSoil(g: CanvasRenderingContext2D, x: number, y: number, style: FloorStyle) {
  const px = x * TILE;
  const py = y * TILE;
  g.fillStyle = shade(style.a, hash(x, y, 17) * 8 - 4);
  g.fillRect(px, py, TILE, TILE);
  for (let i = 0; i < 26; i++) {
    g.fillStyle = hash(x, y, i + 9) > 0.55 ? 'rgba(255,240,215,0.10)' : style.b;
    const s = 1.5 + hash(x, y, i + 51) * 2.5;
    g.fillRect(px + hash(x, y, i + 23) * TILE, py + hash(x, y, i + 77) * TILE, s, s * 0.7);
  }
  if (hash(x, y, 5) > 0.7) fillRound(g, px + hash(x, y, 6) * (TILE - 6), py + hash(x, y, 7) * (TILE - 5), 4, 3, 1.5, '#a39a8c');
}

export function drawFloor(g: CanvasRenderingContext2D, x: number, y: number, style: FloorStyle) {
  if (style.kind === 'soil') drawSoil(g, x, y, style);
  else if (style.kind === 'asphalt') drawAsphalt(g, x, y, style);
  else if (style.kind === 'concrete') drawConcrete(g, x, y, style);
  else if (style.kind === 'wood') drawWood(g, x, y, style);
  else if (style.kind === 'tile') drawTileFloor(g, x, y, style);
  else if (style.kind === 'carpet') drawCarpet(g, x, y, style);
  else drawStone(g, x, y, style);
}

/** Water: a harbour's, blue-green with the light on its ripples; the quay's shadow where land meets it. */
export function drawWater(g: CanvasRenderingContext2D, x: number, y: number) {
  const px = x * TILE;
  const py = y * TILE;
  g.fillStyle = shade('#2f7f9e', hash(x, y, 21) * 6 - 3);
  g.fillRect(px, py, TILE, TILE);
  for (let i = 0; i < 4; i++) {
    const wy = py + 4 + ((i * 9 + Math.floor(hash(x, y, i + 8) * 6)) % (TILE - 6));
    const wx = px + hash(x, y, i + 30) * (TILE - 12);
    g.strokeStyle = 'rgba(210,240,250,0.45)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(wx, wy);
    g.quadraticCurveTo(wx + 4, wy - 2, wx + 8, wy);
    g.stroke();
  }
}

export function drawPath(g: CanvasRenderingContext2D, x: number, y: number) {
  drawGrass(g, x, y);
  const px = x * TILE;
  const py = y * TILE;
  fillRound(g, px + 5, py + 4, TILE - 10, TILE / 2 - 6, 4, '#c9c3b6', '#9e978a');
  fillRound(g, px + 5, py + TILE / 2 + 2, TILE - 10, TILE / 2 - 6, 4, '#bfb8aa', '#9e978a');
}
