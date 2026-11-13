import { describe, expect, it } from 'vitest';
import { Game } from './game';
import { TIPS, currentTip, type TipCtx } from './tips';

const game = () => Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
const ctx = (g: Game, over: Partial<TipCtx> = {}): TipCtx => ({ game: g, tab: 'needs', mode: 'live', present: () => true, ...over });
const upTo = (id: string) => TIPS.slice(0, TIPS.findIndex((t) => t.id === id)).map((t) => t.id);

describe('the guide for a first game (after 참고 게임 tutorial tips)', () => {
  it('goes in order, each tip waiting for the ones it needs', () => {
    const g = game();
    expect(currentTip([], ctx(g))?.id).toBe('welcome');
    expect(currentTip(['welcome'], ctx(g))?.id).toBe('portraits');
    expect(new Set(TIPS.map((t) => t.id)).size).toBe(TIPS.length);
    for (const t of TIPS) for (const r of t.requires ?? []) expect(TIPS.some((x) => x.id === r), `${t.id} needs ${r}`).toBe(true);
  });

  it('waits for the part of the screen a tip points at, without holding up the others', () => {
    const g = game();
    const done = upTo('queue');
    expect(currentTip(done, ctx(g, { present: (s) => s !== '.queue' }))?.id).toBe('mood');
    expect(currentTip(done, ctx(g))?.id).toBe('queue');
  });

  it('is done by doing it', () => {
    const g = game();
    const tip = TIPS.find((t) => t.id === 'speed')!;
    g.setSpeed(1);
    expect(tip.done!(ctx(g))).toBe(false);
    g.setSpeed(3);
    expect(tip.done!(ctx(g))).toBe(true);
    expect(TIPS.find((t) => t.id === 'tabs')!.done!(ctx(g, { tab: 'asp' }))).toBe(true);
  });

  it('passes over tips that make no sense for the dweller, like finding a job as a child', () => {
    const g = game();
    g.activeDweller.age = 'child';
    const done = upTo('explore');
    expect(currentTip(done, ctx(g))?.id).toBe('buy');
  });

  it('can be turned off, and on again from the start once seen through', () => {
    const g = game();
    g.state.tips = { on: true, done: TIPS.map((t) => t.id) };
    g.setGuide(false);
    expect(g.state.tips.on).toBe(false);
    g.setGuide(true);
    expect(g.state.tips.done).toEqual([]);
    g.tipDone('welcome');
    expect(g.state.tips.done).toEqual(['welcome']);
  });
});
