/**
 * A check for text that is hard to read (development builds only: `window.__contrast()` in the
 * browser console). For every piece of text on screen it works out the colour behind it, by
 * laying each ancestor's background over the page's (a gradient counts as the mean of its stops,
 * layer by layer), and
 * the WCAG 2 contrast ratio against the text colour (with the elements' opacity). It lists what is
 * under 4.5:1, or under 3:1 for large text (24px, or 18.66px bold). Disabled controls are marked:
 * WCAG exempts them, but they should still be legible. See docs/ref-game/11-ui.md §7.3.
 */
type RGBA = { r: number; g: number; b: number; a: number };

const probe = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;

function parse(c: string): RGBA | null {
  const srgb = c.match(/color\(srgb ([^)]+)\)/);
  if (srgb) {
    const p = srgb[1].split(/[ /]+/).filter(Boolean).map(Number);
    return { r: p[0] * 255, g: p[1] * 255, b: p[2] * 255, a: p.length > 3 ? p[3] : 1 };
  }
  if (!/^rgba?\(/.test(c) && probe) {
    probe.fillStyle = '#000';
    probe.fillStyle = c;
    c = String(probe.fillStyle);
    if (c.startsWith('#')) return { r: parseInt(c.slice(1, 3), 16), g: parseInt(c.slice(3, 5), 16), b: parseInt(c.slice(5, 7), 16), a: 1 };
  }
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
  return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
}

const over = (top: RGBA, bottom: RGBA): RGBA => ({
  r: top.r * top.a + bottom.r * (1 - top.a),
  g: top.g * top.a + bottom.g * (1 - top.a),
  b: top.b * top.a + bottom.b * (1 - top.a),
  a: 1,
});

function luminance(c: RGBA): number {
  const f = (v: number) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}

export function contrastRatio(a: RGBA, b: RGBA): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** A background-image split into its layers (commas at the top level), top layer first. */
function layers(image: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < image.length; i++) {
    if (image[i] === '(') depth++;
    else if (image[i] === ')') depth--;
    else if (image[i] === ',' && depth === 0) {
      out.push(image.slice(start, i));
      start = i + 1;
    }
  }
  out.push(image.slice(start));
  return out;
}

function behind(el: Element): { bg: RGBA; gradient: boolean } {
  const chain: Element[] = [];
  for (let e: Element | null = el; e; e = e.parentElement) chain.unshift(e);
  let bg = parse(getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()) ?? { r: 255, g: 255, b: 255, a: 1 };
  let gradient = false;
  for (const e of chain) {
    const cs = getComputedStyle(e);
    if (cs.backgroundImage !== 'none' && e !== document.body && e !== document.documentElement) {
      // Layers bottom first, each as the mean of its colour stops (a glow over a navy band is still navy).
      for (const layer of layers(cs.backgroundImage).reverse()) {
        const stops = (layer.match(/rgba?\([^)]+\)|color\(srgb [^)]+\)|#[0-9a-f]{3,8}/gi) ?? []).map(parse).filter((c): c is RGBA => !!c);
        if (!stops.length) continue;
        const n = stops.length;
        const mean = stops.reduce((m, c) => ({ r: m.r + c.r / n, g: m.g + c.g / n, b: m.b + c.b / n, a: m.a + c.a / n }), { r: 0, g: 0, b: 0, a: 0 });
        bg = over(mean, bg);
        gradient = true;
      }
    }
    const c = parse(cs.backgroundColor);
    if (c && c.a > 0) bg = over(c, bg);
  }
  return { bg, gradient };
}

export function auditContrast(label = ''): string {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('canvas, svg')) continue;
    const text = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent!.trim())
      .join(' ')
      .replace(/[\p{Extended_Pictographic}️‍]/gu, '')
      .trim();
    if (!text) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.top > innerHeight) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden') continue;
    let opacity = 1;
    for (let e: Element | null = el; e; e = e.parentElement) opacity *= Number(getComputedStyle(e).opacity);
    if (opacity < 0.05) continue;
    const color = parse(cs.color);
    if (!color) continue;
    const { bg, gradient } = behind(el);
    const ratio = contrastRatio(over({ ...color, a: color.a * opacity }, bg), bg);
    const size = parseFloat(cs.fontSize);
    const large = size >= 24 || (Number(cs.fontWeight) >= 700 && size >= 18.66);
    if (ratio >= (large ? 3 : 4.5)) continue;
    const key = `${el.className}|${text.slice(0, 20)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const disabled = !!el.closest(':disabled, [aria-disabled="true"]');
    out.push(`${ratio.toFixed(2)} ${disabled ? '[disabled] ' : ''}${gradient ? '[gradient] ' : ''}${el.tagName.toLowerCase()}.${String(el.className).split(' ').join('.')} "${text.slice(0, 24)}" ${cs.color} ${size}px`);
  }
  return `${label}${label ? ': ' : ''}${out.length} hard to read\n${out.sort().join('\n')}`;
}
