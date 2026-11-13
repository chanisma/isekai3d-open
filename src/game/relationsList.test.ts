import { describe, expect, it } from 'vitest';
import { Game } from './game';

// The 관계 tab's list of people a dweller has a relationship with (2026-10-26, at the user's request):
// only those they've got to know, wherever they are, closest first.

function game() {
  const g = Game.create(
    [
      { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
      { name: '서연', shirt: '#e53935', skin: '#f8d9c0', hair: '#2b1b10' },
    ],
    () => 0.4,
  );
  g.state.freeWill = false;
  return g;
}

describe('game.relationsOf', () => {
  it('lists the people known — neighbours, colleagues — and leaves strangers out', () => {
    const g = game();
    const [me] = g.state.dwellers;
    const [a, b, c] = g.state.townies!;
    g.relationship(me.id, a.id).friend = 30;
    g.relationship(me.id, b.id).romance = 20;
    g.relationship(me.id, b.id).flags.push('partner');
    // Someone met once and forgotten, and one never met (only looked up).
    g.relationship(me.id, c.id).friend = 2;
    const list = g.relationsOf(me.id);
    const ids = list.map((r) => r.id);
    expect(ids).toContain(a.id);
    expect(ids).toContain(b.id);
    expect(ids).not.toContain(c.id);
    // A partner before a friend; each named, from the street.
    expect(ids.indexOf(b.id)).toBeLessThan(ids.indexOf(a.id));
    expect(list.find((r) => r.id === a.id)).toMatchObject({ name: a.name, where: 'street' });
  });

  it('family first even as strangers to each other; a colleague is from work; only the dweller’s own ties', () => {
    const g = game();
    const [me, sis] = g.state.dwellers;
    g.acceptJob(me.id, 'tech');
    g.relationship(me.id, sis.id).friend = 1;
    const kin = g.familyTie(me, sis);
    const list = g.relationsOf(me.id);
    if (kin) expect(list[0].id).toBe(sis.id);
    // A colleague got to know at work.
    const mate = { ...g.state.townies![0], id: 4800, name: '동료', workmate: { careerId: 'tech', slot: 1 } };
    g.state.townies!.push(mate);
    g.relationship(me.id, mate.id).friend = 40;
    expect(g.relationsOf(me.id).find((r) => r.id === mate.id)?.where).toBe('work');
    // Two neighbours' friendship isn't the dweller's.
    const [x, y] = g.state.townies!;
    g.relationship(x.id, y.id).friend = 80;
    expect(g.relationsOf(me.id).some((r) => r.id === y.id && r.rel === g.relationship(x.id, y.id))).toBe(false);
  });
});
