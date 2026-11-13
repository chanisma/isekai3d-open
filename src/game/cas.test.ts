import { describe, expect, it } from 'vitest';
import { ASPIRATION_BY_ID, aspirationsFor } from './aspirations';
import { CAS_QUESTIONS, PICKABLE_TRAITS, STORY_TRAITS, TRAIT_GROUPS, randomPersonality, storyResult } from './cas';
import { PREFERENCE_BY_ID } from './preferences';
import { MAX_TRAITS, conflictsWith } from './traits';

describe('making a dweller (after 참고 게임 Create a Dweller and CAS Stories)', () => {
  it('only gives traits, likes and aspirations that exist', () => {
    const pickable = new Set(PICKABLE_TRAITS.map((t) => t.id));
    for (const t of STORY_TRAITS) expect(pickable.has(t), t).toBe(true);
    for (const q of CAS_QUESTIONS)
      for (const a of q.answers) {
        for (const l of a.likes ?? []) expect(PREFERENCE_BY_ID[l], l).toBeTruthy();
        for (const id of Object.keys(a.asp ?? {})) expect(ASPIRATION_BY_ID[id], id).toBeTruthy();
      }
  });

  it('puts every pickable trait in one of the four groups', () => {
    const grouped = TRAIT_GROUPS.flatMap((g) => g.ids);
    for (const t of PICKABLE_TRAITS) expect(grouped, t.id).toContain(t.id);
    expect(new Set(grouped).size).toBe(grouped.length);
  });

  it('turns answers into a dweller: up to five traits that get along, likes, and a dream', () => {
    const r = storyResult([1, 0, 0, 1, 3, 0, 4]);
    expect(r.traits.length).toBe(MAX_TRAITS);
    for (const t of r.traits) expect(conflictsWith(r.traits, t)).toBe(false);
    expect(r.traits).toContain('planner');
    expect(r.traits).toContain('neat');
    expect(r.likes.length).toBeGreaterThan(0);
    expect(ASPIRATION_BY_ID[r.aspiration]).toBeTruthy();
    // Every way of answering gives a dweller with traits that get along.
    for (let n = 0; n < 200; n++) {
      const ans = CAS_QUESTIONS.map((q, i) => (n * (i + 3) + i) % q.answers.length);
      const x = storyResult(ans);
      for (const t of x.traits) expect(conflictsWith(x.traits, t)).toBe(false);
    }
  });

  it('suggests the journey to find oneself to a dweller with no dream yet', () => {
    expect(storyResult([]).aspiration).toBe('findMyself');
    expect(storyResult([-1, 1, 3, -1, -1, 2]).aspiration).toBe('findMyself');
  });

  it('rolls a personality that gets along', () => {
    let seed = 7;
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const ids = aspirationsFor(undefined).map((a) => a.id);
    for (let i = 0; i < 50; i++) {
      const p = randomPersonality(rng, ids);
      expect(p.traits.length).toBe(MAX_TRAITS);
      for (const t of p.traits) expect(conflictsWith(p.traits, t)).toBe(false);
      expect(p.likes).not.toContain(p.dislikes[0]);
    }
  });
});
