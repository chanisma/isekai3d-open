import { describe, expect, it } from 'vitest';
import { Game } from './game';

function home() {
  const g = Game.create([
    { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
    { name: '서연', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' },
  ]);
  g.state.freeWill = false;
  g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
  return g;
}

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

/** Jumps to just before one in the morning (day 3 at the earliest) with a burglar certain to come. */
function breakIn(g: Game) {
  g.state.time = Math.max(2, Math.floor(g.state.time / 1440) + 1) * 1440 + 55;
  g.rng = () => 0.05;
  run(g, 10);
  const b = g.state.dwellers.find((s) => s.npc?.role === 'burglar');
  expect(b).toBeDefined();
  g.rng = Math.random;
  return b!;
}

describe('burglars', () => {
  it('stay away for the first two days', () => {
    const g = home();
    g.state.time = 1440 + 55;
    g.rng = () => 0.05;
    run(g, 10);
    expect(g.state.dwellers.some((s) => s.npc?.role === 'burglar')).toBe(false);
    run(g, 1440);
    expect(g.state.dwellers.some((s) => s.npc?.role === 'burglar')).toBe(true);
  });
  it('take the valuables at night and leave the household sad, then stay away for two weeks', () => {
    const g = home();
    breakIn(g);
    run(g, 300);
    expect(g.state.objects.some((o) => o.defId === 'tv')).toBe(false);
    expect(g.state.objects.some((o) => o.defId === 'computer')).toBe(false);
    expect(g.state.dwellers.some((s) => s.npc?.role === 'burglar')).toBe(false);
    expect(g.household()[0].buffs.some((b) => b.id === 'stolenGoods')).toBe(true);
    expect(g.state.burglarCooldownUntil).toBeGreaterThan(g.state.time + 13 * 1440);
  });

  it('are caught by the police when a burglar alarm goes off', () => {
    const g = home();
    g.state.objects.push({ uid: 999, defId: 'burglarAlarm', x: 3, y: 12, dir: 'down' });
    breakIn(g);
    run(g, 120);
    expect(g.toasts.some((t) => t.text.includes('경찰이 와서'))).toBe(true);
    expect(g.state.objects.some((o) => o.defId === 'tv')).toBe(true);
    expect(g.household()[0].buffs.some((b) => b.id === 'policeWon')).toBe(true);
  });

  it('can be chased off by a fit dweller who confronts them', () => {
    const g = home();
    const burglar = breakIn(g);
    const [a] = g.state.dwellers;
    a.skills.fitness = 10;
    for (const s of g.household()) s.queue = [];
    Object.assign(a, { x: burglar.x, y: burglar.y - 1 });
    g.rng = () => 0.1;
    g.enqueue(a.id, { kind: 'social', targetId: burglar.id, socialId: 'confrontBurglar', autonomous: false });
    run(g, 30);
    expect(a.buffs.some((b) => b.id === 'heroicEffort')).toBe(true);
    // Running off, it's still the burglar: the same look, and nothing to chat about.
    expect(burglar.npc?.role).toBe('burglar');
    expect(burglar.npc?.leaving).toBe(true);
    expect(g.socialMenu(a, burglar).filter((o) => !o.disabled)).toEqual([]);
  });

  it('can be faced by each grown-up once; one who loses is knocked out until the burglar has gone', () => {
    const g = home();
    const burglar = breakIn(g);
    const [a, b] = g.household();
    for (const s of g.household()) s.queue = [];
    Object.assign(a, { x: burglar.x, y: burglar.y - 1 });
    // Before: only squaring up, no small talk with a burglar.
    expect(g.socialMenu(a, burglar).map((o) => o.id)).toEqual(['confrontBurglar']);
    g.rng = () => 0.99; // loses
    g.enqueue(a.id, { kind: 'social', targetId: burglar.id, socialId: 'confrontBurglar', autonomous: false });
    run(g, 30);
    expect(a.queue[0]).toMatchObject({ kind: 'passout', knockedOut: true });
    expect(burglar.npc?.fought).toEqual([a.id]);
    run(g, 3);
    expect(a.queue[0]?.kind).toBe('passout'); // still out while the burglar is at it
    // The other grown-up can still try; the first can't again.
    expect(g.socialMenu(b, burglar).find((o) => o.id === 'confrontBurglar')?.disabled).toBeUndefined();
    Object.assign(b, { x: burglar.x, y: burglar.y + 1 });
    g.rng = () => 0.01; // wins
    g.enqueue(b.id, { kind: 'social', targetId: burglar.id, socialId: 'confrontBurglar', autonomous: false });
    run(g, 30);
    expect(b.buffs.some((x) => x.id === 'heroicEffort')).toBe(true);
    expect(a.queue[0]?.kind).not.toBe('passout'); // came round once the burglar ran off
  });
});
