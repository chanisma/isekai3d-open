import * as THREE from 'three';
import { marker, rod, shade, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { poseTool, type HeldTool } from '../handTool';
import { BLACK, CHROME, STEEL, glowing, label, painted, picture, ring, text } from './doctor';
import { BK, BR, BR_N, CT, LK, RB, SB, SR, TR, TR_ROUND, UR, magnetAt, snNow, snPhase, wrap } from './sanitationWorkerMotion';
import type { SnMotion, SnNow, SnTool } from './sanitationWorkerMotion';
import type { V } from './busDriverMotion';
import { fenceRun } from './busDriver';
import { vroidFigure } from './vroidFigure';

/**
 * A municipal 청소 차고지 before it's light (2026-11-01, the workplace pipeline, at the user's request). The crews of the made-up
 * 달빛구 start at five: lamps on, trucks warm, beacons going round. The trucks are real rear-loaders, cab at one end and a hopper
 * at the other, whose tailgate goes up on its rams and whose blade comes round and packs what's thrown in. The sorting belt runs
 * with what the town put out, taken off by hand into chutes. What the place was missing (workFurniture/sanitationWorker.ts): the
 * route board and gear lockers, the bag stack, the bulky-waste slab, a sweeper's cart with broom, long dustpan and tongs, a 제설함
 * of sand with its shovel, the yard lamps, and the crew's urn of barley tea. The work is heavy and it's done well: that's how
 * it's drawn. The wash bay and tool wall stay shared (busDriver.ts, mechanic.ts) and aren't redrawn here.
 *
 * The hands and what they hold go by one clock (sanitationWorkerMotion.ts); what's in the hand goes through handTool.ts.
 */

const GREEN = '#2e7d32';
const GREEN_D = '#1b5e20';
const LIME = '#7cb342';
const WHITE = '#f4f6f3';
const ORANGE = '#ef6c00';
const REFLECT = '#d9f05a';
const GREY = '#78909c';
const GREY_D = '#455a64';
const TYRE = '#22242a';
const BAG = '#f0ead0';
const BAG_D = '#d9cf9f';
const HANDLE = '#c9a77c';
const INK = '#2b2b30';
const SKIN = '#ecc6a3';
const WARD = '달빛구';
const UP = new THREE.Vector3(0, 1, 0);
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3();
const FLAT = -Math.PI / 2;
const clamp01 = (x: number | undefined, d = 0) => THREE.MathUtils.clamp(x ?? d, 0, 1);

// ---------------------------------------------------------------------------------------------
// Small parts.

function group(parent: THREE.Object3D, x = 0, y = 0, z = 0, ry = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}
function at(m: THREE.Object3D, p: V | null | undefined, home?: V) {
  const q = p ?? home;
  m.visible = !!q;
  if (q) m.position.set(q[0], q[1], q[2]);
}
function ownLit(g: THREE.Object3D, geom: THREE.BufferGeometry, color: string, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color }));
  m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
const setLit = (m: THREE.Mesh, c: string) => (m.material as THREE.MeshBasicMaterial).color.set(c);
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
function nowAt(spots: Record<string, Spot>, t: number): string | null {
  let best: string | null = null;
  for (const [k, s] of Object.entries(spots)) if (k !== '*' && Math.abs(t - posedAt(s)) < 0.6 && (best === null || posedAt(s) > posedAt(spots[best]))) best = k;
  return best;
}
/** Every frame: which use is going on and where its script has got to; what it says is in the hand goes in the hand. */
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, tools: Partial<Record<SnTool, HeldTool>>, show: (now: string | null, N: SnNow | null, t: number, H: number, isOut: boolean) => void) {
  out.spots = spots;
  out.away = (isOut, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const H = (sp?.at.userData.height as number | undefined) ?? 1.6;
    const N = sp ? snNow(sp.motion as SnMotion, t, snPhase(g.getWorldPosition(tmp)), H) : null;
    show(now, N, t, H, isOut);
    for (const s of Object.values(spots)) s.held = s === sp && N?.tool ? (tools[N.tool] ?? null) : null;
  };
}
function standAt(g: THREE.Object3D, motion: SnMotion, x = 0, z = 0.6): Spot {
  const s = spot(g, 'stand', x, 0, z, Math.PI);
  s.motion = motion;
  return s;
}
function limb(g: THREE.Object3D, r: number, color: string): (a: THREE.Vector3, b: THREE.Vector3) => void {
  const m = part(g, cyl(r, r, 1, 8), color, 0, 0, 0, { outline: false });
  const d = new THREE.Vector3();
  return (a, b) => {
    d.subVectors(b, a);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.scale.set(1, Math.max(0.001, d.length()), 1);
    m.quaternion.setFromUnitVectors(UP, d.normalize());
  };
}
/** A tied street bag (종량제 봉투), its middle at the origin. */
function streetBag(parent: THREE.Object3D, tint = BAG): THREE.Group {
  const g = group(parent);
  const b = part(g, ball(0.17), tint, 0, 0, 0);
  b.scale.set(1.05, 0.95, 0.9);
  part(g, box(0.2, 0.05, 0.005), GREEN, 0, 0, 0.152, { outline: false });
  part(g, cyl(0.02, 0.05, 0.06, 8), BAG_D, 0, 0.17, 0, { outline: false });
  part(g, ball(0.028), tint, 0, 0.21, 0, { outline: false });
  return g;
}
/** A wheelie bin, its base at the origin; the handle and wheels at +x. */
function wheelieBin(parent: THREE.Object3D, color: string, no: string): THREE.Group {
  const g = group(parent);
  part(g, rbox(0.44, 0.84, 0.46, 0.03), color, 0, 0.5, 0);
  part(g, rbox(0.5, 0.05, 0.52, 0.02), color, 0.01, 0.95, 0);
  part(g, cyl(0.014, 0.014, 0.42, 8), GREY_D, 0.22, 0.98, 0, { rx: Math.PI / 2 });
  for (const sz of [-1, 1]) part(g, cyl(0.08, 0.08, 0.05, 12), TYRE, 0.16, 0.08, sz * 0.21, { rx: Math.PI / 2 });
  label(g, no, 0.2, 0.09, 0, 0.62, 0.233, WHITE, INK);
  return g;
}
interface Look {
  top: string;
  bottom: string;
  hair: string;
}
type Fig = ReturnType<typeof vroidFigure>;
/** Someone sat: a drawn figure under the VRoid one. */
function person(parent: THREE.Object3D, look: Look, x: number, z: number, ry: number, gender: 'female' | 'male', seat: number, seed: number): Fig {
  const root = group(parent, x, 0, z, ry);
  for (const sx of [-1, 1]) {
    const knee = v3(sx * 0.09, seat + 0.03, 0.36);
    const ankle = v3(sx * 0.09, seat - 0.42, 0.42);
    rod(root, v3(sx * 0.09, seat + 0.08, -0.08), knee, 0.056, look.bottom);
    rod(root, knee, ankle, 0.045, look.bottom);
  }
  part(root, rbox(0.34, 0.5, 0.21, 0.08), look.top, 0, seat + 0.3, -0.08);
  const head = group(root, 0, seat + 0.7, -0.08);
  part(head, ball(0.112), SKIN, 0, 0, 0);
  part(head, ball(0.118), look.hair, 0, 0.03, -0.03);
  const noArm = () => {};
  const f = vroidFigure({ root, head, armL: noArm, armR: noArm }, { gender, seat, seed });
  root.visible = false;
  return f;
}

// ---------------------------------------------------------------------------------------------
// What's held (handTool.ts). A long tool's +y runs up its handle from its head at the origin.

/**
 * A long-handled tool whose head is what's choreographed: the handle goes from the head through where the hands are, and the
 * hands find it there. At rest it's where it stands on the piece.
 */
function longTool(tool: THREE.Group, length: number, gap: number, twoHands: boolean) {
  const tip = v3(0, 0, 0);
  const restP = tool.position.clone();
  const restQ = tool.quaternion.clone();
  const grips: HeldTool['grips'] = {
    right: { at: v3(0, 0.9, 0), axis: v3(0, 1, 0), shape: 'power' },
    ...(twoHands ? { left: { at: v3(0, 0.7, 0), axis: v3(0, 1, 0), shape: 'power' as const, slide: true } } : {}),
  };
  const upV = new THREE.Vector3();
  const hands = new THREE.Vector3();
  const P = new THREE.Vector3();
  const Q = new THREE.Quaternion();
  return {
    tool,
    grips,
    tip,
    /** `head` in the piece's frame, `rest` 1 where it's kept. */
    place(head: V | null | undefined, N: SnNow | null, H: number, rest: number, spin = 0) {
      if (!head || !N) {
        tool.position.copy(restP);
        tool.quaternion.copy(restQ);
        return;
      }
      const f = Math.max(0.01, (N.n.hu ?? 0.7) * H);
      const a = N.n.ha ?? 0.26;
      const s = N.st;
      // To their right of the middle by `hs`: what's past the hand goes by the body, not through it.
      const hs = N.n.hs ?? 0.03;
      hands.set(s.x + Math.sin(s.yaw) * a - Math.cos(s.yaw) * hs, f, s.z + Math.cos(s.yaw) * a + Math.sin(s.yaw) * hs);
      P.set(head[0], head[1], head[2]);
      upV.subVectors(hands, P);
      const d = Math.max(0.15, upV.length());
      const along = THREE.MathUtils.lerp(Math.min(length - 0.05, d), Math.min(0.9, length - 0.08), rest);
      grips.right!.at.y = along;
      if (grips.left) grips.left.at.y = Math.max(0.3, along - gap * (H / 1.6));
      if (upV.lengthSq() < 1e-4) upV.copy(UP);
      poseTool(tool, tip, P, upV, spin);
      if (rest > 0) {
        Q.copy(tool.quaternion);
        P.copy(tool.position);
        tool.position.lerpVectors(P, restP, rest);
        tool.quaternion.slerpQuaternions(Q, restQ, rest);
      }
    },
  };
}
function broomTool(g: THREE.Object3D, rest: V): THREE.Group {
  const t = group(g, rest[0], rest[1], rest[2]);
  t.name = 'streetBroom';
  t.rotation.x = -0.1;
  part(t, cyl(0.014, 0.014, 1.3, 8), HANDLE, 0, 0.78, 0, { outline: false });
  part(t, rbox(0.46, 0.05, 0.07, 0.012), ORANGE, 0, 0.17, 0, { outline: false });
  for (let i = 0; i < 12; i++) part(t, box(0.034, 0.15, 0.055), '#3e3a2c', -0.19 + i * 0.0345, 0.075, 0, { outline: false });
  return t;
}
function panTool(g: THREE.Object3D, rest: V): THREE.Group {
  const t = group(g, rest[0], rest[1], rest[2]);
  t.name = 'longDustpan';
  t.rotation.x = -0.1;
  // Long enough for the hand to stay about chest high on anyone, the head on the floor.
  part(t, cyl(0.014, 0.014, 1.1, 8), '#90a4ae', 0, 0.6, 0, { outline: false });
  part(t, box(0.3, 0.012, 0.26), GREY_D, 0, 0.012, 0.09, { outline: false });
  part(t, box(0.3, 0.12, 0.012), GREY_D, 0, 0.07, -0.03, { outline: false });
  for (const sx of [-1, 1]) part(t, box(0.012, 0.1, 0.26), GREY_D, sx * 0.15, 0.055, 0.09, { outline: false });
  return t;
}
function shovelTool(g: THREE.Object3D, rest: V): THREE.Group {
  const t = group(g, rest[0], rest[1], rest[2]);
  t.name = 'sandShovel';
  t.rotation.z = 0.2;
  // A short-handled shovel, so the top hand can be at the top with the blade on the box's sand.
  part(t, cyl(0.015, 0.015, 0.8, 8), HANDLE, 0, 0.55, 0, { outline: false });
  part(t, box(0.13, 0.016, 0.022), BLACK, 0, 0.96, 0, { outline: false });
  part(t, box(0.24, 0.3, 0.014), '#6e7c84', 0, 0.15, 0, { outline: false });
  return t;
}
/** A clipboard, ticks going down its sheet. */
function clipTool(g: THREE.Object3D) {
  const root = group(g);
  root.name = 'clipboard';
  root.rotation.x = 0.55;
  part(root, box(0.23, 0.008, 0.31), '#7b5a3a', 0, 0, 0, { outline: false });
  part(root, box(0.21, 0.003, 0.27), '#fbf8ef', 0, 0.006, 0.01, { outline: false });
  part(root, box(0.08, 0.012, 0.02), CHROME, 0, 0.008, -0.145, { outline: false });
  const lines: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    part(root, box(0.14, 0.001, 0.006), '#9aa1a7', -0.02, 0.009, -0.08 + i * 0.038, { outline: false });
    lines.push(part(root, box(0.02, 0.0015, 0.008), '#c62828', -0.09, 0.0095, -0.08 + i * 0.038, { outline: false }));
  }
  root.visible = false;
  const tick = (f: number) => lines.forEach((m, i) => (m.visible = i < 6 * clamp01(f)));
  return { root, tick };
}
const clipHeld = (root: THREE.Object3D): HeldTool => ({ tool: root, lead: 'left', grips: { left: { at: v3(0, 0, 0.03), axis: v3(-1, 0, 0), palm: v3(0, 1, 0), shape: 'flat', radius: 0.01 } } });
/** A tool's -y pointed from `p` at `to`, `p` being where it's gripped. */
function pointFrom(tool: THREE.Object3D, p: V, to: V) {
  tool.position.set(p[0], p[1], p[2]);
  tmp.set(p[0] - to[0], p[1] - to[1], p[2] - to[2]);
  if (tmp.lengthSq() > 1e-5) tool.quaternion.setFromUnitVectors(UP, tmp.normalize());
}

// =============================================================================================
// 청소차 (5 × 2).

const truckSide = painted('snTruckSide', 512, 192, (c) => {
  c.fillStyle = GREEN;
  c.fillRect(0, 0, 512, 192);
  c.fillStyle = WHITE;
  c.fillRect(0, 124, 512, 22);
  c.fillStyle = LIME;
  c.fillRect(0, 146, 512, 8);
  text(c, `${WARD} 청소`, 256, 58, 66, '#ffffff', 'center');
  text(c, '새벽을 깨끗하게', 256, 174, 24, '#ffffff', 'center', false);
});
const plateTex = painted('snPlate', 128, 64, (c) => {
  c.fillStyle = '#f7c948';
  c.fillRect(0, 0, 128, 64);
  c.strokeStyle = INK;
  c.lineWidth = 3;
  c.strokeRect(2, 2, 124, 60);
  text(c, '달빛', 64, 18, 18, INK, 'center');
  text(c, '98 바 3107', 64, 44, 22, INK, 'center');
});
function wheel(parent: THREE.Object3D, x: number, z: number): THREE.Group {
  const w = group(parent, x, 0.38, z);
  part(w, cyl(0.38, 0.38, 0.26, 20), TYRE, 0, 0, 0, { rx: Math.PI / 2 });
  part(w, cyl(0.2, 0.2, 0.27, 14), '#b8bfc4', 0, 0, 0, { rx: Math.PI / 2, outline: false });
  for (let i = 0; i < 4; i++) part(w, ball(0.024), GREY_D, 0.12 * Math.cos(i * 1.57), 0.12 * Math.sin(i * 1.57), Math.sign(z) * 0.14, { outline: false });
  return w;
}

function garbageTruck(g: THREE.Group, out: Built) {
  const rig = group(g);
  // Chassis, steps and wheels.
  part(rig, box(4.8, 0.2, 1.3), '#2d3238', -0.05, 0.62, 0);
  part(rig, box(0.25, 0.1, 1.72), BLACK, 2.28, 0.46, 0);
  for (let i = 0; i < 6; i++) part(rig, box(0.24, 0.02, 0.16), i % 2 ? '#ffcc00' : BLACK, 2.28, 0.52, -0.7 + i * 0.28, { outline: false });
  const wheels = [wheel(rig, -1.75, 0.76), wheel(rig, -1.75, -0.76), wheel(rig, 0.34, 0.76), wheel(rig, 0.34, -0.76), wheel(rig, 1.2, 0.76), wheel(rig, 1.2, -0.76)];
  for (const sz of [-1, 1]) {
    part(rig, box(1.5, 0.05, 0.3), BLACK, 0.77, 0.8, sz * 0.76, { outline: false });
    part(rig, rbox(0.9, 0.08, 0.2, 0.01), '#556066', -0.5, 0.56, sz * 0.74);
  }
  // The cab: nose at -x, the glass, the doors and the mirror, the beacon on the roof.
  part(rig, rbox(1.32, 1.3, 1.72, 0.09), WHITE, -1.76, 1.34, 0);
  part(rig, rbox(1.34, 0.26, 1.74, 0.05), GREEN, -1.76, 0.92, 0);
  const tint = new THREE.MeshToonMaterial({ color: '#23323a', transparent: true, opacity: 0.68 });
  const win = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(box(w, h, d), tint);
    m.position.set(x, y, z);
    rig.add(m);
  };
  win(0.02, 0.52, 1.46, -2.42, 1.55, 0);
  for (const sz of [-1, 1]) {
    win(0.7, 0.46, 0.02, -1.86, 1.57, sz * 0.865);
    part(rig, box(0.012, 0.86, 0.006), GREY_D, -1.42, 1.2, sz * 0.866, { outline: false });
    part(rig, box(0.012, 0.86, 0.006), GREY_D, -2.28, 1.2, sz * 0.866, { outline: false });
    part(rig, box(0.12, 0.024, 0.02), CHROME, -1.56, 1.2, sz * 0.875, { outline: false });
    part(rig, box(0.03, 0.26, 0.09), BLACK, -2.44, 1.5, sz * 0.96);
    part(rig, cyl(0.1, 0.1, 0.02, 12), GREEN_D, -1.86, 1.08, sz * 0.875, { rx: Math.PI / 2, outline: false });
    ownLit(rig, box(0.03, 0.14, 0.26), '#fff3c4', -2.43, 0.82, sz * 0.58);
    part(rig, box(0.06, 0.1, 0.2), ORANGE, -2.42, 1.03, sz * 0.66, { outline: false });
  }
  picture(rig, plateTex, 0.3, 0.14, -2.43, 0.68, 0, '#ffffff', -Math.PI / 2);
  label(rig, WARD, 0.42, 0.12, -2.43, 1.9, 0, GREEN_D, WHITE, -Math.PI / 2);
  part(rig, box(0.3, 0.08, 0.3), GREY_D, -1.8, 2.03, 0);
  const beacon = [-0.32, 0.32].map((z) => ownLit(rig, cyl(0.075, 0.08, 0.12, 12), '#7a4b12', -1.8, 2.13, z));
  // The body: panels, ribs and the ward's name each side.
  part(rig, box(2.1, 1.62, 1.7), GREEN, -0.03, 1.46, 0);
  for (let i = 0; i < 7; i++) for (const sz of [-1, 1]) part(rig, box(0.03, 1.6, 0.03), GREEN_D, -1.0 + i * 0.32, 1.46, sz * 0.86, { outline: false });
  for (const sz of [-1, 1]) picture(rig, truckSide, 1.95, 0.82, -0.03, 1.42, sz * 0.885, '#ffffff', sz > 0 ? 0 : Math.PI);
  // The body's open back, seen when the gate's up: the packed load.
  part(rig, box(0.01, 1.4, 1.5), '#111316', 1.025, 1.46, 0, { outline: false });
  for (let i = 0; i < 9; i++) part(rig, ball(0.2), i % 2 ? BAG : BAG_D, 1.04, 1.0 + (i % 3) * 0.4, -0.5 + (i % 4) * 0.33, { outline: false });

  // The tailgate: hinged at the body's top, the upper gate and the hopper under it, its side open behind guard bars.
  const gate = group(rig, 1.02, 2.27, 0);
  const G = (y: number) => y - 2.27;
  for (const sz of [-1, 1]) {
    part(gate, box(0.9, 0.96, 0.04), GREEN, 0.45, G(1.79), sz * 0.84);
    part(gate, box(1.32, 0.3, 0.04), GREY_D, 0.66, G(0.88), sz * 0.84);
    for (let i = 0; i < 3; i++) part(gate, box(0.022, 0.32, 0.022), STEEL, 0.28 + i * 0.32, G(1.16), sz * 0.85, { outline: false });
    part(gate, box(1.3, 0.03, 0.03), GREY, 0.65, G(1.03), sz * 0.86, { outline: false });
    glowing(gate, box(0.03, 0.12, 0.14), '#ff6a4a', 0.93, G(1.54), sz * 0.7);
    glowing(gate, box(0.03, 0.08, 0.14), '#ffc14d', 0.93, G(1.7), sz * 0.7);
  }
  part(gate, box(0.9, 0.04, 1.72), GREEN_D, 0.45, 0, 0);
  part(gate, box(0.04, 0.96, 1.72), GREEN_D, 0.9, G(1.79), 0);
  part(gate, box(1.32, 0.04, 1.68), '#30363b', 0.66, G(0.75), 0);
  part(gate, box(0.05, 0.26, 1.72), '#ffcc00', 1.3, G(0.88), 0);
  for (let i = 0; i < 8; i++) part(gate, box(0.06, 0.03, 0.2), BLACK, 1.33, G(0.84 + (i % 2) * 0.1), -0.72 + i * 0.205, { outline: false });
  label(gate, '손 끼임 주의', 0.5, 0.11, 0.925, G(2.0), 0, '#ffcc00', INK, Math.PI / 2);
  const workLamp = ownLit(gate, box(0.03, 0.05, 0.42), '#6f6a4e', 0.93, G(1.46), 0);
  // The blade, pivoted up in the gate: comes round from the mouth and packs what's lying in the hopper.
  const blade = group(gate, 0.72, G(1.5), 0);
  part(blade, box(0.05, 0.62, 1.54), '#8d979d', 0, -0.31, 0);
  for (const sz of [-1, 1]) part(blade, box(0.06, 0.62, 0.05), GREY_D, 0, -0.31, sz * 0.5, { outline: false });
  const bagsIn = [v3(0.82, G(0.98), -0.3), v3(0.82, G(0.98), 0.32), v3(0.54, G(1.0), 0.0)].map((p) => {
    const b = streetBag(gate);
    b.position.copy(p);
    return b;
  });
  // The rams from the chassis up to the gate.
  const rams = [-1, 1].map(() => limb(rig, 0.03, CHROME));
  const ramsOut = [-1, 1].map(() => limb(rig, 0.045, GREY_D));
  // The lever box on its post at the corner, its load lamps.
  part(rig, box(0.05, 0.56, 0.05), GREY_D, TR.lever[0], 0.78, TR.lever[2]);
  part(rig, rbox(0.14, 0.14, 0.12, 0.012), '#ffcc00', TR.lever[0], 1.08, TR.lever[2]);
  const lever = group(rig, TR.lever[0], 1.08, TR.lever[2] + 0.06);
  part(lever, cyl(0.008, 0.008, 0.1, 6), STEEL, 0, 0.05, 0, { outline: false });
  part(lever, ball(0.02), '#d32f2f', 0, 0.1, 0, { outline: false });
  const gauge = Array.from({ length: TR_ROUND }, (_, i) => ownLit(rig, box(0.02, 0.018, 0.006), '#3a4048', TR.lever[0] - 0.05 + i * 0.022, 1.03, TR.lever[2] + 0.062));
  // A pile of street bags and a bin by the kerb, while the loading goes on.
  const pile = group(g, TR.pile[0], 0.15, TR.pile[2]);
  [[0, 0, 0], [0.22, 0, 0.08], [-0.24, 0, 0.12], [0.06, 0, 0.3], [-0.02, 0.26, 0.08]].forEach(([x, y, z], i) => {
    const b = streetBag(pile, i % 2 ? BAG : BAG_D);
    b.position.set(x, y, z);
  });
  pile.visible = false;
  const bin = group(g);
  wheelieBin(bin, GREEN, '달빛 212');
  bin.visible = false;
  const cradle = limb(rig, 0.02, CHROME);
  const heldBag = streetBag(g);
  heldBag.visible = false;
  const clip = clipTool(g);
  const torch = group(g);
  torch.name = 'torch';
  part(torch, cyl(0.018, 0.018, 0.15, 10), '#263238', 0, 0, 0, { outline: false });
  part(torch, cyl(0.03, 0.02, 0.04, 10), ORANGE, 0, -0.09, 0, { outline: false });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.0, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#fff2c4', transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }));
  beam.userData.ownGeometry = beam.userData.ownMaterial = true;
  beam.position.set(0, -0.6, 0);
  torch.add(beam);
  torch.visible = false;
  let driver: Fig | null = null;
  const tools: Partial<Record<SnTool, HeldTool>> = {
    clip: clipHeld(clip.root),
    torch: { tool: torch, lead: 'right', grips: { right: { at: v3(0, 0.02, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.018 } } },
  };
  const load = standAt(g, 'snLoad', 2.95, 0.02);
  const spots: Record<string, Spot> = { snLoadBags: load, snCheckGate: standAt(g, 'snGate', 2.98, 0.84), sanitationWorker_planRoutes: standAt(g, 'snPlan', -1.75, 1.46) };
  spots['*'] = load;
  let state: 'parked' | 'leaving' | 'gone' | 'back' | undefined;
  let since = 0;
  const PULL = 10;
  const Zaxis = v3(0, 0, 1);
  drive(g, out, spots, tools, (now, N, t, _H, isOut) => {
    if (state === undefined) state = isOut ? 'gone' : 'parked';
    else if (isOut && (state === 'parked' || state === 'back')) [state, since] = ['leaving', t];
    else if (!isOut && (state === 'leaving' || state === 'gone')) [state, since] = ['back', t];
    let x = 0;
    const dt = Math.max(0, t - since);
    if (state === 'leaving') {
      const u = Math.min(1, dt / 4.5);
      x = -PULL * u * u;
      if (u >= 1) state = 'gone';
    } else if (state === 'back') {
      const u = Math.min(1, dt / 5.5);
      x = -PULL * (1 - u) * (1 - u);
      if (u >= 1) state = 'parked';
    }
    rig.position.x = x;
    rig.visible = state !== 'gone';
    const moving = state === 'leaving' || state === 'back';
    wheels.forEach((w) => (w.rotation.z = x / 0.38));
    if (moving) {
      driver ??= person(rig, { top: ORANGE, bottom: '#26323a', hair: '#1a1a1a' }, -1.72, 0.36, -Math.PI / 2, 'male', 1.0, 87);
      driver.root.visible = true;
    } else if (driver) driver.root.visible = false;
    // The beacons go round in turn whenever a truck's in use or moving.
    const running = moving || !!N;
    beacon.forEach((m, i) => setLit(m, running && wrap(t * 3 + i, 2) === 0 ? '#ffb300' : running ? '#b97912' : '#7a4b12'));
    // The gate, the rams, the blade.
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    gate.rotation.z = clamp01(n.gate) * 0.95;
    [-1, 1].forEach((sz, i) => {
      const foot = v3(0.98, 0.78, sz * 0.88);
      const head = v3(0.62, -1.28, sz * 0.88).applyAxisAngle(Zaxis, gate.rotation.z).add(gate.position);
      const mid = foot.clone().lerp(head, 0.55);
      ramsOut[i](foot, mid);
      rams[i](mid, head);
    });
    const u = clamp01(n.blade);
    const sweep = u < 0.55 ? THREE.MathUtils.smoothstep(u, 0, 0.55) : 1 - THREE.MathUtils.smoothstep(u, 0.7, 1);
    blade.rotation.z = -0.25 - sweep * 1.5;
    const bagsNow = THREE.MathUtils.clamp(n.bags ?? 0, 0, 3);
    bagsIn.forEach((b, i) => {
      b.visible = bagsNow > i + 0.4;
      b.position.x = (i === 2 ? 0.54 : 0.82) - sweep * 0.3;
      b.scale.setScalar(1 - 0.35 * sweep);
    });
    setLit(workLamp, N ? '#fff2c4' : '#6f6a4e');
    lever.rotation.x = (n.on ?? 0) > 0.5 ? -0.6 : 0;
    const fill = Math.floor(n.fill ?? 0);
    gauge.forEach((m, i) => setLit(m, i <= fill && !!N ? (i > 3 ? '#ff5252' : '#a5e04a') : '#3a4048'));
    // What the loading uses.
    const loading = now === 'snLoadBags';
    pile.visible = loading;
    at(heldBag, loading ? P.bag : null);
    bin.visible = loading;
    if (loading) {
      const b = P.bin ?? TR.binHome;
      const tip = clamp01(n.tip);
      bin.position.set(b[0] - tip * 0.08, b[1] + tip * 0.92, b[2]);
      bin.rotation.z = tip * 2.05;
      cradle(v3(2.34, 0.8, 0.42), v3(bin.position.x + 0.05, bin.position.y + 0.5, 0.42));
    } else cradle(v3(2.34, 0.8, 0.42), v3(2.34, 0.62, 0.42));
    at(clip.root, now === 'sanitationWorker_planRoutes' ? P.clip : null);
    clip.tick(n.lines ?? 0);
    const tp = now === 'snCheckGate' ? P.torch : null;
    torch.visible = !!tp;
    if (tp && P.aim) pointFrom(torch, tp, P.aim);
  });
  out.work = marker(g, TR.drop[0] + 0.5, 1.1, 0);
}

// =============================================================================================
// 재활용 선별대 (4 × 1).

const KINDS: Array<{ name: string; color: string; make: (p: THREE.Object3D) => void }> = [
  {
    name: '플라스틱',
    color: '#1e88e5',
    make: (p) => {
      part(p, cyl(0.035, 0.035, 0.15, 10), '#90caf9', 0, 0, 0, { rz: Math.PI / 2, outline: false });
      part(p, cyl(0.016, 0.016, 0.03, 8), '#1565c0', 0.09, 0, 0, { rz: Math.PI / 2, outline: false });
    },
  },
  { name: '캔·고철', color: '#90a4ae', make: (p) => void part(p, cyl(0.032, 0.032, 0.11, 10), '#cfd8dc', 0, 0, 0, { rz: Math.PI / 2, outline: false }) },
  {
    name: '유리병',
    color: '#43a047',
    make: (p) => {
      part(p, cyl(0.032, 0.032, 0.14, 10), '#2e7d32', 0, 0, 0, { rz: Math.PI / 2, outline: false });
      part(p, cyl(0.013, 0.02, 0.05, 8), '#2e7d32', 0.09, 0, 0, { rz: Math.PI / 2, outline: false });
    },
  },
  { name: '종이', color: '#b5854a', make: (p) => void part(p, rbox(0.17, 0.05, 0.13, 0.004), '#c99d63', 0, 0, 0, { outline: false }) },
];
const kgTex = (s: string) =>
  painted(`snKg|${s}`, 120, 48, (c) => {
    c.fillStyle = '#0d1a12';
    c.fillRect(0, 0, 120, 48);
    text(c, `${s} kg`, 60, 25, 28, '#7dff9a', 'center');
  });
function recycleSorter(g: THREE.Group, out: Built) {
  const L = 3.7;
  const Y = SR.y;
  const Z = SR.beltZ;
  // The frame and legs; the belt, its rollers at the ends, side rails.
  for (const x of [-1.76, -0.6, 0.6, 1.76]) for (const z of [-0.26, 0.22]) part(g, box(0.06, Y - 0.04, 0.06), GREY_D, x, (Y - 0.04) / 2, z);
  part(g, box(L, 0.08, 0.48), '#37474f', 0, Y - 0.05, Z);
  part(g, box(L, 0.012, 0.42), '#22272c', 0, Y - 0.006, Z, { outline: false });
  for (const sz of [-1, 1]) part(g, box(L, 0.08, 0.02), LIME, 0, Y + 0.03, Z + sz * 0.23);
  for (const sx of [-1, 1]) part(g, cyl(0.05, 0.05, 0.44, 12), GREY, sx * 1.84, Y - 0.05, Z, { rx: Math.PI / 2 });
  // Slats of the belt and what's coming down it.
  const slats = Array.from({ length: 22 }, () => part(g, box(0.02, 0.004, 0.42), '#3a4148', 0, Y + 0.001, Z, { outline: false }));
  const flow = Array.from({ length: 11 }, (_, i) => {
    const m = group(g, 0, Y + 0.05, Z + ((i % 3) - 1) * 0.11);
    KINDS[i % 4].make(m);
    m.rotation.y = i * 0.9;
    return m;
  });
  // The feed at the upstream end, a heap coming in.
  part(g, box(0.5, 0.3, 0.6), GREY_D, -1.72, Y + 0.28, Z);
  for (let i = 0; i < 6; i++) part(g, ball(0.09), [BAG, '#90caf9', '#c99d63'][i % 3], -1.84 + (i % 3) * 0.12, Y + 0.48 + (i % 2) * 0.05, Z - 0.16 + (i % 3) * 0.14, { outline: false });
  // The chutes behind the belt with a bin under each.
  SR.slots.forEach((x, i) => {
    const K = KINDS[i];
    part(g, box(0.5, 0.05, 0.16), K.color, x, SR.chuteY - 0.06, SR.chuteZ);
    for (const sx of [-1, 1]) part(g, box(0.02, 0.1, 0.16), K.color, x + sx * 0.25, SR.chuteY - 0.02, SR.chuteZ, { outline: false });
    part(g, box(0.5, 0.16, 0.02), K.color, x, SR.chuteY + 0.02, SR.chuteZ - 0.08, { outline: false });
    label(g, K.name, 0.4, 0.09, x, SR.chuteY + 0.13, SR.chuteZ - 0.066, K.color, '#ffffff');
    part(g, rbox(0.6, 0.52, 0.24, 0.02), K.color, x, 0.3, -0.36);
    part(g, ball(0.09), K.color, x + 0.05, 0.58, -0.36, { outline: false });
  });
  // The canopy over the line and its lit tubes: 5 a.m. in the yard.
  for (const sx of [-1, 1]) part(g, box(0.05, 2.18, 0.05), GREY_D, sx * 1.86, 1.09, -0.47);
  part(g, box(3.8, 0.04, 0.6), GREY, 0, 2.18, -0.22);
  for (const x of [-1.1, 0, 1.1]) glowing(g, box(0.9, 0.025, 0.05), '#f4f8ff', x, 2.15, -0.18);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.2), new THREE.MeshBasicMaterial({ color: '#f4f8ff', transparent: true, opacity: 0.09, depthWrite: false }));
  pool.userData.ownGeometry = pool.userData.ownMaterial = true;
  pool.rotation.x = FLAT;
  pool.position.set(0, 0.015, 0.28);
  g.add(pool);
  // Stop button; the sample scale at the downstream end.
  part(g, rbox(0.12, 0.1, 0.05, 0.01), '#ffcc00', -0.94, Y - 0.07, 0.26);
  part(g, cyl(0.03, 0.03, 0.03, 12), '#d32f2f', -0.94, Y - 0.07, 0.3, { rx: Math.PI / 2, outline: false });
  const S = SR.scale;
  part(g, box(0.44, 0.03, 0.34), GREY_D, S[0], S[1] - 0.04, S[2]);
  part(g, box(0.03, S[1] - 0.05, 0.03), GREY_D, S[0] + 0.19, (S[1] - 0.05) / 2, S[2] + 0.13);
  part(g, box(0.3, 0.02, 0.26), CHROME, S[0], S[1] - 0.015, S[2], { outline: false });
  part(g, rbox(0.16, 0.08, 0.02, 0.006), BLACK, S[0] + 0.1, S[1] - 0.09, S[2] + 0.175);
  const kgMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const kgMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.06), kgMat);
  kgMesh.userData.ownGeometry = kgMesh.userData.ownMaterial = true;
  kgMesh.position.set(S[0] + 0.1, S[1] - 0.09, S[2] + 0.187);
  g.add(kgMesh);
  const basket = group(g);
  part(basket, cyl(0.15, 0.12, 0.12, 14), ORANGE, 0, 0.06, 0);
  for (let i = 0; i < 5; i++) part(basket, ball(0.04), ['#90caf9', '#cfd8dc', '#2e7d32'][i % 3], -0.08 + i * 0.04, 0.13, 0.05 * Math.sin(i * 2), { outline: false });
  basket.visible = false;
  const clip = clipTool(g);
  const items = KINDS.map((K) => {
    const m = group(g);
    K.make(m);
    m.visible = false;
    return m;
  });
  const tools: Partial<Record<SnTool, HeldTool>> = { clip: clipHeld(clip.root) };
  const sort = standAt(g, 'snSort', 0, SR.stand);
  const spots: Record<string, Spot> = { sortRecycling: sort, sanitationWorker_analyzeWaste: standAt(g, 'snAssay', 1.46, SR.stand + 0.06) };
  spots['*'] = sort;
  const WEIGH = ['2.34', '1.86', '3.12', '2.77', '1.48'];
  let belt = 0;
  let lastT = 0;
  drive(g, out, spots, tools, (now, N, t) => {
    // The belt runs with whoever's at it; time may go either way in a script.
    if (N) belt += THREE.MathUtils.clamp(t - lastT, -0.1, 0.1) * 0.024;
    lastT = t;
    const loop = (x: number) => ((x % 1) + 1) % 1;
    slats.forEach((s, i) => (s.position.x = -1.8 + 3.6 * loop(belt * 4 + i / slats.length)));
    flow.forEach((m, i) => (m.position.x = -1.4 + 3.2 * loop(belt + i / flow.length)));
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const k = N ? wrap(N.b.n, 4) : 0;
    items.forEach((m, i) => at(m, now === 'sortRecycling' && i === k ? P.item : null));
    const assaying = now === 'sanitationWorker_analyzeWaste';
    at(basket, assaying ? P.basket : null);
    at(clip.root, assaying ? P.clip : null);
    clip.tick((n.ticks ?? 0) / 2);
    const tex = kgTex(clamp01(n.w) > 0.8 && N ? WEIGH[wrap(N.b.n, WEIGH.length)] : '0.00');
    if (kgMat.map !== tex) {
      kgMat.map = tex;
      kgMat.needsUpdate = true;
    }
  });
  out.work = marker(g, 0, Y + 0.05, Z);
}

// =============================================================================================
// 가로 청소 수레 (snStreetCart, 2 × 1).

function streetCart(g: THREE.Group, out: Built) {
  // The cart on its four wheels, a handle behind, with its lined bin.
  const cart = group(g, 0, 0, -0.08);
  part(cart, rbox(1.0, 0.04, 0.54, 0.01), ORANGE, 0, 0.3, 0);
  for (const sx of [-1, 1]) {
    part(cart, cyl(0.17, 0.17, 0.05, 16), TYRE, sx * 0.42, 0.17, -0.2, { rx: Math.PI / 2 });
    part(cart, cyl(0.17, 0.17, 0.05, 16), TYRE, sx * 0.42, 0.17, 0.2, { rx: Math.PI / 2 });
    part(cart, box(0.03, 0.9, 0.03), GREY_D, sx * 0.5, 0.75, -0.25);
  }
  part(cart, box(1.03, 0.03, 0.03), GREY_D, 0, 1.2, -0.25);
  part(cart, rbox(0.56, 0.54, 0.46, 0.02), ORANGE, CT.bin[0], 0.58, 0.04);
  part(cart, box(0.5, 0.01, 0.4), BAG_D, CT.bin[0], 0.855, 0.04, { outline: false });
  part(cart, ball(0.1), BAG, CT.bin[0] - 0.1, 0.87, 0, { outline: false });
  part(cart, box(0.56, 0.05, 0.005), REFLECT, CT.bin[0], 0.5, 0.273, { outline: false });
  label(cart, `${WARD} 가로청소`, 0.48, 0.12, CT.bin[0], 0.68, 0.272, ORANGE, '#ffffff');
  // A vest on the handle, a small rack of bags.
  part(cart, box(0.36, 0.3, 0.03), '#e65100', -0.3, 0.92, -0.2);
  part(cart, box(0.36, 0.04, 0.032), REFLECT, -0.3, 0.92, -0.2, { outline: false });
  for (let i = 0; i < 3; i++) part(cart, rbox(0.3, 0.03, 0.2, 0.01), BAG, -0.28, 0.34 + i * 0.03, 0, { outline: false });
  const broom = broomTool(g, CT.broomRest);
  const pan = panTool(g, CT.panRest);
  const B = longTool(broom, 1.4, 0.3, true);
  const D = longTool(pan, 1.15, 0.2, false);
  // The tongs, hung on the cart's front: tips down.
  const tongs = group(g, CT.tongsRest[0], CT.tongsRest[1], CT.tongsRest[2]);
  tongs.name = 'litterTongs';
  part(tongs, cyl(0.016, 0.016, 0.14, 8), '#263238', 0, 0, 0, { outline: false });
  const jaws = [-1, 1].map((s) => {
    const j = group(tongs, s * 0.01, -0.05, 0);
    part(j, box(0.012, 0.6, 0.012), STEEL, 0, -0.3, 0, { outline: false });
    part(j, box(0.03, 0.05, 0.016), GREY_D, 0, -0.61, 0, { outline: false });
    return j;
  });
  const hoop = group(g);
  part(hoop, ring(0.12, 0.008), CHROME, 0, 0, 0, { rx: Math.PI / 2, outline: false });
  part(hoop, cyl(0.12, 0.09, 0.36, 12), BAG, 0, -0.18, 0, { outline: false });
  hoop.visible = false;
  // On the floor: leaves and paper to sweep, and the three butts.
  const leaves = Array.from({ length: 22 }, (_, i) => {
    const m = part(g, box(0.05, 0.004, 0.035), ['#a1887f', '#c8a96a', '#8d6e63', '#ececec'][i % 4], 0, 0.006, 0, { outline: false });
    m.rotation.y = i * 1.3;
    const a = i * 2.4;
    const r = 0.25 + (i % 5) * 0.11;
    const home = v3(0.12 + r * 1.3 * Math.cos(a), 0.006, 1.45 + r * 0.42 * Math.sin(a));
    m.position.copy(home);
    return { m, home };
  });
  const heapAt = v3(CT.heap[0], 0.012, CT.heap[2]);
  const butts = CT.butts.map(([x, z]) => part(g, cyl(0.006, 0.006, 0.03, 6), '#e8d9b8', x, 0.012, z, { rz: Math.PI / 2, outline: false }));
  const dust = part(g, ball(0.06), '#8d6e63', 0, 0, 0, { outline: false });
  dust.visible = false;
  const tools: Partial<Record<SnTool, HeldTool>> = {
    broom: { tool: broom, lead: 'right', grips: B.grips, anchor: B.tip, lean: 0.2, nod: 0.42 },
    broomRest: { tool: broom, lead: 'right', grips: B.grips, resting: true, lean: 0.2, nod: 0.25 },
    broomCarry: { tool: broom, lead: 'right', grips: { right: B.grips.right }, lean: 0.12, nod: 0.3 },
    pan: { tool: pan, lead: 'right', grips: D.grips, anchor: D.tip, lean: 0.2, nod: 0.42 },
    panRest: { tool: pan, lead: 'right', grips: D.grips, resting: true, lean: 0.2, nod: 0.25 },
    panFree: { tool: pan, lead: 'right', grips: D.grips, lean: 0.14, nod: 0.3 },
    tongs: { tool: tongs, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.016 } } },
  };
  const spots: Record<string, Spot> = { snSweepStreet: standAt(g, 'snSweep', 0.06, 0.8), snPickLitter: standAt(g, 'snTongs', 0, 0.72) };
  spots['*'] = spots.snSweepStreet;
  drive(g, out, spots, tools, (now, N, _t, H) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const sweeping = now === 'snSweepStreet';
    // The broom's spin turns its head across the stroke; the pan's stays square.
    B.place(sweeping ? P.broom : null, N, H, clamp01(n.rest), n.bspin ?? Math.PI / 2);
    D.place(sweeping ? P.pan : null, N, H, clamp01(n.prest, 1), 0);
    const s = sweeping ? clamp01(n.swept) : 0;
    leaves.forEach((l) => {
      l.m.position.lerpVectors(l.home, heapAt, Math.min(1, s * 1.18));
      l.m.visible = s < 0.98;
    });
    dust.visible = sweeping && clamp01(n.loaded) > 0.5;
    if (dust.visible) {
      pan.updateWorldMatrix(true, false);
      dust.position.copy(g.worldToLocal(pan.localToWorld(v3(0, 0.04, 0.08))));
    }
    const picking = now === 'snPickLitter';
    at(hoop, picking ? P.bag : null);
    if (picking && P.tongs && P.tip) pointFrom(tongs, P.tongs, P.tip);
    else {
      const p = (picking && P.tongs) || CT.tongsRest;
      tongs.position.set(p[0], p[1], p[2]);
      tongs.quaternion.identity();
    }
    jaws.forEach((j, i) => (j.rotation.z = (i ? 1 : -1) * 0.05 * (1 - clamp01(n.snap))));
    butts.forEach((b, i) => (b.visible = !picking || (n[`g${i}`] ?? 0) < 0.5));
  });
  out.work = marker(g, 0, 0.9, 0.1);
}

// =============================================================================================
// 제설함 (snSandBox, 2 × 1).

function sandBox(g: THREE.Group, out: Built) {
  // The yellow box the ward leaves at every hill, the sand in it, its lid; the sacks beside it.
  const X = -0.2;
  part(g, box(1.3, 0.66, 0.04), '#fbc02d', X, 0.37, 0.2);
  part(g, box(1.3, 0.66, 0.04), '#f9a825', X, 0.37, -0.42);
  for (const sx of [-1, 1]) part(g, box(0.04, 0.66, 0.62), '#f9a825', X + sx * 0.65, 0.37, -0.11);
  part(g, box(1.3, 0.04, 0.62), '#a57f1a', X, 0.06, -0.11);
  part(g, rbox(1.24, 0.34, 0.56, 0.02), '#c9ad7f', X, 0.34, -0.11, { outline: false });
  for (let i = 0; i < 6; i++) part(g, ball(0.14), '#c2a374', X - 0.4 + i * 0.16, 0.54, -0.1 + 0.1 * Math.sin(i * 2), { outline: false });
  label(g, '제설함', 0.62, 0.22, X, 0.44, 0.222, '#fbc02d', '#c62828');
  label(g, `${WARD} 청소과`, 0.42, 0.08, X, 0.22, 0.222, '#fbc02d', INK);
  const lid = group(g, X, 0.7, -0.42);
  part(lid, rbox(1.34, 0.04, 0.66, 0.01), '#f9a825', 0, 0.02, 0.32);
  part(lid, box(0.2, 0.03, 0.03), GREY_D, 0, 0.05, 0.6, { outline: false });
  for (let i = 0; i < 3; i++) part(g, rbox(0.38, 0.14, 0.26, 0.04), i === 1 ? '#e0e0e0' : '#eceff1', 0.8, 0.07 + i * 0.13, -0.28);
  label(g, '염화칼슘', 0.24, 0.06, 0.8, 0.33, -0.148, '#eceff1', '#1565c0');
  const shovel = shovelTool(g, SB.rest);
  const S = longTool(shovel, 0.95, 0.26, true);
  // The barrow in the row in front, with what's been thrown in it.
  const bar = group(g, SB.barrow[0], 0, SB.barrow[2]);
  bar.rotation.y = 0.2;
  part(bar, cyl(0.12, 0.12, 0.05, 14), TYRE, 0, 0.12, 0.48, { rx: Math.PI / 2 });
  part(bar, rbox(0.54, 0.22, 0.56, 0.05), '#546e7a', 0, 0.42, 0.04);
  part(bar, box(0.46, 0.02, 0.48), '#3b4a52', 0, 0.54, 0.04, { outline: false });
  for (const sx of [-1, 1]) {
    rod(bar, v3(sx * 0.2, 0.34, -0.5), v3(sx * 0.03, 0.14, 0.46), 0.015, GREY_D);
    part(bar, box(0.03, 0.34, 0.03), GREY_D, sx * 0.18, 0.17, -0.2);
  }
  const heap = part(bar, ball(0.22), '#c2a374', 0, 0.54, 0.04, { outline: false });
  const clod = part(g, ball(0.09), '#c2a374', 0, 0, 0, { outline: false });
  clod.visible = false;
  const fly = part(g, ball(0.04), '#c2a374', 0, 0, 0, { outline: false });
  fly.visible = false;
  const tools: Partial<Record<SnTool, HeldTool>> = {
    shovelRest: { tool: shovel, lead: 'right', grips: S.grips, resting: true, lean: 0.2, nod: 0.25 },
    shovelFree: { tool: shovel, lead: 'right', grips: S.grips, lean: 0.26, nod: 0.4 },
    shovelCarry: { tool: shovel, lead: 'right', grips: { right: S.grips.right }, lean: 0.2, nod: 0.3 },
  };
  const s = standAt(g, 'snSand', -0.2, SB.stance[1]);
  const spots: Record<string, Spot> = { snShovelSand: s, '*': s };
  drive(g, out, spots, tools, (_now, N, t, H) => {
    const n = N?.n ?? {};
    const P = N?.props ?? {};
    S.place(N ? P.shovel : null, N, H, clamp01(n.rest), Math.PI / 2 - 0.2);
    lid.rotation.x = -clamp01(n.lid) * 1.7;
    const full = clamp01((n.tossed ?? 2) / 6);
    heap.scale.set(1 + full * 0.5, 0.3 + full * 0.9, 1 + full * 0.5);
    clod.visible = (n.load ?? 0) > 0.5;
    if (clod.visible) {
      shovel.updateWorldMatrix(true, false);
      clod.position.copy(g.worldToLocal(shovel.localToWorld(v3(0, 0.1, 0.03))));
    }
    const tn = clamp01(n.turn);
    fly.visible = tn > 0.1 && tn < 0.95;
    if (fly.visible) fly.position.set(SB.barrow[0] - 0.05 + 0.04 * Math.sin(t * 30), 0.7 - 0.2 * tn, SB.barrow[2]);
  });
  out.work = marker(g, -0.2, 0.7, 0.1);
}

// =============================================================================================
// 장비·조끼 보관함 (snLocker, 3 × 1).

function vestMesh(parent: THREE.Object3D): THREE.Group {
  const m = group(parent);
  part(m, rbox(0.38, 0.52, 0.06, 0.03), ORANGE, 0, 0, 0);
  for (const y of [-0.16, 0.06]) part(m, box(0.39, 0.05, 0.065), REFLECT, 0, y, 0, { outline: false });
  for (const sx of [-1, 1]) part(m, box(0.05, 0.5, 0.065), REFLECT, sx * 0.09, 0, 0, { outline: false });
  part(m, box(0.12, 0.05, 0.065), '#263238', 0, 0.25, 0, { outline: false });
  return m;
}
function locker(g: THREE.Group, out: Built) {
  const Z = LK.face;
  const W = 0.94;
  const H = 1.95;
  const LEFT = -0.94;
  // The carcase and its inside; shelves and rail in the first, two shut.
  part(g, box(2.86, H, 0.03), GREY_D, 0, H / 2, -0.47);
  for (const sx of [-1.43, -0.47, 0.47, 1.43]) part(g, box(0.03, H, 0.34), '#546e7a', sx, H / 2, -0.3);
  part(g, box(2.88, 0.04, 0.36), '#546e7a', 0, H + 0.01, -0.3);
  part(g, box(2.88, 0.08, 0.36), BLACK, 0, 0.04, -0.3);
  part(g, cyl(0.009, 0.009, 0.88, 8), CHROME, LEFT, 1.72, -0.3, { rz: Math.PI / 2, outline: false });
  part(g, box(0.9, 0.02, 0.3), GREY, LEFT, 0.9, -0.3);
  part(g, box(0.9, 0.02, 0.3), GREY, LEFT, 0.46, -0.3);
  const extra = vestMesh(g);
  extra.position.set(LEFT + 0.26, 1.44, -0.3);
  extra.rotation.y = 0.12;
  const vest = vestMesh(g);
  vest.position.set(LK.vest[0], LK.vest[1], LK.vest[2]);
  const gloves = Array.from({ length: 3 }, (_, i) => {
    const m = group(g, LK.gloves[0] + (i - 1) * 0.2, LK.gloves[1] - 0.04, LK.gloves[2] - 0.2);
    part(m, rbox(0.15, 0.04, 0.09, 0.015), '#f5ecd2', 0, 0, 0);
    part(m, box(0.06, 0.042, 0.08), GREEN, 0.06, 0, 0, { outline: false });
    return m;
  });
  const glove = group(g);
  part(glove, rbox(0.1, 0.04, 0.08, 0.015), '#f5ecd2', 0, 0, 0, { outline: false });
  glove.visible = false;
  for (let i = 0; i < 2; i++) part(g, cyl(0.1, 0.1, 0.12, 12), '#ffca28', LEFT - 0.2 + i * 0.4, 0.54, -0.3);
  // The doors with vents and name cards. The left swings on its hinge; the others stay shut.
  const door = (x: number, parent: THREE.Object3D, no: string, dz = 0) => {
    part(parent, box(W - 0.03, H - 0.12, 0.03), GREY, x, H / 2 + 0.03, dz);
    for (let i = 0; i < 4; i++) part(parent, box(0.36, 0.012, 0.006), GREY_D, x, 1.72 - i * 0.04, dz + 0.018, { outline: false });
    label(parent, no, 0.34, 0.08, x, 1.45, dz + 0.018, WHITE, INK);
    part(parent, box(0.03, 0.14, 0.03), CHROME, x + 0.36, 1.1, dz + 0.03, { outline: false });
  };
  const hinge = group(g, LEFT - W / 2 + 0.03, 0, Z);
  door(W / 2 - 0.03, hinge, '조끼·안전모');
  door(0, g, '장갑·마스크', Z);
  door(0.94, g, '삽·집게', Z);
  // On top a row of hard hats.
  for (let i = 0; i < 4; i++) {
    part(g, ball(0.11), ['#fafafa', '#ffca28', '#fafafa', ORANGE][i], -0.9 + i * 0.6, H + 0.08, -0.28);
    part(g, box(0.28, 0.016, 0.26), BLACK, -0.9 + i * 0.6, H + 0.03, -0.26, { outline: false });
  }
  label(g, `${WARD} 환경공무관 · 안전이 먼저입니다`, 1.8, 0.11, 0, 2.28, -0.3, GREEN, '#ffffff');
  const spots: Record<string, Spot> = { snGearUp: standAt(g, 'snGear', -0.86, 0.46) };
  spots['*'] = spots.snGearUp;
  drive(g, out, spots, {}, (_n, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    hinge.rotation.y = -clamp01(n.door) * 1.9;
    at(vest, N ? P.vest : LK.vest, LK.vest);
    at(glove, N ? P.glove : null);
    gloves[0].visible = (n.gl ?? 0) < 0.5;
  });
  out.work = marker(g, -0.86, 1.2, -0.1);
}

// =============================================================================================
// 노선 배차판 (snRouteBoard, 2 × 1).

const ROUTES = ['1 달빛1동·시장길', '2 달빛2동 언덕', '3 솔내마을 골목', '4 강변로 상가', '5 은행골 아파트', '6 나루터 재활용'];
const boardTex = painted('snBoard', 640, 426, (c) => {
  c.fillStyle = '#f7f8f4';
  c.fillRect(0, 0, 640, 426);
  RB.rows.forEach((y, i) => {
    const py = ((2.01 - y) / 1.2) * 426;
    c.fillStyle = i % 2 ? '#eef2e6' : '#ffffff';
    c.fillRect(0, py - 30, 640, 60);
    text(c, ROUTES[i], 14, py + 1, 20, INK);
  });
  c.fillStyle = GREEN;
  c.fillRect(0, 0, 640, 24);
  text(c, '오늘의 노선 배차', 14, 13, 16, '#ffffff');
  ['1호차', '2호차', '대기'].forEach((s, i) => text(c, s, ((RB.cols[i] + 0.9) / 1.8) * 640, 13, 16, '#ffffff', 'center'));
});
function routeBoard(g: THREE.Group, out: Built) {
  // A board on two posts, roofed against the rain, a lit tube to read it by.
  for (const sx of [-1, 1]) part(g, box(0.07, 2.34, 0.07), GREY_D, sx * 0.93, 1.17, RB.face - 0.08);
  part(g, box(1.86, 1.26, 0.04), '#37474f', 0, 1.41, RB.face - 0.02);
  picture(g, boardTex, 1.8, 1.2, 0, 1.41, RB.face + 0.004);
  part(g, box(2.04, 0.04, 0.46), GREY, 0, 2.34, RB.face + 0.1);
  glowing(g, box(1.3, 0.025, 0.05), '#f4f8ff', 0, 2.3, RB.face + 0.18);
  part(g, box(1.7, 0.03, 0.08), '#37474f', 0, 0.82, RB.face + 0.04);
  part(g, cyl(0.009, 0.009, 0.13, 6), '#c62828', 0.76, 0.84, RB.face + 0.04, { rz: Math.PI / 2, outline: false });
  const mags = RB.rows.map((_, i) => {
    const m = group(g);
    part(m, cyl(0.034, 0.034, 0.016, 12), ['#d32f2f', '#1565c0', '#f9a825'][i % 3], 0, 0, 0.008, { rx: Math.PI / 2, outline: false });
    return m;
  });
  const spots: Record<string, Spot> = { snCheckRoute: standAt(g, 'snBoard', 0.1, 0.12) };
  spots['*'] = spots.snCheckRoute;
  drive(g, out, spots, {}, (_n, N) => {
    const active = N ? wrap(N.b.n, RB.rows.length) : -1;
    mags.forEach((m, i) => {
      const p = i === active && N?.props.magnet ? N.props.magnet : magnetAt(i, wrap(i * 2, 3));
      m.position.set(p[0], p[1], p[2]);
    });
  });
  out.work = marker(g, 0, 1.4, RB.face);
}

// =============================================================================================
// 봉투 집하장 (snBinRow, 3 × 1).

function binRow(g: THREE.Group, out: Built) {
  part(g, box(2.9, 0.03, 0.9), '#6d7479', 0, 0.015, 0, { outline: false });
  for (const sx of [-1, 1]) part(g, box(0.06, 1.3, 0.06), GREY_D, sx * 1.4, 0.65, -0.44);
  part(g, box(2.86, 0.2, 0.02), GREEN, 0, 1.2, -0.44);
  label(g, `${WARD} 종량제 봉투 집하장`, 1.5, 0.15, 0, 1.2, -0.425, GREEN, '#ffffff');
  [GREEN, GREY, GREEN, '#1e88e5', GREY].forEach((c, i) => {
    const b = wheelieBin(g, c, `달빛 ${201 + i}`);
    b.position.set(-1.1 + i * 0.55, 0.02, -0.2);
  });
  const stack = (base: V) =>
    Array.from({ length: BR_N }, (_, i) => {
      const b = streetBag(g, i % 2 ? BAG : BAG_D);
      b.position.set(base[0] + (i % 2) * 0.24 - 0.12, base[1] + (i > 1 ? 0.24 : 0), base[2] + (i % 3) * 0.05);
      return b;
    });
  const left = stack(BR.from);
  const right = stack(BR.to);
  const carried = streetBag(g);
  carried.visible = false;
  const spots: Record<string, Spot> = { snStackBags: standAt(g, 'snBags', 0, 0.8) };
  spots['*'] = spots.snStackBags;
  drive(g, out, spots, {}, (_n, N) => {
    const m = N ? THREE.MathUtils.clamp(Math.floor(N.n.moved ?? 0), 0, BR_N) : 1;
    left.forEach((b, i) => (b.visible = BR_N - 1 - i >= m + (N?.props.bag ? 1 : 0)));
    right.forEach((b, i) => (b.visible = i < m));
    at(carried, N?.props.bag ?? null);
  });
  out.work = marker(g, 0, 0.6, 0.3);
}

// =============================================================================================
// 대형 폐기물 보관장 (snBulkYard, 3 × 1).

function bulkYard(g: THREE.Group, out: Built) {
  part(g, box(2.92, 0.04, 0.94), '#8b8f8e', 0, 0.02, 0, { outline: false });
  const tan = '#a07c5a';
  // The sofa, its cushion a little sagged.
  part(g, rbox(1.24, 0.24, 0.44, 0.05), tan, -0.4, 0.28, 0.24);
  part(g, rbox(1.24, 0.58, 0.2, 0.06), tan, -0.4, 0.46, 0.02);
  for (const sx of [-1, 1]) part(g, rbox(0.14, 0.42, 0.56, 0.05), '#8f6d4e', -0.4 + sx * 0.64, 0.3, 0.16);
  part(g, rbox(0.55, 0.1, 0.4, 0.04), '#b58f6a', -0.7, 0.45, 0.26);
  // A chest of drawers, a mattress on its side at the back, a chair upside down on the chest.
  part(g, rbox(0.72, 0.84, 0.44, 0.015), '#c4a57c', 0.92, 0.46, 0.1);
  for (let i = 0; i < 3; i++) {
    part(g, box(0.64, 0.22, 0.012), '#b0916a', 0.92, 0.2 + i * 0.26, 0.325, { outline: false });
    part(g, box(0.1, 0.018, 0.018), GREY_D, 0.92, 0.2 + i * 0.26, 0.34, { outline: false });
  }
  part(g, rbox(1.6, 0.92, 0.17, 0.05), '#eceff1', -0.3, 1.0, -0.33);
  part(g, box(0.34, 0.03, 0.34), '#8d6e63', 0.9, 0.9, 0.1);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.03, 0.3, 0.03), '#8d6e63', 0.9 + sx * 0.14, 1.06, 0.1 + sz * 0.14);
  label(g, '대형 폐기물 · 스티커 확인 후 수거', 1.5, 0.11, -0.3, 1.34, -0.24, GREEN, '#ffffff');
  // The fee sticker: the one that goes on, and those on the chest already.
  const stickerTex = painted('snSticker', 96, 64, (c) => {
    c.fillStyle = '#ffee58';
    c.fillRect(0, 0, 96, 64);
    c.strokeStyle = '#c62828';
    c.lineWidth = 3;
    c.strokeRect(3, 3, 90, 58);
    text(c, WARD, 48, 22, 18, '#c62828', 'center');
    text(c, '납부필', 48, 44, 18, INK, 'center');
  });
  picture(g, stickerTex, 0.14, 0.09, 0.92, 0.46, 0.333);
  const onSofa = picture(g, stickerTex, 0.14, 0.09, BK.sticker[0], BK.sticker[1], BK.sticker[2]);
  const tag = group(g);
  picture(tag, stickerTex, 0.14, 0.09, 0, 0, 0.002);
  tag.visible = false;
  const slip = group(g);
  part(slip, box(0.14, 0.2, 0.004), '#fbf8ef', 0, 0, 0, { outline: false });
  part(slip, box(0.1, 0.01, 0.006), '#9aa1a7', 0, 0.05, 0, { outline: false });
  part(slip, box(0.1, 0.01, 0.006), '#9aa1a7', 0, 0.02, 0, { outline: false });
  slip.rotation.x = -0.5;
  slip.visible = false;
  const spots: Record<string, Spot> = { snTagBulk: standAt(g, 'snBulk', -0.36, 0.8) };
  spots['*'] = spots.snTagBulk;
  drive(g, out, spots, {}, (_n, N) => {
    const P = N?.props ?? {};
    onSofa.visible = !N || (N.n.stuck ?? 0) > 0.5;
    at(tag, N ? P.tag : null);
    at(slip, N ? P.slip : null);
  });
  out.work = marker(g, BK.sticker[0], BK.sticker[1], BK.sticker[2]);
}

// =============================================================================================
// 보리차 통 (snTeaUrn, 1 × 1).

function teaUrn(g: THREE.Group, out: Built) {
  const T = UR.T;
  part(g, rbox(0.86, 0.04, 0.6, 0.012), '#a1887f', 0, T - 0.02, -0.04);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.04, T - 0.04, 0.04), '#6d4c41', sx * 0.38, (T - 0.04) / 2, -0.04 + sz * 0.24);
  part(g, box(0.76, 0.02, 0.5), '#8d6e63', 0, 0.22, -0.04);
  // The urn: steel, its lid and tap, a lit lamp, a drip tray.
  const X = UR.tap[0];
  part(g, cyl(0.15, 0.17, 0.42, 20), STEEL, X, T + 0.27, -0.16);
  part(g, cyl(0.16, 0.16, 0.03, 20), CHROME, X, T + 0.49, -0.16);
  part(g, ball(0.024), BLACK, X, T + 0.52, -0.16, { outline: false });
  part(g, cyl(0.014, 0.014, 0.12, 8), CHROME, X, UR.tap[1], -0.03, { rx: Math.PI / 2, outline: false });
  part(g, rbox(0.04, 0.05, 0.04, 0.008), BLACK, X, UR.tap[1] + 0.03, UR.tap[2]);
  part(g, rbox(0.2, 0.02, 0.16, 0.006), GREY, X, T + 0.012, 0.04);
  glowing(g, ball(0.012), '#ff5252', X + 0.08, T + 0.09, -0.016);
  label(g, '보리차', 0.18, 0.08, X, T + 0.26, 0.002, '#6d4c41', '#fff8e1');
  part(g, box(0.72, 0.1, 0.02), GREY_D, 0, T + 0.62, -0.345);
  label(g, `${WARD} 청소반 · 수고하셨습니다`, 0.7, 0.07, 0, T + 0.62, -0.33, GREEN, '#ffffff');
  for (const sx of [-1, 1]) part(g, box(0.02, T + 0.6, 0.02), GREY_D, sx * 0.36, (T + 0.6) / 2, -0.345);
  // A stack of paper cups, a jar of sugar, a towel.
  for (let i = 0; i < 7; i++) part(g, cyl(0.036, 0.028, 0.02, 10), '#fafafa', UR.stack[0], T + 0.012 + i * 0.012, UR.stack[2]);
  part(g, cyl(0.04, 0.04, 0.1, 10), '#ffcc80', 0.14, T + 0.05, -0.18);
  part(g, rbox(0.2, 0.03, 0.14, 0.01), '#eceff1', 0.27, T + 0.016, -0.18);
  const cup = group(g);
  cup.name = 'paperCup';
  part(cup, cyl(0.036, 0.028, 0.08, 10), '#fafafa', 0, 0, 0, { outline: false });
  const tea = part(cup, cyl(0.03, 0.03, 0.004, 10), '#a87a3a', 0, 0.03, 0, { outline: false });
  cup.visible = false;
  const pour = part(g, cyl(0.006, 0.006, 0.09, 6), '#a87a3a', UR.under[0], UR.under[1] + 0.06, UR.under[2], { outline: false });
  pour.visible = false;
  const steam = [0, 1, 2].map(() => {
    const m = new THREE.Mesh(ball(0.016), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false }));
    m.userData.ownMaterial = true;
    m.visible = false;
    g.add(m);
    return m;
  });
  const tools: Partial<Record<SnTool, HeldTool>> = { cup: { tool: cup, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'cradle', radius: 0.034 } } } };
  const spots: Record<string, Spot> = { snDrinkTea: standAt(g, 'snTea', 0.02, 0.58) };
  spots['*'] = spots.snDrinkTea;
  const axis = new THREE.Vector3();
  drive(g, out, spots, tools, (_n, N, t) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    at(cup, N ? P.cup : null);
    const f = clamp01(n.tea);
    tea.visible = f > 0.05;
    tea.position.y = -0.03 + 0.06 * f;
    pour.visible = (n.pour ?? 0) > 0.5;
    if (N && P.cup) {
      // Tipped towards them on the way to the mouth.
      axis.set(Math.cos(N.st.yaw), 0, -Math.sin(N.st.yaw));
      cup.quaternion.setFromAxisAngle(axis, -clamp01(n.tilt));
    }
    const hot = (n.steam ?? 0) > 0.5 && !!P.cup;
    steam.forEach((m, i) => {
      m.visible = hot;
      if (hot && P.cup) m.position.set(P.cup[0] + 0.01 * Math.sin(t * 2 + i), P.cup[1] + 0.05 + (((t * 0.3 + i * 0.33) % 1) + 1) % 1 * 0.14, P.cup[2]);
    });
  });
  out.work = marker(g, X, T + 0.1, 0.05);
}

// =============================================================================================
// 차고지 등 (snLamp, 1 × 1): a tall yard light with its pool on the ground.

function yardLamp(g: THREE.Group) {
  part(g, cyl(0.13, 0.15, 0.14, 12), '#8b8f8e', 0, 0.07, 0);
  part(g, cyl(0.035, 0.05, 3.6, 10), GREY, 0, 1.9, 0);
  part(g, box(0.04, 0.04, 0.6), GREY, 0, 3.68, 0.26);
  part(g, rbox(0.3, 0.06, 0.34, 0.02), GREY_D, 0, 3.66, 0.54);
  glowing(g, box(0.24, 0.015, 0.28), '#fff2c4', 0, 3.625, 0.54);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1.5, 28), new THREE.MeshBasicMaterial({ color: '#fff2c4', transparent: true, opacity: 0.11, depthWrite: false }));
  pool.userData.ownGeometry = pool.userData.ownMaterial = true;
  pool.rotation.x = FLAT;
  pool.position.set(0, 0.014, 0.54);
  g.add(pool);
}

export const BUILDERS: Record<string, Builder> = {
  // The 재활용 선별장's pieces (2026-11-04, the branch lots).
  rcHopper(g, W, D) {
    rcHopper(g, W, D);
  },
  rcConveyor(g, W, D) {
    rcConveyor(g, W, D);
  },
  rcDropBays(g, W, D) {
    rcDropBays(g, W, D);
  },
  rcBaler(g, W, D) {
    rcBaler(g, W, D);
  },
  rcBales(g, W, D) {
    rcBales(g, W, D);
  },
  rcScaleHouse(g, W, D) {
    rcScaleHouse(g, W, D);
  },
  rcBatteryBin(g, W, D) {
    rcBatteryBin(g, W, D);
  },
  garbageTruck(g, _W, _D, _c, _def, _ctx, out) {
    garbageTruck(g, out);
  },
  recycleSorter(g, _W, _D, _c, _def, _ctx, out) {
    recycleSorter(g, out);
  },
  snStreetCart(g, _W, _D, _c, _def, _ctx, out) {
    streetCart(g, out);
  },
  snSandBox(g, _W, _D, _c, _def, _ctx, out) {
    sandBox(g, out);
  },
  snLocker(g, _W, _D, _c, _def, _ctx, out) {
    locker(g, out);
  },
  snRouteBoard(g, _W, _D, _c, _def, _ctx, out) {
    routeBoard(g, out);
  },
  snBinRow(g, _W, _D, _c, _def, _ctx, out) {
    binRow(g, out);
  },
  snBulkYard(g, _W, _D, _c, _def, _ctx, out) {
    bulkYard(g, out);
  },
  snTeaUrn(g, _W, _D, _c, _def, _ctx, out) {
    teaUrn(g, out);
  },
  snLamp(g) {
    yardLamp(g);
  },
  /**
   * 차고지 울타리·출입문 (2026-11-04, the layout audit): the mesh fence round the yard, the vehicle gateway the width of the two bays
   * (its folding gates folded back to the posts, so the trucks pull straight out onto the street), the walk-in gate by the office,
   * the bays' lines and the yellow 출차로 in front of them, and the lean-to roof over the sorting belt at the back.
   */
  snYardFence(g) {
    yardFence(g);
  },
};

// ---------------------------------------------------------------------------------------------
// The yard's fence, gates, lines and the sorting roof (2026-11-04, the layout audit). Placed at the lot's (0, 0) tile: lot x is at(x).

const NO_LINE = { outline: false };
const floorLine = (g: THREE.Object3D, w: number, d: number, x: number, z: number, color: string) => part(g, box(w, 0.004, d), color, x, 0.012, z, NO_LINE);

/** A 자바라 folding gate folded up against its post: the slats zig-zagged in a bundle, the top and bottom rails. */
function foldedGate(g: THREE.Object3D, x: number, z: number, dir: 1 | -1) {
  for (let i = 0; i < 9; i++) part(g, box(0.03, 1.55, 0.03), '#78909c', x + dir * i * 0.043, 0.85, z + (i % 2 ? 0.1 : -0.1), NO_LINE);
  for (const y of [0.08, 1.65]) part(g, rbox(0.4, 0.06, 0.12, 0.02), '#90a4ae', x + dir * 0.17, y, z);
}

function yardFence(g: THREE.Group) {
  const at = (x: number) => x - 0.5;
  const S = 14.5 - 0.5;
  const top = -0.5;
  // Round the yard: the back along the whole lot (the strip behind the office inside it too), the west side, the east end.
  fenceRun(g, at(0), top, at(26), top);
  fenceRun(g, at(0), top, at(0), S);
  fenceRun(g, at(26), top, at(26), top + 1);
  // The front: the vehicle gateway (x 0.2–7.8), the fence, the walk-in gate at the path (x 11.4–12.6), the fence to the office.
  fenceRun(g, at(7.82), S, at(11.4), S);
  fenceRun(g, at(12.6), S, at(14), S);
  for (const x of [0.18, 7.82]) part(g, rbox(0.3, 2.0, 0.3, 0.04), '#cfd8dc', at(x), 1.0, S);
  foldedGate(g, at(0.37), S, 1);
  foldedGate(g, at(7.63), S, -1);
  floorLine(g, 7.4, 0.08, at(4), S, '#37474f');
  label(g, `${WARD} 청소차고지`, 1.5, 0.32, at(7.82), 2.3, S + 0.2, GREEN, '#ffffff');
  label(g, '차량 출입 · 후진 주의', 1.2, 0.18, at(9.6), 1.5, S + 0.03, '#ffcc00', INK);
  for (const x of [11.4, 12.6]) part(g, box(0.08, 1.9, 0.08), '#5f7d6a', at(x), 0.95, S);
  // The open walk-in gate, swung back along the fence.
  part(g, box(0.9, 1.5, 0.03), '#6f8f7a', at(10.9), 0.85, S - 0.12);
  // The bays: white lines round the two trucks, their numbers at the tail end; the yellow lane out in front of them to the gate.
  for (const [x0, x1] of [[0.6, 3.4], [4.6, 7.4]]) {
    for (const x of [x0, x1]) floorLine(g, 0.1, 6, at(x), 5.5 - 0.5, '#f5f5f5');
    floorLine(g, x1 - x0, 0.1, at((x0 + x1) / 2), 2.5 - 0.5, '#f5f5f5');
  }
  ['1', '2'].forEach((n, i) => (label(g, n, 0.45, 0.45, at(2 + i * 4), 0.014, 2.85 - 0.5, '#55595e', '#f5f5f5').rotation.x = FLAT));
  for (const x of [0.6, 7.4]) floorLine(g, 0.12, 6, at(x), 11.5 - 0.5, '#fbc02d');
  label(g, '출차로 · 정차 금지', 1.6, 0.4, at(4), 0.014, 13.4 - 0.5, '#3d4144', '#fbc02d').rotation.x = FLAT;
  // The lean-to over the sorting belt (임시 분리 작업장): posts on the back fence, the roof sloping out over the belt, braced.
  const roofZ = 1.1 - 0.5;
  for (const x of [6.85, 11.15]) {
    part(g, box(0.12, 3.1, 0.12), '#90a4ae', at(x), 1.55, top + 0.1);
    rod(g, v3(at(x), 2.2, top + 0.1), v3(at(x), 2.85, top + 1.8), 0.04, '#90a4ae');
  }
  const roof = part(g, box(4.6, 0.06, 2.3), '#b0bec5', at(9), 2.95, roofZ);
  roof.rotation.x = 0.08;
  part(g, box(4.6, 0.2, 0.05), GREEN, at(9), 2.85, roofZ + 1.15);
  label(g, '임시 분리 작업장', 1.3, 0.16, at(9), 2.85, roofZ + 1.18, GREEN, '#ffffff');
}

// ---------------------------------------------------------------------------------------------
// The 재활용 선별장's pieces (2026-11-04, the branch lots: workFurniture/sanitationWorker.ts). The centre's city is made up.

const RC_GREEN = '#2e7d32';
const RC_YELLOW = '#f9a825';
const RC_JUNK = ['#42a5f5', '#e0e0e0', '#ef5350', '#66bb6a', '#bdbdbd', '#ffca28', '#8d6e63', '#26c6da'];

/** A heap of mixed recyclables (bottles, cans, bags, boxes), `n` bits over w × d at height y. */
function rcJunk(g: THREE.Object3D, w: number, d: number, x: number, y: number, z: number, n: number, seed: number) {
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) {
    const c = RC_JUNK[i % RC_JUNK.length];
    const px = x + (r() - 0.5) * w;
    const pz = z + (r() - 0.5) * d;
    const py = y + r() * 0.18;
    if (i % 3 === 0) part(g, cyl(0.035, 0.035, 0.16, 8), c, px, py + 0.04, pz, { rz: r() * 3, rx: r() * 3, outline: false });
    else part(g, box(0.08 + r() * 0.08, 0.06 + r() * 0.06, 0.08 + r() * 0.08), c, px, py + 0.04, pz, { ry: r() * 3, outline: false });
  }
}

/**
 * 투입 호퍼 (3 × 2): the concrete bunker the lorries tip into, its steel hopper narrowing to the belt's foot, a heap of mixed recyclables
 * in it, the yellow and black edge, the camera that watches what comes in.
 */
function rcHopper(g: THREE.Group, W: number, D: number) {
  part(g, box(W - 0.1, 0.5, 0.15), '#9e9e9e', 0, 0.25, -D / 2 + 0.1);
  for (const s of [-1, 1]) part(g, box(0.15, 0.9, D - 0.2), '#9e9e9e', s * (W / 2 - 0.1), 0.45, -0.05);
  // The hopper: four sloping steel sides.
  const steel = '#607d8b';
  part(g, box(W - 0.4, 0.06, D - 0.5), shade(steel, 0.7), 0, 0.12, -0.1, { outline: false });
  part(g, box(W - 0.4, 0.9, 0.05), steel, 0, 0.6, -D / 2 + 0.25, { rx: 0.35 });
  part(g, box(W - 0.4, 0.9, 0.05), steel, 0, 0.6, D / 2 - 0.45, { rx: -0.35 });
  for (const s of [-1, 1]) part(g, box(0.05, 0.9, D - 0.5), steel, s * (W / 2 - 0.25), 0.6, -0.1, { rz: s * -0.3 });
  rcJunk(g, W - 0.8, D - 0.9, 0, 0.2, -0.1, 70, 11);
  // The striped edge along the front.
  for (let i = 0; i < 10; i++) part(g, box((W - 0.2) / 10, 0.1, 0.08), i % 2 ? '#212121' : RC_YELLOW, -W / 2 + 0.1 + ((W - 0.2) / 10) * (i + 0.5), 1.02, D / 2 - 0.3, { outline: false });
  part(g, cyl(0.03, 0.03, 1.6, 6), BLACK, W / 2 - 0.12, 0.8 + 0.5, -D / 2 + 0.12, { outline: false });
  part(g, box(0.14, 0.1, 0.18), '#eceff1', W / 2 - 0.12, 2.1, -D / 2 + 0.2);
  label(g, '투입 호퍼 · 후진 주의', 1.2, 0.2, 0, 0.82, -D / 2 + 0.19, RC_GREEN, '#ffffff');
}

/** 선별 컨베이어 (4 × 1): a belt on its frame climbing from the hopper's foot towards the platform above, the load riding on it. */
function rcConveyor(g: THREE.Group, W: number, D: number) {
  const a = Math.atan2(1.8, W - 0.3);
  const L = Math.hypot(W - 0.3, 1.8);
  const belt = new THREE.Group();
  belt.position.set(0, 0.5 + 0.9, 0);
  belt.rotation.z = a;
  g.add(belt);
  part(belt, box(L, 0.12, 0.62), '#455a64', 0, 0, 0);
  part(belt, box(L, 0.02, 0.56), '#212121', 0, 0.07, 0, { outline: false });
  for (const s of [-1, 1]) part(belt, box(L, 0.16, 0.03), RC_GREEN, 0, 0.12, s * 0.3, { outline: false });
  rcJunk(belt, L - 0.3, 0.4, 0, 0.08, 0, 26, 23);
  // The legs, longer as it climbs.
  for (let i = 0; i < 4; i++) {
    const x = -W / 2 + 0.3 + i * ((W - 0.6) / 3);
    const h = 0.5 + 0.9 + Math.tan(a) * x - 0.06;
    for (const s of [-1, 1]) part(g, box(0.06, h, 0.06), '#37474f', x, h / 2, s * Math.min(0.26, D / 2 - 0.1), { outline: false });
  }
}

/**
 * 재질별 낙하 칸 (4 × 1): the bays under the sorting platform, a chute down from the ceiling into each and a pile of what was picked: PET
 * (clear blue), film and PP/PE (white bags), cans, glass; their signs.
 */
function rcDropBays(g: THREE.Group, W: number, D: number) {
  const bay = W / 4;
  const kinds: Array<[string, string]> = [['PET', '#64b5f6'], ['PP·PE', '#f5f5f5'], ['캔', '#b0bec5'], ['유리', '#66bb6a']];
  kinds.forEach(([name, c], i) => {
    const x = -W / 2 + bay * (i + 0.5);
    part(g, box(0.08, 1.2, D - 0.1), '#9e9e9e', -W / 2 + bay * i + 0.04, 0.6, 0);
    part(g, box(0.5, 0.9, 0.5), '#78909c', x, 2.2, -D / 2 + 0.3);
    part(g, box(0.44, 0.04, 0.44), '#263238', x, 1.74, -D / 2 + 0.3, { outline: false });
    const pile = part(g, ball(0.42), c, x, 0.08, -0.05);
    pile.scale.set(1, 0.6, 0.85);
    rcJunk(g, 0.5, 0.4, x, 0.3, -0.05, 8, 31 + i);
    label(g, name, 0.4, 0.14, x, 1.1, -D / 2 + 0.06, RC_GREEN, '#ffffff');
  });
  part(g, box(0.08, 1.2, D - 0.1), '#9e9e9e', W / 2 - 0.04, 0.6, 0);
}

/**
 * 베일 압축기 (2 × 2): a big yellow baler, its feed chute at the top, the hydraulic ram's cylinder along it, the control box with its
 * lamps; a fresh bale pushed out at the front, strapped with wire.
 */
function rcBaler(g: THREE.Group, W: number, D: number) {
  part(g, rbox(W - 0.2, 1.4, D - 0.7, 0.05), RC_YELLOW, 0, 0.7, -0.3);
  part(g, box(W - 0.6, 0.7, 0.8), shade(RC_YELLOW, 0.9), 0, 1.75, -0.4);
  part(g, cyl(0.12, 0.12, D - 0.8, 14), CHROME, 0, 1.55, -0.3, { rx: Math.PI / 2 });
  part(g, rbox(0.3, 0.42, 0.18, 0.03), '#eceff1', W / 2 - 0.2, 1.0, D / 2 - 0.55);
  for (const [i, c] of ['#43a047', '#e53935', '#fdd835'].entries()) part(g, cyl(0.03, 0.03, 0.03, 10), c, W / 2 - 0.28 + i * 0.08, 1.1, D / 2 - 0.45, { rx: Math.PI / 2, outline: false });
  rcBale(g, 0, 0.32, D / 2 - 0.3, '#64b5f6');
  label(g, '베일 압축기 · 손 넣지 마시오', 1.2, 0.18, 0, 1.25, D / 2 - 0.64, '#212121', RC_YELLOW);
}

/** A bale of pressed recyclables, about 0.7 × 0.6 × 0.5, banded with wire. */
function rcBale(g: THREE.Object3D, x: number, y: number, z: number, c: string) {
  part(g, box(0.72, 0.62, 0.52), c, x, y, z);
  for (const dx of [-0.2, 0.2]) part(g, box(0.02, 0.64, 0.54), '#424242', x + dx, y, z, { outline: false });
  for (let i = 0; i < 6; i++) part(g, box(0.1, 0.06, 0.02), RC_JUNK[(i * 3) % RC_JUNK.length], x - 0.25 + i * 0.1, y - 0.15 + (i % 3) * 0.12, z + 0.27, { outline: false });
}

/** 압축 베일 더미 (2 × 1): bales stacked two high in two columns, one material a column, waiting for the lorry out. */
function rcBales(g: THREE.Group, W: number, D: number) {
  const cols: Array<[number, string]> = [[-W / 4, '#64b5f6'], [W / 4, '#eeeeee']];
  for (const [x, c] of cols) for (let k = 0; k < 2; k++) rcBale(g, x, 0.31 + k * 0.63, -0.05, c);
  part(g, box(W - 0.1, 0.08, D - 0.2), '#8d6e63', 0, 0.0, -0.05, { outline: false });
}

/**
 * 계근소 (2 × 1): the weighbridge house at the gate, a small white booth with its window, the big red readout on a post, the barrier
 * arm, the weighbridge plate in front.
 */
function rcScaleHouse(g: THREE.Group, W: number, D: number) {
  part(g, rbox(0.9, 2.1, D - 0.2, 0.04), '#eceff1', -W / 2 + 0.5, 1.05, -0.05);
  part(g, box(0.7, 0.6, 0.02), '#90caf9', -W / 2 + 0.5, 1.4, D / 2 - 0.14, { outline: false });
  part(g, box(1.0, 0.08, D - 0.1), '#607d8b', -W / 2 + 0.5, 2.14, -0.05);
  // The readout on its post.
  part(g, cyl(0.04, 0.04, 1.8, 8), BLACK, W / 2 - 0.35, 0.9, -0.1, { outline: false });
  part(g, box(0.62, 0.3, 0.08), BLACK, W / 2 - 0.35, 1.85, -0.1);
  label(g, '24,380 kg', 0.56, 0.2, W / 2 - 0.35, 1.85, -0.055, '#111111', '#ff1744');
  // The barrier.
  part(g, box(0.12, 0.9, 0.12), RC_YELLOW, W / 2 - 0.1, 0.45, D / 2 - 0.2);
  part(g, box(0.04, 0.05, 0.9), '#e53935', W / 2 - 0.1, 0.92, D / 2 + 0.25, { outline: false });
  label(g, '계근소', 0.5, 0.14, -W / 2 + 0.5, 1.88, D / 2 - 0.13, RC_GREEN, '#ffffff');
  // The ledge under the window where the weight is keyed in and the slip handed out, its terminal and the printer.
  part(g, box(1.1, 0.04, 0.3), '#78909c', -0.3, 0.95, D / 2 + 0.02);
  for (const x of [-0.75, 0.15]) part(g, box(0.04, 0.95, 0.04), '#607d8b', x, 0.475, D / 2 + 0.1, { outline: false });
  part(g, rbox(0.3, 0.2, 0.04, 0.01), BLACK, -0.3, 1.1, D / 2 - 0.05, { rx: -0.2 });
  part(g, box(0.26, 0.15, 0.004), '#4fc3f7', -0.3, 1.11, D / 2 - 0.028, { rx: -0.2, outline: false });
  part(g, box(0.34, 0.02, 0.12), '#263238', -0.3, 0.98, D / 2 + 0.08);
  part(g, box(0.14, 0.08, 0.12), '#eceff1', 0.0, 1.01, D / 2 + 0.05);
}

/** 폐배터리 분리함 (1 × 1): a red lidded steel bin for batteries pulled off the belt, a sand bucket and the extinguisher beside it. */
function rcBatteryBin(g: THREE.Group, W: number, D: number) {
  part(g, rbox(0.46, 0.62, 0.4, 0.03), '#c62828', -0.12, 0.31, -D / 2 + 0.3);
  part(g, rbox(0.5, 0.05, 0.44, 0.02), shade('#c62828', 0.8), -0.12, 0.64, -D / 2 + 0.3);
  label(g, '폐배터리', 0.36, 0.12, -0.12, 0.45, -D / 2 + 0.505, '#ffffff', '#c62828');
  part(g, cyl(0.1, 0.09, 0.22, 12), '#ef6c00', 0.25, 0.11, -D / 2 + 0.25);
  part(g, cyl(0.09, 0.09, 0.02, 12), '#e0c08a', 0.25, 0.22, -D / 2 + 0.25, { outline: false });
  part(g, cyl(0.07, 0.07, 0.42, 12), '#d32f2f', 0.25, 0.21 + 0.25, D / 2 - 0.3);
  part(g, cyl(0.025, 0.025, 0.06, 8), BLACK, 0.25, 0.7, D / 2 - 0.3, { outline: false });
  void W;
}
