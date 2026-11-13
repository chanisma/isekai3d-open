import { describe, expect, it } from 'vitest';
import { BATH_ROUND, CHANGE_ROUND, WASH_ROUND, cwBeatTimes, cwNow, shoulderOf, type P } from './careWorkerMotion';

const dist = (a: P, b: P) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
/** The body's arm is about 0.5 m (PIPELINE.md, Tools in the hand); a little over is the shoulder coming along. */
const REACH = 0.56;
const MOTIONS = ['cwChange', 'cwWash', 'cwBath'] as const;

describe('personal care at a care home', () => {
  for (const m of MOTIONS)
    it(`${m}: every moment is finite, and the hands are within the arm of where the body stands`, () => {
      let worst = 0;
      let at = '';
      for (let t = 0; t < 150; t += 0.07) {
        const N = cwNow(m, t, 0.3);
        for (const v of [...N.key.l, ...N.key.r, ...N.toolAt, N.back, N.roll]) expect(Number.isFinite(v), `${m} ${N.beat}`).toBe(true);
        const d = Math.max(dist(N.key.l, shoulderOf(N.at, 1, N.key)), dist(N.key.r, shoulderOf(N.at, -1, N.key)));
        if (d > worst) [worst, at] = [d, N.beat];
      }
      expect(worst, `${m} at ${at}`).toBeLessThan(REACH);
    });

  it('the rounds are of a length a player can watch', () => {
    for (const r of [CHANGE_ROUND, WASH_ROUND, BATH_ROUND]) {
      expect(r).toBeGreaterThan(20);
      expect(r).toBeLessThan(60);
    }
  });

  it('whoever is being cared for stays covered: the blanket never comes off and the pad is changed under it', () => {
    for (const m of ['cwChange', 'cwWash'] as const)
      for (let t = 0; t < 120; t += 0.05) {
        const N = cwNow(m, t, 0);
        expect(N.covered, `${m} ${N.beat}`).toBe(true);
        // Only a little onto the side, unlike a full turn, so the blanket stays over the hips.
        expect(N.roll).toBeGreaterThanOrEqual(-0.56);
      }
  });

  it('a change goes in order: told, gloves, old pad out, wiped, clean gloves, new pad, back over, hands cleaned', () => {
    const at = Object.fromEntries(cwBeatTimes('cwChange'));
    const order = ['tell', 'gloves', 'roll', 'undo', 'out', 'bin', 'wipe', 'dry', 'look', 'regloves', 'new', 'rollBack', 'fasten', 'smooth', 'off', 'gel', 'ask'];
    for (let i = 1; i < order.length; i++) expect(at[order[i]], order[i]).toBeGreaterThan(at[order[i - 1]]);
  });

  it('a wash starts with the water tried and the face, and only the arm being washed is out, its sleeve pushed up', () => {
    const beats = cwBeatTimes('cwWash').map(([k]) => k);
    expect(beats.indexOf('temp')).toBeLessThan(beats.indexOf('face'));
    expect(beats.indexOf('face')).toBeLessThan(beats.indexOf('arm'));
    for (let t = 0; t < 120; t += 0.05) {
      const N = cwNow('cwWash', t, 0);
      if (N.beat === 'arm' || N.beat === 'hand') {
        expect(N.sleeveUp).toBe(true);
        expect(N.armTowel).toBe(true);
      }
      if (N.beat === 'face' || N.beat === 'tell' || N.beat === 'temp' || N.beat === 'ask') expect(N.sleeveUp, N.beat).toBe(false);
    }
  });

  it('a bath tries the water on the carer’s wrist before it touches anyone, feet before shoulder, towel last', () => {
    const at = Object.fromEntries(cwBeatTimes('cwBath'));
    expect(at.wrist).toBeLessThan(at.feet);
    expect(at.feet).toBeLessThan(at.shoulder);
    expect(at.shoulder).toBeLessThan(at.wrap);
    for (let t = 0; t < 120; t += 0.05) {
      const N = cwNow('cwBath', t, 0);
      if (N.beat === 'tell' || N.beat === 'mixer') expect(N.spray).toBe(false);
      if (N.beat === 'pat') expect(N.towelOn).toBe(true);
    }
  });
});
