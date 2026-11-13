import { describe, expect, it } from 'vitest';
import { bestsellerHalfLife, bookFinishChance, bookStars, readerShare, royaltyDays, royaltyOn, royaltyPerDay, ROYALTY_READERS } from './books';
import { Game } from './game';

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

describe('writing and royalties', () => {
  it('rates books by writing level and pays more for better writers', () => {
    expect(bookStars(0, 0)).toBe(1);
    expect(bookStars(10, 1)).toBe('best');
    expect(royaltyPerDay(2, 1)).toBe(8);
    expect(royaltyPerDay(9, 'best')).toBeGreaterThan(royaltyPerDay(6, 'best'));
  });

  it('keeps bestsellers rare: only a writing-10 writer, about one book in four', () => {
    expect(bookStars(9, 1)).toBe(3);
    const rolls = Array.from({ length: 100 }, (_, i) => (i + 0.5) / 100);
    const best = rolls.filter((r) => bookStars(10, r) === 'best').length;
    expect(best).toBeGreaterThan(20);
    expect(best).toBeLessThan(35);
  });

  it('pays for days by rating, measured by the life stages; a bestseller for good, halving over an adult stage', () => {
    expect(royaltyDays(1)).toBe(3);
    expect(royaltyDays(2)).toBe(7);
    expect(royaltyDays(3)).toBe(14);
    expect(royaltyDays('best')).toBeNull();
    // No ageing: the normal life cycle is the measure.
    expect(royaltyDays(3, 'off')).toBe(14);
    const best = { perDay: 100, fromDay: 10 };
    expect(royaltyOn(best, 10)).toBe(100);
    expect(royaltyOn(best, 10 + bestsellerHalfLife())).toBeCloseTo(50);
    expect(royaltyOn({ perDay: 40, left: 2, fromDay: 0 }, 99)).toBe(40);
  });

  it('shares the readers: past a few books the day grows with the square root of the books', () => {
    expect(readerShare(ROYALTY_READERS)).toBe(1);
    expect(readerShare(ROYALTY_READERS * 4)).toBeCloseTo(0.5);
    // A writing-10 writer publishing three books every day for 140 days: the day's royalty levels
    // off around a good career's pay instead of growing without end.
    const day = (d: number) => {
      const books: Array<{ perDay: number; left?: number; fromDay: number }> = [];
      for (let p = 0; p < d; p++)
        for (let k = 0; k < 3; k++) {
          const stars = bookStars(10, ((p * 3 + k) * 0.37) % 1);
          const days = royaltyDays(stars);
          if (days === null || p + days > d) books.push({ perDay: royaltyPerDay(10, stars), fromDay: p, ...(days === null ? {} : { left: p + days - d }) });
        }
      return books.reduce((sum, b) => sum + royaltyOn(b, d), 0) * readerShare(books.length);
    };
    expect(day(140)).toBeLessThan(2200);
    expect(day(140) / day(70)).toBeLessThan(1.25);
  });

  it('a draft comes to a book more often the better the writer (most beginners give up)', () => {
    expect(bookFinishChance(0)).toBeCloseTo(0.2);
    expect(bookFinishChance(5)).toBeGreaterThan(0.5);
    expect(bookFinishChance(10)).toBeGreaterThan(0.9);
    expect(bookFinishChance(10)).toBeLessThan(1);
    expect(bookFinishChance(3, true)).toBeGreaterThan(bookFinishChance(3));
  });

  it('a draft that falls through publishes nothing, though the practice counts', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.9);
    g.state.freeWill = false;
    g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
    const [a] = g.state.dwellers;
    const computer = g.state.objects.find((o) => o.defId === 'computer')!;
    g.enqueue(a.id, { kind: 'interact', objectUid: computer.uid, interactionId: 'writeBook', autonomous: false });
    run(g, 140);
    expect(g.state.royalties ?? []).toHaveLength(0);
    expect(a.skills.writing).toBeGreaterThan(0.5);
  });

  it('publishes a finished book and pays royalties each morning for the days its rating gives', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.1);
    g.state.freeWill = false;
    g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
    const [a] = g.state.dwellers;
    const computer = g.state.objects.find((o) => o.defId === 'computer')!;
    g.enqueue(a.id, { kind: 'interact', objectUid: computer.uid, interactionId: 'writeBook', autonomous: false });
    run(g, 140);
    expect(g.state.royalties).toHaveLength(1);
    const book = g.state.royalties![0];
    expect(book.authorId).toBe(a.id);
    expect(book.left).toBe(royaltyDays(book.stars!));
    expect(a.skills.writing).toBeGreaterThan(0.5);
    const money = g.state.money;
    g.state.time = (Math.floor(g.state.time / 1440) + 1) * 1440 + 10 * 60;
    g.step(0.5);
    expect(g.state.money).toBeGreaterThan(money);
    expect(g.state.royalties![0].left).toBe(royaltyDays(book.stars!)! - 1);
  });

  it('lets an old save’s books run out their twenty days as before', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }]);
    g.state.royalties = [{ title: '마지막 기차', author: '민준', perDay: 30, left: 1, fromDay: 0 }];
    g.state.time = (Math.floor(g.state.time / 1440) + 1) * 1440 + 10 * 60;
    const money = g.state.money;
    g.step(0.5);
    expect(g.state.money - money).toBeGreaterThanOrEqual(24);
    expect(g.state.royalties).toHaveLength(0);
  });
});
