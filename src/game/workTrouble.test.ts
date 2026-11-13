import { describe, expect, it } from 'vitest';
import { levelOf } from './careers';
import { Game } from './game';
import { rankOptions } from './autonomy';
import { profileSkills } from './careerSkills';
import { WANT_BY_ID } from './wants';
import { WORKPLACES } from './workplace';
import { hardDayChance, recentWorkFails, troubleChance, workNeed, workSkills, workSkillsShort, workSuccess } from './workTrouble';

describe('hard work (workTrouble.ts, 2026-10-25)', () => {
  it('each rung asks more, and one short of it gets the work wrong more often', () => {
    expect(workNeed(0)).toBeLessThan(workNeed(4));
    expect(workSuccess(2, workNeed(0), 'fine')).toBeGreaterThan(0.8);
    expect(workSuccess(1, workNeed(6), 'fine')).toBeLessThan(0.4);
    expect(workSuccess(5, 5, 'sad')).toBeLessThan(workSuccess(5, 5, 'fine'));
    expect(workSuccess(5, 5, 'focused')).toBeGreaterThan(workSuccess(5, 5, 'fine'));
  });

  it('trouble is likelier out of one’s depth or coasting; a good day likelier when well above the job', () => {
    expect(troubleChance(1, 6, false)).toBeGreaterThan(troubleChance(6, 6, false));
    expect(troubleChance(6, 6, true)).toBeGreaterThan(troubleChance(6, 6, false));
    expect(hardDayChance(0, 6, false, 'fine').hard).toBeGreaterThan(hardDayChance(8, 2, false, 'fine').hard);
    expect(hardDayChance(8, 2, false, 'fine').good).toBeGreaterThan(hardDayChance(0, 6, false, 'fine').good);
  });

  it('a senior with no programming slips at the work, and something goes wrong over a shift', () => {
    let seed = 7;
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => ((seed = (seed * 16807) % 2147483647) / 2147483647));
    g.state.freeWill = false;
    g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
    const dweller = g.state.dwellers[0];
    g.acceptJob(dweller.id, 'tech');
    g.setFollowWork(dweller.id, true);
    dweller.job!.level = 4;
    for (const k of Object.keys(dweller.skills) as Array<keyof typeof dweller.skills>) dweller.skills[k] = 0;
    const lvl = levelOf(dweller.job!);
    let day = Math.floor(g.state.time / 1440) + 1;
    while (!(lvl.days ?? [0, 1, 2, 3, 4]).includes(day % 7)) day++;
    g.state.time = day * 1440 + lvl.start - 61;
    dweller.job!.lastWorkDay = day - 1;
    for (let t = 0; t < 75; t += 0.5) g.step(0.5);
    const work = g.workGames.get(dweller.id)!;
    const me = work.dweller(dweller.id)!;
    const desk = work.state.objects.find((o) => o.defId === 'workstation')!;
    for (let i = 0; i < 8; i++) work.enqueue(me.id, { kind: 'interact', objectUid: desk.uid, interactionId: 'writeCode', autonomous: false });
    for (let t = 0; t < 7 * 60; t += 0.5) g.step(0.5);
    expect(work.log.some((t) => t.text.includes('잘 되지 않았어요'))).toBe(true);
    expect(work.log.some((t) => t.kind === 'bad' && !t.text.includes('잘 되지 않았어요'))).toBe(true);
  });

  it('a piece of work that went wrong counts for nothing on the task list, shows as a failure, and teaches a little (2026-10-26)', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
    g.state.freeWill = false;
    g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
    const dweller = g.state.dwellers[0];
    g.acceptJob(dweller.id, 'tech');
    g.setFollowWork(dweller.id, true);
    dweller.job!.level = 4;
    const lvl = levelOf(dweller.job!);
    let day = Math.floor(g.state.time / 1440) + 1;
    while (!(lvl.days ?? [0, 1, 2, 3, 4]).includes(day % 7)) day++;
    g.state.time = day * 1440 + lvl.start - 61;
    dweller.job!.lastWorkDay = day - 1;
    for (let t = 0; t < 75; t += 0.5) g.step(0.5);
    const work = g.workGames.get(dweller.id)!;
    const me = work.dweller(dweller.id)!;
    me.skills.programming = 1;
    const desk = work.state.objects.find((o) => o.defId === 'workstation')!;
    const task = work.state.workplace!.tasks.find((t) => t.does?.includes('writeCode'))!;
    work.state.workplace!.nextTrouble = 1e9;
    const attempt = (roll: number) => {
      work.rng = () => roll;
      const before = me.skills.programming;
      work.enqueue(me.id, { kind: 'interact', objectUid: desk.uid, interactionId: 'writeCode', autonomous: false });
      for (let t = 0; t < 90 && (me.queue.length || me.run); t += 0.5) g.step(0.5);
      return me.skills.programming - before;
    };
    // A roll past the odds: it goes wrong.
    const failGain = attempt(0.999);
    expect(task.count).toBe(0);
    expect(task.failed).toBe(1);
    expect(work.log.some((t) => t.text.includes('잘 되지 않았어요'))).toBe(true);
    // One that comes off counts, and learnt about three times as much.
    const okGain = attempt(0);
    expect(task.count).toBe(1);
    expect(task.failed).toBe(1);
    expect(failGain).toBeGreaterThan(0);
    expect(failGain / okGain).toBeGreaterThan(0.2);
    expect(failGain / okGain).toBeLessThan(0.45);
    // Remembered by the skill it wanted, and wanted at once (2026-10-26, at the user's request).
    expect(me.workFails?.programming?.n).toBe(1);
    expect(me.wants?.some((w) => w.defId === 'jobSkill_programming')).toBe(true);
    expect(WANT_BY_ID['jobSkill_programming'].set).toBe('career');
  });

  it('what work leans on is the job’s own competencies — the skill judged is the skill trained', () => {
    for (const id of Object.keys(WORKPLACES)) {
      const own = profileSkills(id);
      if (!own) continue;
      for (const k of workSkills(id)) expect(own.has(k), `${id} ${k}`).toBe(true);
    }
    expect(workSkills('tech')).toContain('programming');
  });

  it('short of what the rung needs, or slipped lately: wanted, and practised at home more', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
    g.state.freeWill = false;
    g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
    const dweller = g.state.dwellers[0];
    g.acceptJob(dweller.id, 'tech');
    dweller.job!.level = 4;
    dweller.job!.task = 1; // today's homework done: only the work pull is measured
    dweller.wants = [];
    dweller.skills.programming = 9;
    const at = (id: string) => rankOptions(g, dweller).find((c) => c.action.kind === 'interact' && c.action.interactionId === id)?.score ?? 0;
    expect(workSkillsShort(dweller, g.state.time)).not.toContain('programming');
    const able = at('study');
    dweller.skills.programming = 1;
    expect(workSkillsShort(dweller, g.state.time)).toContain('programming');
    const short = at('study');
    // (Lower skill also changes the score a little; the work pull is the big part.)
    expect(short).toBeGreaterThan(able * 1.3);
    g.refreshWants(dweller.id);
    const offered = () => {
      const seen = new Set<string>();
      for (let i = 0; i < 30; i++) {
        dweller.wants = [];
        g.rng = () => (i % 10) / 10 + 0.05;
        g.refreshWants(dweller.id);
        for (const w of dweller.wants!) seen.add(w.defId);
      }
      return seen;
    };
    expect(offered().has('jobSkill_programming')).toBe(true);
    // A slip lately pulls harder still, and is forgotten after a few days.
    dweller.workFails = { programming: { n: 2, at: g.state.time } };
    expect(at('study')).toBeGreaterThan(short * 1.2);
    expect(recentWorkFails(dweller, g.state.time + 4 * 1440)).toEqual([]);
  });
});
