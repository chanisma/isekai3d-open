import { useEffect, useState } from 'react';
import type { Game, Toast } from '../game/game';

const LIFETIME = 6000;
/** How long a screen slam stays up (real time). */
const SLAM_TIME = 2800;

/** A dweller's little face, for notifications (참고 게임 puts the dweller's portrait on a notification). */
export function TinyFace({ game, dwellerId }: { game: Game; dwellerId: number | undefined }) {
  const s = dwellerId === undefined ? undefined : game.dweller(dwellerId);
  if (!s) return null;
  return (
    <span className="face small" style={{ background: s.skin }} title={s.name}>
      <span className="hair" style={{ background: s.hair }} />
      <span className="shirt" style={{ background: s.shirt }} />
    </span>
  );
}

/** Clicking a notification about a household dweller selects them (참고 게임 primary_icon_response). */
export function selectable(game: Game, t: Toast): boolean {
  const s = t.dwellerId === undefined ? undefined : game.dweller(t.dwellerId);
  return !!s && !s.npc && s.age !== 'baby' && game.household().includes(s);
}

export function Toasts({ game }: { game: Game }) {
  const now = Date.now();
  const visible = game.toasts.filter((t) => now - t.at < LIFETIME).slice(-4);
  return (
    <div className="toasts">
      {visible.map((t) => {
        const pick = selectable(game, t);
        return (
          <div
            key={t.id}
            className={`toast ${t.kind} ${t.look ?? ''} ${pick ? 'pick' : ''}`}
            onClick={pick ? () => game.setActive(t.dwellerId!) : undefined}
            title={pick ? `${game.dweller(t.dwellerId!)?.name} 선택하기` : undefined}
          >
            <TinyFace game={game} dwellerId={t.dwellerId} />
            <span>{t.text}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * A big moment across the middle of the lot for a few seconds, then gone (참고 게임 ScreenSlam: title,
 * text and icon; only for the selected dweller unless it concerns the whole household).
 */
export function ScreenSlam({ game }: { game: Game }) {
  const slam = game.slam;
  // Redraw when it is due to go, even if the game is paused and nothing else redraws.
  const [, tick] = useState(0);
  useEffect(() => {
    if (!slam) return;
    const id = window.setTimeout(() => tick((n) => n + 1), Math.max(0, SLAM_TIME - (Date.now() - slam.at)) + 50);
    return () => window.clearTimeout(id);
  }, [slam]);
  if (!slam || Date.now() - slam.at > SLAM_TIME) return null;
  return (
    <div className="slam" key={slam.id} aria-live="polite">
      <div className="slam-icon">{slam.icon}</div>
      <div className="slam-title">{slam.title}</div>
      <div className="slam-text">{slam.text}</div>
    </div>
  );
}
