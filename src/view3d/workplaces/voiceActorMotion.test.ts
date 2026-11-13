import { describe, expect, it } from 'vitest';
import { VA_MOTIONS, vaNow, type VaMotion } from './voiceActorMotion';

describe('녹음 스튜디오 scripts', () => {
  it('every beat of every motion is finite, whichever way the clock runs', () => {
    for (const m of VA_MOTIONS) {
      for (let t = -40; t < 40; t += 0.13) {
        const N = vaNow(m as VaMotion, t, 0.3);
        expect(Number.isFinite(N.st.x + N.st.y + N.st.z + N.st.yaw), `${m} at ${t}`).toBe(true);
        for (const v of Object.values(N.n)) expect(Number.isFinite(v), `${m} at ${t}`).toBe(true);
        for (const p of Object.values(N.props)) if (p) expect(Number.isFinite(p[0] + p[1] + p[2]), `${m} at ${t}`).toBe(true);
      }
    }
  });

  it('a tool the script holds always has a place', () => {
    for (const m of VA_MOTIONS) {
      for (let t = 0; t < 60; t += 0.13) {
        const N = vaNow(m as VaMotion, t, 0);
        if (N.tool) expect(N.props[N.tool], `${m} ${N.tool} at ${t}`).toBeTruthy();
      }
    }
  });
});
