import { neighbourShop, shopFront } from './shopFront';
import * as THREE from 'three';
import type { BarOffset, Motion } from '../activity';
import { marker, rod, shade, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, gradient, part, rbox, toon } from '../toon';
import { BLACK, CHROME, glow, label, painted, picture, ring, text, type Paint } from './doctor';
import {
  CARD_PILE, CARD_SLOTS, FORM, PICKS, STEAM, SWATCHES,
  cardsAt, dressAt, lookbookAt, mirrorAt, pickAt, shotFlash, siPhase, sponsorAt, steamAt, unboxAt,
} from './styleInfluencerMotion';

/**
 * The 스타일 스튜디오 drawn as itself (2026-10-27 workplace pipeline, at the user's request): 스튜디오
 * 모어 (STUDIO MORE), a fashion creator's studio in greige, oak and blush. The lookbook set is a
 * styled corner — a greige flat with its arched niche, a jute rug, a terrazzo plinth with pampas
 * grass, a felt letter board with the look's number, an octabox and the camera on its tripod with
 * the tethered laptop beside it: a self-shot lookbook posed look after look with the remote hidden in
 * the hand (each frame landing on the laptop), and the 협찬 shoot with 메종 루아's banner hung, the
 * bag on the arm and the perfume shown to the lens. The column desk in white oak with its pastel
 * all-in-one (the column draft, the season's trend plan, the brand's offer), the mood board and the
 * swatch book; planning the week's outfits the keyboard's pushed back and polaroids laid out in a
 * grid, swatches held to them; a contract read and signed. The dress form (shared with the atelier
 * and the clothes shop) on its brass tripod, a tape round its neck: dressed up look by look — the
 * shoulders smoothed, a pin, the jacket on, the belt tied, a step back, the form turned. And what the
 * studio was missing (workFurniture/styleInfluencer.ts): the long OOTD mirror with its ring light,
 * the steamer (each look's creases going as the wand passes), the shoe and bag wall, and the 협찬
 * table of brand boxes. What's in the hands is drawn by the motions' own clock (styleInfluencerMotion.ts).
 */

const GREIGE = '#d9cfc2';
const OAK = '#c8a57a';
const OAK_D = '#a07d55';
const BLUSH = '#f2c9cf';
const BLUSH_D = '#d99aa5';
const IVORY = '#fbf8f2';
const BRASS = '#c9a45c';
const INK = '#3a3036';
const TERRAZZO = '#ece6df';
const STUDIO = 'STUDIO MORE';
const FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
const SERIF = '"Georgia","Times New Roman",serif';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UP = new THREE.Vector3(0, 1, 0);
const tmp = new THREE.Vector3();
const wave = (t: number, hz: number, ph = 0) => Math.sin((t * hz + ph) * Math.PI * 2);

const GLASS = new THREE.MeshToonMaterial({ color: '#f6eef2', transparent: true, opacity: 0.45, depthWrite: false });
const STEAM_MAT = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.4, depthWrite: false });

/** Shapes made once (never disposed, like toon.ts's shared geometry). */
const shapes = new Map<string, THREE.BufferGeometry>();
function shape(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let s = shapes.get(key);
  if (!s) shapes.set(key, (s = make()));
  return s;
}

function group(parent: THREE.Object3D, x = 0, y = 0, z = 0, ry = 0, rx = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, 0, 'YXZ');
  parent.add(m);
  return m;
}
/** A group in `g` shown only while the piece is used. */
function inUse(g: THREE.Object3D, out: Built): THREE.Group {
  const use = new THREE.Group();
  g.add(use);
  out.inUse = use;
  return use;
}
/** A spot stood at, facing `yaw` (π: at the piece from its front), and what's done there. */
function standAt(g: THREE.Object3D, x: number, z: number, yaw: number, motion: Motion, work?: THREE.Object3D): Spot {
  const s = spot(g, 'stand', x, 0, z, yaw);
  s.work = work;
  s.motion = motion;
  return s;
}
/** A spot sat at (the seat's top `y`), facing `yaw`, and what's done there. */
function sitAt(g: THREE.Object3D, x: number, y: number, z: number, yaw: number, motion: Motion, work?: THREE.Object3D): Spot {
  const s = spot(g, 'sit', x, y, z, yaw, y);
  s.work = work;
  s.motion = motion;
  return s;
}
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
/** Of a piece's spots, the one stood or sat at just now (the most lately), else null. */
function nowAt(list: Spot[], t: number): Spot | null {
  let best: Spot | null = null;
  for (const s of list) if (Math.abs(t - posedAt(s)) < 0.6 && (!best || posedAt(s) > posedAt(best))) best = s;
  return best;
}
/** How much bigger than 1.6 m whoever's at a spot is. */
const kOf = (s: Spot) => ((s.at.userData.height as number | undefined) ?? 1.6) / 1.6;
/** A holder that keeps to a spot (its place and its turn): what's in the hands goes in it, in the body's frame. */
function holder(parent: THREE.Object3D): THREE.Group {
  const h = new THREE.Group();
  parent.add(h);
  return h;
}
function follow(h: THREE.Object3D, s: Spot) {
  h.position.copy(s.at.position);
  h.rotation.set(0, s.at.rotation.y, 0);
}
/** A body-frame offset (to their left, up, ahead) placed in a holder, scaled for height. */
const put = (o: THREE.Object3D, b: BarOffset, k: number) => o.position.set(b.side * k, b.up * k, b.ahead * k);
/** A see-through or fading face: its own material, so its opacity can change. */
function fader(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, color: string, ry = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  m.rotation.y = ry;
  g.add(m);
  return m;
}
const setOpacity = (m: THREE.Mesh, o: number) => {
  (m.material as THREE.MeshBasicMaterial).opacity = o;
  m.visible = o > 0.01;
};
/** Several pictures in one place, one shown at a time (a screen's pages, a letter board's number). */
function swap(g: THREE.Object3D, texes: THREE.Texture[], w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0): (i: number) => void {
  const ms = texes.map((t, i) => {
    const m = picture(g, t, w, h, x, y, z, '#ffffff', ry, rx);
    m.visible = i === 0;
    return m;
  });
  let cur = 0;
  return (i) => {
    const j = ((i % ms.length) + ms.length) % ms.length;
    if (j === cur) return;
    ms[cur].visible = false;
    ms[j].visible = true;
    cur = j;
  };
}
/** A unit-long rod along +y, stretched from one point to another each frame (a hose). */
function stretchy(g: THREE.Object3D, r: number, color: string): THREE.Mesh {
  return part(g, cyl(r, r, 1, 8), color, 0, 0, 0, { outline: false });
}
function stretch(m: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3) {
  const d = b.clone().sub(a);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.scale.set(1, Math.max(d.length(), 1e-4), 1);
  m.quaternion.setFromUnitVectors(UP, d.normalize());
}
/** A light stand's three feet and its column up to `h`, at (x, z). */
function lightStand(g: THREE.Object3D, x: number, z: number, h: number, spread = 0.2, color = BLACK) {
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    rod(g, V(x, 0.3, z), V(x + Math.sin(a) * spread, 0.01, z + Math.cos(a) * spread), 0.01, color);
  }
  part(g, cyl(0.013, 0.013, h - 0.28, 8), color, x, 0.28 + (h - 0.28) / 2, z, { outline: false });
  part(g, cyl(0.02, 0.02, 0.05, 8), '#4a4852', x, 0.31, z, { outline: false });
}
/** A group at (x, y, z) whose +z looks at `to`. */
function aimed(g: THREE.Object3D, x: number, y: number, z: number, to: THREE.Vector3): THREE.Group {
  const dx = to.x - x;
  const dy = to.y - y;
  const dz = to.z - z;
  return group(g, x, y, z, Math.atan2(dx, dz), -Math.atan2(dy, Math.hypot(dx, dz)));
}
/** A ring light facing +z in its own group (its middle at the origin): the ring, lit while used. */
function ringLight(g: THREE.Object3D, use: THREE.Object3D, r: number) {
  part(g, ring(r, r * 0.09), '#efeae2', 0, 0, 0, { outline: false });
  part(g, ring(r, r * 0.04), '#cfc8bc', 0, 0, -r * 0.06, { outline: false });
  part(use, ring(r, r * 0.08), '#fffaf0', 0, 0, r * 0.012, { outline: false, material: glow('#fffbf2') });
}
/** A phone in a case, upright, its screen to +z (a painted face on it, or dark), its camera on the back. */
function phone(g: THREE.Object3D, tex: THREE.Texture | null, caseColor = BLUSH): THREE.Group {
  const root = group(g);
  part(root, rbox(0.074, 0.152, 0.009, 0.008), caseColor, 0, 0, 0);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.142), new THREE.MeshBasicMaterial(tex ? { map: tex } : { color: '#30303a' }));
  screen.userData.ownGeometry = screen.userData.ownMaterial = true;
  screen.position.z = 0.0048;
  root.add(screen);
  part(root, rbox(0.03, 0.03, 0.004, 0.006), '#3a3840', 0.016, 0.05, -0.006, { outline: false });
  for (const [cx, cy] of [[0.01, 0.057], [0.01, 0.043], [0.023, 0.05]]) part(root, cyl(0.005, 0.005, 0.003, 10), '#15151a', cx, cy, -0.0085, { rx: Math.PI / 2, outline: false });
  return root;
}

// ---------------------------------------------------------------------------------------------
// What's painted (once each; blank outside a browser).

/** Someone drawn small on a picture (a lookbook frame, a polaroid): a coat and trousers, the head. */
function figure(c: CanvasRenderingContext2D, x: number, y: number, s: number, coat: string, bottom: string, pose = 0) {
  c.fillStyle = '#f1c9a5';
  c.beginPath();
  c.arc(x, y, s * 0.12, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#2b1b10';
  c.beginPath();
  c.arc(x, y - s * 0.03, s * 0.125, Math.PI, 0);
  c.fill();
  c.fillRect(x - s * 0.125, y - s * 0.03, s * 0.05, s * 0.2);
  c.fillRect(x + s * 0.075, y - s * 0.03, s * 0.05, s * 0.2);
  c.fillStyle = bottom;
  c.fillRect(x - s * 0.12, y + s * 0.6, s * 0.1, s * 0.62);
  c.fillRect(x + s * 0.02, y + s * 0.6, s * 0.1, s * 0.62);
  c.fillStyle = coat;
  c.beginPath();
  c.moveTo(x - s * 0.2, y + s * 0.16);
  c.lineTo(x + s * 0.2, y + s * 0.16);
  c.lineTo(x + s * 0.27, y + s * 0.85);
  c.lineTo(x - s * 0.27, y + s * 0.85);
  c.fill();
  // An arm out to the hip, or up to the hair.
  c.lineWidth = s * 0.08;
  c.strokeStyle = coat;
  c.beginPath();
  c.moveTo(x + s * 0.18, y + s * 0.2);
  if (pose % 3 === 0) c.lineTo(x + s * 0.3, y + s * 0.45), c.lineTo(x + s * 0.17, y + s * 0.6);
  else if (pose % 3 === 1) c.lineTo(x + s * 0.24, y + s * 0.05), c.lineTo(x + s * 0.1, y - s * 0.08);
  else c.lineTo(x + s * 0.25, y + s * 0.65);
  c.stroke();
  c.fillStyle = '#212121';
  c.fillRect(x - s * 0.14, y + s * 1.2, s * 0.13, s * 0.05);
  c.fillRect(x + s * 0.02, y + s * 1.2, s * 0.13, s * 0.05);
}
/** The looks shot in turn: the coat, the trousers. */
const LOOKS: Array<[string, string]> = [['#c19a6b', '#f3eee6'], ['#3e3a39', '#8d8d8d'], ['#f3eee6', '#5d4037'], ['#7b2d3b', '#2b2b30'], ['#b7c4a8', '#f7f1e8'], ['#e7d6c3', '#3e3a39']];

/** The set's flat: greige, the arched niche a shade lighter with its shadow, the skirting. */
const paintSetWall: Paint = (c) => {
  c.fillStyle = GREIGE;
  c.fillRect(0, 0, 256, 200);
  const g = c.createLinearGradient(0, 0, 0, 200);
  g.addColorStop(0, 'rgba(255,255,255,0.12)');
  g.addColorStop(1, 'rgba(0,0,0,0.06)');
  c.fillStyle = g;
  c.fillRect(0, 0, 256, 200);
  // The niche: a shadow line round it, then the lighter plaster.
  const arch = (dx: number, dy: number, fill: string) => {
    c.fillStyle = fill;
    c.beginPath();
    c.moveTo(78 + dx, 190);
    c.lineTo(78 + dx, 80 + dy);
    c.arc(128 + dx, 80 + dy, 50, Math.PI, 0);
    c.lineTo(178 + dx, 190);
    c.fill();
  };
  arch(3, 2, '#c3b7a8');
  arch(0, 0, '#e6ddd1');
  c.fillStyle = '#cfc4b6';
  c.fillRect(0, 190, 256, 10);
  c.font = `28px ${SERIF}`;
  c.fillStyle = '#8a7d6e';
  c.textAlign = 'left';
  c.textBaseline = 'middle';
  c.fillText('Lookbook', 14, 26);
  c.font = `11px ${SERIF}`;
  c.fillText('26  F / W   —   STUDIO MORE', 16, 48);
};
/** 메종 루아's banner, hung for the 협찬 shoot. */
const paintBanner: Paint = (c) => {
  c.fillStyle = '#f6dde0';
  c.fillRect(0, 0, 160, 256);
  c.strokeStyle = '#c9a45c';
  c.lineWidth = 3;
  c.strokeRect(8, 8, 144, 240);
  c.font = `bold 22px ${SERIF}`;
  c.fillStyle = '#5a3a40';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('MAISON', 80, 64);
  c.fillText('LUA', 80, 92);
  c.beginPath();
  c.arc(80, 140, 22, 0, Math.PI * 2);
  c.strokeStyle = '#5a3a40';
  c.lineWidth = 2;
  c.stroke();
  c.font = `bold 16px ${SERIF}`;
  c.fillText('L', 80, 141);
  text(c, '메종 루아', 80, 186, 15, '#5a3a40', 'center');
  text(c, '26 S/S 컬렉션', 80, 208, 12, '#8a6a70', 'center', false);
  text(c, '협찬 촬영', 80, 230, 11, '#b07a84', 'center', false);
};
/** A frame on the tethered laptop: the shot in the middle, the filmstrip under it. */
function paintTether(i: number, sponsor: boolean): Paint {
  return (c) => {
    c.fillStyle = '#26252b';
    c.fillRect(0, 0, 256, 160);
    c.fillStyle = '#1b1a1f';
    c.fillRect(0, 0, 256, 14);
    text(c, sponsor ? 'MAISON LUA_협찬' : `LOOKBOOK_26FW  LOOK ${String(i + 1).padStart(2, '0')}`, 6, 7, 8, '#cfcfcf', 'left', false);
    text(c, '● 테더링', 250, 7, 8, '#ff6b6b', 'right', false);
    // The shot.
    c.fillStyle = sponsor ? '#f6dde0' : GREIGE;
    c.fillRect(70, 18, 116, 108);
    c.fillStyle = sponsor ? '#efcdd2' : '#e6ddd1';
    c.beginPath();
    c.moveTo(100, 126);
    c.lineTo(100, 60);
    c.arc(128, 60, 28, Math.PI, 0);
    c.lineTo(156, 126);
    c.fill();
    const [coat, bottom] = LOOKS[i % LOOKS.length];
    figure(c, 128, 40, 62, coat, bottom, i);
    if (sponsor) {
      c.fillStyle = '#5a3a40';
      c.fillRect(146, 82, 16, 12);
    }
    for (let k = 0; k < 6; k++) {
      c.fillStyle = k === i % 6 ? '#e0e0e0' : '#3c3b42';
      c.fillRect(30 + k * 33, 132, 30, 24);
      c.fillStyle = LOOKS[k][0];
      c.fillRect(42 + k * 33, 136, 6, 16);
    }
    c.fillStyle = '#323137';
    c.fillRect(196, 18, 56, 108);
    ['ISO 200', '1/160', 'f/5.6', '5600K'].forEach((s, k) => text(c, s, 202, 30 + k * 14, 8, '#bdbdbd', 'left', false));
    text(c, '★★★★☆', 202, 92, 8, '#ffd54f', 'left', false);
  };
}
/** The felt letter board's line: LOOK 01 … */
function paintLetters(s: string): Paint {
  return (c) => {
    c.fillStyle = '#2f2b2d';
    c.fillRect(0, 0, 128, 96);
    c.strokeStyle = '#3c3739';
    for (let y = 4; y < 96; y += 6) c.beginPath(), c.moveTo(0, y), c.lineTo(128, y), c.stroke();
    c.font = `bold 22px ${FONT}`;
    c.fillStyle = '#f5f1ea';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(s, 64, 36);
    c.font = `bold 12px ${FONT}`;
    c.fillText('26 F/W', 64, 66);
  };
}

/** The column desk's screen: the column draft in the blog editor. */
const paintColumn: Paint = (c) => {
  c.fillStyle = '#fbfaf8';
  c.fillRect(0, 0, 320, 200);
  c.fillStyle = '#f0e6e8';
  c.fillRect(0, 0, 320, 18);
  text(c, '모어 매거진 · 칼럼 편집', 8, 9, 10, '#7a5560');
  text(c, '발행 예약', 312, 9, 9, '#c2185b', 'right');
  text(c, '트렌치코트, 이렇게 입으면 달라져요', 16, 36, 15, '#2b2b30');
  text(c, '이번 시즌 꼭 알아야 할 스타일링 5', 16, 56, 10, '#8a7d6e', 'left', false);
  for (let i = 0; i < 3; i++) {
    c.fillStyle = ['#c19a6b', '#e7d6c3', '#7b2d3b'][i];
    c.fillRect(16 + i * 66, 70, 60, 70);
    figure(c, 46 + i * 66, 82, 36, ['#c19a6b', '#3e3a39', '#e7d6c3'][i], '#f3eee6', i);
  }
  c.fillStyle = '#c8c3bd';
  for (let i = 0; i < 4; i++) c.fillRect(16, 152 + i * 11, i === 3 ? 140 : 200 + (i % 2) * 40, 4);
  c.fillStyle = '#2b2b30';
  c.fillRect(160, 185, 2, 9);
  c.fillStyle = '#f3eee6';
  c.fillRect(226, 70, 84, 120);
  text(c, '태그', 232, 80, 9, '#7a5560');
  ['#트렌치', '#간절기룩', '#출근룩', '#데일리룩'].forEach((s, i) => text(c, s, 232, 96 + i * 14, 9, '#8a7d6e', 'left', false));
};
/** The season's trend column planned: the keywords round the theme. */
const paintTrend: Paint = (c) => {
  c.fillStyle = '#f7f3ee';
  c.fillRect(0, 0, 320, 200);
  c.fillStyle = '#e8ddd0';
  c.fillRect(0, 0, 320, 18);
  text(c, '26 F/W 트렌드 칼럼 기획', 8, 9, 10, '#5d4b3c');
  const mid = [160, 104] as const;
  c.fillStyle = '#7b2d3b';
  c.beginPath();
  c.ellipse(mid[0], mid[1], 52, 22, 0, 0, Math.PI * 2);
  c.fill();
  text(c, '조용한 럭셔리', mid[0], mid[1], 12, '#ffffff', 'center');
  const words: Array<[string, number, number, string]> = [['버건디', 60, 44, '#7b2d3b'], ['스웨이드', 256, 46, '#a1887f'], ['발레코어', 54, 160, '#f2c9cf'], ['오버핏 코트', 262, 160, '#c19a6b'], ['니트 레이어드', 160, 176, '#b7c4a8'], ['로퍼', 160, 36, '#3e3a39']];
  for (const [w, x, y, k] of words) {
    c.strokeStyle = '#c8bcae';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(mid[0], mid[1]);
    c.lineTo(x, y);
    c.stroke();
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.roundRect(x - 40, y - 11, 80, 22, 11);
    c.fill();
    c.fillStyle = k;
    c.beginPath();
    c.arc(x - 30, y, 5, 0, Math.PI * 2);
    c.fill();
    text(c, w, x + 4, y, 10, '#3a3036', 'center');
  }
};
/** The brand's offer open beside the contract. */
const paintOffer: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 320, 200);
  c.fillStyle = '#f6dde0';
  c.fillRect(0, 0, 320, 18);
  text(c, '받은편지함 · 협업 제안', 8, 9, 10, '#5a3a40');
  text(c, '[메종 루아] 26 S/S 앰버서더 협업 제안드립니다', 14, 34, 11, '#2b2b30');
  text(c, 'partner@maisonlua.example', 14, 50, 9, '#8a8a8a', 'left', false);
  const rows: Array<[string, string]> = [['콘텐츠', '피드 3회 · 릴스 2회'], ['기간', '3월 1일 ~ 4월 30일'], ['표기', '#광고 #협찬 필수'], ['2차 활용', '6개월'], ['원고료', '협의']];
  rows.forEach(([a, b], i) => {
    c.fillStyle = i % 2 ? '#fbf6f7' : '#f6eef0';
    c.fillRect(14, 64 + i * 22, 292, 22);
    text(c, a, 22, 75 + i * 22, 10, '#7a5560');
    text(c, b, 110, 75 + i * 22, 10, '#3a3036', 'left', false);
  });
  c.fillStyle = '#c2185b';
  c.beginPath();
  c.roundRect(214, 178, 92, 18, 9);
  c.fill();
  text(c, '조건 회신하기', 260, 187, 9, '#ffffff', 'center');
};
/** The week's outfits planned on the screen (while the polaroids are laid out on the desk). */
const paintPlanner: Paint = (c) => {
  c.fillStyle = '#fbfaf8';
  c.fillRect(0, 0, 320, 200);
  c.fillStyle = '#e9e3f0';
  c.fillRect(0, 0, 320, 18);
  text(c, '이번 주 코디 플래너', 8, 9, 10, '#5b4a6e');
  ['월', '화', '수', '목', '금'].forEach((d, i) => {
    const x = 14 + i * 61;
    c.fillStyle = '#f3eee6';
    c.fillRect(x, 26, 56, 164);
    text(c, d, x + 28, 36, 11, '#5b4a6e', 'center');
    figure(c, x + 28, 60, 52, LOOKS[i][0], LOOKS[i][1], i);
    for (let k = 0; k < 3; k++) {
      c.fillStyle = [LOOKS[i][0], LOOKS[i][1], '#212121'][k];
      c.beginPath();
      c.arc(x + 14 + k * 14, 172, 5, 0, Math.PI * 2);
      c.fill();
    }
  });
};
/** The mood board's cork: torn-out shots, swatches, a ticket, the season written on. */
const paintMood: Paint = (c) => {
  c.fillStyle = '#c9a77c';
  c.fillRect(0, 0, 256, 192);
  for (let i = 0; i < 400; i++) {
    c.fillStyle = i % 2 ? 'rgba(120,80,40,0.15)' : 'rgba(255,240,210,0.15)';
    c.fillRect((i * 53) % 256, (i * 31) % 192, 2, 2);
  }
  const pics: Array<[number, number, number, number, string, number]> = [[14, 14, 54, 72, '#e7d6c3', 0], [76, 10, 50, 64, '#7b2d3b', 1], [136, 18, 56, 74, '#b7c4a8', 2], [200, 12, 44, 58, '#3e3a39', 0], [20, 100, 62, 78, '#f2c9cf', 1], [150, 104, 50, 68, '#c19a6b', 2]];
  for (const [x, y, w, h, k, p] of pics) {
    c.fillStyle = '#ffffff';
    c.fillRect(x - 3, y - 3, w + 6, h + 12);
    c.fillStyle = k;
    c.fillRect(x, y, w, h);
    figure(c, x + w / 2, y + h * 0.18, h * 0.62, shade(k, 0.7), '#f3eee6', p);
    c.fillStyle = '#e53935';
    c.beginPath();
    c.arc(x + w / 2, y - 1, 3, 0, Math.PI * 2);
    c.fill();
  }
  ['#7b2d3b', '#a1887f', '#f2c9cf', '#b7c4a8', '#3e3a39'].forEach((k, i) => {
    c.fillStyle = k;
    c.fillRect(92 + i * 11, 98, 10, 34);
  });
  c.font = `italic 20px ${SERIF}`;
  c.fillStyle = '#3a3036';
  c.textAlign = 'left';
  c.textBaseline = 'middle';
  c.fillText('mood 26fw', 88, 156);
  c.fillStyle = '#fff59d';
  c.fillRect(206, 112, 42, 40);
  text(c, '버건디', 227, 124, 10, '#5d4037', 'center');
  text(c, '+ 스웨이드', 227, 140, 9, '#5d4037', 'center', false);
};
/** A polaroid of a look (planning the week). */
function paintPolaroid(i: number): Paint {
  return (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 64, 76);
    c.fillStyle = shade(LOOKS[i % LOOKS.length][0], 0.85);
    c.fillRect(5, 5, 54, 54);
    c.fillStyle = '#efe8df';
    c.fillRect(7, 7, 50, 50);
    figure(c, 32, 14, 38, LOOKS[i % LOOKS.length][0], LOOKS[i % LOOKS.length][1], i);
    text(c, ['월', '화', '수', '목', '금', '주말'][i % 6], 32, 68, 9, '#5d4037', 'center');
  };
}
/** The long mirror: a pale silvered face with the light's streaks across it. */
const paintMirror: Paint = (c) => {
  const g = c.createLinearGradient(0, 0, 128, 256);
  g.addColorStop(0, '#eef3f6');
  g.addColorStop(0.5, '#d9e3ea');
  g.addColorStop(1, '#c7d3dc');
  c.fillStyle = g;
  c.fillRect(0, 0, 128, 256);
  c.fillStyle = 'rgba(255,255,255,0.55)';
  c.beginPath();
  c.moveTo(20, 0);
  c.lineTo(48, 0);
  c.lineTo(0, 90);
  c.lineTo(0, 40);
  c.fill();
  c.beginPath();
  c.moveTo(128, 120);
  c.lineTo(128, 140);
  c.lineTo(60, 256);
  c.lineTo(48, 256);
  c.fill();
  // The room behind, dim: the floor's line and a rail of clothes.
  c.fillStyle = 'rgba(160,140,120,0.25)';
  c.fillRect(0, 200, 128, 56);
  c.fillStyle = 'rgba(120,110,100,0.2)';
  for (let i = 0; i < 6; i++) c.fillRect(70 + i * 9, 110, 6, 60);
};
/** The phone's camera in the mirror: the REC frame, the grid. */
const paintOotdPhone: Paint = (c) => {
  c.fillStyle = '#d9e3ea';
  c.fillRect(0, 0, 66, 142);
  c.fillStyle = 'rgba(255,255,255,0.4)';
  c.fillRect(0, 0, 66, 142);
  figure(c, 33, 30, 70, '#c19a6b', '#f3eee6', 0);
  c.strokeStyle = 'rgba(255,255,255,0.7)';
  c.lineWidth = 1;
  for (const x of [22, 44]) c.beginPath(), c.moveTo(x, 0), c.lineTo(x, 142), c.stroke();
  for (const y of [47, 94]) c.beginPath(), c.moveTo(0, y), c.lineTo(66, y), c.stroke();
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.arc(33, 130, 7, 0, Math.PI * 2);
  c.fill();
  text(c, '#OOTD', 33, 10, 8, '#ffffff', 'center');
};

// ---------------------------------------------------------------------------------------------
// The dress form's body and the clothes that go on it (lathed round its middle, flattened front to back).

const lathe = (key: string, pts: Array<[number, number]>, phiStart = 0, phiLength = Math.PI * 2) =>
  shape(`siLathe${key}`, () => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 28, phiStart, phiLength));
/** The torso from the hips (0.7) to the neck (1.47). */
const TORSO: Array<[number, number]> = [[0.0, 0.7], [0.12, 0.71], [0.152, 0.8], [0.155, 0.88], [0.138, 0.98], [0.117, 1.05], [0.128, 1.14], [0.15, 1.24], [0.152, 1.3], [0.12, 1.36], [0.07, 1.39], [0.048, 1.41], [0.046, 1.47], [0.0, 1.47]];
const DRESS: Array<[number, number]> = [[0.22, 0.46], [0.19, 0.62], [0.168, 0.8], [0.164, 0.88], [0.146, 0.98], [0.126, 1.05], [0.137, 1.14], [0.159, 1.24], [0.162, 1.3], [0.13, 1.36], [0.085, 1.39], [0.06, 1.405]];
const JACKET: Array<[number, number]> = [[0.188, 0.8], [0.18, 0.9], [0.165, 1.0], [0.158, 1.06], [0.164, 1.14], [0.18, 1.24], [0.183, 1.31], [0.15, 1.37], [0.1, 1.405], [0.075, 1.42]];
/** The looks the form is dressed in, round by round: the dress, the jacket, the belt, the scarf. */
const FORM_LOOKS: Array<[string, string, string, string]> = [
  ['#f3eee6', '#c19a6b', '#4e342e', '#7b2d3b'],
  ['#2f3a4a', '#e7d6c3', '#c9a45c', '#f2c9cf'],
  ['#7b2d3b', '#3e3a39', '#d7ccc8', '#e7d6c3'],
  ['#b7c4a8', '#f7f1e8', '#6d4c41', '#c19a6b'],
];

// ---------------------------------------------------------------------------------------------

export const BUILDERS: Record<string, Builder> = {
  /**
   * The lookbook set (룩북 촬영 세트, 3 × 1): a greige flat braced from behind with its arched niche
   * and "Lookbook 26 F/W" on it, a round jute rug on the floor, a terrazzo plinth with pampas grass
   * in a vase and the felt letter board leant on it (the look's number), an octabox on its stand at
   * the front left, and at the front right the camera on its tripod aimed at the rug with the
   * tethered laptop on its little stand. A self-shot lookbook (shootLookbook, siLookbook): looks
   * posed in turn on the rug — the remote hidden in the right hand — the octabox and the flat
   * flashing twice a pose and each frame landing on the laptop. The 협찬 shoot (sponsoredShoot,
   * siSponsor): 메종 루아's banner hung in the niche, the brand's box on the plinth, the bag carried,
   * hung in the elbow, held up; the perfume by the cheek and to the lens.
   */
  lookbookSet(g, W, D, _c, _def, _ctx, out) {
    const use = inUse(g, out);
    const fw = Math.min(W - 0.3, 2.6);
    const fh = 2.15;
    const fz = -D / 2 + 0.08;
    // The flat and its braces.
    part(g, box(fw, fh, 0.05), GREIGE, 0, fh / 2, fz);
    picture(g, painted('siSetWall', 256, 200, paintSetWall), fw - 0.02, fh - 0.02, 0, fh / 2, fz + 0.027, '#f2efe9');
    for (const sx of [-1, 1]) {
      rod(g, V(sx * (fw / 2 - 0.2), fh - 0.4, fz - 0.03), V(sx * (fw / 2 - 0.2), 0.02, -D / 2 + 0.01), 0.02, OAK_D);
      part(g, rbox(0.2, 0.08, 0.1, 0.02), '#6e6a64', sx * (fw / 2 - 0.2), 0.04, -D / 2 + 0.06);
    }
    // The rug, the mark taped on it.
    const markX = -0.15;
    const markZ = 0.04;
    part(g, cyl(0.62, 0.62, 0.012, 32), '#d8c3a0', markX, 0.006, 0.02, { outline: false });
    for (let i = 1; i < 6; i++) part(g, ring(i * 0.1, 0.004), '#c4ab84', markX, 0.013, 0.02, { rx: Math.PI / 2, outline: false });
    part(g, box(0.16, 0.003, 0.025), BLUSH_D, markX, 0.016, markZ + 0.1, { outline: false });
    // The plinth and the pampas, the letter board.
    const px = -fw / 2 + 0.3;
    const pz = -0.12;
    part(g, cyl(0.2, 0.2, 0.42, 24), TERRAZZO, px, 0.21, pz);
    for (let i = 0; i < 14; i++) part(g, ball(0.008), ['#8d8580', '#c9a45c', '#9e7b6a'][i % 3], px + Math.cos(i * 2.4) * (0.06 + (i % 4) * 0.035), 0.1 + ((i * 0.13) % 0.3), pz + Math.sin(i * 2.4) * 0.19 + 0.012, { outline: false });
    part(g, cyl(0.07, 0.05, 0.26, 16), '#efe6da', px + 0.04, 0.55, pz - 0.04);
    const pampas = group(g, px + 0.04, 0.68, pz - 0.04);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const tip = V(Math.sin(a) * 0.2, 0.55 + (i % 3) * 0.1, Math.cos(a) * 0.12);
      rod(pampas, V(0, 0, 0), tip, 0.004, '#b9a68a');
      const plume = part(pampas, ball(0.05), '#efe2c8', tip.x, tip.y, tip.z, { outline: false });
      plume.scale.set(0.55, 1.6, 0.55);
      plume.quaternion.setFromUnitVectors(UP, tip.clone().normalize());
    }
    const lb = group(g, px + 0.17, 0, pz + 0.2, -0.3);
    part(lb, rbox(0.3, 0.23, 0.03, 0.01), OAK, 0, 0.13, 0, { rx: -0.25 });
    const lookNo = swap(lb, LOOKS.map((_, i) => painted(`siLetters${i}`, 128, 96, paintLetters(`LOOK ${String(i + 1).padStart(2, '0')}`))), 0.26, 0.19, 0, 0.13, 0.018, 0, -0.25);
    // The octabox at the front left, aimed at the mark, and its flash on the flat.
    const ox = -fw / 2 + 0.06;
    const oz = 0.3;
    lightStand(g, ox, oz, 1.65, 0.18);
    const oct = aimed(g, ox, 1.68, oz, V(markX, 1.3, markZ));
    part(oct, cyl(0.36, 0.08, 0.26, 8), '#2e2d33', 0, 0, -0.06, { rx: -Math.PI / 2 });
    part(oct, cyl(0.355, 0.355, 0.01, 8), '#f4f1ea', 0, 0, 0.075, { rx: Math.PI / 2, outline: false });
    const octUse = aimed(use, ox, 1.68, oz, V(markX, 1.3, markZ));
    const octFace = part(octUse, cyl(0.35, 0.35, 0.006, 8), '#ffffff', 0, 0, 0.083, { rx: Math.PI / 2, outline: false, material: glow('#fffdf6') });
    const wash = fader(use, fw - 0.04, fh - 0.04, 0, fh / 2, fz + 0.031, '#ffffff');
    // The camera on its tripod at the front right, and the tethered laptop beside it.
    const cx = W / 2 - 0.28;
    const cz = D / 2 - 0.16;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.4;
      rod(g, V(cx, 1.05, cz), V(cx + Math.sin(a) * 0.22, 0.01, cz + Math.cos(a) * 0.22), 0.009, INK);
    }
    part(g, cyl(0.016, 0.016, 0.18, 8), INK, cx, 1.12, cz, { outline: false });
    const cam = aimed(g, cx, 1.26, cz, V(markX, 1.2, markZ));
    part(cam, rbox(0.13, 0.09, 0.07, 0.012), '#2a2a2e', 0, 0, 0);
    part(cam, rbox(0.04, 0.035, 0.05, 0.01), '#2a2a2e', 0, 0.055, -0.005);
    part(cam, cyl(0.035, 0.035, 0.1, 18), '#1e1e22', 0.0, -0.004, 0.08, { rx: Math.PI / 2 });
    part(cam, ring(0.035, 0.004), '#c9c9c9', 0, -0.004, 0.13, { outline: false });
    part(cam, rbox(0.03, 0.08, 0.05, 0.01), '#1e1e22', -0.07, -0.005, 0.01);
    const camUse = aimed(use, cx, 1.26, cz, V(markX, 1.2, markZ));
    const tally = part(camUse, ball(0.008), '#ff3b3b', 0.05, 0.035, 0.036, { outline: false, material: glow('#ff3b3b') });
    // The tether cable down the leg and over to the laptop.
    const tx = cx - 0.42;
    const tz = D / 2 - 0.12;
    rod(g, V(cx - 0.05, 1.2, cz), V(cx - 0.03, 0.05, cz + 0.02), 0.004, '#ff7043');
    rod(g, V(cx - 0.03, 0.02, cz + 0.02), V(tx, 0.02, tz), 0.004, '#ff7043');
    part(g, cyl(0.17, 0.17, 0.015, 16), '#2e2d33', tx, 0.01, tz, { outline: false });
    part(g, cyl(0.016, 0.016, 0.9, 8), CHROME, tx, 0.46, tz, { outline: false });
    part(g, rbox(0.36, 0.025, 0.26, 0.01), '#2e2d33', tx, 0.92, tz);
    const lap = group(g, tx, 0.94, tz);
    part(lap, rbox(0.3, 0.012, 0.2, 0.006), '#cfd3d8', 0, 0.006, 0.0);
    part(lap, box(0.26, 0.002, 0.1), '#a9aeb4', 0, 0.013, 0.02, { outline: false });
    const lid = group(lap, 0, 0.012, -0.1, 0, -0.32);
    part(lid, rbox(0.3, 0.2, 0.01, 0.006), '#cfd3d8', 0, 0.1, 0);
    const frames = swap(lid, [...LOOKS.map((_, i) => painted(`siTether${i}`, 256, 160, paintTether(i, false))), painted('siTetherSp', 256, 160, paintTether(0, true))], 0.27, 0.17, 0, 0.1, 0.006);
    // The 협찬 shoot's things: the banner in the niche, the brand's box on the plinth.
    const sp = group(use);
    const banner = group(sp, 0, 0, fz + 0.045);
    rod(banner, V(-0.32, 1.86, 0), V(0.32, 1.86, 0), 0.01, BRASS);
    picture(banner, painted('siBanner', 160, 256, paintBanner), 0.56, 0.9, 0, 1.39, 0.004);
    part(sp, rbox(0.24, 0.12, 0.18, 0.01), '#2b2224', px - 0.02, 0.48, pz + 0.02);
    part(sp, box(0.242, 0.02, 0.182), BRASS, px - 0.02, 0.5, pz + 0.02, { outline: false });
    label(sp, 'MAISON LUA', 0.16, 0.03, px - 0.02, 0.47, pz + 0.112, '#2b2224', '#e8cf95');
    // What's in the hands: the remote; the bag and the perfume.
    const look = standAt(g, markX, markZ, 0, 'siLookbook');
    const sponsor = standAt(g, markX, markZ, 0, 'siSponsor');
    const mark = marker(g, markX, 1.2, markZ);
    look.work = sponsor.work = mark;
    const hold = holder(use);
    const remote = group(hold);
    part(remote, rbox(0.03, 0.065, 0.014, 0.008), '#1e1e22', 0, 0, 0);
    part(remote, cyl(0.006, 0.006, 0.004, 10), '#9e9e9e', 0, 0.015, 0.008, { rx: Math.PI / 2, outline: false });
    const bag = group(hold);
    part(bag, ring(0.065, 0.007, Math.PI), '#5a3a40', 0, -0.065, 0, { outline: false });
    part(bag, rbox(0.25, 0.17, 0.09, 0.03), '#5a3a40', 0, -0.2, 0);
    part(bag, box(0.252, 0.05, 0.092), shade('#5a3a40', 0.85), 0, -0.145, 0, { outline: false });
    part(bag, rbox(0.04, 0.025, 0.01, 0.005), BRASS, 0, -0.16, 0.048, { outline: false });
    const bottle = group(hold);
    const glassB = new THREE.Mesh(rbox(0.06, 0.08, 0.035, 0.01), GLASS);
    bottle.add(glassB);
    part(bottle, rbox(0.045, 0.055, 0.022, 0.008), '#f2b8c6', 0, -0.006, 0, { outline: false });
    part(bottle, cyl(0.016, 0.016, 0.03, 12), BRASS, 0, 0.055, 0);
    label(bottle, 'LUA', 0.035, 0.012, 0, 0.0, 0.019, '#f2b8c6', '#5a3a40');
    out.work = mark;
    out.animate = (t) => {
      const now = nowAt([look, sponsor], t);
      if (!now) {
        lookNo(0);
        frames(0);
        return;
      }
      const isSp = now === sponsor;
      const ph = siPhase(mark.getWorldPosition(tmp));
      const k = kOf(now);
      sp.visible = isSp;
      tally.visible = wave(t, 1) > -0.2;
      let v: number;
      if (isSp) {
        const a = sponsorAt(t, ph);
        now.at.rotation.y = a.twist;
        follow(hold, now);
        v = a.v;
        remote.visible = false;
        bag.visible = true;
        put(bag, a.bag, k);
        bag.rotation.set(0, 0, a.tag === 'crook' ? 0.3 : 0);
        bottle.visible = !!a.bottle;
        if (a.bottle) put(bottle, a.bottle, k);
        frames(LOOKS.length);
        lookNo(a.n);
      } else {
        const a = lookbookAt(t, ph);
        now.at.rotation.y = a.twist;
        follow(hold, now);
        v = a.v;
        remote.visible = !!a.h.r;
        bag.visible = bottle.visible = false;
        if (a.h.r) put(remote, a.h.r, k);
        lookNo(a.i);
        frames(a.v >= 1.0 || a.v < 0 ? a.i : (a.i + LOOKS.length - 1) % LOOKS.length);
      }
      const f = shotFlash(v);
      octFace.visible = f > 0.05;
      setOpacity(wash, f * 0.55);
    };
    out.spots = { '*': look, shootLookbook: look, sponsoredShoot: sponsor };
  },

  /**
   * The column desk (스타일 칼럼 책상): white oak on tapered legs, a blush boucle chair; a pastel
   * all-in-one, the keyboard and mouse, a stack of magazines, the swatch book fanned open, colour
   * chips, a bud vase with a tulip and the polaroid pile; the season's mood board on the wall over it.
   * The column written at the keyboard (writeStyleColumn, the draft in the editor) and the season's
   * trend column planned (trendColumn, the keywords round the theme); the week's outfits planned
   * (planOutfits, siCards) — the keyboard pushed back and the polaroids laid in a grid, swatches held
   * to them, the planner on the screen; a brand's offer read and the contract signed (brandContract).
   */
  styleDesk(g, W, D, _c, _def, _ctx, out) {
    const use = inUse(g, out);
    const w = Math.min(W - 0.06, 0.96);
    const d = 0.6;
    const top = 0.74;
    const z = -D / 2 + d / 2 + 0.02;
    const front = z + d / 2;
    part(g, rbox(w, 0.04, d, 0.012), IVORY, 0, top, z);
    part(g, box(w - 0.02, 0.012, d - 0.02), OAK, 0, top - 0.026, z, { outline: false });
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const lx = sx * (w / 2 - 0.06);
        const lz = z + sz * (d / 2 - 0.06);
        rod(g, V(lx, top - 0.03, lz), V(lx + sx * 0.03, 0, lz + sz * 0.03), 0.018, OAK);
      }
    // A shallow drawer under the left of the top, a brass pull.
    part(g, rbox(0.36, 0.07, d - 0.06, 0.01), IVORY, -w / 2 + 0.24, top - 0.07, z);
    part(g, cyl(0.008, 0.008, 0.06, 8), BRASS, -w / 2 + 0.24, top - 0.07, front - 0.025, { rz: Math.PI / 2, outline: false });
    // The chair: a blush boucle tub on oak legs.
    const cz = front + 0.2;
    const chair = group(g, 0, 0, cz, Math.PI);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) rod(chair, V(sx * 0.16, 0.36, sz * 0.15), V(sx * 0.2, 0, sz * 0.19), 0.014, OAK);
    part(chair, cyl(0.24, 0.23, 0.1, 24), BLUSH, 0, 0.41, 0);
    const back = new THREE.Mesh(shape('siTub', () => new THREE.CylinderGeometry(0.25, 0.24, 0.3, 24, 1, true, Math.PI * 0.62, Math.PI * 0.76)), new THREE.MeshToonMaterial({ color: BLUSH, gradientMap: gradient, side: THREE.DoubleSide }));
    back.userData.ownMaterial = true;
    back.position.set(0, 0.6, 0);
    chair.add(back);
    // The all-in-one.
    const mz = z - 0.17;
    part(g, rbox(0.16, 0.012, 0.12, 0.01), '#e8d6da', 0, top + 0.026, mz);
    part(g, rbox(0.04, 0.2, 0.02, 0.01), '#e8d6da', 0, top + 0.12, mz - 0.02);
    part(g, rbox(0.56, 0.36, 0.025, 0.012), '#f4e4e7', 0, top + 0.33, mz);
    part(g, box(0.56, 0.05, 0.026), '#ecd2d7', 0, top + 0.175, mz, { outline: false });
    const page = swap(g, [painted('siColumn', 320, 200, paintColumn), painted('siTrend', 320, 200, paintTrend), painted('siPlanner', 320, 200, paintPlanner), painted('siOffer', 320, 200, paintOffer)], 0.52, 0.29, 0, top + 0.355, mz + 0.014);
    // The keyboard and mouse (pushed back while the polaroids are out).
    const kb = group(g, 0, top + 0.02, z + 0.16);
    part(kb, rbox(0.36, 0.016, 0.12, 0.008), '#f6eef0', 0, 0.008, 0);
    for (let r = 0; r < 4; r++) for (let i = 0; i < 12; i++) part(kb, box(0.022, 0.006, 0.02), '#e8d6da', -0.135 + i * 0.0245, 0.018, -0.04 + r * 0.026, { outline: false });
    part(g, rbox(0.05, 0.02, 0.08, 0.02), '#f6eef0', 0.32, top + 0.03, z - 0.06);
    // The magazines, the swatch book, the chips, the vase.
    ['#7b2d3b', '#e7d6c3', '#2f3a4a', '#f2c9cf'].forEach((k, i) => part(g, box(0.21, 0.012, 0.27), k, -w / 2 + 0.15, top + 0.026 + i * 0.013, z - 0.12, { ry: 0.05 * (i - 1.5) }));
    label(g, 'MORE', 0.12, 0.035, -w / 2 + 0.15, top + 0.0785, z - 0.17, '#f2c9cf', '#3a3036').rotation.x = -Math.PI / 2;
    // Colour chips fanned on the monitor's foot.
    ['#7b2d3b', '#a1887f', '#c19a6b', '#b7c4a8', '#2f3a4a', '#f2c9cf'].forEach((k, i) => part(g, box(0.02, 0.003, 0.08), k, 0.2 + i * 0.012, top + 0.024 + i * 0.003, z - 0.17, { ry: -0.6 + i * 0.24, outline: false }));
    part(g, cyl(0.03, 0.035, 0.14, 14), '#e8f0ee', w / 2 - 0.1, top + 0.09, z - 0.18);
    rod(g, V(w / 2 - 0.1, top + 0.15, z - 0.18), V(w / 2 - 0.085, top + 0.32, z - 0.17), 0.004, '#6a8f5a');
    part(g, ball(0.03), '#f48fb1', w / 2 - 0.085, top + 0.34, z - 0.17).scale.set(1, 1.3, 1);
    // The mood board on the wall.
    part(g, rbox(0.66, 0.5, 0.02, 0.01), OAK_D, 0, 1.6, -D / 2 + 0.02);
    picture(g, painted('siMood', 256, 192, paintMood), 0.62, 0.46, 0, 1.6, -D / 2 + 0.031);
    // The work mark (where the polaroids go) and the piles on either side.
    const mark = marker(g, 0, top + 0.022, z + 0.09);
    const p = mark.position;
    /** From the sitter's frame (they face -z: their left is -x) to the desk's. */
    const onDesk = (o: BarOffset, v: THREE.Vector3) => v.set(p.x - o.side, p.y + o.up, p.z - o.ahead);
    for (let i = 0; i < 5; i++) {
      const m = picture(g, painted(`siPol${i}`, 64, 76, paintPolaroid(i)), 0.07, 0.083, 0, 0, 0, '#ffffff', 0, -Math.PI / 2);
      onDesk(CARD_PILE, m.position).y += 0.002 + i * 0.002;
      m.rotation.z = 0.1 * (i - 2);
    }
    ['#7b2d3b', '#a1887f', '#b7c4a8'].forEach((k, i) => {
      const m = part(g, box(0.07, 0.006, 0.07), k, 0, 0, 0, { outline: false });
      onDesk(SWATCHES, m.position).y += 0.004 + i * 0.006;
      m.rotation.y = 0.2 * i;
    });
    // In use: the laid polaroids, the one in the hand, the swatch; the contract and its pen.
    const laid = CARD_SLOTS.map((s, i) => {
      const m = picture(use, painted(`siPol${i}`, 64, 76, paintPolaroid(i)), 0.07, 0.083, 0, 0, 0, '#ffffff', 0, -Math.PI / 2);
      onDesk(s, m.position).y += 0.003;
      m.rotation.z = 0.06 * Math.sin(i * 2.1);
      return m;
    });
    const home = laid.map((m) => m.position.clone());
    const pileAt = onDesk(CARD_PILE, new THREE.Vector3()).setY(p.y + 0.012);
    const held = picture(use, painted('siPol5', 64, 76, paintPolaroid(5)), 0.07, 0.083, 0, 0, 0, '#ffffff', 0, -Math.PI / 2);
    const swatch = part(use, box(0.07, 0.006, 0.07), '#7b2d3b', 0, 0, 0, { outline: false });
    const contract = group(use, 0.02, top + 0.023, z + 0.12, 0.08);
    part(contract, box(0.21, 0.003, 0.29), '#ffffff', 0, 0, 0, { outline: false });
    label(contract, '콘텐츠 협업 계약서', 0.16, 0.022, 0, 0.003, -0.11, '#ffffff', '#3a3036').rotation.x = -Math.PI / 2;
    for (let i = 0; i < 6; i++) part(contract, box(0.16, 0.001, 0.006), '#bdb6b0', 0, 0.002, -0.07 + i * 0.03, { outline: false });
    label(contract, '메종 루아 × 스튜디오 모어', 0.15, 0.016, 0, 0.003, 0.11, '#ffffff', '#c2185b').rotation.x = -Math.PI / 2;
    const signAt = marker(contract, 0.04, 0.0, 0.1);
    // The four uses, sat in the same chair.
    const seatY = 0.46;
    const column = sitAt(g, 0, seatY, cz, Math.PI, 'type', marker(g, 0, top + 0.04, z + 0.16));
    const trend = sitAt(g, 0, seatY, cz, Math.PI, 'type', column.work);
    const plan = sitAt(g, 0, seatY, cz, Math.PI, 'siCards', mark);
    const contractSpot = sitAt(g, 0, seatY, cz, Math.PI, 'write', signAt);
    out.seat = column.at;
    out.work = column.work;
    out.animate = (t) => {
      const now = nowAt([column, trend, plan, contractSpot], t) ?? column;
      const planning = now === plan;
      page(now === trend ? 1 : planning ? 2 : now === contractSpot ? 3 : 0);
      kb.position.z = planning || now === contractSpot ? z - 0.09 : z + 0.16;
      contract.visible = now === contractSpot;
      laid.forEach((m) => (m.visible = false));
      held.visible = swatch.visible = false;
      if (!planning) return;
      const a = cardsAt(t, siPhase(mark.getWorldPosition(tmp)));
      laid.forEach((m, i) => {
        m.visible = i < a.laid;
        m.position.lerpVectors(home[i], pileAt, a.gather);
      });
      if (a.inHand) {
        held.visible = true;
        onDesk(a.inHand, held.position).y += 0.004;
        // Lifted to be looked at: tipped up toward the sitter.
        held.rotation.x = -Math.PI / 2 + Math.min(1, a.inHand.up / 0.18) * 1.1;
      }
      if (a.swatch) {
        swatch.visible = true;
        onDesk(a.swatch, swatch.position);
      }
    };
    out.spots = { '*': column, writeStyleColumn: column, styleInfluencer_trendColumn: trend, planOutfits: plan, styleInfluencer_brandContract: contractSpot };
  },

  /**
   * The dress form (마네킹): a linen-covered torso on a brass pole and a walnut tripod on castors, its
   * turned wooden neck cap with a tomato pincushion on it, a tailor's tape round the neck — the same
   * in the atelier and the shop. Dressed in a look (a dress, a jacket over it, a belt; a scarf when
   * it's done). Styled at (dressMannequin and the stage uses, siDress): the shoulders smoothed, a pin
   * pushed in at the waist, the jacket lifted on, the belt tied, a step back to look, the form turned
   * round; a new look each round.
   */
  mannequin(g, _W, _D, _c, _def, _ctx, out) {
    // In a shop window (windowMannequin, 2026-11-06) the form faces the street through the glass behind it, styled from the shop side.
    const turn = _def.id === 'windowMannequin' ? Math.PI : 0;
    // The tripod on castors, the pole, the height collar.
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
      rod(g, V(0, 0.12, 0), V(Math.sin(a) * 0.26, 0.05, Math.cos(a) * 0.26), 0.018, '#5d4037');
      part(g, ball(0.025), '#2b2b30', Math.sin(a) * 0.26, 0.025, Math.cos(a) * 0.26, { outline: false });
    }
    part(g, cyl(0.035, 0.035, 0.08, 12), '#5d4037', 0, 0.13, 0);
    part(g, cyl(0.014, 0.014, 0.6, 10), BRASS, 0, 0.45, 0, { outline: false });
    part(g, cyl(0.024, 0.024, 0.05, 12), BRASS, 0, 0.5, 0);
    part(g, cyl(0.006, 0.006, 0.05, 8), BRASS, 0.035, 0.5, 0, { rz: Math.PI / 2, outline: false });
    // The form (turns as a whole when it's turned round).
    const form = group(g);
    form.rotation.y = turn;
    const torso = part(form, lathe('Torso', TORSO), '#e9dfcf', 0, 0, 0);
    torso.scale.set(1, 1, 0.74);
    part(form, cyl(0.05, 0.06, 0.03, 16), '#5d4037', 0, 1.485, 0);
    part(form, ball(0.03), '#5d4037', 0, 1.52, 0);
    part(form, ball(0.035), '#d32f2f', 0.0, 1.565, 0).scale.set(1, 0.75, 1);
    part(form, cyl(0.004, 0.004, 0.03, 6), '#3a7d44', 0, 1.6, 0, { outline: false });
    // The seam lines on the linen.
    part(form, box(0.004, 0.62, 0.004), '#cbbfae', 0, 1.06, 0.118, { outline: false });
    // The tailor's tape round the neck, its ends hanging down the front.
    part(form, ring(0.06, 0.006), '#f2d24b', 0, 1.42, 0, { rx: Math.PI / 2, outline: false }).scale.set(1, 0.8, 1);
    for (const sx of [-1, 1]) part(form, box(0.018, 0.3, 0.003), '#f2d24b', sx * 0.06, 1.27, 0.115, { rz: sx * 0.08, outline: false });
    // The look: the dress, the jacket (open at the front), the belt, the scarf; pins at the waist.
    const dressM = part(form, lathe('Dress', DRESS), FORM_LOOKS[0][0], 0, 0, 0);
    dressM.scale.set(1, 1, 0.76);
    const jacket = group(form);
    const jk = part(jacket, lathe('Jacket', JACKET, 0.42, Math.PI * 2 - 0.84), FORM_LOOKS[0][1], 0, 0, 0);
    jk.scale.set(1, 1, 0.78);
    const lapels = [-1, 1].map((sx) => part(jacket, box(0.05, 0.26, 0.01), FORM_LOOKS[0][1], sx * 0.07, 1.25, 0.135, { rz: sx * -0.25, outline: false }));
    const buttons = [0, 1].map((i) => part(jacket, ball(0.009), BRASS, 0.075, 1.06 - i * 0.08, 0.128, { outline: false }));
    const belt = part(form, ring(0.13, 0.012), FORM_LOOKS[0][2], 0, 1.05, 0, { rx: Math.PI / 2, outline: false });
    belt.scale.set(1, 0.78, 1);
    const buckle = part(form, rbox(0.04, 0.035, 0.012, 0.004), BRASS, 0, 1.05, 0.104);
    const scarf = group(form);
    const scarfRing = part(scarf, ring(0.075, 0.022), FORM_LOOKS[0][3], 0, 1.4, 0, { rx: Math.PI / 2 - 0.15, outline: false });
    scarfRing.scale.set(1, 0.85, 1);
    const tails = [-1, 1].map((sx) => part(scarf, rbox(0.06, 0.26, 0.015, 0.006), FORM_LOOKS[0][3], sx * 0.035, 1.26, 0.13, { rz: sx * 0.12 }));
    const pins = [0, 1, 2].map((i) => part(form, ball(0.006), i === 1 ? '#e53935' : '#90caf9', -0.04 + i * 0.03, 1.07 + (i % 2) * 0.015, 0.105, { outline: false }));
    const colour = (i: number) => {
      const [dc, jc, bc, sc] = FORM_LOOKS[i % FORM_LOOKS.length];
      dressM.material = toon(dc);
      jk.material = toon(jc);
      lapels.forEach((m) => (m.material = toon(shade(jc, 0.9))));
      belt.material = toon(bc);
      scarfRing.material = toon(sc);
      tails.forEach((m) => (m.material = toon(sc)));
    };
    const show = (j: boolean, b: boolean, s: boolean, pn: boolean) => {
      jacket.visible = j;
      buttons.forEach((m) => (m.visible = j));
      belt.visible = buckle.visible = b;
      scarf.visible = s;
      pins.forEach((m) => (m.visible = pn));
    };
    show(true, true, true, false);
    // Where they stand to style it, and the fixed mark the clock goes by.
    const mark = marker(g, 0, FORM.waist + 0.15, 0);
    const z0 = FORM.ahead;
    const dress = standAt(g, 0, z0, Math.PI, 'siDress', mark);
    out.work = mark;
    let lastLook = -1;
    out.animate = (t) => {
      if (Math.abs(t - posedAt(dress)) > 0.6) {
        // Nobody at it: dressed and still, facing the room.
        form.rotation.y = turn;
        dress.at.position.z = z0;
        if (lastLook !== 0) colour((lastLook = 0));
        show(true, true, true, false);
        return;
      }
      const a = dressAt(t, siPhase(mark.getWorldPosition(tmp)));
      dress.at.position.z = z0 + a.back;
      const n = ((a.n % FORM_LOOKS.length) + FORM_LOOKS.length) % FORM_LOOKS.length;
      if (n !== lastLook) colour((lastLook = n));
      // Through the round: the dress alone, a pin, the jacket on, the belt, the scarf at the end.
      const step = a.i + (a.e > 0.5 ? 1 : 0);
      show(step >= 3 || a.i === 2, step >= 4 || (a.i === 3 && a.v > 1.2), false, step >= 2);
      if (a.i === 2) {
        // The jacket comes down onto the shoulders as it's lifted on.
        jacket.position.y = 0.12 * (1 - Math.min(1, (a.v < 0 ? 2.2 : a.v) / 1.6));
      } else jacket.position.y = 0;
      form.rotation.y = turn + (a.i === 5 && a.v >= 0 ? (Math.min(1, a.v / 2.0) * Math.PI * 2) : 0);
    };
    out.spots = { '*': dress };
  },

  // ---- What the studio was missing ----

  /**
   * The OOTD mirror (착장 거울): a tall arched floor mirror in a thin brass frame leant on the wall,
   * a round rug before it, a ring light on its stand at the side, a hook with the day's tote on the
   * frame, a stool with sunglasses and a cap, "#오늘의착장" on a sticky note in the corner. The day's
   * outfit shot in it (siOotdShoot, siMirror): the phone in front of the face, a hand on the hip; the
   * phone up over the face; low for the shoes; then checked in both hands. The flash in the glass.
   */
  siOotdMirror(g, _W, D, _c, _def, _ctx, out) {
    const use = inUse(g, out);
    const mz = -D / 2 + 0.1;
    const mw = 0.6;
    const mh = 1.78;
    const tilt = -0.08;
    const glassG = group(g, 0, 0.04, mz, 0, tilt);
    // The arch: a rectangle and a half disc, the frame round both.
    const archTex = painted('siMirrorFace', 128, 256, paintMirror);
    const faceMat = new THREE.MeshBasicMaterial({ map: archTex });
    const archShape = shape('siArch', () => {
      const s = new THREE.Shape();
      const r = mw / 2;
      s.moveTo(-r, 0);
      s.lineTo(-r, mh - r);
      s.absarc(0, mh - r, r, Math.PI, 0, true);
      s.lineTo(r, 0);
      s.lineTo(-r, 0);
      const geo = new THREE.ShapeGeometry(s, 24);
      // UVs across the arch's box.
      const pos = geo.attributes.position;
      const uv = new Float32Array(pos.count * 2);
      for (let i = 0; i < pos.count; i++) {
        uv[i * 2] = (pos.getX(i) + r) / mw;
        uv[i * 2 + 1] = pos.getY(i) / mh;
      }
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      return geo;
    });
    const face = new THREE.Mesh(archShape, faceMat);
    face.userData.ownMaterial = true;
    face.position.z = 0.016;
    glassG.add(face);
    const back = new THREE.Mesh(archShape, toon('#8a7f72'));
    back.position.z = -0.002;
    back.scale.set(1.04, 1.015, 1);
    glassG.add(back);
    const frameMat = toon(BRASS);
    const edgeL = new THREE.Mesh(box(0.025, mh - mw / 2, 0.03), frameMat);
    edgeL.position.set(-mw / 2 - 0.004, (mh - mw / 2) / 2, 0.008);
    const edgeR = edgeL.clone();
    edgeR.position.x = mw / 2 + 0.004;
    const crown = new THREE.Mesh(ring(mw / 2 + 0.004, 0.014, Math.PI), frameMat);
    crown.position.set(0, mh - mw / 2, 0.008);
    const sill = new THREE.Mesh(box(mw + 0.04, 0.035, 0.035), frameMat);
    sill.position.set(0, 0.012, 0.008);
    glassG.add(edgeL, edgeR, crown, sill);
    // The note in the corner, and the flash in the glass (at the phone).
    picture(glassG, painted('siNote', 64, 64, (c) => {
      c.fillStyle = '#fff59d';
      c.fillRect(0, 0, 64, 64);
      text(c, '#오늘의', 32, 22, 12, '#5d4037', 'center');
      text(c, '착장', 32, 42, 13, '#5d4037', 'center');
    }), 0.08, 0.08, mw / 2 - 0.07, 1.0, 0.018, '#ffffff', 0, 0);
    const flash = new THREE.Mesh(ball(0.05), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, depthWrite: false }));
    flash.userData.ownMaterial = true;
    flash.scale.set(1.6, 1.6, 0.2);
    glassG.add(flash);
    // The hook and the tote on the frame's side.
    part(g, cyl(0.006, 0.006, 0.05, 8), BRASS, mw / 2 + 0.03, 1.3, mz + 0.03, { rx: Math.PI / 2, outline: false });
    const tote = group(g, mw / 2 + 0.07, 1.3, mz + 0.06, -0.6);
    part(tote, ring(0.06, 0.006, Math.PI), '#e7d6c3', 0, -0.06, 0, { rx: Math.PI, outline: false });
    part(tote, rbox(0.24, 0.28, 0.05, 0.02), '#efe6da', 0, -0.26, 0);
    label(tote, 'MORE', 0.1, 0.03, 0, -0.26, 0.027, '#efe6da', '#3a3036');
    // The rug.
    part(g, cyl(0.42, 0.42, 0.01, 28), '#efe2d3', 0, 0.005, 0.3, { outline: false });
    // The ring light on its stand at the side, turned to where they stand.
    const rx = -0.38;
    const rz = mz + 0.2;
    lightStand(g, rx, rz, 1.42, 0.17);
    const toward = V(0, 1.4, 0.35);
    ringLight(aimed(g, rx, 1.5, rz, toward), aimed(use, rx, 1.5, rz, toward), 0.18);
    // The stool with sunglasses and a cap.
    const sx = 0.38;
    const sz = 0.25;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      rod(g, V(sx, 0.44, sz), V(sx + Math.sin(a) * 0.12, 0, sz + Math.cos(a) * 0.12), 0.012, OAK_D);
    }
    part(g, cyl(0.15, 0.15, 0.035, 20), OAK, sx, 0.46, sz);
    part(g, ball(0.08), '#2f3a4a', sx - 0.03, 0.48, sz, { outline: false }).scale.set(1, 0.6, 1);
    part(g, rbox(0.08, 0.008, 0.06, 0.004), '#2f3a4a', sx - 0.03, 0.483, sz + 0.09, { outline: false });
    for (const ex of [-1, 1]) part(g, cyl(0.022, 0.022, 0.008, 14), '#1e1e22', sx + 0.06 + ex * 0.028, 0.485, sz - 0.04, { outline: false });
    // Where they stand, the phone in the hand.
    const mark = marker(g, 0, 1.2, mz);
    const ootd = standAt(g, 0, 0.36, Math.PI, 'siMirror', mark);
    const hold = holder(use);
    const ph1 = phone(hold, painted('siOotdPhone', 66, 142, paintOotdPhone), '#e7d6c3');
    out.work = mark;
    out.animate = (t) => {
      if (Math.abs(t - posedAt(ootd)) > 0.6) {
        flash.visible = false;
        return;
      }
      const a = mirrorAt(t, siPhase(mark.getWorldPosition(tmp)));
      ootd.at.rotation.y = Math.PI + a.twist;
      follow(hold, ootd);
      const k = kOf(ootd);
      put(ph1, a.phone, k);
      // The screen to their eyes: its camera to the mirror, or tipped up to look at.
      ph1.rotation.set(a.checking ? 0.8 : 0, Math.PI, 0);
      // The flash where the phone is, in the glass.
      ph1.getWorldPosition(tmp);
      glassG.worldToLocal(tmp);
      flash.position.set(THREE.MathUtils.clamp(tmp.x, -mw / 2 + 0.06, mw / 2 - 0.06), tmp.y, 0.02);
      (flash.material as THREE.MeshBasicMaterial).opacity = a.flash * 0.9;
      flash.visible = a.flash > 0.02;
    };
    out.spots = { '*': ootd };
  },

  /**
   * The garment steamer (스팀다리미): a lilac water tank on castors with its dial and READY light, the
   * pole up to a hanger bar, the next look on its hanger (creased), the hose to the wand clipped on the
   * pole. Steamed (siSteamOutfit, siSteam): the wand drawn down the garment stroke by stroke through
   * the steam, the hem held out with the other hand, each column's creases going as it passes; three
   * strokes and the next look's on the hanger.
   */
  siSteamer(g, _W, _D, _c, _def, _ctx, out) {
    const use = inUse(g, out);
    const LILAC = '#d8c8ef';
    const tz = -0.2;
    // The tank on castors.
    part(g, rbox(0.34, 0.32, 0.26, 0.06), LILAC, 0, 0.22, tz);
    part(g, rbox(0.3, 0.06, 0.22, 0.03), '#f7f1fb', 0, 0.4, tz);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, ball(0.025), '#4a4852', sx * 0.13, 0.025, tz + sz * 0.09, { outline: false });
    part(g, rbox(0.3, 0.03, 0.22, 0.02), '#b9a6dc', 0, 0.06, tz);
    part(g, rbox(0.04, 0.14, 0.006, 0.01), '#e6f4ff', -0.1, 0.24, tz + 0.132, { material: GLASS });
    part(g, cyl(0.035, 0.035, 0.02, 18), '#f7f1fb', 0.05, 0.27, tz + 0.13, { rx: Math.PI / 2 });
    part(g, box(0.006, 0.025, 0.004), '#5b4a6e', 0.05, 0.28, tz + 0.142, { outline: false });
    const ready = part(use, ball(0.01), '#4caf50', 0.12, 0.3, tz + 0.132, { outline: false, material: glow('#7dff8a') });
    label(g, 'STEAM', 0.1, 0.025, 0.05, 0.2, tz + 0.132, LILAC, '#5b4a6e');
    // The pole and the hanger bar.
    const poleX = 0.0;
    const poleZ = tz - 0.04;
    part(g, cyl(0.013, 0.013, 1.3, 10), CHROME, poleX, 1.05, poleZ, { outline: false });
    part(g, cyl(0.013, 0.013, 0.05, 10), '#5b4a6e', poleX, 1.62, poleZ);
    // The garment hangs over the tile's middle, on an arm out in front of the pole.
    const gz = 0.04;
    rod(g, V(poleX, 1.69, poleZ), V(poleX, 1.69, gz - 0.02), 0.009, CHROME);
    part(g, ball(0.014), '#5b4a6e', poleX, 1.69, gz - 0.02, { outline: false });
    const look = group(g, 0, 0, gz);
    part(look, ring(0.025, 0.004, Math.PI * 1.4), CHROME, 0, 1.66, -0.02, { ry: Math.PI / 2, outline: false });
    rod(look, V(0, 1.64, -0.02), V(0, 1.61, 0), 0.004, CHROME);
    part(look, cyl(0.008, 0.008, 0.4, 8), '#8d6e63', 0, 1.6, 0, { rz: Math.PI / 2, outline: false });
    const LOOK_COLS = ['#f2c9cf', '#e7d6c3', '#b7c4a8', '#c9d7f0'];
    const shoulders = part(look, rbox(0.38, 0.12, 0.06, 0.03), LOOK_COLS[0], 0, 1.53, 0);
    const skirt = new THREE.Mesh(shape('siSteamSkirt', () => new THREE.CylinderGeometry(0.16, 0.22, 0.58, 18)), toon(LOOK_COLS[0]));
    skirt.scale.set(1, 1, 0.3);
    skirt.position.set(0, 1.18, 0);
    skirt.castShadow = true;
    look.add(skirt);
    const sleeves = [-1, 1].map((sx) => part(look, rbox(0.07, 0.3, 0.05, 0.025), LOOK_COLS[0], sx * 0.2, 1.38, 0, { rz: sx * 0.12 }));
    // The creases in three columns (as the stylist has them: their left is -x here).
    const COLS = [-0.08, 0.02, 0.11];
    const creases = COLS.map((side) =>
      [0, 1, 2, 3].map((j) => {
        const y = 1.42 - j * 0.13;
        return part(look, box(0.05, 0.004, 0.003), shade(LOOK_COLS[0], 0.75), -side + 0.01 * (j % 2), y, 0.07 + j * 0.006, { rz: 0.4 * (j % 2 ? 1 : -1), outline: false });
      }),
    );
    // The wand: clipped on the pole when nobody's steaming, in the right hand when they are.
    const wand = (parent: THREE.Object3D) => {
      const w = group(parent);
      part(w, rbox(0.11, 0.08, 0.03, 0.012), '#f7f1fb', 0, 0, 0.0);
      part(w, box(0.09, 0.06, 0.004), '#b9a6dc', 0, 0, 0.017, { outline: false });
      part(w, cyl(0.016, 0.014, 0.16, 12), LILAC, 0, -0.1, -0.03, { rx: -0.4 });
      return w;
    };
    const idleWand = group(g);
    out.idle = idleWand;
    const parked = wand(idleWand);
    parked.position.set(poleX + 0.05, 1.0, poleZ + 0.03);
    rod(idleWand, V(0, 0.42, tz - 0.06), V(poleX + 0.05, 0.86, poleZ + 0.02), 0.012, '#7e6ea0');
    const hold = holder(use);
    const head = wand(hold);
    const hoseA = stretchy(use, 0.012, '#7e6ea0');
    const hoseB = stretchy(use, 0.012, '#7e6ea0');
    const puffs = [0, 1, 2, 3, 4].map(() => {
      const m = new THREE.Mesh(ball(0.04), STEAM_MAT);
      use.add(m);
      return m;
    });
    const mark = marker(g, 0, 1.2, gz);
    const steam = standAt(g, 0, gz + STEAM.ahead, Math.PI, 'siSteam', mark);
    const outlet = V(0, 0.42, tz + 0.06);
    let lastLook = -1;
    const wPos = new THREE.Vector3();
    out.work = mark;
    out.animate = (t) => {
      const using = Math.abs(t - posedAt(steam)) < 0.6;
      if (!using) {
        creases.forEach((col) => col.forEach((m) => (m.visible = true)));
        return;
      }
      const a = steamAt(t, siPhase(mark.getWorldPosition(tmp)));
      ready.visible = true;
      follow(hold, steam);
      hold.updateWorldMatrix(true, false);
      const k = kOf(steam);
      put(head, a.head, k);
      // Its plate to the garment.
      head.rotation.set(0, 0, 0);
      // The next look every three strokes; this column's creases go as the wand passes them.
      const lookN = Math.floor(a.n / 3) % LOOK_COLS.length;
      if (lookN !== lastLook) {
        lastLook = lookN;
        const col = LOOK_COLS[lookN];
        shoulders.material = skirt.material = toon(col);
        sleeves.forEach((m) => (m.material = toon(col)));
        creases.forEach((cs) => cs.forEach((m) => (m.material = toon(shade(col, 0.75)))));
      }
      const colNow = a.n % 3;
      head.getWorldPosition(wPos);
      look.worldToLocal(tmp.copy(wPos));
      creases.forEach((cs, ci) => cs.forEach((m) => (m.visible = ci > colNow || (ci === colNow && m.position.y < tmp.y - 0.03))));
      // The hose from the tank, sagging, to the wand's handle.
      hold.localToWorld(tmp.set(a.head.side * k, a.head.up * k - 0.12, a.head.ahead * k - 0.05));
      g.worldToLocal(tmp);
      const mid = V((outlet.x + tmp.x) / 2 + 0.1, Math.min(outlet.y, tmp.y) - 0.15, (outlet.z + tmp.z) / 2 + 0.1);
      stretch(hoseA, outlet, mid);
      stretch(hoseB, mid, tmp);
      // Steam off the plate, drifting up.
      g.worldToLocal(wPos);
      puffs.forEach((m, i) => {
        const u = (t * 0.9 + i / puffs.length) % 1;
        m.visible = a.puff;
        m.position.set(wPos.x + 0.04 * Math.sin(i * 2.3 + t), wPos.y + u * 0.3, wPos.z + 0.04 - u * 0.06);
        m.scale.setScalar(0.4 + u * 1.2);
      });
    };
    out.spots = { '*': steam };
  },

  /**
   * The shoe and bag wall (신발·가방 진열장, 2 × 1): an oak wall unit with a white back, its shelves
   * lit along their fronts — boots and sneakers at the bottom, heels and loafers, bags, then bags and
   * hats along the top — a tray of sunglasses, "SHOES & BAGS" over it. Matched to a look
   * (siMatchAccessories, siPick): a bag lifted down from the top, a bag from the middle, crouched for
   * a sneaker, a heel; each held up, turned and looked over, then put back.
   */
  siShoeWall(g, W, D, _c, _def, _ctx, out) {
    const use = inUse(g, out);
    const w = Math.min(W - 0.1, 1.9);
    const backZ = -D / 2 + 0.04;
    const depth = 0.38;
    const fz = backZ + depth;
    const top = 2.0;
    part(g, box(w, top, 0.02), IVORY, 0, top / 2, backZ);
    for (const sx of [-1, 1]) part(g, rbox(0.04, top, depth, 0.01), OAK, sx * (w / 2 - 0.02), top / 2, backZ + depth / 2);
    const SHELVES = [0.06, 0.22, 0.7, 1.02, 1.48, 1.96];
    SHELVES.forEach((y, i) => {
      part(g, rbox(w, 0.03, depth, 0.008), OAK, 0, y, backZ + depth / 2);
      if (i > 0 && i < SHELVES.length - 1) {
        part(g, box(w - 0.1, 0.008, 0.008), '#fff3dc', 0, y - 0.02, fz - 0.02, { outline: false });
        part(use, box(w - 0.1, 0.009, 0.009), '#fff3dc', 0, y - 0.02, fz - 0.019, { outline: false, material: glow('#fff6e0') });
      }
    });
    label(g, 'SHOES  &  BAGS', 0.5, 0.06, 0, top + 0.08, backZ + 0.03, IVORY, INK);
    // Pieces on the shelves (a dweller's left is -x here, facing the wall).
    const shoe = (parent: THREE.Object3D, k: string, heel: boolean) => {
      const s = group(parent);
      if (heel) {
        part(s, rbox(0.07, 0.025, 0.2, 0.012), k, 0, 0.06, 0.0, { rx: -0.3 });
        part(s, cyl(0.006, 0.004, 0.08, 8), k, 0, 0.04, -0.08);
        part(s, rbox(0.072, 0.05, 0.07, 0.02), k, 0, 0.028, 0.08);
      } else {
        part(s, rbox(0.085, 0.07, 0.22, 0.03), k, 0, 0.035, 0);
        part(s, rbox(0.09, 0.02, 0.23, 0.008), '#fafafa', 0, 0.008, 0, { outline: false });
      }
      return s;
    };
    const bagOf = (parent: THREE.Object3D, k: string, size = 1) => {
      const b = group(parent);
      part(b, rbox(0.24 * size, 0.18 * size, 0.1 * size, 0.03), k, 0, 0.09 * size, 0);
      part(b, ring(0.06 * size, 0.007, Math.PI), shade(k, 0.8), 0, 0.18 * size, 0, { outline: false });
      part(b, rbox(0.035, 0.02, 0.01, 0.004), BRASS, 0, 0.13 * size, 0.051 * size, { outline: false });
      return b;
    };
    const iz = backZ + depth / 2 + 0.04;
    // Bottom: boots and sneakers.
    [[-0.75, '#4e342e', 'boot'], [-0.5, '#fafafa', 'sneak'], [0.3, '#2f3a4a', 'sneak'], [0.55, '#8d6e63', 'boot'], [0.78, '#e7d6c3', 'sneak']].forEach(([x, k, kind]) => {
      for (const d of [-1, 1]) {
        const s = shoe(g, k as string, false);
        s.position.set((x as number) + d * 0.05, 0.235, iz);
        if (kind === 'boot') part(s, rbox(0.08, 0.2, 0.1, 0.03), k as string, 0, 0.14, -0.05);
      }
    });
    // Heels and loafers.
    [[-0.7, '#212121', true], [-0.4, '#c19a6b', false], [0.25, '#7b2d3b', true], [0.52, '#f2c9cf', true], [0.78, '#3e3a39', false]].forEach(([x, k, heel]) => {
      for (const d of [-1, 1]) shoe(g, k as string, heel as boolean).position.set((x as number) + d * 0.045, 0.715, iz);
    });
    // Bags, and along the top bags and hats.
    [[-0.68, '#c19a6b', 1], [-0.38, '#2b2b30', 0.8], [0.5, '#e7d6c3', 1.0], [0.77, '#b7c4a8', 0.7]].forEach(([x, k, s]) => bagOf(g, k as string, s as number).position.set(x as number, 1.035, iz));
    [[-0.75, '#7b2d3b', 1.1], [0.15, '#efe6da', 1.0], [0.48, '#3e3a39', 0.85]].forEach(([x, k, s]) => bagOf(g, k as string, s as number).position.set(x as number, 1.495, iz));
    for (const hx of [0.8]) {
      part(g, cyl(0.15, 0.15, 0.01, 20), '#d8c3a0', hx, 1.51, iz);
      part(g, cyl(0.08, 0.09, 0.08, 20), '#d8c3a0', hx, 1.55, iz);
      part(g, cyl(0.081, 0.081, 0.015, 20), '#3e2723', hx, 1.53, iz, { outline: false });
    }
    // The sunglasses tray on the heels' shelf's end.
    part(g, rbox(0.22, 0.02, 0.14, 0.01), '#efe6da', -0.15, 0.725, iz);
    for (let i = 0; i < 3; i++) for (const ex of [-1, 1]) part(g, cyl(0.02, 0.02, 0.006, 14), ['#1e1e22', '#6d4c41', '#c9a45c'][i], -0.22 + i * 0.07 + ex * 0.022, 0.74, iz - 0.02, { rx: 0.2, outline: false });
    // The four looked at: where each sits on its shelf (by the stylist's own reckoning), drawn there.
    const sz = fz + 0.3;
    const mark = marker(g, 0, 1.0, backZ + depth / 2);
    const pick = standAt(g, 0, sz, Math.PI, 'siPick', mark);
    /** Body offset (they face -z: their left is -x) to the wall's frame. */
    const onWall = (o: BarOffset, v: THREE.Vector3) => v.set(-o.side, o.up, sz - o.ahead);
    const picked = [
      bagOf(g, '#f2c9cf', 0.9),
      bagOf(g, '#5a3a40', 1),
      shoe(g, '#fafafa', false),
      shoe(g, '#212121', true),
    ];
    // Each sits on its shelf (its bottom on the board under the hand's height).
    const rest = PICKS.map((o, i) => onWall(o, new THREE.Vector3()).setY([1.495, 1.035, 0.235, 0.715][i]).setZ(iz));
    picked.forEach((m, i) => m.position.copy(rest[i]));
    const hold = holder(g);
    const inHand = new THREE.Vector3();
    out.work = mark;
    out.animate = (t) => {
      const using = Math.abs(t - posedAt(pick)) < 0.6;
      picked.forEach((m, i) => {
        m.position.copy(rest[i]);
        m.rotation.set(0, 0, 0);
      });
      if (!using) return;
      const a = pickAt(t, siPhase(mark.getWorldPosition(tmp)));
      follow(hold, pick);
      hold.updateWorldMatrix(true, false);
      const k = kOf(pick);
      const m = picked[a.i];
      if (!a.holding) return;
      // From the shelf to the hand (scaled for them) and back, its bottom under the hand.
      hold.localToWorld(inHand.set(a.item.side * k, a.item.up * k - (a.i < 2 ? 0.2 : 0.06), a.item.ahead * k));
      g.worldToLocal(inHand);
      m.position.lerpVectors(rest[a.i], inHand, a.out);
      m.rotation.y = a.spin;
    };
    out.spots = { '*': pick };
  },

  /**
   * The 협찬 table (협찬 언박싱 테이블, 2 × 1): white on blush legs with a linen runner; the day's box
   * from 소일 (kraft, a blush ribbon, its lid), the unopened ones stacked at the right (메종 루아's
   * black and gold, 오네's orange shoebox, 루프's paper shopper), tissue sheets, a box cutter and the
   * brand's thank-you card, the #광고 sign; the phone on its stand in a ring light at the back,
   * aimed across. Opened to the camera (siUnboxPr, siUnbox): the lid off and set aside, the tissue
   * parted, the knit lifted out and held up against the body, held out to the lens, folded back in
   * and the lid on again.
   */
  siUnboxTable(g, W, D, _c, _def, _ctx, out) {
    const use = inUse(g, out);
    const w = Math.min(W - 0.2, 1.6);
    const d = 0.62;
    const h = 0.76;
    const z = 0.02;
    const front = z + d / 2;
    const ty = h + 0.02;
    part(g, rbox(w, 0.04, d, 0.015), IVORY, 0, h, z);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) part(g, cyl(0.024, 0.016, h - 0.02, 12), BLUSH_D, sx * (w / 2 - 0.08), (h - 0.02) / 2, z + sz * (d / 2 - 0.08));
    part(g, box(0.6, 0.004, d + 0.01), '#efe2d3', 0, h + 0.022, z, { outline: false });
    part(g, box(0.6, 0.2, 0.004), '#efe2d3', 0, h - 0.08, front + 0.006, { outline: false });
    label(g, STUDIO, 0.34, 0.05, 0, h - 0.08, front + 0.009, '#efe2d3', '#8a7d6e');
    // The day's box (its lid drawn on it when nobody's at it; in use it comes off).
    const bx = 0;
    const bz = z + 0.08;
    const boxH = 0.12;
    part(g, rbox(0.36, boxH, 0.26, 0.008), '#c9a77c', bx, ty + boxH / 2, bz);
    part(g, box(0.34, 0.004, 0.24), '#f7f1e8', bx, ty + boxH - 0.004, bz, { outline: false });
    const lidH = 0.03;
    const makeLid = (parent: THREE.Object3D) => {
      const l = group(parent);
      part(l, rbox(0.37, lidH, 0.27, 0.008), '#d4b48a', 0, 0, 0);
      part(l, box(0.372, lidH + 0.002, 0.03), BLUSH, 0, 0, 0, { outline: false });
      part(l, box(0.03, lidH + 0.002, 0.272), BLUSH, 0, 0, 0, { outline: false });
      for (const sx of [-1, 1]) part(l, ball(0.03), BLUSH, sx * 0.03, lidH / 2 + 0.01, 0, { outline: false }).scale.set(1.2, 0.5, 0.8);
      label(l, 'SOIL 소일', 0.11, 0.028, 0.1, lidH / 2 + 0.002, 0.08, '#d4b48a', '#4e342e').rotation.x = -Math.PI / 2;
      return l;
    };
    const idleLid = group(g);
    out.idle = idleLid;
    makeLid(idleLid).position.set(bx, ty + boxH + lidH / 2, bz);
    const lid = makeLid(use);
    const tissue = group(use);
    for (let i = 0; i < 6; i++) part(tissue, ball(0.055), i % 2 ? '#ffffff' : '#fde7ea', bx - 0.1 + (i % 3) * 0.1, ty + boxH - 0.01, bz - 0.05 + Math.floor(i / 3) * 0.1, { outline: false }).scale.set(1, 0.3, 0.9);
    // The knit: its body, sleeves and ribbed hem, a 소일 tag; it unfolds as it's lifted.
    const knit = group(use);
    const KNIT = '#a1887f';
    const bodyK = part(knit, rbox(0.36, 0.42, 0.035, 0.03), KNIT, 0, -0.21, 0);
    for (let i = 0; i < 7; i++) part(knit, box(0.004, 0.36, 0.038), shade(KNIT, 0.88), -0.15 + i * 0.05, -0.2, 0, { outline: false });
    part(knit, rbox(0.37, 0.05, 0.04, 0.015), shade(KNIT, 0.9), 0, -0.41, 0);
    part(knit, ring(0.06, 0.012, Math.PI), shade(KNIT, 0.9), 0, 0, 0.0, { rx: Math.PI, outline: false });
    const sleevesK = [-1, 1].map((sx) => {
      const s = group(knit, sx * 0.18, -0.03, 0);
      part(s, rbox(0.09, 0.42, 0.035, 0.03), KNIT, 0, -0.2, 0);
      return s;
    });
    label(knit, 'SOIL', 0.04, 0.016, 0, -0.06, 0.02, '#f7f1e8', '#4e342e');
    void bodyK;
    // The stack of unopened boxes at the right, the paper shopper.
    part(g, rbox(0.3, 0.1, 0.22, 0.008), '#2b2224', 0.56, ty + 0.05, z - 0.1);
    part(g, box(0.302, 0.015, 0.222), BRASS, 0.56, ty + 0.09, z - 0.1, { outline: false });
    label(g, 'MAISON LUA', 0.2, 0.03, 0.56, ty + 0.05, z + 0.012, '#2b2224', '#e8cf95');
    part(g, rbox(0.32, 0.12, 0.2, 0.006), '#f0782f', 0.56, ty + 0.16, z - 0.1, { ry: 0.08 });
    label(g, 'OHNE 오네', 0.16, 0.03, 0.56, ty + 0.16, z + 0.003, '#f0782f', '#ffffff');
    const shopper = group(g, 0.62, ty, z + 0.17, -0.25);
    part(shopper, rbox(0.2, 0.24, 0.09, 0.006), '#efe6da', 0, 0.12, 0);
    part(shopper, ring(0.04, 0.004, Math.PI), INK, -0.05, 0.24, 0, { outline: false });
    part(shopper, ring(0.04, 0.004, Math.PI), INK, 0.05, 0.24, 0, { outline: false });
    label(shopper, 'LOOP', 0.1, 0.035, 0, 0.13, 0.047, '#efe6da', INK);
    // Left: the tissue sheets, the cutter, the thank-you card, the #광고 sign.
    part(g, box(0.26, 0.006, 0.2), '#fde7ea', -0.58, ty + 0.003, z + 0.02, { ry: 0.2, outline: false });
    part(g, box(0.25, 0.006, 0.19), '#ffffff', -0.56, ty + 0.009, z + 0.04, { ry: -0.1, outline: false });
    part(g, rbox(0.12, 0.016, 0.025, 0.006), '#ffca28', -0.46, ty + 0.02, front - 0.08, { ry: 0.5 });
    const card = group(g, -0.63, ty + 0.012, front - 0.1, 0.3);
    part(card, box(0.12, 0.003, 0.085), '#ffffff', 0, 0, 0, { outline: false });
    label(card, '협찬 감사합니다', 0.1, 0.018, 0, 0.003, -0.01, '#ffffff', '#7a5560').rotation.x = -Math.PI / 2;
    const sign = group(g, -0.42, ty, z - 0.18, 0.2);
    part(sign, rbox(0.16, 0.09, 0.008, 0.004), '#ffffff', 0, 0.05, 0, { rx: -0.2 });
    label(sign, '#광고 #협찬', 0.14, 0.035, 0, 0.05, 0.006, '#ffffff', '#c2185b');
    // The phone on its stand in a ring light, aimed across the table.
    const cz = -D / 2 + 0.1;
    const cy = 1.32;
    lightStand(g, 0, cz, cy - 0.08, 0.16);
    ringLight(group(g, 0, cy, cz - 0.02), group(use, 0, cy, cz - 0.02), 0.17);
    const cam = group(g, 0, cy, cz, Math.PI);
    part(cam, rbox(0.03, 0.17, 0.014, 0.005), BLACK, 0, 0, 0.012);
    phone(cam, null, '#e7d6c3');
    part(use, ball(0.008), '#ff3b5c', 0.03, cy + 0.07, cz + 0.01, { outline: false, material: glow('#ff3b5c') });
    // Where it's done from, and the box's top (the clock's mark, the hands' frame).
    const p = V(bx, ty + boxH, bz);
    const mark = marker(g, p.x, p.y, p.z);
    const unbox = standAt(g, 0, front + 0.3, Math.PI, 'siUnbox', mark);
    /** From the opener's frame (they face -z: their left is -x) to the table's. */
    const onTable = (o: BarOffset, v: THREE.Vector3) => v.set(p.x - o.side, p.y + o.up, p.z - o.ahead);
    out.work = mark;
    out.animate = (t) => {
      const a = unboxAt(t, siPhase(mark.getWorldPosition(tmp)));
      onTable(a.lid, lid.position).y += lidH / 2;
      lid.rotation.z = THREE.MathUtils.clamp(a.lid.side * 0.4, -0.25, 0.25);
      tissue.visible = !a.lidOn;
      tissue.scale.set(1 + 0.3 * Math.min(1, Math.max(0, (a.u - 0.19) / 0.1)), 1, 1);
      knit.visible = a.held;
      onTable(a.knit, knit.position);
      // Folded small in the box, hanging full when held up.
      knit.scale.set(0.45 + 0.55 * a.open, 0.3 + 0.7 * a.open, 1);
      knit.rotation.set(-0.15 * (1 - a.open), 0, 0);
      sleevesK.forEach((s, i) => (s.rotation.z = (i ? 1 : -1) * (0.15 - 0.6 * (1 - a.open))));
    };
    out.spots = { '*': unbox };
  },
  // The street front, the studio's big window, and the unit next door (2026-11-05, the layout audit; shopFront.ts).
  siShopFront(g) {
    shopFront(g, { ax: 1, x0: 2, x1: 17, door: 12, name: 'STUDIO SERA', sub: '스타일 · 룩북 · 콘텐츠', bg: '#fafafa', fg: '#880e4f', frame: '#212121', posters: [['협찬 문의는 DM', '#fce4ec', '#880e4f', 13.5]], solid: [[15, 16]] });
  },
  siNeighbor(g, W, D) {
    neighbourShop(g, W, D, { name: '오래된 옷장', color: '#795548', wall: '#e6dfd6' });
  },
};
