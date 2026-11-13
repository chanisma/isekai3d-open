import { describe, expect, it } from 'vitest';
import { rankOptions } from './autonomy';
import { goalMet } from './aspirations';
import { Game } from './game';
import type { Dweller } from './types';
import { DOORSTEP, GUEST_FORBIDDEN, TOWNIE_ID_BASE, VISIT_LENGTH } from './visitors';

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
  g.state.nextWalkbyAt = 1e9; // keep the street quiet unless a test wants walkers
  return g;
}

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

const npcs = (g: Game) => g.state.dwellers.filter((s) => s.npc);

/** Rings the doorbell now and lets the visitor walk up to the door. */
function ring(g: Game): Dweller {
  g.state.time = 11 * 60;
  g.state.nextDoorbellAt = g.state.time;
  run(g, 20);
  const v = npcs(g).find((s) => s.npc!.role === 'doorbell')!;
  expect(v).toBeDefined();
  return v;
}

describe('neighbourhood', () => {
  it('has a cast of households: the old six first, then children, a teen and a grandmother', () => {
    const g = pair();
    expect(g.state.townies).toHaveLength(10);
    expect(g.state.townies![0].id).toBe(TOWNIE_ID_BASE);
    expect(new Set(g.state.townies!.map((t) => t.home)).size).toBe(5);
    expect(g.state.townies!.map((t) => t.age ?? 'adult').sort()).toEqual(['adult', 'adult', 'adult', 'adult', 'adult', 'adult', 'child', 'child', 'elder', 'teen']);
  });

  it('lets townies stroll past in the daytime and leave at the far end', () => {
    const g = pair();
    g.state.nextWalkbyAt = g.state.time;
    run(g, 1);
    const [w] = npcs(g);
    expect(w.npc!.role).toBe('walkby');
    run(g, 30);
    expect(g.state.dwellers.includes(w)).toBe(false);
    expect(g.household()).toHaveLength(2);
  });

  it('brings a visitor to the door who gives up after an hour', () => {
    const g = pair();
    const v = ring(g);
    expect(Math.round(v.x)).toBe(DOORSTEP.x);
    expect(g.toasts.some((t) => t.text.includes('초인종'))).toBe(true);
    run(g, 90);
    expect(g.state.dwellers.includes(v)).toBe(false);
    expect(g.toasts.some((t) => t.text.includes('기다리다 돌아갔어요'))).toBe(true);
  });

  it('turns a welcomed visitor into a guest for four hours', () => {
    const g = pair();
    const v = ring(g);
    const [a] = g.state.dwellers;
    expect(g.socialMenu(a, v).some((o) => o.id === 'welcome')).toBe(true);
    g.enqueue(a.id, { kind: 'social', targetId: v.id, socialId: 'welcome', autonomous: false });
    run(g, 20);
    expect(v.npc!.role).toBe('guest');
    expect(v.npc!.until).toBeGreaterThan(g.state.time + VISIT_LENGTH - 30);
    expect(g.socialMenu(a, v).some((o) => o.id === 'askToLeave')).toBe(true);
    expect(g.socialMenu(a, v).some((o) => o.id === 'welcome')).toBe(false);
  });

  it('keeps guests from cooking, sleeping or cleaning', () => {
    const g = pair();
    const v = ring(g);
    v.npc = { role: 'guest', until: g.state.time + VISIT_LENGTH };
    v.needs.hunger = 10;
    v.needs.energy = 10;
    const ids = rankOptions(g, v).flatMap((c) => (c.action.kind === 'interact' ? [c.action.interactionId] : []));
    expect(ids.some((id) => GUEST_FORBIDDEN.has(id))).toBe(false);
  });

  it('makes bed less tempting while a friend is over, and the friend leaves once everyone is asleep', () => {
    const g = pair();
    const v = ring(g);
    const [a, b] = g.state.dwellers;
    a.needs.energy = 20;
    const bedScore = () => rankOptions(g, a).filter((c) => c.action.kind === 'interact' && c.action.interactionId === 'nap').reduce((m, c) => Math.max(m, c.score), 0);
    const alone = bedScore();
    v.npc = { role: 'guest', until: g.state.time + VISIT_LENGTH };
    expect(bedScore()).toBeLessThan(alone * 0.5);
    const beds = g.state.objects.filter((o) => g.isBed(o));
    g.enqueue(a.id, { kind: 'interact', objectUid: beds[0].uid, interactionId: 'nap', autonomous: false });
    g.enqueue(b.id, { kind: 'interact', objectUid: beds[1].uid, interactionId: 'nap', autonomous: false });
    run(g, 30);
    expect(v.npc!.leaving).toBe(true);
    expect(g.toasts.some((t) => t.text.includes('다들 잠들어서'))).toBe(true);
  });

  it('sends a guest home when asked, and the household can greet them again later', () => {
    const g = pair();
    const v = ring(g);
    const [a] = g.state.dwellers;
    v.npc = { role: 'guest', until: g.state.time + VISIT_LENGTH };
    Object.assign(v, { x: 12, y: 11 });
    Object.assign(a, { x: 11, y: 11 });
    g.enqueue(a.id, { kind: 'social', targetId: v.id, socialId: 'askToLeave', autonomous: false });
    run(g, 40);
    expect(g.state.dwellers.includes(v)).toBe(false);
    expect(g.relationship(a.id, v.id).friend).toBeLessThan(0);
  });

  it('household members welcome a visitor on their own, at least some of the time', () => {
    let welcomed = 0;
    for (let seed = 1; seed <= 5; seed++) {
      const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }, { name: '서연', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' }], seeded(seed));
      g.state.freeWill = false;
      g.state.nextWalkbyAt = 1e9;
      const v = ring(g);
      g.state.freeWill = true;
      for (const s of g.household()) s.needs.social = 20;
      run(g, 60);
      if (v.npc?.role === 'guest') welcomed++;
    }
    expect(welcomed).toBeGreaterThan(0);
  });

  it('counts townie friends towards aspirations', () => {
    const g = pair();
    const [a] = g.state.dwellers;
    const rel = g.relationship(a.id, TOWNIE_ID_BASE + 2);
    rel.friend = 50;
    rel.stage = 'friend';
    expect(goalMet(g, a, { kind: 'friends', count: 1, stage: 'friend' })).toBe(true);
  });

  it('brings an invited townie over within the hour, straight in as a guest', () => {
    const g = pair();
    g.state.time = 14 * 60;
    const [a] = g.state.dwellers;
    g.inviteOver(a.id, TOWNIE_ID_BASE + 1);
    run(g, 80);
    const v = g.dweller(TOWNIE_ID_BASE + 1);
    expect(v?.npc?.role).toBe('guest');
    expect(g.toasts.some((t) => t.text.includes('초대받아'))).toBe(true);
  });

  it('turns down invitations in the middle of the night', () => {
    const g = pair();
    g.state.time = 2 * 60;
    g.inviteOver(g.state.dwellers[0].id, TOWNIE_ID_BASE);
    expect(g.state.invites ?? []).toHaveLength(0);
    expect(g.toasts.some((t) => t.text.includes('자는 중'))).toBe(true);
  });
});

describe('pizza delivery', () => {
  it('brings eight slices to the table within the hour for 25', () => {
    const g = pair();
    g.state.time = 18 * 60;
    const [a] = g.state.dwellers;
    const money = g.state.money;
    g.orderPizza(a.id);
    expect(g.state.money).toBe(money - 25);
    run(g, 120);
    expect(g.servingsLeft()).toBe(8);
    expect(g.state.dwellers.some((s) => s.npc?.delivery)).toBe(false);
  });
});
