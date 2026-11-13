import { describe, expect, it } from 'vitest';
import * as FS from './firefighterMotion';
import * as PO from './policeMotion';

const dist = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
/** PIPELINE.md, Tools in the hand: an arm of about 0.5 m; a little over is the shoulder coming along. */
const REACH = 0.56;

describe('경찰서·소방서: work with its own beats', () => {
  const po = ['poLost', 'poSort', 'poPrint', 'poEnrol'] as PO.PoMotion[];
  const fs = ['fsInspect', 'fsClass', 'fsHydrant'] as FS.FsMotion[];

  it.each(po)('%s: finite, and the hands within the arm', (m) => {
    let worst = 0;
    let at = '';
    for (let t = 0; t < 70; t += 0.05) {
      const N = PO.poNow(m, t, 0.2);
      for (const v of [...N.key.l, ...N.key.r]) expect(Number.isFinite(v), `${m} ${N.beat}`).toBe(true);
      const d = Math.max(dist(N.key.l, PO.shoulderOf(N.at, 1, N.key)), dist(N.key.r, PO.shoulderOf(N.at, -1, N.key)));
      if (d > worst) [worst, at] = [d, N.beat];
    }
    expect(worst, `${m} at ${at}`).toBeLessThan(REACH);
  });

  it.each(fs)('%s: finite, and the hands within the arm', (m) => {
    let worst = 0;
    let at = '';
    for (let t = 0; t < 70; t += 0.05) {
      const N = FS.fsNow(m, t, 0.2);
      for (const v of [...N.key.l, ...N.key.r]) expect(Number.isFinite(v), `${m} ${N.beat}`).toBe(true);
      const d = Math.max(dist(N.key.l, FS.shoulderOf(N.at, 1, N.key)), dist(N.key.r, FS.shoulderOf(N.at, -1, N.key)));
      if (d > worst) [worst, at] = [d, N.beat];
    }
    expect(worst, `${m} at ${at}`).toBeLessThan(REACH);
  });

  it('the rounds are of a length a player can watch', () => {
    for (const r of [PO.LOST_ROUND, PO.SORT_ROUND, PO.PRINT_ROUND, PO.ENROL_ROUND, FS.INSPECT_ROUND, FS.CLASS_ROUND, FS.HYDRANT_ROUND]) {
      expect(r).toBeGreaterThan(8);
      expect(r).toBeLessThan(60);
    }
  });

  it('분실물: looked at, tag written, tied, entered, receipt, shelved, in that order', () => {
    const at = Object.fromEntries(PO.poBeatTimes('poLost'));
    const order = ['take', 'look', 'write', 'tie', 'ledger', 'slip', 'carry', 'shelve'];
    for (let i = 1; i < order.length; i++) expect(at[order[i]], order[i]).toBeGreaterThan(at[order[i - 1]]);
    // The tag's on before the bag leaves for the shelf, and the bag ends on the shelf.
    for (let t = 0; t < PO.LOST_ROUND; t += 0.05) {
      const N = PO.poNow('poLost', t, 0);
      if (N.beat === 'carry' || N.beat === 'shelve') expect(N.tied, N.beat).toBe(true);
      if (N.beat === 'check') expect(N.bagAt).toEqual(PO.BAG_SLOT);
    }
  });

  it('지문: marks only rise, and a result is only noted once they are made', () => {
    let was = 0;
    for (let t = 0; t < PO.PRINT_ROUND - 0.1; t += 0.05) {
      const N = PO.poNow('poPrint', t, 0);
      if (N.beat === 'take') was = 0;
      expect(N.marks, N.beat).toBeGreaterThanOrEqual(was);
      was = N.marks;
      if (N.form > 0) expect(N.marks).toBe(8);
    }
    expect(was).toBe(8);
  });

  it('점검: the pin never comes out of the extinguisher under inspection', () => {
    const E = FS.BOARD.ext;
    for (let t = 0; t < FS.INSPECT_ROUND; t += 0.05) {
      const N = FS.fsNow('fsInspect', t, 0);
      if (N.beat === 'pin') expect(dist(N.key.r, E.pin), 'the hand stays by the pin').toBeLessThan(0.14);
      expect(N.pinIn).toBe(1);
    }
    expect(FS.fsNow('fsInspect', FS.INSPECT_ROUND - 0.1, 0).ticks).toBe(3);
  });

  it('PASS goes pin, aim, squeeze, sweep, and sprays only with the pin out', () => {
    const at = Object.fromEntries(FS.fsBeatTimes('fsClass'));
    expect(at.pull).toBeLessThan(at.aim);
    expect(at.aim).toBeLessThan(at.squeeze);
    expect(at.squeeze).toBeLessThan(at.sweep);
    for (let t = 0; t < FS.CLASS_ROUND; t += 0.05) {
      const N = FS.fsNow('fsClass', t, 0);
      if (N.spray) {
        expect(N.pinOut, N.beat).toBe(true);
        expect(N.at).toEqual(FS.DEMO_AT);
      }
    }
  });
});
