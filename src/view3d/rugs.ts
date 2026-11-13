import { shade, type Builder } from './parts';
import { box, cyl, part, rbox } from './toon';

/**
 * Rugs (2026-11-01, at the user's request), flat on the floor: walked over, and furniture stands on them
 * (`ObjectDef.flat`). Low enough that feet and chair legs don't sink in. Each its own weave.
 */
const Y = 0.009;
const H = 0.012;
const OFF = { outline: false };
const edge = 0.05;
const base = (g: Parameters<Builder>[0], W: number, D: number, c: string) => part(g, rbox(W - edge, H, D - edge, 0.004), c, 0, Y, 0, OFF);

export const RUG_DETAIL: Record<string, Builder> = {
  /** Plain wool with a darker border. */
  rugWool(g, W, D, c) {
    base(g, W, D, shade(c, 0.8));
    part(g, box(W - 0.2, 0.002, D - 0.2), c, 0, Y + 0.007, 0, OFF);
  },
  /** Woven stripes across, and a fringe at both ends. */
  rugStriped(g, W, D, c) {
    base(g, W, D, c);
    const n = 7;
    for (let i = 0; i < n; i++) if (i % 2) part(g, box(W - edge, 0.002, (D - edge) / n), '#f5efe0', 0, Y + 0.007, -D / 2 + edge / 2 + ((i + 0.5) * (D - edge)) / n, OFF);
    for (const sx of [-1, 1]) for (let i = 0; i < 9; i++) part(g, box(0.05, 0.003, 0.012), '#efe6d0', (sx * W) / 2 - sx * 0.005, 0.004, -D / 2 + 0.1 + (i * (D - 0.2)) / 8, OFF);
  },
  /** Round, in rings. */
  rugRound(g, W, D, c) {
    const r = Math.min(W, D) / 2 - edge / 2;
    part(g, cyl(r, r, H, 40), shade(c, 0.75), 0, Y, 0, OFF);
    part(g, cyl(r * 0.78, r * 0.78, 0.002, 40), c, 0, Y + 0.007, 0, OFF);
    part(g, cyl(r * 0.5, r * 0.5, 0.002, 32), '#f5efe0', 0, Y + 0.009, 0, OFF);
    part(g, cyl(r * 0.26, r * 0.26, 0.002, 24), c, 0, Y + 0.011, 0, OFF);
  },
  /** A patterned carpet: a border, corners and a medallion in the middle. */
  rugPersian(g, W, D, c) {
    base(g, W, D, shade(c, 0.55));
    part(g, box(W - 0.16, 0.002, D - 0.16), '#e9d7a8', 0, Y + 0.007, 0, OFF);
    part(g, box(W - 0.26, 0.002, D - 0.26), c, 0, Y + 0.009, 0, OFF);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.22, 0.002, 0.22), '#e9d7a8', sx * (W / 2 - 0.3), Y + 0.011, sz * (D / 2 - 0.3), OFF);
    const m = Math.min(W, D) * 0.3;
    part(g, cyl(m, m, 0.002, 8), '#e9d7a8', 0, Y + 0.011, 0, OFF);
    part(g, cyl(m * 0.65, m * 0.65, 0.002, 8), shade(c, 0.55), 0, Y + 0.013, 0, OFF);
  },
  /** A long runner for a hall, in bands. */
  rugRunner(g, W, D, c) {
    base(g, W, D, c);
    for (const t of [-0.34, -0.2, 0.2, 0.34]) part(g, box(0.05, 0.002, D - edge), shade(c, 0.6), t * W, Y + 0.007, 0, OFF);
  },
  /** A bath mat, soft and short. */
  rugBath(g, W, D, c) {
    part(g, rbox(W * 0.8, 0.02, D * 0.62, 0.008), c, 0, 0.012, 0, OFF);
    for (let i = 0; i < 4; i++) part(g, box(W * 0.68, 0.002, 0.02), shade(c, 0.85), 0, 0.023, -D * 0.2 + (i * D * 0.4) / 3, OFF);
  },
  /** A playmat of coloured squares. */
  rugPlay(g, W, D) {
    base(g, W, D, '#fafafa');
    const colours = ['#ef9a9a', '#90caf9', '#fff59d', '#a5d6a7'];
    const n = 4;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) part(g, box((W - edge) / n - 0.02, 0.002, (D - edge) / n - 0.02), colours[(i + j) % 4], -W / 2 + edge / 2 + ((i + 0.5) * (W - edge)) / n, Y + 0.007, -D / 2 + edge / 2 + ((j + 0.5) * (D - edge)) / n, OFF);
  },
};
