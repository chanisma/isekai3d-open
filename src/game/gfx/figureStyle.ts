/**
 * Which way dwellers are drawn: the hand-drawn 2D figure (the default) or the 3D dweller built from shapes
 * (docs/ref-game/13-dweller3d.md). Remembered in this browser only.
 */
export type FigureStyle = '2d' | '3d';

const KEY = 'isekai3d.figure';
const listeners = new Set<() => void>();
let current: FigureStyle = (() => {
  try {
    return localStorage.getItem(KEY) === '3d' ? '3d' : '2d';
  } catch {
    return '2d';
  }
})();

export const figureStyle = (): FigureStyle => current;

export function setFigureStyle(style: FigureStyle) {
  current = style;
  try {
    localStorage.setItem(KEY, style);
  } catch {
    // Storage may be off (private window); the choice just won't be remembered.
  }
  for (const f of listeners) f();
}

export function onFigureStyle(f: () => void) {
  listeners.add(f);
  return () => void listeners.delete(f);
}
