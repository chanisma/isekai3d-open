import * as THREE from 'three';
import { marker, rod, shade, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, label, painted, picture, text } from './doctor';
import * as FA from './flightAttendantMotion';
import type { FaMotion, FaNow } from './flightAttendantMotion';
import { shopFront } from './shopFront';

/**
 * The 승무원 브리핑 센터 drawn as itself (2026-10-31 workplace pipeline, at the user's request): the
 * training hall of the made-up 한누리항공 in its navy and coral. A cut-away cabin (rows facing forward,
 * bins, windows, an aisle with its floor lights, a forward bulkhead with the handset and the cabin
 * panel, a lavatory at the back) with passengers drawn in as it's used; the galley with its cart bay,
 * brewer and oven; a door trainer seen from the side, whose door opens and whose slide inflates; the
 * safety kit with its oxygen mask, vest and a CPR manikin, trainees watching; the flight screen, the
 * briefing table, the lockers and carry-ons, the grooming corner, the crew gate and the departures board.
 *
 * Everything that moves follows the same scripts as the hands (flightAttendantMotion.ts): a tray stays
 * on the cart until the beat it's taken. The airline, its routes and everyone in it are made up.
 */

const AIR = '한누리항공';
const NAVY = '#17325c';
const NAVY_D = '#0f2342';
const CORAL = '#e8505b';
const SKY = '#7ec4e8';
const CABIN = '#eef0ee';
const CABIN_D = '#d5d8d6';
const SEAT = '#2c4f83';
const SEAT_D = '#203c66';
const PAPER = '#fbfaf6';
const LIFE = '#f4c20d';
const UP = new THREE.Vector3(0, 1, 0);
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3();
type V = readonly [number, number, number];

const PANE = new THREE.MeshToonMaterial({ color: '#dff1fb', transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
const MIRROR = new THREE.MeshBasicMaterial({ color: '#cfe3ee' });

// ---------------------------------------------------------------------------------------------
// Small parts.

function group(parent: THREE.Object3D, x = 0, y = 0, z = 0, ry = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}
const place = (m: THREE.Object3D, p: V) => m.position.set(p[0], p[1], p[2]);
function ownLit(g: THREE.Object3D, geom: THREE.BufferGeometry, color: string, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color }));
  m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
const setLit = (m: THREE.Mesh, c: string) => (m.material as THREE.MeshBasicMaterial).color.set(c);
function swapPic(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0): { mesh: THREE.Mesh; set: (t: THREE.Texture) => void } {
  const mat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.userData.ownGeometry = mesh.userData.ownMaterial = true;
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, 0, 'YXZ');
  g.add(mesh);
  return {
    mesh,
    set: (t) => {
      if (mat.map === t) return;
      mat.map = t;
      mat.needsUpdate = true;
    },
  };
}
function flat(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0): THREE.Mesh {
  const m = picture(g, tex, w, h, x, y, z);
  m.rotation.set(-Math.PI / 2, ry, 0, 'YXZ');
  return m;
}
function limb(g: THREE.Object3D, r: number, color: string): (a: THREE.Vector3, b: THREE.Vector3) => void {
  const m = part(g, cyl(r, r * 0.9, 1, 8), color, 0, 0, 0, { outline: false });
  const d = new THREE.Vector3();
  return (a, b) => {
    d.subVectors(b, a);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.scale.set(1, Math.max(0.001, d.length()), 1);
    m.quaternion.setFromUnitVectors(UP, d.normalize());
  };
}
/** Words inside a mirrored group read the right way round. */
const unflip = <T extends THREE.Object3D>(m: T): T => {
  m.scale.x *= -1;
  return m;
};
function mirror(g: THREE.Object3D): THREE.Group {
  const m = group(g);
  m.scale.x = -1;
  return m;
}
function standAt(g: THREE.Object3D, motion: FaMotion): Spot {
  const s = spot(g, 'stand', 0, 0, 0.6, Math.PI);
  s.motion = motion;
  return s;
}
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
function nowAt(spots: Record<string, Spot>, t: number): string | null {
  let best: string | null = null;
  for (const [k, s] of Object.entries(spots)) if (Math.abs(t - posedAt(s)) < 0.6 && (best === null || posedAt(s) > posedAt(spots[best]))) best = k;
  return best;
}
/** Every frame: which use is going on and where its script has got to. */
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, show: (now: string | null, N: FaNow | null, t: number) => void) {
  out.spots = spots;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const N = sp ? FA.faNow(sp.motion as FaMotion, t, FA.faPhase(g.getWorldPosition(tmp)), (sp.at.userData.height as number | undefined) ?? 1.6) : null;
    show(now, N, t);
  };
}
// ---------------------------------------------------------------------------------------------
// People drawn in.

interface Look {
  top: string;
  bottom: string;
  hair: string;
  hairdo: 'short' | 'bob' | 'bun' | 'grey';
  skin?: string;
  shoes?: string;
  glasses?: boolean;
  jacket?: string;
  scarf?: string;
  cap?: string;
}
const SKIN = '#f1c9a5';
const LOOKS: Record<string, Look> = {
  passA: { top: '#e57373', bottom: '#37474f', hair: '#2b1b10', hairdo: 'bob' },
  passB: { top: '#ffffff', bottom: '#546e7a', hair: '#1f1a17', hairdo: 'short', jacket: '#5d6d7e', glasses: true },
  passC: { top: '#81c784', bottom: '#3e4a5a', hair: '#bdbdbd', hairdo: 'grey' },
  passD: { top: '#ffd54f', bottom: '#455a64', hair: '#4e342e', hairdo: 'bob', glasses: true },
  passE: { top: '#90a4ae', bottom: '#263238', hair: '#2b1b10', hairdo: 'short' },
  nervous: { top: '#b39ddb', bottom: '#4a3b52', hair: '#3b2a20', hairdo: 'short', glasses: true },
  crewF: { top: '#f7f7f7', bottom: NAVY, hair: '#1f1a17', hairdo: 'bun', jacket: NAVY, scarf: CORAL },
  crewM: { top: '#f7f7f7', bottom: NAVY, hair: '#1f1a17', hairdo: 'short', jacket: NAVY, scarf: NAVY_D },
  manager: { top: '#f7f7f7', bottom: NAVY_D, hair: '#2b2320', hairdo: 'bun', jacket: NAVY_D, scarf: '#d4a640' },
  trainee: { top: '#f7f7f7', bottom: '#3f4c63', hair: '#2b1b10', hairdo: 'bob', scarf: SKY },
  traineeM: { top: '#f7f7f7', bottom: '#3f4c63', hair: '#1f1a17', hairdo: 'short', scarf: SKY },
};
interface Figure {
  root: THREE.Group;
  head: THREE.Group;
  armL(to: THREE.Vector3 | null): void;
  armR(to: THREE.Vector3 | null): void;
}
/**
 * Someone drawn in, feet (or the seat under them) at (x, z), turned `ry` (0 faces +z): stood, or sat on
 * a seat whose top is `seat` high over a floor at `floor`. The hands rest until put somewhere (in the
 * parent's frame).
 */
function person(parent: THREE.Object3D, look: Look, x: number, z: number, ry: number, seat?: number, floor = 0): Figure {
  const root = group(parent, x, 0, z, ry);
  const skin = look.skin ?? SKIN;
  const shoes = look.shoes ?? '#2b2b30';
  const sat = seat !== undefined;
  const sh = seat ?? floor;
  const shoulderY = sat ? sh + 0.53 : floor + 1.31;
  const torsoY = sat ? sh + 0.33 : floor + 1.11;
  if (sat) {
    for (const sx of [-1, 1]) {
      const hip = v3(sx * 0.09, sh + 0.07, -0.03);
      const knee = v3(sx * 0.1, sh + 0.1, 0.36);
      const ankle = v3(sx * 0.1, Math.max(floor + 0.1, sh - 0.33), 0.46);
      rod(root, hip, knee, 0.062, look.bottom);
      rod(root, knee, ankle, 0.05, look.bottom);
      part(root, rbox(0.09, 0.07, 0.2, 0.03), shoes, sx * 0.1, ankle.y - 0.035, ankle.z + 0.05);
    }
    part(root, rbox(0.31, 0.15, 0.26, 0.06), look.bottom, 0, sh + 0.08, 0);
  } else {
    for (const sx of [-1, 1]) {
      rod(root, v3(sx * 0.085, floor + 0.84, 0), v3(sx * 0.09, floor + 0.08, 0.01), 0.056, look.bottom);
      part(root, rbox(0.09, 0.07, 0.2, 0.03), shoes, sx * 0.09, floor + 0.035, 0.04);
    }
    part(root, rbox(0.3, 0.17, 0.2, 0.06), look.bottom, 0, floor + 0.88, 0);
  }
  const tz = sat ? -0.02 : 0;
  part(root, rbox(0.34, 0.46, 0.21, 0.08), look.top, 0, torsoY, tz);
  if (look.jacket) {
    for (const sx of [-1, 1]) part(root, rbox(0.13, 0.47, 0.226, 0.05), look.jacket, sx * 0.11, torsoY - 0.01, tz);
    part(root, rbox(0.35, 0.46, 0.1, 0.05), look.jacket, 0, torsoY - 0.01, tz - 0.065);
  }
  if (look.scarf) {
    part(root, rbox(0.17, 0.05, 0.14, 0.02), look.scarf, 0, shoulderY + 0.005, tz + 0.04);
    part(root, rbox(0.05, 0.1, 0.012, 0.005), look.scarf, 0.02, shoulderY - 0.06, tz + 0.112, { rz: 0.2 });
  }
  part(root, cyl(0.045, 0.05, 0.08, 10), skin, 0, shoulderY + 0.06, tz, { outline: false });
  const head = group(root, 0, shoulderY + 0.2, tz);
  part(head, ball(0.112), skin, 0, 0, 0);
  for (const sx of [-1, 1]) part(head, ball(0.012), '#2b2b30', sx * 0.04, 0.0, 0.104, { outline: false });
  part(head, box(0.03, 0.006, 0.004), '#a1665e', 0, -0.045, 0.104, { outline: false });
  switch (look.hairdo) {
    case 'bob':
      part(head, ball(0.122), look.hair, 0, 0.025, -0.03);
      for (const sx of [-1, 1]) part(head, rbox(0.05, 0.16, 0.14, 0.025), look.hair, sx * 0.1, -0.03, -0.02);
      part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0, 0.08, 0.08, { rx: -0.2 });
      break;
    case 'bun':
      part(head, ball(0.118), look.hair, 0, 0.03, -0.03);
      part(head, ball(0.055), look.hair, 0, 0.05, -0.14);
      part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0, 0.08, 0.075, { rx: -0.25 });
      break;
    case 'grey':
      part(head, ball(0.116), look.hair, 0, 0.03, -0.035);
      part(head, rbox(0.19, 0.04, 0.05, 0.02), look.hair, 0.01, 0.08, 0.07, { rx: -0.3, rz: 0.1 });
      break;
    default:
      part(head, ball(0.118), look.hair, 0, 0.03, -0.03);
      part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0, 0.075, 0.075, { rx: -0.25 });
  }
  if (look.glasses) {
    for (const sx of [-1, 1]) part(head, cyl(0.026, 0.026, 0.004, 14), '#37474f', sx * 0.042, 0.002, 0.11, { rx: Math.PI / 2, outline: false });
    part(head, box(0.02, 0.004, 0.004), '#37474f', 0, 0.002, 0.113, { outline: false });
  }
  const arm = (sx: number) => {
    const shoulder = v3(sx * 0.2, shoulderY, tz);
    const rest = sat ? v3(sx * 0.11, sh + 0.16, 0.24) : v3(sx * 0.23, floor + 0.82, 0.05);
    const upper = limb(root, 0.042, look.jacket ?? look.top);
    const lower = limb(root, 0.035, look.jacket ?? look.top);
    const hand = part(root, ball(0.036), skin, 0, 0, 0, { outline: false });
    const loc = new THREE.Vector3();
    const elbow = new THREE.Vector3();
    const d = new THREE.Vector3();
    const bend = new THREE.Vector3();
    return (to: THREE.Vector3 | null) => {
      if (to) loc.copy(to).sub(root.position).applyAxisAngle(UP, -root.rotation.y);
      else loc.copy(rest);
      d.subVectors(loc, shoulder);
      const L = Math.min(0.5, Math.max(0.05, d.length()));
      d.normalize();
      loc.copy(shoulder).addScaledVector(d, L);
      const a = 0.27;
      const b = 0.25;
      const cosA = THREE.MathUtils.clamp((a * a + L * L - b * b) / (2 * a * L), -1, 1);
      bend.set(sx * 0.6, -1, -0.25).normalize();
      bend.addScaledVector(d, -bend.dot(d)).normalize();
      elbow.copy(shoulder).addScaledVector(d, a * cosA).addScaledVector(bend, a * Math.sqrt(1 - cosA * cosA));
      upper(shoulder, elbow);
      lower(elbow, loc);
      hand.position.copy(loc);
    };
  };
  const armL = arm(1);
  const armR = arm(-1);
  armL(null);
  armR(null);
  return { root, head, armL, armR };
}

// ---------------------------------------------------------------------------------------------
// Things that travel between pieces.

function airLogo(c: CanvasRenderingContext2D, x: number, y: number, s: number, color = CORAL) {
  // 한누리항공's mark: a coral swoosh over a dot.
  c.strokeStyle = color;
  c.lineWidth = s * 0.34;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(x - s, y + s * 0.4);
  c.quadraticCurveTo(x - s * 0.1, y - s * 0.95, x + s, y - s * 0.3);
  c.stroke();
  c.fillStyle = color;
  c.beginPath();
  c.arc(x + s * 0.1, y + s * 0.5, s * 0.25, 0, Math.PI * 2);
  c.fill();
}
const trayTex = painted('faTray', 128, 96, (c) => {
  c.fillStyle = '#cfd8dc';
  c.fillRect(0, 0, 128, 96);
  c.fillStyle = '#fafafa';
  c.fillRect(6, 6, 70, 54);
  c.fillStyle = '#c0824a';
  c.fillRect(14, 14, 54, 38);
  c.fillStyle = '#7cb342';
  c.fillRect(20, 20, 16, 12);
  c.fillStyle = '#fff3e0';
  c.fillRect(38, 18, 24, 26);
  c.fillStyle = '#ffffff';
  c.fillRect(82, 8, 40, 26);
  c.fillStyle = '#e57373';
  c.fillRect(88, 12, 28, 18);
  c.fillStyle = '#90a4ae';
  c.fillRect(8, 66, 60, 8);
  c.fillRect(8, 78, 60, 8);
  c.fillStyle = '#ffffff';
  c.fillRect(80, 44, 42, 44);
});
function mealTray(g: THREE.Object3D): THREE.Group {
  const t = group(g);
  part(t, rbox(0.3, 0.014, 0.22, 0.006), '#b0bec5', 0, 0.007, 0);
  flat(t, trayTex, 0.27, 0.2, 0, 0.0155, 0);
  part(t, rbox(0.11, 0.022, 0.08, 0.01), '#fafafa', -0.07, 0.024, -0.02);
  part(t, cyl(0.03, 0.025, 0.02, 12), '#fafafa', 0.08, 0.024, -0.05);
  return t;
}
/** A coffee pot: a steel flask with a black lid and handle. */
function coffeePot(g: THREE.Object3D): THREE.Group {
  const t = group(g);
  part(t, cyl(0.05, 0.06, 0.17, 14), STEEL, 0, 0.085, 0);
  part(t, cyl(0.03, 0.05, 0.04, 14), BLACK, 0, 0.19, 0);
  part(t, rbox(0.02, 0.1, 0.03, 0.008), BLACK, 0.075, 0.1, 0);
  part(t, cyl(0.009, 0.014, 0.05, 8), STEEL, -0.062, 0.14, 0, { rz: -0.8 });
  return t;
}
function paperCup(g: THREE.Object3D, full = false): THREE.Group {
  const t = group(g);
  part(t, cyl(0.03, 0.022, 0.075, 12), '#fafafa', 0, 0.037, 0);
  part(t, cyl(0.031, 0.03, 0.012, 12), NAVY, 0, 0.05, 0, { outline: false });
  const top = part(t, cyl(0.027, 0.027, 0.002, 12), full ? '#5d3a1a' : '#e9e4d8', 0, 0.074, 0, { outline: false });
  top.userData.fill = true;
  return t;
}
/** The carry-on: navy, lower handle pulled by a rod, two wheels. Its middle at the origin's height 0. */
function carryOn(g: THREE.Object3D): { t: THREE.Group; lid: THREE.Group; handle: THREE.Group } {
  const t = group(g);
  part(t, rbox(0.36, 0.5, 0.2, 0.04), NAVY, 0, 0.3, 0);
  part(t, box(0.3, 0.02, 0.205), CORAL, 0, 0.34, 0, { outline: false });
  for (const sx of [-1, 1]) part(t, cyl(0.03, 0.03, 0.02, 10), BLACK, sx * 0.13, 0.03, -0.07, { rz: Math.PI / 2, outline: false });
  part(t, rbox(0.12, 0.025, 0.02, 0.008), BLACK, 0, 0.56, 0, { outline: false });
  label(t, AIR, 0.2, 0.05, 0, 0.42, 0.103, NAVY, '#ffffff');
  const lid = group(t, 0, 0.55, 0.08);
  part(lid, rbox(0.34, 0.03, 0.2, 0.01), shade(NAVY, 0.88), 0, 0, -0.09);
  const handle = group(t, 0, 0.56, -0.07);
  for (const sx of [-1, 1]) part(handle, cyl(0.007, 0.007, 0.34, 6), CHROME, sx * 0.06, 0.17, 0, { outline: false });
  part(handle, rbox(0.16, 0.025, 0.025, 0.01), BLACK, 0, 0.34, 0);
  return { t, lid, handle };
}

/**
 * The 서비스 카트 (atlas cart): a narrow steel box 0.6 long, its handle and end door at +z. Runners
 * inside show trays; a top tray for the pot and cups.
 */
function serviceCart(g: THREE.Object3D, ry: number): { c: THREE.Group; door: THREE.Group; shelf: THREE.Group[]; top: THREE.Group } {
  const c = group(g, 0, 0, 0, ry);
  part(c, rbox(0.3, 0.84, 0.6, 0.02), STEEL, 0, 0.5, 0);
  part(c, box(0.302, 0.08, 0.5), NAVY, 0, 0.72, 0, { outline: false });
  label(c, AIR, 0.34, 0.06, 0.153, 0.72, 0, NAVY, '#ffffff', Math.PI / 2);
  label(c, AIR, 0.34, 0.06, -0.153, 0.72, 0, NAVY, '#ffffff', -Math.PI / 2);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(c, cyl(0.035, 0.035, 0.03, 10), BLACK, sx * 0.1, 0.035, sz * 0.22, { rz: Math.PI / 2, outline: false });
  // Brake pedal, in red and green.
  part(c, box(0.1, 0.012, 0.03), '#c62828', -0.05, 0.03, 0.31, { outline: false });
  part(c, box(0.1, 0.012, 0.03), '#43a047', 0.06, 0.03, 0.31, { outline: false });
  // The top: a rim, and its handle out over the end.
  part(c, box(0.3, 0.015, 0.6), '#eceff1', 0, 0.925, 0);
  for (const sx of [-1, 1]) part(c, box(0.012, 0.03, 0.6), '#90a4ae', sx * 0.148, 0.94, 0, { outline: false });
  part(c, box(0.3, 0.03, 0.012), '#90a4ae', 0, 0.94, -0.298, { outline: false });
  rod(c, v3(-0.13, 0.9, 0.3), v3(-0.13, 0.96, 0.34), 0.01, CHROME);
  rod(c, v3(0.13, 0.9, 0.3), v3(0.13, 0.96, 0.34), 0.01, CHROME);
  rod(c, v3(-0.14, 0.96, 0.34), v3(0.14, 0.96, 0.34), 0.012, BLACK);
  // Inside (runners at the door's end), shown when the door swings.
  const shelf: THREE.Group[] = [];
  for (let i = 0; i < 3; i++) {
    const s = group(c, 0, 0.72 - i * 0.14 - 0.08, 0.26);
    part(s, box(0.26, 0.012, 0.1), '#b0bec5', 0, 0, 0, { outline: false });
    part(s, box(0.2, 0.02, 0.08), '#fafafa', 0, 0.01, 0, { outline: false });
    shelf.push(s);
  }
  part(c, box(0.27, 0.56, 0.01), '#546e7a', 0, 0.38, 0.296, { outline: false });
  const door = group(c, -0.15, 0.38, 0.302);
  part(door, rbox(0.3, 0.64, 0.016, 0.006), '#cfd8dc', 0.15, 0, 0);
  part(door, cyl(0.02, 0.02, 0.012, 10), '#c62828', 0.25, 0.1, 0.014, { rx: Math.PI / 2, outline: false });
  const top = group(c, 0, 0.94, 0);
  return { c, door, shelf, top };
}

// ---------------------------------------------------------------------------------------------
// Pictures.

const SIGN_ON = '#ffd54f';
const SIGN_OFF = '#4b4b52';
const skyTex = painted('faWindow', 96, 128, (c) => {
  const gr = c.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, '#6fb6ea');
  gr.addColorStop(0.65, '#d5eefb');
  gr.addColorStop(1, '#fff2d8');
  c.fillStyle = gr;
  c.fillRect(0, 0, 96, 128);
  c.fillStyle = '#ffffff';
  for (const [x, y, r] of [[20, 86, 14], [38, 80, 18], [58, 88, 14], [74, 92, 10]]) {
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }
});
const blindTex = painted('faBlind', 96, 128, (c) => {
  c.fillStyle = '#eef0ee';
  c.fillRect(0, 0, 96, 128);
  c.strokeStyle = '#d0d3d0';
  for (let y = 6; y < 128; y += 10) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(96, y);
    c.stroke();
  }
});
const cabinPanelTex = painted('faCabinPanel', 160, 192, (c) => {
  c.fillStyle = '#263238';
  c.fillRect(0, 0, 160, 192);
  text(c, '객실 제어반', 80, 16, 15, '#ffffff', 'center');
  const row = (s: string, y: number, on: string) => {
    c.fillStyle = on;
    c.fillRect(12, y - 10, 26, 20);
    text(c, s, 46, y, 13, '#cfd8dc');
  };
  row('안전벨트', 48, '#ffb300');
  row('금연', 76, '#ef5350');
  row('승무원 호출', 104, '#42a5f5');
  row('객실 조명', 132, '#66bb6a');
  row('방송', 160, '#ab47bc');
});
const seatCardTex = painted('faSafetyCard', 128, 192, (c) => {
  c.fillStyle = '#fffde7';
  c.fillRect(0, 0, 128, 192);
  c.fillStyle = NAVY;
  c.fillRect(0, 0, 128, 28);
  text(c, '안전 안내서', 64, 15, 16, '#ffffff', 'center');
  const row = (y: number, col: string, s: string) => {
    c.fillStyle = col;
    c.fillRect(8, y, 112, 34);
    text(c, s, 64, y + 17, 13, '#ffffff', 'center');
  };
  row(36, '#ef6c00', '구명복은 좌석 밑');
  row(76, '#2e7d32', '비상구 8곳');
  row(116, '#1565c0', '산소마스크');
  row(154, '#c62828', '충격 방지 자세');
});
const lavTex = painted('faLav', 128, 192, (c) => {
  c.fillStyle = '#e8e6df';
  c.fillRect(0, 0, 128, 192);
  c.fillStyle = '#546e7a';
  c.font = '48px sans-serif';
  c.fillRect(44, 56, 40, 60);
  text(c, '화장실', 64, 30, 22, '#37474f', 'center');
  text(c, '비어 있음', 64, 150, 16, '#2e7d32', 'center');
});
const sillTex = painted('faSill', 1024, 64, (c) => {
  c.fillStyle = NAVY;
  c.fillRect(0, 0, 1024, 64);
  c.fillStyle = CORAL;
  c.fillRect(0, 50, 1024, 6);
  airLogo(c, 50, 30, 18, '#ffffff');
  text(c, `${AIR}  객실 안전 훈련 모형`, 86, 30, 30, '#ffffff');
  text(c, 'CABIN CREW TRAINING', 1000, 30, 22, SKY, 'right');
});
const bulkTex = painted('faBulk', 256, 256, (c) => {
  c.fillStyle = NAVY;
  c.fillRect(0, 0, 256, 256);
  airLogo(c, 128, 90, 48, '#ffffff');
  text(c, AIR, 128, 170, 34, '#ffffff', 'center');
  text(c, '안전한 하늘길을 약속합니다', 128, 212, 17, SKY, 'center');
});
const flightBoardTex = (rows: Array<[string, string, string, string]>, title: string) =>
  painted(`faFlights|${title}|${rows.map((r) => r.join()).join('/')}`, 512, 256, (c) => {
    c.fillStyle = '#0a1320';
    c.fillRect(0, 0, 512, 256);
    c.fillStyle = NAVY;
    c.fillRect(0, 0, 512, 42);
    airLogo(c, 26, 22, 12, '#ffffff');
    text(c, title, 50, 22, 22, '#ffffff');
    text(c, '시각', 12, 58, 13, '#90a4ae');
    text(c, '편명', 88, 58, 13, '#90a4ae');
    text(c, '목적지', 190, 58, 13, '#90a4ae');
    text(c, '상태', 400, 58, 13, '#90a4ae');
    rows.forEach(([a, b, d, s], i) => {
      const y = 86 + i * 34;
      c.fillStyle = i % 2 ? '#111d30' : '#0d1727';
      c.fillRect(6, y - 16, 500, 32);
      text(c, a, 12, y, 20, '#ffd54f');
      text(c, b, 88, y, 20, '#ffffff');
      text(c, d, 190, y, 20, '#ffffff');
      text(c, s, 400, y, 18, s === '탑승 중' ? '#69f0ae' : s === '지연' ? '#ff8a80' : '#80d8ff');
    });
  });
const FLIGHTS: Array<[string, string, string, string]> = [
  ['09:20', 'HN 317', '은빛만', '탑승 중'],
  ['10:05', 'HN 482', '푸른섬', '정시'],
  ['11:40', 'HN 206', '구름항', '정시'],
  ['13:15', 'HN 771', '달빛곶', '지연'],
  ['15:30', 'HN 118', '하늘섬', '정시'],
];
const FLIGHTS_B: Array<[string, string, string, string]> = [
  ['09:20', 'HN 317', '은빛만', '출발'],
  ['10:05', 'HN 482', '푸른섬', '탑승 중'],
  ['11:40', 'HN 206', '구름항', '정시'],
  ['13:15', 'HN 771', '달빛곶', '정시'],
  ['15:30', 'HN 118', '하늘섬', '정시'],
];
const boardHomeTex = flightBoardTex(FLIGHTS, '오늘의 비행 · 브리핑 센터');
const dutyMapTex = painted('faDuty', 512, 256, (c) => {
  c.fillStyle = '#f2f6fa';
  c.fillRect(0, 0, 512, 256);
  c.fillStyle = NAVY;
  c.fillRect(0, 0, 512, 32);
  text(c, 'HN 317 은빛만행 · 객실 승무원 임무 배정', 12, 17, 18, '#ffffff');
  // The roster's column.
  c.fillStyle = '#e1e8f0';
  c.fillRect(10, 42, 118, 204);
  text(c, '승무원', 69, 56, 15, '#37474f', 'center');
  // The cabin plan.
  c.fillStyle = '#ffffff';
  c.strokeStyle = NAVY;
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(150, 92);
  c.quadraticCurveTo(190, 50, 240, 50);
  c.lineTo(490, 50);
  c.lineTo(490, 230);
  c.lineTo(240, 230);
  c.quadraticCurveTo(190, 230, 150, 188);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = '#90caf9';
  for (let i = 0; i < 12; i++) for (const y of [68, 88, 170, 190]) c.fillRect(250 + i * 19, y, 13, 14);
  c.fillStyle = '#fff3e0';
  c.fillRect(250, 110, 228, 50);
  text(c, '통로', 362, 135, 16, '#8d6e63', 'center');
  text(c, '① 사무장', 256, 74 - 16, 11, '#1565c0');
  text(c, 'L1', 210, 110, 15, '#c62828', 'center');
  text(c, 'R1', 210, 170, 15, '#c62828', 'center');
  text(c, 'L2', 470, 124, 15, '#c62828', 'center');
});
const statTex = (key: string, title: string, draw: (c: CanvasRenderingContext2D) => void) =>
  painted(key, 512, 256, (c) => {
    c.fillStyle = '#f2f6fa';
    c.fillRect(0, 0, 512, 256);
    c.fillStyle = NAVY;
    c.fillRect(0, 0, 512, 32);
    text(c, title, 12, 17, 18, '#ffffff');
    draw(c);
  });
const reviewTexes = [
  statTex('faStat0', '이번 달 객실 서비스 품질', (c) => {
    text(c, '승객 만족도', 30, 62, 18, '#37474f');
    text(c, '4.7', 30, 120, 62, CORAL);
    text(c, '/ 5.0', 136, 138, 22, '#607d8b');
    const vs = [0.62, 0.74, 0.7, 0.86, 0.94];
    ['기내식', '안내', '청결', '친절', '안전'].forEach((s, i) => {
      c.fillStyle = '#90caf9';
      c.fillRect(250 + i * 50, 220 - vs[i] * 150, 32, vs[i] * 150);
      text(c, s, 266 + i * 50, 234, 13, '#37474f', 'center');
    });
  }),
  statTex('faStat1', '승객의 말 · 칭찬과 개선', (c) => {
    c.fillStyle = '#e8f5e9';
    c.fillRect(18, 44, 476, 62);
    text(c, '칭찬  "무서워하는 저를 끝까지 챙겨 주셨어요"', 30, 75, 18, '#1b5e20');
    c.fillStyle = '#fff3e0';
    c.fillRect(18, 116, 476, 62);
    text(c, '개선  "두 번째 식사 서비스가 늦었어요"', 30, 147, 18, '#e65100');
    c.fillStyle = '#e3f2fd';
    c.fillRect(18, 188, 476, 56);
    text(c, '과제  뒤쪽 구역 카트 출발 5분 앞당기기', 30, 216, 18, '#0d47a1');
  }),
  statTex('faStat2', '다음 달 실천 약속', (c) => {
    ['1. 뒤쪽 구역 카트 먼저 출발', '2. 불안한 승객 먼저 살피기', '3. 안전 시범 또렷한 동작으로'].forEach((s, i) => text(c, s, 34, 80 + i * 56, 24, '#263238'));
  }),
];
const quizTexes = (() => {
  const q = (key: string, title: string, a: [string, string, string], pick: number, right: number) =>
    painted(key, 192, 128, (c) => {
      c.fillStyle = '#f7f9fc';
      c.fillRect(0, 0, 192, 128);
      c.fillStyle = NAVY;
      c.fillRect(0, 0, 192, 22);
      text(c, title, 96, 12, 12, '#ffffff', 'center');
      a.forEach((s, i) => {
        c.fillStyle = pick === i ? (i === right ? '#66bb6a' : '#ef5350') : '#dfe7ef';
        c.fillRect(10, 30 + i * 32, 172, 27);
        text(c, s, 96, 44 + i * 32, 12, pick === i ? '#ffffff' : '#263238', 'center');
      });
    });
  const blank = painted('faQuizHome', 192, 128, (c) => {
    c.fillStyle = NAVY;
    c.fillRect(0, 0, 192, 128);
    airLogo(c, 96, 46, 22, '#ffffff');
    text(c, '비행 전 퀴즈', 96, 96, 18, '#ffffff', 'center');
  });
  const Q1: [string, string, string] = ['문 조작 전 밖 확인', '슬라이드 먼저 풀기', '승객 먼저 내보내기'];
  const Q2: [string, string, string] = ['구명복은 기내에서', '구명복은 문 앞에서', '구명복은 물에서'];
  const Q3: [string, string, string] = ['소화기 먼저', '기장에게 먼저 보고', '혼자 해결'];
  const out = [blank, q('faQ1a', '1. 비상구 절차는?', Q1, -1, 0), q('faQ1b', '1. 비상구 절차는?', Q1, 0, 0), q('faQ2a', '2. 구명복 팽창은?', Q2, -1, 1), q('faQ2b', '2. 구명복 팽창은?', Q2, 1, 1), q('faQ3a', '3. 기내 화재 시?', Q3, -1, 0), q('faQ3b', '3. 기내 화재 시?', Q3, 0, 0)];
  out.push(
    painted('faQScore', 192, 128, (c) => {
      c.fillStyle = '#e8f5e9';
      c.fillRect(0, 0, 192, 128);
      text(c, '통과!', 96, 40, 28, '#2e7d32', 'center');
      text(c, '3 / 3', 96, 84, 30, NAVY, 'center');
    }),
  );
  return out;
})();
const countTexes = new Map<number, THREE.Texture>();
function countTex(n: number): THREE.Texture {
  let t = countTexes.get(n);
  if (!t) {
    t = painted(`faCount|${n}`, 96, 64, (c) => {
      c.fillStyle = '#071a0f';
      c.fillRect(0, 0, 96, 64);
      text(c, '압박', 48, 14, 13, '#a5d6a7', 'center');
      text(c, String(n).padStart(2, '0'), 48, 42, 30, '#76ff03', 'center');
    });
    countTexes.set(n, t);
  }
  return t;
}
const demoBoardTex = painted('faDemoBoard', 512, 512, (c) => {
  c.fillStyle = '#f5f7fa';
  c.fillRect(0, 0, 512, 512);
  c.fillStyle = NAVY;
  c.fillRect(0, 0, 512, 62);
  airLogo(c, 34, 32, 16, '#ffffff');
  text(c, '안전 시범 순서', 62, 32, 30, '#ffffff');
  const row = (y: number, n: string, s: string, col: string) => {
    c.fillStyle = col;
    c.beginPath();
    c.arc(44, y, 22, 0, Math.PI * 2);
    c.fill();
    text(c, n, 44, y, 24, '#ffffff', 'center');
    text(c, s, 80, y, 28, '#263238');
  };
  row(110, '1', '좌석벨트 매고 풀기', '#1565c0');
  row(180, '2', '산소마스크 끌어당겨 쓰기', '#00897b');
  row(250, '3', '구명복 입고 끈 묶기', '#ef6c00');
  row(320, '4', '빨간 줄 당겨 부풀리기', '#c62828');
  row(390, '5', '가까운 비상구 안내', '#6a1b9a');
  row(460, '6', '안전 안내서 확인', '#37474f');
});
const firstAidTex = painted('faFirstAid', 256, 128, (c) => {
  c.fillStyle = '#fff3e0';
  c.fillRect(0, 0, 256, 128);
  c.fillStyle = '#c62828';
  c.fillRect(0, 0, 256, 34);
  text(c, '심폐소생술 C-A-B', 128, 18, 20, '#ffffff', 'center');
  ['① 의식 확인 · 119', '② 가슴 압박 30회', '③ 인공호흡 2회'].forEach((s, i) => text(c, s, 12, 56 + i * 26, 18, '#4e342e'));
});
const placardTex = painted('faPlacard', 192, 256, (c) => {
  c.fillStyle = '#fffde7';
  c.fillRect(0, 0, 192, 256);
  c.fillStyle = '#ef6c00';
  c.fillRect(0, 0, 192, 36);
  text(c, '갤리 사용법', 96, 19, 22, '#ffffff', 'center');
  ['1. 물 받아 보일러 확인', '2. 커피 버튼 · 불 확인', '3. 오븐 온도 확인', '4. 잠금 레버 돌리기', '5. 이륙 전 카트 고정'].forEach((s, i) => text(c, s, 8, 62 + i * 38, 16, '#4e342e'));
});
const checkSheet = new Map<number, THREE.Texture>();
function checkTex(n: number): THREE.Texture {
  let t = checkSheet.get(n);
  if (!t) {
    t = painted(`faCheck|${n}`, 192, 256, (c) => {
      c.fillStyle = PAPER;
      c.fillRect(0, 0, 192, 256);
      c.fillStyle = CORAL;
      c.fillRect(0, 0, 192, 36);
      text(c, '용모 복장 점검표', 96, 19, 19, '#ffffff', 'center');
      ['유니폼 주름', '스카프 매듭', '모자 · 머리', '명찰 · 신발'].forEach((s, i) => {
        const y = 70 + i * 46;
        c.strokeStyle = '#607d8b';
        c.lineWidth = 3;
        c.strokeRect(14, y - 12, 24, 24);
        text(c, s, 50, y, 19, '#263238');
        if (i < n) {
          c.strokeStyle = '#2e7d32';
          c.lineWidth = 5;
          c.beginPath();
          c.moveTo(16, y);
          c.lineTo(24, y + 10);
          c.lineTo(40, y - 14);
          c.stroke();
        }
      });
    });
    checkSheet.set(n, t);
  }
  return t;
}
const gateTex = (s: string, col: string) =>
  painted(`faGate|${s}`, 384, 128, (c) => {
    c.fillStyle = '#0a1320';
    c.fillRect(0, 0, 384, 128);
    text(c, '승무원 탑승구 7', 16, 28, 26, '#ffffff');
    text(c, 'HN 317  은빛만', 16, 72, 26, '#ffd54f');
    text(c, s, 16, 108, 22, col);
  });
const gateReady = gateTex('탑승 준비', '#69f0ae');
const gateFly = gateTex('비행 중', '#80d8ff');
const tailTex = painted('faTail', 256, 256, (c) => {
  const gr = c.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#79bdeb');
  gr.addColorStop(1, '#e3f3fb');
  c.fillStyle = gr;
  c.fillRect(0, 0, 256, 256);
  c.fillStyle = '#fafafa';
  c.fillRect(0, 190, 256, 66);
  c.fillStyle = NAVY;
  c.fillRect(0, 214, 256, 16);
  for (let i = 0; i < 9; i++) {
    c.fillStyle = '#37474f';
    c.fillRect(10 + i * 28, 196, 14, 12);
  }
  c.fillStyle = NAVY;
  c.beginPath();
  c.moveTo(70, 190);
  c.lineTo(130, 60);
  c.lineTo(190, 60);
  c.lineTo(190, 190);
  c.closePath();
  c.fill();
  airLogo(c, 150, 130, 24, '#ffffff');
});

// =============================================================================================
// Seats and the cabin.

/** An economy seat facing +z of its own group: cushion, back with its white headrest cover, arms. */
function airSeat(g: THREE.Object3D, x: number, y: number, z: number, ry: number, cloth = SEAT) {
  const s = group(g, x, y, z, ry);
  part(s, box(0.06, 0.32, 0.34), '#546e7a', 0, 0.16, 0, { outline: false });
  part(s, rbox(0.44, 0.1, 0.44, 0.04), cloth, 0, 0.39, 0.02);
  part(s, rbox(0.44, 0.66, 0.09, 0.04), cloth, 0, 0.74, -0.2, { rx: -0.12 });
  part(s, rbox(0.34, 0.15, 0.1, 0.03), '#f7f7f4', 0, 1.02, -0.245, { rx: -0.12 });
  // The back's pocket.
  part(s, box(0.32, 0.16, 0.012), SEAT_D, 0, 0.56, -0.26, { rx: -0.12, outline: false });
  // The arm's rest.
  for (const sx of [-1, 1]) part(s, rbox(0.04, 0.03, 0.34, 0.012), '#37474f', sx * 0.22, 0.6, 0);
  return s;
}

/**
 * The 객실 모형: see the file's head. Cabin service (faServe): the cart pushed from the back of the
 * aisle, a meal tray and a poured coffee for the far aisle passenger, a cup across to the near one.
 * 담당 구역 서비스 (faZone): a bag lifted into the bin and the bin shut, a belt pointed at, a cup taken, a
 * blind asked for and the checklist ticked. A nervous passenger (faCalm), the handset (faAnnounce).
 */
function cabinMockup(root: THREE.Group, out: Built) {
  const CM = FA.CM;
  // The shell's drawn with the rows facing -x, then mirrored so they face the game's camera.
  const g = mirror(root);
  const D = CM.deck;
  const top = 2.1;
  // The deck: carpet, an aisle stripe, the floor lights to the exit.
  part(g, box(6, D, 3), '#46536a', 0, D / 2, 0);
  part(g, box(5.5, 0.006, 2.92), '#2f4a7a', 0.1, D + 0.003, 0, { outline: false });
  part(g, box(4.9, 0.006, 0.62), '#3b5d94', -0.05, D + 0.005, CM.A, { outline: false });
  const floorLights: THREE.Mesh[] = [];
  for (let i = 0; i < 16; i++) floorLights.push(ownLit(g, box(0.1, 0.006, 0.018), '#fff3c4', -2.2 + i * 0.3, D + 0.008, CM.A - 0.31));
  // The far wall: panels, windows, the arch into the ceiling.
  part(g, box(5.4, 1.6, 0.05), CABIN, 0.1, D + 0.8, -1.46);
  part(g, box(5.4, 0.42, 0.05), CABIN_D, 0.1, D + 0.2, -1.43, { outline: false });
  const windows: Array<ReturnType<typeof swapPic>> = [];
  for (let i = -2; i <= 3; i++) {
    const x = -2.02 + (i + 2) * 0.9;
    part(g, rbox(0.34, 0.46, 0.012, 0.1), '#c9ced0', x, 1.2, -1.432, { outline: false });
    const w = swapPic(g, 0.24, 0.34, x, 1.2, -1.424);
    w.set(skyTex);
    windows.push(w);
  }
  // The bins along the far side, with three doors, and the service panel under them.
  part(g, box(5.4, 0.46, 0.92), CABIN, 0.1, 1.91, -0.98);
  part(g, box(5.4, 0.1, 0.94), '#ffffff', 0.1, 2.14, -0.98, { outline: false });
  part(g, box(5.4, 0.04, 0.93), CABIN_D, 0.1, 1.665, -0.98, { outline: false });
  // A deep inside, dark, the door lifted over it.
  const binDark = part(g, box(0.96, 0.42, 0.01), '#3f4247', CM.binShut[0], 1.9, -0.5, { outline: false });
  binDark.visible = false;
  const binHinge = group(g, CM.binShut[0], 2.12, -0.515);
  part(binHinge, rbox(0.98, 0.45, 0.024, 0.01), '#f7f7f4', 0, -0.225, 0);
  part(binHinge, rbox(0.12, 0.03, 0.02, 0.008), '#90a4ae', 0, -0.405, 0.016);
  const parts = [-1.7, -0.75, 1.25, 2.2];
  for (const x of parts) {
    part(g, rbox(0.9, 0.44, 0.024, 0.01), '#f7f7f4', x, 1.9, -0.513);
    part(g, rbox(0.12, 0.03, 0.02, 0.008), '#90a4ae', x, 1.72, -0.5);
  }
  // Lit strips and the signs per row.
  const mood = [ownLit(g, box(5.4, 0.02, 0.02), '#fff6e0', 0.1, 2.15, -0.5)];
  const signs: THREE.Mesh[] = [];
  for (const x of CM.rows) {
    part(g, box(0.5, 0.03, 0.5), '#dfe2e0', x, 1.645, -0.74, { outline: false });
    for (const dz of [-0.12, 0, 0.12]) part(g, cyl(0.016, 0.016, 0.01, 8), '#fff8e1', x + 0.12, 1.625, -0.74 + dz, { outline: false });
    signs.push(ownLit(g, box(0.12, 0.05, 0.005), SIGN_OFF, x - 0.1, 1.625, -0.49));
  }
  // The call lights on the near rows' armrests.
  const nearCalls: THREE.Mesh[] = [];
  for (const x of CM.rows) {
    nearCalls.push(ownLit(g, box(0.03, 0.012, 0.03), '#37474f', x + 0.1, CM.seat + 0.27, CM.near[0] - 0.26));
  }
  // The seats.
  const R = -Math.PI / 2;
  for (const x of CM.rows) {
    for (const z of CM.far) airSeat(g, x, D, z, R);
    for (const z of CM.near) airSeat(g, x, D, z, R);
  }
  // Seat-back cards and folded tables on the row in front of each.
  for (const x of CM.rows.slice(1)) {
    for (const z of [...CM.far, ...CM.near]) {
      unflip(picture(g, seatCardTex, 0.08, 0.12, x - 0.9 + 0.285, D + 0.75, z, '#ffffff', Math.PI / 2));
    }
  }
  // The tray tables that come down.
  const tableAt = (seat: V) => {
    const h = group(g, seat[0] - 0.17, seat[1], seat[2]);
    part(h, rbox(0.34, 0.016, 0.38, 0.008), '#8aa0ad', 0.17, 0, 0);
    return h;
  };
  const SEAT1: V = [CM.rows[2] - CM.table, CM.tableY, CM.far[2]];
  const SEAT2: V = [CM.rows[1] - CM.table, CM.tableY, CM.near[0]];
  const t1 = tableAt(SEAT1);
  const t2 = tableAt(SEAT2);
  // The near edge (the cut): a low sill with the stripe and the airline's name.
  part(root, box(6, 0.3, 0.05), NAVY, 0, 0.15, 1.48);
  picture(root, sillTex, 5.2, 0.27, 0, 0.16, 1.51).renderOrder = 1;
  // The forward end, towards the camera, cut low so the rows can be seen.
  part(root, box(0.06, 0.8, 2.92), CABIN, 2.38, D + 0.4, 0);
  part(root, box(0.5, 0.42, 2.92), CABIN_D, 2.72, D + 0.21, 0);
  part(root, box(0.5, 0.012, 2.92), NAVY, 2.72, D + 0.426, 0, { outline: false });
  picture(root, bulkTex, 0.6, 0.6, 2.42, D + 0.42, -0.6, '#ffffff', Math.PI / 2);
  label(root, '조종실 방향', 0.56, 0.12, 2.42, D + 0.42, 0.7, CABIN, NAVY, Math.PI / 2);
  // The aft end, the far one: the bulkhead, a lavatory door, the curtain to the galley, and the column
  // by the aisle with the cabin panel and the handset.
  part(root, box(0.06, top, 2.92), CABIN, -2.6, D + top / 2, 0);
  part(root, rbox(0.04, 1.78, 0.68, 0.02), '#e8e6df', -2.56, D + 0.92, -0.92);
  picture(root, lavTex, 0.5, 0.74, -2.535, D + 1.1, -0.92, '#ffffff', Math.PI / 2);
  part(root, cyl(0.022, 0.022, 0.03, 10), CHROME, -2.54, D + 0.95, -0.66, { rz: Math.PI / 2 });
  for (let i = 0; i < 6; i++) part(root, cyl(0.022, 0.03, 1.74, 8), i % 2 ? NAVY : shade(NAVY, 0.84), -2.54, D + 0.95, 0.86 + i * 0.1, { outline: false });
  rod(root, v3(-2.54, D + 1.86, 0.76), v3(-2.54, D + 1.86, 1.44), 0.012, CHROME);
  part(root, rbox(0.32, 1.72, 0.4, 0.02), CABIN, -2.42, D + 0.86, 0.3);
  picture(root, cabinPanelTex, 0.15, 0.2, CM.panel[0], CM.panel[1], CM.panel[2] - 0.015);
  part(root, rbox(0.09, 0.2, 0.03, 0.01), BLACK, CM.handset[0], CM.handset[1], CM.handset[2] - 0.03);
  const handset = group(root);
  part(handset, rbox(0.05, 0.17, 0.04, 0.015), '#37474f', 0, 0, 0);
  part(handset, ball(0.024), '#263238', 0, 0.075, 0.01, { outline: false });
  part(handset, ball(0.024), '#263238', 0, -0.075, 0.01, { outline: false });
  const cordDots: THREE.Mesh[] = [];
  for (let i = 0; i < 7; i++) cordDots.push(part(root, ball(0.01), BLACK, 0, 0, 0, { outline: false }));
  // Folded jump seat on the aft bulkhead.
  part(root, rbox(0.06, 0.34, 0.42, 0.02), SEAT_D, -2.55, D + 0.6, -0.1);
  label(root, '승무원', 0.26, 0.07, -2.515, D + 0.6, -0.1, SEAT_D, '#ffffff', Math.PI / 2);
  // People, drawn in as it's used.
  const pp = (look: Look, row: number, z: number) => {
    const f = person(g, look, CM.rows[row], z, R, CM.seat, D);
    f.root.visible = false;
    return f;
  };
  const crowd = [pp(LOOKS.passB, 0, CM.far[1]), pp(LOOKS.passC, 1, CM.far[0]), pp(LOOKS.passD, 3, CM.far[1]), pp(LOOKS.passE, 3, CM.near[1]), pp(LOOKS.passA, 0, CM.near[0])];
  const p1 = pp(LOOKS.passB, 2, CM.far[2]);
  const p2 = pp(LOOKS.passA, 1, CM.near[0]);
  const nervous = pp(LOOKS.nervous, 1, CM.near[0]);
  const lapBlanket = group(nervous.root);
  part(lapBlanket, rbox(0.42, 0.05, 0.46, 0.02), SKY, 0, CM.seat + 0.16, 0.22);
  part(lapBlanket, box(0.4, 0.012, 0.06), CORAL, 0, CM.seat + 0.19, 0.42, { outline: false });
  // The cart and what's on it.
  const cart = serviceCart(root, -Math.PI / 2);
  part(cart.top, cyl(0.03, 0.022, 0.09, 10), '#fafafa', 0.07, 0.045, 0.2);
  part(cart.top, cyl(0.03, 0.022, 0.09, 10), '#fafafa', -0.07, 0.045, 0.2);
  part(cart.top, cyl(0.03, 0.022, 0.09, 10), '#fafafa', 0.07, 0.045, 0.14);
  for (let i = 0; i < 4; i++) part(cart.top, cyl(0.03, 0.03, 0.11, 10), i % 2 ? '#c62828' : '#2e7d32', -0.1 + i * 0.07, 0.055, -0.18);
  const tray = mealTray(root);
  const pot = coffeePot(root);
  const cup = paperCup(root);
  const cupFill = cup.children[2] as THREE.Mesh;
  const stream = part(root, cyl(0.006, 0.006, 0.12, 6), '#5d3a1a', 0, 0, 0, { outline: false });
  const cupOn = paperCup(root, true);
  const can = group(root);
  part(can, cyl(0.03, 0.03, 0.11, 10), '#ef6c00', 0, 0.055, 0);
  const cup2 = paperCup(root, true);
  const cupHeld = paperCup(root, true);
  const wasteBag = group(root);
  part(wasteBag, rbox(0.17, 0.24, 0.12, 0.05), '#eceff1', 0, 0, 0);
  const waterCup = paperCup(root);
  const folded = group(root);
  part(folded, rbox(0.3, 0.07, 0.2, 0.03), SKY, 0, 0, 0);
  part(folded, box(0.28, 0.012, 0.03), CORAL, 0, 0.03, 0.08, { outline: false });
  const bag = carryOn(root);
  bag.t.rotation.y = Math.PI / 2;
  const clip = group(root);
  part(clip, rbox(0.18, 0.012, 0.24, 0.004), '#8d6e63', 0, 0, 0);
  part(clip, box(0.15, 0.002, 0.2), PAPER, 0, 0.008, -0.005, { outline: false });
  const card = group(root);
  part(card, box(0.14, 0.004, 0.2), PAPER, 0, 0, 0);
  clip.visible = card.visible = false;
  const movers: Record<string, THREE.Object3D> = { tray, pot, cup, cupOn, can, cup2, cupHeld, wasteBag, water: waterCup, folded, bag: bag.t, clip, card };
  const spots: Record<string, Spot> = {
    cabinService: standAt(root, 'faServe'),
    flightAttendant_zoneService: standAt(root, 'faZone'),
    faCalmPassenger: standAt(root, 'faCalm'),
    cabinAnnounce: standAt(root, 'faAnnounce'),
  };
  spots['*'] = spots.cabinService;
  // At rest: the cart parked behind the curtain's side, its pot on it, no passengers.
  const park: V = [-1.5, D, CM.A];
  const handHome = CM.handset;
  drive(root, out, spots, (now, N, t) => {
    const busy = !!now;
    for (const f of crowd) f.root.visible = busy && now !== 'faCalmPassenger';
    p1.root.visible = busy;
    p2.root.visible = busy && now !== 'faCalmPassenger';
    nervous.root.visible = now === 'faCalmPassenger';
    // The script's movers. The cart's own, or parked.
    const serve = now === 'cabinService' ? N : null;
    const n = N?.n ?? {};
    const cx = serve?.props.cart;
    cart.c.position.set(cx ? cx[0] : park[0], D, CM.A);
    cart.door.rotation.y = -1.75 * (n.door ?? 0);
    for (const k of Object.keys(movers)) {
      const m = movers[k];
      const p = N?.props[k];
      m.visible = !!p;
      if (p) place(m, p);
    }
    // Faces and arms.
    const turn = (f: Figure, k: number, a: number) => (f.head.rotation.y = k * a);
    if (now === 'cabinService') {
      turn(p1, n.look1 ?? 0, -1.1);
      turn(p2, n.look2 ?? 0, 1.1);
      t1.rotation.z = Math.PI / 2 - (Math.PI / 2) * (n.table1 ?? 0);
      t2.rotation.z = Math.PI / 2 - (Math.PI / 2) * (n.table2 ?? 0);
      p1.armL(n.table1 > 0.9 ? v3(CM.rows[2] - 0.32, CM.tableY + 0.06, CM.far[2] + 0.08) : null);
      p2.armR(N?.props.hand2 ? v3(-N.props.hand2[0], N.props.hand2[1] + 0.04, N.props.hand2[2]) : null);
      if (cup.visible) setCupFill(cupFill, n.cupFull ?? 0);
      stream.visible = (n.stream ?? 0) > 0.5 && !!N?.props.cup;
      if (stream.visible && N?.props.cup) {
        const c = N.props.cup;
        stream.position.set(c[0], c[1] + 0.13, c[2]);
      }
    } else {
      turn(p1, 0, 0);
      turn(p2, now === 'flightAttendant_zoneService' ? (n.look2 ?? 0) : 0, 1.1);
      t1.rotation.z = Math.PI / 2;
      t2.rotation.z = now === 'flightAttendant_zoneService' ? Math.PI / 2 - (Math.PI / 2) * (1 - (n.cupGone ?? 0)) : Math.PI / 2;
      p1.armL(null);
      // Clicking the belt in.
      p2.armR(now === 'flightAttendant_zoneService' && (n.belt ?? 0) > 0.01 && (n.belt ?? 0) < 0.99 ? v3(CM.rows[1] - 0.1, CM.seat + 0.13, CM.near[0]) : null);
      stream.visible = false;
    }
    // The bin door.
    const open = now === 'flightAttendant_zoneService' ? (n.bin ?? 0) : 0;
    binHinge.rotation.x = -1.2 * open;
    binDark.visible = open > 0.05;
    // A blind going up: the window over the near row at the far side.
    windows[2].set(now === 'flightAttendant_zoneService' && (n.blind ?? 0) < 0.5 ? blindTex : skyTex);
    // The nervous passenger: a hand wringing, shoulders with the breath, a blanket, the cup.
    if (now === 'faCalmPassenger') {
      const calm = n.calm ?? 0;
      const shake = (1 - calm) * 0.03 * Math.sin(t * 16);
      nervous.root.position.y = 0;
      nervous.head.rotation.y = (n.look ?? 0) * 1.0;
      nervous.head.rotation.x = 0.28 * (1 - calm) - 0.06 * ((n.breath ?? 0.5) - 0.5);
      const seatP = v3(CM.rows[1] - 0.2 + shake, CM.seat + 0.25, CM.near[0]);
      if ((n.sipping ?? 0) > 0.5) {
        const w = N?.props.water;
        if (w) {
          nervous.armR(v3(-w[0], w[1] + 0.03, w[2]));
          nervous.armL(seatP.clone().setZ(CM.near[0] + 0.1));
        }
      } else {
        nervous.armL(seatP.clone().setZ(CM.near[0] - 0.06));
        nervous.armR(seatP.clone().setZ(CM.near[0] + 0.06));
      }
      lapBlanket.visible = (n.blanket ?? 0) > 0.5;
      lapBlanket.scale.z = 0.4 + 0.6 * Math.min(1, (n.blanket ?? 0));
    } else {
      nervous.armL(null);
      nervous.armR(null);
      lapBlanket.visible = false;
    }
    // The handset on its cord, the signs, the mood.
    const hs = now === 'cabinAnnounce' ? (N?.props.handset ?? handHome) : handHome;
    place(handset, hs);
    handset.rotation.z = now === 'cabinAnnounce' && hs !== handHome ? 0.2 : 0;
    const from = v3(handHome[0] + 0.02, handHome[1] - 0.1, handHome[2]);
    cordDots.forEach((d, i) => {
      const k = (i + 1) / 8;
      d.position.set(from.x + (hs[0] - from.x) * k, from.y + (hs[1] - 0.09 - from.y) * k - 0.16 * Math.sin(k * Math.PI), from.z + (hs[2] - from.z) * k);
    });
    const signOn = now === 'cabinAnnounce' ? (n.sign ?? 0) > 0.5 : busy && now === 'flightAttendant_zoneService';
    for (const s of signs) setLit(s, signOn ? SIGN_ON : SIGN_OFF);
    const callOn = now === 'faCalmPassenger' && (n.call ?? 0) > 0.5;
    nearCalls.forEach((c, i) => setLit(c, callOn && i === 1 && Math.sin(t * 7) > -0.4 ? '#ffb300' : '#37474f'));
    const m = now === 'cabinAnnounce' ? (n.mood ?? 0) : 0;
    setLit(mood[0], m > 0.5 ? '#9fb7ff' : '#fff6e0');
    for (const f of floorLights) setLit(f, busy ? '#ffe9a8' : '#b0a68a');
  });
  place(handset, handHome);
  t1.rotation.z = t2.rotation.z = Math.PI / 2;
  windows[0].set(skyTex);
  out.work = marker(root, 0, 1.0, CM.A);
}
function setCupFill(m: THREE.Mesh, k: number) {
  m.visible = k > 0.05;
  m.position.y = 0.03 + 0.042 * k;
}

// =============================================================================================
// The 기내 갤리 (faGalley).

/**
 * A real aft galley across the tile: steel counter and panels, the cart's bay at the left with its red
 * latch, the 커피 브루어 with two pots and its lamp, the sink tap, the steam oven with its rack of meal
 * boxes, the sign of how to use it, standard stowage boxes up top, a waste flap and trays on the side.
 * learnGalley (faBrew): the sign read line by line, a pot filled, brewed, the oven's rack, the latch, a
 * cup poured and tried. faLoadCart (faLoad): the cart unlatched and pulled out, its door opened, three
 * trays and the drinks in, shut, and pushed home and latched.
 */
function galley(g: THREE.Group, out: Built) {
  const GL = FA.GL;
  const T = GL.top;
  // The back: floor-to-ceiling panel.
  part(g, box(3, 2.3, 0.06), '#dfe3e5', 0, 1.15, -0.47);
  part(g, box(3, 0.2, 0.08), NAVY, 0, 2.3, -0.45);
  label(g, `${AIR} 후방 갤리`, 1.1, 0.13, 0, 2.3, -0.405, NAVY, '#ffffff');
  // The bay at the left: walls, the cart's dark slot, the latch over it.
  part(g, box(0.05, T + 0.02, 0.6), STEEL, -1.47, (T + 0.02) / 2, -0.18);
  part(g, box(0.05, T + 0.02, 0.6), STEEL, -0.74, (T + 0.02) / 2, -0.18);
  part(g, box(0.72, T, 0.03), '#3c4146', -1.1, T / 2, -0.44, { outline: false });
  part(g, box(0.78, 0.04, 0.62), '#e4e8ea', -1.1, T, -0.18);
  const latch = group(g, GL.cart[0], 0.98, 0.14);
  part(latch, rbox(0.14, 0.03, 0.03, 0.01), '#c62828', 0, 0, 0);
  label(g, '잠금', 0.1, 0.04, GL.cart[0], 1.02, 0.15, '#fbe9e7', '#c62828');
  // The counter.
  part(g, rbox(2.22, 0.04, 0.62, 0.01), '#eef1f3', 0.37, T, -0.19);
  part(g, box(2.22, T - 0.02, 0.56), '#cfd5d9', 0.37, (T - 0.02) / 2, -0.2);
  // Doors under it, the waste flap.
  for (let i = 0; i < 4; i++) {
    const x = -0.45 + i * 0.55;
    part(g, rbox(0.5, 0.72, 0.012, 0.004), '#dde1e4', x, 0.48, 0.085);
    part(g, rbox(0.1, 0.02, 0.016, 0.005), '#90a4ae', x, 0.78, 0.095);
  }
  label(g, '쓰레기', 0.24, 0.07, -0.45, 0.55, 0.094, '#dde1e4', '#546e7a');
  label(g, '비상 식수', 0.26, 0.07, 0.1, 0.55, 0.094, '#dde1e4', '#546e7a');
  label(g, '린넨', 0.2, 0.07, 0.65, 0.55, 0.094, '#dde1e4', '#546e7a');
  label(g, '구급품', 0.24, 0.07, 1.2, 0.55, 0.094, '#dde1e4', '#c62828');
  // The tap and little sink, the placard over it.
  part(g, box(0.28, 0.01, 0.22), '#90a4ae', GL.tap[0], T + 0.022, GL.tap[2] + 0.04, { outline: false });
  rod(g, v3(GL.tap[0], T + 0.02, GL.tap[2] - 0.06), v3(GL.tap[0], T + 0.24, GL.tap[2] - 0.06), 0.012, CHROME);
  rod(g, v3(GL.tap[0], T + 0.24, GL.tap[2] - 0.06), v3(GL.tap[0], T + 0.2, GL.tap[2] + 0.06), 0.012, CHROME);
  const tapRun = part(g, cyl(0.005, 0.005, 0.1, 6), '#b3e5fc', GL.tap[0], T + 0.14, GL.tap[2] + 0.06, { outline: false });
  picture(g, placardTex, 0.3, 0.4, GL.placard[0], GL.placard[1], GL.placard[2]);
  // The tray stack.
  const stack = [0, 1, 2].map((i) => {
    const s = group(g, GL.trays[0], T + 0.03 + i * 0.016, GL.trays[2]);
    part(s, rbox(0.3, 0.014, 0.22, 0.005), '#b0bec5', 0, 0, 0);
    return s;
  });
  // The brewer: a steel face, two heads, the lamp and button, the pot's plate.
  part(g, rbox(0.48, 0.5, 0.26, 0.02), '#b6bec3', 0.12, T + 0.26, -0.32);
  part(g, box(0.5, 0.05, 0.3), '#8c969c', 0.12, T + 0.02, -0.16, { outline: false });
  part(g, box(0.46, 0.08, 0.24), '#9aa3a8', 0.12, T + 0.46, -0.18);
  label(g, '커피 브루어', 0.3, 0.05, 0.08, T + 0.47, -0.058, '#9aa3a8', '#ffffff');
  const brewLamp = ownLit(g, box(0.03, 0.03, 0.01), '#3e2723', 0.32, GL.brewBtn[1] + 0.06, GL.brewBtn[2] + 0.03);
  part(g, cyl(0.022, 0.022, 0.012, 10), '#2e7d32', GL.brewBtn[0], GL.brewBtn[1], GL.brewBtn[2] + 0.02, { rx: Math.PI / 2 });
  const pot = coffeePot(g);
  const pot2 = coffeePot(g);
  place(pot2, [0.24, T + 0.04, -0.14]);
  const level = part(pot, cyl(0.05, 0.05, 0.1, 12), '#4e342e', 0, 0.06, 0, { outline: false });
  level.scale.set(1.03, 0.2, 1.03);
  const drip = part(g, cyl(0.004, 0.004, 0.12, 6), '#4e342e', GL.pot[0], T + 0.32, GL.pot[2], { outline: false });
  // The oven: door hinged at its left, rack of casseroles sliding out, a lit window.
  part(g, rbox(0.56, 0.72, 0.42, 0.02), '#a9b1b6', GL.oven[0], T + 0.38, -0.25);
  part(g, box(0.48, 0.58, 0.02), '#30363a', GL.oven[0], T + 0.37, -0.038, { outline: false });
  const ovenGlow = ownLit(g, box(0.44, 0.5, 0.004), '#2a2420', GL.oven[0], T + 0.37, -0.026);
  const rack = group(g, GL.oven[0], GL.oven[1] - 0.08, 0.0);
  part(rack, box(0.42, 0.012, 0.34), STEEL, 0, 0, 0);
  for (const dx of [-0.13, 0.13]) part(rack, rbox(0.18, 0.05, 0.22, 0.01), '#e0e0e0', dx, 0.03, 0);
  rack.visible = false;
  const ovenDoor = group(g, GL.oven[0] - 0.27, T + 0.37, 0.0);
  part(ovenDoor, rbox(0.54, 0.66, 0.03, 0.01), '#cfd5d9', 0.27, 0, 0);
  part(ovenDoor, box(0.32, 0.3, 0.004), '#3a3f43', 0.27, 0.05, 0.016, { outline: false });
  part(ovenDoor, rbox(0.03, 0.2, 0.03, 0.01), BLACK, 0.5, 0, 0.03);
  label(ovenDoor, '스팀 오븐', 0.2, 0.05, 0.27, -0.22, 0.016, '#cfd5d9', '#37474f');
  // The oven's red latch.
  const ovLatch = group(g, GL.latch[0], GL.latch[1], GL.latch[2]);
  part(ovLatch, rbox(0.12, 0.03, 0.03, 0.01), '#c62828', 0, 0, 0);
  // Standard stowage boxes up top.
  for (let i = 0; i < 6; i++) {
    const x = -1.2 + i * 0.48;
    part(g, rbox(0.44, 0.36, 0.3, 0.01), '#d7dbde', x, 1.96, -0.27);
    part(g, rbox(0.12, 0.03, 0.02, 0.006), '#c62828', x, 1.96, -0.115);
    label(g, ['커피', '설탕', '컵', '물수건', '담요', '헤드셋'][i], 0.22, 0.07, x, 1.86, -0.117, '#d7dbde', '#455a64');
  }
  // A folded attendant's seat on the right wall.
  part(g, rbox(0.06, 1.9, 0.56, 0.01), '#e4e8ea', 1.47, 0.95, -0.2);
  // The cart.
  const cart = serviceCart(g, 0);
  const bottles = [0, 1, 2].map((i) => {
    const b = group(cart.top, -0.1 + i * 0.1, 0, -0.05);
    part(b, cyl(0.03, 0.035, 0.18, 10), ['#2e7d32', '#ef6c00', '#6d4c41'][i], 0, 0.09, 0);
    return b;
  });
  const tray = mealTray(g);
  const bottle = group(g);
  part(bottle, cyl(0.03, 0.035, 0.18, 10), '#2e7d32', 0, 0.09, 0);
  const potRest = GL.pot;
  const cup = paperCup(g, true);
  const stream = part(g, cyl(0.006, 0.006, 0.12, 6), '#4e342e', 0, 0, 0, { outline: false });
  const spots: Record<string, Spot> = {
    flightAttendant_learnGalley: standAt(g, 'faBrew'),
    faLoadCart: standAt(g, 'faLoad'),
  };
  spots['*'] = spots.faLoadCart;
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    const brew = now === 'flightAttendant_learnGalley';
    const load = now === 'faLoadCart';
    // Cart.
    const cp = load ? (N?.props.cart ?? GL.cart) : GL.cart;
    cart.c.position.set(cp[0], 0, cp[2]);
    cart.door.rotation.y = -1.8 * (load ? (n.door ?? 0) : 0);
    const nt = load ? (n.trays ?? 0) : 0;
    cart.shelf.forEach((s, i) => (s.visible = i < nt));
    const nd = load ? (n.drinks ?? 0) : 0;
    bottles.forEach((b, i) => (b.visible = i < Math.floor(nd)));
    latch.rotation.z = (load ? (n.latch ?? 0) : 0) * 1.2;
    const ns = load ? (n.stack ?? 3) : 3;
    stack.forEach((s, i) => (s.visible = i < ns));
    tray.visible = !!(load && N?.props.tray);
    if (tray.visible) place(tray, N!.props.tray!);
    bottle.visible = !!(load && N?.props.bottle);
    if (bottle.visible) place(bottle, N!.props.bottle!);
    // Brew.
    place(pot, brew && N?.props.pot ? N.props.pot : potRest);
    level.scale.y = Math.max(0.05, (brew ? (n.level ?? 0.5) : 0.5) * 1.3);
    tapRun.visible = brew && (n.tapRun ?? 0) > 0.5;
    const brewing = brew && (n.brewing ?? 0) > 0.5;
    setLit(brewLamp, brewing && Math.sin(t * 6) > -0.2 ? '#ff7043' : brew ? '#ffcc80' : '#3e2723');
    drip.visible = brewing;
    ovenDoor.rotation.y = -1.9 * (brew ? (n.oven ?? 0) : 0);
    const out = brew ? (n.rack ?? 0) : 0;
    rack.visible = out > 0.02;
    rack.position.z = 0.05 + 0.34 * out;
    ovLatch.rotation.z = (brew ? (n.latch ?? 0) : 0) * 1.2;
    setLit(ovenGlow, brew && (n.ovenOn ?? 0) > 0.5 ? '#ffb74d' : '#2a2420');
    cup.visible = !!(brew && N?.props.cup);
    if (cup.visible) place(cup, N!.props.cup!);
    stream.visible = brew && (n.stream ?? 0) > 0.5 && !!N?.props.cup;
    if (stream.visible) {
      const c = N!.props.cup!;
      stream.position.set(c[0], c[1] + 0.13, c[2]);
    }
  });
  place(pot, potRest);
  out.work = marker(g, 0.1, T + 0.02, -0.1);
}

// =============================================================================================
// The 비상 탈출 슬라이드 (evacSlide).

/**
 * The door trainer, seen from the side: a stretch of fuselage across the back with its windows, a deck
 * a metre up with rails and stairs at the left, the door in a wall across (its window, the arming
 * lever, the big handle and the assist handle), a girt-bar pack at the sill, and the yellow slide that
 * blows out from it over a blue landing mat. evacDrill (faEvac): up the stairs, the window checked, the
 * lever armed, the handle up, the door pushed out, the slide bursting, a trainee waved down it, then
 * sat at the sill and down it themselves, stood clear of its foot and waving; it sags as they reset it.
 */
function evacSlide(root: THREE.Group, out: Built) {
  const EV = FA.EV;
  // Drawn with the slide running to -x, then mirrored so it comes down towards the game's camera.
  const g = mirror(root);
  const dk = EV.deck;
  // The fuselage across the back.
  part(g, box(1.52, 2.85, 0.1), '#f7f7f4', 1.76, 1.42, -0.95);
  part(g, box(1.52, 0.14, 0.104), NAVY, 1.76, 1.75, -0.95, { outline: false });
  part(g, box(1.52, 0.04, 0.104), CORAL, 1.76, 1.65, -0.95, { outline: false });
  for (const x of [2.3, 1.76, 1.24]) {
    part(g, rbox(0.26, 0.34, 0.012, 0.08), '#c9ced0', x, 2.05, -0.895, { outline: false });
    picture(g, skyTex, 0.18, 0.26, x, 2.05, -0.887);
  }
  unflip(label(g, AIR, 0.9, 0.2, 1.76, 2.55, -0.895, '#f7f7f4', NAVY));
  // The deck.
  part(g, box(1.52, 0.08, 2.0), '#6b7680', 1.76, dk - 0.04, 0);
  for (let i = 0; i < 7; i++) part(g, box(1.52, 0.004, 0.04), '#59636c', 1.76, dk + 0.002, -0.85 + i * 0.28, { outline: false });
  for (const [x, z] of [[1.1, -0.92], [2.45, -0.92], [1.1, 0.92]] as const) part(g, cyl(0.03, 0.03, dk - 0.04, 8), STEEL, x, (dk - 0.04) / 2, z);
  // The stairs at the far end, rising to the back.
  const n = 5;
  for (let i = 0; i < n; i++) {
    const y = ((i + 0.5) / n) * dk;
    const z = 0.95 - ((i + 0.5) / n) * 1.0;
    part(g, box(0.72, 0.04, 0.24), '#8a95a0', 2.12, y, z);
  }
  for (const x of [2.48, 1.76]) rod(g, v3(x, 0.02, 0.98), v3(x, dk, -0.05), 0.024, '#8a95a0');
  for (const x of [2.48, 1.76]) rod(g, v3(x, 0.92, 0.98), v3(x, dk + 0.92, -0.05), 0.016, CHROME);
  // Rails on the deck's near side.
  rod(g, v3(1.76, dk + 0.92, 0.95), v3(1.1, dk + 0.92, 0.95), 0.018, CHROME);
  rod(g, v3(1.76, dk + 0.5, 0.95), v3(1.1, dk + 0.5, 0.95), 0.012, CHROME);
  for (const x of [1.76, 1.1]) rod(g, v3(x, dk, 0.95), v3(x, dk + 0.92, 0.95), 0.018, CHROME);
  // The door's frame: open posts and a lintel, so whoever's at it can be seen.
  const wallX = EV.door;
  part(g, box(0.1, 1.98, 0.12), '#f7f7f4', wallX, dk + 0.99, -0.53);
  part(g, box(0.1, 1.98, 0.12), '#f7f7f4', wallX, dk + 0.99, 0.53);
  part(g, box(0.1, 0.12, 1.18), '#f7f7f4', wallX, dk + 1.94, 0);
  part(g, box(0.14, dk, 1.18), '#a7b0b8', wallX, dk / 2, 0);
  for (const z of [-0.47, 0.47]) part(g, box(0.12, 1.88, 0.024), CORAL, wallX - 0.01, dk + 0.94, z, { outline: false });
  part(g, box(0.06, 0.04, 1.0), '#ffb300', wallX - 0.05, dk + 0.01, 0, { outline: false });
  // The girt-bar pack.
  const pack = part(g, rbox(0.14, 0.2, 0.8, 0.03), '#fbc02d', wallX - 0.1, dk + 0.1, 0);
  unflip(label(g, '슬라이드', 0.3, 0.05, wallX - 0.172, dk + 0.1, 0, '#fbc02d', '#4e342e', -Math.PI / 2));
  // The door: hinged at the back of the opening (-z), opens out to -x. The handle and lever on its inner face (+x).
  const dh = group(g, wallX - 0.04, dk, -EV.doorHalf);
  part(dh, rbox(0.06, 0.74, 0.92, 0.02), '#eef0ee', 0, 0.39, 0.46);
  part(dh, box(0.06, 0.2, 0.92), '#eef0ee', 0, 1.74, 0.46);
  part(dh, box(0.06, 0.92, 0.1), '#eef0ee', 0, 1.2, 0.05);
  part(dh, box(0.06, 0.92, 0.3), '#eef0ee', 0, 1.2, 0.77);
  part(dh, box(0.008, 0.1, 0.84), NAVY, -0.034, 0.68, 0.46, { outline: false });
  part(dh, box(0.012, 0.92, 0.52), '#dff1fb', 0, 1.2, 0.36, { material: PANE, outline: false, shadow: false });
  const handle = group(dh, 0.05, 1.05, 0.74);
  part(handle, rbox(0.04, 0.04, 0.2, 0.014), '#c62828', 0, 0, -0.08);
  part(handle, cyl(0.02, 0.02, 0.06, 8), CHROME, 0, 0, 0, { rz: Math.PI / 2 });
  const lever = group(dh, 0.05, 0.28, 0.24);
  part(lever, rbox(0.03, 0.2, 0.04, 0.012), '#ffb300', 0, 0.08, 0);
  unflip(label(dh, '무장', 0.14, 0.05, 0.044, 0.52, 0.24, '#eef0ee', '#c62828', Math.PI / 2));
  unflip(label(dh, '열림', 0.14, 0.05, 0.044, 1.18, 0.7, '#eef0ee', '#c62828', Math.PI / 2));
  const green = ownLit(dh, box(0.006, 0.05, 0.05), '#124a12', 0.034, 1.72, 0.46);
  // The assist handle on the frame.
  const a = EV.assist;
  rod(g, v3(a[0], a[1] - 0.14, -0.53), v3(a[0], a[1] + 0.1, -0.53), 0.016, '#ffb300');
  // Beacon.
  const beacon = ownLit(g, ball(0.05), '#5d1a1a', wallX, dk + 2.04, 0);
  // The slide: a group that grows from the sill, out to -x.
  const X0 = 0.96;
  const slide = group(g, X0, 0, 0);
  const N = 12;
  const L = X0 - EV.slideEnd;
  const pt = (k: number, side: number, up: number) => {
    const lx = -(k / N) * L;
    return v3(lx, EV.slideY(lx + X0) + up, side);
  };
  for (let k = 0; k < N; k++) {
    for (const s of [-0.42, 0.42]) rod(slide, pt(k, s, 0.08), pt(k + 1, s, 0.08), 0.085, k % 2 ? '#fbc02d' : '#ffb300');
    for (const s of [-0.42, 0.42]) rod(slide, pt(k, s, 0.22), pt(k + 1, s, 0.22), 0.05, '#fdd835');
    const a0 = pt(k, 0, 0.03);
    const b0 = pt(k + 1, 0, 0.03);
    const mid = a0.clone().add(b0).multiplyScalar(0.5);
    const len = a0.distanceTo(b0);
    const bed = part(slide, box(len + 0.02, 0.02, 0.76), k % 3 === 1 ? '#ef9a9a' : '#fff176', mid.x, mid.y, mid.z, { outline: false });
    bed.rotation.z = Math.atan2(a0.y - b0.y, a0.x - b0.x);
    if (k > 0) for (const s of [-0.42, 0.42]) part(slide, cyl(0.012, 0.012, 0.14, 6), '#f9a825', a0.x, a0.y + 0.13, s, { outline: false });
  }
  const toe = pt(N, 0, 0.09);
  part(slide, cyl(0.1, 0.1, 0.94, 10), '#ffb300', toe.x, toe.y, 0, { rx: Math.PI / 2 });
  slide.visible = false;
  // The mat.
  part(g, rbox(1.3, 0.05, 1.1, 0.02), '#1565c0', -1.82, 0.025, 0.0);
  part(g, box(1.24, 0.006, 0.08), '#fafafa', -1.82, 0.055, 0.46, { outline: false });
  part(g, box(1.24, 0.006, 0.08), '#fafafa', -1.82, 0.055, -0.46, { outline: false });
  unflip(label(g, '비상 탈출 훈련', 1.0, 0.16, -0.7, 0.72, -0.85, '#fff8e1', '#c62828'));
  // A back rail along the slide's run.
  for (const x of [-0.1, -1.3]) part(g, cyl(0.02, 0.02, 1.0, 8), '#b0bec5', x, 0.5, -0.87);
  rod(g, v3(-0.1, 0.98, -0.87), v3(-1.3, 0.98, -0.87), 0.016, '#b0bec5');
  // Trainees: one sat and sliding, then one stood at the foot.
  const trainee = person(g, LOOKS.trainee, 0, 0, -Math.PI / 2, 0.4, 0);
  const stood = person(g, LOOKS.trainee, -2.34, 0.28, Math.PI / 2 - 0.3);
  trainee.root.visible = stood.root.visible = false;
  const vest = group(trainee.root);
  part(vest, rbox(0.36, 0.26, 0.24, 0.05), '#ff7043', 0, 0.77, -0.02);
  const sp = standAt(root, 'faEvac');
  const spots: Record<string, Spot> = { evacDrill: sp, '*': sp };
  drive(root, out, spots, (_now, Nw, t) => {
    const n = Nw?.n ?? {};
    const blow = n.blow ?? 0;
    dh.rotation.y = -(n.door ?? 0);
    handle.rotation.x = (n.handle ?? 0) * 0.9;
    lever.rotation.x = -(n.lever ?? 0) * 1.3;
    setLit(green, (n.green ?? 0) > 0.5 ? '#66ff66' : '#124a12');
    setLit(beacon, (n.lamp ?? 0) > 0.5 && Math.sin(t * 9) > 0 ? '#ff3d2e' : '#5d1a1a');
    slide.visible = blow > 0.02;
    pack.visible = blow < 0.5;
    if (slide.visible) {
      // Blowing out from the sill: it reaches out first, then fills.
      slide.scale.set(Math.max(0.02, blow), 1, 0.25 + 0.75 * THREE.MathUtils.smoothstep(blow, 0.4, 1));
    }
    const tr = n.train ?? 0;
    trainee.root.visible = (n.trainee ?? 0) > 0.5 && tr < 0.99;
    if (trainee.root.visible) {
      const x = 0.86 - tr * 2.86;
      const y = EV.slideY(x);
      trainee.root.position.set(x, y + 0.07 - 0.4, 0.02);
      trainee.armL(v3(x - 0.1, y + 0.72, 0.3));
      trainee.armR(v3(x - 0.1, y + 0.72, -0.26));
    }
    stood.root.visible = (n.stood ?? 0) > 0.5;
    if (stood.root.visible) stood.armL(v3(-2.3, 1.25, 0.6 + 0.15 * Math.sin(t * 5)));
  });
  out.work = marker(g, wallX, dk + 1.0, 0);
}

// =============================================================================================
// The 안전 시범 장비 (safetyDemoKit).

/**
 * A training corner on a navy mat: the 안전 시범 순서 board on its frame with vests on hooks and belts,
 * an arm carrying the passenger service panel the mask drops from, the AED cabinet, a first-aid case
 * and an extinguisher; two trainees on chairs. safetyDemo (faDemo): the belt, the mask, the vest (put
 * over the head, tied, blown up, its light on), the exits, the card. teachFirstAid (faCpr): a manikin on
 * the mat, shoulders tapped, the trainee sent to call, the AED fetched, pads on, thirty pressed, the
 * bag, and to the trainee.
 */
function safetyKit(g: THREE.Group, out: Built) {
  const DK = FA.DK;
  part(g, rbox(3.0, 0.03, 2.0, 0.01), '#2a4674', 0, 0.015, 0);
  part(g, box(2.96, 0.004, 0.05), '#ffd54f', 0, 0.032, 0.96, { outline: false });
  // A floor aisle line and exit arrows.
  for (let i = 0; i < 4; i++) part(g, box(0.16, 0.004, 0.05), '#ffd54f', 0.1 + i * 0.3, 0.033, 0.82, { ry: 0.6, outline: false });
  // The frame and board.
  for (const x of [-1.42, 0.22]) {
    part(g, cyl(0.03, 0.03, 1.72, 8), '#8a95a0', x, 0.86, -0.88);
    part(g, rbox(0.1, 0.03, 0.3, 0.01), '#8a95a0', x, 0.03, -0.82);
  }
  part(g, box(1.64, 1.6, 0.03), '#eef1f3', -0.6, 0.9, -0.9);
  rod(g, v3(-0.42, 0, -0.88), v3(-0.42, 2.0, -0.88), 0.025, '#8a95a0');
  picture(g, demoBoardTex, 0.72, 0.72, -0.18, 1.3, -0.88);
  picture(g, firstAidTex, 0.72, 0.34, -1.02, 1.5, -0.88);
  // Vests on hooks.
  for (let i = 0; i < 3; i++) {
    const x = -1.28 + i * 0.28;
    part(g, cyl(0.008, 0.008, 0.05, 6), CHROME, x, 1.26, -0.86, { rx: Math.PI / 2, outline: false });
    part(g, rbox(0.22, 0.34, 0.05, 0.03), i === 2 ? '#ff7043' : LIFE, x, 1.08, -0.85);
    part(g, box(0.04, 0.3, 0.052), '#c62828', x, 1.08, -0.85, { outline: false });
  }
  // Belts hung.
  for (let i = 0; i < 2; i++) {
    const x = -0.28 + i * 0.22;
    part(g, box(0.05, 0.36, 0.008), '#37474f', x, 0.72, -0.875, { outline: false });
    part(g, rbox(0.07, 0.05, 0.016, 0.005), CHROME, x, 0.54, -0.87);
  }
  // The AED cabinet, the first-aid case, the extinguisher.
  part(g, rbox(0.3, 0.3, 0.1, 0.01), '#e8f5e9', DK.aed[0], DK.aed[1] + 0.12, -0.86);
  label(g, 'AED', 0.2, 0.08, DK.aed[0], DK.aed[1] + 0.2, -0.808, '#2e7d32', '#ffffff');
  part(g, rbox(0.36, 0.22, 0.14, 0.02), '#fafafa', -0.2, 0.15, -0.72);
  part(g, box(0.1, 0.03, 0.002), '#c62828', -0.2, 0.15, -0.649, { outline: false });
  part(g, box(0.03, 0.1, 0.002), '#c62828', -0.2, 0.15, -0.649, { outline: false });
  part(g, cyl(0.06, 0.06, 0.34, 10), '#c62828', 0.08, 0.19, -0.78);
  part(g, cyl(0.02, 0.02, 0.05, 8), BLACK, 0.08, 0.38, -0.78);
  // The arm with the service panel; the mask's little door.
  rod(g, v3(-0.42, 2.0, -0.88), v3(DK.psu[0], 2.05, DK.psu[2]), 0.02, '#8a95a0');
  part(g, rbox(0.44, 0.07, 0.34, 0.015), '#f1f3f1', DK.psu[0], 2.02, DK.psu[2]);
  const psuDoor = group(g, DK.psu[0] - 0.08, 1.98, DK.psu[2]);
  part(psuDoor, box(0.16, 0.01, 0.14), '#d7dbd9', 0.08, 0, 0);
  const signLamp = ownLit(g, box(0.1, 0.012, 0.03), '#4b4b52', DK.psu[0] + 0.12, 1.98, DK.psu[2]);
  // Mask: cup, band, tube; shown when it drops.
  const mask = group(g);
  part(mask, cyl(0.04, 0.052, 0.07, 12), LIFE, 0, 0, 0, { rx: Math.PI / 2 });
  const tube = part(g, cyl(0.005, 0.005, 1, 6), '#e0e0e0', 0, 0, 0, { outline: false });
  const tubeLimb = limb(g, 0.005, '#e0e0e0');
  tube.visible = false;
  // Vest (worn or held): two yellow lobes and a collar, a lamp, a red tube.
  const vest = group(g);
  const lobes = [-1, 1].map((sx) => part(vest, rbox(0.14, 0.34, 0.08, 0.04), LIFE, sx * 0.09, 0, 0.04));
  part(vest, rbox(0.3, 0.08, 0.18, 0.03), LIFE, 0, 0.17, -0.02);
  part(vest, box(0.3, 0.012, 0.02), '#c62828', 0, -0.13, 0.05, { outline: false });
  const vestLamp = ownLit(vest, ball(0.016), '#5d4037', 0.12, 0.13, 0.09);
  const redTube = part(vest, cyl(0.006, 0.006, 0.14, 6), '#c62828', 0.045, 0.14, 0.08, { rx: 0.5, outline: false });
  // Belt ends.
  const beltL = group(g);
  part(beltL, rbox(0.1, 0.05, 0.02, 0.005), CHROME, 0, 0, 0);
  part(beltL, box(0.2, 0.05, 0.008), '#37474f', 0.14, 0, 0, { outline: false });
  const beltR = group(g);
  part(beltR, rbox(0.08, 0.04, 0.012, 0.004), STEEL, 0, 0, 0);
  part(beltR, box(0.2, 0.05, 0.008), '#37474f', -0.14, 0, 0, { outline: false });
  // The card held up.
  const card = group(g);
  picture(card, seatCardTex, 0.2, 0.3, 0, 0, 0);
  // Trainee chairs.
  const chairAt = (x: number, z: number, ry: number) => {
    const c = group(g, x, 0, z, ry);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(c, cyl(0.014, 0.012, 0.44, 8), CHROME, sx * 0.18, 0.22, sz * 0.17, { outline: false });
    part(c, rbox(0.42, 0.05, 0.4, 0.02), NAVY, 0, 0.45, 0);
    part(c, rbox(0.42, 0.34, 0.04, 0.02), NAVY, 0, 0.68, -0.19, { rx: -0.1 });
  };
  const CH: Array<[number, number, number]> = [[0.92, -0.42, -1.15], [1.14, 0.42, -1.7]];
  CH.forEach(([x, z, r]) => chairAt(x, z, r));
  const tA = person(g, LOOKS.trainee, CH[0][0], CH[0][1], CH[0][2], 0.47);
  const tB = person(g, LOOKS.traineeM, CH[1][0], CH[1][1], CH[1][2], 0.47);
  tA.root.visible = tB.root.visible = false;
  // The manikin: head, torso, arms, lying along z.
  const man = group(g, DK.chest[0], 0, DK.chest[2]);
  const chest = part(man, rbox(0.36, 0.18, 0.5, 0.08), '#e8d3bf', 0, 0.12, 0);
  part(man, cyl(0.05, 0.05, 0.06, 10), '#e8d3bf', 0, 0.12, -0.28, { rx: Math.PI / 2 });
  part(man, ball(0.1), '#e8d3bf', 0, 0.13, -0.42);
  for (const sx of [-1, 1]) {
    part(man, rbox(0.08, 0.08, 0.5, 0.03), '#e8d3bf', sx * 0.24, 0.07, 0.05);
    part(man, rbox(0.12, 0.1, 0.42, 0.04), '#37474f', sx * 0.09, 0.07, 0.46);
  }
  const pads = [ownLit(man, box(0.1, 0.01, 0.14), '#fafafa', -0.08, 0.215, -0.12), ownLit(man, box(0.1, 0.01, 0.14), '#fafafa', 0.1, 0.205, 0.1)];
  part(man, box(0.02, 0.002, 0.02), '#c62828', 0, 0.214, 0.0, { outline: false });
  man.visible = false;
  // The AED case in use, its lid; the bag-valve, a small counter on a stand.
  const aed = group(g);
  part(aed, rbox(0.28, 0.1, 0.2, 0.02), '#2e7d32', 0, 0.05, 0);
  label(aed, 'AED', 0.14, 0.05, 0, 0.051, 0.102, '#2e7d32', '#ffffff');
  const aedLid = group(aed, 0, 0.1, -0.1);
  part(aedLid, rbox(0.28, 0.018, 0.2, 0.006), '#1b5e20', 0, 0, 0.1);
  const aedLed = ownLit(aed, ball(0.012), '#8bc34a', -0.1, 0.11, 0.05);
  const bvm = group(g);
  part(bvm, rbox(0.14, 0.09, 0.1, 0.04), '#29b6f6', 0, 0, 0);
  part(bvm, cyl(0.04, 0.05, 0.05, 10), '#e0e0e0', 0, -0.05, 0);
  const counter = swapPic(g, 0.2, 0.13, 0.52, 0.68, 0.72);
  counter.set(countTex(0));
  const counterStand = group(g);
  part(counterStand, rbox(0.24, 0.17, 0.02, 0.01), BLACK, 0.52, 0.68, 0.705);
  part(counterStand, cyl(0.012, 0.012, 0.6, 8), '#8a95a0', 0.52, 0.3, 0.68);
  part(counterStand, rbox(0.18, 0.02, 0.18, 0.01), '#8a95a0', 0.52, 0.04, 0.68);
  counter.mesh.visible = false;
  const spots: Record<string, Spot> = { safetyDemo: standAt(g, 'faDemo'), flightAttendant_teachFirstAid: standAt(g, 'faCpr') };
  spots['*'] = spots.safetyDemo;
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    const demo = now === 'safetyDemo';
    const cpr = now === 'flightAttendant_teachFirstAid';
    tA.root.visible = tB.root.visible = !!now;
    // A nod from the class, the phone from one in CPR.
    tA.head.rotation.x = 0.1 * Math.max(0, Math.sin(t * 1.8));
    tB.head.rotation.x = 0.1 * Math.max(0, Math.sin(t * 1.3 + 1));
    const called = cpr && (n.callT ?? 0) > 0.5;
    tA.armR(called ? v3(CH[0][0] - 0.05, 1.07, CH[0][1] + 0.1) : null);
    // The mask.
    const psu = demo ? (n.psu ?? 0) : 0;
    psuDoor.rotation.z = -1.5 * psu;
    setLit(signLamp, psu > 0.5 ? '#ffd54f' : '#4b4b52');
    mask.visible = demo && !!N?.props.mask;
    tube.visible = mask.visible;
    if (mask.visible) {
      const m = N!.props.mask!;
      place(mask, m);
      tubeLimb(v3(DK.psu[0], 1.98, DK.psu[2]), v3(m[0], m[1] + 0.02, m[2]));
    }
    // Vest.
    const v = demo ? N?.props.vest : null;
    vest.visible = !!v;
    if (v) {
      place(vest, v);
      vest.rotation.y = DK.at.yaw;
      const puff = n.puff ?? 0;
      lobes.forEach((l) => l.scale.set(1 + 0.7 * puff, 1 + 0.15 * puff, 1 + 1.3 * puff));
      setLit(vestLamp, (n.lit ?? 0) > 0.5 && Math.sin(t * 8) > 0 ? '#fff176' : '#5d4037');
      redTube.visible = !!N?.props.tube;
    }
    beltL.visible = beltR.visible = demo && !!N?.props.beltL;
    if (beltL.visible) {
      place(beltL, N!.props.beltL!);
      place(beltR, N!.props.beltR!);
      beltL.rotation.y = beltR.rotation.y = DK.at.yaw;
    }
    card.visible = demo && !!N?.props.card;
    if (card.visible) {
      place(card, N!.props.card!);
      card.rotation.y = DK.at.yaw;
    }
    // CPR.
    man.visible = cpr;
    if (cpr) {
      chest.scale.y = 1 - 0.14 * (n.press ?? 0);
      for (const p of pads) p.visible = (n.pads ?? 0) > 0.5;
      man.children[2].rotation.x = (n.lift ?? 0) * 0.2;
    }
    aed.visible = cpr && !!N?.props.aed;
    if (aed.visible) {
      place(aed, N!.props.aed!);
      aedLid.rotation.x = -1.8 * (n.aedOpen ?? 0);
      setLit(aedLed, (n.aedOpen ?? 0) > 0.5 && Math.sin(t * 7) > 0 ? '#ffee58' : '#689f38');
    }
    bvm.visible = cpr && !!N?.props.bvm;
    if (bvm.visible) {
      place(bvm, N!.props.bvm!);
      bvm.scale.y = 1 - 0.3 * (n.lift ?? 0);
    }
    counter.mesh.visible = counterStand.visible = cpr;
    if (cpr) counter.set(countTex(n.count ?? 0));
  });
  out.work = marker(g, DK.at.x, 1.0, DK.at.z + 0.3);
}

// =============================================================================================
// The 비행 브리핑 스크린 (faBriefBoard).

/**
 * A wall of screen on its stand: today's flights idle, the cabin plan and roster for 임무 배정 with name
 * magnets dragged onto the doors (faAssign), the month's service numbers paged through and ticked for
 * 품질 회의 (faReview). Two crew stood by it answer.
 */
function briefBoard(g: THREE.Group, out: Built) {
  const BB = FA.BB;
  part(g, rbox(3.0, 1.46, 0.08, 0.02), BLACK, 0, 1.5, -0.42);
  const scr = swapPic(g, 2.86, 1.32, 0, 1.5, BB.z - 0.012);
  scr.set(boardHomeTex);
  for (const x of [-1.2, 1.2]) {
    part(g, box(0.1, 0.78, 0.06), '#37474f', x, 0.39, -0.43);
    part(g, rbox(0.14, 0.03, 0.36, 0.01), '#37474f', x, 0.02, -0.28);
  }
  part(g, rbox(2.2, 0.26, 0.2, 0.02), NAVY, 0, 0.5, -0.36);
  label(g, `${AIR} 비행 브리핑`, 1.2, 0.14, 0, 0.5, -0.257, NAVY, '#ffffff');
  // A speaker bar, a marker tray, a clock.
  part(g, rbox(1.2, 0.06, 0.06, 0.02), BLACK, 0, 0.72, -0.41);
  part(g, cyl(0.12, 0.12, 0.03, 18), '#fafafa', 1.25, 2.38, -0.44, { rx: Math.PI / 2 });
  rod(g, v3(1.25, 2.38, -0.42), v3(1.25, 2.46, -0.42), 0.006, BLACK);
  rod(g, v3(1.25, 2.38, -0.42), v3(1.31, 2.36, -0.42), 0.006, BLACK);
  const mags = [0, 1, 2].map((i) => {
    const m = group(g);
    part(m, rbox(0.3, 0.1, 0.012, 0.01), ['#1e88e5', '#ef5350', '#43a047'][i], 0, 0, 0);
    label(m, ['한 사무장', '유 승무원', '진 승무원'][i], 0.26, 0.08, 0, 0, 0.007, ['#1e88e5', '#ef5350', '#43a047'][i], '#ffffff');
    m.visible = false;
    return m;
  });
  const markBar = part(g, box(1, 0.012, 0.006), CORAL, 0, 1.32, BB.z - 0.008, { outline: false });
  markBar.visible = false;
  const c1 = person(g, LOOKS.crewF, -1.18, 0.84, 2.6);
  const c2 = person(g, LOOKS.crewM, 1.18, 0.84, -2.6);
  c1.root.visible = c2.root.visible = false;
  const spots: Record<string, Spot> = { flightAttendant_assignDuties: standAt(g, 'faAssign'), flightAttendant_reviewService: standAt(g, 'faReview') };
  spots['*'] = spots.flightAttendant_assignDuties;
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    c1.root.visible = c2.root.visible = !!now;
    if (now) {
      const nod = (n.nod ?? 0) * Math.max(0, Math.sin(t * 2.4));
      c1.head.rotation.x = 0.16 * nod;
      c2.head.rotation.x = 0.16 * nod;
      c1.armR((n.answered ?? 0) > 0.5 ? v3(-1.05, 1.5, 0.74) : null);
    }
    if (now === 'flightAttendant_assignDuties') scr.set(dutyMapTex);
    else if (now === 'flightAttendant_reviewService') scr.set(reviewTexes[Math.round(n.page ?? 0)]);
    else scr.set(boardHomeTex);
    mags.forEach((m, i) => {
      const p = now === 'flightAttendant_assignDuties' ? N?.props[`m${i}`] : null;
      m.visible = !!p;
      if (p) place(m, p);
    });
    const mk = now === 'flightAttendant_reviewService' ? (n.marked ?? 0) : 0;
    markBar.visible = mk > 0.02;
    if (markBar.visible) {
      markBar.scale.x = 0.8 * mk;
      markBar.position.x = -0.4 + 0.4 * mk;
    }
  });
  out.work = marker(g, 0, 1.4, BB.z);
}

// =============================================================================================
// The 브리핑 테이블 (faBriefTable).

/**
 * A long crew table with name cards and tablets, chairs round it. Sat at the far side, facing the room.
 * Preflight briefing (faBrief): the binder opened, notes, the manager at the end reading out the flight
 * and pointing, a hand raised, an answer, more notes. The quiz (faQuiz): the tablet lifted, three
 * questions tapped, answers turning green, a pass and the manager's thumb.
 */
function briefTable(g: THREE.Group, out: Built) {
  const BT = FA.BT;
  const T = BT.top;
  part(g, rbox(2.5, 0.05, 1.1, 0.02), '#d9dfe5', 0, T - 0.025, 0);
  part(g, box(2.46, 0.012, 0.04), NAVY, 0, T - 0.04, 0.54, { outline: false });
  for (const x of [-0.95, 0.95]) {
    part(g, rbox(0.1, T - 0.05, 0.7, 0.02), '#5d6d7e', x, (T - 0.05) / 2, 0);
    part(g, rbox(0.2, 0.03, 0.9, 0.01), '#4a5866', x, 0.02, 0);
  }
  // A flight folder pile, a water jug, name cards and a small model plane on its stand.
  part(g, rbox(0.3, 0.05, 0.22, 0.008), NAVY, 0.05, T + 0.025, 0.1);
  label(g, 'HN 317', 0.18, 0.05, 0.05, T + 0.052, 0.21, NAVY, '#ffffff');
  part(g, cyl(0.05, 0.06, 0.2, 12), '#e3f2fd', 0.6, T + 0.1, 0.0, { material: PANE });
  part(g, cyl(0.012, 0.012, 0.1, 6), STEEL, -0.02, T + 0.05, -0.1, { outline: false });
  const plane = group(g, -0.02, T + 0.11, -0.1, 0.5);
  part(plane, cyl(0.016, 0.016, 0.17, 10), '#fafafa', 0, 0, 0, { rx: Math.PI / 2 });
  part(plane, box(0.2, 0.005, 0.04), NAVY, 0, 0, 0, { outline: false });
  part(plane, box(0.004, 0.05, 0.03), CORAL, 0, 0.025, -0.07, { outline: false });
  // Chairs.
  const chair = (x: number, z: number, ry: number) => {
    const c = group(g, x, 0, z, ry);
    part(c, cyl(0.03, 0.04, 0.38, 8), '#37474f', 0, 0.22, 0);
    part(c, cyl(0.2, 0.22, 0.03, 12), '#37474f', 0, 0.02, 0);
    part(c, rbox(0.44, 0.06, 0.42, 0.03), SEAT, 0, 0.44, 0);
    part(c, rbox(0.42, 0.42, 0.05, 0.03), SEAT, 0, 0.72, -0.2, { rx: -0.08 });
  };
  chair(BT.seat.x, BT.seat.z, 0);
  chair(0.55, -0.82, 0);
  chair(-0.45, 0.82, Math.PI);
  chair(0.55, 0.82, Math.PI);
  // Each place: a card and a small tablet.
  const tablet = group(g);
  part(tablet, rbox(0.24, 0.01, 0.17, 0.008), BLACK, 0, 0, 0);
  const tabScr = swapPic(tablet, 0.21, 0.145, 0, 0.0065, 0, 0, -Math.PI / 2);
  tabScr.set(quizTexes[0]);
  place(tablet, BT.tablet);
  const binder = group(g);
  place(binder, BT.binder);
  part(binder, rbox(0.17, 0.018, 0.24, 0.006), NAVY, 0.085, 0.009, 0);
  const cover = group(binder);
  part(cover, rbox(0.17, 0.018, 0.24, 0.006), NAVY, -0.085, 0, 0);
  const page = picture(binder, flightCardTex(), 0.15, 0.21, 0.085, 0.02, 0);
  page.rotation.x = -Math.PI / 2;
  const page2 = picture(binder, notesTexes[0], 0.15, 0.21, -0.085, 0.02, 0);
  page2.rotation.x = -Math.PI / 2;
  const notes = (page2.material as THREE.MeshBasicMaterial);
  binder.visible = false;
  const pen = part(g, cyl(0.006, 0.006, 0.13, 6), '#1565c0', BT.pen[0], BT.pen[1], BT.pen[2], { rz: Math.PI / 2, ry: 0.5 });
  // Other places' tablets.
  for (const [x, z] of [[0.55, -0.36], [-0.45, 0.36], [0.55, 0.36]]) {
    part(g, rbox(0.22, 0.01, 0.16, 0.008), BLACK, x, T + 0.006, z);
    part(g, box(0.19, 0.002, 0.13), '#1c3557', x, T + 0.012, z, { outline: false });
  }
  // People.
  const mgr = person(g, LOOKS.manager, 1.36, 0.0, -Math.PI / 2);
  const crew1 = person(g, LOOKS.crewM, 0.55, -0.82, 0, 0.47);
  const crew2 = person(g, LOOKS.crewF, 0.55, 0.82, Math.PI, 0.47);
  const crew3 = person(g, LOOKS.traineeM, -0.45, 0.82, Math.PI, 0.47);
  const mgrTab = group(mgr.root);
  part(mgrTab, rbox(0.2, 0.28, 0.012, 0.01), BLACK, 0, 1.08, 0.2, { rx: -0.3 });
  mgr.root.visible = crew1.root.visible = crew2.root.visible = crew3.root.visible = false;
  const spots: Record<string, Spot> = { faPreflightBrief: standAt(g, 'faBrief'), faFlightQuiz: standAt(g, 'faQuiz') };
  spots['*'] = spots.faPreflightBrief;
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    const vis = !!now;
    mgr.root.visible = crew1.root.visible = crew2.root.visible = crew3.root.visible = vis;
    // The binder (briefing).
    binder.visible = now === 'faPreflightBrief';
    if (binder.visible) {
      cover.rotation.z = -Math.PI * (1 - (n.open ?? 0));
      page2.visible = (n.open ?? 0) > 0.5;
      const k = Math.min(notesTexes.length - 1, Math.floor((n.written ?? 0) * notesTexes.length));
      if (notes.map !== notesTexes[k]) {
        notes.map = notesTexes[k];
        notes.needsUpdate = true;
      }
    }
    // The tablet (quiz).
    tablet.visible = now !== 'faPreflightBrief';
    if (now === 'faFlightQuiz') {
      const p = N?.props.tablet ?? BT.tablet;
      place(tablet, p);
      tablet.rotation.x = 0.85 * (n.tilt ?? 0);
      tabScr.set(quizTexes[Math.round(n.screen ?? 0)]);
    } else {
      place(tablet, BT.tablet);
      tablet.rotation.x = 0;
      tabScr.set(quizTexes[0]);
    }
    pen.visible = now !== 'faFlightQuiz';
    // The manager: reading, pointing down at them, or a thumb up.
    const m = n.manager ?? 0;
    const mq = now === 'faFlightQuiz';
    if (vis) {
      const pts = !mq && m === 1;
      mgr.armR(pts ? v3(0.9, 1.15 + 0.05 * Math.sin(t * 2), -0.3) : null);
      mgr.armL(mq && m > 0.5 ? v3(1.15, 1.28, -0.34) : !mq && m === 3 ? v3(1.15, 1.22, 0.1) : null);
      mgr.head.rotation.y = !mq && m >= 2 ? 0.3 : 0;
      crew1.head.rotation.y = -0.9;
      crew2.head.rotation.y = 0.9 * Math.sin(t * 0.3);
      crew3.head.rotation.y = -1.0;
    }
  });
  out.work = marker(g, BT.tablet[0], BT.tablet[1], BT.tablet[2]);
}
function flightCardTex(): THREE.Texture {
  return painted('faFlightCard', 128, 192, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 128, 192);
    c.fillStyle = NAVY;
    c.fillRect(0, 0, 128, 28);
    text(c, 'HN 317 은빛만', 64, 14, 14, '#ffffff', 'center');
    ['승객 182명', '유아 2 · 휠체어 1', '난기류 예상 2시간 뒤', '특별식 7', '기장 브리핑 09:00'].forEach((s, i) => text(c, s, 8, 48 + i * 28, 12, '#263238'));
  });
}
const notesTexes = [0, 1, 2, 3].map((k) =>
  painted(`faNotes|${k}`, 128, 192, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 128, 192);
    c.strokeStyle = '#b0bec5';
    for (let i = 0; i < 9; i++) {
      c.beginPath();
      c.moveTo(6, 24 + i * 18);
      c.lineTo(122, 24 + i * 18);
      c.stroke();
    }
    ['182명', '휠체어 3열', '난기류 주의', '특별식 7'].slice(0, k).forEach((s, i) => text(c, s, 10, 16 + i * 36, 15, '#1a237e'));
  }),
);

// =============================================================================================
// The 승무원 라커 (faCrewLocker).

/**
 * A run of six navy lockers with name plates, a door that opens to a hung jacket, a hat on the shelf and
 * the carry-on below; a bench with what's packed for the trip (manual, shoes, overnight pouch).
 * faPackBag (faPack): the door opened, the bag out and laid on the bench, unzipped, three things packed,
 * zipped, its handle pulled and trundled along the lockers and back, the door shut.
 */
function crewLocker(g: THREE.Group, out: Built) {
  const LK = FA.LK;
  const cols = 6;
  const W = 2.9 / cols;
  part(g, box(2.94, 1.95, 0.52), shade(NAVY, 1.0), 0, 0.98, -0.2);
  part(g, box(2.94, 0.06, 0.54), NAVY_D, 0, 1.97, -0.2, { outline: false });
  part(g, box(2.94, 0.1, 0.54), NAVY_D, 0, 0.05, -0.2, { outline: false });
  const names = ['한하늘', '유미소', '진구름', '나비행', '오은별', '윤바다'];
  for (let i = 0; i < cols; i++) {
    const x = -1.45 + W * (i + 0.5);
    if (i === 2) {
      // The one that opens: dark inside, a shelf, a hanger.
      part(g, box(W - 0.05, 1.76, 0.02), '#1c2432', x, 1.03, 0.05, { outline: false });
      part(g, box(W - 0.06, 0.02, 0.32), '#8a95a0', x, 1.56, -0.12, { outline: false });
      // Hat on the shelf.
      part(g, cyl(0.1, 0.11, 0.06, 14), NAVY_D, x, 1.6, -0.1);
      part(g, cyl(0.13, 0.13, 0.012, 14), NAVY_D, x, 1.57, -0.06, { outline: false });
      // Hanger and jacket.
      rod(g, v3(x - 0.18, 1.4, -0.14), v3(x + 0.18, 1.4, -0.14), 0.01, CHROME);
      part(g, rbox(0.3, 0.58, 0.06, 0.03), NAVY, x, 1.1, -0.14);
      part(g, box(0.1, 0.5, 0.062), '#f7f7f7', x, 1.14, -0.14, { outline: false });
    } else {
      part(g, rbox(W - 0.03, 1.74, 0.02, 0.006), i % 2 ? shade(NAVY, 1.2) : NAVY, x, 1.03, 0.06);
      part(g, rbox(0.03, 0.14, 0.03, 0.01), CHROME, x + W / 2 - 0.07, 1.14, 0.08);
      for (let k = 0; k < 3; k++) part(g, box(0.2, 0.012, 0.004), '#0a1a30', x, 1.76 - k * 0.03, 0.072, { outline: false });
      label(g, names[i], 0.26, 0.07, x, 1.56, 0.072, '#f7f7f7', NAVY);
    }
  }
  // The door.
  const X = -1.45 + W * 2.5;
  const dh = group(g, X - W / 2 + 0.015, 1.03, 0.07);
  part(dh, rbox(W - 0.03, 1.74, 0.02, 0.006), NAVY, W / 2 - 0.015, 0, 0);
  part(dh, rbox(0.03, 0.14, 0.03, 0.01), CHROME, W - 0.08, 0.11, 0.02);
  label(dh, names[2], 0.26, 0.07, W / 2, 0.53, 0.012, '#f7f7f7', NAVY);
  // A mirror inside the door, a photo.
  part(dh, box(0.2, 0.3, 0.004), '#cfe3ee', W / 2, 0.35, -0.014, { material: MIRROR, outline: false });
  // Bench.
  const b = LK.bench;
  part(g, rbox(1.3, 0.05, 0.3, 0.02), '#a8774f', b[0] - 0.02, LK.y, b[2]);
  for (const x of [b[0] - 0.56, b[0] + 0.52]) part(g, box(0.06, LK.y, 0.26), '#37474f', x, LK.y / 2, b[2]);
  // Bag.
  const bag = carryOn(g);
  bag.t.scale.setScalar(0.9);
  // A second bag already out on the far end, shoes under the bench.
  const other = carryOn(g);
  place(other.t, [-1.28, 0, 0.3]);
  other.t.scale.setScalar(0.85);
  other.handle.scale.y = 0.2;
  for (const sx of [-1, 1]) part(g, rbox(0.08, 0.08, 0.22, 0.03), BLACK, 0.3 + sx * 0.06, 0.04, 0.38);
  // What's packed.
  const itemsAt = LK.items;
  const shapes = [
    () => {
      const m = group(g);
      part(m, rbox(0.17, 0.03, 0.22, 0.006), '#c62828', 0, 0.015, 0);
      label(m, '업무 교범', 0.13, 0.04, 0, 0.032, 0.08, '#c62828', '#ffffff');
      return m;
    },
    () => {
      const m = group(g);
      for (const sx of [-1, 1]) part(m, rbox(0.075, 0.07, 0.2, 0.03), BLACK, sx * 0.05, 0.035, 0);
      return m;
    },
    () => {
      const m = group(g);
      part(m, rbox(0.17, 0.08, 0.12, 0.03), CORAL, 0, 0.04, 0);
      return m;
    },
  ];
  const rests = shapes.map((s, i) => {
    const m = s();
    place(m, itemsAt[i]);
    return m;
  });
  const moving = shapes.map((s) => {
    const m = s();
    m.visible = false;
    return m;
  });
  const sp = standAt(g, 'faPack');
  const spots: Record<string, Spot> = { faPackBag: sp, '*': sp };
  drive(g, out, spots, (now, N) => {
    const n = N?.n ?? {};
    dh.rotation.y = -1.9 * (n.door ?? 0);
    const p = N?.props.bag ?? LK.inBag;
    place(bag.t, p);
    bag.lid.rotation.x = -1.3 * (n.lid ?? 0);
    bag.handle.scale.y = 0.1 + 0.9 * (n.handle ?? 0);
    bag.t.rotation.x = 0;
    bag.t.rotation.z = 0;
    bag.t.rotation.x = -0.3 * (n.tilt ?? 0);
    const packed = n.packed ?? 0;
    rests.forEach((m, i) => (m.visible = !now || i >= packed));
    moving.forEach((m, i) => {
      const q = N?.props.item;
      m.visible = !!q && i === Math.floor(packed);
      if (m.visible) {
        place(m, q!);
        rests[i].visible = false;
      }
    });
  });
  place(bag.t, LK.inBag);
  bag.handle.scale.y = 0.1;
  out.work = marker(g, X, 1.1, 0.06);
}

// =============================================================================================
// The 그루밍 코너 (faGroomCorner).

/**
 * A rail of navy uniforms, jackets and blouses with the scarves in coral and sky, caps on a shelf and
 * shoes under it; a full-length mirror edged with bulbs that come on; the 용모 복장 점검표 on the wall;
 * a senior purser drawn in with their clipboard. faGroomCheck (faGroom): the bulbs on, a scarf off the
 * rail and tied at the neck, the cap put on, the hair tucked, the name badge pinned, a full turn, ticks on
 * the sheet and the senior's nod.
 */
function groomCorner(g: THREE.Group, out: Built) {
  const GC = FA.GC;
  part(g, box(3.0, 2.3, 0.05), '#e7dfd6', 0, 1.15, -0.47);
  part(g, box(3.0, 0.1, 0.06), NAVY, 0, 0.05, -0.46, { outline: false });
  label(g, '단정한 용모가 첫 인사입니다', 1.2, 0.13, 0.42, 2.22, -0.44, '#e7dfd6', NAVY);
  // The rail.
  for (const x of [-1.4, -0.12]) part(g, cyl(0.016, 0.016, 1.72, 8), CHROME, x, 0.86, -0.1);
  rod(g, v3(-1.4, 1.7, -0.1), v3(-0.12, 1.7, -0.1), 0.012, CHROME);
  for (let i = 0; i < 5; i++) {
    const x = -1.3 + i * 0.2;
    rod(g, v3(x - 0.14, 1.64, -0.1), v3(x + 0.14, 1.64, -0.1), 0.006, CHROME);
    part(g, rbox(0.3, 0.74, 0.08, 0.03), i % 3 === 2 ? '#fafafa' : NAVY, x, 1.26, -0.1);
    if (i % 3 !== 2) part(g, box(0.08, 0.4, 0.084), '#fafafa', x, 1.42, -0.1, { outline: false });
  }
  // The scarves over the rail's end.
  for (let i = 0; i < 3; i++) part(g, rbox(0.1, 0.5, 0.02, 0.006), [CORAL, SKY, '#d4a640'][i], -0.42 + i * 0.13, 1.44, -0.08);
  // Shoes under.
  for (let i = 0; i < 5; i++) part(g, rbox(0.08, 0.08, 0.22, 0.03), i % 2 ? BLACK : NAVY_D, -1.25 + i * 0.22, 0.04, 0.05);
  // Caps on a little shelf.
  part(g, box(0.34, 0.02, 0.24), '#a8774f', GC.capShelf[0], GC.capShelf[1] - 0.02, GC.capShelf[2]);
  part(g, cyl(0.1, 0.11, 0.06, 14), NAVY_D, GC.capShelf[0] - 0.08, GC.capShelf[1] + 0.03, GC.capShelf[2]);
  // The mirror.
  const m = GC.mirror;
  part(g, rbox(0.86, 2.0, 0.04, 0.02), '#a8774f', m[0], 1.08, m[2] - 0.02);
  part(g, box(0.76, 1.9, 0.01), '#cfe3ee', m[0], 1.08, m[2], { material: MIRROR, outline: false });
  // A soft shine on it.
  part(g, box(0.1, 1.8, 0.002), '#eaf4fa', m[0] - 0.2, 1.08, m[2] + 0.007, { rz: 0.1, outline: false });
  const bulbs: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) for (const sx of [-1, 1]) bulbs.push(ownLit(g, ball(0.026), '#a39a7d', m[0] + sx * 0.43, 0.42 + i * 0.22, m[2] + 0.02));
  // The switch.
  part(g, rbox(0.08, 0.12, 0.02, 0.006), '#fafafa', GC.lightBtn[0], GC.lightBtn[1], GC.lightBtn[2]);
  // The sheet.
  part(g, rbox(0.42, 0.56, 0.02, 0.006), '#8d6e63', GC.sheet[0], GC.sheet[1], GC.sheet[2] - 0.02);
  const sheet = swapPic(g, 0.36, 0.48, GC.sheet[0], GC.sheet[1], GC.sheet[2] - 0.005);
  sheet.set(checkTex(0));
  // A stool, a mini kit (comb, lipstick, hairspray) on a side shelf.
  part(g, rbox(0.34, 0.02, 0.2, 0.006), '#a8774f', 1.2, 0.86, -0.36);
  part(g, cyl(0.022, 0.022, 0.13, 8), '#c2185b', 1.08, 0.94, -0.36);
  part(g, cyl(0.03, 0.03, 0.17, 8), '#546e7a', 1.2, 0.95, -0.36);
  part(g, rbox(0.14, 0.02, 0.03, 0.006), BLACK, 1.3, 0.885, -0.33);
  // What's put on.
  const scarf = group(g);
  part(scarf, rbox(0.17, 0.04, 0.14, 0.016), CORAL, 0, 0, 0);
  part(scarf, rbox(0.05, 0.11, 0.012, 0.005), CORAL, 0.03, -0.07, 0.07, { rz: 0.25 });
  part(scarf, ball(0.022), CORAL, 0, -0.005, 0.07, { outline: false });
  const held = group(g);
  part(held, rbox(0.08, 0.4, 0.012, 0.005), CORAL, 0, -0.18, 0);
  const cap = group(g);
  part(cap, cyl(0.098, 0.104, 0.06, 14), NAVY_D, 0, 0.03, 0);
  part(cap, cyl(0.126, 0.126, 0.012, 16), NAVY_D, 0, 0.006, 0.02, { outline: false });
  part(cap, box(0.05, 0.022, 0.004), '#d4a640', 0, 0.035, 0.102, { outline: false });
  const badge = group(g);
  part(badge, rbox(0.075, 0.022, 0.008, 0.003), '#d4a640', 0, 0, 0);
  const senior = person(g, LOOKS.manager, -1.2, 0.62, 1.2);
  senior.root.visible = false;
  const clip = group(senior.root);
  part(clip, rbox(0.18, 0.24, 0.012, 0.004), '#8d6e63', 0.1, 1.02, 0.22, { rx: 0.5 });
  const sp = standAt(g, 'faGroom');
  const spots: Record<string, Spot> = { faGroomCheck: sp, '*': sp };
  drive(g, out, spots, (now, N, t) => {
    const n = N?.n ?? {};
    for (const b of bulbs) setLit(b, (n.lights ?? 0) > 0.5 ? '#fff4c8' : '#a39a7d');
    senior.root.visible = !!now;
    if (now) {
      senior.armL(v3(-0.95, 1.08, 0.85));
      senior.armR((n.senior ?? 0) > 0.5 ? v3(-0.9 + 0.03 * Math.sin(t * 8), 1.12, 0.72) : null);
      senior.head.rotation.x = 0.12 * Math.max(0, Math.sin(t * 1.5)) * (n.senior ?? 0);
    }
    sheet.set(checkTex(Math.round(n.ticks ?? 0)));
    const yaw = N?.st.yaw ?? 0;
    const put = (m: THREE.Object3D, k: string, spin = true) => {
      const p = N?.props[k] ?? null;
      m.visible = !!p;
      if (p) {
        place(m, p);
        if (spin) m.rotation.y = yaw;
      }
    };
    put(scarf, 'scarf');
    put(held, 'held');
    put(cap, 'cap');
    put(badge, 'badge');
  });
  out.work = marker(g, m[0], 1.3, m[2]);
}

// =============================================================================================
// The crew bus (crewGate), the show-up desk, the apron behind and the front (2026-11-05, the layout audit: the gate stood as a
// booth on the lawn by the road; crews ride the company's crew bus from the centre to the aircraft).

/**
 * 크루 버스 (crewGate, 5 × 2, set 'left' so its nose is to the street and its door to the west, where the crew stand with their
 * bags): a navy and coral 25-seat bus with the airline's name, the destination board over the windscreen (탑승 준비 / 비행 중),
 * the door open; on its bay the painted lines and the stop's sign with the aircraft it goes to. Off on a flight it pulls straight
 * out to the street and is gone; coming back it reverses into its bay.
 */
function crewGate(g: THREE.Group, out: Built) {
  // The bay: its lines and the stop sign at the door side's back corner (local -x, +z).
  for (const z of [-0.95, 0.95]) part(g, box(4.9, 0.004, 0.06), '#fafafa', 0, 0.006, z, { outline: false });
  part(g, cyl(0.03, 0.03, 2.2, 8), STEEL, -2.25, 1.1, 0.9);
  part(g, rbox(0.62, 0.42, 0.04, 0.01), NAVY, -2.25, 2.0, 0.92);
  label(g, '크루 버스 승차장', 0.56, 0.1, -2.25, 2.1, 0.945, NAVY, '#ffffff');
  picture(g, tailTex, 0.3, 0.22, -2.25, 1.9, 0.945);
  const bus = group(g);
  const L = 4.8;
  const hw = 0.9;
  const H = 2.55;
  // Wheels, body, roof, the coral band, the windows down each side.
  const wheels: THREE.Mesh[] = [];
  for (const x of [L / 2 - 0.85, -L / 2 + 0.9])
    for (const sz of [-1, 1]) {
      wheels.push(part(bus, cyl(0.34, 0.34, 0.22, 18), BLACK, x, 0.34, sz * (hw - 0.1), { rx: Math.PI / 2 }));
      part(bus, cyl(0.18, 0.18, 0.23, 12), STEEL, x, 0.34, sz * (hw - 0.1), { rx: Math.PI / 2, outline: false });
    }
  part(bus, rbox(L, H - 0.35, hw * 2, 0.12), '#fafafa', 0, 0.35 + (H - 0.35) / 2, 0);
  part(bus, box(L - 0.1, 0.5, hw * 2 + 0.01), NAVY, 0, 0.62, 0, { outline: false });
  part(bus, box(L - 0.1, 0.1, hw * 2 + 0.012), CORAL, 0, 0.92, 0, { outline: false });
  for (const sz of [-1, 1]) {
    part(bus, box(L - 1.0, 0.7, 0.02), '#2b3a4a', -0.35, 1.72, sz * (hw + 0.005), { outline: false });
    label(bus, AIR, 0.9, 0.22, -0.6, 1.15, sz * (hw + 0.012), '#fafafa', NAVY, sz > 0 ? 0 : Math.PI);
  }
  // The nose: the windscreen, the destination board, the lamps.
  part(bus, box(0.02, 1.0, hw * 2 - 0.2), '#2b3a4a', L / 2 + 0.005, 1.65, 0, { outline: false });
  part(bus, box(0.04, 0.26, hw * 2 - 0.3), BLACK, L / 2 + 0.01, 2.3, 0);
  const dest = swapPic(bus, 1.2, 0.22, L / 2 + 0.035, 2.3, 0, Math.PI / 2);
  dest.set(gateReady);
  for (const sz of [-1, 1]) part(bus, box(0.03, 0.12, 0.26), '#fff59d', L / 2 + 0.01, 0.75, sz * (hw - 0.25), { outline: false });
  // The door, open, by the nose on the crew's side (+z); the step.
  part(bus, box(0.8, 1.9, 0.03), '#1b2733', L / 2 - 0.75, 1.3, hw + 0.012, { outline: false });
  part(bus, box(0.7, 0.08, 0.3), '#90a4ae', L / 2 - 0.75, 0.28, hw + 0.12);
  // Carry-ons waiting at the door when the bus is in, lined up for the hold.
  const bags = group(g);
  for (let i = 0; i < 3; i++) {
    const x = 0.9 - i * 0.55;
    part(bags, rbox(0.36, 0.52, 0.22, 0.04), [NAVY, '#37474f', NAVY_D][i], x, 0.3, hw + 0.45);
    part(bags, box(0.02, 0.3, 0.02), CHROME, x, 0.72, hw + 0.45, { outline: false });
    part(bags, box(0.2, 0.02, 0.02), CHROME, x, 0.87, hw + 0.45, { outline: false });
  }
  let state: 'parked' | 'leaving' | 'gone' | 'back' | undefined;
  let since = 0;
  const PULL = 10;
  out.away = (isOut, t) => {
    if (state === undefined) state = isOut ? 'gone' : 'parked';
    else if (isOut && (state === 'parked' || state === 'back')) [state, since] = ['leaving', t];
    else if (!isOut && (state === 'leaving' || state === 'gone')) [state, since] = ['back', t];
    const dt = Math.max(0, t - since);
    let x = 0;
    if (state === 'leaving') {
      const u = Math.min(1, dt / 4.5);
      x = PULL * u * u;
      if (u >= 1) state = 'gone';
    } else if (state === 'back') {
      const u = Math.min(1, dt / 6);
      x = PULL * (1 - u) * (1 - u);
      if (u >= 1) state = 'parked';
    }
    bus.position.x = x;
    bus.visible = state !== 'gone';
    bags.visible = state === 'parked';
    for (const w of wheels) w.rotation.y = -x / 0.34;
    dest.set(isOut ? gateFly : gateReady);
  };
}

/**
 * 쇼업 데스크 (3 × 1, against the wall, the crew in front): the counter where a crew member shows up for duty, the ID reader and
 * the 음주 측정기 on it, the duty officer's screen behind, the day's crew list pinned up, the airline's name over it.
 */
function showUpDesk(g: THREE.Group, W: number) {
  part(g, rbox(W - 0.1, 1.05, 0.6, 0.03), NAVY, 0, 0.525, -0.1);
  part(g, rbox(W, 0.05, 0.7, 0.02), '#eceff1', 0, 1.07, -0.08);
  part(g, box(W - 0.2, 0.08, 0.012), CORAL, 0, 0.85, 0.207, { outline: false });
  label(g, 'SHOW-UP · 출근 확인', 0.9, 0.13, 0, 0.62, 0.208, NAVY, '#ffffff');
  // The ID reader and the breathalyser, the screen.
  part(g, rbox(0.22, 0.14, 0.16, 0.02), BLACK, -0.8, 1.17, 0.05);
  part(g, box(0.1, 0.02, 0.004), '#69f0ae', -0.8, 1.2, 0.132, { outline: false });
  part(g, rbox(0.12, 0.22, 0.1, 0.02), '#eceff1', -0.35, 1.2, 0.05);
  part(g, cyl(0.012, 0.012, 0.08, 8), '#90a4ae', -0.35, 1.34, 0.08, { outline: false });
  part(g, rbox(0.56, 0.36, 0.04, 0.01), BLACK, 0.6, 1.36, -0.2);
  part(g, box(0.5, 0.3, 0.005), '#1d2f4f', 0.6, 1.36, -0.177, { outline: false });
  // The crew list and the sign on the wall behind.
  part(g, box(0.5, 0.66, 0.01), PAPER, -0.7, 1.75, -0.46);
  for (let i = 0; i < 8; i++) part(g, box(0.4, 0.02, 0.005), i % 3 ? '#90a4ae' : NAVY, -0.7, 2.0 - i * 0.07, -0.452, { outline: false });
  part(g, rbox(1.3, 0.3, 0.04, 0.01), NAVY, 0.45, 2.1, -0.46);
  label(g, `${AIR} 운항승무원센터`, 1.2, 0.18, 0.45, 2.1, -0.437, NAVY, '#ffffff');
}

/**
 * 공항 계류장 (anchored at the lot's north-west corner): beyond the back fence the airport, the reason the centre stands here — the
 * security fence along the lot's back with its razor wire, the taxiway with its yellow line and edge lights, and an airliner in
 * the airline's livery parked at its stand, its tail high over the roofs.
 */
function apronView(g: THREE.Group) {
  const X = (x: number) => x - 0.5;
  const Z = (z: number) => z - 0.5;
  // The fence along the back of the lot.
  for (let x = 0.3; x < 26; x += 2.5) part(g, cyl(0.03, 0.03, 2.4, 8), '#90a4ae', X(x), 1.2, Z(0.2), { outline: false });
  part(g, box(25.8, 2.2, 0.02), '#b0bec5', X(13), 1.1, Z(0.2), { material: new THREE.MeshToonMaterial({ color: '#b0bec5', transparent: true, opacity: 0.35, depthWrite: false }), outline: false, shadow: false });
  part(g, cyl(0.06, 0.06, 25.8, 8), '#cfd8dc', X(13), 2.45, Z(0.2), { rz: Math.PI / 2, outline: false });
  // The taxiway beyond.
  part(g, box(30, 0.02, 7), '#5f6468', X(13), 0.01, Z(-4), { outline: false });
  part(g, box(30, 0.022, 0.15), '#fbc02d', X(13), 0.012, Z(-4), { outline: false });
  for (let x = -1; x < 28; x += 3) part(g, cyl(0.06, 0.06, 0.2, 8), '#29b6f6', X(x), 0.1, Z(-0.9), { outline: false });
  // The airliner: fuselage along x, wing, engine, the tail fin with the airline's colours.
  const fx = 9;
  const fz = -5.5;
  part(g, cyl(1.9, 1.9, 22, 20), '#f5f7f8', X(fx), 2.6, Z(fz), { rz: Math.PI / 2 });
  part(g, box(22, 0.4, 3.85), NAVY, X(fx), 1.75, Z(fz), { outline: false });
  part(g, box(9, 0.25, 14), '#e3e7ea', X(fx + 1), 1.9, Z(fz - 5), { ry: -0.25 });
  part(g, cyl(0.85, 0.85, 2.6, 16), '#cfd8dc', X(fx + 2.5), 1.2, Z(fz + 3.1), { rz: Math.PI / 2 });
  part(g, box(4.6, 6.0, 0.35), NAVY, X(fx - 9.5), 6.4, Z(fz), { rz: 0.45 });
  part(g, box(1.0, 1.0, 0.36), CORAL, X(fx - 9.9), 7.6, Z(fz), { rz: 0.45, outline: false });
  part(g, ball(1.9), '#f5f7f8', X(fx + 11), 2.6, Z(fz)).scale.set(1.4, 1, 1);
  for (let i = 0; i < 14; i++) part(g, box(0.25, 0.3, 0.02), '#37474f', X(fx - 7 + i * 1.2), 3.0, Z(fz) + 1.86, { outline: false });
  label(g, AIR, 3.4, 0.8, X(fx - 1), 3.6, Z(fz) + 1.9, '#f5f7f8', NAVY);
}

// The departures board.

/** The lobby's flap board: rows of departures, one row flipping over and the next status coming up. */
function flightBoard(g: THREE.Group, out: Built) {
  part(g, rbox(2.0, 1.2, 0.12, 0.02), BLACK, 0, 1.75, -0.42);
  const s = swapPic(g, 1.88, 1.06, 0, 1.75, -0.355);
  const texes = [boardHomeTex, flightBoardTex(FLIGHTS_B, '오늘의 비행 · 브리핑 센터')];
  s.set(texes[0]);
  for (const x of [-0.85, 0.85]) part(g, box(0.05, 1.2, 0.05), '#37474f', x, 0.6, -0.44);
  part(g, rbox(1.0, 0.46, 0.03, 0.01), '#fff8e1', 0, 0.68, -0.44);
  label(g, '승무원 채용 설명회', 0.86, 0.16, 0, 0.78, -0.42, '#fff8e1', CORAL);
  label(g, '매달 첫째 주 · 브리핑 센터 3층', 0.86, 0.1, 0, 0.6, -0.42, '#fff8e1', NAVY);
  out.away = (_o, t) => {
    s.set(texes[Math.floor(t / 16) % 2]);
  };
}

export const BUILDERS: Record<string, Builder> = {
  cabinMockup(g, _W, _D, _c, _def, _ctx, out) {
    cabinMockup(g, out);
  },
  faGalley(g, _W, _D, _c, _def, _ctx, out) {
    galley(g, out);
  },
  evacSlide(g, _W, _D, _c, _def, _ctx, out) {
    evacSlide(g, out);
  },
  safetyDemoKit(g, _W, _D, _c, _def, _ctx, out) {
    safetyKit(g, out);
  },
  faBriefBoard(g, _W, _D, _c, _def, _ctx, out) {
    briefBoard(g, out);
  },
  faBriefTable(g, _W, _D, _c, _def, _ctx, out) {
    briefTable(g, out);
  },
  faCrewLocker(g, _W, _D, _c, _def, _ctx, out) {
    crewLocker(g, out);
  },
  faGroomCorner(g, _W, _D, _c, _def, _ctx, out) {
    groomCorner(g, out);
  },
  crewGate(g, _W, _D, _c, _def, _ctx, out) {
    crewGate(g, out);
  },
  faShowUpDesk(g, W) {
    showUpDesk(g, W);
  },
  faApronView(g) {
    apronView(g);
  },
  faFront(g) {
    shopFront(g, { ax: 1, x0: 2, x1: 19, door: 12, name: `${AIR} 운항승무원센터`, sub: 'CREW CENTER', bg: NAVY, fg: '#ffffff', frame: '#455a64', posters: [['안전이 최고의 서비스', '#fff8e1', NAVY, 5.5], ['오늘도 무사 비행', '#e3f2fd', CORAL, 16.5]], solid: [[2, 3]] });
  },
  faFlightBoard(g, _W, _D, _c, _def, _ctx, out) {
    flightBoard(g, out);
  },
};
