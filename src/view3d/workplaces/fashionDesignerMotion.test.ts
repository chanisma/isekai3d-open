import { describe, expect, it } from 'vitest';
import { FD_MOTIONS, fdNow, type FdMotion } from './fashionDesignerMotion';

describe('패션 아틀리에 scripts', () => {
  it('every beat of every motion is finite, whichever way the clock runs', () => {
    for (const m of FD_MOTIONS) {
      for (let t = -40; t < 40; t += 0.13) {
        const N = fdNow(m as FdMotion, t, 0.3);
        expect(Number.isFinite(N.st.x + N.st.y + N.st.z + N.st.yaw), `${m} at ${t}`).toBe(true);
        for (const v of Object.values(N.n)) expect(Number.isFinite(v), `${m} at ${t}`).toBe(true);
        for (const p of Object.values(N.props)) if (p) expect(Number.isFinite(p[0] + p[1] + p[2]), `${m} at ${t}`).toBe(true);
      }
    }
  });

  it('a tool the script holds always has a place', () => {
    for (const m of FD_MOTIONS) {
      for (let t = 0; t < 60; t += 0.13) {
        const N = fdNow(m as FdMotion, t, 0);
        if (N.tool) expect(N.props[N.tool], `${m} ${N.tool} at ${t}`).toBeTruthy();
      }
    }
  });

  it('a hand given a place is within an arm of the shoulder', () => {
    // Shoulders about 0.82 of the height standing, 0.5 above a seat; the arm about 0.5, plus what the lean gives.
    const far: string[] = [];
    for (const m of FD_MOTIONS) {
      for (let t = 0; t < 60; t += 0.13) {
        const N = fdNow(m as FdMotion, t, 0);
        if (N.walking || N.b.e > 0) continue;
        const sy = N.st.sit ? N.st.y + 0.5 : N.st.y + 1.3;
        const lean = (N.key.lean ?? 0) * 0.5;
        const fx = Math.sin(N.st.yaw);
        const fz = Math.cos(N.st.yaw);
        const reach = (h: readonly [number, number, number] | null | undefined, side: number, what: string) => {
          if (!h) return;
          const lx = Math.cos(N.st.yaw) * side;
          const lz = -Math.sin(N.st.yaw) * side;
          const d = Math.hypot(h[0] - (N.st.x + lx * 0.18 + fx * lean), h[1] - sy, h[2] - (N.st.z + lz * 0.18 + fz * lean));
          if (d > 0.6) far.push(`${m} ${N.b.from} ${what} ${d.toFixed(2)}`);
        };
        reach(N.key.l, 1, 'left');
        reach(N.key.r, -1, 'right');
        if (N.tool && N.tool !== 'clip' && N.tool !== 'bolt' && N.tool !== 'tape' && N.tool !== 'tapeArm') reach(N.props[N.tool], -1, N.tool);
      }
    }
    expect([...new Set(far.map((s) => s.split(' ').slice(0, 3).join(' ')))]).toEqual([]);
  });
});
