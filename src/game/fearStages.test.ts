import { describe, expect, it } from 'vitest';
import { socialScore } from './autonomy';
import { BUFFS } from './emotions';
import { FEARS, FEAR_BY_ID, FEAR_GROW_DAYS, fearBuffScale, fearDrag, fearLevel, fearPull, supportPull } from './fears';
import { Game } from './game';
import { newRelationship } from './relationships';
import { NOTE_BY_ID, RESEARCH_NOTES, traitNoteId } from './research';
import { SOCIAL_BY_ID } from './socials';
import { TRAIT_BY_ID } from './traits';

// Fear strength, fears in free will, the four new fears and the research notes (2026-10-26, at the user's request).

const make = () => {
  const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.01);
  g.state.freeWill = false;
  return { g, dweller: g.state.dwellers[0] };
};

describe('fear strength', () => {
  it('a new fear is 약함; left alone for days it grows, lived through again it may grow', () => {
    const { g, dweller } = make();
    g.maybeFear(dweller, 'judged');
    expect(fearLevel(dweller, 'judged')).toBe(1);
    // Untouched for FEAR_GROW_DAYS: a rung up at the next daily check.
    g.state.time += FEAR_GROW_DAYS * 1440 + 10;
    dweller.fearDay = undefined;
    (g as unknown as { stepFears(s: typeof dweller, dt: number): void }).stepFears(dweller, 0.5);
    expect(fearLevel(dweller, 'judged')).toBe(2);
    // Lived through again (rng 0.01 < chance): grows, but not twice in a day.
    g.state.time += 1441;
    g.maybeFear(dweller, 'judged');
    expect(fearLevel(dweller, 'judged')).toBe(3);
    g.maybeFear(dweller, 'judged');
    expect(fearLevel(dweller, 'judged')).toBe(3);
  });

  it('walked to the end, a strong fear comes down a rung, and from 약함 it is gone', () => {
    const { g, dweller } = make();
    g.maybeFear(dweller, 'judged');
    dweller.fearLevel!.judged = 2;
    g.faceFear(dweller, 'judged', FEAR_BY_ID.judged.need);
    expect(fearLevel(dweller, 'judged')).toBe(1);
    expect(dweller.buffs.some((b) => b.id === 'fearStepDown')).toBe(true);
    expect(dweller.fearProgress?.judged).toBe(0);
    g.faceFear(dweller, 'judged', FEAR_BY_ID.judged.need);
    expect(dweller.fears).toEqual([]);
    expect(dweller.fearLevel?.judged).toBeUndefined();
  });

  it('weighs more as it grows: moodlets, and what it takes from learning', () => {
    const s = { fears: ['failure' as const], fearLevel: { failure: 3 } };
    expect(fearBuffScale(s, 'fearFailureWake')).toBe(2);
    expect(fearBuffScale(s, 'happy')).toBe(1);
    expect(fearDrag(1)).toBeCloseTo(0.9);
    expect(fearDrag(3)).toBeCloseTo(0.8);
    expect(fearDrag(0)).toBe(1);
  });
});

describe('fears in free will', () => {
  it('shies from what a fear is about, the more the stronger; a strong heart goes to meet it', () => {
    const s = { fears: ['stage' as const], fearLevel: { stage: 1 }, skills: { resilience: 0 } };
    expect(fearPull(s, 'giveSpeech')).toBeCloseTo(0.8);
    s.fearLevel.stage = 3;
    expect(fearPull(s, 'giveSpeech')).toBeCloseTo(0.4);
    expect(fearPull(s, 'watchTv')).toBe(1);
    s.skills.resilience = 3;
    expect(fearPull(s, 'giveSpeech')).toBeCloseTo(1);
    s.skills.resilience = 8;
    expect(fearPull(s, 'giveSpeech')).toBeCloseTo(1.6);
    // Afraid of being found out: over-prepares however brave.
    expect(fearPull({ fears: ['imposter'], fearLevel: { imposter: 2 }, skills: {} }, 'jobPractice')).toBeCloseTo(1.3);
  });

  it('a group conversation and a heart-to-heart, scored with the fear', () => {
    const { g, dweller } = make();
    const other = { ...dweller, id: 99, fears: [] } as typeof dweller;
    const rel = newRelationship(40, 0, g.state.time);
    dweller.needs.social = 40;
    const plain = socialScore(dweller, SOCIAL_BY_ID.deepTalk, rel, other);
    dweller.fears = ['lonely'];
    dweller.fearLevel = { lonely: 2 };
    dweller.skills.resilience = 0;
    // Lonely shies from a talk (×0.6) but seeks a confidant (×1.6).
    expect(socialScore(dweller, SOCIAL_BY_ID.deepTalk, rel, other)).toBeCloseTo(plain * 0.6 * 1.6, 5);
    expect(supportPull(dweller)).toBeCloseTo(1.6);
  });
});

describe('the four new fears', () => {
  it('stage fright from a stage, faced by going on it; test anxiety from a bad school day, eased by homework', () => {
    const { g, dweller } = make();
    const done = (id: string) => (g as unknown as { onInteractionDone(s: unknown, i: unknown, o: unknown): void }).onInteractionDone(dweller, { id, label: id, icon: '', duration: 1, effects: {}, skill: { key: 'charisma', rate: 0 } }, { uid: 1, defId: 'mirror', x: 0, y: 0 });
    done('giveSpeech');
    expect(dweller.fears).toContain('stage');
    done('speech');
    expect(dweller.fearProgress?.stage).toBe(1);
    (g as unknown as { shiftFears(s: unknown, school: boolean, d: number): void }).shiftFears(dweller, true, -20);
    expect(dweller.fears).toContain('exam');
    done('homework');
    expect(dweller.fearProgress?.exam).toBe(1);
  });

  it('a good shift is evidence against the fear of being found out, though it feels like luck', () => {
    const { g, dweller } = make();
    dweller.fears = ['imposter'];
    (g as unknown as { shiftFears(s: unknown, school: boolean, d: number): void }).shiftFears(dweller, false, 15);
    expect(dweller.fearProgress?.imposter).toBe(1);
    expect(dweller.buffs.some((b) => b.id === 'fearImposterLucky')).toBe(true);
  });

  it('every fear has its moodlets defined, and every research note its parts', () => {
    for (const f of FEARS) for (const b of f.buffs ?? []) expect(BUFFS[b], `${f.id}: ${b}`).toBeTruthy();
    expect(FEARS.length).toBe(16);
    for (const f of FEARS) expect(NOTE_BY_ID[`fear_${f.id}`], f.id).toBeTruthy();
    for (const n of RESEARCH_NOTES) {
      expect(n.game.length && n.real.length && n.tips.length && n.sources.length, n.id).toBeTruthy();
    }
    expect(traitNoteId('worrier')).toBe('trait_worrier');
    expect(traitNoteId('cheerful')).toBeNull();
    for (const n of RESEARCH_NOTES.filter((x) => x.group === 'trait')) expect(TRAIT_BY_ID[n.id.slice(6)], n.id).toBeTruthy();
  });
});
