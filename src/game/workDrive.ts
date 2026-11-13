import type { WorkTone } from './careers';
import type { EmotionKey, NeedKey, Dweller } from './types';

/**
 * How hard a dweller works on a shift (ours, 2026-10-25, at the user's request — "taking it easy, as
 * usual or working hard isn't something to pick: it should follow the dweller's traits and how they're
 * doing"). It used to be the player's button (참고 게임's work tone); now it comes from the dweller: who they
 * are (a lazy dweller coasts, an ambitious or perfectionist one pushes), how they feel (focused or
 * confident pushes, sad or bored coasts) and what they need (worn out or hungry coasts). 절제력 (self
 * control) keeps them at it. Looked at again every hour of the shift.
 */
const TRAIT_DRIVE: Record<string, number> = {
  lazy: -2,
  ambitious: 1.5,
  perfectionist: 1,
  genius: 0.5,
  active: 0.5,
  geek: 0.3,
  goofball: -0.6,
  childish: -0.6,
  slob: -0.4,
  gloomy: -0.4,
  aspDiligent: 0.6,
  aspFulfilled: 0.8,
  // The research-based traits (2026-10-25, traits.ts §3.6)
  planner: 0.6,
  steadfast: 0.8,
  competitive: 0.6,
  leader: 0.4,
  worrier: 0.3,
  easygoing: -0.4,
  spontaneous: -0.3,
  homebody: -0.2,
};

const MOOD_DRIVE: Partial<Record<EmotionKey, number>> = {
  focused: 1.2,
  confident: 1,
  energized: 1,
  inspired: 0.5,
  happy: 0.3,
  playful: -0.6,
  flirty: -0.4,
  sad: -1.2,
  bored: -1,
  uncomfortable: -0.8,
  dazed: -1,
  embarrassed: -0.5,
  angry: -0.4,
};

/** Needs low enough to drag a shift down, and by how much. */
const NEED_DRAG: Array<[NeedKey, number, number, string]> = [
  ['energy', 20, -1.2, '피곤해서'],
  ['hunger', 20, -1, '배가 고파서'],
  ['bladder', 15, -0.6, '화장실이 급해서'],
  ['hygiene', 15, -0.4, '씻지 못해 찝찝해서'],
  ['fun', 15, -0.5, '지루해서'],
];

const TRAIT_WHY: Record<string, string> = { planner: '계획적', steadfast: '끈기', competitive: '승부욕', leader: '리더형', worrier: '걱정 많음', easygoing: '느긋함', spontaneous: '즉흥적', homebody: '집이 최고', lazy: '게으른 성격', ambitious: '야심', perfectionist: '완벽주의', genius: '천재', active: '활동적', goofball: '장난꾸러기', childish: '철없음', slob: '지저분함', gloomy: '침울함', aspDiligent: '성실함', aspFulfilled: '일의 보람' };
const MOOD_WHY: Partial<Record<EmotionKey, string>> = { focused: '집중', confident: '자신감', energized: '활기', inspired: '영감', happy: '좋은 기분', playful: '장난기', flirty: '설렘', sad: '슬픔', bored: '지루함', uncomfortable: '불편함', dazed: '멍함', embarrassed: '당황', angry: '화' };

export interface Drive {
  tone: WorkTone;
  score: number;
  /** What moved it, strongest first: «야심», «피곤해서». */
  why: string[];
}

export function workDrive(dweller: Pick<Dweller, 'traits' | 'needs' | 'emotion' | 'skills'>, deadEndFear = false): Drive {
  const parts: Array<[number, string]> = [];
  for (const t of dweller.traits) if (TRAIT_DRIVE[t]) parts.push([TRAIT_DRIVE[t], TRAIT_WHY[t] ?? t]);
  const mood = MOOD_DRIVE[dweller.emotion];
  if (mood) parts.push([mood, MOOD_WHY[dweller.emotion] ?? dweller.emotion]);
  for (const [k, below, drag, why] of NEED_DRAG) if (dweller.needs[k] < below) parts.push([drag, why]);
  if (deadEndFear) parts.push([-1, '막다른 직업 같아서']);
  const steady = Math.floor(dweller.skills.selfControl ?? 0) * 0.1;
  if (steady) parts.push([steady, '절제력']);
  const score = parts.reduce((s, [v]) => s + v, 0);
  const tone: WorkTone = score >= 1.5 ? 'hard' : score <= -1.5 ? 'easy' : 'normal';
  // The reasons that pushed it the way it went, the biggest first.
  const sign = tone === 'hard' ? 1 : tone === 'easy' ? -1 : 0;
  const why = parts
    .filter(([v]) => (sign === 0 ? Math.abs(v) >= 0.5 : Math.sign(v) === sign))
    .sort((a, b) => Math.abs(b[0]) - Math.abs(a[0]))
    .slice(0, 3)
    .map(([, w]) => w);
  return { tone, score, why };
}
