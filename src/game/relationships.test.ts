import { describe, expect, it } from 'vitest';
import { Game } from './game';
import { SHORT_SENTIMENT, addSentiment, friendStage, newRelationship, relationshipUtility, sentimentContext, tickRelationship, trackDelta } from './relationships';
import { SOCIAL_BY_ID, fightWinChance, socialBlocker } from './socials';

function seeded(seed = 11) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function newGame() {
  const g = Game.create(
    [
      { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
      { name: '서연', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' },
    ],
    seeded(),
  );
  g.state.freeWill = false;
  return g;
}

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

describe('relationship tracks', () => {
  it('gains shrink as friendship grows and losses grow', () => {
    expect(trackDelta('friend', -50, 'S')).toBeGreaterThan(trackDelta('friend', 10, 'S'));
    expect(trackDelta('friend', 10, 'S')).toBeGreaterThan(trackDelta('friend', 90, 'S'));
    expect(trackDelta('friend', 90, '-M')).toBeLessThan(trackDelta('friend', 10, '-M'));
    expect(trackDelta('romance', 0, 'H')).toBeGreaterThan(trackDelta('romance', 85, 'H'));
  });

  it('keeps a friendship stage until 5 points past its line', () => {
    expect(friendStage(35, 'acquaintance')).toBe('friend');
    expect(friendStage(32, 'friend')).toBe('friend');
    expect(friendStage(29, 'friend')).toBe('acquaintance');
    expect(friendStage(-68, 'despised')).toBe('despised');
  });

  it('does not decay for a day after contact, then drifts toward 0', () => {
    const rel = newRelationship(50, 60, 0);
    tickRelationship(rel, 1000, 1000);
    expect(rel.friend).toBe(50);
    tickRelationship(rel, 1440 * 3, 1440);
    expect(rel.friend).toBeCloseTo(48.5, 1); // 1.5/day in the 35..60 band
    expect(rel.romance).toBeCloseTo(55, 1); // 5/day in the 50..75 band
  });

  it('prefers friends and partners for socialising', () => {
    const stranger = newRelationship(0, 0, 0);
    const friend = newRelationship(60, 0, 0);
    const partner = { ...newRelationship(60, 60, 0), flags: ['partner' as const] };
    expect(relationshipUtility(friend)).toBeGreaterThan(relationshipUtility(stranger));
    expect(relationshipUtility(partner)).toBeCloseTo(relationshipUtility(friend) * 1.75);
  });

  it('gates milestone socials behind thresholds', () => {
    const rel = newRelationship(40, 20, 0);
    expect(SOCIAL_BY_ID.firstKiss).toBeUndefined();
    expect(socialBlocker(SOCIAL_BY_ID.kiss, rel)).toBe('사귀는 사이여야 해요');
    expect(socialBlocker(SOCIAL_BY_ID.askPartner, rel)).toBe('로맨스 40 이상 필요');
    expect(socialBlocker(SOCIAL_BY_ID.askBff, rel)).toBe('우정 80 이상 필요');
    expect(socialBlocker(SOCIAL_BY_ID.hug, rel)).toBeNull();
  });

  it('takes its time: no stage skipped, each waits days after the one before', () => {
    const DAY = 1440;
    const rel = newRelationship(60, 70, 0);
    // The day they met: too soon to ask them out; the next day it's fine.
    expect(socialBlocker(SOCIAL_BY_ID.askPartner, rel, undefined, 600)).toBe('알게 된 지 1일이 지나야 해요 (14시간 남음)');
    expect(socialBlocker(SOCIAL_BY_ID.askPartner, rel, undefined, DAY)).toBeNull();
    // Nothing further before they go out: no affection, no proposal, no wedding, no baby.
    for (const id of ['kiss', 'propose', 'marry', 'tryForBaby']) expect(socialBlocker(SOCIAL_BY_ID[id], rel, undefined, 30 * DAY)).not.toBeNull();
    rel.flags.push('partner');
    rel.since = { ...rel.since, partner: DAY };
    expect(socialBlocker(SOCIAL_BY_ID.kiss, rel, undefined, DAY)).toBeNull();
    expect(socialBlocker(SOCIAL_BY_ID.propose, rel, undefined, 2 * DAY)).toBe('사귄 지 3일이 지나야 해요 (2일 남음)');
    expect(socialBlocker(SOCIAL_BY_ID.propose, rel, undefined, 4 * DAY)).toBeNull();
    expect(socialBlocker(SOCIAL_BY_ID.marry, rel, undefined, 30 * DAY)).toBe('약혼이 먼저예요');
    expect(socialBlocker(SOCIAL_BY_ID.tryForBaby, rel, undefined, 30 * DAY)).toBe('결혼한 사이여야 해요');
    rel.flags.push('engaged');
    rel.since.engaged = 4 * DAY;
    expect(socialBlocker(SOCIAL_BY_ID.marry, rel, undefined, 5 * DAY)).toBe('약혼한 지 2일이 지나야 해요 (1일 남음)');
    expect(socialBlocker(SOCIAL_BY_ID.marry, rel, undefined, 6 * DAY)).toBeNull();
    rel.flags.push('married');
    expect(socialBlocker(SOCIAL_BY_ID.tryForBaby, rel, undefined, 6 * DAY)).toBeNull();
  });
});

describe('socials in play', () => {
  it('asking someone out with enough romance makes them partners', () => {
    const g = newGame();
    const [a, b] = g.state.dwellers;
    const rel = g.relationship(a.id, b.id);
    rel.friend = 60;
    rel.romance = 40;
    // (They say yes: whether they do is romanceAcceptance's, and its own test.)
    g.rng = () => 0.01;
    g.enqueue(a.id, { kind: 'social', targetId: b.id, socialId: 'askPartner', autonomous: false });
    run(g, 20);
    expect(rel.flags).toContain('partner');
    expect(a.buffs.some((x) => x.id === 'newPartner')).toBe(true);
  });

  it('the same social three times in a row bores the other dweller', () => {
    const g = newGame();
    const [a, b] = g.state.dwellers;
    const rel = g.relationship(a.id, b.id);
    const outcomes = [];
    for (let i = 0; i < 3; i++) outcomes.push(g.socialOutcome(a, b, SOCIAL_BY_ID.compliment, rel));
    expect(outcomes[2]).toBe('fail');
  });

  it('a hug with an angry dweller flops', () => {
    const g = newGame();
    const [a, b] = g.state.dwellers;
    const rel = g.relationship(a.id, b.id);
    rel.friend = 60;
    b.emotion = 'angry';
    expect(g.socialOutcome(a, b, SOCIAL_BY_ID.hug, rel)).toBe('fail');
  });

  it('announces a new friendship once the line is crossed', () => {
    const g = newGame();
    const [a, b] = g.state.dwellers;
    g.relationship(a.id, b.id).friend = 36;
    g.step(0.5);
    expect(g.toasts.some((t) => t.text.includes('친구가 됐어요'))).toBe(true);
    expect(a.buffs.some((x) => x.id === 'newFriend')).toBe(true);
  });

  it('migrates single-number relationships from old saves', () => {
    const g = newGame();
    const old = JSON.parse(JSON.stringify(g.state));
    for (const k of Object.keys(old.relationships)) old.relationships[k] = 42;
    const loaded = new Game(old);
    const [a, b] = loaded.state.dwellers;
    expect(loaded.relationship(a.id, b.id)).toMatchObject({ friend: 42, romance: 0, flags: [] });
  });
});

describe('fights', () => {
  it('the fitter dweller usually wins, with 참고 게임 moodlets for both and for onlookers', () => {
    expect(fightWinChance({ skills: { fitness: 8 }, traits: [] }, { skills: { fitness: 0 }, traits: [] })).toBeCloseTo(0.9);
    expect(fightWinChance({ skills: { fitness: 0 }, traits: [] }, { skills: { fitness: 0 }, traits: ['hotHeaded'] })).toBeCloseTo(0.4);
    const g = Game.create([
      { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
      { name: '서연', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' },
      { name: '지우', shirt: '#43a047', skin: '#c99a6e', hair: '#a0522d' },
    ]);
    g.state.freeWill = false;
    g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
    const [a, b, c] = g.state.dwellers;
    Object.assign(a, { x: 11, y: 11 });
    Object.assign(b, { x: 12, y: 11 });
    Object.assign(c, { x: 14, y: 12 });
    g.relationship(a.id, b.id).friend = -30;
    g.rng = () => 0; // the attacker wins
    g.enqueue(a.id, { kind: 'social', targetId: b.id, socialId: 'fight', autonomous: false });
    for (let t = 0; t < 15; t += 0.5) g.step(0.5);
    expect(a.buffs.some((x) => x.id === 'wonFight')).toBe(true);
    expect(b.buffs.some((x) => x.id === 'lostFight')).toBe(true);
    expect(c.buffs.some((x) => x.id.startsWith('sawFight'))).toBe(true);
  });
});

describe('sentiments', () => {
  it('fade after about four days and colour socials', () => {
    const rel = newRelationship(30, 0, 0);
    addSentiment(rel, 1, 'bitter', '싸움 후의 앙심', 0);
    expect(rel.sentiments![0].until).toBe(SHORT_SENTIMENT);
    expect(Math.round(SHORT_SENTIMENT / 1440)).toBe(4);
    expect(sentimentContext(rel, 1, 'friendly')).toBe(-10);
    expect(sentimentContext(rel, 2, 'friendly')).toBe(0); // one-way
    expect(sentimentContext(rel, 1, 'mean')).toBe(8);
  });

  it('a lost fight leaves the loser bitter, a great deep talk leaves both close', () => {
    const g = Game.create([
      { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
      { name: '서연', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' },
    ]);
    g.state.freeWill = false;
    g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
    const [a, b] = g.state.dwellers;
    Object.assign(a, { x: 11, y: 11 });
    Object.assign(b, { x: 12, y: 11 });
    const rel = g.relationship(a.id, b.id);
    rel.friend = -30;
    g.rng = () => 0;
    g.enqueue(a.id, { kind: 'social', targetId: b.id, socialId: 'fight', autonomous: false });
    for (let t = 0; t < 15; t += 0.5) g.step(0.5);
    expect(rel.sentiments?.some((s) => s.holder === b.id && s.kind === 'bitter')).toBe(true);
  });
});
