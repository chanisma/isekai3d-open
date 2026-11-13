import { describe, expect, it } from 'vitest';
import { rankOptions } from './autonomy';
import { Game } from './game';
import { PUDDLE_DRIES_AFTER } from './puddles';

function seeded(seed = 42) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function solo() {
  const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], seeded());
  g.state.freeWill = false;
  g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
  return g;
}

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

describe('puddles', () => {
  it('are left by an accident and mopped up', () => {
    const g = solo();
    const [a] = g.state.dwellers;
    Object.assign(a, { x: 10, y: 11 });
    a.needs.bladder = 0;
    g.step(0.5);
    expect(g.puddleAt(10, 11)).toBe(true);
    g.enqueue(a.id, { kind: 'mop', x: 10, y: 11, autonomous: false });
    run(g, 8);
    expect(g.puddleAt(10, 11)).toBe(false);
  });

  it('spoil the room and nag tidy dwellers to mop', () => {
    const g = solo();
    const [a] = g.state.dwellers;
    Object.assign(a, { x: 10, y: 11 });
    run(g, 1);
    const before = g.environmentOf(a);
    for (let x = 4; x < 8; x++) g.addPuddle(x, 12);
    run(g, 1);
    expect(g.environmentOf(a)).not.toBe(before);
    expect(rankOptions(g, a).some((c) => c.action.kind === 'mop')).toBe(true);
  });

  it('dry up on their own after a while', () => {
    const g = solo();
    g.addPuddle(10, 12);
    run(g, PUDDLE_DRIES_AFTER + 1);
    expect(g.puddleAt(10, 12)).toBe(false);
  });

  it('sometimes splash out of the shower', () => {
    const g = solo();
    const [a] = g.state.dwellers;
    g.rng = () => 0;
    a.needs.hygiene = 50;
    const shower = g.state.objects.find((o) => o.defId === 'shower')!;
    g.enqueue(a.id, { kind: 'interact', objectUid: shower.uid, interactionId: 'shower', autonomous: false });
    run(g, 40);
    expect(g.state.puddles?.length).toBe(1);
  });
});
