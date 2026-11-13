import { useMemo, useState, type PointerEvent, type ReactElement } from 'react';
import { macd, rsi, sma, type StockBar } from '../game/stocks';

/**
 * The stock app's chart (2026-10-26): daily candles with the volume under them, moving averages on
 * top, and RSI or MACD in a panel below — drawn as SVG (no chart library in the game). Korean
 * colours: up red, down blue. Touch or hover a day to read it.
 */

export const UP = '#d32f2f';
export const DOWN = '#1e5bd8';
export const MA_LINES = [
  { n: 5, color: '#e08a1e', label: '5일' },
  { n: 20, color: '#8e44ad', label: '20일' },
  { n: 60, color: '#16a085', label: '60일' },
] as const;

export type LowerPanel = 'volume' | 'rsi' | 'macd';

const W = 340;
const PAD_R = 46;
const MAIN_H = 170;
const LOW_H = 64;
const GAP = 10;

export function StockChart({ bars, shown, ma, lower, fmt }: {
  /** All bars loaded (indicators need the days before); `shown` of the newest are drawn. */
  bars: StockBar[];
  shown: number;
  ma: Record<number, boolean>;
  lower: LowerPanel;
  fmt: (price: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const closes = useMemo(() => bars.map((b) => b.close), [bars]);
  const maLines = useMemo(() => Object.fromEntries(MA_LINES.map((m) => [m.n, sma(closes, m.n)])), [closes]);
  const rsiLine = useMemo(() => rsi(closes), [closes]);
  const macdLines = useMemo(() => macd(closes), [closes]);

  const from = Math.max(bars.length - shown, 0);
  const view = bars.slice(from);
  if (view.length < 2) return <p className="stk-empty">아직 그릴 만큼 시세가 없어요.</p>;

  const plotW = W - PAD_R;
  const step = plotW / view.length;
  const body = Math.max(Math.min(step * 0.62, 9), 1.5);
  const x = (i: number) => (i + 0.5) * step;
  const highs = view.map((b, i) => Math.max(b.high ?? b.close, ...MA_LINES.filter((m) => ma[m.n]).map((m) => maLines[m.n][from + i] ?? -Infinity)));
  const lows = view.map((b, i) => Math.min(b.low ?? b.close, ...MA_LINES.filter((m) => ma[m.n]).map((m) => maLines[m.n][from + i] ?? Infinity)));
  let top = Math.max(...highs);
  let bottom = Math.min(...lows);
  if (top === bottom) {
    top *= 1.01;
    bottom *= 0.99;
  }
  const pad = (top - bottom) * 0.06;
  top += pad;
  bottom -= pad;
  const y = (p: number) => ((top - p) / (top - bottom)) * MAIN_H;
  const lowY0 = MAIN_H + GAP;
  const ticks = [0, 0.5, 1].map((t) => top - (top - bottom) * (0.06 + t * 0.88));

  const line = (vals: Array<number | null>, yy: (v: number) => number) => {
    let d = '';
    vals.slice(from).forEach((v, i) => {
      if (v === null) return;
      d += `${d && vals[from + i - 1] !== null ? 'L' : 'M'}${x(i).toFixed(1)},${yy(v).toFixed(1)}`;
    });
    return d;
  };

  // the lower panel
  let lower_el: ReactElement | null = null;
  if (lower === 'volume') {
    const vols = view.map((b) => b.volume ?? 0);
    const vmax = Math.max(...vols, 1);
    lower_el = vols.some((v) => v > 0) ? (
      <g>
        {view.map((b, i) => {
          const h = ((b.volume ?? 0) / vmax) * (LOW_H - 4);
          const up = b.close >= (b.open ?? bars[from + i - 1]?.close ?? b.close);
          return <rect key={b.day} x={x(i) - body / 2} y={lowY0 + LOW_H - h} width={body} height={h} fill={up ? UP : DOWN} opacity={0.55} />;
        })}
        <text x={plotW + 4} y={lowY0 + 10} className="stk-axis">거래량</text>
      </g>
    ) : (
      <text x={plotW / 2} y={lowY0 + LOW_H / 2} textAnchor="middle" className="stk-axis">거래량이 없는 자산이에요</text>
    );
  } else if (lower === 'rsi') {
    const ry = (v: number) => lowY0 + ((100 - v) / 100) * LOW_H;
    lower_el = (
      <g>
        <rect x={0} y={ry(70)} width={plotW} height={ry(30) - ry(70)} fill="#8e44ad" opacity={0.07} />
        {[30, 70].map((v) => <line key={v} x1={0} x2={plotW} y1={ry(v)} y2={ry(v)} stroke="#8e44ad" strokeDasharray="3 3" strokeWidth={0.7} opacity={0.6} />)}
        <path d={line(rsiLine, ry)} fill="none" stroke="#8e44ad" strokeWidth={1.4} />
        <text x={plotW + 4} y={ry(70) + 3} className="stk-axis">70</text>
        <text x={plotW + 4} y={ry(30) + 3} className="stk-axis">30</text>
      </g>
    );
  } else {
    const vals = [...macdLines.line.slice(from), ...macdLines.signal.slice(from), ...macdLines.hist.slice(from)].filter((v): v is number => v !== null);
    const m = Math.max(...vals.map(Math.abs), 1e-9);
    const my = (v: number) => lowY0 + LOW_H / 2 - (v / m) * (LOW_H / 2 - 2);
    lower_el = (
      <g>
        <line x1={0} x2={plotW} y1={my(0)} y2={my(0)} stroke="#9aa0b5" strokeWidth={0.6} />
        {macdLines.hist.slice(from).map((v, i) => (v === null ? null : <rect key={i} x={x(i) - body / 2} y={Math.min(my(v), my(0))} width={body} height={Math.abs(my(v) - my(0))} fill={v >= 0 ? UP : DOWN} opacity={0.45} />))}
        <path d={line(macdLines.line, my)} fill="none" stroke="#e08a1e" strokeWidth={1.3} />
        <path d={line(macdLines.signal, my)} fill="none" stroke="#16a085" strokeWidth={1.1} strokeDasharray="4 2" />
        <text x={plotW + 4} y={my(0) + 3} className="stk-axis">0</text>
      </g>
    );
  }

  const h = MAIN_H + GAP + LOW_H + 16;
  const hb = hover === null ? null : view[hover];
  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.floor(px / step);
    setHover(i >= 0 && i < view.length ? i : null);
  };

  return (
    <div className="stk-chart">
      <div className="stk-readout" aria-live="polite">
        {hb ? (
          <>
            <b>{hb.day.slice(5).replace('-', '/')}</b>
            {hb.open !== null && <span>시 {fmt(hb.open)}</span>}
            {hb.high !== null && <span>고 {fmt(hb.high)}</span>}
            {hb.low !== null && <span>저 {fmt(hb.low)}</span>}
            <span>종 {fmt(hb.close)}</span>
          </>
        ) : (
          <span className="muted">차트를 누르면 그날 값을 봐요</span>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${h}`} role="img" aria-label="일봉 차트" onPointerMove={pick} onPointerDown={pick} onPointerLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={0} x2={plotW} y1={y(t)} y2={y(t)} stroke="#e3e6ef" strokeWidth={0.7} />
            <text x={plotW + 4} y={y(t) + 3} className="stk-axis">{fmt(t)}</text>
          </g>
        ))}
        {view.map((b, i) => {
          const open = b.open ?? bars[from + i - 1]?.close ?? b.close;
          const up = b.close >= open;
          const c = up ? UP : DOWN;
          const yo = y(open);
          const yc = y(b.close);
          return (
            <g key={b.day}>
              <line x1={x(i)} x2={x(i)} y1={y(b.high ?? Math.max(open, b.close))} y2={y(b.low ?? Math.min(open, b.close))} stroke={c} strokeWidth={0.9} />
              <rect x={x(i) - body / 2} y={Math.min(yo, yc)} width={body} height={Math.max(Math.abs(yc - yo), 0.8)} fill={c} />
            </g>
          );
        })}
        {MA_LINES.filter((m) => ma[m.n]).map((m) => <path key={m.n} d={line(maLines[m.n], y)} fill="none" stroke={m.color} strokeWidth={1.2} />)}
        {lower_el}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={0} y2={MAIN_H + GAP + LOW_H} stroke="#1c2850" strokeWidth={0.6} strokeDasharray="2 2" />}
        <text x={0} y={h - 3} className="stk-axis">{view[0].day.slice(5).replace('-', '/')}</text>
        <text x={plotW} y={h - 3} textAnchor="end" className="stk-axis">{view[view.length - 1].day.slice(5).replace('-', '/')}</text>
      </svg>
    </div>
  );
}
