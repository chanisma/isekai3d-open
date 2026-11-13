import * as THREE from 'three';
import { vroidFigure } from './vroidFigure';
import { marker, rod, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, label, painted, picture, seeded, text } from './doctor';
import * as MM from './meteorologistMotion';
import { BL, BR, FW, MT, OG, PD, TY, WS, WV, type MtMotion, type MtNow } from './meteorologistMotion';

/**
 * The 기상청 예보실 drawn as itself (2026-10-31 workplace pipeline, at the user's request): a government
 * forecast office at work. The chart wall, on which isobars and fronts are drawn by hand while the radar
 * loop steps beside it, with the warning sign and its beacon; the model terminals; the radar console;
 * the TV set with its green wall, return monitor, camera and operator; the table where the hour's forecast
 * is argued out; the lit typhoon table; on the lot the balloon launcher and the observation garden; in the
 * lobby the desk that takes the public's calls.
 *
 * Everything that moves follows the same scripts as the hands (meteorologistMotion.ts): a chart gains a
 * front only as the marker draws it, a balloon swells only while the valve is open. The place names on
 * the maps (은빛만, 솔내, 가람, 너른들, 한내) and the 가람 model are made up.
 */

const NAVY = '#12324f';
const PANEL = '#37474f';
const PANEL_D = '#263238';
const PAPER = '#fbfaf4';
const SEA = '#cfe6f1';
const LAND = '#ecebd6';
const UP = new THREE.Vector3(0, 1, 0);
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3();
type V = readonly [number, number, number];

const PANE = new THREE.MeshToonMaterial({ color: '#dff1fb', transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide });
const WATER = new THREE.MeshToonMaterial({ color: '#7ec4e8', transparent: true, opacity: 0.75 });
const RUBBER = new THREE.MeshToonMaterial({ color: '#fbfbf6' });

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
function flat(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number): THREE.Mesh {
  const m = picture(g, tex, w, h, x, y, z);
  m.rotation.x = -Math.PI / 2;
  return m;
}
/** Pictures painted the first time they're asked for, each once. */
function frames(key: string, w: number, h: number, paint: (c: CanvasRenderingContext2D, i: number) => void): (i: number) => THREE.Texture {
  return (i) => painted(`met${key}|${i}`, w, h, (c) => paint(c, i));
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
function standAt(g: THREE.Object3D, motion: MtMotion): Spot {
  const s = spot(g, 'stand', 0, 0, 0.6, Math.PI);
  s.motion = motion;
  return s;
}
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
function nowAt(spots: Record<string, Spot>, t: number): string | null {
  let best: string | null = null;
  for (const [k, s] of Object.entries(spots)) if (Math.abs(t - posedAt(s)) < 0.6 && (best === null || posedAt(s) > posedAt(spots[best]))) best = k;
  return best;
}
/** Every frame: which use is going on and where its script has got to. */
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, show: (now: string | null, N: MtNow | null, t: number) => void) {
  out.spots = spots;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const N = sp ? MM.mtNow(sp.motion as MtMotion, t, MM.mtPhase(g.getWorldPosition(tmp)), (sp.at.userData.height as number | undefined) ?? 1.6) : null;
    show(now, N, t);
  };
}
function swivel(g: THREE.Object3D, x: number, z: number, ry: number, color = '#37474f') {
  const c = group(g, x, 0, z, ry);
  part(c, cyl(0.025, 0.035, 0.38, 8), BLACK, 0, 0.22, 0);
  part(c, cyl(0.2, 0.22, 0.03, 12), BLACK, 0, 0.025, 0);
  part(c, rbox(0.44, 0.06, 0.42, 0.03), color, 0, 0.44, 0);
  part(c, rbox(0.42, 0.46, 0.05, 0.03), color, 0, 0.75, -0.2, { rx: -0.08 });
  return c;
}
function monitor(g: THREE.Object3D, x: number, y: number, z: number, ry: number, w = 0.44, h = 0.29) {
  const m = group(g, x, 0, z, ry);
  part(m, rbox(w + 0.03, h + 0.03, 0.03, 0.01), BLACK, 0, y, 0);
  part(m, cyl(0.016, 0.02, y - 0.74 - h / 2, 8), BLACK, 0, 0.74 + (y - 0.74 - h / 2) / 2, -0.03, { outline: false });
  part(m, rbox(0.17, 0.012, 0.12, 0.005), BLACK, 0, 0.746, -0.03);
  return swapPic(m, w, h, 0, y, 0.017);
}
function keyboard(g: THREE.Object3D, x: number, y: number, z: number, w = 0.36) {
  part(g, rbox(w, 0.015, 0.13, 0.006), '#3d4850', x, y, z);
  const s = seeded(29 + Math.round(x * 100));
  for (let i = 0; i < 4; i++) part(g, box(w - 0.03, 0.002, 0.018), s() > 0.5 ? '#90a4ae' : '#78909c', x, y + 0.009, z - 0.042 + i * 0.028, { outline: false });
}
function clipboard(g: THREE.Object3D, lines: () => THREE.Texture): { t: THREE.Group; page: ReturnType<typeof swapPic> } {
  const t = group(g);
  part(t, rbox(0.2, 0.28, 0.012, 0.008), '#8d6e63', 0, 0, 0);
  part(t, box(0.07, 0.024, 0.016), CHROME, 0, 0.13, 0.008, { outline: false });
  const page = swapPic(t, 0.18, 0.24, 0, -0.01, 0.0075);
  page.set(lines());
  return { t, page };
}
function pencil(g: THREE.Object3D, color = '#fdd835'): THREE.Group {
  const t = group(g);
  part(t, cyl(0.006, 0.006, 0.13, 6), color, 0, 0.06, 0, { outline: false });
  part(t, cyl(0.006, 0.001, 0.02, 6), '#3e2723', 0, -0.015, 0, { outline: false, rx: Math.PI });
  t.rotation.set(0.5, 0, 0.3);
  return t;
}
const hiLo = (c: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string) => {
  c.strokeStyle = color;
  c.lineWidth = 2;
  c.beginPath();
  c.arc(x, y, size * 0.85, 0, Math.PI * 2);
  c.stroke();
  text(c, s, x, y, size, color, 'center');
};

// ---------------------------------------------------------------------------------------------
// People drawn in.

interface Look {
  top: string;
  bottom: string;
  hair: string;
  hairdo: 'short' | 'bob' | 'grey';
  jacket?: string;
  glasses?: boolean;
  skin?: string;
}
const SKIN = '#f1c9a5';
const LOOKS: Record<string, Look> = {
  director: { top: '#ffffff', bottom: '#263238', hair: '#bdbdbd', hairdo: 'grey', jacket: '#0277bd', glasses: true },
  senior: { top: '#e3f2fd', bottom: '#37474f', hair: '#2b1b10', hairdo: 'short', jacket: '#4fc3f7' },
  caster: { top: '#ffca28', bottom: '#3e4a5a', hair: '#3b2a20', hairdo: 'bob' },
  junior: { top: '#b0bec5', bottom: '#455a64', hair: '#1f1a17', hairdo: 'short', glasses: true },
  cam: { top: '#263238', bottom: '#263238', hair: '#1f1a17', hairdo: 'short' },
};
interface Figure {
  root: THREE.Group;
  head: THREE.Group;
  armL(to: THREE.Vector3 | null): void;
  armR(to: THREE.Vector3 | null): void;
}
/** Someone drawn in, feet (or the seat under them) at (x, z), turned `ry` (0 faces +z); hands rest until put somewhere (in the parent's frame). */
function person(parent: THREE.Object3D, look: Look, x: number, z: number, ry: number, seat?: number): Figure {
  const root = group(parent, x, 0, z, ry);
  const skin = look.skin ?? SKIN;
  const shoes = '#2b2b30';
  const sat = seat !== undefined;
  const sh = seat ?? 0;
  const shoulderY = sat ? sh + 0.53 : 1.31;
  const torsoY = sat ? sh + 0.33 : 1.11;
  if (sat) {
    for (const sx of [-1, 1]) {
      const hip = v3(sx * 0.09, sh + 0.07, -0.03);
      const knee = v3(sx * 0.1, sh + 0.1, 0.36);
      const ankle = v3(sx * 0.1, Math.max(0.1, sh - 0.33), 0.46);
      rod(root, hip, knee, 0.062, look.bottom);
      rod(root, knee, ankle, 0.05, look.bottom);
      part(root, rbox(0.09, 0.07, 0.2, 0.03), shoes, sx * 0.1, ankle.y - 0.035, ankle.z + 0.05);
    }
    part(root, rbox(0.31, 0.15, 0.26, 0.06), look.bottom, 0, sh + 0.08, 0);
  } else {
    for (const sx of [-1, 1]) {
      rod(root, v3(sx * 0.085, 0.84, 0), v3(sx * 0.09, 0.08, 0.01), 0.056, look.bottom);
      part(root, rbox(0.09, 0.07, 0.2, 0.03), shoes, sx * 0.09, 0.035, 0.04);
    }
    part(root, rbox(0.3, 0.17, 0.2, 0.06), look.bottom, 0, 0.88, 0);
  }
  const tz = sat ? -0.02 : 0;
  part(root, rbox(0.34, 0.46, 0.21, 0.08), look.top, 0, torsoY, tz);
  if (look.jacket) {
    for (const sx of [-1, 1]) part(root, rbox(0.13, 0.47, 0.226, 0.05), look.jacket, sx * 0.11, torsoY - 0.01, tz);
    part(root, rbox(0.35, 0.46, 0.1, 0.05), look.jacket, 0, torsoY - 0.01, tz - 0.065);
  }
  part(root, cyl(0.045, 0.05, 0.08, 10), skin, 0, shoulderY + 0.06, tz, { outline: false });
  const head = group(root, 0, shoulderY + 0.2, tz);
  part(head, ball(0.112), skin, 0, 0, 0);
  for (const sx of [-1, 1]) part(head, ball(0.012), '#2b2b30', sx * 0.04, 0.0, 0.104, { outline: false });
  part(head, box(0.03, 0.006, 0.004), '#a1665e', 0, -0.045, 0.104, { outline: false });
  if (look.hairdo === 'bob') {
    part(head, ball(0.122), look.hair, 0, 0.025, -0.03);
    for (const sx of [-1, 1]) part(head, rbox(0.05, 0.16, 0.14, 0.025), look.hair, sx * 0.1, -0.03, -0.02);
    part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0, 0.08, 0.08, { rx: -0.2 });
  } else {
    part(head, ball(look.hairdo === 'grey' ? 0.116 : 0.118), look.hair, 0, 0.03, -0.03);
    part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0, 0.075, 0.075, { rx: -0.25 });
  }
  if (look.glasses) {
    for (const sx of [-1, 1]) part(head, cyl(0.026, 0.026, 0.004, 14), '#37474f', sx * 0.042, 0.002, 0.11, { rx: Math.PI / 2, outline: false });
    part(head, box(0.02, 0.004, 0.004), '#37474f', 0, 0.002, 0.113, { outline: false });
  }
  const arm = (sx: number) => {
    const shoulder = v3(sx * 0.2, shoulderY, tz);
    const rest = sat ? v3(sx * 0.11, sh + 0.16, 0.24) : v3(sx * 0.23, 0.82, 0.05);
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
/** What only shows in use: colleagues, a camera. */
function scene(g: THREE.Group, out: Built): THREE.Group {
  const s = group(g);
  out.inUse = s;
  return s;
}

// ---------------------------------------------------------------------------------------------
// Maps. A made-up coast: sea to the left and bottom, land up the middle.

function coast(c: CanvasRenderingContext2D, w: number, h: number, sea = SEA, land = LAND, edge = '#8a9a7b') {
  c.fillStyle = sea;
  c.fillRect(0, 0, w, h);
  c.fillStyle = land;
  c.strokeStyle = edge;
  c.lineWidth = Math.max(1, w / 240);
  c.beginPath();
  const pts = [[0.42, 0], [0.4, 0.14], [0.47, 0.25], [0.44, 0.4], [0.5, 0.52], [0.46, 0.66], [0.52, 0.8], [0.62, 0.84], [0.7, 0.72], [0.74, 0.54], [0.8, 0.38], [0.83, 0.16], [0.9, 0]];
  pts.forEach(([x, y], i) => (i ? c.lineTo(x * w, y * h) : c.moveTo(x * w, y * h)));
  c.closePath();
  c.fill();
  c.stroke();
  // An island off the south.
  c.beginPath();
  c.ellipse(0.42 * w, 0.93 * h, 0.05 * w, 0.025 * h, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
}
const pressure = (c: CanvasRenderingContext2D, w: number, h: number, a: number, b: number, n: number, color = '#37474f') => {
  c.strokeStyle = color;
  c.lineWidth = Math.max(1, w / 280);
  for (let i = 0; i < n; i++) {
    const r = (i + 1) * 0.07;
    c.beginPath();
    c.ellipse(a * w, b * h, r * w * 1.1, r * h * 0.95, 0.3, 0, Math.PI * 2);
    c.stroke();
    if (w > 200) text(c, `${1020 - i * 4}`, a * w + r * w * 1.1 - 8, b * h, 9, color, 'center', false);
  }
};
const front = (c: CanvasRenderingContext2D, pts: Array<[number, number]>, cold: boolean, s: number) => {
  const color = cold ? '#1565c0' : '#c62828';
  c.strokeStyle = color;
  c.fillStyle = color;
  c.lineWidth = 3;
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.stroke();
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const L = Math.hypot(bx - ax, by - ay);
    const steps = Math.max(1, Math.floor(L / (s * 2.4)));
    const ux = (bx - ax) / L;
    const uy = (by - ay) / L;
    for (let j = 0; j < steps; j++) {
      const px = ax + ux * (j + 0.5) * (L / steps);
      const py = ay + uy * (j + 0.5) * (L / steps);
      c.beginPath();
      if (cold) {
        c.moveTo(px - ux * s, py - uy * s);
        c.lineTo(px + ux * s, py + uy * s);
        c.lineTo(px + uy * s * 1.3, py - ux * s * 1.3);
      } else c.arc(px, py, s * 0.9, Math.atan2(uy, ux) + Math.PI, Math.atan2(uy, ux));
      c.fill();
    }
  }
};
const chartTex = frames('Chart', 384, 336, (c, i) => {
  coast(c, 384, 336, '#f4f7f2', '#ece9d6');
  c.strokeStyle = '#c9d4c9';
  c.lineWidth = 1;
  for (let x = 32; x < 384; x += 64) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, 336);
    c.stroke();
  }
  for (let y = 28; y < 336; y += 56) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(384, y);
    c.stroke();
  }
  const s = seeded(77);
  for (let k = 0; k < 40; k++) {
    const x = 12 + s() * 360;
    const y = 12 + s() * 312;
    c.fillStyle = '#263238';
    c.beginPath();
    c.arc(x, y, 2.4, 0, Math.PI * 2);
    c.fill();
    c.font = '8px sans-serif';
    c.fillText(String(Math.floor(s() * 40 + 990)), x + 4, y - 4);
  }
  text(c, '지상 일기도  09시', 8, 13, 13, '#12324f');
  if (i >= 1) pressure(c, 384, 336, 0.24, 0.33, 3);
  if (i >= 2) pressure(c, 384, 336, 0.71, 0.64, 4, '#455a64');
  if (i >= 3 && i < 7) {
    hiLo(c, '고', 92, 112, 20, '#1565c0');
    hiLo(c, '저', 272, 215, 20, '#c62828');
  }
  if (i >= 4) front(c, [[272, 215], [220, 255], [165, 285], [120, 322]], true, 7);
  if (i >= 5) front(c, [[272, 215], [320, 240], [370, 262]], false, 7);
  if (i >= 6) {
    c.fillStyle = 'rgba(76,175,80,0.38)';
    c.beginPath();
    c.ellipse(205, 240, 80, 24, -0.6, 0, Math.PI * 2);
    c.fill();
  }
  if (i === 7) {
    hiLo(c, '저', 272, 215, 20, '#c62828');
    c.fillStyle = 'rgba(229,57,53,0.42)';
    c.strokeStyle = '#c62828';
    c.lineWidth = 3;
    c.beginPath();
    c.ellipse(240, 190, 76, 72, 0.2, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = '#c62828';
    c.fillRect(186, 170, 110, 28);
    text(c, '호우경보', 241, 185, 22, '#ffffff', 'center');
  }
});
const radarTex = frames('Radar', 256, 178, (c, i) => {
  // i: 0-5 the loop; 6-11 the same, heavy.
  const heavy = i >= 6;
  const f = i % 6;
  coast(c, 256, 178, '#14222e', '#2b3a3a', '#6d8a78');
  const s = seeded(101);
  const cx = 72 + f * 14;
  const cy = 114 - f * 7;
  for (let k = 0; k < 42; k++) {
    const a = s() * Math.PI * 2;
    const r = Math.pow(s(), 0.6);
    const x = cx + Math.cos(a) * r * 62;
    const y = cy + Math.sin(a) * r * 24 + (x - cx) * -0.28;
    c.fillStyle = r < (heavy ? 0.45 : 0.18) ? '#ef5350' : r < (heavy ? 0.7 : 0.45) ? '#ffee58' : r < 0.75 ? '#66bb6a' : '#42a5f5';
    c.beginPath();
    c.arc(x, y, 6 + s() * 6, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = 'rgba(0,0,0,0.6)';
  c.fillRect(0, 0, 256, 22);
  text(c, `레이더 합성  09:${String(f * 10).padStart(2, '0')}`, 6, 11, 14, '#ffffff');
  for (let k = 0; k < 6; k++) {
    c.fillStyle = k === f ? '#ffffff' : '#607d8b';
    c.fillRect(170 + k * 13, 8, 10, 7);
  }
});
const satTex = frames('Sat', 256, 164, (c, i) => {
  coast(c, 256, 164, '#0c1a26', '#1d2b28', '#3f5650');
  const s = seeded(31);
  for (let k = 0; k < 55; k++) {
    const x = 20 + s() * 216 + i * 9;
    const y = 104 - (x - 40) * 0.28 + (s() - 0.5) * 52;
    c.fillStyle = `rgba(255,255,255,${0.2 + s() * 0.5})`;
    c.beginPath();
    c.arc(x, y, 7 + s() * 12, 0, Math.PI * 2);
    c.fill();
  }
  text(c, `위성 적외 영상 ${i + 1}/3`, 6, 12, 13, '#ffffff');
});
const noticeTex = frames('Notice', 192, 48, (c, i) => {
  c.fillStyle = i ? '#c62828' : '#3a4348';
  c.fillRect(0, 0, 192, 48);
  text(c, i ? '호우경보 발표' : '특보 없음', 96, 25, 28, i ? '#ffffff' : '#8d9aa2', 'center');
});

// =============================================================================================
// The 예보 상황판 (forecastWall). Two of them side by side make the office's wall.

function forecastWall(g: THREE.Group, out: Built) {
  // The frame, the top bar and the ledge.
  part(g, rbox(1.98, 2.0, 0.08, 0.02), PANEL_D, 0, 1.1, -0.42);
  part(g, rbox(1.98, 0.84, 0.36, 0.02), '#cfd8dc', 0, 0.42, -0.3);
  part(g, box(1.99, 0.03, 0.4), PANEL, 0, FW.ledge - 0.01, -0.29);
  for (const x of [-0.99, -0.33, 0.33, 0.99]) part(g, box(0.01, 0.8, 0.01), '#90a4ae', x, 0.42, -0.117, { outline: false });
  label(g, '예보 상황판', 0.5, 0.08, -0.4, 2.03, -0.375, NAVY, '#ffffff');
  // The chart, on a board, with its magnets.
  part(g, box(FW.chart.w + 0.06, FW.chart.h + 0.06, 0.012), '#eceff1', FW.chart.x, FW.chart.y, FW.z - 0.015);
  const chart = swapPic(g, FW.chart.w, FW.chart.h, FW.chart.x, FW.chart.y, FW.z);
  chart.set(chartTex(0));
  for (const [dx, dy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) part(g, cyl(0.016, 0.016, 0.008, 10), '#e53935', FW.chart.x + (dx * FW.chart.w) / 2.05, FW.chart.y + (dy * FW.chart.h) / 2.05, FW.z + 0.006, { rx: Math.PI / 2, outline: false });
  // Radar and satellite screens.
  part(g, rbox(FW.radar.w + 0.04, FW.radar.h + 0.04, 0.03, 0.01), BLACK, FW.radar.x, FW.radar.y, FW.z - 0.01);
  const radar = swapPic(g, FW.radar.w, FW.radar.h, FW.radar.x, FW.radar.y, FW.z + 0.008);
  radar.set(radarTex(0));
  part(g, rbox(FW.sat.w + 0.04, FW.sat.h + 0.04, 0.03, 0.01), BLACK, FW.sat.x, FW.sat.y, FW.z - 0.01);
  const sat = swapPic(g, FW.sat.w, FW.sat.h, FW.sat.x, FW.sat.y, FW.z + 0.008);
  sat.set(satTex(0));
  // The warning sign and its beacon on top.
  part(g, rbox(0.56, 0.16, 0.05, 0.01), BLACK, 0.5, 2.05, -0.39);
  const notice = swapPic(g, 0.52, 0.13, 0.5, 2.05, -0.36);
  notice.set(noticeTex(0));
  part(g, cyl(0.05, 0.06, 0.04, 12), BLACK, 0.88, 2.13, -0.38);
  const beacon = ownLit(g, cyl(0.045, 0.05, 0.1, 12), '#5a2520', 0.88, 2.2, -0.38);
  // On the ledge: pens in a tray, a binder, a mug, the loop's step button, 발표, the red phone.
  const L = FW.ledge;
  part(g, rbox(0.3, 0.025, 0.09, 0.008), PANEL_D, FW.pens[0], L + 0.012, FW.pens[2]);
  const trayPens: THREE.Mesh[] = [];
  ['#263238', '#1565c0', '#c62828', '#2e7d32'].forEach((col, i) => trayPens.push(part(g, cyl(0.009, 0.009, 0.13, 6), col, FW.pens[0] - 0.09 + i * 0.06, L + 0.034, FW.pens[2], { rx: Math.PI / 2, outline: false })));
  part(g, rbox(0.2, 0.05, 0.14, 0.01), '#1565c0', -0.28, L + 0.025, -0.28, { ry: 0.2 });
  label(g, '일기도 철', 0.13, 0.03, -0.28, L + 0.052, -0.28, '#1565c0', '#ffffff').rotation.x = -Math.PI / 2;
  part(g, cyl(0.035, 0.03, 0.08, 10), '#fafafa', -0.03, L + 0.04, -0.3);
  part(g, rbox(0.15, 0.03, 0.07, 0.008), PANEL_D, FW.step[0], L + 0.015, FW.step[2] - 0.01);
  const stepBtn = ownLit(g, box(0.05, 0.016, 0.04), '#37a0d6', FW.step[0], L + 0.035, FW.step[2] - 0.01);
  part(g, rbox(0.14, 0.03, 0.12, 0.01), PANEL_D, FW.btn[0], L + 0.015, FW.btn[2]);
  const issueBtn = ownLit(g, cyl(0.035, 0.035, 0.02, 12), '#8a2b26', FW.btn[0], L + 0.04, FW.btn[2]);
  // The phone's cradle and its handset.
  part(g, rbox(0.2, 0.05, 0.16, 0.015), '#b71c1c', FW.phone[0], L + 0.025, FW.phone[2]);
  const hs = group(g);
  part(hs, rbox(0.17, 0.03, 0.035, 0.012), '#c62828', 0, 0, 0);
  for (const sx of [-1, 1]) part(hs, cyl(0.022, 0.022, 0.02, 10), '#b71c1c', sx * 0.07, -0.015, 0, { outline: false });
  place(hs, FW.phone);
  const ring = ownLit(g, ball(0.012), '#5a2520', FW.phone[0] + 0.085, L + 0.06, FW.phone[2] + 0.07);
  // What travels.
  const pen = group(g);
  const penMat = part(pen, cyl(0.009, 0.009, 0.13, 6), '#263238', 0, 0.06, 0, { outline: false });
  part(pen, cyl(0.009, 0.002, 0.02, 6), '#263238', 0, -0.015, 0, { rx: Math.PI, outline: false });
  pen.rotation.set(1.1, 0, 0.3);
  pen.visible = false;
  const paper = group(g);
  part(paper, box(0.2, 0.28, 0.003), PAPER, 0, 0, 0, { outline: false });
  label(paper, '호우경보 통보문', 0.17, 0.035, 0, 0.1, 0.003, '#c62828', '#ffffff');
  paper.rotation.x = -0.5;
  paper.visible = false;
  const signPen = pencil(g, '#1a237e');
  signPen.visible = false;
  // The senior forecaster, only for a warning.
  const crew = scene(g, out);
  const senior = vroidFigure(person(crew, LOOKS.senior, 1.2, 0.42, -1.2), { gender: 'female' });
  const penMaterials = ['#263238', '#1565c0', '#c62828', '#2e7d32'].map((col) => new THREE.MeshToonMaterial({ color: col }));
  const spots: Record<string, Spot> = { analyzeChart: standAt(g, 'mtChart'), severeWeather: standAt(g, 'mtSevere') };
  spots['*'] = spots.analyzeChart;
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const severe = now === 'severeWeather';
    // Chart.
    if (severe) chart.set(chartTex((n.warn ?? 0) > 0.5 ? 7 : 6));
    else chart.set(chartTex(now ? Math.round(n.chart ?? 0) : 2));
    // The loop: running, or stepped by hand.
    const step = n.step ?? -1;
    const fr = now ? (step >= 0 ? Math.round(step) : Math.floor(t * 1.4) % 6) : Math.floor(t * 0.4) % 6;
    radar.set(radarTex(fr + (severe ? 6 : 0)));
    sat.set(satTex(Math.floor(t * 0.25) % 3));
    radar.mesh.scale.setScalar(1);
    notice.set(noticeTex((n.sign ?? 0) > 0.5 ? 1 : 0));
    setLit(beacon, severe && (n.flash ?? 0) > 0.5 && Math.floor(t * 3) % 2 === 0 ? '#ff3b30' : '#5a2520');
    setLit(ring, (n.ring ?? 0) > 0.5 && Math.floor(t * 5) % 2 === 0 ? '#ff5252' : '#5a2520');
    setLit(issueBtn, (n.sign ?? 0) > 0.5 ? '#ff5252' : severe ? '#c0392b' : '#8a2b26');
    setLit(stepBtn, (n.tick ?? 0) > 0.5 ? '#b3e5fc' : '#37a0d6');
    // The marker off the tray, in its colour.
    const pp = P.pen ?? null;
    const which = Math.round(n.pen ?? 0);
    pen.visible = !!pp;
    if (pp) {
      place(pen, pp);
      penMat.material = penMaterials[which];
    }
    trayPens.forEach((m, i) => (m.visible = !pp || i !== which));
    // The red handset.
    place(hs, P.handset ?? FW.phone);
    hs.rotation.set(0, P.handset ? 1.2 : 0, P.handset ? 1.3 : 0);
    // The bulletin.
    paper.visible = !!P.paper;
    if (P.paper) place(paper, P.paper);
    signPen.visible = !!P.signPen;
    if (P.signPen) place(signPen, P.signPen);
    // The senior: hands it across, then watches.
    if (severe) {
      const s = n.senior ?? 0;
      senior.root.position.set(1.34 - 0.36 * s, 0, 0.42);
      senior.head.rotation.y = -0.3;
      const hand = (n.paper ?? 0) > 0.5 && P.paper ? v3(P.paper[0] - 0.08, P.paper[1], P.paper[2]) : null;
      senior.armR(hand);
      senior.armL(s > 0.5 && !hand ? v3(0.6, 1.25, 0.2) : null);
    }
    senior.root.visible = severe;
  });
  out.work = marker(g, FW.chart.x, 1.1, FW.z + 0.1);
}

// =============================================================================================
// The 수치 예보 단말 (modelTerminal).

const modelLeft = frames('ModelL', 220, 146, (c, i) => {
  c.fillStyle = '#0d1a22';
  c.fillRect(0, 0, 220, 146);
  text(c, i === 3 ? '가람 모델 검증' : '가람 수치모델', 8, 13, 14, '#80deea');
  const lines = [['격자 12km', '초기장 00UTC', '동화 자료 확인', '예보 72시간', '>> 실행?'], ['>> 계산 중', '노드 128 / 128', '...', '+12h 완료', '+24h 진행'], ['>> 완료 72h', '출력 저장', 'RMSE 2.1hPa', '', ''], ['표본 1,240건', '해면기압 편차', '강수 ETS 0.41', '>> 보정 계수', '']][i];
  lines.forEach((s, k) => text(c, s, 8, 36 + k * 20, 13, i === 1 && k === 0 ? '#ffee58' : '#c8e6c9', 'left', false));
});
const modelRight = frames('ModelR', 220, 146, (c, i) => {
  if (i === 0) {
    c.fillStyle = '#10222e';
    c.fillRect(0, 0, 220, 146);
    text(c, '예보 분석 도구', 110, 73, 18, '#4fc3f7', 'center');
    return;
  }
  if (i >= 7) {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 220, 146);
    c.strokeStyle = '#37474f';
    c.strokeRect(24, 22, 186, 110);
    const s = seeded(55);
    if (i === 7) {
      text(c, '예보 - 관측 산포도', 110, 11, 13, '#12324f', 'center');
      c.strokeStyle = '#90a4ae';
      c.beginPath();
      c.moveTo(24, 132);
      c.lineTo(210, 22);
      c.stroke();
      for (let k = 0; k < 60; k++) {
        const u = s();
        c.fillStyle = k < 3 ? '#e53935' : '#1565c0';
        c.beginPath();
        c.arc(24 + u * 186 + (s() - 0.5) * 22, 132 - u * 110 + (s() - 0.5) * (k < 3 ? 80 : 24), k < 3 ? 3.5 : 2, 0, Math.PI * 2);
        c.fill();
      }
    } else {
      text(c, i === 8 ? '기간별 편차: 보정 전' : '기간별 편차: 보정 후', 110, 11, 13, i === 8 ? '#c62828' : '#2e7d32', 'center');
      c.strokeStyle = i === 8 ? '#e53935' : '#43a047';
      c.lineWidth = 2;
      c.beginPath();
      for (let k = 0; k < 18; k++) {
        const y = 77 - (i === 8 ? 34 : 6) * Math.sin(k * 0.8) - (i === 8 ? k * 1.4 : 0);
        k ? c.lineTo(26 + k * 10.6, y) : c.moveTo(26, y);
      }
      c.stroke();
    }
    return;
  }
  coast(c, 220, 146, '#dcebf3', '#f2f0e0');
  const h = i <= 3 ? i : 3;
  const px = i === 5 ? 0.54 : 0.3 + h * 0.13;
  const py = i === 5 ? 0.58 : 0.72 - h * 0.1;
  pressure(c, 220, 146, px, py, 4, '#1565c0');
  c.fillStyle = 'rgba(76,175,80,0.45)';
  c.beginPath();
  c.ellipse(px * 220 + 12, py * 146 + 6, 34, 18, -0.5, 0, Math.PI * 2);
  c.fill();
  hiLo(c, '저', px * 220, py * 146, 12, '#c62828');
  c.fillStyle = 'rgba(0,0,0,0.65)';
  c.fillRect(0, 0, 220, 20);
  text(c, i <= 3 ? `가람 모델 +${[0, 12, 24, 48][i]}h` : i === 4 ? '비교: 가람 모델 +48h' : i === 5 ? '비교: 한내 모델 +48h' : '예보 확정 +48h', 6, 10, 13, '#ffffff');
  if (i === 6) {
    c.strokeStyle = '#c62828';
    c.lineWidth = 3;
    c.strokeRect(142, 104, 70, 34);
    text(c, '확정', 177, 121, 22, '#c62828', 'center');
  }
});
function modelTerminal(g: THREE.Group, out: Built) {
  // The desk, its drawer and the compute node beneath.
  part(g, rbox(0.98, 0.04, 0.6, 0.01), '#cfd8dc', 0, MT.top - 0.02, -0.18);
  part(g, box(0.03, MT.top - 0.04, 0.54), '#90a4ae', -0.46, (MT.top - 0.04) / 2, -0.18);
  part(g, box(0.9, 0.5, 0.02), '#b0bec5', 0, 0.47, -0.46, { outline: false });
  part(g, rbox(0.24, 0.58, 0.46, 0.015), BLACK, 0.34, 0.31, -0.18);
  const leds: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) {
    part(g, box(0.2, 0.05, 0.004), '#3b4248', 0.34, 0.54 - i * 0.065, 0.054, { outline: false });
    leds.push(ownLit(g, box(0.014, 0.014, 0.006), '#2e7d32', 0.26, 0.54 - i * 0.065, 0.056));
  }
  label(g, '계산 노드', 0.16, 0.03, 0.36, 0.56, 0.056, BLACK, '#a5d6a7');
  const left = monitor(g, MT.scrL[0], MT.scrL[1], MT.scrL[2], 0.14);
  const right = monitor(g, MT.scrR[0], MT.scrR[1], MT.scrR[2], -0.14);
  left.set(modelLeft(0));
  right.set(modelRight(0));
  const bar = ownLit(g, box(1, 0.012, 0.002), '#66bb6a', 0, 0, 0);
  const barBack = ownLit(g, box(0.34, 0.016, 0.002), '#263238', MT.scrL[0] + 0.01, MT.scrL[1] - 0.115, MT.scrL[2] + 0.024);
  barBack.rotation.y = 0.14;
  bar.rotation.y = 0.14;
  bar.visible = barBack.visible = false;
  keyboard(g, MT.keys[0], MT.top + 0.01, MT.keys[2]);
  part(g, rbox(0.055, 0.022, 0.09, 0.012), '#3d4850', MT.mouse[0], MT.top + 0.012, MT.mouse[2]);
  // Print tray, pad, mug.
  part(g, rbox(0.2, 0.05, 0.27, 0.008), '#607d8b', MT.printer[0], MT.top + 0.025, MT.printer[2]);
  part(g, box(0.17, 0.004, 0.23), PAPER, MT.printer[0], MT.top + 0.054, MT.printer[2], { outline: false });
  part(g, box(0.13, 0.006, 0.19), '#fff9c4', MT.pad[0], MT.top + 0.003, MT.pad[2], { outline: false });
  const mug = group(g);
  part(mug, cyl(0.035, 0.03, 0.085, 10), '#0277bd', 0, 0, 0);
  part(mug, cyl(0.03, 0.03, 0.003, 10), '#3e2723', 0, 0.04, 0, { outline: false });
  place(mug, MT.mug);
  const pen = pencil(g, '#1a237e');
  pen.visible = false;
  const sheet = group(g);
  flat(sheet, painted('metPrint', 96, 128, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 96, 128);
    text(c, '검증 출력', 6, 10, 10, '#12324f');
    for (let k = 0; k < 11; k++) {
      c.fillStyle = '#90a4ae';
      c.fillRect(6, 22 + k * 9, 84 - (k % 3) * 12, 2);
    }
  }), 0.17, 0.23, 0, 0.004, 0);
  const circles: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const m = part(sheet, cyl(0.016, 0.016, 0.002, 10), '#e53935', -0.03 + i * 0.03, 0.007, -0.05 + i * 0.04, { outline: false });
    circles.push(m);
  }
  const seal = part(sheet, cyl(0.03, 0.03, 0.002, 12), '#c62828', 0.04, 0.008, 0.07, { outline: false });
  sheet.visible = false;
  const stamp = group(g);
  part(stamp, cyl(0.025, 0.03, 0.04, 10), '#212121', 0, 0.02, 0);
  part(stamp, ball(0.022), '#5d4037', 0, 0.06, 0);
  stamp.visible = false;
  swivel(g, 0, MT.seat.z, Math.PI);
  const spots: Record<string, Spot> = { runModel: standAt(g, 'mtRun'), meteorologist_verifyModel: standAt(g, 'mtVerify') };
  spots['*'] = spots.runModel;
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    left.set(modelLeft(now ? Math.round(n.left ?? 0) : 2));
    right.set(modelRight(now ? Math.round(n.right ?? 0) : 3));
    const prog = n.prog ?? 0;
    const showBar = now === 'runModel' && prog > 0 && prog < 1;
    bar.visible = barBack.visible = showBar;
    if (showBar) {
      bar.scale.x = 0.33 * prog;
      bar.position.set(MT.scrL[0] + 0.01 - 0.165 + 0.165 * prog, MT.scrL[1] - 0.115, MT.scrL[2] + 0.026);
    }
    const busy = (n.busy ?? 0) > 0.5;
    leds.forEach((m, i) => setLit(m, busy ? (Math.floor(t * 9 + i * 3.3) % 3 === 0 ? '#b9f6ca' : '#1b5e20') : i % 3 === 0 ? '#66bb6a' : '#1b5e20'));
    place(mug, P.mug ?? MT.mug);
    pen.visible = !!P.pen;
    if (P.pen) place(pen, P.pen);
    sheet.visible = !!P.sheet;
    if (P.sheet) place(sheet, P.sheet);
    const marks = Math.round(n.marks ?? 0);
    circles.forEach((m, i) => (m.visible = i < marks));
    seal.visible = (n.stamped ?? 0) > 0.5;
    stamp.visible = !!P.stamp;
    if (P.stamp) place(stamp, P.stamp);
  });
  out.work = marker(g, MT.keys[0], MT.keys[1], MT.keys[2]);
}

// =============================================================================================
// The 고층 관측 장비 (balloonLauncher), out on the lot.

const profileTex = frames('Skew', 128, 88, (c, i) => {
  c.fillStyle = '#0d1a22';
  c.fillRect(0, 0, 128, 88);
  text(c, i ? `고층 수신 ${['', '850', '700', '500', '300'][i]}hPa` : '수신 대기', 6, 9, 10, i ? '#a5d6a7' : '#90a4ae');
  c.strokeStyle = '#37474f';
  for (let k = 0; k < 5; k++) {
    c.beginPath();
    c.moveTo(6 + k * 28, 84);
    c.lineTo(34 + k * 28, 18);
    c.stroke();
  }
  const T = [[30, 84], [46, 66], [52, 50], [46, 34], [34, 20]];
  c.lineWidth = 2;
  c.strokeStyle = '#ef5350';
  c.beginPath();
  T.slice(0, i + 1).forEach(([x, y], k) => (k ? c.lineTo(x + 20, y) : c.moveTo(x + 20, y)));
  c.stroke();
  c.strokeStyle = '#66bb6a';
  c.beginPath();
  T.slice(0, i + 1).forEach(([x, y], k) => (k ? c.lineTo(x + 4 - k * 2, y) : c.moveTo(x + 4, y)));
  c.stroke();
});
function balloonLauncher(g: THREE.Group, out: Built) {
  // The pad, its concrete and a yellow ring; the name on a plate.
  part(g, rbox(0.98, 0.05, 0.98, 0.02), '#a7adb0', 0, 0.025, 0);
  part(g, cyl(0.34, 0.34, 0.004, 28), '#f9a825', BL.nozzle[0], 0.053, BL.nozzle[2], { outline: false });
  part(g, cyl(0.31, 0.31, 0.005, 28), '#a7adb0', BL.nozzle[0], 0.054, BL.nozzle[2], { outline: false });
  // Helium cylinders in a rack: grey with brown shoulders, chained.
  for (const [x, z] of [[-0.34, -0.33], [-0.1, -0.38]] as const) {
    part(g, cyl(0.1, 0.1, 1.0, 14), '#78848a', x, 0.55, z);
    part(g, cyl(0.1, 0.1, 0.2, 14), '#6d4c41', x, 1.08, z, { outline: false });
    part(g, cyl(0.03, 0.05, 0.1, 10), '#6d4c41', x, 1.22, z);
    part(g, cyl(0.03, 0.03, 0.06, 10), CHROME, x, 1.28, z, { rz: Math.PI / 2 });
  }
  part(g, box(0.5, 0.03, 0.03), '#37474f', -0.22, 0.8, -0.25);
  label(g, '헬륨', 0.11, 0.05, -0.34, 0.65, -0.23, '#ffffff', '#37474f');
  const dial = ownLit(g, cyl(0.03, 0.03, 0.012, 12), '#fafafa', BL.valve[0] + 0.02, 1.34, BL.valve[2] + 0.04);
  dial.rotation.x = Math.PI / 2;
  const needle = part(g, box(0.004, 0.024, 0.002), '#c62828', BL.valve[0] + 0.02, 1.34, BL.valve[2] + 0.05, { outline: false });
  // The filling stand: a tripod and a brass nozzle.
  for (const a of [0.6, 2.7, 4.8]) rod(g, v3(BL.nozzle[0], BL.nozzle[1] - 0.08, BL.nozzle[2]), v3(BL.nozzle[0] + Math.cos(a) * 0.2, 0.06, BL.nozzle[2] + Math.sin(a) * 0.2), 0.012, '#546e7a');
  part(g, cyl(0.02, 0.028, 0.12, 10), '#c9a23f', BL.nozzle[0], BL.nozzle[1] - 0.02, BL.nozzle[2]);
  // The hose, from the cylinder to the nozzle (shown while it's on).
  const hose = group(g);
  const pts = new THREE.CatmullRomCurve3([v3(BL.valve[0], BL.valve[1] - 0.02, BL.valve[2] + 0.06), v3(-0.2, 0.75, 0.06), v3(-0.05, 0.75, 0.05), v3(BL.nozzle[0], BL.nozzle[1] - 0.05, BL.nozzle[2])]);
  const hm = new THREE.Mesh(new THREE.TubeGeometry(pts, 14, 0.012, 6), new THREE.MeshToonMaterial({ color: '#263238' }));
  hm.userData.ownGeometry = hm.userData.ownMaterial = true;
  hose.add(hm);
  // Sonde cradle, and the receiver on its table.
  part(g, cyl(0.016, 0.02, 0.68, 8), '#546e7a', BL.cradle[0], 0.37, BL.cradle[2]);
  part(g, box(0.15, 0.015, 0.12), '#546e7a', BL.cradle[0], 0.71, BL.cradle[2]);
  const T = BL.laptop;
  part(g, box(0.32, 0.02, 0.28), '#eceff1', T[0] - 0.02, 0.72, T[2]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) rod(g, v3(T[0] - 0.02 + sx * 0.14, 0.72, T[2] + sz * 0.12), v3(T[0] - 0.02 + sx * 0.14, 0.04, T[2] + sz * 0.12), 0.01, '#607d8b');
  part(g, rbox(0.26, 0.012, 0.18, 0.006), BLACK, T[0], 0.736, T[2] + 0.03);
  part(g, rbox(0.26, 0.17, 0.012, 0.006), BLACK, T[0], 0.82, T[2] - 0.06);
  const screen = swapPic(g, 0.24, 0.15, T[0], 0.82, T[2] - 0.053);
  screen.set(profileTex(0));
  // The mast and its Yagi.
  part(g, cyl(0.016, 0.022, 2.5, 8), '#90a4ae', -0.42, 1.3, 0.3);
  part(g, cyl(0.1, 0.12, 0.05, 10), '#546e7a', -0.42, 0.075, 0.3);
  part(g, box(0.5, 0.012, 0.012), CHROME, -0.42, 2.45, 0.3, { outline: false });
  for (let i = 0; i < 5; i++) part(g, box(0.008, 0.008, 0.2 - i * 0.02), CHROME, -0.62 + i * 0.1, 2.45, 0.3, { outline: false });
  const rx = ownLit(g, ball(0.018), '#37474f', -0.42, 2.56, 0.3);
  label(g, '고층 기상 관측', 0.42, 0.08, 0.2, 0.04, 0.495, '#37474f', '#ffffff');
  // The balloon and its sonde, one line tying them.
  const bal = group(g);
  const skin = new THREE.Mesh(ball(1), RUBBER);
  bal.add(skin);
  const neck = part(bal, cyl(0.018, 0.03, 0.08, 8), '#f5f5ef', 0, -1, 0, { outline: false });
  const sonde = group(g);
  part(sonde, rbox(0.1, 0.12, 0.08, 0.012), '#fafafa', 0, 0, 0);
  part(sonde, cyl(0.002, 0.002, 0.14, 4), '#90a4ae', 0.03, -0.12, 0, { outline: false });
  label(sonde, '라디오존데', 0.09, 0.022, 0, 0.02, 0.041, '#ffffff', '#c62828');
  const sled = ownLit(sonde, ball(0.008), '#555555', -0.03, -0.035, 0.041);
  const line = limb(g, 0.003, '#607d8b');
  const lineMesh = g.children[g.children.length - 1];
  const hissT = part(g, cyl(0.002, 0.002, 0.01, 4), '#fff', 0, 0, 0, { outline: false });
  hissT.visible = false;
  const spots: Record<string, Spot> = { launchBalloon: standAt(g, 'mtBalloon') };
  spots['*'] = spots.launchBalloon;
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    hose.visible = !!now ? (n.hose ?? 0) > 0.5 : false;
    needle.rotation.z = (n.valve ?? 0) * (-1.4 + 0.1 * Math.sin(t * 8));
    const r = now ? n.r ?? 0.07 : 0.07;
    const bp = P.bal ?? null;
    bal.visible = !!now && !!bp;
    if (now && bp) {
      place(bal, bp);
      // Pear-shaped on the way up.
      skin.scale.set(r, r * 1.1, r);
      neck.position.y = -r * 1.1;
      neck.scale.setScalar(Math.max(0.5, r / 0.3));
    }
    const sp = P.sonde ?? (now ? null : BL.cradle);
    sonde.visible = !!sp;
    if (sp) {
      place(sonde, sp === BL.cradle ? [BL.cradle[0], BL.cradle[1] + 0.05, BL.cradle[2]] : sp);
      sonde.rotation.z = now ? 0.04 * Math.sin(t * 2) : 0;
    }
    setLit(sled, (n.led ?? 0) > 0.5 && Math.floor(t * 3) % 2 === 0 ? '#76ff03' : '#555555');
    const tie = (n.string ?? 0) > 0.05 && bp && sp;
    lineMesh.visible = !!tie;
    if (tie) line(v3(bp[0], bp[1] - r * 1.15, bp[2]), v3(sp[0], sp[1] + 0.06, sp[2]));
    screen.set(profileTex(Math.round(n.profile ?? 0)));
    setLit(rx, (n.laptop ?? 0) > 0.5 && Math.floor(t * 2) % 2 === 0 ? '#ff5252' : '#37474f');
  });
  out.work = marker(g, BL.nozzle[0], BL.nozzle[1], BL.nozzle[2]);
}

// =============================================================================================
// The 기상 레이더 (weatherStation): generic enough for the 항공사 운항 센터 too.

const scopeTex = frames('Scope', 192, 192, (c, i) => {
  // i: 0-2 radar at three ranges, 3 satellite, 4 the observation table start… 4+k: k rows filled.
  c.fillStyle = '#071218';
  c.fillRect(0, 0, 192, 192);
  if (i <= 2) {
    const scale = [1, 1.5, 2.2][i];
    c.save();
    c.beginPath();
    c.arc(96, 96, 94, 0, Math.PI * 2);
    c.clip();
    c.translate(96, 96);
    c.scale(scale, scale);
    c.translate(-96, -96);
    const s = seeded(14);
    for (let k = 0; k < 32; k++) {
      const a = s() * Math.PI * 2;
      const r = Math.sqrt(s());
      const x = 120 + Math.cos(a) * r * 42;
      const y = 72 + Math.sin(a) * r * 22;
      c.fillStyle = r < 0.3 ? '#ef5350' : r < 0.6 ? '#ffee58' : '#66bb6a';
      c.beginPath();
      c.arc(x, y, 5 + s() * 4, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
    c.strokeStyle = '#2e7d6a';
    c.lineWidth = 1;
    for (const rr of [30, 60, 90]) {
      c.beginPath();
      c.arc(96, 96, rr, 0, Math.PI * 2);
      c.stroke();
    }
    c.beginPath();
    c.moveTo(96, 2);
    c.lineTo(96, 190);
    c.moveTo(2, 96);
    c.lineTo(190, 96);
    c.stroke();
    text(c, `${[240, 120, 60][i]}km`, 6, 180, 14, '#a7ffeb');
  } else if (i === 3) {
    coast(c, 192, 192, '#0c1a26', '#1d2b28', '#3f5650');
    const s = seeded(41);
    for (let k = 0; k < 40; k++) {
      c.fillStyle = `rgba(255,255,255,${0.2 + s() * 0.6})`;
      c.beginPath();
      c.arc(30 + s() * 140, 60 + s() * 80, 6 + s() * 10, 0, Math.PI * 2);
      c.fill();
    }
    text(c, '위성', 6, 12, 15, '#ffffff');
  } else {
    const rows = i - 4;
    text(c, '정시 관측표', 8, 14, 16, '#a7ffeb');
    const lab = ['기온 18.4', '이슬점 15.1', '기압 1008.2', '풍향 남서', '풍속 3.2'];
    lab.forEach((s, k) => {
      c.strokeStyle = '#2e4b4b';
      c.strokeRect(8, 30 + k * 30, 176, 26);
      text(c, s.split(' ')[0], 14, 43 + k * 30, 14, '#90a4ae');
      if (k < rows) text(c, s.split(' ')[1], 178, 43 + k * 30, 15, '#c8e6c9', 'right');
    });
  }
});
const logTex = frames('Log', 72, 96, (c, i) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 72, 96);
  text(c, '관측 야장', 5, 7, 8, '#12324f');
  c.strokeStyle = '#b0bec5';
  for (let k = 0; k < 6; k++) {
    c.beginPath();
    c.moveTo(4, 18 + k * 13);
    c.lineTo(68, 18 + k * 13);
    c.stroke();
  }
  for (let k = 0; k < i; k++) {
    c.fillStyle = '#1a237e';
    c.fillRect(6, 13 + k * 13, 30 + (k * 17) % 28, 2.5);
  }
});
function weatherStation(g: THREE.Group, out: Built) {
  // A desk-high console, slanted on top, in government grey-blue.
  part(g, rbox(0.82, 0.92, 0.44, 0.03), '#546e7a', 0, 0.46, -0.2);
  part(g, rbox(0.82, 0.04, 0.16, 0.01), '#607d8b', 0, 0.95, 0.03);
  part(g, rbox(0.7, 0.42, 0.26, 0.02), PANEL, 0, 1.2, -0.24, { rx: -0.25 });
  // The scope: a square tube with a round picture.
  part(g, rbox(0.34, 0.34, 0.02, 0.01), BLACK, WS.scope[0], WS.scope[1], WS.scope[2] - 0.02, { rx: -0.25 });
  const scopeG = group(g, WS.scope[0], WS.scope[1], WS.scope[2]);
  scopeG.rotation.x = -0.25;
  const scope = swapPic(scopeG, 0.3, 0.3, 0, 0, 0);
  scope.set(scopeTex(0));
  // The sweep arm: a thin fan turned over the scope.
  const sweep = group(scopeG, 0, 0, 0.003);
  ownLit(sweep, box(0.006, 0.145, 0.001), '#a7ffeb', 0, 0.0725, 0);
  // Knobs: range (right) and mode (left), small keys between.
  part(g, cyl(0.035, 0.04, 0.03, 12), BLACK, WS.dial[0], 0.99, WS.dial[2]);
  part(g, box(0.004, 0.02, 0.05), '#fff', WS.dial[0], 1.0, WS.dial[2], { outline: false });
  part(g, cyl(0.03, 0.035, 0.02, 12), BLACK, WS.mode[0], 0.985, WS.mode[2]);
  keyboard(g, WS.keys[0], 0.98, WS.keys[2], 0.26);
  label(g, '거리', 0.08, 0.024, WS.dial[0], 0.965, 0.111, '#607d8b', '#ffffff');
  label(g, '표출', 0.08, 0.024, WS.mode[0], 0.965, 0.111, '#607d8b', '#ffffff');
  label(g, '기상 레이더 · 위성', 0.42, 0.06, 0, 0.82, 0.024, '#0277bd', '#ffffff');
  // Vents, and a door handle.
  for (let i = 0; i < 5; i++) part(g, box(0.5, 0.012, 0.004), '#455a64', 0, 0.2 + i * 0.035, 0.024, { outline: false });
  // The strip printer at the side.
  part(g, rbox(0.14, 0.14, 0.1, 0.01), '#cfd8dc', WS.strip[0], 1.13, -0.08);
  const strip = part(g, box(0.09, 1, 0.003), PAPER, WS.strip[0], 1.13, WS.strip[2], { outline: false });
  strip.visible = false;
  // The hook and the log.
  part(g, box(0.05, 0.02, 0.03), CHROME, WS.clip[0], 0.86, 0.04, { outline: false });
  const { t: board, page } = clipboard(g, () => logTex(0));
  const pen = pencil(g, '#1a237e');
  pen.visible = false;
  const paper = group(g);
  part(paper, box(0.09, 0.22, 0.003), PAPER, 0, 0, 0, { outline: false });
  label(paper, '09시', 0.07, 0.024, 0, 0.08, 0.003, PAPER, '#12324f');
  paper.rotation.x = -0.3;
  paper.visible = false;
  // On top, the radome as a model: a white ball, cut open to show the dish turn.
  part(g, cyl(0.1, 0.12, 0.06, 12), '#90a4ae', 0.22, 1.47, -0.26);
  const dish = group(g, 0.22, 1.62, -0.26);
  part(dish, cyl(0.06, 0.018, 0.03, 16), STEEL, 0, 0, 0.02, { rx: Math.PI / 2 });
  part(dish, cyl(0.006, 0.006, 0.06, 6), STEEL, 0, 0, -0.01, { rx: Math.PI / 2, outline: false });
  const dome = new THREE.Mesh(ball(0.12), PANE);
  dome.position.set(0.22, 1.62, -0.26);
  g.add(dome);
  // A small anemometer on the other side: three cups.
  part(g, cyl(0.006, 0.006, 0.26, 6), '#90a4ae', -0.26, 1.54, -0.26, { outline: false });
  const cups = group(g, -0.26, 1.67, -0.26);
  for (const a of [0, 2.09, 4.19]) {
    part(cups, cyl(0.003, 0.003, 0.06, 4), '#90a4ae', Math.cos(a) * 0.03, 0, Math.sin(a) * 0.03, { rz: Math.PI / 2, ry: -a, outline: false });
    part(cups, ball(0.016), '#fafafa', Math.cos(a) * 0.06, 0, Math.sin(a) * 0.06, { outline: false });
  }
  const spots: Record<string, Spot> = { checkWeather: standAt(g, 'mtRadar'), meteorologist_recordObs: standAt(g, 'mtLog') };
  spots['*'] = spots.checkWeather;
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    dish.rotation.y = t * 0.9;
    cups.rotation.y = t * 3.2;
    const mode = Math.round(n.mode ?? 0);
    const tex = !now ? 0 : mode === 2 ? 4 + Math.round(n.table ?? 0) : mode === 1 ? 3 : Math.round(n.range ?? 0);
    scope.set(scopeTex(tex));
    scope.mesh.scale.setScalar(!now || (n.on ?? 1) > 0.3 ? 1 : 0.02);
    sweep.visible = mode === 0;
    sweep.rotation.z = -t * 2.2;
    const s = n.strip ?? 0;
    strip.visible = s > 0.02;
    if (s > 0.02) {
      strip.scale.y = 0.2 * s;
      strip.position.y = 1.06 - 0.1 * s;
    }
    const b = P.board ?? null;
    place(board, b ?? WS.clip);
    board.rotation.x = b && now ? -0.6 : 0.15;
    page.set(logTex(Math.round(n.lines ?? 0)));
    pen.visible = !!P.pen;
    if (P.pen) place(pen, P.pen);
    paper.visible = !!P.paper;
    if (P.paper) place(paper, P.paper);
  });
  out.work = marker(g, WS.keys[0], WS.keys[1], WS.keys[2]);
}

// =============================================================================================
// The 날씨 방송 세트 (weatherSet).

const castTex = frames('Cast', 256, 170, (c, i) => {
  coast(c, 256, 170, '#3b8fd6', '#9ccc65', '#ffffff');
  const towns: Array<[string, number, number]> = [['솔내', 0.56, 0.2], ['가람', 0.62, 0.5], ['은빛만', 0.56, 0.76]];
  if (i === 1) {
    c.fillStyle = 'rgba(25,60,160,0.5)';
    c.beginPath();
    c.ellipse(120, 95, 75, 26, -0.5, 0, Math.PI * 2);
    c.fill();
    text(c, '비', 120, 95, 28, '#ffffff', 'center');
  }
  if (i === 2)
    towns.forEach(([s, x, y], k) => {
      c.fillStyle = '#ffffff';
      c.fillRect(x * 256 - 34, y * 170 - 12, 68, 24);
      text(c, `${s} ${[22, 24, 27][k]}°`, x * 256, y * 170, 13, '#c62828', 'center');
    });
  if (i === 0 || i === 1)
    towns.forEach(([s, x, y]) => {
      c.fillStyle = '#12324f';
      c.beginPath();
      c.arc(x * 256, y * 170, 3, 0, Math.PI * 2);
      c.fill();
      text(c, s, x * 256 + 6, y * 170, 12, '#12324f');
    });
  if (i === 3) {
    c.fillStyle = 'rgba(255,255,255,0.92)';
    c.fillRect(8, 40, 240, 100);
    ['월', '화', '수', '목', '금'].forEach((d, k) => {
      text(c, d, 30 + k * 48, 60, 15, '#12324f', 'center');
      c.fillStyle = k === 1 || k === 2 ? '#1e88e5' : '#ffb300';
      c.beginPath();
      c.arc(30 + k * 48, 88, 12, 0, Math.PI * 2);
      c.fill();
      text(c, `${[24, 19, 18, 23, 26][k]}°`, 30 + k * 48, 122, 14, '#263238', 'center');
    });
  }
  c.fillStyle = '#c62828';
  c.fillRect(0, 148, 256, 22);
  text(c, '오늘의 날씨', 8, 159, 14, '#ffffff');
});
const standbyTex = painted('metStandby', 256, 170, (c) => {
  c.fillStyle = '#10222e';
  c.fillRect(0, 0, 256, 170);
  text(c, '방송 대기', 128, 85, 28, '#4fc3f7', 'center');
});
const scriptScreen = frames('Scr', 128, 84, (c, i) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 128, 84);
  text(c, '날씨 원고', 6, 9, 10, '#12324f');
  const L = ['오늘 낮부터 비가', '서쪽부터 차차 내려', '퇴근길 우산 챙기세요'];
  L.slice(0, i).forEach((s, k) => text(c, s, 6, 26 + k * 18, 11, '#263238', 'left', false));
  if (i === 4) {
    L.forEach((s, k) => text(c, s, 6, 26 + k * 18, 11, '#263238', 'left', false));
    c.strokeStyle = '#c62828';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(6, 44);
    c.lineTo(110, 44);
    c.stroke();
  }
});
const pageTex = frames('Page', 96, 128, (c, i) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 96, 128);
  text(c, '09시 날씨', 6, 10, 10, '#12324f');
  for (let k = 0; k < 7; k++) {
    c.fillStyle = '#607d8b';
    c.fillRect(6, 24 + k * 13, 80 - (k % 2) * 14, 2.5);
  }
  c.strokeStyle = '#c62828';
  c.lineWidth = 2;
  for (let k = 0; k < i; k++) {
    c.beginPath();
    c.moveTo(4, 25 + k * 26);
    c.lineTo(90, 25 + k * 26);
    c.stroke();
  }
});
function weatherSet(g: THREE.Group, out: Built) {
  const GREEN = '#22b14c';
  // The green wall, curving into the floor.
  part(g, rbox(1.98, 2.26, 0.06, 0.02), GREEN, 0, 1.15, -0.46);
  part(g, box(1.98, 0.02, 0.98), GREEN, 0, 0.012, 0.02);
  part(g, cyl(0.1, 0.1, 1.98, 12), GREEN, 0, 0.09, -0.4, { rz: Math.PI / 2, outline: false });
  // The mark on the floor.
  for (const a of [0.8, -0.8]) part(g, box(0.2, 0.002, 0.03), '#fff176', WV.mark.x, 0.024, WV.mark.z + 0.02, { ry: a, outline: false });
  // The truss with its lights.
  for (const x of [-0.97, 0.97]) part(g, cyl(0.022, 0.022, 2.4, 8), '#546e7a', x, 1.2, -0.38);
  part(g, box(2.0, 0.05, 0.05), '#546e7a', 0, 2.38, -0.38);
  part(g, box(2.0, 0.05, 0.05), '#546e7a', 0, 2.38, 0.42);
  for (const x of [-0.97, 0.97]) part(g, box(0.05, 0.05, 0.8), '#546e7a', x, 2.38, 0.02);
  const lamps: THREE.Mesh[] = [];
  for (const x of [-0.6, 0.0, 0.6]) {
    part(g, rbox(0.3, 0.2, 0.14, 0.01), BLACK, x, 2.24, 0.34, { rx: 0.7 });
    const l = ownLit(g, box(0.25, 0.15, 0.005), '#606060', x, 2.2, 0.4);
    l.rotation.x = 0.7;
    lamps.push(l);
  }
  // On air light at the top.
  part(g, rbox(0.34, 0.1, 0.04, 0.01), BLACK, 0, 2.2, -0.42);
  const onair = swapPic(g, 0.3, 0.075, 0, 2.2, -0.397);
  const onTex = frames('OnAir', 128, 32, (c, i) => {
    c.fillStyle = i ? '#d32f2f' : '#3a3a40';
    c.fillRect(0, 0, 128, 32);
    text(c, 'ON AIR', 64, 17, 22, i ? '#ffffff' : '#777', 'center');
  });
  onair.set(onTex(0));
  // The return monitor, on a roller stand at the right.
  const M = WV.mon;
  part(g, cyl(0.02, 0.025, M[1] - 0.2, 8), '#37474f', M[0], (M[1] - 0.2) / 2, M[2] - 0.06);
  part(g, cyl(0.2, 0.2, 0.025, 10), '#37474f', M[0], 0.03, M[2] - 0.06);
  part(g, rbox(0.56, 0.38, 0.05, 0.01), BLACK, M[0], M[1], M[2]);
  const mon = swapPic(g, 0.52, 0.34, M[0], M[1], M[2] + 0.027, -0.2);
  mon.mesh.position.x = M[0] - 0.003;
  mon.set(standbyTex);
  // The writer's small desk at the left.
  const D = WV.desk;
  part(g, rbox(0.56, 0.03, 0.44, 0.01), '#eceff1', D.x, D.top - 0.015, D.z);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) rod(g, v3(D.x + sx * 0.25, D.top - 0.03, D.z + sz * 0.19), v3(D.x + sx * 0.25, 0.02, D.z + sz * 0.19), 0.012, '#546e7a');
  part(g, rbox(0.3, 0.012, 0.2, 0.005), BLACK, D.x, D.top + 0.008, D.z + 0.02);
  const lidG = group(g, D.x, D.top + 0.014, D.z - 0.08);
  part(lidG, rbox(0.3, 0.2, 0.012, 0.005), BLACK, 0, 0.1, 0);
  const lidScr = swapPic(lidG, 0.28, 0.18, 0, 0.1, 0.007);
  lidScr.set(scriptScreen(0));
  part(g, cyl(0.18, 0.2, 0.04, 14), '#37474f', WV.stool.x, 0.02, WV.stool.z);
  part(g, cyl(0.025, 0.03, 0.44, 8), '#37474f', WV.stool.x, 0.24, WV.stool.z);
  part(g, cyl(0.17, 0.17, 0.05, 14), '#0277bd', WV.stool.x, 0.47, WV.stool.z);
  // A page, the stopwatch, the pen.
  const page = group(g);
  const pageM = flat(page, pageTex(0), 0.16, 0.22, 0, 0.004, 0);
  page.visible = false;
  const pen = pencil(g, '#c62828');
  pen.visible = false;
  const watch = group(g);
  part(watch, cyl(0.035, 0.035, 0.014, 14), CHROME, 0, 0, 0, { rx: Math.PI / 2 });
  ownLit(watch, cyl(0.03, 0.03, 0.002, 14), '#fafafa', 0, 0, 0.008).rotation.x = Math.PI / 2;
  const hand = part(watch, box(0.003, 0.028, 0.002), '#c62828', 0, 0.01, 0.01, { outline: false });
  watch.rotation.x = -0.5;
  watch.visible = false;
  // The clicker.
  const clicker = part(g, rbox(0.03, 0.02, 0.1, 0.008), BLACK, 0, 0, 0);
  clicker.visible = false;
  // Out front: the camera with its prompter on a pedestal, and the operator.
  const front = scene(g, out);
  const cam = group(front, 0.05, 0, WV.camZ, Math.PI);
  part(cam, cyl(0.03, 0.035, 1.2, 8), '#37474f', 0, 0.6, 0);
  for (const a of [0.5, 2.6, 4.7]) rod(cam, v3(0, 0.1, 0), v3(Math.cos(a) * 0.3, 0.03, Math.sin(a) * 0.3), 0.016, '#37474f');
  const head = group(cam, 0, 1.28, 0);
  part(head, rbox(0.16, 0.2, 0.42, 0.02), '#263238', 0, 0, -0.04);
  part(head, cyl(0.07, 0.08, 0.14, 14), BLACK, 0, 0, 0.22, { rx: Math.PI / 2 });
  part(head, rbox(0.26, 0.2, 0.02, 0.008), BLACK, 0, 0.0, 0.33);
  // Prompter's glass: words in the mirror seen from the front.
  const prompt = swapPic(head, 0.24, 0.17, 0, 0.0, 0.342);
  prompt.set(frames('Prompt', 96, 64, (c) => {
    c.fillStyle = '#06080a';
    c.fillRect(0, 0, 96, 64);
    ['오늘 낮부터', '서쪽부터 비', '우산 챙기세요'].forEach((s, k) => text(c, s, 48, 14 + k * 20, 11, '#ffffff', 'center'));
  })(0));
  const camTally = ownLit(head, ball(0.015), '#3a1a1a', 0, 0.12, 0.28);
  part(head, box(0.012, 0.012, 0.3), '#263238', 0.12, -0.08, -0.24, { outline: false, ry: 0.3 });
  const op = person(front, LOOKS.cam, 0.05, WV.camZ + 0.46, Math.PI);
  part(op.head, rbox(0.25, 0.03, 0.12, 0.012), BLACK, 0, 0.1, -0.02);
  const spots: Record<string, Spot> = { presentWeather: standAt(g, 'mtPresent'), meteorologist_writeScript: standAt(g, 'mtScript') };
  spots['*'] = spots.presentWeather;
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const on = (n.onair ?? 0) > 0.5;
    const live = now === 'presentWeather';
    onair.set(onTex(on ? 1 : 0));
    setLit(camTally, on ? '#ff3b30' : '#3a1a1a');
    lamps.forEach((l) => setLit(l, live ? '#fff7d8' : '#606060'));
    mon.set(live && (n.live ?? 0) > 0.5 ? castTex(Math.round(n.map ?? 0)) : standbyTex);
    // The writer's desk.
    const scr = Math.round(n.script ?? 0);
    lidScr.set(scriptScreen(Math.min(4, scr)));
    lidG.rotation.x = now === 'meteorologist_writeScript' ? -0.12 + (1 - (n.lid ?? 1)) * 1.3 : 1.42;
    page.visible = !!P.paper;
    if (P.paper) {
      place(page, P.paper);
      page.rotation.x = now === 'meteorologist_writeScript' && P.paper[1] > 0.85 ? 1.0 : 0;
      const mat = pageM.material as THREE.MeshBasicMaterial;
      const want = pageTex(Math.round(n.cuts ?? 0));
      if (mat.map !== want) {
        mat.map = want;
        mat.needsUpdate = true;
      }
    }
    pen.visible = !!P.pen;
    if (P.pen) place(pen, P.pen);
    watch.visible = !!P.watch;
    if (P.watch) {
      place(watch, P.watch);
      hand.rotation.z = -t * 3;
    }
    clicker.visible = !!P.clicker;
    if (P.clicker) place(clicker, P.clicker);
    // Camera: follows a little; the operator's fingers count down, then a thumb.
    head.rotation.y = n.pan ?? 0;
    if (live) {
      const cnt = n.count ?? -1;
      const px = 0.34;
      op.armL(cnt >= 0 ? v3(px, 1.3 + 0.02 * cnt, WV.camZ + 0.28) : null);
      op.armR((n.thumb ?? 0) > 0.5 ? v3(-0.3, 1.34, WV.camZ + 0.24) : v3(-0.08, 1.2, WV.camZ + 0.2));
      op.head.rotation.y = 0;
    }
  });
  out.work = marker(g, 0.05, 1.1, 0);
}

// =============================================================================================
// The 예보 토의 테이블 (metBriefTable).

const slideTex = frames('Slide', 256, 170, (c, i) => {
  if (i === 0) {
    c.fillStyle = '#12324f';
    c.fillRect(0, 0, 256, 170);
    text(c, '09시 예보 토의', 128, 62, 26, '#ffffff', 'center');
    text(c, '전국 날씨 · 특보 가능성', 128, 100, 15, '#b3e5fc', 'center');
    return;
  }
  if (i === 1) {
    c.drawImage((radarTex(4).image as HTMLCanvasElement) ?? c.canvas, 0, 0, 256, 170);
    return;
  }
  if (i === 2) {
    coast(c, 256, 170, '#dcebf3', '#f2f0e0');
    c.strokeStyle = '#1565c0';
    c.lineWidth = 2;
    c.strokeRect(10, 10, 110, 150);
    c.strokeStyle = '#c62828';
    c.strokeRect(134, 10, 110, 150);
    text(c, '가람', 65, 24, 16, '#1565c0', 'center');
    text(c, '한내', 189, 24, 16, '#c62828', 'center');
    pressure(c, 256, 170, 0.22, 0.6, 2, '#1565c0');
    pressure(c, 256, 170, 0.74, 0.6, 2, '#c62828');
    return;
  }
  if (i === 3) {
    coast(c, 256, 170, '#dcebf3', '#f2f0e0');
    c.fillStyle = 'rgba(21,101,192,0.3)';
    c.fillRect(0, 60, 256, 70);
    text(c, '강수 구역 겹쳐 보기', 128, 16, 16, '#12324f', 'center');
    return;
  }
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 256, 170);
  text(c, '오늘의 예보', 128, 22, 20, '#12324f', 'center');
  ['오전 흐림', '오후 비 (서쪽부터)', '밤 호우 가능성'].forEach((s, k) => text(c, s, 22, 56 + k * 30, 18, '#263238'));
});
const notesTex = frames('Notes', 128, 96, (c, i) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 128, 96);
  ['강수 시작 14시', '모델 차이 큼', '호우 대비'].slice(0, i).forEach((s, k) => text(c, s, 8, 16 + k * 26, 13, '#1a237e'));
});
function briefTable(g: THREE.Group, out: Built) {
  const T = BR.top;
  const X = BR.tx;
  // The table, lighter top on grey-blue legs, a cable tray, a phone in the middle.
  part(g, rbox(2.3, 0.05, 1.05, 0.03), '#dde3e7', X, T - 0.025, 0);
  for (const sx of [-1, 1]) {
    part(g, rbox(0.1, T - 0.05, 0.7, 0.02), '#546e7a', X + sx * 0.92, (T - 0.05) / 2, 0);
    part(g, rbox(0.18, 0.03, 0.86, 0.01), '#455a64', X + sx * 0.92, 0.02, 0);
  }
  part(g, rbox(0.2, 0.04, 0.2, 0.05), BLACK, X + 0.1, T + 0.02, 0.02);
  // The chart roll, water and printouts.
  part(g, cyl(0.03, 0.03, 0.62, 10), '#fbfaf4', X + 0.72, T + 0.03, 0.02, { rz: Math.PI / 2 });
  part(g, cyl(0.04, 0.05, 0.18, 10), '#e3f2fd', X + 0.38, T + 0.09, 0, { material: PANE });
  // Places.
  const chairs: Array<[number, number, number]> = [[BR.seat.x, BR.seat.z, 0], [X + 0.72, -0.76, 0], [X - 0.28, 0.76, Math.PI], [X + 0.5, 0.76, Math.PI]];
  chairs.forEach(([x, z, r]) => swivel(g, x, z, r, '#0277bd'));
  for (const [x, z] of [[X + 0.72, -0.3], [X - 0.28, 0.3], [X + 0.5, 0.3]]) {
    part(g, box(0.2, 0.003, 0.28), PAPER, x, T + 0.003, z, { outline: false });
    part(g, cyl(0.03, 0.03, 0.08, 10), '#fafafa', x + 0.18, T + 0.04, z);
  }
  // The wall screen at the left end, facing +x, and the small board beside it.
  const S = BR.screen;
  part(g, rbox(0.05, 1.14, 1.56, 0.02), BLACK, S[0] - 0.03, S[1], 0);
  part(g, box(0.06, S[1] - 0.57, 0.12), '#546e7a', S[0] - 0.05, (S[1] - 0.57) / 2, 0);
  part(g, box(0.5, 0.03, 0.5), '#546e7a', S[0], 0.015, 0);
  const screen = swapPic(g, 1.44, 1.04, S[0] + 0.0, S[1], 0, Math.PI / 2);
  screen.set(slideTex(0));
  // A clock above it.
  const clock = group(g, S[0] + 0.01, S[1] + 0.68, 0, Math.PI / 2);
  part(clock, cyl(0.1, 0.1, 0.02, 20), '#fafafa', 0, 0, 0, { rx: Math.PI / 2 });
  const hHour = part(clock, box(0.012, 0.05, 0.002), BLACK, 0, 0.025, 0.012, { outline: false });
  const hMin = part(clock, box(0.008, 0.08, 0.002), BLACK, 0, 0.04, 0.012, { outline: false });
  // The rain-chance board.
  const pctTex = frames('Pct', 96, 64, (c, i) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 96, 64);
    text(c, '강수확률', 48, 14, 12, '#37474f', 'center');
    if (i) text(c, '60%', 48, 42, 28, '#1565c0', 'center');
  });
  part(g, box(0.02, 0.26, 0.38), '#90a4ae', BR.side[0] - 0.03, BR.side[1], BR.side[2] - 0.02);
  part(g, box(0.03, BR.side[1] - 0.12, 0.03), '#546e7a', BR.side[0] - 0.05, (BR.side[1] - 0.12) / 2, BR.side[2] - 0.02);
  // The folder.
  const fold = group(g);
  place(fold, BR.folder);
  part(fold, rbox(0.2, 0.014, 0.28, 0.005), '#0277bd', 0.1, 0, 0);
  const cover = group(fold);
  part(cover, rbox(0.2, 0.014, 0.28, 0.005), '#0277bd', -0.1, 0, 0);
  const inside = flat(fold, notesTex(0), 0.18, 0.25, 0.1, 0.009, 0);
  const pct = swapPic(g, 0.36, 0.24, BR.side[0] - 0.015, BR.side[1], BR.side[2] - 0.02, Math.PI / 2);
  pct.set(pctTex(0));
  const pen = pencil(g, '#1a237e');
  pen.visible = false;
  const card = group(g);
  part(card, box(0.14, 0.09, 0.003), '#fff59d', 0, 0, 0, { outline: false });
  label(card, '60%', 0.1, 0.06, 0, 0, 0.003, '#fff59d', '#1565c0');
  card.visible = false;
  const remote = part(g, rbox(0.03, 0.02, 0.1, 0.008), BLACK, 0, 0, 0);
  remote.visible = false;
  const mk = pencil(g, '#1565c0');
  mk.visible = false;
  // People: the director, the senior, the caster and a junior.
  const crew = scene(g, out);
  const director = person(crew, LOOKS.director, -0.95, -0.72, 0.5);
  const senior = person(crew, LOOKS.senior, X + 0.72, -0.76, 0, 0.47);
  const caster = person(crew, LOOKS.caster, X - 0.28, 0.76, Math.PI, 0.47);
  const junior = person(crew, LOOKS.junior, X + 0.5, 0.76, Math.PI, 0.47);
  const chairDir = person(crew, LOOKS.director, BR.seat.x, BR.seat.z, 0, 0.47);
  const cards = [senior, caster, junior].map((f, i) => {
    const m = part(f.root, box(0.14, 0.09, 0.004), '#fff59d', 0, 1.2, 0.26, { outline: false });
    label(m, ['60%', '50%', '70%'][i], 0.1, 0.06, 0, 0, 0.004, '#fff59d', '#1565c0');
    return m;
  });
  const spots: Record<string, Spot> = { metHourlyBrief: standAt(g, 'mtBrief'), meteorologist_leadBriefing: standAt(g, 'mtLead') };
  spots['*'] = spots.metHourlyBrief;
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    screen.set(slideTex(now ? Math.round(n.slide ?? 0) : 0));
    hMin.rotation.z = -t * 0.3;
    hHour.rotation.z = -t * 0.025;
    const lead = now === 'meteorologist_leadBriefing';
    fold.visible = !lead;
    cover.rotation.z = -Math.PI * (1 - (n.open ?? 0));
    inside.visible = (n.open ?? 0) > 0.5;
    const im = inside.material as THREE.MeshBasicMaterial;
    const wn = notesTex(Math.round(n.notes ?? 0));
    if (im.map !== wn) {
      im.map = wn;
      im.needsUpdate = true;
    }
    pct.set(pctTex((n.pct ?? 0) > 0.5 || (n.writes ?? 0) > 0.7 ? 1 : 0));
    pen.visible = !!P.pen;
    if (P.pen) place(pen, P.pen);
    card.visible = !!P.card;
    if (P.card) place(card, P.card);
    remote.visible = !!P.remote;
    if (P.remote) place(remote, P.remote);
    mk.visible = !!P.marker;
    if (P.marker) place(mk, P.marker);
    // Stood at the screen in a discussion; a seat when the dweller is running it.
    director.root.visible = !lead;
    chairDir.root.visible = lead;
    const boss = n.boss ?? 0;
    if (!lead) {
      director.armL(null);
      director.armR(boss >= 1 && boss < 2.5 ? v3(-1.25, S[1] - 0.1 + 0.08 * Math.sin(t * 1.4), -0.45 + 0.08 * Math.sin(t * 0.8)) : null);
      director.head.rotation.y = boss >= 1.5 ? 0.4 : -0.9;
    }
    const looks = lead ? -Math.PI / 2 : (n.heads ?? 0) > 0.5 ? 0.35 : -1.0;
    senior.head.rotation.y = -Math.abs(looks) + (lead ? 0 : 0.2);
    caster.head.rotation.y = Math.abs(looks);
    junior.head.rotation.y = Math.abs(looks) * 1.1;
    chairDir.head.rotation.y = -1.1;
    // Answers, or their own cards up.
    const up = (n.cards ?? 0) > 0.5;
    cards.forEach((m) => (m.visible = up));
    senior.armR(up ? v3(X + 0.72, 1.14, -0.5) : (n.heads ?? 0) > 1.5 ? v3(X + 0.6, 1.0 + 0.05 * Math.sin(t * 2.2), -0.4) : null);
    caster.armR(up ? v3(X - 0.28, 1.14, 0.5) : null);
    junior.armR(up ? v3(X + 0.5, 1.14, 0.5) : null);
    const a = n.assign ?? -1;
    junior.head.rotation.x = a >= 1.5 ? 0.25 : 0;
    caster.head.rotation.x = a >= 0.5 && a < 1.5 ? 0.25 : 0;
    senior.head.rotation.x = a >= -0.1 && a < 0.5 ? 0.25 : (n.nodAll ?? 0) > 0.5 ? 0.25 * Math.sin(t * 3) : 0;
  });
  out.work = marker(g, BR.folder[0], BR.folder[1], BR.folder[2]);
}

// =============================================================================================
// The 태풍 진로 테이블 (metTyphoonTable).

const typhoonTex = frames('Typhoon', 512, 384, (c, i) => {
  coast(c, 512, 384, '#0d2c44', '#3a5540', '#8ad0a6');
  c.strokeStyle = 'rgba(180,220,240,0.22)';
  c.lineWidth = 1;
  for (let x = 32; x < 512; x += 64) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, 384);
    c.stroke();
  }
  for (let y = 32; y < 384; y += 64) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(512, y);
    c.stroke();
  }
  text(c, '태풍 11호 진로', 16, 20, 22, '#ffffff');
  // Past track up from the south-east.
  const past: Array<[number, number]> = [[470, 372], [448, 330], [420, 290], [392, 262], [346, 216]];
  c.strokeStyle = '#ffee58';
  c.lineWidth = 2.5;
  c.beginPath();
  past.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.stroke();
  for (const [x, y] of past) {
    c.fillStyle = '#ffee58';
    c.beginPath();
    c.arc(x, y, 4, 0, Math.PI * 2);
    c.fill();
  }
  // The ruled line, onward.
  if (i >= 1) {
    c.setLineDash([8, 6]);
    c.strokeStyle = '#ffffff';
    c.beginPath();
    c.moveTo(346, 216);
    c.lineTo(346 - (i === 1 ? 60 : 120), 216 - (i === 1 ? 50 : 100));
    c.stroke();
    c.setLineDash([]);
    if (i >= 2) text(c, '시속 25km', 300, 196, 16, '#ffffff');
  }
  // The fan of ensemble tracks.
  if (i >= 3) {
    const s = seeded(9);
    for (let k = 0; k < 14; k++) {
      c.strokeStyle = `hsla(${180 + k * 10},80%,70%,0.8)`;
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(346, 216);
      c.quadraticCurveTo(290 + s() * 30, 150, 170 + s() * 170, 30 + s() * 50);
      c.stroke();
    }
  }
  // The cone.
  if (i >= 4) {
    c.fillStyle = 'rgba(255,82,82,0.3)';
    c.strokeStyle = '#ff5252';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(346, 216);
    c.lineTo(160, 60);
    c.quadraticCurveTo(250, 15, 340, 50);
    c.closePath();
    c.fill();
    c.stroke();
  }
  if (i >= 5) {
    c.strokeStyle = '#c62828';
    c.lineWidth = 4;
    c.strokeRect(372, 318, 120, 50);
    text(c, '진로 확정', 432, 343, 24, '#ff8a80', 'center');
  }
});
function typhoonTable(g: THREE.Group, out: Built) {
  const T = TY.top;
  // A steel lit table.
  part(g, rbox(1.76, 0.08, 1.36, 0.02), '#455a64', 0, T - 0.05, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, rbox(0.08, T - 0.1, 0.08, 0.01), '#37474f', sx * 0.78, (T - 0.1) / 2, sz * 0.58);
  part(g, box(1.6, 0.03, 1.2), '#546e7a', 0, 0.26, 0);
  const map = swapPic(g, 1.66, 1.24, 0, T + 0.003, 0, 0, -Math.PI / 2);
  map.set(typhoonTex(0));
  // Pins of past fixes, standing up.
  for (const [a, b] of [[0.72, 0.66], [0.62, 0.5], [0.5, 0.33], [0.4, 0.2]] as const) {
    const p = TY.map(a, b);
    part(g, cyl(0.003, 0.003, 0.05, 4), CHROME, p[0], p[1] + 0.02, p[2], { outline: false });
    part(g, ball(0.014), '#ffee58', p[0], p[1] + 0.05, p[2], { outline: false });
  }
  // Telex, tablet, stamp, ruler lying where they go.
  const telex = group(g);
  part(telex, box(0.2, 0.28, 0.002), PAPER, 0, 0, 0, { outline: false });
  label(telex, '태풍 정보', 0.16, 0.035, 0, 0.1, 0.002, '#0277bd', '#ffffff');
  const tab = group(g);
  part(tab, rbox(0.24, 0.17, 0.012, 0.008), BLACK, 0, 0, 0);
  const tabScr = swapPic(tab, 0.22, 0.15, 0, 0, 0.007);
  tabScr.set(painted('metTabEns', 128, 88, (c) => {
    c.fillStyle = '#0d2c44';
    c.fillRect(0, 0, 128, 88);
    text(c, '앙상블 50', 6, 10, 11, '#ffffff');
    for (let k = 0; k < 8; k++) {
      c.strokeStyle = `hsl(${k * 40},80%,70%)`;
      c.beginPath();
      c.moveTo(100, 76);
      c.quadraticCurveTo(70, 40, 18 + k * 12, 18);
      c.stroke();
    }
  }));
  const stamp = group(g);
  part(stamp, cyl(0.03, 0.035, 0.05, 10), '#212121', 0, 0.025, 0);
  part(stamp, ball(0.026), '#5d4037', 0, 0.07, 0);
  place(stamp, TY.stamp);
  const ruler = part(g, box(0.5, 0.006, 0.05), '#ffe082', 0, 0, 0);
  ruler.visible = false;
  const rulerRest = part(g, box(0.5, 0.006, 0.05), '#ffe082', -0.3, T + 0.012, 0.58, { ry: 0.06 });
  const stick = part(g, cyl(0.009, 0.009, 0.14, 6), '#d32f2f', 0, 0, 0, { rx: 1.1, outline: false });
  stick.visible = false;
  const pin = group(g);
  part(pin, cyl(0.003, 0.003, 0.09, 4), CHROME, 0, 0.04, 0, { outline: false });
  part(pin, ball(0.022), '#e53935', 0, 0.09, 0);
  pin.visible = false;
  const pinIn = group(g);
  const pa = TY.map(TY.pin[0], TY.pin[1]);
  place(pinIn, pa);
  part(pinIn, cyl(0.003, 0.003, 0.09, 4), CHROME, 0, 0.04, 0, { outline: false });
  part(pinIn, ball(0.022), '#e53935', 0, 0.09, 0);
  const lamp = ownLit(g, ball(0.02), '#553311', 0.8, T + 0.03, -0.62);
  // The senior, leaning in from the far side.
  const crew = scene(g, out);
  const senior = person(crew, LOOKS.senior, -0.25, -0.98, 0);
  const spots: Record<string, Spot> = { metTrackTyphoon: standAt(g, 'mtTyphoon') };
  spots['*'] = spots.metTrackTyphoon;
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    map.set(typhoonTex(now ? Math.round(n.stage ?? 0) : 4));
    place(telex, P.telex ?? TY.telex);
    telex.rotation.x = P.telex ? -0.55 : -Math.PI / 2;
    place(tab, P.tab ?? TY.tablet);
    tab.rotation.x = P.tab ? -0.55 : -Math.PI / 2;
    place(stamp, P.stamp ?? TY.stamp);
    ruler.visible = !!P.ruler;
    rulerRest.visible = !P.ruler;
    if (P.ruler) place(ruler, P.ruler);
    stick.visible = !!P.stick;
    if (P.stick) place(stick, P.stick);
    pin.visible = !!P.pin;
    if (P.pin) place(pin, P.pin);
    pinIn.visible = !now || (n.pinIn ?? 0) > 0.5;
    setLit(lamp, (n.warnLamp ?? 0) > 0.5 && Math.floor(t * 2) % 2 === 0 ? '#ffb300' : '#553311');
    // Senior: when it's his turn, the arm out over the map; his head follows.
    const talk = (n.buddy ?? 0) > 0.5;
    senior.armR(talk ? v3(0.0 + 0.1 * Math.sin(t * 1.6), T + 0.15, -0.5) : null);
    senior.armL(talk ? v3(-0.6, T + 0.1, -0.5) : null);
    senior.head.rotation.x = talk ? 0.25 : 0.45;
  });
  out.work = marker(g, 0, T, 0.2);
}

// =============================================================================================
// The 관측 노장 (metObsGarden).

const obsLog = frames('ObsLog', 72, 96, (c, i) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 72, 96);
  text(c, '지상 관측', 5, 7, 8, '#2e7d32');
  c.strokeStyle = '#b0bec5';
  for (let k = 0; k < 6; k++) {
    c.beginPath();
    c.moveTo(4, 18 + k * 13);
    c.lineTo(68, 18 + k * 13);
    c.stroke();
  }
  for (let k = 0; k < i; k++) {
    c.fillStyle = '#1a237e';
    c.fillRect(6, 13 + k * 13, 28 + (k * 13) % 30, 2.5);
  }
});
function obsGarden(g: THREE.Group, out: Built) {
  // The grass and its path; a low white fence on three sides.
  part(g, rbox(2.96, 0.04, 1.96, 0.02), '#8bc34a', 0, 0.02, 0);
  const grass = seeded(66);
  for (let i = 0; i < 40; i++) part(g, box(0.05, 0.015, 0.05), grass() > 0.5 ? '#7cb342' : '#9ccc65', -1.4 + grass() * 2.8, 0.045, -0.9 + grass() * 1.8, { outline: false });
  for (let i = 0; i < 7; i++) part(g, cyl(0.1, 0.1, 0.012, 12), '#c8c6b9', -0.8 + i * 0.28, 0.046, 0.62 + (i % 2) * 0.02, { outline: false });
  for (const [x, z, w, d] of [[0, -0.94, 2.9, 0.03], [-1.45, -0.05, 0.03, 1.8], [1.45, -0.05, 0.03, 1.8]] as const) {
    part(g, box(w, 0.03, d), '#fafafa', x, 0.46, z);
    part(g, box(w, 0.03, d), '#fafafa', x, 0.26, z);
  }
  for (let i = 0; i < 9; i++) part(g, box(0.05, 0.56, 0.05), '#fafafa', -1.44 + i * 0.36, 0.28, -0.94);
  for (const x of [-1.45, 1.45]) for (let i = 0; i < 5; i++) part(g, box(0.05, 0.56, 0.05), '#fafafa', x, 0.28, -0.94 + i * 0.44);
  // The 백엽상: white, louvred, on four legs, its door to the front (north in the real one).
  const S = OG.screen;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.05, 1.05, 0.05), '#fafafa', S.x + sx * 0.3, 0.52, S.z + sz * 0.22);
  part(g, rbox(0.72, 0.5, 0.58, 0.01), '#fdfdf8', S.x, 1.22, S.z);
  part(g, rbox(0.84, 0.05, 0.7, 0.01), '#fafafa', S.x, 1.5, S.z, { rx: 0.06 });
  part(g, rbox(0.82, 0.05, 0.68, 0.01), '#f1f1ea', S.x, 1.55, S.z, { rx: -0.03 });
  for (let i = 0; i < 9; i++) for (const sx of [-1, 1]) part(g, box(0.006, 0.03, 0.54), '#d7d7ce', S.x + sx * 0.362, 1.02 + i * 0.05, S.z, { rz: sx * 0.6, outline: false });
  label(g, '백엽상', 0.26, 0.05, S.x, 0.92, S.z + 0.292, '#ffffff', '#37474f');
  // Inside: a dark back, the thermometers on a frame.
  part(g, box(0.62, 0.4, 0.01), '#d0d0c6', S.x, 1.22, S.z + 0.22, { outline: false });
  const thermo = (x: number, col: string) => {
    part(g, cyl(0.006, 0.006, 0.28, 6), '#f5f5f5', x, 1.22, S.z + 0.25, { outline: false });
    part(g, cyl(0.003, 0.003, 0.16, 4), col, x, 1.2, S.z + 0.258, { outline: false });
    part(g, ball(0.012), col, x, 1.07, S.z + 0.25, { outline: false });
  };
  thermo(S.x - 0.12, '#e53935');
  thermo(S.x, '#e53935');
  thermo(S.x + 0.12, '#1565c0');
  const door = group(g, S.x - 0.36, 1.22, S.z + 0.292);
  part(door, box(0.72, 0.5, 0.012), '#fdfdf8', 0.36, 0, 0);
  for (let i = 0; i < 9; i++) part(door, box(0.68, 0.006, 0.03), '#d7d7ce', 0.36, -0.2 + i * 0.05, 0.012, { rx: -0.6, outline: false });
  part(door, ball(0.012), '#90a4ae', 0.65, 0, 0.022, { outline: false });
  // The rain gauge: a steel cylinder on a concrete pad.
  const G = OG.gauge;
  part(g, cyl(0.24, 0.26, 0.05, 18), '#a7adb0', G[0], 0.06, G[2]);
  part(g, cyl(0.1, 0.1, 0.34, 18), STEEL, G[0], 0.25, G[2]);
  const hole = part(g, cyl(0.085, 0.085, 0.004, 18), '#37474f', G[0], 0.43, G[2], { outline: false });
  const funnel = group(g);
  part(funnel, cyl(0.1, 0.05, 0.14, 18), CHROME, 0, 0.07, 0);
  part(funnel, cyl(0.1, 0.1, 0.012, 18), STEEL, 0, 0.145, 0);
  part(funnel, cyl(0.085, 0.05, 0.003, 18), '#607d8b', 0, 0.15, 0, { outline: false });
  const bottle = group(g);
  part(bottle, cyl(0.055, 0.055, 0.24, 12), '#ffffff', 0, 0.12, 0, { material: PANE });
  const bottleW = new THREE.Mesh(cyl(0.05, 0.05, 1, 12), WATER);
  bottleW.position.y = 0.0;
  bottle.add(bottleW);
  const jar = group(g);
  part(jar, cyl(0.05, 0.05, 0.22, 12), '#ffffff', 0, 0.11, 0, { material: PANE });
  part(jar, cyl(0.055, 0.055, 0.012, 12), '#90a4ae', 0, 0.006, 0, { outline: false });
  for (let i = 0; i < 6; i++) part(jar, box(0.018, 0.003, 0.002), '#263238', 0.03, 0.04 + i * 0.03, 0.05, { outline: false });
  const jarW = new THREE.Mesh(cyl(0.045, 0.045, 1, 12), WATER);
  jar.add(jarW);
  const stream = new THREE.Mesh(cyl(0.008, 0.008, 1, 6), WATER);
  stream.visible = false;
  g.add(stream);
  // The wind mast: a tall pole, three cups, a vane.
  const M = OG.mast;
  part(g, cyl(0.08, 0.1, 0.08, 10), '#a7adb0', M[0], 0.08, M[2]);
  part(g, cyl(0.022, 0.03, 2.9, 8), '#b0bec5', M[0], 1.5, M[2]);
  part(g, cyl(0.03, 0.03, 0.04, 8), '#78909c', M[0], 2.95, M[2]);
  const cups = group(g, M[0], 3.0, M[2]);
  for (const a of [0, 2.09, 4.19]) {
    part(cups, cyl(0.005, 0.005, 0.16, 4), '#90a4ae', Math.cos(a) * 0.08, 0, Math.sin(a) * 0.08, { rz: Math.PI / 2, ry: -a, outline: false });
    part(cups, ball(0.035), '#fafafa', Math.cos(a) * 0.16, 0, Math.sin(a) * 0.16);
  }
  const vane = group(g, M[0], 2.78, M[2]);
  part(vane, box(0.42, 0.012, 0.012), '#37474f', 0, 0, 0, { outline: false });
  part(vane, box(0.12, 0.09, 0.006), '#e53935', -0.2, 0, 0, { outline: false });
  part(vane, cyl(0.001, 0.03, 0.07, 6), '#37474f', 0.24, 0, 0, { rz: -Math.PI / 2, outline: false });
  // A sunshine recorder, a small soil thermometer row, the instrument cable box.
  part(g, box(0.05, 0.86, 0.05), '#fafafa', 0.55, 0.45, -0.58);
  part(g, ball(0.08), '#b3e5fc', 0.55, 0.96, -0.58, { material: PANE });
  part(g, rbox(0.2, 0.16, 0.08, 0.01), '#90a4ae', 1.0, 0.13, 0.32);
  for (let i = 0; i < 4; i++) part(g, cyl(0.008, 0.008, 0.18 + i * 0.03, 6), '#fafafa', -0.1 + i * 0.1, 0.13, -0.5, { outline: false });
  label(g, '관측 노장', 0.6, 0.11, 0, 0.36, -0.91, '#2e7d32', '#ffffff');
  const { t: board, page } = clipboard(g, () => obsLog(0));
  board.visible = false;
  const pen = pencil(g, '#1a237e');
  pen.visible = false;
  const spots: Record<string, Spot> = { metReadScreen: standAt(g, 'mtScreen'), metRainGauge: standAt(g, 'mtGauge') };
  spots['*'] = spots.metReadScreen;
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    cups.rotation.y = t * 5;
    vane.rotation.y = 0.5 + 0.25 * Math.sin(t * 0.4) + 0.08 * Math.sin(t * 2.3);
    door.rotation.y = -(n.door ?? 0) * 1.9;
    const gauge = now === 'metRainGauge';
    // The gauge's parts.
    const fp = gauge ? P.funnel ?? null : ([G[0], 0.42, G[2]] as V);
    place(funnel, fp ?? [G[0], 0.42, G[2]]);
    hole.visible = gauge;
    const cp = P.cup ?? null;
    bottle.visible = gauge && !!cp;
    if (cp) {
      place(bottle, cp);
      bottle.rotation.z = (n.tip ?? 0) > 0.5 ? 1.4 : 0;
      const lv = n.cupLevel ?? 0;
      bottleW.visible = lv > 0.03;
      bottleW.scale.y = 0.2 * lv;
      bottleW.position.y = 0.012 + 0.1 * lv;
    }
    const jp = P.jar ?? null;
    jar.visible = gauge && !!jp;
    if (jp) {
      place(jar, jp);
      jar.rotation.x = (n.jarTip ?? 0) > 0.5 ? 1.8 * sinTip(n) : 0;
      const lv = n.level ?? 0;
      jarW.visible = lv > 0.02;
      jarW.scale.y = 0.16 * lv;
      jarW.position.y = 0.012 + 0.08 * lv;
    }
    // A thin stream of poured water.
    const pour = (n.stream ?? 0) > 0.5;
    stream.visible = pour;
    if (pour) {
      const from = jp && (n.tip ?? 0) <= 0.5 ? v3(jp[0], jp[1] + 0.04, jp[2] + 0.1) : v3((jp?.[0] ?? 0) + 0.04, (jp?.[1] ?? 0) + 0.22, jp?.[2] ?? 0);
      const toY = (n.tip ?? 0) <= 0.5 ? 0.05 : (jp?.[1] ?? 0) + 0.06;
      stream.position.set(from.x, (from.y + toY) / 2, from.z);
      stream.scale.y = Math.max(0.01, from.y - toY);
    }
    // The clipboard.
    const b = P.board ?? null;
    board.visible = !!b;
    if (b) {
      place(board, b);
      board.rotation.x = -0.6;
    }
    page.set(obsLog(Math.round(n.lines ?? 0)));
    pen.visible = !!P.pen;
    if (P.pen) place(pen, P.pen);
  });
  out.work = marker(g, G[0], 0.4, G[2]);
}
const sinTip = (n: Record<string, number>) => Math.min(1, n.stream ?? 0.5);

// =============================================================================================
// The 날씨 문의 데스크 (metPublicDesk), in the lobby.

const enquiryTex = frames('Enq', 220, 146, (c, i) => {
  if (i === 0) {
    c.fillStyle = '#10222e';
    c.fillRect(0, 0, 220, 146);
    text(c, '날씨 문의 안내', 110, 60, 22, '#4fc3f7', 'center');
    text(c, '대기 중', 110, 90, 15, '#90a4ae', 'center');
    return;
  }
  if (i === 4) {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 220, 146);
    text(c, '상담 기록', 8, 14, 16, '#12324f');
    ['지역: 솔내', '문의: 오후 소나기', '안내 완료'].forEach((s, k) => text(c, s, 8, 44 + k * 28, 15, '#37474f'));
    return;
  }
  coast(c, 220, 146, '#dcebf3', '#f2f0e0');
  c.fillStyle = 'rgba(0,0,0,0.65)';
  c.fillRect(0, 0, 220, 20);
  text(c, ['', '솔내 지역 검색', '시간별 강수', '동네 예보: 오후 소나기'][i], 6, 10, 13, '#ffffff');
  if (i >= 2) {
    c.fillStyle = 'rgba(21,101,192,0.45)';
    c.beginPath();
    c.ellipse(125, 60, 34, 24, 0, 0, Math.PI * 2);
    c.fill();
  }
  if (i >= 1) {
    c.fillStyle = '#c62828';
    c.beginPath();
    c.arc(125, 54, 5, 0, Math.PI * 2);
    c.fill();
  }
  if (i === 3) {
    c.fillStyle = '#ffffff';
    c.fillRect(8, 112, 204, 26);
    text(c, '15시~17시 강수 60%', 110, 125, 15, '#1565c0', 'center');
  }
});
function publicDesk(g: THREE.Group, out: Built) {
  const T = 0.74;
  // A counter-backed desk, a wall panel above it with the sign and a forecast of the day.
  part(g, rbox(1.94, 0.04, 0.72, 0.01), '#dfe6ea', 0, T - 0.02, -0.12);
  part(g, box(1.9, T - 0.04, 0.03), '#90a4ae', 0, (T - 0.04) / 2, -0.44);
  for (const x of [-0.94, 0.94]) part(g, box(0.03, T - 0.04, 0.68), '#90a4ae', x, (T - 0.04) / 2, -0.12);
  part(g, rbox(1.94, 0.92, 0.04, 0.01), '#cfd8dc', 0, T + 0.5, -0.48);
  label(g, '날씨 문의 안내', 0.8, 0.13, -0.25, 1.52, -0.455, '#0277bd', '#ffffff');
  // A wall poster: weather terms.
  picture(g, painted('metTermPoster', 128, 96, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 128, 96);
    text(c, '날씨 용어', 64, 14, 13, '#0277bd', 'center');
    ['강수확률', '호우주의보', '체감온도', '돌풍'].forEach((s, k) => text(c, `· ${s}`, 10, 36 + k * 15, 11, '#37474f'));
  }), 0.5, 0.38, 0.62, 1.32, -0.456);
  // Screen, keys, phone base, log, leaflets.
  const scr = monitor(g, PD.screen[0], PD.screen[1], PD.screen[2], 0, 0.5, 0.33);
  scr.set(enquiryTex(0));
  keyboard(g, PD.keys[0], T + 0.01, PD.keys[2], 0.38);
  part(g, rbox(0.17, 0.04, 0.17, 0.012), BLACK, PD.phoneBtn[0], T + 0.02, PD.phoneBtn[2]);
  const lineLamp = ownLit(g, box(0.03, 0.006, 0.02), '#37474f', PD.phoneBtn[0] + 0.05, T + 0.044, PD.phoneBtn[2] - 0.05);
  for (let i = 0; i < 6; i++) part(g, box(0.018, 0.005, 0.018), '#90a4ae', PD.phoneBtn[0] - 0.05 + (i % 3) * 0.035, T + 0.043, PD.phoneBtn[2] - 0.02 + Math.floor(i / 3) * 0.04, { outline: false });
  part(g, rbox(0.03, 0.24, 0.03, 0.01), '#607d8b', PD.headset[0], T + 0.12, PD.headset[2]);
  const log = group(g, PD.log[0], T + 0.003, PD.log[2]);
  const logPage = swapPic(log, 0.17, 0.23, 0, 0, 0, 0, -Math.PI / 2);
  logPage.set(logTex(0));
  for (let i = 0; i < 3; i++) part(g, box(0.1, 0.16, 0.005), ['#4fc3f7', '#ffca28', '#81c784'][i], -0.76 + i * 0.12, T + 0.08, -0.34, { rx: -0.2 });
  // The headset.
  const set = group(g);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.008, 6, 16, Math.PI), new THREE.MeshToonMaterial({ color: BLACK }));
  band.userData.ownGeometry = band.userData.ownMaterial = true;
  set.add(band);
  for (const sx of [-1, 1]) part(set, cyl(0.03, 0.03, 0.02, 10), BLACK, sx * 0.1, 0, 0, { rz: Math.PI / 2, outline: false });
  rod(set, v3(-0.1, -0.02, 0.01), v3(-0.04, -0.09, 0.09), 0.003, BLACK);
  const pen = pencil(g, '#1a237e');
  pen.visible = false;
  swivel(g, PD.seat.x, PD.seat.z, Math.PI);
  const spots: Record<string, Spot> = { metAnswerPhone: standAt(g, 'mtPhone') };
  spots['*'] = spots.metAnswerPhone;
  drive(g, out, spots, (_now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    scr.set(enquiryTex(Math.round(n.screen ?? 0)));
    place(set, P.set ?? PD.headset);
    // Worn: its yaw is unknown here, the dweller faces -z in the piece.
    set.rotation.y = 0;
    setLit(lineLamp, (n.ring ?? 0) > 0.5 ? (Math.floor(t * 5) % 2 ? '#ff5252' : '#37474f') : (n.line ?? 0) > 0.5 ? '#66bb6a' : '#37474f');
    logPage.set(logTex(Math.round(n.lines ?? 0)));
    pen.visible = !!P.pen;
    if (P.pen) place(pen, P.pen);
  });
  out.work = marker(g, PD.keys[0], PD.keys[1], PD.keys[2]);
}

// =============================================================================================
// 비양소 (metSondeHut, 2 × 2; 2026-11-04, the layout audit): the small white shed of a 고층기상관측 station, its roller door
// up to the front. Inside, the hydrogen generator in its grey cabinet with the warning signs and the gauge; a bench with a
// radiosonde opened for its check, the sonde's ground receiver and the day's 03·09·15·21시 board; a folded balloon on its hook.

function sondeHut(g: THREE.Group) {
  const W = 1.9;
  const D = 1.3;
  const H = 2.3;
  const bz = -1 + D / 2 + 0.04;
  const wallC = '#f4f6f6';
  // The floor slab and three walls, the roof sloping back.
  part(g, rbox(1.98, 0.08, 1.98, 0.02), '#b9bcb6', 0, 0.04, 0);
  part(g, box(W, H, 0.06), wallC, 0, H / 2, bz - D / 2);
  for (const sx of [-1, 1]) part(g, box(0.06, H, D), wallC, sx * (W / 2 - 0.03), H / 2, bz);
  part(g, box(W + 0.12, 0.06, D + 0.2), '#607d8b', 0, H + 0.04, bz + 0.02, { rx: -0.06 });
  // The roller door rolled up over the opening, its guides.
  part(g, cyl(0.1, 0.1, W - 0.1, 14), '#90a4ae', 0, H - 0.12, bz + D / 2 - 0.02, { rz: Math.PI / 2 });
  for (const sx of [-1, 1]) part(g, box(0.05, H - 0.2, 0.06), '#78909c', sx * (W / 2 - 0.08), (H - 0.2) / 2, bz + D / 2 - 0.02);
  label(g, '비양소', 0.5, 0.14, 0, H - 0.34, bz + D / 2 + 0.02, '#1565c0', '#ffffff');
  // The hydrogen generator: a grey cabinet on the left, its gauge and pipe, the warnings.
  const gx = -0.5;
  part(g, rbox(0.7, 1.4, 0.55, 0.03), '#b0bec5', gx, 0.78, bz - D / 2 + 0.32);
  part(g, cyl(0.07, 0.07, 0.02, 16), '#fafafa', gx - 0.15, 1.2, bz - D / 2 + 0.6, { rx: Math.PI / 2 });
  part(g, box(0.004, 0.05, 0.003), '#c62828', gx - 0.15, 1.21, bz - D / 2 + 0.612, { outline: false, rz: 0.6 });
  part(g, rbox(0.16, 0.08, 0.02, 0.01), '#43a047', gx + 0.15, 1.2, bz - D / 2 + 0.6);
  label(g, '수소 발생기', 0.44, 0.08, gx, 1.36, bz - D / 2 + 0.6, '#eceff1', '#263238');
  label(g, '화기 엄금', 0.32, 0.09, gx, 0.86, bz - D / 2 + 0.6, '#c62828', '#ffffff');
  rod(g, v3(gx + 0.3, 1.45, bz - D / 2 + 0.2), v3(gx + 0.3, H - 0.1, bz - D / 2 + 0.2), 0.02, '#cfd8dc');
  // The bench on the right: the opened sonde, the receiver, a laptop with its sounding, the folded balloon on the wall.
  const bx = 0.42;
  const T = 0.82;
  part(g, rbox(0.9, 0.04, 0.6, 0.01), '#d7ccc8', bx, T, bz - D / 2 + 0.36);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.04, T, 0.04), '#8d6e63', bx + sx * 0.4, T / 2, bz - D / 2 + 0.36 + sz * 0.26);
  part(g, rbox(0.14, 0.08, 0.1, 0.01), '#fafafa', bx - 0.2, T + 0.06, bz - D / 2 + 0.42);
  part(g, cyl(0.004, 0.004, 0.3, 4), '#212121', bx - 0.2, T + 0.12, bz - D / 2 + 0.55, { rx: Math.PI / 2, outline: false });
  part(g, rbox(0.22, 0.1, 0.16, 0.01), '#37474f', bx + 0.08, T + 0.07, bz - D / 2 + 0.3);
  part(g, box(0.06, 0.014, 0.01), '#66bb6a', bx + 0.08, T + 0.09, bz - D / 2 + 0.382, { outline: false });
  part(g, box(0.28, 0.01, 0.2), '#263238', bx + 0.28, T + 0.025, bz - D / 2 + 0.46);
  part(g, box(0.28, 0.18, 0.01), '#263238', bx + 0.28, T + 0.11, bz - D / 2 + 0.36, { rx: -0.2 });
  part(g, box(0.25, 0.15, 0.002), '#e3f2fd', bx + 0.28, T + 0.11, bz - D / 2 + 0.368, { outline: false, rx: -0.2 });
  part(g, ball(0.16), '#f5f0e6', bx + 0.1, 1.55, bz - D / 2 + 0.14);
  label(g, '정시 관측 03 · 09 · 15 · 21시', 0.62, 0.08, bx, 1.86, bz - D / 2 + 0.035, '#ffffff', '#1565c0');
}

// 관측장 울타리 (metFieldFence, drawn from the field's north-west tile at 17, 1): a green mesh fence round the observation field,
// the building's wall on its west; its gate on the south, open, with the field's sign.

function fieldFence(g: THREE.Group) {
  const at = (x: number, y: number) => v3(x - 17.5, 0, y - 1.5);
  const MESH = new THREE.MeshBasicMaterial({ color: '#2e7d32', transparent: true, opacity: 0.32, depthWrite: false });
  const run = (a: THREE.Vector3, b: THREE.Vector3) => {
    const len = a.distanceTo(b);
    const ry = Math.atan2(b.z - a.z, b.x - a.x);
    const mid = a.clone().lerp(b, 0.5);
    for (const y of [0.1, 1.2]) part(g, box(len, 0.035, 0.035), '#2e7d32', mid.x, y, mid.z, { ry: -ry });
    part(g, box(len, 1.1, 0.01), '#2e7d32', mid.x, 0.65, mid.z, { ry: -ry, material: MESH, outline: false });
    const n = Math.max(1, Math.round(len / 1.0));
    for (let i = 0; i <= n; i++) {
      const p = a.clone().lerp(b, i / n);
      part(g, cyl(0.03, 0.03, 1.3, 8), '#1b5e20', p.x, 0.65, p.z);
    }
  };
  run(at(17.0, 1.05), at(24.95, 1.05));
  run(at(24.95, 1.05), at(24.95, 13.95));
  run(at(24.95, 13.95), at(21.0, 13.95));
  run(at(19.0, 13.95), at(17.0, 13.95));
  // The gateposts, the open leaf folded back along the fence, the sign.
  for (const x of [19.0, 21.0]) part(g, rbox(0.12, 1.5, 0.12, 0.02), '#cfd8dc', at(x, 13.95).x, 0.75, at(x, 13.95).z);
  const leaf = at(21.0, 13.95);
  part(g, box(0.035, 1.1, 1.9), '#2e7d32', leaf.x + 0.06, 0.65, leaf.z - 0.95, { material: MESH, outline: false });
  part(g, box(0.04, 0.04, 1.9), '#2e7d32', leaf.x + 0.06, 1.2, leaf.z - 0.95);
  const sign = at(18.0, 13.95);
  label(g, '지상기상관측장 · 관계자 외 출입금지', 1.2, 0.16, sign.x, 1.0, sign.z + 0.07, '#ffffff', '#1b5e20');
}

// 기상 브리핑 백드롭 (metPressBackdrop, 3 × 1; 2026-11-04, the layout audit): the press room's wall, the office's name and
// mark repeated over navy, a screen in the middle with the radar's rain band and the warning areas, the date card below it.

const OFFICE = '한누리지방기상청';
function pressBackdrop(g: THREE.Group, D: number) {
  const bz = -D / 2 + 0.05;
  part(g, box(2.9, 2.3, 0.06), NAVY, 0, 1.25, bz);
  const tex = painted('metPressBackdrop', 580, 460, (c) => {
    c.fillStyle = NAVY;
    c.fillRect(0, 0, 580, 460);
    for (let r = 0; r < 8; r++)
      for (let k = 0; k < 4; k++) {
        const x = 40 + k * 150 + (r % 2) * 70;
        const y = 40 + r * 56;
        c.fillStyle = '#4fc3f7';
        c.beginPath();
        c.arc(x, y - 6, 9, 0, Math.PI * 2);
        c.fill();
        text(c, OFFICE, x + 16, y, 15, '#e3f2fd');
      }
    c.fillStyle = '#0d2236';
    c.fillRect(0, 0, 580, 58);
    text(c, `${OFFICE} 기상 브리핑`, 290, 40, 30, '#ffffff', 'center');
  });
  picture(g, tex, 2.84, 2.25, 0, 1.25, bz + 0.032);
  // The screen: the radar's rain band over the peninsula, the 호우경보 areas.
  part(g, box(1.3, 0.78, 0.05), BLACK, 0, 1.3, bz + 0.055);
  const radar = painted('metPressRadar', 320, 192, (c) => {
    c.fillStyle = SEA;
    c.fillRect(0, 0, 320, 192);
    c.fillStyle = LAND;
    c.beginPath();
    c.moveTo(150, 10); c.lineTo(205, 30); c.lineTo(220, 90); c.lineTo(205, 170); c.lineTo(160, 182); c.lineTo(130, 150); c.lineTo(138, 80); c.closePath();
    c.fill();
    for (const [x, y, r, col] of [[175, 95, 46, 'rgba(76,175,80,0.7)'], [178, 98, 30, 'rgba(255,235,59,0.8)'], [182, 100, 15, 'rgba(229,57,53,0.85)']] as const) {
      c.fillStyle = col;
      c.beginPath();
      c.ellipse(x, y, r * 1.5, r * 0.7, -0.5, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = '#c62828';
    c.fillRect(0, 0, 320, 30);
    text(c, '호우경보 발표 · 시간당 50mm 이상', 160, 22, 17, '#ffffff', 'center');
  });
  picture(g, radar, 1.22, 0.72, 0, 1.3, bz + 0.082);
  label(g, '11월 4일 17시 정례 예보 브리핑', 0.9, 0.1, 0, 0.8, bz + 0.04, '#ffffff', NAVY);
}

export const BUILDERS: Record<string, Builder> = {
  metPressBackdrop(g, _W, D) {
    pressBackdrop(g, D);
  },
  metSondeHut(g) {
    sondeHut(g);
  },
  metFieldFence(g) {
    fieldFence(g);
  },
  forecastWall(g, _W, _D, _c, _def, _ctx, out) {
    forecastWall(g, out);
  },
  modelTerminal(g, _W, _D, _c, _def, _ctx, out) {
    modelTerminal(g, out);
  },
  balloonLauncher(g, _W, _D, _c, _def, _ctx, out) {
    balloonLauncher(g, out);
  },
  weatherStation(g, _W, _D, _c, _def, _ctx, out) {
    weatherStation(g, out);
  },
  weatherSet(g, _W, _D, _c, _def, _ctx, out) {
    weatherSet(g, out);
  },
  metBriefTable(g, _W, _D, _c, _def, _ctx, out) {
    briefTable(g, out);
  },
  metTyphoonTable(g, _W, _D, _c, _def, _ctx, out) {
    typhoonTable(g, out);
  },
  metObsGarden(g, _W, _D, _c, _def, _ctx, out) {
    obsGarden(g, out);
  },
  metPublicDesk(g, _W, _D, _c, _def, _ctx, out) {
    publicDesk(g, out);
  },
};
