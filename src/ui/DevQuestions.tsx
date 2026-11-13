import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { DevQuestion, Isekai3dCloud } from '../cloud/isekai3dCloud';
import { LIFE_EVENT_LABEL, type LifeEvent } from '../game/aiQuestions';
import { CAREER_BY_ID } from '../game/careers';
import { SKILL_INFO } from '../game/constants';
import { EMOTIONS } from '../game/emotions';
import type { EmotionKey, SkillKey } from '../game/types';

const STAGE_NAME: Record<string, string> = { junior: '🌱 입문', expert: '🛠️ 전문', leader: '🧭 리더' };
const KIND: Record<DevQuestion['kind'], string> = { career: '📋 근무 카드', life: '💭 인생 사건', explore: '🧭 진로' };
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

/**
 * 🛠 Every question the 스페이스기전 AI made for me (a 스페이스기전 admin testing what it writes), newest
 * first, batch by batch: the situation or question, each choice (its competency, mood, level,
 * outcomes) or option, and whether it was handed out and how I answered.
 */
export function DevQuestions({ cloud, onClose }: { cloud: Isekai3dCloud; onClose: () => void }) {
  const [list, setList] = useState<DevQuestion[] | null>(null);
  const load = () => void cloud.devQuestions().then(setList);
  useEffect(load, [cloud]);
  // New ones come in while it's open: the list follows.
  useEffect(() => cloud.onChange(load), [cloud]);
  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal dev-questions" role="dialog" aria-label="만든 질문 모두" onClick={(e) => e.stopPropagation()}>
        <h2>
          📜 만든 질문 모두 <span className="muted">· {list ? `${list.length}개` : '불러오는 중'}</span>
        </h2>
        <div className="dev-q-list">
          {list?.length === 0 && <p className="muted">아직 만든 질문이 없어요. 🛠 메뉴에서 질문을 받아 보세요.</p>}
          {list?.map((q, i) => (
            <div key={q.id} className={`dev-q ${i > 0 && list[i - 1].batch !== q.batch ? 'new-batch' : ''}`}>
              <div className="muted small">
                {KIND[q.kind]}
                {q.careerId ? ` · ${CAREER_BY_ID[q.careerId]?.name ?? q.careerId} ${(q.careerLevel ?? 0) + 1}단계` : ''}
                {q.careerStage ? ` (${STAGE_NAME[q.careerStage] ?? q.careerStage}${q.careerBranch ? `, ${q.careerBranch}` : ''})` : ''}
                {q.lifeEvent ? ` · ${LIFE_EVENT_LABEL[q.lifeEvent as LifeEvent] ?? q.lifeEvent}` : ''} · 만든 때 {when(q.createdAt)}
                {q.model ? ` · ${q.model}` : ''}
                {q.deliveredAt ? ` · 받음 ${when(q.deliveredAt)}` : ' · 아직 안 받음'}
                {q.answeredAt ? ` · 답함` : ''}
              </div>
              <p>{q.card.text}</p>
              {q.card.choices?.map((c, j) => {
                const win = c.win as { text: string; perf: number; money?: number } | undefined;
                const lose = c.lose as { text: string; perf: number } | undefined;
                const skill = c.skill as SkillKey | undefined;
                return (
                  <div key={j} className={`dev-q-choice ${q.choice === j ? 'picked' : ''}`}>
                    <b>{String(c.label)}</b>{' '}
                    <span className="muted small">
                      {skill ? `🎲 ${SKILL_INFO[skill]?.label ?? skill} ${String(c.need ?? 4)}레벨${c.mood ? ` · ${EMOTIONS[c.mood as EmotionKey]?.levels[0] ?? String(c.mood)}` : ''}` : '✅ 확실'}
                    </span>
                    {win && (
                      <div className="small">
                        성공 ({win.perf > 0 ? '+' : ''}
                        {win.perf}
                        {win.money ? `, §${win.money}` : ''}) {win.text}
                      </div>
                    )}
                    {lose && (
                      <div className="small">
                        실패 ({lose.perf}) {lose.text}
                      </div>
                    )}
                  </div>
                );
              })}
              {q.card.options && (
                <div className="thought-options">
                  {q.card.options.map((o, j) => (
                    <span key={j} className={`chip ${q.choice === j ? 'on' : ''}`}>
                      {o}
                    </span>
                  ))}
                </div>
              )}
              {q.text && <div className="small">✍️ {q.text}</div>}
            </div>
          ))}
        </div>
        <div className="styler-foot">
          <button className="ghost" onClick={load}>
            새로고침
          </button>
          <button className="primary" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
