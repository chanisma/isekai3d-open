import { moodSpeaking, moodSpokenTo } from './moodEffects';
import type { EmotionKey } from './types';

/**
 * Relationships modelled on 참고 게임 (docs/ref-game/04 §1–2): separate friendship and romance
 * tracks (-100..100), event flags for milestones, a short-lived conversation mood per pair,
 * friendship stages with a 5-point buffer, and decay that pauses for a day after contact.
 */

export type RelFlag = 'partner' | 'engaged' | 'married' | 'bff' | 'enemy';
export type FriendStage = 'despised' | 'disliked' | 'acquaintance' | 'friend' | 'goodFriend';
export type SocialCategory = 'friendly' | 'funny' | 'romance' | 'mean' | 'mischief';

/** Short-term conversation mood (참고 게임 ShortTermContext tracks), each drifting back to 0. */
export interface ConversationMood {
  friendly: number;
  fun: number;
  romance: number;
  /** Negative when things got awkward. */
  awkward: number;
}

export interface Relationship {
  friend: number;
  romance: number;
  /** Game minute of the last change; decay waits a day after it. */
  lastChange: number;
  flags: RelFlag[];
  stage: FriendStage;
  mood: ConversationMood;
  /** The last social between the pair and how many times in a row (boredom). */
  recent: { socialId: string; count: number } | null;
  /** Until when a social turned down can't be asked again (romanceAcceptance.ts), by id. */
  refusedUntil?: Record<string, number>;
  /** Lingering feelings one of the pair has about the other (참고 게임 sentiments). */
  sentiments?: Sentiment[];
  /**
   * Game minute the pair met and each flag was gained (ours: a relationship takes time, each stage
   * waits on the one before, `SocialRequirement.after`). Left out = long ago (older saves, families).
   */
  since?: Partial<Record<RelFlag | 'met', number>>;
}

/**
 * Sentiments after 참고 게임 (docs/ref-game/04 §2.8): one-way feelings left by big moments, like
 * closeness after quality time or bitterness after a fight. A short-term sentiment track starts at
 * 100 and decays 0.017 a minute (about 4 days); long-term ones 0.007 (about 10).
 */
export type SentimentKind = 'close' | 'enamored' | 'adoring' | 'bitter' | 'furious' | 'hurt';
export interface Sentiment {
  kind: SentimentKind;
  /** The dweller who feels it. */
  holder: number;
  label: string;
  until: number;
}
export const SHORT_SENTIMENT = Math.round(100 / 0.017);
export const LONG_SENTIMENT = Math.round(100 / 0.007);
export const SENTIMENT_ICON: Record<SentimentKind, string> = { close: '🤝', enamored: '😍', adoring: '🥰', bitter: '😒', furious: '😡', hurt: '💔' };
const POSITIVE: SentimentKind[] = ['close', 'enamored', 'adoring'];

export function isPositiveSentiment(kind: SentimentKind): boolean {
  return POSITIVE.includes(kind);
}

/** Adds (or refreshes) `holder`'s sentiment, replacing any of the same kind they already had. */
export function addSentiment(rel: Relationship, holder: number, kind: SentimentKind, label: string, now: number, long = false) {
  rel.sentiments = (rel.sentiments ?? []).filter((s) => !(s.holder === holder && s.kind === kind));
  rel.sentiments.push({ kind, holder, label, until: now + (long ? LONG_SENTIMENT : SHORT_SENTIMENT) });
}

/**
 * How `holder`'s sentiments colour a social: good feelings help friendly and romantic ones,
 * bad feelings spoil them and egg on mean ones (ours, after 참고 게임's sentiment bit preferences:
 * Close +8, Bitter -10, Furious -15).
 */
export function sentimentContext(rel: Relationship, holder: number, category: SocialCategory): number {
  let s = 0;
  for (const x of rel.sentiments ?? []) {
    if (x.holder !== holder) continue;
    const good = isPositiveSentiment(x.kind);
    if (category === 'mean') s += good ? -8 : 8;
    else s += good ? 8 : x.kind === 'furious' ? -15 : -10;
  }
  return s;
}

/** Free will's appetite for socialising with someone given how `holder` feels about them (ours). */
export function sentimentAppeal(rel: Relationship, holder: number, category: SocialCategory): number {
  let m = 1;
  for (const x of rel.sentiments ?? []) {
    if (x.holder !== holder) continue;
    const good = isPositiveSentiment(x.kind);
    if (category === 'mean') m *= good ? 0.5 : 1.5;
    else m *= good ? 1.3 : 0.5;
  }
  return m;
}

export function newRelationship(friend: number, romance: number, now: number): Relationship {
  return {
    friend,
    romance,
    lastChange: now,
    flags: [],
    stage: friendStage(friend, 'acquaintance'),
    mood: { friendly: 0, fun: 0, romance: 0, awkward: 0 },
    recent: null,
    since: { met: now },
  };
}

/** Friendship stage from LTR_Friendship_Main: gained at the threshold, lost 5 points past it. */
export function friendStage(v: number, prev: FriendStage): FriendStage {
  if (v <= -70 || (prev === 'despised' && v <= -65)) return 'despised';
  if (v <= -20 || ((prev === 'disliked' || prev === 'despised') && v <= -15)) return 'disliked';
  if (v >= 60 || (prev === 'goodFriend' && v >= 55)) return 'goodFriend';
  if (v >= 35 || ((prev === 'friend' || prev === 'goodFriend') && v >= 30)) return 'friend';
  return 'acquaintance';
}

const STAGE_LABEL: Record<FriendStage, string> = {
  despised: '혐오',
  disliked: '싫어함',
  acquaintance: '지인',
  friend: '친구',
  goodFriend: '좋은 친구',
};

/** A compact take on 참고 게임's friendship × romance label table. */
export function relationshipLabel(rel: Relationship): string {
  const parts: string[] = [];
  if (rel.flags.includes('enemy')) parts.push('원수');
  else if (rel.flags.includes('bff')) parts.push('베프');
  else parts.push(STAGE_LABEL[rel.stage]);
  if (rel.flags.includes('married')) parts.push('배우자');
  else if (rel.flags.includes('engaged')) parts.push('약혼자');
  else if (rel.flags.includes('partner')) parts.push('연인');
  else if (rel.romance >= 50) parts.push('사랑에 빠짐');
  else if (rel.romance >= 25) parts.push('썸');
  else if (rel.romance >= 10) parts.push('호감');
  else if (rel.romance <= -10) parts.push('어색함');
  return parts.join(' · ');
}

export type Tier = 'S' | 'M' | 'L' | 'H' | '-S' | '-M' | '-L';

/** Band edges for the diminishing gain tables. */
const BANDS = [-40, 0, 20, 40, 80];
const FRIEND_GAIN: Record<Exclude<Tier, 'H'>, number[]> = {
  S: [4, 2, 1.5, 1, 0.5, 0.5],
  M: [8, 6, 2.5, 2, 1.5, 1],
  L: [16, 12, 8, 6, 4, 2],
  '-S': [-2, -2, -2, -2, -3, -4],
  '-M': [-5, -5, -5, -7, -7, -11],
  '-L': [-5, -5, -5, -10, -10, -15],
};
const ROMANCE_GAIN: Record<Tier, number[]> = {
  S: [6, 4, 2, 1.5, 1, 0.5],
  M: [10, 6, 4, 3, 2, 1],
  L: [18, 12, 6, 4.5, 3, 1.5],
  H: [35, 30, 20, 15, 8, 5],
  '-S': [-2, -2, -2, -2, -2, -2],
  '-M': [-4, -4, -4, -4, -4, -4],
  '-L': [-6, -6, -6, -6, -6, -6],
};
/**
 * Our socials run 6–25 minutes, much longer than one 참고 게임 mixer, so each outcome counts for
 * a bit more than the raw table (docs/ref-game/04 §5 suggests 1.5–2).
 */
export const OUTCOME_SCALE = 1.5;

function band(v: number): number {
  let i = 0;
  while (i < BANDS.length && v > BANDS[i]) i++;
  return i;
}

/** How much a track moves for an outcome tier, given where it stands now (gains shrink as it grows). */
export function trackDelta(track: 'friend' | 'romance', value: number, tier: Tier): number {
  const table = track === 'friend' ? (FRIEND_GAIN as Record<string, number[]>)[tier === 'H' ? 'L' : tier] : ROMANCE_GAIN[tier];
  return table[band(value)] * OUTCOME_SCALE;
}

/** Per-day decay toward 0 by band (LTR_*_Main interval decay rates). */
function friendDecayPerDay(v: number): number {
  if (v <= -70) return 4;
  if (v <= -20) return 2.5;
  if (v < 35) return 1;
  if (v < 60) return 1.5;
  return 1;
}
function romanceDecayPerDay(v: number): number {
  if (v <= -50) return 2;
  if (v < 0) return 1;
  if (v < 25) return 3;
  if (v < 50) return 4;
  if (v < 75) return 5;
  return 6;
}

const DECAY_DELAY = 1440;
const MOOD_DECAY = 0.55;

function toward(v: number, step: number): number {
  return v > 0 ? Math.max(0, v - step) : Math.min(0, v + step);
}

/** Advances decay and the conversation mood by dt minutes; returns the friendship stage before. */
export function tickRelationship(rel: Relationship, now: number, dt: number, decayMul = 1): FriendStage {
  const before = rel.stage;
  if (now - rel.lastChange > DECAY_DELAY) {
    rel.friend = toward(rel.friend, (friendDecayPerDay(rel.friend) / 1440) * dt * decayMul);
    rel.romance = toward(rel.romance, (romanceDecayPerDay(rel.romance) / 1440) * dt * decayMul);
  }
  for (const k of ['friendly', 'fun', 'romance', 'awkward'] as const) rel.mood[k] = toward(rel.mood[k], MOOD_DECAY * dt);
  rel.stage = friendStage(rel.friend, rel.stage);
  // Best friends ends at friendship ≤ 10, enemies at ≥ -10 (참고 게임 remove_on_threshold).
  if (rel.flags.includes('bff') && rel.friend <= 10) rel.flags = rel.flags.filter((f) => f !== 'bff');
  if (rel.flags.includes('enemy') && rel.friend >= -10) rel.flags = rel.flags.filter((f) => f !== 'enemy');
  return before;
}

/**
 * How much free will wants to socialise with this dweller (참고 게임 relationship ad_data: -100→0,
 * 0→1, 35→1.5, 100→1.75), ×1.75 for a partner or fiancé(e).
 */
export function relationshipUtility(rel: Relationship): number {
  const f = rel.friend;
  let u: number;
  if (f <= 0) u = Math.max(0, 1 + f / 100);
  else if (f <= 35) u = 1 + (f / 35) * 0.5;
  else u = 1.5 + ((f - 35) / 65) * 0.25;
  if (rel.flags.includes('partner') || rel.flags.includes('engaged')) u *= 1.75;
  return u;
}

function friendBand(f: number): number {
  if (f <= -70) return -8;
  if (f <= -30) return -4;
  if (f <= -15) return -2;
  if (f < 25) return 0;
  if (f < 60) return 5;
  return 8;
}

function romanceBand(r: number): number {
  if (r <= -50) return -6;
  if (r < 0) return -3;
  if (r < 20) return 1;
  if (r < 50) return 3;
  return 25;
}

/**
 * Context score deciding a social's outcome, condensed from 참고 게임's TestBasedScore tables
 * (docs/ref-game/04 §2.2): conversation mood, relationship bands, both dwellers' emotions and
 * charisma. Above a social's `great` line it lands well, at or below `fail` it flops.
 */
export function contextScore(
  category: SocialCategory,
  rel: Relationship,
  actor: { emotion: EmotionKey; charisma: number; empathy?: number },
  target: { emotion: EmotionKey },
): number {
  const m = rel.mood;
  let s = 0;
  if (category === 'mean') {
    if (actor.emotion === 'angry') s += 12;
    if (target.emotion === 'angry') s += 8;
    return s;
  }
  if (category === 'mischief') {
    // Pranks land on someone in a playful mood, not on someone already cross (ours).
    s += m.fun >= 25 ? 5 : m.fun <= -25 ? -5 : 0;
    if (actor.emotion === 'playful') s += 8;
    if (target.emotion === 'playful') s += 5;
    if (target.emotion === 'angry') s -= 12;
    if (target.emotion === 'sad') s -= 6;
    return s;
  }
  if (category === 'romance') {
    s += m.romance >= 75 ? 12 : m.romance >= 50 ? 7 : m.romance >= 25 ? 5 : 0;
    if (m.awkward < 0) s -= 23;
    s += friendBand(rel.friend) + romanceBand(rel.romance);
    s += moodSpeaking(actor.emotion, 'romance') + moodSpokenTo(target.emotion, 'romance');
    s += Math.min(12, Math.floor(actor.charisma) * 1.5);
    return s;
  }
  if (category === 'funny') {
    s += m.fun >= 75 ? 12 : m.fun >= 25 ? 6 : m.fun <= -25 ? -6 : 0;
    if (m.friendly >= 25) s += 4;
    if (rel.friend >= 60) s += 5;
    s += moodSpeaking(actor.emotion, 'funny') + moodSpokenTo(target.emotion, 'funny');
    s += Math.floor(actor.charisma);
    return s;
  }
  // friendly
  if (m.friendly >= 25) s += 6;
  if (m.fun <= -25) s -= 6;
  if (m.awkward < 0) s -= 3;
  s += friendBand(rel.friend);
  s += moodSpeaking(actor.emotion, 'friendly') + moodSpokenTo(target.emotion, 'friendly');
  s += Math.floor(actor.charisma / 2);
  // Ours: a dweller who listens well lands warm talk better.
  s += Math.floor((actor.empathy ?? 0) / 2);
  return s;
}

/** Negative emotions that make a dweller refuse affection (참고 게임: not Sad/Angry for kisses). */
export function refusesAffection(e: EmotionKey): boolean {
  return e === 'angry' || e === 'sad';
}
