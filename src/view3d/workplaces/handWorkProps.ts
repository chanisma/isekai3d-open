import * as THREE from 'three';
import { broomTool, mopTool } from '../cleaningTools';
import type { Grip, HeldTool } from '../handTool';
import { marker, spot, type Built, type Spot } from '../parts';
import { ball, box, cyl, gradient, part, rbox, toon } from '../toon';
import * as BQ from './bakerMotion';
import * as CP from './carpenterMotion';
import * as KC from './culinaryMotion';
import { label } from './doctor';
import * as HS from './hairStylistMotion';
import { CLOTH_GRIP, SPRAY_GRIP, checklist, clockOf, clothTool, fromRest, holding, penGrip, penTool, placeLong, sprayTool, using, type P } from './handWorkKit';
import * as NL from './nailArtistMotion';

/*
 * What's out only while each hand-work extra is being done, and how it follows its script. Each builder gets a line or two: the spot under the
 * interaction's id, and what of its own it puts away for the time (the dish pit's dirty plates, the bench's dough). Pieces may stand on other
 * lots, so everything here starts hidden and is shown only during the use.
 */
const NO = { outline: false };
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const put = (o: THREE.Object3D, p: readonly number[]) => o.position.set(p[0], p[1], p[2]);
const heightOf = (s: Spot) => (s.at.userData.height as number | undefined) ?? 1.6;
const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const dot = new THREE.SphereGeometry(1, 6, 5);

/** Runs `f` each frame after what the piece already does when nobody's using it. */
function everyFrame(out: Built, f: (t: number) => void) {
  const was = out.away;
  out.away = (a, t) => {
    was?.(a, t);
    f(t);
  };
}
function clear(mat: string, opacity: number) {
  const m = new THREE.MeshToonMaterial({ color: mat, gradientMap: gradient, transparent: true, opacity, depthWrite: false });
  return m;
}
function film(g: THREE.Object3D, w: number, d: number, at: P, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(box(w, 0.001, d), mat);
  m.userData.ownMaterial = true;
  m.castShadow = false;
  put(m, at);
  g.add(m);
  return m;
}
function group(g: THREE.Object3D): THREE.Group {
  const o = new THREE.Group();
  o.visible = false;
  g.add(o);
  return o;
}
/** A hand brush for a bench: an oval back, bristles below, a short grip. The origin's on the bristles' foot, its length along x. */
function benchBrush(g: THREE.Object3D): THREE.Group {
  const o = new THREE.Group();
  o.name = 'bqBrush';
  g.add(o);
  part(o, rbox(0.17, 0.018, 0.05, 0.008), '#a97d4c', 0, 0.035, 0, NO);
  part(o, box(0.15, 0.028, 0.038), '#efe3c8', 0, 0.014, 0, NO);
  part(o, cyl(0.014, 0.014, 0.1, 8), '#8d6a4e', 0.12, 0.046, 0, { rz: Math.PI / 2, outline: false });
  return o;
}
const BRUSH_GRIP: Grip = { at: v(0.12, 0.046, 0), axis: v(-1, 0, 0), shape: 'power' };
/** A little hand pan, its handle towards the dweller (+z), the lip to the -z side. The origin's under the handle's end. */
function handPan(g: THREE.Object3D, c: string): THREE.Group {
  const o = new THREE.Group();
  g.add(o);
  part(o, rbox(0.2, 0.008, 0.16, 0.003), c, 0, 0, -0.14, NO);
  part(o, box(0.2, 0.05, 0.008), c, 0, 0.025, -0.06, NO);
  for (const s of [-1, 1]) part(o, box(0.008, 0.035, 0.16), c, s * 0.1, 0.018, -0.14, NO);
  part(o, rbox(0.03, 0.016, 0.07, 0.006), c, 0, 0.03, -0.02, NO);
  return o;
}
function bin(g: THREE.Object3D, at: P, c: string, h: number, r = 0.14) {
  part(g, cyl(r, r * 0.82, h, 16), c, at[0], h / 2, at[2]);
  part(g, cyl(r * 0.9, r * 0.9, 0.004, 16), '#37474f', at[0], h - 0.002, at[2], NO);
}
function pool(g: THREE.Object3D, n: number, c: string, r: number): THREE.Mesh[] {
  const m = toon(c);
  return Array.from({ length: n }, () => {
    const o = new THREE.Mesh(dot, m);
    o.scale.setScalar(r);
    o.castShadow = false;
    g.add(o);
    return o;
  });
}

// =============================================================================================
// 주방 마감 청소

const KC_ROWS = ['조리대 닦기', '세정제로 기름때', '바닥 물걸레질', '가스·전원 확인'] as const;
export function kitchenClose(g: THREE.Object3D, out: Built, hide: THREE.Object3D[]): Spot {
  const s = spot(g, 'stand', KC.KC_AT.x, 0, KC.KC_AT.z, KC.KC_AT.yaw);
  s.motion = 'kcClose';
  s.work = marker(g, -0.5, KC.KC_TOP, 0.18);
  const p = group(g);
  const T = KC.KC_TOP;
  const cloth = clothTool(p, 'kcCloth');
  const spray = sprayTool(p, 'kcSpray');
  const mist = spray.userData.mist as THREE.Mesh;
  const pen = penTool(p, 'kcPen');
  // Grease on the steel, crumbs on it, where the strip's wiped.
  const greaseMat = clear('#c9a24b', 0.5);
  const S = KC.KC_STRIP;
  film(p, S.x1 - S.x0 + 0.1, 0.1, [(S.x0 + S.x1) / 2, T + 0.001, S.z], greaseMat);
  const r = seeded(9);
  const crumbs = Array.from({ length: 16 }, () => part(p, box(0.012, 0.006, 0.01), r() > 0.5 ? '#c98a3e' : '#8d6e63', S.x0 + r() * (S.x1 - S.x0), T + 0.004, S.z - 0.05 + r() * 0.1, NO));
  // The bucket and its wringer, the mop standing in it.
  const B = KC.KC_BUCKET;
  part(p, cyl(0.17, 0.135, 0.27, 18), '#42a5f5', B[0], 0.175, B[2]);
  part(p, cyl(0.155, 0.155, 0.006, 16), '#a9d6ee', B[0], 0.309, B[2], NO);
  part(p, rbox(0.34, 0.03, 0.09, 0.01), '#fdd835', B[0], 0.325, B[2]);
  for (const [x, z] of [[-0.11, -0.1], [0.11, -0.1], [-0.11, 0.1], [0.11, 0.1]]) part(p, cyl(0.026, 0.026, 0.024, 10), '#37474f', B[0] + x, 0.03, B[2] + z, { rz: Math.PI / 2, outline: false });
  const { mop, strings } = mopTool(p, 1.3);
  const mopRestP = v(B[0], 0.12, B[2]);
  const mopRestQ = new THREE.Quaternion().setFromAxisAngle(v(0, 0, 1), -0.05);
  const tipY = -0.03;
  const mopTip = v(0, tipY, 0);
  // A wet-floor sign, out while it's being mopped.
  const sign = new THREE.Group();
  sign.position.set(-1.0, 0, 1.15);
  p.add(sign);
  for (const f of [-1, 1]) part(sign, box(0.26, 0.5, 0.012), '#fdd835', 0, 0.24, f * 0.06, { rx: f * 0.22 });
  label(sign, '청소 중', 0.2, 0.07, 0, 0.32, 0.128, '#fdd835', '#b71c1c').rotation.x = 0.22;
  // Wet patches where the mop's been.
  const wetMat = new THREE.MeshBasicMaterial({ color: '#cfe8f4', transparent: true, opacity: 0.42, depthWrite: false });
  const patches = Array.from({ length: 22 }, (_, i) => {
    const m = new THREE.Mesh(cyl(0.11, 0.11, 0.002, 12), wetMat);
    if (!i) m.userData.ownMaterial = true;
    m.position.y = 0.006;
    m.castShadow = false;
    m.visible = false;
    p.add(m);
    return m;
  });
  const list = checklist(p, KC.KC_BOARD, 'kitchen', '주방 마감', KC_ROWS);
  const clothRest = KC.KC_CLOTH;
  const sprayRest = KC.KC_SPRAY;
  let next = 0;
  let stamped = -1e9;
  everyFrame(out, (t) => {
    const on = using(s, t);
    p.visible = on;
    for (const h of hide) h.visible = !on;
    if (!on) {
      s.held = null;
      return;
    }
    const H = heightOf(s);
    const N = KC.kcNow(clockOf(s.at, t), H);
    put(cloth, N.cloth ? N.clothAt : clothRest);
    put(spray, N.spray ? N.sprayAt : sprayRest);
    spray.rotation.x = N.spray && N.beat !== 'getSpray' ? -0.55 : 0;
    mist.visible = N.mist;
    greaseMat.opacity = 0.5 * N.grease;
    crumbs.forEach((c, i) => (c.visible = i / crumbs.length < N.crumbs));
    if (N.mopped === 0) {
      for (const m of patches) m.visible = false;
      next = 0;
    }
    pen.visible = N.pen;
    if (N.pen) put(pen, N.penAt);
    list.ticks.forEach((k, i) => (k.visible = N.ticks > i));
    // The mop.
    let held: HeldTool | null = null;
    if (N.mop === 'off') {
      mop.position.copy(mopRestP);
      mop.quaternion.copy(mopRestQ);
    } else {
      const grips = placeLong(mop, mopTip, tipY, N.at, N.stroke, H);
      if (N.mop === 'rest') {
        mop.position.copy(mopRestP);
        mop.quaternion.copy(mopRestQ);
        held = holding(mop, grips, N.key, { resting: true });
      } else if (N.mop === 'carry') {
        fromRest(mop, mopRestP, mopRestQ, N.mopE);
        held = holding(mop, grips, N.key);
      } else {
        held = holding(mop, grips, N.key, { anchor: mopTip });
        strings.rotation.y = 0.6 * Math.sin(t * 2.6);
        if (t - stamped > 0.32) {
          stamped = t;
          const m = patches[next % patches.length];
          next++;
          m.visible = true;
          m.position.x = mop.position.x;
          m.position.z = mop.position.z;
        }
      }
    }
    if (N.cloth) held = holding(cloth, { right: CLOTH_GRIP }, N.key);
    else if (N.spray) held = holding(spray, { right: SPRAY_GRIP }, N.key);
    else if (N.pen) held = holding(pen, { right: penGrip() }, N.key);
    s.held = held;
  });
  return s;
}

// =============================================================================================
// 베이커리 마감 청소

const BQ_ROWS = ['작업대 털기', '철판 닦기', '바닥 쓸기', '오븐 전원 확인'] as const;
export function bakeryClose(g: THREE.Object3D, out: Built, hide: THREE.Object3D[]): Spot {
  const s = spot(g, 'stand', BQ.BQ_AT.x, 0, BQ.BQ_AT.z, BQ.BQ_AT.yaw);
  s.motion = 'bqClose';
  s.work = marker(g, BQ.BQ_AT.x, BQ.BQ_TOP, 0.1);
  const p = group(g);
  const T = BQ.BQ_TOP;
  const brush = benchBrush(p);
  const pan = handPan(p, '#78909c');
  const cloth = clothTool(p, 'bqCloth', '#fff3e0', '#ffcc80');
  const pen = penTool(p, 'bqPen');
  bin(p, BQ.BQ_BIN, '#546e7a', 0.58);
  const r = seeded(21);
  // Crumbs and flour where the dough was, and what's on the tray.
  const crumbs = Array.from({ length: 24 }, () => {
    const c = part(p, box(0.016, 0.007, 0.012), r() > 0.45 ? '#d9a860' : '#f7f3ea', -0.38 + r() * 0.38, T + 0.005, 0.08 + r() * 0.2, NO);
    c.userData.x = c.position.x;
    c.userData.z = c.position.z;
    return c;
  });
  const inPan = part(pan, ball(0.04), '#d9a860', 0, 0.012, -0.13, NO);
  const falling = pool(p, 6, '#d9a860', 0.008);
  const filmMat = clear('#8d5a2b', 0.6);
  film(p, 0.2, 0.33, [BQ.BQ_TRAY[0], T + 0.015, BQ.BQ_TRAY[2]], filmMat);
  const list = checklist(p, BQ.BQ_BOARD, 'bakery', '베이커리 마감', BQ_ROWS);
  const broom = broomTool(p, '#ad1457');
  const foot = BQ.BQ_BROOM_FOOT;
  const restP = v(foot[0], 0, foot[2]);
  const restQ = new THREE.Quaternion().setFromUnitVectors(v(0, 1, 0), v(-0.02, 1, -0.27).normalize());
  const tip = v(0, 0, 0);
  // What's on the floor in front, smaller as it's swept; a puff at the bristles.
  const specks = Array.from({ length: 9 }, (_, i) => part(p, ball(0.03), i % 3 ? '#b7ab98' : '#d9a860', BQ.BQ_SWEEP_AT.x + 0.26 * Math.sin(i * 2.3), 0.01, BQ.BQ_SWEEP_AT.z + 0.6 + 0.09 * Math.cos(i * 1.7), { ...NO, shadow: false }));
  const puffs = pool(p, 3, '#efe7d6', 0.03);
  const tmpQ = new THREE.Vector3();
  everyFrame(out, (t) => {
    const on = using(s, t);
    p.visible = on;
    for (const h of hide) h.visible = !on;
    if (!on) {
      s.held = null;
      return;
    }
    const H = heightOf(s);
    const N = BQ.bqNow(clockOf(s.at, t), H);
    put(brush, N.brush ? N.brushAt : BQ.BQ_BRUSH);
    // The pan: by the handle in the left hand; on the top by the bench's edge between.
    put(pan, N.pan ? [N.panAt[0], N.panAt[1] - 0.03, N.panAt[2]] : [BQ.BQ_PAN[0], BQ.BQ_PAN[1] - 0.03, BQ.BQ_PAN[2]]);
    pan.rotation.order = 'YXZ';
    pan.rotation.y = -Math.PI / 2 + Math.PI * N.panTurn;
    pan.rotation.x = -0.9 * N.panTip;
    inPan.visible = N.inPan > 0.02;
    inPan.scale.set(N.inPan, 0.5 * N.inPan, N.inPan);
    crumbs.forEach((c, i) => {
      const gone = (i + 0.5) / crumbs.length > N.crumbs;
      c.visible = !gone;
      // Ones about to go lie nearer the pan.
      const e = Math.max(0, 1 - (N.crumbs - (i + 0.5) / crumbs.length) * 4);
      c.position.x = THREE.MathUtils.lerp(c.userData.x as number, BQ.BQ_PAN[0] + 0.14, N.crumbs < 1 ? e * 0.8 : 0);
    });
    falling.forEach((m, i) => {
      m.visible = N.falling >= 0;
      if (!m.visible) return;
      const u = (N.falling * 2.2 + i / 6) % 1;
      m.position.set(BQ.BQ_BIN[0] + 0.03 * Math.sin(i * 2), THREE.MathUtils.lerp(0.74, 0.58, u), BQ.BQ_BIN[2] + 0.03 * Math.cos(i * 3));
    });
    filmMat.opacity = 0.6 * N.film;
    put(cloth, N.cloth ? N.clothAt : BQ.BQ_CLOTH);
    pen.visible = N.pen;
    if (N.pen) put(pen, N.penAt);
    list.ticks.forEach((k, i) => (k.visible = N.ticks > i));
    specks.forEach((m, i) => {
      const left = Math.max(0.001, 1 - N.swept);
      m.scale.set(left * (1 + (i % 3) * 0.5), 0.35 * left, left * (1 + (i % 2) * 0.4));
    });
    let held: HeldTool | null = null;
    if (N.broom === 'off') {
      broom.position.copy(restP);
      broom.quaternion.copy(restQ);
    } else {
      const grips = placeLong(broom, tip, 0, N.at, N.stroke, H);
      if (N.broom === 'rest') {
        broom.position.copy(restP);
        broom.quaternion.copy(restQ);
        held = holding(broom, grips, N.key, { resting: true });
      } else if (N.broom === 'carry') {
        fromRest(broom, restP, restQ, N.broomE);
        held = holding(broom, grips, N.key);
      } else held = holding(broom, grips, N.key, { anchor: tip });
    }
    puffs.forEach((m, i) => {
      m.visible = N.broom === 'work';
      if (!m.visible) return;
      tmpQ.copy(broom.position);
      const u = (t * 1.3 + i / 3) % 1;
      m.position.set(tmpQ.x + 0.08 * Math.sin(i * 2.1), 0.02 + 0.14 * u, tmpQ.z + 0.05 * Math.cos(i * 1.3));
      m.scale.setScalar(Math.max(0.001, 0.03 * (0.6 + 1.2 * u) * (1 - u)));
    });
    if (N.brush) held = holding(brush, { right: BRUSH_GRIP }, N.key, { free: { left: g.localToWorld(v(N.panAt[0], N.panAt[1], N.panAt[2])) }, freeShape: 'power' });
    else if (N.cloth) held = holding(cloth, { right: CLOTH_GRIP }, N.key);
    else if (N.pen) held = holding(pen, { right: penGrip() }, N.key);
    s.held = held;
  });
  return s;
}

// =============================================================================================
// 바닥 머리카락 쓸기

export function salonSweep(g: THREE.Object3D, out: Built): Spot {
  const s = spot(g, 'stand', HS.HS_AT.x, 0, HS.HS_AT.z, HS.HS_AT.yaw);
  s.motion = 'hsSweep';
  s.work = marker(g, HS.HS_HEAP[0], 0.02, HS.HS_HEAP[2]);
  const p = group(g);
  const r = seeded(77);
  const COLS = ['#3e2723', '#5d4037', '#8d6e63', '#2b2019'];
  const D = HS.HS_DRIFT;
  const heap = HS.HS_HEAP;
  // The cut hair: each lock from its place in the drift to its place in the heap.
  const locks = Array.from({ length: 44 }, (_, i) => {
    const a = r() * Math.PI * 2;
    const q = D.r * Math.sqrt(r());
    const m = part(p, box(0.035 + r() * 0.03, 0.004, 0.006), COLS[i % 4], 0, 0.004, 0, { ry: r() * 3, outline: false, shadow: false });
    return { m, x: D.x + Math.sin(a) * q, z: D.z + Math.cos(a) * q, hx: heap[0] + (r() - 0.5) * 0.1, hz: heap[2] + (r() - 0.5) * 0.08, y: 0.004 + r() * 0.02 };
  });
  const pile = part(p, ball(0.075), '#3e2723', heap[0], 0.005, heap[2], { ...NO, shadow: false });
  // The lobby pan: the head hinged from its back, the handle up from the hinge.
  const pan = new THREE.Group();
  pan.name = 'hsPan';
  p.add(pan);
  const head = new THREE.Group();
  head.position.z = -0.2;
  pan.add(head);
  const PAN = '#546e7a';
  part(head, rbox(0.26, 0.008, 0.2, 0.003), PAN, 0, 0.012, 0.1, NO);
  part(head, box(0.26, 0.1, 0.01), PAN, 0, 0.055, 0, NO);
  part(head, box(0.26, 0.012, 0.09), PAN, 0, 0.105, 0.045, NO);
  for (const x of [-0.13, 0.13]) part(head, box(0.008, 0.09, 0.14), PAN, x, 0.05, 0.07, NO);
  const panLoad = part(head, ball(0.07), '#3e2723', 0, 0.022, 0.09, NO);
  const handle = new THREE.Group();
  handle.position.set(0, 0.03, -0.2);
  pan.add(handle);
  part(handle, cyl(0.012, 0.012, HS.HS_PAN_LEN - 0.03, 8), '#90a4ae', 0, (HS.HS_PAN_LEN - 0.03) / 2, 0, NO);
  part(handle, cyl(0.016, 0.016, 0.1, 8), '#263238', 0, HS.HS_PAN_LEN - 0.08, 0, NO);
  const broom = broomTool(p, '#6a1b9a');
  const foot = HS.HS_BROOM_FOOT;
  const restP = v(foot[0], 0, foot[2]);
  const restQ = new THREE.Quaternion().setFromUnitVectors(v(0, 1, 0), v(-0.12, 0.95, -0.04).normalize());
  const tip = v(0, 0, 0);
  // The bin with a flap lid.
  const B = HS.HS_BIN;
  bin(p, B, '#37474f', 0.46, 0.13);
  const lid = new THREE.Group();
  lid.position.set(B[0] + 0.13, 0.46, B[2]);
  p.add(lid);
  part(lid, cyl(0.135, 0.135, 0.014, 16), '#263238', -0.13, 0.007, 0, NO);
  const falling = Array.from({ length: 9 }, (_, i) => part(p, box(0.04, 0.004, 0.006), COLS[i % 4], 0, 0, 0, { ry: i, outline: false, shadow: false }));
  const toWorld = new THREE.Vector3();
  everyFrame(out, (t) => {
    const on = using(s, t);
    p.visible = on;
    if (!on) {
      s.held = null;
      return;
    }
    const H = heightOf(s);
    const N = HS.hsNow(clockOf(s.at, t), H);
    locks.forEach((l, i) => {
      const inP = (i + 0.5) / locks.length < N.inPan;
      l.m.visible = !inP;
      l.m.position.set(THREE.MathUtils.lerp(l.x, l.hx, N.gather), N.gather > 0.6 ? l.y : 0.004, THREE.MathUtils.lerp(l.z, l.hz, N.gather));
    });
    const has = N.gather * (1 - N.inPan);
    pile.visible = has > 0.04;
    pile.scale.set(has, 0.4 * has, has);
    // The pan.
    const q = N.pan;
    put(pan, q.at);
    pan.rotation.y = q.yaw;
    head.rotation.x = q.pitch;
    handle.rotation.x = q.tilt;
    const load = N.fall >= 0 ? Math.max(0, 1 - N.fall) : N.inPan;
    panLoad.visible = load > 0.03;
    panLoad.scale.set(load, 0.4 * load, load);
    lid.rotation.z = N.lid * 1.3;
    falling.forEach((m, i) => {
      m.visible = N.fall > 0 && N.fall < 1;
      if (!m.visible) return;
      const u = (N.fall * 2.4 + i / 9) % 1;
      m.position.set(B[0] + 0.05 * Math.sin(i * 2.3), THREE.MathUtils.lerp(0.58, 0.44, u), B[2] + 0.05 * Math.cos(i * 1.9));
    });
    // The broom, and the left on the pan's handle.
    const grips = placeLong(broom, tip, 0, N.at, N.stroke, H);
    let held: HeldTool | null;
    if (N.broom === 'rest') {
      broom.position.copy(restP);
      broom.quaternion.copy(restQ);
      held = holding(broom, { right: grips.right }, N.key, { resting: true });
    } else if (N.broom === 'one') {
      held = holding(broom, { right: grips.right }, N.key, { anchor: tip });
    } else {
      if (N.broomE < 1) fromRest(broom, restP, restQ, N.broomE);
      held = holding(broom, N.panHeld ? { right: grips.right } : grips, N.key, N.broomE >= 1 ? { anchor: tip } : {});
    }
    if (N.panHeld) {
      toWorld.set(N.key.l[0], N.key.l[1], N.key.l[2]);
      held.free = { left: g.localToWorld(toWorld.clone()) };
      held.freeShape = 'power';
    }
    s.held = held;
  });
  return s;
}

// =============================================================================================
// 사포질

export function carpenterSand(g: THREE.Object3D, out: Built, hide: THREE.Object3D[]): Spot {
  const s = spot(g, 'stand', CP.CP_AT.x, 0, CP.CP_AT.z, CP.CP_AT.yaw);
  s.motion = 'cpSand';
  const P_ = CP.CP_PANEL;
  s.work = marker(g, P_.x, P_.y, P_.z);
  const p = group(g);
  // The block, with a sheet wrapped on it that changes.
  const block = new THREE.Group();
  block.name = 'cpSandBlock';
  p.add(block);
  part(block, rbox(0.1, 0.032, 0.065, 0.008), '#37474f', 0, 0.02, 0, NO);
  const strip = part(block, box(0.104, 0.004, 0.067), '#b08a5a', 0, 0.002, 0, NO);
  const coarse = toon('#b08a5a');
  const fine = toon('#d7c5a0');
  const handGrip: Grip = { at: v(0, 0.03, 0), axis: v(-1, 0, 0), palm: v(0, -1, 0), shape: 'power', radius: 0.022 };
  const leftGrip: Grip = { at: v(0, 0.03, 0), axis: v(1, 0, 0), palm: v(0, -1, 0), shape: 'power', radius: 0.022 };
  // The sheets to hand: #220 on top, the used one thrown beside.
  const S = CP.CP_SHEET;
  part(p, box(0.14, 0.002, 0.11), '#d7c5a0', S[0], S[1], S[2], NO);
  label(p, '#220', 0.06, 0.025, S[0], S[1] + 0.002, S[2] + 0.02, '#d7c5a0', '#5d4037').rotation.x = -Math.PI / 2;
  const newSheet = part(p, box(0.12, 0.002, 0.09), '#d7c5a0', 0, 0, 0, NO);
  const used = part(p, rbox(0.1, 0.012, 0.075, 0.005), '#a98757', S[0] + 0.17, S[1] + 0.006, S[2] + 0.04, { ry: 0.5, outline: false });
  // Dust and marks lying on the panel, and in the air.
  const dustMat = clear('#f3e8cf', 0.7);
  const roughMat = clear('#a97a44', 0.5);
  film(p, P_.w - 0.02, P_.d - 0.02, [P_.x, P_.y + 0.0018, P_.z], roughMat);
  film(p, P_.w - 0.02, P_.d - 0.02, [P_.x, P_.y + 0.0028, P_.z], dustMat);
  const motes = pool(p, 10, '#efe2c4', 0.005);
  const blow = pool(p, 8, '#f3ead6', 0.012);
  everyFrame(out, (t) => {
    const on = using(s, t);
    p.visible = on;
    for (const h of hide) h.visible = !on;
    if (!on) {
      s.held = null;
      return;
    }
    const N = CP.cpNow(clockOf(s.at, t));
    put(block, N.blockAt);
    strip.material = N.grit === 120 ? coarse : fine;
    newSheet.visible = !!N.sheetAt;
    if (N.sheetAt) put(newSheet, N.sheetAt);
    used.visible = N.grit === 220;
    dustMat.opacity = 0.7 * N.dust;
    roughMat.opacity = 0.5 * N.rough;
    motes.forEach((m, i) => {
      m.visible = N.sanding;
      if (!m.visible) return;
      const f = (t * 0.9 + i / motes.length) % 1;
      m.position.set(N.blockAt[0] + 0.1 * Math.sin(i * 2.1), N.blockAt[1] + 0.01 + f * 0.13, N.blockAt[2] + 0.07 * Math.cos(i * 1.3));
    });
    blow.forEach((m, i) => {
      m.visible = N.blowing >= 0;
      if (!m.visible) return;
      const u = (N.blowing * 2.2 + i / blow.length) % 1;
      m.position.set(P_.x - 0.2 + i * 0.055, P_.y + 0.02 + 0.2 * u, P_.z - 0.05 - 0.3 * u);
      m.scale.setScalar(0.004 + 0.022 * u * (1 - u) * 4);
    });
    let held: HeldTool | null = null;
    if (N.block === 'right') {
      const free = N.palm ? { free: { left: g.localToWorld(v(N.key.l[0], N.key.l[1], N.key.l[2])) }, freeShape: 'flat' as const } : {};
      held = holding(block, { right: handGrip }, N.key, free);
    } else if (N.block === 'left') {
      held = holding(block, { left: leftGrip }, N.key, { free: { right: g.localToWorld(v(N.key.r[0], N.key.r[1], N.key.r[2])) }, freeShape: 'pinch' });
    }
    s.held = held;
  });
  return s;
}

// =============================================================================================
// 젤 제거

export function nailSoakOff(g: THREE.Object3D, out: Built, holder: THREE.Object3D, hide: THREE.Object3D[], seat: { at: (k: Spot) => Spot; make: () => Spot }): Spot {
  const s = seat.at(seat.make());
  s.motion = 'nlSoak';
  const p = group(g);
  const on_ = group(holder);
  const gelMat = new THREE.MeshToonMaterial({ color: '#e57399', gradientMap: gradient });
  const shineMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false });
  const parts = NL.NAIL_OFFSETS.map((n, i) => {
    const gel = new THREE.Mesh(rbox(0.0135, 0.0045, 0.0165, 0.002), gelMat);
    if (!i) gel.userData.ownMaterial = true;
    gel.position.set(n[0], n[1] - 0.0005, n[2] + 0.005);
    on_.add(gel);
    const shine = new THREE.Mesh(box(0.007, 0.0006, 0.009), shineMat);
    if (!i) shine.userData.ownMaterial = true;
    shine.position.set(n[0], n[1] + 0.002, n[2] + 0.005);
    on_.add(shine);
    // Cotton on the nail and foil round the fingertip.
    const wrap = new THREE.Group();
    wrap.position.set(n[0], n[1] - 0.002, n[2] + 0.002);
    on_.add(wrap);
    part(wrap, ball(0.0155), '#c8d0d6', 0, 0.0, 0, NO).scale.set(1, 0.9, 1.3);
    part(wrap, ball(0.008), '#eef1f3', 0.005, 0.009, 0.01, NO);
    part(wrap, box(0.016, 0.006, 0.01), '#fafafa', 0, -0.002, 0.019, NO);
    return { gel, shine, wrap };
  });
  // The tools: a tray of cotton and foil to the right hand, a dish for the used foil to the left, a dial timer.
  const T = NL.NL_TRAY;
  part(p, rbox(0.14, 0.008, 0.1, 0.003), '#eceff1', T[0], T[1] + 0.004, T[2]);
  for (let i = 0; i < 4; i++) part(p, box(0.04, 0.002, 0.04), '#cfd8dc', T[0] - 0.04 + (i % 2) * 0.04, T[1] + 0.009 + i * 0.001, T[2] - 0.015, { ry: i * 0.3, outline: false });
  for (let i = 0; i < 5; i++) part(p, ball(0.009), '#fafafa', T[0] - 0.045 + i * 0.022, T[1] + 0.014, T[2] + 0.028, NO);
  const D = NL.NL_DISH;
  part(p, cyl(0.055, 0.045, 0.014, 18), '#b0bec5', D[0], D[1] + 0.007, D[2]);
  const usedFoils = Array.from({ length: 5 }, (_, i) => part(p, ball(0.012), '#cfd8dc', D[0] - 0.02 + (i % 3) * 0.02, D[1] + 0.02, D[2] - 0.015 + (i % 2) * 0.03, NO));
  const dial = NL.NL_TIMER;
  part(p, cyl(0.032, 0.036, 0.03, 18), '#fafafa', dial[0], dial[1] + 0.015, dial[2]);
  part(p, cyl(0.026, 0.026, 0.002, 18), '#ffcdd2', dial[0], dial[1] + 0.0305, dial[2], NO);
  const needle = new THREE.Group();
  needle.position.set(dial[0], dial[1] + 0.033, dial[2]);
  p.add(needle);
  part(needle, box(0.003, 0.002, 0.024), '#b71c1c', 0, 0, 0.012, NO);
  // In the hand. Files and the like lie along their z; pens stand on their tip.
  const file = new THREE.Group();
  file.name = 'nlFile';
  p.add(file);
  part(file, rbox(0.018, 0.005, 0.15, 0.003), '#e0e0e0', 0, 0, 0, NO);
  const buffer = new THREE.Group();
  buffer.name = 'nlBuffer';
  p.add(buffer);
  part(buffer, rbox(0.025, 0.018, 0.1, 0.006), '#f48fb1', 0, 0, 0, NO);
  const pusher = new THREE.Group();
  pusher.name = 'nlPusher';
  p.add(pusher);
  part(pusher, cyl(0.004, 0.004, 0.11, 8), '#b0bec5', 0, 0.065, 0, NO);
  part(pusher, box(0.009, 0.012, 0.002), '#cfd8dc', 0, 0.006, 0, NO);
  const oil = new THREE.Group();
  oil.name = 'nlOil';
  p.add(oil);
  part(oil, cyl(0.002, 0.004, 0.012, 8), '#fafafa', 0, 0.006, 0, NO);
  part(oil, cyl(0.009, 0.009, 0.09, 10), '#ffe082', 0, 0.057, 0, NO);
  const carried = new THREE.Group();
  carried.name = 'nlWrap';
  p.add(carried);
  part(carried, ball(0.012), '#fafafa', 0, 0.006, 0, NO);
  part(carried, box(0.03, 0.002, 0.03), '#cfd8dc', 0, -0.004, 0, NO);
  const restAt: Record<string, P> = { nlFile: [-0.2, NL.NL_TRAY[1] + 0.006, 0.3], nlBuffer: [-0.16, NL.NL_TRAY[1] + 0.012, 0.3], nlPusher: [-0.12, NL.NL_TRAY[1] + 0.008, 0.31], nlOil: [-0.09, NL.NL_TRAY[1] + 0.012, 0.3] };
  const tools = { file, buffer, pusher, oil };
  const flatPen = new THREE.Quaternion().setFromAxisAngle(v(1, 0, 0), Math.PI / 2);
  const flatGrip: Grip = { at: v(0, 0, NL.FILE_HAND), axis: v(0, 0, -1), shape: 'pinch', radius: 0.006 };
  const pinch: Grip = { at: v(0, 0.006, 0), axis: v(1, 0, 0), shape: 'pinch', radius: 0.008 };
  everyFrame(out, (t) => {
    const on = using(s, t);
    p.visible = on_.visible = on;
    for (const h of hide) h.visible = !on;
    if (!on) {
      s.held = null;
      return;
    }
    const N = NL.nlNow(clockOf(s.at, t));
    shineMat.opacity = N.tool === 'file' || N.beat === 'file' ? 0.5 * Math.max(0, N.shine * 2 - 1) : 0.12 + 0.5 * N.oilSheen * (N.gel[0] < 0.01 ? 1 : 0);
    parts.forEach((q, i) => {
      const g0 = N.gel[i];
      q.gel.visible = g0 > 0.02;
      q.gel.scale.z = Math.max(0.05, g0);
      q.wrap.visible = N.foil[i];
      q.shine.visible = !N.foil[i];
    });
    usedFoils.forEach((m, i) => (m.visible = i < N.foils));
    needle.rotation.y = -N.dial * Math.PI * 2;
    for (const [k, o] of Object.entries(tools)) {
      put(o, restAt[o.name]);
      if (k === 'pusher' || k === 'oil') o.quaternion.copy(flatPen);
      else o.quaternion.identity();
    }
    carried.visible = !!N.wrapIn;
    if (N.wrapIn) put(carried, N.wrapIn);
    let held: HeldTool | null = null;
    if (N.tool === 'file' || N.tool === 'buffer') {
      const o = tools[N.tool];
      put(o, N.toolAt);
      held = holding(o, { right: flatGrip }, N.key);
    } else if (N.tool === 'pusher' || N.tool === 'oil') {
      const o = tools[N.tool];
      put(o, N.toolAt);
      o.quaternion.identity();
      held = holding(o, { right: penGrip() }, N.key);
    } else if (N.tool === 'wrap' && N.wrapIn) held = holding(carried, { right: pinch }, N.key);
    s.held = held;
  });
  return s;
}
