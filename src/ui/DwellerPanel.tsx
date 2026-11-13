import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { TASK_KIND, stageInfo } from '../game/workStages';
import { CareerExplorer } from './CareerExplorer';
import { SkillGuide } from './SkillGuide';
import { WORKPLACES } from '../game/workplace';
import { SERVICES, type ServiceDef } from '../game/services';
import { rankOptions, topChoices } from '../game/autonomy';
import { CAREER_BY_ID, TONES, daysText, levelOf, needsText, nextLevelOf } from '../game/careers';
import { workDrive } from '../game/workDrive';
import { CHILD_SKILLS, NEED_INFO, NEED_KEYS, SKILL_GROUPS, SKILL_HOWTO, SKILL_INFO, SKILL_KEYS, SKILL_LEVEL_NAMES, TODDLER_SKILLS } from '../game/constants';
import { homeCapNote } from '../game/workGrowth';
import { BUFFS, EMOTIONS, emotionName } from '../game/emotions';
import { traitsOf } from '../game/traits';
import { STORE, STORE_TABS, WANT_BY_ID, wantLabel, type StoreTab, type WantRole } from '../game/wants';
import { needLines } from '../game/needEffects';
import { AREA_LABEL, moodEffectLines, type EffectArea } from '../game/moodEffects';
import { LIFESPANS, INFANT_TRAITS } from '../game/babies';
import { STARS_LABEL, royaltyLeftText } from '../game/books';
import { PREFERENCES } from '../game/preferences';
import { VENUES, VENUE_BY_ID } from '../game/venues';
import { PARTY_COST, openGoals, EVENT_COST, partyName } from '../game/party';
import { COLLECTIONS } from '../game/collections';
import { FEAR_BY_ID, FEAR_LEVEL_LABEL, MAX_FEAR_LEVEL, fearCourage, fearLevel } from '../game/fears';
import { traitNoteId } from '../game/research';
import { ResearchNotes } from './ResearchNotes';
import { BOND_LABEL, GOAL_BY_ID, JOY_BY_ID, bondOf } from '../game/colleagueLife';
import { ASPIRATION_BY_ID, ASP_AREAS, aspirationWorkType, goalLabel, goalMet, goalProgress } from '../game/aspirations';
import { WorkTypeGuide } from './WorkTypeGuide';
import { AspirationPicker } from './AspirationPicker';
import { HomeSection } from './HomeMarket';
import { StockSection } from './StockPhone';
import { NEED_ICON, NEED_TOLD, factsOf, innerOf, knownInner, knownShare } from '../game/dwellerKnowledge';
import { moodBubble } from '../game/render';
import { GENDER_LABEL, kinWord } from '../game/gender';
import type { Townie } from '../game/visitors';
import { NEIGHBOR_HOUSES, WHEREABOUTS_LABEL, ageLabel, awayReason, backAt, houseName, housesOf, whereabouts } from '../game/neighbourhood';
import type { Game } from '../game/game';
import type { Action, LookPatch, Dweller, SkillKey } from '../game/types';
import { SENTIMENT_ICON, isPositiveSentiment, relationshipLabel, type Relationship } from '../game/relationships';
import { clockInfo, formatClock, josa } from '../game/util';
import { Icon, type IconName } from './Icon';

function needColor(v: number): string {
  if (v >= 60) return '#66bb6a';
  if (v >= 30) return '#ffca28';
  return '#ef5350';
}

function formatRemaining(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
}

function Portrait({ game, dweller, active, onClick, onMenu }: { game: Game; dweller: Dweller; active: boolean; onClick: () => void; onMenu: (e: React.MouseEvent) => void }) {
  const state = game.emotionOf(dweller);
  const emotion = EMOTIONS[state.emotion];
  // A need about to give out shows on the portrait, so it isn't missed behind a tab (ours).
  const low = NEED_KEYS.filter((k) => dweller.needs[k] < LOW_NEED).sort((a, b) => dweller.needs[a] - dweller.needs[b])[0];
  return (
    <button
      className={`portrait ${active ? 'active' : ''}`}
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault();
        onMenu(e);
      }}
      title={`${dweller.name} · ${emotionName(state)} · 오른쪽 클릭: 캐릭터 고치기·따로 살기`}
    >
      <span className="face" style={{ background: dweller.skin, borderColor: emotion.color }}>
        <span className="hair" style={{ background: dweller.hair }} />
        <span className="shirt" style={{ background: dweller.shirt }} />
      </span>
      <span className="pname">{dweller.name}</span>
      {dweller.away && (
        <span className="badge" title={`${dweller.away.outing ? '외출' : '근무·학교'} · ${formatClock(dweller.away.until % 1440)}에 돌아와요`}>
          {dweller.away.outing ? VENUE_BY_ID[dweller.away.outing]?.icon ?? '🚶' : '🏢'}
        </span>
      )}
      {!dweller.away && low && <span className="badge warn" title={`${NEED_INFO[low].label}이(가) 바닥나고 있어요`}>❗</span>}
    </button>
  );
}

/** A need under this shows on the portrait and the need strip (ours). */
const LOW_NEED = 15;

/** The moodlets behind the emotion, heaviest first. */
function shownBuffs(dweller: Dweller) {
  return dweller.buffs.filter((b) => BUFFS[b.id] && !BUFFS[b.id].hidden).sort((a, b) => BUFFS[b.id].weight - BUFFS[a.id].weight);
}

/** The colour a moodlet shows in: happy ones take the emotion they were folded into, as in 참고 게임. */
function moodletColor(game: Game, dweller: Dweller, id: string): string {
  const d = BUFFS[id];
  const state = game.emotionOf(dweller);
  const shown = d.emotion === 'happy' && state.happyAs ? state.happyAs : d.emotion;
  return shown ? EMOTIONS[shown].color : '#888';
}

/**
 * The emotion and its moodlets as icons beside it, like 참고 게임's moodlet tray: each ring empties as
 * the moodlet wears off; hovering tells what it is, how strong and how long it lasts.
 */
function MoodCard({ game, dweller, onClose }: { game: Game; dweller: Dweller; onClose: () => void }) {
  const state = game.emotionOf(dweller);
  const def = EMOTIONS[state.emotion];
  const lines = moodEffectLines(state);
  const helps = game.moodHelps(dweller);
  const buffs = shownBuffs(dweller).filter((b) => BUFFS[b.id].emotion);
  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
    <div className="modal mood-card" role="dialog" aria-modal="true" aria-label={`${emotionName(state)} 자세히`} style={{ ['--emo' as string]: def.color }} onClick={(e) => e.stopPropagation()}>
      <div className="mood-card-head">
        <span aria-hidden>{def.icon}</span> <b>{emotionName(state)}</b>
        <button className="ghost small" onClick={onClose} aria-label="닫기">
          <Icon name="close" />
        </button>
      </div>
      <h4>지금 달라지는 것</h4>
      {lines.length === 0 && <p className="muted small">특별히 달라지는 것이 없어요.</p>}
      {(Object.keys(AREA_LABEL) as EffectArea[]).map((area) => {
        const here = lines.filter((l) => l.area === area);
        if (!here.length) return null;
        return (
          <div key={area} className="mood-card-area">
            <span className="mood-card-label">
              {AREA_LABEL[area].icon} {AREA_LABEL[area].label}
            </span>
            <ul>
              {here.map((l) => (
                <li key={l.text} className={l.good ? 'good' : 'bad'}>
                  {l.text}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <h4>이 기분을 만든 것</h4>
      {buffs.length === 0 && <p className="muted small">특별한 일이 없어요.</p>}
      <ul className="mood-card-causes">
        {buffs.map((b) => (
          <li key={b.id}>
            {BUFFS[b.id].icon} {BUFFS[b.id].label}
            <small className="muted">
              {' '}
              {EMOTIONS[BUFFS[b.id].emotion!].icon}+{BUFFS[b.id].weight}
              {b.until === null ? '' : ` · ${formatRemaining(Math.max(0, b.until - game.state.time))}`}
            </small>
          </li>
        ))}
      </ul>
      {helps.labels.length > 0 && (
        <>
          <h4>{helps.title}</h4>
          <p className="small">{helps.labels.join(' · ')}</p>
        </>
      )}
    </div>
    </div>,
    document.body,
  );
}

function MoodTray({ game, dweller }: { game: Game; dweller: Dweller }) {
  const [open, setOpen] = useState(false);
  const state = game.emotionOf(dweller);
  const def = EMOTIONS[state.emotion];
  return (
    <>
    {open && <MoodCard game={game} dweller={dweller} onClose={() => setOpen(false)} />}
    <div className="mood-tray" style={{ ['--emo' as string]: def.color }}>
      <span className="emo-icon" title={state.emotion === 'fine' ? '특별한 감정이 없어요' : `감정 세기 ${state.weight}`}>
        {def.icon}
      </span>
      <button className="emo-name emo-open" onClick={() => setOpen((v) => !v)} aria-expanded={open} title="이 기분이 무엇을 바꾸는지 보기">
        {emotionName(state)} <span aria-hidden>ⓘ</span>
      </button>
      <span className="ml-tray">
        {shownBuffs(dweller).map((b) => {
          const d = BUFFS[b.id];
          const e = d.emotion ? EMOTIONS[d.emotion] : null;
          const left = b.until === null ? null : Math.max(0, b.until - game.state.time);
          const frac = left !== null && d.duration ? Math.min(1, left / d.duration) : 1;
          const tip = [d.label, e ? `${e.levels[0]} +${d.weight}` : '감정에는 영향 없음', left !== null ? `남은 시간 ${formatRemaining(left)}` : '상태가 이어지는 동안'].join('\n');
          return (
            <span key={b.id} className="ml-chip" title={tip} style={{ ['--emo' as string]: moodletColor(game, dweller, b.id), ['--f' as string]: `${frac * 360}deg` } as CSSProperties}>
              <span>{d.icon}</span>
            </span>
          );
        })}
      </span>
    </div>
    </>
  );
}

/** The moodlets spelled out (for touch screens, where there is no hovering). */
function Moodlets({ game, dweller }: { game: Game; dweller: Dweller }) {
  const buffs = shownBuffs(dweller);
  return (
    <section>
      <h3>기분을 만든 것</h3>
      {buffs.length === 0 && <div className="muted">특별한 일이 없어요</div>}
      <ul className="moodlets">
        {buffs.map((b) => {
          const d = BUFFS[b.id];
          const e = d.emotion ? EMOTIONS[d.emotion] : null;
          return (
            <li key={b.id} style={{ ['--emo' as string]: moodletColor(game, dweller, b.id) }} title={e ? `${e.levels[0]} +${d.weight}` : undefined}>
              <span className="ml-icon">{d.icon}</span>
              <span className="ml-label">{d.label}</span>
              {e && (
                <span className="ml-weight">
                  {e.icon}+{d.weight}
                </span>
              )}
              <span className="ml-time">{b.until === null ? '' : formatRemaining(Math.max(0, b.until - game.state.time))}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const WANT_ROLE_LABEL: Record<WantRole, string> = { dream: '꿈', self: '나다움', now: '지금' };

/** The six needs at a glance, always in view while the tabs show other things (ours). */
function NeedStrip({ dweller, onOpen }: { dweller: Dweller; onOpen: () => void }) {
  return (
    <button className="need-strip" onClick={onOpen} title="욕구 자세히 보기 (O)">
      {NEED_KEYS.map((k) => (
        <span key={k} className={`ns ${dweller.needs[k] < LOW_NEED ? 'low' : ''}`} title={`${NEED_INFO[k].label} ${Math.round(dweller.needs[k])}`}>
          <span className="ns-icon">{NEED_INFO[k].icon}</span>
          <span className="ns-bar">
            <span style={{ width: `${dweller.needs[k]}%`, background: needColor(dweller.needs[k]) }} />
          </span>
        </span>
      ))}
    </button>
  );
}

/**
 * The aspiration beside the portrait, as 참고 게임's HUD shows it: the icon, the step, and how many of
 * the step's goals are met. Opens the aspiration tab.
 */
function AspChip({ game, dweller, onOpen }: { game: Game; dweller: Dweller; onOpen: () => void }) {
  const asp = dweller.aspiration;
  const def = asp && ASPIRATION_BY_ID[asp.id];
  if (!asp || !def) {
    if (dweller.age === 'toddler' || dweller.age === 'baby' || dweller.npc) return null;
    return (
      <button className="asp-chip none" onClick={onOpen} title="열망 고르기 (G)">
        <span><Icon name="compass" /></span>
        <span className="asp-chip-l">아직 꿈이 없어도 괜찮아요 · 골라 보기</span>
      </button>
    );
  }
  const done = asp.milestone >= def.milestones.length;
  const m = def.milestones[Math.min(asp.milestone, def.milestones.length - 1)];
  const goals = m.goals.filter((g) => g.kind !== 'grownUp');
  const met = done ? goals.length : goals.filter((g) => goalMet(game, dweller, g)).length;
  return (
    <button className="asp-chip" onClick={onOpen} title={`열망: ${def.label}\n${done ? '모두 해냈어요' : `지금 단계: ${m.name} (목표 ${met}/${goals.length})`} (G)`}>
      <span>{def.icon}</span>
      <span className="asp-chip-l">{def.label}</span>
      <span className="asp-chip-n">{done ? '🏆' : `${asp.milestone + 1}/${def.milestones.length}단계`}</span>
      <span className="asp-chip-bar">
        <span style={{ width: `${goals.length ? (met / goals.length) * 100 : 100}%` }} />
      </span>
    </button>
  );
}

/** Whims beside the portrait, as 참고 게임 shows its thought bubbles; the full list is in the aspiration tab. */
function WhimRow({ game, dweller, onOpen }: { game: Game; dweller: Dweller; onOpen: () => void }) {
  const wants = (dweller.wants ?? []).filter((w) => WANT_BY_ID[w.defId]);
  if (!wants.length) return null;
  return (
    <div className="whims">
      {wants.slice(0, 3).map((w) => {
        const def = WANT_BY_ID[w.defId];
        return (
          <button key={`${w.defId}@${w.targetId ?? ''}`} className="whim" onClick={onOpen} title={`바람: ${wantLabel(game, w)} (+${def.score} 만족 포인트)`}>
            <span>{def.icon}</span>
            <span className="whim-l">{wantLabel(game, w)}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Life stage and how long until the next one, per the lifespan setting. */
function AgeLine({ game, dweller }: { game: Game; dweller: Dweller }) {
  const span = LIFESPANS[game.state.lifespan ?? 'normal'];
  const label = dweller.age ? { toddler: '유아', child: '어린이', teen: '청소년', elder: '노인', baby: dweller.infant ? '영아' : '신생아' }[dweller.age] : '어른';
  const stageDays = dweller.age === 'toddler' ? span.toddler : dweller.age === 'child' ? span.child : dweller.age === 'teen' ? span.teen : dweller.age === 'elder' ? span.elder : dweller.age ? 0 : span.adult;
  const left = dweller.bornAt === undefined || !Number.isFinite(stageDays) ? null : Math.max(0, Math.ceil(stageDays - (game.state.time - dweller.bornAt) / 1440));
  const next = dweller.age === 'toddler' ? '어린이' : dweller.age === 'child' ? '청소년' : dweller.age === 'teen' ? '어른' : dweller.age === 'elder' ? '' : '노년';
  return (
    <div className="age-line muted">
      👤 {label}
      {left !== null && next && ` · ${next}까지 ${left}일`}
      {dweller.age === 'elder' && ' · 남은 시간을 소중히'}
    </div>
  );
}

/** Babies can't be controlled, so their needs show here for whoever is looking after them. */
function Babies({ game }: { game: Game }) {
  const babies = game.household().filter((s) => s.age === 'baby');
  if (babies.length === 0) return null;
  return (
    <section>
      <h3>아기</h3>
      {babies.map((b) => (
        <div key={b.id} className="baby-card">
          <b>👶 {b.name}</b> <span className="muted">{b.infant ? `영아 · ${INFANT_TRAITS.find((t) => t.id === b.infantTrait)?.label ?? ''}` : '신생아'}</span>
          <ul className="needs">
            {(['hunger', 'hygiene', 'social', 'energy'] as const).map((k) => (
              <li key={k}>
                <span className="nlabel">
                  {NEED_INFO[k].icon} {{ hunger: '배고픔', hygiene: '기저귀', social: '관심', energy: '잠' }[k]}
                </span>
                <div className="bar">
                  <div style={{ width: `${b.needs[k]}%`, background: needColor(b.needs[k]) }} />
                </div>
              </li>
            ))}
          </ul>
          <small className="muted">요람을 클릭해 돌봐 주세요</small>
        </div>
      ))}
    </section>
  );
}

/** Adopting by phone (참고 게임 adoption_Picker_Phone, §1000). */
function AdoptBox({ game, dweller }: { game: Game; dweller: Dweller }) {
  const blocked = game.adoptBlocker(dweller);
  if (blocked && dweller.age) return null;
  const kinds = [
    { age: 'baby' as const, label: '👶 아기' },
    { age: 'toddler' as const, label: '🧸 유아' },
    { age: 'child' as const, label: '🎒 어린이' },
  ];
  return (
    <div className="adopt-row" title={blocked ?? '입양 기관에 전화해요 (참고 게임 입양, §1000)'}>
      <span className="muted">입양 (§1000):</span>
      {kinds.map((k) => (
        <button key={k.age} className="chip-btn" disabled={!!blocked} onClick={() => game.adopt(dweller.id, k.age)}>
          {k.label}
        </button>
      ))}
    </div>
  );
}

/** Throwing a house party, or how the one under way is going (참고 게임 social event goals). */
function PartyBox({ game, dweller }: { game: Game; dweller: Dweller }) {
  const party = game.state.party;
  if (!party) {
    const events = [
      { kind: 'party' as const, label: `🎉 하우스 파티 열기 (§${PARTY_COST})`, tip: '이웃 4명을 불러 4시간 30분 동안 파티를 열어요' },
      { kind: 'birthday' as const, label: `🎂 ${dweller.name}의 생일 파티 (§${EVENT_COST})`, tip: '6시간 동안 생일 파티: 냉장고에서 케이크를 만들고 촛불을 불면 다음 나이로 자라요' },
      { kind: 'dinner' as const, label: `🍽️ 디너 파티 열기 (§${EVENT_COST})`, tip: '6시간 동안 디너 파티: 가족 식사를 차려 손님을 불러요' },
    ];
    return (
      <>
        {events.map((e) => {
          const blocker = game.partyBlocker(dweller, e.kind);
          return (
            <button key={e.kind} className="pizza-btn" disabled={!!blocker} title={blocker ?? e.tip} onClick={() => game.throwParty(dweller.id, e.kind)}>
              {e.label}
            </button>
          );
        })}
      </>
    );
  }
  const left = Math.max(0, Math.ceil((party.until - game.state.time) / 60));
  const date = party.kind === 'date';
  const partner = date ? game.dweller(party.partnerId!)?.name ?? game.state.townies?.find((t) => t.id === party.partnerId)?.name : null;
  const shown = new Set(openGoals(party));
  return (
    <div className="party-box">
      <b>{date ? `💕 ${josa(partner ?? '', '와/과')} 데이트` : `${party.kind === 'birthday' ? '🎂' : party.kind === 'dinner' ? '🍽️' : '🎉'} ${partyName(party.kind)}`}</b> <span className="muted">점수 {party.score} · {left}시간 남음</span>
      <ul>
        {party.goals.filter((g) => g.done || shown.has(g)).map((g) => (
          <li key={g.kind} className={g.done ? 'done' : ''}>
            {g.done ? '✅' : '⬜'} {g.label} {g.need > 1 && !g.done ? `(${g.count}/${g.need})` : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Child skills show only for children, toddler skills only for toddlers (참고 게임 hides the others). */
function skillShown(dweller: Dweller, k: SkillKey): boolean {
  if (TODDLER_SKILLS.has(k)) return dweller.age === 'toddler';
  if (CHILD_SKILLS.has(k)) return dweller.age === 'child';
  return dweller.age !== 'toddler';
}

/** Things the household has made, to sell (참고 게임 household inventory). */
function Inventory({ game }: { game: Game }) {
  const items = game.state.inventory ?? [];
  const total = items.reduce((s, i) => s + i.value, 0);
  return (
    <section>
      <h3>
        가족 보관함 <span className="muted">· 만든 물건{game.state.samples ? ` · 현미경 표본 ${game.state.samples}개` : ''}</span>
      </h3>
      {!items.length && <div className="muted">아직 만든 물건이 없어요. 목공 작업대에서 만든 것이 여기 모여요.</div>}
      {items.length > 0 && (
        <>
          <ul className="inventory">
            {items.map((i, n) => (
              <li key={n}>
                🪵 {i.name} <span className="muted">§{i.value} · {i.maker}</span>
              </li>
            ))}
          </ul>
          <button className="pizza-btn" onClick={() => game.sellInventory()}>
            <Icon name="coins" /> 모두 팔기 (§{total})
          </button>
        </>
      )}
    </section>
  );
}

/** The household's collection book (참고 게임 collections). */
function Collections({ game }: { game: Game }) {
  const found = game.state.collections ?? {};
  const any = COLLECTIONS.some((c) => (found[c.id] ?? []).length > 0);
  return (
    <section>
      <h3>
        수집품 <span className="muted">· 낚시·로켓·별 보기·공원에서 모아요</span>
      </h3>
      {!any && <div className="muted">아직 모은 수집품이 없어요</div>}
      <ul className="collections">
        {COLLECTIONS.filter((c) => (found[c.id] ?? []).length > 0).map((c) => (
          <li key={c.id}>
            <b>
              {c.icon} {c.name}
            </b>{' '}
            <span className="muted">
              {(found[c.id] ?? []).length}/{c.items.length}
            </span>
            <div className="coll-items">
              {c.items.map((i) => (
                <span key={i.id} className={`coll-item ${i.rarity} ${(found[c.id] ?? []).includes(i.id) ? 'got' : ''}`} title={i.name}>
                  {(found[c.id] ?? []).includes(i.id) ? i.name : '?'}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Community lots to spend a few hours at (참고 게임 venues). */
function Outings({ game, dweller }: { game: Game; dweller: Dweller }) {
  // The salon and the clothes shop: what to come home in is picked first.
  const [styling, setStyling] = useState<'salon' | 'clothesShop' | null>(null);
  if (dweller.npc || dweller.age === 'baby') return null;
  return (
    <section>
      <h3>
        외출 <span className="muted">· 3시간 동안 다녀와요</span>
      </h3>
      <div className="outings">
        {VENUES.map((v) => {
          const blocker = game.outingBlocker(dweller, v.id);
          return (
            <button key={v.id} disabled={!!blocker} title={blocker ?? `${v.name}에 가기${v.cost ? ` (§${v.cost})` : ''}${v.id === 'salon' ? ' · 새 머리를 먼저 골라요' : v.id === 'clothesShop' ? ' · 살 옷을 먼저 골라요' : ''}`} onClick={() => (v.id === 'salon' || v.id === 'clothesShop' ? setStyling(v.id) : game.goOut(dweller.id, v.id))}>
              {v.icon} {v.name}
            </button>
          );
        })}
      </div>
      {dweller.away?.outing && <div className="muted">{VENUE_BY_ID[dweller.away.outing]?.name}에 가 있어요</div>}
      {styling && <StylerFor game={game} dweller={dweller} mode={styling === 'salon' ? 'salon' : 'shop'} onClose={() => setStyling(null)} onDone={(p, spend) => game.goOut(dweller.id, styling, p, spend)} />}
    </section>
  );
}

/** Calling for help at home, a pizza, a party or a child to adopt (참고 게임 phone: services, events). */
function Services({ game, dweller }: { game: Game; dweller: Dweller }) {
  return (
    <section>
      <h3>
        전화하기 <span className="muted">· 서비스·이벤트</span>
      </h3>
      <div className="service-row">
        {(Object.values(SERVICES) as ServiceDef[]).map((d) => {
          const blocked = game.serviceBlocker(d.kind);
          return (
            <button key={d.kind} className="pizza-btn" disabled={!!dweller.away || !!blocked} title={blocked ?? `선불 §${d.upFront} + 시간당 §${d.hourly}`} onClick={() => game.hireService(dweller.id, d.kind)}>
              {d.icon} {d.name} 부르기 <small>(§{d.upFront}+§{d.hourly}/시간)</small>
            </button>
          );
        })}
        <label className="service-daily">
          <input type="checkbox" checked={!!game.state.maidDaily} onChange={(e) => game.setMaidDaily(e.target.checked)} /> 가정부 매일 오기
        </label>
        {game.state.dwellers
          .filter((s) => s.npc?.role === 'service' && s.npc.service === 'nanny' && !s.npc.leaving)
          .map((s) => (
            <button key={s.id} className="pizza-btn" onClick={() => game.dismissService(s.id)}>
              <Icon name="baby" /> 베이비시터 보내기
            </button>
          ))}
      </div>
      <button className="pizza-btn" disabled={!!dweller.away || game.state.pizzaAt !== undefined} onClick={() => game.orderPizza(dweller.id)}>
        <Icon name="pizza" /> 피자 주문 (§25 · 8인분)
      </button>
      <PartyBox game={game} dweller={dweller} />
      <AdoptBox game={game} dweller={dweller} />
    </section>
  );
}

/**
 * One person in the 관계 tab, the same card everywhere (2026-10-26, at the user's request: the home
 * list broke where the work one didn't; no faces; then tidied up): the name with who they are, where
 * they are or how they look, how the dweller stands with them, what's been found out, and what to do.
 */
function PersonCard({ name, tag, sub, rel, dim, children, actions }: { name: string; tag?: ReactNode; sub?: ReactNode; rel: Relationship; dim?: boolean; children?: ReactNode; actions?: ReactNode }) {
  return (
    <li className={`rel-card person${dim ? ' dim' : ''}`}>
      <div className="person-head">
        <b className="person-name">{name}</b>
        {tag && <span className="person-tag">{tag}</span>}
        <span className="person-rel">{relationshipLabel(rel)}</span>
      </div>
      {sub && <div className="person-sub">{sub}</div>}
      <div className="person-bars">
        <RelBar label="우정" value={rel.friend} positive="#66bb6a" />
        {Math.abs(rel.romance) >= 1 && <RelBar label="로맨스" value={rel.romance} positive="#ff7fbc" />}
      </div>
      {children}
      {actions && <div className="person-actions">{actions}</div>}
    </li>
  );
}

/** A button on a person's card: its icon over a word. */
function PersonAction({ icon, label, title, disabled, onClick }: { icon: IconName; label: string; title: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button disabled={disabled} onClick={onClick} title={title}>
      <Icon name={icon} />
      <span>{label}</span>
    </button>
  );
}

/** What shows on a colleague's face at work (render.ts moodBubble), for the card's second line. */
function FaceLine({ here, live }: { here: Game; live: Dweller }) {
  const face = moodBubble(here, live);
  return face ? (
    <span className="person-face" style={{ '--mood': face.color } as CSSProperties} title="겉으로 보이는 것 — 왜 그런지는 이야기를 나눠 봐야 알아요">
      {face.icon} {face.label}
    </span>
  ) : (
    <span>🙂 무난해 보여요</span>
  );
}

/**
 * A colleague's inner life as the dweller knows it (colleagueLife.ts, dwellerKnowledge.ts; 2026-10-26, at the
 * user's request): what they're after, a worry, good news, a need — only once they've told — and who
 * they get on with (or don't) among the others; with what's still to find out, and what can be done.
 * `live` is them at work now.
 */
function colleagueFacts(game: Game, dweller: Dweller, t: Townie, live?: Dweller): { chips: ReactNode[]; known: number; all: number; hint: string | null } {
  const inner = innerOf(t, live);
  const k = knownInner(dweller, t.id, inner);
  const goal = k.goal ? GOAL_BY_ID[k.goal] : undefined;
  const mates = (game.state.townies ?? []).filter((x) => x.id !== t.id && x.workmate?.careerId === t.workmate?.careerId);
  const bonds = mates.flatMap((m) => {
    const key = t.id < m.id ? `${t.id}-${m.id}` : `${m.id}-${t.id}`;
    const rel = game.state.relationships[key];
    const kind = rel && bondOf(rel);
    return kind ? [`${josa(m.name.split(' ')[0], '와/과')} ${BOND_LABEL[kind]}`] : [];
  });
  const chips = [
    goal && (
      <span key="goal" className="nb-fact goal" title="열망 — 직장에서 이루고 싶은 것">
        🎯 {goal.label}
      </span>
    ),
    ...k.worries.map((f) => (
      <span key={f} className="nb-fact bad" title="털어놓은 고민">
        😨 {FEAR_BY_ID[f].label}
      </span>
    )),
    k.joy && JOY_BY_ID[k.joy] && (
      <span key="joy" className="nb-fact good" title="들려준 기쁜 일">
        😊 {JOY_BY_ID[k.joy].label}
      </span>
    ),
    k.need && (
      <span key="need" className="nb-fact" title="말해 준 상태">
        {NEED_ICON[k.need]} {NEED_TOLD[k.need]}
      </span>
    ),
    ...bonds.map((b) => (
      <span key={b} className="nb-fact bond" title="동료들 사이">
        🤝 {b}
      </span>
    )),
  ].filter(Boolean) as ReactNode[];
  const hint = live
    ? k.worries.length
      ? '👂 고민을 들어 줄 수 있어요'
      : k.joy
        ? '🥳 함께 기뻐해 줄 수 있어요'
        : k.unknownWorry || k.unknownJoy
          ? '❔ 표정에 뭔가 있어요 — 무슨 일 있는지 물어보세요'
          : null
    : null;
  return { chips, known: inner.goal && k.goal ? 1 : 0, all: inner.goal ? 1 : 0, hint };
}

function TownieRow({ game, dweller, t }: { game: Game; dweller: Dweller; t: Townie }) {
  const townies = game.state.townies ?? [];
  const now = game.state.time;
  const rel = game.relationship(dweller.id, t.id);
  const here = game.dweller(t.id);
  const coming = game.state.invites?.some((i) => i.townieId === t.id);
  const baby = t.age === 'baby';
  const away = baby ? '아직 아기예요' : awayReason(t, now);
  const where = here ? (here.npc?.role === 'guest' ? '🏡 놀러 와 있음' : '👀 근처에 있음') : coming ? '🚶 오는 중' : baby ? '👶 아기' : `${WHERE_ICON[whereabouts(t, now)]} ${WHEREABOUTS_LABEL[whereabouts(t, now)]}${backAt(t, now) ? ` · ${backAt(t, now)}까지` : ''}`;
  const busy = !!here || !!dweller.away || !!away;
  const p = t.partnerId !== undefined ? townies.find((x) => x.id === t.partnerId) : undefined;
  const role = t.role && !t.name.endsWith(t.role) ? `${t.role} · ` : '';
  return (
    <PersonCard
      dim={!!away && !here}
      rel={rel}
      name={t.name}
      tag={`${role}${ageLabel(t)}`}
      sub={
        <>
          {where}
          {p && <span className="nb-partner">{t.married ? `💍 ${p.name}의 짝` : `💕 ${josa(p.name, '와/과')} 사귀는 중`}</span>}
        </>
      }
      actions={
        <>
          <PersonAction icon="phone" label="초대" disabled={busy || coming} onClick={() => game.inviteOver(dweller.id, t.id)} title={away ?? '놀러 오라고 전화하기'} />
          <PersonAction icon="smartphone" label="통화" disabled={busy} onClick={() => game.callNeighbour(dweller.id, t.id)} title={away ?? '전화로 수다 떨기 (30분)'} />
          <PersonAction icon="home" label="방문" disabled={busy} onClick={() => game.visitNeighbour(dweller.id, t.id)} title={away ?? '집에 놀러 가기 (3시간)'} />
          {!t.age && <PersonAction icon="heart" label="데이트" disabled={!!game.dateBlocker(dweller, t.id)} onClick={() => game.askOnDate(dweller.id, t.id)} title={game.dateBlocker(dweller, t.id) ?? '데이트 신청하기'} />}
        </>
      }
    >
      {!baby && <KnownFacts dweller={dweller} t={t} extra={t.workmate ? colleagueFacts(game, dweller, t) : undefined} />}
    </PersonCard>
  );
}

/**
 * The people this dweller works with or has got to know at work (colleagues.ts, `Game.colleaguesOf`), by workplace: how close the dweller is to each, and
 * the same calls, invitations and dates as a neighbour — a colleague can become a friend, a partner, family.
 */
function Colleagues({ game, dweller }: { game: Game; dweller: Dweller }) {
  const mates = game.colleaguesOf(dweller);
  if (!mates.length || dweller.npc) return null;
  const places = [...new Set(mates.map((t) => t.workmate!.careerId))];
  // The dweller's own workplace first.
  places.sort((a, b) => Number(b === dweller.job?.careerId || b === dweller.partTime?.careerId) - Number(a === dweller.job?.careerId || a === dweller.partTime?.careerId));
  return (
    <section>
      <h3>
        직장 동료 <span className="muted">· 친해지면 놀러 오기도 해요</span>
      </h3>
      {places.map((c) => (
        <div key={c} className="nb-house">
          <div className="nb-house-name">
            {WORKPLACES[c]?.icon} {WORKPLACES[c]?.name ?? CAREER_BY_ID[c]?.name}
          </div>
          <ul className="rels">
            {mates
              .filter((t) => t.workmate!.careerId === c)
              .sort((a, b) => a.workmate!.slot - b.workmate!.slot)
              .map((t) => (
                <TownieRow key={t.id} game={game} dweller={dweller} t={t} />
              ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

/** The neighbourhood's townies: how well the dweller knows each, and a phone call to invite them over. */
function Neighbours({ game, dweller }: { game: Game; dweller: Dweller }) {
  const townies = game.state.townies ?? [];
  if (townies.length === 0 || dweller.npc) return null;
  return (
    <section>
      <h3>
        이웃 <span className="muted">· 집에 있는 사람에게 전화할 수 있어요</span>
      </h3>
      <StreetNews game={game} />
      {/* Empty houses wait together at the end in one line (the street has room to grow). */}
      {housesOf(townies).filter((h) => townies.some((t) => t.home === h.id)).map((h) => {
        const members = townies.filter((t) => t.home === h.id);
        return (
          <div key={h.id} className="nb-house">
            <div className="nb-house-name">
              {h.icon} {houseName(h.id, townies)} <small className="muted">{members.length ? `${members.length}명` : '이사 올 사람을 기다려요'}</small>
            </div>
            <ul className="rels">
              {members.map((t) => (
                <TownieRow key={t.id} game={game} dweller={dweller} t={t} />
              ))}
            </ul>
          </div>
        );
      })}
      {(() => {
        const empty = NEIGHBOR_HOUSES.filter((h) => !townies.some((t) => t.home === h.id)).length;
        return empty ? <div className="muted nb-empty">🏚️ 빈집 {empty}채 · 독립하는 이웃, 새로 꾸린 가정, 이사 오는 가족을 기다려요</div> : null;
      })()}
    </section>
  );
}

const WHERE_ICON = { home: '🏠', work: '💼', school: '🏫', asleep: '😴' } as const;


/** The street's latest news (neighbourhood.ts): growing up, jobs, babies, farewells, new friends. */
function StreetNews({ game }: { game: Game }) {
  const [all, setAll] = useState(false);
  const news = [...(game.state.streetNews ?? [])].reverse();
  if (!news.length) return null;
  return (
    <div className="street-news">
      <div className="nb-house-name">📰 동네 소식</div>
      <ul>
        {news.slice(0, all ? news.length : 3).map((n, i) => (
          <li key={i}>
            <small className="muted">{clockInfo(n.t).day + 1}일차</small> {n.text}
          </li>
        ))}
      </ul>
      {news.length > 3 && (
        <button className="ghost small" onClick={() => setAll(!all)}>
          {all ? '접기' : `더 보기 (${news.length - 3})`}
        </button>
      )}
    </div>
  );
}

/**
 * What the dweller has found out about someone (dwellerKnowledge.ts): how much of it, the traits, likes,
 * competencies and job learnt by talking — and for a colleague what they're after, a worry, good
 * news (`extra`) — then how many things are still to find out, in one chip.
 */
function KnownFacts({ dweller, t, extra }: { dweller: Dweller; t: Townie; extra?: { chips: ReactNode[]; known: number; all: number; hint: string | null } }) {
  const facts = factsOf(t, t);
  const k = dweller.knows?.[t.id] ?? {};
  const traits = traitsOf(k.traits ?? []);
  const likes = PREFERENCES.filter((a) => k.likes?.includes(a.id));
  const skills = facts.skills.filter(([x]) => k.skills?.[x] !== undefined).map(([x]) => [x, k.skills![x]!] as const);
  const job = facts.careerId && k.job ? CAREER_BY_ID[k.job] : undefined;
  const share = knownShare(dweller, t.id, facts);
  const known = share.known + (extra?.known ?? 0);
  const all = share.all + (extra?.all ?? 0);
  if (!all && !extra?.chips.length) return null;
  const how = ["성격·좋아하는 것·잘하는 것: '알아가기'나 즐거운 대화로", ...(facts.careerId ? ["직업: '직업에 대해 묻기'로"] : []), ...(extra?.all ? ["목표: '무슨 일 있는지 묻기'나 대화로"] : [])].join('\n');
  return (
    <div className="person-known">
      <div className="person-known-head" title="이야기를 나눌수록 조금씩 알게 돼요">
        <span>알아낸 것</span>
        <span className="nb-share">
          <span style={{ width: `${all ? (known / all) * 100 : 0}%` }} />
        </span>
        <span className="person-known-n">
          {known}/{all}
        </span>
      </div>
      <div className="nb-known">
        {job && (
          <span className="nb-fact job" title={facts.retired ? '은퇴했어요' : facts.title}>
            💼 {facts.retired ? `전 ${job.name}` : job.name.replace(' (아르바이트)', ' 아르바이트')}
          </span>
        )}
        {traits.map((x) => (
          <span key={x.id} className="nb-fact" title={x.desc}>
            {x.icon} {x.label}
          </span>
        ))}
        {likes.map((a) => (
          <span key={a.id} className="nb-fact like" title="좋아하는 것">
            💚 {a.label}
          </span>
        ))}
        {skills.map(([x, lv]) => (
          <span key={x} className="nb-fact skill" title={`${SKILL_INFO[x].label} — 알게 됐을 때 ${lv}레벨쯤`}>
            {SKILL_INFO[x].icon} {SKILL_INFO[x].label} {lv}
          </span>
        ))}
        {extra?.chips}
        {all > known && (
          <span className="nb-fact unknown" title={`아직 모르는 것 — 이렇게 알게 돼요:\n${how}`}>
            ❓ {all - known}가지 더
          </span>
        )}
      </div>
      {extra?.hint && <div className="muted person-hint">{extra.hint}</div>}
    </div>
  );
}

/**
 * The dweller's aspiration: what they want to do, the step they're on and its goals, and every dream
 * they've had so far (꿈의 발자취). Dreams change, so a new one can be picked at any time.
 */
function Aspiration({ game, dweller }: { game: Game; dweller: Dweller }) {
  const asp = dweller.aspiration;
  const def = asp && ASPIRATION_BY_ID[asp.id];
  const trail = Object.values(dweller.aspirationLog ?? {}).filter((x) => x.id !== asp?.id && ASPIRATION_BY_ID[x.id]);
  const picker = (
    <AspirationPicker
      age={dweller.age}
      value={def ? asp!.id : ''}
      empty="하고 싶은 꿈을 골라 보세요…"
      suggested={dweller.suggestedArea}
      onPick={(id) => id && game.setAspiration(dweller.id, id)}
    />
  );
  if (!asp || !def) {
    return (
      <section>
        <h3>열망</h3>
        <div className="muted">꿈이 없어도 괜찮아요. 🧭 나를 찾아가는 여행으로 시작해 봐요.</div>
        {picker}
        <Trail trail={trail} />
      </section>
    );
  }
  const done = asp.milestone >= def.milestones.length;
  const m = def.milestones[Math.min(asp.milestone, def.milestones.length - 1)];
  const area = def.area && ASP_AREAS[def.area];
  return (
    <section>
      <h3>
        열망{' '}
        <span className="muted">
          {def.icon} {def.label} · {Math.min(asp.milestone + 1, def.milestones.length)}/{def.milestones.length}단계
        </span>
      </h3>
      <div className="muted asp-desc">
        {area && `${area.icon} ${area.label} · `}
        {def.desc}
      </div>
      <div className="asp-steps">
        {def.milestones.map((x, i) => (
          <span key={i} title={x.name} className={`asp-step ${i < asp.milestone ? 'done' : i === asp.milestone ? 'now' : ''}`} />
        ))}
      </div>
      {done ? (
        <div className="muted">🏆 모든 단계를 해냈어요! 새로운 것에 도전해 봐도 좋아요.</div>
      ) : (
        <ul className="asp-goals">
          <li className="muted">지금 단계: {m.name}</li>
          {m.goals.map((g, i) => {
            const met = goalMet(game, dweller, g);
            const progress = goalProgress(dweller, g);
            return (
              <li key={i} className={met ? 'met' : ''}>
                {met ? '✅' : '⬜'} {goalLabel(g)} {progress && <small className="muted">({progress})</small>}
              </li>
            );
          })}
          <li className="muted">목표 하나마다 +{Math.round(m.points / Math.max(1, m.goals.filter((g) => g.kind !== 'grownUp').length))} 만족 포인트</li>
        </ul>
      )}
      {!done && aspirationWorkType(def) && <WorkTypeGuide type={aspirationWorkType(def)!} />}
      {picker}
      <Trail trail={trail} />
    </section>
  );
}

/** Dreams the dweller had before, and how far they got (never "given up": "이만큼 해 봤어요"). */
function Trail({ trail }: { trail: Array<{ id: string; milestone: number }> }) {
  if (!trail.length) return null;
  return (
    <div className="asp-trail">
      <small className="muted">👣 꿈의 발자취</small>
      <ul>
        {trail.map((x) => {
          const d = ASPIRATION_BY_ID[x.id];
          return (
            <li key={x.id}>
              {d.icon} {d.label} <small className="muted">{x.milestone >= d.milestones.length ? '· 모두 해냈어요' : x.milestone > 0 ? `· ${x.milestone}단계까지 해 봤어요` : '· 시작해 봤어요'}</small>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The dweller's wants (whims), satisfaction points and the reward store. */
function Wishes({ game, dweller }: { game: Game; dweller: Dweller }) {
  const [storeOpen, setStoreOpen] = useState(false);
  const [storeTab, setStoreTab] = useState<StoreTab>('mood');
  const points = dweller.satisfaction ?? 0;
  return (
    <section>
      <h3>
        바람 <span className="sat">✨ {points.toLocaleString()} 만족 포인트</span>
      </h3>
      <ul className="wishes">
        {(dweller.wants ?? []).map((w) => {
          const def = WANT_BY_ID[w.defId];
          if (!def) return null;
          return (
            <li key={`${w.defId}@${w.targetId ?? ''}`}>
              <span className="w-icon">{def.icon}</span>
              <span className="w-label">
                {w.role && <small className={`w-role ${w.role}`}>{WANT_ROLE_LABEL[w.role]}</small>} {wantLabel(game, w)}
                {w.why && <small className="muted w-why"> {w.why}</small>}
              </span>
              <span className="w-chance">+{def.score}</span>
            </li>
          );
        })}
        {(dweller.wants ?? []).length === 0 && <li className="muted">지금은 바라는 게 없어요</li>}
      </ul>
      <div className="wish-actions">
        <button className="ghost" onClick={() => game.refreshWants(dweller.id)}>
          <Icon name="refresh" /> 새로고침
        </button>
        <button className="ghost" onClick={() => setStoreOpen((v) => !v)}>
          <Icon name="gift" /> 보상 상점
        </button>
      </div>
      {storeOpen && (
        <ul className="store">
          <li className="store-tabs" role="tablist">
            {(Object.keys(STORE_TABS) as StoreTab[]).map((t) => (
              <button key={t} role="tab" aria-selected={storeTab === t} className={`chip ${storeTab === t ? 'on' : ''}`} onClick={() => setStoreTab(t)} title={STORE_TABS[t].desc}>
                {STORE_TABS[t].icon} {STORE_TABS[t].label}
              </button>
            ))}
          </li>
          {STORE.filter((item) => item.tab === storeTab).map((item) => {
            const blocked = game.rewardBlocker(dweller, item);
            const owned = !!item.trait && dweller.traits.includes(item.trait);
            return (
              <li key={item.id}>
                <button disabled={!!blocked || points < item.price} onClick={() => game.buyReward(dweller.id, item.id)} title={blocked ?? item.desc}>
                  <span>{item.icon}</span>
                  <span className="w-label">
                    {item.label}
                    <small className="muted"> {blocked && !owned ? blocked : item.desc}</small>
                  </span>
                  <span className="w-chance">{owned ? '보유' : item.price}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** What free will would pick right now, with each option's odds. Click one to do it. */
function Wants({ game, dweller }: { game: Game; dweller: Dweller }) {
  const tick = Math.floor(game.version / 5); // refresh about twice a second, not every emit
  const options = useMemo(() => topChoices(rankOptions(game, dweller)), [game, dweller, tick]);
  return (
    <section>
      <h3>
        하고 싶은 것 <small className="muted">자율 행동 확률</small>
      </h3>
      {options.length === 0 ? (
        <div className="muted">딱히 하고 싶은 게 없어요</div>
      ) : (
        <ul className="wants">
          {options.map((o) => {
            const { label, icon } = game.actionLabel({ ...o.action, id: -1 } as Action);
            return (
              <li key={JSON.stringify(o.action)}>
                <button title="클릭해서 바로 시키기" onClick={() => game.enqueue(dweller.id, { ...o.action, autonomous: false })}>
                  <span className="w-icon">{icon}</span>
                  <span className="w-label">{label}</span>
                  <span className="w-chance">{Math.round(o.chance * 100)}%</span>
                  <span className="w-bar" style={{ width: `${o.chance * 100}%` }} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function RelBar({ label, value, positive }: { label: string; value: number; positive: string }) {
  return (
    <div className="rel-row">
      <span className="rel-name">{label}</span>
      <div className="bar rel">
        <div
          style={{
            left: value >= 0 ? '50%' : `${50 + value / 2}%`,
            width: `${Math.abs(value) / 2}%`,
            background: value >= 0 ? positive : '#ef5350',
          }}
        />
      </div>
      <span className="relv">{Math.round(value)}</span>
    </div>
  );
}

/** How hard the dweller works today: their own doing (workDrive.ts), with what's behind it. */
function WorkDriveLine({ game, dweller }: { game: Game; dweller: Dweller }) {
  const d = workDrive(dweller, game.hasFear(dweller, 'deadEndJob'));
  const t = TONES[d.tone];
  return (
    <div className="muted work-drive" title="근무 태도는 성격·기분·욕구에 따라 저절로 정해져요. 한 시간마다 다시 정해져요">
      근무 태도: {t.icon} {t.label}
      {d.why.length > 0 && <small> ({d.why.join(' · ')})</small>}
    </div>
  );
}

/**
 * Going along to work, a dweller at a time: on, each shift opens the workplace as a lot of its own (the
 * circles at the lot's top right switch to it); off, the shift is worked out of sight.
 */
function FollowToggle({ checked, place, onChange }: { checked: boolean; place: string; onChange: (on: boolean) => void }) {
  return (
    <label className="follow-toggle" title="켜면 출근할 때마다 근무지가 따로 열려요. 오른쪽 위 동그라미로 집과 근무지를 오갈 수 있어요">
      <span>🏢 출근할 때 따라가기 <span className="muted">({place})</span></span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

/** On a work lot, one line always in view: where, how long, how many tasks done, the shift so far. */
function WorkLine({ root, dwellerId, onOpen }: { root: Game; dwellerId: number; onOpen: () => void }) {
  const st = root.workStatus(dwellerId);
  if (!st) return null;
  const left = Math.max(0, Math.ceil((st.end - root.state.time) / 60));
  const done = st.tasks.filter((t) => t.count >= t.need).length;
  return (
    <button className={`work-line ${st.alarm ? 'alarm' : ''}`} onClick={onOpen} title="근무 탭 열기 (W)">
      <span>
        {st.def.icon} {st.def.name}
      </span>
      <span className="muted">
        퇴근까지 {left}시간 · 업무 {done}/{st.tasks.length} · 성과 {st.delta >= 0 ? '+' : ''}
        {st.delta}
      </span>
    </button>
  );
}

/** On a work lot: the day's tasks, how the shift is going, and a way to leave early (Get to Work style). */
function WorkPanel({ root, dwellerId }: { root: Game; dwellerId: number }) {
  const st = root.workStatus(dwellerId);
  if (!st) return null;
  const left = Math.max(0, Math.ceil((st.end - root.state.time) / 60));
  return (
    <section className="work-panel">
      <h3>
        {st.def.icon} {st.def.name} <span className="muted">· 퇴근까지 {left}시간</span>
      </h3>
      <div className="muted" title={stageInfo(st, st.def.careerId).desc}>
        {stageInfo(st, st.def.careerId).icon} {stageInfo(st, st.def.careerId).label} 단계 — {stageInfo(st, st.def.careerId).desc}
      </div>
      <ul className="asp-goals">
        {st.tasks.map((t) => (
          <li key={t.id + t.label} className={t.count >= t.need ? 'met' : ''}>
            {t.count >= t.need ? '✅' : '⬜'} <span title={t.kind ? TASK_KIND[t.kind].label : undefined}>{t.kind ? TASK_KIND[t.kind].icon : ''}</span> {t.label}{' '}
            {t.need > 1 && <small className="muted">({Math.min(t.count, t.need)}/{t.need})</small>}
            {!!t.failed && t.count < t.need && (
              <small style={{ color: 'var(--bad-text)' }} title="잘 되지 않은 시도는 업무로 치지 않아요 (역량은 조금 올라요)">
                {' '}
                · ⚠️ 실패 {t.failed}
              </small>
            )}
          </li>
        ))}
      </ul>
      {st.alarm && <div className="work-alarm">{st.def.alarm?.notice}</div>}
      {!!st.def.clients?.length && (
        <div className="muted">
          🧍 기다리는 사람 {st.waiting}명 · 오늘 응대 {st.served}명 <small>(클릭해서 맞이하세요)</small>
        </div>
      )}
      <div className="muted">
        오늘의 성과 예상: <b>{st.delta >= 0 ? '+' : ''}{st.delta}</b> (업무 점수 {st.points})
      </div>
      <small className="muted">업무 기구를 클릭해 일하고, 동료·상사와 이야기하세요. 이상적인 감정으로 일하면 점수가 더 올라요.</small>
      <button className="pizza-btn" onClick={() => root.finishWorkplace(dwellerId, true)}>
        <Icon name="leave" /> 일찍 퇴근하기 (급여·성과 손해)
      </button>
    </section>
  );
}

/** Gender, set when the dweller was made (gender.ts). */
function GenderLine({ dweller }: { dweller: Dweller }) {
  if (!dweller.gender || dweller.npc) return null;
  return (
    <div className="gender-line">
      <span className="muted">성별</span> <b>{GENDER_LABEL[dweller.gender]}</b>
    </div>
  );
}

/** The menu a right-click on a dweller's name opens (ours): changing their name and look. */
function DwellerMenu({ x, y, name, onClose, onEdit, moveOut, moveOutBlocked }: { x: number; y: number; name: string; onClose: () => void; onEdit: () => void; moveOut: () => void; moveOutBlocked: string | null }) {
  const [sure, setSure] = useState(false);
  return createPortal(
    <div className="dweller-menu-backdrop" onClick={onClose} onContextMenu={(e) => (e.preventDefault(), onClose())}>
      <div className="dweller-menu" style={{ left: x, top: y }} role="menu" aria-label={`${name} 메뉴`} onClick={(e) => e.stopPropagation()}>
        <div className="dweller-menu-head">{name}</div>
        <button role="menuitem" onClick={onEdit}>
          <Icon name="edit" /> 캐릭터 고치기
        </button>
        {sure ? (
          <button role="menuitem" className="danger" onClick={moveOut}>
            🏠 정말 따로 살게 하기 (이웃이 돼요)
          </button>
        ) : (
          <button role="menuitem" disabled={!!moveOutBlocked} title={moveOutBlocked ?? '조작할 수 없는 이웃이 돼요. 관계는 그대로 남아요'} onClick={() => setSure(true)}>
            🏠 따로 살게 하기{moveOutBlocked ? ` · ${moveOutBlocked}` : ''}
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** Traits, likes and fears, and how old the dweller is (참고 게임's Simology panel). */
const DwellerStyler = lazy(() => import('./DwellerStyler'));
const CharacterCreator = lazy(() => import('./CharacterCreator').then((m) => ({ default: m.CharacterCreator })));

/** The character screen on someone in play (2026-11-01, at the user's request), time stopped behind it. */
function EditCharacter({ game, dweller, onClose }: { game: Game; dweller: Dweller; onClose: () => void }) {
  useEffect(() => {
    const speed = game.state.speed;
    game.setSpeed(0);
    return () => game.setSpeed(speed);
  }, [game]);
  return createPortal(
    <Suspense fallback={null}>
      <CharacterCreator
        editing={dweller}
        overwriting={false}
        onBack={onClose}
        onDone={() => undefined}
        onSave={(s) => {
          game.restyle(dweller.id, { name: s.name, skin: s.skin, hair: s.hair, hairStyle: s.hairStyle, hairFrom: s.hairFrom, closet: s.closet, wear: s.wear, outfit: s.outfit, shirt: s.shirt, bottom: s.bottom, pants: s.pants, shoeColor: s.shoeColor, face: s.face, eyes: s.eyes, tints: s.tints });
          if (dweller.age !== 'toddler') {
            game.editMind(dweller.id, { traits: s.traits, likes: s.likes, dislikes: s.dislikes });
            if (s.aspiration && s.aspiration !== dweller.aspiration?.id) game.setAspiration(dweller.id, s.aspiration);
            else if (!s.aspiration) game.clearAspiration(dweller.id);
          }
          onClose();
        }}
      />
    </Suspense>,
    document.body,
  );
}

/** The edit window for a dweller's name and look (DwellerStyler.tsx), or the salon's, over the panel. */
function StylerFor({ game, dweller, mode, onClose, onDone }: { game: Game; dweller: Dweller; mode: import('./DwellerStyler').StyleMode; onClose: () => void; onDone: (p: LookPatch, spend?: number) => void }) {
  return createPortal(
    <Suspense fallback={null}>
      <DwellerStyler game={game} dweller={dweller} mode={mode} onCancel={onClose} onDone={(p, spend) => (onClose(), onDone(p, spend))} />
    </Suspense>,
    document.body,
  );
}

function SelfTab({ game, dweller }: { game: Game; dweller: Dweller }) {
  /** 📚 연구 노트, open at this note (null = closed). */
  const [note, setNote] = useState<string | null>(null);
  const brave = fearCourage(dweller) >= 0.5;
  return (
    <>
      {note && createPortal(<ResearchNotes dweller={dweller} initial={note} onClose={() => setNote(null)} />, document.body)}
      <AgeLine game={game} dweller={dweller} />
      <GenderLine dweller={dweller} />
      <section>
        <h3>
          특성
          <button className="ghost small cx-open" onClick={() => setNote(dweller.fears?.length ? 'how_ladder' : 'trait_planner')} title="특징 가운데 연구에서 가져온 것들: 게임에서는 어떻게, 현실에서는 어떤지">
            📚 연구 노트
          </button>
        </h3>
        {dweller.traits.length === 0 && <div className="muted">아직 특성이 없어요</div>}
        <ul className="trait-list">
          {traitsOf(dweller.traits).map((t) => (
            <li key={t.id}>
              <span className="tl-icon">{t.icon}</span>
              <span>
                <b>{t.label}</b>
                {t.id === dweller.aspBonus ? <small className="muted"> · 지금 열망의 보너스</small> : t.reward && <small className="muted"> · 보상</small>}
                {traitNoteId(t.id) && (
                  <button className="ghost small rn-link" onClick={() => setNote(traitNoteId(t.id))} title="이 특성의 연구 노트">
                    📚
                  </button>
                )}
                <small className="muted tl-desc">{t.desc}</small>
              </span>
            </li>
          ))}
        </ul>
      </section>
      {dweller.likes?.length || dweller.dislikes?.length ? (
        <section>
          <h3>좋아하는 것 · 싫어하는 것</h3>
          <div className="prefs">
            {PREFERENCES.filter((a) => dweller.likes?.includes(a.id)).map((a) => (
              <span key={a.id} className="pref-chip like">
                💚 {a.label}
              </span>
            ))}
            {PREFERENCES.filter((a) => dweller.dislikes?.includes(a.id)).map((a) => (
              <span key={a.id} className="pref-chip">
                💢 {a.label}
              </span>
            ))}
          </div>
        </section>
      ) : null}
      {dweller.fears?.length || dweller.fearsFaced ? (
        <section>
          <h3>
            두려움{' '}
            {dweller.fearsFaced ? <span className="muted">· 이겨낸 두려움 {dweller.fearsFaced}개</span> : null}
          </h3>
          {/* Each fear with where it came from, what it does, and the ways through it (fears.ts). */}
          {(dweller.fears ?? []).map((f) => {
            const d = FEAR_BY_ID[f];
            const got = Math.min(d.need, dweller.fearProgress?.[f] ?? 0);
            const level = fearLevel(dweller, f);
            return (
              <div key={f} className={`fear-card fear-l${level}`}>
                <div className="fear-head">
                  <span aria-hidden>{d.icon}</span> <b>{d.label}</b>
                  <span className="fear-level" title={`세기: ${FEAR_LEVEL_LABEL[level]} (내버려 두면 커지고, 이겨내는 길을 끝까지 가면 한 단계씩 내려와요)`}>
                    {'●'.repeat(level)}
                    {'○'.repeat(MAX_FEAR_LEVEL - level)} {FEAR_LEVEL_LABEL[level]}
                  </span>
                  <span className="fear-bar" title={`${level > 1 ? '한 단계 내려가기' : '극복'}까지 ${Math.round((got / d.need) * 100)}%`}>
                    <span style={{ width: `${(got / d.need) * 100}%` }} />
                  </span>
                  <button className="ghost small rn-link" onClick={() => setNote(`fear_${f}`)} title="이 두려움의 연구 노트">
                    📚
                  </button>
                </div>
                <div className="fear-line muted">{d.why} 생겼어요. {d.does}.</div>
                {d.shy && <div className="fear-line muted">🧭 {d.overdo || !brave ? d.shy : `회복탄력성 덕분에 ${d.bold}`}</div>}
                <div className="fear-line">
                  이겨내는 길: <b>{d.face}</b>
                  {d.also ? ` · ${d.also}` : ''} · 가까운 사람과 깊은 대화 · 회복탄력성 키우기
                </div>
              </div>
            );
          })}
          {!dweller.fears?.length && <div className="muted">지금은 두려운 게 없어요. 이겨낸 두려움은 회복탄력성으로 남았어요.</div>}
        </section>
      ) : null}
    </>
  );
}

/** What the needs are doing to this dweller just now, and what's coming: kept off the gauges (2026-11-01, at the user's request). */
function NeedEffectsModal({ dweller, onClose }: { dweller: Dweller; onClose: () => void }) {
  const lines = needLines(dweller).filter((l) => (l.state && l.effects.length > 0) || l.next);
  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal mood-card" role="dialog" aria-modal="true" aria-label="욕구가 주는 효과" onClick={(e) => e.stopPropagation()}>
        <div className="mood-card-head">
          <b>욕구가 주는 효과</b>
          <button className="ghost small" onClick={onClose} aria-label="닫기">
            <Icon name="close" />
          </button>
        </div>
        {lines.length === 0 && <div className="muted">지금은 욕구 때문에 달라지는 것이 없어요.</div>}
        {lines.map(({ need: k, state, effects, next }) => (
          <div key={k} className="need-effect">
            <b>
              {NEED_INFO[k].icon} {NEED_INFO[k].label}
              {state && state !== NEED_INFO[k].label ? ` · ${state}` : ''}
            </b>{' '}
            {state &&
              effects.map((e) => (
                <span key={e.text} className={e.good ? 'good' : 'bad'}>
                  {e.text}
                </span>
              ))}
            {!state && next && <span className="muted">{next}</span>}
          </div>
        ))}
      </div>
    </div>,
    document.body,
  );
}

function NeedsTab({ game, dweller }: { game: Game; dweller: Dweller }) {
  const [effectsOpen, setEffectsOpen] = useState(false);
  const active = needLines(dweller).filter((l) => l.state && l.effects.length > 0).length;
  return (
    <>
      <section>
        <h3>
          욕구
          <button className="ghost small cx-open" onClick={() => setEffectsOpen(true)} title="욕구 상태가 지금 주는 효과 보기">
            효과 보기{active > 0 ? ` (${active})` : ''}
          </button>
        </h3>
        <ul className="needs">
          {NEED_KEYS.map((k) => (
            <li key={k}>
              <span className="nlabel">
                {NEED_INFO[k].icon} {NEED_INFO[k].label}
              </span>
              <div className="bar">
                <div style={{ width: `${dweller.needs[k]}%`, background: needColor(dweller.needs[k]) }} />
              </div>
            </li>
          ))}
        </ul>
        {effectsOpen && <NeedEffectsModal dweller={dweller} onClose={() => setEffectsOpen(false)} />}
      </section>
      <Moodlets game={game} dweller={dweller} />
      {!dweller.away && <Wants game={game} dweller={dweller} />}
      <Babies game={game} />
    </>
  );
}

function SkillsTab({ game, root, dweller }: { game: Game; root?: Game; dweller: Dweller }) {
  /** 역량 알아보기, open at this skill (null = closed). */
  const [guide, setGuide] = useState<SkillKey | 'any' | null>(null);
  return (
    <section>
      <h3>
        역량
        {dweller.age !== 'baby' && (
          <button className="ghost small cx-open" onClick={() => setGuide('any')} title="역량마다 어떤 힘인지, 게임과 현실에서 어떻게 키우는지 살펴봐요">
            💡 역량 알아보기
          </button>
        )}
      </h3>
      {guide && createPortal(<SkillGuide game={root ?? game} dwellerId={dweller.id} initial={guide === 'any' ? undefined : guide} onClose={() => setGuide(null)} />, document.body)}
      {/* Like 참고 게임, only skills the dweller has started show up. */}
      {SKILL_KEYS.every((k) => dweller.skills[k] <= 0 || !skillShown(dweller, k)) && <div className="muted">아직 배운 스킬이 없어요</div>}
      {[...SKILL_GROUPS, { label: '', keys: SKILL_KEYS.filter((k) => !SKILL_GROUPS.some((g) => g.keys.includes(k))) }].map((group) => {
        const keys = group.keys.filter((k) => dweller.skills[k] > 0 && skillShown(dweller, k));
        if (!keys.length) return null;
        return (
          <ul className="skills" key={group.label}>
            {group.label && <li className="muted skill-group">{group.label}</li>}
            {keys.map((k) => {
              const v = dweller.skills[k];
              const lvl = Math.floor(v);
              return (
                <li key={k} className="skill-open" title={`${CHILD_SKILLS.has(k) || TODDLER_SKILLS.has(k) ? '' : `${lvl}레벨: ${SKILL_LEVEL_NAMES[lvl] ?? ''}\n`}${homeCapNote(dweller, k) ? `${homeCapNote(dweller, k)}\n` : ''}${SKILL_HOWTO[k] ? `키우는 방법: ${SKILL_HOWTO[k]}
` : ''}누르면 자세히 볼 수 있어요`} onClick={() => setGuide(k)}>
                  <span className="nlabel">
                    {SKILL_INFO[k].icon} {SKILL_INFO[k].label}
                  </span>
                  <span className="pips">
                    {Array.from({ length: 10 }, (_, i) => (
                      <span key={i} className={i < lvl ? 'pip on' : i === lvl ? 'pip part' : 'pip'} style={i === lvl ? { ['--p' as string]: `${(v - lvl) * 100}%` } : undefined} />
                    ))}
                  </span>
                </li>
              );
            })}
          </ul>
        );
      })}
    </section>
  );
}

function CareerTab({ game, root, dweller }: { game: Game; root?: Game; dweller: Dweller }) {
  const [exploring, setExploring] = useState(false);
  const career = dweller.job && CAREER_BY_ID[dweller.job.careerId];
  const level = career && dweller.job ? levelOf(dweller.job) : null;
  return (
    <>
      <section>
        <h3>
          {career?.school ? '학교' : '직업'}
          {dweller.age !== 'child' && dweller.age !== 'toddler' && dweller.age !== 'baby' && (
            <button className="ghost small cx-open" onClick={() => setExploring(true)} title="직업마다 필요한 역량과 키우는 방법을 살펴봐요">
              <Icon name="compass" /> 진로 탐색
            </button>
          )}
        </h3>
        {/* On the page itself: the panel's glass (backdrop-filter) would otherwise hold a fixed dialog inside it. */}
        {exploring && createPortal(<CareerExplorer game={root ?? game} dwellerId={dweller.id} onClose={() => setExploring(false)} />, document.body)}
        {career && level && dweller.job ? (
          <div className="job">
            <div>
              {career.icon} <b>{level.title}</b> <small>({career.name})</small>
            </div>
            <div className="muted">
              {daysText(level.days)} {formatClock(level.start)}–{formatClock(level.end)}
              {career?.school ? ' · 숙제를 하면 성적이 올라요' : ` · 일당 §${level.pay}`}
            </div>
            <div className="perf">
              업무 성과
              <div className="bar rel" title="100이면 승진, -80이면 강등">
                <div
                  style={{
                    left: dweller.job.performance >= 0 ? '50%' : `${50 + dweller.job.performance / 2}%`,
                    width: `${Math.abs(dweller.job.performance) / 2}%`,
                    background: dweller.job.performance >= 0 ? '#42a5f5' : '#ef5350',
                  }}
                />
              </div>
              <span className="relv">{Math.round(dweller.job.performance)}</span>
            </div>
            <div className="perf" title={`집에서 ${SKILL_INFO[career.skill].label} 스킬을 연습하면 다음 근무 성과 +20`}>
              오늘의 과제
              <div className="bar">
                <div style={{ width: `${(dweller.job.task ?? 0) * 100}%`, background: '#ffca28' }} />
              </div>
            </div>
            {WORKPLACES[career.id] && !root && (
              <FollowToggle checked={!!dweller.job.follow} place={WORKPLACES[career.id].name} onChange={(on) => game.setFollowWork(dweller.id, on)} />
            )}
            {!career.school && <WorkDriveLine game={game} dweller={dweller} />}
            {nextLevelOf(dweller.job, dweller.skills) && (
              <div className="muted">
                {career.school
                  ? `다음 성적: ${nextLevelOf(dweller.job)!.title}`
                  : `다음 승진: ${nextLevelOf(dweller.job, dweller.skills)!.title}${levelOf(dweller.job).needs?.length ? ` (${needsText(levelOf(dweller.job), (k) => SKILL_INFO[k].label)})` : ''}`}
              </div>
            )}
            {dweller.job.branch !== undefined && career.branches && <div className="muted">계열: {career.branches[dweller.job.branch].name}</div>}
            {dweller.job.branch === undefined && career.branches && dweller.job.level >= career.levels.length - 2 && (
              <div className="tones">
                <span className="muted">다음 계열:</span>
                {career.branches.map((b, i) => (
                  <button key={b.id} className={(dweller.job!.branchPick ?? -1) === i ? 'on' : ''} onClick={() => game.pickBranch(dweller.id, i)} title={needsText(b.levels[0], (k) => SKILL_INFO[k].label)}>
                    {b.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="muted">무직이에요. 컴퓨터에서 구직해 보세요 💻</div>
        )}
      </section>
      {dweller.partTime &&
        (() => {
          const c = CAREER_BY_ID[dweller.partTime.careerId];
          const l = levelOf(dweller.partTime);
          return (
            <section>
              <h3>아르바이트</h3>
              <div className="muted parttime">
                {c.icon} {c.name} · {l.title} · {daysText(l.days)} {formatClock(l.start)}–{formatClock(l.end)} · 일당 §{l.pay}
                {WORKPLACES[c.id] && !root && (
                  <FollowToggle checked={!!dweller.partTime.follow} place={WORKPLACES[c.id].name} onChange={(on) => game.setFollowWork(dweller.id, on, 'partTime')} />
                )}
              </div>
            </section>
          );
        })()}
      <BooksSection game={game} dweller={dweller} />
    </>
  );
}

/** The dweller's books still paying royalties, and for how long (books.ts). */
function BooksSection({ game, dweller }: { game: Game; dweller: Dweller }) {
  const books = (game.state.royalties ?? []).filter((b) => (b.authorId !== undefined ? b.authorId === dweller.id : b.author === dweller.name));
  if (!books.length) return null;
  const { day } = clockInfo(game.state.time);
  const lifespan = game.state.lifespan ?? 'normal';
  return (
    <section>
      <h3>펴낸 책 · 인세</h3>
      <ul className="books" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4 }}>
        {books.map((b, i) => (
          <li key={i} className="muted" title={b.left === undefined ? '베스트셀러는 계속 팔려요. 인세는 어른 시기 한 번 동안 절반으로 줄어요' : '책의 등급에 따라 인세가 들어오는 날이 정해져 있어요'}>
            📖 「{b.title}」 {b.stars && <small>{STARS_LABEL(b.stars)}</small>} · 하루 §{b.perDay} · {royaltyLeftText(b, day, lifespan)}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Everyone the dweller knows: the people on the lot, then the neighbourhood (참고 게임's relationship panel). */
const WHERE_REL = { family: '🏠 가족', here: '🏡 와 있음', work: '💼 직장', street: '🏘️ 이웃' } as const;

/**
 * Everyone the dweller has a relationship with who isn't here now (game.relationsOf): family, neighbours,
 * colleagues, stars — only those they've got to know, closest first (2026-10-26, at the user's request).
 */
function Relations({ game, dweller, skip }: { game: Game; dweller: Dweller; skip: number[] }) {
  const list = game.relationsOf(dweller.id).filter((r) => !skip.includes(r.id));
  if (dweller.npc) return null;
  return (
    <section>
      <h3>
        맺은 관계 <span className="muted">· 알게 된 사람만 보여요</span>
      </h3>
      {list.length ? (
        <ul className="rels">
          {list.map((r) => (
            <PersonCard key={r.id} rel={r.rel} name={r.name} tag={WHERE_REL[r.where]} />
          ))}
        </ul>
      ) : (
        <p className="muted small">아직 알게 된 사람이 없어요. 이웃이나 동료와 이야기를 나눠 보세요.</p>
      )}
    </section>
  );
}

/**
 * The 관계 tab. At home: who's here, then everyone the dweller knows. On a work lot (2026-10-26, at the
 * user's request: nothing showed there) the people at work — colleagues and clients too — then the
 * dweller's relationships kept at home (`root`).
 */
function RelsTab({ game, dweller, root }: { game: Game; dweller: Dweller; root?: Game }) {
  const home = !root;
  const shown = (s: Dweller) => !s.npc || s.npc.role === 'guest' || (!home && (s.npc.role === 'coworker' || s.npc.role === 'client'));
  const others = game.state.dwellers.filter((s) => s.id !== dweller.id && shown(s));
  return (
    <>
      {others.length > 0 && (
        <section>
          <h3>{home ? '함께 있는 사람' : '일터의 사람들'}</h3>
          <ul className="rels">
            {others.map((o) => {
              const rel = game.relationship(dweller.id, o.id);
              const mood = rel.mood;
              const vibe =
                mood.awkward < 0 ? '😬 어색한 분위기' : mood.romance >= 25 ? '💗 달달한 분위기' : mood.fun >= 25 ? '😆 유쾌한 분위기' : mood.friendly >= 25 ? '🙂 화기애애' : null;
              const townie = o.npc?.role === 'coworker' ? (root ?? game).state.townies?.find((x) => x.id === o.id) : undefined;
              return (
                <PersonCard
                  key={o.id}
                  rel={rel}
                  name={o.name}
                  tag={game.familyTie(dweller, o) ? kinWord(game.familyTie(dweller, o)!, dweller, o) : o.npc?.boss ? '상사' : o.npc?.role === 'coworker' ? o.npc.rung?.title ?? '동료' : o.npc?.role === 'client' ? '손님' : undefined}
                  sub={o.npc?.role === 'coworker' ? <FaceLine here={game} live={o} /> : vibe}
                  actions={!o.npc && !game.dateBlocker(dweller, o.id) && <PersonAction icon="heart" label="데이트" onClick={() => game.askOnDate(dweller.id, o.id)} title="데이트 신청하기" />}
                >
                  {o.npc?.role === 'coworker' && vibe && <div className="muted rel-vibe">{vibe}</div>}
                  {townie && <KnownFacts dweller={dweller} t={townie} extra={colleagueFacts(root ?? game, dweller, townie, o)} />}
                  {(rel.sentiments ?? [])
                    .filter((x) => x.holder === dweller.id && x.until > game.state.time)
                    .map((x) => (
                      <div key={x.kind} className={`sentiment ${isPositiveSentiment(x.kind) ? 'good' : 'bad'}`}>
                        {SENTIMENT_ICON[x.kind]} {x.label} <small className="muted">{Math.ceil((x.until - game.state.time) / 1440)}일</small>
                      </div>
                    ))}
                </PersonCard>
              );
            })}
          </ul>
        </section>
      )}
      {(root ?? game).dweller(dweller.id) && <Relations game={root ?? game} dweller={(root ?? game).dweller(dweller.id)!} skip={others.map((o) => o.id)} />}
      {home && <Colleagues game={game} dweller={dweller} />}
      {home && <Neighbours game={game} dweller={dweller} />}
    </>
  );
}

/** The phone: services, a pizza, parties, adoption and outings (참고 게임 puts these on the Dweller's phone), and the stock app. */
function PhoneTab({ game, dweller }: { game: Game; dweller: Dweller }) {
  return (
    <>
      <Outings game={game} dweller={dweller} />
      <Services game={game} dweller={dweller} />
      <HomeSection game={game} />
      <StockSection game={game} />
    </>
  );
}

export type PanelTab = 'work' | 'needs' | 'self' | 'asp' | 'career' | 'skills' | 'rels' | 'bag' | 'phone';

/**
 * The dweller info panel's tabs, after 참고 게임's (욕구 O, 시몰로지 Y, 야망 G, 직업 J, 기술 L, 관계 R, 가방 I;
 * Strings_KOR_KR) with the same keys; the phone (P) is ours, for what 참고 게임 does from the phone.
 */
export const PANEL_TABS: Array<{ id: PanelTab; icon: IconName; label: string; key: string }> = [
  { id: 'work', icon: 'work', label: '근무', key: 'w' },
  { id: 'needs', icon: 'needs', label: '욕구', key: 'o' },
  { id: 'self', icon: 'self', label: '성격', key: 'y' },
  { id: 'asp', icon: 'sparkles', label: '열망', key: 'g' },
  { id: 'career', icon: 'career', label: '직업', key: 'j' },
  { id: 'skills', icon: 'skills', label: '역량', key: 'l' },
  { id: 'rels', icon: 'rels', label: '관계', key: 'r' },
  { id: 'bag', icon: 'bag', label: '가방', key: 'i' },
  { id: 'phone', icon: 'smartphone', label: '휴대폰', key: 'p' },
];

/** Tabs a dweller has: toddlers have no job, and the bag and phone stay home when the lot is a workplace. */
export function tabsFor(dweller: Dweller, atWork: boolean): PanelTab[] {
  return PANEL_TABS.map((t) => t.id).filter((t) => {
    if ((t === 'bag' || t === 'phone') && atWork) return false;
    if (t === 'work' && !atWork) return false;
    if (t === 'career' && (dweller.age === 'toddler' || dweller.age === 'baby')) return false;
    if (t === 'phone' && dweller.npc) return false;
    return true;
  });
}

/**
 * The dweller panel, laid out like 참고 게임's live-mode HUD: the household's portraits, the active dweller's
 * emotion and moodlets, needs at a glance and whims always in view, and the rest in tabs.
 */
export function DwellerPanel({ game, root, tab, onTab }: { game: Game; root?: Game; tab: PanelTab; onTab: (t: PanelTab) => void }) {
  const dweller = game.activeDweller;
  const tabs = tabsFor(dweller, !!root);
  const shown = tabs.includes(tab) ? tab : root ? 'work' : 'needs';
  const career = dweller.job && CAREER_BY_ID[dweller.job.careerId];
  // The right-click menu on a dweller's name (where it opened, and whose), and the edit window it opens.
  const [menu, setMenu] = useState<{ x: number; y: number; id: number } | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const editDweller = editing !== null ? game.dweller(editing) : undefined;
  return (
    <aside className="panel hud">
      <div className="hud-head">
        <div className="portraits">
          {game.household().filter((s) => s.age !== 'baby').map((s) => (
            <Portrait key={s.id} game={game} dweller={s} active={s.id === dweller.id} onClick={() => game.setActive(s.id)} onMenu={(e) => setMenu({ x: e.clientX, y: e.clientY, id: s.id })} />
          ))}
        </div>
        {menu && <DwellerMenu x={menu.x} y={menu.y} name={game.dweller(menu.id)?.name ?? ''} onClose={() => setMenu(null)} onEdit={() => (setEditing(menu.id), setMenu(null))} moveOut={() => (game.moveOut(menu.id), setMenu(null))} moveOutBlocked={game.dweller(menu.id) ? game.moveOutBlocker(game.dweller(menu.id)!) : '가족이 아니에요'} />}
        {editDweller && !root && <EditCharacter game={game} dweller={editDweller} onClose={() => setEditing(null)} />}
        {root && game.state.workplace && <WorkLine root={root} dwellerId={game.state.workplace.workerId} onOpen={() => onTab('work')} />}
        <MoodTray game={game} dweller={dweller} />
        <NeedStrip dweller={dweller} onOpen={() => onTab('needs')} />
        <AspChip game={game} dweller={dweller} onOpen={() => onTab('asp')} />
        <WhimRow game={game} dweller={dweller} onOpen={() => onTab('asp')} />
        {game.convoOf(dweller).length > 0 && (
          <div className="convo-line">
            💬 대화 중: {game.convoOf(dweller).filter((m) => m !== dweller).map((m) => m.name).join(', ')}
          </div>
        )}
      </div>
      <nav className="hud-tabs" role="tablist">
        {PANEL_TABS.filter((t) => tabs.includes(t.id)).map((t) => (
          <button key={t.id} role="tab" aria-selected={shown === t.id} className={shown === t.id ? 'on' : ''} onClick={() => onTab(t.id)} title={`${t.label} (${t.key.toUpperCase()})`}>
            <span className="ht-icon">
              <Icon name={t.icon} />
            </span>
            <span className="ht-label">{t.id === 'career' && career?.school ? '학교' : t.label}</span>
          </button>
        ))}
      </nav>
      <div className="hud-body" role="tabpanel">
        {shown === 'work' && root && game.state.workplace && <WorkPanel root={root} dwellerId={game.state.workplace.workerId} />}
        {shown === 'needs' && <NeedsTab game={game} dweller={dweller} />}
        {shown === 'self' && <SelfTab game={game} dweller={dweller} />}
        {shown === 'asp' && (
          <>
            <Aspiration game={game} dweller={dweller} />
            <Wishes game={game} dweller={dweller} />
          </>
        )}
        {shown === 'career' && <CareerTab game={game} root={root} dweller={dweller} />}
        {shown === 'skills' && <SkillsTab game={game} root={root} dweller={dweller} />}
        {shown === 'rels' && <RelsTab game={game} dweller={dweller} root={root} />}
        {shown === 'bag' && (
          <>
            <Inventory game={game} />
            <Collections game={game} />
          </>
        )}
        {shown === 'phone' && <PhoneTab game={game} dweller={dweller} />}
      </div>
    </aside>
  );
}
