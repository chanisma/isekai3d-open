import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AREA_TRAITS, ASP_AREAS, ASPIRATION_BY_ID, aspirationWorkType, aspirationsFor, goalLabel, type AspArea } from '../game/aspirations';
import { WorkTypeGuide } from './WorkTypeGuide';
import { TRAIT_BY_ID } from '../game/traits';
import { Icon } from './Icon';

/**
 * Picking an aspiration (docs/ref-game/10-aspirations.md): a button that opens a window like the career
 * explorer's, the dreams grouped by area of life with what each asks step by step. The area the
 * journey to find oneself suggested is marked; the choice stays the player's.
 */
export function AspirationPicker({ age, value, onPick, empty, suggested }: { age: string | undefined; value: string; onPick: (id: string) => void; empty: string; suggested?: string }) {
  const [open, setOpen] = useState(false);
  const def = value ? ASPIRATION_BY_ID[value] : undefined;
  return (
    <>
      <button type="button" className="ghost small asp-open" onClick={() => setOpen(true)}>
        {def ? (
        `${def.icon} ${def.label} · 바꾸기…`
      ) : (
        <>
          <Icon name="sparkles" /> {empty}
        </>
      )}
      </button>
      {open && (
        <AspirationExplorer
          age={age}
          current={value}
          suggested={suggested}
          onClose={() => setOpen(false)}
          onPick={(id) => {
            setOpen(false);
            onPick(id);
          }}
        />
      )}
    </>
  );
}

/** The window: areas to filter by, the dreams on the left, the one looked at on the right with its steps. */
function AspirationExplorer({ age, current, suggested, onPick, onClose }: { age: string | undefined; current: string; suggested?: string; onPick: (id: string) => void; onClose: () => void }) {
  const list = aspirationsFor(age);
  const areas = [...new Set(list.map((a) => a.area).filter((a): a is AspArea => !!a))];
  const [area, setArea] = useState<string>('all');
  const [query, setQuery] = useState('');
  const first = list.find((a) => a.id === current) ?? list.find((a) => a.area === suggested) ?? list[0];
  const [pick, setPick] = useState(first.id);
  const q = query.trim();
  const shown = list.filter((a) => area === 'all' || a.area === area).filter((a) => !q || a.label.includes(q) || a.desc.includes(q));
  // The one picked, or the first of those shown once the area or the search leaves it out.
  const a = shown.find((x) => x.id === pick) ?? shown[0] ?? first;
  const info = a.area ? ASP_AREAS[a.area] : undefined;
  const traits = a.area ? AREA_TRAITS[a.area] : undefined;
  const reward = a.reward ?? traits?.reward;
  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal job-modal career-explorer asp-explorer" role="dialog" aria-label="열망 고르기" onClick={(e) => e.stopPropagation()}>
        <h2>🌟 열망 고르기</h2>
        <p className="muted">하고 싶은 꿈을 하나 골라요. 꿈은 언제든 바꿀 수 있고, 해 온 것은 발자취로 남아요. 단계를 이룰 때마다 만족 포인트를 받아요.</p>
        <div className="job-filters">
          <input className="job-search" placeholder="🔎 꿈 이름이나 설명으로 찾기" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="chips">
            <button className={`chip ${area === 'all' ? 'on' : ''}`} onClick={() => setArea('all')}>
              전체
            </button>
            {areas.map((id) => (
              <button key={id} className={`chip ${area === id ? 'on' : ''}`} onClick={() => setArea(id)} title={ASP_AREAS[id].desc}>
                {ASP_AREAS[id].icon} {ASP_AREAS[id].label}
                {suggested === id ? ' ✨' : ''}
              </button>
            ))}
          </div>
        </div>
        <div className="cx-body">
          <div className="cx-list">
            {shown.map((x) => (
              <button key={x.id} className={`cx-row ${x.id === a.id ? 'on' : ''}`} onClick={() => setPick(x.id)}>
                <span>
                  {x.icon} {x.label}
                </span>
                <span className="muted">{x.id === current ? '지금' : x.area === suggested ? '✨ 추천' : ''}</span>
              </button>
            ))}
            {shown.length === 0 && <p className="muted">찾는 꿈이 없어요.</p>}
          </div>
          <div className="cx-detail">
            <h3>
              {a.icon} {a.label} {info && <small className="muted">{info.icon} {info.label}</small>}
            </h3>
            <p>{a.desc}</p>
            {aspirationWorkType(a) && <WorkTypeGuide type={aspirationWorkType(a)!} />}
            {a.area === suggested && <p className="muted">✨ 나를 찾아가는 여행이 추천한 분야예요.</p>}
            {traits && (
              <p className="muted">
                고른 동안 {TRAIT_BY_ID[traits.bonus]?.icon} <b>{TRAIT_BY_ID[traits.bonus]?.label}</b> 특성이 붙고, 다 이루면 {reward && TRAIT_BY_ID[reward] ? `${TRAIT_BY_ID[reward].icon} ${TRAIT_BY_ID[reward].label}` : '보상 특성'}을 평생 가져요.
              </p>
            )}
            {!traits && reward && TRAIT_BY_ID[reward] && (
              <p className="muted">
                다 이루면 {TRAIT_BY_ID[reward].icon} <b>{TRAIT_BY_ID[reward].label}</b> 특성을 가져요.
              </p>
            )}
            <ol className="asp-plan">
              {a.milestones.map((m, i) => (
                <li key={i}>
                  <b>{m.name}</b> <small className="muted">+{m.points}</small>
                  <ul>
                    {m.goals.map((g, j) => (
                      <li key={j}>{goalLabel(g)}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </div>
        </div>
        <div className="job-actions">
          <button className="primary" disabled={a.id === current} onClick={() => onPick(a.id)}>
            {a.id === current ? '지금 꿈이에요' : `${a.icon} 이 꿈으로 정하기`}
          </button>
          <button className="ghost" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
