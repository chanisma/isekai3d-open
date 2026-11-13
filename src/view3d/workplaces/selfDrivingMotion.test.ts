import { describe, expect, it } from 'vitest';
import { CAR, LOOP, S0, SD_MOTIONS, SSTOP, TR, carPose, sdNow, type SdMotion } from './selfDrivingMotion';

describe('자율주행차 개발 센터 scripts', () => {
  it('every beat of every motion is finite, whichever way the clock runs', () => {
    for (const m of SD_MOTIONS) {
      for (let t = -60; t < 60; t += 0.17) {
        const N = sdNow(m as SdMotion, t, 0.3);
        expect(Number.isFinite(N.st.x + N.st.y + N.st.z + N.st.yaw), `${m} at ${t}`).toBe(true);
        for (const v of Object.values(N.n)) expect(Number.isFinite(v), `${m} at ${t}`).toBe(true);
        for (const p of Object.values(N.props)) if (p) expect(Number.isFinite(p[0] + p[1] + p[2]), `${m} at ${t}`).toBe(true);
      }
    }
  });

  it('the loop joins up without a jump', () => {
    for (let s = 0; s < LOOP; s += 0.02) {
      const a = carPose(s);
      const b = carPose(s + 0.02);
      expect(Math.hypot(a.x - b.x, a.z - b.z), `at ${s}`).toBeLessThan(0.05);
    }
  });

  it('the car stops short of the crossing, and the dweller in the seat stays with the car', () => {
    expect(carPose(SSTOP).x - CAR.L / 2).toBeGreaterThan(TR.crossX + TR.crossW / 2);
    let saw = false;
    for (let t = 0; t < 60; t += 0.1) {
      const N = sdNow('sdRide', t, 0);
      if (N.b.from !== 'go2' || N.b.e > 0) continue;
      saw = true;
      const c = carPose(N.n.carS);
      expect(Math.hypot(N.st.x - c.x, N.st.z - c.z), `at ${t}`).toBeLessThan(0.7);
      expect(N.st.sit).toBe(true);
    }
    expect(saw).toBe(true);
  });

  it('the emergency stop really halts the car, short of the dummy in the lane', () => {
    let halted: number | null = null;
    for (let t = 0; t < 40; t += 0.05) {
      const N = sdNow('sdEStop', t, 0);
      if (N.b.from === 'halt' && N.b.e === 0) {
        if (halted === null) halted = N.n.carS;
        expect(N.n.carS).toBeCloseTo(halted, 5);
        expect(carPose(N.n.carS).x - CAR.L / 2).toBeGreaterThan(TR.crossX + 0.1);
        expect(N.n.dummy).toBeCloseTo(0.5, 5);
      }
    }
    expect(halted).not.toBeNull();
    expect(carPose(S0).x).toBeGreaterThan(2);
  });
});

describe('자율주행차 개발 센터 reach', () => {
  it('the hands and what they hold stay within an arm of the shoulders', () => {
    const far: string[] = [];
    for (const m of SD_MOTIONS) {
      let worst = 0;
      let what = '';
      for (let t = 0; t < 70; t += 0.11) {
        const N = sdNow(m as SdMotion, t, 0);
        if (N.b.e > 0) continue;
        const sh: [number, number, number] = [N.st.x + Math.sin(N.st.yaw) * 0.12, N.st.y + (N.st.sit ? 0.56 : 1.3), N.st.z + Math.cos(N.st.yaw) * 0.12];
        const reach = (p: readonly [number, number, number] | null | undefined, name: string) => {
          if (!p) return;
          const d = Math.hypot(p[0] - sh[0], p[1] - sh[1], p[2] - sh[2]);
          if (d > worst) {
            worst = d;
            what = `${name}@${N.b.from}`;
          }
        };
        reach(N.key.l, 'l');
        reach(N.key.r, 'r');
        if (N.tool) reach(N.props[N.tool], N.tool);
      }
      if (worst > 0.75) far.push(`${m} ${what} ${worst.toFixed(2)}`);
    }
    expect(far).toEqual([]);
  });
});
