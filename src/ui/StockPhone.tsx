import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Game } from '../game/game';
import {
  applyFills, cancelOrder, dayChange, fillWhen, lastPrice, pendingAsks, placeBuy, placeSell, portfolio, previewBuy, previewSell, toggleWatch,
  MIN_ORDER, WON_PER_MONEY, type StockAsset, type StockBar, type StockMarket, type StockMarketData, type StockOrder,
} from '../game/stocks';
import { DEV_PRICES, StockError, fetchCloses, fetchHistory, fetchMarket } from '../cloud/stocks';
import { Icon } from './Icon';
import { useGame } from './useGame';
import { DOWN, MA_LINES, StockChart, UP, type LowerPanel } from './StockChart';
import './stockPhone.css';

/**
 * The phone's stock app (2026-10-26, at the user's request — «isekai3d 안에서 휴대폰으로 주식앱을 하는 것처럼»):
 * a phone-shaped window over the game with 홈 · 시장 · 내 투자, an asset's page with its chart and
 * what the indicators mean, and buying and selling with the household's money at real closes.
 * The model is game/stocks.ts; prices are cloud/stocks.ts. docs/ref-game/17-stocks.md
 */

const MARKETS: Array<{ id: StockMarket; label: string }> = [
  { id: 'kr', label: '한국' },
  { id: 'us', label: '미국' },
  { id: 'cm', label: '실물·달러' },
];

export const money = (n: number, digits = 2) => `§${n.toLocaleString('ko-KR', { maximumFractionDigits: digits })}`;
const signed = (n: number, digits = 2) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${money(Math.abs(n), digits)}`;
const pct = (n: number | null) => (n === null || !Number.isFinite(n) ? '—' : `${n > 0 ? '+' : ''}${n.toFixed(2)}%`);
const tone = (n: number | null) => (n === null || Math.abs(n) < 0.005 ? undefined : n > 0 ? UP : DOWN);
export const units = (n: number) => (n >= 1 ? `${n.toLocaleString('ko-KR', { maximumFractionDigits: 4 })}주` : `${Number(n.toPrecision(4))}주`);
const nativePrice = (p: number, currency: 'KRW' | 'USD') => (currency === 'KRW' ? `${Math.round(p).toLocaleString('ko-KR')}원` : `$${p.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: p < 10 ? 2 : 0 })}`);

/** Asks 스페이스기전 for the closes of the waiting orders and fills what it can, with a notice for each. */
export async function settleStocks(game: Game): Promise<StockOrder[]> {
  const asks = pendingAsks(game.state);
  if (!asks.length) return [];
  const fills = await fetchCloses(asks);
  const done = applyFills(game.state, fills);
  for (const o of done) {
    const f = o.fill!;
    game.notify(o.side === 'buy'
      ? `주식: ${o.name} ${units(f.units)}를 샀어요 (${money(f.gross)})`
      : `주식: ${o.name} ${units(f.units)}를 팔아 ${money(f.net)}을 받았어요 (${signed(f.realized ?? 0)})`, o.side === 'sell' && (f.realized ?? 0) < 0 ? 'info' : 'good');
  }
  if (done.length) game.emit();
  return done;
}

/** In the game: every few minutes of real time, waiting orders get their close (only while there are some). */
export function useStockSettle(game: Game) {
  useEffect(() => {
    let live = true;
    const tick = () => {
      if (live && pendingAsks(game.state).length) void settleStocks(game).catch(() => undefined);
    };
    tick();
    const t = setInterval(tick, 5 * 60_000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [game]);
}

/** The phone tab's stock section: what's held now, and the app. */
export function StockSection({ game }: { game: Game }) {
  useGame(game);
  const [open, setOpen] = useState(false);
  const st = game.state.stocks;
  const held = Object.keys(st?.holdings ?? {}).length;
  const waiting = st?.orders.filter((o) => o.status === 'pending').length ?? 0;
  return (
    <section>
      <h3>
        주식 <span className="muted">· 실제 시세로 투자</span>
      </h3>
      <div className="service-row">
        <span>{held || waiting ? `가진 종목 ${held}개${waiting ? ` · 체결 기다리는 주문 ${waiting}개` : ''}` : '한국·미국 주식, 금·원유를 진짜 시세로'}</span>
        <button className="pizza-btn" onClick={() => setOpen(true)}>
          <Icon name="smartphone" /> 주식 앱
        </button>
      </div>
      {open && <StockPhone game={game} onClose={() => setOpen(false)} />}
    </section>
  );
}

type Screen = 'home' | 'market' | 'mine';

export function StockPhone({ game, onClose }: { game: Game; onClose: () => void }) {
  useGame(game);
  const [screen, setScreen] = useState<Screen>('home');
  const [market, setMarket] = useState<StockMarketData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [order, setOrder] = useState<{ id: string; side: 'buy' | 'sell' } | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    try {
      setMarket(await fetchMarket(force));
      setError(null);
      await settleStocks(game).catch(() => undefined);
    } catch (e) {
      setError(e instanceof StockError ? e.message : '시세를 받지 못했어요');
    } finally {
      setLoading(false);
    }
  }, [game]);
  useEffect(() => void load(), [load]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (order) setOrder(null);
      else if (detail) setDetail(null);
      else onClose();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [order, detail, onClose]);

  const asset = market?.assets.find((a) => a.id === detail) ?? null;
  const orderAsset = market?.assets.find((a) => a.id === order?.id) ?? null;

  return createPortal(
    <div className="modal-backdrop stk-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="stk-phone" role="dialog" aria-modal="true" aria-label="주식 앱">
        <div className="stk-notch" aria-hidden />
        <header className="stk-status">
          <span>{new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
          <span className="stk-wallet" title="가족이 가진 돈">{money(game.state.money, 0)}</span>
          <button className="stk-icon" onClick={onClose} aria-label="닫기">
            <Icon name="close" />
          </button>
        </header>
        <div className="stk-screen">
          {error && (
            <div className="stk-note">
              <p>{error}</p>
              <button className="stk-btn" onClick={() => void load(true)}>다시 받기</button>
            </div>
          )}
          {DEV_PRICES && <p className="stk-dev">개발 서버 — 가짜 시세이고 주문은 바로 체결돼요</p>}
          {!market && !error && <p className="stk-empty">{loading ? '시세를 받는 중…' : ''}</p>}
          {market && screen === 'home' && <Home game={game} market={market} open={setDetail} onRefresh={() => void load(true)} loading={loading} />}
          {market && screen === 'market' && <Market game={game} market={market} open={setDetail} />}
          {market && screen === 'mine' && <Mine game={game} market={market} open={setDetail} />}
        </div>
        <nav className="stk-tabs">
          {(['home', 'market', 'mine'] as Screen[]).map((s) => (
            <button key={s} className={screen === s ? 'on' : ''} onClick={() => { setScreen(s); setDetail(null); }}>
              <Icon name={s === 'home' ? 'home' : s === 'market' ? 'chart' : 'bag'} />
              <span>{s === 'home' ? '홈' : s === 'market' ? '시장' : '내 투자'}</span>
            </button>
          ))}
        </nav>
        {asset && market && <Detail game={game} market={market} asset={asset} onBack={() => setDetail(null)} onOrder={(side) => setOrder({ id: asset.id, side })} />}
        {order && orderAsset && market && <OrderSheet game={game} market={market} asset={orderAsset} side={order.side} onClose={() => setOrder(null)} />}
      </div>
    </div>,
    document.body,
  );
}

function Row({ a, market, onClick, right }: { a: StockAsset; market: StockMarketData; onClick: () => void; right?: ReactNode }) {
  const ch = dayChange(a);
  const p = lastPrice(a, market.fx);
  return (
    <button className="stk-row" onClick={onClick} title={p === null ? undefined : `1주 ≈ ${money(p)}`}>
      <span className="stk-row-name">
        <b>{a.name}</b>
        <small>{a.sector}{a.day ? ` · ${a.day.slice(5).replace('-', '/')}` : ''}</small>
      </span>
      {right ?? (
        <span className="stk-row-price">
          <b>{a.close === null ? '—' : nativePrice(a.close, a.currency)}</b>
          <small style={{ color: tone(ch) }}>{pct(ch)}</small>
        </span>
      )}
    </button>
  );
}

function Home({ game, market, open, onRefresh, loading }: { game: Game; market: StockMarketData; open: (id: string) => void; onRefresh: () => void; loading: boolean }) {
  const st = game.state.stocks;
  const p = portfolio(st, market);
  const byId = new Map(market.assets.map((a) => [a.id, a]));
  const watch = (st?.watch ?? []).map((id) => byId.get(id)).filter((a): a is StockAsset => !!a);
  const movers = useMemo(() => {
    const priced = market.assets.filter((a) => dayChange(a) !== null && a.source !== 'fx');
    const s = [...priced].sort((x, y) => dayChange(y)! - dayChange(x)!);
    return { up: s.slice(0, 3), down: s.slice(-3).reverse() };
  }, [market]);
  const gainPct = p.cost > 0 ? (p.gain / p.cost) * 100 : null;
  return (
    <div className="stk-pad">
      <section className="stk-card stk-total">
        <small>내 투자 평가</small>
        <b>{money(p.value + p.pendingBuy + p.pendingSell)}</b>
        <span style={{ color: tone(p.gain) }}>{p.cost > 0 ? `${signed(p.gain)} (${pct(gainPct)})` : '아직 산 주식이 없어요'}</span>
        <small className="muted">
          낸 비용 합 {money(st?.costs ?? 0, 2)} · 환율 {market.fx ? `${market.fx.usd_krw.toLocaleString('ko-KR')}원` : '—'} · §1 = {WON_PER_MONEY.toLocaleString()}원
        </small>
        <button className="stk-link" onClick={onRefresh} disabled={loading}>{loading ? '받는 중…' : '새로 받기'}</button>
      </section>
      <h4>관심종목</h4>
      {watch.length ? watch.map((a) => <Row key={a.id} a={a} market={market} onClick={() => open(a.id)} />) : <p className="stk-empty">종목 화면의 ☆ 을 누르면 여기 모여요.</p>}
      <h4>오늘 많이 오른 종목</h4>
      {movers.up.map((a) => <Row key={a.id} a={a} market={market} onClick={() => open(a.id)} />)}
      <h4>많이 내린 종목</h4>
      {movers.down.map((a) => <Row key={a.id} a={a} market={market} onClick={() => open(a.id)} />)}
      <p className="stk-fine">실제 시장의 하루 한 번 종가예요. 게임 날짜가 빨리 가도 값은 현실에서 장이 끝나야 바뀌어요.</p>
    </div>
  );
}

function Market({ game, market, open }: { game: Game; market: StockMarketData; open: (id: string) => void }) {
  const [tab, setTab] = useState<StockMarket>('kr');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'base' | 'up' | 'down' | 'name'>('base');
  const watch = new Set(game.state.stocks?.watch ?? []);
  const list = useMemo(() => {
    const words = q.trim().toLowerCase();
    let l = market.assets.filter((a) => (words ? `${a.name} ${a.symbol} ${a.sector}`.toLowerCase().includes(words) : a.market === tab));
    // nulls (no price yet) last either way
    if (sort === 'up') l = [...l].sort((x, y) => (dayChange(y) ?? -1e9) - (dayChange(x) ?? -1e9));
    if (sort === 'down') l = [...l].sort((x, y) => (dayChange(x) ?? 1e9) - (dayChange(y) ?? 1e9));
    if (sort === 'name') l = [...l].sort((x, y) => x.name.localeCompare(y.name, 'ko'));
    return l;
  }, [market, tab, q, sort]);
  return (
    <div className="stk-pad">
      <input className="stk-search" type="search" placeholder="이름·코드로 찾기 (전체에서)" value={q} onChange={(e) => setQ(e.target.value)} />
      {!q && (
        <div className="stk-seg">
          {MARKETS.map((m) => (
            <button key={m.id} className={tab === m.id ? 'on' : ''} onClick={() => setTab(m.id)}>
              {m.label} <small>{market.assets.filter((a) => a.market === m.id).length}</small>
            </button>
          ))}
        </div>
      )}
      <div className="stk-sort">
        {([['base', '기본'], ['up', '오른 순'], ['down', '내린 순'], ['name', '이름']] as const).map(([id, label]) => (
          <button key={id} className={sort === id ? 'on' : ''} onClick={() => setSort(id)}>{label}</button>
        ))}
      </div>
      {list.map((a) => (
        <Row key={a.id} a={a} market={market} onClick={() => open(a.id)} />
      ))}
      {!list.length && <p className="stk-empty">찾는 종목이 없어요.</p>}
      {watch.size > 0 && <p className="stk-fine">☆ 관심종목은 홈에 모여요.</p>}
    </div>
  );
}

function Mine({ game, market, open }: { game: Game; market: StockMarketData; open: (id: string) => void }) {
  const st = game.state.stocks;
  const p = portfolio(st, market);
  const pending = st?.orders.filter((o) => o.status === 'pending') ?? [];
  const done = st?.orders.filter((o) => o.status !== 'pending') ?? [];
  const totalValue = p.value || 1;
  const cancel = (o: StockOrder) => {
    if (cancelOrder(game.state, o.id)) {
      game.notify(o.side === 'buy' ? `주식: ${o.name} 사기 주문을 취소하고 ${money(o.money ?? 0)}을 돌려받았어요` : `주식: ${o.name} 팔기 주문을 취소했어요`);
      game.emit();
    }
  };
  return (
    <div className="stk-pad">
      <section className="stk-card stk-total">
        <small>가진 주식</small>
        <b>{money(p.value)}</b>
        <span style={{ color: tone(p.gain) }}>{signed(p.gain)} {p.cost > 0 ? `(${pct((p.gain / p.cost) * 100)})` : ''}</span>
        <small className="muted">산 값 {money(p.cost)} · 낸 비용 합 {money(st?.costs ?? 0, 2)}</small>
      </section>
      <h4>가진 종목 · 비중</h4>
      {p.rows.length ? p.rows.map((r) => (
        <button key={r.id} className="stk-row" onClick={() => open(r.id)}>
          <span className="stk-row-name">
            <b>{r.name}</b>
            <small>{units(r.units)} · 비중 {Math.round((r.value / totalValue) * 100)}%</small>
          </span>
          <span className="stk-row-price">
            <b>{money(r.value)}</b>
            <small style={{ color: tone(r.gain) }}>{signed(r.gain)} ({pct(r.cost ? (r.gain / r.cost) * 100 : null)})</small>
          </span>
        </button>
      )) : <p className="stk-empty">가진 종목이 없어요. «시장»에서 골라 보세요.</p>}
      {pending.length > 0 && (
        <>
          <h4>체결을 기다리는 주문</h4>
          {pending.map((o) => (
            <div key={o.id} className="stk-order">
              <span className={`stk-side ${o.side}`}>{o.side === 'buy' ? '사기' : '팔기'}</span>
              <span className="stk-order-name">
                <b>{o.name}</b>
                <small>{o.side === 'buy' ? money(o.money ?? 0) : units(o.units ?? 0)} · {fillWhen(o, new Date(o.placedAt)).split(' — ')[0]}</small>
              </span>
              <button className="stk-link danger" onClick={() => cancel(o)}>취소</button>
            </div>
          ))}
        </>
      )}
      <h4>매매 기록</h4>
      {done.length ? done.map((o) => (
        <div key={o.id} className={`stk-order ${o.status === 'cancelled' ? 'off' : ''}`}>
          <span className={`stk-side ${o.side}`}>{o.side === 'buy' ? '삼' : '팜'}</span>
          <span className="stk-order-name">
            <b>{o.name}</b>
            <small>
              {o.status === 'cancelled'
                ? '취소'
                : `${o.fill!.day.slice(5).replace('-', '/')} · ${units(o.fill!.units)} × ${money(o.fill!.price)} · 비용 ${money(o.fill!.fee + o.fill!.tax + o.fill!.fx, 4)}`}
            </small>
          </span>
          {o.status === 'filled' && (
            <span className="stk-row-price">
              <b>{money(o.side === 'buy' ? o.fill!.gross : o.fill!.net)}</b>
              {o.fill!.realized !== undefined && <small style={{ color: tone(o.fill!.realized) }}>{signed(o.fill!.realized)}</small>}
            </span>
          )}
        </div>
      )) : <p className="stk-empty">아직 체결된 주문이 없어요.</p>}
    </div>
  );
}

const HELP: Record<string, { title: string; text: string }> = {
  candle: { title: '캔들(일봉)', text: '하루의 시가·고가·저가·종가를 한 막대로 그려요. 빨강은 시가보다 올라서 끝난 날, 파랑은 내려서 끝난 날이에요. 위아래 가는 선은 그날 가장 높고 낮았던 값이에요.' },
  ma: { title: '이동평균선', text: '최근 며칠 동안 종가의 평균을 이은 선이에요. 5일은 짧은 흐름, 20일은 약 한 달, 60일은 약 석 달의 흐름이에요. 주가가 평균선 위에 있으면 그 기간에 산 사람들이 평균적으로 이익을 보고 있다는 뜻이에요.' },
  volume: { title: '거래량', text: '그날 사고판 주식의 수예요. 값이 크게 움직인 날 거래량도 많았다면 많은 사람이 그 움직임에 참여했다는 뜻이에요. 금 현물처럼 거래소가 없는 자산은 거래량이 없어요.' },
  rsi: { title: 'RSI (14일)', text: '최근 14일 동안 오른 폭과 내린 폭을 견줘 0~100으로 나타내요. 70 위면 «짧은 사이에 많이 올랐다», 30 아래면 «많이 내렸다»고 보는 사람이 많아요. 그렇다고 곧 내리거나 오른다는 약속은 아니에요.' },
  macd: { title: 'MACD (12·26·9)', text: '짧은 평균(12일)에서 긴 평균(26일)을 뺀 선(주황)과, 그 선의 9일 평균(초록 점선)이에요. 0 위면 최근 흐름이 긴 흐름보다 강하다는 뜻이에요. 막대는 두 선의 차이예요.' },
};

function Detail({ game, market, asset, onBack, onOrder }: { game: Game; market: StockMarketData; asset: StockAsset; onBack: () => void; onOrder: (side: 'buy' | 'sell') => void }) {
  const [bars, setBars] = useState<StockBar[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [range, setRange] = useState(60);
  const [ma, setMa] = useState<Record<number, boolean>>({ 5: true, 20: true, 60: false });
  const [lower, setLower] = useState<LowerPanel>('volume');
  const [help, setHelp] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setBars(null);
    fetchHistory(asset.id, 200).then((b) => live && setBars(b), () => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [asset.id]);
  const st = game.state.stocks;
  const h = st?.holdings[asset.id];
  const starred = st?.watch.includes(asset.id) ?? false;
  const ch = dayChange(asset);
  const price = lastPrice(asset, market.fx);
  const fmt = (p: number) => (asset.currency === 'KRW' ? (p >= 1e5 ? `${Math.round(p / 1000).toLocaleString()}k` : Math.round(p).toLocaleString()) : p >= 1000 ? Math.round(p).toLocaleString() : p.toFixed(p < 10 ? 2 : 1));
  const hv = h && price !== null ? h.units * price : null;
  return (
    <div className="stk-layer">
      <header className="stk-bar">
        <button className="stk-icon" onClick={onBack} aria-label="뒤로">‹</button>
        <span className="stk-bar-title">{asset.name}</span>
        <button className={`stk-icon star ${starred ? 'on' : ''}`} aria-pressed={starred} aria-label="관심종목" onClick={() => { toggleWatch(game.state, asset.id); game.emit(); }}>
          {starred ? '★' : '☆'}
        </button>
      </header>
      <div className="stk-screen">
        <div className="stk-pad">
          <div className="stk-quote">
            <b>{asset.close === null ? '—' : nativePrice(asset.close, asset.currency)}</b>
            <span style={{ color: tone(ch) }}>{ch === null ? '' : `${ch > 0 ? '▲' : ch < 0 ? '▼' : ''} ${pct(ch)}`}</span>
            <small className="muted">
              {asset.day ? `${asset.day} 종가` : '아직 시세가 없어요'}{price !== null ? ` · 1주 ≈ ${money(price)}` : ''} · {asset.symbol}
            </small>
          </div>
          <div className="stk-seg small">
            {[20, 60, 120].map((n) => <button key={n} className={range === n ? 'on' : ''} onClick={() => setRange(n)}>{n === 20 ? '1개월' : n === 60 ? '3개월' : '6개월'}</button>)}
          </div>
          {bars ? <StockChart bars={bars} shown={range} ma={ma} lower={lower} fmt={fmt} /> : <p className="stk-empty">{failed ? '차트를 받지 못했어요' : '차트를 받는 중…'}</p>}
          <div className="stk-toggles">
            <button className="stk-help" onClick={() => setHelp('candle')} aria-label="캔들 설명">캔들 ⓘ</button>
            {MA_LINES.map((m) => (
              <button key={m.n} className={ma[m.n] ? 'on' : ''} style={{ borderColor: m.color, color: ma[m.n] ? '#fff' : m.color, background: ma[m.n] ? m.color : undefined }} onClick={() => setMa({ ...ma, [m.n]: !ma[m.n] })}>
                {m.label}
              </button>
            ))}
            <button className="stk-help" onClick={() => setHelp('ma')} aria-label="이동평균선 설명">ⓘ</button>
          </div>
          <div className="stk-toggles">
            {(['volume', 'rsi', 'macd'] as LowerPanel[]).map((l) => (
              <button key={l} className={lower === l ? 'on dark' : ''} onClick={() => setLower(l)}>{l === 'volume' ? '거래량' : l.toUpperCase()}</button>
            ))}
            <button className="stk-help" onClick={() => setHelp(lower)} aria-label="아래 지표 설명">ⓘ</button>
          </div>
          {help && (
            <div className="stk-card stk-helpbox" role="note">
              <b>{HELP[help].title}</b>
              <p>{HELP[help].text}</p>
              <small className="muted">지표는 지난 가격으로 계산한 것이고, 앞날을 알려 주지 않아요.</small>
              <button className="stk-link" onClick={() => setHelp(null)}>닫기</button>
            </div>
          )}
          <section className="stk-card">
            <small className="muted">{asset.sector}</small>
            <p>{asset.blurb || `${asset.name} — ${asset.market === 'kr' ? '한국 거래소에 상장된 회사' : '미국 시장의 자산'}`}</p>
            {asset.currency === 'USD' && <small className="muted">달러 자산이라 환율이 오르면(원화 약세) 같은 값이어도 §로는 늘어나요. 사고팔 때 환전 비용 0.25%.</small>}
          </section>
          {h && (
            <section className="stk-card">
              <small className="muted">내가 가진 것</small>
              <p>
                {units(h.units)} · 산 값 {money(h.cost)}
                {hv !== null && <> · 지금 {money(hv)} <span style={{ color: tone(hv - h.cost) }}>{signed(hv - h.cost)}</span></>}
              </p>
            </section>
          )}
        </div>
      </div>
      <footer className="stk-actions">
        <button className="stk-btn sell" disabled={!h} onClick={() => onOrder('sell')}>팔기</button>
        <button className="stk-btn buy" disabled={asset.close === null} onClick={() => onOrder('buy')}>사기</button>
      </footer>
    </div>
  );
}

function OrderSheet({ game, market, asset, side, onClose }: { game: Game; market: StockMarketData; asset: StockAsset; side: 'buy' | 'sell'; onClose: () => void }) {
  const h = game.state.stocks?.holdings[asset.id];
  const cash = game.state.money;
  const [amount, setAmount] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const price = lastPrice(asset, market.fx);
  const n = Number(amount.replace(/,/g, ''));
  const valid = Number.isFinite(n) && n > 0;
  const buy = side === 'buy' && valid ? previewBuy(n, asset, price) : null;
  const sell = side === 'sell' && valid ? previewSell(n, asset, price) : null;
  const quick = side === 'buy' ? [0.1, 0.25, 0.5, 1].map((f) => ({ label: f === 1 ? '전부' : `${f * 100}%`, value: Math.floor(cash * f * 100) / 100 }))
    : [0.25, 0.5, 1].map((f) => ({ label: f === 1 ? '전부' : `${f * 100}%`, value: f === 1 ? h?.units ?? 0 : Number(((h?.units ?? 0) * f).toPrecision(6)) }));
  const submit = () => {
    const r = side === 'buy' ? placeBuy(game.state, asset, n) : placeSell(game.state, asset, n);
    if (typeof r === 'string') {
      setProblem(r);
      return;
    }
    game.notify(side === 'buy' ? `주식: ${asset.name} 사기 주문 ${money(n)} — ${fillWhen(asset).split(' — ')[0]} 체결돼요` : `주식: ${asset.name} ${units(r.units ?? n)} 팔기 주문 — ${fillWhen(asset).split(' — ')[0]} 체결돼요`);
    game.emit();
    if (DEV_PRICES) void settleStocks(game);
    onClose();
  };
  return (
    <div className="stk-sheet-back" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="stk-sheet" role="dialog" aria-label={side === 'buy' ? '사기 주문' : '팔기 주문'}>
        <header>
          <b>{asset.name} {side === 'buy' ? '사기' : '팔기'}</b>
          <button className="stk-icon" onClick={onClose} aria-label="닫기"><Icon name="close" /></button>
        </header>
        <label className="stk-field">
          <span>{side === 'buy' ? `얼마어치 살까요? (가진 돈 ${money(cash)})` : `몇 주 팔까요? (가진 것 ${units(h?.units ?? 0)})`}</span>
          <div>
            <input inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value); setProblem(null); }} placeholder={side === 'buy' ? `§${MIN_ORDER} 이상` : '0'} autoFocus />
            <em>{side === 'buy' ? '§' : '주'}</em>
          </div>
        </label>
        <div className="stk-quick">
          {quick.map((q) => <button key={q.label} onClick={() => { setAmount(String(q.value)); setProblem(null); }} disabled={q.value <= 0}>{q.label}</button>)}
        </div>
        <dl className="stk-preview">
          {buy && (
            <>
              <dt>수수료 (0.015%)</dt><dd>{money(buy.costs.fee, 4)}</dd>
              {buy.costs.fx > 0 && <><dt>환전 비용 (0.25%)</dt><dd>{money(buy.costs.fx, 4)}</dd></>}
              <dt>주식에 들어가는 돈</dt><dd>{money(buy.net, 4)}</dd>
              <dt>지금 값이라면</dt><dd>{buy.units === null ? '—' : `약 ${units(buy.units)}`}</dd>
            </>
          )}
          {sell && (
            <>
              <dt>지금 값이라면</dt><dd>{money(sell.gross, 2)}</dd>
              <dt>수수료 (0.015%)</dt><dd>−{money(sell.costs.fee, 4)}</dd>
              {sell.costs.tax > 0 && <><dt>증권거래세 (0.18%)</dt><dd>−{money(sell.costs.tax, 4)}</dd></>}
              {sell.costs.fx > 0 && <><dt>환전 비용 (0.25%)</dt><dd>−{money(sell.costs.fx, 4)}</dd></>}
              <dt>받을 돈</dt><dd><b>{money(sell.net, 2)}</b></dd>
            </>
          )}
        </dl>
        <p className="stk-fine">{fillWhen(asset)}. 그때 값이 지금과 달라서 {side === 'buy' ? '사는 양' : '받는 돈'}은 달라져요. 체결 전에는 «내 투자»에서 취소할 수 있어요.</p>
        {problem && <p className="stk-problem" role="alert">{problem}</p>}
        <button className={`stk-btn wide ${side}`} disabled={!valid} onClick={submit}>{side === 'buy' ? '사기 주문 넣기' : '팔기 주문 넣기'}</button>
      </div>
    </div>
  );
}
