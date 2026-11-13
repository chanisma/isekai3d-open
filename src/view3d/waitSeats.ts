import { getDef } from '../game/catalog';
import type { Dir, PlacedObject } from '../game/types';
import { dims, footprintTiles } from '../game/world';
import { kindOf } from './furniture3d';

/**
 * Where someone who's come in sits while they wait or watch (2026-10-26, at the user's request: the
 * comedy club's audience stood): a chair beside their spot, a place on a sofa (one a tile), a
 * pupil's desk with its chair, or a place drawn on a set for its visitors (a talk show's guest sofa,
 * one a tile). The seat facing the spot comes first. Workplace layouts put each client spot next to
 * one (workplaceSeats.test.ts).
 */
export type WaitSeatKind = 'chair' | 'sofa' | 'desk' | 'set';
export interface WaitSeat {
  obj: PlacedObject;
  kind: WaitSeatKind;
  /** The tile of it sat on (a sofa has a place a tile). */
  tile: { x: number; y: number };
}

/** Desks drawn with a chair for someone who comes in, not the worker's own. */
const VISITOR_DESKS = new Set(['studentDesk']);
/**
 * Sets with places for visitors drawn on them (furnitureSet.ts `guests`): which tiles of the
 * footprint are a guest's, by where the tile's middle is in the set's own frame (x across to its
 * right as you face its front, z out to its front, in tiles from its middle). The talk show's guest
 * sofa is on the front row's left and middle tiles (the host's desk on the right, as on TV).
 */
const SET_GUESTS: Record<string, (x: number, z: number) => boolean> = {
  talkShowSet: (x, z) => z > 0 && x < 0.5,
};
const FRONT: Record<Dir, [number, number]> = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };

export function waitSeatKind(defId: string): WaitSeatKind | null {
  if (VISITOR_DESKS.has(defId)) return 'desk';
  if (SET_GUESTS[defId]) return 'set';
  const k = kindOf(getDef(defId));
  return k === 'chair' || k === 'sofa' ? k : null;
}

/** Whether a tile of a set's footprint is a guest's place. */
function guestTile(obj: PlacedObject, tile: { x: number; y: number }): boolean {
  const { w, h } = dims(getDef(obj.defId), obj.dir);
  const dx = tile.x + 0.5 - (obj.x + w / 2);
  const dy = tile.y + 0.5 - (obj.y + h / 2);
  const [fx, fy] = FRONT[obj.dir];
  // The set's own x runs (fy, -fx) on the plan: to the right of its front as drawn (x for a set facing down).
  return SET_GUESTS[obj.defId](dx * fy - dy * fx, dx * fx + dy * fy);
}

/** A seat beside `to` not in `taken` (keys from seatKey), the one facing it first. */
export function seatBeside(objects: PlacedObject[], to: { x: number; y: number }, taken: Set<string>): WaitSeat | undefined {
  let best: WaitSeat | undefined;
  for (const obj of objects) {
    const kind = waitSeatKind(obj.defId);
    if (!kind) continue;
    for (const tile of footprintTiles(getDef(obj.defId), obj.x, obj.y, obj.dir)) {
      if (Math.abs(tile.x - to.x) + Math.abs(tile.y - to.y) !== 1) continue;
      if (kind === 'set' && !guestTile(obj, tile)) continue;
      const seat = { obj, kind, tile };
      if (taken.has(seatKey(seat))) continue;
      const facing = tile.x + FRONT[obj.dir][0] === to.x && tile.y + FRONT[obj.dir][1] === to.y;
      if (facing) return seat;
      best ??= seat;
    }
  }
  return best;
}

/** A chair or desk is one seat; a sofa or a set one a tile. */
export function seatKey(s: WaitSeat): string {
  return s.kind === 'sofa' || s.kind === 'set' ? `${s.obj.uid}:${s.tile.x},${s.tile.y}` : `${s.obj.uid}`;
}
