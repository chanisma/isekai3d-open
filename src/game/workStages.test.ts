import { describe, expect, it } from 'vitest';
import { CAREER_BY_ID } from './careers';
import { getDef } from './catalog';
import { Game } from './game';
import { WORKPLACES, dailyTasks, type WorkTask } from './workplace';
import { HEAR_REPORT, PRACTICE_FROM, actionId, gateOf, stageActions, stageLock, stageLots, stageOf, type StageAt , hasRungStages } from './workStages';

/** The day's tasks at a stage over many draws of the extra. */
const days = (careerId: string, at: StageAt, n = 24): WorkTask[][] => Array.from({ length: n }, (_, i) => dailyTasks(WORKPLACES[careerId], () => (i + 0.5) / n, at));
const does = (ts: WorkTask[]) => ts.flatMap((t) => t.does ?? []);

describe('work that follows the stage of the job (ours)', () => {
  it('places a job at 입문, 실무, 전문 or 리더 by its rung', () => {
    const c = CAREER_BY_ID.tech;
    const s = c.levels.length;
    const n = s + c.branches![0].levels.length;
    expect(stageOf({ careerId: 'tech', level: 0 }).stage).toBe(0);
    expect(stageOf({ careerId: 'tech', level: Math.ceil(s / 2) - 1 }).stage).toBe(0);
    expect(stageOf({ careerId: 'tech', level: s, branch: 1 })).toEqual({ stage: 1, branch: 1 });
    expect(stageOf({ careerId: 'tech', level: n - 2, branch: 0 })).toEqual({ stage: 2, branch: 0 });
    expect(stageOf(null).stage).toBe(0);
  });

  it('a part-time job reaches 리더 on its top rung (it never did on three rungs)', () => {
    for (const id of ['barista', 'fastFood', 'retail', 'babysitter', 'manualLabor']) {
      expect(CAREER_BY_ID[id].levels.length, id).toBe(3);
      expect([0, 1, 2].map((level) => stageOf({ careerId: id, level }).stage), id).toEqual([0, 1, 2]);
      const lead = stageActions(id).find((a) => a.stage === 'lead')!;
      const at = stageOf({ careerId: id, level: 2 });
      expect(stageLock({ career: id, ...gateOf(lead) }, at), id).toBeNull();
      expect(days(id, at, 1)[0].some((t) => t.id === `stage_${lead.key}`), id).toBe(true);
    }
  });

  it('the back half of a long shared ladder is 실무: its own work, no branch’s yet', () => {
    // 인턴 is 입문; a resident, with a specialty, is 전공의 수련, still no specialist's work.
    expect(stageOf({ careerId: 'doctor', level: 1 })).toEqual({ stage: 0 });
    expect(stageOf({ careerId: 'doctor', level: 2, branch: 0 })).toEqual({ stage: 1 });
    expect(stageOf({ careerId: 'doctor', level: 3, branch: 0 })).toEqual({ stage: 1 });
    const at = stageOf({ careerId: 'doctor', level: 3, branch: 0 });
    const ward = stageActions('doctor').find((a) => a.stage === 'common')!;
    const junior = stageActions('doctor').find((a) => a.stage === 'junior')!;
    const branch = stageActions('doctor').find((a) => a.stage === 'branch0')!;
    expect(days('doctor', at, 1)[0].map((t) => t.id)).toContain(`stage_${ward.key}`);
    expect(days('doctor', at, 1)[0].map((t) => t.id)).not.toContain(`stage_${junior.key}`);
    expect(stageLock({ career: 'doctor', ...gateOf(ward) }, at)).toBeNull();
    // (The doctor's junior work stays open as the senior's version, workRoles.ts; other careers' is locked.)
    expect(stageLock({ career: 'doctor', ...gateOf(junior) }, at)).toBeNull();
    expect(stageLock({ career: 'nurse', stage: 0 }, at)).toContain('입문');
    expect(stageLock({ career: 'doctor', ...gateOf(branch) }, at)).toContain('갈래');
    // A short shared ladder stays 입문 to the branch.
    const actor = CAREER_BY_ID.actor;
    expect(actor.levels.length).toBeLessThan(PRACTICE_FROM);
    expect(stageOf({ careerId: 'actor', level: actor.levels.length - 1 }).stage).toBe(0);
  });

  it('gives every workplace work for each stage, on stations it has', () => {
    for (const [id, def] of Object.entries(WORKPLACES)) {
      const c = CAREER_BY_ID[id];
      const acts = stageActions(id);
      const stages = acts.map((a) => a.stage);
      const branched = !!c?.branches?.length;
      expect(stages.filter((s) => s === 'junior').length, id).toBe(1);
      expect(stages.includes('branch0'), id).toBe(true);
      expect(stages.includes('branch1'), id).toBe(branched);
      // 실무 exactly where the shared ladder is long enough to have it.
      if (!hasRungStages(id)) expect(stages.includes('common'), id).toBe(branched && c.levels.length >= PRACTICE_FROM);
      // A leader for each branch: the career's, or each branch's own.
      expect(stages.includes('lead') || (stages.includes('lead0') && stages.includes('lead1')), id).toBe(true);
      expect(new Set(stages).size, id).toBe(stages.length);
      for (const a of acts) {
        // On each lot it's done at (a branch working elsewhere at its own).
        for (const lot of stageLots(def, a.stage)) {
          expect(lot.objects.some((o) => o.defId === a.station), `${id} ${a.station}`).toBe(true);
          expect(lot.work, id).toContain(actionId(a));
        }
        expect(getDef(a.station).interactions.some((i) => i.id === actionId(a)), actionId(a)).toBe(true);
      }
    }
  });

  it('adds the stage’s work to the day and locks what comes later', () => {
    const junior = Game.workplaceTour('doctor', () => 0.3, { stage: 0 });
    const lead = Game.workplaceTour('doctor', () => 0.3, { stage: 2, branch: 1 });
    const kinds = (g: Game) => g.state.workplace!.tasks.map((t) => t.kind);
    expect(kinds(junior)).toContain('learn');
    expect(kinds(junior)).not.toContain('lead');
    expect(kinds(lead)).toContain('lead');
    expect(lead.state.workplace!.tasks.some((t) => t.id === `stage_${stageActions('doctor').find((a) => a.stage === 'branch1')!.key}`)).toBe(true);
    // The leader's action is on the menu for a new hire, but locked.
    const leadAct = stageActions('doctor').find((a) => a.stage === 'lead')!;
    const obj = junior.state.objects.find((o) => o.defId === leadAct.station)!;
    const worker = junior.dweller(junior.state.workplace!.workerId)!;
    const opt = junior.objectMenu(worker, obj).find((o) => o.id === actionId(leadAct));
    expect(opt?.disabled).toContain('과장·병원장');
    const leader = lead.dweller(lead.state.workplace!.workerId)!;
    const obj2 = lead.state.objects.find((o) => o.defId === leadAct.station)!;
    expect(lead.objectMenu(leader, obj2).find((o) => o.id === actionId(leadAct))?.disabled).toBeUndefined();
  });

  it('a branch’s leader leads its own way (특공대 isn’t a 수사 회의)', () => {
    const own = (stage: string) => stageActions('police').find((a) => a.stage === stage)!;
    const swat = days('police', { stage: 2, branch: 1 }, 1)[0].map((t) => t.id);
    const detective = days('police', { stage: 2, branch: 0 }, 1)[0].map((t) => t.id);
    expect(swat).toContain(`stage_${own('lead1').key}`);
    expect(swat).not.toContain(`stage_${own('lead0').key}`);
    expect(detective).toContain(`stage_${own('lead0').key}`);
    expect(stageLock({ career: 'police', ...gateOf(own('lead0')) }, { stage: 2, branch: 1 })).toContain('다른 갈래');
    // A career without branch leaders keeps its one.
    expect(days('nurse', { stage: 2, branch: 1 }, 1)[0].map((t) => t.id)).toContain(`stage_${stageActions('nurse').find((a) => a.stage === 'lead')!.key}`);
  });

  it('the day’s own tasks follow the branch and the licence', () => {
    // A judge meets no clients and drafts no briefs, at any stage.
    for (const stage of [1, 2] as const) for (const ts of days('lawyer', { stage, branch: 0 })) {
      expect(does(ts)).not.toContain('consultClient');
      expect(does(ts)).not.toContain('draftBrief');
      expect(does(ts)).toContain('reviewVerdict');
    }
    // A 약국 보조원 never dispenses; a 근무 약사 does.
    for (const ts of days('pharmacist', { stage: 0, level: 0 })) {
      expect(does(ts)).not.toContain('dispenseMeds');
      expect(does(ts)).not.toContain('urgentPrescription');
    }
    expect(does(days('pharmacist', stageOf({ careerId: 'pharmacist', level: 2 }), 1)[0])).toContain('dispenseMeds');
    // A 외과 surgeon operates every day, a 내과 one never; the 의대 실습생 takes histories, no diagnosing.
    for (const ts of days('doctor', { stage: 1, branch: 0 })) expect(does(ts)).toContain('performSurgery');
    for (const ts of days('doctor', { stage: 1, branch: 1 })) expect(does(ts)).not.toContain('performSurgery');
    // ...and scopes every day instead, never scrubbing in (2026-11-04: 내과 had read as the surgeons' work without the knife).
    for (const ts of days('doctor', { stage: 1, branch: 1 })) {
      expect(does(ts)).toContain('drEndoscopy');
      expect(does(ts)).not.toContain('drScrubIn');
    }
    for (const ts of days('doctor', { stage: 1, branch: 0 })) expect(does(ts)).not.toContain('drEndoscopy');
    for (const ts of days('doctor', { stage: 0, level: 0 })) {
      expect(does(ts)).not.toContain('diagnosePatient');
      expect(does(ts)).not.toContain('performSurgery');
    }
    // An intern draws blood and prepares; charts are a resident's, diagnosing an older one's.
    for (const ts of days('doctor', { stage: 0, level: 1 })) {
      for (const w of ['drDrawBlood', 'drPatientList', 'drPrepTheatre']) expect(does(ts)).toContain(w);
      for (const w of ['diagnosePatient', 'writeChart']) expect(does(ts)).not.toContain(w);
    }
    expect(does(days('doctor', { stage: 1, level: 2 }, 1)[0])).toContain('writeChart');
    expect(does(days('doctor', { stage: 1, level: 2 }, 1)[0])).not.toContain('diagnosePatient');
    expect(does(days('doctor', { stage: 1, level: 3 }, 1)[0])).toContain('diagnosePatient');
    // The bartender mixes at the bar; the pilot trainee doesn't fly the route; the 역무원 drives no train.
    expect(does(days('culinary', { stage: 1, branch: 1 }, 1)[0])).toContain('mixCocktail');
    expect(does(days('culinary', { stage: 1, branch: 1 }, 1)[0])).not.toContain('cookOrder');
    for (const ts of days('pilot', { stage: 0, level: 1 })) expect(does(ts)).not.toContain('flyRoute');
    expect(does(days('pilot', stageOf({ careerId: 'pilot', level: 2 }), 1)[0])).toContain('flyRoute');
    for (const ts of days('subwayDriver', { stage: 0, level: 1 })) expect(does(ts)).not.toContain('runTrain');
    // Nothing on a day comes twice.
    for (const id of Object.keys(WORKPLACES)) for (const ts of days(id, { stage: 0, level: 0 }, 6)) expect(new Set(ts.map((t) => t.id)).size, id).toBe(ts.length);
  });

  it('a call-out waits for the rung that answers it', () => {
    const def = WORKPLACES.pilot;
    expect(def.alarm!.minStage).toBe(1);
    const trainee = Game.workplaceTour('pilot', () => 0.5, { stage: 0, level: 1 });
    const firstOfficer = Game.workplaceTour('pilot', () => 0.5, stageOf({ careerId: 'pilot', level: 2 }));
    for (const g of [trainee, firstOfficer]) for (let i = 0; i < 600 && !g.state.workplace!.alarm; i++) g.step(1);
    expect(trainee.state.workplace!.alarm).toBeUndefined();
    expect(firstOfficer.state.workplace!.alarm).toBeDefined();
  });

  it('a leader isn’t sent to report to a boss: the team reports to them', () => {
    for (const [id, def] of Object.entries(WORKPLACES)) {
      const branches = CAREER_BY_ID[id]?.branches?.length ? [0, 1] : [0];
      for (const branch of branches) for (const ts of days(id, { stage: 2, branch }, 8)) expect(ts.some((t) => t.social === 'boss'), id).toBe(false);
      if ([...def.tasks, ...def.extra].some((t) => t.social === 'boss')) {
        const seen = branches.flatMap((branch) => days(id, { stage: 2, branch }, 40)).flat();
        if (!def.branchExtra) expect(seen.some((t) => t.id === HEAR_REPORT.id), id).toBe(true);
      }
    }
    // Below 리더 the boss is still reported to.
    expect(days('tech', { stage: 0 }).flat().some((t) => t.social === 'boss')).toBe(true);
  });
});
