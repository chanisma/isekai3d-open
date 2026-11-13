import { WEEKDAYS } from './constants';

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Picks the right Korean particle for a word, e.g. josa('민준', '이/가') → '민준이'. */
export function josa(word: string, pair: '이/가' | '을/를' | '은/는' | '와/과'): string {
  // 와/과 is written the other way round: 과 follows a final consonant.
  const [withFinal, withoutFinal] = pair === '와/과' ? ['과', '와'] : pair.split('/');
  const code = word.charCodeAt(word.length - 1);
  const isHangul = code >= 0xac00 && code <= 0xd7a3;
  const hasFinal = isHangul && (code - 0xac00) % 28 !== 0;
  return word + (hasFinal ? withFinal : withoutFinal);
}

export function clockInfo(time: number) {
  const day = Math.floor(time / 1440);
  const minuteOfDay = time - day * 1440;
  const hour = Math.floor(minuteOfDay / 60);
  const minute = Math.floor(minuteOfDay % 60);
  return { day, weekday: day % 7, weekdayLabel: WEEKDAYS[day % 7], minuteOfDay, hour, minute };
}

export function formatClock(minuteOfDay: number): string {
  const h = Math.floor(minuteOfDay / 60) % 24;
  const m = Math.floor(minuteOfDay % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
