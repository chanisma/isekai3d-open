import type { Game } from '../game/game';

/**
 * A neighbour on the phone (참고 게임 NeighborRelPhoneCall): asking for advice about getting closer to
 * another neighbour, or calling back to say thanks. It doesn't stop the game; left ringing for two
 * hours, it goes unanswered.
 */
export function NeighbourCall({ game }: { game: Game }) {
  const v = game.neighbourCallView();
  if (!v) return null;
  return (
    <div className="phone-card" role="dialog" aria-label={`${v.from.name}의 전화`}>
      <div className="phone-head">
        <span className="face small" style={{ background: v.from.skin }}>
          <span className="hair" style={{ background: v.from.hair }} />
          <span className="shirt" style={{ background: v.from.shirt }} />
        </span>
        <b>📱 {v.from.name}</b>
        <small className="muted">→ {v.dweller.name}</small>
      </div>
      <p>“{v.text}”</p>
      <div className="phone-btns">
        {v.choices.map((c, i) => (
          <button key={c} className={i === 0 ? 'primary small' : 'ghost small'} onClick={() => game.answerNeighbourCall(i)}>
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
