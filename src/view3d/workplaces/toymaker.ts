import * as THREE from 'three';
import { legs, marker, spot, type Builder, type Built } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { glowing, label, painted, picture, ring, text } from './doctor';
import * as T from './toymakerMotion';

/** 도토리 is the maker's fictional stamp. Fixed targets are furniture metres, shared with
 * toymakerMotion: a tool and the fingers holding it never run on separate clocks. */
const OAK = '#c59a65', END = '#e3bd86', TEAL = '#438f89', DARK = '#294b50';
const CREAM = '#f3e7cf', WHITE = '#fff9ed', STEEL = '#a2b5ba', INK = '#344456';
const RED = '#d96359', GOLD = '#e8b74e', BLUE = '#6c9ac4', SKIN = '#ecc3a0';
const UP = new THREE.Vector3(0, 1, 0);
function group(p: THREE.Object3D, x = 0, y = 0, z = 0, yaw = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = yaw; p.add(g); return g;
}
function place(o: THREE.Object3D, p: T.V) { o.position.set(...p); }
function flat(g: THREE.Object3D, s: string, w: number, d: number, p: T.V, bg = WHITE, fg = INK) {
  const m = label(g, s, w, d, ...p, bg, fg); m.rotation.x = -Math.PI / 2; return m;
}
function surface(g: THREE.Object3D, w: number, d: number, p: T.V, color = OAK) {
  return part(g, rbox(w, 0.055, d, 0.016), color, ...p);
}
function bench(g: THREE.Group, top = 0.93, width = 1.88, depth = 0.84, kneeWell = false) {
  legs(g, width - 0.11, depth - 0.08, top - 0.055, OAK, 0.075, 0.02);
  surface(g, width, depth, [0, top - 0.0275, 0]);
  if (!kneeWell) part(g, box(width - 0.15, 0.035, depth - 0.16), TEAL, 0, 0.26, 0);
  part(g, box(width - 0.15, 0.13, 0.04), OAK, 0, top - 0.15, 0.34);
  for (let i = 0; i < 5; i++) {
    part(g, box(width - 0.035, 0.001, 0.002), '#b18958', 0, top + 0.001, -0.3 + i * 0.14, { outline: false });
  }
  for (const x of [-0.77, 0.77]) for (const z of [-0.3, 0.3]) {
    part(g, cyl(0.008, 0.008, 0.003, 8), STEEL, x, top + 0.003, z, { outline: false });
  }
}
function drawer(g: THREE.Object3D, p: T.V, title: string, width = 0.42) {
  part(g, rbox(width, 0.17, 0.36, 0.012), TEAL, ...p);
  part(g, box(width - 0.025, 0.13, 0.018), '#66a69a', p[0], p[1], p[2] + 0.19);
  part(g, rbox(0.12, 0.024, 0.026, 0.008), STEEL, p[0], p[1] + 0.025, p[2] + 0.21);
  label(g, title, width - 0.07, 0.042, p[0], p[1] - 0.032, p[2] + 0.203, CREAM, DARK);
}
function crate(g: THREE.Object3D, p: T.V, title: string, color = OAK, w = 0.48) {
  const root = group(g, ...p);
  part(root, box(w, 0.025, 0.35), color, 0, 0.015, 0);
  for (const x of [-w / 2 + 0.025, w / 2 - 0.025]) {
    part(root, box(0.035, 0.25, 0.35), color, x, 0.13, 0);
  }
  for (const z of [-0.165, 0.165]) for (let i = 0; i < 3; i++) {
    part(root, box(w, 0.055, 0.025), color, 0, 0.055 + i * 0.08, z);
  }
  label(root, title, w * 0.76, 0.065, 0, 0.14, 0.183, WHITE, DARK);
  return root;
}
function paper(g: THREE.Object3D, p: T.V, title: string, w = 0.28, d = 0.23) {
  const root = group(g, ...p);
  part(root, box(w + 0.025, 0.015, d + 0.025), DARK, 0, 0, 0);
  part(root, box(w, 0.003, d), WHITE, 0, 0.01, 0);
  flat(root, title, w - 0.035, 0.042, [0, 0.013, -d / 2 + 0.035]);
  part(root, box(0.08, 0.015, 0.022), STEEL, 0, 0.02, -d / 2 + 0.01);
  for (let i = 0; i < 4; i++) {
    part(root, box(w - 0.04, 0.001, 0.002), '#b5c9c7', 0, 0.013, -0.035 + i * 0.038, { outline: false });
    part(root, box(0.014, 0.001, 0.014), '#c8ddd5', -w / 2 + 0.027, 0.014, -0.05 + i * 0.038, { outline: false });
  }
  return root;
}
function marks(g: THREE.Object3D, x: number, y: number, z: number, count = 4) {
  return Array.from({ length: count }, (_, i) => part(g, box(0.06 + 0.012 * (i % 2), 0.002, 0.006), BLUE,
    x + (i % 2) * 0.08, y, z + Math.floor(i / 2) * 0.038, { ry: 0.07, outline: false }));
}
function pencil(g: THREE.Object3D, color = GOLD) {
  const root = group(g);
  part(root, cyl(0.006, 0.006, 0.14, 6), color, 0, 0.025, 0, { rz: -0.28, outline: false });
  part(root, cyl(0, 0.006, 0.025, 6), INK, -0.023, -0.055, 0, { rz: Math.PI - 0.28, outline: false });
  return root;
}
function brush(g: THREE.Object3D) {
  const root = pencil(g, OAK);
  part(root, cyl(0.012, 0.007, 0.03, 8), STEEL, -0.02, -0.055, 0, { rz: -0.28, outline: false });
  part(root, rbox(0.023, 0.035, 0.014, 0.004), BLUE, -0.029, -0.083, 0, { rz: -0.28, outline: false });
  return root;
}
function driver(g: THREE.Object3D) {
  const root = group(g);
  part(root, rbox(0.03, 0.085, 0.03, 0.01), RED, 0, 0.02, 0);
  part(root, cyl(0.004, 0.004, 0.07, 6), STEEL, 0, -0.055, 0, { outline: false });
  return root;
}
function stamp(g: THREE.Object3D) {
  const root = group(g);
  part(root, rbox(0.072, 0.025, 0.05, 0.005), RED, 0, -0.04, 0);
  part(root, cyl(0.012, 0.019, 0.065, 8), OAK, 0, 0.005, 0);
  part(root, ball(0.024), OAK, 0, 0.045, 0);
  return root;
}
function scissors(g: THREE.Object3D) {
  const root = group(g);
  for (const s of [-1, 1]) {
    part(root, ring(0.023, 0.007), RED, s * 0.026, 0, 0.035, { rx: Math.PI / 2 });
    part(root, box(0.012, 0.009, 0.12), STEEL, s * 0.018, 0, -0.035, { ry: s * 0.28, outline: false });
  }
  part(root, ball(0.009), INK, 0, 0.007, 0, { outline: false });
  return root;
}
function car(g: THREE.Object3D, color = END, scale = 1) {
  const root = group(g); root.scale.setScalar(scale);
  const body = part(root, rbox(0.27, 0.075, 0.14, 0.026), color, 0, 0.025, 0);
  const cabin = part(root, rbox(0.12, 0.075, 0.125, 0.03), color, -0.025, 0.09, 0);
  for (const z of [-0.064, 0.064]) {
    part(root, rbox(0.066, 0.045, 0.002, 0.008), '#d0edf0', -0.025, 0.097, z, { outline: false });
  }
  const wheels = [-1, 1].flatMap(x => [-1, 1].map(z => {
    const wheel = group(root, x * 0.086, 0, z * 0.084);
    part(wheel, cyl(0.041, 0.041, 0.025, 14), DARK, 0, 0, 0, { rx: Math.PI / 2 });
    part(wheel, cyl(0.017, 0.017, 0.028, 12), GOLD, 0, 0, 0, { rx: Math.PI / 2, outline: false });
    return wheel;
  }));
  for (const z of [-0.047, 0.047]) part(root, ball(0.012), CREAM, 0.138, 0.035, z, { outline: false });
  const key = group(root, 0, 0.105, 0);
  part(key, cyl(0.007, 0.007, 0.08, 6), STEEL, 0, 0.005, 0, { outline: false });
  part(key, box(0.07, 0.025, 0.012), STEEL, 0, 0.04, 0);
  return { root, body, cabin, wheels, key };
}
function duck(g: THREE.Object3D, color = GOLD, scale = 1) {
  const root = group(g); root.scale.setScalar(scale);
  part(root, ball(0.085), color, 0, 0.06, 0).scale.set(1.25, 0.8, 0.7);
  part(root, ball(0.049), color, 0.07, 0.14, 0);
  part(root, rbox(0.065, 0.022, 0.045, 0.008), RED, 0.12, 0.132, 0);
  for (const z of [-0.041, 0.041]) part(root, ball(0.008), INK, 0.086, 0.157, z, { outline: false });
  part(root, box(0.1, 0.018, 0.08), END, 0, -0.01, 0);
  for (const z of [-0.062, 0.062]) part(root, cyl(0.031, 0.031, 0.018, 12), TEAL, 0, -0.005, z, { rx: Math.PI / 2 });
  return root;
}
function bear(g: THREE.Object3D, scale = 1, color = '#ca9570') {
  const root = group(g); root.scale.setScalar(scale);
  part(root, ball(0.1), color, 0, 0.04, 0).scale.set(0.85, 1.2, 0.65);
  part(root, ball(0.08), color, 0, 0.195, 0);
  for (const s of [-1, 1]) {
    part(root, ball(0.034), color, s * 0.065, 0.25, 0);
    part(root, ball(0.02), '#f0c1a5', s * 0.066, 0.25, 0.022, { outline: false });
    part(root, ball(0.038), color, s * 0.098, 0.063, 0).scale.y = 1.7;
    part(root, ball(0.044), color, s * 0.055, -0.065, 0.025).scale.z = 1.3;
  }
  part(root, ball(0.035), CREAM, 0, 0.17, 0.066).scale.set(1.3, 0.8, 0.45);
  part(root, ball(0.011), INK, 0, 0.184, 0.084, { outline: false });
  const eyes = group(root);
  for (const s of [-1, 1]) {
    part(eyes, ball(0.009), INK, s * 0.032, 0.211, 0.071, { outline: false });
    part(eyes, ball(0.0025), WHITE, s * 0.032 - 0.002, 0.214, 0.079, { outline: false });
  }
  part(root, box(0.12, 0.024, 0.024), RED, 0, 0.12, 0.065);
  for (let i = 0; i < 5; i++) part(root, box(0.006, 0.012, 0.001), '#8f654b', 0, i * 0.025 - 0.025, 0.066, { rz: 0.45, outline: false });
  return { root, eyes };
}
function robot(g: THREE.Object3D, scale = 1) {
  const root = group(g); root.scale.setScalar(scale);
  part(root, rbox(0.20, 0.15, 0.16, 0.025), CREAM, 0, 0.025, 0);
  const lid = group(root, 0, 0.125, 0);
  part(lid, rbox(0.18, 0.12, 0.15, 0.025), TEAL, 0, 0.01, 0);
  part(lid, rbox(0.125, 0.055, 0.008, 0.01), DARK, 0, 0.025, 0.079);
  const eyes = group(lid);
  for (const x of [-0.034, 0.034]) glowing(eyes, box(0.022, 0.018, 0.004), '#a9efc4', x, 0.025, 0.086);
  part(lid, cyl(0.006, 0.006, 0.065, 6), STEEL, 0, 0.1, 0, { outline: false });
  part(lid, ball(0.017), RED, 0, 0.139, 0, { outline: false });
  const wheels = [-1, 1].map(s => part(root, cyl(0.06, 0.06, 0.035, 14), DARK, s * 0.115, -0.04, 0, { rz: Math.PI / 2 }));
  part(root, box(0.12, 0.012, 0.1), '#4f8a54', 0, 0.102, 0);
  part(root, box(0.035, 0.012, 0.034), INK, 0, 0.114, 0);
  for (let i = 0; i < 4; i++) part(root, box(0.012, 0.006, 0.025), GOLD, -0.045 + i * 0.03, 0.112, 0.035, { outline: false });
  return { root, lid, eyes, wheels };
}
function gift(g: THREE.Object3D, color = BLUE, scale = 1) {
  const root = group(g); root.scale.setScalar(scale);
  part(root, rbox(0.31, 0.18, 0.23, 0.008), color, 0, 0, 0);
  part(root, box(0.32, 0.025, 0.24), color, 0, 0.09, 0);
  part(root, box(0.035, 0.205, 0.244), CREAM, 0, 0.003, 0);
  part(root, box(0.324, 0.205, 0.027), CREAM, 0, 0.003, 0);
  for (const s of [-1, 1]) part(root, ring(0.036, 0.009), RED, s * 0.029, 0.126, 0, { rx: Math.PI / 2, ry: s * 0.25 });
  flat(root, '도토리', 0.11, 0.055, [0.09, 0.109, 0.06]);
  return root;
}
function lamp(g: THREE.Object3D, out: Built, p: T.V) {
  const root = group(g, ...p);
  part(root, cyl(0.06, 0.075, 0.025, 14), TEAL, 0, 0, 0);
  part(root, cyl(0.012, 0.012, 0.31, 8), STEEL, 0, 0.16, 0);
  part(root, cyl(0.012, 0.012, 0.24, 8), STEEL, 0.07, 0.35, 0, { rz: -0.65 });
  part(root, cyl(0.045, 0.075, 0.065, 16), TEAL, 0.14, 0.42, 0, { rz: -0.3 });
  const on = group(root); out.inUse = on;
  glowing(on, cyl(0.065, 0.065, 0.004, 16), '#fff1b4', 0.149, 0.389, 0).rotation.z = -0.3;
  return on;
}
function display(g: THREE.Object3D, lines: string[], p: T.V, w = 0.4, h = 0.12, flatScreen = false) {
  const maps = lines.map((s, i) => painted(`tm-${s}-${i}`, 512, 128, c => {
    c.fillStyle = '#1f4549'; c.fillRect(0, 0, 512, 128);
    text(c, s, 256, 68, 44, '#c6f5d0', 'center');
  }));
  const mesh = picture(g, maps[0], w, h, ...p);
  if (flatScreen) mesh.rotation.x = -Math.PI / 2;
  const mat = mesh.material as THREE.MeshBasicMaterial;
  return { mesh, set(i: number) {
    const next = maps[Math.min(maps.length - 1, Math.max(0, i))];
    if (mat.map !== next) { mat.map = next; mat.needsUpdate = true; }
  } };
}
function use(g: THREE.Group, m: T.ToyMotion) {
  const p = T.spotOf(m), seated = p[1] > 0;
  const s = spot(g, seated ? 'sit' : 'stand', ...p, Math.PI, seated ? p[1] : undefined);
  s.motion = m; s.work = marker(g, 0, 0, 0);
  if (m === 'tmPlay' || m === 'tmReview') s.legs = 'cross';
  return s;
}
interface Frame { m: T.ToyMotion; b: T.Beat; h: T.Hands; t: number; clock: number; social: boolean }
function animate(g: THREE.Group, out: Built, mapping: Record<string, T.ToyMotion>, update: (f: Frame | null) => void) {
  out.spots = Object.fromEntries(Object.entries(mapping).map(([id, m]) => [id, use(g, m)]));
  out.work = marker(g, 0, 0, 0);
  out.away = (_away, t) => {
    const entry = Object.entries(out.spots!).filter(([, s]) => Math.abs(t - ((s.at.userData.posedAt as number | undefined) ?? -1e9)) < 0.6)
      .sort((a, b) => Number(b[1].at.userData.posedAt) - Number(a[1].at.userData.posedAt))[0];
    if (!entry) { update(null); return; }
    const [id, s] = entry, m = s.motion as T.ToyMotion;
    const elapsed = T.toyTime(m, t, s.work!.getWorldPosition(new THREE.Vector3()));
    s.at.position.x = T.spotOf(m)[0] + T.toyStep(m, elapsed);
    update({ m, t: elapsed, clock: t, b: T.toyBeat(m, elapsed), h: T.toyHands(m, elapsed, Number(s.at.userData.height ?? 1.6)), social: id.startsWith('social:') });
  };
}
function held(o: THREE.Object3D, f: Frame | null, keys: string[], hand: 'l' | 'r' = 'r') {
  o.visible = !!f && keys.includes(f.b.key);
  if (o.visible && f) place(o, f.h[hand]);
}
/** Resting copies are deliberately paired with the held model; no tool remains in
 * its parking place while the same tool is between the worker's fingers. */
function parked(g: THREE.Object3D, tool: THREE.Object3D, p: T.V, tilt = Math.PI / 2) {
  const rest = tool.clone(); g.add(rest); place(rest, p); rest.rotation.z = tilt;
  return () => { rest.visible = !tool.visible; };
}
function middle(f: Frame): T.V { return T.between(f.h.l, f.h.r, 0.5); }
function rod(g: THREE.Object3D, color: string, r: number) {
  const mesh = part(g, cyl(r, r, 1, 10), color, 0, 0, 0, { outline: false });
  return (a: T.V, b: T.V) => {
    const av = T.v(a), d = T.v(b).sub(av); mesh.position.copy(av).addScaledVector(d, 0.5);
    mesh.scale.y = Math.max(0.001, d.length()); mesh.quaternion.setFromUnitVectors(UP, d.normalize());
  };
}
/** Seated children are individual figures with articulated arms and a tracking head.
 * Social interactions hide this demonstrator: the game's actual visiting child occupies the seat. */
function child(g: THREE.Object3D, p: T.V, shirt = GOLD, atCounter = false) {
  const root = group(g, ...p);
  part(root, rbox(0.25, 0.29, 0.16, 0.06), shirt, 0, 0.2, 0);
  part(root, rbox(0.23, 0.1, 0.19, 0.035), BLUE, 0, 0.035, 0.02);
  for (const s of [-1, 1]) {
    part(root, cyl(0.043, 0.045, 0.2, 10), BLUE, s * 0.075, 0.02, 0.13, { rx: Math.PI / 2 });
    part(root, cyl(0.037, 0.038, 0.25, 10), SKIN, s * 0.075, -0.11, 0.22);
    part(root, rbox(0.09, 0.055, 0.16, 0.02), RED, s * 0.075, -0.25, 0.25);
  }
  const head = group(root, 0, 0.45, 0);
  part(head, ball(0.105), SKIN, 0, 0, 0);
  part(head, ball(0.111), '#523d35', 0, 0.038, -0.023);
  part(head, rbox(0.17, 0.043, 0.04, 0.014), '#523d35', 0, 0.058, 0.079);
  for (const s of [-1, 1]) part(head, ball(0.009), INK, s * 0.035, 0.002, 0.098, { outline: false });
  part(head, rbox(0.033, 0.012, 0.005, 0.004), '#ab675e', 0, -0.038, 0.099, { outline: false });
  const arms = [-1, 1].map(s => {
    const a = rod(root, shirt, 0.034), b = rod(root, SKIN, 0.027);
    const palm = part(root, ball(0.032), SKIN, 0, 0, 0, { outline: false });
    return (target: T.V) => {
      const elbow: T.V = [s * 0.2, (target[1] + 0.3) / 2 - 0.04, target[2] * 0.48];
      a([s * 0.14, 0.31, 0], elbow); b(elbow, target); place(palm, target);
    };
  });
  return { root, pose(t: number, excitement = 0, reach = 0, track = 0) {
    head.rotation.set(-0.08 + 0.035 * T.wave(t, 0.7) * excitement, track, 0);
    const clap = 0.5 + 0.5 * T.wave(t, 2.5);
    const handY = atCounter ? 0.33 + excitement * 0.07 + reach * 0.04 : 0.12 + excitement * 0.23;
    arms[0]([-0.15 + excitement * 0.105 * clap, handY, 0.16 + reach * 0.3]);
    arms[1]([0.15 - excitement * 0.105 * clap, handY, 0.16 + reach * 0.3]);
  } };
}

/** Mortise-and-tenon workbench: vice, coping saw, chisels, abrasives and an actual
 * progressing wooden car. Painted areas are separate skins rather than a flash of colour. */
const toyWorkbench: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  bench(g);
  drawer(g, [-0.55, 0.76, 0.02], '바퀴 · 차축');
  crate(g, [0.42, 0.29, 0], '자투리 나무');
  for (let i = 0; i < 6; i++) part(g, box(0.055, 0.16 + i * 0.012, 0.055), END, 0.27 + i * 0.055, 0.5, 0, { rz: (i - 2) * 0.08 });
  part(g, box(1.68, 0.36, 0.035), '#8c7256', 0, 1.15, -0.39);
  for (let x = 0; x < 12; x++) for (let y = 0; y < 3; y++) {
    part(g, cyl(0.009, 0.009, 0.004, 7), DARK, -0.75 + x * 0.135, 1.03 + y * 0.115, -0.369, { rx: Math.PI / 2, outline: false });
  }
  label(g, '도토리 목공실', 0.51, 0.11, -0.45, 1.36, -0.36, CREAM, DARK);
  for (let i = 0; i < 3; i++) {
    part(g, cyl(0.014, 0.014, 0.13, 8), RED, 0.12 + i * 0.12, 1.21, -0.34);
    part(g, box(0.014 + i * 0.004, 0.1, 0.006), STEEL, 0.12 + i * 0.12, 1.1, -0.34, { outline: false });
  }
  part(g, box(0.17, 0.09, 0.025), STEEL, 0.6, 1.24, -0.33);
  part(g, cyl(0.015, 0.015, 0.18, 8), OAK, 0.6, 1.105, -0.33);
  part(g, box(0.3, 0.06, 0.06), TEAL, 0, 0.91, 0.45);
  const jaw = part(g, box(0.29, 0.09, 0.038), DARK, 0, 0.96, 0.43);
  part(g, box(0.25, 0.065, 0.018), END, 0, 0.972, 0.292);
  part(g, cyl(0.013, 0.013, 0.19, 8), STEEL, 0, 0.86, 0.47, { rx: Math.PI / 2 });
  const vice = group(g, 0, 0.86, 0.55);
  part(vice, cyl(0.009, 0.009, 0.19, 8), STEEL, 0, 0, 0, { rz: Math.PI / 2 });
  for (const x of [-0.1, 0.1]) part(vice, ball(0.016), OAK, x, 0, 0);
  const blank = part(g, rbox(0.32, 0.12, 0.19, 0.015), END, 0, 0.99, 0.18);
  const toy = car(g); place(toy.root, T.BENCH.toy); toy.key.visible = false;
  const paintLayers = [part(toy.root, rbox(0.271, 0.077, 0.142, 0.026), BLUE, 0, 0.025, 0),
    part(toy.root, rbox(0.122, 0.077, 0.127, 0.03), BLUE, -0.025, 0.09, 0)];
  // Thin paint skins expose the underlying wood until the brush reaches that portion.
  for (const m of paintLayers) m.children.forEach(c => c.visible = false);
  const saw = group(g);
  part(saw, box(0.23, 0.012, 0.016), STEEL, 0.07, -0.08, 0);
  part(saw, box(0.23, 0.015, 0.018), TEAL, 0.07, 0.04, 0);
  for (const x of [-0.04, 0.18]) part(saw, box(0.012, 0.13, 0.018), TEAL, x, -0.02, 0);
  part(saw, cyl(0.019, 0.019, 0.12, 8), OAK, -0.1, 0, 0, { rz: Math.PI / 2 });
  saw.children.forEach(p => { p.position.x += 0.1; });
  saw.rotation.y = Math.PI;
  const restingSaw = saw.clone(); g.add(restingSaw); place(restingSaw, [0.75, 0.98, -0.19]); restingSaw.rotation.x = Math.PI / 2;
  const chisel = driver(g), sander = group(g), paintbrush = brush(g), pen = pencil(g), gauge = group(g);
  part(sander, rbox(0.1, 0.05, 0.075, 0.007), '#b98262', 0, -0.025, 0);
  part(sander, box(0.105, 0.008, 0.08), '#765b48', 0, -0.052, 0);
  part(gauge, box(0.14, 0.015, 0.018), STEEL, 0, -0.025, 0);
  for (const x of [-0.06, 0.04]) part(gauge, box(0.008, 0.06, 0.018), STEEL, x, -0.05, 0);
  const parkTools = [
    parked(g, chisel, [0.8, 0.98, 0.26]),
    parked(g, sander, [0.76, 0.99, 0.04], 0),
    parked(g, paintbrush, [0.32, 1.08, 0.12], 0),
    parked(g, gauge, [-0.45, 0.98, -0.24]),
    parked(g, pen, [-0.8, 0.96, 0.28]),
  ];
  part(g, cyl(0.04, 0.036, 0.12, 12), CREAM, 0.34, 0.99, -0.25);
  label(g, '붓', 0.04, 0.04, 0.34, 0.99, -0.208, CREAM, DARK);
  // Brass measuring rule, etched divisions, spare axles and stacked sandpaper.
  part(g, box(0.65, 0.004, 0.047), '#ddbc75', 0.14, 0.936, -0.29, { outline: false });
  for (let i = 0; i <= 20; i++) {
    part(g, box(0.002, 0.001, i % 5 ? 0.014 : 0.027), DARK,
      -0.17 + i * 0.03, 0.94, -0.295, { outline: false });
  }
  for (let i = 0; i < 3; i++) {
    part(g, cyl(0.005, 0.005, 0.15, 8), STEEL, 0.81 + i * 0.04, 0.945, -0.045,
      { rx: Math.PI / 2, outline: false });
    part(g, box(0.16, 0.003, 0.1), ['#c19d7e', '#b18b68', '#a17652'][i],
      0.74 + i * 0.006, 0.937 + i * 0.004, 0.3, { outline: false });
  }
  flat(g, '240', 0.08, 0.032, [0.75, 0.95, 0.3], '#a17652', CREAM);
  const page = paper(g, T.BENCH.page, '완구 안전 기준');
  const checks = marks(page, -0.07, 0.015, -0.045);
  for (let i = 0; i < 3; i++) {
    part(g, cyl(0.037, 0.036, 0.055, 12), [BLUE, RED, GOLD][i], 0.32 + i * 0.105, 0.96, 0.12);
    part(g, cyl(0.028, 0.028, 0.003, 12), [BLUE, RED, GOLD][i], 0.32 + i * 0.105, 0.989, 0.12, { outline: false });
  }
  const dryingTray = group(g, -0.63, 0.95, 0.12);
  part(dryingTray, box(0.33, 0.025, 0.24), TEAL, 0, 0, 0);
  for (let i = 0; i < 3; i++) part(dryingTray, cyl(0.008, 0.008, 0.13, 6), OAK, -0.12 + i * 0.12, 0.05, -0.09, { outline: false });
  flat(dryingTray, '건조 중', 0.22, 0.065, [0, 0.017, 0.07], CREAM);
  const shaving = Array.from({ length: 22 }, (_, i) => {
    const m = part(g, ring(0.012 + i % 3 * 0.003, 0.003), END, -0.28 + (i * 0.067) % 0.6, 0.936, 0.06 + (i * 0.091) % 0.3, { rx: Math.PI / 2, ry: i, outline: false });
    m.scale.x = 1.8; return m;
  });
  const wheelPart = part(g, cyl(0.041, 0.041, 0.027, 14), DARK, 0.34, 0.95, 0.23, { rx: Math.PI / 2 });
  for (let i = 0; i < 3; i++) part(g, cyl(0.036, 0.036, 0.02, 12), DARK, 0.31 + i * 0.08, 0.945, 0.3);
  lamp(g, out, [-0.83, 0.94, -0.24]);
  const status = display(g, ['준비', '목공 작업', '도색 중', '안전 확인', '검사 완료'], [0.55, 1.38, -0.36], 0.45, 0.09);
  out.screen = status.mesh;
  animate(g, out, { carveToy: 'tmCarve', paintToy: 'tmPaint', toymaker_safetyStandard: 'tmSafety' }, f => {
    const key = f?.b.key ?? '', carving = f?.m === 'tmCarve', painting = f?.m === 'tmPaint';
    dryingTray.visible = !f || !!painting;
    page.visible = f?.m === 'tmSafety';
    blank.visible = carving && f!.b.i < 2;
    toy.root.visible = !blank.visible;
    place(toy.root, T.BENCH.toy); toy.root.rotation.y = 0;
    if (f && carving && key === 'roll') toy.root.position.x = -0.18 + 0.36 * T.sm(f.b.u);
    if (f && painting && ['turn', 'inspect'].includes(key)) toy.root.rotation.y = 0.4 * T.wave(f.t, 0.4);
    if (f && painting && ['inspect', 'rack'].includes(key)) place(toy.root, middle(f));
    if (f?.m === 'tmSafety' && ['pull', 'edge'].includes(key)) place(toy.root, T.add(middle(f), 0, -0.06));
    toy.wheels.forEach((m, i) => { m.visible = !carving || f!.b.i > 5 || (f!.b.i === 5 && f!.b.u > i / 4); m.rotation.z = key === 'roll' ? f!.t * 4 : 0; });
    paintLayers.forEach((m, i) => { m.visible = painting && f!.b.i >= 2 + i; m.scale.x = painting && f!.b.i === 2 + i ? Math.max(0.01, f!.b.u) : 1; });
    held(saw, carving ? f : null, ['saw']); held(chisel, carving ? f : null, ['carve']);
    held(sander, carving ? f : null, ['sand']); held(paintbrush, painting ? f : null, ['dip', 'coat', 'detail']);
    held(gauge, f?.m === 'tmSafety' ? f : null, ['gauge']); held(pen, f?.m === 'tmSafety' ? f : null, ['tick']);
    restingSaw.visible = !saw.visible;
    vice.rotation.z = key === 'clamp' ? f!.t * 4 : 0;
    jaw.position.z = carving && f!.b.i < 4 ? key === 'clamp' ? T.mix(0.43, 0.31, T.sm(f!.b.u)) : 0.31 : 0.43;
    parkTools.forEach(update => update());
    wheelPart.visible = carving && key === 'wheels'; if (wheelPart.visible) place(wheelPart, f!.h.r);
    shaving.forEach((m, i) => m.visible = carving && f!.b.i >= 2 && i < (f!.b.i - 2 + f!.b.u) * 8);
    checks.forEach((m, i) => m.visible = f?.m === 'tmSafety' && key === 'tick' && f.b.u > i / 4);
    status.set(!f ? 0 : carving ? 1 : painting ? 2 : key === 'tick' ? 4 : 3);
  });
};

/** Sewing is seated at an open knee well. Feed dogs pull the pattern beneath the
 * reciprocating needle, then stuffing, closing stitches and button eyes finish the bear. */
const plushTable: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  bench(g, 0.77, 1.88, 0.84, true);
  // The shelf is recessed under the machine, leaving the seated worker's knees clear.
  drawer(g, [0.65, 0.59, -0.07], '실 · 단추', 0.4);
  part(g, rbox(0.41, 0.06, 0.35, 0.025), TEAL, 0, 0.43, 0.66);
  // Move the four stool legs to the actual stool position instead of underneath the desk.
  const stool = group(g, 0, 0, 0.66);
  for (const x of [-0.15, 0.15]) for (const z of [-0.12, 0.12]) part(stool, cyl(0.022, 0.026, 0.41, 8), OAK, x, 0.205, z);
  part(stool, rbox(0.39, 0.3, 0.045, 0.025), TEAL, 0, 0.63, 0.19);
  for (const x of [-0.14, 0.14]) part(stool, cyl(0.012, 0.012, 0.22, 8), STEEL, x, 0.5, 0.19);
  const machine = group(g, 0, 0, 0.15);
  part(machine, rbox(0.48, 0.045, 0.26, 0.018), CREAM, -0.16, 0.8, -0.06);
  part(machine, rbox(0.11, 0.28, 0.18, 0.026), CREAM, 0.015, 0.94, -0.13);
  part(machine, rbox(0.39, 0.09, 0.17, 0.028), CREAM, -0.12, 1.065, -0.13);
  part(machine, rbox(0.09, 0.14, 0.13, 0.018), CREAM, -0.27, 1.01, -0.11);
  label(machine, '도토리', 0.19, 0.047, -0.1, 1.063, -0.04, CREAM, TEAL);
  const flywheel = part(machine, cyl(0.057, 0.057, 0.025, 20), TEAL, 0.085, 1.025, -0.13, { rz: Math.PI / 2 });
  const needle = group(machine, -0.18, 0.89, -0.06);
  part(needle, cyl(0.003, 0.003, 0.115, 6), STEEL, 0, 0, 0, { outline: false });
  part(machine, box(0.055, 0.009, 0.06), STEEL, -0.18, 0.825, -0.06, { outline: false });
  const thread = rod(machine, RED, 0.002);
  thread([-0.015, 1.17, -0.13], [-0.18, 0.9, -0.06]);
  part(machine, cyl(0.025, 0.025, 0.08, 12), RED, -0.015, 1.14, -0.13);
  for (let i = 0; i < 4; i++) {
    part(g, cyl(0.027, 0.027, 0.065, 12), [BLUE, GOLD, CREAM, RED][i], -0.76 + i * 0.095, 0.82, -0.23);
    part(g, cyl(0.032, 0.032, 0.008, 12), OAK, -0.76 + i * 0.095, 0.858, -0.23, { outline: false });
  }
  const pattern = group(g, 0.02, 0.79, 0.19);
  const cloth = part(pattern, rbox(0.29, 0.007, 0.23, 0.07), '#e6b196', 0, 0, 0, { outline: false });
  const patternMap = painted('tm-bear-pattern', 256, 220, c => {
    c.fillStyle = '#ead0ad'; c.fillRect(0, 0, 256, 220);
    c.strokeStyle = '#765a49'; c.lineWidth = 4; c.setLineDash([5, 4]);
    c.beginPath(); c.ellipse(128, 133, 48, 62, 0, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(128, 55, 38, 0, Math.PI * 2); c.stroke();
    text(c, '앞판 × 2', 128, 140, 24, '#765a49', 'center');
  });
  picture(pattern, patternMap, 0.27, 0.22, 0, 0.006, 0, WHITE, 0, -Math.PI / 2);
  const seam = Array.from({ length: 12 }, (_, i) => part(pattern, box(0.006, 0.002, 0.013), RED,
    -0.1 + (i % 4) * 0.065, 0.009, -0.075 + Math.floor(i / 4) * 0.075, { outline: false }));
  const teddy = bear(g); place(teddy.root, T.SEW.bear);
  const fillBasket = crate(g, [0.59, 0.78, 0.1], '충전 솜', CREAM, 0.39);
  for (let i = 0; i < 9; i++) part(fillBasket, ball(0.045), WHITE, -0.1 + (i % 3) * 0.09, 0.23 + Math.floor(i / 3) * 0.025, -0.06 + Math.floor(i / 3) * 0.06, { outline: false });
  const fluff = group(g);
  for (let i = 0; i < 4; i++) part(fluff, ball(0.025), WHITE, (i % 2) * 0.027, -0.02, Math.floor(i / 2) * 0.025, { outline: false });
  const snips = scissors(g), needleHand = pencil(g, STEEL);
  const restingSnips = snips.clone(); g.add(restingSnips); place(restingSnips, [-0.64, 0.8, 0.17]);
  part(g, cyl(0.06, 0.06, 0.02, 14), RED, 0.34, 0.79, 0.24);
  for (let i = 0; i < 8; i++) part(g, ball(0.009), i % 2 ? BLUE : GOLD, 0.3 + i % 4 * 0.025, 0.805, 0.225 + Math.floor(i / 4) * 0.025, { outline: false });
  part(g, rbox(0.15, 0.035, 0.22, 0.02), DARK, -0.12, 0.025, 0.43, { rx: -0.1 });
  flat(g, '바늘 주의', 0.19, 0.055, [-0.28, 0.827, -0.17], GOLD, DARK);
  lamp(g, out, [-0.83, 0.78, -0.32]);
  const status = display(g, ['봉제 준비', '재단', '봉제', '솜 넣기', '마감', '완성'], [0.35, 1.04, -0.31], 0.3, 0.09);
  out.screen = status.mesh;
  animate(g, out, { sewPlush: 'tmSew' }, f => {
    const key = f?.b.key ?? '', i = f?.b.i ?? -1;
    pattern.visible = !f || i < 3; place(pattern, [0.02, 0.79, 0.19]);
    if (key === 'sew') place(pattern, [-0.16, 0.827, 0.08 - 0.07 * f!.b.u]);
    cloth.scale.x = key === 'cut' ? 1 - 0.15 * f!.b.u : 1;
    seam.forEach((m, n) => m.visible = key === 'sew' && n / 12 < f!.b.u);
    needle.position.y = 0.89 + (key === 'sew' ? 0.027 * T.wave(f!.t, 11) : 0);
    flywheel.rotation.x = key === 'sew' ? f!.t * 20 : 0;
    teddy.root.visible = !!f && i >= 3; place(teddy.root, T.SEW.bear);
    const swell = key === 'stuff' ? 0.55 + 0.45 * f!.b.u : 1;
    teddy.root.scale.set(swell, 1, swell); teddy.eyes.visible = i >= 5;
    if (key === 'hug') place(teddy.root, T.add(middle(f!), 0, -0.06));
    held(snips, f, ['cut']); held(fluff, f, ['stuff']); held(needleHand, f, ['close', 'eyes']);
    restingSnips.visible = !snips.visible;
    status.set(!f ? 0 : i < 2 ? 1 : i === 2 ? 2 : i === 3 ? 3 : i < 6 ? 4 : 5);
  });
};

/** Rail, impact pad, block tower and a participating child distinguish an actual test
 * area from a rug decorated with toys. The inspection clipboard stays on the lap. */
const playtestMat: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  part(g, rbox(1.89, 0.06, 1.02, 0.035), '#76b5aa', 0, 0.035, 0);
  for (let x = 0; x < 4; x++) for (let z = 0; z < 2; z++) {
    part(g, rbox(0.455, 0.005, 0.48, 0.035), (x + z) % 2 ? '#b8d9c9' : '#edcf86', -0.705 + x * 0.47, 0.068, -0.25 + z * 0.5, { outline: false });
    part(g, cyl(0.045, 0.045, 0.006, 14), (x + z) % 2 ? '#b8d9c9' : '#edcf86', -0.47 + x * 0.47, 0.07, -0.25 + z * 0.5, { outline: false });
  }
  flat(g, '굴리기 →', 0.48, 0.12, [-0.34, 0.075, 0.35], '#b8d9c9');
  flat(g, '충격 검사', 0.26, 0.1, [0.55, 0.076, 0.32], '#edcf86');
  part(g, rbox(0.36, 0.025, 0.28, 0.03), '#cfaa93', 0.05, 0.083, 0.15);
  const tracks = group(g, -0.31, 0.082, -0.22);
  for (let i = 0; i < 44; i++) {
    const angle = i / 44 * Math.PI * 2;
    part(tracks, box(0.09, 0.015, 0.018), OAK, Math.cos(angle) * 0.37, 0, Math.sin(angle) * 0.16, { ry: -angle, outline: false });
  }
  for (const r of [0.93, 1.07]) {
    const curve = new THREE.EllipseCurve(0, 0, 0.37 * r, 0.16 * r, 0, Math.PI * 2, false, 0);
    const points = curve.getPoints(64).map(p => new THREE.Vector3(p.x, 0.014, p.y));
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), 64, 0.007, 5, true);
    geo.userData.ownGeometry = true;
    const rail = part(tracks, geo, STEEL, 0, 0, 0, { outline: false }); rail.userData.ownGeometry = true;
  }
  const train = group(tracks);
  part(train, rbox(0.14, 0.06, 0.075, 0.008), RED, 0, 0.055, 0);
  part(train, box(0.065, 0.08, 0.08), BLUE, -0.04, 0.12, 0);
  part(train, cyl(0.023, 0.023, 0.07, 10), DARK, 0.055, 0.11, 0);
  part(train, box(0.073, 0.015, 0.095), GOLD, -0.04, 0.165, 0);
  for (const x of [-0.05, 0.05]) for (const z of [-0.045, 0.045]) part(train, cyl(0.023, 0.023, 0.013, 10), DARK, x, 0.028, z, { rx: Math.PI / 2, outline: false });
  const wagon = group(tracks);
  part(wagon, box(0.11, 0.045, 0.075), GOLD, 0, 0.05, 0);
  for (const z of [-0.04, 0.04]) part(wagon, cyl(0.022, 0.022, 0.012, 10), DARK, 0, 0.026, z, { rx: Math.PI / 2, outline: false });
  const toy = car(g, RED, 0.85); place(toy.root, T.playCar('', 0));
  const tester = robot(g, 0.85); place(tester.root, [0.05, 0.17, 0.15]);
  const blocks = [0, 1, 2].map(i => {
    const b = group(g, 0.53, 0.13 + i * 0.09, -0.05);
    part(b, rbox(0.09, 0.085, 0.09, 0.008), [RED, GOLD, BLUE][i], 0, 0, 0);
    label(b, ['가', '나', '다'][i], 0.053, 0.055, 0, 0, 0.047, [RED, GOLD, BLUE][i], WHITE);
    return b;
  });
  const seat = part(g, cyl(0.24, 0.26, 0.08, 24), RED, 0, 0.08, 0.73);
  seat.receiveShadow = true;
  const visitorSeat = group(g, 0.25, 0, -0.69);
  part(visitorSeat, rbox(0.35, 0.055, 0.33, 0.025), GOLD, 0, 0.31, 0);
  for (const x of [-0.13, 0.13]) for (const z of [-0.12, 0.12]) part(visitorSeat, cyl(0.018, 0.022, 0.3, 8), OAK, x, 0.15, z);
  const visitor = child(g, [0.25, 0.34, -0.69], '#d9948f');
  const clipboard = paper(g, [-0.23, 0.41, 0.4], '신제품 품질 기록', 0.28, 0.21);
  const remote = group(g, -0.05, 0.22, 0.4);
  part(remote, rbox(0.1, 0.045, 0.14, 0.014), CREAM, 0, 0, 0);
  part(remote, cyl(0.024, 0.024, 0.009, 12), RED, 0, 0.027, 0.02);
  flat(remote, '기차', 0.07, 0.035, [0, 0.026, -0.04]);
  const checks = marks(clipboard, -0.06, 0.015, -0.045), pen = pencil(g);
  const banner = group(g, 0.72, 0, -0.34);
  part(banner, cyl(0.015, 0.015, 0.75, 8), OAK, 0, 0.4, 0);
  label(banner, '안전 놀이터', 0.43, 0.15, 0, 0.79, 0, CREAM, TEAL);
  const status = display(banner, ['시험 준비', '주행 시험', '낙하 시험', '의견 듣기', '검사 통과'], [0, 0.65, 0.005], 0.36, 0.09);
  out.screen = status.mesh;
  const on = group(banner); out.inUse = on;
  glowing(on, ball(0.019), '#d9f2b6', -0.18, 0.89, 0);
  animate(g, out, { playtestToys: 'tmPlay', toymaker_productReview: 'tmReview' }, f => {
    const key = f?.b.key ?? '', t = f?.t ?? 0;
    const run = key === 'train';
    const angle = run ? t * 1.7 : 0;
    for (const [object, phase] of [[train, 0], [wagon, -0.46]] as const) {
      object.position.set(Math.cos(angle + phase) * 0.37, 0, Math.sin(angle + phase) * 0.16);
      object.rotation.y = -Math.atan2(Math.cos(angle + phase) * 0.16, -Math.sin(angle + phase) * 0.37);
    }
    place(toy.root, T.playCar(key, f?.b.u ?? 0));
    toy.key.rotation.y = key === 'wind' ? t * 9 : 0;
    toy.wheels.forEach(m => m.rotation.z = key === 'release' ? t * 12 : 0);
    place(tester.root, [0.05, 0.17, 0.15]); tester.root.rotation.z = 0;
    if (f && ['pull', 'inspect', 'show'].includes(key)) place(tester.root, T.add(middle(f), 0, -0.025));
    if (f && key === 'drop') {
      const u = T.sm(f.b.u, 0.4, 0.75);
      place(tester.root, [0.05, T.mix(0.58, 0.17, u) + (u > 0.97 ? 0.022 * Math.abs(T.wave(t, 5)) : 0), 0.22]);
      tester.root.rotation.z = 0.2 * u;
    }
    blocks.forEach((m, i) => { m.position.set(0.53, 0.13 + i * 0.09, -0.05); });
    if (f && key === 'blocks') place(blocks[2], middle(f));
    visitor.pose(t, ['release', 'show', 'reply'].includes(key) ? 0.8 : 0.1, key === 'reply' ? 0.45 : 0, key === 'release' ? toy.root.position.x * 0.6 : -0.1);
    held(pen, f, ['tick']); checks.forEach((m, i) => m.visible = key === 'tick' && f!.b.u > i / 4);
    tester.eyes.visible = !!f && !['drop', 'read'].includes(key);
    status.set(!f ? 0 : key === 'drop' ? 2 : ['show', 'reply'].includes(key) ? 3 : key === 'tick' ? 4 : 1);
  });
};

/** Wrapping paper folds around a box, tape seals the seam, then a ribbon and tag
 * appear. Rush orders use barcode scan, adhesive label and a dispatched counter. */
const wrapStation: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  bench(g);
  drawer(g, [-0.61, 0.75, 0], '리본 · 스티커');
  for (const x of [-0.81, 0.81]) part(g, box(0.035, 0.36, 0.035), TEAL, x, 1.08, -0.3);
  part(g, cyl(0.015, 0.015, 1.63, 10), STEEL, 0, 1.21, -0.3, { rz: Math.PI / 2 });
  for (let i = 0; i < 3; i++) {
    part(g, cyl(0.075, 0.075, 0.46, 20), [BLUE, '#d4898f', '#d5b478'][i], -0.53 + i * 0.53, 1.21, -0.3, { rz: Math.PI / 2 });
    part(g, cyl(0.025, 0.025, 0.465, 12), OAK, -0.53 + i * 0.53, 1.21, -0.3, { rz: Math.PI / 2 });
  }
  label(g, '마음을 담아 포장', 0.67, 0.09, 0, 1.38, -0.3, CREAM, DARK);
  const sheet = part(g, box(0.69, 0.004, 0.58), BLUE, 0, 0.935, 0.08, { outline: false });
  for (let i = 0; i < 6; i++) part(g, box(0.66, 0.001, 0.003), '#a9cee5', 0, 0.938, -0.17 + i * 0.09, { outline: false });
  const parcel = group(g); place(parcel, T.WRAP.box);
  const bareBox = part(parcel, rbox(0.32, 0.18, 0.24, 0.008), '#c89b6c', 0, 0, 0);
  const paperSkin = part(parcel, rbox(0.324, 0.184, 0.244, 0.009), BLUE, 0, 0, 0);
  const folds = [-1, 1].map(s => {
    const hinge = group(parcel, s * 0.163, -0.09, 0);
    part(hinge, box(0.21, 0.004, 0.25), BLUE, s * 0.105, 0, 0, { outline: false }); return hinge;
  });
  const endFolds = [-1, 1].map(s => {
    const hinge = group(parcel, 0, -0.09, s * 0.123);
    part(hinge, box(0.32, 0.004, 0.15), BLUE, 0, 0, s * 0.075, { outline: false }); return hinge;
  });
  const finished = gift(parcel); finished.visible = false;
  const tapeStrip = part(parcel, box(0.032, 0.002, 0.2), '#e4ddaf', 0, 0.108, 0, { outline: false });
  const tag = flat(parcel, '도토리 · 선물', 0.14, 0.065, [0.08, 0.11, 0.055]);
  const barcode = flat(parcel, '▥ 2401 ▥', 0.16, 0.08, [0.02, 0.112, 0.045]);
  const tape = group(g);
  part(tape, ring(0.035, 0.013), '#eadba8', 0, 0, 0, { rx: Math.PI / 2 });
  const tapeRest = tape.clone(); g.add(tapeRest); place(tapeRest, T.WRAP.tape);
  const scanner = group(g);
  part(scanner, rbox(0.075, 0.05, 0.1, 0.015), DARK, 0, 0, 0);
  part(scanner, box(0.055, 0.014, 0.005), RED, 0, -0.018, -0.052, { outline: false });
  part(scanner, rbox(0.032, 0.07, 0.035, 0.01), TEAL, 0, -0.045, 0.025);
  const scanRest = scanner.clone(); g.add(scanRest); place(scanRest, [0.66, 0.98, 0.23]);
  const pen = pencil(g), snips = scissors(g); place(snips, [0.75, 0.94, -0.05]);
  const stacks = [0, 1, 2].map(i => {
    const p = gift(g, i % 2 ? RED : BLUE, 0.86);
    // Front pile receives the box in the hands; finished orders move to the rear queue.
    place(p, [-0.62, i === 2 ? 1.2 : 1.02, i === 0 ? 0.14 : -0.17]);
    return p;
  });
  crate(g, [0.57, 0.28, 0], '출고 대기', CREAM, 0.5);
  const printer = group(g, 0.48, 0.95, -0.12);
  part(printer, rbox(0.24, 0.12, 0.21, 0.02), CREAM, 0, 0.05, 0);
  part(printer, box(0.18, 0.014, 0.012), DARK, 0, 0.04, 0.108);
  const printed = part(printer, box(0.14, 0.002, 0.12), WHITE, 0, 0.033, 0.15, { outline: false });
  const status = display(g, ['출고 00', '포장 중', '주문 확인', '출고 01', '출고 02'], [0.5, 1.12, -0.1], 0.26, 0.07);
  status.mesh.rotation.x = -0.6; out.screen = status.mesh;
  lamp(g, out, [-0.86, 0.94, -0.25]);
  animate(g, out, { wrapGifts: 'tmWrap', rushOrder: 'tmRush' }, f => {
    const key = f?.b.key ?? '', rush = f?.m === 'tmRush', i = f?.b.i ?? -1;
    place(parcel, T.WRAP.box); parcel.visible = !!f;
    if (f && ['box', 'stack'].includes(key)) place(parcel, middle(f));
    if (key === 'count') place(parcel, T.WRAP.stack);
    sheet.visible = !f || i < 3; sheet.scale.z = key === 'paper' ? 0.4 + f!.b.u * 0.6 : 1;
    const fold = key === 'fold' ? T.sm(f!.b.u) : i > 2 ? 1 : 0;
    folds.forEach((h, n) => { h.rotation.z = (n ? 1 : -1) * fold * Math.PI / 2; h.visible = i < 3; });
    endFolds.forEach((h, n) => { h.rotation.x = (n ? -1 : 1) * fold * Math.PI / 2; h.visible = i < 3; });
    finished.visible = i >= 4; tapeStrip.visible = i >= 3;
    bareBox.visible = i < 3; paperSkin.visible = i === 3;
    tag.visible = !rush && i >= 5; barcode.visible = !!rush && i >= 4;
    held(tape, f, ['tape']); tapeRest.visible = !tape.visible;
    held(pen, f, ['tag']); held(scanner, rush ? f : null, ['scan', 'scanOut']); scanRest.visible = !scanner.visible;
    stacks.forEach((p, n) => p.visible = n === 0 || (!!f && n <= f.b.n + (key === 'count' ? 1 : 0)));
    printed.scale.z = key === 'label' ? Math.max(0.05, f!.b.u) : 1;
    status.set(!f ? 0 : rush ? ['stack', 'count'].includes(key) ? 3 + f!.b.n % 2 : 2 : 1);
  });
};

/** Shop shelving has a clear working ledge and a stock crate in front of the bottom
 * shelf. The display gap is filled by the exact toy lifted from that crate. */
const toyShelf: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  for (const x of [-0.45, 0.45]) part(g, box(0.055, 1.66, 0.37), OAK, x, 0.85, -0.13);
  part(g, box(0.9, 1.61, 0.028), '#d4dfcb', 0, 0.86, -0.322);
  for (const y of [0.12, 0.56, 1.03, 1.53]) surface(g, 0.95, 0.42, [0, y, -0.11]);
  part(g, rbox(0.97, 0.2, 0.055, 0.016), TEAL, 0, 1.7, -0.13);
  label(g, '도토리 장난감', 0.82, 0.14, 0, 1.7, -0.098, CREAM, DARK);
  surface(g, 0.84, 0.28, [0, 0.965, 0.21]);
  const bearA = bear(g, 0.9); place(bearA.root, [-0.24, 1.15, -0.11]);
  const robotA = robot(g, 0.82); place(robotA.root, [0.25, 0.68, -0.1]); robotA.eyes.visible = false;
  const duckA = duck(g, GOLD, 0.9); place(duckA, [-0.2, 0.63, -0.1]);
  const carA = car(g, RED, 0.7); place(carA.root, [-0.2, 1.6, -0.1]); carA.key.visible = false;
  const carB = car(g, BLUE, 0.7); place(carB.root, [0.21, 1.6, -0.1]); carB.key.visible = false;
  crate(g, [-0.24, 0.15, 0.16], '입고', CREAM, 0.37);
  const incoming = bear(g, 0.8, '#e0b875'); place(incoming.root, [-0.27, 0.44, 0.22]);
  const extraBox = gift(g, TEAL, 0.8); place(extraBox, [0.24, 0.25, -0.1]);
  for (const x of [-0.24, 0.23]) for (const y of [0.54, 1.01, 1.51]) {
    label(g, '손으로 만든 완구', 0.32, 0.05, x, y, 0.108, WHITE, DARK);
  }
  const priceTag = label(g, '₩ 18,000', 0.25, 0.065, 0.14, 1.025, 0.13, CREAM, RED);
  const card = paper(g, [-0.04, 1.02, 0.27], '재료비 · 공임', 0.24, 0.2);
  const writing = marks(card, -0.07, 0.015, -0.045), pen = pencil(g);
  const calc = group(g, 0.27, 0.985, 0.2);
  part(calc, rbox(0.17, 0.035, 0.2, 0.012), TEAL, 0, 0, 0);
  const cost = display(calc, ['0', '8,000', '18,000'], [0, 0.021, -0.055], 0.14, 0.045, true);
  for (let x = 0; x < 3; x++) for (let z = 0; z < 3; z++) part(calc, box(0.031, 0.008, 0.031), CREAM, -0.046 + x * 0.046, 0.025, -0.008 + z * 0.044, { outline: false });
  const labelHand = flat(g, '₩ 18,000', 0.19, 0.06, [0, 0, 0], CREAM, RED);
  const light = group(g); out.inUse = light;
  glowing(light, box(0.75, 0.012, 0.018), '#fff0bd', 0, 1.495, 0.02);
  out.screen = cost.mesh;
  animate(g, out, { arrangeToys: 'tmStock', toymaker_pricePlan: 'tmPrice' }, f => {
    const key = f?.b.key ?? '', stocking = f?.m === 'tmStock';
    place(incoming.root, [-0.27, 0.44, 0.22]); incoming.root.rotation.y = 0;
    if (f && stocking) {
      place(incoming.root, ['crate', 'lift', 'shelf'].includes(key) ? T.add(middle(f), 0, -0.025) : [0.12, 1.15, -0.02]);
      incoming.root.rotation.y = key === 'face' ? 0.25 * (1 - T.sm(f.b.u)) : 0;
    }
    card.visible = !stocking; held(pen, !stocking ? f : null, ['write']);
    labelHand.visible = key === 'tag'; if (f && labelHand.visible) place(labelHand, middle(f));
    priceTag.visible = !f || ['compare', 'count'].includes(key);
    writing.forEach((m, i) => m.visible = f?.m === 'tmPrice' && (f.b.i > 3 || (key === 'write' && f.b.u > i / 4)));
    cost.set(f?.m === 'tmPrice' ? f.b.i > 2 ? 2 : f.b.i > 0 ? 1 : 0 : 0);
  });
};

/** A shallow pull-out drying tray, mesh shelves, drying timer, soft inspection cloth
 * and a dated quality stamp make this a finishing station, not another workbench. */
const tmDryingRack: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  for (const x of [-0.86, 0.86]) for (const z of [-0.31, 0.28]) {
    part(g, box(0.04, 1.39, 0.04), TEAL, x, 0.73, z);
    part(g, cyl(0.035, 0.035, 0.025, 12), DARK, x, 0.04, z, { rx: Math.PI / 2 });
  }
  for (const y of [0.34, 0.66, 1.0, 1.38]) {
    part(g, box(1.76, 0.035, 0.65), CREAM, 0, y, -0.02);
    for (let i = 0; i < 15; i++) part(g, box(0.009, 0.009, 0.58), STEEL, -0.8 + i * 0.114, y + 0.021, -0.02, { outline: false });
  }
  label(g, '도색 건조 · 만지지 마세요', 1.32, 0.13, 0, 1.51, -0.28, CREAM, TEAL);
  for (const y of [0.42, 0.74]) for (let i = 0; i < 4; i++) {
    const d = duck(g, [GOLD, RED, BLUE, TEAL][i], 0.8); place(d, [-0.61 + i * 0.4, y, -0.05]);
  }
  const tray = group(g, 0, 1.022, 0);
  part(tray, box(0.58, 0.025, 0.46), TEAL, 0, 0, 0);
  part(tray, rbox(0.19, 0.025, 0.03, 0.007), STEEL, 0, 0, 0.245);
  for (const x of [-0.29, 0.29]) part(tray, box(0.015, 0.04, 0.46), STEEL, x, 0.025, 0);
  const sample = car(g, BLUE); place(sample.root, [0, 1.09, 0.08]); sample.key.visible = false;
  const towel = group(g);
  part(towel, rbox(0.11, 0.015, 0.1, 0.008), CREAM, 0, -0.025, 0);
  for (let i = 0; i < 5; i++) part(towel, box(0.002, 0.002, 0.1), '#d4c8ac', -0.04 + i * 0.02, -0.016, 0, { outline: false });
  const towelRest = towel.clone(); g.add(towelRest); place(towelRest, [-0.56, 1.08, 0.16]);
  const seal = stamp(g), sealRest = seal.clone(); g.add(sealRest); place(sealRest, [0.56, 1.1, 0.12]);
  const card = paper(g, [0.38, 1.04, 0.18], '표면 검사', 0.23, 0.2);
  const approved = flat(card, '검사 합격', 0.15, 0.05, [0, 0.017, 0.025], WHITE, RED);
  const timer = group(g, -0.6, 1.48, -0.23);
  part(timer, rbox(0.31, 0.15, 0.08, 0.012), TEAL, 0, 0, 0);
  const status = display(timer, ['건조 중', '표면 검사', '검사 합격'], [0, 0, 0.044], 0.27, 0.1);
  out.screen = status.mesh;
  const on = group(g); out.inUse = on;
  glowing(on, ball(0.02), '#cbf3bd', 0.72, 1.45, 0.1);
  animate(g, out, { tmCheckFinish: 'tmDry' }, f => {
    const key = f?.b.key ?? '';
    tray.position.z = !f ? 0 : key === 'tray' ? 0.12 * T.sm(f.b.u) : key === 'return' ? 0.12 * (1 - T.sm(f.b.u)) : 0.12;
    place(sample.root, [0, 1.09, 0.08 + tray.position.z]); sample.root.rotation.y = 0;
    if (f && key !== 'tray') {
      place(sample.root, ['lift', 'turn', 'return'].includes(key) ? middle(f) : T.dryAt(key, f.b.u));
      if (key === 'turn') sample.root.rotation.y = 0.65 * T.wave(f.b.u, 0.7);
    }
    held(towel, f, ['wipe']); towelRest.visible = !towel.visible;
    held(seal, f, ['stamp']); sealRest.visible = !seal.visible;
    approved.visible = !!f && (key === 'return' || key === 'stamp' && f.b.u > 0.5);
    status.set(!f ? 0 : approved.visible ? 2 : 1);
  });
};

/** A compact scroll saw: deep C arm, reciprocating blade, hold-down foot, footswitch,
 * extraction hose and patterned offcuts. Fingers stay either side of the cutting line. */
const tmScrollSaw: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  bench(g);
  part(g, rbox(0.65, 0.06, 0.65, 0.03), TEAL, 0, 0.96, -0.07);
  part(g, rbox(0.16, 0.47, 0.18, 0.04), TEAL, 0, 1.22, -0.3);
  part(g, rbox(0.095, 0.075, 0.47, 0.025), TEAL, 0, 1.44, -0.095);
  part(g, cyl(0.036, 0.036, 0.07, 12), STEEL, 0, 1.385, 0.12);
  part(g, box(0.62, 0.018, 0.52), STEEL, 0, 0.969, 0.1);
  part(g, box(0.005, 0.002, 0.3), DARK, 0, 0.98, 0.19, { outline: false });
  const blade = part(g, box(0.003, 0.36, 0.005), STEEL, 0, 1.16, 0.12, { outline: false });
  const guard = group(g, 0, 1.11, 0.12);
  part(guard, box(0.07, 0.012, 0.075), GOLD, 0, 0, 0);
  part(guard, cyl(0.006, 0.006, 0.18, 6), STEEL, 0.03, 0.085, -0.02, { outline: false });
  part(g, cyl(0.023, 0.023, 0.016, 12), RED, 0.4, 0.962, 0.27);
  flat(g, '정지', 0.12, 0.048, [0.4, 0.943, 0.34], CREAM, RED);
  flat(g, '손은 양옆에', 0.27, 0.06, [-0.17, 0.982, 0.32], GOLD, DARK);
  label(g, '소형 실톱', 0.31, 0.09, 0, 1.45, 0.15, CREAM, TEAL);
  const guide = paper(g, [-0.61, 0.945, 0.06], '오리 윤곽 도안', 0.3, 0.28);
  const silhouette = duck(guide, '#b69368', 0.65); place(silhouette, [0, 0.02, 0]); silhouette.rotation.x = Math.PI / 2;
  const stock = group(g, 0, 0.98, 0.29);
  part(stock, rbox(0.28, 0.04, 0.22, 0.01), END, 0, 0.02, 0);
  flat(stock, '✂ 오리', 0.2, 0.12, [0, 0.042, 0], END, '#77593f');
  const cut = duck(g, END, 1.0); place(cut, [0, 1.02, 0.2]);
  const pieces = Array.from({ length: 14 }, (_, i) => part(g, box(0.02 + i % 3 * 0.007, 0.008, 0.01), END,
    -0.13 + (i * 0.087) % 0.45, 0.983, 0.02 + (i * 0.043) % 0.23, { ry: i, outline: false }));
  const offcuts = crate(g, [0.5, 0.28, 0], '목재 재활용', CREAM, 0.52);
  for (let i = 0; i < 5; i++) part(offcuts, box(0.05, 0.15, 0.035), END, -0.16 + i * 0.075, 0.2, 0, { rz: (i - 2) * 0.13 });
  const hoseCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0.15, 0.93, -0.3), new THREE.Vector3(0.38, 0.7, -0.31), new THREE.Vector3(0.5, 0.38, -0.18)]);
  const hoseGeo = new THREE.TubeGeometry(hoseCurve, 20, 0.035, 8, false);
  const hose = part(g, hoseGeo, DARK, 0, 0, 0, { outline: false }); hose.userData.ownGeometry = true;
  part(g, rbox(0.14, 0.025, 0.2, 0.012), DARK, 0.24, 0.025, 0.48);
  lamp(g, out, [-0.83, 0.94, -0.28]);
  const status = display(g, ['정지', '절삭 중', '완성 검사'], [0.52, 1.12, -0.29], 0.36, 0.09);
  out.screen = status.mesh;
  animate(g, out, { tmCutBlank: 'tmSaw' }, f => {
    const key = f?.b.key ?? '', running = ['feed', 'turn'].includes(key);
    blade.position.y = 1.16 + (running ? 0.025 * T.wave(f!.t, 18) : 0);
    guard.position.y = key === 'guard' ? 1.2 - 0.09 * T.sm(f!.b.u) : 1.11;
    place(stock, f ? T.sawBlank(key, f.b.u) : [0, 0.98, 0.29]);
    stock.rotation.y = key === 'turn' ? f!.b.u * 1.4 : 0;
    stock.visible = !f || f.b.i < 4; cut.visible = !!f && f.b.i >= 4;
    if (f) place(cut, T.add(T.sawBlank(key, f.b.u), 0, 0.03));
    pieces.forEach((m, i) => m.visible = !!f && f.b.i >= 2 && i < (f.b.i - 2 + f.b.u) * 7);
    status.set(!f || f.b.i < 2 ? 0 : running ? 1 : 2);
  });
};

/** Smart toys get their own workbench; the engineer's circuitStation and its soldering
 * interaction remain untouched. This station tunes the chassis and programs a route. */
const tmRobotBench: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  bench(g);
  part(g, box(1.38, 0.008, 0.55), '#47726c', 0, 0.935, 0.03, { outline: false });
  for (let i = 0; i < 9; i++) part(g, box(0.002, 0.001, 0.53), '#81aaa1', -0.6 + i * 0.15, 0.941, 0.03, { outline: false });
  for (let i = 0; i < 4; i++) part(g, box(1.35, 0.001, 0.002), '#81aaa1', 0, 0.941, -0.2 + i * 0.15, { outline: false });
  drawer(g, [-0.6, 0.75, 0], '기어 · 센서');
  crate(g, [0.55, 0.28, 0], '시험용 바퀴', CREAM, 0.48);
  const laptop = group(g, -0.48, 0.945, -0.02);
  part(laptop, rbox(0.47, 0.025, 0.34, 0.012), STEEL, 0, 0.012, 0.04);
  for (let x = 0; x < 8; x++) for (let z = 0; z < 3; z++) part(laptop, box(0.039, 0.006, 0.028), INK, -0.18 + x * 0.051, 0.029, 0.02 + z * 0.043, { outline: false });
  part(laptop, box(0.14, 0.002, 0.05), '#bfd0d0', 0, 0.028, 0.165, { outline: false });
  const lid = group(laptop, 0, 0.03, -0.12); lid.rotation.x = -0.18;
  part(lid, rbox(0.48, 0.3, 0.025, 0.012), DARK, 0, 0.15, 0);
  const states = ['연결 대기', '센서 보정', '바퀴 검사', '코드 편집', '업로드 100%', '주행 시험', '오류 수정', '시험 통과'];
  const status = display(lid, states, [0, 0.2, 0.016], 0.43, 0.12); out.screen = status.mesh;
  const program = painted('tm-robot-program', 512, 130, c => {
    c.fillStyle = '#203c43'; c.fillRect(0, 0, 512, 130);
    ['앞으로(30)', '거리 < 10 → 정지', '왼쪽(90) → 다시'].forEach((s, i) => text(c, s, 20, 24 + i * 40, 26, i === 1 ? '#e8bc69' : '#9bc9b3'));
  });
  picture(lid, program, 0.42, 0.115, 0, 0.078, 0.016);
  const bot = robot(g); place(bot.root, T.ROBOT.body);
  const tool = driver(g), restTool = tool.clone(); g.add(restTool); place(restTool, T.ROBOT.driver); restTool.rotation.z = Math.PI / 2;
  const pen = pencil(g); paper(g, [-0.43, 0.95, 0.22], '로봇 검사표', 0.25, 0.17);
  const checks = marks(g, -0.47, 0.966, 0.22, 4);
  const route = group(g, 0.47, 0.947, -0.12);
  part(route, box(0.6, 0.004, 0.38), WHITE, 0, 0, 0, { outline: false });
  part(route, box(0.52, 0.002, 0.015), INK, 0, 0.004, 0.05, { outline: false });
  part(route, box(0.015, 0.002, 0.2), INK, 0.23, 0.004, -0.045, { outline: false });
  flat(route, '센서 시험', 0.3, 0.06, [0, 0.007, -0.12]);
  const cable = rod(g, '#e6c25f', 0.006);
  cable([-0.25, 0.96, -0.08], [0.12, 0.97, 0.18]);
  const plug = part(g, box(0.025, 0.014, 0.042), DARK, 0.18, 1.04, 0.19);
  const screwTray = group(g, 0.65, 0.95, 0.23);
  part(screwTray, rbox(0.25, 0.025, 0.16, 0.02), STEEL, 0, 0, 0);
  for (let i = 0; i < 7; i++) part(screwTray, cyl(0.008, 0.008, 0.018, 6), DARK, -0.08 + i % 4 * 0.05, 0.024, -0.035 + Math.floor(i / 4) * 0.055, { outline: false });
  part(g, cyl(0.04, 0.04, 0.025, 14), DARK, 0.75, 0.97, -0.05);
  label(g, '도토리 로봇 연구', 0.65, 0.11, 0.4, 1.43, -0.32, CREAM, DARK);
  lamp(g, out, [-0.85, 0.94, -0.3]);
  animate(g, out, { tmTuneToy: 'tmTune', toymaker_codeToy: 'tmCode' }, f => {
    const key = f?.b.key ?? '', code = f?.m === 'tmCode';
    place(bot.root, T.ROBOT.body); bot.root.rotation.y = 0;
    bot.lid.position.set(0, 0.125, 0);
    if (f && !code) {
      if (key === 'open') bot.lid.position.y = 0.125 + 0.16 * T.sm(f.b.u);
      else if (['wheel', 'driver', 'sensor'].includes(key)) bot.lid.position.set(0.31, 0.04, -0.15);
      else if (key === 'close') bot.lid.position.y = 0.285 - 0.16 * T.sm(f.b.u);
    }
    if (f && key === 'run') {
      bot.root.position.x = 0.03 + 0.48 * T.sm(f.b.u);
      bot.root.position.z = T.mix(0.17, -0.07, T.sm(f.b.u, 0.5, 1));
      bot.root.rotation.y = Math.PI / 2 * T.sm(f.b.u, 0.5, 1);
    }
    if (f && key === 'pass') place(bot.root, T.add(middle(f), 0, -0.04));
    bot.wheels.forEach(w => w.rotation.x = key === 'run' ? f!.t * 14 : 0);
    bot.eyes.visible = !!f && ['sensor', 'run', 'pass', 'upload'].includes(key);
    held(tool, !code ? f : null, ['driver']); if (tool.visible) tool.rotation.y = f!.t * 9;
    restTool.visible = !tool.visible; held(pen, f, ['tick']);
    checks.forEach((m, i) => m.visible = key === 'tick' && f!.b.u > i / 4);
    plug.visible = !!code; if (f && key === 'plug') place(plug, f.h.r);
    status.set(!f ? 0 : key === 'run' ? 5 : key === 'upload' ? 4 : key === 'revise' ? 6 : ['pass', 'tick'].includes(key) ? 7 : code ? 3 : key === 'sensor' ? 1 : 2);
  });
};

/** A visitor chair faces its own narrow counter. It is deliberately a chair id so
 * waiting children use the existing seating system. Employee stands on the opposite
 * side, and social: spots reuse the same choreography with the real child. */
const tmCustomerChair: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  const chair = group(g);
  part(chair, rbox(0.44, 0.06, 0.4, 0.035), TEAL, 0, 0.43, 0);
  for (const x of [-0.17, 0.17]) for (const z of [-0.15, 0.15]) part(chair, cyl(0.024, 0.029, 0.4, 10), OAK, x, 0.2, z);
  for (const x of [-0.16, 0.16]) part(chair, cyl(0.02, 0.02, 0.44, 10), OAK, x, 0.6, -0.18);
  part(chair, rbox(0.42, 0.25, 0.05, 0.025), TEAL, 0, 0.74, -0.18);
  part(g, rbox(0.88, 0.05, 0.38, 0.025), OAK, 0, 0.75, 0.48);
  for (const x of [-0.39, 0.39]) {
    part(g, box(0.04, 0.72, 0.29), TEAL, x, 0.36, 0.48);
    part(g, box(0.08, 0.025, 0.36), DARK, x, 0.025, 0.48);
  }
  part(g, box(0.78, 0.29, 0.03), '#73afa0', 0, 0.56, 0.65);
  label(g, '도토리 주문·시연', 0.63, 0.115, 0, 0.59, 0.67, CREAM, DARK);
  const toy = car(g, RED, 0.75); place(toy.root, T.SHOP.toy);
  const tray = part(g, rbox(0.29, 0.015, 0.21, 0.012), CREAM, -0.13, 0.79, 0.46);
  const order = paper(g, T.SHOP.paper, '나만의 장난감', 0.24, 0.21);
  const strokes = marks(order, -0.055, 0.015, -0.03, 6);
  const pen = pencil(g);
  const swatches = group(g, -0.3, 0.79, 0.45);
  for (let i = 0; i < 3; i++) part(swatches, box(0.045, 0.004, 0.07), [RED, BLUE, GOLD][i], i * 0.025, 0.003 * i, 0, { ry: i * 0.25, outline: false });
  const till = group(g, 0.29, 0.8, 0.48);
  part(till, rbox(0.2, 0.075, 0.19, 0.012), TEAL, 0, 0.025, 0);
  for (let i = 0; i < 6; i++) part(till, box(0.035, 0.007, 0.026), CREAM, -0.05 + i % 3 * 0.05, 0.065, 0.012 + Math.floor(i / 3) * 0.04, { outline: false });
  const status = display(till, ['어서 와요', '₩ 18,000', '주문 완료'], [0, 0.07, -0.051], 0.17, 0.045, true);
  out.screen = status.mesh;
  const slip = flat(g, '주문 01', 0.11, 0.08, [0.29, 0.78, 0.35]);
  const receipt = flat(g, '주문 01', 0.11, 0.08, [0, 0, 0]);
  const choice = flat(g, '자동차  /  곰', 0.24, 0.07, [-0.1, 0.785, 0.35]);
  const visitor = child(g, [0, 0.46, 0], '#dfaa68', true);
  const on = group(g); out.inUse = on;
  glowing(on, ball(0.013), '#baf0af', 0.39, 0.88, 0.48);
  out.seat = marker(g, 0, 0.46, 0);
  animate(g, out, { tmDemoToy: 'tmDemo', tmTakeOrder: 'tmOrder', 'social:demoToy': 'tmDemo', 'social:takeToyOrder': 'tmOrder' }, f => {
    const key = f?.b.key ?? '', demo = f?.m === 'tmDemo';
    if (f?.social) T.poseToyClient(g, out.seat!, f.m, f.t, f.clock);
    visitor.root.visible = !!f && !f.social;
    toy.root.visible = !f || !!demo; tray.visible = !f || !!demo;
    order.visible = !!f && !demo; swatches.visible = !demo; choice.visible = !demo;
    place(order, T.SHOP.paper);
    if (f && key === 'confirm') place(order, T.add(middle(f), 0, -0.015));
    place(toy.root, T.SHOP.toy);
    if (f && demo) {
      place(toy.root, ['take', 'show', 'return'].includes(key) ? middle(f) : T.demoAt(key, f.b.u));
      toy.key.rotation.y = key === 'wind' ? f.t * 9 : 0;
      toy.wheels.forEach(w => w.rotation.z = ['run', 'child'].includes(key) ? f.t * 13 : 0);
    }
    visitor.pose(f?.t ?? 0, ['run', 'praise'].includes(key) ? 0.95 : 0.1, ['child', 'confirm', 'receipt'].includes(key) ? 0.9 : ['choose', 'colour'].includes(key) ? 0.6 : 0, demo ? toy.root.position.x * 0.8 : -0.15);
    held(pen, !demo ? f : null, ['draw']);
    held(receipt, f, ['receipt']); slip.visible = !receipt.visible;
    strokes.forEach((m, i) => m.visible = !!f && (f.b.i > 3 || key === 'draw' && f.b.u > i / 6));
    status.set(!f || demo ? 0 : f.b.i >= 5 ? 2 : f.b.i >= 4 ? 1 : 0);
  });
};

/** A small plush bear sat up (for the shop's displays). */
function shopBear(g: THREE.Object3D, x: number, y: number, z: number, color: string, s = 1) {
  const root = group(g, x, y, z); root.scale.setScalar(s);
  part(root, ball(0.07), color, 0, 0.07, 0);
  part(root, ball(0.052), color, 0, 0.17, 0.005);
  for (const sx of [-1, 1]) {
    part(root, ball(0.02), color, sx * 0.038, 0.215, 0);
    part(root, ball(0.026), color, sx * 0.05, 0.02, 0.04);
  }
  part(root, ball(0.018), CREAM, 0, 0.16, 0.048, { outline: false });
  return root;
}
/** Stacked wooden blocks, a tower of `n`. */
function shopBlocks(g: THREE.Object3D, x: number, y: number, z: number, n = 3) {
  const cols = [RED, GOLD, BLUE, TEAL, END];
  for (let i = 0; i < n; i++) part(g, rbox(0.07, 0.07, 0.07, 0.008), cols[i % cols.length], x + (i % 2) * 0.012, y + 0.035 + i * 0.07, z, { ry: i * 0.3 });
}
/**
 * The shop window's display (쇼윈도 진열대, 3 × 1; 2026-11-05, the layout audit): a low stepped stage of oak just inside the front
 * glass, its back to the street, the season's toys on its steps for passers-by: wooden cars, bears, block towers, a price card.
 */
function tmShopWindow(g: THREE.Group) {
  const zb = -0.22;
  part(g, rbox(2.86, 0.36, 0.56, 0.02), OAK, 0, 0.18, zb);
  part(g, rbox(2.86, 0.22, 0.3, 0.02), END, 0, 0.47, zb - 0.13);
  part(g, box(2.9, 0.012, 0.6), TEAL, 0, 0.006, zb, { outline: false });
  [-1.1, 0.25, 1.05].forEach((x, i) => { const c = car(g, [RED, BLUE, END][i], 1.3).root; c.position.set(x, 0.41, zb + 0.12); c.rotation.y = 0.5 - i * 0.4; });
  shopBear(g, -0.55, 0.58, zb - 0.13, '#c08a5a', 1.2);
  shopBear(g, 0.75, 0.58, zb - 0.13, '#e8c9a4', 1.1);
  shopBlocks(g, -0.15, 0.58, zb - 0.13, 4);
  shopBlocks(g, 1.25, 0.58, zb - 0.13, 3);
  label(g, '이달의 신상 · 원목 자동차', 0.74, 0.12, -0.6, 0.27, zb + 0.282, CREAM, DARK);
}
/** A display table in the middle of the shop (진열 테이블, 2 × 1): toys out to be picked up and played with, a basket of tops. */
function tmDisplayTable(g: THREE.Group) {
  legs(g, 1.7, 0.7, 0.68, OAK, 0.06, 0.02);
  surface(g, 1.86, 0.82, [0, 0.7, 0], END);
  part(g, box(1.7, 0.03, 0.66), TEAL, 0, 0.22, 0);
  const c = car(g, RED, 1.2).root; c.position.set(-0.55, 0.73, 0.1); c.rotation.y = 0.4;
  shopBear(g, 0.0, 0.73, -0.15, '#c08a5a');
  shopBear(g, 0.22, 0.73, -0.1, '#f2d7b5', 0.85);
  shopBlocks(g, 0.6, 0.73, 0.05, 3);
  shopBlocks(g, 0.72, 0.73, -0.2, 2);
  part(g, cyl(0.12, 0.1, 0.1, 14), '#b58b5a', -0.2, 0.78, 0.2);
  for (let i = 0; i < 4; i++) part(g, cyl(0.035, 0.003, 0.05, 10), [RED, GOLD, BLUE, TEAL][i], -0.25 + (i % 2) * 0.08, 0.85, 0.16 + Math.floor(i / 2) * 0.07);
  label(g, '만져 보세요', 0.34, 0.08, 0.5, 0.67, 0.412, CREAM, DARK);
}

export const BUILDERS: Record<string, Builder> = {
  toyWorkbench, plushTable, playtestMat, wrapStation, toyShelf,
  tmCustomerChair, tmDryingRack, tmScrollSaw, tmRobotBench, tmShopWindow, tmDisplayTable,
};

