import * as THREE from 'three';
import { METAL, marker, rod, screenMesh, spot, type Builder } from './parts';
import { ball, box, cyl, gradient, part, rbox, type PartOpts } from './toon';

/**
 * Astronaut training drawn as itself (2026-10-26, at the user's request): the wind tunnel flown in
 * face down in the air, the centrifuge whose arm swings its gondola round, and the spacecraft
 * mock-up with its crew seats at the controls and the hatch with its EVA handrail. Each puts the dweller
 * in a place of its own (Built.spots): flying in the tunnel, sat in the gondola as it spins, at the
 * controls, at the hatch. Built like the others: front to +z, centred on the footprint, on y = 0.
 */

const BLACK = '#2b2b30';
const STEEL = '#c3cad0';
const HAZARD = '#fbc02d';
const SHELL = '#f5f5f2';

const GLASS = new THREE.MeshToonMaterial({ color: '#cfeefa', transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide });
const AIR = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false });
const lights = new Map<string, THREE.MeshBasicMaterial>();
/** Lit from within (a screen's picture, an LED): one material per colour, shared. */
const lit = (color: string) => {
  let m = lights.get(color);
  if (!m) lights.set(color, (m = new THREE.MeshBasicMaterial({ color })));
  return m;
};
const sides = new Map<string, THREE.MeshToonMaterial>();
/** Toon colour on both faces (an open shell seen from in and out), or only the inside: shared. */
export const twoSided = (color: string, side: THREE.Side = THREE.DoubleSide) => {
  const key = `${color}|${side}`;
  let m = sides.get(key);
  if (!m) sides.set(key, (m = new THREE.MeshToonMaterial({ color, gradientMap: gradient, side })));
  return m;
};
/** A shape of its own (not one of toon.ts's shared sizes), disposed with the piece. */
export function own(g: THREE.Object3D, geom: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, o: Omit<PartOpts, 'material' | 'outline'> = {}): THREE.Mesh {
  const m = part(g, geom, '#ffffff', x, y, z, { ...o, material, outline: false });
  m.userData.ownGeometry = true;
  return m;
}
const glowing = (g: THREE.Object3D, geom: THREE.BufferGeometry, color: string, x: number, y: number, z: number, o: Omit<PartOpts, 'material' | 'outline'> = {}) =>
  part(g, geom, color, x, y, z, { ...o, material: lit(color), outline: false, shadow: false });

/** A ring of yellow and black stripes on the floor, `inner` to `outer` about the middle. */
export function hazardRing(g: THREE.Object3D, inner: number, outer: number, y: number, n = 24) {
  for (let i = 0; i < n; i++) {
    const m = own(g, new THREE.RingGeometry(inner, outer, 3, 1, (i * Math.PI * 2) / n, (Math.PI * 2) / n), twoSided(i % 2 ? BLACK : HAZARD), 0, y, 0, { rx: -Math.PI / 2 });
    m.castShadow = false;
  }
}

// ---- The wind tunnel ----

/**
 * A vertical wind tunnel for indoor skydiving: a round plinth with the mesh grate the air comes up
 * through (a ring of light round it), the clear flight chamber on it with its doorway at the front
 * and a curved glass door slid aside, steel posts and bands, and over it the fan housing with the
 * fan turning on top. In use the fan spins, the lights brighten and streaks of air rush up through
 * the chamber, and the flyer floats in the middle of it, face down in the box (Spot 'fly').
 */
const windTunnel: Builder = (g, W, D, c, _def, _ctx, out) => {
  const R = Math.min(W, D) / 2 - 0.2;
  const base = 0.3;
  const top = 2.45;
  const H = top - base;
  // The plinth and its rim.
  part(g, cyl(R + 0.14, R + 0.18, base, 36), '#455a64', 0, base / 2, 0);
  part(g, cyl(R + 0.15, R + 0.15, 0.04, 36), STEEL, 0, base - 0.02, 0, { outline: false });
  // The grate: a dark well crossed by bars both ways.
  part(g, cyl(R, R, 0.012, 36), '#1c262b', 0, base + 0.006, 0, { outline: false });
  for (let p = -R + 0.1; p < R - 0.05; p += 0.1) {
    const chord = 2 * Math.sqrt(Math.max(0, R * R - p * p)) - 0.04;
    part(g, box(chord, 0.012, 0.012), '#78909c', 0, base + 0.016, p, { outline: false, shadow: false });
    part(g, box(0.012, 0.012, chord), '#78909c', p, base + 0.016, 0, { outline: false, shadow: false });
  }
  // The flight chamber: clear, open at the doorway (θ = 0 is the front).
  const gap = Math.PI * 0.26;
  own(g, new THREE.CylinderGeometry(R, R, H, 48, 1, true, gap / 2, Math.PI * 2 - gap), GLASS, 0, base + H / 2, 0).castShadow = false;
  // The door: curved glass slid round to the right behind the wall, with its frame and a bar handle.
  own(g, new THREE.CylinderGeometry(R + 0.04, R + 0.04, H - 0.12, 20, 1, true, gap / 2 + 0.08, gap), GLASS, 0, base + H / 2, 0).castShadow = false;
  for (const a of [gap / 2 + 0.08, gap * 1.5 + 0.08]) part(g, box(0.035, H - 0.12, 0.035), STEEL, (R + 0.04) * Math.sin(a), base + H / 2, (R + 0.04) * Math.cos(a), { outline: false });
  const ha = gap / 2 + 0.2;
  part(g, cyl(0.015, 0.015, 0.4, 6), '#eceff1', (R + 0.07) * Math.sin(ha), base + 1.0, (R + 0.07) * Math.cos(ha), { outline: false });
  // Posts round it (two framing the doorway) and bands at the foot, the middle and the top.
  for (let i = 0; i < 6; i++) {
    const a = i === 0 ? gap / 2 : i === 5 ? -gap / 2 : gap / 2 + ((Math.PI * 2 - gap) * i) / 5;
    part(g, box(0.07, H, 0.07), '#546e7a', R * Math.sin(a), base + H / 2, R * Math.cos(a), { ry: a });
  }
  for (const y of [base + 0.04, top - 0.02]) own(g, new THREE.TorusGeometry(R, 0.05, 8, 56), twoSided('#546e7a'), 0, y, 0, { rx: Math.PI / 2 });
  // The middle band stops at the doorway (the torus's angle π/2 is the front, once it's laid flat).
  own(g, new THREE.TorusGeometry(R, 0.025, 8, 48, Math.PI * 2 - gap).rotateZ(Math.PI / 2 + gap / 2), twoSided('#546e7a'), 0, base + H * 0.55, 0, { rx: Math.PI / 2 });
  // The doorway's header, a sign over it, and the light rings (dim until it's flown in).
  part(g, rbox(0.72, 0.1, 0.1, 0.02), '#37474f', 0, top - 0.12, R + 0.02);
  glowing(g, box(0.4, 0.05, 0.01), '#4fc3f7', 0, top - 0.12, R + 0.075);
  own(g, new THREE.TorusGeometry(R - 0.03, 0.018, 6, 56), twoSided('#4a6f80'), 0, base + 0.03, 0, { rx: Math.PI / 2 });
  own(g, new THREE.TorusGeometry(R - 0.03, 0.018, 6, 56), twoSided('#4a6f80'), 0, top - 0.07, 0, { rx: Math.PI / 2 });
  // Over it: the net, the fan housing, and the fan in its shroud on top.
  for (let p = -R + 0.2; p < R - 0.1; p += 0.2) {
    const chord = 2 * Math.sqrt(Math.max(0, R * R - p * p)) - 0.04;
    part(g, box(chord, 0.008, 0.008), '#90a4ae', 0, top - 0.01, p, { outline: false, shadow: false });
    part(g, box(0.008, 0.008, chord), '#90a4ae', p, top - 0.01, 0, { outline: false, shadow: false });
  }
  part(g, cyl(R + 0.1, R + 0.06, 0.12, 36), STEEL, 0, top + 0.06, 0);
  part(g, cyl(R - 0.05, R + 0.1, 0.24, 36), '#37474f', 0, top + 0.24, 0);
  own(g, new THREE.TorusGeometry(R - 0.12, 0.05, 8, 48), twoSided('#263238'), 0, top + 0.38, 0, { rx: Math.PI / 2 });
  part(g, cyl(R - 0.14, R - 0.14, 0.01, 36), '#1b1f22', 0, top + 0.36, 0, { outline: false });
  const fan = new THREE.Group();
  fan.position.set(0, top + 0.39, 0);
  g.add(fan);
  part(fan, cyl(0.1, 0.12, 0.08, 16), '#b0bec5', 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    // Pitched about its own length, then turned round the hub.
    part(fan, box(R - 0.3, 0.012, 0.11), '#90a4ae', Math.cos(a) * (R / 2 - 0.05), 0, -Math.sin(a) * (R / 2 - 0.05), { ry: a, rx: 0.35, outline: false }).rotation.order = 'YXZ';
  }
  // The instructor's panel in the front-left corner, turned out to the room.
  const desk = new THREE.Group();
  desk.position.set(-W / 2 + 0.2, 0, D / 2 - 0.2);
  desk.rotation.y = -Math.PI / 4;
  g.add(desk);
  part(desk, rbox(0.26, 1.0, 0.18, 0.03), '#455a64', 0, 0.5, 0);
  part(desk, rbox(0.3, 0.05, 0.24, 0.02), '#37474f', 0, 1.02, 0.02, { rx: 0.35 });
  const s = screenMesh(0.22, 0.14);
  s.position.set(0, 1.05, 0.04);
  s.rotation.x = -Math.PI / 2 + 0.35;
  desk.add(s);
  out.screen = s;
  for (const [k, x] of [['#e53935', -0.08], ['#43a047', 0.08]] as const) glowing(desk, cyl(0.018, 0.018, 0.02, 10), k, x, 0.85, 0.095, { rx: Math.PI / 2 });

  // In use: bright light rings and air rushing up the chamber.
  const live = new THREE.Group();
  g.add(live);
  out.inUse = live;
  glowing(live, new THREE.TorusGeometry(R - 0.03, 0.022, 6, 56), '#80deea', 0, base + 0.03, 0, { rx: Math.PI / 2 }).userData.ownGeometry = true;
  glowing(live, new THREE.TorusGeometry(R - 0.03, 0.022, 6, 56), '#80deea', 0, top - 0.07, 0, { rx: Math.PI / 2 }).userData.ownGeometry = true;
  const streaks: THREE.Mesh[] = [];
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4;
    const r = R * (0.25 + 0.7 * ((i * 0.37) % 1));
    const m = new THREE.Mesh(box(0.012, 0.45, 0.012), AIR);
    m.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    m.castShadow = false;
    live.add(m);
    streaks.push(m);
  }
  out.animate = (t) => {
    fan.rotation.y = t * 9;
    streaks.forEach((m, i) => (m.position.y = base + 0.25 + (((t * 1.6 + i * 0.37) % 1) + 1) % 1 * (H - 0.5)));
  };
  // Flying in the middle of the chamber, the head to the right (+x), the grate a metre under them.
  out.spots = { '*': spot(g, 'fly', 0, 1.35, 0, Math.PI / 2, 1.35 - base) };
  void c;
};

// ---- The centrifuge ----

/** A stadium (a rectangle with round ends) in a shape's plane: `hw` across, `hl` the straight half-length along. */
function stadium(hw: number, hl: number, path: THREE.Shape | THREE.Path = new THREE.Shape()) {
  path.moveTo(hw, -hl);
  path.lineTo(hw, hl);
  path.absarc(0, hl, hw, 0, Math.PI, false);
  path.lineTo(-hw, -hl);
  path.absarc(0, -hl, hw, Math.PI, Math.PI * 2, false);
  return path;
}
/** A stadium-shaped slab `h` thick lying flat (its length along z), its bottom at y = 0; a wall `t` thick if `t` is given. */
function stadiumSlab(hw: number, hl: number, h: number, t?: number) {
  const shape = stadium(hw, hl) as THREE.Shape;
  if (t) shape.holes.push(stadium(hw - t, hl, new THREE.Path()));
  return new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 10 }).rotateX(-Math.PI / 2);
}

/**
 * The arm (+x out from the hub) with its hub cap and counterweight, and the gondola at its end
 * (2026-10-26, made over after the review: it had stood up as one tall capsule hiding everything):
 * a low open tub lying across the end of the arm, about a metre long and knee-high, white with an
 * orange rim and a small windscreen at the front, a reclined seat at its back end with a headrest
 * and harness, grips by the hips. The dweller sits in it facing the way it travels (-z), head and
 * shoulders, arms and knees above the rim. Returns the seat's spot.
 */
export function centrifugeArm(g: THREE.Object3D, c: string) {
  // The cap turning on the hub drum, the long arm out under the pod, the counterweight on the short side.
  part(g, cyl(0.15, 0.15, 0.14, 20), '#78909c', 0, 0.43, 0);
  part(g, ball(0.07), STEEL, 0, 0.51, 0);
  part(g, rbox(0.82, 0.12, 0.18, 0.03), c, 0.41, 0.42, 0);
  for (const sz of [-1, 1]) part(g, box(0.62, 0.025, 0.005), HAZARD, 0.42, 0.42, sz * 0.092, { outline: false });
  part(g, rbox(0.5, 0.1, 0.16, 0.03), c, -0.27, 0.42, 0);
  part(g, rbox(0.22, 0.3, 0.36, 0.04), '#455a64', -0.5, 0.42, 0);
  for (const sy of [-1, 1]) part(g, box(0.005, 0.06, 0.32), HAZARD, -0.615, 0.42 + sy * 0.09, 0, { outline: false });
  // The pod: a floor, a wall round it, the orange rim, the windscreen at the front (-z).
  const px = 0.68;
  const hw = 0.25;
  const hl = 0.25;
  const floor = 0.55;
  own(g, stadiumSlab(hw, hl, 0.08), twoSided('#cfd8dc'), px, floor - 0.08, 0);
  own(g, stadiumSlab(hw, hl, 0.4, 0.035), twoSided(SHELL), px, floor - 0.06, 0);
  own(g, stadiumSlab(hw + 0.01, hl, 0.04, 0.05), twoSided('#ff7043'), px, floor + 0.32, 0);
  // Brackets from the arm up to the floor.
  for (const z of [-0.2, 0.2]) part(g, rbox(0.12, 0.08, 0.06, 0.02), '#78909c', px, floor - 0.1, z);
  const shield = part(g, box(0.36, 0.22, 0.012), '#cfeefa', px, floor + 0.46, -hl - hw + 0.08, { rx: -0.45, material: GLASS, outline: false });
  shield.castShadow = false;
  part(g, rbox(0.38, 0.03, 0.03, 0.01), '#546e7a', px, floor + 0.36, -hl - hw + 0.05);
  // The seat at the back end, low, reclined back; harness straps and a headrest.
  const sz = 0.15;
  const top = floor + 0.3;
  part(g, rbox(0.3, top - floor - 0.06, 0.3, 0.03), '#546e7a', px, (floor + top - 0.06) / 2, sz + 0.03);
  part(g, rbox(0.38, 0.07, 0.4, 0.03), '#263238', px, top - 0.035, sz);
  const back = new THREE.Group();
  back.position.set(px, top, sz + 0.17);
  back.rotation.x = 0.28;
  g.add(back);
  part(back, rbox(0.36, 0.62, 0.07, 0.03), '#263238', 0, 0.31, 0.03);
  part(back, rbox(0.26, 0.16, 0.08, 0.03), '#37474f', 0, 0.68, 0.04);
  for (const x of [-0.09, 0.09]) part(back, box(0.05, 0.45, 0.01), '#ff7043', x, 0.34, -0.01, { outline: false });
  // A grip by each hip, on a bracket from the wall.
  for (const sx of [-1, 1]) {
    rod(g, new THREE.Vector3(px + sx * (hw - 0.03), top + 0.04, sz - 0.1), new THREE.Vector3(px + sx * 0.17, top + 0.04, sz - 0.1), 0.012, METAL);
    part(g, cyl(0.02, 0.02, 0.12, 8), BLACK, px + sx * 0.17, top + 0.1, sz - 0.1);
  }
  // Sat facing the way it goes (-z: the arm turns anticlockwise seen from above), the feet on the floor 0.3 down.
  return spot(g, 'sit', px, top, sz, Math.PI, 0.3);
}

/**
 * A human centrifuge for G training: a round pit striped yellow and black at its edge, the hub drum,
 * and the long arm with the gondola lying across its end. At rest the gondola waits at the front; in
 * use the arm (a second one, shown only then) winds up and swings it round with the dweller sat in it,
 * and the beacon on the back corner turns. The operator's console at the front right.
 */
const centrifuge: Builder = (g, W, D, c, _def, _ctx, out) => {
  const rest = -Math.PI / 2;
  part(g, cyl(0.99, 0.99, 0.03, 48), '#9ea7ad', 0, 0.015, 0, { outline: false });
  hazardRing(g, 0.92, 0.99, 0.032);
  part(g, cyl(0.17, 0.24, 0.36, 24), '#455a64', 0, 0.18, 0);
  own(g, new THREE.TorusGeometry(0.2, 0.022, 6, 24), twoSided(STEEL), 0, 0.3, 0, { rx: Math.PI / 2 });
  const still = new THREE.Group();
  still.rotation.y = rest;
  g.add(still);
  centrifugeArm(still, c);
  out.idle = still;
  const live = new THREE.Group();
  g.add(live);
  out.inUse = live;
  const spinner = new THREE.Group();
  spinner.rotation.y = rest;
  live.add(spinner);
  const seat = centrifugeArm(spinner, c);
  // The beacon on a post in the back-left corner, out of the gondola's sweep: amber, lit and turning while it spins.
  const bx = -W / 2 + 0.12;
  const bz = -D / 2 + 0.12;
  part(g, cyl(0.025, 0.025, 1.55, 8), '#546e7a', bx, 0.775, bz, { outline: false });
  part(g, cyl(0.06, 0.06, 0.04, 12), BLACK, bx, 1.57, bz);
  part(g, ball(0.055), '#ffb74d', bx, 1.61, bz);
  const beacon = new THREE.Group();
  beacon.position.set(bx, 1.61, bz);
  live.add(beacon);
  glowing(beacon, ball(0.058), '#ffab00', 0, 0, 0);
  glowing(beacon, box(0.13, 0.02, 0.005), '#fff8e1', 0, 0, 0);
  // The operator's console in the front-right corner, turned out to the room: a screen, a joystick and the stop button.
  const desk = new THREE.Group();
  desk.position.set(W / 2 - 0.27, 0, D / 2 - 0.27);
  desk.rotation.y = Math.PI / 4;
  g.add(desk);
  part(desk, rbox(0.4, 0.9, 0.24, 0.03), '#455a64', 0, 0.45, 0);
  part(desk, rbox(0.44, 0.05, 0.32, 0.02), '#37474f', 0, 0.93, 0.03, { rx: 0.3 });
  const s = screenMesh(0.26, 0.15);
  s.position.set(-0.04, 0.97, 0.03);
  s.rotation.x = -Math.PI / 2 + 0.3;
  desk.add(s);
  out.screen = s;
  part(desk, cyl(0.035, 0.035, 0.03, 12), '#e53935', 0.15, 0.96, 0.08);
  part(desk, cyl(0.008, 0.01, 0.08, 6), BLACK, 0.14, 0.99, -0.06);
  part(desk, ball(0.018), BLACK, 0.14, 1.03, -0.06);
  // Winding up from rest over five seconds to about a third of a turn a second; the beacon sweeps.
  let last = -1;
  let t0 = 0;
  out.animate = (t) => {
    if (t < last || t - last > 0.5) t0 = t;
    last = t;
    const k = t - t0;
    const T = 5;
    const w = 2.2;
    spinner.rotation.y = rest + (k < T ? (w * k * k) / (2 * T) : w * (k - T / 2));
    beacon.rotation.y = t * 7;
  };
  out.spots = { '*': seat };
};

// ---- The spacecraft mock-up ----

/**
 * A crew seat facing local +z (put in turned to face the panel): a bucket seat on a pedestal, reclined
 * back with a headrest and orange harness straps, armrests with a hand controller at each front end.
 */
function crewSeat(g: THREE.Object3D, x: number, deck: number, z: number, yaw: number) {
  const s = new THREE.Group();
  s.position.set(x, 0, z);
  s.rotation.y = yaw;
  g.add(s);
  const top = deck + 0.42;
  part(s, rbox(0.2, top - 0.08 - deck, 0.24, 0.03), '#546e7a', 0, (deck + top - 0.08) / 2, -0.05);
  part(s, rbox(0.44, 0.08, 0.44, 0.04), '#37474f', 0, top - 0.04, 0);
  for (const sx of [-1, 1]) part(s, rbox(0.06, 0.1, 0.42, 0.03), '#eceff1', sx * 0.21, top, 0, { outline: false });
  part(s, rbox(0.44, 0.72, 0.08, 0.04), '#37474f', 0, top + 0.36, -0.25, { rx: -0.12 });
  part(s, rbox(0.26, 0.18, 0.1, 0.04), '#455a64', 0, top + 0.8, -0.32, { rx: -0.12 });
  for (const sx of [-1, 1]) part(s, box(0.05, 0.5, 0.012), '#ff7043', sx * 0.1, top + 0.36, -0.205, { rx: -0.12, outline: false });
  for (const sx of [-1, 1]) {
    part(s, rbox(0.06, 0.05, 0.5, 0.02), '#455a64', sx * 0.26, top + 0.2, 0.05);
    part(s, cyl(0.035, 0.04, 0.03, 10), BLACK, sx * 0.26, top + 0.24, 0.26);
    part(s, cyl(0.016, 0.022, 0.1, 8), '#263238', sx * 0.26, top + 0.3, 0.26);
    part(s, ball(0.028), sx < 0 ? '#e0e0e0' : '#90a4ae', sx * 0.26, top + 0.36, 0.26);
  }
}

/**
 * The spacecraft cabin trainer: a white capsule lying along the room on cradles, cut open down its
 * front so you see in — a blue-grey lining, the nose with its docking ring at the left, a lit
 * instrument panel raked over the crew's knees (three displays, the middle one the docking
 * crosshair, rows of switches and lights, a guarded switch for the right hand), an overhead panel,
 * the cabin light, and two crew seats facing the nose. The aft end has the hatch, open, with a
 * yellow EVA handrail over it, and a grated landing with steps and a rail to stand at it.
 * Flying and docking are done in the near seat at the controls (a hand on each controller, now and
 * then up to the switch), the manual read there too; EVA practice on the landing, hand over hand
 * along the rail.
 */
const spacecraftMockup: Builder = (g, W, D, c, _def, _ctx, out) => {
  const xa = -W / 2 + 0.36;
  const xb = W / 2 - 0.75;
  const L = xb - xa;
  const xm = (xa + xb) / 2;
  const R = 0.8;
  const ay = 1.05;
  const zc = -0.1;
  const deck = 0.45;
  // The plinth and the cradles it rests in.
  part(g, rbox(L, 0.12, D - 0.25, 0.03), '#b0bec5', xm, 0.06, -0.075);
  for (const x of [xa + 0.35, xb - 0.35]) part(g, rbox(0.16, 0.32, 1.2, 0.03), '#78909c', x, 0.24, zc);
  // The hull, open at the front from the deck to near the top; its lining; the cut edges.
  const open0 = Math.PI * 0.32;
  const wrap = Math.PI * 1.4;
  own(g, new THREE.CylinderGeometry(R, R, L, 48, 1, true, open0, wrap).rotateZ(Math.PI / 2), twoSided(SHELL), xm, ay, zc);
  own(g, new THREE.CylinderGeometry(R - 0.04, R - 0.04, L, 48, 1, true, open0, wrap).rotateZ(Math.PI / 2), twoSided('#b8c7d3', THREE.BackSide), xm, ay, zc);
  for (const a of [open0, open0 + wrap]) rod(g, new THREE.Vector3(xa, ay + (R - 0.02) * Math.sin(a), zc + (R - 0.02) * Math.cos(a)), new THREE.Vector3(xb, ay + (R - 0.02) * Math.sin(a), zc + (R - 0.02) * Math.cos(a)), 0.035, '#90a4ae');
  // Bands round the hull (only where there's hull), the ends ringed.
  for (const [x, k] of [[xa + 0.25, '#1565c0'], [xa + 0.33, '#e53935'], [xb - 0.2, '#1565c0']] as const)
    own(g, new THREE.TorusGeometry(R + 0.005, 0.025, 6, 48, wrap).rotateZ(Math.PI - open0 - wrap).rotateY(Math.PI / 2), twoSided(k), x, ay, zc);
  for (const x of [xa, xb]) own(g, new THREE.TorusGeometry(R, 0.05, 8, 56).rotateY(Math.PI / 2), twoSided('#90a4ae'), x, ay, zc);
  // The ends: the nose wall inside, the aft bulkhead.
  own(g, new THREE.CircleGeometry(R - 0.02, 48).rotateY(Math.PI / 2), twoSided('#b8c7d3'), xa + 0.01, ay, zc);
  own(g, new THREE.CircleGeometry(R - 0.02, 48).rotateY(Math.PI / 2), twoSided('#e8e8e4'), xb - 0.005, ay, zc);
  // The nose: a cone out to the docking ring.
  own(g, new THREE.CylinderGeometry(0.42, R, 0.28, 48).rotateZ(Math.PI / 2), twoSided(SHELL), xa - 0.14, ay, zc);
  own(g, new THREE.TorusGeometry(0.36, 0.045, 8, 40).rotateY(Math.PI / 2), twoSided('#78909c'), xa - 0.3, ay, zc);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    part(g, box(0.04, 0.07, 0.07), '#546e7a', xa - 0.32, ay + 0.36 * Math.sin(a), zc + 0.36 * Math.cos(a), { outline: false });
  }
  // Portholes and a thruster block on the back of the hull, seen from above.
  for (const x of [xa + 0.6, xa + 1.05]) {
    const a = Math.PI * 0.72;
    const port = part(g, cyl(0.1, 0.1, 0.03, 18), '#90a4ae', x, ay + R * Math.sin(a), zc + R * Math.cos(a), { rx: Math.PI / 2 - a });
    part(port, cyl(0.075, 0.075, 0.01, 18), '#1a237e', 0, 0.016, 0, { outline: false });
  }
  part(g, rbox(0.16, 0.08, 0.16, 0.02), '#cfd8dc', xb - 0.45, ay + R * Math.sin(Math.PI * 0.62) + 0.03, zc + R * Math.cos(Math.PI * 0.62), { rx: Math.PI / 2 - Math.PI * 0.62 });
  // Inside: the deck, the cabin light, the overhead panel.
  part(g, rbox(L - 0.06, 0.05, 1.04, 0.01), '#78909c', xm, deck - 0.025, zc);
  glowing(g, box(L - 0.5, 0.02, 0.1), '#fffde7', xm, ay + 0.66, zc - 0.28);
  const over = new THREE.Group();
  over.position.set(xa + 0.5, ay + 0.6, zc);
  over.rotation.z = 0.3;
  g.add(over);
  part(over, rbox(0.42, 0.04, 0.66, 0.01), '#37474f', 0, 0, 0);
  for (let i = 0; i < 18; i++) {
    const k = ['#e0e0e0', '#ffca28', '#e0e0e0', '#66bb6a', '#e0e0e0', '#ef5350'][i % 6];
    const p = part(over, box(0.02, 0.02, 0.025), k, -0.12 + (i % 3) * 0.12, -0.03, -0.26 + Math.floor(i / 3) * 0.1, { outline: false });
    if (i % 2) p.material = lit(k);
  }
  // The instrument panel, raked back over the knees, its face to the seats (+x).
  part(g, rbox(0.12, 0.72, 1.06, 0.02), '#455a64', xa + 0.1, deck + 0.36, zc);
  const panel = new THREE.Group();
  panel.position.set(xa + 0.28, 1.38, zc);
  panel.rotation.z = 0.25;
  g.add(panel);
  part(panel, rbox(0.07, 0.56, 1.14, 0.02), '#263238', 0, 0, 0);
  const face = 0.04;
  const shown = (w: number, h: number, z: number) => {
    part(panel, rbox(0.015, h + 0.04, w + 0.04, 0.005), BLACK, face - 0.003, 0.08, z, { outline: false });
    const m = screenMesh(w, h);
    m.position.set(face + 0.004, 0.08, z);
    m.rotation.y = Math.PI / 2;
    panel.add(m);
    return m;
  };
  // The near seat's display (lit with the rest in use), the docking crosshair in the middle, the far seat's display.
  out.screen = shown(0.28, 0.22, 0.33);
  part(panel, rbox(0.015, 0.26, 0.3, 0.005), BLACK, face - 0.003, 0.08, 0.0, { outline: false });
  glowing(panel, box(0.006, 0.22, 0.26), '#0d2b2a', face + 0.006, 0.08, 0.0);
  glowing(panel, new THREE.TorusGeometry(0.06, 0.006, 6, 24).rotateY(Math.PI / 2), '#69f0ae', face + 0.011, 0.08, 0.0).userData.ownGeometry = true;
  glowing(panel, box(0.004, 0.004, 0.2), '#69f0ae', face + 0.011, 0.08, 0.0);
  glowing(panel, box(0.004, 0.18, 0.004), '#69f0ae', face + 0.011, 0.08, 0.0);
  part(panel, rbox(0.015, 0.26, 0.34, 0.005), BLACK, face - 0.003, 0.08, -0.34, { outline: false });
  glowing(panel, box(0.006, 0.22, 0.3), '#0d2547', face + 0.006, 0.08, -0.34);
  glowing(panel, box(0.004, 0.11, 0.3), '#4fc3f7', face + 0.011, 0.025, -0.34);
  glowing(panel, box(0.004, 0.004, 0.3), '#fff176', face + 0.012, 0.08, -0.34);
  // Rows of switches under the displays, a light over each other one.
  for (let i = 0; i < 16; i++) {
    const z = -0.48 + i * 0.064;
    part(panel, box(0.03, 0.025, 0.02), i % 4 === 3 ? '#ffca28' : '#e0e0e0', face + 0.01, -0.16, z, { outline: false });
    if (i % 2 === 0) glowing(panel, box(0.008, 0.018, 0.018), ['#66bb6a', '#ffca28', '#66bb6a', '#ef5350'][(i / 2) % 4], face + 0.006, -0.11, z);
  }
  // The guarded switch the right hand goes up to: a red cover flipped up over it.
  const sw = { y: -0.23, z: 0.12 };
  part(panel, box(0.03, 0.03, 0.025), '#e0e0e0', face + 0.012, sw.y, sw.z, { outline: false });
  part(panel, box(0.005, 0.05, 0.05), '#e53935', face + 0.03, sw.y + 0.04, sw.z, { rz: 0.5, outline: false });
  const work = marker(panel, face + 0.03, sw.y, sw.z);
  // Two crew seats facing the nose, the near one the one used.
  const seatX = xa + 0.78;
  const near = 0.17;
  crewSeat(g, seatX, deck, near, -Math.PI / 2);
  crewSeat(g, seatX, deck, zc * 2 - near - 0.02, -Math.PI / 2);
  // The aft end outside: the hatch (open, inward), the EVA handrail over it and a grip either side.
  const hy = 1.0;
  own(g, new THREE.TorusGeometry(0.31, 0.045, 8, 32).rotateY(Math.PI / 2), twoSided('#90a4ae'), xb + 0.02, hy, zc);
  own(g, new THREE.CircleGeometry(0.29, 32).rotateY(Math.PI / 2), twoSided('#37474f'), xb + 0.004, hy, zc);
  for (const dz of [-0.36, 0.36]) part(g, rbox(0.05, 0.1, 0.05, 0.01), '#78909c', xb + 0.03, hy, zc + dz);
  const ry = 1.48;
  rod(g, new THREE.Vector3(xb + 0.09, ry, zc - 0.4), new THREE.Vector3(xb + 0.09, ry, zc + 0.36), 0.02, HAZARD);
  for (const dz of [-0.36, 0, 0.32]) rod(g, new THREE.Vector3(xb, ry, zc + dz), new THREE.Vector3(xb + 0.09, ry, zc + dz), 0.014, HAZARD);
  for (const dz of [-0.45, 0.45]) {
    rod(g, new THREE.Vector3(xb + 0.08, hy - 0.2, zc + dz), new THREE.Vector3(xb + 0.08, hy + 0.2, zc + dz), 0.018, HAZARD);
    for (const dy of [-0.2, 0.2]) rod(g, new THREE.Vector3(xb, hy + dy, zc + dz), new THREE.Vector3(xb + 0.08, hy + dy, zc + dz), 0.012, HAZARD);
  }
  glowing(g, box(0.01, 0.05, 0.05), '#66bb6a', xb + 0.01, hy + 0.42, zc + 0.3);
  // The landing: a grated deck on legs at the cabin's floor height, steps down to the front, a rail round.
  const lx0 = xb + 0.04;
  const lx1 = W / 2 - 0.05;
  const lz0 = -0.55;
  const lz1 = 0.3;
  const lxm = (lx0 + lx1) / 2;
  part(g, rbox(lx1 - lx0, 0.05, lz1 - lz0, 0.01), '#78909c', lxm, deck - 0.025, (lz0 + lz1) / 2);
  for (let x = lx0 + 0.08; x < lx1 - 0.04; x += 0.08) part(g, box(0.012, 0.005, lz1 - lz0 - 0.06), '#546e7a', x, deck + 0.002, (lz0 + lz1) / 2, { outline: false, shadow: false });
  for (const [x, z] of [[lx0 + 0.04, lz0 + 0.04], [lx1 - 0.04, lz0 + 0.04], [lx0 + 0.04, lz1 - 0.04], [lx1 - 0.04, lz1 - 0.04]] as const) part(g, box(0.05, deck - 0.05, 0.05), '#546e7a', x, (deck - 0.05) / 2, z, { outline: false });
  for (const [y, z] of [[0.3, lz1 + 0.13], [0.15, lz1 + 0.38]] as const) part(g, rbox(lx1 - lx0 - 0.1, 0.04, 0.24, 0.01), '#78909c', lxm, y - 0.02, z);
  for (const x of [lx0 + 0.03, lx1 - 0.03]) rod(g, new THREE.Vector3(x, 0, lz1 + 0.5), new THREE.Vector3(x, deck, lz1), 0.02, '#546e7a');
  const rail = deck + 0.95;
  for (const [x, z] of [[lx1 - 0.02, lz0 + 0.02], [lx1 - 0.02, lz1], [lx0 + 0.1, lz0 + 0.02]] as const) part(g, cyl(0.018, 0.018, 0.95, 8), HAZARD, x, deck + 0.475, z, { outline: false });
  rod(g, new THREE.Vector3(lx1 - 0.02, rail, lz0 + 0.02), new THREE.Vector3(lx1 - 0.02, rail, lz1), 0.02, HAZARD);
  rod(g, new THREE.Vector3(lx0 + 0.1, rail, lz0 + 0.02), new THREE.Vector3(lx1 - 0.02, rail, lz0 + 0.02), 0.02, HAZARD);
  rod(g, new THREE.Vector3(lx1 - 0.02, rail, lz1), new THREE.Vector3(lx1 - 0.02, rail - 0.4, lz1 + 0.5), 0.02, HAZARD);
  // Where they go: the near seat (at the controls, the hand going up to the guarded switch), the landing at the hatch.
  const seat = spot(g, 'sit', seatX, deck + 0.42, near, -Math.PI / 2, 0.42);
  const controls = { ...seat, work };
  const hatch = spot(g, 'stand', xb + 0.4, deck, zc, -Math.PI / 2);
  hatch.work = marker(g, xb + 0.09, ry, zc);
  out.spots = {
    dockingDrill: controls,
    astronaut_manualPiloting: controls,
    astronaut_systemsManual: seat,
    evaDrill: hatch,
    astronaut_evaRehearsal: hatch,
    '*': controls,
  };
  void c;
};

export const SPACE_DETAIL: Record<string, Builder> = { windTunnel, centrifuge, spacecraftMockup };
