import { describe, expect, it } from 'vitest';
import { getDef } from './catalog';
import { Game } from './game';

function seeded(seed = 5) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

function setup(defId: string) {
  const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], seeded());
  g.state.freeWill = false;
  const bed = g.state.objects.find((o) => o.defId === 'bed')!;
  bed.defId = defId;
  const dweller = g.state.dwellers[0];
  dweller.needs.energy = 10;
  g.addBuff(dweller, 'brainFried');
  return { g, dweller, bed };
}

describe('bed quality', () => {
  it('better beds cost more and sleep off stress faster (참고 게임 statistic_reduction_by_category)', () => {
    expect(getDef('deluxeBed').price).toBeGreaterThan(getDef('bed').price);
    expect(getDef('deluxeBed').restfulness).toBe(3.5);
    expect(getDef('deluxeDoubleBed').restfulness).toBe(4.5);
    const left = (defId: string) => {
      const { g, dweller, bed } = setup(defId);
      const buff = dweller.buffs.find((b) => b.id === 'brainFried')!;
      const until = buff.until!;
      g.enqueue(dweller.id, { kind: 'interact', objectUid: bed.uid, interactionId: 'nap', autonomous: false });
      run(g, 40);
      return dweller.buffs.find((b) => b.id === 'brainFried')?.until ?? until - 1e9;
    };
    expect(left('deluxeBed')).toBeLessThan(left('bed'));
  });

  it('a good bed can leave a good feeling on waking', () => {
    const { g, dweller, bed } = setup('deluxeDoubleBed');
    g.rng = () => 0.05;
    g.enqueue(dweller.id, { kind: 'interact', objectUid: bed.uid, interactionId: 'sleep', autonomous: false });
    run(g, 700);
    expect(dweller.buffs.some((b) => b.id.startsWith('wake'))).toBe(true);
  });
});
