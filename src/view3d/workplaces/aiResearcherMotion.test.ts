import { describe, expect, it } from 'vitest';
import { AR_MOTIONS, arNow, type ArMotion } from './aiResearcherMotion';

describe('인공지능 연구소 scripts', () => {
  it('every beat of every motion is finite, whichever way the clock runs', () => {
    for (const m of AR_MOTIONS) {
      for (let t = -40; t < 40; t += 0.13) {
        const N = arNow(m as ArMotion, t, 0.3);
        expect(Number.isFinite(N.st.x + N.st.y + N.st.z + N.st.yaw), `${m} at ${t}`).toBe(true);
        for (const v of Object.values(N.n)) expect(Number.isFinite(v), `${m} at ${t}`).toBe(true);
        for (const p of Object.values(N.props)) if (p) expect(Number.isFinite(p[0] + p[1] + p[2]), `${m} at ${t}`).toBe(true);
      }
    }
  });

  it('the loss goes on falling through a round: how far the run has got only goes up', () => {
    let last = -1;
    let round: number | null = null;
    for (let t = 0; t < 18; t += 0.05) {
      const N = arNow('arTrain', t, 0);
      if (round !== N.b.n || N.b.i === 5) {
        round = N.b.n;
        last = -1;
        if (N.b.i === 5) continue;
      }
      expect(N.n.loss).toBeGreaterThanOrEqual(last - 1e-6);
      last = N.n.loss;
    }
    expect(last).toBeGreaterThan(0.8);
  });
});
