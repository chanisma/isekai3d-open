import { useState } from 'react';
import { MAX_SKILL, SKILL_INFO, TODDLER_MAX_SKILL, TODDLER_SKILLS } from '../game/constants';
import type { Game } from '../game/game';
import { ROLE_LABEL, gameWays, guideGroups, jobsNeeding, skillGuide } from '../game/skillGuide';
import type { SkillKey } from '../game/types';
import { CareerExplorer } from './CareerExplorer';

/**
 * 역량 알아보기 (2026-10-26, at the user's request; like 진로 탐색): every competency in plain words,
 * how to grow it in the game and in real life, and the jobs it leads to.
 */
export function SkillGuide({ game, dwellerId, initial, onClose }: { game: Game; dwellerId: number; initial?: SkillKey; onClose: () => void }) {
  const dweller = game.dweller(dwellerId);
  const groups = guideGroups(dweller?.age ?? 'adult');
  const all = groups.flatMap((x) => x.keys);
  const [group, setGroup] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [pick, setPick] = useState<SkillKey>(initial && all.includes(initial) ? initial : all[0]);
  const [job, setJob] = useState<string | null>(null);
  const q = query.trim();
  const shown = groups
    .filter((x) => group === 'all' || x.label === group)
    .map((x) => ({ ...x, keys: x.keys.filter((k) => !q || SKILL_INFO[k].label.includes(q)) }))
    .filter((x) => x.keys.length);
  const k = pick;
  const info = skillGuide(k);
  const ways = gameWays(k);
  const jobs = jobsNeeding(k);
  const lvl = Math.floor(dweller?.skills[k] ?? 0);
  const max = TODDLER_SKILLS.has(k) ? TODDLER_MAX_SKILL : MAX_SKILL;

  if (job && dweller) return <CareerExplorer game={game} dwellerId={dweller.id} initial={job} onClose={() => setJob(null)} />;
  return (
    <div className="modal-backdrop">
      <div className="modal job-modal career-explorer skill-guide">
        <h2>💡 역량 알아보기</h2>
        <p className="muted">
          역량은 일과 생활에 필요한 힘이에요. 어떤 힘인지, 게임에서 어떻게 키우는지, 그리고 <b>현실의 나</b>는 어떻게 키울 수 있는지 살펴보세요. 무엇이든 매일 조금씩 꾸준히 하는 것이 가장 빨리 느는 방법이에요.
        </p>
        <div className="job-filters">
          <input className="job-search" placeholder="🔎 역량 이름으로 찾기 (예: 공감, 리더십)" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="chips">
            <button className={`chip ${group === 'all' ? 'on' : ''}`} onClick={() => setGroup('all')}>
              전체
            </button>
            {groups.map((x) => (
              <button key={x.label} className={`chip ${group === x.label ? 'on' : ''}`} onClick={() => setGroup(x.label)}>
                {x.label}
              </button>
            ))}
          </div>
        </div>
        <div className="cx-body">
          <div className="cx-list">
            {shown.map((x) => (
              <div key={x.label} className="sg-group">
                <div className="muted skill-group">{x.label}</div>
                {x.keys.map((s) => (
                  <button key={s} className={`cx-row ${s === k ? 'on' : ''}`} onClick={() => setPick(s)}>
                    <span>
                      {SKILL_INFO[s].icon} {SKILL_INFO[s].label}
                    </span>
                    {(dweller?.skills[s] ?? 0) >= 1 && <span className="muted">{Math.floor(dweller!.skills[s])}</span>}
                  </button>
                ))}
              </div>
            ))}
            {shown.length === 0 && <p className="muted">찾는 역량이 없어요.</p>}
          </div>
          <div className="cx-detail">
            <h3>
              {SKILL_INFO[k].icon} {SKILL_INFO[k].label}
              {dweller && (
                <small className="muted">
                  {' '}
                  · {dweller.name} {lvl > 0 ? `${lvl}레벨` : '아직 시작 전'} (최고 {max})
                </small>
              )}
            </h3>
            {info && (
              <>
                <div className="sg-card">
                  <b>🤔 어떤 힘일까요?</b>
                  <p>{info.what}</p>
                  <p className="sg-life">📍 {info.life}</p>
                </div>
                <div className="sg-card">
                  <b>🎮 게임에서 키우는 방법</b>
                  {ways.ways.length ? (
                    <ul>
                      {ways.ways.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">이 역량을 쓰는 활동을 하면 조금씩 늘어요.</p>
                  )}
                  {ways.use && <p className="sg-use">✨ 키우면 좋은 점: {ways.use}</p>}
                  <p className="muted small">같은 역량을 매일 연습하면 연속 연습 보너스로 더 빨리 늘어요.</p>
                </div>
                <div className="sg-card sg-real">
                  <b>🌱 현실에서 키우는 방법</b>
                  <ul>
                    {info.real.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}
            {jobs.length > 0 && (
              <div className="sg-card">
                <b>💼 이 역량이 필요한 직업 ({jobs.length})</b>
                <p className="muted small">누르면 진로 탐색에서 그 직업을 자세히 볼 수 있어요.</p>
                <div className="cx-best">
                  {jobs.map(({ career, role }) => (
                    <button key={career.id} className="chip" title={ROLE_LABEL[role]} onClick={() => setJob(career.id)}>
                      {career.icon} {career.name}
                      {role === 'main' && <small className="muted"> · 대표</small>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <button className="ghost" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
