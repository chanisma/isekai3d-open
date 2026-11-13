import { describe, expect, it } from 'vitest';
import { Game } from './game';
import { newBirthday, newDinner, openGoals } from './party';

function household(n = 2, rng: () => number = () => 0.3) {
  const g = Game.create(
    [
      { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
      { name: '서연', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' },
    ].slice(0, n),
    rng,
  );
  g.state.freeWill = false;
  g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
  g.state.money = 5000;
  g.state.time = (Math.floor(g.state.time / 1440) + 1) * 1440 + 14 * 60;
  return g;
}

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

describe('birthday and dinner parties (참고 게임 situation_birthday_party, Situation_DinnerParty)', () => {
  it('set up 참고 게임 goals: blowing out candles or calling guests to a meal first, then three chains', () => {
    const b = newBirthday(1, 1, 0, () => 0);
    expect(b.goals[0].kind).toBe('blowCandles');
    expect(b.until).toBe(360);
    expect(openGoals(b).map((g) => g.kind)).toEqual(['blowCandles', 'chatCelebrant', 'listening', 'eat']);
    const d = newDinner(1, 0, () => 0);
    expect(d.goals[0].kind).toBe('callToMeal');
    expect(openGoals(d).length).toBe(4);
  });

  it('a birthday cake from the fridge: blowing out the candles ages the dweller up, then everyone gets a slice', () => {
    const g = household(2, () => 0.3);
    const [a, b] = g.state.dwellers;
    b.age = 'teen';
    b.bornAt = g.state.time;
    g.throwParty(b.id, 'birthday');
    expect(g.state.party?.kind).toBe('birthday');
    expect(g.state.money).toBe(4900);
    const fridge = g.state.objects.find((o) => o.defId === 'fridge')!;
    g.enqueue(a.id, { kind: 'interact', objectUid: fridge.uid, interactionId: 'bakeCake', autonomous: false });
    run(g, 60);
    const cake = g.state.objects.find((o) => o.defId === 'birthdayCake')!;
    expect(cake.cake).toEqual({ blown: false, slices: 8 });
    expect(g.objectMenu(a, cake).some((o) => o.id === 'eatCake' && !o.disabled)).toBe(false);
    g.enqueue(b.id, { kind: 'interact', objectUid: cake.uid, interactionId: 'blowCandles', autonomous: false });
    run(g, 20);
    expect(b.age).toBeUndefined(); // a grown-up now
    expect(b.buffs.some((x) => x.id === 'birthdayCelebrate')).toBe(true);
    expect(g.state.party!.goals[0].done).toBe(true);
    g.enqueue(a.id, { kind: 'interact', objectUid: cake.uid, interactionId: 'eatCake', autonomous: false });
    run(g, 25);
    expect(cake.cake!.slices).toBe(7);
  });

  it('a dinner party is won by putting a family meal on the table', () => {
    const g = household(1);
    const [a] = g.state.dwellers;
    g.throwParty(a.id, 'dinner');
    const stove = g.state.objects.find((o) => o.defId === 'stove')!;
    g.enqueue(a.id, { kind: 'interact', objectUid: stove.uid, interactionId: 'cookFamily', autonomous: false });
    run(g, 60);
    expect(g.state.party!.goals.find((x) => x.kind === 'callToMeal')!.done).toBe(true);
    expect(g.state.party!.score).toBeGreaterThanOrEqual(100);
  });
});
