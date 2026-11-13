import { describe, expect, it } from 'vitest';
import { Game } from './game';
import { dwellerDrawPos } from './render';
import type { Dweller } from './types';

function seeded(seed = 42) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function pair() {
  const g = Game.create(
    [
      { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
      { name: '서연', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' },
    ],
    seeded(),
  );
  g.state.freeWill = false;
  return g;
}

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

const doing = (g: Game, s: Dweller) => g.performing(s)?.inter.id;

function onSofa(g: Game, interactionId: string) {
  const sofa = g.state.objects.find((o) => o.defId === 'sofa')!;
  const [a, b] = g.state.dwellers;
  Object.assign(a, { x: 7, y: 11 });
  Object.assign(b, { x: 10, y: 11 });
  for (const s of [a, b]) g.enqueue(s.id, { kind: 'interact', objectUid: sofa.uid, interactionId, autonomous: false });
  run(g, 5);
  return { a, b, sofa };
}

describe('shared objects', () => {
  it('seats two dwellers side by side on the sofa', () => {
    const g = pair();
    const { a, b } = onSofa(g, 'relax');
    expect(doing(g, a)).toBe('relax');
    expect(doing(g, b)).toBe('relax');
    expect(dwellerDrawPos(g, a)).not.toEqual(dwellerDrawPos(g, b));
  });

  it('keeps a sofa nap to one dweller', () => {
    const g = pair();
    const sofa = g.state.objects.find((o) => o.defId === 'sofa')!;
    const [a, b] = g.state.dwellers;
    Object.assign(a, { x: 8, y: 12 });
    Object.assign(b, { x: 10, y: 11 });
    g.enqueue(a.id, { kind: 'interact', objectUid: sofa.uid, interactionId: 'relax', autonomous: false });
    run(g, 2);
    g.enqueue(b.id, { kind: 'interact', objectUid: sofa.uid, interactionId: 'nap', autonomous: false });
    run(g, 5);
    expect(doing(g, b)).toBeUndefined();
  });

  it('lets several dwellers watch the same TV standing', () => {
    const g = pair();
    const tv = g.state.objects.find((o) => o.defId === 'tv')!;
    for (const s of g.state.dwellers) g.enqueue(s.id, { kind: 'interact', objectUid: tv.uid, interactionId: 'watch', autonomous: false });
    run(g, 10);
    expect(g.state.dwellers.map((s) => doing(g, s))).toEqual(['watch', 'watch']);
  });
});

describe('multitasking', () => {
  it('chats from the sofa without anyone getting up', () => {
    const g = pair();
    const { a, b } = onSofa(g, 'watchTv');
    const friend = g.relationship(a.id, b.id).friend;
    a.needs.social = b.needs.social = 30;
    g.enqueue(a.id, { kind: 'social', targetId: b.id, socialId: 'chat', autonomous: false });
    expect(a.side?.socialId).toBe('chat');
    run(g, 10);
    expect(doing(g, a)).toBe('watchTv');
    expect(doing(g, b)).toBe('watchTv');
    expect(b.needs.social).toBeGreaterThan(30);
    run(g, 20);
    expect(a.side).toBeUndefined();
    expect(g.relationship(a.id, b.id).friend).not.toBe(friend);
  });

  it('free will strikes up a chat on the sofa every so often', () => {
    const g = pair();
    const { a, b } = onSofa(g, 'watchTv');
    g.state.freeWill = true;
    a.needs.social = b.needs.social = 25;
    let chatted = false;
    for (let t = 0; t < 30 && !chatted; t += 0.5) {
      g.step(0.5);
      chatted = !!(a.side || b.side);
    }
    expect(chatted).toBe(true);
    expect(doing(g, a)).toBe('watchTv');
  });

  it('drops the side chat when one of them gets up', () => {
    const g = pair();
    const { a, b } = onSofa(g, 'relax');
    g.enqueue(a.id, { kind: 'social', targetId: b.id, socialId: 'chat', autonomous: false });
    expect(a.side).toBeDefined();
    g.cancel(b.id, b.queue[0].id);
    run(g, 2);
    expect(a.side).toBeUndefined();
  });
});
