import { describe, expect, it } from 'vitest';
import { rollCatch } from './fishing';
import { Game } from './game';

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

describe('fishing (참고 게임 FishingLocation_Catch)', () => {
  it('catches fish, junk and treasure at 7 : 2 : 1, rarer fish with skill', () => {
    let s = 3;
    const rng = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
    const kinds = { fish: 0, junk: 0, treasure: 0 };
    let best = 0;
    for (let i = 0; i < 3000; i++) {
      const c = rollCatch(10, rng);
      kinds[c.kind]++;
      if (c.kind === 'fish') best = Math.max(best, c.fish.level);
    }
    expect(kinds.fish / 3000).toBeCloseTo(0.7, 1);
    expect(kinds.junk / 3000).toBeCloseTo(0.2, 1);
    expect(best).toBe(9);
    for (let i = 0; i < 200; i++) {
      const c = rollCatch(0, rng);
      if (c.kind === 'fish') expect(c.fish.level).toBe(0);
    }
  });

  it('a spell at the pond trains Fishing and brings something in', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.3);
    g.state.freeWill = false;
    g.state.money = 5000;
    expect([[3, 15], [6, 15], [16, 15], [2, 17]].some(([x, y]) => g.buy('pond', x, y, 'down'))).toBe(true);
    const pond = g.state.objects.find((o) => o.defId === 'pond')!;
    const dweller = g.state.dwellers[0];
    const money = g.state.money;
    g.enqueue(dweller.id, { kind: 'interact', objectUid: pond.uid, interactionId: 'fish', autonomous: false });
    run(g, 100);
    expect(dweller.skills.fishing).toBeGreaterThan(0);
    expect(g.state.money).toBeGreaterThan(money);
  });
});
