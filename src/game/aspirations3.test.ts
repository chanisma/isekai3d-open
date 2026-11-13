import { describe, expect, it } from 'vitest';
import { ASPIRATIONS, ASPIRATION_BY_ID, ASP_AREAS, goalMet } from './aspirations';
import { CAREERS } from './careers';
import { CAREER_TYPES, TYPE_ACTIVITIES } from './careerTypes';
import { CATALOG } from './catalog';
import { Game } from './game';
import { SOCIALS } from './socials';
import { VENUES } from './venues';

const two = () =>
  Game.create(
    [
      { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
      { name: '서연', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' },
    ],
    () => 0.5,
  );
type Private = { countActivity(s: unknown, k: string, skill?: string): void; returnFromWork(s: unknown): void };

describe('aspirations as things to do (ours)', () => {
  it('names every aspiration by what one does, in an area, with no 참고 게임 titles', () => {
    for (const a of ASPIRATIONS) {
      if (!a.child) expect(ASP_AREAS[a.area!], a.id).toBeTruthy();
      expect(['탁월한 화가', '마스터 셰프', '보디빌더', '컴퓨터 고수', '세상의 친구', '출세 가도', '부자 되기', '미술 신동', '영재'], a.label).not.toContain(a.label);
      for (const m of a.milestones) expect(m.name, a.id).toBeTruthy();
    }
    expect(ASPIRATIONS.filter((a) => a.area === 'help').length).toBeGreaterThanOrEqual(3);
  });

  it('gives every job a kind of work, and only real things count as each kind', () => {
    for (const c of CAREERS.filter((x) => !x.school)) expect(CAREER_TYPES[c.id]?.length, c.id).toBeGreaterThan(0);
    const ids = new Set<string>([...CATALOG.flatMap((d) => d.interactions.map((i) => i.id)), ...SOCIALS.map((s) => s.id), ...VENUES.map((v) => `outing_${v.id}`), 'hostParty']);
    for (const list of Object.values(TYPE_ACTIVITIES)) for (const id of list) expect(ids.has(id), id).toBe(true);
  });

  it('keeps what was done when the dream changes, and carries on when it comes back', () => {
    const g = two();
    const a = g.state.dwellers[0];
    g.setAspiration(a.id, 'bodybuilder');
    a.aspiration!.counters = { workout: 10 };
    g.checkAspiration(a);
    expect(a.aspiration!.milestone).toBe(1);
    g.setAspiration(a.id, 'readWorld');
    expect(a.aspiration!.milestone).toBe(0);
    expect(a.aspirationLog?.bodybuilder?.milestone).toBe(1);
    g.setAspiration(a.id, 'bodybuilder');
    expect(a.aspiration!.milestone).toBe(1);
    expect(a.aspiration!.counters?.workout).toBe(10);
  });

  it('lets the journey to find oneself see what the dweller enjoys, and suggest it', () => {
    const g = two();
    const a = g.state.dwellers[0];
    const p = g as unknown as Private;
    g.setAspiration(a.id, 'findMyself');
    p.countActivity(a, 'paint', 'painting');
    p.countActivity(a, 'paint', 'painting');
    p.countActivity(a, 'workout', 'fitness');
    p.countActivity(a, 'social_chat');
    g.checkAspiration(a);
    expect(a.aspiration!.milestone).toBe(1);
    a.skills.painting = 3;
    a.skills.curiosity = 2;
    for (const f of ['medical', 'arts', 'it']) g.noteExplore(a.id, f);
    p.countActivity(a, 'triedWork');
    p.countActivity(a, 'fish', 'fishing');
    p.countActivity(a, 'read', 'logic');
    a.skills.persistence = 2;
    g.checkAspiration(a);
    expect(a.aspiration!.milestone).toBe(4);
    expect(a.suggestedArea).toBe('make');
  });

  it('counts days of work by kind of work, and lets a part-time job be a start', () => {
    const g = two();
    const [a, teen] = g.state.dwellers;
    g.setAspiration(a.id, 'workS');
    g.acceptJob(a.id, 'nurse');
    a.away = { until: g.state.time, slot: 'job' } as never;
    a.job!.shiftStart = g.state.time - 600;
    g.state.time += 1;
    (g as unknown as Private).returnFromWork(a);
    expect(a.workDays?.S).toBe(1);
    expect(a.workDays?.I).toBe(1);
    teen.age = 'teen';
    g.acceptJob(teen.id, 'fastFood');
    expect(goalMet(g, teen, { kind: 'job' })).toBe(true);
    expect(goalMet(g, teen, { kind: 'grownUp' })).toBe(false);
  });

  it('keeps up to three jobs of interest', () => {
    const g = two();
    const a = g.state.dwellers[0];
    for (const id of ['doctor', 'teacher', 'culinary', 'pilot']) g.toggleInterestJob(a.id, id);
    expect(a.interestJobs).toEqual(['doctor', 'teacher', 'culinary']);
    g.toggleInterestJob(a.id, 'teacher');
    expect(a.interestJobs).toEqual(['doctor', 'culinary']);
    expect(ASPIRATION_BY_ID.workS.milestones).toHaveLength(4);
  });

  it('gives the area bonus while its aspiration is chosen, and the area reward for life when done', () => {
    const g = two();
    const a = g.state.dwellers[0];
    g.setAspiration(a.id, 'volunteerHeart');
    expect(a.traits).toContain('aspHelper');
    g.setAspiration(a.id, 'bodybuilder');
    expect(a.traits).not.toContain('aspHelper');
    expect(a.traits).toContain('aspVitality');
    a.aspiration!.counters = { workout: 30 };
    a.skills.fitness = 9;
    a.skills.persistence = 2;
    a.skills.selfControl = 4;
    g.checkAspiration(a);
    expect(a.aspiration!.milestone).toBe(4);
    expect(a.traits).toContain('aspSteady');
  });
});
