import { describe, expect, it } from 'vitest';
import { AC, QC, RL_MOTIONS, armPose, quadGround, quadPose, rlNow, type RlMotion } from './roboticistMotion';

/** The robots are worked out from where they've got to, so they have to hold together wherever that is, and the dweller's hands have to reach. */
describe('the robots at the 로봇 연구소', () => {
  it('the arm can reach every point of its round', () => {
    for (let c = -3; c < 8; c += 0.013) {
      const { tip } = armPose(c);
      const r = Math.hypot(tip[0] - AC.base[0], tip[2] - AC.base[2]);
      const h = tip[1] + AC.wrist - AC.base[1] - AC.shoulder;
      expect(Math.hypot(r, h)).toBeLessThan(AC.l1 + AC.l2);
    }
  });
  it('the four-legged robot keeps every foot on the ground under it while walking', () => {
    for (let c = -2; c < 3; c += 0.0037) {
      const P = quadPose(c, 1, 0);
      expect(Number.isFinite(P.y + P.pitch + P.hip[0] + P.knee[3])).toBe(true);
      for (let i = 0; i < 4; i++) {
        const fb = i < 2 ? 1 : -1;
        const a = P.hip[i];
        const b = a + P.knee[i];
        // Down the leg from the hip, in the body's own plane, then to the world.
        const f = fb * QC.hipF + Math.sin(a) * QC.l1 + Math.sin(b) * QC.l2;
        const u = -Math.cos(a) * QC.l1 - Math.cos(b) * QC.l2;
        const fw = f * Math.cos(P.pitch) - u * Math.sin(P.pitch);
        const uw = f * Math.sin(P.pitch) + u * Math.cos(P.pitch);
        const footX = P.x + Math.cos(P.yaw) * fw;
        const above = P.y + uw - quadGround(footX);
        expect(above).toBeGreaterThan(-0.09);
        expect(above).toBeLessThan(0.11);
      }
    }
  });
  it('every script runs at any time, with hands within an arm of the body', () => {
    const far: string[] = [];
    for (const m of RL_MOTIONS) {
      for (let t = -20; t < 60; t += 0.23) {
        const N = rlNow(m as RlMotion, t, 0.3, 1.6);
        expect(Number.isFinite(N.st.x + N.st.z + N.st.yaw)).toBe(true);
        for (const v of Object.values(N.n)) expect(Number.isFinite(v)).toBe(true);
        if (N.walking || N.b.e > 0) continue;
        const k = N.key;
        const lift = (k.crouch ?? 0) * 0.55;
        const shoulderY = N.st.sit ? N.st.y + 0.55 : 1.32 - lift;
        const lx = Math.cos(N.st.yaw);
        const lz = -Math.sin(N.st.yaw);
        for (const [hand, side] of [[k.l, 0.2], [k.r, -0.2]] as const) {
          if (!hand) continue;
          const d = Math.hypot(hand[0] - (N.st.x + lx * side), hand[1] - shoulderY, hand[2] - (N.st.z + lz * side));
          if (d > 0.86 + (k.crouch ?? 0) * 0.1) far.push(`${m} ${N.b.from} ${d.toFixed(2)}`);
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
