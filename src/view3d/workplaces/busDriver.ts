import * as THREE from 'three';
import { marker, rod, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, gradient, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, glowing, label, painted, picture, ring, seeded, text, type Paint } from './doctor';
import * as BD from './busDriverMotion';

/**
 * The 버스 차고지 drawn as itself (2026-10-27 workplace pipeline, at the user's request): a Seoul
 * 시내버스 depot. The low-floor city bus in its 간선 blue or 지선 green (which one by where it's parked),
 * its route number on the orange LED sign over the windscreen, at its side and its back, the CNG tanks
 * under the roof pod, the folding glass doors on the right, the driver sat up on the left behind the
 * big flat wheel with the 현금함 and the 카드 단말기 by the front door; inside, the rows of seats (the
 * orange 교통약자석), the yellow poles and the hanging straps, the 하차 단말기 by the rear door. It pulls
 * out on its run with the driver at the wheel and the tail lights on, and backs in again with the
 * hazards going (후진합니다). The walk round before the first run goes round its front (the tyres rapped
 * with the tyre hammer, the headlamps come on to be checked, the wiper lifted); sat in the driver's
 * seat the wheel turns under the hands and the 운행기록계 and the card reader answer.
 *
 * The 요금 정산기 (the farebox's drawer tipped into the coin counter, its digits climbing, the test
 * card's 삑), the 노선 안내판 (the 노선도 traced stop by stop with each stop lit as the finger reaches it,
 * the 배차표 with its drivers' magnets), the wash bay (shared with the taxi depot and the 환경미화
 * depot: a pressure washer and the long brush, the jet swept over what's in the bay). And what the
 * depot was missing (workFurniture/busDriver.ts): the 배차실 window with the breathalyser and the
 * 운행 일지, the CNG 충전기, the 분실물 보관함, the drivers' 안마의자, the tyre rack and the 종점 stop.
 *
 * The hands and what they hold go by one clock (busDriverMotion.ts); what's moved for a use is put
 * back every frame it isn't going on (`away`, told every frame), so nothing's left half-done.
 */

const SKIN = '#ecc6a3';
const NAVY = '#1a237e';
const YELLOW = '#fbc02d';
const POLE = '#f9a825';
const SEAT = '#3949ab';
const PRIORITY = '#ff7043';
const LED = '#ffab40';
const UP = new THREE.Vector3(0, 1, 0);
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** The two liveries: 간선 (trunk, blue) and 지선 (branch, green), each with its route. */
const LIVERIES = [
  { body: '#1f6fd0', dark: '#0e4c9c', letter: 'B', kind: '간선', route: '147', dest: '서울역', via: '중랑차고지 - 서울역' },
  { body: '#33a04f', dark: '#1d7a35', letter: 'G', kind: '지선', route: '2115', dest: '석계역', via: '중랑차고지 - 석계역' },
];

// ---------------------------------------------------------------------------------------------
// Small parts.

function group(parent: THREE.Object3D, x = 0, y = 0, z = 0, ry = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}
/** A group for something carried about: built out at the front (so it's not part of the solid body) and hidden. */
function loose(parent: THREE.Object3D): THREE.Group {
  const m = group(parent, 0, 0, 5);
  m.visible = false;
  return m;
}
/** Put a loose thing at `p` (hidden if there's nowhere), turned `yaw`, tipped `pitch`. */
function placeAt(m: THREE.Object3D, p: THREE.Vector3 | undefined, yaw = 0, pitch = 0) {
  m.visible = !!p;
  if (!p) return;
  m.position.copy(p);
  m.rotation.set(pitch, yaw, 0, 'YXZ');
}
/** Turned to point its +z from `from` toward `to`. */
function aimAt(m: THREE.Object3D, from: THREE.Vector3 | undefined, to: THREE.Vector3 | undefined) {
  m.visible = !!from;
  if (!from) return;
  m.position.copy(from);
  if (!to) return;
  const d = to.clone().sub(from);
  m.rotation.set(-Math.atan2(d.y, Math.hypot(d.x, d.z)), Math.atan2(d.x, d.z), 0, 'YXZ');
}
/** A toon material of its own (a bus's livery, recoloured once it knows which it is). */
function ownToon(color: string): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ color, gradientMap: gradient });
}
/** A cylinder stretched between two points each frame (a hose, a jet of water, a cord), narrower at `a`. */
function limb(g: THREE.Object3D, r: number, material: THREE.Material | string, r1 = r): (a: THREE.Vector3 | null, b?: THREE.Vector3) => void {
  const mat = typeof material === 'string' ? new THREE.MeshToonMaterial({ color: material, gradientMap: gradient }) : material;
  const m = new THREE.Mesh(cyl(r1, r, 1, 8), mat);
  m.visible = false;
  m.castShadow = true;
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
/** A hose hanging between two points: four pieces along a sagging curve. */
function hose(g: THREE.Object3D, r: number, color: string, n = 4): (a: THREE.Vector3 | null, b?: THREE.Vector3, sag?: number) => void {
  const bits = Array.from({ length: n }, () => limb(g, r, color));
  const p = Array.from({ length: n + 1 }, () => new THREE.Vector3());
  return (a, b, sag = 0.35) => {
    if (!a || !b) {
      bits.forEach((f) => f(null));
      return;
    }
    for (let i = 0; i <= n; i++) {
      const s = i / n;
      p[i].lerpVectors(a, b, s);
      p[i].y -= sag * 4 * s * (1 - s);
    }
    bits.forEach((f, i) => f(p[i], p[i + 1]));
  };
}
const planes = new Map<string, THREE.PlaneGeometry>();
const decals = new Map<THREE.Texture, THREE.MeshBasicMaterial>();
/** A flat picture with see-through edges (a sticker, a tag), its plane and material shared. */
function decal(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0): THREE.Mesh {
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
/** A face whose picture changes (a screen, an LED sign): `show(i)`. */
function swapScreen(g: THREE.Object3D, texes: THREE.Texture[], w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0): (i: number) => void {
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
/** A bubble of words over something, turned to the camera. */
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
  const mat = new THREE.SpriteMaterial({ map: painted(`bdBubble|${s}`, 512, 160, paintBubble(s, size)), transparent: true, depthWrite: false });
  const sp = new THREE.Sprite(mat);
  sp.userData.ownMaterial = true;
  sp.scale.set(w, w * 0.3125, 1);
  sp.renderOrder = 5;
  sp.visible = false;
  parent.add(sp);
  return sp;
}

/** An orange dot-matrix LED face: drawn, then cut into dots. */
function ledTex(key: string, w: number, h: number, draw: Paint): THREE.Texture {
  return painted(`bdLed|${key}`, w, h, (c) => {
    c.fillStyle = '#121212';
    c.fillRect(0, 0, w, h);
    draw(c);
    c.fillStyle = 'rgba(18,18,18,0.85)';
    for (let x = 0; x < w; x += 4) c.fillRect(x, 0, 1, h);
    for (let y = 0; y < h; y += 4) c.fillRect(0, y, w, 1);
  });
}
/** The plate: 서울 74사 (a bus's), yellow. */
const plateTex = painted('bdPlate', 256, 64, (c) => {
  c.fillStyle = '#ffd600';
  c.fillRect(0, 0, 256, 64);
  c.strokeStyle = '#212121';
  c.lineWidth = 4;
  c.strokeRect(3, 3, 250, 58);
  text(c, '서울74사 6714', 128, 34, 34, '#1b2a1b', 'center');
});
const cngTex = painted('bdCng', 96, 96, (c) => {
  c.clearRect(0, 0, 96, 96);
  c.fillStyle = '#1565c0';
  c.beginPath();
  c.moveTo(48, 4);
  c.lineTo(92, 48);
  c.lineTo(48, 92);
  c.lineTo(4, 48);
  c.closePath();
  c.fill();
  c.strokeStyle = '#ffffff';
  c.lineWidth = 4;
  c.stroke();
  text(c, 'CNG', 48, 50, 24, '#ffffff', 'center');
});
/** The low-floor sign: a wheelchair, white on blue. */
const lowFloorTex = painted('bdLowFloor', 96, 128, (c) => {
  c.fillStyle = '#1565c0';
  c.beginPath();
  c.roundRect(2, 2, 92, 124, 12);
  c.fill();
  c.strokeStyle = '#ffffff';
  c.fillStyle = '#ffffff';
  c.lineWidth = 6;
  c.beginPath();
  c.arc(48, 22, 8, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.moveTo(46, 32);
  c.lineTo(46, 58);
  c.lineTo(66, 58);
  c.lineTo(72, 76);
  c.stroke();
  c.beginPath();
  c.arc(44, 66, 16, 0.3, Math.PI * 1.7);
  c.stroke();
  text(c, '저상버스', 48, 108, 18, '#ffffff', 'center');
});
const emblemTex = (i: number) =>
  painted(`bdEmblem|${i}`, 128, 128, (c) => {
    const L = LIVERIES[i];
    c.clearRect(0, 0, 128, 128);
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(64, 64, 60, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = L.dark;
    c.beginPath();
    c.arc(64, 64, 50, 0, Math.PI * 2);
    c.fill();
    text(c, L.letter, 64, 58, 64, '#ffffff', 'center');
    text(c, L.kind, 64, 100, 18, '#ffffff', 'center');
  });
const frontLed = (i: number, page: number) =>
  ledTex(`front|${i}|${page}`, 512, 64, (c) => {
    const L = LIVERIES[i];
    if (page === 0) {
      text(c, L.route, 18, 33, 46, LED, 'left');
      text(c, L.dest, 300, 33, 40, LED, 'center');
    } else {
      text(c, L.route, 18, 33, 46, LED, 'left');
      text(c, L.via, 310, 34, 28, LED, 'center');
    }
  });
const sideLed = (i: number) =>
  ledTex(`side|${i}`, 256, 64, (c) => {
    const L = LIVERIES[i];
    text(c, L.route, 10, 33, 40, LED, 'left');
    text(c, L.dest, 170, 34, 28, LED, 'center');
  });
const rearLed = (i: number) => ledTex(`rear|${i}`, 192, 64, (c) => text(c, LIVERIES[i].route, 96, 34, 46, LED, 'center'));
const readerTex = (s: string, sub: string, bg: string) =>
  painted(`bdReader|${s}|${sub}|${bg}`, 96, 120, (c) => {
    c.fillStyle = bg;
    c.fillRect(0, 0, 96, 120);
    text(c, s, 48, 44, 16, '#ffffff', 'center');
    text(c, sub, 48, 76, 13, '#e3f2fd', 'center', false);
  });
const gaugeTex = painted('bdGauges', 256, 96, (c) => {
  c.fillStyle = '#101418';
  c.fillRect(0, 0, 256, 96);
  for (const [x, label0, a] of [[52, 'km/h', 0.2], [204, 'rpm', 0.45]] as Array<[number, string, number]>) {
    c.strokeStyle = '#90a4ae';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(x, 56, 36, Math.PI * 0.8, Math.PI * 2.2);
    c.stroke();
    c.strokeStyle = '#ff7043';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(x, 56);
    const ang = Math.PI * (0.8 + 1.4 * a);
    c.lineTo(x + Math.cos(ang) * 30, 56 + Math.sin(ang) * 30);
    c.stroke();
    text(c, label0, x, 80, 12, '#cfd8dc', 'center', false);
  }
  c.fillStyle = '#263238';
  c.fillRect(100, 22, 56, 54);
  text(c, 'CNG', 128, 38, 13, '#4fc3f7', 'center');
  text(c, '185bar', 128, 60, 13, '#a5d6a7', 'center');
});

// ---------------------------------------------------------------------------------------------
// Whose spot it is, and the frame the motion's worked out in.

const tmp = new THREE.Vector3();
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
/** Whether a dweller's posed at a spot just now (activity.ts spotPose marks it). */
const posed = (s: Spot, t: number) => Math.abs(t - posedAt(s)) < 0.6;
const heightAt = (s: Spot) => (s.at.userData.height as number | undefined) ?? 1.6;
const phaseOf = (work: THREE.Object3D) => BD.bdPhase(work.getWorldPosition(tmp));

interface Use {
  s: Spot;
  m: BD.BdMotion;
  work: THREE.Object3D;
}
/** A spot at (x, z) (stood, or sat on a seat `y` up), facing its motion's base way, its work mark where the motion has it. */
function use(g: THREE.Object3D, m: BD.BdMotion, x: number, z: number, work?: THREE.Object3D, how: 'stand' | 'sit' = 'stand', y = 0, drop?: number): Use {
  const w = work ?? marker(g, ...(BD.bdWork(m) as [number, number, number]));
  const s = spot(g, how, x, y, z, BD.bdYaw(m, 0, 0), drop);
  s.work = w;
  s.motion = m;
  return { s, m, work: w };
}
/** The hands now for a use that's going on (turning its spot by its clock first), or null. */
function run(u: Use, t: number): { h: BD.Hands; ph: number; yaw: number } | null {
  if (!posed(u.s, t)) return null;
  const ph = phaseOf(u.work);
  if (u.m !== 'bdWalkRound' && u.m !== 'bdRest') u.s.at.rotation.y = BD.bdYaw(u.m, t, ph);
  const f = BD.frameAt(u.work.position, BD.bdWork(u.m), 0, u.s.at.position, u.s.at.rotation.y, heightAt(u.s));
  return { h: BD.bdHands(u.m, f, t, ph), ph, yaw: u.s.at.rotation.y };
}

// ---------------------------------------------------------------------------------------------
// Handheld things (each built about its grip, pointing +z).

function pen(parent: THREE.Object3D, color = '#1565c0'): THREE.Group {
  const g = group(parent);
  part(g, cyl(0.005, 0.005, 0.13, 6), color, 0, 0.05, 0, { rx: 0.4, outline: false });
  return g;
}
function card(parent: THREE.Object3D): THREE.Group {
  const g = group(parent);
  part(g, rbox(0.085, 0.004, 0.054, 0.002), '#26a69a', 0, 0, 0.03, { outline: false });
  part(g, box(0.06, 0.005, 0.01), '#ffffff', 0, 0, 0.045, { outline: false });
  return g;
}
/** The tyre hammer: a wooden handle, a steel head at its end pointing down. */
function tyreHammer(parent: THREE.Object3D): THREE.Group {
  const g = group(parent);
  part(g, cyl(0.016, 0.016, 0.34, 8), '#8d6e63', 0, 0, 0.13, { rx: Math.PI / 2 });
  part(g, rbox(0.05, 0.11, 0.05, 0.01), '#546e7a', 0, -0.02, 0.29);
  return g;
}

// =============================================================================================
// The city bus.

function cityBus(g: THREE.Group, out: Built) {
  const L = BD.BUS;
  const bus = group(g);
  const bodyMat = ownToon(LIVERIES[0].body);
  const darkMat = ownToon(LIVERIES[0].dark);
  const GLASS_SIDE = new THREE.MeshToonMaterial({ color: '#1c2a33', transparent: true, opacity: 0.5, depthWrite: false, gradientMap: gradient });
  const GLASS_FRONT = new THREE.MeshToonMaterial({ color: '#cfe8f3', transparent: true, opacity: 0.22, depthWrite: false, gradientMap: gradient });
  const body = (geom: THREE.BufferGeometry, x: number, y: number, z: number, dark = false) => part(bus, geom, '#1f6fd0', x, y, z, { material: dark ? darkMat : bodyMat });
  const pane = (w: number, h: number, d: number, x: number, y: number, z: number, mat = GLASS_SIDE) => {
    const m = new THREE.Mesh(box(w, h, d), mat);
    m.position.set(x, y, z);
    m.renderOrder = 2;
    bus.add(m);
    return m;
  };
  const yb = 0.28;
  const yt = 1.08;
  const winTop = 2.18;
  const arches: Array<[number, number]> = [[L.rAxle - 0.54, L.rAxle + 0.54], [L.fAxle - 0.54, L.fAxle + 0.54]];
  const FD: [number, number] = [L.nose - 0.95, L.nose - 0.15];
  const RD: [number, number] = [-0.42, 0.42];

  // The wheels: singles at the front, duals at the back, in dark wells under black arches.
  const wheels: THREE.Group[] = [];
  for (const [az, dual] of [[L.fAxle, false], [L.rAxle, true]] as Array<[number, boolean]>)
    for (const sx of [-1, 1]) {
      const wd = dual ? 0.38 : 0.26;
      part(bus, box(0.5, 0.62, 1.06), '#1b1b1b', sx * 0.72, 0.72, az, { outline: false });
      const w = group(bus, sx * (L.hw - 0.17), L.wheelR, az);
      part(w, cyl(L.wheelR, L.wheelR, wd, 24), BLACK, 0, 0, 0, { rz: Math.PI / 2 });
      part(w, cyl(0.25, 0.25, wd + 0.01, 20), '#cfd8dc', 0, 0, 0, { rz: Math.PI / 2, outline: false });
      part(w, cyl(0.09, 0.09, wd + 0.02, 12), '#90a4ae', 0, 0, 0, { rz: Math.PI / 2, outline: false });
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        part(w, cyl(0.016, 0.016, wd + 0.03, 6), '#607d8b', 0, Math.cos(a) * 0.16, Math.sin(a) * 0.16, { rz: Math.PI / 2, outline: false });
      }
      wheels.push(w);
      part(bus, ring(0.53, 0.035, Math.PI), '#212121', sx * (L.hw + 0.004), L.wheelR, az, { ry: Math.PI / 2 });
    }

  // The lower body down each side in the livery, cut round the wheels and (on the right) the doors.
  const panel = (sx: number, z0: number, z1: number, y0 = yb, y1 = yt) => {
    if (z1 - z0 < 0.03) return;
    body(rbox(0.05, y1 - y0, z1 - z0, 0.02), sx * (L.hw - 0.025), (y0 + y1) / 2, (z0 + z1) / 2);
  };
  for (const sx of [-1, 1]) {
    const full: Array<[number, number]> =
      sx > 0
        ? [[L.tail + 0.04, arches[0][0]], [arches[0][1], arches[1][0]], [arches[1][1], L.nose - 0.04]]
        : [[L.tail + 0.04, arches[0][0]], [arches[0][1], RD[0]], [RD[1], arches[1][0]], [FD[1], L.nose - 0.04]];
    full.forEach(([a, b]) => panel(sx, a, b));
    arches.forEach(([a, b]) => panel(sx, a, b, 0.98, yt));
    // The silver beltline under the windows, a black rubbing strip low down.
    const runs: Array<[number, number]> = sx > 0 ? [[L.tail + 0.04, L.nose - 0.04]] : [[L.tail + 0.04, RD[0]], [RD[1], FD[0]], [FD[1], L.nose - 0.04]];
    for (const [a, b] of runs) {
      part(bus, box(0.06, 0.035, b - a), '#eceff1', sx * L.hw, yt + 0.005, (a + b) / 2, { outline: false });
    }
    for (const [a, b] of full) part(bus, box(0.055, 0.05, b - a), '#263238', sx * L.hw, 0.38, (a + b) / 2, { outline: false });
    // The window band: dark tinted glass between black pillars.
    const glassRuns: Array<[number, number]> = sx > 0 ? [[L.tail + 0.15, L.nose - 0.12]] : [[L.tail + 0.15, RD[0]], [RD[1], FD[0]], [FD[1], L.nose - 0.12]];
    for (const [a, b] of glassRuns) pane(0.02, winTop - yt, b - a, sx * (L.hw - 0.01), (yt + winTop) / 2, (a + b) / 2);
    // A pillar every 0.9 m or so down the side, and at each door's edges.
    const every = (a: number, b: number) => {
      const n = Math.max(1, Math.round((b - a) / 0.9));
      return Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
    };
    const pillars = sx > 0 ? every(L.tail + 0.15, L.nose - 0.13) : [...every(L.tail + 0.15, RD[0]), ...every(RD[1], FD[0]), FD[1]];
    for (const z of pillars) part(bus, rbox(0.06, winTop - yt + 0.02, 0.07, 0.02), '#1a1a1a', sx * (L.hw - 0.01), (yt + winTop) / 2, z);
    // The livery's emblem, the CNG diamond, the side LED over the windows.
    decal(bus, cngTex, 0.2, 0.2, sx * (L.hw + 0.004), 0.72, L.tail + 0.5, sx > 0 ? Math.PI / 2 : -Math.PI / 2);
  }
  // The driver's sliding window (left), the windscreen pillars.
  part(bus, box(0.03, 0.5, 0.02), '#9e9e9e', L.hw - 0.005, 1.75, L.nose - 0.63, { outline: false });
  for (const sx of [-1, 1]) part(bus, rbox(0.08, winTop - yt + 0.04, 0.08, 0.03), '#1a1a1a', sx * (L.hw - 0.03), (yt + winTop) / 2, L.nose - 0.06);
  const emblems: THREE.Mesh[] = [];
  const emblemMat = new THREE.MeshBasicMaterial({ map: emblemTex(0), transparent: true, alphaTest: 0.05 });
  for (const [sx, z] of [[1, 0.0], [-1, 0.82]] as Array<[number, number]>) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), emblemMat);
    m.userData.ownGeometry = true;
    m.position.set(sx * (L.hw + 0.004), 0.68, z);
    m.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
    bus.add(m);
    emblems.push(m);
  }
  decal(bus, lowFloorTex, 0.18, 0.24, -(L.hw + 0.004), 0.72, -0.75, -Math.PI / 2);
  label(bus, '앞문 승차', 0.36, 0.08, -(L.hw + 0.004), 2.1, (FD[0] + FD[1]) / 2, '#ffffff', '#1565c0', -Math.PI / 2);
  label(bus, '뒷문 하차', 0.36, 0.08, -(L.hw + 0.004), 2.1, 0, '#ffffff', '#c62828', -Math.PI / 2);

  // The roof, the pod over the CNG tanks and the air-con unit.
  part(bus, rbox(2.0, 0.34, L.nose - L.tail, 0.12), '#f4f4f2', 0, 2.33, 0);
  part(bus, rbox(1.5, 0.26, 5.6, 0.1), '#e3e4e0', 0, 2.6, -1.4);
  for (let i = 0; i < 6; i++) part(bus, box(1.2, 0.012, 0.04), '#bdbdbd', 0, 2.735, -3.7 + i * 0.92, { outline: false });
  part(bus, rbox(1.2, 0.16, 0.8, 0.06), '#d5d7d3', 0, 2.56, L.nose - 1.6);
  for (let i = 0; i < 3; i++) part(bus, cyl(0.12, 0.12, 0.02, 16), '#90a4ae', -0.35 + i * 0.35, 2.645, L.nose - 1.6, { outline: false });

  // The front: the low panel in the livery with its white smile, the lamps, the grille, the bumper,
  // the plate; the windscreen all glass up to the LED sign; the wipers; the bug-eye mirrors.
  body(rbox(1.96, 0.8, 0.08, 0.04), 0, 0.68, L.nose - 0.04).userData.ownMaterial = true;
  part(bus, rbox(1.7, 0.05, 0.02, 0.01), '#ffffff', 0, 0.98, L.nose + 0.005, { outline: false });
  body(rbox(1.96, 0.06, 0.08, 0.02), 0, winTop + 0.01, L.nose - 0.04, true).userData.ownMaterial = true;
  const heads: THREE.Mesh[] = [];
  const blinkers: THREE.Mesh[] = [];
  for (const sx of [-1, 1]) {
    part(bus, rbox(0.36, 0.15, 0.04, 0.02), '#263238', sx * 0.68, 0.68, L.nose + 0.01);
    for (const dx of [0.6, 0.77]) {
      part(bus, rbox(0.13, 0.1, 0.02, 0.02), '#cfd8dc', sx * dx, 0.68, L.nose + 0.026, { outline: false });
      heads.push(glowing(bus, rbox(0.13, 0.1, 0.022, 0.02), '#fffde7', sx * dx, 0.68, L.nose + 0.028));
    }
    part(bus, rbox(0.08, 0.06, 0.02, 0.01), '#ff8f00', sx * 0.9, 0.68, L.nose + 0.02, { outline: false });
    blinkers.push(glowing(bus, rbox(0.08, 0.06, 0.022, 0.01), '#ffd180', sx * 0.9, 0.68, L.nose + 0.022));
    part(bus, cyl(0.04, 0.04, 0.02, 12), '#eeeeee', sx * 0.72, 0.44, L.nose + 0.06, { rx: Math.PI / 2, outline: false });
  }
  part(bus, rbox(0.8, 0.16, 0.02, 0.02), '#263238', 0, 0.58, L.nose + 0.01);
  for (let i = 0; i < 4; i++) part(bus, box(0.74, 0.012, 0.01), '#546e7a', 0, 0.53 + i * 0.035, L.nose + 0.022, { outline: false });
  part(bus, rbox(2.02, 0.16, 0.14, 0.04), '#212121', 0, 0.33, L.nose - 0.01);
  picture(bus, plateTex, 0.48, 0.12, 0, 0.42, L.nose + 0.065);
  const front = new THREE.Mesh(box(1.86, winTop - yt, 0.02), GLASS_FRONT);
  front.position.set(0, (yt + winTop) / 2, L.nose - 0.03);
  front.renderOrder = 2;
  front.userData.ownMaterial = true;
  bus.add(front);
  // The wipers: the driver's (lifted at the walk round) and the other.
  const wiper = group(bus, ...BD.WIPER_FOOT);
  const arm = group(wiper);
  arm.rotation.z = 0.55;
  part(arm, box(0.018, 0.62, 0.012), '#212121', 0, 0.31, 0.012, { outline: false });
  part(arm, rbox(0.03, 0.6, 0.02, 0.008), '#37474f', 0, 0.33, 0.026);
  const wiper2 = group(bus, -0.42, 1.12, L.nose + 0.02);
  wiper2.rotation.z = 0.55;
  part(wiper2, box(0.018, 0.62, 0.012), '#212121', 0, 0.31, 0.012, { outline: false });
  part(wiper2, rbox(0.03, 0.6, 0.02, 0.008), '#37474f', 0, 0.33, 0.026);
  for (const sx of [-1, 1]) {
    rod(bus, v3(sx * 0.96, 2.12, L.nose - 0.15), v3(sx * 1.13, 2.16, L.nose + 0.24), 0.016, BLACK);
    rod(bus, v3(sx * 1.13, 2.16, L.nose + 0.24), v3(sx * 1.15, 1.98, L.nose + 0.3), 0.016, BLACK);
    part(bus, rbox(0.08, 0.32, 0.16, 0.03), BLACK, sx * 1.16, 1.84, L.nose + 0.3);
  }
  // The LED destination sign over the windscreen, at the side and at the back (pages swapped).
  part(bus, box(1.72, 0.25, 0.02), '#121212', 0, 2.33, L.nose + 0.005, { outline: false });
  const frontSign = swapScreen(bus, [frontLed(0, 0), frontLed(0, 1), frontLed(1, 0), frontLed(1, 1)], 1.64, 0.2, 0, 2.33, L.nose + 0.018);
  const sideSigns = [1, -1].map((sx) => {
    part(bus, box(0.02, 0.22, 0.95), '#121212', sx * (L.hw + 0.002), 2.33, L.nose - 1.7, { outline: false });
    return swapScreen(bus, [sideLed(0), sideLed(1)], 0.9, 0.18, sx * (L.hw + 0.014), 2.33, L.nose - 1.7, sx > 0 ? Math.PI / 2 : -Math.PI / 2);
  });

  // The back: the engine's grille, the tall tail lamps, the small back window, the route number.
  body(rbox(1.96, winTop - yb, 0.08, 0.04), 0, (winTop + yb) / 2, L.tail + 0.04);
  const backWin = new THREE.Mesh(box(1.4, 0.42, 0.02), GLASS_SIDE);
  backWin.userData.ownMaterial = true;
  backWin.position.set(0, 1.84, L.tail - 0.005);
  bus.add(backWin);
  part(bus, rbox(1.3, 0.46, 0.02, 0.02), '#263238', 0, 0.76, L.tail - 0.005);
  for (let i = 0; i < 6; i++) part(bus, box(1.2, 0.02, 0.012), '#607d8b', 0, 0.57 + i * 0.075, L.tail - 0.018, { outline: false });
  part(bus, rbox(2.02, 0.16, 0.12, 0.04), '#212121', 0, 0.33, L.tail + 0.02);
  picture(bus, plateTex, 0.44, 0.11, 0, 1.13, L.tail - 0.012, '#ffffff', Math.PI);
  const tails: THREE.Mesh[] = [];
  const reverses: THREE.Mesh[] = [];
  for (const sx of [-1, 1]) {
    part(bus, rbox(0.14, 0.44, 0.04, 0.02), '#8e1b1b', sx * 0.84, 0.86, L.tail - 0.01);
    tails.push(glowing(bus, rbox(0.14, 0.44, 0.042, 0.02), '#ff5252', sx * 0.84, 0.86, L.tail - 0.012));
    part(bus, rbox(0.12, 0.08, 0.04, 0.01), '#ff8f00', sx * 0.84, 1.16, L.tail - 0.01);
    blinkers.push(glowing(bus, rbox(0.12, 0.08, 0.042, 0.01), '#ffd180', sx * 0.84, 1.16, L.tail - 0.012));
    part(bus, rbox(0.12, 0.07, 0.04, 0.01), '#eeeeee', sx * 0.84, 0.56, L.tail - 0.01);
    reverses.push(glowing(bus, rbox(0.12, 0.07, 0.042, 0.01), '#ffffff', sx * 0.84, 0.56, L.tail - 0.012));
  }
  decal(bus, cngTex, 0.2, 0.2, 0.55, 1.13, L.tail - 0.012, Math.PI);
  part(bus, box(0.72, 0.24, 0.02), '#121212', 0, 2.33, L.tail - 0.005, { outline: false });
  const rearSign = swapScreen(bus, [rearLed(0), rearLed(1)], 0.66, 0.2, 0, 2.33, L.tail - 0.018, Math.PI);
  // The CNG filler flaps low on each flank behind the back wheels.
  for (const sx of [-1, 1]) part(bus, rbox(0.02, 0.2, 0.26, 0.02), '#cfd8dc', sx * (L.hw + 0.004), 0.95, L.rAxle - 0.9);

  // The doors: folding glass leaves, two a door, hung at the opening's edges and swung in.
  const leaf = (hinge: number, dir: 1 | -1) => {
    const d = group(bus, -(L.hw - 0.02), L.floor + 0.01, hinge);
    const w = 0.4;
    const h = winTop - L.floor - 0.03;
    const zc = dir * (w / 2);
    for (const y of [0.03, h - 0.03, h * 0.45]) part(d, box(0.04, 0.06, w), '#263238', 0, y, zc, { outline: false });
    for (const z of [dir * 0.02, dir * (w - 0.02)]) part(d, box(0.04, h, 0.04), '#263238', 0, h / 2, z, { outline: false });
    const gl = new THREE.Mesh(box(0.015, h - 0.08, w - 0.06), GLASS_FRONT);
    gl.position.set(0, h / 2, zc);
    gl.renderOrder = 2;
    d.add(gl);
    rod(d, v3(0.04, 0.9, zc), v3(0.04, 1.4, zc), 0.012, CHROME);
    return { d, dir };
  };
  const frontDoor = [leaf(FD[0], 1), leaf(FD[1], -1)];
  const rearDoor = [leaf(RD[0], 1), leaf(RD[1], -1)];
  const doorsAt = (leaves: typeof frontDoor, open: number) => leaves.forEach(({ d, dir }) => (d.rotation.y = dir * 1.45 * open));
  for (const [a, b] of [FD, RD]) part(bus, box(0.3, 0.02, b - a), '#fbc02d', -(L.hw - 0.15), L.floor + 0.005, (a + b) / 2, { outline: false });

  // Inside: the floor (up a step behind the back wheels), the driver's seat up on its platform.
  part(bus, box(1.92, 0.06, L.nose - L.tail - 0.2), '#4a4f55', 0, L.floor - 0.03, 0, { outline: false });
  part(bus, box(1.92, 0.24, BD.STEP_Z - L.tail - 0.1), '#4a4f55', 0, 0.48, (BD.STEP_Z + L.tail + 0.1) / 2, { outline: false });
  part(bus, box(1.92, 0.02, 0.04), YELLOW, 0, 0.61, BD.STEP_Z, { outline: false });
  const D = BD.DRIVER;
  part(bus, rbox(0.66, 0.22, 0.9, 0.03), '#37474f', D.x + 0.08, L.floor + 0.11, D.z + 0.05);
  part(bus, cyl(0.06, 0.08, D.seat - 0.12 - (L.floor + 0.22), 10), '#263238', D.x, (D.seat - 0.12 + L.floor + 0.22) / 2, D.z);
  part(bus, rbox(0.46, 0.12, 0.44, 0.05), '#263238', D.x, D.seat - 0.06, D.z - 0.02);
  const back = group(bus, D.x, D.seat, D.z - 0.24);
  back.rotation.x = -0.14;
  part(back, rbox(0.46, 0.66, 0.1, 0.05), '#263238', 0, 0.36, 0);
  part(back, rbox(0.28, 0.16, 0.09, 0.04), '#263238', 0, 0.78, 0);
  // The wheel, nearly flat on its column, turning under the hands.
  const [hx, hy, hz] = BD.WHEEL.hub;
  const tilt = BD.WHEEL.tilt;
  rod(bus, v3(hx, hy - Math.cos(tilt) * 0.42, hz + Math.sin(tilt) * 0.42), v3(hx, hy, hz), 0.035, '#212121');
  const wheelTilt = group(bus, hx, hy, hz);
  wheelTilt.rotation.x = -tilt;
  const wheelSpin = group(wheelTilt);
  part(wheelSpin, ring(BD.WHEEL.r, 0.021), '#1c1c1c', 0, 0, 0, { rx: Math.PI / 2 });
  for (let i = 0; i < 3; i++) {
    const sp = group(wheelSpin, 0, 0, 0, Math.PI + (i * 2 * Math.PI) / 3);
    part(sp, box(0.035, 0.014, BD.WHEEL.r), '#2b2b2b', 0, 0, BD.WHEEL.r / 2, { outline: false });
  }
  part(wheelSpin, cyl(0.06, 0.06, 0.05, 14), '#2b2b2b', 0, 0.01, 0);
  // The dash: the gauges in their hood before the wheel, the 운행기록계, the switches.
  part(bus, rbox(1.92, 0.3, 0.32, 0.05), '#2f3438', 0, 1.2, L.nose - 0.19);
  part(bus, rbox(0.46, 0.18, 0.16, 0.04), '#1c1c1c', BD.GAUGES[0], 1.44, BD.GAUGES[2] - 0.01);
  picture(bus, gaugeTex, 0.4, 0.15, BD.GAUGES[0], 1.43, BD.GAUGES[2] - 0.095, '#ffffff', Math.PI, -0.25);
  part(bus, rbox(0.22, 0.1, 0.06, 0.02), '#37474f', BD.TACHO[0], BD.TACHO[1], BD.TACHO[2] - 0.02);
  const tacho = swapScreen(
    bus,
    [
      painted('bdTacho0', 128, 48, (c) => {
        c.fillStyle = '#0d2b1a';
        c.fillRect(0, 0, 128, 48);
        text(c, '운행기록계', 64, 16, 14, '#69f0ae', 'center');
        text(c, '00:00 대기', 64, 34, 13, '#69f0ae', 'center', false);
      }),
      painted('bdTacho1', 128, 48, (c) => {
        c.fillStyle = '#0d2b1a';
        c.fillRect(0, 0, 128, 48);
        text(c, '기록 확인', 64, 16, 14, '#b9f6ca', 'center');
        text(c, '정상 ✓', 64, 34, 14, '#b9f6ca', 'center');
      }),
    ],
    0.15,
    0.055,
    BD.TACHO[0],
    BD.TACHO[1],
    BD.TACHO[2] - 0.052,
    Math.PI,
  );
  // The driver's mirror over the windscreen, on its stalk.
  rod(bus, v3(BD.MIRROR[0], winTop - 0.02, BD.MIRROR[2] + 0.12), v3(BD.MIRROR[0], BD.MIRROR[1] + 0.04, BD.MIRROR[2] + 0.02), 0.012, '#212121');
  part(bus, rbox(0.34, 0.1, 0.03, 0.02), '#212121', BD.MIRROR[0], BD.MIRROR[1], BD.MIRROR[2]);
  part(bus, box(0.31, 0.075, 0.004), '#b0bec5', BD.MIRROR[0], BD.MIRROR[1], BD.MIRROR[2] - 0.017, { outline: false });
  for (let i = 0; i < 5; i++) part(bus, box(0.03, 0.02, 0.02), ['#e53935', '#43a047', '#fdd835', '#90a4ae', '#90a4ae'][i], -0.6 + i * 0.07, 1.36, L.nose - 0.32, { outline: false });
  // The 현금함 beside the driver and the 승차 단말기 on its pole at the front door.
  const cashZ = L.nose - 0.45;
  part(bus, cyl(0.04, 0.06, 0.6, 10), '#263238', 0.02, L.floor + 0.3, cashZ);
  part(bus, rbox(0.24, 0.3, 0.26, 0.03), '#37474f', 0.02, L.floor + 0.75, cashZ);
  const fbGlass = new THREE.Mesh(box(0.2, 0.1, 0.2), GLASS_FRONT);
  fbGlass.position.set(0.02, L.floor + 0.95, cashZ);
  bus.add(fbGlass);
  for (let i = 0; i < 6; i++) part(bus, cyl(0.015, 0.015, 0.006, 10), i % 2 ? '#d4a017' : '#cfd8dc', 0.02 + (i % 3) * 0.05 - 0.05, L.floor + 0.91 + 0.004 * i, cashZ - 0.04 + Math.floor(i / 3) * 0.06, { outline: false });
  const [cx, cy, cz] = BD.CARD;
  rod(bus, v3(cx - 0.06, L.floor, cz + 0.02), v3(cx - 0.06, winTop, cz + 0.02), 0.022, POLE);
  const reader = group(bus, cx, cy, cz, -0.85);
  part(reader, rbox(0.13, 0.2, 0.06, 0.02), '#eceff1', 0, 0, 0);
  const cardScreen = swapScreen(reader, [readerTex('카드를', '대 주세요', '#1565c0'), readerTex('삑!', '감사합니다', '#2e7d32')], 0.09, 0.11, 0, 0.02, 0.031);
  // The 하차 단말기 by the rear door.
  rod(bus, v3(-0.62, L.floor, 0.6), v3(-0.62, winTop, 0.6), 0.022, POLE);
  part(bus, rbox(0.12, 0.18, 0.06, 0.02), '#eceff1', -0.56, 1.35, 0.6, { ry: -Math.PI / 2 });
  decal(bus, readerTex('하차', '카드 태그', '#c62828'), 0.08, 0.1, -0.528, 1.36, 0.6, -Math.PI / 2 + Math.PI);
  // The seats: blue rows, the orange 교통약자석 at the front, up a step at the back; the back bench.
  const seat = (x: number, z: number, fy: number, color = SEAT) => {
    part(bus, box(0.05, 0.36, 0.05), '#616161', x, fy + 0.18, z, { outline: false });
    part(bus, rbox(0.38, 0.08, 0.38, 0.03), color, x, fy + 0.41, z);
    const b = group(bus, x, fy + 0.45, z - 0.18);
    b.rotation.x = -0.12;
    part(b, rbox(0.38, 0.5, 0.06, 0.03), color, 0, 0.25, 0);
    part(b, rbox(0.38, 0.04, 0.07, 0.02), '#9e9e9e', 0, 0.51, 0.0);
  };
  // Behind the driver on the left (+x) rows of two, the orange 교통약자석 at the front; opposite them (between the doors) singles;
  // past the rear door rows on the low floor, then up the step over the back wheels, and the back bench.
  for (const z of [3.2, 2.4, 1.6, 0.8]) for (const x of [0.32, 0.74]) seat(x, z, L.floor, z > 2 ? PRIORITY : SEAT);
  for (const z of [3.6, 2.8, 2.0, 1.2]) seat(-0.74, z, L.floor, z > 2.4 ? PRIORITY : SEAT);
  for (const z of [-1.2, -2.0]) for (const x of [-0.74, -0.32, 0.32, 0.74]) seat(x, z, L.floor);
  for (const z of [-2.95, -3.7, -4.45]) for (const x of [-0.74, -0.32, 0.32, 0.74]) seat(x, z, 0.6);
  for (const x of [-0.8, -0.4, 0, 0.4, 0.8]) seat(x, L.tail + 0.4, 0.6);
  // The yellow poles, the ceiling rails and their straps, the red stop buttons, the ceiling lights.
  for (const [x, z] of [[-0.62, L.nose - 1.2], [0.08, 2.0], [-0.62, 0.8], [-0.62, -0.6], [0.08, -1.6], [-0.62, BD.STEP_Z + 0.3], [0.08, -3.4]] as Array<[number, number]>) {
    rod(bus, v3(x, z < BD.STEP_Z ? 0.6 : L.floor, z), v3(x, winTop, z), 0.022, POLE);
    part(bus, ball(0.028), '#e53935', x + 0.03, 1.3, z, { outline: false });
  }
  const railA = L.tail + 0.7;
  const railB = L.nose - 1.35;
  for (const sx of [-1, 1]) {
    rod(bus, v3(sx * 0.52, 2.04, railA), v3(sx * 0.52, 2.04, railB), 0.016, CHROME);
    for (let z = railA + 0.2; z < railB - 0.1; z += 0.42) {
      rod(bus, v3(sx * 0.52, 2.04, z), v3(sx * 0.52, 1.9, z), 0.008, '#fafafa');
      part(bus, ring(0.045, 0.01), '#fafafa', sx * 0.52, 1.85, z, { ry: Math.PI / 2, outline: false });
    }
    glowing(bus, box(0.08, 0.01, railB - railA), '#fffde7', sx * 0.3, 2.155, (railA + railB) / 2);
  }

  // The driver: seen at the wheel while it drives out or backs in.
  const driver = group(bus, D.x, D.seat, D.z);
  part(driver, rbox(0.32, 0.42, 0.22, 0.08), '#e8eef5', 0, 0.26, -0.02);
  part(driver, box(0.04, 0.22, 0.01), NAVY, 0, 0.3, 0.095, { outline: false });
  part(driver, rbox(0.3, 0.12, 0.42, 0.05), '#2b2f3a', 0, 0.04, 0.16);
  for (const sx of [-1, 1]) part(driver, rbox(0.12, 0.42, 0.12, 0.05), '#2b2f3a', sx * 0.08, -0.22, 0.38);
  part(driver, ball(0.1), SKIN, 0, 0.6, 0.0);
  part(driver, ball(0.104), '#2b1b10', 0, 0.64, -0.03).scale.set(1, 0.72, 1);
  for (const [sx, a] of [[1, 1.0], [-1, -1.0]] as Array<[number, number]>) {
    const [rx, ry, rz] = BD.rimAt(a);
    rod(driver, v3(sx * 0.17, 0.42, 0), v3(rx - D.x, ry - D.seat, rz - D.z), 0.04, '#e8eef5');
  }
  driver.visible = false;
  const reversing = bubble(bus, '후진합니다 삐- 삐-', 1.3, 38);
  reversing.position.set(0, 3.2, L.tail);

  // The walk round's spot (on the ground round the bus) and the driver's seat.
  const walkWork = marker(g, 0, 1, 0);
  const walk = use(g, 'bdWalkRound', BD.WALK.tyreR.x, BD.WALK.tyreR.z, walkWork);
  walk.s.at.rotation.y = BD.WALK.tyreR.yaw;
  const hammer = loose(g);
  tyreHammer(hammer);
  const dash = use(bus, 'bdDash', D.x, D.z, marker(bus, ...(BD.WHEEL.hub as [number, number, number])), 'sit', D.seat, D.drop);
  out.work = walkWork;
  out.spots = { inspectBus: walk.s, busDriver_longHaulCheck: dash.s, '*': walk.s };

  // Out on a run: it pulls away with the driver at the wheel and is gone; it backs in, hazards going.
  let state: 'parked' | 'leaving' | 'gone' | 'back' | undefined;
  let since = 0;
  let livery = -1;
  let door = 0;
  let last = 0;
  const PULL = 14;
  out.away = (isOut, t) => {
    const dt = Math.min(0.1, Math.max(0, t - last));
    last = t;
    if (livery < 0) {
      g.getWorldPosition(tmp);
      livery = ((Math.round(tmp.x * 0.25 + tmp.z * 0.25) % 2) + 2) % 2;
      const Lv = LIVERIES[livery];
      bodyMat.color.set(Lv.body);
      darkMat.color.set(Lv.dark);
      emblemMat.map = emblemTex(livery);
      emblemMat.needsUpdate = true;
      sideSigns.forEach((s) => s(livery));
      rearSign(livery);
    }
    frontSign(livery * 2 + (Math.floor(t / 3.5) % 2));
    if (state === undefined) state = isOut ? 'gone' : 'parked';
    else if (isOut && (state === 'parked' || state === 'back')) [state, since] = ['leaving', t];
    else if (!isOut && (state === 'leaving' || state === 'gone')) [state, since] = ['back', t];
    let z = 0;
    if (state === 'leaving') {
      const u = Math.min(1, (t - since) / 4.5);
      z = PULL * u * u;
      if (u >= 1) state = 'gone';
    } else if (state === 'back') {
      const u = Math.min(1, (t - since) / 6);
      z = PULL * (1 - u) * (1 - u);
      if (u >= 1) state = 'parked';
    }
    bus.position.z = z;
    bus.visible = state !== 'gone';
    wheels.forEach((w) => (w.rotation.x = z / L.wheelR));
    const moving = state === 'leaving' || state === 'back';
    driver.visible = moving;
    tails.forEach((m) => (m.visible = moving));
    reverses.forEach((m) => (m.visible = state === 'back'));
    reversing.visible = state === 'back' && Math.sin(t * 4) > -0.3;
    // The walk round: the spot carried round the nose, the lamps on to be checked, the wiper lifted.
    const wr = state === 'parked' ? run(walk, t) : null;
    let lightsOn = moving;
    let lift = 0;
    if (wr) {
      const w = BD.walkAt(t, wr.ph);
      walk.s.at.position.set(w.x, 0, w.z);
      walk.s.at.rotation.y = w.yaw;
      lightsOn ||= w.lights;
      lift = w.wiper;
      placeAt(hammer, wr.h.tool, wr.yaw, 0.35);
    } else {
      walk.s.at.position.set(BD.WALK.tyreR.x, 0, BD.WALK.tyreR.z);
      walk.s.at.rotation.y = BD.WALK.tyreR.yaw;
      hammer.visible = false;
    }
    heads.forEach((m) => (m.visible = lightsOn));
    const hazard = (state === 'back' || (wr && lightsOn)) && Math.sin(t * 9) > 0;
    blinkers.forEach((m) => (m.visible = !!hazard));
    arm.rotation.x = -0.9 * lift;
    // Sat at the wheel: it turns under the hands, the 운행기록계 and the card reader answer, the door's open.
    const dr = state === 'parked' && posed(dash.s, t) ? BD.dashAt(t, phaseOf(dash.work)) : null;
    wheelSpin.rotation.y = dr ? dr.turn : 0;
    tacho(dr?.tacho ? 1 : 0);
    cardScreen(dr?.card ? 1 : 0);
    door = THREE.MathUtils.damp(door, dr ? 1 : 0, 4, dt);
    doorsAt(frontDoor, door);
    doorsAt(rearDoor, 0);
  };
}

// =============================================================================================
// The 요금 정산기.

const digitTex = (d: string) =>
  painted(`bdDigit|${d}`, 32, 48, (c) => {
    c.fillStyle = '#1a0d0d';
    c.fillRect(0, 0, 32, 48);
    text(c, d, 16, 26, 38, '#ff5252', 'center');
  });
const settleSheet = painted('bdSettleSheet', 96, 128, (c) => {
  c.fillStyle = '#fafafa';
  c.fillRect(0, 0, 96, 128);
  text(c, '수입금 정산서', 48, 12, 11, '#263238', 'center');
  c.strokeStyle = '#b0bec5';
  c.lineWidth = 1;
  for (let i = 0; i < 7; i++) {
    c.beginPath();
    c.moveTo(6, 26 + i * 14);
    c.lineTo(90, 26 + i * 14);
    c.stroke();
  }
  const rows = [['차량', '6714'], ['현금', '187,400'], ['카드', '1,236건'], ['환승', '418건']];
  rows.forEach(([a, b], i) => {
    text(c, a, 8, 34 + i * 14, 9, '#455a64', 'left', false);
    text(c, b, 88, 34 + i * 14, 9, '#1565c0', 'right', false);
  });
});

function farebox(g: THREE.Group, out: Built) {
  const T = BD.FB.top;
  const B = BD.FB.box;
  // The steel counter on its plinth, a shelf of cash bags under it.
  part(g, rbox(1.0, T - 0.06, 0.5, 0.02), '#78909c', 0, (T - 0.06) / 2, -0.17);
  part(g, rbox(1.04, 0.04, 0.54, 0.01), STEEL, 0, T - 0.02, -0.17);
  part(g, box(0.96, 0.06, 0.01), '#455a64', 0, 0.04, 0.085, { outline: false });
  label(g, '수입금 정산', 0.4, 0.09, -0.2, 0.62, 0.082, '#263238', '#ffffff');
  for (const x of [0.18, 0.34]) {
    part(g, rbox(0.14, 0.18, 0.1, 0.04), '#a1887f', x, 0.6, 0.03);
    part(g, cyl(0.02, 0.03, 0.04, 8), '#6d4c41', x, 0.71, 0.03, { outline: false });
  }
  // The farebox off a bus: its body, the glass hopper with the day's coins and notes, the lock.
  part(g, rbox(B.w, B.h, B.d, 0.03), '#37474f', B.x, T + B.h / 2, B.z);
  part(g, rbox(B.w + 0.02, 0.03, B.d + 0.02, 0.01), '#263238', B.x, T + B.h, B.z);
  const hop = new THREE.Mesh(box(B.w - 0.04, 0.12, B.d - 0.04), new THREE.MeshToonMaterial({ color: '#d7f1fb', transparent: true, opacity: 0.35, depthWrite: false, gradientMap: gradient }));
  hop.userData.ownMaterial = true;
  hop.position.set(B.x, T + B.h + 0.075, B.z);
  hop.renderOrder = 2;
  g.add(hop);
  const rng = seeded(31);
  for (let i = 0; i < 14; i++) part(g, cyl(0.013, 0.013, 0.005, 10), rng() > 0.5 ? '#d4a017' : '#cfd8dc', B.x - 0.08 + rng() * 0.16, T + B.h + 0.03 + 0.012 * rng(), B.z - 0.08 + rng() * 0.16, { rx: rng() * 0.5, outline: false });
  for (let i = 0; i < 3; i++) part(g, box(0.12, 0.003, 0.06), ['#a5d6a7', '#ffcc80', '#90caf9'][i], B.x - 0.03 + i * 0.03, T + B.h + 0.06 + 0.004 * i, B.z + 0.02 - i * 0.03, { ry: 0.4 * i, outline: false });
  part(g, box(0.1, 0.008, 0.02), '#111', B.x, T + B.h + 0.14, B.z, { outline: false });
  part(g, rbox(0.06, 0.06, 0.01, 0.01), CHROME, ...BD.FB.lock);
  part(g, box(0.008, 0.02, 0.004), '#212121', BD.FB.lock[0], BD.FB.lock[1], BD.FB.lock[2] + 0.006, { outline: false });
  // Its cash drawer (in the box, or out in the hands), the key in the lock.
  const drawer = (parent: THREE.Object3D) => {
    const d = group(parent);
    const [w, h, dd] = BD.FB_DRAWER;
    part(d, rbox(w, h, dd, 0.01), '#546e7a', 0, 0, 0);
    part(d, box(w - 0.02, 0.005, dd - 0.02), '#263238', 0, h / 2 - 0.004, 0, { outline: false });
    const r = seeded(7);
    for (let i = 0; i < 9; i++) part(d, cyl(0.013, 0.013, 0.005, 10), r() > 0.5 ? '#d4a017' : '#cfd8dc', -0.08 + r() * 0.16, h / 2 + 0.001, -0.09 + r() * 0.18, { outline: false });
    part(d, rbox(0.08, 0.02, 0.015, 0.006), '#cfd8dc', 0, 0, dd / 2 + 0.006);
    return d;
  };
  const inBox = drawer(g);
  inBox.position.set(...BD.FB_DRAWER_IN);
  const heldDrawer = loose(g);
  const tipped = drawer(heldDrawer);
  const key = group(g, BD.FB.lock[0], BD.FB.lock[1], BD.FB.lock[2] + 0.02);
  part(key, box(0.01, 0.03, 0.03), '#ffd54f', 0, 0, 0.012, { outline: false });
  part(key, rbox(0.04, 0.04, 0.01, 0.01), '#ffd54f', 0, 0, 0.035);
  key.visible = false;
  // The coin counter: its hopper, its sorted tubes, the red count.
  const C = BD.FB_COUNTER;
  part(g, rbox(C.w, C.h, C.d, 0.03), '#cfd8dc', C.x, T + C.h / 2, C.z);
  part(g, cyl(0.1, 0.05, 0.08, 18), '#90a4ae', C.hopper[0], T + C.h + 0.04, C.hopper[2]);
  for (let i = 0; i < 5; i++) {
    const x = C.x - 0.1 + i * 0.05;
    part(g, cyl(0.016, 0.016, 0.07, 10), '#eceff1', x, T + 0.04, C.z + C.d / 2 + 0.02, { outline: false });
  }
  part(g, rbox(0.2, 0.06, 0.01, 0.01), '#1a0d0d', C.x, T + C.h - 0.07, C.z + C.d / 2 + 0.002);
  const digits = Array.from({ length: 6 }, (_, i) => swapScreen(g, '0123456789 '.split('').map(digitTex), 0.026, 0.04, C.x - 0.075 + i * 0.03, T + C.h - 0.07, C.z + C.d / 2 + 0.009));
  label(g, '동전 계수기', 0.16, 0.035, C.x, T + 0.12, C.z + C.d / 2 + 0.003, '#cfd8dc', '#37474f');
  // Coins falling from the drawer's lip into the hopper.
  const coins = Array.from({ length: 6 }, (_, i) => {
    const m = part(g, cyl(0.013, 0.013, 0.005, 8), i % 2 ? '#d4a017' : '#cfd8dc', 0, 0, 0, { outline: false });
    m.visible = false;
    return m;
  });
  // The test reader on its post, the 정산서 clipboard and its pen.
  const [rx, , rz] = BD.FB_READER.base;
  part(g, cyl(0.025, 0.04, 0.24, 10), '#455a64', rx, T + 0.12, rz);
  const head = group(g, ...BD.FB_READER.face);
  head.rotation.x = -0.4;
  part(head, rbox(0.14, 0.18, 0.05, 0.02), '#eceff1', 0, 0, 0);
  const readerFace = swapScreen(head, [readerTex('카드를', '대 주세요', '#1565c0'), readerTex('정상', '1,500원', '#2e7d32')], 0.1, 0.12, 0, 0.0, 0.026);
  part(g, rbox(0.2, 0.012, 0.26, 0.006), '#8d6e63', BD.FB_CLIP[0], T + 0.006, BD.FB_CLIP[2]);
  picture(g, settleSheet, 0.17, 0.22, BD.FB_CLIP[0], T + 0.014, BD.FB_CLIP[2] + 0.01, '#ffffff', 0, -Math.PI / 2);
  part(g, rbox(0.08, 0.02, 0.025, 0.006), CHROME, BD.FB_CLIP[0], T + 0.018, BD.FB_CLIP[2] - 0.12);
  const restPen = pen(g);
  restPen.position.set(BD.FB_CLIP[0] + 0.12, T + 0.012, BD.FB_CLIP[2]);
  restPen.rotation.set(Math.PI / 2, 0.3, 0);
  const heldPen = pen(loose(g));
  const heldCard = card(loose(g));
  const restCard = card(g);
  restCard.position.set(rx + 0.0, T + 0.004, rz + 0.13);
  const u = use(g, 'bdSettle', BD.FB_SPOT.x, BD.FB_SPOT.z);
  out.work = u.work;
  out.spots = { '*': u.s };
  out.away = (_o, t) => {
    const r = run(u, t);
    const s = r ? BD.settleAt(t, r.ph) : null;
    const h = r?.h;
    inBox.visible = !s || s.drawer === 'in';
    placeAt(heldDrawer, s?.drawer === 'held' ? h?.item : undefined, (r?.yaw ?? 0) + Math.PI, 0);
    tipped.rotation.x = -1.1 * (s?.tilt ?? 0);
    key.visible = s?.key != null;
    key.rotation.z = (s?.key ?? 0) * (Math.PI / 2);
    const count = s?.count ?? 0;
    const str = String(count).padStart(6, ' ');
    digits.forEach((d, i) => d(str[i] === ' ' ? 10 : Number(str[i])));
    coins.forEach((c, i) => {
      c.visible = !!s?.pour && !!h?.item;
      if (!c.visible) return;
      const f = (t * 1.6 + i / coins.length) % 1;
      const [hx, hy, hz] = BD.FB_COUNTER.hopper;
      const from = h!.item!;
      c.position.set(from.x + (hx - from.x) * f + 0.02 * Math.sin(i * 2.1), from.y + (hy + 0.04 - from.y) * f, from.z + (hz - from.z) * f);
      c.rotation.set(t * 7 + i, i, 0);
    });
    readerFace(s?.beep ? 1 : 0);
    const cardHeld = !!r && !!h?.tool && !s?.writing && s?.key == null;
    placeAt(heldCard, cardHeld ? h!.tool : undefined, (r?.yaw ?? 0) + Math.PI, -0.4);
    restCard.visible = !cardHeld;
    placeAt(heldPen, s?.writing ? h?.tool : undefined, r?.yaw ?? 0);
    restPen.visible = !s?.writing;
  };
}

// =============================================================================================
// The 노선 안내판.

/** Board coordinates (x across, y up) to the canvas's pixels. */
const BW = 768;
const BH = 512;
const bx = (x: number) => ((x - BD.RB.x0) / (BD.RB.x1 - BD.RB.x0)) * BW;
const by = (y: number) => ((BD.RB.y1 - y) / (BD.RB.y1 - BD.RB.y0)) * BH;
const boardTex = painted('bdRouteBoard', BW, BH, (c) => {
  c.fillStyle = '#fbfbf8';
  c.fillRect(0, 0, BW, BH);
  // The 노선도: route 147's line through its stops, each named.
  c.fillStyle = '#1f6fd0';
  c.fillRect(0, 0, bx(-0.02), 52);
  text(c, '147', 20, 27, 34, '#ffffff', 'left');
  text(c, '간선 · 중랑차고지 - 서울역 노선도', 100, 28, 20, '#ffffff', 'left');
  c.strokeStyle = '#1f6fd0';
  c.lineWidth = 12;
  c.lineJoin = 'round';
  c.beginPath();
  BD.STOPS.forEach(([x, y], i) => (i ? c.lineTo(bx(x), by(y)) : c.moveTo(bx(x), by(y))));
  c.stroke();
  BD.STOPS.forEach(([x, y], i) => {
    c.fillStyle = '#ffffff';
    c.strokeStyle = '#0e4c9c';
    c.lineWidth = 4;
    c.beginPath();
    c.arc(bx(x), by(y), 10, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    const above = i < 3 || i === 5 || i === 6;
    text(c, BD.STOP_NAMES[i], bx(x) + (i === 3 || i === 4 || i === 10 ? 30 : 0), by(y) + (above ? -24 : 26) * (i === 3 || i === 4 || i === 10 ? 0 : 1), 15, '#263238', i === 3 || i === 4 || i === 10 ? 'left' : 'center');
  });
  text(c, '종점', bx(BD.STOPS[0][0]), by(BD.STOPS[0][1]) + 26, 13, '#e53935', 'center');
  // The 배차 시간표.
  const x0 = bx(0.02);
  c.fillStyle = '#263238';
  c.fillRect(x0, 0, BW - x0, 52);
  text(c, '오늘의 배차 시간표', x0 + (BW - x0) / 2, 28, 24, '#ffffff', 'center');
  c.strokeStyle = '#90a4ae';
  c.lineWidth = 2;
  const head = by(1.8);
  text(c, '순번', bx(0.08), head, 15, '#455a64', 'center');
  text(c, '기사', bx(BD.GRID.magnet), head, 15, '#455a64', 'center');
  text(c, '출발', bx(BD.GRID.time + 0.04), head, 15, '#455a64', 'center');
  text(c, '확인', bx(0.68), head, 15, '#455a64', 'center');
  BD.GRID.rows.forEach((y, i) => {
    c.beginPath();
    c.moveTo(x0 + 6, by(y + 0.06));
    c.lineTo(BW - 6, by(y + 0.06));
    c.stroke();
    text(c, `${i + 1}`, bx(0.08), by(y), 18, '#263238', 'center');
  });
  for (const x of [0.15, 0.39, 0.6]) {
    c.beginPath();
    c.moveTo(bx(x), by(1.76));
    c.lineTo(bx(x), by(1.03));
    c.stroke();
  }
});
const TIMES = ['05:30', '05:42', '05:54', '06:06', '06:18', '06:30'];
const DRIVERS: Array<[string, string]> = [['신정류', '#ef5350'], ['배환승', '#42a5f5'], ['오세영', '#66bb6a'], ['한결', '#ffa726'], ['오아린', '#ab47bc'], ['박지호', '#26a69a']];
const handTime = (s: string) =>
  painted(`bdHandTime|${s}`, 96, 40, (c) => {
    c.clearRect(0, 0, 96, 40);
    c.font = 'italic bold 26px "Malgun Gothic",sans-serif';
    c.fillStyle = '#1565c0';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(s, 48, 22);
  });
const magnetTex = (name: string, col: string) =>
  painted(`bdMagnet|${name}`, 96, 48, (c) => {
    c.fillStyle = col;
    c.fillRect(0, 0, 96, 48);
    text(c, name, 48, 26, 24, '#ffffff', 'center');
  });
const notebookTex = painted('bdNotebook', 64, 80, (c) => {
  c.fillStyle = '#fffde7';
  c.fillRect(0, 0, 64, 80);
  c.strokeStyle = '#90caf9';
  for (let i = 0; i < 7; i++) {
    c.beginPath();
    c.moveTo(4, 12 + i * 10);
    c.lineTo(60, 12 + i * 10);
    c.stroke();
  }
  text(c, '망우→상봉', 32, 18, 9, '#1565c0', 'center', false);
  text(c, '→중화→먹골', 32, 28, 9, '#1565c0', 'center', false);
});

function routeBoard(g: THREE.Group, out: Built) {
  const R = BD.RB;
  const midY = (R.y0 + R.y1) / 2;
  // Two square legs on feet, the aluminium frame, the board, the tray along its foot.
  for (const sx of [-1, 1]) {
    part(g, rbox(0.05, 2.02, 0.05, 0.01), '#b0bec5', sx * 0.8, 1.01, R.face - 0.05);
    part(g, rbox(0.06, 0.04, 0.5, 0.01), '#90a4ae', sx * 0.8, 0.02, R.face - 0.05);
  }
  part(g, rbox(R.x1 - R.x0 + 0.06, R.y1 - R.y0 + 0.06, 0.04, 0.01), '#cfd8dc', 0, midY, R.face - 0.025);
  picture(g, boardTex, R.x1 - R.x0, R.y1 - R.y0, 0, midY, R.face + 0.001);
  part(g, rbox(1.3, 0.03, 0.1, 0.01), '#b0bec5', 0, R.tray[1] - 0.015, R.tray[2] - 0.0);
  for (let i = 0; i < 3; i++) part(g, cyl(0.009, 0.009, 0.12, 8), ['#1565c0', '#e53935', '#212121'][i], -0.4 + i * 0.05, R.tray[1] + 0.01, R.tray[2], { rz: Math.PI / 2, outline: false });
  part(g, rbox(0.12, 0.05, 0.06, 0.01), '#eceff1', -0.15, R.tray[1] + 0.025, R.tray[2]);
  for (let i = 0; i < 3; i++) decal(g, magnetTex(...DRIVERS[(i + 3) % 6]), 0.1, 0.05, R.tray[0] - 0.08 + i * 0.11, R.tray[1] + 0.002, R.tray[2] + 0.005, 0, -Math.PI / 2);
  label(g, '중랑공영차고지 운수과', 0.6, 0.07, 0, R.y1 + 0.08, R.face - 0.02, '#263238', '#ffffff');
  // Each stop lit as the finger reaches it.
  const lamp = glowing(g, cyl(0.022, 0.022, 0.008, 16), '#ffeb3b', 0, 0, 0, Math.PI / 2);
  lamp.visible = false;
  const lamp2 = glowing(g, cyl(0.022, 0.022, 0.008, 16), '#ffeb3b', 0, 0, 0, Math.PI / 2);
  lamp2.visible = false;
  // The 배차표's drivers' magnets and handwritten times; this round's row filled as it's done.
  const mags = BD.GRID.rows.map((y, i) => decal(g, magnetTex(...DRIVERS[i]), 0.12, 0.06, BD.GRID.magnet, y, R.face + 0.008));
  const times = BD.GRID.rows.map((y, i) => decal(g, handTime(TIMES[i]), 0.16, 0.066, BD.GRID.time + 0.05, y, R.face + 0.006));
  const checks = BD.GRID.rows.map((y) => decal(g, handTime('✓'), 0.08, 0.06, 0.68, y, R.face + 0.006));
  const heldMagnet = loose(g);
  const hm = group(heldMagnet);
  part(hm, rbox(0.12, 0.06, 0.015, 0.005), '#ef5350', 0, 0, 0.0);
  const heldPen = pen(loose(g));
  const heldMarker = pen(loose(g), '#1565c0');
  const book = loose(g);
  part(book, rbox(0.1, 0.012, 0.14, 0.004), '#5d4037', 0, 0, 0);
  decal(book, notebookTex, 0.09, 0.12, 0, 0.008, 0, 0, -Math.PI / 2);
  const trace = use(g, 'bdTrace', BD.RB_SPOT.x, BD.RB_SPOT.z);
  const memo = use(g, 'bdMemorize', BD.RB_SPOT.x, BD.RB_SPOT.z, trace.work);
  const plan = use(g, 'bdSchedule', BD.RB_SPOT.x, BD.RB_SPOT.z, trace.work);
  out.work = trace.work;
  out.spots = { studyRoute: trace.s, busDriver_learnStops: memo.s, busDriver_dispatchSchedule: plan.s, '*': trace.s };
  const lightStop = (m: THREE.Mesh, i: number | null) => {
    m.visible = i !== null;
    if (i === null) return;
    const [x, y] = BD.STOPS[Math.max(0, Math.min(BD.STOPS.length - 1, i))];
    m.position.set(x, y, R.face + 0.006);
  };
  out.away = (_o, t) => {
    const tr = run(trace, t);
    const me = tr ? null : run(memo, t);
    const pl = tr || me ? null : run(plan, t);
    const ts = tr ? BD.traceAt(t, tr.ph) : null;
    const ms = me ? BD.memoAt(t, me.ph) : null;
    lightStop(lamp, ts?.stop ?? (ms?.stops ? ms.stops[0] : null));
    lightStop(lamp2, ms?.stops ? ms.stops[1] : null);
    placeAt(book, me?.h.item, (me?.yaw ?? 0) + Math.PI, -0.5);
    placeAt(heldPen, ms?.writing ? me!.h.tool : undefined, me?.yaw ?? 0);
    const ps = pl ? BD.planAt(t, pl.ph) : null;
    mags.forEach((m, i) => (m.visible = !ps || i !== ps.row || ps.placed));
    times.forEach((m, i) => {
      m.visible = !ps || i !== ps.row || ps.written > 0.05;
      m.scale.x = ps && i === ps.row ? Math.max(0.05, ps.written) : 1;
    });
    checks.forEach((m, i) => (m.visible = !ps || i !== ps.row));
    const writing = !!ps && ps.placed && ps.written < 1 && !!pl?.h.tool;
    placeAt(heldMarker, writing ? pl!.h.tool : undefined, pl?.yaw ?? 0);
    placeAt(heldMagnet, !writing && pl?.h.tool ? pl.h.tool : undefined, (pl?.yaw ?? 0) + Math.PI);
  };
}

// =============================================================================================
// The wash bay.

function washBay(g: THREE.Group, out: Built) {
  const W = BD.WB;
  const GALV = '#b0bec5';
  // The wet pad and its drain, the frame at the back with its sign, the hose boom.
  const wet = new THREE.Mesh(new THREE.CircleGeometry(0.9, 24), new THREE.MeshBasicMaterial({ color: '#90a4ae', transparent: true, opacity: 0.22, depthWrite: false }));
  wet.userData.ownGeometry = wet.userData.ownMaterial = true;
  wet.rotation.x = -Math.PI / 2;
  wet.position.set(0, 0.004, 0.9);
  g.add(wet);
  part(g, box(1.0, 0.012, 0.14), '#37474f', 0, 0.006, 0.62, { outline: false });
  for (let i = 0; i < 12; i++) part(g, box(0.012, 0.014, 0.12), '#90a4ae', -0.46 + i * 0.084, 0.008, 0.62, { outline: false });
  for (const sx of [-1, 1]) part(g, rbox(0.07, 2.2, 0.07, 0.01), GALV, sx * 0.45, 1.1, -0.4);
  part(g, rbox(0.98, 0.08, 0.08, 0.01), GALV, 0, 2.18, -0.4);
  label(g, '세차 구역 · 고압 주의', 0.84, 0.13, 0, 1.98, -0.355, '#0277bd', '#ffffff');
  // The pressure washer: a yellow cart with its gauge, switch, hose reel and a jug of soap on top.
  part(g, rbox(0.42, 0.56, 0.36, 0.04), YELLOW, -0.18, 0.36, -0.2);
  part(g, rbox(0.44, 0.06, 0.38, 0.02), '#424242', -0.18, 0.66, -0.2);
  for (const sx of [-1, 1]) part(g, cyl(0.07, 0.07, 0.05, 14), '#212121', -0.18 + sx * 0.16, 0.07, -0.08, { rz: Math.PI / 2 });
  part(g, cyl(0.045, 0.045, 0.02, 14), '#eceff1', -0.26, 0.5, -0.015, { rx: Math.PI / 2 });
  part(g, box(0.004, 0.035, 0.004), '#e53935', -0.26, 0.51, -0.002, { rz: 0.6, outline: false });
  part(g, rbox(0.05, 0.04, 0.02, 0.01), '#e53935', -0.08, 0.5, -0.015);
  label(g, '고압세척기', 0.22, 0.05, -0.16, 0.38, -0.018, '#212121', YELLOW);
  part(g, cyl(0.15, 0.15, 0.1, 18), '#455a64', -0.44, 0.38, -0.2, { rz: Math.PI / 2 });
  for (let i = 0; i < 4; i++) part(g, ring(0.12 - i * 0.012, 0.012), '#212121', -0.5, 0.38, -0.2, { ry: Math.PI / 2, outline: false });
  part(g, rbox(0.14, 0.2, 0.1, 0.03), '#e1f5fe', -0.08, 0.79, -0.24);
  label(g, '세제', 0.08, 0.04, -0.08, 0.8, -0.188, '#0277bd', '#ffffff');
  // The power cord to the post's outlet.
  part(g, rbox(0.1, 0.14, 0.05, 0.01), '#eceff1', -0.45, 1.2, -0.35);
  rod(g, v3(-0.45, 1.13, -0.34), v3(-0.36, 0.5, -0.36), 0.008, BLACK);
  // The lance's hook on the right post; the lance (hung, or held), its hose back to the washer.
  part(g, rbox(0.06, 0.04, 0.08, 0.01), '#616161', W.hook[0], W.hook[1], W.hook[2] - 0.02);
  const lance = (parent: THREE.Object3D) => {
    const l = group(parent);
    part(l, rbox(0.05, 0.14, 0.06, 0.015), '#212121', 0, -0.05, 0);
    part(l, rbox(0.045, 0.04, 0.12, 0.015), '#ef6c00', 0, 0, 0.04);
    part(l, cyl(0.01, 0.01, W.lance, 8), '#9e9e9e', 0, 0, 0.1 + W.lance / 2, { rx: Math.PI / 2 });
    part(l, cyl(0.016, 0.012, 0.06, 10), '#ef6c00', 0, 0, 0.13 + W.lance, { rx: Math.PI / 2 });
    return l;
  };
  const hung = lance(g);
  hung.position.set(W.hook[0], W.hook[1] - 0.04, W.hook[2] + 0.05);
  hung.rotation.set(Math.PI / 2, 0, 0);
  const held = loose(g);
  lance(held);
  const outlet = v3(-0.02, 0.5, -0.04);
  const hoseLine = hose(g, 0.012, '#263238');
  const jet = limb(g, 0.008, new THREE.MeshBasicMaterial({ color: '#e1f5fe', transparent: true, opacity: 0.75, depthWrite: false }), 0.06);
  const splash = Array.from({ length: 7 }, () => {
    const m = new THREE.Mesh(ball(0.035), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7, depthWrite: false }));
    m.userData.ownMaterial = true;
    m.visible = false;
    g.add(m);
    return m;
  });
  // The suds bucket with the long brush standing in it (or out in the hands).
  const [kx, , kz] = W.bucket;
  part(g, cyl(0.17, 0.13, 0.32, 18), '#1e88e5', kx, 0.16, kz);
  part(g, ring(0.17, 0.01), '#1565c0', kx, 0.32, kz, { rx: Math.PI / 2, outline: false });
  for (let i = 0; i < 6; i++) part(g, ball(0.045), '#ffffff', kx - 0.08 + (i % 3) * 0.08, 0.32 + 0.01 * (i % 2), kz - 0.05 + Math.floor(i / 3) * 0.08, { outline: false });
  const brush = (parent: THREE.Object3D) => {
    const b = group(parent);
    part(b, cyl(0.014, 0.014, W.brush, 8), '#78909c', 0, 0, W.brush / 2, { rx: Math.PI / 2 });
    const head = group(b, 0, 0, W.brush);
    part(head, rbox(0.3, 0.05, 0.07, 0.02), '#1565c0', 0, 0, 0);
    part(head, box(0.28, 0.06, 0.05), '#ffee58', 0, -0.05, 0, { outline: false });
    for (let i = 0; i < 3; i++) part(head, ball(0.03), '#ffffff', -0.09 + i * 0.09, -0.08, 0.0, { outline: false });
    return b;
  };
  const standing = brush(g);
  // Head down in the suds, the pole leaning up out of the bucket.
  standing.position.set(kx + 0.02, 0.12 + W.brush, kz - 0.1);
  standing.rotation.set(Math.PI / 2 - 0.1, 0, 0);
  const scrub = loose(g);
  brush(scrub);
  const u = use(g, 'bdWash', BD.WB_SPOT.x, BD.WB_SPOT.z);
  out.work = u.work;
  out.spots = { '*': u.s };
  const hookAt = v3(W.hook[0], W.hook[1] - 0.1, W.hook[2] + 0.05);
  out.away = (_o, t) => {
    const r = run(u, t);
    const s = r ? BD.washAt(t, r.ph) : null;
    const h = r?.h;
    const lanceHeld = s?.lance === 'held';
    hung.visible = !lanceHeld;
    if (lanceHeld) aimAt(held, h?.tool, h?.aim);
    else held.visible = false;
    hoseLine(outlet, lanceHeld && h?.tool ? h.tool.clone().add(v3(0, -0.1, 0)) : hookAt, lanceHeld ? 0.25 : 0.45);
    // The jet from the nozzle to where it's aimed, and the spray off it.
    if (s?.jet && h?.tool && h.aim) {
      const nose = h.aim.clone().sub(h.tool).normalize().multiplyScalar(0.2 + W.lance).add(h.tool);
      jet(nose, h.aim);
      splash.forEach((m, i) => {
        m.visible = true;
        const f = (t * 3 + i / splash.length) % 1;
        m.position.copy(h.aim!).add(v3(0.25 * Math.sin(i * 2.3 + t), 0.18 * f - 0.05, 0.25 * Math.cos(i * 1.7 + t)));
        m.scale.setScalar(0.6 + f);
      });
    } else {
      jet(null);
      splash.forEach((m) => (m.visible = false));
    }
    const brushHeld = s?.brush === 'held';
    standing.visible = !brushHeld;
    if (brushHeld) aimAt(scrub, h?.tool, h?.aim);
    else scrub.visible = false;
  };
}

// =============================================================================================
// The new pieces.

const logPage = painted('bdLogPage', 192, 128, (c) => {
  c.fillStyle = '#fffef6';
  c.fillRect(0, 0, 192, 128);
  c.fillStyle = '#e0e0e0';
  c.fillRect(95, 0, 2, 128);
  text(c, '운행 일지', 48, 12, 12, '#263238', 'center');
  text(c, '10월 27일 (화)', 144, 12, 11, '#263238', 'center', false);
  c.strokeStyle = '#b0bec5';
  for (let i = 0; i < 7; i++) {
    c.beginPath();
    c.moveTo(4, 26 + i * 14);
    c.lineTo(188, 26 + i * 14);
    c.stroke();
  }
  const rows = [['147', '05:30', '신정류'], ['147', '05:42', '배환승'], ['2115', '05:50', '오세영'], ['147', '05:54', '한결']];
  rows.forEach(([r, tm, nm], i) => {
    text(c, r, 14, 33 + i * 14, 9, '#1565c0', 'left', false);
    text(c, tm, 44, 33 + i * 14, 9, '#1565c0', 'left', false);
    text(c, nm, 70, 33 + i * 14, 9, '#1565c0', 'left', false);
    text(c, '0.000', 104, 33 + i * 14, 9, '#2e7d32', 'left', false);
  });
});
const stampTex = painted('bdStamp', 64, 64, (c) => {
  c.clearRect(0, 0, 64, 64);
  c.strokeStyle = '#d32f2f';
  c.lineWidth = 4;
  c.beginPath();
  c.arc(32, 32, 26, 0, Math.PI * 2);
  c.stroke();
  text(c, '확인', 32, 33, 20, '#d32f2f', 'center');
});
const breathScreens = [
  painted('bdBreath0', 128, 64, (c) => {
    c.fillStyle = '#0d1b2a';
    c.fillRect(0, 0, 128, 64);
    text(c, '음주측정기', 64, 22, 16, '#90caf9', 'center');
    text(c, '불어 주세요', 64, 44, 14, '#90caf9', 'center', false);
  }),
  painted('bdBreath1', 128, 64, (c) => {
    c.fillStyle = '#0d1b2a';
    c.fillRect(0, 0, 128, 64);
    text(c, '측정 중…', 64, 22, 16, '#ffe082', 'center');
    c.fillStyle = '#ffe082';
    c.fillRect(14, 40, 100, 8);
  }),
  painted('bdBreath2', 128, 64, (c) => {
    c.fillStyle = '#0d2b1a';
    c.fillRect(0, 0, 128, 64);
    text(c, '0.000%', 64, 24, 22, '#69f0ae', 'center');
    text(c, '정상 · 운행 가능', 64, 48, 12, '#b9f6ca', 'center');
  }),
];
const dispatchScreen = painted('bdDispatchScreen', 192, 128, (c) => {
  c.fillStyle = '#0b1a2b';
  c.fillRect(0, 0, 192, 128);
  text(c, '배차 현황', 8, 12, 12, '#90caf9', 'left');
  c.strokeStyle = '#1f6fd0';
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(12, 40);
  c.lineTo(180, 40);
  c.stroke();
  c.strokeStyle = '#33a04f';
  c.beginPath();
  c.moveTo(12, 84);
  c.lineTo(180, 84);
  c.stroke();
  for (const [x, y, col] of [[40, 40, '#ffeb3b'], [110, 40, '#ffeb3b'], [160, 40, '#ffeb3b'], [70, 84, '#ffeb3b'], [140, 84, '#ffeb3b']] as Array<[number, number, string]>) {
    c.fillStyle = col;
    c.fillRect(x - 6, y - 5, 12, 10);
  }
  text(c, '147  운행 9 · 대기 2', 8, 58, 10, '#cfd8dc', 'left', false);
  text(c, '2115  운행 6 · 대기 1', 8, 102, 10, '#cfd8dc', 'left', false);
});
const posterTex = painted('bdBreathPoster', 128, 176, (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 128, 176);
  c.fillStyle = '#c62828';
  c.fillRect(0, 0, 128, 44);
  text(c, '운행 전', 64, 14, 16, '#ffffff', 'center');
  text(c, '음주측정 필수', 64, 33, 16, '#ffffff', 'center');
  c.strokeStyle = '#c62828';
  c.lineWidth = 6;
  c.beginPath();
  c.arc(64, 100, 34, 0, Math.PI * 2);
  c.moveTo(40, 76);
  c.lineTo(88, 124);
  c.stroke();
  text(c, '술', 64, 102, 30, '#263238', 'center');
  text(c, '0.03% 이상 운행 금지', 64, 158, 11, '#263238', 'center');
});
const safetyTex = painted('bdSafety', 192, 64, (c) => {
  c.fillStyle = '#1b5e20';
  c.fillRect(0, 0, 192, 64);
  text(c, '오늘도 안전 운행', 96, 22, 18, '#ffffff', 'center');
  text(c, '무사고 312일째', 96, 46, 14, '#c8e6c9', 'center');
});

function dispatchWindow(g: THREE.Group, out: Built) {
  const F = BD.DW;
  const WALL = '#cfd8dc';
  const fz = F.face - 0.06;
  // The grey facade with the window cut in it, the booth behind (its desk, the dispatch screen, the mic).
  part(g, rbox(0.2, 2.5, 0.12, 0.01), WALL, -0.9, 1.25, fz);
  part(g, rbox(0.8, 2.5, 0.12, 0.01), WALL, 0.6, 1.25, fz);
  part(g, rbox(1.0, 1.08, 0.12, 0.01), WALL, -0.3, 0.54, fz);
  part(g, rbox(1.0, 0.55, 0.12, 0.01), WALL, -0.3, 2.225, fz);
  part(g, box(1.0, 0.87, 0.02), '#eceff1', -0.3, 1.515, -0.46, { outline: false });
  part(g, box(1.0, 0.04, 0.2), '#8d6e63', -0.3, 1.08, -0.36, { outline: false });
  const scr = picture(g, dispatchScreen, 0.36, 0.24, -0.5, 1.42, -0.44);
  part(g, rbox(0.4, 0.28, 0.02, 0.01), '#212121', -0.5, 1.42, -0.452);
  rod(g, v3(-0.08, 1.1, -0.38), v3(-0.02, 1.32, -0.3), 0.006, '#424242');
  part(g, ball(0.025), '#212121', -0.02, 1.33, -0.29);
  part(g, rbox(0.12, 0.08, 0.08, 0.01), '#37474f', 0.05, 1.14, -0.38);
  out.screen = scr;
  // The window's aluminium frame and the sliding pane half shut, the talk-through grille.
  for (const [x, y, w, h] of [[-0.3, 1.08, 1.02, 0.04], [-0.3, 1.95, 1.02, 0.04], [-0.8, 1.515, 0.04, 0.9], [0.2, 1.515, 0.04, 0.9]] as Array<[number, number, number, number]>) part(g, box(w, h, 0.06), '#b0bec5', x, y, F.face - 0.02);
  const paneMat = new THREE.MeshToonMaterial({ color: '#d7f1fb', transparent: true, opacity: 0.3, depthWrite: false, gradientMap: gradient });
  const pane = new THREE.Mesh(box(0.5, 0.84, 0.015), paneMat);
  pane.userData.ownMaterial = true;
  pane.position.set(-0.05, 1.515, F.face - 0.03);
  pane.renderOrder = 2;
  g.add(pane);
  part(g, cyl(0.06, 0.06, 0.01, 16), '#9e9e9e', -0.05, 1.45, F.face - 0.02, { rx: Math.PI / 2 });
  label(g, '배차실', 0.6, 0.18, -0.3, 2.18, F.face + 0.005, '#0d47a1', '#ffffff');
  // The counter outside the window.
  part(g, rbox(1.1, 0.04, F.ledgeZ[1] - F.ledgeZ[0] + 0.04, 0.01), STEEL, -0.3, F.ledge - 0.02, (F.ledgeZ[0] + F.ledgeZ[1]) / 2);
  for (const x of [-0.75, 0.15]) rod(g, v3(x, F.ledge - 0.04, F.ledgeZ[1] - 0.04), v3(x, F.ledge - 0.3, F.face - 0.02), 0.012, '#90a4ae');
  // The breathalyser: its base unit with the screen and the coiled cord to the wand on its clip.
  const [ux, uy, uz] = BD.DW_BREATH.unit;
  part(g, rbox(0.2, 0.1, 0.18, 0.02), '#eceff1', ux, uy + 0.05, uz);
  part(g, box(0.2, 0.02, 0.18), '#1565c0', ux, uy + 0.085, uz, { outline: false });
  const breathScreen = swapScreen(g, breathScreens, 0.12, 0.06, ...BD.DW_BREATH.screen, 0, -0.5);
  part(g, rbox(0.03, 0.06, 0.03, 0.008), '#9e9e9e', BD.DW_BREATH.clip[0], BD.DW_BREATH.clip[1] - 0.06, BD.DW_BREATH.clip[2]);
  label(g, '음주측정', 0.14, 0.035, ux, uy + 0.03, uz + 0.092, '#1565c0', '#ffffff');
  part(g, rbox(0.08, 0.05, 0.06, 0.01), '#ffffff', ux - 0.16, uy + 0.025, uz + 0.02);
  label(g, '마우스피스', 0.07, 0.02, ux - 0.16, uy + 0.03, uz + 0.051, '#ffffff', '#1565c0');
  const wand = (parent: THREE.Object3D) => {
    const w = group(parent);
    part(w, rbox(0.045, 0.17, 0.035, 0.012), '#37474f', 0, 0, 0);
    part(w, cyl(0.007, 0.007, 0.06, 8), '#ffffff', 0, 0.11, 0, { outline: false });
    part(w, box(0.03, 0.02, 0.004), '#80deea', 0, 0.03, 0.019, { outline: false });
    return w;
  };
  const onClip = wand(g);
  onClip.position.set(BD.DW_BREATH.clip[0], BD.DW_BREATH.clip[1], BD.DW_BREATH.clip[2]);
  const heldWand = loose(g);
  wand(heldWand);
  const cord = hose(g, 0.006, '#212121', 5);
  const cordFrom = v3(ux + 0.08, uy + 0.04, uz);
  // The 운행 일지 open on the counter, its pen on a chain; the stamp and its red pad.
  const [bkx, bky, bkz] = BD.DW_BOOK;
  part(g, rbox(0.38, 0.016, 0.27, 0.006), '#1a237e', bkx, bky, bkz);
  picture(g, logPage, 0.36, 0.24, bkx, bky + 0.01, bkz, '#ffffff', 0, -Math.PI / 2);
  const leaf = group(g, bkx, bky + 0.012, bkz);
  const leafPage = picture(leaf, logPage, 0.18, 0.24, -0.09, 0, 0, '#f5f5f5', 0, -Math.PI / 2);
  (leafPage.material as THREE.Material).side = THREE.DoubleSide;
  const stamped = decal(g, stampTex, 0.06, 0.06, bkx - 0.08, bky + 0.013, bkz + 0.06, 0, -Math.PI / 2);
  const restPen = pen(g);
  restPen.position.set(bkx + 0.2, bky + 0.01, bkz);
  restPen.rotation.set(Math.PI / 2, 0.2, 0);
  const heldPen = pen(loose(g));
  const chain = limb(g, 0.002, '#9e9e9e');
  const chainAnchor = v3(bkx + 0.22, bky + 0.01, bkz - 0.12);
  part(g, rbox(0.1, 0.02, 0.07, 0.008), '#b71c1c', BD.DW_PAD[0], BD.DW_PAD[1] + 0.01, BD.DW_PAD[2]);
  const stampMesh = (parent: THREE.Object3D) => {
    const s = group(parent);
    part(s, cyl(0.02, 0.02, 0.025, 12), '#5d4037', 0, -0.03, 0);
    part(s, cyl(0.01, 0.014, 0.06, 10), '#8d6e63', 0, 0.01, 0);
    return s;
  };
  const restStamp = stampMesh(g);
  restStamp.position.set(BD.DW_PAD[0] + 0.08, BD.DW_PAD[1] + 0.045, BD.DW_PAD[2]);
  const heldStamp = loose(g);
  stampMesh(heldStamp);
  // On the right: the poster, the 출근부 rack of time cards, the safety banner, the clock.
  picture(g, posterTex, 0.34, 0.47, 0.42, 1.55, fz + 0.065);
  picture(g, safetyTex, 0.52, 0.17, 0.62, 2.05, fz + 0.065);
  part(g, rbox(0.3, 0.42, 0.04, 0.01), '#8d6e63', 0.78, 1.25, fz + 0.08);
  for (let i = 0; i < 6; i++) part(g, box(0.06, 0.12, 0.005), i === 2 ? '#fff9c4' : '#ffffff', 0.68 + (i % 3) * 0.1, 1.38 - Math.floor(i / 3) * 0.2, fz + 0.104, { outline: false });
  label(g, '출근부', 0.18, 0.05, 0.78, 1.5, fz + 0.102, '#8d6e63', '#ffffff');
  part(g, cyl(0.12, 0.12, 0.03, 24), '#ffffff', 0.12, 2.25, fz + 0.075, { rx: Math.PI / 2 });
  part(g, box(0.005, 0.08, 0.004), '#212121', 0.12, 2.28, fz + 0.093, { outline: false });
  part(g, box(0.06, 0.005, 0.004), '#212121', 0.15, 2.25, fz + 0.093, { outline: false });
  const breath = use(g, 'bdBreath', BD.DW_SPOTS.breath.x, BD.DW_SPOTS.breath.z);
  const log = use(g, 'bdLog', BD.DW_SPOTS.log.x, BD.DW_SPOTS.log.z);
  const meet = spot(g, 'stand', BD.DW_SPOTS.meet.x, 0, BD.DW_SPOTS.meet.z, 0);
  meet.motion = 'gesture';
  meet.work = marker(g, BD.DW_SPOTS.meet.x, 1.2, BD.DW_SPOTS.meet.z + 0.6);
  out.work = log.work;
  out.spots = { bdBreathTest: breath.s, bdSignLog: log.s, busDriver_driverSafetyMeeting: meet, '*': log.s };
  out.away = (_o, t) => {
    const br = run(breath, t);
    const bs = br ? BD.breathAt(t, br.ph) : null;
    onClip.visible = bs?.wand !== 'held';
    placeAt(heldWand, bs?.wand === 'held' ? br!.h.tool : undefined, (br?.yaw ?? 0) + Math.PI, bs?.screen === 'blow' ? 1.15 : -0.3);
    breathScreen(!bs ? 0 : bs.screen === 'blow' ? 1 : bs.screen === 'ok' ? 2 : 0);
    cord(cordFrom, bs?.wand === 'held' && br?.h.tool ? br.h.tool : v3(...BD.DW_BREATH.clip).add(v3(0, -0.08, 0)), 0.15);
    const lg = br ? null : run(log, t);
    const ls = lg ? BD.logAt(t, lg.ph) : null;
    leaf.rotation.z = ls ? Math.PI * (1 - ls.page) : 0;
    leaf.visible = !!ls && ls.page < 1;
    stamped.visible = !!ls?.stamped;
    placeAt(heldPen, ls?.writing ? lg!.h.tool : undefined, lg?.yaw ?? 0);
    restPen.visible = !ls?.writing;
    chain(chainAnchor, ls?.writing && lg?.h.tool ? lg.h.tool : restPen.position);
    const stamping = ls?.stamp === 'held';
    restStamp.visible = !stamping;
    placeAt(heldStamp, stamping ? lg!.h.tool : undefined, lg?.yaw ?? 0);
  };
}

function cngPump(g: THREE.Group, out: Built) {
  const C = BD.CP;
  // The island and its edge stripes, the bollards, the extinguisher.
  part(g, rbox(0.95, C.slab, 0.72, 0.02), '#bdbdbd', 0, C.slab / 2, -0.14);
  const stripe = painted('bdHazard', 128, 16, (c) => {
    for (let i = 0; i < 16; i++) {
      c.fillStyle = i % 2 ? '#212121' : '#fdd835';
      c.beginPath();
      c.moveTo(i * 8, 16);
      c.lineTo(i * 8 + 8, 0);
      c.lineTo(i * 8 + 16, 0);
      c.lineTo(i * 8 + 8, 16);
      c.fill();
    }
  });
  picture(g, stripe, 0.95, 0.1, 0, C.slab / 2, 0.221);
  for (const sx of [-1, 1]) {
    part(g, cyl(0.06, 0.06, 0.9, 14), YELLOW, sx * 0.42, C.slab + 0.45, -0.42);
    part(g, cyl(0.062, 0.062, 0.06, 14), '#212121', sx * 0.42, C.slab + 0.7, -0.42, { outline: false });
  }
  part(g, cyl(0.07, 0.07, 0.36, 14), '#d32f2f', -0.38, C.slab + 0.18, -0.2);
  part(g, cyl(0.02, 0.02, 0.06, 8), '#212121', -0.38, C.slab + 0.39, -0.2);
  // The dispenser: white with its blue CNG crown, the gauge and the screen, the buttons, the signs.
  const cab = C.cab;
  part(g, rbox(cab.w, cab.h, cab.d, 0.04), '#f5f5f5', 0, C.slab + cab.h / 2, cab.z);
  part(g, rbox(cab.w + 0.06, 0.22, cab.d + 0.06, 0.04), '#1565c0', 0, C.slab + cab.h + 0.1, cab.z);
  label(g, '천연가스 CNG', 0.5, 0.12, 0, C.slab + cab.h + 0.1, cab.z + cab.d / 2 + 0.032, '#1565c0', '#ffffff');
  const fz = cab.z + cab.d / 2 + 0.002;
  part(g, cyl(0.1, 0.1, 0.03, 24), '#eceff1', C.gauge[0], C.gauge[1], fz, { rx: Math.PI / 2 });
  const dial = painted('bdCngDial', 128, 128, (c) => {
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(64, 64, 62, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#263238';
    c.lineWidth = 3;
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI * (0.75 + 1.5 * (i / 10));
      c.beginPath();
      c.moveTo(64 + Math.cos(a) * 50, 64 + Math.sin(a) * 50);
      c.lineTo(64 + Math.cos(a) * 58, 64 + Math.sin(a) * 58);
      c.stroke();
    }
    c.strokeStyle = '#e53935';
    c.lineWidth = 6;
    c.beginPath();
    c.arc(64, 64, 54, Math.PI * 1.95, Math.PI * 2.25);
    c.stroke();
    text(c, 'bar', 64, 92, 16, '#263238', 'center');
    text(c, '0', 30, 102, 12, '#263238', 'center', false);
    text(c, '250', 100, 102, 12, '#263238', 'center', false);
  });
  picture(g, dial, 0.18, 0.18, C.gauge[0], C.gauge[1], fz + 0.017);
  const needle = group(g, C.gauge[0], C.gauge[1], fz + 0.02);
  part(needle, box(0.006, 0.075, 0.004), '#e53935', 0, 0.035, 0, { outline: false });
  const screens = [
    painted('bdCngScr0', 128, 64, (c) => {
      c.fillStyle = '#0d1b2a';
      c.fillRect(0, 0, 128, 64);
      text(c, '대기', 64, 22, 16, '#90caf9', 'center');
      text(c, '0.00 m³', 64, 46, 16, '#90caf9', 'center');
    }),
    ...[0.25, 0.5, 0.75, 1].map((f) =>
      painted(`bdCngScr|${f}`, 128, 64, (c) => {
        c.fillStyle = '#0d1b2a';
        c.fillRect(0, 0, 128, 64);
        text(c, f < 1 ? '충전 중' : '충전 완료', 64, 22, 16, f < 1 ? '#ffe082' : '#69f0ae', 'center');
        text(c, `${(f * 142).toFixed(1)} m³`, 64, 46, 16, '#ffffff', 'center');
      }),
    ),
  ];
  const showScreen = swapScreen(g, screens, 0.2, 0.1, 0.1, 1.38, fz + 0.002);
  part(g, rbox(0.22, 0.12, 0.01, 0.01), '#212121', 0.1, 1.38, fz - 0.002);
  part(g, cyl(0.025, 0.025, 0.02, 12), '#43a047', ...C.green, { rx: Math.PI / 2 });
  part(g, cyl(0.025, 0.025, 0.02, 12), '#e53935', ...C.red, { rx: Math.PI / 2 });
  label(g, '시작', 0.06, 0.025, C.green[0], C.green[1] - 0.05, fz + 0.002, '#f5f5f5', '#2e7d32');
  label(g, '정지', 0.06, 0.025, C.red[0], C.red[1] - 0.05, fz + 0.002, '#f5f5f5', '#c62828');
  label(g, '화기엄금 · 충전 중 시동 OFF', 0.42, 0.06, 0, 0.75, fz + 0.002, '#c62828', '#ffffff');
  // The 정전기 패드 on its post at the front.
  const [px, py, pz] = C.pad;
  part(g, cyl(0.025, 0.025, py - C.slab, 8), '#9e9e9e', px, (py + C.slab) / 2 - 0.05, pz - 0.03);
  part(g, rbox(0.12, 0.1, 0.03, 0.01), '#fdd835', px, py, pz - 0.015);
  const padGlow = glowing(g, box(0.08, 0.06, 0.004), '#ffffff', px, py, pz + 0.002);
  label(g, '정전기 제거', 0.12, 0.03, px, py - 0.09, pz - 0.0, '#fdd835', '#212121');
  // The holster on the right side, the nozzle (on it, in the hand, or clipped to the bus), the hose.
  const [hx, hy, hz] = C.holster;
  part(g, rbox(0.05, 0.12, 0.08, 0.01), '#616161', hx - 0.01, hy - 0.04, hz);
  const nozzle = (parent: THREE.Object3D) => {
    const n = group(parent);
    part(n, rbox(0.05, 0.05, 0.2, 0.015), '#212121', 0, 0, 0.04);
    part(n, cyl(0.022, 0.022, 0.06, 12), '#9e9e9e', 0, 0, 0.16, { rx: Math.PI / 2 });
    part(n, rbox(0.012, 0.08, 0.03, 0.005), '#e53935', 0, 0.05, 0.0, { rx: -0.4 });
    return n;
  };
  const restN = nozzle(g);
  restN.position.set(hx + 0.01, hy + 0.04, hz);
  restN.rotation.set(Math.PI / 2, 0, 0);
  const movedN = loose(g);
  nozzle(movedN);
  const hoseLine = hose(g, 0.02, '#212121', 5);
  const outlet = v3(...C.outlet);
  part(g, cyl(0.03, 0.03, 0.08, 10), '#616161', outlet.x, outlet.y + 0.02, outlet.z);
  const recept = v3(...C.recept);
  const u = use(g, 'bdFuel', BD.CP_SPOT.x, BD.CP_SPOT.z);
  out.work = u.work;
  out.spots = { '*': u.s };
  out.away = (_o, t) => {
    const r = run(u, t);
    const s = r ? BD.fuelAt(t, r.ph) : null;
    restN.visible = !s || s.nozzle === 'holster';
    let end: THREE.Vector3;
    if (s?.nozzle === 'clipped') {
      placeAt(movedN, recept.clone().add(v3(0, 0, -0.2)), 0, 0);
      end = recept.clone().add(v3(0, 0, -0.2));
    } else if (s?.nozzle === 'held' && r?.h.item) {
      placeAt(movedN, r.h.item, r.yaw, 0.2);
      end = r.h.item.clone();
    } else {
      movedN.visible = false;
      end = v3(hx + 0.01, hy + 0.1, hz);
    }
    hoseLine(outlet, end, restN.visible ? 0.3 : 0.5);
    // The dial's 0 at its lower left, 250 bar at its lower right (painted clockwise); filled to 200.
    const A = Math.PI * (0.75 + 1.5 * 0.8 * (s?.fill ?? 0));
    needle.rotation.z = -(A + Math.PI / 2);
    showScreen(!s || s.fill <= 0 ? 0 : Math.min(4, 1 + Math.floor(s.fill * 3.99)));
    padGlow.visible = !!s?.pad;
  };
}

const ledgerTex = painted('bdLostLedger', 96, 128, (c) => {
  c.fillStyle = '#fafafa';
  c.fillRect(0, 0, 96, 128);
  text(c, '분실물 접수 대장', 48, 11, 10, '#263238', 'center');
  c.strokeStyle = '#b0bec5';
  for (let i = 0; i < 8; i++) {
    c.beginPath();
    c.moveTo(4, 22 + i * 13);
    c.lineTo(92, 22 + i * 13);
    c.stroke();
  }
  [['10/25', '우산', '147'], ['10/26', '휴대폰', '2115'], ['10/26', '지갑', '147']].forEach(([d, w, r], i) => {
    text(c, d, 6, 29 + i * 13, 8, '#1565c0', 'left', false);
    text(c, w, 40, 29 + i * 13, 8, '#1565c0', 'left', false);
    text(c, r, 72, 29 + i * 13, 8, '#1565c0', 'left', false);
  });
});
const tagTex = painted('bdLostTag', 48, 64, (c) => {
  c.clearRect(0, 0, 48, 64);
  c.fillStyle = '#ffe0b2';
  c.beginPath();
  c.moveTo(10, 0);
  c.lineTo(38, 0);
  c.lineTo(48, 12);
  c.lineTo(48, 64);
  c.lineTo(0, 64);
  c.lineTo(0, 12);
  c.closePath();
  c.fill();
  text(c, '147', 24, 30, 12, '#bf360c', 'center');
  text(c, '10/27', 24, 48, 10, '#5d4037', 'center', false);
});
/** A found thing: a phone in a zip bag, a wallet, a cap. */
function foundThing(parent: THREE.Object3D, kind: number): THREE.Group {
  const g = group(parent);
  if (kind === 0) {
    part(g, rbox(0.075, 0.012, 0.15, 0.01), '#212121', 0, 0, 0);
    part(g, box(0.065, 0.002, 0.13), '#4fc3f7', 0, 0.007, 0, { outline: false });
    const bag = new THREE.Mesh(box(0.11, 0.03, 0.2), new THREE.MeshToonMaterial({ color: '#e3f2fd', transparent: true, opacity: 0.35, depthWrite: false, gradientMap: gradient }));
    bag.userData.ownMaterial = true;
    g.add(bag);
  } else if (kind === 1) {
    part(g, rbox(0.11, 0.025, 0.09, 0.01), '#6d4c41', 0, 0, 0);
    part(g, box(0.1, 0.004, 0.01), '#4e342e', 0, 0.012, 0.03, { outline: false });
  } else {
    part(g, ball(0.08), '#c62828', 0, 0, 0).scale.set(1, 0.6, 1);
    part(g, rbox(0.13, 0.01, 0.08, 0.005), '#b71c1c', 0, -0.02, 0.08);
  }
  const tag = decal(g, tagTex, 0.04, 0.055, 0.05, 0.03, 0.0, 0, -Math.PI / 2);
  tag.name = 'tag';
  return g;
}

function lostFound(g: THREE.Group, out: Built) {
  const F = BD.LF;
  const zc = (F.front + F.back) / 2;
  const d = F.front - F.back;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.04, 1.84, 0.04), '#78909c', sx * 0.9, 0.92, zc + sz * (d / 2 - 0.02));
  for (const y of F.levels) part(g, rbox(1.82, 0.025, d, 0.006), '#cfd8dc', 0, y, zc);
  label(g, '분실물 보관함', 0.9, 0.16, 0, 1.96, zc, '#e65100', '#ffffff');
  // The bins with their labels.
  const bins: Array<[number, number, string, string]> = [
    [-0.45, 1.34, '전자기기', '#90caf9'], [0.22, 1.34, '지갑·카드', '#ffcc80'], [0.62, 1.34, '귀중품', '#ef9a9a'],
    [0.22, 0.92, '책·서류', '#c5e1a5'], [0.62, 0.92, '모자·장갑', '#ce93d8'],
    [-0.62, 0.5, '가방', '#b0bec5'], [-0.2, 0.5, '의류', '#b0bec5'], [0.22, 0.5, '기타', '#b0bec5'], [0.62, 0.5, '기타', '#b0bec5'],
  ];
  for (const [x, y, s, col] of bins) {
    part(g, box(0.34, 0.07, 0.36), col, x, y + 0.05, zc - 0.01);
    label(g, s, 0.2, 0.045, x, y + 0.05, F.front + 0.002, '#ffffff', '#37474f');
  }
  // What's waiting on the shelves already: a backpack, a teddy, a scarf, a tumbler, a book, umbrellas.
  part(g, rbox(0.26, 0.32, 0.18, 0.06), '#455a64', -0.62, 0.68, zc - 0.03);
  part(g, rbox(0.18, 0.12, 0.04, 0.03), '#37474f', -0.62, 0.62, zc + 0.08);
  part(g, ball(0.08), '#a1887f', 0.22, 0.68, zc);
  part(g, ball(0.055), '#a1887f', 0.22, 0.8, zc);
  for (const sx of [-1, 1]) part(g, ball(0.025), '#a1887f', 0.22 + sx * 0.045, 0.85, zc);
  part(g, rbox(0.28, 0.06, 0.2, 0.03), '#ad1457', -0.2, 0.55, zc);
  part(g, cyl(0.035, 0.035, 0.18, 12), '#26a69a', 0.62, 0.6, zc);
  part(g, rbox(0.18, 0.04, 0.24, 0.006), '#5c6bc0', 0.22, 0.95, zc);
  part(g, cyl(0.12, 0.1, 0.3, 14), '#78909c', 0.62, 0.23, zc + 0.02);
  for (let i = 0; i < 4; i++) {
    const um = group(g, 0.58 + (i % 2) * 0.07, 0.1, zc + (i < 2 ? -0.02 : 0.06));
    um.rotation.z = (i - 1.5) * 0.08;
    part(um, cyl(0.03, 0.015, 0.6, 8), ['#212121', '#1565c0', '#c62828', '#f9a825'][i], 0, 0.3, 0);
    part(um, cyl(0.006, 0.006, 0.15, 6), '#8d6e63', 0, 0.66, 0);
  }
  for (let i = 0; i < 3; i++) {
    const p = foundThing(g, 0);
    p.position.set(-0.55 + i * 0.12, 1.37, zc);
  }
  // The 접수 tray, the ledger and its pen, the notice on the side.
  const [tx, ty, tz] = F.tray;
  part(g, rbox(0.32, 0.04, 0.26, 0.01), '#1e88e5', tx, ty + 0.02, tz);
  label(g, '접수', 0.12, 0.04, tx, ty + 0.025, tz + 0.132, '#1e88e5', '#ffffff');
  part(g, rbox(0.2, 0.012, 0.26, 0.006), '#8d6e63', F.ledger[0], F.ledger[1], F.ledger[2]);
  picture(g, ledgerTex, 0.17, 0.22, F.ledger[0], F.ledger[1] + 0.008, F.ledger[2], '#ffffff', 0, -Math.PI / 2);
  const restPen = pen(g);
  restPen.position.set(F.ledger[0] + 0.12, F.ledger[1] + 0.006, F.ledger[2]);
  restPen.rotation.set(Math.PI / 2, 0.2, 0);
  const heldPen = pen(loose(g));
  label(g, '보관 7일 후 경찰서 인계', 0.42, 0.05, -0.62, 1.68, F.front, '#fff8e1', '#5d4037');
  // This round's find: on the tray, in the hands, in its bin.
  const kinds = [0, 1, 2].map((k) => {
    const tray = foundThing(g, k);
    tray.position.set(tx, ty + 0.05, tz);
    const heldG = loose(g);
    const held = foundThing(heldG, k);
    const shelf = foundThing(g, k);
    return { tray, heldG, held, shelf };
  });
  const u = use(g, 'bdLost', BD.LF_SPOT.x, BD.LF_SPOT.z);
  out.work = u.work;
  out.spots = { '*': u.s };
  out.away = (_o, t) => {
    const r = run(u, t);
    const s = r ? BD.lostAt(t, r.ph) : null;
    const k = s ? ((s.n % 3) + 3) % 3 : -1;
    kinds.forEach((K, i) => {
      const mine = i === k;
      K.tray.visible = !s ? i === 0 : mine && s.item === 'tray';
      placeAt(K.heldG, mine && s?.item === 'held' ? r!.h.item : undefined, (r?.yaw ?? 0) + Math.PI);
      K.shelf.visible = mine && s?.item === 'shelf';
      if (K.shelf.visible) {
        const [sx, sy] = BD.lostSlot(s!.n);
        K.shelf.position.set(sx, sy + 0.11, -0.22);
      }
      const tagOn = mine && !!s?.tagged;
      for (const m of [K.tray, K.held, K.shelf]) m.getObjectByName('tag')!.visible = tagOn || m === K.shelf;
    });
    placeAt(heldPen, s?.writing ? r!.h.tool : undefined, r?.yaw ?? 0);
    restPen.visible = !s?.writing;
  };
}

function anmagi(g: THREE.Group, out: Built) {
  const SHELL = '#efe7dc';
  const LEATHER = '#5d4037';
  const chair = group(g);
  // The plinth, the seat, the reclined back in its shell with the hood, the arm cuffs, the leg rest.
  part(chair, rbox(0.66, 0.26, 0.74, 0.08), SHELL, 0, 0.13, -0.05);
  part(chair, rbox(0.5, 0.14, 0.52, 0.06), LEATHER, 0, 0.43, -0.04);
  const back = group(chair, 0, 0.5, -0.3);
  back.rotation.x = -0.32;
  part(back, rbox(0.5, 0.82, 0.14, 0.07), LEATHER, 0, 0.42, 0);
  part(back, rbox(0.7, 1.0, 0.2, 0.1), SHELL, 0, 0.45, -0.12);
  part(back, rbox(0.64, 0.24, 0.36, 0.1), SHELL, 0, 0.92, 0.04);
  for (let i = 0; i < 4; i++) part(back, rbox(0.36, 0.05, 0.03, 0.02), '#4e342e', 0, 0.18 + i * 0.16, 0.075, { outline: false });
  for (const sx of [-1, 1]) {
    part(chair, rbox(0.14, 0.24, 0.6, 0.06), SHELL, sx * 0.32, 0.6, -0.02);
    part(chair, rbox(0.06, 0.12, 0.5, 0.04), LEATHER, sx * 0.25, 0.62, -0.0);
  }
  const legs = group(chair, 0, 0.36, 0.2);
  legs.rotation.x = 0.85;
  part(legs, rbox(0.46, 0.14, 0.5, 0.06), SHELL, 0, 0, 0.25);
  for (const sx of [-1, 1]) part(legs, rbox(0.16, 0.06, 0.44, 0.04), LEATHER, sx * 0.11, 0.08, 0.25);
  // The remote on its cord, the lights down the side, the brand-less badge and a paper cup on the arm.
  part(chair, rbox(0.05, 0.02, 0.12, 0.01), '#212121', -0.36, 0.74, 0.15);
  rod(chair, v3(-0.36, 0.73, 0.09), v3(-0.38, 0.6, -0.1), 0.004, '#212121');
  const lights = new THREE.Group();
  chair.add(lights);
  for (const sx of [-1, 1]) glowing(lights, box(0.01, 0.02, 0.5), '#4fc3f7', sx * 0.395, 0.5, -0.02);
  glowing(lights, box(0.2, 0.01, 0.01), '#4fc3f7', 0, 1.36, -0.3);
  out.inUse = lights;
  part(chair, cyl(0.03, 0.025, 0.08, 10), '#ffffff', 0.33, 0.76, 0.18);
  part(chair, cyl(0.031, 0.031, 0.02, 10), '#d84315', 0.33, 0.75, 0.18, { outline: false });
  label(g, '기사님 휴식 · 15분', 0.36, 0.07, 0.0, 0.2, 0.33, '#4e342e', '#ffffff');
  const s = spot(g, 'sit', 0, 0.5, -0.04, 0, 0.5);
  s.motion = 'bdRest';
  s.work = marker(g, 0, 0.8, 0.25);
  out.work = s.work;
  out.spots = { '*': s };
  // A low hum through the shell while it's working.
  out.animate = (t) => {
    chair.position.y = 0.0015 * Math.sin(t * 55);
    back.children.forEach((c, i) => {
      if (i >= 3) c.position.y = 0.18 + (i - 3) * 0.16 + 0.03 * Math.sin(t * 2 - i);
    });
  };
}

function tyreRack(g: THREE.Group) {
  const RACK = '#455a64';
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.05, 1.9, 0.05), RACK, sx * 0.92, 0.95, sz * 0.22);
  for (const y of [0.04, 0.98]) for (const sz of [-1, 1]) part(g, box(1.88, 0.05, 0.05), RACK, 0, y, sz * 0.16);
  const tyre = (x: number, y: number, z: number, flat = false) => {
    const t = group(g, x, y, z);
    if (flat) t.rotation.z = Math.PI / 2;
    part(t, cyl(0.44, 0.44, 0.27, 24), '#212121', 0, 0, 0, { rz: Math.PI / 2 });
    part(t, cyl(0.25, 0.25, 0.275, 18), '#37474f', 0, 0, 0, { rz: Math.PI / 2, outline: false });
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5;
      part(t, box(0.28, 0.04, 0.03), '#2b2b2b', 0, Math.cos(a) * 0.44, Math.sin(a) * 0.44, { rx: a, outline: false });
    }
  };
  for (let i = 0; i < 5; i++) tyre(-0.72 + i * 0.29, 0.5, 0);
  for (let i = 0; i < 3; i++) tyre(-0.58 + i * 0.29, 1.44, 0);
  label(g, '버스 타이어 보관 · 교체일 확인', 0.9, 0.09, 0, 1.95, 0.23, '#455a64', '#ffffff');
  part(g, rbox(0.18, 0.06, 0.04, 0.01), '#9e9e9e', 0.6, 1.4, 0.25);
  part(g, cyl(0.04, 0.04, 0.02, 14), '#eceff1', 0.6, 1.3, 0.26, { rx: Math.PI / 2 });
  part(g, cyl(0.26, 0.26, 0.14, 20), '#cfd8dc', 0.58, 1.18, 0.08, { rz: Math.PI / 2 });
}

const bisTex = (page: number) =>
  ledTex(`bis|${page}`, 512, 96, (c) => {
    const rows = page === 0 ? [['147', '서울역', '곧 도착'], ['2115', '석계역', '3분']] : [['147', '서울역', '12분'], ['2115', '석계역', '15분']];
    rows.forEach(([r, d, w], i) => {
      text(c, r, 14, 26 + i * 44, 32, i === 0 ? '#64b5f6' : '#81c784', 'left');
      text(c, d, 200, 26 + i * 44, 28, LED, 'center');
      text(c, w, 500, 26 + i * 44, 28, '#ff5252', 'right');
    });
  });
const adTex = painted('bdAd', 128, 256, (c) => {
  const gr = c.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#80deea');
  gr.addColorStop(1, '#00838f');
  c.fillStyle = gr;
  c.fillRect(0, 0, 128, 256);
  text(c, '대중교통', 64, 60, 22, '#ffffff', 'center');
  text(c, '이용하면', 64, 92, 22, '#ffffff', 'center');
  text(c, '하늘이', 64, 140, 26, '#fffde7', 'center');
  text(c, '맑아져요', 64, 172, 26, '#fffde7', 'center');
  text(c, '중랑구', 64, 230, 14, '#e0f7fa', 'center', false);
});
const stopSignTex = painted('bdStopSign', 128, 128, (c) => {
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.arc(64, 64, 62, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#1f6fd0';
  c.beginPath();
  c.arc(64, 64, 54, 0, Math.PI * 2);
  c.fill();
  text(c, '🚌', 64, 58, 44, '#ffffff', 'center', false);
  text(c, '정류장', 64, 100, 16, '#ffffff', 'center');
});

function busStop(g: THREE.Group, out: Built) {
  const FRAME = '#455a64';
  // The shelter: its posts, the glass back, the roof, the bench; the BIS screen under the roof's edge.
  for (const sx of [-1, 1]) part(g, rbox(0.06, 2.3, 0.06, 0.01), FRAME, sx * 0.95, 1.15, -0.38);
  part(g, rbox(2.1, 0.08, 0.95, 0.02), '#eceff1', 0, 2.34, -0.05);
  part(g, rbox(2.1, 0.03, 0.95, 0.01), '#1f6fd0', 0, 2.29, -0.05);
  const glassMat = new THREE.MeshToonMaterial({ color: '#d7f1fb', transparent: true, opacity: 0.28, depthWrite: false, gradientMap: gradient });
  const back = new THREE.Mesh(box(1.84, 1.9, 0.02), glassMat);
  back.userData.ownMaterial = true;
  back.position.set(0, 1.2, -0.38);
  back.renderOrder = 2;
  g.add(back);
  part(g, box(1.84, 0.03, 0.03), FRAME, 0, 0.25, -0.38);
  part(g, box(1.84, 0.03, 0.03), FRAME, 0, 2.15, -0.38);
  part(g, rbox(1.4, 0.05, 0.34, 0.02), '#8d6e63', -0.15, 0.45, -0.18);
  for (const x of [-0.75, 0.45]) part(g, box(0.04, 0.43, 0.3), FRAME, x, 0.21, -0.18);
  part(g, rbox(1.04, 0.26, 0.08, 0.02), '#212121', 0, 2.12, 0.3);
  rod(g, v3(-0.4, 2.3, 0.3), v3(-0.4, 2.25, 0.3), 0.01, FRAME);
  rod(g, v3(0.4, 2.3, 0.3), v3(0.4, 2.25, 0.3), 0.01, FRAME);
  const bis = swapScreen(g, [bisTex(0), bisTex(1)], 0.98, 0.2, 0, 2.12, 0.342);
  label(g, '중랑공영차고지 (종점)', 0.9, 0.11, 0, 2.38, 0.43, '#1f6fd0', '#ffffff');
  // The ad panel at the right end, lit.
  part(g, rbox(0.08, 1.5, 0.7, 0.02), '#cfd8dc', 0.98, 1.05, -0.05);
  picture(g, adTex, 0.6, 1.3, 1.025, 1.05, -0.05, '#ffffff', Math.PI / 2);
  // The stop's sign on its pole at the left, the routes under it; a bin.
  part(g, cyl(0.035, 0.035, 2.6, 10), '#90a4ae', -1.12, 1.3, 0.35);
  picture(g, stopSignTex, 0.5, 0.5, -1.12, 2.45, 0.39);
  picture(g, stopSignTex, 0.5, 0.5, -1.12, 2.45, 0.31, '#ffffff', Math.PI);
  label(g, '147', 0.3, 0.12, -1.12, 1.95, 0.39, '#1f6fd0', '#ffffff');
  label(g, '2115', 0.3, 0.12, -1.12, 1.8, 0.39, '#33a04f', '#ffffff');
  part(g, cyl(0.16, 0.14, 0.62, 16), '#546e7a', 0.75, 0.31, 0.25);
  part(g, cyl(0.17, 0.17, 0.04, 16), '#37474f', 0.75, 0.63, 0.25);
  out.away = (_o, t) => bis(Math.floor(t / 4) % 2);
}

// =============================================================================================
// The yard (2026-11-04, the layout audit): a corner of a 공영차고지, 80% of which is paved bays.

const NO = { outline: false };
const flatLine = (g: THREE.Object3D, w: number, d: number, x: number, z: number, color: string) => part(g, box(w, 0.004, d), color, x, 0.012, z, NO);

/** 주차 칸 선: white lines between three bays three tiles wide, their numbers at the head of each, the yellow line along the lane. */
function bayLines(g: THREE.Group, W: number, D: number) {
  const x0 = -W / 2;
  const z0 = -D / 2;
  for (let i = 0; i <= 3; i++) flatLine(g, 0.12, D - 1.2, x0 + i * 3, z0 + (D - 1.2) / 2, '#f5f5f5');
  flatLine(g, 9.1, 0.15, x0 + 4.5, z0 + D - 1.2, '#f5f5f5');
  flatLine(g, W, 0.15, 0, z0 + D - 0.1, '#fbc02d');
  for (let i = 0; i < 3; i++) label(g, `${i + 1}`, 0.5, 0.5, x0 + 1.5 + i * 3, 0.014, z0 + D - 1.6, '#55595e', '#f5f5f5').rotation.set(-Math.PI / 2, 0, 0);
}

/** One run of mesh fence: posts every two metres, the rails, the mesh between them (the 청소 차고지's too). */
export function fenceRun(g: THREE.Object3D, x0: number, z0: number, x1: number, z1: number) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  if (len < 0.1) return;
  const along = z0 === z1;
  const n = Math.max(1, Math.round(len / 2));
  for (let i = 0; i <= n; i++) part(g, cyl(0.04, 0.04, 1.8, 8), '#5f7d6a', x0 + ((x1 - x0) * i) / n, 0.9, z0 + ((z1 - z0) * i) / n, NO);
  for (const y of [0.1, 1.75]) part(g, along ? box(len, 0.035, 0.035) : box(0.035, 0.035, len), '#5f7d6a', (x0 + x1) / 2, y, (z0 + z1) / 2, NO);
  const mesh = new THREE.Mesh(along ? box(len, 1.62, 0.01) : box(0.01, 1.62, len), MESH);
  mesh.position.set((x0 + x1) / 2, 0.92, (z0 + z1) / 2);
  mesh.renderOrder = 2;
  g.add(mesh);
}
const MESH = new THREE.MeshToonMaterial({ color: '#6f8f7a', transparent: true, opacity: 0.35, depthWrite: false, gradientMap: gradient });

/**
 * 차고지 울타리·출입문: the mesh fence round the yard (the office's back wall closes the east side lower down), the vehicle gateway
 * the width of the bays and the garage, its folding gate folded back, the guard booth beside it with its barrier arm raised, the
 * depot's made-up name on the gatepost.
 */
function yardFence(g: THREE.Group, W = 26, D = 15) {
  // Placed at the yard's north-west corner tile: its middle is (0.5, 0.5) on the lot.
  const x0 = -0.5;
  const z0 = -0.5;
  const S = D - 0.5;
  const at = (x: number) => x0 + x;
  fenceRun(g, at(0), z0, at(W), z0);
  fenceRun(g, at(0), z0, at(0), S);
  fenceRun(g, at(W), z0, at(W), z0 + 7);
  fenceRun(g, at(15.6), S, at(18), S);
  // The gateway is the whole front of the bays and the garage (x 0..15.4), open for the day's run-out: every bus pulls straight
  // out of its bay onto the street (2026-11-04, the vehicles' way out; before, the front fence, the gate's leaf and the barrier
  // arm stood across their noses). The gateposts at its two ends; the 자바라 folding gate folded up against the west post; its
  // rail along the gateway, flat.
  for (const x of [0.18, 15.42]) part(g, rbox(0.3, 2.0, 0.3, 0.04), '#cfd8dc', at(x), 1.0, S);
  for (let i = 0; i < 9; i++) {
    const zig = i % 2 ? 0.1 : -0.1;
    part(g, box(0.03, 1.55, 0.03), '#78909c', at(0.37 + i * 0.043), 0.85, S + zig, NO);
  }
  part(g, rbox(0.4, 0.06, 0.12, 0.02), '#90a4ae', at(0.54), 1.65, S);
  part(g, rbox(0.4, 0.06, 0.12, 0.02), '#90a4ae', at(0.54), 0.08, S);
  flatLine(g, 15.2, 0.08, at(7.8), S, '#37474f');
  label(g, '한빛 공영차고지', 1.6, 0.34, at(15.42), 2.3, S + 0.2, '#1f6fd0', '#ffffff');
  // The guard booth by the gate: a small glazed box, its window to the gateway; the barrier arm stands raised for the run-out.
  part(g, rbox(1.2, 2.3, 1.2, 0.05), '#eceff1', at(16.2), 1.15, S - 0.75);
  part(g, box(0.9, 0.7, 0.02), '#9ec5d6', at(16.2), 1.5, S - 0.14, NO);
  part(g, box(0.02, 0.7, 0.8), '#9ec5d6', at(15.59), 1.5, S - 0.75, NO);
  part(g, rbox(1.4, 0.12, 1.4, 0.04), '#1f6fd0', at(16.2), 2.36, S - 0.75);
  part(g, rbox(0.3, 0.9, 0.3, 0.04), '#eceff1', at(16.2), 0.45, S + 0.05);
  part(g, box(0.08, 3.2, 0.08), '#e53935', at(16.2), 0.9 + 1.6, S + 0.05);
  for (let i = 0; i < 3; i++) part(g, box(0.085, 0.45, 0.085), '#ffffff', at(16.2), 1.3 + i * 0.95, S + 0.05, NO);
}

/**
 * 정비고: a block wall with a ribbed steel band along its top; the sides end at the open front with a yellow-and-black edge (the
 * shutter's guide). Drawn 2.4 m, not a garage's full height, so it doesn't hide the bus inside (a piece isn't cut away as walls are).
 */
function garageWall(g: THREE.Group, along: 'x' | 'z', len: number, c: string, front: boolean) {
  const h = 2.4;
  const size = (w: number, hh: number, t: number) => (along === 'x' ? box(w, hh, t) : box(t, hh, w));
  part(g, size(len, h, 0.24), c, 0, h / 2, 0);
  part(g, size(len + 0.02, 0.5, 0.26), '#8d9aa3', 0, h - 0.25, 0);
  for (let i = 0; i < len * 4; i++) {
    const u = -len / 2 + (i + 0.5) / 4;
    part(g, along === 'x' ? box(0.03, 0.48, 0.28) : box(0.28, 0.48, 0.03), '#78868f', along === 'x' ? u : 0, h - 0.25, along === 'x' ? 0 : u, NO);
  }
  if (front && along === 'z')
    for (let i = 0; i < 5; i++) part(g, box(0.27, 0.25, 0.06), i % 2 ? '#212121' : '#fbc02d', 0, 0.15 + i * 0.4, len / 2 - 0.04, NO);
}

/** CNG 충전소 캐노피: four steel columns, the flat canopy high over the pump, its blue fascia and the gas warning. */
function cngCanopy(g: THREE.Group, W: number, D: number) {
  const h = 4.6;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.22, h, 0.22), '#b0bec5', sx * (W / 2 - 0.5), h / 2, sz * (D / 2 - 0.5));
  part(g, rbox(W - 0.2, 0.3, D - 0.2, 0.05), '#f5f5f5', 0, h + 0.15, 0);
  part(g, box(W - 0.15, 0.32, 0.04), '#1f6fd0', 0, h + 0.15, D / 2 - 0.1, NO);
  label(g, 'CNG 충전소 · 화기 엄금', 2.2, 0.24, 0, h + 0.15, D / 2 - 0.07, '#1f6fd0', '#ffffff');
  flatLine(g, W - 1.2, 0.1, 0, D / 2 - 0.6, '#fbc02d');
  flatLine(g, W - 1.2, 0.1, 0, -D / 2 + 0.6, '#fbc02d');
}

export const BUILDERS: Record<string, Builder> = {
  /**
   * The city bus (시내버스): a low-floor Seoul bus, its body in the 간선 blue or the 지선 green (by where
   * it's parked; the other one has the other) with the white smile at the front, the black window band,
   * the white roof with the CNG pod and the air-con, the orange LED 행선지 sign (147 서울역, then
   * 중랑차고지 - 서울역), the side and back route numbers, the B/G emblem, the 저상버스 and CNG
   * stickers, the 서울74사 plate, the bug-eye mirrors; the folding glass doors on the right; inside the
   * driver's seat up on its platform, the big flat wheel, the gauges and the 운행기록계, the 현금함 and
   * the 승차 단말기 on its pole, blue rows and orange 교통약자석, poles and straps, the 하차 단말기.
   * 차량 점검 (bdWalkRound): walked round its nose — a tyre rapped with the hammer, crouched; the
   * headlamps come on and are pointed at; the other tyre; the wiper lifted off the glass. 장거리 운행
   * 점검 (bdDash): sat at the wheel (the front door folds open), the wheel turned, the gauges tapped,
   * the 운행기록계 pressed (기록 확인), the mirror set, the card reader tapped (삑). Out on its run it
   * pulls away with its driver at the wheel and comes back in reverse, hazards going (후진합니다).
   */
  cityBus(g, _W, _D, _c, _def, _ctx, out) {
    cityBus(g, out);
  },

  /**
   * The 요금 정산기: a steel counter (수입금 정산) with the cash bags under it; on it the 현금 요금함 off
   * a bus (the day's coins and notes under its glass, its vault lock), the coin counter with its red
   * count and sorted tubes, the test card reader on its post, the 정산서 on a clipboard. Settled
   * (bdSettle): the key turned, the cash drawer pulled out and tipped into the counter's hopper (the
   * coins pour, the count climbs to 187,400), put back, a card tapped on the reader (정상 1,500원),
   * the 정산서 written up. The lead's 안전 회의 is at the 배차실 now.
   */
  farebox(g, _W, _D, _c, _def, _ctx, out) {
    farebox(g, out);
  },

  /**
   * The 노선 안내판: a board on two legs — the 147 노선도 (중랑차고지 to 창동역, its line through
   * eleven named stops) on the left, 오늘의 배차 시간표 (순번, the drivers' magnets, the times written
   * in, the checks) on the right, the tray of markers and magnets along its foot. 노선 숙지 (bdTrace):
   * a finger along the line stop by stop, each stop lit as it's reached, then a hand to the chin.
   * 정류장 순서 외우기 (bdMemorize): a notebook in the left hand, three stops traced (lit at both
   * ends), written down, recited with a finger on the last. 배차 시간표 짜기 (bdSchedule): a driver's
   * magnet off the tray onto the next row, the time written in, a step back with the hands on the hips.
   */
  routeBoard(g, _W, _D, _c, _def, _ctx, out) {
    routeBoard(g, out);
  },

  /**
   * The wash bay (장비 세척대; the taxi depot's and the 환경미화 depot's too, so nothing on it is a
   * bus's): a galvanised frame (세차 구역 · 고압 주의) with the yellow pressure washer and its hose reel,
   * a jug of soap, the lance on its hook, the suds bucket with the long brush, the drain and the wet
   * pad in front. Washed (bdWash): the lance off its hook, the jet swept back and forth and up and
   * down over what's in the bay (spray flying off), hung back; the brush out of the bucket and scrubbed
   * up and down. Whatever's washed stands a good step out in front (the bus's flank at the depot).
   */
  washBay(g, _W, _D, _c, _def, _ctx, out) {
    washBay(g, out);
  },

  /**
   * The 배차실 window (new): a grey facade with the window (the dispatcher's screen of 배차 현황, the
   * mic, the sliding pane), 배차실 over it, the counter outside with the breathalyser and its wand on
   * a clip, the 운행 일지 open with its pen on a chain, the stamp and its red pad; the 음주측정 필수
   * poster, 오늘도 안전 운행 (무사고 312일째), the 출근부 rack and the clock. 음주 측정 (bdBreath): the
   * wand off its clip, blown into (측정 중…), the reading watched (0.000% 정상), hung back. 운행 일지
   * (bdLog): a page turned, written in, stamped (확인), a finger down the entries. 기사 안전 회의 (the
   * 운수과장's): stood out front addressing the yard.
   */
  bdDispatchWindow(g, _W, _D, _c, _def, _ctx, out) {
    dispatchWindow(g, out);
  },

  /**
   * The CNG 충전기 (new): the white dispenser with its blue crown (천연가스 CNG) on a striped island
   * with yellow bollards, the bar gauge and the screen (대기, 충전 중 m³, 충전 완료), the green and red
   * buttons, 화기엄금, the 정전기 패드 on its post, the nozzle on its holster and its heavy hose, an
   * extinguisher. Filled (bdFuel): a palm on the 정전기 패드 (it lights), the nozzle carried over and
   * clipped onto the bus's filler, the green button, arms folded watching the needle climb, the red
   * button, unclipped and hung up. The bus stands a good step out in front, its filler flap to it.
   */
  bdCngPump(g, _W, _D, _c, _def, _ctx, out) {
    cngPump(g, out);
  },

  /**
   * The 분실물 보관함 (new): grey shelving of labelled bins (전자기기, 지갑·카드, 가방, 의류…) with what's
   * waiting in them — phones in zip bags, a backpack, a teddy, a scarf, a tumbler, umbrellas in a
   * bucket — the blue 접수 tray, the 접수 대장 and its pen, 보관 7일 후 경찰서 인계. 분실물 정리
   * (bdLost): a phone (a wallet, a cap) off the tray, a tag tied on, written up in the ledger, put in
   * its bin.
   */
  bdLostFound(g, _W, _D, _c, _def, _ctx, out) {
    lostFound(g, out);
  },

  /**
   * The drivers' 안마의자 (new): ivory shell and brown leather, the reclined back under its hood with
   * the rollers working up and down, the arm cuffs, the leg rest, the remote on its cord, blue lights
   * down its sides while it runs, a paper cup of 믹스커피 on the arm. Rested in (bdRest): sat back,
   * forearms in the cuffs, eyes shut.
   */
  bdAnmagi(g, _W, _D, _c, _def, _ctx, out) {
    anmagi(g, out);
  },

  /** The tyre rack (new, set dressing): spare bus tyres on edge on two steel levels, a rim, the gauge. */
  bdTyreRack(g) {
    tyreRack(g);
  },

  /**
   * The 종점 bus stop at the gate (new, set dressing): a glass shelter with its bench, the BIS screen
   * (147 서울역 곧 도착 · 2115 석계역 3분, paging), the stop's round sign with its routes, a lit ad, a bin.
   */
  bdBusStop(g, _W, _D, _c, _def, _ctx, out) {
    busStop(g, out);
  },
  bdBayLines(g, W, D) {
    bayLines(g, W, D);
  },
  bdYardFence(g) {
    yardFence(g);
  },
  bdCngCanopy(g, W, D) {
    cngCanopy(g, W, D);
  },
  bdGarageSide(g, _W, D, c, def, _ctx) {
    garageWall(g, 'z', D, c, def.id === 'bdGarageSide');
  },
  bdGarageBack(g, W, _D, c) {
    garageWall(g, 'x', W, c, false);
  },
};
