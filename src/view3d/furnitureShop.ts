import * as THREE from 'three';
import { DARK, WHITE, WOOD, marker, rod, screenMesh, shade, spot, tint, type Builder } from './parts';
import { ball, box, canvasTexture, cyl, part, rbox, toon } from './toon';

/**
 * Shops and work fixtures drawn as themselves (2026-10-26, at the user's request): the studio light,
 * drafting table, model table, makeup vanity, salon chair, bakery display, judge's bench and mukbang
 * table. Each keeps the markers its use needs: the chair it's sat at (seat), where the hands go
 * (work), the judge's seat facing the courtroom (a spot).
 */

const BLACK = '#2b2b30';
const STEEL = '#c3cad0';
const CHROME = '#e3e7ea';
const GOLD = '#c9a227';

/** Lit parts (bulbs, LEDs, a softbox's face): one unlit material a colour, shared like toon()'s. */
const lit = new Map<string, THREE.MeshBasicMaterial>();
function glow(color: string): THREE.MeshBasicMaterial {
  let m = lit.get(color);
  if (!m) lit.set(color, (m = new THREE.MeshBasicMaterial({ color })));
  return m;
}

const GLASS = new THREE.MeshToonMaterial({ color: '#d7f1fb', transparent: true, opacity: 0.3, depthWrite: false });
/** For a flat pane seen from both sides (a case's end). */
const PANE = new THREE.MeshToonMaterial({ color: '#d7f1fb', transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide });
const MIRROR = toon('#d9eef7', '#5c7c8a');
/** A see-through part (no outline: the frame round it draws the edge). */
function glass(g: THREE.Object3D, geom: THREE.BufferGeometry, x: number, y: number, z: number, rx = 0, ry = 0): THREE.Mesh {
  const m = new THREE.Mesh(geom, GLASS);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, 0);
  m.renderOrder = 2;
  g.add(m);
  return m;
}

/** Shapes made once (never disposed, like toon.ts's shared geometry). */
const shapes = new Map<string, THREE.BufferGeometry>();
function shape(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let s = shapes.get(key);
  if (!s) shapes.set(key, (s = make()));
  return s;
}
const ring = (r: number, t: number, arc = Math.PI * 2) => shape(`ring${r},${t},${arc.toFixed(3)}`, () => new THREE.TorusGeometry(r, t, 8, 24, arc));
/** A 45° set square lying in its xy plane, `s` along each short side. */
const setSquare = (s: number) =>
  shape(`tri${s}`, () => {
    const p = new THREE.Shape();
    p.moveTo(0, 0);
    p.lineTo(s, 0);
    p.lineTo(0, s);
    p.closePath();
    const hole = new THREE.Path();
    hole.moveTo(s * 0.2, s * 0.2);
    hole.lineTo(s * 0.5, s * 0.2);
    hole.lineTo(s * 0.2, s * 0.5);
    hole.closePath();
    p.holes.push(hole);
    return new THREE.ExtrudeGeometry(p, { depth: 0.004, bevelEnabled: false });
  });
const TRIANGLE = new THREE.MeshToonMaterial({ color: '#ff9800', transparent: true, opacity: 0.7 });

/** Words on a plate (a nameplate, a price tag, a sign), painted once a text. */
const labels = new Map<string, THREE.Texture>();
function label(g: THREE.Object3D, text: string, w: number, h: number, x: number, y: number, z: number, bg: string, fg: string, rx = 0, ry = 0): THREE.Mesh {
  const key = `${text}|${bg}|${fg}|${(w / h).toFixed(1)}`;
  let t = labels.get(key);
  if (!t) {
    const ch = 64;
    const cw = Math.round((ch * w) / h / 16) * 16 || 64;
    t = canvasTexture(cw, ch, (x2) => {
      x2.fillStyle = bg;
      x2.fillRect(0, 0, cw, ch);
      x2.fillStyle = fg;
      x2.font = `bold ${Math.round(ch * 0.6)}px "Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif`;
      x2.textAlign = 'center';
      x2.textBaseline = 'middle';
      x2.fillText(text, cw / 2, ch * 0.54, cw * 0.92);
    });
    labels.set(key, t);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, 0);
  g.add(m);
  return m;
}

/** An office chair's five-star base on casters round a gas column, `h` up to the seat's underside. */
function starBase(c: THREE.Object3D, h: number, color = BLACK, r = 0.25) {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    rod(c, new THREE.Vector3(0, 0.09, 0), new THREE.Vector3(Math.sin(a) * r, 0.05, Math.cos(a) * r), 0.016, color);
    part(c, ball(0.026), BLACK, Math.sin(a) * r, 0.026, Math.cos(a) * r, { outline: false });
  }
  part(c, cyl(0.045, 0.05, 0.1, 12), color, 0, 0.1, 0, { outline: false });
  part(c, cyl(0.026, 0.026, h - 0.12, 10), CHROME, 0, 0.12 + (h - 0.12) / 2, 0, { outline: false });
}

export const SHOP_DETAIL: Record<string, Builder> = {
  /**
   * A photo studio's strobe: a tripod (a sandbag over its back leg), a two-stage column with its
   * locking knob, a strobe head on a yoke tipped down a little, a square softbox on its front whose
   * diffuser lights up while it's in use, and the cable down the column to the floor.
   */
  studioLight(g, _W, _D, c, _def, _ctx, out) {
    const hub = 0.5;
    for (let i = 0; i < 3; i++) {
      const a = Math.PI + (i / 3) * Math.PI * 2;
      const s = Math.sin(a);
      const k = Math.cos(a);
      rod(g, new THREE.Vector3(s * 0.04, hub, k * 0.04), new THREE.Vector3(s * 0.4, 0.02, k * 0.4), 0.014, BLACK);
      rod(g, new THREE.Vector3(s * 0.03, 0.3, k * 0.03), new THREE.Vector3(s * 0.22, 0.27, k * 0.22), 0.008, BLACK);
      part(g, ball(0.024), '#424242', s * 0.4, 0.022, k * 0.4, { outline: false });
    }
    part(g, cyl(0.035, 0.035, 0.08, 12), BLACK, 0, hub, 0);
    part(g, cyl(0.022, 0.022, 0.75, 10), c, 0, 0.675, 0, { outline: false });
    part(g, cyl(0.032, 0.032, 0.05, 12), BLACK, 0, 1.05, 0);
    part(g, cyl(0.01, 0.01, 0.06, 6), STEEL, 0, 1.05, 0.05, { rx: Math.PI / 2, outline: false });
    part(g, ball(0.022), '#e53935', 0, 1.05, 0.085);
    part(g, cyl(0.016, 0.016, 0.55, 10), STEEL, 0, 1.33, 0, { outline: false });
    part(g, cyl(0.028, 0.028, 0.04, 12), BLACK, 0, 1.6, 0);
    // A sandbag over the back leg keeps it from tipping.
    part(g, rbox(0.2, 0.07, 0.12, 0.03), '#e65100', 0, 0.19, -0.3);
    part(g, box(0.04, 0.072, 0.125), '#3e2723', 0, 0.19, -0.3, { outline: false });
    // The head on its yoke, tipped down at the subject.
    const head = new THREE.Group();
    head.position.set(0, 1.74, 0.02);
    head.rotation.x = 0.28;
    g.add(head);
    part(head, box(0.32, 0.03, 0.05), BLACK, 0, -0.13, -0.18);
    for (const sx of [-1, 1]) {
      part(head, box(0.02, 0.15, 0.04), BLACK, sx * 0.15, -0.06, -0.18, { outline: false });
      part(head, cyl(0.025, 0.025, 0.03, 10), '#616161', sx * 0.17, 0, -0.18, { rz: Math.PI / 2 });
    }
    part(head, cyl(0.085, 0.085, 0.26, 18), '#3a3a40', 0, 0, -0.2, { rx: Math.PI / 2 });
    part(head, cyl(0.075, 0.075, 0.02, 18), BLACK, 0, 0, -0.34, { rx: Math.PI / 2, outline: false });
    for (let i = 0; i < 3; i++) part(head, box(0.1, 0.006, 0.004), '#616161', 0, -0.03 + i * 0.03, -0.352, { outline: false });
    part(head, rbox(0.03, 0.05, 0.14, 0.012), BLACK, 0, 0.11, -0.22);
    part(head, cyl(0.12, 0.12, 0.03, 20), STEEL, 0, 0, -0.06, { rx: Math.PI / 2 });
    // The softbox: a square funnel out to its white face.
    part(head, shape('softbox', () => new THREE.CylinderGeometry(0.4, 0.1, 0.36, 4).rotateY(Math.PI / 4)), BLACK, 0, 0, 0.12, { rx: Math.PI / 2 });
    part(head, box(0.54, 0.54, 0.01), '#e8e6df', 0, 0, 0.302, { outline: false });
    part(head, box(0.5, 0.5, 0.004), '#d9d6cc', 0, 0, 0.308, { outline: false });
    const face = part(head, box(0.52, 0.52, 0.012), '#fffdf0', 0, 0, 0.31, { outline: false, material: glow('#fffdf0') });
    out.inUse = face;
    // Its cable down the column and away along the floor.
    const pts: Array<[number, number, number]> = [[0.03, 1.8, -0.3], [0.035, 1.5, -0.04], [0.03, 1.1, -0.03], [0.03, 0.56, -0.03], [0.05, 0.12, -0.14], [0.18, 0.012, -0.46]];
    for (let i = 1; i < pts.length; i++) rod(g, new THREE.Vector3(...pts[i - 1]), new THREE.Vector3(...pts[i]), 0.008, '#212121');
    out.work = marker(g, 0, 1.08, 0.16);
  },

  /**
   * An architect's drafting table: two steel stands with a brace up to a board tipped up at the back,
   * a pencil ledge along its front; on the board's green vinyl a floor plan taped down, the parallel
   * rule on its wires, a set square and a pencil; a swing-arm lamp clamped to the back corner; a
   * drafting stool with a foot ring pulled up to it.
   */
  draftingTable(g, _W, _D, c, _def, _ctx, out) {
    const frame = shade(c, 0.55);
    for (const sx of [-1, 1]) {
      const x = sx * 0.4;
      part(g, rbox(0.06, 0.04, 0.72, 0.015), frame, x, 0.02, -0.09);
      for (const z of [-0.44, 0.26]) part(g, rbox(0.07, 0.02, 0.05, 0.01), BLACK, x, 0.01, z, { outline: false });
      part(g, rbox(0.05, 0.86, 0.05, 0.015), frame, x, 0.45, -0.2);
      part(g, cyl(0.04, 0.04, 0.035, 14), BLACK, x + sx * 0.035, 0.86, -0.2, { rz: Math.PI / 2 });
      rod(g, new THREE.Vector3(x, 0.5, -0.2), new THREE.Vector3(x, 0.97, -0.36), 0.014, STEEL);
    }
    part(g, cyl(0.02, 0.02, 0.8, 8), frame, 0, 0.2, -0.3, { rz: Math.PI / 2, outline: false });
    // The board and all that's on it, tipped up at the back.
    const b = new THREE.Group();
    b.position.set(0, 0.9, -0.1);
    b.rotation.x = 0.38;
    g.add(b);
    part(b, rbox(0.92, 0.035, 0.64, 0.012), '#f2efe6', 0, 0, 0);
    part(b, box(0.86, 0.004, 0.58), '#cfe6d3', 0, 0.019, 0, { outline: false });
    const top = 0.022;
    part(b, rbox(0.9, 0.035, 0.035, 0.01), shade(c, 0.8), 0, 0.02, 0.335);
    for (const [x, k] of [[-0.3, '#fbc02d'], [-0.22, '#1e88e5'], [0.3, '#e53935']] as const) part(b, cyl(0.005, 0.005, 0.13, 6), k, x, 0.042, 0.33, { rz: Math.PI / 2, outline: false });
    part(b, rbox(0.05, 0.016, 0.022, 0.006), '#f48fb1', 0.15, 0.045, 0.33, { outline: false });
    // The plan: a sheet with its walls, rooms and a title block, taped at the corners.
    part(b, box(0.62, 0.002, 0.44), '#fbfbf8', -0.04, top, -0.04, { outline: false });
    const ink = '#455a64';
    const wall = (x: number, z: number, w: number, d: number) => part(b, box(w, 0.002, d), ink, x, top + 0.002, z, { outline: false });
    wall(-0.08, -0.2, 0.42, 0.008);
    wall(-0.08, 0.1, 0.42, 0.008);
    wall(-0.29, -0.05, 0.008, 0.3);
    wall(0.13, -0.05, 0.008, 0.3);
    wall(-0.08, -0.05, 0.008, 0.3);
    wall(-0.185, -0.08, 0.21, 0.006);
    wall(0.025, 0.0, 0.21, 0.004);
    part(b, box(0.12, 0.002, 0.06), '#cfd8dc', 0.2, top + 0.002, 0.13, { outline: false });
    for (const [x, z] of [[-0.35, -0.26], [0.27, -0.26], [-0.35, 0.18], [0.27, 0.18]]) part(b, box(0.04, 0.003, 0.03), '#fff59d', x, top + 0.003, z, { outline: false });
    // The parallel rule across the board on its wires, a set square on it and a pencil.
    for (const sx of [-1, 1]) part(b, box(0.004, 0.004, 0.6), '#90a4ae', sx * 0.445, top + 0.004, 0, { outline: false });
    part(b, rbox(0.88, 0.014, 0.05, 0.006), '#e0f2f1', 0, top + 0.008, 0.13);
    part(b, box(0.88, 0.016, 0.006), '#37474f', 0, top + 0.009, 0.104, { outline: false });
    for (const sx of [-1, 1]) part(b, rbox(0.03, 0.03, 0.06, 0.008), BLACK, sx * 0.445, top + 0.012, 0.13);
    part(b, setSquare(0.2), '#ff9800', 0.1, top + 0.016, 0.1, { rx: -Math.PI / 2, outline: false, material: TRIANGLE });
    part(b, cyl(0.005, 0.005, 0.16, 6), '#fbc02d', -0.12, top + 0.02, 0.04, { rz: Math.PI / 2, ry: 0.5, outline: false });
    part(b, ball(0.006), DARK, -0.19, top + 0.02, 0.08, { outline: false });
    out.work = marker(b, -0.02, top + 0.01, 0.1);
    // A swing-arm lamp clamped to the back corner, its shade over the plan.
    part(b, rbox(0.04, 0.07, 0.06, 0.01), BLACK, -0.44, 0.03, -0.3);
    const j1 = new THREE.Vector3(-0.42, 0.42, -0.38);
    const j2 = new THREE.Vector3(-0.2, 0.5, -0.1);
    for (const dx of [0, 0.02]) {
      rod(b, new THREE.Vector3(-0.44 + dx, 0.06, -0.3), j1.clone().setX(j1.x + dx), 0.007, '#eceff1');
      rod(b, j1.clone().setX(j1.x + dx), j2.clone().setX(j2.x + dx), 0.007, '#eceff1');
    }
    part(b, ball(0.02), BLACK, j1.x + 0.01, j1.y, j1.z, { outline: false });
    part(b, ball(0.02), BLACK, j2.x + 0.01, j2.y, j2.z, { outline: false });
    part(b, cyl(0.03, 0.085, 0.11, 18), '#ef5350', -0.17, 0.45, -0.06, { rz: 0.3 });
    part(b, ball(0.032), '#fff3c4', -0.155, 0.4, -0.06, { outline: false, material: glow('#fff3c4') });
    // The stool, pulled up to the front.
    const s = new THREE.Group();
    s.position.set(0, 0, 0.38);
    g.add(s);
    starBase(s, 0.48, BLACK, 0.24);
    part(s, ring(0.19, 0.012), STEEL, 0, 0.3, 0, { rx: Math.PI / 2, outline: false });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      rod(s, new THREE.Vector3(0, 0.3, 0), new THREE.Vector3(Math.sin(a) * 0.19, 0.3, Math.cos(a) * 0.19), 0.008, STEEL);
    }
    part(s, cyl(0.2, 0.19, 0.07, 22), '#455a64', 0, 0.485, 0);
    part(s, rbox(0.03, 0.24, 0.02, 0.008), STEEL, 0, 0.62, 0.17);
    part(s, rbox(0.3, 0.13, 0.05, 0.03), '#455a64', 0, 0.76, 0.17);
    out.seat = marker(g, 0, 0.52, 0.38);
  },

  /**
   * An architecture studio's model bench: a butcher-block top on a sturdy frame, a pegboard of tools
   * up the back, rolls of paper and foam board on the shelf under it; on top a green cutting mat
   * (foam board being cut, a steel rule, a craft knife), and the white model on its base — a stepped
   * tower with a glass front, a low wing, a round pavilion with a roof garden, a canopy on columns,
   * a road with two little cars, trees — under a magnifier lamp.
   */
  modelTable(g, W, D, c, _def, _ctx, out) {
    const top = 0.9;
    const d = D - 0.12;
    const zc = 0.03;
    const frame = shade(c, 0.6);
    for (const sx of [-1, 1]) {
      part(g, rbox(0.07, top - 0.05, 0.07, 0.015), frame, sx * (W / 2 - 0.1), (top - 0.05) / 2, zc + d / 2 - 0.08);
      part(g, rbox(0.07, top + 0.62, 0.07, 0.015), frame, sx * (W / 2 - 0.1), (top + 0.62) / 2, -D / 2 + 0.06);
    }
    part(g, rbox(W - 0.2, 0.08, 0.04, 0.01), frame, 0, top - 0.09, zc + d / 2 - 0.08);
    part(g, rbox(W - 0.06, 0.05, d, 0.015), '#d9b98b', 0, top - 0.025, zc);
    part(g, box(W - 0.08, 0.012, 0.012), '#b98f5d', 0, top - 0.035, zc + d / 2 + 0.001, { outline: false });
    // The shelf underneath: foam board, balsa sticks, rolls of paper.
    part(g, rbox(W - 0.24, 0.03, d - 0.16, 0.01), shade(c, 0.8), 0, 0.18, zc - 0.02);
    for (let i = 0; i < 4; i++) part(g, box(0.6, 0.014, 0.42), i % 2 ? '#ffe0b2' : '#ffffff', -0.42, 0.203 + i * 0.016, zc - 0.02, { outline: false });
    for (let i = 0; i < 6; i++) part(g, box(0.7, 0.014, 0.014), '#e6c89a', 0.38, 0.203 + (i % 2) * 0.015, zc + 0.12 + Math.floor(i / 2) * 0.016, { outline: false });
    for (const [i, k] of ['#ffffff', '#fffde7', '#e3f2fd'].entries()) part(g, cyl(0.035, 0.035, 0.6, 14), k, 0.38, 0.23 + (i === 2 ? 0.06 : 0), zc - 0.17 + (i % 2) * 0.075 + (i === 2 ? 0.035 : 0), { rz: Math.PI / 2 });
    // The pegboard up the back, its tools.
    const pz = -D / 2 + 0.06;
    part(g, rbox(W - 0.27, 0.56, 0.025, 0.01), '#e6dccd', 0, top + 0.32, pz);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 3; j++) part(g, box(0.012, 0.012, 0.004), '#b8a990', -0.75 + i * 0.21, top + 0.16 + j * 0.16, pz + 0.014, { outline: false });
    part(g, box(0.5, 0.025, 0.006), STEEL, -0.45, top + 0.48, pz + 0.02);
    part(g, box(0.025, 0.25, 0.006), STEEL, -0.62, top + 0.3, pz + 0.02);
    part(g, box(0.18, 0.025, 0.006), STEEL, -0.53, top + 0.19, pz + 0.02);
    part(g, ring(0.04, 0.015), '#fdd835', -0.1, top + 0.35, pz + 0.03);
    for (const sx of [-1, 1]) part(g, ring(0.022, 0.006), '#e53935', 0.16 + sx * 0.025, top + 0.24, pz + 0.025);
    for (const sx of [-1, 1]) part(g, box(0.008, 0.16, 0.006), STEEL, 0.16 + sx * 0.012, top + 0.35, pz + 0.025, { rz: sx * 0.12, outline: false });
    part(g, rbox(0.05, 0.22, 0.03, 0.01), '#1e88e5', 0.45, top + 0.32, pz + 0.03);
    part(g, rbox(0.22, 0.05, 0.03, 0.01), '#616161', 0.45, top + 0.45, pz + 0.03);
    // The cutting mat with its grid, foam board being cut, a rule and a knife.
    const ty = top;
    part(g, box(0.64, 0.006, 0.42), '#2e7d4f', -0.5, ty + 0.003, 0.17, { outline: false });
    for (let i = 1; i < 6; i++) part(g, box(0.003, 0.002, 0.4), '#a5d6a7', -0.82 + i * 0.107, ty + 0.007, 0.17, { outline: false });
    for (let i = 1; i < 4; i++) part(g, box(0.62, 0.002, 0.003), '#a5d6a7', -0.5, ty + 0.007, 0.17 - 0.21 + i * 0.105, { outline: false });
    part(g, box(0.3, 0.008, 0.2), '#ffffff', -0.55, ty + 0.011, 0.13, { ry: 0.12 });
    part(g, box(0.12, 0.06, 0.008), '#ffffff', -0.68, ty + 0.04, 0.0, { ry: 0.3 });
    part(g, box(0.08, 0.04, 0.008), '#ffffff', -0.36, ty + 0.026, 0.02, { ry: -0.4 });
    part(g, box(0.45, 0.004, 0.035), STEEL, -0.48, ty + 0.017, 0.3, { ry: -0.05 });
    part(g, cyl(0.008, 0.008, 0.13, 8), '#ffb300', -0.24, ty + 0.014, 0.25, { rz: Math.PI / 2, ry: 0.6 });
    part(g, box(0.03, 0.003, 0.01), CHROME, -0.3, ty + 0.014, 0.29, { ry: 0.6, outline: false });
    part(g, cyl(0.022, 0.025, 0.08, 10), WHITE, -0.12, ty + 0.04, -0.12);
    part(g, new THREE.ConeGeometry(0.014, 0.03, 8), '#ff7043', -0.12, ty + 0.095, -0.12, { outline: false });
    part(g, cyl(0.035, 0.03, 0.1, 12), '#90a4ae', -0.22, ty + 0.05, -0.28);
    for (let i = 0; i < 3; i++) rod(g, new THREE.Vector3(-0.22, ty + 0.06, -0.28), new THREE.Vector3(-0.22 + (i - 1) * 0.03, ty + 0.17, -0.28 + (i % 2) * 0.02), 0.005, ['#ffb300', '#e53935', '#3949ab'][i]);
    // The model on its base.
    const mx = 0.4;
    const mz = -0.04;
    const base = ty + 0.03;
    part(g, rbox(0.7, 0.03, 0.5, 0.008), '#c8a27a', mx, ty + 0.015, mz);
    part(g, box(0.66, 0.004, 0.46), '#e4ead2', mx, base + 0.002, mz, { outline: false });
    part(g, box(0.66, 0.004, 0.09), '#b0b0b0', mx, base + 0.004, mz + 0.16, { outline: false });
    for (let i = 0; i < 4; i++) part(g, box(0.05, 0.002, 0.006), '#ffffff', mx - 0.24 + i * 0.16, base + 0.007, mz + 0.16, { outline: false });
    part(g, rbox(0.06, 0.035, 0.03, 0.01), '#e53935', mx - 0.15, base + 0.02, mz + 0.14);
    part(g, rbox(0.06, 0.035, 0.03, 0.01), '#fdd835', mx + 0.12, base + 0.02, mz + 0.18);
    const white = '#fbfbf8';
    part(g, rbox(0.15, 0.34, 0.15, 0.008), white, mx + 0.16, base + 0.17, mz - 0.1);
    part(g, rbox(0.1, 0.09, 0.1, 0.008), white, mx + 0.16, base + 0.385, mz - 0.11);
    part(g, box(0.12, 0.3, 0.004), '#a9d4ef', mx + 0.16, base + 0.17, mz - 0.024, { outline: false });
    for (let i = 1; i < 5; i++) part(g, box(0.122, 0.006, 0.006), white, mx + 0.16, base + 0.02 + i * 0.065, mz - 0.022, { outline: false });
    part(g, rbox(0.3, 0.1, 0.16, 0.008), white, mx - 0.07, base + 0.05, mz - 0.12);
    part(g, cyl(0.08, 0.08, 0.14, 22), white, mx - 0.2, base + 0.07, mz + 0.0);
    part(g, cyl(0.07, 0.07, 0.012, 22), '#7cb342', mx - 0.2, base + 0.146, mz + 0.0, { outline: false });
    part(g, box(0.18, 0.012, 0.12), white, mx + 0.04, base + 0.12, mz + 0.04);
    for (const [x, z] of [[-0.04, 0.0], [0.12, 0.0], [-0.04, 0.08], [0.12, 0.08]]) part(g, cyl(0.006, 0.006, 0.12, 6), white, mx + x, base + 0.06, mz + z, { outline: false });
    for (let i = 0; i < 5; i++) {
      const x = mx - 0.28 + i * 0.14;
      part(g, cyl(0.003, 0.003, 0.04, 5), '#795548', x, base + 0.02, mz + 0.22, { outline: false });
      part(g, ball(0.024), i % 2 ? '#66bb6a' : '#43a047', x, base + 0.055, mz + 0.22);
    }
    // A magnifier lamp clamped at the back corner, its ring over the model.
    const lx = W / 2 - 0.18;
    part(g, rbox(0.06, 0.06, 0.06, 0.01), BLACK, lx, ty + 0.03, -0.36);
    rod(g, new THREE.Vector3(lx, ty + 0.06, -0.36), new THREE.Vector3(lx, ty + 0.5, -0.34), 0.012, '#eceff1');
    rod(g, new THREE.Vector3(lx, ty + 0.5, -0.34), new THREE.Vector3(mx + 0.1, ty + 0.5, -0.12), 0.012, '#eceff1');
    part(g, ball(0.02), BLACK, lx, ty + 0.5, -0.34, { outline: false });
    part(g, ring(0.09, 0.022), '#eceff1', mx + 0.08, ty + 0.46, -0.1, { rx: Math.PI / 2 - 0.25 });
    glass(g, cyl(0.075, 0.075, 0.006, 20), mx + 0.08, ty + 0.46, -0.1, -0.25);
    out.work = marker(g, -0.06, ty + 0.02, 0.22);
  },

  /**
   * A make-up artist's vanity: drawer pedestals either side of a knee space under a white top, a
   * Hollywood mirror ringed with bulbs; on the top brush cups, an eyeshadow palette, lipsticks,
   * foundation, perfume, a compact, a cotton jar and tissues; a plush swivel chair pulled up to it.
   */
  makeupStation(g, W, D, c, _def, _ctx, out) {
    const d = 0.58;
    const z = -D / 2 + d / 2;
    const front = z + d / 2;
    const h = 0.76;
    const ty = h + 0.02;
    for (const sx of [-1, 1]) {
      const x = sx * (W / 2 - 0.3);
      part(g, rbox(0.48, h - 0.02, d - 0.04, 0.02), tint(c, 0.55), x, (h - 0.02) / 2, z);
      for (let i = 0; i < 3; i++) {
        part(g, rbox(0.42, 0.2, 0.02, 0.01), tint(c, 0.25), x, 0.13 + i * 0.23, front - 0.02);
        part(g, ball(0.018), GOLD, x, 0.16 + i * 0.23, front - 0.004, { outline: false });
      }
    }
    part(g, rbox(W - 1.2, 0.08, d - 0.06, 0.01), tint(c, 0.55), 0, h - 0.06, z);
    part(g, rbox(W - 1.26, 0.06, 0.02, 0.01), tint(c, 0.25), 0, h - 0.06, front - 0.03);
    part(g, rbox(W - 0.08, 0.04, d, 0.015), '#fafafa', 0, h, z);
    // The mirror, its frame ringed with bulbs.
    const mz = -D / 2 + 0.05;
    const my = ty + 0.52;
    part(g, rbox(1.4, 0.95, 0.05, 0.03), '#fdfdfd', 0, my, mz);
    for (const sx of [-1, 1]) part(g, rbox(0.08, 0.06, 0.12, 0.02), '#fdfdfd', sx * 0.55, ty + 0.03, mz + 0.03);
    const m = new THREE.Mesh(box(1.18, 0.74, 0.01), MIRROR);
    m.position.set(0, my, mz + 0.028);
    g.add(m);
    const bulb = glow('#fff6d8');
    for (let i = 0; i < 7; i++) part(g, ball(0.034), '#fff6d8', -0.6 + i * 0.2, my + 0.425, mz + 0.035, { material: bulb });
    for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) part(g, ball(0.034), '#fff6d8', sx * 0.65, my - 0.3 + i * 0.2, mz + 0.035, { material: bulb });
    // On the top: brush cups.
    for (const [x, k] of [[-0.55, '#f48fb1'], [-0.42, '#ffffff']] as const) {
      part(g, cyl(0.04, 0.034, 0.1, 14), k, x, ty + 0.05, -0.27);
      for (let i = 0; i < 4; i++) {
        const tip = new THREE.Vector3(x + (i - 1.5) * 0.025, ty + 0.2 + (i % 2) * 0.03, -0.27 + ((i % 3) - 1) * 0.02);
        rod(g, new THREE.Vector3(x, ty + 0.06, -0.27), tip, 0.005, i % 2 ? BLACK : WOOD);
        part(g, ball(0.012), i % 2 ? '#5d4037' : '#f8bbd0', tip.x, tip.y + 0.01, tip.z, { outline: false }).scale.set(0.8, 1.6, 0.8);
      }
    }
    // An open palette of shadows.
    part(g, rbox(0.22, 0.016, 0.13, 0.006), BLACK, -0.15, ty + 0.008, -0.04);
    ['#d7a49a', '#a1665e', '#f3c7b6', '#8e5b8a', '#c58b4e', '#5d4037'].forEach((k, i) => part(g, cyl(0.022, 0.022, 0.006, 12), k, -0.215 + (i % 3) * 0.065, ty + 0.018, -0.07 + Math.floor(i / 3) * 0.06, { outline: false }));
    // Lipsticks, foundation, perfume, a compact.
    for (const [i, k] of ['#c62828', '#ec407a', '#ad1457'].entries()) {
      part(g, cyl(0.012, 0.012, 0.05, 10), GOLD, 0.12 + i * 0.04, ty + 0.025, -0.2);
      part(g, cyl(0.01, 0.01, 0.025, 10), k, 0.12 + i * 0.04, ty + 0.062, -0.2, { outline: false });
    }
    for (const [i, k] of ['#f2c9a6', '#e0ac85'].entries()) {
      part(g, rbox(0.05, 0.1, 0.03, 0.01), k, 0.32 + i * 0.07, ty + 0.05, -0.28);
      part(g, cyl(0.014, 0.014, 0.03, 10), BLACK, 0.32 + i * 0.07, ty + 0.115, -0.28);
    }
    part(g, rbox(0.07, 0.09, 0.05, 0.02), '#f8bbd0', 0.5, ty + 0.045, -0.1);
    part(g, ball(0.022), GOLD, 0.5, ty + 0.11, -0.1);
    part(g, cyl(0.045, 0.045, 0.016, 18), GOLD, 0.25, ty + 0.008, -0.02);
    // A jar of cotton pads and a box of tissues.
    glass(g, cyl(0.045, 0.045, 0.12, 14), -0.68, ty + 0.06, -0.08);
    for (let i = 0; i < 3; i++) part(g, cyl(0.035, 0.035, 0.012, 12), '#ffffff', -0.68, ty + 0.02 + i * 0.03, -0.08, { outline: false });
    part(g, rbox(0.22, 0.09, 0.12, 0.02), '#ffffff', 0.68, ty + 0.045, -0.28);
    part(g, ball(0.04), '#ffffff', 0.68, ty + 0.1, -0.28, { outline: false }).scale.set(1, 0.9, 0.6);
    // The chair, a plush swivel one, pulled up to the front.
    const ch = new THREE.Group();
    const cz = front + 0.26;
    ch.position.set(0, 0, cz);
    ch.rotation.y = Math.PI;
    g.add(ch);
    const plush = '#e8799c';
    part(ch, cyl(0.24, 0.26, 0.03, 22), CHROME, 0, 0.015, 0);
    part(ch, cyl(0.06, 0.07, 0.12, 14), BLACK, 0, 0.09, 0);
    part(ch, cyl(0.033, 0.033, 0.25, 10), CHROME, 0, 0.27, 0, { outline: false });
    part(ch, rbox(0.5, 0.1, 0.46, 0.05), plush, 0, 0.43, 0);
    part(ch, rbox(0.48, 0.48, 0.09, 0.06), plush, 0, 0.74, -0.21, { rx: -0.08 });
    for (let i = 0; i < 6; i++) part(ch, ball(0.012), tint(plush, 0.4), -0.12 + (i % 3) * 0.12, 0.66 + Math.floor(i / 3) * 0.16, -0.16, { outline: false });
    for (const sx of [-1, 1]) {
      part(ch, rbox(0.07, 0.05, 0.36, 0.025), plush, sx * 0.27, 0.62, -0.02);
      part(ch, rbox(0.025, 0.16, 0.025, 0.008), CHROME, sx * 0.27, 0.53, 0.1);
    }
    out.seat = marker(g, 0, 0.48, cz);
    out.work = marker(g, 0, ty + 0.01, front - 0.12);
  },

  /**
   * A hair salon station: against the wall a tall panel with a mirror lit down both sides, a shelf
   * of tools (scissors, comb, clippers, a spray bottle, a jar of blue disinfectant with combs in it,
   * products), a dryer in its holder; in front, a hydraulic chair turned out to the room — a chrome
   * base and pump column with its foot pedal, a padded seat, back and headrest, chrome-sided arms and
   * a footrest.
   */
  salonStation(g, _W, D, c, _def, _ctx, out) {
    const bz = -D / 2 + 0.04;
    part(g, rbox(0.84, 1.9, 0.05, 0.02), '#f5f0eb', 0, 0.95, bz);
    part(g, rbox(0.88, 0.05, 0.08, 0.02), BLACK, 0, 1.92, bz + 0.01);
    part(g, rbox(0.64, 0.98, 0.03, 0.015), BLACK, 0, 1.36, bz + 0.035);
    const m = new THREE.Mesh(box(0.58, 0.92, 0.01), MIRROR);
    m.position.set(0, 1.36, bz + 0.052);
    g.add(m);
    for (const sx of [-1, 1]) part(g, box(0.03, 0.86, 0.012), '#fff8e1', sx * 0.36, 1.36, bz + 0.035, { outline: false, material: glow('#fff8e1') });
    // The shelf and what's on it.
    const sy = 0.86;
    const sz = bz + 0.13;
    part(g, rbox(0.8, 0.035, 0.2, 0.012), '#fafafa', 0, sy - 0.018, sz);
    for (const sx of [-1, 1]) part(g, box(0.02, 0.08, 0.14), STEEL, sx * 0.34, sy - 0.07, sz - 0.02, { outline: false });
    for (const sx of [-1, 1]) {
      part(g, box(0.006, 0.003, 0.11), STEEL, -0.2 + sx * 0.008, sy + 0.003, sz + 0.02, { ry: sx * 0.12, outline: false });
      part(g, ring(0.016, 0.004), BLACK, -0.2 + sx * 0.018, sy + 0.004, sz + 0.09, { rx: Math.PI / 2, outline: false });
    }
    part(g, rbox(0.14, 0.006, 0.026, 0.003), BLACK, -0.06, sy + 0.003, sz + 0.06, { ry: 0.3 });
    part(g, rbox(0.045, 0.035, 0.12, 0.012), '#37474f', 0.04, sy + 0.018, sz + 0.02, { ry: -0.2 });
    part(g, cyl(0.028, 0.03, 0.12, 12), '#4fc3f7', 0.14, sy + 0.06, sz - 0.04);
    part(g, rbox(0.03, 0.04, 0.05, 0.01), WHITE, 0.14, sy + 0.14, sz - 0.03);
    glass(g, cyl(0.04, 0.04, 0.15, 14), -0.3, sy + 0.075, sz - 0.03);
    part(g, cyl(0.036, 0.036, 0.11, 14), '#1e88e5', -0.3, sy + 0.056, sz - 0.03, { outline: false, material: new THREE.MeshToonMaterial({ color: '#1e88e5', transparent: true, opacity: 0.6 }) }).userData.ownMaterial = true;
    for (let i = 0; i < 3; i++) part(g, rbox(0.016, 0.16, 0.004, 0.002), BLACK, -0.3 + (i - 1) * 0.015, sy + 0.12, sz - 0.03 + (i - 1) * 0.01, { rz: (i - 1) * 0.12, outline: false });
    for (const [i, k] of ['#ab47bc', '#ffffff', '#26a69a'].entries()) {
      part(g, cyl(0.022, 0.024, 0.1 + (i % 2) * 0.03, 10), k, 0.24 + i * 0.05, sy + 0.05 + (i % 2) * 0.015, sz - 0.05);
      part(g, cyl(0.012, 0.012, 0.02, 8), BLACK, 0.24 + i * 0.05, sy + 0.11 + (i % 2) * 0.03, sz - 0.05, { outline: false });
    }
    // The dryer in its holder on the side of the panel, its cord down.
    part(g, ring(0.05, 0.01), BLACK, 0.33, 0.6, bz + 0.09, { rx: Math.PI / 2, outline: false });
    part(g, cyl(0.045, 0.04, 0.16, 14), '#424242', 0.33, 0.64, bz + 0.09);
    part(g, cyl(0.03, 0.035, 0.05, 12), BLACK, 0.33, 0.53, bz + 0.09, { outline: false });
    part(g, rbox(0.035, 0.12, 0.03, 0.012), '#424242', 0.33, 0.7, bz + 0.15, { rx: 0.9 });
    rod(g, new THREE.Vector3(0.33, 0.66, bz + 0.2), new THREE.Vector3(0.36, 0.03, bz + 0.12), 0.006, BLACK);
    // The chair, turned out to the room.
    const ch = new THREE.Group();
    ch.position.set(0, 0, 0.07);
    g.add(ch);
    part(ch, cyl(0.25, 0.27, 0.035, 26), CHROME, 0, 0.018, 0);
    part(ch, cyl(0.065, 0.075, 0.24, 18), CHROME, 0, 0.155, 0);
    part(ch, cyl(0.045, 0.045, 0.12, 14), CHROME, 0, 0.33, 0, { outline: false });
    part(ch, rbox(0.04, 0.02, 0.13, 0.008), BLACK, 0.14, 0.06, 0.06, { ry: 0.5 });
    part(ch, rbox(0.46, 0.04, 0.42, 0.01), CHROME, 0, 0.39, 0);
    part(ch, rbox(0.48, 0.13, 0.46, 0.06), c, 0, 0.475, 0.01);
    part(ch, rbox(0.48, 0.58, 0.1, 0.06), c, 0, 0.84, -0.2, { rx: -0.08 });
    part(ch, rbox(0.04, 0.12, 0.03, 0.008), CHROME, 0, 1.17, -0.24);
    part(ch, rbox(0.28, 0.11, 0.08, 0.04), shade(c, 0.8), 0, 1.26, -0.23);
    for (const sx of [-1, 1]) {
      part(ch, rbox(0.035, 0.22, 0.34, 0.01), CHROME, sx * 0.27, 0.55, 0);
      part(ch, rbox(0.08, 0.06, 0.38, 0.03), shade(c, 0.8), sx * 0.27, 0.68, 0);
    }
    rod(ch, new THREE.Vector3(0, 0.38, 0.2), new THREE.Vector3(0, 0.17, 0.3), 0.014, CHROME);
    part(ch, rbox(0.34, 0.025, 0.11, 0.01), CHROME, 0, 0.16, 0.31);
    for (let i = 0; i < 3; i++) part(ch, box(0.3, 0.008, 0.016), BLACK, 0, 0.176, 0.28 + i * 0.03, { outline: false });
    out.seat = marker(g, 0, 0.54, 0.08);
    out.work = marker(g, 0, 1.05, 0.14);
  },

  /**
   * A bakery's display: a cream cabinet with a chalkboard sign, a glass case on it with a sloped
   * front, lit under its walnut top, two tiers of trays inside — croissants, iced doughnuts, cream
   * buns, loaves with their slashes, soboro, fruit tarts — each with its price tag; on the top a
   * basket of baguettes, tongs and a stack of trays.
   */
  displayCase(g, W, D, c, _def, _ctx, out) {
    const w = W - 0.08;
    const back = -D / 2 + 0.06;
    const bf = D / 2 - 0.08;
    // The cabinet.
    part(g, rbox(w - 0.04, 0.06, D - 0.18, 0.01), '#6d4c41', 0, 0.03, -0.02);
    part(g, rbox(w, 0.44, D - 0.12, 0.02), c, 0, 0.28, -0.02);
    for (let x = -w / 2 + 0.12; x < w / 2 - 0.05; x += 0.12) part(g, box(0.05, 0.36, 0.01), '#e9d6b5', x, 0.27, bf + 0.004, { outline: false });
    part(g, rbox(0.56, 0.2, 0.02, 0.01), '#6d4c41', 0, 0.28, bf + 0.018);
    label(g, '갓 구운 빵', 0.5, 0.15, 0, 0.28, bf + 0.03, '#2f3e36', '#fff8e1');
    // The glass case: a sloped front, sides, a back, lit under the top.
    const y0 = 0.5;
    const y1 = 0.98;
    const zf0 = bf - 0.04;
    const zf1 = 0.2;
    part(g, box(w - 0.02, 0.02, D - 0.16), '#f3e5c9', 0, y0 + 0.01, -0.02);
    const slope = Math.hypot(y1 - y0, zf0 - zf1);
    const tilt = -Math.atan2(zf0 - zf1, y1 - y0);
    glass(g, box(w - 0.04, slope, 0.008), 0, (y0 + y1) / 2, (zf0 + zf1) / 2, tilt);
    for (const sx of [-1, 1]) {
      const side = new THREE.Shape();
      side.moveTo(zf0, y0);
      side.lineTo(zf1, y1);
      side.lineTo(back + 0.02, y1);
      side.lineTo(back + 0.02, y0);
      side.closePath();
      const sg = new THREE.ShapeGeometry(side);
      const s = glass(g, sg, sx * (w / 2 - 0.01), 0, 0, 0, -Math.PI / 2);
      s.userData.ownGeometry = true;
      s.material = PANE;
      rod(g, new THREE.Vector3(sx * (w / 2 - 0.01), y0, zf0), new THREE.Vector3(sx * (w / 2 - 0.01), y1, zf1), 0.012, GOLD);
      part(g, box(0.02, y1 - y0, 0.02), GOLD, sx * (w / 2 - 0.01), (y0 + y1) / 2, back + 0.02, { outline: false });
    }
    part(g, box(w - 0.04, y1 - y0, 0.02), '#efdcc0', 0, (y0 + y1) / 2, back + 0.02);
    part(g, box(w - 0.04, 0.014, 0.014), GOLD, 0, y0 + 0.02, zf0, { outline: false });
    part(g, rbox(w + 0.02, 0.045, 0.7, 0.015), '#6d4c41', 0, y1 + 0.022, -0.13);
    part(g, box(w - 0.1, 0.01, 0.03), '#fff3d6', 0, y1 - 0.01, 0.05, { outline: false, material: glow('#fff3d6') });
    // The tiers: the floor of the case at the front, a step up behind.
    part(g, rbox(w - 0.06, 0.2, 0.3, 0.01), '#f3e5c9', 0, y0 + 0.1, -0.27);
    const trays = 3;
    const tw = (w - 0.16) / trays;
    const tags = ['1,800', '2,500', '2,200', '4,500', '2,000', '3,800'];
    const tray = (i: number, y: number, z: number, d: number) => {
      const x = -w / 2 + 0.08 + tw * (i % trays + 0.5);
      part(g, rbox(tw - 0.04, 0.015, d, 0.006), '#b0bec5', x, y + 0.008, z);
      part(g, box(tw - 0.08, 0.004, d - 0.04), '#fffaf0', x, y + 0.017, z, { outline: false });
      return x;
    };
    const crust = '#c98a3e';
    const croissant = ring(0.05, 0.024, Math.PI * 1.25);
    for (let i = 0; i < 6; i++) {
      const up = i >= 3;
      const y = up ? y0 + 0.2 : y0 + 0.02;
      const z = up ? -0.27 : 0.12;
      const x = tray(i, y, z, up ? 0.24 : 0.3);
      const t = y + 0.02;
      const kind = i % 3 + (up ? 3 : 0);
      for (let k = 0; k < (kind === 3 ? 2 : 3); k++) {
        const px = x + (k - (kind === 3 ? 0.5 : 1)) * (kind === 3 ? 0.26 : 0.15);
        const pz = kind === 3 ? z : z + ((k % 2) - 0.5) * 0.06;
        if (kind === 0) part(g, croissant, crust, px, t + 0.022, pz, { rx: Math.PI / 2, rz: -Math.PI * 0.12 + k }).scale.set(1, 1, 0.8);
        else if (kind === 1) {
          part(g, ring(0.038, 0.018), '#d49a5a', px, t + 0.015, pz, { rx: Math.PI / 2 });
          part(g, ring(0.038, 0.016), ['#f48fb1', '#6d4c41', '#fff59d'][k], px, t + 0.024, pz, { rx: Math.PI / 2, outline: false }).scale.set(1, 1, 0.5);
        } else if (kind === 2) {
          part(g, ball(0.05), '#e3a857', px, t + 0.03, pz).scale.set(1, 0.65, 1);
          part(g, ball(0.02), '#fffde7', px, t + 0.06, pz, { outline: false });
        } else if (kind === 3) {
          part(g, ball(0.05), '#b9773a', px, t + 0.035, pz).scale.set(2.2, 0.75, 1);
          for (let s = 0; s < 3; s++) part(g, box(0.008, 0.004, 0.06), '#f1d39a', px - 0.05 + s * 0.05, t + 0.072, pz, { ry: 0.6, outline: false });
        } else if (kind === 4) part(g, ball(0.048), '#a86b2d', px, t + 0.03, pz).scale.set(1, 0.7, 1);
        else {
          part(g, cyl(0.05, 0.045, 0.025, 16), '#e0b070', px, t + 0.012, pz);
          part(g, cyl(0.043, 0.043, 0.006, 16), '#fff3c4', px, t + 0.026, pz, { outline: false });
          for (let s = 0; s < 3; s++) part(g, ball(0.012), ['#e53935', '#8e24aa', '#43a047'][s], px + (s - 1) * 0.02, t + 0.035, pz + ((s % 2) - 0.5) * 0.02, { outline: false });
        }
      }
      // Its price, on a pick at the front of the tray.
      const tz = z + (up ? 0.13 : 0.16);
      part(g, cyl(0.002, 0.002, 0.05, 4), STEEL, x, t + 0.02, tz, { outline: false });
      label(g, tags[i], 0.08, 0.04, x, t + 0.06, tz + 0.002, '#ffffff', '#c62828', -0.3);
    }
    // On the top: a basket of baguettes, tongs, a stack of trays.
    const ty = y1 + 0.045;
    part(g, rbox(0.4, 0.12, 0.22, 0.03), '#c49a6c', -0.5, ty + 0.06, -0.2);
    for (let i = 0; i < 3; i++) part(g, box(0.402, 0.008, 0.222), '#a47b4f', -0.5, ty + 0.025 + i * 0.035, -0.2, { outline: false });
    for (let i = 0; i < 4; i++) part(g, cyl(0.026, 0.026, 0.5, 10), crust, -0.62 + i * 0.075, ty + 0.2, -0.2 + ((i % 2) - 0.5) * 0.06, { rz: 0.5 - i * 0.05 });
    for (let i = 0; i < 3; i++) part(g, cyl(0.15, 0.14, 0.012, 22), '#d7c4a3', 0.5, ty + 0.006 + i * 0.013, -0.18, { outline: i === 2 });
    for (const sx of [-1, 1]) part(g, box(0.18, 0.006, 0.014), STEEL, 0.15, ty + 0.01, -0.12 + sx * 0.012, { ry: sx * 0.06 });
    out.work = marker(g, 0, ty + 0.01, 0.08);
  },

  /**
   * A judge's bench on its dais: a panelled front, higher in the middle, with the court's emblem in
   * gold and the presiding judge's nameplate; behind it the desk with case files, papers, a gavel on
   * its block and a gooseneck microphone, the judge's high-backed leather chair, the national flag.
   * The judge sits in the chair facing the courtroom (a spot of its own).
   */
  judgeBench(g, W, D, c, _def, _ctx, out) {
    const panel = '#6d4c41';
    const trim = shade(c, 1.6);
    // A high dais and a low front, so the seated judge shows from the chest up over the bench.
    const dais = 0.28;
    part(g, rbox(W - 0.04, dais, D - 0.04, 0.02), shade(c, 1.25), 0, dais / 2, 0);
    part(g, box(W - 0.3, 0.006, 0.5), '#7b1f2b', 0, dais + 0.003, -0.2, { outline: false });
    // The front: the middle raised, its panels, emblem and nameplate; lower wings either side.
    const fz = D / 2 - 0.12;
    const mw = 0.9;
    const sw = (W - 0.04 - mw) / 2;
    part(g, rbox(mw, 0.76, 0.12, 0.02), c, 0, dais + 0.38, fz);
    part(g, rbox(mw + 0.08, 0.05, 0.2, 0.015), trim, 0, dais + 0.78, fz - 0.01);
    for (const sx of [-1, 1]) {
      const x = sx * (mw / 2 + sw / 2);
      part(g, rbox(sw, 0.62, 0.12, 0.02), c, x, dais + 0.31, fz - 0.02);
      part(g, rbox(sw + 0.02, 0.04, 0.17, 0.015), trim, x, dais + 0.64, fz - 0.02);
      part(g, rbox(sw - 0.14, 0.4, 0.02, 0.01), panel, x, dais + 0.32, fz + 0.045);
      part(g, rbox(sw - 0.22, 0.3, 0.012, 0.008), shade(panel, 1.15), x, dais + 0.32, fz + 0.056, { outline: false });
    }
    part(g, rbox(mw - 0.16, 0.16, 0.02, 0.01), panel, 0, dais + 0.15, fz + 0.065);
    part(g, rbox(mw - 0.26, 0.09, 0.012, 0.008), shade(panel, 1.15), 0, dais + 0.15, fz + 0.076, { outline: false });
    part(g, rbox(W - 0.06, 0.07, 0.15, 0.01), trim, 0, dais + 0.035, fz + 0.01);
    part(g, cyl(0.13, 0.13, 0.02, 28), GOLD, 0, dais + 0.42, fz + 0.07, { rx: Math.PI / 2 });
    part(g, cyl(0.105, 0.105, 0.022, 28), '#8d6e1f', 0, dais + 0.42, fz + 0.071, { rx: Math.PI / 2, outline: false });
    label(g, '⚖', 0.15, 0.15, 0, dais + 0.42, fz + 0.083, '#8d6e1f', '#f5d76e');
    part(g, rbox(0.42, 0.1, 0.02, 0.008), GOLD, 0, dais + 0.66, fz + 0.065);
    label(g, '재 판 장', 0.38, 0.08, 0, dais + 0.66, fz + 0.076, '#d4af37', '#3e2723');
    // The desk behind it and what's on it.
    const dy = dais + 0.74;
    part(g, rbox(W - 0.2, 0.04, 0.34, 0.012), shade(c, 1.4), 0, dy, fz - 0.23);
    part(g, rbox(W - 0.24, 0.07, 0.03, 0.01), c, 0, dy - 0.05, fz - 0.39);
    const top = dy + 0.02;
    part(g, rbox(0.3, 0.035, 0.22, 0.008), '#f5deb3', -0.35, top + 0.018, fz - 0.24, { ry: 0.08 });
    part(g, rbox(0.29, 0.03, 0.21, 0.008), '#90caf9', -0.35, top + 0.05, fz - 0.24, { ry: -0.05 });
    part(g, box(0.21, 0.003, 0.29), '#ffffff', 0.02, top + 0.002, fz - 0.24, { ry: 0.05 });
    for (let i = 0; i < 5; i++) part(g, box(0.15, 0.002, 0.006), '#9e9e9e', 0.02, top + 0.004, fz - 0.34 + i * 0.04, { outline: false });
    part(g, cyl(0.065, 0.07, 0.03, 20), '#4e342e', 0.36, top + 0.015, fz - 0.22);
    part(g, cyl(0.032, 0.032, 0.11, 14), '#5d4037', 0.36, top + 0.07, fz - 0.22, { rx: Math.PI / 2 });
    for (const dz of [-0.035, 0.035]) part(g, cyl(0.034, 0.034, 0.012, 14), GOLD, 0.36, top + 0.07, fz - 0.22 + dz, { rx: Math.PI / 2, outline: false });
    part(g, cyl(0.01, 0.013, 0.22, 8), '#5d4037', 0.48, top + 0.07, fz - 0.22, { rz: Math.PI / 2 });
    part(g, cyl(0.04, 0.05, 0.02, 14), BLACK, -0.12, top + 0.01, fz - 0.12);
    rod(g, new THREE.Vector3(-0.12, top + 0.02, fz - 0.12), new THREE.Vector3(-0.12, top + 0.12, fz - 0.16), 0.007, BLACK);
    rod(g, new THREE.Vector3(-0.12, top + 0.12, fz - 0.16), new THREE.Vector3(-0.07, top + 0.17, fz - 0.27), 0.007, BLACK);
    part(g, cyl(0.016, 0.013, 0.07, 10), '#424242', -0.06, top + 0.17, fz - 0.3, { rx: Math.PI / 2 - 0.4 });
    part(g, ball(0.01), '#ff1744', -0.12, top + 0.03, fz - 0.08, { outline: false, material: glow('#ff1744') });
    // The judge's chair: high-backed leather on a five-star base, facing the court.
    const ch = new THREE.Group();
    const cz = -0.19;
    ch.position.set(0, dais, cz);
    g.add(ch);
    const leather = '#4a1c22';
    starBase(ch, 0.38, BLACK, 0.26);
    part(ch, rbox(0.56, 0.12, 0.5, 0.05), leather, 0, 0.42, 0);
    part(ch, rbox(0.58, 1.02, 0.13, 0.06), leather, 0, 1.0, -0.22, { rx: -0.06 });
    part(ch, rbox(0.62, 0.12, 0.16, 0.06), shade(leather, 0.85), 0, 1.52, -0.25);
    for (let i = 0; i < 9; i++) part(ch, ball(0.012), shade(leather, 0.7), -0.16 + (i % 3) * 0.16, 0.75 + Math.floor(i / 3) * 0.22, -0.15 + Math.floor(i / 3) * -0.013, { outline: false });
    for (const sx of [-1, 1]) {
      part(ch, rbox(0.08, 0.06, 0.42, 0.03), leather, sx * 0.31, 0.68, -0.02);
      part(ch, rbox(0.05, 0.2, 0.05, 0.01), BLACK, sx * 0.31, 0.56, 0.12);
    }
    // The national flag on its pole at the back corner.
    const fx = -W / 2 + 0.14;
    const fzb = -D / 2 + 0.12;
    part(g, cyl(0.04, 0.05, 0.04, 14), GOLD, fx, dais + 0.02, fzb);
    part(g, cyl(0.018, 0.022, 1.95, 8), '#d7ccc8', fx, dais + 0.975, fzb, { outline: false });
    part(g, ball(0.035), GOLD, fx, dais + 1.98, fzb);
    part(g, box(0.5, 0.34, 0.01), '#ffffff', fx + 0.27, dais + 1.72, fzb);
    part(g, cyl(0.08, 0.08, 0.012, 18), '#cd2e3a', fx + 0.27, dais + 1.745, fzb + 0.006, { rx: Math.PI / 2, outline: false });
    part(g, cyl(0.08, 0.08, 0.013, 18), '#0047a0', fx + 0.27, dais + 1.695, fzb + 0.006, { rx: Math.PI / 2, outline: false });
    for (const [x, y, r] of [[-0.16, 0.1, -0.6], [0.16, -0.1, -0.6], [0.16, 0.1, 0.6], [-0.16, -0.1, 0.6]]) part(g, box(0.07, 0.04, 0.012), BLACK, fx + 0.27 + x, dais + 1.72 + y, fzb + 0.006, { rz: r, outline: false });
    // Sat facing the court (+z), feet on the dais, writing at the desk whatever the use.
    const judge = spot(g, 'sit', 0, dais + 0.48, cz, 0, 0.48);
    judge.work = out.work = marker(g, 0, top + 0.01, fz - 0.2);
    judge.motion = 'write';
    out.spots = { '*': judge };
  },

  /**
   * A mukbang streamer's table: a white top on black legs with a pink LED strip along the back, a
   * spread of food — a gold pot of ramyeon with an egg, fried chicken in its box, tteokbokki, a
   * plate of kimbap, kimchi, a cola — and the gear facing the eater: a ring light with the phone
   * in it, a camera on a little tripod, the chat on a monitor (lit while live, a LIVE sign on it), a
   * mic on a boom arm; a gaming chair to eat from.
   */
  mukbangTable(g, W, D, c, _def, _ctx, out) {
    const h = 0.74;
    const d = 0.7;
    const z = -D / 2 + d / 2 + 0.02;
    const front = z + d / 2;
    part(g, rbox(W - 0.08, 0.05, d, 0.02), '#f7f7f5', 0, h, z);
    part(g, box(W - 0.1, 0.03, 0.012), c, 0, h - 0.005, front + 0.001, { outline: false });
    for (const sx of [-1, 1]) {
      part(g, rbox(0.06, h - 0.03, d - 0.16, 0.02), BLACK, sx * (W / 2 - 0.14), (h - 0.03) / 2, z);
      part(g, rbox(0.08, 0.03, d - 0.08, 0.01), BLACK, sx * (W / 2 - 0.14), 0.015, z);
    }
    part(g, rbox(W - 0.3, 0.06, 0.03, 0.01), BLACK, 0, h - 0.1, z - d / 2 + 0.06);
    part(g, box(W - 0.2, 0.012, 0.012), '#ff80ab', 0, h - 0.03, z - d / 2 + 0.01, { outline: false, material: glow('#ff80ab') });
    const ty = h + 0.025;
    // The ramyeon pot in the middle: broth, noodles, an egg, spring onion.
    const px = 0;
    const pz = -0.02;
    part(g, cyl(0.13, 0.11, 0.09, 22), '#e8b923', px, ty + 0.045, pz);
    for (const sx of [-1, 1]) part(g, rbox(0.05, 0.015, 0.03, 0.006), '#e8b923', px + sx * 0.15, ty + 0.08, pz);
    part(g, cyl(0.12, 0.12, 0.006, 22), '#e2742f', px, ty + 0.08, pz, { outline: false });
    for (let i = 0; i < 4; i++) part(g, ring(0.035 + (i % 2) * 0.012, 0.007), '#f7dc6f', px + ((i % 2) - 0.5) * 0.06, ty + 0.085, pz + (Math.floor(i / 2) - 0.5) * 0.05, { rx: Math.PI / 2, outline: false });
    part(g, ball(0.035), '#ffffff', px + 0.05, ty + 0.087, pz - 0.04, { outline: false }).scale.set(1, 0.4, 1);
    part(g, ball(0.016), '#ffb300', px + 0.05, ty + 0.097, pz - 0.04, { outline: false });
    for (let i = 0; i < 5; i++) part(g, box(0.012, 0.006, 0.012), '#66bb6a', px - 0.06 + i * 0.025, ty + 0.088, pz + 0.05 - (i % 2) * 0.03, { outline: false });
    // Fried chicken in its box.
    const kx = -0.5;
    part(g, rbox(0.3, 0.06, 0.22, 0.01), '#ffffff', kx, ty + 0.03, 0.03);
    part(g, box(0.302, 0.02, 0.222), '#e53935', kx, ty + 0.045, 0.03, { outline: false });
    part(g, box(0.26, 0.004, 0.18), '#fff3e0', kx, ty + 0.062, 0.03, { outline: false });
    for (let i = 0; i < 6; i++) part(g, ball(0.04), i % 2 ? '#c27a2c' : '#b5651d', kx - 0.09 + (i % 3) * 0.09, ty + 0.085, 0.0 + Math.floor(i / 3) * 0.07).scale.set(1.2, 0.8, 1);
    part(g, cyl(0.008, 0.008, 0.06, 6), '#fff8e1', kx + 0.12, ty + 0.1, 0.1, { rz: 1.1, outline: false });
    // Tteokbokki.
    const bx = 0.45;
    part(g, cyl(0.12, 0.09, 0.04, 20), '#eceff1', bx, ty + 0.02, 0.05);
    part(g, cyl(0.11, 0.11, 0.006, 20), '#d32f2f', bx, ty + 0.036, 0.05, { outline: false });
    for (let i = 0; i < 7; i++) part(g, cyl(0.012, 0.012, 0.06, 8), '#fff3e0', bx - 0.06 + (i % 4) * 0.04, ty + 0.045, 0.02 + Math.floor(i / 4) * 0.05, { rz: Math.PI / 2, ry: i * 0.7, outline: false });
    part(g, ball(0.028), '#ffffff', bx + 0.05, ty + 0.05, 0.1, { outline: false }).scale.set(1, 1.3, 1);
    // A plate of kimbap, kimchi, a cola, spoon and chopsticks.
    part(g, rbox(0.3, 0.015, 0.1, 0.006), '#ffffff', -0.2, ty + 0.008, -0.2);
    for (let i = 0; i < 5; i++) {
      const x = -0.32 + i * 0.06;
      part(g, cyl(0.025, 0.025, 0.02, 14), '#1b2a1b', x, ty + 0.04, -0.2, { rx: Math.PI / 2 - 0.3 });
      part(g, cyl(0.02, 0.02, 0.022, 12), '#fafafa', x, ty + 0.04, -0.2, { rx: Math.PI / 2 - 0.3, outline: false });
      part(g, cyl(0.007, 0.007, 0.024, 6), i % 2 ? '#ffb300' : '#ef6c00', x, ty + 0.04, -0.2, { rx: Math.PI / 2 - 0.3, outline: false });
    }
    part(g, cyl(0.05, 0.04, 0.025, 14), '#ffffff', 0.22, ty + 0.013, -0.18);
    for (let i = 0; i < 4; i++) part(g, box(0.02, 0.012, 0.02), '#e53935', 0.2 + (i % 2) * 0.03, ty + 0.03, -0.19 + Math.floor(i / 2) * 0.025, { ry: i, outline: false });
    part(g, cyl(0.04, 0.032, 0.14, 14), '#e53935', 0.75, ty + 0.07, 0.14);
    part(g, cyl(0.042, 0.042, 0.01, 14), '#ffffff', 0.75, ty + 0.145, 0.14, { outline: false });
    part(g, cyl(0.004, 0.004, 0.08, 6), '#fdd835', 0.76, ty + 0.18, 0.14, { rz: 0.2, outline: false });
    for (const dx of [0, 0.015]) part(g, box(0.004, 0.004, 0.2), CHROME, 0.2 + dx, ty + 0.004, 0.08, { ry: 0.1, outline: false });
    part(g, box(0.03, 0.004, 0.16), CHROME, 0.25, ty + 0.004, 0.08, { ry: 0.1, outline: false });
    part(g, ball(0.02), CHROME, 0.243, ty + 0.008, 0.0, { outline: false }).scale.set(1, 0.3, 1.3);
    for (let i = 0; i < 3; i++) part(g, cyl(0.06, 0.045, 0.03, 16), '#fafafa', 0.72, ty + 0.015 + i * 0.022, -0.18);
    // The gear at the back, facing the eater: a ring light with the phone in it.
    const rz = z - d / 2 + 0.1;
    part(g, cyl(0.05, 0.06, 0.02, 14), BLACK, 0, ty + 0.01, rz);
    part(g, cyl(0.01, 0.01, 0.32, 8), BLACK, 0, ty + 0.17, rz, { outline: false });
    part(g, ring(0.16, 0.022), '#fffdf0', 0, ty + 0.5, rz, { material: glow('#fffdf0') });
    part(g, ring(0.16, 0.026), BLACK, 0, ty + 0.5, rz - 0.008, { outline: false });
    part(g, rbox(0.02, 0.18, 0.02, 0.005), BLACK, 0, ty + 0.42, rz + 0.005);
    part(g, rbox(0.075, 0.15, 0.012, 0.008), BLACK, 0, ty + 0.5, rz + 0.012);
    part(g, box(0.064, 0.13, 0.002), '#4dd0e1', 0, ty + 0.5, rz + 0.019, { outline: false, material: glow('#4dd0e1') });
    // A camera on a little tripod, turned in to the eater.
    const cx = 0.42;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      rod(g, new THREE.Vector3(cx, ty + 0.18, rz + 0.02), new THREE.Vector3(cx + Math.sin(a) * 0.08, ty, rz + 0.02 + Math.cos(a) * 0.08), 0.006, BLACK);
    }
    const cam = new THREE.Group();
    cam.position.set(cx, ty + 0.24, rz + 0.02);
    cam.rotation.y = -0.35;
    g.add(cam);
    part(cam, rbox(0.13, 0.09, 0.07, 0.015), BLACK, 0, 0, 0);
    part(cam, cyl(0.035, 0.038, 0.07, 16), '#424242', 0, 0, 0.065, { rx: Math.PI / 2 });
    part(cam, cyl(0.026, 0.026, 0.004, 16), '#5c7c8a', 0, 0, 0.101, { rx: Math.PI / 2, outline: false });
    part(cam, ball(0.01), '#ff1744', -0.05, 0.035, 0.036, { outline: false, material: glow('#ff1744') });
    // The chat on a monitor, a LIVE sign on top.
    const mx = -0.5;
    part(g, rbox(0.16, 0.012, 0.1, 0.005), BLACK, mx, ty + 0.006, rz);
    part(g, rbox(0.03, 0.2, 0.025, 0.008), BLACK, mx, ty + 0.1, rz - 0.01);
    const mon = new THREE.Group();
    mon.position.set(mx, ty + 0.32, rz + 0.01);
    mon.rotation.y = 0.3;
    g.add(mon);
    part(mon, rbox(0.5, 0.31, 0.03, 0.01), BLACK, 0, 0, 0);
    const s = screenMesh(0.46, 0.27);
    s.position.set(0, 0, 0.012);
    mon.add(s);
    out.screen = s;
    label(mon, '● LIVE', 0.16, 0.05, 0, 0.19, 0.012, '#c62828', '#ffffff');
    // A mic on a boom arm clamped to the back corner, hung out towards the eater.
    const ax = W / 2 - 0.15;
    part(g, rbox(0.05, 0.06, 0.06, 0.01), BLACK, ax, ty + 0.03, rz);
    const j1 = new THREE.Vector3(ax, ty + 0.42, rz);
    const j2 = new THREE.Vector3(0.62, ty + 0.36, 0.08);
    rod(g, new THREE.Vector3(ax, ty + 0.06, rz), j1, 0.01, BLACK);
    rod(g, j1, j2, 0.01, BLACK);
    part(g, ball(0.018), BLACK, j1.x, j1.y, j1.z, { outline: false });
    part(g, ring(0.04, 0.005), BLACK, j2.x, j2.y - 0.07, j2.z, { rx: Math.PI / 2, outline: false });
    part(g, cyl(0.026, 0.026, 0.12, 14), '#37474f', j2.x, j2.y - 0.07, j2.z, { rx: 0.3 });
    part(g, ball(0.027), '#78909c', j2.x, j2.y - 0.01, j2.z - 0.018);
    // The gaming chair, pulled up to the front.
    const ch = new THREE.Group();
    const cz = front + 0.2;
    ch.position.set(0, 0, cz);
    ch.rotation.y = Math.PI;
    g.add(ch);
    starBase(ch, 0.38, BLACK, 0.26);
    part(ch, rbox(0.5, 0.1, 0.48, 0.04), BLACK, 0, 0.43, 0);
    for (const sx of [-1, 1]) part(ch, rbox(0.07, 0.11, 0.46, 0.035), c, sx * 0.22, 0.45, 0);
    part(ch, rbox(0.5, 0.74, 0.11, 0.05), BLACK, 0, 0.86, -0.22, { rx: -0.1 });
    for (const sx of [-1, 1]) part(ch, rbox(0.08, 0.66, 0.12, 0.035), c, sx * 0.22, 0.86, -0.21, { rx: -0.1 });
    part(ch, rbox(0.26, 0.1, 0.06, 0.03), c, 0, 1.08, -0.21, { rx: -0.1 });
    for (const sx of [-1, 1]) {
      part(ch, rbox(0.07, 0.04, 0.24, 0.015), BLACK, sx * 0.3, 0.64, -0.02);
      part(ch, rbox(0.035, 0.2, 0.035, 0.01), BLACK, sx * 0.3, 0.54, -0.02);
    }
    out.seat = marker(g, 0, 0.48, cz);
    out.work = marker(g, 0, ty + 0.02, 0.14);
  },
};
