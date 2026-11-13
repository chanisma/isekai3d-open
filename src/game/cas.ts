import { ACTIVITIES, PEOPLE, PREFERENCE_BY_ID, TOPICS } from './preferences';
import { MAX_TRAITS, TRAITS, TRAIT_BY_ID, conflictsWith, traitFitsAge } from './traits';

/**
 * Making a dweller by answering questions about them, after 참고 게임's CAS Stories (cas/cas_stories_*.py):
 * each answer adds weight to traits and aspirations (`CasStoriesAnswer.weightings`), and the dweller
 * gets the ones that weigh most. 참고 게임's own questions live in client data we don't use; these are
 * ours, about everyday life, so a student can picture the dweller instead of choosing from a list.
 * Likes are ours too (참고 게임 CAS Stories predates likes). The answers only shape the dweller being made;
 * they are not kept as knowledge of the player.
 *
 * Also here: 참고 게임's trait groups in Create a Dweller, and its dice (무작위).
 */
export interface StoryAnswer {
  text: string;
  traits?: Record<string, number>;
  /** Activities (preferences.ts) the dweller will like. */
  likes?: string[];
  /** Aspiration ids (aspirations.ts) and their weight. */
  asp?: Record<string, number>;
}

export interface StoryQuestion {
  id: string;
  icon: string;
  /** Says "이 심은" or "이 심이"; the screen puts the dweller's name there. */
  text: string;
  answers: StoryAnswer[];
}

export const CAS_QUESTIONS: StoryQuestion[] = [
  {
    id: 'dayOff',
    icon: '☀️',
    text: '쉬는 날 아침, 이 캐릭터는…',
    answers: [
      { text: '친구들에게 연락해 약속을 잡아요', traits: { outgoing: 3, moodMaker: 1 }, asp: { popularity: 3 } },
      { text: '읽고 싶던 책을 펼쳐요', traits: { bookworm: 3, homebody: 1 }, likes: ['reading'], asp: { readWorld: 3 } },
      { text: '운동화를 신고 밖으로 나가요', traits: { active: 3, lovesOutdoors: 1 }, likes: ['fitness'], asp: { bodybuilder: 3 } },
      { text: '늦잠을 실컷 자고 느긋하게 보내요', traits: { lazy: 3, easygoing: 1 }, asp: { mindBody: 2 } },
      { text: '가 본 적 없는 동네로 무작정 떠나요', traits: { adventurous: 3, spontaneous: 1 }, likes: ['photography'], asp: { findMyself: 2 } },
    ],
  },
  {
    id: 'homework',
    icon: '📝',
    text: '해야 할 일이 생기면 이 캐릭터는…',
    answers: [
      { text: '계획표부터 짜고 하나씩 지워 나가요', traits: { planner: 3, neat: 1 }, asp: { workC: 2 } },
      { text: '마감 직전에 몰아서 해요', traits: { spontaneous: 2, lazy: 1, childish: 1 } },
      { text: '친구들과 나눠서 같이 해요', traits: { outgoing: 1, loyal: 1, good: 1 }, asp: { popularity: 1 } },
      { text: '나만의 방식으로 색다르게 해 봐요', traits: { creative: 3 }, likes: ['painting'], asp: { painter: 2 } },
      { text: '매일 조금씩, 빠짐없이 해 둬요', traits: { steadfast: 3, perfectionist: 1 }, asp: { careerClimber: 1 } },
      { text: '제일 어려운 문제부터 골라 풀어 봐요', traits: { genius: 3, competitive: 1 }, likes: ['programming'], asp: { exploreSky: 1 } },
    ],
  },
  {
    id: 'friendSad',
    icon: '🤝',
    text: '친구가 힘들어 보이면 이 캐릭터는…',
    answers: [
      { text: '먼저 다가가 이야기를 들어 줘요', traits: { empathetic: 3, good: 1 }, asp: { listenFriend: 3 } },
      { text: '웃긴 이야기로 기분을 풀어 줘요', traits: { goofball: 3, cheerful: 1 }, likes: ['comedy', 'topic_jokes'], asp: { comedian: 3 } },
      { text: '말없이 곁에 있어 줘요', traits: { loyal: 3, shy: 1 }, asp: { warmFamily: 1 } },
      { text: '혼자 있고 싶을 거라고 생각해요', traits: { loner: 3 } },
      { text: '친구보다 내가 먼저 눈물이 나요', traits: { sensitive: 3, empathetic: 1 }, likes: ['writing', 'topic_deep'], asp: { author: 1 } },
    ],
  },
  {
    id: 'best',
    icon: '✨',
    text: '이 캐릭터가 가장 신나는 순간은…',
    answers: [
      { text: '무언가를 내 손으로 만들어 냈을 때', traits: { creative: 1, artLover: 2 }, likes: ['handiness'], asp: { nerdBrain: 3 } },
      { text: '"왜 그럴까?" 하던 걸 알아냈을 때', traits: { curious: 3, genius: 2 }, likes: ['science', 'people_smart'], asp: { exploreSky: 2, computerWhiz: 2 } },
      { text: '시합에서 이겼을 때', traits: { competitive: 3, selfAssured: 1 }, likes: ['videoGaming'], asp: { careerClimber: 2 } },
      { text: '좋아하는 사람들과 함께일 때', traits: { familyOriented: 3, cheerful: 1 }, asp: { warmFamily: 3 } },
      { text: '갖고 싶던 물건을 손에 넣었을 때', traits: { materialistic: 3 }, asp: { fortune: 2 } },
    ],
  },
  {
    id: 'home',
    icon: '🏠',
    text: '이 캐릭터가 집에서 가장 좋아하는 곳은…',
    answers: [
      { text: '맛있는 냄새가 나는 부엌', traits: { foodie: 3 }, likes: ['cooking'], asp: { masterChef: 3 } },
      { text: '음악이 흐르는 거실', traits: { musicLover: 3 }, likes: ['music', 'guitar'], asp: { musician: 3 } },
      { text: '꽃과 채소가 자라는 마당', traits: { lovesOutdoors: 3 }, likes: ['gardening'], asp: { botanist: 3 } },
      { text: '깔끔하게 정리된 내 방', traits: { neat: 3, planner: 1 }, asp: { fortune: 1 } },
      { text: '푹신한 소파와 따뜻한 이불 속', traits: { homebody: 3, lazy: 1 }, asp: { mindBody: 1 } },
      { text: '꼬마 사촌들이 들어오지 못하는 조용한 구석', traits: { hatesChildren: 3, loner: 1 } },
    ],
  },
  {
    id: 'badDay',
    icon: '🌧️',
    text: '기분이 나쁜 날, 이 캐릭터는…',
    answers: [
      { text: '금방 털어 버리고 다시 웃어요', traits: { cheerful: 3, optimist: 1 } },
      { text: '하루 종일 마음에 담아 둬요', traits: { gloomy: 3, sensitive: 1 }, likes: ['writing'], asp: { author: 1 } },
      { text: '화가 확 났다가 금방 풀려요', traits: { hotHeaded: 3 } },
      { text: '맛있는 걸 잔뜩 먹어요', traits: { glutton: 3 } },
      { text: '기분이 날씨처럼 이랬다저랬다 해요', traits: { insane: 3, spontaneous: 1 } },
    ],
  },
  {
    id: 'examNight',
    icon: '📚',
    text: '시험 전날 밤, 이 캐릭터는…',
    answers: [
      { text: '"망치면 어떡하지?" 몇 번이고 다시 확인해요', traits: { worrier: 3, careful: 1 } },
      { text: '"잘될 거야!" 하고 푹 자요', traits: { optimist: 3, easygoing: 1 }, asp: { mindBody: 1 } },
      { text: '한 문제라도 더, 끝까지 붙잡고 있어요', traits: { perfectionist: 3, steadfast: 1 } },
      { text: '단톡방에서 친구들과 서로 응원해요', traits: { moodMaker: 2, outgoing: 1, loyal: 1 }, asp: { popularity: 1 } },
      { text: '이미 다 해 둬서 평소처럼 지내요', traits: { planner: 2, selfAssured: 2 } },
    ],
  },
  {
    id: 'newClass',
    icon: '🏫',
    text: '새 학기 첫날, 처음 보는 반 친구들 사이에서 이 캐릭터는…',
    answers: [
      { text: '먼저 말을 걸고 금세 친해져요', traits: { moodMaker: 2, outgoing: 2 }, asp: { popularity: 2 } },
      { text: '누가 말을 걸어 줄 때까지 조용히 기다려요', traits: { shy: 3 } },
      { text: '반장 선거에 나가 볼까 생각해요', traits: { leader: 3, selfAssured: 1 }, asp: { workE: 2 } },
      { text: '같이 공 찰 친구부터 찾아요', traits: { bro: 3, active: 1 }, likes: ['fitness', 'topic_smallTalk'] },
      { text: '마음에 드는 사람이 있나 슬쩍 둘러봐요', traits: { romantic: 3 }, asp: { soulmate: 3 } },
    ],
  },
  {
    id: 'groupProject',
    icon: '👥',
    text: '조별 과제를 하면 이 캐릭터는…',
    answers: [
      { text: '역할을 나누고 모두를 이끌어요', traits: { leader: 3, planner: 1 }, asp: { workE: 1 } },
      { text: '아무도 안 맡는 일을 묵묵히 해요', traits: { modest: 3, steadfast: 1, good: 1 } },
      { text: '무임승차하는 친구는 꼭 짚고 넘어가요', traits: { fair: 3 } },
      { text: '투덜대면서도 맡은 건 해 와요', traits: { grouch: 3 } },
      { text: '발표 자료를 예쁘게 꾸며요', traits: { artLover: 3, sensitive: 1 }, likes: ['painting'], asp: { workA: 1 } },
      { text: '누가 뭘 하든 크게 신경 쓰지 않아요', traits: { easygoing: 3 } },
    ],
  },
  {
    id: 'suddenPlan',
    icon: '📱',
    text: '친구가 갑자기 "지금 놀러 가자!" 하면 이 캐릭터는…',
    answers: [
      { text: '좋아! 바로 따라나서요', traits: { spontaneous: 3, adventurous: 1 } },
      { text: '어디 가는지, 언제 오는지부터 물어봐요', traits: { careful: 3, planner: 1 } },
      { text: '"게임 한 판만 더 하고!" 하고 미뤄요', traits: { geek: 3 }, likes: ['videoGaming'], asp: { computerWhiz: 1 } },
      { text: '"놀이터 가서 그네 타자!" 하고 신나요', traits: { childish: 3, goofball: 1 } },
      { text: '신나서 뛰어나가다 문턱에 걸려 넘어져요', traits: { clumsy: 3, cheerful: 1 } },
    ],
  },
  {
    id: 'nickname',
    icon: '💬',
    text: '이 캐릭터가 친구들에게 자주 듣는 말은…',
    answers: [
      { text: '"너 진짜 착하다"', traits: { good: 3, empathetic: 1 }, asp: { volunteerHeart: 2 } },
      { text: '"말 좀 예쁘게 해!"', traits: { mean: 3 } },
      { text: '"장난이 너무 짓궂어!"', traits: { evil: 3 }, likes: ['mischief'] },
      { text: '"방 좀 치워!"', traits: { slob: 3, lazy: 1 } },
      { text: '"알뜰하다, 진짜 아껴 쓴다"', traits: { thrifty: 3 }, asp: { fortune: 2 } },
      { text: '"또 새로운 거 시작했어?"', traits: { commitmentIssues: 3, curious: 1 }, asp: { findMyself: 2 } },
    ],
  },
  {
    id: 'dream',
    icon: '🌱',
    text: '앞으로 해 보고 싶은 걸 물으면 이 캐릭터는…',
    answers: [
      { text: '아픈 사람이나 힘든 사람을 돕고 싶어요', traits: { empathetic: 2, good: 1 }, asp: { careHands: 3, volunteerHeart: 2 } },
      { text: '넓은 세상을 보고 다른 나라 말도 배우고 싶어요', traits: { adventurous: 2, curious: 1 }, asp: { newLanguage: 3 } },
      { text: '내 작품을 세상에 보여 주고 싶어요', traits: { creative: 2, selfAssured: 1 }, asp: { painter: 2, author: 2 } },
      { text: '높은 자리에 올라 큰일을 해 보고 싶어요', traits: { ambitious: 3, leader: 1 }, asp: { careerClimber: 3 } },
      { text: '아직 잘 모르겠어요. 이것저것 해 보고 싶어요', asp: { findMyself: 4 } },
    ],
  },
];

export interface StoryResult {
  traits: string[];
  likes: string[];
  aspiration: string;
}

/**
 * The dweller the answers describe: the heaviest traits that get along (참고 게임 adds each answer's
 * weightings and picks the top), up to three liked activities, and the heaviest aspiration;
 * with no clear dream, the journey to find oneself. `answers[i]` is the answer picked for
 * question i (−1 or missing = skipped). Traits that don't suit `age` (an adult if left out) are
 * passed over for the next heaviest.
 *
 * Ties are common (most answers weigh their trait 3), and giving them to the earlier question
 * made the first few questions decide almost every dweller. So a tie goes by a shuffle drawn from
 * the answers themselves (ours): the same answers always give the same dweller, and every question
 * counts the same.
 */
export function storyResult(answers: number[], age?: string): StoryResult {
  const tw = new Map<string, number>();
  const aw = new Map<string, number>();
  const likes: string[] = [];
  CAS_QUESTIONS.forEach((q, i) => {
    const a = q.answers[answers[i] ?? -1];
    if (!a) return;
    for (const [t, w] of Object.entries(a.traits ?? {})) tw.set(t, (tw.get(t) ?? 0) + w);
    for (const [t, w] of Object.entries(a.asp ?? {})) aw.set(t, (aw.get(t) ?? 0) + w);
    for (const l of a.likes ?? []) if (!likes.includes(l) && PREFERENCE_BY_ID[l]) likes.push(l);
  });
  const traits: string[] = [];
  const seed = answers.map((a) => a ?? -1).join(',');
  for (const [t] of [...tw].sort((a, b) => b[1] - a[1] || tieOrder(seed, a[0]) - tieOrder(seed, b[0]))) {
    const def = TRAIT_BY_ID[t];
    if (!def || def.reward || !traitFitsAge(def, age) || conflictsWith(traits, t)) continue;
    traits.push(t);
    if (traits.length >= MAX_TRAITS) break;
  }
  const top = [...aw].sort((a, b) => b[1] - a[1])[0];
  return { traits, likes: likes.slice(0, 3), aspiration: top && top[1] >= 2 ? top[0] : 'findMyself' };
}

/** A trait's place among equals for one set of answers (FNV-1a of both). */
function tieOrder(seed: string, trait: string): number {
  let h = 0x811c9dc5;
  for (const ch of `${seed}|${trait}`) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
  return h;
}

/** Every trait the questions can give, for checking they all exist. */
export const STORY_TRAITS = [...new Set(CAS_QUESTIONS.flatMap((q) => q.answers.flatMap((a) => Object.keys(a.traits ?? {}))))];

/** The traits a player can pick for a new (adult) dweller. */
export const PICKABLE_TRAITS = TRAITS.filter((t) => !t.reward && traitFitsAge(t, undefined));
/** The traits someone of an age can be given by hand (the character screen, in play). */
export const pickableFor = (age: string | undefined) => (age === undefined || age === 'adult' || age === 'elder' ? PICKABLE_TRAITS : TRAITS.filter((t) => !t.reward && traitFitsAge(t, age as never)));

/**
 * Traits sorted as 참고 게임's Create a Dweller shows them: emotional, hobby, lifestyle, social. The
 * grouping is the game screen's (the tuning leaves it to the client); a trait not listed falls in
 * the last group.
 */
export const TRAIT_GROUPS: Array<{ label: string; icon: string; ids: string[] }> = [
  { label: '감정', icon: '💭', ids: ['ambitious', 'cheerful', 'creative', 'genius', 'gloomy', 'goofball', 'hotHeaded', 'romantic', 'selfAssured', 'insane', 'grouch', 'optimist', 'easygoing', 'worrier', 'sensitive', 'competitive'] },
  { label: '취미', icon: '🎨', ids: ['artLover', 'bookworm', 'foodie', 'geek', 'lovesOutdoors', 'musicLover', 'curious', 'adventurous', 'homebody'] },
  { label: '생활 방식', icon: '🏡', ids: ['active', 'childish', 'clumsy', 'glutton', 'lazy', 'materialistic', 'neat', 'perfectionist', 'slob', 'planner', 'spontaneous', 'careful', 'steadfast', 'thrifty'] },
  { label: '사교', icon: '👥', ids: ['bro', 'evil', 'familyOriented', 'good', 'hatesChildren', 'loner', 'loyal', 'mean', 'commitmentIssues', 'outgoing', 'empathetic', 'modest', 'fair', 'leader', 'shy', 'moodMaker'] },
];

export function traitGroupOf(id: string): number {
  const i = TRAIT_GROUPS.findIndex((g) => g.ids.includes(id));
  return i < 0 ? TRAIT_GROUPS.length - 1 : i;
}

/** Common Korean given names for the dice (ours). */
export const GIVEN_NAMES = ['민준', '서연', '지우', '하은', '도윤', '서윤', '시우', '지아', '예준', '하린', '주원', '수아', '건우', '지유', '우진', '채원', '선우', '다은', '연우', '예린', '현우', '소율', '태오', '유나'];

const pick = <T,>(xs: readonly T[], rng: () => number): T => xs[Math.floor(rng() * xs.length) % xs.length];

/**
 * A personality at random (참고 게임 무작위 야망 및 특성): MAX_TRAITS traits that get along, two likes and a
 * dislike, and an aspiration for an adult.
 */
export function randomPersonality(rng: () => number, aspirations: readonly string[]): { traits: string[]; likes: string[]; dislikes: string[]; aspiration: string } {
  const traits: string[] = [];
  for (let n = 0; traits.length < MAX_TRAITS && n < 200; n++) {
    const t = pick(PICKABLE_TRAITS, rng).id;
    if (!traits.includes(t) && !conflictsWith(traits, t)) traits.push(t);
  }
  // Two activities and a topic or kind of person liked; an activity and maybe a topic or kind disliked.
  const acts = [...ACTIVITIES].sort(() => rng() - 0.5).map((a) => a.id);
  const others = [...TOPICS, ...PEOPLE].sort(() => rng() - 0.5).map((a) => a.id);
  return { traits, likes: [...acts.slice(0, 2), others[0]], dislikes: [acts[2], ...(rng() < 0.5 ? [others[1]] : [])], aspiration: pick(aspirations, rng) };
}
