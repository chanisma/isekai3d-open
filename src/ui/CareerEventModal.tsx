import { useState } from 'react';
import type { Game } from '../game/game';

/**
 * Something that came up at work, waiting for an answer (참고 게임 career chance card). Only the answers:
 * what each leans on and how sure it is aren't told (at the user's request) — no answer is the right one.
 * A task card (2026-10-25) asks instead for the player's own thinking on a real piece of the day's
 * work: hints to lead the way, 모르겠어요 if nothing comes, and one example answer to see after, with
 * what the answer did (WorkResultModal, where every answer's result is shown).
 */
export function CareerEventModal({ game }: { game: Game }) {
  const v = game.careerEventView();
  const [own, setOwn] = useState('');
  const [hints, setHints] = useState(0);
  if (!v) return null;
  const task = v.task;
  return (
    <div className="modal-backdrop">
      <div className="modal career-event">
        <h2>
          {v.career.icon} {task ? '오늘의 과제' : '직장에서 생긴 일'}{' '}
          <span className="muted">
            · {v.dweller.name} ({v.career.name})
          </span>
        </h2>
        {v.event.id.startsWith('ai:') && <p className="muted small">✨ {v.event.followUp ? '지난번 선택에서 이어진 이야기예요' : '지금까지의 내 선택을 보고 스페이스기전 AI가 만든 질문이에요'}</p>}
        {v.event.major && <p className="career-event-major">📘 전공 지식 · {v.event.major}</p>}
        <p className="career-event-text">{v.text}</p>
        {task ? (
          <div className="task-card">
            <p className="task-ask">❓ {task.ask}</p>
            {task.hints.slice(0, hints).map((h, i) => (
              <p key={i} className="task-hint">
                💡 {h}
              </p>
            ))}
            {hints < task.hints.length && (
              <button className="ghost small" onClick={() => setHints((n) => n + 1)}>
                힌트 보기 ({hints + 1}/{task.hints.length})
              </button>
            )}
            <textarea value={own} maxLength={300} rows={4} placeholder="내 생각을 자유롭게 써 보세요" onChange={(e) => setOwn(e.target.value)} />
            <small className="muted">쓴 답은 이어지는 질문을 만들 때 AI에게 갈 수 있어요. 실제 이름이나 개인정보는 쓰지 마세요. ({own.length}/300)</small>
            <div className="task-foot">
              <button className="ghost" onClick={() => game.answerCareerTask(null)}>
                모르겠어요
              </button>
              <button className="primary" disabled={own.trim().length < 5} onClick={() => game.answerCareerTask(own)}>
                내 생각 내기
              </button>
            </div>
          </div>
        ) : (
          <div className="career-event-choices">
            {v.choices.map((c, i) => (
              <button key={i} className="offer" onClick={() => game.answerCareerEvent(i)}>
                <b>{c.label}</b>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
