import { describe, expect, it } from 'vitest';
import { rankOptions } from './autonomy';
import { Game } from './game';
import { partySizeWeight } from './socials';
import type { Dweller } from './types';

function seeded(seed = 42) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function household(n: number) {
  const g = Game.create(
    [
      { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
      { name: '서연', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' },
      { name: '지우', shirt: '#43a047', skin: '#c99a6e', hair: '#a0522d' },
      { name: '하은', shirt: '#8e24aa', skin: '#8d5524', hair: '#111111' },
    ].slice(0, n),
    seeded(),
  );
  g.state.freeWill = false;
  return g;
}

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

/** a starts chatting with b, standing side by side in the living room. */
function startChat(g: Game, a: Dweller, b: Dweller) {
  Object.assign(a, { x: 11, y: 11 });
  Object.assign(b, { x: 12, y: 11 });
  g.enqueue(a.id, { kind: 'social', targetId: b.id, socialId: 'chat', autonomous: false });
  run(g, 1);
}

describe('conversation groups', () => {
  it('follows 참고 게임 dweller_Chat party-size weights', () => {
    expect([0, 1, 2, 3, 4].map(partySizeWeight)).toEqual([1, 1, 0.5, 0, 0]);
  });

  it('puts the two dwellers of a social into one group that lapses after the talk', () => {
    const g = household(2);
    const [a, b] = g.state.dwellers;
    startChat(g, a, b);
    expect(g.convoOf(a).map((s) => s.id).sort()).toEqual([a.id, b.id]);
    run(g, 60);
    expect(g.convoOf(a)).toEqual([]);
  });

  it('lets a third dweller join a busy conversation and greet everyone', () => {
    const g = household(3);
    const [a, b, c] = g.state.dwellers;
    startChat(g, a, b);
    Object.assign(c, { x: 15, y: 12 });
    const before = [g.relationship(c.id, a.id).friend, g.relationship(c.id, b.id).friend];
    expect(g.socialMenu(c, b).find((o) => o.id === 'joinConversation')?.disabled).toBeUndefined();
    g.enqueue(c.id, { kind: 'social', targetId: b.id, socialId: 'joinConversation', autonomous: false });
    run(g, 12);
    expect(g.convoOf(c)).toHaveLength(3);
    expect(g.relationship(c.id, a.id).friend).not.toBe(before[0]);
    expect(g.relationship(c.id, b.id).friend).not.toBe(before[1]);
  });

  it('waits for a conversation that is just starting instead of giving up', () => {
    const g = household(3);
    const [a, b, c] = g.state.dwellers;
    Object.assign(a, { x: 5, y: 11 });
    Object.assign(b, { x: 12, y: 11 });
    Object.assign(c, { x: 14, y: 12 });
    g.enqueue(a.id, { kind: 'social', targetId: b.id, socialId: 'chat', autonomous: false });
    g.enqueue(c.id, { kind: 'social', targetId: b.id, socialId: 'joinConversation', autonomous: false });
    run(g, 20);
    expect(g.convoOf(c)).toHaveLength(3);
    expect(g.toasts.some((t) => t.text.includes('대화 중이 아니에요'))).toBe(false);
  });

  it('feeds idle listeners some social and keeps them listening', () => {
    const g = household(3);
    const [a, b, c] = g.state.dwellers;
    startChat(g, a, b);
    Object.assign(c, { x: 11, y: 12, convo: { ...a.convo! } });
    for (const s of [a, b, c]) s.needs.social = 30;
    g.state.freeWill = true;
    run(g, 10);
    expect(c.needs.social).toBeGreaterThan(30);
    expect(c.queue.length === 0 || c.queue[0].kind === 'social').toBe(true);
  });

  it('gives a three-dweller circle the group-chat moodlet on a good social', () => {
    const g = household(3);
    const [a, b, c] = g.state.dwellers;
    Object.assign(c, { x: 11, y: 12 });
    c.convo = { id: 99, until: g.state.time + 60 };
    a.convo = { id: 99, until: g.state.time + 60 };
    startChat(g, a, b);
    run(g, 30);
    const landed = !a.buffs.some((x) => x.id === 'awkward');
    expect(landed).toBe(true);
    for (const s of [a, b, c]) expect(s.buffs.some((x) => x.id === 'groupChat')).toBe(true);
  });

  it('free will offers to join a pair at half weight but never a circle of three', () => {
    const g = household(4);
    const [a, b, c, d] = g.state.dwellers;
    startChat(g, a, b);
    Object.assign(d, { x: 15, y: 12 });
    const joinOf = (s: Dweller) => rankOptions(g, s).filter((o) => o.action.kind === 'social' && o.action.socialId === 'joinConversation');
    expect(joinOf(d)).toHaveLength(1);
    Object.assign(c, { x: 11, y: 12, convo: { ...a.convo! } });
    expect(joinOf(d)).toHaveLength(0);
  });

  it('leaves the group when the dweller goes off to use an object', () => {
    const g = household(2);
    const [a, b] = g.state.dwellers;
    startChat(g, a, b);
    run(g, 30);
    const fridge = g.state.objects.find((o) => o.defId === 'fridge')!;
    g.enqueue(b.id, { kind: 'interact', objectUid: fridge.uid, interactionId: 'snack', autonomous: false });
    run(g, 20);
    expect(b.convo).toBeUndefined();
  });
});
