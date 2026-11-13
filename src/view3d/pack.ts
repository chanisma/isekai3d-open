import { useEffect, useState } from 'react';

/**
 * The character pack installed beside the game (스페이스기전 학생, core/isekai3d_server.py). The game and
 * the pack update apart (the game with the program, the pack through Intune, often later), so the
 * server lists characters only from a pack in the format this game reads; with none, dwellers are shape
 * figures and the game says why, with the way to the new pack's installer (a Google Drive link the
 * 스페이스기전 admin sets). Format 1 is the 2026-10-20 pack (a dressed file a character); format 2 has
 * base bodies, clothes-only files and work clothes (2026-10-25).
 */
export type PackState = 'ok' | 'none' | 'old' | 'newer';

export interface PackStatus {
  state: PackState;
  /** The format this game reads. */
  want: number;
  active: PackInfo | null;
  installed: PackInfo[];
  download: { url: string; note: string } | null;
}

interface PackInfo {
  format: number;
  version: string;
  where: 'machine' | 'user' | 'dev' | 'given';
  files: number;
}

/** What the server says, read into a state: null where there's no such server (the dev server, a plain web build). */
export function readPack(raw: unknown): PackStatus | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<PackStatus>;
  if (typeof r.want !== 'number') return null;
  const installed = Array.isArray(r.installed) ? r.installed : [];
  const active = r.active ?? null;
  const state: PackState = active
    ? 'ok'
    : installed.some((p) => p.format > r.want!) && !installed.some((p) => p.format < r.want!)
      ? 'newer'
      : installed.length
        ? 'old'
        : 'none';
  return { state, want: r.want, active, installed, download: r.download ?? null };
}

let asked: Promise<PackStatus | null> | null = null;

export function packStatus(): Promise<PackStatus | null> {
  if (import.meta.env.DEV) return Promise.resolve(null);
  asked ??= fetch(`${import.meta.env.BASE_URL}models/pack.json?t=${Date.now()}`, { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then(readPack)
    .catch(() => null);
  return asked;
}

export function usePack(): PackStatus | null {
  const [pack, setPack] = useState<PackStatus | null>(null);
  useEffect(() => {
    let live = true;
    void packStatus().then((p) => live && setPack(p));
    return () => {
      live = false;
    };
  }, []);
  return pack;
}

/** Opens the installer's page in the student's own browser (the server does it; the game window can't). */
export async function openPackDownload(pack: PackStatus): Promise<string> {
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}api/isekai3d/pack/download`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const answer = (await r.json()) as { message?: string; error?: string };
    if (r.ok) return answer.message ?? '';
    if (!pack.download) return answer.error ?? '';
  } catch {
    // no server to ask: the link itself
  }
  if (pack.download) window.open(pack.download.url, '_blank', 'noopener');
  return '';
}

/** One line on how the pack stands, for the notice and the settings. */
export function packLine(pack: PackStatus): string {
  switch (pack.state) {
    case 'ok':
      return `설치됨 (${pack.active!.version || '개발용'})`;
    case 'none':
      return '3D 캐릭터 팩이 없어 캐릭터가 도형으로 보여요.';
    case 'old':
      return '설치된 3D 캐릭터 팩이 이전 판이라 캐릭터가 도형으로 보여요. 새 팩은 자동으로 설치되고, 지금 직접 받아 설치할 수도 있어요.';
    case 'newer':
      return '3D 캐릭터 팩이 이 게임보다 새 판이에요. 프로그램이 업데이트되면 3D 캐릭터로 보여요.';
  }
}
