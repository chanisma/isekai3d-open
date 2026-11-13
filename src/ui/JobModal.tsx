import { useState } from 'react';
import { SKILL_PROFILES } from '../game/careerSkills';
import { CareerExplorer } from './CareerExplorer';
import { CAREERS, CAREER_FIELDS, daysText, fieldOf, levelsOf } from '../game/careers';
import { SKILL_INFO } from '../game/constants';
import type { Game } from '../game/game';
import { formatClock } from '../game/util';
import { WORKPLACES } from '../game/workplace';
import { Icon } from './Icon';

/** The want ads: every job the dweller can take, in one list, filtered by field or by name. */
export function JobModal({ game, dwellerId }: { game: Game; dwellerId: number }) {
  const dweller = game.dweller(dwellerId);
  const [field, setField] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [exploring, setExploring] = useState(false);
  const teen = dweller?.age === 'teen';
  const all = CAREERS.filter((c) => !c.school && !!c.partTime === teen);
  const order = (id: string) => {
    const f = fieldOf(id);
    return f ? CAREER_FIELDS.indexOf(f) : CAREER_FIELDS.length;
  };
  const shown = all
    .filter((c) => field === 'all' || fieldOf(c.id)?.id === field)
    .filter((c) => !query.trim() || [c.name, ...levelsOf(c, 0).map((l) => l.title), ...(c.branches ?? []).map((b) => b.name)].some((t) => t.includes(query.trim())))
    .sort((a, b) => order(a.id) - order(b.id) || a.name.localeCompare(b.name, 'ko'));
  const fields = teen ? [] : CAREER_FIELDS.filter((f) => all.some((c) => f.careers.includes(c.id)));
  return (
    <div className="modal-backdrop">
      <div className="modal job-modal">
        <h2>📰 구인 광고</h2>
        <p className="muted">
          {dweller?.name}에게 맞는 일자리를 골라 주세요. 승진하려면 직업마다 필요한 역량을 키워야 해요. ({all.length}개 직업){' '}
          {!teen && (
            <button className="ghost small" onClick={() => setExploring(true)}>
              <Icon name="compass" /> 직업별 역량 자세히 보기
            </button>
          )}
        </p>
        {exploring && <CareerExplorer game={game} dwellerId={dwellerId} onClose={() => setExploring(false)} />}
        {!teen && (
          <div className="job-filters">
            <input className="job-search" placeholder="🔎 직업·직급 이름으로 찾기" value={query} onChange={(e) => setQuery(e.target.value)} />
            <div className="chips">
              <button className={`chip ${field === 'all' ? 'on' : ''}`} onClick={() => setField('all')}>
                전체
              </button>
              {fields.map((f) => (
                <button key={f.id} className={`chip ${field === f.id ? 'on' : ''}`} onClick={() => setField(f.id)}>
                  {f.icon} {f.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="job-list">
          {shown.length === 0 && <p className="muted">찾는 직업이 없어요.</p>}
          <div className="offers">
            {shown.map((c) => {
              const l = c.levels[0];
              const ladder = levelsOf(c, 0).length;
              return (
                <button key={c.id} className="offer" onClick={() => game.acceptJob(dwellerId, c.id)}>
                  <span className="offer-icon">{c.icon}</span>
                  <b>
                    {c.name} · {l.title}
                  </b>
                  <span>
                    {daysText(l.days)} {formatClock(l.start)}–{formatClock(l.end % 1440)}
                  </span>
                  <span>일당 §{l.pay}</span>
                  <span className="muted">
                    {SKILL_PROFILES[c.id] ? (
                      <>
                        대표 역량 {SKILL_INFO[c.skill].icon} {SKILL_INFO[c.skill].label} · 기반 {SKILL_INFO[SKILL_PROFILES[c.id].base].icon} {SKILL_INFO[SKILL_PROFILES[c.id].base].label}
                      </>
                    ) : (
                      <>
                        핵심 스킬: {SKILL_INFO[c.skill].icon} {SKILL_INFO[c.skill].label}
                      </>
                    )}{' '}
                    · {ladder}단계
                    {c.branches?.length ? ` (${c.levels.length}단계 후 ${c.branches.map((b) => b.name).join('/')})` : ''}
                  </span>
                  {WORKPLACES[c.id] && <span className="offer-work">🏢 근무지: {WORKPLACES[c.id].name}</span>}
                </button>
              );
            })}
          </div>
        </div>
        <button className="ghost" onClick={() => game.acceptJob(dwellerId, null)}>
          나중에 할게요
        </button>
      </div>
    </div>
  );
}
