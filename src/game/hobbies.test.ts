import { describe, expect, it } from 'vitest';
import { skillGainMultiplier } from './emotions';
import { Game } from './game';
import { paintingQuality, paintingValue } from './painting';

function seeded(seed = 42) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function solo() {
  const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], seeded());
  g.state.freeWill = false;
  g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
  g.state.money = 5000;
  return g;
}

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

describe('fitness, painting and guitar', () => {
  it('maps the new skills onto 참고 게임 emotion bonuses', () => {
    expect(skillGainMultiplier({ emotion: 'energized', intensity: 0 } as never, 'fitness')).toBeCloseTo(1.4);
    expect(skillGainMultiplier({ emotion: 'inspired', intensity: 1 } as never, 'painting')).toBeCloseTo(1.6);
    expect(skillGainMultiplier({ emotion: 'inspired', intensity: 0 } as never, 'guitar')).toBeCloseTo(1.4);
  });

  it('prices paintings by skill and quality', () => {
    expect(paintingQuality(0, 0)).toBe(-50);
    expect(paintingQuality(10, 1)).toBe(50);
    expect(paintingValue(0, 0, 0.5)).toBe(15);
    expect(paintingValue(10, 40, 1)).toBeGreaterThan(paintingValue(5, 0, 1));
  });

  it('trains skills on the new objects and sells a finished painting', () => {
    const g = solo();
    const [a] = g.state.dwellers;
    for (const [defId, x, y] of [
      ['easel', 4, 11],
      // Not in front of the study desk (buy mode won't shut it off).
      ['treadmill', 20, 10],
      ['guitar', 6, 12],
    ] as const) {
      const placed = g.buy(defId, x, y, 'down');
      expect(placed).toBe(true);
    }
    const easel = g.state.objects.find((o) => o.defId === 'easel')!;
    const money = g.state.money;
    g.enqueue(a.id, { kind: 'interact', objectUid: easel.uid, interactionId: 'paint', autonomous: false });
    run(g, 110);
    expect(a.skills.painting).toBeGreaterThan(0.33); // SKILL_PACE: a level takes half as long again
    expect(g.state.money).toBeGreaterThan(money);
    expect(g.toasts.some((t) => t.text.includes('그림을 완성해'))).toBe(true);
    const treadmill = g.state.objects.find((o) => o.defId === 'treadmill')!;
    g.enqueue(a.id, { kind: 'interact', objectUid: treadmill.uid, interactionId: 'workout', autonomous: false });
    run(g, 60);
    // A first level takes a few hours (levelCost): 45 minutes is a good start on it.
    expect(a.skills.fitness).toBeGreaterThan(0.15); // SKILL_PACE
  });

  it('advances the painter aspiration as paintings are finished', () => {
    const g = solo();
    const [a] = g.state.dwellers;
    g.setAspiration(a.id, 'painter');
    a.aspiration!.counters = { paint: 3, outing_museum: 1 };
    g.checkAspiration(a);
    expect(a.aspiration!.milestone).toBe(1);
    a.skills.painting = 4;
    a.skills.persistence = 2;
    a.aspiration!.counters.paint = 8;
    g.checkAspiration(a);
    expect(a.aspiration!.milestone).toBe(2);
  });
});

describe('comedy', () => {
  it('trains at the mirror, faster when playful', () => {
    const g = solo();
    const [a] = g.state.dwellers;
    const mirror = g.state.objects.find((o) => o.defId === 'mirror')!;
    g.enqueue(a.id, { kind: 'interact', objectUid: mirror.uid, interactionId: 'practiceComedy', autonomous: false });
    run(g, 50);
    expect(a.skills.comedy).toBeGreaterThan(0.1) // SKILL_PACE;
    expect(skillGainMultiplier({ emotion: 'playful', intensity: 2 } as never, 'comedy')).toBeCloseTo(1.8);
  });
});
