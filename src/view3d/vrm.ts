import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils, type VRM } from '@pixiv/three-vrm';
import type { Stage } from '../dweller3d/figure';

/**
 * The VRoid characters (models/README.md), served by the dev server (vite.config.ts) and, for the
 * build, by the program it runs in (스페이스기전 학생, without the VRoid samples), listed at
 * models/index.json. With none for a dweller, our own shape figure stands in. A file is named
 * `<female|male>-<stage>-<name>.vrm`, with `@sleep`, `@athletic`, `@bathing` or `@formal` before the
 * extension for that outfit of the same character (참고 게임's outfit categories), `@<role>` for what they
 * wear coming in a role (`@reaper`…, else their own clothes), or `@base` for a character's full body in
 * underwear that their clothes are put on (docs/3d/03-clothing-workflow.md). The NPCs are characters
 * like any other (2026-10-25): a visitor with a role is played by the one kept for it (`ROLE_CAST`). Files named `npc_hair_<id>` or `npc_garment_<id>` are no one: a hair, a garment set.
 */
export const NAME = /^(female|male)-(toddler|child|teen|adult|elder)-([a-z0-9_]+)(?:@(sleep|athletic|bathing|formal|base|reaper|burglar|repair|boss|coworker|maid|nanny|client))?\.vrm$/i;
export type Outfit = 'sleep' | 'athletic' | 'bathing' | 'formal';
export type Role = 'reaper' | 'burglar' | 'repair' | 'boss' | 'coworker' | 'maid' | 'nanny' | 'client';

export interface ModelInfo {
  file: string;
  gender: 'female' | 'male';
  stage: Stage;
  name: string;
  /** An outfit file, a role's (`@reaper`…), or `base`: the character's full body in underwear, the clothes put on it at load (vrmDress.ts). */
  outfit?: Outfit | Role | 'base';
  /**
   * No one's face: a file kept only for a hair (`npc_hair_…`) or a garment set (`npc_garment_…`); or a
   * star's (`star_…`, game/stars.ts): only the one dweller given that face, worn always as the file comes.
   */
  kept?: 'hair' | 'garment' | 'star' | 'lite';
}

/**
 * The look an NPC is played in: its role, or for a service visit the service (maid, repair, nanny)
 * and for a colleague the boss. Households and everyone else (walkers, guests) get none.
 */
export function npcRole(npc: { role: string; service?: string; boss?: boolean } | undefined): string | undefined {
  if (!npc) return undefined;
  if (npc.role === 'service') return npc.service ?? 'repair';
  if (npc.role === 'coworker') return npc.boss ? 'boss' : 'coworker';
  return ['burglar', 'reaper', 'client'].includes(npc.role) ? npc.role : undefined;
}

/**
 * Who comes for each role (`npcRole`), grown up and in their own clothes: the characters first made
 * for those visitors (until 2026-10-25 their files were named `npc_<role>_<name>`).
 */
export const ROLE_CAST: Record<Role, string[]> = {
  reaper: ['saja'],
  burglar: ['dosu'],
  repair: ['gisu'],
  boss: ['daesung'],
  coworker: ['minho', 'jiwon'],
  maid: ['sunhee'],
  nanny: ['eunji'],
  client: ['sora', 'yuna'],
};
/** Faces a dweller has only if picked (the role characters'): never dealt out by id, so no one's face changes as they come. */
export const PICKED_ONLY = new Set(Object.values(ROLE_CAST).flat());

export function parseModel(file: string): ModelInfo | null {
  const m = NAME.exec(file);
  if (!m) return null;
  const name = m[3].toLowerCase();
  const kept = (name.startsWith('star_') ? 'star' : /^npc_(hair|garment|lite)_/.exec(name)?.[1]) as ModelInfo['kept'];
  return { file, gender: m[1].toLowerCase() as ModelInfo['gender'], stage: m[2].toLowerCase() as Stage, name, outfit: m[4]?.toLowerCase() as ModelInfo['outfit'], ...(kept ? { kept } : {}) };
}

let listing: Promise<ModelInfo[]> | null = null;
/** The characters there are (none outside the dev server). */
export function models(): Promise<ModelInfo[]> {
  if (!listing) {
    // The dev server lists models/ as it is; the program a build runs in lists what's installed.
    // Never from the browser's cache: what's installed changes (the student program once kept it a day).
    listing = fetch(import.meta.env.DEV ? '/__vrm/models' : `${import.meta.env.BASE_URL}models/index.json?t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((files: string[]) => files.map(parseModel).filter((m): m is ModelInfo => !!m).sort((a, b) => a.file.localeCompare(b.file)))
      .catch(() => []);
  }
  return listing;
}

/** Whether a role's visitor is played by this character (`ROLE_CAST`). */
export const playsRole = (m: ModelInfo, role: string | undefined) => !!role && m.stage === 'adult' && !!ROLE_CAST[role as Role]?.includes(m.name);

/**
 * The character a dweller is played by: one of their gender and life stage (a teen or elder borrows a
 * grown-up's when there's none of theirs), the face the player picked (`face`, a character's name)
 * or else picked by the dweller's id so it stays the same (not a `PICKED_ONLY` one). A visitor with a
 * role (`npcRole`) is played by the grown-up kept for it (`ROLE_CAST`; either gender if none of
 * theirs). Null when there's none (then the shape figure).
 */
export function modelFor(all: ModelInfo[], gender: 'female' | 'male', stage: Stage, id: number, role?: string, face?: string): { base: ModelInfo; scale: number } | null {
  // A star (game/stars.ts) is always their own character, at any age and in any role: at work they
  // come as a coworker, whose cast (민호, 지원) used to stand in for them.
  const star = face?.startsWith('star_') ? all.find((m) => m.kept === 'star' && !m.outfit && m.name === face && m.gender === gender) : undefined;
  if (star) return { base: star, scale: 1 };
  // The cast is grown up: a child or a teen who comes (a pupil, a nursery child) is dealt like anyone of that age.
  if (role && stage === 'adult') {
    const cast = all.filter((m) => !m.outfit && playsRole(m, role));
    const pool = cast.filter((m) => m.gender === gender).length ? cast.filter((m) => m.gender === gender) : cast;
    if (pool.length) return { base: pool[Math.abs(id) % pool.length], scale: 1 };
  }
  const everyday = all.filter((m) => !m.outfit && !m.kept && m.gender === gender);
  // Our own characters first: the VRoid samples (`sample_…`) only stand in where there's none.
  const ours = (ms: ModelInfo[]) => (ms.some((m) => !m.name.startsWith('sample')) ? ms.filter((m) => !m.name.startsWith('sample')) : ms);
  let at = everyday.filter((m) => m.stage === stage);
  let scale = 1;
  if (!at.length && (stage === 'teen' || stage === 'elder')) {
    at = everyday.filter((m) => m.stage === 'adult');
    scale = stage === 'teen' ? 0.95 : 0.98;
  }
  // A star's face (game/stars.ts) only when it's theirs, at any age (there is only the grown-up).
  const picked = face ? at.find((m) => m.name === face) ?? all.find((m) => m.kept === 'star' && !m.outfit && m.name === face && m.gender === gender) : undefined;
  const dealt = ours(at.filter((m) => !PICKED_ONLY.has(m.name)));
  if (!picked && !dealt.length) return null;
  return { base: picked ?? dealt[Math.abs(id) % dealt.length], scale };
}

/** The faces a dweller of the gender and stage can be played by (our own characters, the role characters' after them; not the samples). */
export function facesFor(all: ModelInfo[], gender: 'female' | 'male', stage: Stage): string[] {
  const at = (st: Stage) => all.filter((m) => !m.outfit && !m.kept && m.gender === gender && m.stage === st && !m.name.startsWith('sample'));
  const of = (st: Stage) => [...at(st).filter((m) => !PICKED_ONLY.has(m.name)), ...at(st).filter((m) => PICKED_ONLY.has(m.name))].map((m) => m.name);
  const own = of(stage);
  return own.length || (stage !== 'teen' && stage !== 'elder') ? own : of('adult');
}

/** The file for a character in an outfit (or a role's, `@reaper`…), if it has one. */
export function outfitFile(all: ModelInfo[], base: ModelInfo, outfit: Outfit | Role | undefined): string {
  if (!outfit) return base.file;
  return all.find((m) => m.outfit === outfit && m.name === base.name && m.gender === base.gender && m.stage === base.stage)?.file ?? base.file;
}

/**
 * Asked for with the characters' files, so a copy the browser kept from before they were remade
 * isn't used (2026-10-20: the student program had told WebView2 to keep them a day, and 서아's and
 * 태오's remade faces came mixed with old files; 3 for the NPCs' new faces, 4 for their bodies made again in VRoid, 2026-10-23; 5 when the
 * files became only their clothes and every stage got a full body, 2026-10-24; 6 for 태오's younger and
 * older bodies given his wolf cut, 2026-10-25). Raise it when characters are exported again.
 */
const MODELS_VERSION = 7;
const buffers = new Map<string, Promise<ArrayBuffer>>();
/**
 * A fresh copy of a character (each dweller needs its own skeleton); the file is fetched once. The `@`
 * of an outfit file stays as it is in the URL: the dev server doesn't find `%40`.
 */
export async function loadVRM(file: string): Promise<VRM> {
  let buf = buffers.get(file);
  if (!buf) {
    buf = fetch(`${import.meta.env.BASE_URL}models/${encodeURIComponent(file).replace(/%40/g, '@')}?v=${MODELS_VERSION}`).then((r) => {
      if (!r.ok) throw new Error(`${file}: ${r.status}`);
      return r.arrayBuffer();
    });
    buffers.set(file, buf);
    // A file that didn't come is asked for again next time, not remembered as failed.
    buf.catch(() => buffers.delete(file));
  }
  const loader = new GLTFLoader();
  loader.register((p) => new VRMLoaderPlugin(p));
  const gltf = await loader.parseAsync((await buf).slice(0), '');
  const vrm = gltf.userData.vrm as VRM;
  VRMUtils.removeUnnecessaryVertices(gltf.scene);
  VRMUtils.combineSkeletons(gltf.scene);
  VRMUtils.rotateVRM0(vrm);
  vrm.scene.traverse((o) => {
    o.frustumCulled = false;
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.castShadow = true;
    // Which character each material came from, for recolouring it once for all copies (vrmDress.ts).
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) mat.userData.file = file;
  });
  return vrm;
}
