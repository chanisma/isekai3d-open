import * as THREE from 'three';
import { marker, rod, shade, spot, type Builder, type Built, type Spot } from '../parts';
import { box, canvasTexture, cyl, part, rbox } from '../toon';
import {
  BARS, CHANNEL_HOLD, FISH_N, POND, POOL, REEL, ROD_BUTT, ROD_GRIP, TANK, fract,
  pgAim, pgAngleNow, pgChannel, pgFishAt, pgHolds, pgLive, pgMove, pgPosed, pgPulse, pgStroke, pgSwimAt, rungX, type V,
} from './playMotion';

/*
 * Play and media at home, redone (2026-11-01, at the user's request; docs/workplaces/PIPELINE.md, 집 가구).
 * djBooth and toyBox are drawn by their workplaces (workplaces/dj.ts, kindergartenTeacher.ts), which come first.
 *
 * What a screen shows is painted on a canvas of its own: never given as Built.screen, whose colour lot3d.ts sets each
 * frame and would tint the picture. The piece's standby lamp is the Built.screen instead, so its colour says when the
 * thing is really on (used, with the power on, not broken), for a dweller on the sofa too. Everything that goes on whether
 * or not anyone's there (fish, water) runs in Built.away, which is told every frame.
 *
 * All names, programmes and songs here are made up.
 */

const FONT = '"Noto Sans KR","Malgun Gothic","Apple SD Gothic Neo",sans-serif';
const WALNUT = '#6b4630';
const WALNUT_DARK = '#4b2f20';
const OAK = '#b98a5a';
const OAK_DARK = '#8f6841';
const BRASS = '#c9a24b';
const BLACK = '#23252b';
const GREY = '#4a4d55';
const CHROME = '#c3ccd2';
const CREAM = '#efe6d2';

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const TAU = Math.PI * 2;

/** A small round thing in few triangles: shared by size, never disposed. */
const dots = new Map<number, THREE.SphereGeometry>();
function dot(r: number): THREE.SphereGeometry {
  let g = dots.get(r);
  if (!g) dots.set(r, (g = new THREE.SphereGeometry(r, 8, 6)));
  return g;
}
const basic = (color: string, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
function own<T extends THREE.Mesh>(m: T, geometry = false, material = true): T {
  if (geometry) m.userData.ownGeometry = true;
  if (material) m.userData.ownMaterial = true;
  return m;
}
/** A flat thing with a picture or a colour of its own, facing +z. */
function flat(g: THREE.Object3D, w: number, h: number, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const m = own(new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat), true);
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
const group = (g: THREE.Object3D, x = 0, y = 0, z = 0) => {
  const o = new THREE.Group();
  o.position.set(x, y, z);
  g.add(o);
  return o;
};

/** The standby lamp, handed over as Built.screen: bright when lot3d.ts says the piece is on. */
function standby(g: THREE.Object3D, out: Built, x: number, y: number, z: number): () => boolean {
  const m = own(new THREE.Mesh(box(0.016, 0.01, 0.006), basic('#2a3140')));
  m.position.set(x, y, z);
  m.castShadow = false;
  g.add(m);
  out.screen = m;
  const mat = m.material as THREE.MeshBasicMaterial;
  return () => mat.color.g > 0.3;
}

// -------------------------------------------------------------------------------------------------
// Pictures, painted over and over: nothing here may throw, whatever the time.

/** What a picture is drawn on: all of a canvas's drawing the pictures use. */
export type Painter = Pick<CanvasRenderingContext2D, 'save' | 'restore' | 'scale' | 'fillRect' | 'beginPath' | 'arc' | 'fill' | 'stroke' | 'moveTo' | 'lineTo' | 'rect' | 'clip' | 'fillText' | 'measureText' | 'closePath'> & {
  fillStyle: unknown;
  strokeStyle: unknown;
  lineWidth: number;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  globalAlpha: number;
};

/** The array's item, whatever the index. */
const pick = <T,>(a: readonly T[], i: number): T => a[((Math.floor(i) % a.length) + a.length) % a.length];
function circle(c: Painter, x: number, y: number, r: number, color?: string) {
  c.beginPath();
  c.arc(x, y, Math.max(0.01, r), 0, TAU);
  if (color) {
    c.fillStyle = color;
    c.fill();
  }
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
function face(c: Painter, x: number, y: number, r: number, skin: string, hair: string, talking: boolean, t: number) {
  circle(c, x, y + r * 2.2, r * 1.4, hair);
  circle(c, x, y, r, skin);
  c.beginPath();
  c.arc(x, y - r * 0.2, Math.max(0.01, r * 1.02), Math.PI, TAU);
  c.fillStyle = hair;
  c.fill();
  const blink = fract(t * 0.3 + x) < 0.04;
  for (const s of [-1, 1]) rect(c, x + s * r * 0.4 - 1, y - 1, 2.4, blink ? 0.6 : 3, '#2b2233');
  circle(c, x, y + r * 0.5, talking ? r * (0.1 + 0.16 * Math.abs(Math.sin(t * 11))) : r * 0.07, '#8a3a44');
}

const SUBS = ['그날 이후로 등대 불이 꺼졌어요.', '마을 사람들은 아무도 몰라요.', '내일 아침, 다시 와 줄래요?', '달빛이 비치면 문이 열린대요.', '그 편지는 누가 보낸 걸까요?'];
const DISHES = ['방울방울 국수', '구름빵 샌드', '노을빛 볶음밥'];
const NEWS = ['말랑시, 공원에 새 분수 개장', '솜구름 축제 내일 시작', '오늘 밤 별똥별 많이 보여요', '동네 빵집 줄이 길어졌어요'];
const QUIZ: ReadonlyArray<[string, readonly string[], number]> = [
  ['달팽이의 눈은 몇 개일까요?', ['한 개', '두 개', '네 개', '여섯 개'], 1],
  ['무지개 맨 위의 색은?', ['보라', '초록', '빨강', '파랑'], 2],
  ['거미의 다리는 몇 개일까요?', ['네 개', '여섯 개', '여덟 개', '열 개'], 2],
];

/** The programmes on the channels: all made up. */
export const PROGRAMMES: ReadonlyArray<{ name: string; glow: string }> = [
  { name: '달빛 마을 이야기', glow: '#ff9d6c' },
  { name: '뚝딱 한 그릇', glow: '#ffd27a' },
  { name: '초록 들판 탐험', glow: '#8fd86e' },
  { name: '별똥별 저녁 소식', glow: '#6fb0ff' },
  { name: '왕방울 퀴즈', glow: '#c58cff' },
  { name: '말랑이 친구들', glow: '#ff9ccf' },
];
export const WORKOUT_SHOW = { name: '아침 튼튼 체조', glow: '#7fe0c8' };

function drama(c: Painter, t: number) {
  const scene = Math.floor(t / 7);
  const dusk = scene % 2 === 0;
  rect(c, 0, 0, 320, 180, dusk ? '#f2a06b' : '#34406e');
  rect(c, 0, 118, 320, 62, dusk ? '#7a5240' : '#222a4d');
  circle(c, 262, 44, 22, dusk ? '#ffdf9e' : '#f4f1cf');
  // A house with a lit window behind them.
  rect(c, 30, 62, 86, 60, dusk ? '#a77455' : '#3c4778');
  rect(c, 52, 80, 22, 22, '#ffe08a');
  const a = fract(t / 3.5) < 0.5;
  const pan = 8 * Math.sin(t * 0.25);
  face(c, 130 + pan, 92, 24, '#f4cfae', '#3a2a2e', a, t);
  face(c, 214 + pan, 86, 26, '#edc29e', '#6a3f2c', !a, t + 2);
  rect(c, 0, 148, 320, 32, 'rgba(0,0,0,0.45)');
  words(c, pick(SUBS, t / 3.5), 160, 164, 15, '#fff', 'center');
}
function cooking(c: Painter, t: number) {
  rect(c, 0, 0, 320, 180, '#fbe7c5');
  for (let i = 0; i < 8; i++) rect(c, i * 42, 0, 21, 66, '#f3d5a6');
  rect(c, 0, 118, 320, 62, '#b98a5a');
  face(c, 86, 62, 22, '#f2c9a4', '#39312e', fract(t / 4) < 0.6, t);
  rect(c, 64, 58 - 26, 44, 12, '#ffffff');
  rect(c, 56, 86, 62, 42, '#ffffff');
  // A pot on the ring, its lid lifting, steam coming off.
  const lift = 3 * Math.abs(Math.sin(t * 3));
  rect(c, 158, 104, 96, 38, '#c45a44');
  rect(c, 150, 98 - lift, 112, 8, '#8f3d2e');
  for (let i = 0; i < 4; i++) {
    const u = fract(t * 0.5 + i / 4);
    c.globalAlpha = 0.65 * (1 - u);
    circle(c, 178 + i * 18 + 6 * Math.sin(t + i), 90 - 56 * u, 5 + 10 * u, '#ffffff');
  }
  c.globalAlpha = 1;
  rect(c, 8, 8, 132, 20, 'rgba(255,255,255,0.75)');
  words(c, `오늘의 요리: ${pick(DISHES, t / 22)}`, 14, 18, 10, '#6b3f25');
  words(c, `${(Math.floor(t / 4) % 5) + 1}단계`, 300, 18, 12, '#8f3d2e', 'right');
}
function nature(c: Painter, t: number) {
  rect(c, 0, 0, 320, 180, '#a5dcf5');
  circle(c, 60, 36, 20, '#fff2b3');
  // Hills going by at their different speeds, a made-up beast ambling along.
  const hill = (base: number, h: number, sp: number, col: string, wide: number) => {
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(0, 180);
    for (let x = 0; x <= 320; x += 16) c.lineTo(x, base - h * Math.sin((x + t * sp) / wide));
    c.lineTo(320, 180);
    c.closePath();
    c.fill();
  };
  hill(92, 18, 8, '#8ccf86', 52);
  hill(118, 12, 18, '#6db565', 37);
  hill(146, 6, 34, '#4f9a4e', 24);
  const x = 160 + 90 * Math.sin(t * 0.2);
  const dirn = Math.cos(t * 0.2) >= 0 ? 1 : -1;
  const y = 122 + 2 * Math.sin(t * 7);
  circle(c, x, y, 18, '#e8a860');
  circle(c, x + dirn * 18, y - 12, 10, '#efb979');
  circle(c, x + dirn * 22, y - 15, 1.8, '#2b2233');
  for (const s of [-10, -3, 4, 11]) rect(c, x + s, y + 14, 4, 11 + 2 * Math.sin(t * 7 + s), '#b9783d');
  for (const [i, bx] of [0, 1, 2].entries()) {
    const u = fract(t * 0.07 + bx / 3);
    line(c, 320 * u, 40 + 12 * i - 3 * Math.sin(t * 6 + i), 320 * u + 6, 44 + 12 * i, '#3b4254', 1.2);
    line(c, 320 * u + 6, 44 + 12 * i, 320 * u + 12, 40 + 12 * i - 3 * Math.sin(t * 6 + i), '#3b4254', 1.2);
  }
  rect(c, 8, 150, 160, 22, 'rgba(0,0,0,0.35)');
  words(c, '오늘의 동물: 복슬코뿔이', 14, 161, 12, '#fff');
}
function news(c: Painter, t: number) {
  rect(c, 0, 0, 320, 180, '#1d3a6d');
  rect(c, 180, 18, 124, 78, '#32609f');
  // The story's picture changes: a chart, a made-up town map, a big star.
  const shot = Math.floor(t / 6) % 3;
  if (shot === 0) for (let i = 0; i < 6; i++) rect(c, 190 + i * 18, 88 - (18 + 26 * Math.abs(Math.sin(i * 1.7 + Math.floor(t / 6)))), 12, 18 + 26 * Math.abs(Math.sin(i * 1.7 + Math.floor(t / 6))), '#ffd166');
  else if (shot === 1) {
    circle(c, 226, 58, 26, '#7ec488');
    circle(c, 262, 48, 18, '#8fd196');
    circle(c, 236 + 14 * Math.sin(t), 56, 3.5, '#ff6b6b');
  } else {
    circle(c, 242, 56, 14 + 4 * Math.sin(t * 3), '#fff2b3');
    line(c, 214, 28, 232, 46, '#fff2b3', 3);
  }
  rect(c, 30, 118, 150, 30, '#16294f');
  face(c, 100, 76, 23, '#f2c9a4', '#2e2830', true, t);
  rect(c, 0, 132, 320, 24, '#c63d3d');
  words(c, pick(NEWS, t / 6), 10, 144, 13, '#fff');
  rect(c, 0, 156, 320, 24, '#0e1a33');
  const tick = NEWS.join('  ·  ');
  const w = Math.max(1, c.measureText(tick).width);
  words(c, tick, 320 - ((t * 44) % (w + 330)), 168, 11, '#d7e4ff');
}
function quiz(c: Painter, t: number) {
  const n = Math.floor(t / 9);
  const [q, as, right] = pick(QUIZ, n);
  const u = fract(t / 9);
  rect(c, 0, 0, 320, 180, '#3b237a');
  for (let i = 0; i < 9; i++) circle(c, 18 + i * 36, 10 + 4 * Math.sin(t * 3 + i), 3, pick(['#ffe066', '#ff8fb1', '#7fe0ff'], i + Math.floor(t * 2)));
  rect(c, 16, 24, 288, 40, '#fff');
  words(c, q, 160, 44, 15, '#2c1a5c', 'center');
  as.forEach((a, i) => {
    const x = 16 + (i % 2) * 148;
    const y = 74 + Math.floor(i / 2) * 36;
    const shown = u > 0.72 && i === right;
    rect(c, x, y, 140, 30, shown ? '#5fd37a' : '#6a4bc0');
    words(c, `${i + 1}. ${a}`, x + 70, y + 15, 13, '#fff', 'center');
  });
  rect(c, 16, 150, 288, 10, '#22134f');
  rect(c, 16, 150, 288 * Math.max(0, 1 - u / 0.72), 10, '#ffd166');
}
function cartoon(c: Painter, t: number) {
  rect(c, 0, 0, 320, 180, '#bfeaff');
  rect(c, 0, 132, 320, 48, '#ffd97a');
  const clouds = (x: number) => {
    circle(c, x, 36, 14, '#fff');
    circle(c, x + 16, 32, 18, '#fff');
    circle(c, x + 34, 38, 12, '#fff');
  };
  clouds(((t * 12) % 400) - 60);
  clouds(((t * 7 + 170) % 400) - 60);
  ['#ff8fb1', '#7fd1ff', '#9be08a'].forEach((col, i) => {
    const b = Math.abs(Math.sin(t * 2.6 + i * 1.1));
    const x = 80 + i * 80 + 12 * Math.sin(t * 0.9 + i);
    const y = 124 - 46 * b;
    const sq = 1 + 0.2 * (1 - b);
    c.save();
    circle(c, x, y, 24 * sq, col);
    c.restore();
    for (const s of [-1, 1]) {
      circle(c, x + s * 9, y - 4, 5.5, '#fff');
      circle(c, x + s * 9 + 1.5 * Math.sin(t * 2), y - 4, 2.5, '#2b2233');
    }
    circle(c, x, y + 9, 1.5 + 4 * b, '#7a2b45');
  });
  words(c, pick(['와, 신난다!', '또 해 볼까?', '말랑말랑!', '어디로 갈까?'], t / 3), 160, 158, 15, '#7a4c10', 'center');
}
/** The teacher, doing what pgMove says, so a dweller following along keeps with them. */
function workoutShow(c: Painter, t: number) {
  const m = pgMove(t);
  rect(c, 0, 0, 320, 180, '#e0f7ef');
  rect(c, 0, 132, 320, 48, '#8fd3b5');
  for (let i = 0; i < 6; i++) circle(c, 30 + i * 52, 26, 12, '#fff');
  const H = 106;
  const cx = 160 + m.side * 6;
  const foot = 150;
  const down = m.crouch * H * 0.26;
  const hip = foot - H * 0.5 + down;
  const sh = hip - H * 0.3 * Math.cos(m.lean);
  const hx = cx - m.side * 14;
  const figure = '#2f7f63';
  const legs = m.crouch * 18;
  for (const s of [-1, 1]) {
    line(c, cx + s * 7, hip, cx + s * (12 + legs), hip + (foot - hip) * 0.5, figure, 7);
    line(c, cx + s * (12 + legs), hip + (foot - hip) * 0.5, cx + s * 12, foot, figure, 6);
  }
  line(c, cx, hip, hx, sh, '#f29a4a', 15);
  // On the screen the teacher faces the viewer: their left hand on the right of the picture.
  for (const [s, h] of [[1, m.l], [-1, m.r]] as Array<[number, V]>) {
    const hy = foot - h[2] * H + down;
    const hxx = cx + s * Math.abs(h[1]) * H * 1.5 - m.side * 20;
    line(c, hx + s * 9, sh + 3, hxx, hy, '#f2c9a4', 5);
  }
  face(c, hx, sh - 18, 13, '#f2c9a4', '#2e2830', true, t);
  rect(c, 0, 0, 320, 22, 'rgba(47,127,99,0.85)');
  words(c, m.name, 160, 11, 13, '#fff', 'center');
  const count = (Math.floor(t / 0.8) % 8) + 1;
  words(c, String(count), 296, 56, 34, '#2f7f63', 'center');
}

const SHOWS = [drama, cooking, nature, news, quiz, cartoon];

/** A frame of the TV: channel `n` (or the workout), in a 320 × 180 picture scaled to fit. */
export function paintTv(c: Painter, w: number, h: number, n: number, workout: boolean, t: number, since: number, lux: boolean) {
  c.save();
  c.scale(w / 320, h / 180);
  (workout ? workoutShow : pick(SHOWS, n))(c, t);
  const show = workout ? WORKOUT_SHOW : pick(PROGRAMMES, n);
  // The channel's number and name, for a moment after it's changed; snow as it changes.
  if (since < 3) {
    rect(c, 8, 8, 8 + show.name.length * 12, 18, 'rgba(0,0,0,0.55)');
    words(c, `${workout ? 12 : ((Math.floor(n) % 9) + 9) % 9 + 1} ${show.name}`, 12, 17, 11, '#fff');
  }
  if (!workout && since < 0.28) {
    for (let i = 0; i < 40; i++) {
      const k = fract(Math.sin(i * 91.7 + t * 37) * 4375.5);
      rect(c, 0, (i / 40) * 180, 320, 4.6, k > 0.5 ? '#d8d8d8' : '#3d3d3d');
    }
  }
  // A better set shows what's next along the bottom, and the time.
  if (lux && !workout && since > 3 && since < 7) {
    rect(c, 196, 6, 118, 15, 'rgba(0,0,0,0.5)');
    words(c, `다음: ${pick(PROGRAMMES, n + 1).name}`, 200, 13.5, 9, '#fff');
  }
  c.restore();
}

/** Songs, all made up: their lines as they scroll up the screen. */
export const SONGS: ReadonlyArray<{ title: string; bg: readonly [string, string]; lines: readonly string[] }> = [
  { title: '솜사탕 버스', bg: ['#2b2a78', '#b84a9c'], lines: ['창문마다 분홍빛 구름', '버스는 천천히 달려요', '내릴 곳을 잊어버린 채', '솜사탕처럼 흔들흔들', '다음 정류장은 어디일까', '우리 둘만 아는 그곳'] },
  { title: '구름 위 소풍', bg: ['#10567a', '#39c0b3'], lines: ['돗자리 펴고 앉아 볼까', '김밥 한 줄 나눠 먹고', '바람이 책장을 넘기면', '낮잠이 솔솔 찾아와요', '오늘은 아무 일 없어도', '참 좋은 날이었어요'] },
  { title: '노란 우산 왈츠', bg: ['#5a2d0c', '#e0a019'], lines: ['비 오는 골목 끝에서', '노란 우산 하나 돌아요', '하나 둘 셋 발맞추면', '웅덩이도 무대가 돼요', '젖은 신발 그대로', '한 바퀴 더 돌아요'] },
];
export const LINE_SECONDS = 4;
/** A frame of the karaoke screen: the song's lines going up, the one being sung wiped over from the left. */
export function paintKaraoke(c: Painter, w: number, h: number, t: number) {
  const perSong = SONGS[0].lines.length * LINE_SECONDS + 6;
  const n = Math.floor(t / perSong);
  const song = pick(SONGS, n);
  const into = t - n * perSong;
  c.save();
  c.scale(w / 320, h / 200);
  // The two colours of its backdrop in bands, with lights going by.
  for (let i = 0; i < 10; i++) rect(c, 0, i * 20, 320, 20.5, i < 5 ? song.bg[0] : song.bg[1]);
  for (let i = 0; i < 7; i++) {
    const x = fract(t * 0.05 + i * 0.17) * 340 - 10;
    c.globalAlpha = 0.35;
    circle(c, x, 40 + 22 * i + 8 * Math.sin(t + i), 10 + 9 * Math.abs(Math.sin(t * 0.7 + i * 2)), '#ffffff');
    c.globalAlpha = 1;
  }
  words(c, song.title, 160, 18, 13, '#ffe88a', 'center');
  if (into < 3) {
    words(c, song.title, 160, 86, 28, '#fff', 'center');
    words(c, '전주 중...', 160, 124, 13, '#ffe88a', 'center');
  } else if (into > perSong - 3) {
    const score = 72 + ((n * 37) % 29 + 29) % 29;
    words(c, '이번 점수', 160, 76, 16, '#fff', 'center');
    words(c, String(score), 160, 118, 44, '#ffe88a', 'center');
  } else {
    const q = (into - 3) / LINE_SECONDS;
    const i = Math.floor(q);
    const e = q - i;
    const up = Math.min(1, e * 5);
    for (let k = -1; k <= 2; k++) {
      const li = i + k;
      if (li < 0 || li >= song.lines.length) continue;
      const y = 94 + (k + 1 - up) * 40;
      const size = k === 0 ? 20 : 15;
      const s = song.lines[li];
      words(c, s, 160, y, size, k === 0 ? '#ffffff' : 'rgba(255,255,255,0.55)', 'center');
      if (k === 0) {
        const lw = Math.max(1, c.measureText(s).width);
        c.save();
        c.beginPath();
        c.rect(160 - lw / 2, y - 16, lw * Math.min(1, Math.max(0, (e - 0.08) / 0.84)), 32);
        c.clip();
        words(c, s, 160, y, size, '#7ff2ff', 'center');
        c.restore();
      }
    }
    // The dots that count a line in.
    for (let d = 0; d < 4; d++) circle(c, 136 + d * 16, 180, e * 4 > d ? 2 : 4.5, '#ffe88a');
  }
  c.restore();
}

/** A canvas repainted as often as it's asked (and no more than `fps`), on a plane. Outside a browser, nothing. */
class LivePicture {
  readonly mat: THREE.MeshBasicMaterial;
  private readonly tex: THREE.CanvasTexture | null = null;
  private readonly ctx: CanvasRenderingContext2D | null = null;
  private last = -1e9;
  constructor(readonly w: number, readonly h: number, private readonly paint: (c: Painter, w: number, h: number, t: number) => void, private readonly fps = 12) {
    this.mat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    if (typeof document === 'undefined') return;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    this.ctx = canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.mat.map = this.tex;
  }
  draw(t: number) {
    if (!this.ctx || !this.tex || Math.abs(t - this.last) < 1 / this.fps) return;
    this.last = t;
    this.paint(this.ctx as unknown as Painter, this.w, this.h, t);
    this.tex.needsUpdate = true;
  }
}

/** Soft glints for water, scrolled over it. */
let glints: THREE.Texture | null = null;
function waterGlints(): THREE.Texture {
  return (glints ??= canvasTexture(128, 128, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 128, 128);
    c.strokeStyle = 'rgba(70,130,170,0.5)';
    c.lineWidth = 2;
    for (let i = 0; i < 26; i++) {
      const x = (i * 53) % 128;
      const y = (i * 29) % 128;
      c.beginPath();
      c.arc(x, y, 7 + (i % 5) * 3, 0.4 + i, 2 + i);
      c.stroke();
    }
  }));
}

/** Rings spreading on water at a height; `at` says where each is starting from. */
class Ripples {
  private readonly rings: Array<{ m: THREE.Mesh; mat: THREE.MeshBasicMaterial; ph: number; x: number; z: number; was: number }> = [];
  constructor(parent: THREE.Object3D, n: number, y: number, private readonly period: number, private readonly size: number, color = '#ffffff') {
    const geom = new THREE.RingGeometry(0.86, 1, 28).rotateX(-Math.PI / 2);
    for (let i = 0; i < n; i++) {
      const mat = basic(color, 0.5);
      const m = own(new THREE.Mesh(geom, mat), i === 0);
      m.position.y = y;
      m.renderOrder = 4;
      m.castShadow = false;
      m.name = 'ripple';
      parent.add(m);
      this.rings.push({ m, mat, ph: i / n, x: 0, z: 0, was: 1 });
    }
  }
  /** `at(i)` is asked where a ring begins each time one does. */
  update(t: number, at: (i: number) => [number, number]) {
    this.rings.forEach((r, i) => {
      const u = fract(t / this.period + r.ph);
      if (u < r.was) [r.x, r.z] = at(i);
      r.was = u;
      r.m.position.x = r.x;
      r.m.position.z = r.z;
      const k = Math.max(0.02, this.size * (0.08 + 0.92 * u));
      r.m.scale.set(k, 1, k);
      r.mat.opacity = 0.55 * (1 - u);
    });
  }
}

// -------------------------------------------------------------------------------------------------
// The TVs.

const remote = (parent: THREE.Object3D) => {
  const tool = group(parent);
  tool.name = 'remote';
  part(tool, rbox(0.048, 0.17, 0.018, 0.008), BLACK, 0, 0.03, 0, { outline: false, shadow: false });
  part(tool, box(0.012, 0.012, 0.004), '#e8483f', 0, 0.098, 0.009, { outline: false, shadow: false });
  for (let i = 0; i < 9; i++) part(tool, box(0.009, 0.007, 0.003), '#cfd2d6', -0.012 + (i % 3) * 0.012, 0.07 - Math.floor(i / 3) * 0.012, 0.009, { outline: false, shadow: false });
  part(tool, box(0.03, 0.03, 0.003), GREY, 0, -0.01, 0.009, { outline: false, shadow: false });
  return tool;
};

const tvOf = (lux: boolean): Builder => (g, W, D, _c, _def, _ctx, out) => {
  const back = -D / 2;
  const sw = lux ? 1.72 : 1.24;
  const sh = sw * (9 / 16);
  const cabH = lux ? 0.36 : 0.45;
  const cabD = lux ? 0.46 : 0.42;
  const cz = back + cabD / 2 + 0.03;
  const wood = lux ? WALNUT : OAK;
  const woodD = lux ? WALNUT_DARK : OAK_DARK;
  const cw = W - (lux ? 0.04 : 0.2);
  // The cabinet: legs (brass on the good one), the top, doors with pulls, a shelf of odds and ends behind them.
  part(g, rbox(cw, cabH - 0.1, cabD, 0.02), wood, 0, 0.1 + (cabH - 0.1) / 2, cz);
  part(g, rbox(cw + 0.03, 0.03, cabD + 0.03, 0.012), lux ? shade(WALNUT, 1.2) : shade(OAK, 1.1), 0, cabH + 0.005, cz);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.016, lux ? 0.009 : 0.016, 0.1, 8), lux ? BRASS : OAK_DARK, sx * (cw / 2 - 0.08), 0.05, cz + sz * (cabD / 2 - 0.06), { outline: false });
  const fz = cz + cabD / 2;
  const doors = lux ? 3 : 2;
  for (let i = 0; i < doors; i++) {
    const dw = (cw - 0.06) / doors;
    const x = -cw / 2 + 0.03 + dw * (i + 0.5);
    if (lux && i === 1) {
      // The open middle bay: the box and the sub.
      part(g, box(dw - 0.02, cabH - 0.16, 0.01), '#1f1a18', x, 0.1 + (cabH - 0.1) / 2, fz + 0.002, { outline: false });
      part(g, rbox(0.34, 0.05, 0.02, 0.006), BLACK, x, 0.27, fz + 0.01, { outline: false });
      part(g, box(0.05, 0.004, 0.003), '#7fe0ff', x + 0.1, 0.27, fz + 0.021, { outline: false });
      continue;
    }
    part(g, box(dw - 0.02, cabH - 0.16, 0.008), woodD, x, 0.1 + (cabH - 0.1) / 2, fz + 0.003, { outline: false });
    part(g, cyl(0.009, 0.009, 0.05, 8), lux ? BRASS : CREAM, x + (i === 0 ? dw * 0.34 : -dw * 0.34), 0.25, fz + 0.016, { outline: false });
  }
  // The set: a thin bezel, its foot; dark glass when it's off.
  const footY = cabH + 0.02;
  const y = footY + (lux ? 0.08 : 0.07) + sh / 2 + 0.03;
  const z = back + 0.2;
  const bezel = lux ? 0.012 : 0.03;
  part(g, rbox(sw + bezel * 2, sh + bezel * 2, lux ? 0.03 : 0.06, 0.008), BLACK, 0, y, z);
  if (lux) {
    for (const s of [-1, 1]) rod(g, v(s * 0.5, footY, z + 0.07), v(s * 0.5, y - sh / 2, z), 0.009, CHROME);
    part(g, rbox(1.2, 0.05, 0.08, 0.02), GREY, 0, footY + 0.03, z + 0.15);
    for (let i = 0; i < 9; i++) part(g, box(0.1, 0.03, 0.002), '#34363c', -0.48 + i * 0.12, footY + 0.03, z + 0.191, { outline: false });
  } else {
    part(g, rbox(0.42, 0.018, 0.2, 0.008), GREY, 0, footY + 0.009, z + 0.02);
    part(g, rbox(0.08, 0.08, 0.05, 0.01), GREY, 0, footY + 0.05, z);
    part(g, box(sw, 0.022, 0.012), '#34363c', 0, y - sh / 2 - 0.018, z + 0.03, { outline: false });
  }
  const front = z + (lux ? 0.015 : 0.03);
  const glass = part(g, box(sw, sh, 0.003), '#141a24', 0, y, front + 0.001, { outline: false, shadow: false });
  glass.name = 'glass';
  const sheen = flat(g, sw * 0.24, sh * 1.0, basic('#7f92a8', 0.12), -sw * 0.28, y, front + 0.004);
  sheen.rotation.z = 0.32;
  sheen.scale.y = 0.96;
  sheen.castShadow = false;
  const isOn = standby(g, out, lux ? sw / 2 - 0.03 : 0, y - sh / 2 - (lux ? 0.001 : 0.018), front + (lux ? 0.004 : 0.004));

  let channel = 0;
  let workout = false;
  let since = 0;
  const pic = new LivePicture(lux ? 512 : 320, lux ? 288 : 180, (c, w, h, t) => paintTv(c, w, h, channel, workout, t, since, lux), lux ? 15 : 12);
  const screen = flat(g, sw, sh, pic.mat, 0, y, front + 0.006);
  screen.name = 'picture';
  screen.visible = false;
  // A good set throws its colours on the wall behind it.
  let halo: THREE.Mesh | undefined;
  if (lux) {
    const m = basic('#6fb0ff', 0.32);
    halo = flat(g, sw + 0.4, sh + 0.42, m, 0, y, z - 0.03);
    halo.name = 'halo';
    halo.visible = false;
    halo.castShadow = false;
  }

  // On top: a framed photo, a plant, books; the remote lying by.
  const tz = cz + 0.04;
  const top = cabH + 0.02;
  const px = -cw / 2 + (lux ? 0.11 : 0.09);
  part(g, cyl(0.05, 0.04, 0.09, 12), lux ? '#d7cfc1' : '#c98a64', px, top + 0.045, tz - 0.04);
  for (const [dx, dy, dz, r] of [[0, 0.13, 0, 0.055], [0.04, 0.11, 0.03, 0.04], [-0.04, 0.11, -0.02, 0.04]]) part(g, dot(r), '#6fa35f', px + dx, top + dy, tz - 0.04 + dz, { outline: false });
  for (const [i, col] of ['#b5533c', '#3f6f8f', '#d8a23a'].entries()) part(g, rbox(0.17, 0.028, 0.12, 0.004), col, cw / 2 - 0.13, top + 0.014 + i * 0.03, tz - 0.05, { ry: 0.08 * i });
  const rest: V = [cw / 2 - 0.34, top + 0.012, tz + 0.05];
  const tool = remote(g);
  const restAim = () => pgAim(tool, [rest[0], rest[1], rest[2] - 0.03], [0.2, 0, 1], [0, 1, 0]);
  restAim();

  const atFront = (x: number): [number, number] => [x, D / 2 + 0.72];
  const watch = spot(g, 'stand', 0, 0, D / 2 + 0.72, Math.PI);
  watch.motion = 'pgWatch';
  watch.at.userData.slots = [atFront(0), atFront(-0.62), atFront(0.62)];
  watch.at.userData.tool = tool;
  const follow = spot(g, 'stand', 0, 0, D / 2 + 0.72, Math.PI);
  follow.motion = 'pgWorkout';
  out.spots = { watch, tvWorkout: follow };
  out.work = marker(g, sw / 2 - 0.1, y - sh / 2, front + 0.02);

  const tint3 = new THREE.Color();
  let wasN = NaN;
  let changed = -1e9;
  out.away = (_o, t) => {
    const on = isOn();
    screen.visible = on;
    if (halo) halo.visible = on;
    if (!on) {
      if (!pgHolds(watch, 0, t)) restAim();
      return;
    }
    workout = pgPosed(follow, t);
    const ch = pgChannel(t);
    channel = ch.n;
    if (channel !== wasN) {
      wasN = channel;
      changed = t;
    }
    since = Math.min(CHANNEL_HOLD, Math.max(0, workout ? fract(t / 30) * 30 : t - changed));
    pic.draw(t);
    if (halo) {
      tint3.set(workout ? WORKOUT_SHOW.glow : PROGRAMMES[((channel % PROGRAMMES.length) + PROGRAMMES.length) % PROGRAMMES.length].glow);
      (halo.material as THREE.MeshBasicMaterial).color.copy(tint3).multiplyScalar(0.75 + 0.25 * Math.sin(t * 2.3));
    }
    if (!pgHolds(watch, 0, t)) restAim();
  };
};

// -------------------------------------------------------------------------------------------------
// The stereo: a walnut stack between two tower speakers, on a rug-free shelf; a record going round on top.

const stereo: Builder = (g, _W, D, _c, _def, _ctx, out) => {
  const z = -D / 2 + 0.28;
  const cw = 0.44;
  const fz = z + 0.2;
  // The stack.
  part(g, rbox(cw, 0.72, 0.42, 0.02), WALNUT, 0, 0.36, z);
  part(g, rbox(cw + 0.03, 0.025, 0.44, 0.01), shade(WALNUT, 1.2), 0, 0.73, z);
  for (const sx of [-1, 1]) part(g, cyl(0.02, 0.02, 0.05, 8), WALNUT_DARK, sx * 0.18, 0.018, z);
  // The amplifier, with its two needles and two knobs.
  part(g, rbox(cw - 0.04, 0.16, 0.03, 0.006), '#c8c4ba', 0, 0.56, fz + 0.012);
  const needles: THREE.Object3D[] = [];
  for (const s of [-1, 1]) {
    const x = s * 0.085;
    part(g, box(0.135, 0.07, 0.004), '#fff1c4', x, 0.585, fz + 0.029, { outline: false, material: basic('#ffefc0') });
    own(g.children[g.children.length - 1] as THREE.Mesh);
    part(g, box(0.1, 0.004, 0.002), '#e8483f', x + 0.02, 0.61, fz + 0.032, { outline: false });
    const n = group(g, x, 0.555, fz + 0.033);
    part(n, box(0.003, 0.06, 0.002), '#2b2233', 0, 0.03, 0, { outline: false, shadow: false });
    n.name = 'needle';
    needles.push(n);
  }
  for (const x of [-0.13, -0.06, 0.06, 0.13]) part(g, cyl(0.016, 0.018, 0.016, 12), GREY, x, 0.517, fz + 0.034, { rx: Math.PI / 2, outline: false });
  const isOn = standby(g, out, 0, 0.517, fz + 0.034);
  // The tape deck, its reels behind the window, and a row of lights that jump.
  part(g, rbox(cw - 0.04, 0.17, 0.03, 0.006), '#2d2f36', 0, 0.37, fz + 0.012);
  part(g, box(0.17, 0.09, 0.004), '#515866', -0.09, 0.385, fz + 0.029, { outline: false });
  const reels: THREE.Object3D[] = [];
  for (const dx of [-0.04, 0.04]) {
    const r = group(g, -0.09 + dx, 0.385, fz + 0.033);
    part(r, cyl(0.022, 0.022, 0.003, 10), CREAM, 0, 0, 0, { rx: Math.PI / 2, outline: false, shadow: false });
    for (let i = 0; i < 3; i++) part(r, box(0.004, 0.018, 0.004), GREY, 0.012 * Math.sin((i * TAU) / 3), 0.012 * Math.cos((i * TAU) / 3), 0.002, { rz: -(i * TAU) / 3, outline: false, shadow: false });
    reels.push(r);
  }
  const barCols = ['#7fe08a', '#7fe08a', '#7fe08a', '#ffd166', '#ffd166', '#ff6b6b'];
  const bars: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const m = part(g, box(0.016, 0.06, 0.003), barCols[i], 0.055 + i * 0.024, 0.355, fz + 0.03, { outline: false, shadow: false, material: basic(barCols[i]) });
    own(m);
    m.name = 'bar';
    bars.push(m);
  }
  // Records on the shelf under.
  part(g, box(cw - 0.06, 0.22, 0.004), '#2b1d15', 0, 0.16, fz + 0.012, { outline: false });
  for (let i = 0; i < 9; i++) part(g, box(0.02, 0.2, 0.006), ['#b5533c', '#3f6f8f', '#d8a23a', '#6a8f58', '#e8dcc0'][i % 5], -0.16 + i * 0.04, 0.16, fz + 0.016, { outline: false });
  // The turntable on top: its plinth, the record that spins, the arm down on it.
  part(g, rbox(cw - 0.02, 0.05, 0.38, 0.01), OAK, 0, 0.77, z);
  const plat = group(g, -0.05, 0.8, z + 0.01);
  plat.name = 'platter';
  part(plat, cyl(0.15, 0.15, 0.012, 28), '#16171b', 0, 0, 0, { outline: false });
  part(plat, cyl(0.05, 0.05, 0.003, 16), '#e8483f', 0, 0.007, 0, { outline: false, shadow: false });
  part(plat, box(0.11, 0.0015, 0.008), '#ffe08a', 0.03, 0.009, 0, { outline: false, shadow: false });
  const arm = group(g, 0.17, 0.81, z - 0.12);
  part(arm, cyl(0.016, 0.02, 0.03, 10), CHROME, 0, 0, 0, { outline: false });
  const armBar = group(arm, 0, 0.018, 0);
  part(armBar, box(0.006, 0.006, 0.24), CHROME, 0, 0, 0.12, { outline: false });
  part(armBar, rbox(0.018, 0.008, 0.03, 0.003), BLACK, 0, -0.002, 0.25, { outline: false });

  // Two tower speakers, the cones really pushing.
  const cones: THREE.Object3D[] = [];
  for (const s of [-1, 1]) {
    const x = s * 0.35;
    const sz = -D / 2 + 0.2;
    const cz = sz + 0.13;
    part(g, rbox(0.21, 0.98, 0.26, 0.012), WALNUT, x, 0.5, sz);
    part(g, box(0.17, 0.92, 0.004), '#32343b', x, 0.5, cz + 0.001, { outline: false });
    for (const [y, r] of [[0.28, 0.08], [0.56, 0.058]] as const) {
      part(g, cyl(r + 0.011, r + 0.011, 0.012, 22), '#16171b', x, y, cz + 0.008, { rx: Math.PI / 2, outline: false });
      const cone = group(g, x, y, cz + 0.012);
      part(cone, new THREE.ConeGeometry(r, 0.03, 22).rotateX(-Math.PI / 2).translate(0, 0, 0.0), '#55575f', 0, 0, 0.006, { outline: false, shadow: false });
      own(cone.children[0] as THREE.Mesh, true, false);
      part(cone, dot(r * 0.28), '#2a2b31', 0, 0, 0.018, { outline: false, shadow: false });
      cone.name = 'cone';
      cones.push(cone);
    }
    part(g, cyl(0.022, 0.022, 0.01, 12), CHROME, x, 0.82, cz + 0.008, { rx: Math.PI / 2, outline: false });
    part(g, dot(0.016), '#1c1d22', x, 0.82, cz + 0.014, { outline: false });
  }

  const slot = (x: number): [number, number] => [x, D / 2 + 0.52];
  const atFront = (m: 'pgListen' | 'pgDance' | 'pgDrill') => {
    const s = spot(g, 'stand', 0, 0, D / 2 + 0.52, Math.PI);
    s.motion = m;
    s.at.userData.slots = [slot(0), slot(-0.6), slot(0.6)];
    return s;
  };
  out.spots = { listen: atFront('pgListen'), dance: atFront('pgDance'), dancePractice: atFront('pgDrill') };
  out.spots.dancePractice.at.position.z = D / 2 + 0.72;
  out.work = marker(g, 0, 0.56, fz + 0.03);

  let level = 0;
  let last = 0;
  out.away = (_o, t) => {
    const dt = Math.min(0.2, Math.max(0, t - last));
    last = t;
    const on = isOn();
    level = THREE.MathUtils.damp(level, on ? 1 : 0, 6, dt);
    const p = pgPulse(t) * level;
    // The woofers shove with the kick, the mids with the off beats; the needles follow; the lights jump.
    cones.forEach((c, i) => {
      const k = i % 2 ? pgPulse(t + 0.27) * level : p;
      c.position.z = -D / 2 + 0.2 + 0.13 + 0.012 + (i % 2 ? 0.008 : 0.016) * k;
      c.scale.setScalar(1 + (i % 2 ? 0.03 : 0.06) * k);
    });
    needles.forEach((n, i) => {
      const jitter = 0.12 * Math.sin(t * (9 + i * 3)) + 0.08 * Math.sin(t * 17 + i);
      n.rotation.z = 0.75 - level * (0.75 + 0.7 * p + jitter);
    });
    bars.forEach((b, i) => {
      const a = 0.5 + 0.5 * Math.sin(t * (6.2 + i * 2.3) + i * 1.9);
      const h = Math.max(0.06, level * (0.2 + 0.8 * a * (0.5 + 0.5 * pgPulse(t + i * 0.05))));
      b.scale.y = h;
      b.position.y = 0.325 + 0.03 * h;
      b.visible = level > 0.02;
    });
    plat.rotation.y = -t * 3.5 * (level > 0.02 ? 1 : 0);
    armBar.rotation.y = -0.6;
    arm.rotation.y = 0.65 * (1 - level) - 0.08 * level * fract(t / 180);
    reels.forEach((r, i) => (r.rotation.z = -t * (i ? 2.4 : 1.7) * (level > 0.02 ? 1 : 0)));
  };
};

// -------------------------------------------------------------------------------------------------
// The karaoke machine.

const mic = (parent: THREE.Object3D, name: string, color: string) => {
  const tool = group(parent);
  tool.name = name;
  part(tool, cyl(0.017, 0.012, 0.17, 12), color, 0, -0.03, 0, { outline: false, shadow: false });
  part(tool, cyl(0.024, 0.018, 0.022, 14), CHROME, 0, 0.065, 0, { outline: false, shadow: false });
  part(tool, dot(0.032), '#9ba2a8', 0, 0.096, 0, { outline: false, shadow: false });
  part(tool, box(0.01, 0.012, 0.004), '#7fe08a', 0, 0.01, 0.015, { outline: false, shadow: false });
  return tool;
};

const karaoke: Builder = (g, _W, D, c, _def, _ctx, out) => {
  const back = -D / 2;
  const cw = 0.86;
  const z = back + 0.27;
  // The cabinet, its speakers and its panel.
  part(g, rbox(cw, 0.62, 0.46, 0.02), shade(c, 0.5), 0, 0.31, z);
  part(g, rbox(cw + 0.02, 0.025, 0.48, 0.008), BLACK, 0, 0.63, z);
  const fz = z + 0.23;
  for (const s of [-1, 1]) {
    part(g, cyl(0.115, 0.115, 0.01, 24), '#16171b', s * 0.24, 0.24, fz + 0.005, { rx: Math.PI / 2, outline: false });
    part(g, cyl(0.095, 0.095, 0.006, 22), '#44464e', s * 0.24, 0.24, fz + 0.012, { rx: Math.PI / 2, outline: false });
    part(g, dot(0.03), '#2a2b31', s * 0.24, 0.24, fz + 0.016, { outline: false });
  }
  part(g, rbox(cw - 0.08, 0.13, 0.012, 0.004), BLACK, 0, 0.51, fz + 0.006);
  const isOn = standby(g, out, cw / 2 - 0.08, 0.51, fz + 0.014);
  // The number pad and the song number's window.
  part(g, box(0.2, 0.05, 0.003), '#340b0b', -0.22, 0.51, fz + 0.013, { outline: false });
  const digits: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const m = own(part(g, box(0.03, 0.03, 0.002), '#ff5a4a', -0.29 + i * 0.045, 0.51, fz + 0.015, { outline: false, shadow: false, material: basic('#ff5a4a') }));
    digits.push(m);
  }
  for (let i = 0; i < 12; i++) part(g, box(0.022, 0.018, 0.003), '#cfd2d6', 0.03 + (i % 6) * 0.03, 0.525 - Math.floor(i / 6) * 0.028, fz + 0.013, { outline: false, shadow: false });
  // The screen behind, tipped back a little; the song book and the cradle in front.
  const sw = 0.76;
  const sh = 0.475;
  const sy = 0.91;
  const sz = back + 0.14;
  part(g, rbox(sw + 0.05, sh + 0.05, 0.05, 0.012), BLACK, 0, sy, sz);
  part(g, rbox(0.3, 0.03, 0.14, 0.01), GREY, 0, 0.655, sz);
  const pic = new LivePicture(320, 200, paintKaraoke, 14);
  part(g, box(sw, sh, 0.003), '#141a24', 0, sy, sz + 0.027, { outline: false, shadow: false });
  const screen = flat(g, sw, sh, pic.mat, 0, sy, sz + 0.03);
  screen.name = 'lyrics';
  screen.visible = false;
  // The song book, open at a page.
  part(g, rbox(0.24, 0.018, 0.17, 0.004), '#a33a3a', 0.26, 0.652, z + 0.1, { ry: -0.2 });
  part(g, box(0.22, 0.004, 0.155), CREAM, 0.26, 0.663, z + 0.1, { ry: -0.2, outline: false });
  // Two mics, wireless, in their cradle; a tambourine beside.
  const rests: V[] = [[-0.28, 0.67, z + 0.1], [-0.28, 0.67, z + 0.17]];
  part(g, rbox(0.3, 0.02, 0.17, 0.006), GREY, -0.28, 0.65, z + 0.135);
  const mics = [mic(g, 'mic1', '#2f3440'), mic(g, 'mic2', '#c23d6d')];
  const restMic = (i: number) => pgAim(mics[i], rests[i], [1, 0, 0], [0, 1, 0]);
  restMic(0);
  restMic(1);
  // A mirror ball on a stem over it all, the colour going round on the walls when it's on.
  rod(g, v(0, sy + sh / 2 + 0.02, sz), v(0, sy + sh / 2 + 0.2, sz), 0.006, CHROME);
  const ball = group(g, 0, sy + sh / 2 + 0.28, sz);
  ball.name = 'ball';
  part(ball, new THREE.IcosahedronGeometry(0.075, 1), '#dfe6ec', 0, 0, 0, { outline: false });
  own(ball.children[0] as THREE.Mesh, true, false);
  const beams = group(g);
  const beamMats: THREE.Mesh[] = [];
  for (const [i, col] of ['#ff5a9c', '#5ab4ff', '#ffe25a', '#6af0a0'].entries()) {
    const m = own(new THREE.Mesh(dot(0.05), basic(col, 0.55)));
    m.castShadow = false;
    m.name = `beam${i}`;
    beams.add(m);
    beamMats.push(m);
  }
  beams.visible = false;

  const slot = (x: number): [number, number] => [x, D / 2 + 0.46];
  const s = spot(g, 'stand', 0, 0, D / 2 + 0.46, Math.PI);
  s.motion = 'pgSing';
  s.at.userData.slots = [slot(0), slot(-0.54), slot(0.54)];
  s.at.userData.tools = mics;
  out.spots = { singKaraoke: s };
  out.work = marker(g, 0, 0.56, fz + 0.03);

  let wasOn = false;
  out.away = (_o, t) => {
    const on = isOn();
    if (on !== wasOn) {
      screen.visible = on;
      beams.visible = on;
      wasOn = on;
    }
    mics.forEach((_, i) => {
      if (!pgHolds(s, i, t)) restMic(i);
    });
    if (!on) return;
    pic.draw(t);
    ball.rotation.y = t * 1.3;
    beamMats.forEach((m, i) => {
      const a = t * (0.7 + i * 0.13) + (i * TAU) / 4;
      m.position.set(0.55 * Math.cos(a), sy + sh / 2 + 0.28 + 0.2 * Math.sin(a * 1.4), sz + 0.06 + 0.26 * Math.sin(a));
    });
    const song = Math.floor(t / 30);
    digits.forEach((m, i) => ((m.material as THREE.MeshBasicMaterial).color.set(((song * 37 + i * 13) % 3 + 3) % 3 === 0 ? '#ffb0a0' : '#ff5a4a')));
  };
};

// -------------------------------------------------------------------------------------------------
// The aquarium.

const FISH_COLS = ['#ff7a3d', '#ffd24a', '#4fc3f7', '#ef5350', '#c98cf0', '#ff7a3d', '#7fe0a0', '#ffffff', '#ffb0c8'];

const aquarium: Builder = (g, W, D, _c, _def, _ctx, out) => {
  const back = -D / 2;
  const { x: ix, y0, y1, z0, z1, glass } = TANK;
  const w = Math.min(W - 0.08, ix * 2 + 0.1);
  const zc = (z0 + z1) / 2;
  const depth = glass - (back + 0.04);
  const bz = back + 0.04 + depth / 2;
  // A long walnut stand with doors, feet; a small tub of food and a net on it.
  part(g, rbox(w + 0.04, y0 - 0.1, depth + 0.02, 0.02), WALNUT, 0, 0.08 + (y0 - 0.1) / 2, bz);
  for (const sx of [-1, 1]) part(g, box(0.05, 0.08, depth - 0.04), WALNUT_DARK, sx * (w / 2 - 0.05), 0.04, bz, { outline: false });
  for (let i = 0; i < 3; i++) {
    const dw = (w - 0.1) / 3;
    const x = -w / 2 + 0.05 + dw * (i + 0.5);
    part(g, box(dw - 0.02, y0 - 0.2, 0.008), WALNUT_DARK, x, 0.09 + (y0 - 0.14) / 2, bz + depth / 2 + 0.012, { outline: false });
    part(g, cyl(0.009, 0.009, 0.05, 8), BRASS, x + dw * 0.34, 0.42, bz + depth / 2 + 0.024, { outline: false });
  }
  part(g, rbox(w + 0.06, 0.03, depth + 0.04, 0.008), shade(WALNUT, 1.2), 0, y0 - 0.02, bz);
  // Sand, rocks, a sunk hut, weed that sways.
  const floorY = y0 - 0.005;
  part(g, rbox(ix * 2 + 0.02, 0.05, z1 - z0 + 0.06, 0.01), '#e3d1a8', 0, floorY + 0.03, zc, { outline: false });
  for (const [x, zz, r, col] of [[-0.55, zc - 0.12, 0.11, '#8d8d8d'], [-0.42, zc - 0.03, 0.07, '#a1887f'], [0.6, zc - 0.1, 0.12, '#9e9e9e'], [0.5, zc + 0.08, 0.06, '#8d8d8d'], [0.12, zc - 0.16, 0.07, '#a1887f']] as const) {
    part(g, dot(r), col, x, floorY + 0.05 + r * 0.35, zz).scale.y = 0.72;
  }
  part(g, rbox(0.16, 0.12, 0.14, 0.012), '#c98a64', 0.22, floorY + 0.11, zc - 0.05);
  part(g, new THREE.ConeGeometry(0.13, 0.08, 4).rotateY(Math.PI / 4), '#8f4f3a', 0.22, floorY + 0.21, zc - 0.05);
  own(g.children[g.children.length - 1] as THREE.Mesh, true, false);
  part(g, box(0.05, 0.08, 0.003), '#30221b', 0.22, floorY + 0.09, zc + 0.022, { outline: false });
  const weeds: THREE.Object3D[] = [];
  for (let i = 0; i < 7; i++) {
    const x = -ix + 0.12 + (i * 0.27) % (ix * 2 - 0.24);
    const zz = z0 + 0.06 + (i % 3) * 0.09;
    const k = group(g, x, floorY + 0.05, zz);
    const tall = 0.2 + ((i * 53) % 10) * 0.024;
    for (let b = 0; b < 3; b++) part(k, box(0.018, tall - b * 0.04, 0.004), ['#3c9a52', '#5cb86a', '#2e7d32'][b], -0.02 + b * 0.02, (tall - b * 0.04) / 2, b * 0.008, { outline: false, shadow: false, rz: (b - 1) * 0.1 });
    k.name = 'weed';
    weeds.push(k);
  }
  // The fish: a body, a tail that wags, a fin; some bigger.
  const fish: Array<{ g: THREE.Group; tail: THREE.Object3D }> = [];
  for (let i = 0; i < FISH_N; i++) {
    const col = FISH_COLS[i % FISH_COLS.length];
    const k = i % 4 === 0 ? 1.5 : i % 3 === 0 ? 1.15 : 0.75;
    const f = new THREE.Group();
    f.name = 'fish';
    g.add(f);
    part(f, dot(0.03), col, 0, 0, 0, { outline: false, shadow: false }).scale.set(1.6 * k, 1.05 * k, 0.58 * k);
    const tail = group(f, -0.042 * k, 0, 0);
    part(tail, new THREE.ConeGeometry(0.024 * k, 0.04 * k, 4).rotateZ(-Math.PI / 2).translate(-0.016 * k, 0, 0), col, 0, 0, 0, { outline: false, shadow: false });
    own(tail.children[0] as THREE.Mesh, true, false);
    part(f, box(0.022 * k, 0.018 * k, 0.003), shade(col, 0.82), 0, 0.03 * k, 0, { outline: false, shadow: false });
    if (i % 3 === 1) part(f, box(0.012 * k, 0.05 * k, 0.018 * k), '#ffffff', 0.008 * k, 0, 0, { outline: false, shadow: false });
    part(f, dot(0.006), '#14141a', 0.03 * k, 0.006 * k, 0.012 * k, { outline: false, shadow: false });
    part(f, dot(0.006), '#14141a', 0.03 * k, 0.006 * k, -0.012 * k, { outline: false, shadow: false });
    fish.push({ g: f, tail });
  }
  // Bubbles from a stone in the corner.
  part(g, rbox(0.06, 0.018, 0.03, 0.006), '#5a6a73', ix - 0.12, floorY + 0.06, z0 + 0.08, { outline: false });
  const bubbles: THREE.Mesh[] = [];
  for (let i = 0; i < 7; i++) {
    const b = own(new THREE.Mesh(dot(0.008 + (i % 3) * 0.004), basic('#eaf9ff', 0.8)));
    b.name = 'bubble';
    b.castShadow = false;
    g.add(b);
    bubbles.push(b);
  }
  // The water and glass last: drawn over what's in them.
  const h = y1 - y0 + 0.06;
  const water = own(new THREE.Mesh(box(ix * 2, h - 0.06, z1 - z0 + 0.12), basic('#5cc0e2', 0.28)));
  water.position.set(0, y0 + (h - 0.06) / 2, zc);
  water.renderOrder = 2;
  water.castShadow = false;
  g.add(water);
  const surface = own(new THREE.Mesh(box(ix * 2, 0.006, z1 - z0 + 0.12), basic('#d9f6ff', 0.5)));
  surface.position.set(0, y1 + 0.005, zc);
  surface.renderOrder = 3;
  surface.name = 'surface';
  surface.castShadow = false;
  g.add(surface);
  const pane = own(new THREE.Mesh(box(ix * 2 + 0.03, h + 0.02, depth - 0.02), basic('#d9f2fb', 0.1)));
  pane.position.set(0, y0 + h / 2, bz);
  pane.renderOrder = 3;
  pane.castShadow = false;
  g.add(pane);
  const fx = ix + 0.02;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.022, h + 0.02, 0.022), WALNUT_DARK, sx * fx, y0 + h / 2, bz + sz * (depth / 2 - 0.012), { outline: false });
  // The hood, its light strip brighter when someone's come to look.
  part(g, rbox(w + 0.06, 0.07, depth + 0.04, 0.012), WALNUT, 0, y0 + h + 0.04, bz);
  const lamp = own(new THREE.Mesh(box(ix * 2 - 0.1, 0.008, 0.08), basic('#d7f3ff')));
  lamp.position.set(0, y0 + h + 0.002, zc);
  lamp.castShadow = false;
  lamp.name = 'lamp';
  g.add(lamp);
  // Food and a net.
  part(g, cyl(0.03, 0.03, 0.07, 10), '#e8b54a', -w / 2 + 0.12, y0 + h + 0.11, bz);

  const slot = (x: number): [number, number] => [x, TANK.glass + 0.56];
  const s = spot(g, 'stand', 0, 0, TANK.glass + 0.56, Math.PI);
  s.motion = 'pgGaze';
  s.at.userData.slots = [slot(0), slot(-0.62), slot(0.62)];
  out.spots = { watchFish: s };
  out.work = marker(g, 0, y0 + 0.2, glass + 0.03);

  out.away = (_o, t) => {
    fish.forEach((f, i) => {
      const at = pgFishAt(i, t);
      f.g.position.set(at.x, at.y, at.z);
      // A fish's nose is its +x: heading is measured from +z.
      f.g.rotation.y = at.heading - Math.PI / 2;
      f.tail.rotation.y = 0.5 * Math.sin(t * 9 + i);
    });
    weeds.forEach((k, i) => (k.rotation.z = 0.08 * Math.sin(t * 0.9 + i)));
    bubbles.forEach((b, i) => {
      const u = fract(t * 0.3 + i / bubbles.length);
      b.position.set(ix - 0.12 + 0.012 * Math.sin(t * 3 + i), floorY + 0.08 + (y1 - floorY - 0.1) * u, z0 + 0.08 + 0.01 * Math.cos(t * 2.4 + i));
    });
    surface.position.y = y1 + 0.005 + 0.003 * Math.sin(t * 1.6);
    (lamp.material as THREE.MeshBasicMaterial).color.set(pgPosed(s, t) ? '#ffffff' : '#bfe5f5');
  };
};

// -------------------------------------------------------------------------------------------------
// The pond, and the rod.

function makeRod(parent: THREE.Object3D) {
  const tool = group(parent);
  tool.name = 'rod';
  // The cork from the butt past the hand; the reel under, its handle out on the left.
  part(tool, cyl(0.015, 0.015, 0.27, 10), '#c79a63', 0, -0.075, 0, { outline: false, shadow: false });
  part(tool, cyl(0.019, 0.017, 0.022, 10), BLACK, 0, -0.22, 0, { outline: false, shadow: false });
  part(tool, cyl(0.011, 0.015, 0.03, 10), CHROME, 0, 0.075, 0, { outline: false, shadow: false });
  part(tool, cyl(0.0065, 0.0085, 0.8, 8), '#3a4a58', 0, 0.48, 0, { outline: false, shadow: false });
  // The upper half on a joint of its own, so it can bend.
  const tip = group(tool, 0, 0.88, 0);
  part(tip, cyl(0.003, 0.0058, 0.72, 6), '#3a4a58', 0, 0.36, 0, { outline: false, shadow: false });
  const end = new THREE.Object3D();
  end.position.y = 0.72;
  tip.add(end);
  // Rings up it for the line.
  for (const y of [0.25, 0.55]) part(tool, dot(0.007), CHROME, 0, y, -0.009, { outline: false, shadow: false });
  for (const y of [0.25, 0.5]) part(tip, dot(0.006), CHROME, 0, y, -0.006, { outline: false, shadow: false });
  // The reel: its drum, the handle's arm and knob.
  part(tool, cyl(0.022, 0.022, 0.03, 12), '#70797f', 0, REEL.at[1], -0.055, { rz: Math.PI / 2, outline: false, shadow: false });
  part(tool, box(0.012, 0.03, 0.04), '#70797f', 0, REEL.at[1], -0.03, { outline: false, shadow: false });
  const crank = group(tool, REEL.at[0] + 0.025, REEL.at[1], REEL.at[2]);
  part(crank, box(0.004, REEL.r, 0.006), CHROME, 0, REEL.r / 2, 0, { outline: false, shadow: false });
  part(crank, cyl(0.008, 0.008, 0.024, 8), CREAM, -0.012, REEL.r, 0, { rz: Math.PI / 2, outline: false, shadow: false });
  return { tool, tip, end, crank };
}

const pond: Builder = (g, W, D, _c, _def, _ctx, out) => {
  const rx = W / 2 - 0.2;
  const rz = D / 2 - 0.2;
  // The ground under it, the dark bed, then the water over it all.
  const bed = part(g, cyl(1, 1, 0.03, 32), '#25504f', 0, 0.015, 0, { outline: false });
  bed.scale.set(rx + 0.06, 1, rz + 0.06);
  // A shelf of paler bed round the edge so it reads shallow there.
  const shelf = part(g, new THREE.TorusGeometry(1, 0.08, 6, 36).rotateX(Math.PI / 2), '#5a8a72', 0, 0.04, 0, { outline: false });
  own(shelf, true, false);
  shelf.scale.set(rx - 0.02, 0.4, rz - 0.02);
  const waterMat = new THREE.MeshBasicMaterial({ color: '#7fc8dc', map: waterGlints(), transparent: true, opacity: 0.62, depthWrite: false });
  const water = own(new THREE.Mesh(new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2), waterMat), true);
  water.name = 'water';
  water.scale.set(rx, 1, rz);
  water.position.y = POND.water;
  water.renderOrder = 2;
  water.castShadow = false;
  g.add(water);
  // Flat stones all round, a few of them big.
  const n = Math.round((rx + rz) * 8);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const s = 0.11 + ((i * 37) % 7) * 0.012;
    const big = i % 5 === 2 ? 1.3 : 1;
    const stone = part(g, dot(s * big), ['#9e9e9e', '#bdbdbd', '#8d8d8d', '#a59b8e'][i % 4], Math.cos(a) * (rx - 0.01), 0.055, Math.sin(a) * (rz - 0.01));
    stone.scale.set(1.25, 0.5, 1);
    stone.rotation.y = -a;
  }
  // Lily pads riding on it, a flower; reeds at the back that bend.
  const pads: THREE.Object3D[] = [];
  for (const [x, z, r] of [[-0.42, 0.28, 0.11], [0.42, -0.28, 0.09], [0.1, -0.5, 0.075], [-0.2, 0.46, 0.07], [0.55, 0.2, 0.08]] as const) {
    const p = group(g, x * rx, POND.water + 0.006, z * rz);
    part(p, cyl(r, r, 0.006, 14), '#62ae62', 0, 0, 0, { outline: false, shadow: false });
    part(p, box(r * 0.95, 0.008, 0.012), '#3f8c4a', r * 0.48, 0.0, 0, { outline: false, shadow: false });
    p.name = 'pad';
    pads.push(p);
  }
  const lotus = group(pads[0], 0, 0.012, 0);
  for (let i = 0; i < 6; i++) {
    const a = (i * TAU) / 6;
    part(lotus, dot(0.024), i % 2 ? '#f8bbd0' : '#fbd7e3', 0.024 * Math.cos(a), 0.012, 0.024 * Math.sin(a), { outline: false, shadow: false }).scale.set(1, 0.65, 0.6);
  }
  part(lotus, dot(0.014), '#ffd54f', 0, 0.022, 0, { outline: false, shadow: false });
  const reeds: THREE.Object3D[] = [];
  for (let i = 0; i < 9; i++) {
    const r = group(g, -rx * 0.75 + i * 0.075, 0.05, -rz - 0.03 + (i % 2) * 0.05);
    const tall = 0.52 + (i % 3) * 0.13;
    part(r, cyl(0.007, 0.011, tall, 5), '#7cb342', 0, tall / 2, 0, { outline: false });
    if (i % 3 === 0) part(r, cyl(0.016, 0.016, 0.09, 6), '#6b4a2b', 0, tall, 0, { outline: false });
    r.name = 'reed';
    reeds.push(r);
  }
  // Koi going round under the water.
  const KOI = ['#ff7a3d', '#fafafa', '#ffb02e'];
  const koi: Array<{ g: THREE.Group; tail: THREE.Object3D }> = [];
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Group();
    f.name = 'koi';
    g.add(f);
    const col = pick(KOI, i);
    part(f, dot(0.04), col, 0, 0, 0, { outline: false, shadow: false }).scale.set(1.9, 0.45, 0.7);
    part(f, dot(0.016), i % 2 ? '#e8483f' : '#2b2b30', 0.03, 0.015, 0, { outline: false, shadow: false }).scale.y = 0.4;
    const tail = group(f, -0.07, 0, 0);
    part(tail, new THREE.ConeGeometry(0.03, 0.06, 4).rotateZ(-Math.PI / 2).translate(-0.025, 0, 0), col, 0, 0, 0, { outline: false, shadow: false }).scale.y = 0.3;
    own(tail.children[0] as THREE.Mesh, true, false);
    koi.push({ g: f, tail });
  }
  const rings = new Ripples(g, 5, POND.water + 0.004, 5, 0.34);
  const koiAt = (i: number, t: number) => {
    const sp = 0.22 + i * 0.05;
    const ph = t * sp + i * 1.9;
    const ax = rx * (0.42 + 0.1 * i);
    const az = rz * (0.62 - 0.06 * i);
    return { x: ax * Math.sin(ph), z: az * Math.cos(ph), heading: Math.atan2(ax * Math.cos(ph), -az * Math.sin(ph)) };
  };

  // On the bank: the forked stick the rod rests on, a creel, a stool's worth of tackle.
  const [sx, , sz] = POND.rest;
  part(g, cyl(0.012, 0.016, POND.rest[1] - 0.03, 6), '#6b4a2b', sx, (POND.rest[1] - 0.03) / 2, sz + 0.05, { rx: -0.05 });
  rod(g, v(sx, POND.rest[1] - 0.06, sz + 0.03), v(sx + 0.03, POND.rest[1] + 0.02, sz), 0.008, '#6b4a2b');
  rod(g, v(sx, POND.rest[1] - 0.06, sz + 0.03), v(sx - 0.03, POND.rest[1] + 0.02, sz), 0.008, '#6b4a2b');
  const [cx, cy, cz] = POND.creel;
  part(g, cyl(0.13, 0.1, cy - 0.02, 12), '#b48a52', cx, (cy - 0.02) / 2, cz);
  part(g, cyl(0.135, 0.135, 0.02, 12), '#8f6841', cx, cy - 0.01, cz);
  const inCreel: THREE.Object3D[] = [];
  for (let i = 0; i < 3; i++) {
    const m = part(g, dot(0.035), pick(KOI, i), cx + (i - 1) * 0.05, cy + 0.008, cz + 0.02 * (i % 2), { outline: false, shadow: false });
    m.scale.set(1.8, 0.4, 0.7);
    inCreel.push(m);
  }
  inCreel.forEach((m) => (m.visible = false));
  part(g, rbox(0.17, 0.08, 0.11, 0.012), '#3f6f8f', cx + 0.34, 0.04, cz - 0.02);
  part(g, box(0.17, 0.008, 0.11), '#2f5570', cx + 0.34, 0.082, cz - 0.02, { outline: false });

  // The rod, the line, the float, and what comes up on it.
  const R = makeRod(g);
  const lineMat = basic('#f4f4f4', 0.85);
  const lineGeom = new THREE.CylinderGeometry(0.0022, 0.0022, 1, 4).translate(0, 0.5, 0);
  const lineM = own(new THREE.Mesh(lineGeom, lineMat), true);
  lineM.name = 'line';
  lineM.castShadow = false;
  lineM.visible = false;
  g.add(lineM);
  const hookLine = own(new THREE.Mesh(lineGeom, lineMat), false, false);
  hookLine.visible = false;
  g.add(hookLine);
  const bobber = group(g);
  bobber.name = 'float';
  part(bobber, dot(0.02), '#e8483f', 0, 0, 0, { outline: false, shadow: false });
  part(bobber, dot(0.018), '#ffffff', 0, 0.014, 0, { outline: false, shadow: false });
  bobber.visible = false;
  const caught = group(g);
  caught.name = 'caught';
  part(caught, dot(0.04), KOI[0], 0, 0, 0, { outline: false, shadow: false }).scale.set(0.72, 1.75, 0.42);
  const caughtTail = group(caught, 0, -0.07, 0);
  part(caughtTail, new THREE.ConeGeometry(0.03, 0.05, 4), KOI[0], 0, -0.015, 0, { outline: false, shadow: false }).scale.z = 0.3;
  own(caughtTail.children[0] as THREE.Mesh, true, false);
  caught.visible = false;

  const s = spot(g, 'stand', POND.stX, 0, POND.st, Math.PI);
  s.motion = 'pgAngle';
  out.spots = { fish: s };
  out.work = marker(g, 0, 0.1, rz - 0.2);

  const held = new THREE.Vector3();
  const restRod = () => pgAim(R.tool, POND.rest, POND.restDir);
  restRod();
  let sinceRound = 0;
  const lay = (m: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3) => {
    const d = to.clone().sub(from);
    m.position.copy(from);
    m.scale.set(1, Math.max(0.001, d.length()), 1);
    if (d.lengthSq() > 1e-8) m.quaternion.setFromUnitVectors(THREE.Object3D.DEFAULT_UP, d.normalize());
  };

  out.away = (_o, t) => {
    // The water and everything in it go on whoever's there.
    waterGlints().offset.set(fract(t * 0.012), fract(t * 0.02));
    koi.forEach((f, i) => {
      const a = koiAt(i, t);
      f.g.position.set(a.x, POND.water - 0.03, a.z);
      f.g.rotation.y = a.heading - Math.PI / 2;
      f.tail.rotation.y = 0.5 * Math.sin(t * 7 + i);
    });
    pads.forEach((p, i) => {
      p.position.y = POND.water + 0.006 + 0.003 * Math.sin(t * 1.3 + i * 1.4);
      p.rotation.y = 0.12 * Math.sin(t * 0.25 + i);
    });
    reeds.forEach((r, i) => (r.rotation.z = 0.05 * Math.sin(t * 0.8 + i * 0.7)));

    const u = pgLive('pgAngle', s, t);
    if (u === null) {
      s.held = null;
      restRod();
      lineM.visible = hookLine.visible = bobber.visible = caught.visible = false;
      R.tip.rotation.x = 0;
      inCreel.forEach((m) => (m.visible = false));
      rings.update(t, (i) => {
        const a = koiAt(i % 4, t);
        return [a.x, a.z];
      });
      return;
    }
    sinceRound = u;
    const H = (s.at.userData.height as number | undefined) ?? 1.6;
    const n = pgAngleNow(u, H, t);
    pgAim(R.tool, n.grip, n.dir);
    R.tip.rotation.x = -0.75 * n.bend;
    R.crank.rotation.x = n.crank;
    R.tool.updateMatrixWorld(true);
    const leftGrip = n.left === 'reel'
      ? {
          at: v(REEL.at[0], REEL.at[1] + REEL.r * Math.cos(n.crank), REEL.at[2] + REEL.r * Math.sin(n.crank)),
          axis: v(1, 0, 0),
          shape: 'pinch' as const,
          radius: 0.01,
        }
      : ROD_BUTT;
    s.held = {
      tool: R.tool,
      lead: 'right',
      resting: n.resting,
      lean: n.lean,
      nod: n.nod,
      grips: n.left === 'free' ? { right: ROD_GRIP } : { right: ROD_GRIP, left: leftGrip },
      free: n.left === 'free' && n.leftAt ? { left: g.localToWorld(v(n.leftAt[0], n.leftAt[1], n.leftAt[2])) } : undefined,
      freeShape: 'pinch',
    };
    // The line from the tip down to the float; the float on the water.
    const tip = g.worldToLocal(R.end.getWorldPosition(held.clone()));
    if (n.float) {
      const f = v(n.float[0], n.float[1], n.float[2]);
      lay(lineM, tip, f);
      lineM.visible = true;
      bobber.visible = true;
      bobber.position.copy(f);
    } else {
      lineM.visible = false;
      bobber.visible = false;
    }
    caught.visible = !!n.fish;
    if (n.fish) {
      const c = v(n.fish[0], n.fish[1], n.fish[2]);
      caught.position.copy(c);
      caught.rotation.z = 0.3 * Math.sin(t * 13);
      caughtTail.rotation.x = 0.5 * Math.sin(t * 20);
      if (n.float) {
        lay(hookLine, v(n.float[0], n.float[1], n.float[2]), c);
        hookLine.visible = true;
      } else hookLine.visible = false;
    } else hookLine.visible = false;
    // The catch of this round in the creel, once it's dropped.
    inCreel[0].visible = sinceRound >= 0.955;
    const bx = n.float ? n.float[0] : POND.float[0];
    const bz = n.float ? n.float[2] : POND.float[2];
    rings.update(t, (i) => {
      if (n.float && n.float[1] < POND.water + 0.08) return [bx, bz];
      const a = koiAt(i % 4, t);
      return [a.x, a.z];
    });
  };
};

// -------------------------------------------------------------------------------------------------
// The climbing frame.

const monkeyBars: Builder = (g, W, _D, c, _def, _ctx, out) => {
  const steel = c;
  const y = BARS.y;
  const postX = W / 2 - 0.08;
  const rail = (a: THREE.Vector3, b: THREE.Vector3, r: number, col: string) => rod(g, a, b, r, col);
  // A soft mat under it all, so it's a play thing.
  part(g, rbox(W - 0.06, 0.03, 0.9, 0.012), '#7e9a6a', 0, 0.015, 0, { outline: false });
  // A frame at either end, a ladder up each: posts splayed a little, rungs across.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      rail(v(sx * postX, 0.03, sz * 0.4), v(sx * (postX - 0.1), y, sz * BARS.half), 0.032, steel);
      part(g, cyl(0.05, 0.055, 0.03, 10), shade(steel, 0.7), sx * postX, 0.03, sz * 0.4, { outline: false });
    }
    for (let i = 0; i < 4; i++) {
      const k = (i + 1) / 5;
      const px = postX - 0.1 * k;
      const hz = 0.4 + (BARS.half - 0.4) * k;
      rail(v(sx * px, k * y, -hz), v(sx * px, k * y, hz), 0.016, '#ffd24a');
    }
  }
  // The long side rails on top, the rungs that are hung from.
  for (const sz of [-1, 1]) rail(v(-(postX - 0.1), y + 0.015, sz * BARS.half), v(postX - 0.1, y + 0.015, sz * BARS.half), 0.024, shade(steel, 1.1));
  for (let i = 0; i < BARS.n; i++) rail(v(rungX(i), y, -BARS.half), v(rungX(i), y, BARS.half), 0.017, ['#4fa8e0', '#ffd24a', '#6ac46a'][i % 3]);
  // The foot rail for someone sat on the front side, on two struts.
  rail(v(-0.42, BARS.footY, BARS.footZ), v(0.42, BARS.footY, BARS.footZ), 0.013, '#ffd24a');
  for (const sx of [-1, 1]) rail(v(sx * 0.42, BARS.footY, BARS.footZ), v(sx * 0.42, y, BARS.half), 0.012, shade(steel, 0.85));
  // A pair of rings swinging at the back.
  const rings = group(g, 0.3, y - 0.01, -BARS.half);
  for (const s of [-1, 1]) {
    part(rings, cyl(0.004, 0.004, 0.5, 5), '#7a6a50', s * 0.13, -0.25, 0, { outline: false });
    part(rings, new THREE.TorusGeometry(0.06, 0.012, 6, 16), '#e8483f', s * 0.13, -0.56, 0, { outline: false });
    own(rings.children[rings.children.length - 1] as THREE.Mesh, true, false);
  }
  rings.name = 'rings';
  // A go along the bars, and a seat on the rail.
  const play = spot(g, 'stand', 0, 0, 0);
  play.motion = 'pgBars';
  const sit = spot(g, 'sit', 0.05, y + 0.02, BARS.perchZ);
  sit.motion = 'pgPerch';
  out.spots = { playBars: play, hangBars: sit };
  out.work = marker(g, 0, 1, 0.25);
  out.away = (_o, t) => {
    rings.rotation.x = 0.08 * Math.sin(t * 1.3);
  };
};

// -------------------------------------------------------------------------------------------------
// The pool: raised, as a small one in a garden has to be, timber-clad, so that a swimmer has water to be in.

const pool: Builder = (g, W, D, _c, _def, _ctx, out) => {
  const top = POOL.water + 0.06;
  const iw = POOL.x * 2;
  const id = POOL.z * 2;
  const wx = (W - iw) / 2;
  const wz = (D - id) / 2;
  // The walls, in planks, and the pale coping round the top.
  for (const s of [-1, 1]) {
    part(g, box(wx, top, D - 0.02), OAK, s * (W / 2 - wx / 2), top / 2, 0);
    part(g, box(iw, top, wz), OAK, 0, top / 2, s * (D / 2 - wz / 2));
  }
  for (let i = 0; i < 7; i++) {
    const py = 0.07 + i * 0.075;
    for (const s of [-1, 1]) part(g, box(W - 0.01, 0.006, 0.004), OAK_DARK, 0, py, s * (D / 2 + 0.001), { outline: false, shadow: false });
  }
  for (const s of [-1, 1]) {
    part(g, rbox(W + 0.03, 0.03, wz + 0.05, 0.01), CREAM, 0, top + 0.01, s * (D / 2 - wz / 2));
    part(g, rbox(wx + 0.05, 0.03, D - wz * 2, 0.01), CREAM, s * (W / 2 - wx / 2), top + 0.01, 0);
  }
  // Its lining, blue with a tile band.
  part(g, box(iw, 0.02, id), '#8fd8ea', 0, 0.02, 0, { outline: false });
  for (const s of [-1, 1]) {
    part(g, box(iw, top - 0.03, 0.006), '#b9ecf5', 0, top / 2, s * (POOL.z - 0.002), { outline: false, shadow: false });
    part(g, box(0.006, top - 0.03, id), '#b9ecf5', s * (POOL.x - 0.002), top / 2, 0, { outline: false, shadow: false });
    part(g, box(iw, 0.04, 0.008), '#3f8fb5', 0, top - 0.03, s * (POOL.z - 0.004), { outline: false, shadow: false });
    part(g, box(0.008, 0.04, id), '#3f8fb5', s * (POOL.x - 0.004), top - 0.03, 0, { outline: false, shadow: false });
  }
  // A step up at the front, chrome rails over the wall.
  part(g, rbox(0.56, 0.2, 0.12, 0.012), OAK_DARK, 0.84, 0.1, D / 2 + 0.05);
  for (const s of [-1, 1]) {
    const x = 0.84 + s * 0.24;
    const pts = [v(x, top, D / 2 - wz / 2), v(x, top + 0.42, D / 2 - wz / 2), v(x, top + 0.42, D / 2 - wz - 0.1), v(x, 0.3, D / 2 - wz - 0.1)];
    for (let i = 1; i < pts.length; i++) rod(g, pts[i - 1], pts[i], 0.014, CHROME);
  }
  // The water: its surface really moves, with glints going over it.
  const nx = 26;
  const nz = 18;
  const geom = new THREE.PlaneGeometry(iw - 0.01, id - 0.01, nx, nz).rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ color: '#5cc8e8', map: waterGlints(), transparent: true, opacity: 0.68, depthWrite: false, side: THREE.DoubleSide });
  const water = own(new THREE.Mesh(geom, mat), true);
  water.name = 'water';
  water.position.y = POOL.water;
  water.renderOrder = 2;
  water.castShadow = false;
  g.add(water);
  const pos = geom.attributes.position as THREE.BufferAttribute;
  // A duck to float on it; a towel and sandals on the coping.
  const duck = group(g, -0.7, POOL.water + 0.02, 0.5);
  duck.name = 'duck';
  const ringG = new THREE.TorusGeometry(0.13, 0.05, 8, 18).rotateX(Math.PI / 2);
  part(duck, ringG, '#ffd24a', 0, 0.02, 0);
  own(duck.children[0] as THREE.Mesh, true, false);
  part(duck, dot(0.05), '#ffd24a', 0.13, 0.09, 0);
  part(duck, box(0.04, 0.012, 0.03), '#ff9f43', 0.18, 0.085, 0, { outline: false });
  part(g, rbox(0.3, 0.02, 0.1, 0.008), '#e8cfa8', -0.8, top + 0.035, D / 2 - wz / 2);
  // Wake about whoever's swimming, and drops off their hands.
  const wake = new Ripples(g, 9, POOL.water + 0.012, 1.8, 0.3);
  const drops: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const m = own(new THREE.Mesh(dot(0.018), basic('#ffffff', 0.85)));
    m.castShadow = false;
    m.visible = false;
    g.add(m);
    drops.push(m);
  }
  // A lane each, by where they are across it (lot3d.ts asks for `on:<id>:<place>`).
  out.spots = {};
  const lanes: Spot[] = [];
  for (const lane of [-1, 0, 1]) {
    const s = spot(g, 'fly', 0, POOL.mid, lane * POOL.laneZ, 0, POOL.mid);
    s.motion = 'pgSwim';
    s.at.userData.lane = lane;
    out.spots[`on:swim:${lane}`] = s;
    lanes.push(s);
  }
  out.seatMotion = { swim: 'pgTread' };
  out.work = marker(g, 0, top, D / 2);

  out.away = (_o, t) => {
    const swimmers = lanes.filter((s) => pgPosed(s, t));
    const stir = 1 + 1.4 * swimmers.length;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, 0.004 * stir * (Math.sin(x * 5 + t * 1.6) + Math.cos(z * 6.2 - t * 1.25) + 0.6 * Math.sin((x + z) * 9 + t * 2.3)));
    }
    pos.needsUpdate = true;
    waterGlints().offset.set(fract(t * 0.012), fract(t * 0.02));
    duck.position.x = -0.7 + 0.28 * Math.sin(t * 0.17);
    duck.position.z = 0.5 + 0.12 * Math.cos(t * 0.23);
    duck.position.y = POOL.water + 0.02 + 0.008 * Math.sin(t * 1.6);
    duck.rotation.y = t * 0.1;
    const spread = swimmers.length ? swimmers : lanes;
    wake.update(t, (i) => {
      const lane = (spread[i % spread.length].at.userData.lane as number) ?? 0;
      const a = pgSwimAt(lane, t);
      // Off the head, a little ahead of the middle.
      return swimmers.length ? [a.x + 0.4 * Math.sin(a.heading), a.z + 0.4 * Math.cos(a.heading)] : [-0.9 + 1.8 * fract(i * 0.37 + Math.floor(t / 1.8) * 0.13), -0.6 + 1.2 * fract(i * 0.61 + Math.floor(t / 1.8) * 0.29)];
    });
    drops.forEach((m, i) => {
      const sw = swimmers[i % Math.max(1, swimmers.length)];
      m.visible = !!sw;
      if (!sw) return;
      const lane = sw.at.userData.lane as number;
      const a = pgSwimAt(lane, t);
      const st = pgStroke(t, lane, 1);
      const h = i % 2 ? st.l : st.r;
      const fx = Math.sin(a.heading);
      const fz = Math.cos(a.heading);
      const u = fract(t * 1.7 + i * 0.3);
      m.position.set(
        THREE.MathUtils.clamp(a.x + fx * h[0] + fz * h[2] + 0.05 * Math.sin(i * 2 + t), -POOL.x + 0.05, POOL.x - 0.05),
        POOL.water + 0.02 + 0.16 * Math.sin(Math.PI * u) * (st.crawl ? 1 : 0.3),
        THREE.MathUtils.clamp(a.z + fz * h[0] - fx * h[2], -POOL.z + 0.05, POOL.z - 0.05),
      );
    });
  };
};

export const BUILDERS: Record<string, Builder> = {
  tv: tvOf(false),
  bigTv: tvOf(true),
  stereo,
  karaoke,
  aquarium,
  pond,
  monkeyBars,
  pool,
};

