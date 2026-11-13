import * as THREE from 'three';
import type { Motion } from '../activity';
import { boardGrip, type HeldTool } from '../handTool';
import { marker, rod, spot, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, caster, label, painted, picture, text, type Paint } from './doctor';
import { MC, OB, OB_AT, OIL, OIL_AT, PACK_GRIP, PEN_REST, PS, SPR, TRAY_FILTER, TRAY_PLUG, TRAY_WRENCH, sp, xeClock, xeNow, xeStop, type P, type XeMotion, type XeNow } from './workExtraMotion';

/*
 * The props of workExtraMotion.ts's five rounds, one kit a piece. A piece's builder adds its kit and a spot; the kit's `update` reads the script
 * by the clock and moves everything, and sets the spot's `held`. These pieces stand on other lots and have other uses, so a kit's group is hidden
 * unless its own spot is being used. Generic goods only; the supplier on the tablet is made up.
 */

const NO = { outline: false } as const;
const AMBER = '#d4901e';
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const UP = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();

function group(parent: THREE.Object3D, name?: string): THREE.Group {
  const g = new THREE.Group();
  if (name) g.name = name;
  parent.add(g);
  return g;
}
const put = (o: THREE.Object3D, p: P) => o.position.set(p[0], p[1], p[2]);
const addP = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
/** Points `o`'s +z from where it is towards a place in its parent's frame. */
function aimAt(o: THREE.Object3D, to: P) {
  tmpA.set(to[0] - o.position.x, to[1] - o.position.y, to[2] - o.position.z);
  if (tmpA.lengthSq() > 1e-8) o.quaternion.setFromUnitVectors(Z, tmpA.normalize());
}
/** A thin run of liquid, from one place to another. */
function runOf(g: THREE.Object3D, r: number, color: string) {
  const m = part(g, cyl(r, r, 1, 8), color, 0, 0, 0, { ...NO, shadow: false });
  m.visible = false;
  return (a: P | null, b?: P, thick = 1) => {
    m.visible = !!a && !!b;
    if (!a || !b) return;
    tmpA.set(a[0], a[1], a[2]);
    tmpB.set(b[0], b[1], b[2]);
    m.position.copy(tmpA).add(tmpB).multiplyScalar(0.5);
    tmpB.sub(tmpA);
    m.scale.set(thick, Math.max(tmpB.length(), 1e-4), thick);
    if (tmpB.lengthSq() > 1e-10) m.quaternion.setFromUnitVectors(UP, tmpB.normalize());
  };
}
/** A cone of fine spray, from a nozzle to where it lands. */
function mistOf(g: THREE.Object3D, wide = 0.14) {
  const mat = new THREE.MeshBasicMaterial({ color: '#eaf6ff', transparent: true, opacity: 0.42, depthWrite: false });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(wide, 0.008, 1, 12, 1, true), mat);
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.visible = false;
  g.add(m);
  return (a: P | null, b?: P, strength = 1, t = 0) => {
    m.visible = !!a && !!b && strength > 0.03;
    if (!m.visible) return;
    tmpA.set(a![0], a![1], a![2]);
    tmpB.set(b![0], b![1], b![2]);
    m.position.copy(tmpA).add(tmpB).multiplyScalar(0.5);
    tmpB.sub(tmpA);
    m.scale.set(1 + 0.08 * Math.sin(t * 19), Math.max(tmpB.length(), 0.01), 1 + 0.08 * Math.cos(t * 17));
    m.quaternion.setFromUnitVectors(UP, tmpB.normalize());
    mat.opacity = 0.42 * strength;
  };
}
/** A clock that runs while `spot`'s being used, for the piece's kit. */
function clockOf(g: THREE.Object3D, m: XeMotion, s: Spot) {
  const o = new THREE.Vector3();
  let was = false;
  return (t: number): XeNow | null => {
    const on = Math.abs(t - ((s.at.userData.posedAt as number | undefined) ?? -1e9)) < 0.6;
    g.getWorldPosition(o);
    if (!on) {
      if (was) xeStop(m, o);
      was = false;
      return null;
    }
    was = true;
    return xeNow(m, xeClock(m, t, o), (s.at.userData.height as number | undefined) ?? 1.6);
  };
}
function spotFor(g: THREE.Object3D, m: XeMotion, work: THREE.Object3D, x: number, z: number, yaw: number): Spot {
  const s = spot(g, 'stand', x, 0, z, yaw);
  s.work = work;
  s.motion = m as Motion;
  return s;
}

// =============================================================================================
// 엔진오일 교환 (carLift).

const paintOilNote: Paint = (c) => {
  c.fillStyle = '#fbfaf5';
  c.fillRect(0, 0, 192, 256);
  text(c, '엔진오일 교환 기록', 96, 20, 16, '#263238', 'center');
  c.strokeStyle = '#90a4ae';
  c.lineWidth = 1;
  (['차량', '주행거리', '오일', '필터', '오일량'] as const).forEach((k, i) => {
    text(c, k, 14, 54 + i * 34, 13, '#546e7a');
    c.beginPath();
    c.moveTo(10, 70 + i * 34);
    c.lineTo(182, 70 + i * 34);
    c.stroke();
  });
  text(c, '12가 3456', 86, 54, 13, '#1a237e', 'left', false);
  text(c, '84,213 km', 86, 88, 13, '#1a237e', 'left', false);
  text(c, '5W-30  4 L', 86, 122, 13, '#1a237e', 'left', false);
  text(c, '교환', 86, 156, 13, '#1a237e', 'left', false);
};

export interface OilCar {
  root: THREE.Object3D;
  plugMesh: THREE.Object3D;
  plugHome: THREE.Vector3;
  cap: THREE.Object3D;
}
/** All of it in the piece's frame; the car's own parts in the car's, which rides `h` above it. */
export function oilKit(g: THREE.Object3D, use: THREE.Object3D, car: OilCar) {
  const kit = group(use);
  const onCar = group(car.root);
  const mark = marker(g, 0.2, 0.9, 0.9);
  const s = spotFor(g, 'xeOil', mark, OIL_AT.post.x, OIL_AT.post.z, OIL_AT.post.yaw);
  const clock = clockOf(g, 'xeOil', s);

  // The drain stand: a wide dish on a post on castors, a handle on its rim, a tray on an arm for what's taken off.
  const pan = group(kit, 'oilDrainStand');
  for (let i = 0; i < 4; i++) {
    const a = i * 1.571 + 0.785;
    rod(pan, v3(0, 0.1, 0), v3(Math.cos(a) * 0.22, 0.09, Math.sin(a) * 0.22), 0.016, '#37474f');
    caster(pan, Math.cos(a) * 0.22, Math.sin(a) * 0.22, 0.035);
  }
  part(pan, cyl(0.022, 0.022, OIL.dishY - 0.1, 10), STEEL, 0, (OIL.dishY + 0.1) / 2, 0);
  const dish = new THREE.CylinderGeometry(0.2, 0.15, 0.07, 22, 1, true);
  const wall = part(pan, dish, '#f2b705', 0, OIL.dishY, 0);
  wall.userData.ownGeometry = true;
  part(pan, cyl(0.15, 0.15, 0.006, 22), '#3a2a12', 0, OIL.dishY - 0.032, 0, NO);
  const level = part(pan, cyl(0.17, 0.17, 0.006, 22), AMBER, 0, OIL.dishY - 0.02, 0, NO);
  rod(pan, v3(-0.09, OIL.handle[1], OIL.handle[2] + 0.01), v3(0.09, OIL.handle[1], OIL.handle[2] + 0.01), 0.012, BLACK);
  rod(pan, v3(0, OIL.tray[1] - 0.02, 0), v3(OIL.tray[0], OIL.tray[1] - 0.02, OIL.tray[2]), 0.012, STEEL);
  part(pan, rbox(0.24, 0.02, 0.2, 0.006), '#607d8b', OIL.tray[0], OIL.tray[1], OIL.tray[2]);
  label(pan, '폐유', 0.12, 0.05, 0, OIL.dishY - 0.08, 0.17, '#f2b705', '#111111');
  const oldInDish = part(pan, cyl(0.042, 0.042, 0.1, 14), '#3e4347', OIL.oldIn[0] - OIL.panIn[0], OIL.dishY + 0.01, OIL.oldIn[2] - OIL.panIn[2], { rz: 1.2 });

  // The filter: where it sits on the engine, the old one grimy, the new one clean; in the hand; waiting on the tray.
  const seatOld = part(onCar, cyl(0.042, 0.042, 0.1, 14), '#3e4347', OIL.filter[0], OIL.filter[1] - OIL.high, OIL.filter[2]);
  const seatNew = part(onCar, cyl(0.042, 0.042, 0.1, 14), '#1565c0', OIL.filter[0], OIL.filter[1] - OIL.high, OIL.filter[2]);
  const inHand = group(kit, 'oilFilter');
  const handOld = part(inHand, cyl(0.042, 0.042, 0.1, 14), '#3e4347', 0, 0, 0, NO);
  const handNew = part(inHand, cyl(0.042, 0.042, 0.1, 14), '#1565c0', 0, 0, 0, NO);
  part(inHand, cyl(0.034, 0.034, 0.006, 14), BLACK, 0, 0.052, 0, NO);
  const onTray = part(kit, cyl(0.042, 0.042, 0.1, 14), '#1565c0', 0, 0, 0);
  const filterHeld: HeldTool = { tool: inHand, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'cradle', radius: 0.042 } } };

  // The ring spanner: its grip the origin, its head along +z.
  const wrench = group(kit, 'oilWrench');
  part(wrench, cyl(0.012, 0.012, 0.13, 8), '#c62828', 0, 0, 0, { rx: Math.PI / 2, ...NO });
  part(wrench, box(0.018, 0.008, 0.1), CHROME, 0, 0, 0.11, NO);
  part(wrench, cyl(0.022, 0.022, 0.012, 12), CHROME, 0, 0, OIL.wrench, NO);
  const wrenchHeld: HeldTool = { tool: wrench, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 0, 1), shape: 'power', radius: 0.013 } } };
  const stream = runOf(kit, 0.0055, AMBER);
  const pourRun = runOf(kit, 0.008, AMBER);

  // The cart, at the car's nose: the jug, the funnel, the rag, the clipboard.
  const cart = group(kit);
  put(cart, OIL.cart);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    caster(cart, sx * 0.19, sz * 0.12, 0.03);
    part(cart, cyl(0.012, 0.012, OIL.cartTop - 0.08, 8), '#37474f', sx * 0.19, (OIL.cartTop + 0.08) / 2, sz * 0.12, NO);
  }
  part(cart, rbox(0.46, 0.025, 0.3, 0.008), '#455a64', 0, OIL.cartTop, 0);
  part(cart, rbox(0.46, 0.02, 0.3, 0.008), '#78909c', 0, 0.3, 0);
  for (let i = 0; i < 3; i++) part(cart, rbox(0.1, 0.2, 0.07, 0.015), '#e8e4d8', -0.13 + i * 0.13, 0.41, 0);

  const jug = group(kit, 'oilJug');
  const body = group(jug);
  part(body, rbox(0.11, 0.2, 0.09, 0.02), '#eceadf', -0.1, 0, 0, NO);
  const inJug = part(body, box(0.1, 0.16, 0.08), '#c98f2e', -0.1, -0.015, 0, NO);
  part(body, cyl(0.016, 0.02, 0.03, 10), '#eceadf', -0.13, 0.11, 0, NO);
  part(jug, cyl(0.012, 0.012, 0.12, 8), '#eceadf', 0, 0, 0, NO);
  rod(jug, v3(0, 0.06, 0), v3(-0.05, 0.06, 0), 0.01, '#eceadf');
  rod(jug, v3(0, -0.06, 0), v3(-0.05, -0.06, 0), 0.01, '#eceadf');
  label(body, '엔진오일 4L', 0.09, 0.04, -0.1, 0.02, 0.0465, '#1565c0', '#ffffff');
  const jugHeld: HeldTool = { tool: jug, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.014 } } };
  const funnel = group(kit, 'oilFunnel');
  const cone = part(funnel, new THREE.CylinderGeometry(0.055, 0.012, 0.09, 16, 1, true), '#ef6c00', 0, 0.01, 0, NO);
  cone.userData.ownGeometry = true;
  part(funnel, cyl(0.012, 0.01, 0.05, 8), '#ef6c00', 0, -0.055, 0, NO);
  const funnelHeld: HeldTool = { tool: funnel, lead: 'left', grips: { left: { at: v3(-0.04, 0.03, 0.02), axis: v3(0, 1, 0), shape: 'power', radius: 0.018 } } };

  // On the engine: the filler's open neck, the dipstick's loop.
  const neck = part(onCar, cyl(0.022, 0.022, 0.012, 12), '#111111', OIL.cap[0], OIL.cap[1], OIL.cap[2], NO);
  const stick = group(kit, 'oilDipstick');
  part(stick, new THREE.TorusGeometry(0.018, 0.005, 6, 14), '#fdd835', 0, 0.015, 0, NO).userData.ownGeometry = true;
  part(stick, cyl(0.003, 0.003, OIL.stickLen, 6), CHROME, 0, -OIL.stickLen / 2, 0, NO);
  const film = part(stick, cyl(0.0042, 0.0042, 0.1, 6), AMBER, 0, -OIL.stickLen + 0.05, 0, NO);
  for (const y of [0.03, 0.09]) part(stick, box(0.012, 0.002, 0.012), '#263238', 0, -OIL.stickLen + y, 0, NO);
  const stickHeld: HeldTool = { tool: stick, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(1, 0, 0), shape: 'pinch', radius: 0.008 } } };
  const rag = part(kit, box(0.09, 0.012, 0.09), '#b0413e', 0, 0, 0, NO);

  const clip = group(kit, 'oilClipboard');
  const tilted = group(clip);
  tilted.rotation.x = -0.55;
  part(tilted, rbox(0.22, 0.29, 0.008, 0.004), '#8d6e63', 0, 0, -0.004, NO);
  picture(tilted, painted('xe-oil-note', 192, 256, paintOilNote), 0.2, 0.26, 0, -0.008, 0.002);
  const levelLine = part(tilted, box(0.07, 0.006, 0.001), '#1a237e', 0.03, -0.075, 0.003, NO);
  const pen = group(clip, 'oilPen');
  part(pen, cyl(0.005, 0.005, 0.12, 8), '#1a237e', 0, 0, 0, { rx: 0.35, ...NO });
  const clipGrip = boardGrip(0.55);
  const capHeld: HeldTool = { tool: car.cap, lead: 'right', grips: { right: { at: v3(0, 0.03, 0.015), axis: v3(0, 1, 0), shape: 'pinch', radius: 0.03 } } };
  const capHome = car.cap.position.clone();

  const reset = () => {
    kit.visible = onCar.visible = false;
    car.plugMesh.position.copy(car.plugHome);
    car.cap.position.copy(capHome);
    s.held = null;
  };
  reset();
  return {
    spot: s,
    reset,
    /** Moves it all for now; `h` is how high the car is. */
    update(t: number, h: number): XeNow | null {
      const N = clock(t);
      if (!N) {
        reset();
        return null;
      }
      kit.visible = onCar.visible = true;
      const n = N.n;
      const foot = N.p.pan ?? OIL.panHome;
      put(pan, foot);
      const shift: P = [foot[0] - OIL.panIn[0], foot[1] - OIL.panIn[1], foot[2] - OIL.panIn[2]];
      level.scale.set(Math.max(0.05, n.level), 1, Math.max(0.05, n.level));
      level.visible = n.level > 0.02;
      level.position.y = OIL.dishY - 0.03 + 0.03 * n.level;
      oldInDish.visible = n.oldInDish > 0.5;
      // The plug: in the pan, in the fingers, on the tray.
      const plugAt = N.p.plugAt ?? (n.plugOut > 0.5 ? addP(TRAY_PLUG, shift) : null);
      if (plugAt) car.plugMesh.position.set(plugAt[0], plugAt[1] - h, plugAt[2]);
      else car.plugMesh.position.copy(car.plugHome);
      // The filters.
      seatOld.visible = n.filter > 0.5 && n.newFilter < 0.5;
      seatNew.visible = n.newFilter > 0.5;
      const filterTool = N.tool === 'oldFilter' || N.tool === 'newFilter';
      inHand.visible = filterTool;
      handOld.visible = N.tool === 'oldFilter';
      handNew.visible = N.tool === 'newFilter';
      if (filterTool && N.p.filterAt) put(inHand, N.p.filterAt);
      inHand.rotation.set(Math.PI * (n.upside ?? 0), (n.turn ?? 0) * 0.5, 0);
      onTray.visible = !filterTool && n.newFilter < 0.5;
      put(onTray, addP(TRAY_FILTER, shift));
      // The spanner.
      const wrenchIn = N.tool === 'wrench';
      if (wrenchIn) {
        put(wrench, N.key.r);
        if (N.p.wrenchHead) aimAt(wrench, N.p.wrenchHead);
      } else {
        put(wrench, addP(TRAY_WRENCH, shift));
        wrench.rotation.set(0, 0.5, 0);
      }
      // What runs.
      stream(n.oil > 0.02 ? [OIL.plug[0], OIL.plug[1] - 0.012, OIL.plug[2]] : null, [OIL.plug[0], OIL.dishY - 0.015, OIL.plug[2]], 0.5 + 0.5 * n.oil);
      // The jug.
      const jugIn = N.p.jug ?? OIL.jug;
      put(jug, jugIn);
      jug.rotation.z = -n.tip;
      jug.rotation.y = 0;
      inJug.scale.y = Math.max(0.05, n.jugLevel);
      inJug.position.y = -0.095 + 0.08 * n.jugLevel;
      if (n.pour > 0.02) {
        const c = Math.cos(-n.tip);
        const si = Math.sin(-n.tip);
        pourRun([jugIn[0] + -0.13 * c - 0.125 * si, jugIn[1] + -0.13 * si + 0.125 * c, jugIn[2]], [OIL.funnel[0], OIL.funnel[1] + 0.01, OIL.funnel[2]], n.pour);
      } else pourRun(null);
      // The filler and the funnel.
      neck.visible = n.capOff > 0.5;
      if (N.p.capAt) car.cap.position.set(N.p.capAt[0], N.p.capAt[1] - h, N.p.capAt[2]);
      else if (n.capOff > 0.5) car.cap.position.set(OIL.capAside[0], OIL.capAside[1] - h, OIL.capAside[2]);
      else car.cap.position.copy(capHome);
      put(funnel, N.p.funnel ?? OIL.funnelRest);
      // The dipstick.
      const top = N.p.stickTop ?? ([OIL.stick[0], OIL.stick[1] + 0.01, OIL.stick[2] + 0.02] as P);
      put(stick, top);
      stick.rotation.set(0, 0, (n.stickLevel ?? 0) * 1.35);
      film.visible = (n.stickWiped ?? 0) < 0.5 || (n.stickLevel ?? 0) > 0.3;
      put(rag, N.p.rag ?? addP(OIL.cart, [-0.1, OIL.cartTop + 0.02, -0.08]));
      // The clipboard.
      const clipIn = N.tool === 'clip' && N.p.clip;
      const a = N.at.yaw - Math.PI;
      if (clipIn) {
        put(clip, N.p.clip!);
        clip.rotation.set(0, a, 0);
        const dx = N.key.r[0] - N.p.clip![0];
        const dz = N.key.r[2] - N.p.clip![2];
        pen.position.set(dx * Math.cos(-a) + dz * Math.sin(-a), N.key.r[1] - N.p.clip![1], -dx * Math.sin(-a) + dz * Math.cos(-a));
      } else {
        put(clip, addP(OIL.clipRest, [0, 0.14, 0]));
        clip.rotation.set(-1.0, 0, 0);
        pen.position.fromArray(PEN_REST);
      }
      levelLine.visible = n.noted > 0.5 && N.beat !== 'note';
      // In the hand.
      let held: HeldTool | null = null;
      if (wrenchIn) held = wrenchHeld;
      else if (filterTool) held = filterHeld;
      else if (N.tool === 'jug') held = jugHeld;
      else if (N.tool === 'funnel') held = funnelHeld;
      else if (N.tool === 'stick') held = stickHeld;
      else if (N.tool === 'cap') held = capHeld;
      else if (N.tool === 'clip') held = { tool: clip, lead: 'left', grips: { left: clipGrip, right: { at: pen.position.clone(), axis: v3(0, 1, 0.35).normalize(), shape: 'pen', radius: 0.012 } } };
      else if (N.tool === 'plug') held = { tool: car.plugMesh, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'pinch', radius: 0.016 } } };
      s.held = held;
      return N;
    },
  };
}

// =============================================================================================
// 머신 청소 (espressoMachine). The portafilter and the drip tray are the machine's own.

export function machineKit(g: THREE.Object3D, use: THREE.Object3D, work: THREE.Object3D, machine: { pf: THREE.Object3D; mound: THREE.Mesh; puck: THREE.Mesh; tray: THREE.Object3D }) {
  const kit = group(use);
  const s = spotFor(g, 'xeMachine', work, 0, 0.45, Math.PI);
  const clock = clockOf(g, 'xeMachine', s);
  const TRAY_HOME = machine.tray.position.clone();
  // The tray of cleaning things where the pitcher goes.
  part(kit, rbox(0.36, 0.012, 0.2, 0.006), '#607d8b', MC.kit[0], MC.kit[1] + 0.006, MC.kit[2]);
  part(kit, cyl(0.04, 0.04, 0.09, 14), '#f5f5f0', MC.tub[0], MC.kit[1] + 0.057, MC.tub[2]);
  part(kit, cyl(0.042, 0.042, 0.012, 14), '#1565c0', MC.tub[0], MC.kit[1] + 0.107, MC.tub[2], NO);
  label(kit, '세정제', 0.06, 0.03, MC.tub[0], MC.kit[1] + 0.06, MC.tub[2] + 0.041, '#f5f5f0', '#1565c0');
  const blindRest = part(kit, cyl(0.03, 0.03, 0.006, 16), '#cfd8dc', MC.blind[0], MC.kit[1] + 0.016, MC.blind[2], NO);
  const blindHand = part(kit, cyl(0.03, 0.03, 0.006, 16), '#cfd8dc', 0, 0, 0, NO);
  const blindIn = part(machine.pf, cyl(0.034, 0.034, 0.004, 16), '#cfd8dc', 0, -0.002, 0, NO);
  const spoon = group(kit);
  part(spoon, cyl(0.016, 0.012, 0.01, 10), STEEL, 0, 0, 0, NO);
  part(spoon, box(0.006, 0.004, 0.09), STEEL, 0, 0.006, 0.05, NO);
  const powder = part(machine.pf, ball(0.024), '#efece0', 0, 0.002, 0, NO);
  powder.scale.set(1, 0.3, 1);
  // The group brush: its grip the origin, its head along +z, bristles up.
  const brush = group(kit, 'groupBrush');
  part(brush, cyl(0.013, 0.013, 0.12, 8), '#37474f', 0, 0, 0, { rx: Math.PI / 2, ...NO });
  part(brush, box(0.036, 0.018, 0.05), '#37474f', 0, 0, 0.12, NO);
  part(brush, box(0.03, 0.022, 0.044), '#e8d9a8', 0, 0.019, 0.12, NO);
  const cloth = group(kit, 'wandCloth');
  part(cloth, box(0.08, 0.014, 0.1), '#90caf9', 0, 0, 0, NO);
  const spit = runOf(kit, 0.005, '#a98a60');
  const rinse = runOf(kit, 0.006, '#cfe8f5');
  const out = runOf(kit, 0.008, '#b9a88a');
  // The bucket on a stool for the tray's water.
  part(kit, cyl(0.15, 0.15, 0.03, 16), '#8d6e63', MC.bucket[0], MC.bucket[1] - 0.015, MC.bucket[2]);
  for (let i = 0; i < 3; i++) part(kit, cyl(0.014, 0.014, MC.bucket[1] - 0.03, 8), '#6d4c41', MC.bucket[0] + Math.cos(i * 2.09) * 0.11, (MC.bucket[1] - 0.03) / 2, MC.bucket[2] + Math.sin(i * 2.09) * 0.11, NO);
  const pail = part(kit, new THREE.CylinderGeometry(0.13, 0.1, 0.22, 16, 1, true), '#546e7a', MC.bucket[0], MC.bucket[1] + 0.11, MC.bucket[2]);
  pail.userData.ownGeometry = true;
  part(kit, cyl(0.1, 0.1, 0.004, 16), '#3f4c54', MC.bucket[0], MC.bucket[1] + 0.03, MC.bucket[2], NO);
  // The water in the drip tray, only drawn here.
  const water = part(machine.tray, box(0.54, 0.004, 0.1), '#a98a60', 0, 0.01, 0, NO);
  water.visible = false;
  const pfGrip = { at: v3(0, -MC.droop, MC.handle), axis: v3(0, 0, 1), shape: 'power' as const, radius: 0.012 };
  const pfHeld: HeldTool = { tool: machine.pf, lead: 'right', grips: { right: pfGrip } };
  const brushHeld: HeldTool = { tool: brush, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 0, 1), shape: 'power', radius: 0.013 } } };
  const clothHeld: HeldTool = { tool: cloth, lead: 'left', grips: { left: { at: v3(0, 0, 0), axis: v3(1, 0, 0), palm: v3(0, -1, 0), shape: 'flat', radius: 0.012 } } };

  const off = () => {
    kit.visible = false;
    blindIn.visible = powder.visible = water.visible = false;
    machine.tray.position.copy(TRAY_HOME);
    machine.tray.rotation.set(0, 0, 0);
    s.held = null;
  };
  off();
  return {
    spot: s,
    off,
    update(t: number): XeNow | null {
      const N = clock(t);
      if (!N) {
        off();
        return null;
      }
      kit.visible = true;
      const n = N.n;
      const b = N.p.pf ?? ([MC.group[0], MC.group[1] - 0.03, MC.group[2]] as P);
      put(machine.pf, b);
      machine.pf.rotation.set(0, n.twist, 0);
      machine.mound.visible = false;
      machine.puck.visible = !n.blind && !n.clean && N.beat === 'unlock';
      blindIn.visible = n.blind > 0.5;
      powder.visible = n.powder > 0.15;
      blindRest.visible = n.blind < 0.5 && !N.p.blindAt && !n.clean;
      blindHand.visible = !!N.p.blindAt;
      if (N.p.blindAt) put(blindHand, N.p.blindAt);
      spoon.visible = !!N.p.spoon;
      if (N.p.spoon) put(spoon, N.p.spoon);
      // The brush.
      if (N.tool === 'brush' && N.p.brushHand && N.p.brushHead) {
        put(brush, N.p.brushHand);
        aimAt(brush, N.p.brushHead);
      } else {
        put(brush, MC.brush);
        brush.rotation.set(0, 0.5, 0);
      }
      put(cloth, N.p.cloth ?? MC.cloth);
      // The tray.
      put(machine.tray, N.p.tray ?? MC.tray);
      machine.tray.rotation.set(n.tip * -0.55, (n.trayYaw ?? 0) * (Math.PI / 2), 0, 'YXZ');
      water.visible = n.level > 0.1;
      water.scale.y = 1;
      // What runs.
      spit(n.spit > 0.5 ? [MC.group[0] + 0.07, 1.03, -0.03] : null, [MC.group[0] + 0.07, 0.96, 0.0]);
      rinse(n.rinse > 0.02 ? [MC.group[0], 1.11, MC.group[2]] : null, [MC.group[0], 0.96, MC.group[2]], n.rinse);
      if ((n.pourOut ?? 0) > 0.02 && N.p.tray) out([N.p.tray[0] - 0.08, N.p.tray[1] - 0.02, N.p.tray[2]], [MC.bucket[0], MC.bucket[1] + 0.05, MC.bucket[2]], n.pourOut);
      else out(null);
      s.held = N.tool === 'pf' ? pfHeld : N.tool === 'brush' ? brushHeld : N.tool === 'cloth' ? clothHeld : null;
      return N;
    },
  };
}

// =============================================================================================
// 원두·우유 발주 (cafeCounter). The supplier's made up.

const ROWS: Array<[string, string, string]> = [
  ['원두 하우스 1kg', '재고 3', '발주 6'],
  ['원두 디카페인 1kg', '재고 1', '발주 2'],
  ['우유 1L', '재고 4', '발주 24'],
  ['오트 음료 1L', '재고 2', '발주 6'],
];
const paintOrder = (stage: number): Paint => (c) => {
  c.fillStyle = '#f6f4ef';
  c.fillRect(0, 0, 256, 176);
  c.fillStyle = '#4e342e';
  c.fillRect(0, 0, 256, 22);
  text(c, '발주서 · 들샘식자재', 8, 12, 12, '#ffffff');
  text(c, '11/03 오전 배송', 248, 12, 10, '#d7ccc8', 'right', false);
  ROWS.forEach(([a, b, d], i) => {
    const y = 38 + i * 24;
    c.fillStyle = i % 2 ? '#ffffff' : '#ece7dd';
    c.fillRect(6, y - 11, 244, 22);
    text(c, a, 10, y, 11, '#3e2723', 'left', false);
    if (stage >= (i < 2 ? 1 : 2)) text(c, b, 170, y, 10, '#6d4c41', 'right', false);
    if (stage >= (i < 2 ? 2 : 3)) text(c, d, 246, y, 11, '#c62828', 'right');
  });
  c.fillStyle = stage >= 4 ? '#43a047' : '#1e88e5';
  c.fillRect(150, 140, 100, 30);
  text(c, stage >= 4 ? '발주 완료' : '발주 보내기', 200, 155, 13, '#ffffff', 'center');
};
export function beansKit(g: THREE.Object3D, work: THREE.Object3D) {
  const kit = group(g);
  const s = spotFor(g, 'xeBeans', work, OB_AT.counter.x, OB_AT.counter.z, OB_AT.counter.yaw);
  const clock = clockOf(g, 'xeBeans', s);
  // The trolley and the crate.
  const T = OB.trolley;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) caster(kit, T[0] + sx * 0.19, T[2] + sz * 0.15, 0.03);
  part(kit, rbox(0.46, 0.03, 0.36, 0.008), '#607d8b', T[0], 0.1, T[2]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(kit, cyl(0.012, 0.012, 0.42, 8), '#455a64', T[0] + sx * 0.19, 0.31, T[2] + sz * 0.15, NO);
  part(kit, rbox(0.46, 0.03, 0.36, 0.008), '#607d8b', T[0], 0.52, T[2]);
  part(kit, box(0.44, 0.012, 0.34), '#c9a074', T[0], 0.55, T[2], NO);
  for (const [dx, dz, w, d] of [[0, 0.17, 0.44, 0.012], [0, -0.17, 0.44, 0.012], [0.22, 0, 0.012, 0.34], [-0.22, 0, 0.012, 0.34]] as const) part(kit, box(w, 0.16, d), '#c9a074', T[0] + dx, 0.63, T[2] + dz);
  const bags = OB.bags.map(([x, _y, z], i) => {
    const m = group(kit);
    m.position.set(x, 0.56, z);
    part(m, rbox(0.08, 0.22, 0.09, 0.02), i === 1 ? '#263238' : '#c8a27a', 0, 0.11, 0);
    label(m, i === 1 ? '디카페인' : '원두', 0.07, 0.03, 0, 0.13, 0.046, '#fff8e1', '#4e342e');
    return m;
  });
  for (const [x, _y, z] of OB.cartons) {
    part(kit, box(0.065, 0.2, 0.065), '#ffffff', x, 0.66, z);
    part(kit, box(0.05, 0.03, 0.05), '#ffffff', x, 0.775, z, { rz: 0.78, ...NO }).scale.set(0.7, 1, 1);
    label(kit, '우유', 0.05, 0.025, x, 0.67, z - 0.034, '#1565c0', '#ffffff', Math.PI);
  }
  // The tablet: its centre the origin, faced to whoever holds it, tipped back.
  const tablet = group(kit, 'orderTablet');
  const face = group(tablet);
  face.rotation.x = -0.55;
  part(face, rbox(0.26, 0.18, 0.012, 0.01), '#263238', 0, 0, -0.006, NO);
  const textures = [0, 1, 2, 3, 4].map((i) => painted(`xe-order-${i}`, 256, 176, paintOrder(i)));
  const screen = picture(face, textures[0], 0.24, 0.16, 0, 0, 0.002);
  const tabletHeld: HeldTool = { tool: tablet, lead: 'left', grips: { left: boardGrip(0.55) } };
  const off = () => {
    kit.visible = false;
    s.held = null;
  };
  off();
  return {
    spot: s,
    update(t: number): XeNow | null {
      const N = clock(t);
      if (!N) {
        off();
        return null;
      }
      kit.visible = true;
      const n = N.n;
      const at = N.p.tablet ?? OB.tablet;
      put(tablet, at);
      tablet.rotation.y = N.at.yaw - Math.PI;
      const mat = screen.material as THREE.MeshBasicMaterial;
      const want = textures[Math.min(4, Math.round(n.screen))];
      if (mat.map !== want) {
        mat.map = want;
        mat.needsUpdate = true;
      }
      bags[0].position.y = 0.56 + (n.lift ?? 0);
      s.held = N.tool === 'tablet' ? tabletHeld : null;
      return N;
    },
  };
}

// =============================================================================================
// 병충해 방제 (gardenBed).

export function pestKit(g: THREE.Object3D, work: THREE.Object3D) {
  const kit = group(g);
  const s = spotFor(g, 'xePest', work, 0.44, 0.6, Math.PI);
  const clock = clockOf(g, 'xePest', s);
  // A branch of big leaves on the front of the shrub, bugs on their undersides.
  const leaves = PS.leaves.map((L, i) => {
    const m = group(kit);
    put(m, L);
    m.rotation.y = (i - 1) * 0.4;
    const blade = part(m, ball(0.06), i % 2 ? '#4f8f3a' : '#5a9a42', 0, 0, 0.0, NO);
    blade.scale.set(0.75, 0.05, 1.2);
    const under = part(m, ball(0.058), '#9dc47a', 0, -0.003, 0, NO);
    under.scale.set(0.72, 0.04, 1.16);
    rod(kit, v3(L[0], L[1], L[2] - 0.06), v3(L[0] * 0.95 + 0.03, L[1] - 0.04, L[2] - 0.2), 0.004, '#39702b');
    const bug = group(m);
    for (const [x, z] of [[0.012, 0.01], [-0.012, -0.012], [0.003, -0.025]] as const) part(bug, ball(0.0065), '#2b2b1e', x, -0.008, z, NO);
    return { m, bug };
  });
  // The tote on the edging: the jar, the loupe's place, the notebook, the gloves.
  part(kit, rbox(0.3, 0.2, 0.2, 0.012), '#37474f', PS.tote[0], PS.tote[1] + 0.1, PS.tote[2]);
  part(kit, box(0.27, 0.006, 0.17), '#263238', PS.tote[0], PS.tote[1] + 0.2, PS.tote[2], NO);
  const glass = new THREE.MeshToonMaterial({ color: '#d6eef5', transparent: true, opacity: 0.5 });
  const jarWall = new THREE.Mesh(cyl(0.032, 0.032, 0.075, 14), glass);
  jarWall.userData.ownMaterial = true;
  put(jarWall, [PS.jar[0], PS.jar[1] + 0.04, PS.jar[2]]);
  kit.add(jarWall);
  const jarLid = part(kit, cyl(0.034, 0.034, 0.012, 14), '#c62828', PS.jar[0], PS.jar[1] + 0.082, PS.jar[2], NO);
  const inJar = [0, 1, 2].map((i) => part(kit, ball(0.007), '#2b2b1e', PS.jar[0] + (i - 1) * 0.012, PS.jar[1] + 0.012, PS.jar[2] + (i % 2) * 0.01, NO));
  const note = group(kit);
  put(note, PS.note);
  part(note, box(0.12, 0.008, 0.15), '#fffdf6', 0, 0, 0, NO);
  part(note, box(0.12, 0.004, 0.012), '#2e7d32', 0, 0.006, -0.07, NO);
  const lines = [0, 1].map((i) => part(note, box(0.09, 0.002, 0.004), '#37474f', 0, 0.006, -0.03 + i * 0.03, NO));
  const pen = group(kit, 'pestPen');
  part(pen, cyl(0.005, 0.005, 0.1, 8), '#1a237e', 0, 0, 0, { rz: 0.5, ...NO });
  const gloves = group(kit);
  for (const dx of [-0.02, 0.02]) part(gloves, box(0.04, 0.012, 0.11), '#f9a825', dx, 0, 0, NO);
  // The loupe: its grip the origin, the lens along +y.
  const loupe = group(kit, 'pestLoupe');
  part(loupe, cyl(0.011, 0.011, 0.08, 8), BLACK, 0, 0, 0, NO);
  const ring = part(loupe, new THREE.TorusGeometry(0.03, 0.005, 6, 18), BLACK, 0, 0.075, 0, { rx: Math.PI / 2, ...NO });
  ring.userData.ownGeometry = true;
  const lens = new THREE.Mesh(cyl(0.028, 0.028, 0.002, 18), glass);
  lens.userData.ownMaterial = true;
  lens.position.y = 0.075;
  loupe.add(lens);
  // The bug between finger and thumb.
  const bugHand = group(kit, 'pestBug');
  part(bugHand, ball(0.007), '#2b2b1e', 0, 0, 0, NO);
  // The hand pressure sprayer: its handle the origin; the tank below, the pump knob above, the wand turning at the head.
  const sprayer = group(kit, 'handSprayer');
  part(sprayer, cyl(0.075, 0.075, 0.22, 16), '#2e7d32', 0, -0.2, 0, NO);
  part(sprayer, cyl(0.03, 0.04, 0.03, 12), '#1b5e20', 0, -0.075, 0, NO);
  part(sprayer, box(0.02, 0.05, 0.1), '#212121', 0, 0, 0.0, NO);
  const knob = group(sprayer);
  part(knob, cyl(0.007, 0.007, 0.08, 8), CHROME, 0, 0.04, 0, NO);
  part(knob, cyl(0.015, 0.015, 0.05, 8), '#212121', 0, 0.08, 0, { rz: Math.PI / 2, ...NO });
  const wand = group(sprayer);
  wand.position.set(0, 0.0, 0.05);
  part(wand, cyl(0.006, 0.006, 0.28, 8), STEEL, 0, 0, 0.14, { rx: Math.PI / 2, ...NO });
  part(wand, cyl(0.012, 0.008, 0.03, 8), '#212121', 0, 0, 0.29, { rx: Math.PI / 2, ...NO });
  const mist = mistOf(kit);
  const sprayHeld: HeldTool = { tool: sprayer, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 0, 1), shape: 'trigger', radius: 0.016 } } };
  const loupeHeld: HeldTool = { tool: loupe, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'power', radius: 0.012 } } };
  const bugHeld: HeldTool = { tool: bugHand, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 1, 0), shape: 'pinch', radius: 0.005 } } };
  const penHeld: HeldTool = { tool: pen, lead: 'right', grips: { right: { at: v3(0, 0.05, 0), axis: v3(0, 1, 0), shape: 'pen', radius: 0.012, writes: -0.05 } } };
  const off = () => {
    kit.visible = false;
    s.held = null;
  };
  off();
  return {
    spot: s,
    update(t: number): XeNow | null {
      const N = clock(t);
      if (!N) {
        off();
        return null;
      }
      kit.visible = true;
      const n = N.n;
      const seen = (i: number) => n[`flip${i}`] ?? 0;
      leaves.forEach((L, i) => {
        L.m.rotation.x = -2.6 * seen(i);
        L.bug.visible = n.bugs < i + 1;
      });
      inJar.forEach((m, i) => (m.visible = n.bugs >= i + 1));
      jarLid.visible = (n.lid ?? 0) > 0.5 || N.beat === 'gloves' || N.beat === 'pump' || N.beat === 'lift' || N.beat === 'spray' || N.beat === 'set' || N.beat === 'note' || N.beat === 'rise';
      put(loupe, N.p.loupe ?? PS.loupe);
      bugHand.visible = N.tool === 'bug';
      if (N.p.bug) put(bugHand, N.p.bug);
      gloves.visible = (n.gloves ?? 0) < 0.85;
      put(gloves, N.p.glovePair ?? PS.gloves);
      lines.forEach((m, i) => (m.visible = (n.noted ?? 0) > 0.5 && (n.writing ?? 1) > 0.25 + i * 0.4));
      put(pen, N.tool === 'pen' && N.p.penTip ? [N.p.penTip[0], N.p.penTip[1] + 0.05, N.p.penTip[2]] : [PS.note[0] + 0.04, PS.note[1] + 0.01, PS.note[2]]);
      put(sprayer, N.p.sprayer ?? [PS.sprayer[0], PS.sprayer[1] + PS.sprayerUp, PS.sprayer[2]]);
      knob.position.y = n.pump ?? 0;
      const aim = N.p.aim;
      if (aim) {
        const o = sprayer.position;
        wand.rotation.set(0, 0, 0);
        wand.lookAt(tmpA.set(aim[0], aim[1], aim[2]).applyMatrix4((kit.updateWorldMatrix(true, false), kit.matrixWorld)));
        const d = tmpB.set(aim[0] - o.x, aim[1] - o.y, aim[2] - o.z).normalize();
        mist(n.mist > 0.03 ? [o.x + d.x * 0.32, o.y + d.y * 0.32, o.z + d.z * 0.32] : null, addP(aim, [0, -0.02, 0]), n.mist, t);
      } else {
        wand.rotation.set(0.5, 3.14, 0);
        mist(null);
      }
      s.held = N.tool === 'sprayer' ? sprayHeld : N.tool === 'loupe' ? loupeHeld : N.tool === 'bug' ? bugHeld : N.tool === 'pen' ? penHeld : null;
      return N;
    },
  };
}

// =============================================================================================
// 병해충 방제 (cropField). The backpack follows the body as the military's rucksack does: the script says where the back is.

export function sprayKit(g: THREE.Object3D, work: THREE.Object3D) {
  const kit = group(g);
  const s = spotFor(g, 'xeSpray', work, 1.05, 0.68, Math.PI / 2);
  const clock = clockOf(g, 'xeSpray', s);
  // The wind's ribbon on its stake, blowing towards -x; the post the mask and gloves hang on; the low stand the tank waits on.
  const [rx, , rz] = SPR.ribbon;
  part(kit, cyl(0.012, 0.014, 1.5, 8), '#8d6e63', rx, 0.75, rz, NO);
  const ribbon = group(kit);
  ribbon.position.set(rx, 1.45, rz);
  const flutter = [0, 1, 2, 3].map((i) => part(ribbon, box(0.1, 0.03, 0.004), i % 2 ? '#e53935' : '#ffb300', -0.05 - i * 0.1, 0, 0, NO));
  part(kit, cyl(0.012, 0.012, 1.0, 8), '#607d8b', SPR.gloves[0] + 0.06, 0.5, SPR.gloves[2] - 0.04, NO);
  part(kit, box(0.22, 0.012, 0.08), '#607d8b', SPR.gloves[0], 0.96, SPR.gloves[2], NO);
  part(kit, rbox(0.42, 0.03, 0.34, 0.01), '#6d4c41', SPR.pack[0], SPR.standTop, SPR.pack[2]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(kit, box(0.03, SPR.standTop, 0.03), '#5d4037', SPR.pack[0] + sx * 0.18, SPR.standTop / 2, SPR.pack[2] + sz * 0.14, NO);
  const gloves = group(kit);
  put(gloves, SPR.gloves);
  for (const dx of [-0.03, 0.03]) part(gloves, box(0.05, 0.014, 0.12), '#f9a825', dx, 0.015, 0, NO);
  // The mask: its middle over the nose and mouth, faced along +z.
  const mask = group(kit, 'sprayMask');
  part(mask, rbox(0.13, 0.085, 0.04, 0.018), '#eceff1', 0, 0, 0, NO);
  for (const sx of [-1, 1]) part(mask, cyl(0.026, 0.026, 0.024, 12), '#546e7a', sx * 0.05, -0.012, 0.028, { rx: Math.PI / 2, ...NO });
  part(mask, box(0.17, 0.008, 0.004), '#37474f', 0, 0.018, -0.03, NO);
  const maskHeld: HeldTool = { tool: mask, lead: 'right', grips: { right: { at: v3(0, -0.04, 0), axis: v3(1, 0, 0), shape: 'pinch', radius: 0.01 } } };
  // The tank: its pack frame's middle the origin, its back to +z (the wearer).
  const pack = group(kit, 'backpackSprayer');
  part(pack, rbox(0.32, 0.46, 0.18, 0.05), '#e8e6d8', 0, 0, -0.02);
  part(pack, cyl(0.05, 0.05, 0.03, 12), '#c62828', 0, 0.24, -0.02, NO);
  for (const sx of [-1, 1]) part(pack, box(0.035, 0.42, 0.012), '#37474f', sx * 0.08, 0, 0.08, NO);
  part(pack, cyl(0.011, 0.011, 2 * PACK_GRIP.side + 0.06, 8), '#37474f', 0, PACK_GRIP.up, 0.02, { rz: Math.PI / 2, ...NO });
  label(pack, '방제기', 0.16, 0.05, 0, 0.05, -0.112, '#e8e6d8', '#2e7d32', Math.PI);
  const lever = group(pack);
  lever.position.set(0.17, -0.17, 0.0);
  part(lever, box(0.02, 0.02, 0.22), '#37474f', 0, 0, 0.11, NO);
  const packHeld: HeldTool = {
    tool: pack,
    lead: 'right',
    grips: {
      right: { at: v3(-PACK_GRIP.side, PACK_GRIP.up, 0.02), axis: v3(1, 0, 0), shape: 'power', radius: 0.012 },
      left: { at: v3(PACK_GRIP.side, PACK_GRIP.up, 0.02), axis: v3(1, 0, 0), shape: 'power', radius: 0.012 },
    },
  };
  // The lance: its grip the origin, along +z to the nozzle; the hose runs back to the tank.
  const lance = group(kit, 'sprayLance');
  part(lance, cyl(0.014, 0.014, 0.1, 8), '#212121', 0, 0, 0, { rx: Math.PI / 2, ...NO });
  part(lance, box(0.008, 0.03, 0.012), '#c62828', 0, -0.022, 0.02, NO);
  part(lance, cyl(0.006, 0.006, 0.52, 8), STEEL, 0, 0, 0.3, { rx: Math.PI / 2, ...NO });
  part(lance, cyl(0.014, 0.008, 0.04, 8), BLACK, 0, 0, 0.57, { rx: Math.PI / 2, ...NO });
  const hose = runOf(kit, 0.007, '#263238');
  const mist = mistOf(kit, 0.16);
  const lanceHeld: HeldTool = { tool: lance, lead: 'right', grips: { right: { at: v3(0, 0, 0), axis: v3(0, 0, 1), shape: 'trigger', radius: 0.015 } } };
  // The leaf turned up at the stop.
  const leaf = group(kit);
  part(leaf, ball(0.07), '#6fae4a', 0, 0, 0, NO).scale.set(0.8, 0.06, 1.2);
  part(leaf, ball(0.066), '#a8cf86', 0, -0.004, 0, NO).scale.set(0.76, 0.05, 1.14);

  const off = () => {
    kit.visible = false;
    s.held = null;
  };
  off();
  return {
    spot: s,
    update(t: number): XeNow | null {
      const N = clock(t);
      if (!N) {
        off();
        return null;
      }
      kit.visible = true;
      const n = N.n;
      flutter.forEach((m, i) => {
        m.position.y = 0.02 * Math.sin(t * 7 + i * 1.1) * (i + 1) * 0.5;
        m.rotation.z = 0.25 * Math.sin(t * 7 + i * 1.1);
      });
      gloves.visible = n.gloves < 0.5;
      // The mask, on its post or on the face.
      put(mask, N.p.mask ?? SPR.mask);
      mask.rotation.set(0, N.p.mask && n.mask >= 0.75 ? N.at.yaw : Math.PI / 2, 0);
      // The tank.
      put(pack, N.p.pack ?? SPR.pack);
      pack.rotation.set(N.p.pack && n.pack > 0.75 ? N.key.lean : 0, N.p.pack ? N.at.yaw : Math.PI / 2, 0, 'YXZ');
      lever.rotation.x = (n.pump ?? 0) * 0.28;
      // The lance and the hose.
      const on = n.lance > 0.5 && !!N.p.lance;
      lance.visible = on;
      if (on) {
        put(lance, N.p.lance!);
        if (N.p.aim) aimAt(lance, N.p.aim);
        const b = N.p.pack!;
        hose(sp({ x: b[0], z: b[2], yaw: N.at.yaw }, -0.14, b[1] - 0.2, -0.02), N.p.lance!);
        tmpA.set(0, 0, 0.58).applyQuaternion(lance.quaternion).add(lance.position);
        const nz: P = [tmpA.x, tmpA.y, tmpA.z];
        tmpB.set(0, 0, 0.6).applyQuaternion(lance.quaternion);
        const land: P = [nz[0] + tmpB.x, Math.max(0.22, nz[1] + tmpB.y), nz[2] + tmpB.z];
        mist(n.spray > 0.2 ? nz : null, land, n.spray, t);
      } else {
        hose(null);
        mist(null);
      }
      leaf.visible = !!N.p.leaf;
      if (N.p.leaf) {
        put(leaf, N.p.leaf);
        leaf.rotation.x = -2.2 * (n.flip ?? 0);
      }
      s.held = N.tool === 'lance' ? lanceHeld : N.tool === 'pack' ? packHeld : N.tool === 'mask' ? maskHeld : null;
      return N;
    },
  };
}
