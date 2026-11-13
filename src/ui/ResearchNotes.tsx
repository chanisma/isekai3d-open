import { useState } from 'react';
import { FEAR_LEVEL_LABEL, fearLevel, type FearId } from '../game/fears';
import { NOTE_BY_ID, NOTE_GROUP_LABEL, RESEARCH_NOTES, type NoteGroup } from '../game/research';
import type { Dweller } from '../game/types';

/**
 * 📚 연구 노트 (2026-10-26, at the user's request): what in the 특징 tab comes from research — how
 * fears work, each fear, the traits from personality psychology — each told in the game and in
 * real life (research.ts), like 역량 알아보기.
 */
export function ResearchNotes({ dweller, initial, onClose }: { dweller?: Dweller; initial?: string; onClose: () => void }) {
  const [group, setGroup] = useState<NoteGroup | 'all'>('all');
  const [pick, setPick] = useState<string>(initial && NOTE_BY_ID[initial] ? initial : RESEARCH_NOTES[0].id);
  const groups = Object.keys(NOTE_GROUP_LABEL) as NoteGroup[];
  const n = NOTE_BY_ID[pick];
  // This dweller's own: a fear they carry (and how strong), a trait they have.
  const fear = n.group === 'fear' ? (n.id.slice(5) as FearId) : null;
  const level = dweller && fear ? fearLevel(dweller, fear) : 0;
  const hasTrait = !!dweller && n.group === 'trait' && dweller.traits.includes(n.id.slice(6));
  const mine = (id: string) => !!dweller && (id.startsWith('fear_') ? fearLevel(dweller, id.slice(5) as FearId) > 0 : id.startsWith('trait_') && dweller.traits.includes(id.slice(6)));
  return (
    <div className="modal-backdrop">
      <div className="modal job-modal career-explorer skill-guide research-notes">
        <h2>📚 연구 노트</h2>
        <p className="muted">
          특징 가운데 실제 연구에서 가져온 것들이에요. 게임에서는 어떻게 움직이는지, 그리고 <b>현실의 사람들</b>에 대해 연구가 무엇을 말하는지 함께 살펴보세요. 두려움과 성격은 누구에게나 있는 자연스러운 모습이에요.
        </p>
        <div className="job-filters">
          <div className="chips">
            <button className={`chip ${group === 'all' ? 'on' : ''}`} onClick={() => setGroup('all')}>
              전체
            </button>
            {groups.map((g) => (
              <button key={g} className={`chip ${group === g ? 'on' : ''}`} onClick={() => setGroup(g)}>
                {NOTE_GROUP_LABEL[g]}
              </button>
            ))}
          </div>
        </div>
        <div className="cx-body">
          <div className="cx-list">
            {groups
              .filter((g) => group === 'all' || group === g)
              .map((g) => (
                <div key={g} className="sg-group">
                  <div className="muted skill-group">{NOTE_GROUP_LABEL[g]}</div>
                  {RESEARCH_NOTES.filter((x) => x.group === g).map((x) => (
                    <button key={x.id} className={`cx-row ${x.id === pick ? 'on' : ''}`} onClick={() => setPick(x.id)}>
                      <span>
                        {x.icon} {x.label}
                      </span>
                      {mine(x.id) && <span className="muted">나</span>}
                    </button>
                  ))}
                </div>
              ))}
          </div>
          <div className="cx-detail">
            <h3>
              {n.icon} {n.label}
              {dweller && level > 0 && (
                <small className="muted">
                  {' '}
                  · {dweller.name}: 지금 {FEAR_LEVEL_LABEL[level]}
                </small>
              )}
              {hasTrait && <small className="muted"> · {dweller!.name}의 특성</small>}
            </h3>
            <div className="sg-card">
              <b>🎮 게임에서는</b>
              <ul>
                {n.game.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
            <div className="sg-card">
              <b>🔬 연구가 말하는 것</b>
              {n.real.map((w) => (
                <p key={w}>{w}</p>
              ))}
            </div>
            <div className="sg-card sg-real">
              <b>🌱 현실에서 해 볼 수 있는 것</b>
              <ul>
                {n.tips.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
            <div className="sg-card rn-sources">
              <b>📖 참고한 연구</b>
              <ul className="muted small">
                {n.sources.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
            {n.group !== 'trait' && <p className="muted small">마음이 오래 힘들면 혼자 견디지 말고 선생님·상담 선생님·보호자, 또는 청소년상담 1388에 이야기해 보세요.</p>}
          </div>
        </div>
        <button className="ghost" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
