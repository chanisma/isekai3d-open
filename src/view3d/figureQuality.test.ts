import { afterEach, describe, expect, it, vi } from 'vitest';
import { figureQuality, setFigureQuality } from './figureQuality';

describe('figure quality', () => {
  afterEach(() => vi.unstubAllGlobals());
  const store = (saved: Record<string, string> = {}) =>
    vi.stubGlobal('localStorage', { getItem: (k: string) => saved[k] ?? null, setItem: (k: string, v: string) => void (saved[k] = v) });

  it('starts high, and high for anything it does not know', () => {
    store();
    expect(figureQuality()).toBe('high');
    store({ 'isekai3d.figureQuality': 'ultra' });
    expect(figureQuality()).toBe('high');
  });
  it('remembers the choice', () => {
    store();
    setFigureQuality('low');
    expect(figureQuality()).toBe('low');
  });
  it('still answers with storage off', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('off'); }, setItem: () => { throw new Error('off'); } });
    setFigureQuality('drawn');
    expect(figureQuality()).toBe('high');
  });
});
