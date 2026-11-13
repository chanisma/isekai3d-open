import { CLEANING_ACTS, HOME_ACTIVITY } from './homeFurniture';
import type { SkillKey } from './types';
/**
 * Likes and dislikes after 참고 게임's dweller preferences (docs/ref-game/04 §3.5): a dweller can like or
 * dislike an activity (trait_DwellerPreference_Likes/Dislikes_Activities_*); doing it brings
 * buff_DwellerPreference_Likes_* (Happy 1) or _Dislikes_* (Stressed 2), named as in the Korean game.
 * 참고 게임 also nudges free will towards likes and away from dislikes; the strength is ours.
 *
 * 2026-10-26 (at the user's request, ours): many more activities, conversation topics (the socials a
 * dweller enjoys or can't stand, on either side of a talk) and kinds of people (by the other's traits) —
 * the last two make friends faster or slower and steer who a dweller talks to and how.
 */
export type PreferenceKind = 'activity' | 'topic' | 'people';

export interface Activity {
  id: string;
  label: string;
  icon: string;
  interactions: string[];
  likes: string;
  dislikes: string;
}

/** A conversation topic: the socials that are it. */
export interface Topic {
  id: string;
  label: string;
  icon: string;
  socials: string[];
  likes: string;
  dislikes: string;
}

/** A kind of person, known by their traits. */
export interface PeopleKind {
  id: string;
  label: string;
  icon: string;
  traits: string[];
  likes: string;
  dislikes: string;
}

export interface Preference {
  id: string;
  kind: PreferenceKind;
  label: string;
  icon: string;
  likes: string;
  dislikes: string;
}

export const ACTIVITIES: Activity[] = [
  { id: 'cooking', label: '요리', icon: '🍳', interactions: ['cook', 'cookFamily', 'cookbook', 'cookGourmet', 'gourmetBook', 'grill', 'grillFamily'], likes: '나는 요리가 좋아요!', dislikes: '나는 요리가 싫어요!' },
  { id: 'baking', label: '베이킹', icon: '🎂', interactions: ['bakeCake'], likes: '나는 베이킹이 좋아요!', dislikes: '나는 베이킹이 싫어요!' },
  { id: 'fitness', label: '운동', icon: '💪', interactions: ['workout', 'tvWorkout'], likes: '나는 운동이 좋아요!', dislikes: '나는 운동이 싫어요!' },
  { id: 'swimming', label: '수영', icon: '🏊', interactions: ['swim'], likes: '나는 수영이 좋아요!', dislikes: '나는 물에 들어가기 싫어요!' },
  { id: 'painting', label: '그림', icon: '🎨', interactions: ['paint'], likes: '나는 그림 그리는 게 좋아요!', dislikes: '나는 그림 그리기가 싫어요!' },
  { id: 'artViewing', label: '작품 감상', icon: '🖼️', interactions: ['viewArt', 'admireStuff'], likes: '나는 작품 감상이 좋아요!', dislikes: '작품 감상은 지루해요!' },
  { id: 'guitar', label: '기타', icon: '🎸', interactions: ['playGuitar'], likes: '나는 기타가 좋아요!', dislikes: '으! 나는 기타가 싫어요!' },
  { id: 'piano', label: '피아노', icon: '🎹', interactions: ['playPiano'], likes: '나는 피아노가 좋아요!', dislikes: '나는 피아노가 싫어요!' },
  { id: 'violin', label: '바이올린', icon: '🎻', interactions: ['playViolin'], likes: '나는 바이올린이 좋아요!', dislikes: '나는 바이올린이 싫어요!' },
  { id: 'singing', label: '노래', icon: '🎤', interactions: ['singKaraoke'], likes: '나는 노래 부르는 게 좋아요!', dislikes: '나는 노래 부르기가 싫어요!' },
  { id: 'music', label: '음악 감상', icon: '🎧', interactions: ['listen'], likes: '나는 음악 듣는 게 좋아요!', dislikes: '음악은 시끄러워요!' },
  { id: 'djMixing', label: '디제잉', icon: '🎛️', interactions: ['mixTracks', 'peakTimeSet'], likes: '나는 디제잉이 좋아요!', dislikes: '나는 디제잉이 싫어요!' },
  { id: 'dancing', label: '춤', icon: '💃', interactions: ['dance', 'dancePractice'], likes: '나는 춤추는 게 좋아요!', dislikes: '나는 춤추는 게 싫어요!' },
  { id: 'mixology', label: '음료 혼합', icon: '🍹', interactions: ['mixDrink'], likes: '나는 음료 혼합이 좋아요!', dislikes: '나는 음료 혼합이 싫어요!' },
  { id: 'mischief', label: '장난', icon: '😈', interactions: ['watchNeighbors'], likes: '나는 장난이 좋아요!', dislikes: '나는 장난이 싫어요!' },
  { id: 'comedy', label: '코미디', icon: '🤡', interactions: ['practiceComedy', 'sillyFace'], likes: '나는 코미디가 좋아요!', dislikes: '나는 코미디가 싫어요!' },
  { id: 'fishing', label: '낚시', icon: '🎣', interactions: ['fish'], likes: '나는 낚시가 좋아요!', dislikes: '나는 낚시가 싫어요!' },
  { id: 'fishWatching', label: '물고기 구경', icon: '🐠', interactions: ['watchFish'], likes: '나는 물고기 구경이 좋아요!', dislikes: '물고기 구경은 지루해요!' },
  { id: 'gardening', label: '원예', icon: '🌱', interactions: ['plantSeeds', 'waterPlant', 'weedPlant', 'harvest', 'gardenBook'], likes: '나는 원예가 좋아요!', dislikes: '나는 원예가 싫어요!' },
  { id: 'photography', label: '사진', icon: '📷', interactions: ['takePhoto'], likes: '나는 사진이 좋아요!', dislikes: '나는 사진이 싫어요!' },
  { id: 'writing', label: '글쓰기', icon: '✍️', interactions: ['writeBook'], likes: '나는 글쓰기가 좋아요!', dislikes: '나는 글쓰기가 싫어요!' },
  { id: 'reading', label: '독서', icon: '📚', interactions: ['read', 'readLogic', 'readPsychology'], likes: '나는 책 읽는 게 좋아요!', dislikes: '나는 책 읽기가 싫어요!' },
  { id: 'handiness', label: '손재주', icon: '🔧', interactions: ['repair', 'benchFile', 'benchFix'], likes: '나는 손재주를 쓰는 게 좋아요!', dislikes: '나는 손재주 활동이 싫어요!' },
  { id: 'woodworking', label: '목공', icon: '🪚', interactions: ['woodwork'], likes: '나는 목공이 좋아요!', dislikes: '나는 목공이 싫어요!' },
  { id: 'programming', label: '프로그래밍', icon: '💻', interactions: ['study', 'tutorial'], likes: '나는 프로그래밍이 좋아요!', dislikes: '나는 프로그래밍이 싫어요!' },
  { id: 'videoGaming', label: '비디오 게임', icon: '🎮', interactions: ['game', 'gameTraining'], likes: '나는 비디오 게임이 좋아요!', dislikes: '나는 비디오 게임이 싫어요!' },
  { id: 'onlineChat', label: '온라인 채팅', icon: '⌨️', interactions: ['chat'], likes: '나는 온라인 채팅이 좋아요!', dislikes: '나는 온라인 채팅이 싫어요!' },
  { id: 'tv', label: 'TV 보기', icon: '📺', interactions: ['watchTv', 'watch'], likes: '나는 TV 보는 게 좋아요!', dislikes: 'TV는 재미없어요!' },
  { id: 'chess', label: '체스', icon: '🤔', interactions: ['playChess', 'ponder'], likes: '나는 체스가 좋아요!', dislikes: '나는 체스가 싫어요!' },
  { id: 'boardGames', label: '보드게임', icon: '🎲', interactions: ['playTycoon'], likes: '나는 보드게임이 좋아요!', dislikes: '나는 보드게임이 싫어요!' },
  { id: 'stargazing', label: '별 보기', icon: '🔭', interactions: ['stargaze', 'observeSkies'], likes: '나는 별 보는 게 좋아요!', dislikes: '별 보기는 지루해요!' },
  { id: 'science', label: '과학 실험', icon: '🧪', interactions: ['research', 'analyze', 'runExperiment', 'studyScience'], likes: '나는 과학 실험이 좋아요!', dislikes: '나는 과학 실험이 싫어요!' },
  { id: 'rocketScience', label: '로켓 과학', icon: '🚀', interactions: ['buildRocket', 'tuneRocket'], likes: '나는 로켓 만들기가 좋아요!', dislikes: '나는 로켓 만들기가 싫어요!' },
  { id: 'studying', label: '공부', icon: '📖', interactions: ['homework', 'studyMedicine', 'studyLaw', 'studyBusiness', 'studyLeadership', 'readCaseBook', 'roadRulesBook', 'learnAnatomy', 'firstAidPractice', 'economyNews'], likes: '나는 공부가 좋아요!', dislikes: '나는 공부가 싫어요!' },
  { id: 'languages', label: '외국어', icon: '🌏', interactions: ['studyLanguage', 'onlineLanguage', 'translateGig'], likes: '나는 외국어가 좋아요!', dislikes: '나는 외국어가 싫어요!' },
  { id: 'speaking', label: '말하기·발표', icon: '🎙️', interactions: ['speech', 'presentationPractice', 'practiceRomance'], likes: '나는 말하기 연습이 좋아요!', dislikes: '나는 발표가 싫어요!' },
  { id: 'planning', label: '계획 세우기', icon: '🗒️', interactions: ['planGoals'], likes: '나는 계획 세우기가 좋아요!', dislikes: '나는 계획 세우기가 싫어요!' },
  { id: 'driving', label: '운전', icon: '🚗', interactions: ['drivePractice'], likes: '나는 운전이 좋아요!', dislikes: '나는 운전이 싫어요!' },
  { id: 'bathing', label: '목욕', icon: '🛁', interactions: ['takeBath', 'bubbleBath'], likes: '나는 목욕이 좋아요!', dislikes: '나는 목욕이 싫어요!' },
  { id: 'resting', label: '쉬기', icon: '🛋️', interactions: ['relax'], likes: '나는 느긋하게 쉬는 게 좋아요!', dislikes: '가만히 있는 건 싫어요!' },
  { id: 'cleaning', label: '청소', icon: '🧽', interactions: ['clean', 'washDishes'], likes: '나는 청소가 좋아요!', dislikes: '나는 청소가 싫어요!' },
  { id: 'playing', label: '놀이', icon: '🧸', interactions: ['playToys', 'playBars', 'hangBars'], likes: '나는 노는 게 좋아요!', dislikes: '노는 건 시시해요!' },
];

/** Conversation topics: the socials a dweller enjoys or can't stand, doing them or on the other side. */
export const TOPICS: Topic[] = [
  { id: 'topic_smallTalk', label: '일상 수다', icon: '💬', socials: ['chat', 'joinConversation'], likes: '수다 떠는 게 좋아요!', dislikes: '쓸데없는 수다는 싫어요!' },
  { id: 'topic_deep', label: '깊은 대화', icon: '🌙', socials: ['deepTalk', 'getToKnow'], likes: '깊은 이야기가 좋아요!', dislikes: '무거운 이야기는 싫어요!' },
  { id: 'topic_work', label: '일·진로 이야기', icon: '💼', socials: ['askAboutCareer'], likes: '일 이야기가 좋아요!', dislikes: '일 이야기는 그만!' },
  { id: 'topic_praise', label: '칭찬', icon: '🌟', socials: ['compliment'], likes: '칭찬을 주고받는 게 좋아요!', dislikes: '칭찬은 쑥스러워요!' },
  { id: 'topic_jokes', label: '농담', icon: '😂', socials: ['joke'], likes: '농담이 좋아요!', dislikes: '농담은 별로예요!' },
  { id: 'topic_touch', label: '스킨십', icon: '🤗', socials: ['hug', 'kiss'], likes: '포옹이 좋아요!', dislikes: '스킨십은 싫어요!' },
  { id: 'topic_romance', label: '연애 이야기', icon: '💘', socials: ['flirt', 'askPartner'], likes: '설레는 이야기가 좋아요!', dislikes: '연애 이야기는 싫어요!' },
  { id: 'topic_pranks', label: '장난치기', icon: '🙃', socials: ['fakeBadNews', 'scare', 'falseConfidence', 'pretendSlapped'], likes: '장난치는 게 좋아요!', dislikes: '장난은 싫어요!' },
  { id: 'topic_debate', label: '말다툼·논쟁', icon: '💢', socials: ['argue'], likes: '불꽃 튀는 논쟁이 좋아요!', dislikes: '다투는 건 정말 싫어요!' },
];

/** Kinds of people, known by their traits (a dweller with any of them is that kind). */
export const PEOPLE: PeopleKind[] = [
  { id: 'people_funny', label: '재미있는 사람', icon: '🤪', traits: ['goofball', 'moodMaker', 'childish'], likes: '재미있는 사람이 좋아요!', dislikes: '실없는 사람은 피곤해요!' },
  { id: 'people_kind', label: '다정한 사람', icon: '🥰', traits: ['good', 'empathetic', 'cheerful', 'familyOriented'], likes: '다정한 사람이 좋아요!', dislikes: '착한 척은 부담스러워요!' },
  { id: 'people_smart', label: '똑똑한 사람', icon: '🧠', traits: ['genius', 'curious', 'bookworm', 'geek'], likes: '똑똑한 사람이 좋아요!', dislikes: '잘난 척하는 사람은 싫어요!' },
  { id: 'people_lively', label: '활발한 사람', icon: '⚡', traits: ['active', 'outgoing', 'adventurous', 'spontaneous'], likes: '활발한 사람이 좋아요!', dislikes: '시끌벅적한 사람은 지쳐요!' },
  { id: 'people_calm', label: '차분한 사람', icon: '🍵', traits: ['easygoing', 'homebody', 'careful', 'shy'], likes: '차분한 사람이 좋아요!', dislikes: '심심한 사람은 별로예요!' },
  { id: 'people_driven', label: '열정적인 사람', icon: '🔥', traits: ['ambitious', 'leader', 'competitive', 'steadfast'], likes: '열정적인 사람이 좋아요!', dislikes: '경쟁만 하는 사람은 싫어요!' },
  { id: 'people_artsy', label: '감성적인 사람', icon: '🎨', traits: ['creative', 'artLover', 'musicLover', 'sensitive', 'romantic'], likes: '감성적인 사람이 좋아요!', dislikes: '감성 타령은 질색이에요!' },
  { id: 'people_honest', label: '정직한 사람', icon: '⚖️', traits: ['fair', 'modest', 'loyal'], likes: '정직한 사람이 좋아요!', dislikes: '깐깐한 사람은 싫어요!' },
  { id: 'people_tidy', label: '깔끔한 사람', icon: '✨', traits: ['neat', 'perfectionist', 'planner', 'thrifty'], likes: '깔끔한 사람이 좋아요!', dislikes: '까다로운 사람은 싫어요!' },
  { id: 'people_rough', label: '거친 사람', icon: '😠', traits: ['mean', 'evil', 'hotHeaded', 'grouch'], likes: '센 사람이 끌려요!', dislikes: '무례한 사람은 싫어요!' },
  { id: 'people_laidBack', label: '느긋한 사람', icon: '🦥', traits: ['lazy', 'slob', 'commitmentIssues'], likes: '편한 사람이 좋아요!', dislikes: '게으른 사람은 싫어요!' },
];

/** Every like and dislike, in the order 심 만들기 shows them. */
export const PREFERENCES: Preference[] = [
  ...ACTIVITIES.map((a) => ({ id: a.id, kind: 'activity' as const, label: a.label, icon: a.icon, likes: a.likes, dislikes: a.dislikes })),
  ...TOPICS.map((t) => ({ id: t.id, kind: 'topic' as const, label: t.label, icon: t.icon, likes: t.likes, dislikes: t.dislikes })),
  ...PEOPLE.map((p) => ({ id: p.id, kind: 'people' as const, label: p.label, icon: p.icon, likes: p.likes, dislikes: p.dislikes })),
];
export const PREFERENCE_BY_ID: Record<string, Preference> = Object.fromEntries(PREFERENCES.map((p) => [p.id, p]));

/** The groups 심 만들기 and the dweller panel show them in. */
/** How many a dweller can like and dislike, each (2026-11-01, at the user's request: more said little about them). */
export const MAX_LIKES = 5;
export const MAX_DISLIKES = 5;

// What the pieces sold for the house count as (homeFurniture.ts), and the cleaning tools.
for (const [id, activity] of Object.entries(HOME_ACTIVITY)) ACTIVITIES.find((a) => a.id === activity)?.interactions.push(id);
ACTIVITIES.find((a) => a.id === 'cleaning')?.interactions.push(...CLEANING_ACTS);

export const PREFERENCE_GROUPS: Array<{ kind: PreferenceKind; label: string }> = [
  { kind: 'activity', label: '활동' },
  { kind: 'topic', label: '대화' },
  { kind: 'people', label: '사람' },
];

/**
 * Free will's pull towards liked and away from disliked activities (ours; 1.5 and 0.4 until
 * 2026-10-26, when the user found dwellers still doing what they disliked and likes made little difference:
 * "felt, not overpowering").
 */
export const LIKE_MULTIPLIER = 1.8;
export const DISLIKE_MULTIPLIER = 0.2;
/** A liked activity not done for this long is missed (a moodlet); after MISS_STRONG_AFTER, badly (a stronger one). */
export const MISS_AFTER = 2 * 1440;
export const MISS_STRONG_AFTER = 5 * 1440;
/**
 * The longer a liked activity goes undone, the harder free will pulls towards it (2026-10-26, at the
 * user's request, ours): from a day on, a fifth more each day, up to MISS_MAX.
 */
export const MISS_GROWTH = 0.2;
export const MISS_MAX = 2.2;
export function missedPull(sinceMinutes: number): number {
  return Math.min(MISS_MAX, Math.max(1, 1 + MISS_GROWTH * (sinceMinutes / 1440 - 1)));
}
/**
 * The more often a disliked activity is done, the harder free will turns from it (2026-10-26, at the
 * user's request, ours): each time ×DISLIKE_GROWTH, down to DISLIKE_MIN. One time is forgotten for
 * every DISLIKE_FORGET without it; from DISLIKE_STRONG times on the moodlet is the stronger one.
 */
export const DISLIKE_GROWTH = 0.75;
export const DISLIKE_MIN = 0.05;
export const DISLIKE_FORGET = 2 * 1440;
export const DISLIKE_STRONG = 3;
/** How many times lately (forgetting one each DISLIKE_FORGET). */
export function dislikeTimes(rec: { n: number; at: number } | undefined, now: number): number {
  return rec ? Math.max(0, rec.n - Math.floor((now - rec.at) / DISLIKE_FORGET)) : 0;
}
export function dislikePull(times: number): number {
  return Math.max(DISLIKE_MIN, DISLIKE_MULTIPLIER * DISLIKE_GROWTH ** times);
}
/** What a liked topic or kind of person does to the friendship a social brings, for each side that likes it (ours). */
export const LIKE_GAIN = 1.3;
export const DISLIKE_GAIN = 0.6;

export function activityOf(interactionId: string): Activity | undefined {
  return ACTIVITIES.find((a) => a.interactions.includes(interactionId));
}

export function topicOf(socialId: string): Topic | undefined {
  return TOPICS.find((t) => t.socials.includes(socialId));
}

/** The kinds of people a dweller with these traits is. */
export function peopleKindsOf(traits: readonly string[] | undefined): PeopleKind[] {
  return traits?.length ? PEOPLE.filter((p) => p.traits.some((t) => traits.includes(t))) : [];
}

export interface Liking {
  likes?: string[];
  dislikes?: string[];
  traits?: string[];
}

/**
 * What one side's likes make of a social with another: their liked or disliked topic, and the kind
 * of person the other is. The ids are the preferences it touches (for the moodlets).
 */
export function socialLiking(me: Liking, other: Liking, socialId: string): { like: string[]; dislike: string[] } {
  const topic = topicOf(socialId)?.id;
  const kinds = peopleKindsOf(other.traits).map((p) => p.id);
  const touches = (list?: string[]) => (list ?? []).filter((id) => id === topic || kinds.includes(id));
  return { like: touches(me.likes), dislike: touches(me.dislikes) };
}

/** The friendship a social brings, made more or less by both sides' likes (×LIKE_GAIN or ×DISLIKE_GAIN for each). */
export function socialGainMul(a: Liking, b: Liking, socialId: string): number {
  let m = 1;
  for (const [me, other] of [
    [a, b],
    [b, a],
  ] as const) {
    const { like, dislike } = socialLiking(me, other, socialId);
    m *= LIKE_GAIN ** like.length * DISLIKE_GAIN ** dislike.length;
  }
  return m;
}

/** Free will's pull towards a social: the dweller's own liked or disliked topic and the kind of person the other is. */
export function socialPull(me: Liking, other: Liking | undefined, socialId: string): number {
  const { like, dislike } = socialLiking(me, other ?? {}, socialId);
  return LIKE_MULTIPLIER ** Math.min(1, like.length) * DISLIKE_MULTIPLIER ** Math.min(1, dislike.length);
}

/** What a trait makes more likely to be liked (`randomPreferences`), and less. */
export const TRAIT_LIKES: Record<string, string[]> = {
  bookworm: ['reading', 'studying', 'writing'],
  active: ['fitness', 'swimming', 'dancing'],
  creative: ['painting', 'writing', 'woodworking'],
  artLover: ['artViewing', 'painting', 'photography'],
  musicLover: ['music', 'guitar', 'piano', 'violin', 'singing', 'djMixing'],
  foodie: ['cooking', 'baking'],
  glutton: ['cooking', 'baking'],
  geek: ['videoGaming', 'programming', 'boardGames'],
  genius: ['science', 'chess', 'studying'],
  curious: ['science', 'stargazing', 'languages'],
  goofball: ['comedy', 'mischief'],
  moodMaker: ['comedy', 'singing'],
  childish: ['playing', 'videoGaming', 'mischief'],
  lovesOutdoors: ['gardening', 'fishing', 'stargazing'],
  adventurous: ['swimming', 'driving', 'photography'],
  neat: ['cleaning', 'planning'],
  perfectionist: ['planning', 'cleaning'],
  planner: ['planning'],
  homebody: ['tv', 'resting', 'reading'],
  lazy: ['tv', 'resting', 'videoGaming'],
  easygoing: ['resting', 'fishWatching'],
  outgoing: ['speaking', 'onlineChat', 'dancing'],
  leader: ['speaking', 'planning'],
  ambitious: ['studying', 'planning'],
  competitive: ['chess', 'boardGames', 'fitness'],
  familyOriented: ['cooking', 'playing'],
};
const TRAIT_DISLIKES: Record<string, string[]> = {
  slob: ['cleaning'],
  lazy: ['fitness', 'cleaning'],
  neat: ['mischief'],
  homebody: ['driving'],
  loner: ['speaking', 'onlineChat'],
  shy: ['speaking', 'singing'],
  active: ['tv'],
  bookworm: ['videoGaming'],
};
/** What a job's skill makes more likely to be liked: firefighters into exercise, teachers into study. */
const SKILL_LIKES: Partial<Record<SkillKey, string[]>> = {
  fitness: ['fitness'],
  cooking: ['cooking', 'baking'],
  painting: ['painting', 'artViewing'],
  writing: ['writing', 'reading'],
  logic: ['studying', 'chess'],
  science: ['science'],
  medicine: ['studying'],
  programming: ['programming', 'videoGaming'],
  handiness: ['handiness', 'woodworking'],
  gardening: ['gardening'],
  fishing: ['fishing'],
  photography: ['photography'],
  dancing: ['dancing'],
  singing: ['singing'],
  guitar: ['guitar'],
  piano: ['piano'],
  violin: ['violin'],
  comedy: ['comedy'],
  charisma: ['speaking'],
  driving: ['driving'],
  djMixing: ['djMixing', 'music'],
  mixology: ['mixology'],
};
const AGE_LIKES: Record<string, string[]> = { child: ['playing', 'videoGaming', 'painting'], teen: ['videoGaming', 'onlineChat', 'music'], elder: ['resting', 'gardening', 'tv'] };
/** Those who aren't one way or the other about romance by their traits: share who like it, and who don't. */
const ROMANCE_LIKERS = 0.15;
const ROMANCE_DISLIKERS = 0.1;
/** The share who like the kind of person they are themselves, where they're of any. */
const LIKE_OWN_KIND = 0.6;

/**
 * Likes and dislikes for someone not picked by the player (2026-11-01, at the user's request: all at
 * random they said little of who someone is, and most had nothing to say about a person asking them
 * out, romanceAcceptance.ts). Of each sort so there's always something: two activities, a topic and a
 * kind of person liked; an activity and a kind of person disliked, maybe one more. What they are makes
 * some likelier (`who`: traits, age, job's skill), but anyone can surprise. Those already living keep theirs.
 */
export function randomPreferences(rng: () => number, who: { traits?: readonly string[]; age?: string; skill?: SkillKey } = {}): { likes: string[]; dislikes: string[] } {
  const take = (xs: ReadonlyArray<{ id: string }>, not: string[], weight: (id: string) => number = () => 1) => {
    const free = xs.filter((x) => !not.includes(x.id));
    let roll = rng() * free.reduce((n, x) => n + weight(x.id), 0);
    return (free.find((x) => (roll -= weight(x.id)) < 0) ?? free[free.length - 1]).id;
  };
  const traits = who.traits ?? [];
  const has = (table: Record<string, string[]>, id: string) => traits.filter((t) => table[t]?.includes(id)).length;
  const likelier = (id: string) => 1 + 3 * has(TRAIT_LIKES, id) + (SKILL_LIKES[who.skill as SkillKey]?.includes(id) ? 3 : 0) + (AGE_LIKES[who.age ?? '']?.includes(id) ? 2 : 0);
  const unwanted = (id: string) => (has(TRAIT_LIKES, id) || SKILL_LIKES[who.skill as SkillKey]?.includes(id) ? 0.1 : 1) + 3 * has(TRAIT_DISLIKES, id);
  const young = who.age === 'child';
  const off = young ? ['topic_romance', 'topic_touch'] : ['topic_romance'];
  const attitudeRoll = rng();
  const romance = young ? 0 : traits.includes('romantic') ? 1 : traits.includes('commitmentIssues') ? -1 : attitudeRoll < ROMANCE_LIKERS ? 1 : attitudeRoll < ROMANCE_LIKERS + ROMANCE_DISLIKERS ? -1 : 0;
  const mine = peopleKindsOf(traits).map((p) => p.id);
  const likes = [take(ACTIVITIES, [], likelier)];
  likes.push(take(ACTIVITIES, likes, likelier));
  likes.push(romance > 0 ? 'topic_romance' : take(TOPICS, [...likes, ...off]));
  likes.push(mine.length && rng() < LIKE_OWN_KIND ? take(mine.map((id) => ({ id })), []) : take(PEOPLE, likes));
  const dislikes = [take(ACTIVITIES, likes, unwanted)];
  dislikes.push(take(PEOPLE, [...likes, ...mine]));
  if (romance < 0) dislikes.push('topic_romance');
  else if (rng() < 0.5) dislikes.push(rng() < 0.5 ? take(TOPICS, [...likes, ...off]) : take(ACTIVITIES, [...likes, ...dislikes], unwanted));
  return { likes, dislikes };
}
