import type { SkillKey } from './types';

/**
 * Kinds of work after Holland's six interest types (RIASEC; the frame CareerNet's and O*NET's
 * interest tests sort jobs by), named by what one does rather than who one becomes (ours, for the
 * "하고 싶은 일 해 보기" aspirations: docs/ref-game/10-aspirations.md §4.3). Each job's types are our
 * reading of its field and competencies, the main one first.
 */
export type WorkType = 'R' | 'I' | 'A' | 'S' | 'E' | 'C';

export const WORK_TYPES: Record<WorkType, { label: string; icon: string; desc: string; skills: SkillKey[] }> = {
  R: { label: '만들고 고치는 일', icon: '🔧', desc: '손과 도구로 무언가를 만들고, 고치고, 움직이는 일', skills: ['handiness', 'cooking', 'gardening', 'fitness', 'driving'] },
  I: { label: '궁금한 걸 파고드는 일', icon: '🔬', desc: '관찰하고 실험하고 따져서 원리를 알아내는 일', skills: ['logic', 'science', 'medicine', 'programming', 'rocketScience'] },
  A: { label: '표현하는 일', icon: '🎨', desc: '그림·글·음악·몸짓으로 생각과 느낌을 나타내는 일', skills: ['painting', 'writing', 'photography', 'guitar', 'piano', 'singing', 'dancing', 'comedy'] },
  S: { label: '돕고 가르치는 일', icon: '🤝', desc: '사람을 돌보고, 가르치고, 마음을 살피는 일', skills: ['empathy', 'charisma', 'medicine'] },
  E: { label: '이끌고 설득하는 일', icon: '📣', desc: '목표를 세우고 사람을 모아 이끌고, 생각을 설득하는 일', skills: ['leadership', 'business', 'charisma', 'law'] },
  C: { label: '꼼꼼히 정리·관리하는 일', icon: '🗂️', desc: '자료·돈·규칙을 정확하게 정리하고 관리하는 일', skills: ['logic', 'business', 'law', 'writing'] },
};

export const CAREER_TYPES: Record<string, WorkType[]> = {
  // 참고 게임 careers and those after the expansions and mods
  astronaut: ['I', 'R'],
  athletic: ['R', 'E'],
  sales: ['E', 'C'],
  culinary: ['R', 'A'],
  entertainer: ['A', 'E'],
  painter: ['A'],
  secretAgent: ['I', 'E'],
  tech: ['I', 'C'],
  writer: ['A', 'I'],
  styleInfluencer: ['A', 'E'],
  doctor: ['I', 'S'],
  nurse: ['S', 'I'],
  police: ['S', 'R'],
  firefighter: ['R', 'S'],
  teacher: ['S', 'A'],
  lawyer: ['E', 'I'],
  architect: ['A', 'I'],
  vet: ['I', 'S'],
  fashionDesigner: ['A', 'R'],
  photographer: ['A'],
  hairStylist: ['A', 'R'],
  pilot: ['R', 'I'],
  scientist: ['I'],
  actor: ['A'],
  politician: ['E', 'S'],
  critic: ['A', 'I'],
  socialMedia: ['A', 'E'],
  military: ['R', 'E'],
  gardener: ['R', 'A'],
  engineer: ['I', 'R'],
  conservationist: ['I', 'R'],
  interiorDecorator: ['A', 'E'],
  salaryperson: ['E', 'C'],
  mortician: ['S', 'C'],
  dj: ['A', 'E'],
  dancer: ['A'],
  singer: ['A'],
  diplomat: ['E', 'S'],
  streamer: ['A', 'E'],
  extremeAthlete: ['R'],
  therapist: ['S', 'I'],
  filmmaker: ['A', 'E'],
  model: ['A'],
  toymaker: ['R', 'A'],
  baker: ['R', 'A'],
  dentist: ['I', 'R'],
  pharmacist: ['I', 'C'],
  banker: ['C', 'E'],
  accountant: ['C'],
  realEstate: ['E', 'C'],
  mechanic: ['R'],
  farmer: ['R'],
  graphicDesigner: ['A', 'I'],
  webtoonArtist: ['A'],
  hotelier: ['S', 'E'],
  tattooArtist: ['A', 'R'],
  tvHost: ['A', 'E'],
  proGamer: ['R', 'I'],
  // everyday Korean jobs
  civilServant: ['C', 'S'],
  mailCarrier: ['R', 'C'],
  correctionsOfficer: ['S', 'C'],
  coastGuard: ['R', 'S'],
  customsOfficer: ['C', 'I'],
  sanitationWorker: ['R'],
  socialWorker: ['S'],
  careWorker: ['S'],
  childcareTeacher: ['S', 'A'],
  disabilitySupport: ['S'],
  youthCounselor: ['S', 'E'],
  physicalTherapist: ['S', 'R'],
  occupationalTherapist: ['S', 'A'],
  labTechnician: ['I', 'C'],
  radiographer: ['I', 'S'],
  paramedic: ['S', 'R'],
  koreanMedicine: ['I', 'S'],
  dietitian: ['I', 'S'],
  optician: ['R', 'S'],
  academyTutor: ['S', 'E'],
  kindergartenTeacher: ['S', 'A'],
  musicTeacher: ['A', 'S'],
  drivingInstructor: ['S', 'R'],
  yogaInstructor: ['S', 'R'],
  courier: ['R'],
  busDriver: ['R', 'S'],
  taxiDriver: ['R', 'S'],
  subwayDriver: ['R', 'C'],
  seafarer: ['R', 'E'],
  electrician: ['R', 'I'],
  plumber: ['R'],
  carpenter: ['R', 'A'],
  welder: ['R'],
  wallpaperer: ['R', 'A'],
  elevatorTech: ['R', 'I'],
  fisher: ['R'],
  fishFarmer: ['R', 'I'],
  haenyeo: ['R'],
  forester: ['R', 'I'],
  convenienceManager: ['E', 'C'],
  insuranceAgent: ['E', 'S'],
  callCenter: ['S', 'C'],
  nailArtist: ['A', 'R'],
  esthetician: ['S', 'R'],
  makeupArtist: ['A', 'R'],
  bodyguard: ['R', 'E'],
  securityGuard: ['R', 'C'],
  // jobs students often dream of
  flightAttendant: ['S', 'E'],
  voiceActor: ['A'],
  announcer: ['A', 'S'],
  meteorologist: ['I', 'A'],
  semiconductor: ['I', 'R'],
  roboticist: ['R', 'I'],
  smartFarmer: ['R', 'I'],
  dataCenter: ['R', 'I'],
  aiResearcher: ['I', 'C'],
  selfDriving: ['I', 'R'],
  greenEnergy: ['R', 'I'],
  gameDeveloper: ['I', 'A'],
  interpreter: ['A', 'S'],
  librarian: ['C', 'S'],
  tourGuide: ['S', 'E'],
  weddingPlanner: ['E', 'A'],
  // part-time jobs
  barista: ['R', 'S'],
  fastFood: ['R', 'S'],
  retail: ['E', 'C'],
  babysitter: ['S'],
  manualLabor: ['R'],
};

export const typesOf = (careerId: string | undefined): WorkType[] => (careerId ? CAREER_TYPES[careerId] ?? [] : []);

/**
 * The kinds of work a trait leans towards (ours, for the career explorer: "this dweller is like this,
 * so this kind of job may suit them"), read from what the trait loves doing; Holland ties interest
 * types to personality the same way. Traits about needs, moods or misdeeds lean nowhere.
 */
export const TRAIT_TYPES: Record<string, WorkType[]> = {
  active: ['R'],
  lovesOutdoors: ['R'],
  foodie: ['R', 'A'],
  genius: ['I'],
  geek: ['I'],
  bookworm: ['I', 'A'],
  creative: ['A'],
  artLover: ['A'],
  musicLover: ['A'],
  goofball: ['A', 'S'],
  romantic: ['A'],
  outgoing: ['S', 'E'],
  cheerful: ['S'],
  good: ['S'],
  familyOriented: ['S'],
  loyal: ['S', 'C'],
  bro: ['S'],
  ambitious: ['E'],
  selfAssured: ['E'],
  materialistic: ['E', 'C'],
  neat: ['C'],
  perfectionist: ['C', 'A'],
  loner: ['I'],
};

/** The kinds of work a dweller's traits lean towards, the most-named first, each with the traits behind it. */
export function leaningsOf(traits: readonly string[]): Array<{ type: WorkType; traits: string[] }> {
  const by = new Map<WorkType, string[]>();
  for (const t of traits) for (const w of TRAIT_TYPES[t] ?? []) by.set(w, [...(by.get(w) ?? []), t]);
  return [...by].map(([type, ts]) => ({ type, traits: ts })).sort((a, b) => b.traits.length - a.traits.length);
}

/**
 * Things done at home that are each kind of work, for "trying it in daily life": interaction and
 * social ids (ours).
 */
export const TYPE_ACTIVITIES: Record<WorkType, string[]> = {
  R: ['repair', 'woodwork', 'cook', 'cookFamily', 'grill', 'grillFamily', 'plantSeeds', 'harvest', 'fish', 'workout'],
  I: ['read', 'stargaze', 'observeSkies', 'research', 'analyze', 'runExperiment', 'study', 'studyScience', 'studyMedicine', 'learnAnatomy', 'homework', 'playChess'],
  A: ['paint', 'writeBook', 'playGuitar', 'playPiano', 'playViolin', 'singKaraoke', 'dance', 'practiceComedy', 'takePhoto', 'joke'],
  S: ['deepTalk', 'hug', 'compliment', 'welcome', 'readStory', 'checkHomework', 'feedToddler', 'playWithToddler', 'teachTalk', 'teachWalk', 'firstAidPractice', 'outing_volunteer'],
  E: ['planGoals', 'presentationPractice', 'speech', 'playTycoon', 'economyNews', 'studyBusiness', 'hostParty'],
  C: ['payBills', 'washDishes', 'clean', 'studyLaw', 'studyBusiness', 'economyNews'],
};
