/**
 * Fears after 참고 게임's Wants & Fears (trait_Fear_*; Korean names from the game): a bad moment
 * may plant a fear (loot_Fear_*_Trigger base chances below), the fear brings its moodlets in the
 * situations it's about, and facing it (fear_ConfrontationGoal_* whims) removes it with
 * "두려움 극복!" (buff_Fear_ConfrontedRecently, Confident 3, 12 hours). How far a dweller must go to
 * face each one is ours where 참고 게임's goal had no count.
 *
 * Since 2026-10-20 (at the user's request, after research: docs/ref-game/16-fears.md) there are twelve,
 * four of them about what worries people of our players' age most — being left on one's own, an
 * unknown future, money, letting one's family down — and each can be eased more than one way:
 * facing it in its own small steps, talking it over with someone close (`TALK_SHARE` of the way,
 * once a day), and a stronger heart (each 회복탄력성 level, `RESILIENCE_SHARE`). Their effects stay
 * small: a moodlet in the moment, and at most a little drag on what the fear is about. Overcoming
 * one leaves 회복탄력성 behind (`FACED_RESILIENCE`) and is counted (Dweller.fearsFaced).
 *
 * Since 2026-10-26 (§5 there) sixteen, each with a strength (약함·보통·강함, fearLevel) that grows
 * when left alone and comes down a rung each time it is faced, and a hold on free will (fearPull).
 */
export type FearId = 'dark' | 'fire' | 'burgled' | 'failure' | 'deadEndJob' | 'judged' | 'crowded' | 'unfulfilled' | 'lonely' | 'future' | 'money' | 'family' | 'stage' | 'imposter' | 'exam' | 'rejection';

export interface FearDef {
  id: FearId;
  label: string;
  icon: string;
  /** 참고 게임 loot_Fear_*_Trigger base_chance (ours for the four of our own). */
  chance: number;
  /** What facing it takes, and how many times. */
  face: string;
  need: number;
  /** How it comes about, for the panel. */
  why: string;
  /** What it does while it's there, for the panel. */
  does: string;
  /** Ways of easing it besides its own (shown under it; talking and 회복탄력성 work for all). */
  also?: string;
  /** Its moodlets, which weigh more as the fear grows (fearBuffScale). */
  buffs?: string[];
  /**
   * What it's about, for free will (fearPull): interaction and social ids, or 'nightOutside',
   * 'practice' (skill practice) and 'jobPractice' (the job's own skill).
   */
  about?: string[];
  /** How it shows in free will: shying away, and (with a stronger heart) going to meet it. */
  shy?: string;
  bold?: string;
  /** Over-preparing instead of avoiding (the imposter's cycle): `about` pulls more however brave. */
  overdo?: boolean;
}

export const FEARS: FearDef[] = [
  { id: 'dark', label: '어둠 공포증', icon: '🌑', chance: 0.25, face: '밤에 밖에서 시간 보내기(분)', need: 60, why: '밤에 밖에서 오래 있다가', does: '밤에 밖에 있거나 잠들 때 무서운 기분이 들어요', buffs: ['fearDarkOutside', 'fearDarkStartled'], about: ['nightOutside'], shy: '밤에는 밖에 나가지 않으려 해요', bold: '밤에도 일부러 밖에 나가 어둠에 익숙해지려 해요' },
  { id: 'fire', label: '불 공포증', icon: '🔥', chance: 0.5, face: '불 끄기 또는 요리 5번 하기', need: 5, why: '불이 난 걸 겪고', does: '요리할 때 가끔 무서운 기분이 들어요', buffs: ['fearFire'], about: ['cook', 'cookFamily', 'cookGourmet', 'grill', 'grillFamily', 'bakeCake'], shy: '불을 쓰는 요리를 피하고 간단히 때우려 해요', bold: '조심조심 다시 요리에 도전해요' },
  { id: 'burgled', label: '도난에 대한 두려움', icon: '🦹', chance: 0.2, face: '도난 경보기 갖추기 또는 체력 키우기', need: 1, why: '도둑이 들었던 뒤로', does: '잠들 때 가끔 불안해요', buffs: ['fearBurglar'] },
  { id: 'failure', label: '실패 공포증', icon: '📉', chance: 0.5, face: '스킬 레벨 올리기', need: 1, why: '만든 게 잘 안 됐거나 일이 잘 안 풀려서', does: '아침에 걱정이 앞서고, 배우는 속도가 조금(10%) 느려져요', also: '근무를 잘 마치기', buffs: ['fearFailureWake', 'fearFailureCraft'], about: ['practice'], shy: '실패할까 봐 연습을 미뤄요', bold: '작은 목표를 세우고 꾸준히 연습해요' },
  { id: 'deadEndJob', label: '전망이 어두운 직업에 대한 두려움', icon: '💼', chance: 0.05, face: '승진하거나 직업 바꾸기', need: 1, why: '오래 승진하지 못해서', does: '일하는 보람이 덜해 근무 성과가 조금(10%) 덜 올라요', buffs: ['fearDeadEndJob'], about: ['jobPractice'], shy: '일에 필요한 연습에 마음이 잘 안 가요', bold: '승진에 필요한 역량을 더 연습해요' },
  { id: 'judged', label: '평가 받는 두려움', icon: '👀', chance: 0.1, face: '깊은 대화 나누기', need: 2, why: '대화가 크게 어긋난 뒤로', does: '여럿이 있을 때 대화가 조금 덜 매끄러워요', buffs: ['fearJudged'], about: ['joinConversation', 'joke'], shy: '여럿이 이야기하는 데 끼지 않으려 해요', bold: '용기 내어 대화에 끼어 봐요' },
  { id: 'crowded', label: '사람이 많은 장소에 대한 두려움', icon: '👥', chance: 0.1, face: '여럿이 모인 대화에서 어울리기', need: 3, why: '집에 사람이 많이 모였을 때', does: '사람이 많으면 불편하고, 더 많으면 긴장돼요', buffs: ['fearCrowded', 'fearCrowded2'], about: ['joinConversation', 'dance'], shy: '사람이 모인 곳을 피해 조용한 데로 가요', bold: '여럿이 있는 자리에 조금씩 머물러 봐요' },
  { id: 'unfulfilled', label: '이루지 못한 꿈에 대한 두려움', icon: '🌫️', chance: 0.1, face: '열망 단계 달성하기', need: 1, why: '꿈에 오래 다가가지 못해서', does: '하루에 한 번 마음이 가라앉아요', buffs: ['fearUnfulfilled'] },
  // Ours (docs/ref-game/16-fears.md): what young people worry about most.
  { id: 'lonely', label: '혼자 남겨질까 봐 두려움', icon: '😔', chance: 0.25, face: '친한 사람과 즐겁게 이야기하기', need: 4, why: '오래 외로웠거나 거절당한 뒤로', does: '사람이 그리울 때 더 쓸쓸하고, 사교 욕구가 조금 빨리 줄어요', buffs: ['fearLonely'], about: ['chat', 'joke', 'hug', 'deepTalk'], shy: '먼저 다가가지 못하고 혼자 있으려 해요', bold: '먼저 친한 사람에게 말을 걸어요' },
  { id: 'future', label: '막막한 미래에 대한 두려움', icon: '🧭', chance: 0.15, face: '진로 탐색하기(새 분야 알아보기)', need: 3, why: '일이 없거나 일을 잃은 뒤, 하고 싶은 걸 찾지 못해서', does: '잠들 때 앞날 걱정이 들어요', also: '직업 갖기 · 관심 직업 찜하기 · 이웃에게 직업 묻기', buffs: ['fearFutureNight'], about: ['askAboutCareer', 'planGoals'], shy: '앞날 생각을 피하고 딴 일을 해요', bold: '진로를 묻고 계획을 세워 봐요' },
  { id: 'money', label: '돈 걱정', icon: '💸', chance: 0.3, face: '공과금 제때 내기', need: 2, why: '돈이 모자라 공과금을 못 냈거나 전기·물이 끊긴 뒤로', does: '고지서가 오면 마음이 무거워져요', also: '모은 돈이 §5000을 넘기', buffs: ['fearMoneyBill'], about: ['payBills'], shy: '고지서를 보기 싫어 미뤄요', bold: '고지서를 바로바로 처리해요' },
  { id: 'family', label: '가족을 실망시킬까 봐 두려움', icon: '🏠', chance: 0.2, face: '부모님과 깊은 대화 나누기', need: 2, why: '학교 성적이 많이 떨어졌을 때(가족과 함께 사는 청소년)', does: '잠들 때 가끔 마음이 쓰여요', also: '학교 성적을 다시 올리기', buffs: ['fearFamilyNight'], about: ['homework'], shy: '숙제를 펼치기 싫어 미뤄요', bold: '숙제를 더 챙겨서 해요' },
  // Since 2026-10-26 (at the user's request, after research: docs/ref-game/16-fears.md §5): four more.
  { id: 'stage', label: '무대·발표 공포', icon: '🎤', chance: 0.08, face: '연설·발표 연습이나 무대에 서기', need: 4, why: '익숙하지 않은 무대나 발표에서 떨었던 뒤로', does: '무대에 서거나 발표할 때 긴장돼요', also: '거울 앞에서 연설 연습하기', buffs: ['fearStage'], about: ['speech', 'presentationPractice', 'giveSpeech', 'pressConference', 'liveConcert', 'soundcheck', 'performShow', 'singKaraoke'], shy: '사람들 앞에 서는 일을 피해요', bold: '거울 앞 연습부터 무대까지 한 걸음씩 나서요' },
  { id: 'imposter', label: '실력이 들통날까 봐 두려움', icon: '🎭', chance: 0.2, face: '칭찬을 듣거나 근무를 잘 마치기', need: 4, why: '승진하거나 새 일을 시작한 뒤로', does: '잘해도 "운이 좋았을 뿐"이라 여겨요', buffs: ['fearImposterLucky'], about: ['jobPractice'], shy: '들킬까 봐 일 연습을 지나치게 많이 해요', bold: '들킬까 봐 일 연습을 지나치게 많이 해요', overdo: true },
  { id: 'exam', label: '시험 불안', icon: '📝', chance: 0.25, face: '숙제로 미리 준비하기', need: 4, why: '학교 성적이 떨어진 날 뒤로', does: '학교 가기 전날 밤 긴장되고, 학교 성적이 조금 덜 올라요', also: '학교에서 좋은 하루 보내기', buffs: ['fearExamNight'], about: ['homework'], shy: '숙제를 펼치기 싫어 미뤄요', bold: '조금씩 나눠서 미리 준비해요' },
  { id: 'rejection', label: '거절당할까 봐 두려움', icon: '💔', chance: 0.3, face: '마음을 전해 받아들여지기(단짝·사귀자·같이 살자)', need: 3, why: '마음을 전했다가 거절당한 뒤로', does: '가까워지자는 말을 꺼낼 때 긴장돼요', buffs: ['fearRejectionNerves'], about: ['flirt', 'askPartner', 'askBff', 'askMoveIn', 'propose'], shy: '가까워지자는 말을 꺼내지 못해요', bold: '용기 내어 마음을 전해 봐요' },
];

export const FEAR_BY_ID: Record<FearId, FearDef> = Object.fromEntries(FEARS.map((f) => [f.id, f])) as Record<FearId, FearDef>;

/** A dweller carries at most this many fears at once (ours). */
export const MAX_FEARS = 2;
/** Talking a fear over with someone close (a heart-to-heart that goes well) eases this much of it, once a day. */
export const TALK_SHARE = 1 / 3;
/** Each level of 회복탄력성 gained eases every fear this much. */
export const RESILIENCE_SHARE = 1 / 3;
/** 회복탄력성 practice an overcome fear leaves behind (gainSkill amount). */
export const FACED_RESILIENCE = 0.8;
/** How close someone must be to talk a fear over with (friendship), unless they're family. */
export const CONFIDANT_FRIENDSHIP = 30;
/** Savings that settle a money worry (ours). */
export const MONEY_SAFE = 5000;
/** Less learnt while afraid of failing, less performance gained in a dead-end job (ours; 참고 게임 has both). */
export const FAILURE_LEARN = 0.9;
export const DEAD_END_PERF = 0.9;

/**
 * How strong a fear is (2026-10-26, at the user's request; docs/ref-game/16-fears.md §5): 1 약함, 2 보통,
 * 3 강함 — a rung of the fear ladder (graded exposure's hierarchy). Left alone it grows (avoidance
 * keeps a fear going), and lived through again it may grow; each time its way through is walked to
 * the end it comes down a rung, and from the first it's gone.
 */
export const FEAR_LEVEL_LABEL = ['', '약함', '보통', '강함'] as const;
export const MAX_FEAR_LEVEL = 3;
/** Days a fear may go untouched (nothing done about it) before it grows a rung. */
export const FEAR_GROW_DAYS = 3;

type Fearful = { fears?: FearId[]; fearLevel?: Partial<Record<FearId, number>>; skills?: Partial<Record<string, number>>; buffs?: { id: string }[] };

export function fearLevel(dweller: Fearful, id: FearId): number {
  return dweller.fears?.includes(id) ? Math.min(MAX_FEAR_LEVEL, Math.max(1, dweller.fearLevel?.[id] ?? 1)) : 0;
}

/** What a fear takes from what it's about (learning, work): 10% at 약함, then 15%, 20%. */
export function fearDrag(level: number): number {
  return level ? 1 - 0.05 * (level + 1) : 1;
}

/** A fear's moments come oftener as it grows: base odds ×1, ×1.5, ×2. */
export function fearOdds(base: number, level: number): number {
  return level ? Math.min(0.95, base * (1 + 0.5 * (level - 1))) : 0;
}

const FEAR_OF_BUFF: Record<string, FearId> = Object.fromEntries(FEARS.flatMap((f) => (f.buffs ?? []).map((b) => [b, f.id])));

/** A fear's moodlets weigh more as it grows (×1, ×1.5, ×2). */
export function fearBuffScale(dweller: Fearful, buffId: string): number {
  const f = FEAR_OF_BUFF[buffId];
  const level = f ? fearLevel(dweller, f) : 0;
  return level > 1 ? 1 + 0.5 * (level - 1) : 1;
}

/**
 * Courage to meet a fear rather than shy from it: 회복탄력성, 0–1 (full at level 6). Approach and
 * avoidance coping (Roth & Cohen 1986): with little, a dweller keeps away from what scares them; with
 * a strong heart, goes to it — which is how it's faced.
 */
export function fearCourage(dweller: Fearful): number {
  return Math.min(1, Math.max(0, (dweller.skills?.resilience ?? 0) / 6));
}

/**
 * Free will's pull to something a fear is about: away (×0.8, ×0.6, ×0.4 by the fear's level) with
 * no courage, even at half courage, towards it (up to ×1.6) with a strong heart. A fear that
 * over-prepares (overdo) pulls to it however brave (×1.15 a rung).
 */
export function fearPull(dweller: Fearful, ...what: string[]): number {
  let mul = 1;
  for (const id of dweller.fears ?? []) {
    const def = FEAR_BY_ID[id];
    if (!def.about?.some((a) => what.includes(a))) continue;
    const level = fearLevel(dweller, id);
    mul *= def.overdo ? 1 + 0.15 * level : Math.max(0.2, 1 - 0.2 * level * (1 - 2 * fearCourage(dweller)));
  }
  return mul;
}

/** Seeking support (Cohen & Wills 1985): a dweller with a fear on them turns to someone close (×1.3 a rung of the strongest). */
export function supportPull(dweller: Fearful): number {
  if (!dweller.fears?.length || dweller.buffs?.some((b) => b.id === 'fearShared')) return 1;
  return 1 + 0.3 * Math.max(...dweller.fears.map((f) => fearLevel(dweller, f)));
}
