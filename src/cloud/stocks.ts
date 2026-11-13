import { post } from './isekai3dCloud';
import type { StockAsset, StockBar, StockFill, StockMarketData } from '../game/stocks';

/**
 * Real prices for the phone's stock app, from 스페이스기전 through the desk's bridge (stocks/market,
 * stocks/history, stocks/closes → RPC isekai3d_stock_*; D:/NEIS_helper app/core/isekai3d_server.py).
 * The dev server has no bridge: it gets made-up prices for a few assets (marked so), so the app can
 * be tried; a built game opened without 스페이스기전 학생 says where the prices come from.
 */

export type StockProblem = 'needsApp' | 'signIn' | 'server';
export class StockError extends Error {
  constructor(public problem: StockProblem) {
    super(problem === 'needsApp' ? '시세는 스페이스기전 학생에서 게임을 열면 받아요' : problem === 'signIn' ? '스페이스기전 학생에서 로그인하면 시세를 받아요' : '시세를 받지 못했어요. 잠시 뒤에 다시 해 보세요');
  }
}

async function ask(what: string, body: unknown): Promise<unknown> {
  const r = await post(what, body);
  if (r.status === 0 || r.status === 404 || r.status === 405) throw new StockError('needsApp');
  if (r.status === 401) throw new StockError('signIn');
  if (!r.ok) throw new StockError('server');
  return r.data;
}

export const DEV_PRICES = import.meta.env.DEV;

let cache: { at: number; data: StockMarketData } | null = null;

/** Every asset's last daily bar (kept 5 minutes — the prices change once a day). */
export async function fetchMarket(force = false): Promise<StockMarketData> {
  if (!force && cache && Date.now() - cache.at < 5 * 60_000) return cache.data;
  const raw = DEV_PRICES ? devMarket() : ((await ask('stocks/market', {})) as { as_of: string; fx: StockMarketData['fx']; assets: StockAsset[] });
  const data: StockMarketData = { asOf: raw.as_of, fx: raw.fx ? { day: raw.fx.day, usd_krw: Number(raw.fx.usd_krw) } : null, assets: raw.assets.map(numbers) };
  cache = { at: Date.now(), data };
  return data;
}

/** One asset's daily bars, oldest first. */
export async function fetchHistory(id: string, days = 130): Promise<StockBar[]> {
  const raw = DEV_PRICES ? devHistory(id, days) : ((await ask('stocks/history', { p_asset: id, p_days: days })) as StockBar[] | null);
  return (raw ?? []).map((b) => ({ ...b, open: num(b.open), high: num(b.high), low: num(b.low), close: Number(b.close), volume: num(b.volume), usd_krw: num(b.usd_krw) }));
}

/** The close each waiting order fills at (null while there's none yet). */
export async function fetchCloses(asks: Array<{ key: string; asset_id: string; after: string }>): Promise<Array<{ key: string; fill: StockFill | null }>> {
  if (!asks.length) return [];
  const raw = DEV_PRICES ? devCloses(asks) : ((await ask('stocks/closes', { p_asks: asks.slice(0, 100) })) as Array<{ key: string; fill: StockFill | null }> | null);
  return (raw ?? []).map((r) => ({ key: r.key, fill: r.fill ? { ...r.fill, close: Number(r.fill.close), usd_krw: num(r.fill.usd_krw) } : null }));
}

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
const numbers = (a: StockAsset): StockAsset => ({ ...a, open: num(a.open), high: num(a.high), low: num(a.low), close: num(a.close), volume: num(a.volume), prev: num(a.prev) });

// ---------- made-up prices for the dev server ----------

const DEV_ASSETS: Array<Pick<StockAsset, 'id' | 'market' | 'source' | 'symbol' | 'currency' | 'name' | 'sector' | 'blurb'> & { base: number }> = [
  { id: 'kr:005930', market: 'kr', source: 'krx_stock', symbol: '005930', currency: 'KRW', name: '삼성전자', sector: '반도체·전자', blurb: '(개발용 가짜 시세) 메모리 반도체와 스마트폰', base: 215000 },
  { id: 'kr:000660', market: 'kr', source: 'krx_stock', symbol: '000660', currency: 'KRW', name: 'SK하이닉스', sector: '반도체', blurb: '(개발용 가짜 시세) D램·HBM', base: 650000 },
  { id: 'kr:035420', market: 'kr', source: 'krx_stock', symbol: '035420', currency: 'KRW', name: 'NAVER', sector: '인터넷', blurb: '(개발용 가짜 시세) 검색·쇼핑·웹툰', base: 260000 },
  { id: 'etf:069500', market: 'kr', source: 'krx_etf', symbol: '069500', currency: 'KRW', name: 'KODEX 200', sector: 'ETF', blurb: '(개발용 가짜 시세) 한국 대표 200개 회사', base: 87000 },
  { id: 'us:AAPL', market: 'us', source: 'twelve', symbol: 'AAPL', currency: 'USD', name: 'Apple', sector: '전자·플랫폼', blurb: '(개발용 가짜 시세) 아이폰·맥', base: 345 },
  { id: 'us:NVDA', market: 'us', source: 'twelve', symbol: 'NVDA', currency: 'USD', name: 'NVIDIA', sector: '반도체', blurb: '(개발용 가짜 시세) AI GPU', base: 190 },
  { id: 'us:SPY', market: 'us', source: 'twelve', symbol: 'SPY', currency: 'USD', name: 'S&P500 ETF(SPY)', sector: '미국 지수 ETF', blurb: '(개발용 가짜 시세) 미국 대표 500개 회사', base: 680 },
  { id: 'cm:XAU/USD', market: 'cm', source: 'twelve', symbol: 'XAU/USD', currency: 'USD', name: '금(1온스)', sector: '귀금속', blurb: '(개발용 가짜 시세) 안전자산', base: 4000 },
  { id: 'cm:USD', market: 'cm', source: 'fx', symbol: 'USD', currency: 'USD', name: '미국 달러', sector: '환율', blurb: '(개발용 가짜 시세) 1달러', base: 1 },
];
const DEV_FX = 1430;

function devBars(id: string, days: number): StockBar[] {
  const a = DEV_ASSETS.find((x) => x.id === id);
  if (!a) return [];
  let seed = [...id].reduce((s, c) => (s * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const out: StockBar[] = [];
  let close = a.base;
  const today = new Date();
  // always the same 400 days, so every view of an asset agrees
  for (let back = 560; back >= 1; back--) {
    const d = new Date(today.getTime() - back * 86400_000);
    if (d.getUTCDay() === 0 || d.getUTCDay() === 6) continue;
    const open = a.source === 'fx' ? 1 : close * (1 + (rand() - 0.5) * 0.01);
    close = a.source === 'fx' ? 1 : open * (1 + (rand() - 0.48) * 0.04);
    const high = Math.max(open, close) * (1 + rand() * 0.012);
    const low = Math.min(open, close) * (1 - rand() * 0.012);
    out.push({ day: d.toISOString().slice(0, 10), open, high, low, close, volume: a.source === 'fx' || id === 'cm:XAU/USD' ? null : Math.round(1e6 * (0.5 + rand())), close_at: d.toISOString(), usd_krw: a.currency === 'USD' ? DEV_FX + (rand() - 0.5) * 20 : null });
  }
  return out.slice(-days);
}

function devMarket() {
  return {
    as_of: new Date().toISOString(),
    fx: { day: new Date().toISOString().slice(0, 10), usd_krw: DEV_FX },
    assets: DEV_ASSETS.map(({ base: _base, ...a }) => {
      const bars = devBars(a.id, 3);
      const last = bars[bars.length - 1];
      return { ...a, day: last.day, close_at: last.close_at, open: last.open, high: last.high, low: last.low, close: last.close, volume: last.volume, prev: bars[bars.length - 2]?.close ?? null };
    }),
  };
}

const devHistory = (id: string, days: number) => devBars(id, days);

/** The dev server fills an order at once at the last made-up close (there's no real close to wait for). */
function devCloses(asks: Array<{ key: string; asset_id: string }>) {
  return asks.map((k) => {
    const bars = devBars(k.asset_id, 2);
    const last = bars[bars.length - 1];
    return { key: k.key, fill: last ? { day: last.day, close: last.close, close_at: last.close_at, usd_krw: last.usd_krw ?? (k.asset_id.startsWith('kr') || k.asset_id.startsWith('etf') ? null : DEV_FX) } : null };
  });
}
