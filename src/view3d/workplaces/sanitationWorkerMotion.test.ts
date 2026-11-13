import { describe, expect, it } from 'vitest';
import { SN_MOTIONS, snNow, type SnMotion } from './sanitationWorkerMotion';

describe('the 청소 차고지', () => {
  it('every script runs at any time, backwards too, with hands within an arm of the body', () => {
    const far: string[] = [];
    for (const m of SN_MOTIONS) {
      for (let t = -40; t < 80; t += 0.13) {
        const N = snNow(m as SnMotion, t, 0.3, 1.6);
        expect(Number.isFinite(N.st.x + N.st.z + N.st.yaw)).toBe(true);
        // Held beats only: while easing on to the next place the hands catch up with the feet.
        if (N.b.e > 0) continue;
        const shoulder = [N.st.x, 1.3 - (N.key.crouch ?? 0) * 0.5, N.st.z];
        for (const [side, h] of [['l', N.key.l], ['r', N.key.r]] as const) {
          if (!h) continue;
          expect(h.every(Number.isFinite)).toBe(true);
          const d = Math.hypot(h[0] - shoulder[0], h[1] - shoulder[1], h[2] - shoulder[2]);
          // Bending at the waist lets a reach go further than the arm's 0.55 m.
          if (d > 0.55 + 0.45 * (N.key.lean ?? 0) + 0.3) far.push(`${m} ${N.b.from} ${side} ${d.toFixed(2)}`);
        }
      }
    }
    expect([...new Set(far.map((s) => s.split(' ').slice(0, 3).join(' ')))]).toEqual([]);
  });
});
