import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Game } from '../game/game';

// The arcade's coins counted by 스페이스기전 (the student app): a fake server with the rules of
// isekai3d_play_insert / isekai3d_play_use, and the ways a player goes on when today's play runs out.

const server = { coins: 1, used: 0, perCoin: 2880, fail: false };
const state = () => ({ day: today(), coins: server.coins, maxCoins: 99, perCoin: server.perCoin, used: server.used, budget: server.coins * server.perCoin, nextPrice: 0, wallet: 100, admin: true });
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

vi.mock('./isekai3dCloud', () => ({
  post: async (what: string, body: { p_used?: number } = {}) => {
    if (server.fail) return { ok: false, status: 0, data: null };
    if (what === 'play/insert') server.coins += 1;
    if (what === 'play/use') server.used = Math.max(server.used, Math.min(body.p_used ?? 0, server.coins * server.perCoin));
    return { ok: true, status: 200, data: state() };
  },
}));

async function open() {
  vi.stubEnv('DEV', false);
  const { PlayPass } = await import('./playPass');
  return PlayPass.open();
}

function playing() {
  const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }]);
  g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e12;
  g.state.time = 10 * 60;
  return g;
}

/** Real seconds at 3× (아주 빠르게) until the game stops for a coin. */
async function runOut(g: Game) {
  g.state.speed = 3;
  for (let i = 0; i < 2000 && (g.playLeft ?? 0) > 0; i++) {
    g.update(0.1);
    await vi.advanceTimersByTimeAsync(100);
  }
  await vi.advanceTimersByTimeAsync(1500);
}

describe('coins counted by the server', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    const mem = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) });
    Object.assign(server, { coins: 1, used: 2880 - 60, fail: false });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('runs out at 3×; the server hears all of it at once', async () => {
    const pass = await open();
    const g = playing();
    pass.attach(g);
    await runOut(g);
    expect(g.playLeft).toBe(0);
    expect(pass.left).toBe(0);
    expect(server.used).toBe(2880);
    pass.detach();
  });

  it('out of time → a coin in the arcade over the game → the game goes on', async () => {
    const pass = await open();
    const g = playing();
    pass.attach(g);
    await runOut(g);
    const r = await pass.insert();
    expect(r.ok).toBe(true);
    pass.sync();
    expect(g.playLeft).toBe(2880);
    pass.detach();
  });

  it('out of time → to the title → the arcade asks for a coin → the game goes on after it', async () => {
    const pass = await open();
    const g = playing();
    pass.attach(g);
    await runOut(g);
    pass.detach();
    expect(pass.left).toBe(0);
    // The title: asked again (the window reopened, or the arcade's own refresh).
    await pass.refresh();
    expect(pass.left).toBe(0);
    await pass.insert();
    const again = playing();
    pass.attach(again);
    expect(again.playLeft).toBe(2880);
  });

  it('a report that didn’t get through is sent again (the server would give the time back)', async () => {
    const pass = await open();
    const g = playing();
    pass.attach(g);
    server.fail = true;
    await runOut(g);
    server.fail = false;
    expect(server.used).toBeLessThan(2880);
    // Next tick, or leaving the game, tries again.
    await vi.advanceTimersByTimeAsync(1500);
    pass.detach();
    await vi.advanceTimersByTimeAsync(100);
    expect(server.used).toBe(2880);
    await pass.refresh();
    expect(pass.left).toBe(0);
  });

  it('the game reopened with the server behind (the last count never got there): no time given back, and it’s sent', async () => {
    const pass = await open();
    const g = playing();
    pass.attach(g);
    server.fail = true;
    await runOut(g);
    pass.detach();
    await vi.advanceTimersByTimeAsync(100);
    server.fail = false;
    expect(server.used).toBeLessThan(2880);
    // The window opened again: the arcade asks for a coin, not «이어서 하기».
    const again = await open();
    expect(again.left).toBe(0);
    await vi.advanceTimersByTimeAsync(100);
    expect(server.used).toBe(2880);
    // And a coin in gives a whole coin's time.
    await again.insert();
    expect(again.left).toBe(2880);
  });
});
