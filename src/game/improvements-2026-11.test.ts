import { describe, expect, it } from 'vitest';
import { CAREER_BY_ID } from './careers';
import { eventsFor } from './careerEvents';
import { Game } from './game';
import { VENUE_BY_ID } from './venues';
import { MOOD_EFFECTS, moodEffectLines, moodReason } from './moodEffects';
import { contextScore } from './relationships';
import { workSuccess } from './workTrouble';
import type { EmotionKey } from './types';
import { objectAt } from './world';
import { BUFFS, EMOTIONS } from './emotions';
import { EARN_MINUTES, LOT_TRAITS } from './lotTraits';
import { roomAt } from './gfx/house';
import { likingScore, romanceAcceptance } from './romanceAcceptance';
import { SOCIAL_BY_ID, socialBlocker } from './socials';
import { NEIGHBOR_HOUSES, giveEveryoneTraits, housesOf, settleNeighbourhood, welcomeNewcomer } from './neighbourhood';
import { STARS, starTownie } from './stars';
import { BUYABLE, OBJECT_BUY } from './buyCategories';
import { CATALOG } from './catalog';
import { CLEANING_IDS, HOME_PIECES, RUGS } from './homeFurniture';
import { ACTIVITIES, MAX_LIKES, PREFERENCES, activityOf, randomPreferences } from './preferences';
import { TRAITS } from './traits';
import type { DwellerSpec } from './types';

const spec = (name: string, gender: 'female' | 'male'): DwellerSpec => ({ name, gender, shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' });
const game = (...people: DwellerSpec[]) => {
  const g = Game.create(people, () => 0.5);
  g.state.freeWill = false;
  g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
  return g;
};
const run = (g: Game, minutes: number) => {
  for (let t = 0; t < minutes; t += 0.5) g.step(0.5);
};
const hurt = (g: Game, id: number) => (g as unknown as { injure(s: unknown, k: string): void }).injure(g.dweller(id), 'shock');

describe('hurt badly (2026-11-01)', () => {
  it('stays until a hospital or pharmacy sees to it, and stops work and heavy doing meanwhile', () => {
    const g = game(spec('민준', 'male'));
    const dweller = g.state.dwellers[0];
    g.state.money = 1000;
    g.acceptJob(dweller.id, 'tech');
    dweller.job!.follow = false;
    hurt(g, dweller.id);
    expect(dweller.injury?.kind).toBe('shock');
    expect(dweller.buffs.some((b) => b.id === 'injured')).toBe(true);
    // No other outing; no working.
    expect(g.outingBlocker(dweller, 'park')).toContain('병원');
    expect(g.outingBlocker(dweller, 'hospital')).toBeNull();
    expect(g.injuryBlocker(dweller, { id: 'x', label: '', icon: '', duration: 1, effects: {}, special: 'repair' } as never)).toBeTruthy();
    const days = run;
    days(g, 1440);
    expect(dweller.away?.slot).toBeUndefined();
    expect(dweller.job).toBeTruthy();
    // Seen to, and gone.
    g.goOut(dweller.id, 'hospital');
    expect(dweller.away?.outing).toBe('hospital');
    expect(g.state.money).toBe(1000 - VENUE_BY_ID.hospital.cost!);
    run(g, 200);
    expect(dweller.injury).toBeUndefined();
    expect(dweller.buffs.some((b) => b.id === 'injured')).toBe(false);
  });

  it('nobody stays hurt for want of money', () => {
    const g = game(spec('민준', 'male'));
    const dweller = g.state.dwellers[0];
    g.state.money = 3;
    hurt(g, dweller.id);
    expect(g.outingBlocker(dweller, 'hospital')).toBeNull();
    g.goOut(dweller.id, 'hospital');
    expect(g.state.money).toBe(0);
  });

  it('a hospital is for the hurt and the sick', () => {
    const g = game(spec('민준', 'male'));
    expect(g.outingBlocker(g.state.dwellers[0], 'hospital')).toBe('아픈 데가 없어요');
  });
});

describe('romance (2026-11-01)', () => {
  it('is between a woman and a man; friends of one gender can still live together', () => {
    const g = game(spec('하린', 'female'), spec('지민', 'female'), spec('시우', 'male'));
    const [a, b, c] = g.state.dwellers;
    expect(g.romanceBlocked(a, b)).toBe('동성과는 로맨스를 할 수 없어요');
    expect(g.tiesBlocked(a, b)).toBeNull();
    expect(g.romanceBlocked(a, c)).toBeNull();
    g.relationship(a.id, b.id).romance = 50;
    g.relationship(a.id, b.id).friend = 50;
    expect(g.socialMenu(a, b).some((o) => ['flirt', 'kiss', 'askPartner'].includes(o.id))).toBe(false);
    g.relationship(a.id, c.id).romance = 50;
    expect(g.socialMenu(a, c).some((o) => o.id === 'flirt')).toBe(true);
  });
});

describe('moving in and out (2026-11-01)', () => {
  it('a neighbour moving in keeps their job; a family member can go to live apart, and come back', () => {
    const g = game(spec('하린', 'female'), spec('시우', 'male'));
    const a = g.state.dwellers[0];
    const t = g.state.townies!.find((x) => !x.age && x.job && !CAREER_BY_ID[x.job.careerId].school && !x.married && x.partnerId === undefined)!;
    const job = { ...t.job! };
    const guest = (g as unknown as { spawnTownie(r: string, w: unknown): { id: number; npc?: unknown } }).spawnTownie('doorbell', t)!;
    (g as unknown as { moveIn(s: unknown): void }).moveIn(guest);
    const moved = g.dweller(guest.id)!;
    expect(moved.npc).toBeUndefined();
    const held = moved.job ?? moved.partTime;
    expect(held?.careerId).toBe(job.careerId);
    expect(held?.level).toBe(job.level);
    expect(g.state.townies!.some((x) => x.id === moved.id)).toBe(false);

    // Off again: back on the street, as they were, friends still.
    g.relationship(a.id, moved.id).friend = 40;
    expect(g.moveOutBlocker(moved)).toBeNull();
    g.moveOut(moved.id);
    expect(g.dweller(moved.id)).toBeUndefined();
    const back = g.state.townies!.find((x) => x.id === moved.id)!;
    expect(back.job?.careerId).toBe(job.careerId);
    expect(back.home).toBeTruthy();
    expect(g.relationship(a.id, moved.id).friend).toBe(40);
  });

  it('moving out doesn’t wait on an empty house: one is built, and listed with the others', () => {
    const g = game(spec('하린', 'female'), spec('시우', 'male'), spec('지민', 'female'));
    const townies = g.state.townies!;
    NEIGHBOR_HOUSES.forEach((h, i) => {
      if (!townies.some((t) => t.home === h.id)) townies.push({ id: 8000 + i, name: `이웃${i}`, shirt: '#111111', skin: '#eeeeee', hair: '#000000', home: h.id });
    });
    const [, b, c] = g.state.dwellers;
    expect(g.moveOutBlocker(b)).toBeNull();
    g.moveOut(b.id);
    g.moveOut(c.id);
    const homes = [b.id, c.id].map((id) => g.state.townies!.find((t) => t.id === id)!.home!);
    expect(homes).toEqual(['extra1', 'extra2']);
    expect(housesOf(g.state.townies!).map((h) => h.id)).toEqual(expect.arrayContaining(homes));
  });

  it('nobody leaves a child or the house empty', () => {
    const g = game(spec('하린', 'female'));
    expect(g.moveOutBlocker(g.state.dwellers[0])).toBe('집에 남을 어른이 없어요');
  });
});

describe('changing a character in play (2026-11-01)', () => {
  it('changes what can be picked, keeps what was earned, and five likes and dislikes at most', () => {
    const g = game(spec('민준', 'male'));
    const dweller = g.state.dwellers[0];
    const earned = TRAITS.find((t) => t.reward)!.id;
    dweller.traits = ['creative', earned];
    g.editMind(dweller.id, { traits: ['bookworm'], likes: ['cooking', 'fitness', 'painting', 'guitar', 'piano', 'violin'], dislikes: ['reading'] });
    expect(dweller.traits).toEqual(['bookworm', earned]);
    expect(dweller.likes).toHaveLength(MAX_LIKES);
    expect(dweller.dislikes).toEqual(['reading']);
  });
});

describe('more for the house (2026-11-01)', () => {
  const home = CATALOG.filter((d) => d.id.startsWith('home_'));
  it('work pieces sold for the house: no work rule on them, in the catalog, and each counts as something liked', () => {
    expect(home.length).toBe(HOME_PIECES.length);
    for (const d of home) {
      expect(d.unlisted, d.id).toBe(false);
      expect(d.price, d.id).toBeGreaterThan(0);
      expect(d.interactions.length, d.id).toBeGreaterThan(0);
      for (const i of d.interactions.filter((x) => x.id !== 'admireStuff')) {
        expect(i.requires, `${d.id} ${i.id}`).toBeUndefined();
        expect(activityOf(i.id), `${d.id} ${i.id}`).toBeTruthy();
      }
      expect(OBJECT_BUY[d.id], d.id).toBeTruthy();
      expect(BUYABLE.includes(d)).toBe(true);
    }
  });

  it('the cleaning tools are for sale, and clean the house', () => {
    for (const id of CLEANING_IDS) expect(BUYABLE.some((d) => d.id === id), id).toBe(true);
    const g = game(spec('민준', 'male'));
    const dweller = g.state.dwellers[0];
    g.state.money = 5000;
    const toilet = g.state.objects.find((o) => o.defId === 'toilet')!;
    toilet.dirt = -60;
    g.state.puddles = [{ x: dweller.x, y: dweller.y, since: g.state.time }];
    const free = (() => {
      for (let y = 2; y < 14; y++) for (let x = 2; x < 24; x++) if (g.canPlace('broomSet', x, y, 'down')) return { x, y };
      throw new Error('no room');
    })();
    g.state.objects.push({ uid: g.state.nextUid++, defId: 'broomSet', x: free.x, y: free.y, dir: 'down' });
    (g as unknown as { invalidate(): void }).invalidate();
    const broom = g.state.objects.find((o) => o.defId === 'broomSet')!;
    g.enqueue(dweller.id, { kind: 'interact', objectUid: broom.uid, interactionId: 'sweepFloor', autonomous: false });
    run(g, 60);
    expect(toilet.dirt).toBeGreaterThan(-60);
    expect(g.state.puddles).toEqual([]);
  });
});

describe('a bathroom in use (2026-11-01)', () => {
  it('keeps others out until it is free', () => {
    const g = game(spec('하린', 'female'), spec('시우', 'male'));
    const [a, b] = g.state.dwellers;
    const toilet = g.state.objects.find((o) => o.defId === 'toilet')!;
    a.needs.bladder = 5;
    g.enqueue(a.id, { kind: 'interact', objectUid: toilet.uid, interactionId: 'use', autonomous: false });
    for (let m = 0; m < 240 && !g.performing(a); m++) g.step(0.5);
    expect(g.performing(a)?.inter.id).toBe('use');
    // Standing outside the room, the other can't use anything in it, and waits at the door if already going.
    const sink = g.state.objects.find((o) => o.defId === 'sink')!;
    const room = roomAt(toilet.x, toilet.y);
    expect(room).not.toBe('outside');
    expect(roomAt(sink.x, sink.y)).toBe(room);
    const out = g.state.objects.find((o) => o.defId === 'fridge')!;
    b.x = out.x;
    b.y = out.y + 1;
    expect(g.bathroomBlocker(b, sink)).toBe('누가 욕실을 쓰고 있어요');
    expect(g.bathroomBlocker(a, sink)).toBeNull();
    g.enqueue(b.id, { kind: 'interact', objectUid: sink.uid, interactionId: 'wash', autonomous: false });
    const queued = b.queue.length;
    for (let m = 0; m < 16 && g.performing(a); m++) {
      g.step(0.5);
      if (queued && g.performing(a)) expect(roomAt(Math.round(b.x), Math.round(b.y))).not.toBe(room);
    }
    // Free again.
    a.needs.bladder = 100;
    a.queue = [];
    a.run = null;
    expect(g.bathroomBlocker(b, sink)).toBeNull();
  });
});

describe('stars come by (2026-11-01)', () => {
  const star = (g: Game, visiting: boolean) => (g as unknown as { starAtLeisure(v: boolean): { name: string; star?: string } | undefined }).starAtLeisure(visiting);

  it('anyone may see them go by when they are off work; they call only on a friend', () => {
    const g = game(spec('민준', 'male'));
    // A Sunday noon: off shift by their jobs' hours.
    let day = Math.floor(g.state.time / 1440);
    while (day % 7 !== 6) day++;
    g.state.time = day * 1440 + 12 * 60;
    expect(star(g, false)?.star).toBeTruthy();
    expect(star(g, true)).toBeUndefined();
  });
});

describe('the 관계 tab (2026-11-01)', () => {
  it('lists the colleagues of the dweller picked, not those of the rest of the household', () => {
    const g = game(spec('하린', 'female'), spec('시우', 'male'));
    const [a, b] = g.state.dwellers;
    g.acceptJob(a.id, 'doctor');
    g.acceptJob(b.id, 'tech');
    const mate = (id: number, careerId: string, extra: object = {}) => ({ id, name: `동료${id}`, shirt: '#111111', skin: '#eeeeee', hair: '#000000', home: `work:${careerId}`, workmate: { careerId, slot: id }, ...extra });
    g.state.townies!.push(mate(7001, 'doctor'), mate(7002, 'tech'), mate(7003, 'doctor', { star: 'ian' }), mate(7004, 'tech', { episodeOf: b.id }));
    g.state.starOwners = { ian: b.id };
    const ids = (s: typeof a) => g.colleaguesOf(s).map((t) => t.id).filter((id) => id >= 7000 && id < 7100);
    expect(ids(a)).toEqual([7001]);
    expect(ids(b)).toEqual([7002, 7003, 7004]);
    // Someone from another's work they've come to know stays; looking creates no relationship.
    g.relationship(a.id, 7002).friend = 20;
    expect(ids(a)).toEqual([7001, 7002]);
    expect(g.state.relationships[`${Math.min(a.id, 7004)}-${Math.max(a.id, 7004)}`]).toBeUndefined();
  });
});

describe('saying yes or no to romance (2026-11-01)', () => {
  const rel = (friend: number, romance: number) => ({ friend, romance, lastChange: 0, flags: [], stage: 'friend', mood: { friendly: 0, fun: 0, romance: 0, awkward: 0 }, recent: null }) as never;
  const me = { id: 1, emotion: 'fine', charisma: 0, traits: [] as string[], likes: [] as string[], dislikes: [] as string[] } as never;
  const you = (o: object = {}) => ({ id: 2, emotion: 'fine', traits: [], likes: [], dislikes: [], ...o }) as never;
  const yes = (id: string, r: never, a: never = me, t: never = you(), date = false) => romanceAcceptance(id, r, a, t, date).chance;

  it('gets harder by the step, likelier the closer they are, and never certain', () => {
    expect(yes('askPartner', rel(30, 40))).toBeCloseTo(0.52);
    expect(yes('flirt', rel(0, 0))).toBeCloseTo(0.75);
    expect(yes('propose', rel(30, 60))).toBeLessThan(yes('askPartner', rel(30, 40)));
    expect(yes('askPartner', rel(70, 90))).toBeGreaterThan(yes('askPartner', rel(30, 40)));
    expect(yes('askPartner', rel(100, 100), me, you({ emotion: 'flirty', traits: ['romantic'], likes: ['topic_romance'] }))).toBe(0.95);
    expect(yes('askPartner', rel(30, 40), me, you({ emotion: 'angry', traits: ['commitmentIssues'], dislikes: ['topic_romance'] }))).toBe(0.05);
  });

  it('turns on their likes: the people they like, what they think of romance, what the two share (25 at most)', () => {
    const kind = { ...(me as object), traits: ['empathetic'] } as never;
    const base = yes('askPartner', rel(30, 40), kind);
    expect(yes('askPartner', rel(30, 40), kind, you({ likes: ['people_kind'] }))).toBeCloseTo(base + 0.12);
    expect(yes('askPartner', rel(30, 40), kind, you({ dislikes: ['people_kind'] }))).toBeCloseTo(base - 0.15);
    expect(romanceAcceptance('askPartner', rel(30, 40), kind, you({ dislikes: ['people_kind'] }), false).against).toContain('다정한 사람');
    const cook = { ...(me as object), likes: ['cooking'] } as never;
    expect(yes('askPartner', rel(30, 40), cook, you({ likes: ['cooking'] }))).toBeCloseTo(0.55);
    expect(yes('askPartner', rel(30, 40), cook, you({ dislikes: ['cooking'] }))).toBeCloseTo(0.48);
    expect(likingScore({ traits: ['empathetic', 'genius', 'active'] }, { likes: ['people_kind', 'people_smart', 'people_lively', 'topic_romance'] }).score).toBe(25);
  });

  it('a refusal says so, keeps them apart a while, and leaves things as they were', () => {
    const g = game(spec('하린', 'female'), spec('시우', 'male'));
    const [a, b] = g.state.dwellers;
    const r = g.relationship(a.id, b.id);
    Object.assign(r, { friend: 40, romance: 45, since: { met: -99999 } });
    g.rng = () => 0.99;
    expect(g.socialOutcome(a, b, SOCIAL_BY_ID.askPartner, r)).toBe('fail');
    (g as unknown as { applySocialOutcome(a: unknown, b: unknown, s: unknown, o: string): void }).applySocialOutcome(a, b, SOCIAL_BY_ID.askPartner, 'fail');
    expect(r.flags).not.toContain('partner');
    expect(socialBlocker(SOCIAL_BY_ID.askPartner, r, a, g.state.time)).toContain('거절당한');
    r.romance = 45; // (The refusal cost some.)
    expect(socialBlocker(SOCIAL_BY_ID.askPartner, r, a, g.state.time + 2 * 1440 + 1)).toBeNull();
    // A yes stands, whatever the conversation's score.
    g.rng = () => 0.01;
    r.recent = null;
    b.emotion = 'angry';
    r.romance = 100;
    r.friend = 100;
    expect(g.socialOutcome(a, b, SOCIAL_BY_ID.askPartner, r)).not.toBe('fail');
  });
});

describe('likes of those not picked by the player (2026-11-01)', () => {
  // Seeded: compared as shares of random draws, these failed now and then by chance alone.
  const seeded = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const many = (who: Parameters<typeof randomPreferences>[1], n = 400, rng = seeded(n + JSON.stringify(who).length * 7919)) => Array.from({ length: n }, () => randomPreferences(rng, who));
  const share = (ps: ReturnType<typeof many>, f: (p: ReturnType<typeof many>[number]) => boolean) => ps.filter(f).length / ps.length;

  it('always have some of each sort, nothing both liked and disliked, within the limits', () => {
    const ids = new Set(PREFERENCES.map((p) => p.id));
    for (const p of many({ traits: ['romantic', 'bookworm'] })) {
      expect(p.likes.length).toBe(4);
      expect(p.dislikes.length).toBeGreaterThanOrEqual(2);
      expect(p.dislikes.length).toBeLessThanOrEqual(MAX_LIKES);
      expect(new Set(p.likes).size).toBe(4);
      for (const d of p.dislikes) expect(p.likes).not.toContain(d);
      for (const id of [...p.likes, ...p.dislikes]) expect(ids.has(id), id).toBe(true);
      expect(p.likes.some((l) => l.startsWith('people_'))).toBe(true);
      expect(p.likes.some((l) => l.startsWith('topic_'))).toBe(true);
      expect(p.dislikes.some((l) => l.startsWith('people_'))).toBe(true);
    }
  });

  it('go with who they are, with room for surprise', () => {
    const reading = (p: { likes: string[] }) => p.likes.includes('reading');
    expect(share(many({ traits: ['bookworm'] }), reading)).toBeGreaterThan(share(many({}), reading) * 2);
    expect(share(many({ traits: ['bookworm'] }), (p) => p.dislikes.includes('reading'))).toBeLessThan(0.02);
    expect(share(many({ skill: 'fitness' }), (p) => p.likes.includes('fitness'))).toBeGreaterThan(share(many({}), (p) => p.likes.includes('fitness')));
    expect(share(many({ traits: ['romantic'] }), (p) => p.likes.includes('topic_romance'))).toBe(1);
    expect(share(many({ traits: ['commitmentIssues'] }), (p) => p.dislikes.includes('topic_romance'))).toBe(1);
    expect(share(many({ age: 'child' }), (p) => p.likes.includes('topic_romance') || p.dislikes.includes('topic_romance'))).toBe(0);
    // Most like the kind of person they are; never dislike it.
    const kind = many({ traits: ['empathetic'] });
    expect(share(kind, (p) => p.likes.includes('people_kind'))).toBeGreaterThan(0.5);
    expect(share(kind, (p) => p.dislikes.includes('people_kind'))).toBe(0);
    const att = many({});
    expect(share(att, (p) => p.likes.includes('topic_romance') || p.dislikes.includes('topic_romance'))).toBeGreaterThan(0.15);
  });

  it('name only real activities', () => {
    const ids = new Set(ACTIVITIES.map((a) => a.id));
    for (const p of many({ traits: TRAITS.map((t) => t.id).slice(0, 5), skill: 'charisma', age: 'elder' }, 50)) for (const l of p.likes) expect(ids.has(l) || l.includes('_')).toBe(true);
  });
});

describe('nobody without traits; the stars\u2019 own likes (2026-11-01)', () => {
  it('a newcomer has traits and likes that go with them; a baby gets them on growing up, an older save on loading', () => {
    const townies = settleNeighbourhood(undefined, Math.random, 900, 0, 'normal', new Set());
    for (const t of townies) if (t.age !== 'baby') expect(t.traits?.length, t.name).toBeGreaterThan(0);
    for (const h of NEIGHBOR_HOUSES) if (!townies.some((t) => t.home === h.id)) {
      let id = 7000;
      const ev = welcomeNewcomer(townies, 0, 'normal', Math.random, () => id++);
      const t = townies.find((x) => x.id === ev?.townieId)!;
      expect(t.traits?.length).toBeGreaterThan(0);
      expect(t.likes?.length).toBe(4);
      break;
    }
    const baby = { id: 7100, name: '아기', age: 'baby', shirt: '#111111', skin: '#eeeeee', hair: '#000000', traits: [] } as never as (typeof townies)[number];
    const old = { id: 7101, name: '옛이웃', shirt: '#111111', skin: '#eeeeee', hair: '#000000', traits: [] } as never as (typeof townies)[number];
    giveEveryoneTraits([baby, old], Math.random);
    expect(baby.traits).toEqual([]);
    expect(old.traits!.length).toBeGreaterThan(0);
    expect(old.likes!.length).toBe(4);
    delete (baby as { age?: string }).age;
    (baby as { age?: string }).age = 'child';
    giveEveryoneTraits([baby], Math.random);
    expect(baby.traits!.length).toBeGreaterThan(0);
  });

  it('each star has likes and dislikes of their own, real ones, within the limits, and acts on them', () => {
    const ids = new Set(PREFERENCES.map((p) => p.id));
    for (const star of STARS) {
      expect(star.likes.length).toBeLessThanOrEqual(MAX_LIKES);
      expect(star.dislikes.length).toBeLessThanOrEqual(MAX_LIKES);
      for (const id of [...star.likes, ...star.dislikes]) expect(ids.has(id), `${star.id} ${id}`).toBe(true);
      for (const id of star.dislikes) expect(star.likes).not.toContain(id);
      const t = starTownie(star, star.careers[0], 0);
      expect(t.likes).toEqual(star.likes);
      expect(t.dislikes).toEqual(star.dislikes);
    }
  });
});

describe('rugs (2026-11-01)', () => {
  it('are bought, walked over, and furniture stands on them; not one on another', () => {
    const g = game(spec('민준', 'male'));
    g.state.money = 9999;
    const free = () => {
      for (let y = 9; y < 14; y++) for (let x = 2; x < 22; x++) if (g.canPlace('rugWoolNavy', x, y, 'down') && g.canPlace('bed', x, y, 'down')) return { x, y };
      throw new Error('no room');
    };
    const at = free();
    const before = g.state.money;
    expect(g.buy('rugWoolNavy', at.x, at.y, 'down')).toBe(true);
    expect(g.state.money).toBeLessThan(before);
    const rug = g.state.objects.find((o) => o.defId === 'rugWoolNavy')!;
    expect(g.canPlace('rugBathAqua', at.x, at.y, 'down')).toBe(false);
    expect(g.canPlace('armchair', at.x, at.y, 'down')).toBe(true);
    expect(g.buy('armchair', at.x, at.y, 'down')).toBe(true);
    const chair = g.state.objects.find((o) => o.defId === 'armchair' && o.x === at.x && o.y === at.y)!;
    // Clicking there is the chair; the rug still moves off under it.
    expect(objectAt(g.state.objects, at.x, at.y)?.uid).toBe(chair.uid);
    expect(g.canPlace('rugWoolNavy', at.x, at.y, 'down', rug.uid)).toBe(true);
  });
  it('are all for sale, each drawn', () => {
    for (const r of RUGS) {
      expect(BUYABLE.includes(r)).toBe(true);
      expect(OBJECT_BUY[r.id]).toBeTruthy();
      expect(r.walkable && r.flat).toBe(true);
    }
  });
});

describe('more kinds of home (2026-11-01)', () => {
  it('every trait is earned by something real, and has a mood', () => {
    const ids = new Set(CATALOG.flatMap((d) => d.interactions.map((i) => i.id)));
    for (const t of LOT_TRAITS) {
      expect(BUFFS[t.buff], t.id).toBeTruthy();
      expect(t.skills.length + (t.habits?.length ?? 0), t.id).toBeGreaterThan(0);
      for (const h of t.habits ?? []) expect(ids.has(h), `${t.id} ${h}`).toBe(true);
    }
    expect(LOT_TRAITS.length).toBeGreaterThanOrEqual(15);
  });
  it('sleeping well builds one, and living in it keeps energy longer', () => {
    const g = game(spec('민준', 'male'));
    const dweller = g.state.dwellers[0];
    const p = g as unknown as { noteLotHabit(s: unknown, id: string, m: number): void; decay(s: unknown, dt: number, mul?: number): void };
    const fall = () => {
      dweller.needs.energy = 80;
      p.decay(dweller, 10);
      return 80 - dweller.needs.energy;
    };
    const was = fall();
    p.noteLotHabit(dweller, 'sleep', EARN_MINUTES);
    expect(g.lotTraits).toContain('cozyNest');
    expect(fall()).toBeCloseTo(was * 0.9);
  });
});

describe('what a mood does (2026-11-01)', () => {
  const st = (emotion: EmotionKey, intensity = 0) => ({ emotion, weight: 1, intensity });
  it('the table is what the rolls go by, and what the card says', () => {
    expect(workSuccess(5, 5, 'angry') - workSuccess(5, 5, 'fine')).toBeCloseTo(MOOD_EFFECTS.angry.work!);
    expect(workSuccess(5, 5, 'sad')).not.toBe(workSuccess(5, 5, 'dazed'));
    const rel = { friend: 0, romance: 0, lastChange: 0, flags: [], stage: 'acquaintance', mood: { friendly: 0, fun: 0, romance: 0, awkward: 0 }, recent: null } as never;
    const talk = (a: EmotionKey, t: EmotionKey) => contextScore('friendly', rel, { emotion: a, charisma: 0 }, { emotion: t });
    expect(talk('angry', 'fine') - talk('fine', 'fine')).toBe(MOOD_EFFECTS.angry.speaking!.friendly);
    expect(talk('fine', 'angry') - talk('fine', 'fine')).toBe(MOOD_EFFECTS.angry.spokenTo!.friendly);
    const lines = moodEffectLines(st('angry')).map((l) => l.text);
    expect(lines).toContain('업무 성공 -12%');
    expect(lines).toContain('내가 하는 친근한 대화 -6');
    expect(lines).toContain('말이 어긋나면 우정이 1.5배 깎여요');
    expect(moodEffectLines(st('fine'))).toEqual([]);
    // Every mood but none has something to show, and something to say for itself.
    for (const e of Object.keys(EMOTIONS) as EmotionKey[]) if (e !== 'fine') {
      expect(moodEffectLines(st(e)).length, e).toBeGreaterThan(0);
      expect(MOOD_EFFECTS[e].because, e).toBeTruthy();
    }
  });
  it('a notice says why, when the mood had a real part in it', () => {
    const a = { name: '하린', emotion: 'angry' as EmotionKey };
    const b = { name: '시우', emotion: 'fine' as EmotionKey };
    expect(moodReason('friendly', a, b, 'fail')).toBe('하린: 화가 나 있어서');
    expect(moodReason('friendly', b, a, 'fail')).toBe('하린: 화가 나 있어서');
    expect(moodReason('friendly', b, b, 'fail')).toBeNull();
    expect(moodReason('friendly', { ...a, emotion: 'happy' }, b, 'great')).toBe('하린: 기분이 좋아서');
    expect(moodReason('mean', a, b, 'fail')).toBeNull();
  });
  it('it shows in life: a scared dweller needs the toilet twice as fast, a dazed one walks slower', () => {
    const g = game(spec('민준', 'male'));
    const dweller = g.state.dwellers[0];
    const fall = (e: EmotionKey) => {
      dweller.emotion = e;
      dweller.needs.bladder = 80;
      (g as unknown as { decay(s: unknown, dt: number): void }).decay(dweller, 10);
      return 80 - dweller.needs.bladder;
    };
    expect(fall('scared')).toBeCloseTo(fall('fine') * 2);
    expect(g.moodHelps(dweller).labels).toBeInstanceOf(Array);
  });
});

describe('moodlets for what used to leave no mark (2026-11-01)', () => {
  it('each is on its event', () => {
    const g = game(spec('하린', 'female'), spec('시우', 'male'));
    const [a, b] = g.state.dwellers;
    const has = (s: typeof a, id: string) => s.buffs.some((x) => x.id === id);
    const apply = (social: string, outcome: string) => (g as unknown as { applySocialOutcome(a: unknown, b: unknown, s: unknown, o: string): void }).applySocialOutcome(a, b, SOCIAL_BY_ID[social], outcome);
    apply('scare', 'ok');
    expect(has(b, 'frightened')).toBe(true);
    g.rng = () => 0.1;
    apply('fakeBadNews', 'ok');
    expect(has(b, 'prankedAngry')).toBe(true);
    g.relationship(a.id, b.id).romance = 30;
    apply('compliment', 'ok');
    expect(has(b, 'blushing')).toBe(true);
    apply('kiss', 'ok');
    expect(has(a, 'sweetLinger') && has(b, 'sweetLinger')).toBe(true);
    // The third time running of something done for pleasure.
    const inter = { id: 'x', skill: { key: 'logic', rate: 1 }, effects: {} } as never;
    for (let i = 0; i < 3; i++) (g as unknown as { afterActivity(s: unknown, i: unknown): void }).afterActivity(a, inter);
    expect(has(a, 'sameAgain')).toBe(true);
    // Three days in.
    const p = g as unknown as { stepCabinFever(s: unknown): void };
    p.stepCabinFever(b);
    g.state.time += 3 * 1440;
    p.stepCabinFever(b);
    expect(has(b, 'stuckAtHome')).toBe(true);
  });
});

describe('the questions at work (2026-11-01)', () => {
  it('there are many of them, whichever the job', () => {
    expect(eventsFor('childcareTeacher', 0).length).toBeGreaterThanOrEqual(40);
    expect(eventsFor('doctor', 5).length).toBeGreaterThanOrEqual(30);
    expect(eventsFor('school', 0).every((e) => e.careers[0] !== '*')).toBe(true);
  });
});
