import { describe, expect, it } from 'vitest';
import { levelOf } from './careers';
import { colleaguesFor } from './colleagues';
import { Game } from './game';
import { awayReason, onStreet, stepStreetBonds } from './neighbourhood';
import { WORKPLACES } from './workplace';
import type { Townie } from './visitors';

const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

/** A tech worker followed to their first shift. */
function toWork(seed: number) {
  const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], seeded(seed));
  g.state.freeWill = false;
  g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
  const dweller = g.state.dwellers[0];
  g.acceptJob(dweller.id, 'tech');
  g.setFollowWork(dweller.id, true);
  const lvl = levelOf(dweller.job!);
  let day = Math.floor(g.state.time / 1440) + 1;
  while (!(lvl.days ?? [0, 1, 2, 3, 4]).includes(day % 7)) day++;
  g.state.time = day * 1440 + lvl.start - 61;
  dweller.job!.lastWorkDay = day - 1;
  for (let t = 0; t < 75; t += 0.5) g.step(0.5);
  return { g, dweller, work: g.workGames.get(dweller.id)! };
}

describe('colleagues (colleagues.ts, 2026-10-25)', () => {
  it('each game draws its own colleagues — face, looks, traits — and keeps them', () => {
    const a = toWork(11);
    const b = toWork(29);
    const mates = (g: Game) => (g.state.townies ?? []).filter((t) => t.workmate?.careerId === 'tech');
    expect(mates(a.g)).toHaveLength(WORKPLACES.tech.coworkers.length);
    expect(mates(a.g).every((t) => t.face && t.gender && t.traits?.length)).toBe(true);
    expect(mates(a.g).filter((t) => t.workmate!.boss)).toHaveLength(1);
    // Another game, other people.
    expect(mates(a.g).map((t) => `${t.name}${t.face}`)).not.toEqual(mates(b.g).map((t) => `${t.name}${t.face}`));
    // On the lot, the people are those colleagues, faces and all.
    const onLot = a.work.state.dwellers.filter((s) => s.npc?.role === 'coworker');
    expect(onLot.map((s) => [s.id, s.face])).toEqual(mates(a.g).map((t) => [t.id, t.face]));
    // The next shift, the same people.
    const before = mates(a.g).map((t) => t.id);
    a.g.finishWorkplace(a.dweller.id, true);
    expect(mates(a.g).map((t) => t.id)).toEqual(before);
  });

  it('colleagues go home in their own clothes before the shift ends', () => {
    const { g, work } = toWork(5);
    const end = work.state.workplace!.end;
    while (g.state.time < end - 15) g.step(0.5);
    const mates = work.state.dwellers.filter((s) => s.npc?.role === 'coworker');
    expect(mates.every((s) => s.npc?.leaving)).toBe(true);
  });

  it('a colleague who moved in is replaced by a newcomer with an id of their own', () => {
    const townies: Townie[] = [];
    const def = WORKPLACES.tech;
    const first = colleaguesFor(def, townies, seeded(3), 0, () => false, () => 500);
    const gone = first[1];
    townies.splice(townies.indexOf(gone), 1);
    const again = colleaguesFor(def, townies, seeded(4), 0, (id) => id === gone.id, () => 500);
    expect(again).toHaveLength(first.length);
    expect(again[1].id).toBe(500);
    expect(again[1].workmate!.slot).toBe(1);
  });

  it('the street’s own life leaves colleagues out', () => {
    const townies: Townie[] = [];
    colleaguesFor(WORKPLACES.tech, townies, seeded(3), 0, () => false, () => 500);
    expect(onStreet(townies)).toHaveLength(0);
    const bonds: Record<string, number> = {};
    for (let i = 0; i < 20; i++) stepStreetBonds(townies, bonds, seeded(i + 1));
    expect(Object.keys(bonds)).toHaveLength(0);
  });

  it('closeness made at work comes home, and a colleague can be asked over, dated and moved in (2026-10-26)', () => {
    const { g, dweller, work } = toWork(5);
    const mate = work.state.dwellers.find((s) => s.npc?.role === 'coworker' && !s.npc.boss && !(g.state.townies ?? []).find((t) => t.id === s.id)?.star)!;
    const atWork = work.relationship(dweller.id, mate.id);
    atWork.friend = 60;
    atWork.romance = 40;
    // Through the shift and home again.
    for (let t = 0; t < 12 * 60 && g.workGames.has(dweller.id); t += 0.5) g.step(0.5);
    const asLeft = { ...work.relationship(dweller.id, mate.id) };
    for (let t = 0; t < 120 && dweller.away; t += 0.5) g.step(0.5);
    expect(g.workGames.has(dweller.id)).toBe(false);
    const rel = g.relationship(dweller.id, mate.id);
    // As the shift left it (a word that went wrong on the way can take a little off).
    expect(rel.friend).toBeCloseTo(asLeft.friend, 0);
    expect(rel.romance).toBeCloseTo(asLeft.romance, 0);
    expect(g.dateBlocker(dweller, mate.id) ?? '').not.toContain('로맨스');
    // Over to the house when they're free, and to stay.
    const t = g.state.townies!.find((x) => x.id === mate.id)!;
    expect(g.spokenFor(t)).toBeNull();
    let at = g.state.time;
    while (awayReason(t, at)) at += 30;
    g.state.time = at;
    g.inviteOver(dweller.id, mate.id);
    for (let m = 0; m < 180 && g.dweller(mate.id)?.npc?.role !== 'guest'; m += 0.5) g.step(0.5);
    const v = g.dweller(mate.id)!;
    expect(v.npc?.role).toBe('guest');
    v.npc!.until = g.state.time + 600;
    Object.assign(dweller, { x: 11, y: 11, queue: [], run: null });
    Object.assign(v, { x: 12, y: 11, queue: [], run: null });
    rel.flags.push('partner');
    g.rng = () => 0;
    g.enqueue(dweller.id, { kind: 'social', targetId: v.id, socialId: 'askMoveIn', autonomous: false });
    for (let m = 0; m < 10; m += 0.5) g.step(0.5);
    expect(v.npc).toBeUndefined();
    expect(g.household().map((s) => s.id)).toContain(mate.id);
  });
});
