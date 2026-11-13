import { describe, expect, it } from 'vitest';
import inFont from '../assets/fonts/emoji-in-font.json';

/**
 * Every emoji the game shows comes from its own Fluent Emoji font (src/assets/fonts), so it looks
 * the same on every computer. An emoji added to the code but not to the font would show in the
 * computer's own style: rebuild the font (tools/emoji-font/README.md) or pick one that is in it.
 */
const TEXT_GLYPHS = new Set(['▶', '◀', '✔', '♻', '⏸']);
const EMOJI = /(?:\p{Regional_Indicator}{2})|(?:[#*0-9]️?⃣)|(?:\p{Extended_Pictographic}(?:️|[\u{1F3FB}-\u{1F3FF}])?(?:‍\p{Extended_Pictographic}(?:️|[\u{1F3FB}-\u{1F3FF}])?)*)/gu;

// Every source file's text, through Vite (tests excluded below).
const FILES = import.meta.glob('../**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

describe('the emoji font', () => {
  it('has every emoji the game uses', () => {
    const have = new Set(inFont as string[]);
    const missing = new Set<string>();
    for (const [file, text] of Object.entries(FILES)) {
      if (file.includes('.test.')) continue;
      for (const [e] of text.matchAll(EMOJI)) {
        if (TEXT_GLYPHS.has(e)) continue;
        if (!have.has(e.replace(/️/g, ''))) missing.add(`${e} (${file})`);
      }
    }
    expect([...missing]).toEqual([]);
  });
});
