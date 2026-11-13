import * as THREE from 'three';
import { PLATFORMS } from '../furniturePlatform';
import { deskChair, marker, rod, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, label, painted, picture, seeded, text } from './doctor';
import { BR, CK, DK, EN_NOW, MS, SC, SG, VN, enNow, enPhase } from './entertainerMotion';
import type { EnMotion, EnNow } from './entertainerMotion';
import { vroidFigure, type Figure, type FigureOptions } from './vroidFigure';

/**
 * The 코미디 클럽 공연장 drawn as itself (2026-11-01 workplace pipeline, at the user's request): the made-up
 * 허허 코미디 클럽, a small stand-up room in a basement. The stage (furniturePlatform.ts, already to the bar) gets
 * its mic that really comes off the stand, a foot monitor, the warning light and a followspot, and everyone
 * in the room is someone: tables of people who laugh when the script says it landed, an MC, a heckler, a junior
 * being coached, a co-writer who shakes their head, a bartender. And what the club was missing: the rows of
 * tables, a bar, a bulb-lit dressing mirror, a set-list cork board, the sound and light console at the back,
 * a wall of posters in the lobby.
 *
 * Everything that moves follows the scripts in entertainerMotion.ts. People are drawn figures played by
 * reduced VRoid bodies (vroidFigure.ts), made the first time a piece is used, and only ever given arms and a
 * head to move: a body has no crossed legs.
 */

const WALNUT = '#5d4037';
const WALNUT_D = '#3e2723';
const BRICK = '#8e3b2b';
const MUSTARD = '#ffb300';
const NEON = '#ff4081';
const PAPER = '#fbfaf6';
const CORK = '#b98a56';
const UP = new THREE.Vector3(0, 1, 0);
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3();
type V = readonly [number, number, number];
const vec = (p: V) => v3(p[0], p[1], p[2]);

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
function swapPic(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0): { mesh: THREE.Mesh; set: (t: THREE.Texture | null) => void } {
  const mat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.userData.ownGeometry = mesh.userData.ownMaterial = true;
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, 0, 'YXZ');
  g.add(mesh);
  return {
    mesh,
    set: (t) => {
      if (!t || mat.map === t) return;
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
function standAt(g: THREE.Object3D, motion: EnMotion): Spot {
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
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, show: (now: string | null, N: EnNow | null, t: number) => void) {
  out.spots = spots;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const N = sp ? enNow(sp.motion as EnMotion, t, enPhase(g.getWorldPosition(tmp)), (sp.at.userData.height as number | undefined) ?? 1.6) : null;
    show(now, N, t);
  };
}
/** A picture drawn afresh while something's going on: one small canvas, made when first needed. */
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

/** The handheld mic: its grip's middle at the group, laid along to where its tip goes. */
function handMic(g: THREE.Object3D): { root: THREE.Group; lay(grip: V | null | undefined, tip: V | null | undefined): void } {
  const root = group(g);
  part(root, cyl(0.016, 0.012, 0.15, 10), BLACK, 0, 0.03, 0, { outline: false });
  part(root, cyl(0.022, 0.018, 0.02, 10), CHROME, 0, 0.11, 0, { outline: false });
  part(root, ball(0.03), '#9ea7ad', 0, 0.14, 0, { outline: false });
  root.visible = false;
  return {
    root,
    lay(grip, tip) {
      root.visible = !!grip;
      if (!grip) return;
      place(root, grip);
      if (tip) root.quaternion.setFromUnitVectors(UP, tmp.set(tip[0] - grip[0], tip[1] - grip[1], tip[2] - grip[2]).normalize());
    },
  };
}
function pen(g: THREE.Object3D, color = '#1a237e'): THREE.Mesh {
  const m = part(g, cyl(0.006, 0.006, 0.13, 6), color, 0, 0, 0, { rz: 1.2, ry: 0.5, outline: false });
  m.visible = false;
  return m;
}
const showAt = (m: THREE.Object3D, p: V | null | undefined) => {
  m.visible = !!p;
  if (p) place(m, p);
};
function glassOf(g: THREE.Object3D, color = '#b3e5fc'): { root: THREE.Group; fill(x: number): void } {
  const root = group(g);
  part(root, cyl(0.036, 0.03, 0.11, 12), '#e1f5fe', 0, 0, 0, { outline: false });
  const drink = part(root, cyl(0.03, 0.026, 0.09, 12), color, 0, -0.008, 0, { outline: false });
  return {
    root,
    fill(x) {
      const k = Math.max(0.02, x);
      drink.scale.y = k;
      drink.position.y = -0.052 + 0.045 * k;
    },
  };
}
const cardTex = (s: string, color: string) =>
  painted(`enCard|${s}|${color}`, 96, 64, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 96, 64);
    c.fillStyle = color;
    c.fillRect(0, 0, 96, 12);
    text(c, s, 48, 36, 13, '#37474f', 'center');
    c.fillStyle = 'rgba(55,71,79,0.3)';
    c.fillRect(10, 52, 76, 2);
  });

// ---------------------------------------------------------------------------------------------
// People. Drawn, and played by a VRoid body when one can be had; arms to a point and a head that turns.

interface Look {
  top: string;
  bottom: string;
  hair: string;
  skin?: string;
  bob?: boolean;
  jacket?: string;
}
const LOOKS: Record<string, Look> = {
  mc: { top: '#fafafa', bottom: '#212121', hair: '#1f1a17', jacket: '#311b92' },
  junior: { top: '#fbc02d', bottom: '#37474f', hair: '#2b1b10', skin: '#eac09a' },
  writer: { top: '#90a4ae', bottom: '#263238', hair: '#5b3a1e', bob: true, skin: '#f8d9c0' },
  bartender: { top: '#fafafa', bottom: '#212121', hair: '#1a1a1a', jacket: '#212121' },
  guitar: { top: '#6a1b9a', bottom: '#212121', hair: '#3b2a20', skin: '#c99a6e' },
  singer: { top: '#00897b', bottom: '#37474f', hair: '#1a1a1a', bob: true, skin: '#f8d9c0' },
};
const GUESTS: Look[] = [
  { top: '#c62828', bottom: '#263238', hair: '#1f1a17', bob: true, skin: '#f8d9c0' },
  { top: '#455a64', bottom: '#37474f', hair: '#2b1b10' },
  { top: '#f9a825', bottom: '#3e2723', hair: '#5b3a1e', bob: true, skin: '#eac09a' },
  { top: '#00695c', bottom: '#212121', hair: '#1a1a1a', skin: '#c99a6e' },
  { top: '#ad1457', bottom: '#263238', hair: '#3b2a20', bob: true },
  { top: '#3949ab', bottom: '#37474f', hair: '#1f1a17', skin: '#f1c9a5' },
];
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
function person(parent: THREE.Object3D, look: Look, seat?: number): Figure {
  const root = group(parent);
  const skin = look.skin ?? '#f1c9a5';
  const sat = seat !== undefined;
  const sh = seat ?? 0;
  const shoulderY = sat ? sh + 0.53 : 1.31;
  const torsoY = sat ? sh + 0.33 : 1.11;
  if (sat) {
    for (const sx of [-1, 1]) {
      const knee = v3(sx * 0.1, sh + 0.1, 0.36);
      const ankle = v3(sx * 0.1, Math.max(0.1, sh - 0.33), 0.46);
      rod(root, v3(sx * 0.09, sh + 0.07, -0.03), knee, 0.062, look.bottom);
      rod(root, knee, ankle, 0.05, look.bottom);
      part(root, rbox(0.09, 0.07, 0.2, 0.03), BLACK, sx * 0.1, ankle.y - 0.035, ankle.z + 0.05);
    }
    part(root, rbox(0.31, 0.15, 0.26, 0.06), look.bottom, 0, sh + 0.08, 0);
  } else {
    for (const sx of [-1, 1]) {
      rod(root, v3(sx * 0.085, 0.84, 0), v3(sx * 0.09, 0.08, 0.01), 0.056, look.bottom);
      part(root, rbox(0.09, 0.07, 0.2, 0.03), BLACK, sx * 0.09, 0.035, 0.04);
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
  for (const sx of [-1, 1]) part(head, ball(0.012), '#2b2b30', sx * 0.04, 0, 0.104, { outline: false });
  part(head, box(0.03, 0.006, 0.004), '#a1665e', 0, -0.045, 0.104, { outline: false });
  part(head, ball(0.118), look.hair, 0, 0.03, -0.03);
  part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0, 0.075, 0.075, { rx: -0.25 });
  if (look.bob) for (const sx of [-1, 1]) part(head, rbox(0.05, 0.16, 0.14, 0.025), look.hair, sx * 0.1, -0.03, -0.02);
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
/** Someone made the first time they're wanted (most pieces aren't used on a given day; bodies are few), then shown where they're told. */
function cast(parent: THREE.Object3D, look: Look, opts: FigureOptions = {}) {
  let f: Figure | null = null;
  return {
    at(p: V, yaw: number): Figure {
      f ??= vroidFigure(person(parent, look, opts.seat), opts);
      f.root.visible = true;
      place(f.root, p);
      f.root.rotation.y = yaw;
      return f;
    },
    hide() {
      if (f) f.root.visible = false;
    },
  };
}
/** Arms to points in the piece's frame, or back to rest; the head turned and tipped. */
function aim(f: Figure, l: V | null | undefined, r: V | null | undefined, turn = 0, tip = 0) {
  f.armL(l ? vec(l) : null);
  f.armR(r ? vec(r) : null);
  f.head.rotation.set(tip, turn, 0);
}
/** A point in someone's own frame (x to their left, y up, z ahead), in the frame they're placed in. */
const from = (p: V, yaw: number, x: number, y: number, z: number): V => [p[0] + Math.cos(yaw) * x + Math.sin(yaw) * z, p[1] + y, p[2] - Math.sin(yaw) * x + Math.cos(yaw) * z];
const beat = (t: number, hz: number, ph = 0) => Math.sin((t * hz + ph) * Math.PI * 2);

// =============================================================================================
// 스탠드 마이크 (standupMic): the corner of the room where a set's worked out. A square of worn carpet with a taped
// mark, a mic on a round-base stand, a foot monitor, a music stand with the notebook, water on the floor.

const notebookTex = (i: number) =>
  painted(`enNote${i}`, 96, 128, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 96, 128);
    c.strokeStyle = '#cfd8dc';
    for (let k = 0; k < 8; k++) {
      c.beginPath();
      c.moveTo(4, 18 + k * 14);
      c.lineTo(92, 18 + k * 14);
      c.stroke();
    }
    text(c, '오늘의 소재', 6, 9, 10, '#c62828');
    const r = seeded(31 + i);
    const n = Math.min(8, 2 + i * 2);
    for (let k = 0; k < n; k++) {
      c.fillStyle = '#1a237e';
      c.fillRect(6, 13 + k * 14, 34 + r() * 50, 2.4);
    }
    if (i >= 3) {
      c.strokeStyle = '#c62828';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(6, 42);
      c.lineTo(84, 42);
      c.stroke();
    }
  });
function standupMic(g: THREE.Group, out: Built) {
  flat(g, painted('enRug', 128, 128, (c) => {
    c.fillStyle = '#5e2d2d';
    c.fillRect(0, 0, 128, 128);
    const r = seeded(9);
    for (let i = 0; i < 260; i++) {
      c.fillStyle = `rgba(${r() > 0.5 ? '255,220,180' : '0,0,0'},${0.03 + r() * 0.05})`;
      c.fillRect(r() * 128, r() * 128, 3, 3);
    }
    c.strokeStyle = '#d4a373';
    c.lineWidth = 3;
    c.strokeRect(6, 6, 116, 116);
    // Worn where the feet go.
    c.fillStyle = 'rgba(190,150,120,0.25)';
    c.beginPath();
    c.ellipse(64, 74, 26, 20, 0, 0, 6.3);
    c.fill();
  }), 0.96, 0.96, 0, 0.006, 0);
  // The taped mark.
  for (const [a, b] of [[0.7, 0], [-0.7, 0]] as const) part(g, box(0.2, 0.002, 0.03), MUSTARD, MS.mark[0], 0.012, MS.mark[2], { outline: false, ry: a + b });
  // The stand.
  part(g, cyl(0.13, 0.14, 0.02, 16), BLACK, MS.stand[0], 0.016, MS.stand[2]);
  part(g, cyl(0.012, 0.012, 1.28, 6), STEEL, MS.stand[0], 0.66, MS.stand[2], { outline: false });
  part(g, cyl(0.02, 0.02, 0.05, 8), BLACK, MS.stand[0], 0.76, MS.stand[2], { outline: false });
  part(g, cyl(0.012, 0.012, 0.16, 6), BLACK, 0, 1.33, MS.stand[2] - 0.06, { rx: Math.PI / 2 + 0.5, outline: false });
  const clip = handMic(g);
  const onStand = group(g);
  part(onStand, cyl(0.016, 0.012, 0.15, 10), BLACK, 0, 0, 0, { outline: false });
  part(onStand, ball(0.03), '#9ea7ad', 0, 0.09, 0, { outline: false });
  onStand.position.set(MS.head[0], MS.head[1] - 0.06, MS.head[2] + 0.02);
  onStand.rotation.x = -0.5;
  // A coiled cable along the floor.
  const cable = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.006, 6, 18), new THREE.MeshBasicMaterial({ color: '#17171a' }));
  cable.userData.ownGeometry = cable.userData.ownMaterial = true;
  cable.rotation.x = Math.PI / 2;
  cable.position.set(0.26, 0.016, 0.28);
  g.add(cable);
  rod(g, v3(0, 0.02, 0.24), v3(0.18, 0.012, 0.28), 0.005, '#17171a');
  // The foot monitor, looking back up at whoever's on the mark.
  const wedge = group(g, -0.3, 0, 0.38);
  part(wedge, rbox(0.36, 0.2, 0.22, 0.02), '#26262a', 0, 0.1, 0, { rx: 0.5 });
  part(wedge, cyl(0.07, 0.07, 0.01, 16), '#4a4a50', 0, 0.12, -0.11, { rx: Math.PI / 2 + 0.5, outline: false });
  const wedgeLed = ownLit(wedge, ball(0.008), '#264d2a', 0.14, 0.17, -0.08);
  // A music stand with the notebook.
  part(g, cyl(0.1, 0.11, 0.012, 3), BLACK, MS.book[0], 0.01, MS.book[2]);
  part(g, cyl(0.008, 0.008, 1.0, 6), BLACK, MS.book[0], 0.5, MS.book[2], { outline: false });
  const desk = group(g, MS.book[0], MS.book[1], MS.book[2] + 0.02);
  desk.rotation.x = -0.75;
  part(desk, box(0.34, 0.24, 0.01), BLACK, 0, 0, 0);
  const page = swapPic(desk, 0.19, 0.25, 0, 0, 0.008);
  page.set(notebookTex(2));
  // Water.
  const bottle = group(g);
  part(bottle, cyl(0.032, 0.034, 0.17, 10), '#81d4fa', 0, 0, 0);
  part(bottle, cyl(0.018, 0.024, 0.02, 8), '#eceff1', 0, 0.095, 0, { outline: false });
  place(bottle, [MS.bottle[0], 0.085, MS.bottle[2]]);
  const nib = pen(g, '#c62828');
  const junior = cast(g, LOOKS.junior, { gender: 'male', seed: 51 });
  const spots: Record<string, Spot> = { tellJokes: standAt(g, 'enBit'), entertainer_coachComedians: standAt(g, 'enCoach') };
  spots['*'] = spots.tellJokes;
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    setLit(wedgeLed, now ? '#69f0ae' : '#264d2a');
    clip.lay(P.mic, P.tip);
    onStand.visible = (n.taken ?? 0) < 0.5 && !P.mic && !(Math.round(n.jr ?? 0) === 1 || Math.round(n.jr ?? 0) === 3);
    const b = P.bottle;
    place(bottle, b ?? [MS.bottle[0], 0.085, MS.bottle[2]]);
    showAt(nib, P.pen);
    page.set(notebookTex((n.inked ?? 0) > 0.5 ? 3 : 2));
    const jr = Math.round(n.jr ?? 0);
    if (now === 'entertainer_coachComedians' && jr) {
      // On the mark with the mic, or stood aside watching.
      const atMic = jr === 1 || jr === 3;
      const p = jr === 1 || jr === 3 ? MS.junior : MS.aside;
      const yaw = jr === 3 ? 0.9 : jr === 2 ? 1.1 : 0;
      const f = junior.at(p, yaw);
      const good = (n.jq ?? 0) > 0.5;
      const mouth = from(p, yaw, -0.07, 1.26, 0.2);
      if (atMic && jr === 1) {
        // Stiff and fast the first time, loose the second.
        aim(f, from(p, yaw, 0.24, (good ? 1.0 : 0.85) + 0.07 * beat(t, good ? 0.8 : 2), 0.26), mouth);
        clip.lay(mouth, from(p, yaw, -0.03, 1.38, 0.12));
      } else if (atMic) {
        aim(f, from(p, yaw, 0.2, 0.95, 0.2), from(p, yaw, -0.2, 0.95, 0.2), 0, 0.12 * Math.abs(beat(t, 0.9)));
        clip.lay(from(p, yaw, -0.2, 0.92, 0.2), from(p, yaw, -0.18, 1.04, 0.22));
      } else {
        aim(f, (n.jrLaugh ?? 0) > 0.5 ? from(p, yaw, 0.1, 1.0, 0.1 + 0.03 * beat(t, 3)) : null, null);
      }
    } else junior.hide();
  });
  out.work = marker(g, MS.head[0], MS.head[1], MS.head[2]);
}

// =============================================================================================
// 클럽 무대 (clubStage): the deck, brick and neon as they were (furniturePlatform.ts). On it now: the club's name on
// the bricks, a foot monitor, the warning light, the set list taped down; the mic that comes off; the followspot.

function clubStage(g: THREE.Group, out: Built) {
  const h = SG.h;
  const micHead = g.children.find((c) => c.type === 'Group' && Math.abs(c.rotation.x - 0.55) < 1e-3);
  // The club's name, lit on the bricks by the ring.
  picture(g, painted('enClubName', 256, 96, (c) => {
    c.clearRect(0, 0, 256, 96);
    c.fillStyle = '#2a1410';
    c.fillRect(0, 0, 256, 96);
    text(c, '허허', 128, 38, 42, '#ffd740', 'center');
    text(c, '코미디 클럽', 128, 78, 20, NEON, 'center');
  }), 0.7, 0.26, 0.82, h + 1.75, -0.86);
  // A monitor at each side of the lip.
  for (const sx of [-1, 1]) {
    const w = group(g, sx * 1.0, h, 0.82, sx * 0.25);
    part(w, rbox(0.42, 0.18, 0.24, 0.02), '#26262a', 0, 0.09, 0, { rx: 0.55 });
    part(w, cyl(0.065, 0.065, 0.01, 14), '#4a4a50', 0, 0.11, -0.115, { rx: Math.PI / 2 + 0.55, outline: false });
  }
  // The warning light on the back wall: red when time's up.
  part(g, rbox(0.14, 0.14, 0.05, 0.02), BLACK, -1.2, h + 2.1, -0.86);
  const warn = ownLit(g, ball(0.045), '#4a1414', -1.2, h + 2.1, -0.82);
  // The running order taped to the deck.
  flat(g, painted('enTaped', 96, 128, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 96, 128);
    text(c, '오늘 순서', 48, 12, 11, '#c62828', 'center');
    ['1 지하철', '2 엄마 전화', '3 회사 회식', '4 편의점', '5 소개팅', '6 마무리'].forEach((s, i) => text(c, s, 8, 34 + i * 15, 11, '#37474f'));
  }), 0.2, 0.27, SG.sheet[0] + 0.1, SG.sheet[1], SG.sheet[2] + 0.1, 0.25);
  // The rehearsal's mark, once it's down; the props of the day.
  const tape = group(g);
  for (const a of [0.7, -0.7]) part(tape, box(0.22, 0.002, 0.035), MUSTARD, SG.tape[0], SG.tape[1] + 0.003, SG.tape[2], { ry: a, outline: false });
  const mic = handMic(g);
  // The glass on the stool: the one drawn with it goes when this one's picked up.
  const onStool = g.children.find((c) => c.position.distanceTo(tmp.set(SG.water[0], SG.water[1], SG.water[2])) < 0.01);
  const glass = glassOf(g);
  glass.root.visible = false;
  const sheet = group(g);
  part(sheet, box(0.2, 0.004, 0.28), PAPER, 0, 0, 0, { outline: false, rx: 0.55 });
  sheet.visible = false;
  const phone = group(g);
  part(phone, rbox(0.07, 0.012, 0.14, 0.004), BLACK, 0, 0, 0);
  ownLit(phone, box(0.06, 0.002, 0.12), '#26c6da', 0, 0.008, 0);
  phone.visible = false;
  const clip = group(g);
  part(clip, box(0.24, 0.01, 0.32), WALNUT, 0, 0, 0, { rx: 0.6 });
  part(clip, box(0.2, 0.012, 0.27), PAPER, 0, 0.002, 0.006, { outline: false, rx: 0.6 });
  part(clip, box(0.09, 0.016, 0.03), STEEL, 0, 0.09, -0.12, { outline: false, rx: 0.6 });
  clip.visible = false;
  const nib = pen(g, '#c62828');
  // The light that follows them, and the wash from the console.
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.62, 2.5, 18, 1, true), new THREE.MeshBasicMaterial({ color: '#ffe0a8', transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  beam.userData.ownGeometry = beam.userData.ownMaterial = true;
  beam.renderOrder = 3;
  beam.visible = false;
  g.add(beam);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(0.62, 26), new THREE.MeshBasicMaterial({ color: '#ffe0a8', transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending }));
  pool.userData.ownGeometry = pool.userData.ownMaterial = true;
  pool.rotation.x = -Math.PI / 2;
  pool.visible = false;
  pool.renderOrder = 2;
  g.add(pool);
  const wash = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 1.9), new THREE.MeshBasicMaterial({ color: '#ff4081', transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending }));
  wash.userData.ownGeometry = wash.userData.ownMaterial = true;
  wash.rotation.x = -Math.PI / 2;
  wash.position.set(0, h + 0.006, 0);
  wash.visible = false;
  wash.renderOrder = 2;
  g.add(wash);
  // Who else is up there.
  const mc = cast(g, LOOKS.mc, { gender: 'male', seed: 61 });
  const guitarist = cast(g, LOOKS.guitar, { gender: 'male', seed: 62 });
  const singer = cast(g, LOOKS.singer, { gender: 'female', seed: 63 });
  const guitar = group(g);
  part(guitar, rbox(0.3, 0.38, 0.08, 0.1), '#a0522d', 0, 0, 0);
  part(guitar, cyl(0.05, 0.05, 0.005, 12), BLACK, 0, 0.03, 0.042, { rx: Math.PI / 2, outline: false });
  part(guitar, box(0.05, 0.42, 0.03), WALNUT_D, 0, 0.38, 0);
  guitar.visible = false;
  const stageMic = handMic(g);
  const spots: Record<string, Spot> = { rehearseSet: standAt(g, 'enRehearse'), headlineShow: standAt(g, 'enHeadline'), entertainer_openingSet: standAt(g, 'enOpening'), entertainer_lineupPlan: standAt(g, 'enLineup') };
  spots['*'] = spots.rehearseSet;
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    // The stand's own mic stays on it until it's taken.
    if (micHead) micHead.visible = !((n.taken ?? 0) > 0.5 || P.mic) && now !== 'entertainer_lineupPlan';
    mic.lay(P.mic, P.tip);
    glass.root.visible = !!P.glass;
    if (onStool) onStool.visible = !P.glass;
    if (P.glass) place(glass.root, P.glass);
    glass.fill(1);
    showAt(sheet, P.sheet);
    showAt(phone, P.phone);
    showAt(clip, P.clip);
    showAt(nib, P.pen);
    tape.visible = (n.taped ?? 0) > 0.05 && now === 'rehearseSet';
    tape.scale.setScalar(tape.visible ? Math.max(0.05, n.taped ?? 0) : 1);
    if (tape.visible) tape.position.set(SG.tape[0] * (1 - tape.scale.x), SG.tape[1] * (1 - tape.scale.x), SG.tape[2] * (1 - tape.scale.x));
    setLit(warn, (n.timer ?? 0) > 0.85 && Math.sin(t * 10) > -0.2 ? '#ff1744' : '#4a1414');
    // The followspot on the one working the room.
    const on = (n.beam ?? 0) > 0.5 && !!N;
    beam.visible = on;
    pool.visible = on;
    if (on && N) {
      beam.position.set(N.st.x, h + 1.25, N.st.z);
      pool.position.set(N.st.x, h + 0.008, N.st.z);
    }
    // The console's light cues.
    const fresh = Math.abs(t - EN_NOW.washT) < 0.6;
    wash.visible = fresh && EN_NOW.wash > 0.5;
    if (wash.visible) (wash.material as THREE.MeshBasicMaterial).color.set(['#000000', '#ff4081', '#40c4ff', '#ffd740'][Math.round(EN_NOW.wash)] ?? '#ffffff');
    // Tell the room.
    if (now) {
      EN_NOW.house = n.house ?? 0;
      EN_NOW.laugh = n.laugh ?? 0;
      EN_NOW.clap = n.clap ?? 0;
      EN_NOW.pick = (n.pick ?? 0) > 0.5 ? ((n.answer ?? 0) > 0.5 ? 1 : 0) : -1;
      EN_NOW.heckle = n.heckle ?? 0;
      EN_NOW.t = t;
    }
    // The MC brings them on and takes them off.
    const m = Math.round(n.mc ?? 0);
    if (now === 'entertainer_openingSet' && m > 0) {
      const f = mc.at(m === 2 ? SG.mc : SG.mc, m === 2 ? Math.PI / 2 - 0.2 : 0.5);
      if (m === 2) {
        aim(f, [SG.mc[0] + 0.1, h + 1.1, SG.mc[2] + 0.06], P.mic ? [SG.mc[0] + 0.14, h + 1.02, SG.mc[2] + 0.02] : null);
      } else {
        const hand = from(SG.mc, 0.5, -0.07, 1.26, 0.2);
        const arm = from(SG.mc, 0.5, 0.3, 1.18 + 0.08 * beat(t, 0.7), 0.2);
        aim(f, arm, hand);
        stageMic.lay(hand, from(SG.mc, 0.5, -0.03, 1.38, 0.12));
      }
    } else mc.hide();
    if (!(now === 'entertainer_openingSet' && m === 1)) stageMic.lay(null, null);
    // The band of the lineup: the guitar, the voice at the lip.
    if (now === 'entertainer_lineupPlan') {
      const ga = (n.pa ?? 0) > 0.5;
      const f = guitarist.at(SG.guitar, 0.25);
      const chord = from(SG.guitar, 0.25, 0.3, 1.1, 0.25);
      const strum = from(SG.guitar, 0.25, -0.08, 0.92 + (ga ? 0.05 * beat(t, 2.8) : 0), 0.2);
      aim(f, chord, strum, 0, 0.18);
      guitar.visible = true;
      place(guitar, from(SG.guitar, 0.25, 0.02, 0.92, 0.14));
      guitar.rotation.set(0, 0.25, -1.15);
      const sing = (n.pb ?? 0) > 0.5;
      const f2 = singer.at(SG.singer, -0.3);
      const held = from(SG.singer, -0.3, -0.07, 1.26, 0.2);
      aim(f2, sing ? from(SG.singer, -0.3, 0.26, 1.0 + 0.1 * beat(t, 0.6), 0.2) : null, held);
      stageMic.lay(held, from(SG.singer, -0.3, -0.03, 1.38, 0.12));
    } else {
      guitarist.hide();
      singer.hide();
      guitar.visible = false;
    }
  });
}

// =============================================================================================
// 객석 테이블 (enHouseRow, 3 × 1): three bentwood chairs and two little round tables with candles. Empty until a
// show's on; then people, who laugh and clap as the stage says (EN_NOW).

function enHouseRow(g: THREE.Group, out: Built, W: number) {
  const n = Math.max(1, Math.round(W));
  const xs = Array.from({ length: n }, (_, i) => -W / 2 + i + 0.5);
  const SEAT = 0.46;
  const Z = -0.12;
  for (const x of xs) {
    part(g, rbox(0.4, 0.04, 0.38, 0.03), WALNUT, x, SEAT - 0.02, Z);
    part(g, rbox(0.38, 0.05, 0.03, 0.012), WALNUT, x, 0.84, Z - 0.2);
    for (const s of [-1, 1]) {
      rod(g, v3(x + s * 0.16, SEAT - 0.04, Z - 0.17), v3(x + s * 0.16, 0.84, Z - 0.2), 0.012, WALNUT_D);
      rod(g, v3(x + s * 0.17, 0, Z + 0.16), v3(x + s * 0.16, SEAT - 0.04, Z + 0.14), 0.014, WALNUT_D);
      rod(g, v3(x + s * 0.17, 0, Z - 0.18), v3(x + s * 0.16, SEAT - 0.04, Z - 0.14), 0.014, WALNUT_D);
    }
  }
  const flames: THREE.Mesh[] = [];
  const r = seeded(Math.round(W) * 13 + 3);
  for (let i = 0; i < n - 1; i++) {
    const x = xs[i] + 0.5;
    const z = 0.28;
    part(g, cyl(0.2, 0.2, 0.025, 18), '#2a2622', x, 0.68, z);
    part(g, cyl(0.022, 0.03, 0.66, 8), BLACK, x, 0.34, z, { outline: false });
    part(g, cyl(0.13, 0.15, 0.015, 14), BLACK, x, 0.01, z);
    // A candle in a red glass, drinks, a bowl of peanuts.
    part(g, cyl(0.03, 0.026, 0.06, 10), '#c62828', x + 0.05, 0.722, z - 0.05, { outline: false });
    flames.push(ownLit(g, ball(0.012), '#ffb74d', x + 0.05, 0.765, z - 0.05));
    part(g, cyl(0.032, 0.026, 0.11, 10), '#ffcc80', x - 0.09, 0.75, z + 0.03, { outline: false });
    part(g, cyl(0.034, 0.03, 0.02, 10), '#fffde7', x - 0.09, 0.81, z + 0.03, { outline: false });
    if (r() > 0.3) part(g, cyl(0.022, 0.03, 0.14, 8), '#2e7d32', x + 0.1, 0.765, z + 0.07, { outline: false });
    part(g, cyl(0.055, 0.04, 0.03, 10), '#eceff1', x - 0.02, 0.71, z + 0.11, { outline: false });
  }
  const people = xs.map((_, i) => cast(g, GUESTS[(i + Math.round(W * 7)) % GUESTS.length], { seat: SEAT, seed: 70 + i * 3 + Math.round(W), gender: i % 2 ? 'male' : 'female' }));
  // Which row of the room, so that only one is picked on and one heckles.
  let rowFirst = true;
  let tested = false;
  out.away = (_o, t) => {
    if (!tested) {
      tested = true;
      // The two rows are five tiles apart, so one comes out odd and one even.
      rowFirst = Math.abs(Math.floor(g.getWorldPosition(tmp).x)) % 2 === 1;
    }
    const on = Math.abs(t - EN_NOW.t) < 0.6 && EN_NOW.house > 0.5;
    for (const fl of flames) fl.scale.setScalar(1 + 0.2 * Math.sin(t * 11 + fl.position.x * 7));
    xs.forEach((x, i) => {
      const who = people[i];
      if (!on) return who.hide();
      const p: V = [x, 0, Z];
      const f = who.at(p, 0);
      const k = i * 0.31;
      const lf = EN_NOW.laugh;
      const y0 = SEAT + 0.4;
      // Picked on: the arm comes up and they answer. Heckling: up with a cupped hand.
      if (rowFirst && i === 1 && EN_NOW.heckle > 0.5) {
        aim(f, [x + 0.14, y0 + 0.6, Z + 0.1], [x - 0.08, y0 + 0.26, Z + 0.1], 0, -0.1);
      } else if (!rowFirst && i === 0 && EN_NOW.pick >= 0) {
        aim(f, EN_NOW.pick === 1 ? [x + 0.1, y0 + 0.5, Z + 0.1] : null, null, 0, -0.05);
      } else if (EN_NOW.clap > 0.25) {
        // Applause: hands together in front, out of step with one another.
        const g2 = 0.03 + 0.05 * Math.abs(beat(t, 1.7, k));
        aim(f, [x + g2, y0 + 0.02, Z + 0.3], [x - g2, y0 + 0.02, Z + 0.3], 0, -0.08);
      } else if (lf > 0.3) {
        // Laughing: back goes the head; one holds their stomach, one slaps the table, one covers their mouth.
        const kind = (i + Math.round(W)) % 3;
        const shake = 0.012 * lf * beat(t, 3.2, k);
        f.root.position.y = Math.abs(shake) * 2;
        if (kind === 0) aim(f, [x + 0.08, SEAT + 0.28 + shake, Z + 0.22], [x - 0.08, SEAT + 0.28 + shake, Z + 0.22], 0.08 * beat(t, 0.5, k), -0.2 * lf);
        else if (kind === 1) aim(f, [x + 0.12, SEAT + 0.25, Z + 0.3], [x - 0.25, 0.76 + 0.05 * Math.abs(beat(t, 2, k)), Z + 0.3], 0, -0.18 * lf);
        else aim(f, [x + 0.04, SEAT + 0.66, Z + 0.14], [x - 0.12, SEAT + 0.22, Z + 0.26], -0.1, 0.1 * beat(t, 3, k));
      } else {
        // Watching: one with a drink now and then, a head turning to a neighbour.
        const sip = Math.sin(t * 0.3 + k * 9) > 0.92;
        aim(f, null, sip ? [x - 0.1, SEAT + 0.56, Z + 0.2] : null, 0.14 * Math.sin(t * 0.2 + k * 4), 0.04);
      }
    });
  };
  out.work = marker(g, 0, 0.7, 0.28);
}

// =============================================================================================
// 대본 책상 (jokeDesk): a writer's corner of a desk. Top against the wall, a chair at its front; a lamp, a laptop shut
// behind the notebook because you write it by hand first, index cards, coffee, a bin of balled-up tries, a pinboard.

function jokeDesk(g: THREE.Group, out: Built) {
  const T = DK.top;
  part(g, rbox(0.96, 0.04, 0.6, 0.01), WALNUT, 0, T - 0.02, -0.18);
  for (const x of [-0.44, 0.44]) part(g, box(0.05, T - 0.04, 0.54), WALNUT_D, x, (T - 0.04) / 2, -0.18);
  part(g, box(0.84, 0.3, 0.02), WALNUT_D, 0, T - 0.2, -0.44);
  // A drawer with its notes sticking out.
  part(g, rbox(0.3, 0.12, 0.42, 0.012), '#6d4c41', -0.24, T - 0.1, -0.16);
  part(g, cyl(0.012, 0.012, 0.04, 8), CHROME, -0.24, T - 0.1, 0.06, { rx: Math.PI / 2, outline: false });
  // The lamp.
  part(g, cyl(0.06, 0.07, 0.02, 12), BLACK, -0.36, T + 0.012, -0.36);
  rod(g, v3(-0.36, T + 0.02, -0.36), v3(-0.38, T + 0.36, -0.3), 0.009, BLACK);
  rod(g, v3(-0.38, T + 0.36, -0.3), v3(-0.2, T + 0.42, -0.2), 0.009, BLACK);
  part(g, cyl(0.03, 0.08, 0.08, 14), '#2e7d32', -0.18, T + 0.39, -0.18, { outline: false });
  const bulb = ownLit(g, ball(0.024), '#7a7355', -0.18, T + 0.36, -0.18);
  // The shut laptop, the mug of pens.
  part(g, rbox(0.34, 0.022, 0.24, 0.008), '#90a4ae', 0.12, T + 0.012, -0.32);
  part(g, cyl(0.04, 0.036, 0.1, 12), '#ad1457', 0.36, T + 0.05, -0.34);
  for (const [dx, c] of [[-0.01, '#c62828'], [0.012, '#1a237e'], [0, '#37474f']] as const) part(g, cyl(0.004, 0.004, 0.14, 6), c, 0.36 + dx, T + 0.13, -0.34 + dx, { rz: dx * 8, outline: false });
  // The paper: the notebook or the printed script, open on the desk.
  const bookRest = group(g);
  part(bookRest, box(0.36, 0.012, 0.26), '#6a1b9a', 0, 0, 0);
  const bookPage = swapPic(bookRest, 0.34, 0.245, 0, 0.0075, 0, 0, -Math.PI / 2);
  const printed = live(204, 148);
  place(bookRest, DK.book);
  // Index cards and a stack of them.
  for (let i = 0; i < 5; i++) part(g, box(0.15, 0.004, 0.1), i % 2 ? '#fff9c4' : PAPER, DK.cards[0], T + 0.004 + i * 0.004, DK.cards[2], { ry: 0.05 * i - 0.1, outline: false });
  const heldCard = picture(g, cardTex('소재', MUSTARD), 0.15, 0.1, 0, 0, 0);
  heldCard.visible = false;
  // The coffee.
  const cup = group(g);
  part(cup, cyl(0.04, 0.034, 0.09, 12), '#fafafa', 0, 0, 0);
  part(cup, cyl(0.036, 0.036, 0.004, 12), '#4e342e', 0, 0.044, 0, { outline: false });
  place(cup, DK.coffee);
  // The bin with its tries; the one going in.
  part(g, cyl(0.12, 0.09, 0.27, 12), '#37474f', DK.bin[0], 0.135, DK.bin[2]);
  for (const [dx, dz] of [[0.03, 0.02], [-0.04, 0.01], [0, -0.05]] as const) part(g, ball(0.04), PAPER, DK.bin[0] + dx, 0.27, DK.bin[2] + dz);
  const ball1 = part(g, ball(0.05), PAPER, 0, 0, 0);
  ball1.visible = false;
  const binned = part(g, ball(0.035), PAPER, DK.bin[0] - 0.02, 0.3, DK.bin[2] + 0.03);
  binned.visible = false;
  // The leaf being torn out.
  const leaf = part(g, box(0.17, 0.003, 0.24), PAPER, DK.book[0] + 0.09, DK.book[1] + 0.012, DK.book[2], { outline: false });
  leaf.visible = false;
  // The pinboard over it.
  part(g, rbox(0.84, 0.54, 0.02, 0.008), CORK, 0, 1.36, -0.47);
  const r = seeded(77);
  const pinnedCards: THREE.Mesh[] = [];
  const jokes = ['지하철', '엄마 전화', '소개팅', '회식', '택배', '다이어트', '편의점'];
  for (let i = 0; i < 6; i++) {
    const c = picture(g, cardTex(jokes[i], ['#ff7043', '#42a5f5', '#66bb6a', MUSTARD][i % 4]), 0.18, 0.12, -0.3 + (i % 3) * 0.3 + (r() - 0.5) * 0.03, 1.5 - Math.floor(i / 3) * 0.2 + (r() - 0.5) * 0.04, -0.455);
    c.rotation.z = (r() - 0.5) * 0.14;
    pinnedCards.push(c);
  }
  const pinNew = picture(g, cardTex(jokes[6], '#ec407a'), 0.18, 0.12, DK.note[0] + 0.02, DK.note[1] - 0.04, -0.452);
  pinNew.visible = false;
  // The chair at its front.
  deskChair(g, DK.seat[2] - 0.2);
  const wr = pen(g);
  const co = cast(g, LOOKS.writer, { gender: 'female', seed: 81 });
  let sheetFig: THREE.Group | null = null;
  const spots: Record<string, Spot> = { writeJokes: standAt(g, 'enWrite'), entertainer_punchlineEdit: standAt(g, 'enPunch') };
  spots['*'] = spots.writeJokes;
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    setLit(bulb, now ? '#fff3bf' : '#7a7355');
    showAt(wr, P.pen);
    place(cup, P.cup ?? DK.coffee);
    ball1.visible = !!P.ball;
    if (P.ball) {
      place(ball1, P.ball);
      ball1.scale.setScalar(n.ballSize ?? 1);
    }
    binned.visible = (n.binned ?? 0) > 0.5;
    heldCard.visible = !!P.card;
    if (P.card) {
      place(heldCard, P.card);
      heldCard.rotation.set(P.card[1] > 1 ? 0 : -Math.PI / 2, 0, 0);
    }
    pinNew.visible = (n.pinned ?? 0) > 0.5;
    leaf.visible = (n.leaf ?? 0) > 0.01 && (n.leaf ?? 0) < 0.99;
    if (leaf.visible) leaf.rotation.z = (n.leaf ?? 0) * 0.9;
    // The notebook goes up with them to be read, or a printed script takes its place.
    place(bookRest, P.book ?? DK.book);
    bookRest.rotation.x = P.book ? -0.8 : 0;
    if ((n.printed ?? 0) > 0.5) {
      const struck = n.struck ?? 0;
      const redo = n.redo ?? 0;
      const star = n.star ?? 0;
      bookPage.set(printed((c) => {
        c.fillStyle = PAPER;
        c.fillRect(0, 0, 204, 148);
        text(c, '코너 대본 3고', 8, 11, 11, '#37474f');
        const lines = ['A: 야, 너 왜 이렇게 늦었어?', 'B: 지하철이 나 빼고 다 태웠어.', 'A: 그걸 왜 말을 안 해?', 'B: 내릴 역도 나 빼고 갔어.'];
        lines.forEach((s, i) => text(c, s, 8, 34 + i * 26, 11, '#455a64', 'left', false));
        c.strokeStyle = '#d32f2f';
        c.lineWidth = 2;
        for (const [i, e] of [[1, Math.min(1, struck)], [2, Math.max(0, struck - 1)]] as const) {
          if (e <= 0.01) continue;
          c.beginPath();
          c.moveTo(6, 34 + i * 26);
          c.lineTo(6 + 190 * e, 34 + i * 26);
          c.stroke();
        }
        if (redo > 0.2) text(c, '오늘은 나 빼고 다 왔네?'.slice(0, Math.ceil(12 * Math.min(1, redo))), 14, 48, 11, '#d32f2f');
        if (redo > 1.2) text(c, '뭐라도 말을 해 봐.'.slice(0, Math.ceil(10 * Math.min(1, redo - 1))), 14, 74, 11, '#d32f2f');
        if (star > 0.1) text(c, '★', 186, 74, 16, '#d32f2f');
      }));
    } else bookPage.set(notebookTex(Math.min(6, Math.round(n.page ?? 2))));
    // The other writer: stood at the side to hear it.
    if (now === 'entertainer_punchlineEdit') {
      const m = Math.round(n.mate ?? 0);
      const yaw = -Math.PI / 2 - 0.2;
      const f = co.at(DK.mate, yaw);
      if (m === 2) aim(f, from(DK.mate, yaw, 0.1, 1.02, 0.1), from(DK.mate, yaw, -0.1, 1.02, 0.1), 0.35 * beat(t, 1.1), 0);
      else if (m === 3) aim(f, from(DK.mate, yaw, 0.1, 1.02 + 0.03 * beat(t, 3), 0.1), from(DK.mate, yaw, -0.2, 1.14, 0.24), 0, -0.15);
      else if (m === 4) aim(f, null, from(DK.mate, yaw, -0.06, 1.18, 0.34), 0, 0);
      else aim(f, from(DK.mate, yaw, 0.1, 1.0, 0.14), from(DK.mate, yaw, -0.1, 1.0, 0.14), 0, 0.06);
      // The script in the dweller's hand when they turn to read it.
      if (P.sheet) {
        sheetFig ??= (() => {
          const s = group(g);
          part(s, box(0.2, 0.003, 0.28), PAPER, 0, 0, 0, { outline: false, rx: 0.6 });
          return s;
        })();
        sheetFig.visible = true;
        place(sheetFig, P.sheet);
      } else if (sheetFig) sheetFig.visible = false;
    } else {
      co.hide();
      if (sheetFig) sheetFig.visible = false;
    }
    bookRest.visible = !((n.off ?? 0) > 0.5);
  });
  out.work = marker(g, DK.book[0], DK.book[1], DK.book[2]);
}

// =============================================================================================
// 바 (enBarCounter): the club's bar in the lobby. Copper-railed counter, a back bar of lit bottles and a chalk menu,
// two taps, a stool at the front; a bartender behind who pours and listens.

function barCounter(g: THREE.Group, out: Built, W: number) {
  const T = BR.top;
  // The back bar.
  part(g, box(W - 0.06, 0.8, 0.14), WALNUT_D, 0, 0.4, -0.42);
  part(g, box(W - 0.1, 0.03, 0.17), WALNUT, 0, 0.82, -0.41);
  const glow1 = picture(g, painted('enBackGlow', 128, 32, (c) => {
    const x = c.createLinearGradient(0, 0, 128, 0);
    x.addColorStop(0, '#ff6f00');
    x.addColorStop(0.5, '#ffca28');
    x.addColorStop(1, '#ff6f00');
    c.fillStyle = x;
    c.fillRect(0, 0, 128, 32);
  }), W - 0.1, 0.5, 0, 1.2, -0.47);
  void glow1;
  for (const y of [1.0, 1.42]) part(g, box(W - 0.1, 0.022, 0.13), WALNUT, 0, y, -0.42);
  const rb = seeded(45);
  const bottles = ['#2e7d32', '#6d4c41', '#c62828', '#fbc02d', '#00838f', '#fafafa'];
  for (const y of [1.01, 1.43]) {
    for (let x = -W / 2 + 0.2; x < W / 2 - 0.15; x += 0.14 + rb() * 0.1) {
      if (x > 0.7 && x < 1.3 && y > 1.2) continue;
      const c = bottles[Math.floor(rb() * bottles.length)];
      const h = 0.18 + rb() * 0.08;
      part(g, cyl(0.03, 0.034, h, 8), c, x, y + h / 2 + 0.01, -0.42, { outline: false });
      part(g, cyl(0.012, 0.016, 0.07, 6), c, x, y + h + 0.04, -0.42, { outline: false });
    }
  }
  // The chalk menu.
  picture(g, painted('enBarMenu', 128, 96, (c) => {
    c.fillStyle = '#263238';
    c.fillRect(0, 0, 128, 96);
    text(c, '오늘의 한 잔', 64, 14, 13, '#ffe082', 'center');
    ['생맥주 5,000', '하이볼 7,000', '사이다 2,000', '안주 나쵸 8,000'].forEach((s, i) => text(c, s, 10, 34 + i * 15, 11, '#eceff1', 'left', false));
  }), 0.55, 0.42, 1.0, 1.3, -0.345);
  // The neon over it.
  label(g, '허허 바', 0.6, 0.15, -0.7, 1.82, -0.46, WALNUT_D, MUSTARD);
  // The counter: front panel of tongue and groove, a copper foot rail, the top.
  part(g, rbox(W - 0.1, T - 0.04, 0.3, 0.012), WALNUT_D, 0, (T - 0.04) / 2, 0.22);
  for (let x = -W / 2 + 0.2; x < W / 2 - 0.1; x += 0.18) part(g, box(0.012, T - 0.12, 0.006), WALNUT, x, (T - 0.04) / 2, 0.372, { outline: false });
  part(g, rbox(W - 0.04, 0.05, 0.44, 0.012), '#8d6e63', 0, T - 0.025, 0.2);
  part(g, cyl(0.016, 0.016, W - 0.16, 10), '#d08b53', 0, 0.16, 0.44, { rz: Math.PI / 2 });
  for (let x = -W / 2 + 0.25; x < W / 2; x += (W - 0.5) / 3) part(g, box(0.02, 0.14, 0.09), '#b87333', x, 0.09, 0.41, { outline: false });
  // Taps, a tray of glasses.
  for (const x of [0.86, 1.04]) {
    part(g, cyl(0.022, 0.022, 0.26, 8), CHROME, x, T + 0.13, 0.04);
    part(g, rbox(0.03, 0.09, 0.012, 0.005), x < 1 ? MUSTARD : '#c62828', x, T + 0.3, 0.05);
    part(g, cyl(0.008, 0.008, 0.06, 6), CHROME, x, T + 0.2, 0.08, { rx: 1.1, outline: false });
  }
  for (let i = 0; i < 3; i++) glassOf(g, '#e1f5fe').root.position.set(-1.34 + i * 0.1, T + 0.056, 0.26);
  part(g, cyl(0.09, 0.075, 0.08, 12), '#eceff1', -0.98, T + 0.04, 0.3);
  // The stools.
  for (const x of [BR.seat[0], BR.seat[0] + 1.05, BR.seat[0] + 2.05]) {
    part(g, cyl(0.16, 0.16, 0.05, 16), '#b71c1c', x, BR.seat[1] - 0.025, BR.seat[2] - 0.0);
    part(g, cyl(0.03, 0.035, BR.seat[1] - 0.05, 8), CHROME, x, (BR.seat[1] - 0.05) / 2, BR.seat[2]);
    part(g, cyl(0.15, 0.17, 0.02, 12), BLACK, x, 0.01, BR.seat[2]);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.008, 6, 14), new THREE.MeshBasicMaterial({ color: '#c3cad0' }));
    ring.userData.ownGeometry = ring.userData.ownMaterial = true;
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, 0.24, BR.seat[2]);
    g.add(ring);
  }
  // What moves: the glass on the counter, the napkin, the bottle in the bartender's hand, the rag.
  const glass = glassOf(g, '#ffcc80');
  glass.root.visible = false;
  const nap = group(g);
  part(nap, box(0.13, 0.002, 0.13), PAPER, 0, 0, 0, { outline: false });
  const napInk = part(nap, box(0.08, 0.002, 0.012), '#1a237e', 0, 0.002, -0.02, { outline: false });
  const napInk2 = part(nap, box(0.06, 0.002, 0.012), '#1a237e', -0.01, 0.002, 0.02, { outline: false });
  nap.visible = false;
  const nib = pen(g);
  const bottle = group(g);
  part(bottle, cyl(0.03, 0.034, 0.22, 8), '#2e7d32', 0, 0, 0, { outline: false });
  part(bottle, cyl(0.012, 0.018, 0.08, 6), '#2e7d32', 0, 0.15, 0, { outline: false });
  bottle.visible = false;
  const rag = part(g, rbox(0.1, 0.03, 0.08, 0.012), '#fafafa', 0, 0, 0, { outline: false });
  rag.visible = false;
  const polished = glassOf(g, '#e1f5fe');
  polished.root.visible = false;
  const bart = cast(g, LOOKS.bartender, { gender: 'male', seed: 91 });
  const spots: Record<string, Spot> = { enBarDebrief: standAt(g, 'enBarTalk') };
  spots['*'] = spots.enBarDebrief;
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    glass.root.visible = !!P.glass;
    if (P.glass) place(glass.root, P.glass);
    glass.fill(n.fill ?? 0);
    showAt(nap, P.nap);
    if (P.nap) {
      const w = n.wrote ?? 0;
      napInk.visible = w > 0.2;
      napInk2.visible = w > 0.7;
    }
    showAt(nib, P.pen);
    const m = Math.round(n.bart ?? 0);
    if (now && m) {
      const b = BR.back;
      const f = bart.at(b, 0);
      polished.root.visible = m === 1;
      bottle.visible = m === 2;
      rag.visible = m === 1;
      if (m === 1) {
        // Polishing a glass, as they do.
        const gp: V = [b[0] + 0.02, 1.08, b[2] + 0.26];
        place(polished.root, gp);
        const rp: V = [gp[0] + 0.03 * Math.cos(t * 7), gp[1] + 0.05, gp[2] + 0.03 * Math.sin(t * 7)];
        place(rag, rp);
        aim(f, [gp[0] + 0.05, gp[1] - 0.05, gp[2]], rp, 0, 0.3);
      } else if (m === 2) {
        // The bottle tipped over the glass.
        const tilt = 0.5 + 0.5 * THREE.MathUtils.smoothstep(n.fill ?? 0, 0, 0.2);
        const bp: V = [BR.glassStart[0] - 0.1, 1.26, BR.glassStart[2] - 0.06];
        place(bottle, bp);
        bottle.rotation.z = -1.5 * tilt;
        aim(f, [BR.glassStart[0] + 0.06, 1.06, BR.glassStart[2] - 0.02], bp, 0, 0.35);
      } else if (m === 3) {
        aim(f, null, [BR.glassStart[0] - 0.28, 1.06, BR.glassStart[2] + 0.02], -0.5, 0.2);
      } else if (m === 4) {
        // Leaning in: hands on the counter, listening.
        aim(f, [b[0] - 0.1, 1.02, b[2] + 0.3], [b[0] + 0.26, 1.02, b[2] + 0.3], -0.55, 0.08);
      } else if (m === 5) {
        // Telling it: a hand going.
        aim(f, [b[0] + 0.2, 1.16 + 0.06 * beat(t, 0.8), b[2] + 0.22], [b[0] - 0.22, 1.08 + 0.04 * beat(t, 0.6, 0.3), b[2] + 0.22], -0.55, 0);
      } else {
        // Laughing, a hand flat on the bar.
        aim(f, [b[0] + 0.16, 1.02 + 0.03 * Math.abs(beat(t, 2.6)), b[2] + 0.3], [b[0] - 0.1, 1.16, b[2] + 0.2], -0.5, -0.18);
      }
    } else {
      bart.hide();
      polished.root.visible = false;
      bottle.visible = false;
      rag.visible = false;
    }
  });
  out.work = marker(g, BR.glassHome[0], BR.glassHome[1], BR.glassHome[2]);
}

// =============================================================================================
// 분장 거울 (enVanity): the green room's mirror with its ring of bulbs, a counter of make-up, a stool, a stage
// jacket on a rail beside it.

function vanity(g: THREE.Group, out: Built) {
  const T = VN.top;
  part(g, rbox(1.94, 0.04, 0.5, 0.012), '#eceff1', 0, T - 0.02, -0.22);
  for (const x of [-0.92, 0.92]) part(g, box(0.05, T - 0.04, 0.46), '#546e7a', x, (T - 0.04) / 2, -0.22);
  // Drawers.
  for (const x of [-0.6, 0.6]) {
    part(g, rbox(0.56, 0.24, 0.44, 0.012), '#607d8b', x, T - 0.16, -0.22);
    for (const y of [T - 0.1, T - 0.22]) part(g, box(0.1, 0.012, 0.012), CHROME, x, y, 0.005, { outline: false });
  }
  // The mirror with its bulbs.
  const M = { x: 0, y: 1.42, w: 1.3, h: 1.0, z: -0.45 };
  part(g, rbox(M.w + 0.2, M.h + 0.2, 0.04, 0.02), BLACK, M.x, M.y, M.z - 0.02);
  picture(g, painted('enGlass', 256, 192, (c) => {
    const x = c.createLinearGradient(0, 0, 0, 192);
    x.addColorStop(0, '#dfe8ec');
    x.addColorStop(1, '#a9bcc4');
    c.fillStyle = x;
    c.fillRect(0, 0, 256, 192);
    c.strokeStyle = 'rgba(255,255,255,0.5)';
    c.lineWidth = 10;
    for (const a of [46, 80, 206]) {
      c.beginPath();
      c.moveTo(a, 0);
      c.lineTo(a - 40, 192);
      c.stroke();
    }
    // A note stuck to the corner.
    c.fillStyle = '#fff59d';
    c.fillRect(196, 8, 52, 40);
    text(c, '천천히!', 222, 20, 11, '#c62828', 'center');
    text(c, '웃어라', 222, 36, 11, '#c62828', 'center');
  }), M.w, M.h, M.x, M.y, M.z + 0.005);
  const bulbs: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) bulbs.push(ownLit(g, ball(0.035), '#8a8370', M.x - M.w / 2 + (i + 0.5) * (M.w / 6), M.y + M.h / 2 + 0.06, M.z + 0.015));
  for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) bulbs.push(ownLit(g, ball(0.035), '#8a8370', M.x + sx * (M.w / 2 + 0.06), M.y - M.h / 2 + (i + 0.5) * (M.h / 5), M.z + 0.015));
  // On the counter.
  const tray = group(g);
  part(tray, rbox(0.22, 0.02, 0.14, 0.006), '#4e342e', -0.32, T + 0.01, -0.14);
  part(tray, cyl(0.04, 0.04, 0.02, 12), '#d7a988', -0.26, T + 0.028, -0.14);
  part(tray, cyl(0.012, 0.014, 0.08, 8), '#c62828', -0.38, T + 0.05, -0.1);
  part(tray, cyl(0.012, 0.014, 0.07, 8), '#212121', -0.42, T + 0.045, -0.16);
  part(g, rbox(0.15, 0.02, 0.1, 0.004), PAPER, VN.cards[0], T + 0.012, VN.cards[2]);
  const puff = part(g, cyl(0.035, 0.035, 0.018, 12), '#f8d9c0', VN.puff[0], VN.puff[1], VN.puff[2], { outline: false });
  const cardStack = group(g);
  const cardPic = swapPic(cardStack, 0.15, 0.1, 0, 0, 0.012);
  const titles = ['① 지하철', '② 엄마 전화', '③ 회식', '④ 편의점'];
  const heldCards = (i: number) => cardTex(titles[i % 4], MUSTARD);
  part(cardStack, box(0.15, 0.1, 0.01), '#fff9c4', 0, 0, 0);
  cardStack.visible = false;
  const bottle = group(g);
  part(bottle, cyl(0.03, 0.032, 0.16, 10), '#81d4fa', 0, 0, 0);
  part(bottle, cyl(0.016, 0.022, 0.02, 8), '#eceff1', 0, 0.09, 0, { outline: false });
  place(bottle, VN.bottle);
  // The stool.
  part(g, cyl(0.17, 0.17, 0.04, 16), '#b71c1c', VN.seat[0], VN.seat[1] - 0.02, VN.seat[2]);
  part(g, cyl(0.025, 0.03, VN.seat[1] - 0.04, 8), CHROME, VN.seat[0], (VN.seat[1] - 0.04) / 2, VN.seat[2]);
  part(g, cyl(0.15, 0.16, 0.02, 12), BLACK, VN.seat[0], 0.012, VN.seat[2]);
  // A jacket on a hook, the next show's on a hanger.
  rod(g, v3(-0.92, T, -0.2), v3(-0.92, 1.8, -0.2), 0.012, CHROME);
  part(g, cyl(0.01, 0.01, 0.22, 6), CHROME, -0.92, 1.76, -0.1, { rx: Math.PI / 2, outline: false });
  const hang = group(g, VN.jacket[0] - 0.08, VN.jacket[1] - 0.05, VN.jacket[2]);
  part(hang, cyl(0.004, 0.004, 0.32, 6), '#bdbdbd', 0, 0, 0, { rz: Math.PI / 2, outline: false });
  part(hang, rbox(0.34, 0.56, 0.1, 0.05), '#311b92', 0, -0.3, 0);
  part(hang, box(0.1, 0.36, 0.106), '#fafafa', 0, -0.2, 0, { outline: false });
  const spots: Record<string, Spot> = { enPreShow: standAt(g, 'enGreen') };
  spots['*'] = spots.enPreShow;
  drive(g, out, spots, (_now, N) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const on = (n.lit ?? 0) > 0.2;
    bulbs.forEach((b) => setLit(b, on ? '#fff3bf' : '#8a8370'));
    place(puff, P.puff ?? VN.puff);
    cardStack.visible = !!P.cards;
    if (P.cards) {
      place(cardStack, P.cards);
      cardPic.set(heldCards(Math.round(n.flick ?? 0)));
      cardStack.rotation.x = 0.5;
    }
    place(bottle, P.bottle ?? VN.bottle);
  });
  out.work = marker(g, 0, T + 0.04, -0.14);
}

// =============================================================================================
// 세트리스트 보드 (enSetlistCork): a cork board on a frame, the night's running order in cards. They really move.

const SET_CARDS: Array<[string, string]> = [['오프닝 인사', '#42a5f5'], ['지하철', '#ff7043'], ['엄마 전화', '#66bb6a'], ['회식', MUSTARD], ['편의점', '#ab47bc'], ['소개팅', '#ec407a'], ['관객 토크', '#26a69a'], ['마무리', '#ef5350']];
function setlistCork(g: THREE.Group, out: Built) {
  // The frame.
  for (const x of [-0.92, 0.92]) {
    part(g, box(0.05, 2.1, 0.05), WALNUT_D, x, 1.05, CK.z - 0.03);
    part(g, box(0.05, 0.03, 0.5), WALNUT_D, x, 0.015, CK.z);
  }
  part(g, rbox(1.84, 1.1, 0.04, 0.01), WALNUT, 0, 1.46, CK.z);
  part(g, box(1.76, 1.02, 0.01), CORK, 0, 1.46, CK.z + 0.024, { outline: false });
  label(g, '금요일 밤 8시 · 세트리스트', 0.86, 0.07, -0.34, 1.93, CK.z + 0.032, WALNUT_D, MUSTARD);
  // The tray with markers.
  part(g, box(1.6, 0.025, 0.08), WALNUT_D, 0, 0.87, CK.z + 0.05);
  for (const [x, c] of [[-0.6, '#c62828'], [-0.45, '#1a237e'], [-0.3, BLACK]] as const) part(g, cyl(0.012, 0.012, 0.12, 8), c, x, 0.893, CK.z + 0.05, { rz: Math.PI / 2, outline: false });
  // The cards in their slots.
  const cards = SET_CARDS.map(([s, c]) => picture(g, cardTex(s, c), 0.36, 0.24, 0, 0, 0));
  const r = seeded(14);
  const tilts = cards.map(() => (r() - 0.5) * 0.08);
  const pins = cards.map((_, i) => part(g, ball(0.012), ['#e53935', '#1e88e5', '#fdd835'][i % 3], 0, 0, 0, { outline: false }));
  /** Which card sits in each slot, after 0, 1 or 2 moves. */
  const ORDERS = [[0, 1, 2, 3, 4, 5, 6, 7], [0, 2, 3, 4, 5, 6, 1, 7], [4, 0, 2, 3, 5, 6, 1, 7]];
  const setOrder = (o: number[], gone: number | null) => {
    o.forEach((card, slot) => {
      const p = CK.slot(slot);
      cards[card].visible = card !== gone;
      cards[card].position.set(p[0], p[1], p[2] + 0.002);
      cards[card].rotation.z = tilts[card];
      pins[card].visible = card !== gone;
      pins[card].position.set(p[0], p[1] + 0.1, p[2] + 0.012);
    });
  };
  setOrder(ORDERS[0], null);
  const held = picture(g, cardTex('...', MUSTARD), 0.36, 0.24, 0, 0, 0);
  held.visible = false;
  // The running time, in marker on a pad in the corner.
  const pad = group(g, CK.pad[0], CK.pad[1], CK.pad[2]);
  part(pad, box(0.42, 0.22, 0.01), PAPER, 0, 0, 0);
  const sum = swapPic(pad, 0.4, 0.2, 0, 0, 0.007);
  const sumLive = live(160, 80);
  const idleSum = () => painted('enSumIdle', 160, 80, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 160, 80);
    text(c, '합계 ?분', 80, 40, 22, '#90a4ae', 'center');
  });
  sum.set(idleSum());
  const marker1 = part(g, cyl(0.012, 0.012, 0.12, 8), '#c62828', 0, 0, 0, { rz: 1.1, outline: false });
  marker1.visible = false;
  const spots: Record<string, Spot> = { enSetlistSort: standAt(g, 'enCards') };
  spots['*'] = spots.enSetlistSort;
  drive(g, out, spots, (now, N) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    const swap = Math.round(n.swap ?? 0);
    const lift = Math.round(n.lift ?? 0);
    const gone = !now || !P.card ? null : lift === 1 ? 1 : lift === 2 ? 4 : null;
    setOrder(ORDERS[Math.min(2, swap)], gone);
    held.visible = !!P.card;
    if (P.card && gone !== null) {
      place(held, P.card);
      (held.material as THREE.MeshBasicMaterial).map = (cards[gone].material as THREE.MeshBasicMaterial).map;
      held.rotation.set(0, 0, 0);
    }
    showAt(marker1, P.marker);
    if (!now) sum.set(idleSum());
    else if ((n.sum ?? 0) > 0.05) {
      const s = n.sum ?? 0;
      sum.set(sumLive((c) => {
        c.fillStyle = PAPER;
        c.fillRect(0, 0, 160, 80);
        text(c, s > 0.9 ? '합계 18분 ✔' : `합계 ${Math.round(s * 18)}분`, 80, 40, 22, s > 0.9 ? '#2e7d32' : '#c62828', 'center');
      }));
    }
  });
  out.work = marker(g, 0, 1.4, CK.z + 0.1);
}

// =============================================================================================
// 음향 콘솔 (enSoundConsole): a mixer, a lighting board, a meter bridge, a talkback mic and a laptop of walk-on music.

function soundConsole(g: THREE.Group, out: Built) {
  const T = SC.top;
  part(g, rbox(1.94, 0.05, 0.84, 0.012), '#2f2a28', 0, T - 0.025, 0.02);
  for (const x of [-0.92, 0.92]) part(g, box(0.05, T - 0.05, 0.78), '#3e3734', x, (T - 0.05) / 2, 0.02);
  part(g, box(1.8, T - 0.2, 0.03), '#3e3734', 0, (T - 0.2) / 2 + 0.1, -0.36);
  // Racks under it.
  part(g, rbox(0.5, 0.4, 0.34, 0.012), BLACK, -0.55, 0.36, -0.14);
  for (const y of [0.25, 0.37, 0.49]) part(g, box(0.44, 0.018, 0.005), '#37474f', -0.55, y, 0.032, { outline: false });
  // Mixer: faders that ride, and meters.
  part(g, rbox(1.1, 0.04, 0.5, 0.01), '#3b3f45', -0.36, T + 0.02, 0.22);
  const faders: THREE.Mesh[] = [];
  for (let i = 0; i < 9; i++) {
    const p = SC.fader(i);
    part(g, box(0.012, 0.004, 0.18), '#15171a', p[0], T + 0.042, p[2], { outline: false });
    faders.push(part(g, box(0.05, 0.022, 0.03), i === 2 ? '#e53935' : '#d8dde0', p[0], T + 0.052, p[2], { outline: false }));
    for (let k = 0; k < 3; k++) part(g, cyl(0.012, 0.014, 0.018, 8), ['#ffd740', '#40c4ff', '#ff5252'][k], p[0], T + 0.05, p[2] - 0.13 - k * 0.035, { outline: false });
  }
  const meterAt: THREE.Mesh[] = [];
  part(g, rbox(1.06, 0.14, 0.03, 0.006), BLACK, -0.36, T + 0.13, -0.04, { rx: -0.3 });
  for (let i = 0; i < 12; i++) meterAt.push(ownLit(g, box(0.052, 0.02, 0.004), '#123a1a', -0.86 + i * 0.09, T + 0.1, -0.022));
  // The lighting board: three cue buttons in colour, and their lamps.
  part(g, rbox(0.66, 0.04, 0.42, 0.01), '#2b2f33', 0.56, T + 0.02, 0.2);
  label(g, '조명 큐', 0.26, 0.05, 0.56, T + 0.044, 0.04, '#2b2f33', '#ffe082');
  const CUE = ['#ff4081', '#40c4ff', '#ffd740'];
  const cueLit = [0, 1, 2].map((i) => {
    const p = SC.cue(i);
    return ownLit(g, box(0.09, 0.02, 0.09), '#2c2c2c', p[0], T + 0.05, p[2]);
  });
  const hint = ['분홍', '파랑', '노랑'];
  hint.forEach((s, i) => label(g, s, 0.1, 0.04, SC.cue(i)[0], T + 0.042, SC.cue(i)[2] + 0.075, '#2b2f33', '#eceff1'));
  // The talkback mic and its red lamp.
  part(g, cyl(0.04, 0.04, 0.03, 10), BLACK, SC.talk[0], T + 0.015, SC.talk[2]);
  rod(g, v3(SC.talk[0], T + 0.02, SC.talk[2]), v3(SC.talk[0], SC.talk[1], SC.talk[2] + 0.02), 0.006, BLACK);
  part(g, ball(0.018), '#616161', SC.talk[0], SC.talk[1], SC.talk[2] + 0.02, { outline: false });
  const talk = ownLit(g, ball(0.01), '#4a1414', SC.talk[0] + 0.05, T + 0.03, SC.talk[2]);
  // The laptop with the walk-on list.
  part(g, rbox(0.34, 0.015, 0.22, 0.006), '#90a4ae', 0.5, T + 0.05, -0.2);
  part(g, rbox(0.34, 0.22, 0.012, 0.006), '#607d8b', 0.5, T + 0.16, -0.32, { rx: -0.15 });
  picture(g, painted('enWalkOn', 128, 80, (c) => {
    c.fillStyle = '#17202a';
    c.fillRect(0, 0, 128, 80);
    text(c, '입장 음악', 8, 12, 11, '#ffe082');
    ['반지후 - 빠라밤', '오프닝 - 두둠칫', '메인 - 빰빠빠'].forEach((s, i) => text(c, s, 8, 32 + i * 16, 10, '#b0bec5', 'left', false));
  }), 0.3, 0.19, 0.5, T + 0.16, -0.31, '#ffffff', 0, -0.15);
  // The headphones on their hook.
  const phones = group(g);
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.01, 6, 14, Math.PI), new THREE.MeshBasicMaterial({ color: '#212121' }));
  arc.userData.ownGeometry = arc.userData.ownMaterial = true;
  phones.add(arc);
  for (const sx of [-1, 1]) part(phones, cyl(0.035, 0.035, 0.02, 10), '#212121', sx * 0.09, -0.005, 0, { rz: Math.PI / 2, outline: false });
  place(phones, SC.phones);
  const spots: Record<string, Spot> = { enSoundCheck: standAt(g, 'enSound') };
  spots['*'] = spots.enSoundCheck;
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    place(phones, P.phones ?? SC.phones);
    const at = (i: number) => {
      if (i === 2) return n.f2 ?? 0.5;
      if (i === 5) return n.f5 ?? 0.4;
      return 0.55 + 0.1 * Math.sin(i * 1.7);
    };
    faders.forEach((f, i) => (f.position.z = SC.fader(i)[2] + 0.07 - 0.14 * at(i)));
    meterAt.forEach((m, i) => {
      const lvl = now ? 0.5 + 0.5 * Math.sin(t * 7 + i * 1.3) * Math.sin(t * 2.3 + i) : 0;
      setLit(m, lvl > 0.75 ? '#ff5252' : lvl > 0.3 ? '#69f0ae' : '#123a1a');
    });
    setLit(talk, (n.talk ?? 0) > 0.5 ? '#ff1744' : '#4a1414');
    const w = now ? Math.round(n.wash ?? 0) : 0;
    cueLit.forEach((c, i) => setLit(c, w === i + 1 ? CUE[i] : '#2c2c2c'));
    if (now) {
      EN_NOW.wash = w;
      EN_NOW.washT = t;
    }
  });
  out.work = marker(g, 0, T + 0.05, 0.2);
}

// =============================================================================================
// 포스터 벽 (enPosterWall): the lobby's wall of shows past and the coming bill, with a rope stand and a ticket box.

function posterWall(g: THREE.Group, W: number) {
  part(g, box(W, 2.1, 0.03), BRICK, 0, 1.05, -0.47);
  for (let i = 1; i < 11; i++) part(g, box(W - 0.02, 0.01, 0.004), '#5d2a20', 0, i * 0.19, -0.452, { outline: false });
  const shows: Array<[string, string, string, string]> = [
    ['반지후의', '웃다 울기', '#c62828', '#fff3e0'],
    ['금요 오픈 마이크', '누구나 3분', '#311b92', '#ffe082'],
    ['허허 라인업', '이달의 신인', '#00695c', '#fafafa'],
    ['설하나 트리오', '심야 재즈', '#212121', '#ffcc80'],
  ];
  const n = Math.max(2, Math.floor(W / 0.5));
  for (let i = 0; i < n; i++) {
    const [a, b, bg, fg] = shows[i % shows.length];
    const x = -W / 2 + (i + 0.5) * (W / n);
    const tex = painted(`enPoster${i % shows.length}`, 128, 180, (c) => {
      c.fillStyle = bg;
      c.fillRect(0, 0, 128, 180);
      c.fillStyle = fg;
      c.beginPath();
      c.arc(64, 70, 34, 0, 6.3);
      c.fill();
      c.fillStyle = bg;
      c.beginPath();
      c.arc(52, 62, 5, 0, 6.3);
      c.arc(76, 62, 5, 0, 6.3);
      c.fill();
      c.lineWidth = 5;
      c.strokeStyle = bg;
      c.beginPath();
      c.arc(64, 74, 16, 0.2, Math.PI - 0.2);
      c.stroke();
      text(c, a, 64, 18, 14, fg, 'center');
      text(c, b, 64, 128, 16, fg, 'center');
      text(c, '허허 코미디 클럽', 64, 162, 11, fg, 'center', false);
    });
    part(g, box(0.46, 0.66, 0.012), BLACK, x, 1.42, -0.445);
    picture(g, tex, 0.42, 0.6, x, 1.42, -0.437);
  }
  // A brass rope post and the ticket box on a little table.
  part(g, cyl(0.12, 0.13, 0.02, 14), '#a97c2c', W / 2 - 0.2, 0.012, -0.1);
  part(g, cyl(0.016, 0.016, 0.82, 8), '#c9a227', W / 2 - 0.2, 0.42, -0.1);
  part(g, ball(0.036), '#c9a227', W / 2 - 0.2, 0.86, -0.1);
  rod(g, v3(W / 2 - 0.2, 0.74, -0.1), v3(W / 2 - 0.6, 0.55, -0.32), 0.012, '#b71c1c');
  part(g, cyl(0.2, 0.2, 0.02, 16), WALNUT, -W / 2 + 0.28, 0.72, -0.2);
  part(g, cyl(0.02, 0.04, 0.72, 8), WALNUT_D, -W / 2 + 0.28, 0.36, -0.2);
  part(g, rbox(0.24, 0.12, 0.16, 0.012), '#c62828', -W / 2 + 0.28, 0.79, -0.2);
  label(g, '티켓', 0.14, 0.05, -W / 2 + 0.28, 0.79, -0.118, '#c62828', '#ffffff');
}

// =============================================================================================
// 매표소 (enTicketBooth, 2 × 1; 2026-11-05, the layout audit): a walnut booth against the wall with a glass window and a
// speaking hole, the cash tray, a stack of tickets and the stamp; tonight's bill and the prices on the board above.

function ticketBooth(g: THREE.Group, W: number) {
  const w = W - 0.08;
  part(g, rbox(w, 1.05, 0.62, 0.02), WALNUT, 0, 0.525, -0.16);
  part(g, rbox(w + 0.04, 0.05, 0.7, 0.01), WALNUT_D, 0, 1.075, -0.14);
  // The window: posts, the glass with its speaking hole and the tray slot under it.
  for (const sx of [-1, 1]) part(g, box(0.06, 0.9, 0.06), WALNUT_D, sx * (w / 2 - 0.03), 1.55, 0.14);
  part(g, box(w, 0.08, 0.1), WALNUT_D, 0, 2.02, 0.14);
  const glass = part(g, box(w - 0.12, 0.84, 0.012), '#cfe8f3', 0, 1.53, 0.15, { outline: false, material: new THREE.MeshBasicMaterial({ color: '#cfe8f3', transparent: true, opacity: 0.35, depthWrite: false }) });
  glass.userData.ownMaterial = true;
  part(g, cyl(0.06, 0.06, 0.014, 16), '#9e9e9e', 0, 1.38, 0.16, { rx: Math.PI / 2, outline: false });
  part(g, box(0.36, 0.03, 0.2), '#bdbdbd', 0, 1.1, 0.2, { outline: false });
  // Behind the glass: tickets, the stamp, the card reader.
  part(g, box(0.2, 0.04, 0.1), '#ffe082', -0.42, 1.12, -0.12, { outline: false });
  part(g, cyl(0.03, 0.035, 0.08, 10), '#c62828', -0.16, 1.14, -0.1);
  part(g, rbox(0.1, 0.03, 0.16, 0.01), '#263238', 0.36, 1.12, -0.06);
  // The board above: tonight's bill.
  picture(g, painted('enBill', 384, 160, (c) => {
    c.fillStyle = '#1a1a1a';
    c.fillRect(0, 0, 384, 160);
    text(c, '오늘의 공연', 192, 32, 26, MUSTARD, 'center');
    text(c, '19:30  금요 스탠드업 라인업', 20, 74, 20, '#ffffff', 'left', false);
    text(c, '22:00  심야 오픈 마이크', 20, 106, 20, '#ffffff', 'left', false);
    text(c, '일반 25,000 · 학생 20,000 · 1드링크', 192, 142, 16, '#ffcc80', 'center', false);
  }), w - 0.06, 0.42, 0, 2.3, -0.44);
  label(g, '매표소 · 예매 확인', w - 0.4, 0.12, 0, 2.08, 0.2, '#c62828', '#ffffff');
}

export const BUILDERS: Record<string, Builder> = {
  standupMic(g, _W, _D, _c, _def, _ctx, out) {
    standupMic(g, out);
  },
  clubStage(g, W, D, c, def, ctx, out) {
    // The deck, the bricks, the neon, the stool and the stand as they were.
    PLATFORMS.stage(g, W, D, c, def, ctx, out);
    clubStage(g, out);
  },
  jokeDesk(g, _W, _D, _c, _def, _ctx, out) {
    jokeDesk(g, out);
  },
  enHouseRow(g, W, _D, _c, _def, _ctx, out) {
    enHouseRow(g, out, W);
  },
  enBarCounter(g, W, _D, _c, _def, _ctx, out) {
    barCounter(g, out, W);
  },
  enVanity(g, _W, _D, _c, _def, _ctx, out) {
    vanity(g, out);
  },
  enSetlistCork(g, _W, _D, _c, _def, _ctx, out) {
    setlistCork(g, out);
  },
  enSoundConsole(g, _W, _D, _c, _def, _ctx, out) {
    soundConsole(g, out);
  },
  enPosterWall(g, W) {
    posterWall(g, W);
  },
  enTicketBooth(g, W) {
    ticketBooth(g, W);
  },
};
