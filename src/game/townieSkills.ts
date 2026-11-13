import { CHILD_SKILLS, MAX_SKILL, MINOR_SKILLS, SKILL_GROUPS } from './constants';
import { SKILL_PROFILES } from './careerSkills';
import type { SkillKey } from './types';
import type { Townie } from './visitors';

/**
 * What a neighbour is good at (2026-10-20, at the user's request: someone who moves in shouldn't
 * start from nothing). A neighbour's competencies follow from who they are: their life stage, their
 * job and how far up it they are (its main and base competencies), what they like doing, and a
 * little of everyone's mind competencies; the rest is a few hobbies of their own. The same
 * neighbour always comes out the same (seeded by their id), and only ever gains: a promotion or a
 * birthday raises what's expected of them (`withSkills` keeps the higher).
 */
type Skills = Partial<Record<SkillKey, number>>;

/** A little generator of their own, so a neighbour's skills are the same on every load. */
function seeded(id: number) {
  let s = (id * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

const ADULT_SKILLS = SKILL_GROUPS.flatMap((g) => g.keys).filter((k) => !CHILD_SKILLS.has(k));
const MIND: SkillKey[] = ['selfControl', 'persistence', 'resilience', 'curiosity'];
/** Liked activities that are skills of the same name (preferences.ts ACTIVITIES). */
const LIKED_SKILL = new Set<string>(ADULT_SKILLS);

const cap = (k: SkillKey, v: number) => Math.max(0, Math.min(MINOR_SKILLS.has(k) ? 5 : MAX_SKILL, Math.round(v * 10) / 10));

/** The competencies a neighbour has by now, from who they are. */
export function townieSkills(t: Townie): Skills {
  const rng = seeded(t.id);
  const out: Skills = {};
  const raise = (k: SkillKey, v: number) => {
    out[k] = Math.max(out[k] ?? 0, cap(k, v));
  };
  if (t.age === 'baby') return out;
  if (t.age === 'child') {
    for (const k of CHILD_SKILLS) raise(k, 1 + rng() * 3.5);
    return out;
  }
  // Grown-ups more than teens, elders most (a life's worth).
  const life = t.age === 'teen' ? 0.45 : t.age === 'elder' ? 1.25 : 1;
  for (const k of MIND) raise(k, (1 + rng() * 3) * life);
  for (const k of ['charisma', 'empathy', 'cooking', 'fitness'] as SkillKey[]) raise(k, rng() * 3 * life);
  // Their work: the main competency grows with the rank, the base one about half as much.
  const careerId = t.job?.careerId ?? t.retiredFrom;
  const p = careerId ? SKILL_PROFILES[careerId] : undefined;
  if (p) {
    const level = t.job ? t.job.level : 6;
    raise(p.main, 2.5 + level * 0.9 + rng());
    raise(p.base, 1.5 + level * 0.5 + rng());
    for (const b of p.branches) raise(b.skill, 1 + level * 0.3 + rng() * 1.5);
  }
  // What they like doing, they've done a lot of.
  for (const like of t.likes ?? []) if (LIKED_SKILL.has(like)) raise(like as SkillKey, (2 + rng() * 3) * life);
  // And a hobby or two of their own.
  for (let i = 0; i < 2; i++) raise(ADULT_SKILLS[Math.floor(rng() * ADULT_SKILLS.length) % ADULT_SKILLS.length], (1 + rng() * 2.5) * life);
  return out;
}

/** Their skills kept up with who they are now: never less than they had. */
export function withSkills(t: Townie): Skills {
  const now = townieSkills(t);
  const had = t.skills ?? {};
  const out: Skills = { ...had };
  for (const [k, v] of Object.entries(now) as Array<[SkillKey, number]>) out[k] = Math.max(had[k] ?? 0, v);
  return out;
}

/** What they're noticeably good at (level 2 and up), best first: what can be learnt about them. */
export function notableSkills(skills: Skills | undefined, max = 6): Array<[SkillKey, number]> {
  return (Object.entries(skills ?? {}) as Array<[SkillKey, number]>)
    .filter(([, v]) => v >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max);
}
