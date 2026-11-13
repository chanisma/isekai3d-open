import { describe, expect, it } from 'vitest';
import { Game } from './game';
import { SOCIALS } from './socials';
import type { Dweller, SocialDef } from './types';
import type { Townie } from './visitors';

const seeded = (seed = 11) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const game = () => Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], seeded());
type Private = { spawnTownie(role: 'doorbell', who: Townie): Dweller; applySocialOutcome(a: Dweller, b: Dweller, s: SocialDef, o: 'great' | 'ok' | 'fail'): void };
const social = (id: string) => SOCIALS.find((s) => s.id === id)!;

describe('knowing others, after 참고 게임 DwellerKnowledge', () => {
  it('learns one trait, like or strength at a time by getting to know someone, until there is nothing left', () => {
    const g = game();
    const me = g.state.dwellers[0];
    const t = g.state.townies!.find((x) => x.name === '도윤')!;
    const him = (g as unknown as Private).spawnTownie('doorbell', t);
    const strengths = Object.values(t.skills ?? {}).filter((v) => v >= 2).length;
    const total = (t.traits ?? []).length + (t.likes ?? []).length + Math.min(6, strengths);
    for (let i = 0; i < total + 2; i++) (g as unknown as Private).applySocialOutcome(me, him, social('getToKnow'), 'ok');
    const k = me.knows![t.id];
    expect((k.traits ?? []).sort()).toEqual([...(t.traits ?? [])].sort());
    expect((k.likes ?? []).sort()).toEqual([...(t.likes ?? [])].sort());
    expect(g.toasts.filter((x) => x.text.startsWith('💡'))).toHaveLength(total);
    expect(k.job).toBeUndefined();
  });

  it('learns nothing from a talk that went badly', () => {
    const g = game();
    const me = g.state.dwellers[0];
    const t = g.state.townies!.find((x) => x.name === '수아')!;
    const her = (g as unknown as Private).spawnTownie('doorbell', t);
    (g as unknown as Private).applySocialOutcome(me, her, social('getToKnow'), 'fail');
    expect(me.knows?.[t.id]?.traits ?? []).toHaveLength(0);
  });

  it('hears about a neighbour’s job and why its competency matters, which counts as exploring the field', () => {
    const g = game();
    const me = g.state.dwellers[0];
    const t = g.state.townies!.find((x) => x.name === '도윤')!;
    const him = (g as unknown as Private).spawnTownie('doorbell', t);
    (g as unknown as Private).applySocialOutcome(me, him, social('askAboutCareer'), 'great');
    expect(me.knows![t.id].job).toBe('firefighter');
    const line = g.toasts.find((x) => x.text.startsWith('💼'))!.text;
    expect(line).toContain('소방관이에요');
    expect(line).toContain('중요하대요');
    expect(me.explored).toContain('public');
  });

  it('tells of a grandmother’s old job, and offers no job talk with a child', () => {
    const g = game();
    const me = g.state.dwellers[0];
    const gran = g.state.townies!.find((x) => x.name === '영자')!;
    const her = (g as unknown as Private).spawnTownie('doorbell', gran);
    (g as unknown as Private).applySocialOutcome(me, her, social('askAboutCareer'), 'ok');
    expect(g.toasts.some((x) => x.text.includes('예전에 농부 일을 했어요'))).toBe(true);
    const kid = (g as unknown as Private).spawnTownie('doorbell', g.state.townies!.find((x) => x.name === '하준')!);
    const ask = g.socialMenu(me, kid).find((o) => o.id === 'askAboutCareer');
    expect(ask?.disabled).toBe('일을 하지 않아요');
  });
});
