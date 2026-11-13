import { describe, expect, it } from 'vitest';
import { BUYABLE, BUY_FNS, BUY_ROOMS, OBJECT_BUY, objectSummary } from './buyCategories';

describe('buy catalog by room and by function (after 참고 게임 buy mode)', () => {
  it('puts every thing for sale in a function and at least one room', () => {
    for (const d of BUYABLE) {
      const e = OBJECT_BUY[d.id];
      expect(e, d.id).toBeTruthy();
      expect(BUY_FNS[e.fn], d.id).toBeTruthy();
      expect(e.rooms.length, d.id).toBeGreaterThan(0);
      for (const r of e.rooms) expect(BUY_ROOMS[r], `${d.id} ${r}`).toBeTruthy();
    }
  });

  it('leaves no room or function empty', () => {
    for (const r of Object.keys(BUY_ROOMS)) expect(BUYABLE.some((d) => OBJECT_BUY[d.id]?.rooms.includes(r as never)), r).toBe(true);
    for (const f of Object.keys(BUY_FNS)) expect(BUYABLE.some((d) => OBJECT_BUY[d.id]?.fn === f), f).toBe(true);
  });

  it('says what a thing does: the needs it fills and the skills it trains', () => {
    const bed = objectSummary(BUYABLE.find((d) => d.id === 'bed')!);
    expect(bed.needs).toContain('energy');
    const easel = objectSummary(BUYABLE.find((d) => d.id === 'easel')!);
    expect(easel.skills).toContain('painting');
  });
});
