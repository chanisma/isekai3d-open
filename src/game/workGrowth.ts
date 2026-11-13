import { CAREER_BY_ID } from './careers';
import { SKILL_PROFILES } from './careerSkills';
import { LEARN, SKILL_GROUPS } from './constants';
import type { WorkTone } from './careers';
import type { InteractionDef, Job, Dweller, SkillKey } from './types';
import { stageOf } from './workStages';

/**
 * Growing at work and at home (ours, at the user's request, 2026-10-20): "a dweller at home grew faster
 * than one out at work — growing at home is fine, but the real, varied experience is at work, and
 * home has its limits; don't hold home back too much."
 *
 * - A shift worked away from home (not followed to the work lot) grows the job's competencies by
 *   itself: until now it grew none, and the dweller at home practised all day. Half to the job's main
 *   competency, the rest to its base and to what its stage is about (the branch's, or at the top
 *   what it leads with). A followed shift grows them through the work done on the lot instead.
 * - Practising a career competency at home (a book, the computer, the mirror) slows past the middle
 *   levels: the basics come at home, the top takes the real thing. Hobbies, the mind's skills, a
 *   child's, talk with the family and outings are as before.
 *
 * What home study gives (2026-11-01, the user's; docs/workplaces/PIPELINE.md 집 가구와 행동): with no related job
 * a field's competency or coding stops at level 2 from home practice (a level above that stays), and a hobby
 * slows as it rises. What home practice is, is the caller's: game.ts, on an interaction away from a workplace that
 * isn't a chore. A shift, a school lesson, a venue and talk come by other ways and aren't touched by any of this.
 */

/** A shift's learning rate, before mood and traits (gainSkill): a little under light practice (2026-10-25: was that of light practice). */
export const WORK_LEARN = LEARN.light * 0.6;
/** How hard the dweller works: taking it easy learns less, pushing hard more. */
export const WORK_TONE_LEARN: Record<WorkTone, number> = { easy: 0.6, normal: 1, hard: 1.3 };

/** What a day's work grows, and how much of it each: main ½, base and the stage's own ¼ each (ours). */
export function workSkills(job: Pick<Job, 'careerId' | 'level' | 'branch'>): Array<[SkillKey, number]> {
  const c = CAREER_BY_ID[job.careerId];
  const p = SKILL_PROFILES[job.careerId];
  if (!c || c.school || !p) return [];
  const at = stageOf(job);
  const branch = job.branch === undefined ? undefined : p.branches[job.branch];
  // 입문: the base again (learning the basics); 전문: the branch's; 리더: what the branch leads with.
  const stage = at.stage === 0 || !branch ? p.base : at.stage === 2 && branch.top ? branch.top : branch.skill;
  const shares = new Map<SkillKey, number>();
  for (const [k, s] of [[p.main, 0.5], [p.base, 0.25], [stage, 0.25]] as Array<[SkillKey, number]>) shares.set(k, (shares.get(k) ?? 0) + s);
  return [...shares];
}

/** Career competencies (공통 역량 and 분야별 전문 역량, constants.ts): the ones home practice tops out on. */
export const CAREER_COMPETENCIES = new Set<SkillKey>([...SKILL_GROUPS[0].keys, ...SKILL_GROUPS[2].keys]);
/** From these levels, practising a career competency at home goes at these speeds (ours). */
export const HOME_LIMIT: Array<[number, number]> = [
  [8, 0.3],
  [6, 0.5],
];

/** Where home practice stops with no related job. */
export const HOME_BASICS_CAP = 2;
/** What stops there: the fields' own competencies, and coding, though it's listed as common. Other common ones aren't capped. */
export const HOME_CAPPED = new Set<SkillKey>([...SKILL_GROUPS[2].keys, 'programming']);
/** The arts and pastimes. */
export const HOBBY_SKILLS = new Set<SkillKey>(SKILL_GROUPS[3].keys);
/** From these levels, a hobby practised at home with no related job goes at these speeds (the lead's first guess: play and adjust). */
export const HOBBY_LIMIT: Array<[number, number]> = [
  [8, 0.3],
  [6, 0.5],
  [4, 0.7],
];

/** Whether this job rests on `skill`: its main, its base, or its branch's own or top one (either branch, until one's chosen). School isn't a job here. */
export function jobTeaches(job: Pick<Job, 'careerId' | 'branch'>, skill: SkillKey): boolean {
  const p = SKILL_PROFILES[job.careerId];
  if (!p || CAREER_BY_ID[job.careerId]?.school) return false;
  if (skill === p.main || skill === p.base) return true;
  const branches = job.branch === undefined ? p.branches : [p.branches[job.branch]];
  return branches.some((b) => !!b && (b.skill === skill || b.top === skill));
}

/** Whether the dweller has a job, or a teen's part-time one, that rests on `skill`. */
export function hasRelatedJob(dweller: Pick<Dweller, 'job' | 'partTime'>, skill: SkillKey): boolean {
  return [dweller.job, dweller.partTime].some((j) => !!j && jobTeaches(j, skill));
}

/**
 * How fast practising `skill` at `level` at home goes (1 = as before, 0 = no further), `related` being whether the
 * dweller has a job resting on it. A hobby with the job is as fast as it ever was; a common competency slows as before.
 */
export function homePracticeFactor(skill: SkillKey, level: number, related = false): number {
  if (HOBBY_SKILLS.has(skill)) {
    if (!related) for (const [from, f] of HOBBY_LIMIT) if (level >= from) return f;
    return 1;
  }
  if (HOME_CAPPED.has(skill) && !related && level >= HOME_BASICS_CAP) return 0;
  if (!CAREER_COMPETENCIES.has(skill)) return 1;
  for (const [from, f] of HOME_LIMIT) if (level >= from) return f;
  return 1;
}

/** What it's called and how fast it teaches for this dweller: `withJob` where their job rests on what it teaches. */
export function forDweller(inter: InteractionDef, dweller: Pick<Dweller, 'job' | 'partTime'>): { label: string; rate: number | undefined } {
  const job = inter.withJob && inter.skill && hasRelatedJob(dweller, inter.skill.key) ? inter.withJob : undefined;
  return { label: job?.label ?? inter.label, rate: job?.rate ?? inter.skill?.rate };
}

/** Said of a skill the dweller has gone as far with at home as they can with no job for it, else nothing. */
export function homeCapNote(dweller: Pick<Dweller, 'job' | 'partTime' | 'skills'>, skill: SkillKey): string | undefined {
  if (homePracticeFactor(skill, Math.floor(dweller.skills[skill] ?? 0), hasRelatedJob(dweller, skill)) > 0) return undefined;
  return '집에서 배울 수 있는 데까지 배웠어요. 더 배우려면 관련 직업이 필요해요';
}
