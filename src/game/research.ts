import { FEARS, FEAR_BY_ID, type FearId } from './fears';
import { TRAIT_BY_ID } from './traits';

/**
 * 연구 노트 (2026-10-26, at the user's request): what in the 특징 tab comes from research — the
 * fears and how they work, and the traits taken from personality psychology — told twice: how it
 * goes in the game, and what the research says about real people (with what one might try). Shown
 * by ResearchNotes.tsx; the research behind each is in docs/ref-game/16-fears.md and docs/ref-game/04 §3.6.
 */

export type NoteGroup = 'how' | 'fear' | 'trait';
export const NOTE_GROUP_LABEL: Record<NoteGroup, string> = { how: '두려움의 원리', fear: '두려움', trait: '성격 특성' };

export interface ResearchNote {
  id: string;
  group: NoteGroup;
  icon: string;
  label: string;
  /** How it goes in the game. */
  game: string[];
  /** What the research says. */
  real: string[];
  /** What one might try in real life. */
  tips: string[];
  sources: string[];
}

const HOW: ResearchNote[] = [
  {
    id: 'how_ladder',
    group: 'how',
    icon: '🪜',
    label: '두려움의 세기와 사다리',
    game: [
      '두려움에는 세기가 있어요: 약함 → 보통 → 강함.',
      '아무것도 하지 않고 3일이 지나거나, 같은 일을 또 겪으면 한 단계 커져요.',
      '이겨내는 길을 끝까지 걸으면 한 단계 내려오고(🪜 조금 덜 무서워졌어), 약함에서 끝까지 가면 사라져요.',
      '셀수록 무드렛이 더 무겁게(×1.5, ×2), 더 자주 찾아오고, 배우기·근무 같은 데 주는 영향도 커져요(10% → 15% → 20%).',
    ],
    real: [
      '심리학에서는 두려운 상황을 0~100점으로 매겨 쉬운 것부터 어려운 것까지 «두려움 사다리(위계)»를 만들고, 아래 칸부터 하나씩 마주하는 «점진적 노출»을 써요. 오래전부터 가장 근거가 많은 방법 가운데 하나예요.',
      '피하면 그 순간은 편하지만, «피했더니 괜찮았다»는 경험이 쌓여 두려움이 오히려 오래가고 커지기 쉬워요. 마주하면서 «생각보다 괜찮네»를 배우는 것이 두려움을 줄여요(억제 학습).',
    ],
    tips: ['두려운 상황을 쉬운 것부터 5~10개 적어 사다리를 만들어 보세요.', '맨 아래 칸을 여러 번 해서 익숙해지면 한 칸 올라가요.', '불안은 버티면 저절로 내려가요. 너무 빨리 자리를 뜨지 않는 것이 요령이에요.'],
    sources: ['Wolpe (1958) 체계적 둔감화', 'Craske et al. (2014), Behaviour Research and Therapy — 노출 치료와 억제 학습', 'Mowrer (1960) 2요인 이론 — 회피가 두려움을 유지함', 'Hertfordshire Partnership NHS CAMHS, «Graded exposure» 안내서'],
  },
  {
    id: 'how_avoid',
    group: 'how',
    icon: '🧭',
    label: '피하기와 마주하기 (자율의지)',
    game: [
      '두려움이 있는 심은 스스로 움직일 때 그 두려움과 관련된 일을 피하려 해요. 셀수록 더 피해요(×0.8 → ×0.6 → ×0.4).',
      '회복탄력성이 3이면 피하지도 다가가지도 않고, 6 이상이면 오히려 용기를 내어 마주하러 가요(최대 ×1.6). 마주하는 것이 곧 이겨내는 길이에요.',
      '예외로 «실력이 들통날까 봐»는 피하지 않고 일 연습을 지나치게 많이 해요.',
      '두려움이 있으면 친한 사람과의 깊은 대화를 더 찾아요(털어놓기).',
    ],
    real: [
      '스트레스에 대처하는 방식은 크게 «회피»(생각하지 않기, 자리 피하기)와 «접근»(문제를 알아보고 다가가기)으로 나눌 수 있어요. 잠깐의 회피는 숨 돌리는 데 도움이 되지만, 오래 피하기만 하면 문제가 그대로 남아요.',
      '마음의 회복력이 높은 사람은 힘든 상황을 «감당할 수 있는 도전»으로 보는 경향이 있어요.',
    ],
    tips: ['피하고 싶을 때 «지금 피하면 다음엔 더 쉬워질까, 어려워질까?»를 스스로 물어보세요.', '완전히 마주하기 어렵다면 아주 작은 부분만 해 보는 것도 접근이에요.'],
    sources: ['Roth & Cohen (1986), American Psychologist — 접근·회피 대처', 'Lazarus & Folkman (1984), Stress, Appraisal, and Coping'],
  },
  {
    id: 'how_talk',
    group: 'how',
    icon: '💬',
    label: '털어놓기와 들어 주기',
    game: [
      '가족이나 친한 사람(우정 30 이상)과 깊은 대화가 잘 되면, 모든 두려움이 하루에 한 번 1/3만큼 가벼워져요.',
      '«👂 고민 들어주기»로 다른 사람의 걱정을 들어 줄 수 있어요. 공감·배려와 화술이 높을수록 더 많이 덜어 주고, 자율의지로도 먼저 다가가요.',
    ],
    real: [
      '믿을 만한 사람이 곁에 있다고 느끼는 것만으로도 스트레스가 몸과 마음에 주는 영향이 줄어든다는 «완충 효과»가 여러 연구에서 확인됐어요.',
      '들어 주는 사람은 해결책보다 «그랬구나, 힘들었겠다»처럼 마음을 알아주는 것이 더 도움이 될 때가 많아요.',
    ],
    tips: ['걱정을 한 사람에게라도 말해 보세요. 말로 꺼내면 생각이 정리돼요.', '친구가 고민을 말하면 끝까지 듣고, 섣불리 판단하지 않기.', '마음이 오래 힘들면 선생님·상담 선생님·보호자, 또는 청소년상담 1388에 이야기할 수 있어요.'],
    sources: ['Cohen & Wills (1985), Psychological Bulletin — 사회적 지지의 스트레스 완충 가설'],
  },
  {
    id: 'how_resilience',
    group: 'how',
    icon: '🌱',
    label: '회복탄력성과 자기 연민',
    game: [
      '회복탄력성이 한 레벨 오를 때마다 모든 두려움이 1/3만큼 가벼워져요.',
      '두려움을 이겨내면 «두려움 극복!»(자신감, 12시간)이 붙고 회복탄력성이 자라요. 이겨낸 두려움의 수도 남아요.',
      '회복탄력성이 높을수록 두려움을 피하지 않고 마주하러 가요.',
    ],
    real: [
      '청소년 연구를 모은 메타분석에서, 자기 자신에게 친절한 «자기 연민»이 높을수록 불안·우울 같은 마음의 고통이 낮았어요. 자기 연민은 사회적 불안과도 반대로 관련돼요.',
      '어려움을 이겨낸 경험은 «다음에도 해낼 수 있다»는 자기 효능감을 키워요.',
    ],
    tips: ['실수했을 때 친한 친구에게 해 줄 말을 나에게도 해 주세요.', '오늘 해낸 작은 일 세 가지를 적어 보세요.'],
    sources: ['Marsh, Chan & MacBeth (2018), Mindfulness — 청소년 자기 연민 메타분석', 'Bandura (1977) 자기 효능감'],
  },
];

/** What research says about each fear, and what one might try (docs/ref-game/16-fears.md). */
const FEAR_REAL: Record<FearId, { real: string[]; tips: string[]; sources: string[] }> = {
  dark: {
    real: ['어둠에 대한 두려움은 어린 시절에 가장 흔하고, 자라면서 대부분 줄어들어요. 어른에게도 조금 남는 일은 흔하고 자연스러워요.'],
    tips: ['익숙한 곳에서 불을 조금씩 줄여 보며 적응해 보세요.', '무서운 생각이 들면 «지금 실제로 위험한 게 있나?»를 확인해요.'],
    sources: ['Gullone (2000), Clinical Psychology Review — 아동·청소년 두려움의 발달', '참고 게임 «Wants & Fears»(게임 원작)'],
  },
  fire: {
    real: ['위험한 일을 겪은 뒤 비슷한 상황에서 몸이 먼저 긴장하는 것은 우리를 지키려는 자연스러운 반응이에요. 대처법을 알면 «내가 통제할 수 있다»는 느낌이 생겨 불안이 줄어요.'],
    tips: ['소화기 위치와 사용법, 대피 경로를 알아 두세요.', '보호자와 함께 간단한 요리부터 다시 해 보세요.'],
    sources: ['참고 게임 «Wants & Fears»(게임 원작)', '통제감과 불안: Barlow (2002), Anxiety and Its Disorders'],
  },
  burgled: {
    real: ['안 좋은 일을 겪은 뒤 한동안 안전이 걱정되고 잠이 잘 안 오는 것은 흔한 반응이에요. 대부분 시간이 지나고 안전하다는 경험이 쌓이며 나아져요.'],
    tips: ['문단속 같은 안전 점검을 습관으로 만들면 마음이 놓여요.', '걱정을 가족과 이야기하세요.'],
    sources: ['참고 게임 «Wants & Fears»(게임 원작)'],
  },
  failure: {
    real: ['실패를 두려워하는 마음은 «창피함, 나에 대한 실망, 다른 사람의 실망»에 대한 걱정이 합쳐진 거예요. 이 두려움이 크면 도전을 미루거나 피하게 돼요.', '능력은 노력으로 자란다고 믿는 «성장 마인드셋»을 가진 학생은 실패를 배움의 기회로 보는 경향이 있어요.'],
    tips: ['목표를 아주 작게 쪼개서 «성공 경험»을 쌓아 보세요.', '실패했을 때 «무엇을 배웠지?»를 한 줄 적어 보세요.'],
    sources: ['Conroy, Willow & Metzler (2002), Journal of Applied Sport Psychology — 실패 공포 척도(PFAI)', 'Atkinson (1957) 성취 동기 이론', 'Dweck (2006), Mindset'],
  },
  deadEndJob: {
    real: ['일에서 성장하고 있다는 느낌, 내 일이 의미 있다는 느낌은 일에 대한 만족과 의욕에 큰 영향을 줘요. 오랫동안 제자리라고 느끼는 «경력 정체»는 의욕을 떨어뜨려요.'],
    tips: ['지금 하는 일에서 배우고 싶은 것 하나를 정해 보세요.', '선배나 선생님께 다음 단계로 가려면 무엇이 필요한지 물어보세요.'],
    sources: ['Hackman & Oldham (1976) 직무 특성 모델', 'Ference, Stoner & Warren (1977) 경력 정체', '참고 게임 «Wants & Fears»(게임 원작)'],
  },
  judged: {
    real: ['다른 사람이 나를 나쁘게 평가할까 봐 걱정하는 마음은 청소년기에 커지고 정점에 이르는 경우가 많아요. 자라면서 다른 사람의 눈을 의식하게 되는 자연스러운 과정이에요.', '우리는 다른 사람이 나를 실제보다 훨씬 많이 지켜본다고 착각해요(«스포트라이트 효과»).'],
    tips: ['«다른 사람들은 생각보다 나에게 관심이 적다»는 걸 떠올려 보세요.', '편한 한두 명과의 대화부터 시작해요.'],
    sources: ['Watson & Friend (1969) 부정적 평가에 대한 두려움', 'Westenberg et al. (2004); Sumter, Bokhorst & Westenberg (2009) — 청소년기 사회적 평가 두려움', 'Gilovich, Medvec & Savitsky (2000), Journal of Personality and Social Psychology — 스포트라이트 효과'],
  },
  crowded: {
    real: ['사람이 많은 것(밀도)과 «너무 붐빈다»는 느낌(혼잡감)은 달라요. 내가 상황을 조절할 수 있다고 느끼면 같은 인원이라도 덜 답답해요.'],
    tips: ['사람이 많은 곳에서는 잠깐 쉴 조용한 자리를 미리 알아 두세요.', '익숙한 사람과 함께 가면 훨씬 편해요.'],
    sources: ['Stokols (1972), Psychological Review — 밀도와 혼잡감의 구분', '참고 게임 «Wants & Fears»(게임 원작)'],
  },
  unfulfilled: {
    real: ['사람은 «되고 싶은 나»의 모습을 그리며 움직여요. 그 목표에 조금씩 다가가고 있다고 느낄 때 삶의 만족이 커진다는 연구가 있어요.'],
    tips: ['큰 꿈을 이번 주에 할 수 있는 한 가지로 바꿔 보세요.', '꿈은 바뀌어도 괜찮아요. 지금 끌리는 것을 기록해 보세요.'],
    sources: ['Markus & Nurius (1986) 가능한 자기', 'Brunstein (1993), Journal of Personality and Social Psychology — 목표 진척과 행복', '참고 게임 «Wants & Fears»(게임 원작)'],
  },
  lonely: {
    real: ['사람에게는 소속되고 싶은 기본 욕구가 있어요. 외로움은 «사람이 필요해»라는 몸과 마음의 신호예요.', '외로움이 길어지면 오히려 다른 사람의 거절에 예민해져 먼저 다가가기 어려워질 수 있어요. 그래서 작은 연결부터 시작하는 것이 중요해요.'],
    tips: ['친구 수보다 마음 터놓을 사람 한두 명이 더 중요해요.', '오늘 한 사람에게 먼저 짧은 안부를 건네 보세요.'],
    sources: ['Baumeister & Leary (1995), Psychological Bulletin — 소속 욕구', 'Cacioppo & Patrick (2008), Loneliness'],
  },
  future: {
    real: ['«모르는 것에 대한 두려움»은 여러 불안의 바탕에 있다고 보는 연구자들이 있어요. 진로가 막막할 때 불안한 것은 당연해요.', '진로 연구에서는 정답을 한 번에 찾기보다 관심 갖기, 알아보기, 시도하기를 거듭하며 «진로 적응력»을 키우는 것을 강조해요.'],
    tips: ['궁금한 직업 하나를 골라 하는 일과 필요한 역량을 찾아보세요.', '그 일을 하는 사람에게 질문해 보세요.'],
    sources: ['Carleton (2016), Journal of Anxiety Disorders — 모르는 것에 대한 두려움', 'Savickas & Porfeli (2012) 진로 적응력 척도'],
  },
  money: {
    real: ['돈은 여러 나라 조사에서 가장 흔한 스트레스 원인 가운데 하나로 꼽혀요.', '걱정되는 정보를 아예 보지 않으려는 «타조 효과»가 있어요. 고지서나 잔액을 피하면 잠시 편하지만 문제는 커져요.'],
    tips: ['용돈 기록을 한 달만 해 보면 돈의 흐름이 보여요.', '꼭 필요한 것과 갖고 싶은 것을 나눠 적어 보세요.'],
    sources: ['American Psychological Association, «Stress in America» 조사', 'Karlsson, Loewenstein & Seppi (2009), Journal of Risk and Uncertainty — 타조 효과'],
  },
  family: {
    real: ['한국 학생들은 국제 비교 조사(PISA)에서 학업과 관련된 불안이 높은 편으로 나타났어요. 가족의 기대를 생각하며 부담을 느끼는 것은 많은 학생이 겪는 일이에요.'],
    tips: ['부모님께 «나는 이만큼 노력하고 있다»와 «이런 점이 힘들다»를 함께 이야기해 보세요.', '결과보다 과정을 함께 이야기하면 서로의 기대를 맞추기 쉬워요.'],
    sources: ['OECD (2017), PISA 2015 Results Vol. III: Students’ Well-Being', '참고 게임 «Wants & Fears»(게임 원작)'],
  },
  stage: {
    real: ['사람들 앞에서 말하거나 공연하는 것은 가장 흔한 사회적 두려움이에요. 지역사회 조사에서 약 3명 중 1명이 발표할 때 지나치게 불안하다고 답했어요.', '음악가처럼 무대에 익숙한 사람도 «공연 불안»을 자주 겪어요.', '긴장을 «설렘»으로 다시 이름 붙이면 실제 발표·노래 수행이 나아졌다는 실험이 있어요.'],
    tips: ['거울 앞 → 가족 앞 → 친구 몇 명 앞처럼 청중을 조금씩 늘려 연습해요.', '떨릴 때 «떨린다» 대신 «설렌다»라고 말해 보세요.', '내용을 충분히 연습하면 긴장이 줄어요.'],
    sources: ['Stein, Walker & Forde (1996), American Journal of Psychiatry — 지역사회의 발표 공포', 'Ruscio et al. (2008), Psychological Medicine — 사회적 두려움 조사', 'Kenny (2011), The Psychology of Music Performance Anxiety', 'Brooks (2014), Journal of Experimental Psychology: General — 불안을 설렘으로 재해석'],
  },
  imposter: {
    real: ['성공하고도 «운이 좋았을 뿐, 언젠가 실력이 들통날 것»이라고 느끼는 것을 «가면 현상(임포스터 현상)»이라고 해요. 병이 아니라 많은 사람이 겪는 경험이에요.', '연구를 모은 리뷰에서는 조사에 따라 9%에서 82%까지 이런 느낌을 겪는다고 보고됐어요. 새 역할을 맡거나 승진했을 때 특히 흔해요.', '들킬까 봐 지나치게 준비하거나 미루고, 잘되면 다시 «운» 덕분이라 여기는 고리가 반복되기 쉬워요.'],
    tips: ['칭찬이나 잘한 일을 «증거 노트»에 적어 두세요.', '믿을 만한 선배와 이 느낌을 이야기해 보세요. 그 사람도 겪었을 가능성이 커요.'],
    sources: ['Clance & Imes (1978), Psychotherapy: Theory, Research & Practice — 가면 현상', 'Bravata et al. (2020), Journal of General Internal Medicine — 체계적 리뷰'],
  },
  exam: {
    real: ['시험 불안은 학생들에게 흔하고, 불안이 클수록 성적이 조금 낮아지는 경향이 메타분석으로 확인됐어요. 걱정이 머릿속 «작업 공간»을 차지하기 때문이라고 설명해요.', '시험 직전에 걱정을 10분 동안 글로 적은 학생들의 성적이 나아졌다는 실험이 있어요.', '스스로 문제를 풀어 보며 떠올리는 연습(인출 연습)을 한 학생들이 시험 불안을 덜 느꼈다는 조사도 있어요.'],
    tips: ['벼락치기보다 며칠에 나눠 조금씩 공부해요.', '시험 전에 걱정을 종이에 적어 보세요.', '교과서를 다시 읽기보다 문제를 스스로 풀어 보세요.'],
    sources: ['von der Embse, Jester, Roy & Post (2018), Journal of Affective Disorders — 시험 불안 메타분석', 'Zeidner (1998), Test Anxiety: The State of the Art', 'Ramirez & Beilock (2011), Science — 걱정 글쓰기', 'Agarwal et al. (2014), Journal of Applied Research in Memory and Cognition — 인출 연습과 시험 불안'],
  },
  rejection: {
    real: ['거절을 예상하고 쉽게 알아채며 크게 반응하는 경향을 «거절 민감성»이라고 해요. 거절이 걱정되면 마음을 전하는 것 자체를 피하게 되기 쉬워요.', '따돌림을 당하는 실험에서 뇌의 일부 영역이 몸의 아픔과 비슷하게 반응했어요. 거절이 아픈 것은 자연스러운 일이에요.'],
    tips: ['거절은 «나라는 사람 전체»에 대한 평가가 아니라 그 순간의 사정일 때가 많아요.', '작은 부탁부터 해 보며 «거절당해도 괜찮다»는 경험을 쌓아 보세요.'],
    sources: ['Downey & Feldman (1996), Journal of Personality and Social Psychology — 거절 민감성', 'Eisenberger, Lieberman & Williams (2003), Science — 사회적 배제와 뇌'],
  },
};

const LEVEL_LINE = '약함 → 보통 → 강함으로 셀 수 있고, 이겨내는 길을 끝까지 걸을 때마다 한 단계씩 내려와요.';

function fearNote(id: FearId): ResearchNote {
  const d = FEAR_BY_ID[id];
  const r = FEAR_REAL[id];
  return {
    id: `fear_${id}`,
    group: 'fear',
    icon: d.icon,
    label: d.label,
    game: [
      `생기는 때: ${d.why}`,
      `영향: ${d.does}`,
      ...(d.shy ? [`자율의지: ${d.shy}${d.bold && d.bold !== d.shy ? ` (회복탄력성이 높으면 ${d.bold})` : ''}`] : []),
      `이겨내는 길: ${d.face}${d.also ? ` · ${d.also}` : ''} · 가까운 사람과 깊은 대화 · 회복탄력성 키우기`,
      LEVEL_LINE,
    ],
    ...r,
  };
}

/** The research behind each of the traits from personality psychology (traits.ts, docs/ref-game/04 §3.6). */
const TRAIT_REAL: Record<string, { game: string; real: string[]; tips: string[]; sources: string[] }> = {
  planner: {
    game: '목표 세우기·숙제·공과금을 스스로 잘 챙기고, 마치면 «계획대로 착착» 자신감이 붙어요. 절제력이 빨리 자라요.',
    real: ['성격 5요인 가운데 «성실성»의 질서·자기 통제 측면이에요. 성실성은 학업 성적과 일의 성과를 꾸준히 잘 예측하는 성격 특성으로 알려져 있어요.', '너무 강하면 계획이 틀어질 때 스트레스를 크게 받을 수 있어요.'],
    tips: ['하루 할 일을 세 가지만 적고 하나씩 지워 보세요.', '계획에 «여유 시간»도 넣어 두세요.'],
    sources: ['Costa & McCrae, NEO PI-R 성실성: 질서(C2)·자기 통제(C5)', 'Poropat (2009), Psychological Bulletin — 성격과 학업 성취 메타분석'],
  },
  spontaneous: {
    game: '재미가 빨리 줄어 새로운 걸 찾고, 춤·노래방을 좋아해요. 목표 세우기는 덜 끌려요.',
    real: ['신중함이 낮고 «자극 추구»와 «새로운 행동에 대한 개방성»이 높은 모습이에요. 변화에 빨리 적응하고 분위기를 살리는 장점이 있어요.', '해야 할 일을 미루기 쉬운 면도 있어요.'],
    tips: ['재미있는 일과 해야 할 일을 번갈아 배치해 보세요.', '즉흥성이 빛나는 활동(연극, 밴드, 토론)을 찾아보세요.'],
    sources: ['NEO PI-R 신중성(C6)·자극 추구(E5)·행동 개방성(O4)', 'Zuckerman (1994) 감각 추구'],
  },
  careful: {
    game: '운전·응급처치를 꼼꼼히 익히고, 업무 실수에 덜 흔들려요. 절제력이 빨리 자라요.',
    real: ['행동하기 전에 깊이 생각하는 «신중성»과 HEXACO의 «신중함»이에요. 위험한 실수를 줄이는 장점이 있어요.', '너무 강하면 결정이 늦어질 수 있어요.'],
    tips: ['결정할 때 «기한»을 정해 두면 고민이 길어지지 않아요.'],
    sources: ['NEO PI-R 신중성(C6)', 'Ashton & Lee, HEXACO 성실성 요인의 신중함(Prudence)'],
  },
  adventurous: {
    game: '«모험» 욕구가 있어 수영·낚시·별 보기·사진처럼 해 보지 않은 일로 채워요.',
    real: ['새롭고 강렬한 경험을 찾는 «감각 추구» 성향이에요. 새로운 것을 잘 배우고 도전을 즐겨요.', '위험을 가볍게 여길 수 있어 안전 수칙을 지키는 것이 중요해요.'],
    tips: ['안전한 새로운 경험(새 운동, 처음 가 보는 동네 탐방)으로 모험심을 채워 보세요.'],
    sources: ['Zuckerman (1994) 감각 추구', 'NEO PI-R 행동 개방성(O4)'],
  },
  homebody: {
    game: '집에서 쉬기·목욕·독서를 좋아하고, 아늑한 집에서 더 행복해요. 사교 욕구가 천천히 줄어요.',
    real: ['자극 추구와 사교성이 낮은 쪽이에요. 혼자 쉬면서 에너지를 채우는 사람들이 있고, 그것도 건강한 방식이에요.'],
    tips: ['나만의 편한 공간을 꾸며 보세요.', '가끔은 가까운 사람과 짧은 외출도 기분 전환이 돼요.'],
    sources: ['NEO PI-R 자극 추구(E5)·사교성(E2)'],
  },
  worrier: {
    game: '스트레스와 거절을 더 크게 느끼지만, 그래서 숙제와 계획을 미리 챙겨요. 진정하기를 자주 해요.',
    real: ['«신경성»의 불안 측면이에요. 걱정이 많은 사람은 위험을 미리 알아채고 준비하는 장점도 있어요.', '걱정이 너무 크면 몸과 마음이 지치니 쉬는 방법을 갖는 것이 중요해요.'],
    tips: ['걱정 시간을 하루 15분으로 정해 그때만 걱정해 보세요.', '천천히 숨쉬기(4초 들이쉬고 6초 내쉬기)를 연습해요.'],
    sources: ['NEO PI-R 신경성: 불안(N1)'],
  },
  easygoing: {
    game: '스트레스·긴장 무드렛이 절반이고 회복탄력성이 빨리 자라요.',
    real: ['정서적 안정성(신경성이 낮음)이에요. 어려운 일에도 마음이 덜 흔들리고 빨리 회복해요.', '너무 느긋하면 중요한 일을 놓칠 수 있어요.'],
    tips: ['느긋함을 지키면서 중요한 마감은 달력에 적어 두세요.'],
    sources: ['NEO PI-R 신경성(N1 불안·N6 취약성)의 반대 극'],
  },
  optimist: {
    game: '해고·거절·강등처럼 나쁜 일의 무드렛이 가볍고, 회복탄력성이 빨리 자라요.',
    real: ['앞으로 좋은 일이 일어날 거라 기대하는 «기질적 낙관성»이에요. 낙관적인 사람이 스트레스에 더 잘 대처하고 건강 습관도 좋은 경향이 있어요.', '근거 없는 낙관은 준비를 소홀하게 만들 수 있어요.'],
    tips: ['안 좋은 일이 생기면 «이건 일시적이고, 일부분이야»라고 다시 생각해 보세요.'],
    sources: ['Scheier & Carver (1985) 기질적 낙관성(LOT-R)', 'NEO PI-R 긍정 정서(E6)'],
  },
  curious: {
    game: '연구·실험·관측을 좋아하고, 호기심과 과학이 빨리 자라요.',
    real: ['새로운 생각과 지식을 찾는 «아이디어 개방성»과 «호기심»이에요. 호기심이 높은 학생은 배우는 것을 즐기고 오래 기억해요.'],
    tips: ['궁금한 것을 적는 «질문 노트»를 만들어 보세요.'],
    sources: ['NEO PI-R 아이디어 개방성(O5)', 'Kashdan et al., 호기심과 탐색 척도'],
  },
  empathetic: {
    game: '깊은 대화·포옹이 잘 통하고, 공감·배려가 빨리 자라요. 못된 소셜은 덜 해요.',
    real: ['다른 사람의 감정에 마음을 쓰는 «공감적 관심»과 우호성의 온정 측면이에요. 관계를 깊게 하고 도움 행동을 이끌어요.', '남의 감정을 너무 많이 떠안으면 지칠 수 있어요.'],
    tips: ['친구 이야기를 들을 때 «그래서 기분이 어땠어?»라고 물어보세요.', '나의 감정도 함께 돌보세요.'],
    sources: ['Davis (1983) 대인 반응성 지수(IRI)', 'NEO PI-R 우호성: 온정(A6)'],
  },
  competitive: {
    game: '이기면 크게 기쁘고 지면 무척 분해요. 체스·게임·운동을 좋아하고 끈기가 빨리 자라요.',
    real: ['«성취 추구»가 높고 순응이 낮은 모습이에요. 목표를 향해 강하게 나아가는 힘이 돼요.', '지는 것을 견디기 어려워하면 스트레스가 커질 수 있어요.'],
    tips: ['남과 비교하기보다 «어제의 나»와 비교하는 목표를 세워 보세요.'],
    sources: ['NEO PI-R 성취 추구(C4)·순응(A4)'],
  },
  modest: {
    game: '칭찬에 덤덤하고 자랑하지 않아요. 사람들이 편하게 다가오고 관계가 천천히 식어요.',
    real: ['HEXACO의 «정직-겸손» 요인이에요. 겸손한 사람은 믿음을 얻고 협력을 잘해요.', '너무 겸손하면 내 성과를 알리지 못할 수 있어요.'],
    tips: ['잘한 일은 사실 그대로 말해도 괜찮아요. «고마워, 열심히 했어»라고 받아 보세요.'],
    sources: ['Ashton & Lee, HEXACO 정직-겸손 요인', 'NEO PI-R 겸손(A5)'],
  },
  fair: {
    game: '짓궂은 장난과 못된 소셜을 덜 하고, 법·리더십에 관심이 많아요.',
    real: ['공정함을 중요하게 여기는 마음이에요. 도덕 기반 이론에서는 «공정»을 사람들이 공통으로 가진 도덕 감각 가운데 하나로 봐요.'],
    tips: ['불공정한 일을 봤을 때 차분히 의견을 말하는 연습을 해 보세요.'],
    sources: ['Ashton & Lee, HEXACO 공정성', 'Haidt (2012), The Righteous Mind — 도덕 기반 이론'],
  },
  leader: {
    game: '연설·발표 연습을 좋아하고 리더십이 빨리 자라요. 대화에 잘 끼어요.',
    real: ['외향성의 «주장성»이에요. 여러 연구를 모은 메타분석에서 외향성은 리더로 뽑히는 것과 가장 강하게 관련된 성격 특성이었어요.', '다른 사람의 의견을 듣는 것도 좋은 리더의 조건이에요.'],
    tips: ['모둠 활동에서 의견 정리 역할을 맡아 보세요.'],
    sources: ['NEO PI-R 주장성(E3)', 'Judge, Bono, Ilies & Gerhardt (2002), Journal of Applied Psychology — 성격과 리더십'],
  },
  shy: {
    game: '처음 보는 사람 앞에서는 머뭇거리지만, 한번 친해지면 오래 깊이 지내요.',
    real: ['자의식이 높고 사교성이 낮은 쪽이에요. 수줍음은 성격의 한 모습일 뿐 고쳐야 할 문제가 아니에요.', '수줍은 사람은 신중하게 듣고 깊은 관계를 맺는 장점이 있어요.'],
    tips: ['처음 만날 때 할 질문 두세 개를 미리 생각해 두면 편해요.'],
    sources: ['NEO PI-R 자의식(N4)·사교성(E2)'],
  },
  sensitive: {
    game: '음악·그림·풍경에 마음이 쉽게 움직여요. 좋은 것도 슬픈 것도 깊이 느껴요.',
    real: ['감정과 아름다움에 열려 있는 성향, 그리고 자극을 깊이 처리하는 «감각 처리 민감성»이에요. 예술적 감수성과 공감이 큰 장점이에요.', '자극이 많으면 쉽게 지칠 수 있어요.'],
    tips: ['지칠 때 조용히 쉴 시간을 일부러 만들어 주세요.'],
    sources: ['NEO PI-R 감정 개방성(O3)·심미성(O2)', 'Aron & Aron (1997), Journal of Personality and Social Psychology — 감각 처리 민감성'],
  },
  steadfast: {
    game: '공부와 운동을 매일 조금씩 이어 가고, 끈기가 빨리 자라요.',
    real: ['장기 목표를 향한 열정과 끈기를 «그릿»이라고 해요. 꾸준함이 재능만큼 중요하다는 연구로 널리 알려졌어요(효과 크기에 대한 논쟁도 있어요).'],
    tips: ['하루 10분이라도 매일 하는 습관 하나를 정해 보세요.'],
    sources: ['Duckworth, Peterson, Matthews & Kelly (2007), Journal of Personality and Social Psychology — 그릿', 'Credé, Tynan & Harms (2017) — 그릿 메타분석'],
  },
  moodMaker: {
    game: '모이면 분위기를 띄워요. 웃긴 소셜이 잘 통하고 파티와 노래방을 좋아해요.',
    real: ['외향성의 온정·사교성·긍정 정서 측면이에요. 긍정적인 감정은 주변으로 퍼지는 경향이 있어요.', '늘 밝아야 한다는 부담은 내려놓아도 괜찮아요.'],
    tips: ['조용한 친구도 대화에 끼도록 질문을 건네 보세요.'],
    sources: ['NEO PI-R 온정(E1)·사교성(E2)·긍정 정서(E6)'],
  },
  thrifty: {
    game: '공과금을 제때 내면 뿌듯하고, 물건 욕심이 적어요. 경영 감각이 빨리 자라요.',
    real: ['성실성과 HEXACO의 «탐욕 회피»가 함께 있는 모습이에요. 계획적인 돈 관리는 경제적 스트레스를 줄여 줘요.'],
    tips: ['용돈의 일부를 먼저 떼어 저축하는 «선저축»을 해 보세요.'],
    sources: ['NEO PI-R 성실성', 'Ashton & Lee, HEXACO 탐욕 회피'],
  },
};

function traitNote(id: string): ResearchNote {
  const t = TRAIT_BY_ID[id];
  const r = TRAIT_REAL[id];
  return { id: `trait_${id}`, group: 'trait', icon: t.icon, label: t.label, game: [t.desc, r.game], real: r.real, tips: r.tips, sources: r.sources };
}

export const RESEARCH_NOTES: ResearchNote[] = [...HOW, ...FEARS.map((f) => fearNote(f.id)), ...Object.keys(TRAIT_REAL).map(traitNote)];
export const NOTE_BY_ID: Record<string, ResearchNote> = Object.fromEntries(RESEARCH_NOTES.map((n) => [n.id, n]));

/** The note for a trait, if it comes from research. */
export function traitNoteId(traitId: string): string | null {
  return TRAIT_REAL[traitId] ? `trait_${traitId}` : null;
}
