import { describe, expect, it } from 'vitest';
import { SKILL_PROFILES, profileSkills } from './careerSkills';
import { CAREER_WHY, SKILL_WHY, TOP_WHY, whyFor } from './careerWhy';

describe('why each job asks for its competencies (ours)', () => {
  it('gives every career a reason for each of its competencies', () => {
    expect(Object.keys(CAREER_WHY).sort()).toEqual(Object.keys(SKILL_PROFILES).sort());
    for (const [id, why] of Object.entries(CAREER_WHY)) {
      for (const s of [why.main, why.base, ...why.branches]) {
        expect(s.length, id).toBeGreaterThan(10);
        expect(s.endsWith('.'), `${id}: ${s}`).toBe(true);
      }
      for (const k of profileSkills(id)!) expect(whyFor(id, k), `${id} ${k}`).toBeTruthy();
    }
  });

  it('uses the job’s own reason first and the general one for anything else', () => {
    const p = SKILL_PROFILES.doctor;
    expect(whyFor('doctor', p.main)).toBe(CAREER_WHY.doctor.main);
    expect(whyFor('doctor', p.branches[1].skill)).toBe(CAREER_WHY.doctor.branches[1]);
    expect(whyFor('doctor', 'leadership')).toBe(TOP_WHY.leadership);
    expect(whyFor('doctor', 'fishing')).toBe(SKILL_WHY.fishing);
  });
});
