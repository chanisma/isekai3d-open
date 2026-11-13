import { useEffect, useMemo, useState } from 'react';
import { CAREER_BY_ID, CAREER_FIELDS } from '../game/careers';
import { getDef } from '../game/catalog';
import { Game } from '../game/game';
import { clockInfo } from '../game/util';
import { SOCIALS } from '../game/socials';
import { ALL_WORK_LOTS, WORKPLACES } from '../game/workplace';
import { GameView } from './GameView';
import { useGame } from './useGame';
import { PRACTICE_FROM, PRACTICE_INFO, STAGE_INFO, TASK_KIND, gateOf, stageActions, stageInfo, stageLock, type StageAt, type WorkStage } from '../game/workStages';

/**
 * Looking round every workplace (ours, a tool for while the game is being made): pick any work lot
 * and it opens on its own with its colleagues, people coming in and call-outs, a visitor standing in
 * for the worker. Nothing is saved.
 */

const IDS = Object.keys(WORKPLACES);
const GROUPS: Array<{ label: string; icon: string; ids: string[] }> = [
  ...CAREER_FIELDS.map((f) => ({ label: f.label, icon: f.icon, ids: f.careers.filter((id) => WORKPLACES[id]) })),
];
const grouped = new Set(GROUPS.flatMap((g) => g.ids));
const rest = IDS.filter((id) => !grouped.has(id));
if (rest.length) GROUPS.push({ label: '아르바이트·기타', icon: '🧾', ids: rest });
const ORDER = GROUPS.flatMap((g) => g.ids);

const jobName = (id: string) => CAREER_BY_ID[id]?.name ?? id;

export function WorkplaceTour({ onClose }: { onClose: () => void }) {
  const [pick, setPick] = useState(ORDER[0]);
  const [query, setQuery] = useState('');
  // Which rung to look at the lot from: 입문, 실무 (a long shared ladder's back half), a branch's 전문, or a branch's 리더.
  const [at, setAt] = useState<StageAt>({ stage: 0 });
  // A branch that works somewhere else is looked round at its own lot (workplace.ts branchLots: the subway's 관제센터 and the like).
  const ownLot = (branch?: number) => (branch !== undefined && WORKPLACES[pick].branchLots?.[branch] ? `${pick}@${branch}` : pick);
  const lotKey = at.stage >= 1 ? ownLot(at.branch) : pick;
  const game = useMemo(() => Game.workplaceTour(lotKey, Math.random, at), [lotKey, at]);
  const career = CAREER_BY_ID[pick];
  const branchNames = career?.branches?.length ? career.branches.map((b) => b.name) : ['실무'];
  const stageChoices: Array<{ stage: WorkStage; branch?: number; label: string }> = [
    { stage: 0 as WorkStage, label: `${STAGE_INFO[0].icon} 입문` },
    ...(career?.branches?.length && career.levels.length >= PRACTICE_FROM ? [{ stage: 1 as WorkStage, label: `${PRACTICE_INFO.icon} 실무` }] : []),
    ...branchNames.map((b, bi) => ({ stage: 1 as WorkStage, branch: bi, label: `${STAGE_INFO[1].icon} ${career?.branches?.length ? b : '실무'}${ownLot(bi) !== pick ? ` → ${ALL_WORK_LOTS[ownLot(bi)].icon} ${ALL_WORK_LOTS[ownLot(bi)].name}` : ''}` })),
    ...branchNames.map((b, bi) => ({ stage: 2 as WorkStage, branch: bi, label: `${STAGE_INFO[2].icon} 리더${career?.branches?.length ? ` (${b})` : ''}` })),
  ].filter((x, k, all) => career?.branches?.length || x.stage !== 2 || k === all.length - 1);
  useGame(game);
  const def = ALL_WORK_LOTS[lotKey];
  const i = ORDER.indexOf(pick);
  const go = (step: number) => setPick(ORDER[(i + step + ORDER.length) % ORDER.length]);
  // ← and → step through the lots.
  useEffect(() => setAt({ stage: 0 }), [pick]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const step = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
      if (step) setPick((p) => ORDER[(ORDER.indexOf(p) + step + ORDER.length) % ORDER.length]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const q = query.trim();
  const match = (id: string) => !q || jobName(id).includes(q) || WORKPLACES[id].name.includes(q) || Object.values(WORKPLACES[id].branchLots ?? {}).some((l) => l!.name.includes(q));
  const c = clockInfo(game.state.time);
  const wp = game.state.workplace!;
  const stations = new Set(def.objects.map((o) => o.defId).filter((id) => getDef(id).interactions.some((x) => def.work.includes(x.id))));
  const label = (id: string) => {
    for (const o of def.objects) {
      const x = getDef(o.defId).interactions.find((it) => it.id === id);
      if (x) return `${x.icon} ${x.label}`;
    }
    const so = SOCIALS.find((x) => x.id === id);
    if (so) return `${so.icon} ${so.label}`;
    return id;
  };

  return (
    <div className="tour">
      <aside className="tour-list">
        <div className="tour-head">
          <button className="ghost" onClick={onClose}>
            ← 시작 화면
          </button>
          <b>🏢 근무지 {Object.keys(ALL_WORK_LOTS).length}곳</b>
        </div>
        <input className="job-search" placeholder="🔎 직업·근무지 이름" value={query} onChange={(e) => setQuery(e.target.value)} />
        {GROUPS.map((g) => {
          const ids = g.ids.filter(match);
          if (!ids.length) return null;
          return (
            <div key={g.label}>
              <div className="tour-group">
                {g.icon} {g.label} ({ids.length})
              </div>
              {ids.map((id) => (
                <button key={id} className={`cx-row ${id === pick ? 'on' : ''}`} onClick={() => setPick(id)}>
                  <span>
                    {WORKPLACES[id].icon} {WORKPLACES[id].name}
                    {Object.values(WORKPLACES[id].branchLots ?? {}).map((l) => (
                      <small key={l!.name} className="muted">
                        {' '}
                        · {l!.icon} {l!.name}
                      </small>
                    ))}
                  </span>
                  <span className="muted">{jobName(id)}</span>
                </button>
              ))}
            </div>
          );
        })}
      </aside>
      <main className="tour-main">
        <div className="tour-bar">
          <button className="ghost" onClick={() => go(-1)} title="이전 근무지 (←)">
            ◀
          </button>
          <b>
            {def.icon} {def.name}
          </b>
          <span className="muted">
            {jobName(pick)}
            {lotKey !== pick ? ` (${branchNames[at.branch!]} 갈래의 근무지)` : ''} · {i + 1}/{ORDER.length}
          </span>
          <button className="ghost" onClick={() => go(1)} title="다음 근무지 (→)">
            ▶
          </button>
          <span className="tour-clock">
            {c.day}일째 {String(c.hour).padStart(2, '0')}:{String(c.minute).padStart(2, '0')}
          </span>
          {[0, 1, 2, 3].map((s) => (
            <button key={s} className={`ghost small ${game.state.speed === s ? 'on' : ''}`} onClick={() => game.setSpeed(s)}>
              {s === 0 ? '⏸' : '▶'.repeat(s)}
            </button>
          ))}
        </div>
        <div className="tour-stage">
          <GameView game={game} mode="live" placing={null} setPlacing={() => {}} />
          <div className="tour-info">
            <p className="muted">견학생(모든 역량 5레벨)이 근무자 자리에 있어요. 가구를 눌러 업무를 직접 해 볼 수 있어요. 저장되지 않아요.</p>
            <div>
              <b>👥 동료</b> {def.coworkers.map((w) => `${w.name}${w.boss ? '(상사)' : ''}`).join(', ')}
            </div>
            <div>
              <b>🙋 찾아오는 사람</b>{' '}
              {def.clients?.length
                ? def.clients.map((cl) => `${cl.noun} 최대 ${cl.max}명, ${cl.every}분마다`).join(' · ')
                : '없음'}
            </div>
            <div>
              <b>🚨 호출</b> {def.alarm ? `${def.alarm.notice} (${def.alarm.every[0]}~${def.alarm.every[1]}분 간격)` : '없음'}
            </div>
            <div>
              <b>🪜 보는 단계</b>
              <div className="tour-chips">
                {stageChoices.map((s) => (
                  <button
                    key={s.label}
                    className={`chip ${at.stage === s.stage && at.branch === s.branch ? 'on' : ''}`}
                    onClick={() => setAt({ stage: s.stage, branch: s.branch })}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <b>📋 오늘의 업무</b> <span className="muted">({stageInfo(at, pick).label}: {stageInfo(at, pick).desc})</span>
              <ul>
                {wp.tasks.map((t) => (
                  <li key={t.id}>
                    {t.kind ? TASK_KIND[t.kind].icon : ''} {t.label} {t.count}/{t.need}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <b>🪜 단계별 업무 동작</b>
              <ul>
                {stageActions(pick).map((a) => {
                  const gate = gateOf(a);
                  const lock = stageLock({ career: pick, ...gate }, at);
                  return (
                    <li key={a.key} className={lock ? 'muted' : ''} title={lock ?? undefined}>
                      {stageInfo(gate, pick).icon} {a.icon} {a.label} <small>({getDef(a.station).name})</small> {lock ? '🔒' : ''}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <b>🛠️ 업무 동작 {def.work.length}개</b>
              <div className="tour-chips">
                {def.work.map((id) => (
                  <span key={id} className="cx-skill">
                    {label(id)}
                  </span>
                ))}
              </div>
            </div>
            <div className="muted">
              가구 {def.objects.length}개 (업무용 {stations.size}종) · 일 {wp.points.toFixed(0)}점
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
