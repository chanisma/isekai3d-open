import * as THREE from 'three';
import { marker, rod, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, label, painted, picture, seeded, text } from './doctor';
import * as AM from './actorMotion';
import { CC, CF, GS, MC, SAYS, SET, ST, TB, VV, WHO, type AcMotion, type AcNow } from './actorMotion';

/**
 * The 영화 촬영장 drawn as itself (2026-10-31 workplace pipeline, at the user's request): a shoot from the
 * actor's side. An alley built on the stage with a rain bar over it, where a scene is blocked, shot in
 * three takes that go differently (the line fluffed, the boom in the shot, the one that's kept) and
 * improvised with a banana; a crash mat with a rig and a coordinator; the long table where a script is
 * highlighted, a voice is trained, a junior is coached and the cast reads together; the tent where the
 * take is watched; the row of cast chairs; the costume rail; the folding chair of the touch-up; a green
 * cove where a tennis ball is a monster.
 *
 * Everything that moves follows the same scripts as the hands (actorMotion.ts). The film and the café on
 * the set are made up.
 */

const UP = new THREE.Vector3(0, 1, 0);
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3();
type V = readonly [number, number, number];
const PAPER = '#fbfaf4';
const CANVAS = '#37474f';
const WOODD = '#6d4c41';
const WOODL = '#b08968';
const TAPE = '#ffeb3b';

const VINYL = new THREE.MeshToonMaterial({ color: '#e8f4fb', transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide });
const RAIN = new THREE.MeshBasicMaterial({ color: '#bcdcf2', transparent: true, opacity: 0.55, depthWrite: false });
const WET = new THREE.MeshToonMaterial({ color: '#50616c', transparent: true, opacity: 0.55, depthWrite: false });
const MIST = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.4, depthWrite: false });

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
function frames(key: string, w: number, h: number, paint: (c: CanvasRenderingContext2D, i: number) => void): (i: number) => THREE.Texture {
  return (i) => painted(`ac${key}|${i}`, w, h, (c) => paint(c, i));
}
function limb(g: THREE.Object3D, r: number, color: string, material?: THREE.Material): (a: THREE.Vector3, b: THREE.Vector3) => void {
  const m = part(g, cyl(r, r * 0.9, 1, 8), color, 0, 0, 0, { outline: false, ...(material ? { material } : {}) });
  const d = new THREE.Vector3();
  return (a, b) => {
    d.subVectors(b, a);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.scale.set(1, Math.max(0.001, d.length()), 1);
    m.quaternion.setFromUnitVectors(UP, d.normalize());
  };
}
const V3 = (p: V) => v3(p[0], p[1], p[2]);
function standAt(g: THREE.Object3D, motion: AcMotion, z = 0.6): Spot {
  const s = spot(g, 'stand', 0, 0, z, Math.PI);
  s.motion = motion;
  return s;
}
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
function nowAt(spots: Record<string, Spot>, t: number): string | null {
  let best: string | null = null;
  for (const [k, s] of Object.entries(spots)) if (Math.abs(t - posedAt(s)) < 0.6 && (best === null || posedAt(s) > posedAt(spots[best]))) best = k;
  return best;
}
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, show: (now: string | null, N: AcNow | null, t: number) => void) {
  out.spots = spots;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const N = sp ? AM.acNow(sp.motion as AcMotion, t, AM.acPhase(g.getWorldPosition(tmp)), (sp.at.userData.height as number | undefined) ?? 1.6) : null;
    show(now, N, t);
  };
}
function scene(g: THREE.Group, out: Built): THREE.Group {
  const s = group(g);
  out.inUse = s;
  return s;
}
/** A script held open, its page facing whoever has it. */
function scriptProp(g: THREE.Object3D, tex: (i: number) => THREE.Texture) {
  const t = group(g);
  part(t, rbox(0.22, 0.29, 0.012, 0.004), '#f6f1e2', 0, 0, 0, { outline: false });
  part(t, box(0.004, 0.29, 0.016), '#c62828', -0.11, 0, 0, { outline: false });
  const page = swapPic(t, 0.2, 0.27, 0, 0, 0.0075);
  page.set(tex(0));
  t.visible = false;
  return { t, page };
}
const scriptPage = frames('Page', 128, 176, (c, i) => {
  // i: page % 3 * 10 + the number of yellow lines.
  const lines = i % 10;
  const pg = Math.floor(i / 10);
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 128, 176);
  text(c, `S#${[37, 38, 41][pg]}`, 8, 11, 12, '#37474f');
  const s = seeded(40 + pg);
  for (let k = 0; k < 11; k++) {
    const y = 28 + k * 13;
    const own = k % 3 === 1;
    if (own && Math.floor(k / 3) < lines) {
      c.fillStyle = '#ffee58';
      c.fillRect(18, y - 5, 96, 10);
    }
    c.fillStyle = own ? '#1a1a1a' : '#90a4ae';
    c.fillRect(own ? 24 : 12, y - 1, 40 + s() * (own ? 44 : 60), 2);
  }
});
function pencil(g: THREE.Object3D, color = '#fdd835'): THREE.Group {
  const t = group(g);
  part(t, cyl(0.006, 0.006, 0.13, 6), color, 0, 0.06, 0, { outline: false });
  part(t, cyl(0.006, 0.001, 0.02, 6), '#3e2723', 0, -0.015, 0, { outline: false, rx: Math.PI });
  t.rotation.set(0.5, 0, 0.3);
  t.visible = false;
  return t;
}
function highlighter(g: THREE.Object3D): THREE.Group {
  const t = group(g);
  part(t, cyl(0.011, 0.012, 0.12, 8), '#ffee58', 0, 0.065, 0, { outline: false });
  part(t, cyl(0.011, 0.005, 0.02, 8), '#fdd835', 0, -0.005, 0, { outline: false, rx: Math.PI });
  t.rotation.set(0.5, 0, 0.3);
  return t;
}
function walkieProp(g: THREE.Object3D): THREE.Group {
  const t = group(g);
  part(t, rbox(0.05, 0.11, 0.03, 0.008), BLACK, 0, 0, 0);
  part(t, cyl(0.004, 0.004, 0.08, 6), BLACK, 0.015, 0.09, 0, { outline: false });
  t.visible = false;
  return t;
}

// ---------------------------------------------------------------------------------------------
// People drawn in, and what they say.

interface Look {
  top: string;
  bottom: string;
  hair: string;
  hairdo: 'short' | 'bob' | 'grey' | 'long';
  jacket?: string;
  glasses?: boolean;
  cap?: string;
  skin?: string;
}
const SKIN = '#f1c9a5';
const LOOKS: Record<string, Look> = {
  director: { top: '#37474f', bottom: '#212121', hair: '#1a1a1a', hairdo: 'short', cap: '#212121', glasses: true },
  partner: { top: '#eceff1', bottom: '#3e4a5a', hair: '#2b1b10', hairdo: 'short', jacket: '#546e7a', skin: '#e4b78e' },
  actress: { top: '#f8bbd0', bottom: '#4a4a5a', hair: '#5b3a1e', hairdo: 'long' },
  ad: { top: '#263238', bottom: '#455a64', hair: '#1f1a17', hairdo: 'short', cap: '#c62828' },
  boom: { top: '#424242', bottom: '#263238', hair: '#2b1b10', hairdo: 'short' },
  coach: { top: '#212121', bottom: '#37474f', hair: '#1f1a17', hairdo: 'short', skin: '#d8a982' },
  voice: { top: '#c5e1a5', bottom: '#5d4037', hair: '#9e9e9e', hairdo: 'bob', glasses: true },
  junior: { top: '#ffcc80', bottom: '#455a64', hair: '#2b1b10', hairdo: 'short' },
  writer: { top: '#b39ddb', bottom: '#37474f', hair: '#1f1a17', hairdo: 'bob', glasses: true },
  fitter: { top: '#fafafa', bottom: '#3e2723', hair: '#2b1b10', hairdo: 'bob', jacket: '#8d6e63' },
  artist: { top: '#212121', bottom: '#212121', hair: '#6d4c41', hairdo: 'long' },
  grip: { top: '#558b2f', bottom: '#37474f', hair: '#1f1a17', hairdo: 'short', cap: '#33691e' },
};
interface Figure {
  root: THREE.Group;
  head: THREE.Group;
  armL(to: THREE.Vector3 | null): void;
  armR(to: THREE.Vector3 | null): void;
  stride(a: number): void;
  headTop: number;
  last: THREE.Vector3;
  walk: number;
}
function person(parent: THREE.Object3D, look: Look, x: number, z: number, ry: number, seat?: number): Figure {
  const root = group(parent, x, 0, z, ry);
  const skin = look.skin ?? SKIN;
  const shoes = '#2b2b30';
  const sat = seat !== undefined;
  const sh = seat ?? 0;
  const shoulderY = sat ? sh + 0.53 : 1.31;
  const torsoY = sat ? sh + 0.33 : 1.11;
  const legs: THREE.Group[] = [];
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
      const leg = group(root, sx * 0.087, 0.84, 0);
      rod(leg, v3(0, 0, 0), v3(0, -0.76, 0.01), 0.056, look.bottom);
      part(leg, rbox(0.09, 0.07, 0.2, 0.03), shoes, 0, -0.805, 0.04);
      legs.push(leg);
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
  if (look.hairdo === 'bob' || look.hairdo === 'long') {
    part(head, ball(0.122), look.hair, 0, 0.025, -0.03);
    const L = look.hairdo === 'long' ? 0.3 : 0.16;
    for (const sx of [-1, 1]) part(head, rbox(0.05, L, 0.14, 0.025), look.hair, sx * 0.1, -0.03 - (L - 0.16) / 2, -0.02);
    if (look.hairdo === 'long') part(head, rbox(0.2, 0.34, 0.05, 0.025), look.hair, 0, -0.12, -0.1);
    part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0, 0.08, 0.08, { rx: -0.2 });
  } else {
    part(head, ball(look.hairdo === 'grey' ? 0.116 : 0.118), look.hair, 0, 0.03, -0.03);
    part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0, 0.075, 0.075, { rx: -0.25 });
  }
  if (look.cap) {
    part(head, cyl(0.118, 0.122, 0.07, 14), look.cap, 0, 0.08, -0.01);
    part(head, rbox(0.17, 0.012, 0.09, 0.005), look.cap, 0, 0.05, 0.13, { outline: false });
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
      if (to) {
        loc.copy(to).sub(root.position).applyAxisAngle(UP, -root.rotation.y);
      } else loc.copy(rest);
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
  const stride = (a: number) => legs.forEach((l, i) => (l.rotation.x = (i ? 1 : -1) * a));
  return { root, head, armL, armR, stride, headTop: shoulderY + 0.33, last: root.position.clone(), walk: 0 };
}
/** A figure placed and posed from what the script says of it. */
function pose(f: Figure, name: string, N: AcNow, t: number) {
  const a = N.props[name];
  const y = N.n[`${name}B`] ?? 0;
  if (a) f.root.position.set(a[0], a[1], a[2]);
  f.root.position.y = (a ? a[1] : f.root.userData.y0 ?? 0) + y;
  const yaw = N.n[`${name}Y`];
  if (yaw !== undefined) f.root.rotation.y = yaw;
  f.head.rotation.set(N.n[`${name}N`] ?? 0, N.n[`${name}H`] ?? 0, 0, 'YXZ');
  const l = N.props[`${name}L`];
  const r = N.props[`${name}R`];
  f.armL(l ? V3(l) : null);
  f.armR(r ? V3(r) : null);
  // Feet going while they cross the floor.
  const moved = Math.hypot(f.root.position.x - f.last.x, f.root.position.z - f.last.z);
  f.walk = THREE.MathUtils.lerp(f.walk, moved > 0.002 ? 1 : 0, 0.2);
  f.stride(0.42 * f.walk * Math.sin(t * 11));
  f.last.copy(f.root.position);
}
/** A speech bubble over whoever's talking (`depthTest` off: it's words, not a thing in the room). */
function bubble(g: THREE.Object3D) {
  const mat = new THREE.SpriteMaterial({ color: '#ffffff', depthTest: false, transparent: true });
  const s = new THREE.Sprite(mat);
  s.userData.ownMaterial = true;
  s.raycast = () => {};
  s.renderOrder = 20;
  s.visible = false;
  g.add(s);
  let last = 0;
  return (id: number, at: THREE.Vector3 | null) => {
    s.visible = !!id && !!at;
    if (!id || !at) return;
    s.position.copy(at);
    if (id !== last) {
      last = id;
      const str = SAYS[id];
      const w = Math.min(512, 112 + str.length * 34);
      mat.map = painted(`acSay|${str}`, w, 104, (c) => {
        c.clearRect(0, 0, w, 104);
        c.fillStyle = '#ffffff';
        c.strokeStyle = '#263238';
        c.lineWidth = 5;
        c.beginPath();
        c.roundRect(4, 4, w - 8, 72, 28);
        c.fill();
        c.stroke();
        c.beginPath();
        c.moveTo(w / 2 - 14, 74);
        c.lineTo(w / 2, 100);
        c.lineTo(w / 2 + 14, 74);
        c.closePath();
        c.fill();
        c.stroke();
        c.fillStyle = '#ffffff';
        c.fillRect(w / 2 - 12, 70, 24, 7);
        text(c, str, w / 2, 40, Math.min(36, (w - 40) / (str.length * 0.95)), '#263238', 'center');
      });
      mat.needsUpdate = true;
      s.scale.set((w / 104) * 0.26, 0.26, 1);
    }
  };
}
function sayOver(say: ReturnType<typeof bubble>, N: AcNow | null, who: Record<number, Figure | undefined>, H = 1.6) {
  const id = N ? Math.round(N.n._say ?? 0) : 0;
  if (!N || !id) return say(0, null);
  const w = Math.round(N.n._who ?? 0);
  if (w === WHO.dweller) return say(id, tmp.set(N.st.x, N.st.y + (N.st.sit ? 0.56 * H : H) + 0.28, N.st.z));
  const f = who[w];
  if (!f) return say(id, null);
  return say(id, tmp.set(f.root.position.x, f.root.position.y + f.headTop + 0.22, f.root.position.z));
}
function canvasChair(g: THREE.Object3D, x: number, z: number, ry: number, seat: number, name: string, color = CANVAS) {
  const c = group(g, x, 0, z, ry);
  const W = 0.25;
  for (const sx of [-1, 1]) {
    rod(c, v3(sx * W, 0.02, 0.24), v3(-sx * W, seat - 0.04, -0.22), 0.014, WOODL);
    rod(c, v3(sx * W, 0.02, -0.24), v3(-sx * W, seat - 0.04, 0.22), 0.014, WOODL);
    part(c, box(0.04, 0.03, 0.54), WOODL, sx * W, 0.015, 0);
    part(c, box(0.04, 0.03, 0.46), WOODL, sx * W, seat + 0.2, 0);
    part(c, cyl(0.014, 0.014, 0.2, 8), WOODL, sx * W, seat + 0.1, 0.18, { outline: false });
    rod(c, v3(sx * W, seat - 0.02, -0.22), v3(sx * W, seat + 0.46, -0.22), 0.014, WOODL);
  }
  part(c, box(0.5, 0.02, 0.42), color, 0, seat - 0.01, 0);
  part(c, box(0.52, 0.2, 0.014), color, 0, seat + 0.36, -0.22);
  label(c, name, 0.34, 0.1, 0, seat + 0.36, -0.23, color, '#ffffff', Math.PI);
  label(c, name, 0.34, 0.1, 0, seat + 0.36, -0.21, color, '#ffffff');
  return c;
}

// =============================================================================================
// 촬영 세트 (filmSet).

const alleyTex = () => painted('acAlley', 768, 640, (c) => {
  c.fillStyle = '#a2755d';
  c.fillRect(0, 0, 768, 640);
  const s = seeded(17);
  for (let y = 0, r = 0; y < 640; y += 22, r++)
    for (let x = -30 + (r % 2) * 30; x < 768; x += 60) {
      const k = s();
      c.fillStyle = k < 0.25 ? '#8f634d' : k < 0.5 ? '#b08369' : k < 0.75 ? '#9c6c54' : '#a97c62';
      c.fillRect(x + 1, y + 1, 58, 20);
    }
  // Grime at the foot, a drain pipe, an electric meter, wires.
  const g = c.createLinearGradient(0, 480, 0, 640);
  g.addColorStop(0, 'rgba(40,30,25,0)');
  g.addColorStop(1, 'rgba(40,30,25,0.55)');
  c.fillStyle = g;
  c.fillRect(0, 480, 768, 160);
  c.fillStyle = '#6f7a80';
  c.fillRect(632, 0, 12, 640);
  c.fillStyle = '#d7d8d2';
  c.fillRect(510, 240, 60, 76);
  c.fillStyle = '#37474f';
  c.fillRect(520, 252, 40, 24);
  c.strokeStyle = '#1f1a17';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(540, 240);
  c.bezierCurveTo(560, 120, 700, 90, 768, 70);
  c.moveTo(540, 240);
  c.bezierCurveTo(500, 140, 420, 80, 420, 0);
  c.stroke();
  // Posters, torn.
  [['전단 모집', '#fff59d', 470, 350], ['방 있음', '#ffffff', 572, 380], ['은빛 극장', '#90caf9', 468, 430]].forEach(([s0, col, x, y]) => {
    c.fillStyle = col as string;
    c.fillRect(x as number, y as number, 92, 62);
    text(c, s0 as string, (x as number) + 46, (y as number) + 30, 17, '#37474f', 'center');
  });
});
const slateTex = frames('Slate', 192, 128, (c, i) => {
  c.fillStyle = '#1b1b1f';
  c.fillRect(0, 0, 192, 128);
  c.strokeStyle = '#ffffff';
  c.lineWidth = 2;
  c.strokeRect(5, 5, 182, 118);
  c.beginPath();
  c.moveTo(5, 52);
  c.lineTo(187, 52);
  c.moveTo(70, 52);
  c.lineTo(70, 123);
  c.moveTo(130, 52);
  c.lineTo(130, 123);
  c.stroke();
  text(c, '비 그치면', 96, 28, 24, '#ffffff', 'center');
  text(c, 'SCENE', 37, 68, 11, '#b0bec5', 'center');
  text(c, '37', 37, 96, 28, '#ffffff', 'center');
  text(c, 'SHOT', 100, 68, 11, '#b0bec5', 'center');
  text(c, '2A', 100, 96, 26, '#ffffff', 'center');
  text(c, 'TAKE', 158, 68, 11, '#b0bec5', 'center');
  text(c, String(i), 158, 96, 32, '#ffee58', 'center');
});
function clapper(g: THREE.Object3D) {
  const t = group(g);
  part(t, rbox(0.3, 0.2, 0.014, 0.004), '#1b1b1f', 0, 0, 0);
  const pic = swapPic(t, 0.28, 0.185, 0, 0, 0.008);
  pic.set(slateTex(1));
  const stick = group(t, -0.145, 0.105, 0);
  part(stick, box(0.3, 0.035, 0.014), '#fafafa', 0.15, 0.018, 0, { outline: false });
  for (let i = 0; i < 5; i++) part(stick, box(0.03, 0.036, 0.015), '#1b1b1f', 0.03 + i * 0.058, 0.018, 0.0005, { outline: false, rz: 0.5 });
  t.visible = false;
  return { t, pic, stick };
}
function bananaProp(g: THREE.Object3D) {
  const t = group(g);
  for (let i = 0; i < 4; i++) part(t, cyl(0.018, 0.018, 0.05, 8), '#ffd54f', 0.022 * Math.sin((i - 1.5) * 0.5) * 2, -0.06 + i * 0.044, 0, { outline: false, rz: -(i - 1.5) * 0.3 });
  part(t, cyl(0.007, 0.01, 0.022, 6), '#6d4c41', 0.03, 0.12, 0, { outline: false, rz: -0.5 });
  const peeled = group(t);
  part(peeled, cyl(0.014, 0.017, 0.07, 8), '#fff8e1', 0.02, 0.08, 0, { outline: false, rz: -0.3 });
  for (const a of [0, 2.1, 4.2]) {
    const flap = group(peeled, 0.012, 0.05, 0, a);
    part(flap, box(0.02, 0.09, 0.004), '#ffd54f', 0.024, -0.03, 0, { outline: false, rz: 0.9 });
  }
  peeled.visible = false;
  return { t, peeled };
}
function umbrellaProp(g: THREE.Object3D) {
  const t = group(g);
  part(t, cyl(0.009, 0.009, 0.84, 8), '#eceff1', 0, 0.38, 0, { outline: false });
  part(t, cyl(0.012, 0.012, 0.09, 8), '#37474f', 0, -0.03, 0, { outline: false });
  const hood = group(t, 0, 0.78, 0);
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.2, 10, 1, true), VINYL);
  canopy.userData.ownGeometry = true;
  canopy.position.y = 0.0;
  hood.add(canopy);
  return { t, hood };
}
function filmSet(g: THREE.Group, out: Built) {
  // The floor of the set, painted as an old alley's asphalt.
  flat(g, painted('acAsphalt', 384, 256, (c) => {
    c.fillStyle = '#5b5f62';
    c.fillRect(0, 0, 384, 256);
    const s = seeded(23);
    for (let k = 0; k < 500; k++) {
      c.fillStyle = s() > 0.5 ? '#54585c' : '#646a6e';
      c.fillRect(s() * 384, s() * 256, 3, 2);
    }
    c.strokeStyle = '#42474a';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, 182);
    c.lineTo(160, 170);
    c.lineTo(190, 216);
    c.lineTo(384, 200);
    c.stroke();
  }), 3, 2, 0, 0.006, 0);
  // The tape on the floor: A, B, C.
  const tMark = (p: V, col: string, name: string) => {
    part(g, box(0.28, 0.004, 0.035), col, p[0], 0.012, p[2] + 0.08, { outline: false });
    part(g, box(0.035, 0.004, 0.2), col, p[0], 0.012, p[2] - 0.01, { outline: false });
    label(g, name, 0.1, 0.06, p[0] + 0.2, 0.014, p[2] + 0.08, col, '#1b1b1f').rotation.x = -Math.PI / 2;
  };
  tMark(SET.A, '#ef5350', 'A');
  tMark(SET.B, TAPE, 'B');
  tMark(SET.C, '#42a5f5', 'C');
  // The back flat: painted brick on a timber frame; the café built out from it.
  picture(g, alleyTex(), 3, 2.5, 0, 1.25, -0.9);
  part(g, box(3.02, 2.52, 0.04), '#7a6048', 0, 1.25, -0.93);
  for (const x of [-1.45, 1.45]) part(g, box(0.05, 2.5, 0.05), WOODL, x, 1.25, -0.9);
  part(g, box(3, 0.05, 0.05), WOODL, 0, 2.5, -0.9);
  // A short return wall on the right, plaster over bricks, its raw edge showing.
  part(g, box(0.05, 2.1, 0.9), '#b9a68f', 1.47, 1.05, -0.47);
  part(g, box(0.055, 0.4, 0.9), '#6e7b7f', 1.47, 0.2, -0.47);
  part(g, box(0.06, 2.1, 0.03), WOODL, 1.47, 1.05, -0.01);
  // The café: door, window, awning, sign.
  const shopX = -0.82;
  part(g, rbox(1.22, 1.9, 0.09, 0.01), '#4a3a30', shopX, 1.0, -0.86);
  const glow = ownLit(g, box(0.64, 0.82, 0.01), '#e0b06a', shopX - 0.24, 1.2, -0.81);
  for (const dx of [-0.21, 0, 0.21]) part(g, box(0.018, 0.84, 0.014), '#3b2b22', shopX - 0.24 + dx, 1.2, -0.8, { outline: false });
  part(g, box(0.66, 0.018, 0.014), '#3b2b22', shopX - 0.24, 1.2, -0.8, { outline: false });
  part(g, box(0.66, 0.02, 0.05), '#6d5140', shopX - 0.24, 0.76, -0.8);
  label(g, '커피 · 쌍화차', 0.5, 0.09, shopX - 0.24, 1.48, -0.798, '#e0b06a', '#4a2c1a');
  part(g, rbox(0.42, 1.68, 0.03, 0.01), '#7b5a43', shopX + 0.36, 0.86, -0.8);
  ownLit(g, box(0.28, 0.5, 0.006), '#c9985a', shopX + 0.36, 1.26, -0.782);
  part(g, cyl(0.02, 0.02, 0.05, 8), '#d4af37', shopX + 0.2, 0.92, -0.77, { rx: Math.PI / 2, outline: false });
  label(g, '솔내 다방', 0.92, 0.2, shopX, 2.13, -0.82, '#7b1f1f', '#ffe082');
  for (let i = 0; i < 6; i++) part(g, box(0.2, 0.012, 0.28), i % 2 ? '#fafafa' : '#b71c1c', shopX - 0.5 + i * 0.2, 1.84, -0.7, { rx: 0.5, outline: false });
  // The street lamp.
  const lx = -1.26;
  part(g, cyl(0.035, 0.045, 2.24, 10), '#3c4a50', lx, 1.12, -0.5);
  part(g, cyl(0.08, 0.1, 0.1, 10), '#2d3a40', lx, 0.05, -0.5);
  rod(g, v3(lx, 2.2, -0.5), v3(lx + 0.3, 2.26, -0.5), 0.016, '#3c4a50');
  part(g, cyl(0.03, 0.12, 0.08, 12), '#3c4a50', lx + 0.3, 2.22, -0.5);
  const bulb = ownLit(g, ball(0.05), '#6f6a58', lx + 0.3, 2.17, -0.5);
  // A bench, a red mailbox, a bin, crates, a bicycle wheel's worth of clutter.
  const bz = -0.46;
  part(g, rbox(1.05, 0.05, 0.36, 0.01), '#7c8b6a', 0.72, 0.42, bz);
  part(g, rbox(1.05, 0.32, 0.04, 0.01), '#7c8b6a', 0.72, 0.68, bz - 0.2, { rx: -0.1 });
  for (const sx of [-1, 1]) part(g, box(0.05, 0.42, 0.34), '#3c4a50', 0.72 + sx * 0.47, 0.21, bz);
  part(g, rbox(0.3, 0.72, 0.26, 0.04), '#c62828', 1.28, 0.36 + 0.02, -0.74);
  part(g, box(0.22, 0.03, 0.02), BLACK, 1.28, 0.62, -0.6, { outline: false });
  part(g, rbox(0.34, 0.04, 0.3, 0.02), '#a31f1f', 1.28, 0.76, -0.74);
  part(g, cyl(0.15, 0.13, 0.42, 12), '#546e7a', 0.08, 0.21, -0.74);
  part(g, cyl(0.16, 0.16, 0.02, 12), '#455a64', 0.08, 0.43, -0.74);
  part(g, rbox(0.3, 0.2, 0.26, 0.01), '#8d6e4d', -0.38, 0.1, -0.74);
  for (let i = 0; i < 3; i++) part(g, box(0.31, 0.012, 0.27), '#6e5238', -0.38, 0.06 + i * 0.05, -0.74, { outline: false });
  // On the bench: what the adlib finds.
  part(g, rbox(0.14, 0.09, 0.11, 0.01), '#d7c9a7', SET.banana[0] + 0.06, 0.49, SET.banana[2] - 0.02);
  const banana = bananaProp(g);
  // Apple boxes with the cast's scripts on them, a coil of hose, a sandbag.
  part(g, rbox(0.4, 0.14, 0.26, 0.008), '#c79a63', SET.box[0], 0.07, SET.box[2]);
  part(g, rbox(0.34, 0.14, 0.22, 0.008), '#b78a55', SET.box[0] + 0.02, 0.21, SET.box[2]);
  const homeScript = rbox(0.2, 0.03, 0.27, 0.004);
  const scriptHome = part(g, homeScript, '#f6f1e2', SET.box[0], SET.box[1] - 0.03, SET.box[2]);
  const script = scriptProp(g, scriptPage);
  script.page.set(scriptPage(2));
  const pen = pencil(g);
  // The rain bar: two stands, the pipe with its roses, the feed hose.
  const barY = 2.36;
  for (const x of [-1.42, 1.42]) {
    part(g, cyl(0.016, 0.016, barY, 8), '#5a6470', x, barY / 2, 0.36, { outline: false });
    for (const a of [0.4, 2.5, 4.6]) rod(g, v3(x, 0.32, 0.36), v3(x + 0.2 * Math.sin(a), 0.02, 0.36 + 0.2 * Math.cos(a)), 0.012, '#5a6470');
  }
  part(g, cyl(0.022, 0.022, 2.86, 8), '#7b8691', 0, barY, 0.36, { rz: Math.PI / 2 });
  for (let i = 0; i < 7; i++) part(g, cyl(0.03, 0.012, 0.03, 8), '#90a4ae', -1.2 + i * 0.4, barY - 0.03, 0.36, { outline: false });
  label(g, '강우 라인', 0.32, 0.07, 1.1, barY + 0.08, 0.36, '#1565c0', '#ffffff');
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    part(g, cyl(0.02, 0.02, 0.2, 8), '#263238', 1.44 + 0.04 * Math.sin(i * 2.1), 0.02 + t * 0.03, 0.42 + t * 0.48, { rx: Math.PI / 2, outline: false });
  }
  // The rain itself and the wet it leaves.
  const rain = group(g);
  rain.visible = false;
  const drops: THREE.Mesh[] = [];
  const dr = seeded(5);
  for (let i = 0; i < 34; i++) {
    const m = part(rain, cyl(0.004, 0.004, 0.22, 4), '#bcdcf2', -1.28 + dr() * 2.56, 1, -0.28 + dr() * 1.3, { outline: false, material: RAIN });
    drops.push(m);
  }
  const puddles: THREE.Mesh[] = [[-0.3, 0.45, 0.46], [0.5, 0.18, 0.38], [-0.9, 0.8, 0.3]].map(([x, z, r]) => {
    const m = part(g, cyl(r, r, 0.004, 18), '#50616c', x, 0.016, z, { outline: false, material: WET });
    m.scale.set(1, 1, 0.65);
    m.visible = false;
    return m;
  });
  // Who's on set.
  const crew = scene(g, out);
  canvasChair(crew, SET.dir[0], SET.dir[2], 2.1, 0.5, '감독', '#212121');
  const dirSit = person(crew, LOOKS.director, SET.dir[0], SET.dir[2], 2.1, 0.5);
  dirSit.root.userData.y0 = 0;
  const dirUp = person(crew, LOOKS.director, SET.dir[0], SET.dir[2], 2.1);
  dirUp.root.visible = false;
  // A small monitor on a stand by the director's knee.
  part(crew, cyl(0.012, 0.012, 1.0, 8), BLACK, SET.dir[0] + 0.48, 0.5, SET.dir[2] + 0.06, { outline: false });
  part(crew, rbox(0.3, 0.2, 0.03, 0.008), BLACK, SET.dir[0] + 0.48, 1.08, SET.dir[2] + 0.06, { ry: -1.0 });
  ownLit(crew, box(0.26, 0.16, 0.004), '#9fb6c9', SET.dir[0] + 0.5, 1.08, SET.dir[2] + 0.04).rotation.y = -1.0;
  const mate = person(crew, LOOKS.partner, SET.C[0], SET.C[2], -Math.PI / 2);
  const mateScript = scriptProp(crew, scriptPage);
  const boom = person(crew, LOOKS.boom, SET.boom[0], SET.boom[2], -1.6);
  const ad = person(crew, LOOKS.ad, SET.ad[0], SET.ad[2], 1.7);
  // The boom.
  const pole = limb(crew, 0.012, '#9aa3ab');
  const blimp = group(crew);
  part(blimp, rbox(0.1, 0.1, 0.34, 0.05), '#616161', 0, 0, 0, { rx: 0 });
  part(blimp, cyl(0.012, 0.012, 0.1, 6), BLACK, 0, 0.06, 0, { outline: false });
  const slate = clapper(crew);
  const umbrella = umbrellaProp(g);
  const towel = part(crew, rbox(0.34, 0.1, 0.28, 0.04), '#f5f5f5', 0, 0, 0, { outline: false });
  towel.visible = false;
  const say = bubble(g);
  const spots: Record<string, Spot> = { rehearseScene: standAt(g, 'acRehearse', 1.2), filmScene: standAt(g, 'acFilm', 1.2), actor_adlibScene: standAt(g, 'acAdlib', 1.2) };
  spots['*'] = spots.rehearseScene;
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const lit = (n.lit ?? 0) > 0.5;
    setLit(glow, lit ? '#ffcf87' : '#b58d58');
    setLit(bulb, lit ? '#fff2c0' : '#6f6a58');
    // The rain, falling.
    const r = n.rain ?? 0;
    rain.visible = r > 0.2;
    if (rain.visible) drops.forEach((m, i) => (m.position.y = barY - 0.1 - frac(t * 2.1 + i * 0.37) * (barY - 0.2)));
    puddles.forEach((m) => (m.visible = r > 0.5));
    // The script off its box.
    const sp = P.script ?? null;
    script.t.visible = !!sp;
    scriptHome.visible = !sp;
    if (sp && N) {
      place(script.t, sp);
      script.t.rotation.set(-0.55, N.st.yaw + Math.PI, 0, 'YXZ');
    }
    pen.visible = !!P.pencil;
    if (P.pencil) place(pen, P.pencil);
    // The banana.
    const bp = P.banana ?? (now === 'actor_adlibScene' ? null : SET.banana);
    banana.t.visible = !!bp;
    if (bp) {
      place(banana.t, bp);
      banana.t.rotation.set(0, 0, P.banana && bp !== SET.banana ? 0.9 : Math.PI / 2);
    }
    banana.peeled.visible = (n.peel ?? 0) > 0.3;
    // The umbrella.
    const up = P.umb ?? null;
    umbrella.t.visible = !!up;
    if (up) {
      place(umbrella.t, up);
      const fall = n.umbFall ?? 0;
      umbrella.t.rotation.set(0.08 + (Math.PI / 2 - 0.1) * fall, 0.3, 0.06);
      const o = n.umbOpen ?? 1;
      umbrella.hood.scale.set(0.25 + 0.75 * o, 0.7 + 0.3 * o, 0.25 + 0.75 * o);
    }
    towel.visible = !!P.towel;
    if (P.towel) place(towel, P.towel);
    if (!N) return say(0, null);
    // The people, and the director either sat or up.
    const standing = (n.dirUp ?? 0) > 0.5;
    dirSit.root.visible = !standing;
    dirUp.root.visible = standing;
    if (standing) pose(dirUp, 'dir', N, t);
    else {
      const stripped: AcNow = { ...N, props: { ...N.props, dir: null } };
      pose(dirSit, 'dir', stripped, t);
    }
    pose(mate, 'mate', N, t);
    pose(boom, 'boom', N, t);
    pose(ad, 'ad', N, t);
    mateScript.t.visible = !!P.mateScript;
    if (P.mateScript) {
      place(mateScript.t, P.mateScript);
      mateScript.t.rotation.set(-0.5, -Math.PI / 2, 0, 'YXZ');
    }
    // The boom's pole from the operator's hip to the blimp, only while shooting.
    const mic = P.mic ?? null;
    if (mic) {
      const butt = v3(SET.boom[0] + 0.15, 1.42, SET.boom[2] + 0.05);
      pole(butt, V3(mic));
      place(blimp, mic);
      blimp.rotation.y = 1.2;
      blimp.visible = true;
    } else {
      pole(v3(2.2, 0.02, 0.8), v3(2.25, 1.9, 0.85));
      blimp.visible = false;
    }
    // The slate; the sticks come down on the clap.
    const sl = P.slate ?? null;
    slate.t.visible = !!sl;
    if (sl) {
      place(slate.t, sl);
      slate.pic.set(slateTex(Math.max(1, Math.round(n._take ?? 1))));
      slate.stick.rotation.z = (n.clap ?? 0) * 0.5;
    }
    sayOver(say, N, { [WHO.a]: standing ? dirUp : dirSit, [WHO.b]: mate }, 1.6);
  });
  out.work = marker(g, 0, 1.0, 0.3);
}
const frac = (x: number) => ((x % 1) + 1) % 1;

// =============================================================================================
// 액션 매트 (stuntMat).

function stuntMat(g: THREE.Group, out: Built) {
  // The gym mat with its seams and the taped lane.
  part(g, rbox(1.98, 0.04, 0.98, 0.01), '#1565c0', 0, 0.02, 0);
  for (const x of [-0.5, 0, 0.5]) part(g, box(0.008, 0.002, 0.97), '#0d47a1', x, 0.041, 0, { outline: false });
  part(g, box(1.94, 0.002, 0.03), TAPE, 0, 0.042, 0.42, { outline: false });
  // The jump box: stencilled, taped corners.
  part(g, rbox(0.52, ST.box, 0.56, 0.015), '#37474f', ST.boxX, ST.box / 2, 0);
  for (const sx of [-1, 1]) part(g, box(0.02, ST.box, 0.57), TAPE, ST.boxX + sx * 0.25, ST.box / 2, 0, { outline: false });
  label(g, '착지 전 확인', 0.34, 0.08, ST.boxX, 0.22, 0.285, '#37474f', '#ffee58');
  // The crash pad: fat, stitched, soft-cornered.
  part(g, rbox(1.04, ST.pad, 0.92, 0.07), '#fb8c00', ST.padX, ST.pad / 2 + 0.03, 0);
  part(g, rbox(0.98, 0.012, 0.86, 0.006), '#ef6c00', ST.padX, ST.pad + 0.032, 0, { outline: false });
  for (const sz of [-0.28, 0, 0.28]) part(g, box(0.98, 0.003, 0.012), '#e65100', ST.padX, ST.pad + 0.04, sz, { outline: false });
  label(g, '크래시 패드', 0.5, 0.09, ST.padX, 0.2, 0.465, '#fb8c00', '#ffffff');
  // The rig: two posts, a beam, a pulley, the rope tied off.
  for (const x of [-1, 1]) {
    part(g, box(0.07, 2.56, 0.07), '#546e7a', x * 0.96, 1.28, -0.46);
    part(g, box(0.34, 0.03, 0.26), '#37474f', x * 0.96, 0.02, -0.38);
  }
  part(g, box(1.99, 0.09, 0.09), '#546e7a', 0, 2.54, -0.46);
  for (let i = 0; i < 9; i++) part(g, box(0.012, 0.09, 0.012), '#37474f', -0.88 + i * 0.22, 2.54, -0.4, { outline: false, rz: i % 2 ? 0.6 : -0.6 });
  part(g, box(0.05, 0.05, 0.5), '#546e7a', ST.pulley[0], ST.pulley[1] + 0.05, -0.22);
  part(g, cyl(0.05, 0.05, 0.02, 14), '#90a4ae', ST.pulley[0], ST.pulley[1], ST.pulley[2], { rz: Math.PI / 2, outline: false });
  part(g, box(0.05, 0.05, 0.5), '#546e7a', ST.rope[0], ST.rope[1] + 0.05, -0.22);
  part(g, cyl(0.04, 0.04, 0.02, 14), '#90a4ae', ST.rope[0], ST.rope[1], ST.rope[2], { rz: Math.PI / 2, outline: false });
  const wireA = limb(g, 0.006, '#263238');
  const wireB = limb(g, 0.006, '#263238');
  const wireC = limb(g, 0.008, '#efebe9');
  const hookIdle = v3(-0.9, 1.04, -0.42);
  // On the post: the harness when it's hung up, a helmet, pads.
  const hung = part(g, cyl(0.17, 0.17, 0.05, 14), '#c62828', -0.82, 1.0, -0.38, { rx: 0.2 });
  part(g, ball(0.12), '#fafafa', 0.84, 1.08, -0.36);
  part(g, rbox(0.14, 0.08, 0.05, 0.01), '#fafafa', 0.84, 1.0, -0.26);
  for (let i = 0; i < 3; i++) part(g, rbox(0.16, 0.14, 0.05, 0.02), '#263238', 0.9, 0.12 + i * 0.1, -0.32 + (i % 2) * 0.03);
  // A sandbag at each post, a sign on the beam.
  for (const x of [-0.72, 0.68]) part(g, rbox(0.24, 0.1, 0.14, 0.04), '#8d6e4d', x, 0.09, -0.4, { ry: 0.3 });
  label(g, '액션 팀 · 안전 제일', 0.9, 0.1, 0, 2.66, -0.42, '#212121', '#ffee58');
  // The belt on the dweller, and the coordinator.
  const belt = group(g);
  const beltMesh = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.028, 8, 20), new THREE.MeshToonMaterial({ color: '#c62828' }));
  beltMesh.userData.ownGeometry = beltMesh.userData.ownMaterial = true;
  beltMesh.rotation.x = Math.PI / 2;
  belt.add(beltMesh);
  part(belt, box(0.05, 0.05, 0.02), CHROME, 0, 0, 0.175, { outline: false });
  belt.visible = false;
  const crew = scene(g, out);
  const coach = person(crew, LOOKS.coach, ST.coach[0], ST.coach[2], Math.PI);
  part(coach.root, box(0.2, 0.03, 0.01), TAPE, 0, 1.25, 0.106, { outline: false });
  const say = bubble(g);
  const spots: Record<string, Spot> = { practiceStunt: standAt(g, 'acStunt', 0.6) };
  spots['*'] = spots.practiceStunt;
  drive(g, out, spots, (_now, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const bp = P.belt ?? null;
    belt.visible = !!bp;
    hung.visible = !bp;
    if (bp && N) {
      place(belt, bp);
      belt.rotation.y = N.st.yaw;
    }
    // The wire: down from the pulley to the belt when clipped, else tied off on the post.
    if (P.line) {
      wireA(V3(ST.pulley), V3(P.line));
      wireB(V3(ST.pulley), V3(ST.rope));
      wireC(V3(ST.rope), V3(P.hand ?? [0.96, 1.3, 0.2]));
    } else {
      wireA(V3(ST.pulley), v3(-0.3, 1.8, -0.3));
      wireB(V3(ST.pulley), V3(ST.rope));
      wireC(V3(ST.rope), hookIdle.clone().setX(0.92));
    }
    void n;
    if (!N) return say(0, null);
    pose(coach, 'coach', N, t);
    sayOver(say, N, { [WHO.a]: coach }, 1.6);
  });
  out.work = marker(g, 0, 0.6, 0.3);
}

// =============================================================================================
// 대본 테이블 (scriptTable).

const chartTex = frames('Twister', 256, 192, (c, i) => {
  c.fillStyle = '#fffef5';
  c.fillRect(0, 0, 256, 192);
  text(c, '오늘의 발음 연습', 128, 18, 18, '#b71c1c', 'center');
  ['간장 공장 공장장은', '강 공장장이고', '된장 공장 공장장은', '공 공장장이다'].forEach((s, k) => {
    if (k < i) {
      c.fillStyle = '#ffee58';
      c.fillRect(14, 40 + k * 36, 228, 28);
    }
    text(c, s, 128, 55 + k * 36, 20, '#212121', 'center');
  });
});
function scriptTable(g: THREE.Group, out: Built) {
  const T = TB.top;
  // A long trestle table in dark wood, a runner down its middle.
  part(g, rbox(1.96, 0.04, 0.68, 0.012), '#7a5a43', 0, T - 0.02, -0.1);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) part(g, box(0.06, T - 0.04, 0.06), '#5d4037', sx * 0.88, (T - 0.04) / 2, -0.1 + sz * 0.27);
    part(g, box(0.05, 0.05, 0.56), '#5d4037', sx * 0.88, 0.3, -0.1);
  }
  part(g, box(1.72, 0.05, 0.05), '#5d4037', 0, 0.3, -0.1);
  // The stack, tabbed, and names on the table.
  const stack = [0, 1, 2, 3, 4].map((i) => part(g, rbox(0.21, 0.018, 0.29, 0.003), i % 2 ? '#f6f1e2' : '#ece6d4', TB.stack[0] + (i % 3) * 0.004, T + 0.01 + i * 0.018, TB.stack[2], { ry: 0.05 * (i - 2) }));
  for (let i = 0; i < 4; i++) part(g, box(0.012, 0.006, 0.03), ['#ef5350', '#42a5f5', '#66bb6a', '#ffca28'][i], TB.stack[0] + 0.11, T + 0.05, TB.stack[2] - 0.1 + i * 0.05, { outline: false });
  label(g, '비 그치면 · 대본 3차', 0.36, 0.06, 0.66, T + 0.002, -0.33, '#7b1f1f', '#ffe082').rotation.x = -Math.PI / 2;
  // The pen cup with highlighters and pencils; the water; tissues.
  part(g, cyl(0.04, 0.035, 0.09, 12), '#37474f', TB.pen[0], T + 0.045, TB.pen[2] - 0.08);
  for (let i = 0; i < 4; i++) part(g, cyl(0.006, 0.006, 0.13, 6), ['#ffee58', '#f06292', '#4fc3f7', '#ffb74d'][i], TB.pen[0] + 0.015 * Math.cos(i * 1.6), T + 0.13, TB.pen[2] - 0.08 + 0.015 * Math.sin(i * 1.6), { outline: false, rz: 0.1 * (i - 1.5) });
  const penHome = part(g, cyl(0.011, 0.011, 0.12, 8), '#ffee58', TB.pen[0], T + 0.014, TB.pen[2], { rz: Math.PI / 2, outline: false });
  const bottle = (x: number, z: number) => {
    part(g, cyl(0.03, 0.032, 0.17, 10), '#b3e5fc', x, T + 0.085, z, { material: new THREE.MeshToonMaterial({ color: '#b3e5fc', transparent: true, opacity: 0.6 }) });
    part(g, cyl(0.015, 0.015, 0.02, 8), '#1565c0', x, T + 0.18, z, { outline: false });
  };
  bottle(-0.6, -0.25);
  bottle(0.28, -0.3);
  part(g, rbox(0.14, 0.07, 0.1, 0.01), '#fafafa', -0.78, T + 0.035, -0.3);
  part(g, box(0.05, 0.03, 0.03), '#fafafa', -0.78, T + 0.085, -0.3, { outline: false });
  // The chair.
  const S = TB.seat;
  const chair = group(g, S.x, 0, S.z, Math.PI);
  part(chair, rbox(0.42, 0.05, 0.4, 0.015), '#8d6e63', 0, 0.445, 0);
  part(chair, rbox(0.4, 0.3, 0.04, 0.02), '#8d6e63', 0, 0.75, -0.19, { rx: -0.08 });
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) part(chair, cyl(0.016, 0.014, 0.44, 6), '#5d4037', sx * 0.17, 0.22, sz * 0.16, { outline: false });
  // The open script on the table.
  const open = group(g, TB.page[0], TB.page[1], TB.page[2]);
  part(open, box(0.4, 0.008, 0.28), '#f6f1e2', 0, -0.004, 0, { outline: false });
  const left = swapPic(open, 0.19, 0.26, -0.1, 0.002, 0, 0, -Math.PI / 2);
  const right = swapPic(open, 0.19, 0.26, 0.1, 0.002, 0, 0, -Math.PI / 2);
  left.set(scriptPage(0));
  right.set(scriptPage(10));
  const flip = group(open, 0, 0.006, 0);
  const leaf = swapPic(flip, 0.19, 0.26, 0.1, 0, 0, 0, -Math.PI / 2);
  leaf.set(scriptPage(0));
  flip.visible = false;
  open.visible = false;
  const tab = part(g, box(0.02, 0.003, 0.05), '#ef5350', TB.page[0] + 0.2, TB.page[1] + 0.008, TB.page[2] - 0.06, { outline: false });
  tab.visible = false;
  const glass = group(g);
  part(glass, cyl(0.03, 0.026, 0.1, 10), '#b3e5fc', 0, 0, 0, { material: new THREE.MeshToonMaterial({ color: '#b3e5fc', transparent: true, opacity: 0.55 }) });
  const pen = highlighter(g);
  pen.visible = false;
  const crew = scene(g, out);
  // The voice coach's flip chart behind the table.
  const easel = group(crew);
  for (const sx of [-1, 1]) rod(easel, v3(sx * 0.42, 0, TB.chart[2]), v3(sx * 0.3, 1.72, TB.chart[2]), 0.016, WOODL);
  part(easel, box(0.82, 0.62, 0.02), '#eceff1', TB.chart[0], TB.chart[1], TB.chart[2] - 0.01);
  const chartPic = swapPic(easel, 0.76, 0.56, TB.chart[0], TB.chart[1], TB.chart[2] + 0.002);
  // The cast and the writer round the table.
  const stoolAt = (x: number, z: number) => {
    const s = group(crew, x, 0, z);
    part(s, cyl(0.17, 0.17, 0.05, 14), '#8d6e63', 0, 0.445, 0);
    for (const a of [0.7, 2.8, 4.9]) rod(s, v3(0.1 * Math.sin(a), 0.42, 0.1 * Math.cos(a)), v3(0.16 * Math.sin(a), 0, 0.16 * Math.cos(a)), 0.012, '#5d4037');
    return s;
  };
  const castGroup = group(crew);
  for (const [x, z] of [[-0.55, -0.74], [0.55, -0.74], [-1.3, -0.08]]) castGroup.add(stoolAt(x, z));
  const her = person(castGroup, LOOKS.actress, -0.55, -0.74, 0, 0.47);
  const him = person(castGroup, LOOKS.partner, 0.55, -0.74, 0, 0.47);
  const director = person(castGroup, LOOKS.writer, -1.3, -0.08, Math.PI / 2, 0.47);
  for (const [x, z, ry] of [[-0.55, -0.26, 0], [0.55, -0.26, 0], [-0.84, -0.08, Math.PI / 2]] as const) {
    const p = swapPic(castGroup, 0.24, 0.3, x, T + 0.004, z, ry, -Math.PI / 2);
    p.set(scriptPage(0));
    part(castGroup, cyl(0.03, 0.026, 0.1, 10), '#fafafa', x + 0.2, T + 0.05, z + 0.05, { outline: false });
  }
  const coach = person(crew, LOOKS.voice, 1.25, 0.72, -Math.PI / 2);
  const junior = person(crew, LOOKS.junior, -0.5, 0.82, 0.8);
  const junScript = scriptProp(crew, scriptPage);
  const say = bubble(g);
  const spots: Record<string, Spot> = { readScript: standAt(g, 'acRead'), actor_actingClass: standAt(g, 'acVoice'), actor_castReading: standAt(g, 'acCoach'), acTableRead: standAt(g, 'acTableRead') };
  spots['*'] = spots.readScript;
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const reading = now === 'readScript' || now === 'acTableRead';
    open.visible = reading;
    stack.forEach((m, i) => (m.visible = !reading || i < 4));
    const pg = Math.round(n._page ?? 0);
    const lines = Math.round(n._lines ?? 0);
    if (reading) {
      left.set(scriptPage(pg * 10 + Math.min(4, lines)));
      right.set(scriptPage(((pg + 1) % 3) * 10));
      const f = n.flip ?? 0;
      flip.visible = f > 0.02;
      flip.rotation.z = Math.PI * f;
    }
    tab.visible = (n.tabbed ?? 0) > 0.5;
    place(glass, P.glass ?? TB.glass);
    glass.visible = reading || now === null;
    pen.visible = !!P.pen;
    if (P.pen) place(pen, P.pen);
    penHome.visible = !P.pen;
    // Stood up to the table the chair's pushed along out of the way.
    const up = now === 'actor_actingClass' || now === 'actor_castReading';
    chair.position.x = up ? 0.75 : S.x;
    chair.rotation.y = up ? Math.PI - 0.4 : Math.PI;
    easel.visible = now === 'actor_actingClass';
    if (now === 'actor_actingClass') chartPic.set(chartTex(Math.round(n._chart ?? 0)));
    castGroup.visible = now === 'acTableRead';
    coach.root.visible = now === 'actor_actingClass';
    junior.root.visible = now === 'actor_castReading';
    if (!N) return say(0, null);
    const who: Record<number, Figure | undefined> = {};
    if (now === 'acTableRead') {
      pose(her, 'her', N, t);
      pose(him, 'him', N, t);
      pose(director, 'director', N, t);
      who[WHO.a] = her;
      who[WHO.b] = him;
      who[WHO.c] = director;
    } else if (now === 'actor_actingClass') {
      pose(coach, 'coach', N, t);
      who[WHO.a] = coach;
    } else if (now === 'actor_castReading') {
      pose(junior, 'junior', N, t);
      who[WHO.a] = junior;
      junScript.t.visible = !!P.junScript;
      if (P.junScript) {
        place(junScript.t, P.junScript);
        junScript.t.rotation.set(-0.6, 0.8, 0, 'YXZ');
        junScript.page.set(scriptPage(10 + Math.round(n._note ?? 0)));
      }
    }
    sayOver(say, N, who, 1.6);
  });
  out.work = marker(g, TB.page[0], TB.page[1], TB.page[2]);
}

// =============================================================================================
// 비디오 빌리지 (acVillage).

const takeTex = frames('Take', 256, 160, (c, i) => {
  // i: which picture * 10 + the frame.
  const which = Math.floor(i / 10);
  const f = i % 10;
  if (which === 0) {
    ['#fafafa', '#fdd835', '#26c6da', '#66bb6a', '#ec407a', '#e53935', '#3949ab'].forEach((col, k) => {
      c.fillStyle = col;
      c.fillRect((k * 256) / 7, 0, 256 / 7 + 1, 120);
    });
    c.fillStyle = '#1b1b1f';
    c.fillRect(0, 120, 256, 40);
    text(c, '대기 중', 128, 140, 18, '#ffffff', 'center');
    return;
  }
  // The alley, in the rain, seen through the lens.
  const wide = which === 5;
  c.fillStyle = '#382f2c';
  c.fillRect(0, 0, 256, 160);
  c.fillStyle = '#5c3d31';
  for (let y = 4; y < 118; y += 8) for (let x = (y % 16 ? 0 : 8); x < 256; x += 16) c.fillRect(x, y, 15, 7);
  c.fillStyle = '#c78e4a';
  c.fillRect(wide ? 18 : 2, 30, wide ? 54 : 74, 58);
  c.fillStyle = '#3c3f42';
  c.fillRect(0, 118, 256, 42);
  const sc = wide ? 1 : 1.45;
  const fig0 = (x: number, col: string) => {
    c.fillStyle = col;
    c.fillRect(x - 7 * sc, 150 - 72 * sc, 14 * sc, 50 * sc);
    c.fillStyle = '#2a2a33';
    c.fillRect(x - 7 * sc, 150 - 24 * sc, 14 * sc, 24 * sc);
    c.fillStyle = '#e9c3a1';
    c.beginPath();
    c.arc(x, 150 - 82 * sc, 9 * sc, 0, Math.PI * 2);
    c.fill();
  };
  const k = f / 9;
  fig0(58 + (wide ? 52 : 74) * k, which === 2 ? '#b0bec5' : '#90a4ae');
  fig0(wide ? 170 : 212, '#546e7a');
  c.strokeStyle = 'rgba(190,220,240,0.55)';
  c.lineWidth = 1;
  const s = seeded(9 + f);
  for (let j = 0; j < 40; j++) {
    const x = s() * 256;
    const y = s() * 150;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x - 2, y + 12);
    c.stroke();
  }
  // The boom's edge in the top of take 2: the reason it was cut.
  if (which === 4) {
    c.fillStyle = '#616161';
    c.fillRect(100, 0, 46, 14);
  }
  c.fillStyle = 'rgba(0,0,0,0.65)';
  c.fillRect(0, 0, 256, 18);
  text(c, which === 4 || which === 2 ? 'S#37 T2' : 'S#37 T3', 6, 9, 12, '#ffffff');
  c.fillStyle = '#ef5350';
  c.fillRect(0, 154, 256 * k, 6);
  if (which === 3) {
    c.strokeStyle = '#66bb6a';
    c.lineWidth = 6;
    c.beginPath();
    c.arc(128, 80, 40, 0, Math.PI * 2);
    c.stroke();
    text(c, 'OK', 128, 80, 34, '#66bb6a', 'center');
  }
});
function villageMon(g: THREE.Object3D, p: V, ry: number) {
  const m = group(g, p[0], p[1], p[2], ry);
  part(m, rbox(0.58, 0.38, 0.05, 0.012), BLACK, 0, 0, 0);
  const pic = swapPic(m, 0.54, 0.34, 0, 0, 0.027);
  // A hood over it against the lights.
  part(m, box(0.6, 0.012, 0.07), BLACK, 0, 0.2, 0.04, { outline: false });
  for (const sx of [-1, 1]) part(m, box(0.012, 0.38, 0.07), BLACK, sx * 0.3, 0, 0.04, { outline: false });
  return pic;
}
function village(g: THREE.Group, out: Built) {
  // The tent: four poles, a black canopy with a valance.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    part(g, cyl(0.016, 0.016, 2.12, 8), '#9aa3ab', sx * 0.94, 1.06, sz * 0.46, { outline: false });
    part(g, rbox(0.14, 0.06, 0.1, 0.02), '#8d6e4d', sx * 0.94, 0.03, sz * 0.46);
  }
  part(g, box(1.98, 0.03, 1.02), '#212121', 0, 2.14, 0);
  part(g, box(1.98, 0.16, 0.014), '#212121', 0, 2.05, 0.51);
  part(g, box(1.98, 0.14, 0.014), '#212121', 0, 2.06, -0.51);
  label(g, 'VIDEO VILLAGE', 0.76, 0.1, 0, 2.05, 0.52, '#212121', TAPE);
  // Black drape at the back keeps the light off the screens.
  part(g, box(1.9, 2.04, 0.012), '#2b2b2f', 0, 1.04, -0.5);
  // The cart.
  part(g, rbox(1.3, 0.04, 0.46, 0.01), '#37474f', 0, 0.84, -0.26);
  part(g, rbox(1.3, 0.04, 0.46, 0.01), '#37474f', 0, 0.42, -0.26);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    part(g, cyl(0.012, 0.012, 0.8, 6), STEEL, sx * 0.62, 0.44, -0.26 + sz * 0.2, { outline: false });
    part(g, ball(0.03), BLACK, sx * 0.62, 0.03, -0.26 + sz * 0.2, { outline: false });
  }
  // Recorder, wireless receivers, cable loops.
  part(g, rbox(0.42, 0.12, 0.3, 0.01), '#263238', -0.3, 0.5, -0.26);
  const rec = ownLit(g, box(0.05, 0.016, 0.004), '#7a2020', -0.44, 0.52, -0.109);
  for (let i = 0; i < 3; i++) part(g, box(0.02, 0.02, 0.004), '#90a4ae', -0.32 + i * 0.05, 0.52, -0.109, { outline: false });
  part(g, rbox(0.32, 0.08, 0.26, 0.01), '#37474f', 0.32, 0.48, -0.26);
  for (const sx of [-1, 1]) rod(g, v3(0.32 + sx * 0.1, 0.52, -0.28), v3(0.32 + sx * 0.14, 0.78, -0.3), 0.005, BLACK);
  for (let i = 0; i < 3; i++) {
    const m = part(g, cyl(0.07 + i * 0.014, 0.07 + i * 0.014, 0.012, 16), BLACK, 0.45, 0.1 + i * 0.02, -0.36, { outline: false });
    m.scale.y = 1;
  }
  // The two monitors, and their stand.
  rod(g, v3(-0.32, 0.86, -0.3), v3(-0.32, 1.1, -0.3), 0.016, BLACK);
  rod(g, v3(0.32, 0.86, -0.3), v3(0.32, 1.1, -0.3), 0.016, BLACK);
  const monL = villageMon(g, VV.monL, 0.04);
  const monR = villageMon(g, VV.monR, -0.04);
  monL.set(takeTex(0));
  monR.set(takeTex(0));
  // Headphones on a hook, a coffee on the cart, a little sign.
  const cans = group(g);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.009, 6, 16, Math.PI), new THREE.MeshToonMaterial({ color: BLACK }));
  band.userData.ownGeometry = band.userData.ownMaterial = true;
  cans.add(band);
  for (const sx of [-1, 1]) part(cans, cyl(0.036, 0.036, 0.022, 10), BLACK, sx * 0.095, 0, 0, { rz: Math.PI / 2, outline: false });
  part(g, cyl(0.034, 0.03, 0.09, 10), '#fafafa', 0.74, 0.91, -0.3);
  part(g, cyl(0.036, 0.036, 0.012, 10), '#37474f', 0.74, 0.96, -0.3, { outline: false });
  // The chairs, which stay; who's in them only when it's on.
  canvasChair(g, VV.chairD[0], VV.chairD[2], Math.PI, 0.5, '감독', '#212121');
  canvasChair(g, VV.chairS[0], VV.chairS[2], Math.PI, 0.5, '스크립터', CANVAS);
  const crew = scene(g, out);
  const director = person(crew, LOOKS.director, VV.chairD[0], VV.chairD[2], Math.PI, 0.5);
  const sup = person(crew, LOOKS.writer, VV.chairS[0], VV.chairS[2], Math.PI, 0.5);
  part(crew, rbox(0.24, 0.02, 0.2, 0.004), '#1565c0', 0.46, 0.75, 0.02);
  part(crew, box(0.22, 0.004, 0.18), PAPER, 0.46, 0.762, 0.02, { outline: false });
  const pencilP = pencil(crew, '#1a237e');
  const say = bubble(g);
  const spots: Record<string, Spot> = { acWatchTake: standAt(g, 'acVillage', 0.75) };
  spots['*'] = spots.acWatchTake;
  drive(g, out, spots, (_now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const f = Math.min(9, Math.floor((n.play ?? 0) * 10));
    const L = Math.round(n._L ?? 0);
    const R = Math.round(n._R ?? 0);
    monL.set(takeTex(N ? (L === 3 ? 39 : L * 10 + f) : 0));
    monR.set(takeTex(N ? (R === 3 ? 39 : R === 5 ? 50 + f : R * 10 + f) : 0));
    setLit(rec, N && Math.floor(t * 2) % 2 ? '#ff5252' : '#7a2020');
    place(cans, P.cans ?? VV.phones);
    pencilP.visible = !!P.pencil;
    if (P.pencil) place(pencilP, P.pencil);
    if (!N) return say(0, null);
    pose(director, 'director', N, t);
    pose(sup, 'super', N, t);
    sayOver(say, N, { [WHO.a]: director, [WHO.b]: sup }, 1.6);
  });
  out.work = marker(g, 0, 1.2, -0.1);
}

// =============================================================================================
// 배우 대기 의자 (acCastChairs).

function castChairs(g: THREE.Group, out: Built) {
  canvasChair(g, -1.0, 0, 0, 0.5, '설하윤', '#ad1457');
  canvasChair(g, 0, 0, 0, 0.5, '주연', '#212121');
  canvasChair(g, 1.0, 0, 0, 0.5, '권태오', '#00695c');
  // A folding table between each pair.
  for (const x of [-0.5, 0.5]) {
    part(g, cyl(0.17, 0.17, 0.02, 16), '#d7ccc8', x, 0.54, 0);
    for (const a of [0.8, 2.9, 5]) rod(g, v3(x, 0.53, 0), v3(x + 0.13 * Math.sin(a), 0.02, 0.13 * Math.cos(a)), 0.01, '#5d4037');
  }
  // Left table: the dweller's cup, her thermos. Right table: a highlighter, the script's place.
  const cupHome = group(g);
  part(cupHome, cyl(0.034, 0.028, 0.09, 10), '#fafafa', 0, 0, 0);
  part(cupHome, cyl(0.036, 0.036, 0.012, 10), '#37474f', 0, 0.05, 0, { outline: false });
  part(cupHome, cyl(0.035, 0.03, 0.03, 10), '#8d6e63', 0, -0.01, 0, { outline: false });
  part(g, cyl(0.03, 0.03, 0.17, 10), '#ec407a', -0.42, 0.635, -0.08);
  part(g, cyl(0.022, 0.022, 0.03, 10), CHROME, -0.42, 0.735, -0.08, { outline: false });
  const hiHome = part(g, cyl(0.011, 0.011, 0.12, 8), '#ffee58', CC.hi[0], 0.565, CC.hi[2], { rz: Math.PI / 2, outline: false });
  const closed = part(g, rbox(0.2, 0.025, 0.27, 0.003), '#f6f1e2', CC.script[0], 0.565, CC.script[2]);
  // Bags, a folded umbrella, slippers under the chairs: the things waiting is done with.
  part(g, rbox(0.34, 0.26, 0.2, 0.05), '#6d4c41', -1.36, 0.13, 0.2, { ry: 0.5 });
  part(g, rbox(0.2, 0.05, 0.28, 0.015), '#e0e0e0', 0.14, 0.03, 0.34, { ry: 0.3 });
  part(g, rbox(0.2, 0.05, 0.28, 0.015), '#e0e0e0', -0.14, 0.03, 0.34, { ry: -0.15 });
  part(g, cyl(0.016, 0.016, 0.72, 8), '#1a237e', 1.42, 0.38, -0.32, { rz: 0.12 });
  part(g, rbox(0.42, 0.34, 0.26, 0.05), WOODD, 1.3, 0.17, 0.3, { ry: -0.3 });
  label(g, '배우 대기', 0.44, 0.09, 0, 0.97, -0.25, '#37474f', '#ffffff', Math.PI);
  const script = scriptProp(g, scriptPage);
  const hi = highlighter(g);
  hi.visible = false;
  const crew = scene(g, out);
  const her = person(crew, LOOKS.actress, CC.her[0], CC.her[2], 0, 0.5);
  const herScript = scriptProp(crew, scriptPage);
  herScript.t.visible = true;
  herScript.t.position.set(CC.her[0], 0.84, 0.3);
  herScript.t.rotation.set(-0.8, Math.PI, 0, 'YXZ');
  const ad = person(crew, LOOKS.ad, 1.9, 1.3, -1);
  const walkie = walkieProp(crew);
  const say = bubble(g);
  const spots: Record<string, Spot> = { acWaitLines: standAt(g, 'acWait', 0.6) };
  spots['*'] = spots.acWaitLines;
  drive(g, out, spots, (_now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const sp = P.script ?? null;
    script.t.visible = !!sp;
    closed.visible = !sp;
    if (sp && N) {
      place(script.t, sp);
      script.t.rotation.set(-0.7, N.st.yaw + Math.PI, 0, 'YXZ');
      script.page.set(scriptPage(Math.round(n._lines ?? 0)));
    }
    hi.visible = !!P.hi;
    hiHome.visible = !P.hi;
    if (P.hi) place(hi, P.hi);
    place(cupHome, P.cup ?? CC.cup);
    walkie.visible = !!P.walkie;
    if (P.walkie) place(walkie, P.walkie);
    if (!N) return say(0, null);
    pose(her, 'her', { ...N, props: { ...N.props, her: null } }, t);
    ad.root.visible = Math.round(n._adOn ?? 0) > 0;
    pose(ad, 'ad', N, t);
    sayOver(say, N, { [WHO.a]: her, [WHO.b]: ad }, 1.6);
  });
  out.work = marker(g, 0, 0.8, 0.2);
}

// =============================================================================================
// 의상 피팅 코너 (acCostume).

const boardTex = frames('Board', 192, 160, (c, i) => {
  c.fillStyle = '#c9a77b';
  c.fillRect(0, 0, 192, 160);
  text(c, '연속성 사진', 96, 14, 14, '#3e2723', 'center');
  const s = seeded(12);
  for (let k = 0; k < 6; k++) {
    const x = 10 + (k % 3) * 60;
    const y = 28 + Math.floor(k / 3) * 66;
    if (k >= 4 + i) continue;
    c.fillStyle = '#ffffff';
    c.fillRect(x, y, 52, 60);
    c.fillStyle = ['#b0bec5', '#ffcdd2', '#c5e1a5', '#d7ccc8', '#90a4ae', '#f0e0c0'][k];
    c.fillRect(x + 4, y + 4, 44, 40);
    c.fillStyle = '#7a5a43';
    c.fillRect(x + 20, y + 14, 12, 28);
    c.fillStyle = '#e9c3a1';
    c.beginPath();
    c.arc(x + 26, y + 12, 6, 0, Math.PI * 2);
    c.fill();
    text(c, `S#${Math.floor(s() * 60 + 3)}`, x + 26, y + 52, 10, '#37474f', 'center', false);
  }
});
function costume(g: THREE.Group, out: Built) {
  // The rail: a double pipe rack on wheels, garments by scene.
  const rz = -0.28;
  for (const x of [-0.93, 0.5]) {
    part(g, cyl(0.016, 0.016, 1.62, 8), STEEL, x, 0.83, rz, { outline: false });
    part(g, box(0.05, 0.03, 0.5), STEEL, x, 0.05, rz);
    for (const sz of [-1, 1]) part(g, ball(0.03), BLACK, x, 0.03, rz + sz * 0.22, { outline: false });
  }
  part(g, cyl(0.016, 0.016, 1.5, 8), STEEL, -0.21, 1.62, rz, { rz: Math.PI / 2, outline: false });
  // Garments: coat (that's the dweller's), shirts, a dress, a hanbok, a uniform, plastic-bagged ones.
  const clothes: Array<[number, string, number, number]> = [[-0.82, '#607d8b', 0.92, 0.3], [-0.68, '#c8ad8a', 1.05, 0.34], [-0.42, '#1a237e', 0.8, 0.28], [-0.3, '#e0e0e0', 0.64, 0.26], [-0.17, '#ad1457', 1.1, 0.3], [-0.02, '#f8bbd0', 0.98, 0.34], [0.12, '#37474f', 0.84, 0.3], [0.26, '#a1887f', 0.72, 0.28], [0.38, '#eceff1', 1.14, 0.3]];
  const hangers: Record<number, THREE.Object3D> = {};
  clothes.forEach(([x, col, L, w], i) => {
    const m = group(g, x, 0, rz, 0.3 + (i % 3) * 0.1);
    part(m, cyl(0.004, 0.004, 0.06, 5), CHROME, 0, 1.6, 0, { outline: false });
    part(m, box(w * 0.9, 0.01, 0.02), WOODL, 0, 1.56, 0, { outline: false });
    part(m, rbox(w, L, 0.05, 0.02), col, 0, 1.56 - L / 2, 0);
    part(m, box(0.03, L * 0.7, 0.002), '#00000022', 0, 1.56 - L * 0.4, 0.027, { outline: false });
    if (i === 1) {
      hangers[1] = m;
      for (const sx of [-1, 1]) part(m, box(0.1, 0.22, 0.056), '#b49673', sx * 0.09, 1.42, 0.003, { rz: sx * 0.2, outline: false });
    }
  });
  label(g, 'S#37', 0.14, 0.05, -0.68, 1.68, rz + 0.02, TAPE, '#212121');
  label(g, 'S#41', 0.14, 0.05, -0.17, 1.68, rz + 0.02, TAPE, '#212121');
  label(g, '의상팀', 0.3, 0.08, -0.21, 1.76, rz, '#5d4037', '#ffffff');
  // Shoes under it, hats on the rack's shelf.
  for (let i = 0; i < 5; i++) part(g, rbox(0.13, 0.06, 0.24, 0.02), ['#3e2723', '#1b1b1f', '#ad1457', '#c8ad8a', '#607d8b'][i], -0.76 + i * 0.26, 0.04, rz + 0.18);
  // The tall mirror on the right, a stool of pins and tapes.
  part(g, rbox(0.42, 1.82, 0.04, 0.012), '#5d4037', CF.mirror[0], 0.97, CF.mirror[2], { ry: -0.4 });
  part(g, box(0.36, 1.74, 0.006), '#cfe8f3', CF.mirror[0] - 0.008, 0.97, CF.mirror[2] + 0.024, { ry: -0.4, outline: false });
  for (const sz of [-1, 1]) part(g, box(0.05, 0.03, 0.4), '#5d4037', CF.mirror[0], 0.02, CF.mirror[2] + sz * 0.02);
  // The board of continuity photos.
  part(g, box(0.5, 0.42, 0.015), '#6e5238', CF.board[0] - 0.02, CF.board[1], CF.board[2] - 0.012);
  const board = swapPic(g, 0.46, 0.38, CF.board[0] - 0.02, CF.board[1], CF.board[2] - 0.003);
  board.set(boardTex(0));
  // A low round box to stand on.
  part(g, cyl(0.34, 0.36, CF.box, 24), '#d7ccc8', CF.stand.x, CF.box / 2, CF.stand.z);
  part(g, cyl(0.32, 0.32, 0.004, 24), '#a1887f', CF.stand.x, CF.box + 0.002, CF.stand.z, { outline: false });
  // A sewing kit on a little stool beside the rail.
  part(g, cyl(0.14, 0.14, 0.03, 12), WOODL, 0.5, 0.42, 0.28);
  for (const a of [0.7, 2.8, 4.9]) rod(g, v3(0.5, 0.41, 0.28), v3(0.5 + 0.11 * Math.sin(a), 0, 0.28 + 0.11 * Math.cos(a)), 0.01, WOODD);
  part(g, rbox(0.17, 0.06, 0.12, 0.01), '#ef9a9a', 0.5, 0.47, 0.28);
  for (let i = 0; i < 4; i++) part(g, cyl(0.012, 0.012, 0.03, 8), ['#e53935', '#3949ab', '#fdd835', '#43a047'][i], 0.44 + i * 0.04, 0.515, 0.28, { outline: false });
  // What travels: the coat, on the dweller or in the fitter's hands; a tape; a polaroid; a flash.
  const worn = group(g);
  // Held up against the body, as a fitter does: the coat flat, top at y 0, sleeves hanging, the lapels and belt on it.
  part(worn, rbox(0.4, 0.92, 0.03, 0.02), '#c8ad8a', 0, -0.46, 0);
  for (const sx of [-1, 1]) {
    part(worn, rbox(0.09, 0.56, 0.028, 0.02), '#b49673', sx * 0.235, -0.3, -0.004, { rz: sx * 0.07 });
    part(worn, box(0.1, 0.28, 0.008), '#a98c66', sx * 0.07, -0.13, 0.018, { rz: sx * 0.28, outline: false });
    for (const y of [-0.42, -0.58]) part(worn, cyl(0.012, 0.012, 0.006, 8), '#5d4037', sx * 0.08, y, 0.018, { rx: Math.PI / 2, outline: false });
  }
  part(worn, box(0.41, 0.035, 0.012), '#8d7350', 0, -0.5, 0.018, { outline: false });
  worn.visible = false;
  const carried = group(g);
  part(carried, rbox(0.42, 0.9, 0.05, 0.02), '#c8ad8a', 0, -0.2, 0);
  carried.visible = false;
  const tape = limb(g, 0.008, TAPE);
  const pin = part(g, ball(0.012), '#e53935', 0, 0, 0, { outline: false });
  const cam = group(g);
  part(cam, rbox(0.14, 0.11, 0.1, 0.012), '#fafafa', 0, 0, 0);
  part(cam, cyl(0.03, 0.03, 0.02, 12), BLACK, 0, 0, -0.06, { rx: Math.PI / 2, outline: false });
  const flash = ownLit(cam, box(0.05, 0.02, 0.004), '#eceff1', 0.03, 0.04, -0.052);
  const pic = part(g, box(0.1, 0.12, 0.003), '#fafafa', 0, 0, 0, { outline: false });
  const crew = scene(g, out);
  const fitter = person(crew, LOOKS.fitter, -0.86, 0.88, 1.0);
  part(fitter.root, cyl(0.04, 0.04, 0.02, 8), '#ef5350', -0.22, 0.86, 0.06, { rx: Math.PI / 2, outline: false });
  const say = bubble(g);
  const spots: Record<string, Spot> = { acCostumeFit: standAt(g, 'acFit') };
  spots['*'] = spots.acCostumeFit;
  drive(g, out, spots, (_now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const on = N ? Math.round(n._coat ?? 0) > 0 : false;
    worn.visible = on;
    if (on && N) {
      worn.position.set(N.st.x + Math.sin(N.st.yaw) * 0.15, N.st.y + 0.84 * ((spots.acCostumeFit.at.userData.height as number | undefined) ?? 1.6), N.st.z + Math.cos(N.st.yaw) * 0.15);
      worn.rotation.y = N.st.yaw;
    }
    const hand = P.coatH ?? null;
    carried.visible = !!hand && !on;
    if (hand) {
      place(carried, hand);
      carried.rotation.y = 0.8;
    }
    hangers[1].visible = !on && !hand;
    const tA = P.tapeA ?? null;
    const tB = P.tapeB ?? null;
    if (tA && tB) tape(V3(tA), V3(tB));
    else tape(v3(-0.3, 1.25, 0.04), v3(-0.3, 1.35, 0.04));
    pin.visible = !!P.pinA;
    if (P.pinA) place(pin, P.pinA);
    cam.visible = !!P.cam;
    if (P.cam) place(cam, P.cam);
    setLit(flash, (n.flash ?? 0) > 0.5 ? '#ffffff' : '#eceff1');
    pic.visible = !!P.pic;
    if (P.pic) place(pic, P.pic);
    board.set(boardTex(Math.round(n._photo ?? 0) === 2 ? 1 : 0));
    if (!N) return say(0, null);
    pose(fitter, 'fitter', N, t);
    sayOver(say, N, { [WHO.a]: fitter }, 1.6);
  });
  out.work = marker(g, 0, 1.0, 0.1);
}

// =============================================================================================
// 현장 분장 의자 (acTouchUp).

function touchUp(g: THREE.Group, out: Built) {
  // A tall folding chair, a footrest.
  const seat = MC.seat.y;
  const c = group(g, 0, 0, MC.seat.z);
  for (const sx of [-1, 1]) {
    rod(c, v3(sx * 0.21, 0.01, 0.24), v3(sx * 0.21, seat - 0.02, 0.2), 0.016, '#90a4ae');
    rod(c, v3(sx * 0.21, 0.01, -0.24), v3(sx * 0.21, seat + 0.48, -0.2), 0.016, '#90a4ae');
    part(c, box(0.03, 0.02, 0.4), '#78909c', sx * 0.21, seat + 0.2, 0.01);
  }
  part(c, box(0.44, 0.02, 0.4), CANVAS, 0, seat - 0.01, 0.01);
  part(c, box(0.44, 0.22, 0.014), CANVAS, 0, seat + 0.38, -0.2);
  label(c, '분장', 0.2, 0.08, 0, seat + 0.38, -0.21, CANVAS, '#ffffff', Math.PI);
  part(c, cyl(0.014, 0.014, 0.46, 8), '#78909c', 0, 0.26, 0.26, { rz: Math.PI / 2, outline: false });
  // The kit, open on a stand beside it: a tackle box of brushes, sponges, colours.
  const k = MC.kit;
  for (const a of [0.7, 2.8, 4.9]) rod(g, v3(k[0], k[1] - 0.08, k[2]), v3(k[0] + 0.14 * Math.sin(a), 0, k[2] + 0.14 * Math.cos(a)), 0.01, '#37474f');
  part(g, rbox(0.34, 0.12, 0.22, 0.012), '#212121', k[0], k[1], k[2]);
  part(g, rbox(0.33, 0.015, 0.1, 0.004), '#37474f', k[0], k[1] + 0.09, k[2] + 0.13, { rx: -0.3 });
  part(g, rbox(0.33, 0.015, 0.1, 0.004), '#37474f', k[0], k[1] + 0.09, k[2] - 0.13, { rx: 0.3 });
  ['#e8b4a0', '#d48a7c', '#b5651d', '#f3d2c1', '#8e5d4b', '#c97b84'].forEach((col, i) => part(g, cyl(0.016, 0.016, 0.006, 10), col, k[0] - 0.1 + (i % 3) * 0.1, k[1] + 0.075, k[2] - 0.05 + Math.floor(i / 3) * 0.06, { outline: false }));
  for (let i = 0; i < 4; i++) rod(g, v3(k[0] - 0.12 + i * 0.07, k[1] + 0.07, k[2] + 0.1), v3(k[0] - 0.13 + i * 0.07, k[1] + 0.22, k[2] + 0.13), 0.005, ['#1f1e22', '#d7b98c', '#8d6e63', '#1f1e22'][i]);
  part(g, cyl(0.03, 0.03, 0.16, 8), '#c2185b', k[0] + 0.2, 0.86, k[2] + 0.1);
  part(g, cyl(0.016, 0.016, 0.02, 8), CHROME, k[0] + 0.2, 0.95, k[2] + 0.1, { outline: false });
  const puffHome = part(g, cyl(0.03, 0.03, 0.012, 12), '#f6b8a8', k[0] - 0.08, k[1] + 0.08, k[2] + 0.07, { outline: false });
  // What's in hand.
  const puff = part(g, cyl(0.032, 0.032, 0.014, 12), '#f6b8a8', 0, 0, 0, { rx: Math.PI / 2, outline: false });
  const sponge = part(g, rbox(0.03, 0.03, 0.02, 0.008), '#f3d2c1', 0, 0, 0, { outline: false });
  const brush = group(g);
  part(brush, cyl(0.004, 0.004, 0.1, 6), BLACK, 0, -0.05, 0.02, { outline: false, rx: 0.4 });
  part(brush, cyl(0.008, 0.004, 0.018, 6), '#c2185b', 0, 0, 0, { outline: false });
  const combP = rbox(0.02, 0.12, 0.006, 0.002);
  const comb = part(g, combP, '#3e2723', 0, 0, 0, { outline: false, rz: 1.2 });
  const can = group(g);
  part(can, cyl(0.028, 0.028, 0.15, 8), '#c2185b', 0, -0.05, 0);
  part(can, cyl(0.014, 0.014, 0.02, 8), CHROME, 0, 0.035, 0, { outline: false });
  const mirror = group(g);
  part(mirror, cyl(0.08, 0.08, 0.008, 18), WOODD, 0, 0, 0, { rx: Math.PI / 2 });
  part(mirror, cyl(0.07, 0.07, 0.003, 18), '#cfe8f3', 0, 0, 0.006, { rx: Math.PI / 2, outline: false });
  part(mirror, box(0.02, 0.1, 0.008), WOODD, 0, -0.12, 0);
  const tissue = part(g, rbox(0.2, 0.04, 0.12, 0.015), '#fafafa', 0, 0, 0, { outline: false });
  const walkie = walkieProp(g);
  const mist = group(g);
  for (let i = 0; i < 8; i++) part(mist, ball(0.02 + i * 0.005), '#ffffff', 0, 0, 0, { outline: false, material: MIST });
  mist.visible = false;
  const crew = scene(g, out);
  const artist = person(crew, LOOKS.artist, MC.artist[0], MC.artist[2], 2.2);
  // A belt of brushes on the artist's hip.
  part(artist.root, rbox(0.22, 0.12, 0.06, 0.01), '#616161', 0.12, 0.92, 0.11);
  for (let i = 0; i < 3; i++) part(artist.root, cyl(0.005, 0.005, 0.1, 6), ['#d7b98c', '#1f1e22', '#c2185b'][i], 0.06 + i * 0.05, 1.0, 0.115, { outline: false });
  const say = bubble(g);
  const spots: Record<string, Spot> = { acTouchUpMakeup: standAt(g, 'acTouchUp') };
  spots['*'] = spots.acTouchUpMakeup;
  drive(g, out, spots, (_now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const showAt = (m: THREE.Object3D, p: V | null | undefined) => {
      m.visible = !!p;
      if (p) place(m, p);
    };
    showAt(puff, P.puff);
    puffHome.visible = !P.puff;
    showAt(sponge, P.sponge);
    showAt(brush, P.brush);
    showAt(comb, P.comb);
    showAt(can, P.can);
    showAt(mirror, P.mirror);
    showAt(walkie, P.walkie);
    if (P.mirror && N) mirror.rotation.set(-0.15, N.st.yaw + Math.PI, 0);
    const tissued = N && (n.tissue ?? 0) > 0.5;
    tissue.visible = !!tissued;
    if (tissued && N) tissue.position.set(N.st.x, N.st.y + 0.35 * ((N.st.y && 1.6) || 1.6), N.st.z + 0.04);
    mist.visible = (n.mist ?? 0) > 0.5;
    if (mist.visible && N) {
      const headY = N.st.y + 0.5 * 1.6;
      mist.children.forEach((b, i) => {
        const f = frac(t * 0.9 + i * 0.13);
        b.position.set(0.1 - f * 0.15 + 0.05 * Math.sin(i * 2.1), headY + 0.25 - f * 0.25, 0.2 - 0.2 * f + 0.04 * Math.cos(i * 1.7));
      });
    }
    if (!N) return say(0, null);
    pose(artist, 'artist', N, t);
    sayOver(say, N, { [WHO.a]: artist }, 1.6);
  });
  out.work = marker(g, 0, 1.1, 0.1);
}

// =============================================================================================
// 그린 스크린 (acGreen).

const GREEN = '#35c04a';
const composite = frames('Comp', 256, 160, (c, i) => {
  // i: 0 raw green, 1 the rough comp, 2 the comp with its monster breathing, 3 the same with fire.
  c.fillStyle = i === 0 ? GREEN : '#212a3d';
  c.fillRect(0, 0, 256, 160);
  if (i === 0) {
    c.strokeStyle = '#e8ffe8';
    c.lineWidth = 2;
    for (const [x, y] of [[50, 40], [128, 34], [206, 46], [80, 90], [176, 92]]) {
      c.beginPath();
      c.moveTo(x - 7, y - 7);
      c.lineTo(x + 7, y + 7);
      c.moveTo(x + 7, y - 7);
      c.lineTo(x - 7, y + 7);
      c.stroke();
    }
  } else {
    // A ruined skyline and the 괴수 over it.
    c.fillStyle = '#31405f';
    for (let k = 0; k < 9; k++) c.fillRect(k * 30, 92 - ((k * 37) % 40), 26, 100);
    c.fillStyle = '#7fd14b';
    c.beginPath();
    c.ellipse(186, 74, 40, 52, 0.15, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(150, 38, 28, 22, 0.1, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#2f5d1f';
    for (let k = 0; k < 5; k++) {
      c.beginPath();
      c.moveTo(185 + k * 8, 26 + k * 16);
      c.lineTo(216 + k * 6, 14 + k * 14);
      c.lineTo(205 + k * 8, 46 + k * 16);
      c.fill();
    }
    c.fillStyle = '#fff176';
    c.beginPath();
    c.arc(146, 30, 5, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#1b2a14';
    c.fillRect(128, 44, 28, 9);
    if (i === 3) {
      c.fillStyle = '#ff9800';
      c.beginPath();
      c.moveTo(130, 48);
      c.lineTo(60, 104);
      c.lineTo(46, 80);
      c.closePath();
      c.fill();
      c.fillStyle = '#ffeb3b';
      c.beginPath();
      c.moveTo(130, 48);
      c.lineTo(76, 96);
      c.lineTo(66, 82);
      c.closePath();
      c.fill();
    }
  }
  // The dweller, small, at the bottom left, a sword up.
  c.fillStyle = '#263238';
  c.fillRect(66, 110, 14, 42);
  c.fillStyle = '#e9c3a1';
  c.beginPath();
  c.arc(73, 102, 8, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#eceff1';
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(80, 118);
  c.lineTo(112, 84);
  c.stroke();
  c.fillStyle = 'rgba(0,0,0,0.6)';
  c.fillRect(0, 0, 256, 18);
  text(c, i === 0 ? '원본' : 'CG 시안 합성', 6, 9, 12, '#ffffff');
});
function greenScreen(g: THREE.Group, out: Built) {
  // The cove: a green wall that curves into a green floor, a wing each side.
  part(g, box(2.96, 2.46, 0.04), GREEN, 0, 1.23, -0.92);
  for (const [z, y, r] of [[-0.88, 0.11, -0.8], [-0.8, 0.05, -0.45], [-0.7, 0.015, -0.18]] as const) part(g, box(2.96, 0.02, 0.2), GREEN, 0, y, z, { rx: r, outline: false });
  part(g, box(2.96, 0.012, 1.54), GREEN, 0, 0.008, 0.2, { outline: false });
  for (const x of [-1.46, 1.46]) part(g, box(0.05, 2.1, 0.8), '#2fa842', x, 1.05, -0.5);
  // Tracking crosses on it, and tape on the floor.
  for (const [x, y] of [[-1.05, 1.9], [-0.4, 2.1], [0.4, 1.8], [1.05, 2.1], [-0.9, 1.1], [-0.15, 1.3], [0.7, 1.1], [1.1, 0.7], [-1.15, 0.55]]) {
    part(g, box(0.1, 0.012, 0.006), '#f1f8e9', x, y, -0.895, { outline: false, rz: 0.785 });
    part(g, box(0.1, 0.012, 0.006), '#f1f8e9', x, y, -0.895, { outline: false, rz: -0.785 });
  }
  part(g, box(0.3, 0.004, 0.035), '#ef5350', GS.mark[0], 0.018, GS.mark[2], { outline: false });
  part(g, box(0.035, 0.004, 0.22), '#ef5350', GS.mark[0], 0.018, GS.mark[2] - 0.1, { outline: false });
  // A lighting bar over it: three softboxes.
  for (const x of [-1.4, 1.4]) part(g, cyl(0.018, 0.018, 2.56, 8), '#5a6470', x, 1.28, 0.72, { outline: false });
  part(g, cyl(0.022, 0.022, 2.84, 8), '#5a6470', 0, 2.54, 0.72, { rz: Math.PI / 2 });
  const panels = [-0.9, 0, 0.9].map((x) => {
    part(g, rbox(0.62, 0.1, 0.42, 0.02), BLACK, x, 2.42, 0.56, { rx: 0.55 });
    return ownLit(g, box(0.56, 0.01, 0.36), '#a8b3a8', x, 2.37, 0.54);
  });
  panels.forEach((m) => (m.rotation.x = 0.55));
  // The foam sword on its stand.
  const standX = GS.sword[0];
  part(g, cyl(0.015, 0.015, 0.56, 6), BLACK, standX, 0.28, GS.sword[2], { outline: false });
  part(g, cyl(0.12, 0.12, 0.02, 10), BLACK, standX, 0.015, GS.sword[2]);
  part(g, box(0.1, 0.03, 0.03), BLACK, standX, 0.56, GS.sword[2], { outline: false });
  const blade = limb(g, 0.028, '#b0bec5');
  const guard = part(g, box(0.16, 0.024, 0.036), '#7e57c2', 0, 0, 0);
  label(g, '소품 · 만지지 마세요', 0.42, 0.06, standX, 0.28, GS.sword[2] + 0.13, '#212121', '#ffffff');
  // The monitor cart, turned out to the room.
  const mon = group(g, GS.mon[0], 0, GS.mon[2], -0.45);
  part(mon, rbox(0.44, 0.03, 0.34, 0.008), '#37474f', 0, 0.74, 0);
  for (const sx of [-1, 1]) {
    part(mon, cyl(0.012, 0.012, 0.74, 6), STEEL, sx * 0.2, 0.37, 0, { outline: false });
    part(mon, ball(0.026), BLACK, sx * 0.2, 0.026, 0.14, { outline: false });
    part(mon, ball(0.026), BLACK, sx * 0.2, 0.026, -0.14, { outline: false });
  }
  part(mon, rbox(0.3, 0.1, 0.22, 0.01), '#263238', 0, 0.2, 0);
  part(mon, rbox(0.54, 0.36, 0.05, 0.012), BLACK, 0, GS.mon[1] - 0.26 + 0.26, -0.04);
  rod(mon, v3(0, 0.76, -0.05), v3(0, 1.16, -0.05), 0.012, BLACK);
  const screen = swapPic(mon, 0.5, 0.32, 0, GS.mon[1], -0.012);
  screen.set(composite(0));
  // The pole with its ball: leant in the corner when it's not a monster's eye.
  const stick = limb(g, 0.012, '#eceff1');
  const eye = part(g, ball(0.05), '#d4e157', 0, 0, 0);
  const eyeIdle: V = [1.32, 1.9, -0.7];
  const crew = scene(g, out);
  const grip = person(crew, LOOKS.grip, GS.hold[0], GS.hold[2], -1.2);
  // The camera on sticks, the operator behind it.
  const camG = group(crew, 0.05, 0, 1.8);
  for (const a of [0.8, 2.9, 5]) rod(camG, v3(0, 1.08, 0), v3(0.28 * Math.sin(a), 0, 0.28 * Math.cos(a)), 0.014, '#5d4037');
  part(camG, rbox(0.14, 0.16, 0.26, 0.015), '#2b2b30', 0, 1.2, 0);
  part(camG, cyl(0.05, 0.055, 0.18, 14), BLACK, 0, 1.22, -0.2, { rx: Math.PI / 2 });
  const tally = ownLit(camG, box(0.04, 0.02, 0.02), '#7a2020', 0, 1.31, -0.1);
  const op = person(camG, LOOKS.boom, 0.02, 0.42, Math.PI);
  op.armL(v3(0.02 + 0.06, 1.24, 0.14));
  op.armR(v3(0.02 - 0.08, 1.14, 0.14));
  const say = bubble(g);
  const spots: Record<string, Spot> = { acGreenFight: standAt(g, 'acGreen', 1.2) };
  spots['*'] = spots.acGreenFight;
  const swordHome = v3(GS.sword[0] + 0.0, GS.sword[1] + 0.02, GS.sword[2]);
  const tipHome = v3(GS.sword[0] + 0.02, GS.sword[1] + 0.86, GS.sword[2]);
  drive(g, out, spots, (_now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const lit = !!N;
    panels.forEach((m) => setLit(m, lit ? '#fbfff0' : '#a8b3a8'));
    const a = P.sword ? V3(P.sword) : swordHome;
    const b = P.tip ? V3(P.tip) : tipHome;
    blade(a, b);
    guard.position.copy(a).lerp(b, 0.09);
    guard.quaternion.setFromUnitVectors(UP, tmp.subVectors(b, a).normalize());
    const m = Math.round(n._mon ?? 0);
    screen.set(composite(!N ? 0 : m === 0 ? 0 : (n.roar ?? 0) > 0.5 && Math.floor(t * 3) % 2 === 0 ? 3 : 2));
    const eyeAt = P.ball ?? eyeIdle;
    place(eye, eyeAt);
    stick(V3(P.ball ? [GS.hold[0] + 0.12, 0.42, GS.hold[2] + 0.02] : [1.42, 0.02, -0.5]), V3(eyeAt));
    if (!N) return say(0, null);
    setLit(tally, (n.tally ?? 0) > 0.5 ? '#ff1744' : '#7a2020');
    pose(grip, 'crew', N, t);
    sayOver(say, N, { [WHO.b]: grip }, 1.6);
  });
  out.work = marker(g, 0, 1.0, 0.3);
}

// ---------------------------------------------------------------------------------------------
// The yard and the gate (2026-11-05, the layout audit): set dressing, nothing moves. Drawn along x, the cab at +x, the near side +z.

const TYRE = '#202124';
const GLASSV = '#33475b';
function yardWheel(g: THREE.Object3D, x: number, z: number, r = 0.26) {
  part(g, cyl(r, r, 0.2, 18), TYRE, x, r, z, { rx: Math.PI / 2 });
  part(g, cyl(r * 0.55, r * 0.55, 0.205, 12), '#9ea7ad', x, r, z, { rx: Math.PI / 2, outline: false });
}
/** Both sides' words, out from the panel so they're seen. */
function sides(g: THREE.Object3D, s: string, w: number, h: number, x: number, y: number, half: number, bg: string, fg: string, zc = 0) {
  label(g, s, w, h, x, y, zc + half + 0.008, bg, fg);
  label(g, s, w, h, x, y, zc - half - 0.008, bg, fg, Math.PI);
}

/** 배우 대기 차량: a black high-roofed people carrier, tinted all round, the sliding door on the near side, a step down at it. */
function starVan(g: THREE.Group) {
  const L = 2.9;
  const Wd = 1.2;
  const VAN = '#1d1f22';
  part(g, rbox(L, 0.62, Wd, 0.12), VAN, 0, 0.62, 0);
  part(g, rbox(L - 0.75, 0.66, Wd - 0.04, 0.12), VAN, -0.3, 1.24, 0);
  part(g, rbox(0.55, 0.2, Wd - 0.04, 0.08), VAN, L / 2 - 0.32, 0.98, 0, { rz: -0.3 });
  part(g, box(0.62, 0.02, Wd - 0.16), GLASSV, L / 2 - 0.56, 1.24, 0, { rz: -0.9 });
  for (const sz of [-1, 1]) {
    const z = sz * (Wd / 2 - 0.01);
    // The tinted windows down the side, the curtains drawn in the back ones.
    for (const [x, w] of [[-1.05, 0.5], [-0.45, 0.62], [0.22, 0.56]] as const) part(g, box(w, 0.4, 0.02), x < 0 ? '#2a2d33' : GLASSV, x, 1.28, z + sz * 0.01, { outline: false });
    part(g, box(0.03, 0.62, 0.02), '#0d0e10', -0.12, 0.84, z + sz * 0.01, { outline: false });
    part(g, box(0.14, 0.03, 0.03), CHROME, -0.04, 0.95, z + sz * 0.02, { outline: false });
    part(g, rbox(0.1, 0.08, 0.05, 0.02), VAN, L / 2 - 0.6, 1.1, z + sz * 0.06);
  }
  for (const x of [-0.95, 0.95]) for (const sz of [-1, 1]) yardWheel(g, x, sz * (Wd / 2 - 0.12));
  part(g, box(0.04, 0.12, 0.4), '#fafafa', L / 2 + 0.01, 0.42, 0, { outline: false });
  label(g, '32바 1234', 0.34, 0.1, L / 2 + 0.035, 0.42, 0, '#ffffff', '#222222', Math.PI / 2);
  // The folding step at the door, a call sheet on the dash.
  part(g, rbox(0.5, 0.05, 0.26, 0.02), STEEL, -0.2, 0.12, Wd / 2 + 0.14);
  part(g, box(0.18, 0.01, 0.12), PAPER, L / 2 - 0.5, 0.94, 0.2, { outline: false });
}

/** 조명·그립 장비 트럭: a 5톤 box truck, its back open to the stage door, a light on its stand, cable drums and cases inside, the ramp down. */
function gripTruck(g: THREE.Group) {
  const L = 3.3;
  const Wd = 1.3;
  const BOX = '#eef1f3';
  const bl = L - 0.9;
  const xb = -0.45;
  // The cab.
  part(g, rbox(0.85, 1.25, Wd, 0.1), '#1565c0', L / 2 - 0.43, 0.95, 0);
  part(g, box(0.02, 0.48, Wd - 0.2), GLASSV, L / 2 + 0.005, 1.25, 0, { outline: false });
  part(g, box(0.04, 0.12, 0.4), '#fafafa', L / 2 + 0.01, 0.5, 0, { outline: false });
  // The box on its floor, the back open.
  part(g, rbox(bl, 1.7, Wd, 0.04), BOX, xb, 1.3, 0);
  part(g, box(bl, 0.12, Wd), '#5f6b73', xb, 0.4, 0);
  const back = xb - bl / 2;
  part(g, box(0.02, 1.42, Wd - 0.12), '#2b2f33', back - 0.012, 1.17, 0, { outline: false });
  part(g, box(0.06, 0.2, Wd - 0.06), '#b0bec5', back - 0.03, 2.05, 0);
  // Seen through the back: cases stacked, a cable drum, a light on its stand.
  part(g, rbox(0.3, 0.28, 0.4, 0.02), '#263238', back - 0.17, 0.62, -0.3);
  part(g, rbox(0.3, 0.28, 0.4, 0.02), '#37474f', back - 0.17, 0.92, -0.3);
  part(g, cyl(0.16, 0.16, 0.16, 14), '#ff8f00', back - 0.2, 0.62, 0.3, { rx: Math.PI / 2 });
  // The ramp down to the ground.
  part(g, box(0.62, 0.03, 0.6), '#78909c', back - 0.62, 0.22, 0, { rz: 0.6 });
  for (const x of [-1.25, -0.8, 1.05]) for (const sz of [-1, 1]) yardWheel(g, x, sz * (Wd / 2 - 0.12), 0.27);
  sides(g, '한빛조명 · 그립', 1.4, 0.22, xb, 1.6, Wd / 2, '#ffffff', '#1565c0');
  for (const sz of [-1, 1]) part(g, box(bl - 0.1, 0.06, 0.012), '#1565c0', xb, 1.34, sz * (Wd / 2 + 0.006), { outline: false });
}

/** 촬영장 밥차: a 1톤 food truck, its hatch propped up on the near side over the steel counter, the rice cooker and soup pot, trays stacked, a folding table and stools in front. */
function foodTruck(g: THREE.Group) {
  const L = 2.6;
  const Wd = 1.0;
  const zc = -0.1;
  part(g, rbox(0.7, 1.05, Wd, 0.1), '#f5f5f5', L / 2 - 0.35, 0.85, zc);
  part(g, box(0.02, 0.4, Wd - 0.2), GLASSV, L / 2 + 0.005, 1.1, zc, { outline: false });
  const bl = L - 0.72;
  const bx = -0.36;
  part(g, rbox(bl, 1.5, Wd, 0.05), '#ffb300', bx, 1.2, zc);
  // The hatch: the opening, the flap propped up over it, the counter, what's on it.
  const fz = zc + Wd / 2;
  part(g, box(bl - 0.3, 0.6, 0.02), '#3e2723', bx, 1.27, fz + 0.006, { outline: false });
  part(g, box(bl - 0.24, 0.03, 0.55), '#ffa000', bx, 1.9, fz + 0.26, { rx: -0.25 });
  part(g, box(bl - 0.3, 0.04, 0.22), STEEL, bx, 0.97, fz + 0.11);
  part(g, cyl(0.12, 0.12, 0.2, 14), '#eceff1', bx - 0.45, 1.09, fz + 0.1);
  part(g, cyl(0.13, 0.11, 0.18, 14), '#90a4ae', bx + 0.05, 1.08, fz + 0.1);
  for (let i = 0; i < 4; i++) part(g, box(0.3, 0.018, 0.18), '#b0bec5', bx + 0.48, 1.0 + i * 0.022, fz + 0.11, { outline: false });
  sides(g, '든든밥차', 0.66, 0.18, bx - 0.15, 0.78, Wd / 2, '#ffb300', '#5d4037', zc);
  label(g, '오늘 점심 · 제육볶음 · 된장국', 1.0, 0.12, bx, 1.67, fz + 0.012, '#fff8e1', '#4e342e');
  for (const x of [-0.95, 0.85]) for (const sz of [-1, 1]) yardWheel(g, x, zc + sz * (Wd / 2 - 0.12), 0.22);
  // The folding table out front and its stools.
  part(g, box(0.9, 0.03, 0.3), '#eceff1', bx, 0.62, 0.72);
  for (const sx of [-1, 1]) part(g, box(0.03, 0.6, 0.26), '#9e9e9e', bx + sx * 0.4, 0.31, 0.72, { outline: false });
  for (const x of [-0.75, 0.05]) part(g, cyl(0.1, 0.1, 0.36, 12), '#1e88e5', x, 0.18, 0.4);
}

/** 정문 앞 팬 대기선: chrome posts with a red belt between them along the pavement, the A-board 'filming, crew only' at the end. */
function fanLine(g: THREE.Group) {
  const xs = [-0.85, 0, 0.85];
  for (const x of xs) {
    part(g, cyl(0.14, 0.16, 0.04, 16), CHROME, x, 0.02, 0);
    part(g, cyl(0.025, 0.025, 0.9, 8), CHROME, x, 0.47, 0);
    part(g, cyl(0.04, 0.04, 0.06, 10), CHROME, x, 0.93, 0);
  }
  for (let i = 0; i < xs.length - 1; i++) part(g, box(0.8, 0.05, 0.01), '#c62828', (xs[i] + xs[i + 1]) / 2, 0.86, 0, { outline: false });
  // The A-board, its face to the street.
  const ax = 0.55;
  const az = -0.3;
  part(g, box(0.5, 0.7, 0.03), '#fbc02d', ax, 0.36, az + 0.1, { rx: -0.25 });
  part(g, box(0.5, 0.7, 0.03), '#fbc02d', ax, 0.36, az - 0.1, { rx: 0.25 });
  const face = new THREE.Group();
  face.position.set(ax, 0.36, az + 0.1);
  face.rotation.x = -0.25;
  g.add(face);
  label(face, '촬영 중', 0.4, 0.13, 0, 0.14, 0.018, '#fbc02d', '#212121');
  label(face, '관계자 외 출입금지', 0.44, 0.1, 0, -0.04, 0.018, '#fbc02d', '#c62828');
}

export const BUILDERS: Record<string, Builder> = {
  acStarVan(g) {
    starVan(g);
  },
  acGripTruck(g) {
    gripTruck(g);
  },
  acFoodTruck(g) {
    foodTruck(g);
  },
  acFanLine(g) {
    fanLine(g);
  },
  filmSet(g, _W, _D, _c, _def, _ctx, out) {
    filmSet(g, out);
  },
  stuntMat(g, _W, _D, _c, _def, _ctx, out) {
    stuntMat(g, out);
  },
  scriptTable(g, _W, _D, _c, _def, _ctx, out) {
    scriptTable(g, out);
  },
  acVillage(g, _W, _D, _c, _def, _ctx, out) {
    village(g, out);
  },
  acCastChairs(g, _W, _D, _c, _def, _ctx, out) {
    castChairs(g, out);
  },
  acCostume(g, _W, _D, _c, _def, _ctx, out) {
    costume(g, out);
  },
  acTouchUp(g, _W, _D, _c, _def, _ctx, out) {
    touchUp(g, out);
  },
  acGreen(g, _W, _D, _c, _def, _ctx, out) {
    greenScreen(g, out);
  },
};
