import { describe, expect, it } from 'vitest';
import { Game } from './game';
import { SOCIAL_BY_ID } from './socials';
import { TRAITS, TRAIT_BY_ID, conflictsWith } from './traits';
import { PICKABLE_TRAITS, TRAIT_GROUPS, randomPersonality, storyResult, CAS_QUESTIONS } from './cas';

function seeded(seed = 5) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function newGame(a: string[], b: string[] = []) {
  const g = Game.create(
    [
      { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10', traits: a },
      { name: '서연', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e', traits: b },
    ],
    seeded(),
  );
  g.state.freeWill = false;
  return g;
}

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

describe('traits', () => {
  it('has no 절도벽 or 속물 any more, and an old save lets them go', () => {
    for (const id of ['kleptomaniac', 'snob']) {
      expect(TRAIT_BY_ID[id]).toBeUndefined();
      expect(PICKABLE_TRAITS.some((x) => x.id === id)).toBe(false);
      expect(TRAIT_GROUPS.some((grp) => grp.ids.includes(id))).toBe(false);
      expect(TRAITS.some((x) => x.conflicts.includes(id))).toBe(false);
    }
    const rng = seeded(9);
    for (let i = 0; i < 200; i++) expect(randomPersonality(rng, []).traits.some((x) => x === 'kleptomaniac' || x === 'snob')).toBe(false);
    const all = CAS_QUESTIONS.map((q) => q.answers.map((_, i) => i));
    for (let i = 0; i < 4; i++) expect(storyResult(all.map((a) => a[i % a.length])).traits.some((x) => x === 'kleptomaniac' || x === 'snob')).toBe(false);
    const old = newGame(['kleptomaniac', 'snob', 'cheerful']).state;
    old.dwellers[0].traitNeeds = { kleptomaniac: 100 };
    old.dwellers[0].buffs.push({ id: 'snobBored', until: old.time + 60 } as never);
    const g = new Game(JSON.parse(JSON.stringify(old)), seeded());
    expect(g.state.dwellers[0].traits).toEqual(['cheerful']);
    expect(g.state.dwellers[0].traitNeeds?.kleptomaniac).toBeUndefined();
    expect(g.state.dwellers[0].buffs.some((b) => b.id === 'snobBored')).toBe(false);
  });
  it('blocks conflicting picks', () => {
    expect(conflictsWith(['loner'], 'outgoing')).toBe(true);
    expect(conflictsWith(['outgoing'], 'loner')).toBe(true);
    expect(conflictsWith(['loner'], 'bookworm')).toBe(false);
  });

  it('loners lose social half as fast and never feel lonely', () => {
    const g = newGame(['loner']);
    const [loner, other] = g.state.dwellers;
    loner.needs.social = other.needs.social = 80;
    run(g, 120);
    expect(80 - loner.needs.social).toBeCloseTo((80 - other.needs.social) / 2, 1);
    loner.needs.social = 20;
    g.step(0.5);
    expect(loner.buffs.some((b) => b.id === 'lonely')).toBe(false);
  });

  it('gluttons feel hunger twice as uncomfortably', () => {
    const g = newGame(['glutton']);
    const [glutton, other] = g.state.dwellers;
    glutton.needs.hunger = other.needs.hunger = 20;
    g.step(0.5);
    expect(g.emotionOf(glutton).weight).toBe(2);
    expect(g.emotionOf(other).weight).toBe(1);
  });

  it('bookworms get inspired by reading', () => {
    const g = newGame(['bookworm']);
    const dweller = g.state.dwellers[0];
    const shelf = g.state.objects.find((o) => o.defId === 'bookshelf')!;
    g.enqueue(dweller.id, { kind: 'interact', objectUid: shelf.uid, interactionId: 'read', autonomous: false });
    run(g, 70);
    expect(dweller.buffs.some((b) => b.id === 'bookwormInspired')).toBe(true);
  });

  it('goofballs land jokes more often', () => {
    const tally = (traits: string[]) => {
      const g = newGame(traits);
      const [a, b] = g.state.dwellers;
      let great = 0;
      for (let i = 0; i < 200; i++) {
        const rel = g.relationship(a.id, b.id);
        rel.recent = null;
        if (g.socialOutcome(a, b, SOCIAL_BY_ID.joke, rel) === 'great') great++;
      }
      return great;
    };
    expect(tally(['goofball'])).toBeGreaterThan(tally([]) + 50);
  });

  it("loyal dwellers' relationships cool at half speed", () => {
    const decayed = (traits: string[]) => {
      const g = newGame(traits);
      const rel = g.relationship(1, 2);
      rel.friend = 50;
      rel.lastChange = -1e6;
      run(g, 1440);
      return 50 - rel.friend;
    };
    expect(decayed(['loyal'])).toBeCloseTo(decayed([]) / 2, 1);
  });
});
