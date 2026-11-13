import * as THREE from 'three';
import { marker, rod, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { label, painted, picture, ring, text } from './doctor';
import * as K from './kindergartenTeacherMotion';
import { vroidFigure, type FigureOptions } from './vroidFigure';

/** 유치원: birch, washable trays, children's work and responsive five-to-seven-year-olds.
 * Piano and toyBox remain generic home furniture. All tools sample the avatar's trajectories.
 * away() also restores the idle scene, including hinges, when an interaction is interrupted. */
const WOOD = '#dfbb87', EDGE = '#bd925e', CREAM = '#fff7e6', GREEN = '#69a996', INK = '#394e50';
const COLORS = ['#e79991', '#e9c666', '#88b7ac', '#8ca5ce', '#b79ac9'];
const UP = new THREE.Vector3(0, 1, 0);
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
function group(g: THREE.Object3D, x = 0, y = 0, z = 0, yaw = 0) {
  const a = new THREE.Group(); a.position.set(x, y, z); a.rotation.y = yaw; g.add(a); return a;
}
const put = (o: THREE.Object3D, p: K.V) => o.position.set(...p);
const active = (s: Spot, t: number) => Math.abs(t - (s.at.userData.posedAt ?? -100)) < 0.6;
function current(spots: Spot[], t: number): Spot | undefined {
  return spots.filter(s => active(s, t)).sort((a, b) => b.at.userData.posedAt - a.at.userData.posedAt)[0];
}
function use(g: THREE.Object3D, m: K.KgMotion, seated = false): Spot {
  const p = K.spotOf(m);
  const s = spot(g, seated ? 'sit' : 'stand', ...p, K.yawOf(m), seated ? p[1] : 0);
  s.motion = m; s.work = marker(g, 0, 0, 0); return s;
}
function hands(s: Spot, t: number) { return K.kgLocal(s.motion as K.KgMotion, t, s.at.userData.height ?? 1.6); }
function sceneTime(s: Spot, t: number) {
  return K.kgTime(s.motion as K.KgMotion, t, s.work!.getWorldPosition(new THREE.Vector3()));
}
function legs(g: THREE.Object3D, width: number, depth: number, height: number, color = WOOD) {
  for (const x of [-width / 2, width / 2]) for (const z of [-depth / 2, depth / 2]) {
    part(g, rbox(0.055, height, 0.055, 0.012), color, x, height / 2, z);
    part(g, rbox(0.058, 0.028, 0.058, 0.01), '#71857d', x, 0.014, z);
  }
}
function flat(g: THREE.Object3D, texture: THREE.Texture, w: number, d: number, x: number, y: number, z: number) {
  return picture(g, texture, w, d, x, y, z, '#ffffff', 0, -Math.PI / 2);
}
function lit(g: THREE.Object3D, geometry: THREE.BufferGeometry, color: string, x: number, y: number, z: number) {
  const mat = new THREE.MeshBasicMaterial({ color });
  const mesh = part(g, geometry, color, x, y, z, { material: mat, outline: false });
  mesh.userData.ownMaterial = true; return { mesh, mat };
}
function swap(g: THREE.Object3D, textures: THREE.Texture[], w: number, h: number, x: number, y: number, z: number) {
  const mesh = picture(g, textures[0], w, h, x, y, z);
  return { mesh, set(i: number) {
    const mat = mesh.material as THREE.MeshBasicMaterial;
    const map = textures[((i % textures.length) + textures.length) % textures.length];
    if (mat.map !== map) { mat.map = map; mat.needsUpdate = true; }
  } };
}
function limb(g: THREE.Object3D, color: string, radius: number) {
  const mesh = part(g, cyl(radius, radius * 0.9, 1, 8), color, 0, 0, 0, { outline: false });
  return (a: THREE.Vector3, b: THREE.Vector3) => {
    const d = b.clone().sub(a); mesh.position.copy(a).addScaledVector(d, 0.5);
    mesh.scale.y = Math.max(0.001, d.length()); mesh.quaternion.setFromUnitVectors(UP, d.normalize());
  };
}

/** Short trousers, collars, different hair and faces; two-bone arm reach, nods, seated legs and
 * alternating steps. pose() returns the actual clamped palms, so children's tools stay attached. */
function pupil(parent: THREE.Object3D, index: number, x: number, y: number, z: number, yaw = 0, seated = false, chair = false, adult = false) {
  const root = group(parent, x, y, z, yaw);
  const skin = ['#edc4a2', '#d9a782', '#f1cfb1', '#bd8c67'][index % 4];
  const hair = ['#302c2a', '#544037', '#322927', '#69503d'][index % 4];
  const shirt = COLORS[index % 5], hip = seated ? 0.13 : chair ? 0.05 : 0.47, shoulder = hip + 0.27;
  const torso = group(root, 0, hip, 0);
  part(torso, rbox(0.24, 0.28, 0.16, 0.055), shirt, 0, 0.15, 0);
  part(torso, rbox(0.22, 0.11, 0.17, 0.035), '#637589', 0, 0.015, 0);
  for (const sx of [-1, 1]) part(torso, box(0.045, 0.038, 0.01), CREAM, sx * 0.027, 0.265, 0.081, { rz: sx * 0.28, outline: false });
  for (let i = 0; i < 2; i++) part(torso, ball(0.007), CREAM, 0, 0.2 - i * 0.06, 0.084, { outline: false });
  if (adult) label(torso, '교사', 0.065, 0.028, -0.055, 0.19, 0.086, CREAM, INK);
  const head = group(torso, 0, 0.43, 0);
  part(head, ball(0.112), skin, 0, 0, 0);
  part(head, ball(0.116), hair, 0, 0.033, -0.035);
  part(head, rbox(0.17, 0.04, 0.045, 0.012), hair, -0.015, 0.075, 0.069, { rz: 0.12 });
  if (index % 3 === 1) for (const sx of [-1, 1]) {
    part(head, ball(0.045), hair, sx * 0.11, 0.01, -0.045);
    part(head, ball(0.018), COLORS[(index + 1) % 5], sx * 0.105, 0.04, -0.028, { outline: false });
  }
  if (index % 3 === 2) for (const sx of [-1, 1]) part(head, rbox(0.035, 0.12, 0.12, 0.015), hair, sx * 0.1, -0.028, -0.02);
  for (const sx of [-1, 1]) {
    part(head, ball(0.012), skin, sx * 0.111, -0.007, 0);
    part(head, ball(0.009), INK, sx * 0.036, 0.002, 0.104, { outline: false });
    part(head, ball(0.004), CREAM, sx * 0.036 - 0.002, 0.006, 0.111, { outline: false });
    part(head, ball(0.012), '#e6a895', sx * 0.058, -0.026, 0.094, { outline: false }).scale.z = 0.3;
  }
  part(head, ball(0.009), skin, 0, -0.014, 0.114, { outline: false });
  part(head, ring(0.021, 0.003, Math.PI), '#9d625d', 0, -0.033, 0.105, { rz: Math.PI, outline: false });
  const arm = (side: number) => {
    const upper = limb(root, shirt, 0.033), fore = limb(root, skin, 0.026);
    const palm = part(root, ball(0.03), skin, 0, 0, 0, { outline: false });
    return (target: THREE.Vector3) => {
      const a = v(side * 0.135, shoulder - hip, 0).applyEuler(torso.rotation).add(v(0, hip, 0)), d = target.clone().sub(a);
      const length = Math.min(0.385, Math.max(0.03, d.length())); d.normalize();
      const p = a.clone().addScaledVector(d, length);
      const bend = v(side * 0.5, -1, -0.2); bend.addScaledVector(d, -bend.dot(d)).normalize();
      const cos = THREE.MathUtils.clamp((0.2 ** 2 + length ** 2 - 0.19 ** 2) / (0.4 * length), -1, 1);
      const elbow = a.clone().addScaledVector(d, 0.2 * cos).addScaledVector(bend, 0.2 * Math.sqrt(1 - cos ** 2));
      upper(a, elbow); fore(elbow, p); palm.position.copy(p); return p;
    };
  };
  const arms = [arm(1), arm(-1)];
  const feet = [-1, 1].map(side => {
    const thigh = limb(root, '#637589', 0.042), shin = limb(root, adult ? '#637589' : skin, adult ? 0.039 : 0.03);
    const shoe = part(root, rbox(0.085, 0.055, 0.15, 0.025), CREAM, 0, 0, 0);
    part(shoe, rbox(0.06, 0.014, 0.08, 0.006), shirt, 0, 0.025, 0.015, { outline: false });
    return (step: number) => {
      const knee = seated ? v(side * 0.15, 0.08, 0.15) : chair ? v(side * 0.07, 0.02, 0.2) : v(side * 0.065, 0.27, step * 0.4);
      const ankle = seated ? v(-side * 0.05, 0.045, 0.23) : chair ? v(side * 0.07, -0.25, 0.26) : v(side * 0.065, 0.06 + Math.max(0, step) * 0.15, step);
      thigh(v(side * 0.065, hip, 0), knee); shin(knee, ankle); shoe.position.copy(ankle).add(v(0, -0.025, 0.03));
    };
  });
  function pose(l = v(0.15, hip + 0.06, 0.1), r = v(-0.15, hip + 0.06, 0.1), walk = 0) {
    feet[0](walk); feet[1](-walk); return { l: arms[0](l), r: arms[1](r) };
  }
  pose(); return { root, head, torso, pose, hip };
}
type Pupil = ReturnType<typeof pupil>;
const noArm = () => undefined;
/**
 * A pupil played by a reduced VRoid body: pose() takes the same targets in the same frame (their own,
 * x to their left) and hands back where the hands were sent, so what they hold stays in them. A step
 * (pose's third number) moves the ankles the way the drawn feet go; bows stay a nod, the body has no waist order.
 */
function played(kid: Pupil, opts: FigureOptions): Pupil {
  const { root } = kid;
  const inParent = (p: THREE.Vector3) => p.clone().multiplyScalar(root.scale.x).applyAxisAngle(UP, root.rotation.y).add(root.position);
  let step = 0;
  const legs = () => (step === 0 ? {} : {
    l: inParent(v(0.065, 0.07 + Math.max(0, step) * 0.15, step)),
    r: inParent(v(-0.065, 0.07 + Math.max(0, -step) * 0.15, -step)),
  });
  const body = vroidFigure({ root, head: kid.head, armL: noArm, armR: noArm }, { legs, ...opts });
  return {
    ...kid,
    pose(l, r, walk = 0) {
      const p = kid.pose(l, r, walk);
      step = walk;
      const to = { l: l ?? p.l, r: r ?? p.r };
      body.armL(inParent(to.l));
      body.armR(inParent(to.r));
      return to;
    },
  };
}
function childHand(kid: Pupil, target: THREE.Vector3) {
  return target.clone().applyAxisAngle(UP, kid.root.rotation.y).add(kid.root.position);
}
function cushion(g: THREE.Object3D, x: number, z: number, color: string) {
  part(g, cyl(0.2, 0.21, 0.035, 24), color, x, 0.02, z);
  part(g, ring(0.18, 0.003), CREAM, x, 0.04, z, { rx: Math.PI / 2, outline: false });
}
function magnifier(g: THREE.Object3D, color = GREEN) {
  const a = group(g);
  part(a, ring(0.06, 0.01), color, 0, 0.075, 0);
  part(a, cyl(0.012, 0.012, 0.085, 10), color, 0, -0.015, 0);
  const lens = new THREE.MeshBasicMaterial({ color: '#d4f4ee', transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
  const pane = part(a, new THREE.CircleGeometry(0.05, 24), '#ffffff', 0, 0.075, 0, { material: lens, outline: false });
  pane.userData.ownMaterial = pane.userData.ownGeometry = true; return a;
}
function pencil(g: THREE.Object3D, color: string) {
  const a = group(g);
  part(a, cyl(0.006, 0.006, 0.11, 6), color, 0, 0.025, 0);
  part(a, cyl(0.006, 0, 0.025, 6), WOOD, 0, -0.042, 0, { outline: false });
  part(a, cyl(0.002, 0, 0.008, 6), INK, 0, -0.057, 0, { outline: false });
  a.rotation.x = -0.4; return a;
}
function tambourine(g: THREE.Object3D) {
  const a = group(g);
  part(a, ring(0.085, 0.012), '#c99156', 0, 0.05, 0);
  part(a, new THREE.CircleGeometry(0.075, 24), CREAM, 0, 0.05, -0.005, { outline: false }).userData.ownGeometry = true;
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3;
    part(a, cyl(0.019, 0.019, 0.007, 10), '#bdc5c6', Math.cos(angle) * 0.083, 0.05 + Math.sin(angle) * 0.083, 0.014, { rx: Math.PI / 2, outline: false });
  }
  return a;
}
function ribbon(g: THREE.Object3D, color: string) {
  const a = group(g);
  part(a, cyl(0.005, 0.005, 0.18, 8), WOOD, 0, 0.055, 0, { outline: false });
  const strips = Array.from({ length: 12 }, () => part(a, box(0.028, 0.047, 0.003), color, 0, 0, 0, { outline: false }));
  return { root: a, tick(t: number, energetic: boolean) {
    strips.forEach((s, i) => {
      s.position.set((energetic ? 0.1 : 0.025) * Math.sin(t * 7 - i * 0.5), 0.15 - i * 0.035, 0.025 * Math.cos(t * 4 - i * 0.3));
      s.rotation.z = (energetic ? 0.6 : 0.15) * Math.cos(t * 7 - i * 0.5);
    });
  } };
}
function board(g: THREE.Object3D, title: string, z = -0.42) {
  for (const x of [-0.83, 0.83]) {
    part(g, rbox(0.055, 1.52, 0.055, 0.012), WOOD, x, 0.76, z);
    part(g, rbox(0.12, 0.04, 0.42, 0.02), EDGE, x, 0.02, z + 0.12);
    for (const dz of [-0.03, 0.27]) part(g, ball(0.025), INK, x, 0.024, z + dz, { outline: false });
  }
  part(g, rbox(1.8, 0.91, 0.07, 0.025), WOOD, 0, 1.11, z);
  part(g, box(1.71, 0.82, 0.012), CREAM, 0, 1.11, z + 0.04);
  label(g, title, 1.58, 0.13, 0, 1.46, z + 0.049, GREEN, '#ffffff');
  part(g, rbox(1.73, 0.035, 0.15, 0.015), GREEN, 0, 0.66, z + 0.07);
  return z + 0.051;
}

/** Displaced ochre ripples and fine grains in vertex colours, one draw call. */
function sandBed(g: THREE.Object3D) {
  const geo = new THREE.PlaneGeometry(1.68, 0.56, 72, 28).rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, colors = new Float32Array(pos.count * 3), col = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const grain = ((Math.sin(i * 83.7) * 831.3) % 1 + 1) % 1;
    col.set(grain < 0.18 ? '#c5a773' : grain > 0.83 ? '#ead5a9' : '#ddc18c'); col.toArray(colors, i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.MeshToonMaterial({ color: '#ffffff', vertexColors: true });
  const mesh = part(g, geo, '#ffffff', 0, 0.635, -0.04, { material: mat, outline: false });
  mesh.userData.ownGeometry = mesh.userData.ownMaterial = true;
  let last = -1;
  const shape = (dig: number) => {
    if (Math.abs(dig - last) < 0.025) return; last = dig;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const ripple = 0.0025 * Math.sin(x * 37 + z * 17) + 0.0012 * Math.cos(z * 53 - x * 11);
      const trench = Math.exp(-((x + 0.1) ** 2 / 0.009 + (z - 0.16) ** 2 / 0.015));
      const bank = Math.exp(-((x + 0.22) ** 2 / 0.009 + (z - 0.12) ** 2 / 0.015));
      pos.setY(i, ripple - dig * 0.045 * trench + dig * 0.03 * bank);
    }
    pos.needsUpdate = true; geo.computeVertexNormals();
  };
  shape(0); return shape;
}
function scoop(g: THREE.Object3D) {
  const a = group(g);
  part(a, cyl(0.012, 0.012, 0.17, 8), '#df877c', 0, 0.025, 0);
  part(a, rbox(0.085, 0.016, 0.11, 0.025), '#df877c', 0, -0.064, -0.035, { rx: -0.35 });
  for (const sx of [-1, 1]) part(a, box(0.008, 0.025, 0.1), '#cd746b', sx * 0.038, -0.057, -0.035, { rx: -0.35, outline: false });
  part(a, ring(0.025, 0.006), '#df877c', 0, 0.13, 0); return a;
}
function sandTable(g: THREE.Group, out: Built) {
  const chassis = group(g, 0, 0, -0.04);
  legs(chassis, 1.68, 0.51, 0.58);
  part(chassis, rbox(1.8, 0.045, 0.69, 0.02), GREEN, 0, 0.54, 0);
  for (const z of [-0.34, 0.34]) part(chassis, rbox(1.82, 0.11, 0.035, 0.012), GREEN, 0, 0.6, z);
  for (const x of [-0.89, 0.89]) part(chassis, rbox(0.035, 0.11, 0.66, 0.012), GREEN, x, 0.6, 0);
  for (const z of [-0.36, 0.36]) part(chassis, rbox(1.92, 0.055, 0.07, 0.026), WOOD, 0, 0.67, z);
  for (const x of [-0.92, 0.92]) part(chassis, rbox(0.07, 0.055, 0.74, 0.026), WOOD, x, 0.67, 0);
  label(g, '모래 탐구  ·  꾹꾹 담고 쏙!', 0.92, 0.095, 0, 0.56, 0.32, GREEN, CREAM);
  rod(g, v(-0.65, 0.43, 0.35), v(-0.3, 0.43, 0.35), 0.012, EDGE);
  part(g, rbox(0.22, 0.2, 0.018, 0.01), CREAM, -0.48, 0.36, 0.36);
  for (let i = 0; i < 3; i++) part(g, box(0.2, 0.007, 0.02), COLORS[2], -0.48, 0.29 + i * 0.018, 0.371, { outline: false });
  part(g, cyl(0.018, 0.018, 0.012, 12), INK, 0.83, 0.57, 0.32, { rx: Math.PI / 2 });
  for (let i = 0; i < 2; i++) {
    part(g, rbox(0.58, 0.15, 0.34, 0.03), i ? '#d9c8a8' : '#a9c7bb', -0.4 + i * 0.8, 0.19, -0.06);
    label(g, i ? '틀 · 체' : '삽 · 갈퀴', 0.32, 0.055, -0.4 + i * 0.8, 0.2, 0.115, CREAM, INK);
  }
  const shape = sandBed(g), sieve = group(g, -0.68, 0.67, -0.16);
  part(sieve, ring(0.105, 0.012), '#deb753', 0, 0.035, 0, { rx: Math.PI / 2 });
  for (let i = -3; i <= 3; i++) {
    rod(sieve, v(-0.08, 0.032, i * 0.022), v(0.08, 0.032, i * 0.022), 0.0015, CREAM);
    rod(sieve, v(i * 0.022, 0.032, -0.08), v(i * 0.022, 0.032, 0.08), 0.0015, CREAM);
  }
  for (let i = 0; i < 3; i++) {
    part(g, cyl(0.045, 0.065, 0.09, 12), COLORS[i], 0.46 + i * 0.15, 0.7, -0.18);
    part(g, ring(0.04, 0.006), CREAM, 0.46 + i * 0.15, 0.75, -0.18, { rx: Math.PI / 2 });
  }
  const castle = group(g, ...K.SAND.castle);
  part(castle, rbox(0.3, 0.1, 0.19, 0.012), '#d6b77d', 0, 0.05, 0);
  for (const x of [-0.13, 0.13]) for (const z of [-0.065, 0.065]) {
    part(castle, cyl(0.047, 0.057, 0.17, 12), '#e0c18a', x, 0.085, z);
    for (let i = 0; i < 4; i++) part(castle, box(0.025, 0.026, 0.025), '#e0c18a', x + Math.cos(i * Math.PI / 2) * 0.031, 0.178, z + Math.sin(i * Math.PI / 2) * 0.031, { outline: false });
  }
  const arch = part(castle, ring(0.06, 0.024, Math.PI), '#d5b47c', 0, 0.018, 0.115);
  const hollow = part(castle, new THREE.CircleGeometry(0.048, 16, 0, Math.PI), '#715b3b', 0, 0.018, 0.111, { outline: false });
  hollow.userData.ownGeometry = true;
  const mould = group(g);
  part(mould, rbox(0.27, 0.085, 0.19, 0.02), '#89b8cb', 0, -0.04, 0);
  for (const x of [-0.1, 0.1]) part(mould, cyl(0.035, 0.04, 0.14, 12), '#89b8cb', x, -0.015, 0);
  part(mould, rbox(0.12, 0.025, 0.03, 0.01), '#5c97ab', 0, 0.04, 0);
  const tool = scoop(g), restingTool = scoop(g);
  put(restingTool, K.SAND.scoop); restingTool.rotation.x = 1.3;
  const s = use(g, 'kgSand'); out.spots = { sandPlay: s, '*': s }; out.work = s.work;
  const live = group(g); out.inUse = live;
  const children = [-0.5, 0.48].map((x, i) => played(pupil(live, i, x, 0, -0.65), { stage: 'child', gender: i ? 'female' : 'male' }));
  const kidScoop = scoop(live); kidScoop.scale.setScalar(0.72);
  const grains = Array.from({ length: 14 }, () => part(live, ball(0.008), '#edcf93', 0, 0, 0, { outline: false }));
  out.away = (_o, now) => {
    const on = active(s, now), t = on ? sceneTime(s, now) : 0, n = K.sandNow(t), h = hands(s, t);
    live.visible = on; tool.visible = on && n.scoop; restingTool.visible = !tool.visible;
    if (tool.visible) { put(tool, h.r); tool.rotation.z = n.falling ? 0.85 : 0.12; }
    put(mould, on && n.mouldHeld ? K.between(h.l, h.r, 0.5) : !on || n.b.i > 3 ? [0.63, 0.71, 0.12] : [0.12, 0.75, 0.02]);
    castle.visible = on ? n.castle > 0.02 : true;
    castle.scale.y = on ? Math.max(0.02, n.castle) : 1;
    arch.visible = hollow.visible = !on || n.tunnel > 0.5;
    shape(on ? n.tunnel * (n.b.key === 'smooth' ? 1 - n.b.u : 1) : 0.4);
    children.forEach((kid, i) => {
      const answering = n.b.key === 'show';
      const p = kid.pose(v(0.12, answering ? 0.85 : 0.67, 0.22), v(-0.1 + 0.03 * Math.sin(t * 2 + i), answering ? 0.82 : 0.72, 0.26));
      kid.head.rotation.x = answering ? -0.15 : 0.23;
      if (i === 0) kidScoop.position.copy(childHand(kid, p.r));
    });
    grains.forEach((p, i) => {
      p.visible = on && n.falling;
      const u = (t * 1.8 + i / grains.length) % 1;
      p.position.copy(tool.position).add(v(0.025 * Math.sin(i * 4), -0.07 - u * 0.16, -0.03));
    });
  };
}

/** A shallow school platform with five marked places, curtains, bunting, instrument baskets,
 * footlights and a cue card. Teaching and rehearsal have separate scripts, props and responses. */
function recitalStage(g: THREE.Group, out: Built) {
  part(g, rbox(1.94, 0.16, 0.94, 0.035), EDGE, 0, 0.08, 0);
  for (let i = 0; i < 10; i++) part(g, box(0.184, 0.012, 0.9), i % 2 ? WOOD : '#d4ad79', -0.828 + i * 0.184, 0.164, 0);
  part(g, rbox(0.7, 0.08, 0.18, 0.02), WOOD, 0, 0.04, 0.52);
  part(g, box(1.87, 1.43, 0.035), '#f0e8d9', 0, 0.89, -0.47);
  part(g, box(1.98, 0.12, 0.12), '#ac606f', 0, 1.61, -0.43);
  const curtains = [-1, 1].map(side => {
    const a = group(g, side * 0.75, 0, -0.4);
    for (let i = 0; i < 5; i++) part(a, cyl(0.04, 0.04, 1.36, 10), i % 2 ? '#ac606f' : '#c17c87', side * (i * 0.05 - 0.1), 0.86, (i % 2) * 0.02);
    part(a, box(0.23, 0.025, 0.065), '#ddbc75', 0, 0.78, 0.03);
    return a;
  });
  label(g, '별나래반  작은 발표회', 1.38, 0.16, 0, 1.4, -0.437, CREAM, '#8f5c67');
  for (let i = 0; i < 7; i++) {
    const x = -0.7 + i * 0.235, y = 1.23 - Math.sin(i / 6 * Math.PI) * 0.09;
    part(g, cyl(0.066, 0.066, 0.008, 3), COLORS[i % 5], x, y, -0.44, { rx: Math.PI / 2, rz: Math.PI, outline: false });
  }
  const positions = [[-0.57, -0.18], [0, -0.18], [0.57, -0.18], [-0.3, 0.26], [0.3, 0.26]];
  positions.forEach(([x, z], i) => {
    part(g, cyl(0.1, 0.1, 0.003, 20), COLORS[i], x, 0.173, z, { outline: false });
    flat(g, painted(`kg-stage-number-${i}`, 64, 64, c => { c.clearRect(0, 0, 64, 64); text(c, String(i + 1), 32, 34, 38, CREAM, 'center'); }), 0.1, 0.1, x, 0.176, z);
  });
  const lights = [-0.83, 0.83].map(x => {
    part(g, cyl(0.055, 0.055, 0.09, 14), INK, x, 0.23, 0.38, { rx: -0.5 });
    return lit(g, ball(0.036), '#776e4f', x, 0.26, 0.4);
  });
  const cueTextures = ['준비 · 하나 둘', '팔을 활짝', '머리 위로', '짝짝 · 박수', '리본을 크게', '고개 숙여 인사', '참 잘했어요', '쉿 · 들어봐요', '다시 한번', '누리과정 협의', '이번 주 놀이 목표', '관찰 내용을 나눠요', '활동 계획 기록', '함께 정한 약속'].map((s, i) => painted(`kg-stage-cue-${i}`, 320, 64, c => {
    c.fillStyle = '#fff7e6'; c.fillRect(0, 0, 320, 64); text(c, s, 160, 34, 27, INK, 'center');
  }));
  const cue = swap(g, cueTextures, 0.72, 0.144, 0, 1.05, -0.44);
  for (const x of [-0.82, 0.82]) {
    part(g, rbox(0.23, 0.15, 0.25, 0.025), GREEN, x, 0.245, 0.02);
    label(g, x < 0 ? '리본' : '악기', 0.16, 0.05, x, 0.24, 0.151, GREEN, CREAM);
  }
  const idleRibbon = ribbon(g, '#e78b91'); idleRibbon.root.position.set(-0.82, 0.4, 0.02);
  const idleTamb = tambourine(g); idleTamb.position.set(0.82, 0.34, 0.02);
  const teach = use(g, 'kgRecital'), rehearse = use(g, 'kgRehearsal'), meeting = use(g, 'kgMeeting');
  out.spots = { leadRecital: teach, recitalRehearsal: rehearse, kindergartenTeacher_curriculumMeeting: meeting, '*': teach };
  out.stand = teach.at; out.work = teach.work;
  const live = group(g); out.inUse = live;
  const children = positions.map(([x, z], i) => played(pupil(live, i, x, 0.175, z), { stage: 'child', gender: i % 2 ? 'male' : 'female' }));
  const kidRibbons = children.map((_, i) => ribbon(live, COLORS[i]));
  const kidTambs = children.map(() => tambourine(live));
  const teacherRibbon = ribbon(live, '#e78b91'), teacherTamb = tambourine(live);
  // The curriculum discussion has a colleague and an actual planning folder; no dancing class.
  const drawnColleague = pupil(live, 2, 0.48, 0, 0.85, -Math.PI / 2, false, false, true);
  drawnColleague.root.scale.setScalar(1.55);
  drawnColleague.head.scale.setScalar(0.68);
  const colleague = played(drawnColleague, { gender: 'female' });
  const folder = group(live), pen = pencil(live, '#587a98');
  part(folder, rbox(0.24, 0.012, 0.3, 0.008), GREEN, 0, 0, 0);
  flat(folder, painted('kg-curriculum', 192, 256, c => {
    c.fillStyle = CREAM; c.fillRect(0, 0, 192, 256);
    text(c, '놀이 중심 교육과정', 96, 22, 16, INK, 'center');
    ['신체 · 건강', '의사소통', '사회관계', '예술경험', '자연탐구'].forEach((s, i) => {
      c.fillStyle = COLORS[i]; c.fillRect(12, 50 + i * 36, 168, 28); text(c, s, 23, 65 + i * 36, 14, INK);
    });
  }), 0.21, 0.27, 0, 0.008, 0);
  out.away = (_o, now) => {
    const s = current([teach, rehearse, meeting], now), on = !!s, t = s ? sceneTime(s, now) : 0;
    live.visible = on;
    const m = (s?.motion ?? 'kgRecital') as K.KgMotion, b = K.kgBeat(m, t);
    const discussing = s === meeting;
    const ribbonBeat = ['ribbon', 'again'].includes(b.key), shake = b.key === 'shake';
    cue.set(!on ? 0 : discussing ? ({ open: 9, point: 10, listen: 11, write: 12, agree: 13, close: 13 }[b.key] ?? 9)
      : ({ ready: 0, count: 0, open: 1, over: 2, clap: 3, ribbon: 4, again: 8, bow: 5, praise: 6, listen: 7 }[b.key] ?? 0));
    lights.forEach(l => l.mat.color.set(on && !discussing ? '#fff0ac' : '#776e4f'));
    curtains.forEach((c, i) => c.position.x = (i ? 1 : -1) * (on ? 0.81 : 0.75));
    children.forEach((kid, i) => {
      kid.root.visible = !discussing;
      const cb = K.kgBeat(m, t - i * 0.1), w = Math.sin(t * 4.7 - i * 0.2);
      let l = v(0.15, 0.57, 0.1), r = v(-0.15, 0.57, 0.1);
      if (cb.key === 'open') { l = v(0.24, 0.84, 0.1); r = v(-0.24, 0.84, 0.1); }
      if (cb.key === 'over') { l = v(0.14, 1.28, 0.07); r = v(-0.14, 1.28, 0.07); }
      if (['clap', 'praise'].includes(cb.key)) { l = v(0.035 + 0.05 * Math.abs(w), 0.73, 0.22); r = v(-0.035 - 0.05 * Math.abs(w), 0.73, 0.22); }
      if (['ribbon', 'again'].includes(cb.key)) r = v(-0.17 + 0.1 * w, 0.85 + 0.13 * Math.cos(t * 4.7 - i * 0.2), 0.16);
      if (cb.key === 'shake') { l = v(0.06, 0.73, 0.21); r = v(-0.08, 0.75 + 0.03 * Math.sin(t * 24 + i), 0.21); }
      const p = kid.pose(l, r, ribbonBeat ? w * 0.045 : 0);
      kid.torso.rotation.x = cb.key === 'bow' ? 0.4 * Math.sin(cb.u * Math.PI) : 0;
      kid.head.rotation.x = cb.key === 'bow' ? 0.35 : -0.08;
      kidRibbons[i].root.visible = ribbonBeat && !discussing;
      kidRibbons[i].root.position.copy(childHand(kid, p.r)); kidRibbons[i].tick(t - i * 0.1, true);
      kidTambs[i].visible = shake && !discussing; kidTambs[i].position.copy(childHand(kid, p.r));
      kidTambs[i].rotation.z = 0.12 * Math.sin(t * 24 + i);
    });
    teacherRibbon.root.visible = ribbonBeat && !discussing; teacherTamb.visible = shake && !discussing;
    idleRibbon.root.visible = !teacherRibbon.root.visible; idleTamb.visible = !teacherTamb.visible;
    folder.visible = colleague.root.visible = pen.visible = discussing;
    if (s) {
      const h = hands(s, t);
      put(teacherRibbon.root, h.r); teacherRibbon.tick(t, true); put(teacherTamb, h.r);
      put(folder, h.l); folder.position.x += 0.07; folder.rotation.set(-0.3, Math.PI / 2, 0);
      put(pen, h.r); pen.visible = discussing && b.key === 'write';
    }
    if (discussing) {
      colleague.pose(v(0.13, 0.65, 0.15), b.key === 'listen' ? v(-0.2, 0.84, 0.24) : v(-0.13, 0.65, 0.15));
      colleague.head.rotation.x = 0.06 * Math.sin(t * 3);
    }
  };
}

function weatherTexture(index: number) {
  return painted(`kg-weather-${index}`, 128, 144, c => {
    c.fillStyle = '#fff9e9'; c.fillRect(0, 0, 128, 144);
    c.fillStyle = '#f0be48'; c.beginPath(); c.arc(64, 49, 22, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4; c.strokeStyle = '#e0a93d'; c.lineWidth = 4;
      c.beginPath(); c.moveTo(64 + Math.cos(a) * 28, 49 + Math.sin(a) * 28); c.lineTo(64 + Math.cos(a) * 35, 49 + Math.sin(a) * 35); c.stroke();
    }
    if (index > 0) {
      c.fillStyle = '#c3d7e3';
      for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(42 + i * 24, 64 - (i % 2) * 10, 20, 0, Math.PI * 2); c.fill(); }
    }
    if (index === 2) for (let i = 0; i < 3; i++) { c.strokeStyle = '#6b98b5'; c.lineWidth = 4; c.beginPath(); c.moveTo(42 + i * 22, 88); c.lineTo(35 + i * 22, 100); c.stroke(); }
    text(c, ['맑음', '구름', '비'][index], 64, 122, 23, INK, 'center');
  });
}
function nuriBoard(g: THREE.Group, out: Built) {
  const z = board(g, '별나래반 · 오늘의 하루');
  label(g, '오늘은', 0.28, 0.08, -0.62, 1.28, z, CREAM, INK);
  const days = [27, 28, 29].map((n, i) => painted(`kg-date-${i}`, 320, 72, c => {
    c.fillStyle = CREAM; c.fillRect(0, 0, 320, 72); text(c, `10월 ${n}일 ${['화', '수', '목'][i]}요일`, 160, 38, 32, INK, 'center');
  }));
  const date = swap(g, days, 0.88, 0.19, -0.05, 1.26, z + 0.003);
  label(g, '날씨 도우미', 0.32, 0.065, 0.52, 1.12, z, CREAM, INK);
  part(g, rbox(0.32, 0.29, 0.015, 0.012), '#dfd9bf', 0.52, 0.91, z + 0.004);
  const weather = swap(g, [0, 1, 2].map(weatherTexture), 0.25, 0.28, 0.52, 0.91, z + 0.014);
  const cards = [0, 1, 2].map(i => {
    const a = picture(g, weatherTexture(i), 0.13, 0.145, -0.22 + i * 0.18, 0.75, z + 0.06);
    part(g, box(0.15, 0.04, 0.028), GREEN, -0.22 + i * 0.18, 0.68, z + 0.06); return a;
  });
  ['인사 · 이야기', '탐구 · 바깥놀이', '점심 · 안전 약속'].forEach((s, i) => {
    label(g, s, 0.82, 0.09, -0.28, 1.07 - i * 0.115, z + 0.002, COLORS[i], INK);
    part(g, cyl(0.018, 0.018, 0.01, 12), CREAM, -0.73, 1.07 - i * 0.115, z + 0.006, { rx: Math.PI / 2 });
  });
  const arrow = part(g, cyl(0.026, 0.026, 0.006, 3), '#df8c76', -0.78, 1.07, z + 0.01, { rx: Math.PI / 2, rz: -Math.PI / 2 });
  // A small date card actually slides under the teacher's fingers.
  const dateTile = label(g, '28', 0.1, 0.09, -0.28, 1.22, z + 0.014, '#fff0b4', INK);
  const s = use(g, 'kgBoard'); out.spots = { kgMorningCircle: s, '*': s }; out.work = s.work;
  const live = group(g); out.inUse = live;
  const children = [-0.65, 0, 0.65].map((x, i) => {
    cushion(g, x, 1.02, COLORS[i]); return pupil(live, i, x, 0.04, 1.02, Math.PI, true);
  });
  // The three on cushions sit cross-legged, which a body can't yet (vroidFigure has no crossed legs): they stay drawn.
  const helper = played(pupil(live, 3, 0.5, 0, 0.02, Math.PI), { stage: 'child', gender: 'male' });
  const heldCard = picture(live, weatherTexture(0), 0.17, 0.19, 0, 0, 0);
  out.away = (_o, now) => {
    const on = active(s, now), t = on ? sceneTime(s, now) : 0, b = K.kgBeat('kgBoard', t), which = (b.n + 1) % 3;
    live.visible = on;
    date.set(on && b.i > 1 ? which : 0);
    weather.set(on && b.i >= 3 ? which : 0);
    arrow.position.y = on && b.key === 'plan' ? 1.07 - Math.min(2, Math.floor(b.u * 3)) * 0.115 : 1.07;
    if (on && b.key === 'date') put(dateTile, hands(s, t).r); else dateTile.position.set(-0.15, 1.22, z + 0.014);
    const changing = on && ['choose', 'weather'].includes(b.key);
    helper.root.visible = changing;
    children.forEach((kid, i) => {
      const answer = b.key === 'answer' && i === which;
      kid.pose(v(0.13, 0.22, 0.16), answer ? v(-0.14, 0.7, 0.06) : v(-0.13, 0.22, 0.16));
      kid.head.rotation.x = -0.18;
    });
    // The helper takes a weather card, lifts it, then presses it on the lower magnetic square.
    const lift = b.key === 'choose' ? K.sm(b.u) * 0.4 : b.key === 'weather' ? K.mix(0.4, 1, K.sm(b.u, 0.05, 0.75)) : 0;
    const hp = helper.pose(v(0.13, 0.63, 0.13), v(-0.05, K.mix(0.69, 0.92, lift), K.mix(0.18, 0.34, lift)));
    helper.head.rotation.x = -0.08;
    heldCard.visible = changing && !(b.key === 'weather' && b.u > 0.75);
    heldCard.position.copy(childHand(helper, hp.r)); heldCard.rotation.y = 0;
    (heldCard.material as THREE.MeshBasicMaterial).map = weatherTexture(which);
    weather.mesh.visible = !changing || (b.key === 'weather' && b.u > 0.75);
    cards.forEach((c, i) => c.visible = !(changing && i === which));
  };
}

function sprout(g: THREE.Object3D, x: number, y: number, z: number, height: number) {
  const a = group(g, x, y, z);
  part(a, cyl(0.06, 0.043, 0.1, 16), '#c38464', 0, 0.05, 0);
  part(a, ring(0.058, 0.006), '#e2a27e', 0, 0.102, 0, { rx: Math.PI / 2 });
  part(a, cyl(0.051, 0.051, 0.006, 16), '#5d4832', 0, 0.101, 0, { outline: false });
  rod(a, v(0, 0.1, 0), v(0, 0.1 + height, 0), 0.004, '#719650');
  for (const sx of [-1, 1]) {
    const leaf = part(a, ball(0.033), '#81ab5e', sx * 0.024, height + 0.08, 0, { rz: sx * 0.4 });
    leaf.scale.set(1.25, 0.24, 0.65);
  }
  return a;
}
function natureDesk(g: THREE.Group, out: Built) {
  const frame = group(g, 0, 0, -0.05); legs(frame, 1.74, 0.51, 0.69);
  part(frame, rbox(1.92, 0.06, 0.7, 0.03), WOOD, 0, 0.71, 0);
  part(frame, rbox(1.78, 0.025, 0.51, 0.018), '#f2e8d0', 0, 0.19, -0.02);
  for (let i = 0; i < 3; i++) {
    part(frame, rbox(0.45, 0.12, 0.35, 0.025), COLORS[i + 1], -0.56 + i * 0.56, 0.26, -0.02);
    label(frame, ['관찰 도구', '씨앗 · 열매', '기록 종이'][i], 0.32, 0.055, -0.56 + i * 0.56, 0.27, 0.16, CREAM, INK);
  }
  label(g, '자연 탐구  ·  어제와 무엇이 다를까?', 1.45, 0.11, 0, 0.62, 0.31, GREEN, CREAM);
  // A low freestanding display, readable from the camera without enclosing the children.
  for (const x of [-0.89, 0.89]) part(g, cyl(0.012, 0.012, 0.65, 8), EDGE, x, 0.96, -0.31);
  part(g, rbox(1.82, 0.24, 0.018, 0.012), CREAM, 0, 1.28, -0.32);
  label(g, '씨앗 → 싹 → 잎   /   보고 · 만지고 · 그려요', 1.68, 0.13, 0, 1.29, -0.309, CREAM, INK);
  for (let i = 0; i < 3; i++) {
    sprout(g, -0.65 + i * 0.19, 0.742, -0.02, 0.04 + i * 0.045);
    label(g, ['1일', '3일', '5일'][i], 0.08, 0.035, -0.65 + i * 0.19, 0.785, 0.042, CREAM, INK);
    const tag = part(g, box(0.016, 0.15, 0.004), CREAM, -0.65 + i * 0.19, 0.88, -0.055, { rz: 0.1 });
    void tag;
  }
  const tank = group(g, 0.62, 0.755, -0.13);
  part(tank, rbox(0.39, 0.025, 0.28, 0.015), GREEN, 0, 0, 0);
  part(tank, box(0.36, 0.025, 0.25), '#b99b6b', 0, 0.024, 0);
  const pane = new THREE.MeshToonMaterial({ color: '#d9f3e9', transparent: true, opacity: 0.18, depthWrite: false });
  part(tank, box(0.37, 0.23, 0.26), '#ffffff', 0, 0.14, 0, { material: pane, outline: false }).userData.ownMaterial = true;
  for (const x of [-0.19, 0.19]) for (const z of [-0.13, 0.13]) part(tank, box(0.008, 0.26, 0.008), GREEN, x, 0.13, z);
  part(tank, rbox(0.4, 0.025, 0.29, 0.012), GREEN, 0, 0.27, 0);
  for (let i = 0; i < 8; i++) part(tank, box(0.013, 0.003, 0.19), INK, -0.15 + i * 0.043, 0.284, 0, { outline: false });
  part(tank, ring(0.065, 0.008, Math.PI), GREEN, 0, 0.285, 0);
  rod(tank, v(-0.13, 0.04, -0.04), v(0.12, 0.14, 0.06), 0.013, EDGE);
  const beetle = group(tank, -0.02, 0.075, 0.03);
  part(beetle, ball(0.025), '#556c42', 0, 0, 0).scale.set(0.8, 0.6, 1.3);
  part(beetle, ball(0.014), INK, 0, 0, 0.029);
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) rod(beetle, v(0, 0, -0.015 + i * 0.018), v(side * 0.035, -0.014, -0.025 + i * 0.023), 0.002, INK);
  label(tank, '관찰 뒤 제자리로', 0.32, 0.045, 0, 0.04, 0.146, CREAM, INK);
  const sheetTextures = [0, 1, 2, 3, 4].map(k => painted(`kg-observation-${k}`, 240, 180, c => {
    c.fillStyle = CREAM; c.fillRect(0, 0, 240, 180);
    text(c, '오늘의 새싹 관찰', 120, 19, 19, INK, 'center');
    c.strokeStyle = '#c4c8ad'; c.strokeRect(12, 37, 132, 128);
    text(c, '잎: 2장', 157, 61, 14, INK); text(c, '키: 5cm', 157, 90, 14, INK);
    if (k > 0) { c.strokeStyle = GREEN; c.lineWidth = 5; c.beginPath(); c.moveTo(77, 151); c.lineTo(77, 142 - k * 19); c.stroke(); }
    if (k > 1) { c.fillStyle = '#89ac64'; c.beginPath(); c.ellipse(61, 93, 22, 10, 0.5, 0, Math.PI * 2); c.fill(); }
    if (k > 2) { c.beginPath(); c.ellipse(94, 80, 22, 10, -0.5, 0, Math.PI * 2); c.fill(); }
    if (k > 3) { c.strokeStyle = '#a2774b'; c.lineWidth = 3; c.strokeRect(54, 133, 48, 24); }
  }));
  const sheet = swap(g, sheetTextures, 0.3, 0.225, 0.02, 0.746, 0.13); sheet.mesh.rotation.x = -Math.PI / 2;
  const pencilRest = pencil(g, '#dfb44a'); pencilRest.position.set(0.24, 0.76, 0.12); pencilRest.rotation.z = Math.PI / 2;
  const glass = magnifier(g), idleGlass = magnifier(g); put(idleGlass, K.NATURE.glass); idleGlass.rotation.x = -Math.PI / 2;
  const can = group(g); put(can, K.NATURE.can);
  part(can, cyl(0.055, 0.06, 0.12, 16), '#8ca5ce', 0, -0.03, 0);
  part(can, ring(0.055, 0.009), '#718db7', 0.055, -0.015, 0, { ry: Math.PI / 2 });
  rod(can, v(-0.04, -0.04, 0), v(-0.13, 0.02, 0), 0.012, '#8ca5ce');
  part(can, cyl(0.022, 0.012, 0.025, 12), '#8ca5ce', -0.14, 0.025, 0, { rz: -0.8 });
  const s = use(g, 'kgNature'); out.spots = { kgObserveNature: s, '*': s }; out.work = s.work;
  const live = group(g); out.inUse = live;
  const children = [-0.53, 0.02, 0.57].map((x, i) => played(pupil(live, i, x, 0, -0.64), { stage: 'child', gender: i === 1 ? 'female' : 'male' }));
  const childGlass = magnifier(live), pen = pencil(live, '#dfb44a');
  const drops = Array.from({ length: 9 }, () => part(live, ball(0.006), '#9ac7df', 0, 0, 0, { outline: false }));
  out.away = (_o, now) => {
    const on = active(s, now), t = on ? sceneTime(s, now) : 0, n = K.natureNow(t), h = hands(s, t);
    live.visible = on; glass.visible = on && n.teacherGlass;
    idleGlass.visible = !on; childGlass.visible = on && n.childGlass;
    if (glass.visible) { put(glass, h.r); glass.rotation.x = -0.4; }
    pen.visible = on && n.b.key === 'draw'; pencilRest.visible = !pen.visible;
    if (pen.visible) put(pen, h.r);
    if (on && n.b.key === 'water') { put(can, h.r); can.rotation.z = n.water ? 0.7 : 0; }
    else { put(can, K.NATURE.can); can.rotation.z = 0; }
    sheet.set(on ? Math.floor(n.drawn * 4) : 0);
    children.forEach((kid, i) => {
      const look = i === 1 && n.childGlass;
      kid.root.position.z = i === 1 && (n.childGlass || n.b.key === 'share') ? -0.52 : -0.64;
      const p = kid.pose(v(0.13, 0.74, 0.22), look ? v(-0.08, 0.86, 0.32) : v(-0.12, 0.76, 0.26));
      kid.head.rotation.x = look ? 0.25 : n.b.key === 'compare' ? -0.13 : 0.15;
      if (i === 1) { childGlass.position.copy(childHand(kid, p.r)); childGlass.rotation.x = 0.45; }
    });
    beetle.position.x = -0.02 + 0.04 * Math.sin(t * 0.5);
    drops.forEach((p, i) => {
      const u = (t * 2 + i / drops.length) % 1;
      p.visible = on && n.water; p.position.set(-0.27 + 0.012 * Math.sin(i * 3), 0.96 - u * 0.12, 0.06);
    });
  };
}

/** A play road with a waiting kerb, pedestrian lamps, stop button, model car and footsteps.
 * The children never cross on red: look both ways, hand up, cross, celebrate, return on green. */
function safetyCorner(g: THREE.Group, out: Built) {
  const z = board(g, '안전 약속 · 멈추고 살펴요', -0.9);
  label(g, '① 멈춰요   ② 좌우를 봐요   ③ 손을 들어요', 1.58, 0.14, 0, 1.22, z, CREAM, INK);
  label(g, '초록불에도 차가 멈춘 뒤 건너요', 1.45, 0.1, 0, 1.01, z, CREAM, INK);
  part(g, rbox(1.83, 0.03, 1.35, 0.04), '#63767b', 0, 0.018, 0.18);
  for (let i = 0; i < 6; i++) part(g, box(1.07, 0.004, 0.105), CREAM, 0.14, 0.036, -0.35 + i * 0.21, { outline: false });
  for (const zz of [-0.51, 0.9]) part(g, rbox(1.84, 0.06, 0.14, 0.015), '#d7caa8', 0, 0.03, zz);
  part(g, box(1.08, 0.004, 0.025), '#edc459', 0.14, 0.037, -0.44, { outline: false });
  flat(g, painted('kg-wait-line', 256, 64, c => {
    c.fillStyle = '#d7caa8'; c.fillRect(0, 0, 256, 64); text(c, '여기서 기다려요', 128, 34, 26, INK, 'center');
  }), 0.82, 0.14, 0.15, 0.063, -0.52);
  const poleX = 0.81;
  part(g, cyl(0.08, 0.1, 0.05, 14), INK, poleX, 0.025, -0.49);
  part(g, cyl(0.018, 0.018, 0.83, 10), INK, poleX, 0.45, -0.49);
  part(g, rbox(0.18, 0.32, 0.12, 0.025), INK, poleX, 0.94, -0.49);
  const red = lit(g, cyl(0.054, 0.054, 0.01, 18), '#ef6558', poleX, 1.015, -0.424);
  const green = lit(g, cyl(0.054, 0.054, 0.01, 18), '#274b3c', poleX, 0.87, -0.424);
  red.mesh.rotation.x = green.mesh.rotation.x = Math.PI / 2;
  for (const yy of [1.015, 0.87]) {
    part(g, ball(0.011), CREAM, poleX, yy + 0.023, -0.414, { outline: false });
    part(g, box(0.015, 0.034, 0.004), CREAM, poleX, yy - 0.002, -0.413, { outline: false });
    for (const sx of [-1, 1]) part(g, box(0.008, 0.022, 0.004), CREAM, poleX + sx * 0.008, yy - 0.027, -0.413, { rz: sx * 0.2, outline: false });
  }
  part(g, rbox(0.075, 0.1, 0.05, 0.012), '#d8b75a', poleX, 0.59, -0.46);
  part(g, cyl(0.02, 0.02, 0.008, 12), '#dc705d', poleX, 0.59, -0.429, { rx: Math.PI / 2 });
  const car = toyCar(g, '#d99b66'); car.position.set(-0.62, 0.12, -0.1); car.scale.setScalar(1.7); car.rotation.y = Math.PI / 2;
  label(g, '정지', 0.21, 0.09, -0.65, 0.32, -0.15, '#c66c61', CREAM);
  const s = use(g, 'kgSafety'); out.spots = { kgPracticeSafety: s, '*': s }; out.work = s.work;
  const live = group(g); out.inUse = live;
  const children = [-0.28, 0.14, 0.56].map((x, i) => played(pupil(live, i, x, 0.04, -0.48), { stage: 'child', gender: i === 1 ? 'male' : 'female' }));
  out.away = (_o, now) => {
    const on = active(s, now), t = on ? sceneTime(s, now) : 0, n = K.safetyNow(t); live.visible = on;
    red.mat.color.set(on && n.go ? '#653e39' : '#ff6959'); green.mat.color.set(on && n.go ? '#65ed9c' : '#274b3c');
    children.forEach((kid, i) => {
      const u = n.crossing ? K.sm(n.b.u, i * 0.06, 0.9 + i * 0.04) : n.travel;
      const travel = n.b.key === 'return' ? 1 - u : u;
      kid.root.position.z = -0.48 + 1.28 * travel;
      kid.root.rotation.y = n.b.key === 'return' ? Math.PI : 0;
      kid.head.rotation.y = n.b.key === 'left' ? 0.65 : n.b.key === 'right' ? -0.65 : 0;
      const raised = ['raise', 'cross', 'return'].includes(n.b.key);
      const clap = n.b.key === 'praise', w = Math.abs(Math.sin(t * 6));
      kid.pose(clap ? v(0.04 + 0.04 * w, 0.73, 0.2) : v(0.15, 0.55, 0.08), raised ? v(-0.12, 1.28, 0.06) : clap ? v(-0.04 - 0.04 * w, 0.73, 0.2) : v(-0.15, 0.55, 0.08), n.crossing ? Math.sin(t * 9 + i) * 0.065 : 0);
    });
  };
}

function cubbies(g: THREE.Group) {
  const z = -0.2;
  part(g, rbox(1.92, 0.89, 0.045, 0.012), WOOD, 0, 0.49, z - 0.21);
  for (const y of [0.07, 0.39, 0.94]) part(g, rbox(1.96, 0.045, 0.46, 0.015), WOOD, 0, y, z);
  for (let i = 0; i <= 4; i++) part(g, box(0.025, 0.84, 0.46), WOOD, -0.96 + i * 0.48, 0.51, z);
  ['하늘', '다온', '소율', '이든'].forEach((name, i) => {
    const x = -0.72 + i * 0.48;
    part(g, box(0.44, 0.5, 0.008), COLORS[i], x, 0.66, z - 0.183, { outline: false });
    label(g, name, 0.3, 0.075, x, 0.94, z + 0.235, COLORS[i], INK);
    part(g, cyl(0.008, 0.008, 0.08, 8), '#ad986d', x, 0.83, z - 0.14, { rx: Math.PI / 2 });
    const bag = group(g, x, 0.6, z - 0.05);
    part(bag, rbox(0.25, 0.3, 0.13, 0.055), COLORS[i], 0, 0, 0);
    part(bag, rbox(0.2, 0.11, 0.04, 0.018), CREAM, 0, -0.06, 0.08);
    part(bag, ring(0.043, 0.009), EDGE, 0, 0.17, 0);
    for (const sx of [-1, 1]) {
      part(bag, rbox(0.025, 0.24, 0.022, 0.01), EDGE, sx * 0.075, 0, -0.08);
      part(g, rbox(0.09, 0.055, 0.18, 0.026), '#fffdf4', x + sx * 0.062, 0.12, z + 0.04);
      part(g, rbox(0.065, 0.018, 0.07, 0.008), COLORS[i], x + sx * 0.062, 0.153, z + 0.055);
    }
    part(g, cyl(0.025, 0.027, 0.12, 12), COLORS[(i + 1) % 5], x + 0.17, 0.47, z + 0.08);
    part(g, cyl(0.02, 0.02, 0.025, 12), CREAM, x + 0.17, 0.54, z + 0.08);
  });
  label(g, '내 물건은 내가 정리해요', 1.58, 0.11, 0, 1.08, z - 0.18, CREAM, INK);
  part(g, rbox(1.1, 0.025, 0.28, 0.03), '#a8c5b5', 0, 0.015, 0.2);
  for (const x of [-0.3, 0.3]) for (const sx of [-1, 1]) part(g, rbox(0.07, 0.002, 0.14, 0.03), CREAM, x + sx * 0.06, 0.029, 0.2, { ry: sx * 0.1, outline: false });
}

function scoreTexture(page: number, written = false) {
  return painted(`kg-score-${page}-${written}`, 512, 512, ctx => {
    ctx.fillStyle = '#fffcef'; ctx.fillRect(0, 0, 512, 512);
    text(ctx, written ? '작은 멜로디' : ['아침의 노래', '걸음 맞추기', '우리의 합주'][page % 3], 256, 44, 30, INK, 'center');
    ctx.strokeStyle = '#7f8178'; ctx.lineWidth = 2;
    for (let row = 0; row < 3; row++) {
      const y = 105 + row * 118;
      for (let j = 0; j < 5; j++) { ctx.beginPath(); ctx.moveTo(35, y + j * 12); ctx.lineTo(477, y + j * 12); ctx.stroke(); }
      for (let j = 0; j < (written ? row === 2 ? 3 : 7 : 8); j++) {
        const nx = 65 + j * 51, ny = y + ((j * 3 + row + page) % 7) * 6;
        ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(nx, ny, 7, 5, -0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(nx + 5, ny - 33, 2, 33);
        if (j % 3 === 0) { ctx.beginPath(); ctx.moveTo(nx + 7, ny - 33); ctx.lineTo(nx + 17, ny - 24); ctx.stroke(); }
      }
    }
    text(ctx, `${page + 1}`, 256, 484, 20, '#798079', 'center');
  });
}

/** Domestic upright with moving fallboard, individual keys, brass pedals, duet bench and score. */
function piano(g: THREE.Group, out: Built, color: string) {
  const walnut = color || '#55392e', trim = '#9c7548', ivory = '#fff5db', ebony = '#292827';
  part(g, rbox(1.92, 1.22, 0.38, 0.045), walnut, 0, 0.66, -0.25);
  part(g, rbox(1.96, 0.055, 0.43, 0.02), walnut, 0, 1.3, -0.25);
  part(g, box(1.7, 0.012, 0.36), trim, 0, 1.267, -0.25);
  for (const x of [-0.86, 0.86]) {
    part(g, rbox(0.115, 0.75, 0.42, 0.022), walnut, x, 0.43, -0.06);
    part(g, rbox(0.16, 0.06, 0.58, 0.02), walnut, x, 0.065, -0.035);
    part(g, cyl(0.032, 0.032, 0.055, 14), '#8e7952', x, 0.035, 0.15, { rz: Math.PI / 2 });
  }
  part(g, rbox(1.63, 0.48, 0.035, 0.015), '#634636', 0, 0.39, -0.045);
  for (const x of [-0.76, 0.76]) part(g, box(0.009, 0.43, 0.008), trim, x, 0.39, -0.023, { outline: false });
  part(g, box(1.52, 0.009, 0.008), trim, 0, 0.59, -0.023, { outline: false });
  part(g, rbox(1.79, 0.07, 0.34, 0.016), walnut, 0, 0.73, 0.09);
  const keys: { mesh: THREE.Mesh; x: number; y: number }[] = [];
  for (let i = 0; i < 52; i++) {
    const x = (i - 25.5) * 0.0305;
    keys.push({ mesh: part(g, box(0.0285, 0.025, 0.245), ivory, x, 0.779, 0.105, { outline: false }), x, y: 0.779 });
    if (![2, 6].includes(i % 7) && i < 51) keys.push({
      mesh: part(g, rbox(0.018, 0.031, 0.143, 0.003), ebony, x + 0.01525, 0.806, 0.055, { outline: false }), x: x + 0.01525, y: 0.806,
    });
  }
  const fallboard = group(g, ...K.PIANO.hinge);
  part(fallboard, rbox(1.67, 0.028, 0.27, 0.009), walnut, 0, 0, 0.135);
  part(fallboard, rbox(0.16, 0.015, 0.022, 0.006), trim, 0, 0.022, 0.25);
  part(g, rbox(0.75, 0.025, 0.11, 0.007), walnut, 0, 0.97, 0);
  const score = group(g, 0, 1.105, 0.075); score.rotation.x = -0.14;
  picture(score, scoreTexture(0), 0.255, 0.265, -0.132, 0, 0);
  const scoreRight = swap(score, [scoreTexture(1), scoreTexture(2)], 0.255, 0.265, 0.132, 0, 0.002);
  const page = group(score); picture(page, scoreTexture(1), 0.255, 0.265, 0.132, 0, 0.006);
  const pedals = [-0.13, 0, 0.13].map(x => {
    const p = group(g, x, 0.085, 0.05);
    part(p, rbox(0.055, 0.025, 0.19, 0.016), '#bca466', 0, 0, 0.075); return p;
  });
  const bench = group(g, 0, 0, 0.68); legs(bench, 1.02, 0.28, 0.43, walnut);
  part(bench, rbox(1.18, 0.08, 0.39, 0.035), '#594c46', 0, 0.46, 0);
  for (const x of [-0.4, -0.2, 0, 0.2, 0.4]) part(bench, ball(0.009), '#7f6b5e', x, 0.503, 0, { outline: false }).scale.y = 0.3;
  for (const sx of [-1, 1]) part(bench, cyl(0.026, 0.026, 0.045, 12), trim, sx * 0.6, 0.39, 0, { rz: Math.PI / 2 });
  const restingNotebook = group(g, ...K.PIANO.notebook);
  part(restingNotebook, rbox(0.18, 0.018, 0.13, 0.004), '#879e90', 0, 0, 0);
  part(restingNotebook, box(0.16, 0.012, 0.12), CREAM, 0.008, 0.01, 0);
  const sparePencil = pencil(restingNotebook, '#c79a50'); sparePencil.rotation.z = Math.PI / 2; sparePencil.position.y = 0.026;
  const motions: [string, K.KgMotion][] = [
    ['playPiano', 'kgPiano'], ['giveLesson', 'kgLesson'], ['competitionLesson', 'kgCompetition'],
    ['musicTeacher_practiceAccompany', 'kgAccompany'], ['entertainer_composeJingle', 'kgCompose'], ['playViolin', 'kgViolin'],
  ];
  const spots = motions.map(([, m]) => use(g, m, m !== 'kgViolin'));
  out.spots = Object.fromEntries(motions.map(([id], i) => [id, spots[i]])); out.spots['*'] = spots[0];
  const live = group(g); out.inUse = live;
  // On the bench (its top 0.5 up), the feet not reaching the floor; she faces the keys, so her left is the lower x.
  const student = played(pupil(live, 1, 0.39, 0.48, 0.59, Math.PI, false, true), {
    stage: 'child',
    gender: 'female',
    seat: 0.023,
    floor: -0.48,
    legs: () => ({ l: v(0.32, 0.23, 0.33), r: v(0.46, 0.23, 0.33) }),
  });
  const book = group(live); part(book, rbox(0.23, 0.012, 0.17, 0.004), '#879e90', 0, -0.01, 0);
  flat(book, scoreTexture(0, true), 0.21, 0.15, 0, 0, 0);
  const pen = pencil(live, '#c79a50');
  // A real neck in the left fingers and a separate horsehair bow in the right.
  // Kept in the shared upright so the optional violin spot works in any lot.
  const violin = group(live);
  for (const [x, radius] of [[-0.18, 0.09], [-0.31, 0.105]]) {
    part(violin, ball(radius), '#a85f2f', x, 0, -0.06).scale.set(1, 0.26, 0.9);
    part(violin, ball(radius * 0.93), '#d18b44', x, 0.018, -0.06, { outline: false }).scale.set(1, 0.13, 0.88);
  }
  part(violin, rbox(0.24, 0.026, 0.034, 0.006), '#553528', -0.07, 0.025, -0.06);
  part(violin, rbox(0.22, 0.012, 0.026, 0.003), '#302c28', -0.1, 0.044, -0.06);
  part(violin, rbox(0.014, 0.035, 0.06, 0.004), '#f2d3a0', -0.24, 0.035, -0.06);
  part(violin, ball(0.027), '#a85f2f', 0.065, 0.025, -0.06);
  for (const z of [-0.072, -0.064, -0.056, -0.048]) part(violin, box(0.37, 0.0018, 0.0018), '#eee1c0', -0.14, 0.054, z, { outline: false });
  for (const x of [0.02, 0.05]) for (const z of [-0.09, -0.03]) part(violin, ball(0.01), '#302c28', x, 0.028, z);
  for (const z of [-0.12, 0]) part(violin, rbox(0.055, 0.003, 0.008, 0.003), '#493324', -0.25, 0.034, z);
  const bow = group(live);
  part(bow, rbox(0.64, 0.007, 0.008, 0.003), '#895533', 0.3, 0.016, 0);
  part(bow, box(0.59, 0.003, 0.008), '#f5e7c5', 0.3, 0, 0, { outline: false });
  part(bow, rbox(0.035, 0.02, 0.018, 0.003), '#332d2a', 0, 0.006, 0);
  part(bow, box(0.01, 0.02, 0.009), '#a87a4c', 0.61, 0.008, 0);
  const tempo = lit(g, ball(0.012), '#d6bc77', 0.72, 0.86, -0.02); out.screen = tempo.mesh;
  out.away = (_o, now) => {
    const s = current(spots, now), m = s?.motion as K.KgMotion | undefined, t = s ? sceneTime(s, now) : 0;
    const state = K.pianoNow(m && K.isPiano(m) ? m : 'kgPiano', t);
    const on = !!s && m !== 'kgViolin', open = on ? state.open : 0;
    fallboard.rotation.x = -open * 1.48;
    score.visible = on; page.visible = on && state.b.key === 'page'; page.rotation.y = -state.page * Math.PI;
    scoreRight.set(state.b.i > 3 ? 1 : 0); student.root.visible = on && K.isLesson(m!); live.visible = !!s;
    const h = s ? hands(s, t) : null;
    violin.visible = bow.visible = m === 'kgViolin';
    if (m === 'kgViolin' && h) {
      put(violin, h.l); put(bow, h.r);
      bow.rotation.y = ['upbow', 'downbow', 'phrase'].includes(K.kgBeat(m, t).key) ? 0.9 : -Math.PI / 2;
    }
    keys.forEach((key, i) => {
      const hand = h && state.playing && Math.min(Math.abs(h.l[0] - key.x), Math.abs(h.r[0] - key.x)) < 0.065;
      const child = student.root.visible && state.pupil && Math.abs(key.x - (0.39 + 0.11 * Math.sin(t * 5 + i % 2))) < 0.055;
      key.mesh.position.y = key.y - (on && (hand || child) && Math.sin(t * 14 + i) > -0.2 ? 0.009 : 0);
    });
    pedals[2].rotation.x = on ? state.pedal * 0.16 : 0;
    tempo.mat.color.set(on && state.playing && Math.sin(t * 4) > 0 ? '#efcd77' : '#756c52');
    if (student.root.visible) {
      const p = state.pupil;
      student.pose(v(0.11, p ? 0.32 : 0.09, p ? 0.37 : 0.15), v(-0.1, p ? 0.32 + 0.012 * Math.sin(t * 12) : 0.09, p ? 0.37 : 0.15));
      student.head.rotation.y = ['point', 'correct', 'praise'].includes(state.b.key) ? 0.4 : 0;
      student.head.rotation.x = p ? 0.2 + 0.04 * Math.sin(t * 2) : 0.02;
    }
    const writing = on && m === 'kgCompose' && state.writing;
    book.visible = pen.visible = writing; restingNotebook.visible = !writing;
    if (writing && h) { put(book, h.l); put(pen, h.r); book.rotation.z = 0.06; }
  };
}

function toyCar(g: THREE.Object3D, color: string) {
  const a = group(g);
  part(a, rbox(0.17, 0.055, 0.095, 0.022), color, 0, 0.045, 0);
  part(a, rbox(0.08, 0.045, 0.075, 0.02), color, -0.012, 0.088, 0);
  for (const z of [-0.039, 0.039]) part(a, rbox(0.055, 0.027, 0.003, 0.005), '#d9efea', -0.01, 0.09, z, { outline: false });
  for (const x of [-0.052, 0.052]) for (const z of [-0.049, 0.049]) {
    part(a, cyl(0.024, 0.024, 0.015, 12), '#515b61', x, 0.026, z, { rx: Math.PI / 2 });
    part(a, cyl(0.011, 0.011, 0.017, 10), CREAM, x, 0.026, z, { rx: Math.PI / 2, outline: false });
  }
  for (const z of [-0.027, 0.027]) part(a, ball(0.009), '#fff0b2', 0.083, 0.051, z, { outline: false });
  return a;
}
function teddy(g: THREE.Object3D) {
  const a = group(g);
  part(a, ball(0.075), '#c7a276', 0, 0.09, 0);
  part(a, ball(0.061), '#c7a276', 0, 0.19, 0);
  for (const s of [-1, 1]) {
    part(a, ball(0.025), '#b18c65', s * 0.047, 0.23, 0);
    part(a, ball(0.035), '#b18c65', s * 0.065, 0.1, 0);
    part(a, ball(0.036), '#b18c65', s * 0.044, 0.035, 0.035);
    part(a, ball(0.007), INK, s * 0.02, 0.195, 0.056, { outline: false });
  }
  part(a, ball(0.025), CREAM, 0, 0.17, 0.052); part(a, ball(0.009), INK, 0, 0.18, 0.075, { outline: false });
  part(a, rbox(0.085, 0.025, 0.02, 0.006), '#d68b78', 0, 0.135, 0.065); return a;
}

/** Hollow domestic toy chest: open, take, drive, stack, show, return, close. */
function toyBox(g: THREE.Group, out: Built, color: string) {
  const paint = color || '#d99f9e';
  part(g, rbox(0.88, 0.055, 0.57, 0.025), WOOD, 0, 0.06, -0.135);
  for (const x of [-0.41, 0.41]) part(g, rbox(0.055, 0.27, 0.56, 0.018), paint, x, 0.215, -0.135);
  for (const z of [-0.39, 0.12]) part(g, rbox(0.86, 0.27, 0.035, 0.014), paint, 0, 0.215, z);
  part(g, rbox(0.79, 0.015, 0.47, 0.01), '#f1d8b1', 0, 0.095, -0.135);
  for (const x of [-0.35, 0.35]) for (const z of [-0.33, 0.065]) part(g, ball(0.035), EDGE, x, 0.033, z);
  for (const x of [-0.25, 0.25]) part(g, rbox(0.07, 0.018, 0.05, 0.008), '#b7a57a', x, 0.36, -0.39);
  const lid = group(g, ...K.TOYS.hinge);
  part(lid, rbox(0.9, 0.04, 0.55, 0.022), paint, 0, 0, 0.275);
  part(lid, rbox(0.16, 0.025, 0.055, 0.01), CREAM, 0, 0.035, 0.52);
  flat(lid, painted('kg-toys-lid', 256, 128, ctx => {
    ctx.fillStyle = '#fff6df'; ctx.fillRect(0, 0, 256, 128); text(ctx, 'TOYS', 128, 66, 43, '#a27f68', 'center');
  }), 0.32, 0.14, 0, 0.022, 0.28);
  label(g, '놀이 후 제자리', 0.32, 0.06, 0, 0.205, 0.141, paint, '#fff9ec');
  const bear = teddy(g); bear.position.set(-0.22, 0.1, -0.17); bear.rotation.z = 0.15;
  const restingCar = toyCar(g, '#6f9eaa'); put(restingCar, K.add(K.TOYS.car, 0, -0.085));
  for (let i = 0; i < 4; i++) part(g, rbox(0.065, 0.065, 0.065, 0.008), COLORS[i], 0.25 + (i % 2) * 0.07, 0.14 + Math.floor(i / 2) * 0.065, -0.21);
  part(g, ball(0.065), '#e5bd62', -0.08, 0.16, -0.28);
  const s = use(g, 'kgToys', true); s.legs = 'cross'; out.spots = { playToys: s, '*': s };
  const live = group(g); out.inUse = live;
  part(live, rbox(0.8, 0.012, 0.53, 0.07), '#d9e3d5', 0, 0.008, 0.43);
  part(live, rbox(0.39, 0.095, 0.32, 0.05), '#a9bda4', 0, 0.06, 0.53);
  const pull = limb(g, '#efdcaf', 0.009);
  const pullLoop = part(g, ring(0.028, 0.007), '#efdcaf', 0, 0.38, 0.17);
  const car = toyCar(live, '#6f9eaa');
  const cubes = COLORS.slice(0, 3).map((c, i) => {
    const a = group(live); part(a, rbox(0.075, 0.075, 0.075, 0.008), c, 0, 0, 0);
    label(a, ['가', '나', '다'][i], 0.043, 0.043, 0, 0, 0.039, c, CREAM); return a;
  });
  out.away = (_o, now) => {
    const on = active(s, now), t = on ? sceneTime(s, now) : 0, state = K.toysNow(t), h = hands(s, t);
    live.visible = on; lid.rotation.x = -(on ? state.open : 0) * 1.55;
    const grip = on && ['open', 'close'].includes(state.b.key) ? v(...h.r) : v(0, 0.38, 0.17);
    const end = K.lidPoint((on ? state.open : 0) * 1.55, 0.52, K.TOYS.hinge);
    pull(v(...end), grip); pullLoop.position.copy(grip);
    const held = on && state.car; car.visible = held; restingCar.visible = !held;
    if (held) { put(car, K.add(h.r, 0, -0.085)); car.rotation.y = state.b.key === 'drive' ? Math.sin(state.b.u * Math.PI * 2) * 0.5 : 0; }
    cubes.forEach((a, i) => {
      a.visible = state.b.key !== 'close';
      a.position.copy(v(-0.23 - i * 0.085, 0.052, 0.27)).lerp(v(-0.17, 0.052 + i * 0.075, 0.32), state.stacked);
      if (state.b.key === 'stack' && i === 2 && state.b.u < 0.75) a.position.set(...h.r);
      if (state.b.key === 'put') put(a, K.add(h.l, 0, -0.068 + i * 0.075));
    });
  };
}

/** Words in a bubble, one sprite that changes its picture. */
function words(parent: THREE.Object3D, w: number, x: number, y: number, z: number) {
  const mat = new THREE.SpriteMaterial({ transparent: true, depthWrite: false });
  const sp = new THREE.Sprite(mat);
  sp.userData.ownMaterial = true; sp.scale.set(w, w * 0.375, 1); sp.position.set(x, y, z);
  sp.renderOrder = 5; sp.visible = false; parent.add(sp);
  let was = '';
  return { say(s: string | undefined) {
    sp.visible = !!s;
    if (s && s !== was) {
      was = s;
      mat.map = painted(`kgBubble|${s}`, 256, 96, c => {
        c.clearRect(0, 0, 256, 96); c.fillStyle = CREAM; c.strokeStyle = INK; c.lineWidth = 5;
        c.beginPath(); c.roundRect(6, 6, 244, 72, 26); c.fill(); c.stroke();
        text(c, s, 128, 44, s.length > 8 ? 24 : 31, INK, 'center');
      });
      mat.needsUpdate = true;
    }
  } };
}
const PEN_DOWN = new THREE.Vector3(0, -1, 0.25).normalize();
const PEN_LEN = 0.09;
const NO_LINE = { outline: false };

/**
 * The health desk at the door (건강 살피기 책상, new): a small table with a non-contact thermometer on its stand, a penlight, hand
 * sanitiser, the day's list on a clipboard, the medicine request tray. A child comes in, is greeted, the teacher gets down to them:
 * temperature at the forehead, a look at the throat and the hands, the list ticked, and off they go to their cubby; the next comes in.
 * Looked after by itself: the list checked through.
 */
function healthDesk(g: THREE.Group, out: Built) {
  const W = K.WELCOME;
  const dx = -0.38, dz = -0.08, top = 0.85;
  part(g, rbox(0.82, 0.04, 0.5, 0.012), WOOD, dx, top - 0.02, dz);
  legs(group(g, dx, 0, dz), 0.7, 0.4, top - 0.04);
  part(g, rbox(0.68, 0.02, 0.36, 0.008), CREAM, dx, 0.3, dz);
  label(g, '오늘의 건강 살피기', 0.6, 0.07, dx, top - 0.09, dz + 0.255, GREEN, CREAM);
  // The list.
  part(g, rbox(0.17, 0.012, 0.23, 0.004), EDGE, W.clip[0], top + 0.006, W.clip[2]);
  flat(g, painted('kg-health-list', 170, 230, c => {
    c.fillStyle = CREAM; c.fillRect(0, 0, 170, 230);
    text(c, '등원 건강 확인', 85, 18, 16, INK, 'center');
    ['체온', '목', '손'].forEach((s, i) => text(c, s, 80 + i * 30, 44, 12, INK, 'center', false));
    ['서윤', '민준', '지아', '하준', '수아', '도현'].forEach((n, i) => {
      text(c, n, 12, 68 + i * 26, 13, INK, 'left', false);
      c.fillStyle = '#c9c0a4'; c.fillRect(8, 80 + i * 26, 154, 1);
    });
  }), 0.15, 0.2, W.clip[0], top + 0.014, W.clip[2]);
  const ticks = [0, 1, 2, 3, 4, 5].map(i => part(g, box(0.05, 0.002, 0.006), '#3f9a63', W.clip[0] + 0.03, top + 0.016, W.clip[2] - 0.065 + i * 0.0226, NO_LINE));
  // The stand and the gun, the penlight, the sanitiser, the tray.
  part(g, rbox(0.1, 0.012, 0.08, 0.004), EDGE, W.gun[0], top + 0.006, W.gun[2]);
  const gun = group(g); gun.name = 'foreheadThermometer';
  part(gun, rbox(0.03, 0.09, 0.035, 0.008), '#f5f7f8', 0, -0.03, 0, NO_LINE);
  const head = group(gun, 0, 0.03, 0);
  part(head, rbox(0.04, 0.045, 0.1, 0.012), '#f5f7f8', 0, 0, -0.02, NO_LINE);
  part(head, cyl(0.012, 0.012, 0.012, 10), '#546e7a', 0, 0, -0.075, { ...NO_LINE, rx: Math.PI / 2 });
  // The little display faces whoever holds it; it lights when it's read.
  const shown = lit(head, box(0.028, 0.02, 0.004), '#37474f', 0, 0.006, 0.032);
  const reading = label(head, '36.5', 0.026, 0.016, 0, 0.006, 0.0345, '#a5e6b0', INK);
  reading.visible = false;
  const lightTool = group(g); lightTool.name = 'penlight';
  part(lightTool, cyl(0.006, 0.006, 0.09, 8), '#90a4ae', 0, 0, 0, NO_LINE);
  const glowTip = lit(lightTool, ball(0.007), '#fff6c8', 0, 0.05, 0);
  const san = group(g, -0.62, top, -0.2);
  part(san, cyl(0.03, 0.035, 0.12, 12), '#d7f0e8', 0, 0.06, 0);
  part(san, rbox(0.025, 0.012, 0.04, 0.004), GREEN, 0, 0.14, 0.01);
  label(san, '손 소독', 0.05, 0.02, 0, 0.06, 0.036, '#d7f0e8', INK);
  const tray = group(g, -0.56, top, 0.05);
  part(tray, rbox(0.2, 0.03, 0.15, 0.006), COLORS[2], 0, 0.015, 0);
  label(tray, '투약 의뢰서', 0.15, 0.03, 0, 0.022, 0.078, COLORS[2], INK);
  const pen = group(g); pen.name = 'healthPen';
  const inner = group(pen); inner.quaternion.setFromUnitVectors(v(0, -1, 0), PEN_DOWN);
  part(inner, cyl(0.005, 0.005, PEN_LEN * 0.8 + 0.05, 8), GREEN, 0, (0.05 - PEN_LEN * 0.8) / 2, 0, NO_LINE);
  part(inner, cyl(0.005, 0.0015, PEN_LEN * 0.2, 8), INK, 0, -PEN_LEN * 0.9, 0, NO_LINE);
  const s = use(g, 'kgWelcome'), log = use(g, 'kgHealthLog');
  out.spots = { xwMorningWelcome: s, kgHealthLog: log, '*': log }; out.work = s.work;
  const live = group(g); out.inUse = live;
  const kids = [0, 1, 2, 3].map(i => {
    const kid = played(pupil(live, i, W.kid[0], 0, W.kid[2]), { stage: 'child', gender: i % 2 ? 'male' : 'female' });
    return kid;
  });
  const say = words(live, 0.7, 0.62, 1.42, 0.2);
  const gunHome = () => { gun.position.set(W.gun[0], W.gun[1] + 0.02, W.gun[2]); gun.rotation.set(0, 0, 0); };
  const lightHome = () => { lightTool.position.set(W.light[0], W.light[1], W.light[2]); lightTool.rotation.set(0, 0, Math.PI / 2); };
  out.away = (_o, now) => {
    const onW = active(s, now), onL = active(log, now);
    live.visible = onW || onL;
    gunHome(); lightHome(); pen.visible = false; reading.visible = false; shown.mesh.visible = true; glowTip.mesh.visible = false;
    s.held = log.held = null;
    if (!onW && !onL) { ticks.forEach((m, i) => m.visible = i < 2); kids.forEach(k => k.root.visible = false); say.say(undefined); return; }
    if (onL) {
      const t = sceneTime(log, now), b = K.kgBeat('kgHealthLog', t), h = hands(log, t);
      kids.forEach(k => k.root.visible = false); say.say(undefined);
      ticks.forEach((m, i) => m.visible = i < 2 + b.n % 5);
      if (b.key === 'tick') {
        pen.visible = true; put(pen, h.r);
        log.held = { tool: pen, lead: 'right', grips: { right: { at: v(0, 0, 0), axis: PEN_DOWN.clone(), shape: 'pen', radius: 0.011, writes: PEN_LEN } } };
      }
      return;
    }
    const t = sceneTime(s, now), n = K.welcomeNow(t), h = hands(s, t), which = ((n.b.n % 4) + 4) % 4;
    say.say(n.say);
    ticks.forEach((m, i) => m.visible = i < which + (n.ticked ? 1 : 0) + 1);
    if (n.tool === 'gun') {
      put(gun, h.r);
      reading.visible = n.beep; shown.mesh.visible = !n.beep;
      s.held = { tool: gun, lead: 'right', grips: { right: { at: v(0, 0, 0), axis: v(0, 1, 0), shape: 'trigger', radius: 0.018 } } };
    } else if (n.tool === 'light') {
      put(lightTool, h.r); lightTool.rotation.set(1.3, 0, 0); glowTip.mesh.visible = true;
      s.held = { tool: lightTool, lead: 'right', grips: { right: { at: v(0, 0, 0), axis: v(0, 1, 0), shape: 'pen', radius: 0.008 } } };
    } else if (n.pen) {
      pen.visible = true; put(pen, h.r);
      s.held = { tool: pen, lead: 'right', grips: { right: { at: v(0, 0, 0), axis: PEN_DOWN.clone(), shape: 'pen', radius: 0.011, writes: PEN_LEN } } };
    }
    kids.forEach((kid, i) => {
      kid.root.visible = i === which;
      if (i !== which) return;
      const going = n.go > 0, walking = (n.come < 1 && n.come > 0) || going;
      const from = going ? v(...W.kid) : v(...W.from), to = going ? v(...W.off) : v(...W.kid), u = going ? n.go : n.come;
      kid.root.position.copy(from).lerp(to, u);
      kid.root.rotation.y = walking ? Math.atan2(to.x - from.x, to.z - from.z) : 0;
      const stride = walking ? 0.05 * Math.sin(now * 9) : 0;
      // Their arms: out with the palms for a look, otherwise down; the head up for the throat.
      const held = n.b.key === 'palms';
      const wavy = n.b.key === 'greet' && n.come >= 1;
      kid.pose(held ? v(0.06, 0.66, 0.2) : v(0.15, 0.53, 0.1), held ? v(-0.06, 0.66, 0.2) : wavy ? v(-0.18, 0.95 + 0.03 * Math.sin(now * 8), 0.1) : v(-0.15, 0.53, 0.1), stride);
      kid.head.rotation.x = n.b.key === 'throat' ? -0.3 : n.b.key === 'temp' ? -0.12 : n.b.key === 'palms' ? 0.25 : -0.05;
    });
  };
}

/** A child lying on their back under a little blanket, fully dressed, the head on the pillow towards -z; `shut`: eyes closed. */
function lyingChild(parent: THREE.Object3D, index: number, x: number, blanket: string) {
  const kid = pupil(parent, index, x, 0.11, 0.34);
  kid.root.scale.setScalar(0.8);
  kid.root.rotation.order = 'YXZ';
  kid.root.rotation.x = -Math.PI / 2;
  // Shut eyes: lids over the drawn eyes, a line on them.
  const skin = ['#edc4a2', '#d9a782', '#f1cfb1', '#bd8c67'][index % 4];
  for (const sx of [-1, 1]) {
    part(kid.head, ball(0.015), skin, sx * 0.036, 0.002, 0.103, NO_LINE);
    part(kid.head, box(0.024, 0.004, 0.004), INK, sx * 0.036, 0, 0.117, NO_LINE);
  }
  const cover = part(parent, rbox(0.46, 0.15, 0.64, 0.05), blanket, x, 0.14, 0.08);
  for (const s of [-1, 1]) part(cover, box(0.012, 0.006, 0.62), CREAM, s * 0.14, 0.076, 0, NO_LINE);
  part(parent, rbox(0.46, 0.02, 0.12, 0.012), CREAM, x, 0.22, -0.2);
  return { kid, cover };
}

/**
 * The rest mats (휴식 매트, new; napMats is the 어린이집's, with 낮잠 재우기 on it, and 유치원 교육과정에 낮잠이 필수는 아니다): three
 * thin mats with their pillows and folded blankets, a low lamp with a knob, a little music player. Rest time: the lamp turned down,
 * soft music on, sat on the floor beside the middle child and patting them, stroking their hair, the blanket tucked up; a finger to
 * the lips. One child asleep, one who isn't sleepy sat up with a picture book. Everyone dressed under their blankets.
 */
function restMats(g: THREE.Group, out: Built) {
  const R = K.REST;
  const mats = [-0.85, 0, 1.0];
  const tints = ['#f6c7c0', '#bfdcd2', '#f3e2a4'];
  mats.forEach((x, i) => {
    part(g, rbox(0.58, 0.04, 0.9, 0.02), tints[i], x, 0.02, -0.03);
    part(g, rbox(0.34, 0.05, 0.2, 0.025), CREAM, x, 0.065, -0.36);
    label(g, ['서윤', '민준', '지아'][i], 0.14, 0.05, x, 0.043, 0.38, CREAM, INK).rotation.x = -Math.PI / 2;
  });
  const folded = mats.map((x, i) => part(g, rbox(0.42, 0.08, 0.26, 0.03), COLORS[(i * 2 + 1) % 5], x, 0.08, 0.2));
  // The lamp and the player.
  const lamp = group(g, R.lamp[0], 0, R.lamp[2]);
  part(lamp, cyl(0.07, 0.08, 0.02, 14), EDGE, 0, 0.01, 0);
  part(lamp, cyl(0.009, 0.009, 0.3, 8), EDGE, 0, 0.16, 0, NO_LINE);
  const shade = lit(lamp, cyl(0.07, 0.1, 0.11, 16), '#ffe8a8', 0, 0.36, 0);
  part(lamp, cyl(0.018, 0.018, 0.02, 10), INK, 0.04, 0.03, 0.06, NO_LINE);
  const player = group(g, R.player[0], 0, R.player[2]);
  part(player, rbox(0.2, 0.09, 0.12, 0.02), GREEN, 0, 0.045, 0);
  part(player, cyl(0.03, 0.03, 0.006, 14), INK, -0.04, 0.09, 0.0, NO_LINE);
  const led = lit(player, ball(0.009), '#6d7f77', 0.06, 0.092, 0.02);
  const s = use(g, 'kgRest', true), tidy = use(g, 'kgMatTidy', true);
  s.legs = 'cross'; tidy.legs = 'cross';
  out.spots = { kgNapTime: s, kgSetMats: tidy, '*': tidy }; out.work = s.work;
  const live = group(g); out.inUse = live;
  const asleep = lyingChild(live, 0, mats[0], COLORS[1]);
  const settling = lyingChild(live, 1, mats[1], COLORS[3]);
  // Not sleepy: sat on the mat with a picture book, quietly.
  const quiet = pupil(live, 2, mats[2], 0.045, 0.02, -Math.PI / 2, true);
  const book = group(live, mats[2] - 0.2, 0.32, 0.02, -Math.PI / 2);
  for (const sx of [-1, 1]) part(book, rbox(0.11, 0.15, 0.012, 0.004), sx < 0 ? COLORS[2] : COLORS[4], sx * 0.058, 0, 0, { rx: -0.35, ry: sx * 0.35 });
  const notes = [0, 1, 2].map(i => {
    const n = lit(live, ball(0.013), '#7f9db8', 0, 0, 0);
    void i; return n.mesh;
  });
  const say = words(live, 0.55, R.seat[0], 1.2, 0.05);
  out.away = (_o, now) => {
    const onR = active(s, now), onT = active(tidy, now), on = onR || onT;
    live.visible = onR;
    folded.forEach(f => f.visible = !onR);
    const glow = (k: number) => shade.mat.color.set('#ffe8a8').multiplyScalar(0.35 + 0.65 * k);
    if (!onR) {
      glow(on ? 1 : 0.8); led.mat.color.set('#6d7f77'); say.say(undefined); return;
    }
    const t = sceneTime(s, now), n = K.restNow(t);
    glow(n.lamp);
    led.mat.color.set(n.music ? '#8ee0a0' : '#6d7f77');
    say.say(n.say);
    notes.forEach((m, i) => {
      m.visible = n.music;
      const u = (now * 0.22 + i / 3) % 1;
      m.position.set(R.player[0] - 0.04 + 0.08 * Math.sin(u * 5 + i), 0.2 + 0.5 * u, R.player[2] - 0.02);
      m.scale.setScalar(1 - 0.5 * u);
    });
    // The breath under the blankets; the book's page now and then.
    asleep.cover.scale.y = 1 + 0.06 * Math.sin(now * 1.7);
    settling.cover.scale.y = 1 + 0.06 * Math.sin(now * 1.9 + 1);
    settling.kid.head.rotation.y = 0.15 * Math.sin(now * 0.3);
    quiet.pose(v(0.1, 0.28, 0.16), v(-0.1, 0.28, 0.16));
    quiet.head.rotation.x = 0.28;
  };
}

export const BUILDERS: Record<string, Builder> = {
  sandTable: (g, _w, _d, _c, _def, _ctx, out) => sandTable(g, out),
  recitalStage: (g, _w, _d, _c, _def, _ctx, out) => recitalStage(g, out),
  kgNuriBoard: (g, _w, _d, _c, _def, _ctx, out) => nuriBoard(g, out),
  kgNatureDesk: (g, _w, _d, _c, _def, _ctx, out) => natureDesk(g, out),
  kgSafetyCorner: (g, _w, _d, _c, _def, _ctx, out) => safetyCorner(g, out),
  kgCubbies: g => cubbies(g),
  kgHealthDesk: (g, _w, _d, _c, _def, _ctx, out) => healthDesk(g, out),
  kgRestMats: (g, _w, _d, _c, _def, _ctx, out) => restMats(g, out),
  piano: (g, _w, _d, c, _def, _ctx, out) => piano(g, out, c),
  toyBox: (g, _w, _d, c, _def, _ctx, out) => toyBox(g, out, c),
};
