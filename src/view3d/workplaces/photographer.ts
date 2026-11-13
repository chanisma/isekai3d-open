import * as THREE from 'three';
import { DEV_TRAYS, DEV_WASH, DIRECT_CAM, developRound, handheldCamera, portraitRound, toolPhase, tripodRound, type BarOffset, type Motion } from '../activity';
import { SHOP_DETAIL } from '../furnitureShop';
import { deskChair, marker, rod, shade, spot, type Builder, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, glass, glow, glowing, label, litScreen, painted, picture, ring, seeded, text, type Paint } from './doctor';
import { shopFront } from './shopFront';

/**
 * The photo studio drawn as itself (2026-10-27 workplace pipeline, at the user's request): the
 * seamless backdrop on its stands with the paper swept out across the floor, the cameras on their
 * tripods (shot through: the eye to the viewfinder, a finger on the shutter, and every frame pops
 * the strobes), the retouching desks with their hooded monitors and pen tablets, the darkroom sink
 * under its safelight where a print comes up in the developer, the press scooter that rides off to
 * the news, and what the 사진관 was missing (workFurniture/photographer.ts): the posing stool the
 * client is shot on — the photographer stepping and crouching round them with the camera, or
 * directing them with a hand — the product table with its own tripod, a reflector, the props shelf,
 * the client monitor where the shots are picked, and the wall of sample frames.
 */

const PAPER = '#f4f2ee';
const WALNUT = '#6d4c41';
const RUBBER = '#1e1e22';
const GOLD = '#c9a227';
const SAFE = '#ff2a1a';

const UP = new THREE.Vector3(0, 1, 0);
const tmp = new THREE.Vector3();
/** Whether a spot's had a dweller posed at it just now (activity.ts spotPose marks it). */
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
/** Of named spots, the one most lately stood at (within a moment), else null. */
function nowAt(spots: Record<string, Spot>, t: number): string | null {
  let best: string | null = null;
  for (const [k, s] of Object.entries(spots)) if (Math.abs(t - posedAt(s)) < 0.6 && (best === null || posedAt(s) > posedAt(spots[best]))) best = k;
  return best;
}
/** A spot with what the hands do there. */
function at(s: Spot, work: THREE.Object3D, motion?: Motion): Spot {
  s.work = work;
  s.motion = motion;
  return s;
}
/** A unit-long rod along +y, stretched from one point to another each frame (tongs). */
function stretchy(g: THREE.Object3D, r: number, color: string): THREE.Mesh {
  return part(g, cyl(r, r, 1, 8), color, 0, 0, 0, { outline: false });
}
function stretch(m: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3) {
  const d = b.clone().sub(a);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.scale.set(1, Math.max(d.length(), 1e-4), 1);
  m.quaternion.setFromUnitVectors(UP, d.normalize());
}

// ---------------------------------------------------------------------------------------------
// The strobes: every press of a shutter on the lot fires them (a radio trigger on the camera).

/** When a shutter last went, on the lot's clock. */
let flashAt = -1e9;
function fire(last: number, t: number) {
  if (last > flashAt || flashAt > t + 1) flashAt = last;
}
/** How bright the strobes are now: a pop at the shutter, gone in a seventh of a second. */
function flashNow(t: number): number {
  const d = t - flashAt;
  return d >= 0 && d < 0.14 ? 1 - d / 0.14 : 0;
}
const FLASH = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, depthWrite: false });
const HALO = new THREE.MeshBasicMaterial({ color: '#fffbe8', transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });

// ---------------------------------------------------------------------------------------------
// Cameras.

/**
 * A mirrorless camera with a zoom on it, built round its eyecup (the origin) with the lens out to -z
 * and the grip at +x (the right hand of someone behind it): the body, the viewfinder hump, the grip
 * and shutter button, the lens with its rings and hood, a radio trigger on the hot shoe whose LED
 * blinks red when it fires, the screen on the back, the strap lugs. Returns the parts that move.
 */
function cameraBody(g: THREE.Object3D) {
  const root = new THREE.Group();
  g.add(root);
  const bc = new THREE.Vector3(0, -0.035, -0.06);
  part(root, rbox(0.15, 0.1, 0.075, 0.018), '#26262b', bc.x, bc.y, bc.z);
  part(root, rbox(0.152, 0.03, 0.077, 0.01), '#3a3a40', bc.x, bc.y - 0.035, bc.z, { outline: false });
  // The viewfinder hump and its rubber eyecup.
  part(root, rbox(0.06, 0.045, 0.06, 0.012), '#26262b', 0, 0.012, -0.065);
  part(root, rbox(0.052, 0.036, 0.022, 0.01), RUBBER, 0, 0.002, -0.015);
  part(root, box(0.032, 0.02, 0.004), '#0e2233', 0, 0.002, -0.0035, { outline: false });
  // The grip at +x, the shutter button and the dials on top.
  part(root, rbox(0.04, 0.095, 0.065, 0.016), RUBBER, 0.062, -0.04, -0.068);
  const button = part(root, cyl(0.009, 0.009, 0.008, 12), '#9e9e9e', 0.064, 0.012, -0.075, { outline: false });
  part(root, cyl(0.014, 0.014, 0.012, 14), '#3a3a40', 0.035, 0.022, -0.05, { outline: false });
  part(root, cyl(0.014, 0.014, 0.012, 14), '#3a3a40', -0.04, 0.022, -0.05, { outline: false });
  part(root, box(0.004, 0.003, 0.02), '#e53935', 0.035, 0.029, -0.05, { outline: false });
  // The back screen.
  part(root, box(0.085, 0.058, 0.004), '#101418', -0.012, -0.04, -0.0215, { outline: false });
  const review = part(root, box(0.078, 0.051, 0.002), '#ffd8c2', -0.012, -0.04, -0.019, { outline: false, material: glow('#ffd8c2') });
  review.visible = false;
  // The lens: mount, zoom ring, focus ring, hood, the glass.
  const ly = bc.y;
  part(root, cyl(0.036, 0.036, 0.016, 20), '#9e9e9e', 0, ly, -0.106, { rx: Math.PI / 2, outline: false });
  part(root, cyl(0.04, 0.038, 0.12, 22), '#1f1f23', 0, ly, -0.172, { rx: Math.PI / 2 });
  part(root, cyl(0.042, 0.042, 0.04, 22), '#2f2f35', 0, ly, -0.15, { rx: Math.PI / 2, outline: false });
  for (let i = 0; i < 5; i++) part(root, cyl(0.0425, 0.0425, 0.003, 22), '#151518', 0, ly, -0.135 - i * 0.008, { rx: Math.PI / 2, outline: false });
  part(root, cyl(0.041, 0.041, 0.006, 22), '#e53935', 0, ly, -0.196, { rx: Math.PI / 2, outline: false });
  part(root, cyl(0.052, 0.044, 0.05, 22), '#1a1a1d', 0, ly, -0.255, { rx: Math.PI / 2 });
  glass(root, cyl(0.03, 0.03, 0.004, 20), 0, ly, -0.232, undefined, Math.PI / 2);
  part(root, cyl(0.026, 0.026, 0.002, 18), '#5e7fa8', 0, ly, -0.231, { rx: Math.PI / 2, outline: false });
  // A lens cap, on while it's put away.
  const cap = part(root, cyl(0.054, 0.054, 0.012, 22), '#111114', 0, ly, -0.284, { rx: Math.PI / 2 });
  // The radio trigger on the hot shoe, its aerial and LED.
  part(root, rbox(0.045, 0.032, 0.04, 0.008), '#2b2b30', 0, 0.05, -0.068);
  rod(root, new THREE.Vector3(0.018, 0.066, -0.06), new THREE.Vector3(0.024, 0.115, -0.06), 0.003, BLACK);
  const ledOff = part(root, box(0.008, 0.006, 0.004), '#5d1010', -0.012, 0.055, -0.047, { outline: false });
  const led = part(root, box(0.008, 0.006, 0.004), '#ff3b30', -0.012, 0.055, -0.0468, { outline: false, material: glow('#ff3b30') });
  led.visible = false;
  // Strap lugs and a loop of strap off the left.
  for (const sx of [-1, 1]) part(root, box(0.006, 0.012, 0.012), CHROME, sx * 0.078, -0.005, -0.06, { outline: false });
  return {
    root,
    cap,
    /** The shutter half down (0–1), the trigger LED, the shot on the back screen. */
    set(press: number, flash: boolean, showing: boolean) {
      button.position.y = 0.012 - 0.003 * press;
      led.visible = flash;
      ledOff.visible = !flash;
      review.visible = showing;
    },
  };
}

/**
 * A camera on a tripod in `g` (its frame: the lens to -z, the photographer at +z): three legs in
 * two sections with their locks and rubber feet — one forward under the lens, two back either side
 * of whoever's behind it — the spider, a centre column that winds up to suit their height (their
 * eye at the eyecup), a ball head with its plate, a pan handle back to the right hand, the camera
 * on it tipped down by `tilt`, a sandbag over the front leg. Returns the eyecup, the stood-at spot
 * and the per-frame update.
 */
function tripodCamera(g: THREE.Object3D, tilt = 0) {
  const hub = 0.92;
  const legs: Array<[number, number]> = [
    [0, -1],
    [Math.sin(0.95), Math.cos(0.95)],
    [-Math.sin(0.95), Math.cos(0.95)],
  ];
  for (const [sx, sz] of legs) {
    const top = new THREE.Vector3(sx * 0.05, hub, sz * 0.05);
    const knee = new THREE.Vector3(sx * 0.2, hub * 0.48, sz * 0.2);
    const foot = new THREE.Vector3(sx * 0.36, 0.025, sz * 0.36);
    rod(g, top, knee, 0.014, '#2e2e33');
    rod(g, knee, foot, 0.01, '#55565c');
    part(g, cyl(0.019, 0.019, 0.04, 10), '#f57c00', knee.x, knee.y, knee.z, { outline: false });
    part(g, ball(0.02), RUBBER, foot.x, 0.02, foot.z, { outline: false });
    // A brace to the column.
    rod(g, new THREE.Vector3(sx * 0.14, hub * 0.62, sz * 0.14), new THREE.Vector3(0, hub * 0.55, 0), 0.006, '#3a3a40');
  }
  part(g, cyl(0.06, 0.05, 0.06, 12), '#2e2e33', 0, hub, 0);
  part(g, cyl(0.02, 0.02, 0.24, 8), '#3a3a40', 0, hub * 0.5, 0, { outline: false });
  // A sandbag over the front leg.
  part(g, rbox(0.16, 0.06, 0.11, 0.03), '#e65100', 0, 0.42, -0.17, { rx: 0.5 });
  // The column (stretched to the head) and the head with the camera.
  const column = part(g, cyl(0.016, 0.016, 1, 10), CHROME, 0, 0, 0, { outline: false });
  const crank = part(g, cyl(0.03, 0.03, 0.02, 10), BLACK, 0.06, hub + 0.02, 0, { rz: Math.PI / 2 });
  const head = new THREE.Group();
  g.add(head);
  part(head, cyl(0.032, 0.036, 0.03, 14), '#2e2e33', 0, -0.17, -0.055);
  part(head, ball(0.03), '#55565c', 0, -0.135, -0.055, { outline: false });
  part(head, cyl(0.008, 0.008, 0.05, 6), '#f57c00', 0.035, -0.14, -0.055, { rz: Math.PI / 2, outline: false });
  rod(head, new THREE.Vector3(0.02, -0.15, -0.04), new THREE.Vector3(0.12, -0.19, 0.17), 0.009, '#2e2e33');
  part(head, cyl(0.014, 0.014, 0.1, 10), RUBBER, 0.105, -0.183, 0.14, { rx: 1.2, rz: -0.3, outline: false });
  const tiltG = new THREE.Group();
  tiltG.rotation.x = -tilt;
  head.add(tiltG);
  part(tiltG, rbox(0.07, 0.014, 0.1, 0.004), '#3a3a40', 0, -0.105, -0.06);
  const cam = cameraBody(tiltG);
  const eyecup = marker(tiltG, 0, 0, 0);
  const st = spot(g, 'stand', 0, 0, 0.32, Math.PI);
  let height = -1;
  const setHeight = (h: number) => {
    if (Math.abs(h - height) < 1e-3) return;
    height = h;
    const y = THREE.MathUtils.clamp(0.91 * h, 1.0, 1.72);
    head.position.set(0, y, 0.1);
    const from = hub + 0.03;
    const to = y - 0.18;
    column.position.set(0, (from + to) / 2, 0.045);
    column.scale.set(1, Math.max(0.05, to - from + 0.04), 1);
    crank.position.y = from + 0.05;
  };
  setHeight(1.6);
  return {
    eyecup,
    spot: st,
    cam,
    /** In use: wound up to them, shooting by tripodRound's clock (the strobes fired with it). */
    update(t: number, using: boolean) {
      cam.cap.visible = !using;
      if (!using) {
        cam.set(0, false, false);
        return;
      }
      setHeight((st.at.userData.height as number | undefined) ?? 1.6);
      const k = tripodRound(t, toolPhase(eyecup.getWorldPosition(tmp)));
      fire(k.last, t);
      const since = t - k.last;
      cam.set(k.press, since >= 0 && since < 0.15, k.eye < 0.5);
    },
  };
}

// ---------------------------------------------------------------------------------------------
// What's painted.

/** A person drawn simply: the head at (x, y) `s` across, shoulders and a top below, the hair over it. */
function person(c: CanvasRenderingContext2D, x: number, y: number, s: number, top: string, hair: string, skin = '#f1c9a5', long = false) {
  c.fillStyle = top;
  c.beginPath();
  c.ellipse(x, y + s * 1.25, s * 0.95, s * 0.75, 0, Math.PI, 0);
  c.fill();
  c.fillRect(x - s * 0.95, y + s * 1.24, s * 1.9, s * 1.2);
  c.fillStyle = skin;
  c.fillRect(x - s * 0.18, y + s * 0.4, s * 0.36, s * 0.4);
  c.beginPath();
  c.ellipse(x, y, s * 0.42, s * 0.52, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = hair;
  c.beginPath();
  c.ellipse(x, y - s * 0.16, s * 0.46, s * 0.42, 0, Math.PI, 0);
  c.fill();
  if (long) c.fillRect(x - s * 0.47, y - s * 0.18, s * 0.2, s * 0.95), c.fillRect(x + s * 0.27, y - s * 0.18, s * 0.2, s * 0.95);
  c.fillStyle = '#3b2b2b';
  c.fillRect(x - s * 0.2, y - s * 0.02, s * 0.08, s * 0.06);
  c.fillRect(x + s * 0.12, y - s * 0.02, s * 0.08, s * 0.06);
}
type Shot = 'family' | 'wedding' | 'baby' | 'profile' | 'bw' | 'pink';
/** A photograph of a kind, 256×320 (a portrait-way print). */
function paintShot(kind: Shot): Paint {
  return (c) => {
    const bg: Record<Shot, [string, string]> = { family: ['#d9cbb8', '#b9a58c'], wedding: ['#eef0f2', '#cfd6dc'], baby: ['#fbe3e8', '#f3c6cf'], profile: ['#5f6a72', '#3d454b'], bw: ['#9a9a9a', '#5a5a5a'], pink: ['#f6d3da', '#e9b3bf'] };
    const [a, b] = bg[kind];
    const gr = c.createRadialGradient(128, 130, 20, 128, 160, 220);
    gr.addColorStop(0, a);
    gr.addColorStop(1, b);
    c.fillStyle = gr;
    c.fillRect(0, 0, 256, 320);
    if (kind === 'family') {
      person(c, 80, 140, 40, '#37474f', '#2b1b10');
      person(c, 170, 146, 36, '#8d6e63', '#3b2a20', '#f1c9a5', true);
      person(c, 128, 210, 28, '#f5f5f5', '#2b1b10', '#f6d2b5');
      person(c, 205, 218, 24, '#90caf9', '#2b1b10', '#f6d2b5');
    } else if (kind === 'wedding') {
      person(c, 92, 130, 44, '#212121', '#1a1a1a');
      c.fillStyle = '#ffffff';
      c.fillRect(86, 183, 12, 50);
      person(c, 168, 140, 40, '#fafafa', '#3b2a20', '#f6d2b5', true);
      c.fillStyle = 'rgba(255,255,255,0.75)';
      c.beginPath();
      c.ellipse(168, 150, 58, 92, 0, Math.PI, 0);
      c.fill();
      c.fillStyle = '#f48fb1';
      for (const [x, y] of [[150, 250], [162, 244], [172, 254], [158, 258]]) c.beginPath(), c.arc(x, y, 8, 0, Math.PI * 2), c.fill();
    } else if (kind === 'baby') {
      // A first-birthday hanbok: the 색동 sleeves, the 복건 cap.
      person(c, 128, 150, 52, '#e53935', '#2b1b10', '#f6d2b5');
      const bands = ['#e53935', '#fdd835', '#43a047', '#1e88e5', '#8e24aa', '#ffffff'];
      bands.forEach((k, i) => {
        c.fillStyle = k;
        c.fillRect(70 - 10, 225 + i * 12, 30, 12);
        c.fillRect(196, 225 + i * 12, 30, 12);
      });
      c.fillStyle = '#212121';
      c.beginPath();
      c.ellipse(128, 118, 50, 34, 0, Math.PI, 0);
      c.fill();
      c.fillStyle = GOLD;
      c.fillRect(100, 112, 56, 6);
    } else if (kind === 'profile') {
      person(c, 128, 140, 62, '#263238', '#1a1a1a');
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.moveTo(108, 222);
      c.lineTo(128, 262);
      c.lineTo(148, 222);
      c.fill();
    } else if (kind === 'bw') {
      person(c, 128, 140, 58, '#3a3a3a', '#1a1a1a', '#d0d0d0', true);
    } else {
      person(c, 128, 140, 58, '#fafafa', '#3b2a20', '#f6d2b5', true);
    }
  };
}
const shot = (kind: Shot) => painted(`ph-shot|${kind}`, 256, 320, paintShot(kind));

/** The retouching screen: the photo in the middle being healed, the filmstrip under it, the panels and sliders. */
const paintRetouch: Paint = (c) => {
  c.fillStyle = '#2b2b2b';
  c.fillRect(0, 0, 512, 288);
  c.fillStyle = '#1e1e1e';
  c.fillRect(0, 0, 512, 18);
  text(c, '라이브러리 | 현상 | 인쇄', 10, 9, 11, '#c8c8c8');
  text(c, 'IMG_2417.CR3', 500, 9, 10, '#9e9e9e', 'right', false);
  // The photo.
  c.fillStyle = '#111111';
  c.fillRect(96, 24, 300, 200);
  const g = c.createRadialGradient(246, 110, 10, 246, 130, 150);
  g.addColorStop(0, '#f6d3da');
  g.addColorStop(1, '#e2a7b3');
  c.fillStyle = g;
  c.fillRect(156, 26, 180, 196);
  person(c, 246, 96, 42, '#fafafa', '#3b2a20', '#f6d2b5', true);
  // The healing brush's circle on the cheek.
  c.strokeStyle = '#ffffff';
  c.lineWidth = 2;
  c.beginPath();
  c.arc(262, 108, 9, 0, Math.PI * 2);
  c.stroke();
  // The filmstrip.
  for (let i = 0; i < 7; i++) {
    c.fillStyle = i === 3 ? '#e0e0e0' : '#444444';
    c.fillRect(96 + i * 43, 232, 40, 50);
    c.fillStyle = i % 2 ? '#e7b8c1' : '#d5c4b0';
    c.fillRect(100 + i * 43, 236, 32, 42);
  }
  // Left: the presets; right: the histogram and the sliders.
  c.fillStyle = '#333333';
  c.fillRect(4, 24, 86, 258);
  ['프로필 기본', '피부 보정', '웨딩 화사', '흑백 클래식', '돌사진 따뜻'].forEach((s, i) => text(c, s, 10, 40 + i * 18, 10, i === 1 ? '#ffffff' : '#a0a0a0', 'left', false));
  c.fillStyle = '#333333';
  c.fillRect(402, 24, 106, 258);
  c.fillStyle = '#1a1a1a';
  c.fillRect(408, 30, 94, 44);
  const hist = seeded(7);
  for (let x = 0; x < 94; x += 2) {
    const h = 6 + 34 * Math.exp(-(((x - 58) / 22) ** 2)) + hist() * 6;
    c.fillStyle = x < 40 ? '#5c7ea8' : x < 70 ? '#c9a0a8' : '#d8d8d8';
    c.fillRect(408 + x, 74 - h, 2, h);
  }
  ['노출', '대비', '하이라이트', '어두운 영역', '온도', '채도'].forEach((s, i) => {
    const y = 92 + i * 30;
    text(c, s, 408, y, 10, '#c8c8c8', 'left', false);
    c.fillStyle = '#555555';
    c.fillRect(408, y + 11, 92, 3);
    c.fillStyle = '#e0e0e0';
    c.beginPath();
    c.arc(408 + 46 + [8, 14, -18, 22, 6, -6][i], y + 12, 4, 0, Math.PI * 2);
    c.fill();
  });
};
/** The client monitor: the session's shots in a grid, the picked ones hearted, the count. */
const paintSelect: Paint = (c) => {
  c.fillStyle = '#121417';
  c.fillRect(0, 0, 512, 288);
  text(c, '김○○ 님 가족사진 · 셀렉', 14, 16, 15, '#ffffff');
  text(c, '선택 12 / 48', 498, 16, 14, '#ff8a9c', 'right');
  const kinds: Shot[] = ['family', 'baby', 'family', 'pink', 'family', 'baby', 'family', 'family', 'pink', 'baby'];
  for (let r = 0; r < 2; r++)
    for (let i = 0; i < 5; i++) {
      const x = 14 + i * 98;
      const y = 34 + r * 124;
      const k = kinds[r * 5 + i];
      const bg = k === 'baby' ? '#fbe3e8' : k === 'pink' ? '#f6d3da' : '#d9cbb8';
      c.fillStyle = '#2a2d31';
      c.fillRect(x - 2, y - 2, 92, 116);
      c.fillStyle = bg;
      c.fillRect(x, y, 88, 112);
      if (k === 'family') {
        person(c, x + 28, y + 46, 14, '#37474f', '#2b1b10');
        person(c, x + 58, y + 48, 13, '#8d6e63', '#3b2a20', '#f1c9a5', true);
        person(c, x + 44, y + 74, 10, '#f5f5f5', '#2b1b10');
      } else person(c, x + 44, y + 48, 20, k === 'baby' ? '#e53935' : '#fafafa', '#3b2a20', '#f6d2b5', k === 'pink');
      if ((r * 5 + i) % 3 !== 1) {
        // A heart: two lobes and the point.
        c.fillStyle = '#ff4d6d';
        c.beginPath();
        c.arc(x + 74, y + 10, 4, 0, Math.PI * 2);
        c.arc(x + 81, y + 10, 4, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.moveTo(x + 70.2, y + 11.5);
        c.lineTo(x + 77.5, y + 19);
        c.lineTo(x + 84.8, y + 11.5);
        c.fill();
      }
      if (r === 0 && i === 2) {
        c.strokeStyle = '#4fc3f7';
        c.lineWidth = 4;
        c.strokeRect(x - 3, y - 3, 94, 118);
      }
    }
  c.fillStyle = '#1e2226';
  c.fillRect(0, 286 - 16, 512, 18);
  text(c, '◀ 이전      선택      다음 ▶', 256, 278, 11, '#b0bec5', 'center', false);
};
/** The studio's price list by the sample frames. */
const paintPrices: Paint = (c) => {
  c.fillStyle = '#2b201b';
  c.fillRect(0, 0, 256, 320);
  c.strokeStyle = GOLD;
  c.lineWidth = 3;
  c.strokeRect(8, 8, 240, 304);
  text(c, '촬영 안내', 128, 36, 22, '#f3e5c0', 'center');
  const rows: Array<[string, string]> = [['증명·여권 사진', '20,000'], ['프로필 촬영', '80,000'], ['가족사진', '150,000'], ['돌·성장 사진', '180,000'], ['웨딩 스냅', '350,000'], ['액자 추가', '별도 문의']];
  rows.forEach(([a, b], i) => {
    const y = 78 + i * 36;
    text(c, a, 22, y, 15, '#f5f0e6', 'left', false);
    text(c, b, 234, y, 15, '#f3d27a', 'right');
    c.fillStyle = 'rgba(243,229,192,0.25)';
    c.fillRect(22, y + 15, 212, 1);
  });
  text(c, '예약 문의 02-2026-1027', 128, 296, 12, '#c9b98f', 'center', false);
};

/** A framed photograph standing up in `g` facing +z: the moulding, a mat, the print. */
function frame(g: THREE.Object3D, kind: Shot, w: number, h: number, x: number, y: number, z: number, moulding = GOLD, mat = '#fbf8f2', ry = 0) {
  const f = new THREE.Group();
  f.position.set(x, y, z);
  f.rotation.y = ry;
  g.add(f);
  part(f, rbox(w, h, 0.035, 0.01), moulding, 0, 0, 0);
  part(f, box(w - 0.05, h - 0.05, 0.01), mat, 0, 0, 0.015, { outline: false });
  picture(f, shot(kind), w - 0.11, h - 0.11, 0, 0, 0.022);
  return f;
}

/** A light stand's three feet and its column, from the floor to `h`, in `g` at (x, z). */
function lightStand(g: THREE.Object3D, x: number, z: number, h: number, r = 0.26, color = '#2e2e33') {
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    rod(g, new THREE.Vector3(x, 0.42, z), new THREE.Vector3(x + Math.sin(a) * r, 0.02, z + Math.cos(a) * r), 0.011, color);
    part(g, ball(0.018), RUBBER, x + Math.sin(a) * r, 0.018, z + Math.cos(a) * r, { outline: false });
  }
  part(g, cyl(0.03, 0.03, 0.06, 10), color, x, 0.42, z);
  part(g, cyl(0.016, 0.016, h - 0.42, 8), CHROME, x, (h + 0.42) / 2, z, { outline: false });
  part(g, cyl(0.022, 0.022, 0.03, 10), BLACK, x, h * 0.72, z, { outline: false });
}

// ---------------------------------------------------------------------------------------------

export const BUILDERS: Record<string, Builder> = {
  /**
   * The studio strobe as furnitureShop.ts draws it, popping when any shutter on the lot goes (a
   * radio trigger on the camera): its softbox's face bursts white with a halo round it.
   */
  studioLight(g, W, D, c, def, ctx, out) {
    SHOP_DETAIL.studioLight(g, W, D, c, def, ctx, out);
    const pop = new THREE.Group();
    pop.position.set(0, 1.74, 0.02);
    pop.rotation.x = 0.28;
    g.add(pop);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.54), FLASH);
    face.userData.ownGeometry = true;
    face.position.z = 0.32;
    pop.add(face);
    const halo = new THREE.Mesh(new THREE.CircleGeometry(0.62, 24), HALO);
    halo.userData.ownGeometry = true;
    halo.position.z = 0.34;
    pop.add(halo);
    pop.visible = false;
    out.away = (_out, t) => {
      const k = flashNow(t);
      pop.visible = k > 0;
      if (k > 0) halo.scale.setScalar(0.8 + 0.5 * k);
    };
  },

  /**
   * A seamless backdrop (배경지): two stands with a crossbar at the back carrying three paper rolls —
   * pink and grey behind, the white one pulled down, curved into a cove at the foot and swept out
   * across the floor to under the sitter's stool, a few scuffs of shoes on it; A-clamps holding the
   * paper's edges to the stands, the roll's chain hanging at the right, sandbags on the feet. Set up
   * crouched at a basket of flowers and a crate of props on the sweep; the shoot quoted stood at the
   * side with the plan in hand.
   */
  photoBackdrop(g, W, _D, _c, _def, _ctx, out) {
    const half = W / 2 - 0.08;
    for (const sx of [-1, 1]) {
      lightStand(g, sx * half, -0.36, 2.62, 0.24);
      part(g, rbox(0.18, 0.06, 0.1, 0.03), '#e65100', sx * half, 0.2, -0.18);
      // The A-clamp holding the paper's edge to the stand.
      part(g, rbox(0.03, 0.08, 0.05, 0.01), '#ff9800', sx * (half - 0.04), 1.25, -0.2);
    }
    part(g, cyl(0.018, 0.018, 2 * half + 0.06, 10), '#3a3a40', 0, 2.6, -0.36, { rz: Math.PI / 2, outline: false });
    // The rolls, back to front, on their cores; hooks to the crossbar.
    const rolls: Array<[string, number, number]> = [['#f3c6cf', -0.44, 2.48], ['#8e9399', -0.36, 2.4], [PAPER, -0.27, 2.32]];
    for (const [k, z, y] of rolls) {
      part(g, cyl(0.065, 0.065, 2 * half - 0.12, 20), k, 0, y, z, { rz: Math.PI / 2 });
      for (const sx of [-1, 1]) {
        part(g, cyl(0.025, 0.025, 0.04, 10), '#5d4037', sx * (half - 0.04), y, z, { rz: Math.PI / 2, outline: false });
        rod(g, new THREE.Vector3(sx * (half - 0.02), y, z), new THREE.Vector3(sx * (half - 0.02), 2.6, -0.36), 0.006, STEEL);
      }
    }
    // The chain loop down the right.
    for (const dz of [-0.01, 0.01]) rod(g, new THREE.Vector3(half - 0.06, 2.32, -0.27 + dz), new THREE.Vector3(half - 0.06, 1.15, -0.27 + dz), 0.004, '#9e9e9e');
    part(g, ring(0.012, 0.004), '#9e9e9e', half - 0.06, 1.14, -0.27, { ry: Math.PI / 2, outline: false });
    // The white paper: down from its roll, round the cove, out over the floor.
    const pw = 2 * half - 0.16;
    part(g, box(pw, 1.86, 0.006), PAPER, 0, 1.33, -0.205, { outline: false });
    const R = 0.4;
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = ((i + 0.5) / n) * (Math.PI / 2);
      part(g, box(pw, R * (Math.PI / 2 / n) + 0.004, 0.006), PAPER, 0, R - R * Math.sin(a), 0.2 - R * Math.cos(a) - 0.005, { rx: Math.PI - a, outline: false });
    }
    // Out across the floor (a group out at the front, so it's not counted as the solid part).
    const sweep = new THREE.Group();
    sweep.position.set(0, 0, 0.4);
    g.add(sweep);
    part(sweep, box(pw, 0.004, 2.1), PAPER, 0, 0.003, 0.85, { outline: false, shadow: false });
    const rnd = seeded(23);
    for (let i = 0; i < 9; i++) part(sweep, box(0.05, 0.001, 0.1), '#dcd9d2', -0.6 + rnd() * 1.2, 0.0055, 0.6 + rnd() * 1.2, { ry: rnd() * 3, outline: false, shadow: false });
    // Setting it up: a basket of flowers and a crate of props.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const bx = 0.25;
    const bz = 0.62;
    part(use, cyl(0.15, 0.12, 0.16, 16), '#c49a6c', bx, 0.08, bz);
    for (let i = 0; i < 6; i++) part(use, box(0.3, 0.008, 0.006), '#a47c50', bx, 0.03 + i * 0.024, bz + 0.148, { outline: false });
    rod(use, new THREE.Vector3(bx - 0.14, 0.16, bz), new THREE.Vector3(bx, 0.33, bz), 0.008, '#a47c50');
    rod(use, new THREE.Vector3(bx, 0.33, bz), new THREE.Vector3(bx + 0.14, 0.16, bz), 0.008, '#a47c50');
    const fl = seeded(5);
    for (let i = 0; i < 9; i++) part(use, ball(0.035), ['#f48fb1', '#fff59d', '#ffffff', '#ce93d8'][i % 4], bx - 0.09 + fl() * 0.18, 0.17 + fl() * 0.04, bz - 0.08 + fl() * 0.16, { outline: false });
    part(use, rbox(0.36, 0.2, 0.26, 0.02), '#a1887f', -0.45, 0.1, 0.85);
    part(use, ball(0.07), '#ffcc80', -0.5, 0.24, 0.84);
    part(use, cyl(0.1, 0.1, 0.02, 16), '#f5f5f5', -0.38, 0.22, 0.88, { rx: 0.4 });
    const basket = marker(g, bx, 0.22, bz - 0.02);
    out.spots = {
      '*': at(spot(g, 'stand', bx + 0.08, 0, bz + 0.45, Math.PI), basket, 'tinker'),
      photographer_shootQuote: at(spot(g, 'stand', 1.15, 0, 0.95, -Math.PI / 2 - 0.5), basket, 'read'),
    };
  },

  /**
   * The studio camera: a mirrorless camera with a zoom on a tall tripod, the lens to the set. Shot
   * through stood behind it — the column wound up to the eye, the right hand round the grip with a
   * finger on the shutter, the left under the lens — in bursts that fire the strobes, the head up over
   * the camera between them to wave the sitter round; the lens cap on while it waits.
   */
  studioCamera(g, _W, _D, _c, _def, _ctx, out) {
    const tri = tripodCamera(g, 0.03);
    out.spots = { '*': at(tri.spot, tri.eyecup, 'shoot') };
    out.work = tri.eyecup;
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    out.animate = (t) => tri.update(t, true);
    let was = false;
    out.away = (_o, t) => {
      const using = use.visible;
      if (!using && was) tri.update(t, false);
      was = using;
    };
    tri.update(0, false);
  },

  /**
   * A retouching desk (보정실): a 27-inch monitor in its black shading hood with the photo being healed
   * in the editor (lit in use), a calibration puck hung over the screen's corner, a pen tablet with its
   * pen, the keyboard to its left, a card reader with SD cards, an external drive, a grey card and a
   * mug. Retouched sat with the pen in small circles, the left hand on the shortcuts; captions typed;
   * the photo meeting led stood beside it, turned to the room.
   */
  photoEditStation(g, _W, D, c, _def, _ctx, out) {
    const d = 0.62;
    const z0 = -D / 2 + d / 2;
    const top = 0.74;
    part(g, rbox(0.96, 0.04, d, 0.015), '#f0eeea', 0, top - 0.02, z0);
    for (const sx of [-1, 1]) part(g, rbox(0.04, top - 0.04, d - 0.06, 0.01), shade(c, 0.9), sx * 0.44, (top - 0.04) / 2, z0);
    part(g, rbox(0.86, 0.06, 0.02, 0.01), shade(c, 0.9), 0, top - 0.1, z0 - d / 2 + 0.04);
    // The monitor on its stand, in its hood.
    const mz = z0 - 0.14;
    part(g, rbox(0.22, 0.015, 0.16, 0.006), '#2b2b30', 0, top + 0.008, mz);
    part(g, rbox(0.05, 0.3, 0.03, 0.01), '#2b2b30', 0, top + 0.16, mz - 0.03);
    const sy = top + 0.36;
    part(g, rbox(0.66, 0.4, 0.04, 0.012), '#1c1c1f', 0, sy, mz + 0.01);
    out.screen = litScreen(g, painted('ph-retouch', 512, 288, paintRetouch), 0.62, 0.35, 0, sy, mz + 0.032);
    part(g, box(0.68, 0.02, 0.2), '#141416', 0, sy + 0.215, mz + 0.1, { outline: true });
    for (const sx of [-1, 1]) part(g, box(0.02, 0.43, 0.2), '#141416', sx * 0.34, sy + 0.005, mz + 0.1);
    // The calibration puck over the top corner, its cable.
    part(g, rbox(0.06, 0.07, 0.03, 0.015), '#eceff1', -0.2, sy + 0.1, mz + 0.05);
    rod(g, new THREE.Vector3(-0.2, sy + 0.135, mz + 0.045), new THREE.Vector3(-0.21, sy + 0.23, mz), 0.004, '#9e9e9e');
    // The tablet and its pen, the keyboard to the left, the mouse.
    const tz = z0 + 0.14;
    part(g, rbox(0.34, 0.012, 0.22, 0.012), '#2a2a2e', 0.08, top + 0.006, tz);
    part(g, box(0.25, 0.002, 0.15), '#3a3a40', 0.1, top + 0.013, tz, { outline: false });
    for (let i = 0; i < 4; i++) part(g, box(0.02, 0.004, 0.018), '#55565c', -0.06, top + 0.014, tz - 0.06 + i * 0.04, { outline: false });
    const pen = new THREE.Group();
    g.add(pen);
    part(pen, cyl(0.006, 0.005, 0.15, 8), BLACK, 0.2, top + 0.02, tz + 0.02, { rz: Math.PI / 2, ry: 0.4, outline: false });
    const tablet = marker(g, 0.1, top + 0.02, tz);
    part(g, rbox(0.3, 0.016, 0.11, 0.008), '#e0e0e0', -0.3, top + 0.008, tz - 0.01, { ry: 0.08 });
    for (let r = 0; r < 4; r++) part(g, box(0.27, 0.003, 0.016), '#bdbdbd', -0.3, top + 0.017, tz - 0.045 + r * 0.023, { ry: 0.08, outline: false });
    const keys = marker(g, -0.3, top + 0.02, tz);
    // The card reader and cards, the drive, the grey card, the mug.
    part(g, rbox(0.07, 0.015, 0.05, 0.006), '#37474f', 0.33, top + 0.008, z0 - 0.02);
    for (let i = 0; i < 3; i++) part(g, box(0.024, 0.002, 0.032), ['#1565c0', '#c62828', '#212121'][i], 0.3 + i * 0.03, top + 0.003, z0 + 0.06, { ry: 0.2 * i, outline: false });
    part(g, rbox(0.08, 0.025, 0.12, 0.008), '#455a64', -0.36, top + 0.013, z0 - 0.17);
    part(g, box(0.1, 0.13, 0.004), '#9e9e9e', 0.36, top + 0.07, z0 - 0.22, { rx: -0.2, outline: false });
    part(g, cyl(0.035, 0.03, 0.09, 14), '#e8eaf6', 0.36, top + 0.045, z0 + 0.12);
    part(g, cyl(0.03, 0.03, 0.004, 14), '#4e342e', 0.36, top + 0.088, z0 + 0.12, { outline: false });
    // The chair and the uses.
    out.seat = deskChair(g, z0 + d / 2);
    const cz = z0 + d / 2 + 0.2;
    const screenAt = marker(g, 0, sy, mz + 0.04);
    const sat = (motion: Motion, work: THREE.Object3D) => at(spot(g, 'sit', 0, 0.48, cz, Math.PI, 0.48), work, motion);
    out.spots = {
      '*': sat('retouch', tablet),
      photographer_photoCaption: sat('type', keys),
      photographer_photoDesk: at(spot(g, 'stand', 0.62, 0, 0.12, 0.15), screenAt, 'present'),
    };
  },

  /**
   * The darkroom sink (암실 현상대): a long black sink on its cabinet, the enlarger on the dry end —
   * its baseboard and masking easel with the paper on it, the column, the lamp head and bellows, the
   * timer glowing beside it — and in the sink the developer, stop and fixer trays (labelled), the wash
   * tray under a running tap; brown bottles and the darkroom clock on the shelf over it, prints and
   * film pegged on a line above, and the red safelight that comes on while it's used. A print taken
   * through with the tongs: rocked in the developer while the picture comes up, over to the stop and
   * the fixer, held up to the light, laid in the wash.
   */
  darkroomSink(g, W, D, _c, _def, _ctx, out) {
    const top = 0.9;
    const d = 0.62;
    const z0 = -D / 2 + d / 2;
    const xm = 0.05;
    const trayZ = -0.1;
    // The cabinet and the sink.
    part(g, rbox(W - 0.04, top - 0.08, d, 0.02), '#2b2b30', 0, (top - 0.08) / 2, z0);
    for (let i = 0; i < 3; i++) part(g, box(0.004, top - 0.2, 0.004), '#45454c', -0.5 + i * 0.6, top / 2 - 0.02, z0 + d / 2 + 0.001, { outline: false });
    part(g, rbox(0.42, 0.06, d, 0.015), '#3a3a40', -W / 2 + 0.23, top - 0.05, z0);
    const sx0 = -W / 2 + 0.46;
    const sw = W / 2 - 0.02 - sx0;
    const sc = sx0 + sw / 2;
    part(g, box(sw, 0.03, d), '#232327', sc, top - 0.065, z0, { outline: false });
    for (const s of [-1, 1]) part(g, box(sw, 0.12, 0.03), '#232327', sc, top - 0.02, z0 + s * (d / 2 - 0.015));
    part(g, box(0.03, 0.12, d), '#232327', sx0 + 0.015, top - 0.02, z0);
    part(g, box(0.03, 0.12, d), '#232327', W / 2 - 0.035, top - 0.02, z0);
    // The trays: developer, stop, fixer; the wash at the end under the tap.
    const liquids = ['#c9b48a', '#e8d36a', '#cfe3e8'];
    const tags = ['현상', '정지', '정착'];
    const tagCol = ['#c62828', '#f9a825', '#1565c0'];
    const trayX = DEV_TRAYS.map((s) => xm - s);
    trayX.forEach((x, i) => {
      part(g, rbox(0.33, 0.05, 0.27, 0.012), '#eceff1', x, top - 0.035, trayZ);
      part(g, box(0.3, 0.003, 0.24), liquids[i], x, top - 0.016, trayZ, { outline: false, material: glow(liquids[i]) });
      // Its tag stood on the sink's back wall above it.
      label(g, tags[i], 0.12, 0.05, x, top + 0.07, z0 - d / 2 + 0.035, tagCol[i], '#ffffff');
    });
    const washX = xm - DEV_WASH;
    part(g, rbox(0.24, 0.07, 0.3, 0.012), '#b0bec5', washX, top - 0.03, trayZ);
    part(g, box(0.21, 0.003, 0.27), '#b3e5fc', washX, top - 0.002, trayZ, { outline: false });
    rod(g, new THREE.Vector3(washX + 0.06, top + 0.05, z0 - d / 2 + 0.05), new THREE.Vector3(washX + 0.06, top + 0.3, z0 - d / 2 + 0.05), 0.014, CHROME);
    rod(g, new THREE.Vector3(washX + 0.06, top + 0.3, z0 - d / 2 + 0.05), new THREE.Vector3(washX + 0.06, top + 0.24, trayZ - 0.08), 0.012, CHROME);
    const stream = part(g, cyl(0.006, 0.006, 0.24, 6), '#b3e5fc', washX + 0.06, top + 0.11, trayZ - 0.08, { outline: false });
    // Printed photos in the wash already.
    part(g, box(0.12, 0.002, 0.15), '#e9e9e9', washX - 0.03, top, trayZ + 0.02, { ry: 0.3, outline: false });
    // The enlarger on the dry end.
    const ex = -W / 2 + 0.23;
    part(g, rbox(0.38, 0.03, 0.42, 0.01), '#cfd8dc', ex, top + 0.015, z0 + 0.02);
    part(g, rbox(0.26, 0.012, 0.21, 0.004), '#ffca28', ex, top + 0.036, z0 + 0.06);
    part(g, box(0.2, 0.002, 0.16), '#ffffff', ex, top + 0.043, z0 + 0.06, { outline: false });
    part(g, rbox(0.06, 0.95, 0.06, 0.01), '#9e9e9e', ex, top + 0.5, z0 - d / 2 + 0.06);
    const eh = top + 0.62;
    part(g, rbox(0.08, 0.06, 0.18, 0.01), '#616161', ex, eh, z0 - d / 2 + 0.16);
    part(g, rbox(0.18, 0.18, 0.2, 0.03), '#37474f', ex, eh + 0.08, z0 + 0.0);
    part(g, rbox(0.1, 0.06, 0.1, 0.02), '#263238', ex, eh + 0.2, z0 + 0.0);
    for (let i = 0; i < 4; i++) part(g, box(0.13 - i * 0.01, 0.02, 0.13 - i * 0.01), '#1a1a1a', ex, eh - 0.03 - i * 0.025, z0 + 0.0);
    part(g, cyl(0.035, 0.03, 0.06, 14), '#212121', ex, eh - 0.15, z0, { outline: false });
    // The enlarger's timer beside it.
    part(g, rbox(0.12, 0.07, 0.1, 0.01), '#212121', ex + 0.12, top + 0.06, z0 + 0.22, { rx: -0.3 });
    glowing(g, box(0.07, 0.022, 0.004), '#ff3d00', ex + 0.12, top + 0.075, z0 + 0.267, -0.3);
    // The splashback shelf: bottles, the clock, a funnel.
    const shZ = -D / 2 + 0.08;
    part(g, rbox(W - 0.5, 0.025, 0.14, 0.008), '#3a3a40', 0.22, top + 0.5, shZ);
    const bottles: Array<[number, string]> = [[-0.4, '현상액'], [-0.25, '정지액'], [-0.1, '정착액']];
    for (const [x, s] of bottles) {
      part(g, cyl(0.045, 0.045, 0.2, 14), '#5d3a1a', x, top + 0.613, shZ, { material: undefined });
      part(g, cyl(0.022, 0.022, 0.04, 10), BLACK, x, top + 0.733, shZ);
      label(g, s, 0.075, 0.045, x, top + 0.61, shZ + 0.047, '#fff8e1', '#3e2723');
    }
    part(g, cyl(0.1, 0.1, 0.035, 24), '#212121', 0.35, top + 0.62, shZ, { rx: Math.PI / 2 });
    part(g, cyl(0.088, 0.088, 0.004, 24), '#e0f2f1', 0.35, top + 0.62, shZ + 0.019, { rx: Math.PI / 2, outline: false });
    const hand = part(g, box(0.006, 0.075, 0.003), '#ff1744', 0.35, top + 0.62, shZ + 0.023, { outline: false });
    // The line overhead with prints and film pegged on it.
    const ly = top + 1.12;
    rod(g, new THREE.Vector3(-W / 2 + 0.05, ly, shZ + 0.02), new THREE.Vector3(W / 2 - 0.05, ly, shZ + 0.02), 0.003, '#bdbdbd');
    const hung: Array<[number, Shot | null]> = [[-0.55, 'bw'], [-0.25, 'bw'], [0.05, null], [0.3, 'bw'], [0.62, null]];
    for (const [x, k] of hung) {
      part(g, box(0.014, 0.04, 0.012), '#8d6e63', x, ly - 0.01, shZ + 0.02, { outline: false });
      if (k) picture(g, shot(k), 0.16, 0.2, x, ly - 0.13, shZ + 0.03, '#d8d8d8');
      else {
        part(g, box(0.035, 0.36, 0.003), '#3e2723', x, ly - 0.2, shZ + 0.025, { outline: false });
        for (let i = 0; i < 9; i++) part(g, box(0.022, 0.026, 0.002), '#d7ccc8', x, ly - 0.04 - i * 0.038, shZ + 0.028, { outline: false });
      }
    }
    // The safelight: its housing always, its red light in use; the 암실 sign.
    part(g, rbox(0.2, 0.14, 0.1, 0.02), '#212121', sc, top + 1.3, shZ + 0.03);
    part(g, box(0.16, 0.1, 0.01), '#4a0d0d', sc, top + 1.3, shZ + 0.081, { outline: false });
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    glowing(use, box(0.16, 0.1, 0.012), SAFE, sc, top + 1.3, shZ + 0.083);
    const redWash = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.2, 1.1), new THREE.MeshBasicMaterial({ color: '#ff1a00', transparent: true, opacity: 0.08, depthWrite: false, blending: THREE.AdditiveBlending }));
    redWash.userData.ownGeometry = redWash.userData.ownMaterial = true;
    redWash.position.set(0.1, top + 0.55, shZ + 0.09);
    use.add(redWash);
    label(g, '암실 · 사용 중 출입 금지', 0.7, 0.09, sc, top + 1.46, shZ + 0.06, '#b71c1c', '#ffffff');
    // The print and the tongs, moved by developRound's clock.
    const W0 = new THREE.Vector3(xm, top - 0.012, trayZ);
    const work = marker(g, W0.x, W0.y, W0.z);
    const off = (o: BarOffset, v = new THREE.Vector3()) => v.set(W0.x - o.side, W0.y + o.up, W0.z - o.ahead);
    const tongs = stretchy(use, 0.006, '#d7b98e');
    const tongs2 = stretchy(use, 0.006, '#d7b98e');
    const print = new THREE.Group();
    use.add(print);
    const sheet = new THREE.Group();
    print.add(sheet);
    part(sheet, box(0.2, 0.25, 0.002), '#ffffff', 0, 0, 0, { outline: false });
    picture(sheet, shot('bw'), 0.18, 0.23, 0, 0, 0.0015);
    const blank = new THREE.Mesh(new THREE.PlaneGeometry(0.19, 0.24), new THREE.MeshBasicMaterial({ color: '#f6f6f6', transparent: true, depthWrite: false }));
    blank.userData.ownGeometry = blank.userData.ownMaterial = true;
    blank.position.z = 0.0025;
    sheet.add(blank);
    const st = at(spot(g, 'stand', xm, 0, 0.44, Math.PI), work, 'develop');
    out.spots = { '*': st };
    out.work = work;
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    out.animate = (t) => {
      const k = developRound(t, toolPhase(work.getWorldPosition(tmp)));
      const tip = off(k.tip, a);
      const hd = off(k.r, b);
      stretch(tongs, hd, tip);
      stretch(tongs2, hd.clone().add(new THREE.Vector3(0.012, 0, 0)), tip.clone().add(new THREE.Vector3(0.012, 0.004, 0)));
      print.visible = k.u < 0.975 || k.u > 0.999;
      // Flat in the tray, gripped at its near edge; hanging from the tongs when lifted.
      const e = k.lifted;
      print.position.copy(tip).add(new THREE.Vector3(0, -0.125 * e, -0.11 * (1 - e)));
      sheet.rotation.set(-Math.PI / 2 * (1 - e), 0, 0);
      (blank.material as THREE.MeshBasicMaterial).opacity = 1 - k.dev;
      stream.scale.y = 1 + 0.1 * Math.sin(t * 20);
      hand.rotation.z = -t * 0.8;
    };
  },

  /**
   * The press scooter (취재용 스쿠터) out front: a blue step-through scooter along its bay, 'PRESS' and
   * the studio's name on its side panels, the windscreen, the mirrors (a helmet hung on one), a top
   * box on the rack with PRESS on it, the plate. Off to a story it pulls away with the lights on and
   * is gone; it rolls back into its bay after. The kit packed into the top box before leaving.
   */
  pressScooter(g, _W, _D, c, _def, _ctx, out) {
    part(g, box(1.9, 0.01, 0.8), '#9ea3a8', 0, 0.005, 0, { outline: false, shadow: false });
    label(g, '취재 차량', 0.6, 0.16, 0, 0.012, 0.3, '#9ea3a8', '#ffffff', 0).rotation.x = -Math.PI / 2;
    const bike = new THREE.Group();
    g.add(bike);
    const wheel = (x: number) => {
      part(bike, cyl(0.2, 0.2, 0.09, 20), RUBBER, x, 0.2, 0, { rx: Math.PI / 2 });
      part(bike, cyl(0.12, 0.12, 0.095, 16), '#b0bec5', x, 0.2, 0, { rx: Math.PI / 2, outline: false });
    };
    wheel(0.6);
    wheel(-0.55);
    // The body: floorboard, rear body under the seat, the front shield and the handlebars.
    part(bike, rbox(0.5, 0.08, 0.32, 0.03), '#37474f', 0.1, 0.3, 0);
    part(bike, rbox(0.7, 0.38, 0.36, 0.12), c, -0.42, 0.52, 0);
    part(bike, rbox(0.62, 0.1, 0.32, 0.05), '#212121', -0.38, 0.76, 0);
    part(bike, rbox(0.16, 0.7, 0.4, 0.06), c, 0.48, 0.62, 0, { rz: -0.18 });
    part(bike, rbox(0.3, 0.12, 0.2, 0.05), c, 0.62, 0.36, 0, { rz: -0.3 });
    rod(bike, new THREE.Vector3(0.58, 0.95, 0), new THREE.Vector3(0.6, 0.2, 0), 0.025, '#616161');
    part(bike, rbox(0.12, 0.1, 0.24, 0.04), c, 0.56, 1.0, 0);
    part(bike, cyl(0.014, 0.014, 0.66, 8), '#424242', 0.54, 1.04, 0, { rx: Math.PI / 2, outline: false });
    for (const s of [-1, 1]) {
      part(bike, cyl(0.02, 0.02, 0.1, 8), RUBBER, 0.54, 1.04, s * 0.33, { rx: Math.PI / 2, outline: false });
      rod(bike, new THREE.Vector3(0.55, 1.05, s * 0.2), new THREE.Vector3(0.5, 1.28, s * 0.3), 0.007, '#424242');
      part(bike, rbox(0.03, 0.07, 0.1, 0.02), '#212121', 0.5, 1.3, s * 0.3);
      label(bike, 'PRESS', 0.36, 0.1, -0.42, 0.58, s * 0.181, '#ffffff', '#0d47a1', s > 0 ? 0 : Math.PI);
      label(bike, '빛담 스튜디오', 0.36, 0.06, -0.42, 0.46, s * 0.181, c, '#ffffff', s > 0 ? 0 : Math.PI);
    }
    glass(bike, box(0.02, 0.28, 0.34), 0.62, 1.2, 0, undefined, 0);
    // A helmet hung on the left mirror.
    part(bike, ball(0.13), '#fafafa', 0.48, 1.12, 0.36).scale.set(1, 0.9, 1);
    part(bike, box(0.1, 0.05, 0.02), '#263238', 0.58, 1.12, 0.36, { ry: Math.PI / 2, outline: false });
    // Lights: the head lamp, the tail.
    const head = part(bike, rbox(0.04, 0.08, 0.14, 0.03), '#fffde7', 0.58, 0.85, 0, { rz: -0.18 });
    const headOn = glowing(bike, box(0.03, 0.07, 0.12), '#fffde7', 0.6, 0.85, 0);
    part(bike, rbox(0.03, 0.05, 0.14, 0.02), '#b71c1c', -0.78, 0.6, 0);
    const tailOn = glowing(bike, box(0.025, 0.045, 0.12), '#ff5252', -0.79, 0.6, 0);
    void head;
    // The rack and the top box.
    part(bike, rbox(0.34, 0.03, 0.3, 0.01), '#424242', -0.62, 0.83, 0);
    const boxG = new THREE.Group();
    boxG.position.set(-0.64, 0.85, 0);
    bike.add(boxG);
    part(boxG, rbox(0.4, 0.26, 0.38, 0.06), '#eceff1', 0, 0.13, 0);
    const lid = new THREE.Group();
    lid.position.set(-0.2, 0.26, 0);
    boxG.add(lid);
    part(lid, rbox(0.42, 0.06, 0.4, 0.05), '#eceff1', 0.2, 0.03, 0);
    label(boxG, 'PRESS', 0.28, 0.08, -0.201, 0.14, 0, '#0d47a1', '#ffffff', -Math.PI / 2);
    // The camera bag going in.
    const bag = new THREE.Group();
    boxG.add(bag);
    part(bag, rbox(0.26, 0.16, 0.2, 0.03), '#3e2723', 0, 0.28, 0);
    part(bag, box(0.2, 0.02, 0.02), '#5d4037', 0, 0.37, 0, { outline: false });
    // The plate.
    label(bike, '서울 마 2026', 0.22, 0.08, -0.8, 0.45, 0, '#ffffff', '#111111', -Math.PI / 2);
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const latch = marker(bike, -0.64, 1.0, 0.2);
    out.work = latch;
    out.spots = { '*': at(spot(g, 'stand', -0.6, 0, 0.62, Math.PI), latch, 'tinker') };
    // Off to a story: lights on, it pulls away and is gone; it rolls back into the bay after.
    let state: 'parked' | 'leaving' | 'gone' | 'back' | undefined;
    let since = 0;
    const RUN = 6;
    out.away = (isOut, t) => {
      if (state === undefined) state = isOut ? 'gone' : 'parked';
      else if (isOut && (state === 'parked' || state === 'back')) [state, since] = ['leaving', t];
      else if (!isOut && (state === 'leaving' || state === 'gone')) [state, since] = ['back', t];
      let x = 0;
      if (state === 'leaving') {
        const u = Math.min(1, (t - since) / 2.6);
        x = RUN * u * u;
        if (u >= 1) state = 'gone';
      } else if (state === 'back') {
        const u = Math.min(1, (t - since) / 3.5);
        x = RUN * (1 - u) * (1 - u);
        if (u >= 1) state = 'parked';
      }
      bike.position.x = x;
      // A lean into the pull away.
      bike.rotation.x = state === 'leaving' ? 0.05 * Math.sin(Math.min(1, (t - since) / 2.6) * Math.PI) : 0;
      bike.visible = state !== 'gone';
      const moving = state === 'leaving' || state === 'back';
      headOn.visible = tailOn.visible = moving;
      // Packing the kit in before it goes: the top box open, the bag going in.
      const packing = use.visible && state === 'parked';
      lid.rotation.z = packing ? 1.1 : 0;
      bag.visible = packing;
    };
  },

  // -------------------------------------------------------------------------------------------
  // What the studio was missing.

  /**
   * The posing stool (포즈 스툴): a walnut seat on a black gas column with its lever and foot ring, a
   * heavy round base, a gaffer-tape T on the floor in front for the sitter's feet. A client waits on
   * it and is shot there: the photographer steps round them with the camera — straight on, crouched
   * low to one side, in close turned upright for a portrait frame, checking the back screen between
   * — every frame popping the strobes; or stands nearer directing them, the camera down in the left
   * hand, the right showing chin up, a turn of the shoulder, the hand to the chin, thumbs up.
   */
  phPosingStool(g, _W, _D, c, _def, _ctx, out) {
    part(g, cyl(0.24, 0.26, 0.04, 28), c, 0, 0.02, 0);
    part(g, cyl(0.035, 0.04, 0.3, 12), BLACK, 0, 0.19, 0, { outline: false });
    part(g, cyl(0.03, 0.03, 0.1, 12), CHROME, 0, 0.36, 0, { outline: false });
    part(g, ring(0.18, 0.012), CHROME, 0, 0.2, 0, { rx: Math.PI / 2, outline: false });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      rod(g, new THREE.Vector3(0, 0.2, 0), new THREE.Vector3(Math.sin(a) * 0.18, 0.2, Math.cos(a) * 0.18), 0.008, CHROME);
    }
    part(g, cyl(0.2, 0.18, 0.06, 28), WALNUT, 0, 0.44, 0);
    part(g, cyl(0.19, 0.19, 0.01, 28), shade(WALNUT, 1.15), 0, 0.475, 0, { outline: false });
    part(g, box(0.1, 0.012, 0.02), BLACK, 0.12, 0.38, 0, { outline: false });
    out.seat = marker(g, 0, 0.48, 0);
    // The tape T on the floor.
    part(g, box(0.24, 0.002, 0.04), '#ffeb3b', 0, 0.002, 0.38, { outline: false, shadow: false });
    part(g, box(0.04, 0.002, 0.18), '#ffeb3b', 0, 0.002, 0.29, { outline: false, shadow: false });
    // The sitter's face (sat on it), the photographer's places.
    const face = marker(g, 0, 1.08, 0.04);
    const DIST = 1.7;
    const shooting = at(spot(g, 'stand', 0, 0, DIST, Math.PI), face, 'shootHand');
    const directing = at(spot(g, 'stand', 0.2, 0, 1.0, Math.PI + Math.atan2(0.2, 0.96)), face, 'direct');
    out.spots = { 'social:portraitShoot': shooting, 'social:directPose': directing };
    // The camera in the photographer's hands (handheldCamera's frame: the lens to +z).
    const hold = new THREE.Group();
    g.add(hold);
    const flip = new THREE.Group();
    flip.rotation.y = Math.PI;
    hold.add(flip);
    const cam = cameraBody(flip);
    cam.cap.visible = false;
    // The strap round to the neck while it's shot (a loop up from the lugs).
    part(hold, ring(0.08, 0.006, Math.PI), '#3e2723', 0, -0.005, 0.06, { rz: Math.PI, outline: false });
    hold.visible = false;
    const fwd = new THREE.Vector3();
    const left = new THREE.Vector3();
    const inv = new THREE.Quaternion();
    const qw = new THREE.Quaternion();
    out.animate = (t) => {
      const now = nowAt(out.spots!, t);
      const ph = toolPhase(face.getWorldPosition(tmp));
      if (now === 'social:portraitShoot') {
        const k = portraitRound(t, ph);
        // Stepped round to the angle, turned to the face.
        const x = -k.side;
        const z = DIST + k.back;
        shooting.at.position.set(x, 0, z);
        shooting.at.rotation.y = Math.atan2(-x, face.position.z - z);
        shooting.at.updateMatrixWorld();
        const h = (shooting.at.userData.height as number | undefined) ?? 1.6;
        const base = shooting.at.getWorldPosition(new THREE.Vector3());
        const dir = new THREE.Vector3(0, 0, 1).transformDirection(shooting.at.matrixWorld);
        const cw = handheldCamera(base, Math.atan2(dir.x, dir.z), h, k);
        g.updateMatrixWorld();
        hold.position.copy(g.worldToLocal(cw.at.clone()));
        g.getWorldQuaternion(inv).invert();
        hold.quaternion.copy(inv.multiply(qw.copy(cw.quat)));
        fire(k.last, t);
        const since = t - k.last;
        cam.set(k.press, since >= 0 && since < 0.15, k.chimp > 0.3);
        hold.visible = true;
      } else if (now === 'social:directPose') {
        const h = (directing.at.userData.height as number | undefined) ?? 1.6;
        const s = h / 1.6;
        const base = directing.at.getWorldPosition(new THREE.Vector3());
        fwd.set(0, 0, 1).transformDirection(directing.at.matrixWorld);
        left.set(fwd.z, 0, -fwd.x);
        const hand = base.addScaledVector(fwd, DIRECT_CAM.ahead * s).addScaledVector(left, DIRECT_CAM.side * s).setY(base.y + DIRECT_CAM.up * h);
        g.updateMatrixWorld();
        // Hanging from the hand by its grip, the lens down.
        hold.position.copy(g.worldToLocal(hand.add(new THREE.Vector3(0, -0.05, 0))));
        g.getWorldQuaternion(inv).invert();
        qw.setFromEuler(new THREE.Euler(1.35, Math.atan2(fwd.x, fwd.z), 0, 'YXZ'));
        hold.quaternion.copy(inv.multiply(qw));
        cam.set(0, false, false);
        hold.visible = true;
      } else hold.visible = false;
    };
    out.away = (_o, t) => {
      if (hold.visible && t - Math.max(posedAt(shooting), posedAt(directing)) > 0.5) hold.visible = false;
    };
  },

  /**
   * A product-shot table (제품 촬영 테이블): a steel frame on castors carrying a milky acrylic sweep that
   * curves up at the back (lit from below in use), on it a perfume bottle with a gold cap, a cream jar
   * and a lipstick on a mirror riser, a sprig of dried flowers; two LED panels on arms clamped to the
   * back corners, a white bounce card; its own tripod angled in from the front corner with the camera
   * tipped down at the products. Styled stood at the front, moving the bottles; shot through the
   * tripod's camera.
   */
  phProductTable(g, W, D, c, _def, _ctx, out) {
    const top = 0.78;
    const px = -0.15;
    // Frame, castors, a lower shelf with spare products.
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        part(g, box(0.035, top - 0.08, 0.035), '#78909c', sx * (W / 2 - 0.12), (top - 0.08) / 2 + 0.06, sz * (D / 2 - 0.12));
        part(g, cyl(0.03, 0.03, 0.025, 10), RUBBER, sx * (W / 2 - 0.12), 0.03, sz * (D / 2 - 0.12), { rz: Math.PI / 2 });
      }
    part(g, rbox(W - 0.2, 0.03, D - 0.2, 0.01), '#90a4ae', 0, 0.22, 0);
    for (let i = 0; i < 4; i++) part(g, rbox(0.12, 0.08, 0.1, 0.02), ['#f8bbd0', '#b2dfdb', '#fff9c4', '#d1c4e9'][i], -0.6 + i * 0.35, 0.275, 0.05);
    part(g, rbox(W - 0.16, 0.04, D - 0.16, 0.01), shade(c, 0.85), 0, top - 0.02, 0);
    // The acrylic sweep: flat, then curving up at the back.
    const sw = W - 0.3;
    const ACRYL = '#f5f8fa';
    part(g, box(sw, 0.012, 0.5), ACRYL, 0, top + 0.006, 0.07, { outline: false });
    const R = 0.22;
    for (let i = 0; i < 5; i++) {
      const a = ((i + 0.5) / 5) * (Math.PI / 2);
      part(g, box(sw, R * (Math.PI / 10) + 0.004, 0.012), ACRYL, 0, top + R - R * Math.cos(a), -0.18 - R * Math.sin(a), { rx: -a, outline: false });
    }
    part(g, box(sw, 0.42, 0.012), ACRYL, 0, top + R + 0.21, -0.18 - R, { outline: false });
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    glowing(use, box(sw - 0.04, 0.004, 0.46), '#ffffff', 0, top + 0.002, 0.07);
    // The products on their riser.
    part(g, rbox(0.22, 0.03, 0.14, 0.006), '#e0f7fa', px, top + 0.027, -0.02);
    part(g, box(0.21, 0.002, 0.13), '#cfe8ef', px, top + 0.043, -0.02, { outline: false });
    const bottle = new THREE.Group();
    bottle.position.set(px - 0.04, top + 0.044, -0.03);
    g.add(bottle);
    glass(bottle, rbox(0.07, 0.1, 0.045, 0.012), 0, 0.05, 0);
    part(bottle, rbox(0.055, 0.075, 0.03, 0.01), '#f8bbd0', 0, 0.045, 0, { outline: false });
    part(bottle, cyl(0.018, 0.018, 0.035, 12), GOLD, 0, 0.12, 0);
    part(g, cyl(0.04, 0.04, 0.045, 18), '#ffffff', px + 0.07, top + 0.066, 0.0);
    part(g, cyl(0.041, 0.041, 0.015, 18), GOLD, px + 0.07, top + 0.096, 0.0, { outline: false });
    part(g, cyl(0.011, 0.011, 0.08, 10), '#212121', px + 0.15, top + 0.05, 0.06, { rz: Math.PI / 2, outline: false });
    part(g, cyl(0.009, 0.009, 0.03, 10), '#c62828', px + 0.205, top + 0.05, 0.06, { rz: Math.PI / 2, outline: false });
    for (let i = 0; i < 4; i++) rod(g, new THREE.Vector3(px - 0.2, top + 0.013, 0.12), new THREE.Vector3(px - 0.28 + i * 0.03, top + 0.03, 0.03 - i * 0.02), 0.003, '#a1887f');
    for (let i = 0; i < 4; i++) part(g, ball(0.012), '#e6c27a', px - 0.28 + i * 0.03, top + 0.032, 0.03 - i * 0.02, { outline: false });
    // The LED panels on their arms, the bounce card.
    for (const sx of [-1, 1]) {
      const x = sx * (W / 2 - 0.2);
      part(g, rbox(0.05, 0.05, 0.05, 0.01), BLACK, x, top + 0.02, -0.3);
      rod(g, new THREE.Vector3(x, top + 0.04, -0.3), new THREE.Vector3(x - sx * 0.05, top + 0.5, -0.15), 0.012, '#37474f');
      const panel = new THREE.Group();
      panel.position.set(x - sx * 0.07, top + 0.56, -0.1);
      panel.rotation.set(-0.7, -sx * 0.6, 0);
      g.add(panel);
      part(panel, rbox(0.26, 0.18, 0.03, 0.01), '#263238', 0, 0, 0);
      part(panel, box(0.23, 0.15, 0.004), '#cfd8dc', 0, 0, 0.016, { outline: false });
      // Its face lit while the table's in use.
      const lit = new THREE.Group();
      lit.position.copy(panel.position);
      lit.rotation.copy(panel.rotation);
      use.add(lit);
      glowing(lit, box(0.23, 0.15, 0.004), '#fffdf0', 0, 0, 0.018);
    }
    part(g, box(0.26, 0.2, 0.006), '#ffffff', W / 2 - 0.3, top + 0.12, 0.1, { ry: -1.1, rx: 0.05 });
    label(g, '제품 촬영', 0.3, 0.07, W / 2 - 0.35, top - 0.03, D / 2 - 0.075, '#455a64', '#ffffff');
    // Its own tripod in from the front-left corner, the camera tipped down at the bottle.
    const tg = new THREE.Group();
    const from = new THREE.Vector3(-W / 2 + 0.2, 0, D / 2 + 0.05);
    tg.position.copy(from);
    tg.rotation.y = Math.atan2(-(px - from.x), -(0 - from.z));
    g.add(tg);
    const tri = tripodCamera(tg, 0.55);
    const prod = marker(g, px, top + 0.08, -0.02);
    out.work = prod;
    out.spots = {
      '*': at(spot(g, 'stand', px + 0.1, 0, D / 2 + 0.06, Math.PI), prod, 'tinker'),
      shootProducts: at(tri.spot, tri.eyecup, 'shoot'),
    };
    const shooting = tri.spot;
    let was = false;
    out.animate = (t) => {
      const on = Math.abs(t - posedAt(shooting)) < 0.6;
      tri.update(t, on);
      was = on;
      bottle.rotation.y = on ? 0 : 0.25 * Math.sin(t * 0.7);
    };
    out.away = (_o, t) => {
      if (was && !use.visible) {
        tri.update(t, false);
        was = false;
      }
    };
  },

  /**
   * A reflector on its stand (반사판): a light stand with a boom clamp holding a round five-in-one
   * reflector in its sprung rim, silver face to the sitter, the gold side behind. Angled stood at its
   * side, a hand on the rim tipping it while it rocks a little to the light.
   */
  phReflector(g, _W, _D, _c, _def, _ctx, out) {
    lightStand(g, 0, -0.05, 1.05, 0.24);
    const holder = new THREE.Group();
    holder.position.set(0, 1.08, -0.05);
    // Turned to the posing stool (two tiles off to its left front, as laid out).
    holder.rotation.y = Math.atan2(-1, 2);
    g.add(holder);
    part(holder, rbox(0.06, 0.06, 0.06, 0.015), BLACK, 0, 0, 0);
    const disc = new THREE.Group();
    disc.position.set(0, 0.06, 0.04);
    holder.add(disc);
    part(disc, cyl(0.42, 0.42, 0.012, 36), GOLD, 0, 0, -0.006, { rx: Math.PI / 2 });
    part(disc, cyl(0.41, 0.41, 0.004, 36), '#e3e7ea', 0, 0, 0.002, { rx: Math.PI / 2, outline: false });
    const sheen = glowing(disc, cyl(0.33, 0.33, 0.002, 30), '#fbfcfd', 0, 0.04, 0.005, Math.PI / 2);
    sheen.scale.set(1, 1, 0.7);
    part(disc, ring(0.42, 0.012), '#212121', 0, 0, 0, { outline: false });
    part(disc, box(0.04, 0.12, 0.03), BLACK, 0, -0.42, -0.01);
    const rim = marker(disc, 0.38, 0.0, 0.0);
    out.work = rim;
    out.spots = { '*': at(spot(g, 'stand', 0.6, 0, 0.1, -Math.PI / 2), rim, 'tinker') };
    out.animate = (t) => {
      disc.rotation.x = 0.12 * Math.sin(t * 0.9);
      disc.rotation.y = 0.1 * Math.sin(t * 0.6 + 1);
    };
    out.away = (_o) => {
      if (!out.inUse || !out.inUse.visible) disc.rotation.set(0, 0, 0);
    };
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
  },

  /**
   * The props shelf (촬영 소품): an open walnut unit of four shelves — gold LOVE balloons, hat boxes and
   * a straw hat on top; a first-birthday 색동 hanbok on a little hanger with flower crowns beside it;
   * a teddy bear, wooden letter blocks, a vintage film camera and a little chalkboard for the date;
   * baskets and a folded blanket at the bottom — a bouquet hung on the side. Rummaged through stood at
   * it.
   */
  phPropShelf(g, W, D, _c, _def, _ctx, out) {
    const d = 0.42;
    const z0 = -D / 2 + d / 2 + 0.02;
    const w = W - 0.12;
    const H = 1.85;
    for (const sx of [-1, 1]) part(g, rbox(0.04, H, d, 0.01), WALNUT, sx * (w / 2), H / 2, z0);
    part(g, box(w, H, 0.02), shade(WALNUT, 0.8), 0, H / 2, z0 - d / 2 + 0.01);
    const shelves = [0.06, 0.5, 0.94, 1.38, H];
    for (const y of shelves) part(g, rbox(w, 0.03, d, 0.008), WALNUT, 0, y, z0);
    const zf = z0 + 0.04;
    // Bottom: baskets and a blanket.
    for (const x of [-0.6, -0.15]) {
      part(g, cyl(0.17, 0.15, 0.24, 16), '#c49a6c', x, 0.2, zf);
      for (let i = 0; i < 4; i++) part(g, cyl(0.172, 0.172, 0.01, 16), '#a47c50', x, 0.12 + i * 0.05, zf, { outline: false });
    }
    for (let i = 0; i < 3; i++) part(g, rbox(0.4, 0.07, 0.3, 0.03), ['#f5e6d3', '#d7ccc8', '#f8bbd0'][i], 0.42, 0.115 + i * 0.07, zf);
    // Third shelf: a teddy, letter blocks, an old film camera, a chalkboard.
    const y2 = 0.515;
    part(g, ball(0.11), '#a1887f', -0.62, y2 + 0.11, zf);
    part(g, ball(0.08), '#a1887f', -0.62, y2 + 0.27, zf);
    for (const sx of [-1, 1]) part(g, ball(0.035), '#a1887f', -0.62 + sx * 0.06, y2 + 0.34, zf);
    part(g, ball(0.03), '#d7ccc8', -0.62, y2 + 0.25, zf + 0.07);
    'BABY'.split('').forEach((ch, i) => {
      part(g, box(0.08, 0.08, 0.08), ['#ef9a9a', '#90caf9', '#a5d6a7', '#fff59d'][i], -0.35 + i * 0.09, y2 + 0.04, zf + 0.05, { ry: (i - 1.5) * 0.15 });
      label(g, ch, 0.06, 0.06, -0.35 + i * 0.09, y2 + 0.04, zf + 0.092, '#ffffff', '#455a64');
    });
    part(g, rbox(0.16, 0.1, 0.07, 0.01), '#212121', 0.08, y2 + 0.065, zf);
    part(g, rbox(0.15, 0.025, 0.068, 0.006), '#bdbdbd', 0.08, y2 + 0.12, zf);
    part(g, cyl(0.035, 0.035, 0.06, 16), '#111111', 0.08, y2 + 0.06, zf + 0.06, { rx: Math.PI / 2 });
    const board = label(g, '첫 생일 축하해', 0.3, 0.2, 0.48, y2 + 0.13, zf - 0.02, '#263238', '#ffffff');
    board.rotation.x = -0.12;
    part(g, rbox(0.33, 0.23, 0.02, 0.006), '#8d6e63', 0.48, y2 + 0.13, zf - 0.035, { rx: -0.12 });
    // Second shelf from the top: a 색동 hanbok on its hanger, flower crowns, baby shoes.
    const y3 = 0.955;
    rod(g, new THREE.Vector3(-0.72, y3 + 0.38, zf), new THREE.Vector3(-0.28, y3 + 0.38, zf), 0.006, CHROME);
    const bands = ['#e53935', '#fdd835', '#43a047', '#1e88e5', '#8e24aa'];
    part(g, rbox(0.2, 0.22, 0.06, 0.02), '#fce4ec', -0.5, y3 + 0.22, zf);
    for (const sx of [-1, 1]) bands.forEach((k, i) => part(g, box(0.07, 0.032, 0.055), k, -0.5 + sx * 0.14, y3 + 0.29 - i * 0.032, zf, { outline: false }));
    part(g, rbox(0.22, 0.16, 0.06, 0.03), '#e53935', -0.5, y3 + 0.07, zf);
    for (const [x, k] of [[-0.05, '#f48fb1'], [0.2, '#fff59d']] as const) {
      part(g, ring(0.08, 0.012), '#8bc34a', x, y3 + 0.03, zf, { rx: Math.PI / 2, outline: false });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        part(g, ball(0.022), i % 2 ? k : '#ffffff', x + Math.sin(a) * 0.08, y3 + 0.045, zf + Math.cos(a) * 0.08, { outline: false });
      }
    }
    for (const sx of [-1, 1]) part(g, rbox(0.05, 0.035, 0.09, 0.015), '#f8bbd0', 0.52 + sx * 0.035, y3 + 0.03, zf);
    // Top shelf: LOVE balloons, hat boxes, a straw hat.
    const y4 = 1.395;
    'LOVE'.split('').forEach((ch, i) => label(g, ch, 0.17, 0.24, -0.62 + i * 0.16, y4 + 0.14, zf + 0.02 + (i % 2) * 0.03, '#d4af37', '#fff8e1'));
    for (let i = 0; i < 3; i++) part(g, cyl(0.15 - i * 0.025, 0.15 - i * 0.025, 0.11, 20), ['#f8bbd0', '#ffffff', '#b2dfdb'][i], 0.15, y4 + 0.07 + i * 0.11, zf);
    part(g, cyl(0.2, 0.2, 0.012, 22), '#e6c27a', 0.55, y4 + 0.03, zf);
    part(g, cyl(0.09, 0.1, 0.09, 18), '#e6c27a', 0.55, y4 + 0.08, zf);
    part(g, cyl(0.1, 0.1, 0.02, 18), '#5d4037', 0.55, y4 + 0.06, zf, { outline: false });
    // A bouquet hung on the side.
    const bx = W / 2 - 0.02;
    part(g, cyl(0.025, 0.012, 0.22, 10), '#7cb342', bx + 0.03, 1.15, z0 + 0.12, { outline: false });
    for (let i = 0; i < 7; i++) part(g, ball(0.04), i % 2 ? '#ffffff' : '#f8bbd0', bx + 0.03 + Math.sin(i) * 0.05, 1.28 + Math.cos(i * 1.7) * 0.03, z0 + 0.12 + Math.cos(i) * 0.05, { outline: false });
    const work = marker(g, -0.2, 1.05, zf + 0.06);
    out.work = work;
    out.spots = { '*': at(spot(g, 'stand', -0.2, 0, D / 2 + 0.12, Math.PI), work, 'rummage') };
  },

  /**
   * The client monitor in the lobby (셀렉 모니터): a 65-inch screen on a floor stand showing the
   * session's shots in a grid, the picked ones hearted and a count of how many, a white console under
   * it with an album and a candle; a standing laptop cart at its right where the photographer drives
   * the selection, typed at stood beside the clients' chairs.
   */
  phSelectMonitor(g, W, D, _c, _def, _ctx, out) {
    const z0 = -D / 2 + 0.2;
    // The console.
    part(g, rbox(1.3, 0.42, 0.34, 0.03), '#f5f3ef', -0.15, 0.21, z0 + 0.02);
    for (const x of [-0.5, 0.2]) part(g, box(0.3, 0.004, 0.004), '#c9c4bb', -0.15 + x * 0.6, 0.3, z0 + 0.192, { outline: false });
    part(g, rbox(0.28, 0.04, 0.22, 0.01), WALNUT, -0.55, 0.44, z0 + 0.02);
    part(g, rbox(0.26, 0.012, 0.2, 0.005), '#fafafa', -0.55, 0.466, z0 + 0.02, { outline: false });
    part(g, cyl(0.05, 0.05, 0.08, 14), '#fff8e1', 0.2, 0.46, z0 + 0.05);
    glowing(g, ball(0.012), '#ffcc80', 0.2, 0.515, z0 + 0.05);
    // The screen on its stand.
    part(g, rbox(0.08, 1.1, 0.05, 0.01), '#37474f', -0.15, 0.55 + 0.45, z0 - 0.08);
    part(g, rbox(1.5, 0.88, 0.06, 0.02), '#15171a', -0.15, 1.36, z0 - 0.04);
    out.screen = litScreen(g, painted('ph-select', 512, 288, paintSelect), 1.44, 0.81, -0.15, 1.36, z0 - 0.002);
    // The laptop cart at the right.
    const cx = W / 2 - 0.22;
    const cz = 0.1;
    part(g, cyl(0.2, 0.2, 0.03, 20), '#37474f', cx, 0.03, cz);
    part(g, cyl(0.025, 0.025, 0.95, 10), CHROME, cx, 0.5, cz, { outline: false });
    part(g, rbox(0.42, 0.025, 0.32, 0.01), '#37474f', cx, 0.97, cz);
    part(g, rbox(0.34, 0.012, 0.23, 0.006), '#cfd8dc', cx, 0.99, cz + 0.03);
    const lid = new THREE.Group();
    lid.position.set(cx, 0.995, cz - 0.08);
    lid.rotation.x = -0.25;
    g.add(lid);
    part(lid, rbox(0.34, 0.22, 0.012, 0.006), '#cfd8dc', 0, 0.11, 0);
    picture(lid, painted('ph-select', 512, 288, paintSelect), 0.31, 0.18, 0, 0.115, 0.007);
    const keys = marker(g, cx, 1.0, cz + 0.06);
    out.work = keys;
    out.spots = { '*': at(spot(g, 'stand', cx, 0, cz + 0.52, Math.PI), keys, 'type') };
  },

  /**
   * The sample wall (액자 샘플): a dark walnut panel standing at the wall with the studio's samples in
   * their frames — a big 가족사진 in gold, a wedding portrait, a 돌사진, a profile in black, two small
   * ones — lit by a track of three spots along its top, the price list framed at its right, and a
   * ledge with sample albums open.
   */
  phSampleWall(g, W, D, _c, _def, _ctx, out) {
    const z0 = -D / 2 + 0.06;
    part(g, rbox(W - 0.04, 2.2, 0.06, 0.01), '#3e2723', 0, 1.1, z0);
    part(g, rbox(W - 0.02, 0.06, 0.1, 0.01), '#2b1d18', 0, 2.22, z0 + 0.02);
    const zf = z0 + 0.05;
    frame(g, 'family', 0.86, 0.68, -0.38, 1.5, zf, GOLD);
    frame(g, 'wedding', 0.42, 0.56, 0.36, 1.62, zf, '#f5f5f5');
    frame(g, 'baby', 0.36, 0.46, -0.56, 0.86, zf, '#d7b98e');
    frame(g, 'profile', 0.3, 0.4, -0.16, 0.86, zf, '#111111');
    frame(g, 'pink', 0.22, 0.28, 0.14, 0.92, zf, '#ffffff');
    picture(g, painted('ph-prices', 256, 320, paintPrices), 0.34, 0.44, 0.66, 0.98, zf);
    part(g, rbox(0.38, 0.48, 0.02, 0.008), GOLD, 0.66, 0.98, zf - 0.012);
    // The ledge and the open albums on it.
    part(g, rbox(W - 0.2, 0.03, 0.2, 0.008), '#2b1d18', 0, 0.5, z0 + 0.12);
    for (const x of [-0.45, 0.15]) {
      part(g, rbox(0.42, 0.02, 0.17, 0.005), '#fafafa', x, 0.525, z0 + 0.12, { rx: -0.15 });
      picture(g, shot(x < 0 ? 'wedding' : 'family'), 0.16, 0.13, x - 0.1, 0.54, z0 + 0.13, '#ffffff', 0, -Math.PI / 2 + 0.15);
      picture(g, shot(x < 0 ? 'pink' : 'baby'), 0.16, 0.13, x + 0.1, 0.54, z0 + 0.13, '#ffffff', 0, -Math.PI / 2 + 0.15);
    }
    // The spot track and its three lamps.
    part(g, box(W - 0.3, 0.03, 0.03), '#212121', 0, 2.36, z0 + 0.2);
    for (const x of [-0.6, 0, 0.6]) {
      part(g, cyl(0.035, 0.03, 0.1, 12), '#212121', x, 2.3, z0 + 0.22, { rx: -0.6 });
      glowing(g, cyl(0.026, 0.026, 0.004, 12), '#fff3c4', x, 2.27, z0 + 0.25, -0.6 + Math.PI / 2);
    }
    void out;
  },

  /**
   * The front counter (상담 카운터, 2026-11-05, the layout audit): where a sitting is booked and paid for, a walnut counter with the
   * booking book, the card reader and a few sample frames on it, the price list on its face.
   */
  phCounter(g, W) {
    const w = W - 0.1;
    part(g, rbox(w, 1.0, 0.5, 0.02), '#4e342e', 0, 0.5, -0.05);
    part(g, rbox(w + 0.04, 0.04, 0.56, 0.01), '#f5f0e6', 0, 1.02, -0.05);
    picture(g, painted('ph-prices', 256, 320, paintPrices), 0.3, 0.38, -w / 4, 0.55, 0.202);
    label(g, '촬영 예약 · 상담', 0.5, 0.08, w / 6, 0.8, 0.202, '#4e342e', '#f5f0e6');
    part(g, box(0.32, 0.03, 0.24), '#1a237e', -0.3, 1.055, -0.05);
    part(g, box(0.1, 0.03, 0.16), '#212121', 0.15, 1.055, -0.08);
    frame(g, 'baby', 0.2, 0.26, 0.45, 1.2, -0.2, '#d7b98e');
  },

  /** The studio's glass front on the street (2026-11-05, the layout audit; shopFront.ts): the counter and the samples seen through it. */
  phShopFront(g) {
    shopFront(g, { ax: 1, x0: 2, x1: 14, door: 12, name: '도윤 사진관', sub: '증명 · 프로필 · 가족사진', bg: '#212121', fg: '#fff3c4', awning: '#424242', frame: '#212121', posters: [['여권·증명사진 즉시', '#fff3c4', '#212121', 4.5], ['가족사진 예약 할인', '#ffffff', '#4e342e', 8.5]] });
  },
};
