import { getDef } from './catalog';
import type { Dir, PlacedObject, SkillKey, SocialDef, Tile } from './types';
import type { CoworkerSpec, WorkTask } from './workplace';
import { MAP_H, MAP_W, buildBlocked, footprintTiles, frontTiles, idx } from './world';

/** Building blocks for the work lots (workplace.ts and the lots in their own files). */

export const OUTDOOR: Tile = 'grass';

/** A building like the home's outline (so the street and the exit line up), with rooms inside. */
export function building(rooms: Array<[number, number, number, number, Tile]>, doors: Array<[number, number]>): Tile[] {
  const t: Tile[] = new Array(MAP_W * MAP_H).fill(OUTDOOR);
  const fill = (x0: number, y0: number, x1: number, y1: number, v: Tile) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) t[idx(x, y)] = v;
  };
  fill(1, 1, 24, 14, 'wall');
  for (const [x0, y0, x1, y1, v] of rooms) fill(x0, y0, x1, y1, v);
  for (const [x, y] of doors) t[idx(x, y)] = 'door';
  fill(12, 15, 12, 17, 'path');
  return t;
}

export const o = (defId: string, x: number, y: number, dir: Dir = 'down') => ({ defId, x, y, dir });

export const chat = (n: number): WorkTask => ({ id: 'chat', label: '동료와 이야기하기', social: 'coworker', need: n, count: 0 });
export const task = (id: string, label: string, does: string[], need = 1): WorkTask => ({ id, label, does, need, count: 0 });

/**
 * Socials that are the job, done to the people who come in (ours, after Get to Work's examine /
 * interrogate interactions): they land better with the job's skill and send the client away seen to.
 */
export function workSocial(id: string, label: string, icon: string, careers: string[], skill: SkillKey, duration = 20): SocialDef {
  return {
    id,
    label,
    icon,
    duration,
    effects: { social: 0.5 },
    category: 'friendly',
    great: 10,
    fail: -8,
    work: careers,
    skillCheck: skill,
    outcomes: { great: { friend: 'S', mood: { friendly: 5 } }, ok: { friend: 'S' }, fail: {} },
  };
}

/**
 * A farm: open fields with a farmhouse on the right (kitchen above, packing room below) and a
 * farm stand by the road. Ours; the only work lot that isn't one building.
 */
export const farmTiles = (): Tile[] => {
  const t: Tile[] = new Array(MAP_W * MAP_H).fill(OUTDOOR);
  const fill = (x0: number, y0: number, x1: number, y1: number, v: Tile) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) t[idx(x, y)] = v;
  };
  fill(16, 1, 24, 10, 'wall');
  fill(17, 2, 23, 5, 'wood');
  fill(17, 7, 23, 9, 'tile');
  for (const [x, y] of [[16, 4], [16, 8], [20, 6], [20, 10]]) t[idx(x, y)] = 'door';
  fill(12, 15, 12, 17, 'path');
  return t;
};

/**
 * A base (2026-11-03, at the user's request): the yard takes the left of the lot, for what's done in the open, and the block on the right holds
 * the operations room, the maintenance room, the mess and the barracks, its doors on the yard.
 */
export const baseTiles = (): Tile[] => {
  const t: Tile[] = new Array(MAP_W * MAP_H).fill(OUTDOOR);
  const fill = (x0: number, y0: number, x1: number, y1: number, v: Tile) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) t[idx(x, y)] = v;
  };
  fill(15, 1, 24, 14, 'wall');
  fill(16, 2, 23, 4, 'wood');
  fill(16, 6, 19, 8, 'tile');
  fill(16, 10, 19, 13, 'wood');
  fill(21, 6, 23, 13, 'carpet');
  for (const [x, y] of [[15, 3], [15, 7], [15, 12], [20, 10]]) t[idx(x, y)] = 'door';
  fill(12, 15, 12, 17, 'path');
  return t;
};

/** Offices around a lobby (the law firm's plan): two rooms upstairs, the lobby and a side room below. */
export const officeTiles = (a: Tile, b: Tile, c: Tile, d: Tile) => () =>
  building([[2, 2, 11, 8, a], [13, 2, 23, 8, b], [2, 10, 16, 13, c], [18, 10, 23, 13, d]], [[6, 9], [15, 9], [17, 12], [12, 14]]);
/** A big room, two side rooms and a lobby (the photo studio's plan). */
export const studioTiles = (a: Tile, b: Tile, c: Tile, d: Tile) => () =>
  building([[2, 2, 14, 9, a], [16, 2, 23, 7, b], [16, 9, 23, 13, c], [2, 11, 14, 13, d]], [[8, 10], [15, 5], [15, 12], [19, 8], [12, 14]]);
/** A big room, a side room and a staff room, the lobby below (the salon's plan). */
export const hallTiles = (a: Tile, b: Tile, c: Tile, d: Tile) => () =>
  building([[2, 2, 15, 9, a], [17, 2, 23, 7, b], [17, 9, 23, 13, c], [2, 11, 15, 13, d]], [[8, 10], [16, 5], [16, 12], [20, 8], [12, 14]]);

/**
 * A task only from a stage or rung, or only in a branch, and what an entry worker does instead
 * (workStages.ts fitTask; 2026-10-26, at the user's request — no 조제 for the 약국 보조원).
 */
export const gated = (t: WorkTask, gate: Pick<WorkTask, 'minStage' | 'minLevel' | 'branch'>, instead?: WorkTask): WorkTask => ({ ...t, ...gate, ...(instead ? { instead } : {}) });

/** Talking with the boss as one of the day's tasks. */
export const boss = (label: string): WorkTask => ({ id: 'boss', label, social: 'boss', need: 1, count: 0 });

type Thing = Omit<PlacedObject, 'uid'>;

/** A work lot's restroom: its floor tiles and its door. */
export interface Restroom {
  cells: number[];
  door: { x: number; y: number };
}

const FLOOR = new Set<Tile>(['wood', 'tile', 'carpet']);

/**
 * A proper restroom for a work lot (ours, at the user's request: "각 근무지 살펴보고 제대로 화장실
 * 만들어줘(위치나 가구 배치나 제대로)"). The lot's toilet, and the sink beside it, come out; a small
 * room at least 2 × 2 inside is fitted where the building has space, tucked into a corner (the
 * room the toilet was in first), with its door set in its wall, the toilet and the sink along the
 * back wall facing it, and a free tile outside the door. A place is only used if every piece of
 * furniture, every floor tile and every spot people stand at (`keep`) can still be reached from the
 * street; if none fits, the lot keeps its toilet as it was.
 */
export function withRestroom(tiles: Tile[], objects: Thing[], keep: Array<{ x: number; y: number }> = []): { tiles: Tile[]; objects: Thing[]; restroom: Restroom | null } {
  const toilets = objects.filter((o) => o.defId === 'toilet');
  if (!toilets.length) return { tiles, objects, restroom: null };
  const near = (o: Thing) => toilets.some((t) => Math.abs(t.x - o.x) + Math.abs(t.y - o.y) <= 3);
  const base = objects.filter((o) => o.defId !== 'toilet' && !(o.defId === 'sink' && near(o)));
  const taken = new Set<number>();
  for (const o of base) for (const p of footprintTiles(getDef(o.defId), o.x, o.y, o.dir)) taken.add(idx(p.x, p.y));
  for (const p of keep) taken.add(idx(p.x, p.y));
  const rooms = roomIds(tiles);
  const homeRoom = rooms[idx(toilets[0].x, toilets[0].y)];
  const entrance = { x: 12, y: MAP_H - 1 };
  type Option = { score: number; tiles: Tile[]; objects: Thing[]; restroom: Restroom };
  const options: Option[] = [];
  const sizes: Array<[number, number]> = [
    [2, 2],
    [3, 2],
    [2, 3],
  ];
  const dirs: Dir[] = ['down', 'up', 'left', 'right'];
  for (const [iw, ih] of sizes)
    for (const d of dirs)
      for (let y0 = 2; y0 + ih - 1 <= MAP_H - 4; y0++)
        for (let x0 = 2; x0 + iw - 1 <= MAP_W - 3; x0++) {
          const x1 = x0 + iw - 1;
          const y1 = y0 + ih - 1;
          // Inside: open floor (or lawn, for a little outhouse where the building has no room), nothing on it.
          let fine = true;
          for (let y = y0; y <= y1 && fine; y++) for (let x = x0; x <= x1 && fine; x++) fine = (FLOOR.has(tiles[idx(x, y)]) || tiles[idx(x, y)] === 'grass') && !taken.has(idx(x, y));
          if (!fine) continue;
          // The walls round it: walls already, or bare floor that can be walled.
          let walls = 0;
          let built = 0;
          for (let y = y0 - 1; y <= y1 + 1 && fine; y++)
            for (let x = x0 - 1; x <= x1 + 1 && fine; x++) {
              if (x >= x0 && x <= x1 && y >= y0 && y <= y1) continue;
              const t = tiles[idx(x, y)];
              if (t === 'wall') walls++;
              else if ((FLOOR.has(t) || t === 'grass') && !taken.has(idx(x, y))) built++;
              else fine = false;
            }
          if (!fine) continue;
          // The door, in the middle of the wall on side `d`, opening onto free floor.
          const doorAt = (k: number) =>
            d === 'down' ? { x: x0 + k, y: y1 + 1 } : d === 'up' ? { x: x0 + k, y: y0 - 1 } : d === 'left' ? { x: x0 - 1, y: y0 + k } : { x: x1 + 1, y: y0 + k };
          const outOf = (p: { x: number; y: number }) => (d === 'down' ? { x: p.x, y: p.y + 1 } : d === 'up' ? { x: p.x, y: p.y - 1 } : d === 'left' ? { x: p.x - 1, y: p.y } : { x: p.x + 1, y: p.y });
          const span = d === 'down' || d === 'up' ? iw : ih;
          for (let k = 0; k < span; k++) {
            const door = doorAt(k);
            const before = outOf(door);
            // Opening onto the room it stands in: indoors onto floor, an outhouse onto the lawn.
            const front = tiles[idx(before.x, before.y)];
            const indoor = FLOOR.has(tiles[idx(x0, y0)]);
            if (!(indoor ? FLOOR.has(front) : front === 'grass') || taken.has(idx(before.x, before.y))) continue;
            // Toilet and sink along the back wall, facing the door; the rest of the floor stays clear.
            const face: Dir = d;
            const back =
              d === 'down'
                ? [{ x: x0, y: y0 }, { x: x0 + 1, y: y0 }]
                : d === 'up'
                  ? [{ x: x0, y: y1 }, { x: x0 + 1, y: y1 }]
                  : d === 'left'
                    ? [{ x: x1, y: y0 }, { x: x1, y: y0 + 1 }]
                    : [{ x: x0, y: y0 }, { x: x0, y: y0 + 1 }];
            // Keep the tile just inside the door clear.
            const inside = d === 'down' ? { x: door.x, y: y1 } : d === 'up' ? { x: door.x, y: y0 } : d === 'left' ? { x: x0, y: door.y } : { x: x1, y: door.y };
            if (back.some((p) => p.x === inside.x && p.y === inside.y)) continue;
            const t = tiles.slice();
            for (let y = y0 - 1; y <= y1 + 1; y++) for (let x = x0 - 1; x <= x1 + 1; x++) if (!(x >= x0 && x <= x1 && y >= y0 && y <= y1)) t[idx(x, y)] = 'wall';
            t[idx(door.x, door.y)] = 'door';
            const cells: number[] = [];
            for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) (t[idx(x, y)] = 'tile'), cells.push(idx(x, y));
            const fixtures: Thing[] = [
              { defId: 'toilet', x: back[0].x, y: back[0].y, dir: face },
              { defId: 'sink', x: back[1].x, y: back[1].y, dir: face },
            ];
            // Near other doors reads as a cupboard by the door; tucked into a corner reads as a room.
            const doorsBy = [-1, 1].some((s) => {
              const a = d === 'down' || d === 'up' ? { x: before.x + s, y: before.y } : { x: before.x, y: before.y + s };
              return tiles[idx(a.x, a.y)] === 'door';
            });
            // Indoors first: an outhouse on the lawn only when nothing inside fits.
            const lawn = FLOOR.has(tiles[idx(x0, y0)]) ? 0 : 40;
            const score = walls * 3 - built - lawn + (rooms[idx(x0, y0)] === homeRoom ? 10 : 0) - (doorsBy ? 8 : 0) + Math.min(6, (Math.abs(x0 - entrance.x) + Math.abs(y0 - entrance.y)) / 3);
            options.push({ score, tiles: t, objects: [...base, ...fixtures], restroom: { cells, door } });
          }
        }
  options.sort((a, b) => b.score - a.score);
  // Nothing may get worse than the lot was without its toilet, and the new toilet and sink must be usable.
  const want = reachCount(tiles, base, keep);
  for (const opt of options) {
    const got = reachCount(opt.tiles, opt.objects, keep);
    if (got.objects >= want.objects + 2 && got.keep >= want.keep && got.floorCut <= want.floorCut) return opt;
  }
  return { tiles, objects, restroom: null };
}

/** Floor areas closed off by walls and doors, numbered (as house.ts computeRooms, without the lot's levels). */
function roomIds(tiles: Tile[]): Int32Array {
  const room = new Int32Array(MAP_W * MAP_H).fill(-1);
  let n = 0;
  for (let i = 0; i < room.length; i++) {
    if (room[i] >= 0 || !FLOOR.has(tiles[i])) continue;
    const stack = [i];
    room[i] = n;
    while (stack.length) {
      const j = stack.pop()!;
      const x = j % MAP_W;
      const y = Math.floor(j / MAP_W);
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
        const k = idx(nx, ny);
        if (room[k] >= 0 || !FLOOR.has(tiles[k])) continue;
        room[k] = n;
        stack.push(k);
      }
    }
    n++;
  }
  return room;
}

/** From the street: how many objects can be used (some tile round them reached), how many spots reached, how much open floor is cut off. */
function reachCount(tiles: Tile[], objects: Thing[], keep: Array<{ x: number; y: number }>): { objects: number; keep: number; floorCut: number } {
  const placed = objects.map((o, i) => ({ ...o, uid: i + 1 }));
  const blocked = buildBlocked(tiles, placed);
  const seen = new Uint8Array(MAP_W * MAP_H);
  const start = idx(12, MAP_H - 1);
  const queue = [start];
  seen[start] = 1;
  while (queue.length) {
    const i = queue.pop()!;
    const x = i % MAP_W;
    const y = Math.floor(i / MAP_W);
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
      const j = idx(nx, ny);
      if (seen[j] || blocked[j]) continue;
      seen[j] = 1;
      queue.push(j);
    }
  }
  let usable = 0;
  for (const o of placed) {
    const def = getDef(o.defId);
    const fp = footprintTiles(def, o.x, o.y, o.dir);
    const around = fp.flatMap((p) => [
      { x: p.x + 1, y: p.y },
      { x: p.x - 1, y: p.y },
      { x: p.x, y: p.y + 1 },
      { x: p.x, y: p.y - 1 },
    ]);
    // Things used from the front need their front; anything else any side.
    const spots = def.interactions.length && def.interactions.every((i) => i.pose !== 'on') && !def.interactions.some((i) => i.players) ? frontTiles(def, o.x, o.y, o.dir) : around;
    if (!def.interactions.length || spots.some((p) => p.x >= 0 && p.y >= 0 && p.x < MAP_W && p.y < MAP_H && seen[idx(p.x, p.y)])) usable++;
  }
  let floorCut = 0;
  for (let i = 0; i < MAP_W * MAP_H; i++) if (FLOOR.has(tiles[i]) && !blocked[i] && !seen[i]) floorCut++;
  return { objects: usable, keep: keep.filter((p) => seen[idx(p.x, p.y)]).length, floorCut };
}


/**
 * A work lot's building and furniture as the game lays it out: its plan with a restroom fitted,
 * clear of where the worker comes in, the coworkers start and clients stand.
 */
export function workLayout(def: {
  tiles: () => Tile[];
  objects: Thing[];
  coworkers: unknown[];
  clients?: Array<{ spots: Array<[number, number]> }>;
  restrooms?: Array<[number, number, number, number]>;
}): { tiles: Tile[]; objects: Thing[]; restroom: Restroom | null; restrooms: Restroom[] } {
  if (def.restrooms?.length) {
    // Built into the plan: each room's door is the one in the wall round it.
    const tiles = def.tiles();
    const restrooms = def.restrooms.map(([x0, y0, x1, y1]) => {
      const cells: number[] = [];
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) cells.push(idx(x, y));
      let door = { x: -1, y: -1 };
      for (let y = y0 - 1; y <= y1 + 1; y++)
        for (let x = x0 - 1; x <= x1 + 1; x++) if ((x < x0 || x > x1 || y < y0 || y > y1) && (x < x0 || x > x1) !== (y < y0 || y > y1) && tiles[idx(x, y)] === 'door') door = { x, y };
      return { cells, door };
    });
    return { tiles, objects: def.objects, restroom: restrooms[0], restrooms };
  }
  const keep = [{ x: 12, y: 13 }, ...def.coworkers.map((_, i) => ({ x: 4 + i * 3, y: 11 })), ...(def.clients ?? []).flatMap((c) => c.spots.map(([x, y]) => ({ x, y })))];
  const fitted = withRestroom(def.tiles(), def.objects, keep);
  return { ...fitted, restrooms: fitted.restroom ? [fitted.restroom] : [] };
}

/**
 * The floor above a building() plan (2026-11-04, the layout audit: a work lot that needs more room goes up rather than out): open air
 * round the same outline, the rooms and doors inside. Its rows go after the ground floor's; what stands on it is placed at y + MAP_H.
 */
export function upstairs(rooms: Array<[number, number, number, number, Tile]>, doors: Array<[number, number]>): Tile[] {
  const t: Tile[] = new Array(MAP_W * MAP_H).fill('void');
  const fill = (x0: number, y0: number, x1: number, y1: number, v: Tile) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) t[idx(x, y)] = v;
  };
  fill(1, 1, 24, 14, 'wall');
  for (const [x0, y0, x1, y1, v] of rooms) fill(x0, y0, x1, y1, v);
  for (const [x, y] of doors) t[idx(x, y)] = 'door';
  return t;
}
/** A piece on the floor above. */
export const up = (defId: string, x: number, y: number, dir: Dir = 'down') => ({ defId, x, y: y + MAP_H, dir });

/** A plan with some tiles changed: the walls and doors of a small room inside a bigger one. */
export function patch(t: Tile[], cells: Array<[number, number, Tile]>): Tile[] {
  for (const [x, y, v] of cells) t[idx(x, y)] = v;
  return t;
}

const LOOKS: Array<[string, string]> = [['#f8d9c0', '#2b1b10'], ['#eac09a', '#1a1a1a'], ['#c99a6e', '#5b3a1e']];
/** A boss and two colleagues in the job's colours. */
export function crew(names: [string, string, string], shirts: [string, string, string]): CoworkerSpec[] {
  return names.map((name, i) => ({ name, shirt: shirts[i], skin: LOOKS[i][0], hair: LOOKS[i][1], ...(i === 0 ? { boss: true } : {}) }));
}
