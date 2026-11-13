import { describe, expect, it } from 'vitest';
import { CATALOG, getDef } from './catalog';
import { objectSummary } from './buyCategories';
import { LEARN, SKILL_GROUPS, SKILL_LEVEL_NAMES } from './constants';
import { Game } from './game';
import type { Job, PlacedObject, Dweller, SkillKey } from './types';
import { CAREER_COMPETENCIES, HOME_CAPPED, forDweller, hasRelatedJob, homeCapNote, homePracticeFactor, jobTeaches } from './workGrowth';

function start() {
  const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.3);
  g.state.freeWill = false;
  const dweller = g.state.dwellers[0];
  dweller.job = null;
  return { g, dweller, desk: g.state.objects.find((o) => o.defId === 'studyDesk')! };
}
function practise(g: Game, dweller: Dweller, obj: PlacedObject, id: string, minutes = 60) {
  g.enqueue(dweller.id, { kind: 'interact', objectUid: obj.uid, interactionId: id, autonomous: false });
  for (let t = 0; t < minutes; t += 0.5) {
    for (const k of Object.keys(dweller.needs) as (keyof Dweller['needs'])[]) dweller.needs[k] = 100;
    g.step(0.5);
  }
}
const job = (careerId: string, branch?: number) => ({ careerId, level: 5, branch } as unknown as Job);

describe('the skill groups', () => {
  it('cooking, gardening, fishing, photography and painting are hobbies now, and nothing fell out', () => {
    const [, , field, hobby] = SKILL_GROUPS;
    for (const k of ['cooking', 'gardening', 'fishing', 'photography', 'painting'] as SkillKey[]) {
      expect(field.keys).not.toContain(k);
      expect(hobby.keys).toContain(k);
      expect(CAREER_COMPETENCIES.has(k)).toBe(false);
    }
    const all = SKILL_GROUPS.flatMap((g) => g.keys);
    expect(new Set(all).size).toBe(all.length);
  });

  it('what is capped at home: the fields, handiness and coding, not the other common ones', () => {
    for (const k of ['medicine', 'science', 'law', 'business', 'language', 'driving', 'handiness', 'rocketScience', 'programming'] as SkillKey[]) expect(HOME_CAPPED.has(k), k).toBe(true);
    for (const k of ['charisma', 'writing', 'logic', 'empathy', 'leadership', 'fitness'] as SkillKey[]) expect(HOME_CAPPED.has(k), k).toBe(false);
  });

  it('every level has its meaning', () => {
    expect(SKILL_LEVEL_NAMES.length).toBe(11);
    expect([0, 2, 3, 6, 7, 10].map((l) => SKILL_LEVEL_NAMES[l])).toEqual(['없음', '기초', '실무 입문', '숙련', '전문가', '대가']);
  });
});

describe('homePracticeFactor', () => {
  it('a career competency stops at 2 with no related job, and goes on with the old slowdown with one', () => {
    expect(homePracticeFactor('medicine', 1)).toBe(1);
    expect(homePracticeFactor('medicine', 2)).toBe(0);
    expect(homePracticeFactor('medicine', 7)).toBe(0);
    expect(homePracticeFactor('programming', 2)).toBe(0);
    expect(homePracticeFactor('handiness', 2)).toBe(0);
    expect(homePracticeFactor('medicine', 2, true)).toBe(1);
    expect(homePracticeFactor('medicine', 6, true)).toBe(0.5);
    expect(homePracticeFactor('programming', 8, true)).toBe(0.3);
  });

  it('other common competencies are not capped and slow as they did', () => {
    expect(homePracticeFactor('logic', 2)).toBe(1);
    expect(homePracticeFactor('charisma', 5)).toBe(1);
    expect(homePracticeFactor('charisma', 6)).toBe(0.5);
    expect(homePracticeFactor('fitness', 8)).toBe(0.3);
  });

  it('a hobby slows with no related job: x0.7 from 4, x0.5 from 6, x0.3 from 8; not with one', () => {
    expect([3, 4, 5, 6, 7, 8, 10].map((l) => homePracticeFactor('guitar', l))).toEqual([1, 0.7, 0.7, 0.5, 0.5, 0.3, 0.3]);
    expect(homePracticeFactor('cooking', 8)).toBe(0.3);
    expect(homePracticeFactor('cooking', 9, true)).toBe(1);
  });

  it('the mind is as it was', () => {
    expect(homePracticeFactor('persistence', 9)).toBe(1);
  });
});

describe('a related job', () => {
  it("is the career's main, base, or its branch's own or top skill", () => {
    // Astronaut: science, fitness; branches rocketScience, and driving that leads to leadership.
    expect(jobTeaches(job('astronaut'), 'science')).toBe(true);
    expect(jobTeaches(job('astronaut'), 'fitness')).toBe(true);
    expect(jobTeaches(job('astronaut'), 'law')).toBe(false);
    expect(jobTeaches(job('astronaut', 0), 'rocketScience')).toBe(true);
    expect(jobTeaches(job('astronaut', 0), 'driving')).toBe(false);
    expect(jobTeaches(job('astronaut', 1), 'driving')).toBe(true);
    expect(jobTeaches(job('astronaut', 1), 'leadership')).toBe(true);
    // Before a branch is chosen, either may be where they're heading.
    expect(jobTeaches(job('astronaut'), 'rocketScience')).toBe(true);
  });

  it("a teen's part-time job counts; school isn't a job", () => {
    expect(hasRelatedJob({ job: null, partTime: job('astronaut') }, 'science')).toBe(true);
    expect(hasRelatedJob({ job: job('highSchool'), partTime: null }, 'science')).toBe(false);
  });
});

describe('home practice in the game', () => {
  it('with no related job, level 2 is as far as it goes: above stays, no further', () => {
    const { g, dweller, desk } = start();
    dweller.skills.medicine = 2;
    practise(g, dweller, desk, 'studyMedicine');
    expect(dweller.skills.medicine).toBe(2);
    dweller.skills.medicine = 4.5;
    practise(g, dweller, desk, 'studyMedicine');
    expect(dweller.skills.medicine).toBe(4.5);
  });

  it('below 2 it grows, teen and all the same', () => {
    const { g, dweller, desk } = start();
    dweller.age = 'teen';
    dweller.skills.law = 1;
    practise(g, dweller, desk, 'readCaseBook');
    expect(dweller.skills.law).toBeGreaterThan(1);
    dweller.skills.law = 2;
    practise(g, dweller, desk, 'readCaseBook');
    expect(dweller.skills.law).toBe(2);
  });

  it('with the job it goes on past 2, and faster than without', () => {
    const { g, dweller, desk } = start();
    dweller.job = job('astronaut');
    g.state.time += 12 * 60; // Evening: home from the shift, so what's gained is the desk's.
    dweller.skills.science = 2;
    practise(g, dweller, desk, 'studyScience');
    expect(dweller.skills.science).toBeGreaterThan(2);
    // What goes into the skill per minute, the same level for both (a job's shift may take them off before the hour's up).
    const gained = (withJob: boolean) => {
      const a = start();
      if (withJob) a.dweller.job = job('astronaut');
      a.g.state.time += 12 * 60;
      a.dweller.skills.science = 1;
      const rec = a.g as unknown as { gainSkill(s: Dweller, k: SkillKey, n: number, r?: boolean): void };
      const real = rec.gainSkill.bind(a.g);
      let top = 0;
      rec.gainSkill = (s, k, n, r) => {
        if (k === 'science') top = Math.max(top, n);
        real(s, k, n, r);
      };
      practise(a.g, a.dweller, a.desk, 'studyScience', 20);
      expect(a.dweller.away).toBeNull();
      return top;
    };
    expect(gained(true)).toBeGreaterThan(gained(false));
  });

  it('a chore is not home practice', () => {
    const { g, dweller } = start();
    dweller.skills.handiness = 4;
    const pc = g.state.objects.find((o) => o.defId === 'computer')!;
    pc.wear = 100;
    expect(getDef('computer').interactions.find((i) => i.id === 'repair')!.skill!.rate).toBe(LEARN.chore);
    expect(homeCapNote(dweller, 'handiness')).toBeTruthy();
    const opt = g.objectMenu(dweller, pc).find((m) => m.id === 'repair');
    expect(opt?.note).toBeUndefined();
  });

  it('a venue and a shift are not home practice', () => {
    const { g, dweller } = start();
    dweller.skills.language = 5;
    (g as unknown as { gainSkill(s: Dweller, k: SkillKey, a: number): void }).gainSkill(dweller, 'language', 1);
    expect(dweller.skills.language).toBeGreaterThan(5);
  });
});

describe('the menu', () => {
  it('shows the name and rate for who is asking', () => {
    const { g, dweller, desk } = start();
    const label = () => g.objectMenu(dweller, desk).find((m) => m.id === 'studyMedicine')!.label;
    expect(label()).toBe('의학 상식 읽기');
    dweller.job = job('doctor');
    expect(label()).toBe('임상 사례 공부하기');
    const inter = getDef('studyDesk').interactions.find((i) => i.id === 'studyMedicine')!;
    expect(forDweller(inter, dweller).rate).toBeGreaterThan(forDweller(inter, { job: null }).rate!);
  });

  it('every job-education action has a higher rate with the job', () => {
    const asked: Array<[string, string[]]> = [
      ['studyDesk', ['studyMedicine', 'studyScience', 'studyLaw', 'studyBusiness', 'studyLeadership', 'studyLanguage', 'readCaseBook', 'roadRulesBook']],
      ['anatomyModel', ['learnAnatomy', 'firstAidPractice']],
      ['microscope', ['research', 'analyze']],
      ['chemistrySet', ['runExperiment']],
      ['drivingSim', ['drivePractice']],
      ['businessBoardGame', ['playTycoon']],
      ['homeToolBench', ['benchFile', 'benchFix']],
      ['computer', ['study', 'tutorial']],
      ['gamingComputer', ['study', 'tutorial']],
    ];
    for (const [def, ids] of asked) {
      for (const id of ids) {
        const i = getDef(def).interactions.find((x) => x.id === id)!;
        expect(i.withJob, `${def} ${id}`).toBeDefined();
        expect(i.withJob!.label).not.toBe(i.label);
        expect(i.withJob!.rate).toBeGreaterThan(i.skill!.rate);
      }
    }
  });

  it('at the cap it can still be done, and says more needs a job', () => {
    const { g, dweller, desk } = start();
    dweller.skills.medicine = 2;
    const opt = g.objectMenu(dweller, desk).find((m) => m.id === 'studyMedicine')!;
    expect(opt.disabled).toBeUndefined();
    expect(opt.note).toMatch(/직업/);
    dweller.job = job('doctor');
    expect(g.objectMenu(dweller, desk).find((m) => m.id === 'studyMedicine')!.note).toBeUndefined();
  });

  it('level-3 features keep their thresholds', () => {
    expect(getDef('computer').interactions.find((i) => i.id === 'translateGig')!.minSkill).toEqual(['language', 3]);
  });
});

describe('new things for the house', () => {
  it('the tool bench is for sale, and teaches handiness', () => {
    const def = CATALOG.find((d) => d.id === 'homeToolBench')!;
    expect(def.unlisted).toBeFalsy();
    expect(def.price).toBeGreaterThan(100);
    expect(objectSummary(def).skills).toEqual(['handiness']);
  });

  it("a changing screen teaches no handiness at home; at a spa it's still the work it was", () => {
    expect(getDef('home_estChangingScreen').interactions.every((i) => !i.skill)).toBe(true);
    expect(objectSummary(getDef('home_estChangingScreen')).skills).toEqual([]);
    expect(getDef('estChangingScreen').interactions.find((i) => i.id === 'estFoldGowns')!.skill?.key).toBe('handiness');
  });

  it('a save with no new fields loads and plays as it did', () => {
    const { g, dweller, desk } = start();
    const again = JSON.parse(JSON.stringify(g.state));
    expect(again.dwellers[0].skills.medicine).toBe(dweller.skills.medicine);
    expect(g.objectMenu(dweller, desk).length).toBeGreaterThan(0);
  });
});
