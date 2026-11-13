import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readPack } from './pack';

const pack = (format: number, version = '2026.10.25.1300', where = 'machine') => ({ format, version, where, files: 400 });

describe('the character pack beside the game (core/isekai3d_server.py)', () => {
  it('a pack in the format the game reads is used', () => {
    expect(readPack({ want: 2, active: pack(2), installed: [pack(1), pack(2)], download: null })!.state).toBe('ok');
  });

  it('only the older pack: shapes until the new one comes, with the way to get it', () => {
    const link = { url: 'https://drive.google.com/file/d/x/view', note: '' };
    const p = readPack({ want: 2, active: null, installed: [pack(1, '2026.10.20.0727')], download: link })!;
    expect(p.state).toBe('old');
    expect(p.download).toEqual(link);
  });

  it('a pack newer than the game waits for the program’s update', () => {
    expect(readPack({ want: 2, active: null, installed: [pack(3)], download: null })!.state).toBe('newer');
  });

  it('no pack at all', () => {
    expect(readPack({ want: 2, active: null, installed: [], download: null })!.state).toBe('none');
  });

  it('no such server (the dev server, a plain web build): nothing to say', () => {
    expect(readPack(null)).toBeNull();
    expect(readPack('<!doctype html>')).toBeNull();
  });

  it('every character file has a name the student server hands out (lower case only)', () => {
    const served = /^(female|male)-(toddler|child|teen|adult|elder)-[a-z0-9_]+(@[a-z]+)?\.vrm$/;
    const files = readdirSync('models').filter((f) => f.endsWith('.vrm') && !f.includes('-sample_'));
    expect(files.length).toBeGreaterThan(100);
    expect(files.filter((f) => !served.test(f))).toEqual([]);
  });
});
