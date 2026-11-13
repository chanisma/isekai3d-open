import { useEffect, useRef, useState } from 'react';

/**
 * Any colour, picked on the system's RGB palette, at the end of a row of swatches (the character
 * creator's and the edit window's). A rainbow until a colour of its own is picked, then that colour.
 * While the palette is being dragged the colour is passed on only once it rests a moment, so the
 * 3D character isn't recoloured at every step.
 */
export function ColorPick({ colors, value, onPick }: { colors: string[]; value?: string; onPick: (c: string) => void }) {
  const own = !!value && /^#[0-9a-f]{6}$/i.test(value) && !colors.includes(value);
  const [now, setNow] = useState(value);
  const wait = useRef(0);
  useEffect(() => setNow(value), [value]);
  useEffect(() => () => clearTimeout(wait.current), []);
  const pick = (c: string) => {
    setNow(c);
    clearTimeout(wait.current);
    wait.current = window.setTimeout(() => onPick(c), 200);
  };
  return (
    <label className={`color-pick ${own ? 'on' : ''}`} style={own ? { background: now } : undefined} title="원하는 색 고르기 (RGB)">
      <input type="color" value={now && /^#[0-9a-f]{6}$/i.test(now) ? now : '#808080'} onChange={(e) => pick(e.target.value)} aria-label="원하는 색 고르기 (RGB)" />
    </label>
  );
}
