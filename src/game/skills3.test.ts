import { describe, expect, it } from 'vitest';
import { Game } from './game';

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

function newGame() {
  const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
  g.state.freeWill = false;
  g.state.money = 5000;
  return g;
}

describe('violin, gourmet cooking and photography (참고 게임 skills)', () => {
  it('gourmet cooking trains its own skill and serves a family meal', () => {
    const g = newGame();
    const dweller = g.state.dwellers[0];
    const stove = g.state.objects.find((o) => o.defId === 'stove')!;
    for (const k of Object.keys(dweller.needs) as (keyof typeof dweller.needs)[]) dweller.needs[k] = 90;
    g.enqueue(dweller.id, { kind: 'interact', objectUid: stove.uid, interactionId: 'cookGourmet', autonomous: false });
    run(g, 70);
    expect(dweller.skills.gourmet).toBeGreaterThan(0);
    expect(dweller.skills.cooking).toBe(0);
  });

  it('photography stops at five and photos sell', () => {
    const g = newGame();
    const dweller = g.state.dwellers[0];
    expect([[11, 11], [12, 12], [5, 12], [3, 15]].some(([x, y]) => g.buy('camera', x, y, 'down'))).toBe(true);
    const cam = g.state.objects.find((o) => o.defId === 'camera')!;
    dweller.skills.photography = 4.99;
    const money = g.state.money;
    g.enqueue(dweller.id, { kind: 'interact', objectUid: cam.uid, interactionId: 'takePhoto', autonomous: false });
    run(g, 60);
    expect(dweller.skills.photography).toBe(5);
    expect(g.state.money).toBeGreaterThan(money);
  });
});
