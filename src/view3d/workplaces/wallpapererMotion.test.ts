import { describe, expect, it } from 'vitest';
import { WL_MOTIONS, wlNow, type WlMotion } from './wallpapererMotion';

describe('인테리어 시공 현장 scripts', () => {
  it('every beat of every motion is finite, whichever way the clock runs', () => {
    for (const m of WL_MOTIONS) {
      for (let t = -40; t < 40; t += 0.13) {
        const N = wlNow(m as WlMotion, t, 0.3);
        expect(Number.isFinite(N.st.x + N.st.y + N.st.z + N.st.yaw), `${m} at ${t}`).toBe(true);
        for (const v of Object.values(N.n)) expect(Number.isFinite(v), `${m} at ${t}`).toBe(true);
        for (const p of Object.values(N.props)) if (p) expect(Number.isFinite(p[0] + p[1] + p[2]), `${m} at ${t}`).toBe(true);
      }
    }
  });

  it('a tool the script holds always has a place', () => {
    for (const m of WL_MOTIONS) {
      for (let t = 0; t < 60; t += 0.13) {
        const N = wlNow(m as WlMotion, t, 0);
        if (N.tool) expect(N.props[N.tool], `${m} ${N.tool} at ${t}`).toBeTruthy();
      }
    }
  });

  it('a hand given a place is within an arm of the shoulder', () => {
    // Shoulders about 1.3 standing (a full crouch takes 0.37 off), 0.5 above a seat; the arm about 0.5, plus what the lean gives.
    const far: string[] = [];
    for (const m of WL_MOTIONS) {
      for (let t = 0; t < 60; t += 0.13) {
        const N = wlNow(m as WlMotion, t, 0);
        if (N.walking || N.b.e > 0) continue;
        const sy = N.st.sit ? N.st.y + 0.5 : N.st.y + 1.3 - (N.key.crouch ?? 0) * 0.37;
        const lean = (N.key.lean ?? 0) * 0.5;
        const fx = Math.sin(N.st.yaw);
        const fz = Math.cos(N.st.yaw);
        const reach = (h: readonly [number, number, number] | null | undefined, side: number, what: string) => {
          if (!h) return;
          const lx = Math.cos(N.st.yaw) * side;
          const lz = -Math.sin(N.st.yaw) * side;
          const d = Math.hypot(h[0] - (N.st.x + lx * 0.18 + fx * lean), h[1] - sy, h[2] - (N.st.z + lz * 0.18 + fz * lean));
          if (d > 0.62) far.push(`${m} ${N.b.from} ${what} ${d.toFixed(2)}`);
        };
        reach(N.key.l, 1, 'left');
        reach(N.key.r, -1, 'right');
        // The two-handed tools have their grips either side of the place.
        if (N.tool && !['clip', 'tape', 'bundle', 'roll', 'plank', 'book'].includes(N.tool)) reach(N.props[N.tool], -1, N.tool);
      }
    }
    expect([...new Set(far.map((s) => s.split(' ').slice(0, 3).join(' ')))]).toEqual([]);
  });
});
