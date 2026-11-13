import { describe, expect, it } from 'vitest';
import { JU_MOTIONS, aisleOf, carriageX, juNow, nbSlot, plateAt, queueOf, wrap, type JuMotion } from './civilServantMotion';

describe('주민센터 scripts', () => {
  it('every beat of every motion is finite, whichever way the clock runs', () => {
    for (const m of JU_MOTIONS) {
      for (let t = -40; t < 40; t += 0.13) {
        const N = juNow(m as JuMotion, t, 0.3);
        expect(Number.isFinite(N.st.x + N.st.y + N.st.z + N.st.yaw), `${m} at ${t}`).toBe(true);
        for (const v of Object.values(N.n)) expect(Number.isFinite(v), `${m} at ${t}`).toBe(true);
        for (const p of Object.values(N.props)) if (p) expect(Number.isFinite(p[0] + p[1] + p[2]), `${m} at ${t}`).toBe(true);
      }
    }
  });

  it('a tool the script holds always has a place', () => {
    const place: Record<string, string> = { binderPull: 'binder' };
    for (const m of JU_MOTIONS) {
      for (let t = 0; t < 80; t += 0.13) {
        const N = juNow(m as JuMotion, t, 0);
        if (N.tool) expect(N.props[place[N.tool] ?? N.tool], `${m} ${N.tool} at ${t}`).toBeTruthy();
      }
    }
  });

  it('the hands stay within an arm of the body', () => {
    const place: Record<string, string> = { binderPull: 'binder' };
    const LEFT = new Set(['stack', 'binder', 'board', 'card']);
    const far: Record<string, number> = {};
    for (const m of JU_MOTIONS) {
      for (let t = 0; t < 120; t += 0.17) {
        const N = juNow(m as JuMotion, t, 0);
        if (N.b.e > 0) continue;
        const up = N.st.sit ? N.st.y + 0.5 : 1.3;
        const lx = Math.cos(N.st.yaw);
        const lz = -Math.sin(N.st.yaw);
        const fx = Math.sin(N.st.yaw);
        const fz = Math.cos(N.st.yaw);
        // The shoulders, carried forward by how far the script leans.
        const lean = (N.key.lean ?? 0.05) * 0.6;
        const check = (side: number, v?: readonly [number, number, number] | null, tag = '') => {
          if (!v) return;
          const d = Math.hypot(v[0] - (N.st.x + lx * side * 0.18 + fx * lean), v[1] - up, v[2] - (N.st.z + lz * side * 0.18 + fz * lean));
          const k = `${m} ${N.b.from} ${tag}`;
          if (d > 0.6) far[k] = Math.max(far[k] ?? 0, Math.round(d * 100) / 100);
        };
        const toolAt = N.tool ? N.props[place[N.tool] ?? N.tool] : null;
        if (N.tool) check(LEFT.has(N.tool) ? 1 : -1, toolAt, N.tool);
        if (!N.tool || LEFT.has(N.tool)) check(-1, N.key.r, 'r');
        if (!N.tool || !LEFT.has(N.tool)) check(1, N.key.l, 'l');
      }
    }
    expect(far).toEqual({});
  });

  it('a list is never read outside itself, even on a round before zero', () => {
    for (const r of [-7, -1, 0, 3, 1e6]) {
      expect(Number.isFinite(nbSlot(r)[0] + plateAt(r)[0] + carriageX(wrap(r, 4), aisleOf(r)))).toBe(true);
      expect(queueOf(r)).toBeGreaterThan(0);
    }
  });
});
