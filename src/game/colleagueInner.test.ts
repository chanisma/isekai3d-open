import { describe, expect, it } from 'vitest';
import { moodBubble } from './render';
import { askWhatsUp, innerOf, knownInner, slipInner, tellChance } from './dwellerKnowledge';
import { SOCIAL_BY_ID, socialFits } from './socials';
import { Game } from './game';
import type { Townie } from './visitors';

// A colleague's inner life: shown on the face at first, learnt by talking (2026-10-26, at the user's request).

const make = () => {
  const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.01);
  return { g, dweller: g.state.dwellers[0] };
};
const townie = { id: 50, name: '하린', goal: 'promotion', fears: ['imposter'], joy: 'pet' } as unknown as Townie;

describe('a colleague as the dweller gets to know them', () => {
  it('nothing is known at first; good news is told when asked, then the worry once trusted, then the goal', () => {
    const { dweller } = make();
    const inner = innerOf(townie);
    expect(knownInner(dweller, 50, inner)).toMatchObject({ goal: undefined, worries: [], unknownWorry: true, unknownJoy: true });
    expect(askWhatsUp(dweller, 50, '하린', inner, 0, () => 0.99)).toContain('강아지');
    // Not trusted yet (rng above the chance): kept back, but asking again makes it likelier.
    expect(askWhatsUp(dweller, 50, '하린', inner, 0, () => 0.99)).toContain('아무것도 아니에요');
    expect(dweller.knows![50].opened).toBe(1);
    expect(tellChance(0, 0, 1)).toBeGreaterThan(tellChance(0, 0, 0));
    expect(askWhatsUp(dweller, 50, '하린', inner, 60, () => 0.1)).toContain('털어놓았어요');
    expect(askWhatsUp(dweller, 50, '하린', inner, 60, () => 0.1)).toContain('승진');
    expect(knownInner(dweller, 50, inner)).toMatchObject({ goal: 'promotion', worries: ['imposter'], joy: 'pet', unknownWorry: false });
  });

  it('a heart-to-heart opens a worry; yesterday’s good news is not today’s', () => {
    const { dweller } = make();
    expect(slipInner(dweller, 50, '하린', innerOf(townie), true, () => 0)).toContain('털어놓았어요');
    slipInner(dweller, 50, '하린', innerOf(townie), false, () => 0);
    expect(knownInner(dweller, 50, innerOf(townie)).joy).toBe('pet');
    expect(knownInner(dweller, 50, innerOf({ ...townie, joy: 'birthday' })).unknownJoy).toBe(true);
  });

  it('hearing out and sharing in are for what the household dweller has been told', () => {
    const { dweller } = make();
    const target = { id: 50, npc: { role: 'coworker' }, fears: ['imposter'], joy: 'pet' };
    expect(socialFits(SOCIAL_BY_ID.hearOut, target, dweller)).toBe(false);
    expect(socialFits(SOCIAL_BY_ID.shareJoy, target, dweller)).toBe(false);
    expect(socialFits(SOCIAL_BY_ID.askWhatsUp, target, dweller)).toBe(true);
    dweller.knows = { 50: { worries: ['imposter'], joy: 'pet' } };
    expect(socialFits(SOCIAL_BY_ID.hearOut, target, dweller)).toBe(true);
    expect(socialFits(SOCIAL_BY_ID.shareJoy, target, dweller)).toBe(true);
    // Colleagues know each other's; asking what's up is for the household.
    expect(socialFits(SOCIAL_BY_ID.hearOut, target, { npc: { role: 'coworker' } })).toBe(true);
    expect(socialFits(SOCIAL_BY_ID.askWhatsUp, target, { npc: { role: 'coworker' } })).toBe(false);
    expect(socialFits(SOCIAL_BY_ID.askWhatsUp, { id: 3 }, dweller)).toBe(false);
  });

  it('the face shows a worry, good news, a need or a mood — never what it is', () => {
    const { g, dweller } = make();
    const c = { ...dweller, id: 50, npc: { role: 'coworker', until: 0 }, fears: ['imposter'], buffs: [] } as unknown as typeof dweller;
    expect(moodBubble(g, c)?.icon).toBe('😔');
    expect(moodBubble(g, { ...c, fears: [], joy: 'pet' })?.icon).toBe('😊');
    expect(moodBubble(g, { ...c, fears: [], needs: { ...c.needs, energy: 10 } })?.icon).toBe('🥱');
    expect(moodBubble(g, dweller)).toBeNull();
  });

  it('a colleague come over as a guest gets the same click menu as a neighbour (a ring, not the long list)', () => {
    const { g, dweller } = make();
    const rows = (menu: ReturnType<typeof g.socialMenu>) => menu.filter((o) => !o.group).length + new Set(menu.flatMap((o) => (o.group ? [o.group] : []))).size;
    const guest = { ...dweller, id: 50, name: '하린', npc: { role: 'guest', until: g.state.time + 300 }, queue: [], run: null, engagedWith: null, fears: ['imposter'], joy: 'pet' } as unknown as typeof dweller;
    g.state.dwellers.push(guest);
    (g.state.townies ??= []).push({ ...townie, age: undefined } as Townie);
    const neighbour = rows(g.socialMenu(dweller, guest));
    g.state.townies![g.state.townies!.length - 1].workmate = { careerId: 'tech', slot: 0 } as Townie['workmate'];
    const colleague = g.socialMenu(dweller, guest);
    expect(rows(colleague)).toBe(neighbour);
    expect(rows(colleague)).toBeLessThanOrEqual(8);
    // Asked about straight out at home too; heard out only once told.
    expect(colleague.some((o) => o.id === 'askWhatsUp')).toBe(true);
    expect(colleague.some((o) => o.id === 'hearOut')).toBe(false);
  });
});
