import { describe, expect, it } from 'vitest';
import {
  applyFills, cancelOrder, dayChange, ema, fillWhen, macd, newStocks, pendingAsks, placeBuy, placeSell, portfolio, previewBuy, previewSell, priceMoney,
  rsi, sma, stockCosts, toggleWatch, type StockAsset, type StockMarketData,
} from './stocks';

const asset = (over: Partial<StockAsset>): StockAsset => ({
  id: 'kr:005930', market: 'kr', source: 'krx_stock', symbol: '005930', currency: 'KRW', name: '삼성전자', sector: '반도체', blurb: '',
  day: '2026-10-23', close_at: '2026-10-23T06:30:00Z', open: null, high: null, low: null, close: 215500, volume: null, prev: 214500, ...over,
});
const samsung = asset({});
const apple = asset({ id: 'us:AAPL', market: 'us', source: 'twelve', symbol: 'AAPL', currency: 'USD', name: 'Apple', close: 347.73, prev: 340 });
const etf = asset({ id: 'etf:069500', source: 'krx_etf', name: 'KODEX 200', close: 87075 });
const house = (money = 1000) => ({ money, stocks: newStocks() });
const at = new Date('2026-10-26T01:00:00Z'); // 10:00 KST Monday

describe('the stock app (stocks.ts)', () => {
  it('costs as in real life: 0.015% each way, 0.18% tax selling a Korean share, 0.25% changing money', () => {
    expect(stockCosts('buy', samsung, 100)).toEqual({ fee: 0.015, tax: 0, fx: 0, total: 0.015 });
    expect(stockCosts('sell', samsung, 100)).toEqual({ fee: 0.015, tax: 0.18, fx: 0, total: 0.195 });
    expect(stockCosts('sell', etf, 100).tax).toBe(0);
    expect(stockCosts('buy', apple, 100)).toEqual({ fee: 0.015, tax: 0, fx: 0.25, total: 0.265 });
  });

  it('§1 = 1,000원: a share of Samsung ≈ §215.5, an Apple share at the day’s rate', () => {
    expect(priceMoney(215500, 'KRW', null)).toBe(215.5);
    expect(priceMoney(347.73, 'USD', 1430)).toBeCloseTo(497.25, 2);
    expect(priceMoney(347.73, 'USD', null)).toBeNull();
    expect(previewBuy(100, samsung, 215.5).units).toBeCloseTo(99.985 / 215.5, 9);
    expect(previewSell(1, samsung, 215.5)).toEqual({ gross: 215.5, costs: stockCosts('sell', samsung, 215.5), net: 215.0798 });
  });

  it('a buy sets the money aside now and turns it, less costs, into shares at the close the server finds', () => {
    const s = house();
    const o = placeBuy(s, samsung, 100, at);
    expect(typeof o).toBe('object');
    expect(s.money).toBe(900);
    expect(pendingAsks(s)).toEqual([{ key: 'o1', asset_id: 'kr:005930', after: at.toISOString() }]);
    // no close yet: nothing happens
    expect(applyFills(s, [{ key: 'o1', fill: null }])).toEqual([]);
    const done = applyFills(s, [{ key: 'o1', fill: { day: '2026-10-26', close: 220000, close_at: '2026-10-26T06:30:00Z', usd_krw: null } }]);
    expect(done).toHaveLength(1);
    expect(s.stocks.holdings['kr:005930'].units).toBeCloseTo(99.985 / 220, 9);
    expect(s.stocks.holdings['kr:005930'].cost).toBe(100);
    expect(s.stocks.costs).toBe(0.015);
    expect(pendingAsks(s)).toEqual([]);
  });

  it('a dollar asset waits for the day’s rate (the server says null) and fills with it', () => {
    const s = house();
    placeBuy(s, apple, 50, at);
    applyFills(s, [{ key: 'o1', fill: { day: '2026-10-26', close: 350, close_at: '2026-10-26T20:00:00Z', usd_krw: 1400 } }]);
    // 50 − 0.0075 fee − 0.125 changing money, at 350 × 1400 / 1000 = §490 a share
    expect(s.stocks.holdings['us:AAPL'].units).toBeCloseTo((50 - 0.0075 - 0.125) / 490, 9);
  });

  it('a sell sets the shares and what they cost aside; filled it pays the money less fee and tax, and says the gain', () => {
    const s = house();
    s.stocks.holdings['kr:005930'] = { units: 2, cost: 400 };
    placeSell(s, samsung, 1, at);
    expect(s.stocks.holdings['kr:005930']).toEqual({ units: 1, cost: 200 });
    const [o] = applyFills(s, [{ key: 'o1', fill: { day: '2026-10-26', close: 220000, close_at: '2026-10-26T06:30:00Z', usd_krw: null } }]);
    // 220 − 0.033 fee − 0.396 tax = 219.571 → §219.57
    expect(o.fill!.net).toBe(219.57);
    expect(o.fill!.realized).toBe(19.57);
    expect(s.money).toBe(1219.57);
  });

  it('selling all (within a hair) empties the holding; more than held or nothing held is refused', () => {
    const s = house();
    s.stocks.holdings['kr:005930'] = { units: 0.1 + 0.2, cost: 60 };
    expect(placeSell(s, samsung, 0.3, at)).toMatchObject({ units: 0.1 + 0.2, costBasis: 60 });
    expect(s.stocks.holdings['kr:005930']).toBeUndefined();
    expect(placeSell(s, samsung, 1, at)).toBe('가진 주식이 없어요');
    s.stocks.holdings['kr:005930'] = { units: 1, cost: 10 };
    expect(placeSell(s, samsung, 2, at)).toBe('가진 것보다 많이 팔 수 없어요');
  });

  it('a buy needs the money and at least §1', () => {
    const s = house(50);
    expect(placeBuy(s, samsung, 0.5, at)).toBe('§1 이상부터 살 수 있어요');
    expect(placeBuy(s, samsung, 60, at)).toBe('가진 돈보다 많이 살 수 없어요');
    expect(s.money).toBe(50);
  });

  it('cancelling a waiting order gives back the money or the shares', () => {
    const s = house();
    s.stocks.holdings['kr:005930'] = { units: 2, cost: 400 };
    placeBuy(s, samsung, 100, at);
    placeSell(s, samsung, 2, at);
    expect(cancelOrder(s, 'o1')).toBe(true);
    expect(cancelOrder(s, 'o2')).toBe(true);
    expect(s.money).toBe(1000);
    expect(s.stocks.holdings['kr:005930']).toEqual({ units: 2, cost: 400 });
    expect(cancelOrder(s, 'o1')).toBe(false);
    expect(s.stocks.orders.map((o) => o.status)).toEqual(['cancelled', 'cancelled']);
  });

  it('the portfolio at the last prices, waiting orders counted apart', () => {
    const s = house();
    s.stocks.holdings['kr:005930'] = { units: 1, cost: 200 };
    placeBuy(s, apple, 30, at);
    const market: StockMarketData = { asOf: at.toISOString(), fx: { day: '2026-10-26', usd_krw: 1430 }, assets: [samsung, apple] };
    const p = portfolio(s.stocks, market);
    expect(p.value).toBe(215.5);
    expect(p.gain).toBeCloseTo(15.5, 9);
    expect(p.pendingBuy).toBe(30);
    expect(dayChange(samsung)).toBeCloseTo((215500 - 214500) / 2145, 9);
  });

  it('stars and unstars', () => {
    const s = house();
    expect(toggleWatch(s, 'kr:005930')).toBe(true);
    expect(toggleWatch(s, 'us:AAPL')).toBe(true);
    expect(toggleWatch(s, 'kr:005930')).toBe(false);
    expect(s.stocks.watch).toEqual(['us:AAPL']);
  });

  it('indicators: moving averages, RSI, MACD', () => {
    const v = [1, 2, 3, 4, 5, 6];
    expect(sma(v, 3)).toEqual([null, null, 2, 3, 4, 5]);
    expect(ema(v, 3)).toEqual([null, null, 2, 3, 4, 5]);
    const up = Array.from({ length: 30 }, (_, i) => 100 + i);
    expect(rsi(up)[14]).toBe(100);
    expect(rsi(up.map((x) => 200 - x)).at(-1)).toBe(0);
    expect(rsi(up).slice(0, 14).every((x) => x === null)).toBe(true);
    const m = macd(Array.from({ length: 60 }, (_, i) => 100 + i));
    expect(m.line[24]).toBeNull();
    expect(m.line[25]).not.toBeNull();
    expect(m.signal[25 + 7]).toBeNull();
    expect(m.signal[25 + 8]).not.toBeNull();
    expect(m.line.at(-1)!).toBeGreaterThan(0);
  });

  it('when an order fills, in Korean time', () => {
    expect(fillWhen(samsung, at)).toMatch(/^10\/26\(월\) 한국 장 마감/);
    expect(fillWhen(samsung, new Date('2026-10-26T07:00:00Z'))).toMatch(/^10\/27\(화\)/); // 16:00 KST
    expect(fillWhen(samsung, new Date('2026-10-31T01:00:00Z'))).toMatch(/^11\/2\(월\)/); // Saturday
    expect(fillWhen(apple, at)).toMatch(/미국 장 마감/);
  });
});
