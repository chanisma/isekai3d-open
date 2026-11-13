import type { Needs, SkillKey } from './types';

/**
 * Lot traits after 참고 게임's (zoneModifier_lotTrait_*, docs/ref-game/14-lot-build.md §9): on a lot with the
 * trait, its skills are learnt ×1.5 (buff_LotMods_BaseGame_*_Hidden skill_tag_modifiers 1.5), and
 * doing them brings a mood (the *_Visible buffs: Homey Happy for 120 minutes, the others while at it).
 * A lot has up to three.
 */
export interface LotTrait {
  id: string;
  label: string;
  icon: string;
  desc: string;
  skills: SkillKey[];
  /** The moodlet doing those skills here brings (emotions.ts BUFFS). */
  buff: string;
  /** What else builds it, by interaction (ours, 2026-11-01: not all a home is lived for is a skill), and how to say so. */
  habits?: string[];
  habitsLabel?: string;
  /** What living in it does besides (ours): needs fall at this rate at home. */
  decayMul?: Partial<Needs>;
}

export const MAX_LOT_TRAITS = 3;
export const LOT_TRAIT_SKILL_MUL = 1.5;

export const LOT_TRAITS: LotTrait[] = [
  { id: 'homey', label: '아늑한 집', icon: '🏠', desc: '요리·손재주·원예·바텐딩이 1.5배 빨리 늘고, 하는 동안 행복해요', skills: ['cooking', 'gourmet', 'handiness', 'gardening', 'mixology'], buff: 'lotHomey' },
  { id: 'convivial', label: '화기애애', icon: '🎉', desc: '카리스마·코미디가 1.5배 빨리 늘고, 어울리는 동안 자신감이 생겨요', skills: ['charisma', 'comedy'], buff: 'lotConvivial' },
  { id: 'naturalLight', label: '자연광', icon: '🌞', desc: '그림·사진이 1.5배 빨리 늘고, 하는 동안 영감이 떠올라요', skills: ['painting', 'photography'], buff: 'lotNaturalLight' },
  { id: 'scienceLair', label: '과학 연구실', icon: '🔬', desc: '논리·로켓 과학이 1.5배 빨리 늘고, 하는 동안 집중해요', skills: ['logic', 'rocketScience'], buff: 'lotScienceLair' },
  { id: 'fastInternet', label: '초고속 인터넷', icon: '⚡', desc: '프로그래밍·비디오 게임·글쓰기가 1.5배 빨리 늘고, 하는 동안 활기차요', skills: ['programming', 'videoGaming', 'writing'], buff: 'lotFastInternet' },
  { id: 'greatAcoustics', label: '훌륭한 음향', icon: '🎵', desc: '기타·피아노·바이올린·노래·디제잉이 1.5배 빨리 늘고, 하는 동안 영감이 떠올라요', skills: ['guitar', 'piano', 'violin', 'singing', 'djMixing'], buff: 'lotGreatAcoustics' },
  { id: 'freshAir', label: '상쾌한 바람', icon: '🍃', desc: '운동이 1.5배 빨리 늘고, 하는 동안 활기차요', skills: ['fitness'], buff: 'lotFreshAir' },
  // Ours (2026-11-01, at the user's request: more kinds of home, not all for learning faster).
  { id: 'cozyNest', label: '포근한 보금자리', icon: '🛏️', desc: '잘 쉬는 집이에요. 에너지가 10% 천천히 줄고, 쉬는 동안 행복해요', skills: [], habits: ['sleep', 'nap', 'relax'], habitsLabel: '자고 쉬기', buff: 'lotCozy', decayMul: { energy: 0.9 } },
  { id: 'tidyHome', label: '정갈한 집', icon: '🧹', desc: '늘 치우는 집이에요. 위생이 20% 천천히 줄고, 치우는 동안 뿌듯해요', skills: [], habits: ['clean', 'washDishes', 'sweepFloor', 'mopFloor', 'vacuumFloor', 'tidyRoom'], habitsLabel: '청소·설거지', buff: 'lotTidy', decayMul: { hygiene: 0.8 } },
  { id: 'warmTable', label: '둘러앉는 식탁', icon: '🍽️', desc: '함께 먹는 집이에요. 배고픔이 10% 천천히 줄고, 차리는 동안 행복해요', skills: [], habits: ['cookFamily', 'grillFamily'], habitsLabel: '가족 식사 차리기', buff: 'lotTable', decayMul: { hunger: 0.9 } },
  { id: 'studyHouse', label: '공부하는 집', icon: '📚', desc: '외국어·법·경영·의학·과학이 1.5배 빨리 늘고, 하는 동안 집중해요', skills: ['language', 'law', 'business', 'medicine', 'science'], habits: ['read', 'homework'], habitsLabel: '독서·숙제', buff: 'lotStudy' },
  { id: 'nearNature', label: '자연과 가까운 집', icon: '🌿', desc: '원예·낚시가 1.5배 빨리 늘고, 재미가 10% 천천히 줄어요', skills: ['gardening', 'fishing'], buff: 'lotNature', decayMul: { fun: 0.9 } },
  { id: 'laughterHome', label: '웃음이 끊이지 않는 집', icon: '😄', desc: '코미디·장난이 1.5배 빨리 늘고, 재미가 15% 천천히 줄어요', skills: ['comedy', 'mischief'], buff: 'lotLaughter', decayMul: { fun: 0.85 } },
  { id: 'warmHeart', label: '마음이 통하는 집', icon: '💛', desc: '공감·리더십이 1.5배 빨리 늘고, 사교 욕구가 15% 천천히 줄어요', skills: ['empathy', 'leadership'], buff: 'lotWarmHeart', decayMul: { social: 0.85 } },
  { id: 'danceHall', label: '춤이 있는 집', icon: '💃', desc: '춤이 1.5배 빨리 늘고, 추는 동안 활기차요', skills: ['dancing'], buff: 'lotDance' },
];

export const LOT_TRAIT_BY_ID: Record<string, LotTrait> = Object.fromEntries(LOT_TRAITS.map((t) => [t.id, t]));

/** The trait (of those given) that speeds up a skill, if any. */
export function traitFor(traits: string[] | undefined, skill: SkillKey): LotTrait | undefined {
  return (traits ?? []).map((id) => LOT_TRAIT_BY_ID[id]).find((t) => t?.skills.includes(skill));
}

/**
 * Earned by living (2026-10-20, at the user's request: the traits were free to switch on in build
 * mode). Time the household spends at home on a trait's skills (game minutes) builds the home's
 * leaning towards it; at `EARN_MINUTES` the home has the trait. The leaning fades each day
 * (`DAILY_FADE`), and a trait no longer lived drops below `LOSE_MINUTES` and goes. The traits a
 * home came with stay; earned ones fill the rest of the three, strongest first.
 */
export const EARN_MINUTES = 600;
export const LOSE_MINUTES = 240;
export const DAILY_FADE = 0.85;

/** Which traits' leaning a minute of an interaction at home builds. */
export function traitsBuiltByHabit(interactionId: string): LotTrait[] {
  return LOT_TRAITS.filter((t) => t.habits?.includes(interactionId));
}

/** Which traits' leaning a minute of `skill` at home builds. */
export function traitsBuiltBy(skill: SkillKey): LotTrait[] {
  return LOT_TRAITS.filter((t) => t.skills.includes(skill));
}

/**
 * The home's traits from what it came with and how it's been lived in: the built-in ones, then
 * earned ones (at or above `EARN_MINUTES`, or above `LOSE_MINUTES` if already had), strongest first,
 * up to three in all.
 */
export function livedTraits(builtIn: string[], affinity: Record<string, number>, had: string[]): string[] {
  const out = builtIn.filter((id) => LOT_TRAIT_BY_ID[id]).slice(0, MAX_LOT_TRAITS);
  const earned = LOT_TRAITS.map((t) => t.id)
    .filter((id) => !out.includes(id))
    .filter((id) => (affinity[id] ?? 0) >= (had.includes(id) ? LOSE_MINUTES : EARN_MINUTES))
    .sort((a, b) => (affinity[b] ?? 0) - (affinity[a] ?? 0));
  return [...out, ...earned].slice(0, MAX_LOT_TRAITS);
}

/** How a trait's skills read in a hint ("요리·손재주·원예"). */
export function traitSkillsLabel(t: LotTrait, label: (k: SkillKey) => string): string {
  return t.skills.map(label).join('·');
}
