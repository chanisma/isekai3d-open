import { ShirtPrintEditor } from './ShirtPrintEditor';
import { useEffect, useMemo, useRef, useState } from 'react';
import { HAIR_COLORS, SHIRT_COLORS, SKIN_COLORS } from '../game/constants';
import type { Game } from '../game/game';
import { BOTTOMS, CLOTHES_PRICE, EYE_COLORS, HAIR_STYLES, OUTFITS, PANTS_COLORS, SHOE_COLORS, figureLook, stageOf } from '../game/looks';
import type { Bottom, LookPatch, Outfit, Dweller } from '../game/types';
import { VENUE_BY_ID } from '../game/venues';
import { facesFor, models, type ModelInfo } from '../view3d/vrm';
import type { Part, Piece } from '../view3d/vrmDress';
import { basicsFor, castOf, choicesFor, garmentsFor, garmentsShown, hairShown, hairsFor, shopBasket, shownKinds, wearsOf, type Garment, type GarmentItem } from '../view3d/vrmLooks';
import { WardrobeView, type WardrobeBody } from '../view3d/wardrobe3d';
import { GARMENT_SETS } from '../view3d/garments';
import { ColorPick } from './ColorPick';
import { GarmentIcon } from './GarmentIcon';
import { Icon } from './Icon';

/**
 * Changing a dweller's name and look in play (ours; 참고 게임's Create a Dweller on a dweller in the household): the
 * dweller in front of the fitting room as they'll look. `all` is the edit window (free, straight away:
 * name, face, eyes and skin only, 2026-10-23); the others are what the wardrobe (clothes), the
 * mirror (hair style), the salon (hair style and colour) and the clothes shop (clothes by tab, and
 * the tee print studio) change, picked before the dweller goes.
 */
export type StyleMode = 'all' | 'clothes' | 'hair' | 'salon' | 'shop';

const TITLE: Record<StyleMode, string> = { all: '✏️ 이름·외모 바꾸기', clothes: '👔 옷장', hair: '💇 머리 손질', salon: '💇 미용실', shop: '🛍️ 옷가게' };
const OK: Record<StyleMode, string> = { all: '저장', clothes: '갈아입으러 가기', hair: '손질하러 가기', salon: '미용실 가기', shop: '옷가게 가기' };
/** The faces' names in Korean (their files are romanised). */
const FACE_NAME: Record<string, string> = {
  hana: '하나',
  seoa: '서아',
  dain: '다인',
  mina: '미나',
  jiyu: '지유',
  jiho: '지호',
  junho: '준호',
  woojin: '우진',
  taeo: '태오',
  minjae: '민재',
  // The role characters' faces (vrm.ts `ROLE_CAST`).
  sora: '소라',
  yuna: '유나',
  jiwon: '지원',
  sunhee: '순희',
  eunji: '은지',
  daesung: '대성',
  dosu: '도수',
  minho: '민호',
  saja: '사자',
  gisu: '기수',
};
const faceName = (n: string) => FACE_NAME[n] ?? n;
const TOPS = [...SHIRT_COLORS, '#fafafa', '#f3e5c8', '#1a237e', '#212121'];
const BOTTOMS_C = [...PANTS_COLORS, '#212121'];
const HAIRS = [...HAIR_COLORS, '#f2d6a2', '#c2185b', '#5e35b1', '#1e88e5'];
/** The clothes shop's tabs: a piece each, and the tee print studio (dev server). */
type ShopTab = Garment | 'sets' | 'print';
const SHOP_TABS: Array<[ShopTab, string]> = [
  ['sets', '세트'],
  ['tops', '상의'],
  ['bottoms', '하의'],
  ['shoes', '신발'],
  ['print', '티셔츠 프린트'],
];
/** A garment set's pieces (garments.ts) cost more than everyday clothes: they're designed whole. */
const SET_PRICE = 1.5;
const priceOf = (g: GarmentItem) => Math.round(CLOTHES_PRICE[g.kind] * (g.set ? SET_PRICE : 1));
const setLabel = (id: string) => GARMENT_SETS.find((g) => g.id === id)?.label ?? id;
const setAbout = (id: string) => GARMENT_SETS.find((g) => g.id === id)?.about ?? '';
const TAB_ICON: Record<Garment, GarmentItem['kind']> = { tops: 'tee', bottoms: 'pants', shoes: 'shoes' };
const SHOES = '#5d5361';

function Swatches({ colors, value, onPick, own }: { colors: string[]; value?: string; onPick: (c: string) => void; own?: () => void }) {
  return (
    <div className="ward-swatches">
      {own && (
        <button className={`plain ${!value ? 'on' : ''}`} onClick={own} title="이 얼굴의 원래 색">
          <Icon name="reset" />
        </button>
      )}
      {colors.map((c) => (
        <button key={c} className={c === value ? 'on' : ''} style={{ background: c }} onClick={() => onPick(c)} aria-label={c} />
      ))}
      <ColorPick colors={colors} value={value} onPick={onPick} />
    </div>
  );
}

/**
 * A piece's colours: with several parts (a jacket and its shirt, a dress and its collar), a chip for
 * each in its colour now, and the colours for the one picked; the first is the piece's own colour,
 * the others can go back to theirs (↺).
 */
function PartColours({ parts = [], main, tints = [], palette, onMain, onTint }: { parts?: Part[]; main: string; tints?: string[]; palette: string[]; onMain: (c: string) => void; onTint: (i: number, c: string) => void }) {
  const [sel, setSel] = useState(0);
  const at = sel < parts.length ? sel : 0;
  const colourOf = (i: number) => (i === 0 ? main : tints[i - 1] || parts[i].color);
  return (
    <>
      {parts.length > 1 && (
        <div className="tour-chips">
          {parts.map((p, i) => (
            <button key={p.names.join()} className={`chip part-chip ${i === at ? 'on' : ''}`} onClick={() => setSel(i)} title={`부분 ${i + 1} (${Math.round(p.share * 100)}%)`}>
              <span className="part-dot" style={{ background: colourOf(i) }} /> 부분 {i + 1}
            </button>
          ))}
        </div>
      )}
      {at === 0 ? <Swatches colors={palette} value={main} onPick={onMain} /> : <Swatches colors={palette} value={tints[at - 1] || undefined} onPick={(c) => onTint(at, c)} own={() => onTint(at, '')} />}
    </>
  );
}

function Chips<T extends string>({ items, value, onPick, disabled }: { items: Array<[T, string]>; value?: T; onPick: (v: T) => void; disabled?: boolean }) {
  return (
    <div className="tour-chips">
      {items.map(([id, label]) => (
        <button key={id} className={`chip ${id === value ? 'on' : ''}`} disabled={disabled} onClick={() => onPick(id)}>
          {label}
        </button>
      ))}
    </div>
  );
}

export default function DwellerStyler({ game, dweller, mode, onDone, onCancel }: { game: Game; dweller: Dweller; mode: StyleMode; onDone: (patch: LookPatch, spend?: number) => void; onCancel: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<WardrobeView | null>(null);
  const [roster, setRoster] = useState<ModelInfo[]>([]);
  const [patch, setPatch] = useState<LookPatch>({});
  /** The parts of the clothes shown (`Part`), once the character is dressed. */
  const [parts, setParts] = useState<Partial<Record<Piece, Part[]>>>({});
  const set = (p: LookPatch) => setPatch((x) => ({ ...x, ...p }));
  const now = { ...dweller, ...patch };
  const face = now.face || undefined;
  const stage = stageOf(dweller.age);

  useEffect(() => {
    void models().then(setRoster);
    const v = new WardrobeView(host.current!);
    view.current = v;
    v.onLoaded = (_b, _info, p) => setParts(p);
    const ro = new ResizeObserver(() => v.resize());
    ro.observe(host.current!);
    return () => {
      ro.disconnect();
      v.dispose();
    };
  }, []);

  const look = figureLook(now);
  const cast = castOf(roster, look, { id: dweller.id, face, eyes: now.eyes || undefined, tints: now.tints }, undefined);
  const body: WardrobeBody = useMemo(() => (cast ? { kind: 'vroid', file: cast.file, dress: cast.dress } : { kind: 'shape', look }), [JSON.stringify(cast ?? look)]);
  const first = useRef(true);
  useEffect(() => {
    view.current?.wear(body, mode === 'clothes' && !first.current);
    first.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(body)]);

  const faces = facesFor(roster, look.gender, stage);
  // Only what the 3D can show for their stage (no one of it wears the others), when it's a VRoid character.
  const can = cast ? choicesFor(roster, cast.base, look) : undefined;
  // Hair by number: whose it is for a VRoid character (each looks its own), else the shape figure's styles.
  const hairs: Array<[string, string]> = can ? hairsFor(roster, cast!.base).map((n, i) => [n, String(i + 1)]) : HAIR_STYLES.map(([h], i) => [h, String(i + 1)]);
  const hairNow = can ? hairShown(roster, cast!.base, cast!.dress) : now.hairStyle ?? 'short';
  const hairModel = (n: string) => roster.find((m) => !m.outfit && m.name === n && m.gender === cast?.base.gender && m.stage === cast?.base.stage);
  const pickHair = (h: string) => {
    const w = can ? wearsOf(hairModel(h)!) : undefined;
    set(w ? { hairFrom: h, hairStyle: w.hair } : { hairFrom: '', hairStyle: h as typeof HAIR_STYLES[number][0] });
  };
  const tops = OUTFITS.filter(([t]) => !can || (can.tops as string[]).includes(t));
  const bottoms = BOTTOMS.filter(([b]) => !can || can.bottoms.includes(b));
  const wantTop = now.outfit ?? 'tee';
  const wantBottom = wantTop === 'dress' ? undefined : now.bottom ?? 'pants';
  const shown = cast ? shownKinds(roster, cast.base, cast.dress) : {};
  const label = (items: Array<[string, string]>, id?: string) => items.find(([x]) => x === id)?.[1];
  // What they have on now that the 3D hasn't got: shown as the next best, said so.
  const hairNear = can && (now.hairFrom ? !hairModel(now.hairFrom) : !can.hair.includes(now.hairStyle ?? 'short'));
  const clothesNear = [
    shown.top && shown.top !== wantTop ? `${label(OUTFITS, wantTop)} → ${label(OUTFITS, shown.top)}` : '',
    shown.top && shown.top !== 'dress' && wantBottom && shown.bottom && shown.bottom !== wantBottom ? `${label(BOTTOMS, wantBottom)} → ${label(BOTTOMS, shown.bottom)}` : '',
  ].filter(Boolean);
  const own = cast ? wearsOf(cast.base) : undefined;
  // The 3D clothes: what they own (bought, the basics everyone has, and what they had on when the
  // window opened), and at the shop everything of their stage, priced.
  const garments = cast && own ? garmentsFor(roster, cast.base) : [];
  const basics = new Set(cast && own ? Object.values(basicsFor(roster, cast.base)).map((g) => g.key) : []);
  const had = useMemo(() => {
    const was = castOf(roster, figureLook(dweller), { id: dweller.id, face: dweller.face || undefined, eyes: dweller.eyes || undefined, tints: dweller.tints }, undefined);
    return was && wearsOf(was.base) ? Object.values(garmentsShown(roster, was.base, was.dress)) : [];
  }, [roster, dweller]);
  const owned = new Set([...(dweller.closet ?? []), ...had, ...basics]);
  const wearing = cast ? garmentsShown(roster, cast.base, cast.dress) : {};
  // A set's clothes are sold only as the whole set (2026-10-26, at the user's request): one piece of it on means buying all of it.
  const buying = mode === 'shop' ? shopBasket(garments, owned, Object.values(wearing)) : [];
  const spend = buying.reduce((s, g) => s + priceOf(g), 0);
  const closet = [...new Set([...(dweller.closet ?? []), ...had, ...buying.map((g) => g.key)])];
  const kindName = (g: (typeof garments)[number]) => (g.kind === 'shoes' ? '신발' : label([...OUTFITS, ...BOTTOMS], g.kind) ?? g.kind);
  const garmentName = (g: (typeof garments)[number]) => {
    if (g.set) return `${setLabel(g.set)} ${kindName(g)}`;
    const same = garments.filter((x) => x.piece === g.piece && x.kind === g.kind && !x.set);
    return same.length > 1 || g.kind === 'shoes' ? `${kindName(g)} ${same.indexOf(g) + 1}` : kindName(g);
  };
  const pickGarment = (g: (typeof garments)[number]) => {
    const wear = { ...now.wear, [g.piece]: g.from };
    if (g.piece === 'tops') {
      // Out of a dress into a top: something to wear under it, theirs if they have it.
      const under = g.kind !== 'dress' && !wearing.bottoms && garments.find((x) => x.piece === 'bottoms' && (mode === 'shop' || owned.has(x.key)));
      if (under) wear.bottoms = under.from;
      set({ wear, outfit: g.kind as Outfit, ...(under ? { bottom: under.kind as Bottom } : {}), ...fresh(g.kind === 'dress' || wantTop === 'dress' ? ['tops', 'bottoms'] : ['tops']) });
    } else if (g.piece === 'bottoms') set({ wear, bottom: g.kind as Bottom, ...fresh(['bottoms']) });
    else set({ wear });
  };
  /** A whole set on at once: its top, bottom (none under a dress) and shoes. */
  const sets = [...new Set(garments.filter((g) => g.set).map((g) => g.set!))];
  const piecesOf = (id: string) => garments.filter((g) => g.set === id);
  const setOn = (id: string) => piecesOf(id).every((g) => wearing[g.piece] === g.key);
  const pickSet = (id: string) => {
    const pieces = piecesOf(id);
    const top = pieces.find((g) => g.piece === 'tops');
    const bottom = pieces.find((g) => g.piece === 'bottoms');
    const wear = { ...now.wear };
    for (const g of pieces) wear[g.piece] = g.from;
    set({ wear, ...(top ? { outfit: top.kind as Outfit } : {}), ...(bottom ? { bottom: bottom.kind as Bottom } : {}), ...fresh(['tops', 'bottoms']) });
  };
  const salon = VENUE_BY_ID.salon;
  const cost = mode === 'salon' ? salon?.cost ?? 0 : mode === 'shop' ? spend : 0;
  const name = (now.name ?? '').trim();
  const changed = Object.entries(patch).some(([k, v]) => JSON.stringify((dweller as unknown as Record<string, unknown>)[k]) !== JSON.stringify(v) && !(v === '' && (dweller as unknown as Record<string, unknown>)[k] === undefined));
  const show = { name: mode === 'all', face: mode === 'all', hairStyle: mode === 'hair' || mode === 'salon', hairColor: mode === 'salon', clothes: mode === 'clothes' };
  // The shop opens on the sets when there are any for them (most new clothes come as sets).
  const [tabPicked, setTab] = useState<ShopTab | null>(null);
  const tab: ShopTab = tabPicked ?? (garments.some((g) => g.set) ? 'sets' : 'tops');
  const [kind, setKind] = useState<string>('');
  // A new garment has other parts: their colours start over.
  const fresh = (pieces: Array<'tops' | 'bottoms'>): LookPatch => {
    const t = { ...now.tints };
    for (const p of pieces) delete t[p];
    return { tints: t.tops || t.bottoms ? t : undefined };
  };
  const pickFace = (f: string) => set({ face: f, ...fresh(['tops', 'bottoms']) });
  // A garment set's piece keeps its designed colours (vrmLooks dressing): nothing to colour.
  const setWorn = (p: Garment) => garments.some((g) => g.set && wearing[p] === g.key);
  const colours = (p: Garment) =>
    setWorn(p) ? (
      <p className="muted small">세트 옷은 정해진 색으로 입어요.</p>
    ) : p === 'tops' ? (
      <PartColours parts={parts.tops} main={now.shirt} tints={now.tints?.tops} palette={TOPS} onMain={(shirt) => set({ shirt })} onTint={(i, c) => tint('tops', i, c)} />
    ) : p === 'bottoms' ? (
      <PartColours parts={parts.bottoms} main={now.pants ?? PANTS_COLORS[0]} tints={now.tints?.bottoms} palette={BOTTOMS_C} onMain={(pants) => set({ pants })} onTint={(i, c) => tint('bottoms', i, c)} />
    ) : (
      <Swatches colors={SHOE_COLORS} value={now.shoeColor || undefined} onPick={(shoeColor) => set({ shoeColor })} own={() => set({ shoeColor: '' })} />
    );
  const teeOn = wantTop === 'tee' && (!shown.top || shown.top === 'tee');
  /** A garment drawn in the colour it would be worn in. */
  const tint3d = (g: GarmentItem) => (g.piece === 'tops' ? now.shirt : g.piece === 'bottoms' ? now.pants ?? PANTS_COLORS[0] : now.shoeColor || SHOES);
  const tint = (piece: 'tops' | 'bottoms', i: number, c: string) => {
    const list = [...(now.tints?.[piece] ?? [])];
    while (list.length < i) list.push('');
    list[i - 1] = c;
    set({ tints: { ...now.tints, [piece]: list } });
  };
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className={`modal styler ${mode === 'shop' ? 'shop' : ''}`} role="dialog" aria-label={TITLE[mode]} onClick={(e) => e.stopPropagation()}>
        <div className="styler-stage" ref={host} />
        <div className="styler-side">
          <div className="styler-title">
            <b>{TITLE[mode]}</b> <span className="muted small">· {dweller.name}</span>
          </div>
          {show.name && (
            <>
              <div className="tour-group">이름</div>
              <input value={now.name} maxLength={8} onChange={(e) => set({ name: e.target.value })} aria-label="이름" placeholder="이름 입력…" />
            </>
          )}
          {show.face && faces.length > 0 && (
            <>
              <div className="tour-group">얼굴 (3D)</div>
              <div className="tour-chips">
                <button className={`chip ${!face ? 'on' : ''}`} onClick={() => set({ face: '', ...fresh(['tops', 'bottoms']) })} title="캐릭터마다 정해지는 얼굴">
                  자동{!face && cast ? ` (${faceName(cast.base.name)})` : ''}
                </button>
                {faces.map((f) => (
                  <button key={f} className={`chip ${face === f ? 'on' : ''}`} onClick={() => pickFace(f)}>
                    {faceName(f)}
                  </button>
                ))}
              </div>
              <div className="tour-group">눈동자 (3D)</div>
              <Swatches colors={EYE_COLORS} value={now.eyes || undefined} onPick={(eyes) => set({ eyes })} own={() => set({ eyes: '' })} />
            </>
          )}
          {show.face && (
            <>
              <div className="tour-group">피부</div>
              <Swatches colors={SKIN_COLORS} value={now.skin} onPick={(skin) => set({ skin })} />
            </>
          )}
          {show.hairStyle && (
            <>
              <div className="tour-group">머리 모양</div>
              <Chips items={hairs} value={hairNow} onPick={pickHair} />
              {own && can && hairNow !== hairShown(roster, cast!.base, {}) && (
                <button className="ghost small" onClick={() => set({ hairFrom: '', hairStyle: own.hair })}>
                  <Icon name="reset" /> 이 얼굴의 원래 머리 ({hairs.findIndex(([n]) => n === hairShown(roster, cast!.base, {})) + 1}번)
                </button>
              )}
              {hairNear && <p className="muted small">⚠ 고른 머리는 이 나이의 3D에 없어서 비슷한 머리로 보여요.</p>}
            </>
          )}
          {show.hairColor && (
            <>
              <div className="tour-group">머리 색</div>
              <Swatches colors={HAIRS} value={now.hair} onPick={(hair) => set({ hair })} />
            </>
          )}
          {show.clothes && (
            <>
              {garments.length > 0 ? (
                <>
                  {(['tops', 'bottoms', 'shoes'] as const).map((p) => {
                    if (p === 'bottoms' && wantTop === 'dress') return null;
                    const list = garments.filter((g) => g.piece === p && owned.has(g.key));
                    return (
                      <div key={p}>
                        <div className="tour-group">{{ tops: '상의', bottoms: '하의', shoes: '신발' }[p]}</div>
                        <div className="tour-chips">
                          {list.map((g) => (
                            <button key={g.key} className={`chip ${wearing[p] === g.key ? 'on' : ''}`} onClick={() => pickGarment(g)}>
                              {garmentName(g)}
                            </button>
                          ))}
                        </div>
                        {colours(p)}
                      </div>
                    );
                  })}
                  <p className="muted small">새 옷과 티셔츠 프린트는 외출 → 🛍️ 옷가게에서 해요.</p>
                </>
              ) : (
                <>
                  <div className="tour-group">상의</div>
                  <Chips items={tops} value={wantTop} onPick={(outfit) => set({ outfit, ...fresh(outfit === 'dress' || wantTop === 'dress' ? ['tops', 'bottoms'] : ['tops']) })} />
                  {colours('tops')}
                  {wantTop !== 'dress' && (
                    <>
                      <div className="tour-group">하의</div>
                      <Chips items={bottoms} value={wantBottom} onPick={(bottom) => set({ bottom, ...fresh(['bottoms']) })} />
                      {colours('bottoms')}
                    </>
                  )}
                </>
              )}
              {clothesNear.length > 0 && <p className="muted small">⚠ 지금 옷은 이 나이대 3D에 없어서 비슷한 옷으로 보여요: {clothesNear.join(', ')}. 위에서 다시 골라 주세요.</p>}
            </>
          )}
          {mode === 'shop' &&
            (garments.length > 0 ? (
              <>
                <div className="shop-tabs" role="tablist" aria-label="옷 종류">
                  {SHOP_TABS.filter(([t]) => t !== 'print' || import.meta.env.DEV).map(([t, name]) => (
                    <button
                      key={t}
                      role="tab"
                      aria-selected={tab === t}
                      className={`shop-tab ${tab === t ? 'on' : ''}`}
                      onClick={() => {
                        setTab(t);
                        setKind('');
                      }}
                    >
                      {t === 'print' ? <span aria-hidden>🎨</span> : t === 'sets' ? <span aria-hidden>🛍️</span> : <GarmentIcon kind={TAB_ICON[t]} color="currentColor" size={16} />} {name}
                      {t !== 'print' && buying.some((g) => (t === 'sets' ? !!g.set : g.piece === t)) && <span className="shop-dot" aria-label="고른 새 옷 있음" />}
                    </button>
                  ))}
                </div>
                {tab === 'sets' ? (
                  <>
                    <div className="shop-grid sets">
                      {sets.map((id) => {
                        const pieces = piecesOf(id);
                        const on = setOn(id);
                        const owe = pieces.filter((g) => !owned.has(g.key)).reduce((s, g) => s + priceOf(g), 0);
                        return (
                          <button key={id} className={`shop-card set ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => pickSet(id)} title={setAbout(id)}>
                            <span className="shop-set-icons">
                              {pieces.map((g) => (
                                <GarmentIcon key={g.key} kind={g.kind} color={tint3d(g)} size={22} />
                              ))}
                            </span>
                            <span className="shop-card-name">{setLabel(id)}</span>
                            <small className="muted">{setAbout(id)}</small>
                            <span className={`shop-card-price ${owe ? '' : 'mine'}`}>{owe ? `§${owe}` : '보유'}</span>
                            {on && <span className="shop-card-on">입어 보는 중</span>}
                          </button>
                        );
                      })}
                    </div>
                    {!sets.length && <p className="muted small">이 나이에 맞는 세트가 아직 없어요.</p>}
                    <p className="muted small">세트 옷은 세트로만 팔아요. 사고 나면 옷장에서 다른 옷과 섞어 입을 수 있어요.</p>
                  </>
                ) : tab === 'print' ? (
                  <ShirtPrintEditor value={now.shirtPrint ?? undefined} color={now.shirt} enabled={teeOn} onChange={(shirtPrint) => set({ shirtPrint: shirtPrint ?? null })} onColor={(shirt) => set({ shirt })} />
                ) : (
                  (() => {
                    // A set's pieces aren't sold one by one: only the ones already theirs show here.
                    const all = garments.filter((g) => g.piece === tab && (!g.set || owned.has(g.key)));
                    const kinds = [...new Set(all.map((g) => g.kind))];
                    const list = all.filter((g) => !kind || g.kind === kind);
                    const off = tab === 'bottoms' && wantTop === 'dress';
                    return (
                      <>
                        {kinds.length > 1 && (
                          <div className="shop-kinds">
                            <button className={`chip ${!kind ? 'on' : ''}`} onClick={() => setKind('')}>
                              전체 <small>{all.length}</small>
                            </button>
                            {kinds.map((k) => (
                              <button key={k} className={`chip ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>
                                {k === 'shoes' ? '신발' : label([...OUTFITS, ...BOTTOMS], k)} <small>{all.filter((g) => g.kind === k).length}</small>
                              </button>
                            ))}
                          </div>
                        )}
                        {off && <p className="muted small">원피스는 하의 없이 입어요. 상의 탭에서 다른 상의를 고르면 하의도 입을 수 있어요.</p>}
                        <div className="shop-grid">
                          {list.map((g) => {
                            const on = wearing[g.piece] === g.key;
                            const mine = owned.has(g.key);
                            return (
                              <button key={g.key} className={`shop-card ${on ? 'on' : ''}`} disabled={off} aria-pressed={on} onClick={() => pickGarment(g)}>
                                <GarmentIcon kind={g.kind} color={tint3d(g)} />
                                <span className="shop-card-name">{garmentName(g)}</span>
                                <span className={`shop-card-price ${mine ? 'mine' : ''}`}>{basics.has(g.key) ? '기본' : mine ? '보유' : `§${priceOf(g)}`}</span>
                                {on && <span className="shop-card-on">입어 보는 중</span>}
                              </button>
                            );
                          })}
                        </div>
                        {!off && colours(tab)}
                      </>
                    );
                  })()
                )}
                <div className="shop-bag" aria-live="polite">
                  {buying.length ? (
                    <>
                      <div className="shop-bag-title">살 옷</div>
                      {buying.map((g) => (
                        <div key={g.key} className="shop-bag-row">
                          <span>
                            <GarmentIcon kind={g.kind} color={tint3d(g)} size={16} /> {garmentName(g)}
                          </span>
                          <span>§{priceOf(g)}</span>
                        </div>
                      ))}
                      <div className="shop-bag-row total">
                        <span>합계</span>
                        <span>§{spend}</span>
                      </div>
                    </>
                  ) : (
                    <span className="muted small">입어 볼 옷을 골라요. 없는 옷을 고르면 나갈 때 사 와요. 색은 사고 나서 옷장에서도 바꿀 수 있어요.</span>
                  )}
                </div>
              </>
            ) : (
              <p className="muted small">옷가게의 옷은 3D 캐릭터의 옷이라, 도형 캐릭터로는 살 수 없어요.</p>
            ))}
          {!roster.length && <p className="muted small">3D 얼굴·눈동자는 VRoid 캐릭터로 볼 때만 보여요.</p>}
          <div className="styler-foot">
            {cost > 0 && <span className={game.state.money < cost ? 'bad' : 'muted'}>§{cost}</span>}
            <button className="ghost" onClick={onCancel}>
              취소
            </button>
            <button
              className="primary"
              disabled={!name || (mode === 'all' && !changed) || game.state.money < cost}
              onClick={() => onDone({ ...patch, ...(patch.name !== undefined ? { name } : {}), ...(garments.length && closet.length !== (dweller.closet ?? []).length ? { closet } : {}) }, mode === 'shop' ? spend : undefined)}
            >
              {OK[mode]}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
