import * as THREE from 'three';
import { reformerPush, type AsanaFlow } from '../asana';
import type { Motion } from '../activity';
import { DARK, METAL, WHITE, marker, rod, shade, spot, tint, type Builder, type Spot } from '../parts';
import { ball, box, canvasTexture, cyl, gradient, part, rbox } from '../toon';

/**
 * The yoga and Pilates studio drawn as itself (2026-10-27 workplace pipeline, at the user's request:
 * the poses matter most here). The mat is a real 183 cm mat with its alignment lines, a cork block,
 * a towel and a bottle beside it; on it the whole body goes through real asanas (asana.ts): the
 * teacher shows the sun salutation side on and turns to the class for warrior II, triangle and tree,
 * a stretch is talked through cross-legged, the plan for the memberships made sat on the mat. The
 * reformer is a maple frame with its carriage on rails, shoulder blocks, the springs and the padded
 * footbar: lying on the carriage, the feet on the bar, the legs press it out and back as it runs on
 * its rails (the springs stretch, the ropes run), the hundred beaten, a bridge held. And what the
 * studio was missing: the mirror wall and barre, the prop rack, the singing-bowl corner, the Cadillac
 * (its push-through bar pressed by the feet), the 인바디 scale and the front desk.
 */

const MAPLE = '#e0c08f';
const MAPLE_D = '#c49a63';
const OAK = '#b98d5c';
const WALNUT = '#6d4c41';
const PAD = '#3f4f5a';
const PAD_L = '#56707c';
const CORK = '#c89f6b';
const FOAM = '#9c8ad0';
const CHROME = '#e3e7ea';
const BLACK = '#2b2b30';
const LINEN = '#efe6d2';
const FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';

/** Lit parts (a candle, a lamp, a display): one unlit material a colour, shared. */
const lit = new Map<string, THREE.MeshBasicMaterial>();
function glow(color: string): THREE.MeshBasicMaterial {
  let m = lit.get(color);
  if (!m) lit.set(color, (m = new THREE.MeshBasicMaterial({ color })));
  return m;
}
/** Shapes made once (never disposed). */
const shapes = new Map<string, THREE.BufferGeometry>();
function shape(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let s = shapes.get(key);
  if (!s) shapes.set(key, (s = make()));
  return s;
}
const ring = (r: number, t: number) => shape(`ring${r},${t}`, () => new THREE.TorusGeometry(r, t, 8, 28));
/** A bowl: the lower half of a ball, open at the top. */
const BOWL = shape('bowl', () => new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2));
/** A unit rod along y (stretched between two points each frame: a spring, a rope). */
const UNIT = shape('unit', () => new THREE.CylinderGeometry(1, 1, 1, 8));
const MIRROR = new THREE.MeshToonMaterial({ color: '#dfeaf0', gradientMap: gradient, emissive: '#22303a' });
const BRASS = new THREE.MeshToonMaterial({ color: '#c99a3e', gradientMap: gradient, side: THREE.DoubleSide });

/** Words and pictures painted once a key. */
const texts = new Map<string, THREE.Texture>();
function painted(key: string, cw: number, ch: number, draw: (c: CanvasRenderingContext2D) => void): THREE.Texture {
  let t = texts.get(key);
  if (!t) texts.set(key, (t = canvasTexture(cw, ch, draw)));
  return t;
}
function sheet(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, 0);
  g.add(m);
  return m;
}
/** A line of words on a plate. */
function label(g: THREE.Object3D, text: string, w: number, h: number, x: number, y: number, z: number, bg: string, fg: string, ry = 0, rx = 0): THREE.Mesh {
  const ch = 64;
  const cw = Math.max(64, Math.round((ch * w) / h / 16) * 16);
  const tex = painted(`l|${text}|${bg}|${fg}|${cw}`, cw, ch, (c) => {
    c.fillStyle = bg;
    c.fillRect(0, 0, cw, ch);
    c.fillStyle = fg;
    c.font = `bold ${Math.round(ch * 0.56)}px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, cw / 2, ch * 0.54, cw * 0.92);
  });
  return sheet(g, tex, w, h, x, y, z, ry, rx);
}
/** A rod of unit length to stretch between two points (a spring, a rope). */
function span(g: THREE.Object3D, r: number, color: string): THREE.Mesh {
  const m = part(g, UNIT, color, 0, 0, 0, { outline: false });
  m.scale.set(r, 1, r);
  return m;
}
const UPV = new THREE.Vector3(0, 1, 0);
const tmpD = new THREE.Vector3();
function stretch(m: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3) {
  tmpD.subVectors(b, a);
  const len = tmpD.length();
  m.position.addVectors(a, b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(UPV, tmpD.divideScalar(len || 1));
  m.scale.y = len;
}
/** A spot for one of the asana flows (asana.ts) at a marker: facing `yaw`, set down on its own height. */
function flowAt(g: THREE.Object3D, x: number, y: number, z: number, yaw: number, flow: AsanaFlow, work?: THREE.Object3D): Spot {
  const s = spot(g, 'stand', x, y, z, yaw, 0);
  s.motion = flow;
  if (work) s.work = work;
  return s;
}
/** A spot stood at the piece (facing -z) from in front, the hands at `work`, doing `motion`. */
function standAt(g: THREE.Object3D, x: number, z: number, work: THREE.Object3D, motion: Motion): Spot {
  const s = spot(g, 'stand', x, 0, z, Math.PI);
  s.work = work;
  s.motion = motion;
  return s;
}
/** Whether a spot's had someone posed at it just now (activity.ts spotPose marks it). */
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
const posed = (s: Spot, t: number) => Math.abs(t - posedAt(s)) < 0.6;

// ---- The mat ----

/** The alignment lines printed on a good mat: the middle line, the hand and foot bars, the logo. */
const matPrint = (c: string) =>
  painted(`mat|${c}`, 512, 172, (x) => {
    x.clearRect(0, 0, 512, 172);
    x.strokeStyle = tint(c, 0.45);
    x.lineWidth = 3;
    x.beginPath();
    x.moveTo(30, 86);
    x.lineTo(482, 86);
    for (const u of [70, 150, 362, 442]) {
      x.moveTo(u, 26);
      x.lineTo(u, 146);
    }
    x.stroke();
    x.lineWidth = 2;
    x.beginPath();
    x.ellipse(256, 86, 34, 34, 0, 0, Math.PI * 2);
    x.stroke();
    x.fillStyle = tint(c, 0.5);
    x.font = `bold 15px ${FONT}`;
    x.textAlign = 'center';
    x.fillText('숨결', 256, 92);
  });

/**
 * A yoga mat (2 × 1): 183 × 61 cm of grippy rubber with its alignment lines, lying along the tile; at
 * the back a cork block and a foam one, a rolled towel, a strap and a bottle of water. The asanas
 * are done on it: facing its front (the class, when it's the teacher's), side on for the salutation.
 */
const yogaMat: Builder = (g, W, D, c, _def, _ctx, out) => {
  const L = Math.min(1.83, W - 0.12);
  const M = Math.min(0.61, D - 0.3);
  const top = 0.006;
  part(g, rbox(L, top, M, 0.003), c, 0, top / 2, 0, { outline: false });
  part(g, box(L + 0.012, 0.002, M + 0.012), shade(c, 0.7), 0, 0.001, 0, { outline: false });
  sheet(g, matPrint(c), L - 0.02, M - 0.02, 0, top + 0.0008, 0, 0, -Math.PI / 2);
  // At the back (off the mat): blocks, the towel, a strap, the bottle.
  const bz = -D / 2 + 0.11;
  part(g, rbox(0.23, 0.075, 0.12, 0.012), CORK, W / 2 - 0.3, 0.0375, bz);
  part(g, rbox(0.23, 0.1, 0.12, 0.015), FOAM, W / 2 - 0.3, 0.075 + 0.05, bz, { ry: 0.12 });
  const towel = part(g, cyl(0.045, 0.045, 0.3, 14), LINEN, -W / 2 + 0.35, 0.045, bz, { rz: Math.PI / 2 });
  towel.scale.set(1, 1, 0.85);
  part(g, ring(0.06, 0.009), '#5c6bc0', -W / 2 + 0.6, 0.009, bz, { rx: Math.PI / 2, outline: false });
  part(g, cyl(0.032, 0.032, 0.2, 14), '#80cbc4', W / 2 - 0.55, 0.1, bz);
  part(g, cyl(0.022, 0.03, 0.03, 12), WHITE, W / 2 - 0.55, 0.215, bz, { outline: false });
  // On the mat: the flows (asana.ts), everyone in a room in step.
  const lead = flowAt(g, 0, top, 0, 0, 'yogaLead');
  out.spots = {
    '*': flowAt(g, 0, top, 0, 0, 'yogaClass'),
    leadYogaClass: lead,
    corporateClass: lead,
    guideStretch: flowAt(g, 0, top, 0, 0, 'yogaStretch'),
    yogaInstructor_assistClass: flowAt(g, 0, top, 0, 0, 'yogaClass'),
    yogaInstructor_membershipPlan: flowAt(g, 0, top, 0, 0, 'yogaPlan'),
  };
  out.work = marker(g, 0, 0.3, 0);
};

// ---- The reformer ----

const SPRINGS = ['#e53935', '#e53935', '#1e88e5', '#fdd835'];

/**
 * A Pilates reformer (2 × 1, its length along x, the footbar at +x): the maple frame on its feet with
 * the rails, the carriage upholstered in grey-blue with its shoulder blocks and headrest, four springs
 * (red, red, blue, yellow) from its end to the spring bar, the padded footbar, the standing platform
 * and the risers at the head end with the ropes and their loops. Lying on the carriage with the feet
 * on the bar (asana.ts), it runs out along the rails as the legs press and back as they bend.
 */
const reformer: Builder = (g, W, D, _c, _def, _ctx, out) => {
  const L = W - 0.06;
  const hz = Math.min(0.31, D / 2 - 0.12);
  // The frame: two maple beams on low feet, end boards, the rails along their inner faces.
  for (const s of [-1, 1]) {
    part(g, rbox(L, 0.13, 0.07, 0.02), MAPLE, 0, 0.2, s * hz);
    part(g, box(L - 0.1, 0.012, 0.03), METAL, 0, 0.27, s * (hz - 0.05), { outline: false });
    for (const x of [-L / 2 + 0.08, L / 2 - 0.08]) part(g, cyl(0.03, 0.035, 0.14, 10), DARK, x, 0.07, s * hz, { outline: false });
  }
  part(g, rbox(0.07, 0.13, hz * 2 + 0.07, 0.02), MAPLE, -L / 2 + 0.035, 0.2, 0);
  part(g, rbox(0.07, 0.13, hz * 2 + 0.07, 0.02), MAPLE, L / 2 - 0.035, 0.2, 0);
  // The standing platform at the head end.
  part(g, rbox(0.3, 0.06, hz * 2 - 0.02, 0.025), PAD, -L / 2 + 0.2, 0.3, 0);
  // The spring bar (the gear) at the foot end, and the springs' hooks on it.
  const gearX = L / 2 - 0.2;
  part(g, cyl(0.016, 0.016, hz * 2 - 0.06, 10), CHROME, gearX, 0.3, 0, { rx: Math.PI / 2, outline: false });
  // The footbar: posts up from the foot end and the padded bar across.
  const barX = L / 2 - 0.1;
  const barY = 0.64;
  for (const s of [-1, 1]) {
    rod(g, new THREE.Vector3(L / 2 - 0.05, 0.26, s * (hz - 0.02)), new THREE.Vector3(barX, barY, s * (hz - 0.04)), 0.017, CHROME);
    part(g, ball(0.024), CHROME, L / 2 - 0.05, 0.26, s * (hz - 0.02), { outline: false });
  }
  part(g, cyl(0.032, 0.032, hz * 2 - 0.1, 14), BLACK, barX, barY, 0, { rx: Math.PI / 2 });
  // The risers at the head end, a pulley atop each, the ropes coming down to the carriage.
  const pulleys: THREE.Vector3[] = [];
  for (const s of [-1, 1]) {
    part(g, rbox(0.05, 0.62, 0.05, 0.012), CHROME, -L / 2 + 0.03, 0.47, s * (hz + 0.02));
    part(g, cyl(0.035, 0.035, 0.025, 14), DARK, -L / 2 + 0.06, 0.75, s * (hz + 0.02), { rx: Math.PI / 2, outline: false });
    pulleys.push(new THREE.Vector3(-L / 2 + 0.07, 0.73, s * (hz + 0.02)));
  }
  // The carriage on its rails (home with the hips 0.52 from the bar): the upholstered top, the
  // shoulder blocks, the headrest; the hooks the ropes and springs come to.
  const carriage = new THREE.Group();
  const home = barX - 0.52 - 0.1;
  carriage.position.set(home, 0, 0);
  g.add(carriage);
  const top = 0.42;
  part(carriage, rbox(0.9, 0.05, hz * 2 - 0.12, 0.012), MAPLE_D, -0.15, 0.34, 0);
  part(carriage, rbox(0.88, 0.07, hz * 2 - 0.14, 0.03), PAD, -0.15, top - 0.035, 0);
  for (const s of [-1, 1]) {
    part(carriage, rbox(0.08, 0.13, 0.08, 0.03), PAD_L, -0.38, top + 0.065, s * 0.12);
    part(carriage, cyl(0.022, 0.022, 0.02, 10), DARK, 0.15, 0.3, s * (hz - 0.06), { rx: Math.PI / 2, outline: false });
    part(carriage, cyl(0.022, 0.022, 0.02, 10), DARK, -0.45, 0.3, s * (hz - 0.06), { rx: Math.PI / 2, outline: false });
  }
  part(carriage, rbox(0.18, 0.05, 0.3, 0.02), PAD_L, -0.52, top + 0.02, 0, { rz: -0.15 });
  // The loops on their hooks behind the shoulder blocks.
  for (const s of [-1, 1]) part(carriage, ring(0.045, 0.008), '#8d6e63', -0.47, top + 0.02, s * (hz - 0.07), { rx: Math.PI / 2, outline: false });
  const springs = SPRINGS.map((col) => span(g, 0.011, col));
  const springZ = [-0.15, -0.05, 0.05, 0.15];
  const ropes = pulleys.map(() => span(g, 0.005, '#6d4c41'));
  // Lying on the carriage, the hips over its foot end, facing the bar; the feet on it.
  const bar = marker(g, barX, barY + 0.03, 0);
  const lie = flowAt(carriage, 0.15, top, 0, Math.PI / 2, 'reformer', bar);
  const rehab = flowAt(carriage, 0.15, top, 0, Math.PI / 2, 'reformerRehab', bar);
  // Teaching it: stood at its side with the notes, pointing to the carriage.
  const teach = standAt(g, 0.05, D / 2 + 0.38, marker(carriage, -0.1, top + 0.1, 0), 'meeting');
  out.spots = { '*': lie, pilatesSession: lie, yogaInstructor_rehabPilates: rehab, yogaInstructor_teacherTraining: teach };
  out.work = bar;
  // Every frame (not only in use): the carriage runs with the legs pressing it, else eases home.
  const hook = new THREE.Vector3();
  const from = new THREE.Vector3();
  let x = home;
  out.away = (_off, t) => {
    const now = [lie, rehab].filter((s) => posed(s, t)).sort((a, b) => posedAt(b) - posedAt(a))[0];
    const want = now ? home - 0.22 * reformerPush(now === lie ? 'reformer' : 'reformerRehab', t) : home;
    x = now ? want : x + (home - x) * 0.08;
    carriage.position.x = x;
    springs.forEach((m, i) => stretch(m, from.set(gearX, 0.3, springZ[i]), hook.set(x + 0.28, 0.31, springZ[i])));
    ropes.forEach((m, i) => stretch(m, pulleys[i], hook.set(x - 0.47, top + 0.03, pulleys[i].z * 0.8)));
  };
  out.away(false, 0);
};

// ---- The mirror wall ----

/**
 * The mirror wall (3 × 1, against the wall): a full-length mirror in a slim oak frame with the light
 * catching it in streaks, the ballet barre on brackets in front of it, and a plaque over it
 * (들숨 · 날숨). Stood in front of it facing in, the standing poses checked in it.
 */
const mirrorWall: Builder = (g, W, D, _c, _def, _ctx, out) => {
  const w = W - 0.16;
  const z = -D / 2 + 0.03;
  part(g, rbox(w + 0.06, 1.98, 0.035, 0.01), OAK, 0, 1.05, z);
  const glass = new THREE.Mesh(box(w - 0.04, 1.9, 0.01), MIRROR);
  glass.position.set(0, 1.05, z + 0.02);
  g.add(glass);
  const shine = painted('mirrorShine', 256, 128, (c) => {
    c.clearRect(0, 0, 256, 128);
    c.fillStyle = 'rgba(255,255,255,0.35)';
    for (const [x0, wdt] of [[40, 22], [74, 8], [170, 30], [210, 10]]) {
      c.beginPath();
      c.moveTo(x0, 128);
      c.lineTo(x0 + wdt, 128);
      c.lineTo(x0 + wdt + 50, 0);
      c.lineTo(x0 + 50, 0);
      c.fill();
    }
  });
  sheet(g, shine, w - 0.06, 1.86, 0, 1.05, z + 0.027);
  part(g, box(w + 0.06, 0.08, 0.02), WHITE, 0, 0.04, z + 0.02, { outline: false });
  // The barre: a round maple rail on chrome brackets.
  const bz = z + 0.2;
  part(g, cyl(0.024, 0.024, w - 0.1, 16), MAPLE, 0, 0.98, bz, { rz: Math.PI / 2 });
  for (const x of [-w / 2 + 0.25, 0, w / 2 - 0.25]) {
    part(g, rbox(0.03, 0.03, 0.2, 0.01), CHROME, x, 0.98, z + 0.11, { outline: false });
    part(g, cyl(0.035, 0.035, 0.015, 12), CHROME, x, 0.98, z + 0.025, { rx: Math.PI / 2, outline: false });
  }
  // The plaque over it, and a speaker in each top corner.
  part(g, rbox(0.86, 0.2, 0.03, 0.01), WALNUT, 0, 2.2, z + 0.01);
  label(g, '들숨 · 날숨', 0.78, 0.15, 0, 2.2, z + 0.03, '#6d4c41', '#f6e7c8');
  for (const s of [-1, 1]) {
    part(g, rbox(0.18, 0.26, 0.14, 0.03), '#eceff1', s * (w / 2 - 0.1), 2.2, z + 0.08);
    part(g, cyl(0.055, 0.055, 0.01, 18), DARK, s * (w / 2 - 0.1), 2.18, z + 0.155, { rx: Math.PI / 2, outline: false });
  }
  out.spots = { '*': flowAt(g, 0, 0, D / 2 + 0.42, Math.PI, 'yogaMirror') };
  out.work = marker(g, 0, 1.2, z + 0.05);
};

// ---- The prop rack ----

/**
 * The prop rack (2 × 1, against the wall): an open shelf of light oak — cork and foam blocks in
 * stacks, the bolsters, foam rollers and a basket of eye pillows; rolled mats standing in a crate at
 * the end, the straps hung on pegs at the side, a sign asking for them back in their place.
 */
const propRack: Builder = (g, W, D, _c, _def, _ctx, out) => {
  const w = W - 0.5;
  const d = 0.42;
  const z = -D / 2 + d / 2 + 0.02;
  const x0 = -W / 2 + 0.06 + w / 2;
  for (const s of [-1, 1]) part(g, rbox(0.03, 1.1, d, 0.008), OAK, x0 + s * (w / 2 - 0.015), 0.55, z);
  part(g, box(w - 0.03, 1.08, 0.015), shade(OAK, 0.85), x0, 0.55, z - d / 2 + 0.008, { outline: false });
  for (const y of [0.04, 0.42, 0.78, 1.09]) part(g, rbox(w, 0.025, d, 0.006), OAK, x0, y, z);
  // Top: blocks in stacks, cork and purple foam.
  for (let i = 0; i < 4; i++) {
    const bx = x0 - w / 2 + 0.17 + i * 0.27;
    for (let k = 0; k < 3; k++) part(g, rbox(0.23, 0.075, 0.12, 0.012), i % 2 ? FOAM : CORK, bx, 0.79 + 0.0375 + 0.012 + k * 0.077, z + 0.04, { ry: (k - 1) * 0.05 });
  }
  // Middle: bolsters and foam rollers lying along.
  part(g, cyl(0.1, 0.1, 0.62, 18), '#5c6bc0', x0 - w / 4, 0.43 + 0.1 + 0.012, z, { rz: Math.PI / 2 });
  part(g, cyl(0.075, 0.075, 0.45, 16), '#26a69a', x0 + w / 4, 0.43 + 0.075 + 0.012, z - 0.06, { rz: Math.PI / 2 });
  part(g, cyl(0.075, 0.075, 0.45, 16), '#ff8a65', x0 + w / 4, 0.43 + 0.075 + 0.012, z + 0.1, { rz: Math.PI / 2 });
  // Bottom: a basket of eye pillows and a stack of folded blankets.
  part(g, rbox(0.36, 0.22, 0.3, 0.03), '#c8a27a', x0 - w / 4, 0.05 + 0.11, z);
  for (let i = 0; i < 4; i++) part(g, rbox(0.15, 0.04, 0.08, 0.02), ['#b39ddb', '#80cbc4', '#f48fb1', '#fff59d'][i], x0 - w / 4 - 0.09 + (i % 2) * 0.17, 0.27 + Math.floor(i / 2) * 0.03, z - 0.05 + Math.floor(i / 2) * 0.09, { ry: i * 0.4, outline: false });
  for (let k = 0; k < 4; k++) part(g, rbox(0.42, 0.06, 0.3, 0.02), ['#d7ccc8', '#90a4ae', '#bcaaa4', '#e0e0e0'][k], x0 + w / 4, 0.05 + 0.03 + k * 0.062, z);
  // At the end: rolled mats standing in a crate, the straps on pegs above.
  const cx = W / 2 - 0.22;
  part(g, rbox(0.34, 0.36, 0.34, 0.02), MAPLE, cx, 0.18, z);
  ['#9575cd', '#4db6ac', '#f06292', '#7986cb', '#aed581'].forEach((col, i) => part(g, cyl(0.055, 0.055, 0.62, 14), col, cx - 0.09 + (i % 3) * 0.09, 0.45, z - 0.07 + Math.floor(i / 3) * 0.12, { rx: (i - 2) * 0.05 }));
  for (let i = 0; i < 3; i++) {
    const py = 1.2;
    const px = cx - 0.1 + i * 0.1;
    part(g, cyl(0.008, 0.008, 0.06, 6), CHROME, px, py, -D / 2 + 0.05, { rx: Math.PI / 2, outline: false });
    part(g, box(0.035, 0.42, 0.006), ['#3949ab', '#00897b', '#d81b60'][i], px, py - 0.2, -D / 2 + 0.08, { outline: false });
  }
  label(g, '소도구는 제자리에 ♡', 0.6, 0.09, x0, 1.2, z + 0.02, '#f6efe3', '#6d4c41');
  out.work = marker(g, x0, 0.62, z + d / 2);
};

// ---- The singing-bowl corner ----

/**
 * The singing-bowl corner (2 × 1): a zabuton and a zafu on a round rug, three bowls of graded size on
 * their cushions about it with the mallet, behind them a low walnut cabinet with an aroma diffuser
 * (misting while it's used), a candle lantern, a speaker and a stack of stones. Sat cross-legged on
 * the zafu, leading the room through it (the 'guide' motion).
 */
const soundCorner: Builder = (g, W, D, _c, _def, _ctx, out) => {
  part(g, cyl(0.62, 0.62, 0.01, 40), '#d9cfb8', 0, 0.005, 0.05);
  part(g, cyl(0.56, 0.56, 0.004, 40), '#c9b994', 0, 0.011, 0.05, { outline: false });
  part(g, rbox(0.78, 0.06, 0.7, 0.03), '#34446a', 0, 0.04, 0.05);
  const zz = -0.05;
  part(g, cyl(0.17, 0.19, 0.1, 28), '#b5562f', 0, 0.12, zz);
  const zt = 0.17;
  // The bowls on their ring cushions, the smallest at the front; the mallet by them.
  for (const [x, z, r] of [[-0.62, 0.15, 0.13], [0.62, 0.2, 0.11], [0.5, 0.4, 0.08]] as const) {
    part(g, cyl(r * 0.85, r * 0.9, 0.035, 20), '#8e2430', x, 0.0275, z);
    const bowl = new THREE.Mesh(BOWL, BRASS);
    bowl.scale.set(r, r * 0.8, r);
    bowl.position.set(x, 0.045 + r * 0.8, z);
    bowl.castShadow = true;
    g.add(bowl);
    part(g, ring(r, 0.006), '#e3c06a', x, 0.045 + r * 0.8, z, { rx: Math.PI / 2, outline: false });
  }
  part(g, cyl(0.012, 0.012, 0.22, 10), '#8d6e63', -0.4, 0.025, 0.42, { rz: Math.PI / 2, ry: 0.4 });
  part(g, cyl(0.02, 0.02, 0.05, 10), '#4e342e', -0.3, 0.025, 0.38, { rz: Math.PI / 2, ry: 0.4, outline: false });
  // The cabinet behind.
  const cz = -D / 2 + 0.16;
  part(g, rbox(W - 0.3, 0.42, 0.28, 0.02), WALNUT, 0, 0.21, cz);
  for (const x of [-0.42, 0, 0.42]) part(g, box(0.36, 0.34, 0.01), shade(WALNUT, 1.15), x, 0.21, cz + 0.142, { outline: false });
  // The diffuser, its mist rising in use.
  const dx = -0.5;
  part(g, cyl(0.06, 0.08, 0.14, 20), '#efe6d6', dx, 0.49, cz);
  part(g, cyl(0.045, 0.06, 0.03, 20), '#d7ccc8', dx, 0.575, cz, { outline: false });
  const mist = new THREE.Group();
  const puffs: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(ball(0.04), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.3, depthWrite: false }));
    m.userData.ownMaterial = true;
    mist.add(m);
    puffs.push(m);
  }
  g.add(mist);
  out.inUse = mist;
  // A candle in a lantern, a speaker, the stones and a little plant.
  const lx = 0.05;
  part(g, rbox(0.12, 0.18, 0.12, 0.01), BLACK, lx, 0.51, cz);
  part(g, box(0.09, 0.14, 0.09), '#fff3c4', lx, 0.51, cz, { outline: false, material: glow('#ffe7a3') });
  part(g, rbox(0.2, 0.12, 0.09, 0.03), '#cfd8dc', 0.35, 0.48, cz);
  part(g, cyl(0.03, 0.03, 0.01, 14), DARK, 0.35, 0.48, cz + 0.05, { rx: Math.PI / 2, outline: false });
  for (const [i, r] of [0.06, 0.045, 0.03].entries()) part(g, ball(r), ['#8d9093', '#a7aaad', '#7b7e81'][i], 0.6, 0.44 + 0.02 + i * 0.04, cz).scale.set(1, 0.55, 0.9);
  part(g, cyl(0.05, 0.04, 0.08, 14), '#e8e0d0', -0.25, 0.46, cz);
  for (let i = 0; i < 5; i++) part(g, ball(0.03), i % 2 ? '#7cb342' : '#9ccc65', -0.25 + Math.cos(i * 1.3) * 0.025, 0.52 + (i % 3) * 0.02, cz + Math.sin(i * 1.3) * 0.025, { outline: false });
  const seat = spot(g, 'sit', 0, zt, zz, 0, zt);
  seat.legs = 'cross';
  seat.motion = 'guide';
  out.spots = { '*': seat };
  out.animate = (t) =>
    puffs.forEach((m, i) => {
      const k = (t * 0.25 + i / puffs.length) % 1;
      m.position.set(dx + Math.sin(i * 2.1 + t * 0.5) * 0.03 * (0.4 + k), 0.6 + k * 0.4, cz + Math.cos(i * 1.7) * 0.02);
      m.scale.setScalar(0.5 + 1.4 * k);
      (m.material as THREE.MeshBasicMaterial).opacity = 0.32 * Math.sin(Math.PI * k);
    });
};

// ---- The Cadillac ----

/**
 * The Cadillac (트랩 테이블, 2 × 1): a raised padded table on walnut legs inside a tall chrome frame —
 * the trapeze hanging on its chains, fuzzy loops and the yellow leg springs from the top rails, and
 * at the foot end the push-through bar on its springs. Lying on the table with the feet on the bar,
 * the legs press it up and away and let it back (the rehab flow, asana.ts).
 */
const cadillac: Builder = (g, W, D, c, _def, _ctx, out) => {
  const L = W - 0.08;
  const hz = Math.min(0.36, D / 2 - 0.1);
  const top = 0.64;
  part(g, rbox(L, 0.1, hz * 2, 0.04), PAD, 0, top - 0.05, 0);
  part(g, rbox(L - 0.04, 0.06, hz * 2 - 0.04, 0.02), shade(c, 1.2), 0, top - 0.13, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, rbox(0.07, top - 0.16, 0.07, 0.015), WALNUT, sx * (L / 2 - 0.08), (top - 0.16) / 2, sz * (hz - 0.08));
  // The frame: four posts, the rails round the top and along.
  const H = 2.05;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, rbox(0.045, H - top + 0.1, 0.045, 0.01), CHROME, sx * (L / 2 - 0.02), (H + top - 0.1) / 2, sz * hz);
  for (const sz of [-1, 1]) part(g, rbox(L, 0.045, 0.045, 0.01), CHROME, 0, H, sz * hz);
  for (const sx of [-1, 1]) part(g, rbox(0.045, 0.045, hz * 2, 0.01), CHROME, sx * (L / 2 - 0.02), H, 0);
  // The trapeze on its chains, the fuzzy loops.
  for (const sz of [-1, 1]) rod(g, new THREE.Vector3(-0.15, H, sz * 0.2), new THREE.Vector3(-0.15, 1.45, sz * 0.2), 0.006, METAL);
  part(g, cyl(0.02, 0.02, 0.44, 12), MAPLE, -0.15, 1.45, 0, { rx: Math.PI / 2 });
  for (const sz of [-1, 1]) {
    rod(g, new THREE.Vector3(-0.6, H, sz * hz), new THREE.Vector3(-0.6, 1.62, sz * hz), 0.008, '#fdd835');
    part(g, ring(0.05, 0.016), '#ef9a9a', -0.6, 1.57, sz * hz, { outline: false });
  }
  // The push-through bar: hinged low at the foot-end posts, swinging in over the table, on springs from the top.
  const pivot = new THREE.Group();
  pivot.position.set(L / 2 - 0.03, top + 0.02, 0);
  g.add(pivot);
  const R = 0.33;
  for (const sz of [-1, 1]) part(pivot, rbox(0.03, R, 0.03, 0.01), CHROME, 0, R / 2, sz * (hz - 0.04), { outline: false });
  part(pivot, cyl(0.022, 0.022, hz * 2 - 0.08, 12), BLACK, 0, R, 0, { rx: Math.PI / 2 });
  const feet = marker(pivot, 0, R + 0.02, 0);
  const pull = [-1, 1].map(() => span(g, 0.01, '#e53935'));
  const lie = flowAt(g, 0.12, top, 0, Math.PI / 2, 'reformerRehab', feet);
  out.spots = { '*': lie };
  out.work = feet;
  const up = new THREE.Vector3();
  const end = new THREE.Vector3();
  let th = 0.85;
  out.away = (_off, t) => {
    const want = posed(lie, t) ? 0.85 - 0.57 * reformerPush('reformerRehab', t) : 0.85;
    th = posed(lie, t) ? want : th + (want - th) * 0.08;
    pivot.rotation.z = th;
    pivot.updateMatrixWorld();
    [-1, 1].forEach((sz, i) => {
      end.set(0, R, sz * (hz - 0.04));
      pivot.localToWorld(end);
      g.worldToLocal(end);
      stretch(pull[i], up.set(L / 2 - 0.02, H - 0.02, sz * hz), end);
    });
  };
  out.away(false, 0);
};

// ---- The 인바디 scale ----

/** A body-composition reading on the console's screen: the bars for weight, muscle and fat. */
const inbodyScreen = () =>
  painted('inbody', 256, 192, (c) => {
    c.fillStyle = '#f5f9fc';
    c.fillRect(0, 0, 256, 192);
    c.fillStyle = '#c62828';
    c.fillRect(0, 0, 256, 34);
    c.fillStyle = '#ffffff';
    c.font = `bold 20px ${FONT}`;
    c.fillText('체성분 분석', 12, 25);
    const rows: Array<[string, number, string]> = [['체중', 0.62, '#546e7a'], ['골격근량', 0.74, '#2e7d32'], ['체지방량', 0.4, '#ef6c00'], ['BMI', 0.55, '#1565c0']];
    rows.forEach(([name, v, col], i) => {
      const y = 52 + i * 34;
      c.fillStyle = '#37474f';
      c.font = `bold 15px ${FONT}`;
      c.fillText(name, 10, y + 14);
      c.fillStyle = '#e0e6ea';
      c.fillRect(86, y, 156, 18);
      c.fillStyle = col;
      c.fillRect(86, y, 156 * v, 18);
    });
  });

/**
 * The 인바디 (1 × 1): the white platform with its silver foot electrodes, the column up to the console
 * with the result on its screen (lit while it's used) and the two hand electrodes on their cords,
 * the printout coming out. Stood at it reading the result through with the member.
 */
const inbody: Builder = (g, _W, D, _c, _def, _ctx, out) => {
  part(g, rbox(0.46, 0.08, 0.56, 0.04), '#f4f6f8', 0, 0.04, 0.02);
  for (const s of [-1, 1]) {
    part(g, box(0.09, 0.006, 0.16), CHROME, s * 0.09, 0.083, 0.09, { outline: false });
    part(g, box(0.09, 0.006, 0.08), CHROME, s * 0.09, 0.083, -0.07, { outline: false });
  }
  part(g, rbox(0.12, 0.95, 0.1, 0.03), '#f4f6f8', 0, 0.55, -D / 2 + 0.17);
  const head = new THREE.Group();
  head.position.set(0, 1.08, -D / 2 + 0.22);
  head.rotation.x = -0.5;
  g.add(head);
  part(head, rbox(0.46, 0.3, 0.07, 0.03), '#f4f6f8', 0, 0, 0);
  part(head, box(0.48, 0.05, 0.03), '#c62828', 0, -0.13, 0.02, { outline: false });
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.22), new THREE.MeshBasicMaterial({ map: inbodyScreen() }));
  scr.userData.ownGeometry = scr.userData.ownMaterial = true;
  scr.position.set(0, 0.01, 0.037);
  head.add(scr);
  out.screen = scr;
  label(head, 'InBody', 0.16, 0.04, 0, -0.13, 0.036, '#c62828', '#ffffff');
  // The hand electrodes in their cradles at the sides, cords looping.
  for (const s of [-1, 1]) {
    part(head, rbox(0.05, 0.16, 0.05, 0.02), CHROME, s * 0.27, -0.02, 0.02, { rz: s * 0.2 });
    part(head, ring(0.06, 0.006), DARK, s * 0.24, -0.15, 0.02, { outline: false });
  }
  // The printout.
  part(head, box(0.12, 0.004, 0.16), WHITE, 0.12, 0.17, 0.03, { rx: -1.0, outline: false });
  out.spots = { '*': standAt(g, 0.08, D / 2 + 0.3, marker(head, 0, 0, 0.06), 'type') };
};

// ---- The front desk ----

const timetable = () =>
  painted('ygTimetable', 256, 320, (c) => {
    c.fillStyle = '#fbf6ee';
    c.fillRect(0, 0, 256, 320);
    c.fillStyle = '#7e57c2';
    c.fillRect(0, 0, 256, 50);
    c.fillStyle = '#ffffff';
    c.font = `bold 24px ${FONT}`;
    c.textAlign = 'center';
    c.fillText('오늘의 수업', 128, 34);
    c.textAlign = 'left';
    const rows: Array<[string, string, string]> = [['07:00', '빈야사 요가', '#7e57c2'], ['10:00', '하타 요가', '#26a69a'], ['12:30', '기구 필라테스', '#ef6c00'], ['19:00', '리포머 그룹', '#ef6c00'], ['20:30', '싱잉볼 명상', '#8d6e63']];
    rows.forEach(([time, name, col], i) => {
      const y = 86 + i * 48;
      c.fillStyle = col;
      c.fillRect(14, y - 22, 8, 30);
      c.fillStyle = '#37474f';
      c.font = `bold 20px ${FONT}`;
      c.fillText(time, 32, y);
      c.font = `18px ${FONT}`;
      c.fillText(name, 104, y);
    });
  });

/**
 * The studio's front desk (2 × 1, facing the lobby): a counter of pale oak with the studio's name on
 * its front (숨결 요가·필라테스), the ledge with membership leaflets, a card reader and a little plant; the
 * class timetable on a stand at its end; behind, the desk with the booking screen and a chair. Sat
 * behind it taking a booking.
 */
const frontDesk: Builder = (g, W, D, c, _def, _ctx, out) => {
  const w = W - 0.12;
  const fz = D / 2 - 0.16;
  part(g, rbox(w, 1.02, 0.12, 0.02), c, 0, 0.51, fz);
  part(g, rbox(w + 0.06, 0.04, 0.3, 0.01), OAK, 0, 1.04, fz - 0.03);
  label(g, '숨결 요가 · 필라테스', w * 0.7, 0.13, 0, 0.66, fz + 0.062, '#e8dcc8', '#6d4c41');
  part(g, cyl(0.07, 0.07, 0.005, 24), '#7e57c2', -w * 0.42, 0.66, fz + 0.062, { rx: Math.PI / 2, outline: false });
  // The desk behind, the booking screen and keyboard, the chair.
  const dz = fz - 0.36;
  part(g, rbox(w - 0.1, 0.04, 0.42, 0.01), OAK, 0, 0.74, dz);
  for (const s of [-1, 1]) part(g, box(0.04, 0.72, 0.4), shade(OAK, 0.85), s * (w / 2 - 0.1), 0.37, dz, { outline: false });
  part(g, rbox(0.05, 0.18, 0.05, 0.01), DARK, -0.2, 0.85, dz + 0.14);
  part(g, rbox(0.46, 0.29, 0.03, 0.01), DARK, -0.2, 1.02, dz + 0.13);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.25), new THREE.MeshBasicMaterial({ map: timetable() }));
  scr.userData.ownGeometry = scr.userData.ownMaterial = true;
  scr.position.set(-0.2, 1.02, dz + 0.114);
  scr.rotation.y = Math.PI;
  g.add(scr);
  out.screen = scr;
  part(g, rbox(0.38, 0.015, 0.13, 0.005), '#eceff1', -0.2, 0.765, dz - 0.08);
  // On the ledge: leaflets, the card reader, a little plant.
  for (let i = 0; i < 3; i++) part(g, box(0.15, 0.006, 0.21), ['#d1c4e9', '#b2dfdb', '#ffe0b2'][i], 0.25 + i * 0.16, 1.063, fz - 0.03, { ry: (i - 1) * 0.08, outline: false });
  part(g, rbox(0.08, 0.03, 0.14, 0.01), DARK, -0.55, 1.075, fz - 0.03, { rx: -0.3 });
  part(g, cyl(0.05, 0.04, 0.08, 14), '#e8e0d0', w / 2 - 0.12, 1.1, fz - 0.05);
  for (let i = 0; i < 5; i++) part(g, ball(0.03), i % 2 ? '#7cb342' : '#9ccc65', w / 2 - 0.12 + Math.cos(i * 1.3) * 0.025, 1.17 + (i % 3) * 0.02, fz - 0.05 + Math.sin(i * 1.3) * 0.025, { outline: false });
  // The timetable on a stand at the end, facing the lobby.
  part(g, cyl(0.012, 0.012, 1.2, 8), CHROME, w / 2 + 0.02, 0.6, fz + 0.12, { outline: false });
  part(g, cyl(0.12, 0.13, 0.02, 18), CHROME, w / 2 + 0.02, 0.01, fz + 0.12, { outline: false });
  sheet(g, timetable(), 0.3, 0.375, w / 2 + 0.02, 1.3, fz + 0.135);
  // The chair, and sat on it facing the lobby, the hands at the keyboard.
  const cz = dz - 0.33;
  part(g, cyl(0.035, 0.035, 0.4, 8), DARK, -0.2, 0.2, cz, { outline: false });
  part(g, cyl(0.2, 0.2, 0.03, 5), DARK, -0.2, 0.03, cz, { outline: false });
  part(g, rbox(0.44, 0.07, 0.42, 0.03), '#7e57c2', -0.2, 0.44, cz);
  part(g, rbox(0.42, 0.38, 0.05, 0.03), '#7e57c2', -0.2, 0.7, cz - 0.2);
  const seat = spot(g, 'sit', -0.2, 0.48, cz, 0, 0.48);
  seat.work = marker(g, -0.2, 0.78, dz - 0.08);
  seat.motion = 'type';
  out.spots = { '*': seat };
};

/**
 * The A-frame sign on the pavement by the door (2026-11-05, the layout audit: the studio is a 상가's ground floor on the street):
 * 숨결 요가 · 필라테스, 그룹 요가 · 기구 필라테스, 1:1 체형 상담, the first class free.
 */
const streetSign: Builder = (g) => {
  const tex = painted('ygStreetSign', 192, 320, (c) => {
    c.fillStyle = '#8d6e63';
    c.fillRect(0, 0, 192, 320);
    c.fillStyle = '#f7f1e8';
    c.fillRect(10, 10, 172, 300);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const line = (s: string, y: number, size: number, color: string, bold = true) => {
      c.font = `${bold ? 'bold ' : ''}${size}px ${FONT}`;
      c.fillStyle = color;
      c.fillText(s, 96, y, 164);
    };
    line('숨결', 60, 44, '#6d4c41');
    line('요가 · 필라테스', 104, 24, '#6d4c41');
    line('그룹 요가', 156, 20, '#7e57c2', false);
    line('기구 필라테스', 184, 20, '#7e57c2', false);
    line('1:1 체형 상담', 212, 20, '#7e57c2', false);
    line('첫 수업 무료 체험', 270, 22, '#c62828');
  });
  for (const s of [-1, 1]) {
    const leaf = new THREE.Group();
    leaf.rotation.x = s * 0.16;
    g.add(leaf);
    part(leaf, rbox(0.5, 0.92, 0.03, 0.01), '#8d6e63', 0, 0.5, s * 0.08);
    sheet(leaf, tex, 0.44, 0.8, 0, 0.52, s * 0.08 + s * 0.02, s > 0 ? 0 : Math.PI);
  }
};

/**
 * The changing room's lockers (2 × 1, against a wall; 2026-11-05, the layout audit): two tiers of birch locker doors with their
 * numbers and key bands, the bench in front, a towel on it, the mirror on the end.
 */
const lockerWall: Builder = (g, W) => {
  const z = -0.28;
  const h = 1.8;
  const n = Math.max(2, Math.round((W - 0.1) / 0.36));
  const dw = (W - 0.1) / n;
  part(g, rbox(W - 0.06, h, 0.42, 0.01), '#e0d4c0', 0, h / 2, z);
  for (let i = 0; i < n; i++)
    for (let r = 0; r < 2; r++) {
      const x = -W / 2 + 0.05 + dw * (i + 0.5);
      const y = 0.08 + (h - 0.12) * (r + 0.5) / 2;
      part(g, box(dw - 0.03, (h - 0.12) / 2 - 0.03, 0.012), '#d7b98e', x, y, z + 0.215, { outline: false });
      label(g, String(i * 2 + r + 1), 0.07, 0.05, x, y + 0.25, z + 0.223, '#fafafa', '#6d4c41');
      part(g, box(0.02, 0.06, 0.012), '#8d6e63', x + dw / 2 - 0.06, y, z + 0.225, { outline: false });
    }
  // The bench in front, a towel folded on it.
  part(g, rbox(W - 0.3, 0.05, 0.3, 0.01), '#a1887f', 0, 0.42, 0.18);
  for (const sx of [-1, 1]) part(g, box(0.05, 0.4, 0.24), '#8d6e63', sx * (W / 2 - 0.3), 0.2, 0.18);
  part(g, rbox(0.3, 0.06, 0.2, 0.02), '#b39ddb', -0.25, 0.48, 0.18);
};

/** This workplace's furniture drawn as itself (2026-10-27 workplace pipeline), keyed by def id. */
export const BUILDERS: Record<string, Builder> = {
  ygStreetSign: streetSign,
  ygLockerWall: lockerWall,
  yogaMat,
  reformer,
  ygMirrorWall: mirrorWall,
  ygPropRack: propRack,
  ygSoundCorner: soundCorner,
  ygCadillac: cadillac,
  ygInbody: inbody,
  ygFrontDesk: frontDesk,
};
