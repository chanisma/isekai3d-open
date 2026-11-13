import { describe, expect, it } from 'vitest';
import { careerRequest, toCareerEvent, type CloudPort } from './aiQuestions';
import { levelOf } from './careers';
import { Game } from './game';

// Work cards, 2026-10-25 (at the user's request): task cards answered in the player's own words, and
// cards that follow on from the last answer — at most two in a row, how many drawn when a card comes.

const TASK = {
  type: 'task',
  text: '{n:이/가} 만드는 RTS 게임에서 외계 생명체와 인류의 전투에 들어갈 새 기능을 맡았어요.',
  ask: '어떤 기능을 넣으면 전투가 더 재미있어질까요?',
  hints: ['전투에서 가장 신나는 순간은 언제일까요?', '외계 생명체만의 특별한 점은 무엇일까요?'],
  example: '예를 들어, 외계 생명체가 쓰러진 자리에 잠깐 독 웅덩이가 생기게 할 수 있어요.',
};
const CHOICE = {
  text: '{n:이/가} 맡은 기능에 버그가 생겨 출시가 늦어질 수 있어요.',
  choices: [
    { label: '팀장에게 바로 알린다', approach: 'safe', win: { text: '함께 일정을 다시 정했어요.', perf: 7 } },
    { label: '혼자 밤새 고친다', approach: 'self', skill: 'programming', need: 4, win: { text: '고쳤어요.', perf: 15 }, lose: { text: '못 고쳤어요.', perf: -10 } },
    { label: '동료와 나눠 고친다', approach: 'together', win: { text: '함께 고쳤어요.', perf: 7 } },
  ],
};

/** A fake 스페이스기전 that hands out the next of `cards`, and records what was asked and answered. */
function cloud(cards: unknown[], log: { asked: unknown[]; answered: unknown[] }): CloudPort {
  let n = 0;
  return {
    careerCard: (req, found) => {
      log.asked.push(req);
      found(`q${n}`, cards[Math.min(n, cards.length - 1)]);
      n++;
    },
    thought: () => {},
    answered: (id, choice, text) => log.answered.push({ id, choice, text }),
    knowledgeChanged: () => {},
  };
}

function worker(rng: () => number, cards: unknown[], log: { asked: unknown[]; answered: unknown[] }) {
  const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], rng);
  g.state.freeWill = false;
  g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
  g.cloud = cloud(cards, log);
  const dweller = g.state.dwellers[0];
  g.acceptJob(dweller.id, 'tech');
  g.setFollowWork(dweller.id, false);
  return { g, dweller };
}

/** One working day: up to the card (an hour in), and back again. */
function shift(g: Game, dweller: ReturnType<typeof worker>['dweller']) {
  dweller.away = null;
  const lvl = levelOf(dweller.job!);
  let day = Math.floor(g.state.time / 1440) + 1;
  while (!(lvl.days ?? [0, 1, 2, 3, 4]).includes(day % 7)) day++;
  g.state.time = day * 1440 + lvl.start - 61;
  dweller.job!.lastWorkDay = day - 1;
  dweller.job!.episodeDay = undefined;
  for (let t = 0; t < 75 + 60 && !g.state.careerEvent; t += 0.5) g.step(0.5);
}

describe('task cards', () => {
  it('the game reads a task card (question, hints, example, no choices) and turns down a broken one', () => {
    const job = { careerId: 'tech', level: 2, performance: 0, lastWorkDay: 0, tone: 'normal' as const, task: 0 };
    const e = toCareerEvent('x', TASK, job)!;
    expect(e.task?.hints).toHaveLength(2);
    expect(e.choices).toEqual([]);
    expect(toCareerEvent('x', { ...TASK, hints: ['하나'] }, job)).toBeNull();
    expect(toCareerEvent('x', { ...TASK, example: '' }, job)).toBeNull();
  });

  it('a thought-through answer counts a little and goes to the server; 모르겠어요 counts nothing', () => {
    const log = { asked: [] as unknown[], answered: [] as unknown[] };
    const { g, dweller } = worker(() => 0.99, [TASK], log);
    shift(g, dweller);
    expect(g.state.careerEvent?.ai?.task).toBeTruthy();
    const before = dweller.job!.performance;
    g.answerCareerTask('독 웅덩이를 남겨 진형을 흔들게 해요');
    expect(dweller.job!.performance).toBe(before + 7);
    // Its result: the answer, the example and what it did (2026-10-26).
    expect(g.state.workResult).toMatchObject({ kind: 'task', chose: '독 웅덩이를 남겨 진형을 흔들게 해요', perf: 7, buff: 'storyFocused' });
    expect(g.state.workResult?.example?.length).toBeGreaterThan(0);
    g.closeWorkResult();
    expect(log.answered.at(-1)).toEqual({ id: 'q0', choice: null, text: '독 웅덩이를 남겨 진형을 흔들게 해요' });
    shift(g, dweller);
    const mid = dweller.job!.performance;
    g.answerCareerTask(null);
    expect(dweller.job!.performance).toBe(mid);
    expect(g.state.workResult).toMatchObject({ kind: 'task', chose: null, perf: 0 });
    expect((log.answered.at(-1) as { text: string }).text).toBe('모르겠어요');
  });

  it('the dweller’s name goes into the question, hints and example too ({n:은/는} never shows)', () => {
    const log = { asked: [] as unknown[], answered: [] as unknown[] };
    const named = { ...TASK, ask: '{n:은/는} 어떤 기능을 넣으면 좋을까요?', hints: ['{n:이/가} 가장 신났던 순간은?', '외계 생명체만의 특별한 점은?'], example: '{n}라면 독 웅덩이를 남길 수 있어요.' };
    const { g, dweller } = worker(() => 0.99, [named], log);
    shift(g, dweller);
    const t = g.careerEventView()!.task!;
    expect(t.ask).toBe('민준은 어떤 기능을 넣으면 좋을까요?');
    expect(t.hints[0]).toBe('민준이 가장 신났던 순간은?');
    expect(t.example).toBe('민준라면 독 웅덩이를 남길 수 있어요.');
  });
});

describe('cards that follow on from the last answer', () => {
  it('a work card no longer carries the last answers unless it follows on', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
    const dweller = g.state.dwellers[0];
    g.acceptJob(dweller.id, 'tech');
    const plain = careerRequest(dweller, dweller.job!, undefined, []);
    expect(plain.context.recent).toEqual([]);
    expect('follow' in plain.context).toBe(false);
    const on = careerRequest(dweller, dweller.job!, undefined, [], undefined, { text: '민준이 버그를 찾았어요.', answer: '민준이 바로 알렸다' });
    // The dweller's name is never sent.
    expect(on.context.follow).toEqual({ text: '{n}이 버그를 찾았어요.', answer: '{n}이 바로 알렸다' });
  });

  it('with two to follow: the next two cards go on from each answer, the third is new', () => {
    // rng 0.7: a new card may have Math.floor(0.7 × 3) = 2 follow-ups.
    const log = { asked: [] as unknown[], answered: [] as unknown[] };
    const { g, dweller } = worker(() => 0.7, [CHOICE], log);
    const follows = () => log.asked.map((r) => (r as { context: { follow?: unknown } }).context.follow);
    shift(g, dweller);
    expect(g.state.careerEvent).toBeTruthy();
    expect(follows().at(-1)).toBeUndefined();
    // (An AI card's choices come in its own order.)
    const pick = (i: number) => g.state.careerEvent!.ai!.choices[i].label;
    const first = pick(0);
    g.answerCareerEvent(0);
    expect(dweller.job!.cardChain).toMatchObject({ left: 1, answer: first });
    shift(g, dweller);
    expect(follows().at(-1)).toMatchObject({ answer: first });
    expect(g.state.careerEvent?.ai?.followUp).toBe(true);
    const second = pick(2);
    g.answerCareerEvent(2);
    expect(dweller.job!.cardChain).toMatchObject({ left: 0, answer: second });
    shift(g, dweller);
    expect(follows().at(-1)).toMatchObject({ answer: second });
    g.answerCareerEvent(0);
    // The chain is spent: the next card is a new situation.
    expect(dweller.job!.cardChain).toBeUndefined();
    shift(g, dweller);
    expect(follows().at(-1)).toBeUndefined();
  });

  it('with none to follow, every card is new', () => {
    const log = { asked: [] as unknown[], answered: [] as unknown[] };
    const { g, dweller } = worker(() => 0.1, [CHOICE], log);
    for (let i = 0; i < 3; i++) {
      shift(g, dweller);
      g.answerCareerEvent(0);
      expect(dweller.job!.cardChain).toBeUndefined();
    }
    expect(log.asked.every((r) => !(r as { context: { follow?: unknown } }).context.follow)).toBe(true);
  });
});

describe('the dweller’s name with its particle written twice (AI scenes, 2026-10-26)', () => {
  it('shows one particle', async () => {
    const { eventText } = await import('./careerEvents');
    expect(eventText('{n:은/는}/는 어떻게 할까요?', '민준')).toBe('민준은 어떻게 할까요?');
    expect(eventText('{n}은/는 노래해요', '하린')).toBe('하린은 노래해요');
    expect(eventText('{n}이/가 웃어요', '민준')).toBe('민준이 웃어요');
    expect(eventText('{n:와/과} 팀은', '하린')).toBe('하린과 팀은');
  });
});
