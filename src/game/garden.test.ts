import { describe, expect, it } from 'vitest';
import { DIES_AFTER_DRY, GROWTH_PER_MINUTE, growPlant, newPlant, ripe } from './garden';
import { Game } from './game';

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

describe('gardening', () => {
  it('grows in about 98 hours when kept watered, and withers left dry for a day', () => {
    expect(Math.round(1 / GROWTH_PER_MINUTE / 60)).toBe(98);
    const p = newPlant();
    for (let t = 0; t < 98 * 60 + 30; t += 1) {
      p.water = 100;
      p.weeds = 0;
      growPlant(p, 1);
    }
    expect(ripe(p)).toBe(true);
    const dry = newPlant();
    let alive = true;
    for (let t = 0; t < 1440 + DIES_AFTER_DRY + 10 && alive; t += 1) alive = growPlant(dry, 1);
    expect(alive).toBe(false);
  });

  it('plants, waters and harvests a planter for money', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }]);
    g.state.freeWill = false;
    g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
    const [a] = g.state.dwellers;
    expect(g.buy('planter', 3, 11, 'down')).toBe(true);
    const planter = g.state.objects.find((o) => o.defId === 'planter')!;
    g.enqueue(a.id, { kind: 'interact', objectUid: planter.uid, interactionId: 'plantSeeds', autonomous: false });
    run(g, 25);
    expect(planter.plant).toBeDefined();
    planter.plant!.growth = 1;
    const money = g.state.money;
    g.enqueue(a.id, { kind: 'interact', objectUid: planter.uid, interactionId: 'harvest', autonomous: false });
    run(g, 15);
    expect(g.state.money).toBeGreaterThan(money);
    expect(ripe(planter.plant!)).toBe(false);
    expect(a.skills.gardening).toBeGreaterThan(0);
  });
});
