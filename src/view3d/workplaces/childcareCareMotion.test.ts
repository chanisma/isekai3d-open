import { describe, expect, it } from 'vitest';
import { CARE_MOTIONS, CLEAN_ROUND, DIAPER_ORDER, DIAPER_ROUND, LUNCH_ROUND, PREP_ROUND, careBeatTimes, careNowDiaper, careNowLunch, shoulderOf, type CareMotion, type P } from './childcareCareMotion';
import { REST, WELCOME, kgBeat, kgLocal, welcomeNow } from './kindergartenTeacherMotion';

const dist = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
/** PIPELINE.md, Tools in the hand: an arm of about 0.5 m; a little over is the shoulder coming along. */
const REACH = 0.56;
const nowOf = (m: CareMotion, t: number, ph: number) => (m === 'ccDiaper' || m === 'ccTableClean' ? careNowDiaper(m, t, ph) : careNowLunch(m, t, ph));

describe('care work with its own beats', () => {
  it('every moment is finite and the hands are within the arm', () => {
    const worst: Record<string, [number, string]> = {};
    for (const m of CARE_MOTIONS as Set<CareMotion>) {
      for (let t = 0; t < 130; t += 0.07) {
        const N = nowOf(m, t, 0.2);
        for (const v of [...N.key.l, ...N.key.r, N.at.x, N.at.z]) expect(Number.isFinite(v), `${m} ${N.beat}`).toBe(true);
        const d = Math.max(dist(N.key.l, shoulderOf(N.at, 1, N.key)), dist(N.key.r, shoulderOf(N.at, -1, N.key)));
        if (d > (worst[m]?.[0] ?? 0)) worst[m] = [d, N.beat];
      }
    }
    for (const [m, [d, beat]] of Object.entries(worst)) expect(d, `${m} at ${beat}`).toBeLessThan(REACH);
  });

  it('the rounds are of a length a player can watch', () => {
    for (const r of [DIAPER_ROUND, CLEAN_ROUND, LUNCH_ROUND, PREP_ROUND]) {
      expect(r).toBeGreaterThan(8);
      expect(r).toBeLessThan(60);
    }
  });

  it('a nappy change goes in order: hands, gloves, up, towel, old out, gloves off, new on, down, surface, hands', () => {
    const at = Object.fromEntries(careBeatTimes('ccDiaper'));
    const order = ['wash', 'gloves', 'lift', 'towel', 'old', 'bin', 'gloveOff', 'fresh', 'fasten', 'smooth', 'fold', 'down', 'spray', 'wipe', 'wash2', 'note'];
    for (let i = 1; i < order.length; i++) expect(at[order[i]], order[i]).toBeGreaterThan(at[order[i - 1]]);
    expect(new Set(DIAPER_ORDER).size).toBe(DIAPER_ORDER.length);
  });

  it('the towel is fully over the child through all the work, and any nappy is seen only then', () => {
    const during = new Set(['talk', 'old', 'bin', 'gloveOff', 'fresh', 'fasten', 'smooth']);
    for (let t = 0; t < DIAPER_ROUND * 2; t += 0.03) {
      const N = careNowDiaper('ccDiaper', t, 0);
      if (during.has(N.beat) && N.beat !== 'talk') expect(N.towel, `${N.beat} at ${t}`).toBeGreaterThan(0.99);
      if (N.tool === 'oldNappy' || N.tool === 'newNappy') expect(N.towel, N.beat).toBeGreaterThan(0.99);
      // On the table during the work, a hand stays with the child.
      if (N.child > 0.99 && during.has(N.beat)) expect(dist(N.key.l, [-0.52, 0.99, -0.14]), N.beat).toBeLessThan(0.1);
    }
    // The table's own cleaning has no child in it.
    for (let t = 0; t < CLEAN_ROUND; t += 0.1) expect(careNowDiaper('ccTableClean', t, 0).withChild).toBe(false);
  });

  it('the teacher walks from the cart to the child and back, and serves in turn', () => {
    const seen = new Set<number>();
    let far = -9;
    for (let t = 0; t < LUNCH_ROUND * 2; t += 0.1) {
      const N = careNowLunch('ccLunch', t, 0);
      seen.add(N.who);
      far = Math.max(far, N.at.x);
    }
    expect([...seen].sort()).toEqual([0, 1]);
    expect(far).toBeCloseTo(-0.36, 1);
  });

  it('유치원: the arrival check and rest are within the arm', () => {
    const stand = WELCOME.stand;
    const shoulder = (side: number, lean: number, crouch: number): P => [stand[0] - side * 0.18, 1.3 - 0.45 * (1 - Math.cos(lean)) - 0.37 * crouch, stand[2] - 0.45 * Math.sin(lean)];
    let worst = 0;
    let beat = '';
    for (let t = 0; t < 40; t += 0.07) {
      const h = kgLocal('kgWelcome', t);
      const d = Math.max(dist(h.l, shoulder(1, h.lean, h.crouch)), dist(h.r, shoulder(-1, h.lean, h.crouch)));
      if (d > worst) [worst, beat] = [d, kgBeat('kgWelcome', t).key];
    }
    expect(worst, beat).toBeLessThan(REACH);
    // Sat on the floor, facing -x: the shoulders about 0.6 m up.
    let rest = 0;
    for (let t = 0; t < 40; t += 0.07) {
      const h = kgLocal('kgRest', t);
      const fwd = 0.45 * Math.sin(h.lean);
      const sh = (s: number) => [REST.seat[0] - fwd, 0.62 - 0.45 * (1 - Math.cos(h.lean)), REST.seat[2] + s * 0.18];
      rest = Math.max(rest, dist(h.l, sh(1)), dist(h.r, sh(-1)));
    }
    expect(rest).toBeLessThan(REACH);
    expect(welcomeNow(5).tool).toBe('gun');
  });
});
