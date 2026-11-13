/**
 * The time the lot's scene is at (set by `Lot3D.frame`): stands still in a pause. For what a piece of
 * furniture moves on its own, away from the `t` it's handed (2026-11-01: those ran on the real clock,
 * and went on through a pause).
 */
export const sceneClock = { now: 0, paused: false };
