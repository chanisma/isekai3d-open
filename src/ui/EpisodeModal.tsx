import { useState } from 'react';
import { eventText } from '../game/careerEvents';
import { CAREER_BY_ID } from '../game/careers';
import type { Game } from '../game/game';
import { josa } from '../game/util';

/**
 * A scene of a dweller's work episode (game/episodes.ts): the people at work talk, a line at a time,
 * and then the decision — one of two, or what the player writes themselves. Time stops meanwhile.
 */
export function EpisodeModal({ game }: { game: Game }) {
  const ep = game.state.episode;
  const [shown, setShown] = useState(1);
  const [own, setOwn] = useState('');
  const [writing, setWriting] = useState(false);
  if (!ep) return null;
  const dweller = game.dweller(ep.dwellerId);
  const name = dweller?.name ?? '';
  const job = dweller && (ep.slot === 'partTime' ? dweller.partTime : dweller.job);
  const career = job ? CAREER_BY_ID[job.careerId] : undefined;
  const who = (key: string) => (key === 'me' ? name : key === 'narration' ? '' : ep.outline.cast.find((c) => c.key === key)?.name ?? '');
  const role = (key: string) => ep.outline.cast.find((c) => c.key === key)?.role ?? '';
  const lines = ep.scene.lines;
  const done = shown >= lines.length;
  const say = (t: string) => eventText(t, name);
  return (
    <div className="modal-backdrop">
      <div className="modal episode" role="dialog" aria-label="직장 이야기">
        <div className="ep-head">
          <span className="ep-season">
            {career?.icon} {ep.outline.title} <small>· {ep.idx + 1}화</small>
          </span>
          <h2>{ep.scene.title}</h2>
          <small className="muted">{ep.scene.place}</small>
        </div>
        <div className="ep-lines" aria-live="polite">
          {lines.slice(0, shown).map((l, i) =>
            l.who === 'narration' ? (
              <p key={i} className="ep-narration">
                {say(l.text)}
              </p>
            ) : (
              <div key={i} className={`ep-line ${l.who === 'me' ? 'me' : ''}`}>
                <span className="ep-who">
                  {who(l.who)}
                  {l.who !== 'me' && role(l.who) && <small> · {role(l.who)}</small>}
                </span>
                <span className="ep-text">{say(l.text)}</span>
              </div>
            ),
          )}
        </div>
        {!done ? (
          <div className="ep-foot">
            <button className="primary" onClick={() => setShown((n) => n + 1)} autoFocus>
              다음 ▶
            </button>
            <button className="ghost small" onClick={() => setShown(lines.length)}>
              끝까지 보기
            </button>
          </div>
        ) : (
          <div className="ep-decide">
            <p className="ep-question">{say(ep.scene.question)}</p>
            {!writing ? (
              <div className="career-event-choices">
                {ep.scene.choices.map((c, i) => (
                  <button key={i} className="offer" onClick={() => game.answerEpisode(i as 0 | 1)}>
                    <b>{say(c.text)}</b>
                  </button>
                ))}
                <button className="offer ep-own" onClick={() => setWriting(true)}>
                  <b>✍️ 직접 정하기</b>
                  <small className="muted">{josa(name, '이/가')} 어떻게 할지 직접 써요</small>
                </button>
              </div>
            ) : (
              <div className="ep-write">
                <textarea value={own} maxLength={200} rows={3} autoFocus placeholder={`${josa(name, '은/는')} …`} onChange={(e) => setOwn(e.target.value)} />
                <small className="muted">직접 쓴 내용은 AI가 다음 장면을 쓰는 데 쓰여요. 실제 이름이나 개인정보는 쓰지 마세요. ({own.length}/200)</small>
                <div className="ep-foot">
                  <button className="ghost" onClick={() => setWriting(false)}>
                    보기에서 고르기
                  </button>
                  <button className="primary" disabled={!own.trim()} onClick={() => game.answerEpisode(null, own)}>
                    이렇게 할래요
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
