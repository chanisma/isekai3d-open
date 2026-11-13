import { useEffect, useMemo, useRef, useState } from 'react';
import { HAIR_COLORS, SHIRT_COLORS, SKIN_COLORS } from '../game/constants';
import type { Bottom, HairStyle, Outfit } from '../game/types';
import { BOTTOMS, HAIR_STYLES, OUTFITS, PANTS_COLORS, figureLook } from '../game/looks';
import type { Stage } from '../dweller3d/figure';
import { models, outfitFile, PICKED_ONLY, type ModelInfo, type Outfit as VrmOutfit } from '../view3d/vrm';
import { PIECES, type Dress, type Piece } from '../view3d/vrmDress';
import { dressFor, wearsOf } from '../view3d/vrmLooks';
import { GARMENT_SETS, fitsSet } from '../view3d/garments';
import { WardrobeView, type WardrobeBody, type WardrobePose } from '../view3d/wardrobe3d';

/**
 * Trying on clothes and hair (ours, a tool for while the 3D is being made). Our shape figure takes
 * any hair, outfit and colours. A VRoid character changes into its own outfit files
 * (`<name>@sleep.vrm` and so on, models/README.md), and on the dev server its hair and each piece
 * of its clothes can be recoloured or swapped for another character's (vrmDress.ts; the samples'
 * own licence prohibits modification, so this stays on the dev server). Changing, the dweller steps
 * into the fitting room and comes out in the new clothes. Nothing is saved.
 *
 * A character is picked once and then one of their ages. They can be shown in their full body
 * (`@base`, underwear) or as their bare skeleton, and in the new garment sets (garments.ts, not yet
 * offered in character creation). Only what fits their gender and age is offered, as in character
 * creation: the hair, clothes and outfit files of that stage, the sets made for it.
 */
type View = 'worn' | 'base' | 'bones';
const STAGES: Array<[Stage, string]> = [
  ['toddler', '유아'],
  ['child', '어린이'],
  ['teen', '십대'],
  ['adult', '어른'],
  ['elder', '노인'],
];
const PIECE_NAMES: Record<Piece, string> = { hair: '헤어', tops: '상의', bottoms: '하의', shoes: '신발' };
const PIECE_COLORS: Record<Piece, string[]> = {
  hair: ['#2b1b10', '#5b3a1e', '#a0522d', '#e0b04a', '#f2d6a2', '#1a1a1a', '#b0b0b0', '#c2185b', '#5e35b1', '#1e88e5'],
  tops: [...SHIRT_COLORS, '#fafafa', '#212121'],
  bottoms: [...PANTS_COLORS, '#212121'],
  shoes: ['#3b3442', '#5d4037', '#fafafa', '#c62828', '#1565c0', '#212121'],
};
const CHANGES: Array<[VrmOutfit | undefined, string]> = [
  [undefined, '평상복'],
  ['sleep', '잠옷'],
  ['athletic', '운동복'],
  ['bathing', '목욕'],
  ['formal', '정장'],
];

interface Spec {
  gender: 'female' | 'male';
  stage: Stage;
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  outfit: Outfit;
  shirt: string;
  bottom: Bottom;
  pants: string;
}

function Swatches({ colors, value, onPick }: { colors: string[]; value: string; onPick: (c: string) => void }) {
  return (
    <div className="ward-swatches">
      {colors.map((c) => (
        <button key={c} className={c === value ? 'on' : ''} style={{ background: c }} onClick={() => onPick(c)} aria-label={c} />
      ))}
    </div>
  );
}

function Chips<T extends string>({ items, value, onPick }: { items: Array<[T, string]>; value: T; onPick: (v: T) => void }) {
  return (
    <div className="tour-chips">
      {items.map(([id, label]) => (
        <button key={id} className={`chip ${id === value ? 'on' : ''}`} onClick={() => onPick(id)}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function Wardrobe({ onClose }: { onClose: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<WardrobeView | null>(null);
  const [roster, setRoster] = useState<ModelInfo[]>([]);
  const [who, setWho] = useState<'shape' | string>('shape');
  const [change, setChange] = useState<VrmOutfit | undefined>(undefined);
  const [pose, setPose] = useState<WardrobePose>('stand');
  const [viaRoom, setViaRoom] = useState(true);
  const [info, setInfo] = useState('');
  const [dress, setDress] = useState<Dress>({});
  /** A VRoid character dressed as a dweller of the look below (as the game does), not by hand. */
  const [asDweller, setAsDweller] = useState(false);
  const [view3, setView3] = useState<View>('worn');
  const [garment, setGarment] = useState<string>('');
  const dressPiece = (p: Piece, d: Dress[Piece]) => setDress((x) => ({ ...x, [p]: d && (d.color || d.from) ? d : undefined }));
  const [spec, setSpec] = useState<Spec>({ gender: 'female', stage: 'adult', skin: SKIN_COLORS[1], hair: HAIR_COLORS[1], hairStyle: 'long', outfit: 'tee', shirt: SHIRT_COLORS[6], bottom: 'skirt', pants: PANTS_COLORS[0] });
  const set = (p: Partial<Spec>) => setSpec((s) => ({ ...s, ...p }));

  useEffect(() => {
    void models().then(setRoster);
    const v = new WardrobeView(host.current!);
    view.current = v;
    if (import.meta.env.DEV) (window as unknown as { __ward?: WardrobeView }).__ward = v;
    v.onLoaded = (_b, text) => setInfo(text);
    const ro = new ResizeObserver(() => v.resize());
    ro.observe(host.current!);
    return () => {
      ro.disconnect();
      v.dispose();
    };
  }, []);

  // Characters (the garment sets, `npc_garment_…`, and the hair-only files, only a hair since 2026-10-25, aren't), each once, then their ages.
  const bases = roster.filter((m) => !m.outfit && !m.kept);
  const base = bases.find((m) => m.file === who);
  const people = [...new Map(bases.map((m) => [`${m.gender}-${m.name}`, m])).values()];
  const agesOf = (m: ModelInfo) => STAGES.filter(([st]) => bases.some((x) => x.gender === m.gender && x.name === m.name && x.stage === st));
  const pickPerson = (m: ModelInfo) => {
    // The same age if they have it, else grown up, else their first.
    const keep = base && bases.find((x) => x.gender === m.gender && x.name === m.name && x.stage === base.stage);
    setWho((keep ?? bases.find((x) => x.gender === m.gender && x.name === m.name && x.stage === 'adult') ?? m).file);
  };
  const baseFile = base && roster.find((m) => m.outfit === 'base' && m.gender === base.gender && m.stage === base.stage && m.name === base.name)?.file;
  const sets = base ? GARMENT_SETS.filter((g) => fitsSet(g, base.gender, base.stage) && roster.some((m) => m.file === g.file(base.gender, base.stage))) : [];
  // What a character of this gender and age can wear: the hair any of them has (an NPC's too, as the
  // game borrows it), the clothes of our characters (vrmLooks `hairsFor`, `garmentsFor`).
  const peers = base ? roster.filter((m) => !m.outfit && m.gender === base.gender && m.stage === base.stage) : [];
  const hairOk = new Set<string | undefined>(peers.map((m) => wearsOf(m)?.hair));
  const ours = peers.filter((m) => !m.kept && !PICKED_ONLY.has(m.name)).map(wearsOf);
  const topOk = new Set<string | undefined>(ours.map((w) => w?.top));
  const bottomOk = new Set<string | undefined>(ours.map((w) => w?.bottom));
  const only = <T extends string>(items: Array<[T, string]>, ok: Set<string | undefined>) => (base ? items.filter(([id]) => ok.has(id)) : items);
  const set3 = sets.find((g) => g.id === garment);
  const body: WardrobeBody = useMemo(() => {
    if (base && view3 === 'bones') return { kind: 'vroid', file: baseFile ?? base.file, bones: true };
    if (base && view3 === 'base' && baseFile) return { kind: 'vroid', file: baseFile };
    if (base && set3) return { kind: 'vroid', file: outfitFile(roster, base, change), garment: set3.file(base.gender, base.stage) };
    if (base && asDweller) return { kind: 'vroid', ...dressFor(roster, base, figureLook({ ...spec, gender: base.gender, age: base.stage === 'adult' ? undefined : base.stage }, change), change, 0) };
    if (base) return { kind: 'vroid', file: outfitFile(roster, base, change), dress };
    return { kind: 'shape', look: figureLook({ ...spec, age: spec.stage === 'adult' ? undefined : spec.stage }, change) };
  }, [base, roster, change, spec, dress, asDweller, view3, baseFile, set3]);
  // A new character (or age) starts in their own clothes, hair and kinds, and in an outfit they have.
  useEffect(() => {
    setDress({});
    const w = base && wearsOf(base);
    if (w) set({ hairStyle: w.hair, outfit: w.top, ...(w.bottom ? { bottom: w.bottom } : {}) });
    if (!has(change)) setChange(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [who]);
  const first = useRef(true);
  useEffect(() => {
    view.current?.wear(body, viaRoom && !first.current);
    first.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(body)]);
  useEffect(() => {
    if (view.current) view.current.pose = pose;
  }, [pose]);

  const has = (o: VrmOutfit | undefined) => !base || !o || roster.some((m) => m.outfit === o && m.name === base.name && m.gender === base.gender && m.stage === base.stage);
  return (
    <div className="gallery">
      <aside className="gallery-side ward-side">
        <div className="tour-head">
          <button className="ghost" onClick={onClose}>
            ← 시작 화면
          </button>
          <b>👗 옷장 (개발용)</b>
        </div>
        <div className="tour-group">캐릭터</div>
        <div className="tour-chips">
          <button className={`chip ${who === 'shape' ? 'on' : ''}`} onClick={() => setWho('shape')}>
            🙂 도형 캐릭터
          </button>
          {people.map((m) => (
            <button key={m.file} className={`chip ${base?.gender === m.gender && base.name === m.name ? 'on' : ''}`} onClick={() => pickPerson(m)}>
              🧍 {m.name} ({m.gender === 'female' ? '여' : '남'})
            </button>
          ))}
        </div>
        {base && agesOf(base).length > 1 && (
          <>
            <div className="tour-group">나이</div>
            <Chips items={agesOf(base)} value={base.stage} onPick={(st) => setWho(bases.find((x) => x.gender === base.gender && x.name === base.name && x.stage === st)!.file)} />
          </>
        )}
        {base && (
          <>
            <div className="tour-group">보기</div>
            <div className="tour-chips">
              <button className={`chip ${view3 === 'worn' ? 'on' : ''}`} onClick={() => setView3('worn')}>옷 입은 모습</button>
              <button className={`chip ${view3 === 'base' ? 'on' : ''}`} disabled={!baseFile} onClick={() => setView3('base')} title={baseFile ? '속옷만 입은 온전한 몸 (@base)' : '이 캐릭터는 기본 몸 파일이 없어요'}>
                기본 몸 (속옷){baseFile ? '' : ' ⚠'}
              </button>
              <button className={`chip ${view3 === 'bones' ? 'on' : ''}`} onClick={() => setView3('bones')} title="옷과 몸을 모두 숨기고 뼈대만 그려요">
                뼈대만
              </button>
            </div>
          </>
        )}
        {base && view3 === 'worn' && (
          <>
            <div className="tour-group">새 의상 (시제품 · 캐릭터 만들기에는 아직 없음)</div>
            <div className="tour-chips">
              <button className={`chip ${!set3 ? 'on' : ''}`} onClick={() => setGarment('')}>
                없음
              </button>
              {sets.map((g) => (
                <button key={g.id} className={`chip ${set3?.id === g.id ? 'on' : ''}`} onClick={() => setGarment(g.id)}>
                  {g.label}
                </button>
              ))}
            </div>
            {!sets.length && <p className="muted small">이 성별·나이에 맞춰 만든 새 의상이 없어요.</p>}
          </>
        )}
        {!bases.length && <p className="muted small">VRoid 캐릭터는 개발 서버에서 models/ 폴더에 있을 때만 나와요.</p>}
        <div className="tour-group">갈아입기 (참고 게임 옷 종류)</div>
        <div className="tour-chips">
          {CHANGES.map(([id, label]) => (
            <button key={label} className={`chip ${id === change ? 'on' : ''}`} disabled={!has(id)} onClick={() => setChange(id)} title={has(id) ? label : '이 나이에는 이 옷이 없어요'}>
              {label}
            </button>
          ))}
        </div>
        {base && (
          <label className="small">
            <input type="checkbox" checked={asDweller} onChange={(e) => setAsDweller(e.target.checked)} /> 캐릭터 외모로 입히기 (게임처럼: 피부·헤어·옷 종류와 색)
          </label>
        )}
        {base && !asDweller && view3 === 'worn' && !set3 && (
          <>
            <p className="muted small">
              옷 종류는 같은 캐릭터의 옷 파일로 바꿔요: <code>{`${base.gender}-${base.stage}-${base.name}@<sleep|athletic|bathing|formal>.vrm`}</code> (이 나이에 없는 옷은 고를 수 없어요). 아래의 색 바꾸기와 다른 캐릭터 것 입히기는 개발 서버에서만 되고, 같은 성별·나이의 캐릭터 것만 나와요(샘플 모델 라이선스는 수정 금지).
            </p>
            {PIECES.map((p) => (
              <div key={p}>
                <div className="tour-group">{PIECE_NAMES[p]}</div>
                <div className="tour-chips">
                  <button className={`chip ${!dress[p]?.from ? 'on' : ''}`} onClick={() => dressPiece(p, { ...dress[p], from: undefined })}>
                    원래 것
                  </button>
                  {bases
                    .filter((m) => m.file !== base.file && m.gender === base.gender && m.stage === base.stage)
                    .map((m) => (
                      <button key={m.file} className={`chip ${dress[p]?.from === m.file ? 'on' : ''}`} onClick={() => dressPiece(p, { ...dress[p], from: m.file })} title={`${m.name}의 ${PIECE_NAMES[p]}을(를) 입혀요`}>
                        {m.name}의 것
                      </button>
                    ))}
                </div>
                <div className="ward-swatches">
                  <button className={`plain ${!dress[p]?.color ? 'on' : ''}`} onClick={() => dressPiece(p, { ...dress[p], color: undefined })} title="원래 색">
                    ↺
                  </button>
                  {PIECE_COLORS[p].map((c) => (
                    <button key={c} className={dress[p]?.color === c ? 'on' : ''} style={{ background: c }} onClick={() => dressPiece(p, { ...dress[p], color: c })} aria-label={c} />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
        {(!base || asDweller) && (
          <>
            {!base && (
              <>
                <div className="tour-group">성별 · 나이</div>
                <Chips items={[['female', '여성'], ['male', '남성']]} value={spec.gender} onPick={(gender) => set({ gender })} />
                <Chips items={STAGES} value={spec.stage} onPick={(stage) => set({ stage })} />
              </>
            )}
            <div className="tour-group">피부</div>
            <Swatches colors={SKIN_COLORS} value={spec.skin} onPick={(skin) => set({ skin })} />
            <div className="tour-group">헤어</div>
            <Chips items={only(HAIR_STYLES, hairOk)} value={spec.hairStyle} onPick={(hairStyle) => set({ hairStyle })} />
            <Swatches colors={HAIR_COLORS} value={spec.hair} onPick={(hair) => set({ hair })} />
            <div className="tour-group">상의</div>
            <Chips items={only(OUTFITS, topOk)} value={spec.outfit} onPick={(outfit) => set({ outfit })} />
            <Swatches colors={SHIRT_COLORS} value={spec.shirt} onPick={(shirt) => set({ shirt })} />
            <div className="tour-group">하의</div>
            <Chips items={only(BOTTOMS, bottomOk)} value={spec.bottom} onPick={(bottom) => set({ bottom })} />
            <Swatches colors={PANTS_COLORS} value={spec.pants} onPick={(pants) => set({ pants })} />
          </>
        )}
      </aside>
      <main className="gallery-main">
        <div className="tour-bar">
          <Chips items={[['stand', '서 있기'], ['walk', '걷기'], ['sit', '앉기']]} value={pose} onPick={setPose} />
          <label className="small">
            <input type="checkbox" checked={viaRoom} onChange={(e) => setViaRoom(e.target.checked)} /> 피팅룸에 들어가서 갈아입기
          </label>
          <span className="tour-clock muted small">{info}</span>
        </div>
        <div className="gallery-stage" ref={host} />
        <p className="hint">끌어서 돌리기 · 휠 확대 · 오른쪽 끌기 이동</p>
      </main>
    </div>
  );
}
