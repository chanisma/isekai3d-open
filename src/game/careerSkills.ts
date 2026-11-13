import type { Career, CareerLevel } from './careers';
import { MINOR_SKILLS } from './constants';
import type { SkillKey } from './types';

/**
 * What each job asks of a dweller, rung by rung (ours; the game is also meant to let high-school
 * students feel which competencies a field rests on and what steady effort moves them up).
 *
 * Built in two layers, as the user asked: common competencies first (after Korea's NCS 직업기초능력
 * — 의사소통·수리·문제해결·대인관계·정보·기술·조직이해 — and CareerNet's aptitude types), then the
 * field's own competency where a common one can't stand in for it (medicine, science, law,
 * business, a foreign language, driving and piloting, and the arts and trades the game already had).
 *
 * Every ladder follows the same shape, so the lesson is the same in every field:
 * - the job's main competency, from the second rung, climbing to 10 at the top;
 * - a common base competency from the third rung (2 → 7);
 * - the branch's own competency once the dweller is in a branch (2 → 8);
 * - for branches that end in running people or a business, leadership or business on the last
 *   two rungs before the top (3, then 5).
 * The bottom rung and the top rung ask for nothing, as in 참고 게임.
 */
export interface BranchSkill {
  skill: SkillKey;
  /** What the top of the branch is about: leading people, or running a business. */
  top?: 'leadership' | 'business';
}

export interface SkillProfile {
  main: SkillKey;
  base: SkillKey;
  branches: BranchSkill[];
}

const p = (main: SkillKey, base: SkillKey, a: SkillKey | BranchSkill, b: SkillKey | BranchSkill): SkillProfile => ({
  main,
  base,
  branches: [typeof a === 'string' ? { skill: a } : a, typeof b === 'string' ? { skill: b } : b],
});
const lead = (skill: SkillKey): BranchSkill => ({ skill, top: 'leadership' });
const biz = (skill: SkillKey): BranchSkill => ({ skill, top: 'business' });

export const SKILL_PROFILES: Record<string, SkillProfile> = {
  // ---- 참고 게임 base careers (titles and hours stay 참고 게임's; the skills follow the job) ----
  astronaut: p('science', 'fitness', 'rocketScience', lead('driving')),
  athletic: p('fitness', 'charisma', lead('logic'), 'empathy'),
  sales: p('business', 'charisma', 'leadership', 'logic'),
  culinary: p('cooking', 'fitness', lead('gourmet'), biz('mixology')),
  entertainer: p('charisma', 'writing', 'piano', 'comedy'),
  painter: p('painting', 'charisma', 'writing', lead('business')),
  secretAgent: p('logic', 'language', lead('charisma'), lead('programming')),
  tech: p('programming', 'logic', lead('writing'), lead('business')),
  writer: p('writing', 'empathy', 'logic', lead('charisma')),
  styleInfluencer: p('charisma', 'photography', 'programming', biz('painting')),
  // ---- careers after the expansion packs and career mods ----
  doctor: p('medicine', 'science', lead('handiness'), lead('empathy')),
  nurse: p('medicine', 'empathy', 'leadership', 'handiness'),
  police: p('fitness', 'law', lead('logic'), lead('handiness')),
  firefighter: p('fitness', 'handiness', lead('driving'), lead('medicine')),
  teacher: { main: 'charisma', base: 'empathy', branches: [lead('writing'), lead('writing'), { skill: 'logic' }] },
  lawyer: p('law', 'writing', lead('logic'), biz('charisma')),
  architect: p('painting', 'logic', biz('programming'), lead('law')),
  vet: p('medicine', 'empathy', biz('handiness'), 'gardening'),
  fashionDesigner: p('painting', 'handiness', 'photography', lead('business')),
  photographer: p('photography', 'painting', lead('writing'), 'business'),
  hairStylist: p('handiness', 'painting', 'business', 'charisma'),
  pilot: p('driving', 'language', lead('logic'), 'fitness'),
  scientist: p('science', 'logic', lead('handiness'), 'writing'),
  actor: p('charisma', 'empathy', 'comedy', 'singing'),
  politician: p('charisma', 'law', 'leadership', lead('empathy')),
  critic: p('writing', 'logic', 'gourmet', 'painting'),
  socialMedia: p('programming', 'charisma', 'photography', biz('writing')),
  military: p('fitness', 'leadership', 'logic', 'handiness'),
  gardener: p('gardening', 'handiness', 'science', biz('painting')),
  engineer: p('science', 'logic', lead('programming'), lead('handiness')),
  conservationist: p('gardening', 'science', lead('law'), 'fishing'),
  interiorDecorator: p('painting', 'charisma', biz('handiness'), lead('business')),
  salaryperson: p('charisma', 'programming', 'leadership', 'logic'),
  mortician: p('empathy', 'handiness', biz('charisma'), 'medicine'),
  dj: p('djMixing', 'charisma', 'fitness', biz('piano')),
  dancer: p('dancing', 'fitness', 'charisma', 'leadership'),
  singer: p('singing', 'charisma', 'dancing', 'language'),
  diplomat: p('language', 'charisma', lead('law'), lead('logic')),
  streamer: p('charisma', 'programming', 'videoGaming', 'comedy'),
  extremeAthlete: p('fitness', 'logic', 'handiness', 'leadership'),
  therapist: p('empathy', 'charisma', 'science', 'painting'),
  filmmaker: p('writing', 'photography', 'leadership', 'logic'),
  model: p('charisma', 'fitness', 'dancing', 'photography'),
  toymaker: p('handiness', 'painting', 'business', 'programming'),
  baker: p('cooking', 'logic', 'painting', 'business'),
  dentist: p('medicine', 'handiness', 'logic', 'science'),
  pharmacist: p('medicine', 'science', 'business', lead('logic')),
  banker: p('business', 'logic', 'leadership', 'language'),
  accountant: p('logic', 'business', lead('writing'), biz('law')),
  realEstate: p('business', 'charisma', 'law', lead('logic')),
  mechanic: p('handiness', 'logic', 'driving', 'business'),
  farmer: p('gardening', 'fitness', 'science', 'business'),
  graphicDesigner: p('painting', 'programming', biz('charisma'), 'logic'),
  webtoonArtist: p('painting', 'writing', 'empathy', 'programming'),
  hotelier: p('empathy', 'language', lead('business'), 'cooking'),
  tattooArtist: p('painting', 'handiness', 'charisma', 'medicine'),
  tvHost: p('charisma', 'writing', 'comedy', lead('logic')),
  proGamer: p('videoGaming', 'logic', 'fitness', 'leadership'),
  // ---- everyday Korean jobs ----
  civilServant: p('law', 'writing', lead('charisma'), lead('logic')),
  mailCarrier: p('fitness', 'driving', 'logic', 'charisma'),
  correctionsOfficer: p('law', 'fitness', lead('logic'), 'empathy'),
  coastGuard: p('fitness', 'law', 'medicine', lead('driving')),
  customsOfficer: p('law', 'language', 'logic', 'fitness'),
  sanitationWorker: p('fitness', 'driving', 'handiness', 'science'),
  socialWorker: p('empathy', 'law', lead('charisma'), 'writing'),
  careWorker: p('empathy', 'medicine', 'cooking', 'fitness'),
  childcareTeacher: p('empathy', 'painting', lead('charisma'), 'medicine'),
  disabilitySupport: p('empathy', 'fitness', 'medicine', 'handiness'),
  youthCounselor: p('empathy', 'fitness', 'leadership', 'charisma'),
  physicalTherapist: p('medicine', 'fitness', lead('empathy'), 'handiness'),
  occupationalTherapist: p('medicine', 'handiness', 'empathy', 'painting'),
  labTechnician: p('science', 'medicine', lead('logic'), 'writing'),
  radiographer: p('science', 'medicine', 'programming', 'empathy'),
  paramedic: p('medicine', 'fitness', lead('driving'), 'handiness'),
  koreanMedicine: p('medicine', 'gardening', biz('empathy'), 'science'),
  dietitian: p('cooking', 'science', 'leadership', 'medicine'),
  optician: p('handiness', 'science', 'business', 'medicine'),
  academyTutor: p('charisma', 'logic', 'writing', 'business'),
  kindergartenTeacher: p('empathy', 'charisma', 'leadership', 'business'),
  musicTeacher: p('piano', 'empathy', 'business', 'violin'),
  drivingInstructor: p('driving', 'charisma', 'law', 'business'),
  yogaInstructor: p('fitness', 'empathy', 'medicine', 'business'),
  courier: p('fitness', 'driving', 'charisma', lead('logic')),
  busDriver: p('driving', 'charisma', 'fitness', 'leadership'),
  taxiDriver: p('driving', 'charisma', 'language', 'business'),
  subwayDriver: p('driving', 'logic', lead('fitness'), lead('programming')),
  seafarer: p('driving', 'language', 'leadership', lead('law')),
  electrician: p('handiness', 'science', lead('fitness'), 'programming'),
  plumber: p('handiness', 'fitness', biz('charisma'), 'science'),
  carpenter: p('handiness', 'painting', lead('logic'), 'business'),
  welder: p('handiness', 'fitness', lead('logic'), 'science'),
  wallpaperer: p('handiness', 'painting', biz('charisma'), biz('logic')),
  elevatorTech: p('handiness', 'science', lead('fitness'), 'law'),
  fisher: p('fishing', 'fitness', lead('driving'), 'business'),
  fishFarmer: p('fishing', 'science', 'programming', 'business'),
  haenyeo: p('fishing', 'fitness', lead('logic'), 'charisma'),
  forester: p('gardening', 'fitness', lead('science'), 'charisma'),
  convenienceManager: p('business', 'charisma', 'leadership', 'logic'),
  insuranceAgent: p('business', 'charisma', lead('empathy'), 'law'),
  callCenter: p('empathy', 'charisma', 'leadership', 'programming'),
  nailArtist: p('painting', 'handiness', 'charisma', 'business'),
  esthetician: p('handiness', 'empathy', 'medicine', 'business'),
  makeupArtist: p('painting', 'charisma', 'business', 'handiness'),
  bodyguard: p('fitness', 'law', lead('driving'), lead('charisma')),
  securityGuard: p('fitness', 'law', lead('charisma'), 'programming'),
  // ---- jobs students often dream of ----
  flightAttendant: p('empathy', 'language', 'leadership', 'medicine'),
  voiceActor: p('charisma', 'empathy', 'comedy', 'writing'),
  announcer: p('charisma', 'writing', lead('logic'), 'empathy'),
  meteorologist: p('science', 'logic', 'charisma', lead('programming')),
  semiconductor: p('logic', 'programming', lead('science'), lead('handiness')),
  roboticist: p('handiness', 'programming', lead('logic'), lead('science')),
  smartFarmer: p('gardening', 'programming', lead('science'), lead('logic')),
  dataCenter: p('programming', 'handiness', lead('logic'), lead('science')),
  aiResearcher: p('programming', 'logic', lead('science'), lead('writing')),
  selfDriving: p('programming', 'logic', lead('science'), lead('handiness')),
  greenEnergy: p('handiness', 'logic', lead('science'), lead('fitness')),
  gameDeveloper: p('programming', 'videoGaming', lead('logic'), lead('writing')),
  interpreter: p('language', 'writing', biz('charisma'), 'logic'),
  librarian: p('logic', 'writing', lead('charisma'), 'programming'),
  tourGuide: p('charisma', 'language', 'empathy', lead('business')),
  weddingPlanner: p('charisma', 'business', biz('painting'), 'leadership'),
};

/** Every competency a career's ladder asks for. */
export function profileSkills(careerId: string): Set<SkillKey> | undefined {
  const p = SKILL_PROFILES[careerId];
  if (!p) return undefined;
  return new Set<SkillKey>([p.main, p.base, ...p.branches.flatMap((b) => (b.top ? [b.skill, b.top] : [b.skill]))]);
}

/**
 * What a piece of work trains, or a work gamble leans on, in a given job (ours): the job's main
 * and base competencies, and the dweller's own branch's, stay as they are; anything else counts
 * towards the main competency (a doctor's diagnosing is medicine, a bus driver's route is driving,
 * a clerk's certificates are law).
 */
export function jobSkill(careerId: string | undefined, key: SkillKey, branch?: number): SkillKey {
  const p = careerId ? SKILL_PROFILES[careerId] : undefined;
  if (!p) return key;
  const b = branch === undefined ? undefined : p.branches[branch];
  const keep = key === p.main || key === p.base || (b && (key === b.skill || key === b.top));
  return keep ? key : p.main;
}

/** Rung k of an n-rung ladder whose first s rungs are shared: the competencies asked for to leave it. */
export function needsFor(profile: SkillProfile, branch: number | undefined, k: number, n: number, s: number): Array<[SkillKey, number]> | undefined {
  if (k <= 0 || k >= n - 1) return undefined;
  const cap = (key: SkillKey, v: number) => Math.max(1, Math.min(Math.round(v), MINOR_SKILLS.has(key) ? 5 : 10));
  const want = new Map<SkillKey, number>();
  const add = (key: SkillKey, v: number) => want.set(key, Math.max(want.get(key) ?? 0, cap(key, v)));
  add(profile.main, 2 + ((k - 1) * 8) / Math.max(1, n - 3));
  if (k >= 2) add(profile.base, Math.min(7, 2 + ((k - 2) * 5) / Math.max(1, n - 4)));
  const b = branch === undefined ? undefined : profile.branches[branch];
  if (b && k >= s) {
    add(b.skill, Math.min(8, 2 + ((k - s) * 6) / Math.max(1, n - 2 - s)));
    if (b.top && k >= n - 3) add(b.top, k === n - 2 ? 5 : 3);
  }
  return [...want.entries()];
}

/** A career with its ladder's needs rebuilt from its competency profile (unchanged without one). */
export function withProfile(c: Career): Career {
  const profile = SKILL_PROFILES[c.id];
  if (!profile || !c.branches?.length) return c;
  const s = c.levels.length;
  const relevel = (levels: CareerLevel[], branch: number | undefined, offset: number, n: number) =>
    levels.map((l, i) => {
      const needs = needsFor(profile, branch, offset + i, n, s);
      const { needs: _old, ...rest } = l;
      return needs ? { ...rest, needs } : rest;
    });
  return {
    ...c,
    skill: profile.main,
    levels: relevel(c.levels, undefined, 0, s + Math.max(...c.branches.map((b) => b.levels.length))),
    branches: c.branches.map((b, i) => ({ ...b, levels: relevel(b.levels, i, s, s + b.levels.length) })),
  };
}
