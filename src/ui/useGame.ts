import { useSyncExternalStore } from 'react';
import type { Game } from '../game/game';

/** Re-renders the calling component whenever the game emits (≈10×/s while running). */
export function useGame(game: Game): number {
  return useSyncExternalStore(game.subscribe, game.getVersion);
}
