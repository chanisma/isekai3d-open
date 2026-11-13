import { useEffect, useLayoutEffect, useState } from 'react';
import type { Game } from '../game/game';
import { TIPS, currentTip, tipNumber, type TipCtx } from '../game/tips';

const present = (selector: string) => !!document.querySelector(selector);

/**
 * The guide for a first game (tips.ts, after 참고 게임's tutorial tips): a ring around the part of the
 * screen the tip is about (참고 게임 CIRCLE_OVER_INDICATOR) and a card beside it with what it is, what to
 * try, "다음" and "안내 끄기". It never blocks the game.
 */
export function Guide({ game, tab, mode }: { game: Game; tab: string; mode: 'live' | 'buy' }) {
  const tips = game.state.tips;
  const ctx: TipCtx = { game, tab, mode, present };
  const tip = tips?.on ? currentTip(tips.done, ctx) : null;
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Done by doing it (참고 게임 gameplay_test).
  const satisfied = !!tip?.done?.(ctx);
  useEffect(() => {
    if (tip && satisfied) game.tipDone(tip.id);
  }, [game, tip, satisfied]);

  // Where the part of the screen is, measured after it is drawn and again when the window changes.
  useLayoutEffect(() => {
    const el = tip?.target ? document.querySelector(tip.target) : null;
    const r = el?.getBoundingClientRect() ?? null;
    setRect((old) => (old && r && old.x === r.x && old.y === r.y && old.width === r.width && old.height === r.height ? old : r));
  });
  useEffect(() => {
    const onResize = () => setRect(null);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (!tip) return null;
  const W = 300;
  let style: React.CSSProperties = { left: '50%', top: '40%', transform: 'translate(-50%, -50%)', width: 360 };
  if (tip.target && rect) {
    const below = rect.bottom + 12 + 190 < window.innerHeight;
    const right = rect.right + 12 + W < window.innerWidth;
    // Beside a tall thing (the lot), below or above a flat one.
    if (rect.height > window.innerHeight / 2 && right) style = { left: rect.right + 12, top: Math.max(12, rect.top + 40), width: W };
    // No room beside it: low on the left, over the panel's lower half, keeping the lot clear.
    else if (rect.height > window.innerHeight / 2) style = { left: 12, bottom: 24, width: W };
    else style = { left: Math.min(window.innerWidth - W - 12, Math.max(12, rect.left)), top: below ? rect.bottom + 12 : Math.max(12, rect.top - 12 - 190), width: W };
  }
  const n = tipNumber(tip.id);
  return (
    <>
      {tip.target && rect && <div className="guide-ring" style={{ left: rect.left - 4, top: rect.top - 4, width: rect.width + 8, height: rect.height + 8 }} />}
      <div className={`guide-card ${tip.target ? '' : 'center'}`} style={style} role="dialog" aria-label={tip.title}>
        <div className="guide-head">
          <b>💡 {tip.title}</b>
          <small className="muted">
            {n}/{TIPS.length}
          </small>
        </div>
        <p>{tip.text}</p>
        {tip.action && <p className="guide-action">👉 {tip.action}</p>}
        <div className="guide-btns">
          <button className="ghost small" onClick={() => game.setGuide(false)}>
            안내 끄기
          </button>
          <button className="primary small" onClick={() => game.tipDone(tip.id)}>
            {tip.action ? '건너뛰기 ›' : n === TIPS.length ? '시작하기' : '다음 ›'}
          </button>
        </div>
      </div>
    </>
  );
}
