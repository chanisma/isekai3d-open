import { describe, expect, it } from 'vitest';
import { careerContextKey, careerRequest, exploreRequest, toCareerEvent, toThinkCard, type CloudPort } from './aiQuestions';
import { EVENT_DELAY } from './careerEvents';
import { CAREER_BY_ID, levelOf } from './careers';
import { Game } from './game';
import { knowledgeFor, newKnowledge, rememberAnswer, syncMerge } from './knowledge';

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

/** A cloud that answers at once with the cards given, and notes what it was told. */
function fakeCloud(cards: { career?: unknown; thought?: unknown }) {
  const told: { asked: string[]; answered: Array<[string, number | null, string | undefined]>; saves: number; sent: unknown[] } = { asked: [], answered: [], saves: 0, sent: [] };
  const cloud: CloudPort = {
    careerCard: (req, found) => {
      told.asked.push(req.contextKey);
      told.sent.push(req);
      if (cards.career) found('q-career', cards.career);
    },
    thought: (req, found) => {
      told.asked.push(req.contextKey);
      told.sent.push(req);
      if (cards.thought) found('q-thought', cards.thought);
    },
    answered: (id, choice, text) => void told.answered.push([id, choice, text]),
    knowledgeChanged: () => void told.saves++,
  };
  return { cloud, told };
}

const card = {
  text: '{n:이/가} 맡은 환자의 검사 결과가 평소와 조금 달라 보여요. 선배는 바빠 보입니다.',
  choices: [
    { label: '스스로 원인 찾기', approach: 'self', skill: 'medicine', mood: 'focused', need: 4, win: { text: '원인을 찾아 칭찬받았어요.', perf: 15 }, lose: { text: '시간만 걸렸어요.', perf: -10 } },
    { label: '바쁜 선배와 함께 보기', approach: 'together', skill: 'empathy', need: 3, win: { text: '선배와 함께 짚으며 배웠어요.', perf: 15 }, lose: { text: '선배를 기다리느라 늦어졌어요.', perf: -10 } },
    { label: '기록해 두고 보고하기', approach: 'safe', win: { text: '절차대로 보고했어요.', perf: 7 } },
  ],
};
const think = { text: '처음 일을 시작할 때 가장 기대되는 것은 무엇일까요?', options: ['새로운 사람들', '배우는 것', '스스로 돈을 버는 것'] };

/** A doctor about to start a shift, every roll coming up "event" (careerEvents.test.ts). */
function worker(cloud?: CloudPort) {
  const g = Game.create([{ name: '정시우', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.1);
  g.state.freeWill = false;
  g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
  g.cloud = cloud ?? null;
  const dweller = g.state.dwellers[0];
  g.acceptJob(dweller.id, 'doctor');
  const lvl = levelOf(dweller.job!);
  let day = Math.floor(g.state.time / 1440) + 1;
  while (!(lvl.days ?? [0, 1, 2, 3, 4]).includes(day % 7)) day++;
  g.state.time = day * 1440 + lvl.start - 61;
  dweller.job!.lastWorkDay = day - 1;
  return { g, dweller };
}

describe('questions from the 스페이스기전 AI (docs/ref-game/08-knowledge.md §6)', () => {
  it('a work card the AI made is checked and played like a written one, and the answer goes back', () => {
    const { cloud, told } = fakeCloud({ career: card });
    const { g, dweller } = worker(cloud);
    g.state.speed = 1;
    run(g, 61 + 2);
    // The shift will bring an event: a card for this rung was asked for, and came.
    expect(told.asked).toContain(careerContextKey(dweller.job!));
    expect(dweller.job!.aiCards?.map((c) => c.event.id)).toEqual(['ai:q-career']);
    run(g, EVENT_DELAY + 1);
    const view = g.careerEventView()!;
    expect(view.event.id).toBe('ai:q-career');
    expect(view.text).toContain('정시우');
    // Three ways, in the card's own order, and only the answers shown.
    expect(view.choices.map((c) => c.label).sort()).toEqual(['기록해 두고 보고하기', '바쁜 선배와 함께 보기', '스스로 원인 찾기']);
    const safe = view.event.choices.findIndex((c) => c.approach === 'safe');
    const before = dweller.job!.performance;
    g.answerCareerEvent(safe);
    expect(dweller.job!.performance).toBe(before + 7);
    expect(told.answered).toEqual([['q-career', safe, undefined]]);
    expect(g.state.player!.episodes.at(-1)!.tags).toContain('approach:safe');
    expect(told.saves).toBe(1);
    expect(g.state.player!.episodes.at(-1)!.tags).toContain(`game:${g.state.key}`);
  });

  it('a work card is asked for the rung: its title and pay, its stage, its branch and that stage’s work', () => {
    const { g, dweller } = worker();
    const junior = careerRequest(dweller, dweller.job!, g.state.player, [], g.state.key).context.career;
    expect(junior.stage.key).toBe('junior');
    expect(junior.stageWork).toContain('회진 따라가며 기록하기');
    expect(junior.rung).toMatch(/^1\/\d+$/);
    // Into a branch: the branch's rung (not the shared ladder's last), its work, a leader at the top.
    const c = CAREER_BY_ID.doctor;
    // 전문의: a resident before that has a branch but no specialist's work.
    const expert = { ...dweller.job!, level: c.levels.length + 2, branch: 0 };
    const req = careerRequest(dweller, expert, g.state.player, [], g.state.key).context.career;
    expect(req.stage.key).toBe('expert');
    expect(req.levelLabel).toBe(levelOf(expert).title);
    expect(req.dailyPay).toBe(levelOf(expert).pay);
    expect(req.branch).toBe(c.branches![0].name);
    expect(req.stageWork).toContain('수술 계획 세우고 복강경 수술 집도하기');
    const top = { ...expert, level: c.levels.length + c.branches![0].levels.length - 1 };
    expect(careerRequest(dweller, top, g.state.player, [], g.state.key).context.career.stage.key).toBe('leader');
  });

  it('without the cloud (dev server, the web) the written cards come up as before', () => {
    const { g } = worker();
    g.state.speed = 1;
    run(g, 61 + 2 + EVENT_DELAY + 1);
    expect(g.careerEventView()!.event.id.startsWith('ai:')).toBe(false);
  });

  it('a work card not used yet comes first: one that came late waits for the next event, and none is asked for meanwhile', () => {
    // The card comes only after this shift's event has gone by with a written one.
    const late: Array<() => void> = [];
    const asked: string[] = [];
    const cloud: CloudPort = {
      careerCard: (req, found) => void (asked.push(req.contextKey), late.push(() => found(`q${asked.length}`, card))),
      thought: () => undefined,
      answered: () => undefined,
      knowledgeChanged: () => undefined,
    };
    const { g, dweller } = worker(cloud);
    g.state.speed = 1;
    run(g, 61 + 2 + EVENT_DELAY + 1);
    expect(g.careerEventView()!.event.id.startsWith('ai:')).toBe(false);
    g.answerCareerEvent(0);
    late.splice(0).forEach((f) => f());
    expect(dweller.job!.aiCards?.map((c) => c.id)).toEqual(['q1']);
    // The next shift with an event: that card, and nothing new asked for.
    const job = dweller.job!;
    (g as unknown as { startCareerEvent(s: typeof dweller, slot: 'job'): void }).startCareerEvent(dweller, 'job');
    expect(g.careerEventView()!.event.id).toBe('ai:q1');
    expect(job.aiCards).toEqual([]);
    expect(asked).toHaveLength(1);
  });

  it("when the AI can't make one, a card made before for this stage and not used comes up; with none, the written ones", () => {
    const { g, dweller } = worker(fakeCloud({}).cloud);
    const job = dweller.job!;
    const event = toCareerEvent('old', card, { ...job, level: 0 })!;
    const start = () => (g as unknown as { startCareerEvent(s: typeof dweller, slot: 'job'): void }).startCareerEvent(dweller, 'job');
    // One made a rung below at the same stage (입문), never shown.
    job.level = 1;
    job.aiCards = [{ id: 'old', key: careerContextKey({ careerId: job.careerId, level: 0 }), event }];
    start();
    expect(g.careerEventView()!.event.id).toBe('ai:old');
    g.answerCareerEvent(0);
    // One for another stage isn't: a leader isn't asked what a junior is.
    const c = CAREER_BY_ID.doctor;
    Object.assign(job, { level: c.levels.length, branch: 0 });
    job.aiCards = [{ id: 'junior', key: careerContextKey({ careerId: job.careerId, level: 0 }), event }];
    start();
    expect(g.careerEventView()?.event.id.startsWith('ai:')).toBe(false);
    expect(job.aiCards.map((x) => x.id)).toEqual(['junior']);
  });

  it("a card the game can't use is let go: the written ones come instead", () => {
    for (const bad of [
      { ...card, text: card.text + ' 감전될 뻔했어요.' },
      { ...card, choices: [{ ...card.choices[0], win: { text: '좋아요', perf: 30 } }, card.choices[1]] },
      { ...card, choices: [{ ...card.choices[0], skill: 'nonsense' }, card.choices[1]] },
      { ...card, text: '{n:으로} 일하는 중에 처음 보는 증상의 환자를 만났어요.' },
      { ...card, text: '{n:이/가} 회의를 열어요. 그런데 후배 {2:가} 발표 자료를 덜 만들었어요.' },
      { ...card, text: card.text + ' 동기가 hurriedly 다시 적어요.' },
    ]) {
      const { cloud } = fakeCloud({ career: bad });
      const { g, dweller } = worker(cloud);
      g.state.speed = 1;
      run(g, 61 + 2);
      expect(dweller.job!.aiCards).toBeUndefined();
    }
    const ok = toCareerEvent('x', card, { careerId: 'doctor', level: 0, performance: 0, lastWorkDay: 0 })!;
    const self = ok.choices.find((c) => c.approach === 'self')!;
    expect(self.lose!.buff).toBe('careerOops');
    expect(self.win.buff).toBe('careerWin');
    // The same card keeps its order; the safe road isn't always last.
    expect(toCareerEvent('x', card, { careerId: 'doctor', level: 0, performance: 0, lastWorkDay: 0 })!.choices.map((c) => c.label)).toEqual(ok.choices.map((c) => c.label));
    const lastSafe = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id) => toCareerEvent(id, card, { careerId: 'doctor', level: 0, performance: 0, lastWorkDay: 0 })!.choices[2].approach === 'safe');
    expect(lastSafe.some((x) => !x)).toBe(true);
  });

  it('a card about a fact from the major keeps the major for the card to show', () => {
    const job = { careerId: 'doctor', level: 0, performance: 0, lastWorkDay: 0 };
    expect(toCareerEvent('m', { ...card, major: '의학' }, job)!.major).toBe('의학');
    expect(toCareerEvent('m', card, job)!.major).toBeUndefined();
    expect(toCareerEvent('m', { ...card, major: 'medicine' }, job)!.major).toBeUndefined();
  });

  it("nothing that names the student goes out: the dweller's name, and what the player wrote", () => {
    const { cloud, told } = fakeCloud({ thought: think });
    const { g, dweller } = worker(cloud);
    // The first job brought a question to think about.
    expect(told.asked).toContain('life:firstJob');
    expect(g.state.thoughts?.[0].card.text).toBe(think.text);
    g.answerThought('q-thought', null, '사실 정시우는 우리 반 친구 이름이에요');
    expect(told.answered.at(-1)).toEqual(['q-thought', null, '사실 정시우는 우리 반 친구 이름이에요']);
    expect(g.state.player!.episodes.at(-1)!.note).toContain('친구');
    rememberAnswer(g.state.player!, 1, { game: g.state.key, dwellerId: dweller.id, dwellerName: '정시우', careerId: 'doctor', careerName: '의사', level: 0, eventId: 'e', situation: '정시우가 바빠요', label: '돕기', risky: false, won: true, perf: 7 });
    // (A work card carries the last answer only as a follow-up, 2026-10-25: the name in it is hidden too.)
    const out = JSON.stringify([careerRequest(dweller, dweller.job!, g.state.player, [], g.state.key, { text: `${dweller.name}이 바빠요`, answer: `${dweller.name}을 돕는다` }), exploreRequest(dweller, g.state.player, [], g.state.key)]);
    expect(out).not.toContain(dweller.name);
    expect(out).not.toContain('정시우');
    expect(out).not.toContain('친구 이름');
    expect(out).toContain('{n}');
  });

  it('skipping keeps nothing; an option or words are kept as the player\'s', () => {
    const { cloud, told } = fakeCloud({ thought: think });
    const { g } = worker(cloud);
    const before = g.state.player?.episodes.length ?? 0;
    g.answerThought('q-thought', null);
    expect(g.state.player?.episodes.length ?? 0).toBe(before);
    expect(told.answered.at(-1)).toEqual(['q-thought', null, undefined]);
    expect(toThinkCard({ ...think, options: ['하나', '둘'] })).toBeNull();
  });

  it("the copy kept on 스페이스기전 and this game's merge without doubling, and dwellers of other games stay apart", () => {
    const a = newKnowledge();
    const b = newKnowledge();
    const ans = (game: string, dwellerId: number, i: number) => ({ game, dwellerId, dwellerName: '민준', careerId: 'doctor', careerName: '의사', level: 0, eventId: `e${i}`, situation: '상황', label: '돕기', risky: true, won: true, perf: 15, skill: 'medicine' });
    for (let i = 0; i < 3; i++) rememberAnswer(a, i, ans('gameA', 1, i));
    for (let i = 0; i < 2; i++) rememberAnswer(b, i, ans('gameB', 1, i));
    const remote = syncMerge(b, a, 10);
    const both = syncMerge(a, remote, 10);
    expect(both.episodes).toHaveLength(5);
    expect(syncMerge(both, both, 10).episodes).toHaveLength(5);
    // Three wins on medicine in game A make that dweller's insight; game B's dweller 1 is someone else.
    expect(knowledgeFor(both, 1, 'doctor', 'gameA').insights.some((i) => i.id.startsWith('good.gameA.1'))).toBe(true);
    expect(knowledgeFor(both, 1, 'doctor', 'gameB').insights.some((i) => i.id.startsWith('good.'))).toBe(false);
    expect(knowledgeFor(both, 1, 'doctor', 'gameB').episodes).toHaveLength(2);
  });
});
