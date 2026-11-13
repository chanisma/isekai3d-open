/**
 * How the people drawn into a workplace are played (the settings' 인물 품질; remembered in this browser
 * only): reduced VRoid bodies (workplaces/vroidFigure.ts) with all that swings, their hair only, or
 * nothing swinging, or the plain drawn figures for a weak PC.
 */
export type FigureQuality = 'high' | 'medium' | 'low' | 'drawn';

export const FIGURE_QUALITIES: Array<{ id: FigureQuality; label: string }> = [
  { id: 'high', label: '높음 (머리·옷 흔들림)' },
  { id: 'medium', label: '보통 (머리만 흔들림)' },
  { id: 'low', label: '낮음 (흔들림 없음)' },
  { id: 'drawn', label: '최저 (단순한 인물)' },
];

const KEY = 'isekai3d.figureQuality';

export function figureQuality(): FigureQuality {
  try {
    const saved = localStorage.getItem(KEY);
    return FIGURE_QUALITIES.find((q) => q.id === saved)?.id ?? 'high';
  } catch {
    return 'high';
  }
}

export function setFigureQuality(q: FigureQuality) {
  try {
    localStorage.setItem(KEY, q);
  } catch {
    // Storage may be off (private window); the choice just won't be remembered.
  }
}
