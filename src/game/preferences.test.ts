import { describe, expect, it } from 'vitest';
import { rankOptions } from './autonomy';
import { CATALOG } from './catalog';
import { randomPersonality } from './cas';
import { BUFFS } from './emotions';
import { Game } from './game';
import { ACTIVITIES, DISLIKE_MIN, DISLIKE_MULTIPLIER, DISLIKE_STRONG, LIKE_MULTIPLIER, MISS_AFTER, MISS_MAX, MISS_STRONG_AFTER, PEOPLE, PREFERENCES, TOPICS, dislikePull, dislikeTimes, missedPull, peopleKindsOf, randomPreferences, socialGainMul, socialPull } from './preferences';
import { SOCIAL_BY_ID } from './socials';
import { TRAIT_BY_ID, TRAIT_CEIL, TRAIT_FLOOR, traitDrive } from './traits';
import type { Dweller } from './types';

function solo(likes: string[], dislikes: string[]) {
  const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10', likes, dislikes }]);
  g.state.freeWill = false;
  g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
  return g;
}

const score = (g: Game, id: string) => rankOptions(g, g.state.dwellers[0]).find((c) => c.action.kind === 'interact' && c.action.interactionId === id)?.score ?? 0;
const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

describe('likes and dislikes', () => {
  it('pull free will hard towards liked activities and away from disliked ones', () => {
    const neutral = score(solo([], []), 'study');
    expect(score(solo(['programming'], []), 'study')).toBeCloseTo(neutral * LIKE_MULTIPLIER);
    expect(score(solo([], ['programming']), 'study')).toBeCloseTo(neutral * DISLIKE_MULTIPLIER);
    // 2026-10-26: felt, not overpowering (the user found dwellers doing what they disliked).
    expect(LIKE_MULTIPLIER).toBeGreaterThan(1.5);
    expect(DISLIKE_MULTIPLIER).toBeLessThan(0.4);
  });

  it('give moodlets when the activity starts, for an hour and a half', () => {
    const g = solo(['programming'], ['videoGaming']);
    const [a] = g.state.dwellers;
    const computer = g.state.objects.find((o) => o.defId === 'computer')!;
    g.enqueue(a.id, { kind: 'interact', objectUid: computer.uid, interactionId: 'study', autonomous: false });
    for (let t = 0; t < 15; t += 0.5) g.step(0.5);
    expect(a.buffs.some((b) => b.id === 'like_programming') && BUFFS['like_programming'].weight).toBe(1);
    a.queue = [];
    a.run = null;
    g.enqueue(a.id, { kind: 'interact', objectUid: computer.uid, interactionId: 'game', autonomous: false });
    for (let t = 0; t < 15; t += 0.5) g.step(0.5);
    expect(a.buffs.some((b) => b.id === 'dislike_videoGaming') && BUFFS['dislike_videoGaming'].weight).toBe(2);
  });

  it('the longer a like goes undone, the harder it pulls; the more a dislike is done, the harder it pushes away', () => {
    // 2026-10-26 (at the user's request): growing day by day, and with each time.
    expect(missedPull(0)).toBe(1);
    expect(missedPull(2 * 1440)).toBeGreaterThan(missedPull(1440));
    expect(missedPull(4 * 1440)).toBeGreaterThan(missedPull(2 * 1440));
    expect(missedPull(30 * 1440)).toBe(MISS_MAX);
    expect(dislikePull(1)).toBeLessThan(dislikePull(0));
    expect(dislikePull(3)).toBeLessThan(dislikePull(1));
    expect(dislikePull(50)).toBe(DISLIKE_MIN);
    // Forgotten slowly without it.
    expect(dislikeTimes({ n: 3, at: 0 }, 0)).toBe(3);
    expect(dislikeTimes({ n: 3, at: 0 }, 4 * 1440 + 1)).toBe(1);
    // In play: free will's score for a like grows over the days; a sadder moodlet after five.
    const g = solo(['programming'], []);
    const [a] = g.state.dwellers;
    g.step(0.5);
    g.state.time += 2 * 1440;
    g.step(0.5);
    const two = score(g, 'study');
    g.state.time += 2 * 1440;
    g.step(0.5);
    expect(score(g, 'study')).toBeGreaterThan(two * 1.2);
    g.state.time += MISS_STRONG_AFTER;
    g.step(0.5);
    expect(a.buffs.some((b) => b.id === 'missBad_programming')).toBe(true);
    expect(a.buffs.some((b) => b.id === 'miss_programming')).toBe(false);
    expect(BUFFS['missBad_programming'].weight).toBeGreaterThan(BUFFS['miss_programming'].weight);
  });

  it('a disliked activity done again and again: less pull each time and the stronger moodlet from the third', () => {
    const g = solo([], ['videoGaming']);
    const [a] = g.state.dwellers;
    const computer = g.state.objects.find((o) => o.defId === 'computer')!;
    const first = score(g, 'game');
    for (let i = 1; i <= DISLIKE_STRONG; i++) {
      a.queue = [];
      a.run = null;
      a.buffs = [];
      g.enqueue(a.id, { kind: 'interact', objectUid: computer.uid, interactionId: 'game', autonomous: false });
      for (let t = 0; t < 10; t += 0.5) g.step(0.5);
      expect(a.dislikedDone?.videoGaming?.n).toBe(i);
      expect(a.buffs.some((b) => b.id === (i >= DISLIKE_STRONG ? 'dislikeBad_videoGaming' : 'dislike_videoGaming'))).toBe(true);
    }
    a.queue = [];
    a.run = null;
    expect(score(g, 'game')).toBeLessThan(first * 0.6);
  });

  it('traits pull a little less than a like, however many point the same way', () => {
    // 2026-10-26: measured, two traits on one thing matched a like; now they stay under it.
    expect(traitDrive(['geek', 'competitive'], 'game')).toBeLessThanOrEqual(TRAIT_CEIL);
    expect(TRAIT_CEIL).toBeLessThan(LIKE_MULTIPLIER);
    expect(traitDrive(['materialistic'], 'admireStuff')).toBe(TRAIT_CEIL);
    expect(traitDrive(['slob'], 'clean')).toBeGreaterThanOrEqual(TRAIT_FLOOR);
    expect(TRAIT_FLOOR).toBeGreaterThan(DISLIKE_MULTIPLIER);
    expect(traitDrive(['geek'], 'game')).toBeGreaterThan(1);
    expect(traitDrive(['geek'], 'game')).toBeLessThan(1.5);
  });

  it('a liked activity not done for two days is missed, pulls harder, and the doing ends it', () => {
    const g = solo(['programming'], []);
    const [a] = g.state.dwellers;
    const base = score(g, 'study');
    g.step(0.5);
    g.state.time += MISS_AFTER;
    g.step(0.5);
    expect(a.buffs.some((b) => b.id === 'miss_programming')).toBe(true);
    expect(score(g, 'study')).toBeGreaterThan(base * 1.2);
    expect(a.buffs.some((b) => b.id === 'miss_programming') && BUFFS['miss_programming'].weight).toBe(1);
    const computer = g.state.objects.find((o) => o.defId === 'computer')!;
    g.enqueue(a.id, { kind: 'interact', objectUid: computer.uid, interactionId: 'study', autonomous: false });
    for (let t = 0; t < 15; t += 0.5) g.step(0.5);
    expect(a.buffs.some((b) => b.id === 'miss_programming')).toBe(false);
    expect(a.likedAt?.programming).toBeGreaterThan(g.state.time - 20);
  });

  it('a liked kind of person or topic makes friends faster; a disliked one slower — for either side', () => {
    const funny = { traits: ['goofball'] };
    const plain = { traits: ['neat'] };
    expect(socialGainMul({ likes: ['people_funny'] }, funny, 'chat')).toBeGreaterThan(1);
    expect(socialGainMul({ likes: ['people_funny'] }, plain, 'chat')).toBe(1);
    expect(socialGainMul({ likes: ['topic_jokes'] }, plain, 'joke')).toBeGreaterThan(1);
    // The one being joked with counts too.
    expect(socialGainMul(plain, { traits: [], dislikes: ['topic_jokes'] }, 'joke')).toBeLessThan(1);
    // Free will: towards a liked topic, away from a disliked kind of person.
    expect(socialPull({ likes: ['topic_deep'] }, plain, 'deepTalk')).toBe(LIKE_MULTIPLIER);
    expect(socialPull({ dislikes: ['people_rough'] }, { traits: ['mean'] }, 'chat')).toBe(DISLIKE_MULTIPLIER);
  });

  it('in play: a chat with a liked kind of person gives more friendship and a moodlet each side', () => {
    const run = (likes: string[]) => {
      const g = Game.create(
        [
          { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10', likes },
          { name: '서연', shirt: '#e53935', skin: '#f8d9c0', hair: '#2b1b10', traits: ['goofball'] },
        ],
        () => 0.5,
      );
      g.state.freeWill = false;
      g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
      const [a, b] = g.state.dwellers as [Dweller, Dweller];
      Object.assign(a, { x: 11, y: 11 });
      Object.assign(b, { x: 12, y: 11 });
      const before = g.relationship(a.id, b.id).friend;
      g.enqueue(a.id, { kind: 'social', targetId: b.id, socialId: 'chat', autonomous: false });
      for (let t = 0; t < 40; t += 0.5) g.step(0.5);
      return { gain: g.relationship(a.id, b.id).friend - before, a };
    };
    const plain = run([]);
    const fond = run(['people_funny']);
    expect(plain.gain).toBeGreaterThan(0);
    expect(fond.gain).toBeGreaterThan(plain.gain * 1.2);
    expect(fond.a.buffs.some((x) => x.id === 'like_people_funny')).toBe(true);
  });

  it('every activity, topic and kind of person is real: interactions, socials and traits that exist', () => {
    const inters = new Set(CATALOG.flatMap((d) => (d.interactions ?? []).map((i) => i.id)));
    inters.add('clean'); // the shared cleaning interaction (catalog CLEAN)
    for (const a of ACTIVITIES) for (const i of a.interactions) expect(inters.has(i), `${a.id}: ${i}`).toBe(true);
    for (const t of TOPICS) for (const s of t.socials) expect(SOCIAL_BY_ID[s], `${t.id}: ${s}`).toBeTruthy();
    for (const p of PEOPLE) for (const t of p.traits) expect(TRAIT_BY_ID[t], `${p.id}: ${t}`).toBeTruthy();
    // One id each, and many more than the first 17.
    expect(new Set(PREFERENCES.map((p) => p.id)).size).toBe(PREFERENCES.length);
    expect(ACTIVITIES.length).toBeGreaterThanOrEqual(35);
    expect(TOPICS.length).toBeGreaterThanOrEqual(8);
    expect(PEOPLE.length).toBeGreaterThanOrEqual(10);
    // An interaction is one activity's only; a social one topic's only.
    const used = ACTIVITIES.flatMap((a) => a.interactions);
    expect(new Set(used).size).toBe(used.length);
    const said = TOPICS.flatMap((t) => t.socials);
    expect(new Set(said).size).toBe(said.length);
    expect(peopleKindsOf(['goofball', 'neat']).map((p) => p.id)).toEqual(['people_funny', 'people_tidy']);
  });

  it('townies and the dice get a few of every kind, never liking and disliking the same', () => {
    const g = solo([], []);
    for (const t of g.state.townies!) {
      expect(t.likes!.length).toBeGreaterThanOrEqual(2);
      expect(t.dislikes!.length).toBeGreaterThanOrEqual(1);
      for (const l of t.likes!) expect(t.dislikes).not.toContain(l);
    }
    const rng = seeded(7);
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) {
      const p = randomPreferences(rng);
      for (const l of p.likes) expect(p.dislikes).not.toContain(l);
      for (const x of [...p.likes, ...p.dislikes]) seen.add(x.split('_')[0]);
      const r = randomPersonality(rng, ['findMyself']);
      expect(r.likes).toHaveLength(3);
      for (const l of r.likes) expect(r.dislikes).not.toContain(l);
    }
    // Activities, topics and kinds of people all come up.
    expect(seen.has('topic')).toBe(true);
    expect(seen.has('people')).toBe(true);
  });
});
