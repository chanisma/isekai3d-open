import { describe, expect, it } from 'vitest';
import { socialScore } from './autonomy';
import { COLLEAGUE_NEED_FLOOR, GOAL_BY_ID, bondOf, helpPull, listenShare, shiftJoy, shiftWorries } from './colleagueLife';
import { Game } from './game';
import { newRelationship } from './relationships';
import { SOCIAL_BY_ID, socialFits } from './socials';
import type { Townie } from './visitors';

// Colleagues' own lives at work (2026-10-26, at the user's request): a goal, worries to hear out,
// good news to share, bonds with each other, needs of their own.

const tour = () => {
  const g = Game.workplaceTour('singer');
  const mates = g.state.dwellers.filter((s) => s.npc?.role === 'coworker');
  return { g, mates, me: g.state.dwellers[0] };
};

describe('colleague life', () => {
  it('each colleague comes in with a goal; worries and good news come and go by the shift', () => {
    const t = { id: 900, name: '도현', goal: 'license' } as Townie;
    let got = 0;
    let glad = 0;
    for (let i = 0; i < 200; i++) {
      t.fears = [];
      if (shiftWorries(t, Math.random)) got++;
      if (shiftJoy(t, Math.random)) glad++;
    }
    expect(got).toBeGreaterThan(10);
    expect(got).toBeLessThan(70);
    expect(glad).toBeGreaterThan(15);
    expect(GOAL_BY_ID.license.label).toBeTruthy();
  });

  it('on the work lot: goals, their own needs (off the floor), bonds with each other kept', () => {
    const { g, mates } = tour();
    expect(mates.length).toBeGreaterThan(1);
    const [a, b] = mates;
    const rel = g.state.relationships[a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`];
    expect(rel).toBeTruthy();
    // Needs run down, but not below the floor.
    a.needs.hunger = 0;
    g.update(0.1);
    expect(a.needs.hunger).toBeGreaterThanOrEqual(COLLEAGUE_NEED_FLOOR - 1);
    expect(a.needs.hunger).toBeLessThan(60);
  });

  it('a worry can be heard out (eased, more by someone good with people); good news shared', () => {
    const { g, mates, me } = tour();
    const t = mates[0];
    t.fears = ['failure'];
    expect(socialFits(SOCIAL_BY_ID.hearOut, t)).toBe(true);
    expect(socialFits(SOCIAL_BY_ID.hearOut, mates[1])).toBe(mates[1].fears?.length ? true : false);
    (g as unknown as { hearOut(a: unknown, b: unknown, great: boolean): void }).hearOut(me, t, false);
    // failure needs one level-up: a third of it eased.
    expect(t.fearProgress?.failure).toBeGreaterThan(0.3);
    // Once a day.
    const p = t.fearProgress!.failure!;
    (g as unknown as { hearOut(a: unknown, b: unknown, great: boolean): void }).hearOut(me, t, true);
    expect(t.fearProgress!.failure).toBe(p);
    expect(listenShare({ empathy: 8, charisma: 6 }, true)).toBeGreaterThan(listenShare({}, false));
    // Good news.
    t.joy = 'birthday';
    expect(socialFits(SOCIAL_BY_ID.shareJoy, t)).toBe(true);
    (g as unknown as { shareJoy(a: unknown, b: unknown): void }).shareJoy(me, t);
    expect(t.joy).toBeUndefined();
  });

  it('free will: someone good with people goes to hear a worry out', () => {
    const { mates, me } = tour();
    const t = mates[0];
    t.fears = ['lonely'];
    const rel = newRelationship(20, 0, 0);
    me.needs.social = 40;
    me.skills.empathy = 0;
    me.skills.charisma = 0;
    const plain = socialScore(me, SOCIAL_BY_ID.hearOut, rel, t);
    me.skills.empathy = 8;
    me.skills.charisma = 6;
    expect(socialScore(me, SOCIAL_BY_ID.hearOut, rel, t)).toBeCloseTo(plain * helpPull(me.skills), 5);
    expect(helpPull(me.skills)).toBeGreaterThan(2);
  });

  it('bonds as told', () => {
    expect(bondOf({ friend: -20, romance: 0 })).toBe('rival');
    expect(bondOf({ friend: 60, romance: 0 })).toBe('close');
    expect(bondOf({ friend: 30, romance: 12 })).toBe('crush');
    expect(bondOf({ friend: 5, romance: 0 })).toBeNull();
  });
});
