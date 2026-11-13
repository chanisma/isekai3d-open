import { CAREER_TYPES, TYPE_ACTIVITIES, WORK_TYPES, type WorkType } from './careerTypes';
import { CAREERS } from './careers';
import { CATALOG } from './catalog';
import { SKILL_INFO } from './constants';
import { SOCIAL_BY_ID } from './socials';
import { VENUE_BY_ID } from './venues';

/**
 * What a kind of work (Holland's types, careerTypes.ts) is made of in the game, for the "하고 싶은
 * 일 해 보기" aspirations' goals ("…에 가까운 활동", "…에 필요한 역량", "…의 일터"): the activities
 * that count towards it (`TYPE_ACTIVITIES`), the skills it needs, and the jobs that are that kind
 * of work (`CAREER_TYPES`, any of a job's kinds counting a day there).
 */
export function workTypeGuide(type: WorkType): { activities: string[]; skills: string[]; jobs: string[] } {
  const label = (id: string): string | undefined => {
    if (id.startsWith('outing_')) return VENUE_BY_ID[id.slice(7)]?.name;
    if (id === 'hostParty') return '모임 열기';
    const social = SOCIAL_BY_ID[id];
    if (social) return social.label;
    // A home object's first, then one at work.
    const all = CATALOG.flatMap((d) => d.interactions ?? []).filter((x) => x.id === id);
    return (all.find((x) => x.requires !== 'atWork') ?? all[0])?.label;
  };
  const uniq = (xs: Array<string | undefined>) => [...new Set(xs.filter((x): x is string => !!x))];
  return {
    // "그릴에서 요리하기 (핫도그 여럿)" and the like once, without what's cooked.
    activities: uniq(TYPE_ACTIVITIES[type].map((id) => label(id)?.replace(/ \(.*\)$/, ''))),
    skills: uniq(WORK_TYPES[type].skills.map((k) => SKILL_INFO[k]?.label)),
    jobs: uniq(CAREERS.filter((c) => CAREER_TYPES[c.id]?.includes(type)).map((c) => c.name)),
  };
}
