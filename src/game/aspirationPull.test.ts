import { describe, expect, it } from 'vitest';
import { PERSONAL_MAX, PERSONAL_MIN, personalPull, rankOptions } from './autonomy';
import { ASP_AREA_PULL, ASP_GOAL_PULL, aspTargets, aspirationPull } from './aspirations';
import { Game } from './game';
import { LIKE_MULTIPLIER } from './preferences';
import { TRAIT_CEIL } from './traits';

// An aspiration leans free will towards what it asks (2026-10-26, at the user's request), under a
// trait and a like; all the dweller's leanings together kept within one range.

function solo() {
  const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }]);
  g.state.freeWill = false;
  g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
  const dweller = g.state.dwellers[0];
  dweller.traits = [];
  dweller.job = null;
  return { g, dweller };
}

describe('aspiration pull', () => {
  it('what the step still needs pulls; the area a little; the rest not at all', () => {
    const { g, dweller } = solo();
    dweller.aspiration = { id: 'masterChef', milestone: 0, counters: {} };
    const t = aspTargets(g, dweller);
    expect(aspirationPull(t, 'cook', 'cooking')).toBe(ASP_GOAL_PULL);
    expect(aspirationPull(t, 'paint', 'painting')).toBe(ASP_AREA_PULL);
    expect(aspirationPull(t, 'workout', 'fitness')).toBe(1);
    // The goal met: only the area is left.
    dweller.aspiration.counters = { cook: 5 };
    dweller.aspiration.milestone = 0;
    expect(aspirationPull(aspTargets(g, dweller), 'cook', 'cooking')).toBe(ASP_AREA_PULL);
    // No aspiration, no pull.
    dweller.aspiration = undefined;
    expect(aspirationPull(aspTargets(g, dweller), 'cook', 'cooking')).toBe(1);
  });

  it('in free will: cooking scores more with the chef’s aspiration', () => {
    const { g, dweller } = solo();
    const cook = () => Math.max(0, ...rankOptions(g, dweller).filter((c) => c.action.kind === 'interact' && c.action.interactionId === 'cook').map((c) => c.score));
    dweller.needs.hunger = 40;
    const plain = cook();
    dweller.aspiration = { id: 'masterChef', milestone: 0, counters: {} };
    expect(cook()).toBeCloseTo(plain * ASP_GOAL_PULL, 5);
  });

  it('sizes: a like > traits > an aspiration; together within one range', () => {
    expect(LIKE_MULTIPLIER).toBeGreaterThan(TRAIT_CEIL);
    expect(TRAIT_CEIL).toBeGreaterThan(ASP_GOAL_PULL);
    expect(personalPull(LIKE_MULTIPLIER * 2.2, TRAIT_CEIL, ASP_GOAL_PULL)).toBe(PERSONAL_MAX);
    expect(personalPull(0.05, 0.35)).toBe(PERSONAL_MIN);
    expect(personalPull(1.2, 1.1)).toBeCloseTo(1.32);
  });
});
