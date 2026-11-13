/** A portable, compressed image stored with the dweller and its save slot. */
export interface ShirtPrint {
  image: string;
  side: 'front' | 'back';
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export function printPlacement(value: ShirtPrint) {
  const clamp = (n: number, min: number, max: number, fallback: number) => Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  return {
    x: clamp(value.x, -0.3, 0.3, 0),
    y: clamp(value.y, -0.3, 0.3, 0),
    scale: clamp(value.scale, 0.2, 0.9, 0.6),
    rotation: clamp(value.rotation, -180, 180, 0),
  };
}
