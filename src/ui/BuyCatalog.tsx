import { useState } from 'react';
import { BUYABLE, BUY_FNS, BUY_ROOMS, OBJECT_BUY, objectSummary, type BuyRoom } from '../game/buyCategories';
import { NEED_INFO, SKILL_INFO } from '../game/constants';
import { FLOOR_STYLES, WALL_STYLES } from '../game/decor';
import { EMOTIONS } from '../game/emotions';
import type { Game } from '../game/game';
import type { ObjectDef } from '../game/types';
import { BUILD_COST, type BuildTool } from '../game/game';
import { objectValue } from '../game/economy';
import { getDef } from '../game/catalog';
import { EMPTY_LOT } from '../game/lots';
import { EARN_MINUTES, LOT_TRAITS, MAX_LOT_TRAITS } from '../game/lotTraits';
import { RUGS } from '../game/homeFurniture';
import type { Placing } from './GameView';
import { Icon, type IconName } from './Icon';

const BUILD_TOOLS: Array<{ id: BuildTool; label: string; icon: IconName; desc: string }> = [
  { id: 'room', label: '방 짓기', icon: 'home', desc: '한 칸에서 다른 칸까지 끌면 그 칸들 둘레의 선에 벽을 세워요. 안쪽 잔디에는 마루를 깔아요' },
  { id: 'wall', label: '벽 세우기', icon: 'wall', desc: '칸과 칸 사이 선 위에 벽을 세워요. 모서리에서 모서리까지 끌면 곧게 이어지고, 누르기만 하면 가까운 변 하나에 세워요' },
  { id: 'door', label: '문 달기', icon: 'door', desc: '벽이 있는 변을 눌러 문을 달아요' },
  { id: 'window', label: '창문 내기', icon: 'window', desc: '벽이 있는 변을 눌러 창문을 내요. 창문을 한 번 더 누르면 없어져요' },
  { id: 'floor', label: '바닥 깔기', icon: 'floor', desc: '잔디에 마루를 깔아 집을 넓혀요' },
  { id: 'path', label: '길 깔기', icon: 'path', desc: '잔디에 돌길을 깔아요' },
  { id: 'remove', label: '허물기', icon: 'remove', desc: '선 가까이 누르면 그 벽·문·창문을, 칸 안쪽을 누르면 바닥·길을 걷어요' },
];

/**
 * Buying bare land to build a home on before moving in (참고 게임 empty lots, Game.buyLand): the land
 * gets a tab of its own, and the household lives on here meanwhile.
 */
function NewLand({ game }: { game: Game }) {
  if (game.siteGame) return null;
  const poor = game.state.money < (EMPTY_LOT.price ?? 0);
  return (
    <>
      <div className="build-head">새 땅 (먼저 짓고 이사하기)</div>
      <button className="item" disabled={poor || !!game.state.workplace} title={EMPTY_LOT.desc} onClick={() => game.buyLand()}>
        <span className="item-icon" style={{ background: 'var(--navy-grad)' }}>
          <Icon name="site" />
        </span>
        <span className="item-name">{poor ? '돈이 부족해요' : '빈 땅 사기'}</span>
        <span className="item-price">§{EMPTY_LOT.price}</span>
      </button>
    </>
  );
}

/**
 * On the land being built on: what it still needs, then moving in (Game.moveIntoSite), the
 * household's furniture packed along if wanted; or selling the land again.
 */
function MoveIn({ site }: { site: Game }) {
  const home = site.owner!;
  const [take, setTake] = useState(true);
  const [selling, setSelling] = useState(false);
  const offer = home.siteOffer(take);
  const has = (re: RegExp) => [...site.state.objects, ...home.storage].some((o) => re.test(o.defId));
  const checks: Array<[string, boolean]> = [
    ['침대', has(/bed/i)],
    ['변기', has(/^toilet/)],
    ['냉장고', has(/fridge/i)],
  ];
  return (
    <>
      <div className="build-head">이사하기 (먼저 집을 지어요)</div>
      <div className="home-confirm">
        <div>{offer.ok ? '✅ 이사할 수 있어요' : `🚧 ${offer.reason}`}</div>
        <div className="muted">
          있으면 좋은 것: {checks.map(([name, ok]) => `${ok ? '✓' : '✗'} ${name}`).join(' · ')}
          {take ? ' (보관함 가구 포함)' : ''}
        </div>
        <label>
          <input type="checkbox" checked={take} onChange={(e) => setTake(e.target.checked)} /> 우리 가구 가져가기 (📦 보관함으로)
        </label>
        <div>
          {home.lot.rent ? (take ? '보증금' : '보증금과 가구 값') : take ? '지금 집을 팔고' : '지금 집과 가구를 팔고'} +§{offer.proceeds} → 이사 뒤 §{offer.after}
        </div>
        <button className="primary" disabled={!offer.ok} onClick={() => home.moveIntoSite(take)}>
          <Icon name="move" /> 이 집으로 이사하기
        </button>
        {!selling ? (
          <button className="ghost" onClick={() => setSelling(true)}>
            땅 팔기
          </button>
        ) : (
          <button className="ghost" onClick={() => home.sellLand()}>
            정말 팔기 (+§{site.landSale})
          </button>
        )}
      </div>
    </>
  );
}

interface Props {
  game: Game;
  placing: Placing | null;
  setPlacing: (p: Placing | null) => void;
}

/** Good points worth knowing before buying (참고 게임 shows them on the product card). */
function perks(d: ObjectDef): string[] {
  const out: string[] = [];
  if (d.restfulness) out.push('😴 숙면: 스트레스·불편함이 빨리 풀리고 개운하게 깰 때가 있어요');
  if ((d.cookingQuality ?? 0) > 6) out.push(`🍳 요리 품질 +${d.cookingQuality! - 5.5}`);
  if (d.funMul) out.push(`🎉 재미 ×${d.funMul}`);
  if (d.wearMul) out.push('🔧 잘 고장 나지 않아요');
  if (d.powerMul) out.push('⚡ 전기를 아껴요');
  return out;
}

/** A few small icons on a tile: the needs it fills, the skills it trains, a mood it lends the room. */
function badges(d: ObjectDef): string {
  const sum = objectSummary(d);
  return [...sum.needs.slice(0, 2).map((k) => NEED_INFO[k].icon), ...sum.skills.slice(0, 2).map((k) => SKILL_INFO[k].icon), d.env ? EMOTIONS[d.env.emotion].icon : ''].join('');
}

/** The product card for the thing pointed at or picked: what it does, for whom, and what it costs. */
function ItemCard({ d, money }: { d: ObjectDef; money: number }) {
  const sum = objectSummary(d);
  const where = OBJECT_BUY[d.id];
  return (
    <div className="buy-card">
      <div className="buy-card-head">
        <span className="item-icon" style={{ background: d.color }}>
          {d.icon}
        </span>
        <span>
          <b>{d.name}</b>
          <small className="muted">
            {' '}
            §{d.price} · {d.w}×{d.h}칸{where ? ` · ${where.rooms.map((r) => BUY_ROOMS[r].label).join('·')}` : ''}
          </small>
        </span>
      </div>
      {money < d.price && <div className="buy-poor">돈이 §{Math.ceil(d.price - money)} 모자라요</div>}
      {sum.needs.length > 0 && (
        <div>
          <span className="muted">채우는 욕구 </span>
          {sum.needs.map((k) => (
            <span key={k} className="buy-tag">
              {NEED_INFO[k].icon} {NEED_INFO[k].label}
            </span>
          ))}
        </div>
      )}
      {sum.skills.length > 0 && (
        <div>
          <span className="muted">키우는 역량 </span>
          {sum.skills.map((k) => (
            <span key={k} className="buy-tag skill">
              {SKILL_INFO[k].icon} {SKILL_INFO[k].label}
            </span>
          ))}
        </div>
      )}
      {d.env && (
        <div>
          <span className="muted">방 분위기 </span>
          <span className="buy-tag">
            {EMOTIONS[d.env.emotion].icon} {EMOTIONS[d.env.emotion].levels[0]} +{d.env.score}
          </span>
        </div>
      )}
      {perks(d).map((p) => (
        <div key={p} className="buy-perk">
          {p}
        </div>
      ))}
      <div className="muted buy-uses">{sum.uses.length ? `할 수 있는 일: ${sum.uses.slice(0, 6).join(', ')}${sum.uses.length > 6 ? ' …' : ''}` : '장식용이에요'}</div>
    </div>
  );
}

type View = 'room' | 'fn' | 'build' | 'store';
type Sort = 'default' | 'cheap' | 'dear';

/**
 * The buy catalog after 참고 게임's buy mode: browse by room or by function, search and sort, and a
 * product card for the thing pointed at (docs/ref-game/11-ui.md §5).
 */
export function BuyCatalog({ game, placing, setPlacing }: Props) {
  const [view, setView] = useState<View>('room');
  const [group, setGroup] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('default');
  const [affordable, setAffordable] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const money = game.state.money;
  const q = query.trim();
  const items = BUYABLE.filter((d) => {
    const where = OBJECT_BUY[d.id];
    if (group !== 'all' && view === 'room' && !where?.rooms.includes(group as BuyRoom)) return false;
    if (group !== 'all' && view === 'fn' && where?.fn !== group) return false;
    if (affordable && d.price > money) return false;
    if (q) {
      const sum = objectSummary(d);
      const words = [d.name, ...sum.uses, ...sum.needs.map((k) => NEED_INFO[k].label), ...sum.skills.map((k) => SKILL_INFO[k].label)];
      if (!words.some((w) => w.includes(q))) return false;
    }
    return true;
  }).sort((a, b) => (sort === 'cheap' ? a.price - b.price : sort === 'dear' ? b.price - a.price : 0));
  const groups: Array<[string, { label: string; icon: string }]> = view === 'room' ? Object.entries(BUY_ROOMS) : view === 'fn' ? Object.entries(BUY_FNS) : [];
  const shownDef = BUYABLE.find((d) => d.id === (hover ?? (placing?.movingUid === undefined && placing?.stored === undefined ? placing?.defId : undefined)));
  const pick = (v: View) => {
    setView(v);
    setGroup('all');
  };
  const swatch = (part: 'wall' | 'floor', id: string, label: string, price: number, a: string, b: string) => {
    const selected = placing?.paint?.part === part && placing.paint.style === id;
    return (
      <button
        key={`${part}-${id}`}
        className={`item ${selected ? 'on' : ''}`}
        disabled={money < price}
        onClick={() => setPlacing(selected ? null : { defId: '', dir: 'down', paint: { part, style: id } })}
        title={part === 'wall' ? '벽지' : '바닥'}
      >
        <span className="item-icon" style={{ background: `linear-gradient(135deg, ${a} 50%, ${b} 50%)` }} />
        <span className="item-name">{label}</span>
        <span className="item-price">§{price}</span>
      </button>
    );
  };
  return (
    <aside className="catalog">
      <h3>
        카탈로그 <span className="buy-money">§ {Math.floor(money).toLocaleString()}</span>
      </h3>
      <div className="buy-views" role="tablist">
        <button className={view === 'room' ? 'on' : ''} onClick={() => pick('room')}>
          <Icon name="home" /> 방별
        </button>
        <button className={view === 'fn' ? 'on' : ''} onClick={() => pick('fn')}>
          <Icon name="puzzle" /> 기능별
        </button>
        <button className={view === 'build' ? 'on' : ''} onClick={() => pick('build')}>
          <Icon name="build" /> 건축
        </button>
        <button className={view === 'store' ? 'on' : ''} onClick={() => pick('store')}>
          <Icon name="store" /> 보관함{game.storage.length ? ` ${game.storage.length}` : ''}
        </button>
      </div>
      {view === 'store' && (
        <div className="items">
          <div className="build-head">보관함 (놓을 때 값을 받지 않아요)</div>
          {game.storage.length === 0 && <p className="muted">보관함이 비어 있어요. 이사할 때 가져온 가구나, 놓인 가구를 눌러 「보관함에 넣기」한 것이 여기 모여요.</p>}
          {[...new Set(game.storage.map((o) => o.defId))].map((id) => {
            // Alike pieces in one card: the first of them is set down or sold.
            const same = game.storage.filter((x) => x.defId === id);
            const o = same.find((x) => x.uid === placing?.stored) ?? same[0];
            const d = getDef(id);
            const selected = placing?.stored === o.uid;
            return (
              <div key={id} className="store-row">
                <button className={`item ${selected ? 'on' : ''}`} onClick={() => setPlacing(selected ? null : { defId: o.defId, dir: o.dir, stored: o.uid })} title="눌러서 집에 다시 놓아요">
                  <span className="item-icon" style={{ background: d.color }}>
                    {d.icon}
                  </span>
                  <span className="item-name">
                    {d.name}
                    {same.length > 1 ? ` ×${same.length}` : ''}
                  </span>
                  <span className="item-price">무료</span>
                </button>
                <button className="ghost small" onClick={() => game.sellStored(o.uid)} title="보관함에서 바로 팔아요">
                  <Icon name="coins" /> §{objectValue(o)}
                </button>
              </div>
            );
          })}
        </div>
      )}
      {(view === 'room' || view === 'fn') && (
        <>
          <div className="tabs">
            <button className={group === 'all' ? 'on' : ''} onClick={() => setGroup('all')}>
              전체
            </button>
            {groups.map(([id, g]) => (
              <button key={id} className={group === id ? 'on' : ''} onClick={() => setGroup(id)}>
                {g.icon} {g.label}
              </button>
            ))}
          </div>
          <div className="buy-filters">
            <input placeholder="🔎 이름·욕구·역량으로 찾기" value={query} onChange={(e) => setQuery(e.target.value)} />
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="정렬">
              <option value="default">기본 순</option>
              <option value="cheap">가격 낮은 순</option>
              <option value="dear">가격 높은 순</option>
            </select>
            <label>
              <input type="checkbox" checked={affordable} onChange={(e) => setAffordable(e.target.checked)} /> 살 수 있는 것만
            </label>
          </div>
        </>
      )}
      {view === 'build' && (
        <div className="items">
          <div className="build-head">구조 (벽은 칸 사이 선 위에 · 끌어서 곧게 · 방은 칸에서 칸까지)</div>
          {game.lot.rent ? <p className="muted">월세 집이라 벽·바닥 구조는 바꿀 수 없어요. 벽지·바닥재와 가구는 돼요.</p> : null}
          {BUILD_TOOLS.map((b) => {
            const selected = placing?.build === b.id;
            return (
              <button key={b.id} className={`item ${selected ? 'on' : ''}`} onClick={() => setPlacing(selected ? null : { defId: '', dir: 'down', build: b.id })} title={b.desc}>
                <span className="item-icon" style={{ background: 'var(--navy-grad)' }}>
                  <Icon name={b.icon} />
                </span>
                <span className="item-name">{b.label}</span>
                <span className="item-price">{b.id === 'room' ? `벽 §${BUILD_COST.wall}·바닥 §${BUILD_COST.floor}` : BUILD_COST[b.id] ? `§${BUILD_COST[b.id]}` : '무료'}</span>
              </button>
            );
          })}
          {game.owner ? <MoveIn site={game} /> : <NewLand game={game} />}
          <div className="build-head">
            부지 특성 (최대 {MAX_LOT_TRAITS}개 · 집에서 하는 생활로 생겨요)
          </div>
          {LOT_TRAITS.map((t) => {
            const on = game.lotTraits.includes(t.id);
            const builtIn = game.plan.traits.includes(t.id);
            const lived = Math.min(1, (game.lotAffinity[t.id] ?? 0) / EARN_MINUTES);
            const skills = [...t.skills.map((k) => SKILL_INFO[k].label), ...(t.habitsLabel ? [t.habitsLabel] : [])].join('·');
            return (
              <div key={t.id} className={`item lot-trait ${on ? 'on' : ''}`} title={`${t.desc}
집에서 ${skills}을(를) 꾸준히 하면 생기고, 한동안 안 하면 옅어져요`}>
                <span className="item-icon" style={{ background: on ? 'var(--navy-grad)' : '#b3a988' }}>
                  {t.icon}
                </span>
                <span className="item-name">{t.label}</span>
                <span className="item-price">{builtIn ? '집에 딸림' : on ? '생활로 생김' : `${Math.round(lived * 100)}%`}</span>
                {!builtIn && (
                  <span className="lot-lived" aria-label={`${t.label}까지 ${Math.round(lived * 100)}%`}>
                    <span style={{ width: `${lived * 100}%` }} />
                  </span>
                )}
              </div>
            );
          })}
          <div className="build-head">러그 (위로 걸어 다니고, 가구를 올려놓을 수 있어요)</div>
          {RUGS.map((d) => {
            const poor = money < d.price;
            const selected = placing?.defId === d.id && placing.movingUid === undefined && placing.stored === undefined;
            return (
              <button key={d.id} className={`item ${selected ? 'on' : ''} ${poor ? 'poor' : ''}`} aria-disabled={poor} onClick={() => !poor && setPlacing(selected ? null : { defId: d.id, dir: 'down' })}>
                <span className="item-icon" style={{ background: d.color }} />
                <span className="item-name">
                  {d.name} <small className="muted">{d.w}×{d.h}</small>
                </span>
                <span className="item-price">§{d.price}</span>
              </button>
            );
          })}
          <div className="build-head">벽지 (방 하나)</div>
          {WALL_STYLES.map((w) => swatch('wall', w.id, w.label, w.price, w.base, w.accent))}
          <div className="build-head">바닥 (방 하나)</div>
          {FLOOR_STYLES.map((f) => swatch('floor', f.id, f.label, f.price, f.a, f.b))}
        </div>
      )}
      {(view === 'room' || view === 'fn') && (
        <div className="items" onMouseLeave={() => setHover(null)}>
          {items.length === 0 && <p className="muted">찾는 물건이 없어요.</p>}
          {items.map((d) => {
            const poor = money < d.price;
            const selected = placing?.defId === d.id && placing.movingUid === undefined && placing.stored === undefined;
            return (
              <button
                key={d.id}
                className={`item ${selected ? 'on' : ''} ${poor ? 'poor' : ''}`}
                aria-disabled={poor}
                // Not disabled, so pointing at it still shows its card and how much is missing.
                onClick={() => !poor && setPlacing(selected ? null : { defId: d.id, dir: 'down' })}
                onMouseEnter={() => setHover(d.id)}
                onFocus={() => setHover(d.id)}
              >
                <span className="item-icon" style={{ background: d.color }}>
                  {d.icon}
                </span>
                <span className="item-name">
                  {d.name}
                  {d.restfulness || d.funMul || (d.cookingQuality ?? 0) > 6 ? ' ✨' : ''}
                </span>
                <span className="item-badges">{badges(d)}</span>
                <span className="item-price">§{d.price}</span>
              </button>
            );
          })}
        </div>
      )}
      {(view === 'room' || view === 'fn') && shownDef && <ItemCard d={shownDef} money={money} />}
      {placing && (
        <div className="placing-hint">
          {placing.paint ? '바꿀 방을 클릭하세요 · Esc 취소' : `${placing.movingUid !== undefined ? '옮길 위치를 클릭하세요' : '놓을 위치를 클릭하세요'} · R 회전 · Esc 취소`}
        </div>
      )}
    </aside>
  );
}
