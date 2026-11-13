import { describe, expect, it } from 'vitest';
import { WANT_BY_ID, fillWants } from './wants';
import { Game } from './game';

function seeded(seed = 23) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function newGame(aspiration?: string) {
  const g = Game.create(
    [
      { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10', aspiration },
      { name: '서연', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' },
    ],
    seeded(),
  );
  g.state.freeWill = false;
  return g;
}

describe('aspirations', () => {
  it('pays each goal as it is met, and moves on when a step is done', () => {
    const g = newGame('bodybuilder');
    const a = g.state.dwellers[0];
    a.aspiration!.counters = { workout: 10 };
    g.checkAspiration(a);
    expect(a.aspiration!.milestone).toBe(1);
    expect(a.satisfaction).toBe(75);
    // Step two has two goals: 150 for the first one met, the rest when the second comes.
    a.skills.fitness = 4;
    g.checkAspiration(a);
    expect(a.aspiration!.milestone).toBe(1);
    expect(a.satisfaction).toBe(75 + 150);
    g.checkAspiration(a);
    expect(a.satisfaction).toBe(75 + 150);
    a.skills.persistence = 2;
    g.checkAspiration(a);
    expect(a.aspiration!.milestone).toBe(2);
    expect(a.satisfaction).toBe(75 + 300);
  });

  it('completes the track with a bonus', () => {
    const g = newGame('fortune');
    const dweller = g.state.dwellers[0];
    g.state.money = 30000;
    dweller.skills.selfControl = 2;
    dweller.skills.business = 3;
    g.checkAspiration(dweller);
    expect(dweller.aspiration!.milestone).toBe(4);
    expect(dweller.satisfaction).toBe(75 + 300 + 400 + 750 + 1000);
    expect(dweller.buffs.some((b) => b.id === 'aspirationDone')).toBe(true);
  });

  it('counts activities toward goals', () => {
    const g = newGame('masterChef');
    const dweller = g.state.dwellers[0];
    dweller.aspiration!.counters = { cook: 4 };
    g.checkAspiration(dweller);
    expect(dweller.aspiration!.milestone).toBe(0);
    dweller.aspiration!.counters.cook = 5;
    g.checkAspiration(dweller);
    expect(dweller.aspiration!.milestone).toBe(1);
  });

  it("offers the aspiration's want set more often", () => {
    let friendWants = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const g = newGame('popularity');
      g.rng = seeded(seed);
      const dweller = g.state.dwellers[0];
      dweller.needs = { hunger: 90, energy: 90, bladder: 90, hygiene: 90, fun: 90, social: 90 };
      dweller.wants = [];
      fillWants(g, dweller);
      if (dweller.wants.some((w) => WANT_BY_ID[w.defId].set === 'friend')) friendWants++;
    }
    expect(friendWants).toBeGreaterThan(30);
  });
});
