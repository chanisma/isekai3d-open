import { describe, expect, it } from 'vitest';
import { Game } from './game';
import { BOY_NAMES, GIRL_NAMES, babyCarrier, canCarry, canSire, guessGender, kinWord } from './gender';
import { CAST, ageNeighbourhood, settleNeighbourhood } from './neighbourhood';
import type { Dweller } from './types';

const seeded = (seed = 3) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const couple = (a: 'female' | 'male', b: 'female' | 'male') =>
  Game.create(
    [
      { name: 'A', gender: a, shirt: '#000', skin: '#fff', hair: '#000' },
      { name: 'B', gender: b, shirt: '#000', skin: '#fff', hair: '#000' },
    ],
    seeded(),
  );
type Private = { tryForBaby(a: Dweller, b: Dweller): void };

describe('gender, after 참고 게임 Create a Dweller', () => {
  it('lets a woman carry and a man father a baby by default, whoever asks', () => {
    for (const [asker, asked] of [['male', 'female'], ['female', 'male']] as const) {
      const g = couple(asker, asked);
      const [a, b] = g.state.dwellers;
      for (let i = 0; i < 40 && !a.pregnancy && !b.pregnancy; i++) (g as unknown as Private).tryForBaby(a, b);
      expect((asker === 'female' ? a : b).pregnancy).toBeTruthy();
      expect((asker === 'female' ? b : a).pregnancy).toBeFalsy();
    }
  });

  it('keeps 참고 게임’s pregnancy settings at their defaults: a woman carries, a man fathers, an elder neither', () => {
    const g = couple('female', 'female');
    const [a, b] = g.state.dwellers;
    (g as unknown as Private).tryForBaby(a, b);
    expect(a.pregnancy ?? b.pregnancy).toBeUndefined();
    expect(g.toasts.at(-1)!.text).toContain('입양');
    type Who = { gender: 'female' | 'male'; age?: string };
    const man: Who = { gender: 'male' };
    const woman: Who = { gender: 'female' };
    expect(babyCarrier(man, woman)).toBe(woman);
    expect(canSire(man) && !canCarry(man) && canCarry(woman) && !canSire(woman)).toBe(true);
    // Grown old, neither.
    expect(canCarry({ ...woman, age: 'elder' }) || canSire({ ...man, age: 'elder' })).toBe(false);
    expect(babyCarrier({ ...man, age: 'elder' }, woman)).toBeNull();
    // A save from when the settings could be changed goes back to the defaults.
    const old = JSON.parse(JSON.stringify(g.state));
    old.dwellers[0].canSire = true;
    expect(new Game(old).state.dwellers[0]).not.toHaveProperty('canSire');
  });

  it('gives babies a gender and a name to go with it', () => {
    const g = couple('male', 'female');
    const kid = (g as unknown as { newbornGender(): { gender: string; name: string } }).newbornGender();
    expect((kid.gender === 'female' ? GIRL_NAMES : BOY_NAMES)).toContain(kid.name);
  });

  it('calls family by the right words', () => {
    const mom = { gender: 'female' as const, bornAt: 0 };
    const girl = { gender: 'female' as const, bornAt: 100 };
    const boy = { gender: 'male' as const, bornAt: 200 };
    expect(kinWord('부모', girl, mom)).toBe('엄마');
    expect(kinWord('자녀', mom, boy)).toBe('아들');
    expect(kinWord('형제자매', boy, girl)).toBe('누나');
    expect(kinWord('형제자매', girl, boy)).toBe('남동생');
  });

  it('guesses a gender for old saves, and gives the neighbours ones that fit their roles', () => {
    expect(guessGender('서연')).toBe('female');
    expect(guessGender('민준')).toBe('male');
    expect(guessGender('별이', 'dress')).toBe('female');
    for (const m of CAST) {
      if (/엄마|딸|할머니/.test(m.role ?? '')) expect(m.gender, m.name).toBe('female');
      if (/아빠|아들|손자/.test(m.role ?? '')) expect(m.gender, m.name).toBe('male');
    }
    const t = settleNeighbourhood(undefined, seeded(), 107);
    let id = 400;
    for (let d = 1; d < 400; d++) ageNeighbourhood(t, d * 60, 'normal', seeded(d), () => id++, new Set());
    for (const x of t) {
      expect(x.gender, x.name).toBeTruthy();
      expect((x.gender === 'female' ? GIRL_NAMES : BOY_NAMES).includes(x.name) || CAST.some((m) => m.name === x.name), x.name).toBe(true);
    }
  });
});
