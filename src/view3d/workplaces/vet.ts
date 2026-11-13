import * as THREE from 'three';
import type { Motion } from '../activity';
import { marker, rod, shade, spot, tint, type Builder, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, STEEL, WATER, caster, dripBag, glass, glowing, label, litScreen, painted, paintVitals, picture, ring, seeded, text, waves, type Paint } from './doctor';
import type { Built } from '../parts';

/**
 * The animal hospital drawn as itself (2026-10-27 workplace pipeline, at the user's request): the
 * exam table with its built-in scale and the patient sat on it, the bank of in-patient kennels (a
 * dog in its cone below, a cat curled up above), and what the 동물병원 was missing
 * (workFurniture/vet.ts) — its own operating table with the anaesthesia machine at the head, an X-ray
 * table, a bathing tub, the prescription-diet shelf, a walk-on scale and the vaccination chart. The
 * desk, the medicine cabinet are the hospital's (workplaces/doctor.ts).
 */

const RUBBER = '#2e5e57';
const FOAM = '#4fa3d1';

// ---------------------------------------------------------------------------------------------
// The patients.

type DogPose = 'stand' | 'sit' | 'lie' | 'side';

/**
 * A small dog (about 0.55 m nose to tail) facing +z, its feet at the origin: standing, sat up, lying
 * down with its head on its paws, or laid out on its side (legs out to +x, as on an X-ray table).
 * `cone`: wearing the cone of shame.
 */
function pup(g: THREE.Object3D, x: number, y: number, z: number, color: string, pose: DogPose, ry = 0, cone = false): THREE.Group {
  const outer = new THREE.Group();
  outer.position.set(x, y, z);
  outer.rotation.y = ry;
  g.add(outer);
  let d: THREE.Object3D = outer;
  if (pose === 'side') {
    // The standing dog turned over onto its side, its back towards -x.
    const inner = new THREE.Group();
    inner.position.set(0, 0.11, 0);
    inner.rotation.z = Math.PI / 2;
    outer.add(inner);
    const body = new THREE.Group();
    body.position.set(0, -0.3, 0);
    inner.add(body);
    d = body;
  }
  const dark = shade(color, 0.72);
  const light = tint(color, 0.35);
  const stood = pose === 'stand' || pose === 'side';
  const ear = (hy: number, hz: number) => {
    for (const sx of [-1, 1]) part(d, ball(0.042), dark, sx * 0.07, hy - 0.005, hz - 0.015, { rz: sx * 0.35 }).scale.set(0.55, 1.25, 0.85);
  };
  const face = (hy: number, hz: number, nod = 0) => {
    part(d, ball(0.085), color, 0, hy, hz);
    part(d, ball(0.045), light, 0, hy - 0.02 - nod, hz + 0.075).scale.set(0.95, 0.8, 1.25);
    part(d, ball(0.017), BLACK, 0, hy - 0.005 - nod, hz + 0.128, { outline: false });
    for (const sx of [-1, 1]) part(d, ball(0.012), BLACK, sx * 0.036, hy + 0.025, hz + 0.068, { outline: false });
    ear(hy, hz);
    if (cone) {
      // Its own open cone (seen through from inside too), narrow round the neck, wide past the nose.
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.13, 0.15, 18, 1, true), new THREE.MeshToonMaterial({ color: '#e3f2fd', transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
      c.userData.ownGeometry = c.userData.ownMaterial = true;
      c.position.set(0, hy, hz + 0.03);
      c.rotation.x = Math.PI / 2;
      d.add(c);
    }
  };
  if (stood) {
    part(d, ball(0.12), color, 0, 0.3, -0.02).scale.set(1, 0.85, 1.55);
    part(d, ball(0.09), light, 0, 0.27, 0.1).scale.set(0.9, 1, 0.8);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        part(d, cyl(0.028, 0.024, 0.24, 8), sz > 0 ? color : dark, sx * 0.06, 0.12, sz * 0.12 - 0.02);
        part(d, ball(0.03), light, sx * 0.06, 0.015, sz * 0.12 + 0.0).scale.set(1, 0.6, 1.3);
      }
    part(d, cyl(0.045, 0.06, 0.12, 10), color, 0, 0.4, 0.15, { rx: 0.6 });
    face(0.47, 0.21);
    rod(d, new THREE.Vector3(0, 0.36, -0.2), new THREE.Vector3(0, 0.48, -0.3), 0.017, color);
  } else if (pose === 'sit') {
    part(d, ball(0.12), color, 0, 0.11, -0.06).scale.set(1.05, 0.85, 1.05);
    part(d, ball(0.1), color, 0, 0.24, 0.02).scale.set(0.95, 1.35, 0.95);
    part(d, ball(0.075), light, 0, 0.25, 0.08).scale.set(0.9, 1.2, 0.6);
    for (const sx of [-1, 1]) {
      part(d, cyl(0.026, 0.024, 0.2, 8), color, sx * 0.05, 0.1, 0.09);
      part(d, ball(0.03), light, sx * 0.05, 0.014, 0.11).scale.set(1, 0.6, 1.3);
      part(d, ball(0.055), dark, sx * 0.09, 0.07, -0.05).scale.set(0.7, 0.9, 1.4);
    }
    face(0.42, 0.06);
    rod(d, new THREE.Vector3(0.02, 0.03, -0.16), new THREE.Vector3(0.16, 0.02, -0.1), 0.017, color);
  } else {
    part(d, ball(0.13), color, 0, 0.1, -0.06).scale.set(1, 0.72, 1.5);
    for (const sx of [-1, 1]) part(d, ball(0.035), light, sx * 0.05, 0.03, 0.22).scale.set(0.9, 0.6, 1.6);
    face(0.13, 0.2, 0.01);
    part(d, cyl(0.02, 0.012, 0.18, 6), color, 0.06, 0.05, -0.3, { rx: -1.4, rz: 0.4 });
  }
  return outer;
}

/** A cat curled up asleep, its tail round it, about 0.4 m across. */
function kitty(g: THREE.Object3D, x: number, y: number, z: number, color: string, ry = 0, stripes = true) {
  const k = new THREE.Group();
  k.position.set(x, y, z);
  k.rotation.y = ry;
  g.add(k);
  const dark = shade(color, 0.7);
  part(k, ball(0.11), color, 0, 0.07, 0).scale.set(1.25, 0.62, 1.1);
  if (stripes) for (let i = 0; i < 4; i++) part(k, box(0.018, 0.02, 0.2), dark, -0.08 + i * 0.05, 0.135, -0.01, { outline: false, rz: (i - 1.5) * 0.15 });
  part(k, ball(0.068), color, 0.08, 0.09, 0.08);
  part(k, ball(0.032), tint(color, 0.4), 0.1, 0.075, 0.135).scale.set(1, 0.75, 0.8);
  for (const sx of [-1, 1]) {
    part(k, cyl(0.001, 0.028, 0.055, 4), color, 0.08 + sx * 0.04, 0.155, 0.075, { rz: -sx * 0.25 });
    part(k, box(0.024, 0.004, 0.004), BLACK, 0.08 + sx * 0.026, 0.1, 0.138, { outline: false });
  }
  part(k, ring(0.12, 0.022, Math.PI * 1.1), dark, -0.01, 0.03, 0.01, { rx: Math.PI / 2, rz: 0.5 });
}

/** A spot stood in front of something, facing it, the hands at `work`, doing `motion`. */
function stoodAt(g: THREE.Object3D, x: number, z: number, work: THREE.Object3D, motion: Motion, yaw = Math.PI): Spot {
  const s = spot(g, 'stand', x, 0, z, yaw);
  s.work = work;
  s.motion = motion;
  return s;
}
/** A group in `parent` standing where `like` stands (for the parts of something shown only in use). */
function alongside(parent: THREE.Object3D, like: THREE.Object3D): THREE.Group {
  const m = new THREE.Group();
  m.position.copy(like.position);
  m.rotation.copy(like.rotation);
  parent.add(m);
  return m;
}
/** A stack of folded towels. */
function towels(g: THREE.Object3D, x: number, y: number, z: number, colors: string[]) {
  colors.forEach((k, i) => {
    part(g, rbox(0.3, 0.05, 0.22, 0.02), k, x, y + 0.025 + i * 0.052, z, { ry: (i % 2 ? 0.06 : -0.04) });
    part(g, box(0.3, 0.008, 0.012), tint(k, 0.4), x, y + 0.03 + i * 0.052, z + 0.112, { outline: false });
  });
}
/** A sheet of paper on a clipboard. */
function clipboard(g: THREE.Object3D, x: number, y: number, z: number, ry = 0, rx = 0) {
  const c = new THREE.Group();
  c.position.set(x, y, z);
  c.rotation.set(rx, ry, 0);
  g.add(c);
  part(c, rbox(0.17, 0.23, 0.01, 0.005), '#8d6e63', 0, 0, 0);
  part(c, box(0.15, 0.19, 0.003), '#ffffff', 0, -0.01, 0.006, { outline: false });
  for (let i = 0; i < 6; i++) part(c, box(i % 3 ? 0.1 : 0.12, 0.005, 0.002), '#90a4ae', -0.005, 0.05 - i * 0.026, 0.009, { outline: false });
  part(c, rbox(0.06, 0.02, 0.016, 0.005), CHROME, 0, 0.11, 0.006);
  return c;
}

// ---------------------------------------------------------------------------------------------
// What's painted on the screens and the signs.

/** A dog's chest, from the side, on the X-ray console. */
const paintPetXray: Paint = (c) => {
  c.fillStyle = '#05080a';
  c.fillRect(0, 0, 384, 256);
  const bone = (a: number) => `rgba(232,236,232,${a})`;
  // The soft tissue's outline, the heart's shadow, the lungs dark.
  c.fillStyle = 'rgba(120,130,135,0.35)';
  c.beginPath();
  c.ellipse(190, 132, 150, 78, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = 'rgba(20,24,28,0.8)';
  c.beginPath();
  c.ellipse(170, 120, 92, 50, -0.05, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = 'rgba(190,195,195,0.55)';
  c.beginPath();
  c.ellipse(150, 142, 38, 32, 0.4, 0, Math.PI * 2);
  c.fill();
  // The spine along the top, vertebra by vertebra; the ribs curving down from it.
  c.fillStyle = bone(0.85);
  for (let i = 0; i < 16; i++) {
    const x = 40 + i * 19;
    const y = 62 + Math.sin(i * 0.22) * 6;
    c.fillRect(x, y, 15, 11);
    if (i < 11) {
      c.strokeStyle = bone(0.6);
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(x + 8, y + 10);
      c.quadraticCurveTo(x + 2 - i, y + 70, x + 18 - i * 2, y + 128 - i * 4);
      c.stroke();
    }
  }
  // The sternum, a shoulder blade, the upper foreleg.
  c.fillStyle = bone(0.7);
  for (let i = 0; i < 6; i++) c.fillRect(60 + i * 22, 196 - i * 2, 16, 8);
  c.fillStyle = bone(0.5);
  c.beginPath();
  c.ellipse(64, 108, 22, 48, 0.5, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = bone(0.9);
  c.fillRect(40, 140, 12, 100);
  // The markers and the patient's line.
  c.fillStyle = '#ffffff';
  c.font = 'bold 18px sans-serif';
  c.fillText('R', 350, 30);
  text(c, '콩이 · 6.2kg · LAT', 12, 18, 15, '#cfd8dc', 'left', false);
  text(c, '흉부 측면', 12, 238, 14, '#80cbc4', 'left', false);
};

/** The scale's readout: the weight, settled. */
const paintWeight: Paint = (c) => {
  c.fillStyle = '#082418';
  c.fillRect(0, 0, 192, 96);
  text(c, '12.4', 128, 50, 54, '#69f0ae', 'right');
  text(c, 'kg', 140, 60, 24, '#69f0ae');
  text(c, 'STABLE', 14, 16, 13, '#2e7d5b');
};

/** The exam table's scale display along its front. */
const paintTableWeight: Paint = (c) => {
  c.fillStyle = '#082418';
  c.fillRect(0, 0, 128, 48);
  text(c, '6.2 kg', 64, 25, 28, '#69f0ae', 'center');
};

/** The in-patient's card on its kennel door. */
const paintKennelCard = (name: string, kind: string, note: string, color: string): Paint => (c) => {
  c.fillStyle = '#fffde7';
  c.fillRect(0, 0, 160, 112);
  c.fillStyle = color;
  c.fillRect(0, 0, 160, 26);
  text(c, '입원', 10, 14, 16, '#ffffff');
  text(c, kind, 150, 14, 15, '#ffffff', 'right');
  text(c, name, 10, 46, 22, '#3e2723');
  text(c, note, 10, 76, 14, '#5d4037', 'left', false);
  text(c, '산책 금지 · 간식 금지', 10, 98, 13, '#c62828', 'left', false);
};

/** A dog's health check, pinned up over the exam table. */
const paintDogPoster: Paint = (c) => {
  c.fillStyle = '#f1f8e9';
  c.fillRect(0, 0, 256, 320);
  c.fillStyle = '#7cb342';
  c.fillRect(0, 0, 256, 48);
  text(c, '반려견 건강 체크', 128, 25, 24, '#ffffff', 'center');
  // A dog's outline, side on.
  c.fillStyle = '#d7a86e';
  c.beginPath();
  c.ellipse(120, 150, 70, 34, 0, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.ellipse(196, 112, 30, 26, 0, 0, Math.PI * 2);
  c.fill();
  c.fillRect(70, 170, 14, 50);
  c.fillRect(100, 172, 14, 48);
  c.fillRect(150, 170, 14, 50);
  c.fillRect(170, 166, 14, 54);
  c.fillStyle = '#8d6e63';
  c.beginPath();
  c.ellipse(186, 96, 10, 22, 0.4, 0, Math.PI * 2);
  c.fill();
  // The points checked, each tagged.
  const pts: Array<[number, number, string]> = [[206, 108, '눈·귀'], [222, 126, '치아'], [150, 132, '심장'], [96, 140, '피부·털'], [76, 218, '관절']];
  for (const [x, y] of pts) {
    c.fillStyle = '#e53935';
    c.beginPath();
    c.arc(x, y, 6, 0, Math.PI * 2);
    c.fill();
  }
  pts.forEach(([, , s], i) => text(c, `${i + 1}. ${s}`, 18 + (i % 2) * 120, 248 + Math.floor(i / 2) * 24, 16, '#33691e'));
};

/** The vaccination chart for the waiting room. */
const paintVaccines: Paint = (c) => {
  c.fillStyle = '#fffaf0';
  c.fillRect(0, 0, 512, 320);
  c.fillStyle = '#66bb6a';
  c.fillRect(0, 0, 512, 52);
  text(c, '예방접종 안내', 256, 27, 28, '#ffffff', 'center');
  const cols: Array<[string, string, string[]]> = [
    ['강아지', '#fb8c00', ['종합백신 (DHPPL) 5차', '코로나 장염 2차', '켄넬코프 2차', '광견병 1차 · 매년']],
    ['고양이', '#8e24aa', ['종합백신 (FVRCP) 3차', '백혈병 2차', '광견병 1차 · 매년', '항체가 검사']],
  ];
  cols.forEach(([who, k, rows], i) => {
    const x = 16 + i * 248;
    c.fillStyle = k;
    c.fillRect(x, 66, 232, 36);
    text(c, who, x + 116, 84, 22, '#ffffff', 'center');
    rows.forEach((r, j) => {
      c.fillStyle = j % 2 ? '#fff3e0' : '#ffffff';
      c.fillRect(x, 104 + j * 36, 232, 34);
      text(c, `생후 ${[6, 8, 10, 12][j]}주~`, x + 8, 121 + j * 36, 13, '#8d6e63', 'left', false);
      text(c, r, x + 224, 121 + j * 36, 16, '#3e2723', 'right');
    });
  });
  c.fillStyle = '#e8f5e9';
  c.fillRect(16, 260, 480, 48);
  text(c, '심장사상충 예방은 매월 1회!', 256, 276, 20, '#2e7d32', 'center');
  text(c, '진료 평일 09:30–19:00 · 토 09:30–15:00', 256, 298, 14, '#558b2f', 'center', false);
};

// ---------------------------------------------------------------------------------------------
// The pieces.

// ---------------------------------------------------------------------------------------------
// The 야생동물구조센터's pieces (2026-11-04, the branch lots: workFurniture/vet.ts).

const WR_NET = new THREE.MeshToonMaterial({ color: '#2b3528', transparent: true, opacity: 0.34, depthWrite: false, side: THREE.DoubleSide });
const WR_POST = '#6d4c41';
const WR_GREEN = '#558b2f';
function wrGroup(parent: THREE.Object3D, x = 0, y = 0, z = 0): THREE.Group {
  const c = new THREE.Group();
  c.position.set(x, y, z);
  parent.add(c);
  return c;
}
/** A net panel (a see-through plane; the posts draw its edges). */
function wrNet(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), WR_NET);
  m.userData.ownGeometry = true;
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, 0);
  m.renderOrder = 2;
  g.add(m);
}
/** A bird of prey: brown body, pale breast, hooked yellow beak; its wings out when it flies. */
function raptor(g: THREE.Object3D, flying: boolean): THREE.Group {
  const b = wrGroup(g);
  part(b, ball(0.11), '#6d4c41', 0, 0, 0, { outline: false }).scale.set(1, 1.3, 1);
  part(b, ball(0.075), '#efe0c4', 0, -0.02, 0.06, { outline: false });
  part(b, ball(0.07), '#5d4037', 0, 0.16, 0.02, { outline: false });
  part(b, cyl(0.0, 0.02, 0.04, 6), '#fbc02d', 0, 0.15, 0.09, { rx: Math.PI / 2 });
  for (const s of [-1, 1]) part(b, box(flying ? 0.34 : 0.05, flying ? 0.02 : 0.2, 0.12), '#5d4037', s * (flying ? 0.24 : 0.1), 0.02, -0.01, { outline: false });
  return b;
}

/**
 * 맹금류 비행 재활장 (wrFlightCage, 10 × 3): a long cage of timber posts and netting, roofed with net, the ground inside left as grass;
 * perches across each end, a bathing tray, a boarded hide at the west end so the bird doesn't get used to people, the door in the middle
 * of its front and the sign. A mended hawk sits on a perch; while its flight is watched (wrFlightTrain) it flies the length and back.
 */
function flightCage(g: THREE.Group, W: number, D: number, out: Built) {
  const H = 3.0;
  const x0 = -W / 2 + 0.1;
  const x1 = W / 2 - 0.1;
  const z0 = -D / 2 + 0.1;
  const z1 = D / 2 - 0.1;
  const posts = 5;
  for (let i = 0; i < posts; i++) {
    const x = x0 + ((x1 - x0) * i) / (posts - 1);
    for (const z of [z0, z1]) part(g, box(0.12, H, 0.12), WR_POST, x, H / 2, z);
    part(g, box(0.1, 0.1, z1 - z0), WR_POST, x, H, (z0 + z1) / 2);
  }
  for (const z of [z0, z1]) part(g, box(x1 - x0, 0.1, 0.1), WR_POST, (x0 + x1) / 2, H, z);
  // The netting: the long sides, the ends, the roof.
  wrNet(g, x1 - x0, H, (x0 + x1) / 2, H / 2, z1);
  wrNet(g, x1 - x0, H, (x0 + x1) / 2, H / 2, z0);
  for (const x of [x0, x1]) wrNet(g, z1 - z0, H, x, H / 2, (z0 + z1) / 2, Math.PI / 2);
  wrNet(g, x1 - x0, z1 - z0, (x0 + x1) / 2, H, (z0 + z1) / 2, 0, -Math.PI / 2);
  // Wires along the netting, so it reads as mesh.
  for (let y = 0.5; y < H; y += 0.5) for (const z of [z0, z1]) part(g, box(x1 - x0, 0.015, 0.015), '#3e4a3a', (x0 + x1) / 2, y, z, { outline: false });
  for (let x = x0 + 0.5; x < x1; x += 0.5) part(g, box(0.015, 0.015, z1 - z0), '#3e4a3a', x, H, (z0 + z1) / 2, { outline: false });
  // The hide at the west end: timber boards to head height.
  part(g, box(0.06, 1.9, z1 - z0 - 0.2), '#8d6e63', x0 + 0.08, 0.95, (z0 + z1) / 2);
  // The perches across each end; the bathing tray.
  for (const x of [x0 + 0.9, x1 - 0.9]) {
    for (const z of [z0 + 0.4, z1 - 0.4]) part(g, cyl(0.04, 0.05, 1.6, 8), '#795548', x, 0.8, z);
    part(g, cyl(0.045, 0.045, z1 - z0 - 0.7, 8), '#8d6e63', x, 1.6, (z0 + z1) / 2, { rx: Math.PI / 2 });
  }
  part(g, cyl(0.4, 0.42, 0.08, 20), '#90a4ae', 0.6, 0.04, -0.2);
  part(g, cyl(0.36, 0.36, 0.02, 20), '#4fc3f7', 0.6, 0.085, -0.2, { outline: false });
  // The door in the front; the sign beside it.
  part(g, box(0.06, 2.1, 0.08), WR_POST, -0.5, 1.05, z1 + 0.02);
  part(g, box(0.06, 2.1, 0.08), WR_POST, 0.5, 1.05, z1 + 0.02);
  part(g, box(1.06, 0.08, 0.08), WR_POST, 0, 2.1, z1 + 0.02);
  label(g, '맹금류 비행 재활장 · 조용히', 1.4, 0.2, 2.2, 2.3, z1 + 0.07, WR_GREEN, '#ffffff');
  // The hawk: on the east perch at rest; flying the length while it's watched.
  const idle = wrGroup(g);
  const use = wrGroup(g);
  raptor(wrGroup(idle, x1 - 0.9, 1.75, (z0 + z1) / 2), false);
  const flyer = raptor(use, true);
  out.idle = idle;
  out.inUse = use;
  out.animate = (t: number) => {
    const u = (t * 0.35) % 2;
    const k = u < 1 ? u : 2 - u;
    const e = k * k * (3 - 2 * k);
    flyer.position.set(x1 - 0.9 - (x1 - x0 - 1.8) * e, 1.7 + Math.sin(Math.PI * e) * 0.8, (z0 + z1) / 2);
    flyer.rotation.y = u < 1 ? -Math.PI / 2 : Math.PI / 2;
  };
  const s = spot(g, 'stand', 1.2, 0, D / 2 + 0.5, Math.PI);
  s.work = marker(g, 1.2, 1.4, z1);
  out.work = s.work;
  out.spots = { '*': s };
}

/**
 * 포유류 계류장 (wrPen, 3 × 2): a pen of timber posts and wire mesh, boarded at the back so the animals don't see people, a straw floor,
 * a wooden shelter with its roof, a water trough; a 고라니 (water deer) in it.
 */
function mammalPen(g: THREE.Group, W: number, D: number) {
  const H = 1.6;
  const x0 = -W / 2 + 0.08;
  const x1 = W / 2 - 0.08;
  const z0 = -D / 2 + 0.08;
  const z1 = D / 2 - 0.08;
  part(g, box(x1 - x0, 0.02, z1 - z0), '#d7c08a', 0, 0.01, 0, { outline: false });
  for (const x of [x0, 0, x1]) for (const z of [z0, z1]) part(g, box(0.08, H, 0.08), WR_POST, x, H / 2, z);
  for (const z of [z0, z1]) part(g, box(x1 - x0, 0.06, 0.06), WR_POST, 0, H, z);
  for (const x of [x0, x1]) part(g, box(0.06, 0.06, z1 - z0), WR_POST, x, H, 0);
  wrNet(g, x1 - x0, H, 0, H / 2, z1);
  for (const x of [x0, x1]) wrNet(g, z1 - z0, H, x, H / 2, 0, Math.PI / 2);
  part(g, box(x1 - x0, H, 0.03), '#8d6e63', 0, H / 2, z0);
  // The shelter and the trough.
  part(g, rbox(0.9, 0.7, 0.7, 0.02), '#a1887f', x0 + 0.55, 0.35, z0 + 0.45);
  part(g, box(1.0, 0.05, 0.85), '#5d4037', x0 + 0.55, 0.74, z0 + 0.45, { rx: 0.12 });
  part(g, box(0.4, 0.45, 0.01), '#3e2723', x0 + 0.55, 0.25, z0 + 0.805, { outline: false });
  part(g, rbox(0.6, 0.14, 0.24, 0.02), '#78909c', x1 - 0.45, 0.07, z1 - 0.3);
  part(g, box(0.54, 0.01, 0.18), '#4fc3f7', x1 - 0.45, 0.13, z1 - 0.3, { outline: false });
  // The 고라니.
  const deer = wrGroup(g, 0.3, 0, 0.1);
  part(deer, ball(0.2), '#a1887f', 0, 0.62, 0, { outline: false }).scale.set(1.6, 1, 1);
  for (const x of [-0.18, 0.18]) for (const z of [-0.08, 0.08]) part(deer, cyl(0.025, 0.02, 0.5, 6), '#8d6e63', x, 0.27, z, { outline: false });
  part(deer, cyl(0.05, 0.06, 0.3, 8), '#a1887f', 0.3, 0.82, 0, { rz: -0.6, outline: false });
  part(deer, ball(0.08), '#a1887f', 0.42, 0.95, 0, { outline: false }).scale.set(1.4, 1, 1);
  part(deer, ball(0.022), BLACK, 0.53, 0.94, 0, { outline: false });
  for (const z of [-0.05, 0.05]) part(deer, ball(0.035), '#8d6e63', 0.38, 1.03, z, { outline: false });
  label(g, '계류장 · 관계자 외 출입 금지', 1.2, 0.14, 0, 1.3, z1 + 0.05, WR_GREEN, '#ffffff');
}

/**
 * 야생동물 구조 차량 (wrRescueVan, 2 × 1): a white van in the centre's green, its name on the side, a beacon on the roof, a carrier and
 * the catch-pole behind its back window. Going out on a call (wrRescueRun) it drives off along the road and backs in again.
 */
function rescueVan(g: THREE.Group, out: Built) {
  const van = wrGroup(g);
  const WH = '#f5f5f5';
  part(van, rbox(1.9, 0.5, 0.86, 0.06), WH, 0, 0.55, 0);
  part(van, rbox(1.3, 0.62, 0.86, 0.06), WH, -0.3, 1.1, 0);
  part(van, rbox(0.56, 0.36, 0.84, 0.06), WH, 0.62, 0.98, 0);
  part(van, box(0.03, 0.3, 0.7), '#5f8899', 0.91, 1.0, 0, { outline: false });
  for (const z of [-0.432, 0.432]) {
    part(van, box(1.86, 0.1, 0.006), WR_GREEN, 0, 0.6, z, { outline: false });
    part(van, box(0.42, 0.26, 0.006), '#5f8899', 0.62, 1.04, z * 1.002, { outline: false });
  }
  label(van, '한빛도 야생동물구조센터', 1.1, 0.13, -0.32, 1.12, 0.44, WH, WR_GREEN);
  label(van, '구조 신고 128', 0.6, 0.08, -0.32, 0.86, 0.44, WH, '#33691e');
  // The back window, a carrier and the catch-pole behind it.
  part(van, box(0.006, 0.3, 0.6), '#5f8899', -0.952, 1.12, 0, { outline: false });
  part(van, rbox(0.4, 0.28, 0.4, 0.03), '#8d6e63', -0.7, 0.98, 0.1);
  part(van, cyl(0.012, 0.012, 1.0, 6), '#9e9e9e', -0.5, 1.15, -0.2, { rz: 1.2 });
  for (const x of [-0.6, 0.6]) for (const z of [-0.43, 0.43]) part(van, cyl(0.19, 0.19, 0.1, 18), BLACK, x, 0.22, z, { rx: Math.PI / 2 });
  part(van, rbox(0.3, 0.08, 0.16, 0.03), '#ff6f00', 0.2, 1.45, 0);
  // Out on a call: off along the road, and back.
  let state: 'parked' | 'leaving' | 'gone' | 'back' | undefined;
  let since = 0;
  out.away = (isOut, t) => {
    if (state === undefined) state = isOut ? 'gone' : 'parked';
    else if (isOut && (state === 'parked' || state === 'back')) [state, since] = ['leaving', t];
    else if (!isOut && (state === 'leaving' || state === 'gone')) [state, since] = ['back', t];
    let x = 0;
    if (state === 'leaving') {
      const u = Math.min(1, (t - since) / 3);
      x = 6 * u * u;
      if (u >= 1) state = 'gone';
    } else if (state === 'gone') x = 6;
    else if (state === 'back') {
      const u = Math.min(1, (t - since) / 3);
      x = 6 * (1 - u) * (1 - u);
      if (u >= 1) state = 'parked';
    }
    van.position.x = x;
    van.visible = state !== 'gone';
  };
  const s = spot(g, 'stand', 0.2, 0, 0.95, Math.PI);
  s.work = marker(g, 0.2, 1.0, 0.45);
  out.work = s.work;
  out.spots = { '*': s };
}

/**
 * 산소 입원장 (vtOxygenCage, 1 × 1): a clear-fronted ICU kennel on a steel cabinet, a small dog lying inside breathing the oxygen, the
 * control panel on top reading its O₂ and temperature in green, the oxygen line from the wall into its back, a towel folded on top.
 */
function oxygenCage(g: THREE.Group, W: number, D: number) {
  const w = W - 0.12;
  const zb = -D / 2 + 0.3;
  part(g, rbox(w, 0.62, 0.52, 0.02), '#cfd8dc', 0, 0.31, zb);
  for (const y of [0.18, 0.44]) part(g, box(w - 0.1, 0.01, 0.01), '#90a4ae', 0, y, zb + 0.265, { outline: false });
  part(g, rbox(w, 0.5, 0.52, 0.03), '#eceff1', 0, 0.88, zb);
  glass(g, box(w - 0.08, 0.42, 0.01), 0, 0.88, zb + 0.262);
  pup(g, 0, 0.64, zb, '#d7a86e', 'lie', Math.PI / 2);
  // The panel and its readout.
  part(g, box(w - 0.1, 0.12, 0.2), '#455a64', 0, 1.2, zb + 0.1);
  label(g, 'O₂ 40% · 24℃', 0.4, 0.07, 0, 1.2, zb + 0.205, '#102027', '#69f0ae');
  // The oxygen line to the wall outlet.
  part(g, cyl(0.012, 0.012, 0.5, 6), '#4caf50', 0.2, 1.05, -D / 2 + 0.03, { outline: false });
  part(g, box(0.12, 0.12, 0.04), '#43a047', 0.2, 1.35, -D / 2 + 0.03);
  towels(g, -0.2, 1.13, zb - 0.1, ['#80cbc4']);
}

/**
 * 격리 입원장 (vtIsoKennel, 1 × 1): a steel kennel inside yellow-and-black tape on the floor, the warning sign on its door, a puppy on a
 * drip lying in it; beside it the gown and the gloves on their hook and the foot bath before it.
 */
function isoKennel(g: THREE.Group, W: number, D: number) {
  const w = W - 0.16;
  const zb = -D / 2 + 0.3;
  part(g, rbox(w, 0.1, 0.52, 0.02), '#90a4ae', 0, 0.05, zb);
  part(g, rbox(w, 0.7, 0.52, 0.02), STEEL, 0, 0.45, zb);
  part(g, box(w - 0.06, 0.6, 0.01), '#37474f', 0, 0.45, zb + 0.262, { outline: false });
  for (let i = 0; i < 6; i++) part(g, box(0.012, 0.58, 0.012), CHROME, -w / 2 + 0.07 + (i * (w - 0.14)) / 5, 0.45, zb + 0.27, { outline: false });
  pup(g, 0, 0.12, zb, '#8d6e63', 'lie', Math.PI / 2, true);
  label(g, '격리 · 파보', 0.36, 0.09, 0, 0.92, zb + 0.28, '#fdd835', BLACK);
  // The tape on the floor round it, the foot bath.
  for (const [x, z, w2, d2] of [[0, D / 2 - 0.06, W - 0.06, 0.05], [-W / 2 + 0.05, 0, 0.05, D - 0.1], [W / 2 - 0.05, 0, 0.05, D - 0.1]] as const) part(g, box(w2, 0.006, d2), '#fdd835', x, 0.004, z, { outline: false });
  part(g, rbox(0.34, 0.04, 0.22, 0.02), '#1e88e5', 0, 0.02, D / 2 - 0.2);
  // The gown and the gloves on the hook.
  part(g, box(0.02, 0.02, 0.1), CHROME, W / 2 - 0.08, 1.5, zb, { outline: false });
  part(g, rbox(0.18, 0.6, 0.06, 0.04), '#fff59d', W / 2 - 0.08, 1.18, zb + 0.06);
  part(g, rbox(0.06, 0.12, 0.03, 0.02), '#64b5f6', W / 2 - 0.12, 0.98, zb + 0.1);
}

/**
 * 미용 테이블 (vtGroomTable, 2 × 1): a non-slip table on a hydraulic column, the steel arm over it with its noose, a poodle stood on it
 * half clipped; the clippers and the scissors in their holder, the dryer on its stand beside it, the clipped fur on the floor.
 */
function groomTable(g: THREE.Group, W: number, D: number) {
  const x0 = -0.2;
  const z = -D / 2 + 0.38;
  part(g, cyl(0.07, 0.11, 0.66, 14), '#78909c', x0, 0.33, z);
  part(g, rbox(0.95, 0.05, 0.55, 0.03), '#37474f', x0, 0.7, z);
  part(g, box(0.9, 0.012, 0.5), '#5c6bc0', x0, 0.73, z, { outline: false });
  // The arm and its noose.
  part(g, cyl(0.015, 0.015, 0.9, 8), CHROME, x0 - 0.42, 1.16, z - 0.2, { outline: false });
  part(g, cyl(0.015, 0.015, 0.45, 8), CHROME, x0 - 0.2, 1.6, z - 0.2, { rz: Math.PI / 2, outline: false });
  part(g, cyl(0.004, 0.004, 0.3, 6), '#e53935', x0 + 0.02, 1.45, z - 0.2, { outline: false });
  pup(g, x0 + 0.05, 0.74, z, '#f5f5f5', 'stand', Math.PI / 2);
  part(g, ball(0.09), '#fafafa', x0 + 0.15, 1.08, z).scale.set(1, 0.8, 1);
  // The tool holder, the dryer, the fur on the floor.
  part(g, rbox(0.16, 0.1, 0.08, 0.02), '#b0bec5', x0 + 0.38, 0.79, z - 0.18);
  part(g, box(0.03, 0.12, 0.03), BLACK, x0 + 0.36, 0.86, z - 0.18, { outline: false });
  const dx = W / 2 - 0.3;
  part(g, cyl(0.12, 0.15, 0.03, 14), '#424242', dx, 0.02, z);
  part(g, cyl(0.018, 0.018, 1.2, 8), CHROME, dx, 0.62, z, { outline: false });
  part(g, rbox(0.22, 0.16, 0.18, 0.05), '#e91e63', dx, 1.26, z + 0.05);
  part(g, cyl(0.04, 0.03, 0.15, 10), '#ad1457', dx, 1.26, z + 0.2, { rx: Math.PI / 2 });
  for (const [fx, fz] of [[0.1, 0.32], [-0.15, 0.36], [0.25, 0.4]]) part(g, ball(0.05), '#eeeeee', x0 + fx, 0.01, z + fz, { outline: false }).scale.set(1.4, 0.2, 1);
}

/**
 * 고압 멸균기 (vtAutoclave, 1 × 1): a benchtop autoclave on a steel cabinet, its round door wheel and pressure gauge, the timer lit, the
 * wrapped surgical packs with their indicator tape stacked beside it, the distilled-water jug.
 */
function autoclave(g: THREE.Group, W: number, D: number) {
  const zb = -D / 2 + 0.3;
  part(g, rbox(W - 0.1, 0.8, 0.55, 0.02), '#b0bec5', 0, 0.4, zb);
  part(g, rbox(0.56, 0.4, 0.46, 0.04), '#eceff1', -0.08, 1.0, zb);
  part(g, cyl(0.16, 0.16, 0.03, 20), CHROME, -0.08, 1.0, zb + 0.24, { rx: Math.PI / 2 });
  part(g, ring(0.1, 0.012), '#546e7a', -0.08, 1.0, zb + 0.26, { outline: false });
  part(g, cyl(0.04, 0.04, 0.02, 14), '#fafafa', 0.15, 1.12, zb + 0.235, { rx: Math.PI / 2 });
  label(g, '121℃ 15:00', 0.16, 0.05, 0.15, 0.95, zb + 0.235, '#102027', '#ff7043');
  for (let i = 0; i < 3; i++) part(g, rbox(0.2, 0.06, 0.16, 0.02), '#81d4fa', W / 2 - 0.18, 0.84 + i * 0.065, zb + 0.05, { ry: i * 0.2 });
  part(g, box(0.2, 0.01, 0.02), BLACK, W / 2 - 0.18, 1.0, zb + 0.13, { outline: false });
  part(g, rbox(0.1, 0.22, 0.1, 0.03), '#e1f5fe', -W / 2 + 0.12, 0.92, zb + 0.15);
}

/**
 * 고양이 이동장 선반 (vtCatShelf, 2 × 1): a tall wooden shelf set across the waiting room as a screen, its cubbies at chair height where
 * cat carriers are set down off the floor (a cat looking out of one), a blanket over another, the "고양이 대기석 · 조용히 해 주세요" sign.
 */
function catShelf(g: THREE.Group, W: number, D: number) {
  const wood = '#bcaaa4';
  const H = 1.7;
  part(g, box(W - 0.1, H, 0.04), shade(wood, 0.85), 0, H / 2, 0);
  for (const sx of [-1, 1]) part(g, box(0.05, H, D - 0.3), wood, sx * (W / 2 - 0.08), H / 2, 0);
  for (const y of [0.05, 0.55, 1.1, H]) part(g, box(W - 0.12, 0.04, D - 0.3), tint(wood, 0.1), 0, y, 0, { outline: false });
  // Carriers in the cubbies.
  const carrier = (x: number, y: number, c: string) => {
    part(g, rbox(0.42, 0.3, 0.32, 0.06), c, x, y + 0.15, 0.08);
    part(g, box(0.28, 0.2, 0.01), '#37474f', x, y + 0.15, 0.245, { outline: false });
  };
  carrier(-0.45, 0.57, '#90caf9');
  carrier(0.45, 0.57, '#f48fb1');
  kitty(g, -0.45, 0.62, 0.1, '#ffb74d');
  part(g, rbox(0.44, 0.32, 0.34, 0.08), '#a5d6a7', 0.45, 1.27, 0.08);
  label(g, '고양이 대기석 · 조용히 해 주세요', 1.3, 0.14, 0, H + 0.14, 0.03, '#6d4c41', '#fff8e1');
}

/**
 * 동물 이송 차량 (vtPetVan, 2 × 1): the clinic's small white van, mint stripe and paw print, the clinic's name and number on its side, a
 * carrier strapped in behind the back window. It stays at the kerb: owners' pets are fetched and taken home in it.
 */
function petVan(g: THREE.Group) {
  const WH = '#fafafa';
  const MINT = '#26a69a';
  part(g, rbox(1.9, 0.5, 0.86, 0.06), WH, 0, 0.55, 0);
  part(g, rbox(1.3, 0.62, 0.86, 0.06), WH, -0.3, 1.1, 0);
  part(g, rbox(0.56, 0.36, 0.84, 0.06), WH, 0.62, 0.98, 0);
  part(g, box(0.03, 0.3, 0.7), '#5f8899', 0.91, 1.0, 0, { outline: false });
  for (const z of [-0.432, 0.432]) {
    part(g, box(1.86, 0.1, 0.006), MINT, 0, 0.6, z, { outline: false });
    part(g, box(0.42, 0.26, 0.006), '#5f8899', 0.62, 1.04, z * 1.002, { outline: false });
  }
  label(g, '새솔동물병원 · 동물 이송', 1.1, 0.13, -0.32, 1.12, 0.44, WH, MINT);
  label(g, '24시 상담 031-555-0119', 0.8, 0.08, -0.32, 0.86, 0.44, WH, '#00695c');
  part(g, box(0.006, 0.3, 0.6), '#5f8899', -0.952, 1.12, 0, { outline: false });
  part(g, rbox(0.4, 0.28, 0.4, 0.03), '#90caf9', -0.7, 0.98, 0.05);
  for (const x of [-0.6, 0.6]) for (const z of [-0.43, 0.43]) part(g, cyl(0.19, 0.19, 0.1, 18), BLACK, x, 0.22, z, { rx: Math.PI / 2 });
}

export const BUILDERS: Record<string, Builder> = {
  vtOxygenCage(g, W, D) {
    oxygenCage(g, W, D);
  },
  vtIsoKennel(g, W, D) {
    isoKennel(g, W, D);
  },
  vtGroomTable(g, W, D) {
    groomTable(g, W, D);
  },
  vtAutoclave(g, W, D) {
    autoclave(g, W, D);
  },
  vtCatShelf(g, W, D) {
    catShelf(g, W, D);
  },
  vtPetVan(g) {
    petVan(g);
  },
  wrFlightCage(g, W, D, _c, _def, _ctx, out) {
    flightCage(g, W, D, out);
  },
  wrPen(g, W, D) {
    mammalPen(g, W, D);
  },
  wrRescueVan(g, _W, _D, _c, _def, _ctx, out) {
    rescueVan(g, out);
  },
  /**
   * The exam table: a stainless top with a rubber mat on a lift column (its foot pedals at the base),
   * the scale built into it with its readout along the front; an exam lamp on an arm over it; a
   * steel trolley at its side with the cotton jar, the treats, gloves, a thermometer and a stethoscope;
   * on the wall a health-check poster and the otoscope set. While it's used the patient sits on a
   * towel on it, facing the vet. Seen to (and restrained, and wiped down) standing at its front.
   */
  vetTable(g, W, _D, c, _def, ctx, out) {
    const h = 0.86;
    const L = Math.min(W - 0.8, 1.15);
    const d = 0.58;
    const x0 = -W / 2 + L / 2 + 0.08;
    const z = -0.06;
    const front = z + d / 2;
    // The base with its pedals, the column with its bellows.
    part(g, rbox(0.62, 0.06, 0.46, 0.02), '#78909c', x0, 0.03, z);
    for (const dx of [-0.12, 0.12]) part(g, rbox(0.1, 0.03, 0.08, 0.01), BLACK, x0 + dx, 0.07, z + 0.24);
    part(g, cyl(0.1, 0.12, 0.2, 16), '#90a4ae', x0, 0.16, z);
    for (let i = 0; i < 6; i++) part(g, cyl(0.085, 0.085, 0.035, 16), i % 2 ? '#37474f' : '#455a64', x0, 0.29 + i * 0.045, z, { outline: false });
    part(g, cyl(0.065, 0.065, 0.24, 14), CHROME, x0, 0.66, z);
    // The top: a steel tray with a lip, the scale's apron and readout, the mat.
    part(g, rbox(L, 0.06, d, 0.02), STEEL, x0, h - 0.03, z);
    part(g, rbox(L - 0.12, 0.08, d - 0.1, 0.02), '#b0bec5', x0, h - 0.09, z);
    for (const sz of [-1, 1]) part(g, box(L, 0.025, 0.02), CHROME, x0, h + 0.012, z + sz * (d / 2 - 0.01), { outline: false });
    part(g, rbox(L - 0.08, 0.012, d - 0.07, 0.006), RUBBER, x0, h + 0.006, z);
    for (let i = 0; i < 9; i++) part(g, box(L - 0.12, 0.004, 0.01), tint(RUBBER, 0.2), x0, h + 0.014, z - (d - 0.12) / 2 + i * ((d - 0.12) / 8), { outline: false });
    part(g, rbox(0.2, 0.07, 0.02, 0.008), '#263238', x0 + L / 2 - 0.2, h - 0.06, front + 0.01);
    glowing(g, box(0.15, 0.045, 0.004), '#0b3d2a', x0 + L / 2 - 0.2, h - 0.06, front + 0.022);
    picture(g, painted('vt-tableweight', 128, 48, paintTableWeight), 0.14, 0.04, x0 + L / 2 - 0.2, h - 0.06, front + 0.025);
    label(g, '동물 진료대', 0.24, 0.05, x0 - L / 2 + 0.2, h - 0.06, front + 0.012, tint(c, 0.2), '#004d40');
    // Idle: a clean towel folded at the end and the disinfectant ready; in use the patient sits on a towel.
    const idle = new THREE.Group();
    g.add(idle);
    part(idle, rbox(0.26, 0.04, 0.2, 0.02), '#80deea', x0 - L / 2 + 0.2, h + 0.03, z - 0.08);
    part(idle, cyl(0.035, 0.035, 0.16, 12), '#e1f5fe', x0 + L / 2 - 0.14, h + 0.09, z - 0.12);
    part(idle, rbox(0.04, 0.06, 0.06, 0.01), '#1e88e5', x0 + L / 2 - 0.14, h + 0.2, z - 0.11);
    out.idle = idle;
    const use = new THREE.Group();
    g.add(use);
    part(use, rbox(0.46, 0.015, 0.4, 0.01), '#ffcc80', x0, h + 0.02, z);
    pup(use, x0, h + 0.026, z - 0.02, '#d7a86e', 'sit');
    out.inUse = use;
    // The exam lamp: a post at the back corner, an arm out over the table, its head lit in use.
    const lx = x0 - L / 2 - 0.02;
    const lz = z - d / 2 + 0.02;
    part(g, rbox(0.04, 0.12, 0.04, 0.01), '#90a4ae', lx, h + 0.0, lz);
    part(g, cyl(0.016, 0.016, 0.8, 8), CHROME, lx, h + 0.42, lz, { outline: false });
    rod(g, new THREE.Vector3(lx, h + 0.82, lz), new THREE.Vector3(x0 - 0.05, h + 0.72, z - 0.04), 0.013, CHROME);
    const head = new THREE.Group();
    head.position.set(x0 - 0.05, h + 0.66, z - 0.04);
    head.rotation.z = -0.25;
    g.add(head);
    part(head, cyl(0.05, 0.11, 0.1, 18), '#eceff1', 0, 0, 0);
    part(head, cyl(0.1, 0.1, 0.008, 18), '#b0bec5', 0, -0.05, 0, { outline: false });
    glowing(alongside(use, head), cyl(0.095, 0.095, 0.006, 18), '#fffbe6', 0, -0.055, 0);
    // The trolley at its side.
    const tx = W / 2 - 0.24;
    const tz = z - 0.02;
    part(g, rbox(0.4, 0.04, 0.46, 0.012), STEEL, tx, 0.82, tz);
    part(g, rbox(0.4, 0.03, 0.46, 0.012), STEEL, tx, 0.36, tz);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        part(g, cyl(0.013, 0.013, 0.74, 8), CHROME, tx + sx * 0.18, 0.45, tz + sz * 0.2, { outline: false });
        caster(g, tx + sx * 0.18, tz + sz * 0.2, 0.035);
      }
    part(g, rbox(0.36, 0.2, 0.42, 0.02), '#eceff1', tx, 0.48, tz);
    part(g, box(0.12, 0.012, 0.02), '#78909c', tx, 0.52, tz + 0.215, { outline: false });
    const top = 0.84;
    // Cotton jar, the treats (a bone on its label), gloves, a thermometer and the stethoscope.
    glass(g, cyl(0.045, 0.045, 0.13, 14), tx - 0.11, top + 0.065, tz - 0.12);
    for (let i = 0; i < 5; i++) part(g, ball(0.022), '#ffffff', tx - 0.11 + ((i % 2) - 0.5) * 0.03, top + 0.03 + i * 0.02, tz - 0.12 + ((i % 3) - 1) * 0.015, { outline: false });
    part(g, cyl(0.048, 0.048, 0.014, 14), CHROME, tx - 0.11, top + 0.137, tz - 0.12, { outline: false });
    glass(g, cyl(0.05, 0.05, 0.15, 14), tx + 0.06, top + 0.075, tz - 0.13);
    for (let i = 0; i < 6; i++) part(g, box(0.05, 0.014, 0.018), '#a1887f', tx + 0.06 + ((i % 2) - 0.5) * 0.03, top + 0.02 + i * 0.018, tz - 0.13, { ry: i, outline: false });
    part(g, cyl(0.053, 0.053, 0.02, 14), '#e53935', tx + 0.06, top + 0.16, tz - 0.13);
    label(g, '간식', 0.07, 0.03, tx + 0.06, top + 0.09, tz - 0.077, '#fff8e1', '#e65100');
    part(g, rbox(0.2, 0.08, 0.11, 0.008), '#ffffff', tx + 0.05, top + 0.04, tz + 0.08);
    part(g, rbox(0.06, 0.02, 0.04, 0.01), '#64b5f6', tx + 0.05, top + 0.085, tz + 0.08);
    part(g, cyl(0.007, 0.01, 0.13, 8), '#ffffff', tx - 0.12, top + 0.01, tz + 0.12, { rz: Math.PI / 2, ry: 0.4 });
    part(g, rbox(0.03, 0.012, 0.022, 0.004), '#00897b', tx - 0.17, top + 0.012, tz + 0.14, { ry: 0.4 });
    part(g, ring(0.05, 0.006), BLACK, tx - 0.09, top + 0.006, tz + 0.03, { rx: Math.PI / 2, outline: false });
    part(g, cyl(0.022, 0.022, 0.012, 14), CHROME, tx - 0.03, top + 0.008, tz + 0.05);
    // The wall: the health-check poster, the otoscope and ophthalmoscope on their charger.
    if (ctx.againstWall) {
      const wz = -0.48;
      part(g, rbox(0.5, 0.62, 0.015, 0.006), '#ffffff', x0 + 0.2, 1.55, wz);
      picture(g, painted('vt-dogposter', 256, 320, paintDogPoster), 0.46, 0.575, x0 + 0.2, 1.55, wz + 0.009);
      const sx = tx;
      part(g, rbox(0.3, 0.14, 0.05, 0.015), '#eceff1', sx, 1.35, wz + 0.02);
      for (const [dx, k] of [[-0.07, '#263238'], [0.07, '#37474f']] as const) {
        part(g, cyl(0.018, 0.018, 0.16, 10), k, sx + dx, 1.46, wz + 0.06);
        part(g, cyl(0.022, 0.012, 0.06, 10), dx < 0 ? '#90a4ae' : '#cfd8dc', sx + dx, 1.57, wz + 0.06);
        rod(g, new THREE.Vector3(sx + dx, 1.31, wz + 0.05), new THREE.Vector3(sx + dx * 0.5, 1.2, wz + 0.07), 0.005, '#424242');
      }
      glowing(g, ball(0.008), '#66bb6a', sx + 0.12, 1.35, wz + 0.047);
    }
    // Stood at its front: the patient looked over, held still (the junior's practice), the mat wiped.
    const sx0 = x0 + 0.02;
    const sz0 = front + 0.24;
    const pet = marker(g, x0, h + 0.27, z + 0.04);
    const neck = marker(g, x0, h + 0.3, z + 0.08);
    const mat = marker(g, x0 - 0.08, h + 0.03, z + 0.02);
    out.work = pet;
    out.spots = { '*': stoodAt(g, sx0, sz0, pet, 'tinker'), vet_restrainPractice: stoodAt(g, sx0, sz0 - 0.04, neck, 'restrain'), disinfectTable: stoodAt(g, sx0, sz0, mat, 'scrub') };
  },

  /**
   * A bank of in-patient kennels: stainless steel, two cages high on a plinth — a dog in its cone lying
   * on a fleece below with its water and food bowls and a drip running in, a tabby curled up asleep
   * above beside its litter tray — barred doors with the patients' cards clipped on, folded towels on
   * top. The lower door swings open while the animals are seen to; fed crouched down at it, the
   * wild one in the upper cage looked in on standing.
   */
  kennel(g, W, D, _c, _def, _ctx, out) {
    const w = Math.min(W, 1) - 0.08;
    const d = Math.min(D, 1) - 0.3;
    const z = -D / 2 + d / 2 + 0.03;
    const zf = z + d / 2;
    const H = 1.6;
    const y0 = 0.1;
    const ym = 0.84;
    // The carcass: plinth, sides, back, the shelf between the cages, the top.
    part(g, rbox(w, y0, d, 0.01), '#607d8b', 0, y0 / 2, z);
    for (const sx of [-1, 1]) part(g, box(0.025, H - y0, d), STEEL, sx * (w / 2 - 0.0125), (H + y0) / 2, z);
    part(g, box(w, H - y0, 0.02), '#cfd8dc', 0, (H + y0) / 2, z - d / 2 + 0.01, { outline: false });
    part(g, box(w, 0.03, d), STEEL, 0, y0 + 0.015, z);
    part(g, box(w, 0.04, d), STEEL, 0, ym, z);
    part(g, rbox(w + 0.02, 0.04, d + 0.02, 0.01), STEEL, 0, H, z);
    // Below: the dog in its cone on a fleece, its bowls, a drip running in through the bars.
    part(g, rbox(w - 0.16, 0.04, d - 0.12, 0.02), '#9fa8da', -0.05, y0 + 0.05, z - 0.02);
    pup(g, -0.05, y0 + 0.06, z - 0.1, '#f5e6c8', 'lie', 1.1, true).scale.setScalar(0.85);
    for (const [dx, food] of [[0.05, false], [0.27, true]] as const) {
      const bz = zf - 0.11;
      part(g, cyl(0.07, 0.055, 0.045, 16), CHROME, dx, y0 + 0.055, bz);
      if (food) for (let i = 0; i < 7; i++) part(g, ball(0.013), '#8d6e63', dx + ((i % 3) - 1) * 0.025, y0 + 0.08, bz + (Math.floor(i / 3) - 1) * 0.022, { outline: false });
      else part(g, cyl(0.058, 0.058, 0.005, 16), '#4fc3f7', dx, y0 + 0.075, bz, { outline: false, material: WATER });
    }
    // Above: the cat on its fleece, its litter tray.
    part(g, rbox(w - 0.3, 0.04, d - 0.14, 0.02), '#f48fb1', -0.1, ym + 0.04, z - 0.02);
    kitty(g, -0.1, ym + 0.05, z - 0.02, '#c8a165', 0.5);
    part(g, rbox(0.22, 0.07, 0.28, 0.01), '#4db6ac', w / 2 - 0.16, ym + 0.055, z - 0.02);
    part(g, box(0.18, 0.01, 0.24), '#d7ccc8', w / 2 - 0.16, ym + 0.085, z - 0.02, { outline: false });
    // The doors: a steel frame with upright bars; the lower one opens.
    const door = (yb: number, yt: number) => {
      const hinge = new THREE.Group();
      hinge.position.set(-w / 2 + 0.02, 0, zf + 0.012);
      hinge.userData.swing = -1;
      g.add(hinge);
      const dw = w - 0.04;
      const cx = dw / 2;
      for (const y of [yb + 0.015, yt - 0.015]) part(hinge, box(dw, 0.03, 0.02), CHROME, cx, y, 0);
      for (const x of [0.015, dw - 0.015]) part(hinge, box(0.03, yt - yb, 0.02), CHROME, x, (yb + yt) / 2, 0);
      const n = 11;
      for (let i = 1; i < n; i++) part(hinge, cyl(0.006, 0.006, yt - yb - 0.03, 6), CHROME, (dw * i) / n, (yb + yt) / 2, 0, { outline: false });
      part(hinge, box(dw, 0.012, 0.014), CHROME, cx, (yb + yt) / 2, 0, { outline: false });
      part(hinge, rbox(0.03, 0.09, 0.04, 0.008), '#455a64', dw - 0.03, (yb + yt) / 2 + 0.06, 0.02);
      return hinge;
    };
    const lower = door(y0 + 0.03, ym - 0.02);
    const upper = door(ym + 0.02, H - 0.02);
    out.doors = [lower];
    // The patients' cards, clipped to their doors.
    picture(lower, painted('vt-card-dog', 160, 112, paintKennelCard('콩이 (말티즈)', '외과', '중성화 수술 후 1일 · 넥카라', '#00897b')), 0.2, 0.14, 0.2, ym - 0.14, 0.016);
    picture(upper, painted('vt-card-cat', 160, 112, paintKennelCard('치즈 (코숏)', '내과', '구토 · 수액 처치 중', '#8e24aa')), 0.2, 0.14, 0.2, H - 0.14, 0.016);
    // The drip on a hook at the top front, its line in through the bars to the dog.
    part(g, rbox(0.04, 0.12, 0.03, 0.01), CHROME, w / 2 - 0.08, H + 0.07, zf);
    dripBag(g, w / 2 - 0.08, H + 0.05, zf + 0.03, new THREE.Vector3(0.3, 0.45, zf - 0.03));
    // Towels folded on top.
    towels(g, -0.12, H + 0.02, z, ['#80deea', '#ffcc80', '#ce93d8']);
    // Fed crouched at the open lower cage; the upper one looked into standing.
    const bowl = marker(g, 0.24, y0 + 0.12, zf - 0.1);
    const above = marker(g, -0.02, ym + 0.2, zf - 0.1);
    out.work = bowl;
    out.spots = { '*': stoodAt(g, 0.12, zf + 0.4, bowl, 'tinker'), vet_wildRehab: stoodAt(g, 0, zf + 0.36, above, 'tinker') };
  },

  /**
   * The animal operating table: a stainless V-top on a pedestal, a warming pad in its trough. In use a
   * small dog lies on its back under green drapes, the field opened, its head out at the end with the
   * tube in its mouth to the anaesthesia machine — a little cart with the flowmeters, the yellow
   * isoflurane vaporiser, the breathing bag (rising and falling), the oxygen bottle and the monitor of
   * its vitals on top. The surgical light on its stand behind, the instrument tray over the foot, a
   * kick bucket. Operated on standing at its front.
   */
  vetSurgeryTable(g, W, _D, _c, _def, _ctx, out) {
    const top = 0.9;
    const L = 1.2;
    const xt = -0.2;
    const zt = -0.05;
    const Wt = 0.5;
    // The pedestal and base.
    part(g, rbox(0.62, 0.06, 0.44, 0.02), '#78909c', xt, 0.03, zt);
    part(g, rbox(0.2, top - 0.2, 0.18, 0.03), '#cfd8dc', xt, 0.06 + (top - 0.2) / 2, zt);
    for (let i = 0; i < 3; i++) part(g, box(0.21, 0.012, 0.19), '#b0bec5', xt, 0.25 + i * 0.15, zt, { outline: false });
    part(g, rbox(0.3, 0.08, 0.24, 0.02), '#90a4ae', xt, top - 0.12, zt);
    // The V-top: two plates tilted in, the ends closing them, a drain at one end.
    for (const sz of [-1, 1]) part(g, rbox(L, 0.025, Wt / 2 + 0.02, 0.008), STEEL, xt, top - 0.03, zt + sz * (Wt / 4), { rx: sz * 0.22 });
    for (const sx of [-1, 1]) part(g, box(0.02, 0.09, Wt), CHROME, xt + sx * (L / 2), top - 0.0, zt, { outline: false });
    part(g, cyl(0.015, 0.015, 0.08, 8), CHROME, xt - L / 2 + 0.04, top - 0.1, zt, { outline: false });
    for (const sz of [-1, 1]) part(g, box(L - 0.06, 0.02, 0.02), CHROME, xt, top + 0.03, zt + sz * (Wt / 2 + 0.01), { outline: false });
    // Idle: the drapes folded on the warming pad.
    const idle = new THREE.Group();
    g.add(idle);
    part(idle, rbox(L - 0.2, 0.02, 0.28, 0.01), '#ffb74d', xt, top - 0.02, zt);
    for (let i = 0; i < 3; i++) part(idle, rbox(0.3, 0.03, 0.26, 0.01), i === 1 ? '#5fa595' : '#3d8b7a', xt - 0.3, top + 0.0 + i * 0.03, zt);
    out.idle = idle;
    // In use: the dog under the drapes, its head out at the right with the tube, the field open.
    const use = new THREE.Group();
    g.add(use);
    part(use, rbox(L - 0.1, 0.015, 0.3, 0.008), '#ffb74d', xt, top - 0.02, zt);
    part(use, rbox(0.72, 0.16, 0.36, 0.08), '#3d8b7a', xt - 0.08, top + 0.05, zt);
    for (const sz of [-1, 1]) part(use, box(L - 0.1, 0.22, 0.01), '#3d8b7a', xt - 0.02, top - 0.06, zt + sz * (Wt / 2 + 0.03), { outline: false });
    part(use, box(0.14, 0.005, 0.08), '#e8a2a2', xt - 0.1, top + 0.132, zt, { outline: false });
    part(use, box(0.07, 0.004, 0.006), '#b71c1c', xt - 0.1, top + 0.136, zt, { outline: false });
    for (const dx of [-0.05, 0.05]) part(use, ring(0.02, 0.003, Math.PI), CHROME, xt - 0.1 + dx, top + 0.14, zt, { ry: Math.PI / 2, outline: false });
    part(use, box(0.06, 0.008, 0.05), '#ffffff', xt - 0.22, top + 0.134, zt + 0.08, { outline: false });
    // The head, on its side at the end, the tongue out with the pulse clip on it.
    const hx = xt + 0.36;
    part(use, ball(0.075), '#f5e6c8', hx, top + 0.06, zt);
    part(use, ball(0.04), '#fbf3e4', hx + 0.08, top + 0.05, zt).scale.set(1.3, 0.8, 0.9);
    part(use, ball(0.015), BLACK, hx + 0.13, top + 0.055, zt, { outline: false });
    part(use, ball(0.035), '#d9c19a', hx - 0.01, top + 0.06, zt - 0.07).scale.set(1.2, 0.5, 0.8);
    part(use, box(0.05, 0.006, 0.025), '#f48fb1', hx + 0.1, top + 0.025, zt + 0.02, { outline: false });
    part(use, rbox(0.03, 0.02, 0.02, 0.006), '#ef5350', hx + 0.12, top + 0.03, zt + 0.02);
    // The anaesthesia machine at the head end.
    const ax = W / 2 - 0.26;
    const az = zt - 0.12;
    part(g, rbox(0.4, 0.06, 0.4, 0.02), '#90a4ae', ax, 0.09, az);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) caster(g, ax + sx * 0.16, az + sz * 0.16, 0.035);
    part(g, rbox(0.36, 0.62, 0.34, 0.03), '#eceff1', ax, 0.44, az);
    part(g, box(0.37, 0.03, 0.35), '#4db6ac', ax, 0.62, az, { outline: false });
    for (let i = 0; i < 2; i++) part(g, box(0.14, 0.012, 0.02), '#78909c', ax, 0.3 + i * 0.18, az + 0.175, { outline: false });
    part(g, rbox(0.38, 0.03, 0.36, 0.01), STEEL, ax, 0.77, az);
    // The flowmeters: glass tubes with their floats; the vaporiser; the bag; the canister.
    part(g, rbox(0.14, 0.24, 0.06, 0.01), '#cfd8dc', ax - 0.1, 0.91, az - 0.1);
    for (const [dx, k] of [[-0.03, '#43a047'], [0.03, '#eceff1']] as const) {
      glass(g, cyl(0.012, 0.012, 0.18, 10), ax - 0.1 + dx, 0.92, az - 0.065);
      part(g, ball(0.011), k, ax - 0.1 + dx, 0.88 + (dx > 0 ? 0.02 : 0.06), az - 0.065, { outline: false });
    }
    part(g, rbox(0.12, 0.16, 0.12, 0.02), '#fdd835', ax + 0.08, 0.87, az - 0.06);
    part(g, cyl(0.04, 0.04, 0.025, 16), '#f9a825', ax + 0.08, 0.93, az + 0.005, { rx: Math.PI / 2 });
    label(g, 'ISO', 0.06, 0.025, ax + 0.08, 0.83, az + 0.002, '#fdd835', '#4e342e');
    part(g, cyl(0.05, 0.05, 0.14, 14), '#ffffff', ax + 0.12, 0.7, az + 0.12);
    part(g, cyl(0.045, 0.045, 0.1, 14), '#ce93d8', ax + 0.12, 0.7, az + 0.12, { outline: false });
    const bag = new THREE.Group();
    bag.position.set(ax - 0.18, 0.62, az + 0.14);
    g.add(bag);
    part(bag, cyl(0.012, 0.012, 0.05, 8), '#455a64', 0, 0.12, 0, { outline: false });
    const balloon = part(bag, ball(0.07), '#263238', 0, 0.02, 0);
    balloon.scale.set(1, 1.3, 1);
    // The oxygen bottle strapped to its side.
    part(g, cyl(0.06, 0.06, 0.62, 14), '#43a047', ax + 0.24, 0.42, az - 0.08);
    part(g, ball(0.06), '#43a047', ax + 0.24, 0.73, az - 0.08);
    part(g, cyl(0.022, 0.022, 0.08, 8), CHROME, ax + 0.24, 0.8, az - 0.08, { outline: false });
    // The breathing tubes to the head (only with someone on the table).
    const mouth = new THREE.Vector3(hx + 0.1, top + 0.05, zt + 0.005);
    const yPiece = new THREE.Vector3(hx + 0.22, top + 0.12, zt + 0.02);
    rod(use, mouth, yPiece, 0.012, '#90caf9');
    rod(use, yPiece, new THREE.Vector3(ax - 0.1, 0.8, az + 0.08), 0.018, '#bbdefb');
    rod(use, yPiece, new THREE.Vector3(ax - 0.04, 0.8, az + 0.12), 0.018, '#bbdefb');
    rod(use, new THREE.Vector3(hx + 0.12, top + 0.03, zt + 0.02), new THREE.Vector3(ax - 0.05, 1.0, az), 0.004, '#424242');
    // The monitor on top of the machine, the traces running while it's used.
    const mon = new THREE.Group();
    mon.position.set(ax, 1.08, az - 0.02);
    mon.rotation.y = -0.35;
    g.add(mon);
    part(mon, rbox(0.34, 0.24, 0.05, 0.015), BLACK, 0, 0, 0);
    part(mon, rbox(0.06, 0.08, 0.06, 0.01), '#546e7a', 0, -0.14, -0.01);
    out.screen = litScreen(mon, painted('vitals', 320, 200, paintVitals), 0.3, 0.2, 0, 0, 0.022);
    const strip = waves(alongside(use, mon), 0.2, 0.17, -0.05, -0.005, 0.034);
    out.animate = (t) => {
      strip.offset.x = (t * 0.35) % 1;
      const b = 1 + 0.18 * Math.max(0, Math.sin(t * 1.6));
      balloon.scale.set(b, 1.3 * b, b);
    };
    // The surgical light on its stand behind, its face blazing in use.
    const lx = xt - L / 2 - 0.05;
    const lz = -0.4;
    part(g, rbox(0.42, 0.05, 0.14, 0.02), '#cfd8dc', lx + 0.05, 0.08, lz);
    for (const dx of [-0.13, 0.22]) caster(g, lx + dx, lz, 0.03);
    part(g, cyl(0.035, 0.04, 1.9, 12), '#eceff1', lx, 1.03, lz);
    part(g, ball(0.05), '#b0bec5', lx, 1.98, lz);
    const hx2 = xt - 0.1;
    const hz2 = zt + 0.02;
    rod(g, new THREE.Vector3(lx, 1.98, lz), new THREE.Vector3(hx2 + 0.05, 1.86, hz2 - 0.06), 0.02, '#eceff1');
    rod(g, new THREE.Vector3(hx2 + 0.05, 1.86, hz2 - 0.06), new THREE.Vector3(hx2, 1.68, hz2), 0.016, '#eceff1');
    const lamp = new THREE.Group();
    lamp.position.set(hx2, 1.62, hz2);
    lamp.rotation.z = 0.1;
    g.add(lamp);
    part(lamp, cyl(0.1, 0.22, 0.1, 24), '#eceff1', 0, 0.02, 0);
    part(lamp, cyl(0.21, 0.21, 0.008, 24), '#b0bec5', 0, -0.035, 0, { outline: false });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      part(lamp, cyl(0.028, 0.028, 0.01, 10), '#cfd8dc', Math.cos(a) * 0.13, -0.04, Math.sin(a) * 0.13, { outline: false });
    }
    glowing(alongside(use, lamp), cyl(0.2, 0.2, 0.006, 24), '#fffbe6', 0, -0.042, 0);
    // The instrument tray over the foot, on its stand; a kick bucket at the corner.
    const mx = -W / 2 + 0.12;
    part(g, rbox(0.06, 0.04, 0.42, 0.01), '#b0bec5', mx, 0.03, zt);
    part(g, cyl(0.014, 0.014, top + 0.16, 8), CHROME, mx, (top + 0.16) / 2, zt, { outline: false });
    rod(g, new THREE.Vector3(mx, top + 0.16, zt), new THREE.Vector3(mx + 0.22, top + 0.16, zt), 0.012, CHROME);
    part(g, rbox(0.34, 0.018, 0.26, 0.006), STEEL, mx + 0.2, top + 0.18, zt);
    part(g, box(0.32, 0.004, 0.24), '#5fa595', mx + 0.2, top + 0.191, zt, { outline: false });
    for (let i = 0; i < 5; i++) {
      const x = mx + 0.08 + i * 0.055;
      part(g, box(0.01, 0.005, 0.13), CHROME, x, top + 0.196, zt - 0.02, { outline: false });
      part(g, ring(0.01, 0.0025), CHROME, x, top + 0.196, zt + 0.06, { rx: Math.PI / 2, outline: false });
    }
    part(g, cyl(0.11, 0.09, 0.22, 16), STEEL, -W / 2 + 0.16, 0.13, 0.3);
    part(g, cyl(0.1, 0.1, 0.008, 16), '#78909c', -W / 2 + 0.16, 0.24, 0.3, { outline: false });
    // Operated on standing at its front, the hands in the field.
    const field = marker(g, xt - 0.1, top + 0.14, zt + 0.04);
    out.work = field;
    out.spots = { '*': stoodAt(g, xt - 0.05, zt + Wt / 2 + 0.24, field, 'tinker') };
  },

  /**
   * An X-ray table for animals: a dark carbon top on a white base with the film tray's slot in its
   * front, a blue foam trough and sandbags on it; the tube column at the back carrying the tube head
   * out over the table, its collimator throwing a lit square with a cross on the patient while it's
   * used; a radiation sign and a lead apron on the column; the console beside, the last picture (a
   * dog's chest) up on its screen, the exposure switch on its coiled cord. In use a dog lies on its
   * side in the trough. The patient's positioned standing at the front.
   */
  vtXrayTable(g, W, _D, _c, _def, _ctx, out) {
    const top = 0.78;
    const L = 1.25;
    const xt = -W / 2 + L / 2 + 0.06;
    const zt = -0.04;
    const d = 0.62;
    // The base: two white pedestals, the top across them, the tray slot.
    for (const sx of [-1, 1]) part(g, rbox(0.3, top - 0.08, d - 0.1, 0.03), '#f1f3f4', xt + sx * (L / 2 - 0.22), (top - 0.08) / 2, zt);
    part(g, rbox(L - 0.4, 0.12, d - 0.14, 0.02), '#e0e4e7', xt, top - 0.12, zt);
    part(g, box(L - 0.5, 0.03, 0.01), BLACK, xt, top - 0.12, zt + d / 2 - 0.065, { outline: false });
    part(g, rbox(L, 0.05, d, 0.015), '#eceff1', xt, top - 0.04, zt);
    part(g, box(L - 0.06, 0.012, d - 0.06), '#263238', xt, top - 0.01, zt, { outline: false });
    label(g, '방사선 촬영대', 0.26, 0.05, xt - L / 2 + 0.3, top - 0.25, zt + d / 2 - 0.045, '#f1f3f4', '#455a64');
    // The foam trough and two sandbags.
    for (const sz of [-1, 1]) part(g, rbox(0.5, 0.08, 0.14, 0.02), FOAM, xt - 0.05, top + 0.035, zt + sz * 0.15, { rx: -sz * 0.35 });
    for (const dx of [-0.42, 0.36]) part(g, rbox(0.16, 0.05, 0.1, 0.025), '#8d6e63', xt + dx, top + 0.025, zt + 0.18, { ry: dx });
    // In use: the cat laid on its side in the trough, the light square on it.
    const use = new THREE.Group();
    g.add(use);
    pup(use, xt - 0.05, top + 0.0, zt, '#e0c097', 'side', -Math.PI / 2).scale.setScalar(0.85);
    glowing(use, box(0.42, 0.003, 0.3), '#fff59d', xt - 0.05, top + 0.004, zt);
    glowing(use, box(0.42, 0.006, 0.006), '#ff8f00', xt - 0.05, top + 0.006, zt);
    glowing(use, box(0.006, 0.006, 0.3), '#ff8f00', xt - 0.05, top + 0.006, zt);
    out.inUse = use;
    // The tube column at the back, the arm out over the table, the tube head and its collimator.
    const cx = xt + L / 2 + 0.06;
    const cz = zt - d / 2 + 0.02;
    part(g, rbox(0.3, 0.06, 0.3, 0.02), '#90a4ae', cx, 0.03, cz);
    part(g, rbox(0.14, 1.95, 0.14, 0.02), '#eceff1', cx, 1.0, cz);
    part(g, box(0.02, 1.7, 0.02), '#b0bec5', cx, 1.0, cz + 0.071, { outline: false });
    part(g, rbox(0.2, 0.16, 0.2, 0.02), '#cfd8dc', cx, 1.55, cz);
    const ax = xt - 0.05;
    part(g, rbox(cx - ax + 0.08, 0.1, 0.12, 0.02), '#eceff1', (cx + ax) / 2, 1.55, cz + 0.04);
    part(g, cyl(0.11, 0.11, 0.36, 20), '#f5f5f5', ax, 1.45, zt - 0.02, { rz: Math.PI / 2 });
    for (const sx of [-1, 1]) part(g, cyl(0.115, 0.115, 0.03, 20), '#b0bec5', ax + sx * 0.17, 1.45, zt - 0.02, { rz: Math.PI / 2 });
    part(g, rbox(0.2, 0.16, 0.2, 0.02), '#e0e0e0', ax, 1.28, zt - 0.02);
    part(g, box(0.16, 0.01, 0.16), '#37474f', ax, 1.195, zt - 0.02, { outline: false });
    for (const dx of [-0.07, 0.07]) part(g, cyl(0.014, 0.014, 0.02, 10), '#455a64', ax + dx, 1.28, zt + 0.085, { rx: Math.PI / 2 });
    rod(g, new THREE.Vector3(ax - 0.1, 1.3, zt + 0.09), new THREE.Vector3(ax - 0.1, 1.22, zt + 0.15), 0.012, '#455a64');
    rod(g, new THREE.Vector3(ax + 0.1, 1.3, zt + 0.09), new THREE.Vector3(ax + 0.1, 1.22, zt + 0.15), 0.012, '#455a64');
    rod(g, new THREE.Vector3(ax - 0.1, 1.22, zt + 0.15), new THREE.Vector3(ax + 0.1, 1.22, zt + 0.15), 0.012, '#455a64');
    // The beam's glow down from the collimator while it's used.
    const beam = new THREE.Mesh(cyl(0.08, 0.2, 1.19 - top - 0.02, 4), new THREE.MeshBasicMaterial({ color: '#fff9c4', transparent: true, opacity: 0.12, depthWrite: false }));
    beam.userData.ownMaterial = true;
    beam.position.set(ax, (1.19 + top) / 2, zt - 0.02);
    beam.rotation.y = Math.PI / 4;
    use.add(beam);
    // The radiation sign, the lead apron on its hook.
    label(g, '방사선 주의', 0.13, 0.05, cx, 1.25, cz + 0.072, '#fdd835', '#212121');
    part(g, cyl(0.01, 0.01, 0.08, 6), CHROME, cx + 0.08, 1.1, cz, { rz: Math.PI / 2, outline: false });
    part(g, rbox(0.3, 0.6, 0.04, 0.03), '#1565c0', cx + 0.24, 0.8, cz + 0.02);
    part(g, rbox(0.12, 0.07, 0.05, 0.03), '#1565c0', cx + 0.24, 1.08, cz + 0.02);
    part(g, rbox(0.24, 0.05, 0.03, 0.02), '#0d47a1', cx + 0.24, 0.62, cz + 0.045);
    // The console beside the column: the last picture on its screen, the hand switch on its cord.
    const kx = W / 2 - 0.16;
    const kz = 0.1;
    part(g, rbox(0.26, 0.92, 0.3, 0.02), '#eceff1', kx, 0.46, kz);
    part(g, box(0.27, 0.03, 0.31), '#4db6ac', kx, 0.86, kz, { outline: false });
    for (let i = 0; i < 4; i++) glowing(g, ball(0.012), ['#66bb6a', '#fdd835', '#ffffff', '#ef5350'][i], kx - 0.08 + i * 0.05, 0.8, kz + 0.152);
    const scr = new THREE.Group();
    scr.position.set(kx - 0.04, 1.1, kz);
    scr.rotation.y = -0.5;
    g.add(scr);
    part(scr, rbox(0.06, 0.18, 0.04, 0.01), BLACK, 0, -0.13, -0.02);
    part(scr, rbox(0.4, 0.28, 0.04, 0.015), BLACK, 0, 0, 0);
    out.screen = litScreen(scr, painted('vt-petxray', 384, 256, paintPetXray), 0.37, 0.25, 0, 0, 0.022);
    part(g, rbox(0.05, 0.12, 0.05, 0.02), '#cfd8dc', kx + 0.1, 0.98, kz + 0.1);
    part(g, cyl(0.016, 0.016, 0.01, 10), '#e53935', kx + 0.1, 1.045, kz + 0.1, { outline: false });
    for (let i = 0; i < 6; i++) part(g, ring(0.025, 0.004), '#424242', kx + 0.135, 0.88 - i * 0.02, kz + 0.12, { rx: Math.PI / 2, outline: false });
    // Positioned standing at its front, the hands on the patient.
    const pat = marker(g, xt - 0.05, top + 0.12, zt + 0.02);
    out.work = pat;
    out.spots = { '*': stoodAt(g, xt - 0.05, zt + d / 2 + 0.22, pat, 'tinker') };
  },

  /**
   * A raised bathing tub: a deep stainless basin on legs with a grating in the bottom, the splashback
   * behind with the mixer tap, the shower hose and its sprayer on a hook, a shelf of shampoos; the
   * grooming arm's loop over the tub; a blower on its stand and a stack of towels beside. In use a
   * small dog stands in the water lathered up. Washed standing at the front, the hands in its coat.
   */
  vtGroomTub(g, W, _D, _c, _def, ctx, out) {
    const rim = 0.95;
    const bot = 0.6;
    const L = 1.2;
    const d = 0.6;
    const xt = -W / 2 + L / 2 + 0.05;
    const zt = -0.08;
    // The legs and the cross bars.
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) part(g, cyl(0.025, 0.025, bot, 10), CHROME, xt + sx * (L / 2 - 0.06), bot / 2, zt + sz * (d / 2 - 0.06), { outline: false });
    part(g, box(L - 0.12, 0.025, 0.025), CHROME, xt, 0.18, zt + d / 2 - 0.06, { outline: false });
    part(g, cyl(0.03, 0.03, 0.3, 8), '#b0bec5', xt + 0.2, 0.45, zt, { outline: false });
    // The basin: bottom, four walls, a rolled rim.
    part(g, box(L, 0.03, d), STEEL, xt, bot, zt);
    for (const sz of [-1, 1]) part(g, box(L, rim - bot, 0.025), STEEL, xt, (rim + bot) / 2, zt + sz * (d / 2 - 0.0125));
    for (const sx of [-1, 1]) part(g, box(0.025, rim - bot, d), STEEL, xt + sx * (L / 2 - 0.0125), (rim + bot) / 2, zt);
    for (const sz of [-1, 1]) part(g, cyl(0.016, 0.016, L, 8), CHROME, xt, rim, zt + sz * (d / 2), { rz: Math.PI / 2, outline: false });
    for (const sx of [-1, 1]) part(g, cyl(0.016, 0.016, d, 8), CHROME, xt + sx * (L / 2), rim, zt, { rx: Math.PI / 2, outline: false });
    for (let i = 0; i < 9; i++) part(g, box(0.012, 0.01, d - 0.1), '#90a4ae', xt - 0.4 + i * 0.1, bot + 0.022, zt, { outline: false });
    // The splashback with the tap, the hose to the sprayer on its hook, the shampoo shelf.
    const bz = zt - d / 2 - 0.03;
    part(g, rbox(L, 0.6, 0.03, 0.01), '#e0f2f1', xt, rim + 0.3, bz);
    if (!ctx.againstWall) part(g, box(L, rim, 0.03), '#cfd8dc', xt, rim / 2, bz, { outline: false });
    const fx = xt + 0.2;
    part(g, rbox(0.16, 0.06, 0.06, 0.02), CHROME, fx, rim + 0.24, bz + 0.04);
    for (const dx of [-0.06, 0.06]) part(g, cyl(0.02, 0.02, 0.05, 10), dx < 0 ? '#e53935' : '#1e88e5', fx + dx, rim + 0.29, bz + 0.05);
    rod(g, new THREE.Vector3(fx, rim + 0.21, bz + 0.05), new THREE.Vector3(fx - 0.15, rim + 0.02, bz + 0.12), 0.012, '#90a4ae');
    rod(g, new THREE.Vector3(fx - 0.15, rim + 0.02, bz + 0.12), new THREE.Vector3(fx - 0.3, rim + 0.3, bz + 0.07), 0.012, '#90a4ae');
    part(g, rbox(0.04, 0.05, 0.04, 0.01), CHROME, fx - 0.3, rim + 0.35, bz + 0.05);
    part(g, cyl(0.035, 0.02, 0.07, 12), CHROME, fx - 0.3, rim + 0.4, bz + 0.07, { rx: -0.5 });
    const sy = rim + 0.48;
    part(g, rbox(0.42, 0.02, 0.12, 0.006), CHROME, xt - 0.3, sy, bz + 0.07);
    ([['#ffb74d', 0.2], ['#81d4fa', 0.17], ['#f48fb1', 0.14], ['#c5e1a5', 0.18]] as const).forEach(([k, hh], i) => {
      const x = xt - 0.46 + i * 0.1;
      part(g, rbox(0.07, hh, 0.05, 0.015), k, x, sy + hh / 2 + 0.01, bz + 0.07);
      part(g, cyl(0.012, 0.012, 0.03, 8), '#ffffff', x, sy + hh + 0.025, bz + 0.07, { outline: false });
    });
    label(g, '저자극 샴푸', 0.2, 0.04, xt - 0.3, sy - 0.04, bz + 0.135, '#ffffff', '#00796b');
    // The grooming arm and its loop at the left end.
    const gx = xt - L / 2 + 0.05;
    part(g, rbox(0.06, 0.06, 0.06, 0.01), '#546e7a', gx, rim + 0.02, zt - 0.1);
    part(g, cyl(0.014, 0.014, 0.65, 8), CHROME, gx, rim + 0.34, zt - 0.1, { outline: false });
    rod(g, new THREE.Vector3(gx, rim + 0.66, zt - 0.1), new THREE.Vector3(gx + 0.32, rim + 0.66, zt - 0.02), 0.012, CHROME);
    rod(g, new THREE.Vector3(gx + 0.32, rim + 0.66, zt - 0.02), new THREE.Vector3(gx + 0.32, rim + 0.42, zt - 0.02), 0.004, '#e53935');
    part(g, ring(0.05, 0.005), '#e53935', gx + 0.32, rim + 0.38, zt - 0.02, { outline: false });
    // The blower on its stand, the hose looped to its nozzle; the towels.
    const dx0 = W / 2 - 0.2;
    part(g, rbox(0.3, 0.04, 0.3, 0.02), '#455a64', dx0, 0.02, -0.15);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) caster(g, dx0 + sx * 0.12, -0.15 + sz * 0.12, 0.025);
    part(g, cyl(0.02, 0.02, 0.6, 8), CHROME, dx0, 0.36, -0.15, { outline: false });
    part(g, rbox(0.28, 0.22, 0.2, 0.05), '#1e88e5', dx0, 0.76, -0.15);
    part(g, cyl(0.07, 0.07, 0.02, 16), '#0d47a1', dx0, 0.76, -0.05, { rx: Math.PI / 2 });
    for (let i = 0; i < 4; i++) part(g, box(0.1, 0.006, 0.004), '#90caf9', dx0, 0.73 + i * 0.02, -0.038, { outline: false });
    rod(g, new THREE.Vector3(dx0, 0.68, -0.05), new THREE.Vector3(dx0 + 0.05, 0.4, 0.05), 0.022, '#37474f');
    rod(g, new THREE.Vector3(dx0 + 0.05, 0.4, 0.05), new THREE.Vector3(dx0 - 0.04, 0.9, 0.0), 0.022, '#37474f');
    part(g, cyl(0.02, 0.03, 0.1, 10), '#263238', dx0 - 0.05, 0.94, 0.0);
    const shelfY = 0.32;
    part(g, rbox(0.28, 0.02, 0.24, 0.006), '#b0bec5', W / 2 - 0.2, shelfY, 0.25);
    for (const sx of [-1, 1]) part(g, cyl(0.012, 0.012, shelfY, 6), CHROME, W / 2 - 0.2 + sx * 0.12, shelfY / 2, 0.25, { outline: false });
    towels(g, W / 2 - 0.2, shelfY + 0.01, 0.25, ['#ffffff', '#80deea', '#ffffff', '#ffcc80']);
    // Idle: a towel over the rim. In use: the water in the bottom, the dog stood in it lathered up.
    const idle = new THREE.Group();
    g.add(idle);
    part(idle, box(0.3, 0.012, 0.18), '#80deea', xt + 0.3, rim + 0.02, zt + d / 2 - 0.02);
    part(idle, box(0.3, 0.16, 0.012), '#80deea', xt + 0.3, rim - 0.06, zt + d / 2 + 0.02, { outline: false });
    out.idle = idle;
    const use = new THREE.Group();
    g.add(use);
    const water = new THREE.Mesh(box(L - 0.06, 0.06, d - 0.06), WATER);
    water.position.set(xt, bot + 0.045, zt);
    use.add(water);
    pup(use, xt - 0.05, bot + 0.015, zt, '#f3ead9', 'stand', Math.PI / 2 + 0.2);
    const rnd = seeded(11);
    for (let i = 0; i < 14; i++) part(use, ball(0.025 + rnd() * 0.02), '#ffffff', xt - 0.05 + (rnd() - 0.5) * 0.3, bot + 0.3 + rnd() * 0.1, zt + (rnd() - 0.5) * 0.14, { outline: false });
    for (let i = 0; i < 6; i++) part(use, ball(0.015 + rnd() * 0.015), '#e1f5fe', xt - 0.3 + rnd() * 0.6, bot + 0.08, zt + (rnd() - 0.5) * 0.4, { outline: false });
    out.inUse = use;
    // Washed from the front, the hands working the lather into its back.
    const coat = marker(g, xt - 0.05, bot + 0.36, zt + 0.06);
    out.work = coat;
    out.spots = { '*': stoodAt(g, xt - 0.05, zt + d / 2 + 0.22, coat, 'scrub') };
  },

  /**
   * The shelf of prescription diets and supplies: white shelving with a sign along the top, the price
   * strip on each shelf's edge; big bags of the prescription diets (kidney, joints, weight, allergy)
   * on the bottom, cans stacked and smaller bags above, treat jars and shampoos, the boxed heartworm
   * and flea treatments and some toys at the top, leashes hung on hooks down the side. In use an
   * opened carton of stock on the floor. Stocked standing at it, reaching into the shelves.
   */
  vtFoodShelf(g, W, D, c, _def, _ctx, out) {
    const d = 0.42;
    const z = -D / 2 + d / 2 + 0.03;
    const zf = z + d / 2;
    const Wd = W - 0.3;
    const H = 1.8;
    const x0 = -0.1;
    for (const sx of [-1, 1]) part(g, box(0.03, H, d), '#f5f5f5', x0 + sx * (Wd / 2), H / 2, z);
    part(g, box(Wd, H, 0.02), '#d7ccc8', x0, H / 2, z - d / 2 + 0.01, { outline: false });
    part(g, box(Wd, 0.1, d - 0.02), '#ffffff', x0, 0.05, z);
    const levels = [0.1, 0.55, 0.95, 1.35];
    for (const y of levels) {
      part(g, box(Wd, 0.025, d), '#ffffff', x0, y, z);
      part(g, box(Wd, 0.035, 0.008), '#fff59d', x0, y - 0.005, zf + 0.004, { outline: false });
    }
    part(g, rbox(Wd + 0.04, 0.03, d + 0.02, 0.01), '#ffffff', x0, H, z);
    part(g, rbox(Wd, 0.16, 0.03, 0.01), c, x0, H + 0.1, zf - 0.04);
    label(g, '처방식 · 반려용품', Wd - 0.2, 0.11, x0, H + 0.1, zf - 0.024, c, '#ffffff');
    // The bottom: the big bags of the prescription diets, each labelled.
    const bags: Array<[string, string]> = [['#c62828', '신장'], ['#1565c0', '관절'], ['#2e7d32', '체중'], ['#6a1b9a', '알러지'], ['#ef6c00', '소화기']];
    const bw = (Wd - 0.06) / bags.length;
    bags.forEach(([k, s], i) => {
      const x = x0 - Wd / 2 + 0.03 + bw * (i + 0.5);
      part(g, rbox(bw - 0.04, 0.38, 0.16, 0.04), k, x, levels[0] + 0.2, z + 0.04, { rz: (i % 2 ? 0.03 : -0.02) });
      part(g, rbox(bw - 0.08, 0.1, 0.01, 0.01), '#ffffff', x, levels[0] + 0.24, z + 0.125, { outline: false });
      label(g, s, bw - 0.12, 0.055, x, levels[0] + 0.24, z + 0.131, '#ffffff', k);
      part(g, ball(0.02), tint(k, 0.6), x, levels[0] + 0.34, z + 0.122, { outline: false });
    });
    // The second shelf: cans in stacks, small bags.
    const rnd = seeded(23);
    for (let i = 0; i < 4; i++) {
      const x = x0 - Wd / 2 + 0.14 + i * 0.13;
      const k = ['#ffb74d', '#4fc3f7', '#e57373', '#aed581'][i];
      for (let j = 0; j < 3; j++) {
        part(g, cyl(0.04, 0.04, 0.07, 14), CHROME, x, levels[1] + 0.05 + j * 0.075, zf - 0.08);
        part(g, cyl(0.041, 0.041, 0.045, 14), k, x, levels[1] + 0.05 + j * 0.075, zf - 0.08, { outline: false });
      }
    }
    for (let i = 0; i < 3; i++) {
      const x = x0 + 0.24 + i * 0.17;
      const k = ['#ffcc80', '#b39ddb', '#80cbc4'][i];
      part(g, rbox(0.14, 0.26, 0.09, 0.03), k, x, levels[1] + 0.14, z + 0.04);
      part(g, ball(0.03), '#ffffff', x, levels[1] + 0.16, z + 0.09, { outline: false });
    }
    // The third: treat jars and shampoos.
    for (let i = 0; i < 4; i++) {
      const x = x0 - Wd / 2 + 0.14 + i * 0.13;
      glass(g, cyl(0.045, 0.045, 0.18, 14), x, levels[2] + 0.1, zf - 0.1);
      const k = ['#a1887f', '#ffcc80', '#e57373', '#d7ccc8'][i];
      part(g, cyl(0.04, 0.04, 0.11, 14), k, x, levels[2] + 0.07, zf - 0.1, { outline: false });
      part(g, cyl(0.048, 0.048, 0.025, 14), '#ff7043', x, levels[2] + 0.2, zf - 0.1);
    }
    for (let i = 0; i < 5; i++) {
      const x = x0 + 0.22 + i * 0.1;
      const hh = 0.15 + rnd() * 0.07;
      const k = ['#81d4fa', '#f48fb1', '#c5e1a5', '#fff59d', '#b39ddb'][i];
      part(g, rbox(0.07, hh, 0.05, 0.015), k, x, levels[2] + hh / 2 + 0.012, zf - 0.1);
      part(g, cyl(0.012, 0.012, 0.03, 8), '#ffffff', x, levels[2] + hh + 0.027, zf - 0.1, { outline: false });
    }
    // The top: the boxed treatments, a few toys.
    for (let i = 0; i < 6; i++) {
      const x = x0 - Wd / 2 + 0.12 + i * 0.1;
      part(g, rbox(0.085, 0.14, 0.1, 0.008), '#ffffff', x, levels[3] + 0.08, zf - 0.1);
      part(g, box(0.087, 0.035, 0.102), i < 3 ? '#e53935' : '#1e88e5', x, levels[3] + 0.11, zf - 0.1, { outline: false });
    }
    label(g, '심장사상충 · 외부기생충', 0.56, 0.05, x0 - Wd / 2 + 0.37, levels[3] + 0.025, zf + 0.012, '#ffffff', '#c62828');
    part(g, ball(0.05), '#c0ca33', x0 + 0.38, levels[3] + 0.06, zf - 0.12);
    part(g, ball(0.045), '#ef5350', x0 + 0.5, levels[3] + 0.055, zf - 0.08);
    part(g, ring(0.06, 0.016), '#ff9800', x0 + 0.66, levels[3] + 0.08, zf - 0.12, { rx: 0.2 });
    rod(g, new THREE.Vector3(x0 + 0.22, levels[3] + 0.04, zf - 0.1), new THREE.Vector3(x0 + 0.3, levels[3] + 0.04, zf - 0.16), 0.018, '#8d6e63');
    // Leashes and collars on hooks down the right side.
    const hx = x0 + Wd / 2 + 0.03;
    ([['#e53935', 1.5], ['#1e88e5', 1.35], ['#43a047', 1.2], ['#ff9800', 1.05]] as const).forEach(([k, y], i) => {
      const zz = z - 0.12 + i * 0.09;
      part(g, cyl(0.006, 0.006, 0.05, 6), CHROME, hx + 0.02, y, zz, { rz: Math.PI / 2, outline: false });
      part(g, box(0.012, 0.42, 0.02), k, hx + 0.045, y - 0.21, zz, { outline: false });
      part(g, ring(0.035, 0.008), k, hx + 0.045, y - 0.02, zz, { ry: Math.PI / 2, outline: false });
      part(g, rbox(0.02, 0.03, 0.03, 0.006), CHROME, hx + 0.045, y - 0.43, zz);
    });
    // In use: the opened carton of new stock at the feet.
    const use = new THREE.Group();
    g.add(use);
    part(use, box(0.36, 0.26, 0.28), '#c8a165', x0 + 0.5, 0.13, zf + 0.2);
    for (const sx of [-1, 1]) part(use, box(0.02, 0.14, 0.28), '#b8915a', x0 + 0.5 + sx * 0.22, 0.29, zf + 0.2, { rz: -sx * 0.6, outline: false });
    for (let i = 0; i < 3; i++) part(use, cyl(0.04, 0.04, 0.07, 12), '#ffb74d', x0 + 0.42 + i * 0.08, 0.28, zf + 0.2);
    out.inUse = use;
    // Stocked standing at it, a hand into the shelves.
    const reach = marker(g, x0 - 0.05, levels[2] + 0.12, zf - 0.06);
    out.work = reach;
    out.spots = { '*': stoodAt(g, x0 - 0.05, zf + 0.42, reach, 'rummage') };
  },

  /**
   * A walk-on scale: a low platform with a ribbed rubber mat, its post at the side carrying the
   * display (the weight glowing green while someone's on it) with the weight log clipped under it and a
   * jar of treats. In use a dog sits on it. Weighed standing at the front, writing it in the log.
   */
  vtScale(g, _W, _D, c, _def, _ctx, out) {
    const pw = 0.62;
    const pd = 0.7;
    const px = -0.1;
    part(g, rbox(pw, 0.07, pd, 0.02), '#cfd8dc', px, 0.035, -0.02);
    part(g, rbox(pw - 0.06, 0.012, pd - 0.06, 0.01), BLACK, px, 0.076, -0.02);
    for (let i = 0; i < 10; i++) part(g, box(pw - 0.1, 0.005, 0.012), '#37474f', px, 0.084, -0.02 - (pd - 0.14) / 2 + i * ((pd - 0.14) / 9), { outline: false });
    part(g, box(pw, 0.012, 0.02), c, px, 0.05, -0.02 + pd / 2 + 0.002, { outline: false });
    // The post and its display, turned towards the front.
    const sx = px + pw / 2 + 0.08;
    const sz = -0.18;
    part(g, rbox(0.14, 0.04, 0.14, 0.01), '#90a4ae', sx, 0.02, sz);
    part(g, cyl(0.025, 0.025, 0.95, 10), CHROME, sx, 0.5, sz, { outline: false });
    const head = new THREE.Group();
    head.position.set(sx, 1.02, sz);
    head.rotation.y = -0.45;
    g.add(head);
    part(head, rbox(0.26, 0.15, 0.08, 0.02), '#eceff1', 0, 0, 0);
    part(head, box(0.27, 0.03, 0.081), c, 0, -0.06, 0, { outline: false });
    out.screen = litScreen(head, painted('vt-weight', 192, 96, paintWeight), 0.2, 0.1, 0, 0.01, 0.042);
    for (const [dx, k] of [[-0.08, '#66bb6a'], [0.08, '#ef5350']] as const) part(head, cyl(0.012, 0.012, 0.01, 10), k, dx, -0.06, 0.045, { rx: Math.PI / 2, outline: false });
    label(head, '체중계', 0.1, 0.03, 0, 0.1, 0.0, '#eceff1', '#455a64');
    glass(head, cyl(0.04, 0.04, 0.09, 12), 0.09, 0.12, -0.0);
    for (let i = 0; i < 4; i++) part(head, box(0.04, 0.012, 0.016), '#a1887f', 0.09, 0.09 + i * 0.015, 0, { ry: i, outline: false });
    // The log, on its clipboard hung on the post.
    clipboard(g, sx - 0.03, 0.78, sz + 0.05, -0.45, -0.1);
    // In use: the dog sat on the mat.
    const use = new THREE.Group();
    g.add(use);
    pup(use, px, 0.09, -0.04, '#6d4c41', 'sit');
    out.inUse = use;
    // Stood at the front beside it, writing the weight down.
    const log = marker(g, sx - 0.06, 0.82, sz + 0.12);
    out.work = log;
    out.spots = { '*': stoodAt(g, px + 0.12, 0.52, log, 'write', Math.PI - 0.35) };
  },

  /**
   * The vaccination chart: a framed board on the waiting-room wall, the puppies' and kittens'
   * schedules side by side, the monthly heartworm reminder and the opening hours under them; a rack
   * of leaflets below with a paw-print sticker. Off a wall it stands on two legs.
   */
  vtVaccineBoard(g, W, D, _c, _def, ctx, out) {
    const wall = ctx.againstWall;
    const zb = -D / 2 + (wall ? 0.03 : 0.25);
    const bw = Math.min(W - 0.3, 1.5);
    const bh = bw * 0.625;
    const y = 1.45;
    if (!wall) {
      for (const sx of [-1, 1]) {
        part(g, rbox(0.05, y, 0.05, 0.01), '#8d6e63', sx * (bw / 2 - 0.1), y / 2, zb);
        part(g, rbox(0.08, 0.04, 0.4, 0.01), '#6d4c41', sx * (bw / 2 - 0.1), 0.02, zb);
      }
    }
    part(g, rbox(bw + 0.08, bh + 0.08, 0.04, 0.015), '#a1887f', 0, y, zb);
    picture(g, painted('vt-vaccines', 512, 320, paintVaccines), bw, bh, 0, y, zb + 0.022);
    // The leaflet rack.
    const ry = y - bh / 2 - 0.3;
    part(g, rbox(0.6, 0.22, 0.05, 0.01), '#eceff1', 0, ry, zb + 0.03);
    for (let i = 0; i < 3; i++) {
      const x = -0.2 + i * 0.2;
      glass(g, box(0.17, 0.14, 0.03), x, ry - 0.02, zb + 0.07);
      part(g, box(0.14, 0.18, 0.006), ['#ffcc80', '#a5d6a7', '#90caf9'][i], x, ry + 0.01, zb + 0.065, { outline: false, rx: -0.12 });
    }
    label(g, '가져가세요', 0.22, 0.05, 0, ry + 0.15, zb + 0.056, '#eceff1', '#6d4c41');
    out.work = marker(g, 0, y, zb + 0.1);
  },
};
