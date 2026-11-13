/**
 * The phone's stock app (2026-10-26, at the user's request — moved here from 스페이스기전's coin game):
 * the household's money (§) put into real Korean and US shares, gold, oil and the dollar at their real
 * daily closes. Prices come from 스페이스기전 (RPC isekai3d_stock_*, through the desk bridge's stocks/*);
 * what the household holds and has ordered lives in the game save (GameState.stocks).
 *
 * The real market, not the game's clock: an order fills at the first real close after it was placed,
 * and the server says which close that is (isekai3d_stock_closes — closes whose time has passed only).
 * §1 = 1,000원. Costs as in real life: a 0.015% fee each way, 0.18% tax when selling a Korean share
 * (not an ETF), 0.25% to change money for a dollar asset (both ways). See docs/ref-game/17-stocks.md.
 */

/** §1 is worth this many won (user's decision). */
export const WON_PER_MONEY = 1000;

/** Costs, in 0.001% (the server's old setting units): 15 = 0.015%. */
export const STOCK_RATES = { fee: 15, krSellTax: 180, fx: 250 } as const;
/** The smallest buy, in §. */
export const MIN_ORDER = 1;
/** Orders kept after they're done (the trade log), newest first. */
export const LOG_KEEP = 120;

export type StockMarket = 'kr' | 'us' | 'cm';
export type StockSource = 'krx_stock' | 'krx_etf' | 'twelve' | 'fx';

/** One asset as 스페이스기전 gives it (isekai3d_stock_market): its last daily bar and the close before. */
export interface StockAsset {
  id: string;
  market: StockMarket;
  source: StockSource;
  symbol: string;
  currency: 'KRW' | 'USD';
  name: string;
  sector: string;
  blurb: string;
  day: string | null;
  close_at: string | null;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
  prev: number | null;
}

export interface StockMarketData {
  asOf: string;
  fx: { day: string; usd_krw: number } | null;
  assets: StockAsset[];
}

/** A daily bar (isekai3d_stock_history), oldest first; usd_krw on that day for a dollar asset. */
export interface StockBar {
  day: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  volume: number | null;
  close_at: string;
  usd_krw: number | null;
}

/** The close an order fills at (isekai3d_stock_closes), or null while there's none yet. */
export interface StockFill {
  day: string;
  close: number;
  close_at: string;
  usd_krw: number | null;
}

export interface StockOrder {
  id: string;
  assetId: string;
  name: string;
  source: StockSource;
  currency: 'KRW' | 'USD';
  side: 'buy' | 'sell';
  /** When it was placed, in real time (ISO) — it fills at the first close after this. */
  placedAt: string;
  /** A buy: § set aside. */
  money?: number;
  /** A sell: shares set aside, and what they cost (moved out of the holding). */
  units?: number;
  costBasis?: number;
  status: 'pending' | 'filled' | 'cancelled';
  /** Filled: the close, the § price of one share, shares, costs and what came of it. */
  fill?: { day: string; close: number; usdKrw: number | null; price: number; units: number; gross: number; fee: number; tax: number; fx: number; net: number; realized?: number };
  doneAt?: string;
}

export interface StockHolding {
  units: number;
  /** What was paid for them, costs included (§). */
  cost: number;
}

/** What the household has in the stock app (kept in the save). */
export interface StockState {
  holdings: Record<string, StockHolding>;
  orders: StockOrder[];
  /** Starred, in the order starred. */
  watch: string[];
  /** All the costs paid (fees, tax, changing money), § — gone to no one. */
  costs: number;
  nextId: number;
}

export const newStocks = (): StockState => ({ holdings: {}, orders: [], watch: [], costs: 0, nextId: 1 });

const r2 = (n: number) => Math.round(n * 100) / 100;
const r4 = (n: number) => Math.round(n * 10000) / 10000;

/** The costs of one trade of `gross` §. Sell tax only on a Korean share; changing money only for a dollar asset. */
export function stockCosts(side: 'buy' | 'sell', asset: Pick<StockAsset, 'source' | 'currency'>, gross: number) {
  const fee = r4((gross * STOCK_RATES.fee) / 100000);
  const tax = side === 'sell' && asset.source === 'krx_stock' ? r4((gross * STOCK_RATES.krSellTax) / 100000) : 0;
  const fx = asset.currency === 'USD' ? r4((gross * STOCK_RATES.fx) / 100000) : 0;
  return { fee, tax, fx, total: r4(fee + tax + fx) };
}

/** One share's price in § on a bar (a dollar price at that day's rate). Null when the rate isn't known. */
export function priceMoney(close: number, currency: 'KRW' | 'USD', usdKrw: number | null | undefined): number | null {
  if (currency === 'USD') return usdKrw ? (close * usdKrw) / WON_PER_MONEY : null;
  return close / WON_PER_MONEY;
}

/** The asset's last price in § (the market's latest dollar rate for a dollar asset). */
export const lastPrice = (a: StockAsset, fx: StockMarketData['fx']) => (a.close === null ? null : priceMoney(a.close, a.currency, fx?.usd_krw));

/** Up or down on the day, %. */
export function dayChange(a: Pick<StockAsset, 'close' | 'prev'>): number | null {
  if (!a.close || !a.prev) return null;
  return ((a.close - a.prev) / a.prev) * 100;
}

/** What a buy of `money` § would come to at `price` (now; the real fill is the next close). */
export function previewBuy(money: number, asset: Pick<StockAsset, 'source' | 'currency'>, price: number | null) {
  const costs = stockCosts('buy', asset, money);
  const net = Math.max(money - costs.total, 0);
  return { costs, net, units: price ? net / price : null };
}

/** What selling `units` would bring at `price`. */
export function previewSell(units: number, asset: Pick<StockAsset, 'source' | 'currency'>, price: number | null) {
  const gross = price ? r4(units * price) : 0;
  const costs = stockCosts('sell', asset, gross);
  return { gross, costs, net: Math.max(r4(gross - costs.total), 0) };
}

type WithStocks = { money: number; stocks?: StockState };
const stocksOf = (s: WithStocks) => (s.stocks ??= newStocks());

function keepLog(st: StockState) {
  const pending = st.orders.filter((o) => o.status === 'pending');
  const done = st.orders.filter((o) => o.status !== 'pending').slice(0, LOG_KEEP);
  st.orders = [...pending, ...done].sort((a, b) => b.placedAt.localeCompare(a.placedAt));
}

/** Puts in a buy: the money is set aside now. A reason when it can't be. */
export function placeBuy(state: WithStocks, asset: StockAsset, money: number, now = new Date()): string | StockOrder {
  money = r2(money);
  if (!Number.isFinite(money) || money < MIN_ORDER) return `§${MIN_ORDER} 이상부터 살 수 있어요`;
  if (money > state.money) return '가진 돈보다 많이 살 수 없어요';
  const st = stocksOf(state);
  const order: StockOrder = { id: `o${st.nextId++}`, assetId: asset.id, name: asset.name, source: asset.source, currency: asset.currency, side: 'buy', placedAt: now.toISOString(), money, status: 'pending' };
  state.money = r2(state.money - money);
  st.orders.unshift(order);
  return order;
}

/** Puts in a sell: the shares (and what they cost) are set aside now. Selling within a hair of all = all. */
export function placeSell(state: WithStocks, asset: StockAsset, units: number, now = new Date()): string | StockOrder {
  const st = stocksOf(state);
  const h = st.holdings[asset.id];
  if (!h || h.units <= 0) return '가진 주식이 없어요';
  if (!Number.isFinite(units) || units <= 0) return '팔 양을 정해 주세요';
  if (units > h.units + 1e-9) return '가진 것보다 많이 팔 수 없어요';
  const all = units >= h.units - 1e-9;
  const take = all ? h.units : units;
  const costBasis = all ? h.cost : r4(h.cost * (take / h.units));
  h.units = all ? 0 : h.units - take;
  h.cost = all ? 0 : r4(h.cost - costBasis);
  if (h.units <= 0) delete st.holdings[asset.id];
  const order: StockOrder = { id: `o${st.nextId++}`, assetId: asset.id, name: asset.name, source: asset.source, currency: asset.currency, side: 'sell', placedAt: now.toISOString(), units: take, costBasis, status: 'pending' };
  st.orders.unshift(order);
  return order;
}

/** Takes back an order still waiting: a buy's money or a sell's shares come back. */
export function cancelOrder(state: WithStocks, id: string, now = new Date()): boolean {
  const st = stocksOf(state);
  const o = st.orders.find((x) => x.id === id && x.status === 'pending');
  if (!o) return false;
  if (o.side === 'buy') state.money = r2(state.money + (o.money ?? 0));
  else {
    const h = (st.holdings[o.assetId] ??= { units: 0, cost: 0 });
    h.units += o.units ?? 0;
    h.cost = r4(h.cost + (o.costBasis ?? 0));
  }
  o.status = 'cancelled';
  o.doneAt = now.toISOString();
  keepLog(st);
  return true;
}

/** The waiting orders to ask 스페이스기전 about: [{key, asset_id, after}]. */
export const pendingAsks = (state: WithStocks) =>
  (state.stocks?.orders ?? []).filter((o) => o.status === 'pending').map((o) => ({ key: o.id, asset_id: o.assetId, after: o.placedAt }));

/**
 * Fills the orders the server found a close for. A buy turns its money, less costs, into shares; a
 * sell turns its shares into money, less costs. Returns the orders filled (for the phone's notices).
 */
export function applyFills(state: WithStocks, fills: Array<{ key: string; fill: StockFill | null }>, now = new Date()): StockOrder[] {
  const st = stocksOf(state);
  const done: StockOrder[] = [];
  for (const f of fills) {
    const o = st.orders.find((x) => x.id === f.key && x.status === 'pending');
    if (!o || !f.fill) continue;
    const price = priceMoney(f.fill.close, o.currency, f.fill.usd_krw);
    if (!price) continue;
    if (o.side === 'buy') {
      const money = o.money ?? 0;
      const c = stockCosts('buy', o, money);
      const net = Math.max(money - c.total, 0);
      const units = net / price;
      const h = (st.holdings[o.assetId] ??= { units: 0, cost: 0 });
      h.units += units;
      h.cost = r4(h.cost + money);
      st.costs = r4(st.costs + c.total);
      o.fill = { day: f.fill.day, close: f.fill.close, usdKrw: f.fill.usd_krw, price, units, gross: money, fee: c.fee, tax: c.tax, fx: c.fx, net };
    } else {
      const units = o.units ?? 0;
      const gross = r4(units * price);
      const c = stockCosts('sell', o, gross);
      const net = Math.max(r2(gross - c.total), 0);
      state.money = r2(state.money + net);
      st.costs = r4(st.costs + c.total);
      o.fill = { day: f.fill.day, close: f.fill.close, usdKrw: f.fill.usd_krw, price, units, gross, fee: c.fee, tax: c.tax, fx: c.fx, net, realized: r2(net - (o.costBasis ?? 0)) };
    }
    o.status = 'filled';
    o.doneAt = now.toISOString();
    done.push(o);
  }
  if (done.length) keepLog(st);
  return done;
}

/** Stars or unstars an asset. */
export function toggleWatch(state: WithStocks, id: string): boolean {
  const st = stocksOf(state);
  const on = !st.watch.includes(id);
  st.watch = on ? [...st.watch, id] : st.watch.filter((x) => x !== id);
  return on;
}

/** What the household holds now, at the market's last prices: each holding and the totals. */
export function portfolio(stocks: StockState | undefined, market: StockMarketData | null) {
  const byId = new Map(market?.assets.map((a) => [a.id, a]) ?? []);
  const rows = Object.entries(stocks?.holdings ?? {}).map(([id, h]) => {
    const a = byId.get(id);
    const price = a ? lastPrice(a, market!.fx) : null;
    const value = price === null ? h.cost : h.units * price;
    return { id, name: a?.name ?? id, asset: a, units: h.units, cost: h.cost, price, value, gain: value - h.cost };
  }).sort((x, y) => y.value - x.value);
  const pendingBuy = (stocks?.orders ?? []).filter((o) => o.status === 'pending' && o.side === 'buy').reduce((s, o) => s + (o.money ?? 0), 0);
  const pendingSell = (stocks?.orders ?? []).filter((o) => o.status === 'pending' && o.side === 'sell').reduce((s, o) => {
    const a = byId.get(o.assetId);
    const p = a ? lastPrice(a, market!.fx) : null;
    return s + (p === null ? o.costBasis ?? 0 : (o.units ?? 0) * p);
  }, 0);
  const value = rows.reduce((s, r) => s + r.value, 0);
  const cost = rows.reduce((s, r) => s + r.cost, 0);
  return { rows, value, cost, gain: value - cost, pendingBuy, pendingSell };
}

// ---------- indicators (on closes, oldest first; null until there's enough) ----------

/** Simple moving average over `n` days. */
export function sma(values: number[], n: number): Array<number | null> {
  let sum = 0;
  return values.map((v, i) => {
    sum += v;
    if (i >= n) sum -= values[i - n];
    return i >= n - 1 ? sum / n : null;
  });
}

/** Exponential moving average (the first value is the simple average of the first `n`). */
export function ema(values: number[], n: number): Array<number | null> {
  const k = 2 / (n + 1);
  const out: Array<number | null> = [];
  let prev: number | null = null;
  values.forEach((v, i) => {
    if (i < n - 1) out.push(null);
    else if (i === n - 1) {
      prev = values.slice(0, n).reduce((s, x) => s + x, 0) / n;
      out.push(prev);
    } else {
      prev = v * k + (prev as number) * (1 - k);
      out.push(prev);
    }
  });
  return out;
}

/** RSI (Wilder's, 14 days by default): 0–100, above 70 often read as overheated, below 30 as oversold. */
export function rsi(values: number[], n = 14): Array<number | null> {
  const out: Array<number | null> = values.map(() => null);
  if (values.length <= n) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= n; i++) {
    const d = values[i] - values[i - 1];
    gain += Math.max(d, 0);
    loss += Math.max(-d, 0);
  }
  gain /= n;
  loss /= n;
  const at = (g: number, l: number) => (l === 0 ? (g === 0 ? 50 : 100) : 100 - 100 / (1 + g / l));
  out[n] = at(gain, loss);
  for (let i = n + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    gain = (gain * (n - 1) + Math.max(d, 0)) / n;
    loss = (loss * (n - 1) + Math.max(-d, 0)) / n;
    out[i] = at(gain, loss);
  }
  return out;
}

/** MACD (12, 26, 9): the line, its signal and the gap between them (the histogram). */
export function macd(values: number[], fast = 12, slow = 26, signal = 9) {
  const f = ema(values, fast);
  const s = ema(values, slow);
  const line = values.map((_, i) => (f[i] === null || s[i] === null ? null : (f[i] as number) - (s[i] as number)));
  const start = line.findIndex((v) => v !== null);
  const sig: Array<number | null> = values.map(() => null);
  if (start >= 0) {
    const tail = ema(line.slice(start) as number[], signal);
    tail.forEach((v, j) => (sig[start + j] = v));
  }
  const hist = line.map((v, i) => (v === null || sig[i] === null ? null : v - (sig[i] as number)));
  return { line, signal: sig, hist };
}

/** When a new order fills, in words (Korean time). The close is real: Korea 15:30, New York 16:00 (Korea 05:00/06:00 next morning), the dollar 11:00. */
export function fillWhen(asset: Pick<StockAsset, 'source'>, now = new Date()): string {
  const kst = new Date(now.getTime() + 9 * 3600_000);
  const weekday = (d: Date) => d.getUTCDay() !== 0 && d.getUTCDay() !== 6;
  const next = (d: Date) => {
    let x = d;
    while (!weekday(x)) x = new Date(x.getTime() + 86400_000);
    return x;
  };
  const label = (d: Date) => `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${'일월화수목금토'[d.getUTCDay()]})`;
  const minutes = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  if (asset.source === 'krx_stock' || asset.source === 'krx_etf') {
    const d = next(weekday(kst) && minutes < 15 * 60 + 30 ? kst : new Date(kst.getTime() + 86400_000));
    return `${label(d)} 한국 장 마감(15:30) 가격으로 — 시세가 하루 늦게 올라와 다음 날 오후에 보여요`;
  }
  if (asset.source === 'fx') {
    const d = next(weekday(kst) && minutes < 11 * 60 ? kst : new Date(kst.getTime() + 86400_000));
    return `${label(d)} 오전 11시 환율로`;
  }
  return '다음 미국 장 마감 가격으로 — 한국 시간 다음 날 아침에 보여요';
}
