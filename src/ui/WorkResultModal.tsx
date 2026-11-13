import { BUFFS } from '../game/emotions';
import { SKILL_INFO } from '../game/constants';
import type { Game } from '../game/game';
import { josa } from '../game/util';

/**
 * What an answer at work came to (game `workResult`, 2026-10-26, at the user's request): a work card,
 * a 전공 지식 card, a task card or an episode's decision — what was chosen, whether it came off and
 * what happened, then what it changed. Time waits until it's read.
 */
export function WorkResultModal({ game }: { game: Game }) {
  const r = game.state.workResult;
  if (!r) return null;
  const name = game.dweller(r.dwellerId)?.name ?? '';
  const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);
  const buff = r.buff ? BUFFS[r.buff] : undefined;
  const changes: Array<{ text: string; good: boolean }> = [];
  if (r.perf) changes.push({ text: `📈 업무 성과 ${sign(r.perf)}`, good: r.perf > 0 });
  if (r.money) changes.push({ text: `💰 §${sign(r.money)}`, good: r.money > 0 });
  if (r.skill && SKILL_INFO[r.skill.key])
    changes.push({
      text: `${SKILL_INFO[r.skill.key].icon} ${SKILL_INFO[r.skill.key].label} 경험 조금 늘었어요`,
      good: true,
    });
  for (const f of r.friends ?? [])
    if (f.name)
      changes.push({
        text: `🤝 ${josa(f.name, '와/과')} ${f.n > 0 ? '가까워졌어요' : '조금 멀어졌어요'} (${sign(f.n)})`,
        good: f.n > 0,
      });
  if (buff)
    changes.push({
      text: `${buff.icon} 기분: ${buff.label}`,
      good: !['sad', 'angry', 'embarrassed', 'stressed', 'uncomfortable', 'bored'].includes(buff.emotion ?? ''),
    });
  const head =
    r.kind === 'task'
      ? r.chose
        ? '내 생각을 냈어요'
        : '이번엔 넘어갔어요'
      : r.ok === true
        ? '🎉 잘 풀렸어요'
        : r.ok === false
          ? '😣 생각대로 되지 않았어요'
          : r.kind === 'episode'
            ? `${name}의 결정`
            : '이렇게 됐어요';
  const next =
    r.next === 'card' ? '📋 다음 근무 카드가 이 선택에서 이어져요' : r.next === 'scene' ? '🎬 이 결정이 다음 장면으로 이어져요' : r.next === 'final' ? '🎬 이번 시즌이 이 결정으로 끝났어요' : '';
  return (
    <div className="modal-backdrop">
      <div className="modal career-event work-result" role="dialog" aria-label="선택의 결과">
        <h2>
          {r.title} <span className="muted">· {name}</span>
        </h2>
        {r.major && <p className="career-event-major">📘 전공 지식 · {r.major}</p>}
        <p className={`wr-head ${r.ok === false ? 'bad' : r.ok === true ? 'good' : ''}`}>{head}</p>
        {r.chose ? (
          <p className="task-mine">
            {r.kind === 'task' ? '✍️' : '👉'} {r.chose}
          </p>
        ) : (
          r.kind === 'task' && <p className="muted">괜찮아요. 이런 생각도 할 수 있어요.</p>
        )}
        {r.text && <p className="career-event-text">{r.text}</p>}
        {r.example && <p className="task-example">🌱 {r.example}</p>}
        {r.insight && <p className="task-hint wr-insight">💡 {r.insight}</p>}
        {changes.length > 0 ? (
          <ul className="wr-changes">
            {changes.map((c, i) => (
              <li key={i} className={c.good ? 'good' : 'bad'}>
                {c.text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small">눈에 띄는 변화는 없었어요.</p>
        )}
        {next && <p className="muted small">{next}</p>}
        <div className="task-foot">
          <button className="primary" autoFocus onClick={() => game.closeWorkResult()}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
