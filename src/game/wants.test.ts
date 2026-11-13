import { describe, expect, it } from 'vitest';
import { Game } from './game';
import { WANT_BY_ID, candidates, fillWants } from './wants';

function seeded(seed = 21) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function newGame(traits: string[] = []) {
  const g = Game.create(
    [
      { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10', traits },
      { name: '서연', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' },
    ],
    seeded(),
  );
  g.state.freeWill = false;
  return g;
}

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

describe('wants', () => {
  it('fills up to three slots from different sets', () => {
    const g = newGame(['bookworm']);
    const dweller = g.state.dwellers[0];
    g.step(0.5);
    expect(dweller.wants!.length).toBe(3);
    const sets = dweller.wants!.map((w) => WANT_BY_ID[w.defId].set);
    expect(new Set(sets).size).toBe(3);
  });

  it('offers romance wants only once there is a spark', () => {
    const g = newGame();
    const [a, b] = g.state.dwellers;
    expect(candidates(g, a).has('romance')).toBe(false);
    g.relationship(a.id, b.id).romance = 40;
    expect(candidates(g, a).get('romance')!.map((w) => w.defId)).toContain('goSteady');
  });

  it('pays satisfaction points and a Happy moodlet when fulfilled', () => {
    const g = newGame();
    const [a, b] = g.state.dwellers;
    a.wants = [{ defId: 'chatWith', targetId: b.id, since: g.state.time }];
    a.wantFillAt = 1e9;
    g.enqueue(a.id, { kind: 'social', targetId: b.id, socialId: 'chat', autonomous: false });
    run(g, 40);
    expect(a.satisfaction).toBe(25);
    expect(a.buffs.some((x) => x.id === 'wantFulfilled')).toBe(true);
    expect(a.wantChain?.friend).toBe(1.5);
    expect(a.wants!.some((w) => w.defId === 'chatWith' && w.targetId === b.id)).toBe(false);
  });

  it('does not offer a fulfilled want again for a day', () => {
    const g = newGame();
    const [a, b] = g.state.dwellers;
    a.wantCooldown = { [`chatWith@${b.id}`]: g.state.time + 100 };
    expect(candidates(g, a).get('friend')!.some((w) => w.defId === 'chatWith')).toBe(false);
    a.wants = [];
    fillWants(g, a);
    expect(a.wants!.some((w) => w.defId === 'chatWith')).toBe(false);
  });

  it('spends satisfaction points on reward traits', () => {
    const g = newGame();
    const dweller = g.state.dwellers[0];
    dweller.satisfaction = 4000;
    expect(g.buyReward(dweller.id, 'steelBladder')).toBe(true);
    expect(dweller.traits).toContain('steelBladder');
    expect(dweller.satisfaction).toBe(500);
    expect(g.buyReward(dweller.id, 'steelBladder')).toBe(false);
    const bladder = dweller.needs.bladder;
    run(g, 60);
    expect(dweller.needs.bladder).toBe(bladder);
  });
});
