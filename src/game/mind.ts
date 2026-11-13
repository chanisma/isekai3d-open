import type { InteractionDef, SkillKey } from './types';

/**
 * Competencies of the mind (ours, at the user's request; docs/ref-game/09-mental-competencies.md):
 * common to every job, after OECD's social and emotional skills (self-control, persistence,
 * stress resistance, curiosity), NCS self-management, WEF 2025 (resilience) and 참고 게임's character
 * values. Unlike the other skills they aren't practised at an object: they grow out of habits, as
 * 참고 게임's character values and lifestyles do, and what they do is a soft nudge, never a command.
 */
export const MIND_SKILLS = new Set<SkillKey>(['selfControl', 'persistence', 'resilience', 'curiosity']);

/** What each habit is worth (skill points before the level slowdown). */
export const MIND_GAIN = {
  /** A chore, homework, study or work done while there was still fun to be had. */
  duty: 0.15,
  /** Another day in a row of practising (once a day, however many skills). */
  streakDay: 0.15,
  /** A whole shift or school day worked through. */
  fullShift: 0.15,
  /** The whole of the day's work list done. */
  allTasks: 0.4,
  /** A bad moodlet lived through to its end. */
  recovered: 0.08,
  /** Something done for the first time ever. */
  firstTry: 0.1,
  /** A new skill begun (its first level). */
  newSkill: 0.25,
};

/** 절제력: duty is done while fun is still below this (resisting the pull of play). */
export const DUTY_FUN_BELOW = 70;

/** 절제력: free will leans towards duties, 4% a level (a nudge, not an order). */
export const dutyWeight = (selfControl: number) => 1 + 0.04 * Math.floor(selfControl);

/** 끈기: the practice streak may reach further, +3% a level on top of +50% (참고 게임 has no such skill). */
export const streakCap = (persistence: number) => 0.5 + 0.03 * Math.floor(persistence);
/** 끈기 5+: one day off doesn't break the streak. */
export const streakGrace = (persistence: number) => (Math.floor(persistence) >= 5 ? 2 : 1);

/** 회복탄력성: bad moodlets pass sooner, 4% a level (down to 60%). */
export const badMoodFactor = (resilience: number) => Math.max(0.6, 1 - 0.04 * Math.floor(resilience));
/** 회복탄력성: a setback at work costs less, 3% a level. */
export const setbackFactor = (resilience: number) => 1 - 0.03 * Math.floor(resilience);

/** 호기심: a new skill's first three levels come faster, 5% a level. */
export const curiosityBoost = (curiosity: number, level: number) => (level < 3 ? 1 + 0.05 * Math.floor(curiosity) : 1);

/** Things that are duties rather than pleasures: homework and study, chores, repairs, bills, the job. */
const DUTY_IDS = new Set(['homework', 'checkHomework', 'study', 'studyMedicine', 'studyScience', 'studyLaw', 'studyBusiness', 'studyLanguage', 'washDishes', 'payBills']);
export function isDuty(inter: InteractionDef): boolean {
  return DUTY_IDS.has(inter.id) || inter.special === 'repair' || inter.special === 'clean' || inter.requires === 'atWork' || inter.requires === 'workAlarm';
}
