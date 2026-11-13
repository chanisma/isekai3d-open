import { describe, expect, it } from 'vitest';
import { Game } from './game';
import { CALL_RING, STREET_FRIENDS, bondKey, growBond, stepStreetBonds } from './neighbourhood';

const seeded = (seed = 5) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const game = () => Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], seeded());
type Private = { rng: () => number; stepAdviceCalls(): void };
const DAY = 1440;

describe('friendships on the street (after 참고 게임 NeighborhoodStories)', () => {
  it('brings neighbours from different houses and of a crowd together, with news at friends and best friends', () => {
    const g = game();
    const t = g.state.townies!;
    const bonds: Record<string, number> = {};
    for (let i = 0; i < 40; i++) stepStreetBonds(t, bonds, seeded(i + 1));
    for (const key of Object.keys(bonds)) {
      const [a, b] = key.split('-').map(Number).map((id) => t.find((x) => x.id === id)!);
      expect(a.home).not.toBe(b.home);
      expect(a.age === 'child' || a.age === 'teen').toBe(b.age === 'child' || b.age === 'teen');
    }
    const [x, y] = [t.find((n) => n.name === '도윤')!, t.find((n) => n.name === '다은')!];
    const fresh: Record<string, number> = {};
    expect(growBond(x, y, fresh, STREET_FRIENDS)[0].kind).toBe('friends');
    expect(growBond(x, y, fresh, 40)[0].kind).toBe('bestFriends');
    expect(growBond(x, y, fresh, 10)).toHaveLength(0);
  });
});

describe('a neighbour asking for advice (after 참고 게임 NeighborRelPhoneCall)', () => {
  const ringing = () => {
    const g = game();
    const me = g.state.dwellers[0];
    const doyun = g.state.townies!.find((t) => t.name === '도윤')!;
    g.relationship(me.id, doyun.id).friend = 40;
    g.state.time = 5 * DAY + 11 * 60; // Saturday morning: everyone is home
    (g as unknown as Private).rng = () => 0;
    (g as unknown as Private).stepAdviceCalls();
    (g as unknown as Private).rng = seeded(9);
    return { g, me };
  };

  it('rings with a question about another neighbour, from a friend at home', () => {
    const { g, me } = ringing();
    const v = g.neighbourCallView()!;
    expect(v.dweller).toBe(me);
    expect(g.relationship(me.id, v.from.id).friend).toBeGreaterThanOrEqual(20);
    expect(v.text).toContain(v.about.name);
    expect(v.choices).toHaveLength(2);
  });

  it('after a "yes", brings the two closer and calls back to say thanks, which feels good', () => {
    const { g, me } = ringing();
    const { from, about } = g.neighbourCallView()!;
    g.answerNeighbourCall(0);
    expect(g.state.streetBonds![bondKey(from.id, about.id)]).toBe(20);
    expect(g.state.adviceFollowUp).toBeTruthy();
    g.state.time = g.state.adviceFollowUp!.at;
    (g as unknown as Private).stepAdviceCalls();
    const thanks = g.neighbourCallView()!;
    expect(thanks.phase).toBe('thanks');
    g.answerNeighbourCall(0);
    expect(me.buffs.some((b) => b.id === 'broughtTogether')).toBe(true);
    expect(g.state.streetBonds![bondKey(from.id, about.id)]).toBe(35);
    expect(g.state.streetNews!.some((n) => n.text.includes('친구가 됐어요'))).toBe(true);
  });

  it('does nothing more after a "not sure", waits 72 hours to call again, and stops ringing unanswered', () => {
    const { g } = ringing();
    g.answerNeighbourCall(1);
    expect(g.state.adviceFollowUp).toBeUndefined();
    (g as unknown as Private).rng = () => 0;
    g.state.time += 24 * 60;
    (g as unknown as Private).stepAdviceCalls();
    expect(g.state.neighbourCall).toBeUndefined();
    g.state.time += 48 * 60;
    (g as unknown as Private).stepAdviceCalls();
    expect(g.state.neighbourCall).toBeTruthy();
    g.state.time += CALL_RING;
    (g as unknown as Private).stepAdviceCalls();
    expect(g.state.neighbourCall).toBeUndefined();
  });
});
