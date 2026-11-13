import { ACTIVITIES, PREFERENCES } from './preferences';
import type { ActiveBuff, EmotionKey, NeedKey, Needs, SkillKey } from './types';

export interface EmotionDef {
  /** Name per intensity level. */
  levels: string[];
  icon: string;
  color: string;
  /** Total weight needed for each step up in intensity. */
  thresholds: number[];
  polarity: 'positive' | 'negative' | 'neutral';
}

/**
 * Emotions, intensity thresholds and colours follow 참고 게임's Mood tuning
 * (asleep and scared left out). See docs/ref-game/02 §3.
 */
export const EMOTIONS: Record<EmotionKey, EmotionDef> = {
  fine: { levels: ['무난함'], icon: '🙂', color: '#e8eef2', thresholds: [], polarity: 'neutral' },
  happy: { levels: ['행복함', '황홀함'], icon: '😊', color: '#86d71d', thresholds: [8], polarity: 'positive' },
  confident: { levels: ['자신감', '대담함'], icon: '😎', color: '#4bb4e3', thresholds: [8], polarity: 'positive' },
  energized: { levels: ['활기참', '의욕 충만'], icon: '⚡', color: '#e6f638', thresholds: [8], polarity: 'positive' },
  flirty: { levels: ['설렘', '열정적'], icon: '😘', color: '#ff7fbc', thresholds: [8], polarity: 'positive' },
  focused: { levels: ['집중함', '몰입'], icon: '🧐', color: '#817cfe', thresholds: [8], polarity: 'positive' },
  inspired: { levels: ['영감', '상상력 풍부'], icon: '💡', color: '#64f6fc', thresholds: [8], polarity: 'positive' },
  playful: { levels: ['장난기', '익살스러움', '포복절도'], icon: '😜', color: '#f051ea', thresholds: [8, 15], polarity: 'positive' },
  sad: { levels: ['슬픔', '우울함'], icon: '😢', color: '#4374be', thresholds: [3], polarity: 'negative' },
  angry: { levels: ['화남', '격노', '분노 폭발'], icon: '😠', color: '#f0064c', thresholds: [3, 7], polarity: 'negative' },
  bored: { levels: ['지루함'], icon: '😑', color: '#a3b3af', thresholds: [], polarity: 'negative' },
  embarrassed: { levels: ['당황함', '창피함', '굴욕'], icon: '😳', color: '#fcf630', thresholds: [4, 8], polarity: 'negative' },
  stressed: { levels: ['긴장', '스트레스'], icon: '😣', color: '#fcae00', thresholds: [4], polarity: 'negative' },
  uncomfortable: { levels: ['불편함', '비참함'], icon: '😖', color: '#ff8162', thresholds: [4], polarity: 'negative' },
  dazed: { levels: ['멍함'], icon: '😵‍💫', color: '#b190f6', thresholds: [], polarity: 'negative' },
  // 참고 게임 Mood_Scared: intensity at 4, Korean names 겁에 질림 / 죽도록 겁에 질림.
  scared: { levels: ['겁에 질림', '죽도록 겁에 질림'], icon: '😨', color: '#9d3daa', thresholds: [4], polarity: 'negative' },
};

export interface BuffDef {
  label: string;
  icon: string;
  emotion: EmotionKey | null;
  weight: number;
  /** Game minutes; omitted for condition-driven moodlets (need bands) that last while the condition holds. */
  duration?: number;
  /** Multiplies natural need decay while active. */
  decayMul?: Partial<Needs>;
  /** Works behind the scenes; not listed in the UI. */
  hidden?: boolean;
}

/**
 * Moodlets. Emotions, weights, decay multipliers and durations come from 참고 게임 buff
 * tuning (docs/ref-game/02 §1.4, §1.8, §2.4); where the game accumulates a buff over a
 * conversation we use a fixed duration close to its typical length.
 */
export const BUFFS: Record<string, BuffDef> = {
  // Need bands (Buff_Motives_*; the *Yellow ones are 참고 게임's invisible decay modifiers)
  starving: { label: '굶주림', icon: '🍽️', emotion: 'uncomfortable', weight: 40, decayMul: { hunger: 0.0833 } },
  hungry: { label: '배고픔', icon: '🍔', emotion: 'uncomfortable', weight: 1, decayMul: { hunger: 0.0833 } },
  hungerYellow: { label: '출출함', icon: '🍔', emotion: null, weight: 0, decayMul: { hunger: 0.4 }, hidden: true },
  exhausted: { label: '탈진', icon: '🥱', emotion: 'uncomfortable', weight: 3 },
  tired: { label: '피곤함', icon: '😪', emotion: 'uncomfortable', weight: 1 },
  reallyHasToPee: { label: '화장실이 너무 급함', icon: '🚽', emotion: 'uncomfortable', weight: 40, decayMul: { bladder: 1.2 } },
  hasToPee: { label: '화장실이 급함', icon: '🚻', emotion: 'uncomfortable', weight: 1, decayMul: { bladder: 1.2 } },
  bladderYellow: { label: '약간 급함', icon: '🚻', emotion: null, weight: 0, decayMul: { bladder: 1.2 }, hidden: true },
  filthy: { label: '더러움', icon: '🪰', emotion: 'uncomfortable', weight: 2 },
  // Hard times (ours; 참고 게임 lets a dweller sleep soundly and feel fine with the power off and nothing to eat).
  powerCut: { label: '전기 끊김', icon: '🔌', emotion: 'uncomfortable', weight: 2 },
  waterCut: { label: '물 끊김', icon: '🚱', emotion: 'uncomfortable', weight: 2 },
  nothingToEat: { label: '먹을 게 없음', icon: '😩', emotion: 'stressed', weight: 4 },
  restlessNight: { label: '뒤척인 밤', icon: '😣', emotion: 'uncomfortable', weight: 2, duration: 240 },
  sick: { label: '몸살', icon: '🌡️', emotion: 'uncomfortable', weight: 3, duration: 1440, decayMul: { energy: 1.5 } },
  grungy: { label: '꾀죄죄함', icon: '🧼', emotion: 'uncomfortable', weight: 1, decayMul: { hygiene: 2 } },
  desperateForFun: { label: '놀고 싶어 미칠 지경', icon: '😫', emotion: 'stressed', weight: 3 },
  needsAmusement: { label: '재밌는 게 필요해', icon: '🎈', emotion: 'stressed', weight: 1, decayMul: { fun: 0.9333 } },
  funYellow: { label: '조금 심심함', icon: '🎈', emotion: null, weight: 0, decayMul: { fun: 0.7 }, hidden: true },
  desolate: { label: '고독함', icon: '🥀', emotion: 'sad', weight: 3 },
  lonely: { label: '외로움', icon: '💭', emotion: 'sad', weight: 1, decayMul: { social: 0.6 } },
  socialYellow: { label: '대화가 고픔', icon: '💭', emotion: null, weight: 0, decayMul: { social: 0.6 }, hidden: true },
  // All needs met (Buff_Motives_AllMotivesPrettyHigh / AllMotivesHigh)
  allNeedsGood: { label: '욕구가 대체로 채워짐', icon: '✨', emotion: 'happy', weight: 1 },
  allNeedsGreat: { label: '모든 욕구 충족', icon: '🌈', emotion: 'happy', weight: 2 },
  // Objects (buff_Object_*)
  showerBrisk: { label: '상쾌한 샤워', icon: '🚿', emotion: 'energized', weight: 1, duration: 240 },
  showerThought: { label: '샤워 중 떠오른 생각', icon: '💡', emotion: 'inspired', weight: 1, duration: 240 },
  music: { label: '음악 감상', icon: '🎶', emotion: 'happy', weight: 1, duration: 120 },
  comedy: { label: '코미디 시청', icon: '📺', emotion: 'playful', weight: 1, duration: 180 },
  highScore: { label: '최고 점수 달성', icon: '🎮', emotion: 'happy', weight: 1, duration: 240 },
  epicGame: { label: '전설적인 게임', icon: '🏆', emotion: 'happy', weight: 2, duration: 240 },
  accomplished: { label: '코딩 성공', icon: '✅', emotion: 'confident', weight: 2, duration: 240 },
  brainFried: { label: '머리가 지끈', icon: '🤯', emotion: 'stressed', weight: 2, duration: 120 },
  stimulatingRead: { label: '흥미진진한 책', icon: '📖', emotion: 'focused', weight: 1, duration: 90 },
  bookInspiration: { label: '책에서 얻은 영감', icon: '📚', emotion: 'inspired', weight: 1, duration: 240 },
  admireSelf: { label: '거울 속 멋진 나', icon: '🪞', emotion: 'happy', weight: 1, duration: 180 },
  wellRested: { label: '편안한 잠자리', icon: '🛏️', emotion: 'happy', weight: 1, duration: 180 },
  // Socials (Buff_CoreSocial_*, Buffs_CoreSocialBuffs_*)
  deepConnection: { label: '깊은 교감', icon: '🤝', emotion: 'happy', weight: 1, duration: 210 },
  // Food quality (참고 게임 buff_Food_Cooking_0/2/3/4/5; tier 1 "edible" goes unused).
  foodBad: { label: '나쁜 뒷맛', icon: '🤢', emotion: 'uncomfortable', weight: 1, duration: 120 },
  foodGood: { label: '꽤 맛있음', icon: '😋', emotion: 'happy', weight: 1, duration: 240 },
  foodTasty: { label: '맛있는 요리', icon: '🍲', emotion: 'happy', weight: 1, duration: 240 },
  foodFantastic: { label: '환상적인 요리', icon: '🌟', emotion: 'happy', weight: 2, duration: 300 },
  foodGreat: { label: '위대한 요리', icon: '👑', emotion: 'happy', weight: 3, duration: 360 },
  // Fire (참고 게임 Buff_Fire_Stressed 50 while it burns, Finished_Stressed 1 for a day, Dweller_Singed 3 for an hour).
  fireStressed: { label: '불이야!', icon: '🔥', emotion: 'stressed', weight: 50 },
  fireOver: { label: '화재 진화!', icon: '🧯', emotion: 'stressed', weight: 1, duration: 1440 },
  singed: { label: '불에 그을림!', icon: '🌋', emotion: 'stressed', weight: 3, duration: 60 },
  recentFire: { label: '최근 화재', icon: '🔥', emotion: null, weight: 0, duration: 2880, hidden: true },
  // Weddings (참고 게임 buff_Relationship_HadWedding: Happy 3 for two days; WatchedWeddingHappy: Happy 1, 4 h).
  justMarried: { label: '방금 결혼함!', icon: '💒', emotion: 'happy', weight: 3, duration: 2880 },
  sawWedding: { label: '결혼식을 구경함!', icon: '🎊', emotion: 'happy', weight: 1, duration: 240 },
  movedIn: { label: '새 보금자리', icon: '🏡', emotion: 'happy', weight: 1, duration: 480 },
  // Emotional mirror and shower interactions (참고 게임 buff_Mirror_*, buff_Object_Shower_Steamy).
  psychedUp: { label: '사기 충전!', icon: '💪', emotion: 'confident', weight: 1, duration: 180 },
  sillyFace: { label: '참 우스꽝스러운 얼굴이군!', icon: '🤪', emotion: 'playful', weight: 1, duration: 90 },
  gussiedUp: { label: '우아한 존재감', icon: '💄', emotion: 'flirty', weight: 1, duration: 240 },
  // Ours: a new look from the salon, the wardrobe or the mirror.
  freshHair: { label: '새로운 머리!', icon: '💇', emotion: 'confident', weight: 1, duration: 360 },
  newClothes: { label: '새 옷!', icon: '🛍️', emotion: 'happy', weight: 1, duration: 360 },
  newLook: { label: '새 옷 기분', icon: '👗', emotion: 'happy', weight: 1, duration: 180 },
  steamyShower: { label: '화끈한 기분', icon: '🔥', emotion: 'flirty', weight: 1, duration: 240 },
  // Pregnancy and babies (참고 게임 buff_Pregnancy_Trimester1-3, InLabor 40, NotPregnant, buff_HadBaby).
  trimester1: { label: '새로운 생명!', icon: '🤰', emotion: 'happy', weight: 1 },
  trimester2: { label: '임신: 2기', icon: '🤰', emotion: 'happy', weight: 1 },
  trimester3: { label: '임신: 3기', icon: '🤰', emotion: 'happy', weight: 1 },
  inLabor: { label: '임신: 출산 중', icon: '😣', emotion: 'uncomfortable', weight: 40 },
  notPregnant: { label: '임신 실패', icon: '😢', emotion: 'sad', weight: 2, duration: 240 },
  hadBaby: { label: '새로운 아기!', icon: '👶', emotion: 'happy', weight: 3, duration: 2880 },
  grewUp: { label: '생일 축하!', icon: '🎂', emotion: 'happy', weight: 2, duration: 480 },
  ouch: { label: '아얏!', icon: '⚡', emotion: 'uncomfortable', weight: 1, duration: 180 },
  bathRelax: { label: '목욕 요법', icon: '🛁', emotion: 'happy', weight: 1, duration: 120 },
  bubbles: { label: '거품!!!', icon: '🫧', emotion: 'playful', weight: 2, duration: 120 },
  // Fights (참고 게임 Buff_WonFight Confident 2, Buff_LostFight Dazed 4,
  // buff_FightWitnessed_* one of Happy/Energized/Bored/Inspired for onlookers).
  wonFight: { label: '승리!', icon: '🥊', emotion: 'confident', weight: 2, duration: 240 },
  lostFight: { label: '묵사발이 됨!', icon: '🤕', emotion: 'dazed', weight: 4, duration: 240 },
  sawFightHappy: { label: '싸움 목격함', icon: '👀', emotion: 'happy', weight: 1, duration: 240 },
  sawFightEnergized: { label: '싸움 목격함', icon: '👀', emotion: 'energized', weight: 1, duration: 240 },
  sawFightBored: { label: '싸움 목격함', icon: '👀', emotion: 'bored', weight: 1, duration: 240 },
  sawFightInspired: { label: '싸움 목격함', icon: '👀', emotion: 'inspired', weight: 1, duration: 240 },
  // Old age and loss (참고 게임 buff_DeathOfDweller_Spouse/Parent/... Sad 3, Friend Sad 3, Acquaintance Sad 2; 2 days).
  becameElder: { label: '노년의 지혜', icon: '👴', emotion: 'confident', weight: 1, duration: 480 },
  griefFamily: { label: '가족과 사별', icon: '🕊️', emotion: 'sad', weight: 3, duration: 2880 },
  griefFriend: { label: '애도', icon: '🕊️', emotion: 'sad', weight: 3, duration: 2880 },
  griefAcquaintance: { label: '애도', icon: '🕊️', emotion: 'sad', weight: 2, duration: 2880 },
  // Burglars (참고 게임 buff_Burglar_*: Spotted Stressed 2 for an hour; Lost Confident 2 / Won Embarrassed 2,
  // StolenGoods Sad 1, ReturnedGoods Happy 1, PoliceWon Happy 1, each for a day).
  burglarSpotted: { label: '도둑이다!!!', icon: '🦹', emotion: 'stressed', weight: 2, duration: 60 },
  heroicEffort: { label: '영웅적인 노력', icon: '🦸', emotion: 'confident', weight: 2, duration: 1440 },
  beatenByBurglar: { label: '싸웠지만 패배함', icon: '🤕', emotion: 'embarrassed', weight: 2, duration: 1440 },
  stolenGoods: { label: '도난당한 물건', icon: '💼', emotion: 'sad', weight: 1, duration: 1440 },
  returnedGoods: { label: '되찾은 물건', icon: '📦', emotion: 'happy', weight: 1, duration: 1440 },
  policeWon: { label: '믿음직한 승리', icon: '👮', emotion: 'happy', weight: 1, duration: 1440 },
  groupChat: { label: '여럿이 수다', icon: '🥳', emotion: 'happy', weight: 1, duration: 60 },
  goodJoke: { label: '즐거운 농담', icon: '😂', emotion: 'playful', weight: 2, duration: 180 },
  dullHumor: { label: '썰렁한 유머', icon: '🥶', emotion: 'bored', weight: 1, duration: 120 },
  awkward: { label: '어색한 분위기', icon: '😅', emotion: 'embarrassed', weight: 1, duration: 120 },
  flattered: { label: '우쭐함', icon: '🌟', emotion: 'happy', weight: 1, duration: 180 },
  warmHug: { label: '따뜻한 포옹', icon: '🤗', emotion: 'happy', weight: 1, duration: 180 },
  argued: { label: '말다툼 후유증', icon: '💢', emotion: 'angry', weight: 2, duration: 240 },
  flirtyMood: { label: '두근두근', icon: '💗', emotion: 'flirty', weight: 2, duration: 180 },
  // Relationship milestones (buff_Relationship_*, Buff_Rejected*)
  newFriend: { label: '새 친구가 생겼어요', icon: '🤝', emotion: 'happy', weight: 1, duration: 240 },
  newBff: { label: '베프가 생겼어요', icon: '🤞', emotion: 'happy', weight: 2, duration: 600 },
  newPartner: { label: '연인이 생겼어요', icon: '💞', emotion: 'happy', weight: 2, duration: 480 },
  gotEngaged: { label: '약혼했어요!', icon: '💍', emotion: 'happy', weight: 3, duration: 1440 },
  rejected: { label: '거절당했어요', icon: '💔', emotion: 'embarrassed', weight: 4, duration: 360 },
  // Careers (buff_Career_*, Buff_CareerTone_*)
  promoted: { label: '승진했어요!', icon: '📈', emotion: 'happy', weight: 1, duration: 480 },
  demoted: { label: '강등당했어요', icon: '📉', emotion: 'embarrassed', weight: 1, duration: 480 },
  fired: { label: '해고당했어요', icon: '📦', emotion: 'sad', weight: 3, duration: 1440 },
  workStress: { label: '야근 스트레스', icon: '😮‍💨', emotion: 'stressed', weight: 1, duration: 240 },
  workRelaxed: { label: '여유로운 하루', icon: '☕', emotion: 'happy', weight: 1, duration: 240 },
  // What goes wrong at work (workTrouble.ts, 2026-10-25): a mistake, a telling-off, a rush, a clash, a difficult client, a hard day.
  workSlip: { label: '일을 그르쳤어요', icon: '😖', emotion: 'embarrassed', weight: 2, duration: 180 },
  scolded: { label: '상사에게 지적받았어요', icon: '🙇', emotion: 'embarrassed', weight: 3, duration: 240 },
  rushJob: { label: '급한 마감', icon: '⏰', emotion: 'stressed', weight: 3, duration: 240 },
  clashAtWork: { label: '동료와 부딪쳤어요', icon: '💢', emotion: 'angry', weight: 2, duration: 240 },
  rudeClient: { label: '무례한 손님', icon: '😤', emotion: 'angry', weight: 2, duration: 180 },
  hardDay: { label: '힘든 하루', icon: '😫', emotion: 'stressed', weight: 2, duration: 300 },
  goodWorkDay: { label: '일이 잘 풀린 날', icon: '✨', emotion: 'confident', weight: 2, duration: 300 },
  // A work episode's decision (episodes.ts EPISODE_BUFF)
  storyHappy: { label: '오늘 직장 이야기', icon: '😊', emotion: 'happy', weight: 2, duration: 240 },
  storyProud: { label: '내 결정이 뿌듯해요', icon: '😎', emotion: 'confident', weight: 2, duration: 240 },
  storyFocused: { label: '해야 할 일이 보여요', icon: '🧐', emotion: 'focused', weight: 2, duration: 240 },
  storyInspired: { label: '번뜩이는 생각', icon: '💡', emotion: 'inspired', weight: 2, duration: 240 },
  storySad: { label: '마음이 무거워요', icon: '😞', emotion: 'sad', weight: 2, duration: 240 },
  storyAngry: { label: '속상하고 화나요', icon: '😠', emotion: 'angry', weight: 2, duration: 240 },
  storyEmbarrassed: { label: '얼굴이 화끈해요', icon: '😳', emotion: 'embarrassed', weight: 2, duration: 240 },
  storyTense: { label: '긴장되는 하루', icon: '😣', emotion: 'stressed', weight: 2, duration: 240 },
  // What happened at work (careerEvents.ts; 참고 게임 chance cards hand out career buffs like these, ours)
  careerWin: { label: '직장에서 인정받았어요', icon: '🏅', emotion: 'confident', weight: 1, duration: 240 },
  careerOops: { label: '직장에서의 실수', icon: '😳', emotion: 'embarrassed', weight: 1, duration: 180 },
  careerTense: { label: '찜찜한 결정', icon: '😬', emotion: 'stressed', weight: 1, duration: 240 },
  careerWarm: { label: '따뜻한 보람', icon: '💗', emotion: 'happy', weight: 1, duration: 240 },
  // Wants and the satisfaction store (buff_Want_Gained_Happy; potion weights are ours)
  wantFulfilled: { label: '바람을 이뤘어요', icon: '✨', emotion: 'happy', weight: 1, duration: 90 },
  milestoneReached: { label: '열망 단계 달성', icon: '🏅', emotion: 'confident', weight: 2, duration: 240 },
  aspirationDone: { label: '평생의 열망을 이뤘어요', icon: '🏆', emotion: 'happy', weight: 3, duration: 1440 },
  potionEnergized: { label: '활력의 물약', icon: '🧪', emotion: 'energized', weight: 3, duration: 240 },
  potionPlayful: { label: '장난의 물약', icon: '🧪', emotion: 'playful', weight: 3, duration: 240 },
  potionFlirty: { label: '설렘의 물약', icon: '🧪', emotion: 'flirty', weight: 3, duration: 240 },
  studyDay: { label: '집중 학습의 날', icon: '📚', emotion: null, weight: 0, duration: 1440 },
  luckyDay: { label: '일이 잘 풀리는 날', icon: '✨', emotion: null, weight: 0, duration: 1440 },
  potionHappy: { label: '행복의 물약', icon: '🧪', emotion: 'happy', weight: 3, duration: 240 },
  potionFocus: { label: '집중의 물약', icon: '🧪', emotion: 'focused', weight: 3, duration: 240 },
  potionInspired: { label: '영감의 물약', icon: '🧪', emotion: 'inspired', weight: 3, duration: 240 },
  potionConfident: { label: '자신감의 물약', icon: '🧪', emotion: 'confident', weight: 3, duration: 240 },
  // Traits (Buff_Trait_*)
  lazyNap: { label: '꿀 같은 낮잠', icon: '🦥', emotion: 'happy', weight: 2, duration: 240 },
  lazyTv: { label: '뒹굴뒹굴 TV', icon: '🛋️', emotion: 'happy', weight: 1, duration: 180 },
  pumpedUp: { label: '몸이 풀렸어요', icon: '🏃', emotion: 'energized', weight: 2, duration: 240 },
  bookwormInspired: { label: '책에 푹 빠졌어요', icon: '📚', emotion: 'inspired', weight: 2, duration: 240 },
  // Telescope (참고 게임 buff_Object_Telescope_*, 240 minutes).
  vastUniverse: { label: '광활한 우주', icon: '🔭', emotion: 'focused', weight: 1, duration: 240 },
  nothingToSee: { label: '볼 만한 것이 없군', icon: '🔭', emotion: 'bored', weight: 1, duration: 240 },
  sawSomething: { label: '보면 안 될 것을 봤어', icon: '🔭', emotion: 'embarrassed', weight: 1, duration: 240 },
  naughtyNeighbors: { label: '짓궂은 이웃들', icon: '🔭', emotion: 'flirty', weight: 1, duration: 240 },
  spySuccess: { label: '염탐 성공', icon: '🔭', emotion: 'playful', weight: 1, duration: 240 },
  // After a party (참고 게임 sentiment buffs for good and bad parties, Korean names).
  // Toddlers (참고 게임 buff_Toddlers_TeachToTalk_LearnedWords, 60 minutes).
  learnedWords: { label: '말 배웠어!', icon: '🗣️', emotion: 'happy', weight: 1, duration: 60 },
  // Fears (참고 게임 buff_Fear_* effects and buff_Fear_ConfrontedRecently; "불이 무서워" and
  // "이루지 못한 꿈" are ours, 참고 게임 has no visible buff for them).
  fearDarkOutside: { label: '어둠이 무서워', icon: '🌑', emotion: 'scared', weight: 2, duration: 200 },
  fearDarkStartled: { label: '저 소리는 뭐였지?', icon: '🌑', emotion: 'scared', weight: 2, duration: 240 },
  fearFire: { label: '불이 무서워', icon: '🔥', emotion: 'scared', weight: 1, duration: 180 },
  fearBurglar: { label: '성가신 도둑은 이제 그만!', icon: '🦹', emotion: 'scared', weight: 2, duration: 480 },
  fearFailureWake: { label: '오늘은 어떤 실망이 기다리고 있을까?', icon: '📉', emotion: 'sad', weight: 1, duration: 180 },
  fearFailureCraft: { label: '대책 없는 실패자', icon: '📉', emotion: 'sad', weight: 1, duration: 180 },
  fearDeadEndJob: { label: '열정 없는 직업', icon: '💼', emotion: 'sad', weight: 1, duration: 240 },
  fearJudged: { label: '둥글게 비판해 주세요', icon: '👀', emotion: 'uncomfortable', weight: 1, duration: 240 },
  fearCrowded: { label: '너무 많은 사람들', icon: '👥', emotion: 'uncomfortable', weight: 2, duration: 240 },
  fearCrowded2: { label: '탈출해야 해', icon: '👥', emotion: 'stressed', weight: 3, duration: 360 },
  fearUnfulfilled: { label: '이루지 못한 꿈', icon: '🌫️', emotion: 'sad', weight: 1, duration: 240 },
  fearFaced: { label: '두려움 극복!', icon: '💪', emotion: 'confident', weight: 3, duration: 720 },
  // Ours (fears.ts, docs/ref-game/16-fears.md): the four worries of our own, and talking one over.
  fearLonely: { label: '혼자인 것 같아', icon: '😔', emotion: 'sad', weight: 1, duration: 240, decayMul: { social: 1.2 } },
  fearFutureNight: { label: '앞으로 뭘 하며 살지?', icon: '🧭', emotion: 'uncomfortable', weight: 1, duration: 180 },
  fearMoneyBill: { label: '또 고지서가…', icon: '💸', emotion: 'uncomfortable', weight: 1, duration: 240 },
  fearFamilyNight: { label: '실망시키면 어쩌지', icon: '🏠', emotion: 'uncomfortable', weight: 1, duration: 180 },
  fearShared: { label: '털어놓으니 마음이 가벼워', icon: '💬', emotion: 'happy', weight: 1, duration: 240 },
  // 2026-10-26 (fears.ts): the four new fears, and a fear come down a rung.
  fearStage: { label: '다리가 후들후들', icon: '🎤', emotion: 'stressed', weight: 1, duration: 120 },
  fearImposterLucky: { label: '운이 좋았을 뿐이야', icon: '🎭', emotion: 'uncomfortable', weight: 1, duration: 240 },
  fearExamNight: { label: '내일 망치면 어쩌지', icon: '📝', emotion: 'uncomfortable', weight: 1, duration: 180 },
  fearRejectionNerves: { label: '또 거절당하면 어쩌지', icon: '💔', emotion: 'uncomfortable', weight: 1, duration: 120 },
  fearStepDown: { label: '조금 덜 무서워졌어', icon: '🪜', emotion: 'confident', weight: 1, duration: 360 },
  // A colleague's day (colleagueLife.ts): a worry they came in with, good news, and good news shared.
  colleagueWorried: { label: '걱정이 있어요', icon: '😨', emotion: 'stressed', weight: 1, duration: 720 },
  colleagueGlad: { label: '기분 좋은 일이 있어요', icon: '😊', emotion: 'happy', weight: 1, duration: 720 },
  joyShared: { label: '기쁨을 함께 나눴어요', icon: '🥳', emotion: 'happy', weight: 2, duration: 240 },
  // Home from a friend's (ours).
  goodTimes: { label: '즐거운 방문', icon: '🏠', emotion: 'happy', weight: 1, duration: 240 },
  // Neighbours (참고 게임 buff_NeighborRelPhoneCall_Friendly_BroughtFriendsTogether Happy 1 for 120;
  // buff_Story_Progression_NeighborhoodStories_RelationshipUpdates_Neighbor_BecomingFriends Happy 1 for 360).
  broughtTogether: { label: '친구들을 연결하기', icon: '🤝', emotion: 'happy', weight: 1, duration: 120 },
  // Lot traits (lotTraits.ts; 참고 게임 buff_LotMods_BaseGame_*_Visible): Homey 120 minutes, the rest while at it (ours: an hour).
  lotCozy: { label: '포근한 우리 집', icon: '🛏️', emotion: 'happy', weight: 1, duration: 60 },
  lotTidy: { label: '말끔하게 치운 집', icon: '🧹', emotion: 'confident', weight: 1, duration: 60 },
  lotTable: { label: '둘러앉는 식탁', icon: '🍽️', emotion: 'happy', weight: 1, duration: 60 },
  lotStudy: { label: '공부가 잘되는 집', icon: '📚', emotion: 'focused', weight: 1, duration: 60 },
  lotNature: { label: '자연이 가까워요', icon: '🌿', emotion: 'happy', weight: 1, duration: 60 },
  lotLaughter: { label: '웃음이 끊이지 않아요', icon: '😄', emotion: 'playful', weight: 1, duration: 60 },
  lotWarmHeart: { label: '마음이 통해요', icon: '💛', emotion: 'happy', weight: 1, duration: 60 },
  lotDance: { label: '몸이 들썩여요', icon: '💃', emotion: 'energized', weight: 1, duration: 60 },
  lotHomey: { label: '아늑한 우리 집', icon: '🏠', emotion: 'happy', weight: 1, duration: 120 },
  lotConvivial: { label: '화기애애한 분위기', icon: '🎉', emotion: 'confident', weight: 1, duration: 60 },
  lotNaturalLight: { label: '쏟아지는 햇살', icon: '🌞', emotion: 'inspired', weight: 1, duration: 60 },
  lotScienceLair: { label: '연구실 분위기', icon: '🔬', emotion: 'focused', weight: 1, duration: 60 },
  lotFastInternet: { label: '빠른 인터넷', icon: '⚡', emotion: 'energized', weight: 1, duration: 60 },
  lotGreatAcoustics: { label: '울림 좋은 방', icon: '🎵', emotion: 'inspired', weight: 1, duration: 60 },
  lotFreshAir: { label: '상쾌한 바람', icon: '🍃', emotion: 'energized', weight: 1, duration: 60 },
  neighboursFriends: { label: '다다익선!', icon: '🏘️', emotion: 'happy', weight: 1, duration: 360 },
  greatParty: { label: '즐거웠던 파티를 기억하며', icon: '🎉', emotion: 'happy', weight: 2, duration: 120 },
  partyFun: { label: '즐거운 시간을 축하하며', icon: '🎉', emotion: 'playful', weight: 1, duration: 120 },
  // After a date (참고 게임 sentiment buffs: special bond, a date to forget).
  // Fishing (참고 게임 Buff_Skill_Fishing_GreatCatch / AmazingCatch, 180 minutes).
  // Rocket ship (참고 게임 Buff_Object_Rocketship_*, 240 minutes).
  exploredSpace: { label: '우주를 탐사함', icon: '🚀', emotion: 'happy', weight: 2, duration: 240 },
  orbitedMoon: { label: '달 궤도를 회전함', icon: '🌙', emotion: 'inspired', weight: 2, duration: 240 },
  spaceBattleWin: { label: '우주 전쟁에서 승리함!', icon: '🛸', emotion: 'confident', weight: 2, duration: 240 },
  bittenByAlien: { label: '외계 생물에게 물림', icon: '👽', emotion: 'uncomfortable', weight: 2, duration: 240 },
  bustedBySpacePolice: { label: '우주 경찰에게 걸리다!', icon: '🚨', emotion: 'embarrassed', weight: 2, duration: 240 },
  escapedCrash: { label: '불시착!', icon: '💥', emotion: 'dazed', weight: 3, duration: 240 },
  greatCatch: { label: '훌륭한 월척!', icon: '🐟', emotion: 'confident', weight: 1, duration: 180 },
  amazingCatch: { label: '놀라운 월척!', icon: '🐟', emotion: 'confident', weight: 2, duration: 180 },
  specialBond: { label: '특별한 유대감', icon: '💞', emotion: 'flirty', weight: 1, duration: 120 },
  dateToForget: { label: '잊고 싶은 데이트', icon: '💔', emotion: 'sad', weight: 2, duration: 120 },
  worstParty: { label: '사상 최악의 파티', icon: '😞', emotion: 'sad', weight: 2, duration: 120 },
  // Coming home from a venue (참고 게임 buff_Vehicle_Bike_FreshAir for the park; the museum one is ours).
  freshAir: { label: '신선한 공기', icon: '🌳', emotion: 'energized', weight: 2, duration: 240 },
  volunteerGlow: { label: '보람찬 봉사', icon: '🤝', emotion: 'happy', weight: 2, duration: 240 },
  drivePractice: { label: '운전 실력이 늘었어', icon: '🚗', emotion: 'confident', weight: 1, duration: 180 },
  studyDone: { label: '공부 보람', icon: '📖', emotion: 'focused', weight: 1, duration: 120 },
  artInspired: { label: '예술에서 받은 영감', icon: '🖼️', emotion: 'inspired', weight: 1, duration: 240 },
  grossPlumbing: { label: '역겨운 배관', icon: '🤢', emotion: 'uncomfortable', weight: 1, duration: 180 },
  meanMischief: { label: '야비한 즐거움', icon: '😈', emotion: 'happy', weight: 1, duration: 240 },
  monkeyKing: { label: '원숭이 대장', icon: '🐒', emotion: 'happy', weight: 1, duration: 240 },
  // Drinks (참고 게임 buff_Object_Drink_Bartending_0/2/3/4, 240 minutes).
  drinkOdd: { label: '맛이 좀 이상해', icon: '🍹', emotion: 'uncomfortable', weight: 1, duration: 240 },
  drinkSweet: { label: '감미로운 음료', icon: '🍹', emotion: 'happy', weight: 1, duration: 240 },
  drinkCool: { label: '시원한 음료', icon: '🍹', emotion: 'happy', weight: 1, duration: 240 },
  drinkTasty: { label: '맛있는 음료', icon: '🍹', emotion: 'happy', weight: 2, duration: 240 },
  // Keeps free will from mixing round after round (like 참고 게임 buff_Drink_CoffeeTeaCooldown, 180 minutes).
  drinkCooldown: { label: '음료 쉬는 중', icon: '🍹', emotion: null, weight: 0, duration: 180, hidden: true },
  // Piano (참고 게임 buff_Object_Piano_CoolKeyChords / _KillerKeyChords for the player, _JazzedUp for listeners).
  // Violin (참고 게임 buff_Object_Violin_SoothingStrings / _ScintillatingStrings, Buff_ViolinSadSong).
  soothingStrings: { label: '마음을 달래는 연주', icon: '🎻', emotion: 'happy', weight: 1, duration: 240 },
  scintillatingStrings: { label: '정열적인 연주', icon: '🎻', emotion: 'happy', weight: 2, duration: 240 },
  violinSadSong: { label: '우울한 멜로디', icon: '🎻', emotion: 'sad', weight: 2, duration: 240 },
  coolChords: { label: '멋진 화음', icon: '🎹', emotion: 'happy', weight: 1, duration: 240 },
  killerChords: { label: '끝내주는 건반 코드', icon: '🎹', emotion: 'happy', weight: 2, duration: 240 },
  jazzedUp: { label: '음악의 기쁨!', icon: '🎶', emotion: 'happy', weight: 2, duration: 240 },
  // Coffee (참고 게임 buff_Object_Coffee-Caffeine1 / -Overload: Energy decays at x0.25 while it lasts;
  // Loot_Caffeine sets the caffeine commodity to 200, which falls 1 a minute).
  caffeinated: { label: '카페인 충만', icon: '☕', emotion: 'energized', weight: 1, duration: 200, decayMul: { energy: 0.25 } },
  caffeineOverload: { label: '카페인 과다!', icon: '☕', emotion: 'dazed', weight: 1, duration: 120, decayMul: { energy: 0.25 } },
  // Chess (참고 게임 Buff_Object_ChessTable_Ponder, Buff_PlayChess_Focused*, Buff_Object_ChessTableWin*).
  chessPonder: { label: '두뇌 운동', icon: '♟️', emotion: 'focused', weight: 1, duration: 240 },
  chessFocusedLow: { label: '논리 싸움', icon: '♟️', emotion: 'focused', weight: 1, duration: 240 },
  chessFocusedMed: { label: '기막힌 한 수', icon: '♟️', emotion: 'focused', weight: 2, duration: 240 },
  chessWin: { label: '체스 승자', icon: '🏆', emotion: 'confident', weight: 1, duration: 240 },
  chessChampion: { label: '체스 챔피언', icon: '🏆', emotion: 'confident', weight: 2, duration: 240 },
  // Waking in a good bed (참고 게임 loot_Wakeup_HighQuality: 10% each of Buff_Trait_Feeling*, Korean names).
  wakeInspired: { label: '영감 받음', icon: '🛏️', emotion: 'inspired', weight: 1, duration: 240 },
  wakeEnergized: { label: '활기참', icon: '🛏️', emotion: 'energized', weight: 1, duration: 240 },
  wakeFocused: { label: '정신 집중!', icon: '🛏️', emotion: 'focused', weight: 1, duration: 240 },
  wakeFlirty: { label: '유혹적임', icon: '🛏️', emotion: 'flirty', weight: 1, duration: 240 },
  wakePlayful: { label: '장난스러움', icon: '🛏️', emotion: 'playful', weight: 1, duration: 240 },
  // Events
  peedSelf: { label: '실수했어요…', icon: '💦', emotion: 'embarrassed', weight: 5, duration: 240 },
  // Trait idles (참고 게임 Buff_Trait_Feeling*, 240 minutes each).
  feelingHappy: { label: '행복한 기분', icon: '😊', emotion: 'happy', weight: 1, duration: 240 },
  feelingConfident: { label: '자신만만함', icon: '😎', emotion: 'confident', weight: 1, duration: 240 },
  feelingEnergized: { label: '활기참', icon: '⚡', emotion: 'energized', weight: 1, duration: 240 },
  feelingFlirty: { label: '유혹적임', icon: '😘', emotion: 'flirty', weight: 1, duration: 240 },
  feelingFocused: { label: '정신 집중!', icon: '🧠', emotion: 'focused', weight: 1, duration: 240 },
  feelingInspired: { label: '영감 받음', icon: '💡', emotion: 'inspired', weight: 1, duration: 240 },
  feelingPlayful: { label: '장난스러움', icon: '😜', emotion: 'playful', weight: 1, duration: 240 },
  feelingSad: { label: '슬픔', icon: '😢', emotion: 'sad', weight: 1, duration: 240 },
  feelingAngry: { label: '화남', icon: '😠', emotion: 'angry', weight: 1, duration: 240 },
  // Trait needs running low (참고 게임 Buff_Trait_*; the low ones last while the need is low, refreshed every half hour).
  lovelorn: { label: '사랑에 죽고 사랑에 살고', icon: '💔', emotion: 'stressed', weight: 1, duration: 120 },
  promotionAnxiety: { label: '승진에 대한 불안', icon: '📉', emotion: 'stressed', weight: 1, duration: 240 },
  jobless: { label: '무직!', icon: '📉', emotion: 'stressed', weight: 2, duration: 240 },
  uncreative: { label: '권태로움', icon: '🥱', emotion: 'stressed', weight: 1, duration: 60 },
  missingFamily: { label: '가족이 그리워', icon: '🏠', emotion: 'sad', weight: 1, duration: 60 },
  needToGame: { label: '비디오 게임이 하고 싶어!', icon: '🎮', emotion: 'stressed', weight: 1, duration: 60 },
  unchallenged: { label: '지적 자극 없음', icon: '🧩', emotion: 'stressed', weight: 1, duration: 120 },
  coopedUp: { label: '갑갑해 죽겠네', icon: '🏚️', emotion: 'stressed', weight: 1, duration: 60 },
  outdoorsFreshAir: { label: '신선한 공기!', icon: '🌳', emotion: 'happy', weight: 2, duration: 120 },
  wantNewStuff: { label: '퀴퀴한 환경', icon: '🛍️', emotion: 'stressed', weight: 1, duration: 120 },
  noMusic: { label: '음악이 끝났을 때', icon: '🔇', emotion: 'stressed', weight: 1, duration: 120 },
  // Trait moments (참고 게임 Buff_Trait_*).
  insaneHappy: { label: '샤방샤방', icon: '🌀', emotion: 'happy', weight: 1, duration: 180 },
  insaneSad: { label: '슈잉 슈잉 슈잉!', icon: '🌀', emotion: 'sad', weight: 1, duration: 180 },
  insaneAngry: { label: '으캬캭캭', icon: '🌀', emotion: 'angry', weight: 1, duration: 180 },
  insaneFlirty: { label: '음헤헤헤헤헤', icon: '🌀', emotion: 'flirty', weight: 1, duration: 180 },
  artLoverInspired: { label: '영감을 주는 예술', icon: '🖼️', emotion: 'inspired', weight: 2, duration: 240 },
  broLove: { label: '의리 있는 친구들과 어울림', icon: '💪', emotion: 'happy', weight: 1, duration: 60 },
  eternalChild: { label: '영원한 동심', icon: '🪀', emotion: 'playful', weight: 2, duration: 240 },
  sillyMe: { label: '어머, 나 좀 봐!', icon: '🤕', emotion: 'playful', weight: 1, duration: 60 },
  trappedCareer: { label: '덫에 갇힌 기분', icon: '🕸️', emotion: 'stressed', weight: 1, duration: 240 },
  trappedRelationship: { label: '권태로움', icon: '🕸️', emotion: 'stressed', weight: 1, duration: 240 },
  freedFromJob: { label: '직장에서 해방됨', icon: '🕊️', emotion: 'happy', weight: 2, duration: 480 },
  evilNearMisery: { label: '너의 불행은 곧 나의 행복', icon: '😈', emotion: 'happy', weight: 1, duration: 60 },
  nearFamily: { label: '가족과 함께 보내는 시간', icon: '🏠', emotion: 'happy', weight: 1, duration: 60 },
  foodieInspired: { label: '요리 아이디어가 떠오름', icon: '🍝', emotion: 'inspired', weight: 2, duration: 240 },
  collectedSomething: { label: '수집품 획득!', icon: '🤓', emotion: 'confident', weight: 1, duration: 240 },
  didGood: { label: '참 잘했어요', icon: '😇', emotion: 'happy', weight: 2, duration: 240 },
  notFunny: { label: '썰렁해', icon: '😒', emotion: 'bored', weight: 2, duration: 120 },
  peopleTireMe: { label: '누군가 많으면 피곤해', icon: '😒', emotion: 'uncomfortable', weight: 3, duration: 120 },
  silenceUnderrated: { label: '침묵의 가치는 과소평가 되었다니까', icon: '🤫', emotion: 'happy', weight: 1, duration: 180 },
  noKidsZone: { label: '노키즈 존', icon: '🚸', emotion: 'happy', weight: 1, duration: 120 },
  babyAnxiety: { label: '임신에 대한 불안', icon: '🚸', emotion: 'stressed', weight: 1, duration: 240 },
  cryingBabyHater: { label: '우는 아기', icon: '😖', emotion: 'angry', weight: 2, duration: 120 },
  justAdmired1: { label: '난 물건이 좋아요!', icon: '💎', emotion: 'happy', weight: 1, duration: 240 },
  justAdmired2: { label: '난 물건이 좋아요!', icon: '💎', emotion: 'happy', weight: 2, duration: 240 },
  justAdmired3: { label: '난 물건이 좋아요!', icon: '💎', emotion: 'happy', weight: 3, duration: 240 },
  musicInspired: { label: '음악에 영감 받음', icon: '🎼', emotion: 'inspired', weight: 2, duration: 120 },
  composedMusic: { label: '음악을 작곡함', icon: '🎼', emotion: 'happy', weight: 1, duration: 120 },
  cleaningFrenzy: { label: '광적인 청소!', icon: '🧹', emotion: 'energized', weight: 3, duration: 150 },
  perfectWork: { label: '완벽하게 제작함', icon: '💯', emotion: 'happy', weight: 3, duration: 240 },
  poorWork: { label: '만족스럽지 않은 작업', icon: '😣', emotion: 'embarrassed', weight: 2, duration: 180 },
  // Our research-based traits (traits.ts, docs/ref-game/04 §3.6).
  plannerOnTrack: { label: '계획대로 착착', icon: '📅', emotion: 'confident', weight: 1, duration: 240 },
  needAdventure: { label: '모험이 고파', icon: '🧗', emotion: 'bored', weight: 1, duration: 120 },
  adventureRush: { label: '짜릿한 도전', icon: '🧗', emotion: 'energized', weight: 2, duration: 240 },
  cozyHome: { label: '역시 집이 최고야', icon: '🛋️', emotion: 'happy', weight: 1, duration: 120 },
  relieved: { label: '마음이 놓여', icon: '😌', emotion: 'happy', weight: 1, duration: 120 },
  deeplyMoved: { label: '마음이 뭉클해', icon: '🌷', emotion: 'inspired', weight: 2, duration: 120 },
  thriftyPride: { label: '알뜰살뜰 뿌듯해', icon: '💰', emotion: 'confident', weight: 1, duration: 180 },
  // Death and the Grim Reaper (참고 게임 buff_Death_Electrocution_Warning, Buff_GrimReaper_Spared / _PleadSuccess).
  treated: { label: '치료받음', icon: '🩹', emotion: 'happy', weight: 1, duration: 240 },
  /*
   * Moodlets for moods that had few (2026-11-01, at the user's request; docs/mood-moodlets.md gives each one's
   * situation, how often and why): each on a thing that happens in the game and left the dweller unmoved.
   */
  // Angry
  prankedAngry: { label: '장난에 당해서 약 올라요', icon: '😤', emotion: 'angry', weight: 1, duration: 120 },
  brokeDown: { label: '쓰다가 고장 나다니!', icon: '💥', emotion: 'angry', weight: 1, duration: 120 },
  robbedAngry: { label: '도둑맞아서 분해요', icon: '🦹', emotion: 'angry', weight: 2, duration: 360 },
  // Bored
  sameAgain: { label: '또 이거야…', icon: '🥱', emotion: 'bored', weight: 1, duration: 120 },
  sameTalk: { label: '자꾸 같은 얘기만 해요', icon: '💤', emotion: 'bored', weight: 1, duration: 120 },
  stuckAtHome: { label: '며칠째 집에만 있었어요', icon: '🏠', emotion: 'bored', weight: 1, duration: 720 },
  // Scared
  frightened: { label: '깜짝 놀랐어요!', icon: '😨', emotion: 'scared', weight: 2, duration: 60 },
  intruder: { label: '집에 누가 들어왔어요!', icon: '🚨', emotion: 'scared', weight: 2, duration: 240 },
  sawReaper: { label: '저승사자를 봤어요', icon: '💀', emotion: 'scared', weight: 3, duration: 240 },
  // Dazed
  cameTo: { label: '정신이 몽롱해요', icon: '💫', emotion: 'dazed', weight: 2, duration: 60 },
  halfAwake: { label: '잠이 덜 깼어요', icon: '😪', emotion: 'dazed', weight: 1, duration: 60 },
  foggyHead: { label: '일을 마치니 머리가 멍해요', icon: '🌫️', emotion: 'dazed', weight: 1, duration: 90 },
  // Flirty
  sweetLinger: { label: '달콤한 여운', icon: '💗', emotion: 'flirty', weight: 1, duration: 120 },
  dateGlow: { label: '데이트 날이에요', icon: '💕', emotion: 'flirty', weight: 2, duration: 180 },
  blushing: { label: '칭찬에 얼굴이 빨개졌어요', icon: '😊', emotion: 'flirty', weight: 1, duration: 90 },
  // Focused
  deepInIt: { label: '몰입이 시작됐어요', icon: '🎯', emotion: 'focused', weight: 1, duration: 120 },
  injured: { label: '몸을 다침', icon: '🩹', emotion: 'uncomfortable', weight: 4, decayMul: { energy: 1.5, fun: 1.25 } },
  shockWarning: { label: '심하게 감전됨', icon: '⚡', emotion: 'dazed', weight: 40, duration: 180 },
  spared: { label: '죽음과 살짝 스침', icon: '💀', emotion: 'happy', weight: 3, duration: 1440 },
  savedFromDeath: { label: '누군가를 죽음에서 구함', icon: '🙏', emotion: 'happy', weight: 2, duration: 360 },
  sawGhost: { label: '유령을 봤어요', icon: '👻', emotion: 'scared', weight: 1, duration: 60 },
  // An infant's smiles (ours, for 참고 게임's sunny infants).
  infantSmile: { label: '방긋방긋', icon: '😊', emotion: 'happy', weight: 1, duration: 120 },
  // 참고 게임 Buff_Adoption.
  adoptedChild: { label: '아이 입양', icon: '🫂', emotion: 'happy', weight: 3, duration: 1440 },
  // Toddler traits (참고 게임 Buff_Trait_Toddler_*).
  angelicEasygoing: { label: '천사처럼 사랑스러운 아기', icon: '😇', emotion: 'happy', weight: 1, duration: 240 },
  whereIsEveryone: { label: '다들 어디 갔지?', icon: '🥺', emotion: 'sad', weight: 1, duration: 120 },
  wheresMamaDada: { label: '엄마 아빠는 어디에?', icon: '🥺', emotion: 'sad', weight: 1, duration: 120 },
  onMyOwn: { label: '혼자서도 잘해요', icon: '🦸', emotion: 'happy', weight: 1, duration: 120 },
  needToLearn: { label: '배우고 싶어', icon: '🔎', emotion: 'sad', weight: 1, duration: 240 },
  learnedSomethingNew: { label: '새로운 것을 배웠어요', icon: '💡', emotion: 'happy', weight: 1, duration: 240 },
  sillyWhagga: { label: '랄라 룰루 랄라 룰루', icon: '🤪', emotion: 'playful', weight: 1, duration: 240 },
  wildRun: { label: '달려라, 달려', icon: '🏃', emotion: 'energized', weight: 1, duration: 240 },
  fussyAnger: { label: '불만 가득', icon: '😤', emotion: 'angry', weight: 1, duration: 30 },
  parentingStress: { label: '육아 스트레스', icon: '😩', emotion: 'stressed', weight: 1, duration: 30 },
  pottyAccident: { label: '용변 사고', icon: '💦', emotion: 'sad', weight: 1, duration: 240 },
  // 참고 게임 Buff_Pool_Happy_RelaxingSwim, buff_Object_Microscope_Inspired, buff_Object_cozyFire.
  relaxingSwim: { label: '즐거운 수영', icon: '🏊', emotion: 'happy', weight: 2, duration: 240 },
  scienceInspired: { label: '과학에서 영감 얻음', icon: '🔬', emotion: 'inspired', weight: 1, duration: 240 },
  cozyFire: { label: '아늑한 난로', icon: '🔥', emotion: 'happy', weight: 1, duration: 60 },
  // 참고 게임 buff_Object_BirthdayCake_Celebrate.
  birthdayCelebrate: { label: '생일!', icon: '🎂', emotion: 'happy', weight: 1, duration: 240 },
  foodieTvCooldown: { label: '요리 아이디어 쿨다운', icon: '🍝', emotion: null, weight: 0, duration: 2880, hidden: true },
  // 참고 게임 buff_Object_Homework_Complete (Confident 1, 240 minutes).
  homeworkDone: { label: '숙제 챔피언', icon: '📚', emotion: 'confident', weight: 1, duration: 240 },
  // 참고 게임 buff_Infant_RudeAwakening (Stressed 1); the four hours are ours.
  rudeAwakening: { label: '불쾌한 기상', icon: '😫', emotion: 'stressed', weight: 1, duration: 240 },
  faintedFromHunger: { label: '굶어서 쓰러졌음', icon: '😵‍💫', emotion: 'uncomfortable', weight: 3, duration: 240 },
};

// Likes and dislikes (참고 게임 buff_DwellerPreference_Likes_* Happy 1, _Dislikes_* Stressed 2), for the hour after
// starting; a topic or kind of person (ours) for the hour after the talk.
// Lasting 90 minutes rather than 60 since 2026-10-26 (at the user's request: felt, not overpowering).
for (const a of PREFERENCES) {
  BUFFS[`like_${a.id}`] = { label: a.likes, icon: '💚', emotion: 'happy', weight: 1, duration: 90 };
  BUFFS[`dislike_${a.id}`] = { label: a.dislikes, icon: '💢', emotion: 'stressed', weight: 2, duration: 90 };
}
// A liked activity not done for two days (ours): missed until it's done again.
for (const a of ACTIVITIES) BUFFS[`miss_${a.id}`] = { label: `${a.label} 하고 싶어요`, icon: a.icon, emotion: 'sad', weight: 1, duration: 1440 };
// Growing with time and with doing (2026-10-26, at the user's request, ours): five days without a liked
// activity, or a disliked one three times lately, is felt more.
for (const a of ACTIVITIES) {
  BUFFS[`missBad_${a.id}`] = { label: `${a.label} 너무 하고 싶어요`, icon: a.icon, emotion: 'sad', weight: 2, duration: 1440 };
  BUFFS[`dislikeBad_${a.id}`] = { label: `${a.label} 또 해야 하다니…`, icon: '💢', emotion: 'stressed', weight: 3, duration: 120 };
}

/** Decor ambience moodlets (참고 게임 Buff_Environment_<Mood>Ambience*): 10/80/640 → weight 1/2/3. */
export const ENV_EMOTIONS: EmotionKey[] = ['happy', 'confident', 'energized', 'flirty', 'focused', 'inspired', 'playful'];
const ENV_SIZES: Array<[number, string, number]> = [
  [640, '아주 멋진', 3],
  [80, '멋진', 2],
  [10, '기분 좋은', 1],
];
const ENV_NAMES: Partial<Record<EmotionKey, string>> = {
  happy: '공간',
  confident: '품격 있는 공간',
  energized: '활기찬 공간',
  flirty: '로맨틱한 공간',
  focused: '차분한 공간',
  inspired: '영감을 주는 공간',
  playful: '유쾌한 공간',
};
for (const e of ENV_EMOTIONS) {
  ENV_SIZES.forEach(([, word, weight]) => {
    BUFFS[`env_${e}_${weight}`] = { label: `${word} ${ENV_NAMES[e]}`, icon: '🖼️', emotion: e, weight };
  });
}
/** 참고 게임 Buff_Environment_Negative_*: 11/21/41 → Uncomfortable 1/2/3. */
BUFFS.env_bad_1 = { label: '어수선한 주변', icon: '🍽️', emotion: 'uncomfortable', weight: 1 };
BUFFS.env_bad_2 = { label: '지저분한 주변', icon: '🪰', emotion: 'uncomfortable', weight: 2 };
BUFFS.env_bad_3 = { label: '엉망진창인 주변', icon: '🗑️', emotion: 'uncomfortable', weight: 3 };

/** The ambience moodlet for summed decor scores, or null; negative surroundings win (참고 게임). */
export function environmentBuff(scores: Partial<Record<EmotionKey, number>>, negative: number): string | null {
  if (negative >= 41) return 'env_bad_3';
  if (negative >= 21) return 'env_bad_2';
  if (negative >= 11) return 'env_bad_1';
  let best: EmotionKey | null = null;
  for (const e of ENV_EMOTIONS) if ((scores[e] ?? 0) > (best ? scores[best]! : 0)) best = e;
  if (!best) return null;
  const size = ENV_SIZES.find(([at]) => scores[best]! >= at);
  return size ? `env_${best}_${size[2]}` : null;
}

export function isEnvironmentBuff(id: string): boolean {
  return id.startsWith('env_');
}

/** Need-band moodlets in 참고 게임's bands, mapped from -100..100 onto our 0..100 scale. */
const NEED_BANDS: Record<NeedKey, Array<[number, string]>> = {
  hunger: [[12.5, 'starving'], [25, 'hungry'], [37.5, 'hungerYellow']],
  energy: [[12.5, 'exhausted'], [25, 'tired']],
  bladder: [[12.5, 'reallyHasToPee'], [25, 'hasToPee'], [37.5, 'bladderYellow']],
  hygiene: [[0.5, 'filthy'], [25, 'grungy']],
  fun: [[0.5, 'desperateForFun'], [25, 'needsAmusement'], [37.5, 'funYellow']],
  social: [[0.5, 'desolate'], [25, 'lonely'], [37.5, 'socialYellow']],
};

/** Moodlets that exist only while a condition on the needs holds. */
export const CONDITION_BUFF_IDS = new Set([...Object.values(NEED_BANDS).flatMap((bands) => bands.map(([, id]) => id)), 'allNeedsGood', 'allNeedsGreat', 'powerCut', 'waterCut', 'nothingToEat']);

export function needBuff(k: NeedKey, v: number): string | null {
  for (const [below, id] of NEED_BANDS[k]) if (v < below) return id;
  return null;
}

/** All-motives-high Happy moodlet: bladder/energy/hunger ≥ 37.5 and fun/hygiene/social ≥ 75 (87.5 for the stronger one). */
export function allNeedsBuff(n: Needs): string | null {
  const body = n.bladder >= 37.5 && n.energy >= 37.5 && n.hunger >= 37.5;
  if (!body) return null;
  const rest = Math.min(n.fun, n.hygiene, n.social);
  if (rest >= 87.5) return 'allNeedsGreat';
  if (rest >= 75) return 'allNeedsGood';
  return null;
}

/** The emotion that boosts each skill (참고 게임 skill `mood_id`). */
export const SKILL_EMOTION: Record<SkillKey, EmotionKey> = {
  cooking: 'inspired',
  logic: 'focused',
  charisma: 'confident',
  fitness: 'energized',
  painting: 'inspired',
  guitar: 'inspired',
  writing: 'inspired',
  handiness: 'focused',
  gardening: 'focused',
  comedy: 'playful',
  piano: 'inspired',
  mixology: 'inspired',
  creativity: 'inspired',
  mental: 'focused',
  motor: 'energized',
  childSocial: 'confident',
  mischief: 'playful',
  videoGaming: 'focused',
  fishing: 'focused',
  rocketScience: 'focused',
  programming: 'focused',
  violin: 'inspired',
  gourmet: 'inspired',
  photography: 'inspired',
  dancing: 'energized',
  singing: 'inspired',
  djMixing: 'inspired',
  empathy: 'happy',
  leadership: 'confident',
  medicine: 'focused',
  science: 'focused',
  law: 'focused',
  business: 'confident',
  language: 'focused',
  driving: 'focused',
  // Competencies of the mind (ours): a calm, steady mind helps them along.
  selfControl: 'focused',
  persistence: 'focused',
  resilience: 'confident',
  curiosity: 'inspired',
  talk: 'happy',
  imagination: 'playful',
  movement: 'energized',
  potty: 'happy',
  thinking: 'happy',
};

/**
 * Skill-gain multipliers by emotion and intensity, from 참고 게임's hidden mood buffs
 * (docs/ref-game/02 §3.4). Our skills map onto 참고 게임 tags: cooking, painting and guitar = Creative,
 * logic = Mental, charisma = Social, fitness = Physical.
 */
const SKILL_GAIN: Partial<Record<EmotionKey, Partial<Record<SkillKey | 'all', number[]>>>> = {
  happy: { all: [1.2, 1.4], empathy: [1.4, 1.6] },
  confident: { all: [1.2, 1.4], charisma: [1.4, 1.6], childSocial: [1.4, 1.6], leadership: [1.4, 1.6], business: [1.4, 1.6] },
  flirty: { charisma: [1.32, 1.54] },
  energized: { fitness: [1.4, 1.6], motor: [1.4, 1.6], dancing: [1.4, 1.6] },
  focused: { logic: [1.4, 1.6], handiness: [1.4, 1.6], gardening: [1.4, 1.6], mental: [1.4, 1.6], videoGaming: [1.4, 1.6], fishing: [1.4, 1.6], rocketScience: [1.4, 1.6], programming: [1.4, 1.6], medicine: [1.4, 1.6], science: [1.4, 1.6], law: [1.4, 1.6], language: [1.4, 1.6], driving: [1.4, 1.6] },
  inspired: { cooking: [1.4, 1.6], painting: [1.4, 1.6], guitar: [1.4, 1.6], piano: [1.4, 1.6], mixology: [1.4, 1.6], creativity: [1.4, 1.6], violin: [1.4, 1.6], gourmet: [1.4, 1.6], photography: [1.4, 1.6], writing: [1.4, 1.6], singing: [1.4, 1.6], djMixing: [1.4, 1.6] },
  sad: { logic: [0.8, 0.6], programming: [0.8, 0.6], videoGaming: [0.8, 0.6], charisma: [0.8, 0.6], fitness: [0.8, 0.6], cooking: [1.2, 1], painting: [1.2, 1], guitar: [1.2, 1], piano: [1.2, 1], mixology: [1.2, 1], writing: [1.2, 1] },
  angry: { logic: [0.8, 0.6, 0.4], programming: [0.8, 0.6, 0.4], videoGaming: [0.8, 0.6, 0.4], cooking: [0.8, 0.6, 0.4], painting: [0.8, 0.6, 0.4], guitar: [0.8, 0.6, 0.4], piano: [0.8, 0.6, 0.4], mixology: [0.8, 0.6, 0.4], writing: [0.8, 0.6, 0.4] },
  embarrassed: { charisma: [0.8, 0.6, 0.4] },
  stressed: { all: [0.8, 0.6] },
  uncomfortable: { all: [0.8, 0.6] },
  bored: { all: [0.8] },
  dazed: { all: [0.5] },
  playful: { comedy: [1.4, 1.6, 1.8], mischief: [1.4, 1.6, 1.8] },
};

/** The skill-gain table of a mood, for the mood card (moodEffects.ts). */
export const skillGainTable = (e: EmotionKey) => SKILL_GAIN[e];
export const NEED_LABELS: Record<NeedKey, string> = { hunger: '배고픔', energy: '에너지', bladder: '생리현상', hygiene: '위생', fun: '재미', social: '사교' };

export function skillGainMultiplier(state: EmotionState, skill: SkillKey, sadFriendly = false): number {
  const table = SKILL_GAIN[state.emotion];
  const levels = table?.[skill] ?? table?.all;
  if (!levels) return 1;
  const m = levels[Math.min(state.intensity, levels.length - 1)];
  return sadFriendly && state.emotion === 'sad' ? Math.max(1, m) : m;
}

/** Emotion effects on how much free will wants to fix a need (참고 게임 `score_multipliers`). */
export const EMOTION_NEED_DRIVE: Partial<Record<EmotionKey, Partial<Needs>>> = {
  // Dazed: 참고 게임 suggests a quick nap or a bath to shake it off.
  dazed: { energy: 1.5, hygiene: 1.5 },
  sad: { hygiene: 0.25 },
  embarrassed: { social: 0.25 },
  flirty: { social: 1.5 },
  energized: { energy: 0.031 },
};

export interface EmotionState {
  emotion: EmotionKey;
  weight: number;
  intensity: number;
  /** When Happy moodlets have been folded into another positive emotion, that emotion. */
  happyAs?: EmotionKey;
}

function intensityOf(emotion: EmotionKey, weight: number): number {
  return EMOTIONS[emotion].thresholds.filter((t) => weight >= t).length;
}

/**
 * 참고 게임's mood rule (docs/ref-game/02 §3.2–3.3):
 * - sum moodlet weights per emotion; Happy moodlets fold into the heaviest other positive
 *   emotion (Focused 2 + Happy 3 reads as Focused 5);
 * - the heaviest emotion wins, ties keep the current one, no moodlets means Fine;
 * - to avoid flicker, a different emotion only takes over if it is Fine, weaker in intensity,
 *   at least one intensity step stronger, or the current emotion is Happy with the same polarity.
 */
export function computeEmotion(
  buffs: ActiveBuff[],
  current: EmotionKey = 'fine',
  weightOf: (id: string, base: number) => number = (_id, base) => base,
): EmotionState {
  const totals = new Map<EmotionKey, number>();
  let happy = 0;
  for (const b of buffs) {
    const def = BUFFS[b.id];
    const w = def ? weightOf(b.id, def.weight) : 0;
    if (!def?.emotion || w <= 0) continue;
    if (def.emotion === 'happy') happy += w;
    else totals.set(def.emotion, (totals.get(def.emotion) ?? 0) + w);
  }
  let bestPositive: EmotionKey | null = null;
  for (const [e, w] of totals) {
    if (EMOTIONS[e].polarity !== 'positive') continue;
    if (!bestPositive || w > totals.get(bestPositive)! || (w === totals.get(bestPositive) && e === current)) bestPositive = e;
  }
  let happyAs: EmotionKey | undefined;
  if (happy > 0) {
    if (bestPositive) {
      totals.set(bestPositive, totals.get(bestPositive)! + happy);
      happyAs = bestPositive;
    } else totals.set('happy', happy);
  }

  let emotion: EmotionKey = 'fine';
  let weight = 0;
  for (const [e, w] of totals) {
    if (w > weight || (w === weight && e === current)) {
      emotion = e;
      weight = w;
    }
  }
  const candidate: EmotionState = { emotion, weight, intensity: intensityOf(emotion, weight), happyAs };
  if (candidate.emotion === current || current === 'fine' || candidate.emotion === 'fine') return candidate;

  const currentWeight = totals.get(current) ?? 0;
  if (currentWeight <= 0) return candidate;
  const currentIntensity = intensityOf(current, currentWeight);
  const sameSideHappy = current === 'happy' && EMOTIONS[candidate.emotion].polarity === 'positive';
  const switches =
    sameSideHappy || candidate.intensity === 0 || candidate.intensity < currentIntensity || candidate.intensity >= currentIntensity + 1;
  return switches ? candidate : { emotion: current, weight: currentWeight, intensity: currentIntensity, happyAs };
}

/** Plumbob colour: green while content, yellow then red as a negative emotion intensifies. */
export function plumbobColor(state: EmotionState): string {
  if (EMOTIONS[state.emotion].polarity !== 'negative') return '#3fd16a';
  return state.intensity >= 1 ? '#e53935' : '#f9c531';
}

export function emotionName(state: EmotionState): string {
  const levels = EMOTIONS[state.emotion].levels;
  return levels[Math.min(state.intensity, levels.length - 1)];
}
