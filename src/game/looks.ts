import type { Expr, FigureLook, Stage, Top3D } from '../dweller3d/figure';
import type { Bottom, HairStyle, Outfit, Wear } from './types';

/**
 * Everything a dweller can look like (docs/ref-game/13-dweller3d.md): hair styles, tops and bottoms with their
 * colours, as Create a Dweller offers them; and how a dweller's look and what they have
 * changed into (참고 게임's outfit categories) become the 3D figure. The drawn 2D figure shows the newer
 * choices as the nearest it has.
 */
export const HAIR_STYLES: Array<[HairStyle, string]> = [
  ['short', '짧은 머리'],
  ['long', '긴 머리'],
  ['bob', '단발'],
  ['ponytail', '포니테일'],
  ['twintails', '양갈래'],
  ['braids', '땋은 머리'],
  ['bun', '올림머리'],
  ['curly', '곱슬'],
  ['spiky', '삐죽 머리'],
  ['crop', '스포츠 머리'],
  ['wolf', '울프컷'],
  ['buzz', '삭발'],
];
export const OUTFITS: Array<[Outfit, string]> = [
  ['tee', '티셔츠'],
  ['shirt', '셔츠'],
  ['hoodie', '후드티'],
  ['sweater', '스웨터'],
  ['jacket', '재킷'],
  ['uniform', '교복'],
  ['overalls', '멜빵바지'],
  ['dress', '원피스'],
];
/** The shoes' colours to pick from. */
export const SHOE_COLORS = ['#fafafa', '#eceff1', '#212121', '#5d4037', '#8d6e63', '#c9a77c', '#e53935', '#f06292', '#1e88e5', '#1a237e', '#43a047', '#fbc02d'];
export const BOTTOMS: Array<[Bottom, string]> = [
  ['pants', '긴바지'],
  ['shorts', '반바지'],
  ['skirt', '치마'],
];
/** What a garment costs at the clothes shop, by its kind (ours). */
export const CLOTHES_PRICE: Record<Outfit | Bottom | 'shoes', number> = {
  tee: 40,
  shirt: 60,
  hoodie: 60,
  sweater: 70,
  jacket: 100,
  uniform: 80,
  overalls: 60,
  dress: 90,
  pants: 50,
  shorts: 40,
  skirt: 50,
  shoes: 60,
};
export const PANTS_COLORS = ['#3e4a61', '#37474f', '#5d4037', '#8d6e63', '#2e7d32', '#1565c0', '#ad1457', '#eceff1'];
export const DEFAULT_PANTS = PANTS_COLORS[0];
/** Eye colours for the VRoid faces (the edit window); left out = the face's own. */
export const EYE_COLORS = ['#3b2418', '#7a4a24', '#a8742e', '#4f7a3a', '#2f6fae', '#6f8ea6', '#7b4fa0', '#a83a3a'];

/** The drawn figure's own hair styles, for the newer ones it doesn't draw. */
export function hair2d(style: HairStyle | undefined): 'short' | 'long' | 'bun' | 'curly' | 'buzz' {
  switch (style) {
    case 'ponytail':
    case 'twintails':
    case 'braids':
      return 'long';
    case 'bob':
    case 'spiky':
    case 'crop':
    case 'wolf':
    case undefined:
      return 'short';
    default:
      return style;
  }
}

export function stageOf(age: string | undefined): Stage {
  return age === 'toddler' || age === 'baby' ? 'toddler' : age === 'child' ? 'child' : age === 'teen' ? 'teen' : age === 'elder' ? 'elder' : 'adult';
}

interface LookOf {
  gender?: 'female' | 'male';
  age?: string;
  skin: string;
  hair: string;
  shirt: string;
  shirtPrint?: import('./shirtPrint').ShirtPrint | null;
  hairStyle?: HairStyle;
  hairFrom?: string;
  wear?: Wear;
  outfit?: Outfit;
  bottom?: Bottom;
  pants?: string;
  shoeColor?: string;
}

/** A dweller's 3D figure, in what they have changed into, if anything (pyjamas, sportswear, a towel, a suit). */
export function figureLook(s: LookOf, changed?: 'sleep' | 'athletic' | 'bathing' | 'formal'): FigureLook {
  const base: FigureLook = {
    gender: s.gender ?? 'female',
    stage: stageOf(s.age),
    skin: s.skin,
    hair: s.hair,
    hairStyle: s.hairStyle ?? 'short',
    ...(s.hairFrom ? { hairFrom: s.hairFrom } : {}),
    ...(s.wear ? { wear: s.wear } : {}),
    top: (s.outfit ?? 'tee') as Top3D,
    shirt: s.shirt,
    shirtPrint: changed ? undefined : s.shirtPrint ?? undefined,
    bottom: s.bottom ?? 'pants',
    pants: s.pants ?? DEFAULT_PANTS,
    shoes: s.shoeColor || '#3b3442',
    ...(s.shoeColor ? { shoeTint: s.shoeColor } : {}),
  };
  switch (changed) {
    case 'sleep':
      return { ...base, top: 'pajama', shirt: '#9fc5e8', bottom: 'pants', pants: '#9fc5e8', shoes: null };
    case 'athletic':
      return { ...base, top: 'sport', shirt: '#ef5350', bottom: 'shorts', pants: '#37474f', shoes: '#eceff1' };
    case 'bathing':
      return { ...base, top: 'bare', bottom: 'towel', shoes: null };
    case 'formal':
      return base.top === 'dress' ? { ...base, shirt: '#263238' } : { ...base, top: 'suit', shirt: '#263238', bottom: 'pants', pants: '#1c2329' };
    default:
      return base;
  }
}

export type { Expr };
