import { describe, expect, it } from 'vitest';
import { DR_MOTIONS, DRAW_ROUND, DRESS_ROUND, MAKE_ROUND, SITE, TALK_ROUND, TOURNIQUET, TURN_ROUND, beatTimes, drNow, patientArm, shoulderOf, type DrMotion, type P } from './doctorMotion';

const dist = (a: P, b: P) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
/** The body's arm is about 0.5 m (PIPELINE.md, Tools in the hand); a little over is the shoulder coming along. */
const REACH = 0.56;

describe('work at a hospital bed', () => {
  it('every moment is finite, and the hands are within the arm of where the body stands', () => {
    const worst: Record<string, [number, string]> = {};
    for (const m of DR_MOTIONS) {
      for (let t = 0; t < 120; t += 0.07) {
        const N = drNow(m as DrMotion, t, 0.3);
        for (const v of [...N.key.l, ...N.key.r, ...N.toolAt, N.back, N.roll]) expect(Number.isFinite(v), `${m} ${N.beat}`).toBe(true);
        const d = Math.max(dist(N.key.l, shoulderOf(N.at, 1, N.key)), dist(N.key.r, shoulderOf(N.at, -1, N.key)));
        if (d > (worst[m]?.[0] ?? 0)) worst[m] = [d, N.beat];
      }
    }
    for (const [m, [d, beat]] of Object.entries(worst)) expect(d, `${m} at ${beat}`).toBeLessThan(REACH);
  });

  it('the rounds are of a length a player can watch', () => {
    for (const r of [DRAW_ROUND, DRESS_ROUND, TURN_ROUND, TALK_ROUND, MAKE_ROUND]) {
      expect(r).toBeGreaterThan(8);
      expect(r).toBeLessThan(60);
    }
  });

  it('a blood draw goes in the guideline’s order', () => {
    const at = Object.fromEntries(beatTimes('drBlood'));
    const order = ['band', 'rub', 'gloves', 'tie', 'swab', 'needle', 'fill1', 'mix', 'fill2', 'release', 'untube', 'out', 'sharps', 'label'];
    for (let i = 1; i < order.length; i++) expect(at[order[i]], order[i]).toBeGreaterThan(at[order[i - 1]]);
    // The tourniquet's off before the needle comes out, the needle's in the bin before the label.
    const seen = (beat: string) => {
      for (let t = 0; t < DRAW_ROUND; t += 0.05) {
        const N = drNow('drBlood', t, 0);
        if (N.beat === beat) return N;
      }
      throw new Error(beat);
    };
    expect(seen('out').tourniquet).toBe(false);
    expect(seen('fill1').tourniquet).toBe(true);
    expect(seen('label').tool).toBe('labelTube');
  });

  it('the tourniquet is 7-10 cm above the site, on the arm the arm’s sums give', () => {
    const d = dist(TOURNIQUET, SITE);
    expect(d).toBeGreaterThan(0.07);
    expect(d).toBeLessThan(0.1);
    const arm = patientArm(0.2, 0, 1, [0.39, 0.875, -0.22]);
    expect(dist(arm.shoulder, arm.elbow)).toBeCloseTo(0.27, 2);
    expect(dist(arm.elbow, arm.hand)).toBeCloseTo(0.25, 2);
  });

  it('nothing in a hand goes in the mattress', () => {
    for (const m of DR_MOTIONS) {
      for (let t = 0; t < 120; t += 0.11) {
        const N = drNow(m as DrMotion, t, 0);
        if (N.raised) for (const p of [N.key.l, N.key.r]) expect(p[1], `${m} ${N.beat}`).toBeGreaterThan(0.75);
      }
    }
  });
});
