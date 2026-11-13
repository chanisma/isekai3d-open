import { peopleKindsOf, PREFERENCE_BY_ID, type Liking } from './preferences';
import { isPositiveSentiment, type Relationship } from './relationships';
import type { EmotionKey } from './types';

/**
 * Whether someone says yes to romance (2026-11-01, at the user's request; docs/romance-rejection-research.md):
 * the other person's own say, which the score of the conversation never held (only a sad or angry one
 * ever said no). After 참고 게임's weighted outcomes for asking out and proposing, as one chance: each step harder,
 * the closer they are the likelier, and who they are counts — the people they like, what they think of
 * romance, what the two share. Never certain either way.
 */
const ASKS: Record<string, { base: number; min: number; retryDays: number }> = {
  flirt: { base: 75, min: 0, retryDays: 0 },
  // Just past what opens it, a friend of 30: a little over half say yes.
  askPartner: { base: 52, min: 40, retryDays: 2 },
  propose: { base: 45, min: 60, retryDays: 3 },
};

export const isRomanceAsk = (socialId: string) => socialId in ASKS;
export const refusalDays = (socialId: string) => ASKS[socialId]?.retryDays ?? 0;

const MOOD: Partial<Record<EmotionKey, number>> = { flirty: 10, happy: 5, stressed: -10, uncomfortable: -10, sad: -20, angry: -35 };

interface Person extends Liking {
  emotion: EmotionKey;
}

/** What the other's likes and dislikes make of the one asking, up to ±25 in all. */
export function likingScore(actor: Liking, target: Liking): { score: number; dislikedKind?: string } {
  let score = 0;
  const kinds = peopleKindsOf(actor.traits).map((p) => p.id);
  const dislikedKind = target.dislikes?.find((d) => kinds.includes(d));
  score += (target.likes ?? []).filter((l) => kinds.includes(l)).length * 12;
  score -= (target.dislikes ?? []).filter((d) => kinds.includes(d)).length * 15;
  if (target.likes?.includes('topic_romance')) score += 8;
  if (target.dislikes?.includes('topic_romance')) score -= 12;
  // What they'd do together: both like it, or one can't stand what the other loves.
  const activity = (id: string) => !!PREFERENCE_BY_ID[id] && PREFERENCE_BY_ID[id].kind === 'activity';
  score += (target.likes ?? []).filter((l) => activity(l) && actor.likes?.includes(l)).length * 3;
  score -= (target.likes ?? []).filter((l) => activity(l) && actor.dislikes?.includes(l)).length * 4;
  score -= (target.dislikes ?? []).filter((d) => activity(d) && actor.likes?.includes(d)).length * 4;
  return { score: Math.max(-25, Math.min(25, score)), dislikedKind };
}

/** The chance (0–1) `target` says yes, and what weighed most against it, in words. */
export function romanceAcceptance(socialId: string, rel: Relationship, actor: Person & { id: number; charisma: number }, target: Person & { id: number }, onDate: boolean): { chance: number; against?: string } {
  const ask = ASKS[socialId];
  if (!ask) return { chance: 1 };
  const closeness = Math.min(25, Math.max(0, Math.floor((rel.romance - ask.min) / 5) * 3));
  const friends = rel.friend >= 70 ? 10 : rel.friend >= 50 ? 5 : 0;
  const mood = MOOD[target.emotion] ?? 0;
  const liking = likingScore(actor, target);
  const seriously = socialId !== 'flirt';
  const traits = seriously ? (target.traits?.includes('commitmentIssues') ? -15 : 0) + (target.traits?.includes('romantic') ? 10 : 0) : 0;
  const felt = (rel.sentiments ?? []).filter((s) => s.holder === target.id);
  const feelings = (felt.some((s) => !isPositiveSentiment(s.kind)) ? -20 : 0) + (felt.some((s) => isPositiveSentiment(s.kind)) ? 10 : 0);
  const awkward = rel.mood.awkward < 0 ? -15 : 0;
  const pct = ask.base + closeness + friends + mood + liking.score + traits + feelings + awkward + Math.floor(actor.charisma) * 1.5 + (onDate ? 10 : 0);
  const kindLabel = liking.dislikedKind ? PREFERENCE_BY_ID[liking.dislikedKind]?.label : undefined;
  const reasons: Array<[number, string]> = [
    [mood, '지금은 그럴 기분이 아니래요'],
    [traits, '아직 깊은 관계는 부담스럽대요'],
    [feelings, '아직 마음에 남은 일이 있대요'],
    [awkward, '분위기가 너무 어색했어요'],
    [liking.score, kindLabel ? `${kindLabel}은 끌리지 않는대요` : '서로 잘 맞을지 모르겠대요'],
  ];
  const worst = reasons.reduce((a, b) => (b[0] < a[0] ? b : a));
  return { chance: Math.max(5, Math.min(95, pct)) / 100, ...(worst[0] < 0 ? { against: worst[1] } : {}) };
}
