import { describe, expect, it } from 'vitest';
import { Game } from './game';

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

describe('coffee (참고 게임 Caffeinated)', () => {
  it('a cup slows tiredness; a second one is too much', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
    g.state.freeWill = false;
    expect([[17, 4], [22, 4], [17, 6], [12, 11]].some(([x, y]) => g.buy('coffeeMaker', x, y, 'down'))).toBe(true);
    const cm = g.state.objects.find((o) => o.defId === 'coffeeMaker')!;
    const dweller = g.state.dwellers[0];
    g.enqueue(dweller.id, { kind: 'interact', objectUid: cm.uid, interactionId: 'drinkCoffee', autonomous: false });
    run(g, 25);
    expect(dweller.buffs.some((b) => b.id === 'caffeinated')).toBe(true);
    g.enqueue(dweller.id, { kind: 'interact', objectUid: cm.uid, interactionId: 'drinkCoffee', autonomous: false });
    run(g, 20);
    expect(dweller.buffs.some((b) => b.id === 'caffeineOverload')).toBe(true);
  });
});
