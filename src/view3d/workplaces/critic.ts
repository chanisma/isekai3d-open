import * as THREE from 'three';
import type { BarOffset, Motion } from '../activity';
import { marker, rod, spot, type Builder, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, glass, glowing, label, litScreen, painted, picture, ring, seeded, text, type Paint } from './doctor';
import { BOARD, COURSE, DECANT, LOUPE, PROOF, WINE, appraiseRound, bo, boAdd, courseRound, critPhase, decantRound, loupeRound, pinRound, proofRound, slideAt, spreadAt, wineRound } from './criticMotion';

/**
 * The magazine's editorial office drawn as itself (2026-10-27 workplace pipeline, at the user's
 * request: a critic's 잡지사 should read as one, and tasting, appraising and editing should look like
 * it). The editors' desks with the review on the screen, the page proofs marked up in red pen and
 * turned onto the done pile at the deadline; the tasting table laid in white with the course under
 * its cloche, cut, tasted and written up while the chef waits behind it, or three numbered plates
 * scored blind; the wine cellar with its tasting ledge, the glass held up against the white card,
 * swirled, nosed and sipped; the plinths with a bronze and a marble on them, walked round with a
 * notebook, the chin in the hand; and what the office was missing (workFurniture/critic.ts): the
 * wall of past covers, the layout board the next issue's spreads are pinned up on, the light table
 * where the shoot's slides are chosen under a loupe, the decanting trolley, this month's magazine rack
 * and the interview corner (two armchairs across a low table with the recorder: the guest in one,
 * the critic in the other, the red REC light on). The hands and the props keep one clock
 * (criticMotion.ts).
 */

const WALNUT = '#6d4c41';
const WALNUT_DARK = '#4e342e';
const OAK = '#c9a273';
const PAPER = '#fbf8f1';
const BRASS = '#c9a34a';
const BRONZE = '#9c6b3a';
const MARBLE = '#eeeae2';
const LEATHER = '#9b5a34';
const WINE_RED = '#5e0b1f';
const SKIN = '#f3cfb3';
const PEN_RED = '#d32f2f';
const COVER_COLORS = ['#8e2b2b', '#1f3b4d', '#2f6b3f', '#c9a227', '#5b3a6e', '#d35400', '#283593', '#7b4b2a'];

const tmp = new THREE.Vector3();
const Z = new THREE.Vector3(0, 0, 1);
const UP = new THREE.Vector3(0, 1, 0);
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
/** Whether a spot's had a dweller posed at it just now (activity.ts spotPose marks it). */
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
/** Of named spots, the one most lately sat or stood at (within a moment), else null. */
function nowAt(spots: Record<string, Spot>, t: number): string | null {
  let best: string | null = null;
  for (const [k, s] of Object.entries(spots)) if (Math.abs(t - posedAt(s)) < 0.6 && (best === null || posedAt(s) > posedAt(spots[best]))) best = k;
  return best;
}
/** How tall whoever's at a spot is (spotPose marks it). */
const heightAt = (s: Spot) => (s.at.userData.height as number | undefined) ?? 1.6;
/** A piece's clock offset: from its work mark in the world, as criticMotion's rounds take it. */
const phaseOf = (m: THREE.Object3D) => critPhase(m.getWorldPosition(tmp));
/** A spot with what the hands do there. */
function at(s: Spot, work: THREE.Object3D | undefined, motion?: Motion): Spot {
  s.work = work;
  s.motion = motion;
  return s;
}
/** Points `o` (its +z) from `from` towards `to`, in its parent's frame. */
function aim(o: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3) {
  o.position.copy(from);
  const d = to.clone().sub(from);
  if (d.lengthSq() > 1e-8) o.quaternion.setFromUnitVectors(Z, d.normalize());
}
/** Where an offset in the critic's frame (from `W`, facing `yaw`) is, in the piece's frame. */
function framer(W: THREE.Vector3, yaw: number) {
  const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const left = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  return (o: BarOffset, v = new THREE.Vector3()) => v.copy(W).addScaledVector(left, o.side).addScaledVector(UP, o.up).addScaledVector(fwd, o.ahead);
}
let pedestalCount = 0;
let deskCount = 0;

// ---------------------------------------------------------------------------------------------
// What's painted: the review on the screen, the proofs, the covers, the spreads, the cards.

const MASTHEAD = '맛과 멋';
const COVER_LINES = [
  ['올해의 셰프 10인', '겨울 화덕 요리'],
  ['조각가 이수진', '흐름을 빚다'],
  ['보르도 2019', '빈티지 총정리'],
  ['청자의 푸른빛', '고려에서 지금까지'],
  ['서울 노포 50곳', '맛의 지도'],
  ['봄 디저트 특집', '딸기의 계절'],
  ['신진 작가 6인', '올해의 전시'],
  ['전통주 리뷰', '막걸리부터 증류주까지'],
];
/** A cover of our magazine (`i` picks the issue): the masthead, the picture, the cover lines. */
function coverPaint(i: number): Paint {
  return (c) => {
    const bg = COVER_COLORS[i % COVER_COLORS.length];
    c.fillStyle = bg;
    c.fillRect(0, 0, 192, 256);
    // The picture: a plate, a sculpture, a glass, a vase, by the issue.
    const k = i % 4;
    c.save();
    c.translate(96, 150);
    if (k === 0) {
      c.fillStyle = '#fafafa';
      c.beginPath();
      c.ellipse(0, 10, 66, 36, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#c0613a';
      c.beginPath();
      c.ellipse(-6, 6, 30, 14, -0.2, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#6aa84f';
      for (let j = 0; j < 6; j++) c.fillRect(8 + j * 5, -4 - (j % 2) * 4, 3, 8);
    } else if (k === 1) {
      c.strokeStyle = '#d7a46a';
      c.lineWidth = 12;
      c.beginPath();
      c.moveTo(-30, 50);
      c.bezierCurveTo(-60, -10, 40, -20, 10, -60);
      c.bezierCurveTo(-10, -80, 50, -60, 30, -20);
      c.stroke();
      c.fillStyle = '#3e2723';
      c.fillRect(-36, 52, 72, 12);
    } else if (k === 2) {
      c.fillStyle = 'rgba(255,255,255,0.75)';
      c.beginPath();
      c.ellipse(0, -30, 34, 40, 0, 0, Math.PI);
      c.fill();
      c.fillStyle = '#7b0d26';
      c.beginPath();
      c.ellipse(0, -18, 30, 22, 0, 0, Math.PI);
      c.fill();
      c.fillStyle = 'rgba(255,255,255,0.8)';
      c.fillRect(-3, 10, 6, 44);
      c.fillRect(-24, 52, 48, 5);
    } else {
      c.fillStyle = '#9ccfb7';
      c.beginPath();
      c.moveTo(-12, -62);
      c.quadraticCurveTo(-52, -30, -30, 30);
      c.quadraticCurveTo(-22, 56, 0, 58);
      c.quadraticCurveTo(22, 56, 30, 30);
      c.quadraticCurveTo(52, -30, 12, -62);
      c.fill();
      c.strokeStyle = '#5f9c84';
      c.lineWidth = 2;
      for (let j = 0; j < 3; j++) {
        c.beginPath();
        c.arc(0, -10 + j * 18, 14, 0.3, Math.PI - 0.3);
        c.stroke();
      }
    }
    c.restore();
    text(c, MASTHEAD, 96, 38, 46, '#ffffff', 'center');
    text(c, 'TASTE & ART', 96, 70, 12, 'rgba(255,255,255,0.8)', 'center');
    text(c, `No.${180 + i} · 2026.${String(((i + 5) % 12) + 1).padStart(2, '0')}`, 12, 88, 10, 'rgba(255,255,255,0.85)');
    const [a, b] = COVER_LINES[i % COVER_LINES.length];
    text(c, a, 12, 214, 17, '#ffffff');
    text(c, b, 12, 236, 12, 'rgba(255,255,255,0.85)', 'left', false);
  };
}
const coverTex = (i: number) => painted(`crit-cover-${i % 8}`, 192, 256, coverPaint(i % 8));

/** Rival and sister magazines on the rack. */
const RACK_TITLES: Array<[string, string, string]> = [
  ['월간 식객', '#e65100', '#fff3e0'],
  ['아트 저널', '#212121', '#ffffff'],
  ['와인 리뷰', '#5e0b1f', '#f8e1e7'],
  ['리빙 앤 홈', '#33691e', '#f1f8e9'],
  ['갤러리 산책', '#37474f', '#eceff1'],
  ['푸드 트렌드', '#c62828', '#ffebee'],
];
function rackPaint(i: number): Paint {
  return (c) => {
    if (i % 3 === 0) {
      coverPaint(i)(c);
      return;
    }
    const [title, bg, fg] = RACK_TITLES[i % RACK_TITLES.length];
    c.fillStyle = fg;
    c.fillRect(0, 0, 192, 256);
    c.fillStyle = bg;
    c.fillRect(0, 0, 192, 64);
    text(c, title, 96, 34, 30, fg, 'center');
    const r = seeded(i * 97 + 5);
    c.fillStyle = ['#ffcc80', '#90caf9', '#a5d6a7', '#ce93d8', '#ffab91'][i % 5];
    c.fillRect(16, 80, 160, 110);
    c.fillStyle = bg;
    c.beginPath();
    c.arc(60 + r() * 70, 135, 26 + r() * 10, 0, Math.PI * 2);
    c.fill();
    text(c, ['이달의 맛집', '전시 가이드', '와인 50선', '가을 인테리어', '미술관 기행', '디저트 랭킹'][i % 6], 16, 214, 17, bg);
    text(c, '특집 · 인터뷰 · 리뷰', 16, 236, 12, '#555555', 'left', false);
  };
}

/** The review being written, on the editor's screen. */
const paintReview: Paint = (c) => {
  c.fillStyle = '#fbfaf7';
  c.fillRect(0, 0, 512, 320);
  c.fillStyle = '#37474f';
  c.fillRect(0, 0, 512, 30);
  text(c, '원고 편집기 — 12월호 · 레스토랑 리뷰', 12, 15, 14, '#ffffff');
  c.fillStyle = '#e53935';
  c.fillRect(420, 7, 80, 16);
  text(c, '마감 18:00', 460, 15, 11, '#ffffff', 'center');
  text(c, '한남동 「온기」, 장작불이 굽는 계절', 24, 58, 21, '#212121');
  text(c, '★★★★☆', 24, 88, 20, '#f9a825');
  text(c, '글 · 편집부   사진 · 사진부', 140, 88, 12, '#777777', 'left', false);
  const lines = ['참나무 장작 향이 먼저 닿는다. 첫 접시는 제철 방어,', '숯불에 겉만 스친 살결 위로 유자 껍질이 흩어진다.', '두 번째 코스의 화덕 감자는 소박하지만 정직하다.', '다만 디저트는 앞선 접시들의 긴장감을 잇지 못했다.', '와인 페어링은 과감하고, 서비스는 조용히 정확하다.'];
  lines.forEach((s, i) => text(c, s, 24, 124 + i * 26, 14, '#424242', 'left', false));
  c.fillStyle = '#212121';
  c.fillRect(24 + 12 * 14, 124 + 4 * 26 + 18, 2, 16);
  c.fillStyle = '#eceff1';
  c.fillRect(0, 292, 512, 28);
  text(c, '원고 2,140자 · 자동 저장됨', 12, 306, 11, '#607d8b', 'left', false);
};
/** A page proof: the running head, the headline, the photo, two columns of text. */
const paintProof: Paint = (c) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 256, 362);
  text(c, `${MASTHEAD} · 12월호`, 16, 16, 9, '#9e9e9e', 'left', false);
  text(c, '74', 240, 16, 9, '#9e9e9e', 'right', false);
  text(c, '장작불이 굽는 계절', 16, 44, 22, '#212121');
  text(c, '한남동 「온기」 리뷰', 16, 70, 12, '#757575', 'left', false);
  const grd = c.createLinearGradient(16, 86, 240, 196);
  grd.addColorStop(0, '#8d6e63');
  grd.addColorStop(1, '#3e2723');
  c.fillStyle = grd;
  c.fillRect(16, 86, 224, 110);
  c.fillStyle = '#fafafa';
  c.beginPath();
  c.ellipse(128, 146, 60, 30, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#d84315';
  c.beginPath();
  c.ellipse(122, 142, 26, 12, -0.2, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#9e9e9e';
  for (let col = 0; col < 2; col++) for (let i = 0; i < 16; i++) c.fillRect(16 + col * 116, 210 + i * 9, i % 6 === 5 ? 60 : 104, 3);
};
/** A spread of the next issue as pinned on the board (`i` picks the layout). */
function spreadPaint(i: number): Paint {
  return (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 256, 180);
    c.fillStyle = '#e0e0e0';
    c.fillRect(127, 0, 2, 180);
    const r = seeded(i * 131 + 7);
    const photo = (x: number, y: number, w: number, h: number) => {
      c.fillStyle = COVER_COLORS[Math.floor(r() * COVER_COLORS.length)];
      c.fillRect(x, y, w, h);
      c.fillStyle = 'rgba(255,255,255,0.35)';
      c.beginPath();
      c.arc(x + w * (0.3 + r() * 0.4), y + h * 0.55, Math.min(w, h) * 0.25, 0, Math.PI * 2);
      c.fill();
    };
    const lines = (x: number, y: number, w: number, n: number) => {
      c.fillStyle = '#9e9e9e';
      for (let j = 0; j < n; j++) c.fillRect(x, y + j * 6, j % 7 === 6 ? w * 0.5 : w, 2);
    };
    const k = i % 4;
    if (k === 0) {
      photo(0, 0, 128, 180);
      text(c, ['겨울 화덕', '청자 특집', '보르도 리포트', '신진 작가'][i % 4], 140, 22, 15, '#212121');
      lines(140, 40, 104, 20);
    } else if (k === 1) {
      photo(8, 8, 240, 96);
      text(c, ['인터뷰', '전시 리뷰', '셰프의 하루', '와인 노트'][i % 4], 12, 120, 14, '#212121');
      lines(12, 132, 104, 7);
      lines(140, 116, 104, 10);
    } else if (k === 2) {
      lines(10, 14, 106, 26);
      photo(138, 10, 108, 76);
      photo(138, 94, 50, 76);
      photo(196, 94, 50, 76);
    } else {
      c.fillStyle = '#f5ecd9';
      c.fillRect(0, 0, 256, 180);
      text(c, '광고', 64, 90, 18, '#bcaaa4', 'center');
      photo(140, 20, 104, 140);
    }
    text(c, String(60 + i * 2), 6, 172, 8, '#9e9e9e', 'left', false);
    text(c, String(61 + i * 2), 250, 172, 8, '#9e9e9e', 'right', false);
  };
}
const spreadTex = (i: number) => painted(`crit-spread-${i % 8}`, 256, 180, spreadPaint(i % 8));
const paintTastingCard: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 160, 220);
  text(c, 'TASTING NOTE', 80, 16, 12, WINE_RED, 'center');
  c.fillStyle = WINE_RED;
  c.fillRect(12, 28, 136, 2);
  const rows = [['와인', '샤토 ○○ 2019'], ['색', '짙은 루비, 가장자리 가넷'], ['향', '블랙커런트, 삼나무'], ['맛', '단단한 타닌, 긴 산도'], ['여운', '길다']];
  rows.forEach(([a, b], i) => {
    text(c, a, 12, 46 + i * 26, 10, '#757575');
    text(c, b, 46, 46 + i * 26, 10, '#37474f', 'left', false);
    c.fillStyle = '#e0e0e0';
    c.fillRect(12, 56 + i * 26, 136, 1);
  });
  text(c, '점수', 12, 196, 12, '#757575');
  text(c, '92 / 100', 148, 196, 18, PEN_RED, 'right');
};
const paintMenu: Paint = (c) => {
  c.fillStyle = '#fffdf7';
  c.fillRect(0, 0, 128, 200);
  text(c, '오늘의 코스', 64, 18, 13, '#4e342e', 'center');
  c.fillStyle = BRASS;
  c.fillRect(24, 30, 80, 1);
  ['아뮤즈 부쉬', '방어 숯불구이', '화덕 감자', '한우 채끝', '제철 과일', '쑥 아이스크림', '차와 다과'].forEach((s, i) => text(c, s, 64, 50 + i * 20, 10, '#5d4037', 'center', false));
};
const paintBlindSheet: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 160, 220);
  text(c, '블라인드 시식 평가표', 80, 16, 12, '#263238', 'center');
  const cols = ['맛', '향', '식감', '총점'];
  cols.forEach((s, i) => text(c, s, 52 + i * 28, 40, 9, '#757575', 'center'));
  ['A', 'B', 'C'].forEach((s, i) => {
    text(c, s, 20, 66 + i * 34, 14, '#263238', 'center');
    c.fillStyle = '#e0e0e0';
    c.fillRect(8, 82 + i * 34, 144, 1);
    const marks = [['8', '7', '9', '24'], ['6', '8', '7', '21'], ['', '', '', '']][i];
    marks.forEach((m, j) => text(c, m, 52 + j * 28, 66 + i * 34, 11, j === 3 ? PEN_RED : '#37474f', 'center'));
  });
  text(c, '심사위원 서명 ________', 12, 196, 9, '#9e9e9e', 'left', false);
};
const paintNotes: Paint = (c) => {
  c.fillStyle = '#fffef6';
  c.fillRect(0, 0, 256, 176);
  c.fillStyle = '#b3d4fc';
  for (let i = 0; i < 9; i++) c.fillRect(0, 22 + i * 17, 256, 1);
  c.fillStyle = '#e0e0e0';
  c.fillRect(127, 0, 2, 176);
  const notes = ['방어 — 껍질 바삭, 유자 ↑', '감자 — 소박, 버터 과함?', '채끝 — 굽기 완벽 ★', '디저트 — 힘 빠짐'];
  notes.forEach((s, i) => text(c, s, 8, 30 + i * 34, 11, '#283593', 'left', false));
  text(c, '총평: 불의 집중력', 136, 30, 11, '#283593', 'left', false);
  text(c, '별 4개', 136, 64, 14, PEN_RED);
};
const paintCellar: Paint = (c) => {
  c.fillStyle = '#0b1a24';
  c.fillRect(0, 0, 128, 48);
  text(c, '14°C', 40, 25, 22, '#7fdbff', 'center');
  text(c, '습도 70%', 96, 25, 11, '#7fdbff', 'center', false);
};
const paintBottleLabel: Paint = (c) => {
  c.fillStyle = '#f3ead8';
  c.fillRect(0, 0, 128, 96);
  c.strokeStyle = BRASS;
  c.lineWidth = 3;
  c.strokeRect(6, 6, 116, 84);
  text(c, 'CHÂTEAU', 64, 30, 13, '#4e342e', 'center');
  text(c, 'RÉSERVE', 64, 50, 11, '#6d4c41', 'center', false);
  text(c, '2019', 64, 72, 15, WINE_RED, 'center');
};
const EXHIBITS: Array<[string, string]> = [
  ['이수진 「흐름」', '2026 · 청동'],
  ['박서윤 「응시」', '2025 · 대리석'],
  ['작자 미상 「청자 매병」', '12세기 · 청자'],
];
function plinthLabel(i: number): Paint {
  return (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 192, 96);
    const [a, b] = EXHIBITS[i % EXHIBITS.length];
    text(c, a, 12, 32, 18, '#212121');
    text(c, b, 12, 64, 13, '#757575', 'left', false);
  };
}
/** The light table's sleeve of slides: 4 across, 3 along, each a white mount round its frame. */
const SLIDE_COLORS = ['#d84315', '#6d4c41', '#2e7d32', '#f9a825', '#ad1457', '#1565c0', '#8d6e63', '#c62828', '#00838f', '#ef6c00', '#4e342e', '#7cb342'];
const paintSlides: Paint = (c) => {
  c.clearRect(0, 0, 512, 432);
  c.fillStyle = 'rgba(230,236,240,0.35)';
  c.fillRect(0, 0, 512, 432);
  for (let k = 0; k < 12; k++) {
    const col = k % 4;
    const row = Math.floor(k / 4);
    const x = col * 128 + 10;
    const y = row * 144 + 14;
    c.fillStyle = '#fafafa';
    c.fillRect(x, y, 108, 116);
    c.fillStyle = SLIDE_COLORS[k];
    c.fillRect(x + 16, y + 22, 76, 60);
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.beginPath();
    c.ellipse(x + 54, y + 56, 24, 13, 0, 0, Math.PI * 2);
    c.fill();
    text(c, `${k + 1}`, x + 54, y + 100, 13, '#757575', 'center', false);
  }
};
const paintContact: Paint = (c) => {
  c.fillStyle = '#1b1b1b';
  c.fillRect(0, 0, 256, 192);
  for (let r = 0; r < 4; r++)
    for (let k = 0; k < 5; k++) {
      c.fillStyle = SLIDE_COLORS[(r * 5 + k) % 12];
      c.fillRect(8 + k * 49, 10 + r * 45, 42, 32);
    }
  c.strokeStyle = PEN_RED;
  c.lineWidth = 3;
  c.strokeRect(55, 53, 46, 38);
  c.strokeRect(153, 98, 46, 38);
};
const paintFlatplan: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 512, 64);
  for (let i = 0; i < 24; i++) {
    c.strokeStyle = '#90a4ae';
    c.strokeRect(6 + i * 21, 10, 18, 26);
    c.fillStyle = i % 5 === 0 ? '#ffcc80' : i % 3 === 0 ? '#b3e5fc' : '#eceff1';
    c.fillRect(7 + i * 21, 11, 16, 24);
    text(c, String(i * 4 + 1), 15 + i * 21, 48, 9, '#607d8b', 'center', false);
  }
};

// ---------------------------------------------------------------------------------------------
// Shapes: the glasses, the bottle, the decanter, the cutlery, the pens.

const lathe = new Map<string, THREE.LatheGeometry>();
function latheOf(key: string, pts: Array<[number, number]>, seg = 18): THREE.LatheGeometry {
  let g = lathe.get(key);
  if (!g) lathe.set(key, (g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg)));
  return g;
}
const GLASS_BOWL = () => latheOf('bowl', [[0.004, 0], [0.03, 0.012], [0.044, 0.04], [0.042, 0.07], [0.034, 0.095]]);
const WINE_IN = () => latheOf('wineIn', [[0.0, 0], [0.028, 0.01], [0.039, 0.032], [0.0, 0.032]]);
const DECANTER = () => latheOf('decanter', [[0.0, 0], [0.11, 0.0], [0.115, 0.03], [0.09, 0.08], [0.035, 0.14], [0.022, 0.2], [0.024, 0.27]]);
const DECANT_WINE = () => latheOf('decantWine', [[0.0, 0.0], [0.105, 0.002], [0.11, 0.03], [0.085, 0.075], [0.0, 0.075]]);
const VASE = () => latheOf('maebyeong', [[0.0, 0], [0.05, 0], [0.065, 0.06], [0.1, 0.2], [0.09, 0.27], [0.04, 0.32], [0.032, 0.34], [0.04, 0.35]], 24);
const CLEAR = new THREE.MeshToonMaterial({ color: '#e3f2fd', transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide });
const WINE_MAT = new THREE.MeshToonMaterial({ color: '#7b0d26' });

/** A wine glass whose origin is where the fingers hold the stem (WINE.stem above the foot); returns it and its wine (scaled with the level). */
function wineGlass(g: THREE.Object3D): { glassG: THREE.Group; wine: THREE.Mesh } {
  const glassG = new THREE.Group();
  g.add(glassG);
  const s = WINE.stem;
  glass(glassG, cyl(0.034, 0.036, 0.004, 18), 0, -s + 0.002, 0, CLEAR);
  glass(glassG, cyl(0.004, 0.005, s + 0.03, 8), 0, -s / 2 + 0.015, 0, CLEAR);
  const bowl = glass(glassG, GLASS_BOWL(), 0, 0.03, 0, CLEAR);
  bowl.renderOrder = 3;
  const wine = new THREE.Mesh(WINE_IN(), WINE_MAT);
  wine.position.set(0, 0.033, 0);
  glassG.add(wine);
  return { glassG, wine };
}
/** A table knife (+z along the blade from the grip at the origin). */
function knife(g: THREE.Object3D): THREE.Group {
  const k = new THREE.Group();
  g.add(k);
  part(k, rbox(0.012, 0.01, 0.09, 0.004), '#3e2723', 0, 0, -0.03);
  part(k, box(0.016, 0.002, 0.11), CHROME, 0, 0, 0.07, { outline: false });
  return k;
}
/** A fork (+z along the tines from the grip). */
function fork(g: THREE.Object3D): THREE.Group {
  const f = new THREE.Group();
  g.add(f);
  part(f, rbox(0.012, 0.01, 0.09, 0.004), '#3e2723', 0, 0, -0.03);
  part(f, box(0.008, 0.003, 0.06), CHROME, 0, 0, 0.045, { outline: false });
  part(f, box(0.022, 0.003, 0.012), CHROME, 0, 0, 0.078, { outline: false });
  for (let i = 0; i < 4; i++) part(f, box(0.003, 0.003, 0.035), CHROME, -0.0085 + i * 0.0057, 0, 0.1, { outline: false });
  return f;
}
/** A pen (+z from the tip up its barrel). */
function pen(g: THREE.Object3D, color = PEN_RED): THREE.Group {
  const p = new THREE.Group();
  g.add(p);
  part(p, cyl(0.0015, 0.005, 0.016, 8), '#eceff1', 0, 0, 0.008, { rx: -Math.PI / 2, outline: false });
  part(p, cyl(0.0055, 0.0055, 0.12, 10), color, 0, 0, 0.075, { rx: Math.PI / 2 });
  part(p, box(0.002, 0.008, 0.04), CHROME, 0, 0.006, 0.11, { outline: false });
  return p;
}
/** An open notebook flat (its middle at the origin, the writing toward +z), the pages painted. */
function notebook(g: THREE.Object3D, tex: THREE.Texture, w = 0.3, l = 0.21): THREE.Group {
  const n = new THREE.Group();
  g.add(n);
  part(n, box(w, 0.008, l), '#3e2723', 0, 0.004, 0);
  picture(n, tex, w - 0.012, l - 0.012, 0, 0.0095, 0, '#ffffff', 0, -Math.PI / 2);
  return n;
}
/** A desk chair (facing +z when `yaw` is 0), its seat's top at `y`. */
function swivel(g: THREE.Object3D, x: number, z: number, y: number, yaw: number, color = '#37474f') {
  const c = new THREE.Group();
  c.position.set(x, 0, z);
  c.rotation.y = yaw;
  g.add(c);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    rod(c, v3(0, 0.06, 0), v3(Math.sin(a) * 0.25, 0.04, Math.cos(a) * 0.25), 0.015, '#424242');
    part(c, ball(0.025), '#212121', Math.sin(a) * 0.25, 0.025, Math.cos(a) * 0.25, { outline: false });
  }
  part(c, cyl(0.025, 0.025, y - 0.1, 10), CHROME, 0, (y - 0.04) / 2, 0, { outline: false });
  part(c, rbox(0.46, 0.07, 0.44, 0.03), color, 0, y - 0.035, 0);
  part(c, rbox(0.44, 0.5, 0.06, 0.04), color, 0, y + 0.33, -0.23, { rx: -0.08 });
  for (const sx of [-1, 1]) part(c, rbox(0.04, 0.03, 0.26, 0.01), '#212121', sx * 0.25, y + 0.2, -0.02);
  return c;
}
/** A monitor on its stand facing +z, the face lit while used; returns the screen. */
function monitor(g: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, tex: THREE.Texture, ry = 0): THREE.Mesh {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  g.add(m);
  part(m, rbox(0.2, 0.012, 0.14, 0.005), BLACK, 0, 0.006, -0.02);
  part(m, box(0.035, h * 0.45, 0.025), BLACK, 0, h * 0.25, -0.03, { outline: false });
  part(m, rbox(w + 0.03, h + 0.03, 0.03, 0.01), BLACK, 0, h * 0.45 + h / 2, -0.005);
  return litScreen(m, tex, w, h, 0, h * 0.45 + h / 2, 0.012);
}
/** A stack of magazines lying (its foot at `y`), the top one's cover up. */
function magPile(g: THREE.Object3D, x: number, y: number, z: number, n: number, first: number, ry = 0) {
  const p = new THREE.Group();
  p.position.set(x, y, z);
  p.rotation.y = ry;
  g.add(p);
  const r = seeded(first * 17 + 3);
  for (let i = 0; i < n; i++) {
    const m = part(p, box(0.2, 0.008, 0.27), COVER_COLORS[(first + i) % COVER_COLORS.length], (r() - 0.5) * 0.02, 0.004 + i * 0.009, (r() - 0.5) * 0.02, { outline: false });
    m.rotation.y = (r() - 0.5) * 0.15;
  }
  picture(p, coverTex(first + n - 1), 0.19, 0.26, 0, n * 0.009 + 0.001, 0, '#ffffff', 0, -Math.PI / 2);
  return p;
}

// ---------------------------------------------------------------------------------------------
// People drawn in (the chef serving, reporters at the meeting, curators).

interface Look {
  top: string;
  bottom: string;
  hair: string;
  skin?: string;
  long?: boolean;
  chef?: boolean;
  glasses?: boolean;
}
type Arms = 'clasp' | 'papers' | 'tablet' | 'present';
/** Someone standing (facing +z, the feet at the origin) with their arms one way. */
function figure(g: THREE.Object3D, x: number, z: number, yaw: number, look: Look, arms: Arms): THREE.Group {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = yaw;
  g.add(root);
  const skin = look.skin ?? SKIN;
  for (const sx of [-1, 1]) {
    rod(root, v3(sx * 0.085, 0.8, 0), v3(sx * 0.09, 0.08, 0.01), 0.055, look.bottom);
    part(root, rbox(0.09, 0.07, 0.2, 0.03), '#2b2b30', sx * 0.09, 0.035, 0.04);
  }
  part(root, rbox(0.3, 0.18, 0.2, 0.06), look.bottom, 0, 0.86, 0);
  part(root, rbox(0.33, 0.46, 0.21, 0.08), look.top, 0, 1.12, 0);
  if (look.chef) {
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) part(root, ball(0.012), '#455a64', sx * 0.06, 1.24 - i * 0.08, 0.106, { outline: false });
    part(root, rbox(0.3, 0.42, 0.02, 0.01), '#fafafa', 0, 0.8, 0.105);
    part(root, cyl(0.06, 0.07, 0.04, 12), '#c62828', 0, 1.35, 0.01, { outline: false });
  }
  part(root, cyl(0.045, 0.05, 0.08, 10), skin, 0, 1.37, 0, { outline: false });
  const head = new THREE.Group();
  head.position.set(0, 1.5, 0);
  root.add(head);
  part(head, ball(0.115), skin, 0, 0, 0);
  part(head, ball(0.122), look.hair, 0, 0.03, -0.03);
  part(head, rbox(0.2, 0.06, 0.06, 0.02), look.hair, 0, 0.075, 0.07, { rx: -0.3 });
  if (look.long) part(head, rbox(0.22, 0.3, 0.08, 0.04), look.hair, 0, -0.1, -0.07);
  for (const sx of [-1, 1]) part(head, ball(0.012), '#2b2b30', sx * 0.04, 0.0, 0.106, { outline: false });
  if (look.glasses) {
    for (const sx of [-1, 1]) part(head, ring(0.022, 0.003), '#212121', sx * 0.042, 0.0, 0.112);
    part(head, box(0.02, 0.004, 0.004), '#212121', 0, 0.0, 0.114, { outline: false });
  }
  if (look.chef) {
    part(head, cyl(0.1, 0.095, 0.14, 16), '#ffffff', 0, 0.16, -0.01);
    part(head, ball(0.12), '#ffffff', 0, 0.26, -0.01).scale.set(1, 0.6, 1);
  }
  const arm = (sx: number, elbow: THREE.Vector3, hand: THREE.Vector3) => {
    const s = v3(sx * 0.19, 1.3, 0);
    rod(root, s, elbow, 0.042, look.top);
    rod(root, elbow, hand, 0.034, look.chef ? '#fafafa' : look.top);
    part(root, ball(0.038), skin, hand.x, hand.y, hand.z, { outline: false });
  };
  if (arms === 'clasp') {
    for (const sx of [-1, 1]) arm(sx, v3(sx * 0.22, 1.05, 0.06), v3(sx * 0.03, 0.92, 0.15));
  } else if (arms === 'papers' || arms === 'tablet') {
    for (const sx of [-1, 1]) arm(sx, v3(sx * 0.21, 1.06, 0.1), v3(sx * 0.1, 1.08, 0.27));
    if (arms === 'papers') {
      part(root, box(0.22, 0.004, 0.3), PAPER, 0, 1.1, 0.29, { rx: -1.1 });
      for (let i = 0; i < 5; i++) part(root, box(0.16, 0.001, 0.01), '#9e9e9e', 0, 1.1 + 0.11 - i * 0.04 * 0.45, 0.29 + 0.13 - i * 0.04 * 0.89 - 0.02, { rx: -1.1, outline: false });
    } else {
      part(root, rbox(0.24, 0.012, 0.17, 0.01), '#263238', 0, 1.12, 0.28, { rx: -0.9 });
      glowing(root, box(0.21, 0.002, 0.14), '#bbdefb', 0, 1.124, 0.284, -0.9);
    }
  } else {
    arm(1, v3(0.22, 1.05, 0.06), v3(0.05, 0.92, 0.15));
    arm(-1, v3(-0.3, 1.12, 0.12), v3(-0.36, 1.18, 0.34));
  }
  return root;
}
/** The yaw that turns a figure at (x, z) to face (tx, tz). */
const faceTo = (x: number, z: number, tx: number, tz: number) => Math.atan2(tx - x, tz - z);

// ---------------------------------------------------------------------------------------------

export const BUILDERS: Record<string, Builder> = {
  /**
   * The editor's desk (편집 데스크): a walnut desk with the review open in the editor on the
   * monitor (the headline, the stars, the copy, 마감 18:00), a pile of this month's magazines, a
   * tray of fresh page proofs, a green banker's lamp, a pen pot and a mug, the swivel chair. Writing
   * the review: sat typing. Trends: sat leafing through a magazine. The deadline (fileReview): the
   * keyboard pushed aside, the proof of the page in front, the red pen going down it line by line,
   * a mark here and there, each page turned over onto the done pile; a 마감 sign up on the monitor.
   * The weekly column: written longhand in a notebook. The editorial meeting (lead): sat at it with
   * the issue plan on the desk, two reporters stood at its side with their pages and a tablet.
   */
  editorDesk(g, _W, _D, _c, _def, _ctx, out) {
    const n = deskCount++;
    const top = 0.74;
    const z0 = -0.47;
    const z1 = 0.22;
    const zc = (z0 + z1) / 2;
    part(g, rbox(0.98, 0.035, z1 - z0, 0.01), WALNUT, 0, top - 0.0175, zc);
    part(g, rbox(0.035, top - 0.035, z1 - z0 - 0.04, 0.01), WALNUT_DARK, -0.465, (top - 0.035) / 2, zc);
    part(g, box(0.9, 0.36, 0.02), WALNUT_DARK, 0, 0.52, z0 + 0.03, { outline: false });
    // The drawer pedestal at the right, clear of the knees.
    part(g, rbox(0.3, top - 0.05, z1 - z0 - 0.06, 0.01), WALNUT_DARK, 0.32, (top - 0.05) / 2, zc);
    for (let i = 0; i < 3; i++) {
      part(g, box(0.26, 0.003, 0.004), '#3e2723', 0.32, 0.24 + i * 0.16, z1 - 0.028, { outline: false });
      part(g, box(0.08, 0.012, 0.012), BRASS, 0.32, 0.32 + i * 0.16 - 0.04, z1 - 0.022, { outline: false });
    }
    const seatY = 0.48;
    const seatZ = 0.5;
    const yaw = Math.PI;
    swivel(g, 0, seatZ + 0.02, seatY, yaw);
    const W0 = v3(0, seatY, seatZ);
    const F = framer(W0, yaw);
    // The monitor with the review, a 마감 note stuck on its bezel.
    out.screen = monitor(g, -0.06, top, -0.33, 0.46, 0.28, painted('crit-review', 512, 320, paintReview));
    part(g, box(0.06, 0.05, 0.002), '#fff59d', 0.2, top + 0.4, -0.315, { rz: 0.12, outline: false });
    // The keyboard: in front at rest and while typing; pushed aside for the proofs and the notebook.
    const keysAt = marker(g, -0.05, top + 0.02, 0.0);
    const keyboard = (p: THREE.Object3D, x: number, z: number, ry: number) => {
      const k = new THREE.Group();
      k.position.set(x, top, z);
      k.rotation.y = ry;
      p.add(k);
      part(k, rbox(0.38, 0.018, 0.13, 0.006), '#cfd8dc', 0, 0.009, 0);
      part(k, box(0.34, 0.004, 0.1), '#eceff1', 0, 0.02, 0, { outline: false });
      return k;
    };
    const idle = new THREE.Group();
    g.add(idle);
    out.idle = idle;
    keyboard(idle, -0.05, 0.0, 0);
    part(g, rbox(0.06, 0.02, 0.1, 0.02), '#cfd8dc', 0.22, top + 0.01, -0.08);
    // The magazines, the tray of fresh proofs, the lamp, the pen pot, the mug.
    magPile(g, 0.3, top, -0.3, 4, n * 3);
    part(g, rbox(0.25, 0.03, 0.33, 0.006), '#263238', 0.31, top + 0.015, 0.03);
    for (let i = 0; i < 3; i++) part(g, box(0.21, 0.003, 0.297), PAPER, 0.31 + (i - 1) * 0.004, top + 0.033 + i * 0.004, 0.03, { outline: false });
    picture(g, painted('crit-proof', 256, 362, paintProof), 0.2, 0.28, 0.31, top + 0.046, 0.03, '#ffffff', 0, -Math.PI / 2);
    part(g, cyl(0.06, 0.07, 0.015, 16), BRASS, -0.4, top + 0.008, -0.36);
    rod(g, v3(-0.4, top + 0.01, -0.36), v3(-0.4, top + 0.36, -0.36), 0.008, BRASS);
    part(g, cyl(0.03, 0.1, 0.08, 16), '#1b5e20', -0.4, top + 0.4, -0.3, { rx: 0.25 });
    part(g, cyl(0.035, 0.03, 0.09, 12), '#455a64', -0.33, top + 0.045, -0.17);
    for (let i = 0; i < 3; i++) rod(g, v3(-0.33 + (i - 1) * 0.01, top + 0.08, -0.17), v3(-0.33 + (i - 1) * 0.02, top + 0.16, -0.17 + (i % 2) * 0.01), 0.004, [PEN_RED, '#1e88e5', '#212121'][i]);
    part(g, cyl(0.035, 0.032, 0.085, 14), '#fafafa', 0.42, top + 0.043, -0.12);
    part(g, cyl(0.03, 0.03, 0.004, 14), '#4e342e', 0.42, top + 0.084, -0.12, { outline: false });

    // In use: the keyboard as it's needed, the proofs, the notebook, the meeting, the magazines.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const kbHome = keyboard(use, -0.05, 0.0, 0);
    const kbAside = keyboard(use, -0.3, -0.16, 0.5);
    // The proof: its left edge (their left, -x) is the hinge it's turned over on.
    const S = F(PROOF.sheet);
    const proofAt = marker(g, S.x, S.y, S.z);
    const proofs = new THREE.Group();
    use.add(proofs);
    // Facing -z their left is -x: the sheet's left edge (the hinge, where the left hand holds it) is at S.x - w/2.
    const hinge = new THREE.Group();
    hinge.position.set(S.x - PROOF.w / 2, top + 0.008, S.z);
    proofs.add(hinge);
    const page = new THREE.Group();
    page.position.set(PROOF.w / 2, 0, 0);
    hinge.add(page);
    part(page, box(PROOF.w, 0.002, PROOF.len), PAPER, 0, 0, 0, { outline: false });
    picture(page, painted('crit-proof', 256, 362, paintProof), PROOF.w - 0.004, PROOF.len - 0.004, 0, 0.0015, 0, '#ffffff', 0, -Math.PI / 2);
    // The red marks, one a line, shown as the pen gets past each.
    const step = (PROOF.len - 0.08) / (PROOF.lines - 1);
    const rm = seeded(11 + n);
    const marks = Array.from({ length: PROOF.lines }, (_, i) => {
      const ahead = PROOF.len / 2 - 0.04 - i * step;
      const along = 0.07 - rm() * 0.14;
      const p = F(boAdd(PROOF.sheet, bo(along, 0, ahead)));
      const m = part(page, box(0.018, 0.001, 0.004), PEN_RED, p.x - hinge.position.x - page.position.x, 0.002, p.z - S.z, { rz: 0, ry: rm() - 0.5, outline: false });
      return m;
    });
    // Under it the next page, and the done pile at their left.
    part(proofs, box(PROOF.w, 0.006, PROOF.len), PAPER, S.x, top + 0.003, S.z, { outline: false });
    const P = F(PROOF.pile);
    part(proofs, box(PROOF.w, 0.012, PROOF.len), '#f3efe6', P.x, top + 0.006, P.z, { outline: false });
    const redPen = pen(proofs);
    label(proofs, '마감!', 0.12, 0.06, -0.06, top + 0.47, -0.31, PEN_RED, '#ffffff');
    // The notebook for the column, its fountain pen beside it.
    const nbAt = F(bo(-0.04, 0.27, 0.4));
    const column = notebook(use, painted('crit-notes', 256, 176, paintNotes), 0.32, 0.22);
    column.position.set(nbAt.x, top, nbAt.z);
    const nbWork = marker(g, nbAt.x, top + 0.01, nbAt.z);
    const fountain = pen(column, '#1a237e');
    fountain.position.set(0.2, 0.012, 0.02);
    fountain.rotation.set(0, -Math.PI / 2 + 0.2, 0);
    // The meeting: the issue plan on the desk and two reporters at the side.
    const meeting = new THREE.Group();
    use.add(meeting);
    picture(meeting, painted('crit-flatplan', 512, 64, paintFlatplan), 0.42, 0.06, 0.0, top + 0.003, 0.08, '#ffffff', 0, -Math.PI / 2);
    figure(meeting, -0.82, -0.1, Math.PI / 2, { top: '#8d6e63', bottom: '#37474f', hair: '#2b1b10', glasses: true }, 'papers');
    figure(meeting, -0.76, 0.45, faceTo(-0.76, 0.45, 0, 0.3), { top: '#ffb74d', bottom: '#5d4037', hair: '#a0522d', long: true }, 'tablet');
    // Trends: rival magazines fanned out on the desk.
    const fan = new THREE.Group();
    use.add(fan);
    for (let i = 0; i < 3; i++) picture(fan, painted(`crit-rack-${i + 1}`, 192, 256, rackPaint(i + 1)), 0.18, 0.24, -0.02 + (i - 1) * 0.12, top + 0.004 + i * 0.002, 0.06, '#ffffff', (i - 1) * 0.25, -Math.PI / 2).rotation.set(-Math.PI / 2, 0, (i - 1) * 0.25);

    const sit = () => spot(g, 'sit', 0, seatY, seatZ, yaw, seatY);
    const spots: Record<string, Spot> = {
      writeReview: at(sit(), keysAt, 'type'),
      researchTrends: at(sit(), undefined, 'read'),
      fileReview: at(sit(), proofAt, 'proofread'),
      critic_weeklyColumn: at(sit(), nbWork, 'write'),
      critic_editorialMeeting: at(sit(), undefined, 'meeting'),
      '*': at(sit(), keysAt, 'type'),
    };
    out.spots = spots;
    out.seat = marker(g, 0, seatY, seatZ);
    out.work = keysAt;
    const v = new THREE.Vector3();
    const w = new THREE.Vector3();
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const proofing = now === 'fileReview';
      const writing = now === 'critic_weeklyColumn';
      kbHome.visible = !proofing && !writing;
      kbAside.visible = proofing || writing;
      proofs.visible = proofing;
      column.visible = writing;
      meeting.visible = now === 'critic_editorialMeeting';
      fan.visible = now === 'researchTrends';
      if (!proofing) return;
      const k = proofRound(t, phaseOf(proofAt));
      hinge.rotation.z = k.flip * Math.PI;
      marks.forEach((m, i) => (m.visible = k.flip > 0 || i < k.line));
      // The pen in the right hand, its tip on the page, the barrel back up towards the hand.
      const tip = F(k.r, v).add(new THREE.Vector3(0.0, -0.012, 0.0));
      aim(redPen, tip, w.copy(tip).add(new THREE.Vector3(0.03, 0.11, 0.07)));
    };
  },

  /**
   * The tasting table (시식 테이블, 2 tiles): a white tablecloth to the floor, the critic's chair at
   * the middle, the place laid — a gold charger under the plate, the knife and fork, a wine glass and
   * a water glass, the bread plate, the course menu standing at the back, a bud vase, the critic's
   * notebook open at the right with the pen. At rest the plate waits under a silver cloche. The
   * course (tasteCourse): the chef stood behind it in whites and toque, hands clasped, as each course
   * is cut, tasted, thought over (the chin in the hand) and written up — a fish, then the beef,
   * then the dessert. Blind (branch): three small plates marked A, B and C, the one being scored
   * brought forward, the 블라인드 평가표 where the notebook was; nobody to say whose they are.
   */
  tastingTable(g, W, _D, _c, _def, _ctx, out) {
    const top = 0.76;
    const z0 = -0.43;
    const z1 = 0.22;
    const zc = (z0 + z1) / 2;
    const tw = Math.min(W - 0.12, 1.86);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.025, 0.02, top - 0.02, 8), WALNUT_DARK, sx * (tw / 2 - 0.08), (top - 0.02) / 2, zc + sz * ((z1 - z0) / 2 - 0.08), { outline: false });
    part(g, rbox(tw, 0.03, z1 - z0, 0.01), WALNUT, 0, top - 0.015, zc);
    // The cloth: over the top and hanging a hand's breadth all round.
    part(g, box(tw + 0.04, 0.006, z1 - z0 + 0.04), '#ffffff', 0, top + 0.003, zc);
    part(g, box(tw + 0.04, 0.28, 0.006), '#fafafa', 0, top - 0.14, z1 + 0.02, { outline: false });
    part(g, box(tw + 0.04, 0.28, 0.006), '#fafafa', 0, top - 0.14, z0 - 0.02, { outline: false });
    for (const sx of [-1, 1]) part(g, box(0.006, 0.28, z1 - z0 + 0.04), '#fafafa', sx * (tw / 2 + 0.02), top - 0.14, zc, { outline: false });
    // A runner down the middle and the far side's setting (the second place, laid but not used).
    part(g, box(tw * 0.9, 0.002, 0.16), '#8d6e63', 0, top + 0.007, -0.28, { outline: false });
    // The critic's chair: a dining chair, its upholstered seat, pulled up to the middle.
    const seatY = 0.48;
    const seatZ = 0.5;
    const ch = new THREE.Group();
    ch.position.set(0, 0, seatZ + 0.03);
    g.add(ch);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(ch, cyl(0.018, 0.015, seatY - 0.05, 8), WALNUT_DARK, sx * 0.19, (seatY - 0.05) / 2, sz * 0.18, { outline: false });
    part(ch, rbox(0.46, 0.06, 0.44, 0.02), '#7b1f2a', 0, seatY - 0.03, 0);
    for (const sx of [-1, 1]) rod(ch, v3(sx * 0.19, seatY, 0.2), v3(sx * 0.2, seatY + 0.48, 0.24), 0.016, WALNUT_DARK);
    part(ch, rbox(0.42, 0.24, 0.04, 0.02), '#7b1f2a', 0, seatY + 0.34, 0.23, { rx: 0.08 });
    const W0 = v3(0, seatY, seatZ);
    const F = framer(W0, Math.PI);
    const Pc = F(COURSE.plate);
    const plateAt = marker(g, Pc.x, Pc.y, Pc.z);
    // The place: the charger and the plate, the bread plate, the glasses, the menu, the vase.
    part(g, cyl(0.16, 0.16, 0.008, 28), BRASS, Pc.x, top + 0.01, Pc.z, { outline: false });
    part(g, cyl(0.135, 0.12, 0.014, 28), '#ffffff', Pc.x, top + 0.021, Pc.z);
    part(g, cyl(0.06, 0.055, 0.008, 18), '#ffffff', -0.27, top + 0.012, -0.06);
    part(g, ball(0.035), '#d7a86e', -0.27, top + 0.035, -0.06).scale.set(1.3, 0.7, 1);
    const { glassG: wg } = wineGlass(g);
    wg.position.set(0.24, top + 0.003 + WINE.stem, -0.12);
    glass(g, cyl(0.032, 0.028, 0.1, 16), 0.33, top + 0.055, -0.04, CLEAR);
    part(g, cyl(0.028, 0.025, 0.07, 14), '#b3e5fc', 0.33, top + 0.04, -0.04, { outline: false, material: undefined });
    const menu = new THREE.Group();
    menu.position.set(0, top, -0.3);
    g.add(menu);
    part(menu, box(0.13, 0.2, 0.004), '#fffdf7', 0, 0.1, 0, { rx: -0.15 });
    picture(menu, painted('crit-menu', 128, 200, paintMenu), 0.12, 0.19, 0, 0.1, 0.004, '#ffffff', 0, -0.15);
    part(g, cyl(0.022, 0.03, 0.12, 12), '#cfd8dc', -0.5, top + 0.06, -0.26);
    rod(g, v3(-0.5, top + 0.1, -0.26), v3(-0.49, top + 0.24, -0.25), 0.003, '#33691e');
    part(g, ball(0.025), '#ef9a9a', -0.49, top + 0.25, -0.25);
    // A reserved card for the critic's place ('평가석').
    label(g, '평가석', 0.1, 0.04, 0.5, top + 0.03, -0.1, '#ffffff', '#5d4037');

    // At rest: the cloche on the plate, the cutlery and the notebook closed.
    const idle = new THREE.Group();
    g.add(idle);
    out.idle = idle;
    part(idle, new THREE.SphereGeometry(0.12, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), CHROME, Pc.x, top + 0.028, Pc.z).userData.ownGeometry = true;
    part(idle, ball(0.014), CHROME, Pc.x, top + 0.155, Pc.z);
    const restK = knife(idle);
    aim(restK, F(COURSE.knife), F(boAdd(COURSE.knife, bo(0, 0, 0.1))));
    const restF = fork(idle);
    aim(restF, F(COURSE.fork), F(boAdd(COURSE.fork, bo(0, 0, 0.1))));
    const Nb = F(COURSE.book);
    part(idle, rbox(0.15, 0.015, 0.21, 0.004), '#3e2723', Nb.x, top + 0.008, Nb.z);

    // In use: the course on the plate (three of them, one a round), the cutlery in the hands, the notes.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const dishes = [0, 1, 2].map((d) => {
      const dg = new THREE.Group();
      dg.position.set(Pc.x, top + 0.03, Pc.z);
      use.add(dg);
      if (d === 0) {
        // Seared yellowtail with a yuzu sauce and leaves.
        part(dg, cyl(0.07, 0.07, 0.002, 20), '#f9e79f', 0.0, 0, 0.0, { outline: false });
        part(dg, rbox(0.11, 0.03, 0.05, 0.012), '#f2c6a0', 0, 0.016, 0, { ry: 0.3 });
        part(dg, box(0.1, 0.004, 0.045), '#8d4b2a', 0, 0.032, 0, { ry: 0.3, outline: false });
        for (let i = 0; i < 4; i++) part(dg, ball(0.008), '#7cb342', -0.03 + i * 0.02, 0.035, 0.03 - (i % 2) * 0.01, { outline: false });
      } else if (d === 1) {
        // Slices of beef fanned out, a line of purée dots.
        for (let i = 0; i < 4; i++) {
          const s = part(dg, rbox(0.05, 0.016, 0.03, 0.006), '#6d2f1f', -0.03 + i * 0.022, 0.01, -0.01, { ry: 0.5 });
          part(s, box(0.044, 0.004, 0.024), '#c25b4f', 0, 0.006, 0, { outline: false });
        }
        for (let i = 0; i < 5; i++) part(dg, ball(0.009), '#ffe0b2', -0.05 + i * 0.025, 0.006, 0.05, { outline: false });
      } else {
        // A dessert dome with berries and a quenelle of mugwort ice cream.
        part(dg, new THREE.SphereGeometry(0.04, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#f8bbd0', -0.02, 0, 0).userData.ownGeometry = true;
        part(dg, ball(0.025), '#a5d6a7', 0.05, 0.014, 0.02).scale.set(1.4, 0.7, 1);
        for (let i = 0; i < 3; i++) part(dg, ball(0.008), '#c62828', -0.02 + i * 0.015, 0.045, 0.0, { outline: false });
      }
      return dg;
    });
    // Blind: three small plates at the back marked A B C; the one tasted brought to the charger.
    const blind = new THREE.Group();
    use.add(blind);
    const blindPlates = ['A', 'B', 'C'].map((s, i) => {
      const bp = new THREE.Group();
      blind.add(bp);
      part(bp, cyl(0.07, 0.06, 0.012, 20), '#f5f5f5', 0, 0.006, 0);
      part(bp, ball(0.028), ['#d7a86e', '#a1887f', '#ffcc80'][i], 0, 0.02, 0).scale.set(1.3, 0.6, 1);
      label(bp, s, 0.04, 0.04, 0, 0.04, -0.075, '#263238', '#ffffff');
      return bp;
    });
    const blindSheet = new THREE.Group();
    blind.add(blindSheet);
    blindSheet.position.set(Nb.x, top + 0.004, Nb.z);
    part(blindSheet, box(0.15, 0.003, 0.21), '#ffffff', 0, 0, 0, { outline: false });
    picture(blindSheet, painted('crit-blind', 160, 220, paintBlindSheet), 0.145, 0.205, 0, 0.002, 0, '#ffffff', 0, -Math.PI / 2);
    const notes = notebook(use, painted('crit-notes', 256, 176, paintNotes), 0.28, 0.2);
    notes.position.set(Nb.x - 0.03, top, Nb.z);
    notes.rotation.y = 0.15;
    const kn = knife(use);
    const fk = fork(use);
    const bite = part(use, ball(0.012), '#c25b4f', 0, 0, 0, { outline: false });
    const pn = pen(use, '#263238');
    const chef = figure(use, 0.35, -0.85, 0, { top: '#fafafa', bottom: '#263238', hair: '#2b1b10', chef: true }, 'clasp');

    const sit = () => spot(g, 'sit', 0, seatY, seatZ, Math.PI, seatY);
    const spots: Record<string, Spot> = {
      tasteCourse: at(sit(), plateAt, 'courseTaste'),
      critic_blindTasting: at(sit(), plateAt, 'courseTaste'),
      '*': at(sit(), plateAt, 'courseTaste'),
    };
    out.spots = spots;
    out.work = plateAt;
    const v = new THREE.Vector3();
    const w = new THREE.Vector3();
    const fwdV = v3(0, 0, -1);
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const isBlind = now === 'critic_blindTasting';
      const k = courseRound(t, phaseOf(plateAt), now ? heightAt(spots[now]) : 1.6);
      chef.visible = !isBlind;
      blind.visible = isBlind;
      notes.visible = !isBlind;
      const d = ((k.n % 3) + 3) % 3;
      dishes.forEach((dg, i) => (dg.visible = !isBlind && i === d));
      blindPlates.forEach((bp, i) => {
        const here = i === d;
        if (here) bp.position.set(Pc.x, top + 0.028, Pc.z);
        else bp.position.set(-0.25 + i * 0.25, top + 0.008, -0.14);
      });
      // The knife: in the right hand its blade down to the plate, else on the rim.
      const kp = F(k.knife, v);
      if (k.knifeHeld) aim(kn, kp, w.copy(kp).addScaledVector(fwdV, 0.1).add(v3(0, -0.06, 0)));
      else aim(kn, kp, w.copy(kp).addScaledVector(fwdV, 0.1));
      const fp = F(k.fork, v);
      const toMouth = THREE.MathUtils.smoothstep(k.u, 0.27, 0.32) * (1 - THREE.MathUtils.smoothstep(k.u, 0.38, 0.42));
      if (k.forkHeld) aim(fk, fp, w.copy(fp).addScaledVector(fwdV, 0.1 * (1 - toMouth)).add(v3(0.0, -0.05 + 0.12 * toMouth, 0.03 * toMouth)));
      else aim(fk, fp, w.copy(fp).addScaledVector(fwdV, 0.1));
      bite.visible = k.bite && k.forkHeld;
      // The morsel on the tines (0.1 out along the fork from the grip).
      if (bite.visible) bite.position.copy(w).sub(fp).normalize().multiplyScalar(0.1).add(fp).add(v3(0, 0.01, 0));
      // The pen: writing, or lying on the notebook (the sheet when blind).
      const pp = F(k.pen, v);
      if (k.writing) aim(pn, pp, w.copy(pp).add(v3(-0.03, 0.11, 0.07)));
      else aim(pn, pp, w.copy(pp).add(v3(0, 0, -0.12)));
    };
  },

  /**
   * The wine cellar (와인 셀러): a tall walnut cabinet — the bottles laid in their cubbies above,
   * their foil caps out; below, a glass-doored cooler lit inside, bottles on its racks, 14°C on its
   * display — and across its middle a marble tasting ledge: the open bottle and its cork, the glass,
   * the tasting card and pencil, a silver spit bucket and a white napkin. Tasting (rateWine): stood
   * at the ledge, the glass held up against the white card for its colour, swirled, nosed, sipped,
   * then the score written on the card.
   */
  wineRack(g, _W, _D, _c, _def, _ctx, out) {
    const w = 0.9;
    const back = -0.48;
    const front = -0.14;
    const zm = (back + front) / 2;
    const d = front - back;
    for (const sx of [-1, 1]) part(g, rbox(0.04, 1.96, d, 0.01), WALNUT, sx * (w / 2 - 0.02), 0.98, zm);
    part(g, rbox(w + 0.04, 0.06, d + 0.04, 0.01), WALNUT_DARK, 0, 1.97, zm);
    part(g, box(w - 0.04, 1.9, 0.02), WALNUT_DARK, 0, 0.98, back + 0.01, { outline: false });
    part(g, box(w, 0.08, d), WALNUT_DARK, 0, 0.04, zm);
    // The cubbies above: bottles laid in, foil caps out.
    const cols = 5;
    const rows = 4;
    const cw = (w - 0.08) / cols;
    const r = seeded(23);
    for (let row = 0; row < rows; row++) {
      const y = 1.12 + row * 0.2;
      part(g, box(w - 0.06, 0.015, d - 0.02), WALNUT, 0, y - 0.09, zm);
      for (let c = 0; c < cols; c++) {
        const x = -w / 2 + 0.04 + cw * (c + 0.5);
        if (r() < 0.12) continue;
        part(g, cyl(0.036, 0.036, d - 0.06, 12), r() > 0.5 ? '#1b3d2a' : '#3e1f1a', x, y, zm - 0.01, { rx: Math.PI / 2 });
        part(g, cyl(0.016, 0.02, 0.05, 10), ['#b71c1c', BRASS, '#212121', '#e0e0e0'][Math.floor(r() * 4)], x, y, front - 0.02, { rx: Math.PI / 2, outline: false });
      }
      for (let c = 1; c < cols; c++) part(g, box(0.012, 0.18, d - 0.02), WALNUT, -w / 2 + 0.04 + cw * c, y, zm, { outline: false });
    }
    // The cooler below: its glass door, lit inside, bottles on racks; the display.
    part(g, box(w - 0.06, 0.78, 0.02), '#1a1a1a', 0, 0.48, back + 0.03, { outline: false });
    glowing(g, box(w - 0.12, 0.7, 0.004), '#cfe8ff', 0, 0.48, back + 0.045);
    for (let i = 0; i < 3; i++) {
      const y = 0.22 + i * 0.22;
      part(g, box(w - 0.1, 0.01, d - 0.06), CHROME, 0, y, zm, { outline: false });
      for (let c = 0; c < 6; c++) part(g, cyl(0.03, 0.03, 0.08, 10), c % 2 ? '#1b3d2a' : '#4a1520', -0.32 + c * 0.128, y + 0.035, front - 0.08, { rx: Math.PI / 2, outline: false });
    }
    glass(g, box(w - 0.06, 0.8, 0.012), 0, 0.48, front - 0.005);
    part(g, box(0.02, 0.6, 0.03), CHROME, w / 2 - 0.08, 0.5, front + 0.01);
    picture(g, painted('crit-cellar', 128, 48, paintCellar), 0.16, 0.06, -0.26, 0.82, front + 0.002);
    label(g, '와인 셀러', 0.3, 0.07, 0, 1.93, front + 0.028, WALNUT_DARK, '#f3e5ab');
    // The tasting ledge: marble on brass brackets, out over the cooler's top.
    const ledgeTop = 0.965;
    part(g, rbox(w + 0.02, 0.03, 0.3, 0.008), MARBLE, 0, ledgeTop - 0.015, -0.03);
    for (const sx of [-1, 1]) rod(g, v3(sx * 0.36, 0.86, front), v3(sx * 0.36, ledgeTop - 0.03, 0.08), 0.012, BRASS);
    const W0 = v3(0, 0, 0.42);
    const F = framer(W0, Math.PI);
    const Gr = F(WINE.glass);
    const glassAt = marker(g, Gr.x, Gr.y, Gr.z);
    // The open bottle, its cork, the spit bucket, the napkin.
    const bottle = new THREE.Group();
    bottle.position.set(0.33, ledgeTop, -0.09);
    g.add(bottle);
    part(bottle, cyl(0.037, 0.037, 0.2, 16), '#1b3d2a', 0, 0.1, 0);
    part(bottle, cyl(0.016, 0.037, 0.06, 16), '#1b3d2a', 0, 0.23, 0, { outline: false });
    part(bottle, cyl(0.015, 0.015, 0.07, 12), '#1b3d2a', 0, 0.29, 0, { outline: false });
    picture(bottle, painted('crit-bottle', 128, 96, paintBottleLabel), 0.06, 0.05, 0, 0.1, 0.038);
    part(g, cyl(0.011, 0.011, 0.045, 10), '#d7b98e', 0.24, ledgeTop + 0.012, 0.03, { rz: Math.PI / 2 });
    part(g, cyl(0.07, 0.055, 0.15, 18), CHROME, -0.34, ledgeTop + 0.075, -0.08);
    part(g, cyl(0.06, 0.06, 0.004, 18), '#4a1520', -0.34, ledgeTop + 0.149, -0.08, { outline: false });
    part(g, box(0.14, 0.01, 0.1), '#ffffff', 0.32, ledgeTop + 0.005, 0.05, { ry: 0.3 });

    // At rest the glass, the card and its pencil on the ledge; in use, in the hands.
    const idle = new THREE.Group();
    g.add(idle);
    out.idle = idle;
    const restGlass = wineGlass(idle).glassG;
    restGlass.position.copy(Gr);
    const Cd = F(WINE.card);
    const restCard = new THREE.Group();
    restCard.position.copy(Cd);
    idle.add(restCard);
    part(restCard, box(0.12, 0.003, 0.16), '#ffffff', 0, 0, 0, { outline: false });
    picture(restCard, painted('crit-tasting', 160, 220, paintTastingCard), 0.115, 0.155, 0, 0.002, 0, '#ffffff', 0, -Math.PI / 2);
    const restPen = pen(idle, '#f9a825');
    aim(restPen, F(boAdd(WINE.card, bo(-0.06, 0.006, 0.03))), F(boAdd(WINE.card, bo(-0.06, 0.006, -0.09))));
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const held = wineGlass(use);
    const card = new THREE.Group();
    use.add(card);
    const cardFace = new THREE.Group();
    card.add(cardFace);
    part(cardFace, box(0.12, 0.16, 0.003), '#ffffff', 0, 0, 0, { outline: false });
    picture(cardFace, painted('crit-tasting', 160, 220, paintTastingCard), 0.115, 0.155, 0, 0, 0.002);
    const pencil = pen(use, '#f9a825');
    const spots: Record<string, Spot> = {
      rateWine: at(spot(g, 'stand', W0.x, 0, W0.z, Math.PI), glassAt, 'wineTaste'),
      '*': at(spot(g, 'stand', W0.x, 0, W0.z, Math.PI), glassAt, 'wineTaste'),
    };
    out.spots = spots;
    out.work = glassAt;
    const v = new THREE.Vector3();
    const q = new THREE.Vector3();
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const k = wineRound(t, phaseOf(glassAt), now ? heightAt(spots[now]) : 1.6);
      held.glassG.position.copy(F(k.glass, v));
      // Tipped towards them (+z here) about their left-right line.
      held.glassG.rotation.set(k.tilt, 0, 0);
      held.wine.scale.set(1, Math.max(0.05, k.level), 1);
      card.position.copy(F(k.card, v));
      // Flat on the ledge, or stood up facing them behind the glass.
      cardFace.rotation.set(-Math.PI / 2 * (1 - k.cardUp), 0, 0);
      const tip = F(k.pen, v);
      if (k.writing) aim(pencil, tip, q.copy(tip).add(v3(0.03, 0.11, 0.07)));
      else aim(pencil, tip, q.copy(tip).add(v3(0, 0, -0.12)));
    };
  },

  /**
   * A work on its plinth (작품 전시대): a white gallery plinth with the work's label on its face — by
   * turns a bronze (이수진 「흐름」, a ribbon of metal turning on itself), a marble head (박서윤
   * 「응시」) and a celadon 매병 — a pool of light on its top. Appraising: walked round it, notebook
   * in the left hand — from the front left (the chin in the hand), to the front (a line written),
   * to the front right, in close bent to the surface, back to write — a few steps between. Notes
   * for a show (branch): stood at the front writing and thinking. The curators' meeting (lead):
   * stood at its side with the notebook, two curators across from them, one with a tablet.
   */
  artPedestal(g, _W, _D, _c, _def, _ctx, out) {
    const n = pedestalCount++ % 3;
    const ph = 1.0;
    part(g, rbox(0.48, ph, 0.48, 0.015), '#fbfbf8', 0, ph / 2, 0);
    part(g, box(0.5, 0.05, 0.5), '#cfcfca', 0, 0.025, 0, { outline: false });
    picture(g, painted(`crit-plinth-${n}`, 192, 96, plinthLabel(n)), 0.16, 0.08, 0.12, 0.86, 0.2405);
    glowing(g, cyl(0.2, 0.2, 0.002, 24), '#fffbea', 0, ph + 0.002, 0);
    const work = new THREE.Group();
    work.position.set(0, ph, 0);
    g.add(work);
    if (n === 0) {
      part(work, rbox(0.22, 0.05, 0.16, 0.01), '#2b2b30', 0, 0.025, 0);
      const k = part(work, new THREE.TorusKnotGeometry(0.1, 0.028, 80, 10, 2, 3), BRONZE, 0, 0.2, 0);
      k.userData.ownGeometry = true;
      k.scale.set(1, 1.35, 0.8);
      k.rotation.set(0.2, 0.4, 0);
    } else if (n === 1) {
      part(work, rbox(0.14, 0.12, 0.14, 0.01), '#9e9e9e', 0, 0.06, 0);
      part(work, cyl(0.04, 0.05, 0.08, 14), MARBLE, 0, 0.16, 0);
      part(work, rbox(0.24, 0.07, 0.12, 0.04), MARBLE, 0, 0.13, 0);
      part(work, ball(0.085), MARBLE, 0, 0.27, 0.0).scale.set(0.92, 1.12, 1);
      part(work, ball(0.088), MARBLE, 0, 0.3, -0.02).scale.set(1, 0.9, 0.95);
      part(work, box(0.016, 0.04, 0.03), MARBLE, 0, 0.27, 0.085, { rx: 0.3 });
      for (const sx of [-1, 1]) part(work, ball(0.012), '#d6d1c4', sx * 0.03, 0.29, 0.075, { outline: false });
    } else {
      part(work, VASE(), '#9ccfb7', 0, 0.0, 0);
      for (let i = 0; i < 3; i++) part(work, ring(0.08 - i * 0.004, 0.003), '#5f9c84', 0, 0.12 + i * 0.05, 0, { rx: Math.PI / 2 });
    }
    const workAt = marker(g, 0, ph + 0.22, 0);
    // The notebook and pen going round with the critic; the curators.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const pad = new THREE.Group();
    use.add(pad);
    part(pad, box(0.15, 0.012, 0.2), '#212121', 0, 0, 0);
    part(pad, box(0.14, 0.002, 0.19), '#fffef6', 0, 0.007, 0, { outline: false });
    for (let i = 0; i < 6; i++) part(pad, box(0.1, 0.001, 0.003), '#5c6bc0', -0.01, 0.0085, -0.07 + i * 0.025, { outline: false });
    const pn = pen(use, '#212121');
    const curators = new THREE.Group();
    use.add(curators);
    figure(curators, 0.7, 0.3, faceTo(0.7, 0.3, -0.3, 0.6), { top: '#212121', bottom: '#212121', hair: '#1a1a1a', glasses: true }, 'present');
    figure(curators, 0.5, 0.95, faceTo(0.5, 0.95, -0.3, 0.6), { top: '#5d4037', bottom: '#37474f', hair: '#6d4c41', long: true }, 'tablet');

    const round = spot(g, 'stand', 0, 0, 0.82, Math.PI);
    const spots: Record<string, Spot> = {
      appraiseArt: at(round, workAt, 'appraise'),
      critic_exhibitNotes: at(spot(g, 'stand', 0, 0, 0.82, Math.PI), workAt, 'appraise'),
      critic_curatorialMeeting: at(spot(g, 'stand', -0.55, 0, 0.62, faceTo(-0.55, 0.62, 0.4, 0.4)), undefined, 'meeting'),
      '*': at(spot(g, 'stand', 0, 0, 0.82, Math.PI), workAt, 'appraise'),
    };
    out.spots = spots;
    out.work = workAt;
    const v = new THREE.Vector3();
    const w = new THREE.Vector3();
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const k = appraiseRound(t, phaseOf(workAt), now ? heightAt(spots[now]) : 1.6);
      // Going round (appraiseArt only): where they stand and face, the plinth's middle.
      round.at.position.set(Math.sin(k.angle) * k.dist, 0, Math.cos(k.angle) * k.dist);
      round.at.rotation.y = k.angle + Math.PI;
      curators.visible = now === 'critic_curatorialMeeting';
      const noting = now !== null && now !== 'critic_curatorialMeeting';
      pad.visible = pn.visible = noting;
      if (!noting) return;
      const sp = spots[now!];
      const F = framer(sp.at.position, sp.at.rotation.y);
      pad.position.copy(F(k.pad, v));
      // Held up facing them, tipped back to write on.
      pad.rotation.set(k.writing ? 0.5 : 0.9, sp.at.rotation.y + Math.PI, 0, 'YXZ');
      const hand = F(k.r, v);
      if (k.writing) aim(pn, hand.clone().add(v3(0, -0.02, 0)), w.copy(hand).add(v3(0, 0.1, 0)).addScaledVector(v3(Math.sin(sp.at.rotation.y), 0, Math.cos(sp.at.rotation.y)), -0.06));
      else aim(pn, hand.clone().add(v3(0, -0.01, 0)), w.copy(hand).add(v3(0, -0.12, 0)));
    };
  },

  /**
   * The wall of past covers (지난 호 표지 벽, 2 tiles, on the wall): a white panel with eight covers
   * of 『맛과 멋』 in thin black frames — the chefs, the bronze, the Bordeaux, the celadon — the
   * magazine's name across the top in brass letters, a picture light over them, and a narrow ledge
   * below with the newest issues stood on it.
   */
  critCoverWall(g, W, _D, _c, _def, _ctx, _out) {
    const pw = Math.min(W - 0.1, 1.9);
    const z = -0.47;
    part(g, rbox(pw, 1.25, 0.03, 0.01), '#fdfcf8', 0, 1.42, z);
    label(g, `${MASTHEAD}  ·  지난 호`, 0.9, 0.11, 0, 1.96, z + 0.018, '#fdfcf8', '#8d6e3a');
    for (let row = 0; row < 2; row++)
      for (let c = 0; c < 4; c++) {
        const x = (c - 1.5) * (pw / 4.2);
        const y = 1.12 + row * 0.47;
        part(g, box(0.31, 0.41, 0.02), '#1b1b1b', x, y, z + 0.022);
        picture(g, coverTex(row * 4 + c), 0.27, 0.36, x, y, z + 0.034);
      }
    // The picture light: a brass bar on two arms, lit underneath.
    for (const sx of [-1, 1]) rod(g, v3(sx * 0.5, 2.06, z + 0.02), v3(sx * 0.5, 2.04, z + 0.16), 0.008, BRASS);
    part(g, cyl(0.025, 0.025, 1.3, 14), BRASS, 0, 2.04, z + 0.17, { rz: Math.PI / 2 });
    glowing(g, box(1.24, 0.006, 0.02), '#fff3c4', 0, 2.014, z + 0.17);
    // The ledge with the latest three standing on it.
    part(g, rbox(pw - 0.1, 0.02, 0.1, 0.005), WALNUT, 0, 0.72, z + 0.06);
    for (let i = 0; i < 3; i++) {
      const m = picture(g, coverTex(i + 5), 0.19, 0.25, -0.4 + i * 0.4, 0.855, z + 0.06, '#ffffff', 0, -0.12);
      m.rotation.x = -0.12;
    }
  },

  /**
   * The layout board (지면 배치 보드, 2 tiles, against the wall): a cork board in an oak frame with
   * the next issue's spreads pinned up in order, two rows of four, the month and the deadline on a
   * strip over it, a flatplan of the whole issue along its foot, sticky notes; a ledge under it with
   * the printer's fresh spreads stacked, a tin of pins and scissors. Laying out the pages: each
   * spread taken off the ledge in both hands, carried up to its place and pressed home, then a step
   * back in the mind's eye, the chin in the hand, at how the issue reads.
   */
  critProofBoard(g, W, _D, _c, _def, _ctx, out) {
    const bw = Math.min(W - 0.08, 1.92);
    const face = -0.38;
    part(g, rbox(bw + 0.06, 1.0, 0.05, 0.01), OAK, 0, 1.4, face - 0.04);
    part(g, box(bw - 0.04, 0.92, 0.012), '#b08d57', 0, 1.4, face - 0.008, { outline: false });
    label(g, '12월호 지면 배치 · 마감 11/28', 0.9, 0.07, 0, 1.94, face - 0.01, OAK, '#ffffff');
    picture(g, painted('crit-flatplan', 512, 64, paintFlatplan), bw - 0.2, 0.1, 0, 0.98, face + 0.001);
    for (const [x, y, c] of [[-0.86, 1.82, '#fff59d'], [0.86, 1.05, '#f8bbd0'], [0.82, 1.82, '#b3e5fc']] as const) part(g, box(0.09, 0.09, 0.003), c, x, y, face + 0.002, { rz: x * 0.1, outline: false });
    // The ledge with the printed spreads, the pins and the scissors.
    part(g, rbox(bw, 0.025, 0.14, 0.006), OAK, 0, 0.955, face + 0.06);
    for (const sx of [-1, 1]) rod(g, v3(sx * (bw / 2 - 0.1), 0.94, face), v3(sx * (bw / 2 - 0.1), 0.86, face + 0.0), 0.012, OAK);
    const W0 = v3(0, 0, face + BOARD.ahead);
    const F = framer(W0, Math.PI);
    const tray = F(BOARD.tray);
    for (let i = 0; i < 4; i++) part(g, box(BOARD.w, 0.003, 0.12), '#ffffff', tray.x + (i % 2) * 0.006, 0.97 + i * 0.004, face + 0.06, { outline: false });
    part(g, cyl(0.03, 0.03, 0.025, 14), '#90a4ae', -0.6, 0.98, face + 0.06);
    part(g, box(0.1, 0.006, 0.03), '#e53935', 0.55, 0.97, face + 0.07, { ry: 0.4 });
    const boardAt = marker(g, 0, 1.4, face);
    const spread = (p: THREE.Object3D, k: number) => {
      const s = new THREE.Group();
      p.add(s);
      const at2 = F(spreadAt(k));
      s.position.set(at2.x, at2.y, face + 0.004);
      picture(s, spreadTex(k), BOARD.w, BOARD.h, 0, 0, 0);
      for (const sx of [-1, 1]) part(s, ball(0.01), ['#e53935', '#1e88e5', '#43a047', '#fdd835'][k % 4], sx * (BOARD.w / 2 - 0.02), BOARD.h / 2 - 0.02, 0.008, { outline: false });
      return s;
    };
    const idle = new THREE.Group();
    g.add(idle);
    out.idle = idle;
    for (let k = 0; k < 8; k++) spread(idle, k);
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const pinned = Array.from({ length: 8 }, (_, k) => spread(use, k));
    const moving = new THREE.Group();
    use.add(moving);
    picture(moving, spreadTex(0), BOARD.w, BOARD.h, 0, 0, 0);
    const movingFace = moving.children[0] as THREE.Mesh;
    const spots: Record<string, Spot> = {
      critLayoutPages: at(spot(g, 'stand', W0.x, 0, W0.z, Math.PI), boardAt, 'pinPage'),
      '*': at(spot(g, 'stand', W0.x, 0, W0.z, Math.PI), boardAt, 'pinPage'),
    };
    out.spots = spots;
    out.work = boardAt;
    const v = new THREE.Vector3();
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const k = pinRound(t, phaseOf(boardAt), now ? heightAt(spots[now]) : 1.6);
      pinned.forEach((s, i) => (s.visible = i !== k.slot || k.pinned));
      moving.visible = k.held && !k.pinned;
      if (!moving.visible) return;
      (movingFace.material as THREE.MeshBasicMaterial).map = spreadTex(k.slot);
      moving.position.copy(F(k.page, v));
      // Flat in the hands off the ledge, turned up to face the board as it's carried.
      const up = THREE.MathUtils.smoothstep(k.u, 0.1, 0.24);
      moving.rotation.set(-Math.PI / 2 * (1 - up), 0, 0);
    };
  },

  /**
   * The light table (사진 라이트 테이블, 2 tiles): a steel-framed table whose milky top lights up
   * white in use, a sleeve of twelve slides from the shoot on it, contact sheets marked in red
   * grease pencil, a box of slides, an anglepoise lamp, drawers labelled for slides, contact prints
   * and negatives. Choosing the pictures: bent over the table, the loupe set on one frame after
   * another, then the chosen one slipped out and held up to the light, and a red ring round it.
   */
  critLightTable(g, W, _D, _c, _def, _ctx, out) {
    const top = 0.9;
    const z0 = -0.45;
    const z1 = 0.25;
    const zc = (z0 + z1) / 2;
    const tw = Math.min(W - 0.12, 1.84);
    // The cabinet with its drawers, on steel legs.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.04, top - 0.04, 0.04), STEEL, sx * (tw / 2 - 0.04), (top - 0.04) / 2, zc + sz * ((z1 - z0) / 2 - 0.04));
    part(g, rbox(tw - 0.1, 0.24, z1 - z0 - 0.1, 0.01), '#eceff1', 0, top - 0.17, zc);
    ['슬라이드', '밀착 인화', '네거티브'].forEach((s, i) => {
      const x = (i - 1) * (tw / 3.2);
      part(g, box(tw / 3.5, 0.18, 0.006), '#cfd8dc', x, top - 0.17, z1 - 0.045, { outline: false });
      label(g, s, 0.16, 0.04, x, top - 0.13, z1 - 0.04, '#ffffff', '#455a64');
      part(g, box(0.1, 0.012, 0.012), CHROME, x, top - 0.2, z1 - 0.036, { outline: false });
    });
    part(g, box(tw - 0.1, 0.02, z1 - z0 - 0.1), STEEL, 0, 0.12, zc, { outline: false });
    // The top: an aluminium frame round the panel, milky at rest, white lit in use.
    part(g, rbox(tw, 0.04, z1 - z0, 0.008), '#b0bec5', 0, top - 0.02, zc);
    part(g, box(tw - 0.08, 0.004, z1 - z0 - 0.08), '#dfe4e8', 0, top + 0.0005, zc, { outline: false });
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    glowing(use, box(tw - 0.08, 0.004, z1 - z0 - 0.08), '#fbfdff', 0, top + 0.001, zc);
    const W0 = v3(0, 0, 0.36);
    const F = framer(W0, Math.PI);
    const Sh = F(LOUPE.sheet);
    const sheetAt = marker(g, Sh.x, Sh.y, Sh.z);
    const sheetW = LOUPE.cols * LOUPE.pitch;
    const sheetL = LOUPE.rows * LOUPE.pitch * 1.2;
    const sheetTex = painted('crit-slides', 512, 432, paintSlides);
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(sheetW + 0.01, sheetL + 0.01), new THREE.MeshBasicMaterial({ map: sheetTex, transparent: true }));
    sheet.userData.ownGeometry = sheet.userData.ownMaterial = true;
    sheet.rotation.x = -Math.PI / 2;
    sheet.position.set(Sh.x, top + 0.004, Sh.z);
    g.add(sheet);
    // Contact sheets, a box of slides, the grease pencil.
    picture(g, painted('crit-contact', 256, 192, paintContact), 0.26, 0.2, -0.6, top + 0.004, -0.15, '#ffffff', 0.15, -Math.PI / 2).rotation.set(-Math.PI / 2, 0, 0.15);
    picture(g, painted('crit-contact', 256, 192, paintContact), 0.26, 0.2, 0.62, top + 0.004, -0.2, '#ffffff', -0.1, -Math.PI / 2).rotation.set(-Math.PI / 2, 0, -0.1);
    part(g, rbox(0.14, 0.05, 0.1, 0.006), '#ffca28', 0.55, top + 0.025, 0.08);
    label(g, 'SLIDE', 0.1, 0.03, 0.55, top + 0.03, 0.131, '#ffca28', '#5d4037');
    part(g, cyl(0.005, 0.005, 0.12, 8), PEN_RED, 0.3, top + 0.006, 0.12, { rz: Math.PI / 2, ry: 0.3 });
    // The anglepoise at the back left.
    part(g, cyl(0.06, 0.07, 0.03, 16), '#263238', -0.78, top + 0.015, -0.35);
    rod(g, v3(-0.78, top + 0.03, -0.35), v3(-0.7, top + 0.38, -0.3), 0.01, '#263238');
    rod(g, v3(-0.7, top + 0.38, -0.3), v3(-0.52, top + 0.42, -0.15), 0.01, '#263238');
    part(g, cyl(0.035, 0.07, 0.09, 14), '#263238', -0.5, top + 0.38, -0.13, { rx: 0.6 });
    // At rest the loupe on the table; in use in the hand, the slide held up, the red ring.
    const loupeShape = (p: THREE.Object3D) => {
      const l = new THREE.Group();
      p.add(l);
      part(l, cyl(0.022, 0.028, 0.045, 16), '#212121', 0, 0.0225, 0);
      glass(l, cyl(0.02, 0.02, 0.004, 16), 0, 0.046, 0);
      return l;
    };
    const idle = new THREE.Group();
    g.add(idle);
    out.idle = idle;
    loupeShape(idle).position.copy(F(LOUPE.rest)).setY(top);
    const loupe = loupeShape(use);
    const slide = new THREE.Group();
    use.add(slide);
    part(slide, box(0.05, 0.05, 0.002), '#fafafa', 0, 0, 0, { outline: false });
    const slideWin = new THREE.Mesh(box(0.034, 0.026, 0.003), new THREE.MeshBasicMaterial({ color: SLIDE_COLORS[0] }));
    slideWin.userData.ownMaterial = true;
    slideWin.position.z = 0.002;
    slide.add(slideWin);
    const hole = glowing(use, box(0.06, 0.002, 0.07), '#ffffff', 0, 0, 0);
    const mark = part(use, ring(0.032, 0.003), PEN_RED, 0, 0, 0, { rx: Math.PI / 2 });
    const spots: Record<string, Spot> = {
      critPickPhotos: at(spot(g, 'stand', W0.x, 0, W0.z, Math.PI), sheetAt, 'loupe'),
      '*': at(spot(g, 'stand', W0.x, 0, W0.z, Math.PI), sheetAt, 'loupe'),
    };
    out.spots = spots;
    out.work = sheetAt;
    const v = new THREE.Vector3();
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const k = loupeRound(t, phaseOf(sheetAt), now ? heightAt(spots[now]) : 1.6);
      const lp = F(k.loupe, v);
      loupe.position.set(lp.x, Math.max(top, lp.y - 0.04), lp.z);
      const chosen = k.frames[2];
      slide.visible = hole.visible = k.slideUp;
      if (k.slideUp) {
        slide.position.copy(F(k.slide, v));
        slide.rotation.set(0, 0, 0);
        slideWin.material.color.set(SLIDE_COLORS[chosen]);
        hole.position.copy(F(slideAt(chosen), v)).setY(top + 0.006);
      }
      mark.visible = k.u > 0.64 || k.u < 0.02;
      mark.position.copy(F(slideAt(chosen), v)).setY(top + 0.008);
    };
  },

  /**
   * The decanting trolley (디캔팅 카트): a brass-framed trolley with walnut trays on castors — on top
   * a swan-shouldered decanter, a candle in a brass holder, the bottle with its label, a corkscrew,
   * a napkin and two glasses; underneath, bottles laid on their sides and an ice bucket. Decanting:
   * the bottle taken up and its neck brought over the candle to the decanter's mouth, poured slow
   * and steady as the decanter fills, stood back, and the decanter swirled on the tray.
   */
  critWineTrolley(g, _W, _D, _c, _def, _ctx, out) {
    const top = 0.84;
    const x0 = 0.42;
    const za = -0.32;
    const zb = 0.18;
    const zm = (za + zb) / 2;
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        rod(g, v3(sx * (x0 - 0.03), 0.06, sz > 0 ? zb - 0.03 : za + 0.03), v3(sx * (x0 - 0.03), top - 0.01, sz > 0 ? zb - 0.03 : za + 0.03), 0.012, BRASS);
        part(g, cyl(0.035, 0.035, 0.025, 14), '#212121', sx * (x0 - 0.03), 0.035, sz > 0 ? zb - 0.03 : za + 0.03, { rz: Math.PI / 2 });
      }
    for (const y of [0.3, top - 0.015]) {
      part(g, rbox(2 * x0, 0.025, zb - za, 0.008), WALNUT, 0, y, zm);
      part(g, box(2 * x0, 0.03, 0.008), BRASS, 0, y + 0.02, zb, { outline: false });
      part(g, box(2 * x0, 0.03, 0.008), BRASS, 0, y + 0.02, za, { outline: false });
    }
    // The push handle at +x.
    for (const sz of [za + 0.03, zb - 0.03]) rod(g, v3(x0 - 0.03, top - 0.01, sz), v3(x0 + 0.04, top + 0.03, sz), 0.01, BRASS);
    part(g, cyl(0.015, 0.015, zb - za - 0.02, 12), WALNUT_DARK, x0 + 0.04, top + 0.03, zm, { rx: Math.PI / 2 });
    // Underneath: bottles lying, an ice bucket.
    for (let i = 0; i < 3; i++) part(g, cyl(0.036, 0.036, 0.28, 12), i % 2 ? '#1b3d2a' : '#4a1520', -0.28 + i * 0.09, 0.35, zm, { rx: Math.PI / 2 });
    part(g, cyl(0.09, 0.075, 0.2, 18), CHROME, 0.22, 0.42, zm);
    for (let i = 0; i < 4; i++) part(g, box(0.035, 0.035, 0.035), '#e1f5fe', 0.19 + (i % 2) * 0.05, 0.52, zm - 0.02 + (i > 1 ? 0.04 : 0), { ry: i, outline: false });
    const W0 = v3(0, 0, 0.42);
    const F = framer(W0, Math.PI);
    const Dc = F(DECANT.decanter);
    const mouthAt = marker(g, Dc.x, Dc.y + DECANT.mouth, Dc.z);
    // The candle in its holder (lit while decanting), a corkscrew, the cork, the napkin, two glasses.
    const Cn = F(DECANT.candle);
    part(g, cyl(0.04, 0.05, 0.015, 16), BRASS, Cn.x, top + 0.008, Cn.z);
    part(g, cyl(0.014, 0.014, 0.08, 12), '#fffde7', Cn.x, top + 0.055, Cn.z);
    part(g, cyl(0.001, 0.001, 0.012, 4), '#212121', Cn.x, top + 0.1, Cn.z, { outline: false });
    part(g, box(0.1, 0.012, 0.022), '#5d4037', 0.3, top + 0.006, -0.22, { ry: 0.5 });
    part(g, cyl(0.011, 0.011, 0.045, 10), '#d7b98e', 0.24, top + 0.01, -0.12, { rz: Math.PI / 2 });
    part(g, box(0.16, 0.01, 0.12), '#ffffff', -0.3, top + 0.005, -0.2, { ry: 0.25 });
    for (const x of [-0.32, -0.2]) {
      const gl = wineGlass(g);
      gl.glassG.position.set(x, top + WINE.stem, 0.08);
      gl.wine.visible = false;
    }
    const bottleShape = (p: THREE.Object3D) => {
      const b = new THREE.Group();
      p.add(b);
      const gy = DECANT.grip;
      part(b, cyl(0.037, 0.037, 0.2, 16), '#1b3d2a', 0, 0.1 - gy, 0);
      part(b, cyl(0.016, 0.037, 0.06, 16), '#1b3d2a', 0, 0.23 - gy, 0, { outline: false });
      part(b, cyl(0.015, 0.015, 0.07, 12), '#1b3d2a', 0, 0.29 - gy, 0, { outline: false });
      picture(b, painted('crit-bottle', 128, 96, paintBottleLabel), 0.06, 0.05, 0, 0.1 - gy, 0.038);
      return b;
    };
    const decanterShape = (p: THREE.Object3D) => {
      const d = new THREE.Group();
      p.add(d);
      const body = glass(d, DECANTER(), 0, 0, 0, CLEAR);
      body.renderOrder = 3;
      const wine = new THREE.Mesh(DECANT_WINE(), WINE_MAT);
      wine.position.y = 0.002;
      d.add(wine);
      return { d, wine };
    };
    const idle = new THREE.Group();
    g.add(idle);
    out.idle = idle;
    bottleShape(idle).position.copy(F(boAdd(DECANT.bottle, bo(0, DECANT.grip, 0))));
    const rest = decanterShape(idle);
    rest.d.position.copy(Dc);
    rest.wine.scale.set(1, 0.25, 1);
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const bottle = bottleShape(use);
    const dec = decanterShape(use);
    const flame = glowing(use, ball(0.012), '#ffb300', Cn.x, top + 0.115, Cn.z);
    flame.scale.set(0.7, 1.6, 0.7);
    const streamMat = WINE_MAT;
    const stream = new THREE.Mesh(cyl(0.004, 0.004, 1, 6), streamMat);
    use.add(stream);
    const spots: Record<string, Spot> = {
      critDecantWine: at(spot(g, 'stand', W0.x, 0, W0.z, Math.PI), mouthAt, 'decant'),
      '*': at(spot(g, 'stand', W0.x, 0, W0.z, Math.PI), mouthAt, 'decant'),
    };
    out.spots = spots;
    out.work = mouthAt;
    const v = new THREE.Vector3();
    out.animate = (t) => {
      const k = decantRound(t, phaseOf(mouthAt));
      bottle.position.copy(F(k.bottle, v));
      // Tipped over to their left (-x here): the neck down towards the decanter.
      bottle.rotation.set(0, 0, k.tilt);
      dec.d.position.copy(F(boAdd(DECANT.decanter, k.swirl), v));
      dec.wine.scale.set(1, Math.max(0.02, k.fill), 1);
      flame.scale.set(0.7, 1.4 + 0.3 * Math.sin(t * 13), 0.7);
      stream.visible = k.pour > 0.5;
      if (stream.visible) {
        // The bottle's lip: up its neck from the grip, turned over with it.
        const L = 0.33 - DECANT.grip;
        const tip = bottle.position.clone().add(v3(-L * Math.sin(k.tilt), L * Math.cos(k.tilt), 0));
        const mouth = F(boAdd(DECANT.decanter, bo(0, DECANT.mouth - 0.02, 0)), v);
        const len = Math.max(0.01, tip.distanceTo(mouth));
        stream.position.copy(tip).add(mouth).multiplyScalar(0.5);
        stream.scale.set(1, len, 1);
        stream.quaternion.setFromUnitVectors(UP, tip.clone().sub(mouth).normalize());
      }
    };
  },

  /**
   * This month's magazines (이달의 잡지 진열대): an oak face-out rack, three slanted tiers of covers
   * — ours and the rivals' (월간 식객, 아트 저널, 와인 리뷰…) — its name on a board at the top.
   * Browsing the rivals: one taken down and leafed through.
   */
  critMagazineRack(g, _W, _D, _c, _def, _ctx, out) {
    const w = 0.86;
    const zb = -0.4;
    // The side boards, deep at the foot and slimming to the top as the tiers step back.
    for (const sx of [-1, 1]) {
      part(g, rbox(0.03, 0.55, 0.32, 0.008), OAK, sx * (w / 2 + 0.015), 0.275, zb + 0.16);
      part(g, rbox(0.03, 0.5, 0.26, 0.008), OAK, sx * (w / 2 + 0.015), 0.8, zb + 0.13);
      part(g, rbox(0.03, 0.5, 0.2, 0.008), OAK, sx * (w / 2 + 0.015), 1.3, zb + 0.1);
    }
    part(g, box(w, 1.46, 0.02), WALNUT, 0, 0.75, zb, { outline: false });
    label(g, '이달의 잡지', 0.5, 0.1, 0, 1.58, zb + 0.02, WALNUT_DARK, '#f3e5ab');
    part(g, box(w + 0.04, 0.12, 0.03), WALNUT_DARK, 0, 1.58, zb + 0.005);
    for (let tier = 0; tier < 3; tier++) {
      const y = 0.12 + tier * 0.46;
      const zf = zb + 0.26 - tier * 0.06;
      part(g, box(w - 0.02, 0.02, 0.06), OAK, 0, y, zf);
      part(g, box(w - 0.02, 0.05, 0.012), OAK, 0, y + 0.03, zf + 0.03);
      for (let c = 0; c < 3; c++) {
        const i = tier * 3 + c;
        const m = picture(g, painted(`crit-rack-${i}`, 192, 256, rackPaint(i)), 0.24, 0.32, (c - 1) * 0.27, y + 0.18, zf - 0.04, '#ffffff', 0, -0.22);
        m.rotation.x = -0.22;
      }
    }
    const workAt = marker(g, 0, 1.0, zb + 0.2);
    const st = () => spot(g, 'stand', 0.12, 0, 0.45, Math.PI + 0.35);
    out.spots = { critBrowseIssues: at(st(), workAt, 'read'), '*': at(st(), workAt, 'read') };
    out.work = workAt;
  },

  /**
   * An interview armchair (인터뷰 암체어): a mid-century chair, cognac leather cushions in a walnut
   * frame on tapered legs. The guest waits sat in it; interviewed (interviewChef, interviewArtist),
   * the critic takes the chair across the low table (two tiles out in front, facing back), notebook
   * on the knee, and the recorder on the table between them shows its red REC light.
   */
  critInterviewChair(g, _W, _D, _c, _def, _ctx, out) {
    const seatY = 0.46;
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        const top = v3(sx * 0.26, 0.2, sz * 0.24);
        rod(g, v3(sx * 0.3, 0.0, sz * 0.29), top, 0.018, WALNUT_DARK);
      }
    part(g, rbox(0.62, 0.06, 0.56, 0.02), WALNUT, 0, 0.23, 0);
    part(g, rbox(0.54, 0.14, 0.5, 0.05), LEATHER, 0, seatY - 0.07, 0.04);
    // The back, raked, and its cushion.
    part(g, rbox(0.6, 0.5, 0.05, 0.02), WALNUT, 0, 0.55, -0.27, { rx: -0.22 });
    part(g, rbox(0.52, 0.42, 0.1, 0.05), LEATHER, 0, 0.62, -0.2, { rx: -0.22 });
    for (const sx of [-1, 1]) {
      part(g, rbox(0.06, 0.03, 0.5, 0.012), WALNUT, sx * 0.31, 0.6, -0.01);
      rod(g, v3(sx * 0.31, 0.25, 0.2), v3(sx * 0.31, 0.6, 0.2), 0.014, WALNUT_DARK);
    }
    out.seat = marker(g, 0, seatY, 0.05);
    // The critic across the table: two tiles out, facing back; the REC light on the recorder between.
    const across = () => at(spot(g, 'sit', 0, seatY, 2 - 0.05, Math.PI, seatY), undefined, 'meeting');
    const spots: Record<string, Spot> = { 'social:interviewChef': across(), 'social:interviewArtist': across() };
    out.spots = spots;
    // (In a group out in front, so it isn't counted as part of the chair's body.)
    const recAt = new THREE.Group();
    recAt.position.set(0, 0, 1.0);
    g.add(recAt);
    const rec = glowing(recAt, ball(0.006), '#ff1744', 0, 0.522, 0);
    rec.visible = false;
    out.animate = (t) => {
      const on = nowAt(spots, t) !== null;
      rec.visible = on && Math.sin(t * Math.PI * 2 * 0.8) > -0.3;
    };
  },

  /**
   * The interview table (인터뷰 탁자): a low round walnut table between the armchairs, the voice
   * recorder lying at its middle, two glasses of water on coasters, this month's issue, the guest's
   * book and a bud vase.
   */
  critRecorderTable(g, _W, _D, _c, _def, _ctx, _out) {
    const top = 0.5;
    part(g, cyl(0.2, 0.22, 0.02, 24), WALNUT_DARK, 0, 0.01, 0);
    part(g, cyl(0.035, 0.045, top - 0.04, 12), WALNUT_DARK, 0, (top - 0.04) / 2 + 0.01, 0);
    part(g, cyl(0.32, 0.32, 0.03, 32), WALNUT, 0, top - 0.015, 0);
    // The recorder: silver, its grille at the top end, a little screen, the LED in the middle (the chair lights it).
    part(g, rbox(0.045, 0.018, 0.12, 0.008), '#b0bec5', 0, top + 0.009, 0);
    part(g, box(0.035, 0.002, 0.03), '#37474f', 0, top + 0.019, -0.035, { outline: false });
    glowing(g, box(0.03, 0.002, 0.022), '#80cbc4', 0, top + 0.019, 0.025);
    part(g, ball(0.006), '#5d1a1a', 0, top + 0.018, 0.0, { outline: false });
    for (const sx of [-1, 1]) {
      part(g, cyl(0.045, 0.045, 0.004, 16), '#d7ccc8', sx * 0.2, top + 0.002, 0.05);
      glass(g, cyl(0.03, 0.026, 0.1, 16), sx * 0.2, top + 0.054, 0.05);
      part(g, cyl(0.026, 0.023, 0.07, 14), '#b3e5fc', sx * 0.2, top + 0.04, 0.05, { outline: false });
    }
    picture(g, coverTex(1), 0.17, 0.23, 0.03, top + 0.003, 0.17, '#ffffff', 0, -Math.PI / 2).rotation.set(-Math.PI / 2, 0, 0.3);
    part(g, rbox(0.14, 0.03, 0.2, 0.006), '#283593', -0.06, top + 0.015, -0.17, { ry: -0.4 });
    part(g, box(0.13, 0.026, 0.004), PAPER, -0.06, top + 0.015, -0.17, { ry: -0.4, outline: false });
    part(g, cyl(0.02, 0.028, 0.09, 12), '#eceff1', 0.17, top + 0.045, -0.15);
    rod(g, v3(0.17, top + 0.08, -0.15), v3(0.18, top + 0.2, -0.14), 0.003, '#33691e');
    part(g, ball(0.022), '#fff59d', 0.18, top + 0.21, -0.14);
  },
};
