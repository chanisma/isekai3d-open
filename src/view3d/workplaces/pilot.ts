import * as THREE from 'three';
import { vroidFigure } from './vroidFigure';
import { marker, rod, shade, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, label, painted, picture, text } from './doctor';
import { CP, CR, GT, KS, OD, SM, TB, WX, cabPt, plNow, plPhase } from './pilotMotion';
import type { PlMotion, PlNow } from './pilotMotion';

/**
 * The 항공사 운항 센터 drawn as itself (2026-10-31 workplace pipeline, at the user's request): flight
 * operations of the made-up 한누리항공. Two full-motion simulators on their hydraulic legs, cut away at the
 * back so the seats, the panels and the picture out of the window can be seen (the picture is drawn live from
 * what the hands are doing); the briefing table with its route chart, a first officer who answers and a load
 * sheet to sign; dispatch desks; a real aeroplane on the ramp for the walk-around, which pushes back when the
 * dweller flies a route; and what the centre was missing: a paper-panel procedures trainer, a weather wall, the
 * crew room with its epaulettes, a fit-to-fly check, and the live fleet board.
 *
 * Everything that moves follows the scripts in pilotMotion.ts. The airline, its routes and airfields
 * (a made-up 한누리 network) and everyone in it are made up.
 */

const AIR = '한누리항공';
const NAVY = '#17325c';
const NAVY_D = '#0f2342';
const CORAL = '#e8505b';
const GOLD = '#d4a640';
const PAPER = '#fbfaf6';
const SHELL = '#eef1f3';
const SCREEN_BG = '#0d1b2a';
const UP = new THREE.Vector3(0, 1, 0);
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3();
type V = readonly [number, number, number];

// ---------------------------------------------------------------------------------------------
// Small parts.

function group(parent: THREE.Object3D, x = 0, y = 0, z = 0, ry = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}
const place = (m: THREE.Object3D, p: V) => m.position.set(p[0], p[1], p[2]);
function ownLit(g: THREE.Object3D, geom: THREE.BufferGeometry, color: string, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color }));
  m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
const setLit = (m: THREE.Mesh, c: string) => (m.material as THREE.MeshBasicMaterial).color.set(c);
function swapPic(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0): { mesh: THREE.Mesh; set: (t: THREE.Texture) => void } {
  const mat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.userData.ownGeometry = mesh.userData.ownMaterial = true;
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, 0, 'YXZ');
  g.add(mesh);
  return {
    mesh,
    set: (t) => {
      if (mat.map === t) return;
      mat.map = t;
      mat.needsUpdate = true;
    },
  };
}
function flat(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0): THREE.Mesh {
  const m = picture(g, tex, w, h, x, y, z);
  m.rotation.set(-Math.PI / 2, ry, 0, 'YXZ');
  return m;
}
/** A sheet of paper lying flat, its middle at the origin. */
function sheet(g: THREE.Object3D, tex: THREE.Texture, w: number, d: number): THREE.Group {
  const s = group(g);
  part(s, box(w, 0.004, d), PAPER, 0, 0.002, 0, { outline: false });
  flat(s, tex, w * 0.98, d * 0.98, 0, 0.0045, 0);
  return s;
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
function pen(g: THREE.Object3D, color = '#1565c0'): THREE.Mesh {
  return part(g, cyl(0.006, 0.006, 0.13, 6), color, 0, 0, 0, { rz: 1.2, ry: 0.5, outline: false });
}
function standAt(g: THREE.Object3D, motion: PlMotion): Spot {
  const s = spot(g, 'stand', 0, 0, 0.6, Math.PI);
  s.motion = motion;
  return s;
}
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
function nowAt(spots: Record<string, Spot>, t: number): string | null {
  let best: string | null = null;
  for (const [k, s] of Object.entries(spots)) if (k !== '*' && Math.abs(t - posedAt(s)) < 0.6 && (best === null || posedAt(s) > posedAt(spots[best]))) best = k;
  return best;
}
/** Every frame: which use is going on and where its script has got to. */
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, show: (now: string | null, N: PlNow | null, t: number, away: boolean) => void) {
  out.spots = spots;
  out.away = (o, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const N = sp ? plNow(sp.motion as PlMotion, t, plPhase(g.getWorldPosition(tmp)), (sp.at.userData.height as number | undefined) ?? 1.6) : null;
    show(now, N, t, o);
  };
}
/** A picture drawn afresh each frame while something's going on: made when first needed, one small canvas each. */
function live(w: number, h: number) {
  let tex: THREE.CanvasTexture | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  return (paint: (c: CanvasRenderingContext2D) => void): THREE.Texture | null => {
    if (typeof document === 'undefined') return null;
    if (!tex) {
      const can = document.createElement('canvas');
      can.width = w;
      can.height = h;
      ctx = can.getContext('2d');
      tex = new THREE.CanvasTexture(can);
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    if (ctx) paint(ctx);
    tex.needsUpdate = true;
    return tex;
  };
}

// ---------------------------------------------------------------------------------------------
// People drawn in.

interface Look {
  top: string;
  bottom: string;
  hair: string;
  hairdo: 'short' | 'bob' | 'bun' | 'grey';
  skin?: string;
  jacket?: string;
  tie?: string;
  bars?: number;
  vest?: string;
  cap?: string;
  glasses?: boolean;
}
const SKIN = '#f1c9a5';
const LOOKS: Record<string, Look> = {
  fo: { top: '#ffffff', bottom: NAVY_D, hair: '#2b1b10', hairdo: 'short', tie: NAVY_D, bars: 3, skin: '#f8d9c0' },
  fo2: { top: '#ffffff', bottom: NAVY_D, hair: '#1f1a17', hairdo: 'bob', tie: NAVY_D, bars: 3 },
  instructor: { top: '#ffffff', bottom: NAVY_D, hair: '#9e9e9e', hairdo: 'grey', tie: NAVY_D, bars: 4, glasses: true, skin: '#eac09a' },
  purser: { top: '#f7f7f7', bottom: NAVY, hair: '#1a1a1a', hairdo: 'bun', jacket: NAVY, tie: CORAL, skin: '#c99a6e' },
  dispatcher: { top: '#dfe7ee', bottom: '#37474f', hair: '#3b2a20', hairdo: 'short', tie: NAVY, glasses: true },
  mechanic: { top: '#37474f', bottom: '#263238', hair: '#2b1b10', hairdo: 'short', vest: '#ffb300', cap: '#ffb300' },
  marshal: { top: '#37474f', bottom: '#263238', hair: '#1f1a17', hairdo: 'short', vest: '#ff7043', cap: '#fafafa' },
};
interface Figure {
  root: THREE.Group;
  head: THREE.Group;
  armL(to: THREE.Vector3 | null): void;
  armR(to: THREE.Vector3 | null): void;
}
function person(parent: THREE.Object3D, look: Look, x: number, z: number, ry: number, seat?: number, floor = 0): Figure {
  const root = group(parent, x, 0, z, ry);
  const skin = look.skin ?? SKIN;
  const shoes = '#2b2b30';
  const sat = seat !== undefined;
  const sh = seat ?? floor;
  const shoulderY = sat ? sh + 0.53 : floor + 1.31;
  const torsoY = sat ? sh + 0.33 : floor + 1.11;
  if (sat) {
    for (const sx of [-1, 1]) {
      const hip = v3(sx * 0.09, sh + 0.07, -0.03);
      const knee = v3(sx * 0.1, sh + 0.1, 0.36);
      const ankle = v3(sx * 0.1, Math.max(floor + 0.1, sh - 0.33), 0.46);
      rod(root, hip, knee, 0.062, look.bottom);
      rod(root, knee, ankle, 0.05, look.bottom);
      part(root, rbox(0.09, 0.07, 0.2, 0.03), shoes, sx * 0.1, ankle.y - 0.035, ankle.z + 0.05);
    }
    part(root, rbox(0.31, 0.15, 0.26, 0.06), look.bottom, 0, sh + 0.08, 0);
  } else {
    for (const sx of [-1, 1]) {
      rod(root, v3(sx * 0.085, floor + 0.84, 0), v3(sx * 0.09, floor + 0.08, 0.01), 0.056, look.bottom);
      part(root, rbox(0.09, 0.07, 0.2, 0.03), shoes, sx * 0.09, floor + 0.035, 0.04);
    }
    part(root, rbox(0.3, 0.17, 0.2, 0.06), look.bottom, 0, floor + 0.88, 0);
  }
  const tz = sat ? -0.02 : 0;
  part(root, rbox(0.34, 0.46, 0.21, 0.08), look.top, 0, torsoY, tz);
  if (look.jacket) {
    for (const sx of [-1, 1]) part(root, rbox(0.13, 0.47, 0.226, 0.05), look.jacket, sx * 0.11, torsoY - 0.01, tz);
    part(root, rbox(0.35, 0.46, 0.1, 0.05), look.jacket, 0, torsoY - 0.01, tz - 0.065);
  }
  if (look.vest) {
    part(root, rbox(0.36, 0.42, 0.225, 0.06), look.vest, 0, torsoY, tz);
    part(root, box(0.365, 0.03, 0.23), '#eceff1', 0, torsoY - 0.06, tz, { outline: false });
  }
  if (look.tie) part(root, box(0.04, 0.24, 0.012), look.tie, 0, shoulderY - 0.14, tz + 0.108, { outline: false });
  if (look.bars) {
    for (const sx of [-1, 1]) {
      part(root, box(0.1, 0.012, 0.08), NAVY_D, sx * 0.12, shoulderY + 0.012, tz, { outline: false });
      for (let i = 0; i < look.bars; i++) part(root, box(0.1, 0.014, 0.008), GOLD, sx * 0.12, shoulderY + 0.016, tz - 0.024 + i * 0.016, { outline: false });
    }
  }
  part(root, cyl(0.045, 0.05, 0.08, 10), skin, 0, shoulderY + 0.06, tz, { outline: false });
  const head = group(root, 0, shoulderY + 0.2, tz);
  part(head, ball(0.112), skin, 0, 0, 0);
  for (const sx of [-1, 1]) part(head, ball(0.012), '#2b2b30', sx * 0.04, 0.0, 0.104, { outline: false });
  part(head, box(0.03, 0.006, 0.004), '#a1665e', 0, -0.045, 0.104, { outline: false });
  switch (look.hairdo) {
    case 'bob':
      part(head, ball(0.122), look.hair, 0, 0.025, -0.03);
      for (const sx of [-1, 1]) part(head, rbox(0.05, 0.16, 0.14, 0.025), look.hair, sx * 0.1, -0.03, -0.02);
      part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0, 0.08, 0.08, { rx: -0.2 });
      break;
    case 'bun':
      part(head, ball(0.118), look.hair, 0, 0.03, -0.03);
      part(head, ball(0.055), look.hair, 0, 0.05, -0.14);
      part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0, 0.08, 0.075, { rx: -0.25 });
      break;
    case 'grey':
      part(head, ball(0.116), look.hair, 0, 0.03, -0.035);
      part(head, rbox(0.19, 0.04, 0.05, 0.02), look.hair, 0.01, 0.08, 0.07, { rx: -0.3, rz: 0.1 });
      break;
    default:
      part(head, ball(0.118), look.hair, 0, 0.03, -0.03);
      part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0, 0.075, 0.075, { rx: -0.25 });
  }
  if (look.glasses) {
    for (const sx of [-1, 1]) part(head, cyl(0.026, 0.026, 0.004, 14), '#37474f', sx * 0.042, 0.002, 0.11, { rx: Math.PI / 2, outline: false });
  }
  if (look.cap) {
    part(head, cyl(0.116, 0.12, 0.05, 14), look.cap, 0, 0.09, -0.01);
    part(head, box(0.14, 0.012, 0.09), look.cap, 0, 0.07, 0.12, { outline: false });
  }
  const arm = (sx: number) => {
    const shoulder = v3(sx * 0.2, shoulderY, tz);
    const rest = sat ? v3(sx * 0.11, sh + 0.16, 0.24) : v3(sx * 0.23, floor + 0.82, 0.05);
    const upper = limb(root, 0.042, look.jacket ?? look.top);
    const lower = limb(root, 0.035, look.jacket ?? look.top);
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
  return { root, head, armL, armR };
}
const vv = (p: V) => v3(p[0], p[1], p[2]);
function airLogo(c: CanvasRenderingContext2D, x: number, y: number, s: number, color = CORAL) {
  c.strokeStyle = color;
  c.lineWidth = s * 0.34;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(x - s, y + s * 0.4);
  c.quadraticCurveTo(x - s * 0.1, y - s * 0.95, x + s, y - s * 0.3);
  c.stroke();
  c.fillStyle = color;
  c.beginPath();
  c.arc(x + s * 0.1, y + s * 0.5, s * 0.25, 0, Math.PI * 2);
  c.fill();
}
/** A plain screen of lines: a title band, then rows. */
function listTex(key: string, title: string, rows: Array<[string, string?]>, band = NAVY, w = 256, h = 160, size = 15): THREE.Texture {
  return painted(key, w, h, (c) => {
    c.fillStyle = SCREEN_BG;
    c.fillRect(0, 0, w, h);
    c.fillStyle = band;
    c.fillRect(0, 0, w, 28);
    text(c, title, 10, 15, 15, '#ffffff');
    rows.forEach(([s, col], i) => text(c, s, 10, 44 + i * (size + 7), size, col ?? '#cfe3ee'));
  });
}
function paperTex(key: string, title: string, rows: string[], w = 128, h = 176, stamp?: string): THREE.Texture {
  return painted(key, w, h, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, w, h);
    c.fillStyle = NAVY;
    c.fillRect(0, 0, w, 22);
    text(c, title, w / 2, 12, 13, '#ffffff', 'center');
    rows.forEach((s, i) => text(c, s, 8, 34 + i * 15, 11, '#37474f'));
    if (stamp) {
      c.strokeStyle = '#c62828';
      c.lineWidth = 2;
      c.strokeRect(w - 62, h - 34, 54, 24);
      text(c, stamp, w - 35, h - 22, 12, '#c62828', 'center');
    }
  });
}

// =============================================================================================
// The picture out of the simulator's window and its panel: drawn live.

function drawOutside(c: CanvasRenderingContext2D, W: number, H: number, n: Record<string, number>, t: number) {
  const pitch = n.pitch ?? 0;
  const roll = n.roll ?? 0;
  c.save();
  c.translate(W / 2, H * 0.5);
  c.rotate(-roll);
  const hy = pitch * H * 1.1;
  const sky = c.createLinearGradient(0, hy - H, 0, hy);
  sky.addColorStop(0, '#2d7fd0');
  sky.addColorStop(1, '#cfeafb');
  c.fillStyle = sky;
  c.fillRect(-W * 1.2, hy - H * 2, W * 2.4, H * 2);
  c.fillStyle = (n.rwy ?? 0) > 0 ? '#6f9a57' : '#54794f';
  c.fillRect(-W * 1.2, hy, W * 2.4, H * 2);
  // Fields sliding past.
  const go = t * (n.spd ?? 0) * 0.02;
  c.fillStyle = '#5b8748';
  for (let i = 0; i < 6; i++) {
    const f = ((i * 0.17 + go * 0.2) % 1) ** 2;
    c.fillRect(-W * (0.9 - (i % 3) * 0.5) - 20, hy + f * H * 0.9, W * 0.4 * (0.2 + f), 3 + f * 20);
  }
  if ((n.rwy ?? 0) > 0.5) {
    const p = n.prog ?? 0;
    if (n.near) {
      // Coming in: far off and small, filling the view at the flare, then down it.
      const s = p < 1 ? 0.06 + 0.94 * p * p : 1;
      const base = hy + H * 0.55 * s;
      const top = hy + 1;
      c.fillStyle = '#3a3f46';
      c.beginPath();
      c.moveTo(-W * 0.55 * s, base);
      c.lineTo(W * 0.55 * s, base);
      c.lineTo(W * 0.012, top);
      c.lineTo(-W * 0.012, top);
      c.fill();
      c.fillStyle = '#ffffff';
      const scroll = p > 1 ? frac(p * 6) : 0;
      for (let i = 0; i < 6; i++) {
        const u = ((i + scroll) / 6) ** 2;
        c.fillRect(-1 - 2 * s * u, top + (base - top) * u, 2 + 4 * s * u, 2 + 14 * s * u);
      }
      if (p < 1) {
        for (let i = 0; i < 4; i++) {
          c.fillStyle = i < 2 ? '#ff5252' : '#ffffff';
          c.fillRect(W * 0.1 * s + i * (3 + 4 * s), hy + H * 0.08 * s, 2 + 2 * s, 2 + 2 * s);
        }
      }
    } else {
      const shrink = p > 1 ? 1 - (p - 1) * 0.5 : 1;
      c.fillStyle = '#3a3f46';
      c.beginPath();
      c.moveTo(-W * 0.55 * shrink, hy + H * 0.6);
      c.lineTo(W * 0.55 * shrink, hy + H * 0.6);
      c.lineTo(W * 0.014, hy + 1);
      c.lineTo(-W * 0.014, hy + 1);
      c.fill();
      c.fillStyle = '#ffffff';
      for (let i = 0; i < 7; i++) {
        const u = ((i + frac(p * 8)) / 7) ** 2;
        c.fillRect(-1 - 2 * u, hy + H * 0.6 * u, 2 + 4 * u, 2 + 12 * u);
      }
    }
  }
  if (n.cloud) {
    c.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 7; i++) {
      const x = (((i * 83 + t * 18) % (W * 2)) - W) * (1 + (i % 2) * 0.3);
      const y = hy - 8 - (i % 4) * 16 + (i % 2) * 34;
      c.beginPath();
      c.ellipse(x, y, 22, 7, 0, 0, 7);
      c.ellipse(x + 15, y - 3, 15, 6, 0, 0, 7);
      c.fill();
    }
  }
  c.restore();
  // The head-up figures.
  text(c, `${Math.round(n.spd ?? 0)}`, 14, H / 2, 16, '#7dff9a');
  text(c, `${Math.round(n.alt ?? 0)}`, W - 14, H / 2, 16, '#7dff9a', 'right');
  c.strokeStyle = '#7dff9a';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(W / 2 - 24, H / 2);
  c.lineTo(W / 2 - 8, H / 2);
  c.lineTo(W / 2, H / 2 + 6);
  c.lineTo(W / 2 + 8, H / 2);
  c.lineTo(W / 2 + 24, H / 2);
  c.stroke();
  if ((n.fire ?? 0) > 0.5) {
    c.fillStyle = 'rgba(198,40,40,0.82)';
    c.fillRect(W / 2 - 66, 8, 132, 28);
    text(c, '1번 엔진 화재', W / 2, 23, 17, '#ffffff', 'center');
  }
  if (n.gMeter) {
    c.fillStyle = 'rgba(0,0,0,0.6)';
    c.fillRect(W / 2 - 34, H - 30, 68, 24);
    text(c, `${(n.g ?? 1).toFixed(1)} G`, W / 2, H - 18, 16, (n.g ?? 1) > 2 ? '#ffb300' : '#7dff9a', 'center');
  }
  if ((n.warn ?? 0) > 0.5 && !(n.fire ?? 0)) {
    c.fillStyle = 'rgba(255,160,0,0.85)';
    c.fillRect(W / 2 - 50, 8, 100, 24);
    text(c, '자세 회복', W / 2, 21, 16, '#1a1a1a', 'center');
  }
  if ((n.done ?? 0) > 0.5) {
    c.fillStyle = 'rgba(13,27,42,0.82)';
    c.fillRect(W / 2 - 60, H - 34, 120, 26);
    text(c, '훈련 평가 양호', W / 2, H - 21, 15, '#ffffff', 'center');
  }
}
const frac = (x: number) => ((x % 1) + 1) % 1;
/** The panel: two sets of flight displays and the warnings in between. */
function drawPanel(c: CanvasRenderingContext2D, W: number, H: number, n: Record<string, number>, t: number) {
  c.fillStyle = '#10161c';
  c.fillRect(0, 0, W, H);
  const att = (x: number) => {
    const sz = H * 0.8;
    c.save();
    c.beginPath();
    c.rect(x, H * 0.1, sz, sz);
    c.clip();
    c.translate(x + sz / 2, H / 2);
    c.rotate(-(n.roll ?? 0));
    const hy = (n.pitch ?? 0) * sz * 1.4;
    c.fillStyle = '#2f86d6';
    c.fillRect(-sz, hy - sz * 2, sz * 2, sz * 2);
    c.fillStyle = '#8a5a2b';
    c.fillRect(-sz, hy, sz * 2, sz * 2);
    c.restore();
    c.fillStyle = '#ffd54f';
    c.fillRect(x + sz * 0.2, H / 2 - 1, sz * 0.6, 3);
  };
  const nav = (x: number) => {
    const r = H * 0.38;
    c.fillStyle = '#05080c';
    c.fillRect(x, H * 0.1, r * 2 + 2, H * 0.8);
    c.strokeStyle = '#7dff9a';
    c.beginPath();
    c.arc(x + r, H / 2, r * 0.8, 0, 7);
    c.stroke();
    c.strokeStyle = '#ff5cf0';
    c.beginPath();
    c.moveTo(x + r, H / 2);
    c.lineTo(x + r + r * 0.6 * Math.sin(t * 0.2), H * 0.18);
    c.stroke();
  };
  const u = H * 0.82 + 4;
  att(4);
  nav(4 + u);
  // The warning display at the middle.
  const mx = W / 2 - 36;
  c.fillStyle = '#05080c';
  c.fillRect(mx, H * 0.08, 72, H * 0.84);
  const f = n.fire ?? 0;
  text(c, f > 0.1 ? '엔진 1 화재' : `추력 ${Math.round((n.thr ?? 0) * 100)}`, mx + 4, H * 0.24, 10, f > 0.1 ? '#ff5252' : '#7dff9a');
  text(c, n.gear ?? 1 ? '바퀴 내림' : '바퀴 올림', mx + 4, H * 0.48, 10, n.gear ?? 1 ? '#7dff9a' : '#cfd8dc');
  text(c, (n.agent ?? 0) > 0.5 ? '소화 완료' : `플랩 ${Math.round((n.flap ?? 0) * 3)}`, mx + 4, H * 0.72, 10, (n.agent ?? 0) > 0.5 ? '#ffb300' : '#cfd8dc');
  att(W - 4 - u * 2 + 4);
  nav(W - 4 - u + 4);
}

// =============================================================================================
// 비행 시뮬레이터.

const dwellerIdleTex = painted('plSimIdle', 128, 80, (c) => {
  c.fillStyle = '#111921';
  c.fillRect(0, 0, 128, 80);
  airLogo(c, 64, 30, 15);
  text(c, '시뮬레이터 대기', 64, 58, 12, '#90a4ae', 'center');
});
const panelIdleTex = painted('plPanelIdle', 32, 16, (c) => {
  c.fillStyle = '#10161c';
  c.fillRect(0, 0, 32, 16);
});
const overheadTex = painted('plOverhead', 256, 128, (c) => {
  c.fillStyle = '#5d6d7a';
  c.fillRect(0, 0, 256, 128);
  c.strokeStyle = '#ffffff';
  for (let col = 0; col < 8; col++) {
    c.strokeRect(6 + col * 31, 8, 28, 112);
    for (let r = 0; r < 5; r++) {
      c.fillStyle = (col + r) % 3 === 0 ? '#ffffff' : '#263238';
      c.fillRect(11 + col * 31, 14 + r * 21, 18, 12);
    }
  }
});
function seatChair(g: THREE.Object3D, x: number, z: number, top: number, floor: number, color = NAVY) {
  part(g, cyl(0.07, 0.1, top - floor - 0.05, 10), '#37474f', x, floor + (top - floor) / 2 - 0.03, z, { outline: false });
  part(g, rbox(0.46, 0.08, 0.44, 0.04), color, x, top - 0.04, z);
  // Low backs, so whoever's in them can be seen from behind.
  part(g, rbox(0.42, 0.42, 0.07, 0.04), color, x, top + 0.22, z + 0.24, { rx: -0.08 });
  for (const sx of [-1, 1]) part(g, box(0.05, 0.03, 0.26), '#263238', x + sx * 0.25, top + 0.2, z + 0.02, { outline: false });
}
function flightSimulator(g: THREE.Group, out: Built) {
  const D = SM.deck;
  // The pit: a steel pad, hazard stripes, a low rail.
  part(g, box(3.5, 0.06, 3.5), '#59626b', 0, 0.03, -0.2);
  const hazard = painted('plHazard', 128, 16, (c) => {
    c.fillStyle = '#ffc107';
    c.fillRect(0, 0, 128, 16);
    c.fillStyle = '#1a1a1a';
    for (let i = 0; i < 9; i++) {
      c.beginPath();
      c.moveTo(i * 16, 16);
      c.lineTo(i * 16 + 8, 16);
      c.lineTo(i * 16 + 16, 0);
      c.lineTo(i * 16 + 8, 0);
      c.fill();
    }
  });
  flat(g, hazard, 3.46, 0.1, 0, 0.065, 1.47);
  // The six legs.
  const LO: V[] = [[-1.2, 0.08, -1.4], [-0.5, 0.08, -1.55], [1.2, 0.08, -1.4], [0.5, 0.08, -1.55], [-0.6, 0.08, 1.05], [0.6, 0.08, 1.05]];
  const HI: V[] = [[-0.7, D - 0.08, -1.2], [-0.45, D - 0.08, -1.25], [0.7, D - 0.08, -1.2], [0.45, D - 0.08, -1.25], [-0.25, D - 0.08, 0.72], [0.25, D - 0.08, 0.72]];
  const lego = LO.map((p) => {
    part(g, cyl(0.1, 0.13, 0.08, 10), '#37474f', p[0], 0.1, p[2], { outline: false });
    return { lo: vv(p), barrel: limb(g, 0.07, '#4f6170'), rod: limb(g, 0.035, CHROME) };
  });
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const setLegs = (m: { rx: number; rz: number; hv: number }) => {
    lego.forEach((L, i) => {
      a.copy(L.lo);
      const h = cabPt(HI[i], m);
      b.set(h[0], h[1], h[2]);
      const mid = a.clone().lerp(b, 0.56);
      L.barrel(a, mid);
      L.rod(mid, b);
    });
  };
  setLegs({ rx: 0, rz: 0, hv: 0 });

  // The stairs and gangway on the left.
  const SX = -1.6;
  const TOPZ = 0.92;
  const BOTZ = 1.92;
  for (let i = 0; i < 7; i++) {
    const u = i / 7;
    part(g, box(0.56, 0.03, 0.2), '#78909c', SX, 0.1 + u * (D - 0.1), BOTZ - u * (BOTZ - TOPZ));
  }
  for (const sx of [-1, 1]) {
    rod(g, v3(SX + sx * 0.3, 0, BOTZ + 0.05), v3(SX + sx * 0.3, D, TOPZ), 0.022, '#546e7a');
    rod(g, v3(SX + sx * 0.3, 0.9, BOTZ + 0.05), v3(SX + sx * 0.3, D + 0.9, TOPZ), 0.015, '#ffc107');
    part(g, cyl(0.02, 0.02, 0.9, 6), '#ffc107', SX + sx * 0.3, 0.45, BOTZ + 0.05, { outline: false });
    part(g, cyl(0.02, 0.02, 0.9, 6), '#ffc107', SX + sx * 0.3, D + 0.45, TOPZ, { outline: false });
  }
  part(g, box(0.7, 0.05, 0.78), '#78909c', SX, D - 0.03, 0.54);
  for (const [x, z] of [[-1.92, 0.16], [-1.92, 0.93], [-1.26, 0.16]] as const) {
    part(g, cyl(0.03, 0.03, D, 8), '#546e7a', x, D / 2, z, { outline: false });
    part(g, cyl(0.015, 0.015, 0.9, 6), '#ffc107', x, D + 0.45, z, { outline: false });
  }
  part(g, box(0.02, 0.02, 0.78), '#ffc107', -1.92, D + 0.9, 0.54, { outline: false });
  part(g, box(0.66, 0.02, 0.02), '#ffc107', -1.59, D + 0.9, 0.16, { outline: false });
  // The bridge, hinged at the gangway: lifted away before the motion comes on.
  const bridge = group(g, -1.25, D - 0.02, 0.5);
  part(bridge, box(0.3, 0.035, 0.56), '#90a4ae', 0.15, 0, 0);
  part(bridge, box(0.02, 0.3, 0.02), '#ffc107', 0.28, 0.15, 0.27, { outline: false });
  part(bridge, box(0.02, 0.3, 0.02), '#ffc107', 0.28, 0.15, -0.27, { outline: false });
  label(g, '작동 중 접근 금지', 0.7, 0.14, SX + 0.0, 0.6, 1.7, '#ffc107', '#1a1a1a');
  // The instructor's console by the stairs' foot, on the floor.
  part(g, rbox(0.42, 0.9, 0.3, 0.03), '#37474f', 0.95, 0.45, 1.55);
  const repeater = swapPic(g, 0.36, 0.24, 0.95, 1.02, 1.67, 0, -0.4);
  repeater.set(dwellerIdleTex);
  const beacon = ownLit(g, cyl(0.05, 0.05, 0.08, 10), '#5c1a1a', 1.08, 0.94, 1.5);
  label(g, '모션 베이스 제어', 0.36, 0.07, 0.95, 0.72, 1.706, '#37474f', '#ffffff');

  // The cab, on the legs. The inner group is laid out as the piece, the cab turning about the pivot.
  const cab = group(g, SM.pivot[0], SM.pivot[1], SM.pivot[2]);
  const inner = group(cab, -SM.pivot[0], -SM.pivot[1], -SM.pivot[2]);
  // Floor and underbelly.
  part(inner, rbox(2.06, 0.1, 2.56, 0.04), '#cfd6db', 0, D - 0.05, -0.3);
  part(inner, box(1.7, 0.12, 2.2), '#8796a1', 0, D - 0.15, -0.3);
  part(inner, box(1.92, 0.004, 2.42), '#3c4a55', 0, D + 0.003, -0.3, { outline: false });
  // The shell: tall at the nose, cut down behind so you can see in.
  for (const sx of [-1, 1]) {
    part(inner, box(0.06, 2.1, 0.8), SHELL, sx * 1.0, D + 1.05, -1.2);
    part(inner, box(0.06, 1.3, 0.36), SHELL, sx * 1.0, D + 0.65, -0.62);
    part(inner, box(0.06, 0.82, 0.2), SHELL, sx * 1.0, D + 0.41, 0.84);
  }
  part(inner, box(0.06, 0.82, 1.0), SHELL, 1.0, D + 0.41, 0.24);
  part(inner, box(0.06, 0.82, 0.8), SHELL, -1.0, D + 0.41, -0.05);
  part(inner, box(2.06, 2.16, 0.08), SHELL, 0, D + 1.08, -1.6);
  // Coral sweep and the name on the outer wall that faces the room.
  part(inner, box(0.065, 0.08, 1.2), CORAL, 1.0, D + 0.55, 0.0, { outline: false });
  part(inner, box(0.065, 0.08, 0.8), CORAL, -1.0, D + 0.55, -0.15, { outline: false });
  label(inner, AIR, 0.72, 0.16, 1.035, D + 0.3, 0.2, SHELL, NAVY, Math.PI / 2);
  // The picture out of the window.
  part(inner, box(1.94, 0.96, 0.03), '#0a0f14', 0, D + 1.58, -1.53);
  const view = swapPic(inner, 1.88, 0.9, 0, D + 1.58, -1.51);
  view.set(dwellerIdleTex);
  // Glareshield, main panel, side consoles, pedestal.
  part(inner, box(1.94, 0.7, 0.8), '#3b464f', 0, D + 0.75, -1.15);
  part(inner, rbox(1.9, 0.08, 0.2, 0.03), '#22292f', 0, D + 1.14, -0.72);
  const panel = swapPic(inner, 1.66, 0.34, 0, D + 0.86, -0.748);
  panel.set(panelIdleTex);
  // 자동 비행 패널 along the glareshield.
  part(inner, box(1.0, 0.07, 0.04), '#5d6d7a', -0.02, D + 1.08, -0.62, { outline: false });
  for (let i = 0; i < 6; i++) part(inner, cyl(0.016, 0.016, 0.02, 8), '#eceff1', -0.42 + i * 0.16, D + 1.08, -0.595, { rx: Math.PI / 2, outline: false });
  const master = ownLit(inner, box(0.07, 0.04, 0.03), '#4a1a1a', SM.master[0], SM.master[1], SM.master[2]);
  const masterR = ownLit(inner, box(0.07, 0.04, 0.03), '#4a1a1a', -SM.master[0], SM.master[1], SM.master[2]);
  // The gear lever, on the panel to the right of the middle.
  part(inner, box(0.1, 0.22, 0.012), '#263238', SM.gear[0], SM.gear[1], -0.745, { outline: false });
  const gear = group(inner, SM.gear[0], SM.gear[1], -0.72);
  part(gear, cyl(0.009, 0.009, 0.06, 6), CHROME, 0, 0, 0.0, { rx: Math.PI / 2, outline: false });
  part(gear, cyl(0.026, 0.026, 0.03, 10), '#eceff1', 0, 0, 0.04);
  const gearLamp = ownLit(inner, box(0.03, 0.02, 0.006), '#43a047', SM.gear[0] + 0.07, SM.gear[1] + 0.05, -0.742);
  // The pedestal between the seats.
  part(inner, rbox(0.34, 0.6, 0.62, 0.02), '#3b464f', 0, D + 0.3, -0.42);
  part(inner, box(0.32, 0.01, 0.6), '#22292f', 0, D + 0.605, -0.42, { outline: false });
  const levers: THREE.Group[] = [];
  for (const sx of [-0.045, 0.045]) {
    const lv = group(inner, sx, SM.thrPivot[1], SM.thrPivot[2]);
    part(lv, box(0.022, 0.2, 0.018), '#90a4ae', 0, 0.1, 0, { outline: false });
    part(lv, rbox(0.075, 0.03, 0.04, 0.01), '#eceff1', 0, 0.2, 0);
    levers.push(lv);
  }
  const flapL = group(inner, SM.flap[0], SM.flap[1] - 0.05, SM.flap[2]);
  part(flapL, box(0.012, 0.1, 0.012), '#90a4ae', 0, 0.02, 0, { outline: false });
  part(flapL, rbox(0.05, 0.02, 0.04, 0.008), '#eceff1', 0, 0.07, 0);
  // The engine master switches, with their red fire lamps; the card and mic in their clips.
  const eng = group(inner, SM.engMaster[0], SM.engMaster[1] - 0.05, SM.engMaster[2]);
  part(eng, cyl(0.012, 0.012, 0.05, 6), '#c62828', 0, 0.02, 0, { outline: false });
  part(inner, cyl(0.012, 0.012, 0.05, 6), '#c62828', -0.08, SM.engMaster[1] - 0.03, SM.engMaster[2], { outline: false });
  const card = group(inner);
  part(card, box(0.13, 0.19, 0.006), '#fff8e1', 0, 0, 0);
  label(card, '체크리스트', 0.11, 0.03, 0, 0.075, 0.004, NAVY, '#ffffff');
  card.rotation.x = -0.5;
  place(card, SM.card);
  const mic = group(inner);
  part(mic, rbox(0.04, 0.09, 0.03, 0.01), BLACK, 0, 0, 0);
  place(mic, SM.mic);
  // Side consoles and sticks.
  const sticks: THREE.Group[] = [];
  for (const [sx, p] of [[-1, SM.stick], [1, SM.foStick]] as const) {
    part(inner, rbox(0.27, 0.6, 0.76, 0.02), '#3b464f', sx * 0.84, D + 0.3, -0.25);
    part(inner, box(0.1, 0.05, 0.1), '#22292f', p[0], p[1] - 0.02, p[2], { outline: false });
    const s = group(inner, p[0], p[1], p[2]);
    part(s, cyl(0.015, 0.02, 0.1, 8), '#22292f', 0, 0.05, 0, { outline: false });
    part(s, rbox(0.05, 0.08, 0.05, 0.02), '#2b2b30', 0, 0.12, 0);
    sticks.push(s);
  }
  // Seats.
  seatChair(inner, SM.capt[0], SM.capt[2], SM.seatY, D);
  seatChair(inner, SM.fo[0], SM.fo[2], SM.seatY, D);
  seatChair(inner, SM.inst[0], SM.inst[2], SM.seatY, D, '#5d6d7a');
  // The overhead, on two slim posts; its fire buttons.
  part(inner, box(0.96, 0.04, 0.5), '#3b464f', 0, D + 1.66, -0.28);
  for (const sx of [-1, 1]) part(inner, box(0.03, 0.72, 0.03), '#3b464f', sx * 0.47, D + 1.28, -0.74, { outline: false });
  for (const sx of [-1, 1]) rod(inner, v3(sx * 0.47, D + 1.64, -0.72), v3(sx * 0.47, D + 1.64, -0.1), 0.012, '#3b464f');
  const over = picture(inner, overheadTex, 0.9, 0.44, 0, D + 1.635, -0.28);
  over.rotation.x = Math.PI / 2;
  const fireBtn = ownLit(inner, box(0.07, 0.015, 0.05), '#5c1a1a', SM.fire[0], SM.fire[1] + 0.02, SM.fire[2]);
  const agentBtn = ownLit(inner, box(0.07, 0.015, 0.05), '#6d5a1a', SM.agent[0], SM.agent[1] + 0.02, SM.agent[2]);
  // A red wash inside when the fire bell rings.
  const washMat = new THREE.MeshBasicMaterial({ color: '#ff2a1a', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const wash = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.9, 2.3), washMat);
  wash.userData.ownGeometry = wash.userData.ownMaterial = true;
  wash.position.set(0, D + 0.97, -0.3);
  wash.visible = false;
  inner.add(wash);
  // Who's aboard: the first officer (right seat), the instructor behind with their tablet.
  const fo = person(inner, LOOKS.fo, SM.fo[0], SM.fo[2], Math.PI, SM.seatY, D);
  const inst = person(inner, LOOKS.instructor, SM.inst[0], SM.inst[2], Math.PI, SM.seatY, D);
  const ipad = group(inner, 0, SM.seatY + 0.28, SM.inst[2] - 0.3);
  part(ipad, rbox(0.22, 0.012, 0.16, 0.008), BLACK, 0, 0, 0, { rx: 0.5 });
  const ipadS = ownLit(ipad, box(0.19, 0.003, 0.13), '#7ec4e8', 0, 0.008, 0);
  ipadS.rotation.x = 0.5;
  fo.root.visible = inst.root.visible = ipad.visible = false;

  const spots: Record<string, Spot> = {
    simTraining: standAt(g, 'plSimFly'),
    emergencyDrill: standAt(g, 'plSimFire'),
    pilot_pilotFlying: standAt(g, 'plSimLand'),
    pilot_gForceTraining: standAt(g, 'plSimUpset'),
  };
  spots['*'] = spots.simTraining;
  const outside = live(256, 124);
  const dash = live(256, 52);
  const leverA = levers[0];
  const leverB = levers[1];
  let was = false;
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    const used = !!now;
    if (used) {
      was = true;
      const rest = n.rest ?? 0;
      cab.rotation.set(n.rx ?? 0, 0, n.rz ?? 0);
      cab.position.y = SM.pivot[1] + (n.hv ?? 0);
      setLegs({ rx: n.rx ?? 0, rz: n.rz ?? 0, hv: n.hv ?? 0 });
      bridge.rotation.z = 1.35 * (n.bridge ?? 0);
      setLit(beacon, (n.beacon ?? 0) > 0.5 && Math.sin(t * 6) > 0 ? '#ff3b30' : '#5c1a1a');
      const pic = outside((c) => {
        if ((n.lit ?? 0) < 0.3 || rest > 0.5) {
          c.fillStyle = '#111921';
          c.fillRect(0, 0, 256, 124);
          airLogo(c, 128, 46, 20);
          text(c, '시뮬레이터 대기', 128, 86, 15, '#90a4ae', 'center');
        } else drawOutside(c, 256, 124, n, t);
      });
      if (pic) {
        view.set(pic);
        repeater.set(pic);
      }
      const dp = dash((c) => {
        if (rest > 0.5) {
          c.fillStyle = '#10161c';
          c.fillRect(0, 0, 256, 52);
        } else drawPanel(c, 256, 52, n, t);
      });
      if (dp) panel.set(dp);
      const thr = n.thr ?? 0;
      leverA.rotation.x = 0.5 - (n.thr1 !== undefined ? n.thr1 : thr);
      leverB.rotation.x = 0.5 - thr;
      leverA.position.y = leverB.position.y = SM.thrPivot[1] + 0.05 * (n.rev ?? 0);
      gear.position.y = SM.gear[1] + (1 - (n.gear ?? 1)) * 0.07 - 0.03;
      setLit(gearLamp, (n.gear ?? 1) > 0.6 ? '#43a047' : (n.gear ?? 1) > 0.3 ? '#e53935' : '#20262b');
      flapL.position.z = SM.flap[2] + 0.08 * (n.flap ?? 0);
      eng.rotation.x = (n.eng ?? 1) > 0.5 ? 0 : 0.7;
      sticks[0].rotation.set(0.36 * (n.sy ?? 0), 0, -0.36 * (n.sx ?? 0));
      sticks[1].rotation.set(0.3 * (n.sy ?? 0), 0, -0.3 * (n.sx ?? 0));
      const fire = n.fire ?? 0;
      const warn = (n.warn ?? 0) > 0.5;
      setLit(master, warn && Math.sin(t * 9) > 0 ? '#ff3b30' : '#4a1a1a');
      setLit(masterR, warn && Math.sin(t * 9) > 0 ? '#ff3b30' : '#4a1a1a');
      setLit(fireBtn, fire > 0.1 ? (Math.sin(t * 9) > 0 ? '#ff3b30' : '#a82020') : (n.btn ?? 0) > 0.5 ? '#ffb300' : '#5c1a1a');
      setLit(agentBtn, (n.agent ?? 0) > 0.5 ? '#43a047' : (n.btn ?? 0) > 0.5 ? '#ffd54f' : '#6d5a1a');
      wash.visible = fire > 0.1;
      washMat.opacity = 0.16 * fire;
      // The card and the mic: in the hand, or back in their clips.
      const pc = N?.props.card;
      place(card, pc ?? SM.card);
      card.rotation.x = pc ? -0.9 : -0.5;
      place(mic, N?.props.mic ?? SM.mic);
      // First officer.
      const aboard = rest < 0.5;
      fo.root.visible = inst.root.visible = ipad.visible = aboard;
      const fa = Math.round(n.foAct ?? 0);
      const fs = v3(SM.foStick[0], SM.foStick[1] + 0.14, SM.foStick[2]);
      fo.armR(fa === 3 ? null : fs);
      fo.armL(fa === 1 ? v3(0.3, D + 1.0, -0.62 + 0.02 * Math.sin(t * 3)) : fa === 2 ? v3(SM.flap[0], SM.flap[1] + 0.06, SM.flap[2]) : fa === 3 ? v3(0.0, D + 0.9, -0.72) : fa === 4 ? v3(0.22, D + 0.95, -0.25) : null);
      fo.head.rotation.y = fa === 3 ? -0.5 : fa === 4 ? -0.8 : 0.1 * Math.sin(t * 0.7);
      fo.head.rotation.x = fa === 3 ? 0.3 : 0;
      // Instructor.
      const ia = Math.round(n.inst ?? 0);
      inst.armR(ia === 1 ? v3(-0.2, D + 1.2, 0.3) : ia === 2 ? v3(-0.2, D + 1.28, 0.42) : v3(-0.09, SM.seatY + 0.3, SM.inst[2] - 0.3));
      inst.armL(v3(0.09, SM.seatY + 0.28 + (ia === 3 ? 0.012 * Math.sin(t * 12) : 0), SM.inst[2] - 0.32));
      inst.head.rotation.x = ia === 3 || ia === 0 ? 0.35 : 0;
      setLit(ipadS, ia === 3 ? '#ffb300' : '#7ec4e8');
    } else if (was) {
      was = false;
      cab.rotation.set(0, 0, 0);
      cab.position.y = SM.pivot[1];
      setLegs({ rx: 0, rz: 0, hv: 0 });
      bridge.rotation.z = 0;
      view.set(dwellerIdleTex);
      repeater.set(dwellerIdleTex);
      panel.set(panelIdleTex);
      fo.root.visible = inst.root.visible = ipad.visible = false;
      wash.visible = false;
      setLit(beacon, '#5c1a1a');
      leverA.rotation.x = leverB.rotation.x = 0.5;
      place(card, SM.card);
      place(mic, SM.mic);
    }
  });
  out.work = marker(g, 0, D + 0.9, -0.4);
}

// =============================================================================================
// 브리핑 테이블.

const SCREEN_TEX: Record<number, () => THREE.Texture> = {
  0: () => listTex('plBr0', '한누리 702 · 비행 전 브리핑', [['출발  누리공항 09:40'], ['도착  한빛공항 11:25'], ['기장 / 부기장 확인'], ['브리핑 시작 대기', '#ffd54f']]),
  1: () => painted('plBr1', 256, 160, (c) => {
    c.fillStyle = SCREEN_BG;
    c.fillRect(0, 0, 256, 160);
    c.fillStyle = '#0277bd';
    c.fillRect(0, 0, 256, 28);
    text(c, '기상 · 도착지 예보', 10, 15, 15, '#ffffff');
    text(c, '바람 260도 / 14노트', 10, 48, 15, '#cfe3ee');
    text(c, '시정 8km · 구름 3000ft', 10, 70, 15, '#cfe3ee');
    text(c, '돌풍 26노트 예상', 10, 92, 15, '#ffb300');
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.ellipse(200, 128, 32, 14, 0, 0, 7);
    c.fill();
    c.fillStyle = '#90a4ae';
    c.beginPath();
    c.ellipse(170, 136, 24, 10, 0, 0, 7);
    c.fill();
  }),
  2: () => listTex('plBr2', '항공고시보 (NOTAM)', [['활주로 09L 야간 공사', '#ffb300'], ['ILS 15R 점검 14-16시'], ['유도로 C 폐쇄'], ['조류 활동 주의', '#ffb300']], '#6a1b9a'),
  3: () => painted('plBr3', 256, 160, (c) => {
    c.fillStyle = '#10243c';
    c.fillRect(0, 0, 256, 160);
    c.fillStyle = '#1565c0';
    c.fillRect(0, 0, 256, 26);
    text(c, '항로 · 누리 → 한빛', 10, 14, 15, '#ffffff');
    c.strokeStyle = '#2e4a68';
    for (let i = 0; i < 8; i++) {
      c.beginPath();
      c.moveTo(i * 36, 26);
      c.lineTo(i * 36, 160);
      c.stroke();
    }
    c.strokeStyle = '#ff5cf0';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(26, 132);
    c.lineTo(84, 92);
    c.lineTo(156, 80);
    c.lineTo(226, 46);
    c.stroke();
    for (const [x, y, s] of [[26, 132, '누리'], [84, 92, 'MIRAE'], [156, 80, 'GARAM'], [226, 46, '한빛']] as const) {
      c.fillStyle = '#ffffff';
      c.fillRect(x - 3, y - 3, 6, 6);
      text(c, s, x + 6, y + 12, 12, '#cfe3ee');
    }
  }),
  4: () => painted('plBr4', 256, 160, (c) => {
    c.fillStyle = SCREEN_BG;
    c.fillRect(0, 0, 256, 160);
    c.fillStyle = '#ef6c00';
    c.fillRect(0, 0, 256, 28);
    text(c, '연료 · 탑재', 10, 15, 15, '#ffffff');
    const bar = (y: number, name: string, v: number, col: string) => {
      text(c, name, 10, y + 8, 13, '#cfe3ee');
      c.fillStyle = col;
      c.fillRect(82, y, v, 16);
      text(c, `${Math.round(v * 40)}kg`, 86 + v, y + 8, 12, '#ffffff');
    };
    bar(40, '운항', 90, '#42a5f5');
    bar(66, '대체', 34, '#66bb6a');
    bar(92, '예비', 18, '#ffb300');
    bar(118, '합계', 142, '#ef5350');
  }),
  5: () => listTex('plBr5', '브리핑 완료', [['기상 · 고시보 확인'], ['연료 5,680kg 승인'], ['탑재 관리표 서명'], ['09:10 승무원 집합', '#7dff9a']], '#2e7d32'),
  6: () => painted('plBr6', 256, 160, (c) => {
    c.fillStyle = SCREEN_BG;
    c.fillRect(0, 0, 256, 160);
    c.fillStyle = NAVY;
    c.fillRect(0, 0, 256, 26);
    text(c, '비행 자료 다시 보기 · 접근 구간', 10, 14, 14, '#ffffff');
    c.strokeStyle = '#66bb6a';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(12, 40);
    c.lineTo(240, 132);
    c.stroke();
    c.strokeStyle = '#ffb300';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(12, 40);
    c.quadraticCurveTo(110, 42, 150, 90);
    c.quadraticCurveTo(190, 118, 240, 132);
    c.stroke();
    text(c, '500ft 안정 강하', 130, 60, 13, '#ffb300');
  }),
  7: () => listTex('plBr7', '승무원 의견', [['난기류 전 방송 시점'], ['객실 준비 완료 보고'], ['탑승 지연 14분'], ['게이트 변경 공유', '#ffd54f']], '#b0446a'),
  8: () => listTex('plBr8', '다음 비행에 지킬 것', [['1. 안정 접근 기준 지키기', '#7dff9a'], ['2. 객실과 일찍 소통하기', '#7dff9a']], '#2e7d32'),
  9: () => listTex('plBr9', '강평 완료', [['고생하셨습니다'], ['다음 근무 09:00']], NAVY),
};
const screenTex = (i: number) => (SCREEN_TEX[i] ?? SCREEN_TEX[0])();
const chartTex = painted('plChart', 512, 256, (c) => {
  c.fillStyle = '#e7efe4';
  c.fillRect(0, 0, 512, 256);
  c.fillStyle = '#bcdcea';
  c.beginPath();
  c.moveTo(0, 170);
  c.quadraticCurveTo(160, 140, 250, 256);
  c.lineTo(0, 256);
  c.fill();
  c.strokeStyle = '#90a4ae';
  for (let i = 0; i < 11; i++) {
    c.beginPath();
    c.moveTo(i * 50, 0);
    c.lineTo(i * 50, 256);
    c.moveTo(0, i * 30);
    c.lineTo(512, i * 30);
    c.stroke();
  }
  c.strokeStyle = '#1565c0';
  c.lineWidth = 2;
  for (const [x, y] of [[60, 60], [270, 170], [430, 60]]) {
    c.beginPath();
    c.arc(x, y, 34, 0, 7);
    c.stroke();
  }
  text(c, '누리', 60, 138, 20, '#0f2342');
  text(c, '한빛', 440, 118, 20, '#0f2342');
  text(c, '항로도', 256, 22, 18, '#37474f', 'center');
});
const notamTexes = [0, 1, 2, 3].map((i) => paperTex(`plNotam${i}`, '항공고시보', [`${i + 1}/4쪽`, '활주로 09L 공사', '유도로 C 폐쇄', '조류 주의']));
const wxPaper = paperTex('plWxPaper', '기상 자료', ['도착지 예보', '돌풍 26노트', '구름 3000ft', '교체: 누리']);
const fuelPaper = paperTex('plFuelPaper', '연료 계산', ['운항 3,600', '대체 1,360', '예비 720', '합계 5,680']);
const loadPaper = paperTex('plLoad', '탑재 관리표', ['승객 142명', '화물 3,120kg', '이륙 중량 62t', '무게중심 27%', '기장 서명:']);
const loadPaper2 = paperTex('plLoad2', '탑재 관리표', ['승객 142명', '화물 3,120kg', '이륙 중량 62t', '무게중심 27%', '기장 서명:   OK'], 128, 176, '확인');
const debriefTex = paperTex('plDebriefSheet', '비행 강평', ['1. 안정 접근', '2. 객실 소통', '3. 지연 공유', '다음 비행에']);
const calcTexes = ['0', '3,600', '4,960', '5,680'].map((s, i) => painted(`plCalc${i}`, 96, 32, (c) => {
  c.fillStyle = '#b5c9a0';
  c.fillRect(0, 0, 96, 32);
  text(c, s, 90, 16, 22, '#1a2a12', 'right');
}));
function calculator(g: THREE.Object3D): THREE.MeshBasicMaterial {
  const t = group(g);
  part(t, rbox(0.11, 0.015, 0.16, 0.006), '#37474f', 0, 0.008, 0);
  const m = flat(t, calcTexes[0], 0.09, 0.03, 0, 0.0165, -0.05);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) part(t, box(0.022, 0.004, 0.016), '#cfd8dc', -0.03 + j * 0.03, 0.017, -0.012 + i * 0.024, { outline: false });
  return m.material as THREE.MeshBasicMaterial;
}
function tableChair(g: THREE.Object3D, x: number, z: number, ry: number) {
  const c = group(g, x, 0, z, ry);
  part(c, cyl(0.04, 0.04, 0.4, 8), '#37474f', 0, 0.22, 0, { outline: false });
  part(c, cyl(0.2, 0.22, 0.03, 12), '#37474f', 0, 0.02, 0);
  part(c, rbox(0.44, 0.06, 0.42, 0.03), NAVY, 0, 0.44, 0);
  part(c, rbox(0.42, 0.42, 0.05, 0.03), NAVY, 0, 0.72, -0.2, { rx: -0.08 });
}
function briefingTable(g: THREE.Group, out: Built) {
  const T = TB.top;
  const z0 = -0.02;
  part(g, rbox(3.1, 0.05, 0.88, 0.03), '#6b4f3a', 0, T - 0.025, z0);
  part(g, box(3.0, 0.02, 0.8), '#7b5c44', 0, T - 0.052, z0, { outline: false });
  for (const x of [-1.15, 1.15]) {
    part(g, rbox(0.12, T - 0.08, 0.5, 0.02), '#37474f', x, (T - 0.08) / 2, z0);
    part(g, box(0.5, 0.03, 0.6), '#37474f', x, 0.015, z0);
  }
  part(g, box(0.05, 0.05, 0.4), '#2b2b30', 0, 0.68, z0, { outline: false });
  // The chart across the middle, with its route coming alight.
  flat(g, chartTex, 1.5, 0.52, 0.3, T + 0.003, -0.1);
  const route = ownLit(g, box(1, 0.003, 0.012), '#e91e63', TB.chartFrom[0], T + 0.007, -0.1);
  route.scale.x = 0.001;
  for (const [x, z] of [[-0.3, -0.08], [0.88, -0.12]] as const) part(g, cyl(0.016, 0.016, 0.03, 8), CORAL, x, T + 0.02, z, { outline: false });
  // What's on the table.
  const wx = sheet(g, wxPaper, 0.2, 0.28);
  const notamBase = sheet(g, notamTexes[0], 0.2, 0.28);
  place(notamBase, TB.notam);
  const notamPage = group(notamBase, -0.1, 0.008, 0);
  const notamM = flat(notamPage, notamTexes[1], 0.195, 0.27, 0.1, 0, 0);
  const fuel = sheet(g, fuelPaper, 0.18, 0.25);
  place(fuel, TB.fuel);
  const calcM = calculator(g);
  // The calculator group is the last added: put it in its place.
  place(g.children[g.children.length - 1], TB.calc);
  const load = sheet(g, loadPaper, 0.2, 0.28);
  place(load, TB.load);
  const loadFace = load.children[1] as THREE.Mesh;
  const hilite = part(g, cyl(0.011, 0.011, 0.12, 6), '#ffee58', 0, 0, 0, { rz: 1.2, outline: false });
  hilite.visible = false;
  const penM = pen(g);
  place(penM, TB.pen);
  const stack = sheet(g, debriefTex, 0.2, 0.28);
  place(stack, TB.sheets);
  const dealt = sheet(g, debriefTex, 0.2, 0.28);
  dealt.visible = false;
  const clip = group(g);
  part(clip, box(0.2, 0.28, 0.008), '#5d4037', 0, 0, 0);
  picture(clip, debriefTex, 0.18, 0.25, 0, 0, 0.005);
  clip.rotation.x = -0.9;
  clip.visible = false;
  // Cups, a headset and name cards.
  for (const [x, z] of [[-1.3, 0.3], [-0.95, -0.34], [0.95, -0.34]] as const) {
    part(g, cyl(0.035, 0.03, 0.08, 10), '#fafafa', x, T + 0.04, z);
    part(g, cyl(0.03, 0.03, 0.002, 10), '#5d3a1a', x, T + 0.08, z, { outline: false });
  }
  label(g, '기장', 0.16, 0.05, TB.me[0], T + 0.03, 0.4, NAVY, '#ffffff');
  label(g, '운항 브리핑실', 0.5, 0.08, -1.3, T - 0.1, 0.42, NAVY, '#ffffff');
  // Chairs.
  for (const [p, ry] of [[TB.me, Math.PI], [TB.fo2, Math.PI], [TB.fo, 0], [TB.purser, 0]] as const) tableChair(g, p[0], p[2], ry);
  // The screen on its post at the end of the table.
  const yawS = -Math.PI / 2 + 0.75;
  part(g, cyl(0.04, 0.05, 1.05, 10), '#37474f', TB.screen[0] + 0.07, 0.5, TB.screen[2] - 0.07);
  part(g, cyl(0.24, 0.26, 0.04, 16), '#37474f', TB.screen[0] + 0.07, 0.02, TB.screen[2] - 0.07);
  const scrBox = group(g, TB.screen[0], TB.screen[1], TB.screen[2], yawS);
  part(scrBox, rbox(1.04, 0.68, 0.05, 0.02), BLACK, 0, 0, -0.03);
  const screen = swapPic(scrBox, 0.98, 0.62, 0, 0, 0.002);
  screen.set(screenTex(0));
  // People: the first officer always opposite while it's used; the others for the debrief.
  const fo = person(g, LOOKS.fo, TB.fo[0], TB.fo[2], 0, TB.fo[1] + 0.0);
  const pur = person(g, LOOKS.purser, TB.purser[0], TB.purser[2], 0, TB.purser[1]);
  const fo2 = person(g, LOOKS.fo2, TB.fo2[0], TB.fo2[2], Math.PI, TB.fo2[1]);
  fo.root.visible = pur.root.visible = fo2.root.visible = false;
  const foSheet = sheet(g, wxPaper, 0.2, 0.28);
  foSheet.visible = false;
  const spots: Record<string, Spot> = { flightBriefing: standAt(g, 'plBrief'), pilot_crewDebrief: standAt(g, 'plDebrief') };
  spots['*'] = spots.flightBriefing;
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    const brief = now === 'flightBriefing';
    const deb = now === 'pilot_crewDebrief';
    fo.root.visible = !!now;
    pur.root.visible = fo2.root.visible = deb;
    screen.set(screenTex(now ? Math.round(n.screen ?? 0) : 0));
    // Route along the chart.
    const ru = n.routeU ?? 0;
    route.scale.x = Math.max(0.001, 1.18 * ru);
    route.position.x = TB.chartFrom[0] + 0.59 * ru;
    // Papers.
    place(wx, N?.props.wx ?? TB.wx);
    wx.visible = !deb;
    const flip = Math.round(n.flip ?? 0);
    const m = notamM.material as THREE.MeshBasicMaterial;
    const nt = notamTexes[Math.min(3, flip)];
    if (m.map !== nt) {
      m.map = nt;
      m.needsUpdate = true;
    }
    notamPage.rotation.z = brief && N?.b.from === 'notam' ? -1.2 * Math.sin(Math.PI * frac((N.b.u ?? 0) * 3)) : 0;
    place(hilite, N?.props.hi ?? [-1.1, T + 0.01, 0.42]);
    hilite.visible = !!N?.props.hi;
    const signed = (n.signed ?? 0) > 0.5;
    const lm = loadFace.material as THREE.MeshBasicMaterial;
    const lt = signed ? loadPaper2 : loadPaper;
    if (lm.map !== lt) {
      lm.map = lt;
      lm.needsUpdate = true;
    }
    place(load, N?.props.load ?? TB.load);
    load.visible = !deb;
    const cm = calcM;
    const ct = calcTexes[Math.min(3, Math.round(n.calc ?? 0))];
    if (cm.map !== ct) {
      cm.map = ct;
      cm.needsUpdate = true;
    }
    place(penM, N?.props.pen ?? TB.pen);
    // Debrief.
    stack.visible = deb && !N?.props.sheet;
    dealt.visible = deb && !!N?.props.sheet || deb && (n.dealt ?? 0) > 0.8;
    place(dealt, N?.props.sheet ?? TB.place);
    clip.visible = !!N?.props.clip;
    if (N?.props.clip) place(clip, N.props.clip);
    // The first officer answers.
    if (now) {
      const a = Math.round(n.foA ?? 0);
      const base = v3(TB.fo[0] + 0.2, T + 0.05, TB.fo[2] + 0.42);
      fo.armL(a === 3 ? v3(0.32 - 0.5 * (n.finger ?? 0), T + 0.02, -0.14) : a === 5 ? (N?.props.foSlide ? vv([N.props.foSlide[0] - 0.1, T + 0.02, Math.min(-0.02, N.props.foSlide[2])]) : base) : a === 6 && brief ? v3(-0.7, T + 0.28, -0.02) : a === 6 ? v3(TB.fo[0] + 0.15, T + 0.55, TB.fo[2] + 0.2) : base);
      fo.armR(a === 2 ? v3(TB.fo[0] - 0.22, T + 0.42 + 0.03 * Math.sin(t * 5), TB.fo[2] + 0.28) : a === 4 ? v3(TB.fo[0] - 0.25, T + 0.36, TB.fo[2] + 0.34) : v3(TB.fo[0] - 0.2, T + 0.05, TB.fo[2] + 0.42));
      fo.head.rotation.x = a === 3 || a === 5 ? 0.42 : a === 0 ? 0.25 : 0;
      fo.head.rotation.y = 0.06 * Math.sin(t * 0.9);
      foSheet.visible = a === 1 || (brief && !!N?.props.wx && N.b.i > 0);
      place(foSheet, [TB.wxOut[0] + 0.02, T + 0.016, TB.wxOut[2] - 0.05]);
      if (deb) {
        const pa = Math.round(n.purA ?? 0);
        pur.armR(pa === 2 ? v3(TB.purser[0] - 0.24, T + 0.42 + 0.04 * Math.sin(t * 4), TB.purser[2] + 0.3) : pa === 6 ? v3(TB.purser[0] - 0.15, T + 0.55, TB.purser[2] + 0.2) : null);
        pur.armL(null);
        pur.head.rotation.y = pa === 2 ? 0.25 : 0.65;
        fo2.head.rotation.y = -0.6;
        fo2.head.rotation.x = (n.fo2A ?? 0) > 0.5 ? 0.4 : 0;
        fo2.armR((n.fo2A ?? 0) > 0.5 ? v3(0.72, T + 0.03 + 0.008 * Math.sin(t * 10), 0.3) : null);
      }
    } else foSheet.visible = false;
  });
  out.work = marker(g, TB.chartFrom[0], T, 0);
}

// =============================================================================================
// 운항 관리 데스크.

const planTexes = [0, 1, 2, 3].map((i) => painted(`plFilePlan${i}`, 256, 160, (c) => {
  c.fillStyle = '#eaf0f5';
  c.fillRect(0, 0, 256, 160);
  c.fillStyle = NAVY;
  c.fillRect(0, 0, 256, 26);
  text(c, '비행 계획서 입력', 10, 14, 15, '#ffffff');
  const rows = [['편명', '한누리 702'], ['출발', '누리 09:40'], ['항로', 'MIRAE-GARAM'], ['도착', '한빛 11:25'], ['교체', '누리']];
  rows.forEach(([a, b], r) => {
    text(c, a, 10, 42 + r * 23, 14, '#546e7a');
    c.fillStyle = '#ffffff';
    c.fillRect(56, 32 + r * 23, 186, 19);
    if (r <= i + 1) text(c, b, 62, 42 + r * 23, 14, '#17325c');
  });
}));
const planSentTex = painted('plFileSent', 256, 160, (c) => {
  c.fillStyle = '#e8f5e9';
  c.fillRect(0, 0, 256, 160);
  c.fillStyle = '#2e7d32';
  c.fillRect(0, 0, 256, 26);
  text(c, '제출 완료', 10, 14, 15, '#ffffff');
  text(c, '한누리 702', 128, 62, 24, '#1b5e20', 'center');
  text(c, '관제 승인 수신', 128, 100, 18, '#2e7d32', 'center');
});
const qrhTex = listTex('plQrh', '체크리스트 공부', [['출발 전 점검 · 12항목'], ['시동 전 점검 · 8항목'], ['이륙 전 점검 · 6항목', '#ffd54f'], ['착륙 전 점검 · 5항목']]);
const mapOpsTex = painted('plOpsMap', 256, 160, (c) => {
  c.fillStyle = '#0d2238';
  c.fillRect(0, 0, 256, 160);
  c.fillStyle = '#1d3b55';
  c.beginPath();
  c.moveTo(0, 30);
  c.quadraticCurveTo(120, 60, 110, 160);
  c.lineTo(0, 160);
  c.fill();
  c.beginPath();
  c.moveTo(256, 0);
  c.quadraticCurveTo(170, 60, 200, 160);
  c.lineTo(256, 160);
  c.fill();
  text(c, '운항 감시 · 한누리 항공망', 8, 12, 12, '#90caf9');
  c.strokeStyle = '#ff5cf0';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(60, 120);
  c.lineTo(120, 80);
  c.lineTo(200, 50);
  c.stroke();
  c.strokeStyle = '#7dff9a';
  c.beginPath();
  c.moveTo(60, 120);
  c.lineTo(160, 130);
  c.stroke();
  for (const [x, y] of [[120, 80], [150, 128], [178, 58]]) {
    c.fillStyle = '#ffd54f';
    c.fillRect(x - 3, y - 3, 6, 6);
  }
});
const rosterTex = painted('plRoster', 256, 128, (c) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 256, 128);
  c.fillStyle = NAVY;
  c.fillRect(0, 0, 256, 20);
  text(c, '승무원 근무표', 8, 11, 13, '#ffffff');
  const cols = ['#42a5f5', '#66bb6a', '#ef5350', '#ffb300'];
  for (let r = 0; r < 6; r++) {
    text(c, ['홍 기장', '김 부기장', '이 기장', '박 부기장', '최 기장', '서 승무'][r], 6, 32 + r * 17, 11, '#37474f');
    for (let d = 0; d < 7; d++) {
      c.fillStyle = cols[(r * 3 + d * 2 + (r > 2 ? 1 : 0)) % 4];
      if ((r + d) % 5 !== 0) c.fillRect(64 + d * 27, 25 + r * 17, 25, 14);
    }
  }
});
const fuelScreenTex = listTex('plOpsFuel', '연료 계획', [['운항 연료'], ['대체 연료'], ['예비 연료']], '#ef6c00');
function opsDesk(g: THREE.Group, out: Built) {
  const T = OD.top;
  part(g, rbox(2.94, 0.05, 0.86, 0.02), '#46525d', 0, T - 0.025, -0.45);
  for (const x of [-1.42, 1.42]) part(g, box(0.06, T - 0.05, 0.8), '#37474f', x, (T - 0.05) / 2, -0.45);
  part(g, box(2.8, T - 0.1, 0.05), '#37474f', 0, (T - 0.1) / 2, -0.82);
  // The drawers at the right.
  part(g, rbox(0.42, T - 0.08, 0.7, 0.01), '#546e7a', 1.14, (T - 0.08) / 2, -0.45);
  // The back panel: crew schedule, clock, and a strip of lamps.
  part(g, box(2.94, 1.3, 0.06), '#22303b', 0, 1.35, -0.96);
  const rost = picture(g, rosterTex, 0.82, 0.42, 1.0, 1.72, -0.92);
  rost.userData.keep = true;
  label(g, '운항 관리', 0.8, 0.13, -0.95, 1.86, -0.92, NAVY, '#ffffff');
  const clock = painted('plClockUtc', 128, 40, (c) => {
    c.fillStyle = '#05080c';
    c.fillRect(0, 0, 128, 40);
    text(c, 'UTC 00:40', 64, 20, 20, '#ff5252', 'center');
  });
  picture(g, clock, 0.4, 0.12, -0.1, 1.88, -0.92);
  // Three screens on arms.
  const mkScreen = (x: number, ry: number, w = 0.62, h = 0.42) => {
    const m = group(g, x, 1.14, -0.72, ry);
    part(m, rbox(w + 0.04, h + 0.04, 0.035, 0.012), BLACK, 0, 0, -0.018);
    part(m, cyl(0.02, 0.02, 0.2, 6), '#37474f', 0, -0.28, -0.02, { outline: false });
    return swapPic(m, w, h, 0, 0, 0.002);
  };
  part(g, box(1.9, 0.015, 0.14), '#37474f', -0.1, T + 0.012, -0.72, { outline: false });
  const left = mkScreen(OD.screenL[0], 0.08);
  const mid = mkScreen(0.05, -0.02);
  const right = mkScreen(0.72, -0.12);
  left.set(planTexes[3]);
  mid.set(mapOpsTex);
  right.set(rosterTex);
  // Fuel bars, drawn over the right-hand screen.
  const barGroup = group(g, 0.72, 1.14, -0.7, -0.12);
  const bars = [0, 1, 2].map((i) => ownLit(barGroup, box(1, 0.05, 0.004), ['#42a5f5', '#66bb6a', '#ffb300'][i], -0.1, 0.06 - i * 0.09, 0.006));
  barGroup.visible = false;
  // Keyboard and mouse.
  const kb = group(g, OD.keys[0], T + 0.012, OD.keys[2]);
  part(kb, rbox(0.42, 0.018, 0.14, 0.006), '#263238', 0, 0, 0);
  for (let r = 0; r < 3; r++) part(kb, box(0.38, 0.004, 0.022), '#607d8b', 0, 0.011, -0.04 + r * 0.04, { outline: false });
  part(g, rbox(0.06, 0.025, 0.1, 0.012), '#263238', OD.mouse[0], OD.mouse[1], OD.mouse[2]);
  // The phone.
  part(g, rbox(0.2, 0.04, 0.18, 0.01), '#37474f', OD.phone[0], T + 0.02, OD.phone[2]);
  for (let i = 0; i < 6; i++) part(g, box(0.02, 0.005, 0.015), '#cfd8dc', OD.phone[0] - 0.04 + (i % 3) * 0.03, T + 0.042, OD.phone[2] + 0.02 + Math.floor(i / 3) * 0.03, { outline: false });
  const handset = group(g);
  part(handset, rbox(0.04, 0.17, 0.035, 0.012), BLACK, 0, 0, 0);
  place(handset, OD.phone);
  handset.rotation.x = Math.PI / 2;
  const ringLamp = ownLit(g, box(0.02, 0.01, 0.01), '#3a1a1a', OD.phone[0] + 0.08, T + 0.05, OD.phone[2] - 0.05);
  // The printer.
  part(g, rbox(0.36, 0.2, 0.32, 0.02), '#eceff1', OD.printer[0], T + 0.1, OD.printer[2]);
  part(g, box(0.28, 0.01, 0.14), '#b0bec5', OD.printer[0], T + 0.06, OD.printer[2] + 0.2, { outline: false });
  const feed = sheet(g, paperTex('plOpsPlanSheet', '비행 계획서', ['한누리 702', '누리 → 한빛', '연료 5,680', '기장:']), 0.2, 0.28);
  feed.visible = false;
  const signedTex = paperTex('plOpsPlanSigned', '비행 계획서', ['한누리 702', '누리 → 한빛', '연료 5,680', '기장: OK'], 128, 176, '접수');
  const feedFace = feed.children[1] as THREE.Mesh;
  const plainFace = (feedFace.material as THREE.MeshBasicMaterial).map;
  // Trays and files.
  part(g, rbox(0.3, 0.05, 0.36, 0.01), '#90a4ae', OD.tray[0], T + 0.025, OD.tray[2]);
  label(g, '제출함', 0.2, 0.04, OD.tray[0], T + 0.03, OD.tray[2] + 0.185, '#90a4ae', '#ffffff');
  const trayStack = part(g, box(0.2, 0.02, 0.28), PAPER, OD.tray[0], T + 0.062, OD.tray[2], { outline: false });
  // The binder, the checklist study's.
  const binder = group(g);
  const bookTex = paperTex('plQrhPage', '이륙 전 점검', ['플랩: 설정', '트림: 확인', '방향타: 자유', '안전벨트: 켬', '객실: 준비됨']);
  const bookTex2 = paperTex('plQrhPage2', '착륙 전 점검', ['바퀴: 내림', '플랩: 풀', '스포일러: 준비', '자동추력: 확인']);
  part(binder, rbox(0.42, 0.02, 0.3, 0.008), '#ef6c00', 0, 0.01, 0);
  const pageR = sheet(binder, bookTex, 0.2, 0.28);
  pageR.position.set(0.1, 0.021, 0);
  const pageL = sheet(binder, bookTex2, 0.2, 0.28);
  pageL.position.set(-0.1, 0.021, 0);
  const shut = group(binder, 0, 0.02, 0);
  part(shut, rbox(0.21, 0.015, 0.3, 0.006), '#ef6c00', 0.105, 0, 0);
  const flashCard = group(g);
  part(flashCard, rbox(0.16, 0.22, 0.006, 0.004), '#ffe082', 0, 0, 0);
  label(flashCard, 'V1이란?', 0.13, 0.05, 0, 0.03, 0.005, '#ffe082', '#37474f');
  flashCard.visible = false;
  // The chart and rule for the fuel plan.
  const chart = group(g);
  flat(chart, chartTex, 0.56, 0.3, 0, 0, 0);
  place(chart, OD.chart);
  const rule = group(g);
  part(rule, box(0.26, 0.006, 0.03), '#fff176', 0, 0, 0, { outline: false });
  rule.visible = false;
  const calcM = calculator(g);
  place(g.children[g.children.length - 1], OD.calc);
  const fuelSheet = sheet(g, fuelPaper, 0.2, 0.28);
  place(fuelSheet, OD.page);
  const penM = pen(g);
  // Chairs: the dweller's, and the colleague's.
  const chair = (x: number, c: string) => {
    part(g, cyl(0.04, 0.04, 0.38, 8), '#2b2b30', x, 0.2, 0.42, { outline: false });
    part(g, cyl(0.22, 0.24, 0.03, 5), '#2b2b30', x, 0.03, 0.42, { outline: false });
    part(g, rbox(0.46, 0.08, 0.44, 0.04), c, x, 0.43, 0.42);
    part(g, rbox(0.44, 0.5, 0.06, 0.04), c, x, 0.74, 0.66, { rx: -0.1 });
  };
  chair(OD.seat[0], NAVY);
  chair(0.72, '#546e7a');
  const mate = vroidFigure(person(g, LOOKS.dispatcher, 0.72, 0.42, Math.PI, 0.47), { seat: 0.47, gender: 'female' });
  part(mate.head, ring3(), '#263238', 0, 0.04, 0);
  mate.root.visible = false;
  const spots: Record<string, Spot> = { fileFlightPlan: standAt(g, 'plFile'), pilot_checklistStudy: standAt(g, 'plChecklist'), pilot_fuelPlan: standAt(g, 'plFuel') };
  spots['*'] = spots.fileFlightPlan;
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    const file = now === 'fileFlightPlan';
    const study = now === 'pilot_checklistStudy';
    const fuelOn = now === 'pilot_fuelPlan';
    mate.root.visible = !!now;
    // The screens.
    if (file) left.set((n.sent ?? 0) > 0.5 ? planSentTex : planTexes[Math.min(3, Math.round(n.scr ?? 0))]);
    else if (study) left.set(qrhTex);
    else if (fuelOn) left.set(fuelScreenTex);
    else left.set(planTexes[3]);
    right.set(fuelOn ? fuelScreenTex : rosterTex);
    barGroup.visible = fuelOn;
    if (fuelOn) {
      const v = n.bars ?? 0;
      [0.36, 0.14, 0.08].forEach((w, i) => {
        const L = Math.max(0.001, w * v * 1.05);
        bars[i].scale.x = L;
        bars[i].position.x = -0.08 + L / 2;
      });
    }
    // The phone.
    const ph = N?.props.phone;
    place(handset, ph ?? OD.phone);
    handset.rotation.x = ph ? 0 : Math.PI / 2;
    setLit(ringLamp, (n.ringing ?? 0) > 0.5 && Math.sin(t * 14) > 0 ? '#ff3b30' : '#3a1a1a');
    // The plan coming out of the printer, signed, in the tray.
    const pl = N?.props.plan;
    feed.visible = !!pl;
    if (pl) place(feed, pl);
    const fm = feedFace.material as THREE.MeshBasicMaterial;
    const ft = (n.signed ?? 0) > 0.5 ? signedTex : plainFace;
    if (fm.map !== ft) {
      fm.map = ft;
      fm.needsUpdate = true;
    }
    trayStack.scale.y = N?.props.planIn ? 1.8 : 1;
    // The binder.
    binder.visible = study;
    if (study) {
      place(binder, [OD.page[0], T + 0.01, 0.0]);
      shut.rotation.z = Math.PI * (1 - (n.open ?? 0)) * -1 + (n.shut ?? 0) * 0;
      shut.visible = (n.open ?? 0) < 0.95;
      pageR.visible = (n.open ?? 0) > 0.3;
      pageL.visible = (n.open ?? 0) > 0.8;
      const pm = pageR.children[1] as THREE.Mesh;
      const want = (n.page ?? 0) > 0.5 ? bookTex2 : bookTex;
      const mat = pm.material as THREE.MeshBasicMaterial;
      if (mat.map !== want) {
        mat.map = want;
        mat.needsUpdate = true;
      }
    }
    // The fuel plan's chart and rule.
    chart.visible = !study && !file;
    const r = N?.props.rule;
    rule.visible = !!r;
    if (r) place(rule, r);
    fuelSheet.visible = fuelOn && (!!N?.props.fuelSheet || (n.written ?? 0) > 0);
    if (N?.props.fuelSheet) place(fuelSheet, N.props.fuelSheet);
    const ct = calcTexes[Math.min(3, Math.round((n.digit ?? 0) * 0.7))];
    if (calcM.map !== ct) {
      calcM.map = ct;
      calcM.needsUpdate = true;
    }
    const pp = N?.props.pen;
    penM.visible = !!pp || !now;
    place(penM, pp ?? [-0.3, T + 0.012, 0.08]);
    // The colleague.
    if (now) {
      const a = Math.round(n.mate ?? 0);
      const mk = v3(0.72 + 0.1, T + 0.06, 0.02);
      // She faces -z: her left hand is on the dweller's side (the lower x), her right has the mouse.
      mate.armL(a === 3 ? v3(0.5, 1.0 + 0.012 * Math.sin(t * 3), 0.16) : a === 2 ? v3(0.25, T + 0.25, 0.12) : tapV(0.62, T + 0.06, -0.02, t));
      mate.armR(a === 1 ? v3(0.95, 1.2, 0.3) : tapV(mk.x, mk.y, mk.z, t + 0.2));
      mate.head.rotation.y = a === 3 || a === 2 ? -0.95 : 0.1 * Math.sin(t * 0.5);
      flashCard.visible = a === 3;
      if (a === 3) {
        place(flashCard, [0.46, 1.08, 0.2]);
        flashCard.rotation.y = -0.4;
      }
    } else flashCard.visible = false;
  });
  out.work = marker(g, OD.keys[0], T, OD.keys[2]);
}
const ring3 = () => cyl(0.118, 0.118, 0.012, 14);
const tapV = (x: number, y: number, z: number, t: number) => v3(x, y + 0.008 * Math.max(0, Math.sin(t * 13)), z);

// =============================================================================================
// 탑승구: the aeroplane on the ramp.

const windowsTex = painted('plWindows', 1024, 40, (c) => {
  c.fillStyle = '#f4f6f8';
  c.fillRect(0, 0, 1024, 40);
  c.fillStyle = '#1f2f40';
  for (let i = 0; i < 44; i++) {
    c.beginPath();
    c.ellipse(20 + i * 23, 20, 6, 10, 0, 0, 7);
    c.fill();
  }
});
const finTex = painted('plFin', 256, 256, (c) => {
  c.fillStyle = NAVY;
  c.fillRect(0, 0, 256, 256);
  airLogo(c, 128, 120, 70);
});
const boardTex = (flying: boolean) => painted(`plGateBoard${flying ? 1 : 0}`, 384, 160, (c) => {
  c.fillStyle = '#0a1420';
  c.fillRect(0, 0, 384, 160);
  c.fillStyle = CORAL;
  c.fillRect(0, 0, 76, 160);
  text(c, '7', 38, 80, 80, '#ffffff', 'center');
  text(c, '탑승구', 90, 30, 22, '#90caf9');
  text(c, '한누리 702 · 한빛행', 90, 78, 28, '#ffffff');
  text(c, flying ? '운항 중' : '09:40 탑승 준비', 90, 124, 28, flying ? '#7dff9a' : '#ffd54f');
});
function boardingGate(g: THREE.Group, out: Built) {
  const Z = GT.body;
  const R = GT.r;
  const C = GT.belly + R;
  // The ramp paint under it.
  part(g, box(9.0, 0.008, 2.0), '#6e7780', 0, 0.006, 0, { outline: false, shadow: false });
  for (let i = 0; i < 9; i++) part(g, box(0.5, 0.004, 0.05), '#ffd54f', -4 + i, 0.012, 0.92, { outline: false, shadow: false });
  part(g, box(9.0, 0.004, 0.05), '#ffffff', 0, 0.012, -0.98, { outline: false, shadow: false });
  // The board on its post, tall behind the nose.
  for (const x of [-4.35, -3.05]) part(g, cyl(0.04, 0.04, 2.6, 8), '#37474f', x, 1.3, -0.93);
  part(g, rbox(1.46, 0.62, 0.07, 0.02), BLACK, -3.7, 2.56, -0.93);
  const board = swapPic(g, 1.38, 0.54, -3.7, 2.56, -0.89);
  board.set(boardTex(false));
  const plane = group(g);
  // The fuselage.
  const white = '#f4f6f8';
  part(plane, cyl(R, R, 6.1, 20), white, -0.2, C, Z, { rz: Math.PI / 2 });
  // Nose: a long flattened ball.
  const nose = part(plane, ball(R), white, -3.25, C, Z);
  nose.scale.set(1.45, 1, 1);
  // Tail cone.
  part(plane, cyl(R, 0.16, 1.5, 20), white, 3.6, C + 0.22, Z, { rz: Math.PI / 2 - 0.3 });
  // Belly and cheatline.
  part(plane, cyl(R * 0.99, R * 0.99, 6.1, 20, ), '#cfd6db', -0.2, C - 0.08, Z, { rz: Math.PI / 2 });
  part(plane, cyl(R + 0.002, R + 0.002, 6.1, 20), white, -0.2, C + 0.02, Z, { rz: Math.PI / 2 });
  // Windows and stripe along the near side.
  const near = Z + R + 0.006;
  picture(plane, windowsTex, 5.6, 0.2, 0.05, C + 0.22, Z + R + 0.004);
  part(plane, box(5.8, 0.06, 0.01), CORAL, 0, C - 0.06, near - 0.02, { outline: false });
  part(plane, box(5.8, 0.03, 0.01), NAVY, 0, C - 0.12, near - 0.03, { outline: false });
  label(plane, AIR, 1.3, 0.2, 0.5, C + 0.46, Z + R * 0.9, white, NAVY);
  // The cockpit's windows.
  for (const [x, w] of [[-3.72, 0.28], [-3.45, 0.26]] as const) part(plane, rbox(w, 0.2, 0.03, 0.03), '#1f2f40', x, C + 0.3, Z + R * 0.74, { rx: -0.65, ry: -0.2, outline: false });
  // The front door, with its open leaf.
  part(plane, rbox(0.46, 0.92, 0.02, 0.05), '#1a2531', -2.85, C + 0.02, Z + R * 0.98);
  const leaf = group(plane, -2.62, C + 0.02, Z + R * 0.98);
  part(leaf, rbox(0.44, 0.9, 0.05, 0.05), white, 0.22, 0, 0);
  leaf.rotation.y = -1.9;
  // The pitot tube on the nose's side, with its red cover.
  part(plane, cyl(0.012, 0.012, 0.16, 6), CHROME, GT.pitot[0], GT.pitot[1], GT.pitot[2] - 0.08, { rx: Math.PI / 2, outline: false });
  const cover = group(plane, GT.pitot[0], GT.pitot[1], GT.pitot[2]);
  part(cover, rbox(0.06, 0.06, 0.11, 0.015), '#d32f2f', 0, 0, 0);
  part(cover, box(0.04, 0.26, 0.004), '#d32f2f', 0, -0.17, 0.05, { outline: false });
  // The fin and the tailplane.
  const fin = group(plane, 3.95, C + 0.6, Z);
  part(fin, box(1.1, 1.3, 0.09), NAVY, 0.1, 0.62, 0, { rz: 0 });
  const fm = picture(fin, finTex, 0.9, 0.9, 0.08, 0.6, 0.05);
  fm.renderOrder = 1;
  part(fin, box(0.28, 1.1, 0.06), shade(NAVY, 0.8), 0.72, 0.6, 0);
  const elevN = part(plane, box(0.9, 0.05, 1.4), white, 4.35, C + 0.42, Z + 0.72, { ry: 0.3 });
  elevN.userData.keep = true;
  part(plane, box(0.9, 0.05, 1.4), white, 4.35, C + 0.42, Z - 0.72, { ry: -0.3 });
  // The near wing, low and swept, ending short of the front walkway; the far one behind.
  const wingY = GT.belly + 0.22;
  part(plane, box(1.8, 0.08, 1.05), white, 0.28, wingY + 0.02, Z + R + 0.42, { ry: -0.42, rx: 0.08 });
  part(plane, box(1.25, 0.05, 0.44), '#cfd6db', 1.02, wingY + 0.08, Z + R + 0.5, { ry: -0.42, rx: 0.08 });
  part(plane, box(0.42, 0.34, 0.03), CORAL, 0.92, wingY + 0.26, Z + R + 1.0, { ry: -0.4 });
  part(plane, box(2.0, 0.08, 1.8), white, 0.28, wingY + 0.02, Z - R - 0.85, { ry: 0.42, rx: -0.08 });
  // The flap on the near wing, lowered when looked along.
  const flap = group(plane, 1.05, wingY + 0.05, Z + R + 0.42);
  part(flap, box(0.5, 0.03, 0.74), '#b6c0c8', 0.22, 0, 0, { ry: -0.3 });
  // The engine under it.
  const eng = group(plane, GT.inlet[0], GT.inlet[1], GT.inlet[2]);
  part(eng, cyl(0.31, 0.33, 0.9, 20), '#e2e6ea', 0.44, 0, 0, { rz: Math.PI / 2 });
  part(eng, cyl(0.34, 0.31, 0.14, 20), CHROME, 0.03, 0, 0, { rz: Math.PI / 2 });
  part(eng, cyl(0.2, 0.14, 0.26, 12), '#37474f', 1.0, 0, 0, { rz: Math.PI / 2 });
  part(eng, box(0.5, 0.2, 0.06), '#d5d9dd', 0.5, 0.34, 0, { rz: 0 });
  label(eng, AIR, 0.5, 0.08, 0.44, 0, 0.335, '#e2e6ea', NAVY);
  const fan = group(eng, 0.1, 0, 0);
  part(fan, cyl(0.28, 0.28, 0.03, 18), '#2b2b30', 0, 0, 0, { rz: Math.PI / 2, outline: false });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    part(fan, box(0.012, 0.25, 0.04), '#90a4ae', -0.02, Math.cos(a) * 0.15, Math.sin(a) * 0.15, { rx: a, outline: false });
  }
  part(fan, cyl(0.012, 0.075, 0.1, 10), '#eceff1', -0.07, 0, 0, { rz: -Math.PI / 2, outline: false });
  // The gear: the nose wheels, and the main wheels on the near and far sides.
  const wheel = (x: number, z: number, r = 0.16, w = 0.09) => {
    part(plane, cyl(r, r, w, 16), '#22262a', x, r + 0.01, z, { rx: Math.PI / 2 });
    part(plane, cyl(r * 0.5, r * 0.5, w + 0.01, 12), '#b0bec5', x, r + 0.01, z, { rx: Math.PI / 2, outline: false });
  };
  const nx = GT.noseGear[0];
  part(plane, cyl(0.03, 0.03, 0.56, 8), CHROME, nx, 0.42, Z + 0.0);
  wheel(nx, Z + 0.07, 0.13, 0.07);
  wheel(nx, Z - 0.07, 0.13, 0.07);
  for (const gz of [GT.mainGear[2], Z - 0.55]) {
    part(plane, cyl(0.04, 0.04, 0.5, 8), CHROME, GT.mainGear[0], 0.44, gz);
    wheel(GT.mainGear[0] - 0.13, gz + 0.04);
    wheel(GT.mainGear[0] + 0.13, gz + 0.04);
  }
  // The airstairs at the door, on their own little truck.
  const stairs = group(g, -2.85, 0, Z + R + 0.02);
  const steps = 6;
  const top = C - 0.44;
  for (let i = 0; i < steps; i++) part(stairs, box(0.56, 0.03, 0.14), '#b0bec5', 0, top - i * (top / steps), 0.05 + i * 0.15);
  for (const sx of [-1, 1]) {
    rod(stairs, v3(sx * 0.29, top, 0.0), v3(sx * 0.29, 0.03, 0.95), 0.016, '#546e7a');
    rod(stairs, v3(sx * 0.29, top + 0.72, 0.0), v3(sx * 0.29, 0.75, 0.95), 0.012, CORAL);
    part(stairs, cyl(0.012, 0.012, 0.72, 6), CORAL, sx * 0.29, top + 0.36, 0, { outline: false });
    part(stairs, cyl(0.012, 0.012, 0.72, 6), CORAL, sx * 0.29, 0.39, 0.95, { outline: false });
  }
  // What's around it: chocks, cones, the ground power cart, the baggage dolly.
  for (const [x, z] of [[nx, 0.14], [GT.mainGear[0], 0.72]] as const) part(g, box(0.1, 0.09, 0.2), '#ffc107', x + 0.26, 0.05, z);
  for (const [x, z] of [[-4.2, 0.9], [4.25, 0.9], [2.1, 0.9]] as const) {
    part(g, cyl(0.02, 0.09, 0.32, 10), '#ff7043', x, 0.17, z);
    part(g, box(0.18, 0.012, 0.18), '#37474f', x, 0.008, z, { outline: false });
  }
  part(g, rbox(0.72, 0.56, 0.42, 0.04), '#ffc107', 2.9, 0.38, 0.62);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.06, 0.06, 0.04, 10), BLACK, 2.9 + sx * 0.28, 0.07, 0.62 + sz * 0.22, { rx: Math.PI / 2, outline: false });
  label(g, '지상 전원', 0.5, 0.11, 2.9, 0.46, 0.835, '#ffc107', '#1a1a1a');
  rod(g, v3(2.6, 0.55, 0.5), v3(1.9, 0.86, GT.body + 0.5), 0.016, BLACK);
  // The walk-around's props.
  const tablet = group(g);
  part(tablet, rbox(0.2, 0.28, 0.012, 0.01), BLACK, 0, 0, 0);
  const tabScr = ownLit(tablet, box(0.175, 0.25, 0.003), '#dfe9ef', 0, 0, 0.008);
  const marks = [0, 1, 2, 3, 4, 5].map((i) => ownLit(tablet, box(0.03, 0.02, 0.002), '#2e7d32', -0.05, 0.1 - i * 0.04, 0.012));
  for (let i = 0; i < 6; i++) part(tablet, box(0.08, 0.008, 0.002), '#546e7a', 0.03, 0.1 - i * 0.04, 0.011, { outline: false });
  tablet.rotation.x = -0.55;
  tablet.visible = false;
  tabScr.visible = true;
  const torch = group(g);
  part(torch, cyl(0.018, 0.018, 0.13, 8), BLACK, 0, 0, 0, { rz: 0.8, outline: false });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.42, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#fff4b0', transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide }));
  beam.userData.ownGeometry = beam.userData.ownMaterial = true;
  beam.position.set(-0.04, 0.02, -0.22);
  beam.rotation.x = -Math.PI / 2 + 0.2;
  torch.add(beam);
  torch.visible = false;
  const heldCover = group(g);
  part(heldCover, rbox(0.06, 0.06, 0.11, 0.015), '#d32f2f', 0, 0, 0);
  part(heldCover, box(0.04, 0.22, 0.004), '#d32f2f', 0, -0.14, 0.04, { outline: false });
  heldCover.visible = false;
  // The mechanic with the tech log.
  const mech = person(g, LOOKS.mechanic, GT.mech[0], GT.mech[1], -Math.PI / 2);
  const log = group(g);
  part(log, box(0.24, 0.015, 0.3), '#37474f', 0, 0, 0);
  flat(log, paperTex('plTechLog', '정비 일지', ['점검 완료', '결함 없음', '기장 서명:']), 0.2, 0.26, 0, 0.009, 0);
  place(log, GT.log);
  mech.root.visible = log.visible = false;
  const logPen = pen(g);
  logPen.visible = false;
  // Marshaller with wands: only when the plane moves.
  const marshal = person(g, LOOKS.marshal, 4.15, 1.2, -Math.PI / 2);
  marshal.root.visible = false;
  const wands = [0, 1].map(() => {
    const w = ownLit(marshal.root, cyl(0.016, 0.016, 0.3, 6), '#ff7043', 0, 1.5, 0);
    w.visible = true;
    return w;
  });
  const spots: Record<string, Spot> = { preflightCheck: standAt(g, 'plWalkRound') };
  spots['*'] = spots.preflightCheck;
  let lastAway = false;
  let since = -1e9;
  drive(g, out, spots, (now, N, t, away) => {
    if (away !== lastAway) {
      lastAway = away;
      since = t;
    }
    const n = N?.n ?? {};
    // Off on a route: the door shut, the stairs pulled off, pushed back and away along the ramp; home the same way.
    const s = t - since;
    const out01 = away ? THREE.MathUtils.smoothstep(s, 2, 10) : 1 - THREE.MathUtils.smoothstep(s, 0, 8);
    plane.position.x = out01 * 14;
    plane.visible = out01 < 0.98;
    const moving = out01 > 0 && out01 < 1;
    fan.rotation.x = moving || away ? t * 18 : now ? (n.spin ?? 0) * t * 1.5 : 0;
    leaf.rotation.y = away || moving ? 0 : -1.9;
    stairs.position.x = -2.85 + (away || moving ? -0.0 : 0);
    stairs.position.z = Z + R + 0.02 + (away || moving ? 0.5 * Math.min(1, away ? s / 2 : 1) : 0);
    board.set(boardTex(away || out01 > 0.5));
    marshal.root.visible = moving;
    if (moving) {
      const up = Math.sin(t * 3) * 0.2;
      const a = v3(4.15 - 0.15, 1.75 + up, 1.2 + 0.22);
      const b2 = v3(4.15 - 0.15, 1.75 - up, 1.2 - 0.22);
      marshal.armL(a);
      marshal.armR(b2);
      place(wands[0], [0.22, 1.86 + up, 0.15]);
      place(wands[1], [-0.22, 1.86 - up, 0.15]);
    }
    // The walk-around.
    const using = !!now;
    tablet.visible = using;
    if (using && N?.props.tablet) place(tablet, N.props.tablet);
    const tn = Math.round(n.marks ?? 0);
    marks.forEach((m, i) => (m.visible = using && i < tn - 1));
    const ta = N?.props.torchAt;
    torch.visible = using && !!ta;
    if (ta) place(torch, ta);
    beam.visible = (n.torch ?? 0) > 0.5;
    cover.visible = !using || (n.cover ?? 0) > 0.5;
    const co = N?.props.coverOff;
    heldCover.visible = !!co;
    if (co) place(heldCover, co);
    flap.rotation.z = -0.35 * (n.flapDown ?? 0);
    mech.root.visible = log.visible = using && (n.mech ?? 0) > 0.5;
    if (mech.root.visible) {
      mech.armL(v3(GT.log[0] + 0.15, GT.log[1] - 0.02, GT.log[2] + 0.06));
      mech.armR(v3(GT.log[0] + 0.15, GT.log[1] - 0.02, GT.log[2] - 0.08));
      mech.head.rotation.x = 0.3;
    }
    logPen.visible = !!N?.props.pen;
    if (N?.props.pen) place(logPen, N.props.pen);
  });
  out.work = marker(g, -2.2, 1.0, 1.1);
}

// =============================================================================================
// 절차 훈련기 (plCpt): plywood and paper.

const paperOverhead = painted('plCptOver', 384, 128, (c) => {
  c.fillStyle = '#e9e4d6';
  c.fillRect(0, 0, 384, 128);
  c.strokeStyle = '#546e7a';
  for (let col = 0; col < 8; col++) {
    c.strokeRect(6 + col * 47, 8, 44, 112);
    for (let r = 0; r < 4; r++) {
      c.strokeRect(14 + col * 47, 16 + r * 26, 28, 18);
      text(c, ['연료', '유압', '전기', '여압'][r], 28 + col * 47, 25 + r * 26, 10, '#37474f', 'center');
    }
  }
});
const paperMain = painted('plCptMain', 512, 200, (c) => {
  c.fillStyle = '#e9e4d6';
  c.fillRect(0, 0, 512, 200);
  const dial = (x: number, y: number, s: string) => {
    c.fillStyle = '#263238';
    c.fillRect(x, y, 84, 84);
    c.fillStyle = '#7ec4e8';
    c.fillRect(x + 6, y + 6, 72, 36);
    c.fillStyle = '#8a5a2b';
    c.fillRect(x + 6, y + 42, 72, 36);
    text(c, s, x + 42, y + 96, 13, '#37474f', 'center');
  };
  dial(10, 60, '주비행계기');
  dial(104, 60, '항법');
  dial(214, 60, '엔진');
  dial(320, 60, '시스템');
  dial(418, 60, '주비행계기');
  c.fillStyle = '#90a4ae';
  c.fillRect(30, 8, 452, 40);
  for (let i = 0; i < 6; i++) {
    c.fillStyle = '#263238';
    c.beginPath();
    c.arc(70 + i * 72, 28, 11, 0, 7);
    c.fill();
  }
  text(c, '복사본 계기판 · 훈련용', 256, 186, 14, '#b71c1c', 'center');
});
const cptCardTex = paperTex('plCptCard', '조종석 준비', ['상부 패널', '자동 비행', '주계기', '중앙 페데스탈', '조종면 점검']);
function cpt(g: THREE.Group, out: Built) {
  // A timber frame with printed panels.
  const WOODC = '#b78a5a';
  part(g, box(3.0, 0.06, 2.0), '#8d6e4f', 0, 0.03, 0);
  for (const x of [-0.82, 0.82]) {
    part(g, box(0.08, 1.9, 0.08), WOODC, x, 0.95, -0.72);
    part(g, box(0.08, 1.9, 0.08), WOODC, x, 0.95, 0.05);
  }
  part(g, box(1.72, 0.08, 0.08), WOODC, 0, 1.88, -0.72);
  part(g, box(0.08, 0.06, 0.85), WOODC, -0.82, 1.72, -0.33);
  part(g, box(0.08, 0.06, 0.85), WOODC, 0.82, 1.72, -0.33);
  // The main panel, printed, its bottom box.
  part(g, box(1.58, 0.72, 0.06), WOODC, 0, 0.45, -0.7);
  part(g, box(1.58, 0.56, 0.04), '#c9a97f', 0, 1.0, -0.66);
  const main = picture(g, paperMain, 1.5, 0.52, 0, 1.0, -0.635);
  main.rotation.x = -0.04;
  // The overhead, on a slope.
  part(g, box(1.58, 0.04, 0.42), WOODC, 0, 1.66, -0.2, { rx: 0.0 });
  const over = picture(g, paperOverhead, 1.3, 0.38, -0.05, 1.637, -0.2);
  over.rotation.x = Math.PI / 2;
  // Lamps: each flow stop lights one when touched.
  const stops: V[] = [...CP.over, ...CP.mcp, CP.pfd, ...CP.ped];
  const lamps = stops.map((p) => ownLit(g, box(0.05, 0.03, 0.03), '#54402c', p[0], p[1], p[2] + 0.003));
  // Pedestal: a box with printed levers.
  part(g, rbox(0.3, 0.68, 0.46, 0.02), WOODC, 0, 0.36, -0.34);
  const pedTop = picture(g, painted('plCptPed', 128, 192, (c) => {
    c.fillStyle = '#e9e4d6';
    c.fillRect(0, 0, 128, 192);
    c.fillStyle = '#263238';
    c.fillRect(40, 14, 16, 90);
    c.fillRect(72, 14, 16, 90);
    text(c, '추력', 64, 118, 15, '#37474f', 'center');
    text(c, '플랩', 64, 150, 15, '#37474f', 'center');
    text(c, '엔진', 64, 176, 15, '#37474f', 'center');
  }), 0.28, 0.44, 0, 0.705, -0.34);
  pedTop.rotation.x = -Math.PI / 2;
  // Yokes on a pivoting column: real ones, the only thing that moves.
  const yoke = group(g, CP.yoke[0], CP.yoke[1], CP.yoke[2]);
  part(yoke, box(0.24, 0.03, 0.03), '#37474f', 0, 0, 0);
  for (const sx of [-1, 1]) part(yoke, box(0.03, 0.09, 0.03), '#37474f', sx * 0.12, 0.03, 0);
  part(g, cyl(0.02, 0.02, 0.6, 8), '#546e7a', CP.yoke[0], 0.48, CP.yoke[2] - 0.05, { outline: false });
  part(g, box(0.24, 0.03, 0.03), '#37474f', -CP.yoke[0], CP.yoke[1], CP.yoke[2]);
  part(g, cyl(0.02, 0.02, 0.6, 8), '#546e7a', -CP.yoke[0], 0.48, CP.yoke[2] - 0.05, { outline: false });
  // Two stools.
  for (const x of [CP.seat[0], -CP.seat[0]]) {
    part(g, cyl(0.04, 0.05, 0.42, 8), '#37474f', x, 0.27, CP.seat[2], { outline: false });
    part(g, cyl(0.21, 0.21, 0.05, 16), NAVY, x, CP.seat[1] - 0.025, CP.seat[2]);
    part(g, rbox(0.34, 0.3, 0.04, 0.02), NAVY, x, CP.seat[1] + 0.26, CP.seat[2] + 0.2);
  }
  // A checklist board by the side, and manuals on a stool shelf.
  part(g, box(0.5, 0.7, 0.04), '#37474f', -1.28, 1.15, -0.8);
  picture(g, paperTex('plCptFlowChart', '조종석 흐름', ['1 상부 패널', '2 자동 비행', '3 주계기', '4 페데스탈', '5 조종면']), 0.44, 0.62, -1.28, 1.15, -0.775);
  part(g, box(0.05, 0.8, 0.05), '#37474f', -1.28, 0.4, -0.8);
  label(g, '절차 훈련기', 0.6, 0.12, 0, 0.3, -0.665, WOODC, '#3e2723');
  for (let i = 0; i < 3; i++) part(g, box(0.28, 0.05, 0.2), ['#ef6c00', '#1565c0', '#43a047'][i], 1.15, 0.08 + i * 0.05, -0.6);
  // The instructor, with a pointer.
  const teach = person(g, LOOKS.instructor, 1.1, 0.42, -1.2);
  const ptr = part(g, cyl(0.006, 0.006, 0.6, 6), '#bdbdbd', 0, 0, 0, { outline: false });
  teach.root.visible = ptr.visible = false;
  // The card.
  const card = group(g);
  part(card, box(0.14, 0.2, 0.004), PAPER, 0, 0, 0);
  picture(card, cptCardTex, 0.13, 0.19, 0, 0, 0.004);
  card.rotation.x = -0.8;
  place(card, CP.card);
  const spots: Record<string, Spot> = { plCptFlow: standAt(g, 'plFlow') };
  spots['*'] = spots.plCptFlow;
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    const st = now ? Math.round(n.stage ?? 0) : 0;
    lamps.forEach((m, i) => setLit(m, i < st ? '#7dff9a' : '#54402c'));
    place(card, N?.props.card ?? CP.card);
    teach.root.visible = ptr.visible = !!now;
    yoke.rotation.set(0.28 * (n.sy ?? 0), 0, -0.28 * (n.sx ?? 0));
    yoke.position.z = CP.yoke[2];
    if (now) {
      const a = Math.round(n.teach ?? 0);
      const target = a === 1 ? v3(0.0, 1.5, -0.1) : a === 3 ? v3(-0.3, 1.0, -0.55) : v3(0.6, 1.05, 0.3);
      const hand = v3(0.85, 1.12 + 0.012 * Math.sin(t * 2), 0.3);
      teach.armR(hand);
      teach.armL(null);
      ptr.position.copy(hand).lerp(target, 0.5);
      ptr.scale.y = hand.distanceTo(target) / 0.6;
      ptr.quaternion.setFromUnitVectors(UP, target.clone().sub(hand).normalize());
      teach.head.rotation.y = a === 2 ? -0.3 : -0.5;
    }
  });
  out.work = marker(g, 0, 1.0, -0.6);
}

// =============================================================================================
// 운항 기상 브리핑 (plWxWall).

const metarTex = listTex('plMetar', '공항 관측 · 예보', [['누리  260/14  8km  3000ft'], ['한빛  240/22G34  4km', '#ffb300'], ['가람  270/08  10km'], ['미래  290/12  6km']], '#0277bd', 512, 320, 28);
const radarTex = painted('plRadar', 512, 320, (c) => {
  c.fillStyle = '#04121e';
  c.fillRect(0, 0, 512, 320);
  c.strokeStyle = '#17405f';
  for (let r = 1; r < 5; r++) {
    c.beginPath();
    c.arc(256, 170, r * 34, 0, 7);
    c.stroke();
  }
  for (const [x, y, r, col] of [[300, 120, 42, '#2e7d32'], [320, 130, 28, '#fbc02d'], [330, 136, 14, '#d32f2f'], [150, 220, 32, '#2e7d32'], [160, 214, 16, '#fbc02d']] as const) {
    c.fillStyle = col;
    c.beginPath();
    c.arc(x, y, r, 0, 7);
    c.fill();
  }
  text(c, '기상 레이더', 16, 22, 24, '#90caf9');
});
const sigwxTex = painted('plSigwx', 512, 320, (c) => {
  c.fillStyle = '#eef4f7';
  c.fillRect(0, 0, 512, 320);
  c.fillStyle = '#0277bd';
  c.fillRect(0, 0, 512, 40);
  text(c, '항공 위험 기상도', 14, 21, 24, '#ffffff');
  c.strokeStyle = '#d32f2f';
  c.lineWidth = 4;
  c.beginPath();
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const x = 300 + Math.cos(a) * 62;
    const y = 180 + Math.sin(a) * 40;
    if (i === 0) c.moveTo(x, y);
    else c.quadraticCurveTo(300 + Math.cos(a - 0.2) * 74, 180 + Math.sin(a - 0.2) * 52, x, y);
  }
  c.closePath();
  c.stroke();
  text(c, '뇌우 CB', 262, 180, 22, '#d32f2f');
  c.strokeStyle = '#1565c0';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(40, 110);
  c.quadraticCurveTo(250, 40, 470, 120);
  c.stroke();
  text(c, '제트기류 120kt', 180, 60, 18, '#1565c0');
});
const wxDoneTex = listTex('plWxDone', '기상 브리핑 결과', [['도착 돌풍 34노트 주의', '#ffb300'], ['뇌우 우회 항로 GARAM2'], ['교체 공항 누리 확정', '#7dff9a']], '#2e7d32', 512, 320, 28);
const WX_TEX = [metarTex, radarTex, sigwxTex, wxDoneTex];
function wxWall(g: THREE.Group, out: Built) {
  part(g, box(3.0, 2.6, 0.08), '#1b2a3a', 0, 1.3, -0.46);
  part(g, rbox(2.1, 1.22, 0.06, 0.02), BLACK, -0.28, 1.56, -0.4);
  const scr = swapPic(g, 2.0, 1.12, -0.28, 1.56, -0.365);
  scr.set(metarTex);
  label(g, '운항 기상 브리핑', 1.2, 0.14, -0.28, 2.3, -0.41, '#0277bd', '#ffffff');
  // The sweep and the route over the screen.
  const sweep = ownLit(g, box(0.55, 0.012, 0.004), '#7dff9a', -0.28, 1.5, -0.355);
  sweep.visible = false;
  const route = ownLit(g, box(1, 0.018, 0.004), '#e91e63', 0, 0, -0.355);
  route.visible = false;
  const cb = ownLit(g, cyl(0.1, 0.1, 0.004, 16), '#ff3b30', 0, 0, -0.352);
  cb.rotation.x = Math.PI / 2;
  cb.visible = false;
  // The touch console.
  part(g, rbox(1.3, 0.78, 0.4, 0.02), '#37474f', WX.panel[0], 0.39, -0.18);
  part(g, rbox(1.0, 0.03, 0.34, 0.01), BLACK, WX.panel[0], 0.92, -0.08, { rx: 0.42 });
  picture(g, listTex('plWxKeys', '공항 선택', [['누리  한빛  가람'], ['관측  예보  레이더']], '#0277bd', 256, 96, 15), 0.92, 0.3, WX.panel[0], 0.935, -0.06, '#ffffff', 0, -Math.PI / 2 + 0.42);
  // The printer on a shelf at +x, a pile of forecast sheets; the shelf of airport plates.
  part(g, box(0.72, 0.84, 0.5), '#546e7a', WX.printer[0], 0.42, -0.2);
  part(g, rbox(0.46, 0.16, 0.34, 0.02), '#eceff1', WX.printer[0], 0.92, -0.2);
  part(g, box(0.3, 0.01, 0.14), '#b0bec5', WX.shelf[0], 0.86, WX.shelf[2] + 0.02, { outline: false });
  const sh = sheet(g, wxPaper, 0.2, 0.28);
  sh.visible = false;
  const penM = pen(g);
  penM.visible = false;
  part(g, rbox(0.6, 0.04, 0.2, 0.01), '#546e7a', 1.14, 1.6, -0.36);
  for (let i = 0; i < 6; i++) part(g, box(0.04, 0.24, 0.16), ['#1565c0', '#2e7d32', '#ef6c00'][i % 3], 0.92 + i * 0.09, 1.74, -0.36);
  // A real anemometer repeater.
  const wind = group(g, 1.14, 1.22, -0.41);
  part(wind, cyl(0.18, 0.18, 0.02, 20), BLACK, 0, 0, 0, { rx: Math.PI / 2 });
  part(wind, box(0.012, 0.13, 0.004), '#ff5252', 0, 0.06, 0.016, { outline: false });
  const spots: Record<string, Spot> = { plWeatherBrief: standAt(g, 'plWx') };
  spots['*'] = spots.plWeatherBrief;
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    scr.set(WX_TEX[now ? Math.round(n.scr ?? 0) : Math.floor(frac(t / 24) * 2)]);
    sweep.visible = (n.sweep ?? 0) > 0.5;
    if (sweep.visible) sweep.rotation.z = t * 2;
    const ru = n.routeU ?? 0;
    route.visible = ru > 0.01;
    if (route.visible) {
      const A = WX.routeA;
      const B = WX.routeB;
      const dx = B[0] - A[0];
      const dy = B[1] - A[1];
      const len = Math.hypot(dx, dy);
      route.scale.x = len * ru;
      route.position.set(A[0] + (dx * ru) / 2, A[1] + (dy * ru) / 2, -0.355);
      route.rotation.z = Math.atan2(dy, dx);
    }
    cb.visible = (n.cb ?? 0) > 0.5;
    if (cb.visible) {
      place(cb, [WX.routeA[0] + (WX.routeB[0] - WX.routeA[0]) * 0.62, WX.routeA[1] + (WX.routeB[1] - WX.routeA[1]) * 0.62, -0.352]);
      (cb.material as THREE.MeshBasicMaterial).color.set(Math.sin(t * 5) > 0 ? '#ff3b30' : '#b71c1c');
    }
    wind.rotation.z = Math.sin(t * 0.4) * 0.25;
    const s = N?.props.sheet;
    sh.visible = !!s;
    if (s) place(sh, s);
    const p = N?.props.pen;
    penM.visible = !!p;
    if (p) place(penM, p);
  });
  out.work = marker(g, WX.panel[0], WX.panel[1], WX.panel[2]);
}

// =============================================================================================
// 운항 승무원 준비실 (plCrewRoom).

function epaulette(g: THREE.Object3D): THREE.Group {
  const e = group(g);
  part(e, box(0.1, 0.012, 0.08), NAVY_D, 0, 0, 0, { outline: false });
  for (let i = 0; i < 4; i++) part(e, box(0.1, 0.014, 0.01), GOLD, 0, 0.004, -0.03 + i * 0.02, { outline: false });
  return e;
}
function pilotCap(g: THREE.Object3D): THREE.Group {
  const c = group(g);
  part(c, cyl(0.125, 0.105, 0.05, 16), NAVY_D, 0, 0.03, 0);
  part(c, cyl(0.15, 0.125, 0.04, 16), '#f7f7f7', 0, 0.07, 0);
  part(c, box(0.17, 0.012, 0.09), BLACK, 0, 0.01, 0.12, { outline: false });
  part(c, box(0.05, 0.03, 0.01), GOLD, 0, 0.055, 0.13, { outline: false });
  return c;
}
function flightBag(g: THREE.Object3D): { bag: THREE.Group; lid: THREE.Group } {
  const b = group(g);
  part(b, rbox(0.42, 0.34, 0.24, 0.02), '#1f2226', 0, 0.2, 0);
  part(b, box(0.3, 0.14, 0.01), '#2e333a', 0, 0.16, 0.122, { outline: false });
  part(b, box(0.14, 0.02, 0.02), '#8d6e4f', 0, 0.37, 0, { outline: false });
  for (const sx of [-1, 1]) part(b, box(0.02, 0.02, 0.26), GOLD, sx * 0.14, 0.33, 0, { outline: false });
  const lid = group(b, 0, 0.37, -0.12);
  part(lid, rbox(0.42, 0.02, 0.24, 0.008), '#2a2e33', 0, 0, 0.12);
  return { bag: b, lid };
}
function crewRoom(g: THREE.Group, out: Built) {
  part(g, box(3.0, 2.3, 0.06), '#b9c3cb', 0, 1.15, -0.46);
  // Three tall lockers at the left; the middle's the dweller's.
  const LX = [-1.3, -1.0, -0.7];
  const doors: THREE.Group[] = [];
  LX.forEach((x, i) => {
    part(g, box(0.29, 1.9, 0.44), NAVY, x, 0.95, -0.2);
    part(g, box(0.25, 1.86, 0.03), '#0a1a30', x, 0.95, 0.015);
    const d = group(g, x - 0.135, 0.95, 0.03);
    part(d, rbox(0.27, 1.84, 0.025, 0.008), shade(NAVY, 1.15), 0.135, 0, 0);
    part(d, cyl(0.012, 0.012, 0.12, 6), CHROME, 0.235, 0.17, 0.02, { outline: false });
    label(d, ['홍 기장', '기장', '김 부기장'][i], 0.2, 0.05, 0.135, 0.65, 0.015, '#fafafa', NAVY);
    for (let v = 0; v < 3; v++) part(d, box(0.14, 0.008, 0.002), '#0a1a30', 0.135, 0.78 - v * 0.02, 0.014, { outline: false });
    doors.push(d);
  });
  const myDoor = doors[1];
  // The white shirt jacket on its hanger inside, with the shelf.
  const hanger = group(g, CR.inside[0], 1.25, -0.22);
  part(hanger, rbox(0.25, 0.56, 0.05, 0.04), NAVY_D, 0, 0, 0);
  for (const sx of [-1, 1]) part(hanger, box(0.09, 0.012, 0.06), GOLD, sx * 0.08, 0.26, 0, { outline: false });
  // The bench.
  part(g, rbox(1.22, 0.05, 0.42, 0.02), '#8d6e4f', CR.bench[0], 0.48, CR.bench[2]);
  for (const x of [-0.5, 0.6]) part(g, box(0.06, 0.46, 0.34), '#37474f', x, 0.23, CR.bench[2]);
  // Flight bag, docs, headset on the bench.
  const { bag, lid } = flightBag(g);
  place(bag, CR.bench);
  const docA = group(g);
  part(docA, box(0.1, 0.012, 0.14), '#b71c1c', 0, 0.006, 0);
  label(docA, '면장', 0.08, 0.03, 0, 0.014, 0, '#b71c1c', '#ffffff').rotation.x = -Math.PI / 2;
  place(docA, CR.items[0]);
  const docB = group(g);
  part(docB, box(0.12, 0.012, 0.16), '#1565c0', 0, 0.006, 0);
  label(docB, '신체검사', 0.1, 0.03, 0, 0.014, 0, '#1565c0', '#ffffff').rotation.x = -Math.PI / 2;
  place(docB, CR.items[1]);
  // Mirror and cap shelf at the right, a rack of ties and shirts.
  part(g, rbox(0.66, 1.2, 0.04, 0.02), BLACK, CR.mirror[0], CR.mirror[1], -0.42);
  const mirrorM = ownLit(g, box(0.6, 1.12, 0.012), '#9fb7c3', CR.mirror[0], CR.mirror[1], -0.395);
  for (const y of [0.64, 1.76]) part(g, cyl(0.012, 0.012, 0.54, 6), '#fff8e1', CR.mirror[0], y, -0.385, { rz: Math.PI / 2, outline: false });
  part(g, box(0.42, 0.03, 0.28), '#8d6e4f', CR.cap[0], CR.cap[1] - 0.03, -0.3);
  const cap = pilotCap(g);
  place(cap, CR.cap);
  for (let i = 0; i < 2; i++) part(g, cyl(0.1, 0.09, 0.04, 14), NAVY_D, CR.cap[0] + 0.0, 1.53 - i * 0, -0.3 + 0.0, { outline: true });
  label(g, '복장 · 면장 · 신체검사 확인', 1.26, 0.1, 0.05, 1.72, -0.43, NAVY, '#ffffff');
  // On the wall behind the bench: epaulettes on a card, the notice.
  part(g, box(0.4, 0.3, 0.02), '#fafafa', 0.2, 1.3, -0.43);
  for (const sx of [-1, 1]) for (let r = 0; r < 2; r++) {
    const e = epaulette(g);
    e.position.set(0.2 + sx * 0.1, 1.38 - r * 0.14, -0.415);
    e.rotation.x = Math.PI / 2;
  }
  part(g, box(0.4, 0.3, 0.02), '#fff8e1', -0.3, 1.3, -0.43);
  picture(g, paperTex('plCrewNotice', '오늘의 비행', ['702 09:40', '704 13:20', '708 18:05']), 0.36, 0.26, -0.3, 1.3, -0.415);
  // Props in play.
  const jacket = group(g);
  part(jacket, rbox(0.36, 0.5, 0.235, 0.05), NAVY_D, 0, 0, 0);
  part(jacket, box(0.13, 0.42, 0.012), '#ffffff', 0, 0.02, 0.118, { outline: false });
  part(jacket, box(0.03, 0.3, 0.014), CORAL, 0, 0.02, 0.122, { outline: false });
  jacket.visible = false;
  const jh = group(g);
  part(jh, rbox(0.3, 0.5, 0.06, 0.03), NAVY_D, 0, 0, 0);
  jh.visible = false;
  const epL = epaulette(g);
  const epR = epaulette(g);
  const epH = epaulette(g);
  epL.visible = epR.visible = epH.visible = false;
  const capWorn = pilotCap(g);
  capWorn.visible = false;
  const capHeld = pilotCap(g);
  capHeld.visible = false;
  const spots: Record<string, Spot> = { plSuitUp: standAt(g, 'plSuit') };
  spots['*'] = spots.plSuitUp;
  let yawNow = Math.PI;
  drive(g, out, spots, (now, N) => {
    const n = N?.n ?? {};
    const p = N?.props ?? {};
    myDoor.rotation.y = -1.9 * (now ? (n.door ?? 0) : 0);
    hanger.visible = !now || (n.coat ?? 1) > 0.5;
    jh.visible = !!p.jacketH;
    if (p.jacketH) place(jh, p.jacketH);
    jacket.visible = !!p.jacket;
    if (p.jacket) place(jacket, p.jacket);
    if (N) yawNow = N.st.yaw;
    jacket.rotation.y = yawNow;
    epL.visible = !!p.barL;
    if (p.barL) place(epL, p.barL);
    epR.visible = !!p.barR;
    if (p.barR) place(epR, p.barR);
    epL.rotation.y = epR.rotation.y = yawNow;
    epH.visible = !!p.barHeld;
    if (p.barHeld) place(epH, p.barHeld);
    cap.visible = !now || (n.capGone ?? 0) < 0.5;
    capHeld.visible = !!p.capH;
    if (p.capH) place(capHeld, [p.capH[0], p.capH[1] - 0.04, p.capH[2]]);
    capWorn.visible = !!p.capOn;
    if (p.capOn) place(capWorn, [p.capOn[0], p.capOn[1] - 0.04, p.capOn[2]]);
    capWorn.rotation.y = yawNow;
    lid.rotation.x = -1.4 * (n.lid ?? 0);
    place(bag, p.bag ?? CR.bench);
    bag.rotation.x = p.bag ? -0.08 : 0;
    const packed = Math.round(n.packed ?? 0);
    docA.visible = !p.itemA ? packed < 1 : true;
    place(docA, p.itemA ?? CR.items[0]);
    docB.visible = !p.itemB ? packed < 2 : true;
    place(docB, p.itemB ?? CR.items[1]);
    setLit(mirrorM, (n.lit ?? 0) > 0.5 ? '#d7eaf3' : '#9fb7c3');
  });
  out.work = marker(g, CR.bench[0], 0.7, CR.bench[2]);
}

// =============================================================================================
// 건강·피로 점검대 (plFitKiosk).

const fitTexes = [
  listTex('plFit0', '비행 전 건강 점검', [['직원증을 대 주세요', '#ffd54f']], '#00796b', 128 * 2, 256, 17),
  listTex('plFit1', '음주 측정', [['천천히 부세요'], ['0.000%', '#7dff9a']], '#00796b', 256, 256, 22),
  listTex('plFit2', '혈압 측정', [['118 / 76', '#7dff9a'], ['맥박 68']], '#00796b', 256, 256, 28),
  listTex('plFit3', '피로 점검 1/3', [['어젯밤 수면 시간은?'], ['7시간 이상', '#7dff9a']], '#00796b', 256, 256, 18),
  listTex('plFit4', '피로 점검 2/3', [['지금 졸린 정도는?'], ['거의 없음', '#7dff9a']], '#00796b', 256, 256, 18),
  listTex('plFit5', '피로 점검 3/3', [['최근 복용한 약은?'], ['없음', '#7dff9a']], '#00796b', 256, 256, 18),
  painted('plFit6', 256, 256, (c) => {
    c.fillStyle = '#e8f5e9';
    c.fillRect(0, 0, 256, 256);
    c.fillStyle = '#2e7d32';
    c.beginPath();
    c.arc(128, 96, 56, 0, 7);
    c.fill();
    text(c, '적합', 128, 96, 40, '#ffffff', 'center');
    text(c, '비행 가능', 128, 190, 28, '#1b5e20', 'center');
  }),
];
function fitKiosk(g: THREE.Group, out: Built) {
  part(g, box(1.9, 0.04, 0.9), '#cfd8dc', 0, 0.02, 0);
  // The pillar and touch screen.
  part(g, rbox(0.7, 1.78, 0.2, 0.03), '#eceff1', -0.28, 0.89, -0.32);
  part(g, rbox(0.54, 0.54, 0.03, 0.02), BLACK, KS.screen[0], KS.screen[1], -0.22);
  const scr = swapPic(g, 0.5, 0.5, KS.screen[0], KS.screen[1], -0.203);
  scr.set(fitTexes[0]);
  label(g, '건강 · 피로 점검', 0.6, 0.1, -0.28, 1.7, -0.215, '#00796b', '#ffffff');
  // Reader, tester cradle, slip printer, on a little shelf.
  part(g, rbox(0.86, 0.05, 0.32, 0.015), '#b0bec5', -0.2, 0.98, -0.08);
  part(g, box(0.4, 0.84, 0.18), '#90a4ae', -0.28, 0.44, -0.2);
  part(g, rbox(0.14, 0.04, 0.14, 0.01), BLACK, KS.reader[0], 1.02, KS.reader[2]);
  const led = ownLit(g, box(0.05, 0.01, 0.01), '#2e7d32', KS.reader[0], 1.05, KS.reader[2] - 0.05);
  part(g, rbox(0.1, 0.06, 0.1, 0.01), '#546e7a', KS.wand[0], 1.03, KS.wand[2]);
  const wand = group(g);
  part(wand, rbox(0.045, 0.14, 0.03, 0.01), '#00796b', 0, 0, 0);
  part(wand, cyl(0.01, 0.01, 0.05, 6), '#fafafa', 0, 0.09, 0, { outline: false });
  place(wand, KS.wand);
  const readout = ownLit(wand, box(0.028, 0.02, 0.003), '#163b34', 0, 0.02, 0.017);
  part(g, rbox(0.2, 0.06, 0.12, 0.01), '#546e7a', KS.slip[0], 0.93, KS.slip[2] - 0.08);
  const slip = group(g);
  part(slip, box(0.08, 0.002, 0.14), PAPER, 0, 0, 0, { outline: false });
  label(slip, '적합', 0.06, 0.03, 0, 0.002, 0, PAPER, '#2e7d32').rotation.x = -Math.PI / 2;
  slip.visible = false;
  // The blood-pressure cuff on a stand at the side.
  part(g, cyl(0.03, 0.04, 0.86, 8), '#90a4ae', KS.cuff[0], 0.45, KS.cuff[2] - 0.06);
  part(g, cyl(0.2, 0.22, 0.03, 14), '#90a4ae', KS.cuff[0], 0.02, KS.cuff[2] - 0.06);
  const cuff = group(g, KS.cuff[0], KS.cuff[1], KS.cuff[2]);
  part(cuff, cyl(0.08, 0.08, 0.22, 14), '#37474f', 0, 0, 0, { rx: Math.PI / 2 });
  part(cuff, cyl(0.058, 0.058, 0.23, 14), '#0e1419', 0, 0, 0, { rx: Math.PI / 2, outline: false });
  label(g, '혈압', 0.14, 0.05, KS.cuff[0], KS.cuff[1] + 0.12, KS.cuff[2] + 0.11, '#37474f', '#ffffff');
  // A hand sanitiser and a tissue box, a small notice, a stool.
  part(g, cyl(0.03, 0.03, 0.14, 8), '#e0f2f1', 0.14, 1.07, -0.14);
  part(g, rbox(0.14, 0.06, 0.1, 0.01), '#fff8e1', 0.1, 1.03, -0.02);
  picture(g, paperTex('plFitRule', '비행 전 필수', ['12시간 금주', '8시간 수면', '이상 시 보고']), 0.28, 0.38, 0.3, 1.5, -0.45);
  part(g, box(0.34, 0.44, 0.02), '#37474f', 0.3, 1.5, -0.47);
  const spots: Record<string, Spot> = { plFitCheck: standAt(g, 'plFit') };
  spots['*'] = spots.plFitCheck;
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    const p = N?.props ?? {};
    scr.set(fitTexes[now ? Math.round(n.scr ?? 0) : 0]);
    setLit(led, (n.led ?? 0) > 0.5 || (now && Math.sin(t * 5) > 0) ? '#66ff66' : '#2e7d32');
    place(wand, p.wand ?? KS.wand);
    setLit(readout, (n.read ?? 0) > 0.1 ? '#7dff9a' : '#163b34');
    const sq = 1 - 0.1 * (n.squeeze ?? 0);
    cuff.scale.set(sq, sq, 1);
    const sp = p.slip;
    slip.visible = !!sp;
    if (sp) {
      place(slip, sp);
    }
  });
  out.work = marker(g, KS.reader[0], KS.reader[1], KS.reader[2]);
}

// =============================================================================================
// 운항 현황판 (plFleetBoard): the room's big board; little aeroplanes creeping along their routes.

const FLEET_ROUTES: Array<[number, number, number, number]> = [
  [0.1, 0.72, 0.46, 0.25],
  [0.1, 0.72, 0.7, 0.62],
  [0.46, 0.8, 0.7, 0.62],
  [0.7, 0.62, 0.46, 0.25],
];
const fleetTex = painted('plFleet', 1024, 300, (c) => {
  c.fillStyle = '#071827';
  c.fillRect(0, 0, 1024, 300);
  c.fillStyle = '#123049';
  c.beginPath();
  c.moveTo(0, 70);
  c.quadraticCurveTo(180, 100, 200, 300);
  c.lineTo(0, 300);
  c.fill();
  c.beginPath();
  c.moveTo(500, 0);
  c.quadraticCurveTo(420, 120, 560, 300);
  c.lineTo(640, 300);
  c.quadraticCurveTo(540, 120, 640, 0);
  c.fill();
  text(c, '한누리항공 운항 현황', 16, 22, 24, '#90caf9');
  c.strokeStyle = '#2c6a8f';
  c.lineWidth = 2;
  for (const r of FLEET_ROUTES) {
    c.beginPath();
    c.moveTo(r[0] * 1024, r[1] * 300);
    c.lineTo(r[2] * 1024, r[3] * 300);
    c.stroke();
  }
  c.fillStyle = '#ffd54f';
  for (const [x, y, s] of [[0.1, 0.72, '누리'], [0.46, 0.25, '미래'], [0.46, 0.8, '가람'], [0.7, 0.62, '한빛']] as const) {
    c.fillRect(x * 1024 - 4, y * 300 - 4, 8, 8);
    text(c, s, x * 1024 + 8, y * 300 + 14, 17, '#cfe3ee');
  }
});
const FLEET_ROWS: Array<[string, string, string, string]> = [
  ['702', '한빛', '09:40', '탑승 중'],
  ['704', '가람', '13:20', '정시'],
  ['708', '미래', '18:05', '정시'],
  ['711', '누리', '10:15', '도착'],
  ['716', '한빛', '20:30', '점검 중'],
];
const flapTex = (off: number) => painted(`plFlaps${off}`, 512, 300, (c) => {
  c.fillStyle = '#0c1119';
  c.fillRect(0, 0, 512, 300);
  text(c, '오늘의 출발', 14, 24, 24, '#ffd54f');
  FLEET_ROWS.forEach((_, i) => {
    const r = FLEET_ROWS[(i + off) % FLEET_ROWS.length];
    const y = 66 + i * 46;
    c.fillStyle = '#1c232e';
    c.fillRect(8, y - 18, 496, 38);
    text(c, r[0], 18, y, 24, '#ffffff');
    text(c, r[1], 92, y, 24, '#ffffff');
    text(c, r[2], 200, y, 24, '#ffffff');
    text(c, r[3], 320, y, 24, r[3] === '탑승 중' ? '#7dff9a' : r[3] === '점검 중' ? '#ffb300' : '#cfe3ee');
  });
});
function fleetBoard(g: THREE.Group, out: Built) {
  part(g, box(4.0, 2.2, 0.08), '#1b2a3a', 0, 1.3, -0.46);
  part(g, rbox(2.5, 1.0, 0.05, 0.02), BLACK, -0.68, 1.65, -0.41);
  const map = picture(g, fleetTex, 2.4, 0.9, -0.68, 1.65, -0.38);
  map.renderOrder = 0;
  part(g, rbox(1.26, 1.0, 0.05, 0.02), BLACK, 1.26, 1.65, -0.41);
  const flaps = swapPic(g, 1.18, 0.9, 1.26, 1.65, -0.38);
  flaps.set(flapTex(0));
  label(g, '운항 통제', 1.0, 0.14, -0.68, 2.26, -0.41, NAVY, '#ffffff');
  // Low cabinets below: radios, files, a landline, a model aeroplane on its stand.
  part(g, rbox(3.86, 0.76, 0.44, 0.02), '#46525d', 0, 0.38, -0.2);
  for (let i = 0; i < 6; i++) {
    part(g, box(0.56, 0.68, 0.01), '#546e7a', -1.6 + i * 0.64, 0.38, 0.025, { outline: false });
    part(g, cyl(0.01, 0.01, 0.1, 6), CHROME, -1.38 + i * 0.64, 0.38, 0.04, { outline: false });
  }
  part(g, rbox(0.46, 0.2, 0.26, 0.02), '#263238', -1.3, 0.87, -0.2);
  for (let i = 0; i < 3; i++) ownLit(g, box(0.05, 0.02, 0.004), ['#7dff9a', '#ffd54f', '#7dff9a'][i], -1.42 + i * 0.12, 0.92, -0.068);
  const model = group(g, 1.2, 0.77, -0.2);
  part(model, cyl(0.012, 0.03, 0.2, 8), CHROME, 0, 0.1, 0, { outline: false });
  part(model, cyl(0.03, 0.03, 0.42, 10), '#f4f6f8', 0, 0.22, 0, { rz: Math.PI / 2 });
  part(model, box(0.14, 0.008, 0.42), '#f4f6f8', 0, 0.22, 0, { outline: false });
  part(model, box(0.1, 0.1, 0.008), NAVY, -0.19, 0.28, 0, { outline: false });
  for (let i = 0; i < 4; i++) part(g, box(0.05, 0.22 + (i % 2) * 0.04, 0.16), ['#1565c0', '#ef6c00', '#43a047', '#b71c1c'][i], 0.2 + i * 0.07, 0.88, -0.2);
  // Little planes.
  const dots = FLEET_ROUTES.map(() => {
    const d = group(g);
    part(d, box(0.05, 0.012, 0.004), '#ffffff', 0, 0, 0, { outline: false, shadow: false });
    part(d, box(0.014, 0.05, 0.004), '#ffffff', 0, 0, 0, { outline: false, shadow: false });
    return d;
  });
  out.away = (_o, t) => {
    FLEET_ROUTES.forEach((r, i) => {
      const u = frac((t + i * 17) / (70 + i * 13));
      const px = -0.68 + (r[0] + (r[2] - r[0]) * u - 0.5) * 2.4;
      const py = 1.65 - (r[1] + (r[3] - r[1]) * u - 0.5) * 0.9;
      dots[i].position.set(px, py, -0.372);
      dots[i].rotation.z = Math.atan2(-(r[3] - r[1]) * 0.9, (r[2] - r[0]) * 2.4);
    });
    flaps.set(flapTex(Math.floor(frac(t / 55) * FLEET_ROWS.length)));
  };
}

// ---------------------------------------------------------------------------------------------

// =============================================================================================
// The gate (2026-11-04, the layout audit): a narrow-body's nose at its stand, the jet bridge, the apron's paint; and the special
// flying branch's doctor helicopter on its pad.

const NOL = { outline: false };
const FUSE_R = 1.95;
const BELLY = 0.95;
/** Along the fuselage (its own z, the nose at +z): the nose's tip, where the nose cone meets the barrel, the front door's middle. */
const AC = { tip: 2.9, cone: 0.2, door: -0.6 };

/**
 * 계류장 여객기 (6 × 6): a narrow-body parked nose-in, its nose towards the terminal (+z): the white barrel running off the lot to its
 * wings and engines, the cockpit's windows, the cheatline in the airline's colours and the name, the open front door on its left
 * (+x) where the bridge meets it, the nose gear chocked. Walked round under the nose before the flight; on a flight it's pushed
 * back and gone, and comes back to its stand.
 */
function gateAircraft(g: THREE.Group, D: number, out: Built) {
  const plane = new THREE.Group();
  g.add(plane);
  const C = BELLY + FUSE_R;
  const white = '#f4f6f8';
  const back = -26;
  part(plane, cyl(FUSE_R, FUSE_R, AC.cone - back, 28), white, 0, C, (AC.cone + back) / 2, { rx: Math.PI / 2 });
  part(plane, cyl(FUSE_R * 0.995, FUSE_R * 0.995, AC.cone - back, 28), '#cfd6db', 0, C - 0.1, (AC.cone + back) / 2, { rx: Math.PI / 2 });
  const nose = part(plane, ball(FUSE_R), white, 0, C, AC.cone);
  nose.scale.set(1, 0.97, (AC.tip - AC.cone) / FUSE_R);
  // The cheatline and the windows down the left side; the name.
  for (const sx of [-1, 1]) {
    const x = sx * (FUSE_R + 0.005);
    part(plane, box(0.02, 0.12, AC.cone - back - 1), CORAL, x, C - 0.35, (AC.cone + back) / 2 - 0.5, NOL);
    part(plane, box(0.02, 0.05, AC.cone - back - 1), NAVY, x, C - 0.5, (AC.cone + back) / 2 - 0.5, NOL);
    for (let z = AC.door - 2.2; z > back + 1; z -= 0.95) part(plane, rbox(0.03, 0.34, 0.24, 0.1), '#1f2f40', x, C + 0.3, z, NOL);
    label(plane, AIR, 3.0, 0.42, x + sx * 0.01, C + 1.0, -9, white, NAVY, sx > 0 ? Math.PI / 2 : -Math.PI / 2);
  }
  // The cockpit's windows, a band round the nose's upper side.
  for (const [x, ry] of [[-0.62, -0.5], [-0.22, -0.15], [0.22, 0.15], [0.62, 0.5]] as const) part(plane, rbox(0.36, 0.3, 0.04, 0.05), '#1f2f40', x, C + 0.85, AC.tip - 0.95 - Math.abs(x) * 0.5, { ry, rx: -0.5, outline: false });
  // The front door on the left, its leaf swung open against the barrel.
  part(plane, rbox(0.04, 1.85, 0.85, 0.08), '#1a2531', FUSE_R + 0.01, C - 0.15, AC.door);
  part(plane, rbox(0.06, 1.8, 0.82, 0.08), white, FUSE_R + 0.45, C - 0.15, AC.door + 0.75, { ry: -1.2 });
  // The nose gear, its tyres chocked; the radome's seam.
  part(plane, cyl(0.07, 0.07, BELLY + 0.2, 10), '#90a4ae', 0, (BELLY + 0.2) / 2, AC.tip - 2.0);
  for (const sx of [-1, 1]) {
    part(plane, cyl(0.38, 0.38, 0.24, 18), '#212121', sx * 0.2, 0.38, AC.tip - 2.0, { rz: Math.PI / 2 });
    for (const sz of [-1, 1]) part(plane, box(0.16, 0.14, 0.24), '#fdd835', sx * 0.2, 0.07, AC.tip - 2.0 + sz * 0.5);
  }
  // The wings and engines, back past the lot's edge.
  for (const sx of [-1, 1]) {
    part(plane, box(15, 0.35, 4.5), '#e3e7ea', sx * (FUSE_R + 7.5), BELLY + 0.9, -16, { ry: sx * 0.35 });
    part(plane, cyl(1.05, 0.95, 4.2, 20), '#d9dee2', sx * 5.8, BELLY + 0.1, -13.5, { rx: Math.PI / 2 });
    part(plane, cyl(0.9, 0.9, 0.05, 20), '#37474f', sx * 5.8, BELLY + 0.1, -11.4, { rx: Math.PI / 2 });
  }
  // A walk round under the nose; boarding at the bridge.
  const walk = spot(g, 'stand', -1.2, 0, D / 2 + 0.5, Math.PI);
  walk.work = marker(g, 0, 1.6, AC.tip - 2.2);
  walk.motion = 'peer';
  const board = spot(g, 'stand', 1.6, 0, D / 2 + 0.5, Math.PI);
  board.work = walk.work;
  board.motion = 'still';
  out.work = walk.work;
  out.spots = { preflightCheck: walk, flyRoute: board, '*': walk };
  let push = 0;
  let last = 0;
  out.away = (isOut, t) => {
    const dt = Math.min(0.1, Math.max(0, t - last));
    last = t;
    push = THREE.MathUtils.clamp(push + (isOut ? 1 : -1) * dt * 0.25, 0, 1);
    plane.position.z = -push * push * 30;
    plane.visible = push < 0.98;
  };
}

/**
 * 탑승교 (2 × 3): from the rotunda at the terminal's wall (its south end) the glazed tunnel runs out on its legs and wheels, and its
 * cab turns west to meet the aircraft's front door, the canopy closed round the door.
 */
function jetBridge(g: THREE.Group, D: number) {
  const floor = BELLY + FUSE_R - 1.05;
  const H = 2.6;
  const tz0 = D / 2 - 0.3;
  const tz1 = -3.0;
  // The rotunda on its column at the wall.
  part(g, cyl(0.35, 0.35, floor, 14), '#90a4ae', 0, floor / 2, tz0);
  part(g, rbox(2.4, H, 2.4, 0.15), '#cfd8dc', 0, floor + H / 2, tz0 - 0.4);
  // The tunnel north, glazed along its sides; the drive leg near its outer end.
  part(g, rbox(2.0, H, tz0 - tz1 - 1.6, 0.1), '#b0bec5', 0, floor + H / 2, (tz0 + tz1) / 2 - 0.4);
  for (const sx of [-1, 1]) part(g, box(0.02, 1.0, tz0 - tz1 - 2.2), '#9ec5d6', sx * 1.01, floor + 1.5, (tz0 + tz1) / 2 - 0.4, NOL);
  for (let i = 0; i < 6; i++) part(g, box(2.02, 0.04, 0.04), '#78909c', 0, floor + H, tz0 - 1.4 - i * 0.65, NOL);
  for (const sx of [-1, 1]) {
    part(g, box(0.18, floor, 0.18), '#78909c', sx * 0.6, floor / 2, tz1 + 1.2);
    part(g, cyl(0.3, 0.3, 0.25, 14), '#212121', sx * 0.6, 0.3, tz1 + 1.2, { rz: Math.PI / 2 });
  }
  part(g, box(1.5, 0.2, 0.3), '#fbc02d', 0, 0.55, tz1 + 1.2, NOL);
  // The cab turned west to the door, its canopy.
  part(g, rbox(2.2, H + 0.1, 2.2, 0.1), '#cfd8dc', -0.6, floor + H / 2, tz1);
  part(g, rbox(0.4, H - 0.2, 1.4, 0.15), '#37474f', -1.75, floor + H / 2 - 0.05, tz1);
  label(g, '7', 0.5, 0.5, 0, floor + H + 0.35, tz0 - 0.4, CORAL, '#ffffff');
}

/**
 * 계류장 유도선 (11 × 7): the yellow lead-in line down the stand's middle to the nose's stop bar, the red line round where no vehicle
 * goes while the aircraft comes in, the hatched box where the ground equipment waits, the stand's number.
 */
function apronMarks(g: THREE.Group, W: number, D: number) {
  const x0 = -W / 2;
  const z0 = -D / 2;
  const line = (w: number, d: number, x: number, z: number, c: string) => part(g, box(w, 0.004, d), c, x, 0.014, z, NOL);
  const cx = x0 + 6;
  line(0.15, D - 1.0, cx, z0 + (D - 1.0) / 2, '#fbc02d');
  line(1.6, 0.18, cx, z0 + 6.05, '#fbc02d');
  line(0.12, 6.2, x0 + 2.8, z0 + 3.1, '#e53935');
  line(0.12, 6.2, x0 + 9.2, z0 + 3.1, '#e53935');
  line(6.4, 0.12, cx, z0 + 6.25, '#e53935');
  for (let i = 0; i < 6; i++) line(1.6, 0.08, x0 + 1.3, z0 + 0.6 + i * 0.6, '#f5f5f5');
  line(0.08, 3.6, x0 + 0.5, z0 + 2.1, '#f5f5f5');
  line(0.08, 3.6, x0 + 2.1, z0 + 2.1, '#f5f5f5');
  label(g, '7', 0.6, 0.6, cx, 0.016, z0 + 6.6, '#55595e', '#fbc02d').rotation.set(-Math.PI / 2, 0, 0);
}

/**
 * 닥터헬기 (7 × 3): a twin-engine medical helicopter along its length (its nose at +x), red and white with the cross, the four-blade
 * rotor over it, the skids, the side door open to its stretcher bay. Walked round before a flight; on a call it lifts off and is gone.
 */
function helicopter(g: THREE.Group, W: number, D: number, out: Built) {
  const heli = new THREE.Group();
  g.add(heli);
  const red = '#d32f2f';
  const cab = part(heli, ball(1.0), '#f5f5f5', 0.9, 1.35, 0);
  cab.scale.set(1.9, 1.0, 0.85);
  part(heli, box(2.6, 0.5, 1.72), red, 0.6, 0.95, 0);
  const glass = part(heli, ball(0.9), '#1f2f40', 2.2, 1.55, 0);
  glass.scale.set(0.9, 0.75, 0.82);
  part(heli, cyl(0.32, 0.14, 4.0, 14), '#f5f5f5', -2.6, 1.55, 0, { rz: Math.PI / 2 });
  part(heli, box(1.0, 1.1, 0.08), red, -4.4, 2.05, 0);
  part(heli, cyl(0.45, 0.45, 0.1, 18), '#eceff1', -4.5, 1.9, 0.1, { rx: Math.PI / 2 });
  for (const sz of [-1, 1]) {
    part(heli, box(3.4, 0.06, 0.08), '#455a64', 0.7, 0.12, sz * 0.75, NOL);
    for (const x of [-0.3, 1.7]) part(heli, box(0.06, 0.6, 0.06), '#455a64', x, 0.4, sz * 0.75, NOL);
    // The red cross on each side.
    part(heli, box(0.6, 0.18, 0.02), red, 0.4, 1.5, sz * 0.86, NOL);
    part(heli, box(0.18, 0.6, 0.02), red, 0.4, 1.5, sz * 0.865, NOL);
  }
  label(heli, '닥터헬기', 1.0, 0.24, -0.6, 1.25, 0.87, '#f5f5f5', red);
  part(heli, rbox(1.4, 0.4, 0.9, 0.15), '#eceff1', 0.2, 2.35, 0);
  const rotor = new THREE.Group();
  rotor.position.set(0.2, 2.65, 0);
  heli.add(rotor);
  part(rotor, cyl(0.12, 0.12, 0.3, 10), '#455a64', 0, -0.1, 0);
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Group();
    b.rotation.y = (i * Math.PI) / 2 + 0.4;
    rotor.add(b);
    part(b, box(5.1, 0.04, 0.28), '#37474f', 2.6, 0, 0, NOL);
  }
  const walk = spot(g, 'stand', 0.9, 0, D / 2 + 0.5, Math.PI);
  walk.work = marker(g, 0.9, 1.4, 0.9);
  walk.motion = 'peer';
  const board = spot(g, 'stand', -0.3, 0, D / 2 + 0.5, Math.PI);
  board.work = walk.work;
  board.motion = 'still';
  out.work = walk.work;
  out.spots = { preflightCheck: walk, flyRoute: board, '*': walk };
  let up = 0;
  let last = 0;
  out.away = (isOut, t) => {
    const dt = Math.min(0.1, Math.max(0, t - last));
    last = t;
    up = THREE.MathUtils.clamp(up + (isOut ? 1 : -1) * dt * 0.2, 0, 1);
    heli.position.y = up * up * 40;
    rotor.rotation.y += up > 0 ? dt * 30 : 0;
    heli.visible = up < 0.98;
  };
  void W;
}

/** 헬기장 (9 × 7): the pad's touchdown square edged in white with its lights, the H in its circle, the windsock at the corner. */
function helipad(g: THREE.Group, W: number, D: number) {
  const line = (w: number, d: number, x: number, z: number, c: string) => part(g, box(w, 0.004, d), c, x, 0.014, z, NOL);
  const s = Math.min(W, D) - 0.6;
  for (const sz of [-1, 1]) line(s, 0.2, 0, (sz * s) / 2, '#f5f5f5');
  for (const sx of [-1, 1]) line(0.2, s, (sx * s) / 2, 0, '#f5f5f5');
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.9, 2.15, 40), new THREE.MeshBasicMaterial({ color: '#fbc02d' }));
  ring.userData.ownGeometry = ring.userData.ownMaterial = true;
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.016;
  g.add(ring);
  line(0.3, 2.0, -0.6, 0, '#f5f5f5');
  line(0.3, 2.0, 0.6, 0, '#f5f5f5');
  line(1.2, 0.3, 0, 0, '#f5f5f5');
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    part(g, cyl(0.06, 0.06, 0.1, 8), '#66bb6a', (Math.cos(a) * s) / 2, 0.05, (Math.sin(a) * s) / 2);
  }
  part(g, cyl(0.04, 0.04, 3.2, 8), '#eceff1', W / 2 - 0.3, 1.6, -D / 2 + 0.3);
  part(g, cyl(0.18, 0.08, 1.0, 10), '#ff6f00', W / 2 - 0.3 + 0.5, 3.0, -D / 2 + 0.3, { rz: Math.PI / 2 });
}

export const BUILDERS: Record<string, Builder> = {
  flightSimulator(g, _W, _D, _c, _def, _ctx, out) {
    flightSimulator(g, out);
  },
  briefingTable(g, _W, _D, _c, _def, _ctx, out) {
    briefingTable(g, out);
  },
  opsDesk(g, _W, _D, _c, _def, _ctx, out) {
    opsDesk(g, out);
  },
  boardingGate(g, _W, _D, _c, _def, _ctx, out) {
    boardingGate(g, out);
  },
  plCpt(g, _W, _D, _c, _def, _ctx, out) {
    cpt(g, out);
  },
  plWxWall(g, _W, _D, _c, _def, _ctx, out) {
    wxWall(g, out);
  },
  plCrewRoom(g, _W, _D, _c, _def, _ctx, out) {
    crewRoom(g, out);
  },
  plFitKiosk(g, _W, _D, _c, _def, _ctx, out) {
    fitKiosk(g, out);
  },
  plFleetBoard(g, _W, _D, _c, _def, _ctx, out) {
    fleetBoard(g, out);
  },
  plGateAircraft(g, _W, D, _c, _def, _ctx, out) {
    gateAircraft(g, D, out);
  },
  plJetBridge(g, _W, D) {
    jetBridge(g, D);
  },
  plApronMarks(g, W, D) {
    apronMarks(g, W, D);
  },
  plHelicopter(g, W, D, _c, _def, _ctx, out) {
    helicopter(g, W, D, out);
  },
  plHelipad(g, W, D) {
    helipad(g, W, D);
  },
};
