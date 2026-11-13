import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Game } from '../game/game';
import { loadGame, saveGame, savedAtOf } from '../game/save';
import { AUTO_PUSH_MS, SaveCloud, latestSaveCloud, resetSaveCloud } from './saveCloud';

// A localStorage of our own (the tests run without a browser).
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: () => null,
  length: 0,
} as Storage;

type Row = { state: unknown; summary: unknown; savedAt: number; version: number };

/** The bridge and spacekijun's isekai3d_save_* as the game sees them. */
function fakeServer() {
  const rows = new Map<number, Row>();
  const calls: string[] = [];
  const send = vi.fn(async (what: string, body: Record<string, unknown> = {}) => {
    calls.push(what);
    const slot = Number(body.p_slot);
    const ok = (data: unknown) => ({ ok: true, status: 200, data: data as Record<string, unknown> });
    if (what === 'save/list') return ok([...rows].map(([s, r]) => ({ slot: s, savedAt: r.savedAt, version: r.version, size: 1, summary: r.summary })));
    if (what === 'save/get') {
      const r = rows.get(slot);
      return ok(r ? { slot, empty: false, state: r.state, savedAt: r.savedAt, version: r.version } : { slot, empty: true });
    }
    if (what === 'save/put') {
      const cur = rows.get(slot);
      if (cur && body.p_base_version !== null && cur.version !== body.p_base_version) return ok({ ok: false, conflict: true, version: cur.version, savedAt: cur.savedAt });
      const version = (cur?.version ?? 0) + 1;
      rows.set(slot, { state: body.p_state, summary: body.p_summary, savedAt: Number(body.p_saved_at), version });
      return ok({ ok: true, version, savedAt: body.p_saved_at });
    }
    if (what === 'save/delete') {
      rows.delete(slot);
      return ok({ ok: true });
    }
    return { ok: false, status: 404, data: null };
  });
  return { rows, calls, send };
}

const make = (name: string) => Game.create([{ name, shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);

describe('save slots on the student’s account (saveCloud)', () => {
  beforeEach(() => {
    store.clear();
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
  });
  afterEach(() => {
    resetSaveCloud();
    vi.useRealTimers();
  });

  it('is there only where the bridge is (not on the dev server or the web)', async () => {
    const s = fakeServer();
    expect(await SaveCloud.connect(s.send as never, true)).toBeNull();
    expect(await SaveCloud.connect((async () => ({ ok: false, status: 404, data: null })) as never, false)).toBeNull();
    expect(await SaveCloud.connect(s.send as never, false)).not.toBeNull();
  });

  it('sends a save the player asked for at once, autosaves at most every three minutes', async () => {
    const s = fakeServer();
    const cloud = (await SaveCloud.connect(s.send as never, false))!;
    saveGame(make('하린').state, 1, { urgent: true });
    await vi.advanceTimersByTimeAsync(10);
    expect(s.rows.get(1)?.version).toBe(1);
    expect(cloud.status(1)).toBe('synced');
    // Autosaves within three minutes wait, and the latest goes up.
    vi.setSystemTime(1_030_000);
    saveGame(make('둘째').state, 1);
    vi.setSystemTime(1_060_000);
    const latest = make('셋째').state;
    saveGame(latest, 1);
    await vi.advanceTimersByTimeAsync(10);
    expect(s.rows.get(1)?.version).toBe(1);
    expect(cloud.status(1)).toBe('localNewer');
    await vi.advanceTimersByTimeAsync(AUTO_PUSH_MS);
    expect(s.rows.get(1)?.version).toBe(2);
    expect((s.rows.get(1)!.state as { dwellers: Array<{ name: string }> }).dwellers[0].name).toBe('셋째');
    expect(cloud.status(1)).toBe('synced');
  });

  it('brings a later copy (another PC’s) down before CONTINUE, and a story kept only there', async () => {
    const s = fakeServer();
    s.rows.set(2, { state: make('다른PC').state, summary: { people: [{ name: '다른PC' }], day: 3, money: 9 }, savedAt: 2_000_000, version: 4 });
    saveGame(make('이PC').state, 2);
    const cloud = (await SaveCloud.connect(s.send as never, false))!;
    expect(cloud.status(2)).toBe('serverNewer');
    expect(await cloud.pullIfNewer(2)).toBe(true);
    expect(loadGame(2)?.dwellers[0].name).toBe('다른PC');
    expect(savedAtOf(2)).toBe(2_000_000);
    expect(cloud.status(2)).toBe('synced');
    // Nothing went back up for it.
    expect(s.calls.filter((c) => c === 'save/put')).toHaveLength(0);
    // Saving on from here goes over version 4.
    saveGame(loadGame(2)!, 2, { urgent: true });
    await vi.advanceTimersByTimeAsync(10);
    expect(s.rows.get(2)?.version).toBe(5);
  });

  it('a quick CONTINUE waits for the server (still connecting, or saved since) and brings a later copy down by itself', async () => {
    // 2026-10-26 (at the user's request): CONTINUE right as the program opened went on with this PC's older copy.
    const s = fakeServer();
    s.rows.set(1, { state: make('다른PC').state, summary: {}, savedAt: 2_000_000, version: 2 });
    saveGame(make('이PC').state, 1);
    void SaveCloud.connect(s.send as never, false);
    const c = await latestSaveCloud();
    expect(c).not.toBeNull();
    expect(await c!.pullIfNewer(1)).toBe(true);
    expect(loadGame(1)?.dwellers[0].name).toBe('다른PC');
    // Saved again on the other PC while this one sat at the title: asked again before going on.
    s.rows.set(1, { state: make('또다른').state, summary: {}, savedAt: 3_000_000, version: 3 });
    const again = await latestSaveCloud();
    expect(await again!.pullIfNewer(1)).toBe(true);
    expect(loadGame(1)?.dwellers[0].name).toBe('또다른');
  });

  it('leaves a later copy from elsewhere alone, and goes over an earlier one', async () => {
    const s = fakeServer();
    const cloud = (await SaveCloud.connect(s.send as never, false))!;
    saveGame(make('하린').state, 3, { urgent: true });
    await vi.advanceTimersByTimeAsync(10);
    // Another PC saves later meanwhile.
    s.rows.set(3, { ...s.rows.get(3)!, savedAt: 5_000_000, version: 2 });
    vi.setSystemTime(1_500_000);
    saveGame(make('여기').state, 3, { urgent: true });
    await vi.advanceTimersByTimeAsync(10);
    expect(s.rows.get(3)?.savedAt).toBe(5_000_000);
    // Another PC's was earlier than ours: ours goes over it.
    s.rows.set(3, { ...s.rows.get(3)!, savedAt: 1_100_000, version: 7 });
    vi.setSystemTime(1_600_000);
    saveGame(make('여기2').state, 3, { urgent: true });
    await vi.advanceTimersByTimeAsync(10);
    expect(s.rows.get(3)?.savedAt).toBe(1_600_000);
    expect(cloud.status(3)).toBe('synced');
  });

  it('wipes the server copy with the story', async () => {
    const s = fakeServer();
    const cloud = (await SaveCloud.connect(s.send as never, false))!;
    saveGame(make('하린').state, 1, { urgent: true });
    await vi.advanceTimersByTimeAsync(10);
    await cloud.remove(1);
    expect(s.rows.has(1)).toBe(false);
    expect(cloud.remote.has(1)).toBe(false);
  });
});
