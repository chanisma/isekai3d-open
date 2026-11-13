import { describe, expect, it } from 'vitest';
import { OIL, xeBeatTimes, xeNow, xeRound, shoulderOf, SPR, type XeMotion } from './workExtraMotion';

const dist = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
/** PIPELINE.md, Tools in the hand: an arm of about 0.5 m; a little over is the shoulder coming along. */
const REACH = 0.56;
const ALL: XeMotion[] = ['xeOil', 'xeMachine', 'xeBeans', 'xePest', 'xeSpray'];
const over = (m: XeMotion, f: (N: ReturnType<typeof xeNow>, t: number) => void) => {
  for (let t = 0; t < xeRound(m); t += 0.05) f(xeNow(m, t), t);
};

describe('정비소·카페·식물원·농장: work with its own beats', () => {
  it.each(ALL)('%s: finite, and the hands within the arm', (m) => {
    let worst = 0;
    let at = '';
    over(m, (N) => {
      for (const v of [...N.key.l, ...N.key.r, N.at.x, N.at.z, N.at.yaw]) expect(Number.isFinite(v), `${m} ${N.beat}`).toBe(true);
      // On the move between places the hands are only on their way.
      if (N.walking) return;
      const d = Math.max(dist(N.key.l, shoulderOf(N.at, 1, N.key)), dist(N.key.r, shoulderOf(N.at, -1, N.key)));
      if (d > worst) [worst, at] = [d, N.beat];
    });
    expect(worst, `${m} at ${at}`).toBeLessThan(REACH);
  });

  it('the rounds are of a length a player can watch', () => {
    for (const m of ALL) {
      expect(xeRound(m)).toBeGreaterThan(15);
      expect(xeRound(m)).toBeLessThan(80);
    }
  });

  it('오일: drained up on the lift into the pan, filled on the ground, in that order', () => {
    const at = Object.fromEntries(xeBeatTimes('xeOil'));
    const order = ['raise', 'roll', 'loosen', 'pull', 'drain', 'filterOff', 'filterOn', 'plugIn', 'tighten', 'lower', 'bonnet', 'capOff', 'setFunnel', 'pour', 'capOn', 'dipOut', 'wipe', 'dipIn', 'dipRead', 'note', 'shut'];
    for (let i = 1; i < order.length; i++) expect(at[order[i]], order[i]).toBeGreaterThan(at[order[i - 1]]);
    over('xeOil', (N) => {
      if (N.n.oil > 0.02) {
        expect(N.n.lift, N.beat).toBe(1);
        expect(N.p.pan, N.beat).toEqual(OIL.panIn);
        expect(N.n.plugOut, N.beat).toBe(1);
      }
      if (N.n.pour > 0.02) {
        expect(N.n.lift, N.beat).toBe(0);
        expect(N.n.capOff, N.beat).toBe(1);
        expect(N.p.funnel, N.beat).toEqual(OIL.funnel);
      }
      if (N.n.bonnet > 0) expect(N.n.lift, N.beat).toBe(0);
    });
  });

  it('머신: the pump runs only with the blind filter locked in, and water through the head only without it', () => {
    let flushes = 0;
    let was = 0;
    over('xeMachine', (N) => {
      if (N.n.flush > 0.5) {
        expect(N.n.blind, N.beat).toBe(1);
        if (was <= 0.5) flushes++;
      }
      was = N.n.flush;
      if (N.n.rinse > 0.02) expect(N.n.blind, N.beat).toBe(0);
    });
    expect(flushes).toBe(5);
    const at = Object.fromEntries(xeBeatTimes('xeMachine'));
    expect(at.flush).toBeLessThan(at.brush);
    expect(at.brush).toBeLessThan(at.purge);
    expect(at.purge).toBeLessThan(at.trayOut);
  });

  it('발주: counted before it is typed, and sent only once typed', () => {
    const at = Object.fromEntries(xeBeatTimes('xeBeans'));
    expect(at.bags).toBeLessThan(at.cartons);
    expect(at.cartons).toBeLessThan(at.type);
    expect(at.type).toBeLessThan(at.send);
    over('xeBeans', (N) => {
      if (N.beat !== 'put') expect(N.tool, N.beat).toBe('tablet');
    });
  });

  it('병충해: looked at first, gloves on before the sprayer, and it mists only in the hand', () => {
    const at = Object.fromEntries(xeBeatTimes('xePest'));
    expect(at.leaf0).toBeLessThan(at.pick0);
    expect(at.pick2).toBeLessThan(at.gloves);
    expect(at.gloves).toBeLessThan(at.pump);
    over('xePest', (N) => {
      if (N.n.mist > 0.02) {
        expect(N.n.gloves, N.beat).toBe(1);
        expect(N.tool, N.beat).toBe('sprayer');
      }
    });
    expect(xeNow('xePest', at.note + 1).n.bugs).toBe(3);
  });

  it('방제: mask, gloves and pack on before any spray, walked with the wind at the back', () => {
    over('xeSpray', (N) => {
      if (N.n.spray > 0.999) {
        expect(N.n.mask, N.beat).toBe(1);
        expect(N.n.gloves, N.beat).toBe(1);
        expect(N.n.pack, N.beat).toBe(1);
        // The ribbon streams to -x: the walk is that way too.
        expect(Math.sin(N.at.yaw)).toBeLessThan(-0.99);
        expect(N.at.x).toBeLessThanOrEqual(SPR.rowStart + 1e-6);
      }
    });
    // It really walks the row.
    const xs: number[] = [];
    over('xeSpray', (N) => {
      if (N.n.spray > 0.5) xs.push(N.at.x);
    });
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(1.5);
    let walked = 0;
    over('xeSpray', (N) => {
      if (N.walking && N.n.spray > 0.5) walked++;
    });
    expect(walked).toBeGreaterThan(60);
  });
});
