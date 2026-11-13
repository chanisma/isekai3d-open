import type { FigureLook, Hair3D, Stage, Top3D } from '../dweller3d/figure';
import type { Bottom, Outfit as Top } from '../game/types';
import { modelFor, outfitFile, PICKED_ONLY, playsRole, type ModelInfo, type Outfit, type Role } from './vrm';
import type { Dress } from './vrmDress';
import { setFor, setOfFile } from './garments';

/**
 * A VRoid character playing a dweller as the dweller looks (docs/3d/02-cast.md §4): their skin, their hair
 * colour and style, and their top and bottom in their colours. A face can't change once exported,
 * so each character keeps theirs; the rest is put on at load. A hair style or a piece of clothing
 * the character hasn't got is taken from another character of the same life stage that wears it
 * (vrmDress.ts transplants it by bone name), and an outfit (pyjamas…) a character has no file for
 * is borrowed whole from one that has.
 */
export interface Wears {
  hair: Hair3D;
  top: Top;
  /** None under a dress. */
  bottom?: Bottom;
}

/**
 * What each of our characters wears in their own file (`<gender>-<stage>-<name>`). One missing
 * here is shown as it is, and lends nothing.
 */
export const WEARS: Record<string, Wears> = {
  'female-toddler-mina': { hair: 'twintails', top: 'dress' },
  'female-child-mina': { hair: 'bob', top: 'hoodie', bottom: 'shorts' },
  'female-teen-mina': { hair: 'twintails', top: 'uniform', bottom: 'skirt' },
  'female-adult-mina': { hair: 'bob', top: 'dress' },
  'female-elder-mina': { hair: 'bun', top: 'sweater', bottom: 'skirt' },
  'male-toddler-jiho': { hair: 'short', top: 'tee', bottom: 'pants' },
  'male-child-jiho': { hair: 'short', top: 'tee', bottom: 'shorts' },
  'male-teen-jiho': { hair: 'short', top: 'uniform', bottom: 'pants' },
  'male-adult-jiho': { hair: 'short', top: 'shirt', bottom: 'pants' },
  'male-elder-jiho': { hair: 'short', top: 'shirt', bottom: 'pants' },
  // The other faces (hana, seoa, dain; junho, woojin, taeo), each stage in its own hair and clothes.
  'female-toddler-hana': { hair: 'bob', top: 'tee', bottom: 'shorts' },
  'female-toddler-seoa': { hair: 'twintails', top: 'dress' },
  'female-toddler-dain': { hair: 'short', top: 'hoodie', bottom: 'pants' },
  'female-child-hana': { hair: 'ponytail', top: 'tee', bottom: 'skirt' },
  'female-child-seoa': { hair: 'long', top: 'dress' },
  'female-child-dain': { hair: 'bun', top: 'shirt', bottom: 'pants' },
  'female-teen-hana': { hair: 'long', top: 'hoodie', bottom: 'pants' },
  'female-teen-seoa': { hair: 'bob', top: 'tee', bottom: 'shorts' },
  'female-teen-dain': { hair: 'braids', top: 'sweater', bottom: 'skirt' },
  'female-adult-hana': { hair: 'long', top: 'shirt', bottom: 'pants' },
  'female-adult-seoa': { hair: 'ponytail', top: 'sweater', bottom: 'skirt' },
  'female-adult-dain': { hair: 'bun', top: 'jacket', bottom: 'pants' },
  'female-elder-hana': { hair: 'short', top: 'shirt', bottom: 'pants' },
  'female-elder-seoa': { hair: 'bob', top: 'jacket', bottom: 'pants' },
  'female-elder-dain': { hair: 'ponytail', top: 'dress' },
  // 지유 (2026-10-23): 처진 눈매, 짧은 단발.
  'female-toddler-jiyu': { hair: 'bob', top: 'tee', bottom: 'shorts' },
  'female-child-jiyu': { hair: 'bob', top: 'tee', bottom: 'pants' },
  'female-teen-jiyu': { hair: 'bob', top: 'tee', bottom: 'shorts' },
  'female-adult-jiyu': { hair: 'bob', top: 'hoodie', bottom: 'skirt' },
  'female-elder-jiyu': { hair: 'bob', top: 'shirt', bottom: 'pants' },
  'male-toddler-junho': { hair: 'spiky', top: 'hoodie', bottom: 'shorts' },
  'male-toddler-woojin': { hair: 'short', top: 'shirt', bottom: 'pants' },
  'male-toddler-taeo': { hair: 'wolf', top: 'tee', bottom: 'shorts' },
  'male-child-junho': { hair: 'spiky', top: 'hoodie', bottom: 'pants' },
  'male-child-woojin': { hair: 'short', top: 'shirt', bottom: 'pants' },
  'male-child-taeo': { hair: 'wolf', top: 'tee', bottom: 'pants' },
  'male-teen-junho': { hair: 'spiky', top: 'hoodie', bottom: 'pants' },
  'male-teen-woojin': { hair: 'short', top: 'tee', bottom: 'shorts' },
  'male-teen-taeo': { hair: 'wolf', top: 'jacket', bottom: 'pants' },
  'male-adult-junho': { hair: 'spiky', top: 'sweater', bottom: 'pants' },
  'male-adult-woojin': { hair: 'short', top: 'tee', bottom: 'shorts' },
  'male-adult-taeo': { hair: 'wolf', top: 'jacket', bottom: 'pants' },
  'male-elder-junho': { hair: 'short', top: 'sweater', bottom: 'pants' },
  'male-elder-woojin': { hair: 'short', top: 'shirt', bottom: 'pants' },
  'male-elder-taeo': { hair: 'wolf', top: 'jacket', bottom: 'pants' },
  // 민재 (2026-10-23): 넘긴 짧은 머리.
  'male-toddler-minjae': { hair: 'short', top: 'tee', bottom: 'shorts' },
  'male-child-minjae': { hair: 'spiky', top: 'hoodie', bottom: 'pants' },
  'male-teen-minjae': { hair: 'short', top: 'tee', bottom: 'pants' },
  'male-adult-minjae': { hair: 'spiky', top: 'hoodie', bottom: 'pants' },
  'male-elder-minjae': { hair: 'short', top: 'shirt', bottom: 'pants' },
  // The role characters (vrm.ts `ROLE_CAST`) lend their hair only: their clothes are what they're known by.
  // Hair only: 지호 with VRoid's short crop, 2026-10-19; since 2026-10-25 the files hold only the hair (their clothes, 지호's, aren't lent).
  'male-toddler-npc_hair_crop': { hair: 'crop', top: 'tee', bottom: 'pants' },
  'male-child-npc_hair_crop': { hair: 'crop', top: 'tee', bottom: 'shorts' },
  'male-teen-npc_hair_crop': { hair: 'crop', top: 'uniform', bottom: 'pants' },
  'male-adult-npc_hair_crop': { hair: 'crop', top: 'shirt', bottom: 'pants' },
  'male-elder-npc_hair_crop': { hair: 'crop', top: 'shirt', bottom: 'pants' },
  // 사자's and 순희's own clothes since 2026-10-25 (the robe and the maid dress are `@reaper`, `@maid`).
  'male-adult-saja': { hair: 'long', top: 'shirt', bottom: 'pants' },
  'male-adult-dosu': { hair: 'spiky', top: 'jacket', bottom: 'pants' },
  'male-adult-gisu': { hair: 'spiky', top: 'jacket', bottom: 'pants' },
  'male-adult-daesung': { hair: 'short', top: 'jacket', bottom: 'pants' },
  'male-adult-minho': { hair: 'short', top: 'shirt', bottom: 'pants' },
  'female-adult-sunhee': { hair: 'braids', top: 'sweater', bottom: 'skirt' },
  'female-adult-eunji': { hair: 'ponytail', top: 'hoodie', bottom: 'skirt' },
  'female-adult-jiwon': { hair: 'bob', top: 'shirt', bottom: 'pants' },
  'female-adult-yuna': { hair: 'bob', top: 'shirt', bottom: 'pants' },
  'female-adult-sora': { hair: 'long', top: 'shirt', bottom: 'shorts' },
  // The role characters younger and older (2026-10-25): their face set and a VRoid hair like theirs on
  // 미나's or 지호's project of the stage, in its clothes (so those aren't offered again, `ROLE_CLOTHES`).
  'female-toddler-sora': { hair: 'long', top: 'dress' },
  'female-child-sora': { hair: 'long', top: 'hoodie', bottom: 'shorts' },
  'female-teen-sora': { hair: 'long', top: 'uniform', bottom: 'skirt' },
  'female-elder-sora': { hair: 'long', top: 'sweater', bottom: 'skirt' },
  'female-toddler-yuna': { hair: 'bob', top: 'dress' },
  'female-child-yuna': { hair: 'bob', top: 'hoodie', bottom: 'shorts' },
  'female-teen-yuna': { hair: 'bob', top: 'uniform', bottom: 'skirt' },
  'female-elder-yuna': { hair: 'bob', top: 'sweater', bottom: 'skirt' },
  'female-toddler-jiwon': { hair: 'bun', top: 'dress' },
  'female-child-jiwon': { hair: 'bun', top: 'hoodie', bottom: 'shorts' },
  'female-teen-jiwon': { hair: 'bun', top: 'uniform', bottom: 'skirt' },
  'female-elder-jiwon': { hair: 'bun', top: 'sweater', bottom: 'skirt' },
  'female-toddler-sunhee': { hair: 'bun', top: 'dress' },
  'female-child-sunhee': { hair: 'bun', top: 'hoodie', bottom: 'shorts' },
  'female-teen-sunhee': { hair: 'bun', top: 'uniform', bottom: 'skirt' },
  'female-elder-sunhee': { hair: 'bun', top: 'sweater', bottom: 'skirt' },
  'female-toddler-eunji': { hair: 'ponytail', top: 'dress' },
  'female-child-eunji': { hair: 'ponytail', top: 'hoodie', bottom: 'shorts' },
  'female-teen-eunji': { hair: 'ponytail', top: 'uniform', bottom: 'skirt' },
  'female-elder-eunji': { hair: 'ponytail', top: 'sweater', bottom: 'skirt' },
  'male-toddler-daesung': { hair: 'short', top: 'tee', bottom: 'pants' },
  'male-child-daesung': { hair: 'short', top: 'tee', bottom: 'shorts' },
  'male-teen-daesung': { hair: 'short', top: 'uniform', bottom: 'pants' },
  'male-elder-daesung': { hair: 'short', top: 'shirt', bottom: 'pants' },
  'male-toddler-dosu': { hair: 'spiky', top: 'tee', bottom: 'pants' },
  'male-child-dosu': { hair: 'spiky', top: 'tee', bottom: 'shorts' },
  'male-teen-dosu': { hair: 'spiky', top: 'uniform', bottom: 'pants' },
  'male-elder-dosu': { hair: 'spiky', top: 'shirt', bottom: 'pants' },
  'male-toddler-minho': { hair: 'short', top: 'tee', bottom: 'pants' },
  'male-child-minho': { hair: 'short', top: 'tee', bottom: 'shorts' },
  'male-teen-minho': { hair: 'short', top: 'uniform', bottom: 'pants' },
  'male-elder-minho': { hair: 'short', top: 'shirt', bottom: 'pants' },
  'male-toddler-saja': { hair: 'long', top: 'tee', bottom: 'pants' },
  'male-child-saja': { hair: 'long', top: 'tee', bottom: 'shorts' },
  'male-teen-saja': { hair: 'long', top: 'uniform', bottom: 'pants' },
  'male-elder-saja': { hair: 'long', top: 'shirt', bottom: 'pants' },
  'male-toddler-gisu': { hair: 'spiky', top: 'tee', bottom: 'pants' },
  'male-child-gisu': { hair: 'spiky', top: 'tee', bottom: 'shorts' },
  'male-teen-gisu': { hair: 'spiky', top: 'uniform', bottom: 'pants' },
  'male-elder-gisu': { hair: 'spiky', top: 'shirt', bottom: 'pants' },
};

/**
 * Characters whose hair is another's of their stage (ours, 2026-10-19: the same hair meshes and
 * bones in their files), by `gender-stage-name`: the edit window numbers it once, as that one's.
 */
const SAME_HAIR: Record<string, string> = {
  ...Object.fromEntries((['toddler', 'child', 'teen', 'adult', 'elder'] as const).map((s) => [`female-${s}-sunhee`, 'jiwon'])),
  // The role characters' younger and older selves wear VRoid hairs some of ours have.
  'female-toddler-yuna': 'hana',
  'female-child-sora': 'seoa',
  'female-elder-yuna': 'seoa',
  'male-adult-daesung': 'jiho',
  'male-elder-junho': 'woojin',
  // 지유's short bob is VRoid's, as 어린이 미나's and 십대 서아's.
  'female-child-jiyu': 'mina',
  'female-teen-jiyu': 'seoa',
  // 민재's swept cut is 준호's as a child and grown up.
  'male-child-minjae': 'junho',
  'male-adult-minjae': 'junho',
  ...Object.fromEntries((['toddler', 'child', 'teen', 'adult', 'elder'] as const).map((s) => [`male-${s}-npc_hair_crop`, 'woojin'])),
};

/** The next best, in order, for one nobody of that stage has. */
const HAIR_NEAR: Record<Hair3D, Hair3D[]> = {
  short: ['crop', 'spiky', 'buzz', 'bob', 'wolf'],
  buzz: ['crop', 'short', 'spiky'],
  crop: ['short', 'buzz', 'spiky'],
  spiky: ['short', 'wolf', 'buzz'],
  wolf: ['curly', 'spiky', 'short'],
  curly: ['wolf', 'bob', 'short', 'spiky'],
  bob: ['short', 'curly', 'long'],
  long: ['ponytail', 'braids', 'bob', 'twintails'],
  ponytail: ['long', 'braids', 'bun', 'twintails'],
  twintails: ['ponytail', 'braids', 'long'],
  braids: ['ponytail', 'twintails', 'long', 'bun'],
  bun: ['ponytail', 'braids', 'bob', 'crop'],
};
const TOP_NEAR: Record<Top, Top[]> = {
  tee: ['shirt', 'hoodie', 'sweater'],
  shirt: ['tee', 'jacket', 'uniform'],
  hoodie: ['sweater', 'tee', 'jacket'],
  sweater: ['hoodie', 'tee', 'shirt'],
  jacket: ['shirt', 'hoodie', 'sweater'],
  uniform: ['shirt', 'jacket'],
  overalls: ['tee', 'shirt'],
  dress: [],
};
const BOTTOM_NEAR: Record<Bottom, Bottom[]> = { pants: ['shorts', 'skirt'], shorts: ['pants', 'skirt'], skirt: ['shorts', 'pants'] };

/** A character file's everyday key, `gender-stage-name` (WEARS, `FigureLook.wear`). */
export const modelKey = (m: ModelInfo) => `${m.gender}-${m.stage}-${m.name}`;

export function wearsOf(m: ModelInfo): Wears | undefined {
  if (WEARS[modelKey(m)]) return WEARS[modelKey(m)];
  // A garment set (garments.ts) wears its pieces; it has no hair (it never lends one).
  const set = m.kept === 'garment' ? setOfFile(m.file) : undefined;
  return set?.top ? { hair: 'short', top: set.top, ...(set.bottom ? { bottom: set.bottom } : {}) } : undefined;
}

const EVERYDAY: Top[] = ['tee', 'dress', 'hoodie', 'sweater', 'shirt', 'jacket', 'overalls', 'uniform'];
const everyday = (t: Top3D): t is Top => (EVERYDAY as string[]).includes(t);

/**
 * Someone of the stage and the dweller's gender who has `want` (or the next best): a head of the other
 * gender is another shape (a man's fringe comes down over a woman's eyes), and a man in a woman's
 * buns or bunches looked wrong, so hair is never borrowed across. `id` picks among several so that
 * not everyone borrows from the same one.
 */
function lender<T extends string>(all: ModelInfo[], base: ModelInfo, want: T, near: T[], has: (w: Wears) => T | undefined, id: number, clothes: boolean): ModelInfo | undefined {
  // Clothes from no role character (theirs are what they're known by) and no hair-only file (only a hair in it).
  // Nor a garment set's: those are bought and picked (garments.ts), never put on at random.
  const pool = all.filter((m) => !m.outfit && m.stage === base.stage && m.kept !== 'garment' && (!clothes || (!PICKED_ONLY.has(m.name) && m.kept !== 'hair')) && wearsOf(m));
  for (const w of [want, ...near]) {
    const pick = pool.filter((m) => has(wearsOf(m)!) === w && m.gender === base.gender);
    if (pick.length) return pick[Math.abs(id) % pick.length];
  }
  return undefined;
}

/**
 * Characters whose face was made again in VRoid after their outfit files were exported (ours,
 * 2026-10-19: 우진 and 태오 had come out with 준호's face, 서아 and 다인 with 하나's or each
 * other's; 우진, 태오 and 십대 지호 also got a shorter cut that shows their eyes, 태오 none
 * the ponytail): in an outfit they wear that file's clothes on their own model, so the new face
 * and hair show.
 * By name for every stage, or `stage-name` (다인's grown-up face was already her own).
 */
export const REFACED = new Set(['woojin', 'taeo', 'seoa', 'toddler-dain', 'child-dain', 'teen-dain', 'elder-dain', 'teen-jiho']);
const refaced = (m: ModelInfo) => REFACED.has(m.name) || REFACED.has(`${m.stage}-${m.name}`);
/**
 * Outfit files whose clothes don't sit on their character's everyday model: 우진's long yukata
 * shows the legs of his model (in shorts) through it, so he wears 준호's jinbei instead.
 */
const OUTFIT_SWAP: Record<string, string> = { 'male-adult-woojin@bathing.vrm': 'male-adult-junho@bathing.vrm' };

/**
 * Shoes worn instead of a file's own (ours: the grown-up men came out of VRoid in women's strappy
 * wedge sandals): a man's from another file of the stage, so they fit. Sneakers with the casual
 * clothes, loafers with slacks and a coat.
 */
export const SHOES_FROM: Record<string, string> = {
  'male-adult-jiho.vrm': 'male-adult-junho@athletic.vrm',
  'male-adult-woojin.vrm': 'male-adult-woojin@athletic.vrm',
  'male-adult-junho.vrm': 'male-adult-junho@formal.vrm',
  'male-adult-taeo.vrm': 'male-adult-taeo@formal.vrm',
  'male-adult-jiho@formal.vrm': 'male-adult-junho@formal.vrm',
};

/**
 * The pairs of shoes there are, by `gender-stage` (compared mesh and texture across the files,
 * 2026-11-01: 미나's, 하나's, 서아's and 다인's flats are one pair, so the list showed 신발 1–4 alike).
 * Each row is one pair: the first is the one offered, the others wear the same; a name with `@` is
 * that outfit file's pair (`@athletic`: sneakers). Role characters' (`ROLE_CLOTHES`) are added as before.
 */
const SHOE_PAIRS: Record<string, string[][]> = {
  'female-toddler': [['mina', 'hana', 'seoa', 'dain', 'jiyu']],
  'female-child': [['mina', 'hana', 'seoa', 'dain'], ['jiyu']],
  'female-teen': [['mina', 'hana', 'seoa', 'dain'], ['hana@athletic', 'dain@athletic', 'seoa@athletic'], ['mina@athletic'], ['jiyu', 'jiyu@athletic']],
  'female-adult': [['mina', 'hana', 'seoa', 'dain', 'sunhee'], ['hana@athletic', 'dain@athletic', 'mina@athletic', 'seoa@athletic'], ['jiyu@athletic', 'jiyu@formal'], ['jiyu', 'eunji'], ['hana@formal', 'dain@formal', 'seoa@formal']],
  'female-elder': [['mina', 'hana', 'seoa', 'dain'], ['jiyu']],
  'male-toddler': [['jiho', 'junho', 'woojin', 'taeo'], ['minjae']],
  'male-child': [['jiho', 'junho', 'woojin', 'taeo'], ['minjae']],
  'male-teen': [['jiho', 'junho', 'woojin', 'taeo'], ['junho@athletic', 'taeo@athletic', 'woojin@athletic'], ['jiho@athletic'], ['minjae', 'minjae@athletic']],
  // The grown men's own files have women's sandals, swapped by `SHOES_FROM`: 지호's and 우진's are one pair of sneakers, 준호's and 태오's one of loafers.
  'male-adult': [['jiho', 'woojin'], ['junho', 'taeo'], ['jiho@athletic'], ['minjae', 'minjae@athletic'], ['minjae@formal']],
  'male-elder': [['jiho', 'junho', 'woojin', 'taeo'], ['minjae']],
};
/** The pair a character's shoes are one of (`SHOE_PAIRS`), as offered: `female-adult-seoa` is `female-adult-mina`. */
export function shoePair(key: string): string {
  const [g, st, ...rest] = key.split('-');
  const row = SHOE_PAIRS[`${g}-${st}`]?.find((r) => r.includes(rest.join('-')));
  return row ? `${g}-${st}-${row[0]}` : key;
}

/**
 * The file and dressing a dweller is shown in, played by `base`: `look` is the dweller as they look now
 * (`figureLook`, in what they've changed into), `changed` that outfit if any.
 */
export function dressFor(all: ModelInfo[], base: ModelInfo, look: FigureLook, changed: Outfit | undefined, id: number, opts: Pick<Played, 'eyes' | 'tints'> = {}): { file: string; dress: Dress } {
  const out = dressing(all, base, look, changed, id, opts);
  // The shoes they'd have on (theirs, or those of the outfit borrowed), swapped for a pair that suits.
  const to = SHOES_FROM[out.dress.shoes?.from ?? out.file];
  if (to && all.some((m) => m.file === to)) out.dress.shoes = { ...out.dress.shoes, from: to };
  if (!changed && look.shirtPrint && shownKinds(all, base, out.dress).top === 'tee') out.dress.shirtPrint = look.shirtPrint;
  return out;
}

function dressing(all: ModelInfo[], base: ModelInfo, look: FigureLook, changed: Outfit | undefined, id: number, opts: Pick<Played, 'eyes' | 'tints'>): { file: string; dress: Dress } {
  const own = wearsOf(base);
  const dress: Dress = { skin: look.skin, ...(opts.eyes ? { eyes: opts.eyes } : {}) };
  // Hair: the one picked (by whose it is), theirs, or one of that style from someone else, in the dweller's colour.
  const chosen = look.hairFrom ? all.find((m) => !m.outfit && m.gender === base.gender && m.stage === base.stage && m.name === look.hairFrom && wearsOf(m)) : undefined;
  const hairFrom = chosen ?? (own && own.hair !== look.hairStyle ? lender(all, base, look.hairStyle, HAIR_NEAR[look.hairStyle], (w) => w.hair, id, false) : undefined);
  const swap = hairFrom && hairFrom.file !== base.file && (chosen || wearsOf(hairFrom)!.hair !== own!.hair);
  dress.hair = { color: look.hair, ...(swap ? { from: hairFrom.file } : {}) };
  const outfit = outfitFile(all, base, changed);
  const file = refaced(base) ? base.file : outfit;
  // The clothes they have on, each one of a character of their stage (ignored once they've grown out of it).
  const worn = (p: Garment) => {
    const key = look.wear?.[p];
    // A set either gender wears is cut on one (garments.ts): theirs to wear across.
    const m = key ? all.find((x) => !x.outfit && x.stage === base.stage && modelKey(x) === key && (x.gender === base.gender || !!setFor(x, base.gender, base.stage))) : undefined;
    return m && wearsOf(m) && (p !== 'bottoms' || wearsOf(m)!.bottom) ? m : undefined;
  };
  if (changed) {
    // Their own outfit file made before their face was made again: its clothes on their own model.
    if (outfit !== file) for (const p of ['tops', 'bottoms', 'shoes'] as const) dress[p] = { from: OUTFIT_SWAP[outfit] ?? outfit };
    // An outfit they have no file for: someone else's of their stage (and gender), whole.
    else if (file === base.file) {
      const them = all.filter((m) => m.outfit === changed && m.stage === base.stage && !PICKED_ONLY.has(m.name) && m.gender === base.gender);
      const other = them[Math.abs(id) % Math.max(1, them.length)];
      if (other) for (const p of ['tops', 'bottoms', 'shoes'] as const) dress[p] = { from: other.file };
    }
    return { file, dress };
  }
  if (!own || !everyday(look.top)) return { file, dress };
  // Their everyday clothes: the top (a dress takes the bottom with it), then the bottom.
  const topFrom = worn('tops') ?? (look.top === own.top ? base : lender(all, base, look.top, TOP_NEAR[look.top], (w) => w.top, id, true));
  if (topFrom && topFrom !== base) dress.tops = { from: topFrom.file };
  // A garment set (garments.ts) is designed in its own colours: worn as it is.
  if (topFrom?.kept !== 'garment') dress.tops = { ...dress.tops, color: look.shirt, ...(opts.tints?.tops?.some(Boolean) ? { parts: opts.tints.tops } : {}) };
  const topIs = topFrom ? wearsOf(topFrom)!.top : own.top;
  if (topIs === 'dress') {
    if (topFrom && topFrom !== base) dress.bottoms = { from: topFrom.file };
  } else {
    const want: Bottom = look.bottom === 'towel' ? 'pants' : look.bottom;
    // One with no bottoms of their own (사자) wears everyone's trousers.
    const basic = !own.bottom ? basicsFor(all, base).bottoms : undefined;
    const bottomFrom = worn('bottoms') ?? (own.bottom === want ? base : basic?.kind === want ? all.find((m) => !m.outfit && modelKey(m) === basic.from) : lender(all, base, want, BOTTOM_NEAR[want], (w) => w.bottom, id, true));
    // A dress of their own comes off for a top and bottom; with no bottom to put on, it stays.
    const parts = opts.tints?.bottoms?.some(Boolean) ? { parts: opts.tints.bottoms } : {};
    if (bottomFrom?.kept === 'garment') dress.bottoms = { from: bottomFrom.file };
    else if (bottomFrom && bottomFrom !== base) dress.bottoms = { from: bottomFrom.file, color: look.pants, ...parts };
    else if (bottomFrom === base) dress.bottoms = { color: look.pants, ...parts };
    else if (own.top === 'dress') delete dress.tops;
  }
  // A pair may be an outfit file's (`SHOE_PAIRS`, the sneakers of `@athletic`).
  const shoeKey = look.wear?.shoes;
  const shoes = shoeKey?.includes('@') ? all.find((x) => x.file === `${shoeKey}.vrm` && x.stage === base.stage && x.gender === base.gender) : worn('shoes');
  if (shoes && shoes !== base) dress.shoes = { from: shoes.file };
  if (look.shoeTint) dress.shoes = { ...dress.shoes, color: look.shoeTint };
  return { file, dress };
}

export type Garment = 'tops' | 'bottoms' | 'shoes';
/** A piece of clothing to own and wear (`garmentsFor`). */
export interface GarmentItem {
  key: string;
  piece: Garment;
  from: string;
  kind: Top | Bottom | 'shoes';
  /** A piece of a garment set (garments.ts): its id. */
  set?: string;
}

/**
 * The role characters' clothes offered with our other characters' (2026-10-23): those like no one's of their gender
 * and stage, mesh by mesh (지원's top is 하나's, her shoes and all of 은지's are 지유's, 민호's and
 * 기수's trousers 지호's and 준호's, 사자's slacks 지호's, 순희's shoes everyone's).
 */
const ROLE_CLOTHES: Record<string, Garment[]> = {
  'female-adult-sora': ['tops', 'bottoms', 'shoes'],
  'female-adult-yuna': ['tops', 'bottoms', 'shoes'],
  'female-adult-jiwon': ['bottoms'],
  'female-adult-sunhee': ['tops', 'bottoms'],
  'male-adult-daesung': ['tops', 'bottoms', 'shoes'],
  'male-adult-dosu': ['tops', 'bottoms', 'shoes'],
  'male-adult-minho': ['tops', 'shoes'],
  'male-adult-saja': ['tops'],
  'male-adult-gisu': ['tops', 'shoes'],
};

/**
 * The clothes a character could have on (ours, for the clothes shop and the wardrobe): each top,
 * bottom and pair of shoes of our characters of its gender and stage, and the role characters' that are like
 * none of those (`ROLE_CLOTHES`), keyed `piece@gender-stage-name`, in `WEARS` order.
 */
export function garmentsFor(all: ModelInfo[], base: ModelInfo): GarmentItem[] {
  const out: GarmentItem[] = [];
  const of = `${base.gender}-${base.stage}-`;
  const there = new Set(all.filter((m) => !m.outfit && !m.kept && (!PICKED_ONLY.has(m.name) || ROLE_CLOTHES[modelKey(m)])).map(modelKey));
  for (const p of ['tops', 'bottoms'] as const)
    for (const [k, w] of Object.entries(WEARS)) {
      if (!k.startsWith(of) || !there.has(k) || (ROLE_CLOTHES[k] && !ROLE_CLOTHES[k].includes(p))) continue;
      const kind = p === 'tops' ? w.top : w.bottom;
      if (kind) out.push({ key: `${p}@${k}`, piece: p, from: k, kind });
    }
  // Shoes pair by pair (each once), then the role characters' that are like none of those.
  const files = new Set(all.map((m) => m.file));
  const pairs = (SHOE_PAIRS[`${base.gender}-${base.stage}`] ?? []).map((r) => `${of}${r[0]}`);
  for (const k of pairs) if (files.has(`${k}.vrm`)) out.push({ key: `shoes@${k}`, piece: 'shoes', from: k, kind: 'shoes' });
  for (const k of Object.keys(WEARS)) if (k.startsWith(of) && there.has(k) && ROLE_CLOTHES[k]?.includes('shoes') && !pairs.includes(shoePair(k))) out.push({ key: `shoes@${k}`, piece: 'shoes', from: k, kind: 'shoes' });
  // The garment sets they can wear (garments.ts), a piece each: after our characters' clothes.
  for (const m of all) {
    const set = setFor(m, base.gender, base.stage);
    if (!set) continue;
    const k = modelKey(m);
    for (const [p, kind] of [['tops', set.top], ['bottoms', set.bottom], ['shoes', 'shoes']] as const) if (kind) out.push({ key: `${p}@${k}`, piece: p, from: k, kind, set: set.id });
  }
  return out;
}

/**
 * What the clothes shop sells for an outfit tried on (2026-10-26, at the user's request): each new
 * everyday piece worn, and a set only whole — one piece of it on means all of its pieces not yet owned.
 */
export function shopBasket(garments: GarmentItem[], owned: ReadonlySet<string>, worn: readonly string[]): GarmentItem[] {
  const tried = garments.filter((g) => !owned.has(g.key) && worn.includes(g.key));
  const sets = new Set(tried.filter((g) => g.set).map((g) => g.set!));
  return [...tried.filter((g) => !g.set), ...garments.filter((g) => g.set && sets.has(g.set) && !owned.has(g.key))];
}

/** Everyone's own clothes, never a set's (garments.ts): what a new character picks from in 심 만들기; sets are bought at the shop. */
export function everydayGarmentsFor(all: ModelInfo[], base: ModelInfo): GarmentItem[] {
  return garmentsFor(all, base).filter((g) => !g.set);
}

/**
 * The clothes everyone has besides those they pick (ours, 2026-10-23), and what a new character
 * starts in: a tee, the first trousers and the first shoes of their gender and stage, in
 * `garmentsFor` order (the edit window's 티셔츠, 긴바지 1, 신발 1). Where no one of the stage wears
 * a tee (grown women, the elderly), the next best top.
 */
export function basicsFor(all: ModelInfo[], base: ModelInfo): Partial<Record<Garment, GarmentItem>> {
  const list = everydayGarmentsFor(all, base);
  const first = (p: Garment, kinds: string[]) => kinds.map((k) => list.find((g) => g.piece === p && g.kind === k)).find(Boolean);
  const out: Partial<Record<Garment, GarmentItem>> = { tops: first('tops', ['tee', ...TOP_NEAR.tee]), bottoms: first('bottoms', ['pants', ...BOTTOM_NEAR.pants]), shoes: list.find((g) => g.piece === 'shoes') };
  for (const p of ['tops', 'bottoms', 'shoes'] as const) if (!out[p]) delete out[p];
  return out;
}

/** The clothes (`garmentsFor` keys) a character dressed `dress` (by `dressFor`) is shown in. */
export function garmentsShown(all: ModelInfo[], base: ModelInfo, dress: Dress): Partial<Record<Garment, string>> {
  const at = (file: string | undefined) => {
    // Shoes swapped for a better pair are still the ones of the file they were put on for.
    const back = file && Object.keys(SHOES_FROM).find((k) => !k.includes('@') && SHOES_FROM[k] === file);
    const m = file ? all.find((x) => x.file === (back || file)) : base;
    return m && !m.outfit && wearsOf(m) ? modelKey(m) : undefined;
  };
  const top = at(dress.tops?.from);
  const wears = (key: string) => wearsOf(all.find((m) => !m.outfit && modelKey(m) === key)!);
  const topIs = top ? wears(top)?.top : undefined;
  const bottom = topIs === 'dress' ? undefined : at(dress.bottoms?.from);
  // Shoes may come from an outfit file (the sneakers of `@athletic`), named by file as `SHOE_PAIRS` does.
  const shoeFrom = dress.shoes?.from;
  const backTo = shoeFrom && Object.keys(SHOES_FROM).find((k) => !k.includes('@') && SHOES_FROM[k] === shoeFrom);
  const shoeKey = shoeFrom && !backTo && shoeFrom.includes('@') ? shoeFrom.replace(/\.vrm$/, '') : at(shoeFrom);
  return {
    ...(top ? { tops: `tops@${top}` } : {}),
    ...(bottom && wears(bottom)?.bottom ? { bottoms: `bottoms@${bottom}` } : {}),
    ...(shoeKey ? { shoes: `shoes@${shoePair(shoeKey)}` } : {}),
  };
}

/** What of a dweller picks their character beyond their look (Dweller.face, eyes; an NPC's role). */
export interface Played {
  id: number;
  face?: string;
  eyes?: string;
  tints?: { tops?: string[]; bottoms?: string[] };
  role?: string;
  /** Work clothes worn on the work lot (game/workClothes.ts): their set's pieces in its colours, or their own formal wear. */
  work?: import('../game/workClothes').WorkClothes | null;
}

/**
 * The character a dweller is shown as (`modelFor`), in which file, dressed how (`dressFor`) and at what
 * height; null when there's none of theirs (then the shape figure). A role's character (`ROLE_CAST`)
 * stays as it is when it comes for that role.
 */
export function castOf(all: ModelInfo[], look: FigureLook, who: Played, changed: Outfit | undefined): { file: string; dress: Dress; scale: number; base: ModelInfo } | null {
  const pick = modelFor(all, look.gender, look.stage, who.id, who.role, who.face);
  if (!pick) return null;
  // A star (game/stars.ts) is always as their file comes: their own clothes, hair and colours, whatever they do.
  if (pick.base.kept === 'star') return { file: pick.base.file, dress: {}, scale: pick.scale, base: pick.base };
  // A role's character on the visit as they are, in the role's clothes if they have them (사자's robe,
  // 순희's maid dress); a dweller given their face is dressed as any dweller. At work everyone is dressed for
  // the job: their own formal wear where a suit is the dress code, else the work clothes' set.
  const work = who.work;
  // Its own cut for the job (`npc_garment_<id>`), else the set's; file names are matched lower-case (parseModel).
  const garment = (n: string) => all.find((m) => m.kept === 'garment' && m.gender === pick.base.gender && m.stage === pick.base.stage && m.name === `npc_garment_${n.toLowerCase()}`);
  const set = work && work.set !== 'formal' ? garment(work.id) ?? garment(work.set) : undefined;
  const inRole = !work && playsRole(pick.base, who.role) ? outfitFile(all, pick.base, who.role as Role) : undefined;
  let worn = inRole ? { file: inRole !== pick.base.file ? inRole : outfitFile(all, pick.base, changed), dress: {} as Dress } : dressFor(all, pick.base, look, work?.set === 'formal' ? 'formal' : set ? undefined : changed, who.id, who);
  if (work && set) {
    const dress: Dress = { ...worn.dress };
    for (const p of work.pieces) dress[p] = { from: set.file, ...(work.tint?.[p] ? { color: work.tint[p] } : {}) };
    worn = { file: pick.base.file, dress };
  }
  // A grown-up in the bath wears the bathrobe (2026-10-25, at the user's request), barefoot: the robe's
  // file has only the robe, so its bottoms and shoes are none.
  const robe = !inRole && !work && changed === 'bathing' && (pick.base.stage === 'adult' || pick.base.stage === 'elder') ? all.find((m) => m.file === `${pick.base.gender}-${pick.base.stage}-npc_garment_robe.vrm`) : undefined;
  if (robe) worn = { file: pick.base.file, dress: { ...worn.dress, tops: { from: robe.file }, bottoms: { from: robe.file }, shoes: { from: robe.file } } };
  return { ...worn, scale: pick.scale * heightOf(who.id, look.stage), base: pick.base };
}

/**
 * The kinds of top and bottom a dweller dressed `dress` (by `dressFor`, played by `base`) is shown
 * in: theirs or the lender's, which may be only the next best to what the dweller wears.
 */
export function shownKinds(all: ModelInfo[], base: ModelInfo, dress: Dress): { top?: Top; bottom?: Bottom } {
  const of = (file: string | undefined) => {
    const m = file ? all.find((x) => x.file === file) : base;
    return m && wearsOf(m);
  };
  const top = of(dress.tops?.from)?.top;
  const dressed = top === 'dress' || (!dress.tops?.from && wearsOf(base)?.top === 'dress' && !dress.bottoms?.from);
  return { top, bottom: dressed ? undefined : of(dress.bottoms?.from)?.bottom };
}

/**
 * The hair styles, tops and bottoms a character can be shown in as they are, not as the next best
 * (`dressFor` borrows from those of the stage who have them): the edit window offers only these.
 * Undefined for one with no `WEARS` entry (shown as it is, so anything goes).
 */
export function choicesFor(all: ModelInfo[], base: ModelInfo, look: FigureLook): { hair: Hair3D[]; tops: Top[]; bottoms: Bottom[] } | undefined {
  const own = wearsOf(base);
  if (!own) return undefined;
  const hairOf = (d: Dress) => (d.hair?.from ? wearsOf(all.find((m) => m.file === d.hair!.from)!)?.hair : own.hair);
  const hair = (Object.keys(HAIR_NEAR) as Hair3D[]).filter((h) => hairOf(dressFor(all, base, { ...look, hairStyle: h }, undefined, 0).dress) === h);
  const tops = EVERYDAY.filter((t) => shownKinds(all, base, dressFor(all, base, { ...look, top: t }, undefined, 0).dress).top === t);
  // Bottoms under a top that isn't a dress (one they can wear, if any).
  const under: Top = look.top !== 'dress' && tops.includes(look.top as Top) ? (look.top as Top) : tops.find((t) => t !== 'dress') ?? 'tee';
  const bottoms = (Object.keys(BOTTOM_NEAR) as Bottom[]).filter((b) => shownKinds(all, base, dressFor(all, base, { ...look, top: under, bottom: b }, undefined, 0).dress).bottom === b);
  return { hair, tops, bottoms };
}

/**
 * The hair a character can be shown in, each by whose it is (`FigureLook.hairFrom`): those of its
 * gender and stage in `WEARS` order, each hair once. The edit window numbers them, as a style's
 * name told too little (one 단발 isn't another) or too much (a character's hair is its own).
 */
export function hairsFor(all: ModelInfo[], base: ModelInfo): string[] {
  const of = `${base.gender}-${base.stage}-`;
  const there = new Set(all.filter((m) => !m.outfit).map((m) => `${m.gender}-${m.stage}-${m.name}`));
  return Object.keys(WEARS)
    .filter((k) => k.startsWith(of) && there.has(k) && !SAME_HAIR[k])
    .map((k) => k.slice(of.length));
}

/**
 * The hairs numbered as the faces are numbered (2026-11-01, at the user's request): hair N is face N's,
 * every face has one even where it's the same as another's (`SAME_HAIR`), and any hair of no face comes after.
 */
export function hairsByFace(all: ModelInfo[], base: ModelInfo, faces: string[]): string[] {
  const of = `${base.gender}-${base.stage}-`;
  const own = faces.filter((f) => WEARS[`${of}${f}`] && all.some((m) => !m.outfit && m.name === f && m.gender === base.gender && m.stage === base.stage));
  return [...own, ...hairsFor(all, base).filter((h) => !own.includes(h))];
}

/** Whose file the hair of a character dressed `dress` comes from, not merged with those alike (for `hairsByFace`). */
export function hairOwner(all: ModelInfo[], base: ModelInfo, dress: Dress): string {
  return (dress.hair?.from ? all.find((x) => x.file === dress.hair!.from) ?? base : base).name;
}

/** Whose hair (of `hairsFor`) a character dressed `dress` is shown in. */
export function hairShown(all: ModelInfo[], base: ModelInfo, dress: Dress): string {
  const m = dress.hair?.from ? all.find((x) => x.file === dress.hair!.from) ?? base : base;
  return SAME_HAIR[`${m.gender}-${m.stage}-${m.name}`] ?? m.name;
}

/** A little taller or shorter, dweller by dweller (±3%), so a household isn't all one height. */
export function heightOf(id: number, stage: Stage): number {
  const k = ((Math.imul(Math.abs(id) + 1, 0x9e3779b1) >>> 0) >>> 16) % 7;
  return 1 + (k - 3) * (stage === 'toddler' ? 0.006 : 0.01);
}
