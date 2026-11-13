import { describe, expect, it } from 'vitest';
import { LT_MOTIONS, ltNow, type LtMotion } from './labTechnicianMotion';

describe('the 진단검사센터', () => {
  it('every script runs at any time, backwards too, with hands within an arm of the body', () => {
    const far: string[] = [];
    for (const m of LT_MOTIONS) {
      for (let t = -40; t < 80; t += 0.13) {
        const N = ltNow(m as LtMotion, t, 0.3, 1.6);
        expect(Number.isFinite(N.st.x + N.st.z + N.st.yaw)).toBe(true);
        for (const v of Object.values(N.n)) expect(Number.isFinite(v)).toBe(true);
        // Held beats only: while easing on to the next place the hands catch up with the feet.
        if (N.b.e > 0) continue;
        const shoulderY = N.st.sit ? N.st.y + 0.55 : 1.3 - (N.key.crouch ?? 0) * 0.5;
        const shoulder = [N.st.x, shoulderY, N.st.z];
        const toolHand = N.tool === 'phone' || N.tool === 'tablet' ? null : N.tool ? Object.values(N.props).find((p) => p) ?? null : null;
        for (const [side, h] of [['l', N.key.l], ['r', N.key.r], ['tool', toolHand]] as const) {
          if (!h) continue;
          expect(h.every(Number.isFinite)).toBe(true);
          if (side === 'tool' && N.tool && (m === 'ltSpin' || m === 'ltCulture' || m === 'ltCritical')) continue;
          const d = Math.hypot(h[0] - shoulder[0], h[1] - shoulder[1], h[2] - shoulder[2]);
          if (d > 0.62 + 0.45 * (N.key.lean ?? 0) + 0.18) far.push(`${m} ${N.b.from} ${side} ${d.toFixed(2)}`);
        }
      }
    }
    expect([...new Set(far.map((s) => s.split(' ').slice(0, 3).join(' ')))]).toEqual([]);
  });
});
