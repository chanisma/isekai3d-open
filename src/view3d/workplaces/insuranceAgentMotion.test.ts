import { describe, expect, it } from 'vitest';
import { BH_MOTIONS, bhNow, fileAt, fileOf, pocketAt, pocketOf, starAt, type BhMotion } from './insuranceAgentMotion';

const ALL = [...BH_MOTIONS] as BhMotion[];
const LEFT = new Set(['phone', 'stack']);
const BOTH = new Set(['book', 'bizcard']);

describe('보험 지점 scripts', () => {
  it('every beat of every motion is finite, whichever way the clock runs', () => {
    for (const m of ALL) {
      for (let t = -40; t < 40; t += 0.13) {
        const N = bhNow(m, t, 0.3);
        expect(Number.isFinite(N.st.x + N.st.y + N.st.z + N.st.yaw), `${m} at ${t}`).toBe(true);
        for (const v of Object.values(N.n)) expect(Number.isFinite(v), `${m} at ${t}`).toBe(true);
        for (const p of Object.values(N.props)) if (p) expect(Number.isFinite(p[0] + p[1] + p[2]), `${m} at ${t}`).toBe(true);
      }
    }
  });

  it('a tool the script holds always has a place', () => {
    for (const m of ALL) {
      for (let t = 0; t < 80; t += 0.13) {
        const N = bhNow(m, t, 0);
        if (N.tool) expect(N.props[N.tool], `${m} ${N.tool} at ${t}`).toBeTruthy();
      }
    }
  });

  it('the hands stay within an arm of the body', () => {
    const far: Record<string, number> = {};
    for (const m of ALL) {
      for (let t = 0; t < 160; t += 0.17) {
        const N = bhNow(m, t, 0);
        if (N.b.e > 0) continue;
        const up = N.st.sit ? N.st.y + 0.5 : 1.3;
        const lx = Math.cos(N.st.yaw);
        const lz = -Math.sin(N.st.yaw);
        const fx = Math.sin(N.st.yaw);
        const fz = Math.cos(N.st.yaw);
        const lean = (N.key.lean ?? 0.05) * 0.6;
        const check = (side: number, v?: readonly [number, number, number] | null, tag = '') => {
          if (!v) return;
          const d = Math.hypot(v[0] - (N.st.x + lx * side * 0.18 + fx * lean), v[1] - up, v[2] - (N.st.z + lz * side * 0.18 + fz * lean));
          const k = `${m} ${N.b.from} ${tag}`;
          if (d > 0.6) far[k] = Math.max(far[k] ?? 0, Math.round(d * 100) / 100);
        };
        const toolAt = N.tool ? N.props[N.tool] : null;
        if (N.tool && !BOTH.has(N.tool)) check(LEFT.has(N.tool) ? 1 : -1, toolAt, N.tool);
        if (N.tool && BOTH.has(N.tool)) check(0, toolAt, N.tool);
        if (!N.tool || LEFT.has(N.tool)) check(-1, N.key.r, 'r');
        if (!N.tool || !(LEFT.has(N.tool) || BOTH.has(N.tool))) check(1, N.key.l, 'l');
      }
    }
    expect(far).toEqual({});
  });

  it('a list is never read outside itself, even on a round before zero', () => {
    for (const r of [-7, -1, 0, 3, 1e6]) {
      expect(Number.isFinite(starAt(r)[0] + pocketAt(r)[0] + pocketOf(r, 2)[0] + fileAt(fileOf(r).col, fileOf(r).shelf)[1])).toBe(true);
    }
  });
});
