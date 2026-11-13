# 근무지 가구·동작 개편 파이프라인

2026-10-26~27에 시작한 작업의 기록. 근무지 하나씩 **가구 목록 확인 → 가구 하나씩 다시 만들기(동작 포함) → 추가하면 좋을 가구 목록 → 하나씩 만들어 배치** 순서로 진행한다. 기준 품질은 `src/view3d/furnitureShop.ts`, `furnitureSet.ts`, `furnitureSpace.ts`(사용자가 만족한 가구들).

## 진행 방법

1. 근무지 2곳을 고른다. 각 근무지마다 빈 파일 두 개를 만들고 인덱스에 연결한다.
   - `src/game/workFurniture/<wp>.ts` — `export const OBJECTS: ObjectDef[] = [];` → `src/game/workFurniture/index.ts`의 `WORK_FURNITURE`에 추가
   - `src/view3d/workplaces/<wp>.ts` — `export const BUILDERS: Record<string, Builder> = {};` → `src/view3d/workplaces/index.ts`의 `WORKPLACE_DETAIL`에 추가 (가구 빌더보다 먼저 쓰인다)
2. 근무지마다 에이전트 하나에 아래 「에이전트 지침」과 근무지 메모(공유 가구, 피해야 할 것, 분위기)를 준다. 둘을 동시에 돌린다(Claude 서브에이전트, 2026-10-31 사용자 지시. 메모리가 빠듯하다).
3. 끝나면 `npx tsc --noEmit -p .`와 `npx vitest run --maxWorkers=2 --minWorkers=1`을 돌리고, `tools/review.mjs`로 근무지 전체를 한 번에 찍어 시트를 본다(아래 「화면 확인」). 이상한 것은 고치거나 그 에이전트에게 돌려보낸다.
4. 배치마다 커밋한다. 동작은 근무지마다 `src/view3d/workplaces/<wp>Motion.ts`에 두고 `activity.ts`에는 import·타입·dispatch 세 줄만 더한다.

주의:
- 집에서도 쓰는 가구(식탁 의자, 소파, 냉장고, 변기, 책장, 화분 등)는 바꾸지 않는다.
- 여러 근무지가 같이 쓰는 가구는 한 에이전트만 맡게 하고, 다른 쪽은 자기 상호작용의 자세만 확인하게 한다.
- 게임 글꼴에 없는 이모지는 `emojiFont.test`가 잡는다. 실제 국가·정당·인물은 쓰지 않는다.
- 손님 자리는 `src/view3d/workplaceSeats.test.ts`가 지킨다(서 있는 게 자연스러운 곳은 그 파일의 STANDING 목록에 이유와 함께).

## 화면 확인

`tools/review.mjs`가 🧪 동작 실험실을 돌며 가구마다 넓은 화면 한 장과 상호작용마다 앞에서 네 시점을 찍은 뒤 마지막 시점을 왼쪽·오른쪽·뒤·위 방향에서 찍고, 안 시작됨·못 도착함·거의 안 움직임을 표시한다. 설치는 `tools/lab.mjs`와 같다(`CODEX-BRIEF.md`의 「실험실 스크립트」).

    node review.mjs <wp> --out <repo>/prototypes/generated/review/<wp> --auto 6   # 서로 가장 다른 순간 6개를 스스로 고른다
    node review.mjs <wp> --out ... --piece 객실 --at 3,6,9,12,16      # 가구 하나만, 시점을 바꿔서 (<wp>-part-*)

- GPU로 렌더링한다(`--cpu`는 CPU, 같은 장면 280초 → 85초). 벽에 막힌 방향은 찍지 않는다.
- 표시는 어디부터 볼지 알려 줄 뿐이고, 판단은 시트로 한다. 가까운 시점과 앉은 동작은 움직임이 작아 STILL이 쉽게 뜬다.
- 실험실에서는 경력 단계 잠금과 경보 상호작용이 풀리고(`Game.stagesOpen`), 마당의 차량도 목록에 나오며, 카메라 거리는 가구 크기를 따른다. 집 가구는 `--all`을 줄 때만 찍는다.
- 큰 가구는 전체가 보이는 대신 손이 작게 나온다. 손과 소품은 `--close 2 --full`로 크게 찍는다. 다른 체형은 `--gender female`, `--age`로 본다.
- `--at`은 대략의 시점이다. 동작이 시작된 시각과 정확히 맞지 않으니, 특정 박자를 보려면 시점을 촘촘히 준다.
- 에이전트에게도 같은 스크립트를 쓰게 하고, 한 번에 브라우저 하나만 돌리게 한다.

## 다시 시작할 때

- 그린 인물은 `workplaces/vroidFigure.ts`로 열화한 VRoid 몸(`models/*-npc_lite_*.vrm`)을 입혀 그린다. 새 근무지도, 옮기는 근무지도 이것을 쓴다. 유치원·어린이집·청소년수련관·학원과 시험한 세 곳까지 옮겼고, 나머지 인물 코드 파일이 남았다. 열화 모델을 다시 뽑는 스크립트는 아직 임시 폴더에 있다.

- 배치 40(우체국·공항 세관)과 새 직업 전부, 청소 차고지·진단검사센터·고객센터·녹음 스튜디오·통번역 사무소·여행사·패션 아틀리에·우주 센터·주민센터까지 끝났다. 다음은 아래 남은 근무지로 간다. 다음은 아래 목록의 첫 미완료 둘이다.
- Codex는 더 쓰지 않는다(`CODEX-BRIEF.md`는 기록으로 남긴다).
- 남은 다듬을 거리: 명함 카운터 옆에 일반 NPC가 서는 장면(원인 미확인) / 트랙터 레버는 좌표만 맞췄고 손이 닿는 순간을 크게 찍어 보지 못했다 / 승강기 수습 동작의 그려진 선배 팔, 매뉴얼 높이, 안전 장비 걸이의 자물쇠 팔 뻗기.

## 새 직업·근무지 (2026-11-01 사용자 확정, 배치 40 다음에 먼저 진행)

직업 정의부터 새로 만들고 근무지는 같은 지침으로 만든다. 행동은 직업과 직접 관련된 것만 넣는다. 회사 이름은 지어낸 이름만 쓴다. 분야 탭은 기존 탭을 쓴다. 공통 단계 뒤 두 갈래로 나뉘는 기존 구조를 따른다.

직업 하나마다: 직업 정의(careersKorea.ts: 단계별 직함·급여·시간), 분야 탭(careers.ts), 스킬(careerSkills.ts), 적성(careerTypes.ts), 이유 문구(careerWhy.ts), 근무 이벤트 카드(careerEventsKorea.ts), 단계별 행동(workStageData.ts), 근무지(workplaceKorea.ts: 가구·동료·손님·업무·비상), 가구와 동작.

| 직업 | 근무지 | 분야 탭 | 주요 스킬 | 갈래 | 비상 | 대표 가구·행동 |
|---|---|---|---|---|---|---|
| `semiconductor` 반도체 엔지니어 | 반도체 팹 | 교육·연구 | 논리, 프로그래밍 | 공정 / 장비 | 수율 급락 | 방진복·에어샤워, 클린룸, 노광 장비, 웨이퍼 운반 로봇, 현미경 불량 검사, 수율 회의 |
| `smartFarmer` 스마트팜 운영자 | 스마트팜 | 농림어업 | 원예, 프로그래밍 | 재배 / 시스템 | 양액·온도 장애 | 실내 수직농장, LED 재배 선반, 양액기, 환경 제어 화면, 수확·포장대. 첫 단계부터 스마트팜에서 시작하는 직업 |
| `dataCenter` 데이터센터 엔지니어 | 데이터센터 | IT·디자인 | 프로그래밍, 손재주 | 서버 운영 / 전력·냉각 | 냉각 장애(야간 근무 있음) | 서버 랙 통로, 디스크 교체, 관제실, 냉각기, 무정전 전원, 배선 정리 |
| `aiResearcher` 인공지능 연구원 | 인공지능 연구소 | IT·디자인 | 프로그래밍, 논리 | 모델 연구 / 서비스 | 서비스 오답 소동 | 학습 현황판(곡선이 실제로 오름), 라벨링 책상, 논문 토론 화이트보드, 시연 화면 |
| `roboticist` 로봇 엔지니어 | 로봇 연구소 | 교육·연구 | 손재주, 프로그래밍 | 산업용 / 서비스 로봇 | 시연 중 오작동 | 로봇 팔 안전 구역, 사족 보행 시험장, 조립대, 충전 도크 |
| `selfDriving` 자율주행 엔지니어 | 자율주행차 개발 센터 | IT·디자인 | 프로그래밍, 논리 | 인지 소프트웨어 / 시험 주행 | 시험차 긴급 정지 | 실내 시험 트랙, 라이다 시험차, 탑승 시험, 센서 보정판, 주행 기록 분석 |
| `greenEnergy` 친환경 에너지 기술자 | 태양광·풍력 발전 단지 | 설치·정비·건설 | 손재주, 논리 | 태양광 / 풍력 | 태풍 전 설비 점검 | 태양광 패널 청소·점검, 풍력 터빈 점검(사다리·낮은 나셀 모형), 인버터실, 배터리 저장 컨테이너, 발전량 관제판 |

- [x] `semiconductor`
- [x] `smartFarmer`
- [x] `dataCenter`
- [x] `aiResearcher`
- [x] `roboticist`
- [x] `selfDriving`
- [x] `greenEnergy`

농부의 "스마트팜 운영자" 단계와 공학자 근무지의 로봇 조립은 그대로 둔다.

집 가구·행동 단계에서도 행동은 직업과 직접 관련된 것만 더한다(코딩 부업, 집에서 로봇 조립 같은 것은 넣지 않는다).

## 집 가구와 행동 (2026-11-01 사용자 요청, 직장을 마친 뒤)

- 가구 디자인도 개선한다. 집 공용 가구(소파, 냉장고 등)도 이 단계에서는 고칠 수 있다.
- 행동은 직업과 직접 관련된 것만 더한다. 손에 쥐는 도구는 handTool로 만들고 근접 사진으로 확인한다.
- 집에서 하는 직업 교육 행동은 관련 직업이 있을 때와 없을 때 이름과 효과가 다르다. 관련 직업이 없으면 기초 수준만, 최대 레벨 2 정도까지 배운다. 관련 직업이 있으면 더 높은 수준까지 배운다.
- 레벨의 의미: 0 없음 / 1~2 기초(상식, 책으로 아는 수준) / 3~4 실무 입문 / 5~6 숙련 / 7~8 전문가 / 9~10 대가.
- 사용자 확정(2026-11-01):
  - 전문 역량과 코딩: 관련 직업이 없으면 집에서 레벨 2까지만 배운다. 코딩은 직업 역량에 가깝게 다룬다.
  - 공통 역량(코딩 제외): 레벨로 막지 않는다.
  - 취미: 레벨로 막지 않는다. 관련 직업 없이 취미로만 하면 레벨이 오를수록 어려워진다.
  - 청소년: 기초 제한을 똑같이 적용한다.
- 리드가 정한 기본값(사용자가 바꾸면 따른다):
  - 관련 직업은 그 직업의 대표·기반·갈래 스킬이다.
  - 응급처치(의학 3), 번역 일감(외국어 3) 같은 레벨 3 기능은 그대로 둔다.
  - 이미 레벨 2를 넘은 스킬은 깎지 않고, 집에서 더 오르지 않게만 한다.
  - 취미 난이도: 관련 직업이 없으면 4레벨부터 ×0.7, 6레벨부터 ×0.5, 8레벨부터 ×0.3. 플레이해 보고 조정한다.

### 집 가구 진행 방법

방별로 묶어 에이전트 2개씩 돌린다. 빌더는 `src/view3d/home/<묶음>.ts`, 동작은 `<묶음>Motion.ts`(필요할 때), 인덱스는 `home/index.ts`.

- [x] `rest` 침실·거실: bed, doubleBed, deluxeBed, deluxeDoubleBed, sofa, armchair, diningChair, toddlerBed, bassinet, fireplace
- [x] `kitchen` 주방: fridge, deluxeFridge, stove, deluxeStove, coffeeMaker, bar, kitchenSink, diningTable, grill, highChair
- [x] `bath` 욕실·청소: toilet, shower, sink, bathtub, pottyChair, broomSet, mopBucket, vacuumCleaner, cleaningCart
- [x] `play` 놀이: tv, bigTv, stereo, karaoke, djBooth, aquarium, pond, monkeyBars, toyBox, pool
- [x] `hobby` 취미: telescope, chessTable, mirror, clothesCabinet, treadmill, easel, piano, violin, camera, guitar, planter, bookshelf
- [x] `study` 공부: computer, gamingComputer, studyDesk, microscope, anatomyModel, chemistrySet, drivingSim, planningBoard, businessBoardGame, woodworkingTable, rocketShip + 손재주 연습 가구
- [x] `decor` 장식: lamp, 그림·포스터, plant, tree, bush, smokeAlarm, burglarAlarm, mailbox, urn, stairs
- [x] 집 교육 규칙: 위 확정 내용 구현. 요리·원예·낚시·사진·미술은 취미로 옮긴다. 옷 가림막에서 손재주를 뺀다.

Home brief: read the "Tools in the hand" and later notes in this file. Keep each piece's id, footprint, interaction ids and game effects. These pieces also stand in workplaces (grep the id), so every interaction must still pose well, and the user's household pieces should look like the same style as the workplace pieces but homely: no brand or job signs, warm materials. The bar is src/view3d/furnitureShop.ts and the latest workplaces: each piece reads instantly as the real thing, with detail on it, moving parts and lights via out.inUse, per-interaction spots and motions instead of one generic pose. Variants (deluxe) must look clearly better than the plain one. Keep triangle counts moderate: a home has many pieces. Add actions only if directly tied to the piece, and none about jobs. No git. No browser. Shoot with `node review.mjs home --piece <name>`, done by the lead.

## 직장의 수준 차이 (2026-11-02 사용자 승인)

목표: 직장 시스템은 사용자의 직업 지식을 높이기 위한 것이다. 직장 안의 사람들이 수준에 따라 다른 일을 하고 다른 판단을 맡는다는 것을 보여 준다.

순서: (1) 반도체·의사·교사 3곳 시험 → 사용자 확인 → (2) 전 직장 확대 → (3) 직업 도감, 승진 시험 등. 일 맡기기는 마지막.

시험 범위: 역할표(수준별 직함·맡는 일·판단할 수 있는 것·막히면 누구에게), 같은 가구의 수준별 다른 일, 동료가 직급에 맞는 일을 함, 이름표에 직함, 질문 뒤 한 줄 해설.

정한 것: 해설은 정답 판정이 아니라 "현장에서는 보통 이렇게"로 쓴다. 승진 시험을 넣더라도 떨어져도 승진을 막지 않고 성과 보너스만 준다. 내용은 조사한 근거로 쓰고, 불확실한 것은 쓰지 않고 표시한다.

### 단계와 직급 조정 계획 (2026-11-02, 사용자 요청)

원칙(사용자): 각 직업의 실제 상황에 맞게 단계와 직급을 정한다. 단계·직급 구조에 맞춰 끼워 맞추지 않는다. 역할, 일, 해설은 이것이 정해진 뒤에 맞춘다.

순서: (1) 직업마다 실제 경로를 근거와 함께 적는다 → (2) 그 직업의 단계를 나눈다 → (3) 게임 구조가 안 맞으면 구조를 고친다 → (4) 역할표, 일, 이름표, 복장, 해설을 맞춘다 → (5) 테스트와 화면 확인.

구조에서 풀어 줄 제약: 갈래 수(2개 고정), 갈래 시작 시점, 갈래 길이가 같아야 함, 단계 이름 공통(입문·실무·전문·리더), 단계를 칸 위치로 계산, 같은 줄 직함의 일이 같음.

| 직업 | 실제 경로 | 근거 | 확인 안 된 것 |
|---|---|---|---|
| 의사 | 의대 실습 → 인턴 → (전공 선택) 레지던트 → 전문의 → 전임의 → 조교수 → 부교수 → 교수. 과장, 병원장은 교수가 맡는 보직이고 병원장은 어느 과에서나 나온다 | 수련 규정, 언론 보도. 보직 부분은 일반 지식 | 보직 선임 방식, 교수 직급별 직무 차이. 봉직의·개원의 경로는 사다리에 없다 |
| 교사 | 교생 → 기간제 또는 2급 정교사 → 1급 정교사 → 부장(보직). 이후 학교 관리직(교감 → 교장), 교육 전문직(장학사 → 장학관 → 교육장), 수석교사. 담임은 직급이 아니다. 대학 교수는 교사의 승진 경로가 아니다 | 교육공무원법 계열 자료, 교육 전문지. 다수가 오래된 기사 | 현행 전직 조건, 보직교사와 담임 규정 원문, 교육장 임용 조건 |
| 반도체 | 인턴 → 입사부터 공정 또는 장비로 나뉜 엔지니어. 오퍼레이터는 별도 직군이다 | 현직자 답변, 취업 자료(근거 약함) | 직급 이름은 회사마다 달라 확인 못 함. "수율 책임 엔지니어", "총괄" 등은 임의 이름이다 |

조정 내용:
- 의사: 공통 칸은 실습생, 인턴까지. 외과와 내과는 레지던트부터 갈라진다. 교수 칸을 넣고, 주임교수를 빼고, 두 갈래 끝을 병원장으로 한다. 단계 이름은 실습·인턴, 전공의 수련, 전문의·교수, 과장·병원장.
- 교사: 정교사를 2급, 담임 교사를 1급 정교사로 바꾼다. 갈래를 학교 관리직, 교육 전문직, 수석교사 3개로 하고 대학 교수 갈래를 없앤다. 장학사 등은 교육청 소속이므로 학교 동료로 뽑지 않는다. 2026-10-26에 정한 "장학관을 교감 앞에" 순서는 갈래가 나뉘어 없어진다.
- 반도체: 공통 칸은 인턴뿐이고 신입부터 공정과 장비로 갈라진다. 오퍼레이터를 사다리에서 뺀다. 상위 직급 이름은 근거를 찾기 전까지 그대로 두고 임의 이름이라고 표시한다.
- 공통: 같은 줄이라도 차이가 큰 직함(실습생, 교감, 병원장 등)은 맡는 일을 따로 준다. 다른 직업은 바꾸지 않는다.

저장 파일: 칸 번호는 유지하고, 갈래가 없는 사람은 기존 처리로 갈래를 받는다. 예전 교수 갈래의 교사는 교육 전문직으로, 칸이 줄어든 갈래는 맨 위 칸으로 옮겨진다. 예전 의사 과장은 칸 번호가 같아 교수로 표시된다.

남은 확인: 의사 보직, 교사 현행 규정, 반도체 직급은 더 조사한다. 전 직장 확대 때는 직업마다 이 표를 먼저 쓰고 확인받는다.

### 빠진 행동 (2026-11-02)

126개 직장 전수 조사: 일하는 가구 7~16종(중앙값 11), 행동 12~27개(손님 응대 포함, 중앙값 19). 개수는 충분한 곳이 대부분이고, 부족한 것은 "그 직업이면 당연히 하는 일"이어서 직업별로 목록을 읽어 골랐다. 같은 가구의 다른 행동처럼 그려도 자연스러운 것 36개를 `src/game/workExtra.ts`에 넣었다(`like`로 자리·자세·동작을 빌림). 가구가 없어 못 넣은 것: 군 사격 훈련과 행군, 요양원 목욕실. 근거는 일반 지식이며 직업별 출처 조사는 하지 않았다.

### 빠진 행동의 가구·소품·동작 (2026-11-02)

위 목록 중 동작으로 보여야 하는 것을 8묶음으로 만들었다: 병원(환자, 처치 카트), 군 기지, 요양원(목욕실), 어린이집·유치원, 학교, 경찰서·소방서, 정비소·카페·식물원·농장, 주방·베이커리·미용실·목공소·네일숍. `workExtra.ts`의 `own: true`가 자기 동작을 가진 것이다. 돌봄 장면은 몸을 드러내지 않고 이불·옷·수건으로 가린 채 순서와 소품으로 보여 준다. 일부러 뺀 것(처방 입력, 인수인계, 결재, 메일, 민원, 출결 문자, 인원 점검, 관제 교신, 본회의, 교환·반품)은 빌린 동작 그대로다.

군 기지는 2026-11-03에 부지를 다시 짰다(`baseTiles`): 왼쪽 마당(`miBaseGround`)에 사격장 2×10, 연병장과 게양대, 장애물, 철봉, 정문 초소, 트럭을 두고, 오른쪽 건물에 상황실·정비실·식당·생활관·화장실을 넣었다. 울타리는 충돌 없이 그리기만 한다. 행군은 부대 밖으로 나가는 훈련이라 부대 안에 트랙을 두지 않는다: 정문 안쪽 행군 집결지(`miMarchRoute`, 3×1, 군장 거치대와 점검표)에서 군장을 메고 정문을 나가 울타리 밖 길가를 따라 걷고, 끝에서 물을 마시고 돌아온다(한 바퀴 약 38초).

### 진행 상태

진행 상태: 위 조정과 역할표를 커밋했다. 이어서 플레이어의 하루 업무를 직급에 맞췄다(의사: 인턴은 채혈·명단·수술 준비, 레지던트부터 차트, 수석부터 진단 / 교사: 교생은 지도 교사 아래 수업, 부장과 장학사는 공문, 수석교사는 공개 수업 / 반도체: 엔지니어에게 노광·코팅을 시키지 않음). 사다리 밖 동료(`CoworkerSpec.staff`)로 팹의 라인 오퍼레이터를 넣었고, 파일럿 직장의 동료는 근무 시간에 일하고 2시간 반마다 20분 쉰다(낮잠과 독서 없음).

## 남은 근무지 (0곳)

- [x] `banker` 은행 지점
- [x] `athletic` 스포츠 구단 훈련장
- [x] `styleInfluencer` 스타일 스튜디오
- [x] `youthCounselor` 청소년수련관
- [x] `kindergartenTeacher` 유치원
- [x] `conservationist` 생태 연구 센터
- [x] `interiorDecorator` 인테리어 디자인 스튜디오 (쇼룸 공간만 먼저 개편됨)
- [x] `toymaker` 장난감 공방
- [x] `electrician` 전기 공사 업체
- [x] `elevatorTech` 승강기 서비스센터
- [x] `flightAttendant` 승무원 브리핑 센터
- [x] `meteorologist` 기상청 예보실
- [x] `pilot` 항공사 운항 센터
- [x] `actor` 영화 촬영장
- [x] `dancer` 댄스 스튜디오
- [x] `therapist` 심리 상담 센터 (명상 매트만 먼저 개편됨)
- [x] `farmer` 농장
- [x] `sales` 영업 본부
- [x] `entertainer` 코미디 클럽 공연장 (클럽 무대·관객석만 먼저 개편됨)
- [x] `fastFood` 패스트푸드점 (조리대 prepCounter는 레스토랑 주방에서 개편됨)
- [x] `manualLabor` 조경 공사 현장
- [x] `plumber` 설비 업체
- [x] `welder` 조선소 용접장
- [x] `fisher` 어항
- [x] `fishFarmer` 양식장
- [x] `haenyeo` 해녀의 집
- [x] `forester` 국유림 관리소
- [x] `convenienceManager` 편의점
- [x] `announcer` 방송국 아나운서실
- [x] `pharmacist` 약국
- [x] `realEstate` 부동산 사무소
- [x] `graphicDesigner` 디자인 스튜디오
- [x] `tattooArtist` 타투 스튜디오
- [x] `tvHost` 방송국 스튜디오 (토크쇼 세트·배치만 먼저 개편됨)
- [x] `secretAgent` 정보 분석센터
- [x] `retail` 옷가게
- [x] `babysitter` 어린이집 (국공립 어린이집 가구를 함께 씀)
- [x] `proGamer` e스포츠 게임단 연습실
- [x] `mailCarrier` 우체국
- [x] `customsOfficer` 공항 세관
- [x] `sanitationWorker` 청소 차고지
- [x] `labTechnician` 진단검사센터
- [x] `callCenter` 고객센터
- [x] `voiceActor` 녹음 스튜디오
- [x] `interpreter` 통번역 사무소
- [x] `tourGuide` 여행사
- [x] `fashionDesigner` 패션 아틀리에
- [x] `astronaut` 우주 센터 (원심 가속기·우주선 훈련 모형만 먼저 개편됨)
- [x] `civilServant` 주민센터
- [x] `correctionsOfficer` 교정시설
- [x] `wallpaperer` 인테리어 시공 현장
- [x] `insuranceAgent` 보험 지점

## 에이전트 지침 (원문)

# Workplace pipeline brief (shared by every workplace agent)

Repo: C:\Users\you\orca\projects\isekai3d (React/TS Dwellers-like game; three.js 3D view in src/view3d; game logic in src/game).
Work directly in the working tree. Do NOT use git (no commit/stash/checkout/restore). Never touch src/dev/skirtDrape.ts, prototypes/*, src/dev/importReview.ts.
Other agents are doing OTHER workplaces at the same time. Only edit: your own two files (src/game/workFurniture/<WP>.ts and src/view3d/workplaces/<WP>.ts), your own workplace's block in src/game/workplace.ts or src/game/workplaceKorea.ts, and — only if truly needed, with small edits re-read right before editing — src/game/catalog.ts / catalogKorea.ts (interaction lists of YOUR workplace's existing defs), src/game/workStageData.ts (your career's rows), src/view3d/activity.ts (a new motion). Avoid lot3d.ts/avatar.ts/parts.ts; prefer the existing per-interaction spot system. Do not use the Playwright browser (the lead reviews visually afterwards).

The user's request (Korean): 새로 만든 가구들의 퀄리티와 연결된 활동의 퀄리티가 굉장히 좋음. 이 정도의 정성을 가지고 다음 파이프라인으로 작업 진행: 근무지 선택 -> 근무지의 가구 리스트 확인 -> 가구 하나씩 수정 -> 추가하면 좋을 가구 리스트 생성 -> 하나씩 생성 후 배치.

## Quality bar (study these first)
The latest pieces the user loved: src/view3d/furnitureShop.ts (drafting table, makeup vanity, bakery case, judge's bench, mukbang table…), src/view3d/furnitureSet.ts (talk show set, showroom, meditation mat + cross-legged pose), src/view3d/furnitureSpace.ts (wind tunnel, centrifuge, spacecraft mock-up + motions), src/view3d/furniturePlatform.ts concertStage/clubStage. Each piece reads instantly as the real thing, is detailed (props on it, lights that glow in use via out.inUse/out.screen, labels painted with Korean text where useful), and every interaction on it puts the dweller in a believable place and pose with a fitting motion (seated at controls, standing at the hands point, lying, kneeling, etc.). Helpers: src/view3d/parts.ts, src/view3d/toon.ts (part, box, rbox, cyl, ball, marker, rod, legs, shade, deskChair, screenMesh, glow…). Per-interaction spots: read how parts.ts `spots`, activity.ts `spotPose`, and lot3d.ts bodyPose use them (sit / stand / fly / crossLegged, a fixed motion, face direction, hands marker), plus out.seat/work/stand/inUse/screen and the SAT_AT kinds in lot3d.ts.

## Pipeline for your workplace <WP>
1. Read the workplace def (objects, coworkers, clients, tasks, branchTasks, alarm) and every interaction of its job pieces (catalog.ts / catalogKorea.ts / workStageData.ts rows for this career).
2. List the furniture. Redo EVERY job-specific piece (the ones with this job's interactions) as its own builder in src/view3d/workplaces/<WP>.ts keyed by def id (that file's BUILDERS is consulted before all other builders, so it overrides them). Do NOT redesign ordinary household furniture shared with homes (diningChair, sofa, armchair, fridge, coffeeMaker, toilet, sink, shower, bed, bookshelf, plant, lamp, aquarium, posters/paintings) — those are shared with the player's homes. If a job piece's id is also used by other workplaces, that's fine — keep it generic enough for them (check with grep).
   For each piece: the look, the markers, and every interaction's spot/pose/motion. Add a motion in activity.ts only if no existing one fits.
3. Make a list of furniture this workplace is missing to feel real and lively (3–6 pieces; e.g. for a hospital: a patient monitor, an IV stand, a nurses' station, a reception kiosk; pick what matters for the job and its tasks). Each new piece: an ObjectDef in src/game/workFurniture/<WP>.ts (unlisted: true, price 0, category 'skill' or 'decor', ids prefixed with something unique to the workplace to avoid clashes, sensible w×h footprint), with 1–2 job interactions where it makes sense (look at how existing work interactions are written: `requires: 'atWork'`, skill, effects, duration, pose) — or decor with no interactions if it's set dressing — and its builder in src/view3d/workplaces/<WP>.ts.
   If a new interaction should count for the day's tasks, add its id to a fitting task in the workplace's tasks/branchTasks (task('x', label, [ids], n)).
4. Place the new pieces in the workplace layout (objects list in workplace.ts / workplaceKorea.ts) where they make sense, facing the right way (dir: the front faces down by default; the user of an object stands/sits at its front tile), on free floor, not blocking doors/paths, rooms coherent. Keep src/game/workplaceLayout.test.ts, workplace.test.ts, workplaceTour.test.ts and src/view3d/workplaceSeats.test.ts passing (every client spot keeps its own seat).
5. Run `npx tsc --noEmit -p .` and `npx vitest run` (all must pass; if another agent's half-written file breaks tsc, say so but make sure your own files are clean).

## Report back
Per redone piece: one line on the new look and how each interaction is posed. The new pieces: id, name, footprint, interactions, where placed. Anything the lead should look at closely in the visual review (the lead will open the 🧪 motion lab at work:<WP> and run each interaction).


## Additions to the brief (2026-11-01)
- Motions go in src/view3d/workplaces/<WP>Motion.ts; add only import, type and dispatch lines to activity.ts. Pick a two-letter prefix for ids and motions and grep first that activity.ts and the other workplaces don't already use it.
- Bar: the newest workplaces in src/view3d/workplaces (fisher, welder, fishFarmer, haenyeo: 1,500-1,700 lines plus about 900 of motions). Read one or two before starting.
- Other people in a scene: `vroidFigure` from workplaces/vroidFigure.ts over the drawn figure (see plumber.ts). It has no crossed legs and no lean. A hat goes on the head group, close to head size (about 0.13 radius), and must not read as a face.
- Placement: a piece over about 1.5 m must not stand on the camera's side (larger y) of a place where a dweller works, or it hides them: low pieces in front rows, tall ones at the back. A new piece must not hide another. If the working hours fall in the dark, add lit lamps.
- Other sessions work in this same tree: never revert or reformat what isn't yours, re-read a shared file right before each small edit, keep its line endings. No git commands at all, even read-only. No browser. If tsc or vitest fails in a file that isn't yours, name it and leave it. Run `npx vitest run --maxWorkers=2 --minWorkers=1`, which includes emojiFont.test.
- Report what the brief asks for, the final tsc and vitest results, and anything unfinished.

## Tools in the hand (2026-11-01, the user's request)
A tool the dweller really holds (screwdriver, knife, spatula, broom, spray gun, tablet, clipboard and so on) goes through src/view3d/handTool.ts, not as a prop moved near a hand point. Read handTool.ts first, then how it's used: `s.held` in workplaces/electrician.ts (one hand), culinary.ts (a knife with a palm direction), baker.ts (two hands on a peel with `slide`) and src/view3d/cleaningTools.ts (`anchor`: a head that stays on the floor).
- Design the tool to be held: a real handle at about the size the shapes expect (HANDLE_RADIUS 0.014 m; give `radius` where it's thicker), its origin and axes chosen so the grip is simple, and a named Group (`tool.name`), since the probe reports by name.
- Set `spot.held = { tool, lead, grips, ... }` on the beats when it's in the hand and null otherwise. Pick the shape that fits: power (handle), pen (pen, brush), pinch (small), flat (cloth, tray), trigger (spray, drill), cradle (big and round). Give `palm` when the tool has a right way up.
- Don't use it where nothing is held (pressing a button, pointing, carrying a big crate in both arms).
- List in your report each interaction that uses a held tool, as `<piece name>::<interaction label part>::<tag>::<seconds when the tool is in hand>`, so the lead can shoot it with tools/handshot.mjs. The lead checks the hands sheet and the probe (palm distance from grip) for each.
- No ink outline on a held tool (`{ outline: false }`): the line has a fixed width, so round a 14 mm handle it comes out as thick as a thumb and shows as a dark box around the tool up close.
- A picture laid on a box's face must sit in front of it: check the box's real front (centre + depth/2) against the plane's z. A data centre's rack faces sat 1 mm behind their cabinets and every test passed. Shoot one full-size frame of any piece whose screens matter.
- Crouching lowers the shoulders only about half a leg (about 0.37 m at full crouch; see `squat` in avatar.ts), and the arm reaches about 0.5 m. Work at deck or floor level from a kneel is usually out of reach: raise the work or stand closer. The lab probe (handshot.mjs) is what tells: average palm-to-grip above about 2 cm wants a look.
- A pen that writes on a page below it: give the grip `writes` (how far along `axis` from `at` the tip is). The body then leans it back to the hand about 53° from the page, the tip staying where the script put it (`leanPen`). Not for a pipette, a seam ripper or a marker at a wall.
- A grip's `axis` runs along what's held. The probe can't see a wrong axis (the palm is on the point either way): shears gripped with the axis across their handle read 0.8 mm and looked like a block lying over the fist. Only the close-up shows it.
