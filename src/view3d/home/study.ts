import * as THREE from 'three';
import type { Grip, HeldTool, Side } from '../handTool';
import { marker, rod, shade, spot, tint, type Builder, type Built, type Spot } from '../parts';
import { box, canvasTexture, cyl, part, rbox } from '../toon';
import type { Painter } from './play';
import {
  AN, CM, DK, DR, MS, PB, PLAN_ROW, PLAN_ROWS, RK, TB, TY, WB, fract, gbBeats, gbLive, gbNow, gbRoad, planPen, sm, squareAt,
  type GbMotion, type GbNow, type V,
} from './studyMotion';

/*
 * Studying and making things at home, redone (2026-11-01, at the user's request; docs/workplaces/PIPELINE.md, 집 가구).
 * No workplace overrides any of these. No '*' spots: a repair or an upgrade still goes the family's way, to Built.seat and Built.work.
 *
 * What a screen shows is painted on a canvas of its own, never as Built.screen, whose colour lot3d.ts sets each frame: that's a
 * standby lamp, whose colour says when the thing is really on. All that moves runs in Built.away, told every frame, from
 * gbNow, the same beats the body follows. Everything shown is made up.
 */

const FONT = '"Noto Sans KR","Malgun Gothic","Apple SD Gothic Neo",sans-serif';
const WALNUT = '#6b4630';
const OAK = '#b98a5a';
const OAK_DARK = '#8f6841';
const BIRCH = '#d6b98c';
const BLACK = '#23252b';
const GREY = '#4a4d55';
const STEEL = '#aeb6bd';
const BRASS = '#c9a24b';
const CREAM = '#efe6d2';
const PAPER = '#f6f1e3';
const TAU = Math.PI * 2;

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UP = v(0, 1, 0);
const dots = new Map<number, THREE.SphereGeometry>();
function dot(r: number): THREE.SphereGeometry {
  let g = dots.get(r);
  if (!g) dots.set(r, (g = new THREE.SphereGeometry(r, 10, 7)));
  return g;
}
type O = { rx?: number; ry?: number; rz?: number };
const bit = (g: THREE.Object3D, geom: THREE.BufferGeometry, color: string, x: number, y: number, z: number, o: O = {}) => part(g, geom, color, x, y, z, { ...o, outline: false });
const group = (g: THREE.Object3D, x = 0, y = 0, z = 0, name?: string) => {
  const n = new THREE.Group();
  n.position.set(x, y, z);
  if (name) n.name = name;
  g.add(n);
  return n;
};
const basic = (color: string, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
function lit(g: THREE.Object3D, geom: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, o: O = {}) {
  const m = part(g, geom, '#fff', x, y, z, { ...o, outline: false, shadow: false, material: mat });
  m.userData.ownMaterial = true;
  return m;
}
/** A flat picture or colour facing +z. */
function flat(g: THREE.Object3D, w: number, h: number, mat: THREE.Material, x: number, y: number, z: number, o: O = {}): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  m.rotation.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0);
  g.add(m);
  return m;
}
/** A flat thing lying on a table, its top towards -z of the piece. */
const lying = (g: THREE.Object3D, w: number, d: number, mat: THREE.Material, x: number, y: number, z: number, ry = 0) => {
  const m = flat(g, w, d, mat, x, y, z, { rx: -Math.PI / 2 });
  m.rotation.z = ry;
  return m;
};

/** The standby lamp, handed over as Built.screen: bright when lot3d.ts says the piece is on. */
function standby(g: THREE.Object3D, out: Built, x: number, y: number, z: number): () => boolean {
  const m = new THREE.Mesh(box(0.016, 0.01, 0.006), basic('#2a3140'));
  m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  g.add(m);
  out.screen = m;
  const mat = m.material as THREE.MeshBasicMaterial;
  return () => mat.color.g > 0.3;
}

// -------------------------------------------------------------------------------------------------
// Pictures, painted over and over: nothing here may throw, whatever the time.

export const pick = <T,>(a: readonly T[], i: number): T => a[((Math.floor(Number.isFinite(i) ? i : 0) % a.length) + a.length) % a.length];
function circle(c: Painter, x: number, y: number, r: number, color: string) {
  c.beginPath();
  c.arc(x, y, Math.max(0.01, r), 0, TAU);
  c.fillStyle = color;
  c.fill();
}
function words(c: Painter, s: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'left') {
  c.font = `bold ${Math.max(1, size)}px ${FONT}`;
  c.fillStyle = color;
  c.textAlign = align;
  c.textBaseline = 'middle';
  c.fillText(s, x, y);
}
const rect = (c: Painter, x: number, y: number, w: number, h: number, color: string) => {
  c.fillStyle = color;
  c.fillRect(x, y, Math.max(0, w), Math.max(0, h));
};
function line(c: Painter, x0: number, y0: number, x1: number, y1: number, color: string, w: number) {
  c.strokeStyle = color;
  c.lineWidth = Math.max(0.1, w);
  c.beginPath();
  c.moveTo(x0, y0);
  c.lineTo(x1, y1);
  c.stroke();
}
function frame(c: Painter, title: string, bg: string, bar = '#2d3343') {
  rect(c, 0, 0, 320, 200, bg);
  rect(c, 0, 0, 320, 18, bar);
  for (const [i, col] of ['#ff6159', '#ffbd2e', '#28c941'].entries()) circle(c, 10 + i * 10, 9, 3, col);
  words(c, title, 44, 9.5, 9, '#e6e9f0');
}

const CHATS: ReadonlyArray<[string, string]> = [['솜뭉치', '오늘 저녁 뭐 먹었어?'], ['나', '구름빵 샌드 만들었어'], ['별똥이', '레시피 공유 좀!'], ['나', '이따 사진 보내 줄게'], ['솜뭉치', '주말에 공원 갈래?'], ['나', '좋아, 도시락 싸 갈게']];
const STORY = ['등대지기의 딸은 그날 밤', '꺼진 등불 아래에서 편지를 찾았다.', '봉투에는 이름이 없었고,', '안에는 지도 한 장뿐이었다.', '"달이 차면 문이 열린다."', '그녀는 외투를 걸치고 나섰다.', '바다는 이상하리만치 고요했다.'];
const CODE: ReadonlyArray<ReadonlyArray<[string, string]>> = [
  [['함수 ', '#c792ea'], ['별세기', '#82aaff'], ['(하늘) {', '#e6e9f0']],
  [['  합 ', '#e6e9f0'], ['= ', '#89ddff'], ['0', '#f78c6c']],
  [['  반복 ', '#c792ea'], ['별 ', '#e6e9f0'], ['안에 ', '#c792ea'], ['하늘', '#e6e9f0']],
  [['    합 ', '#e6e9f0'], ['+= ', '#89ddff'], ['별.밝기', '#ffcb6b']],
  [['  돌려주기 ', '#c792ea'], ['합', '#e6e9f0']],
  [['}', '#e6e9f0']],
  [['// 말랑시 밤하늘로 시험', '#6b7a90']],
  [['보여주기', '#82aaff'], ['(별세기(말랑시))', '#e6e9f0']],
];
const STEPS = ['1단계: 상자에 값 넣기', '2단계: 조건 나누기', '3단계: 반복하기', '4단계: 함수 만들기'];
const PHRASES: ReadonlyArray<[string, string]> = [['Bonjour, ça va?', '안녕하세요, 잘 지내요?'], ['Où est la gare?', '기차역이 어디예요?'], ["J'aime ce livre.", '저는 이 책이 좋아요.'], ['À demain!', '내일 봐요!']];
const SOURCE = ['The lighthouse went dark', 'at midnight, and nobody', 'in the village knew why.', 'A letter came by morning.', 'It had no name on it.'];
const TARGET = ['등대는 자정에 꺼졌고,', '마을의 누구도', '그 까닭을 알지 못했다.', '아침이 되자 편지가 왔다.', '이름은 적혀 있지 않았다.'];
const STOCKS: ReadonlyArray<[string, number]> = [['말랑전자', 2.1], ['구름항공', -0.8], ['솜사탕제과', 1.4], ['별빛통신', -1.6], ['방울건설', 0.5]];
const HEADS = ['말랑시 기준금리 동결', '솜사탕 값 석 달째 오름세', '구름항공 새 노선 취항', '별빛통신 신제품 공개'];
const JOBS: ReadonlyArray<[string, string]> = [['방울제과', '제빵 보조'], ['말랑도서관', '사서 도우미'], ['구름항공', '안내 직원'], ['별빛통신', '상담원'], ['솜마을 카페', '바리스타']];

function pcGame(c: Painter, t: number, typed: number) {
  rect(c, 0, 0, 320, 200, '#27305e');
  for (let i = 0; i < 26; i++) circle(c, fract(i * 0.37 - t * 0.012) * 320, 12 + ((i * 41) % 90), 1 + (i % 3) * 0.5, '#e7ecff');
  const scroll = t * 42;
  const tile = 32;
  for (let i = -1; i < 12; i++) {
    const wx = i * tile - (scroll % tile);
    rect(c, wx, 158, tile - 1, 42, '#4d8a55');
    rect(c, wx, 158, tile - 1, 7, '#7cc26e');
  }
  const n = Math.floor(scroll / tile);
  for (let i = 0; i < 12; i++) {
    const k = n + i;
    const wx = i * tile - (scroll % tile);
    if (k % 7 === 3) rect(c, wx + 4, 136, 24, 22, '#8c5a3c');
    if (k % 5 === 1) circle(c, wx + 16, 110, 6, '#ffd166');
  }
  const jump = Math.abs(Math.sin(t * 1.5));
  const y = 138 - 42 * jump * jump;
  rect(c, 72, y, 18, 20, '#e0584b');
  rect(c, 75, y - 12, 12, 12, '#f2c9a4');
  rect(c, 70, y - 15, 22, 5, '#8a2f28');
  rect(c, 0, 0, 320, 22, 'rgba(0,0,0,0.5)');
  words(c, '별빛 기사단', 8, 11, 11, '#ffe9a8');
  words(c, `점수 ${Math.floor(typed * 37)}`, 150, 11, 11, '#fff');
  for (let i = 0; i < 3; i++) circle(c, 268 + i * 16, 11, 5, '#ff6b81');
}
function pcDrill(c: Painter, t: number, typed: number) {
  rect(c, 0, 0, 320, 200, '#16222f');
  for (let i = 0; i < 9; i++) line(c, i * 40, 0, i * 40, 200, '#22344a', 1);
  for (let i = 0; i < 6; i++) line(c, 0, i * 40, 320, i * 40, '#22344a', 1);
  const k = Math.floor(t * 1.4);
  const x = 40 + ((k * 137) % 240);
  const y = 40 + ((k * 89) % 120);
  const u = fract(t * 1.4);
  circle(c, x, y, 18 - 10 * u, '#ff6b6b');
  circle(c, x, y, 10 - 6 * u, '#fff');
  circle(c, x, y, 4 - 2 * u, '#ff6b6b');
  const cx = x + (1 - u) * 40 * Math.sin(k);
  const cy = y + (1 - u) * 30 * Math.cos(k);
  line(c, cx - 9, cy, cx + 9, cy, '#7bffb0', 1.5);
  line(c, cx, cy - 9, cx, cy + 9, '#7bffb0', 1.5);
  words(c, '에임 연습장', 8, 12, 11, '#9fd2ff');
  words(c, `명중률 ${70 + (Math.floor(typed) % 28)}%`, 312, 12, 11, '#fff', 'right');
}
function pcChat(c: Painter, typed: number) {
  frame(c, '소곤소곤 메신저', '#eef1f6');
  const shown = Math.min(CHATS.length, 2 + Math.floor(typed / 2.5));
  const from = Math.max(0, shown - 5);
  for (let i = from; i < shown; i++) {
    const [who, text] = CHATS[i];
    const me = who === '나';
    const y = 28 + (i - from) * 30;
    const w = Math.min(190, 18 + text.length * 10);
    rect(c, me ? 310 - w : 10, y, w, 22, me ? '#ffe066' : '#ffffff');
    words(c, text, me ? 310 - w + 8 : 18, y + 11, 10, '#333');
    if (!me) words(c, who, 14, y - 3, 7, '#7a8290');
  }
  rect(c, 8, 178, 304, 16, '#fff');
  words(c, '│', 14 + (typed * 30) % 200, 186, 9, '#555');
}
function pcBook(c: Painter, typed: number) {
  frame(c, '달빛 등대의 비밀.원고', '#fbf8ef');
  words(c, '3장. 이름 없는 편지', 24, 34, 12, '#3a2f2a');
  const chars = Math.floor(typed * 5);
  let left = chars;
  for (let i = 0; i < STORY.length && left > 0; i++) {
    const s = STORY[i].slice(0, left);
    left -= STORY[i].length;
    words(c, s, 24, 56 + i * 18, 11, '#3a2f2a');
  }
  words(c, `${1200 + chars * 2}자`, 306, 190, 9, '#8a7f76', 'right');
}
function pcCode(c: Painter, typed: number, tutorial: boolean) {
  frame(c, tutorial ? '튼튼 코딩 교실' : '별세기.말랑', '#1f2430');
  const x0 = tutorial ? 120 : 10;
  if (tutorial) {
    rect(c, 0, 18, 112, 182, '#2a3142');
    const step = Math.floor(typed / 5);
    STEPS.forEach((s, i) => {
      const at = ((step % STEPS.length) + STEPS.length) % STEPS.length;
      rect(c, 4, 26 + i * 26, 104, 22, i === at ? '#3f6fd1' : '#343c50');
      words(c, s, 8, 37 + i * 26, 7.5, '#fff');
      if (i < at) words(c, '✓', 98, 37 + i * 26, 9, '#7bffb0');
    });
  }
  const chars = Math.floor(typed * 6) % 120;
  let left = chars;
  CODE.forEach((row, i) => {
    let x = x0 + 16;
    words(c, String(i + 1), x0, 34 + i * 17, 8, '#566078');
    for (const [s, col] of row) {
      if (left <= 0) return;
      const part1 = s.slice(0, left);
      left -= s.length;
      words(c, part1, x, 34 + i * 17, 10, col);
      x += s.length * 9;
    }
  });
  if (chars > 100) {
    rect(c, x0, 172, 320 - x0 - 8, 20, '#21432e');
    words(c, '통과! 밝기 합계 128', x0 + 6, 182, 10, '#7bffb0');
  }
}
function pcCall(c: Painter, t: number, typed: number) {
  frame(c, '화상 회화: 파리의 미레유 선생님', '#23262f');
  rect(c, 12, 26, 296, 124, '#d7c6b0');
  rect(c, 12, 26, 296, 40, '#b7d2e8');
  const talk = fract(t / 7) < 0.55;
  circle(c, 160, 124, 40, '#6b4a6e');
  circle(c, 160, 84, 26, '#f2cfae');
  circle(c, 160, 66, 22, '#5a3a2e');
  circle(c, 160, 88, 22, '#f2cfae');
  for (const s of [-1, 1]) circle(c, 160 + s * 9, 84, 2, '#2b2233');
  circle(c, 160, 96, talk ? 3 + 2.5 * Math.abs(Math.sin(t * 9)) : 1.5, '#a0414e');
  rect(c, 240, 100, 62, 44, '#465064');
  circle(c, 271, 118, 11, '#f2cfae');
  const [fr, ko] = pick(PHRASES, t / 7);
  rect(c, 12, 154, 296, 40, '#111520');
  words(c, fr, 20, 166, 12, '#fff');
  words(c, ko, 20, 183, 9.5, '#b9c4d6');
  for (let i = 0; i < 12; i++) rect(c, 218 + i * 7, 182 - 7 * Math.abs(Math.sin(t * 7 + i + typed)), 4, 14 * Math.abs(Math.sin(t * 7 + i + typed)), '#7bffb0');
}
function pcNews(c: Painter, t: number, typed: number) {
  frame(c, '말랑 경제', '#f5f6f8', '#23395b');
  words(c, pick(HEADS, t / 6), 12, 32, 12, '#1d2c44');
  rect(c, 12, 44, 180, 90, '#fff');
  c.strokeStyle = '#2e7d32';
  c.lineWidth = 1.6;
  c.beginPath();
  for (let i = 0; i <= 30; i++) {
    const x = 16 + i * 5.7;
    const y = 90 - 22 * Math.sin((i + t * 1.2) * 0.42) - 12 * Math.sin((i + t) * 0.13);
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.stroke();
  STOCKS.forEach(([n, d], i) => {
    const dd = d + 0.3 * Math.sin(t * 0.6 + i);
    words(c, n, 204, 54 + i * 18, 10, '#333');
    words(c, `${dd >= 0 ? '+' : ''}${dd.toFixed(1)}%`, 312, 54 + i * 18, 10, dd >= 0 ? '#c62828' : '#1565c0', 'right');
  });
  for (let i = 0; i < 4; i++) {
    rect(c, 12, 142 + i * 14, 296, 10, '#e5e8ee');
    words(c, pick(HEADS, i + Math.floor(typed / 3)), 16, 147 + i * 14, 7.5, '#3a4658');
  }
}
function pcTranslate(c: Painter, typed: number) {
  frame(c, '번역 일감: 달빛 등대.docx', '#ffffff');
  rect(c, 160, 18, 1, 182, '#cfd6e0');
  SOURCE.forEach((s, i) => words(c, s, 10, 36 + i * 22, 9.5, '#3a4658'));
  let left = Math.floor(typed * 4) % 66;
  TARGET.forEach((s, i) => {
    if (left <= 0) return;
    words(c, s.slice(0, left), 168, 36 + i * 22, 10.5, '#1d2c44');
    left -= s.length;
  });
  rect(c, 0, 186, 320, 14, '#eef1f6');
  words(c, `${Math.min(100, Math.floor(typed * 4))}% 완료`, 10, 193, 8, '#556');
}
function pcJobs(c: Painter, typed: number, quit: boolean) {
  if (quit) {
    frame(c, '사직서.문서', '#fffdf6');
    words(c, '사 직 서', 160, 44, 18, '#222', 'center');
    words(c, '일신상의 사유로 사직하고자 합니다.', 160, 90, 11, '#333', 'center');
    words(c, '그동안 감사했습니다.', 160, 112, 11, '#333', 'center');
    return;
  }
  frame(c, '말랑 일자리', '#f3f5f9', '#2c6e49');
  const top = Math.floor(typed / 2);
  for (let i = 0; i < 5; i++) {
    const [co, role] = pick(JOBS, top + i);
    rect(c, 10, 26 + i * 34, 300, 30, '#fff');
    words(c, role, 18, 36 + i * 34, 11, '#223');
    words(c, co, 18, 48 + i * 34, 8, '#778');
    words(c, '지원', 296, 41 + i * 34, 9, '#2c6e49', 'right');
  }
}
export type PcMode = 'game' | 'drill' | 'chat' | 'book' | 'code' | 'tutorial' | 'call' | 'news' | 'translate' | 'jobs' | 'quit';
/** A frame of a computer's screen: `typed` is how long the hands have been at it. */
export function paintPc(c: Painter, w: number, h: number, mode: PcMode, t: number, typed: number) {
  c.save();
  c.scale(w / 320, h / 200);
  switch (mode) {
    case 'game': pcGame(c, t, typed); break;
    case 'drill': pcDrill(c, t, typed); break;
    case 'chat': pcChat(c, typed); break;
    case 'book': pcBook(c, typed); break;
    case 'code': pcCode(c, typed, false); break;
    case 'tutorial': pcCode(c, typed, true); break;
    case 'call': pcCall(c, t, typed); break;
    case 'news': pcNews(c, t, typed); break;
    case 'translate': pcTranslate(c, typed); break;
    case 'jobs': pcJobs(c, typed, false); break;
    case 'quit': pcJobs(c, typed, true); break;
  }
  c.restore();
}
/** The gaming machine's second screen: the stats going by. */
export function paintSide(c: Painter, w: number, h: number, t: number) {
  c.save();
  c.scale(w / 200, h / 200);
  rect(c, 0, 0, 200, 200, '#141722');
  words(c, '시스템', 10, 14, 11, '#9fd2ff');
  for (const [i, n] of ['그래픽', '처리기', '온도'].entries()) {
    const u = 0.5 + 0.35 * Math.sin(t * (0.7 + i * 0.4) + i);
    words(c, n, 10, 36 + i * 30, 9, '#c9d3e6');
    rect(c, 10, 44 + i * 30, 180, 8, '#2a2f40');
    rect(c, 10, 44 + i * 30, 180 * u, 8, ['#7bffb0', '#ffd166', '#ff8fa3'][i]);
  }
  words(c, '친구 접속', 10, 136, 10, '#9fd2ff');
  for (const [i, n] of ['솜뭉치', '별똥이', '왕방울'].entries()) {
    circle(c, 16, 152 + i * 16, 4, fract(t * 0.1 + i * 0.3) < 0.7 ? '#7bffb0' : '#566');
    words(c, n, 26, 152 + i * 16, 9, '#e6e9f0');
  }
  c.restore();
}
/** The microscope's little screen: what's on the stage coming in and out of focus. */
export function paintField(c: Painter, w: number, h: number, t: number, focus: number, kind: number) {
  c.save();
  c.scale(w / 160, h / 120);
  rect(c, 0, 0, 160, 120, '#0d0f13');
  const f = Math.max(0, Math.min(1, focus));
  circle(c, 80, 60, 56, '#f4efd2');
  c.globalAlpha = 0.45 + 0.55 * f;
  const cols = pick(['#a8c97a', '#d58ab0', '#7ab0d5'], kind);
  for (let i = 0; i < 11; i++) {
    const a = i * 2.399 + kind;
    const r = 8 + 40 * Math.sqrt((i + 0.5) / 11);
    const x = 80 + r * Math.cos(a) + 1.5 * Math.sin(t * 0.8 + i);
    const y = 60 + r * Math.sin(a) + 1.5 * Math.cos(t * 0.7 + i);
    const size = 7 + (1 - f) * 7;
    circle(c, x, y, size, cols);
    if (f > 0.55) circle(c, x + 1, y - 1, size * 0.34, '#4a3a5a');
  }
  c.globalAlpha = 1;
  words(c, `${pick(['양파 표피', '꽃가루', '연못 물'], kind)} ×${100 + (kind % 3) * 100}`, 6, 112, 8, '#ffe9a8');
  c.restore();
}
const SIGNS = ['말랑시 3km', '구름다리', '솜마을 입구', '천천히'];
/** The road ahead: its bend follows gbRoad, so the wheel turns with it. */
export function paintRoad(c: Painter, w: number, h: number, t: number) {
  c.save();
  c.scale(w / 320, h / 180);
  const dusk = fract(t / 90) > 0.6;
  rect(c, 0, 0, 320, 84, dusk ? '#f0a06f' : '#9bd6f3');
  rect(c, 0, 84, 320, 96, dusk ? '#5d7a4a' : '#7cb36a');
  const bend = gbRoad(t);
  const span = 10;
  for (let i = 0; i < span; i++) {
    const a = i / span;
    const b = (i + 1) / span;
    const xOf = (u: number) => 160 + bend * 110 * (1 - u) * (1 - u);
    const y0 = 84 + a * a * 96;
    const y1 = 84 + b * b * 96;
    const w0 = 12 + a * a * 150;
    const w1 = 12 + b * b * 150;
    const xa = 160 + bend * 110 * (1 - a) * (1 - a);
    const xb = xOf(b);
    c.fillStyle = '#50545c';
    c.beginPath();
    c.moveTo(xa - w0, y0);
    c.lineTo(xa + w0, y0);
    c.lineTo(xb + w1, y1);
    c.lineTo(xb - w1, y1);
    c.closePath();
    c.fill();
    if (fract(a * 4 - t * 1.6) < 0.5) rect(c, (xa + xb) / 2 - 1 - a * 2, y0, 2 + a * 4, y1 - y0 + 0.5, '#fff6b0');
  }
  const k = Math.floor(t / 7);
  const u = fract(t / 7);
  const sy = 90 + u * u * 40;
  const sx = 160 + (k % 2 ? 1 : -1) * (40 + u * u * 120) + bend * 60 * (1 - u);
  rect(c, sx - 1, sy, 2, 12 + u * 18, '#555');
  rect(c, sx - 14 - u * 18, sy - 8 - u * 8, 28 + u * 36, 10 + u * 10, '#2d6e4f');
  words(c, pick(SIGNS, k), sx, sy - 3 - u * 3, 6 + u * 7, '#fff', 'center');
  rect(c, 0, 0, 320, 18, 'rgba(0,0,0,0.45)');
  words(c, `${40 + Math.floor(12 * (1 + Math.sin(t * 0.3)))} km/h`, 10, 9, 10, '#fff');
  words(c, '기초 코스', 310, 9, 9, '#ffe9a8', 'right');
  c.restore();
}
const GOALS = ['올해 안에 책 12권 읽기', '매주 토요일 달리기', '용돈 절반 저축하기', '새 요리 다섯 가지'];
/**
 * The whiteboard: the goals written as far as the marker's got (`done` lines, `along` the one it's on), each ticked when
 * `ticks` get there; on the right a chart of the month's steps. Painted in the board's own 512 × 512.
 */
export function paintBoard(c: Painter, w: number, h: number, done: number, along: number, ticks: number, pointing: boolean) {
  c.save();
  c.scale(w / 512, h / 512);
  rect(c, 0, 0, 512, 512, '#fbfcf9');
  words(c, '이번 달 목표', 36, 40, 26, '#2a4c8f');
  line(c, 36, 62, 260, 62, '#2a4c8f', 3);
  GOALS.forEach((g, i) => {
    if (i > done) return;
    const n = i < done ? g.length : Math.floor(g.length * Math.max(0, Math.min(1, along)));
    const y = 110 + i * 56;
    words(c, g.slice(0, n), 36, y, 20, '#2b2b2b');
    if (i < ticks) words(c, '✓', 14, y, 22, '#2e8b57');
  });
  // The chart on the right half.
  words(c, '걸음 수', 340, 40, 20, '#a23b3b');
  line(c, 320, 250, 490, 250, '#555', 3);
  line(c, 320, 70, 320, 250, '#555', 3);
  const bars = [60, 90, 75, 120, 150];
  bars.forEach((b, i) => rect(c, 334 + i * 30, 250 - b, 22, b, i === 4 && pointing ? '#e0584b' : '#e8a3a0'));
  words(c, '발표: 우리 집 이번 달', 36, 370, 22, '#a0651a');
  for (let i = 0; i < 3; i++) {
    circle(c, 46, 412 + i * 34, 5, '#a0651a');
    words(c, ['저축이 늘었어요', '걸음이 늘었어요', '다음 달엔 더!'][i], 62, 412 + i * 34, 18, '#444');
  }
  c.restore();
}
const SUBJECTS: Record<string, { cover: string; title: string; lines: string[]; draw?: 'body' | 'chart' | 'scales' | 'org' | 'atom' | 'sign' | 'math' | 'abc' }> = {
  medicine: { cover: '#a03d4a', title: '우리 몸 이야기', lines: ['심장은 하루에 십만 번 뛴다', '혈액은 온몸을 한 바퀴 돈다'], draw: 'body' },
  science: { cover: '#2f6b8f', title: '과학 교양', lines: ['물은 얼면 부피가 는다', '빛은 프리즘에서 갈라진다'], draw: 'atom' },
  law: { cover: '#5a4632', title: '생활 속 법', lines: ['제1조 계약은 지켜야 한다', '제2조 말로 한 약속도 약속'], draw: 'scales' },
  business: { cover: '#2e7d4f', title: '경제 첫걸음', lines: ['수요가 늘면 값이 오른다', '이익 = 매출 - 비용'], draw: 'chart' },
  lead: { cover: '#7a5a2a', title: '함께 일하기', lines: ['먼저 듣고 그다음 말한다', '칭찬은 여럿 앞에서'], draw: 'org' },
  language: { cover: '#3f4c9c', title: 'Français 1', lines: ['bonjour 안녕하세요', 'merci 고맙습니다'], draw: 'abc' },
  case: { cover: '#3a2a22', title: '생활 법률 사례집', lines: ['사례 12. 이웃집 나무가 넘어와', '사례 13. 환불해 주지 않는 가게'], draw: 'scales' },
  road: { cover: '#c9861f', title: '도로 규칙 문제집', lines: ['문제 7. 이 표지판의 뜻은?', '① 정지 ② 서행 ③ 양보'], draw: 'sign' },
  home: { cover: '#4f7a9c', title: '오늘의 숙제', lines: ['12 × 7 = 84', '36 ÷ 4 = 9'], draw: 'math' },
};
export const SUBJECT_KEYS = Object.keys(SUBJECTS);
/** A page of a subject's book (never changes, so painted once). */
export function paintPage(c: Painter, w: number, h: number, key: string) {
  const s = SUBJECTS[key] ?? SUBJECTS.home;
  c.save();
  c.scale(w / 128, h / 180);
  rect(c, 0, 0, 128, 180, PAPER);
  words(c, s.title, 64, 14, 9, s.cover, 'center');
  line(c, 10, 22, 118, 22, s.cover, 1);
  const cx = 64;
  const cy = 62;
  c.strokeStyle = s.cover;
  c.lineWidth = 2;
  switch (s.draw) {
    case 'body':
      circle(c, cx, cy - 26, 10, '#e8c5a8');
      rect(c, cx - 12, cy - 15, 24, 34, '#e8c5a8');
      circle(c, cx - 2, cy - 4, 5, '#c63d3d');
      rect(c, cx - 9, cy + 19, 7, 18, '#e8c5a8');
      rect(c, cx + 2, cy + 19, 7, 18, '#e8c5a8');
      break;
    case 'atom':
      circle(c, cx, cy, 6, s.cover);
      for (const a of [0, 1.05, 2.1]) line(c, cx - 28 * Math.cos(a), cy - 28 * Math.sin(a), cx + 28 * Math.cos(a), cy + 28 * Math.sin(a), '#7aa0b8', 1.4);
      break;
    case 'scales':
      line(c, cx, cy - 28, cx, cy + 24, s.cover, 2.4);
      line(c, cx - 30, cy - 20, cx + 30, cy - 20, s.cover, 2.4);
      for (const k of [-1, 1]) circle(c, cx + k * 30, cy - 2, 9, '#c9a24b');
      break;
    case 'chart':
      for (let i = 0; i < 5; i++) rect(c, 28 + i * 16, cy + 26 - (14 + i * 9), 11, 14 + i * 9, s.cover);
      break;
    case 'org':
      rect(c, cx - 14, cy - 28, 28, 12, s.cover);
      line(c, cx, cy - 16, cx, cy - 4, s.cover, 1.4);
      for (const k of [-1, 0, 1]) rect(c, cx + k * 34 - 12, cy - 4, 24, 12, '#bfa77a');
      break;
    case 'abc':
      words(c, 'A a B b', cx, cy - 12, 16, s.cover, 'center');
      words(c, 'C c D d', cx, cy + 12, 16, s.cover, 'center');
      break;
    case 'sign':
      circle(c, cx, cy, 24, '#c62828');
      rect(c, cx - 16, cy - 4, 32, 8, '#fff');
      break;
    case 'math':
      words(c, '∑ ÷ × √', cx, cy, 15, s.cover, 'center');
      break;
  }
  s.lines.forEach((t, i) => words(c, t, 8, 112 + i * 14, 6.6, '#3a332c'));
  for (let i = 0; i < 2; i++) rect(c, 8, 144 + i * 11, 112 - i * 22, 2.5, '#c8bfae');
  c.restore();
}
const SQUARES = ['출발', '구름상가', '말랑시장', '기회', '솜사탕집', '별빛역', '세금', '방울빵집', '쉼터', '달빛호텔', '기회', '꿈꾸는공장', '은행', '무지개길', '세금', '왕방울타워'];
const SQUARE_COLS = ['#f4d35e', '#e57373', '#e57373', '#90caf9', '#81c784', '#81c784', '#bdbdbd', '#ffb74d', '#f4d35e', '#ffb74d', '#90caf9', '#ba68c8', '#bdbdbd', '#ba68c8', '#bdbdbd', '#4fc3f7'];

// -------------------------------------------------------------------------------------------------
// What goes in the hand.

function pics(paint: (c: Painter, W: number, H: number) => void, W: number, H: number) {
  const m = new THREE.MeshBasicMaterial({ map: canvasTexture(W, H, (c) => paint(c as unknown as Painter, W, H)) });
  return m;
}
/** A canvas repainted when asked (no more than `fps`), on its material. Outside a browser, nothing. */
class LivePicture {
  readonly mat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  private tex: THREE.CanvasTexture | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private last = -1e9;
  constructor(readonly w: number, readonly h: number, private readonly fps = 12) {
    if (typeof document === 'undefined') return;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    this.ctx = canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.mat.map = this.tex;
  }
  draw(t: number, paint: (c: Painter, w: number, h: number) => void, force = false) {
    if (!this.ctx || !this.tex) return;
    if (!force && Math.abs(t - this.last) < 1 / this.fps) return;
    this.last = t;
    paint(this.ctx as unknown as Painter, this.w, this.h);
    this.tex.needsUpdate = true;
  }
}

interface ToolDef {
  obj: THREE.Object3D;
  rest: { at: V; y: V; z?: V };
  lead: Side;
  grips: Partial<Record<Side, Grip>>;
}
const NO_INK = { outline: false } as const;
const bare = (g: THREE.Object3D, geom: THREE.BufferGeometry, color: string, x: number, y: number, z: number, o: O = {}) => part(g, geom, color, x, y, z, { ...o, ...NO_INK });

/** A pen: its grip at the origin, the tip 4.5 cm down -y, the end up +y. */
function makePen(g: THREE.Object3D, color = '#2b4c7e'): THREE.Group {
  const t = group(g, 0, 0, 0, 'pen');
  bare(t, cyl(0.0048, 0.0048, 0.11, 8), color, 0, 0.02, 0);
  bare(t, cyl(0.005, 0.0012, 0.018, 8), '#d9d9d9', 0, -0.044, 0);
  bare(t, cyl(0.0052, 0.0052, 0.012, 8), STEEL, 0, 0.078, 0);
  return t;
}
const penGrip: Grip = { at: v(0, 0, 0), axis: v(0, 1, 0), shape: 'pen', radius: 0.005, writes: -0.053 };
function makeMarker(g: THREE.Object3D): THREE.Group {
  const t = group(g, 0, 0, 0, 'marker');
  bare(t, cyl(0.009, 0.009, 0.1, 8), '#f4f4f0', 0, 0.015, 0);
  bare(t, cyl(0.0095, 0.0095, 0.03, 8), '#1f5fbf', 0, 0.07, 0);
  bare(t, cyl(0.009, 0.003, 0.018, 8), '#1f5fbf', 0, -0.045, 0);
  return t;
}
function makePointer(g: THREE.Object3D): THREE.Group {
  const t = group(g, 0, 0, 0, 'pointer');
  bare(t, cyl(0.012, 0.012, 0.11, 8), WALNUT, 0, 0, 0);
  bare(t, cyl(0.004, 0.008, 0.4, 8), STEEL, 0, 0.25, 0);
  bare(t, dot(0.008), '#d33', 0, 0.45, 0);
  return t;
}
/** A pipette: held at the bulb's foot, the tip down -y. */
function makePipette(g: THREE.Object3D): THREE.Group {
  const t = group(g, 0, 0, 0, 'pipette');
  bare(t, dot(0.016), '#d3584f', 0, 0.035, 0);
  bare(t, cyl(0.006, 0.006, 0.05, 8), '#e6f2f6', 0, 0, 0);
  bare(t, cyl(0.006, 0.0015, 0.1, 8), '#e6f2f6', 0, -0.07, 0);
  return t;
}
/** A hand saw: the handle along +y at the origin, the blade away from the hand along -z and down. */
function makeSaw(g: THREE.Object3D): THREE.Group {
  const t = group(g, 0, 0, 0, 'saw');
  bare(t, rbox(0.022, 0.1, 0.03, 0.008), OAK_DARK, 0, 0, 0);
  bare(t, box(0.0025, 0.08, 0.3), STEEL, 0, -0.02, -0.17);
  bare(t, box(0.003, 0.008, 0.3), '#7f8892', 0, -0.062, -0.17);
  return t;
}
/** A jack plane: its back handle up at the origin; sole on the wood at y -0.075. */
function makePlane(g: THREE.Object3D): THREE.Group {
  const t = group(g, 0, 0, 0, 'plane');
  bare(t, box(0.05, 0.022, 0.2), '#5e6670', 0, -0.066, -0.06);
  bare(t, box(0.05, 0.03, 0.16), OAK, 0, -0.04, -0.06);
  bare(t, box(0.04, 0.05, 0.004), STEEL, 0, -0.03, -0.07, { rx: 0.7 });
  bare(t, rbox(0.024, 0.07, 0.03, 0.01), OAK_DARK, 0, 0.0, 0.0, { rx: 0.2 });
  bare(t, dot(0.022), OAK_DARK, 0, -0.012, -0.13);
  return t;
}
/** A chisel: the handle on +y, the blade down -y. */
function makeChisel(g: THREE.Object3D): THREE.Group {
  const t = group(g, 0, 0, 0, 'chisel');
  bare(t, cyl(0.014, 0.012, 0.11, 8), OAK, 0, 0.01, 0);
  bare(t, cyl(0.0145, 0.0145, 0.008, 8), STEEL, 0, -0.05, 0);
  bare(t, box(0.02, 0.1, 0.004), STEEL, 0, -0.1, 0);
  return t;
}
/** A flat file: the handle at the origin, the blade along -y. */
function makeFile(g: THREE.Object3D): THREE.Group {
  const t = group(g, 0, 0, 0, 'file');
  bare(t, cyl(0.014, 0.012, 0.09, 8), '#8d3a2c', 0, 0, 0);
  bare(t, box(0.022, 0.2, 0.005), '#6d747b', 0, -0.15, 0);
  return t;
}
function makeDriver(g: THREE.Object3D): THREE.Group {
  const t = group(g, 0, 0, 0, 'driver');
  bare(t, cyl(0.014, 0.012, 0.085, 8), '#d6452f', 0, 0.02, 0);
  bare(t, cyl(0.003, 0.003, 0.09, 6), STEEL, 0, -0.065, 0);
  return t;
}
/** A spanner: the handle along +y from the origin, the jaw 16 cm on. */
function makeSpanner(g: THREE.Object3D): THREE.Group {
  const t = group(g, 0, 0, 0, 'spanner');
  bare(t, rbox(0.022, 0.2, 0.008, 0.003), STEEL, 0, 0.06, 0);
  bare(t, new THREE.TorusGeometry(0.024, 0.009, 6, 10, Math.PI * 1.4), STEEL, 0, 0.17, 0, { rz: -0.6 }).userData.ownGeometry = true;
  return t;
}

/** Where a tool is put: at a place, its +y along `y`; with `z`, the rest of it too; spun about its length. */
function place(o: THREE.Object3D, at: V, y: V, z?: V, spin = 0) {
  o.position.set(at[0], at[1], at[2]);
  const Y = v(y[0], y[1], y[2]);
  if (Y.lengthSq() < 1e-8) Y.set(0, 1, 0);
  Y.normalize();
  if (z) {
    const Z = v(z[0], z[1], z[2]).addScaledVector(Y, -(z[0] * Y.x + z[1] * Y.y + z[2] * Y.z));
    if (Z.lengthSq() > 1e-6) {
      Z.normalize();
      const X = new THREE.Vector3().crossVectors(Y, Z);
      o.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
    } else o.quaternion.setFromUnitVectors(UP, Y);
  } else o.quaternion.setFromUnitVectors(UP, Y);
  if (spin) o.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(UP, spin));
}
/** The tools of a piece this frame: the one the beat has in the hand, the rest in their places. */
function runTools(g: THREE.Object3D, tools: Record<string, ToolDef>, s: Spot | null, n: GbNow | null) {
  const now = n?.tool ?? null;
  for (const [name, d] of Object.entries(tools)) {
    if (!now || now.name !== name) place(d.obj, d.rest.at, d.rest.y, d.rest.z);
  }
  if (!s || !n || !now) return;
  const d = tools[now.name];
  if (!d) return;
  place(d.obj, now.at, now.y, now.z, now.spin);
  const free: HeldTool['free'] = {};
  if (!d.grips.left) free.left = g.localToWorld(v(n.l[0], n.l[1], n.l[2]));
  if (!d.grips.right) free.right = g.localToWorld(v(n.r[0], n.r[1], n.r[2]));
  s.held = { tool: d.obj, lead: d.lead, grips: d.grips, resting: now.resting, lean: n.lean, nod: n.nod, free, freeShape: n.shape };
}

// -------------------------------------------------------------------------------------------------
// Spots.

const seatSpot = (g: THREE.Object3D, m: GbMotion, y: number, z: number): Spot => {
  const s = spot(g, 'sit', 0, y, z, Math.PI);
  s.motion = m;
  return s;
};
const standSpot = (g: THREE.Object3D, m: GbMotion, x: number, z: number): Spot => {
  const s = spot(g, 'stand', x, 0, z, Math.PI);
  s.motion = m;
  return s;
};
const heightOf = (s: Spot) => (s.at.userData.height as number | undefined) ?? 1.6;
interface Live {
  id: string;
  m: GbMotion;
  s: Spot;
  time: number;
  n: GbNow;
}
function liveOf(uses: Array<[string, GbMotion, Spot]>, t: number): Live | null {
  for (const [id, m, s] of uses) {
    const time = gbLive(s, t);
    if (time !== null) return { id, m, s, time, n: gbNow(m, time, heightOf(s), t) };
  }
  return null;
}

/** A desk's chair, in its own group out over the front. */
function chair(g: THREE.Object3D, z: number, y: number, color: string, gaming = false) {
  const c = group(g, 0, 0, z);
  c.rotation.y = Math.PI;
  bit(c, cyl(0.03, 0.035, y - 0.14, 8), STEEL, 0, (y - 0.14) / 2 + 0.08, 0);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    bit(c, box(0.04, 0.025, 0.22), GREY, Math.sin(a) * 0.1, 0.08, Math.cos(a) * 0.1, { ry: a });
    bit(c, dot(0.025), BLACK, Math.sin(a) * 0.21, 0.03, Math.cos(a) * 0.21);
  }
  part(c, rbox(0.46, 0.08, 0.44, 0.04), color, 0, y - 0.05, 0);
  part(c, rbox(0.44, gaming ? 0.62 : 0.42, 0.07, 0.04), color, 0, y + (gaming ? 0.34 : 0.26), -0.22, { rx: -0.08 });
  if (gaming) {
    bit(c, box(0.08, 0.5, 0.012), '#b84cff', -0.13, y + 0.34, -0.183, { rx: -0.08 });
    bit(c, box(0.08, 0.5, 0.012), '#b84cff', 0.13, y + 0.34, -0.183, { rx: -0.08 });
    part(c, rbox(0.2, 0.11, 0.06, 0.03), BLACK, 0, y + 0.6, -0.17, { rx: -0.08 });
  }
  return c;
}

// -------------------------------------------------------------------------------------------------
// The computers.

const PC_USES: Array<[string, GbMotion, PcMode]> = [
  ['game', 'gbGame', 'game'], ['gameTraining', 'gbDrill', 'drill'], ['chat', 'gbChat', 'chat'], ['writeBook', 'gbWriteBook', 'book'], ['study', 'gbCode', 'code'], ['tutorial', 'gbTutorial', 'tutorial'],
  ['onlineLanguage', 'gbCall', 'call'], ['economyNews', 'gbNews', 'news'], ['translateGig', 'gbTranslate', 'translate'], ['findJob', 'gbJobs', 'jobs'], ['quitJob', 'gbJobs', 'quit'],
];

function pcDesk(g: THREE.Group, W: number, out: Built, gaming: boolean) {
  const wood = gaming ? '#2a2733' : OAK;
  const dep = DK.front + 0.47;
  const z = DK.front - dep / 2;
  part(g, rbox(W - 0.06, 0.05, dep, 0.015), wood, 0, DK.top - 0.025, z);
  if (gaming) {
    // Steel legs and a mat right across the top, a strip of light under the front edge.
    for (const s of [-1, 1]) {
      part(g, box(0.06, DK.top - 0.05, 0.5), BLACK, s * (W / 2 - 0.09), (DK.top - 0.05) / 2, z);
      bit(g, box(0.1, 0.03, 0.56), GREY, s * (W / 2 - 0.09), 0.015, z);
    }
    bit(g, box(W - 0.16, 0.004, 0.32), '#191a22', 0, DK.top + 0.002, 0.02 - 0.05);
  } else {
    // Drawers on the right, a leg and a back on the left.
    part(g, rbox(0.34, DK.top - 0.05, dep - 0.04, 0.01), shade(wood, 0.86), W / 2 - 0.2, (DK.top - 0.05) / 2, z);
    for (const y of [0.17, 0.38, 0.58]) {
      bit(g, box(0.3, 0.17, 0.006), shade(wood, 0.95), W / 2 - 0.2, y, DK.front - 0.04 + 0.022);
      bit(g, box(0.09, 0.012, 0.012), BRASS, W / 2 - 0.2, y, DK.front - 0.04 + 0.032);
    }
    part(g, box(0.04, DK.top - 0.05, dep - 0.06), shade(wood, 0.86), -(W / 2 - 0.05), (DK.top - 0.05) / 2, z);
    bit(g, box(W - 0.14, 0.42, 0.02), shade(wood, 0.74), 0, 0.5, -0.44);
  }
  out.seat = marker(g, 0, DK.seatY, DK.seatZ);
  chair(g, DK.seatZ, DK.seatY, gaming ? '#3a2f56' : '#7a5c44', gaming);
  out.work = marker(g, 0, DK.top + 0.05, DK.kbL[2]);

  // The screen, with its picture on a canvas in front of the panel, dark unless it's really on.
  const screenW = gaming ? 0.66 : 0.52;
  const screenH = gaming ? 0.38 : 0.32;
  const sy = DK.top + (gaming ? 0.32 : 0.28);
  const sz = -0.3;
  part(g, rbox(screenW + 0.03, screenH + 0.03, 0.03, 0.008), BLACK, gaming ? 0.05 : 0, sy, sz);
  const pc = new LivePicture(320, 200);
  const shown = flat(g, screenW, screenH, pc.mat, gaming ? 0.05 : 0, sy, sz + 0.0165);
  shown.visible = false;
  bit(g, box(0.05, gaming ? 0.16 : 0.13, 0.03), BLACK, gaming ? 0.05 : 0, DK.top + 0.08, sz - 0.03);
  bit(g, cyl(0.1, 0.12, 0.012, 14), BLACK, gaming ? 0.05 : 0, DK.top + 0.008, sz - 0.03);
  const isOn = standby(g, out, gaming ? 0.05 + screenW / 2 - 0.02 : screenW / 2 - 0.02, sy - screenH / 2 - 0.008, sz + 0.019);

  // Keyboard and mouse.
  const keyCol = gaming ? '#14151c' : '#d9d9d2';
  part(g, rbox(0.3, 0.016, 0.11, 0.006), keyCol, 0, DK.top + 0.01, DK.kbL[2], { rx: 0.05 });
  const keyMat = gaming ? basic('#a97cff') : basic('#f4f3ee');
  for (let r = 0; r < 4; r++) for (let k = 0; k < 11; k++) {
    const m = new THREE.Mesh(box(0.019, 0.006, 0.018), keyMat);
    m.position.set(-0.122 + k * 0.0245, DK.top + 0.02 + r * -0.0014, DK.kbL[2] - 0.035 + r * 0.023);
    g.add(m);
  }
  part(g, rbox(0.06, 0.024, 0.1, 0.012), gaming ? '#14151c' : '#e7e6e0', DK.mouse[0], DK.top + 0.012, DK.mouse[2]);
  bit(g, box(0.008, 0.005, 0.02), gaming ? '#ff4fd8' : '#b0afa8', DK.mouse[0], DK.top + 0.025, DK.mouse[2] - 0.025);

  const tools: Record<string, ToolDef> = {
    pen: { obj: makePen(g), rest: { at: DK.penRest, y: [0, 0.02, 1] }, lead: 'right', grips: { right: penGrip } },
  };
  // The notebook the tutorial's notes go in: its words come line by line.
  bit(g, box(0.16, 0.008, 0.21), '#4a6a8f', DK.note[0], DK.top + 0.004, DK.note[2]);
  bit(g, box(0.15, 0.002, 0.2), PAPER, DK.note[0], DK.top + 0.009, DK.note[2]);
  const noteLines: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const m = bit(g, box(0.11 - (i % 3) * 0.015, 0.0012, 0.005), '#3b3f55', DK.note[0], DK.top + 0.0105, DK.note[2] - 0.08 + i * 0.03);
    noteLines.push(m);
    m.visible = false;
  }

  if (gaming) {
    // The second screen, turned in; the tower with its glass and fans; a mic, a headset on its stand, a strip of light.
    const sideX = -0.38;
    const sideG = group(g, sideX, DK.top + 0.27, -0.26);
    sideG.rotation.y = 0.42;
    part(sideG, rbox(0.25, 0.3, 0.025, 0.008), BLACK, 0, 0, 0);
    const side = new LivePicture(200, 200, 6);
    const sideShown = flat(sideG, 0.225, 0.275, side.mat, 0, 0, 0.0135);
    sideShown.visible = false;
    bit(sideG, box(0.04, 0.2, 0.025), BLACK, 0, -0.2, -0.02);
    const tower = group(g, W / 2 - 0.11, DK.top, -0.26);
    part(tower, rbox(0.16, 0.38, 0.32, 0.01), '#14151c', 0, 0.19, 0);
    const fans: THREE.Object3D[] = [];
    const rgb = new THREE.MeshBasicMaterial({ color: '#b84cff' });
    for (const y of [0.1, 0.27]) {
      lit(tower, new THREE.TorusGeometry(0.05, 0.006, 6, 16), rgb, 0, y, 0.161).userData.ownGeometry = true;
      const fan = group(tower, 0, y, 0.162);
      for (let i = 0; i < 3; i++) bit(fan, box(0.024, 0.044, 0.003), '#4a4d55', Math.sin((i / 3) * TAU) * 0.022, Math.cos((i / 3) * TAU) * 0.022, 0, { rz: -(i / 3) * TAU });
      fans.push(fan);
    }
    // Under the desk's front edge.
    const strip = lit(g, box(W - 0.2, 0.012, 0.01), new THREE.MeshBasicMaterial({ color: '#b84cff' }), 0, DK.top - 0.056, DK.front - 0.02);
    const stripMat = strip.material as THREE.MeshBasicMaterial;
    bit(g, cyl(0.018, 0.03, 0.03, 10), BLACK, -0.24, DK.top + 0.015, -0.08);
    bit(g, cyl(0.022, 0.022, 0.075, 10), STEEL, -0.24, DK.top + 0.09, -0.08);
    bit(g, cyl(0.004, 0.006, 0.17, 6), BLACK, W / 2 - 0.26, DK.top + 0.085, -0.06);
    bit(g, new THREE.TorusGeometry(0.052, 0.009, 6, 12, Math.PI), BLACK, W / 2 - 0.26, DK.top + 0.17, -0.06, { ry: Math.PI / 2 }).userData.ownGeometry = true;
    wirePc(g, out, tools, noteLines, pc, shown, isOn, (live, t) => {
      sideShown.visible = !!live && isOn();
      if (live && isOn()) side.draw(t, (c, w, h) => paintSide(c, w, h, t));
      for (const f of fans) f.rotation.z = live ? t * 14 : 0;
      const hue = ((live ? t * 0.1 : 0.76) % 1 + 1) % 1;
      stripMat.color.setHSL(hue, 0.85, live ? 0.6 : 0.28);
      rgb.color.setHSL(hue, 0.85, live ? 0.6 : 0.28);
    });
  } else {
    // A small tower and a homely desk: a mug, a plant, a dictionary, notes on the screen's edge, a mic for the calls.
    const tower = group(g, -W / 2 + 0.16, DK.top, -0.3);
    part(tower, rbox(0.14, 0.3, 0.26, 0.008), '#d7d3c9', 0, 0.15, 0);
    bit(tower, box(0.1, 0.04, 0.004), '#a8a49a', 0, 0.24, 0.131);
    const hdd = bit(tower, dot(0.006), '#ffb300', 0.04, 0.07, 0.132);
    part(g, cyl(0.035, 0.03, 0.08, 12), '#d97a4a', W / 2 - 0.08, DK.top + 0.04, -0.03);
    bit(g, cyl(0.028, 0.028, 0.002, 10), '#5a3a22', W / 2 - 0.08, DK.top + 0.077, -0.03);
    part(g, cyl(0.04, 0.03, 0.06, 10), '#b9704a', W / 2 - 0.08, DK.top + 0.03, -0.34);
    for (let i = 0; i < 6; i++) bit(g, dot(0.03), '#5f9a55', W / 2 - 0.08 + 0.03 * Math.cos(i), DK.top + 0.09 + (i % 3) * 0.02, -0.34 + 0.03 * Math.sin(i * 2));
    bit(g, box(0.06, 0.06, 0.002), '#ffe27a', -0.24, sy - 0.1, sz + 0.0175);
    bit(g, box(0.05, 0.05, 0.002), '#ffb3c1', 0.24, sy + 0.1, sz + 0.0175);
    wirePc(g, out, tools, noteLines, pc, shown, isOn, (live, t) => {
      hdd.scale.setScalar(live && fract(t * 3) < 0.4 ? 1 : 0.4);
    });
  }
  // The dictionary the translating looks things up in, on the left.
  bit(g, box(0.16, 0.05, 0.21), '#6a3a3a', DK.dict[0], DK.top + 0.025, DK.dict[2]);
  bit(g, box(0.15, 0.052, 0.2), PAPER, DK.dict[0] + 0.004, DK.top + 0.025, DK.dict[2]);
  bit(g, box(0.16, 0.006, 0.21), '#6a3a3a', DK.dict[0], DK.top + 0.052, DK.dict[2]);
}

function wirePc(g: THREE.Object3D, out: Built, tools: Record<string, ToolDef>, noteLines: THREE.Mesh[], pc: LivePicture, shown: THREE.Mesh, isOn: () => boolean, extra: (live: Live | null, t: number) => void) {
  const uses: Array<[string, GbMotion, Spot]> = [];
  out.spots = {};
  const modes: Record<string, PcMode> = {};
  for (const [id, m, mode] of PC_USES) {
    const s = seatSpot(g, m, DK.seatY, DK.seatZ);
    out.spots[id] = s;
    uses.push([id, m, s]);
    modes[id] = mode;
  }
  let typed = 0;
  let lastT = 0;
  let was = '';
  let notes = 0;
  out.away = (_o, t) => {
    for (const [, , s] of uses) s.held = null;
    const dt = Math.max(0, Math.min(0.25, t - lastT));
    lastT = t;
    const live = liveOf(uses, t);
    runTools(g, tools, live?.s ?? null, live?.n ?? null);
    if (live) {
      if (live.id !== was) {
        was = live.id;
        typed = 0;
        notes = 0;
      }
      // The screen goes on as the hands do.
      if (live.n.tap || /mouse|scroll|watch|play|aim/.test(live.n.beat)) typed += dt;
      if (live.n.beat === 'note') notes = Math.min(noteLines.length, notes + dt / 1.05);
    } else was = '';
    for (const [i, m] of noteLines.entries()) m.visible = i < notes;
    const on = !!live && isOn();
    shown.visible = on;
    if (on) pc.draw(t, (c, w, h) => paintPc(c, w, h, modes[live!.id], t, typed));
    extra(live, t);
  };
}

const computer: Builder = (g, W, _D, _c, _def, _ctx, out) => pcDesk(g, W, out, false);
const gamingComputer: Builder = (g, W, _D, _c, _def, _ctx, out) => pcDesk(g, W, out, true);

// -------------------------------------------------------------------------------------------------
// The study desk: a hutch of books, a lamp, the open book of the subject, a notebook that fills, word cards.

const DESK_USES: Array<[string, GbMotion, string]> = [
  ['studyMedicine', 'gbRead', 'medicine'], ['studyScience', 'gbWrite', 'science'], ['studyLaw', 'gbRead', 'law'], ['studyBusiness', 'gbWrite', 'business'], ['studyLeadership', 'gbRead', 'lead'], ['studyLanguage', 'gbFlash', 'language'],
  ['readCaseBook', 'gbRead', 'case'], ['roadRulesBook', 'gbWrite', 'road'], ['homework', 'gbWrite', 'home'],
];
const pageCache = new Map<string, THREE.MeshBasicMaterial>();
function pageOf(key: string) {
  let m = pageCache.get(key);
  if (!m) pageCache.set(key, (m = pics((c, W, H) => paintPage(c, W, H, key), 128, 180)));
  return m;
}
const studyDesk: Builder = (g, W, _D, c, _def, _ctx, out) => {
  const wood = c === '#8d6e63' ? OAK : c;
  const dep = DK.front + 0.47;
  const z = DK.front - dep / 2;
  part(g, rbox(W - 0.06, 0.05, dep, 0.015), wood, 0, DK.top - 0.025, z);
  part(g, rbox(0.34, DK.top - 0.05, dep - 0.04, 0.01), shade(wood, 0.86), W / 2 - 0.2, (DK.top - 0.05) / 2, z);
  for (const y of [0.2, 0.48]) {
    bit(g, box(0.3, 0.24, 0.006), shade(wood, 0.95), W / 2 - 0.2, y, DK.front - 0.018);
    bit(g, cyl(0.012, 0.012, 0.016, 8), BRASS, W / 2 - 0.2, y, DK.front - 0.008, { rx: Math.PI / 2 });
  }
  part(g, box(0.04, DK.top - 0.05, dep - 0.06), shade(wood, 0.86), -(W / 2 - 0.05), (DK.top - 0.05) / 2, z);
  // The hutch: two shelves of books, a clock and a pot of pens.
  const hutchZ = -0.4;
  for (const s of [-1, 1]) part(g, box(0.025, 0.62, 0.16), shade(wood, 0.9), s * (W / 2 - 0.05), DK.top + 0.31, hutchZ);
  part(g, box(W - 0.09, 0.025, 0.17), shade(wood, 0.92), 0, DK.top + 0.62, hutchZ);
  bit(g, box(W - 0.11, 0.02, 0.15), shade(wood, 0.82), 0, DK.top + 0.34, hutchZ);
  bit(g, box(W - 0.11, 0.62, 0.012), shade(wood, 0.72), 0, DK.top + 0.31, hutchZ - 0.075);
  const spines: Array<[string, number, number, number]> = [];
  let x = -W / 2 + 0.1;
  let i = 0;
  while (x < W / 2 - 0.12) {
    const key = SUBJECT_KEYS[i % SUBJECT_KEYS.length];
    const th = 0.024 + (i % 3) * 0.009;
    spines.push([SUBJECTS[key].cover, x + th / 2, 0.17 + ((i * 5) % 4) * 0.02, th]);
    x += th + 0.003;
    i++;
  }
  for (const [col, sx, h, th] of spines) bit(g, box(th, h, 0.11), col, sx, DK.top + 0.36 + h / 2, hutchZ + 0.01);
  for (const [j, [col, sx, h, th]] of spines.entries()) if (sx < 0.06) bit(g, box(th, h * 0.9, 0.11), j % 2 ? tint(col, 0.15) : shade(col, 0.85), sx, DK.top + h * 0.45, hutchZ + 0.01);
  part(g, cyl(0.05, 0.05, 0.02, 14), WALNUT, 0.28, DK.top + 0.06, hutchZ + 0.04, { rx: Math.PI / 2 });
  bit(g, cyl(0.042, 0.042, 0.004, 14), CREAM, 0.28, DK.top + 0.06, hutchZ + 0.051, { rx: Math.PI / 2 });
  part(g, cyl(0.034, 0.028, 0.09, 10), '#4f7a9c', 0.42, DK.top + 0.045, -0.26);
  for (const [k, col] of ['#d6452f', '#2b4c7e', '#3c9a5f'].entries()) bit(g, cyl(0.004, 0.004, 0.13, 6), col, 0.42 + (k - 1) * 0.012, DK.top + 0.1, -0.26, { rz: (k - 1) * 0.16 });

  // The lamp, lit in use.
  const arm = v(-0.4, DK.top + 0.02, -0.24);
  part(g, cyl(0.07, 0.08, 0.018, 14), BLACK, arm.x, arm.y, arm.z);
  rod(g, arm, v(-0.36, DK.top + 0.3, -0.26), 0.008, BRASS);
  rod(g, v(-0.36, DK.top + 0.3, -0.26), v(-0.2, DK.top + 0.38, -0.14), 0.008, BRASS);
  part(g, cyl(0.03, 0.08, 0.07, 12), '#2f6a4f', -0.2, DK.top + 0.36, -0.14, { rz: -0.2 });
  const bulb = lit(g, dot(0.03), basic('#57513f'), -0.2, DK.top + 0.325, -0.14);
  const bulbMat = bulb.material as THREE.MeshBasicMaterial;
  const pool = flat(g, 0.56, 0.5, basic('#ffe9a6', 0.16), -0.05, DK.top + 0.003, -0.08, { rx: -Math.PI / 2 });
  pool.visible = false;
  const isOn = standby(g, out, arm.x + 0.05, arm.y + 0.012, arm.z + 0.03);

  out.seat = marker(g, 0, DK.seatY, DK.seatZ);
  chair(g, DK.seatZ, DK.seatY, '#6d8f7a');
  out.work = marker(g, 0, DK.top + 0.05, DK.book[2]);

  // The open book: covers, pages, the subject's page, and the leaf that turns.
  const book = group(g, DK.book[0], DK.book[1], DK.book[2], 'bookOpen');
  const coverMat = new THREE.MeshToonMaterial({ color: SUBJECTS.home.cover });
  const cover = part(book, box(0.33, 0.006, 0.22), '#fff', 0, -0.008, 0, { outline: false, material: coverMat });
  cover.userData.ownMaterial = true;
  for (const s of [-1, 1]) bit(book, box(0.155, 0.012, 0.205), PAPER, s * 0.08, 0.002, 0);
  const left = lying(book, 0.15, 0.2, pageOf('home'), -0.08, 0.009, 0);
  const right = lying(book, 0.15, 0.2, pageOf('home'), 0.08, 0.009, 0);
  left.userData.ownMaterial = right.userData.ownMaterial = false;
  const leafPivot = group(book, 0, 0.012, 0);
  const leaf = flat(leafPivot, 0.15, 0.2, new THREE.MeshBasicMaterial({ color: '#fbf6e8', side: THREE.DoubleSide }), 0.08, 0, 0, { rx: -Math.PI / 2 });
  leaf.visible = false;
  book.visible = false;
  // Shut, on the desk, until someone reads it.
  const shutBook = bit(g, box(0.16, 0.03, 0.22), '#4f7a9c', DK.book[0] - 0.03, DK.top + 0.015, DK.book[2] - 0.02, { ry: 0.12 });

  // The notebook: its lines come as the pen goes.
  bit(g, box(0.17, 0.008, 0.23), '#c9861f', DK.notebook[0], DK.top + 0.004, DK.notebook[2]);
  bit(g, box(0.16, 0.002, 0.22), PAPER, DK.notebook[0], DK.top + 0.009, DK.notebook[2]);
  const noteLines: THREE.Mesh[] = [];
  for (let j = 0; j < 8; j++) {
    const m = bit(g, box(0.12 - (j % 3) * 0.018, 0.0012, 0.005), '#3b3f55', DK.notebook[0], DK.top + 0.0105, DK.notebook[2] - 0.09 + j * 0.026);
    m.visible = false;
    noteLines.push(m);
  }
  // The word cards, and one that's held up: a word one side, its meaning the other.
  for (let j = 0; j < 7; j++) bit(g, box(0.1, 0.002, 0.14), j % 2 ? CREAM : '#f1e9cf', DK.cards[0], DK.top + 0.003 + j * 0.0025, DK.cards[2]);
  const card = group(g, 0, 0, 0, 'card');
  bare(card, box(0.1, 0.14, 0.002), CREAM, 0, 0, 0);
  flat(card, 0.09, 0.13, pics((p, w, h) => {
    p.save();
    p.scale(w / 90, h / 130);
    rect(p, 0, 0, 90, 130, CREAM);
    words(p, 'merci', 45, 60, 18, '#2a4c8f', 'center');
    p.restore();
  }, 90, 130), 0, 0, 0.0015);
  flat(card, 0.09, 0.13, pics((p, w, h) => {
    p.save();
    p.scale(w / 90, h / 130);
    rect(p, 0, 0, 90, 130, '#f8eed3');
    words(p, '고맙습니다', 45, 60, 13, '#a0651a', 'center');
    p.restore();
  }, 90, 130), 0, 0, -0.0015, { ry: Math.PI });

  const tools: Record<string, ToolDef> = {
    pen: { obj: makePen(g), rest: { at: DK.deskPen, y: [0, 0.02, 1] }, lead: 'right', grips: { right: penGrip } },
    card: { obj: card, rest: { at: [DK.cards[0], DK.top + 0.024, DK.cards[2]], y: [0, 0.02, 1], z: [0, 1, 0] }, lead: 'left', grips: { left: { at: v(0, -0.05, 0), axis: v(1, 0, 0), shape: 'pinch', radius: 0.003 } } },
  };

  const uses: Array<[string, GbMotion, Spot]> = [];
  out.spots = {};
  const subject: Record<string, string> = {};
  for (const [id, m, key] of DESK_USES) {
    const s = seatSpot(g, m, DK.seatY, DK.seatZ);
    out.spots[id] = s;
    uses.push([id, m, s]);
    subject[id] = key;
  }
  let was = '';
  let lastT = 0;
  let written = 0;
  out.away = (_o, t) => {
    for (const [, , s] of uses) s.held = null;
    const dt = Math.max(0, Math.min(0.25, t - lastT));
    lastT = t;
    const live = liveOf(uses, t);
    runTools(g, tools, live?.s ?? null, live?.n ?? null);
    const on = !!live && isOn();
    bulbMat.color.set(on ? '#fff3c4' : '#57513f');
    pool.visible = on;
    book.visible = !!live;
    shutBook.visible = !live;
    leaf.visible = false;
    if (!live) {
      was = '';
      for (const m of noteLines) m.visible = false;
      return;
    }
    if (live.id !== was) {
      was = live.id;
      written = 0;
      const key = subject[live.id];
      coverMat.color.set(SUBJECTS[key].cover);
      left.material = right.material = pageOf(key);
    }
    if (live.n.beat === 'write') written = Math.min(noteLines.length, written + dt / 1.8);
    for (const [j, m] of noteLines.entries()) m.visible = j < written;
    if (live.n.beat === 'turn') {
      leaf.visible = true;
      leafPivot.rotation.z = live.n.k * Math.PI;
    }
  };
};

// -------------------------------------------------------------------------------------------------
// The microscope.

const microscope: Builder = (g, W, _D, _c, _def, _ctx, out) => {
  const dep = 0.62;
  const z = 0.13 - dep / 2;
  part(g, rbox(W - 0.08, 0.04, dep, 0.012), WALNUT, 0, MS.top - 0.02, z);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) bit(g, cyl(0.022, 0.018, MS.top - 0.04, 8), shade(WALNUT, 0.8), sx * (W / 2 - 0.1), (MS.top - 0.04) / 2, z + sz * (dep / 2 - 0.05));
  bit(g, box(W - 0.2, 0.02, dep - 0.14), shade(WALNUT, 0.85), 0, 0.22, z);
  for (const [i, col] of ['#7a4436', '#3f6a8a', '#54744e'].entries()) bit(g, box(0.05, 0.2, 0.17), col, -0.28 + i * 0.058, 0.33, z - 0.05);
  // The stool.
  const stool = group(g, 0, 0, MS.seatZ);
  part(stool, cyl(0.17, 0.17, 0.05, 16), OAK, 0, MS.seatY - 0.025, 0);
  for (let i = 0; i < 3; i++) bit(stool, cyl(0.016, 0.02, MS.seatY - 0.05, 6), OAK_DARK, Math.sin((i / 3) * TAU) * 0.12, (MS.seatY - 0.05) / 2, Math.cos((i / 3) * TAU) * 0.12);

  // The microscope: heavy base, arm, stage with a clip, the turret of lenses, a body with two eyepieces leaning to the seat.
  const bx = 0;
  const bz = MS.stage[2];
  const DARK = '#2e3238';
  part(g, rbox(0.18, 0.035, 0.2, 0.012), DARK, bx, MS.top + 0.018, bz - 0.02);
  const lampMat = basic('#55503d');
  lit(g, cyl(0.022, 0.024, 0.012, 10), lampMat, bx, MS.top + 0.044, bz);
  rod(g, v(bx, MS.top + 0.04, bz - 0.09), v(bx, MS.top + 0.26, bz - 0.13), 0.02, DARK);
  rod(g, v(bx, MS.top + 0.26, bz - 0.13), v(bx, MS.top + 0.34, bz - 0.04), 0.02, DARK);
  part(g, box(0.12, 0.012, 0.12), DARK, bx, MS.stage[1] - 0.006, bz);
  bit(g, cyl(0.016, 0.016, 0.014, 10), STEEL, bx, MS.stage[1] - 0.006, bz);
  const stageClip = bit(g, box(0.05, 0.003, 0.012), STEEL, bx - 0.03, MS.stage[1] + 0.002, bz + 0.03);
  stageClip.castShadow = false;
  bit(g, cyl(0.022, 0.018, 0.03, 10), STEEL, bx, MS.stage[1] + 0.03, bz, { rz: 0.0 });
  const turret = group(g, bx, MS.stage[1] + 0.055, bz);
  bit(turret, cyl(0.034, 0.03, 0.022, 12), DARK, 0, 0, 0);
  const lenses = [0, 1, 2];
  for (const i of lenses) bit(turret, cyl(0.009, 0.007, 0.042, 8), i === 0 ? BRASS : STEEL, Math.sin((i / 3) * TAU) * 0.018, -0.03, Math.cos((i / 3) * TAU) * 0.018);
  const head = group(g, bx, MS.top + 0.34, bz - 0.04);
  part(head, rbox(0.075, 0.06, 0.11, 0.015), DARK, 0, 0.02, 0.0);
  for (const s of [-1, 1]) {
    rod(head, v(s * 0.018, 0.04, 0.03), v(s * 0.033, 0.1, 0.11), 0.012, DARK);
    bit(head, cyl(0.016, 0.016, 0.018, 10), BLACK, s * 0.035, 0.108, 0.118, { rx: 0.65 });
  }
  const knobs: THREE.Object3D[] = [];
  for (const sx of [1, -1]) {
    const k = group(g, sx * 0.095, MS.knob[1], MS.knob[2]);
    part(k, cyl(0.024, 0.024, 0.02, 12), BLACK, 0, 0, 0, { rz: Math.PI / 2 });
    bit(k, box(0.022, 0.005, 0.044), GREY, 0, 0, 0);
    knobs.push(k);
  }
  // The little screen that shows what's seen; the tray of slides; the notebook, with the pen on it.
  const screen = new LivePicture(160, 120, 8);
  part(g, rbox(0.2, 0.16, 0.015, 0.006), BLACK, 0.3, MS.top + 0.15, -0.26, { rx: -0.2 });
  const shown = flat(g, 0.18, 0.135, screen.mat, 0.3, MS.top + 0.15, -0.2505, { rx: -0.2 });
  shown.visible = false;
  bit(g, box(0.02, 0.12, 0.02), BLACK, 0.3, MS.top + 0.06, -0.28);
  const isOn = standby(g, out, 0.11, MS.top + 0.018, bz + 0.078);
  part(g, rbox(0.13, 0.015, 0.09, 0.004), OAK_DARK, MS.tray[0], MS.top + 0.008, MS.tray[2]);
  const trayed: THREE.Mesh[] = [];
  for (const i of [0, 1, 2, 3]) trayed.push(bit(g, box(0.09, 0.002, 0.018), '#d7e6ea', MS.tray[0], MS.top + 0.017, MS.tray[2] - 0.03 + i * 0.021));
  bit(g, box(0.18, 0.008, 0.23), '#44604b', MS.note[0], MS.top + 0.004, MS.note[2]);
  bit(g, box(0.17, 0.002, 0.22), PAPER, MS.note[0], MS.top + 0.009, MS.note[2]);
  const sketch = lying(g, 0.13, 0.13, pics((c, w, h) => {
    c.save();
    c.scale(w / 64, h / 64);
    rect(c, 0, 0, 64, 64, PAPER);
    c.globalAlpha = 0.8;
    for (let i = 0; i < 8; i++) circle(c, 32 + 22 * Math.cos(i * 2.4), 32 + 22 * Math.sin(i * 2.4), 6, '#8ba878');
    c.restore();
  }, 64, 64), MS.note[0], MS.top + 0.0105, MS.note[2] - 0.03);
  sketch.visible = false;
  const slide = group(g, 0, 0, 0, 'slide');
  bare(slide, box(0.09, 0.002, 0.025), '#d7e6ea', 0, 0, 0);
  bare(slide, box(0.02, 0.0024, 0.016), '#c975a3', 0, 0, 0);
  const tools: Record<string, ToolDef> = {
    pen: { obj: makePen(g, '#2e5d41'), rest: { at: MS.pen, y: [0.2, 0.02, 1] }, lead: 'right', grips: { right: penGrip } },
    slide: { obj: slide, rest: { at: [MS.tray[0], MS.top + 0.019, MS.tray[2] - 0.03 + 0.042], y: [0, 0, 1], z: [1, 0, 0] }, lead: 'right', grips: { right: { at: v(0, 0, -0.012), axis: v(1, 0, 0), shape: 'pinch', radius: 0.003 } } },
  };
  out.work = marker(g, 0, MS.stage[1], bz + 0.05);
  const research = seatSpot(g, 'gbScope', MS.seatY, MS.seatZ);
  const analyze = seatSpot(g, 'gbSlide', MS.seatY, MS.seatZ);
  out.spots = { research, analyze };
  const uses: Array<[string, GbMotion, Spot]> = [['research', 'gbScope', research], ['analyze', 'gbSlide', analyze]];
  out.away = (_o, t) => {
    for (const [, , s] of uses) s.held = null;
    const live = liveOf(uses, t);
    runTools(g, tools, live?.s ?? null, live?.n ?? null);
    const on = !!live && isOn();
    lampMat.color.set(on ? '#fff6d2' : '#55503d');
    shown.visible = on;
    const beat = live?.n.beat ?? '';
    const looking = beat === 'look';
    const focus = looking ? 0.5 + 0.5 * Math.sin((live!.n.time) * 0.8) : 0.3;
    for (const k of knobs) k.rotation.x = looking ? live!.n.time * 1.6 : 0;
    head.position.y = MS.top + 0.34 + (looking ? 0.003 * Math.sin(live!.n.time * 0.8) : 0);
    if (on) screen.draw(t, (c, w, h) => paintField(c, w, h, t, focus, live!.n.round));
    sketch.visible = !!live && (beat === 'note' || beat === 'putPen');
  };
};

// -------------------------------------------------------------------------------------------------
// The anatomy model: half skin and half inside, on a wheeled stand, the heart comes out; a shelf with a practice arm and a chest.

const anatomyModel: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  const SKIN = '#e8c0a0';
  const MEAT = '#c76e62';
  const pz = 0.0;
  // The stand on castors.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    bit(g, box(0.05, 0.025, 0.34), GREY, Math.sin(a) * 0.17, 0.06, Math.cos(a) * 0.17 - 0.1, { ry: a });
    bit(g, dot(0.03), BLACK, Math.sin(a) * 0.32, 0.03, Math.cos(a) * 0.32 - 0.1);
  }
  bit(g, cyl(0.022, 0.022, 0.88, 10), STEEL, 0, 0.5, -0.1);
  // The shelf out in front of it.
  part(g, rbox(0.86, 0.03, 0.34, 0.012), BIRCH, 0, AN.shelf, 0.17);
  bit(g, box(0.05, AN.shelf - 0.06, 0.05), STEEL, -0.36, (AN.shelf - 0.06) / 2 + 0.05, 0.27);
  bit(g, box(0.05, AN.shelf - 0.06, 0.05), STEEL, 0.36, (AN.shelf - 0.06) / 2 + 0.05, 0.27);
  bit(g, box(0.74, 0.02, 0.02), STEEL, 0, 0.14, 0.27);
  bit(g, box(0.02, 0.02, 0.33), STEEL, 0, 0.84, 0.05);
  // The torso.
  const body = group(g, 0, 1.2, pz);
  const shell = new THREE.CapsuleGeometry(0.165, 0.28, 6, 14);
  const backM = part(body, shell, SKIN, 0, 0, -0.05);
  backM.userData.ownGeometry = true;
  backM.scale.set(1, 1, 0.5);
  const front = part(body, shell.clone(), MEAT, 0, 0, 0.015);
  front.userData.ownGeometry = true;
  front.scale.set(0.96, 0.98, 0.4);
  const skinSide = part(body, box(0.15, 0.48, 0.2), SKIN, -0.09, 0, 0.01);
  skinSide.castShadow = false;
  // Ribs over the lungs, organs in their colours.
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.09 - i * 0.002, 0.006, 5, 14, Math.PI), new THREE.MeshToonMaterial({ color: '#efe8d5' }));
    m.userData.ownGeometry = m.userData.ownMaterial = true;
    m.position.set(0.07, 0.16 - i * 0.042, 0.1);
    m.rotation.set(0.2, 0, -0.1);
    body.add(m);
  }
  const lungA = bit(body, dot(0.055), '#e792a0', 0.1, 0.09, 0.09);
  lungA.scale.set(0.95, 1.6, 0.55);
  const lungB = bit(body, dot(0.05), '#de8294', -0.02, 0.09, 0.115);
  lungB.scale.set(0.9, 1.6, 0.5);
  const liver = bit(body, dot(0.06), '#7a3a2e', 0.06, -0.08, 0.1);
  liver.scale.set(1.3, 0.6, 0.55);
  const stomach = bit(body, dot(0.042), '#d4a07c', -0.02, -0.13, 0.11);
  stomach.scale.set(1, 0.8, 0.6);
  for (let i = 0; i < 5; i++) bit(body, new THREE.TorusGeometry(0.018, 0.009, 5, 8), '#c98c78', -0.03 + (i % 3) * 0.04, -0.2 - (i % 2) * 0.025, 0.1, { rx: 0.4 }).userData.ownGeometry = true;
  // The head: half a skull, half a face.
  const head = group(g, 0, 1.58, pz);
  const skull = part(head, dot(0.1), '#e8e0cc', 0, 0, 0);
  skull.scale.set(0.9, 1.1, 1);
  const faceSide = part(head, box(0.09, 0.2, 0.16), SKIN, -0.05, 0, 0.005);
  faceSide.castShadow = false;
  for (const s of [-1, 1]) bit(head, dot(0.015), s > 0 ? BLACK : '#3a2e2a', s * 0.033, 0.015, 0.09);
  bit(g, cyl(0.04, 0.05, 0.08, 10), MEAT, 0, 1.49, pz);
  // The heart: comes out in the hands.
  const heart = group(g, 0, 0, 0, 'heart');
  const hb = bare(heart, dot(0.042), '#c0303a', 0, 0, 0);
  hb.scale.set(1, 1.15, 0.85);
  bare(heart, dot(0.024), '#a0263a', 0.024, 0.04, 0);
  bare(heart, cyl(0.009, 0.009, 0.05, 8), '#3a5a9c', -0.018, 0.055, 0.004);
  // The chart on the left: a body, named.
  const chart = group(g, -0.38, 1.3, -0.1);
  part(chart, box(0.3, 0.46, 0.012), CREAM, 0, 0, 0);
  flat(chart, 0.28, 0.44, pics((c, w, h) => {
    c.save();
    c.scale(w / 140, h / 220);
    rect(c, 0, 0, 140, 220, '#fbf6e8');
    words(c, '우리 몸', 70, 14, 12, '#a03d4a', 'center');
    circle(c, 70, 44, 14, '#e8c5a8');
    rect(c, 54, 60, 32, 66, '#e8c5a8');
    rect(c, 54, 126, 13, 56, '#e8c5a8');
    rect(c, 73, 126, 13, 56, '#e8c5a8');
    circle(c, 66, 80, 6, '#c0303a');
    for (const [i, n] of ['심장', '허파', '간', '위'].entries()) {
      line(c, 72, 78 + i * 10, 104, 40 + i * 28, '#888', 0.8);
      words(c, n, 106, 40 + i * 28, 9, '#333');
    }
    c.restore();
  }, 140, 220), 0, 0, 0.0075);
  bit(chart, box(0.012, 0.2, 0.012), STEEL, 0.16, -0.32, 0);
  bit(g, cyl(0.012, 0.012, 1.14, 6), STEEL, -0.21, 0.61, -0.1);
  rod(g, v(-0.21, 1.14, -0.1), v(-0.24, 1.3, -0.1), 0.012, STEEL);
  // On the shelf: the practice arm, with its bandage; the chest for compressions; the roll.
  const arm = group(g, AN.arm[0], AN.arm[1], AN.arm[2]);
  const armM = part(arm, new THREE.CapsuleGeometry(0.038, 0.26, 4, 10), SKIN, 0, 0, 0, { rz: Math.PI / 2 });
  armM.userData.ownGeometry = true;
  bit(arm, dot(0.042), SKIN, -0.18, 0, 0);
  const bands: THREE.Mesh[] = [];
  for (let i = 0; i < 7; i++) {
    const b = bit(arm, cyl(0.043, 0.043, 0.024, 10), '#fbfbf2', -0.09 + i * 0.03, 0, 0, { rz: Math.PI / 2 });
    b.visible = false;
    bands.push(b);
  }
  const chest = group(g, AN.chest[0], AN.shelf + 0.015, AN.chest[2]);
  part(chest, rbox(0.3, 0.05, 0.22, 0.03), '#596875', 0, 0.025, 0);
  const pad = part(chest, rbox(0.2, 0.05, 0.16, 0.025), SKIN, 0, 0.06, 0);
  const lamp = lit(chest, cyl(0.006, 0.006, 0.006, 8), basic('#573a3a'), 0.12, 0.052, 0.09);
  const lampMat = lamp.material as THREE.MeshBasicMaterial;
  const roll = group(g, 0, 0, 0, 'roll');
  bare(roll, cyl(0.026, 0.026, 0.055, 12), '#fbfbf2', 0, 0, 0);
  bare(roll, cyl(0.012, 0.012, 0.057, 8), '#d6d0bf', 0, 0, 0);

  const heartHome: ToolDef = {
    obj: heart,
    rest: { at: AN.heart, y: [0, 1, 0] },
    lead: 'right',
    grips: { right: { at: v(0.032, 0, 0.01), axis: v(0, 1, 0), shape: 'cradle', radius: 0.04 }, left: { at: v(-0.032, 0, 0.01), axis: v(0, 1, 0), shape: 'cradle', radius: 0.04 } },
  };
  const tools: Record<string, ToolDef> = {
    heart: heartHome,
    roll: { obj: roll, rest: { at: AN.roll, y: [1, 0, 0] }, lead: 'right', grips: { right: { at: v(0, 0, 0), axis: v(0, 1, 0), shape: 'pinch', radius: 0.026 } } },
  };
  out.work = marker(g, 0, 1.2, 0.2);
  const learn = standSpot(g, 'gbAnatomy', 0, AN.st);
  const aid = standSpot(g, 'gbAid', 0, AN.st);
  out.spots = { learnAnatomy: learn, firstAidPractice: aid };
  const uses: Array<[string, GbMotion, Spot]> = [['learnAnatomy', 'gbAnatomy', learn], ['firstAidPractice', 'gbAid', aid]];
  let wrapped = 0;
  let last = 0;
  out.away = (_o, t) => {
    for (const [, , s] of uses) s.held = null;
    const dt = Math.max(0, Math.min(0.25, t - last));
    last = t;
    const live = liveOf(uses, t);
    runTools(g, tools, live?.s ?? null, live?.n ?? null);
    const beat = live?.n.beat ?? '';
    if (beat === 'takeRoll' && live!.n.k < 0.5) wrapped = 0;
    if (beat === 'wrap') wrapped = Math.min(bands.length, wrapped + dt * 0.9);
    if (!live) wrapped = 0;
    for (const [i, b] of bands.entries()) b.visible = i < wrapped;
    const press = beat === 'compress' ? Math.max(0, Math.sin(live!.n.k * 8 * 3.3 * TAU * 0.6)) : 0;
    pad.position.y = 0.06 - 0.016 * press;
    lampMat.color.set(press > 0.7 ? '#58e07e' : '#573a3a');
  };
};

// -------------------------------------------------------------------------------------------------
// The chemistry table: a flask whose liquid turns as the drops go in, a burner, racks of bottles, a notebook.

const chemistrySet: Builder = (g, W, _D, _c, _def, _ctx, out) => {
  const dep = 0.74;
  const z = 0.34 - dep / 2 - 0.1;
  part(g, rbox(W - 0.08, 0.05, dep, 0.012), '#3f4d55', 0, CM.top - 0.025, z);
  // Tiles on the top.
  const tile = canvasTexture(64, 64, (c) => {
    c.fillStyle = '#e9efe9';
    c.fillRect(0, 0, 64, 64);
    c.strokeStyle = '#b8c2ba';
    for (const [x, y] of [[0, 0], [32, 0], [0, 32], [32, 32]]) c.strokeRect(x, y, 32, 32);
  }, 2.5, 2);
  lying(g, W - 0.12, dep - 0.04, new THREE.MeshBasicMaterial({ map: tile }), 0, CM.top + 0.001, z);
  for (const s of [-1, 1]) {
    part(g, box(0.05, CM.top - 0.05, dep - 0.1), OAK_DARK, s * (W / 2 - 0.08), (CM.top - 0.05) / 2, z);
  }
  bit(g, box(W - 0.2, 0.03, 0.36), OAK, 0, 0.26, z);
  for (const [i, col] of ['#9fc5a8', '#c5a59f', '#a5b0cf'].entries()) bit(g, cyl(0.05, 0.05, 0.16, 10), col, -0.24 + i * 0.24, 0.355, z);

  // The back rack: bottles, each with its label.
  part(g, box(W - 0.16, 0.022, 0.12), OAK, 0, CM.top + 0.27, -0.33);
  for (const s of [-1, 1]) bit(g, box(0.02, 0.27, 0.11), OAK, s * (W / 2 - 0.1), CM.top + 0.135, -0.33);
  for (const [i, col] of ['#d3584f', '#4f8dd3', '#5fb26a', '#e0b13b', '#9b6ad3'].entries()) {
    part(g, cyl(0.03, 0.035, 0.1, 10), col, -0.28 + i * 0.14, CM.top + 0.33, -0.33, {});
    bit(g, cyl(0.015, 0.015, 0.025, 8), BLACK, -0.28 + i * 0.14, CM.top + 0.39, -0.33);
    bit(g, box(0.03, 0.035, 0.002), PAPER, -0.28 + i * 0.14, CM.top + 0.33, -0.293);
  }
  // A rack of tubes.
  part(g, box(0.2, 0.02, 0.05), OAK, 0.24, CM.top + 0.08, -0.14);
  for (const s of [-1, 1]) bit(g, box(0.012, 0.08, 0.05), OAK, 0.24 + s * 0.09, CM.top + 0.04, -0.14);
  const tubeCols = ['#e6a0c0', '#a0d0e6', '#d6e6a0', '#f0c080'];
  const tubes: THREE.Mesh[] = [];
  for (const [i, col] of tubeCols.entries()) {
    const m = bit(g, cyl(0.011, 0.011, 0.11, 8), col, 0.17 + i * 0.047, CM.top + 0.07, -0.14);
    tubes.push(m);
  }
  // The bottle the drops come from.
  part(g, cyl(0.045, 0.055, 0.17, 12), '#7fa8c9', CM.bottle[0], CM.top + 0.09, CM.bottle[2]);
  bit(g, cyl(0.02, 0.02, 0.03, 8), STEEL, CM.bottle[0], CM.top + 0.19, CM.bottle[2]);
  bit(g, box(0.06, 0.05, 0.002), PAPER, CM.bottle[0], CM.top + 0.09, CM.bottle[2] + 0.05);
  // The burner, a blue flame in use, and a stand beside it with a wire gauze.
  part(g, cyl(0.04, 0.05, 0.02, 12), STEEL, 0.15, CM.top + 0.01, 0.13);
  part(g, cyl(0.012, 0.015, 0.1, 8), STEEL, 0.15, CM.top + 0.07, 0.13);
  const flameMat = basic('#6fb4ff', 0.8);
  const flame = lit(g, new THREE.ConeGeometry(0.018, 0.08, 8), flameMat, 0.15, CM.top + 0.16, 0.13);
  flame.userData.ownGeometry = true;
  flame.visible = false;
  const isOn = standby(g, out, 0.15, CM.top + 0.016, 0.182);
  // The notebook, with goggles lying by.
  bit(g, box(0.17, 0.006, 0.22), '#2f5563', CM.note[0], CM.top + 0.004, CM.note[2]);
  bit(g, box(0.16, 0.002, 0.21), PAPER, CM.note[0], CM.top + 0.008, CM.note[2]);
  for (let i = 0; i < 5; i++) bit(g, box(0.12 - i * 0.01, 0.0012, 0.004), '#49556a', CM.note[0], CM.top + 0.0095, CM.note[2] - 0.07 + i * 0.026);
  bit(g, new THREE.TorusGeometry(0.03, 0.006, 5, 12), BLACK, -0.3, CM.top + 0.015, 0.14, { rx: Math.PI / 2 }).userData.ownGeometry = true;
  bit(g, new THREE.TorusGeometry(0.03, 0.006, 5, 12), BLACK, -0.235, CM.top + 0.015, 0.14, { rx: Math.PI / 2 }).userData.ownGeometry = true;

  // The flask (its origin at the neck where it's held) and pipette.
  const flask = group(g, 0, 0, 0, 'flask');
  const glass = new THREE.MeshToonMaterial({ color: '#dff2f4', transparent: true, opacity: 0.45 });
  const body = part(flask, new THREE.ConeGeometry(0.075, 0.12, 14, 1, true), '#fff', 0, -0.085, 0, { outline: false, material: glass });
  body.userData.ownGeometry = body.userData.ownMaterial = true;
  const neck = part(flask, cyl(0.016, 0.016, 0.06, 10), '#fff', 0, 0, 0, { outline: false, material: glass });
  neck.userData.ownMaterial = false;
  const liquidMat = new THREE.MeshBasicMaterial({ color: '#7fc4e0' });
  const liquid = new THREE.Mesh(new THREE.ConeGeometry(0.066, 0.075, 14), liquidMat);
  liquid.userData.ownGeometry = liquid.userData.ownMaterial = true;
  liquid.position.y = -0.105;
  flask.add(liquid);
  const bubbles: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const b = bit(flask, dot(0.006), '#ffffff', 0, -0.12, 0);
    b.visible = false;
    bubbles.push(b);
  }
  const drop = lit(g, dot(0.006), basic('#e0467a'), 0, CM.flask[1] + 0.2, CM.flask[2]);
  drop.visible = false;
  const tools: Record<string, ToolDef> = {
    pipette: { obj: makePipette(g), rest: { at: CM.pipette, y: [0, 0.03, 1] }, lead: 'right', grips: { right: { at: v(0, 0, 0), axis: v(0, 1, 0), shape: 'pen', radius: 0.006 } } },
    flask: { obj: flask, rest: { at: [CM.flask[0], CM.flask[1] + 0.13, CM.flask[2]], y: [0, 1, 0] }, lead: 'right', grips: { right: { at: v(0, 0, 0), axis: v(0, 1, 0), shape: 'pinch', radius: 0.016 } } },
  };
  out.work = marker(g, 0, CM.top + 0.12, CM.flask[2]);
  const run = standSpot(g, 'gbChem', 0, CM.st);
  out.spots = { runExperiment: run };
  const uses: Array<[string, GbMotion, Spot]> = [['runExperiment', 'gbChem', run]];
  const beatsOf = gbBeats('gbChem');
  const dropFrom = beatsOf.find((b) => b.name === 'drop')!;
  const blue = new THREE.Color('#7fc4e0');
  const pink = new THREE.Color('#e0467a');
  const gold = new THREE.Color('#e0b13b');
  out.away = (_o, t) => {
    run.held = null;
    const live = liveOf(uses, t);
    runTools(g, tools, live ? run : null, live?.n ?? null);
    flame.visible = !!live && isOn();
    if (flame.visible) flame.scale.y = 0.85 + 0.2 * Math.sin(t * 18);
    const beat = live?.n.beat ?? '';
    const dropping = beat === 'drop';
    drop.visible = false;
    let mixed = 0;
    if (live) {
      mixed = sm(live.n.time, dropFrom.from, dropFrom.from + dropFrom.s);
      if (dropping) {
        const u = fract(live.n.k * 5);
        drop.visible = u < 0.7;
        drop.position.y = CM.flask[1] + 0.23 - u * 0.14;
      }
    }
    liquidMat.color.copy(blue).lerp(live && live.n.round % 2 ? gold : pink, mixed);
    const swirling = beat === 'swirl' || beat === 'toLight';
    for (const [i, b] of bubbles.entries()) {
      b.visible = swirling;
      const u = fract(t * 0.8 + i / 3);
      b.position.set(0.02 * Math.sin(t * 5 + i), -0.13 + u * 0.06, 0.02 * Math.cos(t * 5 + i));
    }
    for (const [i, m] of tubes.entries()) m.scale.y = 1 + (live ? 0.02 * Math.sin(t + i) : 0);
  };
};

// -------------------------------------------------------------------------------------------------
// The driving rig: three screens round a wheel, a bucket seat, pedals, a gear lever, the wheel following the road.

const drivingSim: Builder = (g, W, D, _c, _def, _ctx, out) => {
  // The floor frame.
  part(g, box(0.7, 0.04, D - 0.14), '#2b2d33', 0, 0.02, 0);
  bit(g, box(W - 0.2, 0.03, 0.06), '#2b2d33', 0, 0.015, -D / 2 + 0.12);
  // The seat.
  const seat = group(g, 0, 0, DR.seatZ);
  seat.rotation.y = Math.PI;
  part(seat, box(0.32, 0.26, 0.32), '#1f2024', 0, 0.14, 0);
  part(seat, rbox(0.46, 0.09, 0.44, 0.04), '#3a3c44', 0, DR.seatY - 0.05, 0);
  part(seat, rbox(0.44, 0.66, 0.1, 0.04), '#3a3c44', 0, DR.seatY + 0.3, -0.2, { rx: -0.15 });
  for (const s of [-1, 1]) {
    part(seat, rbox(0.06, 0.6, 0.12, 0.03), '#c63d3d', s * 0.22, DR.seatY + 0.28, -0.16, { rx: -0.15 });
    part(seat, rbox(0.07, 0.07, 0.42, 0.03), '#c63d3d', s * 0.22, DR.seatY, 0);
  }
  out.seat = marker(g, 0, DR.seatY, DR.seatZ);
  // The column and the wheel, which turns.
  rod(g, v(0, 0.04, -0.2), v(0, DR.wheel[1] - 0.04, DR.wheel[2] - 0.08), 0.03, '#2b2d33');
  const wheelG = group(g, DR.wheel[0], DR.wheel[1] + 0.02, DR.wheel[2] + 0.03);
  wheelG.rotation.x = -DR.tilt;
  const hub = group(wheelG);
  const rim = part(hub, new THREE.TorusGeometry(DR.r, 0.016, 8, 24), BLACK, 0, 0, 0);
  rim.userData.ownGeometry = true;
  for (let i = 0; i < 3; i++) bit(hub, box(0.03, DR.r, 0.012), GREY, Math.sin((i / 3) * TAU) * DR.r * 0.5, -Math.cos((i / 3) * TAU) * DR.r * 0.5, 0, { rz: (i / 3) * TAU });
  bit(hub, cyl(0.04, 0.04, 0.02, 12), '#c63d3d', 0, 0, 0.01, { rx: Math.PI / 2 });
  // Pedals, the gear.
  for (const [i, col] of ['#8a9199', '#8a9199', '#8a9199'].entries()) bit(g, box(0.07, 0.02, 0.12), col, -0.1 + i * 0.1, 0.1, -0.2, { rx: -0.8 });
  part(g, box(0.1, 0.34, 0.14), '#2b2d33', DR.shift[0], DR.shift[1] - 0.2, DR.shift[2]);
  const gear = group(g, DR.shift[0], DR.shift[1] - 0.04, DR.shift[2]);
  bit(gear, cyl(0.008, 0.008, 0.08, 6), STEEL, 0, 0, 0);
  bit(gear, dot(0.022), BLACK, 0, 0.04, 0);
  // The screens: picture on the middle, the same on the wings.
  const road = new LivePicture(320, 180, 15);
  const sy = 1.0;
  const sz = -D / 2 + 0.13;
  const stand = (x: number) => bit(g, box(0.04, sy - 0.2, 0.04), BLACK, x, (sy - 0.2) / 2 + 0.03, sz);
  stand(-0.42);
  stand(0.42);
  part(g, box(0.82, 0.5, 0.028), BLACK, 0, sy, sz);
  const mid = flat(g, 0.78, 0.46, road.mat, 0, sy, sz + 0.015);
  mid.visible = false;
  const wings: THREE.Mesh[] = [];
  for (const s of [-1, 1]) {
    const w = group(g, s * 0.66, sy, sz + 0.11);
    w.rotation.y = -s * 0.62;
    part(w, box(0.52, 0.42, 0.024), BLACK, 0, 0, 0);
    const pic = flat(w, 0.49, 0.39, road.mat, 0, 0, 0.0135);
    pic.visible = false;
    pic.userData.ownMaterial = false;
    wings.push(pic);
  }
  const isOn = standby(g, out, 0.37, sy - 0.235, sz + 0.016);
  out.work = marker(g, 0, DR.wheel[1], DR.wheel[2]);
  const drive = seatSpot(g, 'gbDrive', DR.seatY, DR.seatZ);
  out.spots = { drivePractice: drive };
  const uses: Array<[string, GbMotion, Spot]> = [['drivePractice', 'gbDrive', drive]];
  out.away = (_o, t) => {
    const live = liveOf(uses, t);
    const on = !!live && isOn();
    mid.visible = on;
    for (const w of wings) w.visible = on;
    if (on) road.draw(t, (c, w, h) => paintRoad(c, w, h, t));
    hub.rotation.z = live ? -gbRoad(t) * 0.95 : 0;
    gear.rotation.x = live && live.n.beat === 'shift' ? 0.25 * Math.sin(live.n.k * Math.PI) : 0;
  };
};

// -------------------------------------------------------------------------------------------------
// The whiteboard: on wheels, written on as the marker goes.

const planningBoard: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  // The A-frame on castors.
  for (const s of [-1, 1]) {
    part(g, cyl(0.016, 0.02, PB.y1 + 0.1 - 0.05, 8), STEEL, s * 0.44, (PB.y1 + 0.1) / 2, PB.z - 0.02);
    bit(g, box(0.05, 0.03, 0.46), GREY, s * 0.44, 0.05, PB.z + 0.02);
    for (const z of [-0.2, 0.22]) bit(g, dot(0.03), BLACK, s * 0.44, 0.03, PB.z + 0.02 + z);
  }
  part(g, rbox(0.9, 0.84, 0.03, 0.01), STEEL, 0, (PB.y0 + PB.y1) / 2, PB.z - 0.018);
  const board = new LivePicture(512, 512, 8);
  flat(g, PB.x1 - PB.x0 + 0.04, PB.y1 - PB.y0, board.mat, 0, (PB.y0 + PB.y1) / 2, PB.z);
  board.draw(0, (c, w, h) => paintBoard(c, w, h, 3, 1, 2, false), true);
  // The tray with its pens, an eraser; sticky notes up the side, a pad on a shelf down below.
  part(g, box(0.86, 0.018, 0.08), STEEL, 0, PB.tray[1] - 0.01, PB.tray[2]);
  bit(g, box(0.86, 0.022, 0.006), STEEL, 0, PB.tray[1], PB.tray[2] + 0.038);
  part(g, rbox(0.1, 0.03, 0.05, 0.008), '#30343c', -0.32, PB.tray[1] + 0.012, PB.tray[2]);
  bit(g, cyl(0.009, 0.009, 0.12, 8), '#d33', 0.36, PB.tray[1] + 0.009, PB.tray[2], { rz: Math.PI / 2 });
  bit(g, cyl(0.009, 0.009, 0.12, 8), '#3a9', 0.3, PB.tray[1] + 0.009, PB.tray[2] + 0.015, { rz: Math.PI / 2 });
  for (const [i, col] of ['#ffe27a', '#ffb3c1', '#a8e6cf'].entries()) bit(g, box(0.08, 0.08, 0.002), col, -0.33, 1.5 - i * 0.1, PB.z + 0.002);
  part(g, box(0.86, 0.02, 0.26), OAK, 0, 0.32, PB.z + 0.04);
  for (const [i, col] of ['#7a4436', '#3f6a8a'].entries()) bit(g, box(0.22, 0.03, 0.2), col, -0.2 + i * 0.26, 0.345 + i * 0.015, PB.z + 0.05);
  const tools: Record<string, ToolDef> = {
    marker: { obj: makeMarker(g), rest: { at: PB.tray, y: [1, 0.02, 0] }, lead: 'right', grips: { right: { at: v(0, 0, 0), axis: v(0, 1, 0), shape: 'pen', radius: 0.009 } } },
    pointer: { obj: makePointer(g), rest: { at: PB.pointer, y: [1, 0.02, 0] }, lead: 'right', grips: { right: { at: v(0, 0, 0), axis: v(0, 1, 0), shape: 'power', radius: 0.012 } } },
  };
  out.work = marker(g, 0, 1.25, PB.z + 0.02);
  const plan = standSpot(g, 'gbPlan', 0.08, PB.st);
  const talk = standSpot(g, 'gbPresent', 0.34, PB.st + 0.1);
  out.spots = { planGoals: plan, presentationPractice: talk };
  const uses: Array<[string, GbMotion, Spot]> = [['planGoals', 'gbPlan', plan], ['presentationPractice', 'gbPresent', talk]];
  const writeFrom = gbBeats('gbPlan').find((b) => b.name === 'write')!;
  const tickBeat = gbBeats('gbPlan').find((b) => b.name === 'tick')!;
  let wasLive = false;
  out.away = (_o, t) => {
    plan.held = talk.held = null;
    const live = liveOf(uses, t);
    runTools(g, tools, live?.s ?? null, live?.n ?? null);
    if (live) {
      wasLive = true;
      if (live.id === 'planGoals') {
        const into = live.n.time - writeFrom.from;
        const p = planPen(into);
        const done = into >= PLAN_ROWS * PLAN_ROW ? PLAN_ROWS : p.row;
        const ticks = live.n.beat === 'tick' ? Math.floor(((live.n.time - tickBeat.from) / tickBeat.s) * (PLAN_ROWS + 1)) : live.n.time > tickBeat.from ? PLAN_ROWS : 0;
        board.draw(t, (c, w, h) => paintBoard(c, w, h, into < 0 ? -1 : done, p.along, ticks, false));
      } else {
        board.draw(t, (c, w, h) => paintBoard(c, w, h, PLAN_ROWS, 1, PLAN_ROWS, live.n.beat === 'point'));
      }
    } else if (wasLive) {
      wasLive = false;
      board.draw(t, (c, w, h) => paintBoard(c, w, h, PLAN_ROWS, 1, 2, false), true);
    }
  };
};

// -------------------------------------------------------------------------------------------------
// The tycoon board game: a real board on a small table, a stool, tokens that go round, dice, paper money.

const businessBoardGame: Builder = (g, W, _D, _c, _def, _ctx, out) => {
  const top = TY.top;
  const size = Math.min(W - 0.1, 0.84);
  part(g, rbox(size, 0.035, size, 0.01), OAK, 0, top - 0.018, -0.02);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) bit(g, cyl(0.022, 0.018, top - 0.03, 8), OAK_DARK, sx * (size / 2 - 0.06), (top - 0.03) / 2, -0.02 + sz * (size / 2 - 0.06));
  const stool = group(g, 0, 0, TY.seatZ);
  part(stool, cyl(0.16, 0.16, 0.05, 14), '#7a5c44', 0, TY.seatY - 0.025, 0);
  for (let i = 0; i < 3; i++) bit(stool, cyl(0.016, 0.02, TY.seatY - 0.05, 6), OAK_DARK, Math.sin((i / 3) * TAU) * 0.11, (TY.seatY - 0.05) / 2, Math.cos((i / 3) * TAU) * 0.11);
  // The board.
  part(g, box(TY.board + 0.02, 0.012, TY.board + 0.02), '#1e6b3f', 0, top + 0.006, -0.02);
  lying(g, TY.board, TY.board, pics((c, w, h) => {
    c.save();
    c.scale(w / 256, h / 256);
    rect(c, 0, 0, 256, 256, '#dfeee0');
    words(c, '꿈의 마을', 128, 112, 22, '#1e6b3f', 'center');
    words(c, '사고 짓고 벌기', 128, 142, 12, '#3a6a4f', 'center');
    const n = TY.n / 4;
    const s = 256 / (n + 1);
    for (let i = 0; i < TY.n; i++) {
      const side = Math.floor(i / n);
      const a = i % n;
      const [x, y] = side === 0 ? [a * s, 256 - s] : side === 1 ? [256 - s, 256 - s - a * s] : side === 2 ? [256 - s - a * s, 0] : [0, a * s];
      rect(c, x + 1, y + 1, s - 2, s - 2, SQUARE_COLS[i]);
      words(c, pick(SQUARES, i).slice(0, 4), x + s / 2, y + s / 2, 8, '#222', 'center');
    }
    c.restore();
  }, 256, 256), 0, top + 0.0125, -0.02);
  // Houses on some squares, paper money and cards by the board.
  for (const [i, sq] of [1, 5, 9, 13].entries()) {
    const p = squareAt(sq);
    bit(g, box(0.03, 0.022, 0.03), ['#c63d3d', '#2e7d32', '#1565c0', '#8e24aa'][i], p[0], top + 0.024, p[2] - 0.008);
    bit(g, new THREE.ConeGeometry(0.024, 0.018, 4), '#553', p[0], top + 0.044, p[2] - 0.008).userData.ownGeometry = true;
  }
  const money = ['#f4d35e', '#9cd38f', '#ef9e9e'];
  for (const [i, col] of money.entries()) for (let j = 0; j < 4; j++) bit(g, box(0.07, 0.0012, 0.04), col, -0.32 + i * 0.08, top + 0.002 + j * 0.0014, 0.32);
  const stack = bit(g, box(0.07, 0.002, 0.04), '#f4d35e', -0.32, top + 0.009, 0.33);
  part(g, box(0.06, 0.02, 0.09), '#90caf9', 0.32, top + 0.01, -0.2);
  // Two tokens: the player's and the other side's (the dweller plays both).
  const token = group(g, 0, 0, 0, 'token');
  part(token, cyl(0.016, 0.02, 0.012, 10), '#c63d3d', 0, 0.006, 0);
  part(token, cyl(0.006, 0.014, 0.03, 10), '#c63d3d', 0, 0.027, 0);
  part(token, dot(0.011), '#c63d3d', 0, 0.05, 0);
  const rival = group(g, 0, 0, 0, 'rival');
  part(rival, cyl(0.016, 0.02, 0.012, 10), '#1565c0', 0, 0.006, 0);
  part(rival, cyl(0.006, 0.014, 0.03, 10), '#1565c0', 0, 0.027, 0);
  part(rival, dot(0.011), '#1565c0', 0, 0.05, 0);
  const dice = group(g, 0, 0, 0, 'dice');
  for (const s of [-1, 1]) {
    bare(dice, rbox(0.018, 0.018, 0.018, 0.003), '#f8f8f4', s * 0.012, 0, s * 0.003);
    bare(dice, dot(0.0025), BLACK, s * 0.012, 0.009, s * 0.003);
  }
  const tools: Record<string, ToolDef> = {
    dice: { obj: dice, rest: { at: TY.dice, y: [0, 1, 0] }, lead: 'right', grips: { right: { at: v(0, 0, 0), axis: v(1, 0, 0), shape: 'pinch', radius: 0.012 } } },
  };
  out.work = marker(g, 0, top + 0.03, 0.2);
  const play = seatSpot(g, 'gbTycoon', TY.seatY, TY.seatZ);
  out.spots = { playTycoon: play };
  const uses: Array<[string, GbMotion, Spot]> = [['playTycoon', 'gbTycoon', play]];
  // A roll, each round, from the round's number.
  const rollOf = (n: number) => 2 + ((n * 7 + 3) % 5);
  const beatsOf = gbBeats('gbTycoon');
  const moveB = beatsOf.find((b) => b.name === 'move')!;
  const placeAt = (o: THREE.Object3D, p: V, dx = 0) => o.position.set(p[0] + dx, p[1], p[2]);
  let pos = 0;
  let lastRound = -1;
  let squareNow = 0;
  placeAt(token, squareAt(0));
  placeAt(rival, squareAt(8), 0.012);
  out.away = (_o, t) => {
    play.held = null;
    const live = liveOf(uses, t);
    runTools(g, tools, live ? play : null, live?.n ?? null);
    stack.visible = !live;
    if (!live) {
      placeAt(token, squareAt(squareNow));
      lastRound = -1;
      return;
    }
    if (live.n.round !== lastRound) {
      if (lastRound >= 0) pos += rollOf(lastRound);
      lastRound = live.n.round;
    }
    const beat = live.n.beat;
    if (beat === 'throw') {
      const u = sm(live.n.k, 0, 0.55);
      const land: V = [0.02, top + 0.027, 0.11];
      dice.position.set(land[0] + (0.14 - land[0]) * (1 - u), top + 0.03 + 0.18 * (1 - u) * (1 - u) * 1.2, land[2] + (0.3 - land[2]) * (1 - u));
      dice.rotation.set((1 - u) * 16, (1 - u) * 10, 0);
    } else if (beat === 'move' || beat === 'think' || beat === 'money') {
      dice.position.set(0.02, top + 0.027, 0.11);
      dice.rotation.set(0, 0, 0);
    }
    const roll = rollOf(live.n.round);
    const moved = live.n.time < moveB.from ? 0 : Math.min(roll, ((live.n.time - moveB.from) / moveB.s) * roll);
    const at = Math.floor(moved);
    const from = squareAt(pos + at);
    const to = squareAt(pos + at + 1);
    const e = moved - at;
    token.position.set(from[0] + (to[0] - from[0]) * e, from[1] + 0.04 * Math.sin(e * Math.PI), from[2] + (to[2] - from[2]) * e);
    squareNow = pos + Math.floor(moved);
    if (beat === 'think') placeAt(rival, squareAt(8 + live.n.round * 3), 0.012);
  };
};

// -------------------------------------------------------------------------------------------------
// The woodworking bench: a thick top and a wooden vice, a rack of tools, sawing, planing, carving.

const woodworkingTable: Builder = (g, W, _D, _c, _def, _ctx, out) => {
  const top = WB.top;
  const dep = 0.62;
  const z = 0.13 - dep / 2;
  part(g, rbox(W - 0.08, 0.07, dep, 0.01), BIRCH, 0, top - 0.035, z);
  for (let i = 0; i < 6; i++) bit(g, box(W - 0.08, 0.002, 0.002), shade(BIRCH, 0.8), 0, top + 0.001, z - dep / 2 + (i + 0.5) * (dep / 6));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.08, top - 0.07, 0.08), OAK_DARK, sx * (W / 2 - 0.14), (top - 0.07) / 2, z + sz * (dep / 2 - 0.08));
  for (const sx of [-1, 1]) bit(g, box(0.05, 0.05, dep - 0.2), OAK_DARK, sx * (W / 2 - 0.14), 0.2, z);
  part(g, box(W - 0.36, 0.03, dep - 0.2), OAK, 0, 0.2, z);
  part(g, box(0.5, 0.15, 0.24), '#7a5c44', -0.42, 0.29, z);
  bit(g, box(0.1, 0.012, 0.012), BRASS, -0.42, 0.29, z + 0.126);
  // Offcuts under it.
  for (let i = 0; i < 4; i++) bit(g, box(0.34, 0.04, 0.08), i % 2 ? OAK : BIRCH, 0.4, 0.235 + i * 0.04, z - 0.05 + (i % 2) * 0.03);
  // The tool rail at the back with what isn't in use: a hammer, a square, clamps; a pot of pencils.
  const railZ = -0.46;
  part(g, box(W - 0.14, 0.34, 0.025), shade(BIRCH, 0.86), 0, top + 0.28, railZ);
  bit(g, box(0.26, 0.01, 0.015), STEEL, 0.5, top + 0.33, railZ + 0.02);
  bit(g, box(0.01, 0.17, 0.008), STEEL, 0.38, top + 0.26, railZ + 0.018);
  bit(g, box(0.02, 0.16, 0.012), OAK_DARK, -0.1, top + 0.3, railZ + 0.022);
  bit(g, box(0.08, 0.03, 0.02), GREY, -0.1, top + 0.37, railZ + 0.022);
  for (const x of [-0.56, -0.46]) {
    bit(g, box(0.015, 0.2, 0.012), STEEL, x, top + 0.28, railZ + 0.02);
    bit(g, box(0.06, 0.014, 0.012), OAK_DARK, x + 0.02, top + 0.37, railZ + 0.02);
  }
  part(g, cyl(0.035, 0.03, 0.08, 10), GREY, 0.8, top + 0.04, -0.3);
  for (const k of [-1, 0, 1]) bit(g, cyl(0.004, 0.004, 0.14, 6), '#e0b13b', 0.8 + k * 0.012, top + 0.09, -0.3, { rz: k * 0.15 });
  // The vice on the right, and a board up in it to saw; the cut piece drops at the end of a cut.
  const viceX = WB.saw[0];
  part(g, box(0.26, 0.14, 0.05), OAK_DARK, viceX, top - 0.05, 0.16);
  bit(g, cyl(0.014, 0.014, 0.2, 8), STEEL, viceX, top - 0.06, 0.24, { rx: Math.PI / 2 });
  bit(g, cyl(0.009, 0.009, 0.2, 6), STEEL, viceX, top - 0.06, 0.33, { rz: Math.PI / 2 });
  part(g, box(0.1, 0.2, 0.3), OAK, viceX, top + 0.03, WB.saw[2] + 0.04);
  const cutEnd = part(g, box(0.1, 0.09, 0.3), tint(OAK, 0.12), viceX, top + 0.175, WB.saw[2] + 0.04);
  const dust: THREE.Mesh[] = [];
  for (let i = 0; i < 16; i++) dust.push(bit(g, box(0.012, 0.003, 0.009), tint(BIRCH, 0.2), viceX - 0.03 + (i % 5) * 0.015, 0.012, 0.02 + (i % 4) * 0.03, { ry: i }));
  // The plank being planed, with its shavings curling up off it and piling at the end.
  bit(g, box(0.14, 0.03, 0.36), BIRCH, WB.plane[0], top + 0.015, WB.plane[2] - 0.08);
  const shavings: THREE.Mesh[] = [];
  for (let i = 0; i < 12; i++) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.0035, 4, 10, 4.5), new THREE.MeshToonMaterial({ color: tint(BIRCH, 0.25) }));
    m.userData.ownGeometry = m.userData.ownMaterial = true;
    m.position.set(WB.plane[0] - 0.12 + (i % 4) * 0.08, top + 0.012, WB.plane[2] + 0.02 - (i % 5) * 0.09);
    m.rotation.set(1.2, i, 0.3 * i);
    m.visible = false;
    g.add(m);
    shavings.push(m);
  }
  // The block being carved: a bird comes out of it.
  const blockAt = WB.chisel;
  const block = part(g, box(0.1, 0.12, 0.14), OAK, blockAt[0], top + 0.06, blockAt[2]);
  const bird = group(g, blockAt[0], top + 0.07, blockAt[2]);
  const b1 = part(bird, dot(0.05), OAK, 0, 0, 0);
  b1.scale.set(0.8, 0.8, 1.2);
  part(bird, dot(0.03), OAK, 0, 0.06, 0.045);
  bit(bird, new THREE.ConeGeometry(0.01, 0.03, 6), OAK_DARK, 0, 0.056, 0.086, { rx: Math.PI / 2 }).userData.ownGeometry = true;
  bit(bird, box(0.03, 0.012, 0.07), OAK_DARK, 0, 0.005, -0.08, { rx: 0.4 });
  const chips: THREE.Mesh[] = [];
  for (let i = 0; i < 10; i++) {
    const m = bit(g, box(0.012, 0.003, 0.02), tint(OAK, 0.2), blockAt[0] - 0.09 + (i % 5) * 0.045, top + 0.003, blockAt[2] + 0.05 + (i % 3) * 0.03, { ry: i * 0.7 });
    m.visible = false;
    chips.push(m);
  }
  const tools: Record<string, ToolDef> = {
    saw: { obj: makeSaw(g), rest: { at: WB.sawRest, y: [0, 0.02, 1], z: [1, 0, 0] }, lead: 'right', grips: { right: { at: v(0, 0, 0), axis: v(0, 1, 0), shape: 'power', radius: 0.015 } } },
    plane: {
      obj: makePlane(g),
      rest: { at: WB.planeRest, y: [0, 1, 0] },
      lead: 'right',
      grips: {
        right: { at: v(0, 0, 0), axis: v(1, 0, 0), palm: v(0, -0.6, -0.8), shape: 'power', radius: 0.016 },
        left: { at: v(0, -0.012, -0.13), axis: v(1, 0, 0), palm: v(0, -1, 0), shape: 'cradle', radius: 0.022 },
      },
    },
    chisel: {
      obj: makeChisel(g),
      rest: { at: WB.chiselRest, y: [1, 0, 0] },
      lead: 'right',
      grips: { right: { at: v(0, 0, 0), axis: v(0, 1, 0), shape: 'power', radius: 0.014 }, left: { at: v(0, -0.09, 0), axis: v(0, 1, 0), shape: 'pinch', radius: 0.008 } },
    },
  };
  out.work = marker(g, 0, top + 0.03, WB.plane[2]);
  const work = standSpot(g, 'gbWood', 0, WB.st);
  out.spots = { woodwork: work };
  const uses: Array<[string, GbMotion, Spot]> = [['woodwork', 'gbWood', work]];
  const list = gbBeats('gbWood');
  const start = (n: string) => list.find((b) => b.name === n)!;
  const sawB = start('saw');
  const planeB = start('plane');
  const chiselB = start('chisel');
  const seen = (x: number, a: number, b: number) => (a === b ? 0 : Math.max(0, Math.min(1, (x - a) / (b - a))));
  out.away = (_o, t) => {
    work.held = null;
    const live = liveOf(uses, t);
    runTools(g, tools, live ? work : null, live?.n ?? null);
    const time = live?.n.time ?? 0;
    const sawn = live ? seen(time, sawB.from, sawB.from + sawB.s) : 0;
    cutEnd.visible = !live || sawn < 1;
    for (const [i, d] of dust.entries()) d.visible = sawn * dust.length > i;
    const planed = live ? seen(time, planeB.from, planeB.from + planeB.s) : 0;
    for (const [i, m] of shavings.entries()) m.visible = planed * shavings.length > i;
    const carved = live ? seen(time, chiselB.from, chiselB.from + chiselB.s) : 0;
    const k = 1 - 0.75 * carved;
    block.scale.set(k, 1 - 0.45 * carved, k);
    block.position.y = top + 0.06 * (1 - 0.45 * carved);
    bird.visible = carved > 0.05;
    bird.scale.setScalar(0.5 + 0.5 * carved);
    bird.position.y = top + 0.07 + 0.03 * carved;
    for (const [i, m] of chips.entries()) m.visible = carved * chips.length > i;
  };
};

// -------------------------------------------------------------------------------------------------
// The tool bench: a pegboard of tools, a steel vice, a part filed, a small radio mended.

const homeToolBench: Builder = (g, W, _D, c, _def, _ctx, out) => {
  const top = TB.top;
  const dep = 0.62;
  const z = 0.13 - dep / 2;
  const wood = c === '#8a6a48' ? OAK : c;
  part(g, rbox(W - 0.08, 0.05, dep, 0.01), wood, 0, top - 0.025, z);
  bit(g, box(W - 0.3, 0.002, dep - 0.14), '#3a6a5a', -0.05, top + 0.002, z + 0.02);
  // Drawers on the left, a shelf and a toolbox to the right.
  part(g, box(0.6, top - 0.05, dep - 0.04), '#6e7a84', -W / 2 + 0.36, (top - 0.05) / 2, z);
  for (const y of [0.14, 0.34, 0.54, 0.7]) {
    bit(g, box(0.54, 0.16, 0.006), '#8d99a3', -W / 2 + 0.36, y, 0.13 - 0.018);
    bit(g, box(0.1, 0.012, 0.012), '#d0d6da', -W / 2 + 0.36, y + 0.04, 0.13 - 0.012);
    bit(g, box(0.05, 0.022, 0.002), PAPER, -W / 2 + 0.36 + 0.14, y + 0.04, 0.13 - 0.014);
  }
  for (const sz of [-1, 1]) part(g, box(0.06, top - 0.05, 0.06), '#6e7a84', W / 2 - 0.08, (top - 0.05) / 2, z + sz * (dep / 2 - 0.05));
  part(g, box(0.8, 0.025, dep - 0.08), '#6e7a84', 0.26, 0.2, z);
  part(g, rbox(0.36, 0.15, 0.2, 0.01), '#c63d3d', 0.32, 0.29, z);
  bit(g, box(0.16, 0.014, 0.02), BLACK, 0.32, 0.375, z);
  // The pegboard with a painted row of tools in their outlines.
  const pegZ = -0.45;
  part(g, box(W - 0.12, 0.72, 0.02), '#c7b48e', 0, top + 0.44, pegZ);
  flat(g, W - 0.16, 0.68, pics((p, w, h) => {
    p.save();
    p.scale(w / 512, h / 186);
    rect(p, 0, 0, 512, 186, '#c9b78f');
    for (let x = 8; x < 512; x += 16) for (let y = 8; y < 186; y += 16) circle(p, x, y, 1.1, '#7d6c4b');
    const tool = (x: number, h2: number, col: string) => rect(p, x, 28, 7, h2, col);
    for (const [i, h2] of [90, 70, 110, 60, 96, 76, 120].entries()) tool(36 + i * 28, h2, i % 2 ? '#51606b' : '#8d3a2c');
    for (let i = 0; i < 4; i++) {
      circle(p, 320 + i * 40, 58, 12 + i * 2, '#7e8a94');
      circle(p, 320 + i * 40, 58, 5 + i, '#c9b78f');
    }
    for (let i = 0; i < 5; i++) rect(p, 300 + i * 36, 112, 28, 40, ['#e0b13b', '#3f6a8a', '#7a4436', '#54744e', '#9b6ad3'][i]);
    p.restore();
  }, 512, 186), 0, top + 0.44, pegZ + 0.011);
  // A work lamp.
  rod(g, v(0.8, top + 0.01, -0.34), v(0.72, top + 0.46, -0.3), 0.01, BLACK);
  rod(g, v(0.72, top + 0.46, -0.3), v(0.56, top + 0.5, -0.08), 0.01, BLACK);
  part(g, cyl(0.03, 0.07, 0.06, 12), BLACK, 0.56, top + 0.48, -0.08);
  const lampMat = basic('#57513f');
  lit(g, dot(0.022), lampMat, 0.56, top + 0.45, -0.08);
  const isOn = standby(g, out, 0.82, top + 0.012, -0.3);
  // The vice.
  const vx = TB.vice[0];
  const vz = TB.vice[2];
  part(g, box(0.12, 0.05, 0.18), '#3f5e78', vx, top + 0.025, vz - 0.02);
  part(g, box(0.15, 0.09, 0.04), '#3f5e78', vx, top + 0.095, vz - 0.05);
  const jaw = group(g, vx, top + 0.095, vz + 0.04);
  part(jaw, box(0.15, 0.09, 0.04), '#3f5e78', 0, 0, 0);
  bit(jaw, cyl(0.012, 0.012, 0.14, 8), STEEL, 0, -0.03, 0.08, { rx: Math.PI / 2 });
  const lever = group(jaw, 0, -0.03, 0.15);
  bit(lever, cyl(0.005, 0.005, 0.15, 6), STEEL, 0, 0, 0, { rz: Math.PI / 2 });
  for (const s of [-1, 1]) bit(lever, dot(0.01), STEEL, s * 0.075, 0, 0);
  // The part in its jaws: a dull block, brightening as it's filed.
  const blockMat = new THREE.MeshToonMaterial({ color: '#6d6559' });
  const block = part(g, box(0.09, 0.05, 0.05), '#fff', vx, top + 0.15, vz - 0.005, { material: blockMat });
  block.userData.ownMaterial = true;
  const filings: THREE.Mesh[] = [];
  for (let i = 0; i < 14; i++) {
    const m = bit(g, box(0.004, 0.0015, 0.004), '#c9ced2', vx - 0.05 + (i % 7) * 0.016, top + 0.003, vz + 0.08 + (i % 3) * 0.02, { ry: i });
    m.visible = false;
    filings.push(m);
  }
  // The radio on its mat: cover off to the side, its dial; it plays when mended.
  const rad = TB.radio;
  const radio = group(g, rad[0], top, rad[2]);
  part(radio, rbox(0.28, 0.14, 0.13, 0.015), '#8a5a3c', 0, 0.075, 0);
  bit(radio, box(0.14, 0.09, 0.004), '#2b2d33', -0.05, 0.08, 0.067);
  const dial = bit(radio, cyl(0.022, 0.022, 0.012, 10), CREAM, 0.08, 0.1, 0.068, { rx: Math.PI / 2 });
  const lampRadio = lit(radio, dot(0.006), basic('#533'), 0.08, 0.055, 0.067);
  const lampRadioMat = lampRadio.material as THREE.MeshBasicMaterial;
  const cover = part(radio, rbox(0.24, 0.006, 0.11, 0.002), '#7a4f35', 0, 0.149, 0);
  for (const sx of [-1, 1]) bit(radio, cyl(0.006, 0.006, 0.006, 6), STEEL, sx * 0.1, 0.155, 0);
  bit(radio, cyl(0.002, 0.002, 0.2, 5), STEEL, -0.12, 0.25, -0.03, { rz: 0.25 });
  const notes: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const m = lit(radio, dot(0.008), basic('#2f6a4f'), -0.05, 0.2, 0.06);
    m.visible = false;
    notes.push(m);
  }
  // A tray of screws, a jar, a roll of tape.
  part(g, rbox(0.16, 0.022, 0.1, 0.006), STEEL, -0.06, top + 0.012, -0.22);
  for (let i = 0; i < 8; i++) bit(g, cyl(0.004, 0.004, 0.012, 5), BRASS, -0.11 + (i % 4) * 0.032, top + 0.024, -0.24 + (i % 2) * 0.03);
  part(g, cyl(0.035, 0.035, 0.09, 10), '#d9eef2', 0.2, top + 0.045, -0.28);
  for (let i = 0; i < 6; i++) bit(g, dot(0.008), BRASS, 0.2 + (i % 3 - 1) * 0.015, top + 0.015 + i * 0.008, -0.28 + (i % 2) * 0.01);
  const tape = bit(g, new THREE.TorusGeometry(0.03, 0.012, 6, 12), '#30343c', 0.3, top + 0.012, -0.12, { rx: Math.PI / 2 });
  tape.userData.ownGeometry = true;
  const tools: Record<string, ToolDef> = {
    file: {
      obj: makeFile(g),
      rest: { at: TB.fileRest, y: [1, 0.01, 0] },
      lead: 'right',
      grips: { right: { at: v(0, 0, 0), axis: v(0, 1, 0), shape: 'power', radius: 0.014 }, left: { at: v(0, -0.12, 0), axis: v(0, 1, 0), shape: 'pinch', radius: 0.008 } },
    },
    driver: { obj: makeDriver(g), rest: { at: TB.driverRest, y: [1, 0.02, 0] }, lead: 'right', grips: { right: { at: v(0, 0.02, 0), axis: v(0, 1, 0), shape: 'power', radius: 0.014 } } },
  };
  out.work = marker(g, 0, top + 0.03, -0.02);
  const fileS = standSpot(g, 'gbFile', vx, TB.st);
  const fixS = standSpot(g, 'gbFix', rad[0], TB.st);
  out.spots = { benchFile: fileS, benchFix: fixS };
  const uses: Array<[string, GbMotion, Spot]> = [['benchFile', 'gbFile', fileS], ['benchFix', 'gbFix', fixS]];
  const fileB = gbBeats('gbFile').find((b) => b.name === 'file')!;
  const dull = new THREE.Color('#6d6559');
  const shiny = new THREE.Color('#d6dde2');
  let filed = 0;
  let last = 0;
  out.away = (_o, t) => {
    fileS.held = fixS.held = null;
    const dt = Math.max(0, Math.min(0.25, t - last));
    last = t;
    const live = liveOf(uses, t);
    runTools(g, tools, live?.s ?? null, live?.n ?? null);
    const on = !!live && isOn();
    lampMat.color.set(on ? '#fff2c0' : '#57513f');
    const filing = live?.n.beat === 'file' && live.id === 'benchFile';
    if (!live || live.id !== 'benchFile') filed = 0;
    else if (filing) filed = Math.min(1, filed + dt / (fileB.s * 2));
    blockMat.color.copy(dull).lerp(shiny, filed);
    for (const [i, m] of filings.entries()) m.visible = filed * filings.length * 1.2 > i;
    lever.rotation.z = live?.n.beat === 'takeFile' ? live.n.k * 2 : 0;
    const beat = live?.id === 'benchFix' ? live.n.beat : '';
    cover.visible = beat !== 'lookIn';
    const playing = beat === 'tryIt';
    lampRadioMat.color.set(playing ? '#7cff9a' : '#553333');
    dial.rotation.y = playing ? t * 1.2 : 0;
    for (const [i, m] of notes.entries()) {
      m.visible = playing;
      if (playing) {
        const u = fract(t * 0.6 + i / 3);
        m.position.set(-0.05 + 0.03 * Math.sin(t * 2 + i), 0.14 + u * 0.14, 0.06);
      }
    }
  };
};

// -------------------------------------------------------------------------------------------------
// The rocket: stood in its own cradle at the bottom of the garden, name painted on it; a panel with bolts, a bay, a hatch; off it goes.

const rocketShip: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  const ship = group(g, 0, 0, 0, 'ship');
  const WHITE_HULL = '#eef0ed';
  const RED = '#d64233';
  const BLUE = '#2d5f91';
  // The cradle stays when it goes.
  part(g, cyl(0.8, 0.84, 0.08, 20), '#7a8087', 0, 0.04, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    bit(g, box(0.12, 0.012, 0.12), i % 2 ? '#f0c23f' : '#30343c', Math.sin(a) * 0.68, 0.085, Math.cos(a) * 0.68, { ry: a });
  }
  // The hull: a tapering stack of rings.
  const rings: Array<[number, number, number, number, string]> = [
    [0.5, 0.5, 0.5, 0.36, WHITE_HULL],
    [0.5, 0.5, 1.28, 1.22, WHITE_HULL],
    [0.5, 0.42, 2.34, 0.9, WHITE_HULL],
    [0.42, 0.3, 2.86, 0.14, BLUE],
  ];
  const hullY = (y: number) => y;
  rings.forEach(([rb, rt, y, h, col]) => part(ship, cyl(rt, rb, h, 22), col, 0, hullY(y) , 0));
  const nose = part(ship, new THREE.ConeGeometry(0.3, 0.72, 22), RED, 0, 3.29, 0);
  nose.userData.ownGeometry = true;
  bit(ship, dot(0.022), BRASS, 0, 3.66, 0);
  for (const y of [0.68, 1.89]) bit(ship, cyl(0.505, 0.505, 0.03, 22), RED, 0, y, 0);
  // Fins.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + Math.PI / 4;
    const f = group(ship, Math.sin(a) * 0.5, 0.52, Math.cos(a) * 0.5);
    f.rotation.y = a;
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.46);
    shape.lineTo(0.32, -0.48);
    shape.lineTo(0.03, 0.46);
    shape.lineTo(0, 0.46);
    shape.closePath();
    const geom = new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: false }).translate(0, 0, -0.015).rotateY(-Math.PI / 2);
    const fm = part(f, geom, RED, 0, 0, 0);
    fm.userData.ownGeometry = true;
  }
  // The engines, and the fire.
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU;
    part(ship, cyl(0.1, 0.15, 0.16, 12), '#2a2c31', Math.sin(a) * 0.2, 0.2, Math.cos(a) * 0.2);
  }
  const fireMat = basic('#ffb84a', 0.85);
  const fire = lit(ship, new THREE.ConeGeometry(0.34, 1.3, 12), fireMat, 0, -0.5, 0, { rx: Math.PI });
  fire.userData.ownGeometry = true;
  fire.visible = false;
  // Portholes, the painted name.
  for (const y of [2.2, 2.54]) {
    const r = 0.5 - (y - 1.89) * 0.089;
    bit(ship, cyl(0.1, 0.1, 0.03, 16), BRASS, 0, y, r, { rx: Math.PI / 2 });
    lit(ship, cyl(0.08, 0.08, 0.034, 16), basic('#a7d9ef'), 0, y, r + 0.002, { rx: Math.PI / 2 });
  }
  const label = flat(ship, 0.34, 0.74, pics((c, w, h) => {
    c.save();
    c.scale(w / 100, h / 220);
    c.globalAlpha = 1;
    rect(c, 0, 0, 100, 220, WHITE_HULL);
    for (const [i, ch] of [...'별똥별1호'].entries()) words(c, ch, 50, 28 + i * 40, 30, BLUE, 'center');
    c.restore();
  }, 100, 220), -0.338, 1.42, 0.378, { ry: -0.73 });
  label.renderOrder = 1;

  // The hatch at reach, the panel with its four bolts, the bay door beside it.
  const hatch = group(ship, -0.15, RK.hatch[1] + 0.2, 0.5);
  const hatchD = part(hatch, rbox(0.3, 0.44, 0.02, 0.05), '#d5d9d6', 0.15, 0, 0.01);
  bit(hatch, box(0.04, 0.1, 0.012), BLACK, 0.26, 0, 0.026);
  void hatchD;
  bit(ship, box(0.28, 0.42, 0.01), '#2c2f36', 0, RK.hatch[1] + 0.2, 0.495);
  const panel = group(ship, RK.panel[0], RK.panel[1], RK.panel[2]);
  part(panel, box(0.34, 0.42, 0.2), '#c0c6c8', 0, 0, -0.09);
  const boltObjs: THREE.Object3D[] = [];
  for (const [bx, by] of RK.bolts) {
    const b = group(ship, bx, by, RK.hull);
    bit(b, cyl(0.016, 0.016, 0.018, 6), '#61686e', 0, 0, 0, { rx: Math.PI / 2 });
    boltObjs.push(b);
  }
  bit(ship, box(0.28, 0.32, 0.16), '#8e959a', RK.bay[0], RK.bay[1], RK.bay[2] - 0.085);
  const bay = group(ship, RK.bay[0] - 0.13, RK.bay[1], RK.bay[2]);
  part(bay, box(0.26, 0.3, 0.018), '#c0c6c8', 0.13, 0, 0.005);
  bit(ship, box(0.24, 0.28, 0.01), '#1e2024', RK.bay[0], RK.bay[1], RK.bay[2] - 0.006);
  const bayLights: THREE.Mesh[] = [];
  for (const [i, col] of ['#7bffb0', '#ffd166', '#7fd4ff'].entries()) bayLights.push(lit(ship, dot(0.008), basic(col), RK.bay[0] - 0.05 + i * 0.05, RK.bay[1] + 0.06, RK.bay[2] - 0.0));
  // The gauge on the hull.
  const gaugeMat = basic('#333');
  bit(ship, cyl(0.05, 0.05, 0.012, 14), '#30343c', -0.02, 1.34, RK.hull + 0.004, { rx: Math.PI / 2 });
  lit(ship, cyl(0.04, 0.04, 0.014, 14), gaugeMat, -0.02, 1.34, RK.hull + 0.006, { rx: Math.PI / 2 });
  const needle = group(ship, -0.02, 1.34, RK.hull + 0.015);
  bit(needle, box(0.004, 0.036, 0.002), RED, 0, 0.018, 0);
  // The tool post with the spanner, a ladder up the side; a chalk checklist on the post.
  const hook = RK.hook;
  bit(g, cyl(0.02, 0.022, hook[1] + 0.3, 8), STEEL, hook[0] + 0.05, (hook[1] + 0.3) / 2, hook[2] - 0.04);
  bit(g, box(0.05, 0.012, 0.012), STEEL, hook[0] + 0.02, hook[1] + 0.02, hook[2] - 0.04);
  part(g, box(0.14, 0.2, 0.01), '#2d4d3f', hook[0] + 0.05, hook[1] + 0.22, hook[2] - 0.02);
  flat(g, 0.13, 0.19, pics((c, w, h) => {
    c.save();
    c.scale(w / 66, h / 96);
    rect(c, 0, 0, 66, 96, '#2d4d3f');
    words(c, '점검표', 33, 12, 9, '#f4f1e0', 'center');
    for (const [i, s] of ['연료', '볼트', '해치', '통신'].entries()) words(c, `✓ ${s}`, 8, 30 + i * 16, 9, '#f4f1e0');
    c.restore();
  }, 66, 96), hook[0] + 0.05, hook[1] + 0.22, hook[2] - 0.014);
  const ladderX = -0.72;
  for (const s of [-1, 1]) rod(g, v(ladderX + s * 0.09, 0.08, -0.3), v(ladderX + s * 0.09, 2.2, -0.38), 0.012, STEEL);
  for (let i = 0; i < 8; i++) bit(g, cyl(0.009, 0.009, 0.18, 6), STEEL, ladderX, 0.28 + i * 0.26, -0.31 - (i / 8) * 0.07, { rz: Math.PI / 2 });
  bit(g, box(0.28, 0.02, 0.26), STEEL, ladderX + 0.02, 2.2, -0.26);

  const isOn = standby(ship, out, -0.02, 1.27, RK.hull + 0.002);
  const tools: Record<string, ToolDef> = {
    spanner: { obj: makeSpanner(g), rest: { at: hook, y: [0, -1, 0] }, lead: 'right', grips: { right: { at: v(0, 0, 0), axis: v(0, 1, 0), shape: 'power', radius: 0.012 } } },
  };
  out.work = marker(g, 0, 1.1, RK.hull);
  const build = standSpot(g, 'gbBuild', 0.24, RK.st);
  const tune = standSpot(g, 'gbTune', -0.22, RK.st);
  const board = standSpot(g, 'gbBoard', 0, RK.st);
  out.spots = { buildRocket: build, tuneRocket: tune, launchRocket: board };
  const uses: Array<[string, GbMotion, Spot]> = [['buildRocket', 'gbBuild', build], ['tuneRocket', 'gbTune', tune], ['launchRocket', 'gbBoard', board]];
  let lift = 0;
  let lastT = 0;
  out.away = (gone, t) => {
    build.held = tune.held = board.held = null;
    const dt = Math.max(0, Math.min(0.25, t - lastT));
    lastT = t;
    // Gone: up and out of sight; back: down onto its cradle, fire and all.
    lift = gone ? lift + dt * (0.5 + lift * 0.5) : Math.max(0, lift - dt * (0.8 + lift * 0.4));
    ship.position.y = lift * lift * 0.9;
    ship.visible = lift < 12;
    const burn = gone || lift > 0;
    fire.visible = burn;
    if (burn) {
      fire.scale.setScalar(0.85 + 0.15 * Math.sin(t * 24));
      fireMat.color.set(fract(t * 7) < 0.5 ? '#ffb84a' : '#ff7a2e');
    }
    const live = burn ? null : liveOf(uses, t);
    runTools(g, tools, live?.s ?? null, live?.n ?? null);
    const beat = live?.n.beat ?? '';
    for (const [i, b] of boltObjs.entries()) b.rotation.z = beat === `bolt${i}` ? t * 6 : 0;
    // The panel comes off, for the last bit of fitting it's held on and goes home.
    panel.position.z = RK.panel[2] + (live?.id === 'buildRocket' && beat !== 'fit' && !beat.startsWith('bolt') ? 0.05 : 0);
    const openBay = live?.id === 'tuneRocket';
    bay.rotation.y = openBay ? 2 : 0;
    for (const [i, l] of bayLights.entries()) l.visible = !!live && openBay && isOn() && fract(t * 0.8 + i * 0.3) < 0.7;
    hatch.rotation.y = live?.id === 'launchRocket' ? -1.7 * sm(live.n.time, 0.5, 2.5) : 0;
    needle.rotation.z = live ? -0.8 + 1.4 * (0.5 + 0.5 * Math.sin(t * 0.7)) : -0.8;
    gaugeMat.color.set(live ? '#ecf7d8' : '#333');
  };
};

export const BUILDERS: Record<string, Builder> = { computer, gamingComputer, studyDesk, microscope, anatomyModel, chemistrySet, drivingSim, planningBoard, businessBoardGame, woodworkingTable, homeToolBench, rocketShip };
