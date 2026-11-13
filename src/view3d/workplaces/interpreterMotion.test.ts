import { describe, expect, it } from 'vitest';
import { IP_MOTIONS, ipNow, type IpMotion } from './interpreterMotion';

describe('통번역 사무소 scripts', () => {
  it('every beat of every motion is finite, whichever way the clock runs', () => {
    for (const m of IP_MOTIONS) {
      for (let t = -40; t < 40; t += 0.13) {
        const N = ipNow(m as IpMotion, t, 0.3);
        expect(Number.isFinite(N.st.x + N.st.y + N.st.z + N.st.yaw), `${m} at ${t}`).toBe(true);
        for (const v of Object.values(N.n)) expect(Number.isFinite(v), `${m} at ${t}`).toBe(true);
        for (const p of Object.values(N.props)) if (p) expect(Number.isFinite(p[0] + p[1] + p[2]), `${m} at ${t}`).toBe(true);
      }
    }
  });

  it('a tool the script holds always has a place', () => {
    for (const m of IP_MOTIONS) {
      for (let t = 0; t < 60; t += 0.13) {
        const N = ipNow(m as IpMotion, t, 0);
        if (N.tool) expect(N.props[N.tool], `${m} ${N.tool} at ${t}`).toBeTruthy();
      }
    }
  });
});
