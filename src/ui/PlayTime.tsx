import { useEffect, useState } from 'react';
import type { Game } from '../game/game';
import type { PlayPass } from '../cloud/playPass';
import '../arcade.css';

/** Game minutes as the player reads them: «게임 속 18시간 20분». */
export function playLeftLabel(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `게임 속 ${r}분`;
  return r ? `게임 속 ${h}시간 ${r}분` : `게임 속 ${h}시간`;
}

/**
 * What a coin buys, for the arcade (2026-10-23: the 스페이스기전 admin sets it — isekai3d.per_coin — so
 * it's no longer always a day): 1440 → «하루», 2880 → «이틀», 720 → «12시간».
 */
export function perCoinLabel(minutes: number): string {
  const m = Math.max(1, Math.round(minutes));
  if (m === 1440) return '하루';
  if (m === 2880) return '이틀';
  if (m % 1440 === 0) return `${m / 1440}일`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}분`;
  return r ? `${h}시간 ${r}분` : `${h}시간`;
}

/** What the next coin costs, for its button. */
export function coinPriceLabel(price: number | null, first: boolean): string {
  if (price === null) return '';
  if (price === 0) return first ? '오늘 첫 동전은 무료' : '무료';
  return `${price}코인`;
}

/** Re-renders when the pass changes (a coin in, the day turning). */
export function usePass(pass: PlayPass | null) {
  const [, bump] = useState(0);
  useEffect(() => pass?.onChange(() => bump((n) => n + 1)), [pass]);
}

/**
 * The top bar's meter of today's play left (the arcade's coins). When it's used up it turns into a
 * button to the arcade, where a coin goes in and the game carries on where it was (App.tsx).
 */
export function PlayMeter({ game, onCoin }: { game: Game; onCoin?: () => void }) {
  if (game.playLeft === null) return null;
  if (game.playLeft <= 0) {
    return (
      <button className="play-meter out" onClick={onCoin} title="오늘의 플레이 시간을 다 썼어요 — 오락기에서 동전을 넣어요">
        <i className="coin-ico" aria-hidden /> <span className="pm-left">동전 넣기</span>
      </button>
    );
  }
  const low = game.playLeft < 180;
  return (
    <div className={`play-meter ${low ? 'low' : ''}`} title="오늘 남은 플레이 시간 — 오락기에 동전을 넣으면 늘어나요">
      <span aria-hidden>⏳</span>
      <span className="pm-left">{playLeftLabel(game.playLeft)}</span>
    </div>
  );
}
