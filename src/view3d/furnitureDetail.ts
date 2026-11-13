import * as THREE from 'three';
import { DARK, METAL, WHITE, WOOD, deskChair, legs, marker, rod, screenMesh, shade, tint, type Builder } from './parts';
import { ball, box, cyl, part, rbox, toon } from './toon';

/**
 * Pieces drawn one by one rather than as one of their family (docs/3d/01-view.md §3): the family
 * still says how dwellers use them (furniture3d.ts kindOf, activity.ts), but each has its own shape —
 * a home bar with its bottles, a pond with its stones, a woodworking bench with its vice, a
 * microscope on its bench, a kettle grill, a stone fireplace, a vet's table, a kennel. Built like
 * the others: facing 'down' (front to +z), centred on the footprint, standing on y = 0.
 */
const BLACK = '#2b2b30';
const STEEL = '#c3cad0';
const glassMat = (color: string, opacity = 0.45) => new THREE.MeshToonMaterial({ color, transparent: true, opacity, depthWrite: false });
const GLASS = glassMat('#d7f1fb', 0.4);
const WATER = new THREE.MeshToonMaterial({ color: '#5fb4dc', transparent: true, opacity: 0.85 });

/** A small dog, lying (`lie`) or sitting up, facing +z; about 0.5 m nose to tail. */
function dog(g: THREE.Object3D, x: number, y: number, z: number, color: string, lie = true, ry = 0) {
  const d = new THREE.Group();
  d.position.set(x, y, z);
  d.rotation.y = ry;
  g.add(d);
  const dark = shade(color, 0.75);
  part(d, ball(0.13), color, 0, lie ? 0.1 : 0.13, -0.06).scale.set(1, lie ? 0.75 : 0.95, 1.5);
  part(d, ball(0.09), color, 0, lie ? 0.15 : 0.32, lie ? 0.17 : 0.1);
  part(d, ball(0.045), tint(color, 0.3), 0, lie ? 0.13 : 0.3, lie ? 0.25 : 0.18).scale.set(1, 0.8, 1.2);
  part(d, ball(0.018), BLACK, 0, lie ? 0.14 : 0.31, lie ? 0.29 : 0.22, { outline: false });
  for (const sx of [-1, 1]) {
    part(d, ball(0.04), dark, sx * 0.07, lie ? 0.22 : 0.39, lie ? 0.14 : 0.07).scale.set(0.6, 1.3, 0.6);
    part(d, ball(0.013), BLACK, sx * 0.035, lie ? 0.18 : 0.35, lie ? 0.23 : 0.17, { outline: false });
    part(d, ball(0.04), color, sx * 0.07, 0.03, lie ? 0.12 : 0.06).scale.set(0.8, 0.6, 1.4);
  }
  part(d, cyl(0.02, 0.012, 0.18, 6), color, 0, lie ? 0.1 : 0.12, -0.27, { rx: lie ? -1.3 : -0.6 });
  return d;
}

/** Bottles of a few shapes and colours along a shelf from x0 to x1. */
function bottles(g: THREE.Object3D, x0: number, x1: number, y: number, z: number, seed: number) {
  const colors = ['#2e7d32', '#6d4c41', '#c62828', '#f9a825', '#4527a0', '#00838f', '#eceff1'];
  for (let x = x0, i = seed; x < x1; x += 0.075, i++) {
    const h = 0.2 + (i % 3) * 0.05;
    const k = colors[(i * 5) % colors.length];
    const b = new THREE.Mesh(cyl(0.028, 0.03, h, 10), glassMat(k, 0.8));
    b.position.set(x, y + h / 2, z);
    g.add(b);
    part(g, cyl(0.011, 0.016, 0.07, 8), k, x, y + h + 0.035, z, { outline: false });
  }
}

/**
 * A guitar (or, smaller, a violin) standing upright, its face to +z and the middle of its body at
 * the origin: the body's two bouts and waist, the sound hole (a violin's f-holes), the bridge and
 * strings, the neck and fingerboard up to the head with its pegs (a violin's scroll).
 */
export function instrumentModel(color: string, violin = false): THREE.Group {
  const g = new THREE.Group();
  const k = violin ? 0.45 : 1;
  const shape = new THREE.Shape();
  // Half the outline, mirrored: lower bout, waist, upper bout.
  const pts: Array<[number, number]> = [[0, -0.24], [0.15, -0.2], [0.19, -0.06], [0.12, 0.06], [0.14, 0.15], [0.1, 0.24], [0, 0.26]];
  shape.moveTo(0, -0.24 * k);
  const right = pts.slice(1).map(([x, y]) => new THREE.Vector2(x * k, y * k));
  shape.splineThru(right);
  const left = pts.slice(0, -1).reverse().map(([x, y]) => new THREE.Vector2(-x * k, y * k));
  shape.splineThru(left);
  const depth = (violin ? 0.05 : 0.1) * (violin ? 1 : 1);
  const geom = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 2, curveSegments: 18 });
  geom.translate(0, 0, -depth / 2);
  const body = part(g, geom, color, 0, 0, 0);
  body.userData.ownGeometry = true;
  const face = depth / 2 + 0.011;
  // The rosette and hole, or the f-holes.
  if (violin) {
    for (const sx of [-1, 1]) part(g, box(0.006, 0.05, 0.003), BLACK, sx * 0.03, 0.0, face, { outline: false });
  } else {
    part(g, cyl(0.055, 0.055, 0.004, 24), '#3e2723', 0, 0.09, face, { rx: Math.PI / 2, outline: false });
    part(g, cyl(0.045, 0.045, 0.005, 24), BLACK, 0, 0.09, face + 0.001, { rx: Math.PI / 2, outline: false });
  }
  part(g, box(0.1 * k + 0.02, 0.015, 0.012), BLACK, 0, -0.13 * k, face + 0.004, { outline: false });
  // The neck and fingerboard.
  const neckL = violin ? 0.2 : 0.46;
  const top = 0.25 * k;
  part(g, box(violin ? 0.025 : 0.05, neckL, 0.025), shade(WOOD, 0.8), 0, top + neckL / 2, 0.01);
  part(g, box(violin ? 0.024 : 0.048, neckL + (violin ? 0.12 : 0), 0.008), BLACK, 0, top + neckL / 2 - (violin ? 0.06 : 0), 0.026, { outline: false });
  if (!violin) for (let i = 1; i < 12; i++) part(g, box(0.05, 0.003, 0.004), '#cfd8dc', 0, top + (neckL * i) / 12.5, 0.031, { outline: false });
  // The head and pegs, or the scroll.
  if (violin) {
    part(g, cyl(0.016, 0.016, 0.03, 10), shade(color, 0.8), 0, top + neckL + 0.03, 0.005, { rz: Math.PI / 2 });
    for (const sx of [-1, 1]) part(g, cyl(0.004, 0.004, 0.06, 5), BLACK, sx * 0.02, top + neckL + 0.005, 0.005, { rz: Math.PI / 2, outline: false });
  } else {
    part(g, rbox(0.07, 0.15, 0.02, 0.008), shade(WOOD, 0.6), 0, top + neckL + 0.075, 0.0);
    for (const sy of [0.03, 0.075, 0.12]) for (const sx of [-1, 1]) part(g, cyl(0.006, 0.006, 0.03, 6), '#cfd8dc', sx * 0.048, top + neckL + sy, 0, { rz: Math.PI / 2, outline: false });
  }
  // Strings from the bridge to the head.
  const n = violin ? 4 : 6;
  const span = top + neckL - -0.13 * k + (violin ? 0.0 : 0.02);
  for (let i = 0; i < n; i++) part(g, box(0.0015, span, 0.0015), '#eceff1', ((i - (n - 1) / 2) * (violin ? 0.006 : 0.008)), (-0.13 * k + top + neckL) / 2 + 0.01, violin ? 0.032 : 0.036, { outline: false });
  return g;
}

/**
 * A studio mixing console (2026-10-26, at the user's request: a better one than a computer desk): a
 * long desk with the console bed sloping up from its front — sixteen channel strips of knobs, a lit
 * level meter and a fader each, the master section with its big knobs and red faders at the right —
 * a meter bridge of lit VU meters behind, the session on a screen above it, a pair of studio monitors
 * on stands turned in to the chair, a rack of gear under the desk.
 */
function mixingConsole(g: THREE.Group, W: number, D: number, _c: string, out: Parameters<Builder>[6]) {
  const desk = '#3b2f2a';
  const front = D / 2 - 0.2;
  const back = -D / 2 + 0.1;
  // The desk: a wooden top with a padded arm rest along the front, legs and a rack under the right.
  part(g, rbox(W - 0.1, 0.05, D - 0.3, 0.02), desk, 0, 0.72, -0.05);
  part(g, rbox(W - 0.14, 0.06, 0.1, 0.03), '#1d1d21', 0, 0.76, front + 0.02);
  for (const sx of [-1, 1]) part(g, rbox(0.06, 0.7, D - 0.4, 0.02), shade(desk, 0.8), sx * (W / 2 - 0.12), 0.35, -0.05);
  part(g, rbox(0.5, 0.62, D - 0.45, 0.02), BLACK, W / 2 - 0.45, 0.33, -0.08);
  for (let i = 0; i < 4; i++) {
    const y = 0.12 + i * 0.14;
    part(g, box(0.46, 0.11, 0.01), '#33343a', W / 2 - 0.45, y, D / 2 - 0.32, { outline: false });
    for (let k = 0; k < 3; k++) part(g, box(0.012, 0.012, 0.006), ['#76ff03', '#ffab00', '#00e5ff'][(i + k) % 3], W / 2 - 0.62 + k * 0.03, y + 0.03, D / 2 - 0.313, { outline: false, material: new THREE.MeshBasicMaterial({ color: ['#76ff03', '#ffab00', '#00e5ff'][(i + k) % 3] }) });
    part(g, box(0.18, 0.02, 0.006), '#5a5b63', W / 2 - 0.36, y - 0.02, D / 2 - 0.313, { outline: false });
  }
  // The console bed, tilted up towards the back; everything on it sits in its frame.
  const bedW = W - 0.3;
  const bedD = 0.5;
  const bed = new THREE.Group();
  bed.position.set(0, 0.8, front - bedD / 2 - 0.05);
  bed.rotation.x = 0.22;
  g.add(bed);
  part(bed, rbox(bedW, 0.06, bedD, 0.02), '#26272c', 0, 0, 0);
  part(bed, box(bedW - 0.04, 0.004, bedD - 0.04), '#3a3c43', 0, 0.031, 0, { outline: false });
  const top = 0.034;
  const channels = 16;
  const master = 0.32;
  const stripW = (bedW - master - 0.08) / channels;
  const caps = ['#ef5350', '#ffca28', '#66bb6a', '#42a5f5'];
  for (let i = 0; i < channels; i++) {
    const x = -bedW / 2 + 0.04 + stripW * (i + 0.5);
    if (i) part(bed, box(0.002, 0.003, bedD - 0.06), '#1b1c20', x - stripW / 2, top, 0, { outline: false });
    // Knobs at the back of the strip, a level meter, then the fader down at the front.
    for (let k = 0; k < 3; k++) {
      part(bed, cyl(0.011, 0.012, 0.018, 10), '#18181b', x, top + 0.009, -0.2 + k * 0.045, { outline: false });
      part(bed, cyl(0.004, 0.004, 0.003, 6), caps[k], x, top + 0.019, -0.2 + k * 0.045, { outline: false });
    }
    const lit = 3 + ((i * 7) % 6);
    for (let k = 0; k < 8; k++) {
      const col = k >= 7 ? '#ff1744' : k >= 5 ? '#ffd600' : '#00e676';
      part(bed, box(0.012, 0.003, 0.008), k < lit ? col : '#2b2d33', x, top + 0.002, -0.04 - k * 0.012 + 0.1, { outline: false, ...(k < lit ? { material: new THREE.MeshBasicMaterial({ color: col }) } : {}) });
    }
    part(bed, box(0.006, 0.003, 0.15), '#0d0d10', x, top + 0.001, 0.15, { outline: false });
    part(bed, rbox(0.022, 0.018, 0.03, 0.004), i === 15 ? '#ef5350' : '#cfd8dc', x, top + 0.01, 0.1 + ((i * 5) % 7) * 0.016);
    part(bed, box(0.018, 0.003, 0.012), ['#e040fb', '#40c4ff', '#ffd740', '#69f0ae'][i % 4], x, top + 0.002, 0.235, { outline: false });
  }
  // The master section: big knobs, a pair of red faders and a small screen.
  const mx = bedW / 2 - master / 2 - 0.02;
  part(bed, box(master - 0.02, 0.003, bedD - 0.06), '#2f3137', mx, top, 0, { outline: false });
  for (let k = 0; k < 4; k++) part(bed, cyl(0.022, 0.024, 0.025, 14), '#18181b', mx - 0.11 + k * 0.073, top + 0.012, -0.17);
  const lcd = new THREE.Mesh(box(0.22, 0.004, 0.08), new THREE.MeshBasicMaterial({ color: '#4dd0e1' }));
  lcd.position.set(mx, top + 0.003, -0.07);
  bed.add(lcd);
  for (const sx of [-1, 1]) {
    part(bed, box(0.008, 0.003, 0.17), '#0d0d10', mx + sx * 0.05, top + 0.001, 0.14, { outline: false });
    part(bed, rbox(0.032, 0.022, 0.036, 0.005), '#e53935', mx + sx * 0.05, top + 0.012, 0.11);
  }
  // The meter bridge behind the bed: a row of lit VU meters.
  const bz = front - bedD - 0.08;
  part(g, rbox(bedW, 0.16, 0.08, 0.02), '#1d1d21', 0, 0.98, bz);
  for (let i = 0; i < 8; i++) {
    const x = -bedW / 2 + 0.12 + (i * (bedW - 0.24)) / 7;
    part(g, box(0.13, 0.08, 0.005), '#ffe0a3', x, 0.99, bz + 0.042, { outline: false, material: new THREE.MeshBasicMaterial({ color: '#ffe0a3' }) });
    part(g, box(0.004, 0.06, 0.004), '#c62828', x - 0.02 + (i % 3) * 0.02, 0.99, bz + 0.046, { outline: false, rz: -0.5 + (i % 3) * 0.4 });
  }
  // The session on a screen above the bridge.
  part(g, rbox(0.05, 0.3, 0.05, 0.01), DARK, 0, 1.2, back + 0.08);
  part(g, rbox(0.86, 0.46, 0.04, 0.02), BLACK, 0, 1.44, back + 0.1);
  const screen = screenMesh(0.8, 0.4);
  screen.position.set(0, 1.44, back + 0.125);
  g.add(screen);
  out.screen = screen;
  // Studio monitors on short stands at both ends, turned in towards the chair.
  for (const sx of [-1, 1]) {
    const m = new THREE.Group();
    m.position.set(sx * (W / 2 - 0.2), 0.745, back + 0.18);
    m.rotation.y = -sx * 0.45;
    g.add(m);
    part(m, cyl(0.04, 0.05, 0.14, 10), DARK, 0, 0.07, 0, { outline: false });
    part(m, rbox(0.24, 0.38, 0.26, 0.03), '#1a1a1d', 0, 0.33, 0);
    part(m, cyl(0.085, 0.085, 0.012, 22), '#ffb300', 0, 0.27, 0.131, { rx: Math.PI / 2 });
    part(m, cyl(0.06, 0.06, 0.014, 20), '#2b2b30', 0, 0.27, 0.134, { rx: Math.PI / 2, outline: false });
    part(m, cyl(0.03, 0.03, 0.012, 16), '#9e9e9e', 0, 0.43, 0.131, { rx: Math.PI / 2, outline: false });
  }
  out.seat = deskChair(g, front + 0.07);
  out.work = marker(g, 0, 0.86, front - 0.08);
}

export const DETAIL: Record<string, Builder> = {
  mixingConsole(g, W, D, c, _def, _ctx, out) {
    mixingConsole(g, W, D, c, out);
  },
  /** A guitar or a violin on its stand (taken off it to be played: lot3d.ts puts it in the hands). */
  guitar(g, _W, _D, c, def, _ctx, out) {
    const violin = /violin/i.test(def.id);
    // An A-frame stand: two legs and a back strut, a cradle for the body, a yoke for the neck.
    const h = violin ? 0.45 : 0.62;
    for (const sx of [-1, 1]) rod(g, new THREE.Vector3(sx * 0.05, h, -0.08), new THREE.Vector3(sx * 0.18, 0, 0.12), 0.01, BLACK);
    rod(g, new THREE.Vector3(0, h, -0.08), new THREE.Vector3(0, 0, -0.22), 0.01, BLACK);
    part(g, box(0.34, 0.03, 0.06), BLACK, 0, violin ? 0.18 : 0.12, 0.1, { outline: false });
    const inst = instrumentModel(c, violin);
    inst.position.set(0, violin ? 0.32 : 0.36, 0.05);
    inst.rotation.x = -0.2;
    g.add(inst);
    out.idle = inst;
    out.work = marker(g, 0, 0.9, 0.2);
  },
  violin(g, W, D, c, def, ctx, out) {
    DETAIL.guitar(g, W, D, c, def, ctx, out);
  },

  /** Aquariums and specimen tanks: on a cabinet (or the floor, for a big one), gravel, rocks and weed, fish, bubbles, a light hood. */
  tank(g, W, D, c, def, _ctx, out) {
    const big = W >= 2 && D >= 2;
    const w = W - 0.12;
    const d = big ? D - 0.12 : Math.min(D, 0.55) - 0.06;
    const z = big ? 0 : -D / 2 + d / 2 + 0.04;
    const base = big ? 0.1 : 0.72;
    const h = big ? 1.6 : 0.6;
    if (big) part(g, rbox(w + 0.04, 0.1, d + 0.04, 0.02), DARK, 0, 0.05, z);
    else {
      part(g, rbox(w, base, d, 0.02), shade(WOOD, 0.75), 0, base / 2, z);
      for (const sx of [-1, 1]) part(g, box(0.05, 0.012, 0.02), METAL, sx * w * 0.25, base * 0.55, z + d / 2 + 0.01, { outline: false });
      part(g, box(w - 0.04, 0.01, 0.01), shade(WOOD, 0.6), 0, base * 0.55, z + d / 2 + 0.005, { outline: false });
    }
    // The water, then the glass round it, and black edges at the corners.
    const water = new THREE.Mesh(box(w - 0.04, h - 0.1, d - 0.04), new THREE.MeshToonMaterial({ color: def.id === 'specimenTank' ? '#3d8fbf' : '#62b8de', transparent: true, opacity: 0.45, depthWrite: false }));
    water.userData.ownMaterial = true;
    water.position.set(0, base + (h - 0.1) / 2 + 0.01, z);
    water.renderOrder = 2;
    g.add(water);
    const glassBox = new THREE.Mesh(box(w, h, d), GLASS);
    glassBox.position.set(0, base + h / 2, z);
    glassBox.renderOrder = 3;
    g.add(glassBox);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.02, h, 0.02), BLACK, sx * (w / 2), base + h / 2, z + sz * (d / 2), { outline: false });
    for (const y of [base, base + h]) for (const sz of [-1, 1]) part(g, box(w, 0.02, 0.02), BLACK, 0, y, z + sz * (d / 2), { outline: false });
    // Gravel, rocks, weed.
    part(g, box(w - 0.04, 0.05, d - 0.04), '#d7c4a3', 0, base + 0.035, z, { outline: false });
    for (const [x, k, r] of [[-0.3, '#8d8d8d', 0.08], [0.25, '#a1887f', 0.1], [0.05, '#9e9e9e', 0.06]] as const) part(g, ball(r * (big ? 2 : 1)), k, x * w, base + 0.06, z - d * 0.15).scale.y = 0.7;
    for (let i = 0; i < (big ? 9 : 5); i++) {
      const x = -w / 2 + 0.12 + ((i * 0.37) % 1) * (w - 0.24);
      const tall = (0.2 + ((i * 0.53) % 1) * 0.25) * (big ? 2.4 : 1) * (h / 0.6) * 0.8;
      for (let k = 0; k < 3; k++) part(g, cyl(0.008, 0.004, tall, 5), ['#43a047', '#66bb6a', '#2e7d32'][k], x + (k - 1) * 0.02, base + 0.06 + tall / 2, z - d * 0.3 + (i % 2) * 0.05, { rz: (k - 1) * 0.15, outline: false });
    }
    // Fish, a few colours, each a body and a tail, facing along the tank.
    const fish = def.id === 'specimenTank' ? ['#ff7043', '#ffffff', '#ffca28'] : ['#ff7043', '#ffd54f', '#4fc3f7', '#ef5350', '#ba68c8'];
    const n = big ? 8 : 5;
    for (let i = 0; i < n; i++) {
      const f = new THREE.Group();
      f.position.set(-w / 2 + 0.15 + ((i * 0.61) % 1) * (w - 0.3), base + 0.15 + ((i * 0.37) % 1) * (h - 0.35), z - d * 0.2 + ((i * 0.29) % 1) * d * 0.4);
      f.rotation.y = i % 2 ? Math.PI : 0;
      const s = big ? 1.8 : 1;
      part(f, ball(0.035 * s), fish[i % fish.length], 0, 0, 0, { outline: false }).scale.set(1.6, 1, 0.6);
      part(f, new THREE.ConeGeometry(0.025 * s, 0.04 * s, 4), fish[i % fish.length], -0.065 * s, 0, 0, { rz: Math.PI / 2, outline: false });
      g.add(f);
    }
    for (let i = 0; i < 6; i++) part(g, ball(0.01 + (i % 3) * 0.004), '#e1f5fe', w / 2 - 0.1, base + 0.12 + i * (h - 0.2) / 6, z - d * 0.3, { outline: false });
    // The hood with its light (or a ladder up the side of a big one).
    if (big) {
      for (const sx of [-1, 1]) part(g, cyl(0.015, 0.015, h + 0.3, 6), STEEL, w / 2 + 0.06, base + (h + 0.3) / 2, z + sx * 0.2, { outline: false });
      for (let y = base + 0.25; y < base + h + 0.2; y += 0.3) part(g, cyl(0.012, 0.012, 0.4, 6), STEEL, w / 2 + 0.06, y, z, { rx: Math.PI / 2, outline: false });
    } else {
      part(g, rbox(w + 0.02, 0.06, d + 0.02, 0.02), BLACK, 0, base + h + 0.03, z);
      part(g, box(w - 0.1, 0.01, d - 0.1), '#e1f5fe', 0, base + h - 0.002, z, { outline: false, material: new THREE.MeshBasicMaterial({ color: '#e1f5fe' }) });
    }
    out.work = marker(g, 0, base + h * 0.55, z + d / 2 + 0.02);
    void c;
  },
  spacesuitDisplay(g, _W, _D, c, _def, _ctx, out) {
    // A training spacesuit on its stand: boots, legs and a bulky torso in white, arms out a little,
    // the life-support pack on the back, a helmet with a gold visor, a panel on the chest.
    const suit = '#f5f5f5';
    part(g, cyl(0.3, 0.32, 0.05, 20), DARK, 0, 0.025, 0);
    part(g, cyl(0.025, 0.025, 1.0, 8), METAL, 0, 0.5, -0.2, { outline: false });
    for (const sx of [-1, 1]) {
      part(g, rbox(0.15, 0.1, 0.24, 0.04), '#9e9e9e', sx * 0.1, 0.1, 0.03);
      part(g, cyl(0.075, 0.07, 0.45, 12), suit, sx * 0.1, 0.37, 0);
      part(g, cyl(0.082, 0.082, 0.04, 12), '#b0bec5', sx * 0.1, 0.6, 0, { outline: false });
      part(g, cyl(0.085, 0.08, 0.38, 12), suit, sx * 0.1, 0.8, 0);
    }
    part(g, rbox(0.42, 0.18, 0.28, 0.08), suit, 0, 1.02, 0);
    part(g, rbox(0.46, 0.5, 0.32, 0.12), suit, 0, 1.33, 0);
    part(g, cyl(0.12, 0.12, 0.04, 18), '#b0bec5', 0, 1.6, 0, { outline: false });
    for (const sx of [-1, 1]) {
      part(g, ball(0.1), suit, sx * 0.26, 1.48, 0);
      part(g, cyl(0.07, 0.065, 0.32, 12), suit, sx * 0.32, 1.32, 0.02, { rz: sx * 0.25 });
      part(g, cyl(0.072, 0.072, 0.03, 12), '#b0bec5', sx * 0.355, 1.16, 0.03, { rz: sx * 0.25, outline: false });
      part(g, cyl(0.065, 0.06, 0.26, 12), suit, sx * 0.38, 1.03, 0.07, { rz: sx * 0.1, rx: -0.3 });
      part(g, ball(0.065), '#eceff1', sx * 0.39, 0.88, 0.12);
    }
    part(g, rbox(0.4, 0.55, 0.2, 0.05), '#e0e0e0', 0, 1.33, -0.26);
    part(g, rbox(0.22, 0.14, 0.04, 0.02), '#455a64', 0, 1.25, 0.17);
    for (const [x, k] of [[-0.06, '#ef5350'], [0, '#ffee58'], [0.06, '#66bb6a']] as const) part(g, ball(0.012), k, x, 1.27, 0.195, { outline: false });
    part(g, rbox(0.1, 0.06, 0.01, 0.01), '#1565c0', -0.15, 1.45, 0.165, { outline: false });
    part(g, ball(0.17), suit, 0, 1.75, 0);
    const visor = new THREE.Mesh(new THREE.SphereGeometry(0.145, 18, 12, -Math.PI / 2 - 0.9, 1.8, 0.7, 1.3), new THREE.MeshToonMaterial({ color: '#e0a526', emissive: '#5a3c00' }));
    visor.userData.ownGeometry = visor.userData.ownMaterial = true;
    visor.position.set(0, 1.75, 0.04);
    g.add(visor);
    out.work = marker(g, 0, 1.3, 0.25);
    void c;
  },
  bathtub(g, W, D, c, _def, _ctx, out) {
    // A built-in tub: rounded rim walls round a hollow, water inside at a bather's waist, the taps
    // and spout at the foot, a bath mat and a towel over the side.
    const w = W - 0.08;
    const d = D - 0.08;
    const h = 0.55;
    const t = 0.1;
    const white = '#f7f9fb';
    part(g, rbox(w, h - 0.05, d, 0.06), white, 0, (h - 0.05) / 2, 0);
    // The rim, as four rounded bars, and the inside a shade darker.
    for (const sx of [-1, 1]) part(g, rbox(t, 0.06, d, 0.03), white, sx * (w / 2 - t / 2), h - 0.03, 0);
    for (const sz of [-1, 1]) part(g, rbox(w, 0.06, t, 0.03), white, 0, h - 0.03, sz * (d / 2 - t / 2));
    part(g, rbox(w - 2 * t, 0.02, d - 2 * t, 0.06), '#e3ebf0', 0, h - 0.06, 0, { outline: false });
    const water = new THREE.Mesh(box(w - 2 * t - 0.02, 0.01, d - 2 * t - 0.02), new THREE.MeshToonMaterial({ color: '#9fd6ee', transparent: true, opacity: 0.75 }));
    water.userData.ownMaterial = true;
    water.position.y = h - 0.075;
    g.add(water);
    // Taps at the foot (+z end of the tub's frame is its foot, the head is at -z where the bather leans back).
    const fz = d / 2 - t / 2;
    part(g, cyl(0.02, 0.02, 0.12, 8), METAL, 0, h + 0.06, fz, { outline: false });
    part(g, cyl(0.018, 0.018, 0.14, 8), METAL, 0, h + 0.12, fz - 0.06, { rx: Math.PI / 2, outline: false });
    for (const sx of [-1, 1]) part(g, cyl(0.03, 0.03, 0.04, 10), sx < 0 ? '#ef5350' : '#42a5f5', sx * 0.12, h + 0.02, fz);
    // A head cushion, a towel over the side and a mat on the floor.
    part(g, rbox(0.3, 0.08, 0.12, 0.04), '#ffffff', 0, h + 0.02, -d / 2 + t / 2 + 0.02, { rx: -0.3 });
    part(g, rbox(0.03, 0.28, 0.35, 0.015), tint(c, 0.2), w / 2 + 0.02, h - 0.12, 0.1);
    part(g, rbox(0.4, 0.015, 0.6, 0.007), '#80cbc4', w / 2 + 0.3, 0.008, 0, { outline: false });
    out.work = marker(g, 0, h, d / 2 - 0.1);
  },
  radioRack(g, W, D, c, _def, _ctx, out) {
    // A wall cabinet of charging bays: a row of radios standing in their cradles, each with its
    // aerial and a light (green charged, amber charging), a drawer of spare batteries below.
    const w = Math.min(W - 0.1, 0.8);
    const d = Math.min(D, 0.35);
    const z = -D / 2 + d / 2 + 0.03;
    part(g, rbox(w, 0.78, d, 0.02), shade(c, 1.4), 0, 0.39, z);
    part(g, box(w - 0.06, 0.02, 0.01), METAL, 0, 0.55, z + d / 2 + 0.005, { outline: false });
    part(g, box(0.12, 0.02, 0.03), METAL, 0, 0.3, z + d / 2 + 0.015, { outline: false });
    const top = 0.78;
    part(g, rbox(w, 0.08, d, 0.02), c, 0, top + 0.04, z);
    const n = Math.max(3, Math.floor((w - 0.06) / 0.12));
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + 0.06 + ((w - 0.12) / (n - 1)) * i;
      part(g, rbox(0.09, 0.05, 0.12, 0.01), '#424242', x, top + 0.1, z);
      part(g, ball(0.012), i % 3 === 1 ? '#ffb300' : '#69f0ae', x, top + 0.09, z + 0.065, { outline: false, material: new THREE.MeshBasicMaterial({ color: i % 3 === 1 ? '#ffb300' : '#69f0ae' }) });
      if (i % 4 === 3) continue;
      part(g, rbox(0.06, 0.18, 0.04, 0.012), BLACK, x, top + 0.21, z);
      part(g, box(0.04, 0.03, 0.005), '#90a4ae', x, top + 0.25, z + 0.021, { outline: false });
      part(g, cyl(0.008, 0.006, 0.12, 6), BLACK, x + 0.018, top + 0.36, z - 0.005, { outline: false });
    }
    out.work = marker(g, 0, top + 0.2, z + d / 2 + 0.02);
  },
  saplingBed(g, W, D, _c, _def, _ctx, out) {
    // A low trolley of black nursery pots in rows, a sapling in each, a watering can by them.
    const w = W - 0.12;
    const d = D - 0.12;
    legs(g, w, d, 0.3, METAL, 0.04, 0.018);
    part(g, rbox(w, 0.04, d, 0.01), '#546e7a', 0, 0.32, 0);
    const cols = Math.max(2, Math.floor(w / 0.22));
    const rows = Math.max(2, Math.floor(d / 0.22));
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++) {
        const x = -w / 2 + (w / cols) * (i + 0.5);
        const z = -d / 2 + (d / rows) * (j + 0.5);
        part(g, cyl(0.075, 0.06, 0.13, 12), '#263238', x, 0.405, z);
        part(g, cyl(0.07, 0.07, 0.01, 12), '#5d4037', x, 0.465, z, { outline: false });
        const tall = 0.18 + (((i * 7 + j * 3) % 5) / 5) * 0.15;
        part(g, cyl(0.007, 0.009, tall, 5), '#795548', x, 0.47 + tall / 2, z, { outline: false });
        for (let k = 0; k < 3; k++) part(g, ball(0.035), ['#66bb6a', '#7cb342', '#43a047'][k], x + Math.cos(k * 2.1) * 0.03, 0.47 + tall * (0.6 + k * 0.15), z + Math.sin(k * 2.1) * 0.03, { outline: false }).scale.set(1, 0.7, 1.3);
      }
    part(g, cyl(0.06, 0.07, 0.16, 12), '#4caf50', w / 2 + 0.02, 0.08, d / 2 - 0.08);
    part(g, cyl(0.01, 0.015, 0.16, 6), '#4caf50', w / 2 + 0.02, 0.16, d / 2 + 0.02, { rx: 1.0, outline: false });
    out.work = marker(g, 0, 0.55, d / 2);
  },
  bar(g, W, D, c, _def, _ctx, out) {
    // Against the wall: a mirrored back with lit shelves of bottles; in front, the bar itself with
    // its panelled front, a brass foot rail, glasses and a shaker on the top.
    const backZ = -D / 2 + 0.08;
    part(g, rbox(W - 0.1, 1.9, 0.08, 0.02), shade(c, 0.8), 0, 0.95, backZ);
    const mirror = new THREE.Mesh(box(W - 0.4, 0.75, 0.01), toon('#cfe3ea', '#3d5560'));
    mirror.position.set(0, 1.45, backZ + 0.045);
    g.add(mirror);
    for (const [i, y] of [1.1, 1.48].entries()) {
      part(g, box(W - 0.35, 0.025, 0.14), shade(c, 1.1), 0, y, backZ + 0.11, { outline: false });
      bottles(g, -W / 2 + 0.25, W / 2 - 0.22, y + 0.012, backZ + 0.11, i * 3);
    }
    const z = D / 2 - 0.27;
    const d = 0.46;
    part(g, rbox(W - 0.12, 1.02, d, 0.02), c, 0, 0.51, z);
    for (let x = -W / 2 + 0.3; x < W / 2 - 0.15; x += 0.42) part(g, rbox(0.34, 0.7, 0.012, 0.01), shade(c, 1.15), x + 0.06, 0.48, z + d / 2 + 0.006, { outline: false });
    part(g, rbox(W - 0.04, 0.05, d + 0.1, 0.02), '#3e2723', 0, 1.045, z + 0.02);
    part(g, cyl(0.02, 0.02, W - 0.2, 10), '#d4a017', 0, 0.16, z + d / 2 + 0.1, { rz: Math.PI / 2, outline: false });
    for (const x of [-W / 2 + 0.2, W / 2 - 0.2]) part(g, box(0.02, 0.14, 0.1), '#d4a017', x, 0.12, z + d / 2 + 0.05, { outline: false });
    // On the top: two glasses, a shaker, a little tray of limes.
    for (const x of [-0.3, -0.18]) {
      const glass = new THREE.Mesh(cyl(0.035, 0.028, 0.1, 12), GLASS);
      glass.position.set(x, 1.12, z + 0.05);
      g.add(glass);
    }
    part(g, cyl(0.035, 0.04, 0.17, 12), STEEL, 0.1, 1.155, z + 0.02);
    part(g, rbox(0.16, 0.02, 0.1, 0.01), '#5d4037', 0.35, 1.08, z + 0.02);
    for (let i = 0; i < 3; i++) part(g, ball(0.025), '#9ccc65', 0.31 + i * 0.04, 1.105, z + 0.02, { outline: false });
    out.work = marker(g, 0, 1.12, z + 0.12);
  },
  pond(g, W, D, _c, _def, _ctx, out) {
    // A round pool of water ringed with flat stones, lily pads and a flower, reeds at the back.
    const rx = W / 2 - 0.2;
    const rz = D / 2 - 0.2;
    const bed = new THREE.Mesh(cyl(1, 1, 0.06, 40), toon('#3c6e71'));
    bed.scale.set(rx, 1, rz);
    bed.position.y = 0.0;
    g.add(bed);
    const water = new THREE.Mesh(cyl(1, 1, 0.02, 40), WATER);
    water.scale.set(rx - 0.05, 1, rz - 0.05);
    water.position.y = 0.06;
    g.add(water);
    const n = Math.round((rx + rz) * 9);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const s = 0.13 + ((i * 37) % 7) * 0.012;
      const stone = part(g, ball(s), ['#9e9e9e', '#bdbdbd', '#8d8d8d'][i % 3], Math.cos(a) * (rx + 0.04), 0.05, Math.sin(a) * (rz + 0.04));
      stone.scale.set(1.2, 0.45, 1);
      stone.rotation.y = a;
    }
    for (const [x, z, r] of [[-0.3, 0.2, 0.13], [0.25, -0.15, 0.11], [0.1, 0.35, 0.09]] as const) {
      const pad = part(g, cyl(r, r, 0.012, 16), '#66bb6a', x * rx, 0.075, z * rz, { outline: false });
      pad.scale.z = 0.9;
    }
    part(g, ball(0.04), '#f8bbd0', -0.3 * rx, 0.1, 0.2 * rz, { outline: false });
    for (let i = 0; i < 7; i++) part(g, cyl(0.012, 0.008, 0.6 + (i % 3) * 0.12, 5), '#7cb342', -rx * 0.6 + i * 0.07, 0.35, -rz - 0.02 + (i % 2) * 0.05, { rz: (i - 3) * 0.06, outline: false });
    out.work = marker(g, 0, 0.1, rz - 0.2);
  },
  woodworkingTable(g, W, D, c, _def, _ctx, out) {
    // A heavy bench: thick top on square legs braced low with a shelf of planks; a vice at the
    // front corner, a pegboard of tools behind, a plank being worked and shavings on top.
    const d = Math.min(D, 0.75);
    const z = -D / 2 + d / 2 + 0.03;
    const top = 0.88;
    const w = W - 0.12;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.08, top - 0.08, 0.08), shade(c, 0.75), sx * (w / 2 - 0.08), (top - 0.08) / 2, z + sz * (d / 2 - 0.08), { outline: false });
    part(g, rbox(w, 0.08, d, 0.01), c, 0, top - 0.04, z);
    part(g, box(w - 0.15, 0.03, d - 0.15), shade(c, 0.85), 0, 0.22, z, { outline: false });
    for (let i = 0; i < 3; i++) part(g, rbox(w - 0.4, 0.04, 0.12, 0.005), ['#d7b98e', '#c8a06a', '#e0c9a6'][i], 0.05 * i, 0.255 + i * 0.04, z - 0.15 + i * 0.13);
    // The vice.
    const vx = w / 2 - 0.2;
    part(g, rbox(0.2, 0.12, 0.06, 0.01), METAL, vx, top - 0.05, z + d / 2 + 0.03);
    part(g, cyl(0.012, 0.012, 0.22, 6), METAL, vx, top - 0.06, z + d / 2 + 0.12, { rx: Math.PI / 2, outline: false });
    part(g, cyl(0.01, 0.01, 0.16, 6), METAL, vx, top - 0.06, z + d / 2 + 0.23, { rz: Math.PI / 2, outline: false });
    // The pegboard and tools.
    const back = -D / 2 + 0.02;
    part(g, box(w - 0.1, 0.7, 0.02), '#d7c4a3', 0, top + 0.55, back, { outline: false });
    for (let x = -w / 2 + 0.15; x < w / 2 - 0.1; x += 0.08) for (let y = top + 0.27; y < top + 0.88; y += 0.08) part(g, box(0.012, 0.012, 0.005), '#8d7b5f', x, y, back + 0.012, { outline: false });
    part(g, box(0.45, 0.12, 0.01), '#b0bec5', -w / 2 + 0.45, top + 0.6, back + 0.02, { outline: false });
    part(g, box(0.1, 0.06, 0.02), '#c62828', -w / 2 + 0.2, top + 0.6, back + 0.02, { outline: false });
    part(g, cyl(0.012, 0.012, 0.28, 6), WOOD, 0.15, top + 0.55, back + 0.025, { outline: false });
    part(g, box(0.1, 0.04, 0.04), '#424242', 0.15, top + 0.7, back + 0.03, { outline: false });
    part(g, cyl(0.01, 0.01, 0.24, 6), '#ffb300', 0.35, top + 0.55, back + 0.025, { outline: false });
    part(g, box(0.05, 0.03, 0.02), METAL, 0.35, top + 0.68, back + 0.025, { outline: false });
    // A plank on the bench, a set square and shavings.
    part(g, rbox(0.9, 0.035, 0.18, 0.005), '#e0c9a6', -0.1, top + 0.017, z + 0.05, { ry: 0.1 });
    part(g, box(0.18, 0.01, 0.03), METAL, 0.35, top + 0.006, z + 0.1, { ry: -0.4, outline: false });
    for (let i = 0; i < 6; i++) part(g, ball(0.02), '#f3e0bd', -0.4 + i * 0.13, top + 0.012, z + 0.18 - (i % 2) * 0.05, { outline: false }).scale.set(1.3, 0.4, 0.8);
    out.work = marker(g, -0.1, top + 0.05, z + 0.08);
  },
  microscope(g, W, D, c, _def, _ctx, out) {
    // On a lab bench: base, the arm up to the head, the stage with a slide, objectives over it and
    // the eyepiece tube angled back towards the user.
    const d = Math.min(D, 0.6);
    const z = -D / 2 + d / 2 + 0.05;
    const top = 0.9;
    legs(g, W - 0.15, d, top - 0.03, STEEL, 0.05, 0.022);
    part(g, rbox(W - 0.12, 0.04, d, 0.01), WHITE, 0, top - 0.02, z);
    const m = new THREE.Group();
    m.position.set(0, top, z + 0.02);
    g.add(m);
    part(m, rbox(0.18, 0.04, 0.22, 0.02), shade(c, 0.6), 0, 0.02, 0);
    part(m, rbox(0.05, 0.3, 0.06, 0.02), c, 0, 0.18, -0.07, { rx: -0.12 });
    part(m, rbox(0.14, 0.015, 0.12, 0.005), DARK, 0, 0.13, 0.02);
    part(m, box(0.08, 0.004, 0.03), '#e3f2fd', 0, 0.14, 0.02, { outline: false });
    part(m, cyl(0.035, 0.035, 0.05, 12), c, 0, 0.27, 0.0);
    for (const [x, zz] of [[-0.02, 0.01], [0.02, 0.01], [0, -0.02]] as const) part(m, cyl(0.01, 0.007, 0.05, 8), STEEL, x, 0.215, zz, { outline: false });
    part(m, cyl(0.022, 0.022, 0.16, 10), c, 0, 0.34, 0.06, { rx: 0.7 });
    part(m, cyl(0.016, 0.016, 0.04, 10), BLACK, 0, 0.395, 0.115, { rx: 0.7, outline: false });
    for (const sx of [-1, 1]) part(m, cyl(0.03, 0.03, 0.02, 14), DARK, sx * 0.04, 0.17, -0.07, { rz: Math.PI / 2 });
    part(g, rbox(0.12, 0.05, 0.08, 0.01), '#fff59d', W / 2 - 0.22, top + 0.025, z + 0.12);
    out.work = marker(g, 0, top + 0.37, z + 0.15);
  },
  chemistrySet(g, W, D, c, _def, _ctx, out) {
    // A bench with flasks and beakers of coloured liquid, a rack of test tubes, a burner under a
    // flask on its stand, and a retort.
    const d = Math.min(D, 0.6);
    const z = -D / 2 + d / 2 + 0.05;
    const top = 0.9;
    part(g, rbox(W - 0.1, top - 0.04, d, 0.02), shade(c, 0.85), 0, (top - 0.04) / 2, z);
    part(g, rbox(W - 0.06, 0.04, d + 0.02, 0.01), '#37474f', 0, top - 0.02, z);
    const flask = (x: number, zz: number, liquid: string, s = 1) => {
      const body = new THREE.Mesh(new THREE.ConeGeometry(0.07 * s, 0.14 * s, 16), GLASS);
      body.userData.ownGeometry = true;
      body.position.set(x, top + 0.07 * s, zz);
      g.add(body);
      const juice = new THREE.Mesh(new THREE.ConeGeometry(0.06 * s, 0.07 * s, 16), glassMat(liquid, 0.85));
      juice.userData.ownGeometry = true;
      juice.position.set(x, top + 0.04 * s, zz);
      g.add(juice);
      const neck = new THREE.Mesh(cyl(0.018 * s, 0.018 * s, 0.07 * s, 10), GLASS);
      neck.position.set(x, top + 0.17 * s, zz);
      g.add(neck);
    };
    flask(-0.28, z - 0.05, '#ab47bc');
    flask(0.3, z + 0.08, '#26c6da', 0.8);
    for (const [x, k] of [[-0.05, '#66bb6a'], [0.12, '#ffa726']] as const) {
      const beaker = new THREE.Mesh(cyl(0.045, 0.045, 0.12, 14), GLASS);
      beaker.position.set(x, top + 0.06, z + 0.1);
      g.add(beaker);
      part(g, cyl(0.04, 0.04, 0.06, 14), k, x, top + 0.03, z + 0.1, { outline: false, material: glassMat(k, 0.8) });
    }
    // A test-tube rack.
    part(g, rbox(0.22, 0.02, 0.06, 0.005), WOOD, 0.05, top + 0.08, z - 0.12);
    for (let i = 0; i < 4; i++) part(g, cyl(0.012, 0.012, 0.13, 8), ['#ef5350', '#42a5f5', '#ffee58', '#66bb6a'][i], -0.04 + i * 0.06, top + 0.07, z - 0.12, { material: glassMat(['#ef5350', '#42a5f5', '#ffee58', '#66bb6a'][i], 0.85), outline: false });
    // A burner under a flask on a ring stand.
    part(g, cyl(0.03, 0.04, 0.06, 12), STEEL, W / 2 - 0.3, top + 0.03, z - 0.08);
    part(g, ball(0.022), '#4fc3f7', W / 2 - 0.3, top + 0.08, z - 0.08, { outline: false, material: new THREE.MeshBasicMaterial({ color: '#4fc3f7' }) });
    part(g, cyl(0.008, 0.008, 0.4, 6), METAL, W / 2 - 0.18, top + 0.2, z - 0.12, { outline: false });
    part(g, new THREE.TorusGeometry(0.05, 0.005, 6, 16), METAL, W / 2 - 0.3, top + 0.16, z - 0.08, { rx: Math.PI / 2, outline: false });
    const round = new THREE.Mesh(ball(0.055), GLASS);
    round.position.set(W / 2 - 0.3, top + 0.215, z - 0.08);
    g.add(round);
    out.work = marker(g, 0, top + 0.1, z + 0.12);
  },
  grill(g, _W, _D, c, _def, _ctx, out) {
    // A kettle grill: a round bowl on three legs (two on wheels), its grate, the lid hung open
    // on the side, a side table with tongs; sausages on the grate while it's in use.
    const h = 0.82;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
      const foot = new THREE.Vector3(Math.cos(a) * 0.3, 0.05, Math.sin(a) * 0.3);
      rod(g, new THREE.Vector3(Math.cos(a) * 0.17, h - 0.15, Math.sin(a) * 0.17), foot, 0.016, DARK);
      if (i) part(g, cyl(0.06, 0.06, 0.03, 14), BLACK, foot.x, 0.06, foot.z, { rz: Math.PI / 2, ry: a });
    }
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.27, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), toon(c));
    bowl.userData.ownGeometry = true;
    bowl.material.side = THREE.DoubleSide;
    bowl.position.y = h;
    bowl.castShadow = true;
    g.add(bowl);
    part(g, new THREE.TorusGeometry(0.27, 0.012, 6, 28), shade(c, 0.7), 0, h, 0, { rx: Math.PI / 2, outline: false });
    part(g, cyl(0.25, 0.25, 0.01, 24), '#e65100', 0, h - 0.06, 0, { outline: false, material: new THREE.MeshBasicMaterial({ color: '#e65100' }) });
    for (let x = -0.22; x <= 0.22; x += 0.044) part(g, box(0.006, 0.006, Math.sqrt(Math.max(0, 0.25 * 0.25 - x * x)) * 2), METAL, x, h - 0.01, 0, { outline: false });
    // The lid, hung on the back.
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.27, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), toon(c));
    lid.userData.ownGeometry = true;
    lid.material.side = THREE.DoubleSide;
    lid.position.set(0, h + 0.02, -0.29);
    lid.rotation.x = -1.35;
    lid.castShadow = true;
    g.add(lid);
    part(g, cyl(0.012, 0.012, 0.14, 6), BLACK, 0, h + 0.26, -0.31, { rz: Math.PI / 2, outline: false });
    // The side table with tongs.
    part(g, rbox(0.22, 0.02, 0.18, 0.01), WOOD, 0.4, h - 0.08, 0);
    rod(g, new THREE.Vector3(0.27, h - 0.08, 0), new THREE.Vector3(0.22, h - 0.12, 0), 0.008, METAL);
    part(g, box(0.02, 0.01, 0.18), STEEL, 0.4, h - 0.06, 0, { ry: 0.2, outline: false });
    const food = new THREE.Group();
    for (let i = 0; i < 4; i++) part(food, cyl(0.022, 0.022, 0.16, 10), '#a1501f', -0.1 + i * 0.065, h + 0.012, 0.02, { rx: Math.PI / 2 });
    part(food, cyl(0.06, 0.06, 0.02, 14), '#6d3b1b', 0.1, h + 0.012, -0.12, {});
    g.add(food);
    out.inUse = food;
    out.work = marker(g, 0, h + 0.05, 0.1);
  },
  fireplace(g, W, D, c, _def, _ctx, out) {
    // A brick chimney breast up to the ceiling, a stone surround round the firebox, a mantel shelf
    // with a clock and candles, logs in the grate and the fire's glow.
    const d = Math.min(D, 0.55);
    const back = -D / 2;
    const zf = back + d;
    const brick = '#b5654a';
    part(g, rbox(W - 0.5, 2.95, d - 0.15, 0.01), shade(brick, 0.95), 0, 1.475, back + (d - 0.15) / 2);
    for (let y = 1.4; y < 2.95; y += 0.11) part(g, box(W - 0.52, 0.01, 0.01), shade(brick, 0.75), 0, y, back + d - 0.145, { outline: false });
    part(g, rbox(W - 0.1, 1.15, d, 0.02), '#cfc3b0', 0, 0.575, back + d / 2);
    for (const sx of [-1, 1]) part(g, rbox(0.12, 1.15, 0.04, 0.01), '#b8ab96', sx * (W / 2 - 0.12), 0.575, zf + 0.01);
    part(g, rbox(W + 0.05, 0.08, d + 0.12, 0.02), WOOD, 0, 1.19, back + d / 2 + 0.04);
    part(g, rbox(W - 0.1, 0.06, 0.25, 0.01), '#9e9e9e', 0, 0.03, zf + 0.12);
    // The firebox: a dark opening in the front with an arch.
    part(g, box(W - 0.75, 0.7, 0.02), '#1b1310', 0, 0.42, zf + 0.002, { outline: false });
    part(g, box(W - 0.75, 0.7, d - 0.12), '#2b1d16', 0, 0.42, zf - (d - 0.12) / 2 - 0.004, { outline: false });
    for (const x of [-0.15, 0.08]) part(g, cyl(0.05, 0.05, 0.42, 10), '#6d4c41', x, 0.13, zf - 0.15, { rz: Math.PI / 2, ry: x * 2 });
    const fire = new THREE.Group();
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.4, 10), new THREE.MeshBasicMaterial({ color: '#ff9a3c' }));
    flame.userData.ownGeometry = flame.userData.ownMaterial = true;
    flame.position.set(0, 0.35, zf - 0.15);
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 8), new THREE.MeshBasicMaterial({ color: '#ffe082' }));
    core.userData.ownGeometry = core.userData.ownMaterial = true;
    core.position.set(0, 0.28, zf - 0.13);
    fire.add(flame, core);
    g.add(fire);
    out.glow = flame;
    // On the mantel.
    part(g, rbox(0.18, 0.22, 0.08, 0.03), '#5d4037', 0, 1.34, back + d / 2 + 0.04);
    part(g, cyl(0.06, 0.06, 0.01, 18), WHITE, 0, 1.36, back + d / 2 + 0.085, { rx: Math.PI / 2, outline: false });
    for (const x of [-W / 2 + 0.3, W / 2 - 0.3]) {
      part(g, cyl(0.03, 0.03, 0.18, 10), '#fff8e1', x, 1.32, back + d / 2 + 0.04);
      part(g, ball(0.012), '#ffb300', x, 1.42, back + d / 2 + 0.04, { outline: false });
    }
    part(g, rbox(0.12, 0.16, 0.02, 0.01), '#d4a017', W / 2 - 0.55, 1.31, back + 0.1);
    out.work = marker(g, 0, 0.5, zf + 0.15);
    void c;
  },
  vetTable(g, W, _D, c, _def, _ctx, out) {
    // A steel examination table on a central column, a patient on it, a scale and a cabinet of
    // supplies beside it, the lamp overhead.
    const h = 0.86;
    const w = Math.min(W - 0.3, 1.2);
    part(g, cyl(0.07, 0.09, h - 0.06, 12), STEEL, -0.2, (h - 0.06) / 2, 0);
    part(g, rbox(0.5, 0.05, 0.45, 0.02), DARK, -0.2, 0.025, 0);
    part(g, rbox(w, 0.05, 0.6, 0.02), STEEL, -0.2, h - 0.025, 0);
    part(g, box(w - 0.06, 0.006, 0.54), tint(c, 0.3), -0.2, h + 0.003, 0, { outline: false });
    dog(g, -0.2, h, 0, '#d7a86e', true, Math.PI / 2);
    // A cabinet with a scale on it.
    const cx = W / 2 - 0.25;
    part(g, rbox(0.4, 0.8, 0.45, 0.02), WHITE, cx, 0.4, -0.05);
    for (const y of [0.2, 0.55]) part(g, box(0.1, 0.015, 0.02), METAL, cx, y, 0.18, { outline: false });
    part(g, rbox(0.3, 0.04, 0.3, 0.02), STEEL, cx, 0.82, -0.05);
    part(g, rbox(0.12, 0.06, 0.02, 0.01), '#263238', cx, 0.85, 0.11);
    // The lamp on an arm.
    part(g, cyl(0.015, 0.015, 1.5, 6), METAL, -0.2 - w / 2 - 0.05, 0.75, -0.25, { outline: false });
    rod(g, new THREE.Vector3(-0.2 - w / 2 - 0.05, 1.5, -0.25), new THREE.Vector3(-0.2, 1.65, -0.05), 0.012, METAL);
    part(g, cyl(0.06, 0.13, 0.08, 16), WHITE, -0.2, 1.6, -0.05);
    out.work = marker(g, -0.2, h + 0.12, 0.2);
  },
  kennel(g, W, D, c, _def, _ctx, out) {
    // A wire crate: a frame of bars and a door at the front, a cushion inside with its patient
    // curled up, and a water bowl.
    const w = Math.min(W, 0.9) - 0.12;
    const d = Math.min(D, 0.75) - 0.1;
    const h = 0.62;
    part(g, rbox(w, 0.04, d, 0.01), shade(c, 0.8), 0, 0.02, 0);
    part(g, rbox(w - 0.1, 0.06, d - 0.1, 0.03), '#7986cb', 0, 0.07, -0.02);
    dog(g, -0.03, 0.1, -0.03, '#8d6e63', true, -0.5);
    part(g, cyl(0.06, 0.05, 0.04, 14), STEEL, w / 2 - 0.1, 0.06, d / 2 - 0.12);
    part(g, cyl(0.05, 0.05, 0.01, 14), '#4fc3f7', w / 2 - 0.1, 0.08, d / 2 - 0.12, { outline: false });
    const bar = (a: THREE.Vector3, b: THREE.Vector3) => rod(g, a, b, 0.006, c);
    for (const [x0, x1, z0, z1] of [[-w / 2, w / 2, -d / 2, -d / 2], [-w / 2, -w / 2, -d / 2, d / 2], [w / 2, w / 2, -d / 2, d / 2], [-w / 2, w / 2, d / 2, d / 2]]) {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const n = Math.round(len / 0.06);
      for (let i = 0; i <= n; i++) {
        const x = x0 + ((x1 - x0) * i) / n;
        const z = z0 + ((z1 - z0) * i) / n;
        bar(new THREE.Vector3(x, 0.04, z), new THREE.Vector3(x, h, z));
      }
      for (const y of [0.04, h / 2, h]) bar(new THREE.Vector3(x0, y, z0), new THREE.Vector3(x1, y, z1));
    }
    for (let x = -w / 2; x <= w / 2 + 0.001; x += 0.08) bar(new THREE.Vector3(x, h, -d / 2), new THREE.Vector3(x, h, d / 2));
    // The door's frame and latch, a tag on it.
    part(g, box(0.02, h - 0.1, 0.02), DARK, w / 4, h / 2, d / 2 + 0.01, { outline: false });
    part(g, rbox(0.12, 0.08, 0.01, 0.01), '#fff59d', -w / 4, h - 0.12, d / 2 + 0.012);
    out.work = marker(g, 0, 0.45, d / 2 + 0.05);
  },
};
