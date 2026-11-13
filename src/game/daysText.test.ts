import { describe, expect, it } from 'vitest';
import { CAREER_BY_ID, daysText } from './careers';

// The days a job works, as the job tab shows them (2026-10-26: it said 월–금 for every job).
describe('work days shown', () => {
  it('a run of days, single days, every day', () => {
    expect(daysText()).toBe('월–금');
    expect(daysText([4, 5, 6])).toBe('금–일');
    expect(daysText([2, 3, 4, 5])).toBe('수–토');
    expect(daysText([0, 2, 4])).toBe('월·수·금');
    expect(daysText([5, 6])).toBe('토·일');
    expect(daysText([0, 1, 2, 3, 4, 5, 6])).toBe('매일');
  });
  it('the busking singer: 금–일', () => {
    expect(daysText(CAREER_BY_ID.singer.levels[0].days)).toBe('금–일');
  });
});
