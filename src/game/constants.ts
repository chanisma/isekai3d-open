import type { NeedKey, SkillKey } from './types';

export const NEED_KEYS: NeedKey[] = ['hunger', 'energy', 'bladder', 'hygiene', 'fun', 'social'];
export const SKILL_KEYS: SkillKey[] = ['cooking', 'logic', 'charisma', 'fitness', 'painting', 'guitar', 'writing', 'handiness', 'gardening', 'comedy', 'piano', 'mixology', 'creativity', 'mental', 'motor', 'childSocial', 'mischief', 'videoGaming', 'talk', 'imagination', 'movement', 'potty', 'thinking', 'fishing', 'rocketScience', 'programming', 'violin', 'gourmet', 'photography', 'dancing', 'singing', 'djMixing', 'empathy', 'leadership', 'medicine', 'science', 'law', 'business', 'language', 'driving', 'selfControl', 'persistence', 'resilience', 'curiosity'];

export const NEED_INFO: Record<NeedKey, { label: string; icon: string; decay: number; weight: number }> = {
  hunger: { label: '배고픔', icon: '🍔', decay: 0.104, weight: 1.2 },
  energy: { label: '에너지', icon: '⚡', decay: 0.069, weight: 1.2 },
  bladder: { label: '생리현상', icon: '🚽', decay: 0.087, weight: 1 },
  hygiene: { label: '위생', icon: '🧼', decay: 0.035, weight: 0.8 },
  fun: { label: '재미', icon: '🎈', decay: 0.074, weight: 1 },
  social: { label: '사교', icon: '💬', decay: 0.043, weight: 0.9 },
};

export const SKILL_INFO: Record<SkillKey, { label: string; icon: string }> = {
  cooking: { label: '요리', icon: '🍳' },
  logic: { label: '논리·수리', icon: '🧠' },
  // 참고 게임 Charisma: how a dweller talks people round. Named for what it is at work (NCS 의사소통능력).
  charisma: { label: '의사소통', icon: '💬' },
  fitness: { label: '체력', icon: '💪' },
  painting: { label: '미술·디자인', icon: '🎨' },
  guitar: { label: '기타', icon: '🎸' },
  writing: { label: '글쓰기', icon: '✍️' },
  handiness: { label: '손재주·기술', icon: '🔧' },
  gardening: { label: '원예·자연', icon: '🌱' },
  comedy: { label: '코미디', icon: '🤡' },
  piano: { label: '피아노', icon: '🎹' },
  mixology: { label: '음료 혼합', icon: '🍹' },
  mischief: { label: '장난', icon: '😈' },
  videoGaming: { label: '비디오 게임', icon: '🎮' },
  fishing: { label: '낚시', icon: '🎣' },
  rocketScience: { label: '로켓 공학', icon: '🚀' },
  programming: { label: '디지털·코딩', icon: '💻' },
  violin: { label: '바이올린', icon: '🎻' },
  gourmet: { label: '고급 요리', icon: '🍽️' },
  photography: { label: '사진', icon: '📷' },
  // Expansion-pack skills the mod careers stand on (Get Together dancing and DJ mixing, City Living singing).
  dancing: { label: '춤', icon: '💃' },
  singing: { label: '노래', icon: '🎤' },
  djMixing: { label: 'DJ 믹싱', icon: '🎧' },
  // Competencies careers rest on that 참고 게임 has no skill for (ours; careerSkills.ts). Common ones
  // after Korea's NCS 직업기초능력 (대인관계, 조직이해·리더십), then the fields' own.
  empathy: { label: '공감·배려', icon: '🤝' },
  leadership: { label: '리더십', icon: '🧭' },
  medicine: { label: '의학·보건', icon: '🩺' },
  science: { label: '과학 탐구', icon: '🔬' },
  law: { label: '법·제도', icon: '⚖️' },
  business: { label: '경영·경제', icon: '📊' },
  language: { label: '외국어', icon: '🌐' },
  driving: { label: '운전·조종', icon: '🚗' },
  // Competencies of the mind (ours; mind.ts): after OECD social and emotional skills, NCS
  // self-management, WEF 2025 resilience and 참고 게임's character values; grown by habits.
  selfControl: { label: '절제력', icon: '🧘' },
  persistence: { label: '끈기', icon: '🔥' },
  resilience: { label: '회복탄력성', icon: '🌱' },
  curiosity: { label: '호기심', icon: '🔍' },
  // Toddler skills (참고 게임 statistic_Skill_Toddler_*, Korean names; they top out at 5).
  talk: { label: '언어', icon: '🗣️' },
  imagination: { label: '상상력', icon: '🧸' },
  movement: { label: '이동', icon: '🚶' },
  potty: { label: '용변', icon: '🚽' },
  thinking: { label: '이해력', icon: '💭' },
  // Child skills (참고 게임 statistic_Skill_Child_*, Korean names).
  creativity: { label: '창의력', icon: '🖍️' },
  mental: { label: '사고력', icon: '🧩' },
  motor: { label: '민첩성', icon: '🤸' },
  childSocial: { label: '사교력', icon: '🗣️' },
};

/** Skills only children learn; they stop showing once the child grows up (참고 게임 ages CHILD). */
export const CHILD_SKILLS = new Set<SkillKey>(['creativity', 'mental', 'motor', 'childSocial']);

/**
 * What a child learns instead when doing something that trains a grown-up skill (참고 게임 child
 * versions of the same interactions: piano/toys/painting -> Creativity, chess/homework -> Mental,
 * play -> Motor, chatting -> Social). Anything else teaches a child nothing.
 */
export const CHILD_SKILL_OF: Partial<Record<SkillKey, SkillKey>> = {
  painting: 'creativity',
  piano: 'creativity',
  violin: 'creativity',
  guitar: 'creativity',
  writing: 'creativity',
  logic: 'mental',
  programming: 'mental',
  fitness: 'motor',
  charisma: 'childSocial',
  comedy: 'childSocial',
  mischief: 'childSocial',
  videoGaming: 'mental',
  // The new competencies, as a child would meet them.
  empathy: 'childSocial',
  leadership: 'childSocial',
  medicine: 'mental',
  science: 'mental',
  law: 'mental',
  business: 'mental',
  language: 'mental',
  driving: 'motor',
};

/**
 * How the skills sort for the player (ours, for the career-education side of the game): what
 * every job leans on, what a field needs of its own, and the arts and pastimes.
 */
export const SKILL_GROUPS: Array<{ label: string; keys: SkillKey[] }> = [
  { label: '공통 역량', keys: ['charisma', 'writing', 'logic', 'empathy', 'leadership', 'programming', 'fitness'] },
  { label: '마음 역량', keys: ['selfControl', 'persistence', 'resilience', 'curiosity'] },
  { label: '분야별 전문 역량', keys: ['medicine', 'science', 'law', 'business', 'language', 'driving', 'handiness', 'rocketScience'] },
  { label: '예술·취미', keys: ['painting', 'cooking', 'gardening', 'fishing', 'photography', 'piano', 'violin', 'guitar', 'singing', 'dancing', 'djMixing', 'comedy', 'mixology', 'gourmet', 'videoGaming', 'mischief'] },
];

/** What a level means (2026-11-01, the user's): 0 없음, 1~2 기초, 3~4 실무 입문, 5~6 숙련, 7~8 전문가, 9~10 대가. By whole level. */
export const SKILL_LEVEL_NAMES: readonly string[] = ['없음', '기초', '기초', '실무 입문', '실무 입문', '숙련', '숙련', '전문가', '전문가', '대가', '대가'];

/**
 * Steady practice (ours, for the career-education side): each day in a row a skill is worked at
 * adds a tenth to how fast it grows, up to half again on the sixth day; a day off starts over.
 */
export const STREAK_BONUS = 0.1;
export const STREAK_MAX = 5;
export function streakMultiplier(days: number, cap = STREAK_BONUS * STREAK_MAX): number {
  // A persistent dweller's streak reaches further (mind.ts streakCap).
  return 1 + Math.min(STREAK_BONUS * Math.max(0, days - 1), cap);
}

/** Where each grown-up skill can be practised (shown to the player). */
export const SKILL_HOWTO: Partial<Record<SkillKey, string>> = {
  charisma: '대화·농담 같은 사교, 거울 앞 연설 연습',
  writing: '컴퓨터로 책 쓰기',
  logic: '책장 논리 퍼즐 책, 체스, 망원경, 숙제, 도서관',
  empathy: '책장 심리학 책, 봉사 활동, 깊은 대화·포옹, 아기·유아 돌보기',
  leadership: '공부 책상(리더십·조직), 화이트보드로 목표·계획 세우기, 발표 연습, 파티 주최',
  programming: '컴퓨터로 코딩 공부, 코딩 튜토리얼',
  fitness: 'TV 운동 채널, 러닝머신, 수영장, 공원·헬스장',
  medicine: '공부 책상(의학), 인체 모형 · 쓸모: 응급처치(3레벨), 상처 치료(2레벨)',
  science: '공부 책상(과학), 과학 실험 세트, 현미경',
  law: '공부 책상(법·제도, 사례집 읽기) · 쓸모: 도난 보험 청구(3레벨), 공과금 납부 유예(4레벨)',
  business: '공부 책상(경제·경영), 경영 보드게임, 컴퓨터로 경제 뉴스',
  language: '공부 책상(외국어), 컴퓨터로 화상 회화',
  driving: '운전 시뮬레이터, 공부 책상(도로 규칙 문제집), 운전 연습장(성인) · 쓸모: 배달 대행 아르바이트(3레벨), 직접 운전 출근(4레벨)',
  handiness: '고장 난 물건 수리·업그레이드, 목공 작업대, 집 공구 작업대',
  painting: '이젤, 미술관',
  cooking: '요리책 공부, 가스레인지 요리, 그릴',
  gardening: '책장 원예 책 공부, 화분·텃밭 가꾸기',
  fishing: '연못 낚시',
  photography: '카메라로 사진 찍기',
  rocketScience: '로켓선 조립, 다 만든 로켓 정비·개량',
  piano: '피아노',
  violin: '바이올린',
  guitar: '기타',
  singing: '노래방 기계',
  dancing: '오디오로 안무 연습, 춤추기',
  djMixing: 'DJ 부스',
  comedy: '거울 앞 코미디 연습, 농담',
  mixology: '홈 바',
  gourmet: '책장 고급 요리 레시피 연구, 가스레인지 고급 요리',
  videoGaming: '컴퓨터로 게임 실력 연습, 게임하기',
  mischief: '장난치기',
  selfControl: '놀고 싶어도 숙제·공부·집안일·업무를 먼저 끝내기 (재미 욕구가 다 차기 전에), 근무·학교를 끝까지 채우기 · 쓸모: 자유 의지가 할 일 쪽으로 살짝 기울어요',
  persistence: '같은 스킬을 매일 연습해 연속 일수 잇기, 근무지 오늘의 업무 모두 끝내기 · 쓸모: 꾸준함 보너스 상한 +3%/레벨, 5레벨부터 하루 쉬어도 연속 유지',
  resilience: '나쁜 기분(긴장·슬픔·당황 등)을 끝까지 견뎌 내기 · 쓸모: 나쁜 무드렛이 짧아지고(레벨당 4%), 직장 질문에서 실패해도 성과 손실이 줄어요',
  curiosity: '처음 해 보는 일, 새 스킬 시작하기 · 쓸모: 새 스킬 0~3레벨을 더 빨리 배워요 (레벨당 5%)',
};

export const NO_SKILLS = (): Record<SkillKey, number> => ({ cooking: 0, logic: 0, charisma: 0, fitness: 0, painting: 0, guitar: 0, writing: 0, handiness: 0, gardening: 0, comedy: 0, piano: 0, mixology: 0, creativity: 0, mental: 0, motor: 0, childSocial: 0, mischief: 0, videoGaming: 0, talk: 0, imagination: 0, movement: 0, potty: 0, thinking: 0, fishing: 0, rocketScience: 0, programming: 0, violin: 0, gourmet: 0, photography: 0, dancing: 0, singing: 0, djMixing: 0, empathy: 0, leadership: 0, medicine: 0, science: 0, law: 0, business: 0, language: 0, driving: 0, selfControl: 0, persistence: 0, resilience: 0, curiosity: 0 });

/** Minor skills top out at five (참고 게임 skill_level_type MINOR: photography). */
export const MINOR_SKILLS = new Set<SkillKey>(['photography']);

/** Skills only toddlers learn (참고 게임 toddler skills: five levels). */
export const TODDLER_SKILLS = new Set<SkillKey>(['talk', 'imagination', 'movement', 'potty', 'thinking']);
export const TODDLER_MAX_SKILL = 5;
/** What a toddler picks up instead from a grown-up or child skill activity. */
export const TODDLER_SKILL_OF: Partial<Record<SkillKey, SkillKey>> = {
  creativity: 'imagination',
  painting: 'imagination',
  piano: 'imagination',
  mental: 'thinking',
  logic: 'thinking',
  motor: 'movement',
  fitness: 'movement',
  childSocial: 'talk',
  charisma: 'talk',
};

export const MAX_SKILL = 10;

/**
 * How much a minute of an activity teaches, one scale for every skill (ours): `practice` is what a
 * dweller sets out to learn (studying, practising, training, making something), `light` what they do
 * for fun and pick up on the side (games, dancing, stargazing), `chore` what has to be done anyway
 * (everyday meals, repairs, baby care), `passing` what rubs off in conversation.
 */
export const LEARN = { practice: 1 / 90, light: 1 / 150, chore: 1 / 200, passing: 1 / 900 } as const;

/**
 * How much longer each level of a grown-up's skill takes than it did (ours, 2026-10-25, at the user's
 * request — competencies rose too fast): half as long again, about 140 hours of practice from 0 to 10.
 */
export const SKILL_PACE = 1.5;

/**
 * What the next level costs at `level`, in the units `LEARN` rates are given in (ours): each level
 * takes longer than the last and the top ones much longer: 2, 2.4, 3, 3.8 … 12.8 for 9→10, 62 in
 * all, about 93 hours of practice (even the first levels take a few hours). The `gentle` curve
 * (1 + level/2) is for the toddlers', children's and mind skills, whose stages are short.
 */
export function levelCost(level: number, gentle = false): number {
  return gentle ? 1 + 0.5 * level : SKILL_PACE * (2 + 0.3 * level + 0.1 * level * level);
}

/**
 * How what everyday life teaches (`LEARN.chore`, `LEARN.passing`) changes with the level (ours):
 * the basics come quickly from doing it every day (×2 to level 2), then as given (3–4), and past
 * that only half, since getting really good takes setting out to (a daily cook soon stops setting
 * the stove alight, but becomes a chef by studying).
 */
export function routineFactor(level: number): number {
  return level < 3 ? 2 : level < 5 ? 1 : 0.5;
}
/** Need level that counts as distress (참고 게임 uses -75 on its -100..100 scale). */
export const DISTRESS_LEVEL = 12.5;

/**
 * Desire to raise each need, as (need value 0..100, desire 0..1) points with linear interpolation.
 * Shapes come from 참고 게임's motive tuning (ad_data on a -100..100 scale, each curve
 * normalised to its own peak): physical needs are ignored above 37.5%, while fun and social
 * always carry a little desire, so content dwellers drift towards fun, friends and skills.
 */
export const DESIRE_CURVES: Record<NeedKey, Array<[number, number]>> = {
  hunger: [[0, 1], [12, 0.5], [12.5, 0.0625], [24.5, 0.0625], [25, 0.0078], [37, 0.0078], [37.5, 0], [100, 0]],
  energy: [[0, 1], [12, 1], [12.5, 0.125], [24.5, 0.125], [25, 0.0313], [37, 0.0313], [37.5, 0], [100, 0]],
  bladder: [[0, 1], [12, 1], [12.5, 0.125], [24.5, 0.125], [25, 0.0078], [37, 0.0078], [37.5, 0], [100, 0]],
  hygiene: [[0, 1], [0.5, 0.125], [25, 0.125], [37, 0.0625], [37.5, 0], [100, 0]],
  fun: [[0, 1], [0.5, 0.25], [25, 0.0625], [37.5, 0.0313], [100, 0.0078]],
  social: [[0, 1], [0.5, 0.25], [25, 0.0625], [37.5, 0.0313], [100, 0.0078]],
};

/**
 * Game minutes per real second for each speed setting (0 = paused). Faster than 참고 게임's
 * 0.67/2/4.67 because our days are short and our lot is small.
 */
export const SPEEDS = [0, 2, 6, 20];
/** Speed 3 while every dweller is asleep or at work (참고 게임 super speed, ~5× speed 3). */
export const ULTRA_SPEED = 60;
/** Tiles per game minute. */
export const WALK_SPEED = 1.6;
/**
 * Path cost of entering a tile, and of a tile in front of an object another dweller is using.
 * Same ratio as 참고 게임's native routing defaults (traversal 1.0, discouragement 20.0).
 */
export const TRAVERSAL_COST = 1;
export const DISCOURAGE_COST = 20;
/** Our starter household's funds (참고 게임 households get §20,000 but also buy their house). */
export const START_MONEY = 2000;
export const START_TIME = 8 * 60;
export const MAX_QUEUE = 6;
export const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

/** Need decay multipliers while a dweller is away at work. */
export const WORK_DECAY: Record<NeedKey, number> = {
  hunger: 0.8,
  energy: 1.0,
  bladder: 0,
  hygiene: 1.3,
  fun: 1.4,
  social: 0.3,
};

/**
 * 참고 게임 tops working dwellers up during a shift (working_dweller_periodic_loots: hunger, bladder and
 * energy FixUp) so nobody comes home collapsing; these needs don't drop below this at work.
 */
export const WORK_NEED_FLOOR = 15;

export const SHIRT_COLORS = ['#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#00897b', '#f06292', '#546e7a'];
/** Light to dark, warm and cool undertones between (the first five of old saves are all here). */
export const SKIN_COLORS = ['#fde7da', '#f8d9c0', '#f1c9a5', '#eac09a', '#dcae7f', '#c99a6e', '#b07d52', '#8d5a3b', '#6e4529', '#5d3a24', '#46291a'];
export const HAIR_COLORS = ['#2b1b10', '#5b3a1e', '#a0522d', '#e0b04a', '#1a1a1a', '#b0b0b0'];
