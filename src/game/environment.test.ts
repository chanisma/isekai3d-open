import { describe, expect, it } from 'vitest';
import { tidyScore } from './autonomy';
import { environmentBuff } from './emotions';
import { Game } from './game';

function seeded(seed = 13) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function newGame(traits: string[] = []) {
  const g = Game.create(
    [
      { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10', traits },
      { name: '서연', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' },
    ],
    seeded(),
  );
  g.state.freeWill = false;
  return g;
}

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

describe('environment score', () => {
  it('keeps only the strongest emotion, sized 10/80/640', () => {
    expect(environmentBuff({ happy: 9 }, 0)).toBeNull();
    expect(environmentBuff({ happy: 15, inspired: 20 }, 0)).toBe('env_inspired_1');
    expect(environmentBuff({ confident: 120 }, 0)).toBe('env_confident_2');
    expect(environmentBuff({ playful: 640 }, 0)).toBe('env_playful_3');
  });

  it('lets a mess override any decor', () => {
    expect(environmentBuff({ confident: 640 }, 15)).toBe('env_bad_1');
    expect(environmentBuff({}, 45)).toBe('env_bad_3');
  });

  it("applies decor in the dweller's own room", () => {
    const g = newGame();
    const dweller = g.state.dwellers[0]; // starts in the living room (plant 10 + lamp 5)
    g.step(0.5);
    expect(dweller.buffs.some((b) => b.id === 'env_happy_1')).toBe(true);
    g.buy('paintingMaster', 20, 11, 'down');
    g.step(0.5);
    expect(dweller.buffs.some((b) => b.id === 'env_confident_2')).toBe(true);
  });

  it('eating leaves dishes that sour the kitchen until washed', () => {
    const g = newGame();
    const dweller = g.state.dwellers[0];
    const fridge = g.state.objects.find((o) => o.defId === 'fridge')!;
    for (let i = 0; i < 3; i++) {
      g.enqueue(dweller.id, { kind: 'interact', objectUid: fridge.uid, interactionId: 'snack', autonomous: false });
      run(g, 30);
    }
    expect(g.state.dishes).toBe(3);
    expect(g.environmentOf(dweller)).toBe('env_bad_1'); // standing in the kitchen with 3 dishes (15)
    const sink = g.state.objects.find((o) => o.defId === 'kitchenSink')!;
    g.enqueue(dweller.id, { kind: 'interact', objectUid: sink.uid, interactionId: 'washDishes', autonomous: false });
    run(g, 20);
    expect(g.state.dishes).toBe(0);
  });

  it('makes tidying more urgent when uncomfortable, never for slobs', () => {
    const g = newGame(['slob']);
    const [slob, other] = g.state.dwellers;
    expect(tidyScore(slob, 5)).toBe(0);
    const calm = tidyScore(other, 5);
    other.emotion = 'uncomfortable';
    expect(tidyScore(other, 5)).toBe(calm * 2);
  });
});
