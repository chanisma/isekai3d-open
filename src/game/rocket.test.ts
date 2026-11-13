import { describe, expect, it } from 'vitest';
import { Game } from './game';
import { rollAdventure } from './rocket';

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

describe('rocket ship (참고 게임 object_RocketShip)', () => {
  it('is built up over hours, then flies off and comes back with a story', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.3);
    g.state.freeWill = false;
    g.state.money = 9000;
    expect([[3, 15], [6, 15], [16, 15], [2, 17]].some(([x, y]) => g.buy('rocketShip', x, y, 'down'))).toBe(true);
    const rocket = g.state.objects.find((o) => o.defId === 'rocketShip')!;
    const dweller = g.state.dwellers[0];
    expect(g.objectMenu(dweller, rocket).find((m) => m.id === 'launchRocket')).toBeUndefined();
    rocket.rocket = 90;
    for (const k of Object.keys(dweller.needs) as (keyof typeof dweller.needs)[]) dweller.needs[k] = 100;
    g.enqueue(dweller.id, { kind: 'interact', objectUid: rocket.uid, interactionId: 'buildRocket', autonomous: false });
    run(g, 40);
    expect(rocket.rocket).toBe(100);
    expect(dweller.skills.rocketScience).toBeGreaterThan(0);
    g.enqueue(dweller.id, { kind: 'interact', objectUid: rocket.uid, interactionId: 'launchRocket', autonomous: false });
    run(g, 20);
    expect(dweller.away?.outing).toBe('space');
    run(g, 130);
    expect(dweller.away).toBeNull();
    expect(g.toasts.some((t) => t.text.includes('🚀') || t.text.includes('불시착'))).toBe(true);
  });

  it('crashes now and then until the landing computer (Rocket Science 8)', () => {
    expect(rollAdventure(0, () => 0.99)).toBeNull();
    expect(rollAdventure(8, () => 0.99)).not.toBeNull();
  });
});
