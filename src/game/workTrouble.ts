import { moodWork } from './moodEffects';
import { CATALOG } from './catalog';
import { jobSkill } from './careerSkills';
import { EMOTIONS } from './emotions';
import type { EmotionKey, Dweller, SkillKey } from './types';
import { WORKPLACES } from './workplace';

/**
 * Work that's hard (ours, 2026-10-25, at the user's request — "most days at work felt good, the work
 * had no difficulty, and nearly every task got done: someone short of the competence a job needs
 * can only do it that much worse").
 *
 * - **A piece of work can go wrong.** Each rung asks more of the job's skill (`workNeed`); a dweller
 *   below it fails more often (`workSuccess`), a bad mood makes it worse, the job's ideal mood or
 *   focus better. A slip counts for nothing and sometimes stings (embarrassed).
 * - **Things go wrong at work** (`TROUBLES`): a telling-off from the boss, a rush job, a clash with a
 *   colleague, a difficult client — more often the further the dweller is out of their depth and the
 *   less they put in. On the work lot they come every hour or two; a shift worked out of sight ends
 *   a hard day now and then (`hardDayChance`), and now and then a day that went well.
 */

/** The skill a rung's work asks for: 1.5 at the first rung, about 4 at the fifth, 7 at the ninth. */
export function workNeed(level: number): number {
  return 1.5 + 0.7 * level;
}

/** What a piece of the job that went wrong still teaches, of what it would have (2026-10-26, at the user's request). */
export const FAIL_LEARN = 0.3;

/**
 * What a piece of work leans on (2026-10-26): its skill as the job counts it (careerSkills jobSkill) —
 * the same one judged, named in the notice and trained, even when it goes wrong.
 */
export function workSkillOf(careerId: string, key: SkillKey, branch?: number): SkillKey {
  return jobSkill(careerId, key, branch);
}

let interactionSkill: Map<string, SkillKey> | null = null;
/** The competencies a job's work leans on, each piece of work's skill as the job counts it. */
export function workSkills(careerId: string, branch?: number): SkillKey[] {
  // Built on first use: the stage actions are put into the catalogue as the workplaces load.
  if (!interactionSkill) {
    interactionSkill = new Map();
    for (const d of CATALOG) for (const i of d.interactions) if (i.skill) interactionSkill.set(i.id, i.skill.key);
  }
  const def = WORKPLACES[careerId];
  const out = new Set<SkillKey>();
  for (const id of def?.work ?? []) {
    const key = interactionSkill.get(id);
    if (key && id !== def.alarm?.interaction) out.add(workSkillOf(careerId, key, branch));
  }
  return [...out];
}

/** Work that went wrong for want of a skill is remembered this long (game minutes). */
export const WORK_FAIL_KEEP = 3 * 1440;

/** The skills that went wrong at work lately (Dweller.workFails). */
export function recentWorkFails(dweller: Dweller, now: number): SkillKey[] {
  return (Object.entries(dweller.workFails ?? {}) as Array<[SkillKey, { n: number; at: number }]>).filter(([, f]) => now - f.at < WORK_FAIL_KEEP).map(([k]) => k);
}

/**
 * What the dweller's job asks of them that they haven't got (2026-10-26, at the user's request: a dweller
 * should want to learn what work needs, since work got hard): the job's work skills below what the rung
 * needs (`workNeed`), and any that went wrong at work lately. Wants and free will lean towards these.
 */
export function workSkillsShort(dweller: Dweller, now: number): SkillKey[] {
  const job = dweller.job;
  if (!job || dweller.npc) return [];
  const need = workNeed(job.level);
  const short = workSkills(job.careerId, job.branch).filter((k) => Math.floor(dweller.skills[k] ?? 0) < need);
  return [...new Set([...short, ...recentWorkFails(dweller, now)])];
}

export function workSuccess(skill: number, need: number, emotion: EmotionKey, ideal?: EmotionKey): number {
  let p = 0.8 + 0.1 * (Math.floor(skill) - need);
  p += moodWork(emotion);
  if (emotion === ideal && emotion !== 'focused') p += 0.05;
  return Math.min(0.97, Math.max(0.2, p));
}

export type TroubleId = 'scolded' | 'rushJob' | 'clashAtWork' | 'rudeClient';

export interface Trouble {
  id: TroubleId;
  /** What happened, for the notice («상사가 보고서를 보고 한숨을 쉬었어요»). */
  texts: string[];
  /** Only where people come in to be seen to (a shop, a clinic). */
  clients?: boolean;
}

export const TROUBLES: Trouble[] = [
  { id: 'scolded', texts: ['상사가 일 처리를 보고 크게 지적했어요', '회의에서 실수를 지적받았어요', '보고서를 다시 써 오라는 말을 들었어요'] },
  { id: 'rushJob', texts: ['갑자기 급한 일이 떨어졌어요', '마감이 앞당겨졌어요', '오늘 안에 끝내야 하는 일이 생겼어요'] },
  { id: 'clashAtWork', texts: ['동료와 일 나누는 문제로 언성이 높아졌어요', '동료가 내 실수를 탓했어요', '협업하던 동료와 의견이 크게 엇갈렸어요'] },
  { id: 'rudeClient', texts: ['까다로운 손님이 큰소리를 냈어요', '손님이 무리한 요구를 했어요', '손님의 항의를 받았어요'], clients: true },
];

/**
 * Chance of trouble in the next stretch of a shift on the work lot: a third as a rule, more the
 * further below the rung's need the job's main skill is, and when the dweller is coasting.
 */
export function troubleChance(skill: number, need: number, coasting: boolean): number {
  return Math.min(0.75, 0.3 + 0.07 * Math.max(0, need - Math.floor(skill)) + (coasting ? 0.1 : 0));
}

/** A shift worked out of sight: how likely it ended a hard day, or a good one. */
export function hardDayChance(skill: number, need: number, coasting: boolean, mood: EmotionKey): { hard: number; good: number } {
  const gap = need - Math.floor(skill);
  const negative = EMOTIONS[mood]?.polarity === 'negative';
  const hard = Math.min(0.7, 0.22 + 0.06 * Math.max(0, gap) + (coasting ? 0.1 : 0) + (negative ? 0.1 : 0));
  const good = Math.max(0.05, 0.15 - 0.04 * Math.max(0, gap) + (gap < -2 ? 0.1 : 0));
  return { hard, good };
}
