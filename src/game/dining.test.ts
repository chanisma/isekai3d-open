import { describe, expect, it } from 'vitest';
import { familyMealAppeal } from './autonomy';
import { dishQuality, mealBuff } from './food';
import { Game } from './game';

function seeded(seed = 42) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function household(n: number) {
  const g = Game.create(
    [
      { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
      { name: '서연', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' },
      { name: '지우', shirt: '#43a047', skin: '#c99a6e', hair: '#a0522d' },
      { name: '하은', shirt: '#8e24aa', skin: '#8d5524', hair: '#111111' },
    ].slice(0, n),
    seeded(),
  );
  g.state.freeWill = false;
  return g;
}

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

const stove = (g: Game) => g.state.objects.find((o) => o.defId === 'stove')!;

describe('dining', () => {
  it('starts with a table whose chairs can be reached from the side', () => {
    const g = household(2);
    const chairs = g.state.objects.filter((o) => o.defId === 'diningChair');
    expect(chairs).toHaveLength(4);
    for (const c of chairs) {
      expect(g.atTable(c)).toBe(true);
      expect(g.usableSpots(c, g.interaction(c, 'eat')!).length).toBeGreaterThan(0);
    }
  });

  it('cooks a plate, then sits down at the table to eat it', () => {
    const g = household(1);
    const [a] = g.state.dwellers;
    a.needs.hunger = 20;
    a.skills.cooking = 5; // past the age of kitchen fires
    g.enqueue(a.id, { kind: 'interact', objectUid: stove(g).uid, interactionId: 'cook', autonomous: false });
    run(g, 50);
    expect(g.servingsLeft()).toBe(0); // taken to the table
    const perf = g.performing(a);
    expect(perf?.inter.id).toBe('eat');
    expect(perf?.obj.defId).toBe('diningChair');
    run(g, 35);
    expect(a.needs.hunger).toBeGreaterThan(70);
    expect(g.state.dishes).toBe(1);
  });

  it('calls the household to a family meal', () => {
    const g = household(4);
    const [a, ...others] = g.state.dwellers;
    for (const s of g.state.dwellers) s.needs.hunger = 40;
    a.skills.cooking = 5;
    g.enqueue(a.id, { kind: 'interact', objectUid: stove(g).uid, interactionId: 'cookFamily', autonomous: false });
    run(g, 58);
    expect(g.toasts.some((t) => t.text.includes('밥 먹자'))).toBe(true);
    for (const s of [a, ...others]) expect(s.queue[0]?.kind === 'interact' && s.queue[0].interactionId).toBe('eat');
    run(g, 45);
    for (const s of [a, ...others]) expect(s.needs.hunger).toBeGreaterThan(60);
    expect(g.servingsLeft()).toBe(0);
  });

  it('leaves leftovers that spoil after a day', () => {
    const g = household(1);
    g.state.food = [{ servings: 3, madeAt: g.state.time, cookId: 1 }];
    run(g, 1441);
    expect(g.servingsLeft()).toBe(0);
    expect(g.toasts.some((t) => t.text.includes('상해서'))).toBe(true);
  });

  it('only makes a family meal worth it when others are hungry', () => {
    const g = household(4);
    const [a, ...others] = g.state.dwellers;
    for (const s of others) s.needs.hunger = 90;
    expect(familyMealAppeal(g, a)).toBeLessThan(1);
    for (const s of others) s.needs.hunger = 30;
    expect(familyMealAppeal(g, a)).toBeGreaterThan(1);
  });

  it('rates dishes like 참고 게임: skill band times Poor/Normal/Outstanding', () => {
    expect(dishQuality(0, 0)).toBe(-40);
    expect(dishQuality(10, 1)).toBe(50);
    // Better appliances lift a dish (참고 게임 CookingQuality loot: high-end fridge 13 + stove 11.5).
    expect(dishQuality(2, 0.5, 24.5) - dishQuality(2, 0.5)).toBe(13.5);
    expect(mealBuff(2, -35)).toBe('foodBad');
    expect(mealBuff(2, 0)).toBeNull();
    expect(mealBuff(2, 35)).toBe('foodGood');
    expect(mealBuff(5, 20)).toBe('foodGood');
    expect(mealBuff(5, 40)).toBe('foodTasty');
    expect(mealBuff(8, 40)).toBe('foodFantastic');
    expect(mealBuff(10, 50)).toBe('foodGreat');
  });

  it('leaves the moodlet of the dish after eating it', () => {
    const g = household(1);
    const [a] = g.state.dwellers;
    a.needs.hunger = 30;
    g.state.food = [{ servings: 1, madeAt: g.state.time, cookId: a.id, quality: 50, buff: 'foodGreat' }];
    const chair = g.state.objects.find((o) => o.defId === 'diningChair')!;
    g.enqueue(a.id, { kind: 'interact', objectUid: chair.uid, interactionId: 'eat', autonomous: false });
    run(g, 60);
    expect(a.buffs.some((b) => b.id === 'foodGreat')).toBe(true);
  });

  it('a better kitchen makes better food', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
    expect(g.kitchenQuality()).toBe(11);
    g.state.objects.find((o) => o.defId === 'fridge')!.defId = 'deluxeFridge';
    g.state.objects.find((o) => o.defId === 'stove')!.defId = 'deluxeStove';
    expect(g.kitchenQuality()).toBe(24.5);
    g.state.objects.find((o) => o.defId === 'deluxeStove')!.wear = 0;
    expect(g.kitchenQuality()).toBe(13);
  });
});
