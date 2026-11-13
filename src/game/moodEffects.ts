import { SKILL_INFO } from './constants';
import { EMOTION_NEED_DRIVE, EMOTIONS, NEED_LABELS, skillGainTable, type EmotionState } from './emotions';
import type { EmotionKey, Needs, SkillKey } from './types';

/**
 * What a mood does, in one table (2026-11-01, at the user's request): the game's rolls read these numbers and
 * the mood card shows them, so what's on the screen is what happens. Skill gain stays in emotions.ts
 * (from 참고 게임's buffs, docs/ref-game/02 §3.4) and is only read here. 참고 게임's numbers where it has them (scared's bladder,
 * energized's energy); the rest ours, as starting values.
 */
type SocialKind = 'friendly' | 'funny' | 'romance';

export interface MoodEffect {
  /** Added to the chance a piece of work comes off (workSuccess). */
  work?: number;
  /** Added to the score of seeing to someone who's come in (socialOutcome). */
  client?: number;
  /** Added to a conversation's score: when it's the one speaking, and when it's the one spoken to (contextScore). */
  speaking?: Partial<Record<SocialKind, number>>;
  spokenTo?: Partial<Record<SocialKind, number>>;
  /** Friendship lost when a word goes wrong is multiplied by this. */
  fallingOut?: number;
  /** Needs fall at this rate. */
  decay?: Partial<Needs>;
  /** Walks at this rate. */
  walk?: number;
  /** What's said for it in a notice: «… (화가 나 있어서)». */
  because: string;
}

export const MOOD_EFFECTS: Record<EmotionKey, MoodEffect> = {
  fine: { because: '' },
  happy: { work: 0.02, client: 3, speaking: { friendly: 5 }, spokenTo: { friendly: 5 }, decay: { fun: 0.9 }, because: '기분이 좋아서' },
  confident: { work: 0.03, client: 3, speaking: { friendly: 3, funny: 5 }, because: '자신감이 넘쳐서' },
  energized: { work: 0.02, walk: 1.1, because: '활기가 넘쳐서' },
  flirty: { work: -0.02, speaking: { romance: 7 }, spokenTo: { romance: 5 }, because: '마음이 설레서' },
  focused: { work: 0.05, because: '집중이 잘돼서' },
  inspired: { work: 0.02, because: '영감이 떠올라서' },
  playful: { work: -0.03, speaking: { funny: 5 }, spokenTo: { funny: 4 }, because: '장난기가 돌아서' },
  sad: { work: -0.1, client: -3, speaking: { friendly: -3, funny: -7 }, spokenTo: { romance: -12 }, decay: { hunger: 0.85 }, walk: 0.9, because: '마음이 가라앉아서' },
  angry: { work: -0.12, client: -6, speaking: { friendly: -6, funny: -5, romance: -8 }, spokenTo: { friendly: -9, funny: -5, romance: -20 }, fallingOut: 1.5, decay: { energy: 1.15 }, because: '화가 나 있어서' },
  bored: { work: -0.06, client: -2, speaking: { friendly: -2 }, decay: { fun: 1.2 }, because: '지루해서' },
  embarrassed: { work: -0.08, client: -4, speaking: { friendly: -4, romance: -10 }, because: '당황해서' },
  stressed: { work: -0.12, client: -3, speaking: { friendly: -5, romance: -3 }, spokenTo: { friendly: -2 }, decay: { hunger: 1.1, energy: 1.1 }, because: '스트레스를 받아서' },
  uncomfortable: { work: -0.08, client: -2, speaking: { friendly: -2 }, spokenTo: { funny: -5 }, because: '몸이 불편해서' },
  dazed: { work: -0.15, client: -4, speaking: { friendly: -3, funny: -3 }, decay: { energy: 1.1 }, walk: 0.8, because: '정신이 멍해서' },
  scared: { work: -0.1, client: -3, speaking: { friendly: -3 }, decay: { bladder: 2 }, walk: 1.15, because: '겁에 질려서' },
};

export const moodWork = (e: EmotionKey) => MOOD_EFFECTS[e]?.work ?? 0;
export const moodClient = (e: EmotionKey) => MOOD_EFFECTS[e]?.client ?? 0;
export const moodWalk = (e: EmotionKey) => MOOD_EFFECTS[e]?.walk ?? 1;
export const moodDecay = (e: EmotionKey, k: keyof Needs) => MOOD_EFFECTS[e]?.decay?.[k] ?? 1;
export const moodFallingOut = (e: EmotionKey) => MOOD_EFFECTS[e]?.fallingOut ?? 1;
export const moodSpeaking = (e: EmotionKey, kind: SocialKind) => MOOD_EFFECTS[e]?.speaking?.[kind] ?? 0;
export const moodSpokenTo = (e: EmotionKey, kind: SocialKind) => MOOD_EFFECTS[e]?.spokenTo?.[kind] ?? 0;

/** Why a word went as it did, if a mood had a real part in it: who, and how they felt. Under 3 points isn't said. */
export function moodReason(kind: string, actor: { name: string; emotion: EmotionKey }, target: { name: string; emotion: EmotionKey }, outcome: 'great' | 'fail'): string | null {
  if (kind !== 'friendly' && kind !== 'funny' && kind !== 'romance') return null;
  const sides = [
    { who: actor, score: moodSpeaking(actor.emotion, kind) },
    { who: target, score: moodSpokenTo(target.emotion, kind) },
  ];
  const sign = outcome === 'great' ? 1 : -1;
  const best = sides.filter((s) => s.score * sign >= 3).sort((a, b) => b.score * sign - a.score * sign)[0];
  return best ? `${best.who.name}: ${MOOD_EFFECTS[best.who.emotion].because}` : null;
}

export type EffectArea = 'life' | 'behaviour' | 'relation' | 'work' | 'skill';
export const AREA_LABEL: Record<EffectArea, { icon: string; label: string }> = {
  life: { icon: '🏠', label: '생활' },
  behaviour: { icon: '🚶', label: '행동' },
  relation: { icon: '💬', label: '관계' },
  work: { icon: '💼', label: '근무' },
  skill: { icon: '📈', label: '스킬' },
};
export interface EffectLine {
  area: EffectArea;
  text: string;
  good: boolean;
}

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
const KIND_NAME: Record<SocialKind, string> = { friendly: '친근한 대화', funny: '농담', romance: '로맨스' };

/** A skill-gain table's entries, grouped by multiplier: «전체 ×1.2», «논리·요리 ×0.8». */
function skillLines(state: EmotionState): EffectLine[] {
  const table = skillGainTable(state.emotion);
  if (!table) return [];
  const byRate = new Map<number, string[]>();
  let all: number | undefined;
  for (const [k, levels] of Object.entries(table) as Array<[SkillKey | 'all', number[]]>) {
    const rate = levels[Math.min(state.intensity, levels.length - 1)];
    if (k === 'all') all = rate;
    else if (rate !== 1) byRate.set(rate, [...(byRate.get(rate) ?? []), SKILL_INFO[k]?.label ?? k]);
  }
  const out: EffectLine[] = [];
  if (all !== undefined && all !== 1) out.push({ area: 'skill', text: `스킬 전체 ×${all}`, good: all > 1 });
  for (const [rate, names] of byRate) out.push({ area: 'skill', text: `${names.slice(0, 3).join('·')}${names.length > 3 ? ` 외 ${names.length - 3}` : ''} ×${rate}`, good: rate > 1 });
  return out;
}

/** What the mood does now, for the mood card: every line from the numbers the game itself goes by. */
export function moodEffectLines(state: EmotionState): EffectLine[] {
  const e = MOOD_EFFECTS[state.emotion];
  if (!e) return [];
  const lines: EffectLine[] = [];
  for (const [k, rate] of Object.entries(e.decay ?? {}) as Array<[keyof Needs, number]>) lines.push({ area: 'life', text: `${NEED_LABELS[k]} ${rate < 1 ? `${Math.round((1 - rate) * 100)}% 천천히` : `${Math.round((rate - 1) * 100)}% 빨리`} 줄어요`, good: rate < 1 });
  if (state.emotion === 'energized') lines.push({ area: 'life', text: `에너지 ${state.intensity >= 1 ? '40' : '25'}% 천천히 줄어요`, good: true });
  if (e.walk) lines.push({ area: 'behaviour', text: `걸음 ${e.walk > 1 ? `${Math.round((e.walk - 1) * 100)}% 빠름` : `${Math.round((1 - e.walk) * 100)}% 느림`}`, good: e.walk > 1 });
  for (const [k, rate] of Object.entries(EMOTION_NEED_DRIVE[state.emotion] ?? {}) as Array<[keyof Needs, number]>) lines.push({ area: 'behaviour', text: rate < 1 ? `${NEED_LABELS[k]}을(를) 잘 챙기지 않아요` : `${NEED_LABELS[k]}부터 챙겨요`, good: rate > 1 });
  for (const k of ['friendly', 'funny', 'romance'] as const) {
    if (e.speaking?.[k]) lines.push({ area: 'relation', text: `내가 하는 ${KIND_NAME[k]} ${signed(e.speaking[k]!)}`, good: e.speaking[k]! > 0 });
    if (e.spokenTo?.[k]) lines.push({ area: 'relation', text: `나에게 하는 ${KIND_NAME[k]} ${signed(e.spokenTo[k]!)}`, good: e.spokenTo[k]! > 0 });
  }
  if (e.fallingOut) lines.push({ area: 'relation', text: `말이 어긋나면 우정이 ${e.fallingOut}배 깎여요`, good: false });
  if (e.work) lines.push({ area: 'work', text: `업무 성공 ${signed(Math.round(e.work * 100))}%`, good: e.work > 0 });
  if (e.client) lines.push({ area: 'work', text: `손님 응대 ${signed(e.client)}`, good: e.client > 0 });
  const polarity = EMOTIONS[state.emotion].polarity;
  if (polarity === 'positive') lines.push({ area: 'work', text: '근무 성과가 더 올라요', good: true });
  if (polarity === 'negative') lines.push({ area: 'work', text: `근무 성과 ${[4, 8, 12][Math.min(state.intensity, 2)]} 감소`, good: false });
  return [...lines, ...skillLines(state)];
}
