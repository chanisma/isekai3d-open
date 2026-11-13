import { describe, expect, it } from 'vitest';
import { TG_MOTIONS, brSlot, gtSlot, mapPoint, pwSlot, routeOf, tgNow, wrap, type TgMotion } from './tourGuideMotion';

describe('여행사 scripts', () => {
  it('every beat of every motion is finite, whichever way the clock runs', () => {
    for (const m of TG_MOTIONS) {
      for (let t = -40; t < 40; t += 0.13) {
        const N = tgNow(m as TgMotion, t, 0.3);
        expect(Number.isFinite(N.st.x + N.st.y + N.st.z + N.st.yaw), `${m} at ${t}`).toBe(true);
        for (const v of Object.values(N.n)) expect(Number.isFinite(v), `${m} at ${t}`).toBe(true);
        for (const p of Object.values(N.props)) if (p) expect(Number.isFinite(p[0] + p[1] + p[2]), `${m} at ${t}`).toBe(true);
      }
    }
  });

  it('a tool the script holds always has a place', () => {
    const place: Record<string, string> = { passport: 'pass' };
    for (const m of TG_MOTIONS) {
      for (let t = 0; t < 80; t += 0.13) {
        const N = tgNow(m as TgMotion, t, 0);
        if (N.tool) expect(N.props[place[N.tool] ?? N.tool], `${m} ${N.tool} at ${t}`).toBeTruthy();
      }
    }
  });

  it('a list is never read outside itself, even on a round before zero', () => {
    for (const r of [-7, -1, 0, 3, 1e6]) {
      expect(routeOf(r)).toBeTruthy();
      expect(Number.isFinite(mapPoint(r)[0] + brSlot(r)[0] + gtSlot(r)[0] + pwSlot(r)[0])).toBe(true);
      expect(wrap(r, 4)).toBeGreaterThanOrEqual(0);
    }
  });
});
