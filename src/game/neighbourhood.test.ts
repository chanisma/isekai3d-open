import { describe, expect, it } from 'vitest';
import { CAREER_BY_ID } from './careers';
import { Game } from './game';
import { CAST, NEIGHBOR_HOUSES, ageNeighbourhood, houseName, settleNeighbourhood, stageDays, whereabouts } from './neighbourhood';
import { traitFitsAge, TRAIT_BY_ID } from './traits';
import type { Townie } from './visitors';

const seeded = (seed = 7) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const DAY = 1440;
const at = (day: number, h: number, m = 0) => day * DAY + h * 60 + m;
const game = () => Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], seeded());

describe('the neighbourhood as households (ours)', () => {
  it('gives everyone a home, a fitting age and traits, and grown-ups real jobs', () => {
    for (const m of CAST) {
      expect(NEIGHBOR_HOUSES.some((h) => h.id === m.home), m.name).toBe(true);
      for (const t of m.traits ?? []) expect(traitFitsAge(TRAIT_BY_ID[t], m.age), `${m.name} ${t}`).toBe(true);
      if (m.job) expect(CAREER_BY_ID[m.job.careerId], m.name).toBeTruthy();
    }
    const t = settleNeighbourhood(undefined, seeded(), 107);
    expect(houseName('h1', t)).toBe('도윤이네');
    expect(houseName('h2', t)).toBe('수아네');
  });

  it('keeps an old save’s six and moves the newcomers in after every id in use', () => {
    const old: Townie[] = Array.from({ length: 6 }, (_, i) => ({ id: 101 + i, name: CAST[i].name, shirt: '#000', skin: '#fff', hair: '#000' }));
    old.splice(3, 1); // 예린 married into the household long ago
    const t = settleNeighbourhood(old, seeded(), 120, 0, 'normal', new Set(['예린']));
    expect(t.find((x) => x.id === 101)!.job?.careerId).toBe('firefighter');
    expect(t.some((x) => x.name === '예린')).toBe(false);
    expect(t.filter((x) => x.id >= 120).map((x) => x.name)).toEqual(['하준', '지호', '서윤', '영자']);
  });

  it('knows where each neighbour is: work in their hours, school on weekdays, asleep at night', () => {
    const t = settleNeighbourhood(undefined, seeded(), 107);
    const by = (n: string) => t.find((x) => x.name === n)!;
    expect(whereabouts(by('예린'), at(0, 10))).toBe('work'); // teacher, Monday morning
    expect(whereabouts(by('예린'), at(0, 18))).toBe('home');
    expect(whereabouts(by('예린'), at(5, 10))).toBe('home'); // Saturday
    expect(whereabouts(by('하준'), at(1, 10))).toBe('school');
    expect(whereabouts(by('하준'), at(1, 16))).toBe('home');
    expect(whereabouts(by('하준'), at(1, 21, 30))).toBe('asleep');
    expect(whereabouts(by('영자'), at(1, 10))).toBe('home');
    // A shift past midnight keeps them at work.
    const night: Townie = { ...by('다은'), job: { careerId: 'nurse', level: 2 } };
    expect(whereabouts(night, at(0, 23, 30))).toBe('work');
    expect(whereabouts(night, at(1, 2))).toBe('work');
  });

  it('turns neighbours away who are out, and lets the ones at home come round', () => {
    const g = game();
    const yerin = g.state.townies!.find((t) => t.name === '예린')!;
    g.state.time = at(7, 10); // Monday
    g.inviteOver(g.state.dwellers[0].id, yerin.id);
    expect(g.state.invites ?? []).toHaveLength(0);
    expect(g.toasts.at(-1)!.text).toContain('일하는 중');
    g.state.time = at(7, 18);
    g.inviteOver(g.state.dwellers[0].id, yerin.id);
    expect(g.state.invites).toHaveLength(1);
  });
});

describe('the years going by on the street (ours)', () => {
  it('grows children up, gives new grown-ups a job and retires the old', () => {
    const t = settleNeighbourhood(undefined, seeded(), 107, 0);
    const kid = t.find((x) => x.name === '하준')!;
    kid.stageStart = 0;
    const now = stageDays('child', 'normal') * DAY;
    ageNeighbourhood(t, now, 'normal', seeded(3), () => 500, new Set());
    expect(kid.age).toBe('teen');
    kid.stageStart = now;
    const later = now + stageDays('teen', 'normal') * DAY;
    const ev = ageNeighbourhood(t, later, 'normal', seeded(3), () => 501, new Set());
    expect(kid.age).toBeUndefined();
    expect(CAREER_BY_ID[kid.job!.careerId].partTime).toBeFalsy();
    expect(ev.some((e) => e.kind === 'job' && e.townieId === kid.id)).toBe(true);
    const dad = t.find((x) => x.name === '도윤')!;
    dad.stageStart = 0;
    ageNeighbourhood(t, stageDays(undefined, 'normal') * DAY, 'normal', seeded(), () => 502, new Set());
    expect(dad.age).toBe('elder');
    expect(dad.retiredFrom).toBe('firefighter');
    expect(dad.job).toBeUndefined();
  });

  it('lets the oldest pass away at the end of old age, but not while visiting', () => {
    const t = settleNeighbourhood(undefined, seeded(), 107, 0);
    const gran = t.find((x) => x.name === '영자')!;
    gran.stageStart = 0;
    const end = stageDays('elder', 'normal') * DAY;
    ageNeighbourhood(t, end, 'normal', seeded(), () => 500, new Set([gran.id]));
    expect(t).toContain(gran);
    const ev = ageNeighbourhood(t, end, 'normal', seeded(), () => 500, new Set());
    expect(t).not.toContain(gran);
    expect(ev.find((e) => e.kind === 'passed')?.townieId).toBe(gran.id);
  });

  it('keeps grown-ups as they are when nobody ages, though children still grow', () => {
    const t = settleNeighbourhood(undefined, seeded(), 107, 0, 'off');
    for (const x of t) x.stageStart = 0;
    ageNeighbourhood(t, 400 * DAY, 'off', seeded(), () => 500, new Set());
    expect(t.find((x) => x.name === '도윤')!.age).toBeUndefined();
    expect(t.find((x) => x.name === '하준')!.age).toBe('teen');
  });

  it('brings babies to married couples, and new families to empty houses while the street is small', () => {
    const t = settleNeighbourhood(undefined, seeded(), 107, 0);
    let id = 300;
    let babies = 0;
    for (let d = 1; d < 120 && !babies; d++) babies += ageNeighbourhood(t, d * 60, 'normal', seeded(d), () => id++, new Set()).filter((e) => e.kind === 'born').length;
    expect(babies).toBeGreaterThan(0);
    // A baby's parents are a married couple at home together.
    const baby = t.find((x) => x.age === 'baby')!;
    const [p, q] = baby.parents!.map((i) => t.find((x) => x.id === i)!);
    expect(p.partnerId).toBe(q.id);
    expect(p.married && q.married).toBe(true);
    expect(p.home).toBe(baby.home);
    // Emptied and small (a fresh street, 다은 gone), it gets a family with a working grown-up in an empty house.
    t.splice(0, t.length, ...settleNeighbourhood(undefined, seeded(), 107, 0));
    const lone = t.filter((x) => x.home === 'h5');
    for (const x of lone) t.splice(t.indexOf(x), 1);
    const before = new Set(t.map((x) => x.id));
    let moved = 0;
    for (let d = 1; d < 60 && !moved; d++) moved += ageNeighbourhood(t, d * 60, 'normal', seeded(d + 50), () => id++, new Set()).filter((e) => e.kind === 'movedIn').length;
    expect(moved).toBeGreaterThan(0);
    expect(t.some((x) => !before.has(x.id) && !x.age && x.job && ['h5', 'h6', 'h7', 'h8'].includes(x.home!))).toBe(true);
    expect(new Set(t.map((x) => x.id)).size).toBe(t.length);
  });

  it('moves the street on once a morning, with news, and a farewell felt by friends', () => {
    const g = game();
    const dweller = g.state.dwellers[0];
    const gran = g.state.townies!.find((t) => t.name === '영자')!;
    g.relationship(dweller.id, gran.id).friend = 50;
    gran.stageStart = g.state.time - stageDays('elder', 'normal') * DAY;
    g.state.time = Math.floor(g.state.time / DAY) * DAY + DAY + 7 * 60;
    (g as unknown as { stepNeighbourAges(): void }).stepNeighbourAges();
    expect(g.state.townies!.some((t) => t.id === gran.id)).toBe(false);
    expect(g.toasts.some((t) => t.text.includes('영자'))).toBe(true);
    expect(dweller.buffs.some((b) => b.id === 'griefFriend')).toBe(true);
    expect(new Set(g.state.townies!.map((t) => t.id)).size).toBe(g.state.townies!.length);
  });
});

describe('the cast looks the same in every game', () => {
  it('gives each neighbour of the cast their own colours, whatever the dice, and puts them back on older saves', () => {
    const a = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.1);
    const b = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.9);
    const colours = (g: Game) => (g.state.townies ?? []).filter((t) => CAST.some((m) => m.name === t.name)).map((t) => [t.name, t.skin, t.hair, t.shirt]);
    expect(colours(a)).toEqual(colours(b));
    expect(colours(a).length).toBe(CAST.length);
    // A save from when they were drawn at random: its neighbours take the cast's colours again.
    const old = JSON.parse(JSON.stringify(b.state));
    for (const t of old.townies) t.skin = '#46291a';
    expect(colours(new Game(old))).toEqual(colours(a));
  });
});
