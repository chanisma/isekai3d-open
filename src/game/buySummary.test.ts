import { describe, expect, it } from 'vitest';
import { objectSummary } from './buyCategories';
import { CATALOG_BY_ID, CATALOG } from './catalog';

describe('what a piece for sale says it trains', () => {
  it('leaves out handiness from repairing and upgrading', () => {
    const fixable = CATALOG.find((d) => d.interactions.some((i) => i.id === 'repair') && d.interactions.every((i) => i.id === 'repair' || i.id.startsWith('upgrade_') || i.skill?.key !== 'handiness'));
    expect(fixable).toBeDefined();
    expect(objectSummary(fixable!).skills).not.toContain('handiness');
  });
  it('keeps it on what is really for it', () => {
    const work = CATALOG.filter((d) => d.interactions.some((i) => i.skill?.key === 'handiness' && i.id !== 'repair' && !i.id.startsWith('upgrade_')));
    expect(work.length).toBeGreaterThan(0);
    for (const d of work) expect(objectSummary(CATALOG_BY_ID[d.id]).skills).toContain('handiness');
  });
});
