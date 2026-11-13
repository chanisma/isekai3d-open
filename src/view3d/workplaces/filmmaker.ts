import * as THREE from 'three';
import type { BarOffset, Motion } from '../activity';
import { marker, rod, shade, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, glass, glowing, label, painted, picture, ring, seeded, text, type Paint } from './doctor';
import {
  ADR_EAR,
  BALLS,
  BESIDE,
  CAM,
  EDIT,
  HEADSHOTS,
  SLATE,
  actionRound,
  adrRound,
  bo,
  camPivot,
  cameraRound,
  dailiesRound,
  editRound,
  fmPhase,
  gradeRound,
  headshotRound,
  premiereRound,
  sidesRound,
  slateRound,
} from './filmmakerMotion';

/**
 * The 영화 제작사 drawn as itself (2026-10-27 workplace pipeline, at the user's request): a Korean
 * film production company, 별빛필름 (made up, as are its films). The writers' desks with the
 * screenplay typing itself out line by line on a monitor turned on end, the bound drafts with their
 * brass brads, the index cards; the cinema camera on its fluid head and sticks on a doorway dolly on
 * a length of track — the matte box, the follow focus, the eyepiece set to whoever's at it, the
 * monitor on its arm (the take played back on it), the clapperboard hung on the push bar; the
 * editing suite with the bins and the timeline on two monitors, a reference monitor over them, the
 * jog wheel, the grading panel's trackballs; the screening room's screen between red curtains on its
 * little stage. And what it was missing (workFurniture/filmmaker.ts): the audition corner, the
 * production board, the poster wall, the props and costume rack, the test set, the ADR booth, the
 * screening seats and the actors' folding chairs.
 *
 * The motions are in filmmakerMotion.ts; each prop in a hand (the slate, the clipboard, the mic, a
 * headshot, the sides) is drawn here by the same round, at the spot it's done at.
 */

const WALNUT = '#5d4037';
const PAPER = '#fbfaf6';
const VELVET = '#8e1b25';
const GOLD = '#c9a227';
const RUBBER = '#1e1e22';
const GUNMETAL = '#3b3f46';
const COMPANY = '별빛필름';
const FILM = '한밤의 옥상';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);
const tmp = new THREE.Vector3();
const tmp2 = new THREE.Vector3();

// ---------------------------------------------------------------------------------------------
// Small parts.

const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
const posed = (s: Spot, t: number) => Math.abs(t - posedAt(s)) < 0.6;
const heightOf = (s: Spot) => (s.at.userData.height as number | undefined) ?? 1.6;
const phaseOf = (s: Spot) => fmPhase(s.at.getWorldPosition(tmp));
/** Of a piece's spots, the one used just now (the most lately), else null. */
function nowAt(list: Spot[], t: number): Spot | null {
  let best: Spot | null = null;
  for (const s of list) if (posed(s, t) && (!best || posedAt(s) > posedAt(best))) best = s;
  return best;
}
function standAt(g: THREE.Object3D, x: number, z: number, yaw: number, motion: Motion, work?: THREE.Object3D, y = 0): Spot {
  const s = spot(g, 'stand', x, y, z, yaw);
  s.work = work;
  s.motion = motion;
  return s;
}
function sitAt(g: THREE.Object3D, x: number, y: number, z: number, yaw: number, motion: Motion, work: THREE.Object3D): Spot {
  const s = spot(g, 'sit', x, y, z, yaw, y);
  s.work = work;
  s.motion = motion;
  return s;
}
function group(parent: THREE.Object3D, x: number, y: number, z: number, ry = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}
/** A group standing where a spot (or marker) is and turned as it is: inside it x is to the dweller's left, y up, z ahead. */
function holder(parent: THREE.Object3D, at: THREE.Object3D, yaw: number): THREE.Group {
  const h = group(parent, at.position.x, at.position.y, at.position.z, yaw);
  return h;
}
/** A picture's own unlit material. */
const matOf = (m: THREE.Mesh) => m.material as THREE.MeshBasicMaterial;
const place = (o: THREE.Object3D, b: BarOffset) => o.position.set(b.side, b.up, b.ahead);
/** Turns a held thing's face (+z) to the eyes of whoever's holding it (`eyes` in the holder's frame). */
function faceTo(o: THREE.Object3D, h: THREE.Object3D, eyes: BarOffset) {
  h.updateWorldMatrix(true, false);
  o.lookAt(h.localToWorld(tmp2.set(eyes.side, eyes.up, eyes.ahead)));
}
const eyesOf = (H: number, sitting = false) => bo(0, (sitting ? 0.53 : 0.93) * H, 0.06 * (H / 1.6));
function inUse(g: THREE.Object3D, out: Built): THREE.Group {
  const u = new THREE.Group();
  g.add(u);
  out.inUse = u;
  return u;
}
/** A unit rod along +y, stretched between two points each time it's set (a tripod leg that winds up). */
function stretchy(g: THREE.Object3D, r: number, color: string): THREE.Mesh {
  return part(g, cyl(r, r, 1, 8), color, 0, 0, 0, { outline: false });
}
function stretch(m: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3) {
  const d = b.clone().sub(a);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.scale.set(1, Math.max(d.length(), 1e-4), 1);
  m.quaternion.setFromUnitVectors(UP, d.normalize());
}
/** A sheet lying flat on a top (its head away from +z), turned `ry`. */
function flat(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0): THREE.Mesh {
  const m = picture(g, tex, w, h, x, y, z);
  m.rotation.order = 'YXZ';
  m.rotation.set(-Math.PI / 2, ry, 0);
  return m;
}
/** Whether a piece's animate ran just now (it runs only while it's used): for what `away` hides after. */
function liveClock() {
  let last = -1e9;
  return { mark: (t: number) => (last = t), on: (t: number) => t - last < 0.3 && t >= last };
}

/** A black mesh-backed office chair facing +z in its own group, its seat 0.48 up. */
function officeChair(g: THREE.Object3D, x: number, z: number, ry: number, seat = '#2f3136'): THREE.Group {
  const c = group(g, x, 0, z, ry);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    rod(c, V(0, 0.07, 0), V(Math.sin(a) * 0.27, 0.04, Math.cos(a) * 0.27), 0.014, BLACK);
    part(c, ball(0.025), RUBBER, Math.sin(a) * 0.27, 0.025, Math.cos(a) * 0.27, { outline: false });
  }
  part(c, cyl(0.025, 0.025, 0.34, 8), CHROME, 0, 0.24, 0, { outline: false });
  part(c, rbox(0.48, 0.07, 0.46, 0.03), seat, 0, 0.445, 0);
  part(c, rbox(0.44, 0.5, 0.04, 0.03), '#45484f', 0, 0.8, -0.22, { rx: -0.1 });
  part(c, box(0.38, 0.42, 0.006), '#5d6168', 0, 0.8, -0.197, { rx: -0.1, outline: false });
  for (const sx of [-1, 1]) {
    rod(c, V(sx * 0.22, 0.47, -0.05), V(sx * 0.24, 0.64, -0.02), 0.012, BLACK);
    part(c, rbox(0.05, 0.03, 0.24, 0.012), RUBBER, sx * 0.24, 0.65, 0.0);
  }
  return c;
}
/** A light on a stand: three legs, the pole up to `h` (at x, z). */
function lightStand(g: THREE.Object3D, x: number, z: number, h: number, spread = 0.24, color = '#2e2e33') {
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    rod(g, V(x, 0.36, z), V(x + Math.sin(a) * spread, 0.015, z + Math.cos(a) * spread), 0.01, color);
  }
  part(g, cyl(0.014, 0.014, h - 0.34, 8), CHROME, x, 0.34 + (h - 0.34) / 2, z, { outline: false });
  part(g, cyl(0.022, 0.022, 0.05, 8), color, x, 0.36, z, { outline: false });
}

// ---------------------------------------------------------------------------------------------
// What's painted.

function silhouette(c: CanvasRenderingContext2D, x: number, y: number, s: number, long: boolean, color = '#0d0f18') {
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(x, y - s * 0.7, s * 0.5, s * 0.78, 0, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(x, y - s * 1.65, s * 0.32, 0, Math.PI * 2);
  c.fill();
  if (long) c.fillRect(x - s * 0.34, y - s * 1.7, s * 0.68, s * 0.75);
}
/**
 * The film's shot: a rooftop at night (S#12 of 한밤의 옥상) — the sky from deep blue down to a pink
 * glow over the city, the towers with their lit windows, string lights over the ledge and the two of
 * them sat on it from behind.
 */
function drawScene(c: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, figures = true) {
  c.save();
  c.beginPath();
  c.rect(x0, y0, w, h);
  c.clip();
  const s = w / 512;
  const sky = c.createLinearGradient(0, y0, 0, y0 + h);
  sky.addColorStop(0, '#0b1030');
  sky.addColorStop(0.5, '#33275e');
  sky.addColorStop(0.78, '#c96c6e');
  sky.addColorStop(1, '#f0a36c');
  c.fillStyle = sky;
  c.fillRect(x0, y0, w, h);
  const r = seeded(11);
  c.fillStyle = '#ffffff';
  for (let i = 0; i < 50; i++) c.fillRect(x0 + r() * w, y0 + r() * h * 0.42, 1.4 * s + 0.4, 1.4 * s + 0.4);
  c.fillStyle = '#fdf3d0';
  c.beginPath();
  c.arc(x0 + w * 0.82, y0 + h * 0.16, h * 0.05, 0, Math.PI * 2);
  c.fill();
  let x = x0 - 5;
  while (x < x0 + w) {
    const bw = (16 + r() * 34) * s;
    const bh = h * 0.12 + r() * h * 0.34;
    c.fillStyle = r() > 0.5 ? '#151a33' : '#1d2140';
    const top = y0 + h * 0.8 - bh;
    c.fillRect(x, top, bw, bh + 2);
    for (let wy = top + 4 * s; wy < y0 + h * 0.79; wy += 7 * s)
      for (let wx = x + 3 * s; wx < x + bw - 3 * s; wx += 6 * s)
        if (r() > 0.58) {
          c.fillStyle = r() > 0.3 ? '#ffd27a' : '#bfe3ff';
          c.fillRect(wx, wy, 2.6 * s, 3.2 * s);
        }
    x += bw + 2 * s;
  }
  // The ledge, its parapet and the rail.
  c.fillStyle = '#2b2f3a';
  c.fillRect(x0, y0 + h * 0.8, w, h * 0.2);
  c.fillStyle = '#474d5c';
  c.fillRect(x0, y0 + h * 0.8, w, h * 0.025);
  // String lights in a loop across the top.
  c.strokeStyle = 'rgba(20,20,20,0.85)';
  c.lineWidth = 1.2 * s + 0.3;
  c.beginPath();
  for (let i = 0; i <= 24; i++) {
    const px = x0 + (i / 24) * w;
    const py = y0 + h * 0.08 + Math.sin((i / 24) * Math.PI) * h * 0.13;
    if (i) c.lineTo(px, py);
    else c.moveTo(px, py);
  }
  c.stroke();
  for (let i = 1; i < 24; i += 2) {
    const px = x0 + (i / 24) * w;
    const py = y0 + h * 0.08 + Math.sin((i / 24) * Math.PI) * h * 0.13 + 3 * s;
    c.fillStyle = 'rgba(255,220,140,0.35)';
    c.beginPath();
    c.arc(px, py, 6 * s, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ffe9a8';
    c.beginPath();
    c.arc(px, py, 2.4 * s, 0, Math.PI * 2);
    c.fill();
  }
  if (figures) {
    silhouette(c, x0 + w * 0.42, y0 + h * 0.82, h * 0.13, true);
    silhouette(c, x0 + w * 0.53, y0 + h * 0.82, h * 0.145, false);
  }
  c.restore();
}
/** The camera monitor: the shot with frame lines, a centre cross, REC, the scene and take, the settings and audio meters. */
function paintMonitor(play: boolean): Paint {
  return (c) => {
    c.fillStyle = '#000000';
    c.fillRect(0, 0, 320, 200);
    drawScene(c, 0, 14, 320, 172);
    if (play) {
      c.fillStyle = 'rgba(0,0,0,0.25)';
      c.fillRect(0, 14, 320, 172);
      text(c, '▶ PLAY  S#12-3  T2', 10, 26, 13, '#ffffff', 'left');
      c.fillStyle = 'rgba(255,255,255,0.3)';
      c.fillRect(10, 176, 300, 4);
      c.fillStyle = '#4fc3f7';
      c.fillRect(10, 176, 130, 4);
    } else {
      c.strokeStyle = 'rgba(255,255,255,0.75)';
      c.lineWidth = 1;
      c.strokeRect(14, 30, 292, 140);
      c.beginPath();
      c.moveTo(154, 100);
      c.lineTo(166, 100);
      c.moveTo(160, 94);
      c.lineTo(160, 106);
      c.stroke();
      c.fillStyle = '#ff3030';
      c.beginPath();
      c.arc(14, 7, 4, 0, Math.PI * 2);
      c.fill();
      text(c, 'REC', 22, 7, 10, '#ff5252', 'left');
      for (let i = 0; i < 2; i++) {
        c.fillStyle = '#263238';
        c.fillRect(4 + i * 6, 120, 4, 50);
        c.fillStyle = '#66bb6a';
        c.fillRect(4 + i * 6, 140 - i * 6, 4, 30 + i * 6);
      }
    }
    text(c, 'S#12  C3  T2', 316, 7, 10, '#ffffff', 'right');
    text(c, '24fps  ISO 800  5600K  T2.8', 160, 193, 10, '#e0e0e0', 'center', false);
  };
}
/** The script the screenplay desk types out, line by line (its layout shared with the masks that reveal it). */
type ScriptKind = 'scene' | 'action' | 'char' | 'paren' | 'dial';
const SCRIPT: Array<[ScriptKind, string]> = [
  ['scene', 'S#12. 옥상 / 밤'],
  ['action', '도시의 불빛이 내려다보이는 낡은 옥상.'],
  ['action', '지수, 난간에 걸터앉아 맥주캔을 굴린다.'],
  ['char', '지수'],
  ['dial', '다시는… 여기 안 올 줄 알았어.'],
  ['char', '현우'],
  ['paren', '(캔을 받아 들며)'],
  ['dial', '나도. 근데 별은 그대로네.'],
  ['action', '멀리서 지하철이 지나가는 소리.'],
  ['char', '지수'],
  ['dial', '그때 네가 안 떠났으면,'],
  ['dial', '우린 뭐가 달라졌을까.'],
  ['action', '현우, 대답 대신 하늘을 본다.'],
  ['scene', 'S#13. 지수의 방 / 새벽'],
  ['action', '알람이 울리기 전, 지수가 눈을 뜬다.'],
];
const SCRIPT_Y0 = 40;
const SCRIPT_DY = 20.5;
/** Where each kind of line runs across the page (px of 256). */
const SPAN: Record<ScriptKind, [number, number]> = { scene: [20, 236], action: [20, 236], char: [104, 152], paren: [86, 170], dial: [64, 192] };
const paintScriptScreen: Paint = (c) => {
  c.fillStyle = '#3c3f45';
  c.fillRect(0, 0, 256, 360);
  c.fillStyle = '#2b2d31';
  c.fillRect(0, 0, 256, 18);
  text(c, `${FILM}_3고.fdx — 시나리오`, 8, 9, 9, '#cfd8dc', 'left', false);
  c.fillStyle = PAPER;
  c.fillRect(8, 22, 240, 334);
  SCRIPT.forEach(([k, s], i) => {
    const y = SCRIPT_Y0 + i * SCRIPT_DY;
    const [x0] = SPAN[k];
    const center = k === 'char' || k === 'paren';
    text(c, s, center ? 128 : x0, y, k === 'scene' ? 11 : 10, k === 'paren' ? '#555555' : '#1a1a1a', center ? 'center' : 'left', k === 'scene' || k === 'char');
  });
  text(c, '- 37 -', 128, 348, 9, '#888888', 'center', false);
};
/** A printed draft's cover. */
const paintScriptCover: Paint = (c) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 256, 362);
  text(c, FILM, 128, 130, 30, '#1a1a1a', 'center');
  text(c, '시나리오 3고', 128, 172, 15, '#444444', 'center', false);
  text(c, COMPANY, 128, 320, 13, '#666666', 'center');
  c.fillStyle = '#b08d3c';
  for (const y of [40, 322]) {
    c.beginPath();
    c.arc(24, y, 6, 0, Math.PI * 2);
    c.fill();
  }
};
/** The research folder open on the desk: clippings, a photo, highlights, a note. */
const paintClippings: Paint = (c) => {
  c.fillStyle = '#efe6cf';
  c.fillRect(0, 0, 512, 360);
  c.fillStyle = '#c9bb98';
  c.fillRect(254, 0, 4, 360);
  const clip = (x: number, y: number, w: number, h: number, head: string, rot: number, seed: number) => {
    c.save();
    c.translate(x + w / 2, y + h / 2);
    c.rotate(rot);
    c.fillStyle = '#f7f3e8';
    c.fillRect(-w / 2, -h / 2, w, h);
    text(c, head, -w / 2 + 8, -h / 2 + 14, 13, '#1a1a1a', 'left');
    const r = seeded(seed);
    for (let i = 0; i < (h - 34) / 9; i++) {
      c.fillStyle = '#9e9e9e';
      c.fillRect(-w / 2 + 8, -h / 2 + 30 + i * 9, (w - 16) * (0.6 + r() * 0.4), 3);
      if (r() > 0.75) {
        c.fillStyle = 'rgba(255,235,59,0.55)';
        c.fillRect(-w / 2 + 6, -h / 2 + 28 + i * 9, (w - 12) * 0.7, 7);
      }
    }
    c.restore();
  };
  clip(16, 18, 220, 150, '항구 화재 30년, 끝나지 않은 이야기', -0.03, 3);
  clip(24, 190, 210, 150, '1996년 화재 생존자 인터뷰', 0.02, 5);
  clip(276, 24, 216, 120, '당시 소방 기록 공개', 0.025, 7);
  c.fillStyle = '#5d6b78';
  c.fillRect(290, 168, 180, 110);
  silhouette(c, 380, 270, 30, false, '#2d3640');
  text(c, '당시 현장 사진', 380, 292, 11, '#3e2723', 'center', false);
  c.fillStyle = '#fff59d';
  c.save();
  c.translate(430, 318);
  c.rotate(-0.06);
  c.fillRect(-60, -28, 120, 56);
  text(c, '연도 다시 확인!', 0, -6, 13, '#c62828', 'center');
  text(c, '→ 소방서 문의', 0, 14, 11, '#37474f', 'center', false);
  c.restore();
};
/** The edit's composer: the source and record viewers, timecodes and the transport. */
const paintComposer: Paint = (c) => {
  c.fillStyle = '#2b2d33';
  c.fillRect(0, 0, 512, 288);
  c.fillStyle = '#1d1f24';
  c.fillRect(0, 0, 512, 16);
  text(c, `${FILM} · 편집본 v07`, 8, 8, 10, '#cfd8dc', 'left', false);
  for (const [i, lab] of [[0, '소스 · S12-3 T2'], [1, '레코드 · 시퀀스 v07']] as const) {
    const x = 8 + i * 252;
    c.fillStyle = '#000000';
    c.fillRect(x, 24, 244, 160);
    drawScene(c, x, 50, 244, 104);
    text(c, lab, x + 4, 196, 10, '#b0bec5', 'left', false);
    text(c, i ? '01:02:14:08' : '12:41:03:17', x + 240, 196, 11, i ? '#ffd54f' : '#80deea', 'right');
    c.fillStyle = '#3a3d44';
    c.fillRect(x, 208, 244, 18);
    c.fillStyle = '#8a8f99';
    c.fillRect(x + 4, 215, 236, 4);
    c.fillStyle = '#4fc3f7';
    c.fillRect(x + 4 + (i ? 150 : 60), 211, 3, 12);
  }
  ['◀◀', '◀', '■', '▶', '▶▶', '[ ]', '✂'].forEach((s, i) => text(c, s, 120 + i * 42, 248, 14, '#e0e0e0', 'center'));
  text(c, '마크 인 01:02:10:00   마크 아웃 01:02:16:12   길이 00:00:06:12', 256, 274, 10, '#9e9e9e', 'center', false);
};
/** The timeline monitor: the bins of the day's takes over the timeline's tracks (the playhead drawn over it). */
const TL = { x0: 64, x1: 504, y0: 150, y1: 282 };
const paintTimeline: Paint = (c) => {
  c.fillStyle = '#26282d';
  c.fillRect(0, 0, 512, 288);
  c.fillStyle = '#1d1f24';
  c.fillRect(0, 0, 512, 16);
  text(c, '빈: DAY12 옥상(밤)', 8, 8, 10, '#cfd8dc', 'left', false);
  for (let i = 0; i < 12; i++) {
    const x = 8 + (i % 6) * 84;
    const y = 22 + Math.floor(i / 6) * 60;
    c.fillStyle = '#000000';
    c.fillRect(x, y, 76, 42);
    drawScene(c, x, y, 76, 42, i % 3 !== 2);
    text(c, `S12-${Math.floor(i / 3) + 1} T${(i % 3) + 1}`, x + 2, y + 50, 9, i === 7 ? '#ffd54f' : '#b0bec5', 'left', false);
  }
  c.fillStyle = '#1b1c20';
  c.fillRect(0, 140, 512, 148);
  c.fillStyle = '#33363d';
  c.fillRect(TL.x0, 140, TL.x1 - TL.x0, 10);
  for (let i = 0; i <= 10; i++) {
    c.fillStyle = '#8a8f99';
    c.fillRect(TL.x0 + i * 44, 140, 1, 8);
  }
  const tracks: Array<[string, string]> = [['V2', '#7e57c2'], ['V1', '#4a7fc1'], ['A1', '#3c9a5f'], ['A2', '#3c9a5f'], ['A3', '#2e7d6b'], ['A4', '#b8873b']];
  const r = seeded(19);
  tracks.forEach(([n, col], i) => {
    const y = TL.y0 + 4 + i * 21;
    text(c, n, 30, y + 8, 10, '#cfd8dc', 'center');
    let x = TL.x0 + (i === 0 ? 120 : 0);
    while (x < TL.x1 - 10) {
      const w = 30 + r() * 70;
      if (i === 0 && x > TL.x0 + 300) break;
      c.fillStyle = col;
      c.fillRect(x, y, Math.min(w, TL.x1 - x) - 2, 17);
      c.fillStyle = 'rgba(255,255,255,0.18)';
      c.fillRect(x, y, Math.min(w, TL.x1 - x) - 2, 4);
      if (i >= 2) {
        c.strokeStyle = 'rgba(0,0,0,0.35)';
        c.beginPath();
        for (let k = 0; k < w - 4; k += 3) c.lineTo(x + k, y + 9 + Math.sin(k * 0.7 + i) * 5 * r());
        c.stroke();
      }
      x += w;
    }
  });
};
/** The grade: the shot with its scopes, the three wheels. */
const paintGrade: Paint = (c) => {
  c.fillStyle = '#202226';
  c.fillRect(0, 0, 512, 288);
  c.fillStyle = '#000000';
  c.fillRect(8, 8, 300, 168);
  drawScene(c, 8, 22, 300, 140);
  c.fillStyle = '#0c0c0c';
  c.fillRect(316, 8, 188, 168);
  const r = seeded(29);
  for (let x = 0; x < 180; x += 2)
    for (let k = 0; k < 6; k++) {
      c.fillStyle = k % 3 === 0 ? 'rgba(255,90,90,0.5)' : k % 3 === 1 ? 'rgba(90,255,120,0.5)' : 'rgba(90,150,255,0.5)';
      c.fillRect(320 + x, 30 + 120 * (0.35 + 0.4 * Math.sin(x * 0.04 + k) * r()), 2, 2);
    }
  text(c, '파형', 324, 18, 10, '#9e9e9e', 'left', false);
  ['리프트', '감마', '게인'].forEach((s, i) => {
    const x = 90 + i * 150;
    const gr = c.createRadialGradient(x, 228, 2, x, 228, 40);
    gr.addColorStop(0, '#ffffff');
    gr.addColorStop(0.5, ['#4fc3f7', '#aed581', '#ffb74d'][i]);
    gr.addColorStop(1, '#3a3d44');
    c.fillStyle = gr;
    c.beginPath();
    c.arc(x, 228, 40, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(x + [-8, 4, 10][i], 228 + [6, -3, -6][i], 4, 0, Math.PI * 2);
    c.fill();
    text(c, s, x, 280, 10, '#cfd8dc', 'center', false);
  });
};
const paintScene = (w: number, h: number): Paint => (c) => drawScene(c, 0, 0, w, h);
/** The dailies on the screen: the shot, its burnt-in slate and timecode. */
const paintDailies: Paint = (c) => {
  drawScene(c, 0, 0, 768, 320);
  c.fillStyle = 'rgba(0,0,0,0.55)';
  c.fillRect(0, 290, 768, 30);
  text(c, 'DAY 12 · S#12-3 · TAKE 2', 14, 305, 16, '#ffffff', 'left');
  text(c, '01:02:14:08', 754, 305, 18, '#ffd54f', 'right');
  text(c, `${COMPANY} 대외비 · 러시`, 754, 16, 12, 'rgba(255,255,255,0.6)', 'right', false);
};
/** The premiere's title card. */
const paintTitleCard: Paint = (c) => {
  c.fillStyle = '#06070c';
  c.fillRect(0, 0, 768, 320);
  const g = c.createRadialGradient(384, 160, 20, 384, 160, 380);
  g.addColorStop(0, 'rgba(70,60,120,0.6)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 768, 320);
  text(c, `${COMPANY} 제공`, 384, 70, 18, '#cfc6a8', 'center', false);
  text(c, FILM, 384, 148, 64, '#ffffff', 'center');
  text(c, '언론 · 배급 시사회', 384, 216, 24, GOLD, 'center');
  text(c, '그날 밤, 우리는 같은 별을 봤다', 384, 268, 16, '#b0b0c8', 'center', false);
};
/** One of the auditioning actors' headshots: their face over a soft backdrop, the name and the details. */
function paintHeadshot(i: number): Paint {
  const people = [
    { name: '김하늘', bg: '#c9d6df', hair: '#2b1b10', top: '#ffffff', long: true },
    { name: '박서진', bg: '#e8d8c8', hair: '#3b2a20', top: '#37474f', long: false },
    { name: '오아린', bg: '#d7e3d0', hair: '#1a1a1a', top: '#8d6e63', long: false },
  ];
  const p = people[i % people.length];
  return (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 160, 208);
    const g = c.createRadialGradient(80, 80, 10, 80, 90, 110);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, p.bg);
    c.fillStyle = g;
    c.fillRect(8, 8, 144, 160);
    c.fillStyle = p.top;
    c.beginPath();
    c.ellipse(80, 168, 58, 40, 0, Math.PI, 0);
    c.fill();
    c.fillStyle = '#f1c9a5';
    c.fillRect(70, 108, 20, 26);
    c.beginPath();
    c.ellipse(80, 88, 26, 32, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = p.hair;
    c.beginPath();
    c.ellipse(80, 74, 29, 24, 0, Math.PI, 0);
    c.fill();
    if (p.long) c.fillRect(51, 72, 12, 54), c.fillRect(97, 72, 12, 54);
    c.fillStyle = '#3b2b2b';
    c.fillRect(68, 88, 6, 4);
    c.fillRect(86, 88, 6, 4);
    text(c, p.name, 80, 184, 15, '#1a1a1a', 'center');
    text(c, '배우 · 프로필', 80, 200, 10, '#757575', 'center', false);
  };
}
const headshot = (i: number) => painted(`fm-headshot|${i % 3}`, 160, 208, paintHeadshot(i));
/** The casting sheet on the laptop. */
const paintCasting: Paint = (c) => {
  c.fillStyle = '#f5f6f8';
  c.fillRect(0, 0, 320, 200);
  c.fillStyle = '#37474f';
  c.fillRect(0, 0, 320, 24);
  text(c, '2차 오디션 · 지수 역', 10, 12, 12, '#ffffff', 'left');
  const rows: Array<[string, string, string]> = [['김하늘', '27', '◎'], ['박서진', '25', '○'], ['오아린', '29', '△'], ['윤수아', '26', '○'], ['정민서', '24', '—']];
  ['이름', '나이', '평가'].forEach((s, i) => text(c, s, [16, 150, 250][i], 38, 11, '#607d8b', 'left'));
  rows.forEach(([n, a, m], i) => {
    const y = 60 + i * 27;
    c.fillStyle = i % 2 ? '#ffffff' : '#eceff1';
    c.fillRect(6, y - 12, 308, 24);
    text(c, n, 16, y, 12, '#263238', 'left', false);
    text(c, a, 150, y, 12, '#263238', 'left', false);
    text(c, m, 254, y, 14, m === '◎' ? '#c62828' : '#37474f', 'left');
  });
};
/** The audition notes on the table: names, the scene read, scores. */
const paintSheet: Paint = (c) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 256, 180);
  text(c, '오디션 평가표 — S#12', 12, 16, 13, '#1a1a1a', 'left');
  for (let i = 0; i < 6; i++) {
    c.fillStyle = '#cfd8dc';
    c.fillRect(12, 36 + i * 22, 232, 1);
    c.fillStyle = '#5c6bc0';
    c.fillRect(16, 42 + i * 22, 50 + ((i * 37) % 60), 3);
    c.fillRect(170, 42 + i * 22, 20 + ((i * 23) % 40), 3);
  }
};
/** The production board: October's shoot by 회차, the locations, today ringed. */
const paintSchedule: Paint = (c) => {
  c.fillStyle = '#fbfbf9';
  c.fillRect(0, 0, 640, 360);
  text(c, `「${FILM}」 촬영 일정 · 10월`, 16, 22, 22, '#1a237e', 'left');
  text(c, '총 30회차 · 현재 12회차 · D-18', 624, 22, 15, '#c62828', 'right');
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const x0 = 16;
  const y0 = 48;
  const cw = 64;
  const ch = 56;
  days.forEach((d, i) => text(c, d, x0 + i * cw + cw / 2, y0 + 8, 13, i === 0 ? '#c62828' : '#37474f', 'center'));
  const spots: Record<number, [string, string]> = {
    20: ['8회 항구', '#90caf9'], 21: ['9회 항구', '#90caf9'], 22: ['10회 시장', '#a5d6a7'], 23: ['휴차', '#e0e0e0'], 24: ['11회 학교', '#ffe082'], 26: ['리허설', '#ce93d8'],
    27: ['12회 옥상(밤)', '#f48fb1'], 28: ['13회 지수 방', '#ffcc80'], 29: ['14회 지수 방', '#ffcc80'], 30: ['15회 버스', '#80cbc4'], 31: ['16회 옥상', '#f48fb1'],
  };
  for (let d = 1; d <= 31; d++) {
    const cell = d + 2;
    const cx = x0 + (cell % 7) * cw;
    const cy = y0 + 18 + Math.floor(cell / 7) * ch;
    c.strokeStyle = '#b0bec5';
    c.lineWidth = 1;
    c.strokeRect(cx, cy, cw, ch);
    text(c, String(d), cx + 5, cy + 9, 11, '#455a64', 'left', false);
    const s = spots[d];
    if (s) {
      c.fillStyle = s[1];
      c.fillRect(cx + 3, cy + 22, cw - 6, 22);
      text(c, s[0], cx + cw / 2, cy + 33, 10, '#1a1a1a', 'center');
    }
    if (d === 27) {
      c.strokeStyle = '#e53935';
      c.lineWidth = 3;
      c.beginPath();
      c.ellipse(cx + cw / 2, cy + ch / 2, cw / 2 + 2, ch / 2 + 2, 0, 0, Math.PI * 2);
      c.stroke();
    }
  }
  const lx = 474;
  text(c, '스태프', lx, 66, 14, '#1a237e', 'left');
  ['연출 · 감독', '촬영 · 편세윤', '편집 · 구다온', '제작 · 나영길', '조명 · 한빛조명', '동시녹음 · 윤민결'].forEach((s, i) => text(c, s, lx, 90 + i * 20, 12, '#37474f', 'left', false));
  text(c, '로케이션', lx, 222, 14, '#1a237e', 'left');
  ['옥상 · 망원동', '항구 · 인천', '학교 · 수원'].forEach((s, i) => text(c, s, lx, 244 + i * 20, 12, '#37474f', 'left', false));
};
/** Today's call sheet pinned on the board. */
const paintCallSheet: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 256, 362);
  c.fillStyle = '#263238';
  c.fillRect(0, 0, 256, 34);
  text(c, '일일촬영계획표 · 12회차', 128, 17, 14, '#ffffff', 'center');
  const rows: Array<[string, string]> = [['날짜', '10월 27일 (화)'], ['집합', '17:30 망원동 옥상'], ['일몰', '17:42'], ['날씨', '맑음 · 14℃'], ['씬', 'S#12, S#16'], ['배우', '지수, 현우'], ['준비물', '맥주캔, 전구줄']];
  rows.forEach(([a, b], i) => {
    const y = 56 + i * 32;
    text(c, a, 14, y, 12, '#607d8b', 'left');
    text(c, b, 80, y, 13, '#1a1a1a', 'left', false);
    c.fillStyle = '#eceff1';
    c.fillRect(10, y + 14, 236, 1);
  });
  text(c, '안전 제일 · 옥상 난간 주의!', 128, 336, 12, '#c62828', 'center');
};
/** A location photo pinned up. */
function paintLocation(kind: number): Paint {
  return (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 128, 144);
    if (kind === 0) drawScene(c, 6, 6, 116, 108, false);
    else {
      const g = c.createLinearGradient(0, 6, 0, 114);
      g.addColorStop(0, kind === 1 ? '#8fb8d8' : '#f3d9a4');
      g.addColorStop(1, kind === 1 ? '#3f6d8f' : '#c9a36a');
      c.fillStyle = g;
      c.fillRect(6, 6, 116, 108);
      c.fillStyle = '#2b2f3a';
      if (kind === 1) {
        c.fillRect(20, 40, 6, 74);
        c.fillRect(20, 40, 70, 5);
        c.fillRect(84, 44, 2, 30);
        c.fillStyle = '#b71c1c';
        c.fillRect(40, 86, 60, 28);
      } else for (let i = 0; i < 4; i++) c.fillRect(12 + i * 28, 60, 20, 54);
    }
    text(c, ['옥상', '항구', '학교'][kind], 64, 130, 13, '#37474f', 'center');
  };
}
/** The company's films' posters. */
type PosterKind = 'roof' | 'harbor' | 'hero';
function paintPoster(kind: PosterKind): Paint {
  return (c) => {
    const laurel = (x: number, y: number, col: string) => {
      c.strokeStyle = col;
      c.lineWidth = 2;
      for (const s of [-1, 1]) {
        c.beginPath();
        c.arc(x + s * 18, y, 18, s < 0 ? Math.PI * 0.55 : -Math.PI * 0.45, s < 0 ? Math.PI * 1.45 : Math.PI * 0.45);
        c.stroke();
      }
      text(c, '국제영화제', x, y - 4, 8, col, 'center');
      text(c, '공식 초청', x, y + 7, 8, col, 'center');
    };
    const credits = (col: string) => {
      for (let i = 0; i < 3; i++) {
        c.fillStyle = col;
        c.fillRect(30, 352 + i * 6, 196, 2);
      }
      text(c, COMPANY, 128, 376, 10, col, 'center');
    };
    if (kind === 'roof') {
      drawScene(c, 0, 0, 256, 300);
      c.fillStyle = '#0b0d18';
      c.fillRect(0, 300, 256, 84);
      text(c, '그날 밤, 우리는 같은 별을 봤다', 128, 24, 11, '#f3e5f5', 'center', false);
      text(c, FILM, 128, 322, 30, '#ffffff', 'center');
      laurel(50, 64, '#e8c766');
      credits('#9e9eb8');
    } else if (kind === 'harbor') {
      const g = c.createLinearGradient(0, 0, 0, 384);
      g.addColorStop(0, '#2a0508');
      g.addColorStop(0.6, '#8b1010');
      g.addColorStop(1, '#120203');
      c.fillStyle = g;
      c.fillRect(0, 0, 256, 384);
      c.fillStyle = '#0b0b0b';
      c.fillRect(150, 70, 10, 200);
      c.fillRect(70, 70, 150, 10);
      c.fillRect(70, 80, 3, 60);
      c.fillRect(0, 262, 256, 40);
      silhouette(c, 96, 300, 52, false, '#050505');
      text(c, '그 밤, 항구에서 사라진 것', 128, 28, 11, '#ffcdd2', 'center', false);
      text(c, '붉은 항구', 128, 330, 34, '#ff5252', 'center');
      credits('#ef9a9a');
    } else {
      c.fillStyle = '#ffd54f';
      c.fillRect(0, 0, 256, 384);
      c.fillStyle = '#ffb300';
      for (let i = 0; i < 16; i++) {
        c.beginPath();
        c.moveTo(128, 160);
        c.arc(128, 160, 260, (i / 16) * Math.PI * 2, ((i + 0.5) / 16) * Math.PI * 2);
        c.fill();
      }
      c.fillStyle = '#e53935';
      c.beginPath();
      c.moveTo(108, 150);
      c.lineTo(70, 270);
      c.lineTo(186, 270);
      c.lineTo(148, 150);
      c.fill();
      c.fillStyle = '#1e88e5';
      c.fillRect(110, 150, 36, 70);
      c.fillStyle = '#f1c9a5';
      c.beginPath();
      c.arc(128, 128, 22, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#3b2a20';
      c.beginPath();
      c.ellipse(128, 118, 24, 14, 0, Math.PI, 0);
      c.fill();
      text(c, '망토는 엄마가 만들어 줬다', 128, 28, 11, '#5d4037', 'center', false);
      text(c, '우리 동네 히어로', 128, 318, 28, '#b71c1c', 'center');
      credits('#6d4c41');
    }
  };
}
/** The clapperboard's slate. */
const paintSlate: Paint = (c) => {
  c.fillStyle = '#16171a';
  c.fillRect(0, 0, 256, 200);
  c.strokeStyle = '#f5f5f5';
  c.lineWidth = 2;
  for (const y of [34, 118, 152]) {
    c.beginPath();
    c.moveTo(6, y);
    c.lineTo(250, y);
    c.stroke();
  }
  for (const x of [86, 170]) {
    c.beginPath();
    c.moveTo(x, 34);
    c.lineTo(x, 118);
    c.stroke();
  }
  text(c, `${COMPANY} · ${FILM}`, 128, 18, 15, '#f5f5f5', 'center');
  ['씬', '컷', '테이크'].forEach((s, i) => {
    text(c, s, 10 + i * 84, 46, 11, '#bdbdbd', 'left');
    text(c, ['12', '3', '2'][i], 46 + i * 84, 86, 40, '#ffffff', 'center');
  });
  text(c, '촬영 편세윤 · 동시녹음 윤민결', 10, 135, 12, '#e0e0e0', 'left', false);
  text(c, '2026.10.27  밤 · 외부  24fps', 10, 172, 12, '#e0e0e0', 'left', false);
};
const paintStripes: Paint = (c) => {
  c.fillStyle = '#f5f5f5';
  c.fillRect(0, 0, 256, 24);
  c.fillStyle = '#111111';
  for (let x = -24; x < 256; x += 32) {
    c.beginPath();
    c.moveTo(x, 24);
    c.lineTo(x + 16, 0);
    c.lineTo(x + 32, 0);
    c.lineTo(x + 16, 24);
    c.fill();
  }
};
/** The shot list on the director's clipboard. */
const paintShotList: Paint = (c) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 256, 340);
  text(c, '샷 리스트 · S#12 옥상', 12, 18, 14, '#1a1a1a', 'left');
  const shots = ['C1 와이드 · 옥상 전경', 'C2 투샷 · 난간', 'C3 지수 바스트', 'C4 현우 바스트', 'C5 인서트 · 맥주캔', 'C6 하늘 · 별'];
  shots.forEach((s, i) => {
    const y = 50 + i * 44;
    c.strokeStyle = '#455a64';
    c.lineWidth = 2;
    c.strokeRect(12, y - 9, 16, 16);
    if (i < 2) {
      c.strokeStyle = '#2e7d32';
      c.beginPath();
      c.moveTo(14, y);
      c.lineTo(20, y + 6);
      c.lineTo(30, y - 10);
      c.stroke();
    }
    text(c, s, 38, y, 13, i === 2 ? '#c62828' : '#263238', 'left', i === 2);
  });
};
/** The night city through the set's window (its backing). */
const paintBacking: Paint = (c) => drawScene(c, 0, 0, 256, 320, false);
/** The test set's old wallpaper. */
const paintWallpaper: Paint = (c) => {
  c.fillStyle = '#d9c7a3';
  c.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 64) {
    c.fillStyle = 'rgba(160,120,80,0.18)';
    c.fillRect(x, 0, 22, 512);
  }
  c.fillStyle = 'rgba(120,80,50,0.35)';
  for (let y = 24; y < 512; y += 64)
    for (let x = 32 + ((y / 64) % 2) * 32; x < 512; x += 64) {
      c.beginPath();
      c.ellipse(x, y, 7, 11, 0, 0, Math.PI * 2);
      c.fill();
    }
};
/** The ADR booth's foam: wedges in a checker. */
const paintFoam: Paint = (c) => {
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      const g = (x + y) % 2 ? c.createLinearGradient(x * 32, 0, x * 32 + 32, 0) : c.createLinearGradient(0, y * 32, 0, y * 32 + 32);
      g.addColorStop(0, '#3a3e45');
      g.addColorStop(0.5, '#5a606a');
      g.addColorStop(1, '#2c2f35');
      c.fillStyle = g;
      c.fillRect(x * 32, y * 32, 32, 32);
    }
};
/** The ADR line on its stand. */
const paintAdrScript: Paint = (c) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 256, 200);
  text(c, 'ADR 큐시트 · 릴 3', 12, 16, 13, '#1a1a1a', 'left');
  const cues: Array<[string, string]> = [['01:02:14:08', '지수: 다시는… 여기 안 올 줄 알았어.'], ['01:02:19:20', '현우: 나도. 근데 별은 그대로네.'], ['01:02:31:02', '지수: (한숨) …그랬구나.']];
  cues.forEach(([tc, s], i) => {
    text(c, tc, 12, 48 + i * 48, 11, '#c62828', 'left');
    text(c, s, 12, 66 + i * 48, 11, '#263238', 'left', false);
  });
};

// ---------------------------------------------------------------------------------------------
// Things held.

/** A clapperboard in its own group (the slate's middle at the origin, facing +z), its sticks hinged at SLATE.hinge. */
function clapper(g: THREE.Object3D) {
  const root = new THREE.Group();
  g.add(root);
  part(root, box(SLATE.w, SLATE.h, 0.012), '#16171a', 0, 0, 0);
  picture(root, painted('fm-slate', 256, 200, paintSlate), SLATE.w - 0.01, SLATE.h - 0.01, 0, 0, 0.0065);
  part(root, box(SLATE.w, 0.024, 0.014), '#f5f5f5', 0, SLATE.h / 2 + 0.002, 0);
  picture(root, painted('fm-stripes', 256, 24, paintStripes), SLATE.w, 0.024, 0, SLATE.h / 2 + 0.002, 0.0075);
  const stick = group(root, SLATE.hinge.side, SLATE.hinge.up + 0.006, 0);
  part(stick, box(SLATE.w, 0.024, 0.014), '#f5f5f5', -SLATE.w / 2, 0.012, 0);
  picture(stick, painted('fm-stripes', 256, 24, paintStripes), SLATE.w, 0.024, -SLATE.w / 2, 0.012, 0.0075);
  part(root, cyl(0.008, 0.008, 0.02, 8), CHROME, SLATE.hinge.side, SLATE.hinge.up, 0, { rx: Math.PI / 2, outline: false });
  return { root, stick };
}
/** A clipboard with the shot list, facing +z, its middle at the origin. */
function clipboard(g: THREE.Object3D, tex: THREE.Texture): THREE.Group {
  const c = new THREE.Group();
  g.add(c);
  part(c, rbox(0.23, 0.31, 0.008, 0.008), '#a1887f', 0, 0, 0);
  picture(c, tex, 0.21, 0.28, 0, -0.01, 0.0055);
  part(c, rbox(0.09, 0.03, 0.016, 0.006), CHROME, 0, 0.14, 0.006);
  return c;
}
/** A hand mic, its head at the origin, the handle down -y. */
function handMic(g: THREE.Object3D): THREE.Group {
  const m = new THREE.Group();
  g.add(m);
  part(m, ball(0.03), '#9e9e9e', 0, 0, 0);
  part(m, cyl(0.032, 0.022, 0.03, 14), '#424242', 0, -0.03, 0, { outline: false });
  part(m, cyl(0.02, 0.015, 0.15, 12), '#212121', 0, -0.11, 0);
  return m;
}
/** Over-ear headphones on the head (in a holder at the spot, for someone `H` tall), the cups at ADR_EAR. */
function headphones(g: THREE.Object3D): { root: THREE.Group; fit: (H: number) => void } {
  const root = new THREE.Group();
  g.add(root);
  const inner = group(root, 0, 0, 0);
  part(inner, ring(ADR_EAR.side + 0.01, 0.012, Math.PI), '#2b2b30', 0, 0, 0, { outline: false });
  for (const sx of [-1, 1]) {
    part(inner, cyl(0.04, 0.04, 0.03, 16), '#2b2b30', sx * (ADR_EAR.side + 0.012), -0.02, 0, { rz: Math.PI / 2 });
    part(inner, cyl(0.034, 0.034, 0.012, 16), '#5e6168', sx * (ADR_EAR.side - 0.005), -0.02, 0, { rz: Math.PI / 2, outline: false });
  }
  return {
    root,
    fit(H: number) {
      const k = H / 1.6;
      inner.scale.setScalar(k);
      inner.position.set(0, H - ADR_EAR.down * k + 0.02 * k, ADR_EAR.ahead * k);
    },
  };
}

// ---------------------------------------------------------------------------------------------
// The pieces.

/** A monitor on the desk: its stand and bezel, a dark face, and its picture in `use` (lit while it's used). */
function deskMonitor(g: THREE.Object3D, use: THREE.Object3D, x: number, y: number, z: number, ry: number, w: number, h: number, tex: THREE.Texture, top: number) {
  const m = group(g, x, y, z, ry);
  part(m, rbox(w + 0.03, h + 0.03, 0.03, 0.01), BLACK, 0, 0, 0);
  part(m, box(w, h, 0.004), '#1b1f27', 0, 0, 0.0155, { outline: false });
  part(g, rbox(0.2, 0.012, 0.15, 0.006), BLACK, x, top + 0.006, z - 0.02);
  part(g, rbox(0.04, y - top - h / 2, 0.03, 0.008), BLACK, x, top + (y - top - h / 2) / 2, z - 0.035);
  const u = group(use, x, y, z, ry);
  const pic = picture(u, tex, w, h, 0, 0, 0.018);
  return { frame: u, pic };
}

/** A shared page-white for the masks over a screenplay being typed. */
const PAGE = new THREE.MeshBasicMaterial({ color: PAPER });
const CURSOR = new THREE.MeshBasicMaterial({ color: '#1a1a1a' });
const UNIT = new THREE.PlaneGeometry(1, 1);

export const BUILDERS: Record<string, Builder> = {
  /**
   * A screenwriter's desk (시나리오 책상): a walnut slab on black steel trestles, the monitor turned on
   * end with the draft open, typed out line by line as it's written (the scene heading, the action,
   * the names and their lines, a blinking cursor at the end), the keyboard, the printed drafts bound
   * with brass brads, index cards pinned on a little cork board, a pencil cup, a mug, an anglepoise,
   * the research folder. Written sat in the mesh chair, typing; facts checked with the folder open
   * beside the keyboard — the clippings highlighted, a sticky note — writing notes on them.
   */
  screenplayDesk(g, W, D, _c, _def, _ctx, out) {
    const w = Math.min(W - 0.06, 0.96);
    const d = 0.6;
    const h = 0.74;
    const zc = -D / 2 + d / 2 + 0.03;
    const zf = zc + d / 2;
    const top = h + 0.02;
    part(g, rbox(w, 0.04, d, 0.012), WALNUT, 0, h, zc);
    part(g, box(w - 0.02, 0.004, d - 0.02), shade(WALNUT, 1.15), 0, h + 0.021, zc, { outline: false });
    for (const sx of [-1, 1]) {
      const x = sx * (w / 2 - 0.08);
      rod(g, V(x, 0.02, zc - d / 2 + 0.06), V(x, h - 0.02, zc - 0.05), 0.016, BLACK);
      rod(g, V(x, 0.02, zc + d / 2 - 0.06), V(x, h - 0.02, zc + 0.05), 0.016, BLACK);
      part(g, box(0.04, 0.03, d - 0.08), BLACK, x, 0.02, zc);
    }
    part(g, box(w - 0.2, 0.025, 0.025), BLACK, 0, 0.3, zc);
    // The monitor on end with the draft, dark until it's used.
    const use = inUse(g, out);
    const mx = -0.06;
    const mz = zc - 0.16;
    const pw = 0.33;
    const ph = 0.46;
    const sy = top + 0.08 + ph / 2 + 0.03;
    part(g, rbox(0.2, 0.012, 0.14, 0.006), BLACK, mx, top + 0.006, mz - 0.02);
    part(g, rbox(0.04, 0.12, 0.03, 0.008), BLACK, mx, top + 0.07, mz - 0.035);
    part(g, rbox(pw + 0.03, ph + 0.03, 0.03, 0.01), BLACK, mx, sy, mz);
    part(g, box(pw, ph, 0.004), '#1b1f27', mx, sy, mz + 0.0155, { outline: false });
    const page = group(use, mx, sy, mz + 0.018);
    picture(page, painted('fm-script-screen', 256, 360, paintScriptScreen), pw, ph, 0, 0, 0);
    const px = (u: number) => -pw / 2 + (u / 256) * pw;
    const py = (v: number) => ph / 2 - (v / 360) * ph;
    const below = new THREE.Mesh(UNIT, PAGE);
    const rest = new THREE.Mesh(UNIT, PAGE);
    const cursor = new THREE.Mesh(UNIT, CURSOR);
    for (const m of [below, rest, cursor]) page.add(m);
    // The keyboard and mouse, the drafts, the cards, the cup, the mug, the lamp.
    const kz = zf - 0.16;
    part(g, rbox(0.36, 0.018, 0.12, 0.006), '#cfd8dc', mx, top + 0.009, kz);
    part(g, box(0.33, 0.004, 0.095), '#eceff1', mx, top + 0.02, kz, { outline: false });
    part(g, rbox(0.05, 0.02, 0.08, 0.02), '#cfd8dc', mx + 0.25, top + 0.01, kz + 0.01);
    const cover = painted('fm-script-cover', 256, 362, paintScriptCover);
    for (let i = 0; i < 3; i++) {
      part(g, box(0.2, 0.025, 0.28), '#f5f3ec', 0.32, top + 0.0125 + i * 0.026, zc - 0.08, { ry: -0.08 + i * 0.07 });
      flat(g, cover, 0.2, 0.28, 0.32, top + 0.026 + i * 0.026, zc - 0.08, -0.08 + i * 0.07);
    }
    const cork = group(g, -0.3, top, -D / 2 + 0.06);
    cork.rotation.x = -0.12;
    part(cork, rbox(0.3, 0.24, 0.02, 0.006), '#c9a27a', 0, 0.13, 0);
    const cards = ['#fff59d', '#ffffff', '#f8bbd0', '#b3e5fc', '#ffffff', '#c5e1a5'];
    cards.forEach((col, i) => {
      part(cork, box(0.075, 0.05, 0.003), col, -0.1 + (i % 3) * 0.1, 0.18 - Math.floor(i / 3) * 0.08, 0.012, { rz: (i % 2 ? 1 : -1) * 0.05, outline: false });
      part(cork, ball(0.006), '#e53935', -0.1 + (i % 3) * 0.1, 0.2 - Math.floor(i / 3) * 0.08, 0.016, { outline: false });
    });
    part(g, cyl(0.035, 0.03, 0.09, 12), '#455a64', 0.42, top + 0.045, zc - 0.22);
    for (let i = 0; i < 4; i++) part(g, cyl(0.004, 0.004, 0.15, 6), ['#ffca28', '#e53935', '#1e88e5', '#ffca28'][i], 0.42 + (i - 1.5) * 0.012, top + 0.12, zc - 0.22, { rz: (i - 1.5) * 0.12, outline: false });
    part(g, cyl(0.035, 0.032, 0.09, 14), '#fafafa', 0.27, top + 0.045, zf - 0.12);
    part(g, cyl(0.031, 0.031, 0.004, 14), '#4e342e', 0.27, top + 0.088, zf - 0.12, { outline: false });
    label(g, '★', 0.03, 0.03, 0.27, top + 0.05, zf - 0.084, '#fafafa', GOLD);
    // An anglepoise at the back left, lit while writing.
    const lx = -0.38;
    const lz = zc - 0.16;
    part(g, cyl(0.06, 0.07, 0.02, 14), BLACK, lx, top + 0.01, lz);
    rod(g, V(lx, top + 0.02, lz), V(lx + 0.04, top + 0.3, lz + 0.06), 0.008, BLACK);
    rod(g, V(lx + 0.04, top + 0.3, lz + 0.06), V(lx + 0.12, top + 0.38, lz + 0.18), 0.008, BLACK);
    part(g, cyl(0.03, 0.07, 0.09, 14), BLACK, lx + 0.14, top + 0.34, lz + 0.22, { rx: 0.7 });
    glowing(use, cyl(0.06, 0.06, 0.004, 14), '#fff3c4', lx + 0.155, top + 0.305, lz + 0.245, 0.7);
    // The research folder: closed at the left, or open beside the keyboard with the clippings.
    const fx = -0.3;
    const fz = zf - 0.2;
    const closed = group(g, fx, top, fz, 0.1);
    part(closed, box(0.23, 0.02, 0.3), '#1e5aa8', 0, 0.01, 0);
    label(closed, '취재 자료', 0.12, 0.04, 0, 0.021, 0.02, '#ffffff', '#1e5aa8').rotation.x = -Math.PI / 2;
    const open = group(g, fx + 0.02, top, fz + 0.02, 0.18);
    part(open, box(0.46, 0.008, 0.3), '#1e5aa8', 0, 0.004, 0);
    flat(open, painted('fm-clippings', 512, 360, paintClippings), 0.44, 0.3, 0, 0.009, 0);
    part(open, cyl(0.008, 0.008, 0.12, 8), '#ffeb3b', 0.12, 0.016, 0.1, { rz: Math.PI / 2, ry: 0.5, outline: false });
    open.visible = false;
    // The chair, and how it's used.
    officeChair(g, 0, zf + 0.24, Math.PI);
    const keys = marker(g, mx, top + 0.02, kz);
    const folder = marker(g, fx + 0.04, top + 0.012, fz + 0.04);
    const type = sitAt(g, 0, 0.48, zf + 0.24, Math.PI, 'type', keys);
    const check = sitAt(g, -0.06, 0.48, zf + 0.24, Math.PI - 0.12, 'write', folder);
    out.seat = type.at;
    out.work = keys;
    const lineT = 1.6;
    const cycle = SCRIPT.length * lineT + 3;
    out.animate = (t) => {
      const u = ((((t / cycle + phaseOf(type)) % 1) + 1) % 1) * cycle;
      const L = Math.floor(u / lineT);
      const f = (u - L * lineT) / lineT;
      const n = SCRIPT.length;
      const writing = posed(type, t) || !posed(check, t);
      const shown = writing ? L : n;
      // Everything below the line being typed hidden; the line itself up to where the cursor is.
      if (shown < n - 1) {
        const yTop = SCRIPT_Y0 + (shown + 1) * SCRIPT_DY - 10;
        below.visible = true;
        below.position.set(0, (py(yTop) + py(354)) / 2, 0.001);
        below.scale.set(pw * (238 / 256), py(yTop) - py(354), 1);
      } else below.visible = false;
      if (shown < n) {
        const [x0, x1] = SPAN[SCRIPT[shown][0]];
        const xr = x0 + (x1 - x0) * f;
        const yc = SCRIPT_Y0 + shown * SCRIPT_DY;
        rest.visible = cursor.visible = true;
        rest.position.set((px(xr) + px(246)) / 2, py(yc), 0.001);
        rest.scale.set(Math.max(0.001, px(246) - px(xr)), (14 / 360) * ph, 1);
        cursor.position.set(px(xr) + 0.002, py(yc), 0.0015);
        cursor.scale.set(0.002, (12 / 360) * ph, 1);
        cursor.visible = Math.sin(t * 9) > -0.3;
      } else rest.visible = cursor.visible = false;
    };
    out.away = (_o, t) => {
      const checking = posed(check, t);
      open.visible = checking;
      closed.visible = !checking;
    };
    out.spots = { '*': type, writeScreenplay: type, filmmaker_factCheck: check };
  },

  /**
   * The cinema camera (영화 카메라): on a fluid head and wooden sticks spread on a doorway dolly with
   * pneumatic wheels, on a length of track; a sandbag and an apple box on the deck, the push bar at
   * the lens end with the clapperboard hung on it. The camera itself: the body, its top handle, the
   * eyepiece back to the operator, the prime on its rods with the follow focus, the matte box and its
   * flag, a side handle, the monitor on its arm to the right, the red tally that's lit while it rolls,
   * the pan bar. The head winds up to whoever's at it (the eyepiece at their eye).
   *
   * Operated stood behind it, eye to the eyepiece and the pan bar eased round, then the take played
   * back on the monitor (filmmakerMotion.ts cameraRound); the shot called from beside it with the
   * clipboard — "레디, 액션! … 컷!" (actionRound); the take slated stood before the lens (slateRound).
   * The lens points away from its front, as every camera on the lots does.
   */
  movieCamera(g, _W, _D, _c, _def, _ctx, out) {
    const SZ = 0.45;
    // The track, its sleepers.
    for (const sx of [-1, 1]) part(g, box(0.03, 0.03, 0.94), '#b0b7bd', sx * 0.27, 0.04, -0.04, { outline: false });
    for (let i = 0; i < 6; i++) part(g, box(0.68, 0.025, 0.07), '#5d4037', 0, 0.0125, -0.44 + i * 0.165);
    // The dolly.
    const dz = -0.06;
    part(g, rbox(0.6, 0.05, 0.7, 0.012), '#2b2b30', 0, 0.2, dz);
    part(g, box(0.56, 0.006, 0.66), '#9c7b5e', 0, 0.228, dz, { outline: false });
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        part(g, cyl(0.065, 0.065, 0.045, 16), RUBBER, sx * 0.27, 0.115, dz + sz * 0.27, { rz: Math.PI / 2 });
        part(g, cyl(0.028, 0.028, 0.05, 10), '#9aa3ab', sx * 0.275, 0.115, dz + sz * 0.27, { rz: Math.PI / 2, outline: false });
        part(g, rbox(0.04, 0.08, 0.05, 0.01), '#2b2b30', sx * 0.235, 0.16, dz + sz * 0.27);
      }
    const barZ = dz - 0.37;
    for (const sx of [-1, 1]) rod(g, V(sx * 0.24, 0.22, dz - 0.32), V(sx * 0.24, 0.9, barZ), 0.013, '#3a3a40');
    part(g, cyl(0.016, 0.016, 0.52, 10), '#3a3a40', 0, 0.9, barZ, { rz: Math.PI / 2, outline: false });
    part(g, cyl(0.022, 0.022, 0.36, 10), RUBBER, 0, 0.9, barZ, { rz: Math.PI / 2, outline: false });
    part(g, rbox(0.2, 0.08, 0.12, 0.04), '#e65100', -0.17, 0.27, dz - 0.2, { ry: 0.3 });
    part(g, rbox(0.3, 0.1, 0.18, 0.01), '#c8a27a', 0.14, 0.28, dz - 0.22);
    part(g, box(0.22, 0.06, 0.004), shade('#c8a27a', 0.75), 0.14, 0.28, dz - 0.129, { outline: false });
    // The sticks: a spreader on the deck and three legs up to the bowl (wound to the operator).
    const cz = 0.05;
    const angles = [0, 1, 2].map((i) => (i / 3) * Math.PI * 2 + Math.PI);
    const feet = angles.map((a) => V(Math.sin(a) * 0.25, 0.235, cz + Math.cos(a) * 0.25));
    for (const f of feet) {
      rod(g, V(0, 0.245, cz), f.clone().setY(0.245), 0.008, '#3a3a40');
      part(g, cyl(0.02, 0.02, 0.02, 8), '#3a3a40', f.x, 0.24, f.z, { outline: false });
    }
    const legs = feet.map(() => stretchy(g, 0.017, '#6d4c41'));
    const shins = feet.map(() => stretchy(g, 0.011, '#9aa3ab'));
    const bowl = part(g, cyl(0.07, 0.055, 0.05, 14), '#2e2e33', 0, 1, 0);
    // The head and the camera, about the pan pivot.
    const head = new THREE.Group();
    g.add(head);
    part(head, rbox(0.13, 0.09, 0.14, 0.02), '#33363c', 0, -0.06, 0);
    for (const sx of [-1, 1]) part(head, cyl(0.022, 0.022, 0.02, 12), '#e65100', sx * 0.075, -0.06, 0, { rz: Math.PI / 2, outline: false });
    glowing(head, cyl(0.01, 0.01, 0.004, 10), '#76ff03', 0.03, -0.014, 0.05);
    rod(head, V(0.06, -0.03, 0.05), V(0.3, -0.12, 0.23), 0.011, BLACK);
    rod(head, V(0.24, -0.098, 0.185), V(0.3, -0.12, 0.23), 0.018, RUBBER);
    part(head, rbox(0.1, 0.02, 0.3, 0.006), '#4a4e55', 0, 0.005, 0);
    part(head, rbox(0.14, 0.16, 0.24, 0.02), GUNMETAL, 0, 0.1, 0);
    part(head, box(0.004, 0.1, 0.16), '#55595f', 0.071, 0.1, 0, { outline: false });
    for (let i = 0; i < 4; i++) part(head, box(0.004, 0.012, 0.012), i ? '#9e9e9e' : '#e53935', 0.073, 0.06 + i * 0.022, 0.07, { outline: false });
    // The top handle, the eyepiece back to the operator.
    for (const z of [-0.07, 0.07]) part(head, box(0.02, 0.05, 0.02), BLACK, 0, 0.205, z);
    part(head, cyl(0.013, 0.013, 0.2, 10), BLACK, 0, 0.235, 0, { rx: Math.PI / 2 });
    part(head, cyl(0.022, 0.022, 0.1, 12), '#2b2b30', -0.01, CAM.eyepiece.up, 0.15, { rx: Math.PI / 2 });
    part(head, cyl(0.032, 0.026, 0.035, 14), RUBBER, -0.01, CAM.eyepiece.up, 0.2, { rx: Math.PI / 2 });
    // The rods, the lens and its gears, the matte box and its flag, the follow focus.
    for (const sx of [-1, 1]) part(head, cyl(0.008, 0.008, 0.36, 8), CHROME, sx * 0.03, 0.03, -0.22, { rx: Math.PI / 2, outline: false });
    part(head, cyl(0.05, 0.052, 0.2, 20), '#222226', 0, 0.1, -0.22, { rx: Math.PI / 2 });
    for (const z of [-0.18, -0.27]) part(head, cyl(0.056, 0.056, 0.022, 20), '#3d3d42', 0, 0.1, z, { rx: Math.PI / 2, outline: false });
    part(head, box(0.004, 0.004, 0.06), '#ffffff', 0, 0.153, -0.2, { outline: false });
    glass(head, cyl(0.04, 0.04, 0.004, 18), 0, 0.1, -0.323, undefined, Math.PI / 2);
    part(head, cyl(0.036, 0.036, 0.002, 18), '#4d6f99', 0, 0.1, -0.322, { rx: Math.PI / 2, outline: false });
    part(head, rbox(0.22, 0.17, 0.08, 0.01), RUBBER, 0, 0.1, -0.37);
    part(head, box(0.19, 0.14, 0.004), '#050505', 0, 0.1, -0.409, { outline: false });
    part(head, box(0.22, 0.004, 0.13), RUBBER, 0, 0.19, -0.43, { rx: -0.15 });
    for (const sx of [-1, 1]) part(head, box(0.004, 0.16, 0.1), RUBBER, sx * 0.11, 0.1, -0.43, { ry: sx * 0.2, outline: false });
    part(head, rbox(0.04, 0.05, 0.05, 0.008), '#2b2b30', -0.065, 0.045, -0.2);
    part(head, cyl(0.035, 0.035, 0.014, 18), '#bdbdbd', -0.092, 0.06, -0.2, { rz: Math.PI / 2 });
    // The side handle the left hand rests on.
    rod(head, V(-0.07, 0.1, 0.1), V(-0.12, 0.1, 0.1), 0.012, BLACK);
    part(head, cyl(0.017, 0.017, 0.1, 10), '#8d6e63', -0.12, 0.07, 0.1);
    // The monitor on its arm to the right, its picture lit while it's used; the play button.
    rod(head, V(0.07, 0.17, 0.02), V(0.2, 0.2, 0.02), 0.009, BLACK);
    const mon = group(head, -CAM.monitor.side, CAM.monitor.up, -CAM.monitor.ahead, -0.4);
    part(mon, rbox(0.21, 0.14, 0.03, 0.008), BLACK, 0, 0, 0);
    part(mon, box(0.19, 0.115, 0.004), '#101418', 0, 0, 0.0155, { outline: false });
    part(head, box(0.016, 0.01, 0.012), '#43a047', -CAM.button.side, CAM.button.up, -CAM.button.ahead, { outline: false });
    const headLive = group(head, 0, 0, 0);
    const live = painted('fm-cam-live', 320, 200, paintMonitor(false));
    const play = painted('fm-cam-play', 320, 200, paintMonitor(true));
    const monLive = group(headLive, mon.position.x, mon.position.y, mon.position.z, mon.rotation.y);
    const monPic = picture(monLive, live, 0.19, 0.115, 0, 0, 0.018);
    const tally = glowing(headLive, box(0.03, 0.018, 0.02), '#ff1744', 0, 0.2, -0.1);
    glowing(headLive, box(0.004, 0.06, 0.08), '#80deea', 0.074, 0.12, -0.02);
    headLive.visible = false;
    let height = -1;
    const setHeight = (H: number) => {
      if (Math.abs(H - height) < 1e-3) return;
      height = H;
      const pv = camPivot(H);
      const pz = SZ - pv.ahead;
      head.position.set(0, pv.up, pz);
      bowl.position.set(0, pv.up - 0.13, pz);
      angles.forEach((a, i) => {
        const topAt = V(Math.sin(a) * 0.05, pv.up - 0.15, pz + Math.cos(a) * 0.05);
        const knee = feet[i].clone().lerp(topAt, 0.42);
        stretch(legs[i], knee, topAt);
        stretch(shins[i], feet[i], knee);
      });
    };
    setHeight(1.6);
    // The clapperboard hung on the push bar (taken off to slate), the one in the hands, the clipboard.
    const hung = clapper(g);
    hung.root.position.set(0.12, 0.76, barZ - 0.02);
    hung.root.rotation.set(0.1, Math.PI, 0);
    const op = standAt(g, 0, SZ, Math.PI, 'fmCamera');
    const beside = standAt(g, -BESIDE.side, SZ - BESIDE.ahead, Math.PI, 'fmAction');
    const slate = standAt(g, 0, -1.05, 0, 'fmSlate');
    const use = inUse(g, out);
    const slateHold = holder(use, slate.at, 0);
    const held = clapper(slateHold);
    const clipHold = holder(use, beside.at, Math.PI);
    const clip = clipboard(clipHold, painted('fm-shotlist', 256, 340, paintShotList));
    const clock = liveClock();
    out.animate = (t) => {
      clock.mark(t);
      const now = nowAt([op, beside, slate], t);
      held.root.visible = now === slate;
      clip.visible = now === beside;
      matOf(monPic).map = live;
      tally.visible = false;
      if (now === op) {
        const H = heightOf(op);
        setHeight(H);
        const k = cameraRound(t, phaseOf(op), H);
        head.rotation.y = k.pan;
        if (k.playback) matOf(monPic).map = play;
      } else if (now === beside) {
        const H = heightOf(beside);
        setHeight(H);
        head.rotation.y = 0;
        const k = actionRound(t, phaseOf(beside), H);
        tally.visible = k.rolling;
        place(clip, k.clip);
        faceTo(clip, clipHold, eyesOf(H));
      } else if (now === slate) {
        const k = slateRound(t, phaseOf(slate), heightOf(slate));
        place(held.root, k.board);
        held.root.rotation.set(-k.pitch, 0, 0);
        held.stick.rotation.z = -k.open;
        tally.visible = true;
      }
    };
    out.away = (_o, t) => {
      hung.root.visible = !posed(slate, t);
      headLive.visible = clock.on(t);
    };
    out.spots = { '*': op, reviewTakes: op, filmmaker_directShoot: beside, filmmaker_slateClap: slate };
  },

  /**
   * The editing suite (영화 편집실 장비): a long black desk with a walnut edge and a hutch over it; the
   * composer (source and record viewers) on the left monitor and the day's bins over the timeline on
   * the right, its red playhead moving as the cut's scrubbed and played; a reference monitor up on the
   * hutch between the studio speakers; the keyboard with its coloured keys, the jog/shuttle wheel to
   * the right of it and the mouse beyond, the grading panel's three trackballs to the left; the RAW
   * drives, headphones, a coffee, post-its. Cut sat at the keyboard — jogging, trimming with the
   * mouse, a cut from the keys, sat back to watch it (editRound); graded with the chair rolled over to
   * the panel, the balls rolled and the picture warming and cooling on the reference monitor, the
   * left monitor showing the scopes and the wheels (gradeRound).
   */
  editingSuite(g, W, D, _c, _def, _ctx, out) {
    const w = W - 0.08;
    const d = 0.7;
    const h = 0.74;
    const zc = -D / 2 + d / 2 + 0.02;
    const zf = zc + d / 2;
    const top = h + 0.02;
    part(g, rbox(w, 0.04, d, 0.012), '#2b2b30', 0, h, zc);
    part(g, box(w, 0.025, 0.02), WALNUT, 0, h, zf);
    for (const sx of [-1, 1]) part(g, rbox(0.04, h - 0.02, d - 0.06, 0.008), '#2b2b30', sx * (w / 2 - 0.03), (h - 0.02) / 2, zc);
    part(g, box(w - 0.1, 0.36, 0.015), '#232327', 0, h - 0.22, zc - d / 2 + 0.05);
    // The hutch, the speakers, the reference monitor.
    for (const sx of [-1, 1]) part(g, box(0.03, 0.6, 0.03), '#2b2b30', sx * (w / 2 - 0.05), top + 0.3, -D / 2 + 0.07);
    part(g, rbox(w - 0.04, 0.03, 0.22, 0.008), '#2b2b30', 0, top + 0.6, -D / 2 + 0.13);
    for (const sx of [-1, 1]) {
      const x = sx * (w / 2 - 0.16);
      part(g, rbox(0.17, 0.27, 0.19, 0.012), '#1f1f23', x, top + 0.75, -D / 2 + 0.14);
      part(g, cyl(0.055, 0.055, 0.01, 18), '#3d3d42', x, top + 0.71, -D / 2 + 0.235, { rx: Math.PI / 2, outline: false });
      part(g, cyl(0.022, 0.022, 0.01, 12), '#5e5e66', x, top + 0.82, -D / 2 + 0.235, { rx: Math.PI / 2, outline: false });
    }
    const use = inUse(g, out);
    const refY = top + 0.77;
    const refZ = -D / 2 + 0.14;
    part(g, rbox(0.47, 0.29, 0.04, 0.01), BLACK, 0, refY, refZ);
    part(g, box(0.44, 0.25, 0.004), '#101418', 0, refY, refZ + 0.0205, { outline: false });
    const ref = group(use, 0, refY, refZ + 0.023);
    picture(ref, painted('fm-ref', 352, 200, paintScene(352, 200)), 0.44, 0.25, 0, 0, 0);
    const tintMat = new THREE.MeshBasicMaterial({ color: '#ff9a40', transparent: true, opacity: 0, depthWrite: false });
    const tint = new THREE.Mesh(UNIT, tintMat);
    tint.userData.ownMaterial = true;
    tint.scale.set(0.44, 0.25, 1);
    tint.position.z = 0.001;
    ref.add(tint);
    // The two monitors, angled in.
    const composer = painted('fm-composer', 512, 288, paintComposer);
    const grading = painted('fm-grade', 512, 288, paintGrade);
    const my = top + 0.33;
    const L = deskMonitor(g, use, -0.42, my, -0.26, 0.18, 0.6, 0.34, composer, top);
    const R = deskMonitor(g, use, 0.42, my, -0.26, -0.18, 0.6, 0.34, painted('fm-timeline', 512, 288, paintTimeline), top);
    const playhead = glowing(R.frame, box(0.003, ((TL.y1 - TL.y0 + 10) / 288) * 0.34, 0.001), '#ff3b30', 0, 0.34 / 2 - (((TL.y0 + TL.y1) / 2 - 5) / 288) * 0.34, 0.02);
    for (let i = 0; i < 3; i++) part(g, box(0.05, 0.05, 0.003), ['#fff59d', '#f8bbd0', '#b3e5fc'][i], -0.7 + i * 0.06, my + 0.2, -0.235 + i * 0.011, { ry: 0.18, rz: (i - 1) * 0.1, outline: false });
    // The keyboard (its edit keys coloured), the jog/shuttle, the mouse, the grading panel.
    const kz = 0.07;
    part(g, rbox(0.44, 0.022, 0.15, 0.006), '#37474f', 0, top + 0.011, kz);
    part(g, box(0.41, 0.004, 0.12), '#cfd8dc', 0, top + 0.024, kz, { outline: false });
    const keyCols: Array<[number, number, string]> = [[0.02, 0.0, '#1e88e5'], [0.05, 0.0, '#fdd835'], [0.08, 0.0, '#e53935'], [-0.06, 0.03, '#43a047'], [-0.03, 0.03, '#fdd835'], [0.12, 0.03, '#8e24aa']];
    for (const [x, z, col] of keyCols) part(g, box(0.022, 0.006, 0.022), col, x, top + 0.028, kz + z - 0.01, { outline: false });
    const jx = -EDIT.jog.side;
    const jz = kz - EDIT.jog.ahead;
    part(g, rbox(0.16, 0.035, 0.14, 0.02), '#2b2b30', jx, top + 0.017, jz);
    part(g, ring(0.058, 0.008), '#5e6168', jx, top + 0.038, jz, { rx: Math.PI / 2, outline: false });
    const wheel = group(g, jx, top + 0.04, jz);
    part(wheel, cyl(0.045, 0.045, 0.016, 22), '#9e9e9e', 0, 0, 0);
    part(wheel, cyl(0.009, 0.009, 0.006, 10), '#424242', 0.028, 0.009, 0, { outline: false });
    part(g, box(0.2, 0.004, 0.17), '#263238', -EDIT.mouse.side, top + 0.002, kz - EDIT.mouse.ahead);
    part(g, rbox(0.055, 0.025, 0.09, 0.025), '#212121', -EDIT.mouse.side, top + 0.016, kz - EDIT.mouse.ahead);
    const gx = -0.47;
    const gz = 0.05;
    part(g, rbox(0.42, 0.05, 0.22, 0.015), '#2b2b30', gx, top + 0.025, gz);
    const balls = BALLS.map((b) => {
      const bx = gx - b.side;
      const bz = gz - b.ahead;
      part(g, ring(0.042, 0.007), '#7b8088', bx, top + 0.052, bz, { rx: Math.PI / 2, outline: false });
      const m = group(g, bx, top + 0.062, bz);
      part(m, ball(0.03), '#1b1b1f', 0, 0, 0);
      part(m, ball(0.008), '#9e9e9e', 0, 0.026, 0.012, { outline: false });
      return m;
    });
    for (let i = 0; i < 6; i++) part(g, cyl(0.009, 0.009, 0.012, 10), '#9e9e9e', gx - 0.17 + i * 0.068, top + 0.056, gz - 0.085, { outline: false });
    // The drives, headphones, a coffee.
    for (let i = 0; i < 3; i++) part(g, rbox(0.13, 0.04, 0.19, 0.008), ['#455a64', '#e65100', '#455a64'][i], 0.78, top + 0.02 + i * 0.042, -0.18);
    label(g, 'RAW D01–12', 0.1, 0.022, 0.78, top + 0.104, -0.084, '#e65100', '#ffffff');
    part(g, ring(0.07, 0.012, Math.PI), '#212121', -0.82, top + 0.02, 0.0, { rx: -Math.PI / 2, outline: false });
    for (const sz of [-1, 1]) part(g, cyl(0.04, 0.04, 0.03, 14), '#212121', -0.82 + sz * 0.07, top + 0.02, 0.0, { outline: false });
    part(g, cyl(0.035, 0.03, 0.09, 12), '#fafafa', 0.66, top + 0.045, 0.06);
    // The chair rolls between the keyboard and the panel.
    const chair = officeChair(g, 0, zf + 0.26, Math.PI);
    const keys = marker(g, 0, top + 0.026, kz);
    const panel = marker(g, gx, top + 0.05, gz);
    const edit = sitAt(g, 0, 0.48, zf + 0.26, Math.PI, 'fmEdit', keys);
    const grade = sitAt(g, gx, 0.48, zf + 0.26, Math.PI, 'fmGrade', panel);
    out.seat = edit.at;
    out.work = keys;
    const tlW = 0.6;
    out.animate = (t) => {
      const now = nowAt([edit, grade], t) ?? edit;
      chair.position.x = THREE.MathUtils.damp(chair.position.x, now === grade ? gx : 0, 4, 1 / 60);
      matOf(L.pic).map = now === grade ? grading : composer;
      if (now === edit) {
        const k = editRound(t, phaseOf(edit), heightOf(edit));
        wheel.rotation.y = -k.jog;
        playhead.position.x = -tlW / 2 + ((TL.x0 + k.head * (TL.x1 - TL.x0)) / 512) * tlW;
        tintMat.opacity = 0;
      } else {
        const k = gradeRound(t, phaseOf(grade), heightOf(grade));
        balls.forEach((b, i) => {
          if (i === k.active) b.rotation.set(Math.sin(k.roll) * 0.6, 0, Math.cos(k.roll) * 0.6);
        });
        tintMat.color.set(k.warm > 0 ? '#ff9a40' : '#2ec4d6');
        tintMat.opacity = 0.22 * Math.abs(k.warm);
      }
    };
    out.spots = { '*': edit, editFilm: edit, colorGrade: grade };
  },

  /**
   * The screening room's screen (상영관 스크린): a 2.39:1 picture in its black masking on a low
   * carpeted stage with step lights along the lip, red velvet curtains either side gathered in folds
   * under a pleated valance with a gold fringe. The dailies are watched stood before it with a
   * notebook — the shot up with its burnt-in slate and timecode, a note written, a point at the
   * screen (dailiesRound); a premiere introduced up on the stage with a hand mic, the title card
   * behind and the film's banner beside, the cast waved to, a bow (premiereRound).
   */
  screeningScreen(g, W, _D, _c, _def, _ctx, out) {
    const sw = W - 0.06;
    part(g, rbox(sw, 0.18, 0.86, 0.02), '#1e1e22', 0, 0.09, -0.06);
    part(g, box(sw - 0.04, 0.004, 0.82), '#3a2f3a', 0, 0.181, -0.06, { outline: false });
    for (let i = 0; i < 7; i++) glowing(g, box(0.08, 0.012, 0.004), '#ffd180', -sw / 2 + 0.3 + i * ((sw - 0.6) / 6), 0.07, 0.371);
    const pw = Math.min(2.4, W - 0.6);
    const pH = pw / 2.4;
    const cy = 1.62;
    part(g, box(pw + 0.26, pH + 0.3, 0.04), '#111111', 0, cy, -0.46);
    part(g, box(pw, pH, 0.004), '#dedcd6', 0, cy, -0.437, { outline: false });
    part(g, box(pw + 0.2, cy - pH / 2 - 0.25, 0.02), '#151515', 0, 0.18 + (cy - pH / 2 - 0.25) / 2 + 0.02, -0.45);
    // The curtains in folds, the valance and its fringe.
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        const x = sx * (pw / 2 + 0.1 + i * 0.045);
        part(g, cyl(0.045, 0.05, 2.4, 10), i % 2 ? VELVET : shade(VELVET, 0.8), x, 0.18 + 1.2, -0.38 + (i % 2) * 0.02, { outline: i === 5 });
      }
      part(g, cyl(0.012, 0.012, 0.3, 8), GOLD, sx * (pw / 2 + 0.2), 1.1, -0.32, { rz: Math.PI / 2, outline: false });
    }
    part(g, box(sw, 0.32, 0.1), shade(VELVET, 0.85), 0, 2.56, -0.4);
    for (let i = 0; i < 14; i++) part(g, box(0.02, 0.3, 0.012), VELVET, -sw / 2 + 0.1 + i * ((sw - 0.2) / 13), 2.56, -0.345, { outline: false });
    part(g, box(sw, 0.035, 0.11), GOLD, 0, 2.39, -0.4, { outline: false });
    // The picture, lit while it's used: the dailies, or the premiere's title card.
    const use = inUse(g, out);
    const dailiesTex = painted('fm-dailies', 768, 320, paintDailies);
    const titleTex = painted('fm-title', 768, 320, paintTitleCard);
    const pic = picture(use, dailiesTex, pw, pH, 0, cy, -0.433);
    // The premiere's banner up on the stage.
    const prem = group(use, W / 2 - 0.5, 0.18, 0.05, -0.25);
    rod(prem, V(-0.2, 0, 0.12), V(0, 1.9, -0.02), 0.008, CHROME);
    rod(prem, V(0.2, 0, 0.12), V(0, 1.9, -0.02), 0.008, CHROME);
    picture(prem, painted('fm-poster|roof', 256, 384, paintPoster('roof')), 0.56, 0.84, 0, 1.38, 0.0);
    part(prem, box(0.6, 0.88, 0.006), '#111111', 0, 1.38, -0.006, { outline: false });
    label(prem, '언론 시사회', 0.5, 0.1, 0, 0.84, 0.002, '#0b0d18', GOLD);
    // How it's used.
    const dailies = standAt(g, 0, 1.55, Math.PI, 'fmDailies');
    const premiere = standAt(g, -0.8, 0.18, 0, 'fmPremiere', undefined, 0.18);
    const bookHold = holder(use, dailies.at, Math.PI);
    const book = group(bookHold, 0, 0, 0);
    part(book, rbox(0.15, 0.21, 0.012, 0.006), '#263238', 0, 0, 0);
    part(book, box(0.135, 0.19, 0.002), PAPER, 0, 0, 0.007, { outline: false });
    for (let i = 0; i < 5; i++) part(book, box(0.1, 0.004, 0.001), '#90a4ae', 0, 0.06 - i * 0.03, 0.0085, { outline: false });
    const micHold = holder(use, premiere.at, 0);
    const mic = handMic(micHold);
    const dir = new THREE.Vector3();
    out.animate = (t) => {
      const now = nowAt([dailies, premiere], t) ?? dailies;
      const isPrem = now === premiere;
      matOf(pic).map = isPrem ? titleTex : dailiesTex;
      matOf(pic).color.setScalar(0.93 + 0.07 * Math.sin(t * 47) * Math.sin(t * 13));
      prem.visible = mic.visible = isPrem;
      book.visible = !isPrem;
      if (isPrem) {
        const k = premiereRound(t, phaseOf(premiere), heightOf(premiere));
        place(mic, k.mic);
        dir.set(k.mic.side - k.r.side, k.mic.up - k.r.up, k.mic.ahead - k.r.ahead).normalize();
        mic.quaternion.setFromUnitVectors(UP, dir);
      } else {
        const H = heightOf(dailies);
        const k = dailiesRound(t, phaseOf(dailies), H);
        place(book, k.book);
        faceTo(book, bookHold, eyesOf(H));
      }
    };
    out.spots = { '*': dailies, reviewDailies: dailies, hostPremiere: premiere };
  },

  /**
   * The audition corner (오디션 촬영 코너): a grey paper backdrop on its stands with a yellow T taped
   * on the floor before it where the actor stands, a stool, a softbox, the 「오디션 진행 중 · 정숙」
   * sign; a camcorder on its tripod facing the mark (its LED red while it's used); the casting table
   * with the pile of headshots and the kept pile, the evaluation sheet, the laptop with the casting
   * list, a tent card turned to the actor, water; the director's canvas chair behind it, 감독 on its
   * back. Sat at going through the headshots — one taken off the pile, held up and looked at, laid on
   * the kept pile, a note made (headshotRound).
   */
  fmCastingCorner(g, _W, D, _c, _def, _ctx, out) {
    const bz = -D / 2 + 0.1;
    const half = 0.8;
    for (const sx of [-1, 1]) lightStand(g, sx * half, bz, 2.28, 0.2);
    part(g, cyl(0.016, 0.016, 2 * half + 0.04, 10), '#3a3a40', 0, 2.26, bz, { rz: Math.PI / 2, outline: false });
    part(g, cyl(0.06, 0.06, 2 * half - 0.12, 18), '#8f9aa3', 0, 2.16, bz + 0.06, { rz: Math.PI / 2 });
    const pw = 2 * half - 0.16;
    part(g, box(pw, 1.9, 0.006), '#8f9aa3', 0, 1.2, bz + 0.1, { outline: false });
    const R = 0.3;
    for (let i = 0; i < 5; i++) {
      const a = ((i + 0.5) / 5) * (Math.PI / 2);
      part(g, box(pw, R * (Math.PI / 10) + 0.004, 0.006), '#8f9aa3', 0, R - R * Math.sin(a), bz + 0.1 + R - R * Math.cos(a), { rx: Math.PI - a, outline: false });
    }
    part(g, box(pw, 0.004, 0.5), '#8f9aa3', 0, 0.003, bz + 0.1 + R + 0.25, { outline: false });
    const mz = bz + 0.62;
    part(g, box(0.26, 0.002, 0.035), '#ffca28', 0, 0.007, mz, { outline: false });
    part(g, box(0.035, 0.002, 0.18), '#ffca28', 0, 0.007, mz + 0.09, { outline: false });
    // The stool, the softbox, the sign.
    part(g, cyl(0.15, 0.15, 0.04, 16), '#8d6e63', -0.56, 0.64, bz + 0.38);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.6;
      rod(g, V(-0.56 + Math.sin(a) * 0.08, 0.62, bz + 0.38 + Math.cos(a) * 0.08), V(-0.56 + Math.sin(a) * 0.17, 0, bz + 0.38 + Math.cos(a) * 0.17), 0.012, '#6d4c41');
    }
    lightStand(g, 0.72, bz + 0.62, 1.7, 0.2);
    const sb = group(g, 0.72, 1.75, bz + 0.62, -0.75);
    part(sb, cyl(0.04, 0.22, 0.28, 4), '#202024', 0, 0, -0.1, { rx: -Math.PI / 2, ry: Math.PI / 4 });
    part(sb, box(0.3, 0.3, 0.004), '#f5f5f5', 0, 0, 0.045, { outline: false });
    const use = inUse(g, out);
    const sbOn = group(use, 0.72, 1.75, bz + 0.62, -0.75);
    glowing(sbOn, box(0.3, 0.3, 0.004), '#fffdf2', 0, 0, 0.048);
    label(g, '오디션 진행 중 · 정숙', 0.34, 0.07, -half, 1.5, bz + 0.03, '#c62828', '#ffffff');
    // The camcorder on its tripod.
    const cx = 0.3;
    const cz = 0.06;
    const hub = 1.02;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.3;
      rod(g, V(cx, hub, cz), V(cx + Math.sin(a) * 0.26, 0.01, cz + Math.cos(a) * 0.26), 0.011, '#2e2e33');
    }
    part(g, cyl(0.035, 0.03, 0.06, 10), '#2e2e33', cx, hub + 0.03, cz);
    rod(g, V(cx, hub + 0.05, cz), V(cx + 0.06, hub - 0.05, cz + 0.28), 0.008, BLACK);
    part(g, rbox(0.09, 0.09, 0.2, 0.02), '#2b2b30', cx, hub + 0.12, cz);
    part(g, cyl(0.035, 0.038, 0.06, 16), '#1b1b1f', cx, hub + 0.12, cz - 0.13, { rx: Math.PI / 2 });
    glass(g, cyl(0.028, 0.028, 0.004, 14), cx, hub + 0.12, cz - 0.161, undefined, Math.PI / 2);
    part(g, rbox(0.008, 0.06, 0.08, 0.004), BLACK, cx + 0.05, hub + 0.13, cz + 0.03, { ry: 0.6 });
    glowing(use, ball(0.008), '#ff1744', cx - 0.03, hub + 0.17, cz - 0.08);
    glowing(use, box(0.002, 0.05, 0.07), '#9ccfe8', cx + 0.056, hub + 0.13, cz + 0.035);
    // The casting table and what's on it.
    const tz = 0.42;
    const td = 0.56;
    const top = 0.76;
    part(g, rbox(1.5, 0.035, td, 0.01), '#eceff1', 0, 0.74, tz);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.016, 0.016, 0.72, 8), BLACK, sx * 0.7, 0.36, tz + sz * (td / 2 - 0.05), { outline: false });
    part(g, box(1.46, 0.3, 0.01), '#263238', 0, 0.58, tz - td / 2 + 0.01);
    label(g, `${COMPANY} 오디션`, 0.5, 0.07, 0, 0.6, tz - td / 2 + 0.003, '#263238', GOLD, Math.PI);
    const work = marker(g, 0, top, tz + td / 2 - 0.08);
    const W0 = work.position;
    const at = (b: BarOffset, dy = 0) => V(W0.x - b.side, W0.y + b.up + dy, W0.z - b.ahead);
    const S = HEADSHOTS;
    const stack = at(S.stack);
    part(g, box(0.11, 0.035, 0.14), '#fafafa', stack.x, top + 0.0175, stack.z);
    flat(g, headshot(0), 0.1, 0.13, stack.x, top + 0.036, stack.z);
    const kept = at(S.kept);
    part(g, box(0.11, 0.012, 0.14), '#fafafa', kept.x, top + 0.006, kept.z, { ry: 0.08 });
    flat(g, headshot(1), 0.1, 0.13, kept.x, top + 0.0125, kept.z, 0.08);
    const sh = at(S.sheet);
    flat(g, painted('fm-sheet', 256, 180, paintSheet), 0.2, 0.14, sh.x, top + 0.002, sh.z);
    part(g, cyl(0.004, 0.004, 0.13, 6), '#1a237e', sh.x + 0.1, top + 0.006, sh.z + 0.04, { rz: Math.PI / 2, ry: 0.4, outline: false });
    const lap = group(g, 0.52, top, tz - 0.08, -0.4);
    part(lap, rbox(0.3, 0.014, 0.21, 0.006), '#b0bec5', 0, 0.007, 0);
    const lid = group(lap, 0, 0.014, -0.1);
    lid.rotation.x = -0.25;
    part(lid, rbox(0.3, 0.2, 0.01, 0.006), '#b0bec5', 0, 0.1, 0);
    part(lid, box(0.28, 0.18, 0.002), '#101418', 0, 0.1, 0.0055, { outline: false });
    const lidOn = group(use, 0, 0, 0);
    lidOn.position.copy(lap.position);
    lidOn.rotation.copy(lap.rotation);
    const lidOn2 = group(lidOn, 0, 0.014, -0.1);
    lidOn2.rotation.x = -0.25;
    picture(lidOn2, painted('fm-casting', 320, 200, paintCasting), 0.28, 0.18, 0, 0.1, 0.0068);
    const tent = group(g, -0.12, top, tz - 0.12, Math.PI);
    for (const s of [-1, 1]) part(tent, box(0.2, 0.08, 0.003), '#fafafa', 0, 0.035, s * 0.02, { rx: -s * 0.45, outline: false });
    label(tent, '캐스팅', 0.16, 0.05, 0, 0.038, 0.04, '#fafafa', '#263238').rotation.x = -0.45;
    for (let i = 0; i < 2; i++) {
      part(g, cyl(0.03, 0.03, 0.2, 12), '#b3e5fc', -0.55 + i * 0.08, top + 0.1, tz - 0.1, { outline: false });
      part(g, cyl(0.016, 0.016, 0.03, 10), '#1565c0', -0.55 + i * 0.08, top + 0.215, tz - 0.1, { outline: false });
    }
    // The director's canvas chair, its back to the room.
    const chairZ = D / 2 - 0.08;
    const seatY = 0.47;
    const ch = group(g, 0, 0, chairZ, Math.PI);
    for (const sx of [-1, 1]) {
      rod(ch, V(sx * 0.23, 0, -0.2), V(sx * 0.23, seatY, 0.2), 0.016, '#8d6e63');
      rod(ch, V(sx * 0.23, 0, 0.2), V(sx * 0.23, seatY, -0.2), 0.016, '#8d6e63');
      rod(ch, V(sx * 0.23, 0, -0.2), V(sx * 0.23, 0.98, -0.22), 0.016, '#8d6e63');
      part(ch, box(0.035, 0.03, 0.42), '#8d6e63', sx * 0.23, 0.68, 0);
    }
    part(ch, box(0.44, 0.02, 0.4), '#263238', 0, seatY, 0);
    part(ch, box(0.48, 0.2, 0.012), '#263238', 0, 0.84, -0.22);
    label(ch, '감독', 0.2, 0.08, 0, 0.84, -0.229, '#263238', '#ffffff', Math.PI);
    // How it's used.
    const sit = sitAt(g, 0, seatY + 0.01, chairZ, Math.PI, 'fmHeadshots', work);
    out.seat = sit.at;
    out.work = work;
    const frame = holder(use, work, Math.PI);
    const card = group(frame, 0, 0, 0);
    part(card, box(0.105, 0.135, 0.003), '#ffffff', 0, 0, -0.002, { outline: false });
    const cardPic = picture(card, headshot(2), 0.1, 0.13, 0, 0, 0.0);
    const eyes = bo(0, seatY + 0.01 - top + 0.53 * 1.6, -(chairZ - W0.z) + 0.06);
    out.animate = (t) => {
      const k = headshotRound(t, phaseOf(sit));
      card.visible = !!k.card;
      if (!k.card) return;
      place(card, k.card);
      faceTo(card, frame, eyes);
      card.rotateZ(k.look);
      matOf(cardPic).map = headshot(Math.floor(t / 10 + phaseOf(sit)) + 2);
    };
    out.spots = { '*': sit };
  },

  /**
   * The production board (촬영 일정 보드): a whiteboard in an aluminium frame with October's shoot laid
   * out by 회차 in coloured magnet strips (today's ringed in red), the crew and the locations down the
   * side, the day's call sheet and the location photos pinned on beside it, the marker tray. Written
   * on stood at it.
   */
  fmScheduleBoard(g, W, D, _c, _def, _ctx, out) {
    const bw = W - 0.16;
    const bh = 1.06;
    const by = 1.5;
    const fz = -D / 2 + 0.035;
    part(g, rbox(bw + 0.05, bh + 0.05, 0.03, 0.01), '#c3c9ce', 0, by, fz);
    const sw = bw * 0.68;
    picture(g, painted('fm-schedule', 640, 360, paintSchedule), sw, sw * (360 / 640), -bw / 2 + sw / 2 + 0.02, by + 0.04, fz + 0.017);
    part(g, box(bw, bh, 0.004), '#fbfbf9', 0, by, fz + 0.015, { outline: false });
    const rx = bw / 2 - 0.2;
    picture(g, painted('fm-callsheet', 256, 362, paintCallSheet), 0.24, 0.34, rx, by + 0.18, fz + 0.019);
    for (let i = 0; i < 3; i++) {
      const x = rx - 0.12 + i * 0.12;
      const p = picture(g, painted(`fm-loc|${i}`, 128, 144, paintLocation(i)), 0.1, 0.112, x, by - 0.28, fz + 0.019);
      p.rotation.z = (i - 1) * 0.08;
    }
    for (const [x, y, col] of [[rx - 0.1, by + 0.35, '#e53935'], [rx + 0.1, by + 0.35, '#1e88e5'], [rx - 0.12, by - 0.22, '#43a047'], [rx + 0.12, by - 0.22, '#fdd835']] as const) part(g, cyl(0.014, 0.014, 0.01, 12), col, x, y, fz + 0.022, { rx: Math.PI / 2, outline: false });
    part(g, box(bw * 0.9, 0.03, 0.06), '#c3c9ce', 0, by - bh / 2 - 0.02, fz + 0.04);
    for (let i = 0; i < 4; i++) part(g, cyl(0.009, 0.009, 0.12, 8), ['#212121', '#e53935', '#1e88e5', '#43a047'][i], -0.3 + i * 0.14, by - bh / 2 + 0.005, fz + 0.045, { rz: Math.PI / 2, outline: false });
    part(g, rbox(0.12, 0.04, 0.05, 0.01), '#37474f', 0.4, by - bh / 2 + 0.01, fz + 0.045);
    const write = marker(g, -0.3, by + 0.05, fz + 0.03);
    out.work = write;
    out.spots = { '*': standAt(g, -0.2, -D / 2 + 0.55, Math.PI, 'board', write) };
  },

  /**
   * The poster wall (개봉작 포스터 월): the company's three films framed in black — 한밤의 옥상 (the
   * rooftop at night, its festival laurels), 붉은 항구 (a thriller in red, the harbour crane), 우리 동네
   * 히어로 (a kid in a cape in a yellow burst) — each under a brass picture light, the company's name
   * in gold under them.
   */
  fmPosterWall(g, W, D) {
    const fz = -D / 2 + 0.03;
    const kinds: PosterKind[] = ['roof', 'harbor', 'hero'];
    const pw = Math.min(0.56, (W - 0.2) / 3 - 0.06);
    kinds.forEach((k, i) => {
      const x = (i - 1) * (pw + 0.08);
      part(g, rbox(pw + 0.05, pw * 1.5 + 0.05, 0.03, 0.006), '#111111', x, 1.55, fz);
      picture(g, painted(`fm-poster|${k}`, 256, 384, paintPoster(k)), pw, pw * 1.5, x, 1.55, fz + 0.017);
      rod(g, V(x, 1.55 + pw * 0.75 + 0.03, fz + 0.01), V(x, 1.55 + pw * 0.75 + 0.1, fz + 0.1), 0.006, GOLD);
      part(g, cyl(0.018, 0.018, pw * 0.7, 10), GOLD, x, 1.55 + pw * 0.75 + 0.1, fz + 0.1, { rz: Math.PI / 2 });
      glowing(g, box(pw * 0.66, 0.006, 0.012), '#fff3c4', x, 1.55 + pw * 0.75 + 0.088, fz + 0.1);
    });
    label(g, `★ ${COMPANY}  STARLIGHT FILMS`, 1.1, 0.08, 0, 1.55 - pw * 0.75 - 0.12, fz + 0.01, '#111111', '#e8c766');
  },

  /**
   * The props and costume rack (소품·의상 랙): a chrome rolling rack of the film's costumes fanned on
   * their hangers, each with its scene's paper tag — a trench coat, a pink 저고리 and its skirt, a
   * police jacket, a school blazer, a red dress, a black suit — a fedora on the upright; under them
   * the prop crates labelled by scene, a rotary phone, an old suitcase, an umbrella hung off the end.
   * Gone through stood at it.
   */
  fmCostumeRack(g, W, D, _c, _def, _ctx, out) {
    const half = W / 2 - 0.12;
    const z = -D / 2 + 0.32;
    for (const sx of [-1, 1]) {
      part(g, box(0.04, 0.03, 0.46), CHROME, sx * half, 0.07, z);
      for (const sz of [-1, 1]) part(g, cyl(0.03, 0.03, 0.03, 10), RUBBER, sx * half, 0.03, z + sz * 0.21, { rz: Math.PI / 2 });
      part(g, cyl(0.014, 0.014, 1.68, 10), CHROME, sx * half, 0.92, z, { outline: false });
    }
    part(g, cyl(0.016, 0.016, 2 * half + 0.04, 10), CHROME, 0, 1.75, z, { rz: Math.PI / 2, outline: false });
    part(g, box(2 * half, 0.025, 0.4), '#8d6e63', 0, 0.26, z);
    const clothes: Array<[string, number, string, string]> = [
      ['#c8a97a', 1.0, 'coat', 'S#7 현우'],
      ['#f8bbd0', 0.95, 'hanbok', 'S#3 회상'],
      ['#1a237e', 0.7, 'jacket', 'S#9 경찰'],
      ['#283593', 0.72, 'blazer', 'S#5 학교'],
      ['#c62828', 0.95, 'dress', 'S#12 지수'],
      ['#212121', 0.85, 'suit', 'S#20 장례'],
    ];
    const n = clothes.length;
    clothes.forEach(([col, len, kind, tag], i) => {
      const x = -half + 0.2 + (i * (2 * half - 0.4)) / (n - 1);
      const c = group(g, x, 1.75, z, 0.75);
      part(c, ring(0.018, 0.004, Math.PI * 1.4), CHROME, 0, 0.0, 0, { outline: false });
      rod(c, V(-0.2, -0.1, 0), V(0, -0.045, 0), 0.006, '#6d4c41');
      rod(c, V(0.2, -0.1, 0), V(0, -0.045, 0), 0.006, '#6d4c41');
      const bodyH = kind === 'hanbok' ? 0.3 : len;
      part(c, rbox(0.4, bodyH, 0.07, 0.03), col, 0, -0.1 - bodyH / 2, 0);
      if (kind === 'hanbok') {
        part(c, cyl(0.12, 0.24, 0.72, 14), '#ef9a9a', 0, -0.4 - 0.36, 0);
        part(c, box(0.04, 0.2, 0.004), '#c62828', 0.05, -0.27, 0.04, { rz: 0.3, outline: false });
      }
      if (kind !== 'dress') for (const sx of [-1, 1]) part(c, rbox(0.08, len * 0.8, 0.06, 0.03), shade(col, 0.88), sx * 0.22, -0.12 - len * 0.4, 0, { rz: sx * 0.06 });
      if (kind === 'jacket') part(c, box(0.05, 0.06, 0.004), GOLD, -0.1, -0.25, 0.037, { outline: false });
      if (kind === 'suit' || kind === 'blazer') part(c, box(0.08, 0.3, 0.004), '#fafafa', 0, -0.25, 0.037, { outline: false });
      label(c, tag, 0.09, 0.035, 0.15, -0.16, 0.04, '#fffde7', '#5d4037');
    });
    part(g, cyl(0.12, 0.12, 0.02, 18), '#4e342e', half, 1.82, z);
    part(g, cyl(0.075, 0.08, 0.1, 18), '#4e342e', half, 1.88, z);
    part(g, cyl(0.078, 0.078, 0.02, 18), '#212121', half, 1.85, z, { outline: false });
    const crates: Array<[string, string]> = [['소품 S#12 옥상', '#f48fb1'], ['소품 S#7 항구', '#90caf9'], ['소품 S#5 학교', '#ffe082']];
    crates.forEach(([s, col], i) => {
      const x = -half + 0.3 + i * 0.42;
      part(g, rbox(0.36, 0.2, 0.3, 0.01), '#cfd8dc', x, 0.37, z);
      label(g, s, 0.3, 0.06, x, 0.38, z + 0.152, col, '#1a1a1a');
    });
    // A rotary phone and a suitcase on top of the crates, an umbrella off the end.
    part(g, rbox(0.16, 0.06, 0.14, 0.02), '#2e7d32', -half + 0.3, 0.5, z);
    part(g, rbox(0.18, 0.03, 0.05, 0.02), '#2e7d32', -half + 0.3, 0.55, z);
    part(g, cyl(0.04, 0.04, 0.01, 14), '#fafafa', -half + 0.3, 0.535, z + 0.07, { rx: Math.PI / 2 - 0.4, outline: false });
    part(g, rbox(0.4, 0.26, 0.12, 0.02), '#795548', 0.25, 0.6, z, { rz: 0.04 });
    part(g, box(0.4, 0.02, 0.124), '#d7ccc8', 0.25, 0.6, z, { rz: 0.04, outline: false });
    rod(g, V(-half - 0.04, 1.6, z), V(-half - 0.06, 0.8, z + 0.05), 0.01, '#212121');
    part(g, cyl(0.01, 0.11, 0.5, 8), '#1a237e', -half - 0.05, 1.3, z + 0.03, { rz: Math.PI });
    const reach = marker(g, 0.15, 1.3, z + 0.05);
    out.work = reach;
    out.spots = { '*': standAt(g, 0.15, D / 2 + 0.05, Math.PI, 'rummage', reach) };
  },

  /**
   * A test set (테스트 촬영 세트): a room's corner built of flats in old wallpaper with a window on the
   * night city, the skirting and the cornice, a framed family photo and a clock; a mustard sofa on a
   * rug, a side table with a practical lamp (lit while it's used), coloured T-marks taped where the
   * actors stand; a fresnel on its stand at the front, a flag on a C-stand, the director's chair out
   * front. A scene blocked stood on the set facing out to the camera — the feeling shown with a hand
   * on the heart, softer, the hands framing the shot, a point, down on the haunches at a mark.
   */
  fmSetCorner(g, W, D, _c, _def, _ctx, out) {
    const x0 = -W / 2 + 0.05;
    const x1 = W / 2 - 0.4;
    const bz = -D / 2 + 0.06;
    const H = 2.3;
    const wx0 = 0.15;
    const wx1 = 0.85;
    const wy0 = 1.05;
    const wy1 = 1.95;
    const paper = painted('fm-wallpaper', 512, 512, paintWallpaper);
    const FLAT = '#d9c7a3';
    const panel = (xa: number, xb: number, ya: number, yb: number) => {
      part(g, box(xb - xa, yb - ya, 0.06), FLAT, (xa + xb) / 2, (ya + yb) / 2, bz);
      picture(g, paper, xb - xa, yb - ya, (xa + xb) / 2, (ya + yb) / 2, bz + 0.031);
    };
    panel(x0, wx0, 0, H);
    panel(wx1, x1, 0, H);
    panel(wx0, wx1, 0, wy0);
    panel(wx0, wx1, wy1, H);
    picture(g, painted('fm-backing', 256, 320, paintBacking), wx1 - wx0, wy1 - wy0, (wx0 + wx1) / 2, (wy0 + wy1) / 2, bz - 0.06);
    for (const [x, y, w, h] of [[wx0, (wy0 + wy1) / 2, 0.04, wy1 - wy0 + 0.04], [wx1, (wy0 + wy1) / 2, 0.04, wy1 - wy0 + 0.04], [(wx0 + wx1) / 2, wy0, wx1 - wx0, 0.05], [(wx0 + wx1) / 2, wy1, wx1 - wx0, 0.04], [(wx0 + wx1) / 2, (wy0 + wy1) / 2, 0.02, wy1 - wy0], [(wx0 + wx1) / 2, (wy0 + wy1) / 2, wx1 - wx0, 0.02]] as const)
      part(g, box(w, h, 0.07), '#f5f1e8', x, y, bz + 0.01);
    for (const sx of [-1, 1]) part(g, box(0.16, 0.95, 0.02), '#efe6d2', (sx < 0 ? wx0 - 0.06 : wx1 + 0.06), 1.5, bz + 0.05, { outline: false });
    // The side flat.
    const sz0 = bz;
    const sz1 = 0.25;
    part(g, box(0.06, H, sz1 - sz0), FLAT, x0, H / 2, (sz0 + sz1) / 2);
    picture(g, paper, sz1 - sz0, H, x0 + 0.031, H / 2, (sz0 + sz1) / 2, '#ffffff', Math.PI / 2);
    part(g, box(x1 - x0, 0.1, 0.02), '#6d4c41', (x0 + x1) / 2, 0.05, bz + 0.04);
    part(g, box(x1 - x0, 0.06, 0.04), '#efe6d2', (x0 + x1) / 2, H - 0.03, bz + 0.04);
    part(g, box(0.02, 0.1, sz1 - sz0), '#6d4c41', x0 + 0.04, 0.05, (sz0 + sz1) / 2);
    // The photo, the clock.
    const ph = group(g, -0.55, 1.55, bz + 0.04);
    part(ph, rbox(0.42, 0.32, 0.025, 0.006), '#5d4037', 0, 0, 0);
    picture(ph, painted('fm-family', 256, 192, (c) => {
      c.fillStyle = '#d9cbb8';
      c.fillRect(0, 0, 256, 192);
      for (const [x, s, long] of [[80, 34, false], [140, 30, true], [196, 22, false]] as const) silhouette(c, x, 180, s, long, '#6d5a4a');
    }), 0.37, 0.27, 0, 0, 0.014);
    part(g, cyl(0.11, 0.11, 0.03, 20), '#fafafa', -1.15, 1.8, bz + 0.04, { rx: Math.PI / 2 });
    part(g, box(0.008, 0.08, 0.004), '#212121', -1.15, 1.83, bz + 0.058, { outline: false });
    part(g, box(0.06, 0.008, 0.004), '#212121', -1.13, 1.8, bz + 0.058, { outline: false });
    // The rug, the sofa, the side table and its lamp.
    part(g, box(1.7, 0.008, 1.0), '#7b3f32', -0.42, 0.004, bz + 0.62, { outline: false });
    part(g, box(1.5, 0.009, 0.82), '#a85a45', -0.42, 0.005, bz + 0.62, { outline: false });
    const sofa = group(g, -0.45, 0, bz + 0.36);
    const MUSTARD = '#c99a3a';
    part(sofa, rbox(1.2, 0.24, 0.56, 0.05), MUSTARD, 0, 0.2, 0);
    for (const sx of [-1, 1]) part(sofa, rbox(0.54, 0.12, 0.5, 0.05), shade(MUSTARD, 1.08), sx * 0.29, 0.38, 0.02);
    part(sofa, rbox(1.2, 0.42, 0.16, 0.06), shade(MUSTARD, 0.9), 0, 0.52, -0.22);
    for (const sx of [-1, 1]) part(sofa, rbox(0.12, 0.3, 0.56, 0.05), shade(MUSTARD, 0.92), sx * 0.6, 0.42, 0);
    part(sofa, rbox(0.3, 0.26, 0.1, 0.05), '#5c6bc0', 0.35, 0.56, -0.08, { rz: 0.2 });
    const tx = -1.2;
    const tz = bz + 0.3;
    part(g, cyl(0.2, 0.2, 0.03, 18), '#6d4c41', tx, 0.56, tz);
    part(g, cyl(0.025, 0.025, 0.54, 8), '#5d4037', tx, 0.28, tz, { outline: false });
    part(g, cyl(0.12, 0.12, 0.02, 14), '#5d4037', tx, 0.01, tz);
    part(g, cyl(0.06, 0.07, 0.16, 14), '#90a4ae', tx, 0.66, tz);
    part(g, cyl(0.1, 0.16, 0.2, 16), '#f3e5c0', tx, 0.86, tz);
    const use = inUse(g, out);
    glowing(use, cyl(0.095, 0.155, 0.19, 16), '#ffe6a6', tx, 0.86, tz);
    glowing(use, ball(0.04), '#fff8e1', tx, 0.82, tz);
    // Tape marks.
    for (const [x, zz, col] of [[0.45, -0.15, '#ff4081'], [-0.25, -0.3, '#40c4ff']] as const) {
      part(g, box(0.18, 0.002, 0.025), col, x, 0.012, zz, { outline: false });
      part(g, box(0.025, 0.002, 0.12), col, x, 0.012, zz + 0.06, { outline: false });
    }
    // The fresnel at the front, the flag, the director's chair.
    const fx = -W / 2 + 0.3;
    const fzz = D / 2 - 0.25;
    lightStand(g, fx, fzz, 1.85, 0.22);
    const fr = group(g, fx, 1.9, fzz, -2.5);
    part(fr, cyl(0.12, 0.12, 0.24, 16), '#2b2b30', 0, 0, 0, { rx: Math.PI / 2 - 0.25 });
    for (const sx of [-1, 1]) part(fr, box(0.004, 0.2, 0.12), '#1a1a1d', sx * 0.13, 0, 0.17, { ry: sx * 0.5, outline: false });
    part(fr, cyl(0.1, 0.1, 0.004, 16), '#5e6168', 0, -0.03, 0.12, { rx: Math.PI / 2 - 0.25, outline: false });
    const frOn = group(use, fx, 1.9, fzz, -2.5);
    glowing(frOn, cyl(0.1, 0.1, 0.004, 16), '#fff3d6', 0, -0.03, 0.124, Math.PI / 2 - 0.25);
    const cs = W / 2 - 0.2;
    lightStand(g, cs, bz + 0.4, 1.6, 0.22);
    rod(g, V(cs, 1.6, bz + 0.4), V(cs - 0.5, 2.05, bz + 0.6), 0.01, CHROME);
    part(g, box(0.5, 0.36, 0.01), '#111111', cs - 0.6, 2.08, bz + 0.65, { ry: 0.4, rx: -0.3 });
    const ch = group(g, W / 2 - 0.3, 0, D / 2 - 0.3, Math.PI + 0.5);
    for (const sx of [-1, 1]) {
      rod(ch, V(sx * 0.22, 0, -0.18), V(sx * 0.22, 0.62, 0.18), 0.015, '#3e2723');
      rod(ch, V(sx * 0.22, 0, 0.18), V(sx * 0.22, 0.62, -0.18), 0.015, '#3e2723');
      rod(ch, V(sx * 0.22, 0.62, -0.18), V(sx * 0.22, 1.12, -0.2), 0.015, '#3e2723');
    }
    part(ch, box(0.42, 0.02, 0.36), '#263238', 0, 0.62, 0);
    part(ch, box(0.46, 0.2, 0.012), '#263238', 0, 1.0, -0.2);
    label(ch, '감독', 0.2, 0.08, 0, 1.0, -0.208, '#263238', '#ffffff', Math.PI);
    const mark = marker(g, 0.45, 1.0, -0.15);
    out.work = mark;
    out.spots = { '*': standAt(g, 0.45, -0.2, 0, 'fmCoach', mark) };
  },

  /**
   * The ADR booth (후시 녹음 부스): three walls of grey foam (the wings angled out), the ADR sign and
   * the red REC light over it; inside the picture on a monitor at eye height — the line's streamer
   * wiping across it, three beeps, the subtitle as it's voiced — a large-diaphragm mic in its shock
   * mount behind a pop filter on a boom set to the mouth, a music stand with the cue sheet, the
   * headphones on a hook (on the head while it's used). Voiced stood at the mic, a hand to the cup,
   * on the fourth beat after the beeps, acting the line (adrRound).
   */
  fmAdrBooth(g, W, D, _c, _def, _ctx, out) {
    const bw = W - 0.24;
    const bz = -D / 2 + 0.05;
    const hgt = 2.15;
    const foam = painted('fm-foam', 256, 256, paintFoam);
    part(g, box(bw, hgt, 0.08), '#2e3238', 0, hgt / 2, bz);
    picture(g, foam, bw - 0.08, hgt - 0.12, 0, hgt / 2, bz + 0.041);
    for (const sx of [-1, 1]) {
      const wing = group(g, sx * (bw / 2), 0, bz, sx * 0.25);
      part(wing, box(0.08, hgt, 0.7), '#2e3238', 0, hgt / 2, 0.35);
      picture(wing, foam, 0.66, hgt - 0.12, -sx * 0.041, hgt / 2, 0.35, '#ffffff', -sx * (Math.PI / 2));
    }
    part(g, box(bw + 0.1, 0.16, 0.12), '#1e2126', 0, hgt + 0.08, bz + 0.02);
    label(g, 'ADR', 0.3, 0.1, -0.3, hgt + 0.08, bz + 0.081, '#1e2126', '#ffffff');
    part(g, rbox(0.26, 0.1, 0.03, 0.01), '#3a1010', 0.3, hgt + 0.08, bz + 0.085);
    const use = inUse(g, out);
    const rec = group(use, 0.3, hgt + 0.08, bz + 0.101);
    picture(rec, painted('label|● REC|#ff1744|#ffffff|160', 160, 64, (c) => {
      c.fillStyle = '#ff1744';
      c.fillRect(0, 0, 160, 64);
      text(c, '● REC', 80, 34, 36, '#ffffff', 'center');
    }), 0.24, 0.09, 0, 0, 0);
    // The monitor with the picture, the streamer and the beeps, the subtitle.
    const my = 1.5;
    const mz = bz + 0.06;
    part(g, rbox(0.66, 0.4, 0.04, 0.01), BLACK, 0, my, mz);
    part(g, box(0.62, 0.35, 0.004), '#101418', 0, my, mz + 0.0205, { outline: false });
    const screen = group(use, 0, my, mz + 0.023);
    picture(screen, painted('fm-adr-scene', 352, 200, paintScene(352, 200)), 0.62, 0.35, 0, 0, 0);
    const streamer = glowing(screen, box(0.012, 0.35, 0.001), '#fff176', 0, 0, 0.002);
    const beeps = [0, 1, 2].map((i) => glowing(screen, cyl(0.016, 0.016, 0.001, 12), '#ffffff', (i - 1) * 0.05, -0.13, 0.003, Math.PI / 2));
    const sub = label(screen, '지수: 다시는… 여기 안 올 줄 알았어.', 0.5, 0.04, 0, -0.14, 0.003, '#000000', '#ffffff');
    // The mic on its boom, the pop filter; the music stand with the cue sheet.
    const spotZ = D / 2 - 0.38;
    const px = 0.42;
    const pz = bz + 0.4;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      rod(g, V(px, 0.1, pz), V(px + Math.sin(a) * 0.24, 0.01, pz + Math.cos(a) * 0.24), 0.011, '#2b2b30');
    }
    part(g, cyl(0.013, 0.013, 1.18, 8), '#2b2b30', px, 0.68, pz, { outline: false });
    const boom = stretchy(g, 0.01, '#2b2b30');
    const micG = group(g, 0, 1.34, spotZ - 0.24);
    part(micG, cyl(0.028, 0.028, 0.14, 16), '#c9ccd1', 0, 0, 0);
    part(micG, cyl(0.029, 0.029, 0.04, 16), '#8a8f99', 0, 0.045, 0, { outline: false });
    part(micG, ring(0.05, 0.004), '#2b2b30', 0, 0, 0, { rx: Math.PI / 2, outline: false });
    part(micG, ring(0.07, 0.006), '#2b2b30', 0, 0, 0.08, { outline: false });
    glass(micG, cyl(0.068, 0.068, 0.002, 20), 0, 0, 0.08, undefined, Math.PI / 2);
    rod(micG, V(0.07, 0, 0.08), V(0.06, -0.05, 0.0), 0.004, '#2b2b30');
    const msx = 0.24;
    const msz = spotZ - 0.3;
    part(g, cyl(0.01, 0.01, 0.95, 8), '#2b2b30', msx, 0.5, msz - 0.04, { outline: false });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      rod(g, V(msx, 0.08, msz - 0.04), V(msx + Math.sin(a) * 0.18, 0.01, msz - 0.04 + Math.cos(a) * 0.18), 0.008, '#2b2b30');
    }
    const desk = group(g, msx, 1.0, msz, 0);
    desk.rotation.x = -0.5;
    part(desk, box(0.32, 0.22, 0.008), '#2b2b30', 0, 0, 0);
    picture(desk, painted('fm-adr-script', 256, 200, paintAdrScript), 0.28, 0.2, 0, 0.0, 0.005);
    const script = marker(g, msx, 1.02, msz + 0.03);
    // Headphones on a hook, or on the head.
    const hookHp = group(g, -bw / 2 + 0.2, 1.4, bz + 0.15);
    part(hookHp, ring(0.09, 0.012, Math.PI), '#2b2b30', 0, 0, 0, { outline: false });
    for (const sx of [-1, 1]) part(hookHp, cyl(0.04, 0.04, 0.03, 14), '#2b2b30', sx * 0.09, -0.02, 0, { rz: Math.PI / 2 });
    const st = standAt(g, 0, spotZ, Math.PI, 'fmAdr', script);
    const hold = holder(use, st.at, Math.PI);
    const hp = headphones(hold);
    const clock = liveClock();
    const pole = V(px, 1.26, pz);
    let lastH = -1;
    out.animate = (t) => {
      clock.mark(t);
      const H = heightOf(st);
      if (Math.abs(H - lastH) > 1e-3) {
        lastH = H;
        hp.fit(H);
        micG.position.y = 0.84 * H;
        stretch(boom, pole, V(0.03, 0.84 * H + 0.03, micG.position.z));
      }
      const k = adrRound(t, phaseOf(st), H, bo(0, 0, 0));
      streamer.visible = k.streamer >= 0;
      streamer.position.x = -0.31 + 0.62 * Math.max(0, k.streamer);
      beeps.forEach((b, i) => (b.visible = k.beep > i));
      sub.visible = k.speaking;
      rec.visible = k.speaking || Math.sin(t * 4) > 0;
    };
    out.away = (_o, t) => {
      hookHp.visible = !clock.on(t);
    };
    stretch(boom, pole, V(0.03, 1.37, spotZ - 0.24));
    out.work = script;
    out.spots = { '*': st };
  },

  /**
   * A screening room seat (시사실 좌석): a red velvet tip-up seat and high back on a black steel
   * standard, padded arms with a cup holder, the row and number on a brass plate. Sat in to watch the
   * cut.
   */
  fmCinemaSeat(g, _W, _D, _c, _def, _ctx, out) {
    const seatY = 0.46;
    for (const sx of [-1, 1]) {
      part(g, rbox(0.06, 0.62, 0.5, 0.02), '#26262b', sx * 0.29, 0.31, -0.02);
      part(g, rbox(0.09, 0.05, 0.46, 0.025), '#3b2b2b', sx * 0.29, 0.64, 0.0);
    }
    part(g, cyl(0.035, 0.035, 0.03, 12), '#111111', 0.29, 0.66, 0.16, { outline: false });
    part(g, rbox(0.5, 0.12, 0.46, 0.05), VELVET, 0, seatY - 0.06, 0.04);
    part(g, rbox(0.5, 0.74, 0.12, 0.06), VELVET, 0, seatY + 0.34, -0.2, { rx: -0.12 });
    part(g, rbox(0.46, 0.04, 0.02, 0.01), shade(VELVET, 0.75), 0, seatY + 0.55, -0.13, { rx: -0.12, outline: false });
    part(g, rbox(0.5, 0.7, 0.03, 0.02), '#26262b', 0, seatY + 0.32, -0.27, { rx: -0.12 });
    label(g, 'D-7', 0.06, 0.03, 0.322, 0.4, 0.15, GOLD, '#1a1a1a', Math.PI / 2);
    out.seat = marker(g, 0, seatY, 0.04);
  },

  /**
   * A folding chair the auditioning actors wait on (오디션 대기 의자): a steel frame, a padded seat
   * and back, their number taped on its back. With one sat in it, the sides read with them stood in
   * front, the pages in both hands, a page turned, a note pencilled (sidesRound); or the scene shown
   * to them — a hand on the heart, softer, the frame of the hands, down on the haunches beside them
   * (coachRound).
   */
  fmAuditionChair(g, _W, _D, _c, _def, _ctx, out) {
    const seatY = 0.46;
    const FR = '#5e6168';
    for (const sx of [-1, 1]) {
      rod(g, V(sx * 0.2, 0, 0.2), V(sx * 0.2, 0.86, -0.2), 0.013, FR);
      rod(g, V(sx * 0.2, 0, -0.2), V(sx * 0.2, seatY - 0.02, 0.18), 0.013, FR);
    }
    rod(g, V(-0.2, 0.06, 0.2), V(0.2, 0.06, 0.2), 0.01, FR);
    part(g, rbox(0.42, 0.05, 0.4, 0.02), '#263238', 0, seatY - 0.02, 0.0);
    part(g, rbox(0.4, 0.2, 0.03, 0.015), '#263238', 0, 0.76, -0.18, { rx: -0.1 });
    label(g, 'No. 07', 0.12, 0.05, 0, 0.76, -0.198, '#fffde7', '#c62828', Math.PI);
    out.seat = marker(g, 0, seatY, 0.02);
    const sides = standAt(g, 0.12, 0.95, Math.PI, 'fmSides');
    const cx = 0.48;
    const cz = 0.82;
    const coach = standAt(g, cx, cz, Math.atan2(-cx, -(cz - 0.1)), 'fmCoach');
    const props = new THREE.Group();
    g.add(props);
    const hold = holder(props, sides.at, Math.PI);
    const pages = group(hold, 0, 0, 0);
    for (let i = 0; i < 3; i++) part(pages, box(0.21, 0.29, 0.002), PAPER, i * 0.004, -i * 0.003, -i * 0.003, { outline: i === 0 });
    picture(pages, painted('fm-script-screen', 256, 360, paintScriptScreen), 0.2, 0.28, 0, 0, 0.0015);
    props.visible = false;
    out.animate = (t) => {
      if (!posed(sides, t)) return;
      const H = heightOf(sides);
      const k = sidesRound(t, phaseOf(sides), H);
      place(pages, k.pages);
      faceTo(pages, hold, eyesOf(H));
    };
    out.away = (_o, t) => {
      props.visible = posed(sides, t);
    };
    out.spots = { 'social:auditionActor': sides, 'social:directActor': coach };
  },
};
