import { describe, expect, it } from 'vitest';
import { STREET_MAX, ageNeighbourhood, related, settleNeighbourhood, stepStreetBonds } from './neighbourhood';
import type { NeighbourEvent } from './neighbourhood';
import type { Townie } from './visitors';

/** A small seeded generator, so a run of years is the same every time. */
function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

/** Years of the street on its own: who's there each day, and everything that happened. */
function run(days: number, seed: number) {
  const rng = seeded(seed);
  const townies = settleNeighbourhood(undefined, rng, 107, 0, 'normal');
  const bonds: Record<string, number> = {};
  let id = 500;
  const sizes: number[] = [];
  const events: Array<NeighbourEvent & { day: number }> = [];
  const born = new Set<number>();
  for (let d = 1; d <= days; d++) {
    const now = d * 1440 + 7 * 60;
    const ev = [...ageNeighbourhood(townies, now, 'normal', rng, () => id++, new Set(), bonds), ...stepStreetBonds(townies, bonds, rng)];
    for (const e of ev) {
      events.push({ ...e, day: d });
      if (e.kind === 'born') born.add(e.townieId);
    }
    sizes.push(townies.length);
  }
  return { townies, sizes, events, born };
}

describe('the street goes on for generations', () => {
  for (const seed of [1, 7, 42]) {
    it(`keeps a living street over ten lifetimes (seed ${seed})`, () => {
      const { townies, sizes, events, born } = run(1000, seed);
      const count = (k: string, from = 0) => events.filter((e) => e.kind === k && e.day >= from).length;
      // Never empty for long, never over the street's size.
      expect(Math.max(...sizes)).toBeLessThanOrEqual(STREET_MAX);
      expect(Math.min(...sizes.slice(30))).toBeGreaterThanOrEqual(5);
      // Love, weddings and babies all the way through, not only in the first years.
      expect(count('married')).toBeGreaterThan(5);
      expect(count('born', 500)).toBeGreaterThan(2);
      expect(count('married', 500)).toBeGreaterThan(1);
      // Children born on the street grow up to marry (the families go on).
      const wedIds = new Set(events.filter((e) => e.kind === 'married').flatMap((e) => [e.townieId, e.withId!]));
      expect([...born].some((b) => wedIds.has(b))).toBe(true);
      // Nobody is with family by blood, and partners point at each other.
      for (const t of townies) {
        const p = townies.find((x) => x.id === t.partnerId);
        if (!p) continue;
        expect(p.partnerId).toBe(t.id);
        expect(related(t, p)).toBe(false);
      }
      // Houses never overflow.
      const per = new Map<string, number>();
      for (const t of townies) per.set(t.home!, (per.get(t.home!) ?? 0) + 1);
      for (const n of per.values()) expect(n).toBeLessThanOrEqual(5);
    });
  }
});

describe('the old cast as families', () => {
  it('links the cast: 도윤 and 예린 married, 하준 their son', () => {
    const t = settleNeighbourhood(undefined, seeded(3), 107);
    const by = (n: string) => t.find((x) => x.name === n) as Townie;
    expect(by('도윤').partnerId).toBe(by('예린').id);
    expect(by('예린').married).toBe(true);
    expect(by('하준').parents?.sort()).toEqual([by('도윤').id, by('예린').id].sort());
    expect(by('수아').partnerId).toBeUndefined();
  });
});

describe('neighbours who are taken', () => {
  it('a married neighbour, one going out, or a parent: no romance, no date, no moving in', async () => {
    const { Game } = await import('./game');
    const g = Game.create([{ name: '하린', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10', gender: 'male' }], () => 0.5);
    const [me] = g.household();
    const by = (n: string) => g.state.townies!.find((x) => x.name === n)!;
    expect(g.spokenFor(by('예린'))).toBe('결혼한 사람이에요');
    expect(g.spokenFor(by('수아'))).toBe('아이가 있는 사람이에요');
    expect(g.spokenFor(by('영자'))).toBe('아이가 있는 사람이에요');
    expect(g.spokenFor(by('다은'))).toBeNull();
    const yerin = (g as unknown as { spawnTownie(r: string, t: unknown): ReturnType<typeof g.household>[number] }).spawnTownie('doorbell', by('예린'))!;
    yerin.npc = { ...yerin.npc!, role: 'guest' };
    g.relationship(me.id, yerin.id).romance = 40;
    const menu = g.socialMenu(me, yerin);
    expect(menu.some((o) => ['flirt', 'propose', 'kiss'].includes(o.id))).toBe(false);
    expect(menu.find((o) => o.id === 'askMoveIn')?.disabled).toBe('결혼한 사람이에요');
    expect(g.dateBlocker(me, yerin.id)).toBe('결혼한 사람이에요');
    // A single neighbour with no children is free.
    expect(g.dateBlocker(me, by('다은').id)).not.toBe('결혼한 사람이에요');
  });
});

describe('a married character', () => {
  it('has romance, a date and someone moving in only with their spouse; never with family', async () => {
    const { Game } = await import('./game');
    const { relKey } = await import('./socials');
    const g = Game.create(
      [
        { name: '하린', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10', gender: 'female' },
        { name: '시우', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10', gender: 'male' },
      ],
      () => 0.5,
    );
    const [a, b] = g.household();
    g.relationship(a.id, b.id).flags.push('married');
    expect(g.spouseOf(a)).toBe(b.id);
    expect(g.romanceBlocked(a, b)).toBeNull();
    // 다은: single, no children — but 하린 is married.
    const free = g.state.townies!.find((x) => x.name === '다은')!;
    expect(g.spokenFor(free)).toBeNull();
    expect(g.romanceBlocked(a, free)).toBe('결혼한 사람은 배우자와만 할 수 있어요');
    expect(g.romanceBlocked(free, b)).toBe('결혼한 사람이에요');
    g.relationship(a.id, free.id).romance = 40;
    free.job = undefined; // at home, so the date's answer is about marriage, not her shift
    g.state.time = Math.floor(g.state.time / 1440) * 1440 + 14 * 60;
    expect(g.dateBlocker(a, free.id)).toBe('결혼한 사람은 배우자와만 할 수 있어요');
    // Their child: family, never romance.
    const kid = { ...a, id: 999, name: '아이', parents: [a.id, b.id] };
    g.state.dwellers.push(kid);
    expect(g.romanceBlocked(kid, a)).toBe('가족이에요');
    expect(g.romanceBlocked(a, kid)).toBe('가족이에요');
    // Widowed: free again.
    g.state.dwellers = g.state.dwellers.filter((x) => x.id !== b.id);
    expect(relKey(a.id, b.id) in g.state.relationships).toBe(true);
    expect(g.spouseOf(a)).toBeNull();
    // (다은 is a woman, as 하린 is.)
    expect(g.romanceBlocked(a, free)).toBe('동성과는 로맨스를 할 수 없어요');
    expect(g.tiesBlocked(a, free)).toBeNull();
  });
});
