import { CAREER_BY_ID, fieldOf } from './careers';
import { GOAL_BY_ID, JOY_BY_ID } from './colleagueLife';
import { FEAR_BY_ID, type FearId } from './fears';
import { SKILL_PROFILES } from './careerSkills';
import { whyFor } from './careerWhy';
import { SKILL_INFO } from './constants';
import { PREFERENCE_BY_ID } from './preferences';
import { TRAIT_BY_ID } from './traits';
import type { NeedKey, Dweller, SkillKey } from './types';
import { notableSkills } from './townieSkills';
import { josa } from './util';
import { townieLevel } from './neighbourhood';
import type { Townie } from './visitors';

/**
 * What a dweller knows about someone else, after 참고 게임's DwellerKnowledge (relationships/dweller_knowledge.py,
 * one per relationship and one way only): their traits, what they like, their job. It is learnt
 * only from talking: "알아가기" tells one trait or like at a time (참고 게임 KnowOtherDwellerTraitOp with a
 * random count of one, loot_KnowAbout_DwellerPreference_*), "직업에 대해 묻기" the job (참고 게임
 * mixer_social_AskAboutCareer_friendly_STC → KnowOtherDwellerCareerOp). Ours: the household's dwellers know
 * each other already, and only what the household learns about others is kept. It is what the dweller
 * knows inside the game, apart from the knowledge of the player (knowledge.ts).
 *
 * Since 2026-10-20 (at the user's request) what a neighbour is good at can be learnt too, a
 * competency and its level at a time, and it comes out bit by bit in any friendly talk, not only
 * in 알아가기 (`TALK_CHANCE`).
 */
export interface Known {
  traits?: string[];
  likes?: string[];
  /** The career they told about (theirs, or the one they retired from). */
  job?: string;
  /** Competencies they're good at, with the level they had when it came out. */
  skills?: Partial<Record<SkillKey, number>>;
  /** A colleague's inner life, learnt by talking (2026-10-26): what they're after at work. */
  goal?: boolean;
  /** The worries they've told about (kept; shown while they still carry them). */
  worries?: FearId[];
  /** The good news they told about (shown while it's still news). */
  joy?: string;
  /** A need they said was running low (shown while it still is). */
  need?: NeedKey;
  /** Times they've been asked what's up and kept a worry to themselves: each makes the next more likely. */
  opened?: number;
}

/** The person's own facts: what there is to know. */
export interface Facts {
  name: string;
  traits: string[];
  likes: string[];
  careerId?: string;
  retired?: boolean;
  title?: string;
  /** What they're noticeably good at (level 2 and up), best first. */
  skills: Array<[SkillKey, number]>;
}

export function factsOf(t: Dweller | Townie, townie?: Townie): Facts {
  const src = townie ?? t;
  const traits = (src.traits ?? []).filter((id) => TRAIT_BY_ID[id] && !TRAIT_BY_ID[id].reward);
  if ('job' in t && t.job && 'performance' in t.job) {
    const career = CAREER_BY_ID[t.job.careerId];
    return { name: t.name, traits, likes: src.likes ?? [], careerId: career?.school ? undefined : t.job.careerId, skills: notableSkills(t.skills) };
  }
  const tw = townie ?? (t as Townie);
  const job = tw.job?.careerId ?? tw.retiredFrom;
  return { name: t.name, traits, likes: src.likes ?? [], careerId: job, retired: !tw.job && !!tw.retiredFrom, title: tw.job ? townieLevel(tw)?.title : undefined, skills: notableSkills(tw.skills) };
}

export function knownOf(dweller: Dweller, id: number): Known {
  return ((dweller.knows ??= {})[id] ??= {});
}

/** How likely a friendly talk (not 알아가기, which always does) lets one thing slip out. */
export const TALK_CHANCE = 0.12;
/** A heart-to-heart lets more slip out. */
export const DEEP_TALK_CHANCE = 0.4;

/** How much is known of them: what's been learnt of all there is to learn (traits, likes, skills, job). */
export function knownShare(dweller: Dweller, id: number, facts: Facts): { known: number; all: number } {
  const k = dweller.knows?.[id] ?? {};
  const all = facts.traits.length + facts.likes.length + facts.skills.length + (facts.careerId ? 1 : 0);
  const known =
    facts.traits.filter((x) => k.traits?.includes(x)).length +
    facts.likes.filter((x) => k.likes?.includes(x)).length +
    facts.skills.filter(([x]) => k.skills?.[x] !== undefined).length +
    (facts.careerId && k.job ? 1 : 0);
  return { known, all };
}

/** One thing not yet known, picked at random: a trait, a like or a competency (참고 게임 picks a random trait). */
export function learnOne(dweller: Dweller, id: number, facts: Facts, rng: () => number): string | null {
  const k = knownOf(dweller, id);
  const open = [
    ...facts.traits.filter((x) => !k.traits?.includes(x)).map((x) => ['trait', x] as const),
    ...facts.likes.filter((x) => !k.likes?.includes(x)).map((x) => ['like', x] as const),
    ...facts.skills.filter(([x]) => k.skills?.[x] === undefined).map(([x]) => ['skill', x] as const),
  ];
  if (!open.length) return null;
  const [kind, what] = open[Math.floor(rng() * open.length) % open.length];
  if (kind === 'skill') {
    const level = Math.floor(facts.skills.find(([x]) => x === what)![1]);
    k.skills = { ...k.skills, [what]: level };
    const info = SKILL_INFO[what as SkillKey];
    return `💡 ${josa(dweller.name, '은/는')} ${josa(facts.name, '이/가')} ${info.icon} ${info.label} ${level}레벨쯤 된다는 걸 알게 됐어요`;
  }
  if (kind === 'trait') {
    (k.traits ??= []).push(what);
    const t = TRAIT_BY_ID[what];
    return `💡 ${josa(dweller.name, '은/는')} ${josa(facts.name, '이/가')} '${t.icon} ${t.label}' 성격이란 걸 알게 됐어요`;
  }
  (k.likes ??= []).push(what);
  const a = PREFERENCE_BY_ID[what];
  return `💡 ${josa(dweller.name, '은/는')} ${josa(facts.name, '이/가')} ${a?.icon ?? ''} ${josa(a?.label ?? what, '을/를')} 좋아한다는 걸 알게 됐어요`;
}

/**
 * Hearing about someone's job: what they do, and why its main competency matters (careerWhy.ts),
 * so a neighbour becomes someone to interview about work. Returns the line to show, or null if
 * they have no job to talk about.
 */
export function hearAboutJob(dweller: Dweller, id: number, facts: Facts): string | null {
  if (!facts.careerId) return null;
  const career = CAREER_BY_ID[facts.careerId];
  if (!career) return null;
  const k = knownOf(dweller, id);
  k.job = facts.careerId;
  const p = SKILL_PROFILES[facts.careerId];
  // How good they are at the job's main competency comes out too, if it's one of their strengths.
  const theirs = p && facts.skills.find(([x]) => x === p.main);
  if (theirs) k.skills = { ...k.skills, [p.main]: Math.floor(theirs[1]) };
  const why = p ? whyFor(facts.careerId, p.main) : '';
  const skill = p ? `${SKILL_INFO[p.main].icon} ${josa(SKILL_INFO[p.main].label, '이/가')}` : '';
  const what = facts.retired ? `예전에 ${career.name} 일을 했어요` : career.partTime ? `${career.name.replace(' (아르바이트)', '')} 아르바이트를 해요` : `${career.name}${copula(career.name)}${facts.title ? ` (${facts.title})` : ''}`;
  const level = theirs ? ` (${facts.name}의 ${SKILL_INFO[p!.main].label}: ${Math.floor(theirs[1])}레벨쯤)` : '';
  return `💼 ${facts.name}: "${what}."${skill ? ` 이 일엔 ${skill} 중요하대요${why ? `: ${why}` : ''}${level}` : ''}`;
}

/** "소방관이에요", "교사예요". */
function copula(word: string): string {
  const c = word.charCodeAt(word.length - 1) - 0xac00;
  return c >= 0 && c <= 11171 && c % 28 !== 0 ? '이에요' : '예요';
}

/** The career field heard about, for "세상 둘러보기" (aspirations). */
export function fieldHeard(careerId: string | undefined): string | undefined {
  return careerId ? fieldOf(careerId)?.id : undefined;
}

/**
 * A colleague's inner life (2026-10-26, at the user's request): at first only what shows on their
 * face (render.ts moodBubble); what's behind it — what they're after, a worry, good news, a need
 * running low — comes out bit by bit in talk. "무슨 일 있어요?" (askWhatsUp) asks straight out;
 * good news is told at once, a worry only to someone they trust enough (friendship, a listener good
 * with people, and having asked before); a heart-to-heart opens it up; friendly talk lets the
 * rest slip now and then.
 */
export interface Inner {
  goal?: string;
  worries: FearId[];
  joy?: string;
  /** Their lowest need, if it's running low. */
  need?: NeedKey;
}

/** A need below this shows in their face, and can be told. */
export const LOW_NEED = 40;

export function innerOf(t: Townie, live?: Dweller): Inner {
  let need: NeedKey | undefined;
  if (live) {
    const low = (Object.entries(live.needs) as [NeedKey, number][]).sort((a, b) => a[1] - b[1])[0];
    if (low && low[1] < LOW_NEED) need = low[0];
  }
  return { goal: t.goal, worries: (live ? live.fears : t.fears) ?? [], joy: live ? live.joy : t.joy, need };
}

/** What of it the dweller knows now (old news and old worries left out). */
export function knownInner(dweller: Pick<Dweller, 'knows'>, id: number, inner: Inner): Inner & { unknownWorry: boolean; unknownJoy: boolean } {
  const k = dweller.knows?.[id] ?? {};
  const worries = inner.worries.filter((f) => k.worries?.includes(f));
  return {
    goal: k.goal ? inner.goal : undefined,
    worries,
    joy: inner.joy && k.joy === inner.joy ? inner.joy : undefined,
    need: inner.need && k.need === inner.need ? inner.need : undefined,
    unknownWorry: worries.length < inner.worries.length,
    unknownJoy: !!inner.joy && k.joy !== inner.joy,
  };
}

export const NEED_TOLD: Record<NeedKey, string> = {
  hunger: '배가 고프대요',
  energy: '많이 피곤하대요',
  bladder: '화장실이 급하대요',
  hygiene: '좀 씻고 싶대요',
  fun: '요즘 일이 지루하대요',
  social: '누군가와 이야기하고 싶었대요',
};
export const NEED_ICON: Record<NeedKey, string> = { hunger: '🍽️', energy: '🥱', bladder: '🚻', hygiene: '🚿', fun: '😒', social: '💭' };

/** How likely a worry is told when asked: trust (friendship), a listener good with people, asking again. */
export function tellChance(friend: number, empathy: number, opened: number): number {
  return Math.min(0.95, 0.25 + Math.max(0, friend) / 150 + 0.05 * Math.floor(empathy) + 0.15 * opened);
}

/**
 * "무슨 일 있어요?": the good news first (gladly told), then a worry (if they trust the dweller enough),
 * then a need running low, then what they're after at work. Returns the line to show.
 */
export function askWhatsUp(dweller: Dweller, id: number, name: string, inner: Inner, friend: number, rng: () => number): string {
  const k = knownOf(dweller, id);
  const known = knownInner(dweller, id, inner);
  if (known.unknownJoy) {
    k.joy = inner.joy;
    return `😊 ${name}: "${JOY_BY_ID[inner.joy!]?.label ?? '좋은 일이 있었어요'}" — 함께 기뻐해 줄 수 있어요`;
  }
  if (known.unknownWorry) {
    if (rng() < tellChance(friend, dweller.skills.empathy ?? 0, k.opened ?? 0)) {
      const f = inner.worries.find((x) => !k.worries?.includes(x))!;
      (k.worries ??= []).push(f);
      k.opened = 0;
      return `😨 ${josa(name, '이/가')} 털어놓았어요: ${FEAR_BY_ID[f].label} — 고민을 들어 줄 수 있어요`;
    }
    k.opened = (k.opened ?? 0) + 1;
    return `😕 ${name}: "아, 아무것도 아니에요…" 아직은 말하기 어려운가 봐요. 더 친해지거나 다시 물어보면 털어놓을지도 몰라요`;
  }
  if (inner.need && !known.need) {
    k.need = inner.need;
    return `${NEED_ICON[inner.need]} ${name}: ${NEED_TOLD[inner.need]}`;
  }
  if (inner.goal && !known.goal) {
    k.goal = true;
    return `🎯 ${name}: "요즘 목표요? ${GOAL_BY_ID[inner.goal]?.label ?? ''}" — 열망을 알게 됐어요`;
  }
  return `🙂 ${name}: "별일 없어요, 고마워요!"`;
}

/**
 * Friendly talk with a colleague lets their inner life slip now and then (like learnOne): good news
 * or what they're after; a heart-to-heart opens a worry too. Returns the line, or null.
 */
export function slipInner(dweller: Dweller, id: number, name: string, inner: Inner, deep: boolean, rng: () => number): string | null {
  const k = knownOf(dweller, id);
  const known = knownInner(dweller, id, inner);
  if (deep && known.unknownWorry) {
    const f = inner.worries.find((x) => !k.worries?.includes(x))!;
    (k.worries ??= []).push(f);
    return `🫂 깊은 이야기 끝에 ${josa(name, '이/가')} 털어놓았어요: ${FEAR_BY_ID[f].label}`;
  }
  const open = [...(known.unknownJoy ? ['joy'] : []), ...(inner.goal && !known.goal ? ['goal'] : [])];
  if (!open.length) return null;
  const what = open[Math.floor(rng() * open.length) % open.length];
  if (what === 'joy') {
    k.joy = inner.joy;
    return `😊 이야기하다 보니 ${name}에게 기쁜 일이 있대요: ${JOY_BY_ID[inner.joy!]?.label ?? ''}`;
  }
  k.goal = true;
  return `🎯 이야기하다 보니 ${name}의 목표를 알게 됐어요: ${GOAL_BY_ID[inner.goal!]?.label ?? ''}`;
}
