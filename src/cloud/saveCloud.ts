import { useEffect, useState } from 'react';
import { SLOTS, loadGame, saveGame, savedAtOf, setSaveHook, summaryOf, type Slot, type SlotSummary } from '../game/save';
import type { GameState } from '../game/types';
import { post } from './isekai3dCloud';

/**
 * The save slots kept on the student's account too (2026-10-20, at the user's request): in
 * 스페이스기전 학생 the program's bridge passes `save/*` to spacekijun's isekai3d_save_* (one row per
 * student per slot), so a story follows them to any PC and outlives a reinstall. On the web and on
 * the dev server there's none, and the slots stay in this browser only (save.ts).
 *
 * The game saves here first, always; the copy goes up behind it — at once when the player saves or
 * leaves, at most every three minutes with the autosave. CONTINUE takes whichever copy was saved
 * later, bringing the server's down first (`pullIfNewer`). Two PCs: a copy goes up only over the
 * version this PC last had (`base`); if the server's has moved on and was saved later, it's left as
 * it is (and comes down on CONTINUE), else this PC's, saved later, goes over it.
 */
type Send = typeof post;

export interface RemoteSlot {
  slot: Slot;
  savedAt: number;
  version: number;
  size: number;
  summary: Partial<SlotSummary>;
}

/** Where a slot's story is, for its card. */
export type SlotSync = 'synced' | 'local' | 'server' | 'serverNewer' | 'localNewer';

/** Autosaves go up at most this often (ms); a save the player asked for, at once. */
export const AUTO_PUSH_MS = 180_000;
/** CONTINUE waits this long at most for the server's copy before going on with this PC's. */
const PULL_WAIT_MS = 6000;
const SYNC_KEY = 'isekai3d-save-sync-v1';

type Synced = Partial<Record<Slot, { version: number; savedAt: number }>>;

function readSynced(): Synced {
  try {
    return (JSON.parse(localStorage.getItem(SYNC_KEY) ?? '{}') as Synced) ?? {};
  } catch {
    return {};
  }
}
function writeSynced(s: Synced) {
  try {
    localStorage.setItem(SYNC_KEY, JSON.stringify(s));
  } catch {
    // remembered for this visit only
  }
}

const isSlot = (n: unknown): n is Slot => (SLOTS as readonly unknown[]).includes(n);

export class SaveCloud {
  remote = new Map<Slot, RemoteSlot>();
  private synced: Synced = readSynced();
  private pending = new Map<Slot, { state: GameState; savedAt: number }>();
  private lastPush = new Map<Slot, number>();
  private timers = new Map<Slot, ReturnType<typeof setTimeout>>();
  private busy = new Set<Slot>();
  private listeners = new Set<() => void>();

  private constructor(private send: Send) {}

  /**
   * The server copy, when the game runs in 스페이스기전 학생 and the student is signed in; null
   * elsewhere (then saves stay in this browser). Never waited on by the game.
   */
  static connect(send: Send = post, devServer = import.meta.env.DEV): Promise<SaveCloud | null> {
    if (devServer) return Promise.resolve(null);
    connecting = (async () => {
      const c = new SaveCloud(send);
      if (!(await c.refresh())) return null;
      current = c;
      setSaveHook((slot, state, savedAt, urgent) => c.push(slot, state, savedAt, urgent));
      notifyAll();
      return c;
    })();
    return connecting;
  }

  onChange(fn: () => void) {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  }
  private changed() {
    for (const fn of this.listeners) fn();
    notifyAll();
  }

  /** The slots on the server (their cards, not the stories). False when there's no way there. */
  async refresh(): Promise<boolean> {
    const r = await this.send('save/list');
    if (!r.ok || !Array.isArray(r.data)) return false;
    this.remote.clear();
    for (const row of r.data as unknown as Array<Record<string, unknown>>) {
      const slot = Number(row.slot);
      if (!isSlot(slot)) continue;
      this.remote.set(slot, { slot, savedAt: Number(row.savedAt) || 0, version: Number(row.version) || 0, size: Number(row.size) || 0, summary: (row.summary as Partial<SlotSummary>) ?? {} });
    }
    this.changed();
    return true;
  }

  /** Where a slot's story is kept: here, there, both, and which was saved later. */
  status(slot: Slot): SlotSync | null {
    const here = savedAtOf(slot);
    const there = this.remote.get(slot)?.savedAt;
    if (here === undefined && there === undefined) return null;
    if (there === undefined) return 'local';
    if (here === undefined) return 'server';
    if (here === there) return 'synced';
    return here > there ? 'localNewer' : 'serverNewer';
  }

  /** A save made here: up at once if `urgent`, else with the next one due (every three minutes). */
  push(slot: Slot, state: GameState, savedAt: number, urgent = false) {
    this.pending.set(slot, { state, savedAt });
    const wait = urgent ? 0 : Math.max(0, (this.lastPush.get(slot) ?? 0) + AUTO_PUSH_MS - Date.now());
    const old = this.timers.get(slot);
    if (old && !urgent) return; // one already due; it takes the latest
    if (old) clearTimeout(old);
    this.timers.set(
      slot,
      setTimeout(() => {
        this.timers.delete(slot);
        void this.flush(slot);
      }, wait),
    );
  }

  /** Sends the latest save of a slot up (now). */
  async flush(slot: Slot): Promise<void> {
    const p = this.pending.get(slot);
    if (!p || this.busy.has(slot)) return;
    this.pending.delete(slot);
    this.busy.add(slot);
    this.lastPush.set(slot, Date.now());
    try {
      const there = this.remote.get(slot);
      const mine = this.synced[slot];
      // Never had this slot's server copy: only over one saved earlier than ours.
      let base: number | null = mine?.version ?? null;
      if (!mine && there) {
        if (there.savedAt > p.savedAt) return;
        base = null;
      }
      let r = await this.put(slot, p, base);
      if (r && r.conflict) {
        // Moved on from elsewhere: ours goes over it only if ours was saved later.
        if (r.savedAt > p.savedAt) {
          this.remote.set(slot, { ...(there ?? { slot, size: 0, summary: {} }), version: r.version, savedAt: r.savedAt });
          this.changed();
          return;
        }
        r = await this.put(slot, p, null);
      }
      if (r && !r.conflict) {
        this.synced = { ...this.synced, [slot]: { version: r.version, savedAt: p.savedAt } };
        writeSynced(this.synced);
        this.remote.set(slot, { slot, version: r.version, savedAt: p.savedAt, size: JSON.stringify(p.state).length, summary: summaryOf(p.state) });
        this.changed();
      }
    } finally {
      this.busy.delete(slot);
      // Saved again while that was going up: send that too.
      if (this.pending.has(slot) && !this.timers.has(slot)) this.push(slot, this.pending.get(slot)!.state, this.pending.get(slot)!.savedAt, true);
    }
  }

  private async put(slot: Slot, p: { state: GameState; savedAt: number }, base: number | null): Promise<{ conflict: boolean; version: number; savedAt: number } | null> {
    const r = await this.send('save/put', { p_slot: slot, p_state: p.state, p_summary: summaryOf(p.state), p_saved_at: p.savedAt, p_base_version: base });
    if (!r.ok || !r.data) return null;
    return { conflict: !!r.data.conflict, version: Number(r.data.version) || 0, savedAt: Number(r.data.savedAt) || 0 };
  }

  /** Before CONTINUE: the server's copy into this PC if it was saved later (or this PC has none). */
  async pullIfNewer(slot: Slot): Promise<boolean> {
    const there = this.remote.get(slot);
    const here = savedAtOf(slot);
    if (!there || (here !== undefined && here >= there.savedAt)) return false;
    const r = await Promise.race([this.send('save/get', { p_slot: slot }), new Promise<null>((done) => setTimeout(() => done(null), PULL_WAIT_MS))]);
    if (!r || !r.ok || !r.data || r.data.empty) return false;
    const state = r.data.state as GameState;
    const savedAt = Number(r.data.savedAt) || there.savedAt;
    if (!state || !saveGame(state, slot, { from: savedAt }) || !loadGame(slot)) return false;
    this.synced = { ...this.synced, [slot]: { version: Number(r.data.version) || there.version, savedAt } };
    writeSynced(this.synced);
    this.changed();
    return true;
  }

  /** A story wiped: from the server too. */
  async remove(slot: Slot): Promise<void> {
    this.pending.delete(slot);
    const t = this.timers.get(slot);
    if (t) clearTimeout(t);
    this.timers.delete(slot);
    this.remote.delete(slot);
    const { [slot]: _gone, ...rest } = this.synced;
    this.synced = rest;
    writeSynced(this.synced);
    this.changed();
    await this.send('save/delete', { p_slot: slot });
  }

  /** Everything still to go up, now (leaving the game). */
  flushAll() {
    for (const [slot, t] of this.timers) {
      clearTimeout(t);
      this.timers.delete(slot);
      void this.flush(slot);
    }
  }
}

/** The one server copy of this run (null until connected, and on the web). */
let current: SaveCloud | null = null;
let connecting: Promise<SaveCloud | null> | null = null;

/**
 * Before CONTINUE goes on with a story (2026-10-26, at the user's request: a later save on the server
 * is to come down by itself): the server copy, waited for if it's still connecting (the program just
 * opened), with its slots asked again — so a quick CONTINUE doesn't go on with this PC's older copy.
 */
export async function latestSaveCloud(wait = PULL_WAIT_MS): Promise<SaveCloud | null> {
  const timeout = <T,>(p: Promise<T>, fallback: T) => Promise.race([p, new Promise<T>((done) => setTimeout(() => done(fallback), wait))]);
  const c = current ?? (connecting ? await timeout(connecting, null) : null);
  if (c) await timeout(c.refresh(), false);
  return c;
}
const watchers = new Set<() => void>();
function notifyAll() {
  for (const fn of watchers) fn();
}
export function saveCloud(): SaveCloud | null {
  return current;
}

/** The server copy for a component, re-rendering when the slots there change. */
export function useSaveCloud(): SaveCloud | null {
  const [, bump] = useState(0);
  useEffect(() => {
    const fn = () => bump((n) => n + 1);
    watchers.add(fn);
    return () => void watchers.delete(fn);
  }, []);
  return current;
}

/** For tests: forget the connected copy. */
export function resetSaveCloud() {
  current = null;
  connecting = null;
  setSaveHook(null);
}
