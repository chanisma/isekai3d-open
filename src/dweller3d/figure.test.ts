import { describe, expect, it } from 'vitest';
import { BOTTOMS, HAIR_STYLES, OUTFITS, figureLook, hair2d } from '../game/looks';
import { buildFigure, poseFigure } from './figure';

const base = { gender: 'female' as const, age: 'adult', skin: '#eac09a', hair: '#5b3a1e', shirt: '#1e88e5' };

describe('the 3D dweller', () => {
  it('builds every hair style, top and bottom, standing about one unit tall', () => {
    for (const [hairStyle] of HAIR_STYLES)
      for (const [outfit] of OUTFITS)
        for (const [bottom] of BOTTOMS) {
          const f = buildFigure(figureLook({ ...base, hairStyle, outfit, bottom }));
          expect(f.height).toBeGreaterThan(0.9);
          expect(f.height).toBeLessThan(1.25);
          for (const p of ['stand', 'walk', 'sit', 'lie'] as const) poseFigure(f, p, 1, 'smile', 'adult');
          f.dispose();
        }
  });

  it('is shorter the younger the dweller', () => {
    const h = (age: string) => buildFigure(figureLook({ ...base, age })).height;
    expect(h('toddler')).toBeLessThan(h('child'));
    expect(h('child')).toBeLessThan(h('teen'));
    expect(h('teen')).toBeLessThan(h('adult'));
  });

  it('dresses for bed, sport, the bath and a party', () => {
    const look = base;
    expect(figureLook(look, 'sleep')).toMatchObject({ top: 'pajama', shoes: null });
    expect(figureLook(look, 'athletic')).toMatchObject({ top: 'sport', bottom: 'shorts' });
    expect(figureLook(look, 'bathing')).toMatchObject({ top: 'bare', bottom: 'towel' });
    expect(figureLook(look, 'formal')).toMatchObject({ top: 'suit' });
    expect(figureLook({ ...look, outfit: 'dress' }, 'formal')).toMatchObject({ top: 'dress' });
  });

  it('shows the newer hair styles in 2D as the nearest of the first five', () => {
    expect(hair2d('ponytail')).toBe('long');
    expect(hair2d('bob')).toBe('short');
    expect(hair2d('curly')).toBe('curly');
    expect(hair2d(undefined)).toBe('short');
  });
});
