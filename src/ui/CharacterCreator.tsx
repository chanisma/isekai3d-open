import { useEffect, useMemo, useRef, useState } from 'react';
import { HAIR_COLORS, SHIRT_COLORS, SKIN_COLORS } from '../game/constants';
import { AREA_TRAITS, ASPIRATION_BY_ID, ASP_AREAS, aspirationsFor, goalLabel, type AspArea } from '../game/aspirations';
import { CAS_QUESTIONS, TRAIT_GROUPS, pickableFor, randomPersonality, storyResult, traitGroupOf } from '../game/cas';
import { MAX_DISLIKES, MAX_LIKES, PREFERENCES, PREFERENCE_BY_ID, PREFERENCE_GROUPS } from '../game/preferences';
import { LIFESPANS, LIFESPAN_LABEL, type Lifespan } from '../game/babies';
import { MAX_TRAITS, TRAIT_BY_ID, conflictsWith } from '../game/traits';
import type { Bottom, Outfit, Dweller, DwellerSpec } from '../game/types';
import { BOTTOMS, EYE_COLORS, HAIR_STYLES, OUTFITS, PANTS_COLORS, SHOE_COLORS, figureLook, stageOf } from '../game/looks';
import { josa } from '../game/util';
import { GENDER_LABEL, pickName, type Gender } from '../game/gender';
import { facesFor, models, type ModelInfo } from '../view3d/vrm';
import { basicsFor, castOf, everydayGarmentsFor, garmentsShown, hairOwner, hairsByFace, wearsOf } from '../view3d/vrmLooks';
import { CreatorStage } from '../view3d/creatorStage';
import type { WardrobeBody } from '../view3d/wardrobe3d';
import { Icon } from './Icon';
import { ColorPick } from './ColorPick';
import '../creator.css';

/**
 * Making the character a new story starts with (2026-10-20, at the user's request: one character,
 * like an RPG's character creation, on a three.js stage like the arcade's). Six steps along the
 * top — 기원 (gender and face), 외모, 옷차림, 성격, 꿈, 이름 — the character on a gold dais on the
 * left as a VRoid model (the shape figure on request), the step's choices in a navy panel on the
 * right. The character is the household's first, id 1 (Game.create), so they look here as in play.
 */
type StepId = 'origin' | 'looks' | 'outfit' | 'mind' | 'dream' | 'name';
const STEPS: Array<{ id: StepId; label: string; title: string; focus: 'body' | 'face' }> = [
  { id: 'origin', label: '기원', title: '어떤 모습으로 이 세계에 올까요?', focus: 'body' },
  { id: 'looks', label: '외모', title: '머리와 눈, 피부', focus: 'face' },
  { id: 'outfit', label: '옷차림', title: '첫날 입을 옷', focus: 'body' },
  { id: 'mind', label: '성격', title: '어떤 사람일까요?', focus: 'body' },
  { id: 'dream', label: '꿈', title: '이 세계에서 이루고 싶은 것', focus: 'body' },
  { id: 'name', label: '이름', title: '이름을 정하고 출발해요', focus: 'body' },
];
const NUMERAL = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ'];
const HAIRS = [...HAIR_COLORS, '#f2d6a2', '#c2185b', '#5e35b1', '#1e88e5'];
const TOPS = [...SHIRT_COLORS, '#fafafa', '#f3e5c8', '#1a237e', '#212121'];
const BOTTOM_COLORS = [...PANTS_COLORS, '#212121'];
/** The panel's width (px) and how far the character stands left of the middle to clear it. */
const PANEL = 440;

const ADULT_ASPS = () => aspirationsFor(undefined).map((a) => a.id);

function firstSpec(): DwellerSpec {
  const gender: Gender = Math.random() < 0.5 ? 'female' : 'male';
  const p = randomPersonality(Math.random, ADULT_ASPS());
  return { name: pickName(gender, [], Math.random()), gender, shirt: SHIRT_COLORS[1], skin: SKIN_COLORS[1], hair: HAIR_COLORS[0], traits: p.traits, likes: p.likes, dislikes: p.dislikes, aspiration: p.aspiration };
}

function Swatches({ colors, value, onPick, own, label }: { colors: string[]; value?: string; onPick: (c: string) => void; own?: () => void; label: string }) {
  return (
    <div className="cc-swatches" role="radiogroup" aria-label={label}>
      {own && (
        <button className={`cc-own ${!value ? 'on' : ''}`} onClick={own} title="원래 색" aria-label="원래 색">
          <Icon name="reset" />
        </button>
      )}
      {colors.map((c) => (
        <button key={c} role="radio" aria-checked={c === value} className={c === value ? 'on' : ''} style={{ background: c }} onClick={() => onPick(c)} aria-label={c} />
      ))}
      <ColorPick colors={colors} value={value} onPick={onPick} />
    </div>
  );
}

function Chips<T extends string>({ items, value, onPick }: { items: Array<[T, string]>; value?: T; onPick: (v: T) => void }) {
  return (
    <div className="cc-chips">
      {items.map(([id, label]) => (
        <button key={id} className={`cc-chip ${id === value ? 'on' : ''}`} onClick={() => onPick(id)}>
          {label}
        </button>
      ))}
    </div>
  );
}

/** Traits in 참고 게임's four groups, up to MAX_TRAITS (5) that get along. */
function TraitPicker({ value, onChange, age }: { value: string[]; onChange: (v: string[]) => void; age?: string }) {
  const [tip, setTip] = useState<string | null>(null);
  const shown = tip ? TRAIT_BY_ID[tip] : value.length ? TRAIT_BY_ID[value[value.length - 1]] : null;
  return (
    <>
      <div className="cc-sub">
        특성 {value.length}/{MAX_TRAITS} <small>· 서로 맞지 않는 특성은 함께 고를 수 없어요</small>
      </div>
      {TRAIT_GROUPS.map((g, gi) => (
        <div key={g.label} className="cc-trait-group">
          <span className="cc-tg">
            {g.icon} {g.label}
          </span>
          <div className="cc-chips">
            {pickableFor(age).filter((t) => traitGroupOf(t.id) === gi).map((t) => {
              const on = value.includes(t.id);
              const blocked = !on && (value.length >= MAX_TRAITS || conflictsWith(value, t.id));
              return (
                <button key={t.id} className={`cc-chip ${on ? 'on' : ''}`} disabled={blocked} title={t.desc} onMouseEnter={() => setTip(t.id)} onMouseLeave={() => setTip(null)} onClick={() => onChange(on ? value.filter((x) => x !== t.id) : [...value, t.id])}>
                  {t.icon} {t.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {shown && (
        <div className="cc-desc">
          {shown.icon} <b>{shown.label}</b> — {shown.desc}
        </div>
      )}
    </>
  );
}

function LikesPicker({ spec, update }: { spec: DwellerSpec; update: (p: Partial<DwellerSpec>) => void }) {
  return (
    <>
      <div className="cc-sub">
        좋아하는 것 {spec.likes?.length ?? 0}/{MAX_LIKES} · 싫어하는 것 {spec.dislikes?.length ?? 0}/{MAX_DISLIKES} <small>· 누를 때마다 보통 → 💚 좋아함 → 💢 싫어함</small>
      </div>
      {PREFERENCE_GROUPS.map((g) => (
        <div key={g.kind}>
          <div className="cc-q">{g.label}</div>
          <div className="cc-chips">
            {PREFERENCES.filter((a) => a.kind === g.kind).map((a) => {
              const liked = spec.likes?.includes(a.id);
              const disliked = spec.dislikes?.includes(a.id);
              const cycle = () => {
                const likes = (spec.likes ?? []).filter((x) => x !== a.id);
                const dislikes = (spec.dislikes ?? []).filter((x) => x !== a.id);
                // The next that has room: a full list is passed over, so the button always answers.
                if (!liked && !disliked && likes.length < MAX_LIKES) likes.push(a.id);
                else if (!disliked && dislikes.length < MAX_DISLIKES) dislikes.push(a.id);
                update({ likes, dislikes });
              };
              const full = !liked && !disliked && (spec.likes?.length ?? 0) >= MAX_LIKES && (spec.dislikes?.length ?? 0) >= MAX_DISLIKES;
              return (
                <button key={a.id} className={`cc-chip ${liked ? 'on' : ''} ${disliked ? 'dislike' : ''}`} disabled={full} onClick={cycle} title={liked ? '좋아함' : disliked ? '싫어함' : '보통'}>
                  {liked ? '💚' : disliked ? '💢' : a.icon} {a.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

/**
 * The dream step (2026-11-01, at the user's request: a button that opened another window on top of
 * this one was a step too many): in the panel itself, the areas of life as tabs, the dreams of the
 * area as rows; the one picked opens to show what it asks.
 */
function DreamPicker({ age, value, onPick }: { age: string | undefined; value?: string; onPick: (id: string | undefined) => void }) {
  const list = useMemo(() => aspirationsFor(age), [age]);
  const areas = useMemo(() => [...new Set(list.map((a) => a.area).filter((a): a is AspArea => !!a))], [list]);
  const [area, setArea] = useState<AspArea | undefined>(() => (value && ASPIRATION_BY_ID[value]?.area) || areas[0]);
  const shown = list.filter((a) => a.area === area);
  return (
    <>
      <button className={`cc-dream none ${!value ? 'on' : ''}`} onClick={() => onPick(undefined)}>
        <span className="cc-dream-icon" aria-hidden>🌫️</span>
        <span>
          <b>아직 없음</b>
          <small>꿈은 살다가 찾아도 돼요. 게임 중에도 언제든 바꿀 수 있어요.</small>
        </span>
      </button>
      <div className="cc-dream-areas" role="tablist" aria-label="꿈의 분야">
        {areas.map((id) => (
          <button key={id} role="tab" aria-selected={id === area} className={id === area ? 'on' : ''} onClick={() => setArea(id)} title={ASP_AREAS[id].desc}>
            <span aria-hidden>{ASP_AREAS[id].icon}</span>
            {ASP_AREAS[id].label}
            {value && ASPIRATION_BY_ID[value]?.area === id && <i className="cc-dream-dot" aria-label="고른 꿈이 있는 분야" />}
          </button>
        ))}
      </div>
      {area && <p className="cc-hint">{ASP_AREAS[area].desc}</p>}
      <div className="cc-dream-list">
        {shown.map((a) => {
          const on = a.id === value;
          const reward = a.reward ?? (a.area ? AREA_TRAITS[a.area]?.reward : undefined);
          return (
            <div key={a.id} className={`cc-dream ${on ? 'on' : ''}`}>
              <button className="cc-dream-head" aria-pressed={on} onClick={() => onPick(on ? undefined : a.id)}>
                <span className="cc-dream-icon" aria-hidden>{a.icon}</span>
                <span>
                  <b>{a.label}</b>
                  <small>{a.desc}</small>
                </span>
                {on && <Icon name="check" />}
              </button>
              {on && (
                <div className="cc-dream-plan">
                  <ol>
                    {a.milestones.map((m, i) => (
                      <li key={i}>
                        <b>{m.name}</b>
                        <ul>
                          {m.goals.map((g, j) => (
                            <li key={j}>{goalLabel(g)}</li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ol>
                  {reward && TRAIT_BY_ID[reward] && (
                    <p className="cc-hint">
                      다 이루면 {TRAIT_BY_ID[reward].icon} <b>{TRAIT_BY_ID[reward].label}</b> 특성을 평생 가져요.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

/** "이야기로 정하기", after 참고 게임's CAS Stories: everyday questions that suggest traits, likes and a dream. */
function Stories({ spec, update, onDone }: { spec: DwellerSpec; update: (p: Partial<DwellerSpec>) => void; onDone: () => void }) {
  const [answers, setAnswers] = useState<number[]>([]);
  const step = answers.length;
  const who = spec.name.trim() || '이 캐릭터';
  if (step < CAS_QUESTIONS.length) {
    const q = CAS_QUESTIONS[step];
    return (
      <div className="cc-story">
        <div className="cc-dots" aria-label={`${step + 1}/${CAS_QUESTIONS.length}번째 질문`}>
          {CAS_QUESTIONS.map((x, i) => (
            <span key={x.id} className={i < step ? 'done' : i === step ? 'now' : ''} />
          ))}
        </div>
        <div className="cc-q">
          <span aria-hidden>{q.icon}</span> {q.text.replace('이 캐릭터는', josa(who, '은/는')).replace('이 캐릭터가', josa(who, '이/가'))}
        </div>
        <div className="cc-answers">
          {q.answers.map((a, i) => (
            <button key={i} onClick={() => setAnswers([...answers, i])}>
              {a.text}
            </button>
          ))}
        </div>
        <div className="cc-row">
          {step > 0 && (
            <button className="cc-link" onClick={() => setAnswers(answers.slice(0, -1))}>
              <Icon name="arrowLeft" /> 이전 질문
            </button>
          )}
          <button className="cc-link" onClick={() => setAnswers([...answers, -1])}>
            건너뛰기
          </button>
        </div>
      </div>
    );
  }
  const r = storyResult(answers);
  const asp = ASPIRATION_BY_ID[r.aspiration];
  return (
    <div className="cc-story">
      <div className="cc-q">✨ {who}에게 어울리는 모습이에요</div>
      <div className="cc-chips">
        {r.traits.map((t) => (
          <span key={t} className="cc-chip on" title={TRAIT_BY_ID[t].desc}>
            {TRAIT_BY_ID[t].icon} {TRAIT_BY_ID[t].label}
          </span>
        ))}
        {r.likes.map((l) => (
          <span key={l} className="cc-chip on">
            💚 {PREFERENCE_BY_ID[l]?.label}
          </span>
        ))}
        <span className="cc-chip on" title={asp.desc}>
          {asp.icon} {asp.label}
        </span>
      </div>
      <div className="cc-row">
        <button className="cc-link" onClick={() => setAnswers([])}>
          <Icon name="reset" /> 다시 답하기
        </button>
        <button
          className="cc-plate small"
          onClick={() => {
            update({ traits: r.traits, likes: r.likes, dislikes: (spec.dislikes ?? []).filter((d) => !r.likes.includes(d)), aspiration: r.aspiration });
            setAnswers([]);
            onDone();
          }}
        >
          이대로 정하기
        </button>
      </div>
    </div>
  );
}

/** What the character screen starts from for someone in play: as they are, with the traits that can be picked by hand. */
function specOf(dweller: Dweller): DwellerSpec {
  const pickable = new Set(pickableFor(dweller.age).map((t) => t.id));
  return {
    name: dweller.name,
    gender: dweller.gender,
    shirt: dweller.shirt,
    skin: dweller.skin,
    hair: dweller.hair,
    shirtPrint: dweller.shirtPrint,
    hairStyle: dweller.hairStyle,
    hairFrom: dweller.hairFrom,
    outfit: dweller.outfit,
    bottom: dweller.bottom,
    pants: dweller.pants,
    shoeColor: dweller.shoeColor,
    face: dweller.face,
    eyes: dweller.eyes,
    tints: dweller.tints,
    wear: dweller.wear,
    closet: dweller.closet,
    traits: dweller.traits.filter((t) => pickable.has(t)),
    likes: dweller.likes,
    dislikes: dweller.dislikes,
    aspiration: dweller.aspiration?.id,
  };
}

/**
 * `editing`: someone in play instead of a new character (2026-11-01, at the user's request: the one screen
 * for making and changing a character, in place of the 이름·외모 window): their age's faces, clothes,
 * traits and dreams; gender stays, as it's for life; nothing about the new story is asked.
 */
export function CharacterCreator({ overwriting, onBack, onDone, editing, onSave }: { overwriting: boolean; onBack: () => void; onDone: (spec: DwellerSpec, lifespan: Lifespan, guide: boolean) => void; editing?: Dweller; onSave?: (spec: DwellerSpec) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<CreatorStage | null>(null);
  const [roster, setRoster] = useState<ModelInfo[] | null>(null);
  const [spec, setSpec] = useState<DwellerSpec>(() => (editing ? specOf(editing) : firstSpec()));
  const [autoName, setAutoName] = useState(!editing);
  const [step, setStep] = useState(0);
  const [shape, setShape] = useState(false);
  const [mind, setMind] = useState<'story' | 'pick'>(editing ? 'pick' : 'story');
  const age = editing?.age;
  const lifeStage = stageOf(age);
  const dwellerId = editing?.id ?? 1;
  // A toddler has no traits to pick (their own come as they grow) and no dreams yet.
  const steps = age === 'toddler' ? STEPS.filter((x) => x.id !== 'mind' && x.id !== 'dream') : STEPS;
  const [lifespan, setLifespan] = useState<Lifespan>('normal');
  const [guide, setGuide] = useState(true);
  /** The body last tried that wouldn't load (it shows as the shape figure, with a way to try again). */
  const [failed, setFailed] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const update = (p: Partial<DwellerSpec>) => setSpec((s) => ({ ...s, ...p }));

  useEffect(() => {
    const s = new CreatorStage(canvas.current!);
    stage.current = s;
    s.setShift(PANEL / 2);
    s.onLoaded = (_parts, ok, body) => setFailed(ok ? null : JSON.stringify(body));
    s.onLoading = setLoading;
    void models()
      .then(setRoster)
      .catch(() => setRoster([]));
    return () => {
      stage.current = null;
      s.dispose();
    };
  }, []);

  const gender: Gender = spec.gender ?? 'female';
  const faces = useMemo(() => (roster ? facesFor(roster, gender, lifeStage) : []), [roster, gender, lifeStage]);
  const vroid = !!roster && faces.length > 0 && !shape;
  const faceModel = (f: string | undefined) => roster?.find((m) => !m.outfit && !m.kept && m.name === f && m.gender === gender && m.stage === lifeStage);

  // A face of their own from the start (their own hair, everyone's basic clothes), and again on a new gender.
  useEffect(() => {
    if (editing || !roster || !faces.length || (spec.face && faces.includes(spec.face))) return;
    pickFace(faces[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roster, faces]);

  const look = figureLook({ ...spec, age });
  const tried = vroid ? castOf(roster!, look, { id: dwellerId, face: spec.face, eyes: spec.eyes || undefined, tints: spec.tints }, undefined) : null;
  const wanted: WardrobeBody | null = tried ? { kind: 'vroid', file: tried.file, dress: tried.dress } : null;
  // A body that wouldn't load is shown as the shape figure (only that one; another face tries again).
  const broken = !!wanted && failed === JSON.stringify(wanted);
  const cast = broken ? null : tried;
  const body: WardrobeBody = cast ? wanted! : { kind: 'shape', look };
  // Nothing decided yet (the characters' list on its way, or the face not picked): a gold glow, not a
  // shape figure flashing up first.
  const waiting = !shape && (!roster || (!editing && faces.length > 0 && !spec.face));
  const bodyKey = waiting ? 'wait' : JSON.stringify(body);
  useEffect(() => {
    if (waiting) stage.current?.wait();
    else stage.current?.show(body);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyKey]);
  useEffect(() => {
    stage.current?.setFocus(steps[step].focus);
  }, [step]);

  /** A face in its own hair, in the basic clothes everyone has (`basicsFor`: a tee, 긴바지 1, 신발 1). */
  const faceLook = (m: ModelInfo | undefined): Partial<DwellerSpec> => {
    const w = m && wearsOf(m);
    if (!m || !w) return { wear: undefined };
    const b = basicsFor(roster!, m);
    const wear = { ...(b.tops ? { tops: b.tops.from } : {}), ...(b.bottoms ? { bottoms: b.bottoms.from } : {}), ...(b.shoes ? { shoes: b.shoes.from } : {}) };
    return { hairStyle: w.hair as DwellerSpec['hairStyle'], wear, outfit: (b.tops?.kind ?? 'tee') as Outfit, bottom: (b.bottoms?.kind ?? 'pants') as Bottom };
  };
  function pickFace(f: string) {
    if (editing) {
      // Someone in play keeps what they have on: only the face, and the hair that comes with it.
      const w = wearsOf(faceModel(f)!);
      update({ face: f, hairFrom: '', eyes: '', ...(w ? { hairStyle: w.hair as DwellerSpec['hairStyle'] } : {}) });
      return;
    }
    update({ face: f, hairFrom: '', tints: undefined, eyes: '', ...faceLook(faceModel(f)) });
  }
  const pickGender = (g: Gender) => {
    if (g === gender) return;
    // The new gender's first face straight away, so no other face loads in between.
    const f = roster ? facesFor(roster, g, 'adult')[0] : undefined;
    const m = f ? roster!.find((x) => !x.outfit && !x.kept && x.name === f && x.gender === g && x.stage === 'adult') : undefined;
    update({ gender: g, face: f, hairFrom: '', tints: undefined, eyes: '', ...faceLook(m), ...(autoName ? { name: pickName(g, [], Math.random()) } : {}) });
  };

  // Hair by number (each face's own), or the shape figure's styles.
  const hairs: Array<[string, string]> = cast ? hairsByFace(roster!, cast.base, faces).map((n, i) => [n, `${i + 1}`]) : HAIR_STYLES.map(([h], i) => [h, `${i + 1}`]);
  const hairNow = cast ? hairOwner(roster!, cast.base, cast.dress) : spec.hairStyle ?? 'short';
  const pickHair = (h: string) => {
    const m = cast && roster!.find((x) => !x.outfit && x.name === h && x.gender === gender && x.stage === lifeStage);
    const w = m && wearsOf(m);
    update(w ? { hairFrom: h, hairStyle: w.hair as DwellerSpec['hairStyle'] } : { hairFrom: '', hairStyle: h as DwellerSpec['hairStyle'] });
  };

  // Clothes: any of the stage's own, free on the first day (they're the character's own from then on);
  // the garment sets are bought at the clothes shop, not picked here.
  const garments = cast ? everydayGarmentsFor(roster!, cast.base) : [];
  const wearing = cast ? garmentsShown(roster!, cast.base, cast.dress) : {};
  const basics = new Set(cast ? Object.values(basicsFor(roster!, cast.base)).map((g) => g.key) : []);
  const wantTop = spec.outfit ?? 'tee';
  const kindName = (kind: string) => (kind === 'shoes' ? '신발' : [...OUTFITS, ...BOTTOMS].find(([x]) => x === kind)?.[1] ?? kind);
  const garmentName = (g: (typeof garments)[number]) => {
    const same = garments.filter((x) => x.piece === g.piece && x.kind === g.kind);
    return same.length > 1 || g.kind === 'shoes' ? `${kindName(g.kind)} ${same.indexOf(g) + 1}` : kindName(g.kind);
  };
  const pickGarment = (g: (typeof garments)[number]) => {
    const wear = { ...spec.wear, [g.piece]: g.from };
    if (g.piece === 'tops') {
      const under = g.kind !== 'dress' && !wearing.bottoms && garments.find((x) => x.piece === 'bottoms');
      if (under) wear.bottoms = under.from;
      update({ wear, outfit: g.kind as Outfit, ...(under ? { bottom: under.kind as Bottom } : {}), tints: undefined });
    } else if (g.piece === 'bottoms') update({ wear, bottom: g.kind as Bottom, tints: undefined });
    else update({ wear });
  };

  const randomise = () => {
    const p = randomPersonality(Math.random, aspirationsFor(age).map((a) => a.id));
    const f = faces.length ? faces[Math.floor(Math.random() * faces.length)] : undefined;
    if (f) pickFace(f);
    update({ skin: SKIN_COLORS[Math.floor(Math.random() * SKIN_COLORS.length)], hair: HAIRS[Math.floor(Math.random() * HAIRS.length)], traits: p.traits, likes: p.likes, dislikes: p.dislikes, aspiration: p.aspiration });
  };

  const finish = () => {
    const closet = cast ? [...new Set(Object.values(garmentsShown(roster!, cast.base, cast.dress)).filter((x): x is string => !!x))] : undefined;
    const done: DwellerSpec = { ...spec, name: spec.name.trim(), ...(closet?.length ? { closet: editing ? [...new Set([...(editing.closet ?? []), ...closet])] : closet } : {}) };
    if (editing) onSave?.(done);
    else onDone(done, lifespan, guide);
  };

  const s = steps[step];
  const asp = spec.aspiration ? ASPIRATION_BY_ID[spec.aspiration] : undefined;
  const nameOk = spec.name.trim().length > 0;
  return (
    <div className="creator">
      <canvas ref={canvas} className="creator-canvas" aria-label={`${spec.name || '캐릭터'} — 끌어서 돌려 보기`} />

      <header className="cc-top">
        <button className="cc-link back" onClick={onBack}>
          <Icon name="arrowLeft" /> {editing ? '바꾸지 않고 돌아가기' : '처음 화면'}
        </button>
        <ol className="cc-steps" aria-label="캐릭터 만들기 단계">
          {steps.map((x, i) => (
            <li key={x.id} className={i === step ? 'now' : i < step ? 'done' : ''}>
              <button onClick={() => setStep(i)} aria-current={i === step ? 'step' : undefined}>
                <span className="cc-medal">{NUMERAL[i]}</span>
                <span className="cc-step-label">{x.label}</span>
              </button>
            </li>
          ))}
        </ol>
        <span className="cc-top-gap" />
      </header>

      <div className="cc-stage-tools">
        <button className="cc-round" onClick={() => stage.current?.turn(-Math.PI / 2)} title="왼쪽으로 돌리기" aria-label="왼쪽으로 돌리기">
          <Icon name="rotateLeft" />
        </button>
        <button className="cc-round" onClick={() => stage.current?.turn(Math.PI / 2)} title="오른쪽으로 돌리기" aria-label="오른쪽으로 돌리기">
          <Icon name="rotateRight" />
        </button>
        <button className="cc-round" onClick={randomise} title="모두 무작위로" aria-label="모두 무작위로">
          <Icon name="dice" />
        </button>
        <button className={`cc-pill ${shape ? 'on' : ''}`} onClick={() => setShape((v) => !v)} title="가벼운 도형 캐릭터로 보기 (게임에서도 바꿀 수 있어요)">
          <Icon name={shape ? 'live' : 'shape'} /> {shape ? '3D 모델로 보기' : '도형으로 보기'}
        </button>
      </div>
      {roster && !faces.length && <p className="cc-notice">3D 캐릭터 팩이 이 PC에 없어 도형 캐릭터로 보여요. 캐릭터 팩이 설치되면 3D 모델로 보여요.</p>}
      {(loading || waiting) && !broken && (
        <p className="cc-notice cc-loading" role="status">
          <span className="cc-spin" aria-hidden /> 캐릭터를 불러오는 중…
        </p>
      )}
      {broken && (
        <p className="cc-notice" role="alert">
          이 모습의 3D 캐릭터를 불러오지 못해 도형 캐릭터로 보여요.{' '}
          <button className="cc-link" onClick={() => setFailed(null)}>
            다시 시도
          </button>
        </p>
      )}

      <aside className="cc-panel" style={{ width: PANEL }}>
        <div className="cc-panel-head">
          <span className="cc-medal big">{NUMERAL[step]}</span>
          <div>
            <div className="cc-kicker">{s.label}</div>
            <h2>{s.title}</h2>
          </div>
        </div>
        <div className="cc-body">
          {s.id === 'origin' && (
            <>
              {editing ? (
                <div className="cc-sub">성별 <small>· {GENDER_LABEL[gender]} (바꿀 수 없어요)</small></div>
              ) : (
                <>
              <div className="cc-sub">성별</div>
              <div className="cc-gender" role="radiogroup" aria-label="성별">
                {(['female', 'male'] as Gender[]).map((g) => (
                  <button key={g} role="radio" aria-checked={gender === g} className={gender === g ? 'on' : ''} onClick={() => pickGender(g)}>
                    {GENDER_LABEL[g]}
                  </button>
                ))}
              </div>
                </>
              )}
              {vroid && (
                <>
                  <div className="cc-sub">얼굴</div>
                  <div className="cc-faces">
                    {faces.map((f, i) => (
                      <button key={f} className={(spec.face || cast?.base.name) === f ? 'on' : ''} onClick={() => pickFace(f)} aria-label={`얼굴 ${i + 1}`}>
                        <span className="cc-medal">{i + 1}</span>
                      </button>
                    ))}
                  </div>
                  <p className="cc-hint">{editing ? '얼굴을 바꾸면 그 얼굴의 원래 머리로 바뀌어요. 다음 단계에서 다시 고를 수 있어요.' : '얼굴마다 원래 머리가 달라요. 옷은 모두 기본 옷으로 시작해요. 다음 단계에서 얼마든지 바꿀 수 있어요.'}</p>
                </>
              )}
            </>
          )}
          {s.id === 'looks' && (
            <>
              <div className="cc-sub">머리 모양</div>
              <div className="cc-faces small">
                {hairs.map(([id, n]) => (
                  <button key={id} className={id === hairNow ? 'on' : ''} onClick={() => pickHair(id)} aria-label={`머리 ${n}`}>
                    <span className="cc-medal">{n}</span>
                  </button>
                ))}
              </div>
              <div className="cc-sub">머리 색</div>
              <Swatches label="머리 색" colors={HAIRS} value={spec.hair} onPick={(hair) => update({ hair })} />
              {vroid && (
                <>
                  <div className="cc-sub">눈동자</div>
                  <Swatches label="눈동자" colors={EYE_COLORS} value={spec.eyes || undefined} onPick={(eyes) => update({ eyes })} own={() => update({ eyes: '' })} />
                </>
              )}
              <div className="cc-sub">피부</div>
              <Swatches label="피부" colors={SKIN_COLORS} value={spec.skin} onPick={(skin) => update({ skin })} />
            </>
          )}
          {s.id === 'outfit' && (
            <>
              {garments.length > 0 ? (
                (['tops', 'bottoms', 'shoes'] as const).map((p) =>
                  p === 'bottoms' && wantTop === 'dress' ? null : (
                    <div key={p}>
                      <div className="cc-sub">{{ tops: '상의', bottoms: '하의', shoes: '신발' }[p]}</div>
                      <div className="cc-chips">
                        {garments
                          .filter((g) => g.piece === p)
                          .map((g) => (
                            <button key={g.key} className={`cc-chip ${wearing[p] === g.key ? 'on' : ''}`} onClick={() => pickGarment(g)}>
                              {garmentName(g)}
                              {basics.has(g.key) && <small className="cc-basic">기본</small>}
                            </button>
                          ))}
                      </div>
                      {p === 'tops' && <Swatches label="상의 색" colors={TOPS} value={spec.shirt} onPick={(shirt) => update({ shirt })} />}
                      {p === 'bottoms' && <Swatches label="하의 색" colors={BOTTOM_COLORS} value={spec.pants ?? PANTS_COLORS[0]} onPick={(pants) => update({ pants })} />}
                      {p === 'shoes' && <Swatches label="신발 색" colors={SHOE_COLORS} value={spec.shoeColor || undefined} onPick={(shoeColor) => update({ shoeColor })} own={() => update({ shoeColor: undefined })} />}
                    </div>
                  ),
                )
              ) : (
                <>
                  <div className="cc-sub">상의</div>
                  <Chips items={OUTFITS} value={wantTop} onPick={(outfit) => update({ outfit })} />
                  <Swatches label="상의 색" colors={TOPS} value={spec.shirt} onPick={(shirt) => update({ shirt })} />
                  {wantTop !== 'dress' && (
                    <>
                      <div className="cc-sub">하의</div>
                      <Chips items={BOTTOMS} value={spec.bottom ?? 'pants'} onPick={(bottom) => update({ bottom })} />
                      <Swatches label="하의 색" colors={BOTTOM_COLORS} value={spec.pants ?? PANTS_COLORS[0]} onPick={(pants) => update({ pants })} />
                    </>
                  )}
                </>
              )}
              <p className="cc-hint">고른 옷은 캐릭터의 옷장에 남고, <b>기본</b> 표시가 붙은 기본 옷은 누구나 가지고 있어요. 새 옷과 티셔츠 프린트는 게임에서 외출 → 옷가게에서 해요.</p>
            </>
          )}
          {s.id === 'mind' && (
            <>
              {!editing && (
                <div className="cc-gender two">
                  <button className={mind === 'story' ? 'on' : ''} onClick={() => setMind('story')}>
                    이야기로 정하기
                  </button>
                  <button className={mind === 'pick' ? 'on' : ''} onClick={() => setMind('pick')}>
                    직접 고르기
                  </button>
                </div>
              )}
              {mind === 'story' ? (
                <Stories spec={spec} update={update} onDone={() => setMind('pick')} />
              ) : (
                <>
                  <TraitPicker age={age} value={spec.traits ?? []} onChange={(traits) => update({ traits })} />
                  <LikesPicker spec={spec} update={update} />
                </>
              )}
            </>
          )}
          {s.id === 'dream' && (
            <>
              <DreamPicker age={age} value={spec.aspiration} onPick={(aspiration) => update({ aspiration })} />
            </>
          )}
          {s.id !== 'name' && (
            <div className="cc-card mini">
              <div className="cc-card-name">
                {spec.name.trim() || '이름 없음'} <small>{GENDER_LABEL[gender]}</small>
              </div>
              <div className="cc-chips">
                {(spec.traits ?? []).map((t) => (
                  <span key={t} className="cc-chip on">
                    {TRAIT_BY_ID[t]?.icon} {TRAIT_BY_ID[t]?.label}
                  </span>
                ))}
              </div>
              <div className="cc-card-line">꿈 · {asp ? `${asp.icon} ${asp.label}` : '아직 없음'}</div>
            </div>
          )}
          {s.id === 'name' && (
            <>
              <div className="cc-sub">이름</div>
              <div className="cc-name">
                <input
                  value={spec.name}
                  maxLength={8}
                  onChange={(e) => {
                    setAutoName(false);
                    update({ name: e.target.value });
                  }}
                  aria-label="이름"
                  placeholder="이름 입력…"
                />
                <button className="cc-round" title="이름 무작위" aria-label="이름 무작위" onClick={() => update({ name: pickName(gender, [], Math.random()) })}>
                  <Icon name="dice" />
                </button>
              </div>
              <div className="cc-card">
                <div className="cc-card-name">
                  {spec.name.trim() || '이름 없음'} <small>{GENDER_LABEL[gender]}</small>
                </div>
                <div className="cc-chips">
                  {(spec.traits ?? []).map((t) => (
                    <span key={t} className="cc-chip on">
                      {TRAIT_BY_ID[t]?.icon} {TRAIT_BY_ID[t]?.label}
                    </span>
                  ))}
                </div>
                <div className="cc-card-line">꿈 · {asp ? `${asp.icon} ${asp.label}${asp.area ? ` (${ASP_AREAS[asp.area].label})` : ''}` : '아직 없음'}</div>
                {!!spec.likes?.length && <div className="cc-card-line">좋아함 · {spec.likes.map((l) => PREFERENCE_BY_ID[l]?.label).join(', ')}</div>}
              </div>
              {!editing && (
                <>
              <div className="cc-sub">수명</div>
              <div className="cc-gender two">
                {(Object.keys(LIFESPANS) as Lifespan[]).map((l) => (
                  <button key={l} className={lifespan === l ? 'on' : ''} onClick={() => setLifespan(l)}>
                    {LIFESPAN_LABEL[l]}
                  </button>
                ))}
              </div>
              <p className="cc-hint">{lifespan === 'off' ? '어른은 나이 들지 않아요.' : `어른 ${LIFESPANS[lifespan].adult}일 · 노년 ${LIFESPANS[lifespan].elder}일`}</p>
              <label className="cc-check">
                <input type="checkbox" checked={guide} onChange={(e) => setGuide(e.target.checked)} /> 처음 해 봐요: 화면 안내 보기
              </label>
              {overwriting && <p className="cc-warn">이 칸에 있던 이야기는 지워지고 새 이야기가 기록돼요.</p>}
                </>
              )}
            </>
          )}
        </div>
        <footer className="cc-foot">
          <button className="cc-link" disabled={step === 0} onClick={() => setStep(step - 1)}>
            <Icon name="arrowLeft" /> 이전
          </button>
          {step < steps.length - 1 ? (
            <button className="cc-plate" onClick={() => setStep(step + 1)}>
              다음 · {steps[step + 1].label}
            </button>
          ) : (
            <button className="cc-plate" disabled={!nameOk} onClick={finish}>
              <Icon name="check" /> {editing ? '저장' : '이 캐릭터로 시작'}
            </button>
          )}
          {editing && step < steps.length - 1 && (
            <button className="cc-link" disabled={!nameOk} onClick={finish}>
              <Icon name="check" /> 저장
            </button>
          )}
        </footer>
      </aside>
    </div>
  );
}
