import { describe, expect, it } from 'vitest';
import { Game } from './game';

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

function newGame() {
  const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
  g.state.freeWill = false;
  g.state.time = Math.floor(g.state.time / 1440) * 1440 + 1440 * 5 + 14 * 60;
  return g;
}

describe('neighbours (참고 게임 phone and visits)', () => {
  it('a phone chat fills Social and warms the friendship', () => {
    const g = newGame();
    const dweller = g.state.dwellers[0];
    const t = g.state.townies![0];
    dweller.needs.social = 20;
    g.callNeighbour(dweller.id, t.id);
    run(g, 35);
    expect(dweller.needs.social).toBeGreaterThan(40);
    expect(g.relationship(dweller.id, t.id).friend).toBeGreaterThan(0);
  });

  it('a visit takes the dweller away for a few hours and brings them home happy', () => {
    const g = newGame();
    const dweller = g.state.dwellers[0];
    // Someone at home: a grandmother is home all day (the others may be at work or school).
    const t = g.state.townies!.find((x) => x.age === 'elder')!;
    g.visitNeighbour(dweller.id, t.id);
    expect(dweller.away?.outing).toBe('visit');
    run(g, 190);
    expect(dweller.away).toBeNull();
    expect(dweller.buffs.some((b) => b.id === 'goodTimes')).toBe(true);
  });
});
