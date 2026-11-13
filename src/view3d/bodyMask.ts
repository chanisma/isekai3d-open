/**
 * Which skin of a full body (a character's `@base`: in underwear, with all of their body) a piece
 * of clothing covers, worked out from the file the piece comes from (docs/3d/03-clothing-workflow.md).
 * VRoid cuts away the body each file's clothes cover; what of the full body that file hasn't got is
 * under its clothes. Triangles are matched by where they sit on the body texture (the centre of their
 * UVs), the same in every VRoid body whatever its shape or the heels it stands in, and each one
 * missing is put down to the piece nearest it (top, bottoms or shoes).
 */

/** A triangle's place on the body texture, to the 1/20000. */
export function uvKey(u: number, v: number): string {
  return `${Math.round(u * 20000)},${Math.round(v * 20000)}`;
}

/** The UV-centre keys of a body's triangles, in order. */
export function triKeys(uv: ArrayLike<number>, index: ArrayLike<number>): string[] {
  const out: string[] = [];
  for (let t = 0; t < index.length; t += 3) {
    const [a, b, c] = [index[t], index[t + 1], index[t + 2]];
    out.push(uvKey((uv[2 * a] + uv[2 * b] + uv[2 * c]) / 3, (uv[2 * a + 1] + uv[2 * b + 1] + uv[2 * c + 1]) / 3));
  }
  return out;
}

/** Triangle centres (x, y, z each). */
export function triCentres(pos: ArrayLike<number>, index: ArrayLike<number>): Float32Array {
  const out = new Float32Array(index.length);
  for (let t = 0; t < index.length; t += 3)
    for (let k = 0; k < 3; k++) out[t + k] = (pos[3 * index[t] + k] + pos[3 * index[t + 1] + k] + pos[3 * index[t + 2] + k]) / 3;
  return out;
}

const CELL = 0.03;
const cellOf = (x: number, y: number, z: number) => `${Math.floor(x / CELL)},${Math.floor(y / CELL)},${Math.floor(z / CELL)}`;

/** The nearest of several point sets to a point, by a grid of 3 cm cells (null if none within ~30 cm). */
export function nearestOf<P extends string>(sets: Partial<Record<P, ArrayLike<number>>>): (x: number, y: number, z: number) => P | null {
  const grid = new Map<string, Array<[P, number, number, number]>>();
  for (const [p, pts] of Object.entries(sets) as Array<[P, ArrayLike<number>]>)
    for (let i = 0; i < pts.length; i += 3) {
      const k = cellOf(pts[i], pts[i + 1], pts[i + 2]);
      let at = grid.get(k);
      if (!at) grid.set(k, (at = []));
      at.push([p, pts[i], pts[i + 1], pts[i + 2]]);
    }
  return (x, y, z) => {
    const [cx, cy, cz] = [Math.floor(x / CELL), Math.floor(y / CELL), Math.floor(z / CELL)];
    for (let r = 1; r <= 10; r++) {
      let best: P | null = null;
      let d2 = Infinity;
      for (let i = -r; i <= r; i++)
        for (let j = -r; j <= r; j++)
          for (let k = -r; k <= r; k++)
            for (const [p, px, py, pz] of grid.get(`${cx + i},${cy + j},${cz + k}`) ?? []) {
              const d = (px - x) ** 2 + (py - y) ** 2 + (pz - z) ** 2;
              if (d < d2) [best, d2] = [p, d];
            }
      // Found within the cells searched: nothing outside them can be nearer than r cells away.
      if (best && Math.sqrt(d2) <= r * CELL) return best;
    }
    return null;
  };
}

/**
 * The full body's triangles (by index) each piece of a file covers: those the file's body hasn't
 * got, above `minY` (the feet below come from the shoes' file), each to the piece nearest it.
 * `lift` is how much higher the file's body stands than the full one (its shoes' heels).
 */
export function coveredBy<P extends string>(
  full: { keys: string[]; centres: Float32Array },
  fileKeys: Set<string>,
  pieces: Partial<Record<P, ArrayLike<number>>>,
  lift: number,
  minY: number,
): Map<P, number[]> {
  const nearest = nearestOf(pieces);
  const out = new Map<P, number[]>();
  full.keys.forEach((key, t) => {
    const [x, y, z] = [full.centres[3 * t], full.centres[3 * t + 1], full.centres[3 * t + 2]];
    if (y < minY || fileKeys.has(key)) return;
    const p = nearest(x, y + lift, z);
    if (!p) return;
    let at = out.get(p);
    if (!at) out.set(p, (at = []));
    at.push(t);
  });
  return out;
}
