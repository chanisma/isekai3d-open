import { describe, expect, it } from 'vitest';
import { allNeedsBuff, computeEmotion, needBuff, skillGainMultiplier } from './emotions';
import { Game } from './game';

function seeded(seed = 7) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function newGame() {
  return Game.create(
    [
      { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
      { name: '서연', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' },
    ],
    seeded(),
  );
}

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

describe('emotion rules', () => {
  it('is fine with no moodlets', () => {
    expect(computeEmotion([])).toEqual({ emotion: 'fine', weight: 0, intensity: 0 });
  });

  it('picks the heaviest emotion and its intensity', () => {
    const e = computeEmotion([
      { id: 'argued', until: 10 },
      { id: 'awkward', until: 10 },
    ]);
    expect(e).toMatchObject({ emotion: 'angry', weight: 2, intensity: 0 }); // angry 2 beats embarrassed 1
    expect(computeEmotion([{ id: 'argued', until: 10 }, { id: 'peedSelf', until: 10 }]).emotion).toBe('embarrassed');
    expect(computeEmotion([{ id: 'starving', until: null }]).intensity).toBe(1); // 40 ≥ threshold 4
  });

  it('folds Happy moodlets into the strongest other positive emotion', () => {
    const e = computeEmotion([
      { id: 'music', until: 10 },
      { id: 'epicGame', until: 10 },
      { id: 'comedy', until: 10 },
    ]);
    expect(e.emotion).toBe('playful'); // playful 1 + happy 3
    expect(e.weight).toBe(4);
    expect(e.happyAs).toBe('playful');
    expect(computeEmotion([{ id: 'music', until: 10 }]).emotion).toBe('happy'); // alone, Happy stays Happy
  });

  it('keeps the current emotion on a tie', () => {
    const buffs = [
      { id: 'comedy', until: 10 },
      { id: 'stimulatingRead', until: 10 },
    ];
    expect(computeEmotion(buffs, 'playful').emotion).toBe('playful');
    expect(computeEmotion(buffs, 'focused').emotion).toBe('focused');
  });

  it("doesn't switch between emotions at the same intensity step", () => {
    // Sad 3 is intensity 1 (Depressed); Uncomfortable 40 is also intensity 1 → stays Sad.
    const buffs = [
      { id: 'desolate', until: null },
      { id: 'starving', until: null },
    ];
    expect(computeEmotion(buffs, 'sad').emotion).toBe('sad');
    expect(computeEmotion(buffs, 'fine').emotion).toBe('uncomfortable');
  });

  it("maps need bands onto 참고 게임's moodlets", () => {
    expect(needBuff('hunger', 10)).toBe('starving');
    expect(needBuff('hunger', 20)).toBe('hungry');
    expect(needBuff('hunger', 30)).toBe('hungerYellow');
    expect(needBuff('hunger', 40)).toBeNull();
    expect(needBuff('social', 0)).toBe('desolate');
    expect(needBuff('social', 10)).toBe('lonely');
  });

});

describe('moodlets in play', () => {
  it('adds and removes need moodlets as needs change', () => {
    const g = newGame();
    g.state.freeWill = false;
    const dweller = g.state.dwellers[0];
    dweller.needs.hunger = 20;
    g.step(0.5);
    expect(dweller.buffs.map((b) => b.id)).toContain('hungry');
    expect(dweller.emotion).toBe('uncomfortable');
    dweller.needs.hunger = 90;
    g.step(0.5);
    expect(dweller.buffs.map((b) => b.id)).not.toContain('hungry');
    expect(dweller.emotion).not.toBe('uncomfortable'); // eating may also fulfil a hunger want (Happy)
  });

  it('expires timed moodlets', () => {
    const g = newGame();
    g.state.freeWill = false;
    const dweller = g.state.dwellers[0];
    g.addBuff(dweller, 'music');
    expect(dweller.emotion).toBe('happy');
    run(g, 125);
    expect(dweller.buffs.some((b) => b.id === 'music')).toBe(false);
  });

  it('hunger drains slowly once a dweller is hungry, as in 참고 게임', () => {
    const g = newGame();
    g.state.freeWill = false;
    const [a, b] = g.state.dwellers;
    a.needs.hunger = 20; // hungry: ×0.0833
    b.needs.hunger = 80; // fed
    run(g, 60);
    expect(20 - a.needs.hunger).toBeLessThan((80 - b.needs.hunger) / 10);
  });

  it('adds the all-needs-met Happy moodlets', () => {
    const n = { hunger: 50, energy: 50, bladder: 50, hygiene: 80, fun: 80, social: 80 };
    expect(allNeedsBuff(n)).toBe('allNeedsGood');
    expect(allNeedsBuff({ ...n, hygiene: 90, fun: 90, social: 90 })).toBe('allNeedsGreat');
    expect(allNeedsBuff({ ...n, hunger: 30 })).toBeNull();
  });

  it('passes out for 20 minutes when energy runs out', () => {
    const g = newGame();
    g.state.freeWill = false;
    const dweller = g.state.dwellers[0];
    dweller.needs.energy = 0.01;
    g.step(0.5);
    expect(dweller.queue[0]?.kind).toBe('passout');
    run(g, 21);
    expect(dweller.queue[0]?.kind).not.toBe('passout');
    expect(dweller.needs.energy).toBeGreaterThan(6);
  });

  it('a grown-up starves to death (참고 게임 death_Hunger); a child faints instead', () => {
    const g = newGame();
    g.state.freeWill = false;
    const dweller = g.state.dwellers[0];
    dweller.needs.hunger = 0.001;
    g.step(0.5);
    expect(dweller.dying?.cause).toBe('hunger');
    const g2 = newGame();
    g2.state.freeWill = false;
    const kid = g2.state.dwellers[0];
    kid.age = 'child';
    kid.needs.hunger = 0.001;
    g2.step(0.5);
    expect(kid.needs.hunger).toBeGreaterThan(60);
    expect(kid.buffs.some((b) => b.id === 'faintedFromHunger')).toBe(true);
  });

  it('scales skill gain by emotion and intensity', () => {
    expect(skillGainMultiplier({ emotion: 'focused', weight: 1, intensity: 0 }, 'logic')).toBe(1.4);
    expect(skillGainMultiplier({ emotion: 'focused', weight: 9, intensity: 1 }, 'logic')).toBe(1.6);
    expect(skillGainMultiplier({ emotion: 'stressed', weight: 1, intensity: 0 }, 'cooking')).toBe(0.8);
    expect(skillGainMultiplier({ emotion: 'fine', weight: 0, intensity: 0 }, 'charisma')).toBe(1);
  });

  it('an accident leaves the dweller embarrassed and filthy', () => {
    const g = newGame();
    g.state.freeWill = false;
    const dweller = g.state.dwellers[0];
    dweller.needs.bladder = 0.1;
    run(g, 2);
    expect(dweller.buffs.some((b) => b.id === 'peedSelf')).toBe(true);
    expect(dweller.needs.hygiene).toBeLessThan(1);
    expect(dweller.emotion).toBe('embarrassed');
  });

  it('a hug leaves both dwellers with a warm moodlet', () => {
    const g = newGame();
    g.state.freeWill = false;
    const [a, b] = g.state.dwellers;
    g.relationship(a.id, b.id).friend = 60;
    g.enqueue(a.id, { kind: 'social', targetId: b.id, socialId: 'hug', autonomous: false });
    run(g, 20);
    expect(a.buffs.some((x) => x.id === 'warmHug')).toBe(true);
    expect(b.buffs.some((x) => x.id === 'warmHug')).toBe(true);
  });

  it('a focused dweller learns programming faster', () => {
    const g = newGame();
    g.state.freeWill = false;
    const [a, b] = g.state.dwellers;
    const pc = g.state.objects.find((o) => o.defId === 'computer')!;
    // Take out decor so a Happy ambience doesn't boost the comparison run.
    for (const o of g.state.objects.filter((o) => o.defId === 'plant' || o.defId === 'lamp')) g.sell(o.uid);
    for (const s of [a, b]) s.needs = { hunger: 90, energy: 90, bladder: 90, hygiene: 90, fun: 90, social: 90 };
    g.addBuff(a, 'stimulatingRead'); // focused
    g.enqueue(a.id, { kind: 'interact', objectUid: pc.uid, interactionId: 'study', autonomous: false });
    // Thirty minutes at it, once there and before `deepInIt` (45 minutes in) would make the plain run focused too.
    for (let m = 0; m < 30 && !g.performing(a); m++) run(g, 1);
    const focusedFrom = a.skills.programming;
    run(g, 30);
    const focusedGain = a.skills.programming - focusedFrom;
    g.cancel(a.id, a.queue[0].id);
    a.skills.programming = 0;
    a.buffs = [];
    a.emotion = 'fine';
    g.enqueue(a.id, { kind: 'interact', objectUid: pc.uid, interactionId: 'study', autonomous: false });
    for (let m = 0; m < 30 && !g.performing(a); m++) run(g, 1);
    const plainFrom = a.skills.programming;
    run(g, 30);
    // (×1.4 against ×1.2: with every need met the plain run is happy, which helps every skill.)
    expect(focusedGain).toBeGreaterThan((a.skills.programming - plainFrom) * 1.1);
  });

  it('loads saves from before emotions existed', () => {
    const g = newGame();
    const old = JSON.parse(JSON.stringify(g.state));
    for (const s of old.dwellers) {
      delete s.buffs;
      delete s.emotion;
    }
    const loaded = new Game(old);
    expect(loaded.state.dwellers[0].buffs).toEqual([]);
    expect(loaded.state.dwellers[0].emotion).toBe('fine');
  });
});
