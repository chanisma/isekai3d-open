import { describe, expect, it } from 'vitest';
import { getDef } from '../../game/catalog';
import { WORKPLACES } from '../../game/workplace';
import { MANI, spotPose } from '../activity';
import { buildFurniture } from '../furniture3d';
import { BQ_ROUND, bqBeatTimes, bqNow } from './bakerMotion';
import { CP_ROUND, cpBeatTimes, cpNow } from './carpenterMotion';
import { KC_ROUND, kcBeatTimes, kcNow } from './culinaryMotion';
import { HS_ROUND, hsBeatTimes, hsNow } from './hairStylistMotion';
import { worstReach, type Now } from './handWorkKit';
import { NAIL_OFFSETS, NL_ROUND, nlBeatTimes, nlNow } from './nailArtistMotion';

const REACH = 0.6;
const ROUNDS: Array<[string, number, (t: number, H: number) => Now]> = [
  ['kitchen', KC_ROUND, kcNow],
  ['bakery', BQ_ROUND, bqNow],
  ['salon', HS_ROUND, hsNow],
  ['sanding', CP_ROUND, (t) => cpNow(t)],
  ['gel', NL_ROUND, (t) => nlNow(t)],
];

describe('the hand-work extras', () => {
  it.each(ROUNDS)('%s: the hands stay within the arm, all round, on short and tall dwellers', (_n, T, now) => {
    for (const H of [1.5, 1.6, 1.75]) {
      for (let t = 0; t < T; t += 0.06) {
        const n = now(t, H);
        expect(worstReach(n), `${n.beat} at ${t.toFixed(2)}`).toBeLessThan(REACH);
      }
    }
  });

  it.each(ROUNDS)('%s: a round a player can watch', (_n, T) => {
    expect(T).toBeGreaterThan(15);
    expect(T).toBeLessThan(60);
  });

  it('the order of the work', () => {
    const order = (times: Array<[string, number]>, keys: string[]) => {
      const at = Object.fromEntries(times);
      for (let i = 1; i < keys.length; i++) expect(at[keys[i]], keys[i]).toBeGreaterThan(at[keys[i - 1]]);
    };
    order(kcBeatTimes(), ['crumbs', 'spray', 'wipe', 'mop', 'tick']);
    order(bqBeatTimes(), ['brush', 'tray', 'sweep', 'tick']);
    order(hsBeatTimes(), ['gather', 'brushIn', 'tip']);
    order(cpBeatTimes(), ['sand1', 'feel1', 'dust1', 'change', 'sand2', 'blow']);
    order(nlBeatTimes(), ['file', 'wrap', 'wait', 'push', 'buff', 'oil']);
  });

  it('things go only one way within a round', () => {
    let ticks = 0;
    let swept = 0;
    for (let t = 0; t < KC_ROUND - 0.5; t += 0.05) {
      const n = kcNow(t);
      if (n.beat === 'fromBoard') expect(n.ticks).toBe(4);
      expect(n.ticks).toBeGreaterThanOrEqual(ticks);
      ticks = n.ticks;
    }
    for (let t = 0; t < BQ_ROUND - 0.5; t += 0.05) {
      const n = bqNow(t);
      expect(n.swept).toBeGreaterThanOrEqual(swept);
      swept = n.swept;
    }
    // Gel comes off only once the wait is done.
    for (let t = 0; t < NL_ROUND; t += 0.05) {
      const n = nlNow(t);
      if (n.beat === 'wrap' || n.beat === 'wait' || n.beat === 'file') expect(n.gel.every((g) => g === 1)).toBe(true);
      if (n.beat === 'wait') expect(n.foil.every(Boolean)).toBe(true);
    }
  });

  it('the nails are where the table draws them', () => {
    expect(NAIL_OFFSETS).toEqual(MANI.nails.map((n) => [n.side, n.up, n.ahead]));
  });

  it.each([
    ['culinaryDishPit', 'xwCloseKitchen', 'kcClose', KC_ROUND, ['kcCloth', 'kcSpray', 'mop', 'kcPen']],
    ['doughTable', 'xwCloseBakery', 'bqClose', BQ_ROUND, ['bqBrush', 'bqCloth', 'broom', 'bqPen']],
    ['salonStation', 'xwSweepHair', 'hsSweep', HS_ROUND, ['broom']],
    ['finishingTable', 'xwSanding', 'cpSand', CP_ROUND, ['cpSandBlock']],
    ['nailTable', 'xwSoakOff', 'nlSoak', NL_ROUND, ['nlFile', 'nlWrap', 'nlPusher', 'nlBuffer', 'nlOil']],
  ] as const)('%s draws %s, nothing of it out or in a hand when it isn\'t going on', (piece, id, motion, T, tools) => {
    const b = buildFurniture(getDef(piece), { againstWall: false });
    b.root.updateMatrixWorld(true);
    const s = b.spots![id];
    expect(s.motion).toBe(motion);
    const visibleCount = () => {
      let n = 0;
      b.root.traverseVisible(() => n++);
      return n;
    };
    b.away?.(false, 100);
    const idle = visibleCount();
    expect(s.held ?? null).toBeNull();
    const seen = new Set<string>();
    for (let t = 200; t < 200 + T; t += 0.2) {
      spotPose(s, motion, 1.6, t, 0);
      b.away?.(false, t);
      if (s.held) seen.add(s.held.tool.name);
    }
    expect([...seen].sort()).toEqual([...tools].sort());
    b.away?.(false, 900);
    expect(s.held ?? null).toBeNull();
    expect(visibleCount()).toBe(idle);
  });

  it('each career has its piece on its lot', () => {
    for (const [career, piece] of [['culinary', 'culinaryDishPit'], ['baker', 'doughTable'], ['hairStylist', 'salonStation'], ['carpenter', 'finishingTable'], ['nailArtist', 'nailTable']]) {
      expect(WORKPLACES[career].objects.some((o) => o.defId === piece), career).toBe(true);
    }
  });
});
