import type { GameState } from './types';
import { clockInfo } from './util';

/**
 * Three save slots (2026-10-20, at the user's request: a new story no longer wipes the old one).
 * Slot 1 keeps the key the one save had before, so that save is slot 1. Each slot's last save time
 * is kept beside them; the slot last played is where the game saves (autosave too) and what
 * CONTINUE offers first.
 *
 * In 스페이스기전 학생 the slots are kept on the student's account too (cloud/saveCloud.ts): every
 * save here is told to it (`setSaveHook`), and it uploads behind the game.
 */
export const SLOTS = [1, 2, 3] as const;
export type Slot = (typeof SLOTS)[number];

const keyOf = (slot: Slot) => (slot === 1 ? 'isekai3d-save-v1' : `isekai3d-save-v1-${slot}`);
const META = 'isekai3d-save-meta-v1';
const LAST = 'isekai3d-save-last';

type Meta = Partial<Record<Slot, { savedAt: number }>>;

function readMeta(): Meta {
  try {
    return (JSON.parse(localStorage.getItem(META) ?? '{}') as Meta) ?? {};
  } catch {
    return {};
  }
}

/** The slot played last (where saves go), slot 1 at first. */
export function lastSlot(): Slot {
  try {
    const n = Number(localStorage.getItem(LAST));
    return (SLOTS as readonly number[]).includes(n) ? (n as Slot) : 1;
  } catch {
    return 1;
  }
}

export function setLastSlot(slot: Slot) {
  try {
    localStorage.setItem(LAST, String(slot));
  } catch {
    // remembered for this visit only
  }
}

/** Told of every save (the server copy, saveCloud.ts): `urgent` for one the player asked for. */
type SaveHook = (slot: Slot, state: GameState, savedAt: number, urgent: boolean) => void;
let hook: SaveHook | null = null;
export function setSaveHook(fn: SaveHook | null) {
  hook = fn;
}

/**
 * Saves a story in its slot. `urgent`: the player saved (or left), so the server copy goes up now,
 * not with the autosave's few minutes; `from` a copy brought down from the server, kept with its own
 * time and not sent back up.
 */
export function saveGame(state: GameState, slot: Slot = lastSlot(), opts: { urgent?: boolean; from?: number } = {}): boolean {
  const savedAt = opts.from ?? Date.now();
  try {
    localStorage.setItem(keyOf(slot), JSON.stringify(state));
    localStorage.setItem(META, JSON.stringify({ ...readMeta(), [slot]: { savedAt } }));
  } catch {
    return false;
  }
  if (opts.from === undefined) hook?.(slot, state, savedAt, !!opts.urgent);
  return true;
}

/** When the story in a slot was saved here (ms), if there is one. */
export function savedAtOf(slot: Slot): number | undefined {
  return loadGame(slot) ? readMeta()[slot]?.savedAt : undefined;
}

export function loadGame(slot: Slot = lastSlot()): GameState | null {
  try {
    const raw = localStorage.getItem(keyOf(slot));
    if (!raw) return null;
    const data = JSON.parse(raw) as GameState;
    if (data?.version !== 1 || !Array.isArray(data.dwellers) || !Array.isArray(data.objects)) return null;
    return data;
  } catch {
    return null;
  }
}

export function hasSave(slot?: Slot): boolean {
  return slot ? loadGame(slot) !== null : SLOTS.some((s) => loadGame(s) !== null);
}

export function deleteSave(slot: Slot = lastSlot()) {
  try {
    localStorage.removeItem(keyOf(slot));
    const meta = readMeta();
    delete meta[slot];
    localStorage.setItem(META, JSON.stringify(meta));
  } catch {
    // ignore
  }
}

/** What a slot's card shows: who, which day, money, when it was saved. */
export interface SlotInfo {
  slot: Slot;
  empty: boolean;
  /** The household, eldest first as they were made; empty when everyone has gone. */
  people: Array<{ name: string; skin: string; hair: string; shirt: string }>;
  day: number;
  money: number;
  savedAt?: number;
}

/** A slot card's few facts, also sent along with the server copy so its card shows without it. */
export type SlotSummary = Pick<SlotInfo, 'people' | 'day' | 'money'>;

export function summaryOf(s: GameState): SlotSummary {
  return {
    people: s.dwellers.filter((x) => !x.npc).map((x) => ({ name: x.name, skin: x.skin, hair: x.hair, shirt: x.shirt })),
    day: clockInfo(s.time).day + 1,
    money: Math.floor(s.money),
  };
}

export function slotInfo(slot: Slot): SlotInfo {
  const s = loadGame(slot);
  if (!s) return { slot, empty: true, people: [], day: 0, money: 0 };
  return { slot, empty: false, ...summaryOf(s), savedAt: readMeta()[slot]?.savedAt };
}
