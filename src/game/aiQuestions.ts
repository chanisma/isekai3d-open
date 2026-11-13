import { CAREER_BY_ID, CAREER_FIELDS, levelOf, topLevelOf } from './careers';
import { SKILL_PROFILES } from './careerSkills';
import { TRAIT_TYPES, WORK_TYPES } from './careerTypes';
import type { Approach, CareerEvent, EventChoice, EventOutcome } from './careerEventKit';
import { SKILL_GROUPS, SKILL_INFO } from './constants';
import { EMOTIONS } from './emotions';
import { knowledgeFor, type PlayerKnowledge } from './knowledge';
import { TRAIT_BY_ID } from './traits';
import type { EmotionKey, Job, Dweller, SkillKey } from './types';
import { hasWorkRoles } from './workRoles';
import { stageActionsAt, stageInfo, stageOf, type WorkStage } from './workStages';

/**
 * Questions made by the 스페이스기전 AI from what the game knows of the player (ours, at the user's
 * request: docs/ref-game/08-knowledge.md §6). Three kinds: a work card like the written ones
 * (careerEvents.ts), a question on one of life's big moments, and one on what the player found in
 * the career explorer. This file only builds what is sent and checks what comes back; the trip is
 * the program's (src/cloud/isekai3dCloud.ts), and the server checks the same things first
 * (spacekijun supabase/functions/_shared/isekai3dQuestion.ts) — the game trusts neither.
 *
 * Nothing that names the student goes out: the dweller's name becomes `{n}` (a student may have named
 * a dweller after themselves or a friend), and what the player wrote in their own words never does.
 */

export type QuestionKind = 'career' | 'life' | 'explore';
/** Life's big moments that bring a question (§5.1; a fire or a burglary isn't one). */
export type LifeEvent = 'firstJob' | 'childBorn' | 'parentDied' | 'retired';
export const LIFE_EVENT_LABEL: Record<LifeEvent, string> = {
  firstJob: '첫 직장',
  childBorn: '아이의 탄생',
  parentDied: '부모님을 떠나보냄',
  retired: '은퇴',
};
/** 참고 게임's job performance sizes (loot_JobPerformance Gain 7/15/25, Loss -10/-20). */
export const PERF_SIZES = [-20, -10, 0, 7, 15, 25];
/** Moods a gamble may hope for: the good ones, not the romantic one (§5.5). */
const MOODS: EmotionKey[] = (Object.keys(EMOTIONS) as EmotionKey[]).filter((e) => EMOTIONS[e].polarity === 'positive' && e !== 'flirty');
const COMMON_SKILLS: SkillKey[] = SKILL_GROUPS[0].keys;

export const careerContextKey = (job: Pick<Job, 'careerId' | 'level'>) => `career:${job.careerId}:${job.level}`;
export const lifeContextKey = (e: LifeEvent) => `life:${e}`;
export const EXPLORE_KEY = 'explore';

/** A question to think about (life, explore): the player picks an option, writes their own, or skips. */
export interface ThinkCard {
  text: string;
  options: string[];
}
/** One waiting for the player (GameState.thoughts). */
export interface Thought {
  id: string;
  kind: 'life' | 'explore';
  dwellerId: number;
  event?: LifeEvent;
  card: ThinkCard;
  at: number;
}

const keyed = (keys: SkillKey[]) => keys.filter((k) => SKILL_INFO[k]).map((key) => ({ key, label: SKILL_INFO[key].label }));
const emotionLabel = (e: EmotionKey) => EMOTIONS[e]?.levels[0] ?? '';
const AGE_LABEL: Record<string, string> = { baby: '아기', toddler: '유아', child: '어린이', teen: '청소년', elder: '노인' };

/** The dweller's name, and their old ones, out of a line (→ `{n}`). */
export function anonymise(text: string, names: string[]): string {
  let out = text.replace(/^[^·:]{1,12}·/, '{n}·');
  for (const n of names.filter((x) => x && x.length >= 1)) out = out.split(n).join('{n}');
  return out;
}

function dwellerContext(dweller: Dweller) {
  return {
    traits: dweller.traits.map((t) => TRAIT_BY_ID[t]?.label).filter((x): x is string => !!x).slice(0, 6),
    emotion: emotionLabel(dweller.emotion),
    age: AGE_LABEL[dweller.age ?? ''] ?? '어른',
  };
}

/** The stage keys sent for a work card (and kept with the question on 스페이스기전). */
const STAGE_KEY: Record<WorkStage, string> = { 0: 'junior', 1: 'expert', 2: 'leader' };

/**
 * Asked of the AI for the pilot's careers (workRoles.ts): the card may carry `insight`, shown after the answer. The
 * server may ignore this: no insight then, and nothing else changes.
 */
export const INSIGHT_ASK = '카드에 insight를 넣어도 된다: 현장에서는 보통 어떻게 하는지 한 문장. "현장에서는 보통" 다음에 이어질 말로 쓰고, 정답 판정이 아니며 어느 답도 틀렸다고 하지 않는다. 확실하지 않으면 넣지 않는다.';

/**
 * What the player has shown (insights, a few recent answers), for this dweller in this game, without
 * names. For a work card, only the answers given at the same stage of the job: what a junior chose
 * says little about a question for a leader.
 */
function known(k: PlayerKnowledge | undefined, dweller: Dweller, careerId: string | undefined, game: string | undefined, job?: Job) {
  const mine = knowledgeFor(k, dweller.id, careerId ?? '', game);
  const sameStage = (tags: string[]) => {
    const lvl = Number(tags.find((t) => t.startsWith('lvl:'))?.slice(4));
    return !job || (Number.isFinite(lvl) && stageOf({ ...job, level: lvl }).stage === stageOf(job).stage);
  };
  const recent = careerId ? mine.episodes.filter((e) => sameStage(e.tags)) : (k?.episodes ?? []).filter((e) => e.tags.some((t) => t.startsWith('q:')));
  return {
    insights: mine.insights.map((i) => i.txt).slice(-8),
    recent: recent.slice(-6).map((e) => anonymise(e.txt, [dweller.name])),
  };
}

/** The request for a batch of work cards for this dweller's job and rung. */
/**
 * The request for a batch of work cards for this dweller's job and rung: the rung's title and pay, and
 * where it sits — its stage (입문 learning beside a senior, 전문 the branch's own work, 리더 leading
 * people, workStages.ts), its branch, and the work done at that stage there — so the AI asks what
 * fits someone at that point of the job (at the user's request).
 */
export function careerRequest(dweller: Dweller, job: Job, k: PlayerKnowledge | undefined, avoid: string[], game?: string, follow?: { text: string; answer: string }) {
  const career = CAREER_BY_ID[job.careerId];
  const profile = SKILL_PROFILES[job.careerId];
  // The job's own competencies: its main and base, the branch's, and at the top of the branch what it leads with.
  const branch = job.branch === undefined ? undefined : profile?.branches[job.branch];
  const skills = profile ? [profile.main, profile.base, ...(branch ? [branch.skill, ...(branch.top && stageOf(job).stage === 2 ? [branch.top] : [])] : [])] : [];
  // levelOf knows the branch's rungs (career.levels holds only the shared ones).
  const lvl = levelOf(job);
  const at = stageOf(job);
  const work = stageActionsAt(job.careerId, at).map((a) => a.label);
  const info = stageInfo(at, job.careerId);
  return {
    kind: 'career' as const,
    contextKey: careerContextKey(job),
    context: {
      career: {
        id: job.careerId,
        label: career.name,
        level: job.level,
        levelLabel: lvl?.title ?? '',
        dailyPay: lvl?.pay ?? 0,
        skills: keyed([...new Set(skills)]),
        rung: `${job.level + 1}/${topLevelOf(job) + 1}`,
        stage: { key: STAGE_KEY[at.stage], label: info.label, desc: info.desc },
        ...(job.branch !== undefined && career.branches?.[job.branch] ? { branch: career.branches[job.branch].name } : {}),
        stageWork: work,
      },
      commonSkills: keyed(COMMON_SKILLS),
      moods: MOODS.map((key) => ({ key, label: emotionLabel(key) })),
      dweller: dwellerContext(dweller),
      ...known(k, dweller, job.careerId, game, job),
      // The last answers shape a card only as a follow-up (at most two in a row, `cardChain`), not every card.
      recent: [] as string[],
      avoid: avoid.slice(-12),
      ...(hasWorkRoles(job.careerId) ? { insight: INSIGHT_ASK } : {}),
      ...(follow ? { follow: { text: anonymise(follow.text, [dweller.name]), answer: anonymise(follow.answer, [dweller.name]).slice(0, 200) } } : {}),
    },
  };
}

export function lifeRequest(dweller: Dweller, event: LifeEvent, k: PlayerKnowledge | undefined, avoid: string[], game?: string) {
  return {
    kind: 'life' as const,
    contextKey: lifeContextKey(event),
    context: { dweller: dwellerContext(dweller), event, ...known(k, dweller, undefined, game), avoid: avoid.slice(-12) },
  };
}

export function exploreRequest(dweller: Dweller, k: PlayerKnowledge | undefined, avoid: string[], game?: string) {
  const fields = (dweller.explored ?? []).map((id) => CAREER_FIELDS.find((f) => f.id === id)?.label).filter((x): x is string => !!x);
  const leanings = [...new Set(dweller.traits.flatMap((t) => TRAIT_TYPES[t] ?? []))].map((w) => WORK_TYPES[w].label);
  return {
    kind: 'explore' as const,
    contextKey: EXPLORE_KEY,
    context: { dweller: dwellerContext(dweller), explored: fields.slice(-10), leanings, ...known(k, dweller, undefined, game), avoid: avoid.slice(-12) },
  };
}

// ---- checking what came back (the server checked it too; this is the game's own word) ----

const BANNED = ['감전', '죽', '자살', '자해', '살해', '시체', '음주', '술자리', '술을', '소주', '맥주', '담배', '마약', '약물', '도박', '연애', '데이트', '키스', '이혼', '바람피', '질투', '무기', '총기', '칼부림'];
/** A `{…}` the game can't fill (another numbered place `{2:가}`, a particle form `{n:으로}`). */
const STRAY_MARK = /\{(?!n\}|n:(?:이\/가|은\/는|을\/를|와\/과)\})/;
const text = (v: unknown, min: number, max: number): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.replace(/\s+/g, ' ').trim();
  // English words in the Korean (an abbreviation like CT is fine)
  return t.length >= min && t.length <= max && !BANNED.some((w) => t.includes(w)) && !STRAY_MARK.test(t) && !/[a-z]{4,}/.test(t) ? t : null;
};

function outcome(raw: unknown, pay: number, lose: boolean): EventOutcome | null {
  const o = (raw ?? {}) as Record<string, unknown>;
  const t = text(o.text, 4, 150);
  const perf = Number(o.perf);
  if (!t || !PERF_SIZES.includes(perf) || (lose && perf > -10)) return null;
  const money = o.money === undefined || o.money === null ? 0 : Number(o.money);
  if (!Number.isInteger(money) || money < -0.5 * pay || money > pay) return null;
  return { text: t, perf, ...(money ? { money } : {}), buff: lose ? 'careerOops' : perf >= 15 ? 'careerWin' : undefined };
}

const APPROACHES: Approach[] = ['self', 'together', 'safe'];

/** A work card from the AI as one of ours (id `ai:<question id>`), or null if anything is off. */
export function toCareerEvent(id: string, raw: unknown, job: Job): CareerEvent | null {
  const card = (raw ?? {}) as Record<string, unknown>;
  const career = CAREER_BY_ID[job.careerId];
  // A task card: the situation, the question, two or three hints and an example (no choices).
  if (card.type === 'task') {
    const situation = text(card.text, 20, 260);
    const ask = text(card.ask, 8, 120);
    const example = text(card.example, 10, 220);
    const hints = Array.isArray(card.hints) ? card.hints.map((h) => text(h, 5, 90)) : [];
    if (!career || !situation || !ask || !example || hints.length < 2 || hints.length > 3 || hints.some((h) => !h)) return null;
    const note = text(card.insight, 8, 120);
    return { id: `ai:${id}`, careers: [job.careerId], minLevel: job.level, maxLevel: job.level, text: situation, choices: [], task: { ask, hints: hints as string[], example }, ...(note ? { insight: note } : {}) };
  }
  const pay = career?.levels[Math.min(job.level, career.levels.length - 1)]?.pay ?? 0;
  const situation = text(card.text, 20, 260);
  // A situation may leave the dweller's name out; a mark the game can't fill is caught by `text`.
  // Three ways (on one's own, together, the safe road); cards made before then had two.
  if (!career || !situation || !Array.isArray(card.choices) || card.choices.length < 2 || card.choices.length > 3) return null;
  const choices: EventChoice[] = [];
  for (const c of card.choices as Record<string, unknown>[]) {
    const label = text(c?.label, 2, 40);
    const win = outcome(c?.win, pay, false);
    if (!label || !win) return null;
    const choice: EventChoice = { label, win };
    if (APPROACHES.includes(c.approach as Approach)) choice.approach = c.approach as Approach;
    // A line that doesn't pass is left off; the card stands without it.
    const said = text(c.insight, 8, 120);
    if (said) choice.insight = said;
    if (c.lose !== undefined && c.lose !== null) {
      const lose = outcome(c.lose, pay, true);
      const need = Number(c.need ?? 4);
      if (!lose || !(typeof c.skill === 'string' && c.skill in SKILL_INFO) || !Number.isInteger(need) || need < 1 || need > 10) return null;
      Object.assign(choice, { skill: c.skill as SkillKey, need, lose });
      if (MOODS.includes(c.mood as EmotionKey)) choice.mood = c.mood as EmotionKey;
    }
    choices.push(choice);
  }
  if (choices.every((c) => !c.lose && c.win.perf >= 15) || new Set(choices.map((c) => c.label)).size !== choices.length) return null;
  if (choices.length === 3 && new Set(choices.map((c) => c.approach)).size !== 3) return null;
  // The safe road isn't always last: the order follows the card (the same card, the same order).
  let seed = [...id].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) | 0, 7);
  const shuffled = [...choices];
  for (let i = shuffled.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1103515245) + 12345) | 0;
    const j = Math.abs(seed) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const major = text(card.major, 2, 12);
  const note = text(card.insight, 8, 120);
  return { id: `ai:${id}`, careers: [job.careerId], minLevel: job.level, maxLevel: job.level, text: situation, choices: shuffled, ...(major ? { major } : {}), ...(note ? { insight: note } : {}) };
}

export function toThinkCard(raw: unknown): ThinkCard | null {
  const card = (raw ?? {}) as Record<string, unknown>;
  const t = text(card.text, 15, 160);
  if (!t || !Array.isArray(card.options)) return null;
  const options = card.options.map((o) => text(o, 2, 40));
  if (options.length < 3 || options.length > 4 || options.some((o) => !o) || new Set(options).size !== options.length) return null;
  return { text: t, options: options as string[] };
}

/**
 * The way to 스페이스기전, given to the game by the program it runs in (src/cloud/isekai3dCloud.ts); none
 * on the dev server or the web. The game asks and goes on: `found` comes later, or never.
 */
export interface CloudPort {
  /** Whether a work card can be had now (signed in, agreed to, today's not used up): if not, the written ones stand in. */
  canMakeCards?(): boolean;
  /** `fresh`: three made now even if some are waiting (an admin testing); otherwise one waiting first. */
  careerCard(req: ReturnType<typeof careerRequest>, found: (id: string, card: unknown) => void, fresh?: boolean): void;
  thought(req: ReturnType<typeof lifeRequest> | ReturnType<typeof exploreRequest>, found: (id: string, card: unknown) => void): void;
  /** The player's (or the dweller's) answer to a question, for the record kept on 스페이스기전. */
  answered(id: string, choice: number | null, text?: string): void;
  /** The player's knowledge changed (an answer): time to keep it. */
  knowledgeChanged(): void;
  /**
   * Work episodes (episodes.ts): the next scene of a dweller's season if one is ready (`found`, else
   * `none`), writing the next one ahead, and the decision kept. Not there away from 스페이스기전.
   */
  episodes?: {
    take(req: unknown, found: (data: { sceneId: string; episodeId: string; idx: number; scene: unknown; outline: unknown }) => void, none: () => void): void;
    fill(req: unknown): void;
    answer(sceneId: string, choice: number | null, text: string | null): void;
  };
}

/** Recent AI questions, so the next batch doesn't say the same things (kept short). */
export function remember(avoid: string[] | undefined, line: string): string[] {
  return [...(avoid ?? []), line.slice(0, 80)].slice(-12);
}
