import { readdirSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { figureLook } from '../game/looks';
import { GARMENT_SETS, setFor } from './garments';
import { parseModel } from './vrm';
import { basicsFor, castOf, everydayGarmentsFor, garmentsFor, garmentsShown, shopBasket } from './vrmLooks';

// The models really in the pack (the sets' files, the characters wearing them).
const roster = readdirSync('models')
  .filter((f) => f.endsWith('.vrm'))
  .map(parseModel)
  .filter((m) => m !== null);
const mina = roster.find((m) => m.file === 'female-adult-mina.vrm')!;
const jiho = roster.find((m) => m.file === 'male-adult-jiho.vrm')!;

describe('garment sets as clothes (garments.ts, 2026-10-25)', () => {
  test('every set to buy has its file in the pack', () => {
    for (const set of GARMENT_SETS) for (const g of ['female', 'male'] as const) if (!set.fit?.gender || set.fit.gender === g) expect(roster.some((m) => m.file === set.file(g, set.fit?.stage ?? 'adult')), `${set.id} ${g}`).toBe(true);
  });

  test('a design either can wear is offered to both; dresses and skirts to women; the robe to no one', () => {
    const hers = new Set(garmentsFor(roster, mina).filter((g) => g.set).map((g) => g.set));
    const his = new Set(garmentsFor(roster, jiho).filter((g) => g.set).map((g) => g.set));
    for (const id of ['tailor', 'meridian', 'city', 'offduty']) {
      expect(hers.has(id), id).toBe(true);
      expect(his.has(id), id).toBe(true);
    }
    for (const id of ['elan', 'nocturne', 'maison', 'aurelia', 'eclipse', 'cozy', 'rue']) {
      expect(hers.has(id), id).toBe(true);
      expect(his.has(id), id).toBe(false);
    }
    expect(hers.has('robe') || his.has('robe')).toBe(false);
    // A dress is one piece and shoes: no bottoms.
    expect(garmentsFor(roster, mina).filter((g) => g.set === 'nocturne').map((g) => g.piece)).toEqual(['tops', 'shoes']);
    // SERAPHINE is no longer sold (2026-10-26, at the user's request).
    expect([...hers].some((id) => id === 'seraphine')).toBe(false);
    expect(roster.some((m) => m.file.includes('seraphine'))).toBe(false);
  });

  test('심 만들기 offers everyone’s own clothes only: the sets are the shop’s (2026-10-26)', () => {
    for (const base of [mina, jiho]) {
      const everyday = everydayGarmentsFor(roster, base);
      expect(everyday.length).toBeGreaterThan(5);
      expect(everyday.some((g) => g.set || /npc_garment/.test(g.from))).toBe(false);
      // …while the shop has them.
      expect(garmentsFor(roster, base).some((g) => g.set)).toBe(true);
    }
  });

  test('the shop sells a set only whole: one piece on buys all of it, an owned piece isn’t bought again (2026-10-26)', () => {
    const all = garmentsFor(roster, mina);
    const rue = all.filter((g) => g.set === 'rue');
    const tee = everydayGarmentsFor(roster, mina).find((g) => g.piece === 'tops')!;
    expect(rue.length).toBe(3);
    // An everyday top with RUE's skirt: the whole of RUE is bought.
    const skirt = rue.find((g) => g.piece === 'bottoms')!;
    expect(shopBasket(all, new Set(), [tee.key, skirt.key]).map((g) => g.key).sort()).toEqual([tee.key, ...rue.map((g) => g.key)].sort());
    // Already owning RUE's shoes: those aren't charged again.
    const shoes = rue.find((g) => g.piece === 'shoes')!;
    expect(shopBasket(all, new Set([shoes.key]), [skirt.key]).map((g) => g.key).sort()).toEqual(rue.filter((g) => g !== shoes).map((g) => g.key).sort());
    // Nothing new on: nothing to buy.
    expect(shopBasket(all, new Set(rue.map((g) => g.key)), rue.map((g) => g.key))).toEqual([]);
  });

  test('the free basics are never a set’s', () => {
    for (const base of [mina, jiho]) for (const g of Object.values(basicsFor(roster, base))) expect(g?.set).toBeUndefined();
  });

  test('a woman in the men’s-cut TAILOR wears its file’s pieces, and is shown in them', () => {
    const tailor = roster.find((m) => m.file === 'male-adult-npc_garment_tailor.vrm')!;
    expect(setFor(tailor, 'female', 'adult')?.id).toBe('tailor');
    const key = 'male-adult-npc_garment_tailor';
    const look = figureLook({ gender: 'female', skin: '#f1d3bd', hair: '#3b2a20', shirt: '#888888', outfit: 'jacket', bottom: 'pants', wear: { tops: key, bottoms: key, shoes: key } });
    const cast = castOf(roster, look, { id: 1, face: 'mina' }, undefined)!;
    expect(cast.dress.tops?.from).toBe(tailor.file);
    expect(cast.dress.bottoms?.from).toBe(tailor.file);
    expect(cast.dress.shoes?.from).toBe(tailor.file);
    // In its own designed colours, not the dweller's shirt and trouser colours.
    expect(cast.dress.tops?.color).toBeUndefined();
    expect(cast.dress.bottoms?.color).toBeUndefined();
    expect(garmentsShown(roster, cast.base, cast.dress)).toEqual({ tops: `tops@${key}`, bottoms: `bottoms@${key}`, shoes: `shoes@${key}` });
  });

  test('nobody wears a set by chance (no lending of a set’s pieces)', () => {
    for (let id = 0; id < 12; id++)
      for (const [face, gender] of [['mina', 'female'], ['jiho', 'male']] as const) {
        const look = figureLook({ gender, skin: '#f1d3bd', hair: '#3b2a20', shirt: '#888888', outfit: 'jacket', bottom: 'skirt' });
        const cast = castOf(roster, look, { id, face }, undefined)!;
        for (const p of ['tops', 'bottoms', 'shoes'] as const) expect(cast.dress[p]?.from ?? '').not.toMatch(/npc_garment/);
      }
  });

  test('a grown-up in the bath wears the robe, barefoot; a child keeps their bath clothes', () => {
    for (const [face, gender, age] of [['mina', 'female', undefined], ['jiho', 'male', 'elder']] as const) {
      const look = figureLook({ gender, age, skin: '#f1d3bd', hair: '#3b2a20', shirt: '#888888' }, 'bathing');
      const cast = castOf(roster, look, { id: 1, face }, 'bathing')!;
      const robe = `${gender}-${age ?? 'adult'}-npc_garment_robe.vrm`;
      expect(cast.dress.tops?.from).toBe(robe);
      expect(cast.dress.bottoms?.from).toBe(robe);
      expect(cast.dress.shoes?.from).toBe(robe);
    }
    const kid = castOf(roster, figureLook({ gender: 'female', age: 'child', skin: '#f1d3bd', hair: '#3b2a20', shirt: '#888888' }, 'bathing'), { id: 1, face: 'mina' }, 'bathing')!;
    expect(kid.dress.tops?.from ?? '').not.toMatch(/robe/);
  });
});
