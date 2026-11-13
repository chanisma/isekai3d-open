import { describe, expect, it } from 'vitest';
import { CAREERS, levelsOf } from './careers';
import { SKILL_PROFILES, jobSkill, profileSkills } from './careerSkills';
import { TRAIT_TYPES, leaningsOf } from './careerTypes';
import { CATALOG } from './catalog';
import { TRAIT_BY_ID } from './traits';
import { CHILD_SKILLS, SKILL_GROUPS, SKILL_HOWTO, TODDLER_SKILLS } from './constants';
import { VENUES } from './venues';
import type { SkillKey } from './types';

/** Skills a dweller can train at home or around town without a job (buyable objects, venues, talking to people). */
function trainableAtHome(): Set<SkillKey> {
  const set = new Set<SkillKey>();
  for (const d of CATALOG) if (!d.unlisted) for (const i of d.interactions) if (i.skill && i.requires !== 'atWork' && i.requires !== 'workAlarm') set.add(i.skill.key);
  for (const v of VENUES) if (v.skill) set.add(v.skill.key);
  // Socialising trains these (game.ts: every social, jokes, mischief, caring talk, hosting).
  for (const k of ['charisma', 'comedy', 'mischief', 'empathy', 'leadership'] as SkillKey[]) set.add(k);
  return set;
}

describe('competency profiles (ours, careerSkills.ts)', () => {
  const jobs = CAREERS.filter((c) => !c.school && !c.partTime);

  it('every grown-up career has one, built from grown-up skills a dweller can train without the job', () => {
    const home = trainableAtHome();
    for (const c of jobs) {
      const p = SKILL_PROFILES[c.id];
      expect(p, c.id).toBeTruthy();
      expect(c.skill).toBe(p.main);
      for (const k of profileSkills(c.id)!) {
        expect(CHILD_SKILLS.has(k) || TODDLER_SKILLS.has(k), `${c.id} ${k}`).toBe(false);
        expect(home.has(k), `${c.id}: ${k} can be trained at home`).toBe(true);
        expect(SKILL_HOWTO[k], `${k} has a how-to`).toBeTruthy();
        expect(SKILL_GROUPS.some((g) => g.keys.includes(k)), `${k} is in a group`).toBe(true);
      }
    }
  });

  it('asks for more competencies, at higher levels, the further up the ladder', () => {
    for (const c of jobs) {
      for (const b of c.branches!.keys()) {
        const ladder = levelsOf(c, b);
        const kinds = ladder.map((l) => (l.needs ?? []).length);
        const main = ladder.map((l) => l.needs?.find(([k]) => k === c.skill)?.[1] ?? 0);
        for (let i = 2; i < ladder.length - 1; i++) {
          expect(kinds[i], `${c.id} rung ${i}`).toBeGreaterThanOrEqual(kinds[i - 1]);
          expect(main[i], `${c.id} rung ${i}`).toBeGreaterThanOrEqual(main[i - 1]);
        }
        // Just below the top: the main competency at its peak, three or more kinds asked for.
        // (A path of a single rung, like 수석교사, has the shared ladder just below its top.)
        if (ladder.length - 2 >= c.levels.length) expect(kinds[ladder.length - 2], c.id).toBeGreaterThanOrEqual(3);
        const p = SKILL_PROFILES[c.id].branches[b];
        if (p.top) expect(ladder[ladder.length - 2].needs!.some(([k]) => k === p.top), `${c.id} ${p.top}`).toBe(true);
      }
    }
  });

  it('counts the work a job does towards what the job is about', () => {
    expect(jobSkill('doctor', 'logic')).toBe('medicine');
    // A surgeon's handiwork stays handiness; before the branch it builds medicine.
    expect(jobSkill('doctor', 'handiness', 0)).toBe('handiness');
    expect(jobSkill('doctor', 'handiness')).toBe('medicine');
    expect(jobSkill('doctor', 'science')).toBe('science');
    expect(jobSkill('busDriver', 'logic')).toBe('driving');
    expect(jobSkill(undefined, 'logic')).toBe('logic');
  });
});

describe('what a dweller is like, for the career explorer', () => {
  it('traits lean towards kinds of work, the most-named first, with the traits behind them', () => {
    expect(leaningsOf(['creative', 'outgoing', 'artLover', 'lazy'])).toEqual([
      { type: 'A', traits: ['creative', 'artLover'] },
      { type: 'S', traits: ['outgoing'] },
      { type: 'E', traits: ['outgoing'] },
    ]);
    expect(leaningsOf(['lazy', 'glutton'])).toEqual([]);
  });
  it('every trait named is a real one', () => {
    for (const id of Object.keys(TRAIT_TYPES)) expect(TRAIT_BY_ID[id], id).toBeDefined();
  });
});
