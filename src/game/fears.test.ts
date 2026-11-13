import { describe, expect, it } from 'vitest';
import { Game } from './game';

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

describe('fears (참고 게임 Wants & Fears)', () => {
  it('a fear can come from a bad moment, bring Scared moodlets, and be faced', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.01);
    g.state.freeWill = false;
    const dweller = g.state.dwellers[0];
    g.maybeFear(dweller, 'dark');
    expect(dweller.fears).toEqual(['dark']);
    // Out in the yard at night: scared, but an hour of it faces the fear.
    g.state.time = Math.floor(g.state.time / 1440) * 1440 + 1440 + 22 * 60;
    dweller.x = 3;
    dweller.y = 17;
    run(g, 35);
    expect(dweller.buffs.some((b) => b.id === 'fearDarkOutside')).toBe(true);
    expect(dweller.emotion).toBe('scared');
    run(g, 60);
    // (Out of work, they may have taken on a worry about the future meanwhile.)
    expect(dweller.fears).not.toContain('dark');
    expect(dweller.buffs.some((b) => b.id === 'fearFaced')).toBe(true);
  });

  it('a skill level-up faces the fear of failure', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.01);
    const dweller = g.state.dwellers[0];
    g.maybeFear(dweller, 'failure');
    dweller.skills.logic = 0.999;
    (g as unknown as { gainSkill(s: typeof dweller, k: string, a: number): void }).gainSkill(dweller, 'logic', 0.1);
    expect(dweller.fears).toEqual([]);
  });
});

import { SOCIAL_BY_ID } from './socials';
import { CAREER_FIELDS } from './careers';
import { FEARS, FEAR_BY_ID, TALK_SHARE } from './fears';

type Private = { applySocialOutcome(a: unknown, b: unknown, s: unknown, o: string): void; gainSkill(s: unknown, k: string, a: number): void };
const two = () => {
  const g = Game.create(
    [
      { name: '하린', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
      { name: '시우', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
    ],
    () => 0.01,
  );
  return { g, me: g.state.dwellers[0], friend: g.state.dwellers[1] };
};

describe('fears, more of them and more ways through (docs/ref-game/16-fears.md)', () => {
  it('has sixteen, each saying where it comes from, what it does and how to face it', () => {
    expect(FEARS.length).toBe(16);
    for (const f of FEARS) {
      expect(f.why.length).toBeGreaterThan(3);
      expect(f.does.length).toBeGreaterThan(3);
      expect(f.need).toBeGreaterThan(0);
      expect(`${f.label}${f.why}${f.does}${f.face}${f.also ?? ''}`).not.toMatch(/심(이|을|은|의|에게)/);
    }
  });

  it('talking it over with someone close eases every fear a third, once a day, and lifts the mood', () => {
    const { g, me, friend } = two();
    g.maybeFear(me, 'lonely');
    g.maybeFear(me, 'future');
    expect(me.fears).toEqual(['lonely', 'future']);
    g.relationship(me.id, friend.id).friend = 40;
    const before = { ...me.fearProgress };
    (g as unknown as Private).applySocialOutcome(me, friend, SOCIAL_BY_ID.deepTalk, 'ok');
    expect(me.buffs.some((b) => b.id === 'fearShared')).toBe(true);
    expect(me.fearProgress!.future).toBeCloseTo((before.future ?? 0) + FEAR_BY_ID.future.need * TALK_SHARE, 5);
    const once = me.fearProgress!.future!;
    (g as unknown as Private).applySocialOutcome(me, friend, SOCIAL_BY_ID.deepTalk, 'ok');
    expect(me.fearProgress!.future).toBe(once);
  });

  it('overcoming one leaves a stronger heart behind and is counted', () => {
    const { g, me } = two();
    g.maybeFear(me, 'money');
    const r = me.skills.resilience;
    g.faceFear(me, 'money', FEAR_BY_ID.money.need);
    expect(me.fears).toEqual([]);
    expect(me.fearsFaced).toBe(1);
    expect(me.skills.resilience).toBeGreaterThan(r);
    expect(me.buffs.some((b) => b.id === 'fearFaced')).toBe(true);
  });

  it('an unknown future eases with each field looked into, and a job ends it', () => {
    const { g, me } = two();
    g.maybeFear(me, 'future');
    g.noteExplore(me.id, CAREER_FIELDS[0].id);
    expect(me.fearProgress!.future).toBe(1);
    g.acceptJob(me.id, 'teacher');
    expect(me.fears ?? []).not.toContain('future');
  });

  it('afraid of failing, a little less is learnt; a level of resilience eases every fear', () => {
    const { g, me, friend } = two();
    g.maybeFear(me, 'failure');
    (g as unknown as Private).gainSkill(me, 'logic', 0.5);
    (g as unknown as Private).gainSkill(friend, 'logic', 0.5);
    expect(me.skills.logic / friend.skills.logic).toBeCloseTo(0.9, 5);
    g.maybeFear(me, 'lonely');
    me.skills.resilience = 0.999;
    (g as unknown as Private).gainSkill(me, 'resilience', 0.1);
    expect(me.fearProgress!.lonely).toBeCloseTo(FEAR_BY_ID.lonely.need / 3, 5);
  });

  it('a money worry eases when bills are paid, and old saves keep their fears', () => {
    const { g, me } = two();
    g.maybeFear(me, 'money');
    g.economy.bill = { amount: 10, issuedAt: g.state.time, warned: false, cut: [] };
    expect(g.payBill()).toBe(true);
    expect(me.fearProgress!.money).toBe(1);
    me.fears = ['dark', 'crowded'];
    const again = new Game(JSON.parse(JSON.stringify(g.state)));
    expect(again.state.dwellers[0].fears).toEqual(['dark', 'crowded']);
  });
});
