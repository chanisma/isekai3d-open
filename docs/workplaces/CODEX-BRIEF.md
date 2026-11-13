# Codex 배치용 공통 지침

배치 24 재작업·25·26에서 Codex(GPT-6-Astra **high**)에게 준 공통 지침. 근무지별 메모(아래 「근무지 메모 형식」)를 이어 붙여 하나의 프롬프트로 보낸다. medium은 빠르지만(10~12분) 얕았고(~300줄), high + 줄 수 기준 + 실험실 자가 점검을 주면 근무지당 36~100분, 빌더 1,000줄 안팎으로 Claude 배치 수준에 가까웠다.

`<LAB>`은 실험실 스크립트 경로로 바꾼다(아래 「실험실 스크립트」).

---

You are one of three agents in the isekai3d workplace furniture pipeline (repo C:\Users\you\orca\projects\isekai3d, working directly in this checkout; do not use git at all).

## Read first
1. docs/workplaces/PIPELINE.md, section «에이전트 지침 (원문)»: the brief (scope, the only files you may edit, steps, report). It applies, except where this message says otherwise.
2. The bar is set by the batches the user is happy with. Read these end to end before writing anything, and match their depth: src/view3d/workplaces/banker.ts + bankerMotion.ts, athletic.ts + athleticMotion.ts, and the latest, conservationist.ts + conservationistMotion.ts and toymaker.ts + toymakerMotion.ts, plus how src/view3d/activity.ts dispatches to them. Expect to end at roughly 1,000–1,900 lines of builders and 300+ lines of motion.

## What "the bar" means, concretely
- Every piece reads instantly as the real thing from the game camera: real proportions, materials, many small props, Korean labels painted where they help, lights/screens that come on in use (out.inUse / out.screen).
- Every interaction is its own choreographed sequence of 4–8 beats, not a held pose: e.g. the teller presses 호출 (the number display ticks up), takes the passbook from the tray, feeds the printer (lamp blinks), stamps the slip (a red mark appears), counts notes in the fingers. Props move between the piece and the dweller's hands at the right beat and the resting copy hides while it is held. Screens, counters, boards and objects change as the work progresses. Different interactions on the same piece get different sequences.
- People the scene needs are there and act: clients, colleagues, a partner across the table — drawn figures with their own motion that answers the dweller (they reply, hand things over, react). Real client NPCs keep their seats (src/view3d/workplaceSeats.test.ts).
- Nothing clips: the dweller stands clear of the piece's geometry, hands land on handles/keys/tools, seated dwellers sit on the seat, drawn figures don't stand inside furniture.
- Made-up names go on signs and props only — never rename the workplace itself.

## Check it on screen yourself
The dev server is running at http://localhost:5410 (don't start or stop it). A headless lab script drives the 🧪 동작 실험실:

    node "<LAB>" <wp> list
    node "<LAB>" <wp> "<piece name substring>::<interaction label substring>::<absolute output prefix>::<seconds after the motion starts, comma-separated>" ["...another job..."]

Save PNGs under C:/Users/you/orca/projects/isekai3d/prototypes/generated/codex-review/<wp>-... (git-ignored). It waits for the walk to finish, then shoots the 3D stage. Open the PNGs and judge them critically, as a player would. Shoot every interaction at 3+ moments, fix what looks wrong, shoot again. Vite hot-reloads your edits. Run one lab script at a time; the machine is short of memory, so don't run several browsers or test runs at once (use `npx vitest run --maxWorkers=2 --minWorkers=1`).

## Finish
`npx tsc --noEmit -p .` and `npx vitest run --maxWorkers=2 --minWorkers=1` passing. Then the report the brief asks for, plus the PNG paths of your final shots (one per interaction), as your final message.

---

## 근무지 메모 형식

```
## Your workplace
<WP> = `<wp>` (<한글 이름>, block `<wp>:` in src/game/workplace.ts). Your files (empty, already wired into the indexes): src/game/workFurniture/<wp>.ts, src/view3d/workplaces/<wp>.ts, and a new src/view3d/workplaces/<wp>Motion.ts (add only import/type/dispatch lines to src/view3d/activity.ts). The other two agents are doing <a> and <b> right now — never edit their files or blocks; re-read activity.ts and workplace.ts right before each small edit.

Pieces you own: <이 근무지에만 있는 가구>. Already redone elsewhere — don't rebuild, only check this career's interactions on them: <이미 개편된 공유 가구와 그 파일>. Household pieces (<집 가구>) stay as they are.
<분위기 한 줄>. Ideas for depth: <가구별 장면 아이디어>; and missing pieces such as <추가하면 좋을 가구>.
```

이미 개편된 가구가 어느 파일에 있는지는 `rg "^\s+<pieceId>\(" src/view3d/workplaces src/view3d/furniture*.ts`로 찾는다.

## 실험실 스크립트

`docs/workplaces/tools/lab.mjs`. playwright-core가 저장소 의존성이 아니므로 임시 폴더에서 돌린다.

```
mkdir <임시폴더> && cd <임시폴더> && npm init -y && npm i playwright-core@1.64.1
cp <repo>/docs/workplaces/tools/lab.mjs .
```

크로미움은 `%LOCALAPPDATA%/ms-playwright/chromium-1243/chrome-win64/chrome.exe`를 쓴다(없으면 `npx playwright-core install chromium` 후 경로를 맞춘다). 개발 서버(`npm run dev`, 5410)가 떠 있어야 한다.

## Orca로 돌리기

```
orca agent launch --agent codex --model gpt-6-astra --effort high --worktree active --prompt "<공통 + 근무지 메모>" --json   # → result.launch.outcome.handle
orca terminal read --terminal <h> --limit 60 --json
orca terminal send --terminal <h> --text "..." --enter --wait-submit 15 --json
orca terminal close --terminal <h>
```

`tui-idle` 대기는 일찍 끝날 수 있으니, 꼬리에 "Worked for"가 있고 "Working ("가 없을 때까지 반복해서 확인한다. "hit your usage limit"이 보이면 한도에 걸린 것이다.
