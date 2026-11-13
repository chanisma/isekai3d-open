import { describe, expect, it } from 'vitest';
import { drinkBuff, drinkQuality, drinkTier } from './drinks';
import { Game } from './game';

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

describe('drinks (참고 게임 loot_Buff_Drink)', () => {
  it('moodlets follow recipe band and quality', () => {
    expect(drinkTier(0)).toBe(0);
    expect(drinkTier(4)).toBe(1);
    expect(drinkTier(10)).toBe(2);
    expect(drinkBuff(0, -40)).toBe('drinkOdd');
    expect(drinkBuff(0, 0)).toBeNull();
    expect(drinkBuff(0, 40)).toBe('drinkSweet');
    expect(drinkBuff(1, 0)).toBe('drinkSweet');
    expect(drinkBuff(1, -40)).toBeNull();
    expect(drinkBuff(2, 0)).toBe('drinkCool');
    expect(drinkBuff(2, 40)).toBe('drinkTasty');
    // -15 + 20 per level over the band's floor.
    expect(drinkQuality(9, 2, 1 / 3)).toBe(25);
  });

  it('mixing pours a round for whoever is nearby', () => {
    const g = Game.create(
      [
        { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
        { name: '서연', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' },
      ],
      () => 0.9,
    );
    g.state.freeWill = false;
    expect([[11, 11], [12, 12], [5, 12]].some(([x, y]) => g.buy('bar', x, y, 'down'))).toBe(true);
    const bar = g.state.objects.find((o) => o.defId === 'bar')!;
    const [a, b] = g.state.dwellers;
    a.skills.mixology = 9;
    b.x = bar.x + 2;
    b.y = bar.y + 2;
    const money = g.state.money;
    g.enqueue(a.id, { kind: 'interact', objectUid: bar.uid, interactionId: 'mixDrink', autonomous: false });
    run(g, 40);
    expect(a.buffs.some((x) => x.id === 'drinkTasty')).toBe(true);
    expect(b.buffs.some((x) => x.id === 'drinkTasty')).toBe(true);
    expect(g.state.money).toBe(money - 38);
    expect(a.skills.mixology).toBeGreaterThan(9);
  });
});
