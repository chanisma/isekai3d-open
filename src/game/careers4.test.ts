import { describe, expect, it } from 'vitest';
import { CAREER_BY_ID, fieldOf, levelsOf } from './careers';
import { KOREA_CAREERS } from './careersKorea';
import { CAREER_EVENTS } from './careerEvents';
import { WORKPLACES, WORK_SOCIALS } from './workplace';
import { getDef } from './catalog';
import { MAX_SKILL, MINOR_SKILLS, NO_SKILLS } from './constants';

describe('everyday Korean jobs (ours)', () => {
  it('are ladders of six to ten real ranks with two branches, pay climbing and performance falling', () => {
    expect(KOREA_CAREERS.length).toBeGreaterThan(0);
    for (const raw of KOREA_CAREERS) {
      const c = CAREER_BY_ID[raw.id];
      expect(c).toBeTruthy();
      expect(c.inspired).toBeTruthy();
      expect(fieldOf(c.id), `${c.id} has a field in the want ads`).toBeTruthy();
      expect(c.branches).toHaveLength(2);
      for (const b of c.branches!.keys()) {
        const ladder = levelsOf(c, b);
        const top = ladder.length - 1;
        expect(ladder.length).toBeGreaterThanOrEqual(6);
        expect(ladder.length).toBeLessThanOrEqual(10);
        expect(new Set(ladder.map((l) => l.title)).size, `${c.id} titles`).toBe(ladder.length);
        for (let i = 1; i < ladder.length; i++) {
          expect(ladder[i].pay).toBeGreaterThan(ladder[i - 1].pay);
          expect(ladder[i].basePerf).toBeLessThan(ladder[i - 1].basePerf);
        }
        expect(ladder[0].basePerf).toBe(60);
        expect(ladder[top].basePerf).toBe(6);
        expect(ladder[top].needs).toBeUndefined();
        expect(ladder.slice(1, top).every((l) => l.needs?.length)).toBe(true);
        for (const l of ladder) {
          expect(l.end).toBeGreaterThan(l.start);
          expect(l.end - l.start).toBeLessThanOrEqual(12 * 60);
          for (const [k, v] of l.needs ?? []) {
            expect(k in NO_SKILLS()).toBe(true);
            expect(v).toBeLessThanOrEqual(MINOR_SKILLS.has(k) ? 5 : MAX_SKILL);
          }
        }
        expect(ladder.map((l) => l.title).join(' ')).not.toMatch(/전설|제왕|거장|신의 손|대통령/);
      }
    }
  });

  it('each has its own work lot, four events and socials for the people who come in', () => {
    const socials = new Set(WORK_SOCIALS.map((s) => s.id));
    for (const c of KOREA_CAREERS) {
      const w = WORKPLACES[c.id];
      expect(w, `${c.id} workplace`).toBeTruthy();
      expect(w.alarm).toBeTruthy();
      // The call-out is answered at something on the lot.
      expect(w.objects.some((o) => getDef(o.defId).interactions.some((i) => i.id === w.alarm!.interaction && i.requires === 'workAlarm'))).toBe(true);
      for (const cl of w.clients ?? []) for (const s of cl.socials) expect(socials.has(s), `${c.id} social ${s}`).toBe(true);
      // Every piece of work listed can be done on the lot.
      const doable = new Set([...w.objects.flatMap((o) => getDef(o.defId).interactions.map((i) => i.id)), ...(w.clients ?? []).flatMap((cl) => cl.socials)]);
      for (const id of w.work) expect(doable.has(id), `${c.id} work ${id}`).toBe(true);
      for (const t of [...w.tasks, ...w.extra]) for (const id of t.does ?? []) expect(doable.has(id), `${c.id} task ${id}`).toBe(true);
      expect(CAREER_EVENTS.filter((e) => e.careers.includes(c.id)).length).toBeGreaterThanOrEqual(4);
    }
  });
});
