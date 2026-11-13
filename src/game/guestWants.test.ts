import { describe, expect, it } from 'vitest';
import { GUEST_HOST_PULL, WANT_SOCIAL_PULL, visitPull } from './autonomy';
import { Game } from './game';
import type { Dweller } from './types';
import { TOWNIE_ID_BASE } from './visitors';
import { WANT_BY_ID, WANT_SLOTS, wantLabel } from './wants';

// When someone is invited or let in, things to do with them come into the household's wants, and the
// guest leans towards the household (2026-10-26, at the user's request).

/** 다은 (106): single, kept home, so she can come over. */
const FREE = TOWNIE_ID_BASE + 5;

function household() {
  const g = Game.create(
    [
      { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
      { name: '서연', shirt: '#e53935', skin: '#f8d9c0', hair: '#2b1b10' },
    ],
    () => 0.3,
  );
  g.state.freeWill = false;
  g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
  g.state.time = 11 * 60;
  g.state.townies!.find((t) => t.id === FREE)!.job = undefined;
  return g;
}

function invite(g: Game): Dweller {
  g.inviteOver(g.state.dwellers[0].id, FREE);
  for (let t = 0; t < 180 && g.dweller(FREE)?.npc?.role !== 'guest'; t += 0.5) g.step(0.5);
  const v = g.dweller(FREE)!;
  expect(v.npc?.role).toBe('guest');
  return v;
}

describe('wants with a guest', () => {
  it('an invited guest comes into everyone’s wants at once, even with the slots full', () => {
    const g = household();
    // Slots full of other wants.
    for (const s of g.household()) s.wants = ['skill_cooking', 'skill_logic', 'skill_fitness'].map((defId, i) => ({ defId, since: g.state.time - 30 + i }));
    const v = invite(g);
    for (const s of g.household()) {
      const w = s.wants!.find((x) => x.targetId === v.id);
      expect(w, s.name).toBeTruthy();
      expect(WANT_BY_ID[w!.defId].set).toBe('guest');
      expect(wantLabel(g, w!)).toContain(v.name);
      expect(s.wants!.length).toBeLessThanOrEqual(WANT_SLOTS);
    }
  });

  it('doing it fulfils it; the guest’s wants go when they do', () => {
    const g = household();
    const v = invite(g);
    const [a] = g.state.dwellers;
    a.wants = [{ defId: 'guestChat', targetId: v.id, since: g.state.time }];
    Object.assign(a, { x: 11, y: 11, queue: [], run: null });
    Object.assign(v, { x: 12, y: 11, queue: [], run: null });
    const before = a.satisfaction ?? 0;
    g.rng = () => 0.1;
    g.enqueue(a.id, { kind: 'social', targetId: v.id, socialId: 'chat', autonomous: false });
    for (let t = 0; t < 40; t += 0.5) g.step(0.5);
    expect(a.wants!.some((w) => w.defId === 'guestChat')).toBe(false);
    expect(a.satisfaction ?? 0).toBeGreaterThan(before);
    // Gone home: no want for them is left, and none is drawn.
    a.wants = [{ defId: 'guestJoke', targetId: v.id, since: g.state.time }];
    v.npc!.until = g.state.time;
    for (let t = 0; t < 30 && g.dweller(FREE)?.npc?.role === 'guest'; t += 0.5) g.step(0.5);
    g.refreshWants(a.id);
    expect(a.wants!.some((w) => w.targetId === v.id)).toBe(false);
  });

  it('a let-in visitor too; close friends get deeper wants, strangers getting to know', () => {
    const g = household();
    const v = invite(g);
    const [a, b] = g.state.dwellers;
    // Strangers: getting to know, never a hug.
    a.wants = [];
    g.refreshWants(a.id);
    const pool = (s: Dweller) => {
      const seen = new Set<string>();
      for (let i = 0; i < 40; i++) {
        s.wants = [];
        (g as unknown as { guestArrived(t: Dweller): void }).guestArrived(v);
        for (const w of s.wants!) if (w.targetId === v.id) seen.add(w.defId);
      }
      return seen;
    };
    let k = 0;
    g.rng = () => (k++ % 10) / 10 + 0.05;
    const strangers = pool(a);
    expect(strangers.has('guestHug')).toBe(false);
    expect([...strangers].some((id) => id === 'guestGetToKnow' || id === 'guestChat')).toBe(true);
    const rel = g.relationship(b.id, v.id);
    rel.friend = 60;
    const friends = pool(b);
    expect(friends.has('guestGetToKnow')).toBe(false);
    expect(friends.has('guestDeepTalk') || friends.has('guestHug')).toBe(true);
  });

  it('free will: a want for a social with someone pulls towards it; a guest leans towards the household', () => {
    const g = household();
    const v = invite(g);
    const [a] = g.state.dwellers;
    a.wants = [{ defId: 'guestJoke', targetId: v.id, since: g.state.time }];
    expect(visitPull(a, v, 'joke')).toBe(WANT_SOCIAL_PULL);
    expect(visitPull(a, v, 'chat')).toBe(1);
    expect(visitPull(v, a, 'chat')).toBe(GUEST_HOST_PULL);
  });
});
