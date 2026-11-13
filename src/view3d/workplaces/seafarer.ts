import * as THREE from 'three';
import type { Motion } from '../activity';
import { marker, rod, shade, spot, type Builder, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, glass, glowing, label, litScreen, painted, picture, ring, seeded, starBase, text, type Paint } from './doctor';
import {
  BITT, CARGO, CHART, COURSE_RY, FAX, GEAR, HELM, RADAR, VTS,
  bellAt, bittAt, cargoAt, drillAt, faxAt, frameAt, gearAt, helmAt, plotAt, radarAt, sfPhase, sfShift, sfTurn, vtsAt,
  type SeaMotion,
} from './seafarerMotion';

/**
 * The 해운 항만 사무소 drawn as itself (2026-10-27 workplace pipeline, at the user's request): a shipping
 * company's harbour office and training rooms. The bridge simulators — the wheel and the engine lever
 * at a console under three window screens with the sea painted on them, which turns as the wheel's put
 * over and runs at the lever's speed, the bow and the deck cargo out ahead, the ECDIS and the radar,
 * the rudder indicator overhead; the chart tables with the approach chart spread on them, the
 * parallel rulers, the dividers and the pencil worked across it; the stowage planner with a
 * container dragged into its slot on the bay plan; the radar console with its sweep, the echoes
 * lighting as it passes and a target acquired; the rescue gear locker (life jackets, immersion suits,
 * the liferaft on its cradle, the life rings); the tender at its berth. And what it was missing
 * (workFurniture/seafarer.ts): the port's VTS screen, the weather fax, the flagship's model, the
 * mooring bitts and the ship's bell.
 *
 * The radar console and the rescue gear locker are the 해양경찰 파출소's too, so nothing on them is
 * only a merchant ship's. The company (한바다해운), its ships, the port (한바다항) and the coast on
 * the charts are made up. Every piece's spots face it square on and turn by the motion's own clock
 * (seafarerMotion.ts), so what's held is drawn in the hands that hold it.
 */

const NAVY = '#12355b';
const CONSOLE = '#3c4650';
const CONSOLE_D = '#262d34';
const ORANGE = '#ef6c00';
const BRASS = '#c9a227';
const ROPE = '#d9c49a';
const OAK = '#9c6b3f';
const OAK_D = '#6f4a2a';
const PAPER = '#fbfaf5';
const LIT = '#39ff88';
const DIM = '#5a6470';
const COMPANY = '한바다해운';
const PORT = '한바다항';
const FLAGSHIP = '한바다 스타';
/** The ports on the bay plan, each its colour. */
const PORTS: Array<[string, string]> = [['부산', '#e53935'], ['상하이', '#1e88e5'], ['롱비치', '#43a047'], ['싱가포르', '#fb8c00']];

// ---------------------------------------------------------------------------------------------
// Small parts.

const tmp = new THREE.Vector3();
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
/** Whether a dweller's posed at a spot just now (activity.ts spotPose marks it). */
const posed = (s: Spot, t: number) => Math.abs(t - posedAt(s)) < 0.6;
/** How tall whoever's posed at a spot is. */
const heightAt = (s: Spot) => (s.at.userData.height as number | undefined) ?? 1.6;

function sitAt(g: THREE.Object3D, x: number, y: number, z: number, yaw: number, motion: Motion, work?: THREE.Object3D): Spot {
  const s = spot(g, 'sit', x, y, z, yaw, y);
  s.work = work;
  s.motion = motion;
  return s;
}
function standAt(g: THREE.Object3D, x: number, z: number, yaw: number, motion: Motion, work?: THREE.Object3D): Spot {
  const s = spot(g, 'stand', x, 0, z, yaw);
  s.work = work;
  s.motion = motion;
  return s;
}
/** The same place, done another way (a spot object of its own, so which use is going on can be told). */
function also(g: THREE.Object3D, s: Spot, motion: Motion, work = s.work): Spot {
  const at = marker(g, s.at.position.x, s.at.position.y, s.at.position.z);
  at.rotation.y = s.at.rotation.y;
  return { ...s, at, motion, work };
}
function group(parent: THREE.Object3D, x = 0, y = 0, z = 0, ry = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}
/** A sheet lying flat on a top, its head away from +z, turned `ry` about the vertical. */
function flat(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0): THREE.Mesh {
  const m = picture(g, tex, w, h, x, y, z);
  m.rotation.order = 'YXZ';
  m.rotation.set(-Math.PI / 2, ry, 0);
  return m;
}
/** A see-through picture (painted on a transparent canvas). */
function overlay(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number): THREE.Mesh {
  const m = picture(g, tex, w, h, x, y, z);
  const mat = m.material as THREE.MeshBasicMaterial;
  mat.transparent = true;
  mat.depthWrite = false;
  m.renderOrder = 3;
  return m;
}
/** A flat shape of its own lit colour (a radar echo, an AIS mark), fading by its own opacity. */
function lamp(g: THREE.Object3D, geom: THREE.BufferGeometry, color: string, x: number, y: number, z: number, opacity = 1): THREE.Mesh {
  const m = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
  m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  m.renderOrder = 4;
  g.add(m);
  return m;
}
const setOpacity = (m: THREE.Mesh, o: number) => {
  (m.material as THREE.MeshBasicMaterial).opacity = o;
};
/** A round rod of unit length stretched from one point to another (a rope's running end, a lanyard). */
function stretch(m: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3) {
  const d = to.clone().sub(from);
  const len = Math.max(1e-3, d.length());
  m.position.copy(from).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.divideScalar(len));
  m.scale.set(1, len, 1);
}
const pen = (g: THREE.Object3D, x: number, y: number, z: number, ry: number, color = '#1a237e') => part(g, cyl(0.0045, 0.0045, 0.14, 6), color, x, y + 0.005, z, { rz: Math.PI / 2, ry, outline: false });

/** A frame worked out in the piece's frame for a spot and the piece's work point (the builder's side of seafarerMotion.ts). */
const frameOf = (s: Spot, work: THREE.Object3D) => frameAt(work.position, 0, s.at.position, s.at.rotation.y, heightAt(s), s.how === 'sit');
const phaseOf = (work: THREE.Object3D) => sfPhase(work.getWorldPosition(tmp));
/** Turns a spot by its motion's clock (square on is π), and steps it along the piece from where it's set (`x0`). */
const turnSpot = (s: Spot, m: SeaMotion, t: number, ph: number) => {
  s.at.rotation.y = Math.PI + sfTurn(m, t, ph);
  const x0 = (s.at.userData.x0 as number | undefined) ?? (s.at.userData.x0 = s.at.position.x);
  s.at.position.x = x0 + sfShift(m, t, ph);
};

/** A swivel chair, built facing +z: five-star base, gas lift, the seat's top at 0.48, a back `back` high, arms. */
function swivel(g: THREE.Object3D, x: number, z: number, ry: number, color: string, back = 0.6): THREE.Group {
  const c = group(g, x, 0, z, ry);
  starBase(c, 0, 0, 0.26, BLACK);
  part(c, cyl(0.025, 0.025, 0.26, 10), CHROME, 0, 0.27, 0, { outline: false });
  part(c, rbox(0.5, 0.09, 0.48, 0.04), color, 0, 0.435, 0);
  part(c, rbox(0.5, back, 0.1, 0.05), color, 0, 0.5 + back / 2, -0.24, { rx: -0.08 });
  part(c, rbox(0.42, back - 0.16, 0.02, 0.04), shade(color, 1.25), 0, 0.5 + back / 2, -0.185, { rx: -0.08, outline: false });
  for (const sx of [-1, 1]) {
    part(c, rbox(0.06, 0.04, 0.3, 0.015), color, sx * 0.27, 0.67, 0.0);
    part(c, rbox(0.03, 0.18, 0.03, 0.01), CHROME, sx * 0.27, 0.57, 0.04, { outline: false });
  }
  return c;
}

/** Binoculars, their middle at the origin, the big lenses toward +z. */
function binoculars(parent: THREE.Object3D): THREE.Group {
  const b = group(parent);
  for (const sx of [-1, 1]) {
    part(b, cyl(0.021, 0.021, 0.1, 12), '#263238', sx * 0.034, 0, 0, { rx: Math.PI / 2 });
    part(b, cyl(0.026, 0.026, 0.03, 12), '#1b1b1b', sx * 0.034, 0, 0.05, { rx: Math.PI / 2, outline: false });
    part(b, cyl(0.019, 0.019, 0.002, 12), '#4f86b0', sx * 0.034, 0, 0.066, { rx: Math.PI / 2, outline: false });
    part(b, cyl(0.012, 0.014, 0.03, 10), '#1b1b1b', sx * 0.034, 0, -0.06, { rx: Math.PI / 2, outline: false });
  }
  part(b, box(0.046, 0.014, 0.05), '#37474f', 0, 0, -0.005, { outline: false });
  part(b, cyl(0.007, 0.007, 0.02, 8), '#90a4ae', 0, 0.008, -0.01, { outline: false });
  return b;
}
/** A VHF handset, its middle at the origin, the mouthpiece down, its face toward +z. */
function handset(parent: THREE.Object3D): THREE.Group {
  const h = group(parent);
  part(h, rbox(0.055, 0.17, 0.035, 0.014), '#212121', 0, 0, 0);
  for (let i = 0; i < 3; i++) part(h, box(0.03, 0.003, 0.002), '#555555', 0, 0.06 - i * 0.008, 0.018, { outline: false });
  for (let i = 0; i < 3; i++) part(h, box(0.03, 0.003, 0.002), '#555555', 0, -0.055 + i * 0.008, 0.018, { outline: false });
  part(h, rbox(0.012, 0.04, 0.012, 0.004), '#c62828', -0.03, 0.0, 0, { outline: false });
  return h;
}
/** A life jacket hung from its collar (the origin), its front toward +z: two orange float panels, reflective tape, the light and whistle. */
function lifeJacket(parent: THREE.Object3D): THREE.Group {
  const v = group(parent);
  for (const sx of [-1, 1]) {
    part(v, rbox(0.13, 0.34, 0.07, 0.03), '#ff6d00', sx * 0.072, -0.2, 0.0);
    part(v, box(0.11, 0.025, 0.004), '#e0e0e0', sx * 0.072, -0.12, 0.037, { outline: false });
    part(v, box(0.11, 0.025, 0.004), '#e0e0e0', sx * 0.072, -0.26, 0.037, { outline: false });
  }
  part(v, rbox(0.26, 0.07, 0.08, 0.035), '#ff6d00', 0, -0.03, -0.01);
  part(v, box(0.02, 0.3, 0.004), '#1a237e', 0, -0.22, 0.035, { outline: false });
  part(v, box(0.24, 0.02, 0.004), '#1a237e', 0, -0.33, 0.038, { outline: false });
  glowing(v, box(0.025, 0.035, 0.02), '#fff59d', 0.09, -0.06, 0.045);
  part(v, rbox(0.015, 0.035, 0.012, 0.005), '#ffd600', -0.09, -0.08, 0.045, { outline: false });
  return v;
}
/** A clipboard (its middle at the origin, the sheet toward +z). */
function clipboard(parent: THREE.Object3D, tex: THREE.Texture): THREE.Group {
  const c = group(parent);
  part(c, rbox(0.17, 0.23, 0.008, 0.004), '#8d6e63', 0, 0, 0);
  picture(c, tex, 0.15, 0.2, 0, -0.01, 0.006);
  part(c, box(0.07, 0.018, 0.012), CHROME, 0, 0.1, 0.008, { outline: false });
  return c;
}

// ---------------------------------------------------------------------------------------------
// What's painted on the screens, the charts and the sheets.

/** The panorama out of the bridge's windows (wraps round): sky and clouds, islands, a lighthouse, a ship on the horizon. */
const paintSea: Paint = (c) => {
  const W = 1024;
  const H = 256;
  const hz = 112;
  const sky = c.createLinearGradient(0, 0, 0, hz);
  sky.addColorStop(0, '#6fa9dc');
  sky.addColorStop(1, '#d8eef8');
  c.fillStyle = sky;
  c.fillRect(0, 0, W, hz);
  const r = seeded(77);
  c.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 9; i++) {
    const x = 70 + r() * (W - 140);
    const y = 18 + r() * 48;
    for (let k = 0; k < 4; k++) {
      c.beginPath();
      c.ellipse(x + (k - 1.5) * 16, y + (k % 2) * 4, 22 - k * 2, 8 + (k % 2) * 3, 0, 0, Math.PI * 2);
      c.fill();
    }
  }
  const sea = c.createLinearGradient(0, hz, 0, H);
  sea.addColorStop(0, '#4a8fbd');
  sea.addColorStop(1, '#0f3a5c');
  c.fillStyle = sea;
  c.fillRect(0, hz, W, H - hz);
  // Islands on the horizon.
  const island = (x: number, w: number, h: number, col: string) => {
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(x - w / 2, hz);
    for (let i = 0; i <= 12; i++) {
      const u = i / 12;
      c.lineTo(x - w / 2 + u * w, hz - h * Math.sin(Math.PI * u) * (0.75 + 0.25 * Math.sin(u * 17 + x)));
    }
    c.lineTo(x + w / 2, hz);
    c.fill();
  };
  island(190, 240, 28, '#6f8f7c');
  island(330, 90, 12, '#8aa596');
  island(560, 110, 16, '#7a9988');
  island(860, 180, 36, '#5f806c');
  // A lighthouse on the big island.
  c.fillStyle = '#ffffff';
  c.fillRect(902, hz - 44, 6, 22);
  c.fillStyle = '#d32f2f';
  c.fillRect(901, hz - 48, 8, 5);
  // A container ship on the horizon.
  c.fillStyle = '#2b3a46';
  c.fillRect(640, hz - 6, 54, 6);
  c.fillRect(688, hz - 14, 8, 9);
  const cols = ['#c62828', '#1565c0', '#2e7d32', '#ef6c00'];
  for (let i = 0; i < 8; i++) {
    c.fillStyle = cols[i % 4];
    c.fillRect(644 + i * 5.5, hz - 10, 5, 4);
  }
  // The horizon's haze, the sea's darker lines, the sun's glitter.
  c.fillStyle = 'rgba(220,238,246,0.7)';
  c.fillRect(0, hz - 1, W, 3);
  for (let i = 0; i < 70; i++) {
    const y = hz + 4 + r() ** 1.6 * (H - hz - 6);
    c.fillStyle = `rgba(8,40,66,${0.15 + 0.2 * r()})`;
    c.fillRect(r() * W, y, 20 + 60 * r(), 1 + (y - hz) / 60);
  }
  for (let i = 0; i < 40; i++) {
    c.fillStyle = 'rgba(255,250,220,0.55)';
    c.fillRect(300 + (r() - 0.5) * 70, hz + 3 + r() * 70, 6 + 10 * r(), 1.5);
  }
};
/** The whitecaps on the sea (transparent), bigger toward the bottom: scrolled down toward the bow. */
const paintWaves: Paint = (c) => {
  const r = seeded(31);
  c.clearRect(0, 0, 512, 256);
  for (let i = 0; i < 190; i++) {
    const v = r();
    const y = v * 256;
    const k = 0.3 + v;
    c.strokeStyle = `rgba(255,255,255,${0.25 + 0.45 * r()})`;
    c.lineWidth = 0.8 + 2.4 * v;
    const x = r() * 512;
    c.beginPath();
    c.arc(x, y, 6 * k + 10 * k * r(), Math.PI * 1.15, Math.PI * 1.85);
    c.stroke();
  }
};
/** What's ahead of the bridge on the centre screen (transparent): the deck cargo and the bow beyond it. */
const paintBow: Paint = (c) => {
  c.clearRect(0, 0, 512, 200);
  // The forecastle.
  c.fillStyle = '#4b555d';
  c.beginPath();
  c.moveTo(150, 132);
  c.lineTo(362, 132);
  c.lineTo(256, 66);
  c.closePath();
  c.fill();
  c.fillStyle = '#8a3b2f';
  c.beginPath();
  c.moveTo(166, 130);
  c.lineTo(346, 130);
  c.lineTo(256, 74);
  c.closePath();
  c.fill();
  c.strokeStyle = '#f2f2f2';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(150, 132);
  c.lineTo(256, 66);
  c.lineTo(362, 132);
  c.stroke();
  // The foremast.
  c.strokeStyle = '#e0c25a';
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(256, 118);
  c.lineTo(256, 34);
  c.moveTo(240, 50);
  c.lineTo(272, 50);
  c.stroke();
  // Container stacks right across the bottom.
  const cols = ['#c62828', '#1565c0', '#2e7d32', '#ef6c00', '#6d4c41', '#f9a825', '#455a64', '#00838f'];
  const r = seeded(9);
  for (let row = 0; row < 3; row++)
    for (let i = 0; i < 12; i++) {
      const w = 512 / 12;
      const y = 140 + row * 20;
      c.fillStyle = cols[Math.floor(r() * cols.length)];
      c.fillRect(i * w + 1, y, w - 2, 19);
      c.fillStyle = 'rgba(0,0,0,0.22)';
      for (let k = 1; k < 6; k++) c.fillRect(i * w + k * (w / 6), y + 1, 1.2, 17);
    }
};
const paintEcdis: Paint = (c) => {
  c.fillStyle = '#f7fbfd';
  c.fillRect(0, 0, 320, 220);
  c.fillStyle = '#cfe7f4';
  c.beginPath();
  c.ellipse(70, 70, 120, 90, 0.3, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#ead594';
  c.beginPath();
  c.moveTo(0, 30);
  c.quadraticCurveTo(70, 50, 90, 22);
  c.quadraticCurveTo(110, 0, 0, 0);
  c.fill();
  c.beginPath();
  c.ellipse(250, 160, 28, 16, 0.4, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#d81b60';
  c.lineWidth = 2;
  c.setLineDash([]);
  c.beginPath();
  c.moveTo(40, 200);
  c.lineTo(140, 120);
  c.lineTo(290, 60);
  c.stroke();
  for (const [x, y] of [[40, 200], [140, 120], [290, 60]]) {
    c.beginPath();
    c.arc(x, y, 6, 0, Math.PI * 2);
    c.stroke();
  }
  // Own ship.
  c.strokeStyle = '#111111';
  c.lineWidth = 2;
  c.beginPath();
  c.arc(118, 138, 6, 0, Math.PI * 2);
  c.moveTo(118, 138);
  c.lineTo(150, 112);
  c.stroke();
  c.fillStyle = '#263238';
  c.fillRect(0, 0, 320, 22);
  text(c, 'ECDIS', 8, 12, 13, '#80deea');
  text(c, 'HDG 047.2°  SOG 12.4kn', 312, 12, 12, '#ffffff', 'right');
  text(c, `WP2 ${PORT} 입항로`, 196, 104, 11, '#d81b60', 'left', false);
};
/** A radar's face without its sweep: range rings, the bearing scale, the heading line, the coast's echoes. */
const paintRadar: Paint = (c) => {
  c.fillStyle = '#0b0f0d';
  c.fillRect(0, 0, 256, 256);
  c.fillStyle = '#04170b';
  c.beginPath();
  c.arc(128, 128, 122, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#1f6a36';
  c.lineWidth = 1;
  for (let i = 1; i <= 4; i++) {
    c.beginPath();
    c.arc(128, 128, i * 30, 0, Math.PI * 2);
    c.stroke();
  }
  for (let d = 0; d < 360; d += 10) {
    const a = (d * Math.PI) / 180;
    const r0 = d % 30 === 0 ? 112 : 117;
    c.beginPath();
    c.moveTo(128 + Math.sin(a) * r0, 128 - Math.cos(a) * r0);
    c.lineTo(128 + Math.sin(a) * 122, 128 - Math.cos(a) * 122);
    c.stroke();
  }
  c.strokeStyle = '#a8ffbf';
  c.beginPath();
  c.moveTo(128, 128);
  c.lineTo(128, 6);
  c.stroke();
  // The coast's echoes, up the left and across the top.
  const r = seeded(5);
  c.fillStyle = '#3fe07a';
  for (let i = 0; i < 260; i++) {
    const u = r();
    const a = -2.4 + u * 1.9;
    const rad = 70 + 40 * Math.sin(u * 7) + r() * 14;
    if (rad > 120) continue;
    c.globalAlpha = 0.4 + 0.5 * r();
    c.fillRect(128 + Math.sin(a) * rad, 128 - Math.cos(a) * rad, 2 + r() * 3, 2 + r() * 3);
  }
  c.globalAlpha = 1;
  text(c, '6 NM', 8, 14, 13, '#5cff95');
  text(c, 'X-BAND', 248, 14, 12, '#5cff95', 'right');
  text(c, 'RNG 3.2NM', 8, 244, 12, '#5cff95');
  text(c, 'BRG 047°', 248, 244, 12, '#5cff95', 'right');
};
/** The approach chart (해도) on the chart table: land, soundings, the fairway, lights, the compass rose, the scales. */
const paintChart: Paint = (c) => {
  const W = 1024;
  const H = 460;
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, W, H);
  const r = seeded(207);
  // Shallow water round the coast (painted first, the land over it).
  const coast = () => {
    c.beginPath();
    c.moveTo(40, 40);
    c.lineTo(520, 40);
    c.quadraticCurveTo(470, 90, 420, 80);
    c.quadraticCurveTo(360, 70, 330, 120);
    c.quadraticCurveTo(300, 170, 220, 160);
    c.quadraticCurveTo(140, 150, 110, 210);
    c.quadraticCurveTo(80, 270, 40, 280);
    c.closePath();
  };
  c.strokeStyle = '#cfe6f3';
  c.lineWidth = 46;
  coast();
  c.stroke();
  // Soundings over the water.
  c.font = 'italic 13px serif';
  c.fillStyle = '#1a3a6b';
  for (let i = 0; i < 120; i++) {
    const x = 50 + r() * (W - 100);
    const y = 50 + r() * (H - 100);
    c.fillText(String(Math.floor(4 + r() * 40)), x, y);
  }
  // A depth contour, dotted.
  c.strokeStyle = '#5c87b8';
  c.lineWidth = 1.2;
  c.setLineDash([3, 4]);
  c.beginPath();
  c.moveTo(560, 40);
  c.quadraticCurveTo(420, 140, 280, 200);
  c.quadraticCurveTo(160, 250, 40, 330);
  c.stroke();
  c.setLineDash([]);
  c.fillStyle = '#f1dfa8';
  coast();
  c.fill();
  c.strokeStyle = '#8a6d3b';
  c.lineWidth = 2;
  c.stroke();
  // An island with its lighthouse.
  c.beginPath();
  c.ellipse(640, 140, 46, 22, -0.3, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  const light = (x: number, y: number) => {
    c.fillStyle = '#c2185b';
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + 22, y - 10, x + 26, y + 4);
    c.quadraticCurveTo(x + 14, y + 8, x, y);
    c.fill();
    c.fillStyle = '#111111';
    c.beginPath();
    c.arc(x, y, 3.5, 0, Math.PI * 2);
    c.fill();
  };
  light(640, 132);
  light(420, 84);
  // The breakwaters and the port's name.
  c.strokeStyle = '#6d5530';
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(330, 120);
  c.lineTo(390, 150);
  c.moveTo(420, 80);
  c.lineTo(440, 130);
  c.stroke();
  text(c, PORT, 250, 100, 22, '#6d5530');
  // The fairway's buoys, red and green.
  for (let i = 0; i < 5; i++) {
    const x = 440 + i * 90;
    const y = 160 + i * 30;
    c.fillStyle = '#d32f2f';
    c.fillRect(x, y - 20, 7, 10);
    c.fillStyle = '#2e7d32';
    c.beginPath();
    c.moveTo(x - 10, y + 22);
    c.lineTo(x - 3, y + 10);
    c.lineTo(x + 4, y + 22);
    c.fill();
  }
  // An anchorage.
  c.strokeStyle = '#c2185b';
  c.lineWidth = 1.5;
  c.setLineDash([6, 5]);
  c.beginPath();
  c.arc(880, 120, 50, 0, Math.PI * 2);
  c.stroke();
  c.setLineDash([]);
  text(c, '⚓ 정박지', 880, 120, 15, '#c2185b', 'center');
  // The compass rose (where the rulers start: CHART.rose).
  const cx = 755;
  const cy = 307;
  c.strokeStyle = '#c2185b';
  c.lineWidth = 1.5;
  for (const rr of [70, 56, 40]) {
    c.beginPath();
    c.arc(cx, cy, rr, 0, Math.PI * 2);
    c.stroke();
  }
  for (let d = 0; d < 360; d += 5) {
    const a = (d * Math.PI) / 180;
    const r0 = d % 30 === 0 ? 60 : 65;
    c.beginPath();
    c.moveTo(cx + Math.sin(a) * r0, cy - Math.cos(a) * r0);
    c.lineTo(cx + Math.sin(a) * 70, cy - Math.cos(a) * 70);
    c.stroke();
  }
  c.fillStyle = '#c2185b';
  c.beginPath();
  c.moveTo(cx, cy - 54);
  c.lineTo(cx - 8, cy);
  c.lineTo(cx + 8, cy);
  c.fill();
  text(c, 'N', cx, cy - 80, 14, '#c2185b', 'center');
  text(c, '편차 8°W (2026)', cx, cy + 22, 11, '#c2185b', 'center', false);
  // A course plotted before, rubbed half out.
  c.strokeStyle = 'rgba(60,60,60,0.25)';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(260, 420);
  c.lineTo(600, 260);
  c.stroke();
  // The border with its scales (latitude down the sides, longitude along the top and bottom).
  c.strokeStyle = '#111111';
  c.lineWidth = 2;
  c.strokeRect(16, 12, W - 32, H - 24);
  c.strokeRect(36, 28, W - 72, H - 56);
  for (let y = 28; y < H - 28; y += 16) {
    c.fillStyle = Math.floor(y / 16) % 2 ? '#111111' : '#ffffff';
    c.fillRect(17, y, 18, 16);
    c.fillRect(W - 35, y, 18, 16);
  }
  for (let x = 36; x < W - 36; x += 20) {
    c.fillStyle = Math.floor(x / 20) % 2 ? '#111111' : '#ffffff';
    c.fillRect(x, 13, 20, 14);
    c.fillRect(x, H - 27, 20, 14);
  }
  // The title.
  c.fillStyle = '#ffffff';
  c.fillRect(56, 360, 280, 76);
  c.strokeStyle = '#111111';
  c.strokeRect(56, 360, 280, 76);
  text(c, `${PORT} 접근 수로`, 196, 384, 20, '#111111', 'center');
  text(c, '해도 제207호 · 축척 1:50,000 · 수심(m)', 196, 414, 13, '#333333', 'center', false);
};
/** The bay plan's frame: the bay's cross-section with its empty cells, the waiting list, the totals. */
export const BAY = { x0: 52, y0: 70, cw: 34, ch: 28, cols: 9, rows: 6, hatch: 4, w: 512, h: 320 };
const paintBayPlan: Paint = (c) => {
  c.fillStyle = '#eef2f5';
  c.fillRect(0, 0, BAY.w, BAY.h);
  c.fillStyle = NAVY;
  c.fillRect(0, 0, BAY.w, 30);
  text(c, `적하 계획 · ${FLAGSHIP} · BAY 14`, 10, 16, 15, '#ffffff');
  text(c, 'STOWAGE', 502, 16, 12, '#90caf9', 'right');
  // The hull's section round the hold, the hatch cover between deck and hold.
  const gx = BAY.x0;
  const gw = BAY.cols * BAY.cw;
  const hy = BAY.y0 + BAY.hatch * BAY.ch;
  c.strokeStyle = '#37474f';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(gx - 14, hy);
  c.lineTo(gx - 14, BAY.y0 + BAY.rows * BAY.ch + 6);
  c.quadraticCurveTo(gx + gw / 2, BAY.y0 + BAY.rows * BAY.ch + 30, gx + gw + 14, BAY.y0 + BAY.rows * BAY.ch + 6);
  c.lineTo(gx + gw + 14, hy);
  c.stroke();
  c.fillStyle = '#78909c';
  c.fillRect(gx - 14, hy - 3, gw + 28, 6);
  c.strokeStyle = '#b0bec5';
  c.lineWidth = 1;
  for (let i = 0; i < BAY.cols; i++)
    for (let j = 0; j < BAY.rows; j++) c.strokeRect(gx + i * BAY.cw + 1, BAY.y0 + j * BAY.ch + (j >= BAY.hatch ? 4 : -2), BAY.cw - 2, BAY.ch - 2);
  text(c, '갑판', gx - 18, BAY.y0 + 30, 11, '#546e7a', 'right', false);
  text(c, '선창', gx - 18, hy + 30, 11, '#546e7a', 'right', false);
  // The waiting list and the legend.
  c.fillStyle = '#ffffff';
  c.fillRect(380, 40, 124, 200);
  text(c, '선적 대기', 442, 54, 12, '#37474f', 'center');
  for (let k = 0; k < 7; k++) {
    const [name, col] = PORTS[k % 4];
    c.fillStyle = col;
    c.fillRect(388, 68 + k * 22, 14, 14);
    text(c, `HBDU ${2041 + k * 7}`, 408, 75 + k * 22, 10, '#263238', 'left', false);
    text(c, name, 500, 75 + k * 22, 9, '#607d8b', 'right', false);
  }
  c.fillStyle = '#263238';
  c.fillRect(0, 290, BAY.w, 30);
  text(c, 'TEU 642 / 1,300', 10, 305, 12, '#ffffff');
  text(c, 'GM 1.82m ✓', 220, 305, 12, '#69f0ae');
  text(c, '흘수 F 9.8 · A 10.4', 502, 305, 12, '#ffffff', 'right');
};
const paintStability: Paint = (c) => {
  c.fillStyle = '#0f2233';
  c.fillRect(0, 0, 256, 160);
  text(c, '복원성 · STABILITY', 10, 14, 13, '#80deea');
  // The ship's side, trimmed a little by the stern, its waterline.
  c.fillStyle = '#b71c1c';
  c.beginPath();
  c.moveTo(20, 70);
  c.lineTo(236, 66);
  c.lineTo(220, 92);
  c.lineTo(34, 94);
  c.fill();
  c.fillStyle = '#263238';
  c.fillRect(20, 56, 216, 14);
  c.fillStyle = '#eceff1';
  c.fillRect(40, 38, 22, 18);
  c.strokeStyle = '#4fc3f7';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(10, 80);
  c.lineTo(246, 77);
  c.stroke();
  // GM against the line it has to clear.
  c.fillStyle = '#1b3a52';
  c.fillRect(20, 110, 216, 16);
  c.fillStyle = '#69f0ae';
  c.fillRect(20, 110, 160, 16);
  c.fillStyle = '#ffee58';
  c.fillRect(110, 106, 2, 24);
  text(c, 'GM 1.82 m · 기준 충족', 128, 144, 12, '#69f0ae', 'center');
};
const paintManifest: Paint = (c) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 128, 170);
  text(c, '적하 목록 MANIFEST', 64, 12, 10, '#263238', 'center');
  c.fillStyle = '#90a4ae';
  c.fillRect(6, 20, 116, 1);
  for (let i = 0; i < 11; i++) {
    text(c, `HBDU ${2041 + i * 7}-${i % 9}`, 6, 30 + i * 12.5, 8, '#37474f', 'left', false);
    text(c, `${PORTS[i % 4][0]} · ${(14 + (i * 3.7) % 12).toFixed(1)}t`, 122, 30 + i * 12.5, 8, '#607d8b', 'right', false);
  }
};
/** The port VTS screen: the harbour in plan on a dark display, the fairways, the anchorage, the berths. */
const VMAP = { w: 1024, h: 576 };
const paintVts: Paint = (c) => {
  c.fillStyle = '#0a2236';
  c.fillRect(0, 0, VMAP.w, VMAP.h);
  // The land: the coast across the top and down the left, a headland, an island.
  c.fillStyle = '#21352a';
  c.strokeStyle = '#4f7d5a';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(1024, 0);
  c.lineTo(1024, 90);
  c.quadraticCurveTo(820, 110, 700, 80);
  c.quadraticCurveTo(560, 50, 470, 150);
  c.lineTo(380, 150);
  c.quadraticCurveTo(300, 100, 200, 110);
  c.quadraticCurveTo(90, 120, 60, 300);
  c.lineTo(0, 330);
  c.closePath();
  c.fill();
  c.stroke();
  c.beginPath();
  c.ellipse(640, 300, 50, 24, 0.2, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  // The breakwaters, the berths.
  c.strokeStyle = '#9e9e9e';
  c.lineWidth = 6;
  c.beginPath();
  c.moveTo(300, 140);
  c.lineTo(360, 220);
  c.moveTo(520, 120);
  c.lineTo(470, 210);
  c.stroke();
  c.fillStyle = '#546e7a';
  c.fillRect(380, 150, 90, 10);
  text(c, 'A부두', 425, 172, 14, '#b0bec5', 'center');
  text(c, '컨테이너 부두', 250, 130, 14, '#b0bec5', 'center');
  // The fairways: inbound and outbound lanes, dashed.
  c.strokeStyle = '#3c8dbc';
  c.lineWidth = 2;
  c.setLineDash([10, 8]);
  for (const path of VTS_PATHS.slice(0, 2)) {
    c.beginPath();
    path.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.stroke();
  }
  c.setLineDash([4, 6]);
  c.strokeStyle = '#7e57c2';
  c.beginPath();
  c.arc(850, 225, 70, 0, Math.PI * 2);
  c.stroke();
  c.setLineDash([]);
  text(c, '정박지 E', 850, 140, 14, '#b39ddb', 'center');
  // The header and the target list.
  c.fillStyle = 'rgba(0,0,0,0.55)';
  c.fillRect(0, 0, VMAP.w, 34);
  text(c, `${PORT} VTS · 해상교통관제`, 14, 18, 18, '#4fc3f7');
  text(c, '14:32:05 KST · VHF CH 12', 1010, 18, 15, '#e0f7fa', 'right');
  c.fillStyle = 'rgba(0,0,0,0.5)';
  c.fillRect(824, 400, 190, 166);
  text(c, 'TARGETS', 836, 416, 13, '#4fc3f7');
  VTS_SHIPS.forEach((s, i) => text(c, `${s.name}  ${s.kn}kn`, 836, 438 + i * 20, 12, '#e0f7fa', 'left', false));
};
/** The traffic on the VTS screen, along their tracks in the screen's pixels (the anchored ones still). */
const VTS_PATHS: Array<Array<[number, number]>> = [
  [[1010, 520], [780, 410], [600, 320], [440, 220]],
  [[400, 200], [560, 270], [780, 380], [1010, 480]],
  [[100, 480], [330, 400], [520, 440], [760, 540]],
  [[230, 190], [300, 230], [260, 270], [190, 240], [230, 190]],
];
const VTS_SHIPS: Array<{ name: string; kn: number; path?: number; at?: [number, number]; off: number }> = [
  { name: FLAGSHIP, kn: 11.8, path: 0, off: 0.1 },
  { name: 'PACIFIC ARROW', kn: 13.2, path: 1, off: 0.55 },
  { name: '해누리 페리', kn: 15.0, path: 2, off: 0.3 },
  { name: '진성호', kn: 6.4, path: 3, off: 0 },
  { name: 'OCEAN GRACE', kn: 0, at: [830, 210], off: 0 },
  { name: '동방 9호', kn: 0, at: [880, 250], off: 0 },
];
/** A point along a track (0–1 round it), and the way it's heading. */
function alongPath(path: Array<[number, number]>, u: number): { x: number; y: number; a: number } {
  const segs = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]));
  const L = segs.reduce((a, b) => a + b, 0);
  let d = (((u % 1) + 1) % 1) * L;
  for (let i = 0; i < segs.length; i++) {
    if (d <= segs[i] || i === segs.length - 1) {
      const k = Math.min(1, d / segs[i]);
      const [x0, y0] = path[i];
      const [x1, y1] = path[i + 1];
      return { x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k, a: Math.atan2(-(y1 - y0), x1 - x0) };
    }
    d -= segs[i];
  }
  return { x: path[0][0], y: path[0][1], a: 0 };
}
/** The surface analysis off the weather fax: isobars, a low and a high, a typhoon coming up from the south. */
const paintWeather: Paint = (c) => {
  c.fillStyle = '#f3f1ea';
  c.fillRect(0, 0, 256, 320);
  c.strokeStyle = '#222222';
  c.lineWidth = 1.2;
  for (let i = 1; i <= 5; i++) {
    c.beginPath();
    c.ellipse(80, 120, 18 * i, 13 * i, 0.4, 0, Math.PI * 2);
    c.stroke();
  }
  for (let i = 1; i <= 3; i++) {
    c.beginPath();
    c.ellipse(200, 70, 16 * i, 12 * i, -0.3, 0, Math.PI * 2);
    c.stroke();
  }
  text(c, 'L', 80, 120, 22, '#111111', 'center');
  text(c, '996', 80, 142, 11, '#111111', 'center', false);
  text(c, 'H', 200, 70, 22, '#111111', 'center');
  text(c, '1024', 200, 92, 11, '#111111', 'center', false);
  // A cold front off the low, its triangles.
  c.beginPath();
  c.moveTo(96, 132);
  c.quadraticCurveTo(150, 180, 160, 250);
  c.stroke();
  for (let i = 0; i < 5; i++) {
    const y = 150 + i * 20;
    const x = 110 + i * 11;
    c.fillStyle = '#111111';
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + 9, y + 2);
    c.lineTo(x + 3, y + 9);
    c.fill();
  }
  // The typhoon and its track.
  c.lineWidth = 2.5;
  c.beginPath();
  c.arc(70, 262, 9, 0, Math.PI * 2);
  c.moveTo(70, 253);
  c.quadraticCurveTo(86, 248, 88, 236);
  c.moveTo(70, 271);
  c.quadraticCurveTo(54, 276, 52, 288);
  c.stroke();
  c.setLineDash([4, 4]);
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(60, 310);
  c.lineTo(70, 262);
  c.lineTo(110, 200);
  c.stroke();
  c.setLineDash([]);
  text(c, '태풍 11호', 98, 272, 12, '#111111', 'left');
  text(c, '지상 일기도 10/27 09KST', 128, 14, 12, '#111111', 'center');
};
const paintForecast: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 320, 112);
  text(c, '해상 예보 (10/27 오후)', 10, 14, 14, '#c62828');
  text(c, '앞바다: 북동풍 10~14m/s · 파고 2~3m', 10, 40, 13, '#1565c0', 'left', false);
  text(c, '먼바다: 풍랑주의보 ⚠ 파고 3~5m', 10, 64, 13, '#1565c0', 'left', false);
  text(c, '시정 양호 · 태풍 11호 북상 중', 10, 88, 13, '#1565c0', 'left', false);
};
const paintChecklist: Paint = (c) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 128, 170);
  text(c, '구명 설비 점검표', 64, 12, 11, '#c62828', 'center');
  ['구명동의 4', '방수복 2', '구명환 2', '구명뗏목 25인', '신호홍염', 'EPIRB', '구급함'].forEach((s, i) => {
    c.strokeStyle = '#455a64';
    c.strokeRect(8, 26 + i * 20, 10, 10);
    text(c, '✓', 13, 31 + i * 20, 10, '#2e7d32', 'center');
    text(c, s, 24, 31 + i * 20, 10, '#263238', 'left', false);
  });
};
const paintLog: Paint = (c) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 160, 110);
  text(c, '항해 일지 DECK LOG', 80, 10, 10, NAVY, 'center');
  for (let i = 0; i < 7; i++) {
    c.fillStyle = '#b0bec5';
    c.fillRect(6, 24 + i * 12, 148, 0.8);
    text(c, ['0800 당직 인수', '0815 047° 12kn', '0840 등대 정횡', '0900 풍향 NE4', '0920 선박 통과', '0945 변침 062°', ''][i], 8, 19 + i * 12, 8, '#37474f', 'left', false);
  }
};
const paintPassage: Paint = (c) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 128, 170);
  text(c, '항해 계획 PASSAGE PLAN', 64, 12, 9, NAVY, 'center');
  for (let i = 0; i < 7; i++) text(c, `WP${i + 1}  ${34 + (i % 2)}°${10 + i * 6}'N  ${(40 + i * 23) % 360}°`, 6, 30 + i * 16, 8, '#37474f', 'left', false);
};
const paintPlotSheet: Paint = (c) => {
  c.fillStyle = PAPER;
  c.fillRect(0, 0, 128, 128);
  c.strokeStyle = '#90a4ae';
  for (let i = 1; i <= 3; i++) {
    c.beginPath();
    c.arc(64, 64, i * 18, 0, Math.PI * 2);
    c.stroke();
  }
  c.strokeStyle = '#c62828';
  c.beginPath();
  c.moveTo(64, 64);
  c.lineTo(96, 30);
  c.moveTo(90, 46);
  c.lineTo(102, 36);
  c.stroke();
  text(c, 'CPA 0.8NM', 6, 118, 9, '#263238', 'left', false);
};
const paintRudder: Paint = (c) => {
  c.fillStyle = '#111111';
  c.fillRect(0, 0, 128, 72);
  c.strokeStyle = '#eeeeee';
  c.lineWidth = 2;
  c.beginPath();
  c.arc(64, 66, 52, Math.PI, 0);
  c.stroke();
  for (let d = -35; d <= 35; d += 5) {
    const a = (d * Math.PI) / 180;
    c.strokeStyle = d < 0 ? '#ef5350' : d > 0 ? '#66bb6a' : '#ffffff';
    c.beginPath();
    c.moveTo(64 + Math.sin(a) * 44, 66 - Math.cos(a) * 44);
    c.lineTo(64 + Math.sin(a) * 52, 66 - Math.cos(a) * 52);
    c.stroke();
  }
  text(c, 'RUDDER', 64, 40, 11, '#ffffff', 'center');
  text(c, 'P', 12, 60, 11, '#ef5350', 'center');
  text(c, 'S', 116, 60, 11, '#66bb6a', 'center');
};

// ---------------------------------------------------------------------------------------------

let bridgeCount = 0;
let chartCount = 0;

// =============================================================================================
// The ship at the quay (2026-11-04, the layout audit): her hull round the walkable deck, the hold's hatches, the stern winch, the
// bridge's console, the gangway.

const NOL = { outline: false };
const HULL = '#1f3a5f';

/**
 * 선체 (held at the deck's north-west tile, drawn from there over 24 × 6): the hull's sides along the deck's north and south edges
 * and round the stern at the east, dark blue with the red boot-top at the water and the white sheer strake, the bulwark and its
 * rail along the deck's edge, her name and port on the side towards the quay; she runs on west past the lot.
 */
function shipHull(g: THREE.Group) {
  // The tile's middle is (0.5, 0.5) on the deck; the deck runs x 1..25, y 1..7 on the lot.
  const x0 = -0.5 - 8;
  const x1 = 24 - 0.5;
  const zN = -0.5;
  const zS = 6 - 0.5;
  const len = x1 - x0;
  for (const z of [zN, zS]) {
    part(g, box(len, 1.1, 0.25), HULL, (x0 + x1) / 2, -0.35, z, NOL);
    part(g, box(len, 0.18, 0.26), '#b71c1c', (x0 + x1) / 2, 0.08, z, NOL);
    part(g, box(len, 0.08, 0.27), '#eceff1', (x0 + x1) / 2, 0.22, z, NOL);
    part(g, box(len, 0.7, 0.08), '#dfe3e6', (x0 + x1) / 2, 0.6, z + (z < 0 ? 0.08 : -0.08), NOL);
    part(g, box(len, 0.06, 0.1), '#90a4ae', (x0 + x1) / 2, 0.98, z + (z < 0 ? 0.08 : -0.08), NOL);
  }
  // The stern: the transom across the east end, her name on it.
  part(g, box(0.25, 1.1, zS - zN + 0.25), HULL, x1, -0.35, (zN + zS) / 2, NOL);
  part(g, box(0.08, 0.7, zS - zN), '#dfe3e6', x1 - 0.08, 0.6, (zN + zS) / 2, NOL);
  label(g, '한빛 7호 · 한빛항', 3.2, 0.36, 12, -0.1, zS + 0.14, HULL, '#ffffff');
  label(g, '한빛 7호', 1.8, 0.3, x1 + 0.14, -0.1, (zN + zS) / 2, HULL, '#ffffff', Math.PI / 2);
}

/** 화물창 해치 덮개 (8 × 4): the hold's steel covers, red, ribbed, in panels across the deck, the coaming round them. */
function hatchCover(g: THREE.Group, W: number, D: number) {
  part(g, rbox(W - 0.2, 0.5, D - 0.2, 0.05), '#5d4037', 0, 0.25, 0);
  const n = 4;
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + 0.3 + ((W - 0.6) * (i + 0.5)) / n;
    part(g, rbox((W - 0.6) / n - 0.08, 0.32, D - 0.5, 0.05), '#c62828', x, 0.66, 0);
    for (let k = 0; k < 3; k++) part(g, box((W - 0.6) / n - 0.2, 0.05, 0.08), '#a01e1e', x, 0.84, -D / 2 + 0.8 + k * ((D - 1.6) / 2), NOL);
  }
}

/** 계류 윈치 (2 × 1): the mooring winch on its bed, the drum with the rope wound on, the warping end. */
function winch(g: THREE.Group, W: number) {
  part(g, rbox(W - 0.2, 0.25, 0.7, 0.04), '#455a64', 0, 0.12, 0);
  part(g, cyl(0.28, 0.28, 0.8, 16), '#37474f', -0.2, 0.55, 0, { rz: Math.PI / 2 });
  part(g, cyl(0.3, 0.3, 0.6, 16), '#e8d9b0', -0.2, 0.55, 0, { rz: Math.PI / 2 });
  part(g, cyl(0.18, 0.22, 0.3, 14), '#90a4ae', 0.55, 0.55, 0, { rz: Math.PI / 2 });
}

/**
 * 선교 조타 콘솔 (4 × 1): along the bridge's windows the console: the radar and the ECDIS screens, the small wheel and the autopilot
 * in the middle, the engine levers, the VHF overhead. The watch kept stood at it, the eyes going between the screens and the sea.
 */
function helmConsole(g: THREE.Group, W: number, D: number, out: Parameters<Builder>[6]) {
  const zb = -D / 2 + 0.3;
  part(g, rbox(W - 0.1, 1.0, 0.6, 0.04), '#37474f', 0, 0.5, zb);
  part(g, rbox(W - 0.1, 0.06, 0.7, 0.03), '#263238', 0, 1.02, zb + 0.05, { rx: -0.25 });
  const screen = (x: number, c: string) => {
    part(g, rbox(0.7, 0.5, 0.06, 0.02), BLACK, x, 1.35, zb - 0.15, { rx: -0.2 });
    part(g, box(0.64, 0.44, 0.002), c, x, 1.35, zb - 0.115, { rx: -0.2, outline: false });
  };
  screen(-1.3, '#0b3d2a');
  screen(1.3, '#0b2740');
  screen(-0.45, '#10233a');
  part(g, ring(0.13, 0.02), '#6d4c41', 0.4, 1.12, zb + 0.15, { rx: -1.1, outline: false });
  part(g, rbox(0.3, 0.1, 0.2, 0.02), '#90a4ae', 0.85, 1.08, zb + 0.15);
  for (const sx of [-1, 1]) part(g, box(0.04, 0.2, 0.04), '#e53935', 0.85 + sx * 0.06, 1.18, zb + 0.18, NOL);
  part(g, rbox(0.4, 0.15, 0.15, 0.02), '#263238', 0, 2.1, zb - 0.2);
  label(g, 'VHF 16', 0.3, 0.07, 0, 2.1, zb - 0.12, '#263238', '#7dff9a');
  const watch = spot(g, 'stand', 0, 0, D / 2 + 0.5, Math.PI);
  watch.work = marker(g, 0, 1.2, zb + 0.2);
  watch.motion = 'type';
  out.work = watch.work;
  out.spots = { '*': watch };
}

/** 현문 사다리: the gangway's foot on the quay, the ladder up over the water to the deck with its net slung under, the post where whoever comes aboard is checked. */
function gangway(g: THREE.Group, out: Parameters<Builder>[6]) {
  part(g, cyl(0.05, 0.05, 1.3, 8), '#90a4ae', 0.3, 0.65, 0.2);
  part(g, rbox(0.4, 0.3, 0.06, 0.02), '#fbc02d', 0.3, 1.25, 0.24);
  label(g, '승선 확인', 0.36, 0.1, 0.3, 1.25, 0.28, '#fbc02d', '#111111');
  // The ladder from the quay's edge (north) up to the deck one tile beyond, west a tile.
  const a = new THREE.Vector3(-0.8, 0.4, -0.5);
  const b = new THREE.Vector3(-1.0, 1.1, -1.8);
  for (const sx of [-1, 1]) {
    rod(g, a.clone().add(new THREE.Vector3(sx * 0.35, 0, 0)), b.clone().add(new THREE.Vector3(sx * 0.35, 0, 0)), 0.03, '#b0bec5');
    rod(g, a.clone().add(new THREE.Vector3(sx * 0.35, 0.9, 0)), b.clone().add(new THREE.Vector3(sx * 0.35, 0.9, 0)), 0.025, '#eceff1');
  }
  part(g, box(0.7, 0.04, 1.4), '#78909c', -0.9, 0.75, -1.15, { rx: 0.5, outline: false });
  const net = new THREE.Mesh(box(1.0, 0.01, 1.4), new THREE.MeshToonMaterial({ color: '#e8d9b0', transparent: true, opacity: 0.4, depthWrite: false }));
  net.position.set(-0.9, 0.25, -1.15);
  g.add(net);
  const check = spot(g, 'stand', 0, 0, 0.75, Math.PI);
  check.work = marker(g, -0.6, 1.2, -0.5);
  check.motion = 'talk';
  out.work = check.work;
  out.spots = { '*': check };
}

export const BUILDERS: Record<string, Builder> = {
  sfHull(g) {
    shipHull(g);
  },
  sfHatch(g, W, D) {
    hatchCover(g, W, D);
  },
  sfWinch(g, W) {
    winch(g, W);
  },
  sfHelmConsole(g, W, D, _c, _def, _ctx, out) {
    helmConsole(g, W, D, out);
  },
  sfGangway(g, _W, _D, _c, _def, _ctx, out) {
    gangway(g, out);
  },
  /**
   * The bridge simulator (선교 조타 시뮬레이터): three window screens on a black frame with the sea
   * out ahead painted on them — sky and clouds, islands with a lighthouse, a ship on the horizon,
   * whitecaps running in toward the bow and the deck cargo — turning as the wheel's put over and
   * running faster with the engine lever; the rudder indicator and the heading under the header;
   * the console with the ECDIS and the radar, the gyro repeater, the VHF, the deck log and the
   * binoculars on it, the engine lever at its right; the wheel on its pedestal in front. A navigation
   * drill: stood at the wheel — put over to port and back, the lever ahead, the binoculars up and
   * swept round, a finger on the ECDIS, to starboard, eased. Standing a watch: the binoculars swept
   * slowly, a line in the log, a look at the radar.
   */
  shipBridge(g, _W, _D, _c, _def, _ctx, out) {
    const n = bridgeCount++;
    // The window screens on their frame.
    const sy = 1.5;
    const sh = 0.7;
    const zc = -0.44;
    const cw = 0.98;
    const sw = 0.55;
    const tilt = 0.5;
    part(g, rbox(2.0, 0.12, 0.14, 0.02), BLACK, 0, 2.03, -0.42);
    for (const x of [-0.97, 0.97]) part(g, rbox(0.06, 2.04, 0.12, 0.02), BLACK, x, 1.02, -0.2);
    label(g, 'SHIP BRIDGE SIMULATOR · 선교 조타 시뮬레이터', 1.2, 0.07, 0, 2.03, -0.348, BLACK, '#e0e0e0');
    const seaTex = painted('sfSea', 1024, 256, paintSea);
    const waveTex = painted('sfWaves', 512, 256, paintWaves);
    const panels: Array<{ bg: THREE.Texture; wv: THREE.Texture; off: number; mats: THREE.MeshBasicMaterial[] }> = [];
    const hz = 112 / 256;
    const panel = (x: number, z: number, ry: number, w: number, off: number) => {
      const p = group(g, x, sy, z, ry);
      part(p, rbox(w + 0.05, sh + 0.06, 0.04, 0.01), '#111418', 0, 0, -0.025);
      const bg = seaTex.clone();
      bg.needsUpdate = true;
      bg.repeat.set(0.33 * (w / cw), 1);
      const wv = waveTex.clone();
      wv.needsUpdate = true;
      wv.repeat.set(0.6 * (w / cw), 0.8);
      const m1 = picture(p, bg, w, sh, 0, 0, 0);
      const seaH = sh * (1 - hz);
      const m2 = overlay(p, wv, w, seaH, 0, -sh / 2 + seaH / 2, 0.002);
      panels.push({ bg, wv, off, mats: [m1.material as THREE.MeshBasicMaterial, m2.material as THREE.MeshBasicMaterial] });
      return p;
    };
    const centre = panel(0, zc, 0, cw, 0);
    const half = sw / 2;
    panel(-cw / 2 - half * Math.cos(tilt), zc + half * Math.sin(tilt), tilt, sw, -0.33 * ((cw + sw) / 2 / cw));
    panel(cw / 2 + half * Math.cos(tilt), zc + half * Math.sin(tilt), -tilt, sw, 0.33 * ((cw + sw) / 2 / cw));
    // The bow and the cargo out ahead, on the centre screen.
    const bow = overlay(centre, painted('sfBow', 512, 200, paintBow), cw, cw * (200 / 512), 0, -sh / 2 + (cw * 200) / 512 / 2, 0.004);
    const bowY = bow.position.y;
    panels[0].mats.push(bow.material as THREE.MeshBasicMaterial);
    // Under the header: the rudder indicator and the heading.
    const rud = group(g, -0.18, 1.92, -0.36);
    part(rud, rbox(0.28, 0.17, 0.05, 0.01), '#1b1b1b', 0, 0, -0.01);
    picture(rud, painted('sfRudder', 128, 72, paintRudder), 0.25, 0.14, 0, 0, 0.017);
    const needle = group(rud, 0, -0.06, 0.02);
    glowing(needle, box(0.006, 0.09, 0.002), '#ffeb3b', 0, 0.045, 0);
    const hdg = group(g, 0.18, 1.92, -0.36);
    part(hdg, rbox(0.24, 0.12, 0.05, 0.01), '#1b1b1b', 0, 0, -0.01);
    label(hdg, 'HDG 047°', 0.2, 0.06, 0, 0.0, 0.017, '#000000', '#ff9100');
    // The console: its body, the sloped instrument top.
    part(g, rbox(1.9, 0.85, 0.34, 0.03), CONSOLE, 0, 0.425, -0.19);
    part(g, box(1.84, 0.04, 0.005), CONSOLE_D, 0, 0.12, -0.018, { outline: false });
    part(g, rbox(1.92, 0.035, 0.38, 0.012), CONSOLE_D, 0, 0.92, -0.19, { rx: 0.38 });
    // The two screens on the console's back: the ECDIS (lit while used) and the radar, a sweep on it.
    const mon = (x: number) => {
      const m = group(g, x, 1.14, -0.27);
      m.rotation.x = -0.18;
      part(m, rbox(0.44, 0.31, 0.05, 0.012), '#1b1f23', 0, 0, -0.01);
      return m;
    };
    const ecdis = mon(HELM.ecdis[0]);
    out.screen = litScreen(ecdis, painted('sfEcdis', 320, 220, paintEcdis), 0.39, 0.26, 0, 0, 0.017);
    const radarM = mon(HELM.radar[0]);
    const radarFace = picture(radarM, painted('sfRadarFace', 256, 256, paintRadar), 0.26, 0.26, 0, 0, 0.017);
    part(radarM, box(0.06, 0.2, 0.004), '#263238', 0.17, 0, 0.016, { outline: false });
    const sweep = new THREE.Mesh(new THREE.CircleGeometry(0.122, 12, 0, 0.5), new THREE.MeshBasicMaterial({ color: '#7dffaa', transparent: true, opacity: 0.45, depthWrite: false }));
    sweep.userData.ownGeometry = sweep.userData.ownMaterial = true;
    sweep.position.set(0, 0, 0.019);
    sweep.renderOrder = 4;
    radarM.add(sweep);
    // The gyro repeater in the middle, the VHF at the right, the deck log at the left, labels.
    part(g, cyl(0.07, 0.08, 0.04, 20), '#263238', 0, 0.96, -0.2, { rx: 0.38 });
    part(g, cyl(0.06, 0.06, 0.005, 20), '#fff8e1', 0, 0.983, -0.205, { rx: 0.38, outline: false });
    part(g, box(0.004, 0.003, 0.05), '#d32f2f', 0, 0.987, -0.205, { rx: 0.38, outline: false });
    const vhf = group(g, 0.68, 0.93, -0.16, 0);
    vhf.rotation.x = 0.38;
    part(vhf, rbox(0.24, 0.07, 0.14, 0.012), '#212121', 0, 0.03, 0);
    glowing(vhf, box(0.08, 0.025, 0.002), '#ff9100', -0.05, 0.035, 0.072);
    label(vhf, 'VHF 16', 0.07, 0.022, 0.06, 0.035, 0.072, '#212121', '#e0e0e0');
    part(g, rbox(0.055, 0.15, 0.035, 0.014), '#212121', 0.9, 0.93, -0.06, { rx: 0.2 });
    const logBook = group(g, HELM.log[0], 1.04 + HELM.log[1], 0.16 + HELM.log[2]);
    logBook.rotation.x = 0.38;
    part(logBook, rbox(0.22, 0.012, 0.16, 0.004), NAVY, 0, 0, 0);
    flat(logBook, painted('sfDeckLog', 160, 110, paintLog), 0.2, 0.14, 0, 0.0065, 0);
    for (const [s, x] of [['조타 모드 · 수동', -0.62], ['ARPA', -0.3]] as const) label(g, s, 0.16, 0.035, x, 0.88, -0.0, CONSOLE, '#e0e0e0');
    for (let i = 0; i < 5; i++) glowing(g, box(0.025, 0.012, 0.004), i === 4 ? '#ff5252' : '#69f0ae', -0.36 + i * 0.05, 0.85, 0.0);
    // The engine lever at their right, a second one locked beside it, the scale on the housing.
    const lp = new THREE.Vector3(HELM.lever[0], 1.04 + HELM.lever[1], 0.16 + HELM.lever[2]);
    part(g, rbox(0.2, 0.09, 0.16, 0.02), '#2b3238', lp.x + 0.03, lp.y - 0.04, lp.z);
    label(g, '전진 · 정지 · 후진', 0.17, 0.03, lp.x + 0.03, lp.y + 0.006, lp.z + 0.081, '#2b3238', '#ffd54f');
    const lever = group(g, lp.x, lp.y, lp.z);
    part(lever, cyl(0.009, 0.009, HELM.leverLen, 8), CHROME, 0, HELM.leverLen / 2, 0, { outline: false });
    part(lever, ball(0.024), '#c62828', 0, HELM.leverLen + 0.01, 0);
    const lever2 = group(g, lp.x + 0.08, lp.y, lp.z);
    part(lever2, cyl(0.009, 0.009, HELM.leverLen, 8), CHROME, 0, HELM.leverLen / 2, 0, { outline: false });
    part(lever2, ball(0.024), '#2e7d32', 0, HELM.leverLen + 0.01, 0);
    lever2.rotation.x = 0.28;
    // The wheel on its pedestal: a chrome rim, six spokes with their wooden handles.
    const hub = marker(g, 0, 1.04, 0.16);
    part(g, cyl(0.05, 0.11, 0.92, 16), '#2b3238', 0, 0.46, 0.08);
    part(g, rbox(0.16, 0.14, 0.16, 0.03), '#2b3238', 0, 0.98, 0.1);
    part(g, cyl(0.03, 0.03, 0.06, 12), CHROME, 0, 1.04, 0.13, { rx: Math.PI / 2, outline: false });
    const wheel = group(g, 0, 1.04, 0.16);
    part(wheel, ring(HELM.R, 0.012), CHROME, 0, 0, 0);
    part(wheel, cyl(0.035, 0.035, 0.04, 14), BRASS, 0, 0, 0, { rx: Math.PI / 2 });
    for (let k = 0; k < 6; k++) {
      const a = 0.55 + (k * Math.PI) / 3;
      const sp = group(wheel, 0, 0, 0);
      sp.rotation.z = a - Math.PI / 2;
      part(sp, cyl(0.007, 0.007, HELM.R, 8), CHROME, 0, HELM.R / 2, 0, { outline: false });
      part(sp, cyl(0.012, 0.016, 0.06, 8), OAK, 0, HELM.R + 0.035, 0);
    }
    // The binoculars, put down on the console when they aren't up.
    const binRest = binoculars(g);
    binRest.position.set(-0.2, 0.94, -0.12);
    binRest.rotation.set(0.38, 0.3, 0);

    // Stood at the wheel.
    const helm = standAt(g, 0, 0.56, Math.PI, 'sfHelm', hub);
    const look = also(g, helm, 'sfLookout');
    out.work = hub;
    out.spots = { navigationDrill: helm, seafarer_standWatch: look, '*': helm };
    const use = group(g);
    out.inUse = use;
    const bin = binoculars(use);
    let heading = n * 0.37;
    let roll = 0;
    let last = 0;
    out.animate = (t) => {
      const dt = Math.min(0.1, Math.max(0, t - last));
      last = t;
      const onHelm = posed(helm, t);
      const onLook = !onHelm && posed(look, t);
      const live = onHelm || onLook;
      let wheelA = 0;
      let leverQ = 0.3;
      let held: { l?: THREE.Vector3; r?: THREE.Vector3 } | null = null;
      let yaw = Math.PI;
      if (live) {
        const s = onHelm ? helm : look;
        const m = onHelm ? 'sfHelm' : 'sfLookout';
        const ph = phaseOf(hub);
        turnSpot(s, m, t, ph);
        const h = helmAt(m, frameOf(s, hub), t, ph);
        wheelA = h.wheel;
        leverQ = h.lever;
        if (h.bino) held = h;
        yaw = s.at.rotation.y;
      }
      wheel.rotation.z = wheelA;
      lever.rotation.x = -(-0.7 + 1.4 * leverQ);
      needle.rotation.z = -wheelA * 0.7;
      bin.visible = !!held;
      binRest.visible = !held;
      if (held?.l && held.r) {
        bin.position.copy(held.l).lerp(held.r, 0.5).add(new THREE.Vector3(Math.sin(yaw) * 0.02, 0, Math.cos(yaw) * 0.02));
        bin.rotation.set(0, yaw, 0);
      }
      // The sea: it turns with the wheel, runs with the lever, rolls a little.
      heading += (wheelA * 0.05 + 0.002) * dt;
      roll += dt * (live ? 0.05 + 0.12 * leverQ : 0.02);
      for (const p of panels) {
        p.bg.offset.x = heading + p.off;
        p.wv.offset.x = heading * 1.8 + p.off * 1.8;
        p.wv.offset.y = roll;
        for (const m of p.mats) m.color.set(live ? '#ffffff' : DIM);
      }
      bow.position.y = bowY + 0.008 * Math.sin(t * 0.8);
      (radarFace.material as THREE.MeshBasicMaterial).color.set(live ? '#ffffff' : DIM);
      sweep.visible = live;
      sweep.rotation.z = -t * 2.5;
    };
  },

  /**
   * The chart table (해도 테이블): a plan chest of wide shallow drawers (해도 by number), the approach
   * chart spread on its top — the coast, soundings, the fairway's buoys, the lighthouses, an
   * anchorage, the compass rose, the scales round its border — the parallel rulers, the dividers and
   * a pencil on it, the passage plan notebook; the books along its back (조석표, 등대표, 항로지,
   * 국제신호서), the GPS repeater and the chart lamp over it. Plotting a course: the rulers walked
   * from the rose to the course, the line pencilled along them (it's drawn as it goes), the dividers
   * stepped along it and laid on the latitude scale, the plan written up, the rulers slid back. The
   * port's regulations: the book read stood at it.
   */
  chartTable(g, _W, _D, _c, _def, _ctx, out) {
    const n = chartCount++;
    const top = 0.92;
    // The plan chest.
    part(g, rbox(1.86, top - 0.06, 0.82, 0.02), OAK_D, 0, (top - 0.06) / 2, -0.07);
    for (let i = 0; i < 5; i++) {
      const y = 0.12 + i * 0.15;
      part(g, rbox(1.78, 0.13, 0.02, 0.01), OAK, 0, y, 0.345);
      for (const sx of [-1, 1]) part(g, rbox(0.12, 0.022, 0.025, 0.01), BRASS, sx * 0.5, y, 0.36);
      label(g, `해도 ${String(i * 40 + 1).padStart(3, '0')}–${(i + 1) * 40}`, 0.2, 0.04, 0, y, 0.357, '#fff8e1', '#4e342e');
    }
    part(g, rbox(1.94, 0.04, 0.88, 0.012), OAK, 0, top - 0.02, -0.06);
    // The fiddle rail round the top.
    part(g, box(1.94, 0.025, 0.02), OAK_D, 0, top + 0.012, 0.37);
    for (const sx of [-1, 1]) part(g, box(0.02, 0.025, 0.86), OAK_D, sx * 0.96, top + 0.012, -0.06);
    // The chart, its fresh course line (drawn as it's plotted).
    const work = marker(g, 0, top + 0.004, 0);
    flat(g, painted('sfChart', 1024, 460, paintChart), 1.6, 0.72, 0, top + 0.002, 0);
    const A = new THREE.Vector3(CHART.a[0], 0, CHART.a[2]);
    const B = new THREE.Vector3(CHART.b[0], 0, CHART.b[2]);
    const len = A.distanceTo(B);
    const line = part(g, box(1, 0.002, 0.004), '#37474f', 0, top + 0.005, 0, { outline: false, shadow: false });
    line.rotation.y = COURSE_RY;
    // The passage plan notebook, the eraser, the books along the back.
    part(g, rbox(0.22, 0.012, 0.28, 0.004), NAVY, CHART.note[0], top + 0.006, CHART.note[2]);
    flat(g, painted('sfPassage', 128, 170, paintPassage), 0.19, 0.25, CHART.note[0], top + 0.013, CHART.note[2]);
    part(g, rbox(0.05, 0.015, 0.025, 0.006), '#f48fb1', 0.5, top + 0.008, 0.3);
    part(g, rbox(1.9, 0.26, 0.1, 0.01), OAK_D, 0, top + 0.13, -0.44);
    const books: Array<[string, string]> = [['조석표 2026', '#1565c0'], ['등대표', '#c62828'], ['항로지', '#2e7d32'], ['국제신호서', '#f9a825'], ['COLREG', '#37474f'], [`${PORT} 항만 규정`, '#6a1b9a']];
    books.forEach(([s, col], i) => {
      const x = -0.86 + i * 0.07 + (i > 3 ? 0.02 : 0);
      part(g, rbox(0.055, 0.22, 0.17, 0.006), col, x, top + 0.37, -0.42);
      label(g, s, 0.16, 0.035, x, top + 0.37, -0.334, col, '#ffffff', 0).rotation.z = Math.PI / 2;
    });
    part(g, rbox(1.9, 0.02, 0.2, 0.006), OAK, 0, top + 0.26, -0.42);
    // The GPS repeater on its bracket, the chart lamp on its arm (its red glass lit while the chart's worked).
    const gps = group(g, 0.62, top + 0.355, -0.4);
    part(gps, rbox(0.26, 0.17, 0.06, 0.012), '#212121', 0, 0, 0);
    label(gps, `GPS 34°58.2'N 129°03.7'E`, 0.22, 0.04, 0, 0.03, 0.031, '#0b3d2e', '#69f0ae');
    label(gps, 'SOG 0.0 kn · COG ---', 0.22, 0.035, 0, -0.025, 0.031, '#0b3d2e', '#69f0ae');
    part(g, cyl(0.06, 0.07, 0.03, 14), '#212121', -0.3, top + 0.27 + 0.015, -0.42);
    const arm = [new THREE.Vector3(-0.3, top + 0.29, -0.42), new THREE.Vector3(-0.3, top + 0.62, -0.38), new THREE.Vector3(-0.15, top + 0.66, -0.2)];
    for (let i = 0; i < 2; i++) {
      const r = part(g, cyl(0.008, 0.008, 1, 8), '#212121', 0, 0, 0, { outline: false });
      stretch(r, arm[i], arm[i + 1]);
    }
    part(g, cyl(0.03, 0.06, 0.08, 14), '#212121', arm[2].x, arm[2].y - 0.03, arm[2].z, { rx: 0.4 });
    const lampGlow = glowing(g, cyl(0.05, 0.05, 0.004, 14), '#ff5252', arm[2].x, arm[2].y - 0.072, arm[2].z + 0.017, 0.4);
    lampGlow.visible = false;
    // The tools at rest: the rulers by the rose, the dividers, the pencil.
    const rulers = group(g, 0, top + 0.008, 0);
    for (const s of [-1, 1]) {
      part(rulers, rbox(CHART.rulerHalf * 2, 0.008, 0.032, 0.004), '#cfe0e8', 0, 0, s * 0.019);
      for (let i = 0; i < 9; i++) part(rulers, box(0.002, 0.0015, 0.012), '#37474f', -0.16 + i * 0.04, 0.005, s * 0.019 + 0.008 * s, { outline: false });
    }
    for (const sx of [-0.12, 0.12]) part(rulers, box(0.012, 0.004, 0.05), BRASS, sx, 0.006, 0, { outline: false });
    const dividers = group(g);
    const legs = [-1, 1].map((s) => {
      const l = group(dividers);
      part(l, cyl(0.0035, 0.0025, 0.105, 6), CHROME, 0, -0.0525, 0, { outline: false });
      l.userData.s = s;
      return l;
    });
    part(dividers, cyl(0.009, 0.009, 0.012, 10), BRASS, 0, 0, 0, { rx: Math.PI / 2, outline: false });
    const divRest = group(g, -0.42, top + 0.006, 0.28, 0.4);
    for (const s of [-1, 1]) part(divRest, cyl(0.0035, 0.0035, 0.11, 6), CHROME, s * 0.012, 0, 0, { rz: Math.PI / 2, ry: s * 0.12, outline: false });
    const pencil = group(g);
    pencil.rotation.order = 'YXZ';
    part(pencil, cyl(0.004, 0.004, 0.14, 6), '#f9a825', 0, 0.06, 0, { outline: false });
    part(pencil, cyl(0.0001, 0.004, 0.015, 6), '#5d4037', 0, -0.018, 0, { outline: false });
    const pencilRest = pen(g, 0.62, top + 0.004, 0.36, 0.1, '#f9a825');

    // Stood at the table's long side.
    const plot = standAt(g, 0, 0.58, Math.PI, 'sfPlot', work);
    const regs = also(g, plot, 'read');
    const passage = also(g, plot, 'sfPlot');
    out.work = work;
    out.spots = { plotCourse: plot, seafarer_passagePlan: passage, seafarer_reviewRegs: regs, '*': plot };
    const set = (k: number) => {
      line.visible = k > 0.001;
      line.scale.x = Math.max(0.001, k * len);
      line.position.set(A.x + (B.x - A.x) * k * 0.5, top + 0.005, A.z + (B.z - A.z) * k * 0.5);
    };
    set(n % 2 ? 1 : 0);
    out.animate = (t) => {
      const s = posed(plot, t) ? plot : posed(passage, t) ? passage : null;
      lampGlow.visible = !!s || posed(regs, t);
      rulers.rotation.y = COURSE_RY;
      if (!s) {
        rulers.position.set(CHART.rose[0], top + 0.008, CHART.rose[2]);
        dividers.visible = pencil.visible = false;
        divRest.visible = pencilRest.visible = true;
        return;
      }
      const ph = phaseOf(work);
      turnSpot(s, 'sfPlot', t, ph);
      const p = plotAt(frameOf(s, work), t, ph);
      rulers.position.set(p.ruler[0], top + 0.008, p.ruler[1]);
      dividers.visible = !!p.dividers;
      divRest.visible = !p.dividers;
      if (p.dividers) {
        dividers.position.copy(p.dividers).add(new THREE.Vector3(0, 0.01, 0));
        dividers.rotation.set(0, COURSE_RY, 0);
        const a = Math.asin(Math.min(0.9, p.spread / 2 / 0.105));
        for (const l of legs) l.rotation.z = (l.userData.s as number) * a;
      }
      pencil.visible = !!p.pencil;
      pencilRest.visible = !p.pencil;
      if (p.pencil) {
        pencil.position.copy(p.pencil).add(new THREE.Vector3(0, 0.005, 0));
        pencil.rotation.set(0.35, s.at.rotation.y, 0);
      }
      // The line: gone while the rulers are walked over, drawn as the pencil goes, there after.
      if (p.key === 'look' || p.key === 'ruler') set(0);
      else if (p.key === 'line' && p.pencil) set(Math.max(0, Math.min(1, (p.pencil.x - work.position.x - A.x) / (B.x - A.x))));
      else set(1);
    };
  },

  /**
   * The stowage planner (적하 계획 단말): a desk with the bay plan up on the big monitor — the bay's
   * cross-section, deck over hold, the boxes already stowed coloured by their port (부산, 상하이,
   * 롱비치, 싱가포르), the waiting list down the side — and the stability page on the small one; the
   * keyboard, the mouse, the manifest binder, a container model, a mug. Planning the cargo: sat at it
   * typing, a box dragged off the list into its slot (it follows the mouse there), the manifest's
   * pages turned, leant back over the stability page.
   */
  cargoPlanner(g, _W, _D, _c, _def, _ctx, out) {
    const top = 0.74;
    part(g, rbox(0.96, 0.035, 0.6, 0.012), '#eceff1', 0, top - 0.0175, -0.15);
    part(g, rbox(0.3, top - 0.04, 0.54, 0.012), '#b0bec5', 0.3, (top - 0.04) / 2, -0.15);
    part(g, rbox(0.035, top - 0.04, 0.54, 0.01), '#b0bec5', -0.44, (top - 0.04) / 2, -0.15);
    swivel(g, 0, 0.42, Math.PI, '#37474f');
    const work = marker(g, 0, top + 0.015, -0.05);
    // The big monitor with the bay plan; the overlay of what's stowed.
    const mon = group(g, -0.04, top, -0.33);
    part(mon, rbox(0.22, 0.012, 0.14, 0.005), BLACK, 0, 0.006, 0);
    part(mon, box(0.035, 0.16, 0.025), BLACK, 0, 0.09, -0.02, { outline: false });
    const face = group(mon, 0, 0.33, 0.0);
    face.rotation.x = -0.08;
    part(face, rbox(0.58, 0.37, 0.03, 0.01), BLACK, 0, 0, -0.012);
    const SW = 0.55;
    const SH = 0.344;
    out.screen = litScreen(face, painted('sfBayPlan', BAY.w, BAY.h, paintBayPlan), SW, SH, 0, 0, 0.005);
    const px = (x: number, y: number) => new THREE.Vector3((x / BAY.w - 0.5) * SW, (0.5 - y / BAY.h) * SH, 0.017);
    const cellAt = (i: number, j: number) => px(BAY.x0 + (i + 0.5) * BAY.cw, BAY.y0 + (j + 0.5) * BAY.ch + (j >= BAY.hatch ? 4 : -2));
    const cw = (BAY.cw / BAY.w) * SW * 0.86;
    const chh = (BAY.ch / BAY.h) * SH * 0.86;
    const stow = group(face);
    // The order the bay's filled in: the hold from the bottom up, then the deck.
    const order: Array<[number, number]> = [];
    for (let j = BAY.rows - 1; j >= 0; j--) for (let i = 0; i < BAY.cols; i++) order.push([(i * 4 + j) % BAY.cols, j]);
    const rnd = seeded(14);
    const cols = order.map(() => PORTS[Math.floor(rnd() * 4)][1]);
    const cells = order.map(([i, j], k) => {
      const m = part(stow, box(cw, chh, 0.002), cols[k], 0, 0, 0, { outline: false, shadow: false, material: new THREE.MeshBasicMaterial({ color: cols[k] }) });
      m.userData.ownMaterial = true;
      m.position.copy(cellAt(i, j));
      return m;
    });
    const moving = part(stow, box(cw, chh, 0.002), '#ffeb3b', 0, 0, 0, { outline: false, shadow: false, material: new THREE.MeshBasicMaterial({ color: '#ffeb3b' }) });
    moving.userData.ownMaterial = true;
    const cursor = new THREE.Mesh(new THREE.CircleGeometry(0.009, 3), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    cursor.userData.ownGeometry = cursor.userData.ownMaterial = true;
    cursor.rotation.z = -Math.PI / 2 - 0.4;
    stow.add(cursor);
    // The small monitor with the stability page, turned in.
    const mon2 = group(g, 0.34, top, -0.28, -0.45);
    part(mon2, rbox(0.14, 0.01, 0.1, 0.004), BLACK, 0, 0.005, 0);
    part(mon2, box(0.025, 0.1, 0.02), BLACK, 0, 0.06, -0.015, { outline: false });
    part(mon2, rbox(0.32, 0.21, 0.025, 0.008), BLACK, 0, 0.2, -0.008);
    picture(mon2, painted('sfStability', 256, 160, paintStability), 0.29, 0.18, 0, 0.2, 0.006);
    // Keyboard, mouse, the manifest binder, a container model, a mug.
    part(g, rbox(0.36, 0.016, 0.12, 0.006), '#37474f', 0, top + 0.008, -0.05);
    part(g, box(0.33, 0.004, 0.09), '#90a4ae', 0, top + 0.017, -0.05, { outline: false });
    const mouse = part(g, rbox(0.045, 0.02, 0.07, 0.015), '#263238', CARGO.mouse[0], top + 0.01, -0.05 + CARGO.mouse[2]);
    part(g, rbox(0.2, 0.004, 0.22, 0.002), '#455a64', CARGO.mouse[0], top + 0.002, -0.05, { outline: false });
    const bx = CARGO.binder[0];
    const bz = -0.05 + CARGO.binder[2];
    part(g, rbox(0.25, 0.03, 0.3, 0.008), '#1565c0', bx, top + 0.015, bz);
    flat(g, painted('sfManifest', 128, 170, paintManifest), 0.2, 0.26, bx, top + 0.032, bz);
    const model = group(g, -0.36, top, -0.36, 0.3);
    part(model, rbox(0.16, 0.02, 0.06, 0.005), '#263238', 0, 0.01, 0);
    ['#c62828', '#1565c0', '#2e7d32', '#ef6c00'].forEach((col, i) => part(model, box(0.06, 0.025, 0.025), col, -0.035 + (i % 2) * 0.065, 0.034 + Math.floor(i / 2) * 0.026, 0));
    part(g, cyl(0.032, 0.029, 0.085, 14), '#ffffff', 0.4, top + 0.0425, 0.02);
    label(g, COMPANY, 0.05, 0.02, 0.4, top + 0.05, 0.052, '#ffffff', NAVY);

    const sat = sitAt(g, 0, 0.48, 0.42, Math.PI, 'sfCargo', work);
    out.work = work;
    out.spots = { '*': sat };
    let lastN = -1;
    out.animate = (t) => {
      const on = posed(sat, t);
      const ph = phaseOf(work);
      const c = cargoAt(t, ph);
      const k = ((c.n % (order.length - 6)) + (order.length - 6)) % (order.length - 6) + 6;
      if (c.n !== lastN || !on) {
        lastN = c.n;
        cells.forEach((m, i) => (m.visible = i < k));
      }
      const [ti, tj] = order[k];
      const from = px(410, 75);
      const to = cellAt(ti, tj);
      moving.visible = on;
      cursor.visible = on;
      moving.position.copy(from).lerp(to, c.drag).setZ(0.018);
      (moving.material as THREE.MeshBasicMaterial).color.set(c.drag >= 1 ? cols[k] : '#ffeb3b');
      cursor.position.copy(moving.position).add(new THREE.Vector3(0.008, -0.008, 0.002));
      // The mouse goes where the hand drags it.
      mouse.position.x = CARGO.mouse[0] - 0.03 + 0.07 * c.drag;
      mouse.position.z = -0.05 + CARGO.mouse[2] + 0.025 - 0.05 * c.drag;
    };
  },

  /**
   * The radar console (해상 레이더): a grey pedestal with the PPI screen tilted up in its hood — the
   * range rings, the bearing scale, the coast's echoes, the sweep going round with its afterglow and
   * the ships' echoes lighting as it passes and fading; a target taken: the cursor (the EBL and VRM)
   * rolled out to it and the acquired square round it — the keypad and trackball below, the gain,
   * sea and rain knobs, the VHF handset on its hook, the plotting sheet on the side shelf; the chair.
   * Kept a ship's and a coast guard's both. Watching it: sat at it, the trackball rolled to a target
   * and acquired, the range and bearing noted, the handset up to call it, listened to.
   */
  radarConsole(g, _W, _D, _c, _def, _ctx, out) {
    const GREY = '#b0bac2';
    part(g, rbox(0.62, 0.72, 0.48, 0.03), GREY, 0, 0.36, -0.2);
    part(g, box(0.56, 0.05, 0.005), '#78909c', 0, 0.1, 0.042, { outline: false });
    label(g, 'ARPA RADAR · X-BAND', 0.3, 0.04, 0, 0.6, 0.042, GREY, '#37474f');
    // The control desk: keypad, the trackball (the work point), the knobs, the acquire key.
    const desk = group(g, 0, 0.76, 0.0);
    desk.rotation.x = 0.18;
    part(desk, rbox(0.66, 0.04, 0.26, 0.012), '#37474f', 0, 0, 0);
    const kb = (x: number, z: number, col = '#90a4ae') => part(desk, rbox(0.028, 0.012, 0.024, 0.004), col, x, 0.025, z, { outline: false });
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) kb(-0.25 + i * 0.035, -0.06 + j * 0.035);
    kb(RADAR.acq[0], 0.02, '#ffb300');
    for (let i = 0; i < 3; i++) {
      part(desk, cyl(0.018, 0.018, 0.02, 12), '#212121', 0.18 + i * 0.05, 0.03, -0.07);
      label(desk, ['GAIN', 'SEA', 'RAIN'][i], 0.04, 0.012, 0.18 + i * 0.05, 0.021, -0.035, '#37474f', '#e0e0e0').rotation.x = -Math.PI / 2;
    }
    part(desk, cyl(0.04, 0.04, 0.01, 16), '#212121', 0.08, 0.022, 0.01);
    const ball_ = part(desk, ball(0.026), '#455a64', 0.08, 0.03, 0.01);
    const work = marker(g, 0.08, 0.79, 0.015);
    // The side shelf with the plotting sheet, the handset's hook at the left.
    part(g, rbox(0.2, 0.02, 0.2, 0.006), '#37474f', 0.4, 0.75, 0.04);
    for (const z of [-0.04, 0.12]) part(g, box(0.015, 0.1, 0.015), '#37474f', 0.33, 0.7, z);
    flat(g, painted('sfPlotSheet', 128, 128, paintPlotSheet), 0.16, 0.16, 0.42, 0.762, 0.06, 0.1);
    pen(g, 0.4, 0.762, 0.16, 0.3);
    const hookAt = work.position.clone().add(new THREE.Vector3(RADAR.hook[0], RADAR.hook[1], RADAR.hook[2]));
    part(g, box(0.03, 0.05, 0.03), '#212121', hookAt.x - 0.035, hookAt.y, hookAt.z - 0.04);
    part(g, box(0.02, 0.12, 0.02), '#212121', hookAt.x - 0.035, hookAt.y - 0.08, hookAt.z - 0.04);
    const restSet = handset(g);
    restSet.position.copy(hookAt);
    restSet.rotation.set(0, Math.PI / 2, 0.1);
    // The hood with the screen tilted up in it.
    const hood = group(g, 0, 1.13, -0.27);
    hood.rotation.x = -0.35;
    part(hood, rbox(0.62, 0.56, 0.14, 0.03), GREY, 0, 0, -0.02);
    part(hood, rbox(0.66, 0.06, 0.24, 0.02), GREY, 0, 0.29, 0.04);
    part(hood, rbox(0.5, 0.5, 0.01, 0.02), '#151a1d', 0, 0, 0.052);
    const R = 0.2;
    const screen = group(hood, 0, 0.0, 0.058);
    const face = picture(screen, painted('sfRadarFace', 256, 256, paintRadar), 2 * R * (256 / 244), 2 * R * (256 / 244), 0, 0, 0);
    const live = group(screen);
    const trail = lamp(live, new THREE.CircleGeometry(R * 0.96, 18, 0, 0.9), '#2bd468', 0, 0, 0.002, 0.18);
    trail.userData.ownGeometry = true;
    const sweep = lamp(live, new THREE.CircleGeometry(R * 0.96, 6, 0, 0.06), '#9cffbf', 0, 0, 0.003, 0.85);
    sweep.userData.ownGeometry = true;
    const sweepG = group(live);
    sweepG.add(trail, sweep);
    // The ships' echoes: polar (range 0–1 of the screen, bearing from the heading line clockwise).
    const echoes: Array<{ r: number; b: number; drift: number; m: THREE.Mesh }> = [
      [0.55, 0.6, 0.004], [0.72, 1.1, -0.003], [0.38, 2.3, 0.006], [0.82, 3.0, 0.002], [0.62, 4.1, -0.005], [0.3, 5.0, 0.003], [0.9, 5.6, 0.0], [0.46, 1.7, 0.0],
    ].map(([r, b, drift]) => ({ r, b, drift, m: lamp(live, new THREE.CircleGeometry(0.0075, 8), LIT, 0, 0, 0.004, 0) }));
    for (const e of echoes) e.m.userData.ownGeometry = true;
    // The EBL and VRM, the acquired square.
    const ebl = group(live);
    lamp(ebl, box(0.0025, R * 0.95, 0.001), '#ffee58', 0, (R * 0.95) / 2, 0.005, 0.9);
    const vrm = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 4, 48), new THREE.MeshBasicMaterial({ color: '#ffee58', transparent: true, opacity: 0.8, depthWrite: false }));
    vrm.userData.ownGeometry = vrm.userData.ownMaterial = true;
    vrm.position.z = 0.005;
    live.add(vrm);
    const sq = group(live);
    for (const [x, y, w, h] of [[0, 0.018, 0.04, 0.003], [0, -0.018, 0.04, 0.003], [0.018, 0, 0.003, 0.04], [-0.018, 0, 0.003, 0.04]]) lamp(sq, box(w, h, 0.001), '#ffffff', x, y, 0.006, 1);
    // The chair.
    swivel(g, 0, 0.42, Math.PI, '#455a64');

    const sat = sitAt(g, 0, 0.48, 0.42, Math.PI, 'sfRadar', work);
    out.work = work;
    out.spots = { monitorRadar: sat, coastGuard_plotCourse: sat, coastGuard_patrolSector: also(g, sat, 'sfRadar'), '*': sat };
    const others = Object.values(out.spots);
    const use = group(g);
    out.inUse = use;
    const held = handset(use);
    held.rotation.order = 'YXZ';
    const polar = (r: number, b: number) => new THREE.Vector3(Math.sin(b) * r * R * 0.95, Math.cos(b) * r * R * 0.95, 0);
    out.animate = (t) => {
      const who = others.find((s) => posed(s, t));
      (face.material as THREE.MeshBasicMaterial).color.set(who ? '#ffffff' : DIM);
      live.visible = !!who;
      // The sweep: once round every 2.5 s (24 rpm), clockwise from the heading line.
      const sw = ((t / 2.5) % 1) * Math.PI * 2;
      sweepG.rotation.z = Math.PI / 2 - sw;
      for (const e of echoes) {
        const b = e.b + e.drift * t;
        e.m.position.copy(polar(e.r, b)).setZ(0.004);
        const since = (((sw - b) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        setOpacity(e.m, 0.25 + 0.75 * Math.exp(-since * 0.9));
      }
      const ph = phaseOf(work);
      const s = who ?? sat;
      const r = radarAt(frameOf(s, work), t, ph);
      const target = echoes[((r.n % 4) + 4) % 4];
      const tb = target.b + target.drift * t;
      ebl.rotation.z = -(r.cursor * tb + (1 - r.cursor) * 0.2);
      const vr = (0.15 + (target.r - 0.15) * r.cursor) * R * 0.95;
      vrm.scale.set(vr, vr, 1);
      sq.visible = r.acquired;
      sq.position.copy(polar(target.r, tb)).setZ(0);
      ball_.rotation.x = t * 3;
      held.visible = !!(who && r.handset);
      restSet.visible = !held.visible;
      if (who && r.handset) {
        held.position.copy(r.handset);
        held.rotation.set(0, s.at.rotation.y + Math.PI, 0.3);
      }
    };
  },

  /**
   * The rescue gear locker (구명 설비함): an orange GRP locker with its two doors (they swing open
   * while it's seen to), the life jackets hung inside with their reflective tape, lights and
   * whistles, the immersion suits' bags on the top shelf, the flares, the EPIRB and the first-aid kit
   * at the bottom, the checklist on its hook; a life ring on each side; on top, the liferaft's white
   * canister on its cradle with the hydrostatic release and its painter; the muster sign. Kept a
   * ship's and a coast guard's both. Checking it: the doors opened, a jacket off its hook and its light
   * and whistle checked, hung back, the suit's bag looked into, the liferaft's release tag read, the
   * checklist ticked, the doors shut. Running a drill: turned to the crew, the whistle, the muster
   * station pointed out, a jacket pulled on and strapped, heads counted. First aid on the 해경's
   * manikin: knelt on the mat in front of it, compressions and breaths.
   */
  rescueGear(g, _W, _D, _c, _def, _ctx, out) {
    const zb = -0.45;
    const zf = 0.0;
    const hw = 0.42;
    const H = 1.3;
    // The carcass: back, sides, top, bottom, the shelves.
    part(g, rbox(hw * 2, H, 0.03, 0.01), ORANGE, 0, H / 2, zb + 0.015);
    for (const sx of [-1, 1]) part(g, rbox(0.03, H, zf - zb, 0.01), ORANGE, sx * (hw - 0.015), H / 2, (zb + zf) / 2);
    part(g, rbox(hw * 2, 0.04, zf - zb, 0.01), ORANGE, 0, H - 0.02, (zb + zf) / 2);
    part(g, rbox(hw * 2, 0.16, zf - zb, 0.01), ORANGE, 0, 0.08, (zb + zf) / 2);
    part(g, box(hw * 2 - 0.06, 0.9, 0.005), '#ffe0b2', 0, 0.68, zb + 0.032, { outline: false });
    part(g, rbox(hw * 2 - 0.06, 0.02, zf - zb - 0.04, 0.005), '#ffcc80', 0, 1.14, (zb + zf) / 2 - 0.01);
    part(g, rbox(hw * 2 - 0.06, 0.02, zf - zb - 0.04, 0.005), '#ffcc80', 0, 0.3, (zb + zf) / 2 - 0.01);
    const W0 = marker(g, 0, 1.0, 0.02);
    const at = (o: readonly [number, number, number]) => W0.position.clone().add(new THREE.Vector3(o[0], o[1], o[2]));
    // The immersion suits' bags on the top shelf.
    for (const x of [-0.17, GEAR.suit[0]]) {
      part(g, rbox(0.3, 0.11, 0.3, 0.04), '#ff6d00', x, 1.205, -0.22);
      label(g, '방수복', 0.12, 0.035, x, 1.2, -0.068, '#ff6d00', '#ffffff');
      part(g, box(0.24, 0.006, 0.006), '#212121', x, 1.255, -0.075, { outline: false });
    }
    // The jackets on their hooks; the checklist on its hook.
    const hook = at(GEAR.hook);
    const hung = lifeJacket(g);
    hung.position.copy(hook);
    lifeJacket(g).position.set(-0.0, hook.y, hook.z - 0.02);
    part(g, box(0.76, 0.012, 0.012), CHROME, 0, hook.y + 0.02, hook.z - 0.01, { outline: false });
    for (const sx of [-1, 1]) part(g, box(0.012, 0.012, 0.28), CHROME, sx * 0.37, hook.y + 0.02, hook.z - 0.14, { outline: false });
    const clipAt = at(GEAR.clip);
    const clipHung = clipboard(g, painted('sfChecklist', 128, 170, paintChecklist));
    clipHung.position.copy(clipAt);
    // The bottom shelf: the flares, the EPIRB, the first-aid kit.
    part(g, rbox(0.22, 0.12, 0.16, 0.02), '#c62828', -0.22, 0.38, -0.25);
    label(g, '신호홍염', 0.14, 0.035, -0.22, 0.4, -0.168, '#c62828', '#ffffff');
    part(g, cyl(0.05, 0.05, 0.18, 14), '#ff6d00', 0.0, 0.4, -0.27);
    part(g, cyl(0.008, 0.008, 0.18, 6), '#212121', 0.0, 0.58, -0.27, { outline: false });
    label(g, 'EPIRB', 0.08, 0.025, 0, 0.42, -0.218, '#ff6d00', '#212121');
    part(g, rbox(0.2, 0.13, 0.14, 0.02), '#ffffff', 0.22, 0.385, -0.25);
    label(g, '✚ 구급함', 0.14, 0.04, 0.22, 0.39, -0.178, '#ffffff', '#c62828');
    // The doors, hinged at the sides.
    const door = (s: number) => {
      const d = group(g, s * hw, 0, zf + 0.012);
      const w = hw - 0.005;
      part(d, rbox(w, H - 0.22, 0.025, 0.01), ORANGE, -s * (w / 2), 0.17 + (H - 0.22) / 2, 0);
      part(d, rbox(0.03, 0.14, 0.03, 0.01), '#212121', -s * (w - 0.05), 0.72, 0.02);
      label(d, s < 0 ? '구명동의 ×4' : '방수복 ×2', 0.28, 0.06, -s * (w / 2), 0.98, 0.014, '#ffffff', '#c62828');
      label(d, s < 0 ? 'LIFE JACKET' : 'IMMERSION SUIT', 0.28, 0.04, -s * (w / 2), 0.9, 0.014, ORANGE, '#ffffff');
      return d;
    };
    const doorL = door(-1);
    const doorR = door(1);
    label(g, '구명 설비 LIFE SAVING APPLIANCES', 0.8, 0.07, 0, H - 0.02, zf + 0.004, '#ffffff', '#c62828');
    // A life ring on each side.
    for (const sx of [-1, 1]) {
      const lr = group(g, sx * (hw + 0.045), 0.78, -0.22, Math.PI / 2);
      part(lr, ring(0.19, 0.045), '#fafafa', 0, 0, 0);
      for (let k = 0; k < 4; k++) {
        const seg = part(lr, ring(0.19, 0.047, 0.45), '#e53935', 0, 0, 0, { outline: false });
        seg.rotation.z = (k * Math.PI) / 2 - 0.22;
      }
      part(lr, ring(0.24, 0.006), '#eeeeee', 0, 0, 0, { outline: false });
      part(g, cyl(0.012, 0.012, 0.06, 6), CHROME, sx * (hw + 0.02), 0.98, -0.22, { rz: Math.PI / 2, outline: false });
    }
    // The liferaft on its cradle on top, its release and painter.
    for (const x of [-0.24, 0.24]) {
      part(g, rbox(0.06, 0.08, 0.36, 0.01), '#9e9e9e', x, H + 0.04, -0.2);
      part(g, box(0.03, 0.006, 0.34), '#757575', x, H + 0.09, -0.2, { outline: false });
    }
    const can = group(g, 0, H + 0.24, -0.2);
    part(can, cyl(0.15, 0.15, 0.62, 22), '#f5f5f5', 0, 0, 0, { rz: Math.PI / 2 });
    for (const x of [-0.31, 0.31]) part(can, ball(0.15), '#f5f5f5', x, 0, 0).scale.set(0.25, 1, 1);
    for (const x of [-0.2, 0, 0.2]) part(can, cyl(0.153, 0.153, 0.025, 22), '#90a4ae', x, 0, 0, { rz: Math.PI / 2, outline: false });
    label(can, '구명뗏목 25인용', 0.22, 0.05, -0.1, 0.0, 0.152, '#ffffff', '#c62828');
    const tag = at(GEAR.tag);
    part(g, rbox(0.07, 0.07, 0.05, 0.01), '#263238', tag.x, tag.y - 0.02, -0.025);
    part(g, box(0.045, 0.06, 0.003), '#ff1744', tag.x, tag.y - 0.07, 0.003, { outline: false });
    label(g, 'HRU', 0.05, 0.018, tag.x, tag.y, 0.001, '#263238', '#ffffff');
    const painter = part(g, cyl(0.006, 0.006, 1, 6), ROPE, 0, 0, 0, { outline: false });
    stretch(painter, new THREE.Vector3(tag.x, tag.y - 0.04, -0.03), new THREE.Vector3(hw - 0.02, H, -0.06));
    // The muster sign over it all.
    label(g, '비상 집합 장소 MUSTER STATION ①', 0.8, 0.08, 0, H + 0.5, zb + 0.02, '#2e7d32', '#ffffff');

    // Spots: stood at the opening; turned to the crew for a drill; knelt at the manikin for first aid.
    const gear = standAt(g, 0, 0.5, Math.PI, 'sfGear', W0);
    const drill = standAt(g, 0, 0.62, Math.PI, 'sfDrill', W0);
    const chest = marker(g, 0, 0.2, 0.82);
    const aid = standAt(g, 0, 1.12, Math.PI, 'cpr', chest);
    out.work = W0;
    out.spots = { checkRescueGear: gear, coastGuard_learnGear: also(g, gear, 'sfGear'), seafarer_runDrill: drill, coastGuard_firstAidDrill: aid, '*': gear };
    const learn = out.spots.coastGuard_learnGear;
    const use = group(g);
    out.inUse = use;
    const jacket = lifeJacket(use);
    const clip = clipboard(use, painted('sfChecklist', 128, 170, paintChecklist));
    clip.rotation.order = 'YXZ';
    const whistle = group(use);
    part(whistle, rbox(0.022, 0.018, 0.05, 0.008), '#ffd600', 0, 0, 0);
    // The CPR manikin on its mat, its head to the rescuer's left.
    const mani = group(use);
    part(mani, rbox(1.0, 0.02, 0.55, 0.01), '#1565c0', 0, 0.01, 0.82);
    part(mani, rbox(0.46, 0.15, 0.3, 0.07), '#ffe0c4', 0.03, 0.095, 0.82);
    part(mani, ball(0.09), '#ffe0c4', -0.32, 0.1, 0.82).scale.set(1.1, 0.95, 1);
    part(mani, rbox(0.1, 0.08, 0.12, 0.03), '#ffe0c4', -0.21, 0.08, 0.82);
    part(mani, rbox(0.3, 0.005, 0.24, 0.004), '#ffffff', 0.04, 0.172, 0.82, { outline: false });
    out.animate = (t) => {
      const ph = phaseOf(W0);
      const checking = posed(gear, t) ? gear : posed(learn, t) ? learn : null;
      const drilling = posed(drill, t);
      mani.visible = posed(aid, t);
      jacket.visible = clip.visible = whistle.visible = false;
      hung.visible = clipHung.visible = true;
      let doors = 0;
      if (checking) {
        turnSpot(checking, 'sfGear', t, ph);
        const s = gearAt(frameOf(checking, W0), t, ph);
        doors = s.doors;
        if (s.vest) {
          jacket.visible = true;
          hung.visible = false;
          jacket.position.copy(s.vest).add(new THREE.Vector3(0, 0.1, 0));
          jacket.rotation.set(0, checking.at.rotation.y + Math.PI, 0);
        }
        if (s.clip) {
          clip.visible = true;
          clipHung.visible = false;
          clip.position.copy(s.clip);
          clip.rotation.set(-0.9, checking.at.rotation.y + Math.PI, 0);
        }
      } else if (drilling) {
        turnSpot(drill, 'sfDrill', t, ph);
        const d = drillAt(frameOf(drill, W0), t, ph);
        doors = 1;
        hung.visible = !d.vest;
        const yaw = drill.at.rotation.y;
        if (d.vest) {
          jacket.visible = true;
          jacket.position.copy(d.vest).add(new THREE.Vector3(0, d.worn ? 0.22 : 0.1, 0));
          jacket.rotation.set(0, yaw + (d.worn ? 0 : Math.PI), 0);
        }
        if (d.whistle) {
          whistle.visible = true;
          whistle.position.copy(d.whistle);
          whistle.rotation.set(0, yaw, 0);
        }
        if (d.clip) {
          clip.visible = true;
          clipHung.visible = false;
          clip.position.copy(d.clip);
          clip.rotation.set(-0.9, yaw + Math.PI, 0);
        }
      }
      doorL.rotation.y = -doors * 1.85;
      doorR.rotation.y = doors * 1.85;
    };
  },

  /**
   * The tender (통선) at its berth: a little concrete dock basin with the sea in it, the quay's
   * coping, bollards and tyre fenders; the boat — a white hull with the navy band and rubbing strake,
   * the wheelhouse with its windows, the mast with the radar, lights and horn, the searchlight, tyres
   * along its sides, the bitts and a coiled line on the foredeck, '한바다 3호' on its bows — rocking
   * on the swell. Out to a ship at anchor or the storm order: it casts off and heads out, and comes
   * back alongside.
   */
  cargoTender(g, _W, _D, _c, _def, _ctx, out) {
    const zc = 0.45;
    const L = 5.6;
    const Wd = 2.0;
    // The basin and its coping.
    const water = part(g, box(L, 0.01, Wd), '#2f6f98', 0, 0.015, zc, { outline: false, shadow: false, material: new THREE.MeshBasicMaterial({ color: '#2f6f98' }) });
    water.userData.ownMaterial = true;
    const ripple = overlay(g, painted('sfWaves', 512, 256, paintWaves), L, Wd, 0, 0.022, zc);
    ripple.rotation.x = -Math.PI / 2;
    const rippleTex = (ripple.material as THREE.MeshBasicMaterial).map!.clone();
    rippleTex.needsUpdate = true;
    rippleTex.repeat.set(2, 1);
    (ripple.material as THREE.MeshBasicMaterial).map = rippleTex;
    for (const s of [-1, 1]) {
      part(g, rbox(L + 0.3, 0.14, 0.15, 0.02), '#b8b8b0', 0, 0.07, zc + s * (Wd / 2 + 0.075));
      part(g, rbox(0.15, 0.14, Wd, 0.02), '#b8b8b0', s * (L / 2 + 0.075), 0.07, zc);
    }
    for (const x of [-2.2, 0, 2.2]) {
      part(g, cyl(0.06, 0.07, 0.16, 12), '#263238', x, 0.22, zc - Wd / 2 - 0.075);
      part(g, cyl(0.085, 0.085, 0.03, 12), '#263238', x, 0.31, zc - Wd / 2 - 0.075);
    }
    for (const x of [-1.4, 0.8]) part(g, ring(0.1, 0.035), '#1b1b1b', x, 0.05, zc - Wd / 2 + 0.02);
    // The boat, bow to +x.
    const boat = group(g, 0, 0, zc);
    const hull = group(boat);
    const BW = 1.5;
    part(hull, rbox(3.2, 0.5, BW, 0.12), '#f5f5f5', -0.5, 0.3, 0);
    const bowP = part(hull, cyl(0.866, 0.866, 0.5, 3), '#f5f5f5', 1.1 + 0.433, 0.3, 0, { ry: Math.PI / 2 });
    bowP.scale.set(1, 1, 0.87);
    part(hull, rbox(3.25, 0.1, BW + 0.02, 0.04), NAVY, -0.5, 0.1, 0);
    part(hull, cyl(0.876, 0.876, 0.1, 3), NAVY, 1.1 + 0.433, 0.1, 0, { ry: Math.PI / 2 }).scale.set(1, 1, 0.88);
    part(hull, rbox(3.2, 0.06, BW + 0.08, 0.03), '#212121', -0.5, 0.55, 0);
    part(hull, rbox(3.1, 0.02, BW - 0.1, 0.01), '#9ea7ad', -0.5, 0.56, 0);
    part(hull, cyl(0.78, 0.78, 0.02, 3), '#9ea7ad', 1.1 + 0.433, 0.56, 0, { ry: Math.PI / 2 }).scale.set(1, 1, 0.8);
    for (const s of [-1, 1]) {
      label(hull, '한바다 3호', 0.7, 0.13, 0.55, 0.36, s * (BW / 2 + 0.005), '#f5f5f5', NAVY, s > 0 ? 0 : Math.PI);
      for (const x of [-1.6, -0.9, 0.2]) part(hull, ring(0.09, 0.03), '#1b1b1b', x, 0.32, s * (BW / 2 + 0.04));
    }
    label(hull, '통선 TENDER', 0.6, 0.11, -2.105, 0.34, 0, '#f5f5f5', NAVY, -Math.PI / 2);
    // The wheelhouse.
    const wh = group(boat, -0.7, 0.57, 0);
    part(wh, rbox(1.3, 1.05, 1.15, 0.06), '#fafafa', 0, 0.525, 0);
    part(wh, rbox(1.4, 0.06, 1.25, 0.03), '#e0e0e0', 0, 1.07, 0);
    for (const s of [-1, 1]) for (const x of [-0.3, 0.25]) part(wh, rbox(0.42, 0.34, 0.01, 0.04), '#21455f', x, 0.75, s * 0.578, { outline: false });
    for (const z of [-0.3, 0.3]) part(wh, rbox(0.01, 0.36, 0.48, 0.04), '#21455f', 0.651, 0.76, z, { outline: false });
    part(wh, rbox(0.01, 0.6, 0.5, 0.04), '#cfd8dc', -0.651, 0.5, 0.2, { outline: false });
    // The mast, the radar, the lights, the horn, the searchlight; a life ring on its side.
    part(wh, cyl(0.03, 0.03, 0.7, 8), '#eeeeee', -0.2, 1.42, 0);
    part(wh, box(0.5, 0.04, 0.06), '#eeeeee', -0.2, 1.58, 0);
    part(wh, cyl(0.12, 0.12, 0.08, 16), '#fafafa', -0.2, 1.81, 0);
    glowing(wh, ball(0.03), '#ff1744', -0.2, 1.6, -0.25);
    glowing(wh, ball(0.03), '#00e676', -0.2, 1.6, 0.25);
    glowing(wh, ball(0.03), '#ffffff', -0.2, 1.79, 0);
    part(wh, cyl(0.03, 0.05, 0.12, 10), '#bdbdbd', 0.3, 1.16, 0.3, { rz: -Math.PI / 2 });
    part(wh, cyl(0.07, 0.07, 0.1, 12), '#424242', 0.45, 1.15, -0.25, { rz: -Math.PI / 2 });
    part(wh, ring(0.15, 0.035), '#ff6d00', -0.1, 0.55, 0.6);
    // The foredeck: the bitts, a coiled line.
    for (const z of [-0.12, 0.12]) part(boat, cyl(0.04, 0.045, 0.14, 10), '#263238', 1.35, 0.65, z);
    for (let i = 0; i < 3; i++) part(boat, ring(0.13 - i * 0.02, 0.015), ROPE, 0.85, 0.6 + i * 0.025, 0.25, { rx: Math.PI / 2, outline: false });
    // Steered sat in the wheelhouse, facing the bow.
    const wheelM = marker(wh, 0.42, 0.85, -0.25);
    part(wh, rbox(0.12, 0.8, 0.5, 0.02), '#37474f', 0.58, 0.4, -0.2);
    part(wh, ring(0.13, 0.012), BLACK, 0.42, 0.85, -0.25, { ry: Math.PI / 2 });
    part(wh, rbox(0.25, 0.42, 0.3, 0.03), '#37474f', 0.05, 0.21, -0.25);
    const drive = sitAt(wh, 0.05, 0.45, -0.25, Math.PI / 2, 'steer', wheelM);
    out.spots = { '*': drive };
    // Out: it casts off ahead and is gone; it comes back alongside.
    let state: 'moored' | 'leaving' | 'gone' | 'back' | undefined;
    let since = 0;
    const RUN = 6;
    out.animate = (t) => {
      rippleTex.offset.set(t * 0.01, t * 0.02);
      boat.position.y = 0.03 * Math.sin(t * 1.1);
      boat.rotation.x = 0.025 * Math.sin(t * 0.9);
      boat.rotation.z = 0.012 * Math.sin(t * 0.7 + 1);
    };
    out.away = (isOut, t) => {
      if (state === undefined) state = isOut ? 'gone' : 'moored';
      else if (isOut && (state === 'moored' || state === 'back')) [state, since] = ['leaving', t];
      else if (!isOut && (state === 'leaving' || state === 'gone')) [state, since] = ['back', t];
      let x = 0;
      if (state === 'leaving') {
        const u = Math.min(1, (t - since) / 4);
        x = RUN * u * u;
        if (u >= 1) state = 'gone';
      } else if (state === 'back') {
        const u = Math.min(1, (t - since) / 5);
        x = RUN * (1 - u) * (1 - u);
        if (u >= 1) state = 'moored';
      }
      boat.position.x = x;
      boat.visible = state !== 'gone';
    };
  },

  /**
   * The port's VTS screen (항만 VTS 관제 화면): a video wall on its stand with the harbour in plan —
   * the coast and the island, the breakwaters and berths, the dashed fairways in and out, the
   * anchorage — and the traffic on it, each ship's mark and name moving along its track (a ferry
   * crossing, a fishing boat about the shore), the anchored ones still; the VTS desk under it with the
   * VHF set on channel 12, its handset, the keyboard and the log. Watching the traffic: stood at the
   * desk, a ship picked out and pointed at, called up on the handset, listened to, logged.
   */
  sfVtsBoard(g, _W, _D, _c, _def, ctx, out) {
    const zw = -0.44;
    const SWd = 1.8;
    const SHt = 1.0;
    const sy = 1.66;
    if (!ctx.againstWall)
      for (const sx of [-1, 1]) {
        part(g, rbox(0.06, sy + 0.4, 0.06, 0.01), '#263238', sx * 0.86, (sy + 0.4) / 2, zw - 0.02);
        part(g, rbox(0.1, 0.03, 0.5, 0.01), '#263238', sx * 0.86, 0.015, zw + 0.15);
      }
    part(g, rbox(SWd + 0.08, SHt + 0.08, 0.06, 0.012), '#111418', 0, sy, zw);
    const face = group(g, 0, sy, zw + 0.032);
    out.screen = litScreen(face, painted('sfVtsMap', VMAP.w, VMAP.h, paintVts), SWd, SHt, 0, 0, 0);
    const P = (x: number, y: number) => new THREE.Vector3((x / VMAP.w - 0.5) * SWd, (0.5 - y / VMAP.h) * SHt, 0.014);
    // The desk.
    const top = 1.0;
    part(g, rbox(1.4, top - 0.04, 0.36, 0.02), '#37474f', 0, (top - 0.04) / 2, -0.08);
    part(g, rbox(1.46, 0.04, 0.44, 0.012), '#263238', 0, top - 0.02, -0.06);
    label(g, `${PORT} VTS · 해상교통관제센터`, 0.7, 0.07, 0, 0.78, 0.103, '#37474f', '#e0f7fa');
    const work = marker(g, 0, top + 0.012, 0.02);
    part(g, rbox(0.36, 0.016, 0.12, 0.006), '#212121', 0, top + 0.008, 0.02);
    part(g, box(0.33, 0.004, 0.09), '#607d8b', 0, top + 0.017, 0.02, { outline: false });
    // The VHF set and its handset's cradle; the desk mic, the log, a mug.
    const cr = work.position.clone().add(new THREE.Vector3(VTS.cradle[0], VTS.cradle[1], VTS.cradle[2]));
    part(g, rbox(0.3, 0.1, 0.2, 0.012), '#212121', cr.x - 0.05, top + 0.05, cr.z - 0.1);
    glowing(g, box(0.12, 0.035, 0.002), '#ff9100', cr.x - 0.08, top + 0.07, cr.z + 0.001);
    label(g, 'CH 12', 0.07, 0.025, cr.x - 0.08, top + 0.07, cr.z + 0.003, '#000000', '#ff9100');
    const rest = handset(g);
    rest.position.set(cr.x + 0.06, top + 0.03, cr.z + 0.02);
    rest.rotation.set(-Math.PI / 2, 0, 0);
    part(g, cyl(0.004, 0.004, 0.22, 6), '#424242', 0.35, top + 0.11, -0.12, { rx: 0.4, outline: false });
    part(g, cyl(0.015, 0.012, 0.04, 10), '#212121', 0.35, top + 0.21, -0.08, { rx: 0.4 });
    flat(g, painted('sfVtsLog', 160, 110, paintLog), 0.2, 0.14, 0.42, top + 0.003, 0.04, -0.2);
    part(g, cyl(0.032, 0.029, 0.085, 14), '#ffffff', -0.6, top + 0.0425, 0.05);

    const st = standAt(g, 0, 0.5, Math.PI, 'sfVts', work);
    out.work = work;
    out.spots = { '*': st };
    // The traffic.
    const use = group(g);
    out.inUse = use;
    const marks = VTS_SHIPS.map((s, i) => {
      const m = group(face);
      const tri = lamp(m, new THREE.CircleGeometry(0.016, 3), s.kn ? '#69f0ae' : '#b39ddb', 0, 0, 0, 1);
      tri.userData.ownGeometry = true;
      tri.scale.set(1.5, 0.8, 1);
      if (s.kn) lamp(m, box(0.06, 0.002, 0.001), '#69f0ae', 0.05, 0, 0, 0.8);
      const name = label(face, s.name, 0.16, 0.026, 0, 0, 0.015, '#0a2236', '#e0f7fa');
      const pick = lamp(m, new THREE.TorusGeometry(0.03, 0.003, 4, 24), '#ffeb3b', 0, 0, 0.001, 1);
      pick.userData.ownGeometry = true;
      pick.visible = false;
      return { s, m, tri, name, pick, i };
    });
    const held = handset(use);
    held.rotation.order = 'YXZ';
    out.animate = (t) => {
      const on = posed(st, t);
      const ph = phaseOf(work);
      const v = vtsAt(frameOf(st, work), t, ph);
      const pickIdx = 4 + (((v.n % 2) + 2) % 2);
      for (const k of marks) {
        let p: { x: number; y: number; a: number };
        if (k.s.path !== undefined) p = alongPath(VTS_PATHS[k.s.path], k.s.off + t * 0.004 * (k.s.kn / 10));
        else p = { x: k.s.at![0], y: k.s.at![1], a: 0.4 };
        const at3 = P(p.x, p.y);
        k.m.position.copy(at3);
        k.m.rotation.z = p.a;
        k.name.position.copy(at3).add(new THREE.Vector3(0.1, 0.03, 0.001));
        k.m.visible = k.name.visible = on;
        k.pick.visible = on && v.picked && k.i === pickIdx;
        k.pick.scale.setScalar(1 + 0.15 * Math.sin(t * 6));
      }
      held.visible = !!(on && v.handset);
      rest.visible = !held.visible;
      if (on && v.handset) {
        held.position.copy(v.handset);
        held.rotation.set(0, st.at.rotation.y + Math.PI, 0.3);
      }
      if (on) turnSpot(st, 'sfVts', t, ph);
    };
  },

  /**
   * The weather fax and the forecast board (기상 팩스 · 예보판): a cabinet with the beige fax receiver
   * on it, the day's surface analysis feeding out of it as it prints; on the wall a cork board with
   * the morning's chart, the afternoon's forecast written up on its whiteboard strip (앞바다 · 먼바다,
   * 풍랑주의보, the typhoon coming up), and the brass barometer beside it. Checking the weather: the
   * chart watched printing, torn off, read, pinned up beside the old one, the barometer tapped (as
   * sailors do), the forecast written up.
   */
  sfWeatherFax(g, _W, _D, _c, _def, _ctx, out) {
    part(g, rbox(0.72, 0.78, 0.42, 0.02), '#8d9aa3', 0, 0.39, -0.26);
    part(g, box(0.66, 0.004, 0.004), '#5f6c75', 0, 0.42, -0.048, { outline: false });
    part(g, rbox(0.08, 0.02, 0.02, 0.008), CHROME, 0, 0.6, -0.04);
    // The fax receiver; its paper slot (the work point) at the front of its top.
    part(g, rbox(0.46, 0.14, 0.32, 0.03), '#d8d2c0', 0, 0.85, -0.25);
    part(g, rbox(0.4, 0.02, 0.05, 0.01), '#9e9a8c', 0, 0.925, -0.12);
    glowing(g, box(0.08, 0.025, 0.002), '#9ccc65', 0.14, 0.86, -0.089);
    label(g, 'WEATHER FAX · 기상 팩스', 0.2, 0.03, -0.08, 0.86, -0.088, '#d8d2c0', '#37474f');
    const work = marker(g, 0, 0.93, -0.1);
    const wx = painted('sfWeather', 256, 320, paintWeather);
    // The chart coming out as it prints (grows up out of the slot, curling forward).
    const feed = group(g, 0, 0.935, -0.12);
    const feedSheet = picture(feed, wx, 0.2, 0.25, 0, 0.125, 0);
    feedSheet.rotation.x = 0.3;
    // The board: cork, the old chart, the forecast strip; the barometer.
    const zb = -0.45;
    part(g, rbox(0.62, 0.74, 0.03, 0.01), OAK_D, -0.08, 1.53, zb);
    part(g, box(0.56, 0.68, 0.01), '#b98a57', -0.08, 1.53, zb + 0.016, { outline: false });
    picture(g, wx, 0.2, 0.25, -0.24, 1.7, zb + 0.023);
    part(g, ball(0.01), '#e53935', -0.24, 1.82, zb + 0.03, { outline: false });
    const board = work.position.clone().add(new THREE.Vector3(FAX.board[0], FAX.board[1], FAX.board[2]));
    part(g, rbox(0.46, 0.18, 0.012, 0.006), '#ffffff', -0.1, board.y - 0.02, zb + 0.022);
    picture(g, painted('sfForecast', 320, 112, paintForecast), 0.44, 0.15, -0.1, board.y - 0.02, zb + 0.03);
    const pinAt = work.position.clone().add(new THREE.Vector3(FAX.pin[0], FAX.pin[1], FAX.pin[2]));
    const pinned = picture(g, wx, 0.2, 0.25, pinAt.x + 0.02, pinAt.y + 0.02, zb + 0.026);
    const pinnedPin = part(g, ball(0.01), '#1e88e5', pinAt.x + 0.02, pinAt.y + 0.14, zb + 0.034, { outline: false });
    const baro = work.position.clone().add(new THREE.Vector3(FAX.baro[0], FAX.baro[1], FAX.baro[2]));
    part(g, cyl(0.09, 0.09, 0.04, 24), BRASS, baro.x, baro.y, zb + 0.02, { rx: Math.PI / 2 });
    part(g, cyl(0.075, 0.075, 0.004, 24), '#fff8e1', baro.x, baro.y, zb + 0.042, { rx: Math.PI / 2, outline: false });
    label(g, 'BAROMETER 1004hPa', 0.1, 0.014, baro.x, baro.y - 0.035, zb + 0.045, '#fff8e1', '#4e342e');
    const hand = group(g, baro.x, baro.y, zb + 0.046);
    part(hand, box(0.004, 0.06, 0.002), '#212121', 0, 0.025, 0, { outline: false });
    hand.rotation.z = 0.5;

    const st = standAt(g, 0, 0.24, Math.PI, 'sfFax', work);
    out.work = work;
    out.spots = { '*': st };
    const use = group(g);
    out.inUse = use;
    const sheet = picture(use, wx, 0.2, 0.25, 0, 0, 0);
    sheet.rotation.order = 'YXZ';
    out.animate = (t) => {
      const on = posed(st, t);
      const ph = phaseOf(work);
      if (on) turnSpot(st, 'sfFax', t, ph);
      const f = faxAt(frameOf(st, work), t, ph);
      feed.visible = on && f.printed > 0.02;
      feed.scale.set(1, Math.max(0.02, f.printed), 1);
      sheet.visible = on && !!f.held;
      if (f.held) {
        sheet.position.copy(f.held).add(new THREE.Vector3(0, 0.02, 0));
        sheet.rotation.set(-0.5, st.at.rotation.y + Math.PI, 0);
      }
      pinned.visible = pinnedPin.visible = !on || f.pinned;
      // The barometer's needle jumps a hair when it's tapped.
      hand.rotation.z = 0.5 + (on && f.key === 'baro' ? 0.04 * Math.max(0, Math.sin(t * 15)) : 0);
    };
  },

  /**
   * The flagship's model (컨테이너선 모형): an oak plinth with a glass case on it, the 13,000-TEU
   * container ship inside on its two stands — the black hull with the red below the waterline, the
   * bulbous bow, the deck stacked with boxes in their ports' colours, the white accommodation aft with
   * its bridge wings and the funnel in the company's blue — and the brass plate on the plinth.
   */
  sfShipModel(g) {
    part(g, rbox(1.84, 0.82, 0.52, 0.02), OAK, 0, 0.41, 0);
    part(g, rbox(1.88, 0.04, 0.56, 0.01), OAK_D, 0, 0.83, 0);
    part(g, rbox(0.5, 0.08, 0.004, 0.004), BRASS, 0, 0.62, 0.262);
    label(g, `${FLAGSHIP} · 13,000 TEU · 1:200`, 0.46, 0.05, 0, 0.62, 0.265, BRASS, '#3e2723');
    label(g, COMPANY, 0.3, 0.06, 0, 0.3, 0.262, OAK, '#fff8e1');
    // The case: its frame and glass.
    const y0 = 0.85;
    const ch = 0.52;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.02, ch, 0.02), BRASS, sx * 0.9, y0 + ch / 2, sz * 0.25, { outline: false });
    for (const sz of [-1, 1]) part(g, box(1.82, 0.02, 0.02), BRASS, 0, y0 + ch, sz * 0.25, { outline: false });
    for (const sx of [-1, 1]) part(g, box(0.02, 0.02, 0.5), BRASS, sx * 0.9, y0 + ch, 0, { outline: false });
    glass(g, box(1.8, ch, 0.5), 0, y0 + ch / 2, 0);
    // The stands, the hull.
    for (const x of [-0.4, 0.4]) part(g, box(0.04, 0.07, 0.12), OAK_D, x, y0 + 0.035, 0);
    const ship = group(g, 0, y0 + 0.07, 0);
    part(ship, rbox(1.3, 0.07, 0.2, 0.02), '#b23a2e', -0.05, 0.035, 0);
    part(ship, rbox(1.3, 0.07, 0.2, 0.02), '#1c1f24', -0.05, 0.1, 0);
    part(ship, cyl(0.115, 0.115, 0.14, 3), '#1c1f24', 0.66, 0.07, 0, { ry: Math.PI / 2 }).scale.set(1, 1, 1.8);
    part(ship, ball(0.035), '#b23a2e', 0.78, 0.035, 0);
    part(ship, box(1.28, 0.006, 0.2), '#eeeeee', -0.05, 0.072, 0, { outline: false });
    part(ship, rbox(1.32, 0.012, 0.2, 0.004), '#8a3b2f', -0.05, 0.14, 0);
    // The boxes on deck.
    const r = seeded(13);
    const cols = ['#c62828', '#1565c0', '#2e7d32', '#ef6c00', '#6d4c41', '#f9a825', '#455a64', '#00838f'];
    for (let b = 0; b < 9; b++)
      for (let tier = 0; tier < 3; tier++)
        for (let row = 0; row < 3; row++) {
          if (tier === 2 && r() < 0.3) continue;
          part(ship, box(0.088, 0.03, 0.058), cols[Math.floor(r() * cols.length)], -0.38 + b * 0.105, 0.162 + tier * 0.031, -0.062 + row * 0.062, { outline: false });
        }
    // The accommodation aft, its bridge and wings, the funnel.
    part(ship, rbox(0.12, 0.2, 0.18, 0.01), '#f5f5f5', -0.55, 0.24, 0);
    part(ship, rbox(0.1, 0.03, 0.26, 0.008), '#f5f5f5', -0.53, 0.35, 0);
    part(ship, box(0.004, 0.02, 0.24), '#21455f', -0.478, 0.35, 0, { outline: false });
    for (let i = 0; i < 4; i++) part(ship, box(0.002, 0.012, 0.16), '#21455f', -0.489, 0.18 + i * 0.04, 0, { outline: false });
    part(ship, rbox(0.06, 0.1, 0.07, 0.01), '#f5f5f5', -0.63, 0.32, 0);
    part(ship, box(0.062, 0.025, 0.072), '#1565c0', -0.63, 0.35, 0, { outline: false });
    part(ship, box(0.064, 0.012, 0.074), '#1c1f24', -0.63, 0.375, 0, { outline: false });
    part(ship, cyl(0.004, 0.004, 0.1, 6), '#eeeeee', -0.55, 0.42, 0, { outline: false });
    part(ship, cyl(0.004, 0.004, 0.08, 6), '#eeeeee', 0.62, 0.19, 0, { outline: false });
    label(ship, FLAGSHIP, 0.16, 0.025, 0.5, 0.11, 0.101, '#1c1f24', '#ffffff');
    label(ship, FLAGSHIP, 0.16, 0.025, 0.5, 0.11, -0.101, '#1c1f24', '#ffffff', Math.PI);
  },

  /**
   * The mooring bitts (계류 비트): a square of green deck plate edged in yellow and black, a pair of
   * black bitts on their bed with a mooring line figure-eighted round them, its tail coiled down on the
   * deck, a heaving line with its monkey's fist. Practising: crouched for the line, carried round the
   * posts in figure-eights, heaved tight, the tail coiled down stood up, set on the deck.
   */
  sfMooringBitt(g, _W, _D, _c, _def, _ctx, out) {
    part(g, rbox(0.94, 0.04, 0.94, 0.01), '#3e5a45', 0, 0.02, 0);
    for (let i = 0; i < 8; i++) {
      part(g, box(0.1, 0.004, 0.04), i % 2 ? '#212121' : '#fdd835', -0.42 + i * 0.12, 0.042, 0.45, { outline: false });
      part(g, box(0.1, 0.004, 0.04), i % 2 ? '#212121' : '#fdd835', -0.42 + i * 0.12, 0.042, -0.45, { outline: false });
    }
    const bz = -0.1;
    part(g, rbox(0.56, 0.05, 0.22, 0.015), '#212121', 0, 0.065, bz);
    for (const sx of [-1, 1]) {
      part(g, cyl(0.065, 0.07, 0.27, 16), '#1b1b1b', sx * BITT.post, 0.225, bz);
      part(g, cyl(0.085, 0.085, 0.03, 16), '#1b1b1b', sx * BITT.post, 0.37, bz);
    }
    const work = marker(g, 0, 0.32, bz);
    // The line: led in from the back, round the posts in figure-eights.
    const ropeR = 0.018;
    const rope = (a: THREE.Vector3, b: THREE.Vector3) => stretch(part(g, cyl(ropeR, ropeR, 1, 8), ROPE, 0, 0, 0, { outline: false }), a, b);
    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    rope(v(-0.05, 0.05, -0.47), v(-BITT.post, 0.14, bz - 0.08));
    for (const y of [0.16, 0.22, 0.28]) {
      for (const sx of [-1, 1]) part(g, ring(0.085, ropeR), ROPE, sx * BITT.post, y, bz, { rx: Math.PI / 2, outline: false });
      rope(v(-BITT.post, y, bz + 0.08), v(BITT.post, y + 0.03, bz - 0.08));
      rope(v(-BITT.post, y + 0.03, bz - 0.08), v(BITT.post, y, bz + 0.08));
    }
    // The tail coiled down on the deck, and the running end from the posts to the coil.
    const coilAt = work.position.clone().add(v(BITT.coil[0], BITT.coil[1], BITT.coil[2]));
    const coil = group(g, coilAt.x, 0.04, coilAt.z);
    for (let i = 0; i < 4; i++) part(coil, ring(0.13 - i * 0.012, ropeR), ROPE, 0, 0.02 + i * 0.03, 0, { rx: Math.PI / 2, outline: false });
    const tail = part(g, cyl(ropeR, ropeR, 1, 8), ROPE, 0, 0, 0, { outline: false });
    const tailFrom = v(BITT.post, 0.3, bz + 0.05);
    stretch(tail, tailFrom, coilAt.clone().setY(0.16));
    // The heaving line and its monkey's fist.
    part(g, ball(0.035), ROPE, -0.32, 0.075, 0.25);
    for (let i = 0; i < 3; i++) part(g, ring(0.08 - i * 0.01, 0.006), '#eeeeee', -0.28, 0.05 + i * 0.008, 0.3, { rx: Math.PI / 2, outline: false });
    label(g, '계류 실습 MOORING', 0.3, 0.04, 0, 0.065, bz + 0.112, '#212121', '#fdd835');

    const st = standAt(g, 0, 0.5, Math.PI, 'sfBitt', work);
    out.work = work;
    out.spots = { '*': st };
    const use = group(g);
    out.inUse = use;
    const held = group(use);
    for (let i = 0; i < 4; i++) part(held, ring(0.11 - i * 0.005, ropeR), ROPE, 0, -0.08, 0.004 * i, { outline: false });
    out.animate = (t) => {
      const on = posed(st, t);
      if (!on) {
        coil.visible = true;
        held.visible = false;
        stretch(tail, tailFrom, coilAt.clone().setY(0.16));
        return;
      }
      const ph = phaseOf(work);
      turnSpot(st, 'sfBitt', t, ph);
      const b = bittAt(frameOf(st, work), t, ph);
      coil.visible = !b.coil;
      held.visible = !!b.coil;
      if (b.coil) {
        held.position.copy(b.coil);
        held.rotation.set(0, st.at.rotation.y, 0);
        stretch(tail, tailFrom, b.coil.clone().add(v(0, -0.1, 0)));
      } else if (b.end) stretch(tail, tailFrom, b.end);
      else stretch(tail, tailFrom, coilAt.clone().setY(0.16));
    };
  },

  /**
   * The ship's bell (선종): a brass bell from the old 한바다호 (1998) hung from a scrolled bracket on an
   * oak shield, its clapper's lanyard braided white with a Turk's head at the end, a plate under it
   * (당직 교대). Ringing the watch: the lanyard taken and pulled two and two — the clapper swung, the
   * bell ringing out — and let go.
   */
  sfShipBell(g, _W, _D, _c, _def, _ctx, out) {
    const zb = -0.45;
    part(g, rbox(0.34, 0.5, 0.04, 0.06), OAK, 0, 1.6, zb + 0.02);
    part(g, rbox(0.3, 0.46, 0.01, 0.05), OAK_D, 0, 1.6, zb + 0.043, { outline: false });
    // The bracket out to the bell.
    const zc = -0.28;
    part(g, rbox(0.04, 0.04, 0.2, 0.01), BRASS, 0, 1.8, (zb + zc) / 2 + 0.01);
    part(g, ring(0.05, 0.008, Math.PI), BRASS, 0, 1.75, zb + 0.08, { ry: Math.PI / 2 });
    part(g, cyl(0.008, 0.008, 0.05, 8), BRASS, 0, 1.78, zc, { outline: false });
    // The bell.
    const bellG = group(g, 0, 1.76, zc);
    const prof = [new THREE.Vector2(0.0, 0), new THREE.Vector2(0.045, -0.005), new THREE.Vector2(0.06, -0.04), new THREE.Vector2(0.065, -0.11), new THREE.Vector2(0.08, -0.17), new THREE.Vector2(0.1, -0.2), new THREE.Vector2(0.095, -0.205)];
    const lathe = new THREE.LatheGeometry(prof, 28);
    const bell = part(bellG, lathe, BRASS, 0, 0, 0);
    bell.userData.ownGeometry = true;
    part(bellG, cyl(0.02, 0.02, 0.03, 12), BRASS, 0, 0.01, 0, { outline: false });
    part(bellG, ring(0.1, 0.004), shade(BRASS, 0.8), 0, -0.2, 0, { rx: Math.PI / 2, outline: false });
    label(bellG, '한바다호 1998', 0.11, 0.022, 0, -0.12, 0.073, BRASS, '#5d4037');
    const clapper = group(bellG, 0, -0.03, 0);
    part(clapper, cyl(0.006, 0.006, 0.17, 6), '#8d6e63', 0, -0.085, 0, { outline: false });
    part(clapper, ball(0.022), '#6d4c41', 0, -0.17, 0, { outline: false });
    // The lanyard to its grip (the work point), the Turk's head.
    const work = marker(g, 0, 1.3, zc + 0.02);
    const lan = part(g, cyl(0.008, 0.008, 1, 8), '#fafafa', 0, 0, 0, { outline: false });
    const knot = part(g, ball(0.025), '#fafafa', 0, 1.24, zc + 0.02);
    label(g, '당직 교대 · 8점종', 0.22, 0.04, 0, 1.3, zb + 0.045, OAK_D, '#ffe082');
    // The ring of sound when it strikes.
    const wave = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.004, 4, 32), new THREE.MeshBasicMaterial({ color: '#fff59d', transparent: true, opacity: 0, depthWrite: false }));
    wave.userData.ownGeometry = wave.userData.ownMaterial = true;
    wave.rotation.x = Math.PI / 2;
    wave.position.set(0, 1.62, zc);
    g.add(wave);

    const st = standAt(g, 0, 0.12, Math.PI, 'sfBell', work);
    out.work = work;
    out.spots = { '*': st };
    const tip = new THREE.Vector3();
    out.animate = (t) => {
      const on = posed(st, t);
      const ph = phaseOf(work);
      const b = on ? bellAt(t, ph) : { pull: 0, since: 99 };
      if (on) turnSpot(st, 'sfBell', t, ph);
      clapper.rotation.x = 0.45 * b.pull;
      bellG.rotation.x = -0.05 * b.pull;
      // The clapper's ball in the piece's frame, the lanyard down from it to the hand.
      tip.set(0, -0.17, 0).applyAxisAngle(new THREE.Vector3(1, 0, 0), clapper.rotation.x).add(new THREE.Vector3(0, 1.73, zc));
      const grip = new THREE.Vector3(0, 1.3 - 0.07 * b.pull, zc + 0.02 + 0.05 * b.pull);
      stretch(lan, tip, grip);
      knot.position.copy(grip).add(new THREE.Vector3(0, -0.05, 0));
      const k = b.since < 0.8 ? b.since / 0.8 : 1;
      wave.visible = k < 1;
      wave.scale.setScalar(1 + 2.5 * k);
      setOpacity(wave, 0.7 * (1 - k));
    };
  },
};
