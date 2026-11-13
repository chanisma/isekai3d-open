import type { FearId } from './fears';
import type { Relationship } from './relationships';
import type { Townie } from './visitors';

/**
 * Colleagues' own lives at work (2026-10-26, at the user's request): each has something they're
 * after at work (`goal`), now and then a worry of their own (one of the fears that go with work),
 * and a footing with each of the others — friends, rivals, a crush — kept from shift to shift like
 * any relationship. Their worries can be heard out (socials `hearOut`, and `deepTalk`), and their
 * good news shared (`shareJoy`, at the user's request: joys as well as fears): someone good with
 * people (공감·배려, 화술) goes to either by themselves.
 */

export interface ColleagueGoal {
  id: string;
  label: string;
  /** What it makes them worry about, more than others. */
  fears: FearId[];
}

export const COLLEAGUE_GOALS: ColleagueGoal[] = [
  { id: 'promotion', label: '이번엔 꼭 승진하기', fears: ['deadEndJob', 'failure', 'imposter'] },
  { id: 'recognition', label: '실력을 인정받기', fears: ['judged', 'imposter', 'stage'] },
  { id: 'ownShop', label: '언젠가 내 가게(회사) 차리기', fears: ['money', 'future'] },
  { id: 'license', label: '자격증 따기', fears: ['failure', 'future'] },
  { id: 'balance', label: '일과 삶의 균형 찾기', fears: ['lonely', 'deadEndJob'] },
  { id: 'mentor', label: '좋은 선배가 되기', fears: ['judged', 'lonely'] },
  { id: 'abroad', label: '해외에서 일해 보기', fears: ['future', 'money'] },
  { id: 'family', label: '가족에게 자랑스러운 사람 되기', fears: ['money', 'failure'] },
  { id: 'friends', label: '마음 맞는 동료 만들기', fears: ['lonely', 'judged'] },
  { id: 'master', label: '이 분야 최고의 장인 되기', fears: ['failure', 'imposter'] },
];
export const GOAL_BY_ID: Record<string, ColleagueGoal> = Object.fromEntries(COLLEAGUE_GOALS.map((g) => [g.id, g]));

/** Colleagues' needs run down at work but never below this (they look after themselves). */
export const COLLEAGUE_NEED_FLOOR = 25;

/** The worries that come with work, for a colleague to carry. */
export const COLLEAGUE_FEARS: FearId[] = ['failure', 'deadEndJob', 'judged', 'lonely', 'future', 'money', 'imposter', 'stage'];
/** Chance a colleague with no worry comes in with one, each shift (their goal's worries twice as likely). */
export const COLLEAGUE_FEAR_CHANCE = 0.15;
/** Chance a colleague's worry passes by itself, each shift. */
export const COLLEAGUE_FEAR_FADE = 0.1;

/** A colleague's goal, drawn once. */
export function drawGoal(rng: () => number): string {
  return COLLEAGUE_GOALS[Math.floor(rng() * COLLEAGUE_GOALS.length) % COLLEAGUE_GOALS.length].id;
}

/**
 * The shift begins: a colleague may bring a worry in (or have let one go). Returns the worry they
 * came in with, if new.
 */
export function shiftWorries(t: Townie, rng: () => number): FearId | null {
  const fears = (t.fears ??= []);
  if (fears.length) {
    if (rng() < COLLEAGUE_FEAR_FADE) {
      t.fears = fears.slice(1);
      if (t.fearProgress) delete t.fearProgress[fears[0]];
    }
    return null;
  }
  if (rng() >= COLLEAGUE_FEAR_CHANCE) return null;
  const goal = t.goal ? GOAL_BY_ID[t.goal] : undefined;
  const pool = [...COLLEAGUE_FEARS, ...(goal?.fears ?? [])];
  const f = pool[Math.floor(rng() * pool.length) % pool.length];
  fears.push(f);
  return f;
}

/** Good news a colleague may come in with, to be shared (their goal's own more likely). */
export interface ColleagueJoy {
  id: string;
  label: string;
  goal?: string;
}
export const COLLEAGUE_JOYS: ColleagueJoy[] = [
  { id: 'praised', label: '어제 한 일이 칭찬받았어요', goal: 'recognition' },
  { id: 'examPassed', label: '시험에 합격했어요', goal: 'license' },
  { id: 'savings', label: '목표한 돈을 다 모았어요', goal: 'ownShop' },
  { id: 'interview', label: '해외 지사 면접 기회가 생겼어요', goal: 'abroad' },
  { id: 'newbie', label: '후배가 고맙다고 편지를 줬어요', goal: 'mentor' },
  { id: 'proud', label: '부모님이 처음으로 일하는 곳을 보러 오신대요', goal: 'family' },
  { id: 'firstMaster', label: '드디어 어려운 기술을 해냈어요', goal: 'master' },
  { id: 'trip', label: '주말에 여행 가기로 했어요', goal: 'balance' },
  { id: 'hobby', label: '새로 시작한 취미가 너무 재밌어요' },
  { id: 'pet', label: '강아지를 입양했어요' },
  { id: 'birthday', label: '오늘이 생일이에요' },
  { id: 'evaluation', label: '이번 평가가 좋게 나왔어요', goal: 'promotion' },
];
export const JOY_BY_ID: Record<string, ColleagueJoy> = Object.fromEntries(COLLEAGUE_JOYS.map((j) => [j.id, j]));
/** Chance a colleague comes in with good news, each shift (kept till it's shared, or the shift's over). */
export const COLLEAGUE_JOY_CHANCE = 0.2;

/** The shift begins: good news from yesterday is old news; maybe there's some today. */
export function shiftJoy(t: Townie, rng: () => number): string | null {
  t.joy = undefined;
  if (rng() >= COLLEAGUE_JOY_CHANCE) return null;
  const pool = [...COLLEAGUE_JOYS, ...COLLEAGUE_JOYS.filter((j) => j.goal && j.goal === t.goal), ...COLLEAGUE_JOYS.filter((j) => j.goal && j.goal === t.goal)];
  t.joy = pool[Math.floor(rng() * pool.length) % pool.length].id;
  return t.joy;
}

export type BondKind = 'close' | 'friendly' | 'rival' | 'crush';

/** How two colleagues stand with each other the first time they work together. */
export function seedBond(rng: () => number, now: number): Pick<Relationship, 'friend' | 'romance'> & { since: number } {
  const r = rng();
  const friend = r < 0.15 ? -35 + rng() * 25 : r < 0.4 ? rng() * 10 : r < 0.85 ? 10 + rng() * 35 : 50 + rng() * 20;
  const romance = rng() < 0.08 ? 10 + rng() * 20 : 0;
  return { friend: Math.round(friend), romance: Math.round(romance), since: now };
}

/** What two colleagues are to each other, if it's worth telling. */
export function bondOf(rel: Pick<Relationship, 'friend' | 'romance'>): BondKind | null {
  if (rel.romance >= 10) return 'crush';
  if (rel.friend <= -10) return 'rival';
  if (rel.friend >= 50) return 'close';
  if (rel.friend >= 25) return 'friendly';
  return null;
}
export const BOND_LABEL: Record<BondKind, string> = { close: '단짝', friendly: '친한 사이', rival: '라이벌', crush: '서로 신경 쓰는 사이' };

/** How strongly someone goes to hear a worried person out of their own accord: 공감·배려 and 화술 (×1 to ×3). */
export function helpPull(skills: Partial<Record<string, number>>): number {
  return Math.min(3, 1 + 0.2 * Math.floor(skills.empathy ?? 0) + 0.1 * Math.floor(skills.charisma ?? 0));
}

/** How much of a worry a good listen eases: a third, more from a listener good with people (to two thirds). */
export function listenShare(skills: Partial<Record<string, number>>, great: boolean): number {
  const k = 1 + 0.08 * Math.floor(skills.empathy ?? 0) + 0.04 * Math.floor(skills.charisma ?? 0);
  return Math.min(2 / 3, (1 / 3) * k * (great ? 1.4 : 1));
}
