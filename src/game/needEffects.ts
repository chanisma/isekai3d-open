import { NEED_LABELS } from './emotions';
import type { NeedKey, SkillKey } from './types';

/**
 * What a need's state does, besides the mood it brings (2026-11-01, at the user's request;
 * docs/wants-store-mood-research.md): the body's own consequences, one table the game's rolls and the
 * panel both read. Bands as the need moodlets': low under 25, critical under 12.5, and full from 80.
 * Moods (moodEffects.ts) are how they feel about it; this is what it does whatever they feel.
 */
export interface NeedEffect {
  /** What it's called in the panel. */
  state: string;
  /** Added to the chance a piece of work comes off. */
  work?: number;
  /** Added to the score of whatever they say to anyone. */
  speaking?: number;
  /** Added to the score of seeing to a client. */
  client?: number;
  /** Added to the chance (in points of 100) someone says yes to their romance. */
  romance?: number;
  /** Walks at this rate. */
  walk?: number;
  /** Learns everything at this rate. */
  skill?: number;
  /** Learns these at `skillRate`. */
  skills?: SkillKey[];
  skillRate?: number;
  /** Friendship gained is multiplied by this. */
  friendship?: number;
  /** Free will puts off chores. */
  putsOffDuty?: boolean;
  /** What's said in a notice: «… (피곤해서)». */
  because?: string;
}

type Band = 'low' | 'critical' | 'full';
const LOW = 25;
const CRITICAL = 12.5;
const FULL = 80;

const CREATIVE: SkillKey[] = ['painting', 'writing', 'guitar', 'piano', 'violin', 'singing', 'photography', 'cooking'];

export const NEED_EFFECTS: Record<NeedKey, Partial<Record<Band, NeedEffect>>> = {
  hunger: {
    low: { state: '배고픔', work: -0.05, because: '배가 고파서' },
    critical: { state: '굶주림', work: -0.1, walk: 0.9, because: '굶주려서' },
    full: { state: '든든함', skills: ['fitness', 'dancing'], skillRate: 1.1 },
  },
  energy: {
    low: { state: '피곤함', work: -0.08, speaking: -2, walk: 0.9, because: '피곤해서' },
    critical: { state: '탈진', work: -0.15, speaking: -4, client: -2, walk: 0.8, because: '너무 지쳐서' },
    full: { state: '기운이 넘침', skill: 1.1 },
  },
  bladder: {
    low: { state: '급함', work: -0.03, because: '화장실이 급해서' },
    critical: { state: '아주 급함', work: -0.08, speaking: -3, because: '화장실이 너무 급해서' },
  },
  hygiene: {
    low: { state: '꾀죄죄함', speaking: -3, client: -2, romance: -10, because: '몸에서 냄새가 나서' },
    critical: { state: '더러움', speaking: -6, client: -4, romance: -25, because: '너무 지저분해서' },
    full: { state: '말끔함', romance: 5 },
  },
  fun: {
    low: { state: '심심함', work: -0.05, skill: 0.9, because: '의욕이 없어서' },
    critical: { state: '너무 심심함', work: -0.1, skill: 0.8, putsOffDuty: true, because: '아무것도 하기 싫어서' },
    full: { state: '즐거움', skills: CREATIVE, skillRate: 1.1 },
  },
  social: {
    low: { state: '외로움', work: -0.03, friendship: 1.1, because: '사람이 그리워서' },
    critical: { state: '고독함', work: -0.06, friendship: 1.2, because: '너무 외로워서' },
    full: { state: '사람들과 잘 지냄', friendship: 1.1 },
  },
};

interface Needy {
  needs: Record<NeedKey, number>;
}
const KEYS = Object.keys(NEED_EFFECTS) as NeedKey[];

export const needBand = (v: number): Band | null => (v < CRITICAL ? 'critical' : v < LOW ? 'low' : v >= FULL ? 'full' : null);
const effects = (s: Needy) => KEYS.flatMap((k) => {
  const band = needBand(s.needs[k]);
  const e = band ? NEED_EFFECTS[k][band] : undefined;
  return e ? [e] : [];
});
const add = (s: Needy, f: (e: NeedEffect) => number | undefined) => effects(s).reduce((n, e) => n + (f(e) ?? 0), 0);
const mul = (s: Needy, f: (e: NeedEffect) => number | undefined) => effects(s).reduce((n, e) => n * (f(e) ?? 1), 1);

export const needWork = (s: Needy) => add(s, (e) => e.work);
export const needSpeaking = (s: Needy) => add(s, (e) => e.speaking);
export const needClient = (s: Needy) => add(s, (e) => e.client);
export const needRomance = (s: Needy) => add(s, (e) => e.romance);
export const needWalk = (s: Needy) => mul(s, (e) => e.walk);
export const needFriendship = (s: Needy) => mul(s, (e) => e.friendship);
export const needsPutOffDuty = (s: Needy) => effects(s).some((e) => e.putsOffDuty);
export const needSkill = (s: Needy, skill: SkillKey) => mul(s, (e) => (e.skills?.includes(skill) ? e.skillRate : e.skill));

/** The need that's weighing on work most, in words, if any does. */
export function needReason(s: Needy): string | null {
  const worst = effects(s).filter((e) => (e.work ?? 0) < 0 || (e.speaking ?? 0) < 0).sort((a, b) => (a.work ?? 0) + (a.speaking ?? 0) / 100 - (b.work ?? 0) - (b.speaking ?? 0) / 100)[0];
  return worst?.because ?? null;
}

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
function describe(e: NeedEffect): Array<{ text: string; good: boolean }> {
  const out: Array<{ text: string; good: boolean }> = [];
  if (e.work) out.push({ text: `업무 성공 ${signed(Math.round(e.work * 100))}%`, good: e.work > 0 });
  if (e.speaking) out.push({ text: `대화 ${signed(e.speaking)}`, good: e.speaking > 0 });
  if (e.client) out.push({ text: `손님 응대 ${signed(e.client)}`, good: e.client > 0 });
  if (e.romance) out.push({ text: `로맨스 수락 ${signed(e.romance)}%`, good: e.romance > 0 });
  if (e.walk) out.push({ text: `걸음 ${Math.round((1 - e.walk) * 100)}% 느림`, good: false });
  if (e.skill) out.push({ text: `스킬 획득 ×${e.skill}`, good: e.skill > 1 });
  if (e.skills) out.push({ text: `${e.skills.length > 2 ? '창작 스킬' : '운동·춤'} ×${e.skillRate}`, good: true });
  if (e.friendship) out.push({ text: `우정이 ${Math.round((e.friendship - 1) * 100)}% 더 쌓임`, good: true });
  if (e.putsOffDuty) out.push({ text: '집안일을 미룸', good: false });
  return out;
}

export interface NeedLine {
  need: NeedKey;
  label: string;
  /** What state it's in now, and what that does; null when nothing. */
  state: string | null;
  effects: Array<{ text: string; good: boolean }>;
  /** What comes if it goes on falling, when it's close to that (within 10). */
  next: string | null;
}

/** For the needs tab: each need's effect now, and what's coming; from the numbers the game goes by. */
export function needLines(s: Needy): NeedLine[] {
  return KEYS.map((need) => {
    const v = s.needs[need];
    const band = needBand(v);
    const e = band ? NEED_EFFECTS[need][band] : undefined;
    const coming = v >= LOW && v < LOW + 10 ? NEED_EFFECTS[need].low : v >= CRITICAL && v < LOW && v < CRITICAL + 10 ? NEED_EFFECTS[need].critical : undefined;
    return {
      need,
      label: NEED_LABELS[need],
      state: e?.state ?? null,
      effects: e ? describe(e) : [],
      next: coming ? `곧 ${coming.state}: ${describe(coming).map((d) => d.text).join(', ')}` : null,
    };
  });
}
