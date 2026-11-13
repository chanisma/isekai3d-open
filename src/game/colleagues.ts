import { CAREER_BY_ID } from './careers';
import { drawGoal } from './colleagueLife';
import { HAIR_COLORS, SHIRT_COLORS, SKIN_COLORS } from './constants';
import { pickName, type Gender } from './gender';
import { BOTTOMS, PANTS_COLORS } from './looks';
import { randomPreferences } from './preferences';
import { placeColleague } from './workRoles';
import { drawTraits } from './traits';
import type { Townie } from './visitors';
import type { WorkplaceDef } from './workplace';
import { coworkerId } from './workplace';

/**
 * The people a dweller works with (ours, 2026-10-25, at the user's request — "everyone at work looked the
 * same in every game, and it wasn't clear how close you were"): each game draws its own colleagues
 * for a workplace the first time someone works there — a name, a face (one of our VRoid characters),
 * hair, everyday clothes, traits and likes — and keeps them. They are townies who live off the street
 * (`workmate`, home `work:<career>`): the relationships panel lists them, they can be phoned and
 * invited over, dated and asked to move in like a neighbour, but the street's own life (who marries
 * whom on the street, who moves into which house) leaves them out. At work they wear the rank's work
 * clothes (workClothes.ts); they come and go in their own.
 *
 * Their ids are the workplace's old fixed coworker ids (`coworkerId`), so a save's friendships carry
 * over; someone who moved in is replaced by a newcomer with a fresh id.
 */
export const COLLEAGUE_FACES: Record<Gender, string[]> = {
  female: ['mina', 'hana', 'seoa', 'dain', 'jiyu', 'eunji', 'jiwon', 'sora', 'yuna', 'sunhee'],
  male: ['jiho', 'junho', 'woojin', 'taeo', 'minjae', 'minho', 'daesung', 'dosu', 'gisu', 'saja'],
};

const WOMEN_HAIR = ['long', 'bob', 'ponytail', 'bun', 'curly', 'braids', 'short'] as const;
const MEN_HAIR = ['short', 'crop', 'wolf', 'spiky', 'buzz', 'curly'] as const;

export const colleagueHome = (careerId: string) => `work:${careerId}`;
/** A townie who is someone's colleague, not a neighbour on the street. */
export const isColleague = (t: Pick<Townie, 'workmate'>) => !!t.workmate;

/** A boss's title from the workplace's spec («김지훈 팀장» → 팀장). */
function titleOf(specName: string): string {
  const parts = specName.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

/** One colleague of the workplace's slot `i`, drawn for this game. */
export function drawColleague(def: WorkplaceDef, i: number, id: number, rng: () => number, taken: readonly string[], now: number): Townie {
  const spec = def.coworkers[i];
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rng() * xs.length)];
  const gender: Gender = rng() < 0.5 ? 'female' : 'male';
  const name = pickName(gender, taken, rng());
  const title = spec.boss ? titleOf(spec.name) : '';
  const career = CAREER_BY_ID[def.careerId];
  const traits = drawTraits(rng);
  const top = (career?.levels.length ?? 1) - 1;
  const outfit = gender === 'female' ? pick(['tee', 'dress', 'shirt', 'sweater', 'jacket', 'hoodie'] as const) : pick(['tee', 'shirt', 'sweater', 'jacket', 'hoodie'] as const);
  const drawn: Townie = {
    id,
    name: title ? `${name} ${title}` : name,
    gender,
    face: pick(COLLEAGUE_FACES[gender]),
    shirt: pick(SHIRT_COLORS),
    skin: pick(SKIN_COLORS),
    hair: pick(HAIR_COLORS.slice(0, -1)),
    hairStyle: gender === 'female' ? pick(WOMEN_HAIR) : pick(MEN_HAIR),
    outfit,
    bottom: gender === 'female' ? pick(BOTTOMS.map(([b]) => b)) : pick(['pants', 'pants', 'shorts'] as const),
    pants: pick(PANTS_COLORS),
    traits,
    goal: drawGoal(rng),
    home: colleagueHome(def.careerId),
    role: spec.boss ? title || '상사' : '동료',
    job: { careerId: def.careerId, level: spec.boss ? top : spec.staff ? 0 : Math.min(top, 1 + Math.floor(rng() * 3)) },
    stageStart: now,
    workmate: { careerId: def.careerId, slot: i, ...(spec.boss ? { boss: true } : {}), ...(spec.staff ? { staff: spec.staff } : {}) },
    ...randomPreferences(rng, { traits, skill: career?.skill }),
  };
  // The pilot's careers put them on a rung that fits their place (workRoles.ts); others keep the draw above.
  placeColleague(def, drawn);
  return drawn;
}

/**
 * The workplace's colleagues for this game, drawn the first time and kept in the townies. A slot left
 * empty (its colleague moved in with the household) gets a newcomer, with the old id if it's free.
 */
export function colleaguesFor(def: WorkplaceDef, townies: Townie[], rng: () => number, now: number, inUse: (id: number) => boolean, freshId: () => number): Townie[] {
  // (Stars, stars.ts, work beside only the dweller they belong to.)
  const mine = () => townies.filter((t) => t.workmate?.careerId === def.careerId && !t.star && t.episodeOf === undefined);
  def.coworkers.forEach((_, i) => {
    if (mine().some((t) => t.workmate!.slot === i)) return;
    const id = coworkerId(def.careerId, i);
    townies.push(drawColleague(def, i, inUse(id) ? freshId() : id, rng, townies.map((t) => t.name.split(' ')[0]), now));
  });
  // An old save's colleagues come to the rung that fits too (workRoles.ts: the same answer every time).
  for (const t of mine()) placeColleague(def, t);
  // As the workplace lists them (the boss among them where it puts them).
  return mine().sort((a, b) => a.workmate!.slot - b.workmate!.slot);
}
