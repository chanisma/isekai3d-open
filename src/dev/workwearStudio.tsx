import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CAREERS, CAREER_BY_ID } from '../game/careers';
import { WORK_CLOTHES, WORK_DRESS, workClothesFor, type WorkClothes } from '../game/workClothes';
import { STAGE_INFO } from '../game/workStages';
import { stageOf } from '../game/workStages';
import { models, type ModelInfo } from '../view3d/vrm';
import { CareerPreview, careerURL, type CareerAsset } from './careerPreview';

/**
 * The work clothes studio (prototypes/workwear.html, dev server only): a set of work clothes on our
 * grown-ups in each of its colours, and for every career which rank wears what (game/workClothes.ts).
 * Local generated pairs live in prototypes/generated/workwear, outside the live model catalog.
 */

const view = new CareerPreview(document.querySelector('#viewport')!);
(window as unknown as { __work?: CareerPreview }).__work = view;
const status = document.querySelector('#status')!;
view.onStatus = text => { status.textContent = text; };
window.addEventListener('pagehide', () => view.dispose(), { once: true });
if (import.meta.hot) import.meta.hot.dispose(() => view.dispose());

const CAMS: Array<[string, [number, number, number], [number, number, number]]> = [
  ['전신', [0, 0.8, 0], [0, 0.95, 3.1]],
  ['상의', [0, 1.22, 0], [0, 1.28, 1.05]],
  ['옆', [0, 0.85, 0], [2.6, 0.95, 0.7]],
  ['뒤', [0, 0.85, 0], [0, 0.95, -3.1]],
];
function camera(i: number) {
  const [, t, c] = CAMS[i];
  const w = view as unknown as { controls: { target: { set(...v: number[]): void }; update(): void }; camera: { position: { set(...v: number[]): void } } };
  w.controls.target.set(...t);
  w.camera.position.set(...c);
  w.controls.update();
}
const cams = document.querySelector('#cams')!;
CAMS.forEach(([label], i) => {
  const b = document.createElement('button');
  b.textContent = label;
  b.onclick = () => camera(i);
  cams.append(b);
});

for (const [kind,label] of [['stand','서기'],['walk','걷기'],['sit','앉기']] as const) {
  const button=document.createElement('button');button.textContent=label;button.onclick=()=>{view.pose=kind;};cams.append(button);
}

const setFile = (gender: 'female' | 'male', set: string) => `${gender}-adult-npc_garment_${set}.vrm`;


/** Every rung of a career (shared, then each branch) and what it wears. */
function ladder(careerId: string): Array<{ branch?: string; rungs: Array<{ title: string; stage: string; wear: WorkClothes | null }> }> {
  const c = CAREER_BY_ID[careerId];
  const row = (title: string, level: number, branch?: number) => {
    const job = { careerId, level, branch };
    return { title, stage: STAGE_INFO[stageOf(job).stage].label, wear: workClothesFor(job) };
  };
  return [
    { rungs: c.levels.map((l, i) => row(l.title, i)) },
    ...(c.branches ?? []).map((b, bi) => ({ branch: b.name, rungs: b.levels.map((l, i) => row(l.title, c.levels.length + i, bi)) })),
  ];
}

/** The jobs and ranks a set of clothes is worn by, for its caption. */
function wornBy(id: string): string {
  const names: string[] = [];
  for (const [careerId, rules] of Object.entries(WORK_DRESS)) {
    if (!rules.some((r) => r.wear === id)) continue;
    const titles = ladder(careerId).flatMap((g) => g.rungs.filter((r) => r.wear?.id === id).map((r) => r.title));
    names.push(`${CAREER_BY_ID[careerId].name} (${titles.length > 3 ? `${titles[0]} 외 ${titles.length - 1}` : titles.join(', ')})`);
  }
  return names.join(' · ');
}

function Studio({ roster, assets }: { roster: ModelInfo[]; assets: CareerAsset[] }) {
  const people = useMemo(() => roster.filter((m) => m.stage === 'adult' && !m.outfit && !m.kept && !m.name.startsWith('sample')), [roster]);
  const sets = useMemo(() => [...new Set(Object.values(WORK_CLOTHES).map((c) => c.set))].filter((s) => s !== 'formal'), []);
  const made = (set: string) => assets.some(a => a.set === set) || roster.some((m) => m.file === setFile('female', set) || m.file === setFile('male', set));
  const [set, setSet] = useState(sets.find(made) ?? sets[0]);
  const variants = Object.values(WORK_CLOTHES).filter((c) => c.set === set);
  const [who, setWho] = useState(people.find((m) => m.name === 'mina')?.file ?? people[0]?.file);
  const [variant, setVariant] = useState(variants[0]?.id);
  const [career, setCareer] = useState('nurse');
  const [roleId,setRoleId]=useState('');
  const person = people.find((m) => m.file === who);
  const roleAsset=assets.find(a=>a.role&&a.variant===roleId&&a.gender===person?.gender);
  const clothes = useMemo(()=>{
    if(roleAsset?.role){const r=roleAsset.role,b=WORK_CLOTHES[r.base];return {...b,id:r.id,label:r.label,set:r.set,tint:r.tint??b.tint,pieces:roleAsset.pieces};}
    return WORK_CLOTHES[variant] ?? variants[0];
  },[roleAsset,variant,set]);
  const roleOptions=assets.filter(a=>a.role?.career===career&&a.gender===person?.gender);
  const selectRole=(a:CareerAsset)=>{setRoleId(a.variant!);setSet(a.set);setVariant(a.role!.base);};

  const localAsset = roleAsset ?? assets.find(a => a.variant === clothes?.id && a.gender === person?.gender)
    ?? assets.find(a => a.set === clothes?.set && a.gender === person?.gender);
  useEffect(() => {
    if (!person || !clothes) return;
    if (localAsset) {
      status.textContent = `${clothes.label} · 로컬 의상 불러오는 중…`;
      void view.wearCareer(person.file, clothes, localAsset).catch(() => {});
      return;
    }
    const file = setFile(person.gender, clothes.set);
    if (!roster.some((m) => m.file === file)) {
      status.textContent = `${clothes.label}: 아직 만들지 않은 옷이에요 (${file}). 자기 옷으로 보여요.`;
      view.wear({ kind: 'vroid', file: person.file }, false);
      return;
    }
    const dress = Object.fromEntries(clothes.pieces.map((p) => [p, { from: file, ...(clothes.tint?.[p] ? { color: clothes.tint[p] } : {}) }]));
    view.wear({ kind: 'vroid', file: person.file, dress }, false);
    status.textContent = `${person.name} · ${clothes.label} — ${file} (${clothes.pieces.join(', ')}), 기본 몸에 입힘`;
  }, [person, clothes, roster, localAsset]);

  return (
    <>
      <small style={{ fontSize: 10, letterSpacing: 2, color: '#6a756c' }}>{set.toUpperCase()} 01</small>
      <h1>{clothes?.label ?? set}</h1>
      <p>{localAsset ? `성인 ${person?.gender === 'female' ? '여성' : '남성'}용 별도 패턴 · ${(localAsset.bytes/1024).toFixed(0)} KB · 로컬 시제품` : made(set) ? '기존 의상 사용' : '해당 성별·연령용 의상이 아직 없습니다.'}</p>
      {localAsset && <p><a href={careerURL(localAsset.glb)} download>의상 GLB</a> · <a href={careerURL(localAsset.file)} download>의상 VRM</a><br/><small>DB 업로드·게임 카탈로그 반영 없음. 신발은 캐릭터의 기존 신발을 사용합니다.</small></p>}
      <h2>직업 · 역할별 디자인</h2>
      <select aria-label="직업 선택" value={career} onChange={e=>{const id=e.target.value;setCareer(id);const a=assets.find(a=>a.role?.career===id&&a.gender===person?.gender);if(a)selectRole(a);else setRoleId('');}} style={{width:'100%'}}>
        {CAREERS.filter(c=>c.id!=='school').map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <div className="buttons">{roleOptions.map(a=><button key={a.variant} aria-pressed={a.variant===roleId} onClick={()=>selectRole(a)}>{a.role!.label}</button>)}</div>
      {roleAsset?.role&&<p>{roleAsset.role.description}<br/><small>역할별 로컬 시안입니다. 게임의 자동 직업복 규칙에는 아직 반영하지 않았습니다.</small></p>}
      {!roleOptions.length&&<p><small>아래 기본 직업복·직급 규칙에서 선택할 수 있습니다.</small></p>}

      <h2>옷</h2>
      <div className="buttons">
        {sets.map((s) => (
          <button key={s} aria-pressed={s === set&&!roleId} onClick={() => { setRoleId('');setSet(s); setVariant(Object.values(WORK_CLOTHES).find((c) => c.set === s)?.id ?? ''); }} title={made(s) ? '만든 옷' : '아직 없음'}>
            {Object.values(WORK_CLOTHES).find(c=>c.set===s)?.label ?? s}{made(s) ? '' : ' ·'}
          </button>
        ))}
      </div>

      <h2>캐릭터 (성인)</h2>
      <div className="buttons">
        {people.map((m) => (
          <button key={m.file} aria-pressed={m.file === who} onClick={() => setWho(m.file)}>{m.name} ({m.gender === 'female' ? '여' : '남'})</button>
        ))}
      </div>

      <h2>색 · 누가 입나</h2>
      {variants.map((c) => (
        <button key={c.id} className="variant" aria-pressed={c.id === clothes?.id} onClick={() => {setRoleId('');setVariant(c.id);}}>
          <i style={{ background: c.tint?.tops ?? '#f4f4f4' }} />
          <span>
            {c.label}
            <small>{wornBy(c.id) || '아직 쓰는 직업 없음'}</small>
          </span>
        </button>
      ))}

      <h2>직업별 직위와 옷</h2>
      <select value={career} onChange={e=>{const id=e.target.value;setCareer(id);const a=assets.find(a=>a.role?.career===id&&a.gender===person?.gender);if(a)selectRole(a);else setRoleId('');}} style={{ width: '100%' }}>
        {CAREERS.filter((c) => !['school'].includes(c.id)).map((c) => (
          <option key={c.id} value={c.id}>{c.name}{WORK_DRESS[c.id] ? ' ●' : ''}</option>
        ))}
      </select>
      <table>
        <tbody>
          {ladder(career).flatMap((g, gi) => [
            ...(g.branch ? [<tr key={`b${gi}`}><td className="branch" colSpan={2}>{g.branch}</td></tr>] : []),
            ...g.rungs.map((r, ri) => (
              <tr key={`${gi}-${ri}`}>
                <td>{r.title} <span style={{ opacity: 0.6 }}>· {r.stage}</span></td>
                <td>
                  {!r.wear ? <span className="tag own">자기 옷</span>
                    : r.wear.set === 'formal' ? <span className="tag suit">자기 정장</span>
                    : <button className={`tag ${made(r.wear.set) ? 'made' : 'todo'}`} style={{ border: 0, padding: '1px 7px' }} onClick={() => { setRoleId('');setSet(r.wear!.set); setVariant(r.wear!.id); }}>
                        {r.wear.label}{made(r.wear.set) ? '' : ' (아직 없음)'}
                      </button>}
                </td>
              </tr>
            )),
          ])}
        </tbody>
      </table>
    </>
  );
}

void Promise.all([models(), fetch('/prototypes/generated/workwear/manifest.json').then(r=>r.ok?r.json():[]).catch(()=>[]) as Promise<CareerAsset[]>]).then(([roster,assets]) => {
  Object.assign(window, { __careerAssets: assets });
  createRoot(document.querySelector('#panel')!).render(<Studio roster={roster} assets={assets} />);
  setTimeout(() => camera(0), 500);
});
