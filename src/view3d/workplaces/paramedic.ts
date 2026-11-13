import * as THREE from 'three';
import { marker, rod, shade, spot, type Builder, type Spot } from '../parts';
import type { Motion } from '../activity';
import { ball, box, canvasTexture, cyl, part, rbox, textured } from '../toon';
import { BUILDERS as FIRE, bayFront } from './firefighter';
import { CARE, CONSOLE, CPR, KIT, careAt, consoleHead, cotAt, cprAt, dispatchAt, emsHands, emsPhase, emsTurn, frameAt, restockAt, triageAt, type AedScreen, type EmsMotion } from './paramedicMotion';

/**
 * The 119 안전센터's 구급대 drawn as itself (2026-10-27 workplace pipeline, at the user's request). The
 * CPR manikins are torso trainers on a blue mat with a pocket mask and an AED trainer that talks
 * (패드를 붙이세요 · 분석 중 · 충격 버튼을 누르세요), the chest giving under each compression and a
 * feedback screen counting them; the kit shelf has its labelled bins, an open trauma bag being
 * restocked, a box of triage tags, the checklist on its upright; the dispatch console has the 119 call
 * screen and the GIS map, the headset (worn while the call's taken) and the red 출동 button with its
 * beacon; the 119 구급차 is a white high-roof van in its orange-red livery, star of life and 119 구급대
 * on it, a cot rolled out of its back doors for field care, the driver seen at the wheel, and it drives
 * off on a call and backs in again. What the station was missing: a spare power cot, the oxygen
 * cylinder rack, the decontamination sink, the public AED cabinet and the 구급 활동 일지 board.
 * Nothing gory: the casualties are manikins.
 */

const BLACK = '#26282d';
const STEEL = '#b9c1c7';
const CHROME = '#dfe4e8';
const WHITE = '#f7f7f5';
/** The 119 ambulance's orange-red, its deeper red, the star of life's blue. */
const ORANGE = '#ef4b23';
const RED = '#d4231f';
const BLUE = '#1565c0';
const YELLOW = '#ffd23f';
const SKIN = '#f1cdb1';
const NAVY = '#1f2d4d';
const O2 = '#2e7d32';
const FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
const STATION = '한빛119안전센터';

/** Lit parts (LEDs, lamps): one unlit material a colour, shared. */
const lit = new Map<string, THREE.MeshBasicMaterial>();
function glow(color: string): THREE.MeshBasicMaterial {
  let m = lit.get(color);
  if (!m) lit.set(color, (m = new THREE.MeshBasicMaterial({ color })));
  return m;
}
const GLASS = new THREE.MeshToonMaterial({ color: '#bfe3f2', transparent: true, opacity: 0.32, depthWrite: false });
const CLEAR = new THREE.MeshToonMaterial({ color: '#e3f2fd', transparent: true, opacity: 0.5, depthWrite: false });
const WATER = new THREE.MeshToonMaterial({ color: '#81d4fa', transparent: true, opacity: 0.55, depthWrite: false });

const shapes = new Map<string, THREE.BufferGeometry>();
function shape(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let s = shapes.get(key);
  if (!s) shapes.set(key, (s = make()));
  return s;
}
const ring = (r: number, t: number, arc = Math.PI * 2) => shape(`ring${r},${t},${arc.toFixed(3)}`, () => new THREE.TorusGeometry(r, t, 8, 24, arc));

const paints = new Map<string, THREE.Texture>();
function painted(key: string, cw: number, ch: number, paint: (x: CanvasRenderingContext2D) => void): THREE.Texture {
  let t = paints.get(key);
  if (!t) paints.set(key, (t = canvasTexture(cw, ch, paint)));
  return t;
}
const litMats = new Map<string, THREE.Material>();
function litPaint(key: string, cw: number, ch: number, paint: (x: CanvasRenderingContext2D) => void): THREE.Material {
  let m = litMats.get(key);
  if (!m) litMats.set(key, (m = textured(painted(key, cw, ch, paint))));
  return m;
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
function label(g: THREE.Object3D, text: string, w: number, h: number, x: number, y: number, z: number, bg: string, fg: string, ry = 0, rx = 0, bold = true): THREE.Mesh {
  const ch = 64;
  const cw = Math.max(64, Math.round((ch * w) / h / 16) * 16);
  const tex = painted(`pmLabel|${text}|${bg}|${fg}|${cw}|${bold}`, cw, ch, (x2) => {
    if (bg !== 'none') {
      x2.fillStyle = bg;
      x2.fillRect(0, 0, cw, ch);
    }
    x2.fillStyle = fg;
    x2.font = `${bold ? 'bold ' : ''}${Math.round(ch * 0.62)}px ${FONT}`;
    x2.textAlign = 'center';
    x2.textBaseline = 'middle';
    x2.fillText(text, cw / 2, ch * 0.54, cw * 0.94);
  });
  return sheet(g, tex, w, h, x, y, z, ry, rx);
}
/** A screen the lot lights while it's used: handed out as `out.screen`. */
function screenOf(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, color: '#2a3140' }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
function group(g: THREE.Object3D, x: number, y: number, z: number, ry = 0): THREE.Group {
  const c = new THREE.Group();
  c.position.set(x, y, z);
  c.rotation.y = ry;
  g.add(c);
  return c;
}
/** A spot stood facing `yaw` at (x, z), what's done there and where the hands go. */
function standAt(g: THREE.Object3D, x: number, z: number, yaw: number, motion: Motion, work?: THREE.Object3D): Spot {
  const s = spot(g, 'stand', x, 0, z, yaw);
  s.work = work;
  s.motion = motion;
  return s;
}

/** A round dial facing +z: white face, black bezel, a red needle (handed back, to swing). */
function gauge(g: THREE.Object3D, x: number, y: number, z: number, r: number, face = '#fafafa'): THREE.Group {
  part(g, cyl(r, r, 0.02, 20), face, x, y, z, { rx: Math.PI / 2 });
  part(g, ring(r, r * 0.12), BLACK, x, y, z + 0.01, { outline: false });
  for (let i = 0; i < 7; i++) {
    const a = -2.2 + (i / 6) * 4.4;
    part(g, box(0.004, r * 0.22, 0.002), i > 4 ? '#e53935' : i < 2 ? '#e53935' : '#424242', x + Math.sin(a) * r * 0.72, y + Math.cos(a) * r * 0.72, z + 0.011, { rz: -a, outline: false });
  }
  const n = group(g, x, y, z + 0.013);
  part(n, box(0.006, r * 0.75, 0.003), '#d50000', 0, r * 0.3, 0, { outline: false });
  part(n, cyl(r * 0.1, r * 0.1, 0.006, 10), BLACK, 0, 0, 0, { rx: Math.PI / 2, outline: false });
  n.rotation.z = -0.9;
  return n;
}

// ---------------------------------------------------------------------------------------------
// Whose spot it is, and the frame the motion's worked out in.

const tmp = new THREE.Vector3();
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
/** Whether a dweller's posed at a spot just now (activity.ts spotPose marks it). */
const posed = (s: Spot, t: number) => Math.abs(t - posedAt(s)) < 0.6;
const heightAt = (s: Spot) => (s.at.userData.height as number | undefined) ?? 1.6;
const phaseOf = (work: THREE.Object3D) => emsPhase(work.getWorldPosition(tmp));
/** The motion's frame in the piece's own frame (spot and work point both children of it). */
const frameOf = (s: Spot, work: THREE.Object3D) => frameAt(work.position, 0, s.at.position, s.at.rotation.y, heightAt(s), s.how === 'sit');
/** Turns a spot by its motion's clock (square on is π). */
const turnSpot = (s: Spot, m: EmsMotion, t: number, ph: number) => {
  s.at.rotation.y = Math.PI + emsTurn(m, t, ph);
};

// ---------------------------------------------------------------------------------------------
// Pictures.

/** The star of life: a blue six-armed star edged white, the rod of Asclepius on it. */
const starTex = () =>
  painted('pmStar', 128, 128, (x) => {
    x.translate(64, 64);
    for (const [col, w, l] of [['#ffffff', 34, 60], [BLUE, 26, 54]] as const)
      for (let i = 0; i < 3; i++) {
        x.save();
        x.rotate((i * Math.PI) / 3);
        x.fillStyle = col;
        x.fillRect(-w / 2, -l, w, l * 2);
        x.restore();
      }
    x.strokeStyle = '#ffffff';
    x.lineWidth = 5;
    x.beginPath();
    x.moveTo(0, -38);
    x.lineTo(0, 40);
    x.stroke();
    x.lineWidth = 3.5;
    x.beginPath();
    x.moveTo(-8, 30);
    x.bezierCurveTo(14, 22, 14, 12, 0, 8);
    x.bezierCurveTo(-14, 4, -14, -8, 0, -12);
    x.bezierCurveTo(12, -16, 10, -26, -2, -30);
    x.stroke();
  });

/** The AED trainer's screen in each of its states. */
const aedTex = (s: AedScreen) =>
  painted(`pmAed${s}`, 128, 80, (x) => {
    const bg = s === 'shock' ? '#ff6d00' : s === 'shocked' ? '#2e7d32' : s === 'analyse' ? '#fdd835' : '#0d47a1';
    x.fillStyle = bg;
    x.fillRect(0, 0, 128, 80);
    x.fillStyle = s === 'analyse' ? '#212121' : '#ffffff';
    x.textAlign = 'center';
    x.font = `bold 15px ${FONT}`;
    const lines: Record<AedScreen, [string, string]> = {
      off: ['', ''],
      pads: ['패드를', '맨가슴에 붙이세요'],
      analyse: ['심전도 분석 중', '환자에게서 떨어지세요'],
      shock: ['충격이 필요합니다', '충격 버튼을 누르세요'],
      shocked: ['충격 완료', '가슴 압박을 하세요'],
      cpr: ['가슴 압박 30회', '인공호흡 2회'],
    };
    const [a, b] = lines[s];
    x.fillText(a, 64, 30);
    x.font = `12px ${FONT}`;
    x.fillText(b, 64, 54);
    if (s === 'pads') {
      x.fillStyle = '#ffffff';
      x.fillRect(16, 62, 14, 10);
      x.fillRect(98, 64, 14, 10);
    }
    if (s === 'analyse') {
      x.strokeStyle = '#212121';
      x.lineWidth = 2;
      x.beginPath();
      for (let i = 0; i <= 128; i += 4) x.lineTo(i, 70 - (i % 24 === 8 ? 10 : i % 24 === 12 ? -6 : 0));
      x.stroke();
    }
  });

/** The manikin's CPR feedback screen: the depth bars and the count. */
const feedbackTex = (on: boolean) =>
  painted(`pmFeedback${on}`, 96, 64, (x) => {
    x.fillStyle = '#102027';
    x.fillRect(0, 0, 96, 64);
    x.fillStyle = '#80cbc4';
    x.font = `bold 11px ${FONT}`;
    x.fillText('깊이 5~6cm', 6, 14);
    x.fillText('속도 110/분', 6, 28);
    x.fillStyle = on ? '#00e676' : '#37474f';
    x.fillRect(70, 8, 18, 48);
    x.fillStyle = '#ffffff';
    x.font = `bold 16px ${FONT}`;
    x.fillText(on ? '좋아요' : '압박', 6, 54);
  });

/** The 119 call-taking screen: the caller's line, where, what's wrong, the advice given. */
const callTex = () =>
  painted('pmCall', 224, 136, (x) => {
    x.fillStyle = '#f5f7fa';
    x.fillRect(0, 0, 224, 136);
    x.fillStyle = RED;
    x.fillRect(0, 0, 224, 20);
    x.fillStyle = '#fff';
    x.font = `bold 12px ${FONT}`;
    x.fillText('119 신고 접수 · 구급', 6, 14);
    x.fillText('통화 02:17', 160, 14);
    const rows: Array<[string, string, string?]> = [
      ['신고자', '010-****-2741'],
      ['위치', '한빛로 27 한빛아파트 102동'],
      ['증상', '60대 남성 · 의식 없음', '#c62828'],
      ['판단', '심정지 의심 → 구급1 출동', '#c62828'],
      ['안내', '전화 CPR 지도 중 (30:2)'],
    ];
    x.font = `11px ${FONT}`;
    rows.forEach(([k, v, c], i) => {
      x.fillStyle = '#90a4ae';
      x.fillText(k, 6, 38 + i * 19);
      x.fillStyle = c ?? '#263238';
      x.fillText(v, 48, 38 + i * 19);
    });
    x.fillStyle = '#2e7d32';
    x.fillRect(160, 116, 58, 16);
    x.fillStyle = '#fff';
    x.fillText('출동 지령', 166, 128);
  });

/** The GIS map: streets, the ambulance's icon and its route to the call, the hospital's cross. */
const mapTex = () =>
  painted('pmMap', 224, 136, (x) => {
    x.fillStyle = '#e8ecdf';
    x.fillRect(0, 0, 224, 136);
    x.fillStyle = '#b3d9f2';
    x.fillRect(0, 100, 224, 18);
    x.strokeStyle = '#ffffff';
    x.lineWidth = 7;
    for (const v of [30, 100, 170]) {
      x.beginPath();
      x.moveTo(v, 0);
      x.lineTo(v + 12, 136);
      x.stroke();
    }
    for (const v of [36, 76]) {
      x.beginPath();
      x.moveTo(0, v);
      x.lineTo(224, v - 8);
      x.stroke();
    }
    x.fillStyle = '#c5e1a5';
    x.fillRect(116, 44, 44, 22);
    x.strokeStyle = '#e53935';
    x.lineWidth = 3;
    x.setLineDash([6, 4]);
    x.beginPath();
    x.moveTo(36, 120);
    x.lineTo(38, 36);
    x.lineTo(176, 26);
    x.stroke();
    x.setLineDash([]);
    // The ambulance, the call (pulsing ring) and the hospital.
    x.fillStyle = '#ffffff';
    x.fillRect(28, 112, 18, 11);
    x.fillStyle = ORANGE;
    x.fillRect(28, 117, 18, 3);
    x.fillStyle = '#e53935';
    x.beginPath();
    x.arc(178, 26, 8, 0, Math.PI * 2);
    x.fill();
    x.strokeStyle = '#e53935';
    x.lineWidth = 2;
    x.beginPath();
    x.arc(178, 26, 14, 0, Math.PI * 2);
    x.stroke();
    x.fillStyle = '#1565c0';
    x.fillRect(190, 56, 22, 22);
    x.fillStyle = '#ffffff';
    x.fillRect(198, 59, 6, 16);
    x.fillRect(193, 64, 16, 6);
    x.fillStyle = '#263238';
    x.font = `bold 10px ${FONT}`;
    x.fillText('구급1 · 도착 4분', 6, 12);
    x.fillText('한빛대병원', 166, 92);
  });

/** A clipboard's checklist: what goes in the trauma bag, ticked. */
const checklistTex = () =>
  painted('pmChecklist', 64, 96, (x) => {
    x.fillStyle = '#ffffff';
    x.fillRect(0, 0, 64, 96);
    x.fillStyle = RED;
    x.font = `bold 9px ${FONT}`;
    x.fillText('구급가방 점검', 4, 12);
    x.fillStyle = '#455a64';
    x.font = `8px ${FONT}`;
    ['거즈', '붕대', '수액', '부목', '마스크', '장갑', '혈압계'].forEach((s, i) => {
      x.strokeStyle = '#90a4ae';
      x.strokeRect(4, 19 + i * 11, 7, 7);
      x.fillText(s, 15, 26 + i * 11);
      if (i < 5) {
        x.strokeStyle = '#2e7d32';
        x.beginPath();
        x.moveTo(4, 23 + i * 11);
        x.lineTo(7, 26 + i * 11);
        x.lineTo(12, 18 + i * 11);
        x.stroke();
      }
    });
  });

/** A triage tag: the card, its colour strips at the foot (red, yellow, green) torn off below the one that's kept. */
const TAG_COLS = ['#d32f2f', '#fbc02d', '#388e3c'];
const tagTex = (colour: number, torn: boolean) =>
  painted(`pmTag${colour}${torn}`, 48, 96, (x) => {
    x.fillStyle = '#fffdf5';
    x.fillRect(0, 0, 48, torn ? 96 - 22 * (2 - colour) : 96);
    x.fillStyle = '#263238';
    x.font = `bold 8px ${FONT}`;
    x.fillText('중증도 분류', 3, 10);
    x.fillStyle = '#90a4ae';
    for (let i = 0; i < 3; i++) x.fillRect(4, 16 + i * 6, 38, 2);
    for (let i = 0; i < 3; i++) {
      if (torn && i > colour) continue;
      x.fillStyle = TAG_COLS[i];
      x.fillRect(0, 34 + i * 22, 48, 20);
    }
  });

/** The 구급 활동 일지 board's sheet. */
const logTex = () =>
  painted('pmRunLog', 400, 208, (x) => {
    x.fillStyle = '#fbfbfb';
    x.fillRect(0, 0, 400, 208);
    x.fillStyle = RED;
    x.fillRect(0, 0, 400, 28);
    x.fillStyle = '#fff';
    x.font = `bold 16px ${FONT}`;
    x.fillText(`구급 활동 일지 · ${STATION}`, 34, 20);
    x.fillStyle = BLUE;
    x.beginPath();
    x.arc(16, 14, 9, 0, Math.PI * 2);
    x.fill();
    const head = ['시각', '유형', '장소', '이송 병원', '대원'];
    const xs = [8, 54, 140, 238, 322];
    x.fillStyle = '#263238';
    x.fillRect(0, 32, 400, 18);
    x.fillStyle = '#fff';
    x.font = `bold 11px ${FONT}`;
    head.forEach((h, i) => x.fillText(h, xs[i], 45));
    const rows = [
      ['06:12', '심정지(제세동)', '한빛아파트', '한빛대병원', '맹응급·하생명'],
      ['08:40', '교통사고 경상', '한빛사거리', '시립병원', '하생명'],
      ['11:05', '어르신 낙상', '새솔동 주택', '한빛대병원', '맹응급'],
      ['13:30', '복통', '한빛초 앞', '미이송(현장처치)', '맹응급·하생명'],
      ['15:20', '호흡곤란', '중앙시장', '시립병원', '맹응급'],
    ];
    x.font = `11px ${FONT}`;
    rows.forEach((r, j) => {
      x.fillStyle = j % 2 ? '#eceff1' : '#ffffff';
      x.fillRect(0, 52 + j * 20, 400, 20);
      r.forEach((c, i) => {
        x.fillStyle = i === 1 && j === 0 ? '#c62828' : '#263238';
        x.fillText(c, xs[i], 66 + j * 20, i === 3 ? 80 : 90);
      });
    });
    x.fillStyle = '#1565c0';
    x.font = `bold 13px ${FONT}`;
    x.fillText('10월 구급 출동 312건 · 이송 247명 · 심정지 소생 7명', 8, 178);
    x.fillStyle = '#c62828';
    x.fillRect(300, 186, 92, 18);
    x.fillStyle = '#fff';
    x.font = `bold 11px ${FONT}`;
    x.fillText('구급1 : 대기', 312, 199);
    x.fillStyle = '#455a64';
    x.font = `11px ${FONT}`;
    x.fillText('응급실 병상  한빛대 ○  시립 △  새솔 ×', 8, 200);
  });

// ---------------------------------------------------------------------------------------------
// Small parts.

/** An office chair with five feet, its seat `h` up, facing +z. */
function officeChair(c: THREE.Object3D, h: number, color: string) {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    rod(c, new THREE.Vector3(0, 0.08, 0), new THREE.Vector3(Math.sin(a) * 0.24, 0.045, Math.cos(a) * 0.24), 0.015, BLACK);
  }
  part(c, cyl(0.024, 0.024, h - 0.1, 10), CHROME, 0, 0.08 + (h - 0.1) / 2, 0, { outline: false });
  part(c, rbox(0.46, 0.08, 0.44, 0.035), color, 0, h + 0.02, 0);
  part(c, rbox(0.42, 0.5, 0.06, 0.04), color, 0, h + 0.35, -0.21, { rx: -0.08 });
}

/** A headset (one earcup each side, the band over, the boom mic from the left cup), its band's middle at the origin, facing +z. */
function headset(parent: THREE.Object3D): THREE.Group {
  const h = new THREE.Group();
  parent.add(h);
  part(h, ring(0.095, 0.009, Math.PI), '#212121', 0, 0, 0, { outline: false });
  for (const sx of [-1, 1]) {
    part(h, cyl(0.042, 0.042, 0.03, 16), '#212121', sx * 0.095, -0.005, 0, { rz: Math.PI / 2 });
    part(h, cyl(0.036, 0.036, 0.012, 16), '#455a64', sx * 0.08, -0.005, 0, { rz: Math.PI / 2, outline: false });
  }
  rod(h, new THREE.Vector3(0.1, -0.02, 0.01), new THREE.Vector3(0.05, -0.1, 0.11), 0.004, '#212121');
  part(h, ball(0.013), '#424242', 0.045, -0.1, 0.115, { outline: false });
  return h;
}

/** A pocket mask: a clear dome on its soft rim, the one-way valve on top, facing up. */
function pocketMask(g: THREE.Object3D, x: number, y: number, z: number, ry = 0): THREE.Group {
  const c = group(g, x, y, z, ry);
  part(c, ring(0.05, 0.012), '#90a4ae', 0, 0.006, 0, { rx: Math.PI / 2, outline: false }).scale.set(1, 1.3, 1);
  const dome = new THREE.Mesh(ball(0.05), CLEAR);
  dome.scale.set(1, 0.6, 1.3);
  dome.position.y = 0.01;
  c.add(dome);
  part(c, cyl(0.012, 0.014, 0.03, 10), '#ffffff', 0, 0.045, 0, { outline: false });
  part(c, cyl(0.016, 0.016, 0.006, 10), '#1e88e5', 0, 0.062, 0, { outline: false });
  return c;
}

/**
 * An oxygen mask on a casualty's face (a clear green-tinted cup, the strap, the tube off it), facing
 * up with the tube toward +x.
 */
function oxygenMask(g: THREE.Object3D, x: number, y: number, z: number, tubeTo?: THREE.Vector3): THREE.Group {
  const c = group(g, x, y, z);
  const cup = new THREE.Mesh(ball(0.05), new THREE.MeshToonMaterial({ color: '#c8e6c9', transparent: true, opacity: 0.6, depthWrite: false }));
  cup.scale.set(1.25, 0.55, 1);
  c.add(cup);
  part(c, ring(0.075, 0.004), '#43a047', 0, -0.01, 0, { rx: Math.PI / 2, outline: false });
  if (tubeTo) rod(c, new THREE.Vector3(0.04, 0.0, 0), tubeTo.clone().sub(c.position), 0.006, '#a5d6a7');
  return c;
}

/**
 * A torso CPR manikin on its back, head to -x, its chest's middle over the group's origin: moulded
 * hair, closed eyes, the open blue jacket. Its chest plate is drawn apart (chestPlate), to push.
 */
function manikin(g: THREE.Object3D, x: number, y: number, z: number) {
  const m = group(g, x, y, z);
  part(m, rbox(0.42, 0.12, 0.34, 0.06), SKIN, 0, 0.06, 0);
  // The jacket open down the front.
  for (const sz of [-1, 1]) {
    part(m, rbox(0.4, 0.1, 0.09, 0.04), '#1e5aa8', 0.0, 0.06, sz * 0.13);
    part(m, box(0.02, 0.005, 0.09), '#ffffff', 0.15, 0.115, sz * 0.13, { outline: false });
  }
  // Shoulders rounding off, the neck, the head tilted back a touch, its face up.
  for (const sz of [-1, 1]) part(m, ball(0.07), SKIN, -0.17, 0.065, sz * 0.13).scale.set(1, 0.8, 1);
  part(m, cyl(0.045, 0.05, 0.08, 12), SKIN, -0.25, 0.07, 0, { rz: Math.PI / 2 });
  const head = group(m, -0.34, 0.08, 0);
  part(head, ball(0.095), SKIN, 0, 0, 0).scale.set(1.15, 0.95, 0.9);
  part(head, ball(0.097), '#6d4c41', -0.03, 0.01, 0).scale.set(1.0, 0.85, 0.92);
  part(head, ball(0.016), shade(SKIN, 0.95), 0.03, 0.095, 0, { outline: false });
  for (const sz of [-1, 1]) part(head, box(0.004, 0.003, 0.03), '#5d4037', -0.0, 0.088, sz * 0.035, { outline: false });
  part(head, box(0.004, 0.003, 0.03), '#a1665e', 0.07, 0.07, 0, { outline: false });
}
/** The manikin's chest plate (the hand position marked on it), in its own group at the manikin's origin, to push. */
function chestPlate(parent: THREE.Object3D, x: number, y: number, z: number): THREE.Group {
  const chest = group(parent, x, y, z);
  part(chest, rbox(0.22, 0.025, 0.2, 0.012), shade(SKIN, 1.03), 0.0, 0.122, 0);
  part(chest, box(0.05, 0.002, 0.05), '#ef9a9a', 0.02, 0.136, 0, { outline: false });
  return chest;
}

/** A power cot's top (mattress, rails, straps), its middle at the group's origin, along x, head end to -x. */
function cotTop(g: THREE.Object3D, L: number, Wc: number): { top: THREE.Group; rails: THREE.Group[]; strapAcross: THREE.Object3D; strapLoose: THREE.Object3D } {
  const top = new THREE.Group();
  g.add(top);
  part(top, rbox(L, 0.04, Wc, 0.015), '#ffd23f', 0, 0, 0);
  part(top, rbox(L - 0.1, 0.07, Wc - 0.08, 0.03), NAVY, 0.08, 0.055, 0);
  // The head end raised (back rest), a pillow.
  const back = group(top, -L / 2 + 0.38, 0.05, 0);
  back.rotation.z = -0.45;
  part(back, rbox(0.62, 0.07, Wc - 0.08, 0.03), NAVY, -0.28, 0.035, 0);
  part(back, rbox(0.18, 0.06, Wc - 0.16, 0.03), '#e3f2fd', -0.45, 0.09, 0);
  // Handles at both ends, a folded blanket at the foot, '119' on the foot end.
  for (const sx of [-1, 1]) part(top, rbox(0.04, 0.04, Wc + 0.04, 0.015), BLACK, sx * (L / 2 + 0.02), 0.04, 0);
  part(top, rbox(0.3, 0.05, Wc - 0.12, 0.02), '#90caf9', L / 2 - 0.25, 0.115, 0);
  label(top, '119', 0.14, 0.05, L / 2 + 0.045, 0.0, 0, 'none', RED, Math.PI / 2);
  // Side rails (fold down: each a pivot on the frame).
  const rails: THREE.Group[] = [];
  for (const sz of [-1, 1]) {
    const r = group(top, 0.1, 0.02, sz * (Wc / 2 + 0.01));
    part(r, rbox(0.7, 0.02, 0.02, 0.008), STEEL, 0, 0.17, 0);
    for (const dx of [-0.3, 0.3]) part(r, rbox(0.02, 0.17, 0.02, 0.006), STEEL, dx, 0.085, 0);
    r.rotation.x = sz * 1.45;
    r.userData.side = sz;
    rails.push(r);
  }
  // The straps: chest one across (buckled) or hanging loose off the far side; hips and legs across.
  for (const dx of [0.35, 0.7]) {
    part(top, box(0.05, 0.012, Wc - 0.04), ORANGE, dx, 0.095, 0, { outline: false });
    part(top, rbox(0.06, 0.02, 0.05, 0.006), BLACK, dx, 0.1, 0.02);
  }
  const strapAcross = new THREE.Group();
  top.add(strapAcross);
  part(strapAcross, box(0.05, 0.012, Wc - 0.04), ORANGE, -0.05, 0.095, 0, { outline: false });
  part(strapAcross, rbox(0.06, 0.02, 0.05, 0.006), BLACK, -0.05, 0.1, 0.02);
  const strapLoose = new THREE.Group();
  top.add(strapLoose);
  part(strapLoose, box(0.05, 0.25, 0.012), ORANGE, -0.05, -0.04, -Wc / 2 - 0.01, { outline: false });
  part(strapLoose, box(0.05, 0.16, 0.012), ORANGE, -0.05, 0.0, Wc / 2 + 0.01, { outline: false });
  strapAcross.visible = false;
  return { top, rails, strapAcross, strapLoose };
}

/** A power cot's undercarriage: the base frame on four castors, and its X legs (stretched by setLegs). */
function cotBase(g: THREE.Object3D, L: number, Wc: number): THREE.Mesh[] {
  part(g, rbox(L - 0.25, 0.04, Wc - 0.06, 0.015), BLACK, 0, 0.14, 0);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      part(g, cyl(0.06, 0.06, 0.04, 14), '#37474f', sx * (L / 2 - 0.18), 0.06, sz * (Wc / 2 - 0.06), { rx: Math.PI / 2 });
      part(g, rbox(0.04, 0.06, 0.03, 0.01), STEEL, sx * (L / 2 - 0.18), 0.12, sz * (Wc / 2 - 0.06));
    }
  // The battery pack and the foot-end controls.
  part(g, rbox(0.2, 0.08, 0.14, 0.02), ORANGE, L / 2 - 0.4, 0.2, 0);
  const legs: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) legs.push(part(g, cyl(0.018, 0.018, 1, 8), STEEL, 0, 0, 0, { outline: false }));
  return legs;
}
const legFrom = new THREE.Vector3();
const legTo = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
/** The X legs between the base (at 0.16) and the top's underside at `h`: unit rods moved and stretched. */
function setLegs(legs: THREE.Mesh[], L: number, Wc: number, h: number) {
  let i = 0;
  for (const sz of [-1, 1])
    for (const sx of [-1, 1]) {
      legFrom.set(sx * (L / 2 - 0.35), 0.16, sz * (Wc / 2 - 0.08));
      legTo.set(-sx * (L / 2 - 0.35), h - 0.03, sz * (Wc / 2 - 0.08));
      const m = legs[i++];
      m.position.copy(legFrom).add(legTo).multiplyScalar(0.5);
      const d = legTo.sub(legFrom);
      m.scale.set(1, d.length(), 1);
      m.quaternion.setFromUnitVectors(UP, d.normalize());
    }
}

// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// The 권역응급의료센터's pieces (2026-11-04, the branch lots: workFurniture/paramedic.ts).

/**
 * 소생실 응급 카트 (erResusCart, 1 × 1): a red cart of five drawers on castors, the defibrillator-monitor on its top (the screen with
 * the rhythm on it, the paddles in their cradles, the pads' packet), the oxygen bottle in its sleeve at the side, the CPR board on its
 * back. A cardiac arrest coming in (erResuscitate): stood at it, the monitor lit.
 */
function resusCart(g: THREE.Group, out: Parameters<Builder>[6]) {
  part(g, rbox(0.62, 0.84, 0.46, 0.03), RED, 0, 0.5, -0.04);
  for (let i = 0; i < 5; i++) {
    part(g, box(0.56, 0.008, 0.012), shade(RED, 0.65), 0, 0.17 + i * 0.15, 0.195, { outline: false });
    part(g, rbox(0.18, 0.025, 0.03, 0.01), STEEL, 0, 0.24 + i * 0.15, 0.2);
  }
  for (const x of [-0.24, 0.24]) for (const z of [-0.2, 0.12]) part(g, cyl(0.045, 0.045, 0.035, 12), BLACK, x, 0.045, z, { rz: Math.PI / 2 });
  part(g, rbox(0.66, 0.04, 0.5, 0.02), '#eceff1', 0, 0.94, -0.04);
  // The defibrillator: its grey case, the screen, the dial, the two paddles.
  part(g, rbox(0.42, 0.24, 0.28, 0.03), '#37474f', -0.04, 1.08, -0.08);
  part(g, box(0.2, 0.14, 0.006), '#0b1f14', -0.1, 1.11, 0.064, { outline: false });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.12), new THREE.MeshBasicMaterial({ map: painted('erDefib', 128, 86, (c) => {
    c.fillStyle = '#04140b';
    c.fillRect(0, 0, 128, 86);
    c.strokeStyle = '#69f0ae';
    c.lineWidth = 3;
    c.beginPath();
    for (let x = 0; x <= 128; x += 2) c.lineTo(x, 34 + (x % 42 > 30 && x % 42 < 36 ? -22 : 0) + Math.sin(x / 3) * 2);
    c.stroke();
    c.fillStyle = '#ffd23f';
    c.font = 'bold 22px sans-serif';
    c.fillText('120 J', 10, 74);
  }) }));
  scr.userData.ownGeometry = scr.userData.ownMaterial = true;
  scr.position.set(-0.1, 1.11, 0.068);
  g.add(scr);
  part(g, cyl(0.03, 0.03, 0.02, 14), '#ffd23f', 0.08, 1.14, 0.067, { rx: Math.PI / 2 });
  for (const x of [0.06, 0.13]) part(g, rbox(0.05, 0.05, 0.12, 0.015), '#ffd23f', x, 1.0 + 0.0, 0.06);
  label(g, '제세동기', 0.16, 0.035, -0.1, 1.025, 0.07, '#37474f', '#ffffff');
  // The oxygen bottle at its side; the CPR board on its back.
  part(g, cyl(0.055, 0.055, 0.62, 14), O2, 0.37, 0.5, 0.0);
  part(g, cyl(0.03, 0.03, 0.08, 10), CHROME, 0.37, 0.85, 0.0);
  part(g, rbox(0.5, 0.7, 0.03, 0.02), '#ffb300', 0, 0.55, -0.29);
  label(g, '소생실', 0.22, 0.06, 0, 0.88, 0.2, RED, '#ffffff');
  const s = spot(g, 'stand', 0, 0, 0.62, Math.PI);
  s.work = marker(g, -0.04, 1.1, 0.05);
  out.work = s.work;
  out.spots = { '*': s };
}

/**
 * 중증도 분류 안내판 (erTriageSign, 1 × 1): the KTAS board on its stand at triage, the five levels in their colours from 소생 to 비응급,
 * and how soon each is seen.
 */
function triageSign(g: THREE.Group) {
  part(g, cyl(0.2, 0.22, 0.03, 18), BLACK, 0, 0.015, -0.1, { outline: false });
  part(g, cyl(0.022, 0.022, 1.0, 10), STEEL, 0, 0.52, -0.1, { outline: false });
  part(g, rbox(0.66, 0.9, 0.04, 0.02), '#eceff1', 0, 1.42, -0.1);
  const tex = painted('erTriage', 220, 300, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 220, 300);
    c.fillStyle = NAVY;
    c.fillRect(0, 0, 220, 48);
    c.fillStyle = '#ffffff';
    c.font = 'bold 22px "Malgun Gothic",sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('중증도 분류 (KTAS)', 110, 25);
    const rows: Array<[string, string, string]> = [['#1565c0', '1 소생', '즉시'], ['#d32f2f', '2 긴급', '10분'], ['#fbc02d', '3 응급', '30분'], ['#43a047', '4 준응급', '1시간'], ['#eceff1', '5 비응급', '2시간']];
    rows.forEach(([col, name, wait], i) => {
      c.fillStyle = col;
      c.fillRect(10, 58 + i * 47, 200, 42);
      c.fillStyle = i === 4 || i === 2 ? '#212121' : '#ffffff';
      c.textAlign = 'left';
      c.fillText(name, 20, 80 + i * 47);
      c.textAlign = 'right';
      c.fillText(wait, 200, 80 + i * 47);
    });
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.82), new THREE.MeshBasicMaterial({ map: tex }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(0, 1.42, -0.077);
  g.add(m);
}

export const BUILDERS: Record<string, Builder> = {
  /** The centre's 펌프차 (2026-11-04, the layout audit): the firefighter's pumper as it's drawn there, standing in its bay here. */
  pmPumper(g, W, D, c, def, ctx, out) {
    FIRE.fireTruck(g, W, D, c, def, ctx, out);
  },
  /**
   * The garage's open front: the ambulance's opening and the pumper's, their shutters rolled up (each pulls straight out onto the
   * street), the pier between them, the centre's name on the header.
   */
  pmBayFront(g) {
    bayFront(g, 6, [5.2, 11.2, 16.8], [[5.4, 11.0], [11.4, 16.6]], '한빛119안전센터');
  },
  /** The 감염관리실's washer with the dryer stacked on it, for the soiled uniforms and blankets (set dressing). */
  pmLaundry(g) {
    for (const [y, h] of [[0.45, 0.88], [1.33, 0.86]] as const) {
      part(g, rbox(0.66, h, 0.62, 0.03), WHITE, 0, y, -0.12);
      part(g, cyl(0.2, 0.2, 0.02, 24), '#90a4ae', 0, y, 0.2, { rx: Math.PI / 2 });
      part(g, cyl(0.15, 0.15, 0.024, 24), '#37474f', 0, y, 0.205, { rx: Math.PI / 2, outline: false });
      part(g, box(0.5, 0.08, 0.01), '#cfd8dc', 0, y + h / 2 - 0.1, 0.195, { outline: false });
    }
    part(g, rbox(0.4, 0.1, 0.3, 0.02), '#eceff1', 0.05, 1.82, -0.1);
    part(g, rbox(0.3, 0.22, 0.24, 0.04), '#ffca28', -0.18, 0.11, 0.38);
  },
  erResusCart(g, _W, _D, _c, _def, _ctx, out) {
    resusCart(g, out);
  },
  erTriageSign(g) {
    triageSign(g);
  },
  /**
   * A CPR manikin for training (심폐소생술 마네킹): a torso trainer on its back on a blue folding mat,
   * its head to the left of whoever kneels at it, moulded hair and closed eyes, the blue jacket open
   * on the chest; a feedback screen past its far shoulder that lights green under a good compression;
   * the pocket mask in its yellow case by the head; the AED trainer by its right hip — orange, its
   * screen, the green power button and the flashing orange shock button — with the pads' packet beside
   * it. Knelt at its right side (emsCpr): the shoulders tapped, thirty compressions (the chest gives
   * under them), the head tilted and two breaths through the mask (it's on the face), the AED on,
   * pads on (they stay, wired to the AED), hands up for the analysis, the shock button pressed, and
   * back on the chest. The AED's voice is its screen.
   */
  cprManikin(g, _W, _D, _c, _def, _ctx, out) {
    const cz = -0.1;
    const my = 0.03;
    // The mat: blue foam in three folding panels.
    for (let i = 0; i < 3; i++) part(g, rbox(0.31, 0.03, 0.88, 0.012), i === 1 ? '#1e88e5' : '#1976d2', -0.32 + i * 0.32, 0.015, 0);
    manikin(g, 0, my, cz);
    const work = marker(g, 0, 0.2, cz);
    // What's shown at rest (idle) and while it's used (inUse, set by the round in animate).
    const idle = new THREE.Group();
    const use = new THREE.Group();
    g.add(idle, use);
    out.idle = idle;
    out.inUse = use;
    chestPlate(idle, 0, my, cz);
    const chest = chestPlate(use, 0, my, cz);
    // The feedback screen past the far shoulder, its lead to the manikin; green under a good push.
    const fb = group(g, -0.05, 0.03, -0.39);
    part(fb, rbox(0.16, 0.03, 0.1, 0.01), '#37474f', 0, 0.015, 0);
    sheet(fb, feedbackTex(false), 0.13, 0.085, 0, 0.032, 0, 0, -Math.PI / 2);
    const good = sheet(use, feedbackTex(true), 0.13, 0.085, -0.05, 0.064, -0.39, 0, -Math.PI / 2);
    rod(g, new THREE.Vector3(-0.05, 0.04, -0.34), new THREE.Vector3(-0.1, 0.1, -0.22), 0.005, '#455a64');
    // The pocket mask's yellow case by the head: the mask in it, or on the face while breaths are given.
    const kx = -0.42;
    const kz = 0.24;
    part(g, rbox(0.14, 0.05, 0.12, 0.02), '#fbc02d', kx, 0.055, kz);
    pocketMask(idle, kx, 0.08, kz, Math.PI / 2);
    const caseMask = pocketMask(use, kx, 0.08, kz, Math.PI / 2);
    const face = work.position.clone().add(new THREE.Vector3(...CPR.mask));
    const faceMask = pocketMask(use, face.x, face.y - 0.008, face.z, Math.PI / 2);
    // The AED trainer by the right hip: orange case, screen, the power and shock buttons, a speaker.
    const ax = 0.35;
    const az = 0.1;
    const aed = group(g, ax, 0.03, az);
    part(aed, rbox(0.24, 0.07, 0.22, 0.025), '#ff8f00', 0, 0.035, 0);
    part(aed, rbox(0.2, 0.012, 0.05, 0.006), '#ffb74d', 0, 0.072, 0.09);
    label(aed, 'AED 트레이너', 0.13, 0.025, 0.0, 0.0785, 0.09, 'none', '#4e342e', 0, -Math.PI / 2);
    part(aed, rbox(0.13, 0.006, 0.085, 0.004), BLACK, -0.02, 0.071, -0.04, { outline: false });
    part(aed, box(0.11, 0.002, 0.07), '#1b2430', -0.02, 0.075, -0.04, { outline: false });
    const pw = work.position.clone().add(new THREE.Vector3(...CPR.power));
    const sh = work.position.clone().add(new THREE.Vector3(...CPR.shock));
    part(g, cyl(0.018, 0.018, 0.012, 14), '#2e7d32', pw.x, 0.106, pw.z);
    part(g, cyl(0.026, 0.026, 0.012, 16), '#e65100', sh.x, 0.106, sh.z);
    const bolt = painted('pmBolt', 32, 32, (x) => {
      x.fillStyle = '#ffffff';
      x.beginPath();
      x.moveTo(18, 2);
      x.lineTo(8, 18);
      x.lineTo(15, 18);
      x.lineTo(12, 30);
      x.lineTo(24, 12);
      x.lineTo(17, 12);
      x.closePath();
      x.fill();
    });
    sheet(g, bolt, 0.03, 0.03, sh.x, 0.1135, sh.z, 0, -Math.PI / 2);
    for (let i = 0; i < 4; i++) part(aed, box(0.04, 0.002, 0.004), '#5d4037', 0.08, 0.072, -0.07 + i * 0.012, { outline: false });
    // Its screen's states, the power light and the shock button's flash (while it's used).
    const screens = new Map<AedScreen, THREE.Mesh>();
    for (const s of ['pads', 'analyse', 'shock', 'shocked', 'cpr'] as AedScreen[]) screens.set(s, sheet(use, aedTex(s), 0.11, 0.07, ax - 0.02, 0.1065, az - 0.04, 0, -Math.PI / 2));
    const flash = part(use, cyl(0.027, 0.027, 0.006, 16), '#ffab40', sh.x, 0.114, sh.z, { outline: false, material: glow('#ffd180') });
    const power = part(use, cyl(0.019, 0.019, 0.004, 12), '#69f0ae', pw.x, 0.113, pw.z, { outline: false, material: glow('#69f0ae') });
    // The pads' packet: sealed on the mat at rest, torn open while it's used; the pads on the chest, wired back.
    const pk = work.position.clone().add(new THREE.Vector3(...CPR.packet));
    part(idle, rbox(0.12, 0.012, 0.09, 0.006), '#eceff1', pk.x, 0.036, pk.z);
    label(idle, '성인용 패드', 0.1, 0.02, pk.x, 0.0435, pk.z, 'none', '#c62828', 0, -Math.PI / 2);
    const packet = part(use, rbox(0.12, 0.008, 0.09, 0.004), '#cfd8dc', pk.x, 0.034, pk.z);
    const plug = new THREE.Vector3(ax - 0.12, 0.07, az - 0.05);
    const padAt = (at: readonly [number, number, number], ry: number) => {
      const p = work.position.clone().add(new THREE.Vector3(at[0], 0, at[2])).setY(at === CPR.padA ? 0.158 : 0.148);
      const c = group(use, p.x, p.y, p.z, ry);
      part(c, rbox(0.11, 0.006, 0.08, 0.004), '#fafafa', 0, 0, 0);
      part(c, box(0.07, 0.002, 0.05), '#90a4ae', 0, 0.004, 0, { outline: false });
      const lead = rod(use, p.clone().add(new THREE.Vector3(0.04, 0, 0)), plug, 0.004, '#37474f');
      return [c, lead] as const;
    };
    const padA = padAt(CPR.padA, 0.5);
    const padB = padAt(CPR.padB, -0.3);
    out.work = work;
    // Knelt at its right side, square on; turned toward the head for the breaths and to the AED for its buttons.
    const knelt = standAt(g, 0, cz + 0.47, Math.PI, 'emsCpr', work);
    out.spots = { '*': knelt };
    out.animate = (t) => {
      const ph = phaseOf(work);
      turnSpot(knelt, 'emsCpr', t, ph);
      const s = cprAt(t, ph);
      chest.position.y = my - 0.03 * s.push;
      good.visible = s.push > 0.6;
      caseMask.visible = !s.mask;
      faceMask.visible = s.mask;
      for (const m of padA) m.visible = s.pads >= 1;
      for (const m of padB) m.visible = s.pads >= 2;
      packet.visible = s.pads < 2;
      power.visible = s.screen !== 'off';
      for (const [k, m] of screens) m.visible = k === s.screen;
      flash.visible = s.flash;
    };
  },

  /**
   * The kit shelf (구급 장비 선반): grey steel uprights with red end panels and '구급 장비' under the
   * star of life; clear labelled bins up top (거즈·붕대, 수액세트) and below (부목, 산소마스크), the
   * collars and splints on top, a suction unit, a bag-valve mask and glove boxes on the floor shelf;
   * on the middle shelf the orange 119 trauma bag open, its coloured pouches inside, the triage tag box
   * beside it, the bag's checklist clipped to the left upright. Restocked (emsRestock): the right hand
   * takes from a bin, the item's read held up, put in the bag, ticked off. Triage practice
   * (emsTriage): a tag taken, written on, its strip torn, tied on the bag's handle. Read up on the
   * protocols with the binder at the shelf.
   */
  medKitShelf(g, W, D, _c, _def, _ctx, out) {
    const w = Math.min(0.9, W - 0.1);
    const d = 0.42;
    const zb = -D / 2 + 0.03;
    const z = zb + d / 2;
    const fz = zb + d;
    const grey = '#8e979e';
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) part(g, rbox(0.035, 1.92, 0.035, 0.008), grey, sx * (w / 2), 0.96, z + sz * (d / 2 - 0.02));
      part(g, rbox(0.012, 1.5, d - 0.06, 0.004), RED, sx * (w / 2 + 0.006), 1.0, z);
    }
    const shelves = [0.08, 0.45, 0.82, 1.38, 1.82];
    for (const y of shelves) {
      part(g, rbox(w, 0.025, d, 0.008), '#cfd5da', 0, y, z);
      part(g, box(w, 0.035, 0.012), grey, 0, y, fz - 0.006, { outline: false });
    }
    part(g, rbox(w, 1.8, 0.012, 0.004), '#eceff1', 0, 0.95, zb + 0.006);
    // The header: the star of life and 구급 장비.
    part(g, rbox(w, 0.13, 0.02, 0.006), RED, 0, 2.0, z);
    label(g, '구급 장비', w * 0.62, 0.1, 0.06, 2.0, z + 0.012, RED, '#ffffff');
    sheet(g, starTex(), 0.11, 0.11, -w / 2 + 0.1, 2.0, z + 0.013);
    // Bins: clear boxes with their labels and what's in them.
    const bin = (x: number, y: number, name: string, fill: (c: THREE.Group) => void) => {
      const c = group(g, x, y, z + 0.04);
      const tub = new THREE.Mesh(rbox(0.36, 0.16, 0.32, 0.015), CLEAR);
      tub.position.y = 0.08;
      c.add(tub);
      part(c, box(0.36, 0.012, 0.32), '#90caf9', 0, 0.006, 0, { outline: false });
      part(c, rbox(0.2, 0.05, 0.006, 0.004), '#ffffff', 0, 0.12, 0.163);
      label(c, name, 0.18, 0.04, 0, 0.12, 0.167, 'none', '#263238');
      fill(c);
    };
    bin(-0.22, 1.395, '거즈·붕대', (c) => {
      for (let i = 0; i < 3; i++) part(c, cyl(0.04, 0.04, 0.09, 14), '#f5ecd9', -0.1 + i * 0.1, 0.06, -0.05, { rz: Math.PI / 2 });
      for (let i = 0; i < 4; i++) part(c, rbox(0.1, 0.015, 0.08, 0.004), '#ffffff', 0.06 - i * 0.02, 0.02 + i * 0.016, 0.07);
    });
    bin(0.22, 1.395, '수액세트', (c) => {
      for (let i = 0; i < 3; i++) {
        const bag = new THREE.Mesh(rbox(0.09, 0.13, 0.03, 0.015), CLEAR);
        bag.position.set(-0.1 + i * 0.1, 0.08, -0.03 + (i % 2) * 0.05);
        c.add(bag);
        part(c, box(0.05, 0.03, 0.002), '#1e88e5', -0.1 + i * 0.1, 0.09, -0.012 + (i % 2) * 0.05, { outline: false });
      }
    });
    bin(-0.22, 0.465, '부목', (c) => {
      for (let i = 0; i < 2; i++) part(c, cyl(0.045, 0.045, 0.1, 14), '#ff7043', -0.08 + i * 0.12, 0.06, 0, { rx: Math.PI / 2 });
      part(c, rbox(0.3, 0.02, 0.08, 0.006), '#ff7043', 0, 0.13, 0.06, { rz: 0.1 });
    });
    bin(0.22, 0.465, '산소마스크', (c) => {
      for (let i = 0; i < 3; i++) oxygenMask(c, -0.1 + i * 0.1, 0.06, -0.02 + (i % 2) * 0.06);
      for (let i = 0; i < 3; i++) part(c, ring(0.06, 0.006), '#a5d6a7', -0.08 + i * 0.08, 0.03, 0.08, { rx: Math.PI / 2, outline: false });
    });
    // Top: cervical collars stacked, a rolled splint and a vacuum splint's bag.
    for (let i = 0; i < 3; i++) part(g, rbox(0.26, 0.05, 0.14, 0.03), i % 2 ? '#fbc02d' : '#ffb300', -0.25, 1.86 + i * 0.05, z, { ry: i * 0.1 });
    part(g, cyl(0.06, 0.06, 0.32, 14), '#1565c0', 0.18, 1.89, z, { rz: Math.PI / 2 });
    // Floor shelf: the suction unit, the BVM's bag, glove boxes.
    part(g, rbox(0.26, 0.2, 0.2, 0.03), '#eceff1', -0.24, 0.19, z);
    part(g, cyl(0.045, 0.045, 0.12, 14), '#ffffff', -0.3, 0.35, z);
    part(g, cyl(0.048, 0.048, 0.02, 14), '#1e88e5', -0.3, 0.42, z);
    part(g, rbox(0.06, 0.04, 0.004, 0.004), '#263238', -0.18, 0.22, z + 0.102, { material: glow('#69f0ae') });
    part(g, ball(0.08), '#7e57c2', 0.08, 0.17, z + 0.02).scale.set(1.5, 0.75, 0.75);
    for (let i = 0; i < 2; i++) {
      part(g, rbox(0.22, 0.1, 0.11, 0.01), '#1e88e5', 0.28, 0.14 + i * 0.105, z + 0.06);
      label(g, '니트릴 장갑', 0.16, 0.035, 0.28, 0.14 + i * 0.105, z + 0.117, 'none', '#ffffff');
    }
    // The trauma bag, open on the middle shelf, its lid back against the wall.
    const bx = 0.1;
    const by = 0.835;
    const bz = -0.22 - 0.0;
    const bag = group(g, bx, by, bz);
    const bw = 0.42;
    const bd = 0.26;
    part(bag, rbox(bw, 0.03, bd, 0.012), shade(ORANGE, 0.85), 0, 0.015, 0);
    for (const sx of [-1, 1]) part(bag, rbox(0.025, 0.2, bd, 0.01), ORANGE, sx * (bw / 2 - 0.012), 0.1, 0);
    for (const sz of [-1, 1]) part(bag, rbox(bw, 0.2, 0.025, 0.01), ORANGE, 0, 0.1, sz * (bd / 2 - 0.012));
    for (const sz of [-1, 1]) part(bag, box(bw + 0.004, 0.02, 0.004), '#cfd8dc', 0, 0.12, sz * (bd / 2 + 0.001), { outline: false });
    label(bag, '119 구급', 0.2, 0.06, 0, 0.1, bd / 2 + 0.004, 'none', '#ffffff');
    sheet(bag, starTex(), 0.07, 0.07, -0.16, 0.1, bd / 2 + 0.004);
    const lid = group(bag, 0, 0.2, -bd / 2);
    lid.rotation.x = -1.45;
    part(lid, rbox(bw, 0.03, bd, 0.012), ORANGE, 0, 0.015, bd / 2);
    // Pouches inside, colour-coded (airway blue, bleeding red, IV yellow, medicine green).
    ['#1e88e5', '#e53935', '#fdd835', '#43a047'].forEach((col, i) => part(bag, rbox(0.085, 0.14, 0.18, 0.02), col, -0.15 + i * 0.1, 0.09, 0));
    // The bag's carry handle along the front (where a triage tag's tied on).
    rod(bag, new THREE.Vector3(-0.08, 0.2, bd / 2 - 0.0), new THREE.Vector3(-0.02, 0.24, bd / 2 + 0.02), 0.01, BLACK);
    rod(bag, new THREE.Vector3(0.08, 0.2, bd / 2 - 0.0), new THREE.Vector3(0.02, 0.24, bd / 2 + 0.02), 0.01, BLACK);
    rod(bag, new THREE.Vector3(-0.02, 0.24, bd / 2 + 0.02), new THREE.Vector3(0.02, 0.24, bd / 2 + 0.02), 0.01, BLACK);
    const work = marker(g, bx, 1.06, bz);
    // The triage tag box beside the bag, tags standing in it.
    const tagBox = work.position.clone().add(new THREE.Vector3(KIT.tags[0], KIT.tags[1], KIT.tags[2]));
    part(g, rbox(0.11, 0.07, 0.08, 0.01), '#ffffff', tagBox.x, 0.868, tagBox.z);
    label(g, '분류표', 0.09, 0.025, tagBox.x, 0.868, tagBox.z + 0.041, 'none', '#c62828');
    TAG_COLS.forEach((c, i) => part(g, box(0.03, 0.06, 0.002), c, tagBox.x - 0.03 + i * 0.03, 0.92, tagBox.z - 0.01 + i * 0.008, { outline: false }));
    // The checklist on its clipboard on the left upright.
    const clip = work.position.clone().add(new THREE.Vector3(KIT.clip[0], KIT.clip[1], KIT.clip[2] - 0.02));
    part(g, rbox(0.14, 0.2, 0.008, 0.004), '#8d6e63', clip.x, clip.y, clip.z);
    sheet(g, checklistTex(), 0.12, 0.17, clip.x, clip.y - 0.01, clip.z + 0.006);
    part(g, rbox(0.05, 0.02, 0.012, 0.004), CHROME, clip.x, clip.y + 0.09, clip.z + 0.006);
    // In the hands while it's used: what came off the bin, a triage tag.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const items: THREE.Group[] = [];
    const item = (fill: (c: THREE.Group) => void) => {
      const c = new THREE.Group();
      use.add(c);
      fill(c);
      c.visible = false;
      items.push(c);
    };
    item((c) => part(c, rbox(0.1, 0.015, 0.08, 0.004), '#ffffff', 0, 0, 0));
    item((c) => {
      const b = new THREE.Mesh(rbox(0.09, 0.13, 0.03, 0.015), CLEAR);
      c.add(b);
      part(c, box(0.05, 0.03, 0.002), '#1e88e5', 0, 0.01, 0.016, { outline: false });
    });
    item((c) => part(c, cyl(0.045, 0.045, 0.1, 14), '#ff7043', 0, 0, 0, { rx: Math.PI / 2 }));
    item((c) => oxygenMask(c, 0, 0, 0));
    const tags: THREE.Mesh[][] = [0, 1, 2].map((col) => [false, true].map((torn) => {
      const m = sheet(use, tagTex(col, torn), 0.06, 0.12, 0, 0, 0);
      m.visible = false;
      return m;
    }));
    const restock = standAt(g, 0, 0.3, Math.PI, 'emsRestock', work);
    const triage = standAt(g, 0, 0.3, Math.PI, 'emsTriage', work);
    const study = standAt(g, 0, 0.32, Math.PI, 'read', work);
    out.work = work;
    out.spots = {
      restockMedKit: restock,
      paramedic_triagePractice: triage,
      paramedic_learnProtocols: study,
      '*': restock,
    };
    const handle = work.position.clone().add(new THREE.Vector3(KIT.handle[0], KIT.handle[1] - 0.04, KIT.handle[2] + 0.01));
    out.animate = (t) => {
      const ph = phaseOf(work);
      for (const it of items) it.visible = false;
      for (const pair of tags) for (const m of pair) m.visible = false;
      // Turned to the checklist on the upright for the tick (whether or not it's this use that's going on: it's only a spot).
      turnSpot(restock, 'emsRestock', t, ph);
      if (posed(restock, t)) {
        const s = restockAt(t, ph);
        if (s.held) {
          const h = emsHands('emsRestock', frameOf(restock, work), t, ph);
          const it = items[s.bin];
          it.visible = true;
          it.position.copy(h.r).add(new THREE.Vector3(0, 0.0, 0.02));
          it.rotation.set(0, restock.at.rotation.y, 0);
        }
      } else if (posed(triage, t)) {
        const s = triageAt(t, ph);
        const m = tags[s.colour][s.torn ? 1 : 0];
        if (s.tied) {
          m.visible = true;
          m.position.copy(handle).add(new THREE.Vector3(0, -0.06, 0.01));
          m.rotation.set(0, 0, 0.08);
        } else if (s.hand !== 'none') {
          const h = emsHands('emsTriage', frameOf(triage, work), t, ph);
          m.visible = true;
          m.position.copy(s.hand === 'l' ? h.l : h.r).add(new THREE.Vector3(0, 0.03, 0.02));
          // Held up facing whoever holds it.
          m.rotation.set(-0.3, 0, 0);
        }
      }
    };
  },

  /**
   * The 119 dispatch console (출동 지령 단말): a grey steel desk; the call-taking screen (the caller's
   * number, the address, 의식 없음 — 심정지 의심, the phone CPR being coached) lit while it's used and
   * the GIS map with the ambulance's route beside it on a twin arm; a district map pinned up behind;
   * the keyboard and mouse, the desk phone, the radio's base, the headset on its hook (on the head while
   * it's used), and the red 출동 button under its flap, the call-out beacon on the arm's post that turns
   * when it's pressed. Sat at it (emsDispatch): typing the call in, a hand to the earcup talking the
   * caller through, the map pointed at, 출동 pressed. The 출동 사례 강평 is stood at its side turned to
   * the crew, pointing back at the screens.
   */
  dispatchDesk(g, W, D, _c, _def, _ctx, out) {
    const h = 0.74;
    const d = 0.6;
    const zb = -D / 2 + 0.03;
    const z = zb + d / 2;
    const front = zb + d;
    const w = Math.min(W - 0.04, 0.96);
    const steel = '#7f8a91';
    part(g, rbox(w, 0.035, d, 0.012), '#d9dde0', 0, h, z);
    part(g, rbox(0.34, h - 0.02, d - 0.06, 0.012), steel, w / 2 - 0.2, (h - 0.02) / 2, z);
    for (let i = 0; i < 3; i++) part(g, rbox(0.3, 0.19, 0.012, 0.006), shade(steel, 1.15), w / 2 - 0.2, 0.14 + i * 0.22, z + (d - 0.06) / 2 + 0.004);
    part(g, rbox(0.04, h - 0.02, d - 0.06, 0.01), steel, -w / 2 + 0.04, (h - 0.02) / 2, z);
    part(g, rbox(w - 0.4, 0.36, 0.015, 0.006), shade(steel, 0.9), -0.1, 0.5, zb + 0.03);
    const ty = h + 0.018;
    // The twin monitor arm on its post, the beacon on top of the post.
    const postZ = zb + 0.08;
    part(g, cyl(0.025, 0.025, 0.62, 10), BLACK, 0, ty + 0.31, postZ);
    part(g, rbox(0.14, 0.02, 0.1, 0.008), BLACK, 0, ty + 0.01, postZ);
    const mons: Array<[number, number, () => THREE.Texture, boolean]> = [[-0.23, 0.18, callTex, true], [0.23, -0.18, mapTex, false]];
    for (const [x, ry, tex, main] of mons) {
      rod(g, new THREE.Vector3(0, ty + 0.3, postZ), new THREE.Vector3(x * 0.8, ty + 0.3, postZ + 0.05), 0.012, BLACK);
      const m = group(g, x, ty + 0.3, zb + 0.14, ry);
      part(m, rbox(0.44, 0.28, 0.03, 0.01), BLACK, 0, 0, 0);
      if (main) out.screen = screenOf(m, tex(), 0.41, 0.25, 0, 0, 0.016);
      else sheet(m, tex(), 0.41, 0.25, 0, 0, 0.016);
    }
    const beaconY = ty + 0.66;
    part(g, cyl(0.05, 0.055, 0.03, 16), BLACK, 0, beaconY - 0.03, postZ);
    part(g, cyl(0.04, 0.045, 0.08, 16), '#b71c1c', 0, beaconY + 0.02, postZ);
    // The district map pinned on the wall behind.
    sheet(g, mapTex(), 0.5, 0.3, -0.1, 1.62, zb + 0.005);
    part(g, rbox(0.52, 0.32, 0.01, 0.004), '#8d6e63', -0.1, 1.62, zb + 0.0);
    // The keyboard, the mouse, the phone and the radio base, the 출동 button.
    const work = marker(g, 0, ty + 0.002, front - 0.18);
    const kb = work.position;
    part(g, rbox(0.4, 0.02, 0.13, 0.006), '#37474f', kb.x, kb.y - 0.005, kb.z);
    for (let r = 0; r < 4; r++) part(g, box(0.36, 0.004, 0.022), '#90a4ae', kb.x, kb.y + 0.007, kb.z - 0.045 + r * 0.03, { outline: false });
    const mouse = kb.clone().add(new THREE.Vector3(CONSOLE.mouse[0], -0.002, CONSOLE.mouse[2]));
    part(g, rbox(0.06, 0.004, 0.08, 0.002), '#263238', mouse.x, mouse.y - 0.008, mouse.z);
    part(g, ball(0.025), '#455a64', mouse.x, mouse.y + 0.0, mouse.z).scale.set(1, 0.55, 1.4);
    const btn = kb.clone().add(new THREE.Vector3(CONSOLE.button[0], CONSOLE.button[1] - 0.025, CONSOLE.button[2]));
    part(g, rbox(0.16, 0.035, 0.13, 0.01), '#eceff1', btn.x, btn.y + 0.012, btn.z);
    part(g, cyl(0.035, 0.038, 0.022, 18), '#d50000', btn.x, btn.y + 0.04, btn.z);
    label(g, '출동', 0.07, 0.025, btn.x, btn.y + 0.031, btn.z + 0.056, 'none', '#c62828', 0, -0.8);
    part(g, rbox(0.18, 0.06, 0.15, 0.02), '#263238', 0.32, ty + 0.03, zb + 0.2);
    part(g, box(0.08, 0.025, 0.004), '#76ff03', 0.29, ty + 0.045, zb + 0.276, { outline: false, material: glow('#b2ff59') });
    part(g, rbox(0.16, 0.05, 0.18, 0.02), '#cfd8dc', -0.34, ty + 0.025, zb + 0.18, { ry: 0.2 });
    part(g, rbox(0.05, 0.03, 0.17, 0.015), '#37474f', -0.34, ty + 0.06, zb + 0.18, { ry: 0.2 });
    label(g, '119 종합상황실', 0.36, 0.06, w / 2 - 0.2, h - 0.07, z + (d - 0.06) / 2 + 0.012, '#c62828', '#ffffff');
    // The chair.
    const cz = front + 0.22;
    const chair = group(g, 0, 0, cz, Math.PI);
    officeChair(chair, 0.44, '#263238');
    // The headset: on its hook on the post when nobody's at it, on the head while they are.
    const idle = new THREE.Group();
    g.add(idle);
    out.idle = idle;
    const hung = headset(idle);
    hung.position.set(0.06, ty + 0.48, postZ + 0.02);
    hung.rotation.set(0, Math.PI / 2, 0);
    part(g, cyl(0.006, 0.006, 0.06, 6), CHROME, 0.03, ty + 0.5, postZ, { rz: Math.PI / 2, outline: false });
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const worn = headset(use);
    const beaconOn = part(use, cyl(0.043, 0.048, 0.082, 16), '#ff5252', 0, beaconY + 0.02, postZ, { material: glow('#ff5252') });
    out.seat = marker(g, 0, 0.48, cz);
    out.work = work;
    const sat = spot(g, 'sit', 0, 0.48, cz, Math.PI, 0.48);
    sat.work = work;
    sat.motion = 'emsDispatch';
    const screenAt = marker(g, -0.2, ty + 0.32, zb + 0.16);
    const review = standAt(g, 0.62, front + 0.12, 0, 'present', screenAt);
    out.spots = { reviewDispatch: sat, paramedic_reviewCalls: review, '*': sat };
    const head = new THREE.Vector3();
    out.animate = (t) => {
      const ph = phaseOf(work);
      const on = posed(sat, t);
      worn.visible = on;
      if (!on) {
        // Stood beside it for the review: the headset stays on its hook.
        idle.visible = true;
        beaconOn.visible = false;
        return;
      }
      turnSpot(sat, 'emsDispatch', t, ph);
      const s = dispatchAt(t, ph);
      beaconOn.visible = s.goLamp && Math.sin(t * 12) > -0.2;
      const H = heightAt(sat);
      const c = consoleHead(H);
      const yaw = sat.at.rotation.y;
      head.set(sat.at.position.x + c.x * Math.cos(yaw) + c.z * Math.sin(yaw), sat.at.position.y + c.y + 0.02 * (H / 1.6), sat.at.position.z - c.x * Math.sin(yaw) + c.z * Math.cos(yaw));
      worn.position.copy(head);
      worn.scale.setScalar(H / 1.6);
      worn.rotation.set(0.05, yaw, 0, 'YXZ');
    };
  },

  /**
   * The 119 구급차: a white high-roof van, its orange-red band and yellow pinstripe down the sides,
   * 119 구급대 on them under the station's name, the star of life on the box and the back doors, the
   * light bar (red and blue) over the cab and red flashers at the box's corners, the windscreen and
   * cab windows you can see the driver through (Korea's on the right: the wheel's on the left), a
   * sliding side door on the kerb side; inside, seen when the back doors are open, the bench, the
   * cabinets, the monitor on its bracket and the oxygen point. It stands in its painted bay. For field
   * care (emsCare) the back doors swing open and the cot is rolled out behind it with a casualty
   * manikin under a blanket: two fingers on the wrist, the oxygen mask fitted (it stays on), the
   * monitor tapped, a hand on the shoulder. The driving drill is sat at the wheel. On a call it pulls
   * off with its lights going and is gone; it reverses back in.
   */
  ambulance(g, _W, _D, _c, _def, _ctx, out) {
    const van = new THREE.Group();
    g.add(van);
    const xb = -1.6;
    const xc = 0.85;
    const xf = 1.72;
    const hw = 0.8;
    const top = 2.32;
    const floorY = 0.62;
    // The bay painted on the ground (seen when it's out).
    const fy = 0.004;
    for (const sz of [-1, 1]) part(g, box(3.6, 0.004, 0.06), YELLOW, 0.05, fy, sz * 0.98, { outline: false });
    part(g, box(0.06, 0.004, 1.96), YELLOW, 1.85, fy, 0, { outline: false });
    label(g, '구급차 전용', 1.1, 0.3, 0.1, fy + 0.002, 0, 'none', YELLOW, Math.PI / 2, -Math.PI / 2);
    // Wheels.
    for (const wx of [xb + 0.55, xf - 0.55])
      for (const sz of [-1, 1]) {
        const z = sz * (hw - 0.12);
        part(van, cyl(0.33, 0.33, 0.24, 22), BLACK, wx, 0.33, z, { rx: Math.PI / 2 });
        part(van, cyl(0.2, 0.2, 0.245, 18), STEEL, wx, 0.33, z, { rx: Math.PI / 2, outline: false });
        part(van, cyl(0.07, 0.07, 0.25, 10), shade(STEEL, 0.6), wx, 0.33, z, { rx: Math.PI / 2, outline: false });
        part(van, rbox(0.78, 0.05, 0.26, 0.02), WHITE, wx, 0.69, sz * (hw - 0.1), { outline: false });
      }
    part(van, rbox(xf - xb - 0.3, 0.2, 2 * hw - 0.4, 0.04), BLACK, (xf + xb) / 2, 0.4, 0);
    // The box: floor, roof and two sides, the partition to the cab (hollow so its inside's seen).
    const boxLen = xc - xb;
    const bxm = (xc + xb) / 2;
    part(van, rbox(boxLen, 0.1, 2 * hw, 0.03), WHITE, bxm, floorY - 0.05, 0);
    part(van, box(boxLen - 0.1, 0.01, 2 * hw - 0.1), '#90a4ae', bxm, floorY + 0.006, 0, { outline: false });
    part(van, rbox(boxLen + 0.02, 0.1, 2 * hw, 0.04), WHITE, bxm, top - 0.05, 0);
    for (const sz of [-1, 1]) part(van, rbox(boxLen, top - floorY, 0.05, 0.03), WHITE, bxm, (top + floorY) / 2, sz * (hw - 0.025));
    part(van, rbox(0.05, top - floorY, 2 * hw, 0.02), '#eceff1', xc - 0.03, (top + floorY) / 2, 0);
    // The lower skirt down to the sills.
    part(van, rbox(xf - xb, 0.2, 2 * hw, 0.04), WHITE, (xf + xb) / 2, floorY - 0.12, 0);
    // The cab: doors and dash below, glass above, the roof; the hood in front.
    const cabLen = 1.45 - xc;
    const cabX = (1.45 + xc) / 2;
    part(van, rbox(cabLen, 0.52, 2 * hw, 0.05), WHITE, cabX, floorY + 0.26, 0);
    part(van, rbox(cabLen + 0.05, 0.12, 2 * hw, 0.04), WHITE, cabX - 0.02, 2.0, 0);
    part(van, rbox(0.3, top - 2.0, 2 * hw, 0.04), WHITE, xc + 0.1, (top + 2.0) / 2, 0);
    for (const sz of [-1, 1]) {
      const side = new THREE.Mesh(box(cabLen - 0.12, 0.72, 0.02), GLASS);
      side.position.set(cabX - 0.04, floorY + 0.88, sz * (hw - 0.01));
      van.add(side);
      part(van, rbox(0.06, 0.8, 0.06, 0.02), WHITE, xc + 0.04, floorY + 0.9, sz * (hw - 0.03));
    }
    part(van, rbox(xf - 1.45, 0.42, 2 * hw - 0.04, 0.08), WHITE, (xf + 1.45) / 2, floorY + 0.2, 0);
    const wind = new THREE.Mesh(box(0.02, 1.13, 2 * hw - 0.14), GLASS);
    wind.position.set(1.5, 1.405, 0);
    wind.rotation.z = 0.213;
    van.add(wind);
    for (const sz of [-1, 1]) rod(van, new THREE.Vector3(1.62, 0.85, sz * (hw - 0.04)), new THREE.Vector3(1.38, 1.96, sz * (hw - 0.04)), 0.03, WHITE);
    // The seats, the dash and the wheel (the driver's on the left: -z, facing +x).
    for (const sz of [-1, 1]) {
      part(van, rbox(0.4, 0.07, 0.4, 0.03), '#37474f', cabX - 0.06, floorY + 0.3, sz * 0.4);
      part(van, rbox(0.08, 0.58, 0.4, 0.03), '#37474f', xc + 0.12, floorY + 0.62, sz * 0.4, { rz: 0.08 });
    }
    part(van, rbox(0.22, 0.14, 2 * hw - 0.1, 0.03), '#37474f', 1.42, floorY + 0.5, 0);
    const wheel = group(van, 1.3, floorY + 0.7, -0.4);
    wheel.rotation.set(0, Math.PI / 2, 0);
    const wheelTilt = group(wheel, 0, 0, 0);
    wheelTilt.rotation.x = -0.6;
    part(wheelTilt, ring(0.17, 0.017), BLACK, 0, 0, 0, { outline: false });
    part(wheelTilt, cyl(0.045, 0.045, 0.04, 12), BLACK, 0, 0, 0, { rx: Math.PI / 2 });
    for (const a of [Math.PI / 2, Math.PI * 1.2, -0.2]) part(wheelTilt, box(0.012, 0.15, 0.012), BLACK, Math.cos(a) * 0.08, Math.sin(a) * 0.08, 0, { rz: a + Math.PI / 2, outline: false });
    const hub = marker(wheelTilt, 0, 0, 0);
    // Front: grille, headlights, bumper, plate; 119 on the hood.
    part(van, rbox(0.03, 0.18, 0.8, 0.01), '#2b2d33', xf + 0.005, floorY + 0.2, 0);
    for (const sz of [-1, 1]) part(van, rbox(0.04, 0.12, 0.26, 0.03), '#fffde7', xf - 0.005, floorY + 0.3, sz * (hw - 0.2), { material: glow('#fffde7') });
    part(van, rbox(0.12, 0.18, 2 * hw + 0.02, 0.03), '#9ea7ae', xf + 0.02, floorY - 0.06, 0);
    label(van, '99구 1190', 0.36, 0.09, xf + 0.085, floorY - 0.06, 0, '#ffffff', '#111111', Math.PI / 2);
    label(van, '119', 0.42, 0.18, (xf + 1.45) / 2, floorY + 0.415, 0, 'none', RED, Math.PI / 2, -Math.PI / 2);
    // The light bar over the cab, flashers at the box's top corners.
    const lights = new THREE.Group();
    const off = new THREE.Group();
    van.add(lights, off);
    const lamps: THREE.Mesh[] = [];
    part(van, rbox(0.3, 0.05, 1.3, 0.02), BLACK, xc + 0.15, top + 0.03, 0);
    for (let i = 0; i < 6; i++) {
      const z = -0.55 + i * 0.22;
      const col = i < 3 ? '#ff3b30' : '#2979ff';
      part(off, rbox(0.24, 0.08, 0.2, 0.03), i < 3 ? '#c62828' : '#1e3a8a', xc + 0.15, top + 0.09, z);
      lamps.push(part(lights, rbox(0.24, 0.08, 0.2, 0.03), col, xc + 0.15, top + 0.09, z, { material: glow(i < 3 ? '#ff5252' : '#448aff') }));
    }
    for (const sz of [-1, 1]) {
      part(off, rbox(0.1, 0.1, 0.06, 0.02), '#c62828', xb + 0.06, top - 0.12, sz * (hw + 0.005));
      lamps.push(part(lights, rbox(0.1, 0.1, 0.06, 0.02), '#ff3b30', xb + 0.06, top - 0.12, sz * (hw + 0.005), { material: glow('#ff5252') }));
    }
    lights.visible = false;
    // Mirrors on arms.
    for (const sz of [-1, 1]) {
      rod(van, new THREE.Vector3(1.4, floorY + 0.6, sz * hw), new THREE.Vector3(1.38, floorY + 0.7, sz * (hw + 0.16)), 0.012, BLACK);
      part(van, rbox(0.08, 0.22, 0.04, 0.02), BLACK, 1.38, floorY + 0.8, sz * (hw + 0.17));
    }
    // The sides: the band and its pinstripe, 119 구급대, the station's name, the star of life, the sliding door's seams.
    for (const sz of [-1, 1]) {
      const sd = group(van, 0, 0, sz * (hw + 0.004), sz > 0 ? 0 : Math.PI);
      const lx = (x: number) => (sz > 0 ? x : -x);
      part(sd, box(xf - xb - 0.1, 0.2, 0.004), ORANGE, lx((xf + xb) / 2), 0.92, 0, { outline: false });
      part(sd, box(xf - xb - 0.1, 0.03, 0.004), YELLOW, lx((xf + xb) / 2), 1.05, 0.0005, { outline: false });
      part(sd, box(boxLen - 0.1, 0.06, 0.004), ORANGE, lx(bxm), top - 0.18, 0, { outline: false });
      label(sd, '119 구급대', 1.4, 0.3, lx(bxm + 0.1), 1.55, 0.002, 'none', RED);
      label(sd, STATION, 1.1, 0.12, lx(bxm + 0.1), 1.27, 0.002, 'none', '#37474f');
      sheet(sd, starTex(), 0.36, 0.36, lx(xb + 0.35), 1.55, 0.003);
      label(sd, '119', 0.26, 0.14, lx(cabX - 0.02), 0.92, 0.002, 'none', '#ffffff');
      if (sz > 0) {
        // The sliding door on the kerb side: its seams and handle, a frosted window.
        for (const x of [xc - 0.08, xc - 0.95]) part(sd, box(0.008, 1.4, 0.004), '#9e9e9e', lx(x), floorY + 0.75, 0.001, { outline: false });
        part(sd, rbox(0.12, 0.03, 0.02, 0.01), CHROME, lx(xc - 0.86), 1.2, 0.01, { outline: false });
        part(sd, box(0.6, 0.35, 0.004), '#cfd8dc', lx(xc - 0.5), 1.88, 0.001, { outline: false });
      }
    }
    // Inside the box (seen with the back doors open): the bench, cabinets, the monitor, the oxygen point, the cot's mount rail.
    part(van, rbox(1.3, 0.38, 0.4, 0.04), '#78909c', bxm - 0.1, floorY + 0.19, hw - 0.25);
    part(van, rbox(1.3, 0.08, 0.38, 0.03), '#1f2d4d', bxm - 0.1, floorY + 0.42, hw - 0.25);
    part(van, rbox(1.6, 0.6, 0.3, 0.03), '#eceff1', bxm, top - 0.45, -hw + 0.2);
    for (let i = 0; i < 4; i++) part(van, box(0.36, 0.5, 0.004), '#cfd8dc', bxm - 0.6 + i * 0.4, top - 0.45, -hw + 0.352, { outline: false });
    part(van, rbox(0.26, 0.2, 0.08, 0.02), '#263238', xc - 0.25, 1.55, -hw + 0.1);
    part(van, box(0.2, 0.13, 0.004), '#00e676', xc - 0.25, 1.56, -hw + 0.142, { outline: false, material: glow('#69f0ae') });
    part(van, cyl(0.03, 0.03, 0.06, 10), O2, xc - 0.5, 1.2, -hw + 0.06, { rx: Math.PI / 2 });
    for (const sz of [-0.2, 0.2]) part(van, box(boxLen - 0.3, 0.03, 0.05), STEEL, bxm, floorY + 0.02, sz - 0.1, { outline: false });
    // The cot loaded inside (while it's not rolled out).
    const inside = new THREE.Group();
    van.add(inside);
    const cotL = 1.86;
    const cotW = 0.56;
    const inCot = group(inside, bxm - 0.05, floorY + 0.28, -0.1);
    cotTop(inCot, cotL, cotW);
    part(inside, rbox(cotL - 0.3, 0.24, cotW - 0.1, 0.03), BLACK, bxm - 0.05, floorY + 0.14, -0.1);
    // The back: the doors (closed, or swung open), the bumper step, the tail lights.
    const backClosed = new THREE.Group();
    van.add(backClosed);
    const doorH = top - floorY - 0.12;
    const door = (parent: THREE.Object3D, sz: number) => {
      const d = group(parent, xb - 0.02, floorY + 0.04, sz * hw);
      const dz = -sz * hw / 2;
      part(d, rbox(0.05, doorH, hw - 0.02, 0.02), WHITE, 0, doorH / 2, dz);
      const win = new THREE.Mesh(box(0.012, 0.42, hw - 0.2), GLASS);
      win.position.set(-0.03, doorH - 0.42, dz);
      d.add(win);
      part(d, box(0.006, 0.12, hw - 0.04), ORANGE, -0.028, 0.3, dz, { outline: false });
      sheet(d, starTex(), 0.3, 0.3, -0.03, doorH * 0.48, dz + sz * 0.02, -Math.PI / 2);
      label(d, sz > 0 ? '구급' : '119', 0.3, 0.14, -0.03, doorH * 0.78, dz, 'none', RED, -Math.PI / 2);
      part(d, rbox(0.03, 0.03, 0.12, 0.01), CHROME, -0.04, doorH * 0.45, -sz * (hw - 0.1), { outline: false });
      return d;
    };
    door(backClosed, 1);
    door(backClosed, -1);
    const backOpen = new THREE.Group();
    van.add(backOpen);
    for (const sz of [-1, 1]) {
      const d = door(backOpen, sz);
      d.rotation.y = sz * (Math.PI / 2 + 0.05);
    }
    backOpen.visible = false;
    part(van, rbox(0.2, 0.06, 2 * hw - 0.1, 0.02), '#9ea7ae', xb - 0.1, floorY - 0.2, 0);
    for (const sz of [-1, 1]) {
      part(van, rbox(0.03, 0.3, 0.1, 0.015), '#d32f2f', xb - 0.01, 1.0, sz * (hw - 0.07), { material: glow('#ff5252') });
      part(van, rbox(0.03, 0.1, 0.1, 0.015), '#ffb300', xb - 0.01, 1.22, sz * (hw - 0.07));
    }
    label(van, '99구 1190', 0.36, 0.09, xb - 0.04, floorY - 0.06, 0, '#ffffff', '#111111', -Math.PI / 2);
    // Rolled out behind for field care: the cot at working height, a manikin casualty under a blanket.
    const careAtX = -3.15;
    const out1 = new THREE.Group();
    g.add(out1);
    out1.visible = false;
    const cotX = careAtX + 0.45;
    const cotH = 0.8;
    const cot = group(out1, cotX, 0, 0);
    const legs = cotBase(cot, cotL, cotW);
    setLegs(legs, cotL, cotW, cotH);
    const tp = cotTop(cot, cotL, cotW);
    tp.top.position.y = cotH;
    tp.rails.forEach((r) => (r.rotation.x = 0));
    tp.strapAcross.visible = true;
    tp.strapLoose.visible = false;
    // The casualty: a manikin, its head up the raised back rest, the blanket over its legs.
    const chestX = careAtX;
    const chestY = cotH + 0.14;
    const cas = group(out1, chestX, cotH + 0.06, 0);
    part(cas, rbox(0.44, 0.13, 0.34, 0.06), '#5c6bc0', 0.0, 0.05, 0);
    part(cas, cyl(0.045, 0.05, 0.08, 12), SKIN, -0.25, 0.1, 0, { rz: Math.PI / 2 + 0.3 });
    const hd = group(cas, -0.36, 0.17, 0);
    part(hd, ball(0.095), SKIN, 0, 0, 0).scale.set(1.1, 0.95, 0.9);
    part(hd, ball(0.097), '#3e2723', -0.03, 0.01, 0).scale.set(1, 0.85, 0.92);
    for (const sz of [-1, 1]) part(hd, box(0.004, 0.003, 0.03), '#5d4037', 0.01, 0.088, sz * 0.035, { outline: false });
    for (const sz of [-1, 1]) part(cas, rbox(0.34, 0.07, 0.09, 0.035), '#5c6bc0', 0.05, 0.03, sz * 0.21);
    part(cas, rbox(0.9, 0.12, 0.42, 0.05), '#90caf9', 0.66, 0.02, 0);
    const wrist = new THREE.Vector3(chestX + CARE.wrist[0], chestY + CARE.wrist[1], CARE.wrist[2]);
    part(out1, ball(0.035), SKIN, wrist.x, wrist.y, wrist.z).scale.set(1.4, 0.7, 1);
    // The monitor-defibrillator on the foot of the cot, its screen.
    const monAt = new THREE.Vector3(chestX + CARE.monitor[0], chestY + CARE.monitor[1] - 0.06, CARE.monitor[2]);
    part(out1, rbox(0.26, 0.18, 0.16, 0.03), '#ffb300', monAt.x + 0.05, monAt.y, monAt.z);
    part(out1, box(0.004, 0.11, 0.13), '#00e676', monAt.x - 0.081, monAt.y + 0.02, monAt.z, { outline: false, material: glow('#a5d6a7') });
    const monTap = part(out1, box(0.004, 0.11, 0.13), '#ffffff', monAt.x - 0.082, monAt.y + 0.02, monAt.z, { outline: false, material: glow('#e8f5e9') });
    monTap.visible = false;
    rod(out1, new THREE.Vector3(monAt.x - 0.05, monAt.y - 0.02, monAt.z + 0.08), new THREE.Vector3(chestX + 0.05, chestY - 0.02, 0.12), 0.004, '#37474f');
    // The oxygen mask: off on the cot (while it's fitted, on the face), its tube to a portable cylinder on the cot.
    part(out1, cyl(0.05, 0.05, 0.42, 14), O2, chestX + 0.45, cotH + 0.13, -0.18, { rz: Math.PI / 2 });
    const faceAt = new THREE.Vector3(chestX + CARE.mask[0], chestY + CARE.mask[1] - 0.02, CARE.mask[2]);
    const onFace = oxygenMask(out1, faceAt.x, faceAt.y, faceAt.z, new THREE.Vector3(chestX + 0.24, cotH + 0.13, -0.18));
    const onCot = oxygenMask(out1, chestX + 0.1, cotH + 0.18, -0.2);
    const work = marker(g, chestX, chestY, 0);
    const care = standAt(g, chestX, 0.62, Math.PI, 'emsCare', work);
    const drive = spot(van, 'sit', cabX - 0.06, floorY + 0.36, -0.4, Math.PI / 2, 0.4);
    drive.work = hub;
    drive.motion = 'steer';
    out.work = hub;
    out.spots = { paramedic_leadCare: care, paramedic_ambulanceDrill: drive, '*': drive };
    out.animate = (t) => {
      if (!posed(care, t)) return;
      const ph = phaseOf(work);
      turnSpot(care, 'emsCare', t, ph);
      const s = careAt(t, ph);
      onFace.visible = s.mask;
      onCot.visible = !s.mask;
      monTap.visible = s.tap && Math.sin(t * 9) > 0;
    };
    // Out on a call: lights going, it pulls off forward and is gone; it reverses back in.
    let state: 'parked' | 'leaving' | 'gone' | 'back' | undefined;
    let since = 0;
    const PULL = 5;
    out.away = (isOut, t) => {
      if (state === undefined) state = isOut ? 'gone' : 'parked';
      else if (isOut && (state === 'parked' || state === 'back')) [state, since] = ['leaving', t];
      else if (!isOut && (state === 'leaving' || state === 'gone')) [state, since] = ['back', t];
      let x = 0;
      if (state === 'leaving') {
        const u = Math.min(1, (t - since) / 3);
        x = PULL * u * u;
        if (u >= 1) state = 'gone';
      } else if (state === 'back') {
        const u = Math.min(1, (t - since) / 4.5);
        x = PULL * (1 - u) * (1 - u);
        if (u >= 1) state = 'parked';
      }
      van.position.x = x;
      van.visible = state !== 'gone';
      const moving = state === 'leaving' || state === 'back';
      lights.visible = moving;
      off.visible = !moving;
      if (moving) lamps.forEach((m, i) => (m.visible = Math.sin(t * 13 + (i % 2 ? 0 : Math.PI) + (i < 3 ? 0 : Math.PI)) > 0));
      // The cot's rolled out and the back doors open only while field care's being given (told here,
      // every frame, so they're put away again when it ends).
      const caring = state === 'parked' && posed(care, t);
      out1.visible = caring;
      backOpen.visible = caring;
      backClosed.visible = !caring;
      inside.visible = !caring;
    };
  },

  /**
   * A spare power cot (전동 들것): the yellow frame on its black base and four castors, the X legs that
   * raise it, the navy mattress with its back rest up and a pillow, orange straps with black buckles,
   * folding side rails, a folded blanket at the foot, the battery pack and '119' on the foot end.
   * Checked at its side (emsCot): both hands on the rail as it's raised from loading height, the
   * chest strap pulled across from the far side and buckled, the side rail lifted, and lowered again.
   */
  pmStretcher(g, W, _D, _c, _def, _ctx, out) {
    const L = Math.min(W - 0.12, 1.86);
    const Wc = 0.56;
    const cz = -0.06;
    const base = group(g, 0, 0, cz);
    const legs = cotBase(base, L, Wc);
    const tp = cotTop(base, L, Wc);
    const low = 0.45;
    const high = 0.86;
    const setH = (h: number) => {
      tp.top.position.y = h;
      setLegs(legs, L, Wc, h);
    };
    setH(low);
    const work = marker(g, 0, low + 0.03, cz + Wc / 2 + 0.01);
    const at = standAt(g, 0, cz + 0.62, Math.PI, 'emsCot', work);
    out.work = work;
    out.spots = { '*': at };
    let lastH = low;
    out.animate = (t) => {
      const ph = phaseOf(work);
      const s = cotAt(t, ph);
      const h = low + (high - low) * s.lift;
      if (Math.abs(h - lastH) > 0.002) {
        setH(h);
        lastH = h;
      }
      work.position.y = h + 0.03;
      tp.strapAcross.visible = s.strap > 0.6;
      tp.strapLoose.visible = !tp.strapAcross.visible;
      // The near rail (+z) comes up; the far one stays down.
      for (const r of tp.rails) r.rotation.x = r.userData.side > 0 ? 1.45 * (1 - s.rail) : 1.45 * -1;
    };
  },

  /**
   * The oxygen cylinder rack (산소통 거치대): a steel frame on the wall with two chain bars, four tall
   * green medical oxygen cylinders (의료용 산소 on them) with their valves and a status tag each
   * (충전 · 사용중 · 공병), below them portable cylinders in their orange carry bags; the regulator with
   * its pressure gauge and flowmeter on the front one, a '산소 · O₂' sign and '화기엄금'. Checked
   * (tinker) at the regulator, its needle swinging as the valve's cracked.
   */
  pmOxygenRack(g, W, D, _c, _def, _ctx, out) {
    const w = Math.min(W - 0.1, 0.9);
    const zb = -D / 2 + 0.04;
    const grey = '#78909c';
    for (const sx of [-1, 1]) part(g, rbox(0.04, 1.7, 0.04, 0.01), grey, sx * w / 2, 0.85, zb + 0.18);
    part(g, rbox(w + 0.04, 0.04, 0.32, 0.01), grey, 0, 0.04, zb + 0.16);
    for (const y of [0.55, 1.15]) {
      part(g, rbox(w, 0.04, 0.03, 0.01), grey, 0, y, zb + 0.32);
      for (let i = 0; i < 12; i++) part(g, ring(0.012, 0.004), '#9e9e9e', -w / 2 + 0.06 + i * 0.07, y - 0.04, zb + 0.34, { outline: false });
    }
    part(g, rbox(w, 0.04, 0.03, 0.01), grey, 0, 0.55, zb + 0.04);
    const tags = ['충전', '충전', '사용중', '공병'];
    const tagCol = ['#43a047', '#43a047', '#fbc02d', '#e53935'];
    const xs = [-0.3, -0.1, 0.1, 0.3].map((x) => x * (w / 0.9));
    xs.forEach((x, i) => {
      const cz = zb + 0.18;
      part(g, cyl(0.085, 0.085, 1.28, 18), O2, x, 0.72, cz);
      part(g, ball(0.085), O2, x, 1.36, cz).scale.set(1, 0.55, 1);
      part(g, cyl(0.086, 0.086, 0.1, 18), '#ffffff', x, 1.28, cz, { outline: false });
      part(g, cyl(0.03, 0.03, 0.08, 10), CHROME, x, 1.44, cz);
      part(g, rbox(0.06, 0.03, 0.03, 0.01), '#9e9e9e', x + 0.02, 1.46, cz);
      label(g, '의료용 산소', 0.36, 0.06, x, 0.85, cz + 0.087, 'none', '#ffffff', 0, 0).rotation.z = Math.PI / 2;
      part(g, box(0.06, 0.08, 0.004), tagCol[i], x, 1.12, cz + 0.088, { outline: false });
      label(g, tags[i], 0.06, 0.03, x, 1.12, cz + 0.091, 'none', '#ffffff');
    });
    // The regulator on the front right one: its gauge, the flowmeter's glass tube and knob.
    const rx = xs[2];
    const ry = 1.5;
    const rz = zb + 0.26;
    part(g, rbox(0.08, 0.06, 0.08, 0.02), CHROME, rx, ry, rz - 0.04);
    const needle = gauge(g, rx, ry + 0.07, rz + 0.01, 0.045);
    const tube = new THREE.Mesh(cyl(0.012, 0.012, 0.1, 10), CLEAR);
    tube.position.set(rx + 0.07, ry + 0.02, rz);
    g.add(tube);
    const ballF = part(g, ball(0.008), '#e53935', rx + 0.07, ry - 0.01, rz, { outline: false });
    part(g, cyl(0.016, 0.016, 0.02, 10), '#2e7d32', rx + 0.07, ry - 0.05, rz + 0.01, { rx: Math.PI / 2 });
    // Portable cylinders in their carry bags in front.
    for (const x of [-0.25, 0.0]) {
      part(g, rbox(0.14, 0.42, 0.14, 0.04), ORANGE, x * (w / 0.9), 0.27, zb + 0.4);
      part(g, cyl(0.025, 0.025, 0.06, 10), CHROME, x * (w / 0.9), 0.51, zb + 0.4);
      label(g, 'O₂', 0.08, 0.06, x * (w / 0.9), 0.3, zb + 0.472, 'none', '#ffffff');
    }
    // The signs.
    part(g, rbox(0.5, 0.18, 0.012, 0.006), '#2e7d32', 0, 1.82, zb + 0.18);
    label(g, '산소 · O₂', 0.46, 0.14, 0, 1.82, zb + 0.188, '#2e7d32', '#ffffff');
    label(g, '화기엄금', 0.24, 0.08, w / 2 - 0.05, 1.62, zb + 0.2, '#d32f2f', '#ffffff');
    const valve = marker(g, rx, ry + 0.02, rz + 0.06);
    out.work = valve;
    out.spots = { '*': standAt(g, rx, rz + 0.5, Math.PI, 'tinker', valve) };
    out.animate = (t) => {
      needle.rotation.z = -1.4 + 0.25 * Math.sin(t * 0.6) + 0.04 * Math.sin(t * 7);
      ballF.position.y = ry - 0.01 + 0.03 * (0.5 + 0.5 * Math.sin(t * 0.8));
    };
  },

  /**
   * The decontamination sink (장비 세척·소독대): a stainless unit with two deep basins and a drainer,
   * the tall pre-rinse spray on its spring, a foot pedal; the splashback in white tile, '감염관리 · 오염
   * 장비 세척' and the steps (세척 → 소독 → 건조) over it, a drying rack of washed splints and masks, the
   * disinfectant and the soap dispensers, a yellow 의료폐기물 box beside it. Used (scrub): the water
   * running into the left basin and a bag-valve mask being scrubbed in the suds.
   */
  pmDeconSink(g, W, D, _c, _def, _ctx, out) {
    const w = W - 0.12;
    const d = 0.62;
    const zb = -D / 2 + 0.03;
    const z = zb + d / 2;
    const top = 0.9;
    const ss = '#c5ccd2';
    part(g, rbox(w, top - 0.12, d - 0.04, 0.02), ss, 0, (top - 0.12) / 2 + 0.1, z);
    for (const sx of [-1, 1]) part(g, rbox(0.04, 0.1, 0.04, 0.01), shade(ss, 0.8), sx * (w / 2 - 0.05), 0.05, z + d / 2 - 0.08);
    for (let i = 0; i < 3; i++) part(g, box(0.004, 0.6, 0.004), shade(ss, 0.8), -w / 2 + w * (0.33 + i * 0.17), 0.45, z + d / 2 - 0.02, { outline: false });
    // The top with two basins and a drainer.
    part(g, rbox(w, 0.04, d, 0.01), '#dfe4e8', 0, top, z);
    const basins = [-0.45, 0.05].map((x) => x * (w / 1.88));
    for (const bx of basins) {
      part(g, box(0.46, 0.012, 0.42), '#8a959e', bx, top + 0.015, z + 0.02, { outline: false });
      part(g, box(0.48, 0.03, 0.02), '#eef1f3', bx, top + 0.03, z + 0.24, { outline: false });
      part(g, cyl(0.03, 0.03, 0.004, 14), '#546e7a', bx, top + 0.023, z + 0.02, { outline: false });
    }
    for (let i = 0; i < 7; i++) part(g, box(0.38, 0.004, 0.012), '#b0bec5', w / 2 - 0.32, top + 0.024, z - 0.14 + i * 0.05, { outline: false });
    // The splashback and its signs.
    const back = litPaint('pmTile', 128, 64, (x) => {
      x.fillStyle = '#ffffff';
      x.fillRect(0, 0, 128, 64);
      x.strokeStyle = '#cfd8dc';
      for (let i = 0; i <= 128; i += 16) {
        x.beginPath();
        x.moveTo(i, 0);
        x.lineTo(i, 64);
        x.stroke();
      }
      for (let i = 0; i <= 64; i += 16) {
        x.beginPath();
        x.moveTo(0, i);
        x.lineTo(128, i);
        x.stroke();
      }
    });
    part(g, box(w, 0.9, 0.02), '#ffffff', 0, top + 0.47, zb + 0.01, { material: back, outline: false });
    part(g, rbox(0.95, 0.12, 0.012, 0.004), '#00796b', -0.2, top + 0.83, zb + 0.025);
    label(g, '감염관리 · 오염 장비 세척', 0.9, 0.1, -0.2, top + 0.83, zb + 0.033, '#00796b', '#ffffff');
    label(g, '① 세척  →  ② 소독  →  ③ 건조', 0.8, 0.07, -0.2, top + 0.7, zb + 0.022, '#ffffff', '#263238', 0, 0, false);
    // The drying rack over the drainer: splints and masks.
    const rk = w / 2 - 0.32;
    part(g, rbox(0.42, 0.02, 0.18, 0.006), CHROME, rk, top + 0.58, zb + 0.1);
    for (const sx of [-1, 1]) rod(g, new THREE.Vector3(rk + sx * 0.2, top + 0.58, zb + 0.18), new THREE.Vector3(rk + sx * 0.2, top + 0.58, zb + 0.02), 0.008, CHROME);
    for (let i = 0; i < 3; i++) part(g, rbox(0.06, 0.24, 0.02, 0.008), '#ff7043', rk - 0.14 + i * 0.07, top + 0.45, zb + 0.12);
    pocketMask(g, rk + 0.12, top + 0.4, zb + 0.13, 0).rotation.x = Math.PI / 2;
    part(g, ball(0.06), '#7e57c2', rk + 0.12, top + 0.06, z - 0.05).scale.set(1.6, 0.7, 0.8);
    // The faucet and the pre-rinse spray on its spring.
    const fx = basins[0];
    part(g, cyl(0.025, 0.025, 0.8, 10), CHROME, fx, top + 0.4, zb + 0.06);
    rod(g, new THREE.Vector3(fx, top + 0.78, zb + 0.06), new THREE.Vector3(fx, top + 0.78, zb + 0.28), 0.014, CHROME);
    for (let i = 0; i < 8; i++) part(g, ring(0.025, 0.005), '#9e9e9e', fx, top + 0.42 + i * 0.045, zb + 0.28, { rx: Math.PI / 2, outline: false });
    part(g, cyl(0.025, 0.035, 0.1, 12), '#37474f', fx, top + 0.37, zb + 0.28);
    // The dispensers and the waste box.
    part(g, rbox(0.1, 0.2, 0.08, 0.02), '#ffffff', basins[1] + 0.2, top + 0.45, zb + 0.06);
    label(g, '소독제', 0.09, 0.03, basins[1] + 0.2, top + 0.46, zb + 0.101, 'none', '#00796b');
    for (let i = 0; i < 2; i++) {
      part(g, cyl(0.03, 0.035, 0.2, 12), i ? '#4fc3f7' : '#ffffff', basins[1] - 0.15 + i * 0.08, top + 0.12, zb + 0.08);
      part(g, rbox(0.03, 0.04, 0.05, 0.01), '#e53935', basins[1] - 0.15 + i * 0.08, top + 0.24, zb + 0.08);
    }
    part(g, rbox(0.3, 0.36, 0.26, 0.02), '#fdd835', -w / 2 + 0.17, 0.18, D / 2 - 0.16);
    label(g, '의료폐기물', 0.26, 0.06, -w / 2 + 0.17, 0.26, D / 2 - 0.028, 'none', '#b71c1c');
    part(g, cyl(0.035, 0.035, 0.004, 3), '#b71c1c', -w / 2 + 0.17, 0.15, D / 2 - 0.028, { rx: Math.PI / 2, outline: false });
    // The foot pedal.
    part(g, rbox(0.16, 0.03, 0.12, 0.01), '#546e7a', fx, 0.015, z + d / 2 + 0.06);
    // Running and being scrubbed: the stream, suds and the mask in the basin.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const stream = new THREE.Mesh(cyl(0.012, 0.018, 0.3, 10), WATER);
    stream.position.set(fx, top + 0.17, zb + 0.28);
    use.add(stream);
    const suds: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) suds.push(part(use, ball(0.03 + (i % 3) * 0.01), '#ffffff', fx + Math.cos(i) * 0.12, top + 0.05, z + 0.02 + Math.sin(i * 1.7) * 0.1, { outline: false }));
    const bvm = group(use, fx, top + 0.06, z + 0.04);
    part(bvm, ball(0.06), '#7e57c2', 0, 0, 0).scale.set(1.6, 0.7, 0.8);
    pocketMask(bvm, 0.13, 0.0, 0, Math.PI / 2);
    const work = marker(g, fx, top + 0.08, z + 0.06);
    out.work = work;
    out.spots = { '*': standAt(g, fx, z + d / 2 + 0.24, Math.PI, 'scrub', work) };
    out.animate = (t) => {
      bvm.rotation.y = 0.25 * Math.sin(t * 2.6);
      suds.forEach((m, i) => m.scale.setScalar(0.8 + 0.3 * Math.sin(t * 3 + i)));
    };
  },

  /**
   * The public AED cabinet (자동심장충격기 보관함) on the wall: the green sign over it with the heart
   * and the bolt, a white steel cabinet with its glass door (an alarm lamp on top), the green AED
   * inside on its hook with its status light blinking green, the 사용 방법 poster under it (전원 →
   * 패드 → 분석 → 충격) and the daily check card. Checked (tinker): the door open, the AED's light and
   * the pads' date looked at, ticked on the card.
   */
  pmAedCabinet(g, W, D, _c, _def, ctx, out) {
    const z = -D / 2 + (ctx.againstWall ? 0.03 : 0.2);
    const y = ctx.againstWall ? 1.2 : 1.1;
    if (!ctx.againstWall) {
      part(g, cyl(0.03, 0.03, 1.6, 10), STEEL, 0, 0.8, z - 0.05);
      part(g, cyl(0.25, 0.25, 0.03, 16), STEEL, 0, 0.015, z - 0.05);
    }
    const cw = Math.min(W - 0.4, 0.46);
    const ch = 0.56;
    const cd = 0.2;
    const cz = z + cd / 2;
    part(g, rbox(cw, ch, cd, 0.02), '#fafafa', 0, y, cz);
    part(g, box(cw - 0.04, ch - 0.04, 0.01), '#cfd8dc', 0, y, z + 0.01, { outline: false });
    // The AED inside: green, its handle, its status light.
    const aed = group(g, 0, y - 0.04, cz - 0.02);
    part(aed, rbox(0.3, 0.3, 0.1, 0.03), '#43a047', 0, 0, 0);
    part(aed, rbox(0.14, 0.04, 0.03, 0.012), '#2e7d32', 0, 0.17, 0);
    part(aed, rbox(0.12, 0.08, 0.004, 0.004), BLACK, -0.05, 0.05, 0.051, { outline: false });
    label(aed, 'AED', 0.12, 0.05, 0.05, -0.06, 0.052, 'none', '#ffffff');
    // Its status light: steady at rest, blinking while it's checked.
    const idle = new THREE.Group();
    const use = new THREE.Group();
    aed.add(idle, use);
    out.idle = idle;
    out.inUse = use;
    part(idle, ball(0.012), '#00e676', 0.1, 0.09, 0.05, { outline: false, material: glow('#69f0ae') });
    const status = part(use, ball(0.012), '#00e676', 0.1, 0.09, 0.05, { outline: false, material: glow('#69f0ae') });
    // The glass door, hung on the left (it swings open while it's checked).
    const hinge = group(g, -cw / 2, y, cz + cd / 2);
    hinge.userData.swing = -1;
    part(hinge, rbox(cw, ch, 0.02, 0.01), '#ffffff', cw / 2, 0, 0.0);
    const pane = new THREE.Mesh(box(cw - 0.08, ch - 0.1, 0.022), GLASS);
    pane.position.set(cw / 2, 0, 0);
    hinge.add(pane);
    part(hinge, rbox(0.03, 0.1, 0.03, 0.01), '#9e9e9e', cw - 0.04, 0, 0.02);
    out.doors = [hinge];
    // The alarm lamp on top, the green sign above.
    part(g, cyl(0.035, 0.035, 0.04, 12), '#e53935', 0, y + ch / 2 + 0.02, cz);
    const sign = painted('pmAedSign', 192, 96, (x) => {
      x.fillStyle = '#00a651';
      x.fillRect(0, 0, 192, 96);
      x.fillStyle = '#ffffff';
      x.beginPath();
      x.moveTo(48, 78);
      x.bezierCurveTo(10, 50, 14, 14, 48, 28);
      x.bezierCurveTo(82, 14, 86, 50, 48, 78);
      x.fill();
      x.fillStyle = '#00a651';
      x.beginPath();
      x.moveTo(52, 30);
      x.lineTo(40, 52);
      x.lineTo(50, 52);
      x.lineTo(44, 70);
      x.lineTo(60, 46);
      x.lineTo(50, 46);
      x.closePath();
      x.fill();
      x.fillStyle = '#ffffff';
      x.font = `bold 18px ${FONT}`;
      x.fillText('자동심장', 96, 38);
      x.fillText('충격기', 96, 60);
      x.font = `bold 15px ${FONT}`;
      x.fillText('AED', 96, 82);
    });
    sheet(g, sign, 0.46, 0.23, 0, y + ch / 2 + 0.2, z + 0.012);
    // The how-to poster and the check card under it.
    const howTo = painted('pmAedHow', 128, 160, (x) => {
      x.fillStyle = '#ffffff';
      x.fillRect(0, 0, 128, 160);
      x.fillStyle = '#00a651';
      x.fillRect(0, 0, 128, 22);
      x.fillStyle = '#ffffff';
      x.font = `bold 13px ${FONT}`;
      x.fillText('AED 사용 방법', 18, 16);
      x.fillStyle = '#263238';
      x.font = `12px ${FONT}`;
      ['① 전원 켜기', '② 패드 붙이기', '③ 심전도 분석', '④ 충격 버튼', '⑤ 가슴 압박'].forEach((s, i) => x.fillText(s, 10, 44 + i * 23));
    });
    sheet(g, howTo, 0.22, 0.28, -0.12, y - ch / 2 - 0.2, z + 0.008);
    part(g, rbox(0.14, 0.2, 0.008, 0.004), '#ffe082', 0.16, y - ch / 2 - 0.18, z + 0.008);
    label(g, '점검일지', 0.12, 0.035, 0.16, y - ch / 2 - 0.1, z + 0.014, 'none', '#5d4037');
    for (let i = 0; i < 5; i++) part(g, box(0.1, 0.004, 0.002), '#8d6e63', 0.16, y - ch / 2 - 0.15 - i * 0.022, z + 0.014, { outline: false });
    const work = marker(g, 0, y - 0.02, cz + 0.12);
    out.work = work;
    out.spots = { '*': standAt(g, 0, work.position.z + 0.42, Math.PI, 'tinker', work) };
    out.animate = (t) => {
      status.visible = Math.sin(t * 4) > 0;
    };
  },

  /**
   * The 구급 활동 일지 board: a whiteboard in an aluminium frame, '구급 활동 일지' and the station on its
   * red header by the star of life, today's runs in a table (시각 · 유형 · 장소 · 이송 병원 · 대원 —
   * 심정지 at 06:12 shocked back, a car crash, an elder's fall, a 복통 treated on the spot, breathing
   * trouble), the month's count and the 심정지 소생 number, 구급1's magnet at 대기, the ERs' beds;
   * a marker tray. Written up stood at it.
   */
  pmLogBoard(g, W, D, _c, _def, ctx, out) {
    const bw = W - 0.2;
    const bh = 1.0;
    const z = -D / 2 + (ctx.againstWall ? 0.03 : 0.22);
    const y = ctx.againstWall ? 1.45 : 1.25;
    if (!ctx.againstWall)
      for (const sx of [-1, 1]) {
        part(g, cyl(0.025, 0.025, y + 0.3, 8), STEEL, sx * (bw / 2 + 0.02), (y + 0.3) / 2, z);
        part(g, rbox(0.06, 0.04, 0.6, 0.015), STEEL, sx * (bw / 2 + 0.02), 0.02, z);
      }
    part(g, rbox(bw + 0.06, bh + 0.06, 0.04, 0.012), '#b0b4b8', 0, y, z);
    sheet(g, logTex(), bw, bh, 0, y, z + 0.022);
    part(g, rbox(bw * 0.5, 0.025, 0.07, 0.008), '#b0b4b8', -0.2, y - bh / 2 - 0.02, z + 0.04);
    for (const [i, col] of ['#d32f2f', '#1565c0', '#212121'].entries()) part(g, cyl(0.009, 0.009, 0.12, 8), col, -0.35 + i * 0.07, y - bh / 2 - 0.005, z + 0.045, { rz: Math.PI / 2, outline: false });
    // 구급1's magnet.
    part(g, cyl(0.025, 0.025, 0.012, 14), '#e53935', bw / 2 - 0.12, y - bh / 2 + 0.1, z + 0.03, { rx: Math.PI / 2 });
    const work = marker(g, -0.1, y + 0.05, z + 0.03);
    out.work = work;
    out.spots = { '*': standAt(g, -0.1, z + 0.5, Math.PI, 'board', work) };
  },
};
