import { describe, expect, it } from 'vitest';
import { GE_MOTIONS, cellAt, geNow, outputAt, sunAt, windAt, type GeMotion } from './greenEnergyMotion';

/** The site is worked out from the clock and the dweller's round from its script: both have to hold together at any time, and the hands have to reach. */
describe('the 태양광·풍력 발전 단지', () => {
  it('the sun, the wind and the output stay in range, the clock going either way', () => {
    for (let t = -400; t < 400; t += 0.37) {
      expect(sunAt(t)).toBeGreaterThanOrEqual(0);
      expect(sunAt(t)).toBeLessThanOrEqual(1);
      expect(windAt(t)).toBeGreaterThanOrEqual(0);
      expect(windAt(t)).toBeLessThanOrEqual(1);
      const o = outputAt(t);
      expect(o.total).toBeGreaterThanOrEqual(0);
      expect(o.total).toBeLessThan(7.5);
    }
  });
  it('a rack index wraps, whatever it is given', () => {
    for (const r of [-5, -1, 0, 3, 4, 9]) expect(Number.isFinite(cellAt(r, 2)[0])).toBe(true);
  });
  it('the tools worked on the deck are within the arm a body really has', () => {
    // A crouch drops the shoulders about half the legs (avatar.ts squat); an arm is about 0.5 m, a little more leaning in.
    const far = new Set<string>();
    for (const m of ['geTorque', 'geOil', 'geYaw', 'geWash'] as GeMotion[]) {
      for (let t = 0; t < 40; t += 0.11) {
        const N = geNow(m, t, 0.3, 1.6);
        if (N.walking || N.b.e > 0 || !N.tool || N.tool === 'tablet') continue;
        const tool = N.props[N.tool];
        if (!tool) continue;
        const lx = Math.cos(N.st.yaw);
        const lz = -Math.sin(N.st.yaw);
        const sy = N.st.y + 1.32 - (N.key.crouch ?? 0) * 0.37;
        const d = Math.hypot(tool[0] - (N.st.x - lx * 0.2), tool[1] - sy, tool[2] - (N.st.z - lz * 0.2));
        if (d > 0.58) far.add(`${m} ${N.b.from} ${N.tool} ${d.toFixed(2)}`);
      }
    }
    expect([...far]).toEqual([]);
  });
  it('every script runs at any time, with hands within an arm of the body', () => {
    const far: string[] = [];
    for (const m of GE_MOTIONS) {
      for (let t = -20; t < 70; t += 0.19) {
        const N = geNow(m as GeMotion, t, 0.3, 1.6);
        expect(Number.isFinite(N.st.x + N.st.y + N.st.z + N.st.yaw)).toBe(true);
        for (const v of Object.values(N.n)) expect(Number.isFinite(v)).toBe(true);
        if (N.walking || N.b.e > 0) continue;
        const k = N.key;
        const lift = (k.crouch ?? 0) * 0.55;
        const shoulderY = N.st.sit ? N.st.y + 0.55 : N.st.y + 1.32 - lift;
        const lx = Math.cos(N.st.yaw);
        const lz = -Math.sin(N.st.yaw);
        for (const [hand, side, name] of [[k.l, 0.2, 'l'], [k.r, -0.2, 'r']] as const) {
          if (!hand) continue;
          const d = Math.hypot(hand[0] - (N.st.x + lx * side), hand[1] - shoulderY, hand[2] - (N.st.z + lz * side));
          if (d > 0.86 + (k.crouch ?? 0) * 0.1) far.push(`${m} ${N.b.from} ${name} ${d.toFixed(2)}`);
        }
        const tool = N.tool ? N.props[N.tool] : null;
        if (tool && N.tool !== 'tablet') {
          const d = Math.hypot(tool[0] - (N.st.x - lx * 0.2), tool[1] - shoulderY, tool[2] - (N.st.z - lz * 0.2));
          if (d > 0.86 + (k.crouch ?? 0) * 0.1) far.push(`${m} ${N.b.from} tool ${d.toFixed(2)}`);
        }
      }
    }
    const worst = new Map<string, number>();
    for (const s of far) { const w = s.split(' '); const k = w.slice(0, -1).join(' '); worst.set(k, Math.max(worst.get(k) ?? 0, Number(w[w.length - 1]))); }
    expect([...worst].map(([k, d]) => `${k} ${d}`)).toEqual([]);
  });
});
