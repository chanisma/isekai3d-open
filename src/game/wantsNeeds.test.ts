import { describe, expect, it } from 'vitest';
import { ASPIRATION_BY_ID } from './aspirations';
import { CATALOG } from './catalog';
import { BUFFS } from './emotions';
import { Game } from './game';
import { needClient, needFriendship, needLines, needRomance, needSkill, needSpeaking, needWalk, needWork, needsPutOffDuty } from './needEffects';
import { SOCIAL_BY_ID } from './socials';
import { TRAIT_BY_ID } from './traits';
import type { Needs, DwellerSpec } from './types';
import { STORE, WANT_BY_ID, WANTS, candidates, fillWants } from './wants';

const spec = (name: string, gender: 'female' | 'male', more: Partial<DwellerSpec> = {}): DwellerSpec => ({ name, gender, shirt: '#111111', skin: '#eeeeee', hair: '#000000', ...more });
const game = (...people: DwellerSpec[]) => {
  const g = Game.create(people, Math.random, 'off');
  g.state.freeWill = false;
  g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
  return g;
};
const body = (over: Partial<Needs> = {}): { needs: Needs } => ({ needs: { hunger: 60, energy: 60, bladder: 60, hygiene: 60, fun: 60, social: 60, ...over } });

describe('wants (2026-11-01)', () => {
  it('no want is for a need, and every goal is something real', () => {
    const interactions = new Set(CATALOG.flatMap((d) => d.interactions.map((i) => i.id)));
    for (const w of Object.values(WANT_BY_ID)) {
      expect(w.id.startsWith('need_'), w.id).toBe(false);
      if (w.goal.kind === 'interaction') expect(w.goal.ids.some((id) => interactions.has(id) || id.startsWith('__')), w.id).toBe(true);
      if (w.goal.kind === 'social') for (const id of w.goal.ids) expect(SOCIAL_BY_ID[id], `${w.id} ${id}`).toBeTruthy();
    }
    expect(WANTS.some((w) => (w.goal as { kind: string }).kind === 'need')).toBe(false);
  });

  it('three places, each its part, each saying why', () => {
    const g = game(spec('하린', 'female', { traits: ['bookworm'], likes: ['reading'], aspiration: 'bodybuilder' }), spec('시우', 'male'));
    const dweller = g.state.dwellers[0];
    for (let i = 0; i < 30; i++) {
      dweller.wants = [];
      fillWants(g, dweller);
      expect(dweller.wants.map((w) => w.role)).toEqual(['dream', 'self', 'now']);
      for (const w of dweller.wants) expect(w.why, w.defId).toBeTruthy();
      expect(new Set(dweller.wants.map((w) => WANT_BY_ID[w.defId].set)).size).toBe(3);
    }
  });

  it('the dream’s place is the aspiration’s next real step', () => {
    const g = game(spec('하린', 'female', { aspiration: 'bodybuilder' }));
    const dweller = g.state.dwellers[0];
    const goals = ASPIRATION_BY_ID.bodybuilder.milestones[0].goals;
    const wanted = candidates(g, dweller).get('dream') ?? [];
    expect(wanted.length).toBeGreaterThan(0);
    // It's what the place holds, every time, not a skill that happens to be under way.
    dweller.skills.logic = 3;
    for (let i = 0; i < 20; i++) {
      dweller.wants = [];
      fillWants(g, dweller);
      expect(WANT_BY_ID[dweller.wants.find((w) => w.role === 'dream')!.defId].set).toBe('dream');
    }
    expect(goals.length).toBeGreaterThan(0);
    for (const w of wanted) expect(w.why).toContain(ASPIRATION_BY_ID.bodybuilder.label);
  });

  it('turns on who they are: likes, fears, mood; never what they dislike, nor the heavy when worn out', () => {
    const g = game(spec('하린', 'female', { likes: ['fitness', 'reading'], dislikes: ['cooking'] }));
    const dweller = g.state.dwellers[0];
    const ids = (set: string) => (candidates(g, dweller).get(set as never) ?? []).map((w) => w.defId);
    expect(ids('like')).toContain('like_reading');
    expect(ids('like')).toContain('like_fitness');
    dweller.traits = ['foodie'];
    expect(ids('like')).not.toContain('like_cooking');
    dweller.needs.energy = 10;
    expect(ids('like')).not.toContain('like_fitness');
    dweller.fears = ['lonely'];
    expect(ids('fear')).toEqual(['fear_reach']);
    dweller.emotion = 'angry';
    expect(ids('mood')).toContain('mood_rest');
  });

  it('what’s just happened: hurt, they want to be seen to, and going does it', () => {
    const g = game(spec('민준', 'male'));
    const dweller = g.state.dwellers[0];
    g.addBuff(dweller, 'injured');
    expect((candidates(g, dweller).get('event') ?? []).map((w) => w.defId)).toContain('event_cure');
    dweller.wants = [{ defId: 'event_cure', since: g.state.time, role: 'now' }];
    g.wantEvent(dweller, { kind: 'interaction', id: '__cured' });
    expect(dweller.wants).toEqual([]);
    expect(dweller.satisfaction).toBe(50);
  });

  it('a friend who lives elsewhere: a call, and making it counts', () => {
    const g = game(spec('민준', 'male'));
    const dweller = g.state.dwellers[0];
    const t = g.state.townies![0];
    g.relationship(dweller.id, t.id).friend = 40;
    const call = (candidates(g, dweller).get('friend') ?? []).find((w) => w.defId === 'callFriend' && w.targetId === t.id);
    expect(call).toBeTruthy();
    dweller.wants = [call!];
    g.wantEvent(dweller, { kind: 'phone', targetId: t.id });
    expect(dweller.wants).toEqual([]);
  });
});

describe('the reward store (2026-11-01)', () => {
  it('every item is in a tab and real', () => {
    for (const i of STORE) {
      if (i.buff) expect(BUFFS[i.buff], i.id).toBeTruthy();
      if (i.trait) expect(TRAIT_BY_ID[i.trait], i.id).toBeTruthy();
      expect(i.buff || i.trait || i.then, i.id).toBeTruthy();
    }
    expect(new Set(STORE.map((i) => i.tab)).size).toBe(4);
  });

  it('does what it says, and isn’t sold when there’s nothing to use it on', () => {
    const g = game(spec('민준', 'male'), spec('하린', 'female'));
    const [a, b] = g.state.dwellers;
    a.satisfaction = 100000;
    expect(g.buyReward(a.id, 'clearBad')).toBe(false);
    g.addBuff(a, 'rejected');
    g.addBuff(a, 'injured');
    expect(g.buyReward(a.id, 'clearBad')).toBe(true);
    expect(a.buffs.some((x) => x.id === 'rejected')).toBe(false);
    // Being hurt is the hospital's.
    expect(a.buffs.some((x) => x.id === 'injured')).toBe(true);
    const rel = g.relationship(a.id, b.id);
    rel.friend = -50;
    expect(g.buyReward(a.id, 'mendRel')).toBe(true);
    expect(rel.friend).toBe(-20);
    expect(g.buyReward(a.id, 'retryLove')).toBe(false);
    rel.refusedUntil = { askPartner: g.state.time + 100 };
    expect(g.buyReward(a.id, 'retryLove')).toBe(true);
    expect(rel.refusedUntil).toBeUndefined();
    expect(g.buyReward(a.id, 'easeFear')).toBe(false);
    expect(g.buyReward(a.id, 'studyDay')).toBe(true);
    expect(a.buffs.some((x) => x.id === 'studyDay')).toBe(true);
    // A trait for how long moods last.
    expect(g.buyReward(a.id, 'sunnyMind')).toBe(true);
    g.addBuff(a, 'wantFulfilled');
    const left = a.buffs.find((x) => x.id === 'wantFulfilled')!.until! - g.state.time;
    expect(left).toBeCloseTo(BUFFS.wantFulfilled.duration! * 1.25);
  });
});

describe('what a need’s state does (2026-11-01)', () => {
  it('nothing in the middle; each need its own consequence, by band', () => {
    expect(needWork(body())).toBe(0);
    expect(needWalk(body())).toBe(1);
    expect(needWork(body({ energy: 20 }))).toBeCloseTo(-0.08);
    expect(needWork(body({ energy: 10 }))).toBeCloseTo(-0.15);
    expect(needWalk(body({ energy: 10 }))).toBeCloseTo(0.8);
    expect(needSpeaking(body({ hygiene: 20 }))).toBe(-3);
    expect(needRomance(body({ hygiene: 10 }))).toBe(-25);
    expect(needRomance(body({ hygiene: 90 }))).toBe(5);
    expect(needClient(body({ hygiene: 10 }))).toBe(-4);
    expect(needSkill(body({ fun: 20 }), 'logic')).toBeCloseTo(0.9);
    expect(needSkill(body({ fun: 90 }), 'painting')).toBeCloseTo(1.1);
    expect(needSkill(body({ fun: 90 }), 'logic')).toBe(1);
    expect(needSkill(body({ energy: 90 }), 'logic')).toBeCloseTo(1.1);
    expect(needFriendship(body({ social: 90 }))).toBeCloseTo(1.1);
    expect(needsPutOffDuty(body({ fun: 5 }))).toBe(true);
    // Several at once add up.
    expect(needWork(body({ energy: 20, hunger: 20 }))).toBeCloseTo(-0.13);
  });

  it('the panel says what the game goes by, and what’s coming', () => {
    const line = (o: Partial<Needs>, k: keyof Needs) => needLines(body(o)).find((l) => l.need === k)!;
    expect(line({ energy: 20 }, 'energy').effects.map((e) => e.text)).toContain('업무 성공 -8%');
    expect(line({ energy: 60 }, 'energy').state).toBeNull();
    expect(line({ energy: 30 }, 'energy').next).toContain('피곤함');
    expect(line({ energy: 20 }, 'energy').next).toContain('탈진');
  });

  it('it counts in play: a tired dweller walks slower, a filthy one is turned down more', () => {
    const g = game(spec('하린', 'female'), spec('시우', 'male'));
    const [a, b] = g.state.dwellers;
    const rel = g.relationship(a.id, b.id);
    Object.assign(rel, { friend: 40, romance: 45 });
    const chance = () => (g as unknown as { romanceAnswer(a: unknown, b: unknown, id: string, r: unknown): { chance: number; against?: string } }).romanceAnswer(a, b, 'askPartner', rel);
    a.needs.hygiene = 60;
    const clean = chance().chance;
    a.needs.hygiene = 10;
    const dirty = chance();
    expect(dirty.chance).toBeCloseTo(clean - 0.25);
    expect(dirty.against).toBe('너무 지저분해서');
  });
});
