import { useEffect, useMemo, useRef, useState } from 'react';
import { CATALOG, getDef } from '../game/catalog';
import { WORKPLACES } from '../game/workplace';
import { kindOf } from '../view3d/furniture3d';
import { GalleryView, Thumbnails } from '../view3d/gallery3d';

/**
 * Every asset in the game in 3D (ours, a tool for while the 3D is being made): the whole
 * catalogue as thumbnails, by family or searched for, and the one picked large on a turntable
 * beside a grown-up for scale, with where it's sat on (blue) and worked at (orange) marked.
 * Nothing is saved.
 */
const USED_AT = new Map<string, number>();
for (const w of Object.values(WORKPLACES)) for (const o of new Set(w.objects.map((x) => x.defId))) USED_AT.set(o, (USED_AT.get(o) ?? 0) + 1);

export function AssetGallery({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [pick, setPick] = useState(CATALOG[0].id);
  const [person, setPerson] = useState(true);
  const [marks, setMarks] = useState(true);
  const [inUse, setInUse] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<GalleryView | null>(null);
  const thumbs = useMemo(() => new Thumbnails(), []);
  const [shots, setShots] = useState<Record<string, string>>({});

  const kinds = useMemo(() => {
    const n = new Map<string, number>();
    for (const d of CATALOG) n.set(kindOf(d), (n.get(kindOf(d)) ?? 0) + 1);
    return [...n.entries()].sort((a, b) => b[1] - a[1]);
  }, []);
  const q = query.trim().toLowerCase();
  const shown = CATALOG.filter((d) => (kind === 'all' || kindOf(d) === kind) && (!q || d.name.toLowerCase().includes(q) || d.id.toLowerCase().includes(q)));

  useEffect(() => {
    const v = new GalleryView(host.current!);
    view.current = v;
    const ro = new ResizeObserver(() => v.resize());
    ro.observe(host.current!);
    return () => {
      ro.disconnect();
      v.dispose();
      thumbs.dispose();
    };
  }, [thumbs]);
  useEffect(() => view.current?.show(getDef(pick)), [pick]);
  useEffect(() => {
    if (!view.current) return;
    Object.assign(view.current, { showPerson: person, showMarks: marks, inUse });
  }, [person, marks, inUse]);

  // Thumbnails for what's listed, a few at a time so the page stays responsive.
  useEffect(() => {
    let stop = false;
    const todo = shown.filter((d) => !shots[d.id]).map((d) => d.id);
    const step = () => {
      if (stop || !todo.length) return;
      const batch: Record<string, string> = {};
      for (const id of todo.splice(0, 6)) batch[id] = thumbs.get(getDef(id));
      setShots((s) => ({ ...s, ...batch }));
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    return () => {
      stop = true;
    };
    // Only when the list changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, q]);

  // ← and → step through what's listed.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const step = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : 0;
      if (!step || !shown.length) return;
      e.preventDefault();
      const i = shown.findIndex((d) => d.id === pick);
      setPick(shown[(i + step + shown.length) % shown.length].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shown, pick]);

  const def = getDef(pick);
  return (
    <div className="gallery">
      <aside className="gallery-side">
        <div className="tour-head">
          <button className="ghost" onClick={onClose}>
            ← 시작 화면
          </button>
          <b>🧩 에셋 {CATALOG.length}개</b>
        </div>
        <input className="job-search" placeholder="🔎 이름이나 id" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className="lab-lot" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="계열">
          <option value="all">모든 계열</option>
          {kinds.map(([k, n]) => (
            <option key={k} value={k}>
              {k} ({n})
            </option>
          ))}
        </select>
        <div className="gallery-grid">
          {shown.map((d) => (
            <button key={d.id} className={`gallery-item ${d.id === pick ? 'on' : ''}`} onClick={() => setPick(d.id)} title={`${d.name} · ${d.id} · ${kindOf(d)}`}>
              {shots[d.id] ? <img src={shots[d.id]} alt="" /> : <span className="gallery-wait">{d.icon}</span>}
              <span>{d.name}</span>
            </button>
          ))}
        </div>
      </aside>
      <main className="gallery-main">
        <div className="tour-bar">
          <b>
            {def.icon} {def.name}
          </b>
          <span className="muted">
            {def.id} · {kindOf(def)} · {def.w}×{def.h}칸 · §{def.price}
            {USED_AT.get(def.id) ? ` · 근무지 ${USED_AT.get(def.id)}곳` : ''}
          </span>
          <span className="tour-clock">
            <label className="small">
              <input type="checkbox" checked={inUse} onChange={(e) => setInUse(e.target.checked)} /> 쓰는 중
            </label>{' '}
            <label className="small">
              <input type="checkbox" checked={person} onChange={(e) => setPerson(e.target.checked)} /> 사람 (키 비교)
            </label>{' '}
            <label className="small">
              <input type="checkbox" checked={marks} onChange={(e) => setMarks(e.target.checked)} /> 앉는 곳·손 가는 곳
            </label>
          </span>
        </div>
        <div className="gallery-stage" ref={host} />
        <p className="hint">
          끌어서 돌리기 · 휠 확대 · 오른쪽 끌기 이동 · ←→ 이전/다음 · 파란 점: 앉는 곳, 주황 점: 손 가는 곳 · 동작: {def.interactions.slice(0, 8).map((i) => `${i.icon}${i.label}`).join(' · ') || '없음'}
        </p>
      </main>
    </div>
  );
}
