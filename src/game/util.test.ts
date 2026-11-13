import { describe, expect, it } from 'vitest';
import { josa } from './util';

describe('josa', () => {
  it('picks the particle by the final consonant', () => {
    expect(josa('민준', '이/가')).toBe('민준이');
    expect(josa('서연', '와/과')).toBe('서연과');
    expect(josa('도윤', '을/를')).toBe('도윤을');
    expect(josa('하루', '와/과')).toBe('하루와');
    expect(josa('하루', '은/는')).toBe('하루는');
  });
});
