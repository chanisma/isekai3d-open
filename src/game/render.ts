import { TVS, getDef } from './catalog';
import { EMOTIONS } from './emotions';
import type { Game } from './game';
import { TILE } from './gfx/draw';
import { roomAt } from './gfx/house';
import type { Expression, Facing } from './gfx/simfigure';
import { SOCIAL_BY_ID } from './socials';
import { LOW_NEED } from './dwellerKnowledge';
import type { Dir, NeedKey, P, PlacedObject, Dweller } from './types';
import { dims, objectCenter } from './world';

export { TILE };

export interface RenderUi {
  mode: 'live' | 'buy';
  hover: P | null;
  placing: { defId: string; dir: Dir; movingUid?: number; paint?: { part: 'wall' | 'floor'; style: string }; build?: import('./game').BuildTool } | null;
  /** Where a room being drawn started (the room tool, while the button is held). */
  roomFrom?: P | null;
  /** The pointer over the lot, in tiles: walls, doors and windows go on the edge nearest it. */
  at?: P | null;
  /** Where a wall being drawn started, a corner of the grid (the wall tool, while the button is held). */
  wallFrom?: P | null;
  /** The edge the wall, door, window or remove tool points at (walls.ts key): the wall under the pointer, else the nearest line. */
  edge?: string | null;
  /** Where a run of wall being taken down started, a corner of the grid (the remove tool dragged along a wall). */
  removeFrom?: P | null;
  /** Which floor is shown (0 the ground floor); everything is drawn in the lot's stacked rows. */
  level?: number;
}


/** The room a click lands in. */
export function roomUnder(_game: Game, p: P) {
  return roomAt(p.x, p.y);
}

/** Where a dweller should be drawn, in tile units (centre). */
export function dwellerDrawPos(game: Game, dweller: Dweller): P {
  const perf = game.performing(dweller);
  if (perf && perf.inter.pose === 'on') return perf.inter.id === 'nap' && perf.obj.defId === 'sofa' ? objectCenter(perf.obj) : game.seatOf(dweller, perf.obj);
  return { x: dweller.x + 0.5, y: dweller.y + 0.5 };
}

/** Top-left tile where an object of this footprint is placed when the cursor is on `hover`. */
export function placementOrigin(defId: string, dir: Dir, hover: P): P {
  const { w, h } = dims(getDef(defId), dir);
  return { x: hover.x - Math.floor((w - 1) / 2), y: hover.y - Math.floor((h - 1) / 2) };
}

const ROT: Record<Dir, number> = { down: 0, left: Math.PI / 2, up: Math.PI, right: -Math.PI / 2 };
const OPPOSITE: Record<Dir, Facing> = { down: 'up', up: 'down', left: 'right', right: 'left' };

function towards(from: P, to: P): Facing {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

/** Render-only memory of where each dweller was last frame, so they face the way they walk. */
const lastSeen = new Map<number, { x: number; y: number; facing: Facing }>();

export type Pose =
  | { kind: 'upright'; facing: Facing; walking: boolean; sitting: boolean }
  | { kind: 'lie'; headX: number; headY: number; angle: number; blanketOf?: PlacedObject };

export function poseOf(game: Game, dweller: Dweller, pos: P): Pose {
  const a = dweller.queue[0];
  if (a?.kind === 'passout') return { kind: 'lie', headX: pos.x * TILE - 8, headY: pos.y * TILE + 4, angle: -Math.PI / 2 };
  const perf = game.performing(dweller);
  if (perf && perf.inter.pose === 'on') {
    const { obj, inter } = perf;
    const def = getDef(obj.defId);
    const c = objectCenter(obj);
    const r = ROT[obj.dir];
    const lying = inter.id === 'sleep' || inter.id === 'nap';
    if (lying && game.isBed(obj)) {
      // In a double bed each sleeper takes the half nearest where they got in.
      if ((def.seats ?? 1) > 1) {
        const seat = game.seatOf(dweller, obj);
        if (obj.dir === 'down' || obj.dir === 'up') c.x = seat.x;
        else c.y = seat.y;
      }
      const off = -(def.h * TILE) / 2 + 19; // pillow, along the bed's local y axis
      return { kind: 'lie', headX: c.x * TILE - Math.sin(r) * off, headY: c.y * TILE + Math.cos(r) * off, angle: r, blanketOf: obj };
    }
    if (lying) {
      const off = -(def.w * TILE) / 2 + 16; // one armrest, along the couch's local x axis
      return { kind: 'lie', headX: c.x * TILE + Math.cos(r) * off, headY: c.y * TILE + Math.sin(r) * off, angle: r - Math.PI / 2 };
    }
    // On a treadmill they run towards the console; in the shower they stand; elsewhere they sit.
    if (def.id === 'treadmill') return { kind: 'upright', facing: OPPOSITE[obj.dir], walking: true, sitting: false };
    return { kind: 'upright', facing: obj.dir, walking: false, sitting: def.id !== 'shower' };
  }
  const prev = lastSeen.get(dweller.id);
  const walking = dweller.run?.phase === 'walking' && !!prev && (prev.x !== dweller.x || prev.y !== dweller.y);
  let facing: Facing = prev?.facing ?? 'down';
  if (walking && prev) facing = towards(prev, { x: dweller.x, y: dweller.y });
  else if (perf) facing = perf.inter.players ? towards(dweller, objectCenter(perf.obj)) : OPPOSITE[perf.obj.dir];
  else if (a?.kind === 'social' && dweller.run?.phase === 'performing') {
    const t = game.dweller(a.targetId);
    if (t) facing = towards(dweller, t);
  } else if (dweller.engagedWith !== null) {
    const p = game.dweller(dweller.engagedWith);
    if (p) facing = towards(dweller, p);
  } else if (!a) {
    // A listener turns to whoever is talking, else to the middle of the circle.
    const others = game.convoOf(dweller).filter((m) => m !== dweller);
    const speaker = others.find((m) => m.queue[0]?.kind === 'social' && m.run?.phase === 'performing');
    if (speaker) facing = towards(dweller, speaker);
    else if (others.length) facing = towards(dweller, { x: others.reduce((s, m) => s + m.x, 0) / others.length, y: others.reduce((s, m) => s + m.y, 0) / others.length });
  }
  lastSeen.set(dweller.id, { x: dweller.x, y: dweller.y, facing });
  // Chess players and pianists sit on a stool or bench.
  return { kind: 'upright', facing, walking, sitting: !!perf?.inter.seated };
}

export function expressionOf(game: Game, dweller: Dweller): Expression {
  const polarity = EMOTIONS[game.emotionOf(dweller).emotion].polarity;
  return polarity === 'positive' ? 'smile' : polarity === 'negative' ? 'frown' : 'neutral';
}

const NEED_FACE: Record<NeedKey, [string, string]> = {
  hunger: ['😋', '배고파 보여요'],
  energy: ['🥱', '피곤해 보여요'],
  bladder: ['😬', '안절부절못해요'],
  hygiene: ['😩', '찝찝해 보여요'],
  fun: ['😒', '지루해 보여요'],
  social: ['🥺', '말 상대가 그리워 보여요'],
};

/**
 * What shows on a colleague's face (2026-10-26, at the user's request): a worry, good news, a need
 * running low, or just their mood — how they feel, not why. The why comes out in talk
 * (dwellerKnowledge.ts); this is all there is to go on at first. Drawn beside what they're doing.
 */
export function moodBubble(game: Game, dweller: Dweller): { icon: string; color: string; label: string } | null {
  if (dweller.npc?.role !== 'coworker' || dweller.npc.leaving) return null;
  if (dweller.fears?.length && !dweller.buffs.some((b) => b.id === 'fearShared')) return { icon: '😔', color: EMOTIONS.stressed.color, label: '표정이 어두워요' };
  if (dweller.joy) return { icon: '😊', color: EMOTIONS.happy.color, label: '얼굴이 환해요' };
  const low = (Object.entries(dweller.needs) as [NeedKey, number][]).sort((a, b) => a[1] - b[1])[0];
  if (low && low[1] < LOW_NEED) return { icon: NEED_FACE[low[0]][0], color: '#ffb74d', label: NEED_FACE[low[0]][1] };
  const e = game.emotionOf(dweller).emotion;
  return e === 'fine' ? null : { icon: EMOTIONS[e].icon, color: EMOTIONS[e].color, label: `${EMOTIONS[e].levels[0]} 기분이에요` };
}

export function bubbleIcon(game: Game, dweller: Dweller): string | null {
  const a = dweller.queue[0];
  const r = dweller.run;
  if (dweller.engagedWith !== null) {
    const p = game.dweller(dweller.engagedWith);
    const pa = p?.queue[0];
    if (pa?.kind === 'social') return SOCIAL_BY_ID[pa.socialId]?.icon ?? '💬';
  }
  if (a?.kind === 'passout') return '💫';
  // Someone waiting at a workplace shows what they came for.
  if (dweller.npc?.role === 'client' && !dweller.npc.leaving) return SOCIAL_BY_ID[dweller.npc.wants ?? '']?.icon ?? '⏳';
  if (dweller.age === 'baby') {
    if ((dweller.warned as Record<string, boolean>).sleeping) return '💤';
    const low = (['hunger', 'hygiene', 'social'] as const).find((k) => dweller.needs[k] < 30);
    return low ? { hunger: '🍼', hygiene: '🧷', social: '😭' }[low] : null;
  }
  if (dweller.pregnancy?.laborAt !== undefined) return '😣';
  const side = game.sideSocialOf(dweller);
  if (side) return SOCIAL_BY_ID[side.side.socialId]?.icon ?? '💬';
  if (a && r?.phase === 'performing') return game.actionLabel(a).icon;
  if (r?.phase === 'waiting') return '⏳';
  if (!a && game.convoOf(dweller).some((m) => m !== dweller && m.queue[0]?.kind === 'social' && m.run?.phase === 'performing')) return '👂';
  if (!a) {
    const low = (Object.entries(dweller.needs) as [string, number][]).sort((x, y) => x[1] - y[1])[0];
    if (low && low[1] < 25) return { hunger: '🍔', energy: '😴', bladder: '🚽', hygiene: '🧼', fun: '😒', social: '💬' }[low[0]] ?? null;
  }
  return null;
}

/** Objects someone is using right now, plus the TV that a sofa or armchair watcher is watching. */
export function activeObjects(game: Game): Set<number> {
  const inUse = new Set<number>(game.state.objects.filter((o) => o.lit).map((o) => o.uid));
  for (const s of game.state.dwellers) {
    const perf = !s.away && game.performing(s);
    if (!perf) continue;
    inUse.add(perf.obj.uid);
    if (perf.inter.requires === 'tvNearby') {
      const c = objectCenter(perf.obj);
      const tv = game.state.objects
        .filter((o) => TVS.has(o.defId))
        .sort((a, b) => Math.hypot(objectCenter(a).x - c.x, objectCenter(a).y - c.y) - Math.hypot(objectCenter(b).x - c.x, objectCenter(b).y - c.y))[0];
      if (tv) inUse.add(tv.uid);
    }
  }
  return inUse;
}

/**
 * The outfit category a dweller has changed into (참고 게임 swaps outfits for sleeping, working out, bathing
 * and social events): pyjamas in bed, athletic wear for exercise, a towel in the bath or shower,
 * formal wear for the host, guests and the pair at a party or date.
 */
const SLEEPWEAR = new Set(['sleep', 'nap', 'toddlerNap']);
const ATHLETIC = new Set(['workout', 'playBars']);
const BATHING = new Set(['shower', 'showerBrisk', 'showerThoughtful', 'showerSteamy', 'takeBath', 'bubbleBath']);
export function changedInto(game: Game, s: Dweller): 'sleep' | 'athletic' | 'bathing' | 'formal' | undefined {
  const perf = game.performing(s);
  const id = perf?.inter.id ?? '';
  if (perf && SLEEPWEAR.has(id) && game.sleptIn(perf.obj)) return 'sleep';
  if (ATHLETIC.has(id)) return 'athletic';
  if (BATHING.has(id) || id.startsWith('shower')) return 'bathing';
  const event = game.state.party;
  if (event && (s.id === event.hostId || s.id === event.partnerId || (event.kind !== 'date' && s.npc?.role === 'guest'))) return 'formal';
  return undefined;
}


/** 0 at day, 1 at night, easing over dawn (5–7h) and dusk (18–21h). */
export function nightLevel(time: number): number {
  const h = (time % 1440) / 60;
  if (h < 5 || h >= 21) return 1;
  if (h < 7) return 1 - (h - 5) / 2;
  if (h >= 18) return (h - 18) / 3;
  return 0;
}









