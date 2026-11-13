/**
 * Ways to die after 참고 게임 (DeathSuperInteraction death_* and the ghost traits trait_ghost_*,
 * whose Korean names these are). What triggers each death follows the game where its tuning is
 * readable (drowning: out of energy in the pool;
 * hunger: the motive failing); the emotional deaths' timer and the ghosts' colours are ours.
 * 참고 게임's death by electrocution is left out by choice: a shock only hurts and dazes here.
 */
export type DeathCause = 'oldAge' | 'hunger' | 'fire' | 'drown' | 'anger' | 'laughter' | 'embarrassment' | 'elderExhaustion';

export interface DeathInfo {
  /** The ghost trait's name (참고 게임 trait_ghost_*). */
  label: string;
  /** How it's announced while the dweller is dying. */
  dying: string;
  /** A ghost's tint (ours). */
  tint: string;
}

export const DEATHS: Record<DeathCause, DeathInfo> = {
  oldAge: { label: '노령으로 사망함', dying: '노환으로 숨을 거두고 있어요', tint: '#e0f2f1' },
  hunger: { label: '굶어서 사망함', dying: '굶주림으로 쓰러졌어요', tint: '#b39ddb' },
  fire: { label: '화재로 사망함', dying: '불길에 휩싸였어요', tint: '#ff8a65' },
  drown: { label: '물에 빠져 사망함', dying: '물에 빠졌어요', tint: '#4fc3f7' },
  anger: { label: '분노로 사망함', dying: '분노를 이기지 못하고 쓰러졌어요', tint: '#e57373' },
  laughter: { label: '너무 웃어서 사망함', dying: '웃음을 멈추지 못하고 쓰러졌어요', tint: '#f48fb1' },
  embarrassment: { label: '창피해서 사망함', dying: '참을 수 없이 창피해서 쓰러졌어요', tint: '#ffd54f' },
  elderExhaustion: { label: '과로로 사망함', dying: '무리하게 운동하다 쓰러졌어요', tint: '#aed581' },
};

/** How long the Grim Reaper waits before taking the soul, the time left to plead (ours). */
export const DYING_MINUTES = 20;
/** 참고 게임 grimReaper_Plead success_chance base 33%. */
export const PLEAD_CHANCE = 0.33;
/** Minutes at the top of Angry, Playful or Embarrassed before it kills (ours; 참고 게임 warns first). */
export const DEADLY_MOOD_MINUTES = 120;
/** The emotions that kill at their highest level (참고 게임 Enraged, Hysterical, Mortified). */
export const DEADLY_MOODS: Partial<Record<string, DeathCause>> = { angry: 'anger', playful: 'laughter', embarrassed: 'embarrassment' };

/** A household member who has died: remembered for their ghost (참고 게임 keeps them as ghosts in the urn). */
export interface DeadDweller {
  id: number;
  name: string;
  skin: string;
  hair: string;
  shirt: string;
  cause: DeathCause;
  at: number;
  urnUid?: number;
}
