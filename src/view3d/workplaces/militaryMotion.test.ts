import { describe, expect, it } from 'vitest';
import { MI_MOTIONS, PARTS, MB, beatsOf, miNow, pieceToRifle, rifleToPiece, roundOf, marchPath, type MiMotion } from './militaryMotion';

const LEFT = new Set(['handset', 'rag']);
/** Carried on the body or between two hands rather than at the end of one arm. */
const TWO = new Set(['rifle', 'ruck', 'binos']);

describe('군 기지 scripts', () => {
  it('every beat of every motion is finite, whichever way the clock runs', () => {
    for (const m of MI_MOTIONS) {
      for (let t = -40; t < 40; t += 0.13) {
        const N = miNow(m as MiMotion, t, 0.3);
        expect(Number.isFinite(N.st.x + N.st.z + N.st.yaw), `${m} at ${t}`).toBe(true);
        for (const v of Object.values(N.n)) expect(Number.isFinite(v), `${m} at ${t}`).toBe(true);
        for (const p of Object.values(N.props)) if (p) expect(Number.isFinite(p[0] + p[1] + p[2]), `${m} at ${t}`).toBe(true);
      }
    }
  });

  it('a tool the script holds always has a place', () => {
    for (const m of MI_MOTIONS) {
      for (let t = 0; t < 80; t += 0.13) {
        const N = miNow(m as MiMotion, t, 0);
        if (N.tool) expect(N.props[N.tool], `${m} ${N.tool} at ${t}`).toBeTruthy();
      }
    }
  });

  it('the hands stay within an arm of the body', () => {
    const far: Record<string, number> = {};
    for (const m of MI_MOTIONS) {
      for (let t = 0; t < 120; t += 0.17) {
        const N = miNow(m as MiMotion, t, 0);
        if (N.b.e > 0) continue;
        const lx = Math.cos(N.st.yaw);
        const lz = -Math.sin(N.st.yaw);
        const fx = Math.sin(N.st.yaw);
        const fz = Math.cos(N.st.yaw);
        const lean = (N.key.lean ?? 0.03) * 0.6;
        const check = (side: number, v: readonly [number, number, number] | null | undefined, tag: string) => {
          if (!v) return;
          const d = Math.hypot(v[0] - (N.st.x + lx * side * 0.18 + fx * lean), v[1] - 1.3, v[2] - (N.st.z + lz * side * 0.18 + fz * lean));
          const k = `${m} ${N.b.from} ${tag}`;
          if (d > 0.62) far[k] = Math.max(far[k] ?? 0, Math.round(d * 100) / 100);
        };
        const toolAt = N.tool ? N.props[N.tool] : null;
        if (N.tool) check(LEFT.has(N.tool) ? 1 : -1, toolAt, N.tool);
        if (!N.tool || LEFT.has(N.tool)) check(-1, N.key.r, 'r');
        if (!N.tool || (!LEFT.has(N.tool) && !TWO.has(N.tool))) check(1, N.key.l, 'l');
      }
    }
    expect(far).toEqual({});
  });

  it('rounds are a sane length: each fits its use, none a blink', () => {
    for (const m of MI_MOTIONS) {
      const T = roundOf(m as MiMotion);
      expect(T, m).toBeGreaterThan(9);
      expect(T, m).toBeLessThan(45);
      expect(beatsOf(m as MiMotion).length, m).toBeGreaterThan(3);
    }
  });

  it('the march goes out through the gate, along the road outside and back to the trestle', () => {
    const path = marchPath();
    const first = path[0];
    const last = path[path.length - 1];
    expect(Math.hypot(last.x - first.x, last.z - first.z)).toBeLessThan(1e-9);
    // At (8, 14) the fence is at z 1.5 and the gate's gap at x 2.27–3.73: only through the gap, and far out along the road.
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1];
      const b = path[i];
      if ((a.z - 1.5) * (b.z - 1.5) < 0) expect(Math.abs(a.x - 3) < 0.6 && Math.abs(b.x - 3) < 0.6).toBe(true);
    }
    // Out on the pavement at the lot's edge, still on the lot (z 3.5 is its edge).
    expect(Math.max(...path.map((p) => p.z))).toBeGreaterThan(2.9);
    expect(Math.max(...path.map((p) => p.z))).toBeLessThan(3.5);
    expect(Math.min(...path.map((p) => p.x))).toBeLessThan(-7);
    // The road stays on the lot (x 0–26 is -9.5–16.5 here).
    expect(Math.min(...path.map((p) => p.x))).toBeGreaterThan(-9.5);
    // Walked at a walk: no leg faster than 1.6 tiles a second.
    for (let i = 1; i < path.length; i++) expect(Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z) / path[i - 1].secs).toBeLessThan(1.6);
  });

  it('a part laid on the mat goes back to where it came from', () => {
    for (const p of PARTS) {
      const there = rifleToPiece(p.home);
      const back = pieceToRifle(there, MB.rifle);
      for (let i = 0; i < 3; i++) expect(back[i]).toBeCloseTo(p.home[i], 6);
    }
  });
});
