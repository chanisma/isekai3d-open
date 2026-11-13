import { CAREER_BY_ID } from '../game/careers';
import type { Game } from '../game/game';
import { formatClock } from '../game/util';

export function ActionQueue({ game }: { game: Game }) {
  const dweller = game.activeDweller;
  if (dweller.away) {
    const job = dweller.job && CAREER_BY_ID[dweller.job.careerId];
    return (
      <div className="queue">
        <div className="queue-item current away">
          <span className="q-icon">🏢</span>
          <span>
            {job ? `${job.name} 출근 중` : '외출 중'} · {formatClock(dweller.away.until % 1440)} 퇴근
          </span>
        </div>
      </div>
    );
  }
  if (dweller.queue.length === 0) return null;
  return (
    <div className="queue">
      {dweller.queue.map((a, i) => {
        const { label, icon } = game.actionLabel(a);
        const progress = i === 0 ? game.actionProgress(dweller) : 0;
        return (
          <button
            key={a.id}
            className={`queue-item ${i === 0 ? 'current' : ''} ${a.autonomous ? 'auto' : ''}`}
            title="클릭해서 취소"
            onClick={() => game.cancel(dweller.id, a.id)}
          >
            <span className="q-icon">{icon}</span>
            <span className="q-label">{label}</span>
            {a.autonomous && <span className="q-tag">자율</span>}
            <span className="q-x">✕</span>
            {i === 0 && <span className="q-progress" style={{ width: `${Math.min(1, progress) * 100}%` }} />}
          </button>
        );
      })}
    </div>
  );
}
