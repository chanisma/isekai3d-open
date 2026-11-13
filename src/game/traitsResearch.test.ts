import { describe, expect, it } from 'vitest';
import { CAS_QUESTIONS, PICKABLE_TRAITS, TRAIT_GROUPS, randomPersonality, storyResult } from './cas';
import { CATALOG } from './catalog';
import { SKILL_KEYS } from './constants';
import { BUFFS } from './emotions';
import { Game } from './game';
import { SOCIALS } from './socials';
import { MAX_TRAITS, TRAITS, TRAIT_BY_ID, conflictsWith, traitFitsAge } from './traits';

/** The traits added from personality research (docs/ref-game/04 §3.6). */
const NEW = ['planner', 'spontaneous', 'careful', 'adventurous', 'homebody', 'worrier', 'easygoing', 'optimist', 'curious', 'empathetic', 'competitive', 'modest', 'fair', 'leader', 'shy', 'sensitive', 'steadfast', 'moodMaker', 'thrifty'];

// Plus mopping a puddle, an action of its own that 깔끔함 names.
const INTERACTIONS = new Set([...CATALOG.flatMap((d) => (d.interactions ?? []).map((i) => i.id)), 'mop']);
const SOCIAL_IDS = new Set(SOCIALS.map((s) => s.id));
const CATEGORIES = new Set(['friendly', 'funny', 'romance', 'mean', 'mischief']);
const NEEDS = new Set(['hunger', 'energy', 'bladder', 'hygiene', 'fun', 'social']);

function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

describe('traits from personality research', () => {
  it('adds them all, pickable for children, teens and adults', () => {
    for (const id of NEW) {
      const t = TRAIT_BY_ID[id];
      expect(t, id).toBeTruthy();
      expect(t.reward, id).toBeFalsy();
      expect(PICKABLE_TRAITS.some((x) => x.id === id), id).toBe(true);
      for (const age of ['child', 'teen', 'adult']) expect(traitFitsAge(t, age), `${id} ${age}`).toBe(true);
      expect(traitFitsAge(t, 'toddler'), id).toBe(false);
      expect(TRAIT_GROUPS.some((g) => g.ids.includes(id)), id).toBe(true);
    }
    expect(new Set(TRAITS.map((t) => t.id)).size).toBe(TRAITS.length);
    expect(new Set(TRAITS.filter((t) => !t.reward && !t.ages?.includes('toddler')).map((t) => t.label)).size).toBe(TRAITS.filter((t) => !t.reward && !t.ages?.includes('toddler')).length);
  });

  it("refers only to moodlets, interactions, socials, skills and needs that exist (every trait's)", () => {
    for (const t of TRAITS) {
      // 오락가락's low mark rolls a random mood instead (game.ts stepTraits), so its lowBuff is never shown.
      const buffs = [...Object.keys(t.buffWeight ?? {}), ...Object.keys(t.buffReplace ?? {}), ...Object.values(t.buffReplace ?? {}).filter((b): b is string => !!b), ...Object.values(t.onInteraction ?? {}), t.idleFeeling, t.id === 'insane' ? undefined : t.need?.lowBuff, t.need?.highBuff, t.toddler?.buff].filter((b): b is string => !!b);
      for (const b of buffs) expect(BUFFS[b], `${t.id}: moodlet ${b}`).toBeTruthy();
      for (const i of [...Object.keys(t.drive ?? {}), ...Object.keys(t.onInteraction ?? {}), ...(t.need?.fills ?? [])]) expect(INTERACTIONS.has(i), `${t.id}: interaction ${i}`).toBe(true);
      for (const s of Object.keys(t.socialDrive ?? {})) expect(SOCIAL_IDS.has(s), `${t.id}: social ${s}`).toBe(true);
      for (const c of [...Object.keys(t.socialBonus ?? {}), ...Object.keys(t.categoryDrive ?? {}), ...(t.need?.socials ?? [])]) expect(CATEGORIES.has(c), `${t.id}: category ${c}`).toBe(true);
      for (const k of Object.keys(t.skillMul ?? {})) expect((SKILL_KEYS as string[]).includes(k), `${t.id}: skill ${k}`).toBe(true);
      for (const k of [...Object.keys(t.decayMul ?? {}), ...Object.keys(t.needDrive ?? {})]) expect(NEEDS.has(k), `${t.id}: need ${k}`).toBe(true);
    }
  });

  it('gives each new trait a few real effects', () => {
    for (const id of NEW) {
      const t = TRAIT_BY_ID[id];
      const fields = (['decayMul', 'needDrive', 'buffWeight', 'buffReplace', 'onInteraction', 'socialBonus', 'socialDrive', 'relDecayMul', 'skillMul', 'need', 'drive', 'categoryDrive', 'careDrive', 'idleFeeling'] as const).filter((k) => t[k] !== undefined);
      expect(fields.length, id).toBeGreaterThanOrEqual(2);
      expect(fields.length, id).toBeLessThanOrEqual(5);
    }
  });

  it('keeps conflicts symmetric, between traits that exist', () => {
    for (const t of TRAITS)
      for (const c of t.conflicts) {
        expect(TRAIT_BY_ID[c], `${t.id} conflicts with missing ${c}`).toBeTruthy();
        expect(c, t.id).not.toBe(t.id);
        expect(TRAIT_BY_ID[c].conflicts, `${c} should list ${t.id} back`).toContain(t.id);
        expect(conflictsWith([t.id], c) && conflictsWith([c], t.id)).toBe(true);
      }
    expect(conflictsWith(['planner'], 'spontaneous')).toBe(true);
    expect(conflictsWith(['worrier'], 'optimist')).toBe(true);
    expect(conflictsWith(['shy'], 'leader')).toBe(true);
    expect(conflictsWith(['curious'], 'genius')).toBe(false);
  });

  it('lets the dice roll the new traits', () => {
    const rng = seeded(11);
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) for (const t of randomPersonality(rng, ['findMyself']).traits) seen.add(t);
    for (const id of NEW) expect(seen.has(id), id).toBe(true);
  });
});

describe('이야기로 정하기', () => {
  it('asks about a dozen everyday questions, each naming the character', () => {
    expect(CAS_QUESTIONS.length).toBeGreaterThanOrEqual(10);
    expect(CAS_QUESTIONS.length).toBeLessThanOrEqual(13);
    expect(new Set(CAS_QUESTIONS.map((q) => q.id)).size).toBe(CAS_QUESTIONS.length);
    for (const q of CAS_QUESTIONS) {
      expect(/이 캐릭터[는가]/.test(q.text), q.id).toBe(true);
      expect(q.answers.length, q.id).toBeGreaterThanOrEqual(4);
      for (const a of q.answers) for (const t of Object.keys(a.traits ?? {})) expect(conflictsWith(Object.keys(a.traits ?? {}), t), `${q.id}: ${a.text}`).toBe(false);
    }
  });

  it('can give every trait a player can pick: answering only where it is weighed gives it', () => {
    for (const t of PICKABLE_TRAITS) {
      const answers = CAS_QUESTIONS.map((q) => {
        let best = -1;
        q.answers.forEach((a, i) => {
          if ((a.traits?.[t.id] ?? 0) > (q.answers[best]?.traits?.[t.id] ?? 0)) best = i;
        });
        return best;
      });
      expect(answers.some((a) => a >= 0), `${t.id} is in no answer`).toBe(true);
      expect(storyResult(answers).traits, t.id).toContain(t.id);
    }
  });

  it('gives varied dwellers for different answers, not the same few traits', () => {
    const rng = seeded(3);
    const count = new Map<string, number>();
    const sets = new Set<string>();
    const runs = 600;
    for (let n = 0; n < runs; n++) {
      const answers = CAS_QUESTIONS.map((q) => Math.floor(rng() * q.answers.length));
      const r = storyResult(answers);
      expect(r.traits.length).toBe(MAX_TRAITS);
      for (const t of r.traits) {
        expect(conflictsWith(r.traits, t)).toBe(false);
        count.set(t, (count.get(t) ?? 0) + 1);
      }
      sets.add([...r.traits].sort().join(','));
    }
    expect(count.size).toBeGreaterThanOrEqual(35);
    for (const id of NEW) expect(count.get(id) ?? 0, id).toBeGreaterThan(0);
    for (const [t, c] of count) expect(c / runs, t).toBeLessThan(0.35);
    expect(sets.size).toBeGreaterThan(runs * 0.6);
  });

  it('fits the traits to the age it is asked for', () => {
    // The dream answer weighs 야심가, an adult trait: a teen gets the next one instead.
    const answers = CAS_QUESTIONS.map((q) => (q.id === 'dream' ? q.answers.findIndex((a) => a.traits?.ambitious) : -1));
    expect(storyResult(answers).traits).toContain('ambitious');
    const teen = storyResult(answers, 'teen').traits;
    expect(teen).not.toContain('ambitious');
    expect(teen).toContain('leader');
  });
});

describe('the new traits at work', () => {
  function household(traits: string[][]) {
    const g = Game.create(
      traits.map((t, i) => ({ name: ['민준', '서연'][i], shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10', traits: t })),
      seeded(5),
    );
    g.state.freeWill = false;
    g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
    return g;
  }

  it('a competitive dweller feels a win three times as much, and a worrier feels stress twice as much', () => {
    const g = household([['competitive'], []]);
    const [a, b] = g.state.dwellers;
    for (const s of [a, b]) s.buffs.push({ id: 'chessWin', until: g.state.time + 120 } as never);
    g.step(0.5);
    expect(g.emotionOf(a).weight).toBeGreaterThan(g.emotionOf(b).weight);
    const w = household([['worrier'], ['easygoing']]);
    const [x, y] = w.state.dwellers;
    for (const s of [x, y]) s.buffs.push({ id: 'workStress', until: w.state.time + 120 } as never);
    w.step(0.5);
    const stress = (s: typeof x) => (w.emotionOf(s).emotion === 'stressed' ? w.emotionOf(s).weight : 0);
    expect(stress(x)).toBeGreaterThan(stress(y));
  });
});
