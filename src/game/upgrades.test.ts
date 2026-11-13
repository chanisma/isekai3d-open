import { describe, expect, it } from 'vitest';
import { Game } from './game';

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

describe('handiness upgrades (참고 게임 *_Upgrade_*)', () => {
  it('need the skill, take parts and time, and change how the object behaves', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
    g.state.freeWill = false;
    const dweller = g.state.dwellers[0];
    const toilet = g.state.objects.find((o) => o.defId === 'toilet')!;
    const opt = () => g.objectMenu(dweller, toilet).find((m) => m.id === 'upgrade_toiletSelfClean');
    expect(opt()?.disabled).toBe('손재주 7레벨 필요');
    dweller.skills.handiness = 7;
    expect(opt()?.disabled).toBeUndefined();
    const money = g.state.money;
    for (const k of Object.keys(dweller.needs) as (keyof typeof dweller.needs)[]) dweller.needs[k] = 100;
    g.enqueue(dweller.id, { kind: 'interact', objectUid: toilet.uid, interactionId: 'upgrade_toiletSelfClean', autonomous: false });
    run(g, 140);
    expect(toilet.upgrades).toContain('toiletSelfClean');
    expect(g.state.money).toBeLessThanOrEqual(money - 100);
    expect(opt()).toBeUndefined();
    // Self-cleaning: use no longer soils it.
    g.enqueue(dweller.id, { kind: 'interact', objectUid: toilet.uid, interactionId: 'use', autonomous: false });
    dweller.needs.bladder = 10;
    run(g, 30);
    expect(toilet.dirt ?? 100).toBe(100);
  });

  it('computer games train Video Gaming, faster with a better video card (x1.3)', () => {
    const play = (card: boolean) => {
      const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
      g.state.freeWill = false;
      const dweller = g.state.dwellers[0];
      const pc = g.state.objects.find((o) => o.defId === 'computer')!;
      if (card) pc.upgrades = ['videoCard'];
      g.enqueue(dweller.id, { kind: 'interact', objectUid: pc.uid, interactionId: 'game', autonomous: false });
      run(g, 50);
      expect(dweller.skills.logic).toBe(0);
      return dweller.skills.videoGaming;
    };
    const plain = play(false);
    expect(plain).toBeGreaterThan(0);
    expect(play(true) / plain).toBeCloseTo(1.3, 1);
  });
});
