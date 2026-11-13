import { describe, expect, it } from 'vitest';
import { Game } from './game';
import { figureLook } from './looks';
import { printPlacement, type ShirtPrint } from './shirtPrint';
import { dressFor } from '../view3d/vrmLooks';
import { parseModel } from '../view3d/vrm';

const print: ShirtPrint = { image: 'data:image/png;base64,AA==', side: 'back', x: 0.1, y: -0.1, scale: 0.7, rotation: 15 };
const spec = { name: '테스트', shirt: '#212121', skin: '#f8d9c0', hair: '#2b1b10', shirtPrint: print };

describe('custom shirt prints', () => {
  it('survives character creation, serialization, restyling and removal', () => {
    const game = Game.create([spec], () => 0.5);
    const dweller = game.state.dwellers[0];
    expect(dweller.shirtPrint).toEqual(print);
    expect(JSON.parse(JSON.stringify(game.state)).dwellers[0].shirtPrint).toEqual(print);
    game.restyle(dweller.id, { shirtPrint: { ...print, side: 'front' } });
    expect(dweller.shirtPrint?.side).toBe('front');
    game.restyle(dweller.id, { shirtPrint: undefined });
    expect(dweller.shirtPrint).toBeUndefined();
  });
  it('keeps the design but hides it during situational outfit changes', () => {
    for (const changed of ['sleep', 'athletic', 'bathing', 'formal'] as const) {
      expect(figureLook(spec, changed).shirtPrint).toBeUndefined();
    }
    expect(figureLook(spec).shirtPrint).toEqual(print);
  });
  it('prints only on an actual tee, including a borrowed tee', () => {
    const tee = parseModel('male-adult-woojin.vrm')!;
    const shirt = parseModel('male-adult-jiho.vrm')!;
    const all = [tee, shirt];
    const look = figureLook({ ...spec, gender: 'male', outfit: 'tee' });
    expect(dressFor(all, tee, look, undefined, 0).dress.shirtPrint).toEqual(print);
    expect(dressFor(all, shirt, look, undefined, 0).dress.shirtPrint).toEqual(print);
    expect(dressFor(all, shirt, { ...look, top: 'shirt' }, undefined, 0).dress.shirtPrint).toBeUndefined();
    expect(dressFor(all, tee, look, 'sleep', 0).dress.shirtPrint).toBeUndefined();
  });
  it('bounds corrupt placement values', () => {
    expect(printPlacement({ ...print, x: Infinity, y: -99, scale: 100, rotation: NaN }))
      .toEqual({ x: 0, y: -0.3, scale: 0.9, rotation: 0 });
  });
});
