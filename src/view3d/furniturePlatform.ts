import * as THREE from 'three';
import { DARK, METAL, WHITE, WOOD, marker, rod, screenMesh, shade, tint, type Builder } from './parts';
import { ball, box, cyl, part, rbox } from './toon';

/**
 * The platform family (docs/3d/01-view.md §3): everything people perform, train or play on —
 * stages with their lights and speakers, runways, sets with a backdrop and a camera's lights, a
 * skate ramp, an obstacle course, a car lift, and the soft mats of a nursery or a gym. Each kind
 * gets its own shape; the use (activity.ts) stays the family's.
 */
const BLACK = '#2b2b30';
const STEEL = '#c3cad0';
const glow = (color: string) => new THREE.MeshBasicMaterial({ color });

/** A raised stage `h` high over the whole footprint, a lip along its front and steps up at one side. */
function deck(g: THREE.Object3D, W: number, D: number, c: string, h: number) {
  part(g, rbox(W - 0.04, h, D - 0.04, 0.02), shade(c, 0.55), 0, h / 2, 0);
  part(g, rbox(W - 0.02, 0.03, D - 0.02, 0.01), shade(c, 0.85), 0, h + 0.015, 0);
  part(g, box(W - 0.1, 0.012, 0.02), '#ffd54f', 0, h + 0.03, D / 2 - 0.06, { outline: false });
  for (let i = 0; i < 2; i++) part(g, rbox(0.45, (h * (i + 1)) / 3, 0.22, 0.01), shade(c, 0.5), W / 2 - 0.3, (h * (i + 1)) / 6, D / 2 + 0.11 - i * 0.2);
}

/** A truss across the back on two posts, lights hung from it pointing down to the stage. */
function truss(g: THREE.Object3D, W: number, z: number, y: number, colors: string[]) {
  for (const sx of [-1, 1]) part(g, box(0.08, y, 0.08), METAL, sx * (W / 2 - 0.1), y / 2, z, { outline: false });
  part(g, box(W - 0.1, 0.1, 0.1), METAL, 0, y, z, { outline: false });
  colors.forEach((k, i) => {
    const x = -W / 2 + 0.4 + (i * (W - 0.8)) / Math.max(1, colors.length - 1);
    part(g, cyl(0.06, 0.08, 0.16, 12), BLACK, x, y - 0.12, z + 0.06, { rx: 0.6 });
    part(g, cyl(0.06, 0.06, 0.01, 12), k, x, y - 0.17, z + 0.12, { rx: 0.6, outline: false, material: glow(k) });
  });
}

/** A speaker cabinet standing on the floor (or a stage) at x, z. */
function speaker(g: THREE.Object3D, x: number, y: number, z: number, h = 0.9) {
  part(g, rbox(0.4, h, 0.36, 0.02), BLACK, x, y + h / 2, z);
  for (const [k, r] of [[0.3, 0.13], [0.72, 0.06]] as const) part(g, cyl(r, r, 0.015, 18), '#55565e', x, y + h * k, z + 0.185, { rx: Math.PI / 2, outline: false });
}

/** A mic on its stand at x, z on a surface at y. */
function micStand(g: THREE.Object3D, x: number, y: number, z: number) {
  part(g, cyl(0.12, 0.13, 0.02, 14), BLACK, x, y + 0.01, z);
  part(g, cyl(0.012, 0.012, 1.4, 6), METAL, x, y + 0.7, z, { outline: false });
  part(g, cyl(0.03, 0.022, 0.1, 10), BLACK, x, y + 1.42, z + 0.03, { rx: 0.5 });
}

/** A softbox light on a stand, turned towards (tx, tz). */
function softbox(g: THREE.Object3D, x: number, z: number, tx: number, tz: number) {
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    rod(g, new THREE.Vector3(x, 1.0, z), new THREE.Vector3(x + Math.cos(a) * 0.22, 0, z + Math.sin(a) * 0.22), 0.01, DARK);
  }
  part(g, cyl(0.012, 0.012, 0.8, 6), DARK, x, 1.4, z, { outline: false });
  const head = new THREE.Group();
  head.position.set(x, 1.75, z);
  head.lookAt(tx, 1.2, tz);
  g.add(head);
  part(head, box(0.5, 0.4, 0.25), BLACK, 0, 0, -0.05);
  part(head, box(0.46, 0.36, 0.01), '#fffde7', 0, 0, 0.08, { outline: false, material: glow('#fffde7') });
}

/** A backdrop across the back: a wall of `color` (a paper roll on a frame for a photo set). */
function backdrop(g: THREE.Object3D, W: number, D: number, color: string, roll = false) {
  const z = -D / 2 + 0.06;
  if (roll) {
    for (const sx of [-1, 1]) part(g, cyl(0.02, 0.02, 2.4, 8), DARK, sx * (W / 2 - 0.1), 1.2, z, { outline: false });
    part(g, cyl(0.06, 0.06, W - 0.2, 14), color, 0, 2.35, z, { rz: Math.PI / 2 });
    // The paper down the back and curving out over the floor.
    part(g, box(W - 0.35, 2.2, 0.01), color, 0, 1.2, z + 0.02, { outline: false });
    part(g, box(W - 0.35, 0.01, 0.9), color, 0, 0.012, z + 0.47, { outline: false });
    return;
  }
  part(g, rbox(W - 0.1, 2.4, 0.08, 0.01), color, 0, 1.2, z);
}

/** A soft mat `w` × `d` at x, z, rounded, with a band round its edge. */
function mat(g: THREE.Object3D, w: number, d: number, x: number, z: number, color: string, t = 0.05) {
  part(g, rbox(w, t, d, Math.min(0.04, t / 2)), color, x, t / 2, z);
  part(g, box(w - 0.08, 0.002, d - 0.08), tint(color, 0.25), x, t + 0.001, z, { outline: false });
}

const TOYS = ['#e57373', '#64b5f6', '#81c784', '#ffd54f', '#ba68c8', '#ff8a65'];

/**
 * The concert stage (2026-10-26, at the user's request: the singer goes up on it and sings): the deck
 * with its steps, the band's gear kept to the back (drums on a riser, a keyboard, an amp), and the
 * front clear for the singer — a mic stand near the lip with its head turned back to them, a floor
 * monitor either side of it, a lit screen behind under the truss.
 */
function concertStage(g: THREE.Group, W: number, D: number, c: string, out: Parameters<Builder>[6]) {
  const h = 0.4;
  deck(g, W, D, c, h);
  const back = -D / 2 + 0.15;
  truss(g, W, back, 2.9, ['#e040fb', '#40c4ff', '#ffd740', '#40c4ff', '#ff5252']);
  // The screen at the back: a dark frame with a glowing gradient and a few bright bars.
  part(g, rbox(W - 0.7, 1.3, 0.06, 0.01), BLACK, 0, h + 1.2, back - 0.02);
  part(g, box(W - 0.8, 1.2, 0.01), '#3a1c7a', 0, h + 1.2, back + 0.015, { outline: false, material: glow('#3a1c7a') });
  ['#e040fb', '#7c4dff', '#40c4ff', '#7c4dff', '#e040fb'].forEach((k, i) => part(g, box(0.18, 0.5 + (i % 3) * 0.22, 0.005), k, -0.8 + i * 0.4, h + 0.85 + (i % 3) * 0.11, back + 0.022, { outline: false, material: glow(k) }));
  for (const sx of [-1, 1]) speaker(g, sx * (W / 2 - 0.28), h, back + 0.2, 1.05);
  // Drums on a low riser to the back left: bass drum, snare, toms, a cymbal and a hi-hat.
  const dx = -0.62;
  const dz = back + 0.5;
  part(g, rbox(1.0, 0.12, 0.7, 0.02), shade(c, 0.4), dx, h + 0.06, dz);
  const y = h + 0.12;
  part(g, cyl(0.22, 0.22, 0.26, 20), '#eceff1', dx, y + 0.22, dz + 0.05, { rx: Math.PI / 2 });
  part(g, cyl(0.2, 0.2, 0.01, 20), '#311b92', dx, y + 0.22, dz + 0.185, { rx: Math.PI / 2, outline: false });
  part(g, cyl(0.13, 0.13, 0.1, 16), '#cfd8dc', dx + 0.3, y + 0.5, dz + 0.12);
  for (const sx of [-1, 1]) part(g, cyl(0.1, 0.1, 0.1, 16), '#eceff1', dx + sx * 0.12, y + 0.52, dz - 0.06, { rx: 0.3 });
  for (const [x, z, r, top] of [[dx - 0.38, dz - 0.05, 0.19, 0.92], [dx + 0.42, dz - 0.12, 0.14, 0.75]] as const) {
    part(g, cyl(0.01, 0.01, top, 6), METAL, x, y + top / 2, z, { outline: false });
    part(g, cyl(r, r * 0.9, 0.012, 20), '#d4a017', x, y + top, z, { rx: 0.15 });
  }
  // A keyboard on its stand to the back right, an amp beside it.
  const kx = 0.62;
  for (const sx of [-1, 1]) rod(g, new THREE.Vector3(kx - 0.3, h, dz + sx * 0.15), new THREE.Vector3(kx + 0.3, h + 0.78, dz - sx * 0.15), 0.012, DARK);
  part(g, rbox(0.9, 0.06, 0.28, 0.01), BLACK, kx, h + 0.82, dz);
  part(g, box(0.82, 0.012, 0.12), WHITE, kx, h + 0.856, dz + 0.06, { outline: false });
  for (let i = 0; i < 14; i++) if (i % 7 !== 2 && i % 7 !== 6) part(g, box(0.025, 0.014, 0.07), BLACK, kx - 0.38 + i * 0.058 + 0.029, h + 0.866, dz + 0.035, { outline: false });
  part(g, rbox(0.42, 0.4, 0.26, 0.02), '#3e2723', W / 2 - 0.3, h + 0.2, 0.15);
  part(g, box(0.36, 0.22, 0.005), '#1b1b1f', W / 2 - 0.3, h + 0.17, 0.283, { outline: false });
  part(g, box(0.36, 0.05, 0.005), '#d7ccc8', W / 2 - 0.3, h + 0.34, 0.283, { outline: false });
  // The singer's place: a floor monitor either side, the mic stand near the lip turned back to them.
  const mz = D / 2 - 0.4;
  for (const sx of [-1, 1]) {
    const wedge = new THREE.Group();
    wedge.position.set(sx * 0.55, h, mz + 0.12);
    wedge.rotation.y = sx * 0.35 + Math.PI;
    g.add(wedge);
    part(wedge, rbox(0.42, 0.22, 0.3, 0.02), BLACK, 0, 0.11, 0, { rx: -0.45 });
    part(wedge, cyl(0.07, 0.07, 0.01, 16), '#55565e', 0, 0.15, 0.1, { rx: Math.PI / 2 - 0.45, outline: false });
  }
  liveMic(g, h, mz, out);
}

/**
 * The performer's mic near a stage's lip, its head turned back to them at the mouth (the work point),
 * and where they stand behind it on the deck facing out (`stand`).
 */
function liveMic(g: THREE.Group, h: number, mz: number, out: Parameters<Builder>[6]) {
  part(g, cyl(0.13, 0.14, 0.02, 16), BLACK, 0, h + 0.01, mz);
  part(g, cyl(0.012, 0.012, 1.42, 6), METAL, 0, h + 0.71, mz, { outline: false });
  const head = new THREE.Group();
  head.position.set(0, h + 1.44, mz);
  head.rotation.x = 0.55;
  g.add(head);
  part(head, cyl(0.014, 0.014, 0.12, 8), BLACK, 0, 0, -0.06, { rx: Math.PI / 2 });
  part(head, ball(0.035), '#9ea7ad', 0, 0, -0.13);
  out.work = marker(g, 0, h + 1.46, mz - 0.1);
  out.stand = marker(g, 0, h, mz - 0.36);
}

/**
 * The comedy club's stage (2026-10-26, at the user's request: the comedian stood below it, fiddling
 * with it): a low deck against a brick wall with the club's neon sign, a warm spot overhead, a bar
 * stool with a glass of water to one side, and the mic near the lip — the comedian up behind it,
 * facing the room.
 */
function clubStage(g: THREE.Group, W: number, D: number, c: string, out: Parameters<Builder>[6]) {
  const h = 0.35;
  deck(g, W, D, c, h);
  const back = -D / 2 + 0.08;
  // The brick wall: a dark red panel, mortar courses across, every other course's joints offset.
  part(g, rbox(W - 0.1, 2.3, 0.08, 0.01), '#8e3b2b', 0, h + 1.15, back);
  for (let i = 1; i < 12; i++) {
    const y = h + i * 0.19;
    part(g, box(W - 0.12, 0.012, 0.005), '#5d2a20', 0, y, back + 0.042, { outline: false });
    for (let x = -W / 2 + 0.2 + (i % 2) * 0.17; x < W / 2 - 0.1; x += 0.34) part(g, box(0.012, 0.18, 0.005), '#5d2a20', x, y + 0.095, back + 0.042, { outline: false });
  }
  // The neon sign: a glowing ring and two bars, the club's laugh in light.
  const sign = new THREE.Group();
  sign.position.set(-0.45, h + 1.75, back + 0.06);
  g.add(sign);
  part(sign, new THREE.TorusGeometry(0.2, 0.018, 8, 28), '#ff4081', 0, 0, 0, { outline: false, material: glow('#ff4081') });
  for (const [x, w] of [[0.38, 0.3], [0.38, 0.22]] as const) part(sign, box(w, 0.035, 0.02), '#ffd740', x + w / 2 - 0.1, w > 0.25 ? 0.07 : -0.07, 0, { outline: false, material: glow('#ffd740') });
  truss(g, W, back + 0.25, 2.75, ['#fff3e0', '#ffcc80', '#fff3e0']);
  // A bar stool to the side with a glass of water on it.
  const sx = 0.75;
  const sz = 0.05;
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) rod(g, new THREE.Vector3(sx + x * 0.12, h, sz + z * 0.12), new THREE.Vector3(sx + x * 0.06, h + 0.7, sz + z * 0.06), 0.012, DARK);
  part(g, cyl(0.17, 0.15, 0.06, 18), '#212121', sx, h + 0.73, sz);
  part(g, cyl(0.035, 0.03, 0.11, 12), '#b3e5fc', sx + 0.05, h + 0.815, sz, { outline: false });
  liveMic(g, h, D / 2 - 0.4, out);
}

export const PLATFORMS: Record<string, Builder> = {
  stage(g, W, D, c, def, _ctx, out) {
    if (def.id === 'concertStage') return concertStage(g, W, D, c, out);
    if (def.id === 'clubStage') return clubStage(g, W, D, c, out);
    const h = def.id === 'recitalStage' ? 0.3 : 0.4;
    deck(g, W, D, c, h);
    const back = -D / 2 + 0.15;
    if (def.id !== 'recitalStage') truss(g, W, back, 2.8, ['#fff8e1', '#ffe082', '#fff8e1']);
    if (W >= 2.5) for (const sx of [-1, 1]) speaker(g, sx * (W / 2 - 0.3), h, back + 0.15);
    // A dance stage and a recital stage are danced on: the floor clear, a headset mic to the side.
    micStand(g, W / 2 - 0.35, h, D / 2 - 0.3);
    if (def.id === 'recitalStage') {
      // A curtain either side and paper stars on the back.
      for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) part(g, rbox(0.12, 1.8, 0.08, 0.04), '#c2185b', sx * (W / 2 - 0.1 - i * 0.09), h + 0.9, -D / 2 + 0.1 + i * 0.02, { outline: false });
      for (let i = 0; i < 5; i++) part(g, ball(0.06), '#ffd54f', -0.6 + i * 0.3, h + 1.6 + (i % 2) * 0.15, -D / 2 + 0.05, { outline: false });
    }
    // Up on the deck in the middle, a little to the front, facing out (2026-10-26: they stood below it).
    out.stand = marker(g, 0, h, D / 2 - 0.75);
  },
  runway(g, W, D, c, _def, _ctx, out) {
    // A long raised walk with lights along both edges, a backdrop at its head.
    const along = D >= W;
    const L = (along ? D : W) - 0.1;
    const w = Math.min(along ? W : D, 1) - 0.1;
    const hold = new THREE.Group();
    if (!along) hold.rotation.y = Math.PI / 2;
    g.add(hold);
    const h = 0.25;
    part(hold, rbox(w, h, L, 0.02), BLACK, 0, h / 2, 0);
    part(hold, box(w - 0.06, 0.01, L - 0.06), c, 0, h + 0.005, 0, { outline: false });
    for (const sx of [-1, 1]) for (let z = -L / 2 + 0.2; z < L / 2; z += 0.35) part(hold, ball(0.025), '#fff8e1', sx * (w / 2 - 0.02), h + 0.01, z, { outline: false, material: glow('#fff8e1') });
    part(hold, rbox(w + 0.3, 2.3, 0.08, 0.01), shade(c, 0.85), 0, 1.15, -L / 2 + 0.04);
    part(hold, box(w - 0.1, 0.25, 0.01), WHITE, 0, 2.0, -L / 2 + 0.085, { outline: false });
    out.work = marker(g, 0, h + 1.0, 0);
  },
  set(g, W, D, c, def, _ctx, out) {
    // A set: a backdrop, what's in front of it (a sofa and table for a talk show, a desk and a
    // map for the weather, a sofa and lamp for a showroom), lights and a camera facing it.
    const id = def.id;
    const photo = /lookbook|posing/i.test(id);
    backdrop(g, W, D, id === 'weatherSet' ? '#1565c0' : photo ? tint(c, 0.2) : shade(c, 0.9), photo);
    const mid = -D / 2 + 0.7;
    if (id === 'talkShowSet') {
      part(g, rbox(1.0, 0.75, 0.5, 0.03), WOOD, -0.6, 0.375, mid);
      part(g, rbox(1.2, 0.4, 0.6, 0.08), '#5e35b1', 0.6, 0.2, mid + 0.05);
      part(g, rbox(1.2, 0.45, 0.15, 0.06), '#4527a0', 0.6, 0.55, mid - 0.2);
      part(g, cyl(0.05, 0.05, 0.12, 12), WHITE, -0.4, 0.81, mid);
      part(g, rbox(W - 0.6, 0.8, 0.02, 0.01), '#1a237e', 0, 1.6, -D / 2 + 0.11);
      for (let i = 0; i < 10; i++) part(g, ball(0.02), '#fff59d', -W / 2 + 0.5 + i * ((W - 1) / 9), 1.35 + (i % 3) * 0.25, -D / 2 + 0.13, { outline: false, material: glow('#fff59d') });
    } else if (id === 'weatherSet') {
      const s = screenMesh(W - 0.6, 1.0);
      s.position.set(0, 1.5, -D / 2 + 0.12);
      g.add(s);
      out.screen = s;
      part(g, box(0.5, 0.35, 0.005), '#66bb6a', -0.25, 1.5, -D / 2 + 0.135, { outline: false });
      part(g, ball(0.08), '#ffd54f', 0.35, 1.7, -D / 2 + 0.14, { outline: false });
    } else if (id === 'showroomSet') {
      part(g, rbox(1.4, 0.4, 0.7, 0.08), '#bcaaa4', -0.4, 0.2, mid);
      part(g, rbox(1.4, 0.4, 0.16, 0.06), '#a1887f', -0.4, 0.55, mid - 0.27);
      part(g, rbox(0.5, 0.04, 0.5, 0.02), WOOD, 0.75, 0.45, mid + 0.1);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.015, 0.015, 0.43, 6), DARK, 0.75 + sx * 0.2, 0.215, mid + 0.1 + sz * 0.2, { outline: false });
      part(g, cyl(0.06, 0.08, 0.3, 12), '#c46b4c', 0.75, 0.62, mid + 0.1);
      part(g, ball(0.15), '#66bb6a', 0.75, 0.88, mid + 0.1);
      part(g, rbox(1.8, 0.01, 1.2, 0.005), '#d7ccc8', 0, 0.006, mid + 0.1, { outline: false });
    } else if (id === 'filmSet') {
      // A room's corner: a wall with a window, a chair; a clapperboard and a director's chair out front.
      part(g, rbox(0.06, 2.4, D - 0.2, 0.01), shade(c, 0.85), -W / 2 + 0.1, 1.2, 0);
      part(g, box(0.8, 0.8, 0.02), '#b3e5fc', 0.4, 1.4, -D / 2 + 0.11, { outline: false });
      part(g, rbox(0.5, 0.45, 0.5, 0.05), '#8d6e63', 0.4, 0.23, mid);
      part(g, rbox(0.25, 0.18, 0.02, 0.01), BLACK, W / 2 - 0.4, 0.7, D / 2 - 0.3, { rx: -0.3 });
    }
    // Lights and the camera, out in front of the set.
    if (W >= 2) softbox(g, -W / 2 + 0.35, D / 2 - 0.35, 0, mid);
    if (photo) softbox(g, W / 2 - 0.35, D / 2 - 0.35, 0, mid);
    out.work = marker(g, 0, 1.0, mid + 0.3);
  },
  ramp(g, W, D, c, _def, _ctx, out) {
    // A quarter pipe: a curved deck rising to a platform at the back, coping along its lip.
    const R = Math.min(D - 0.4, 1.4);
    const w = W - 0.1;
    const n = 10;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * (Math.PI / 2);
      const a1 = ((i + 1) / n) * (Math.PI / 2);
      const z0 = D / 2 - 0.05 - Math.sin(a0) * R;
      const z1 = D / 2 - 0.05 - Math.sin(a1) * R;
      const y0 = R - Math.cos(a0) * R;
      const y1 = R - Math.cos(a1) * R;
      rodBoard(g, w, new THREE.Vector3(0, y0, z0), new THREE.Vector3(0, y1, z1), i % 2 ? c : shade(c, 0.92));
    }
    const back = D / 2 - 0.05 - R;
    part(g, box(w, R, 0.04), shade(c, 0.7), 0, R / 2, back - 0.02);
    part(g, rbox(w, 0.04, -D / 2 + back + 0.1 > 0 ? 0.3 : Math.max(0.25, back + D / 2), 0.01), shade(c, 0.85), 0, R, (back - D / 2) / 2);
    part(g, cyl(0.03, 0.03, w, 10), METAL, 0, R + 0.02, back + 0.01, { rz: Math.PI / 2, outline: false });
    // Posts under the deck at the back, open at the sides so the curve shows.
    for (const sx of [-1, 1]) part(g, box(0.06, R, 0.06), shade(c, 0.6), sx * (w / 2 - 0.03), R / 2, back - 0.15, { outline: false });
    out.work = marker(g, 0, 0.6, D / 2 - 0.3);
  },
  obstacles(g, W, D, c, _def, _ctx, out) {
    // Along a strip of turf: hurdles, a low wall to vault and a row of cones to weave through.
    const along = W >= D;
    const L = (along ? W : D) - 0.1;
    const hold = new THREE.Group();
    if (!along) hold.rotation.y = Math.PI / 2;
    g.add(hold);
    part(hold, box(L, 0.02, 0.8), '#558b2f', 0, 0.01, 0, { outline: false });
    for (const x of [-L / 2 + 0.4, -L / 2 + 0.9]) {
      for (const sz of [-1, 1]) part(hold, cyl(0.015, 0.015, 0.6, 6), WHITE, x, 0.3, sz * 0.3, { outline: false });
      part(hold, box(0.04, 0.08, 0.64), '#e53935', x, 0.56, 0);
    }
    part(hold, rbox(0.3, 0.6, 0.7, 0.03), c, 0.2, 0.3, 0);
    for (let i = 0; i < 3; i++) part(hold, new THREE.ConeGeometry(0.08, 0.3, 12), '#ff6f00', L / 2 - 0.7 + i * 0.25, 0.15, (i % 2 ? 1 : -1) * 0.15);
    out.work = marker(g, 0, 0.6, along ? 0.4 : 0);
  },
  carLift(g, W, D, c, _def, _ctx, out) {
    // A two-post lift: posts either side, arms under a car raised up, a tool trolley by it.
    const w = W - 0.3;
    for (const sx of [-1, 1]) {
      part(g, rbox(0.22, 2.6, 0.22, 0.02), c, sx * (w / 2), 1.3, 0);
      part(g, box(0.3, 0.02, 0.4), '#ffca28', sx * (w / 2), 0.01, 0, { outline: false });
      for (const sz of [-1, 1]) part(g, box(0.5, 0.05, 0.08), DARK, sx * (w / 2 - 0.3), 1.0, sz * 0.5, { ry: sx * sz * 0.4, outline: false });
    }
    part(g, box(w, 0.1, 0.12), c, 0, 2.6, 0, { outline: false });
    // The car on the arms.
    const car = new THREE.Group();
    car.position.y = 1.05;
    car.rotation.y = Math.PI / 2;
    g.add(car);
    sedan(car, Math.min(D - 0.3, 2.6), Math.min(w - 0.5, 1.2), '#e53935');
    part(g, rbox(0.4, 0.8, 0.3, 0.02), '#d32f2f', w / 2 + 0.05, 0.4, D / 2 - 0.25);
    out.work = marker(g, 0, 1.2, 0.7);
  },
  mats(g, W, D, c, def, _ctx, out) {
    const id = def.id;
    const along = W >= D;
    const L = along ? W : D;
    const hold = new THREE.Group();
    if (!along) hold.rotation.y = Math.PI / 2;
    g.add(hold);
    if (id === 'napMats') {
      // Little mats in a row, each with its pillow and a folded blanket.
      const n = Math.max(2, Math.round(L / 0.6));
      for (let i = 0; i < n; i++) {
        const x = -L / 2 + (L / n) * (i + 0.5);
        mat(hold, L / n - 0.08, 0.8, x, 0, TOYS[i % TOYS.length], 0.06);
        part(hold, rbox(0.3, 0.06, 0.16, 0.03), WHITE, x, 0.09, -0.27);
        part(hold, rbox(L / n - 0.16, 0.04, 0.3, 0.02), tint(TOYS[(i + 2) % TOYS.length], 0.3), x, 0.08, 0.2);
      }
      out.work = marker(g, 0, 0.3, 0.4);
      return;
    }
    if (id === 'stuntMat' || id === 'sparringMat' || id === 'activityMat') {
      // A thick crash mat in folding panels.
      const n = Math.max(2, Math.round(L / 0.5));
      for (let i = 0; i < n; i++) part(hold, rbox(L / n - 0.02, 0.18, 0.9, 0.04), i % 2 ? c : shade(c, 0.85), -L / 2 + (L / n) * (i + 0.5), 0.09, 0);
      if (id === 'sparringMat') part(hold, cyl(0.15, 0.18, 1.1, 14), '#c62828', L / 2 - 0.25, 0.73, -0.25);
      out.work = marker(g, 0, 0.6, 0.35);
      return;
    }
    // A thin mat on the floor; what goes on it besides.
    const yoga = /yoga|meditation/i.test(id);
    if (yoga) {
      for (const [i, x] of [-L / 4, L / 4].entries()) {
        mat(hold, L / 2 - 0.25, 0.62, x, 0, i ? shade(c, 0.85) : c, 0.012);
        part(hold, cyl(0.06, 0.06, 0.6, 14), tint(c, 0.3), x, 0.07, -0.38, { rz: Math.PI / 2 });
      }
      if (id === 'meditationMat') {
        part(hold, cyl(0.18, 0.2, 0.1, 18), '#7e57c2', 0, 0.06, 0.1);
        part(hold, cyl(0.03, 0.04, 0.1, 10), '#bcaaa4', L / 2 - 0.15, 0.05, -0.35);
        part(hold, cyl(0.004, 0.004, 0.25, 4), '#5d4037', L / 2 - 0.15, 0.2, -0.35, { outline: false });
      }
      out.work = marker(g, 0, 0.4, 0.3);
      return;
    }
    // A play mat in squares, with what it's for on it: blocks, soft shapes, a basket of books.
    const n = Math.max(2, Math.round(L / 0.5));
    for (let i = 0; i < n; i++) for (const z of [-0.22, 0.22]) mat(hold, L / n - 0.01, 0.43, -L / 2 + (L / n) * (i + 0.5), z, TOYS[(i + (z > 0 ? 1 : 0)) % TOYS.length], 0.03);
    if (id === 'blockMat' || id === 'playtestMat') {
      for (let i = 0; i < 9; i++) part(hold, rbox(0.1, 0.1, 0.1, 0.01), TOYS[i % TOYS.length], -0.35 + (i % 3) * 0.12, 0.08 + Math.floor(i / 3) * 0.1, (i % 2) * 0.03, { ry: i * 0.3 });
      part(hold, cyl(0.08, 0.08, 0.1, 6), '#ffd54f', 0.35, 0.08, 0.1);
    } else if (id === 'sensoryMat') {
      part(hold, ball(0.2), '#ba68c8', -0.3, 0.23, 0);
      part(hold, cyl(0.15, 0.15, 0.6, 16), '#4fc3f7', 0.3, 0.18, 0, { rz: Math.PI / 2 });
      for (let i = 0; i < 6; i++) part(hold, ball(0.04), TOYS[i], -0.6 + i * 0.05, 0.07, 0.3 - (i % 2) * 0.06, { outline: false });
    } else {
      // A story corner: big floor cushions and a basket of picture books.
      for (const [x, k] of [[-0.45, '#ef9a9a'], [0.05, '#90caf9']] as const) part(hold, rbox(0.42, 0.14, 0.42, 0.07), k, x, 0.1, 0.05);
      part(hold, cyl(0.17, 0.15, 0.22, 14), '#bcaaa4', L / 2 - 0.3, 0.14, -0.15);
      for (let i = 0; i < 4; i++) part(hold, box(0.03, 0.2, 0.16), TOYS[i], L / 2 - 0.36 + i * 0.04, 0.3, -0.15, { rz: (i - 1.5) * 0.12, outline: false });
    }
    out.work = marker(g, 0, 0.4, 0.4);
  },
};

/** A board of the ramp's deck from one edge point to the next (across the width). */
function rodBoard(g: THREE.Object3D, w: number, a: THREE.Vector3, b: THREE.Vector3, color: string) {
  const len = a.distanceTo(b) + 0.01;
  const m = part(g, box(w, 0.04, len), color, 0, (a.y + b.y) / 2, (a.z + b.z) / 2, { outline: false });
  m.rotation.x = Math.atan2(b.y - a.y, -(b.z - a.z));
}

/** Which platform kind an id is. */
export function platformOf(id: string): keyof typeof PLATFORMS {
  if (/Stage$/.test(id)) return 'stage';
  if (/runway|catwalk/i.test(id)) return 'runway';
  if (/Set$|posingSpot/.test(id)) return 'set';
  if (/ramp/i.test(id)) return 'ramp';
  if (/obstacle/i.test(id)) return 'obstacles';
  if (/carLift/.test(id)) return 'carLift';
  return 'mats';
}

/**
 * A car body seen side on, `L` long and `Wd` wide, its front to +z: a low body with rounded
 * bonnet and boot, a glasshouse with sloped screens, wheels under the arches, lights at each end.
 */
export function sedan(g: THREE.Object3D, L: number, Wd: number, c: string, kind: 'sedan' | 'van' | 'jeep' | 'truck' = 'sedan') {
  const p = new THREE.Shape();
  const h = 0.62;
  const roof = kind === 'van' ? 1.75 : kind === 'jeep' ? 1.55 : kind === 'truck' ? 1.85 : 1.35;
  const z0 = -L / 2;
  const z1 = L / 2;
  // The body's side profile in (z, y).
  p.moveTo(z0, 0.25);
  p.lineTo(z0, h);
  if (kind === 'truck') {
    p.lineTo(z1 - 1.2, h);
    p.lineTo(z1 - 1.2, roof);
    p.lineTo(z1 - 0.25, roof);
    p.lineTo(z1, h + 0.25);
  } else if (kind === 'van') {
    p.lineTo(z0, roof - 0.05);
    p.quadraticCurveTo(z0, roof, z0 + 0.1, roof);
    p.lineTo(z1 - 0.6, roof);
    p.lineTo(z1 - 0.1, h + 0.2);
  } else {
    const back = kind === 'jeep' ? z0 + 0.1 : z0 + L * 0.22;
    const front = kind === 'jeep' ? z1 - L * 0.32 : z1 - L * 0.32;
    p.lineTo(back - 0.05, h + 0.05);
    p.lineTo(back + 0.25, roof);
    p.lineTo(front - 0.25, roof);
    p.lineTo(front + 0.2, h + 0.08);
    p.lineTo(z1 - 0.05, h);
  }
  p.lineTo(z1, 0.25);
  p.closePath();
  const body = new THREE.ExtrudeGeometry(p, { depth: Wd, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2, steps: 1 });
  // The profile's x becomes the car's length (+z forward), the extrusion its width.
  body.rotateY(-Math.PI / 2).translate(Wd / 2, 0, 0);
  const m = part(g, body, c, 0, 0, 0);
  m.userData.ownGeometry = true;
  // The windows: a darker band of glass round the glasshouse.
  const glass = '#9cc9e6';
  if (kind === 'truck') part(g, box(Wd + 0.09, 0.4, 0.8), glass, 0, roof - 0.35, z1 - 0.75, { outline: false });
  else if (kind === 'van') part(g, box(Wd + 0.09, 0.42, L - 1.0), glass, 0, roof - 0.42, -0.2, { outline: false });
  else part(g, box(Wd + 0.09, 0.36, L * 0.36), glass, 0, roof - 0.34, kind === 'jeep' ? -L * 0.1 : -L * 0.05, { outline: false });
  // Wheels, with hubs.
  const r = kind === 'truck' || kind === 'jeep' ? 0.38 : 0.32;
  for (const sx of [-1, 1])
    for (const z of [z0 + 0.6, z1 - 0.6]) {
      part(g, cyl(r, r, 0.22, 20), BLACK, sx * (Wd / 2), r, z, { rz: Math.PI / 2 });
      part(g, cyl(r * 0.55, r * 0.55, 0.225, 14), STEEL, sx * (Wd / 2), r, z, { rz: Math.PI / 2, outline: false });
    }
  // Lights, a grille and mirrors.
  for (const sx of [-1, 1]) {
    part(g, rbox(0.2, 0.1, 0.04, 0.02), '#fff8e1', sx * (Wd / 2 - 0.15), h - 0.08, z1 + 0.03, { material: glow('#fff8e1') });
    part(g, rbox(0.2, 0.1, 0.04, 0.02), '#e53935', sx * (Wd / 2 - 0.15), h - 0.08, z0 - 0.03);
    if (kind !== 'truck') part(g, rbox(0.06, 0.08, 0.12, 0.02), c, sx * (Wd / 2 + 0.1), h + 0.25, z1 - L * 0.32);
  }
  part(g, rbox(Wd * 0.45, 0.12, 0.03, 0.01), DARK, 0, h - 0.15, z1 + 0.035);
  part(g, rbox(Wd + 0.1, 0.12, 0.08, 0.02), DARK, 0, 0.3, z1 + 0.02);
  part(g, rbox(Wd + 0.1, 0.12, 0.08, 0.02), DARK, 0, 0.3, z0 - 0.02);
  return roof;
}

/** The household family's vehicles (furniture3d.ts vehicle): cars, vans, trucks, a jeep, a tractor, scooters, a plane. */
export const vehicle: Builder = (g, W, D, c, def) => {
  const id = def.id;
  const long = D > W;
  const L = (long ? D : W) - 0.15;
  const Wd = Math.min((long ? W : D) - 0.2, 1.7);
  const v = new THREE.Group();
  if (!long) v.rotation.y = Math.PI / 2;
  g.add(v);
  if (/scooter|bike/i.test(id)) {
    // A scooter: deck, front column and handlebars, seat over the back wheel, a box on the back for the post.
    for (const z of [-0.4, 0.4]) {
      part(v, cyl(0.2, 0.2, 0.09, 16), BLACK, 0, 0.2, z, { rz: Math.PI / 2 });
      part(v, cyl(0.1, 0.1, 0.095, 12), STEEL, 0, 0.2, z, { rz: Math.PI / 2, outline: false });
    }
    part(v, rbox(0.3, 0.08, 0.6, 0.03), DARK, 0, 0.3, -0.05);
    part(v, rbox(0.36, 0.35, 0.5, 0.1), c, 0, 0.5, -0.25);
    part(v, rbox(0.3, 0.08, 0.36, 0.04), BLACK, 0, 0.72, -0.25);
    part(v, rbox(0.3, 0.6, 0.12, 0.05), c, 0, 0.6, 0.38, { rx: -0.25 });
    part(v, cyl(0.015, 0.015, 0.55, 8), DARK, 0, 1.0, 0.45, { rz: Math.PI / 2, outline: false });
    part(v, rbox(0.12, 0.08, 0.04, 0.02), '#fff8e1', 0, 0.75, 0.47, { material: glow('#fff8e1') });
    if (/mail|press/i.test(id)) part(v, rbox(0.38, 0.3, 0.32, 0.03), /mail/i.test(id) ? '#e53935' : WHITE, 0, 0.95, -0.45);
    return;
  }
  if (/plane/i.test(id)) {
    // A small high-wing plane: fuselage, the wing over the cabin, a tail, a propeller, wheels.
    part(v, cyl(0.32, 0.18, L - 0.4, 16), c, 0, 0.75, 0, { rx: Math.PI / 2 });
    part(v, new THREE.ConeGeometry(0.3, 0.35, 16), shade(c, 0.85), 0, 0.75, L / 2 - 0.05, { rx: Math.PI / 2 });
    part(v, rbox(Math.min(Wd + 2.4, 4), 0.06, 0.6, 0.02), c, 0, 1.12, 0.3);
    part(v, rbox(1.2, 0.04, 0.35, 0.02), c, 0, 0.85, -L / 2 + 0.3);
    part(v, rbox(0.04, 0.5, 0.4, 0.02), c, 0, 1.05, -L / 2 + 0.25);
    part(v, box(0.06, 0.9, 0.04), DARK, 0, 0.75, L / 2 + 0.14, { outline: false });
    part(v, box(0.3, 0.2, 0.01), '#9cc9e6', 0, 0.95, 0.5, { outline: false });
    for (const [x, z] of [[-0.4, 0.4], [0.4, 0.4], [0, -L / 2 + 0.4]] as const) part(v, cyl(0.13, 0.13, 0.08, 12), BLACK, x, 0.13, z, { rz: Math.PI / 2 });
    return;
  }
  if (/tractor/i.test(id)) {
    part(v, rbox(Wd * 0.6, 0.55, L * 0.55, 0.06), c, 0, 0.8, L * 0.15);
    part(v, rbox(Wd * 0.7, 1.0, L * 0.35, 0.05), shade(c, 0.9), 0, 1.4, -L * 0.18);
    part(v, box(Wd * 0.7 + 0.02, 0.5, L * 0.35 - 0.1), '#9cc9e6', 0, 1.55, -L * 0.18, { outline: false });
    part(v, cyl(0.04, 0.04, 0.6, 8), DARK, Wd * 0.2, 1.4, L * 0.3, { outline: false });
    for (const sx of [-1, 1]) {
      part(v, cyl(0.55, 0.55, 0.3, 20), BLACK, sx * (Wd / 2 - 0.1), 0.55, -L / 2 + 0.6, { rz: Math.PI / 2 });
      part(v, cyl(0.3, 0.3, 0.32, 14), '#fdd835', sx * (Wd / 2 - 0.1), 0.55, -L / 2 + 0.6, { rz: Math.PI / 2, outline: false });
      part(v, cyl(0.3, 0.3, 0.2, 16), BLACK, sx * (Wd / 2 - 0.2), 0.3, L / 2 - 0.4, { rz: Math.PI / 2 });
    }
    return;
  }
  const kind = /truck|Truck/.test(id) ? 'truck' : /van$|Van$|Bus$/.test(id) ? 'van' : /jeep|Jeep/.test(id) ? 'jeep' : 'sedan';
  const roof = sedan(v, L, Wd, c, kind);
  if (id === 'patrolCar') {
    part(v, rbox(Wd * 0.6, 0.1, 0.25, 0.03), DARK, 0, roof + 0.07, -L * 0.05);
    part(v, rbox(Wd * 0.28, 0.09, 0.22, 0.03), '#e53935', -Wd * 0.16, roof + 0.13, -L * 0.05, { material: glow('#ff5252') });
    part(v, rbox(Wd * 0.28, 0.09, 0.22, 0.03), '#1e88e5', Wd * 0.16, roof + 0.13, -L * 0.05, { material: glow('#448aff') });
    for (const sx of [-1, 1]) part(v, box(0.01, 0.12, L * 0.7), '#1e3a8a', sx * (Wd / 2 + 0.045), 0.5, 0, { outline: false });
  } else if (id === 'fireTruck') {
    // A ladder along the roof, lights on the cab.
    for (const sx of [-1, 1]) part(v, box(0.05, 0.05, L - 1.0), STEEL, sx * 0.25, roof + 0.08, -0.4, { outline: false });
    for (let z = -L / 2 + 0.2; z < L / 2 - 1.2; z += 0.3) part(v, box(0.5, 0.03, 0.03), STEEL, 0, roof + 0.08, z, { outline: false });
    part(v, rbox(0.6, 0.08, 0.15, 0.02), '#ff1744', 0, 1.9, L / 2 - 0.7, { material: glow('#ff5252') });
  } else if (/eco|army/i.test(id)) {
    part(v, rbox(0.5, 0.5, 0.15, 0.06), BLACK, 0, 0.8, -L / 2 - 0.1);
  }
};
