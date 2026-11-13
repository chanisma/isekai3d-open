import { describe, expect, it } from 'vitest';
import { Game } from './game';
import type { Dweller } from './types';
import { TOWNIE_ID_BASE, VISIT_LENGTH } from './visitors';

function seeded(seed = 42) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const SPECS = [
  { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
  { name: '서연', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' },
  { name: '지우', shirt: '#43a047', skin: '#c99a6e', hair: '#a0522d' },
  { name: '하은', shirt: '#8e24aa', skin: '#8d5524', hair: '#111111' },
];

function household(n: number) {
  const g = Game.create(SPECS.slice(0, n), seeded());
  g.state.freeWill = false;
  g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
  return g;
}

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

/** A townie standing in the living room as a guest. */
/** 다은 (106): single with no children, so free to court and to move in (Game.spokenFor); kept home for the visit. */
const FREE = TOWNIE_ID_BASE + 5;

function guest(g: Game): Dweller {
  g.state.time = 11 * 60;
  const free = g.state.townies!.find((t) => t.id === FREE)!;
  expect(g.spokenFor(free)).toBeNull();
  free.job = undefined;
  g.inviteOver(g.state.dwellers[0].id, FREE);
  run(g, 120);
  const v = g.dweller(FREE)!;
  expect(v.npc?.role).toBe('guest');
  v.npc!.until = g.state.time + VISIT_LENGTH;
  for (const k of Object.keys(v.needs) as Array<keyof Dweller['needs']>) v.needs[k] = 90;
  v.queue = [];
  v.run = null;
  Object.assign(v, { x: 12, y: 11 });
  return v;
}

function engage(g: Game, a: Dweller, b: Dweller) {
  const rel = g.relationship(a.id, b.id);
  rel.friend = 60;
  rel.romance = 70;
  rel.flags.push('partner', 'engaged');
}

describe('weddings and moving in', () => {
  it('needs an engagement before a wedding', () => {
    const g = household(2);
    const [a, b] = g.state.dwellers;
    expect(g.socialMenu(a, b).find((o) => o.id === 'marry')?.disabled).toBe('약혼이 먼저예요');
    engage(g, a, b);
    expect(g.socialMenu(a, b).find((o) => o.id === 'marry')?.disabled).toBeUndefined();
  });

  it('marries an engaged couple while the family looks on', () => {
    const g = household(3);
    const [a, b, c] = g.state.dwellers;
    engage(g, a, b);
    Object.assign(a, { x: 11, y: 11 });
    Object.assign(b, { x: 12, y: 11 });
    Object.assign(c, { x: 14, y: 12 });
    g.enqueue(a.id, { kind: 'social', targetId: b.id, socialId: 'marry', autonomous: false });
    run(g, 35);
    expect(g.relationship(a.id, b.id).flags).toContain('married');
    expect(a.buffs.some((x) => x.id === 'justMarried')).toBe(true);
    expect(b.buffs.some((x) => x.id === 'justMarried')).toBe(true);
    expect(c.buffs.some((x) => x.id === 'sawWedding')).toBe(true);
  });

  it('moves a townie spouse in after the wedding', () => {
    const g = household(2);
    const v = guest(g);
    const [a] = g.state.dwellers;
    Object.assign(a, { x: 11, y: 11 });
    engage(g, a, v);
    g.enqueue(a.id, { kind: 'social', targetId: v.id, socialId: 'marry', autonomous: false });
    run(g, 35);
    expect(v.npc).toBeUndefined();
    expect(g.household()).toHaveLength(3);
    expect(g.state.townies!.some((t) => t.id === v.id)).toBe(false);
  });

  it('asks a guest to move in: partners usually say yes, a no holds for two days', () => {
    const g = household(2);
    const v = guest(g);
    const [a] = g.state.dwellers;
    Object.assign(a, { x: 11, y: 11 });
    g.rng = () => 0.99; // a stranger: 20% chance, this roll misses
    g.enqueue(a.id, { kind: 'social', targetId: v.id, socialId: 'askMoveIn', autonomous: false });
    run(g, 10);
    expect(v.npc).toBeDefined();
    expect(g.state.moveInRefusedUntil?.[v.id]).toBeGreaterThan(g.state.time + 2800);
    g.state.moveInRefusedUntil = {};
    engage(g, a, v);
    g.rng = () => 0.5; // 20 + 60 + friend 20 = 100% for a partner who's a friend
    g.enqueue(a.id, { kind: 'social', targetId: v.id, socialId: 'askMoveIn', autonomous: false });
    run(g, 10);
    expect(v.npc).toBeUndefined();
  });

  it('keeps a full house at four', () => {
    const g = household(4);
    const v = guest(g);
    const [a] = g.state.dwellers;
    Object.assign(a, { x: 11, y: 11 });
    engage(g, a, v);
    g.rng = () => 0;
    g.enqueue(a.id, { kind: 'social', targetId: v.id, socialId: 'askMoveIn', autonomous: false });
    run(g, 10);
    expect(v.npc).toBeDefined();
    expect(g.toasts.some((t) => t.text.includes('더 들일 수 없어요'))).toBe(true);
  });
});
