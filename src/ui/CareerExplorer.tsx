import { useMemo, useState } from 'react';
import { CAREERS, CAREER_FIELDS, fieldOf, levelsOf, type Career } from '../game/careers';
import { SKILL_PROFILES, profileSkills } from '../game/careerSkills';
import { SKILL_WHY, TOP_WHY, whyFor } from '../game/careerWhy';
import { WORK_TYPES, leaningsOf, typesOf, type WorkType } from '../game/careerTypes';
import { ASPIRATION_BY_ID } from '../game/aspirations';
import { TRAIT_BY_ID } from '../game/traits';
import { SKILL_HOWTO, SKILL_INFO } from '../game/constants';
import type { Game } from '../game/game';
import type { SkillKey } from '../game/types';
import { josa } from '../game/util';
import { WORKPLACES } from '../game/workplace';
import { Icon } from './Icon';

/**
 * Career explorer (ours, for the career-education side of the game): what each job asks for, rung
 * by rung, set against the dweller's own competencies, and where those can be practised.
 */

const chip = (k: SkillKey) => (
  <span className="cx-skill" key={k} title={[SKILL_WHY[k], SKILL_HOWTO[k] && `키우는 방법: ${SKILL_HOWTO[k]}`].filter(Boolean).join('\n') || undefined}>
    {SKILL_INFO[k].icon} {SKILL_INFO[k].label}
  </span>
);

/** How well a dweller's competencies already suit a career (0 = not at all). */
function fit(c: Career, skills: Record<SkillKey, number>): number {
  const p = SKILL_PROFILES[c.id];
  if (!p) return 0;
  const f = (k: SkillKey) => Math.min(1, Math.floor(skills[k] ?? 0) / 5);
  return f(p.main) * 3 + f(p.base) * 2 + Math.max(...p.branches.map((b) => f(b.skill)));
}

export function CareerExplorer({ game, dwellerId, onClose, initial }: { game: Game; dwellerId: number; onClose: () => void; initial?: string }) {
  const dweller = game.dweller(dwellerId);
  const jobs = CAREERS.filter((c) => !c.school && !c.partTime);
  const [field, setField] = useState('all');
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<WorkType | null>(null);
  const [pick, setPick] = useState<string>(initial ?? (dweller?.job && SKILL_PROFILES[dweller.job.careerId] ? dweller.job.careerId : jobs[0].id));
  const skills = dweller?.skills;
  const best = useMemo(
    () => (skills ? jobs.map((c) => ({ c, f: fit(c, skills) })).filter((x) => x.f > 0).sort((a, b) => b.f - a.f).slice(0, 5) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dwellerId, game.version],
  );
  // What the dweller is like: their traits, and the kinds of work those lean towards.
  const traits = (dweller?.traits ?? []).map((t) => TRAIT_BY_ID[t]).filter((t) => t && !t.reward);
  const leanings = leaningsOf(dweller?.traits ?? []);
  const leans = (id: string) => typesOf(id).filter((t) => leanings.some((l) => l.type === t));
  // Marked as suiting them: jobs whose main kind is what their traits lean to most.
  const strongest = leanings.filter((l) => l.traits.length === leanings[0]?.traits.length).map((l) => l.type);
  const suits = (id: string) => strongest.includes(typesOf(id)[0]);
  const suited = useMemo(
    () => (skills ? jobs.filter((c) => suits(c.id)).sort((a, b) => leans(b.id).length - leans(a.id).length || fit(b, skills) - fit(a, skills)).slice(0, 5) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dwellerId, game.version],
  );
  const grown = skills ? (Object.keys(SKILL_INFO) as SkillKey[]).filter((k) => (skills[k] ?? 0) >= 1).sort((a, b) => skills[b] - skills[a]) : [];
  const asp = dweller?.aspiration && ASPIRATION_BY_ID[dweller.aspiration.id];
  const now = dweller?.job && CAREERS.find((j) => j.id === dweller.job!.careerId);
  const traitNames = (ids: string[]) => ids.map((t) => TRAIT_BY_ID[t]?.label).join('·');
  const shown = jobs
    .filter((c) => field === 'all' || fieldOf(c.id)?.id === field)
    .filter((c) => !kind || typesOf(c.id).includes(kind))
    .filter((c) => !query.trim() || c.name.includes(query.trim()) || [...profileSkills(c.id)!].some((k) => SKILL_INFO[k].label.includes(query.trim())));
  const c = jobs.find((j) => j.id === pick) ?? jobs[0];
  const choose = (id: string) => {
    setPick(id);
    // Looking at a job's field counts for "세상 둘러보기" (aspirations).
    if (dweller) game.noteExplore(dweller.id, fieldOf(id)?.id);
  };
  const interest = dweller?.interestJobs ?? [];
  // Neighbours the dweller has asked about their work, who do (or did) this job.
  const neighbours = (game.state.townies ?? []).filter((t) => dweller?.knows?.[t.id]?.job === c.id);
  const p = SKILL_PROFILES[c.id];
  const have = (k: SkillKey) => Math.floor(skills?.[k] ?? 0);

  return (
    <div className="modal-backdrop">
      <div className="modal job-modal career-explorer">
        <h2>🧭 진로 탐색</h2>
        <p className="muted">
          직업마다 필요한 역량과, 단계가 오를수록 무엇이 더 필요한지 살펴보세요. 어느 분야든 처음엔 <b>기본기</b>, 중간엔 <b>전문성</b>, 위로 갈수록 <b>사람과 조직을 이끄는 힘</b>이 필요해요. 매일 꾸준히 연습하면 역량이 더 빨리 늘어요(연속 연습 최대 +50%).
        </p>
        {dweller && (
          <div className="cx-me">
            <div>
              <b>👤 {dweller.name}</b>
              {now && <span className="muted"> · 지금 {now.icon} {now.name}</span>}
              {asp && <span className="muted"> · 열망 {asp.icon} {asp.label}</span>}
            </div>
            <div className="cx-me-row">
              <span className="cx-me-label">성격</span>
              {traits.length ? traits.map((t) => (
                <span key={t.id} className="cx-skill" title={t.desc}>
                  {t.icon} {t.label}
                </span>
              )) : <span className="muted">아직 없어요</span>}
            </div>
            <div className="cx-me-row">
              <span className="cx-me-label">역량</span>
              {grown.length ? grown.map((k) => (
                <button key={k} className="cx-skill" title={`이 역량이 필요한 직업 찾기${SKILL_HOWTO[k] ? `
키우는 방법: ${SKILL_HOWTO[k]}` : ''}`} onClick={() => setQuery(SKILL_INFO[k].label)}>
                  {SKILL_INFO[k].icon} {SKILL_INFO[k].label} <b>{have(k)}</b>
                </button>
              )) : <span className="muted">아직 키운 역량이 없어요. 여러 활동을 해 보며 키워 보세요.</span>}
            </div>
            {leanings.length > 0 && (
              <div className="cx-me-row">
                <span className="cx-me-label">성격에 맞는 일</span>
                {leanings.map((l) => (
                  <button key={l.type} className={`cx-skill ${kind === l.type ? 'on' : ''}`} title={`${WORK_TYPES[l.type].desc}
${traitNames(l.traits)} 성격에서 · 누르면 이런 직업만 보여요`} onClick={() => setKind(kind === l.type ? null : l.type)}>
                    {WORK_TYPES[l.type].icon} {WORK_TYPES[l.type].label} <small className="muted">({traitNames(l.traits)})</small>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {interest.length > 0 && (
          <div className="cx-best">
            <span className="muted">⭐ 관심 직업:</span>
            {interest.map((id) => {
              const j = jobs.find((x) => x.id === id);
              return j ? (
                <button key={id} className="chip" onClick={() => choose(id)}>
                  {j.icon} {j.name}
                </button>
              ) : null;
            })}
          </div>
        )}
        {best.length > 0 && (
          <div className="cx-best">
            <span className="muted">{dweller?.name}의 지금 역량과 잘 맞는 직업:</span>
            {best.map(({ c: b }) => (
              <button key={b.id} className="chip" onClick={() => choose(b.id)}>
                {b.icon} {b.name}
              </button>
            ))}
          </div>
        )}
        {suited.length > 0 && (
          <div className="cx-best">
            <span className="muted">{dweller?.name}의 성격과 어울리는 직업:</span>
            {suited.map((b) => (
              <button key={b.id} className="chip" onClick={() => choose(b.id)}>
                {b.icon} {b.name}
              </button>
            ))}
          </div>
        )}
        <div className="job-filters">
          <input className="job-search" placeholder="🔎 직업이나 역량 이름으로 찾기 (예: 의학, 리더십)" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="chips">
            <button className={`chip ${field === 'all' ? 'on' : ''}`} onClick={() => setField('all')}>
              전체
            </button>
            {CAREER_FIELDS.map((f) => (
              <button key={f.id} className={`chip ${field === f.id ? 'on' : ''}`} onClick={() => setField(f.id)}>
                {f.icon} {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="cx-body">
          <div className="cx-list">
            {shown.map((j) => (
              <button key={j.id} className={`cx-row ${j.id === c.id ? 'on' : ''}`} onClick={() => choose(j.id)}>
                <span>
                  {j.icon} {j.name}
                </span>
                <span className="muted">
                  {suits(j.id) && <span title="성격과 어울리는 일">✨</span>}
                  {SKILL_INFO[SKILL_PROFILES[j.id].main].icon}
                </span>
              </button>
            ))}
            {shown.length === 0 && <p className="muted">찾는 직업이 없어요.</p>}
            {kind && (
              <button className="ghost small" onClick={() => setKind(null)}>
                {WORK_TYPES[kind].icon} 일 유형 거르기 풀기
              </button>
            )}
          </div>
          <div className="cx-detail">
            <h3>
              {c.icon} {c.name} <small className="muted">{fieldOf(c.id)?.label ?? ''}{WORKPLACES[c.id] ? ` · 🏢 ${WORKPLACES[c.id].name}` : ''}</small>
            </h3>
            {neighbours.length > 0 && (
              <div className="cx-neighbours">
                🏘️ 이 일을 하는 이웃: {neighbours.map((t) => `${t.name}${t.job ? '' : ' (은퇴)'}`).join(', ')} <small className="muted">· 직업에 대해 더 물어볼 수 있어요</small>
              </div>
            )}
            <div className="cx-types">
              {typesOf(c.id).map((t) => (
                <span key={t} className={`cx-skill ${leans(c.id).includes(t) ? 'fit' : ''}`} title={WORK_TYPES[t].desc}>
                  {WORK_TYPES[t].icon} {WORK_TYPES[t].label}
                </span>
              ))}
              {dweller && (
                <button className={`ghost small ${interest.includes(c.id) ? 'on' : ''}`} onClick={() => game.toggleInterestJob(dweller.id, c.id)} title="관심 직업은 3개까지, 언제든 바꿀 수 있어요">
                  <Icon name="star" filled={interest.includes(c.id)} /> {interest.includes(c.id) ? '관심 직업' : '관심 직업으로 찜하기'}
                </button>
              )}
            </div>
            {dweller && (
              <div className="cx-match">
                {leans(c.id).length > 0 ? (
                  <div>
                    ✨ {dweller.name}의 성격({traitNames(leanings.filter((l) => leans(c.id).includes(l.type)).flatMap((l) => l.traits).filter((t, i, a) => a.indexOf(t) === i))})과 어울리는 {leans(c.id).map((t) => WORK_TYPES[t].label).join(', ')}이에요.
                  </div>
                ) : (
                  <div className="muted">성격으로는 {dweller.name}에게 낯선 일이에요. 해 보면 새 흥미를 찾을 수도 있어요.</div>
                )}
                <div>
                  📈 필요한 역량 중 {dweller.name}의 지금 수준:{' '}
                  {[...profileSkills(c.id)!].map((k) => (
                    <span key={k} className={`cx-need ${have(k) >= 1 ? 'ok' : ''}`}>
                      {SKILL_INFO[k].icon} {SKILL_INFO[k].label} {have(k)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="cx-profile">
              <b>필요한 역량과 그 이유</b>
              <div>
                <b>대표 역량</b> {chip(p.main)}
                <p className="cx-why">{whyFor(c.id, p.main)}</p>
              </div>
              <div>
                <b>기반 역량</b> {chip(p.base)}
                <p className="cx-why">{whyFor(c.id, p.base)}</p>
              </div>
              {c.branches!.map((b, i) => (
                <div key={b.id}>
                  <b>{b.name}</b> {chip(p.branches[i].skill)}
                  {p.branches[i].top && <> + 상위 단계 {chip(p.branches[i].top!)}</>}
                  <p className="cx-why">
                    {whyFor(c.id, p.branches[i].skill)}
                    {p.branches[i].top && <> {TOP_WHY[p.branches[i].top!]}</>}
                  </p>
                </div>
              ))}
            </div>
            {c.branches!.map((b, bi) => (
              <details key={b.id} open={bi === 0}>
                <summary>
                  성장 단계 — {b.name} ({levelsOf(c, bi).length}단계)
                </summary>
                <table className="cx-ladder">
                  <tbody>
                    {levelsOf(c, bi).map((l, i, all) => (
                      <tr key={i}>
                        <td className="muted">{i + 1}</td>
                        <td>{l.title}</td>
                        <td className="muted">§{l.pay}</td>
                        <td>
                          {i === all.length - 1
                            ? '최고 단계'
                            : (l.needs ?? []).length === 0
                              ? '조건 없음'
                              : (l.needs ?? []).map(([k, v]) => (
                                  <span key={k} className={`cx-need ${have(k) >= v ? 'ok' : ''}`} title={`${dweller?.name}: ${have(k)}레벨${whyFor(c.id, k) ? `\n${whyFor(c.id, k)}` : ''}`}>
                                    {SKILL_INFO[k].icon} {SKILL_INFO[k].label} {v}
                                  </span>
                                ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            ))}
            <div className="cx-howto">
              <b>역량 키우는 방법</b>
              <ul>
                {[...profileSkills(c.id)!].map((k) => (
                  <li key={k}>
                    {SKILL_INFO[k].icon} <b>{SKILL_INFO[k].label}</b> ({dweller?.name} {have(k)}레벨): {SKILL_HOWTO[k] ?? '—'}
                  </li>
                ))}
              </ul>
              <p className="muted">표의 초록색 역량은 {dweller ? josa(dweller.name, '이/가') : ''} 이미 갖춘 것이에요. 승진할 때마다 다음 단계에 필요한 역량을 먼저 키워 두세요.</p>
            </div>
          </div>
        </div>
        <button className="ghost" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
