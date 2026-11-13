import { describe, expect, test } from 'vitest';
import { coveredBy, nearestOf, triCentres, triKeys } from './bodyMask';

// Two triangles side by side on the texture: one at the chest (y 1.3), one at the shin (y 0.4).
const pos = [0, 1.3, 0, 0.1, 1.3, 0, 0, 1.4, 0, 0, 0.4, 0, 0.1, 0.4, 0, 0, 0.5, 0];
const uv = [0.1, 0.1, 0.2, 0.1, 0.1, 0.2, 0.6, 0.6, 0.7, 0.6, 0.6, 0.7];
const index = [0, 1, 2, 3, 4, 5];

describe('skin a garment covers', () => {
  test('a triangle the file lacks goes to the piece nearest it; one it has stays', () => {
    const full = { keys: triKeys(uv, index), centres: triCentres(pos, index) };
    const top = [0.03, 1.33, 0.02];
    const pants = [0.03, 0.45, 0.02];
    // The file has the shin's skin (shorts?) but not the chest's.
    const covered = coveredBy(full, new Set([full.keys[1]]), { tops: top, bottoms: pants }, 0, 0.1);
    expect(covered.get('tops')).toEqual([0]);
    expect(covered.get('bottoms')).toBeUndefined();
    // Without the shin either, the trousers cover it; below the ankle nothing (the shoes' file's feet).
    expect(coveredBy(full, new Set(), { tops: top, bottoms: pants }, 0, 0.1).get('bottoms')).toEqual([1]);
    expect(coveredBy(full, new Set(), { tops: top, bottoms: pants }, 0, 1).get('bottoms')).toBeUndefined();
  });

  test('a file standing higher on its heels is matched where it stands', () => {
    const near = nearestOf({ shoes: [0, 0.06, 0], bottoms: [0, 0.3, 0] });
    expect(near(0, 0.02, 0)).toBe('shoes');
    expect(near(0, 0.28, 0)).toBe('bottoms');
    expect(near(5, 5, 5)).toBeNull();
  });
});
