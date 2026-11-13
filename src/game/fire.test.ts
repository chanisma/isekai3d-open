import { describe, expect, it } from 'vitest';
import { cookingFireChance } from './fire';
import { Game } from './game';

function seeded(seed = 42) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function pair(freeWill: boolean) {
  const g = Game.create(
    [
      { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
      { name: '서연', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' },
    ],
    seeded(),
  );
  g.state.freeWill = freeWill;
  g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
  return g;
}

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

const stove = (g: Game) => g.state.objects.find((o) => o.defId === 'stove')!;

describe('kitchen fires', () => {
  it('follow 참고 게임 odds per cooking step by skill', () => {
    expect([0, 1, 2, 3, 4, 5, 10].map(cookingFireChance)).toEqual([0.03, 0.03, 0.015, 0.005, 0.005, 0, 0]);
  });

  it('can start while a novice cooks, sparing them for two days after', () => {
    const g = pair(false);
    const [a] = g.state.dwellers;
    g.rng = () => 0; // every roll comes up fire
    g.enqueue(a.id, { kind: 'interact', objectUid: stove(g).uid, interactionId: 'cook', autonomous: false });
    run(g, 30);
    expect(g.state.fires?.length).toBeGreaterThan(0);
    expect(a.buffs.some((b) => b.id === 'recentFire')).toBe(true);
    expect(g.servingsLeft()).toBe(0);
  });

  it('makes everyone panic and then put it out', () => {
    const g = pair(true);
    g.ignite(stove(g));
    run(g, 2);
    for (const s of g.state.dwellers) {
      expect(s.buffs.some((b) => b.id === 'fireStressed')).toBe(true);
      expect(s.emotion).toBe('stressed');
      expect(s.queue[0]?.kind).toBe('panic');
    }
    run(g, 40);
    expect(g.state.fires).toHaveLength(0);
    for (const s of g.state.dwellers) {
      expect(s.buffs.some((b) => b.id === 'fireStressed')).toBe(false);
      expect(s.buffs.some((b) => b.id === 'fireOver')).toBe(true);
    }
    expect(g.isBroken(stove(g))).toBe(true);
  });

  it('spreads after half an hour if nobody fights it', () => {
    const g = pair(false);
    g.ignite(stove(g));
    run(g, 29);
    expect(g.state.fires).toHaveLength(1);
    run(g, 2);
    expect(g.state.fires).toHaveLength(2);
    run(g, 13);
    expect(g.state.fires).toHaveLength(3);
  });

  it('brings the fire brigade when a smoke alarm hears it', () => {
    const g = pair(false);
    g.state.objects.push({ uid: 999, defId: 'smokeAlarm', x: 18, y: 6, dir: 'down' });
    g.ignite(stove(g));
    expect(g.toasts.some((t) => t.text.includes('화재경보기'))).toBe(true);
    run(g, 31);
    expect(g.state.fires).toHaveLength(0);
    expect(g.toasts.some((t) => t.text.includes('소방관'))).toBe(true);
  });

  it('lets the player send someone to put it out with free will off', () => {
    const g = pair(false);
    g.ignite(stove(g));
    const [a] = g.state.dwellers;
    g.enqueue(a.id, { kind: 'extinguish', x: stove(g).x, y: stove(g).y, autonomous: false });
    run(g, 25);
    expect(g.state.fires).toHaveLength(0);
  });

  it('without a smoke alarm, a neighbour calls the brigade in the end (ours)', () => {
    const g = pair(false);
    g.state.objects = g.state.objects.filter((o) => o.defId !== 'smokeAlarm');
    for (const s of g.state.dwellers) s.away = { until: 1e9 };
    g.ignite(stove(g));
    run(g, 100);
    expect(g.state.fires?.length).toBeGreaterThan(0);
    run(g, 60);
    expect(g.state.fires?.length ?? 0).toBe(0);
  });

  it('a dweller boxed in far from the flames steps out instead of retrying forever', () => {
    const g = pair(true);
    const [a, b] = g.state.dwellers;
    b.away = { until: 1e9 };
    // Boxed in by furniture, far from the stove that catches fire.
    a.x = 20;
    a.y = 5;
    let uid = 900;
    for (const [x, y] of [[19, 5], [21, 5], [20, 4], [20, 6]]) g.state.objects.push({ uid: uid++, defId: 'plant', x, y, dir: 'down' });
    (g as unknown as { invalidate(): void }).invalidate();
    g.ignite(stove(g));
    a.panickedAt = g.state.fireStartedAt;
    // Before, a fresh attempt every step kept free will from ever getting a look in; now the dweller
    // boxed in is let out (Game.freeIfBoxedIn / freeIfCutOff) and gets on with it.
    for (let t = 0; t < 30; t += 0.5) g.step(0.5);
    expect([a.x, a.y]).not.toEqual([20, 5]);
  });
});
