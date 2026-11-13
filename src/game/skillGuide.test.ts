import { describe, expect, it } from 'vitest';
import { SKILL_GROUPS } from './constants';
import { gameWays, guideGroups, jobsNeeding, skillGuide } from './skillGuide';

// 역량 알아보기 (2026-10-26, at the user's request): every competency explained, with ways to grow it
// in the game and in real life.

describe('skill guide', () => {
  it('every skill a dweller of any age is shown has what it is, where it’s used, three real ways and game ways', () => {
    for (const age of ['toddler', 'child', 'teen', 'adult']) {
      for (const k of guideGroups(age).flatMap((x) => x.keys)) {
        const g = skillGuide(k);
        expect(g, k).toBeTruthy();
        expect(g!.what.length, k).toBeGreaterThan(10);
        expect(g!.life.length, k).toBeGreaterThan(10);
        expect(g!.real, k).toHaveLength(3);
        expect(gameWays(k).ways.length, k).toBeGreaterThan(0);
      }
    }
    // Every grown-up skill group is covered.
    expect(guideGroups('adult').flatMap((x) => x.keys)).toEqual(SKILL_GROUPS.flatMap((x) => x.keys));
  });

  it('game ways split at commas outside brackets, with what it’s good for apart', () => {
    const lead = gameWays('leadership').ways;
    expect(lead[0]).toBe('공부 책상(리더십·조직)');
    const self = gameWays('selfControl');
    expect(self.ways[0]).toContain('(재미 욕구가 다 차기 전에)');
    expect(self.use).toContain('자유 의지');
    expect(gameWays('medicine').use).toContain('응급처치');
  });

  it('jobs that need a skill, 대표 first', () => {
    const jobs = jobsNeeding('medicine');
    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs[0].role).toBe('main');
    expect(jobs.some((j) => j.career.id === 'doctor')).toBe(true);
    expect(jobs.every((j) => !j.career.school && !j.career.partTime)).toBe(true);
  });
});
