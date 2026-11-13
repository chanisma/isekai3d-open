import { describe, expect, it } from 'vitest';
import { getDef } from './catalog';
import { Game } from './game';
import { EXTRA_WORK } from './workExtra';
import { WORKPLACES } from './workplace';
import { stageTasks } from './workStages';

const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

describe('work a job needs that the lot lacked', () => {
  it.each(EXTRA_WORK.map((x) => [x.career, x.id, x] as const))('%s %s: on its lot, in its work, drawn as a use of the same piece', (career, id, x) => {
    const wp = WORKPLACES[career];
    expect(wp.objects.some((o) => o.defId === x.piece)).toBe(true);
    expect(wp.work).toContain(id);
    const inter = getDef(x.piece).interactions.find((i) => i.id === id)!;
    const like = getDef(x.piece).interactions.find((i) => i.id === x.like)!;
    expect(inter.drawnAs).toBe(x.own ? undefined : x.like);
    expect(inter.pose).toBe(like.pose);
    expect(inter.requires).toBe(like.requires);
    expect(inter.label).toBe(x.label);
  });

  it('ids are unique, and it can be done on its own lot and no other', () => {
    expect(new Set(EXTRA_WORK.map((x) => x.id)).size).toBe(EXTRA_WORK.length);
    const lot = Game.workplaceTour('doctor', seeded(3));
    const worker = lot.dweller(lot.state.workplace!.workerId)!;
    const bed = lot.state.objects.find((o) => o.defId === 'hospitalBed')!;
    expect(lot.objectMenu(worker, bed).map((m) => m.id)).toContain('xwDressWound');
    const ward = Game.workplaceTour('nurse', seeded(3));
    const nurse = ward.dweller(ward.state.workplace!.workerId)!;
    const bed2 = ward.state.objects.find((o) => o.defId === 'hospitalBed')!;
    const menu = ward.objectMenu(nurse, bed2).map((m) => m.id);
    expect(menu).toContain('xwTurnPatient');
    expect(menu).not.toContain('xwDressWound');
    expect(ward.meetsRequirement(nurse, bed2, ward.interaction(bed2, 'xwDressWound')!)).toBe(false);
    expect(lot.meetsRequirement(worker, bed, lot.interaction(bed, 'xwTurnPatient')!)).toBe(false);
  });

  it('comes up on the day’s list, and licensed work not before its rung', () => {
    const seen = (career: string, at: { stage: 0 | 1 | 2; level?: number; branch?: number }) => {
      const ids = new Set<string>();
      for (let i = 0; i < 200; i++) for (const t of stageTasks(WORKPLACES[career], () => (i + 0.5) / 200, at)) ids.add(t.id);
      return ids;
    };
    expect(seen('doctor', { stage: 1, level: 2 })).toContain('xwPrescribe');
    expect(seen('doctor', { stage: 0, level: 0 })).not.toContain('xwPrescribe');
    expect(seen('doctor', { stage: 0, level: 0 })).not.toContain('xwDressWound');
    expect(seen('teacher', { stage: 0, level: 1 })).toContain('xwSchoolRecord');
    expect(seen('teacher', { stage: 0, level: 0 })).not.toContain('xwSchoolRecord');
    expect(seen('military', { stage: 0 })).toContain('xwRollCall');
  });
});
