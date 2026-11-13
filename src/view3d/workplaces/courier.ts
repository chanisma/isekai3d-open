import * as THREE from 'three';
import { marker, rod, shade, spot, type Builder, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, glowing, label, painted, picture, seeded, text, type Paint } from './doctor';
import * as CX from './courierMotion';

/**
 * The 택배 물류센터 drawn as itself (2026-10-27 workplace pipeline, at the user's request): grey steel,
 * yellow guard rails, kraft boxes with the waybill on top (날쌘택배, a made-up company, in its teal and
 * yellow). The conveyor runs all the time — boxes slide in down the chute at the back, ride the belt
 * under the scanner arch and drop down the slide into the bin, the cleats and the drums turning — and
 * the sorter at its front takes one off as it reaches them, reads it, scans it with the PDA off the
 * rail (삑) and sets it on their route's pile. The roll cage is a wire cage on castors, the zone's
 * placard in its sleeve, filled a shelf at a time; the scanning desk has its scan gun, label printer
 * and monitor; the scale (shared with the 우체국, so unbranded) reads out in red digits as it settles;
 * the 1톤 탑차 has its cab-over cab, its yellow 배 plate and its box in the company's livery, the back
 * doors folded round to load it from the hand truck, and drives off on its round and backs in again.
 * And what the hub was missing (workFurniture/courier.ts): the 구역 shelf, the pallet jack under a
 * wrapped pallet, the packing table, the returns bin, the 배송 현황판 with the PDAs charging under it,
 * and the 무인 택배함.
 *
 * The hands and what they hold go by one clock (courierMotion.ts): the box is in the hands when the
 * hands are at it, the door swings as it's pulled. What's moved for a use is put back every frame it
 * isn't going on (`away`, told every frame), so nothing's left half-done when the work stops.
 */

const KRAFT = '#c99d63';
const KRAFT_D = '#a97c46';
const TAPE = '#b48450';
const TEAL = '#00897b';
const TEAL_D = '#00695c';
const YELLOW = '#fbc02d';
const GREY = '#78909c';
const GREY_D = '#455a64';
const WHITE = '#f5f5f2';
const RED = '#e53935';
const SKIN = '#ecc6a3';
const BRAND = '날쌘택배';
const UP = new THREE.Vector3(0, 1, 0);
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// ---------------------------------------------------------------------------------------------
// Small parts.

function group(parent: THREE.Object3D, x = 0, y = 0, z = 0, ry = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}
/** A group for something carried or moved about: built out at the front (so it's not part of the solid body) and hidden. */
function loose(parent: THREE.Object3D): THREE.Group {
  const m = group(parent, 0, 0, 5);
  m.visible = false;
  return m;
}
/** Put a loose thing at `p` (hidden if there's nowhere), turned `yaw`. */
function placeAt(m: THREE.Object3D, p: THREE.Vector3 | undefined, yaw = 0, pitch = 0) {
  m.visible = !!p;
  if (!p) return;
  m.position.copy(p);
  m.rotation.set(pitch, yaw, 0, 'YXZ');
}

/** Flat pictures (labels, stickers): a plane a size, a material a texture, all shared. */
const planes = new Map<string, THREE.PlaneGeometry>();
const decals = new Map<THREE.Texture, THREE.MeshBasicMaterial>();
function decal(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, rx = 0, ry = 0): THREE.Mesh {
  const key = `${w.toFixed(3)}x${h.toFixed(3)}`;
  let geom = planes.get(key);
  if (!geom) planes.set(key, (geom = new THREE.PlaneGeometry(w, h)));
  let mat = decals.get(tex);
  if (!mat) decals.set(tex, (mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.05 })));
  const m = new THREE.Mesh(geom, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, 0, 'YXZ');
  g.add(m);
  return m;
}
const FLAT = -Math.PI / 2;

/** A cylinder stretched between two points each frame (a laser line). */
function limb(g: THREE.Object3D, r: number, material: THREE.Material): (a: THREE.Vector3 | null, b?: THREE.Vector3) => void {
  const m = new THREE.Mesh(cyl(r, r, 1, 6), material);
  m.visible = false;
  g.add(m);
  const d = new THREE.Vector3();
  return (a, b) => {
    m.visible = !!a && !!b;
    if (!a || !b) return;
    d.subVectors(b, a);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.scale.set(1, Math.max(0.001, d.length()), 1);
    m.quaternion.setFromUnitVectors(UP, d.normalize());
  };
}
const LASER = new THREE.MeshBasicMaterial({ color: '#ff1744', transparent: true, opacity: 0.85, depthWrite: false });
const FILM = new THREE.MeshToonMaterial({ color: '#e3f2fd', transparent: true, opacity: 0.38, depthWrite: false });
const BUBBLES = new THREE.MeshToonMaterial({ color: '#e1f5fe', transparent: true, opacity: 0.62, depthWrite: false, side: THREE.DoubleSide });
const GLASS = new THREE.MeshToonMaterial({ color: '#cfe8f3', transparent: true, opacity: 0.35, depthWrite: false });
const CAVITY = new THREE.MeshBasicMaterial({ color: '#2f3a40' });

/** A wire panel: a see-through grid of steel. */
const meshTex = painted('cxWireMesh', 128, 128, (c) => {
  c.clearRect(0, 0, 128, 128);
  c.strokeStyle = '#9aa5ad';
  c.lineWidth = 5;
  for (let i = 0; i <= 4; i++) {
    c.beginPath();
    c.moveTo(i * 32, 0);
    c.lineTo(i * 32, 128);
    c.moveTo(0, i * 32);
    c.lineTo(128, i * 32);
    c.stroke();
  }
});
const wireMats = new Map<string, THREE.MeshBasicMaterial>();
function wire(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, ry = 0): THREE.Mesh {
  const key = `${w.toFixed(2)}x${h.toFixed(2)}`;
  let mat = wireMats.get(key);
  if (!mat) {
    const t = meshTex.clone();
    t.needsUpdate = true;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(w / 0.4, h / 0.4);
    wireMats.set(key, (mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, color: '#c5ccd1' })));
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.userData.ownGeometry = true;
  m.position.set(x, y, z);
  m.rotation.y = ry;
  g.add(m);
  return m;
}

// ---------------------------------------------------------------------------------------------
// Pictures.

/** The waybill on a box: the company's band, the barcode, the address lines and the zone code in big type. */
function billTex(zone: string, plain = false): THREE.Texture {
  return painted(`cxBill|${zone}|${plain}`, 160, 112, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 160, 112);
    if (!plain) {
      c.fillStyle = TEAL;
      c.fillRect(0, 0, 160, 22);
      text(c, BRAND, 6, 12, 15, '#ffffff');
      text(c, zone, 154, 12, 15, YELLOW, 'right');
    } else {
      c.strokeStyle = '#90a4ae';
      c.lineWidth = 2;
      c.strokeRect(2, 2, 156, 108);
    }
    const r = seeded(zone.charCodeAt(0) * 31 + zone.length + (plain ? 7 : 0));
    let x = 8;
    while (x < 100) {
      const w = 1 + Math.floor(r() * 3);
      c.fillStyle = '#111111';
      c.fillRect(x, 30, w, 34);
      x += w + 1 + Math.floor(r() * 3);
    }
    if (!plain) text(c, zone, 104, 47, 26, '#111111');
    c.fillStyle = '#9e9e9e';
    for (let i = 0; i < 3; i++) c.fillRect(8, 74 + i * 11, 70 + r() * 70, 5);
  });
}
const ZONES = ['A-03', 'B-07', 'C-12', 'D-02', 'B-11', 'A-08'];
/** A red 반품 sticker. */
const returnTex = painted('cxReturnSticker', 96, 64, (c) => {
  c.fillStyle = RED;
  c.beginPath();
  c.roundRect(2, 2, 92, 60, 10);
  c.fill();
  text(c, '반품', 48, 28, 28, '#ffffff', 'center');
  text(c, 'RETURN', 48, 52, 12, '#ffcdd2', 'center');
});
/** A red 파손 sticker and the fragile one. */
const brokenTex = painted('cxBroken', 96, 48, (c) => {
  c.fillStyle = '#ffebee';
  c.fillRect(0, 0, 96, 48);
  c.strokeStyle = RED;
  c.lineWidth = 4;
  c.strokeRect(2, 2, 92, 44);
  text(c, '파손 접수', 48, 25, 20, RED, 'center');
});
const fragileTex = painted('cxFragile', 96, 64, (c) => {
  c.fillStyle = '#ff6f00';
  c.fillRect(0, 0, 96, 64);
  text(c, '취급주의', 48, 24, 22, '#ffffff', 'center');
  text(c, 'FRAGILE', 48, 48, 14, '#fff3e0', 'center');
});
/** The company's mark: a teal rounded square with a yellow wing. */
const logoTex = painted('cxLogo', 64, 64, (c) => {
  c.fillStyle = TEAL;
  c.beginPath();
  c.roundRect(2, 2, 60, 60, 14);
  c.fill();
  c.fillStyle = YELLOW;
  c.beginPath();
  c.moveTo(12, 44);
  c.quadraticCurveTo(30, 12, 54, 16);
  c.quadraticCurveTo(36, 26, 28, 46);
  c.closePath();
  c.fill();
});

/** A bubble of words over someone, turned to the camera. */
const paintBubble = (s: string, size = 40): Paint => (c) => {
  c.clearRect(0, 0, 512, 160);
  c.fillStyle = '#ffffff';
  c.strokeStyle = '#3b2b2b';
  c.lineWidth = 6;
  c.beginPath();
  c.roundRect(8, 8, 496, 112, 40);
  c.fill();
  c.stroke();
  c.beginPath();
  c.moveTo(220, 118);
  c.lineTo(250, 152);
  c.lineTo(270, 118);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = '#ffffff';
  c.fillRect(222, 110, 46, 12);
  text(c, s, 256, 66, size, '#263238', 'center');
};
function bubble(parent: THREE.Object3D, s: string, w: number, size = 40): THREE.Sprite {
  const mat = new THREE.SpriteMaterial({ map: painted(`cxBubble|${s}`, 512, 160, paintBubble(s, size)), transparent: true, depthWrite: false });
  const sp = new THREE.Sprite(mat);
  sp.userData.ownMaterial = true;
  sp.scale.set(w, w * 0.3125, 1);
  sp.renderOrder = 5;
  sp.visible = false;
  parent.add(sp);
  return sp;
}

/** A face whose picture changes (a screen): `show(i)`. */
function swapScreen(g: THREE.Object3D, texes: THREE.Texture[], w: number, h: number, x: number, y: number, z: number, rx = 0, ry = 0): (i: number) => void {
  const mat = new THREE.MeshBasicMaterial({ map: texes[0] });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.userData.ownGeometry = mesh.userData.ownMaterial = true;
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, 0, 'YXZ');
  g.add(mesh);
  let cur = 0;
  return (i) => {
    if (i === cur || !texes[i]) return;
    cur = i;
    mat.map = texes[i];
    mat.needsUpdate = true;
  };
}

// ---------------------------------------------------------------------------------------------
// Boxes and handheld things.

type Kind = 'kraft' | 'poly' | 'plain' | 'return' | 'broken';
/** A parcel, its middle at the group's origin: a kraft box taped along its seam with the waybill on top, or a poly mailer. */
function parcel(parent: THREE.Object3D, s: CX.V, kind: Kind = 'kraft', zone = 'B-07', outline = true): THREE.Group {
  const g = group(parent);
  const [w, h, d] = s;
  if (kind === 'poly') {
    part(g, rbox(w, h, d, Math.min(h / 2, 0.04)), '#e9e6df', 0, 0, 0, { outline });
    decal(g, billTex(zone), Math.min(0.13, w * 0.5), Math.min(0.09, d * 0.45), w * 0.12, h / 2 + 0.003, 0, FLAT);
    return g;
  }
  part(g, rbox(w, h, d, 0.012), kind === 'return' ? '#bf9a68' : KRAFT, 0, 0, 0, { outline });
  part(g, box(w + 0.004, 0.004, Math.min(0.06, d * 0.25)), TAPE, 0, h / 2, 0, { outline: false });
  const lw = Math.min(0.13, w * 0.42);
  decal(g, billTex(zone, kind === 'plain'), lw, lw * 0.7, w / 2 - lw / 2 - 0.02, h / 2 + 0.004, d / 4, FLAT);
  if (kind === 'return') decal(g, returnTex, Math.min(0.1, w * 0.35), Math.min(0.066, w * 0.23), -w / 4, h / 2 + 0.004, -d / 4, FLAT);
  if (kind === 'broken') {
    decal(g, brokenTex, 0.12, 0.06, 0, 0, d / 2 + 0.003);
    part(g, box(0.1, 0.07, 0.004), KRAFT_D, w / 2 - 0.07, h / 2 - 0.05, d / 2, { outline: false, rz: 0.3 });
  }
  return g;
}
/** A PDA (the courier's handheld): grey with a yellow bumper, its screen, the scan window at its nose; origin at the grip, nose along +z. */
function pda(parent: THREE.Object3D): { g: THREE.Group; screen: THREE.Mesh; nose: THREE.Object3D } {
  const g = group(parent);
  part(g, rbox(0.075, 0.032, 0.17, 0.012), '#37474f', 0, 0, 0.03);
  part(g, rbox(0.082, 0.024, 0.05, 0.01), YELLOW, 0, -0.004, 0.105, { outline: false });
  part(g, rbox(0.082, 0.024, 0.04, 0.01), YELLOW, 0, -0.004, -0.045, { outline: false });
  const screen = glowing(g, box(0.055, 0.002, 0.07), '#80deea', 0, 0.017, 0.035);
  for (let i = 0; i < 3; i++) part(g, box(0.012, 0.003, 0.008), '#cfd8dc', -0.018 + i * 0.018, 0.017, -0.02, { outline: false });
  glowing(g, box(0.05, 0.012, 0.003), '#ff5252', 0, 0, 0.116);
  const nose = marker(g, 0, 0, 0.12);
  return { g, screen, nose };
}
/** A pistol-grip scan gun: yellow and black, the window at its nose (+z), the grip down. */
function scanGun(parent: THREE.Object3D): { g: THREE.Group; nose: THREE.Object3D } {
  const g = group(parent);
  part(g, rbox(0.05, 0.06, 0.14, 0.015), YELLOW, 0, 0.03, 0.03);
  part(g, rbox(0.045, 0.11, 0.045, 0.012), '#263238', 0, -0.03, -0.02, { rx: -0.3 });
  part(g, box(0.012, 0.025, 0.014), '#263238', 0, -0.005, 0.02);
  glowing(g, box(0.04, 0.035, 0.003), '#ff5252', 0, 0.03, 0.101);
  return { g, nose: marker(g, 0, 0.03, 0.105) };
}
/** A tablet in a rugged case, face up and toward the holder. */
function tablet(parent: THREE.Object3D, tex: THREE.Texture): THREE.Group {
  const g = group(parent);
  part(g, rbox(0.24, 0.016, 0.17, 0.012), '#263238', 0, 0, 0);
  decal(g, tex, 0.21, 0.14, 0, 0.009, 0, FLAT, Math.PI);
  return g;
}
/** A clipboard with its sheet. */
function clipboard(parent: THREE.Object3D): THREE.Group {
  const g = group(parent);
  part(g, rbox(0.22, 0.008, 0.3, 0.004), '#8d6e63', 0, 0, 0);
  decal(g, sheetTex, 0.19, 0.26, 0, 0.006, 0.01, FLAT, Math.PI);
  part(g, rbox(0.08, 0.012, 0.025, 0.004), CHROME, 0, 0.008, 0.135, { outline: false });
  return g;
}
const sheetTex = painted('cxSheet', 96, 128, (c) => {
  c.fillStyle = '#fafafa';
  c.fillRect(0, 0, 96, 128);
  text(c, '배송 인력 배치', 48, 12, 11, '#263238', 'center');
  c.strokeStyle = '#90a4ae';
  c.lineWidth = 1;
  for (let i = 0; i < 9; i++) {
    c.beginPath();
    c.moveTo(6, 24 + i * 11);
    c.lineTo(90, 24 + i * 11);
    c.stroke();
  }
  const names = ['A 하빠름', 'B 고성실', 'C 석물류', 'D 김신속'];
  names.forEach((s, i) => text(c, s, 8, 30 + i * 22, 10, '#37474f', 'left', false));
  c.strokeStyle = '#1e88e5';
  c.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    c.beginPath();
    c.moveTo(70, 26 + i * 22);
    c.lineTo(75, 32 + i * 22);
    c.lineTo(86, 20 + i * 22);
    c.stroke();
  }
});
/** A smartphone, screen toward +y. */
function phone(parent: THREE.Object3D): THREE.Group {
  const g = group(parent);
  part(g, rbox(0.075, 0.01, 0.15, 0.01), '#212121', 0, 0, 0);
  glowing(g, box(0.064, 0.002, 0.13), '#90caf9', 0, 0.006, 0);
  return g;
}
/** A tape gun: the roll on its arm, the handle, the toothed blade at the front (+z). */
function tapeGun(parent: THREE.Object3D): THREE.Group {
  const g = group(parent);
  part(g, cyl(0.055, 0.055, 0.05, 16), TAPE, 0, 0.04, 0, { rz: Math.PI / 2 });
  part(g, cyl(0.03, 0.03, 0.052, 12), '#5d4037', 0, 0.04, 0, { rz: Math.PI / 2, outline: false });
  part(g, rbox(0.03, 0.025, 0.16, 0.008), RED, 0, 0.0, 0.04);
  part(g, rbox(0.03, 0.1, 0.035, 0.01), '#212121', 0, -0.05, -0.02, { rx: 0.25 });
  part(g, box(0.06, 0.004, 0.012), CHROME, 0, 0.0, 0.125, { outline: false });
  return g;
}
/** A pen. */
function pen(parent: THREE.Object3D): THREE.Group {
  const g = group(parent);
  part(g, cyl(0.005, 0.005, 0.13, 6), '#1565c0', 0, 0.05, 0, { rx: 0.4, outline: false });
  return g;
}

// ---------------------------------------------------------------------------------------------
// Whose spot it is, and the frame the motion's worked out in.

const tmp = new THREE.Vector3();
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
/** Whether a dweller's posed at a spot just now (activity.ts spotPose marks it). */
const posed = (s: Spot, t: number) => Math.abs(t - posedAt(s)) < 0.6;
const heightAt = (s: Spot) => (s.at.userData.height as number | undefined) ?? 1.6;
const phaseOf = (work: THREE.Object3D) => CX.cxPhase(work.getWorldPosition(tmp));

interface Use {
  s: Spot;
  m: CX.CxMotion;
  work: THREE.Object3D;
}
/** A spot stood at (x, z), facing its motion's base way, its work mark where the motion has it. */
function use(g: THREE.Object3D, m: CX.CxMotion, x: number, z: number, work?: THREE.Object3D): Use {
  const w = work ?? marker(g, ...(CX.cxWork(m) as [number, number, number]));
  const s = spot(g, 'stand', x, 0, z, CX.cxYaw(m, 0, 0));
  s.work = w;
  s.motion = m;
  return { s, m, work: w };
}
/** The hands now for a use that's going on (turning its spot by its clock first), or null. */
function run(u: Use, t: number): { h: CX.Hands; ph: number; yaw: number } | null {
  if (!posed(u.s, t)) return null;
  const ph = phaseOf(u.work);
  u.s.at.rotation.y = CX.cxYaw(u.m, t, ph);
  const f = CX.frameAt(u.work.position, u.m === 'cxClipboard' ? [u.work.position.x, u.work.position.y, u.work.position.z] : CX.cxWork(u.m), 0, u.s.at.position, u.s.at.rotation.y, heightAt(u.s));
  return { h: CX.cxHands(u.m, f, t, ph), ph, yaw: u.s.at.rotation.y };
}
/** A PDA that lives in a holster and comes out into the right hand: its laser to the label, the beep. */
function scanner(g: THREE.Object3D, holster: CX.V, ry = 0) {
  const inHolster = pda(g);
  inHolster.g.position.set(holster[0], holster[1] + 0.02, holster[2]);
  inHolster.g.rotation.set(-1.2, ry, 0, 'YXZ');
  const held = pda(loose(g));
  const laser = limb(g, 0.003, LASER);
  const beep = bubble(g, '삑!', 0.26, 64);
  const nose = new THREE.Vector3();
  return {
    /** Out of the holster at `p` (or back in it), aimed at `target` with the laser on, beeping. */
    set(p: THREE.Vector3 | undefined, yaw: number, target?: THREE.Vector3, lasing = false, beeping = false) {
      inHolster.g.visible = !p;
      placeAt(held.g.parent!, p, yaw, 0.75);
      held.g.parent!.visible = !!p;
      (held.screen.material as THREE.MeshBasicMaterial).color.set(beeping ? '#69f0ae' : '#80deea');
      if (p && lasing && target) {
        held.g.parent!.updateMatrix();
        held.nose.updateMatrix();
        nose.copy(held.nose.position).applyMatrix4(held.g.matrix).applyMatrix4(held.g.parent!.matrix);
        laser(nose, target);
      } else laser(null);
      beep.visible = beeping && !!p;
      if (p) beep.position.copy(p).add(new THREE.Vector3(0, 0.32, 0));
    },
  };
}

// =============================================================================================
// The conveyor.

function conveyor(g: THREE.Group, out: Parameters<Builder>[6]) {
  const { x0, x1, y: by, hw } = CX.BELT;
  const L = x1 - x0;
  const mid = (x0 + x1) / 2;
  // The frame: side channels, the yellow guard rails, the legs braced, the belt's dark top.
  for (const sz of [-1, 1]) {
    part(g, box(L + 0.12, 0.14, 0.04), GREY, mid, by - 0.08, sz * (hw + 0.03));
    part(g, rbox(L + 0.12, 0.05, 0.035, 0.012), YELLOW, mid, by + 0.055, sz * (hw + 0.045));
    for (const lx of [x0 + 0.1, mid, x1 - 0.1]) {
      part(g, box(0.05, by - 0.12, 0.05), STEEL, lx, (by - 0.12) / 2, sz * (hw - 0.02));
      part(g, rbox(0.1, 0.02, 0.1, 0.008), GREY_D, lx, 0.01, sz * (hw - 0.02));
    }
  }
  for (const lx of [x0 + 0.1, mid, x1 - 0.1]) part(g, box(0.035, 0.035, 2 * hw), STEEL, lx, 0.28, 0, { outline: false });
  part(g, box(L, 0.025, 2 * hw), '#2b2d31', mid, by - 0.012, 0, { outline: false });
  // The cleats on the belt and the drums at its ends (moved in away()).
  const cleats: THREE.Mesh[] = [];
  for (let i = 0; i < 12; i++) cleats.push(part(g, box(0.018, 0.006, 2 * hw - 0.03), '#4b4f55', 0, by + 0.003, 0, { outline: false }));
  const drums: THREE.Group[] = [];
  for (const x of [x0, x1]) {
    const d = group(g, x, by - 0.04, 0);
    part(d, cyl(0.045, 0.045, 2 * hw, 14), '#3a3d42', 0, 0, 0, { rx: Math.PI / 2 });
    part(d, box(0.09, 0.012, 2 * hw + 0.004), '#5f646b', 0, 0, 0, { outline: false });
    drums.push(d);
  }
  // The motor and its gearbox under the right end, a guard over the chain.
  part(g, cyl(0.08, 0.08, 0.26, 16), '#1e5f8c', x1 - 0.2, by - 0.24, -0.12, { rx: Math.PI / 2 });
  part(g, rbox(0.16, 0.16, 0.14, 0.02), '#26475f', x1 - 0.2, by - 0.24, 0.06);
  part(g, rbox(0.06, 0.3, 0.05, 0.01), YELLOW, x1 - 0.05, by - 0.16, -hw - 0.05);
  // The infeed chute at the back of the left end: rollers on a slope down onto the belt.
  const chute = group(g, x0 + 0.18, by + 0.1, -0.33);
  chute.rotation.x = 0.42;
  part(chute, box(0.42, 0.02, 0.36), GREY_D, 0, -0.02, 0, { outline: false });
  for (const sx of [-1, 1]) part(chute, rbox(0.03, 0.08, 0.38, 0.01), YELLOW, sx * 0.22, 0.02, 0);
  for (let i = 0; i < 6; i++) part(chute, cyl(0.018, 0.018, 0.4, 8), CHROME, 0, 0.005, -0.15 + i * 0.06, { rz: Math.PI / 2, outline: false });
  for (const sx of [-1, 1]) part(g, box(0.04, by + 0.14, 0.04), STEEL, x0 + 0.18 + sx * 0.2, (by + 0.14) / 2, -0.46);
  // The slide off the right end into a cardboard bin, boxes heaped in it.
  const slide = group(g, x1 + 0.17, by - 0.25, 0);
  slide.rotation.z = -0.75;
  part(slide, box(0.4, 0.02, 2 * hw), CHROME, 0, 0, 0, { outline: false });
  for (const sz of [-1, 1]) part(slide, rbox(0.42, 0.07, 0.025, 0.01), YELLOW, 0, 0.03, sz * (hw + 0.01));
  const bin = group(g, x1 + 0.33, 0, 0);
  part(bin, rbox(0.34, 0.5, 0.7, 0.02), KRAFT_D, 0, 0.25, 0);
  part(bin, box(0.3, 0.02, 0.66), '#5d4630', 0, 0.48, 0, { outline: false });
  const heap = [[0.36, 0.2, 0.28], [0.3, 0.22, 0.26], [0.28, 0.1, 0.3]] as CX.V[];
  heap.forEach((s, i) => {
    const p = parcel(bin, s, i === 2 ? 'poly' : 'kraft', ZONES[i + 2], false);
    p.position.set(0.0, 0.43 + s[1] / 2 + (i === 2 ? 0.06 : 0), -0.18 + i * 0.2);
    p.rotation.set(0.1 * (i - 1), 0.4 * i, 0.12);
  });
  // The scanner arch over the belt: a laser line on the boxes going under it, its head and its light.
  const ax = x0 + 0.5;
  for (const sz of [-1, 1]) part(g, rbox(0.06, 0.62, 0.06, 0.01), GREY_D, ax, by + 0.31, sz * (hw + 0.12));
  part(g, rbox(0.16, 0.12, 2 * hw + 0.32, 0.02), '#263238', ax, by + 0.62, 0);
  label(g, '자동 스캔', 0.3, 0.07, ax, by + 0.62, hw + 0.165, '#263238', '#80deea');
  const fan = new THREE.Mesh(new THREE.PlaneGeometry(0.006, 2 * hw), LASER);
  fan.userData.ownGeometry = true;
  fan.position.set(ax, by + 0.006, 0);
  fan.rotation.x = FLAT;
  g.add(fan);
  const lamp = glowing(g, box(0.05, 0.03, 0.03), '#69f0ae', ax, by + 0.7, 0);
  // The line's sign on a post behind it.
  part(g, box(0.04, 1.8, 0.04), STEEL, 0.25, 0.9, -0.47);
  const sign = painted('cxLineSign', 320, 96, (c) => {
    c.fillStyle = TEAL;
    c.fillRect(0, 0, 320, 96);
    c.fillStyle = YELLOW;
    c.fillRect(0, 70, 320, 26);
    text(c, '분류 1라인', 16, 36, 34, '#ffffff');
    text(c, 'A · B · C · D 구역', 304, 36, 24, '#e0f2f1', 'right');
    text(c, '컨베이어 주변 뛰지 마세요', 160, 84, 16, '#263238', 'center');
  });
  part(g, rbox(0.94, 0.3, 0.03, 0.01), TEAL_D, 0.25, 1.72, -0.47);
  picture(g, sign, 0.9, 0.27, 0.25, 1.72, -0.453);
  // The control box at the right end: its count screen, start and the red mushroom stop.
  const [px, py, pz] = CX.PANEL;
  part(g, box(0.04, 0.24, 0.04), STEEL, px, by - 0.02, pz - 0.05);
  const panel = group(g, px, py, pz);
  panel.rotation.x = -0.5;
  part(panel, rbox(0.3, 0.2, 0.08, 0.015), '#cfd8dc', 0, 0, -0.04);
  const thru = [0, 1, 2, 3].map((i) =>
    painted(`cxThru${i}`, 160, 96, (c) => {
      c.fillStyle = '#0b1f2a';
      c.fillRect(0, 0, 160, 96);
      text(c, '처리량 (시간당)', 8, 14, 13, '#80cbc4');
      text(c, `${(1284 + i * 7).toLocaleString('en-US')}건`, 152, 46, 30, '#e0f7fa', 'right');
      c.fillStyle = '#263238';
      c.fillRect(8, 70, 144, 12);
      c.fillStyle = '#26a69a';
      c.fillRect(8, 70, 90 + i * 10, 12);
      text(c, `목표 1,500 · ${Math.round(((1284 + i * 7) / 1500) * 100)}%`, 8, 90, 10, '#b2dfdb', 'left', false);
    }),
  );
  const showThru = swapScreen(panel, thru, 0.17, 0.1, -0.04, 0.02, 0.002);
  part(panel, cyl(0.022, 0.022, 0.02, 14), '#2e7d32', 0.1, 0.04, 0.0, { rx: Math.PI / 2 });
  part(panel, cyl(0.035, 0.035, 0.015, 16), YELLOW, 0.1, -0.05, -0.002, { rx: Math.PI / 2 });
  part(panel, cyl(0.026, 0.02, 0.03, 14), '#d50000', 0.1, -0.05, 0.015, { rx: Math.PI / 2 });
  // The PDA's holster on the front rail.
  part(g, rbox(0.09, 0.06, 0.04, 0.01), '#263238', CX.SORT_HOLSTER[0], CX.SORT_HOLSTER[1] - 0.01, CX.SORT_HOLSTER[2] + 0.01);
  const pdaUse = scanner(g, CX.SORT_HOLSTER);
  // The boxes on the belt.
  const riding = CX.BELT_BOXES.map((s, i) => parcel(g, s, i === 2 ? 'poly' : 'kraft', ZONES[i]));
  // This route's pile on the floor at the sorter's right (only while sorting), on a blue plastic pallet.
  const pile = group(g, CX.SORT_PILE.x, 0, CX.SORT_PILE.z);
  pile.visible = false;
  part(pile, rbox(0.5, 0.1, 0.46, 0.015), '#1565c0', 0, 0.05, 0);
  for (const sx of [-1, 0, 1]) part(pile, box(0.06, 0.06, 0.47), '#0d47a1', sx * 0.2, 0.03, 0, { outline: false });
  const piled = [0, 1, 2, 3].map((i) => {
    const p = parcel(pile, CX.BELT_BOXES[1], 'kraft', ZONES[(i + 1) % ZONES.length]);
    p.position.set(0.01 * (i % 2), CX.SORT_PILE.y + CX.BELT_BOXES[1][1] / 2 + i * 0.245, 0);
    p.rotation.y = 0.08 * (i - 1.5);
    return p;
  });
  // What's carried: the box off the belt, the tablet for the throughput check.
  const carried = loose(g);
  parcel(carried, CX.BELT_BOXES[1], 'kraft', ZONES[1]);
  const pad = loose(g);
  const padTex = painted('cxThruPad', 128, 96, (c) => {
    c.fillStyle = '#eceff1';
    c.fillRect(0, 0, 128, 96);
    text(c, '1라인 처리량', 6, 10, 11, '#263238');
    c.fillStyle = '#26a69a';
    [40, 55, 48, 66, 72, 61, 80].forEach((h, i) => c.fillRect(8 + i * 16, 90 - h, 10, h));
  });
  tablet(pad, padTex);
  const sorter = use(g, 'cxSort', CX.SORT_SPOT.x, CX.SORT_SPOT.z);
  const thruUse = use(g, 'cxThroughput', CX.THRU_SPOT.x, CX.THRU_SPOT.z, marker(g, ...(CX.PANEL as [number, number, number])));
  out.work = sorter.work;
  out.spots = { sortParcels: sorter.s, courier_throughputCheck: thruUse.s, '*': sorter.s };
  const at = new THREE.Vector3();
  out.away = (_o, t) => {
    const ph = phaseOf(sorter.work);
    const T = L;
    // The belt runs: cleats, drums, the boxes riding it in from the chute and off down the slide.
    const run1 = (t / CX.SORT_T + ph) * T;
    cleats.forEach((c, i) => (c.position.x = x0 + 0.02 + (((run1 + (i / cleats.length) * T) % T) + T) % T * ((L - 0.04) / T)));
    for (const d of drums) d.rotation.z = -run1 / 0.045;
    const sorting = run(sorter, t);
    const s = sorting ? CX.sortAt(t, sorting.ph) : null;
    riding.forEach((b, i) => {
      const u = CX.beltAt(t, ph, i);
      const sz = CX.BELT_BOXES[i];
      let x = x0 + u * L;
      let y = by + sz[1] / 2;
      let z = 0;
      let rz = 0;
      if (u < 0.1) {
        // Sliding down the chute from the back.
        const e = 1 - u / 0.1;
        z = -0.42 * e;
        y += 0.2 * e;
      }
      if (u > 0.9) {
        const e = (u - 0.9) / 0.1;
        x += 0.3 * e;
        y -= 0.45 * e * e;
        rz = -0.8 * e;
      }
      b.position.set(x, y, z);
      b.rotation.set(0, 0, rz);
      b.visible = !(i === 1 && s?.taken);
    });
    lamp.visible = Math.sin(t * 5) > -0.6;
    showThru(Math.floor(t / 2.5) % 4);
    // The sorter: the box in the hands, the PDA out and scanning, the pile growing.
    pile.visible = !!sorting;
    if (sorting && s) {
      placeAt(carried, sorting.h.item, sorting.yaw);
      piled.forEach((p, i) => (p.visible = i < s.pile));
      at.copy(sorting.h.item ?? sorting.h.l).y += CX.BELT_BOXES[1][1] / 2;
      pdaUse.set(s.pda ? undefined : sorting.h.tool, sorting.yaw, at, s.laser, s.beep);
    } else {
      carried.visible = false;
      pdaUse.set(undefined, 0);
    }
    const thrue = run(thruUse, t);
    placeAt(pad, thrue?.h.item, (thrue?.yaw ?? 0) + Math.PI, 0.5);
  };
}

// =============================================================================================
// The roll cage.

function rollCage(g: THREE.Group, out: Parameters<Builder>[6]) {
  const C = CX.CAGE;
  const z0 = C.z;
  const hw = C.w / 2;
  const hd = C.d / 2;
  const METAL = '#a4adb4';
  // Castors, the base frame and its deck.
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      part(g, box(0.04, 0.05, 0.04), GREY_D, sx * (hw - 0.05), 0.12, z0 + sz * (hd - 0.05));
      part(g, cyl(0.05, 0.05, 0.035, 12), '#263238', sx * (hw - 0.05), 0.05, z0 + sz * (hd - 0.05), { rx: Math.PI / 2 });
    }
  part(g, rbox(C.w, 0.04, C.d, 0.01), METAL, 0, C.deck - 0.02, z0);
  part(g, box(C.w - 0.04, 0.005, C.d - 0.04), '#78838a', 0, C.deck + 0.001, z0, { outline: false });
  // The posts, the top rail, the shelf halfway, wire on the back and the sides.
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) part(g, box(0.028, C.top - C.deck, 0.028), METAL, sx * (hw - 0.014), (C.top + C.deck) / 2, z0 + sz * (hd - 0.014));
  for (const sz of [-1, 1]) part(g, box(C.w, 0.025, 0.025), METAL, 0, C.top, z0 + sz * (hd - 0.014));
  for (const sx of [-1, 1]) part(g, box(0.025, 0.025, C.d), METAL, sx * (hw - 0.014), C.top, z0);
  part(g, rbox(C.w - 0.04, 0.03, C.d - 0.04, 0.008), METAL, 0, C.shelf - 0.015, z0);
  wire(g, C.w - 0.03, C.top - C.deck, 0, (C.top + C.deck) / 2, z0 - hd + 0.014);
  for (const sx of [-1, 1]) wire(g, C.d - 0.03, C.top - C.deck, sx * (hw - 0.014), (C.top + C.deck) / 2, z0, Math.PI / 2);
  // The yellow straps across the open front, buckled on the right.
  for (const y of [0.62, 1.38]) {
    part(g, box(C.w, 0.035, 0.006), YELLOW, 0, y, z0 + hd + 0.005, { outline: false });
    part(g, rbox(0.05, 0.045, 0.02, 0.006), '#263238', hw - 0.08, y, z0 + hd + 0.012);
  }
  // The zone's placard in its sleeve on the right front post.
  const plac = painted('cxPlacard', 128, 96, (c) => {
    c.fillStyle = YELLOW;
    c.fillRect(0, 0, 128, 96);
    text(c, 'B-07', 64, 34, 40, '#212121', 'center');
    text(c, '역삼1동 · 1차', 64, 72, 18, '#37474f', 'center');
  });
  const pz = z0 + hd + 0.01;
  part(g, rbox(0.2, 0.15, 0.01, 0.004), '#eceff1', hw - 0.12, 1.55, pz);
  picture(g, plac, 0.18, 0.135, hw - 0.12, 1.55, pz + 0.007);
  const placard = marker(g, hw - 0.12, 1.55, pz);
  // What's in it: the back row always, the front row filled as it's stacked.
  const rng = seeded(41);
  for (const y of [C.deck, C.shelf]) {
    for (const sx of [-1, 1]) {
      const p = parcel(g, [0.3, 0.24 + 0.08 * rng(), 0.24], rng() > 0.7 ? 'poly' : 'kraft', ZONES[Math.floor(rng() * 6)], false);
      p.position.set(sx * 0.17, y + 0.14 + 0.04 * rng(), z0 - hd + 0.15);
      p.rotation.y = 0.15 * (rng() - 0.5);
    }
  }
  const front = CX.CAGE_SLOTS.map(([x, y], i) => {
    const p = parcel(g, CX.CAGE_BOX, 'kraft', 'B-07', false);
    p.position.set(x, y, CX.CAGE_SLOT_Z);
    p.rotation.y = 0.05 * (i - 1.5);
    return p;
  });
  // The stack it's filled from, on the floor at the left (only while it's being stacked).
  const stack = group(g, CX.CAGE_STACK.x, 0, CX.CAGE_STACK.z);
  stack.visible = false;
  const stacked = [0, 1].map((i) => {
    const p = parcel(stack, CX.CAGE_BOX, 'kraft', 'B-07');
    p.position.set(0.01 * i, CX.CAGE_BOX[1] / 2 + 0.002 + i * 0.262, 0);
    p.rotation.y = 0.12 * i;
    return p;
  });
  const carried = loose(g);
  parcel(carried, CX.CAGE_BOX, 'kraft', 'B-07');
  const clip = loose(g);
  clipboard(clip);
  const penHeld = loose(g);
  pen(penHeld);
  const stacker = use(g, 'cxStack', CX.CAGE_SPOT.x, CX.CAGE_SPOT.z);
  const planner = use(g, 'cxClipboard', CX.CAGE_SPOT.x + 0.05, CX.CAGE_SPOT.z + 0.05, placard);
  out.work = stacker.work;
  out.spots = { stackParcels: stacker.s, courier_dispatchPlan: planner.s, '*': stacker.s };
  out.away = (_o, t) => {
    const st = run(stacker, t);
    const s = st ? CX.stackAt(t, st.ph) : null;
    stack.visible = !!st;
    stacked[1].visible = !s?.topOff;
    front.forEach((p, i) => (p.visible = s ? i < s.filled : i < 2));
    placeAt(carried, st?.h.item, st?.yaw ?? 0);
    const pl = run(planner, t);
    placeAt(clip, pl?.h.item, (pl?.yaw ?? 0) + Math.PI, 0.9);
    placeAt(penHeld, pl?.h.tool, pl?.yaw ?? 0);
  };
}

// =============================================================================================
// The scanning desk.

function scanDesk(g: THREE.Group, out: Parameters<Builder>[6]) {
  const D = CX.DESK;
  const zc = D.z;
  // The bench: a grey laminate top with a steel edge, steel legs, a lower shelf with label rolls and a tote.
  part(g, rbox(0.96, 0.04, 0.6, 0.01), '#cfd8dc', 0, D.y - 0.02, zc);
  part(g, box(0.96, 0.03, 0.012), STEEL, 0, D.y - 0.03, zc + 0.3, { outline: false });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.04, D.y - 0.04, 0.04), STEEL, sx * 0.44, (D.y - 0.04) / 2, zc + sz * 0.26);
  part(g, rbox(0.9, 0.025, 0.52, 0.008), '#b0bec5', 0, 0.25, zc);
  for (let i = 0; i < 3; i++) part(g, cyl(0.06, 0.06, 0.1, 14), '#fafafa', -0.3 + i * 0.13, 0.33, zc - 0.08, { rz: Math.PI / 2 });
  part(g, rbox(0.36, 0.18, 0.3, 0.02), '#1e88e5', 0.22, 0.36, zc);
  // The monitor on its arm at the back left, its screen swapping as the work goes.
  part(g, box(0.04, 0.28, 0.04), GREY_D, -0.22, D.y + 0.14, zc - 0.25);
  const mon = group(g, -0.2, D.y + 0.34, zc - 0.22);
  mon.rotation.y = 0.25;
  part(mon, rbox(0.44, 0.28, 0.03, 0.012), '#212121', 0, 0, 0);
  const screens = [
    painted('cxDeskIdle', 192, 120, (c) => {
      c.fillStyle = '#0d2a33';
      c.fillRect(0, 0, 192, 120);
      text(c, `${BRAND} 집하 스캔`, 96, 40, 18, '#80cbc4', 'center');
      text(c, '송장을 스캔하세요', 96, 72, 14, '#b2dfdb', 'center', false);
      text(c, '오늘 처리 1,284건', 96, 100, 11, '#4db6ac', 'center', false);
    }),
    painted('cxDeskRead', 192, 120, (c) => {
      c.fillStyle = '#0d2a33';
      c.fillRect(0, 0, 192, 120);
      text(c, '송장 읽는 중…', 96, 30, 16, '#fff59d', 'center');
      c.fillStyle = '#26a69a';
      c.fillRect(30, 60, 132, 10);
      text(c, '6302-1185-4471', 96, 92, 15, '#e0f2f1', 'center');
    }),
    painted('cxDeskDone', 192, 120, (c) => {
      c.fillStyle = '#1b5e20';
      c.fillRect(0, 0, 192, 120);
      text(c, '✔ 스캔 완료', 96, 26, 18, '#ffffff', 'center');
      text(c, '구역 B-07', 96, 62, 30, '#fff59d', 'center');
      text(c, '역삼1동 · 3.2kg', 96, 96, 13, '#c8e6c9', 'center', false);
    }),
    painted('cxDeskLearn', 192, 120, (c) => {
      c.fillStyle = '#0d2a33';
      c.fillRect(0, 0, 192, 120);
      text(c, '분류 코드 지도', 96, 14, 13, '#80cbc4', 'center');
      const cols = ['#42a5f5', '#66bb6a', '#ffa726', '#ab47bc'];
      ['A', 'B', 'C', 'D'].forEach((z, i) => {
        c.fillStyle = cols[i];
        c.fillRect(8 + (i % 2) * 90, 26 + Math.floor(i / 2) * 46, 86, 42);
        text(c, `${z}구역`, 51 + (i % 2) * 90, 47 + Math.floor(i / 2) * 46, 16, '#ffffff', 'center');
      });
    }),
  ];
  const show = swapScreen(mon, screens, 0.4, 0.25, 0, 0, 0.017);
  // The label printer at the back right, a label hanging out of its slot.
  const [prx, pry, prz] = CX.DESK_PRINTER;
  part(g, rbox(0.2, 0.16, 0.22, 0.02), '#eceff1', prx, D.y + 0.08, prz - 0.04);
  part(g, box(0.12, 0.012, 0.01), '#263238', prx, pry, prz + 0.07, { outline: false });
  const slip = decal(g, billTex('B-07'), 0.09, 0.06, prx, pry - 0.03, prz + 0.078);
  glowing(g, box(0.02, 0.01, 0.005), '#69f0ae', prx + 0.07, D.y + 0.13, prz + 0.07);
  // The keyboard, the code chart laminated on the desk, the notebook and its pen.
  part(g, rbox(0.3, 0.015, 0.1, 0.005), '#37474f', 0.0, D.y + 0.008, zc - 0.2);
  const chartTex = painted('cxCodeChart', 160, 112, (c) => {
    c.fillStyle = '#fffde7';
    c.fillRect(0, 0, 160, 112);
    text(c, '분류 코드표', 80, 10, 12, '#263238', 'center');
    const rows = [['A', '역삼1·2동', '#42a5f5'], ['B', '도곡·개포동', '#66bb6a'], ['C', '대치·삼성동', '#ffa726'], ['D', '청담·논현동', '#ab47bc']];
    rows.forEach(([z, a, col], i) => {
      c.fillStyle = col;
      c.fillRect(6, 22 + i * 22, 26, 18);
      text(c, z, 19, 31 + i * 22, 13, '#ffffff', 'center');
      text(c, a, 38, 31 + i * 22, 12, '#37474f', 'left', false);
      text(c, `${i + 1}0~${i + 1}9`, 154, 31 + i * 22, 11, '#78909c', 'right', false);
    });
  });
  const [cx, , cz] = CX.DESK_CHART;
  part(g, box(0.26, 0.003, 0.18), '#fafafa', cx, D.y + 0.002, cz, { outline: false });
  decal(g, chartTex, 0.25, 0.17, cx, D.y + 0.005, cz, FLAT);
  const [bx, , bz] = CX.DESK_BOOK;
  part(g, rbox(0.16, 0.012, 0.21, 0.004), '#1565c0', bx, D.y + 0.006, bz, { ry: -0.15 });
  part(g, box(0.15, 0.002, 0.2), '#fafafa', bx, D.y + 0.013, bz, { ry: -0.15, outline: false });
  const penRest = pen(g);
  penRest.position.set(bx + 0.1, D.y + 0.005, bz);
  penRest.rotation.set(-Math.PI / 2 + 0.4, 0.3, 0);
  // The scan gun's holster at the front right; the gun in it, or in the hand.
  const [hx, hy, hz] = CX.DESK_HOLSTER;
  part(g, rbox(0.07, 0.08, 0.06, 0.01), '#263238', hx, hy - 0.04, hz);
  const restGun = scanGun(g);
  restGun.g.position.set(hx, hy + 0.04, hz);
  restGun.g.rotation.set(-1.1, 0, 0);
  const heldGun = scanGun(loose(g));
  const laser = limb(g, 0.003, LASER);
  const beep = bubble(g, '삑!', 0.26, 64);
  // The boxes: two on the pile at the left, the one being scanned in the middle, the tote at the right end.
  const B = CX.DESK_BOX;
  const inPile = [0, 1].map((i) => {
    const p = parcel(g, B, i ? 'kraft' : 'poly', ZONES[i + 3]);
    p.position.set(CX.DESK_IN[0], D.y + B[1] / 2 + i * B[1], CX.DESK_IN[2]);
    p.rotation.y = 0.1 * i;
    return p;
  });
  const onDesk = group(g, CX.DESK_MID[0], D.y + B[1] / 2, CX.DESK_MID[2]);
  parcel(onDesk, B, 'kraft', 'B-07');
  const newLabel = decal(onDesk, billTex('B-07'), 0.09, 0.06, -0.06, B[1] / 2 + 0.006, -0.05, FLAT);
  const carried = loose(g);
  parcel(carried, B, 'kraft', 'B-07');
  const tote = group(g, 0.43, 0.5, zc + 0.05);
  part(tote, rbox(0.12, 0.3, 0.44, 0.015), '#1565c0', 0, 0, 0);
  const handSlip = loose(g);
  decal(handSlip, billTex('B-07'), 0.09, 0.06, 0, 0, 0, FLAT);
  const penHeld = loose(g);
  pen(penHeld);
  const scanUse = use(g, 'cxScan', CX.DESK_SPOT.x, CX.DESK_SPOT.z);
  const learnUse = use(g, 'cxLearn', CX.DESK_SPOT.x, CX.DESK_SPOT.z, scanUse.work);
  out.work = scanUse.work;
  out.spots = { scanWaybills: scanUse.s, courier_learnSorting: learnUse.s, '*': scanUse.s };
  const target = new THREE.Vector3(CX.DESK_MID[0] + 0.06, D.y + B[1] + 0.005, CX.DESK_MID[2] + 0.05);
  const nose = new THREE.Vector3();
  out.away = (_o, t) => {
    const sc = run(scanUse, t);
    const s = sc ? CX.scanAt(t, sc.ph) : null;
    inPile[1].visible = !s?.topOff;
    onDesk.visible = s ? s.onDesk : true;
    newLabel.visible = !!s && s.label === 2;
    placeAt(carried, sc?.h.item, sc?.yaw ?? 0);
    slip.visible = !s || s.label === 0;
    placeAt(handSlip, s && s.label === 1 ? sc!.h.r : undefined, sc?.yaw ?? 0);
    restGun.g.visible = !s || s.gun;
    placeAt(heldGun.g.parent!, s && !s.gun ? sc!.h.tool : undefined, sc?.yaw ?? 0, 0.9);
    if (s && s.laser && !s.gun) {
      heldGun.g.parent!.updateMatrix();
      nose.copy(heldGun.nose.position).applyMatrix4(heldGun.g.parent!.matrix);
      laser(nose, target);
    } else laser(null);
    beep.visible = !!s?.beep;
    if (s?.beep && sc?.h.tool) beep.position.copy(sc.h.tool).add(v3(0, 0.3, 0));
    const ln = run(learnUse, t);
    show(ln ? 3 : !s ? 0 : s.screen === 'idle' ? 0 : s.screen === 'read' ? 1 : 2);
    penRest.visible = !(ln && CX.learnAt(t, ln.ph).writing);
    placeAt(penHeld, ln && CX.learnAt(t, ln.ph).writing ? ln.h.tool : undefined, ln?.yaw ?? 0);
  };
}

// =============================================================================================
// The parcel scale (the 우체국's too: no company on it).

const digitTex = (d: string) =>
  painted(`cxDigit${d}`, 32, 48, (c) => {
    c.fillStyle = '#1a0606';
    c.fillRect(0, 0, 32, 48);
    if (d !== ' ') text(c, d, 16, 26, 44, '#ff3d00', 'center');
  });
function scale(g: THREE.Group, out: Parameters<Builder>[6]) {
  const S = CX.SCALE;
  const zc = S.z;
  // The stand: four steel legs, a cross shelf, the stainless platform on its load cell.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.035, 0.72, 0.035), GREY_D, sx * 0.25, 0.36, zc + sz * 0.2);
  part(g, rbox(0.54, 0.025, 0.44, 0.008), '#90a4ae', 0, 0.2, zc);
  part(g, rbox(0.56, 0.04, 0.46, 0.01), '#546e7a', 0, 0.74, zc);
  part(g, rbox(0.5, 0.05, 0.42, 0.012), '#cfd8dc', 0, S.y - 0.025, zc);
  for (let i = -2; i <= 2; i++) part(g, box(0.48, 0.002, 0.004), '#b0bec5', 0, S.y + 0.001, zc + i * 0.08, { outline: false });
  // The column up the back and the indicator head with its red digits and keys.
  const [dx, dy, dz] = S.display;
  part(g, box(0.04, dy - 0.74, 0.04), GREY_D, dx, (dy + 0.74) / 2 - 0.08, dz - 0.04);
  const head = group(g, dx, dy, dz);
  head.rotation.x = -0.15;
  part(head, rbox(0.32, 0.17, 0.08, 0.015), '#37474f', 0, 0, -0.03);
  part(head, box(0.24, 0.07, 0.004), '#1a0606', 0, 0.03, 0.012, { outline: false });
  const blank = digitTex(' ');
  const digits = [0, 1, 2, 3].map((i) => swapScreen(head, [blank, ...'0123456789'.split('').map(digitTex)], 0.04, 0.06, -0.085 + i * 0.05 + (i > 1 ? 0.012 : 0), 0.03, 0.015));
  glowing(head, box(0.008, 0.008, 0.002), '#ff3d00', 0.006, 0.006, 0.016);
  label(head, 'kg', 0.03, 0.02, 0.135, 0.01, 0.012, '#37474f', '#ff8a65');
  for (let i = 0; i < 4; i++) part(head, rbox(0.035, 0.022, 0.012, 0.005), i === 0 ? '#e53935' : '#90a4ae', -0.09 + i * 0.06, -0.045, 0.014);
  label(head, '최대 60kg · e=10g', 0.2, 0.022, 0, 0.075, 0.012, '#37474f', '#cfd8dc');
  // The 검정필 sticker on the platform's skirt.
  const seal = painted('cxSeal', 64, 64, (c) => {
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(32, 32, 30, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#1565c0';
    c.lineWidth = 4;
    c.stroke();
    text(c, '검정필', 32, 32, 15, '#1565c0', 'center');
  });
  decal(g, seal, 0.045, 0.045, 0.18, 0.74, zc + 0.232);
  // The label printer on its side tray.
  const [prx, pry, prz] = S.printer;
  part(g, box(0.03, 0.14, 0.03), GREY_D, prx - 0.02, 0.73, prz);
  part(g, rbox(0.17, 0.02, 0.24, 0.006), '#546e7a', prx, 0.8, prz);
  part(g, rbox(0.15, 0.12, 0.2, 0.02), '#fafafa', prx, pry - 0.0, prz - 0.01);
  part(g, box(0.1, 0.01, 0.01), '#263238', prx, pry + 0.03, prz + 0.09, { outline: false });
  const slip = decal(g, billTex('W', true), 0.08, 0.05, prx, pry + 0.005, prz + 0.098);
  // Boxes: the pile on the floor at the left, the one on the platform, the one set down at the right.
  const B = CX.SCALE_BOX;
  const inPile = [0, 1].map((i) => {
    const p = parcel(g, B, 'plain', 'W' + i);
    p.position.set(CX.SCALE_IN.x, B[1] / 2 + 0.02 + i * (B[1] + 0.003), CX.SCALE_IN.z);
    p.rotation.y = 0.1 * i - 0.05;
    return p;
  });
  const inGroup = group(g, 0, 0, 0);
  inPile.forEach((p) => inGroup.add(p));
  const onPlat = group(g, 0, S.y + B[1] / 2, zc);
  parcel(onPlat, B, 'plain', 'W0');
  const newLabel = decal(onPlat, billTex('W', true), 0.08, 0.05, 0.04, B[1] / 2 + 0.007, 0.03, FLAT);
  const down = group(g, CX.SCALE_OUT.x, B[1] / 2 + 0.02, CX.SCALE_OUT.z);
  parcel(down, B, 'plain', 'W1');
  const carried = loose(g);
  parcel(carried, B, 'plain', 'W0');
  const handSlip = loose(g);
  decal(handSlip, billTex('W', true), 0.08, 0.05, 0, 0, 0, FLAT);
  const mobile = loose(g);
  phone(mobile);
  const say = bubble(g, '고객님, 오늘 2~4시 도착 예정이에요!', 0.9, 30);
  const clip = loose(g);
  clipboard(clip);
  const penHeld = loose(g);
  pen(penHeld);
  const weigh = use(g, 'cxWeigh', CX.SCALE_SPOT.x, CX.SCALE_SPOT.z);
  const call = use(g, 'cxCall', CX.SCALE_SPOT.x, CX.SCALE_SPOT.z, weigh.work);
  const plan = use(g, 'cxClipboard', CX.SCALE_SPOT.x + 0.05, CX.SCALE_SPOT.z + 0.04, marker(g, dx, dy, dz + 0.02));
  out.work = weigh.work;
  out.spots = { weighParcel: weigh.s, courier_customerCall: call.s, mailCarrier_assignDistricts: plan.s, '*': weigh.s };
  const setKg = (kg: number) => {
    const s = kg > 0 ? kg.toFixed(2).padStart(5, ' ') : ' 0.00';
    const ds = s.replace('.', '').split('');
    ds.forEach((d, i) => digits[i](d === ' ' ? 0 : Number(d) + 1));
  };
  out.away = (_o, t) => {
    const w = run(weigh, t);
    const s = w ? CX.weighAt(t, w.ph) : null;
    const c = run(call, t);
    const p = run(plan, t);
    inPile[1].visible = !s?.lifting;
    onPlat.visible = s ? s.where === 'plat' : !!c;
    newLabel.visible = !!s && s.label === 2;
    down.visible = !!s && s.where === 'down';
    placeAt(carried, w?.h.item, w?.yaw ?? 0);
    slip.visible = !s || s.label === 0;
    placeAt(handSlip, s && s.label === 1 ? w!.h.r : undefined, w?.yaw ?? 0);
    setKg(s ? s.kg : 0);
    placeAt(mobile, c?.h.tool, (c?.yaw ?? 0) + Math.PI, 1.2);
    say.visible = !!c && CX.callAt(t, c.ph).talking;
    if (c) say.position.set(c.h.r.x, c.h.r.y + 0.5, c.h.r.z);
    placeAt(clip, p?.h.item, (p?.yaw ?? 0) + Math.PI, 0.9);
    placeAt(penHeld, p?.h.tool, p?.yaw ?? 0);
  };
}

// =============================================================================================
// The 1톤 탑차.

function truck(g: THREE.Group, out: Parameters<Builder>[6]) {
  const van = new THREE.Group();
  g.add(van);
  const xr = CX.TRUCK.rear;
  const xbf = 0.55;
  const xc0 = 0.62;
  const xf = 1.92;
  const hw = 0.85;
  const top = 2.3;
  const floorY = CX.TRUCK.bed;
  // Wheels: dual at the back, singles under the cab.
  for (const [wx, dual] of [[-0.95, true], [1.3, false]] as Array<[number, boolean]>)
    for (const sz of [-1, 1]) {
      const z = sz * (hw - 0.17);
      part(van, cyl(0.3, 0.3, dual ? 0.34 : 0.2, 22), BLACK, wx, 0.3, z, { rx: Math.PI / 2 });
      part(van, cyl(0.17, 0.17, (dual ? 0.34 : 0.2) + 0.005, 16), STEEL, wx, 0.3, z, { rx: Math.PI / 2, outline: false });
      part(van, cyl(0.06, 0.06, (dual ? 0.34 : 0.2) + 0.01, 10), shade(STEEL, 0.6), wx, 0.3, z, { rx: Math.PI / 2, outline: false });
    }
  // The chassis rails and the mudguards.
  for (const sz of [-1, 1]) part(van, box(xf - xr - 0.3, 0.14, 0.08), '#212121', (xf + xr) / 2 - 0.1, 0.55, sz * 0.38);
  for (const sz of [-1, 1]) part(van, rbox(0.75, 0.06, 0.4, 0.02), '#212121', -0.95, 0.66, sz * (hw - 0.17));
  // The cargo box: floor, roof, the two sides (painted in the livery), the front wall.
  const boxLen = xbf - xr;
  const bxm = (xbf + xr) / 2;
  part(van, rbox(boxLen, 0.1, 2 * hw, 0.02), '#9e9e9e', bxm, floorY - 0.05, 0);
  part(van, box(boxLen - 0.06, 0.005, 2 * hw - 0.08), '#bdbdbd', bxm, floorY + 0.003, 0, { outline: false });
  part(van, rbox(boxLen + 0.02, 0.06, 2 * hw + 0.02, 0.02), WHITE, bxm, top - 0.03, 0);
  for (const sz of [-1, 1]) part(van, rbox(boxLen, top - floorY, 0.04, 0.015), WHITE, bxm, (top + floorY) / 2, sz * (hw - 0.02));
  part(van, rbox(0.04, top - floorY, 2 * hw, 0.015), WHITE, xbf - 0.02, (top + floorY) / 2, 0);
  // Corner posts and rub rails, the rear frame.
  for (const sz of [-1, 1]) {
    part(van, rbox(0.06, top - floorY + 0.06, 0.06, 0.01), '#cfd8dc', xr + 0.03, (top + floorY) / 2, sz * (hw - 0.01));
    part(van, rbox(0.06, top - floorY + 0.06, 0.06, 0.01), '#cfd8dc', xbf - 0.02, (top + floorY) / 2, sz * (hw - 0.01));
    part(van, box(boxLen, 0.05, 0.02), '#b0bec5', bxm, floorY + 0.08, sz * (hw + 0.005), { outline: false });
  }
  part(van, rbox(0.06, 0.08, 2 * hw, 0.01), '#cfd8dc', xr + 0.03, top - 0.04, 0);
  // The livery: the company's band down each side, its mark and name, the slogan.
  const side = painted('cxTruckSide', 512, 256, (c) => {
    c.fillStyle = WHITE;
    c.fillRect(0, 0, 512, 256);
    c.fillStyle = TEAL;
    c.beginPath();
    c.moveTo(0, 170);
    c.quadraticCurveTo(260, 120, 512, 150);
    c.lineTo(512, 256);
    c.lineTo(0, 256);
    c.closePath();
    c.fill();
    c.fillStyle = YELLOW;
    c.beginPath();
    c.moveTo(0, 160);
    c.quadraticCurveTo(260, 108, 512, 138);
    c.lineTo(512, 150);
    c.quadraticCurveTo(260, 120, 0, 170);
    c.closePath();
    c.fill();
    c.fillStyle = TEAL;
    c.beginPath();
    c.roundRect(30, 40, 70, 70, 16);
    c.fill();
    c.fillStyle = YELLOW;
    c.beginPath();
    c.moveTo(42, 92);
    c.quadraticCurveTo(62, 54, 90, 58);
    c.quadraticCurveTo(70, 70, 60, 96);
    c.closePath();
    c.fill();
    text(c, BRAND, 115, 78, 64, TEAL_D);
    text(c, '오늘 주문, 내일 도착', 118, 128, 26, '#546e7a', 'left', false);
    text(c, '안전 운행 중', 490, 212, 22, '#e0f2f1', 'right', false);
  });
  for (const sz of [-1, 1]) picture(van, side, boxLen - 0.1, top - floorY - 0.1, bxm, (top + floorY) / 2, sz * (hw + 0.002), '#ffffff', sz > 0 ? 0 : Math.PI);
  // The cab-over cab: white, the windscreen high and wide, the doors, the grille and lamps low.
  const cabLen = xf - xc0;
  const cabX = (xf + xc0) / 2;
  const cabBot = 0.55;
  const cabTop = 2.02;
  part(van, rbox(cabLen, 0.7, 2 * hw - 0.04, 0.06), WHITE, cabX, cabBot + 0.35, 0);
  part(van, rbox(cabLen - 0.25, 0.12, 2 * hw - 0.06, 0.05), WHITE, cabX - 0.1, cabTop - 0.06, 0);
  part(van, rbox(0.12, cabTop - cabBot - 0.7, 2 * hw - 0.04, 0.03), WHITE, xc0 + 0.06, (cabTop + cabBot + 0.7) / 2, 0);
  for (const sz of [-1, 1]) {
    part(van, rbox(0.08, cabTop - cabBot - 0.72, 0.06, 0.02), WHITE, xf - 0.2, (cabTop + cabBot + 0.7) / 2, sz * (hw - 0.05), { rz: 0.12 });
    part(van, box(cabLen - 0.3, 0.14, 0.03), WHITE, cabX - 0.08, cabTop - 0.17, sz * (hw - 0.035));
    const win = new THREE.Mesh(box(cabLen - 0.42, 0.5, 0.02), GLASS);
    win.position.set(cabX - 0.06, cabBot + 0.98, sz * (hw - 0.03));
    van.add(win);
    // The door's seam and handle, the step.
    part(van, box(0.006, 0.66, 0.004), '#bdbdbd', xc0 + 0.32, cabBot + 0.36, sz * (hw - 0.018), { outline: false });
    part(van, rbox(0.1, 0.02, 0.02, 0.008), '#9e9e9e', xc0 + 0.42, cabBot + 0.58, sz * (hw - 0.01), { outline: false });
    part(van, rbox(0.3, 0.04, 0.12, 0.01), '#424242', xc0 + 0.6, 0.42, sz * (hw - 0.1));
  }
  const wind = new THREE.Mesh(box(0.02, 0.6, 2 * hw - 0.2), GLASS);
  wind.position.set(xf - 0.14, cabBot + 1.04, 0);
  wind.rotation.z = 0.12;
  van.add(wind);
  for (const sz of [-1, 1]) rod(van, v3(xf - 0.12, cabBot + 0.76, sz * 0.35), v3(xf - 0.2, cabBot + 1.1, sz * 0.15), 0.008, BLACK);
  // The dash and the wheel (Korea: the driver on the left, -z facing +x), the seats.
  part(van, rbox(0.25, 0.12, 2 * hw - 0.12, 0.03), '#37474f', xf - 0.3, cabBot + 0.7, 0);
  const wheel = group(van, xf - 0.48, cabBot + 0.82, -0.42);
  wheel.rotation.set(0, Math.PI / 2, 0);
  const tilt = group(wheel);
  tilt.rotation.x = -0.9;
  part(tilt, cyl(0.17, 0.17, 0.02, 20), '#212121', 0, 0, 0, { rx: Math.PI / 2, outline: false });
  for (const sz of [-1, 1]) {
    part(van, rbox(0.36, 0.08, 0.38, 0.03), '#455a64', cabX - 0.18, cabBot + 0.42, sz * 0.42);
    part(van, rbox(0.08, 0.5, 0.38, 0.03), '#455a64', xc0 + 0.18, cabBot + 0.7, sz * 0.42, { rz: 0.1 });
  }
  // The driver: seen at the wheel while it's driving out or back in.
  const driver = group(van, cabX - 0.16, cabBot + 0.45, -0.42);
  part(driver, rbox(0.22, 0.42, 0.3, 0.08), TEAL, 0.02, 0.24, 0);
  part(driver, ball(0.1), SKIN, 0.06, 0.58, 0);
  part(driver, ball(0.105), '#2b1b10', 0.03, 0.62, 0).scale.set(1, 0.7, 1);
  part(driver, rbox(0.14, 0.04, 0.22, 0.02), TEAL_D, 0.08, 0.68, 0);
  driver.visible = false;
  // Front: the grille, the lamps, the bumper, the yellow 배 plate, the mirrors on their arms.
  part(van, rbox(0.03, 0.2, 0.9, 0.01), '#263238', xf + 0.005, cabBot + 0.28, 0);
  for (let i = 0; i < 4; i++) part(van, box(0.01, 0.015, 0.84), '#546e7a', xf + 0.02, cabBot + 0.2 + i * 0.05, 0, { outline: false });
  for (const sz of [-1, 1]) {
    glowing(van, rbox(0.03, 0.12, 0.24, 0.02), '#fffde7', xf, cabBot + 0.3, sz * (hw - 0.2));
    part(van, rbox(0.03, 0.05, 0.1, 0.01), '#ffb300', xf, cabBot + 0.18, sz * (hw - 0.12));
    rod(van, v3(xf - 0.3, cabBot + 1.1, sz * hw), v3(xf - 0.08, cabBot + 1.12, sz * (hw + 0.2)), 0.012, BLACK);
    part(van, rbox(0.06, 0.3, 0.12, 0.02), BLACK, xf - 0.06, cabBot + 1.0, sz * (hw + 0.22));
  }
  part(van, rbox(0.12, 0.16, 2 * hw - 0.02, 0.03), '#424242', xf + 0.02, cabBot + 0.04, 0);
  const plate = painted('cxPlate', 256, 64, (c) => {
    c.fillStyle = '#ffd600';
    c.fillRect(0, 0, 256, 64);
    c.strokeStyle = '#212121';
    c.lineWidth = 4;
    c.strokeRect(3, 3, 250, 58);
    text(c, '서울 80배 2468', 128, 34, 34, '#1b5e20', 'center');
  });
  picture(van, plate, 0.44, 0.11, xf + 0.085, cabBot + 0.04, 0, '#ffffff', Math.PI / 2);
  label(van, BRAND, 0.5, 0.12, xf + 0.01, cabBot + 0.55, 0, WHITE, TEAL_D, Math.PI / 2);
  decal(van, logoTex, 0.14, 0.14, xf + 0.012, cabBot + 0.55, 0.38, 0, Math.PI / 2);
  // The back: the bumper step, the tail lamps, the plate; the doors, shut or folded round to the sides.
  part(van, rbox(0.14, 0.08, 2 * hw - 0.1, 0.02), '#424242', xr - 0.06, floorY - 0.2, 0);
  part(van, rbox(0.2, 0.025, 0.9, 0.01), '#9e9e9e', xr - 0.1, floorY - 0.28, 0);
  const tail: THREE.Mesh[] = [];
  const blink: THREE.Mesh[] = [];
  for (const sz of [-1, 1]) {
    tail.push(part(van, rbox(0.03, 0.14, 0.12, 0.01), '#b71c1c', xr - 0.13, floorY - 0.2, sz * (hw - 0.14)));
    blink.push(part(van, rbox(0.03, 0.07, 0.08, 0.01), '#ff8f00', xr - 0.13, floorY - 0.2, sz * (hw - 0.27)));
  }
  const tailLit = tail.map((m) => glowing(van, rbox(0.032, 0.14, 0.12, 0.01), '#ff5252', m.position.x - 0.002, m.position.y, m.position.z));
  const blinkLit = blink.map((m) => glowing(van, rbox(0.032, 0.07, 0.08, 0.01), '#ffd180', m.position.x - 0.002, m.position.y, m.position.z));
  picture(van, plate, 0.4, 0.1, xr - 0.135, floorY - 0.12, 0, '#ffffff', -Math.PI / 2);
  const rearTex = painted('cxTruckRear', 256, 320, (c) => {
    c.fillStyle = WHITE;
    c.fillRect(0, 0, 256, 320);
    c.fillStyle = TEAL;
    c.fillRect(0, 230, 256, 90);
    c.fillStyle = YELLOW;
    c.fillRect(0, 222, 256, 10);
    text(c, BRAND, 128, 80, 46, TEAL_D, 'center');
    text(c, '차간 거리 유지', 128, 140, 24, '#78909c', 'center', false);
    text(c, '배송 문의는 앱으로', 128, 272, 20, '#e0f2f1', 'center', false);
  });
  const doorH = top - floorY - 0.06;
  const door = (sz: number) => {
    // Hung at the box's corner, the door reaching in toward the middle (along -sz).
    const d = group(van, xr, floorY + 0.03, sz * hw);
    part(d, rbox(0.04, doorH, hw - 0.01, 0.01), WHITE, -0.02, doorH / 2, -sz * (hw / 2));
    picture(d, rearTex, hw - 0.06, doorH - 0.08, -0.042, doorH / 2, -sz * (hw / 2), '#ffffff', -Math.PI / 2);
    rod(d, v3(-0.05, 0.1, -sz * (hw - 0.08)), v3(-0.05, doorH - 0.1, -sz * (hw - 0.08)), 0.012, CHROME);
    for (const y of [0.25, doorH - 0.25]) part(d, box(0.03, 0.06, 0.08), '#9e9e9e', -0.04, y, -sz * 0.03, { outline: false });
    return d;
  };
  const doors = [door(-1), door(1)];
  // Inside (seen with the doors open): the load toward the cab, the boxes being loaded at the back.
  const inside = new THREE.Group();
  van.add(inside);
  part(inside, box(0.01, top - floorY - 0.06, 2 * hw - 0.1), '#e0e0e0', xbf - 0.045, (top + floorY) / 2, 0, { outline: false });
  for (const sz of [-1, 1]) part(inside, box(boxLen - 0.1, top - floorY - 0.08, 0.005), '#eeeeee', bxm, (top + floorY) / 2, sz * (hw - 0.045), { outline: false });
  const rng = seeded(88);
  for (let x = xbf - 0.25; x > -1.0; x -= 0.38)
    for (let iz = -2; iz <= 2; iz++)
      for (let ly = 0; ly < 4; ly++) {
        if (x < -0.5 && ly > 2 - Math.floor(rng() * 2)) continue;
        const h = 0.26 + 0.1 * rng();
        const p = parcel(inside, [0.34, h, 0.3], rng() > 0.8 ? 'poly' : 'kraft', ZONES[Math.floor(rng() * 6)], false);
        p.position.set(x + 0.04 * (rng() - 0.5), floorY + 0.17 + ly * 0.37, iz * 0.31);
        p.rotation.y = 0.1 * (rng() - 0.5);
      }
  const loaded = CX.TRUCK_SLOTS.map((_, i) => {
    const p = parcel(inside, CX.TRUCK_BOX, 'kraft', ZONES[i % ZONES.length]);
    const [x, y, z] = CX.truckSlotAt(i);
    p.position.set(x, y, z);
    return p;
  });
  inside.visible = false;
  // The hand truck beside the back with the boxes to load.
  const dolly = group(g, CX.TRUCK_DOLLY.x, 0, CX.TRUCK_DOLLY.z);
  dolly.visible = false;
  part(dolly, rbox(0.62, 0.04, 0.46, 0.01), '#1565c0', 0, CX.TRUCK_DOLLY.deck - 0.02, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(dolly, cyl(0.05, 0.05, 0.03, 10), '#263238', sx * 0.25, 0.05, sz * 0.18, { rx: Math.PI / 2 });
  rod(dolly, v3(0.3, CX.TRUCK_DOLLY.deck, -0.2), v3(0.3, 0.95, -0.2), 0.012, '#1565c0');
  rod(dolly, v3(0.3, CX.TRUCK_DOLLY.deck, 0.2), v3(0.3, 0.95, 0.2), 0.012, '#1565c0');
  rod(dolly, v3(0.3, 0.95, -0.2), v3(0.3, 0.95, 0.2), 0.014, BLACK);
  const onDolly = [0, 1, 2].map((i) => {
    const p = parcel(dolly, CX.TRUCK_BOX, 'kraft', ZONES[(i + 2) % 6]);
    p.position.set(-0.04, CX.TRUCK_DOLLY.deck + CX.TRUCK_BOX[1] * (i + 0.5) + 0.003 * i, 0);
    p.rotation.y = 0.08 * (i - 1);
    return p;
  });
  const carried = loose(g);
  parcel(carried, CX.TRUCK_BOX, 'kraft', 'C-12');
  const loader = use(g, 'cxLoad', CX.TRUCK_SPOT.x, CX.TRUCK_SPOT.z);
  out.work = loader.work;
  out.spots = { cxLoadTruck: loader.s, '*': loader.s };
  // Out on a round: it pulls off forward and is gone; it reverses back in, the indicators going.
  let state: 'parked' | 'leaving' | 'gone' | 'back' | undefined;
  let since = 0;
  const PULL = 7;
  const doorAt = (open: number) =>
    doors.forEach((d, i) => {
      const sz = i === 0 ? -1 : 1;
      // Swung right round to lie along the box's side.
      d.rotation.y = -sz * open * (Math.PI * 0.94);
    });
  out.away = (isOut, t) => {
    if (state === undefined) state = isOut ? 'gone' : 'parked';
    else if (isOut && (state === 'parked' || state === 'back')) [state, since] = ['leaving', t];
    else if (!isOut && (state === 'leaving' || state === 'gone')) [state, since] = ['back', t];
    let x = 0;
    if (state === 'leaving') {
      const u = Math.min(1, (t - since) / 3.5);
      x = PULL * u * u;
      if (u >= 1) state = 'gone';
    } else if (state === 'back') {
      const u = Math.min(1, (t - since) / 5);
      x = PULL * (1 - u) * (1 - u);
      if (u >= 1) state = 'parked';
    }
    van.position.x = x;
    van.visible = state !== 'gone';
    const moving = state === 'leaving' || state === 'back';
    driver.visible = moving;
    tailLit.forEach((m) => (m.visible = moving));
    const on = moving && Math.sin(t * 9) > 0;
    blinkLit.forEach((m) => (m.visible = on));
    const ld = state === 'parked' ? run(loader, t) : null;
    const s = ld ? CX.loadAt(t, ld.ph) : null;
    doorAt(ld ? 1 : 0);
    inside.visible = !!ld;
    dolly.visible = !!ld;
    loaded.forEach((p, i) => (p.visible = !!s && i < s.filled));
    onDolly[2].visible = !s?.topOff;
    placeAt(carried, ld?.h.item, ld?.yaw ?? 0);
  };
}

// =============================================================================================
// The new pieces.

const ZONE_SETS = [
  [['A', '역삼1동', '#1e88e5'], ['B', '역삼2동', '#43a047'], ['C', '도곡동', '#fb8c00'], ['D', '개포동', '#8e24aa']],
  [['E', '대치동', '#00acc1'], ['F', '삼성동', '#e53935'], ['G', '청담동', '#6d4c41'], ['H', '논현동', '#3949ab']],
];
const zoneHead = (z: string, area: string, col: string) =>
  painted(`cxZoneHead|${z}`, 128, 80, (c) => {
    c.fillStyle = col;
    c.fillRect(0, 0, 128, 80);
    text(c, `${z}구역`, 64, 30, 30, '#ffffff', 'center');
    text(c, area, 64, 64, 18, '#ffffff', 'center', false);
  });
const zoneTag = (s: string, col: string) =>
  painted(`cxZoneTag|${s}`, 64, 32, (c) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, 64, 32);
    c.fillStyle = col;
    c.fillRect(0, 0, 10, 32);
    text(c, s, 37, 17, 18, '#212121', 'center');
  });

export const BUILDERS: Record<string, Builder> = {
  /**
   * The sorting conveyor (분류 컨베이어): a belt on a grey steel frame with yellow guard rails, the
   * infeed chute of rollers at the back of its left end, the scanner arch with its laser line, the
   * slide off the right end into a cardboard bin, the motor under it, the line's sign on a post and the
   * control box with its 처리량 count. It runs whether or not anyone's at it. Sorting (cxSort): a box
   * watched along, taken off as it reaches the hands, read, scanned with the PDA off the rail (삑),
   * set on the route's pile to the right. The 처리량 check (cxThroughput): at the control box with a
   * tablet, the boxes counted, the count tapped, a note made.
   */
  conveyorBelt(g, _W, _D, _c, _def, _ctx, out) {
    conveyor(g, out);
  },

  /**
   * The roll cage (택배 롤테이너): a wire cage on four castors, open at the front with two yellow
   * straps, a shelf halfway, the zone's placard (B-07 역삼1동) in a sleeve on the front post, boxes at
   * the back. Stacked (cxStack): a box off the stack on the floor at the left, into the front row a
   * place at a time, patted in. The 배송 인력 배치 (cxClipboard): the placard read, the clipboard
   * written up, the cage pointed at.
   */
  parcelCage(g, _W, _D, _c, _def, _ctx, out) {
    rollCage(g, out);
  },

  /**
   * The scanning desk (송장 스캐너): a standing steel bench with the monitor on its arm, the label
   * printer, the scan gun in its holster at the front right, the pile of boxes on the left, the tote
   * hung at the right end; the 분류 코드표 laminated on the desk and a notebook. Scanning (cxScan): the
   * box slid over, the gun taken up, the waybill scanned (the laser, 삑, the screen goes green with its
   * 구역), the printed label peeled and pressed on, the box pushed off. Learning the codes (cxLearn):
   * the chart followed with a finger, written up, the screen's map looked at.
   */
  scannerDesk(g, _W, _D, _c, _def, _ctx, out) {
    scanDesk(g, out);
  },

  /**
   * The parcel scale (소포 저울; the 우체국's too, so no company on it): a stainless bench platform on
   * its steel stand, the indicator head up the column with red digits, its keys and 최대 60kg, the
   * 검정필 sticker, the label printer on a side tray, boxes on the floor at the left. Weighed
   * (cxWeigh): a box lifted onto the platform, the digits climbing and settling, the label printed and
   * stuck on, the box lifted down at the right. The call (cxCall): the phone to the ear, a finger on the
   * address (오늘 2~4시 도착 예정이에요!). 집배 구역 배정 (cxClipboard) at its reading.
   */
  parcelScale(g, _W, _D, _c, _def, _ctx, out) {
    scale(g, out);
  },

  /**
   * The delivery truck (택배 차량): a 1톤 탑차 — the white cab-over cab with the windscreen high and
   * wide, the yellow 배 plate, the mirrors on their arms, dual wheels at the back — its box in the
   * company's livery (날쌘택배, 오늘 주문 내일 도착). Loaded (cxLoad): the back doors fold round to the
   * sides, the load inside seen, a box lifted off the hand truck beside it, put on the bed's lip and
   * shoved in. Out on a round it pulls away with the driver at the wheel and is gone; it backs in again
   * with the indicators going.
   */
  deliveryTruck(g, _W, _D, _c, _def, _ctx, out) {
    truck(g, out);
  },

  /**
   * The 구역 분류 선반: grey slotted-steel shelving, four columns of cubbies, a zone a column with its
   * coloured header (A구역 역삼1동…, or E–H on a second shelf), each cubby's code on its edge, boxes in
   * some; the trolley of boxes to sort in front at the left. Shelved (cxShelve): a box off the trolley,
   * its zone read, carried to its cubby (low, crouched; high, reached up) and pushed in.
   */
  cxZoneShelf(g, _W, _D, _c, _def, _ctx, out) {
    const S = CX.SHELF;
    const w = 1.9;
    const zc = (S.back + S.front) / 2;
    const d = S.front - S.back;
    const UPR = '#546e7a';
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.04, S.top, 0.04), UPR, sx * (w / 2 - 0.02), S.top / 2, zc + sz * (d / 2 - 0.02));
    for (const y of S.levels) {
      part(g, rbox(w, 0.025, d, 0.006), '#cfd8dc', 0, y, zc);
      part(g, box(w, 0.045, 0.015), UPR, 0, y - 0.01, S.front - 0.007, { outline: false });
    }
    part(g, rbox(w, 0.025, d, 0.006), '#cfd8dc', 0, S.top - 0.2, zc);
    for (let i = 1; i < 4; i++) part(g, box(0.012, S.top - 0.2 - S.levels[0], d - 0.02), '#b0bec5', -w / 2 + (i * w) / 4, (S.top - 0.2 + S.levels[0]) / 2, zc, { outline: false });
    part(g, box(w - 0.04, S.top - 0.1, 0.01), '#eceff1', 0, S.top / 2, S.back + 0.005, { outline: false });
    // The headers and the cubbies' codes: two sets, one shown (by where the shelf stands).
    const sets = ZONE_SETS.map((set) => {
      const sg = group(g);
      set.forEach(([z, area, col], i) => {
        const x = S.cols[i];
        part(sg, rbox(0.44, 0.17, 0.02, 0.01), col, x, S.top - 0.1, S.front);
        picture(sg, zoneHead(z, area, col), 0.42, 0.16, x, S.top - 0.1, S.front + 0.012);
        S.levels.forEach((y, l) => decal(sg, zoneTag(`${z}-${l + 1}`, col), 0.09, 0.045, x - 0.16, y - 0.012, S.front + 0.002));
      });
      return sg;
    });
    sets[1].visible = false;
    // Boxes in the cubbies (the ones it's sorted into kept clear).
    const targets = new Set(CX.SHELF_TARGETS.map(([c, l]) => `${c},${l}`));
    const rng = seeded(17);
    for (let c = 0; c < 4; c++)
      for (let l = 0; l < 4; l++) {
        if (targets.has(`${c},${l}`) || rng() < 0.3) continue;
        const n = 1 + Math.floor(rng() * 2);
        for (let k = 0; k < n; k++) {
          const s: CX.V = [0.18 + 0.12 * rng(), 0.14 + 0.14 * rng(), 0.24 + 0.1 * rng()];
          const p = parcel(g, s, rng() > 0.7 ? 'poly' : 'kraft', ZONES[Math.floor(rng() * 6)], false);
          p.position.set(S.cols[c] + (n === 1 ? 0 : (k - 0.5) * 0.22), S.levels[l] + 0.013 + s[1] / 2, zc + 0.02);
          p.rotation.y = 0.2 * (rng() - 0.5);
        }
      }
    // The flat trolley (대차) with the boxes to sort.
    const tr = group(g, CX.SHELF_TROLLEY.x, 0, CX.SHELF_TROLLEY.z);
    part(tr, rbox(0.62, 0.04, 0.42, 0.01), '#1565c0', 0, CX.SHELF_TROLLEY.deck - 0.02, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(tr, cyl(0.05, 0.05, 0.03, 10), '#263238', sx * 0.25, 0.05, sz * 0.16, { rx: Math.PI / 2 });
    rod(tr, v3(-0.31, CX.SHELF_TROLLEY.deck, -0.18), v3(-0.31, 0.92, -0.18), 0.012, '#1565c0');
    rod(tr, v3(-0.31, CX.SHELF_TROLLEY.deck, 0.18), v3(-0.31, 0.92, 0.18), 0.012, '#1565c0');
    rod(tr, v3(-0.31, 0.92, -0.18), v3(-0.31, 0.92, 0.18), 0.014, BLACK);
    const B = CX.SHELF_BOX;
    const onTrolley = [0, 1].map((i) => {
      const p = parcel(tr, B, 'kraft', ZONES[i + 1]);
      p.position.set(0.04, CX.SHELF_TROLLEY.deck + B[1] * (i + 0.5) + 0.003, 0);
      p.rotation.y = 0.1 * i;
      return p;
    });
    const placed = parcel(g, B, 'kraft', 'B-07');
    placed.visible = false;
    const carried = loose(g);
    parcel(carried, B, 'kraft', 'B-07');
    const u = use(g, 'cxShelve', CX.SHELF_SPOT.x, CX.SHELF_SPOT.z);
    out.work = u.work;
    out.spots = { '*': u.s };
    let chosen = false;
    out.away = (_o, t) => {
      if (!chosen) {
        chosen = true;
        const pick = phaseOf(u.work) > 0.5 ? 1 : 0;
        sets.forEach((s, i) => (s.visible = i === pick));
      }
      const r = run(u, t);
      const s = r ? CX.shelveAt(t, r.ph) : null;
      onTrolley[1].visible = !s?.topOff;
      placed.visible = !!s?.placed;
      if (s) placed.position.set(...CX.shelfTarget(s.n));
      placeAt(carried, r?.h.item, r?.yaw ?? 0);
    };
  },

  /**
   * A hand pallet jack (핸드 파레트 트럭) under a wooden pallet of boxes wrapped in stretch film: the
   * yellow forks and pump body, the steer wheels, the tiller with its black T-grip and red lever, 최대
   * 2,500kg on it. Moved (cxPallet): the grip taken, the handle pumped three times (the pallet rises a
   * notch each time), leant back on to pull, the lever squeezed to let it down, a look over the load.
   */
  cxPalletJack(g, _W, _D, _c, _def, _ctx, out) {
    const OR = '#f9a825';
    const lift = group(g);
    // The forks and their tips' load rollers.
    for (const sz of [-1, 1]) {
      part(lift, rbox(1.08, 0.06, 0.16, 0.015), OR, -0.44, 0.06, sz * 0.2);
      part(lift, cyl(0.03, 0.03, 0.08, 10), '#263238', -0.92, 0.03, sz * 0.2, { rx: Math.PI / 2 });
    }
    // The pallet: deck boards, blocks, a stamp; the load wrapped on it.
    const px = -0.46;
    const pallet = group(lift, px, 0, 0);
    for (let i = 0; i < 5; i++) part(pallet, box(1.0, 0.022, 0.12), '#c8a46b', 0, 0.145, -0.38 + i * 0.19);
    for (const bx of [-0.44, 0, 0.44]) for (const bz of [-0.38, 0, 0.38]) part(pallet, box(0.12, 0.08, 0.12), '#a98552', bx, 0.095, bz, { outline: false });
    for (const bx of [-0.44, 0, 0.44]) part(pallet, box(0.12, 0.02, 0.9), '#b8935b', bx, 0.045, 0, { outline: false });
    const rng = seeded(5);
    for (let ly = 0; ly < 3; ly++)
      for (let ix = -1; ix <= 1; ix++)
        for (let iz = -1; iz <= 1; iz++) {
          const m = part(pallet, rbox(0.3, 0.3, 0.28, 0.01), rng() > 0.5 ? KRAFT : '#bf955c', ix * 0.32, 0.31 + ly * 0.31, iz * 0.29, { outline: false });
          m.rotation.y = 0.03 * (rng() - 0.5);
        }
    for (let iz = -1; iz <= 1; iz++) decal(pallet, billTex(ZONES[iz + 2]), 0.12, 0.085, 0.32, 0.31 + 2 * 0.31 + 0.152, iz * 0.29, FLAT);
    const wrap = new THREE.Mesh(box(1.0, 0.96, 0.9), FILM);
    wrap.position.set(0, 0.62, 0);
    pallet.add(wrap);
    decal(pallet, fragileTex, 0.16, 0.11, 0, 0.8, 0.452);
    // The pump body, the steer wheels, the tiller.
    const [pvx, pvy] = CX.PJ.pivot;
    part(g, rbox(0.22, 0.2, 0.42, 0.03), OR, 0.14, 0.17, 0);
    part(g, cyl(0.045, 0.045, 0.24, 12), CHROME, pvx - 0.04, 0.3, 0);
    for (const sz of [-1, 1]) part(g, cyl(0.08, 0.08, 0.06, 14), '#263238', 0.2, 0.08, sz * 0.08, { rx: Math.PI / 2 });
    const plate = painted('cxPjPlate', 128, 48, (c) => {
      c.fillStyle = '#212121';
      c.fillRect(0, 0, 128, 48);
      text(c, '최대 2,500kg', 64, 25, 20, OR, 'center');
    });
    decal(g, plate, 0.18, 0.068, 0.14, 0.2, 0.212);
    const tiller = group(g, pvx, pvy, 0);
    part(tiller, box(0.035, CX.PJ.len, 0.035), '#212121', 0, CX.PJ.len / 2, 0);
    part(tiller, rbox(0.06, 0.04, 0.32, 0.015), '#212121', 0, CX.PJ.len, 0);
    for (const sz of [-1, 1]) part(tiller, cyl(0.022, 0.022, 0.12, 10), '#424242', 0, CX.PJ.len, sz * 0.1, { rx: Math.PI / 2, outline: false });
    const lever = part(tiller, rbox(0.02, 0.012, 0.09, 0.004), RED, 0.03, CX.PJ.len - 0.04, -0.08);
    const u = use(g, 'cxPallet', CX.PJ_SPOT.x, CX.PJ_SPOT.z);
    out.work = u.work;
    out.spots = { '*': u.s };
    out.away = (_o, t) => {
      const r = run(u, t);
      const s = r ? CX.palletAt(t, r.ph) : { a: CX.PJ.rest, lift: 0, lever: false };
      tiller.rotation.z = -s.a;
      lift.position.y = CX.PJ.lift * s.lift;
      lever.position.y = CX.PJ.len - 0.04 + (s.lever ? 0.015 : 0);
    };
  },

  /**
   * The packing table (포장대): a butcher-block top on steel legs, flattened boxes on the shelf under
   * it; the pegboard behind with the tape gun, a cutter and scissors on hooks and 재포장대 · 파손 주의
   * over it; the bubble wrap roll on its rod at the left end, the label printer at the right; a
   * crushed box (파손 접수) in the middle. Repacked (cxRepack): its flaps lifted, bubble wrap pulled off
   * the roll and tucked in, the flaps folded, the tape gun run along the seam, a new label pressed on.
   */
  cxPackStation(g, _W, _D, _c, _def, _ctx, out) {
    const P = CX.PACK;
    const zc = (P.front - 0.5) / 2;
    const dz = P.front + 0.5;
    part(g, rbox(1.84, 0.05, dz - 0.02, 0.01), '#d7b98a', 0, P.y - 0.025, zc);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.045, P.y - 0.05, 0.045), STEEL, sx * 0.86, (P.y - 0.05) / 2, zc + sz * (dz / 2 - 0.06));
    part(g, rbox(1.76, 0.025, dz - 0.1, 0.008), '#b0bec5', 0, 0.22, zc);
    for (let i = 0; i < 6; i++) part(g, box(0.9, 0.012, 0.5), i % 2 ? KRAFT : KRAFT_D, -0.35, 0.24 + i * 0.013, zc, { outline: false });
    part(g, cyl(0.09, 0.09, 0.45, 16), '#e1f5fe', 0.5, 0.33, zc, { material: FILM });
    // The pegboard with its tools and the sign.
    const pb = painted('cxPegboard', 128, 64, (c) => {
      c.fillStyle = '#c9b38c';
      c.fillRect(0, 0, 128, 64);
      c.fillStyle = '#8d7a5a';
      for (let x = 4; x < 128; x += 8) for (let y = 4; y < 64; y += 8) c.fillRect(x, y, 2, 2);
    });
    part(g, box(1.76, 0.82, 0.02), '#c9b38c', 0, P.y + 0.46, -0.49);
    picture(g, pb, 1.74, 0.8, 0, P.y + 0.46, -0.478);
    for (const sx of [-1, 1]) part(g, box(0.04, 0.9, 0.04), STEEL, sx * 0.86, P.y + 0.45, -0.47);
    label(g, '재포장대 · 파손 주의', 0.8, 0.12, 0, P.y + 0.8, -0.475, TEAL, '#ffffff');
    const [gx, gy, gz] = P.gunHook;
    part(g, box(0.02, 0.06, 0.04), CHROME, gx, gy + 0.05, gz - 0.01);
    const restGun = tapeGun(g);
    restGun.position.set(gx, gy, gz + 0.04);
    restGun.rotation.set(0, Math.PI / 2, -0.4);
    part(g, rbox(0.03, 0.15, 0.015, 0.006), '#ffca28', -0.15, P.y + 0.5, -0.465);
    part(g, box(0.012, 0.06, 0.004), CHROME, -0.15, P.y + 0.6, -0.465, { outline: false });
    for (const sx of [-1, 1]) part(g, rbox(0.012, 0.11, 0.008, 0.004), '#d32f2f', 0.15 + sx * 0.02, P.y + 0.5, -0.465, { rz: sx * 0.15 });
    for (let i = 0; i < 3; i++) part(g, cyl(0.045, 0.045, 0.05, 14), i === 1 ? '#ff7043' : TAPE, -0.5 + i * 0.12, P.y + 0.6, -0.45, { rx: Math.PI / 2 });
    decal(g, fragileTex, 0.12, 0.08, 0.3, P.y + 0.55, -0.467);
    // The bubble wrap roll on its rod, a sheet hanging off it to the table.
    const [rx, ry, rz] = P.roll;
    for (const sz of [-1, 1]) part(g, box(0.03, ry - P.y + 0.05, 0.03), STEEL, rx, (ry + P.y) / 2, rz + sz * 0.28);
    part(g, cyl(0.012, 0.012, 0.6, 8), CHROME, rx, ry, rz, { rx: Math.PI / 2, outline: false });
    const roll = new THREE.Mesh(cyl(0.13, 0.13, 0.5, 18), BUBBLES);
    roll.position.set(rx, ry, rz);
    roll.rotation.x = Math.PI / 2;
    g.add(roll);
    const hang = new THREE.Mesh(box(0.004, ry - P.y - 0.08, 0.48), BUBBLES);
    hang.position.set(rx + 0.13, (ry + P.y) / 2 - 0.02, rz);
    g.add(hang);
    // The label printer at the right.
    const [prx, , prz] = P.printer;
    part(g, rbox(0.2, 0.15, 0.22, 0.02), '#eceff1', prx, P.y + 0.075, prz);
    part(g, box(0.12, 0.01, 0.01), '#263238', prx, P.y + 0.1, prz + 0.112, { outline: false });
    const slip = decal(g, billTex('C-12'), 0.08, 0.05, prx, P.y + 0.07, prz + 0.118);
    // The crushed box being repacked: open-topped, its four flaps hinged, the tape and the label.
    const B = CX.PACK_BOX;
    const [mx, , mz] = CX.PACK_MID;
    const bx = group(g, mx, P.y, mz);
    const [bw, bh, bd] = B;
    part(bx, box(bw, 0.01, bd), KRAFT_D, 0, 0.005, 0);
    for (const sz of [-1, 1]) part(bx, box(bw, bh, 0.008), KRAFT, 0, bh / 2, sz * (bd / 2 - 0.004));
    for (const sx of [-1, 1]) part(bx, box(0.008, bh, bd), KRAFT, sx * (bw / 2 - 0.004), bh / 2, 0);
    decal(bx, brokenTex, 0.13, 0.065, -0.08, bh * 0.5, bd / 2 + 0.006);
    part(bx, box(0.12, 0.08, 0.004), KRAFT_D, bw / 2 - 0.08, bh - 0.06, bd / 2 + 0.003, { rz: 0.35, outline: false });
    const flaps: Array<{ m: THREE.Group; axis: 'x' | 'z'; sign: number }> = [];
    for (const sz of [-1, 1]) {
      const h = group(bx, 0, bh, sz * (bd / 2));
      part(h, box(bw - 0.01, 0.006, bd / 2), KRAFT, 0, 0, -sz * (bd / 4));
      flaps.push({ m: h, axis: 'x', sign: sz });
    }
    for (const sx of [-1, 1]) {
      const h = group(bx, sx * (bw / 2), bh - 0.004, 0);
      part(h, box(0.12, 0.006, bd - 0.02), KRAFT_D, -sx * 0.06, 0, 0);
      flaps.push({ m: h, axis: 'z', sign: sx });
    }
    const inner = new THREE.Mesh(box(bw - 0.03, 0.05, bd - 0.03), BUBBLES);
    inner.position.set(0, bh - 0.04, 0);
    bx.add(inner);
    const tapeStrip = part(bx, box(1, 0.004, 0.06), TAPE, 0, bh + 0.004, 0, { outline: false });
    const newLabel = decal(bx, billTex('C-12'), 0.11, 0.075, 0.07, bh + 0.008, 0.06, FLAT);
    const sheet = loose(g);
    const sm = new THREE.Mesh(box(0.34, 0.006, 0.26), BUBBLES);
    sheet.add(sm);
    const gunHeld = loose(g);
    tapeGun(gunHeld).rotation.y = Math.PI / 2;
    const handSlip = loose(g);
    decal(handSlip, billTex('C-12'), 0.08, 0.05, 0, 0, 0, FLAT);
    const u = use(g, 'cxRepack', CX.PACK_SPOT.x, CX.PACK_SPOT.z);
    out.work = u.work;
    out.spots = { '*': u.s };
    out.away = (_o, t) => {
      const r = run(u, t);
      const s = r ? CX.repackAt(t, r.ph) : { flaps: 0, tape: 1, label: true, wrapIn: true, gun: true, slip: false };
      for (const f of flaps) {
        const a = f.axis === 'x' ? 1.9 : 1.75;
        if (f.axis === 'x') f.m.rotation.x = f.sign * a * s.flaps;
        else f.m.rotation.z = -f.sign * a * s.flaps;
      }
      inner.visible = s.wrapIn;
      tapeStrip.visible = s.tape > 0.01;
      const L = (bw + 0.08) * s.tape;
      tapeStrip.scale.x = Math.max(0.001, L);
      tapeStrip.position.x = -bw / 2 - 0.04 + L / 2;
      newLabel.visible = s.label;
      restGun.visible = s.gun;
      placeAt(gunHeld, r && !s.gun ? r.h.tool : undefined, r?.yaw ?? 0);
      placeAt(sheet, r?.h.item, r?.yaw ?? 0);
      slip.visible = !s.slip;
      placeAt(handSlip, r && s.slip ? r.h.r : undefined, r?.yaw ?? 0);
    };
  },

  /**
   * The returns bin (반품 수거함): a ribbed blue pallet box split down the middle, 미확인 on the left
   * and 확인 완료 on the right, parcels with red 반품 stickers in both, the clipboard on its side, the
   * PDA hanging on the front rim. Checked (cxReturn): leant into the 미확인 side for a parcel, its
   * sticker read, scanned (삑), dropped in the 확인 side.
   */
  cxReturnsBin(g, _W, _D, _c, _def, _ctx, out) {
    const R = CX.RET;
    const BLUE = '#1e88e5';
    const zc = R.z;
    part(g, box(R.w - 0.04, 0.05, R.d - 0.04), '#1565c0', 0, 0.06, zc);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.12, 0.08, 0.12), '#1565c0', sx * (R.w / 2 - 0.08), 0.04, zc + sz * (R.d / 2 - 0.08));
    for (const sz of [-1, 1]) part(g, rbox(R.w, R.h - 0.08, 0.04, 0.012), BLUE, 0, R.h / 2 + 0.04, zc + sz * (R.d / 2 - 0.02));
    for (const sx of [-1, 1]) part(g, rbox(0.04, R.h - 0.08, R.d, 0.012), BLUE, sx * (R.w / 2 - 0.02), R.h / 2 + 0.04, zc);
    for (let i = -3; i <= 3; i++) if (i !== 0) part(g, box(0.03, R.h - 0.12, 0.012), '#1976d2', i * 0.12, R.h / 2 + 0.04, zc + R.d / 2 + 0.004, { outline: false });
    part(g, box(R.w - 0.08, 0.01, R.d - 0.08), '#0d47a1', 0, 0.1, zc, { outline: false });
    part(g, box(0.02, R.h - 0.14, R.d - 0.06), '#1565c0', 0, R.h / 2 + 0.01, zc);
    label(g, '반품 수거함', 0.42, 0.1, 0, R.h - 0.12, zc + R.d / 2 + 0.012, '#ffffff', '#1565c0');
    for (const [sx, s, col] of [[-1, '미확인', '#e53935'], [1, '확인 완료', '#2e7d32']] as Array<[number, string, string]>) {
      const t = painted(`cxRetSide|${s}`, 128, 40, (c) => {
        c.fillStyle = col;
        c.fillRect(0, 0, 128, 40);
        text(c, s, 64, 21, 22, '#ffffff', 'center');
      });
      part(g, box(0.004, 0.06, 0.2), '#ffffff', 0, R.h + 0.02, zc - 0.05 + sx * 0.0);
      decal(g, t, 0.2, 0.0625, sx * 0.012, R.h + 0.02, zc - 0.05, 0, sx * Math.PI / 2);
    }
    // Parcels in both halves.
    const rng = seeded(23);
    const fill = (sx: number, n: number) => {
      for (let i = 0; i < n; i++) {
        const s: CX.V = [0.2 + 0.1 * rng(), 0.1 + 0.1 * rng(), 0.18 + 0.1 * rng()];
        const p = parcel(g, s, rng() > 0.5 ? 'poly' : 'return', ZONES[Math.floor(rng() * 6)], false);
        if (rng() > 0.3) decal(p, returnTex, 0.08, 0.053, -s[0] / 4, s[1] / 2 + 0.008, -s[2] / 4, FLAT);
        p.position.set(sx * (0.12 + 0.12 * rng()), 0.18 + s[1] / 2 + 0.12 * Math.floor(i / 3), zc - 0.2 + 0.2 * (i % 3));
        p.rotation.set(0.15 * (rng() - 0.5), rng() * 2, 0.15 * (rng() - 0.5));
      }
    };
    fill(-1, 6);
    fill(1, 4);
    const landed = parcel(g, CX.RET_BOX, 'return', 'D-02');
    landed.position.set(0.2, 0.46, zc + 0.02);
    landed.rotation.y = 0.4;
    landed.visible = false;
    // The clipboard on the left side, the PDA on the front right of the rim.
    const clip = clipboard(g);
    clip.position.set(-R.w / 2 - 0.012, 0.5, zc + 0.05);
    clip.rotation.set(Math.PI / 2, -Math.PI / 2, 0, 'YXZ');
    part(g, rbox(0.09, 0.07, 0.04, 0.01), '#263238', R.holster[0], R.holster[1] - 0.02, R.holster[2] - 0.01);
    const pdaUse = scanner(g, R.holster);
    const carried = loose(g);
    parcel(carried, CX.RET_BOX, 'return', 'D-02');
    const u = use(g, 'cxReturn', CX.RET_SPOT.x, CX.RET_SPOT.z);
    out.work = u.work;
    out.spots = { '*': u.s };
    const at = new THREE.Vector3();
    out.away = (_o, t) => {
      const r = run(u, t);
      const s = r ? CX.returnAt(t, r.ph) : null;
      landed.visible = !!s?.landed;
      placeAt(carried, r?.h.item, r?.yaw ?? 0);
      if (r && s) {
        at.copy(r.h.item ?? r.h.l).y += CX.RET_BOX[1] / 2;
        pdaUse.set(s.pda ? undefined : r.h.tool, r.yaw, at, s.laser, s.beep);
      } else pdaUse.set(undefined, 0);
    };
  },

  /**
   * The 배송 현황판: a big screen on a two-legged stand with castors, each driver's row with their
   * zone, a progress bar and the counts (출고 · 배송 중 · 완료), the day's total ticking up; under it
   * the PDA charging rack, eight PDAs in their slots with green and red lights. Checked (cxBoard):
   * looked up at, a driver's row followed with a finger (it lights), a hand to the chin.
   */
  cxStatusBoard(g, _W, _D, _c, _def, _ctx, out) {
    const B = CX.BOARD;
    for (const sx of [-1, 1]) {
      part(g, box(0.06, B.y + 0.1, 0.06), GREY_D, sx * 0.6, (B.y + 0.1) / 2, B.z - 0.06);
      part(g, rbox(0.1, 0.04, 0.6, 0.015), GREY_D, sx * 0.6, 0.06, B.z + 0.05);
      for (const sz of [-1, 1]) part(g, cyl(0.035, 0.035, 0.03, 10), '#263238', sx * 0.6, 0.035, B.z + 0.05 + sz * 0.26, { rx: Math.PI / 2 });
    }
    part(g, rbox(B.w + 0.08, B.h + 0.08, 0.06, 0.02), '#212121', 0, B.y, B.z);
    const names = ['하빠름', '고성실', '김신속', '이정확'];
    const zones = ['A-03', 'B-07', 'C-12', 'D-02'];
    const frames = [0, 1, 2, 3].map((f) =>
      painted(`cxBoard${f}`, 512, 288, (c) => {
        c.fillStyle = '#0b1c24';
        c.fillRect(0, 0, 512, 288);
        c.fillStyle = TEAL;
        c.fillRect(0, 0, 512, 40);
        text(c, `${BRAND} 강남 허브 · 배송 현황`, 14, 21, 22, '#ffffff');
        text(c, `오늘 ${(12480 + f * 37).toLocaleString('en-US')}건`, 498, 21, 20, YELLOW, 'right');
        const tot = [['출고', 1284 + f * 6, '#90caf9'], ['배송 중', 532 - f * 9, '#ffcc80'], ['완료', 698 + f * 15, '#a5d6a7']] as Array<[string, number, string]>;
        tot.forEach(([k, v, col], i) => {
          c.fillStyle = '#132a35';
          c.fillRect(14 + i * 166, 50, 154, 40);
          text(c, k, 24 + i * 166, 70, 15, '#b0bec5');
          text(c, v.toLocaleString('en-US'), 160 + i * 166, 70, 22, col, 'right');
        });
        names.forEach((n, i) => {
          const y = 104 + i * 44;
          const p = Math.min(1, 0.35 + i * 0.12 + f * 0.05 + (i === 2 ? -0.2 : 0));
          text(c, zones[i], 16, y + 16, 16, YELLOW);
          text(c, n, 74, y + 16, 16, '#eceff1');
          c.fillStyle = '#263238';
          c.fillRect(150, y + 6, 260, 20);
          c.fillStyle = p > 0.8 ? '#66bb6a' : p > 0.5 ? '#26a69a' : '#ffa726';
          c.fillRect(150, y + 6, 260 * p, 20);
          text(c, `${Math.round(p * 100)}%`, 498, y + 16, 16, '#eceff1', 'right');
        });
      }),
    );
    const show = swapScreen(g, frames, B.w, B.h, 0, B.y, B.z + 0.032);
    const hi = new THREE.Mesh(new THREE.PlaneGeometry(B.w * 0.97, B.h * 0.14), new THREE.MeshBasicMaterial({ color: '#fff176', transparent: true, opacity: 0.28, depthWrite: false }));
    hi.userData.ownGeometry = hi.userData.ownMaterial = true;
    hi.visible = false;
    g.add(hi);
    glowing(g, box(0.02, 0.02, 0.005), '#69f0ae', B.w / 2 - 0.02, B.y - B.h / 2 - 0.02, B.z + 0.033);
    // The PDA rack: a shelf under the screen, eight PDAs standing in their slots, their lights.
    const ry = 0.95;
    part(g, rbox(1.3, 0.06, 0.26, 0.015), '#37474f', 0, ry, B.z + 0.05);
    label(g, 'PDA 충전 거치대', 0.36, 0.05, -0.42, ry, B.z + 0.182, '#37474f', '#80cbc4');
    const leds: THREE.Mesh[] = [];
    for (let i = 0; i < 8; i++) {
      const x = -0.52 + i * 0.15;
      const p = pda(g);
      p.g.position.set(x, ry + 0.1, B.z + 0.04);
      p.g.rotation.set(-1.35, 0, 0);
      leds.push(glowing(g, box(0.02, 0.012, 0.004), i === 5 ? '#ff5252' : '#69f0ae', x, ry + 0.012, B.z + 0.182));
    }
    const u = use(g, 'cxBoard', CX.BOARD_SPOT.x, CX.BOARD_SPOT.z);
    out.work = u.work;
    out.spots = { '*': u.s };
    out.away = (_o, t) => {
      show(Math.floor(t / 4) % 4);
      leds[3].visible = Math.sin(t * 2) > -0.3;
      const r = run(u, t);
      const row = r ? CX.boardAt(t, r.ph).row : -1;
      hi.visible = row >= 0;
      if (row >= 0) hi.position.set(0, B.y + B.h / 2 - (104 + row * 44 + 16) * (B.h / 288), B.z + 0.034);
    };
  },

  /**
   * The 무인 택배함: a bank of white lockers, small doors on the left and big ones on the right, each
   * numbered with its light (red full, green empty), the kiosk between with its touch screen, the
   * barcode window and a ledge for the parcel; 무인 택배함 · 24시간 across the top. Filled
   * (cxLocker): the kiosk tapped (택배 보관 → 보관함 선택), a door pops open, the box carried off the
   * ledge into it, the door pushed shut.
   */
  cxParcelLocker(g, _W, _D, _c, _def, _ctx, out) {
    const zc = -0.25;
    const L = CX.LOCKER;
    part(g, rbox(1.92, 1.82, 0.5, 0.02), '#e0e3e6', 0, 0.91 + 0.1, zc);
    part(g, box(1.9, 0.1, 0.46), '#37474f', 0, 0.05, zc);
    part(g, rbox(1.94, 0.18, 0.52, 0.02), TEAL, 0, 1.94, zc);
    const head = painted('cxLockerHead', 512, 48, (c) => {
      c.fillStyle = TEAL;
      c.fillRect(0, 0, 512, 48);
      text(c, '무인 택배함 · 24시간', 256, 25, 30, '#ffffff', 'center');
    });
    picture(g, head, 1.86, 0.17, 0, 1.94, zc + 0.262);
    decal(g, logoTex, 0.13, 0.13, -0.86, 1.94, zc + 0.266);
    const numTex = (s: string) =>
      painted(`cxLockNum|${s}`, 48, 32, (c) => {
        c.fillStyle = '#ffffff';
        c.fillRect(0, 0, 48, 32);
        text(c, s, 24, 17, 20, '#455a64', 'center');
      });
    // The doors: plates with a number, a handle and a light; the three it fills hung to swing.
    const swing: THREE.Group[] = [];
    const rng = seeded(61);
    let num = 1;
    const doorAt = (x: number, y: number, w: number, h: number, cellIndex: number) => {
      const n = String(num++).padStart(2, '0');
      const hinge = group(g, x - w / 2, y, 0.0);
      const plate = group(hinge, w / 2, 0, 0.01);
      part(plate, rbox(w - 0.014, h - 0.014, 0.02, 0.006), '#f7f8f9', 0, 0, 0);
      decal(plate, numTex(n), 0.05, 0.033, -w / 2 + 0.045, h / 2 - 0.035, 0.011);
      part(plate, rbox(0.012, 0.06, 0.014, 0.004), '#90a4ae', w / 2 - 0.035, 0, 0.012, { outline: false });
      glowing(plate, box(0.014, 0.014, 0.004), rng() > 0.45 ? '#ff5252' : '#69f0ae', -w / 2 + 0.03, -h / 2 + 0.03, 0.012);
      if (cellIndex >= 0) {
        const cav = new THREE.Mesh(box(w - 0.02, h - 0.02, 0.01), CAVITY);
        cav.position.set(x, y, -0.004);
        g.add(cav);
        swing[cellIndex] = hinge;
      }
    };
    const smallX = [-0.825, -0.58, -0.335];
    const smallY = [0.43, 0.73, 1.03, 1.33, 1.63];
    const bigX = [0.425, 0.775];
    const bigY = [0.5, 0.94, 1.38];
    const cellIs = (x: number, y: number) => CX.LOCKER_CELLS.findIndex(([cx, cy]) => Math.abs(cx - x) < 0.01 && Math.abs(cy - y) < 0.01);
    for (const x of smallX) for (const y of smallY) doorAt(x, y, 0.245, 0.3, cellIs(x, y));
    for (const x of bigX) for (const y of bigY) doorAt(x, y, 0.35, 0.44, cellIs(x, y));
    part(g, rbox(0.7, 0.18, 0.02, 0.006), '#f7f8f9', 0.6, 1.71, 0.01);
    // The kiosk: the touch screen, the scan window, a keypad, the ledge for the parcel, a camera.
    part(g, rbox(0.42, 1.62, 0.04, 0.01), '#37474f', 0.03, 1.02, 0.0);
    const screens = [
      painted('cxKioskHome', 120, 160, (c) => {
        c.fillStyle = '#0d2a33';
        c.fillRect(0, 0, 120, 160);
        text(c, '무인 택배함', 60, 20, 15, '#80cbc4', 'center');
        c.fillStyle = TEAL;
        c.fillRect(10, 40, 100, 44);
        text(c, '택배 보관', 60, 62, 16, '#ffffff', 'center');
        c.fillStyle = '#546e7a';
        c.fillRect(10, 94, 100, 44);
        text(c, '택배 찾기', 60, 116, 16, '#ffffff', 'center');
      }),
      painted('cxKioskPick', 120, 160, (c) => {
        c.fillStyle = '#0d2a33';
        c.fillRect(0, 0, 120, 160);
        text(c, '보관함 선택', 60, 18, 14, '#80cbc4', 'center');
        for (let i = 0; i < 12; i++) {
          c.fillStyle = i === 4 ? YELLOW : i % 3 ? '#37474f' : '#26a69a';
          c.fillRect(10 + (i % 3) * 34, 34 + Math.floor(i / 3) * 28, 30, 24);
        }
      }),
      painted('cxKioskOpen', 120, 160, (c) => {
        c.fillStyle = '#1b5e20';
        c.fillRect(0, 0, 120, 160);
        text(c, '보관함이', 60, 50, 16, '#ffffff', 'center');
        text(c, '열렸습니다', 60, 74, 16, '#ffffff', 'center');
        text(c, '물건을 넣고', 60, 110, 13, '#c8e6c9', 'center', false);
        text(c, '문을 닫아 주세요', 60, 128, 13, '#c8e6c9', 'center', false);
      }),
    ];
    const show = swapScreen(g, screens, 0.27, 0.36, L.screen[0], L.screen[1], 0.024);
    part(g, rbox(0.2, 0.06, 0.03, 0.01), '#212121', 0.03, 1.06, 0.03);
    glowing(g, box(0.15, 0.02, 0.004), '#ff5252', 0.03, 1.06, 0.047);
    for (let i = 0; i < 12; i++) part(g, rbox(0.04, 0.03, 0.012, 0.005), '#cfd8dc', -0.03 + (i % 3) * 0.06, 0.98 - Math.floor(i / 3) * 0.04, 0.026, { outline: false });
    part(g, ball(0.012), '#212121', 0.03, 1.56, 0.03);
    const [lx, ly, lz] = L.ledge;
    part(g, rbox(0.36, 0.03, 0.22, 0.01), '#546e7a', lx, ly - 0.015, lz - 0.02);
    // The parcel: on the ledge, carried, in its cell.
    const B = CX.LOCKER_BOX;
    const onLedge = parcel(g, B, 'kraft', 'A-03');
    onLedge.position.set(lx, ly + B[1] / 2, lz);
    onLedge.visible = false;
    const inCell = parcel(g, B, 'kraft', 'A-03');
    inCell.visible = false;
    const carried = loose(g);
    parcel(carried, B, 'kraft', 'A-03');
    const u = use(g, 'cxLocker', CX.LOCKER_SPOT.x, CX.LOCKER_SPOT.z);
    out.work = u.work;
    out.spots = { '*': u.s };
    out.away = (_o, t) => {
      const r = run(u, t);
      const s = r ? CX.lockerAt(t, r.ph) : null;
      swing.forEach((h, i) => (h.rotation.y = s && i === s.cell ? -1.75 * s.door : 0));
      onLedge.visible = !!s && s.box === 'ledge';
      inCell.visible = !!s && s.box === 'in' && s.door > 0.05;
      if (s) inCell.position.set(...CX.lockerInside(s.cell));
      placeAt(carried, s?.box === 'held' ? r!.h.item : undefined, r?.yaw ?? 0);
      show(!s ? 0 : s.screen === 'home' ? 0 : s.screen === 'pick' ? 1 : 2);
    };
  },

  /**
   * The main line (new, 2026-11-05, the layout audit; set dressing): the belt the length of the floor at the conveyor's height, on the
   * same grey frame and yellow rails, running into the conveyor station at its right end (the drivers' end). At its left the ITS
   * scanner tunnel the boxes ride through (its cameras read every waybill); along it three cells of the wheel sorter, rows of small
   * green wheels with the arrow of the route they turn a box off to; the pull-cord stop along the front; the line's sign hung over it.
   * Boxes ride it all the time.
   */
  cxMainLine(g, W, _D, _c, _def, _ctx, out) {
    mainLine(g, W, out);
  },

  /**
   * A loading dock's controls (new, 2026-11-05, the layout audit; set dressing), stood against the dock wall at the left of its
   * opening as seen from inside: the shutter's push-button box (올림 · 정지 · 내림), the dock's number on a yellow plate, the green
   * 상차 중 lamp; over the opening to its right the shutter rolled up in its box with its guide rails down the sides, and the
   * yellow-and-black edge of the sill.
   */
  cxDock(g) {
    dock(g);
  },
};

// =============================================================================================
// The 서브터미널's main line and its docks (2026-11-05, the layout audit).

function mainLine(g: THREE.Group, W: number, out: Parameters<Builder>[6]) {
  const { y: by, hw } = CX.BELT;
  // From the left end to where the conveyor station's belt starts (its x0, in the next piece).
  const x0 = -W / 2;
  const x1 = W / 2 + 1.5 + CX.BELT.x0;
  const L = x1 - x0;
  const mid = (x0 + x1) / 2;
  for (const sz of [-1, 1]) {
    part(g, box(L, 0.14, 0.04), GREY, mid, by - 0.08, sz * (hw + 0.03));
    part(g, rbox(L, 0.05, 0.035, 0.012), YELLOW, mid, by + 0.055, sz * (hw + 0.045));
  }
  for (let lx = x0 + 0.2; lx < x1; lx += 1.5) {
    for (const sz of [-1, 1]) {
      part(g, box(0.05, by - 0.12, 0.05), STEEL, lx, (by - 0.12) / 2, sz * (hw - 0.02));
      part(g, rbox(0.1, 0.02, 0.1, 0.008), GREY_D, lx, 0.01, sz * (hw - 0.02));
    }
    part(g, box(0.035, 0.035, 2 * hw), STEEL, lx, 0.28, 0, { outline: false });
  }
  part(g, box(L, 0.025, 2 * hw), '#2b2d31', mid, by - 0.012, 0, { outline: false });
  // The wheel sorter's cells: small green wheels in rows across the belt, the arrow toward the route's chute side.
  const arrow = painted('cxSorterArrow', 64, 64, (c) => {
    c.clearRect(0, 0, 64, 64);
    c.fillStyle = '#69f0ae';
    c.beginPath();
    c.moveTo(32, 60);
    c.lineTo(8, 30);
    c.lineTo(22, 30);
    c.lineTo(22, 4);
    c.lineTo(42, 4);
    c.lineTo(42, 30);
    c.lineTo(56, 30);
    c.closePath();
    c.fill();
  });
  for (const cx of [x0 + 2.6, x0 + 4.9, x0 + 7.2]) {
    part(g, box(0.62, 0.012, 2 * hw), '#37474f', cx, by + 0.002, 0, { outline: false });
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 5; j++) part(g, cyl(0.025, 0.025, 0.02, 10), '#43a047', cx - 0.24 + i * 0.16, by + 0.012, -hw + 0.08 + j * 0.105, { rx: Math.PI / 2, ry: 0.6, outline: false });
    decal(g, arrow, 0.16, 0.16, cx, by + 0.03, hw + 0.08, FLAT);
  }
  // The ITS scanner tunnel at the infeed: a grey box over the belt, its lit mouth, the cameras' label.
  const tx = x0 + 0.75;
  for (const sz of [-1, 1]) part(g, rbox(0.9, 0.7, 0.08, 0.02), '#cfd8dc', tx, by + 0.35, sz * (hw + 0.12));
  part(g, rbox(0.96, 0.1, 2 * hw + 0.34, 0.02), '#cfd8dc', tx, by + 0.74, 0);
  part(g, box(0.92, 0.04, 2 * hw + 0.2), '#263238', tx, by + 0.68, 0, { outline: false });
  glowing(g, box(0.02, 0.5, 2 * hw), '#80deea', tx - 0.46, by + 0.36, 0);
  label(g, 'ITS 스캐너', 0.5, 0.1, tx, by + 0.5, hw + 0.165, '#cfd8dc', '#00695c');
  // The pull-cord stop along the front, on eyelets.
  for (let lx = x0 + 0.5; lx < x1; lx += 1.5) part(g, box(0.02, 0.1, 0.02), '#9e9e9e', lx, by + 0.12, hw + 0.08, { outline: false });
  part(g, box(L - 0.4, 0.012, 0.012), '#fbc02d', mid, by + 0.17, hw + 0.08, { outline: false });
  // The line's sign, hung on two rods over its middle.
  const sy = 2.5;
  for (const sx of [-1.2, 1.2]) part(g, box(0.02, 0.5, 0.02), STEEL, mid + sx, sy + 0.4, 0, { outline: false });
  part(g, rbox(2.8, 0.36, 0.04, 0.01), TEAL_D, mid, sy, 0);
  const sign = painted('cxMainSign', 512, 64, (c) => {
    c.fillStyle = TEAL;
    c.fillRect(0, 0, 512, 64);
    text(c, '메인 라인 → 휠소터 · 구역 분류', 256, 34, 30, '#ffffff', 'center');
  });
  picture(g, sign, 2.7, 0.32, mid, sy, 0.025);
  picture(g, sign, 2.7, 0.32, mid, sy, -0.025, '#ffffff', Math.PI);
  // The boxes riding it, left to right, the whole way.
  const sizes: CX.V[] = [[0.4, 0.28, 0.32], [0.32, 0.22, 0.28], [0.36, 0.1, 0.3], [0.3, 0.3, 0.3], [0.44, 0.2, 0.34]];
  const riding = Array.from({ length: 9 }, (_, i) => {
    const s = sizes[i % sizes.length];
    const p = parcel(g, s, i % 4 === 2 ? 'poly' : 'kraft', ZONES[i % ZONES.length], false);
    p.userData.h = s[1];
    return p;
  });
  out.away = (_o, t) => {
    riding.forEach((p, i) => {
      const u = (((t * 0.7) / L + i / riding.length) % 1 + 1) % 1;
      p.position.set(x0 + 0.1 + u * (L - 0.2), by + 0.004 + (p.userData.h as number) / 2, 0.04 * Math.sin(i * 1.7));
      p.rotation.y = 0.12 * Math.sin(i * 2.3);
    });
  };
  out.away(false, 0);
}

function dock(g: THREE.Group) {
  // Stood facing into the floor (+z) with the wall behind (-z); the opening is the next tile along, at -x.
  const wz = -0.44;
  const ox = -1;
  // The push-button box on the wall, the number over it, the lamp.
  part(g, rbox(0.26, 0.36, 0.1, 0.02), '#eceff1', 0.1, 1.3, wz + 0.05);
  const btn = painted('cxDockBtn', 64, 96, (c) => {
    c.fillStyle = '#eceff1';
    c.fillRect(0, 0, 64, 96);
    text(c, '셔터', 32, 12, 12, '#263238', 'center');
    [['#43a047', '올림', 34], ['#fbc02d', '정지', 58], ['#1e88e5', '내림', 82]].forEach(([col, s, y]) => {
      c.fillStyle = col as string;
      c.beginPath();
      c.arc(16, y as number, 8, 0, Math.PI * 2);
      c.fill();
      text(c, s as string, 44, y as number, 12, '#263238', 'center');
    });
  });
  picture(g, btn, 0.22, 0.32, 0.1, 1.3, wz + 0.105);
  const n = painted('cxDockNo', 96, 64, (c) => {
    c.fillStyle = YELLOW;
    c.fillRect(0, 0, 96, 64);
    text(c, '상차 도크', 48, 32, 22, '#212121', 'center');
  });
  part(g, rbox(0.44, 0.22, 0.02, 0.005), '#212121', 0.1, 1.85, wz + 0.01);
  picture(g, n, 0.42, 0.2, 0.1, 1.85, wz + 0.025);
  glowing(g, rbox(0.1, 0.1, 0.06, 0.02), '#69f0ae', 0.1, 2.15, wz + 0.04);
  // The shutter rolled up in its box over the opening, its guide rails down either side.
  part(g, rbox(1.0, 0.32, 0.3, 0.03), '#b0bec5', ox, 2.62, wz + 0.15);
  part(g, box(0.94, 0.05, 0.02), '#78909c', ox, 2.44, wz + 0.31, { outline: false });
  for (const sx of [-1, 1]) part(g, box(0.06, 2.45, 0.06), '#90a4ae', ox + sx * 0.47, 1.23, wz + 0.04);
  for (let i = 0; i < 8; i++) part(g, box(0.11, 0.006, 0.05), i % 2 ? '#212121' : YELLOW, ox - 0.42 + i * 0.12, 0.006, wz + 0.04, { outline: false });
}
