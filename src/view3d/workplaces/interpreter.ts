import * as THREE from 'three';
import type { HeldTool } from '../handTool';
import { boardGrip } from '../handTool';
import { marker, rod, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, label, painted, picture, text } from './doctor';
import { BO, BOOTH_SWING, GS, MT, NC, PC, PEN_UP, STAMP_UP, TB, TD, ipNow, ipPhase, termSlot, wrap } from './interpreterMotion';
import type { IpMotion, IpNow, IpTool } from './interpreterMotion';
import { vroidFigure, type FigureOptions } from './vroidFigure';

/**
 * The 통번역 사무소 drawn as itself (2026-11-01), the invented firm 건넴말. Translators' desks with the source and the target side by
 * side, the target filling as it's typed; a wall of dictionaries with a writing ledge; a board of terms; simultaneous booths with
 * a glass front looking over the meeting table; consecutive interpreting at that table, the pad filling with signs; a notary
 * counter where the seal really comes down on the paper; a practice corner with a recorder. Foreign words are an invented
 * script, its languages invented too (벨로아어, 루메어); no country, party, person or company is real.
 * Everything that moves follows interpreterMotion.ts.
 */

const CO = '건넴말';
const LANG_A = '벨로아어';
const LANG_B = '루메어';
const WALNUT = '#7a5a3f';
const OAK = '#c9a87e';
const CREAM = '#efe6d4';
const GREY = '#8f979c';
const GREY_D = '#566066';
const GRAPHITE = '#2f363c';
const TEAL = '#17706a';
const TEAL_L = '#bfe3dd';
const MUSTARD = '#d9a520';
const RED = '#d32f2f';
const SEAL = '#c62828';
const GREEN = '#2e7d32';
const PAPER = '#fbfaf5';
const PANEL = '#6f7a80';
const SKIN = '#f1c9a5';
const INK = '#1c2024';
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UP = v3(0, 1, 0);
const tmp = new THREE.Vector3();
type V = readonly [number, number, number];
type Ctx2 = CanvasRenderingContext2D;
const q = (x: number | undefined, steps = 20) => Math.round((x ?? 0) * steps);
const pos = (r: number) => Math.max(0.5, r);
const clamp01 = (x: number | undefined) => THREE.MathUtils.clamp(x ?? 0, 0, 1);
const seedOf = (g: THREE.Object3D) => {
  const p = g.getWorldPosition(tmp);
  return Math.floor(Math.abs(p.x) * 3 + Math.abs(p.z) * 7);
};

// ---------------------------------------------------------------------------------------------
// When a booth is live, a meeting is on at the table it looks over.

const MEET = { liveAt: -1e9 };
const meetingOn = (t: number) => Math.abs(t - MEET.liveAt) < 1.5;

// ---------------------------------------------------------------------------------------------
// The invented script, and the words of the day.

const hash = (a: number, b: number) => {
  const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
/** A run of an invented script: a few strokes to a letter, gaps for words. The same seed always writes the same thing. */
function glyphs(c: Ctx2, x: number, y: number, w: number, size: number, seed: number, color: string) {
  c.strokeStyle = color;
  c.lineWidth = Math.max(1, size * 0.12);
  c.lineCap = 'round';
  const s = pos(size);
  const n = Math.min(90, Math.floor(Math.max(0, w) / (s * 0.82)));
  c.beginPath();
  for (let i = 0; i < n; i++) {
    if (hash(seed, i * 3.1) < 0.17) continue;
    const X = x + i * s * 0.82;
    const top = y - s * 0.4;
    const m = 2 + Math.floor(hash(seed + 1, i) * 2.5);
    for (let k = 0; k < m; k++) {
      const a = hash(seed + k + 2, i);
      const b = hash(seed + k + 7, i);
      const d = hash(seed + k + 11, i);
      const e = hash(seed + k + 13, i);
      c.moveTo(X + a * s * 0.62, top + b * s * 0.8);
      if (k % 3 === 2) c.arc(X + a * s * 0.62, top + b * s * 0.8, s * 0.1, 0, 5);
      else c.lineTo(X + d * s * 0.62, top + e * s * 0.8);
    }
  }
  c.stroke();
}
const DOCS: ReadonlyArray<{ title: string; target: readonly string[] }> = [
  { title: '정수기 사용 설명서', target: ['전원을 끈 뒤 덮개를 여십시오.', '필터는 석 달마다 교체합니다.', '경고음이 울리면 바로 멈추십시오.', '서비스 센터에 문의하십시오.'] },
  { title: '납품 계약서 제3조', target: ['을은 약정한 날까지 납품한다.', '늦어지면 지체 보상금을 낸다.', '불량품은 즉시 교환한다.', '분쟁은 합의로 해결한다.'] },
  { title: '소설 1장 초벌', target: ['강은 그날 처음으로 얼었다.', '소녀는 맨발로 그 위에 섰다.', '"건너가도 돼요?" 하고 물었다.', '아무도 대답하지 않았다.'] },
  { title: '국제 학회 발표문', target: ['오늘은 물의 순환을 말씀드립니다.', '첫째, 측정값은 3.2도 올랐습니다.', '둘째, 표본은 마흔두 곳입니다.', '끝으로 질문을 받겠습니다.'] },
];
const TERMS: ReadonlyArray<string> = ['유량 제어 밸브', '지체 보상금', '부속 합의서', '접합부', '예비 부품', '공증인', '점도', '하자 보수', '잠금 장치', '기조연설', '출처 표기', '시차 적응'];
const NEW_TERMS: ReadonlyArray<string> = ['인수 확인서', '비상 정지', '수용 능력', '동시 통역'];

function paperCanvas(c: Ctx2, w: number, h: number, bg = PAPER) {
  c.fillStyle = bg;
  c.fillRect(0, 0, w, h);
}

// ---------------------------------------------------------------------------------------------
// Small parts.

function group(parent: THREE.Object3D, x = 0, y = 0, z = 0, ry = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}
function at(m: THREE.Object3D, p: V | null | undefined, home?: V | null) {
  const w = p ?? home;
  m.visible = !!w;
  if (w) m.position.set(w[0], w[1], w[2]);
}
function ownLit(g: THREE.Object3D, geom: THREE.BufferGeometry, color: string, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color }));
  m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
const setLit = (m: THREE.Mesh, c: string) => (m.material as THREE.MeshBasicMaterial).color.set(c);
function haze(g: THREE.Object3D, geom: THREE.BufferGeometry, color: string, opacity: number, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
/** A plane whose canvas is repainted only when its key changes. */
function liveScreen(g: THREE.Object3D, w: number, h: number, px: number, py: number, x: number, y: number, z: number, ry = 0, rx = 0) {
  const mat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.userData.ownGeometry = mesh.userData.ownMaterial = true;
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, 0, 'YXZ');
  g.add(mesh);
  let tex: THREE.CanvasTexture | null = null;
  let ctx: Ctx2 | null = null;
  let last = '';
  return {
    mesh,
    draw(key: string, paint: (c: Ctx2) => void) {
      if (typeof document === 'undefined') return;
      if (!tex) {
        const can = document.createElement('canvas');
        can.width = px;
        can.height = py;
        ctx = can.getContext('2d');
        tex = new THREE.CanvasTexture(can);
        tex.colorSpace = THREE.SRGBColorSpace;
        mat.map = tex;
        mat.needsUpdate = true;
      }
      if (key !== last && ctx) {
        last = key;
        paint(ctx);
        tex.needsUpdate = true;
      }
    },
  };
}
function standAt(g: THREE.Object3D, motion: IpMotion, x = 0, z = 0.6): Spot {
  const s = spot(g, 'stand', x, 0, z, Math.PI);
  s.motion = motion;
  return s;
}
function seatAt(g: THREE.Object3D, motion: IpMotion, seat: V, yaw = Math.PI): Spot {
  const s = spot(g, 'sit', seat[0], seat[1], seat[2], yaw, 0);
  s.motion = motion;
  return s;
}
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
function nowAt(spots: Record<string, Spot>, t: number): string | null {
  let best: string | null = null;
  for (const [k, s] of Object.entries(spots)) if (k !== '*' && Math.abs(t - posedAt(s)) < 0.6 && (best === null || posedAt(s) > posedAt(spots[best]))) best = k;
  return best;
}
/** Every frame: which use is going on and where its script has got to; what the script says is in the hand goes in the hand. */
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, tools: Partial<Record<IpTool, HeldTool>>, show: (now: string | null, N: IpNow | null, t: number, H: number) => void) {
  out.spots = spots;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const H = (sp?.at.userData.height as number | undefined) ?? 1.6;
    const N = sp ? ipNow(sp.motion as IpMotion, t, ipPhase(g.getWorldPosition(tmp)), H) : null;
    show(now, N, t, H);
    for (const s of Object.values(spots)) s.held = s === sp && N?.tool ? (tools[N.tool] ?? null) : null;
  };
}
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
/** An office chair; `yaw` is the way the sitter faces (π, into the piece, as at a desk). */
function chair(g: THREE.Object3D, seat: V, color = TEAL, yaw = Math.PI) {
  const c = group(g, seat[0], 0, seat[2], yaw - Math.PI);
  const T = seat[1];
  part(c, rbox(0.44, 0.07, 0.42, 0.03), color, 0, T - 0.035, 0);
  part(c, cyl(0.024, 0.03, T - 0.14, 10), CHROME, 0, (T - 0.08) / 2 + 0.06, 0, { outline: false });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    rod(c, v3(0, 0.1, 0), v3(Math.cos(a) * 0.23, 0.05, Math.sin(a) * 0.23), 0.014, BLACK);
    part(c, ball(0.024), BLACK, Math.cos(a) * 0.23, 0.026, Math.sin(a) * 0.23, { outline: false });
  }
  part(c, rbox(0.4, 0.42, 0.06, 0.04), color, 0, T + 0.3, 0.23, { rx: 0.1 });
}
/** A monitor on a stem; the screen's plane stands in front of its case. */
function monitor(g: THREE.Object3D, p: V, w: number, h: number, T: number, px: number, py: number, ry = 0) {
  const m = group(g, p[0], 0, p[2], ry);
  part(m, box(w + 0.03, h + 0.03, 0.025), BLACK, 0, p[1], -0.016, { outline: false });
  const stem = Math.max(0.02, p[1] - T - h / 2 + 0.06);
  part(m, cyl(0.02, 0.026, stem, 10), GREY_D, 0, T + stem / 2, -0.05, { outline: false });
  part(m, rbox(0.22, 0.016, 0.15, 0.006), GREY_D, 0, T + 0.008, -0.05, { outline: false });
  return liveScreen(m, w, h, px, py, 0, p[1], 0);
}
function keyboard(g: THREE.Object3D, p: V, w = 0.3, d = 0.12) {
  part(g, rbox(w, 0.018, d, 0.006), GRAPHITE, p[0], p[1] - 0.022, p[2], { outline: false });
  for (let j = 0; j < 4; j++) part(g, box(w - 0.03, 0.002, 0.012), GREY, p[0], p[1] - 0.012, p[2] - d / 2 + 0.02 + j * 0.026, { outline: false });
}
function mouse(g: THREE.Object3D, p: V, T: number) {
  part(g, rbox(0.06, 0.03, 0.1, 0.012), GRAPHITE, p[0], T + 0.015, p[2], { outline: false });
}
/** An interpreter's headset, both ears and a boom, round the group's origin at the head's centre, the face on +z. */
function headset(g: THREE.Object3D, color = '#26262e'): THREE.Group {
  const h = group(g);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.122, 0.008, 8, 22, Math.PI), new THREE.MeshToonMaterial({ color }));
  band.userData.ownGeometry = band.userData.ownMaterial = true;
  h.add(band);
  for (const sx of [-1, 1]) part(h, cyl(0.044, 0.044, 0.026, 14), color, sx * 0.122, 0, 0, { rz: Math.PI / 2 });
  rod(h, v3(0.128, -0.02, 0.01), v3(0.06, -0.1, 0.112), 0.004, color);
  part(h, ball(0.012), '#111114', 0.056, -0.104, 0.116, { outline: false });
  return h;
}
/** The worn headset on the dweller's head, wherever the script has them; the parked one when not. */
function wearing(worn: THREE.Object3D, parked: THREE.Object3D | null, on: boolean, N: IpNow | null, H: number) {
  worn.visible = on && !!N;
  if (parked) parked.visible = !worn.visible;
  if (!worn.visible || !N) return;
  const lean = N.key.lean ?? 0.05;
  const reach = (N.st.sit ? 0.44 : 0.46) * H;
  const y = N.st.sit ? N.st.y + reach * Math.cos(lean) : 0.46 * H + reach * Math.cos(lean);
  worn.position.set(N.st.x + Math.sin(N.st.yaw) * reach * Math.sin(lean), y, N.st.z + Math.cos(N.st.yaw) * reach * Math.sin(lean));
  worn.rotation.y = N.st.yaw;
  worn.scale.setScalar(H / 1.6);
}
function parkedHeadset(g: THREE.Object3D, x: number, T: number, z: number): THREE.Group {
  const stand = group(g, x, T, z);
  part(stand, cyl(0.04, 0.045, 0.01, 12), BLACK, 0, 0.005, 0, { outline: false });
  rod(stand, v3(0, 0, 0), v3(0, 0.2, 0), 0.006, BLACK);
  const p = headset(stand);
  p.position.set(0, 0.13, 0);
  p.scale.setScalar(0.66);
  p.rotation.y = 0.8;
  return p;
}
const mug = (g: THREE.Object3D, x: number, T: number, z: number, c = '#d7ccc8') => part(g, cyl(0.038, 0.034, 0.085, 14), c, x, T + 0.043, z);
/** A desk lamp, its shade lit. */
function deskLamp(g: THREE.Object3D, x: number, T: number, z: number) {
  part(g, cyl(0.05, 0.055, 0.016, 12), GRAPHITE, x, T + 0.008, z, { outline: false });
  rod(g, v3(x, T, z), v3(x + 0.03, T + 0.26, z + 0.02), 0.006, GRAPHITE);
  part(g, cyl(0.03, 0.06, 0.07, 12), TEAL, x + 0.03, T + 0.28, z + 0.05, { rx: 0.5 });
  ownLit(g, ball(0.024), '#fff3c4', x + 0.03, T + 0.25, z + 0.07);
}
/** A book lying flat, spine out. */
const flatBook = (g: THREE.Object3D, x: number, y: number, z: number, c: string, ry = 0) => part(g, box(0.2, 0.035, 0.27), c, x, y + 0.018, z, { ry, outline: true });

// ---------------------------------------------------------------------------------------------
// Tools designed for the hand. Each has its origin at the grip and is named for the probe.

const DOWN_IN = v3(-0.12, -1, -0.28).normalize();
const DOWN_OUT = v3(0.12, -1, 0.28).normalize();
/** `facingOut`: for someone facing +z (in a booth, at the far side of a table); the tip comes back towards them the other way round. */
function penTool(g: THREE.Object3D, color = '#2f6fd0', facingOut = false): { root: THREE.Group; held: HeldTool } {
  const root = group(g);
  root.name = 'ipPen';
  const inner = group(root);
  const dir = facingOut ? DOWN_OUT : DOWN_IN;
  inner.quaternion.setFromUnitVectors(v3(0, -1, 0), dir);
  part(inner, cyl(0.006, 0.006, PEN_UP * 0.78 + 0.05, 10), color, 0, (0.05 - PEN_UP * 0.78) / 2, 0, { outline: false });
  part(inner, cyl(0.006, 0.002, PEN_UP * 0.22, 10), BLACK, 0, -PEN_UP * 0.89, 0, { outline: false });
  return { root, held: { tool: root, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: dir.clone(), shape: 'pen', radius: 0.012, writes: PEN_UP } } } };
}
/** What's carried flat on the left forearm: an open dictionary, a script on a board. */
const FLAT_LEFT: HeldTool['grips'] = { left: boardGrip(0.6) };
function scriptTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'ipScript';
  const tilt = group(root);
  tilt.rotation.x = -0.6;
  part(tilt, rbox(0.24, 0.32, 0.01, 0.006), '#8d6e4f', 0, 0, 0, { outline: false });
  part(tilt, box(0.09, 0.022, 0.012), CHROME, 0, 0.15, 0.008, { outline: false });
  const screen = liveScreen(tilt, 0.215, 0.285, 240, 318, 0, -0.008, 0.007);
  return { root, screen, held: { tool: root, lead: 'left', grips: FLAT_LEFT } as HeldTool };
}
function paintScript(c: Ctx2, title: string, hi: number, pos01: number) {
  paperCanvas(c, 240, 318);
  text(c, title, 120, 22, 17, TEAL, 'center');
  for (let i = 0; i < 8; i++) {
    const y = 56 + i * 32;
    if (i === Math.floor(clamp01(pos01) * 7.99)) {
      c.fillStyle = '#ffe9a8';
      c.fillRect(10, y - 13, 220, 26);
    }
    glyphs(c, 14, y, 208, 16, 40 + i, INK);
  }
  if (hi > 0.05) {
    c.globalAlpha = clamp01(hi);
    c.strokeStyle = RED;
    c.lineWidth = 3;
    c.strokeRect(12, 56 + 3 * 32 - 14, 214, 28);
    text(c, '숫자 주의!', 170, 300, 15, RED, 'center');
    c.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------------------------------------
// Other people: drawn, played by VRoid bodies when they've come.

interface Fig {
  root: THREE.Group;
  head: THREE.Group;
  armL(to: THREE.Vector3 | null): void;
  armR(to: THREE.Vector3 | null): void;
  opts: FigureOptions;
}
function person(parent: THREE.Object3D, top: string, bottom: string, hair: string, x: number, z: number, ry: number, gender: 'female' | 'male', seat?: number, seed?: number): Fig {
  const root = group(parent, x, 0, z, ry);
  const sitting = seat !== undefined;
  const base = sitting ? seat + 0.07 - 0.88 : 0;
  if (sitting) {
    for (const sx of [-1, 1]) {
      const ankle = v3(sx * 0.09, 0.08, 0.42);
      const knee = v3(sx * 0.09, seat + 0.03, 0.3);
      rod(root, v3(sx * 0.09, seat + 0.08, -0.08), knee, 0.056, bottom);
      rod(root, knee, ankle, 0.045, bottom);
      part(root, rbox(0.09, 0.07, 0.2, 0.03), '#37474f', ankle.x, ankle.y - 0.045, ankle.z + 0.04);
    }
    part(root, rbox(0.3, 0.17, 0.2, 0.06), bottom, 0, seat + 0.08, -0.08);
  } else {
    for (const sx of [-1, 1]) {
      rod(root, v3(sx * 0.085, 0.84, 0), v3(sx * 0.09, 0.08, 0.01), 0.056, bottom);
      part(root, rbox(0.09, 0.07, 0.2, 0.03), '#37474f', sx * 0.09, 0.035, 0.04);
    }
    part(root, rbox(0.3, 0.17, 0.2, 0.06), bottom, 0, 0.88, 0);
  }
  const dz = sitting ? -0.08 : 0;
  part(root, rbox(0.34, 0.46, 0.21, 0.08), top, 0, base + 1.11, dz);
  part(root, cyl(0.045, 0.05, 0.08, 10), SKIN, 0, base + 1.37, dz, { outline: false });
  const head = group(root, 0, base + 1.51, dz);
  part(head, ball(0.112), SKIN, 0, 0, 0);
  for (const sx of [-1, 1]) part(head, ball(0.012), '#2b2b30', sx * 0.04, 0, 0.104, { outline: false });
  part(head, ball(0.118), hair, 0, 0.03, -0.03);
  const arm = (sx: number) => {
    const shoulder = v3(sx * 0.2, base + 1.31, dz);
    const rest = sitting ? v3(sx * 0.11, seat + 0.14, 0.2) : v3(sx * 0.23, 0.82, 0.05);
    const upper = limb(root, 0.042, top);
    const lower = limb(root, 0.035, SKIN);
    const hand = part(root, ball(0.036), SKIN, 0, 0, 0, { outline: false });
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
      elbow.copy(shoulder).addScaledVector(d, a * cosA).addScaledVector(bend, a * Math.sqrt(Math.max(0, 1 - cosA * cosA)));
      upper(shoulder, elbow);
      lower(elbow, loc);
      hand.position.copy(loc);
    };
  };
  const armL = arm(1);
  const armR = arm(-1);
  armL(null);
  armR(null);
  const opts: FigureOptions = { gender, seat, seed };
  const f = vroidFigure({ root, head, armL, armR }, opts);
  root.visible = false;
  return { ...f, opts };
}
function lazy(make: () => Fig) {
  let f: Fig | null = null;
  return { get: () => (f ??= make()), hide: () => void (f && (f.root.visible = false)) };
}
const nodHead = (F: Fig, v: number) => {
  F.opts.nod = v;
  F.head.rotation.x = v;
};

// =============================================================================================
// What a desk's screen shows: the source on the left, the target on the right.

interface DeskView {
  i: number;
  form: number;
  stuck: number;
  page: number;
  checked: number;
  saved: number;
  marks: number;
  fixes: number;
  reading: number;
  t: number;
}
function paintDesk(c: Ctx2, w: number, h: number, v: DeskView) {
  const doc = DOCS[wrap(v.i, DOCS.length)];
  const L = doc.target;
  paperCanvas(c, w, h, '#eef1f0');
  c.fillStyle = TEAL;
  c.fillRect(0, 0, w, 24);
  text(c, `${CO} 번역기 · ${doc.title}`, 8, 12, 13, '#ffffff');
  const left = 8;
  const mid = w / 2;
  const paneW = mid - 12;
  c.fillStyle = '#ffffff';
  c.fillRect(left, 44, paneW, h - 72);
  c.fillRect(mid + 4, 44, paneW, h - 72);
  text(c, `원문 (${v.i % 2 ? LANG_B : LANG_A})`, left + 2, 34, 11, GREY_D);
  text(c, '번역 (한국어)', mid + 6, 34, 11, GREY_D);
  const total = L.reduce((n, s) => n + s.length, 0);
  let left2 = Math.floor(total * clamp01(v.form));
  let active = L.length - 1;
  const rowH = (h - 84) / L.length;
  L.forEach((s, i) => {
    const y = 58 + i * rowH;
    const n = Math.min(s.length, left2);
    left2 -= n;
    if (n < s.length && active === L.length - 1 && (i < L.length - 1 || n < s.length)) active = i;
    const isActive = active === i && v.form < 0.995;
    if (isActive) {
      c.fillStyle = '#fff4c6';
      c.fillRect(left, y - rowH * 0.42, paneW, rowH * 0.84);
      c.fillRect(mid + 4, y - rowH * 0.42, paneW, rowH * 0.84);
    }
    glyphs(c, left + 4, y, paneW - 8, 13, 100 + v.i * 7 + i, INK);
    const shown = s.slice(0, n);
    const mark = i < clamp01(v.marks / 4) * 4;
    if (mark && shown) {
      c.fillStyle = i < clamp01(v.fixes / 4) * 4 ? '#c8ecd0' : '#ffd2cf';
      c.fillRect(mid + 5, y - 9, paneW - 2, 18);
    }
    text(c, shown, mid + 8, y, 12, INK, 'left', false);
    if (isActive && Math.floor(v.t * 3) % 2 === 0) {
      c.fillStyle = INK;
      c.fillRect(mid + 8 + c.measureText(shown).width + 1, y - 8, 2, 16);
    }
  });
  // A word that won't go across, and what the dictionary said.
  if (v.stuck > 0.5) {
    c.fillStyle = '#fffbe6';
    c.fillRect(mid - 74, h - 76, 148, 44);
    c.strokeStyle = MUSTARD;
    c.lineWidth = 2;
    c.strokeRect(mid - 74, h - 76, 148, 44);
    glyphs(c, mid - 68, h - 64, 60, 12, 777, INK);
    text(c, v.page > 0.5 ? `→ ${TERMS[wrap(v.i, TERMS.length)]}` : '→ ?', mid - 68, h - 44, 12, v.page > 0.5 ? GREEN : RED);
  }
  c.fillStyle = '#d8dfde';
  c.fillRect(8, h - 22, w - 16, 14);
  c.fillStyle = v.saved > 0.5 ? GREEN : TEAL;
  c.fillRect(8, h - 22, (w - 16) * clamp01(v.form), 14);
  text(c, v.saved > 0.5 ? '저장 완료' : `${Math.round(clamp01(v.form) * 100)}%`, w / 2, h - 15, 11, v.form > 0.5 ? '#ffffff' : INK, 'center');
  if (v.checked > 0.5 && v.saved < 0.5) text(c, '용어 일치 ✓', w - 80, 12, 12, '#ffe58a');
}
const deskKey = (v: DeskView) => `${wrap(v.i, DOCS.length)}|${q(v.form, 60)}|${q(v.stuck, 1)}|${q(v.page, 1)}|${q(v.checked, 1)}|${q(v.saved, 1)}|${q(v.marks, 2)}|${q(v.fixes, 2)}|${Math.floor(v.t * 3) % 2}`;
const idleView = (t: number, seed: number, form: number): DeskView => ({ i: seed, form, stuck: 0, page: 0, checked: 0, saved: 0, marks: 0, fixes: 0, reading: 0, t });

/** The desk: top, drawers, a low book rack at the back, the source page held up on its stand, the dictionary, a lamp. */
function deskBody(g: THREE.Object3D) {
  const T = TD.top;
  part(g, rbox(0.98, 0.04, 0.78, 0.01), OAK, 0, T - 0.02, -0.08);
  part(g, box(0.34, 0.3, 0.46), WALNUT, 0.3, T - 0.19, -0.2, { outline: false });
  part(g, box(0.04, T - 0.04, 0.5), GREY_D, -0.46, (T - 0.04) / 2, -0.2, { outline: false });
  part(g, box(0.96, 0.4, 0.02), WALNUT, 0, T - 0.24, -0.45, { outline: false });
  // A stand holding the page being translated.
  part(g, box(0.22, 0.3, 0.012), GRAPHITE, -0.38, T + 0.17, -0.14, { rx: -0.25, outline: false });
  const page = painted('ipSourcePage', 110, 150, (c) => {
    paperCanvas(c, 110, 150);
    for (let i = 0; i < 9; i++) glyphs(c, 7, 12 + i * 15, 96, 9, 300 + i, INK);
  });
  picture(g, page, 0.19, 0.26, -0.38, T + 0.172, -0.13, '#ffffff', 0, -0.25);
  keyboard(g, TD.keys, 0.27);
  mouse(g, TD.mouse, T);
}
function deskBits(g: THREE.Object3D, seed: number) {
  const T = TD.top;
  const cols = ['#a33b3b', '#2c6e8f', '#c8913a', '#527a4a', '#6a4c93'];
  for (let i = 0; i < 4; i++) part(g, box(0.05, 0.22, 0.16), cols[wrap(seed + i, cols.length)], 0.22 + i * 0.055, T + 0.11, -0.36, { outline: false });
  if (seed % 2) deskLamp(g, 0.42, T, -0.2);
  else mug(g, 0.42, T, -0.16);
  label(g, seed % 3 ? '오늘 마감!' : '문장은 소리 내어', 0.17, 0.05, 0.28, T + 0.6, -0.26, '#fff4b8', '#6b4a10');
}

// =============================================================================================
// 번역 책상 (translationDesk, 1 × 1).

function translationDesk(g: THREE.Group, out: Built) {
  const T = TD.top;
  deskBody(g);
  chair(g, TD.seat);
  const scr = monitor(g, TD.screen, 0.54, 0.31, T, 400, 230);
  // The dictionary: shut on the desk, open when it's looked in.
  const shut = flatBook(g, TD.dict[0], T, TD.dict[2], '#7b2d2d');
  const open = group(g, TD.dict[0], T, TD.dict[2]);
  part(open, box(0.3, 0.02, 0.21), '#7b2d2d', 0, 0.01, 0, { outline: false });
  const openPage = liveScreen(open, 0.28, 0.19, 200, 136, 0, 0.022, 0, 0, -Math.PI / 2);
  // The print for checking, and the red pen.
  const sheet = liveScreen(g, 0.2, 0.28, 180, 252, TD.sheet[0], T + 0.004, TD.sheet[2], 0, -Math.PI / 2);
  const pen = penTool(g, RED);
  const tools: Partial<Record<IpTool, HeldTool>> = { pen: pen.held };
  const spots: Record<string, Spot> = {
    translateDoc: seatAt(g, 'ipTranslate', TD.seat),
    interpreter_proofread: seatAt(g, 'ipProofread', TD.seat),
  };
  let seed = -1;
  const show = (_now: string | null, N: IpNow | null, t: number) => {
    if (seed < 0) {
      seed = seedOf(g);
      deskBits(g, seed);
    }
    const n = N?.n ?? {};
    const lookedIn = (n.dictOpen ?? 0) > 0.5;
    shut.visible = !lookedIn;
    open.visible = lookedIn;
    if (lookedIn) {
      const p = q(n.page, 1);
      openPage.draw(`d${p}`, (c) => {
        paperCanvas(c, 200, 136);
        c.fillStyle = '#d7d2c4';
        c.fillRect(99, 0, 2, 136);
        for (let i = 0; i < 6; i++) {
          glyphs(c, 6, 14 + i * 20, 86, 10, 500 + i + p * 11, INK);
          glyphs(c, 108, 14 + i * 20, 86, 10, 600 + i + p * 11, INK);
        }
      });
    }
    const showSheet = (n.sheet ?? 0) > 0.5;
    sheet.mesh.visible = showSheet;
    if (showSheet && N) {
      const i = N.b.n;
      const marks = n.marks ?? 0;
      const ok = n.okMark ?? 0;
      sheet.draw(`${wrap(i, DOCS.length)}|${q(marks, 2)}|${q(ok, 1)}`, (c) => {
        paperCanvas(c, 180, 252);
        const d = DOCS[wrap(i, DOCS.length)];
        text(c, d.title, 90, 16, 12, INK, 'center');
        d.target.forEach((s, k) => {
          const y = 44 + k * 44;
          text(c, s.slice(0, 14), 8, y, 11, INK, 'left', false);
          text(c, s.slice(14), 8, y + 15, 11, INK, 'left', false);
          if (marks > k + 0.5) {
            c.strokeStyle = RED;
            c.lineWidth = 2;
            c.beginPath();
            c.moveTo(12, y + 7);
            c.quadraticCurveTo(70, y + 13, 150, y + 6);
            c.stroke();
            text(c, '용어', 150, y - 8, 11, RED);
          }
        });
        if (ok > 0.5) {
          c.strokeStyle = RED;
          c.lineWidth = 3;
          c.beginPath();
          c.arc(140, 220, pos(22), 0, 6.3);
          c.stroke();
          text(c, '검토', 140, 220, 15, RED, 'center');
        }
      });
    }
    at(pen.root, N?.props.pen ?? null, [TD.sheet[0] + 0.11, T + 0.02, TD.sheet[2] - 0.12]);
    const idle = 0.2 + 0.6 * clamp01(0.5 + 0.5 * Math.sin(seed * 1.7));
    const v: DeskView = N ? { i: N.b.n + seed, form: n.form ?? 0, stuck: n.stuck ?? 0, page: n.page ?? 0, checked: n.checked ?? 0, saved: n.saved ?? 0, marks: n.marks ?? 0, fixes: n.fixes ?? 0, reading: n.reading ?? 0, t } : idleView(0, seed, idle);
    scr.draw(deskKey(v), (c) => paintDesk(c, 400, 230, v));
  };
  drive(g, out, spots, tools, show);
  out.work = marker(g, TD.keys[0], TD.keys[1], TD.keys[2]);
}

// =============================================================================================
// 동료 번역 책상 (ipMateDesk, 1 × 1): the same desk, a colleague's text growing by the clock.

function mateDesk(g: THREE.Group, out: Built) {
  const T = TD.top;
  deskBody(g);
  chair(g, TD.seat, '#58707a');
  const scr = monitor(g, TD.screen, 0.54, 0.31, T, 400, 230);
  flatBook(g, TD.dict[0], T, TD.dict[2], '#2c5a7b');
  let seed = -1;
  let mate: Fig | null = null;
  const lk = new THREE.Vector3();
  const rk = new THREE.Vector3();
  out.away = (_o, t) => {
    if (seed < 0) {
      seed = seedOf(g);
      deskBits(g, seed);
      const looks: Array<[string, string, string, 'female' | 'male']> = [['#9fbfb8', '#3e4a50', '#1a1a1a', 'female'], ['#b0bec5', '#455a64', '#3e2723', 'male'], ['#d7ccc8', '#37474f', '#2b1b10', 'female']];
      const L = looks[wrap(seed, looks.length)];
      mate = person(g, L[0], L[1], L[2], TD.seat[0], TD.seat[2], Math.PI, L[3], TD.seat[1], seed);
      mate.root.visible = true;
    }
    // A long stretch at the keys, then a pause over the page.
    const len = 24;
    const u = ((t / len + seed * 0.29) % 1 + 1) % 1;
    const typing = u < 0.72;
    if (mate) {
      lk.set(TD.keys[0] - 0.09, TD.keys[1] + 0.03 + (typing ? 0.006 * Math.sin(t * 11) : 0), TD.keys[2]);
      rk.set(TD.keys[0] + 0.09, TD.keys[1] + 0.03 + (typing ? 0.006 * Math.sin(t * 13) : 0), TD.keys[2]);
      mate.armL(lk);
      mate.armR(rk);
      mate.head.rotation.y = typing ? 0.03 * Math.sin(t * 0.7) : 0.5;
      nodHead(mate, typing ? 0.12 : 0.05 + 0.03 * Math.sin(t * 1.3));
    }
    const v: DeskView = { ...idleView(t, seed + Math.floor(t / len + seed * 0.29), clamp01(u / 0.9)) };
    scr.draw(deskKey(v), (c) => paintDesk(c, 400, 230, v));
  };
  out.work = marker(g, TD.keys[0], TD.keys[1], TD.keys[2]);
}

// =============================================================================================
// 용어집 서가 (glossaryShelf, 1 × 1): a bay of the wall of dictionaries.

function spineRow(key: number) {
  return painted(`ipSpines${key}`, 320, 110, (c) => {
    const cols = ['#7b2d2d', '#2c5a7b', '#3c6e4f', '#8f6b2c', '#5a3f75', '#3f4b55', '#a6502e', '#1f6b6b'];
    let x = 0;
    let i = 0;
    while (x < 320) {
      const w = 14 + hash(key, i) * 16;
      const top = 6 + hash(key + 3, i) * 18;
      c.fillStyle = cols[wrap(Math.floor(hash(key + 5, i) * 8), cols.length)];
      c.fillRect(x, top, w - 1, 110 - top);
      c.fillStyle = '#e6c977';
      c.fillRect(x + 2, top + 8, w - 5, 2);
      c.fillRect(x + 2, 100, w - 5, 2);
      if (i % 3 === 0) {
        c.save();
        c.translate(x + w / 2, 62);
        c.rotate(-Math.PI / 2);
        text(c, i % 2 ? '사전' : '용어', 0, 0, 11, '#f7efd8', 'center');
        c.restore();
      } else glyphs(c, x + 3, top + 24, w - 6, 7, key * 10 + i, '#f7efd8');
      x += w;
      i++;
    }
  });
}
function glossaryShelf(g: THREE.Group, out: Built) {
  const W = 0.97;
  const H = 2.08;
  part(g, box(W, H, 0.02), WALNUT, 0, H / 2, -0.47);
  for (const sx of [-1, 1]) part(g, box(0.03, H, 0.36), WALNUT, (sx * W) / 2 - sx * 0.015, H / 2, -0.29);
  const rows = [0.08, 0.44, 0.8, 1.16, 1.52, 1.88];
  for (const y of rows) part(g, box(W, 0.025, 0.36), WALNUT, 0, y - 0.0125, -0.29, { outline: false });
  part(g, box(W, 0.04, 0.38), WALNUT, 0, H, -0.28);
  let seed = -1;
  // The ledge, a place to open a book and write a card; the small player on it.
  part(g, rbox(0.92, 0.03, 0.24, 0.008), OAK, 0, GS.ledge - 0.015, 0.0);
  for (const sx of [-0.4, 0.4]) rod(g, v3(sx, GS.ledge - 0.03, 0.08), v3(sx, GS.ledge - 0.26, -0.11), 0.012, GREY_D);
  part(g, rbox(0.12, 0.05, 0.08, 0.008), GRAPHITE, GS.player[0], GS.ledge + 0.025, GS.player[2], { outline: false });
  const playerLamp = ownLit(g, ball(0.007), '#3a4048', GS.player[0] + 0.03, GS.ledge + 0.054, GS.player[2] + 0.015);
  const playerBar = liveScreen(g, 0.075, 0.03, 90, 36, GS.player[0] - 0.015, GS.ledge + 0.051, GS.player[2], 0, -Math.PI / 2);
  // What goes in the hands.
  const book = group(g);
  book.name = 'ipBook';
  const tilt = group(book);
  part(tilt, box(0.38, 0.27, 0.014), '#7b2d2d', 0, 0, 0, { outline: false });
  const shutBook = part(tilt, box(0.19, 0.27, 0.05), '#7b2d2d', 0, 0, 0.02, { outline: false });
  const pages = liveScreen(tilt, 0.36, 0.25, 320, 222, 0, 0, 0.0085);
  const slotBook = part(g, box(0.05, 0.26, 0.2), '#7b2d2d', GS.slot[0], GS.slot[1], GS.slot[2] - 0.1, { outline: false });
  const gap = part(g, box(0.06, 0.28, 0.02), '#191512', GS.slot[0], GS.slot[1], GS.slot[2] + 0.012, { outline: false });
  const pen = penTool(g, '#2f6fd0');
  const script = scriptTool(g);
  const card = liveScreen(g, 0.17, 0.11, 170, 110, GS.card[0], GS.card[1], GS.card[2], 0, -Math.PI / 2);
  const worn = headset(g);
  worn.visible = false;
  const tools: Partial<Record<IpTool, HeldTool>> = { book: { tool: book, lead: 'left', grips: FLAT_LEFT }, pen: pen.held, script: script.held };
  const spots: Record<string, Spot> = {
    buildGlossary: standAt(g, 'ipGlossary', 0.02, GS.stand),
    interpreter_shadowing: standAt(g, 'ipShadow', -0.12, GS.stand),
  };
  const show = (_now: string | null, N: IpNow | null, t: number, H2: number) => {
    if (seed < 0) {
      seed = seedOf(g);
      rows.forEach((y, i) => {
        if (i === rows.length - 1) return;
        const tex = spineRow(seed % 5 + i * 5);
        part(g, box(W - 0.08, 0.3, 0.22), '#2a2320', 0, y + 0.16, -0.27, { outline: false });
        picture(g, tex, W - 0.08, 0.31, 0, y + 0.165, -0.157);
      });
      gap.position.z = -0.15;
      slotBook.position.z = -0.25;
    }
    const n = N?.n ?? {};
    const taken = (n.taken ?? 0) > 0.5;
    slotBook.visible = !taken;
    gap.visible = taken;
    const inHand = N?.tool === 'book';
    const onLedge = !!N?.props.book && taken && !inHand;
    at(book, inHand || onLedge ? N?.props.book : null);
    tilt.rotation.x = inHand ? -0.6 : -Math.PI / 2;
    const opened = (n.open ?? 0) > 0.5;
    shutBook.visible = !opened;
    pages.mesh.visible = opened;
    if (opened && (inHand || onLedge)) {
      const flip = q(n.page, 1);
      const hi = q(n.hi, 1);
      pages.draw(`${flip}|${hi}`, (c) => {
        paperCanvas(c, 320, 222);
        c.fillStyle = '#d7d2c4';
        c.fillRect(158, 0, 3, 222);
        for (let i = 0; i < 8; i++) {
          const y = 18 + i * 25;
          glyphs(c, 8, y, 66, 12, 800 + i + flip * 17, INK);
          text(c, TERMS[wrap(i + flip * 3, TERMS.length)], 84, y, 10, GREY_D, 'left', false);
          glyphs(c, 168, y, 142, 11, 900 + i + flip * 17, '#44474a');
        }
        if (hi) {
          c.fillStyle = 'rgba(255,214,70,0.5)';
          c.fillRect(6, 18 + 3 * 25 - 11, 150, 22);
        }
      });
    }
    const lines = n.lines ?? 0;
    card.mesh.visible = (n.cardOn ?? 0) > 0.5;
    if (card.mesh.visible) card.draw(`${N?.b.n ?? 0}|${q(lines, 2)}`, (c) => {
      paperCanvas(c, 170, 110, '#fff9dc');
      c.fillStyle = TEAL;
      c.fillRect(0, 0, 170, 8);
      if (lines > 0.5) glyphs(c, 8, 28, 150, 15, 700 + (N?.b.n ?? 0), INK);
      if (lines > 1.5) text(c, TERMS[wrap(N?.b.n ?? 0, TERMS.length)], 8, 60, 16, INK);
      if (lines > 2.5) text(c, '출처: 계약서 3조', 8, 88, 12, GREY_D, 'left', false);
    });
    at(pen.root, N?.props.pen ?? null);
    at(script.root, N?.tool === 'script' ? N.props.script : null);
    if (N?.tool === 'script') {
      const pos01 = n.pos ?? 0;
      script.screen.draw(`${q(pos01, 8)}`, (c) => paintScript(c, '따라 말하기 대본', 0, pos01));
    }
    wearing(worn, null, (n.hs ?? 0) > 0.5, N, H2);
    setLit(playerLamp, (n.playing ?? 0) > 0.5 ? '#66bb6a' : '#3a4048');
    playerBar.mesh.visible = !!N && (n.script ?? 0) > 0.5;
    if (N && (n.script ?? 0) > 0.5) {
      const pl = n.pos ?? 0;
      playerBar.draw(`${q(pl, 10)}|${q(n.playing, 1)}`, (c) => {
        c.fillStyle = '#0d1c1a';
        c.fillRect(0, 0, 90, 36);
        c.fillStyle = '#6fe0cb';
        c.fillRect(6, 15, 78 * clamp01(pl), 6);
      });
    }
    void t;
  };
  drive(g, out, spots, tools, show);
  out.work = marker(g, GS.rest[0], GS.rest[1], GS.rest[2]);
}

// =============================================================================================
// 동시통역 부스 (interpretBooth, 2 × 1).

function foam(c: Ctx2) {
  c.fillStyle = '#566066';
  c.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 8; i++)
    for (let j = 0; j < 8; j++) {
      c.fillStyle = (i + j) % 2 ? '#4b555b' : '#616c72';
      c.beginPath();
      c.moveTo(i * 16, j * 16 + 16);
      c.lineTo(i * 16 + 8, j * 16);
      c.lineTo(i * 16 + 16, j * 16 + 16);
      c.fill();
    }
}
function interpretBooth(g: THREE.Group, out: Built) {
  const Hb = 2.1;
  const T = BO.top;
  const Gz = BO.glass;
  part(g, box(1.98, 0.05, 0.98), '#3e464c', 0, 0.025, 0);
  const foamTex = painted('ipFoam', 128, 128, foam);
  part(g, box(1.98, Hb, 0.05), PANEL, 0, Hb / 2, -0.47);
  picture(g, foamTex, 1.88, 1.9, 0, 1.08, -0.443);
  for (const sx of [-1, 1]) {
    part(g, box(0.05, Hb, 0.96), PANEL, sx * 0.97, Hb / 2, 0);
    picture(g, foamTex, 0.86, 1.9, sx * 0.943, 1.08, 0, '#ffffff', -sx * Math.PI / 2);
  }
  // The front: a solid sill below the console, glass above, a door at the right-hand end.
  part(g, box(BO.hinge + 0.97, T, 0.04), PANEL, (BO.hinge - 0.97) / 2, T / 2, Gz);
  haze(g, new THREE.PlaneGeometry(BO.hinge + 0.95, Hb - T - 0.2), '#cfe7ee', 0.13, (BO.hinge - 0.95) / 2, (Hb - 0.2 + T) / 2, Gz);
  for (const x of [-0.95, -0.28, BO.hinge, 0.95]) part(g, box(0.04, Hb, 0.05), GRAPHITE, x, Hb / 2, Gz, { outline: false });
  part(g, box(1.98, 0.22, 0.05), GRAPHITE, 0, Hb - 0.11, Gz, { outline: false });
  part(g, box(1.98, 0.04, 0.05), GRAPHITE, 0, T, Gz, { outline: false });
  const header = liveScreen(g, 1.1, 0.14, 440, 56, -0.2, Hb - 0.11, Gz + 0.03);
  const onAir = ownLit(g, ball(0.03), '#4a2020', 0.7, Hb - 0.11, Gz + 0.035);
  const door = group(g, BO.hinge, 0, Gz);
  const dw = BO.doorW;
  haze(door, new THREE.PlaneGeometry(dw, Hb - 0.28), '#d6edf4', 0.17, dw / 2, (Hb - 0.22) / 2, 0);
  for (const y of [0.04, Hb - 0.24]) part(door, box(dw, 0.03, 0.02), GRAPHITE, dw / 2, y, 0, { outline: false });
  part(door, box(0.02, Hb - 0.26, 0.02), GRAPHITE, dw - 0.01, (Hb - 0.22) / 2, 0, { outline: false });
  part(door, cyl(0.012, 0.012, 0.2, 8), CHROME, 0.46, 1.02, 0.03, { outline: false });
  // The console, along the glass, seen by whoever sits at it.
  part(g, rbox(BO.hinge + 0.9, 0.04, 0.42, 0.008), '#c7c0b2', (BO.hinge - 0.9) / 2, T - 0.02, 0.24);
  part(g, rbox(0.3, 0.035, 0.18, 0.008), GRAPHITE, BO.console[0], T + 0.018, BO.console[2], { outline: false });
  const consoleLamp = ownLit(g, ball(0.012), '#4a2020', BO.console[0] - 0.08, T + 0.04, BO.console[2] - 0.02);
  for (let i = 0; i < 3; i++) part(g, cyl(0.016, 0.016, 0.018, 10), i === 1 ? MUSTARD : GREY, BO.console[0] + 0.02 + i * 0.05, T + 0.044, BO.console[2] + 0.03, { outline: false });
  // The mic on its neck, between the dweller and the glass.
  part(g, cyl(0.04, 0.046, 0.018, 12), BLACK, 0, T + 0.009, 0.34, { outline: false });
  rod(g, v3(0, T + 0.01, 0.34), v3(0, T + 0.18, 0.3), 0.006, BLACK);
  rod(g, v3(0, T + 0.18, 0.3), v3(0, T + 0.26, 0.2), 0.006, BLACK);
  part(g, ball(0.024), BLACK, 0, T + 0.27, 0.185, { outline: false });
  const micRing = ownLit(g, cyl(0.012, 0.012, 0.01, 10), '#4a2020', 0, T + 0.24, 0.215);
  // A monitor: the speaker's slide and the room.
  const scr = monitor(g, [0.26, 1.05, 0.38], 0.28, 0.17, T, 280, 170, Math.PI);
  // The pad, the pen and water.
  part(g, box(0.17, 0.008, 0.22), '#b09d82', BO.pad[0], T + 0.004, BO.pad[2], { outline: false });
  const pad = liveScreen(g, 0.155, 0.205, 155, 205, BO.pad[0], T + 0.0095, BO.pad[2], 0, -Math.PI / 2);
  pad.mesh.rotation.z = Math.PI;
  const pen = penTool(g, '#2f6fd0', true);
  const cup = group(g);
  cup.name = 'ipCup';
  part(cup, cyl(0.034, 0.028, 0.1, 14), '#e7f0f4', 0, 0, 0, { outline: false });
  part(cup, cyl(0.03, 0.026, 0.002, 14), '#a8d7e6', 0, 0.03, 0, { outline: false });
  const parked = parkedHeadset(g, -0.82, T, 0.26);
  const worn = headset(g);
  worn.visible = false;
  chair(g, BO.seat, GRAPHITE, 0);
  chair(g, BO.mate, GRAPHITE, 0);
  // Inside lamps along the back, always lit.
  ownLit(g, box(1.4, 0.03, 0.03), '#fff3d0', 0, Hb - 0.1, -0.42);
  // The slip a colleague pushes over.
  const slip = part(g, box(0.1, 0.002, 0.07), '#fff59d', -0.34, T + 0.003, 0.3, { outline: false });
  const script = scriptTool(g);
  const tools: Partial<Record<IpTool, HeldTool>> = { pen: pen.held, cup: { tool: cup, lead: 'right', grips: { right: { at: v3(0, -0.005, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.032 } } }, script: script.held };
  const mate = lazy(() => {
    const f = person(g, '#90a4ae', '#37474f', '#2b1b10', BO.mate[0], BO.mate[2], 0, 'female', BO.mate[1]);
    headset(f.head).position.set(0, 0.015, 0);
    return f;
  });
  const speaker = lazy(() => person(g, '#546e7a', '#263238', '#3e2723', BO.speaker[0], BO.speaker[1], Math.PI / 2, 'male'));
  const spots: Record<string, Spot> = {
    practiceInterpret: seatAt(g, 'ipPractice', BO.seat, 0),
    urgentInterpret: seatAt(g, 'ipUrgent', BO.seat, 0),
    interpreter_briefSpeaker: standAt(g, 'ipBrief', BO.brief[0], BO.brief[1]),
  };
  let seed = -1;
  const mateHand = new THREE.Vector3();
  const spHand = new THREE.Vector3();
  const show = (now: string | null, N: IpNow | null, t: number, H: number) => {
    if (seed < 0) seed = seedOf(g);
    const n = N?.n ?? {};
    door.rotation.y = clamp01(n.door) * BOOTH_SWING;
    wearing(worn, parked, (n.hs ?? 0) > 0.5, N, H);
    const lit = (n.lit ?? 0) > 0.5;
    if (lit) MEET.liveAt = t;
    setLit(onAir, lit ? (now === 'urgentInterpret' && Math.sin(t * 7) > 0 ? '#ff8a80' : '#ff3b30') : '#4a2020');
    setLit(micRing, lit ? '#ff3b30' : '#4a2020');
    setLit(consoleLamp, lit ? '#ff3b30' : '#4a2020');
    const urgent = (n.urgent ?? 0) > 0.5;
    const said = n.said ?? 0;
    header.draw(`${lit ? 1 : 0}|${urgent ? 1 : 0}|${seed}`, (c) => {
      c.fillStyle = lit ? '#3a0f10' : '#17201f';
      c.fillRect(0, 0, 440, 56);
      text(c, lit ? '통역 중 · 조용히' : `동시통역 ${seed % 2 ? 1 : 2}번 부스`, 14, 28, 26, lit ? '#ff8a80' : TEAL_L);
      text(c, `${LANG_A} → 한국어`, 426, 28, 20, '#cfd8dc', 'right', false);
    });
    const notes = n.notes ?? 0;
    pad.draw(`${q(notes, 2)}`, (c) => {
      paperCanvas(c, 155, 205, '#fbf8ea');
      for (let i = 0; i < 7; i++) {
        c.fillStyle = '#cfd8dc';
        c.fillRect(6, 28 + i * 26, 143, 1);
      }
      if (notes > 0.5) text(c, '3.2 ↑', 10, 18, 20, INK);
      if (notes > 1.5) text(c, '42곳', 10, 46, 20, INK);
      if (notes > 2.5) text(c, '△ → 표', 10, 74, 18, INK);
    });
    at(pen.root, N?.props.pen ?? null, [BO.pad[0] - 0.09, T + 0.02, BO.pad[2] - 0.08]);
    at(cup, N?.props.cup ?? null, BO.cup);
    slip.visible = (n.mateNote ?? 0) > 0.5;
    // The colleague at the left of the console, on the alarm only.
    if ((n.mate ?? 0) > 0.5) {
      const f = mate.get();
      f.root.visible = true;
      mateHand.set(BO.mate[0] + (n.mateNote ?? 0) * 0.14 + 0.1, T + 0.05 + ((n.mateWrites ?? 0) > 0.5 ? 0.004 * Math.sin(t * 15) : 0), BO.mate[2] + 0.42);
      f.armR(mateHand);
      f.armL(null);
      nodHead(f, (n.mateNods ?? 0) > 0.5 ? 0.12 + 0.12 * Math.sin(t * 5) : 0.18);
    } else mate.hide();
    // The speaker on the near side, for a word before they go on.
    if ((n.speaker ?? 0) > 0.5) {
      const f = speaker.get();
      f.root.visible = true;
      spHand.set(BO.speaker[0] + 0.3, 1.1 + ((n.spTalks ?? 0) > 0.5 ? 0.06 * Math.sin(t * 4) : 0), BO.speaker[1] + 0.12);
      f.armR((n.spTalks ?? 0) > 0.5 ? spHand : null);
      f.armL(null);
      nodHead(f, (n.spBow ?? 0) > 0.5 ? 0.3 : (n.spNods ?? 0) > 0.5 ? 0.1 + 0.1 * Math.sin(t * 3.4) : 0.05);
    } else speaker.hide();
    at(script.root, N?.tool === 'script' ? N.props.script : null);
    if (N?.tool === 'script') {
      const hi = n.hi ?? 0;
      script.screen.draw(`b${q(hi, 4)}`, (c) => paintScript(c, '기조연설 원고', hi, 0.4));
    }
    const src = (n.source ?? 0) > 0.5;
    const level = src ? n.level ?? 0.5 : 0;
    const beat = src ? Math.floor(t * 5) : 0;
    scr.draw(`${src ? 1 : 0}|${beat}|${q(said, 6)}|${q(n.done, 1)}`, (c) => {
      c.fillStyle = '#1e2a2e';
      c.fillRect(0, 0, 280, 170);
      c.fillStyle = '#e9e3d0';
      c.fillRect(10, 8, 260, 74);
      text(c, '회의실 화면', 16, 18, 11, GREY_D);
      glyphs(c, 18, 40, 240, 15, 40 + wrap(Math.floor(said * 6), 6), INK);
      glyphs(c, 18, 62, 200, 13, 60 + wrap(Math.floor(said * 6), 6), GREY_D);
      c.fillStyle = '#b7f0d4';
      for (let i = 0; i < 24; i++) {
        const b = pos(16 * clamp01(level) * Math.abs(Math.sin(i * 0.9 + beat * 0.7)));
        c.fillRect(12 + i * 11, 104 - b, 6, b * 2);
      }
      text(c, (n.done ?? 0) > 0.5 ? '회의 종료 · 수고하셨습니다' : `1번 채널 · ${LANG_A} 입력`, 12, 146, 14, '#cfd8dc', 'left', false);
    });
  };
  drive(g, out, spots, tools, show);
  out.work = marker(g, BO.console[0], BO.console[1], BO.console[2]);
}

// =============================================================================================
// 용어 게시판 (ipTermBoard, 2 × 1).

function termBoard(g: THREE.Group, out: Built) {
  const W = 1.74;
  const H = 0.92;
  const cy = 1.38;
  part(g, box(W + 0.06, H + 0.06, 0.03), WALNUT, 0, cy, TB.face - 0.03);
  for (const sx of [-1, 1]) part(g, box(0.05, cy, 0.05), WALNUT, sx * (W / 2 - 0.02), (cy - H / 2) / 2, TB.face - 0.03, { outline: false });
  const board = liveScreen(g, W, H, 696, 368, 0, cy, TB.face - 0.012);
  // The ledge, with blank cards, the pen.
  part(g, rbox(0.86, 0.025, 0.2, 0.006), OAK, TB.ledge[0] - 0.07, TB.ledge[1] - 0.012, TB.ledge[2] + 0.04);
  for (let i = 0; i < 3; i++) part(g, box(0.17, 0.003, 0.11), '#fff9dc', TB.ledge[0] - 0.02 + i * 0.002, TB.ledge[1] + 0.002 + i * 0.003, TB.ledge[2] + 0.03, { outline: false });
  const blank = part(g, box(0.17, 0.002, 0.11), '#fff9dc', TB.ledge[0] - 0.02, TB.ledge[1] + 0.013, TB.ledge[2] + 0.03, { outline: false });
  const pen = penTool(g);
  const cardG = group(g);
  cardG.name = 'ipCard';
  part(cardG, box(0.17, 0.11, 0.003), '#fff9dc', 0, 0, 0, { outline: false });
  const cardFace = liveScreen(cardG, 0.17, 0.11, 136, 88, 0, 0, 0.002);
  part(cardG, ball(0.009), RED, 0, 0.045, 0.006, { outline: false });
  const tools: Partial<Record<IpTool, HeldTool>> = { pen: pen.held, card: { tool: cardG, lead: 'right', grips: { right: { at: v3(0.06, -0.03, 0.002), axis: v3(0, 1, 0), shape: 'pinch', radius: 0.006 } } } };
  const spots: Record<string, Spot> = { ipPinTerm: standAt(g, 'ipPinTerm', 0.34, TB.stand) };
  const cols = [-0.62, -0.21, 0.21, 0.62];
  const rowsY = [1.66, 1.4, 1.14];
  const cardOn = (c: Ctx2, x: number, y: number, seed: number, term: string, hi: boolean) => {
    const cw = 136;
    const ch = 88;
    const px = ((x + W / 2) / W) * 696;
    const py = ((cy + H / 2 - y) / H) * 368;
    c.fillStyle = hi ? '#fff2a8' : '#fff9dc';
    c.fillRect(px - cw / 2, py - ch / 2, cw, ch);
    c.fillStyle = TEAL;
    c.fillRect(px - cw / 2, py - ch / 2, cw, 6);
    glyphs(c, px - cw / 2 + 6, py - 16, cw - 14, 13, seed, INK);
    text(c, term, px - cw / 2 + 6, py + 20, 15, INK);
    c.fillStyle = RED;
    c.beginPath();
    c.arc(px, py - ch / 2 + 3, pos(5), 0, 6.3);
    c.fill();
  };
  const show = (_now: string | null, N: IpNow | null, t: number) => {
    const n = N?.n ?? {};
    const round = N?.b.n ?? 0;
    const slot = wrap(round, 4);
    const placed = (n.placed ?? 0) > 0.5;
    const hi = (n.hiNew ?? 0) > 0.5 && Math.sin(t * 5) > -0.5;
    board.draw(`${N ? 1 : 0}|${slot}|${placed ? 1 : 0}|${hi ? 1 : 0}`, (c) => {
      c.fillStyle = '#c9a26f';
      c.fillRect(0, 0, 696, 368);
      c.fillStyle = 'rgba(90,60,30,0.12)';
      for (let i = 0; i < 300; i++) c.fillRect(hash(1, i) * 696, hash(2, i) * 368, 3, 2);
      c.fillStyle = TEAL;
      c.fillRect(250, 6, 196, 26);
      text(c, `용어집 · ${LANG_A}/${LANG_B}`, 348, 19, 15, '#ffffff', 'center');
      let i = 0;
      rowsY.forEach((y, ry) =>
        cols.forEach((x, cx) => {
          const k = (cx === 1 || cx === 2) && ry > 0 ? (cx === 1 ? 0 : 1) + (ry - 1) * 2 : -1;
          if (k < 0) {
            cardOn(c, x, y, 1000 + i, TERMS[wrap(i, TERMS.length)], false);
            i++;
            return;
          }
          // The free places: others already pinned in earlier rounds, this round's when it's up.
          const isOurs = N && k === slot;
          if (isOurs ? placed : k % 2 === 0) cardOn(c, x, y, 1100 + k + (isOurs ? round * 3 : 0), NEW_TERMS[wrap(k + (isOurs ? round : 0), NEW_TERMS.length)], !!isOurs && hi);
          else {
            c.strokeStyle = 'rgba(70,45,20,0.4)';
            c.setLineDash([6, 5]);
            c.strokeRect(((x + W / 2) / W) * 696 - 68, ((cy + H / 2 - y) / H) * 368 - 44, 136, 88);
            c.setLineDash([]);
          }
        }),
      );
    });
    blank.visible = (n.blank ?? 1) > 0.5;
    at(pen.root, N?.props.pen ?? null, [TB.ledge[0] + 0.24, TB.ledge[1] + 0.015, TB.ledge[2]]);
    const place = N?.props.card ?? null;
    at(cardG, place);
    if (place) {
      cardG.rotation.x = N?.tool === 'card' ? 0 : -Math.PI / 2;
      const lines = n.lines ?? 0;
      cardFace.draw(`${wrap(round, NEW_TERMS.length)}|${q(lines, 2)}`, (c) => {
        paperCanvas(c, 136, 88, '#fff9dc');
        if (lines > 0.5) glyphs(c, 6, 24, 122, 13, 1100 + slot + round * 3, INK);
        if (lines > 1.5) text(c, NEW_TERMS[wrap(slot + round, NEW_TERMS.length)], 6, 60, 15, INK);
      });
    }
  };
  drive(g, out, spots, tools, show);
  out.work = marker(g, termSlot(0)[0], termSlot(0)[1], termSlot(0)[2] + 0.05);
}

// =============================================================================================
// 회의 탁자 (ipMeetingTable, 3 × 2).

function meetingTable(g: THREE.Group, out: Built) {
  const T = MT.top;
  part(g, rbox(2.5, 0.05, 0.96, 0.03), WALNUT, 0, T - 0.025, 0);
  for (const sx of [-1, 1]) {
    part(g, box(0.09, T - 0.06, 0.6), GRAPHITE, sx * 1.05, (T - 0.06) / 2, 0, { outline: false });
    part(g, box(0.1, 0.03, 0.8), GRAPHITE, sx * 1.05, 0.015, 0, { outline: false });
  }
  chair(g, MT.seat, TEAL, 0);
  chair(g, MT.speaker, '#58707a', 0);
  chair(g, MT.guest, '#58707a', Math.PI);
  chair(g, [-0.72, MT.guest[1], MT.guest[2]], '#58707a', Math.PI);
  // Place cards, mics, water, papers; the middle of a meeting.
  const plate = (x: number, z: number, s: string, ry: number) => {
    part(g, box(0.2, 0.08, 0.03), CREAM, x, T + 0.04, z, { ry, outline: false });
    label(g, s, 0.18, 0.06, x, T + 0.045, z + (ry ? -0.017 : 0.017), CREAM, INK, ry);
  };
  plate(MT.seat[0] + 0.24, -0.1, '통역', 0);
  plate(MT.speaker[0], -0.1, '발표', 0);
  plate(MT.guest[0], 0.3, '손님', Math.PI);
  for (const x of [MT.speaker[0], MT.guest[0]]) {
    const z = x === MT.guest[0] ? 0.22 : -0.2;
    part(g, cyl(0.035, 0.04, 0.014, 10), BLACK, x + 0.2, T + 0.007, z, { outline: false });
    rod(g, v3(x + 0.2, T, z), v3(x + 0.14, T + 0.18, z + (z > 0 ? 0.08 : -0.08)), 0.005, BLACK);
    part(g, cyl(0.03, 0.033, 0.2, 12), '#b7dcea', x - 0.2, T + 0.1, z, { outline: false });
    part(g, cyl(0.015, 0.015, 0.03, 8), '#3f6a80', x - 0.2, T + 0.215, z, { outline: false });
    part(g, box(0.2, 0.004, 0.28), PAPER, x + 0.02, T + 0.002, z + (z > 0 ? 0.03 : -0.03), { ry: 0.08, outline: false });
  }
  // The pad: a long reporter's pad, hinged at the top, the leaf that goes over.
  part(g, box(0.2, 0.012, 0.26), '#6b5b45', MT.pad[0], T + 0.006, MT.pad[2], { outline: false });
  const pad = liveScreen(g, 0.185, 0.245, 185, 245, MT.pad[0], T + 0.0135, MT.pad[2], Math.PI, -Math.PI / 2);
  const leaf = group(g, MT.pad[0], T + 0.015, MT.pad[2] + 0.13);
  part(leaf, box(0.185, 0.0015, 0.245), '#fbf8ea', 0, 0, -0.123, { outline: false });
  leaf.visible = false;
  const pen = penTool(g, '#20242a', true);
  const spots: Record<string, Spot> = { ipConsecutive: seatAt(g, 'ipConsecutive', MT.seat, 0) };
  const tools: Partial<Record<IpTool, HeldTool>> = { pen: pen.held };
  const A = lazy(() => person(g, '#3f5566', '#222c33', '#1a1a1a', MT.speaker[0], MT.speaker[2], 0.18, 'male', MT.speaker[1]));
  const B = lazy(() => person(g, '#8c6b5a', '#2f2a28', '#3e2723', MT.guest[0], MT.guest[2], Math.PI - 0.22, 'female', MT.guest[1]));
  const ha = new THREE.Vector3();
  const hb = new THREE.Vector3();
  const show = (_now: string | null, N: IpNow | null, t: number) => {
    const n = N?.n ?? {};
    const meeting = meetingOn(t);
    const inRoom = !!N || meeting;
    if (inRoom) {
      const a = A.get();
      const b = B.get();
      a.root.visible = b.root.visible = true;
      // In a booth's meeting they speak by the clock, a long turn each.
      const turn = wrap(t / 8, 2);
      const aT = N ? (n.aTalks ?? 0) > 0.5 : turn === 0;
      const bT = N ? (n.bTalks ?? 0) > 0.5 : turn === 1;
      ha.set(MT.speaker[0] + 0.14, T + 0.2 + (aT ? 0.07 * Math.sin(t * 3.7) : 0), MT.speaker[2] + 0.4);
      hb.set(MT.guest[0] - 0.12, T + 0.2 + (bT ? 0.07 * Math.sin(t * 3.3) : 0), MT.guest[2] - 0.42);
      a.armL(aT ? ha : null);
      a.armR(null);
      b.armR(bT ? hb : null);
      b.armL(null);
      nodHead(a, aT ? 0.02 + 0.04 * Math.sin(t * 3) : (n.aNods ?? 0) > 0.5 ? 0.1 + 0.08 * Math.sin(t * 2.7) : 0.12);
      nodHead(b, bT ? 0.02 + 0.04 * Math.sin(t * 3.1) : (n.bNods ?? 0) > 0.5 ? 0.1 + 0.08 * Math.sin(t * 3) : 0.1);
    } else {
      A.hide();
      B.hide();
    }
    at(pen.root, N?.props.pen ?? null, [MT.pad[0] - 0.13, T + 0.02, MT.pad[2] - 0.02]);
    const marks = n.marks ?? 0;
    const page = q(n.page, 1);
    const round = N?.b.n ?? 0;
    pad.draw(`${wrap(round, 4)}|${page}|${q(marks, 2)}`, (c) => {
      paperCanvas(c, 185, 245, '#fbf8ea');
      c.fillStyle = '#d3d8da';
      for (let i = 0; i < 9; i++) c.fillRect(6, 24 + i * 26, 173, 1);
      c.fillStyle = '#b5383a';
      c.fillRect(0, 0, 185, 8);
      // Consecutive notes: a few signs going down the page in steps, not sentences.
      const R = wrap(round + page * 3, 4);
      const lines: ReadonlyArray<ReadonlyArray<string>> = [
        ['회사 → 2년', '  매출 ↑ 30%', '    ∴ 공장 +1', '시장 ≠ 작년', '  → 합의?'],
        ['물 ↻', '  3.2° ↑', '    42곳', '∵ 가뭄 ×3', '  → 표 ②'],
        ['납품 9/30', '  늦음 = 보상', '    2%/일', '불량 → 교환', '  OK?'],
        ['감사 ◎', '  협력 ↑', '    내년 ⊕', '회의 2번 더', '  → 일정'],
      ];
      lines[R].forEach((s, i) => {
        if (marks > i + 0.15) text(c, s, 8, 22 + i * 40, 18, '#1a2b6d');
      });
    });
    const lf = n.leaf ?? 0;
    leaf.visible = lf > 0.02 && lf < 0.98;
    leaf.rotation.x = lf * Math.PI;
  };
  drive(g, out, spots, tools, show);
  out.work = marker(g, MT.pad[0], T + 0.04, MT.pad[2]);
}

// =============================================================================================
// 공증 카운터 (ipNotaryCounter, 2 × 1). Placed facing back into the room: the far side (-z) is the client's and the camera's.

function notaryCounter(g: THREE.Group, out: Built) {
  const T = NC.top;
  part(g, box(1.9, T - 0.03, 0.56), CREAM, 0, (T - 0.03) / 2, -0.01);
  part(g, rbox(1.96, 0.04, 0.72, 0.012), WALNUT, 0, T - 0.02, -0.01);
  // The client's side: a wood front, the sign, a number lamp.
  part(g, box(1.9, 0.1, 0.01), WALNUT, 0, 0.05, -0.295, { outline: false });
  part(g, box(1.5, 0.3, 0.01), TEAL, 0, 0.62, -0.295, { outline: false });
  label(g, '번역 공증 창구', 1.3, 0.22, 0, 0.62, -0.302, TEAL, '#fdf7e3', Math.PI);
  // The tray and the pile of what's waiting, the ink, the stamp's stand, a pen in a block, an open register.
  part(g, box(0.28, 0.03, 0.34), GRAPHITE, -0.68, T + 0.015, 0.08, { outline: false });
  for (let i = 0; i < 5; i++) part(g, box(0.21, 0.004, 0.29), i % 2 ? PAPER : '#efe9d7', -0.68 + 0.003 * (i % 3), T + 0.035 + i * 0.005, 0.08, { ry: 0.03 * (i - 2), outline: false });
  part(g, rbox(0.13, 0.016, 0.1, 0.004), '#2b1616', NC.ink[0], T + 0.008, NC.ink[2], { outline: false });
  part(g, box(0.115, 0.002, 0.085), SEAL, NC.ink[0], T + 0.017, NC.ink[2], { outline: false });
  part(g, rbox(0.11, 0.008, 0.11, 0.004), GREY_D, NC.stampHome[0], T + 0.004, NC.stampHome[2], { outline: false });
  // The original, painted once, and the translation with its seal and signature.
  const origTex = painted('ipOriginal', 148, 200, (c) => {
    paperCanvas(c, 148, 200);
    c.fillStyle = '#7a6a3f';
    c.fillRect(0, 0, 148, 5);
    glyphs(c, 34, 24, 90, 13, 2001, INK);
    for (let i = 0; i < 9; i++) glyphs(c, 10, 50 + i * 15, 128, 9, 2010 + i, INK);
    c.strokeStyle = '#3a5ca8';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(116, 180, 12, 0, 6.3);
    c.stroke();
  });
  const orig = picture(g, origTex, 0.2, 0.28, NC.orig[0], T + 0.004, NC.orig[2], '#ffffff', 0, -Math.PI / 2);
  const docG = group(g);
  const doc = liveScreen(docG, 0.2, 0.28, 180, 252, 0, 0, 0, 0, -Math.PI / 2);
  const ribbon = part(docG, box(0.022, 0.004, 0.2), SEAL, -0.07, 0.003, -0.05, { ry: -0.5, outline: false });
  const pen = penTool(g, '#14224e');
  // The stamp, a real one to hold: a turned handle, a brass collar, a face. Its origin is the grip.
  const stamp = group(g);
  stamp.name = 'ipStamp';
  part(stamp, cyl(0.016, 0.018, 0.09, 12), '#20242b', 0, 0.002, 0, { outline: false });
  part(stamp, cyl(0.02, 0.018, 0.016, 14), '#20242b', 0, 0.052, 0, { outline: false });
  part(stamp, cyl(0.024, 0.024, 0.012, 14), '#c49a3c', 0, -0.05, 0, { outline: false });
  part(stamp, cyl(0.032, 0.032, 0.022, 16), '#3a2616', 0, -STAMP_UP + 0.012, 0, { outline: false });
  part(stamp, cyl(0.03, 0.03, 0.002, 16), SEAL, 0, -STAMP_UP + 0.001, 0, { outline: false });
  const tools: Partial<Record<IpTool, HeldTool>> = { stamp: { tool: stamp, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.017 } } }, pen: pen.held };
  const client = lazy(() => person(g, '#a1887f', '#37474f', '#1a1a1a', NC.client[0], NC.client[1], 0, 'female'));
  const spots: Record<string, Spot> = { ipNotarise: standAt(g, 'ipNotarise', NC.x, NC.stand) };
  const reach = new THREE.Vector3();
  const show = (_now: string | null, N: IpNow | null, t: number) => {
    const n = N?.n ?? {};
    const sealed = n.sealed ?? 0;
    const signed = n.signed ?? 0;
    const gone = n.gone ?? 0;
    const onC = (n.onCounter ?? 0) > 0.5 && gone < 0.98;
    docG.visible = onC;
    orig.visible = !!N;
    if (onC) docG.position.set(NC.doc[0] + (NC.away[0] - NC.doc[0]) * gone, T + 0.005, NC.doc[2] + (NC.away[2] - NC.doc[2]) * gone);
    ribbon.visible = (n.ribbon ?? 0) > 0.5;
    if (onC) doc.draw(`${wrap(N?.b.n ?? 0, 3)}|${q(sealed, 6)}|${q(signed, 10)}`, (c) => {
      paperCanvas(c, 180, 252);
      c.strokeStyle = '#9a8a5a';
      c.lineWidth = 2;
      c.strokeRect(5, 5, 170, 242);
      text(c, '번역 공증서', 90, 24, 18, INK, 'center');
      ['위 번역문은 원문과', '다름이 없음을 확인합니다.', '번역인: 건넴말 통번역', `접수 ${wrap(N?.b.n ?? 0, 3) + 12}호`].forEach((s, i) => text(c, s, 14, 60 + i * 22, 13, INK, 'left', false));
      if (signed > 0.02) {
        c.strokeStyle = '#14224e';
        c.lineWidth = 2;
        c.beginPath();
        const steps = Math.max(1, Math.floor(26 * clamp01(signed)));
        for (let i = 0; i <= steps; i++) c.lineTo(22 + i * 3.3, 200 + 11 * Math.sin(i * 0.95) * (1 - i / 40));
        c.stroke();
      }
      if (sealed > 0.02) {
        c.globalAlpha = clamp01(sealed);
        c.strokeStyle = SEAL;
        c.lineWidth = 4;
        c.beginPath();
        c.arc(132, 190, pos(28), 0, 6.3);
        c.stroke();
        c.lineWidth = 1.5;
        c.beginPath();
        c.arc(132, 190, pos(22), 0, 6.3);
        c.stroke();
        text(c, '공증', 132, 190, 20, SEAL, 'center');
        c.globalAlpha = 1;
      }
    });
    at(pen.root, N?.props.pen ?? null, NC.penHome);
    at(stamp, N?.props.stamp ?? null, [NC.stampHome[0], NC.stampHome[1] + STAMP_UP, NC.stampHome[2]]);
    // The client across the counter.
    if ((n.client ?? 0) > 0.5) {
      const f = client.get();
      f.root.visible = true;
      reach.set(NC.away[0] - 0.08, T + 0.04 + (n.clTalks ?? 0) * 0.08 * Math.max(0, Math.sin(t * 3)), NC.away[2] - 0.02);
      f.armR((n.clReach ?? 0) > 0.5 || (n.clTalks ?? 0) > 0.5 ? reach : null);
      f.armL(null);
      nodHead(f, (n.clBow ?? 0) > 0.5 ? 0.34 : 0.12);
    } else client.hide();
  };
  drive(g, out, spots, tools, show);
  out.work = marker(g, NC.doc[0], NC.doc[1], NC.doc[2]);
}

// =============================================================================================
// 연습 코너 (ipPracticeCorner, 2 × 1).

function practiceCorner(g: THREE.Group, out: Built) {
  const T = PC.top;
  part(g, rbox(1.74, 0.04, 0.72, 0.01), OAK, 0, T - 0.02, -0.04);
  for (const sx of [-1, 1]) part(g, box(0.04, T - 0.04, 0.6), GREY_D, sx * 0.82, (T - 0.04) / 2, -0.04, { outline: false });
  // A low sound panel behind: seen over, so no one's hidden.
  part(g, box(1.8, 0.6, 0.05), PANEL, 0, 1.02, -0.45);
  picture(g, painted('ipFoam', 128, 128, foam), 1.72, 0.54, 0, 1.02, -0.423);
  label(g, '쉼표에서 숨 쉬기 · 끝까지 또박또박', 0.84, 0.07, 0.2, 1.22, -0.42, '#fff4b8', '#5b4510');
  chair(g, PC.seat, TEAL);
  // The script lying open; a line keeping the place.
  part(g, box(0.22, 0.006, 0.3), '#d9d2bf', PC.script[0], T + 0.003, PC.script[2], { outline: false });
  const script = liveScreen(g, 0.205, 0.285, 205, 285, PC.script[0], T + 0.0075, PC.script[2], 0, -Math.PI / 2);
  // The note pad and pen; phones on their hook.
  part(g, box(0.15, 0.008, 0.2), '#b09d82', PC.note[0], T + 0.004, PC.note[2], { outline: false });
  const note = liveScreen(g, 0.14, 0.19, 140, 190, PC.note[0], T + 0.0095, PC.note[2], 0, -Math.PI / 2);
  const pen = penTool(g);
  const parked = parkedHeadset(g, 0.72, T, -0.28);
  const worn = headset(g);
  worn.visible = false;
  // A small screen: the takes and their levels.
  const scr = monitor(g, [0.3, 1.0, -0.28], 0.36, 0.22, T, 300, 184);
  deskLamp(g, -0.72, T, -0.26);
  mug(g, 0.58, T, 0.1, '#cfe3dd');
  // The recorder, a hand one: mic on top, a red lamp.
  const rec = group(g);
  rec.name = 'ipRecorder';
  const recBody = group(rec);
  part(recBody, rbox(0.044, 0.13, 0.022, 0.009), '#30373d', 0, 0, 0, { outline: false });
  part(recBody, cyl(0.014, 0.018, 0.024, 10), CHROME, 0, 0.076, 0, { outline: false });
  part(recBody, box(0.028, 0.03, 0.002), '#7be3c7', 0, 0.022, 0.012, { outline: false });
  const recLamp = ownLit(recBody, ball(0.005), '#4a2020', 0, -0.022, 0.012);
  const tools: Partial<Record<IpTool, HeldTool>> = { rec: { tool: rec, lead: 'right', grips: { right: { at: v3(0, -0.015, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.02 } } }, pen: pen.held };
  const spots: Record<string, Spot> = { ipRecord: seatAt(g, 'ipRecord', PC.seat) };
  const show = (_now: string | null, N: IpNow | null, t: number, H: number) => {
    const n = N?.n ?? {};
    wearing(worn, parked, (n.hs ?? 0) > 0.5, N, H);
    at(pen.root, N?.props.pen ?? null, [PC.note[0] + 0.12, T + 0.02, PC.note[2] - 0.1]);
    at(rec, N?.props.rec ?? null, PC.rec);
    recBody.rotation.x = N?.tool === 'rec' ? 0 : -Math.PI / 2;
    setLit(recLamp, (n.recording ?? 0) > 0.5 ? (Math.sin(t * 6) > -0.4 ? '#ff3b30' : '#7a2020') : '#4a2020');
    const follow = n.follow ?? 0;
    script.draw(`${q(follow, 8)}`, (c) => {
      paperCanvas(c, 205, 285);
      text(c, '오늘의 지문', 102, 18, 15, TEAL, 'center');
      for (let i = 0; i < 8; i++) {
        const y = 48 + i * 30;
        if (N && (n.recording ?? 0) > 0.5 && i === Math.floor(clamp01(follow) * 7.99)) {
          c.fillStyle = '#ffe9a8';
          c.fillRect(6, y - 12, 193, 24);
        }
        glyphs(c, 10, y, 186, 15, 3000 + i, INK);
      }
    });
    const lines = n.lines ?? 0;
    note.draw(`${q(lines, 2)}`, (c) => {
      paperCanvas(c, 140, 190, '#fbf8ea');
      if (lines > 0.5) text(c, '2번째 줄 빠름', 6, 20, 13, INK);
      if (lines > 1.5) text(c, '숫자 또박또박', 6, 46, 13, INK);
      if (lines > 2.5) text(c, '끝맺음 ○', 6, 72, 13, RED);
    });
    const recording = (n.recording ?? 0) > 0.5;
    const playing = (n.playing ?? 0) > 0.5;
    const took = n.took ?? 0;
    const p = n.pos ?? 0;
    const beat = recording || playing ? Math.floor(t * 6) : 0;
    scr.draw(`${N ? 1 : 0}|${recording ? 1 : 0}|${playing ? 1 : 0}|${q(took, 16)}|${q(p, 16)}|${beat}`, (c) => {
      c.fillStyle = '#10211f';
      c.fillRect(0, 0, 300, 184);
      text(c, recording ? '● 녹음 중' : playing ? '▶ 다시 듣기' : '연습 녹음기', 12, 18, 16, recording ? '#ff8a80' : '#7be3c7');
      c.fillStyle = '#183532';
      c.fillRect(10, 40, 280, 74);
      const bars = 46;
      const upto = recording ? clamp01(took) : 1;
      for (let i = 0; i < bars; i++) {
        const u = i / bars;
        if (u > upto) break;
        const a = pos(32 * (0.25 + 0.75 * Math.abs(Math.sin(i * 0.77) * Math.cos(i * 0.31))));
        c.fillStyle = playing && u <= clamp01(p) ? '#ffd54f' : '#6fe0cb';
        c.fillRect(12 + i * 6, 77 - a, 4, a * 2);
      }
      if (playing) {
        c.fillStyle = '#ffffff';
        c.fillRect(12 + 276 * clamp01(p), 40, 2, 74);
      }
      text(c, `오늘 ${wrap(N?.b.n ?? 0, 9) + 1}번째 녹음`, 12, 138, 14, '#b2c7c3', 'left', false);
      text(c, '속도 보통 · 정확 좋음', 12, 162, 14, '#b2c7c3', 'left', false);
    });
  };
  drive(g, out, spots, tools, show);
  out.work = marker(g, PC.rec[0], PC.rec[1], PC.rec[2]);
}

// =============================================================================================
// 사무소 안내판 (ipOfficeSign, 1 × 1): decor.

function officeSign(g: THREE.Group) {
  part(g, cyl(0.16, 0.2, 0.03, 16), GRAPHITE, 0, 0.015, -0.1);
  part(g, cyl(0.016, 0.016, 1.2, 10), GRAPHITE, 0, 0.62, -0.1, { outline: false });
  part(g, box(0.72, 1.0, 0.03), WALNUT, 0, 1.0, -0.12);
  const tex = painted('ipSignBoard', 288, 400, (c) => {
    paperCanvas(c, 288, 400, CREAM);
    c.fillStyle = TEAL;
    c.fillRect(0, 0, 288, 92);
    text(c, CO, 144, 34, 34, '#ffffff', 'center');
    text(c, '통번역 사무소', 144, 72, 18, TEAL_L, 'center');
    ['번역 · 감수', '동시 · 순차 통역', '번역 공증 대행', '용어집 제작'].forEach((s, i) => text(c, s, 26, 124 + i * 36, 19, INK, 'left', false));
    c.fillStyle = '#d8ceb6';
    c.fillRect(20, 268, 248, 2);
    for (let i = 0; i < 5; i++) glyphs(c, 24, 290 + i * 22, 240, 14, 4000 + i, GREY_D);
  });
  picture(g, tex, 0.68, 0.96, 0, 1.0, -0.102);
}

export const BUILDERS: Record<string, Builder> = {
  translationDesk(g, _W, _D, _c, _def, _ctx, out) {
    translationDesk(g, out);
  },
  glossaryShelf(g, _W, _D, _c, _def, _ctx, out) {
    glossaryShelf(g, out);
  },
  interpretBooth(g, _W, _D, _c, _def, _ctx, out) {
    interpretBooth(g, out);
  },
  ipMateDesk(g, _W, _D, _c, _def, _ctx, out) {
    mateDesk(g, out);
  },
  ipTermBoard(g, _W, _D, _c, _def, _ctx, out) {
    termBoard(g, out);
  },
  ipMeetingTable(g, _W, _D, _c, _def, _ctx, out) {
    meetingTable(g, out);
  },
  ipNotaryCounter(g, _W, _D, _c, _def, _ctx, out) {
    notaryCounter(g, out);
  },
  ipPracticeCorner(g, _W, _D, _c, _def, _ctx, out) {
    practiceCorner(g, out);
  },
  ipOfficeSign(g) {
    officeSign(g);
  },
};
