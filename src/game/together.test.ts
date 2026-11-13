import { describe, expect, it } from 'vitest';
import { rankOptions } from './autonomy';
import { Game } from './game';
import { dayStart, sleepDesire, wakeTime } from './sleep';

function seeded(seed = 42) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function household(n: number, rng = seeded()) {
  const g = Game.create(
    [
      { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
      { name: '서연', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' },
      { name: '지우', shirt: '#43a047', skin: '#c99a6e', hair: '#a0522d' },
    ].slice(0, n),
    rng,
  );
  g.state.freeWill = false;
  return g;
}

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

/** Monday (day 7) at the given hour. */
const at = (hour: number) => 7 * 1440 + hour * 60;
const ids = (g: Game, dweller: Game['state']['dwellers'][number]) => rankOptions(g, dweller).map((c) => (c.action.kind === 'interact' ? c.action.interactionId : c.action.kind));

describe('sleep schedule (참고 게임 sleep_schedule)', () => {
  it('grows sleepy by the hours left before the day starts', () => {
    const g = household(1);
    const dweller = g.state.dwellers[0];
    expect(dayStart(dweller, at(13)).at).toBe(at(32)); // no job: 8:00 tomorrow
    expect(sleepDesire(dweller, at(19))).toBe(0);
    expect(sleepDesire(dweller, at(20.5))).toBe(1); // allowed from 12 hours before
    expect(sleepDesire(dweller, at(22.5))).toBe(2); // small from 10
    expect(sleepDesire(dweller, at(26))).toBe(3); // large from 8 until 3 before
    expect(sleepDesire(dweller, at(29.5))).toBe(0);
  });

  it('puts children to bed from about 9 and toddlers from about 8 (ours: 참고 게임 has no child schedule)', () => {
    const g = household(2);
    const [kid, tot] = g.state.dwellers;
    kid.age = 'child';
    tot.age = 'toddler';
    expect(sleepDesire(kid, at(18.5))).toBe(0);
    expect(sleepDesire(kid, at(19.5))).toBe(1);
    expect(sleepDesire(kid, at(20.5))).toBe(2);
    expect(sleepDesire(kid, at(21.5))).toBe(3);
    expect(sleepDesire(tot, at(20.25))).toBe(3); // wakes at 7, large desire from 8 in the evening
  });

  it('follows the shift: a worker wakes ahead of it, and late shifts sleep late', () => {
    const g = household(1);
    const dweller = g.state.dwellers[0];
    g.acceptJob(dweller.id, 'tech');
    // The first rung works Tuesday to Saturday from 10:00 (참고 게임 work_schedule).
    expect(dayStart(dweller, at(25))).toEqual({ at: at(34), work: true });
    expect(wakeTime(dweller, at(25))).toBe(at(34) - 90);
    // Sunday night: Monday is a day off, so the default hour.
    expect(dayStart(dweller, 13 * 1440 + 22 * 60).work).toBe(false);
    // A night shift makes the morning the time to sleep.
    dweller.job = { careerId: 'dancer', level: 0, performance: 50, lastWorkDay: 0 }; // dance trainee: weekdays from 14:00
    expect(sleepDesire(dweller, at(7))).toBe(3);
    expect(sleepDesire(dweller, at(12))).toBe(0);
  });

  it('only lets free will go to bed for the night at bedtime, or when exhausted', () => {
    const g = household(1);
    const dweller = g.state.dwellers[0];
    dweller.needs.energy = 30;
    g.state.time = at(14);
    expect(ids(g, dweller)).not.toContain('sleep');
    g.state.time = at(23);
    expect(ids(g, dweller)).toContain('sleep');
    g.state.time = at(14);
    dweller.needs.energy = 8;
    expect(ids(g, dweller)).toContain('sleep');
  });

  it('sleeps on through the small hours and gets up in the morning', () => {
    const g = household(1);
    const dweller = g.state.dwellers[0];
    g.state.time = at(22);
    dweller.needs.energy = 40;
    dweller.needs.bladder = 100;
    dweller.needs.hunger = 100;
    const bed = g.state.objects.find((o) => g.isBed(o))!;
    g.enqueue(dweller.id, { kind: 'interact', objectUid: bed.uid, interactionId: 'sleep', autonomous: false });
    run(g, 60 * 7); // 5:00: energy long full, still asleep
    expect(dweller.needs.energy).toBeGreaterThanOrEqual(99);
    expect(g.performing(dweller)?.inter.id).toBe('sleep');
    run(g, 60 * 3); // up by 8:00 after the lie-in
    expect(g.performing(dweller)?.inter.id).not.toBe('sleep');
  });

  it('goes to the toilet before turning in, so the night stays unbroken', () => {
    const g = household(1);
    g.state.freeWill = true;
    g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
    const dweller = g.state.dwellers[0];
    g.state.time = at(23.5);
    Object.assign(dweller.needs, { energy: 25, bladder: 50, hunger: 90, hygiene: 90, fun: 90, social: 90 });
    run(g, 60);
    expect(dweller.needs.bladder).toBeGreaterThan(90);
    expect(g.performing(dweller)?.inter.id).toBe('sleep');
  });

  it('wakes for the toilet', () => {
    const g = household(1);
    const dweller = g.state.dwellers[0];
    g.state.time = at(23);
    dweller.needs.energy = 20;
    dweller.needs.bladder = 26;
    const bed = g.state.objects.find((o) => g.isBed(o))!;
    g.enqueue(dweller.id, { kind: 'interact', objectUid: bed.uid, interactionId: 'sleep', autonomous: false });
    run(g, 60);
    expect(g.performing(dweller)?.inter.id).not.toBe('sleep');
  });
});

describe('seeing a job through (참고 게임 guaranteed interactions)', () => {
  it('finishes cooking while tired instead of dropping it for a nap and back', () => {
    for (let seed = 1; seed <= 6; seed++) {
      const g = household(1, seeded(seed));
      g.state.freeWill = true;
      g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
      g.state.time = at(15);
      const dweller = g.state.dwellers[0];
      dweller.needs.hunger = 20;
      dweller.needs.energy = 20;
      const stove = g.state.objects.find((o) => o.defId === 'stove')!;
      g.enqueue(dweller.id, { kind: 'interact', objectUid: stove.uid, interactionId: 'cook', autonomous: true });
      const seen: string[] = [];
      for (let t = 0; t < 240; t += 0.5) {
        g.step(0.5);
        const q = dweller.queue[0];
        const id = q?.kind === 'interact' ? q.interactionId : '';
        if (id && id !== seen[seen.length - 1]) seen.push(id);
      }
      // Cooked once and ate, whatever else happened (a kitchen fire aside).
      if (!seen.includes('extinguish')) expect(seen.filter((id) => id.startsWith('cook')).length).toBe(1);
      expect(dweller.needs.hunger).toBeGreaterThan(40);
    }
  });

  it('still lets go when another need is about to fail', () => {
    const g = household(1);
    g.state.freeWill = true;
    g.state.time = at(15);
    const dweller = g.state.dwellers[0];
    dweller.needs.hunger = 30;
    dweller.needs.bladder = 7;
    const stove = g.state.objects.find((o) => o.defId === 'stove')!;
    g.enqueue(dweller.id, { kind: 'interact', objectUid: stove.uid, interactionId: 'cook', autonomous: true });
    run(g, 25);
    expect(dweller.needs.bladder).toBeGreaterThan(50);
  });
});

describe('doing things together (soft nudges, never orders)', () => {
  it('prefers the meal already served to cooking another', () => {
    const g = household(1);
    const dweller = g.state.dwellers[0];
    dweller.needs.hunger = 30;
    const score = (id: string) => rankOptions(g, dweller).find((c) => c.action.kind === 'interact' && c.action.interactionId === id)?.score ?? 0;
    const cookBefore = score('cook');
    g.state.food = [{ servings: 3, madeAt: g.state.time, cookId: dweller.id, quality: 0.5 }];
    expect(score('cook')).toBeLessThan(cookBefore * 0.5);
    expect(score('eat')).toBeGreaterThan(score('cook'));
  });

  it('likes the seat next to someone already eating', () => {
    const g = household(2);
    const [a, b] = g.state.dwellers;
    g.state.food = [{ servings: 3, madeAt: g.state.time, cookId: a.id, quality: 0.5 }];
    a.needs.hunger = b.needs.hunger = 30;
    const chairs = g.state.objects.filter((o) => o.defId === 'diningChair');
    g.enqueue(a.id, { kind: 'interact', objectUid: chairs[0].uid, interactionId: 'eat', autonomous: false });
    run(g, 15);
    expect(g.performing(a)?.inter.id).toBe('eat');
    const seat = (uid: number) => rankOptions(g, b).find((c) => c.action.kind === 'interact' && c.action.objectUid === uid && c.action.interactionId === 'eat')?.score ?? 0;
    const near = chairs.slice(1).filter((c) => g.othersDoing(b, c, 'eat') > 0);
    const far = chairs.slice(1).filter((c) => g.othersDoing(b, c, 'eat') === 0);
    expect(near.length).toBeGreaterThan(0);
    if (far.length) expect(Math.max(...near.map((c) => seat(c.uid)))).toBeGreaterThan(Math.max(...far.map((c) => seat(c.uid))));
  });

  it('on their own, sometimes asks the family to watch TV together, and each decides for themself', () => {
    let rallies = 0;
    let joined = 0;
    for (let seed = 1; seed <= 16; seed++) {
      const g = household(3, seeded(seed * 7919 + 13));
      g.state.time = at(18);
      const [a, b, c] = g.state.dwellers;
      for (const s of [b, c]) {
        s.x = a.x;
        s.y = a.y;
      }
      c.needs.bladder = 15; // too pressed to sit down for TV
      const sofa = g.state.objects.find((o) => o.defId === 'sofa')!;
      g.enqueue(a.id, { kind: 'interact', objectUid: sofa.uid, interactionId: 'watchTv', autonomous: true });
      run(g, 20);
      const text = g.toasts.map((t) => t.text).join('\n');
      if (!text.includes('같이 TV 보자')) continue;
      rallies++;
      expect(text).toMatch(/지우[^\n]*사양/); // the one in need says no
      if (b.queue.some((q) => q.kind === 'interact' && ['watch', 'watchTv'].includes(q.interactionId))) joined++;
    }
    expect(rallies).toBeGreaterThan(0);
    expect(rallies).toBeLessThan(16); // only now and then
    expect(joined).toBeGreaterThan(0);
  });
});

describe('asking someone to join in (참고 게임 rallyables, by the player)', () => {
  function watching(rng = seeded()) {
    const g = household(2, rng);
    g.state.time = at(18);
    g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
    const [a, b] = g.state.dwellers;
    b.x = a.x;
    b.y = a.y;
    const sofa = g.state.objects.find((o) => o.defId === 'sofa')!;
    g.enqueue(a.id, { kind: 'interact', objectUid: sofa.uid, interactionId: 'watchTv', autonomous: false });
    run(g, 15);
    return { g, a, b };
  }

  it('offers it in the social menu only while doing something that can be shared', () => {
    const g = household(2);
    const [a, b] = g.state.dwellers;
    expect(g.socialMenu(a, b).some((o) => o.id === '__join')).toBe(false);
    const w = watching();
    const opt = w.g.socialMenu(w.a, w.b).find((o) => o.id === '__join');
    expect(opt?.label).toContain('TV');
    expect(opt?.disabled).toBeUndefined();
  });

  it('brings a willing friend along', () => {
    const { g, a, b } = watching(() => 0.05);
    g.relationship(a.id, b.id).friend = 60;
    expect(g.askToJoin(a.id, b.id)).toBe(true);
    const q = b.queue[0];
    expect(q?.kind === 'interact' && ['watch', 'watchTv'].includes(q.interactionId)).toBe(true);
    run(g, 20);
    expect(['watch', 'watchTv']).toContain(g.performing(b)?.inter.id);
  });

  it("lets the invited dweller say no: a pressing need, the player's own orders, or just not in the mood", () => {
    let w = watching(() => 0.05);
    w.b.needs.bladder = 15;
    expect(w.g.askToJoin(w.a.id, w.b.id)).toBe(false);
    expect(w.g.toasts.some((t) => t.text.includes('거절') && t.text.includes('화장실'))).toBe(true);

    w = watching(() => 0.05);
    const stove = w.g.state.objects.find((o) => o.defId === 'stove')!;
    w.g.enqueue(w.b.id, { kind: 'interact', objectUid: stove.uid, interactionId: 'cook', autonomous: false });
    expect(w.g.askToJoin(w.a.id, w.b.id)).toBe(false);
    expect(w.b.queue[0]?.kind === 'interact' && w.b.queue[0].interactionId).toBe('cook');

    w = watching(() => 0.99);
    expect(w.g.askToJoin(w.a.id, w.b.id)).toBe(false);
    expect(w.g.toasts.some((t) => t.text.includes('내키지 않는대요'))).toBe(true);
  });
});
