import type { GarmentItem } from '../view3d/vrmLooks';

/**
 * A garment's kind drawn as a small silhouette in its colour (the clothes shop's cards): the
 * emoji font has no trousers, shorts, skirt or shoes.
 */
const LONG = 'M11 4 L5 7 L3 25 L7.5 25 L9 14 L9 28 L23 28 L23 14 L24.5 25 L29 25 L27 7 L21 4 Z';
const PANTS = 'M9 4 L23 4 L25 29 L18 29 L16 13 L14 29 L7 29 Z';
const SHAPES: Record<GarmentItem['kind'], { fill: string[]; line?: string }> = {
  tee: { fill: ['M11 4 L4 8 L6 14 L9 13 L9 28 L23 28 L23 13 L26 14 L28 8 L21 4 Q16 8 11 4 Z'] },
  shirt: { fill: [LONG], line: 'M11 4 L16 10 L21 4 M16 10 L16 28' },
  sweater: { fill: [LONG], line: 'M12 4 Q16 8 20 4 M9 25 L23 25' },
  hoodie: { fill: [LONG, 'M11 4 Q16 -1 21 4 Q16 8 11 4 Z'], line: 'M12 19 L20 19 L20 24 L12 24 Z' },
  jacket: { fill: [LONG], line: 'M11 4 L16 13 L21 4 M16 13 L16 28' },
  uniform: { fill: [LONG], line: 'M11 4 L16 9 L21 4 M16 9 L15 17 L16 19 L17 17 Z' },
  overalls: { fill: ['M9 12 L23 12 L25 29 L18 29 L16 18 L14 29 L7 29 Z', 'M11 4 L21 4 L21 13 L11 13 Z'], line: 'M11 4 L9 1 M21 4 L23 1' },
  dress: { fill: ['M12 3 L20 3 L19 10 L26 28 L6 28 L13 10 Z'], line: 'M13 10 L19 10' },
  pants: { fill: [PANTS], line: 'M9 7 L23 7' },
  shorts: { fill: ['M9 6 L23 6 L25 20 L18 21 L16 13 L14 21 L7 20 Z'], line: 'M9 9 L23 9' },
  skirt: { fill: ['M10 7 L22 7 L27 25 L5 25 Z'], line: 'M10 10 L22 10' },
  shoes: { fill: ['M4 18 L4 24 L28 24 L28 21 Q27 18 21 17 L15 12 L10 12 L10 17 Z'], line: 'M4 22 L28 22' },
};

export function GarmentIcon({ kind, color, size = 34 }: { kind: GarmentItem['kind']; color: string; size?: number }) {
  const s = SHAPES[kind];
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden className="garment-icon">
      {s.fill.map((d) => (
        <path key={d} d={d} fill={color} stroke="rgba(0,0,0,0.35)" strokeWidth="1" strokeLinejoin="round" />
      ))}
      {s.line && <path d={s.line} fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}
