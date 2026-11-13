import { describe, expect, test } from 'vitest';
import { TYPE_ACTIVITIES, WORK_TYPES, type WorkType } from './careerTypes';
import { workTypeGuide } from './workGuide';

describe('kinds of work, spelled out', () => {
  test('every activity, skill and job of each kind has its name', () => {
    for (const type of Object.keys(WORK_TYPES) as WorkType[]) {
      const g = workTypeGuide(type);
      // An activity whose label wasn't found would be missing (two may share one, as cooking at the grill).
      expect(g.activities.length).toBeGreaterThanOrEqual(TYPE_ACTIVITIES[type].length - 2);
      expect(g.skills).toHaveLength(WORK_TYPES[type].skills.length);
      expect(g.jobs.length).toBeGreaterThan(5);
      // Names, not the ids they're looked up by (runExperiment, rocketScience…); a job may be "DJ".
      for (const name of [...g.activities, ...g.skills]) expect(name).toMatch(/[가-힣]/);
      for (const name of g.jobs) expect(name).not.toMatch(/^[a-z]+[A-Z]/);
    }
    expect(workTypeGuide('I').activities).toContain('실험하기');
    expect(workTypeGuide('A').jobs).toContain('화가');
  });
});
