import { describe, expect, it } from 'vitest';
import { COLLECTION_BY_ID, rollItem } from './collections';
import { Game } from './game';

describe('collections (참고 게임 collection_manager)', () => {
  it('rare finds come less often', () => {
    let s = 7;
    const rng = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
    const counts = { common: 0, uncommon: 0, rare: 0 };
    for (let i = 0; i < 3000; i++) counts[rollItem('crystals', rng).rarity]++;
    expect(counts.common).toBeGreaterThan(counts.uncommon);
    expect(counts.uncommon).toBeGreaterThan(counts.rare);
  });

  it('records each find once and pays out for a finished fish collection', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
    const dweller = g.state.dwellers[0];
    expect(g.collect(dweller, 'fish', 'minnow')).toBe(true);
    expect(g.collect(dweller, 'fish', 'minnow')).toBe(false);
    const money = g.state.money;
    for (const f of COLLECTION_BY_ID.fish.items) g.collect(dweller, 'fish', f.id);
    expect(g.state.money).toBe(money + 500);
    expect(g.toasts.some((t) => t.text.includes('물고기 수집을 완성'))).toBe(true);
  });
});
