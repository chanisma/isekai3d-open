import { useState } from 'react';
import { createPortal } from 'react-dom';
import { LIFE_EVENT_LABEL } from '../game/aiQuestions';
import type { Game } from '../game/game';

/**
 * A question to think about from the 스페이스기전 AI (aiQuestions.ts): on one of life's big moments in a
 * dweller's life, or on what the player found in the career explorer. Asked of the player, not the dweller:
 * there's no right answer, an option or a sentence or two of their own, or skip it. What they write
 * is theirs and their homeroom teacher's and grade head's to read (docs/ref-game/08-knowledge.md §6),
 * and never goes to the AI.
 */
export function ThoughtDialog({ game, onClose }: { game: Game; onClose: () => void }) {
  const t = game.state.thoughts?.[0];
  const [pick, setPick] = useState<number | null>(null);
  const [words, setWords] = useState('');
  if (!t) return null;
  const dweller = game.dweller(t.dwellerId);
  const done = (option: number | null, note?: string) => {
    game.answerThought(t.id, option, note);
    setPick(null);
    setWords('');
    if (!game.state.thoughts?.length) onClose();
  };
  // Over the whole page, not inside the top bar it's opened from.
  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal thought" role="dialog" aria-label="생각해 볼 질문" onClick={(e) => e.stopPropagation()}>
        <h2>
          💭 생각해 볼 질문{' '}
          <span className="muted">
            · {t.event ? `${dweller?.name ?? '가족'}의 ${LIFE_EVENT_LABEL[t.event]}` : '진로 탐색에서'}
          </span>
        </h2>
        <p className="thought-text">{t.card.text}</p>
        <p className="muted small">정답은 없어요. 마음에 가까운 것을 고르거나, 직접 써도 돼요.</p>
        <div className="thought-options">
          {t.card.options.map((o, i) => (
            <button key={o} className={`chip ${pick === i ? 'on' : ''}`} onClick={() => setPick(pick === i ? null : i)}>
              {o}
            </button>
          ))}
        </div>
        <textarea value={words} maxLength={300} rows={3} placeholder="내 생각을 한두 문장으로 써도 좋아요 (선택)" onChange={(e) => setWords(e.target.value)} aria-label="직접 쓰기" />
        <p className="muted small">✍️ 직접 쓴 글은 AI에게 보내지 않아요.</p>
        <div className="styler-foot">
          <button className="ghost" onClick={() => done(null)}>
            건너뛰기
          </button>
          <button className="primary" disabled={pick === null && !words.trim()} onClick={() => done(pick, words)}>
            답하기
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
