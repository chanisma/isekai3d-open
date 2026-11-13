import * as THREE from 'three';
import { deskChair, marker, rod, shade, spot, type Builder, type Built, type Spot } from '../parts';
import type { Motion } from '../activity';
import { ball, box, canvasTexture, cyl, part, rbox } from '../toon';
import { ANN_DOOR, CAB, EAR, KEY_CLIP, RUN_DIST, blowRound, cabRound, inspectRound, keyAt, keyRound, sbPhase, wandTop } from './subwayDriverMotion';

/**
 * The 지하철 승무사업소 drawn as itself (2026-10-27 workplace pipeline, at the user's request): the
 * simulator cab, the 관제 console, the crew desk and the train out at the depot redone, and what the
 * depot was missing — the 출근 점호대 with its 음주 측정기, the cab key cabinet, the 노선도, the 안전
 * 수칙 board and the crew lockers. Each use puts the driver where it's done: sat at the cab's desk
 * with the 마스콘 in the left hand while the tunnel runs on the screen, the arm out at the signal for
 * the 지적확인; at the console with the hotline at the ear while a section of the line flashes red;
 * stood at the counter blowing into the wand; crouched at the bogie with the test hammer.
 */

const FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
const BLACK = '#24262b';
const STAINLESS = '#cfd5da';
const LINE2 = '#2fa84f';
const NAVY = '#1e2a55';
const DESK = '#3c4148';
const OPERATOR = '한빛도시철도';

/** Lit parts (lamps, LEDs): one unlit material a colour, shared. */
const lit = new Map<string, THREE.MeshBasicMaterial>();
function glow(color: string): THREE.MeshBasicMaterial {
  let m = lit.get(color);
  if (!m) lit.set(color, (m = new THREE.MeshBasicMaterial({ color })));
  return m;
}
/** Glass: whoever's behind it shows through. */
const GLASS = new THREE.MeshToonMaterial({ color: '#a9cfe0', transparent: true, opacity: 0.28, depthWrite: false });
const DARK_GLASS = new THREE.MeshToonMaterial({ color: '#2c3a46', transparent: true, opacity: 0.55, depthWrite: false });

/** Shapes made once (never disposed, like toon.ts's shared geometry). */
const shapes = new Map<string, THREE.BufferGeometry>();
function shape(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let s = shapes.get(key);
  if (!s) shapes.set(key, (s = make()));
  return s;
}
const ring = (r: number, t: number) => shape(`ring${r},${t}`, () => new THREE.TorusGeometry(r, t, 6, 18));
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UP = new THREE.Vector3(0, 1, 0);
const tmp = new THREE.Vector3();
const frac = (x: number) => ((x % 1) + 1) % 1;

/** Pictures painted once a key (maps, screens, boards, labels). */
const paints = new Map<string, THREE.Texture>();
function painted(key: string, cw: number, ch: number, paint: (x: CanvasRenderingContext2D) => void): THREE.Texture {
  let t = paints.get(key);
  if (!t) paints.set(key, (t = canvasTexture(cw, ch, paint)));
  return t;
}
/** A flat picture facing +z (turned by `ry`, tipped by `rx`), always seen in its own colours. */
function sheet(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, 0, 'YXZ');
  g.add(m);
  return m;
}
/** Words on a plate, `bg` behind them (or nothing for 'none'). */
function label(g: THREE.Object3D, text: string, w: number, h: number, x: number, y: number, z: number, bg: string, fg: string, ry = 0, rx = 0): THREE.Mesh {
  const ch = 64;
  const cw = Math.max(64, Math.round((ch * w) / h / 16) * 16);
  const tex = painted(`label|${text}|${bg}|${fg}|${cw}`, cw, ch, (c) => {
    if (bg !== 'none') {
      c.fillStyle = bg;
      c.fillRect(0, 0, cw, ch);
    }
    c.fillStyle = fg;
    c.font = `bold ${Math.round(ch * 0.62)}px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, cw / 2, ch * 0.54, cw * 0.94);
  });
  return sheet(g, tex, w, h, x, y, z, ry, rx);
}
/** A screen the lot lights while it's used (dark when off): `out.screen`. */
function screenOf(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, color: '#2a3140' }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, 0, 'YXZ');
  g.add(m);
  return m;
}
/** A group placed and turned in `parent`. */
function group(parent: THREE.Object3D, x = 0, y = 0, z = 0, ry = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}
/** A spot stood at, facing `yaw`, and what's done there. */
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
/** Whether a dweller's posed at a spot just now (activity.ts spotPose marks it). */
const posed = (s: Spot, t: number) => Math.abs(t - posedAt(s)) < 0.6;
/** How tall whoever's posed at a spot is. */
const heightAt = (s: Spot) => (s.at.userData.height as number | undefined) ?? 1.6;
/** A dweller facing -z in a piece's frame: its left is -x, ahead is -z. */
const DWELLER_FWD = new THREE.Vector3(0, 0, -1);
const DWELLER_LEFT = new THREE.Vector3(-1, 0, 0);

// ---------------------------------------------------------------------------------------------
// People drawn in: a senior driver in the simulator, the duty officer, the driver in the train's cab.

interface Look {
  top: string;
  bottom: string;
  hair: string;
  jacket?: string;
  skin?: string;
  glasses?: boolean;
  /** The uniform cap, its band's colour. */
  cap?: string;
}
const SKIN = '#f1c9a5';
const LOOKS = {
  senior: { top: '#e8eef5', bottom: NAVY, hair: '#2a2a2a', jacket: NAVY, cap: '#c9a227' } as Look,
  officer: { top: '#e8eef5', bottom: NAVY, hair: '#4a4a4a', jacket: '#283593', glasses: true, cap: '#c9a227' } as Look,
  driver: { top: '#e8eef5', bottom: NAVY, hair: '#1a1a1a', jacket: NAVY, cap: '#c9a227' } as Look,
};

interface Figure {
  root: THREE.Group;
  /** Puts the left / right hand at a point in the parent's frame, or back at rest. */
  armL(to: THREE.Vector3 | null): void;
  armR(to: THREE.Vector3 | null): void;
}
/** A limb between two points (stretched and turned each time it's set). */
function limb(g: THREE.Object3D, r: number, color: string): (a: THREE.Vector3, b: THREE.Vector3) => void {
  const m = part(g, cyl(r, r * 0.9, 1, 8), color, 0, 0, 0, { outline: false });
  const d = new THREE.Vector3();
  return (a, b) => {
    d.subVectors(b, a);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.scale.set(1, Math.max(0.001, d.length()), 1);
    m.quaternion.setFromUnitVectors(UP, d.normalize());
  };
}
/**
 * Someone in uniform drawn in, sat on a seat whose top is `seat` high at (x, z) in `parent`, turned
 * `ry` (0 faces +z). The hands rest in the lap until put somewhere.
 */
function person(parent: THREE.Object3D, look: Look, x: number, z: number, ry: number, seat: number): Figure {
  const root = group(parent, x, 0, z, ry);
  const skin = look.skin ?? SKIN;
  const sh = seat;
  const shoulderY = sh + 0.53;
  const torsoY = sh + 0.33;
  for (const sx of [-1, 1]) {
    const hip = v3(sx * 0.09, sh + 0.07, -0.03);
    const knee = v3(sx * 0.1, sh + 0.1, 0.36);
    const ankle = v3(sx * 0.1, Math.max(0.1, sh - 0.32), 0.48);
    rod(root, hip, knee, 0.062, look.bottom);
    rod(root, knee, ankle, 0.05, look.bottom);
    part(root, rbox(0.09, 0.07, 0.2, 0.03), '#16181c', sx * 0.1, ankle.y - 0.035, ankle.z + 0.05);
  }
  part(root, rbox(0.31, 0.15, 0.26, 0.06), look.bottom, 0, sh + 0.08, 0);
  const tz = -0.02;
  part(root, rbox(0.34, 0.46, 0.21, 0.08), look.top, 0, torsoY, tz);
  if (look.jacket) {
    part(root, rbox(0.36, 0.44, 0.23, 0.08), look.jacket, 0, torsoY - 0.01, tz);
    part(root, box(0.09, 0.18, 0.235), look.top, 0, torsoY + 0.12, tz, { outline: false });
    part(root, box(0.03, 0.15, 0.24), '#8e1b1b', 0, torsoY + 0.1, tz, { outline: false });
    // The badge and the name tag.
    part(root, box(0.05, 0.03, 0.004), '#c9a227', 0.1, torsoY + 0.1, tz + 0.118, { outline: false });
    part(root, box(0.07, 0.022, 0.004), '#fafafa', -0.1, torsoY + 0.1, tz + 0.118, { outline: false });
  }
  part(root, cyl(0.045, 0.05, 0.08, 10), skin, 0, shoulderY + 0.06, tz, { outline: false });
  const head = group(root, 0, shoulderY + 0.2, tz);
  part(head, ball(0.112), skin, 0, 0, 0);
  for (const sx of [-1, 1]) part(head, ball(0.012), '#2b2b30', sx * 0.04, 0.0, 0.104, { outline: false });
  part(head, box(0.03, 0.006, 0.004), '#a1665e', 0, -0.045, 0.104, { outline: false });
  part(head, ball(0.118), look.hair, 0, 0.02, -0.035);
  if (look.glasses) {
    for (const sx of [-1, 1]) part(head, ring(0.024, 0.003), '#37474f', sx * 0.042, 0.002, 0.11);
    part(head, box(0.02, 0.004, 0.004), '#37474f', 0, 0.002, 0.112, { outline: false });
  }
  if (look.cap) {
    // The uniform cap: the crown, its band and badge, the black peak.
    part(head, cyl(0.135, 0.118, 0.07, 18), NAVY, 0, 0.1, -0.005);
    part(head, cyl(0.121, 0.121, 0.03, 18), look.cap, 0, 0.075, -0.005, { outline: false });
    part(head, box(0.18, 0.012, 0.08), '#111111', 0, 0.06, 0.1, { rx: 0.25 });
    part(head, ball(0.018), '#e0c25a', 0, 0.1, 0.122, { outline: false });
  }
  const arm = (sx: number) => {
    const shoulder = v3(sx * 0.2, shoulderY, tz);
    const rest = v3(sx * 0.11, sh + 0.16, 0.24);
    const upper = limb(root, 0.044, look.jacket ?? look.top);
    const lower = limb(root, 0.036, look.jacket ?? look.top);
    const hand = part(root, ball(0.036), skin, 0, 0, 0, { outline: false });
    const loc = new THREE.Vector3();
    const elbow = new THREE.Vector3();
    const d = new THREE.Vector3();
    const bend = new THREE.Vector3();
    return (to: THREE.Vector3 | null) => {
      if (to) loc.copy(to).sub(root.position).applyAxisAngle(UP, -root.rotation.y);
      else loc.copy(rest);
      d.subVectors(loc, shoulder);
      const L = Math.min(0.5, Math.max(0.05, d.length()));
      d.normalize();
      loc.copy(shoulder).addScaledVector(d, L);
      const a = 0.27;
      const b = 0.25;
      const cosA = THREE.MathUtils.clamp((a * a + L * L - b * b) / (2 * a * L), -1, 1);
      bend.set(sx * 0.6, -1, -0.25).normalize();
      bend.addScaledVector(d, -bend.dot(d)).normalize();
      elbow.copy(shoulder).addScaledVector(d, a * cosA).addScaledVector(bend, a * Math.sqrt(1 - cosA * cosA));
      upper(shoulder, elbow);
      lower(elbow, loc);
      hand.position.copy(loc);
    };
  };
  const armL = arm(1);
  const armR = arm(-1);
  armL(null);
  armR(null);
  return { root, armL, armR };
}

/** An office chair facing +z (turned `ry`), its seat `h` up. */
function chair(g: THREE.Object3D, x: number, z: number, ry: number, h: number, color: string) {
  const c = group(g, x, 0, z, ry);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    rod(c, v3(0, 0.07, 0), v3(Math.sin(a) * 0.22, 0.04, Math.cos(a) * 0.22), 0.014, BLACK);
  }
  part(c, cyl(0.022, 0.022, h - 0.08, 10), '#9aa3ab', 0, 0.07 + (h - 0.08) / 2, 0, { outline: false });
  part(c, rbox(0.46, 0.08, 0.44, 0.035), color, 0, h, 0);
  part(c, rbox(0.42, 0.5, 0.06, 0.04), color, 0, h + 0.33, -0.21, { rx: -0.08 });
  for (const sx of [-1, 1]) part(c, rbox(0.05, 0.03, 0.26, 0.012), BLACK, sx * 0.24, h + 0.2, -0.02);
}

// ---------------------------------------------------------------------------------------------
// What's painted: the tunnel and the station on the simulator, the line diagram, screens, boards.

/** Frames of the run ahead, drawn once each: the tunnel's rings and lamps, or the station's platform, coming on. */
const NF = 10;
function tunnelTex(kind: 'tunnel' | 'station', i: number): THREE.Texture {
  return painted(`sbTun|${kind}|${i}`, 512, 288, (c) => {
    const vx = 256;
    const vy = 120;
    const f = 150;
    const ph = i / NF;
    const at = (x: number, y: number, d: number): [number, number] => [vx + (x * f) / d, vy - (y * f) / d];
    // Dark walls closing to the far end.
    const bg = c.createRadialGradient(vx, vy, 4, vx, vy, 330);
    bg.addColorStop(0, kind === 'station' ? '#3a3a30' : '#050608');
    bg.addColorStop(1, kind === 'station' ? '#8d8a7c' : '#2c2a27');
    c.fillStyle = bg;
    c.fillRect(0, 0, 512, 288);
    // The bed between the walls.
    c.fillStyle = '#3b3631';
    c.beginPath();
    const [ax, ay] = at(-2.2, -1.7, 1);
    const [bx, by] = at(2.2, -1.7, 1);
    c.moveTo(ax, ay);
    c.lineTo(bx, by);
    c.lineTo(vx + 3, vy + 2);
    c.lineTo(vx - 3, vy + 2);
    c.closePath();
    c.fill();
    // Sleepers coming on.
    c.strokeStyle = '#6d655b';
    for (let k = 0; k < 40; k++) {
      const d = (k + 1 - frac(ph * 5)) * 0.6 + 0.6;
      const [x1, y1] = at(-1.1, -1.7, d);
      const [x2] = at(1.1, -1.7, d);
      c.lineWidth = Math.max(0.5, 9 / d);
      c.beginPath();
      c.moveTo(x1, y1);
      c.lineTo(x2, y1);
      c.stroke();
    }
    // The rails.
    c.strokeStyle = '#c9d0d6';
    c.lineWidth = 3;
    for (const rx of [-0.72, 0.72]) {
      const [x1, y1] = at(rx, -1.62, 0.9);
      c.beginPath();
      c.moveTo(x1, y1);
      c.lineTo(vx + rx * 2, vy + 2);
      c.stroke();
    }
    if (kind === 'tunnel') {
      // The rings of the bore, the lamps on the left wall, the cable trays on the right.
      for (let k = 12; k >= 0; k--) {
        const d = (k + 1 - ph) * 3;
        const [lx, top] = at(-2.3, 2.2, d);
        const [rx, bot] = at(2.3, -1.7, d);
        c.strokeStyle = `rgba(120,116,108,${Math.min(1, 3 / d)})`;
        c.lineWidth = Math.max(1, 18 / d);
        c.beginPath();
        c.moveTo(lx, bot);
        c.lineTo(lx, vy - (0.9 * f) / d);
        c.quadraticCurveTo(vx, top - (0.6 * f) / d, rx, vy - (0.9 * f) / d);
        c.lineTo(rx, bot);
        c.stroke();
        const [px, py] = at(-2.15, 0.7, d);
        c.fillStyle = '#fff3c4';
        c.beginPath();
        c.arc(px, py, Math.max(1.2, 22 / d), 0, Math.PI * 2);
        c.fill();
      }
      c.strokeStyle = '#4f5a60';
      c.lineWidth = 2;
      for (const y of [0.3, 0.6]) {
        const [x1, y1] = at(2.2, y, 0.9);
        c.beginPath();
        c.moveTo(x1, y1);
        c.lineTo(vx + 2, vy - y * 2);
        c.stroke();
      }
    } else {
      // The platform on the right, its yellow line, the screen doors going by, the lights overhead.
      c.fillStyle = '#c9c4b5';
      c.beginPath();
      const [p1x, p1y] = at(1.1, -0.6, 0.8);
      c.moveTo(p1x, p1y);
      c.lineTo(512, p1y);
      c.lineTo(512, 288);
      c.lineTo(vx + 4, vy + 1);
      c.lineTo(vx + 2, vy);
      c.closePath();
      c.fill();
      c.strokeStyle = '#f2c230';
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(p1x, p1y);
      c.lineTo(vx + 2, vy);
      c.stroke();
      for (let k = 14; k >= 0; k--) {
        const d = (k + 1 - frac(ph * 2)) * 1.5;
        const [x, y0] = at(1.5, -0.6, d);
        const [, y1] = at(1.5, 1.3, d);
        c.fillStyle = 'rgba(160,210,230,0.35)';
        c.fillRect(x, y1, Math.max(2, 90 / d), y0 - y1);
        c.fillStyle = '#5b6770';
        c.fillRect(x, y1, Math.max(1, 6 / d), y0 - y1);
        const [lx, ly] = at(0.2, 2.1, d);
        c.fillStyle = '#ffffff';
        c.fillRect(lx - 30 / d, ly, 60 / d, Math.max(1, 6 / d));
      }
      // The station's name board.
      const [sx, sy] = at(1.7, 1.6, 3.2 - ph * 1.5);
      c.fillStyle = LINE2;
      c.fillRect(sx, sy, 90, 26);
      c.fillStyle = '#ffffff';
      c.font = `bold 18px ${FONT}`;
      c.fillText('성수 Seongsu', sx + 6, sy + 19);
    }
    // The HUD: the run's line and the speed limit.
    c.fillStyle = 'rgba(0,0,0,0.55)';
    c.fillRect(0, 0, 512, 24);
    c.fillStyle = '#ffffff';
    c.font = `bold 14px ${FONT}`;
    c.fillText('2호선 내선순환 · 열차 2073 · 모의 운전', 8, 17);
    c.fillStyle = '#ffd54a';
    c.fillText(kind === 'station' ? '정차역 성수' : '제한 70 km/h', 404, 17);
  });
}
/** The speedometer's face, 0–100 km/h. */
function speedoTex(): THREE.Texture {
  return painted('sbSpeedo', 128, 128, (c) => {
    c.fillStyle = '#101418';
    c.beginPath();
    c.arc(64, 64, 62, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#eceff1';
    c.lineWidth = 2;
    c.fillStyle = '#eceff1';
    c.font = `bold 11px ${FONT}`;
    c.textAlign = 'center';
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
      c.beginPath();
      c.moveTo(64 + Math.cos(a) * 50, 64 + Math.sin(a) * 50);
      c.lineTo(64 + Math.cos(a) * 58, 64 + Math.sin(a) * 58);
      c.stroke();
      if (i % 2 === 0) c.fillText(String(i * 10), 64 + Math.cos(a) * 40, 68 + Math.sin(a) * 40);
    }
    c.fillStyle = '#ff5252';
    c.font = `bold 10px ${FONT}`;
    c.fillText('km/h', 64, 100);
  });
}
/** The cab's ATC/TCMS display: the speed code, the next stop, the doors. */
function atcTex(): THREE.Texture {
  return painted('sbAtc', 256, 144, (c) => {
    c.fillStyle = '#0d1b2a';
    c.fillRect(0, 0, 256, 144);
    c.fillStyle = '#1b5e20';
    c.fillRect(0, 0, 256, 26);
    c.fillStyle = '#ffffff';
    c.font = `bold 16px ${FONT}`;
    c.fillText('TCMS · ATC 운전', 8, 19);
    c.strokeStyle = '#69f0ae';
    c.lineWidth = 3;
    c.strokeRect(12, 38, 74, 62);
    c.fillStyle = '#69f0ae';
    c.font = `bold 36px ${FONT}`;
    c.fillText('70', 22, 84);
    c.fillStyle = '#b0bec5';
    c.font = `bold 15px ${FONT}`;
    c.fillText('다음역  성수', 100, 56);
    c.fillText('출입문  우측', 100, 80);
    c.fillStyle = '#ffd54a';
    c.fillText('BC 2.4 kgf', 100, 104);
    c.fillStyle = '#4fc3f7';
    c.fillRect(12, 116, 232, 14);
    c.fillStyle = '#0d1b2a';
    c.font = `bold 11px ${FONT}`;
    c.fillText('1  2  3  4  5  6  7  8  9  10 량', 22, 127);
  });
}
/** The 마스콘's notch plate: B7 … B1, N, P1 … P4 down the slot. */
function notchTex(): THREE.Texture {
  return painted('sbNotch', 64, 192, (c) => {
    c.fillStyle = '#1c1f24';
    c.fillRect(0, 0, 64, 192);
    const notches = ['EB', 'B7', 'B5', 'B3', 'B1', 'N', 'P1', 'P2', 'P3', 'P4'];
    c.font = `bold 13px ${FONT}`;
    notches.forEach((n, i) => {
      c.fillStyle = n === 'N' ? '#ffffff' : n.startsWith('P') ? '#69f0ae' : '#ff8a80';
      c.fillText(n, 6, 16 + i * 18.5);
    });
    c.fillStyle = '#555c66';
    c.fillRect(40, 6, 8, 180);
  });
}
/** The 관제 board: the line, both tracks, the stations, the depot. */
const BOARD_STATIONS = ['신도림', '대림', '구로디지털', '신림', '서울대입구', '사당', '교대', '강남', '삼성', '잠실', '건대입구', '성수'];
function boardTex(): THREE.Texture {
  return painted('sbBoard', 1024, 330, (c) => {
    c.fillStyle = '#0f1724';
    c.fillRect(0, 0, 1024, 330);
    c.fillStyle = '#1b2638';
    c.fillRect(0, 0, 1024, 44);
    c.fillStyle = '#ffffff';
    c.font = `bold 26px ${FONT}`;
    c.fillText('2호선 열차 운행 표시반', 16, 31);
    c.fillStyle = '#69f0ae';
    c.font = `bold 22px ${FONT}`;
    c.fillText('07:42:15', 880, 31);
    c.fillStyle = '#90a4ae';
    c.font = `bold 16px ${FONT}`;
    c.fillText('관제센터 · 정상 운행', 600, 30);
    // The two tracks.
    for (const [y, name] of [[140, '내선 →'], [200, '← 외선']] as const) {
      c.strokeStyle = LINE2;
      c.lineWidth = 7;
      c.beginPath();
      c.moveTo(40, y);
      c.lineTo(984, y);
      c.stroke();
      c.fillStyle = '#b0bec5';
      c.font = `bold 14px ${FONT}`;
      c.fillText(name, 40, y - 12);
      // Block sections.
      c.strokeStyle = '#0f1724';
      c.lineWidth = 2;
      for (let x = 60; x < 984; x += 26) {
        c.beginPath();
        c.moveTo(x, y - 4);
        c.lineTo(x, y + 4);
        c.stroke();
      }
    }
    // The stations: platform boxes across both tracks, the names below.
    BOARD_STATIONS.forEach((s, i) => {
      const x = 70 + i * 80;
      c.fillStyle = '#eceff1';
      c.fillRect(x - 14, 128, 28, 84);
      c.fillStyle = '#0f1724';
      c.fillRect(x - 10, 132, 20, 76);
      c.fillStyle = '#eceff1';
      c.font = `bold 15px ${FONT}`;
      c.textAlign = 'center';
      c.fillText(s, x, 236 + (i % 2) * 20);
      c.textAlign = 'left';
    });
    // The depot's branch.
    c.strokeStyle = '#ffb74d';
    c.lineWidth = 4;
    c.setLineDash([10, 6]);
    c.beginPath();
    c.moveTo(70, 200);
    c.lineTo(40, 290);
    c.stroke();
    c.setLineDash([]);
    c.fillStyle = '#ffb74d';
    c.font = `bold 15px ${FONT}`;
    c.fillText('신정 차량기지 · 승무사업소', 52, 312);
  });
}
const boardX = (px: number) => (px / 1024 - 0.5) * 1.86;
const boardY = (py: number) => (0.5 - py / 330) * 0.6;
/** The console's left monitor: four platform cameras. */
function cctvTex(): THREE.Texture {
  return painted('sbCctv', 256, 160, (c) => {
    c.fillStyle = '#000000';
    c.fillRect(0, 0, 256, 160);
    for (let i = 0; i < 4; i++) {
      const x = (i % 2) * 128;
      const y = Math.floor(i / 2) * 80;
      c.fillStyle = '#4a4e50';
      c.fillRect(x + 2, y + 2, 124, 76);
      c.fillStyle = '#9e9a8c';
      c.beginPath();
      c.moveTo(x + 2, y + 78);
      c.lineTo(x + 70, y + 20);
      c.lineTo(x + 126, y + 20);
      c.lineTo(x + 126, y + 78);
      c.fill();
      c.strokeStyle = '#f2c230';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(x + 14, y + 78);
      c.lineTo(x + 72, y + 24);
      c.stroke();
      c.fillStyle = '#2a2a2a';
      for (let k = 0; k < 3; k++) c.fillRect(x + 80 + k * 14, y + 34 + (k % 2) * 8, 6, 22);
      c.fillStyle = '#ffffff';
      c.font = `bold 11px ${FONT}`;
      c.fillText(['성수 1-1', '성수 5-4', '건대 1-1', '건대 10-4'][i], x + 6, y + 14);
    }
  });
}
/** The console's middle monitor: trains on the line, their numbers and delays. */
function opsTex(): THREE.Texture {
  return painted('sbOps', 256, 160, (c) => {
    c.fillStyle = '#0d1b2a';
    c.fillRect(0, 0, 256, 160);
    c.fillStyle = '#ffffff';
    c.font = `bold 13px ${FONT}`;
    c.fillText('열차 운행 현황', 8, 18);
    const rows: Array<[string, string, string, string]> = [
      ['2071', '강남', '정시', '#69f0ae'],
      ['2073', '성수', '정시', '#69f0ae'],
      ['2075', '사당', '+1분', '#ffd54a'],
      ['2077', '잠실', '정시', '#69f0ae'],
      ['2079', '신림', '+2분', '#ff8a80'],
    ];
    c.font = `12px ${FONT}`;
    rows.forEach(([n, s, d, col], i) => {
      const y = 40 + i * 22;
      c.fillStyle = '#1b2a3a';
      c.fillRect(6, y - 14, 244, 19);
      c.fillStyle = '#eceff1';
      c.fillText(`열차 ${n}`, 12, y);
      c.fillText(s, 100, y);
      c.fillStyle = col;
      c.fillText(d, 190, y);
    });
    c.fillStyle = '#90a4ae';
    c.fillText('배차 간격 3분 30초', 8, 152);
  });
}
/** The 운행 다이어그램: trains as slanted lines over time and stations. */
function diagramTex(key: string, w: number, h: number, paper: boolean): THREE.Texture {
  return painted(`sbDiagram|${key}`, w, h, (c) => {
    c.fillStyle = paper ? '#fbfaf4' : '#0d1b2a';
    c.fillRect(0, 0, w, h);
    const ink = paper ? '#455a64' : '#90a4ae';
    c.fillStyle = paper ? '#263238' : '#ffffff';
    c.font = `bold ${Math.round(h * 0.07)}px ${FONT}`;
    c.fillText('열차 운행 다이어그램 (평일)', w * 0.03, h * 0.09);
    const x0 = w * 0.12;
    const x1 = w * 0.97;
    const y0 = h * 0.16;
    const y1 = h * 0.94;
    c.strokeStyle = paper ? '#cfd8dc' : '#263a4f';
    c.lineWidth = 1;
    for (let i = 0; i <= 8; i++) {
      const y = y0 + ((y1 - y0) * i) / 8;
      c.beginPath();
      c.moveTo(x0, y);
      c.lineTo(x1, y);
      c.stroke();
    }
    for (let i = 0; i <= 12; i++) {
      const x = x0 + ((x1 - x0) * i) / 12;
      c.beginPath();
      c.moveTo(x, y0);
      c.lineTo(x, y1);
      c.stroke();
    }
    c.fillStyle = ink;
    c.font = `${Math.round(h * 0.045)}px ${FONT}`;
    ['신도림', '사당', '강남', '잠실', '성수'].forEach((s, i) => c.fillText(s, w * 0.01, y0 + ((y1 - y0) * i) / 4 + h * 0.015));
    for (let k = 0; k < 9; k++) {
      c.strokeStyle = k === 4 ? '#e53935' : paper ? '#1565c0' : '#4fc3f7';
      c.lineWidth = k === 4 ? 2.5 : 1.5;
      const xs = x0 + ((x1 - x0) * k) / 9;
      c.beginPath();
      c.moveTo(xs, y0);
      c.lineTo(xs + (x1 - x0) * 0.32, y1);
      c.stroke();
      c.strokeStyle = paper ? '#2e7d32' : '#69f0ae';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(xs + (x1 - x0) * 0.05, y1);
      c.lineTo(xs + (x1 - x0) * 0.37, y0);
      c.stroke();
    }
  });
}
/** The 승무일지 open on the desk: the date, the trains run, the remarks. */
function logTex(): THREE.Texture {
  return painted('sbLog', 384, 256, (c) => {
    c.fillStyle = '#fdfcf6';
    c.fillRect(0, 0, 384, 256);
    c.fillStyle = '#c9c3b2';
    c.fillRect(190, 0, 4, 256);
    c.fillStyle = '#1b5e20';
    c.font = `bold 20px ${FONT}`;
    c.fillText('승 무 일 지', 40, 30);
    c.fillStyle = '#37474f';
    c.font = `13px ${FONT}`;
    c.fillText('2026. 10. 27 (화)  주간', 24, 54);
    c.strokeStyle = '#b0bec5';
    for (let i = 0; i < 8; i++) {
      c.beginPath();
      c.moveTo(14, 70 + i * 22);
      c.lineTo(180, 70 + i * 22);
      c.stroke();
      c.beginPath();
      c.moveTo(204, 30 + i * 26);
      c.lineTo(372, 30 + i * 26);
      c.stroke();
    }
    c.fillStyle = '#1a237e';
    c.font = `italic 13px ${FONT}`;
    const lines = ['2073 신도림→성수 정시', '2081 성수→신도림 +1분', '출입문 재취급 1회', '강남 승객 혼잡'];
    lines.forEach((l, i) => c.fillText(l, 18, 86 + i * 22));
    c.fillText('특이사항 없음', 210, 50);
    c.fillText('인수 확인', 210, 76);
    c.strokeStyle = '#c62828';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(330, 200, 22, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = '#c62828';
    c.font = `bold 13px ${FONT}`;
    c.fillText('확인', 316, 205);
  });
}
/** The front destination sign: orange LEDs on black. */
function destTex(): THREE.Texture {
  return painted('sbDest', 384, 64, (c) => {
    c.fillStyle = '#0a0a0a';
    c.fillRect(0, 0, 384, 64);
    c.fillStyle = LINE2;
    c.beginPath();
    c.arc(34, 32, 24, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ffffff';
    c.font = `bold 32px ${FONT}`;
    c.textAlign = 'center';
    c.fillText('2', 34, 44);
    c.fillStyle = '#ffa726';
    c.font = `bold 34px ${FONT}`;
    c.fillText('성수 순환', 220, 45);
  });
}
/** The 승무 사업표 behind the roll-call counter. */
function dutyTex(): THREE.Texture {
  return painted('sbDuty', 512, 300, (c) => {
    c.fillStyle = '#f7f9fb';
    c.fillRect(0, 0, 512, 300);
    c.fillStyle = NAVY;
    c.fillRect(0, 0, 512, 46);
    c.fillStyle = '#ffffff';
    c.font = `bold 24px ${FONT}`;
    c.fillText('금일 승무 사업표', 16, 32);
    c.font = `bold 16px ${FONT}`;
    c.fillText('10월 27일 (화) 주간', 330, 30);
    const head = ['사업', '기관사', '열차', '출고', '교대'];
    const rows = [
      ['1', '이신호', '2071', '05:32', '사당'],
      ['2', '김지적', '2073', '05:46', '성수'],
      ['3', '박확인', '2075', '06:01', '신도림'],
      ['4', '최정시', '2077', '06:15', '사당'],
      ['5', '정무사', '2079', '06:30', '성수'],
    ];
    const xs = [16, 80, 200, 290, 390];
    c.fillStyle = '#cfd8dc';
    c.fillRect(8, 56, 496, 30);
    c.fillStyle = '#263238';
    c.font = `bold 17px ${FONT}`;
    head.forEach((h, i) => c.fillText(h, xs[i], 77));
    c.font = `16px ${FONT}`;
    rows.forEach((r, j) => {
      const y = 112 + j * 34;
      c.fillStyle = j % 2 ? '#eef2f5' : '#ffffff';
      c.fillRect(8, y - 22, 496, 32);
      c.fillStyle = '#263238';
      r.forEach((v, i) => c.fillText(v, xs[i], y));
    });
    c.fillStyle = '#c62828';
    c.font = `bold 15px ${FONT}`;
    c.fillText('※ 출근 점호 전 음주 측정 필수 · 지적확인 환호응답 생활화', 14, 290);
  });
}
/** The 음주 측정기's little display, by what it's showing. */
function breathTex(state: 'idle' | 'busy' | 'pass'): THREE.Texture {
  return painted(`sbBreath|${state}`, 160, 64, (c) => {
    c.fillStyle = state === 'pass' ? '#0f2a14' : '#0d1b24';
    c.fillRect(0, 0, 160, 64);
    c.font = `bold 15px ${FONT}`;
    if (state === 'idle') {
      c.fillStyle = '#90caf9';
      c.fillText('측정 준비', 10, 24);
      c.fillStyle = '#eceff1';
      c.font = `bold 22px ${FONT}`;
      c.fillText('-.--- %', 10, 54);
    } else if (state === 'busy') {
      c.fillStyle = '#ffd54a';
      c.fillText('불어 주세요…', 10, 24);
      for (let i = 0; i < 6; i++) c.fillRect(10 + i * 22, 36, 16, 18);
    } else {
      c.fillStyle = '#69f0ae';
      c.fillText('정상 · 통과', 10, 24);
      c.font = `bold 26px ${FONT}`;
      c.fillText('0.000 %', 10, 56);
    }
  });
}
/** The 점호부 open on the counter. */
function rollBookTex(): THREE.Texture {
  return painted('sbRollBook', 256, 176, (c) => {
    c.fillStyle = '#fffef8';
    c.fillRect(0, 0, 256, 176);
    c.fillStyle = '#c9c3b2';
    c.fillRect(126, 0, 4, 176);
    c.fillStyle = NAVY;
    c.font = `bold 15px ${FONT}`;
    c.fillText('출근 점호부', 20, 22);
    c.fillText('음주 측정 기록', 142, 22);
    c.strokeStyle = '#b0bec5';
    for (let i = 0; i < 7; i++) {
      c.beginPath();
      c.moveTo(8, 38 + i * 20);
      c.lineTo(120, 38 + i * 20);
      c.moveTo(136, 38 + i * 20);
      c.lineTo(248, 38 + i * 20);
      c.stroke();
    }
    c.fillStyle = '#1a237e';
    c.font = `italic 12px ${FONT}`;
    ['이신호 05:02 ✔', '김지적 05:15 ✔', '박확인 05:28 ✔'].forEach((s, i) => c.fillText(s, 12, 54 + i * 20));
    ['0.000 정상', '0.000 정상', '0.000 정상'].forEach((s, i) => c.fillText(s, 140, 54 + i * 20));
  });
}
/** The 노선도: the loop line, its stations and transfers, the depot, the crew's change points. */
function lineMapTex(): THREE.Texture {
  return painted('sbLineMap', 1024, 512, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 1024, 512);
    c.fillStyle = LINE2;
    c.fillRect(0, 0, 1024, 54);
    c.fillStyle = '#ffffff';
    c.font = `bold 30px ${FONT}`;
    c.fillText('2호선 노선도', 18, 38);
    c.font = `bold 18px ${FONT}`;
    c.fillText(`${OPERATOR} 승무사업소 · 승무원 숙지용`, 610, 36);
    // The loop.
    const L = 120;
    const T = 110;
    const R = 900;
    const B = 430;
    const r = 70;
    c.strokeStyle = LINE2;
    c.lineWidth = 14;
    c.beginPath();
    c.moveTo(L + r, T);
    c.lineTo(R - r, T);
    c.arcTo(R, T, R, T + r, r);
    c.lineTo(R, B - r);
    c.arcTo(R, B, R - r, B, r);
    c.lineTo(L + r, B);
    c.arcTo(L, B, L, B - r, r);
    c.lineTo(L, T + r);
    c.arcTo(L, T, L + r, T, r);
    c.stroke();
    // The branches to the depots.
    c.lineWidth = 8;
    c.setLineDash([14, 8]);
    c.beginPath();
    c.moveTo(L, 330);
    c.lineTo(40, 400);
    c.moveTo(R, 300);
    c.lineTo(990, 360);
    c.stroke();
    c.setLineDash([]);
    const top = ['시청', '을지로입구', '을지로3가', '동대문역사', '신당', '왕십리'];
    const right = ['성수', '건대입구', '잠실'];
    const bottom = ['삼성', '강남', '교대', '사당', '서울대입구', '신림'];
    const left = ['신도림', '영등포구청', '당산', '합정', '홍대입구', '신촌'];
    const transfer = new Set(['시청', '을지로3가', '동대문역사', '왕십리', '건대입구', '잠실', '교대', '사당', '신도림', '영등포구청', '당산', '합정', '홍대입구']);
    const crew = new Set(['성수', '사당', '신도림']);
    const dot = (x: number, y: number, name: string, lx: number, ly: number, align: CanvasTextAlign) => {
      const t = transfer.has(name);
      c.fillStyle = '#ffffff';
      c.strokeStyle = t ? '#212121' : LINE2;
      c.lineWidth = t ? 4 : 5;
      c.beginPath();
      c.arc(x, y, t ? 11 : 8, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      if (crew.has(name)) {
        c.strokeStyle = '#e53935';
        c.lineWidth = 3;
        c.beginPath();
        c.arc(x, y, 18, 0, Math.PI * 2);
        c.stroke();
      }
      c.fillStyle = '#212121';
      c.font = `bold 17px ${FONT}`;
      c.textAlign = align;
      c.fillText(name, lx, ly);
      c.textAlign = 'left';
    };
    top.forEach((s, i) => {
      const x = L + r + ((R - L - 2 * r) * i) / (top.length - 1);
      dot(x, T, s, x, T - 18, 'center');
    });
    right.forEach((s, i) => {
      const y = T + r + ((B - T - 2 * r) * i) / (right.length - 1);
      dot(R, y, s, R - 22, y + 6, 'right');
    });
    bottom.forEach((s, i) => {
      const x = R - r - ((R - L - 2 * r) * i) / (bottom.length - 1);
      dot(x, B, s, x, B + 32, 'center');
    });
    left.forEach((s, i) => {
      const y = B - r - ((B - T - 2 * r) * i) / (left.length - 1);
      dot(L, y, s, L + 22, y + 6, 'left');
    });
    c.fillStyle = '#ef6c00';
    c.font = `bold 16px ${FONT}`;
    c.fillText('신정 차량기지', 20, 425);
    c.fillText('군자 차량기지', 900, 385);
    // The legend.
    c.fillStyle = '#f5f5f5';
    c.fillRect(330, 200, 360, 150);
    c.strokeStyle = '#bdbdbd';
    c.lineWidth = 2;
    c.strokeRect(330, 200, 360, 150);
    c.fillStyle = '#212121';
    c.font = `bold 18px ${FONT}`;
    c.fillText('승무 교대역  ◯ (빨간 원)', 348, 232);
    c.font = `16px ${FONT}`;
    c.fillText('· 내선 순환 1바퀴 약 87분 · 43역', 348, 262);
    c.fillText('· 지상 구간: 성수~잠실, 신림~신도림', 348, 288);
    c.fillText('· 곡선 제한 45km/h: 신당, 당산철교', 348, 314);
    c.fillStyle = '#c62828';
    c.fillText('· 지적확인 신호기 위치 숙지할 것', 348, 340);
  });
}
/** The 안전 수칙 poster: a driver pointing at a green signal, the call, the rules. */
function safetyTex(): THREE.Texture {
  return painted('sbSafety', 384, 512, (c) => {
    c.fillStyle = '#fffdf4';
    c.fillRect(0, 0, 384, 512);
    c.fillStyle = '#c62828';
    c.fillRect(0, 0, 384, 60);
    c.fillStyle = '#ffffff';
    c.font = `bold 34px ${FONT}`;
    c.textAlign = 'center';
    c.fillText('안 전 수 칙', 192, 44);
    // The signal (top left, where the drill points).
    c.fillStyle = '#212121';
    c.fillRect(48, 82, 60, 130);
    c.fillStyle = '#4a0d0d';
    c.beginPath();
    c.arc(78, 112, 20, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#3d3a0c';
    c.beginPath();
    c.arc(78, 150, 20, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#2ee66a';
    c.beginPath();
    c.arc(78, 188, 20, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#616161';
    c.fillRect(72, 212, 12, 40);
    // The driver in his cap, the arm out at it.
    c.fillStyle = NAVY;
    c.fillRect(250, 160, 70, 92);
    c.fillStyle = '#f1c9a5';
    c.beginPath();
    c.arc(285, 132, 26, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = NAVY;
    c.fillRect(256, 98, 58, 18);
    c.fillStyle = '#111111';
    c.fillRect(250, 114, 44, 6);
    c.strokeStyle = NAVY;
    c.lineWidth = 16;
    c.beginPath();
    c.moveTo(260, 176);
    c.lineTo(150, 168);
    c.stroke();
    c.fillStyle = '#f1c9a5';
    c.fillRect(124, 162, 30, 12);
    c.fillStyle = '#ffffff';
    c.strokeStyle = '#212121';
    c.lineWidth = 3;
    c.beginPath();
    c.ellipse(220, 92, 70, 26, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = '#c62828';
    c.font = `bold 22px ${FONT}`;
    c.fillText('신호 진행!', 220, 100);
    c.fillStyle = '#1a237e';
    c.font = `bold 28px ${FONT}`;
    c.fillText('지적확인 환호응답', 192, 300);
    c.textAlign = 'left';
    c.fillStyle = '#263238';
    c.font = `bold 20px ${FONT}`;
    ['① 출발 전 신호 — 진행!', '② 출입문 닫힘 — 확인!', '③ 제한 속도 준수', '④ 무전 지시 복창', '⑤ 정위치 정차 — 좋아!'].forEach((s, i) => c.fillText(s, 34, 344 + i * 32));
  });
}

// ---------------------------------------------------------------------------------------------

// =============================================================================================
// The platform (2026-11-04, the layout audit): the train in at the screen doors, the driver taking it over at the platform's end.

const NOL = { outline: false };
const GLASS_PSD = new THREE.MeshToonMaterial({ color: '#d5eef7', transparent: true, opacity: 0.32, depthWrite: false });
const GLASS_CAR = new THREE.MeshToonMaterial({ color: '#1f2e38', transparent: true, opacity: 0.55, depthWrite: false });
/** The car doors' middles along the train (its own x: the cab at +x), a Seoul car's four a side. */
export const CAR_DOORS = [8.4, 3.4, -1.6, -6.6, -11.6];

/**
 * 승강장 열차 (22 × 3): the track bed sunk below the platform (its rails, sleepers, the catenary over it), the leading car of a
 * line 2 train with its cab at the east end and the next car's front coupled behind, stainless with the green band, four doors a
 * side, the LED destination over the cab windows. Taken over standing at the cab door on the platform's end; out on a run it pulls
 * away east and is gone, and comes back to its mark.
 */
function platformTrain(g: THREE.Group, W: number, D: number, out: Built) {
  const zc = -0.15;
  // The bed: dark ballast, sleepers, rails; the platform edge's lip and the catenary.
  part(g, box(W, 0.04, D - 0.1), '#3b3a37', 0, 0.02, 0, NOL);
  for (let x = -W / 2 + 0.3; x < W / 2; x += 0.65) part(g, box(0.22, 0.03, 2.1), '#77746d', x, 0.05, zc, { outline: false, shadow: false });
  for (const sz of [-1, 1]) part(g, box(W, 0.06, 0.07), '#9aa3aa', 0, 0.09, zc + sz * 0.72, NOL);
  part(g, box(W, 0.12, 0.25), '#d6d1c4', 0, 0.06, D / 2 - 0.12, NOL);
  rod(g, new THREE.Vector3(-W / 2, 4.6, zc), new THREE.Vector3(W / 2, 4.6, zc), 0.012, '#5d6b73');
  const cars = new THREE.Group();
  g.add(cars);
  const FLOOR = 1.1;
  const EAVE = 3.6;
  const car = (x0: number, x1: number, cab = false) => {
    const L = x1 - x0;
    const xm = (x0 + x1) / 2;
    part(cars, rbox(L, 0.5, 2.8, 0.05), '#5a6168', xm, 0.55, zc);
    part(cars, rbox(L - 0.1, EAVE - 0.8, 2.8, 0.08), '#dfe3e6', xm, (EAVE + 0.8) / 2, zc);
    part(cars, rbox(L - 0.05, 0.25, 2.6, 0.1), '#c9ced2', xm, EAVE + 0.1, zc);
    for (const sz of [-1, 1]) {
      part(cars, box(L - 0.15, 0.16, 0.02), LINE2, xm, 1.45, zc + sz * 1.41, NOL);
      part(cars, box(L - 0.15, 0.05, 0.02), '#1b5e20', xm, 2.95, zc + sz * 1.41, NOL);
    }
    // The bogies.
    for (const bx of [x0 + 2.4, x1 - 2.4]) if (bx > -W / 2 && bx < W / 2) for (const sz of [-1, 1]) part(cars, cyl(0.42, 0.42, 0.12, 16), '#2b2b2b', bx, 0.42, zc + sz * 0.72, { rx: Math.PI / 2 });
    // The doors on the platform side (+z) and the windows between them.
    const face = zc + 1.405;
    for (const dx of CAR_DOORS) {
      if (dx < x0 + 0.8 || dx > x1 - 0.8) continue;
      for (const s of [-1, 1]) {
        part(cars, rbox(0.62, 1.95, 0.03, 0.02), '#cfd6db', dx + s * 0.32, FLOOR + 0.98, face + 0.01);
        const w = new THREE.Mesh(box(0.42, 0.9, 0.02), GLASS_CAR);
        w.position.set(dx + s * 0.32, FLOOR + 1.45, face + 0.025);
        cars.add(w);
      }
      part(cars, box(0.02, 1.95, 0.035), '#263238', dx, FLOOR + 0.98, face + 0.02, NOL);
    }
    for (let i = 0; i < CAR_DOORS.length - 1; i++) {
      const a = Math.max(CAR_DOORS[i + 1] + 0.75, x0 + 0.4);
      const b = Math.min(CAR_DOORS[i] - 0.75, x1 - (cab ? 2.0 : 0.4));
      if (b - a < 0.4) continue;
      const w = new THREE.Mesh(box(b - a, 0.95, 0.02), GLASS_CAR);
      w.position.set((a + b) / 2, FLOOR + 1.35, face + 0.02);
      cars.add(w);
    }
    if (cab) {
      // The cab: the sloped front, its windows, the lamps, the destination sign, the coupler, the crew door on the platform side.
      part(cars, rbox(0.3, EAVE - 0.9, 2.7, 0.1), '#e9ecee', x1 + 0.08, (EAVE + 0.9) / 2, zc, { rz: -0.12 });
      const ws = new THREE.Mesh(box(0.04, 1.0, 2.2), GLASS_CAR);
      ws.position.set(x1 + 0.2, 2.45, zc);
      ws.rotation.z = -0.12;
      cars.add(ws);
      part(cars, box(0.05, 0.28, 1.6), '#111111', x1 + 0.39, 3.15, zc, NOL);
      label(cars, '2 순환 · 성수', 1.4, 0.2, x1 + 0.42, 3.15, zc, '#111111', '#ff9800', Math.PI / 2);
      for (const sz of [-1, 1]) part(cars, cyl(0.09, 0.09, 0.04, 14), '#fffde7', x1 + 0.22, 1.25, zc + sz * 0.95, { rz: Math.PI / 2 });
      part(cars, box(0.4, 0.2, 0.3), '#37474f', x1 + 0.4, 0.75, zc, NOL);
      part(cars, rbox(0.7, 1.95, 0.03, 0.02), '#cfd6db', x1 - 1.0, FLOOR + 0.98, face + 0.01);
      label(cars, '승무원', 0.4, 0.1, x1 - 1.0, FLOOR + 1.6, face + 0.03, '#ffffff', '#263238');
    }
  };
  car(-9.1, 10.9, true);
  car(-11.5, -9.3);
  part(cars, box(0.3, 1.6, 2.0), '#2b2b2b', -9.2, 1.9, zc, NOL);
  // The driver at the cab door: taking it over, then gone with it; on a fault, on the radio to 관제.
  const work = marker(g, 10.4, 1.4, D / 2 - 0.1);
  const at = spot(g, 'stand', 10.4, 0, D / 2 + 0.5, Math.PI);
  at.work = work;
  at.motion = 'peer';
  const radio = spot(g, 'stand', 10.4, 0, D / 2 + 0.5, Math.PI);
  radio.work = work;
  radio.motion = 'talk';
  out.work = work;
  out.spots = { '*': at, signalFault: radio };
  let x = 0;
  let last = 0;
  out.away = (isOut, t) => {
    const dt = Math.min(0.1, Math.max(0, t - last));
    last = t;
    x = THREE.MathUtils.clamp(x + (isOut ? 1 : -1) * dt * 6, 0, 30);
    cars.position.x = x * x * 0.08;
    cars.visible = cars.position.x < 26;
  };
}

/**
 * 스크린도어 (21 × 1): the glass wall along the platform edge, a sliding pair at each car door (the train's doors behind them), fixed
 * panels between, the header with the green band and each door's 승차 위치; the arrows on the floor before the doors; at the east
 * end, where the cab stops, the 정지 위치 mark and the doors' control box.
 */
function screenDoors(g: THREE.Group, W: number) {
  const z = -0.32;
  const H = 2.15;
  part(g, box(W, 0.06, 0.18), '#9aa3aa', 0, 0.03, z, NOL);
  part(g, rbox(W, 0.4, 0.22, 0.03), '#eceff1', 0, H + 0.2, z);
  part(g, box(W, 0.06, 0.01), LINE2, 0, H + 0.14, z + 0.115, NOL);
  const doors = CAR_DOORS.map((dx) => dx + 0.5).filter((x) => x > -W / 2 + 0.8 && x < W / 2 - 0.8);
  for (let x = -W / 2; x <= W / 2 + 0.01; x += 1.25) part(g, box(0.06, H, 0.12), '#b0bec5', x, H / 2, z, NOL);
  const pane = new THREE.Mesh(box(W, H - 0.1, 0.02), GLASS_PSD);
  pane.position.set(0, H / 2, z);
  pane.renderOrder = 2;
  g.add(pane);
  doors.forEach((dx, i) => {
    for (const s of [-1, 1]) part(g, box(0.04, H - 0.1, 0.05), '#78909c', dx + s * 0.75, H / 2, z, NOL);
    part(g, box(0.02, H - 0.1, 0.04), '#37474f', dx, H / 2, z + 0.01, NOL);
    label(g, `2-${4 - i}`, 0.3, 0.14, dx, H + 0.2, z + 0.115, '#ffffff', '#1b5e20');
    // The floor arrows in front: in at the sides, out in the middle.
    for (const s of [-1, 1]) part(g, box(0.4, 0.004, 0.12), '#fbc02d', dx + s * 0.55, 0.012, 0.75, NOL);
    part(g, box(0.12, 0.004, 0.5), '#4caf50', dx, 0.012, 0.85, NOL);
  });
  // The east end: the 정지 위치 board, the control box.
  part(g, rbox(0.4, 0.5, 0.06, 0.02), '#fdd835', W / 2 - 0.2, 1.7, z + 0.1);
  label(g, '정지', 0.32, 0.14, W / 2 - 0.2, 1.75, z + 0.135, '#fdd835', '#111111');
  part(g, rbox(0.34, 0.5, 0.18, 0.03), '#90a4ae', W / 2 - 0.6, 1.15, z + 0.17);
  part(g, cyl(0.03, 0.03, 0.02, 10), '#43a047', W / 2 - 0.66, 1.25, z + 0.27, { rx: Math.PI / 2 });
  part(g, cyl(0.03, 0.03, 0.02, 10), '#e53935', W / 2 - 0.54, 1.25, z + 0.27, { rx: Math.PI / 2 });
  label(g, 'PSD 조작반', 0.3, 0.07, W / 2 - 0.6, 1.0, z + 0.265, '#90a4ae', '#ffffff');
}

/** 관제 노선 표시반 (8 × 1): a wall of screens showing the line, its stations as dots and each train a lit block along it. */
function controlWall(g: THREE.Group, W: number, D: number) {
  const zb = -D / 2 + 0.06;
  part(g, rbox(W, 2.4, 0.1, 0.02), '#101820', 0, 1.6, zb);
  const tex = canvasTexture(1024, 256, (c) => {
    c.fillStyle = '#0b1622';
    c.fillRect(0, 0, 1024, 256);
    c.strokeStyle = LINE2;
    c.lineWidth = 10;
    c.strokeRect(60, 70, 904, 120);
    for (let i = 0; i < 24; i++) {
      const t = i / 24;
      const [x, y] = t < 0.5 ? [60 + t * 2 * 904, 70] : [964 - (t - 0.5) * 2 * 904, 190];
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(x, y, 7, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = '#ffeb3b';
    for (const [x, y] of [[180, 62], [420, 62], [700, 62], [880, 182], [560, 182], [260, 182]]) c.fillRect(x, y, 34, 16);
    c.fillStyle = '#ff5252';
    c.fillRect(640, 182, 34, 16);
    c.fillStyle = '#90caf9';
    c.font = 'bold 26px sans-serif';
    c.fillText('2호선 운행 현황', 60, 40);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.2, 2.2), new THREE.MeshBasicMaterial({ map: tex }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(0, 1.6, zb + 0.06);
  g.add(m);
  for (let i = 1; i < 4; i++) part(g, box(0.02, 2.3, 0.02), '#263238', -W / 2 + (W * i) / 4, 1.6, zb + 0.07, NOL);
}

export const BUILDERS: Record<string, Builder> = {
  /**
   * The cab simulator (운전 시뮬레이터): a mock-up of a 2호선 cab on its platform — beige cab walls
   * and roof, '모의 운전실' across the top, a wide screen in front of the driver running the line
   * ahead (the station's platform and screen doors, then the tunnel's rings and lamps coming on,
   * faster and slower with the run, a signal glowing red, green or yellow), the black desk under it
   * with the tilted panel (the speedometer whose needle follows the run, the 출발 lamp, the TCMS/ATC
   * display with its 70, the door lamps), the one-handle 마스콘 on its notch plate at the left and
   * the door buttons at the right, the driver's seat on its pedestal. Training (simDrive) the driver
   * sits with the left hand on the 마스콘 — pulled back to power away, eased to neutral to coast,
   * pushed forward to brake into the station — and at the 출발 signal and the next one the right arm
   * goes out at it for the 지적확인, back to the ear for the call, out again; at the station the
   * door buttons. Shadowing as a junior (shadowDriver) a senior driver sits at the desk doing it all
   * while they stand at his right shoulder with a clipboard, pointing when he points.
   */
  trainSimulator(g, _W, _D, _c, _def, _ctx, out) {
    const SZ = 0.74;
    const SY = 0.5;
    const SHELL = '#ddd6c6';
    // The platform, the cab's walls and roof, the back.
    part(g, rbox(1.96, 0.06, 0.98, 0.02), '#3a3f47', 0, 0.03, -0.01);
    part(g, rbox(0.86, 0.04, 0.62, 0.02), '#4a505a', 0, 0.02, SZ + 0.02);
    for (const sx of [-1, 1]) {
      part(g, rbox(0.06, 1.96, 0.66, 0.02), SHELL, sx * 0.95, 1.04, -0.15);
      part(g, box(0.004, 0.46, 0.36), '#26323c', sx * 0.982, 1.42, -0.14, { outline: false, material: DARK_GLASS });
      part(g, box(0.008, 0.06, 0.66), LINE2, sx * 0.982, 0.86, -0.15, { outline: false });
    }
    part(g, rbox(1.96, 0.07, 0.7, 0.02), SHELL, 0, 2.04, -0.15);
    label(g, '모의 운전실 · 2호선 VVVF 전동차', 1.3, 0.1, 0, 2.04, 0.205, '#1b5e20', '#ffffff');
    part(g, rbox(1.84, 1.96, 0.04, 0.01), '#2b2f36', 0, 1.04, -0.47);
    part(g, rbox(1.72, 1.02, 0.04, 0.015), BLACK, 0, 1.36, -0.435);
    const screen = screenOf(g, tunnelTex('station', 0), 1.6, 0.9, 0, 1.36, -0.412);
    out.screen = screen;
    // The signal in the picture: its housing, its lamp lit by the run.
    const sigG = group(g, 0.36, 1.43, -0.408);
    part(sigG, box(0.05, 0.11, 0.004), '#0b0b0b', 0, 0, 0, { outline: false });
    const sigLamp = part(sigG, cyl(0.016, 0.016, 0.004, 14), '#ff3b30', 0, 0.025, 0.003, { rx: Math.PI / 2, outline: false, material: glow('#ff3b30') });
    sigG.visible = false;
    // The desk and its body (open under the front for the knees).
    part(g, rbox(1.78, 0.06, 0.64, 0.02), DESK, 0, 0.69, 0.04);
    part(g, rbox(1.72, 0.62, 0.36, 0.02), shade(DESK, 0.8), 0, 0.36, -0.1);
    for (const sx of [-1, 1]) part(g, rbox(0.3, 0.62, 0.6, 0.02), shade(DESK, 0.85), sx * 0.74, 0.36, 0.02);
    // The tilted panel: speedometer, BC gauge, the 출발 lamp, the ATC display, the door lamps.
    const panel = group(g, 0, 0.86, -0.2);
    panel.rotation.x = -0.6;
    part(panel, rbox(1.62, 0.34, 0.05, 0.015), '#2a2e34', 0, 0, 0);
    sheet(panel, speedoTex(), 0.21, 0.21, -0.05, 0, 0.027);
    const needle = group(panel, -0.05, 0, 0.03);
    part(needle, box(0.007, 0.085, 0.004), '#ff5252', 0, 0.04, 0, { outline: false, material: glow('#ff5252') });
    part(panel, cyl(0.012, 0.012, 0.01, 10), '#eceff1', -0.05, 0, 0.032, { rx: Math.PI / 2, outline: false });
    sheet(panel, speedoTex(), 0.12, 0.12, -0.3, 0.02, 0.027);
    label(panel, 'BC', 0.06, 0.025, -0.3, -0.07, 0.027, 'none', '#eceff1');
    part(panel, cyl(0.026, 0.026, 0.012, 14), '#1b3d1f', -0.52, 0.03, 0.03, { rx: Math.PI / 2 });
    const departLamp = part(panel, cyl(0.024, 0.024, 0.014, 14), '#4cff6a', -0.52, 0.03, 0.032, { rx: Math.PI / 2, outline: false, material: glow('#4cff6a') });
    label(panel, '출발', 0.08, 0.03, -0.52, -0.035, 0.027, 'none', '#eceff1');
    sheet(panel, atcTex(), 0.3, 0.17, 0.3, 0, 0.027);
    const doorLamps: THREE.Mesh[] = [];
    for (const [i, x] of [0.56, 0.64].entries()) {
      part(panel, cyl(0.018, 0.018, 0.012, 12), '#4a3a10', x, 0.04, 0.03, { rx: Math.PI / 2 });
      doorLamps.push(part(panel, cyl(0.016, 0.016, 0.014, 12), '#ffd54a', x, 0.04, 0.032, { rx: Math.PI / 2, outline: false, material: glow('#ffd54a') }));
      label(panel, i ? '우' : '좌', 0.03, 0.03, x, -0.01, 0.027, 'none', '#eceff1');
    }
    label(panel, '출입문', 0.1, 0.03, 0.6, -0.06, 0.027, 'none', '#eceff1');
    // The 마스콘 at the left: its housing and notch plate, the lever with its T-grip (the knob is
    // where the hand goes), tilted by the run.
    const knob0 = v3(-CAB.knob.side, SY + CAB.knob.up, SZ - CAB.knob.ahead);
    const pivot = v3(knob0.x, knob0.y - CAB.lever, knob0.z);
    part(g, rbox(0.15, 0.06, 0.34, 0.02), '#1c1f24', pivot.x, 0.735, pivot.z);
    sheet(g, notchTex(), 0.06, 0.28, pivot.x + 0.045, 0.767, pivot.z, 0, -Math.PI / 2);
    part(g, box(0.02, 0.004, 0.28), '#555c66', pivot.x, 0.767, pivot.z, { outline: false });
    const lever = group(g, pivot.x, pivot.y, pivot.z);
    part(lever, box(0.026, CAB.lever, 0.026), '#9aa3ab', 0, CAB.lever / 2, 0);
    part(lever, cyl(0.024, 0.024, 0.13, 12), '#16181c', 0, CAB.lever, 0, { rz: Math.PI / 2 });
    part(lever, cyl(0.012, 0.012, 0.02, 10), '#e53935', 0.07, CAB.lever, 0, { rz: Math.PI / 2, outline: false });
    const knob = marker(lever, 0, CAB.lever, 0);
    // The door buttons at the right: 열림 and 닫힘.
    const btn = v3(-CAB.btn.side, SY + CAB.btn.up, SZ - CAB.btn.ahead);
    part(g, rbox(0.26, 0.04, 0.13, 0.015), '#1c1f24', btn.x, 0.735, btn.z);
    part(g, cyl(0.026, 0.026, 0.02, 14), '#eceff1', btn.x - 0.06, 0.76, btn.z);
    part(g, cyl(0.026, 0.026, 0.02, 14), '#e53935', btn.x + 0.06, 0.76, btn.z);
    label(g, '열림', 0.06, 0.025, btn.x - 0.06, 0.756, btn.z + 0.05, 'none', '#eceff1', 0, -Math.PI / 2);
    label(g, '닫힘', 0.06, 0.025, btn.x + 0.06, 0.756, btn.z + 0.05, 'none', '#eceff1', 0, -Math.PI / 2);
    // The radio handset on its hook, the timetable card in its clip.
    part(g, rbox(0.07, 0.16, 0.05, 0.02), '#212121', 0.66, 0.84, 0.0, { rx: -0.3 });
    rod(g, v3(0.66, 0.76, 0.05), v3(0.62, 0.73, 0.12), 0.006, '#212121');
    part(g, box(0.16, 0.004, 0.22), '#fafafa', -0.62, 0.725, 0.12, { ry: 0.2, outline: false });
    sheet(g, diagramTex('card', 160, 220, true), 0.15, 0.2, -0.62, 0.729, 0.12, 0.2, -Math.PI / 2);
    // The driver's seat on its pedestal, facing the screen.
    part(g, cyl(0.05, 0.12, 0.38, 12), '#3a3f47', 0, 0.21, SZ);
    part(g, rbox(0.5, 0.1, 0.46, 0.04), '#37474f', 0, SY - 0.05, SZ);
    part(g, rbox(0.5, 0.64, 0.1, 0.04), '#37474f', 0, SY + 0.36, SZ + 0.24, { rx: 0.1 });
    part(g, rbox(0.3, 0.16, 0.09, 0.03), '#2b3238', 0, SY + 0.76, SZ + 0.29, { rx: 0.1 });
    for (const sx of [-1, 1]) part(g, rbox(0.06, 0.04, 0.3, 0.015), '#212121', sx * 0.28, SY + 0.2, SZ + 0.04);
    // The senior driver, there while a junior shadows him.
    const crewG = group(g);
    const senior = person(crewG, LOOKS.senior, 0, SZ, Math.PI, SY);
    crewG.visible = false;
    const screenMid = marker(g, 0, 1.36, -0.41);
    const drive = sitAt(g, 0, SY, SZ, Math.PI, 'sbCab', knob);
    const observe = standAt(g, 0.62, 1.12, Math.PI + 0.25, 'sbObserve', screenMid);
    out.work = knob;
    out.spots = { simDrive: drive, subwayDriver_shadowDriver: observe, '*': drive };
    const mat = screen.material as THREE.MeshBasicMaterial;
    const point = v3(0.25, 1.55, -0.6);
    out.away = (_o, t) => {
      const shadow = posed(observe, t);
      const on = posed(drive, t) || shadow;
      crewG.visible = shadow;
      sigG.visible = on;
      if (!on) {
        lever.rotation.x = 0;
        needle.rotation.z = 2.35;
        departLamp.visible = false;
        for (const l of doorLamps) l.visible = false;
        mat.map = tunnelTex('station', 0);
        return;
      }
      const run = cabRound(t);
      lever.rotation.x = run.handle;
      needle.rotation.z = 2.35 - run.speed * 0.72 * 4.7;
      departLamp.visible = run.depart;
      for (const l of doorLamps) l.visible = run.doorsOpen;
      sigLamp.material = glow(run.signal === 'red' ? '#ff3b30' : run.signal === 'green' ? '#4cff6a' : '#ffd54a');
      const kind = run.dist < 1.1 || run.dist > RUN_DIST - 1.4 ? 'station' : 'tunnel';
      mat.map = tunnelTex(kind, Math.floor(frac(run.dist * 3) * NF) % NF);
      if (shadow) {
        g.updateMatrixWorld(true);
        senior.armL(g.worldToLocal(knob.getWorldPosition(tmp)).clone());
        senior.armR(btn.clone().setY(btn.y + 0.02).lerp(point, run.point));
      }
    };
  },

  /**
   * The 관제 console (관제 패널): a wide grey desk with three monitors (the platform cameras, the
   * trains running with their delays, the 운행 다이어그램), the keyboard and mouse, the red 관제 직통
   * hotline, a gooseneck PA mic and the 출입문 panel; above it on its frame the 운행 표시반 — the line's
   * two tracks, twelve stations, the depot branch — with the trains as amber lights running along it
   * while it's watched, and a red beacon on top. Watching (monitorTrains) the controller sits typing,
   * the mouse, now and then a look up and a finger at a train on the board; in a signal fault
   * (signalFault) a block on the board flashes red with '신호 장애', the beacon turns, and they sit
   * with the hotline's handset at the ear hammering the keys; adjusting the timetable they type;
   * working the doors and the PA (doorControl) they lean in to the mic with its key held, then press
   * and hold 닫힘 and check the platform camera.
   */
  controlPanel(g, _W, _D, _c, _def, _ctx, out) {
    const SZ = 0.76;
    const SY = 0.5;
    const GREY = '#c4cad0';
    // The desk.
    part(g, rbox(1.92, 0.05, 0.74, 0.02), '#d9dde1', 0, 0.725, 0.05);
    for (const sx of [-1, 1]) part(g, rbox(0.05, 0.7, 0.68, 0.015), GREY, sx * 0.92, 0.35, 0.05);
    part(g, rbox(1.84, 0.5, 0.04, 0.015), GREY, 0, 0.45, -0.28);
    label(g, '종합관제 콘솔 3', 0.4, 0.06, 0.6, 0.6, -0.258, 'none', '#455a64');
    // The board on its frame.
    const bz = -0.43;
    for (const sx of [-1, 1]) part(g, rbox(0.06, 2.0, 0.06, 0.015), '#37474f', sx * 0.97, 1.05, bz - 0.02);
    part(g, rbox(1.98, 0.68, 0.05, 0.015), '#1b2230', 0, 1.74, bz);
    sheet(g, boardTex(), 1.86, 0.6, 0, 1.74, bz + 0.027);
    const board = group(g, 0, 1.74, bz + 0.03);
    // The trains on it: six in each direction.
    const trains: Array<{ m: THREE.Mesh; o: number; dir: number; y: number }> = [];
    for (let i = 0; i < 10; i++) {
      const dir = i < 5 ? 1 : -1;
      const y = boardY(dir > 0 ? 140 : 200);
      const m = part(board, box(0.04, 0.02, 0.004), '#ffb300', 0, y, 0, { outline: false, material: glow('#ffc107') });
      trains.push({ m, o: (i % 5) / 5 + (dir > 0 ? 0.07 : 0.15), dir, y });
    }
    // The fault: a block flashing red, its label.
    const fault = group(board);
    part(fault, box(0.16, 0.024, 0.004), '#ff1744', boardX(470), boardY(140), 0.001, { outline: false, material: glow('#ff1744') });
    label(fault, '⚠ 신호 장애', 0.24, 0.05, boardX(470), boardY(140) + 0.05, 0.002, '#b71c1c', '#ffffff');
    fault.visible = false;
    // The beacon on top.
    part(g, cyl(0.05, 0.06, 0.04, 14), '#37474f', 0.82, 2.1, bz);
    part(g, cyl(0.045, 0.045, 0.08, 14), '#5d1010', 0.82, 2.16, bz);
    const beacon = part(g, cyl(0.046, 0.046, 0.082, 14), '#ff1744', 0.82, 2.16, bz, { outline: false, material: glow('#ff1744') });
    beacon.visible = false;
    // Three monitors, angled in.
    const monitor = (x: number, ry: number, tex: THREE.Texture, lit: boolean) => {
      const m = group(g, x, 0.75, -0.14, ry);
      part(m, rbox(0.14, 0.015, 0.1, 0.005), BLACK, 0, 0.008, 0);
      part(m, cyl(0.012, 0.012, 0.16, 8), BLACK, 0, 0.09, -0.02, { outline: false });
      part(m, rbox(0.54, 0.34, 0.025, 0.01), BLACK, 0, 0.33, 0);
      if (lit) out.screen = screenOf(m, tex, 0.51, 0.31, 0, 0.33, 0.014);
      else sheet(m, tex, 0.51, 0.31, 0, 0.33, 0.014);
    };
    monitor(-0.6, 0.38, cctvTex(), false);
    monitor(0, 0, opsTex(), true);
    monitor(0.6, -0.38, diagramTex('screen', 256, 160, false), false);
    // The keyboard and mouse.
    const kb = marker(g, -0.02, 0.765, 0.24);
    part(g, rbox(0.42, 0.02, 0.14, 0.008), '#2f343a', -0.02, 0.757, 0.24);
    for (let i = 0; i < 4; i++) part(g, box(0.38, 0.004, 0.02), '#4b525a', -0.02, 0.769, 0.19 + i * 0.03, { outline: false });
    part(g, rbox(0.06, 0.025, 0.09, 0.02), '#2f343a', 0.28, 0.76, 0.24);
    // The PA mic at the left: its base with the talk key, the gooseneck; the 출입문 panel at the right.
    const mic = v3(-0.4, 0.77, 0.3);
    part(g, rbox(0.12, 0.035, 0.12, 0.015), '#263238', mic.x, 0.765, mic.z - 0.02);
    part(g, rbox(0.04, 0.012, 0.03, 0.006), '#e53935', mic.x, 0.787, mic.z + 0.01);
    rod(g, v3(mic.x, 0.79, mic.z - 0.04), v3(mic.x + 0.03, 0.98, mic.z - 0.02), 0.008, '#37474f');
    rod(g, v3(mic.x + 0.03, 0.98, mic.z - 0.02), v3(mic.x + 0.04, 1.06, mic.z + 0.06), 0.008, '#37474f');
    part(g, cyl(0.018, 0.014, 0.06, 10), '#111111', mic.x + 0.045, 1.07, mic.z + 0.09, { rx: 1.0 });
    label(g, '안내 방송', 0.11, 0.03, mic.x, 0.784, mic.z + 0.045, 'none', '#eceff1', 0, -Math.PI / 2);
    const micKey = marker(g, mic.x, mic.y, mic.z);
    const dp = v3(mic.x - ANN_DOOR.side, mic.y + ANN_DOOR.up, mic.z - ANN_DOOR.ahead);
    part(g, rbox(0.2, 0.04, 0.12, 0.015), '#263238', dp.x, 0.765, dp.z);
    part(g, cyl(0.024, 0.024, 0.02, 12), '#43a047', dp.x - 0.05, 0.79, dp.z);
    part(g, cyl(0.024, 0.024, 0.02, 12), '#e53935', dp.x + 0.05, 0.79, dp.z);
    label(g, '출입문 열림 · 닫힘', 0.18, 0.03, dp.x, 0.786, dp.z + 0.05, 'none', '#eceff1', 0, -Math.PI / 2);
    // The red hotline phone: its base, the handset on it (or at the ear in a fault), the cord.
    const ph = v3(-0.72, 0.75, 0.04);
    part(g, rbox(0.2, 0.06, 0.18, 0.03), '#c62828', ph.x, ph.y + 0.03, ph.z);
    label(g, '관제 직통', 0.12, 0.03, ph.x, ph.y + 0.062, ph.z + 0.05, 'none', '#ffffff', 0, -Math.PI / 2);
    const handset = group(g, ph.x, ph.y + 0.09, ph.z);
    part(handset, rbox(0.06, 0.04, 0.22, 0.02), '#b71c1c', 0, 0, 0);
    for (const s of [-1, 1]) part(handset, rbox(0.07, 0.05, 0.06, 0.02), '#b71c1c', 0, -0.015, s * 0.09);
    const cord = limb(g, 0.008, '#8e1b1b');
    const cordFrom = v3(ph.x + 0.09, ph.y + 0.03, ph.z + 0.05);
    cord(cordFrom, v3(ph.x, ph.y + 0.08, ph.z + 0.1));
    // The controller's chair.
    chair(g, 0, SZ, Math.PI, 0.46, '#37474f');
    out.seat = marker(g, 0, SY, SZ);
    out.work = kb;
    const watch = sitAt(g, 0, SY, SZ, Math.PI, 'sbControl', kb);
    const faultAt = sitAt(g, 0, SY, SZ, Math.PI, 'sbFault', kb);
    out.spots = {
      monitorTrains: watch,
      signalFault: faultAt,
      subwayDriver_adjustTimetable: sitAt(g, 0, SY, SZ, Math.PI, 'type', kb),
      subwayDriver_doorControl: sitAt(g, 0, SY, SZ, Math.PI, 'sbAnnounce', micKey),
      '*': watch,
    };
    const rest = handset.position.clone();
    out.away = (_o, t) => {
      const inFault = posed(faultAt, t);
      const busy = inFault || Object.values(out.spots!).some((s) => posed(s, t));
      for (const tr of trains) {
        const u = frac(tr.o + (busy ? (t * 0.008 * tr.dir) : 0));
        // Stopped short of the failed block while it's down.
        const x = boardX(40 + 944 * (tr.dir > 0 ? u : 1 - u));
        tr.m.position.x = inFault && tr.dir > 0 && x > boardX(380) && x < boardX(470) ? boardX(380) : x;
      }
      const blink = Math.sin(t * 9) > 0;
      fault.visible = inFault && blink;
      beacon.visible = inFault;
      if (inFault) {
        beacon.rotation.y = t * 8;
        const H = heightAt(faultAt);
        const k = H / 1.6;
        handset.position.set(-EAR.side * k, SY + EAR.up * H + 0.01, SZ - EAR.ahead - 0.02);
        handset.rotation.set(0.2, 0, -1.25);
      } else {
        handset.position.copy(rest);
        handset.rotation.set(0, 0, 0);
      }
      cord(cordFrom, handset.position.clone().setY(handset.position.y - 0.04));
    };
  },

  /**
   * The crew desk (승무 일지 책상): a grey steel office desk with its drawer pedestal; the 승무일지
   * open in front (today's trains run, the remarks, a red 확인 stamp), the 운행 다이어그램 printed out
   * beside it, the uniform cap with its gold band and badge, a radio in its charger, the rule books
   * (운전취급규정, 승무원 업무지침), a desk lamp and a mug, the driver's black bag under it. Writing the
   * log (writeCrewLog) the driver sits writing in it.
   */
  crewDesk(g, _W, _D, _c, _def, _ctx, out) {
    const top = 0.74;
    const dz = -0.18;
    const STEELD = '#aab3ba';
    part(g, rbox(0.96, 0.04, 0.62, 0.012), '#dfe3e6', 0, top, dz);
    part(g, rbox(0.36, top - 0.03, 0.58, 0.012), STEELD, 0.28, (top - 0.03) / 2, dz);
    for (let i = 0; i < 3; i++) {
      part(g, box(0.34, 0.004, 0.004), shade(STEELD, 0.7), 0.28, 0.24 + i * 0.2, dz + 0.292, { outline: false });
      part(g, rbox(0.1, 0.02, 0.02, 0.008), '#5f6a72', 0.28, 0.16 + i * 0.2, dz + 0.3);
    }
    part(g, rbox(0.03, top - 0.03, 0.58, 0.01), STEELD, -0.46, (top - 0.03) / 2, dz);
    part(g, rbox(0.6, 0.4, 0.02, 0.01), STEELD, -0.14, 0.45, dz - 0.28);
    // The log open, the diagram beside it, a pen.
    part(g, box(0.38, 0.014, 0.26), '#1b5e20', 0, top + 0.026, -0.04);
    sheet(g, logTex(), 0.36, 0.24, 0, top + 0.035, -0.04, 0, -Math.PI / 2);
    const logAt = marker(g, 0.02, top + 0.04, -0.03);
    part(g, cyl(0.006, 0.006, 0.14, 8), '#1a237e', 0.15, top + 0.04, 0.04, { rz: Math.PI / 2, ry: 0.5, outline: false });
    sheet(g, diagramTex('paper', 320, 220, true), 0.3, 0.21, -0.32, top + 0.023, -0.3, 0.15, -Math.PI / 2);
    // The cap: crown, band, badge, peak.
    const cap = group(g, 0.3, top + 0.02, -0.38, -0.5);
    part(cap, cyl(0.12, 0.105, 0.075, 18), NAVY, 0, 0.05, 0);
    part(cap, cyl(0.108, 0.108, 0.025, 18), '#c9a227', 0, 0.025, 0, { outline: false });
    part(cap, box(0.17, 0.01, 0.08), '#111111', 0, 0.01, 0.1, { rx: 0.2 });
    part(cap, ball(0.017), '#e0c25a', 0, 0.055, 0.11, { outline: false });
    // The radio in its charger.
    part(g, rbox(0.09, 0.04, 0.08, 0.015), '#263238', 0.08, top + 0.04, -0.42);
    part(g, rbox(0.06, 0.15, 0.035, 0.015), '#37474f', 0.08, top + 0.13, -0.42);
    part(g, cyl(0.006, 0.006, 0.1, 6), '#212121', 0.1, top + 0.25, -0.42, { outline: false });
    part(g, box(0.008, 0.008, 0.004), '#76ff03', 0.06, top + 0.07, -0.379, { outline: false, material: glow('#76ff03') });
    // The rule books against the back, the lamp, the mug.
    for (const [i, col] of ['#1565c0', '#2e7d32', '#6d4c41'].entries()) {
      part(g, rbox(0.05, 0.3 - i * 0.02, 0.23, 0.01), col, -0.44 + i * 0.055, top + 0.17 - i * 0.01, -0.36);
      part(g, box(0.052, 0.03, 0.004), '#fafafa', -0.44 + i * 0.055, top + 0.22, -0.244, { outline: false });
    }
    part(g, cyl(0.06, 0.07, 0.02, 12), '#37474f', -0.22, top + 0.03, -0.42);
    rod(g, v3(-0.22, top + 0.03, -0.42), v3(-0.18, top + 0.4, -0.36), 0.01, '#37474f');
    rod(g, v3(-0.18, top + 0.4, -0.36), v3(-0.08, top + 0.43, -0.22), 0.01, '#37474f');
    part(g, cyl(0.03, 0.08, 0.08, 12), '#37474f', -0.06, top + 0.39, -0.2, { rx: 0.3 });
    part(g, cyl(0.04, 0.035, 0.09, 12), '#eceff1', 0.4, top + 0.065, -0.05);
    part(g, box(0.06, 0.004, 0.06), '#5d4037', 0.4, top + 0.105, -0.05, { outline: false });
    // The bag under the desk.
    part(g, rbox(0.34, 0.26, 0.13, 0.04), '#151515', -0.32, 0.13, dz + 0.05);
    rod(g, v3(-0.44, 0.26, dz + 0.05), v3(-0.2, 0.26, dz + 0.05), 0.012, '#151515');
    const seat = deskChair(g, dz + 0.31);
    out.seat = seat;
    out.work = logAt;
    out.spots = { '*': sitAt(g, 0, seat.position.y, seat.position.z, Math.PI, 'write', logAt) };
  },

  /**
   * The train out at the depot (출고 열차): the lead car of a 2호선 train on its track — stainless
   * with the green band, '2 성수 순환' in orange LEDs over the windscreen, its number 2073, the
   * headlights and the coupler, the pantograph and the air-conditioners on the roof, the bogies and
   * their wheels on the rails over concrete sleepers in the ballast, the long blue benches, poles and
   * straps seen through the windows, the cab behind the windscreen. The track runs on past a crossing
   * where the path meets it, to a buffer stop the other way; a shunting signal stands by it. Checking
   * it before it goes out (checkTrain) its doors slide open and the lights come on inside while the
   * driver crouches at the bogie tapping round the axle box with the test hammer and a torch on it,
   * then stands and points down the car: 이상 없음. Taking it out (runTrain) the driver points at the
   * cab and climbs in: the doors slide shut, the shunting signal clears, and it pulls out along the
   * track and away with them at the cab window, the arm out at the signal; it comes back the same
   * way and stops at its mark.
   */
  subwayTrain(g, _W, _D, _c, _def, _ctx, out) {
    const zc = 0.05;
    const HW = 1.0;
    const X0 = -1.15;
    const X1 = 5.85;
    const L = X1 - X0;
    const XM = (X0 + X1) / 2;
    const RAIL = 0.2;
    const FLOOR = 0.95;
    const BOTTOM = 0.82;
    const EAVE = 2.55;
    // The track: ballast, sleepers, rails, a crossing where the path is, the buffer stop.
    const TX0 = -16;
    const TX1 = 7.6;
    part(g, box(TX1 - TX0, 0.1, 2.6), '#8a8378', (TX0 + TX1) / 2, 0.05, zc, { outline: false });
    for (let x = TX0 + 0.3; x < TX1; x += 0.6) part(g, box(0.2, 0.05, 1.9), '#a7a7a1', x, 0.12, zc, { outline: false, shadow: false });
    for (const s of [-1, 1]) {
      part(g, box(TX1 - TX0, 0.07, 0.06), '#6f777e', (TX0 + TX1) / 2, 0.165, zc + s * 0.62, { outline: false });
      part(g, box(TX1 - TX0, 0.015, 0.05), '#d3d9de', (TX0 + TX1) / 2, RAIL - 0.005, zc + s * 0.62, { outline: false, shadow: false });
    }
    for (const x of [-3.5]) {
      for (const z of [-0.95, 0, 0.95]) part(g, box(1.3, 0.05, z === 0 ? 1.12 : 0.5), '#3d3d3d', x, 0.18, zc + z * 0.9, { outline: false });
      for (const s of [-1, 1]) part(g, box(0.06, 0.052, 2.2), '#f2c230', x + s * 0.64, 0.181, zc, { outline: false });
    }
    const stop = group(g, TX1 - 0.25, 0, zc);
    for (const s of [-1, 1]) rod(stop, v3(-0.4, 0.2, s * 0.62), v3(0, 0.95, s * 0.62), 0.04, '#5d4037');
    part(stop, rbox(0.12, 0.42, 1.6, 0.03), '#ffffff', 0, 0.8, 0);
    for (let i = 0; i < 4; i++) part(stop, box(0.125, 0.42, 0.2), '#e53935', 0, 0.8, -0.6 + i * 0.4, { outline: false });
    // The shunting signal by the track, and the line's board.
    const sig = group(g, -1.9, 0, zc + 1.32);
    part(sig, rbox(0.2, 0.06, 0.2, 0.02), '#9e9e9e', 0, 0.03, 0);
    part(sig, cyl(0.03, 0.03, 0.75, 10), '#616161', 0, 0.42, 0);
    part(sig, rbox(0.2, 0.3, 0.12, 0.03), '#1f2226', 0, 0.9, 0);
    const sigRed = part(sig, cyl(0.04, 0.04, 0.02, 14), '#ff3b30', 0, 0.97, 0.065, { rx: Math.PI / 2, outline: false, material: glow('#ff3b30') });
    const sigGo = part(sig, cyl(0.04, 0.04, 0.02, 14), '#4cff6a', 0, 0.83, 0.065, { rx: Math.PI / 2, outline: false, material: glow('#4cff6a') });
    part(sig, cyl(0.041, 0.041, 0.018, 14), '#2a2a2a', 0, 0.83, 0.062, { rx: Math.PI / 2, outline: false });
    part(sig, cyl(0.041, 0.041, 0.018, 14), '#2a2a2a', 0, 0.97, 0.062, { rx: Math.PI / 2, outline: false });
    label(g, '출고선 1번', 0.5, 0.12, 6.9, 1.25, zc + 1.33, '#263238', '#ffffff');
    part(g, cyl(0.025, 0.025, 1.2, 8), '#757575', 6.9, 0.6, zc + 1.3);

    const car = group(g);
    // Bogies: frames, wheels on the rails, axle boxes and springs.
    const bogies = [X0 + 1.7, X1 - 1.25];
    for (const bx of bogies) {
      for (const s of [-1, 1]) {
        part(car, rbox(1.7, 0.16, 0.08, 0.03), '#2f3338', bx, 0.56, zc + s * 0.76);
        for (const ax of [-0.5, 0.5]) {
          part(car, cyl(0.3, 0.3, 0.07, 20), '#3a3d42', bx + ax, RAIL + 0.3, zc + s * 0.62, { rx: Math.PI / 2 });
          part(car, cyl(0.2, 0.2, 0.075, 14), '#8d9399', bx + ax, RAIL + 0.3, zc + s * 0.62, { rx: Math.PI / 2, outline: false });
          part(car, rbox(0.17, 0.15, 0.1, 0.03), '#a1883c', bx + ax, RAIL + 0.3, zc + s * 0.75);
          for (let k = 0; k < 4; k++) part(car, ring(0.05, 0.012), '#5a5f66', bx + ax, 0.66 + k * 0.035, zc + s * 0.76, { rx: Math.PI / 2, outline: false });
        }
      }
      part(car, rbox(0.3, 0.14, 1.4, 0.03), '#2f3338', bx, 0.6, zc);
      for (const ax of [-0.5, 0.5]) part(car, cyl(0.05, 0.05, 1.4, 10), '#4a4f55', bx + ax, RAIL + 0.3, zc, { rx: Math.PI / 2, outline: false });
    }
    // Under-floor equipment between the bogies.
    for (const [x, w] of [[1.6, 0.9], [2.7, 1.1], [3.7, 0.6]] as const) part(car, rbox(w, 0.28, 1.5, 0.03), '#3b4046', x, BOTTOM - 0.16, zc);
    // The body: the underframe, the sides between the doors (panels, the window band, the band over
    // the doors), the doors, the roof.
    part(car, box(L - 0.04, 0.06, 2 * HW - 0.04), '#5c636a', XM, BOTTOM + 0.03, zc, { outline: false });
    part(car, box(L - 0.25, 0.03, 2 * HW - 0.1), '#8e9aa3', XM, FLOOR, zc, { outline: false });
    const DX = [1.3, 4.0];
    const spans: Array<[number, number]> = [[X0 + 0.04, -0.8], [-0.3, DX[0] - 0.53], [DX[0] + 0.53, DX[1] - 0.53], [DX[1] + 0.53, X1 - 0.03]];
    for (const s of [-1, 1]) {
      const z = zc + s * HW;
      for (const [a, b] of spans) {
        const w = b - a;
        const x = (a + b) / 2;
        part(car, box(w, 0.66, 0.04), STAINLESS, x, BOTTOM + 0.33 + 0.06, z);
        part(car, box(w, 0.07, 0.044), LINE2, x, 1.47, z, { outline: false });
        part(car, box(w, 0.03, 0.044), LINE2, x, 1.0, z, { outline: false });
        part(car, box(w - 0.06, 0.6, 0.02), '#a9cfe0', x, 1.86, z, { material: GLASS, outline: false, shadow: false });
        part(car, box(w, 0.06, 0.044), STAINLESS, x, 1.53, z, { outline: false });
        part(car, box(w, 0.06, 0.044), STAINLESS, x, 2.19, z, { outline: false });
        for (const px of [a + 0.025, b - 0.025]) part(car, box(0.05, 0.72, 0.045), STAINLESS, px, 1.86, z, { outline: false });
        const n = Math.floor(w / 0.9);
        for (let i = 1; i <= n; i++) part(car, box(0.04, 0.62, 0.045), STAINLESS, a + (w * i) / (n + 1), 1.86, z, { outline: false });
      }
      part(car, box(L, 0.36, 0.04), STAINLESS, XM, EAVE - 0.18, z);
      // The side sign over the middle, the operator's name, the car number.
      if (s > 0) {
        label(car, '2 성수 순환', 0.62, 0.12, (DX[0] + DX[1]) / 2, 2.38, z + 0.024, '#0a0a0a', '#ffa726');
        label(car, OPERATOR, 0.72, 0.1, (DX[0] + DX[1]) / 2, 1.2, z + 0.024, 'none', LINE2);
        label(car, '2073', 0.3, 0.09, -0.05, 1.25, z + 0.024, 'none', '#37474f');
      }
    }
    // The roof: its sheet, the crown, the air-conditioners, the pantograph.
    part(car, rbox(L, 0.14, 2 * HW + 0.02, 0.06), '#dfe4e8', XM, EAVE + 0.05, zc);
    part(car, rbox(L - 0.15, 0.1, 2 * HW - 0.4, 0.05), '#e8ecef', XM, EAVE + 0.15, zc);
    for (const x of [0.6, 4.2]) {
      part(car, rbox(1.2, 0.2, 1.2, 0.05), '#f1f3f4', x, EAVE + 0.28, zc);
      for (let i = 0; i < 4; i++) part(car, box(1.0, 0.01, 0.04), '#9ea7ad', x, EAVE + 0.385, zc - 0.36 + i * 0.24, { outline: false });
    }
    const pg = group(car, 2.4, EAVE + 0.2, zc);
    for (const s of [-1, 1]) part(pg, cyl(0.04, 0.05, 0.12, 10), '#c62828', s * 0.35, 0.06, s * 0.3);
    part(pg, box(0.8, 0.04, 0.7), '#5c636a', 0, 0.14, 0);
    rod(pg, v3(-0.3, 0.16, 0), v3(0.25, 0.4, 0), 0.025, '#5c636a');
    rod(pg, v3(0.25, 0.4, 0), v3(-0.15, 0.55, 0), 0.02, '#5c636a');
    part(pg, box(0.08, 0.04, 1.3), '#212121', -0.15, 0.57, 0);
    // Inside: the long benches, the poles, the straps, the ceiling and its lights (lit while it's used).
    for (const s of [-1, 1]) {
      for (const [a, b] of spans.slice(1)) {
        const w = b - a - 0.12;
        const x = (a + b) / 2;
        part(car, rbox(w, 0.09, 0.4, 0.03), '#3b6fb6', x, FLOOR + 0.42, zc + s * (HW - 0.26));
        part(car, rbox(w, 0.42, 0.08, 0.03), '#3b6fb6', x, FLOOR + 0.66, zc + s * (HW - 0.08));
        part(car, box(w, 0.36, 0.02), '#e8e4da', x, FLOOR + 0.2, zc + s * (HW - 0.06), { outline: false });
      }
      rod(car, v3(-0.2, 2.25, zc + s * 0.5), v3(X1 - 0.15, 2.25, zc + s * 0.5), 0.012, '#c8ced3');
      for (let x = 0.0; x < X1 - 0.2; x += 0.42) {
        rod(car, v3(x, 2.25, zc + s * 0.5), v3(x, 2.12, zc + s * 0.5), 0.006, '#9e9e9e');
        part(car, ring(0.045, 0.01), '#f4f4f4', x, 2.07, zc + s * 0.5, { outline: false });
      }
      for (const dx of DX) for (const e of [-0.62, 0.62]) rod(car, v3(dx + e, FLOOR, zc + s * 0.55), v3(dx + e, 2.45, zc + s * 0.55), 0.016, '#e0e3e6');
    }
    part(car, box(L - 0.2, 0.03, 2 * HW - 0.1), '#f4f4f0', XM, EAVE - 0.06, zc, { outline: false });
    const cabin = group(car);
    for (const s of [-1, 1]) part(cabin, box(L - 1.6, 0.03, 0.12), '#ffffff', XM + 0.6, EAVE - 0.08, zc + s * 0.42, { outline: false, material: glow('#fffbe6') });
    // The doors on the near side, sliding; the far side's shut.
    const leaves: Array<{ g: THREE.Group; x: number; dir: number }> = [];
    for (const s of [-1, 1])
      for (const dx of DX)
        for (const dir of [-1, 1]) {
          const lf = group(car, dx + dir * 0.26, 0, zc + s * (HW + 0.005));
          part(lf, box(0.5, 0.62, 0.035), STAINLESS, 0, FLOOR + 0.31, 0);
          part(lf, box(0.5, 0.1, 0.035), STAINLESS, 0, 2.26, 0, { outline: false });
          for (const e of [-1, 1]) part(lf, box(0.07, 0.66, 0.035), STAINLESS, e * 0.215, 1.9, 0, { outline: false });
          part(lf, box(0.36, 0.66, 0.02), '#a9cfe0', 0, 1.9, 0, { material: GLASS, outline: false, shadow: false });
          part(lf, box(0.02, 1.36, 0.04), '#1f1f1f', -dir * 0.245, FLOOR + 0.68, 0, { outline: false });
          part(lf, box(0.5, 0.05, 0.036), LINE2, 0, 1.47, 0, { outline: false });
          if (s > 0) leaves.push({ g: lf, x: dx + dir * 0.26, dir });
        }
    // The cab door and its window on both sides.
    for (const s of [-1, 1]) {
      const z = zc + s * (HW + 0.004);
      part(car, box(0.5, 0.66, 0.04), STAINLESS, -0.55, BOTTOM + 0.39, z);
      part(car, box(0.5, 0.05, 0.044), LINE2, -0.55, 1.47, z, { outline: false });
      part(car, box(0.42, 0.62, 0.02), '#a9cfe0', -0.55, 1.86, z, { material: GLASS, outline: false, shadow: false });
      for (const e of [-1, 1]) part(car, box(0.05, 0.72, 0.045), STAINLESS, -0.55 + e * 0.24, 1.86, z, { outline: false });
      part(car, box(0.5, 0.06, 0.045), STAINLESS, -0.55, 2.19, z, { outline: false });
      part(car, box(0.03, 0.12, 0.03), '#9e9e9e', -0.37, 1.3, z + s * 0.02, { outline: false });
      // The steps up to it.
      part(car, box(0.36, 0.03, 0.14), '#5c636a', -0.55, 0.55, z + s * 0.06, { outline: false });
    }
    const cabWin = marker(g, -0.55, 1.9, zc + HW);
    // The cab's back wall and its console under the windscreen, the driver's seat.
    part(car, box(0.04, 1.5, 2 * HW - 0.1), '#d7d9db', -0.15, FLOOR + 0.75, zc);
    part(car, rbox(0.42, 0.55, 2 * HW - 0.3, 0.03), '#2b2f36', X0 + 0.3, FLOOR + 0.3, zc);
    part(car, rbox(0.3, 0.06, 0.6, 0.02), '#1c1f24', X0 + 0.36, FLOOR + 0.6, zc + 0.36, { rz: 0.4 });
    part(car, rbox(0.44, 0.08, 0.44, 0.03), '#37474f', -0.48, FLOOR + 0.45, zc + 0.42);
    part(car, rbox(0.08, 0.55, 0.44, 0.03), '#37474f', -0.26, FLOOR + 0.75, zc + 0.42, { rz: -0.1 });
    // The front: the lower panel and its band, the black mask with the windscreen, the destination
    // sign, the line badge and number, the lamps, the skirt and the coupler.
    const fx = X0;
    part(car, box(0.06, 0.76, 2 * HW), STAINLESS, fx, BOTTOM + 0.38, zc);
    part(car, box(0.064, 0.08, 2 * HW), LINE2, fx, 1.47, zc, { outline: false });
    part(car, rbox(0.07, 0.95, 2 * HW, 0.04), '#16191d', fx, 1.98, zc);
    part(car, box(0.02, 0.6, 1.4), '#a9cfe0', fx - 0.04, 1.9, zc, { material: GLASS, outline: false, shadow: false });
    part(car, rbox(0.08, 0.06, 2 * HW, 0.02), '#dfe4e8', fx + 0.01, EAVE - 0.02, zc);
    sheet(car, destTex(), 0.9, 0.15, fx - 0.04, 2.36, zc, -Math.PI / 2);
    label(car, '2073', 0.3, 0.08, fx - 0.035, 1.6, zc - 0.62, 'none', '#ffffff', -Math.PI / 2);
    const heads = group(car);
    for (const s of [-1, 1]) {
      part(car, rbox(0.06, 0.13, 0.28, 0.03), '#2b2f36', fx - 0.02, 1.12, zc + s * 0.68);
      part(car, cyl(0.045, 0.045, 0.02, 12), '#eceff1', fx - 0.05, 1.12, zc + s * 0.6, { rz: Math.PI / 2, outline: false });
      part(car, box(0.02, 0.06, 0.08), '#7a1010', fx - 0.05, 1.12, zc + s * 0.76, { outline: false });
      part(heads, cyl(0.044, 0.044, 0.024, 12), '#fffde7', fx - 0.056, 1.12, zc + s * 0.6, { rz: Math.PI / 2, outline: false, material: glow('#fffde7') });
    }
    part(car, rbox(0.12, 0.22, 2 * HW - 0.3, 0.03), '#2b2f36', fx + 0.04, BOTTOM - 0.06, zc);
    part(car, cyl(0.05, 0.05, 0.32, 12), '#4a4f55', fx - 0.14, BOTTOM - 0.04, zc, { rz: Math.PI / 2 });
    part(car, rbox(0.1, 0.16, 0.22, 0.03), '#3a3d42', fx - 0.3, BOTTOM - 0.04, zc);
    // The far end: closed, the gangway's bellows.
    part(car, box(0.05, EAVE - BOTTOM, 2 * HW), STAINLESS, X1, (EAVE + BOTTOM) / 2, zc);
    part(car, rbox(0.12, 1.5, 1.1, 0.04), '#2b2b2b', X1 + 0.07, FLOOR + 0.8, zc);
    // The driver, in the cab while it's out: sat facing ahead (-x), the left hand on the 마스콘.
    const crew = group(car);
    const driver = person(crew, LOOKS.driver, -0.48, zc + 0.42, -Math.PI / 2, FLOOR + 0.49);
    driver.armL(v3(X0 + 0.42, FLOOR + 0.68, zc + 0.62));
    crew.visible = false;
    heads.visible = false;
    cabin.visible = false;
    sigGo.visible = false;
    // Stood at: pointing at the cab before climbing in; crouched at the bogie for the check.
    const axle = marker(g, bogies[0] + 0.5, RAIL + 0.3, zc + 0.8);
    const board = standAt(g, -0.55, zc + HW + 0.42, Math.PI, 'sbPointCall', cabWin);
    const check = standAt(g, bogies[0] + 0.55, zc + HW + 0.37, Math.PI, 'sbInspect', axle);
    out.work = cabWin;
    out.spots = { subwayDriver_checkTrain: check, '*': board };
    // The test hammer and the torch, in the hands while the bogie's checked.
    const tools = group(g);
    const hammer = group(tools);
    part(hammer, cyl(0.022, 0.022, 0.09, 10), '#455a64', 0, 0, 0, { rz: Math.PI / 2 });
    rod(hammer, v3(0, 0, 0), v3(0, 0.06, 0.2), 0.009, '#8d6e63');
    const torch = group(tools);
    part(torch, cyl(0.02, 0.024, 0.15, 10), '#fbc02d', 0, 0, 0, { rx: Math.PI / 2 - 0.5 });
    part(torch, cyl(0.026, 0.026, 0.02, 10), '#fffde7', 0, -0.035, -0.065, { rx: Math.PI / 2 - 0.5, outline: false, material: glow('#fffde7') });
    tools.visible = false;
    // The run out and back, and the doors.
    const FAR = 24;
    let state: 'parked' | 'closing' | 'leaving' | 'gone' | 'back' | undefined;
    let since = 0;
    let door = 0;
    let last = 0;
    const axleW = new THREE.Vector3();
    out.away = (isOut, t) => {
      const dt = THREE.MathUtils.clamp(t - last, 0, 0.1);
      last = t;
      if (state === undefined) state = isOut ? 'gone' : 'parked';
      else if (isOut && (state === 'parked' || state === 'back')) [state, since] = ['closing', t];
      else if (!isOut && (state === 'closing' || state === 'leaving' || state === 'gone')) [state, since] = ['back', t];
      if (state === 'closing' && t - since > 2.4) [state, since] = ['leaving', t];
      const e = t - since;
      let d = 0;
      if (state === 'leaving') {
        d = Math.min(FAR, 0.55 * e * e);
        if (d >= FAR) state = 'gone';
      } else if (state === 'back') {
        const u = Math.min(1, e / 9);
        d = FAR * (1 - u) * (1 - u);
        if (u >= 1) state = 'parked';
      } else if (state === 'gone') d = FAR;
      car.position.x = -d;
      car.visible = state !== 'gone';
      const checking = state === 'parked' && posed(check, t);
      const want = checking || (state === 'parked' && posed(board, t)) ? 1 : 0;
      door = THREE.MathUtils.damp(door, want, 3, dt);
      for (const l of leaves) l.g.position.x = l.x + l.dir * 0.5 * door;
      for (const l of leaves) l.g.position.z = zc + HW + 0.005 + 0.03 * Math.min(1, door * 4);
      const moving = state === 'closing' || state === 'leaving' || state === 'back';
      crew.visible = moving;
      heads.visible = moving;
      cabin.visible = moving || door > 0.05;
      sigGo.visible = state === 'closing' || state === 'leaving';
      sigRed.visible = !sigGo.visible;
      if (moving) {
        // 지적확인 as it pulls away: the arm out at the signal ahead.
        const pt = state === 'leaving' ? THREE.MathUtils.smoothstep(e, 0.2, 0.7) * (1 - THREE.MathUtils.smoothstep(e, 2.6, 3.2)) : 0;
        driver.armR(v3(-0.55, FLOOR + 0.62, zc + 0.3).lerp(v3(X0 - 0.6, FLOOR + 1.0, zc + 0.3), pt));
      }
      tools.visible = checking;
      if (checking) {
        const ins = inspectRound(t, sbPhase(axle.getWorldPosition(axleW)));
        const crouching = THREE.MathUtils.smoothstep(ins.crouch, 0.05, 0.4);
        hammer.visible = crouching > 0.5;
        torch.visible = crouching > 0.5;
        const a = axle.position;
        hammer.position.set(a.x - ins.at.side, a.y + ins.at.up + ins.tap, a.z - ins.at.ahead);
        torch.position.set(a.x - 0.32, a.y + 0.22, a.z + 0.3);
      }
    };
  },

  /**
   * The 출근 점호대: a wood counter with a navy band, '출근 점호 · 음주 측정' on its front; on it the
   * 음주 측정기 (a white unit, its display, the wand in its holder on a coiled cord), the 점호부 open
   * with its pen on a chain, the stamp, the stack of the day's 운행표; behind it the duty officer's
   * desk and chair and on the wall the day's 승무 사업표 and a clock. Reporting in (sbRollCall) the
   * driver stands at the counter and salutes — the officer, there behind it, salutes back — reads
   * the 운행표 in both hands and signs the book. The breath test (sbBreathTest): the wand taken off
   * its holder and up to the mouth, blown into while the display reads '불어 주세요…', put back as
   * it turns green with '0.000 % 정상 · 통과', a look at it.
   */
  sbRollCall(g, _W, _D, _c, _def, _ctx, out) {
    const top = 1.04;
    const cz = 0.3;
    // The counter.
    part(g, rbox(1.9, 1.0, 0.3, 0.02), '#8d6e63', 0, 0.5, cz);
    part(g, box(1.9, 0.12, 0.004), NAVY, 0, 0.82, cz + 0.152, { outline: false });
    label(g, '출근 점호 · 음주 측정', 0.9, 0.09, 0, 0.82, cz + 0.155, 'none', '#ffffff');
    label(g, '음주 측정 없이 승무 불가', 0.6, 0.06, 0, 0.6, cz + 0.153, '#c62828', '#ffffff');
    part(g, rbox(1.96, 0.04, 0.42, 0.012), '#eceff1', 0, top - 0.02, cz);
    // The officer's desk and chair behind, the board and the clock on the wall.
    part(g, rbox(1.4, 0.04, 0.3, 0.01), '#cfd8dc', 0, 0.74, -0.08);
    for (const sx of [-1, 1]) part(g, box(0.04, 0.72, 0.28), '#9aa3ab', sx * 0.66, 0.36, -0.08);
    chair(g, 0.1, -0.3, 0, 0.46, '#283593');
    part(g, rbox(1.24, 0.74, 0.03, 0.01), '#37474f', -0.25, 1.72, -0.475);
    sheet(g, dutyTex(), 1.18, 0.69, -0.25, 1.72, -0.458);
    part(g, cyl(0.17, 0.17, 0.04, 24), '#fafafa', 0.68, 1.8, -0.47, { rx: Math.PI / 2 });
    const clock = painted('sbClock', 128, 128, (c) => {
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(64, 64, 62, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#212121';
      c.font = `bold 15px ${FONT}`;
      c.textAlign = 'center';
      for (let i = 1; i <= 12; i++) c.fillText(String(i), 64 + Math.sin((i / 12) * Math.PI * 2) * 48, 69 - Math.cos((i / 12) * Math.PI * 2) * 48);
      c.strokeStyle = '#212121';
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(64, 64);
      c.lineTo(64 + Math.sin(5.2) * 26, 64 - Math.cos(5.2) * 26);
      c.stroke();
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(64, 64);
      c.lineTo(64 + Math.sin(4.4) * 40, 64 - Math.cos(4.4) * 40);
      c.stroke();
    });
    sheet(g, clock, 0.32, 0.32, 0.68, 1.8, -0.448);
    // The 운행표 stack and the tray of cards, the stamp.
    for (let i = 0; i < 6; i++) part(g, box(0.21, 0.006, 0.28), i % 2 ? '#fafafa' : '#f1efe6', -0.75, top + 0.003 + i * 0.006, cz, { ry: (i % 3) * 0.03, outline: false });
    sheet(g, diagramTex('stack', 210, 280, true), 0.2, 0.27, -0.75, top + 0.04, cz, 0.05, -Math.PI / 2);
    part(g, cyl(0.025, 0.03, 0.06, 10), '#5d4037', -0.08, top + 0.03, cz - 0.1);
    part(g, rbox(0.09, 0.015, 0.06, 0.006), '#c62828', 0.04, top + 0.008, cz - 0.1);
    // The roll book, open, with its pen on a chain.
    const bookX = -0.35;
    part(g, box(0.32, 0.012, 0.22), NAVY, bookX, top + 0.006, cz + 0.02);
    sheet(g, rollBookTex(), 0.3, 0.2, bookX, top + 0.014, cz + 0.02, 0, -Math.PI / 2);
    const bookAt = marker(g, bookX, top + 0.02, cz + 0.04);
    part(g, cyl(0.006, 0.006, 0.13, 8), '#212121', bookX + 0.2, top + 0.008, cz + 0.08, { rz: Math.PI / 2, ry: 0.6, outline: false });
    // The 음주 측정기: the unit, its display, the holder, the wand on its cord.
    const mx = 0.55;
    part(g, rbox(0.22, 0.11, 0.24, 0.03), '#f5f5f5', mx, top + 0.055, cz);
    part(g, rbox(0.2, 0.06, 0.02, 0.01), '#1565c0', mx, top + 0.06, cz + 0.115);
    const disp = sheet(g, breathTex('idle'), 0.14, 0.056, mx - 0.02, top + 0.07, cz + 0.127);
    const ok = part(g, cyl(0.012, 0.012, 0.01, 10), '#4cff6a', mx + 0.075, top + 0.07, cz + 0.127, { rx: Math.PI / 2, outline: false, material: glow('#4cff6a') });
    ok.visible = false;
    label(g, '음주 측정기', 0.16, 0.035, mx, top + 0.113, cz, 'none', '#1565c0', 0, -Math.PI / 2);
    part(g, rbox(0.04, 0.08, 0.06, 0.01), '#9e9e9e', mx + 0.14, top + 0.06, cz);
    const holder = marker(g, mx + 0.14, top + 0.25, cz);
    const wand = group(g);
    part(wand, cyl(0.013, 0.013, 0.035, 10), '#42a5f5', 0, -0.018, 0, { outline: false });
    part(wand, rbox(0.045, 0.17, 0.035, 0.015), '#fafafa', 0, -0.12, 0);
    part(wand, box(0.012, 0.012, 0.004), '#ff5252', 0, -0.07, 0.019, { outline: false, material: glow('#ff5252') });
    const cord = limb(g, 0.007, '#424242');
    const cordFrom = v3(mx + 0.11, top + 0.04, cz + 0.08);
    // The duty officer, there while a driver reports.
    const offG = group(g);
    const officer = person(offG, LOOKS.officer, 0.1, -0.3, 0, 0.48);
    offG.visible = false;
    const roll = standAt(g, bookX, 0.78, Math.PI, 'sbSalute', bookAt);
    const blow = standAt(g, 0.48, 0.78, Math.PI, 'sbBlow', holder);
    out.work = bookAt;
    out.spots = { sbRollCall: roll, sbBreathTest: blow, '*': roll };
    const bookW = new THREE.Vector3();
    const holdW = new THREE.Vector3();
    const top0 = new THREE.Vector3();
    const blowBase = blow.at.position;
    const place = (e: number, H: number) => {
      wandTop(holder.position, blowBase, DWELLER_FWD, H, e, top0);
      wand.position.copy(top0);
      wand.rotation.x = -0.5 * e;
      cord(cordFrom, top0.clone().setY(top0.y - 0.2));
    };
    place(0, 1.6);
    out.away = (_o, t) => {
      const r = posed(roll, t);
      const b = posed(blow, t);
      offG.visible = r || b;
      if (b) {
        const bl = blowRound(t, sbPhase(holder.getWorldPosition(holdW)));
        place(bl.e, heightAt(blow));
        (disp.material as THREE.MeshBasicMaterial).map = breathTex(bl.reading);
        ok.visible = bl.reading === 'pass';
        officer.armR(v3(mx - 0.1, top + 0.08, cz - 0.05));
        officer.armL(v3(0.3, 0.8, 0.0));
      } else {
        place(0, 1.6);
        (disp.material as THREE.MeshBasicMaterial).map = breathTex('idle');
        ok.visible = false;
      }
      if (r) {
        // Salutes back while the driver salutes, then reads along in the book.
        const u = frac(t / 14 + sbPhase(bookAt.getWorldPosition(bookW))) * 14;
        const salute = THREE.MathUtils.smoothstep(u, 0, 0.6) * (1 - THREE.MathUtils.smoothstep(u, 2.2, 2.8));
        officer.armR(v3(0.0, 0.75, 0.0).lerp(v3(0.03, 1.29, -0.2), salute));
        officer.armL(v3(0.25, 0.78, -0.05));
      }
    };
  },

  /**
   * The cab key cabinet (운전실 키 보관함): a grey steel cabinet on the wall, its glass door opening
   * while it's used, numbered hooks inside with the 마스콘 keys on coloured tags and two 역전기
   * handles on the bottom row; the 키 수불부 on a clipboard beside it. Signing a key out (sbTakeKey)
   * the driver takes one off its hook, reads its tag, signs the sheet with the other hand and puts
   * it back at the end of the round.
   */
  sbKeyCabinet(g, _W, _D, _c, _def, _ctx, out) {
    const y = 1.45;
    const zb = -0.49;
    const zf = -0.33;
    const CASE = '#8a979f';
    part(g, box(0.66, 0.86, 0.02), shade(CASE, 0.85), 0, y, zb);
    for (const sx of [-1, 1]) part(g, box(0.02, 0.86, zf - zb), CASE, sx * 0.32, y, (zb + zf) / 2);
    for (const sy of [-1, 1]) part(g, box(0.66, 0.02, zf - zb), CASE, 0, y + sy * 0.42, (zb + zf) / 2);
    label(g, '운전실 키 보관함', 0.5, 0.08, 0, y + 0.5, zb + 0.03, NAVY, '#ffffff');
    // The pegboard and the hooks with their keys.
    part(g, box(0.6, 0.8, 0.005), '#d7dde1', 0, y, zb + 0.013, { outline: false });
    const cols = [-0.21, -0.07, 0.07, 0.21];
    const rows = [y + 0.25, y + 0.03, y - 0.19];
    const TAGS = ['#e53935', '#1e88e5', '#43a047', '#fdd835'];
    const key = (p: THREE.Object3D, x: number, yy: number, z: number, i: number, no: string) => {
      part(p, ring(0.018, 0.004), '#bdbdbd', x, yy - 0.02, z, { outline: false });
      part(p, box(0.012, 0.06, 0.005), '#cfd8dc', x, yy - 0.065, z, { outline: false });
      part(p, rbox(0.045, 0.06, 0.006, 0.004), TAGS[i % 4], x + 0.02, yy - 0.07, z + 0.006, { rz: 0.15 });
      label(p, no, 0.04, 0.018, x + 0.02, yy - 0.072, z + 0.01, 'none', '#ffffff', 0, 0);
    };
    const hookAt = v3(cols[1], rows[0], -0.43);
    rows.forEach((ry, r) =>
      cols.forEach((cx, c) => {
        part(g, cyl(0.004, 0.004, 0.05, 6), '#757575', cx, ry, -0.455, { rx: Math.PI / 2, outline: false });
        label(g, `${2071 + r * 4 + c}`, 0.05, 0.016, cx, ry + 0.035, zb + 0.017, 'none', '#37474f');
        if (r === 0 && c === 1) return;
        if (r === 2 && c >= 2) {
          // A reverser handle: an L of steel with a black grip.
          rod(g, v3(cx, ry - 0.01, -0.44), v3(cx, ry - 0.15, -0.44), 0.01, '#9e9e9e');
          rod(g, v3(cx, ry - 0.15, -0.44), v3(cx + 0.05, ry - 0.15, -0.44), 0.01, '#9e9e9e');
          part(g, cyl(0.014, 0.014, 0.05, 8), '#212121', cx + 0.075, ry - 0.15, -0.44, { rz: Math.PI / 2, outline: false });
          return;
        }
        key(g, cx, ry, -0.43, r * 4 + c, `${2071 + r * 4 + c}`);
      }),
    );
    // The key that's taken.
    const moving = group(g, hookAt.x, hookAt.y, hookAt.z);
    key(moving, 0, 0, 0, 1, '2073');
    const hook = marker(g, hookAt.x, hookAt.y - 0.05, hookAt.z);
    // The glass door, hung on the left.
    const door = group(g, -0.32, y, zf);
    door.userData.swing = -1;
    for (const sy of [-1, 1]) part(door, box(0.64, 0.04, 0.02), CASE, 0.32, sy * 0.41, 0);
    for (const sx of [0.01, 0.63]) part(door, box(0.04, 0.84, 0.02), CASE, sx, 0, 0);
    part(door, box(0.58, 0.78, 0.008), '#a9cfe0', 0.32, 0, 0, { material: GLASS, outline: false, shadow: false });
    part(door, rbox(0.03, 0.1, 0.03, 0.01), '#424242', 0.6, 0, 0.02);
    label(door, '무단 반출 금지', 0.24, 0.04, 0.32, -0.33, 0.012, '#c62828', '#ffffff');
    out.doors = [door];
    // The 키 수불부 on its clipboard to the left.
    const cp = v3(hookAt.x - KEY_CLIP.side, hookAt.y - 0.05 + KEY_CLIP.up, -0.475);
    part(g, rbox(0.24, 0.32, 0.015, 0.005), '#6d4c41', cp.x, cp.y - 0.02, cp.z);
    sheet(g, painted('sbKeyLog', 128, 160, (c) => {
      c.fillStyle = '#fffef8';
      c.fillRect(0, 0, 128, 160);
      c.fillStyle = NAVY;
      c.font = `bold 15px ${FONT}`;
      c.fillText('키 수불부', 30, 20);
      c.strokeStyle = '#b0bec5';
      for (let i = 0; i < 7; i++) {
        c.beginPath();
        c.moveTo(6, 34 + i * 18);
        c.lineTo(122, 34 + i * 18);
        c.stroke();
      }
      c.fillStyle = '#1a237e';
      c.font = `italic 11px ${FONT}`;
      ['2071 이신호 05:20', '2075 박확인 05:41'].forEach((s, i) => c.fillText(s, 8, 48 + i * 18));
    }), 0.21, 0.27, cp.x, cp.y - 0.04, cp.z + 0.009);
    part(g, rbox(0.1, 0.03, 0.02, 0.008), '#9e9e9e', cp.x, cp.y + 0.13, cp.z + 0.01);
    const take = standAt(g, 0.05, -0.02, Math.PI, 'sbKey', hook);
    out.work = hook;
    out.spots = { sbTakeKey: take, '*': take };
    const hookW = new THREE.Vector3();
    const base = take.at.position;
    out.away = (_o, t) => {
      if (!posed(take, t)) {
        moving.position.copy(hookAt);
        moving.rotation.set(0, 0, 0);
        return;
      }
      const kr = keyRound(t, sbPhase(hook.getWorldPosition(hookW)));
      keyAt(hook.position, base, DWELLER_FWD, DWELLER_LEFT, heightAt(take), kr.e, moving.position);
      moving.position.y += 0.05 * (1 - kr.e);
      moving.rotation.set(0, Math.PI * kr.e * 0.5, 0);
    };
  },

  /**
   * The 노선도: the 2호선 loop on a white board in a steel frame on the wall — every station, the
   * transfer stations ringed in black, the crew's change points (성수, 사당, 신도림) ringed in red,
   * the dashed branches to the two depots, a legend of the line's curves and its open-air stretches.
   * Learning the line (sbStudyLine) the driver stands at it, a notebook in one hand, tracing the line
   * station by station with a finger.
   */
  sbLineMap(g, W, D, _c, _def, _ctx, out) {
    const bw = W - 0.1;
    const bh = bw / 2;
    const y = 1.5;
    const z = -D / 2 + 0.04;
    part(g, rbox(bw + 0.06, bh + 0.06, 0.03, 0.01), '#9aa3ab', 0, y, z);
    sheet(g, lineMapTex(), bw, bh, 0, y, z + 0.017);
    part(g, rbox(0.6, 0.03, 0.08, 0.01), '#9aa3ab', 0.5, y - bh / 2 - 0.05, z + 0.04);
    part(g, cyl(0.006, 0.006, 0.5, 6), '#5d4037', 0.5, y - bh / 2 - 0.02, z + 0.05, { rz: Math.PI / 2, outline: false });
    const mid = marker(g, 0, y, z + 0.02);
    out.work = mid;
    const study = standAt(g, 0.25, -0.02, Math.PI, 'sbTrace', mid);
    out.spots = { sbStudyLine: study, '*': study };
  },

  /**
   * The 안전 수칙 board: a yellow-and-black framed poster on the wall — '안전 수칙' in red, a driver
   * in his cap with his arm out at a green signal ('신호 진행!'), '지적확인 환호응답' and the five
   * calls; under it the red LED counter of days without an accident. Drilling the calls (sbSafetyDrill)
   * the driver stands before it pointing at the signal and calling it out, hand back to the ear,
   * out again.
   */
  sbSafetyBoard(g, _W, D, _c, _def, _ctx, out) {
    const y = 1.5;
    const z = -D / 2 + 0.04;
    const bw = 0.78;
    const bh = 1.04;
    part(g, rbox(bw + 0.08, bh + 0.08, 0.03, 0.01), '#fbc02d', 0, y, z);
    for (let i = 0; i < 8; i++) part(g, box(0.06, 0.04, 0.032), '#212121', -bw / 2 + 0.05 + i * 0.1, y + bh / 2 + 0.02, z, { outline: false });
    sheet(g, safetyTex(), bw, bh, 0, y, z + 0.017);
    // The 무사고 counter.
    part(g, rbox(0.7, 0.16, 0.04, 0.01), '#212121', 0, y - bh / 2 - 0.14, z + 0.005);
    label(g, '무사고 운행 1,247일', 0.64, 0.11, 0, y - bh / 2 - 0.14, z + 0.027, '#0a0a0a', '#ff3d3d');
    const signal = marker(g, -bw / 2 + (78 / 384) * bw, y + bh / 2 - (150 / 512) * bh, z + 0.02);
    out.work = signal;
    const drill = standAt(g, 0.08, 0.05, Math.PI, 'sbPointCall', signal);
    out.spots = { sbSafetyDrill: drill, '*': drill };
  },

  /**
   * The crew lockers (승무원 사물함): four grey steel lockers with vents and name plates; the second
   * is the driver's, its door swinging open while it's used onto the navy uniform jacket on its
   * hanger, the cap on the shelf, the polished shoes, a mirror inside the door. Getting ready
   * (sbChangeUniform) they reach in for the jacket and the cap.
   */
  sbPlatformTrain(g, W, D, _c, _def, _ctx, out) {
    platformTrain(g, W, D, out);
  },
  sbScreenDoors(g, W) {
    screenDoors(g, W);
  },
  sbControlWall(g, W, D) {
    controlWall(g, W, D);
  },
  sbLocker(g, _W, _D, _c, _def, _ctx, out) {
    const h = 1.85;
    const zb = -0.48;
    const zf = -0.04;
    const C = '#8ea2b0';
    const names = ['이신호', '김지적', '송관제', '박확인'];
    const xs = [-0.72, -0.24, 0.24, 0.72];
    xs.forEach((x, i) => {
      const w = 0.46;
      if (i !== 1) part(g, rbox(w, h, zf - zb, 0.01), C, x, h / 2, (zb + zf) / 2);
      else {
        part(g, box(w, h, 0.02), shade(C, 0.8), x, h / 2, zb + 0.01);
        for (const sx of [-1, 1]) part(g, box(0.02, h, zf - zb), C, x + sx * (w / 2 - 0.01), h / 2, (zb + zf) / 2);
        for (const yy of [0.02, h - 0.01, 1.6]) part(g, box(w, 0.02, zf - zb), C, x, yy, (zb + zf) / 2);
        // Inside: the jacket on its hanger, the cap on the shelf, the shoes.
        rod(g, v3(x - 0.2, 1.5, -0.26), v3(x + 0.2, 1.5, -0.26), 0.008, '#9e9e9e');
        part(g, rbox(0.34, 0.58, 0.1, 0.04), NAVY, x, 1.17, -0.26);
        part(g, box(0.08, 0.2, 0.102), '#e8eef5', x, 1.36, -0.26, { outline: false });
        part(g, box(0.03, 0.16, 0.104), '#8e1b1b', x, 1.34, -0.26, { outline: false });
        part(g, box(0.06, 0.03, 0.104), '#c9a227', x + 0.1, 1.33, -0.26, { outline: false });
        part(g, cyl(0.1, 0.09, 0.07, 16), NAVY, x, 1.66, -0.28);
        part(g, cyl(0.092, 0.092, 0.022, 16), '#c9a227', x, 1.64, -0.28, { outline: false });
        for (const sx of [-1, 1]) part(g, rbox(0.09, 0.07, 0.24, 0.03), '#111111', x + sx * 0.07, 0.07, -0.26);
      }
      for (const yy of [h - 0.12, 0.18]) for (let k = 0; k < 4; k++) part(g, box(0.24, 0.012, 0.004), shade(C, 0.6), x, yy + k * 0.025, zf + 0.002, { outline: false });
      label(g, names[i], 0.16, 0.05, x, 1.55, zf + 0.003, '#fafafa', '#263238');
      if (i !== 1) part(g, rbox(0.03, 0.12, 0.03, 0.01), '#5f6a72', x + 0.17, 1.05, zf + 0.015);
    });
    // The driver's door, hung on its left.
    const door = group(g, -0.47, h / 2, zf);
    door.userData.swing = -1;
    part(door, box(0.46, h - 0.04, 0.02), C, 0.23, 0, 0.01);
    for (const yy of [h / 2 - 0.12, -h / 2 + 0.18]) for (let k = 0; k < 4; k++) part(door, box(0.24, 0.012, 0.004), shade(C, 0.6), 0.23, yy + k * 0.025, 0.022, { outline: false });
    label(door, names[1], 0.16, 0.05, 0.23, 1.55 - h / 2, 0.023, '#fafafa', '#263238');
    part(door, rbox(0.03, 0.12, 0.03, 0.01), '#5f6a72', 0.4, 1.05 - h / 2, 0.035);
    part(door, box(0.26, 0.4, 0.004), '#dfe9ef', 0.23, 0.3, -0.002, { outline: false });
    out.doors = [door];
    const inside = marker(g, -0.24, 1.3, -0.2);
    out.work = inside;
    const dress = standAt(g, -0.24, 0.3, Math.PI, 'rummage', inside);
    out.spots = { sbChangeUniform: dress, '*': dress };
  },
};
