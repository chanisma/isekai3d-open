import { describe, expect, it, vi } from 'vitest';
import { Game } from './game';
import { koreaDay, PLAY_RULES } from '../cloud/playPass';

describe("today's play (the arcade's coins)", () => {
  it('runs time only while there is play left, then stops it', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
    g.setSpeed(2);
    g.playLeft = 30;
    const start = g.state.time;
    for (let i = 0; i < 200; i++) g.update(0.1);
    expect(g.state.time - start).toBeCloseTo(30, 5);
    expect(g.playLeft).toBe(0);
    expect(g.played).toBeCloseTo(30, 5);
    expect(g.state.speed).toBe(0);
    // Unpausing does nothing until another coin.
    g.setSpeed(3);
    g.update(0.1);
    expect(g.state.time - start).toBeCloseTo(30, 5);
  });

  it('lets the night go by free while everyone at home is asleep', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
    expect(g.allAsleep()).toBe(false);
    g.setSpeed(2);
    g.playLeft = 30;
    vi.spyOn(g, 'allAsleep').mockReturnValue(true);
    const start = g.state.time;
    for (let i = 0; i < 50; i++) g.update(0.1);
    expect(g.state.time - start).toBeGreaterThan(20);
    expect(g.playLeft).toBe(30);
    expect(g.played).toBe(0);
  });

  it('has no limit when no pass counts it', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
    g.setSpeed(1);
    const start = g.state.time;
    g.update(0.1);
    expect(g.state.time).toBeGreaterThan(start);
    expect(g.played).toBe(0);
  });

  it('a coin is a game day and the day is Korea’s', () => {
    expect(PLAY_RULES.perCoin).toBe(1440);
    // 2026-10-20 23:30 UTC is already the 21st in Seoul.
    expect(koreaDay(new Date('2026-10-20T23:30:00Z'))).toBe('2026-10-21');
    expect(koreaDay(new Date('2026-10-20T14:59:00Z'))).toBe('2026-10-20');
  });
});
