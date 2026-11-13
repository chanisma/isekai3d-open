/**
 * House parties after 참고 게임's social event (Situation_HouseParty, "하우스 파티"): §100 to
 * throw, guests invited by phone, a main goal (goal_Main_HouseParty_HostSocials: the host socialises
 * with guests 12 times, worth 100; 8 of our longer socials) and one goal from each of three sets (music/dancing/games;
 * jokes/flirts; food/drinks). The score earns bronze (참고 게임: 100), silver or gold (ours: 300, all 400).
 */
export type PartyGoalKind =
  | 'hostSocials'
  | 'dancing'
  | 'listening'
  | 'jokes'
  | 'flirts'
  | 'eat'
  | 'drinks'
  | 'dateSocials'
  | 'dateDance'
  | 'dateChess'
  | 'dateTv'
  | 'dateJoke'
  | 'dateDeepTalk'
  | 'dateFlirt'
  | 'dateKiss'
  | 'dateHug'
  | 'blowCandles'
  | 'chatCelebrant'
  | 'chatCelebrantHappy'
  | 'gameWithCelebrant'
  | 'complimentCelebrant'
  | 'gaming'
  | 'playful'
  | 'instrument'
  | 'craftMeal'
  | 'craftDrinks'
  | 'eatCake'
  | 'callToMeal'
  | 'hostChat'
  | 'drinkingTogether'
  | 'eatingTogether'
  | 'coffee'
  | 'chatTogether'
  | 'stories'
  | 'happyTogether';

export interface PartyGoal {
  kind: PartyGoalKind;
  label: string;
  need: number;
  count: number;
  done?: boolean;
  /** Goals in a chain open one after another (참고 게임 goal set chains such as goalSet_Date1 → 1_2 → 1_3). */
  chain?: number;
}

export interface Party {
  /** A house party, a date with `partnerId` (참고 게임 situation_Date), a birthday party or a dinner party. */
  kind?: 'party' | 'date' | 'birthday' | 'dinner';
  partnerId?: number;
  /** Whose birthday it is (참고 게임 job_birthday_celebrant). */
  celebrantId?: number;
  hostId: number;
  until: number;
  score: number;
  goals: PartyGoal[];
}

export const PARTY_COST = 100;
/** 참고 게임 Situation_HouseParty phase length. */
export const PARTY_MINUTES = 270;
export const PARTY_GUESTS = 4;
export const GOAL_SCORE = 100;
export const MEDALS: Array<{ id: 'gold' | 'silver' | 'bronze'; label: string; at: number }> = [
  { id: 'gold', label: '금메달', at: 400 },
  { id: 'silver', label: '은메달', at: 300 },
  { id: 'bronze', label: '동메달', at: 100 },
];

// 참고 게임 goal sets (goalSet_HouseParty1/2/3) with the Korean goal names; iterations from the tuning
// where given (jokes 2, eat 4, drinks 3), the rest ours.
const SETS: PartyGoal[][] = [
  [
    { kind: 'dancing', label: '여럿이 동시에 춤추기', need: 1, count: 0 },
    { kind: 'listening', label: '여럿이 동시에 스테레오 음악 듣기', need: 1, count: 0 },
  ],
  [
    { kind: 'jokes', label: '농담하기', need: 2, count: 0 },
    { kind: 'flirts', label: '추파 던지기', need: 2, count: 0 },
  ],
  [
    { kind: 'eat', label: '음식 먹기', need: 4, count: 0 },
    { kind: 'drinks', label: '음료 마시기', need: 3, count: 0 },
  ],
];

export function newParty(hostId: number, now: number, rng: () => number): Party {
  // 참고 게임 asks for 12 socials, counted per mixer; ours last 6-25 minutes each, so 8.
  const goals: PartyGoal[] = [{ kind: 'hostSocials', label: '손님과 어울리기', need: 8, count: 0 }];
  for (const set of SETS) goals.push({ ...set[Math.floor(rng() * set.length)] });
  return { hostId, until: now + PARTY_MINUTES, score: 0, goals };
}

/** Goals the event is working on now: all unchained ones, and the first open step of each chain. */
export function openGoals(party: Party): PartyGoal[] {
  const seen = new Set<number>();
  return party.goals.filter((g) => {
    if (g.done) return false;
    if (g.chain === undefined) return true;
    if (seen.has(g.chain)) return false;
    seen.add(g.chain);
    return true;
  });
}

/** Counts toward a goal; returns the goal if this completed it. */
export function partyProgress(party: Party, kind: PartyGoalKind, n = 1): PartyGoal | null {
  const g = openGoals(party).find((x) => x.kind === kind);
  if (!g) return null;
  g.count = Math.min(g.need, g.count + n);
  if (g.count < g.need) return null;
  g.done = true;
  party.score += GOAL_SCORE;
  return g;
}

export function partyMedal(score: number, kind: Party['kind'] = 'party') {
  return (kind === 'party' || kind === undefined ? MEDALS : DATE_MEDALS).find((m) => score >= m.at) ?? null;
}

/** The event's Korean name (참고 게임 _display_name). */
export function partyName(kind: Party['kind']): string {
  return kind === 'birthday' ? '생일 파티' : kind === 'dinner' ? '디너 파티' : kind === 'date' ? '데이트' : '하우스 파티';
}

/** 참고 게임 situation_birthday_party and Situation_DinnerParty: §100 and 360 minutes each. */
export const EVENT_COST = 100;
export const EVENT_MINUTES = 360;

/** One goal from each step of a chain (참고 게임 goal sets open their chained set once one goal is done). */
function chains(sets: PartyGoal[][][], rng: () => number): PartyGoal[] {
  return sets.flatMap((steps, i) => steps.map((step) => ({ ...step[Math.floor(rng() * step.length)], chain: i + 1 })));
}

/**
 * A birthday party (참고 게임 situation_birthday_party, "생일 파티"): the main goal is blowing out the
 * candles (MainGoal_BlowOutCandles, 100), with three chains from goalSet_BirthdayParty1-3 (Korean
 * goal names and iterations from the tuning; 참고 게임's 3-hour chat with the birthday dweller is 6 of our
 * socials, the toast is left out as we have no toasts).
 */
export function newBirthday(hostId: number, celebrantId: number, now: number, rng: () => number): Party {
  const sets: PartyGoal[][][] = [
    [
      [
        { kind: 'chatCelebrant', label: '생일 주인공과 어울리기', need: 6, count: 0 },
        { kind: 'jokes', label: '농담하기', need: 2, count: 0 },
        { kind: 'gaming', label: '여럿이 동시에 게임 플레이하기', need: 1, count: 0 },
      ],
      [
        { kind: 'gameWithCelebrant', label: '생일 주인공과 게임 플레이하기', need: 1, count: 0 },
        { kind: 'chatCelebrantHappy', label: '생일 주인공이 행복한 상태에서 잡담하기', need: 1, count: 0 },
      ],
    ],
    [
      [
        { kind: 'listening', label: '여럿이 동시에 스테레오 음악 듣기', need: 1, count: 0 },
        { kind: 'dancing', label: '여럿이 동시에 춤추기', need: 1, count: 0 },
        { kind: 'playful', label: '여럿이 동시에 장난스러운 상태 되기', need: 1, count: 0 },
        { kind: 'instrument', label: '1시간 동안 악기 연주하기', need: 60, count: 0 },
      ],
      [{ kind: 'complimentCelebrant', label: '생일 주인공 칭찬하기', need: 4, count: 0 }],
    ],
    [
      [
        { kind: 'eat', label: '음식 먹기', need: 4, count: 0 },
        { kind: 'drinks', label: '음료 마시기', need: 3, count: 0 },
        { kind: 'craftMeal', label: '그룹 식사 만들기', need: 1, count: 0 },
        { kind: 'craftDrinks', label: '음료 만들기', need: 3, count: 0 },
      ],
      [{ kind: 'eatCake', label: '케이크 먹기', need: 4, count: 0 }],
    ],
  ];
  return {
    kind: 'birthday',
    hostId,
    celebrantId,
    until: now + EVENT_MINUTES,
    score: 0,
    goals: [{ kind: 'blowCandles', label: '불어서 촛불 끄기', need: 1, count: 0 }, ...chains(sets, rng)],
  };
}

/**
 * A dinner party (참고 게임 Situation_DinnerParty, "디너 파티"): the main goal is calling the guests to a
 * meal (situation_goal_DinnerParty_Main_CallToMeal, 100), with goalSet_DinnerParty_Host1-3 (the
 * garden salad, dessert and thank-you have no counterpart here and are left out; 참고 게임's stories are
 * our deep talks).
 */
export function newDinner(hostId: number, now: number, rng: () => number): Party {
  const sets: PartyGoal[][][] = [
    [
      [
        { kind: 'craftMeal', label: '그룹 식사 만들기', need: 1, count: 0 },
        { kind: 'craftDrinks', label: '음료 만들기', need: 3, count: 0 },
      ],
      [
        { kind: 'drinkingTogether', label: '여럿이 동시에 음료 마시기', need: 1, count: 0 },
        { kind: 'eatingTogether', label: '여럿이 동시에 음식 먹기', need: 1, count: 0 },
      ],
      [{ kind: 'coffee', label: '커피나 차 만들기', need: 1, count: 0 }],
    ],
    [
      [{ kind: 'hostChat', label: '주최자가 손님과 어울리기', need: 4, count: 0 }],
      [
        { kind: 'jokes', label: '농담하기', need: 2, count: 0 },
        { kind: 'chatTogether', label: '여럿이 동시에 잡담하기', need: 1, count: 0 },
        { kind: 'stories', label: '이야기 말하기', need: 3, count: 0 },
      ],
    ],
    [
      [
        { kind: 'listening', label: '여럿이 동시에 스테레오 음악 듣기', need: 1, count: 0 },
        { kind: 'dancing', label: '여럿이 동시에 춤추기', need: 1, count: 0 },
      ],
      [
        { kind: 'playful', label: '여럿이 동시에 장난스러운 상태 되기', need: 1, count: 0 },
        { kind: 'happyTogether', label: '여럿이 동시에 행복한 상태가 되기', need: 1, count: 0 },
      ],
    ],
  ];
  return { kind: 'dinner', hostId, until: now + EVENT_MINUTES, score: 0, goals: [{ kind: 'callToMeal', label: '손님들 식사하라고 부르기', need: 1, count: 0 }, ...chains(sets, rng)] };
}

/**
 * A date (참고 게임 situation_Date, "데이트", 360 minutes): socialise with the date (Goal_Socialize_Date, 10
 * times for 100; 6 of ours), and two chains: an activity together (dance / chess / TV), a joke,
 * then a deep conversation; and flirting (3), a kiss, then something tender (참고 게임 massage or a
 * passionate kiss; our hug). Medals at 100 / 300 / 500 (ours).
 */
export const DATE_MINUTES = 360;
export const DATE_MEDALS: typeof MEDALS = [
  { id: 'gold', label: '금메달', at: 500 },
  { id: 'silver', label: '은메달', at: 300 },
  { id: 'bronze', label: '동메달', at: 100 },
];

export function newDate(hostId: number, partnerId: number, now: number, rng: () => number): Party {
  const start: PartyGoal[] = [
    { kind: 'dateDance', label: '데이트 상대와 춤추기', need: 1, count: 0, chain: 1 },
    { kind: 'dateChess', label: '데이트 상대와 체스 두기', need: 1, count: 0, chain: 1 },
    { kind: 'dateTv', label: '여럿이 동시에 TV 시청하기', need: 1, count: 0, chain: 1 },
  ];
  return {
    kind: 'date',
    hostId,
    partnerId,
    until: now + DATE_MINUTES,
    score: 0,
    goals: [
      { kind: 'dateSocials', label: '데이트 상대와 어울리기', need: 6, count: 0 },
      { ...start[Math.floor(rng() * start.length)] },
      { kind: 'dateJoke', label: '데이트 상대에게 농담하기', need: 1, count: 0, chain: 1 },
      { kind: 'dateDeepTalk', label: '깊은 대화 나누기', need: 1, count: 0, chain: 1 },
      { kind: 'dateFlirt', label: '데이트 상대와 유혹적으로 희롱하기', need: 3, count: 0, chain: 2 },
      // Affection if they're going out, else asking them out (ours: no first kiss).
      { kind: 'dateKiss', label: '애정표현하기 (사귀기 전이면 사귀자고 하기)', need: 1, count: 0, chain: 2 },
      { kind: 'dateHug', label: '포옹하기', need: 1, count: 0, chain: 2 },
    ],
  };
}
