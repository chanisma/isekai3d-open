import { describe, expect, it } from 'vitest';
import { rankOptions } from './autonomy';
import { Game } from './game';

function seeded(seed = 42) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function solo() {
  const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], seeded());
  g.state.freeWill = false;
  g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
  return g;
}

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

const obj = (g: Game, defId: string) => g.state.objects.find((o) => o.defId === defId)!;

describe('emotional interactions', () => {
  it('only offers mood interactions to a dweller who feels that way', () => {
    const g = solo();
    const [a] = g.state.dwellers;
    const mirror = obj(g, 'mirror');
    expect(g.objectMenu(a, mirror).some((o) => o.id === 'sillyFace')).toBe(false);
    g.addBuff(a, 'goodJoke');
    g.addBuff(a, 'goodJoke');
    a.buffs.push({ id: 'sillyFace', until: g.state.time + 90 });
    a.emotion = g.emotionOf(a).emotion;
    expect(a.emotion).toBe('playful');
    expect(g.objectMenu(a, mirror).some((o) => o.id === 'sillyFace')).toBe(true);
  });

  it('calming down at the mirror washes anger away', () => {
    const g = solo();
    const [a] = g.state.dwellers;
    g.addBuff(a, 'singed');
    expect(a.emotion).toBe('stressed');
    g.enqueue(a.id, { kind: 'interact', objectUid: obj(g, 'mirror').uid, interactionId: 'calmDown', autonomous: false });
    run(g, 45);
    expect(a.buffs.some((b) => b.id === 'singed')).toBe(false);
    expect(g.toasts.some((t) => t.text.includes('마음을 가라앉혔어요'))).toBe(true);
  });

  it('a flirty dweller reaches for a steamy shower over a plain one', () => {
    const g = solo();
    const [a] = g.state.dwellers;
    a.needs.hygiene = 20;
    g.addBuff(a, 'steamyShower');
    g.addBuff(a, 'gussiedUp');
    expect(a.emotion).toBe('flirty');
    const showers = rankOptions(g, a).filter((c) => c.action.kind === 'interact' && c.action.interactionId.startsWith('shower'));
    expect(showers[0].action.kind === 'interact' && showers[0].action.interactionId).toBe('showerSteamy');
  });
});

describe('bathtub', () => {
  it('a bubble bath gets you clean and playful', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }]);
    g.state.freeWill = false;
    g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
    g.state.money = 5000;
    const [a] = g.state.dwellers;
    expect(g.buy('bathtub', 12, 4, 'down')).toBe(true);
    a.needs.hygiene = 20;
    const tub = g.state.objects.find((o) => o.defId === 'bathtub')!;
    g.enqueue(a.id, { kind: 'interact', objectUid: tub.uid, interactionId: 'bubbleBath', autonomous: false });
    for (let t = 0; t < 70; t += 0.5) g.step(0.5);
    expect(a.needs.hygiene).toBeGreaterThan(90);
    expect(a.buffs.some((b) => b.id === 'bubbles')).toBe(true);
  });
});

describe('dazed', () => {
  it('halves skill gain and a nap shakes it off', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }]);
    g.state.freeWill = false;
    g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
    const [a] = g.state.dwellers;
    g.addBuff(a, 'lostFight');
    expect(a.emotion).toBe('dazed');
    const bed = g.state.objects.find((o) => o.defId === 'bed')!;
    a.needs.energy = 50;
    g.enqueue(a.id, { kind: 'interact', objectUid: bed.uid, interactionId: 'nap', autonomous: false });
    for (let t = 0; t < 110; t += 0.5) g.step(0.5);
    expect(a.buffs.some((b) => b.id === 'lostFight')).toBe(false);
  });
});
