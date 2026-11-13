import { describe, expect, it } from 'vitest';
import { EVENT_BY_ID } from './careerEvents';
import { HONEST_CHOICE } from './eventValues';
import { Game } from './game';
import { MAX_EPISODES, importance, knowledgeFor, knowledgeSize, newKnowledge, rememberAnswer, type AnswerRecord } from './knowledge';

const answer = (over: Partial<AnswerRecord> = {}): AnswerRecord => ({
  dwellerId: 1,
  dwellerName: '민준',
  careerId: 'doctor',
  careerName: '의사',
  level: 1,
  eventId: 'doc_x',
  situation: '민준에게 환자가 갑자기 어지럽다고 해요.',
  label: '침착하게 살피기',
  skill: 'medicine',
  risky: true,
  won: true,
  perf: 15,
  ...over,
});

describe('how the player goes about things (three-answer cards)', () => {
  it('mostly with others → an insight that says so, citing those answers', () => {
    const k = newKnowledge();
    for (let i = 0; i < 6; i++) rememberAnswer(k, i, { ...answer({ eventId: `w${i}` }), approach: i < 4 ? 'together' : 'self' });
    const ins = k.insights.find((x) => x.id === 'way.together');
    expect(ins?.txt).toContain('함께');
    expect(ins!.ev.every((id) => k.episodes.find((e) => e.id === id)!.tags.includes('approach:together'))).toBe(true);
    expect(k.insights.some((x) => x.id === 'way.self')).toBe(false);
  });
});

describe('what the game knows about the player from their answers at work (ours)', () => {
  it('scores an answer by rules: big swings, a first time at a rung, a first win on a competency', () => {
    const k = newKnowledge();
    expect(importance(k, answer())).toBe(6);
    rememberAnswer(k, 0, answer());
    expect(importance(k, answer({ perf: 25 }))).toBe(6);
    expect(importance(k, answer({ risky: false, skill: undefined, perf: 0 }))).toBe(4);
  });

  it('turns a run of answers into insights that cite them, and lets them go when the habit fades', () => {
    const k = newKnowledge();
    for (let i = 0; i < 7; i++) rememberAnswer(k, i * 60, answer({ eventId: `e${i}` }));
    const risky = k.insights.find((x) => x.id === 'style.risky');
    expect(risky?.ev.length).toBeGreaterThan(0);
    expect(risky!.ev.every((id) => k.episodes.some((e) => e.id === id))).toBe(true);
    expect(k.insights.find((x) => x.id === 'good.1.medicine')?.dwellerId).toBe(1);
    for (let i = 0; i < 6; i++) rememberAnswer(k, 1000 + i, answer({ risky: false, skill: undefined, perf: 0 }));
    expect(k.insights.some((x) => x.id === 'style.risky')).toBe(false);
  });

  it('stays small however long the career', () => {
    const k = newKnowledge();
    for (let i = 0; i < 400; i++) rememberAnswer(k, i * 1440, answer({ eventId: `e${i}`, level: i % 8, won: i % 3 > 0 }));
    expect(k.episodes.length).toBe(MAX_EPISODES);
    expect(k.tally.card).toBe(400);
    expect(knowledgeSize(k)).toBeLessThan(40_000);
  });

  it('remembers the answer a dweller gives at work', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.2);
    const dweller = g.state.dwellers[0];
    g.acceptJob(dweller.id, 'doctor');
    (g as unknown as { startCareerEvent(s: unknown, slot: string): void }).startCareerEvent(dweller, 'job');
    expect(g.state.careerEvent).toBeTruthy();
    g.answerCareerEvent(0);
    expect(g.state.player?.episodes).toHaveLength(1);
    expect(g.state.player!.episodes[0].tags).toContain('career:doctor');
    expect(g.state.player!.tally.card).toBe(1);
    expect(dweller.knowledge).toBeUndefined();
    // Left to the dweller (no one answering), the choice is the dweller's own, and isn't kept.
    (g as unknown as { startCareerEvent(s: unknown, slot: string): void }).startCareerEvent(dweller, 'job');
    (g as unknown as { autoAnswerCareerEvent(): void }).autoAnswerCareerEvent();
    expect(g.state.player!.tally.card).toBe(1);
  });

  it('brings answers kept on each dweller in older saves together as the player’s', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.2);
    const k = newKnowledge();
    rememberAnswer(k, 10, answer());
    const state = JSON.parse(JSON.stringify(g.state));
    state.dwellers[0].knowledge = k;
    const loaded = new Game(state, () => 0.2);
    expect(loaded.state.player?.episodes).toHaveLength(1);
    expect(loaded.state.dwellers[0].knowledge).toBeUndefined();
  });

  it('keeps each dweller’s work to that dweller: a question for B never reads A’s job', () => {
    const k = newKnowledge();
    for (let i = 0; i < 4; i++) rememberAnswer(k, i, answer({ eventId: `a${i}` }));
    for (let i = 0; i < 3; i++) rememberAnswer(k, 10 + i, answer({ dwellerId: 2, dwellerName: '서연', careerId: 'lawyer', careerName: '변호사', skill: 'law', eventId: `b${i}` }));
    const forB = knowledgeFor(k, 2, 'lawyer');
    expect(forB.episodes).toHaveLength(3);
    expect(forB.episodes.every((e) => e.tags.includes('dweller:2') && e.tags.includes('career:lawyer'))).toBe(true);
    // A's medicine insight is A's; B gets their own, and what holds of the player in any job.
    expect(forB.insights.some((i) => i.id.includes('medicine'))).toBe(false);
    expect(forB.insights.some((i) => i.id === 'good.2.law')).toBe(true);
    expect(forB.insights.some((i) => i.id === 'style.risky')).toBe(true);
    // The same dweller in another job reads nothing of the old one.
    expect(knowledgeFor(k, 1, 'lawyer').episodes).toHaveLength(0);
  });

  it('knows of the player, in any job, whether they take the honest way in a dilemma', () => {
    const k = newKnowledge();
    for (let i = 0; i < 3; i++) rememberAnswer(k, i, answer({ eventId: `d${i}`, risky: false, skill: undefined, honest: true }));
    expect(k.insights.find((x) => x.id === 'value.honest')?.dwellerId).toBeUndefined();
    expect(knowledgeFor(k, 2, 'lawyer').insights.some((x) => x.id === 'value.honest')).toBe(true);
    for (let i = 0; i < 7; i++) rememberAnswer(k, 10 + i, answer({ eventId: `e${i}`, risky: false, skill: undefined, honest: false }));
    expect(k.insights.some((x) => x.id === 'value.honest')).toBe(false);
    expect(k.insights.some((x) => x.id === 'value.practical')).toBe(true);
    expect(k.tally['honest.no']).toBe(7);
  });

  it('lists only questions that exist as honesty dilemmas', () => {
    for (const [id, c] of Object.entries(HONEST_CHOICE)) {
      expect(EVENT_BY_ID[id], id).toBeTruthy();
      expect([0, 1]).toContain(c);
    }
  });
});
