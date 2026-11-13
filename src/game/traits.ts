import type { SocialCategory } from './relationships';
import type { Needs, SkillKey } from './types';

/**
 * Personality traits as bundles of modifiers, the way 참고 게임 builds them from hidden buffs
 * (docs/ref-game/04 §3). Numbers marked "참고 게임" come from the game's trait buffs; the rest adapt a
 * trait to systems this game has (we have no fitness or cleaning yet).
 */
export interface TraitDef {
  id: string;
  label: string;
  icon: string;
  desc: string;
  conflicts: string[];
  /** Need decay multipliers. */
  decayMul?: Partial<Needs>;
  /** Multipliers on how much free will wants to fix each need. */
  needDrive?: Partial<Needs>;
  /** Moodlet weight overrides (0 drops the emotion). */
  buffWeight?: Record<string, number>;
  /** Moodlets swapped for another (or removed with null) when they would be added. */
  buffReplace?: Record<string, string | null>;
  /** Extra moodlet after finishing an interaction, by interaction id. */
  onInteraction?: Record<string, string>;
  /** Context-score bonus for socials of a category. */
  socialBonus?: Partial<Record<SocialCategory, number>>;
  /** Free-will multiplier for particular socials. */
  socialDrive?: Record<string, number>;
  /** Relationship decay multiplier for this dweller's relationships. */
  relDecayMul?: number;
  /** Sadness doesn't slow learning. */
  sadFriendly?: boolean;
  /** Bought with satisfaction points rather than picked in Create-a-Dweller. */
  reward?: boolean;
  /** Learns these skills faster (참고 게임 skill_tag modifiers, e.g. the gifted traits x1.25). */
  skillMul?: Partial<Record<SkillKey, number>>;
  /** Ages that can have it (참고 게임 trait ages); all from child up if left out. */
  ages?: Array<'toddler' | 'child' | 'teen' | 'adult'>;
  /**
   * A toddler trait's timer (참고 게임 commodity_Trait_Toddler_*: decays a minute from `minutes`): a mood
   * now and then (`every`), or when parents or company have been missing that long.
   */
  toddler?: { kind: 'every' | 'noParents' | 'noCompany' | 'noLearning'; minutes: number; buff: string };
  /** A hidden trait need (참고 게임 commodity_Trait_*), see TraitNeed. */
  need?: TraitNeed;
  /** Free-will multipliers for interactions (our stand-in for 참고 게임's commodity_Trait_Autonomy_* ads). */
  drive?: Record<string, number>;
  /** Free-will multipliers for whole social categories (ours, from the same ads). */
  categoryDrive?: Partial<Record<SocialCategory, number>>;
  /** Looking after babies and toddlers (참고 게임 StaticCommodity_Caregiver_* score multipliers). */
  careDrive?: number;
  /** Now and then, idling, the trait shows (참고 게임 Idle_Trait_* mixers: Loot_Buff_Feeling*, every 2-8 hours). */
  idleFeeling?: string;
}

/**
 * A trait's hidden need, as 참고 게임 runs Creative, Genius, Music Lover and the like: a commodity that
 * runs down by `decay` a minute from a random start, and below `lowAt` the trait's stress moodlet
 * shows until the dweller does what the trait loves. Values are 참고 게임's (max, start range, decay, low mark);
 * how fast doing the thing refills it is ours.
 */
export interface TraitNeed {
  max: number;
  start: [number, number];
  decay: number;
  lowAt: number;
  lowBuff: string;
  /** Interactions that fill it while the dweller does them. */
  fills?: string[];
  /** Socials of these categories fill it. */
  socials?: SocialCategory[];
  /** Filled by being out of doors, or by family time. */
  by?: 'outdoors' | 'family';
  /** A moodlet when nearly full (참고 게임 LovesOutdoors FreshAir at 99). */
  highBuff?: string;
  highAt?: number;
}

export const TRAITS: TraitDef[] = [
  {
    id: 'glutton',
    label: '먹보',
    icon: '🍗',
    desc: '배고픔을 더 자주 챙기고, 배고프면 두 배로 불편해요.',
    conflicts: ['foodie'],
    needDrive: { hunger: 1.5 }, // 참고 게임 Buff_Trait_Glutton
    buffWeight: { hungry: 2 }, // 참고 게임 Hungry → HungryGlutton
  },
  {
    id: 'lazy',
    label: '게으름',
    icon: '🦥',
    desc: '낮잠과 TV를 사랑해요.',
    conflicts: ['active', 'ambitious', 'neat', 'steadfast'],
    onInteraction: { nap: 'lazyNap', watch: 'lazyTv', watchTv: 'lazyTv' }, // 참고 게임 Buff_Trait_Lazy_Nap / _TV
  },
  {
    id: 'active',
    label: '활동적',
    icon: '🏃',
    desc: '몸을 움직이면 기운이 넘쳐요.',
    conflicts: ['lazy'],
    onInteraction: { dance: 'pumpedUp', workout: 'pumpedUp' },
    idleFeeling: 'feelingEnergized',
  },
  {
    id: 'cheerful',
    label: '유쾌함',
    icon: '🌞',
    desc: '다정한 대화가 더 잘 통해요.',
    conflicts: ['gloomy', 'hotHeaded', 'grouch'],
    socialBonus: { friendly: 3 }, // 참고 게임 friendly_affection +3
    idleFeeling: 'feelingHappy',
  },
  {
    id: 'gloomy',
    label: '우울함',
    icon: '🌧️',
    desc: '슬퍼도 꿋꿋하게 배워요.',
    conflicts: ['cheerful', 'hotHeaded', 'optimist'],
    sadFriendly: true,
    idleFeeling: 'feelingSad',
  },
  {
    id: 'loner',
    label: '외톨이',
    icon: '🎧',
    desc: '혼자서도 괜찮아요. 사교 욕구가 천천히 줄어요.',
    conflicts: ['outgoing', 'moodMaker'],
    decayMul: { social: 0.5 }, // 참고 게임
    needDrive: { social: 0.5 }, // 참고 게임
    buffReplace: { lonely: null, desolate: 'lonely' }, // 참고 게임 MoodReplacement_lowSocial
  },
  {
    id: 'outgoing',
    label: '외향적임',
    icon: '🎉',
    desc: '사람을 좋아하고, 대화가 즐거우면 더 행복해요.',
    conflicts: ['loner', 'grouch', 'shy'],
    decayMul: { social: 1.1 }, // 참고 게임
    buffWeight: { lonely: 2, deepConnection: 2, warmHug: 2, flattered: 2 }, // 참고 게임 *_Outgoing
  },
  {
    id: 'slob',
    label: '지저분함',
    icon: '🧦',
    desc: '씻는 데 별 관심이 없어요.',
    conflicts: ['neat'],
    needDrive: { hygiene: 0.15 }, // 참고 게임 Buff_Trait_Slob
    buffWeight: { grungy: 0 },
  },
  {
    id: 'bookworm',
    label: '책벌레',
    icon: '📚',
    desc: '책을 읽으면 영감이 샘솟아요.',
    conflicts: [],
    onInteraction: { read: 'bookwormInspired', cookbook: 'bookwormInspired' }, // 참고 게임 Buff_Trait_Bookworm_Inspired
  },
  {
    id: 'hotHeaded',
    label: '다혈질',
    icon: '🌋',
    desc: '쉽게 화가 나고, 모욕을 서슴지 않아요.',
    conflicts: ['cheerful', 'gloomy', 'easygoing'],
    buffWeight: { argued: 3 },
    socialBonus: { mean: 10 },
    idleFeeling: 'feelingAngry',
  },
  {
    id: 'loyal',
    label: '충실함',
    icon: '🤝',
    desc: '한번 맺은 관계가 쉽게 식지 않아요.',
    conflicts: ['commitmentIssues'],
    ages: ['teen', 'adult'],
    relDecayMul: 0.5, // 참고 게임 relationship_track_decay_modifier
  },
  {
    id: 'goofball',
    label: '광대',
    icon: '🤡',
    desc: '농담을 즐기고, 농담이 잘 먹혀요.',
    conflicts: [],
    socialBonus: { funny: 15 }, // 참고 게임 content_score_bonus +15
    socialDrive: { joke: 1.5 },
    idleFeeling: 'feelingPlayful',
  },
  // ---- The rest of 참고 게임's personality traits (trait_*: Korean names, ages and conflicts from the game).
  {
    id: 'romantic',
    label: '낭만주의자',
    icon: '💘',
    desc: '로맨스가 없으면 애가 타요. 가끔 설레는 기분이 들어요.',
    conflicts: [],
    ages: ['teen', 'adult'],
    need: { max: 450, start: [300, 450], decay: 0.1, lowAt: 40, lowBuff: 'lovelorn', socials: ['romance'] }, // commodity_Trait_Romantic_Affection
    categoryDrive: { romance: 1.5 },
    idleFeeling: 'feelingFlirty',
  },
  {
    id: 'ambitious',
    label: '야심가',
    icon: '📈',
    desc: '승진하지 못하면 불안해져요.',
    conflicts: ['lazy'],
    ages: ['adult'],
    need: { max: 450, start: [200, 250], decay: 0.05, lowAt: 40, lowBuff: 'promotionAnxiety' }, // Commodity_Trait_Ambitious_NeedtoAdvance, filled by promotion
  },
  {
    id: 'artLover',
    label: '예술 애호가',
    icon: '🖼️',
    desc: '그림을 감상하면 영감이 샘솟아요.',
    conflicts: [],
    drive: { viewArt: 2.5, paint: 1.2 },
    onInteraction: { viewArt: 'artLoverInspired' }, // Buff_Trait_ArtLover_Inspired
  },
  {
    id: 'bro',
    label: '의리',
    icon: '💪',
    desc: '운동을 좋아하고, 의리 있는 친구와 어울리면 즐거워요.',
    conflicts: ['grouch'],
    ages: ['teen', 'adult'],
    drive: { workout: 1.6, swim: 1.3 },
  },
  {
    id: 'childish',
    label: '유치함',
    icon: '🪀',
    desc: '어른이 되어도 장난감과 정글짐이 좋아요. 아이들과 놀면 신나요.',
    conflicts: ['hatesChildren', 'evil'],
    ages: ['teen', 'adult'],
    drive: { playToys: 1.5, playBars: 1.5, hangBars: 1.5 },
    onInteraction: { playToys: 'eternalChild', playBars: 'eternalChild' }, // Buff_Trait_Childish_PlayedWithChildren
  },
  {
    id: 'clumsy',
    label: '덤벙거림',
    icon: '🤕',
    desc: '운동하거나 춤추다 미끄러지곤 해요. 어머, 나 좀 봐!',
    conflicts: [],
    ages: ['teen', 'adult'],
  },
  {
    id: 'commitmentIssues',
    label: '깊은 관계 회피',
    icon: '🕊️',
    desc: '한 직장, 한 사람에 오래 묶이면 답답해해요. 일을 그만두면 홀가분해요.',
    conflicts: ['familyOriented', 'loyal'],
    ages: ['adult'],
  },
  {
    id: 'creative',
    label: '창의적',
    icon: '🎭',
    desc: '창작을 오래 쉬면 권태로워요. 가끔 영감이 떠올라요.',
    conflicts: [],
    need: { max: 450, start: [300, 450], decay: 0.1, lowAt: 40, lowBuff: 'uncreative', fills: ['paint', 'playGuitar', 'playPiano', 'playViolin', 'writeBook', 'takePhoto', 'cookGourmet', 'playToys'] }, // commodity_Trait_Creative_Creativity
    drive: { paint: 1.3, playGuitar: 1.3, playPiano: 1.3, playViolin: 1.3, writeBook: 1.3, takePhoto: 1.3 },
    idleFeeling: 'feelingInspired',
  },
  {
    id: 'evil',
    label: '사악함',
    icon: '😈',
    desc: '남의 불행이 곧 나의 행복. 못된 말을 즐겨요.',
    conflicts: ['good', 'childish', 'empathetic', 'fair'],
    socialBonus: { mean: 10 },
    categoryDrive: { mean: 2, mischief: 1.5 },
  },
  {
    id: 'familyOriented',
    label: '가족 중심적',
    icon: '🫂',
    desc: '가족과 함께하면 행복하고, 오래 떨어지면 그리워해요. 아이를 잘 돌봐요.',
    conflicts: ['commitmentIssues', 'hatesChildren'],
    ages: ['adult'],
    need: { max: 220, start: [180, 220], decay: 0.1, lowAt: 20, lowBuff: 'missingFamily', by: 'family' }, // commodity_Trait_FamilyOriented_FamilyTime
    careDrive: 2,
  },
  {
    id: 'foodie',
    label: '식도락가',
    icon: '🍝',
    desc: '요리와 맛있는 음식을 사랑해요. TV를 보다 요리 아이디어가 떠올라요.',
    conflicts: ['glutton'],
    ages: ['teen', 'adult'],
    drive: { cookGourmet: 2, cook: 1.3, cookFamily: 1.3, mixDrink: 1.3, cookbook: 1.3 },
  },
  {
    id: 'geek',
    label: '괴짜',
    icon: '🤓',
    desc: '게임을 오래 못 하면 안달이 나요. 수집품을 찾으면 뿌듯해요.',
    conflicts: [],
    need: { max: 400, start: [275, 350], decay: 0.1, lowAt: 40, lowBuff: 'needToGame', fills: ['game'] }, // commodity_Trait_Geek_GamingNeed
    drive: { game: 1.5, study: 1.3 },
  },
  {
    id: 'genius',
    label: '천재',
    icon: '🧠',
    desc: '머리를 쓰지 않으면 지루해해요. 가끔 정신이 번쩍 들어요.',
    conflicts: [],
    need: { max: 450, start: [350, 450], decay: 0.1, lowAt: 40, lowBuff: 'unchallenged', fills: ['playChess', 'ponder', 'study', 'observeSkies', 'stargaze', 'homework', 'read', 'buildRocket', 'research', 'analyze'] }, // commodity_Trait_Genius_MentalStimulation
    drive: { playChess: 1.3, ponder: 1.3, study: 1.3, observeSkies: 1.3 },
    idleFeeling: 'feelingFocused',
  },
  {
    id: 'good',
    label: '선량함',
    icon: '😇',
    desc: '착한 일을 하면 뿌듯해요. 다정한 대화를 즐겨요.',
    conflicts: ['evil', 'mean', 'grouch'],
    categoryDrive: { friendly: 1.3, mean: 0.3 },
  },
  {
    id: 'grouch',
    label: '심술쟁이',
    icon: '😒',
    desc: '혼자가 편해요. 사람이 많으면 피곤하고, 농담은 썰렁하대요.',
    conflicts: ['good', 'cheerful', 'bro', 'outgoing', 'moodMaker'],
    ages: ['teen', 'adult'],
    decayMul: { social: 0.5 }, // 참고 게임 Buff_Trait_Grouch motive_Social 0.5
  },
  {
    id: 'hatesChildren',
    label: '아이를 싫어함',
    icon: '🚸',
    desc: '아이가 없는 곳이 좋아요. 아기 울음소리는 질색이에요.',
    conflicts: ['familyOriented', 'childish'],
    ages: ['teen', 'adult'],
    careDrive: 0.25,
  },
  {
    id: 'insane',
    label: '오락가락',
    icon: '🌀',
    desc: '기분이 수시로 오락가락해요.',
    conflicts: [],
    // Commodity_Trait_Insane_Insanity: 288 at most, decays 0.2 a minute; at 0 a random mood and back to full.
    need: { max: 288, start: [150, 200], decay: 0.2, lowAt: 0, lowBuff: 'insaneMood' },
  },
  {
    id: 'lovesOutdoors',
    label: '야외 활동 선호',
    icon: '🌳',
    desc: '집 안에만 있으면 갑갑해해요. 바깥 공기를 쐬면 행복해요.',
    conflicts: ['homebody'],
    need: { max: 100, start: [40, 60], decay: 0.1, lowAt: 5, lowBuff: 'coopedUp', by: 'outdoors', highBuff: 'outdoorsFreshAir', highAt: 99 }, // Commodity_Trait_LovesTheOutdoors
    skillMul: { gardening: 1.25, fishing: 1.25 }, // 참고 게임 skill_tag_modifiers 1.25
    drive: { waterPlant: 1.3, weedPlant: 1.3, harvest: 1.3, fish: 1.3, stargaze: 1.3, swim: 1.3, grill: 1.5, grillFamily: 1.5 },
  },
  {
    id: 'materialistic',
    label: '물질주의자',
    icon: '💎',
    desc: '새 물건을 사면 행복해요. 오래 쇼핑을 못 하면 답답해요.',
    conflicts: ['modest', 'thrifty'],
    ages: ['teen', 'adult'],
    need: { max: 450, start: [350, 450], decay: 0.2, lowAt: 20, lowBuff: 'wantNewStuff' }, // commodity_Trait_Materialistic_AdmireNeed, filled by buying or admiring
    drive: { admireStuff: 4 },
  },
  {
    id: 'mean',
    label: '야비함',
    icon: '😠',
    desc: '못된 말을 즐겨 하고, 잘 먹혀요.',
    conflicts: ['good', 'empathetic', 'fair'],
    socialBonus: { mean: 10 },
    categoryDrive: { mean: 2 },
  },
  {
    id: 'musicLover',
    label: '음악 애호가',
    icon: '🎼',
    desc: '음악이 없으면 허전해요. 음악을 들으면 영감이 떠올라요.',
    conflicts: [],
    need: { max: 450, start: [300, 450], decay: 0.1, lowAt: 40, lowBuff: 'noMusic', fills: ['listen', 'dance', 'playGuitar', 'playPiano', 'playViolin'] }, // commodity_Trait_MusicLover_MusicNeed
    drive: { listen: 1.5, playGuitar: 1.3, playPiano: 1.3, playViolin: 1.3 },
    onInteraction: { listen: 'musicInspired', playGuitar: 'composedMusic', playPiano: 'composedMusic', playViolin: 'composedMusic' },
  },
  {
    id: 'neat',
    label: '깔끔함',
    icon: '🧹',
    desc: '청소와 설거지를 좋아하고, 가끔 청소에 불이 붙어요.',
    conflicts: ['slob', 'lazy'],
    drive: { washDishes: 2, clean: 2, mop: 2 },
  },
  {
    id: 'perfectionist',
    label: '완벽주의자',
    icon: '💯',
    desc: '작품이 훌륭하면 무척 기쁘고, 엉성하면 창피해해요.',
    conflicts: ['easygoing'],
  },
  {
    id: 'selfAssured',
    label: '자신만만함',
    icon: '😎',
    desc: '가끔 자신감이 차올라요.',
    conflicts: ['modest'],
    idleFeeling: 'feelingConfident',
  },
  // ---- Ours, from personality research (docs/ref-game/04 §3.6): the facets of the Big Five (NEO PI-R)
  // and HEXACO that 참고 게임's list leaves thin, a few after 참고 게임 pack traits, all built from the fields above.
  {
    id: 'planner',
    label: '계획적',
    icon: '📅',
    desc: '계획을 세우고 하나씩 해내면 뿌듯해요. 숙제와 공과금도 미루지 않아요.',
    conflicts: ['spontaneous'],
    // Conscientiousness: Order (C2) and Self-Discipline (C5).
    drive: { planGoals: 2, homework: 1.4, study: 1.2, payBills: 1.5 },
    onInteraction: { planGoals: 'plannerOnTrack', homework: 'plannerOnTrack' },
    skillMul: { selfControl: 1.2 },
  },
  {
    id: 'spontaneous',
    label: '즉흥적',
    icon: '🎲',
    desc: '그때그때 끌리는 대로 해요. 금방 심심해하지만, 노래와 춤이라면 언제든 좋아요.',
    conflicts: ['planner', 'careful'],
    // Low Deliberation (C6) with Excitement-Seeking (E5) and Actions (O4): variety over routine.
    decayMul: { fun: 1.15 },
    drive: { dance: 1.4, singKaraoke: 1.5, sillyFace: 1.3, planGoals: 0.5 },
    idleFeeling: 'feelingPlayful',
  },
  {
    id: 'careful',
    label: '신중함',
    icon: '🤔',
    desc: '한 번 더 생각하고 움직여요. 운전과 응급처치를 꼼꼼히 익히고, 실수에 덜 흔들려요.',
    conflicts: ['spontaneous', 'adventurous'],
    // Deliberation (C6) and HEXACO Prudence: thinks before acting, keeps out of trouble.
    skillMul: { selfControl: 1.15, driving: 1.2, medicine: 1.1 },
    drive: { firstAidPractice: 1.5, drivePractice: 1.3, payBills: 1.3 },
    buffWeight: { careerOops: 0.5, sillyMe: 0 },
    idleFeeling: 'feelingFocused',
  },
  {
    id: 'adventurous',
    label: '모험심',
    icon: '🧗',
    desc: '새로운 경험이 없으면 좀이 쑤셔요. 수영, 낚시, 별 보기처럼 해 보지 않은 일에 끌려요.',
    conflicts: ['careful', 'homebody'],
    // Sensation seeking (Zuckerman) and Openness to Actions (O4); after 참고 게임 Adventurous-style needs.
    need: { max: 300, start: [200, 300], decay: 0.1, lowAt: 30, lowBuff: 'needAdventure', fills: ['swim', 'fish', 'stargaze', 'observeSkies', 'takePhoto', 'singKaraoke', 'drivePractice', 'runExperiment'] },
    drive: { swim: 1.5, fish: 1.3, takePhoto: 1.3, stargaze: 1.2 },
    onInteraction: { swim: 'adventureRush' },
  },
  {
    id: 'homebody',
    label: '집이 최고',
    icon: '🛋️',
    desc: '집에서 쉬는 시간이 제일 좋아요. 소파와 욕조에서 푹 쉬면 행복해져요.',
    conflicts: ['adventurous', 'lovesOutdoors'],
    // Low Excitement-Seeking (E5) and Gregariousness (E2): recharging alone at home.
    drive: { relax: 1.5, watchTv: 1.2, takeBath: 1.4, bubbleBath: 1.4, read: 1.2 },
    onInteraction: { relax: 'cozyHome', takeBath: 'cozyHome', bubbleBath: 'cozyHome' },
    buffWeight: { lotHomey: 2 },
    decayMul: { social: 0.85 },
  },
  {
    id: 'worrier',
    label: '걱정 많음',
    icon: '😬',
    desc: '일이 틀어질까 봐 미리 걱정해요. 그래서 숙제와 계획을 더 챙기고, 마음을 가라앉히면 한결 나아요.',
    conflicts: ['easygoing', 'optimist'],
    // Neuroticism: Anxiety (N1). Feels pressure more, and prepares for it.
    buffWeight: { workStress: 2, careerTense: 2, rejected: 6, fearFutureNight: 2 },
    drive: { calmDown: 2, planGoals: 1.3, homework: 1.3 },
    onInteraction: { calmDown: 'relieved', planGoals: 'relieved' },
  },
  {
    id: 'easygoing',
    label: '느긋함',
    icon: '😌',
    desc: '웬만한 일에는 마음이 흔들리지 않아요. 스트레스를 덜 받고, 힘든 일에서 빨리 회복해요.',
    conflicts: ['worrier', 'perfectionist', 'hotHeaded'],
    // Emotional stability (low Neuroticism: N1 Anxiety, N6 Vulnerability).
    buffWeight: { workStress: 0.5, careerTense: 0.5, brainFried: 1, rudeAwakening: 0.5, needsAmusement: 0.5, argued: 1 },
    skillMul: { resilience: 1.2 },
    drive: { relax: 1.2, watchFish: 1.3 },
  },
  {
    id: 'optimist',
    label: '낙천적',
    icon: '🌈',
    desc: '안 좋은 일이 생겨도 "다음엔 잘될 거야" 하고 금방 일어서요.',
    conflicts: ['worrier', 'gloomy'],
    // Positive Emotions (E6) and dispositional optimism (Scheier & Carver): bad news weighs less.
    buffWeight: { fired: 1, rejected: 2, demoted: 0.5, dateToForget: 1, worstParty: 1, notPregnant: 1, poorWork: 1, fearFailureCraft: 0 },
    skillMul: { resilience: 1.15 },
    idleFeeling: 'feelingHappy',
  },
  {
    id: 'curious',
    label: '궁금한 게 많음',
    icon: '🔭',
    desc: '"왜?"가 입에 붙었어요. 실험과 관찰을 좋아하고, 호기심이 쑥쑥 자라요.',
    conflicts: [],
    // Openness to Ideas (O5), curiosity as a trait (Kashdan) and need for cognition.
    skillMul: { curiosity: 1.25, science: 1.1 },
    drive: { research: 1.5, runExperiment: 1.5, analyze: 1.3, observeSkies: 1.3, readPsychology: 1.2, onlineLanguage: 1.2 },
    onInteraction: { research: 'scienceInspired', runExperiment: 'scienceInspired', observeSkies: 'scienceInspired' },
  },
  {
    id: 'empathetic',
    label: '공감 능력',
    icon: '🤗',
    desc: '남의 마음을 잘 알아채요. 깊은 이야기와 포옹이 잘 통하고, 공감·배려가 빨리 자라요.',
    conflicts: ['mean', 'evil'],
    // Agreeableness: Tender-Mindedness (A6), and empathic concern (Davis IRI).
    socialBonus: { friendly: 5 },
    socialDrive: { deepTalk: 1.5, hug: 1.3 },
    categoryDrive: { mean: 0.5 },
    skillMul: { empathy: 1.25 },
  },
  {
    id: 'competitive',
    label: '승부욕',
    icon: '🏆',
    desc: '이기면 날아갈 듯 기쁘고, 지면 무척 분해요. 체스와 게임에서 지기 싫어해요.',
    conflicts: [],
    // Achievement Striving (C4) with low Compliance (A4): trait competitiveness.
    buffWeight: { chessWin: 3, chessChampion: 4, wonFight: 3, highScore: 2, lostFight: 6 },
    drive: { playChess: 1.5, game: 1.3, gameTraining: 1.3, workout: 1.2 },
    skillMul: { persistence: 1.1 },
  },
  {
    id: 'modest',
    label: '겸손함',
    icon: '🙇',
    desc: '자랑하지 않고 묵묵히 해요. 칭찬에 덤덤하지만, 사람들이 편하게 다가와요.',
    conflicts: ['selfAssured', 'materialistic'],
    // HEXACO Honesty-Humility: Modesty and Greed Avoidance (and NEO A5 Modesty).
    buffWeight: { flattered: 0.5, admireSelf: 0 },
    socialBonus: { friendly: 3 },
    drive: { admireStuff: 0.3, psychUp: 0.5 },
    relDecayMul: 0.85,
  },
  {
    id: 'fair',
    label: '정의감',
    icon: '⚖️',
    desc: '옳지 않은 일은 그냥 넘기지 않아요. 짓궂은 장난은 내키지 않고, 법과 리더십에 관심이 많아요.',
    conflicts: ['mean', 'evil'],
    // HEXACO Fairness, NEO Straightforwardness (A2), and the fairness foundation (Haidt).
    categoryDrive: { mischief: 0.4, mean: 0.6 },
    buffWeight: { meanMischief: 0, sawFightHappy: 0 },
    skillMul: { law: 1.2, leadership: 1.1 },
    drive: { studyLaw: 1.5 },
  },
  {
    id: 'leader',
    label: '리더형',
    icon: '📣',
    desc: '앞에 나서서 이끄는 게 자연스러워요. 연설과 발표 연습을 좋아하고 리더십이 빨리 자라요.',
    conflicts: ['shy'],
    // Extraversion: Assertiveness (E3); assertiveness predicts who leads a group (Judge et al. 2002).
    skillMul: { leadership: 1.25, charisma: 1.1 },
    drive: { speech: 1.5, presentationPractice: 1.5, studyLeadership: 1.5 },
    socialDrive: { joinConversation: 1.3 },
    onInteraction: { speech: 'psychedUp', presentationPractice: 'psychedUp' },
  },
  {
    id: 'shy',
    label: '수줍음',
    icon: '🫣',
    desc: '처음 보는 사람 앞에서는 말이 잘 안 나와요. 그래도 한번 친해진 친구와는 오래 깊이 지내요.',
    conflicts: ['leader', 'outgoing', 'moodMaker'],
    // Self-Consciousness (N4) and low Gregariousness (E2); after 참고 게임 Socially Awkward, kindly.
    buffWeight: { awkward: 2, rejected: 6, deepConnection: 2 },
    socialDrive: { getToKnow: 0.6, joinConversation: 0.5, welcome: 0.6 },
    relDecayMul: 0.8,
  },
  {
    id: 'sensitive',
    label: '감성적',
    icon: '🌷',
    desc: '음악, 그림, 아름다운 풍경에 마음이 쉽게 움직여요. 좋은 것도 슬픈 것도 깊이 느껴요.',
    conflicts: [],
    // Openness to Feelings (O3) and Aesthetics (O2); sensory-processing sensitivity (Aron), as a temperament.
    buffWeight: { music: 2, soothingStrings: 2, violinSadSong: 3, sawWedding: 2, lotNaturalLight: 2, griefFriend: 4 },
    drive: { listen: 1.3, viewArt: 1.3, writeBook: 1.2, watchFish: 1.2 },
    onInteraction: { listen: 'deeplyMoved', viewArt: 'deeplyMoved', watchFish: 'deeplyMoved' },
  },
  {
    id: 'steadfast',
    label: '끈기 있음',
    icon: '🐢',
    desc: '한번 시작하면 꾸준히 해내요. 공부와 운동을 매일 조금씩 이어 가고, 끈기가 쑥쑥 자라요.',
    conflicts: ['lazy'],
    // Grit (Duckworth et al. 2007) and Self-Discipline (C5): steady effort over the long run.
    skillMul: { persistence: 1.25, selfControl: 1.1 },
    drive: { homework: 1.3, study: 1.3, workout: 1.2, dancePractice: 1.2 },
    buffWeight: { brainFried: 1 },
  },
  {
    id: 'moodMaker',
    label: '분위기 메이커',
    icon: '🥳',
    desc: '모이면 분위기를 띄워요. 파티와 노래방이 좋고, 웃긴 이야기가 잘 먹혀요.',
    conflicts: ['shy', 'loner', 'grouch'],
    // Warmth (E1), Gregariousness (E2) and Positive Emotions (E6); after 참고 게임 Party Animal.
    socialBonus: { funny: 5, friendly: 2 },
    categoryDrive: { funny: 1.3 },
    drive: { dance: 1.3, singKaraoke: 1.5 },
    buffWeight: { greatParty: 3, partyFun: 2, groupChat: 2, worstParty: 3 },
  },
  {
    id: 'thrifty',
    label: '알뜰함',
    icon: '💰',
    desc: '아껴 쓰고 꼬박꼬박 모아요. 공과금을 제때 내면 뿌듯하고, 경영 감각이 빨리 자라요.',
    conflicts: ['materialistic'],
    // Conscientiousness and HEXACO Greed Avoidance: careful with money, little want for things.
    drive: { payBills: 1.5, admireStuff: 0.3, cook: 1.2, playTycoon: 1.3 },
    onInteraction: { payBills: 'thriftyPride' },
    skillMul: { business: 1.2 },
  },
  // ---- Toddler traits (참고 게임 trait_Toddler_*, one at random on becoming a toddler; timers from commodity_Trait_Toddler_*).
  { id: 'tAngelic', label: '천사', icon: '😇', desc: '가끔 아무 이유 없이 행복해져요.', conflicts: [], ages: ['toddler'], toddler: { kind: 'every', minutes: 2400, buff: 'angelicEasygoing' } },
  { id: 'tCharmer', label: '귀염둥이', icon: '🥰', desc: '사람들과 어울리는 걸 좋아하고 말을 빨리 배워요. 오래 혼자면 시무룩해요.', conflicts: [], ages: ['toddler'], toddler: { kind: 'noCompany', minutes: 1080, buff: 'whereIsEveryone' }, skillMul: { talk: 1.15 } },
  { id: 'tClingy', label: '매달림', icon: '🧸', desc: '엄마 아빠가 안 보이면 금방 슬퍼해요.', conflicts: [], ages: ['toddler'], toddler: { kind: 'noParents', minutes: 450, buff: 'wheresMamaDada' } },
  { id: 'tFussy', label: '까탈스러움', icon: '😤', desc: '욕구가 채워지지 않으면 금세 불만이 가득해요.', conflicts: [], ages: ['toddler'] },
  { id: 'tIndependent', label: '독립적임', icon: '🦸', desc: '부모가 없어도 혼자서 잘 지내요.', conflicts: [], ages: ['toddler'], toddler: { kind: 'noParents', minutes: 120, buff: 'onMyOwn' } },
  { id: 'tInquisitive', label: '호기심 많음', icon: '🔎', desc: '사고력이 빨리 늘고, 오래 배우지 못하면 슬퍼해요.', conflicts: [], ages: ['toddler'], toddler: { kind: 'noLearning', minutes: 2400, buff: 'needToLearn' }, skillMul: { thinking: 1.15 } },
  { id: 'tSilly', label: '유치함', icon: '🤪', desc: '상상력이 빨리 늘고, 가끔 장난기가 발동해요.', conflicts: [], ages: ['toddler'], toddler: { kind: 'every', minutes: 1680, buff: 'sillyWhagga' }, skillMul: { imagination: 1.15 } },
  { id: 'tWild', label: '개구쟁이', icon: '🏃', desc: '운동 신경이 빨리 늘고, 가끔 기운이 넘쳐 뛰어다녀요.', conflicts: [], ages: ['toddler'], toddler: { kind: 'every', minutes: 1680, buff: 'wildRun' }, skillMul: { movement: 1.15 } },
  // Reward traits from the satisfaction store (참고 게임 Buff_Trait_* decay modifiers)
  { id: 'mellowMind', label: '단단한 마음', icon: '🪨', desc: '나쁜 기분이 25% 빨리 지나가요.', conflicts: [], reward: true },
  { id: 'sunnyMind', label: '오래가는 기쁨', icon: '☀️', desc: '좋은 기분이 25% 오래가요.', conflicts: [], reward: true },
  { id: 'independent', label: '독립적', icon: '🦅', desc: '사교 욕구가 절반 속도로 줄어요.', conflicts: [], reward: true, decayMul: { social: 0.5 } },
  { id: 'steelBladder', label: '강철 방광', icon: '🛡️', desc: '생리현상 욕구가 줄지 않아요.', conflicts: [], reward: true, decayMul: { bladder: 0 } },
  { id: 'antiseptic', label: '청결 체질', icon: '✨', desc: '위생 욕구가 절반 속도로 줄어요.', conflicts: [], reward: true, decayMul: { hygiene: 0.5 } },
  // Child aspiration rewards (참고 게임 trait_CreativelyGifted etc.: Buff_Trait_*Gifted, skill gain x1.25 for the tag).
  { id: 'creativelyGifted', label: '창의적 재능', icon: '🖍️', desc: '창의력 기술의 향상 속도가 더 빨라요.', conflicts: [], reward: true, skillMul: { creativity: 1.25, painting: 1.25, guitar: 1.25, piano: 1.25, violin: 1.25, writing: 1.25, cooking: 1.25, gourmet: 1.25, mixology: 1.25, photography: 1.25 } },
  { id: 'mentallyGifted', label: '사고력 재능', icon: '🧩', desc: '사고력 기술의 향상 속도가 더 빨라요.', conflicts: [], reward: true, skillMul: { mental: 1.25, logic: 1.25, programming: 1.25, videoGaming: 1.25 } },
  { id: 'physicallyGifted', label: '신체 재능', icon: '🤸', desc: '신체 관련 기술의 향상 속도가 더 빨라요.', conflicts: [], reward: true, skillMul: { motor: 1.25, fitness: 1.25 } },
  { id: 'sociallyGifted', label: '사교적 재능', icon: '🗣️', desc: '사교 관련 기술의 향상 속도가 더 빨라요.', conflicts: [], reward: true, skillMul: { childSocial: 1.25, charisma: 1.25, comedy: 1.25 } },
  { id: 'hardlyHungry', label: '소식가', icon: '🥢', desc: '배고픔이 절반 속도로 줄어요.', conflicts: [], reward: true, decayMul: { hunger: 0.5 } },
  { id: 'seldomSleepy', label: '잠 없는 체질', icon: '🌙', desc: '에너지가 절반 속도로 줄어요.', conflicts: [], reward: true, decayMul: { energy: 0.5 } },
  // Aspiration areas (ours, after 참고 게임 AspirationTrack primary_trait and reward; aspirations.ts):
  // a bonus while an aspiration of the area is chosen, and a trait for life when one is done.
  { id: 'aspOpenMind', label: '열린 마음', icon: '🧭', desc: '나를 찾아가는 동안: 호기심이 더 빨리 자라요.', conflicts: [], reward: true, skillMul: { curiosity: 1.3 } },
  { id: 'aspEagerLearner', label: '배움의 즐거움', icon: '🌱', desc: '배우고 성장하는 꿈을 꾸는 동안: 논리·과학·코딩·외국어를 조금 더 빨리 배워요.', conflicts: [], reward: true, skillMul: { logic: 1.1, science: 1.1, programming: 1.1, language: 1.1, rocketScience: 1.1 } },
  { id: 'aspMuse', label: '영감 가득', icon: '🎨', desc: '만들고 표현하는 꿈을 꾸는 동안: 만드는 스킬을 조금 더 빨리 배워요.', conflicts: [], reward: true, skillMul: { painting: 1.1, writing: 1.1, guitar: 1.1, piano: 1.1, violin: 1.1, cooking: 1.1, mixology: 1.1, handiness: 1.1, photography: 1.1, comedy: 1.1 } },
  { id: 'aspWarmHeart', label: '다정함', icon: '🤝', desc: '함께하는 꿈을 꾸는 동안: 관계가 천천히 식어요.', conflicts: [], reward: true, relDecayMul: 0.8 },
  { id: 'aspHelper', label: '돕는 마음', icon: '💛', desc: '돕고 나누는 꿈을 꾸는 동안: 공감·배려와 의학·보건이 더 빨리 자라요.', conflicts: [], reward: true, skillMul: { empathy: 1.15, medicine: 1.15 } },
  { id: 'aspVitality', label: '활력', icon: '💪', desc: '건강하게 사는 꿈을 꾸는 동안: 에너지가 조금 천천히 줄고 체력이 더 빨리 자라요.', conflicts: [], reward: true, decayMul: { energy: 0.9 }, skillMul: { fitness: 1.1 } },
  { id: 'aspNaturalist', label: '자연 친화', icon: '🌿', desc: '자연과 함께하는 꿈을 꾸는 동안: 원예와 낚시가 더 빨리 자라요.', conflicts: [], reward: true, skillMul: { gardening: 1.15, fishing: 1.15 } },
  { id: 'aspDiligent', label: '성실함', icon: '💼', desc: '일하고 이루는 꿈을 꾸는 동안: 끈기와 절제력이 더 빨리 자라요.', conflicts: [], reward: true, skillMul: { persistence: 1.2, selfControl: 1.2 } },
  { id: 'aspKnowSelf', label: '나를 아는 힘', icon: '🪞', desc: '나를 찾아가는 여행을 마쳤어요: 호기심과 끈기가 더 잘 자라요.', conflicts: [], reward: true, skillMul: { curiosity: 1.5, persistence: 1.2 } },
  { id: 'aspSharer', label: '지식 나눔이', icon: '📖', desc: '배우고 성장하는 꿈을 이뤘어요: 논리·과학·코딩·외국어를 더 빨리 배워요.', conflicts: [], reward: true, skillMul: { logic: 1.2, science: 1.2, programming: 1.2, language: 1.2, rocketScience: 1.2 } },
  { id: 'aspCraftsman', label: '장인 정신', icon: '🛠️', desc: '만들고 표현하는 꿈을 이뤘어요: 만드는 스킬을 더 빨리 배워요.', conflicts: [], reward: true, skillMul: { painting: 1.2, writing: 1.2, guitar: 1.2, piano: 1.2, violin: 1.2, cooking: 1.2, mixology: 1.2, handiness: 1.2, photography: 1.2, comedy: 1.2 } },
  { id: 'aspLastingBonds', label: '오랜 우정', icon: '🫶', desc: '함께하는 꿈을 이뤘어요: 관계가 절반 속도로 식어요.', conflicts: [], reward: true, relDecayMul: 0.5 },
  { id: 'aspKindHands', label: '따뜻한 손길', icon: '🤲', desc: '돕고 나누는 꿈을 이뤘어요: 공감·배려와 의학·보건이 더 빨리 자라고, 다정한 대화가 더 잘 통해요.', conflicts: [], reward: true, skillMul: { empathy: 1.25, medicine: 1.25 }, socialBonus: { friendly: 5 } },
  { id: 'aspSteady', label: '단단한 몸과 마음', icon: '🧘', desc: '건강하게 사는 꿈을 이뤘어요: 에너지가 천천히 줄고 회복탄력성이 더 잘 자라요.', conflicts: [], reward: true, decayMul: { energy: 0.8 }, skillMul: { resilience: 1.25, fitness: 1.15 } },
  { id: 'aspCalmNature', label: '자연의 고요', icon: '🍃', desc: '자연과 함께하는 꿈을 이뤘어요: 재미가 천천히 줄고 원예와 낚시가 더 빨리 자라요.', conflicts: [], reward: true, decayMul: { fun: 0.8 }, skillMul: { gardening: 1.25, fishing: 1.25 } },
  { id: 'aspFulfilled', label: '일의 보람', icon: '🏅', desc: '일하고 이루는 꿈을 이뤘어요: 끈기·절제력·리더십이 더 빨리 자라요.', conflicts: [], reward: true, skillMul: { persistence: 1.25, selfControl: 1.25, leadership: 1.25 } },
];

export const TRAIT_BY_ID: Record<string, TraitDef> = Object.fromEntries(TRAITS.map((t) => [t.id, t]));

/** Traits taken out of the game (2026-10-20, at the user's request): 절도벽 and 속물. Saves drop them, and their moods. */
export const REMOVED_TRAITS = new Set(['kleptomaniac', 'snob']);
export const REMOVED_BUFFS = new Set(['needToSwipe', 'exhilaratingSteal', 'snobBored', 'snobUnity']);
export const MAX_TRAITS = 5;

export function traitsOf(ids: string[] | undefined): TraitDef[] {
  return (ids ?? []).map((id) => TRAIT_BY_ID[id]).filter((t): t is TraitDef => !!t);
}

export function conflictsWith(chosen: string[], id: string): boolean {
  const t = TRAIT_BY_ID[id];
  return chosen.some((c) => c !== id && (t?.conflicts.includes(c) || TRAIT_BY_ID[c]?.conflicts.includes(id)));
}

/** Product of a numeric per-need modifier across traits. */
export function traitNeedMul(ids: string[] | undefined, key: 'decayMul' | 'needDrive', need: keyof Needs): number {
  return traitsOf(ids).reduce((m, t) => m * (t[key]?.[need] ?? 1), 1);
}

export function hasTrait(ids: string[] | undefined, id: string): boolean {
  return !!ids?.includes(id);
}

/**
 * Traits' pull on free will, a little under likes and dislikes (2026-10-26, at the user's request: traits
 * felt strong; measured, one trait was under a like but two on the same thing matched one, and a dweller
 * has up to five). Each trait's value is softened (^TRAIT_SOFTEN) and all of them together kept within
 * [TRAIT_FLOOR, TRAIT_CEIL] — under a like's ×1.8 and above a dislike's ×0.2.
 */
export const TRAIT_SOFTEN = 0.8;
export const TRAIT_CEIL = 1.6;
export const TRAIT_FLOOR = 0.35;
function traitPull(ids: string[] | undefined, value: (t: TraitDef) => number | undefined): number {
  const m = traitsOf(ids).reduce((acc, t) => acc * (value(t) ?? 1) ** TRAIT_SOFTEN, 1);
  return Math.min(TRAIT_CEIL, Math.max(TRAIT_FLOOR, m));
}

/** Free will's pull towards an interaction from the dweller's traits. */
export function traitDrive(ids: string[] | undefined, interactionId: string): number {
  return traitPull(ids, (t) => t.drive?.[interactionId]);
}

/** Free will's pull towards a social from the dweller's traits: that social, and its kind. */
export function traitSocialDrive(ids: string[] | undefined, socialId: string, category: SocialCategory): number {
  return traitPull(ids, (t) => (t.socialDrive?.[socialId] ?? 1) * (t.categoryDrive?.[category] ?? 1));
}

/** Free will's pull towards a kind of social from the dweller's traits. */
export function traitCategoryDrive(ids: string[] | undefined, category: SocialCategory): number {
  return traitPull(ids, (t) => t.categoryDrive?.[category]);
}

/** How keen the dweller is to look after babies and toddlers. */
export function traitCareDrive(ids: string[] | undefined): number {
  return traitPull(ids, (t) => t.careDrive);
}

/** Whether a trait suits a dweller of this age (참고 게임 trait ages; elders count as adults). */
/** Traits for someone not made by the player (a neighbour, a colleague): two that get along, none of the earned ones. */
export function drawTraits(rng: () => number, age?: string, count = 2): string[] {
  const pool = TRAITS.filter((t) => !t.reward && traitFitsAge(t, age)).map((t) => t.id);
  const out: string[] = [];
  for (let tries = 0; out.length < count && tries < 40 && pool.length; tries++) {
    const id = pool[Math.floor(rng() * pool.length)];
    if (!out.includes(id) && !conflictsWith(out, id)) out.push(id);
  }
  return out;
}

export function traitFitsAge(t: TraitDef, age: string | undefined): boolean {
  const group = age === 'toddler' ? 'toddler' : age === 'child' ? 'child' : age === 'teen' ? 'teen' : age === 'baby' ? null : 'adult';
  if (!group) return false;
  // Toddler traits are only for toddlers, and toddlers have only those.
  if (group === 'toddler' || t.ages?.includes('toddler')) return !!t.ages?.includes(group);
  return !t.ages || t.ages.includes(group);
}

/** A moodlet's weight for this dweller, after trait overrides. */
export function traitBuffWeight(ids: string[] | undefined, buffId: string, base: number): number {
  let w = base;
  for (const t of traitsOf(ids)) if (t.buffWeight && buffId in t.buffWeight) w = t.buffWeight[buffId];
  return w;
}

/** The moodlet actually added for this dweller (undefined: unchanged, null: suppressed). */
export function traitBuffReplacement(ids: string[] | undefined, buffId: string): string | null {
  let id: string | null = buffId;
  for (const t of traitsOf(ids)) if (id && t.buffReplace && id in t.buffReplace) id = t.buffReplace[id];
  return id;
}
