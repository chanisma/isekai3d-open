import { colleagueHome } from './colleagues';
import type { Gender } from './gender';
import type { SkillKey } from './types';
import type { Townie } from './visitors';

/**
 * Stars (ours, 2026-10-25, at the user's request): three named people who turn up at work like the
 * leads of a drama — 루미나 the celebrity, 서이안 the surgeon, 윤자인 the special-forces captain —
 * each played by a VRoid Hub character of their own (models/*-star_*.vrm, worn always as the file
 * comes: vrmLooks `castOf`; credited in the settings). Each has a fixed name, personality and
 * competencies, works in a field of jobs (`careers`), and belongs to the first dweller of the household
 * to work in one: from then on they're on that dweller's work lot and in that dweller's work episodes
 * (episodes.ts), and nobody else's. 루미나 is a friend at most (no romance, no moving in); the other
 * two can become anything a colleague can, family included.
 */
export interface Star {
  id: string;
  /** Their VRoid file's name (models/<gender>-adult-<face>.vrm). */
  face: string;
  name: string;
  gender: Gender;
  /** What they are at work, beside their name. */
  title: string;
  careers: string[];
  /** Can become one of the household (move in, be played); else a friend at most. */
  playable: boolean;
  traits: string[];
  /** What they like and dislike, as who they are (2026-11-01, at the user's request; preferences.ts). */
  likes: string[];
  dislikes: string[];
  skills: Partial<Record<SkillKey, number>>;
  /** Who they are, for the episode writer and the panel. */
  persona: string;
  /** The model's author and title, for the credits (their licence asks for it). */
  credit: string;
}

export const STARS: Star[] = [
  {
    id: 'lumina',
    face: 'star_lumina',
    name: '루미나',
    gender: 'female',
    title: '톱스타',
    careers: ['actor', 'singer', 'entertainer', 'dancer', 'model', 'tvHost', 'filmmaker', 'styleInfluencer', 'socialMedia', 'streamer', 'makeupArtist', 'photographer', 'fashionDesigner', 'announcer', 'voiceActor', 'dj'],
    playable: false,
    traits: ['selfAssured', 'creative', 'sensitive'],
    // The stage and the music, and off camera someone honest to talk to properly; shop talk, the rough, and the kitchen she's hopeless in.
    likes: ['singing', 'dancing', 'music', 'topic_deep', 'people_honest'],
    dislikes: ['topic_work', 'people_rough', 'cooking'],
    skills: { charisma: 9, singing: 9, dancing: 8, creativity: 7, empathy: 4 },
    persona: '무지개빛 머리의 국민 아이돌 겸 배우. 무대 위에선 완벽하고 당당하지만 카메라가 꺼지면 서툴고 솔직해요. 계산 없이 대해 주는 진짜 친구를 몰래 찾고 있어요.',
    credit: 'Lumina — mercie (VRoid Hub)',
  },
  {
    id: 'ian',
    face: 'star_ian',
    name: '서이안',
    gender: 'male',
    title: '외과 전문의',
    careers: ['doctor', 'nurse', 'paramedic', 'pharmacist', 'labTechnician', 'radiographer', 'physicalTherapist', 'occupationalTherapist', 'dentist', 'koreanMedicine', 'careWorker', 'dietitian'],
    playable: true,
    traits: ['genius', 'perfectionist', 'empathetic'],
    // Study and exactness, and a quiet word that means something; no idle jokes, no carelessness.
    likes: ['science', 'studying', 'reading', 'topic_deep', 'people_tidy'],
    dislikes: ['topic_jokes', 'people_laidBack', 'mischief'],
    skills: { medicine: 9, logic: 8, science: 7, empathy: 6, selfControl: 7 },
    persona: '대학병원 최연소 외과 전문의. 안경 너머로 모든 걸 꿰뚫어 보는 천재로, 말수가 적고 차가워 보이지만 환자 앞에서는 누구보다 다정해요. 실수를 용서하지 않지만 자기 자신에게 가장 엄격해요.',
    credit: 'Savi doctor — siroihakumai (VRoid Hub)',
  },
  {
    id: 'jain',
    face: 'star_jain',
    name: '윤자인',
    gender: 'female',
    title: '특전사 대위',
    careers: ['military', 'police', 'firefighter', 'coastGuard', 'bodyguard', 'securityGuard', 'correctionsOfficer', 'secretAgent'],
    playable: true,
    traits: ['active', 'loyal', 'fair'],
    // The body and the road, those she can trust; little time for chatter, tricks or the fussy, people before rules.
    likes: ['fitness', 'swimming', 'driving', 'people_honest', 'topic_work'],
    dislikes: ['topic_smallTalk', 'topic_pranks', 'people_tidy'],
    skills: { fitness: 9, leadership: 7, resilience: 8, selfControl: 8, driving: 6 },
    persona: '특전사 최초의 여성 팀장. 무뚝뚝하고 단호해서 웃는 얼굴을 보기 힘들지만, 동료는 끝까지 지키는 의리파예요. 규칙보다 사람을 먼저 생각하다 상부와 부딪치기도 해요.',
    credit: 'Zainab-Chan — mimenn_ (VRoid Hub)',
  },
];

export const STAR_BY_ID: Record<string, Star> = Object.fromEntries(STARS.map((s) => [s.id, s]));
/** Their ids: one each, clear of colleagues (800s, 2000s), clients (5000+) and townies. */
export const STAR_ID: Record<string, number> = { lumina: 4901, ian: 4902, jain: 4903 };

/** The star for a job, if one works in its field. */
export function starsOfCareer(careerId: string): Star[] {
  return STARS.filter((s) => s.careers.includes(careerId));
}

/** A star as a townie at work in `careerId` (their colleague record, off the street). */
export function starTownie(star: Star, careerId: string, now: number): Townie {
  return {
    id: STAR_ID[star.id],
    name: star.name,
    gender: star.gender,
    face: star.face,
    // For the shape figure, where the 3D characters aren't installed.
    shirt: star.id === 'lumina' ? '#f8bbd0' : star.id === 'ian' ? '#fafafa' : '#263238',
    skin: '#f8e0d0',
    hair: star.id === 'lumina' ? '#ce93d8' : '#26262b',
    hairStyle: star.gender === 'female' ? 'long' : 'short',
    outfit: star.id === 'lumina' ? 'dress' : star.id === 'ian' ? 'shirt' : 'jacket',
    traits: [...star.traits],
    likes: [...star.likes],
    dislikes: [...star.dislikes],
    skills: { ...star.skills },
    home: colleagueHome(careerId),
    role: star.title,
    job: { careerId, level: 6 },
    stageStart: now,
    workmate: { careerId, slot: 100 },
    star: star.id,
  };
}
