import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { getDef } from '../game/catalog';
import type { Dir, LookPatch, PlacedObject } from '../game/types';
import { CAREER_BY_ID } from '../game/careers';
import { LOT_PLANS } from '../game/lots';
import { ALL_WORK_LOTS, workLotKey } from '../game/workplace';
import { MAP_H, dims, rotateDir } from '../game/world';
import { LAB_PLAN, holdLab, labGame } from '../view3d/labLot';
import type { LotView } from '../view3d/lot3d';
import { BuyCatalog } from './BuyCatalog';
import { GameView, type Placing } from './GameView';
import { useGame } from './useGame';

const DwellerStyler = lazy(() => import('./DwellerStyler'));

/**
 * The 3D motion lab (ours, a tool for while the 3D is being made): a house with one of each kind
 * of furniture, or any of the homes (upstairs too) or workplaces, its dwellers' needs held still, so any
 * use of any piece can be started from the list and watched up close for as long as it takes, again
 * and again. Nothing is saved.
 */
const ROOMS = ['침실', '욕실', '부엌', '거실'];
/** The camera comes round to the front of a piece, a little to one side. */
const FRONT_YAW: Record<Dir, number> = { down: 0, right: Math.PI / 2, left: -Math.PI / 2, up: Math.PI };

/** The lab's own house by its rooms; elsewhere, floor by floor. */
const groupOf = (lot: string, o: PlacedObject) => {
  if (lot !== 'lab' && lot !== 'more') return `${Math.floor(o.y / MAP_H) + 1}층`;
  const i = LAB_PLAN.rooms.findIndex((r) => o.x >= r.x0 && o.x <= r.x1 && o.y >= r.y0 && o.y <= r.y1);
  return ROOMS[i < 0 ? ROOMS.length - 1 : i];
};
// Every lot, a branch's own (`career@branch`) beside its career's.
const jobOf = (key: string) => CAREER_BY_ID[workLotKey(key).careerId]?.name ?? key;
const WORK_IDS = Object.keys(ALL_WORK_LOTS).sort((a, b) => jobOf(a).localeCompare(jobOf(b), 'ko') || a.localeCompare(b));

export function MotionLab({ onClose }: { onClose: () => void }) {
  const [lot, setLot] = useState('lab');
  // Up here, so what's typed stays when a lot is picked (Lab starts afresh for each).
  const [search, setSearch] = useState('');
  return <Lab key={lot} lot={lot} setLot={setLot} search={search} setSearch={setSearch} onClose={onClose} />;
}

function Lab({ lot, setLot, search, setSearch, onClose }: { lot: string; setLot: (lot: string) => void; search: string; setSearch: (s: string) => void; onClose: () => void }) {
  const game = useMemo(() => labGame(lot), [lot]);
  useGame(game);
  const view = useRef<LotView | null>(null);
  const [dwellerId, setDwellerId] = useState(() => game.state.activeDwellerId);
  const [repeat, setRepeat] = useState(true);
  const [open, setOpen] = useState<number | null>(null);
  /** The edit window: for the dweller's look (`all`), or what a wardrobe or mirror use puts on. */
  const [styling, setStyling] = useState<{ o?: PlacedObject; id?: string } | null>(null);
  // Buy and build mode, to try furniture anywhere (upstairs too).
  const [mode, setMode] = useState<'live' | 'buy'>('live');
  const [placing, setPlacing] = useState<Placing | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if ((e.key === 'r' || e.key === 'R') && placing) setPlacing({ ...placing, dir: rotateDir(placing.dir) });
      else if (e.key === 'Escape') setPlacing(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [placing]);
  /** What was last asked of each dweller, to start again when it ends. */
  const asked = useRef(new Map<number, { uid: number; id: string }>());

  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __game?: unknown }).__game = game;
    holdLab(game);
    const id = window.setInterval(() => {
      holdLab(game);
      if (!repeat) return;
      for (const [sid, a] of asked.current) {
        const s = game.dweller(sid);
        if (s && !s.queue.length) game.enqueue(sid, { kind: 'interact', objectUid: a.uid, interactionId: a.id, autonomous: false });
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [game, repeat]);

  const dweller = game.dweller(dwellerId)!;
  const other = game.state.dwellers.find((s) => s.id !== dwellerId && !s.npc);
  const clear = (sid: number) => {
    asked.current.delete(sid);
    for (const a of [...(game.dweller(sid)?.queue ?? [])]) game.cancel(sid, a.id);
  };
  const focus = (o: PlacedObject) => {
    const { w, h } = dims(getDef(o.defId), o.dir);
    // Close enough for hands on a small piece; a mock-up or a van is seen whole.
    view.current?.focusOn(o.x + w / 2, (o.y % MAP_H) + h / 2, Math.max(3.6, 1.4 * Math.max(w, h)), FRONT_YAW[o.dir] + 0.6, 0.42);
  };
  const run = (o: PlacedObject, id: string, look?: LookPatch) => {
    // The wardrobe and the mirror: the new look picked first.
    if (!look && getDef(o.defId).interactions.find((i) => i.id === id)?.restyle) return setStyling({ o, id });
    clear(dwellerId);
    game.setActive(dwellerId);
    game.enqueue(dwellerId, { kind: 'interact', objectUid: o.uid, interactionId: id, autonomous: false, ...(look ? { look } : {}) });
    asked.current.set(dwellerId, { uid: o.uid, id });
    if (game.state.speed === 0) game.setSpeed(1);
    focus(o);
  };
  const talk = () => {
    if (!other) return;
    clear(dwellerId);
    clear(other.id);
    const first = game.socialMenu(dweller, other).find((m) => !m.disabled);
    if (first) game.enqueue(dwellerId, { kind: 'social', targetId: other.id, socialId: first.id, autonomous: false });
  };
  const doing = (sid: number) => {
    const s = game.dweller(sid);
    const a = s?.queue[0];
    if (!s || !a) return '쉬는 중';
    const { icon, label } = game.actionLabel(a);
    return `${icon} ${label}${s.run?.phase === 'performing' ? '' : ' (가는 중)'}`;
  };
  const hour = Math.floor((game.state.time % 1440) / 60);
  const setHour = (h: number) => (game.state.time = Math.floor(game.state.time / 1440) * 1440 + h * 60);

  const objects = game.state.objects.filter((o) => getDef(o.defId).interactions.length).sort((a, b) => a.y - b.y || a.x - b.x);
  const groups = [...new Set(objects.map((o) => groupOf(lot, o)))];
  const word = search.trim().toLowerCase();
  const found = (...names: string[]) => !word || names.some((n) => n.toLowerCase().includes(word));
  const homes = LOT_PLANS.filter((p) => found(p.name, p.id) || lot === `home:${p.id}`); // The one shown stays listed.
  const works = WORK_IDS.filter((id) => found(jobOf(id), ALL_WORK_LOTS[id].name, id) || lot === `work:${id}`);
  const hit = [...works.map((id) => `work:${id}`), ...homes.map((p) => `home:${p.id}`)];
  const first = hit.find((l) => l !== lot) ?? null;
  return (
    <div className="tour lab">
      <aside className="tour-list">
        <div className="tour-head">
          <button className="ghost" onClick={onClose}>
            ← 시작 화면
          </button>
          <b>🧪 동작 실험실</b>
        </div>
        <input
          className="lab-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && word && first) setLot(first);
          }}
          placeholder="🔍 근무지·집 검색 (Enter로 첫 결과)"
          aria-label="부지 검색"
        />
        <select className="lab-lot" value={lot} onChange={(e) => setLot(e.target.value)} aria-label="부지">
          <option value="lab">🧪 실험실 집 (가구 종류별로 하나씩)</option>
          <option value="more">🧪 실험실 집 2 (고급형·큰 가구)</option>
          <optgroup label="🏠 집">
            {homes.map((p) => (
              <option key={p.id} value={`home:${p.id}`}>
                {p.name}
                {p.upper ? ' (2층)' : ''}
              </option>
            ))}
          </optgroup>
          <optgroup label="🏢 근무지">
            {works.map((id) => (
              <option key={id} value={`work:${id}`}>
                {jobOf(id)} · {ALL_WORK_LOTS[id].name}
              </option>
            ))}
          </optgroup>
        </select>
        <p className="muted small">욕구가 줄지 않아요. 가구의 동작을 누르면 고른 캐릭터가 그 동작을 하고, 카메라가 그 가구로 가요. 저장되지 않아요.</p>
        {groups.map((name) => (
          <div key={name}>
            <div className="tour-group">{name}</div>
            {objects
              .filter((o) => groupOf(lot, o) === name)
              .map((o) => {
                const def = getDef(o.defId);
                const menu = game.objectMenu(dweller, o).filter((m) => !m.id.startsWith('upgrade_'));
                return (
                  <div key={o.uid} className="lab-obj">
                    <button className={`cx-row ${open === o.uid ? 'on' : ''}`} onClick={() => (setOpen(open === o.uid ? null : o.uid), focus(o))}>
                      <span>
                        {def.icon} {def.name}
                      </span>
                      <span className="muted">{menu.length}</span>
                    </button>
                    {open === o.uid && (
                      <div className="tour-chips">
                        {menu.map((m) => (
                          <button key={m.id} className="chip" disabled={!!m.disabled} title={m.disabled ?? m.label} onClick={() => run(o, m.id)}>
                            {m.icon} {m.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        ))}
      </aside>
      <main className="tour-main">
        <div className="tour-bar">
          {game.state.dwellers
            .filter((s) => !s.npc)
            .map((s) => (
              <button key={s.id} className={`ghost small ${s.id === dwellerId ? 'on' : ''}`} onClick={() => (setDwellerId(s.id), game.setActive(s.id))} title={doing(s.id)}>
                {s.name} · <span className="muted">{doing(s.id)}</span>
              </button>
            ))}
          <button className="ghost small" onClick={() => setStyling({})} title="고른 캐릭터의 이름·얼굴·머리·옷을 바꿔요">
            ✏️ 외모
          </button>
          <button className="ghost small" onClick={talk} disabled={!other} title="고른 캐릭터가 다른 캐릭터에게 말을 걸어요">
            💬 서로 대화
          </button>
          <button
            className={`ghost small ${mode === 'buy' ? 'on' : ''}`}
            onClick={() => {
              if (mode === 'buy') game.leaveBuyMode();
              else game.enterBuyMode();
              setMode(mode === 'buy' ? 'live' : 'buy');
              setPlacing(null);
            }}
            title="가구를 사서 놓고, 벽·바닥·방을 지어요 (2층에도)"
          >
            🛒 구매·건축
          </button>
          <button className="ghost small" onClick={() => game.state.dwellers.forEach((s) => clear(s.id))}>
            모두 멈추기
          </button>
          <label className="small">
            <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} /> 끝나면 다시
          </label>
          <span className="tour-clock">
            <button className={`ghost small ${hour >= 7 && hour < 19 ? 'on' : ''}`} onClick={() => setHour(12)}>
              ☀️ 낮
            </button>
            <button className={`ghost small ${hour >= 19 || hour < 7 ? 'on' : ''}`} onClick={() => setHour(22)}>
              🌙 밤
            </button>
            {[0, 1, 2, 3].map((s) => (
              <button key={s} className={`ghost small ${game.state.speed === s ? 'on' : ''}`} onClick={() => game.setSpeed(s)}>
                {['멈춤', '1×', '2×', '3×'][s]}
              </button>
            ))}
          </span>
        </div>
        <div className={`lab-stage ${mode === 'buy' ? 'with-catalog' : ''}`}>
          <GameView game={game} mode={mode} placing={placing} setPlacing={setPlacing} onView={(v) => (view.current = v)} />
          {mode === 'buy' && <BuyCatalog game={game} placing={placing} setPlacing={setPlacing} />}
          {styling && (
            <Suspense fallback={null}>
              <DwellerStyler
                game={game}
                dweller={dweller}
                mode={styling.o ? getDef(styling.o.defId).interactions.find((i) => i.id === styling.id)!.restyle! : 'all'}
                onCancel={() => setStyling(null)}
                onDone={(look) => {
                  if (styling.o) run(styling.o, styling.id!, look);
                  else game.restyle(dweller.id, look);
                  setStyling(null);
                }}
              />
            </Suspense>
          )}
        </div>
      </main>
    </div>
  );
}
