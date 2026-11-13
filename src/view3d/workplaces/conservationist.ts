import * as THREE from 'three';
import { deskChair, legs, marker, rod, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { glass, glowing, label, painted, picture, ring, text } from './doctor';
import * as E from './conservationistMotion';
import { polyHouse } from './farmer';

/** 생태 연구 센터: field science in enamel, sage paint, timber and stainless steel.
 * 물여울 is the fictional watershed printed on equipment, never the workplace's name.
 * Props use the same fixture coordinates and clock as the hands in conservationistMotion.
 * Thin, unlit aquarium panes preserve the colour and silhouettes of the animals inside. */
const GREEN = '#41685c', DARK = '#28473f', CREAM = '#eee9d9', PAPER = '#fffbed';
const STEEL = '#a9b9bb', INK = '#273b39', WOOD = '#af8b62', SOIL = '#514032';
const WATER = '#9ddde2', SKIN = '#edc49f';
const UP = new THREE.Vector3(0, 1, 0);
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const P = (a: E.V) => new THREE.Vector3(...a);
function group(parent: THREE.Object3D, x = 0, y = 0, z = 0, yaw = 0) {
  const a = new THREE.Group();
  a.position.set(x, y, z); a.rotation.y = yaw; parent.add(a);
  return a;
}
function place(obj: THREE.Object3D, p: E.V) { obj.position.set(...p); }
function use(g: THREE.Group, motion: E.EcoMotion, x = 0, z = 0.72, seated = false): Spot {
  const s = spot(g, seated ? 'sit' : 'stand', x, seated ? 0.48 : 0, z, Math.PI, seated ? 0.48 : 0);
  s.work = marker(g, 0, 1, 0); s.motion = motion;
  return s;
}
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
function current(spots: Spot[], t: number) {
  return spots.filter(s => Math.abs(t - posedAt(s)) < 0.6).sort((a, b) => posedAt(b) - posedAt(a))[0] ?? null;
}
function now(s: Spot, t: number) {
  return E.ecoNow(s.motion as E.EcoMotion, t, E.ecoPhase(s.work!.getWorldPosition(new THREE.Vector3())), (s.at.userData.height as number | undefined) ?? 1.6);
}
function light(g: THREE.Object3D, out: Built, x: number, y: number, z: number) {
  const on = group(g); out.inUse = on;
  glowing(on, ball(0.014), '#b4ffb0', x, y, z);
  return on;
}
function bench(g: THREE.Group, width = 1.9, top = 0.94, depth = 0.84) {
  legs(g, width - 0.06, depth - 0.04, top - 0.07, STEEL, 0.06, 0.024);
  part(g, rbox(width, 0.07, depth, 0.025), CREAM, 0, top - 0.035, 0);
  part(g, box(width - 0.14, 0.035, depth - 0.12), GREEN, 0, 0.27, 0);
  part(g, box(width - 0.04, 0.12, 0.025), GREEN, 0, top + 0.035, -depth / 2);
  for (const x of [-width / 2 + 0.05, width / 2 - 0.05]) {
    part(g, box(0.02, 0.12, depth), STEEL, x, top + 0.035, 0);
    part(g, cyl(0.034, 0.034, 0.026, 10), INK, x, 0.02, depth / 2 - 0.08);
  }
}
function flatLabel(g: THREE.Object3D, s: string, w: number, h: number, p: E.V, bg = PAPER, fg = INK) {
  const a = label(g, s, w, h, ...p, bg, fg); a.rotation.x = -Math.PI / 2;
  return a;
}
function clipboard(g: THREE.Object3D, p: E.V, title: string, w = 0.32, d = 0.27) {
  const a = group(g, ...p);
  part(a, rbox(w, 0.012, d, 0.008), WOOD, 0, 0, 0);
  part(a, box(w - 0.025, 0.003, d - 0.02), PAPER, 0, 0.009, 0);
  part(a, rbox(0.1, 0.012, 0.025, 0.004), STEEL, 0, 0.014, -d / 2 + 0.018);
  flatLabel(a, title, w - 0.07, 0.035, [0, 0.013, -d / 2 + 0.055]);
  for (let i = 0; i < 5; i++) {
    part(a, box(w - 0.06, 0.002, 0.003), '#b6c7ba', 0, 0.013, -0.04 + i * 0.029, { outline: false });
    part(a, box(0.003, 0.002, d - 0.1), '#b6c7ba', -w / 2 + 0.06, 0.013, 0.015, { outline: false });
  }
  return a;
}
function written(g: THREE.Object3D, p: E.V, count = 6) {
  return Array.from({ length: count }, (_, i) => part(g, box(0.06 + (i % 3) * 0.025, 0.002, 0.006), '#426b7d', p[0] + (i % 2) * 0.07, p[1], p[2] + Math.floor(i / 2) * 0.03, { ry: i % 2 ? 0.03 : -0.04, outline: false }));
}
function pen(g: THREE.Object3D, color = '#dfae42') {
  const a = group(g);
  part(a, cyl(0.007, 0.006, 0.13, 8), color, 0, 0.015, 0, { rz: -0.25 });
  part(a, cyl(0.006, 0, 0.035, 6), INK, -0.018, -0.063, 0, { rz: Math.PI - 0.25 });
  return a;
}
function bottle(g: THREE.Object3D, title: string, color = WATER, r = 0.047) {
  const a = group(g);
  glass(a, cyl(r, r, 0.17, 14), 0, -0.015, 0);
  glowing(a, cyl(r * 0.85, r * 0.85, 0.10, 14), color, 0, -0.04, 0);
  part(a, cyl(r * 0.5, r * 0.55, 0.045, 12), CREAM, 0, 0.09, 0);
  label(a, title, r * 1.65, 0.05, 0, -0.01, r + 0.002, PAPER, INK);
  const cap = part(a, cyl(r * 0.61, r * 0.61, 0.023, 12), GREEN, 0, 0.12, 0);
  return { root: a, cap };
}
function lens(g: THREE.Object3D) {
  const a = group(g);
  part(a, cyl(0.011, 0.011, 0.12, 8), GREEN, 0, -0.03, 0);
  part(a, ring(0.065, 0.009), STEEL, 0, 0.075, -0.025, { rx: -0.45 });
  glass(a, cyl(0.058, 0.058, 0.003, 24), 0, 0.075, -0.025, undefined, Math.PI / 2 - 0.45);
  return a;
}
function swap(g: THREE.Object3D, textures: THREE.Texture[], w: number, h: number, p: E.V, flat = false) {
  const mesh = picture(g, textures[0], w, h, ...p);
  if (flat) mesh.rotation.x = -Math.PI / 2;
  const mat = mesh.material as THREE.MeshBasicMaterial;
  return { mesh, set(i: number) {
    const tex = textures[((i % textures.length) + textures.length) % textures.length];
    if (mat.map !== tex) { mat.map = tex; mat.needsUpdate = true; }
  } };
}
function words(key: string, lines: string[], bg = '#193e3b', fg = '#c6efc9') {
  return lines.map((line, i) => painted(`eco-v2-${key}-${i}`, 384, 96, c => {
    c.fillStyle = bg; c.fillRect(0, 0, 384, 96);
    text(c, line, 192, 51, 37, fg, 'center');
  }));
}
function dynamicRod(g: THREE.Object3D, r: number, color: string) {
  const m = part(g, cyl(r, r, 1, 8), color, 0, 0, 0, { outline: false });
  return (a: E.V, b: E.V, visible = true) => {
    m.visible = visible;
    const av = P(a), d = P(b).sub(av);
    m.position.copy(av).addScaledVector(d, 0.5); m.scale.y = Math.max(0.001, d.length());
    m.quaternion.setFromUnitVectors(UP, d.normalize());
  };
}

/** Articulated pupils: feet on clear floor, raised hands and nods answering the guide's beats. */
function pupil(g: THREE.Object3D, x: number, z: number, color: string, pony: boolean) {
  const root = group(g, x, 0, z, -0.55); root.scale.setScalar(0.73);
  for (const sx of [-1, 1]) {
    part(root, cyl(0.055, 0.048, 0.72, 10), '#41576a', sx * 0.09, 0.43, 0);
    part(root, rbox(0.11, 0.07, 0.23, 0.025), PAPER, sx * 0.09, 0.05, 0.04);
  }
  part(root, rbox(0.31, 0.2, 0.23, 0.06), '#41576a', 0, 0.85, 0);
  part(root, rbox(0.35, 0.45, 0.22, 0.07), color, 0, 1.10, 0);
  part(root, box(0.08, 0.1, 0.008), PAPER, -0.08, 1.18, 0.117, { outline: false });
  part(root, cyl(0.045, 0.045, 0.09, 10), SKIN, 0, 1.37, 0);
  const head = group(root, 0, 1.51, 0);
  part(head, ball(0.12), SKIN, 0, 0, 0);
  part(head, ball(0.126), '#342923', 0, 0.045, -0.035);
  part(head, rbox(0.2, 0.055, 0.06, 0.02), '#342923', 0, 0.075, 0.079);
  if (pony) part(head, ball(0.065), '#342923', 0, -0.01, -0.15).scale.y = 1.7;
  for (const sx of [-1, 1]) part(head, ball(0.01), INK, sx * 0.042, 0, 0.113, { outline: false });
  part(head, box(0.04, 0.008, 0.004), '#a05f55', 0, -0.047, 0.114, { outline: false });
  const arms = [-1, 1].map(sx => {
    const upper = dynamicRod(root, 0.044, color), lower = dynamicRod(root, 0.034, SKIN);
    const hand = part(root, ball(0.037), SKIN, 0, 0, 0, { outline: false });
    return (p: E.V) => {
      const shoulder: E.V = [sx * 0.20, 1.29, 0];
      const elbow: E.V = [sx * 0.25, Math.min(1.22, (1.29 + p[1]) / 2 - 0.07), Math.max(0.06, p[2] / 2)];
      upper(shoulder, elbow); lower(elbow, p); place(hand, p);
    };
  });
  return { root, head, pose(raise: number, point: number, nod: number) {
    arms[0]([-0.2 - point * 0.08, 0.88 + point * 0.35, 0.08 + point * 0.31]);
    arms[1]([0.19, 0.88 + raise * 0.92, 0.07 + raise * 0.07]); head.rotation.x = nod;
  } };
}

// Water analysis: six uses, different documents and visible results.
const waterTestBench: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  bench(g);
  label(g, '수질 분석 · 물여울 03', 1.35, 0.12, 0, 0.77, 0.43, GREEN, CREAM);
  for (let i = 0; i < 3; i++) {
    const b = bottle(g, ['pH', 'DO', 'NO₃'][i], ['#f4cd79', '#adcbe1', '#d4a9d4'][i]);
    b.root.position.set(-0.8 + i * 0.14, 1.05, -0.25);
  }
  part(g, rbox(0.52, 0.04, 0.20, 0.01), STEEL, -0.65, 0.96, -0.25);
  label(g, '시약 · 01 / 02 / 03', 0.45, 0.05, -0.65, 1.2, -0.33, CREAM, INK);
  part(g, box(0.32, 0.035, 0.14), GREEN, -0.15, 0.96, 0.18);
  for (const x of [-0.24, -0.15, 0.03]) {
    glass(g, cyl(0.024, 0.024, 0.17, 12), x, 1.06, 0.18);
    glowing(g, cyl(0.018, 0.018, 0.07, 12), WATER, x, 1.015, 0.18);
  }
  const sample = bottle(g, '03-A'); place(sample.root, E.WATER.bottle);
  const cap = part(g, cyl(0.028, 0.028, 0.022, 12), GREEN, -0.4, 0.96, 0.3);
  const tube = group(g, ...E.WATER.tube);
  glass(tube, cyl(0.026, 0.026, 0.16, 12), 0, -0.035, 0);
  const solution = glowing(tube, cyl(0.020, 0.020, 0.09, 12), '#9fd98c', 0, -0.058, 0);
  part(tube, ring(0.025, 0.003), STEEL, 0, 0.048, 0, { rx: Math.PI / 2, outline: false });
  const chartTex = painted('eco-v2-ph-chart', 400, 220, c => {
    c.fillStyle = PAPER; c.fillRect(0, 0, 400, 220);
    text(c, 'pH 색 비교표', 200, 27, 28, DARK, 'center');
    ['#e9a45e', '#e0d068', '#a1cc76', '#61ad9c', '#638fc2'].forEach((col, i) => {
      c.fillStyle = col; c.fillRect(18 + i * 76, 58, 62, 90);
      text(c, String(5 + i), 48 + i * 76, 172, 26, INK, 'center');
    });
    text(c, '시료 03-A · 채수 09:20', 200, 205, 19, GREEN, 'center');
  });
  part(g, rbox(0.48, 0.32, 0.025, 0.008), CREAM, -0.12, 1.25, -0.25);
  picture(g, chartTex, 0.45, 0.27, -0.12, 1.25, -0.235);
  part(g, rbox(0.29, 0.18, 0.24, 0.025), GREEN, 0.21, 1.03, -0.19);
  const lcd = swap(g, words('ph', ['대기  --', '측정 6.8', '측정 7.0', '7.2 pH', 'DO 8.4']), 0.245, 0.068, [0.21, 1.075, -0.062]);
  out.screen = lcd.mesh;
  for (let i = 0; i < 3; i++) part(g, cyl(0.012, 0.012, 0.008, 10), i === 0 ? '#edbc54' : STEEL, 0.13 + i * 0.07, 1.008, -0.063, { rx: Math.PI / 2 });
  const useLight = light(g, out, 0.32, 1.08, -0.06);
  glowing(useLight, box(0.34, 0.012, 0.08), '#f8f5cc', -0.15, 1.47, -0.22);
  const pipette = group(g);
  part(pipette, cyl(0.014, 0.010, 0.12, 10), CREAM, 0, -0.005, 0);
  part(pipette, cyl(0.004, 0.002, 0.08, 8), STEEL, 0, -0.105, 0);
  part(pipette, cyl(0.019, 0.019, 0.028, 10), '#4d92b4', 0, 0.063, 0);
  const probe = group(g);
  part(probe, cyl(0.013, 0.013, 0.10, 10), GREEN, 0, -0.01, 0);
  part(probe, cyl(0.008, 0.008, 0.09, 8), STEEL, 0, -0.10, 0);
  const cableA = dynamicRod(g, 0.004, INK), cableB = dynamicRod(g, 0.004, INK);
  const droplet = glowing(g, ball(0.012), '#80cce1', 0, 0, 0);
  clipboard(g, [0.51, 0.96, 0.18], '측정 / 관찰 기록', 0.48, 0.34);
  const entries = written(g, [0.42, 0.98, 0.14]);
  const pencil = pen(g), magnifier = lens(g);
  const ruler = part(g, box(0.30, 0.01, 0.035), '#dfbd67', 0.51, 0.985, -0.04);
  for (let i = 0; i < 12; i++) part(ruler, box(0.002, 0.002, i % 3 ? 0.012 : 0.024), INK, -0.135 + i * 0.024, 0.006, -0.004, { outline: false });
  const stamp = group(g, 0.81, 1.04, 0.03);
  part(stamp, cyl(0.022, 0.022, 0.018, 12), '#b94e44', 0, -0.055, 0);
  part(stamp, cyl(0.013, 0.018, 0.07, 10), WOOD, 0, -0.015, 0);
  const approval = flatLabel(g, '검토 완료', 0.115, 0.043, [0.59, 0.982, 0.26], PAPER, '#ba493f');
  const radio = group(g);
  part(radio, rbox(0.06, 0.12, 0.04, 0.01), INK, 0, 0, 0);
  part(radio, cyl(0.004, 0.004, 0.11, 6), INK, -0.021, 0.1, 0);
  const page = group(g, 0.28, 0.984, 0.18);
  part(page, box(0.22, 0.003, 0.30), PAPER, 0.11, 0, 0, { outline: false });
  const map = painted('eco-v2-field-map', 360, 220, c => {
    c.fillStyle = '#f4f1d8'; c.fillRect(0, 0, 360, 220);
    c.strokeStyle = '#9bcbc7'; c.lineWidth = 34; c.beginPath(); c.moveTo(10, 190); c.bezierCurveTo(240, 210, 100, 0, 340, 40); c.stroke();
    text(c, '물여울 조사 구역', 180, 23, 24, DARK, 'center');
    ['A 상류', 'B 보전구역', 'C 하류'].forEach((s, i) => { c.fillStyle = '#da8559'; c.beginPath(); c.arc(70 + i * 100, 150 - i * 45, 8, 0, Math.PI * 2); c.fill(); text(c, s, 70 + i * 100, 175 - i * 45, 17, INK, 'center'); });
  });
  picture(g, map, 0.48, 0.29, 0.62, 1.22, -0.28);
  const pin = glowing(g, ball(0.018), '#db8053', 0.49, 1.00, 0.14);
  const route = Array.from({ length: 8 }, (_, i) => part(g, box(0.018, 0.003, 0.007), '#bf7150', 0.38 + i * 0.028, 0.982, 0.11 + 0.05 * Math.sin(i / 7 * Math.PI), { outline: false }));
  const leaf = group(g, 0.22, 0.983, 0.14);
  rod(leaf, v(-0.04, 0, -0.07), v(0.04, 0, 0.07), 0.004, '#60804c');
  for (const sx of [-1, 1]) part(leaf, ball(0.045), '#8d9e5b', sx * 0.035, 0, 0, { outline: false }).scale.set(1, 0.08, 1.3);
  const defs: Array<[string, E.EcoMotion, number]> = [
    ['testWater', 'ecoPipette', 0], ['logData', 'ecoLog', 0.46],
    ['conservationist_speciesID', 'ecoIdentify', 0.40], ['conservationist_impactReport', 'ecoImpact', 0.46],
    ['conservationist_projectPlan', 'ecoPlan', 0.46], ['conservationist_monitorSite', 'ecoMonitor', 0.46],
  ];
  const spots = Object.fromEntries(defs.map(([id, motion, x]) => [id, use(g, motion, x)]));
  out.spots = { ...spots, '*': spots.logData }; out.work = spots.testWater.work;
  out.away = (_away, t) => {
    const s = current(Object.values(spots), t), a = s && now(s, t), key = a?.b.key;
    const testing = s?.motion === 'ecoPipette';
    sample.cap.visible = !testing || key === 'reset' || key === 'uncap' && a!.b.u < 0.12;
    cap.visible = testing && !sample.cap.visible;
    place(cap, key === 'uncap' ? E.add(a!.r, 0, 0.02) : [-0.4, 0.96, 0.3]);
    place(sample.root, E.WATER.bottle);
    place(pipette, testing && (key === 'draw' || key === 'dose') ? a!.r : E.WATER.pipette);
    const heldTube = testing && (key === 'shake' || key === 'compare' || key === 'reset');
    place(tube, heldTube ? a!.r : E.WATER.tube);
    tube.rotation.z = testing && key === 'shake' ? 0.25 * Math.sin(t * 16) : 0;
    solution.scale.y = testing && a!.b.i < 2 ? 0.4 : 1;
    place(probe, testing && key === 'probe' ? a!.r : E.WATER.probe);
    const pp = probe.position;
    cableA([0.33, 1.04, -0.16], [0.35, 0.98, 0.02]); cableB([0.35, 0.98, 0.02], [pp.x, pp.y + 0.05, pp.z]);
    droplet.visible = testing && key === 'dose' && a!.b.u > 0.25 && a!.b.u < 0.85;
    if (droplet.visible) place(droplet, E.add(a!.r, 0, -0.14 - E.frac(t * 2.7) * 0.09));
    lcd.set(testing && key === 'probe' ? 1 + Math.min(2, Math.floor(a!.b.u * 3)) : a && a.b.i >= 6 ? 3 : s?.motion === 'ecoMonitor' ? 4 : 0);
    const writing = key === 'record' || key === 'write' || key === 'mark' || key === 'route';
    place(pencil, writing ? a!.r : E.WATER.pen); pencil.rotation.z = writing ? -0.1 : Math.PI / 2;
    entries.forEach((m, i) => m.visible = !!a && (writing ? i < Math.ceil(a.b.u * entries.length) : a.b.i > 3));
    const identifying = s?.motion === 'ecoIdentify';
    place(magnifier, identifying && (key === 'lens' || key === 'compare') ? a!.r : [0.8, 1.10, -0.12]);
    leaf.visible = identifying;
    place(leaf, identifying && key === 'compare' ? a!.l : [0.22, 0.983, 0.14]);
    leaf.rotation.x = identifying && key === 'compare' ? 0.65 : 0;
    ruler.position.y = key === 'measure' ? 1.01 : 0.985;
    approval.visible = s?.motion === 'ecoImpact' && (key === 'file' || (key === 'stamp' && a!.b.u > 0.45));
    place(stamp, key === 'stamp' ? a!.r : [0.81, 1.04, 0.03]);
    place(radio, key === 'radio' ? a!.r : [0.84, 1.03, -0.28]);
    page.rotation.z = key === 'open' ? Math.PI * Math.sin(a!.b.u * Math.PI) : 0;
    page.visible = !!a && !testing && key === 'open';
    pin.visible = s?.motion === 'ecoPlan' && a!.b.i >= 2;
    if (pin.visible) place(pin, key === 'place' ? a!.r : [0.49, 0.992, 0.14]);
    route.forEach((m, i) => m.visible = s?.motion === 'ecoPlan' && (a!.b.i > 3 || (key === 'route' && i / route.length < a!.b.u)));
  };
};

function sprout(g: THREE.Object3D, p: E.V, scale = 1, dry = false) {
  const a = group(g, ...p); a.scale.setScalar(scale);
  rod(a, v(0, 0, 0), v(0.01, 0.25, 0), 0.006, dry ? '#8d8252' : '#568449');
  for (let i = 0; i < 3; i++) for (const sx of [-1, 1]) {
    const leaf = part(a, ball(0.065), dry ? '#a19b67' : i % 2 ? '#7ca65b' : '#55915a', sx * 0.047, 0.09 + i * 0.065, 0, { outline: false });
    leaf.scale.set(1, 0.17, 0.42); leaf.rotation.z = sx * 0.4;
    rod(a, v(0, 0.09 + i * 0.065, 0), v(sx * 0.074, 0.12 + i * 0.065, 0), 0.0015, '#b0bd6e');
  }
  return a;
}
function pot(g: THREE.Object3D, p: E.V, r = 0.09) {
  const a = group(g, ...p);
  part(a, cyl(r, r * 0.72, 0.14, 14), '#b87b52', 0, 0.07, 0);
  part(a, cyl(r + 0.008, r + 0.008, 0.035, 14), '#c68a60', 0, 0.125, 0);
  part(a, cyl(r * 0.88, r * 0.88, 0.006, 14), SOIL, 0, 0.143, 0, { outline: false });
  return a;
}
function wateringCan(g: THREE.Object3D) {
  const a = group(g);
  part(a, cyl(0.09, 0.075, 0.18, 16), '#7bada2', -0.04, -0.1, 0);
  part(a, ring(0.066, 0.011), DARK, 0.047, -0.06, 0);
  rod(a, v(-0.1, -0.14, 0), v(-0.24, -0.04, 0), 0.018, '#7bada2');
  part(a, cyl(0.04, 0.02, 0.04, 12), STEEL, -0.25, -0.03, 0, { rz: 0.9 });
  part(a, cyl(0.043, 0.043, 0.009, 12), INK, -0.04, -0.007, 0);
  return a;
}
const seedlingNursery: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  bench(g);
  part(g, box(1.78, 0.025, 0.72), '#756347', 0, 0.956, 0);
  label(g, '자생식물 · 파종 / 이식 / 관수', 1.55, 0.11, 0, 0.77, 0.43, GREEN, CREAM);
  part(g, rbox(0.65, 0.045, 0.60, 0.012), DARK, -0.5, 0.99, -0.02);
  const plugs: THREE.Group[] = [];
  for (let i = 0; i < 9; i++) {
    const x = -0.74 + (i % 3) * 0.21, z = -0.23 + Math.floor(i / 3) * 0.22;
    pot(g, [x, 1.0, z], 0.065);
    if (i !== 8) plugs.push(sprout(g, [x, 1.15, z], 0.52 + (i % 3) * 0.08));
  }
  for (const [x, s] of [[-0.7, '달뿌리풀'], [-0.28, '벌개미취']] as const) {
    part(g, box(0.012, 0.24, 0.012), CREAM, x, 1.18, -0.26);
    label(g, s, 0.2, 0.06, x, 1.30, -0.25, PAPER, GREEN);
  }
  const plug = group(g, ...E.NURSERY.plug);
  part(plug, cyl(0.045, 0.033, 0.09, 12), SOIL, 0, -0.06, 0);
  sprout(plug, [0, 0, 0], 0.78);
  pot(g, [0.13, 0.97, 0.19], 0.115);
  const soil = part(g, cyl(0.1, 0.1, 0.01, 16), '#705540', 0.13, 1.115, 0.19, { outline: false });
  const damp = glowing(g, cyl(0.098, 0.098, 0.003, 16), '#423b2d', 0.13, 1.122, 0.19);
  part(g, rbox(0.36, 0.16, 0.29, 0.035), '#d1bb91', 0.54, 1.04, -0.15);
  part(g, box(0.31, 0.02, 0.24), SOIL, 0.54, 1.125, -0.15);
  label(g, '상토 · 5 L', 0.23, 0.07, 0.54, 1.04, 0.001, PAPER, INK);
  for (let i = 0; i < 3; i++) pot(g, [0.8, 0.97 + i * 0.045, -0.15], 0.075);
  const scoop = group(g);
  part(scoop, cyl(0.013, 0.013, 0.14, 8), WOOD, 0, 0, 0);
  part(scoop, rbox(0.073, 0.025, 0.1, 0.012), STEEL, 0, -0.09, -0.01);
  const scoopSoil = part(scoop, ball(0.03), SOIL, 0, -0.07, -0.01, { outline: false });
  scoopSoil.scale.y = 0.4;
  const can = wateringCan(g);
  const tag = group(g);
  part(tag, box(0.014, 0.14, 0.008), PAPER, 0, -0.06, 0);
  label(tag, '03 / 이식', 0.10, 0.04, 0, 0.02, 0.006, PAPER, GREEN);
  const droplets = Array.from({ length: 12 }, () => glowing(g, ball(0.009), '#9cdae8', 0, 0, 0));
  const grains = Array.from({ length: 7 }, () => part(g, ball(0.009), SOIL, 0, 0, 0, { outline: false }));
  for (const x of [-0.86, 0.86]) {
    part(g, cyl(0.018, 0.018, 0.84, 8), STEEL, x, 1.36, -0.34);
    part(g, cyl(0.024, 0.024, 0.025, 10), INK, x, 1.58, -0.34);
  }
  part(g, rbox(1.78, 0.065, 0.17, 0.015), GREEN, 0, 1.77, -0.34);
  const on = light(g, out, 0.8, 1.77, -0.25);
  out.glow = glowing(g, box(1.64, 0.012, 0.12), '#fff2c4', 0, 1.731, -0.34);
  glowing(on, box(1.64, 0.014, 0.12), '#ffffd8', 0, 1.729, -0.34);
  label(g, '광주기 14h / 22°C', 0.47, 0.055, 0.54, 1.77, -0.252, GREEN, CREAM);
  for (let i = 0; i < 3; i++) part(g, rbox(0.42, 0.16, 0.40, 0.025), i % 2 ? '#8c9976' : '#d8c69f', -0.6 + i * 0.6, 0.37, -0.03);
  const s = use(g, 'ecoPot', 0.12);
  out.spots = { plantSeedlings: s, '*': s }; out.work = s.work;
  out.away = (_away, t) => {
    const a = current([s], t) ? now(s, t) : null, key = a?.b.key;
    place(plug, key === 'lift' || key === 'plant' ? a!.r : a && a.b.i >= 3 ? E.NURSERY.pot : E.NURSERY.plug);
    plug.rotation.z = key === 'loosen' ? 0.23 * Math.sin(t * 7) : 0;
    soil.scale.y = a && a.b.i >= 4 ? 1.4 : 1;
    damp.visible = !!a && (a.b.i > 5 || (key === 'water' && a.b.u > 0.3));
    place(scoop, key === 'scoop' ? a!.r : [0.78, 1.04, 0.27]); scoop.rotation.z = key === 'scoop' ? -0.4 * a!.b.u : 1.4;
    scoopSoil.visible = key === 'scoop' && a!.b.u < 0.8;
    const pouring = key === 'water';
    place(can, pouring || key === 'return' ? a!.r : E.NURSERY.can); can.rotation.z = pouring ? 0.23 : 0;
    place(tag, key === 'label' ? a!.r : a && a.b.i > 6 ? [0.21, 1.21, 0.16] : E.NURSERY.tag);
    droplets.forEach((d, i) => {
      d.visible = pouring && a!.b.seconds > 0.35;
      const u = E.frac(t * 2.0 + i / 12);
      // Start at the tilted rose, rather than a fixed point floating above the pot.
      const nozzle = v(-0.25, -0.03, 0).applyEuler(can.rotation).add(can.position);
      d.position.set(E.mix(nozzle.x, 0.13 + Math.sin(i * 2.4) * 0.035, u), E.mix(nozzle.y, 1.12, u * u), E.mix(nozzle.z, 0.19 + Math.cos(i * 2.4) * 0.035, u));
    });
    grains.forEach((d, i) => {
      d.visible = key === 'scoop' && a!.b.u > 0.6;
      d.position.set(0.13 + Math.sin(i * 2.1) * 0.06, 1.18 - E.frac(t * 2 + i * 0.13) * 0.07, 0.19 + Math.cos(i * 2.1) * 0.05);
    });
    plugs.forEach((p, i) => p.rotation.z = 0.015 * Math.sin(t + i));
  };
};

function fish(g: THREE.Object3D, scale = 1) {
  const a = group(g); a.scale.setScalar(scale);
  glowing(a, ball(0.055), '#83bcd2', 0, 0, 0).scale.set(1.7, 0.72, 0.5);
  const tail = group(a, -0.085, 0, 0);
  part(tail, cyl(0.044, 0, 0.065, 3), '#d6a25c', -0.023, 0, 0, { rz: -Math.PI / 2, outline: false }).scale.z = 0.25;
  for (const sx of [-1, 1]) {
    glowing(a, box(0.10, 0.011, 0.003), '#344f64', 0, 0, sx * 0.028);
    glowing(a, ball(0.009), INK, 0.057, 0.013, sx * 0.026);
    part(a, ball(0.022), '#e2bb75', -0.01, -0.02, sx * 0.026, { outline: false }).scale.set(1, 0.2, 0.8);
  }
  return { root: a, tail };
}
function frog(g: THREE.Object3D) {
  const a = group(g);
  glowing(a, ball(0.060), '#89b94c', 0, 0.04, 0).scale.set(1, 0.65, 1.3);
  for (const sx of [-1, 1]) {
    glowing(a, ball(0.038), '#5a9244', sx * 0.05, 0.026, -0.04).scale.set(0.8, 0.7, 1.2);
    rod(a, v(sx * 0.036, 0.04, 0.05), v(sx * 0.064, 0.006, 0.08), 0.012, '#78a946');
    glowing(a, ball(0.022), '#a9cd58', sx * 0.03, 0.074, 0.045);
    glowing(a, ball(0.009), INK, sx * 0.03, 0.08, 0.061);
  }
  return a;
}
function net(g: THREE.Object3D) {
  const a = group(g);
  rod(a, v(0, 0.04, 0), v(0, -0.12, -0.11), 0.01, WOOD);
  part(a, ring(0.092, 0.006), STEEL, 0, -0.145, -0.15, { rx: Math.PI / 2 });
  for (let i = -2; i <= 2; i++) {
    const d = i * 0.027, len = Math.sqrt(0.085 ** 2 - d ** 2);
    rod(a, v(d, -0.151, -0.15 - len), v(d, -0.18, -0.15 + len), 0.002, '#b8d0bd');
    rod(a, v(-len, -0.165, -0.15 + d), v(len, -0.165, -0.15 + d), 0.002, '#b8d0bd');
  }
  return a;
}
const specimenTank: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  part(g, rbox(0.94, 0.57, 0.79, 0.025), GREEN, 0, 0.31, -0.02);
  for (const x of [-0.22, 0.22]) {
    part(g, rbox(0.40, 0.41, 0.02, 0.012), '#56796b', x, 0.32, 0.384);
    part(g, box(0.08, 0.02, 0.025), STEEL, x, 0.45, 0.4);
  }
  label(g, '피라미 / 참개구리', 0.76, 0.09, 0, 0.57, 0.396, CREAM, INK);
  part(g, box(0.94, 0.04, 0.81), STEEL, 0, 0.62, -0.02);
  glowing(g, box(0.84, 0.035, 0.70), '#d8c99b', 0, 0.66, -0.04);
  const clear = new THREE.MeshBasicMaterial({ color: '#c9f4ef', transparent: true, opacity: 0.10, depthWrite: false, side: THREE.DoubleSide });
  const water = new THREE.MeshBasicMaterial({ color: '#8fd2dd', transparent: true, opacity: 0.15, depthWrite: false, side: THREE.DoubleSide });
  for (const x of [-0.44, 0.44]) glass(g, box(0.006, 0.50, 0.76), x, 0.90, -0.02, clear);
  glass(g, box(0.88, 0.50, 0.006), 0, 0.90, 0.36, clear);
  glowing(g, box(0.86, 0.47, 0.008), '#cce9d7', 0, 0.89, -0.395);
  glass(g, box(0.84, 0.003, 0.68), 0, 1.015, -0.03, water);
  // No opaque hood: rear light rail, open front for the net and feed.
  part(g, box(0.93, 0.045, 0.10), GREEN, 0, 1.16, -0.35);
  const on = light(g, out, 0.4, 1.16, -0.295);
  glowing(on, box(0.79, 0.012, 0.08), '#fffcd8', 0, 1.13, -0.35);
  for (let i = 0; i < 24; i++) {
    const x = Math.sin(i * 5.3) * 0.38, z = Math.cos(i * 3.7) * 0.30;
    part(g, ball(0.018 + (i % 3) * 0.006), ['#c1b68e', '#eee1b5', '#8f9f96'][i % 3], x, 0.69, z, { outline: false }).scale.y = 0.5;
  }
  for (const x of [-0.33, -0.24]) sprout(g, [x, 0.69, -0.26], 0.8);
  part(g, ball(0.15), '#a7b79b', 0.26, 0.91, -0.21).scale.set(1, 0.95, 0.8);
  const amphibian = frog(g);
  const school = Array.from({ length: 5 }, (_, i) => fish(g, 0.95 + i * 0.04));
  const viewingFish = fish(g, 1.05); viewingFish.root.visible = false;
  // The counting box lives on a low side shelf, leaving the swimming school unobstructed.
  part(g, box(0.40, 0.025, 0.25), STEEL, 0.28, 0.78, 0.47);
  rod(g, v(0.39, 0.61, 0.37), v(0.39, 0.77, 0.54), 0.012, STEEL);
  const tray = group(g, 0.28, 0.81, 0.47);
  part(tray, rbox(0.30, 0.025, 0.21, 0.01), CREAM, 0, 0, 0);
  for (const x of [-0.15, 0.15]) glass(tray, box(0.005, 0.12, 0.21), x, 0.06, 0, clear);
  glass(tray, box(0.30, 0.12, 0.005), 0, 0.06, 0.1, clear);
  glowing(tray, box(0.28, 0.004, 0.19), '#c6edf0', 0, 0.025, 0);
  label(tray, '관찰 후 방류', 0.24, 0.04, 0, -0.015, 0.111, CREAM, GREEN);
  const food = bottle(g, '먹이', '#d5b16b', 0.039); place(food.root, E.TANK.jar);
  part(g, box(0.16, 0.018, 0.14), CREAM, 0.34, 1.035, 0.32);
  rod(g, v(-0.44, 0.65, 0.22), v(-0.44, 1.34, 0.22), 0.012, STEEL);
  rod(g, v(-0.44, 1.32, 0.22), v(-0.33, 1.32, 0.22), 0.008, STEEL);
  const foodCap = part(g, cyl(0.024, 0.024, 0.022, 12), GREEN, 0.39, 1.09, 0.32);
  const magnifier = lens(g), scoop = net(g), pencil = pen(g);
  part(g, box(0.49, 0.035, 0.24), WOOD, -0.2, 0.76, 0.46);
  clipboard(g, [-0.19, 0.78, 0.49], '종 / 개체 수', 0.39, 0.19);
  const marks = written(g, [-0.26, 0.803, 0.49], 4);
  const counter = swap(g, words('fish-count', ['개체 수  --', '개체 수  1', '개체 수  2', '개체 수  3', '개체 수  4', '개체 수  5']), 0.32, 0.07, [-0.23, 1.12, -0.295]);
  out.screen = counter.mesh;
  const bubbles = Array.from({ length: 7 }, () => glowing(g, ball(0.009), '#e6fbfa', 0, 0, 0));
  part(g, box(0.055, 0.26, 0.08), '#7a9b90', -0.36, 0.84, -0.32);
  const crumbs = Array.from({ length: 9 }, () => glowing(g, ball(0.008), '#a4753d', 0, 0, 0));
  const observe = use(g, 'ecoObserve', -0.1, 0.75), feed = use(g, 'ecoFeed', 0.05, 0.73), count = use(g, 'ecoCount', 0, 0.75);
  out.spots = { monitorSpecies: observe, feedSpecies: feed, conservationist_fishSurvey: count, '*': observe }; out.work = observe.work;
  out.away = (_away, t) => {
    const s = current([observe, feed, count], t), a = s && now(s, t), key = a?.b.key;
    const counting = s === count, feeding = s === feed;
    const captured = counting && (key === 'lift' || key === 'box' || key === 'count' || key === 'release');
    school.forEach((f, i) => {
      const angle = t * 0.7 + i * 0.43;
      f.root.visible = !(captured && i === 0);
      f.root.position.set(Math.sin(angle) * 0.25, 0.79 + i * 0.030 + Math.sin(t * 1.5 + i) * 0.014, 0.15 + Math.cos(angle) * 0.10);
      f.root.rotation.y = Math.atan2(Math.sin(angle) * 0.14, Math.cos(angle) * 0.25);
      if (feeding && (key === 'sprinkle' || key === 'watch')) f.root.position.y += 0.035;
      f.tail.rotation.y = 0.45 * Math.sin(t * 9 + i);
    });
    const hop = E.frac(t / 6);
    amphibian.position.set(0.24 + (hop < 0.2 ? Math.sin(hop / 0.2 * Math.PI) * 0.035 : 0), 1.005 + (hop < 0.2 ? Math.sin(hop / 0.2 * Math.PI) * 0.065 : 0), -0.19);
    amphibian.rotation.y = -0.3 + 0.16 * Math.sin(t * 0.4);
    place(magnifier, s === observe && ['lens', 'follow', 'frog'].includes(key!) ? a!.r : E.TANK.lens);
    const netHeld = counting && ['net', 'dip', 'lift', 'box', 'release'].includes(key!);
    place(scoop, netHeld ? a!.r : [-0.34, 1.25, 0.22]);
    scoop.rotation.z = key === 'box' ? 0.25 : 0;
    viewingFish.root.visible = captured;
    if (captured) place(viewingFish.root, key === 'count' ? [0.28 + Math.sin(t * 3) * 0.035, 0.86, 0.47] : E.add(a!.r, 0, -0.15, -0.15));
    viewingFish.tail.rotation.y = 0.3 * Math.sin(t * 10);
    counter.set(counting && key === 'count' ? 1 + Math.min(4, Math.floor(a!.b.u * 5)) : counting && a!.b.i > 4 ? 5 : 0);
    place(pencil, key === 'write' ? a!.r : [-0.4, 0.83, 0.48]);
    pencil.rotation.z = key === 'write' ? 0 : Math.PI / 2;
    marks.forEach((m, i) => m.visible = key === 'write' && i < Math.ceil(a!.b.u * 4));
    food.cap.visible = !feeding || key === 'close' || key === 'open' && a!.b.u < 0.12;
    foodCap.visible = feeding && !food.cap.visible;
    place(foodCap, key === 'open' ? E.add(a!.r, 0, 0.02) : [0.39, 1.09, 0.32]);
    bubbles.forEach((b, i) => b.position.set(-0.34 + 0.01 * Math.sin(t + i), 0.74 + E.frac(t * 0.3 + i / 7) * 0.28, -0.27));
    crumbs.forEach((c, i) => {
      c.visible = feeding && (key === 'sprinkle' || (key === 'watch' && a!.b.u < 0.55));
      c.position.set(-0.07 + Math.sin(i * 2.4) * 0.06, 1.20 - E.frac(t * 0.65 + i / 9) * 0.45, 0.09 + Math.cos(i * 2.4) * 0.06);
    });
  };
};

function recyclingItem(g: THREE.Object3D, kind: number) {
  const a = group(g);
  if (kind === 0) {
    for (let i = 0; i < 3; i++) part(a, box(0.13, 0.007, 0.10), i % 2 ? PAPER : '#d9cfb1', 0, i * 0.008, 0, { ry: i * 0.06 });
    flatLabel(a, '종이', 0.07, 0.03, [0, 0.024, 0]);
  } else if (kind === 1) {
    part(a, cyl(0.033, 0.033, 0.10, 16), STEEL, 0, 0, 0);
    part(a, cyl(0.029, 0.029, 0.004, 16), '#d9e3e4', 0, 0.053, 0);
    part(a, ring(0.009, 0.002), INK, 0, 0.057, 0, { rx: Math.PI / 2 });
    label(a, 'CAN', 0.052, 0.04, 0, 0, 0.034, '#d4aa45', INK);
  } else {
    glowing(a, cyl(0.032, 0.034, 0.12, 12), '#c3dfd8', 0, -0.01, 0);
    part(a, cyl(0.014, 0.03, 0.03, 12), '#c3dfd8', 0, 0.064, 0);
    part(a, cyl(0.015, 0.015, 0.02, 12), GREEN, 0, 0.087, 0);
    part(a, cyl(0.034, 0.034, 0.04, 12), '#e8dcba', 0, -0.005, 0);
  }
  return a;
}
const recycleStation: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  const colors = ['#6399b5', '#c2a653', '#6e9b68'];
  const fill: THREE.Group[][] = [];
  colors.forEach((color, i) => {
    const x = (i - 1) * 0.53;
    part(g, rbox(0.48, 0.65, 0.58, 0.035), color, x, 0.36, -0.13);
    part(g, box(0.40, 0.015, 0.48), DARK, x, 0.695, -0.13);
    for (const sx of [-1, 1]) part(g, box(0.03, 0.08, 0.56), color, x + sx * 0.225, 0.71, -0.13);
    label(g, ['종이', '캔', '플라스틱'][i], 0.37, 0.12, x, 0.49, 0.167, PAPER, INK);
    label(g, ['펼쳐서', '비워서', '라벨 제거'][i], 0.32, 0.05, x, 0.36, 0.167, color, PAPER);
    part(g, box(0.32, 0.018, 0.10), STEEL, x, 0.10, 0.18);
    fill.push(Array.from({ length: 5 }, (_, j) => {
      const a = recyclingItem(g, i);
      a.position.set(x + Math.sin(j * 3.5) * 0.10, 0.70 + Math.floor(j / 2) * 0.045, -0.15 + Math.cos(j * 3.5) * 0.12);
      a.rotation.set(i === 0 ? 0 : 1.2, j * 0.6, 0); return a;
    }));
  });
  for (const x of [-0.87, 0.87]) part(g, box(0.035, 1.56, 0.035), STEEL, x, 0.78, -0.37);
  part(g, rbox(1.8, 0.29, 0.035, 0.014), GREEN, 0, 1.43, -0.37);
  label(g, '비우고 · 헹구고 · 분리하기', 1.68, 0.12, 0, 1.48, -0.348, GREEN, CREAM);
  label(g, '혼합 수거물 → 재질 확인 → 올바른 통', 1.58, 0.065, 0, 1.36, -0.348, GREEN, '#b8d3bd');
  part(g, box(1.76, 0.045, 0.26), WOOD, 0, 0.91, 0.30);
  for (const x of [-0.83, 0.83]) part(g, box(0.035, 0.88, 0.035), STEEL, x, 0.44, 0.38);
  part(g, rbox(0.56, 0.025, 0.24, 0.012), CREAM, -0.08, 0.95, 0.32);
  for (const x of [-0.36, 0.2]) part(g, box(0.02, 0.09, 0.24), CREAM, x, 0.98, 0.32);
  const items = [0, 1, 2].map(i => recyclingItem(g, i));
  const scraps = [0, 1, 2].map(i => part(g, box(0.07, 0.004, 0.035), ['#c2a886', '#b2b8b7', '#e8dcba'][i], 0.43 + i * 0.07, 0.945, 0.30, { ry: i * 0.4, outline: false }));
  clipboard(g, [0.30, 0.94, 0.37], '분류 수량', 0.28, 0.20);
  const pencil = pen(g), marks = written(g, [0.24, 0.96, 0.37], 4);
  const tally = swap(g, words('sort', ['분류 대기', '종이  01', '캔  01', '플라스틱  01', '분류 완료']), 0.45, 0.10, [0, 1.16, -0.32]);
  out.screen = tally.mesh; light(g, out, 0.76, 1.43, -0.343);
  const s = use(g, 'ecoSort', 0, 0.76);
  out.spots = { sortRecycling: s, '*': s }; out.work = s.work;
  out.away = (_away, t) => {
    const a = current([s], t) ? now(s, t) : null;
    const bin = a ? E.sortBin(a.b.n) : 0, key = a?.b.key;
    // Step along the front for the destination bin, with the same ease as the carrying hand.
    const target = a ? E.sortX(a.b.key, a.b.n) : 0;
    const previous = a ? E.sortX(a.b.previous, a.b.n) : 0;
    s.at.position.x = E.mix(previous, target, a ? E.sm(a.b.seconds, 0, 0.5) : 1);
    items.forEach((item, i) => {
      item.visible = true; item.rotation.set(0, 0, 0);
      place(item, [(i - 1) * 0.16, 1.01, 0.34]);
      if (!a || i !== bin) return;
      if (key === 'pick' || key === 'inspect' || key === 'separate' || key === 'carry') {
        place(item, a.r); item.rotation.y = key === 'inspect' ? 0.6 * Math.sin(t * 3) : 0;
      } else if (key === 'drop') {
        const drop = E.sm(a.b.u, 0.25, 0.8);
        place(item, [(bin - 1) * 0.53, 1.03 - 0.27 * drop, 0.02 - 0.13 * drop]);
      } else item.visible = false;
    });
    fill.forEach((list, i) => list.forEach((item, j) => item.visible = a ? j < 1 + ((a.b.n + i + 9) % 3) + (i === bin && key === 'tally' ? 1 : 0) : j < 2));
    scraps.forEach((m, i) => m.visible = !!a && i === bin && a.b.i >= 2);
    place(pencil, key === 'tally' ? a!.r : [0.73, 0.98, 0.34]); pencil.rotation.z = key === 'tally' ? 0 : Math.PI / 2;
    marks.forEach((m, i) => m.visible = key === 'tally' && i < Math.ceil(a!.b.u * 4));
    tally.set(a ? key === 'tally' ? 4 : bin + 1 : 0);
  };
};

function binoculars(g: THREE.Object3D) {
  const a = group(g);
  for (const x of [-0.05, 0.05]) {
    part(a, cyl(0.032, 0.041, 0.13, 14), INK, x, 0, 0, { rx: Math.PI / 2 });
    glowing(a, cyl(0.029, 0.029, 0.006, 14), '#72a1b1', x, 0, -0.068, Math.PI / 2);
    part(a, ring(0.039, 0.004), GREEN, x, 0, -0.062);
  }
  part(a, box(0.10, 0.03, 0.06), GREEN, 0, 0, 0);
  part(a, cyl(0.018, 0.018, 0.045, 10), INK, 0, 0.02, 0, { rx: Math.PI / 2 });
  return a;
}
const ecoFieldRack: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  for (const x of [-0.87, 0.87]) {
    part(g, box(0.045, 1.88, 0.045), GREEN, x, 0.94, -0.31);
    part(g, rbox(0.16, 0.04, 0.72, 0.01), GREEN, x, 0.02, -0.04);
  }
  part(g, box(1.78, 0.06, 0.045), GREEN, 0, 1.86, -0.31);
  part(g, box(1.76, 0.03, 0.68), WOOD, 0, 0.18, -0.03);
  part(g, box(1.7, 0.03, 0.10), STEEL, 0, 1.49, -0.26);
  label(g, '현장 장비 · 점검 후 출발', 1.50, 0.12, 0, 1.74, -0.28, GREEN, CREAM);
  for (let i = 0; i < 6; i++) {
    const x = -0.7 + i * 0.28;
    rod(g, v(x, 1.5, -0.3), v(x, 1.45, -0.12), 0.008, STEEL);
  }
  const boots = group(g, -0.37, 0, -0.02);
  for (const sx of [-1, 1]) {
    part(boots, rbox(0.16, 0.52, 0.18, 0.045), '#65724e', sx * 0.11, 0.49, 0);
    part(boots, rbox(0.18, 0.13, 0.31, 0.04), '#42513e', sx * 0.11, 0.25, 0.055);
    part(boots, box(0.18, 0.025, 0.30), INK, sx * 0.11, 0.195, 0.055);
    part(boots, cyl(0.055, 0.055, 0.007, 12), INK, sx * 0.11, 0.754, 0);
    rod(g, v(-0.37 + sx * 0.11, 0.76, -0.03), v(-0.37 + sx * 0.11, 1.46, -0.2), 0.013, '#b4b68b');
  }
  // High-visibility vest and folded gloves, a sample cooler, wash tray and drying grating.
  const vest = group(g, 0.61, 1.38, -0.20);
  for (const sx of [-1, 1]) part(vest, rbox(0.13, 0.40, 0.045, 0.02), '#d6ac50', sx * 0.08, -0.18, 0);
  for (const y of [-0.12, -0.29]) part(vest, box(0.30, 0.035, 0.05), '#d7ded2', 0, y, 0);
  part(g, rbox(0.41, 0.29, 0.35, 0.025), CREAM, 0.56, 0.36, 0.01);
  part(g, box(0.43, 0.045, 0.37), GREEN, 0.56, 0.52, 0.01);
  label(g, '시료 보냉', 0.29, 0.07, 0.56, 0.37, 0.189, CREAM, INK);
  part(g, box(0.62, 0.045, 0.39), WOOD, 0.05, 0.98, 0.13);
  for (let i = 0; i < 8; i++) part(g, box(0.035, 0.01, 0.3), STEEL, -0.73 + i * 0.06, 0.21, 0.08, { outline: false });
  clipboard(g, [0.18, 1.01, 0.27], '장비 점검', 0.25, 0.20);
  const ticks = written(g, [0.12, 1.03, 0.27], 4), pencil = pen(g);
  const binocular = binoculars(g), scoop = net(g);
  // Long pole hangs alongside the small hand net; stays on the rack during the optical check.
  rod(g, v(0.40, 0.22, -0.22), v(0.40, 1.28, -0.22), 0.013, WOOD);
  part(g, ring(0.16, 0.008), STEEL, 0.40, 1.37, -0.22);
  for (let i = -2; i <= 2; i++) rod(g, v(0.4 + i * 0.04, 1.25, -0.22), v(0.4 + i * 0.04, 1.49, -0.22), 0.002, '#b8d0bd');
  const s = use(g, 'ecoGear', 0.02, 0.74);
  out.spots = { ecoCheckGear: s, '*': s }; out.work = s.work;
  light(g, out, 0.75, 1.74, -0.26);
  out.away = (_away, t) => {
    const a = current([s], t) ? now(s, t) : null, key = a?.b.key;
    const optical = ['binocular', 'look', 'focus', 'return'].includes(key!);
    if (optical) place(binocular, key === 'look' || key === 'focus' ? E.lerp(a!.l, a!.r, 0.5) : a!.r);
    else place(binocular, [0, 1.05, 0.18]);
    binocular.rotation.x = key === 'look' || key === 'focus' ? 0 : -0.25;
    place(scoop, key === 'net' ? a!.r : [0.33, 1.23, 0.08]);
    scoop.rotation.z = key === 'net' ? Math.sin(t * 3) * 0.12 : 0;
    boots.rotation.z = key === 'boots' ? Math.sin(t * 4) * 0.025 : 0;
    boots.position.y = key === 'boots' ? 0.09 : 0;
    boots.position.z = key === 'boots' ? 0.16 : -0.02;
    place(pencil, key === 'tick' ? a!.r : [0.35, 1.04, 0.31]); pencil.rotation.z = key === 'tick' ? 0 : Math.PI / 2;
    ticks.forEach((m, i) => m.visible = key === 'tick' && i < Math.ceil(a!.b.u * 4));
  };
};

/** Three identifiable camera-trap animals, rendered once into the workstation's contact sheets. */
function animalPhoto(c: CanvasRenderingContext2D, kind: number, x: number, y: number, scale: number) {
  c.save(); c.translate(x, y); c.scale(scale, scale);
  const ellipse = (x: number, y: number, rx: number, ry: number, color: string) => {
    c.fillStyle = color; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill();
  };
  const fur = ['#94755a', '#cba179', '#bb985c'][kind];
  ellipse(0, 0, kind === 0 ? 76 : 62, kind === 1 ? 35 : 28, fur);
  ellipse(57, -26, kind === 0 ? 27 : 23, kind === 1 ? 32 : 23, fur);
  ellipse(73, -13, 18, 11, kind === 0 ? '#d4bc94' : fur);
  c.strokeStyle = fur; c.lineWidth = kind === 0 ? 20 : 9; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-49, 4); c.quadraticCurveTo(-95, 33, -122, kind === 0 ? 22 : -11); c.stroke();
  for (const dx of [-42, -17, 25, 43]) {
    c.lineWidth = kind === 0 ? 13 : 8;
    c.beginPath(); c.moveTo(dx, 15); c.lineTo(dx - 8, kind === 1 ? 79 : 40); c.stroke();
  }
  if (kind === 1) {
    ellipse(49, -62, 10, 23, fur); ellipse(73, -61, 9, 20, fur);
    ellipse(50, -62, 4, 15, '#85674d');
  } else if (kind === 2) {
    for (const dx of [43, 68]) {
      c.fillStyle = fur; c.beginPath(); c.moveTo(dx - 9, -40); c.lineTo(dx, -62); c.lineTo(dx + 10, -41); c.fill();
    }
    for (let i = 0; i < 20; i++) ellipse(-42 + (i % 7) * 13, -13 + Math.floor(i / 7) * 13, 4, 5, '#4d4935');
    c.strokeStyle = '#4d4935'; c.lineWidth = 4;
    for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-78 - i * 10, 9 - i * 3); c.lineTo(-78 - i * 10, 22 - i * 5); c.stroke(); }
  } else { ellipse(46, -47, 9, 8, fur); ellipse(71, -46, 8, 8, fur); }
  ellipse(66, -30, 4, 4, '#182a26'); ellipse(88, -16, 5, 4, '#182a26');
  c.restore();
}

function cameraFrames() {
  return Array.from({ length: 12 }, (_, n) => painted(`eco-v2-camera-${n}`, 768, 460, c => {
    const species = Math.floor(n / 4), state = n % 4;
    c.fillStyle = '#172f2c'; c.fillRect(0, 0, 768, 460);
    text(c, '물여울 · 무인카메라 07', 26, 28, 24, '#e7edda');
    text(c, `06.18  05:${12 + species * 7}:24`, 740, 28, 21, '#bdd4c6', 'right');
    c.fillStyle = '#637e6c'; c.fillRect(18, 54, 544, 325);
    for (let i = 0; i < 9; i++) {
      c.fillStyle = i % 2 ? '#4d6854' : '#395549'; c.fillRect(30 + i * 68, 54, 15 + i % 3 * 6, 325);
      c.fillStyle = '#71835b'; c.beginPath(); c.ellipse(45 + i * 69, 96 + i % 3 * 34, 75, 65, 0, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = '#728c7a'; c.beginPath(); c.moveTo(18, 290); c.bezierCurveTo(160, 240, 330, 355, 562, 265); c.lineTo(562, 379); c.lineTo(18, 379); c.fill();
    animalPhoto(c, species, 290, species === 1 ? 250 : 288, state === 1 ? 1.7 : 1.25);
    if (state > 0) {
      c.strokeStyle = '#d7e17b'; c.lineWidth = 3; c.strokeRect(112, 117, 350, 247);
      text(c, state > 1 ? '✓ 종 확인' : '확대 × 2', 124, 138, 23, '#f4f0b9');
    }
    text(c, '관찰 종', 585, 85, 24, '#afc9b7');
    ['수달', '고라니', '삵'].forEach((name, i) => {
      c.fillStyle = species === i && state >= 2 ? '#698c58' : '#304e44'; c.fillRect(580, 114 + i * 65, 171, 49);
      text(c, `${species === i && state >= 2 ? '✓ ' : '○ '}${name}`, 595, 138 + i * 65, 27, '#f3edd9');
    });
    text(c, state === 3 ? '저장 완료 · 위치 03' : '촬영지: 돌다리 여울', 385, 414, 26, '#d3e6b6', 'center');
    text(c, `${species + 1} / 3`, 667, 345, 28, '#e1ecdf', 'center');
  }));
}

const ecoCameraDesk: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  // A low desk with an open knee space; the chair's seat and the seated spot coincide.
  part(g, rbox(1.92, 0.065, 0.72, 0.025), WOOD, 0, 0.757, -0.055);
  for (const x of [-0.87, 0.87]) part(g, box(0.06, 0.72, 0.63), GREEN, x, 0.36, -0.06);
  part(g, box(1.7, 0.13, 0.04), GREEN, 0, 0.58, -0.37);
  part(g, rbox(0.32, 0.6, 0.5, 0.02), CREAM, 0.69, 0.34, -0.05);
  for (let i = 0; i < 3; i++) {
    part(g, box(0.29, 0.17, 0.02), '#d5d8c5', 0.69, 0.16 + i * 0.18, 0.214);
    part(g, rbox(0.1, 0.02, 0.024, 0.006), STEEL, 0.69, 0.18 + i * 0.18, 0.239);
  }
  label(g, '무인카메라 · 관찰 기록', 0.9, 0.09, 0, 0.65, -0.344, GREEN, CREAM);
  out.seat = deskChair(g, 0.30);
  part(g, rbox(0.27, 0.025, 0.18, 0.008), DARK, 0, 0.805, -0.23);
  part(g, box(0.045, 0.18, 0.045), DARK, 0, 0.89, -0.28);
  part(g, rbox(1.02, 0.65, 0.06, 0.025), DARK, 0, 1.21, -0.29);
  const screen = swap(g, cameraFrames(), 0.96, 0.576, [0, 1.22, -0.254]); out.screen = screen.mesh;
  part(g, ball(0.009), '#75ca81', 0.43, 0.91, -0.253, { outline: false });
  part(g, rbox(0.41, 0.023, 0.17, 0.008), INK, -0.015, 0.806, 0.17);
  for (let row = 0; row < 4; row++) for (let col = 0; col < 10; col++)
    part(g, box(0.029, 0.008, 0.024), '#d6dfd1', -0.18 + col * 0.036, 0.822, 0.115 + row * 0.035, { outline: false });
  part(g, box(0.14, 0.006, 0.021), PAPER, 0, 0.831, 0.226, { outline: false });
  part(g, rbox(0.19, 0.004, 0.20, 0.01), '#6b8a7b', 0.32, 0.794, 0.17);
  const mouse = part(g, rbox(0.061, 0.026, 0.09, 0.018), CREAM, 0.32, 0.811, 0.17);
  part(mouse, box(0.002, 0.003, 0.035), STEEL, 0, 0.014, -0.018, { outline: false });
  part(g, rbox(0.11, 0.03, 0.08, 0.005), DARK, -0.28, 0.807, 0.07);
  const card = group(g, ...E.CAMERA.card);
  part(card, box(0.05, 0.006, 0.065), INK, 0, 0, 0);
  flatLabel(card, 'SD 07', 0.046, 0.03, [0, 0.004, 0], '#e8c55a');
  for (let i = 0; i < 4; i++) part(card, box(0.006, 0.002, 0.015), '#dab66c', -0.016 + i * 0.01, 0.004, -0.02, { outline: false });
  const activity = light(g, out, -0.25, 0.829, 0.076);
  // Trail camera, hinge, IR lamps, strap and labelled memory-card envelopes.
  const trap = group(g, -0.68, 0.97, -0.12, 0.12);
  part(trap, rbox(0.22, 0.34, 0.15, 0.022), GREEN, 0, 0, 0);
  part(trap, cyl(0.053, 0.053, 0.035, 18), INK, 0, 0.065, 0.086, { rx: Math.PI / 2 });
  glowing(trap, cyl(0.027, 0.027, 0.037, 16), '#607f91', 0, 0.065, 0.09, Math.PI / 2);
  for (const x of [-0.065, 0.065]) for (const y of [-0.06, -0.10]) part(trap, ball(0.018), '#999d8b', x, y, 0.08, { outline: false });
  label(trap, '07', 0.08, 0.04, 0, -0.13, 0.078, CREAM, INK);
  part(g, ring(0.12, 0.012), '#737956', -0.70, 0.80, 0.17, { rx: Math.PI / 2 });
  for (let i = 0; i < 3; i++) {
    part(g, box(0.16, 0.006, 0.11), CREAM, 0.69, 0.8 + i * 0.009, -0.22);
    flatLabel(g, `보관 ${i + 1}`, 0.12, 0.05, [0.69, 0.807 + i * 0.009, -0.22]);
  }
  clipboard(g, [0.58, 0.798, 0.09], '종 · 시각 · 위치', 0.30, 0.25);
  const notes = written(g, [0.51, 0.815, 0.08], 4), pencil = pen(g);
  const s = use(g, 'ecoCamera', 0, 0.50, true);
  out.spots = { ecoReviewCamera: s, '*': s }; out.work = s.work;
  out.away = (_away, t) => {
    const a = current([s], t) ? now(s, t) : null, key = a?.b.key;
    const species = a ? (a.b.n + (a.b.i > 2 || key === 'browse' && a.b.u > 0.65 ? 1 : 0)) % 3 : 0;
    screen.set(species * 4 + (key === 'zoom' ? 1 : key === 'tag' ? 2 : key === 'save' || key === 'note' ? 3 : 0));
    place(card, key === 'card' || key === 'insert' ? a!.r : key && a!.b.i > 1 ? [-0.28, 0.817, 0.075] : E.CAMERA.card);
    if (key === 'browse' || key === 'zoom') { mouse.position.x = a!.r[0]; mouse.position.z = a!.r[2]; }
    else mouse.position.set(0.32, 0.811, 0.17);
    activity.children.forEach(m => m.visible = key === 'insert' || key === 'save' ? Math.sin(t * 15) > 0 : true);
    place(pencil, key === 'note' ? a!.r : [0.79, 0.82, 0.17]); pencil.rotation.z = key === 'note' ? 0 : Math.PI / 2;
    notes.forEach((m, i) => m.visible = key === 'note' && i < Math.ceil(a!.b.u * 4));
  };
};

function pressedSprig(g: THREE.Object3D) {
  const a = group(g);
  rod(a, v(0, 0, 0.115), v(-0.03, 0.006, -0.13), 0.004, '#678451');
  for (let i = 0; i < 6; i++) {
    const side = i % 2 ? 1 : -1, z = 0.075 - i * 0.033;
    rod(a, v(-0.015, 0.008, z), v(side * 0.062, 0.009, z - 0.032), 0.002, '#6b8455');
    const leaf = part(a, ball(0.045), i % 2 ? '#8b9c58' : '#738b52', side * 0.045, 0.011, z - 0.025, { outline: false });
    leaf.scale.set(0.56, 0.1, 1); leaf.rotation.y = side * 0.55;
  }
  for (let i = 0; i < 5; i++) {
    const ang = i * Math.PI * 2 / 5;
    const petal = part(a, ball(0.018), '#d8b6cd', -0.03 + Math.cos(ang) * 0.018, 0.015, -0.12 + Math.sin(ang) * 0.018, { outline: false }); petal.scale.y = 0.2;
  }
  part(a, ball(0.012), '#ddc16a', -0.03, 0.019, -0.12, { outline: false }).scale.y = 0.3;
  return a;
}

const ecoHerbarium: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  part(g, rbox(1.9, 0.92, 0.68, 0.025), '#9a7959', 0, 0.49, -0.06);
  part(g, rbox(1.96, 0.055, 0.84, 0.015), '#c7ad83', 0, 0.973, 0);
  for (const x of [-0.89, 0.89]) for (const z of [-0.31, 0.23]) part(g, box(0.075, 0.09, 0.075), DARK, x, 0.045, z);
  const archive = group(g, 0, 0, 0);
  for (let i = 0; i < 5; i++) {
    const drawer = i === 4 ? archive : g;
    const y = 0.18 + i * 0.136;
    part(drawer, rbox(1.76, 0.115, 0.025, 0.006), i % 2 ? '#c3a17a' : '#b8966f', 0, y, 0.292);
    for (const x of [-0.57, 0.57]) part(drawer, rbox(0.16, 0.023, 0.035, 0.008), STEEL, x, y, 0.317);
    label(drawer, ['Ⅰ · 양치식물', 'Ⅱ · 벼과', 'Ⅲ · 수생식물', 'Ⅳ · 꽃식물', '신규 표본 · 접수'][i], 0.62, 0.054, 0, y, 0.31, CREAM, INK);
  }
  part(archive, box(1.68, 0.018, 0.53), '#84674e', 0, 0.773, -0.03);
  const filed = part(archive, box(0.46, 0.008, 0.31), PAPER, 0, 0.792, 0.1);
  flatLabel(archive, '물여울 · 제비꽃 · 03-18', 0.35, 0.06, [0, 0.798, 0.16]);
  // Raised catalogue board and three protective sample sleeves.
  part(g, rbox(1.72, 0.48, 0.035, 0.008), GREEN, 0, 1.31, -0.37);
  label(g, '식물 표본 · 채집지와 날짜를 함께', 1.55, 0.11, 0, 1.48, -0.346, GREEN, CREAM);
  for (let i = 0; i < 3; i++) {
    part(g, box(0.29, 0.24, 0.012), PAPER, -0.52 + i * 0.52, 1.25, -0.34);
    const specimen = pressedSprig(g); specimen.position.set(-0.52 + i * 0.52, 1.27, -0.327); specimen.rotation.x = Math.PI / 2; specimen.scale.setScalar(0.66);
    label(g, ['제비꽃', '질경이', '여뀌'][i], 0.22, 0.045, -0.52 + i * 0.52, 1.15, -0.325, PAPER, INK);
  }
  const press = group(g, -0.42, 1.023, 0.14);
  for (let i = 0; i < 5; i++) part(press, box(0.34, 0.01, 0.31), i % 2 ? '#bcaa88' : PAPER, 0, i * 0.011, 0);
  const lid = group(press, 0, 0.058, -0.155);
  part(lid, box(0.36, 0.025, 0.32), WOOD, 0, 0.012, 0.155);
  for (const x of [-0.11, 0.11]) part(lid, box(0.018, 0.006, 0.32), GREEN, x, 0.029, 0.155);
  for (const x of [-0.15, 0.15]) part(press, cyl(0.012, 0.012, 0.12, 8), STEEL, x, 0.06, 0.10);
  part(g, box(0.38, 0.004, 0.34), PAPER, 0.02, 1.007, 0.17);
  flatLabel(g, '채집 03-18', 0.13, 0.035, [0.11, 1.011, 0.30]);
  const specimen = pressedSprig(g);
  const tweezers = group(g);
  for (const x of [-0.008, 0.008]) rod(tweezers, v(0, 0.035, 0), v(x, -0.075, 0.015), 0.003, STEEL);
  const tape = part(g, ring(0.043, 0.012), '#e6dfbe', 0.34, 1.052, 0.20, { rx: Math.PI / 2 });
  const strips = [-1, 1].map(side => part(g, box(0.07, 0.002, 0.015), '#e4dcc0', 0.02 + side * 0.025, 1.03, 0.17 + side * 0.07, { ry: side * 0.25, outline: false }));
  const movingTape = part(g, box(0.07, 0.002, 0.02), '#e4dcc0', 0, 0, 0, { outline: false });
  clipboard(g, [0.51, 1.008, 0.16], '표본 채집 기록', 0.37, 0.3);
  // Korean field names on the actual label, legible at the normal camera scale.
  flatLabel(g, '채집지 · 날짜 · 채집자', 0.30, 0.04, [0.51, 1.026, 0.07]);
  const entries = written(g, [0.42, 1.027, 0.17], 6), pencil = pen(g);
  part(g, rbox(0.19, 0.065, 0.16, 0.008), '#805f46', 0.77, 1.04, -0.10);
  label(g, '표본 번호', 0.17, 0.04, 0.77, 1.05, -0.015, PAPER, INK);
  const s = use(g, 'ecoMount', 0.04, 0.73);
  out.spots = { ecoMountPlant: s, '*': s }; out.work = s.work;
  light(g, out, 0.83, 1.48, -0.34);
  out.away = (_away, t) => {
    const a = current([s], t) ? now(s, t) : null, key = a?.b.key;
    lid.rotation.x = a ? -1.0 * (key === 'open' ? E.sm(a.b.u) : key === 'file' ? 1 - E.sm(a.b.u) : 1) : 0;
    place(specimen, key === 'lift' ? a!.r : a && a.b.i >= 2 ? [0.02, 1.018, 0.17] : E.HERB.plant);
    specimen.visible = key !== 'file' || a!.b.u < 0.5;
    if (key === 'arrange') { specimen.position.x += Math.sin(t * 1.8) * 0.012; specimen.rotation.y = 0.05 * Math.sin(t * 2); }
    else specimen.rotation.y = 0;
    place(tweezers, key === 'arrange' ? a!.r : [0.29, 1.018, -0.08]); tweezers.rotation.z = key === 'arrange' ? 0 : Math.PI / 2;
    movingTape.visible = key === 'tape' && a!.b.u < 0.75; if (movingTape.visible) place(movingTape, a!.r);
    strips.forEach((m, i) => m.visible = !!a && (a.b.i > 3 || key === 'tape' && a.b.u > 0.42 + i * 0.32) && key !== 'file');
    tape.rotation.z = key === 'tape' ? a!.b.u * 2 : 0;
    place(pencil, key === 'write' ? a!.r : [0.76, 1.03, 0.24]); pencil.rotation.z = key === 'write' ? 0 : Math.PI / 2;
    entries.forEach((m, i) => m.visible = !!a && (a.b.i > 4 || key === 'write' && i < a.b.u * 6));
    archive.position.z = key === 'file' ? Math.sin(a!.b.u * Math.PI) * 0.25 : 0;
    filed.visible = key === 'file' && a!.b.u > 0.3;
  };
};

function streamFrames() {
  return Array.from({ length: 5 }, (_, state) => painted(`eco-v2-stream-${state}`, 900, 480, c => {
    c.fillStyle = '#efe9cb'; c.fillRect(0, 0, 900, 480);
    text(c, '우리 하천에는 누가 살까요?', 450, 38, 39, DARK, 'center');
    c.fillStyle = '#b5c78d'; c.fillRect(20, 78, 860, 317);
    c.fillStyle = '#80bbc2'; c.beginPath(); c.moveTo(180, 78); c.bezierCurveTo(70, 200, 420, 190, 260, 395); c.lineTo(630, 395); c.bezierCurveTo(760, 190, 410, 200, 520, 78); c.fill();
    c.strokeStyle = '#cce7d9'; c.lineWidth = 6;
    for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(230 + i * 60, 100); c.bezierCurveTo(130 + i * 60, 230, 470 + i * 60, 230, 330 + i * 60, 372); c.stroke(); }
    for (let i = 0; i < 12; i++) {
      c.fillStyle = '#9b9f7c'; c.beginPath(); c.ellipse(80 + i % 3 * 48 + (i > 5 ? 550 : 0), 160 + i % 6 * 35, 22, 13, 0.3, 0, Math.PI * 2); c.fill();
    }
    // Fish and frog pictograms line up with the teaching wand's two targets.
    c.fillStyle = '#e4bd5c'; c.beginPath(); c.ellipse(360, 285, 52, 24, -0.12, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(319, 284); c.lineTo(286, 257); c.lineTo(288, 312); c.fill();
    c.fillStyle = INK; c.beginPath(); c.arc(386, 276, 5, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#6e9e53'; c.beginPath(); c.ellipse(653, 176, 49, 36, 0, 0, Math.PI * 2); c.fill();
    for (const x of [630, 678]) {
      c.beginPath(); c.arc(x, 146, 14, 0, Math.PI * 2); c.fill();
      c.fillStyle = PAPER; c.beginPath(); c.arc(x, 143, 8, 0, Math.PI * 2); c.fill();
      c.fillStyle = INK; c.beginPath(); c.arc(x, 142, 4, 0, Math.PI * 2); c.fill(); c.fillStyle = '#6e9e53';
    }
    text(c, '버들치', 360, 334, 28, DARK, 'center'); text(c, '참개구리', 653, 235, 28, DARK, 'center');
    text(c, '깨끗한 여울', 129, 121, 26, DARK, 'center'); text(c, '풀숲 쉼터', 748, 327, 26, DARK, 'center');
    if (state === 1 || state === 2) {
      c.strokeStyle = '#e8973e'; c.lineWidth = 7; c.beginPath(); c.ellipse(state === 1 ? 353 : 653, state === 1 ? 285 : 180, 83, 67, 0, 0, Math.PI * 2); c.stroke();
    }
    text(c, ['흐르는 물과 풀숲을 함께 지켜요', '버들치: 물살을 거슬러 헤엄쳐요', '참개구리: 물과 땅을 오가요', '질문! 쓰레기는 어디에 버릴까요?', '정답! 되가져가고 생물은 놓아줘요'][state], 450, 436, 29, DARK, 'center');
  }));
}

const ecoStreamDisplay: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  for (const x of [-0.86, 0.86]) {
    part(g, box(0.075, 1.78, 0.075), WOOD, x, 0.89, -0.28);
    part(g, rbox(0.28, 0.04, 0.64, 0.014), DARK, x, 0.03, -0.10);
  }
  part(g, rbox(1.86, 0.92, 0.075, 0.025), GREEN, 0, 1.32, -0.24);
  const board = swap(g, streamFrames(), 1.74, 0.83, [0, 1.32, -0.197]); out.screen = board.mesh;
  label(g, '생태 연구 센터 · 물여울 견학', 1.7, 0.12, 0, 1.87, -0.20, DARK, CREAM);
  part(g, rbox(1.78, 0.04, 0.45, 0.014), WOOD, 0, 0.78, 0.05);
  // A physical stream cross section: sand bank, river gravel and rushes on the teaching shelf.
  part(g, rbox(0.78, 0.035, 0.31, 0.01), '#8cc6ce', 0.37, 0.82, 0.01);
  part(g, rbox(0.22, 0.04, 0.30, 0.015), '#b8b080', 0.66, 0.84, 0.01);
  for (let i = 0; i < 8; i++) part(g, ball(0.025 + i % 3 * 0.008), '#b8b9a0', 0.05 + i * 0.07, 0.845, 0.07 + Math.sin(i) * 0.07, { outline: false }).scale.y = 0.55;
  for (let i = 0; i < 5; i++) rod(g, v(0.63 + i * 0.024, 0.85, -0.02), v(0.61 + i * 0.03, 1.02 + i % 2 * 0.07, -0.03), 0.005, '#708d4e');
  clipboard(g, [-0.43, 0.805, 0.26], '견학 관찰 카드', 0.38, 0.23);
  const marks = written(g, [-0.49, 0.824, 0.26], 4), pencil = pen(g);
  const wand = dynamicRod(g, 0.005, WOOD);
  const tip = part(g, ball(0.012), '#d8a54e', 0, 0, 0, { outline: false });
  // Visitors stand at the side of the shelf, with empty floor between them and the guide.
  const pupils = [pupil(g, 0.47, 0.72, '#c27f57', false), pupil(g, 0.92, 0.62, '#729da7', true)];
  pupils.forEach(p => p.root.rotation.y = Math.PI + 0.25);
  const answers = pupils.map((p, i) => label(p.root, i ? '풀숲도 지켜요!' : '되가져가요!', 0.53, 0.15, 0, 1.96, 0.03, PAPER, DARK, -Math.PI - 0.25));
  const s = use(g, 'ecoTeach', -0.51, 0.69);
  out.spots = { ecoPrepareTour: s, '*': s }; out.work = s.work;
  light(g, out, 0.82, 1.87, -0.195);
  out.away = (_away, t) => {
    const a = current([s], t) ? now(s, t) : null, key = a?.b.key;
    board.set(key === 'fish' ? 1 : key === 'frog' ? 2 : key === 'ask' ? 3 : key === 'answer' || key === 'record' ? 4 : 0);
    const pointing = key === 'river' || key === 'fish' || key === 'frog';
    const handle: E.V = pointing ? a!.r : [-0.72, 0.81, 0.08];
    const target: E.V = key === 'fish' ? [-0.18, 1.26, -0.19] : key === 'frog' ? [0.39, 1.42, -0.19] : pointing ? [-0.20 + 0.23 * a!.b.u, 1.30, -0.19] : [-0.20, 0.81, 0.08];
    wand(handle, target); place(tip, target);
    pupils.forEach((p, i) => {
      const respond = key === 'ask' ? E.sm(a!.b.u, 0.1 + i * 0.2, 0.45 + i * 0.2) : key === 'answer' ? 1 - E.sm(a!.b.u, 0.65, 1) : 0;
      p.pose(respond, pointing ? 0.32 + Math.sin(t * 2 + i) * 0.08 : 0, a ? 0.04 * Math.sin(t * 3 + i) : 0);
      p.head.rotation.y = key === 'ask' || key === 'answer' ? -0.65 : 0.08;
      answers[i].visible = key === 'answer' && a!.b.u > i * 0.25;
    });
    place(pencil, key === 'record' ? a!.r : [-0.68, 0.824, 0.3]); pencil.rotation.z = key === 'record' ? 0 : Math.PI / 2;
    marks.forEach((m, i) => m.visible = key === 'record' && i < Math.ceil(a!.b.u * 4));
  };
};

function fieldCrate(g: THREE.Object3D, cleanup: boolean) {
  const a = group(g);
  part(a, rbox(0.35, 0.22, 0.28, 0.025), cleanup ? '#c5974a' : '#8a9d83', 0, -0.045, 0);
  part(a, rbox(0.32, 0.014, 0.25, 0.008), DARK, 0, 0.072, 0);
  for (const x of [-0.17, 0.17]) part(a, box(0.012, 0.035, 0.1), INK, x, 0.022, 0);
  label(a, cleanup ? '정화 도구' : '채수 장비', 0.26, 0.07, 0, -0.045, 0.145, CREAM, INK);
  if (cleanup) {
    for (let i = 0; i < 3; i++) part(a, rbox(0.055, 0.15, 0.07, 0.02), ['#d8c870', '#95ad8b', '#d7d8c7'][i], -0.09 + i * 0.09, 0.11, 0);
  } else {
    for (let i = 0; i < 3; i++) {
      const b = bottle(a, String(i + 1), '#c0e2dc', 0.032); b.root.position.set(-0.09 + i * 0.09, 0.16, 0); b.root.scale.setScalar(0.75);
    }
  }
  return a;
}

const ecoJeep: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  // The two-tile vehicle is a compact open-bed field 4×4, nose toward local +x.
  const car = group(g), wheels: THREE.Group[] = [];
  part(car, rbox(2.38, 0.19, 1.05, 0.07), DARK, 0, 0.40, 0);
  part(car, rbox(2.23, 0.24, 0.98, 0.07), '#789777', 0, 0.59, 0);
  for (const x of [-0.76, 0.75]) for (const z of [-0.53, 0.53]) {
    const wheel = group(car, x, 0.30, z); wheels.push(wheel);
    part(wheel, cyl(0.28, 0.28, 0.14, 20), '#29332e', 0, 0, 0, { rx: Math.PI / 2 });
    part(wheel, cyl(0.16, 0.16, 0.151, 12), STEEL, 0, 0, 0, { rx: Math.PI / 2 });
    part(wheel, cyl(0.065, 0.065, 0.156, 8), DARK, 0, 0, 0, { rx: Math.PI / 2 });
    for (let j = 0; j < 10; j++) {
      const ang = j * Math.PI / 5;
      part(wheel, box(0.06, 0.025, 0.145), '#454b3d', Math.sin(ang) * 0.279, Math.cos(ang) * 0.279, 0, { rz: -ang, outline: false });
    }
    part(car, rbox(0.65, 0.09, 0.16, 0.04), DARK, x, 0.63, z);
  }
  part(car, rbox(0.57, 0.27, 0.96, 0.045), GREEN, 0.86, 0.80, 0);
  part(car, box(0.025, 0.17, 0.58), INK, 1.16, 0.78, 0);
  for (let i = 0; i < 6; i++) part(car, box(0.029, 0.13, 0.018), STEEL, 1.18, 0.78, -0.23 + i * 0.092);
  part(car, rbox(0.12, 0.09, 1.10, 0.025), DARK, 1.23, 0.51, 0);
  part(car, rbox(0.12, 0.09, 1.1, 0.025), DARK, -1.24, 0.51, 0);
  const headlights = group(car);
  for (const z of [-0.37, 0.37]) {
    part(car, cyl(0.083, 0.083, 0.035, 16), CREAM, 1.174, 0.81, z, { rz: Math.PI / 2 });
    glowing(headlights, cyl(0.075, 0.075, 0.038, 16), '#fff0ba', 1.178, 0.81, z).rotation.z = Math.PI / 2;
  }
  // Cabin pillars, windscreen, real seats and dashboard; the passenger window is open.
  for (const x of [-0.1, 0.58]) for (const z of [-0.43, 0.43]) rod(car, v(x, 0.85, z), v(x - (x > 0 ? 0.13 : 0), 1.52, z), 0.028, GREEN);
  part(car, rbox(0.88, 0.07, 1.04, 0.035), CREAM, 0.18, 1.55, 0);
  const windshield = glass(car, box(0.018, 0.50, 0.80), 0.49, 1.23, 0); windshield.rotation.z = 0.18;
  rod(car, v(0.55, 1.0, -0.32), v(0.53, 1.17, 0.02), 0.008, INK);
  part(car, box(0.12, 0.12, 0.83), INK, 0.49, 0.91, 0);
  for (const z of [-0.24, 0.24]) {
    part(car, rbox(0.37, 0.10, 0.34, 0.035), '#56675a', 0.14, 0.76, z);
    part(car, rbox(0.10, 0.46, 0.34, 0.045), '#56675a', -0.05, 1.01, z, { rz: -0.12 });
    part(car, box(0.58, 0.23, 0.04), GREEN, 0.22, 0.80, z < 0 ? -0.48 : 0.48);
    part(car, rbox(0.12, 0.024, 0.025, 0.006), STEEL, 0.03, 0.89, z < 0 ? -0.508 : 0.508);
    label(car, '물여울 조사팀', 0.50, 0.10, 0.22, 0.78, z < 0 ? -0.506 : 0.506, CREAM, DARK, z < 0 ? Math.PI : 0);
  }
  const steering = part(car, ring(0.11, 0.015), INK, 0.38, 1.01, 0.24); steering.rotation.y = Math.PI / 2; steering.rotation.x = 0.25;
  for (const z of [-0.59, 0.59]) {
    rod(car, v(0.46, 1.02, Math.sign(z) * 0.45), v(0.46, 1.07, z), 0.008, STEEL);
    part(car, rbox(0.065, 0.10, 0.02, 0.015), DARK, 0.46, 1.08, z);
  }
  // Open rear bed: cargo is accessible from the near side, below the user's hands.
  part(car, box(0.94, 0.035, 0.88), '#56675a', -0.65, 0.735, 0);
  part(car, box(0.96, 0.25, 0.045), GREEN, -0.65, 0.85, -0.47);
  part(car, box(0.055, 0.25, 0.95), GREEN, -1.12, 0.85, 0);
  const gate = group(car, -0.64, 0.74, 0.47);
  part(gate, box(0.94, 0.23, 0.045), GREEN, 0, 0.115, 0);
  label(gate, '현장 조사 · 안전 우선', 0.78, 0.09, 0, 0.13, 0.026, GREEN, CREAM);
  const cooler = group(car, -0.84, 0.88, -0.20);
  part(cooler, rbox(0.32, 0.25, 0.29, 0.025), CREAM, 0, 0, 0);
  part(cooler, box(0.34, 0.04, 0.31), '#799d9a', 0, 0.14, 0);
  label(cooler, '시료', 0.17, 0.07, 0, 0, 0.149, CREAM, INK);
  for (let i = 0; i < 2; i++) {
    rod(car, v(-1.03, 0.77, -0.36 + i * 0.13), v(-0.24, 1.02, -0.36 + i * 0.13), 0.01, WOOD);
    part(car, ring(0.11, 0.008), STEEL, -0.21, 1.04, -0.36 + i * 0.13, { ry: Math.PI / 2 });
  }
  const crate = fieldCrate(car, false), cleanupCrate = fieldCrate(car, true);
  const strap = dynamicRod(car, 0.012, '#d7b960');
  // Foldout loading stool occupies the space below the lifted crate, never the standing spot.
  const stool = group(g, -0.55, 0, 0.62);
  part(stool, box(0.42, 0.035, 0.32), WOOD, 0, 0.48, 0);
  for (const x of [-0.17, 0.17]) { rod(stool, v(x, 0.04, -0.12), v(-x, 0.47, -0.12), 0.013, STEEL); rod(stool, v(x, 0.04, 0.12), v(-x, 0.47, 0.12), 0.013, STEEL); }
  const map = group(g, -0.5, 0.98, 0.58);
  part(map, box(0.30, 0.006, 0.22), PAPER, 0, 0, 0);
  flatLabel(map, '물여울 조사 구간', 0.26, 0.06, [0, 0.005, -0.06]);
  for (let i = 0; i < 4; i++) part(map, box(0.02, 0.002, 0.13), '#96bfba', -0.09 + i * 0.06, 0.006, 0.025, { ry: i % 2 ? -0.3 : 0.3, outline: false });
  const radio = group(g);
  part(radio, rbox(0.06, 0.13, 0.035, 0.008), DARK, 0, 0, 0);
  part(radio, cyl(0.005, 0.005, 0.09, 6), INK, -0.02, 0.095, 0);
  label(radio, '03', 0.043, 0.026, 0, 0.02, 0.019, '#b6c9ac', INK);
  const driver = group(car, 0.12, 0.75, 0.24, Math.PI / 2);
  part(driver, rbox(0.24, 0.32, 0.2, 0.05), '#bac69a', 0, 0.21, 0);
  part(driver, ball(0.105), SKIN, 0, 0.49, 0);
  part(driver, ball(0.11), '#4b3d2d', 0, 0.53, -0.025);
  part(driver, cyl(0.13, 0.13, 0.035, 16), '#b8ae78', 0, 0.57, 0);
  for (const x of [-0.14, 0.14]) rod(driver, v(x, 0.33, 0), v(x, 0.23, 0.25), 0.035, '#bac69a');
  const lamps = light(g, out, -0.4, 1.07, -0.4);
  const survey = use(g, 'ecoSurvey', -0.5, 1.02), clean = use(g, 'ecoCleanup', -0.5, 1.02);
  out.spots = { ecoLoadSurveyGear: survey, ecoLoadCleanupGear: clean, fieldSurvey: survey, cleanupMission: clean, '*': survey }; out.work = survey.work;
  const status = label(g, '현장 조사 출발', 1.1, 0.17, 0, 1.96, 0, CREAM, DARK);
  let state: 'parked' | 'leaving' | 'gone' | 'back' = 'parked', since = 0;
  let preparedForCleanup = false;
  out.away = (isOut, t) => {
    if (isOut && (state === 'parked' || state === 'back')) { state = 'leaving'; since = t; }
    else if (!isOut && (state === 'leaving' || state === 'gone')) { state = 'back'; since = t; }
    let x = 0;
    if (state === 'leaving') { const u = Math.min(1, (t - since) / 5); x = 12 * u * u; if (u === 1) state = 'gone'; }
    if (state === 'back') { const u = Math.min(1, (t - since) / 6); x = 12 * (1 - u) ** 2; if (u === 1) state = 'parked'; }
    car.position.x = x; car.visible = state !== 'gone';
    wheels.forEach(w => w.rotation.z = -x / 0.28);
    const moving = state === 'leaving' || state === 'back'; driver.visible = moving; headlights.visible = moving;
    status.visible = state === 'leaving' && t - since < 1.5;
    const s = current([survey, clean], t), a = s ? now(s, t) : null, key = a?.b.key;
    if (s) preparedForCleanup = s === clean;
    const cleaning = preparedForCleanup;
    crate.visible = !cleaning; cleanupCrate.visible = cleaning;
    const load = cleaning ? cleanupCrate : crate;
    const hand = a ? E.add(E.lerp(a.l, a.r, 0.5), 0, -0.06) : null;
    place(load, key === 'lift' || key === 'load' ? hand! : a && a.b.i < 2 ? [-0.55, 0.66, 0.62] : [-0.50, 0.9, 0.30]);
    gate.rotation.x = a ? Math.PI * 0.52 : 0;
    strap([-0.69, 0.96, 0.34], [-0.31, 0.96, 0.34], !a || key === 'secure' || key === 'radio' || key === 'ready');
    map.visible = key === 'map' || key === 'brief'; if (map.visible) place(map, E.add(E.lerp(a!.l, a!.r, 0.5), 0, -0.01));
    place(radio, key === 'radio' && state === 'parked' ? a!.r : [-0.36 + x, 1.02, -0.35]);
    radio.visible = state !== 'gone';
    stool.visible = state === 'parked'; lamps.position.x = x;
  };
};

// ---------------------------------------------------------------------------------------------
// The 해양 생물학자 branch's coastal research institute (2026-11-04, the layout audit: workFurniture/conservationist.ts).

const NO = { outline: false };
const SEA = '#1e6f8f', HULLW = '#f2f4f2', ORANGE = '#f57c00', GALV = '#9eaab0';
/** A stand spot on the front tile, facing the piece. */
function standBy(g: THREE.Group, out: Built, D: number, x = 0) {
  const s = spot(g, 'stand', x, 0, D / 2 + 0.45, Math.PI);
  s.work = marker(g, x, 1.0, D / 2 - 0.2);
  out.work = s.work;
  out.spots = { '*': s };
  return s;
}

/**
 * 연안 연구선 한빛누리호 (12 × 3): a 12 m coastal research boat alongside the quay, bow east (+x). White hull with the institute's blue
 * band and her name, the wheelhouse forward with its windows and the mast (radar, antennas), the A-frame at the stern for the nets,
 * the CTD rosette on the after deck, the orange life rings, the lines to the bitts. Checked from the quay; out on a sampling run or
 * an urgent call she puts out east and is gone, and comes back to her berth.
 */
const mrResearchBoat: Builder = (g, W, D, _c, _def, _ctx, out) => {
  const boat = group(g, 0, 0.1, 0);
  const L = W - 0.4, B = D - 0.5, deck = 0.5, zc = -0.1;
  part(boat, rbox(L - 2, 1.1, B, 0.25), HULLW, -1, deck - 0.55, zc);
  part(boat, cyl(B / 2, 0.12, 2.2, 4), HULLW, L / 2 - 1.1, deck - 0.55, zc, { rz: -Math.PI / 2 }).scale.set(1, 1, 0.62);
  for (const sz of [-1, 1]) {
    part(boat, box(L - 2.4, 0.18, 0.02), SEA, -1, deck - 0.35, zc + sz * (B / 2 + 0.01), NO);
    label(boat, '한빛누리호 · 한빛해양연구소', 3.2, 0.3, 0.2, deck - 0.72, zc + sz * (B / 2 + 0.02), HULLW, SEA, sz > 0 ? 0 : Math.PI);
  }
  part(boat, box(L - 1.2, 0.04, B - 0.2), '#7f9aa3', -0.6, deck + 0.02, zc, NO);
  // Bulwark rail.
  for (const sz of [-1, 1]) part(boat, box(L - 1.4, 0.05, 0.05), GALV, -0.7, deck + 0.55, zc + sz * (B / 2 - 0.08), NO);
  // The wheelhouse and the mast.
  part(boat, rbox(3.2, 1.7, B - 0.5, 0.12), '#eceff1', 1.6, deck + 0.9, zc);
  part(boat, box(3.22, 0.5, B - 0.48), '#22384a', 1.6, deck + 1.35, zc, NO);
  part(boat, rbox(3.4, 0.1, B - 0.3, 0.05), '#eceff1', 1.6, deck + 1.8, zc);
  part(boat, cyl(0.05, 0.05, 1.8, 8), '#eceff1', 1.0, deck + 2.7, zc);
  part(boat, rbox(1.1, 0.1, 0.3, 0.05), '#37474f', 1.0, deck + 3.2, zc);
  for (const sz of [-1, 1]) part(boat, cyl(0.012, 0.012, 1.2, 6), '#eceff1', 0.7, deck + 2.9, zc + sz * 0.45, NO);
  // The A-frame at the stern, the net hanging from it; the CTD rosette on the after deck; life rings.
  const ax = -L / 2 + 0.5;
  for (const sz of [-1, 1]) rod(boat, v(ax, deck, zc + sz * (B / 2 - 0.2)), v(ax - 0.3, deck + 2.2, zc + sz * 0.3), 0.06, ORANGE);
  part(boat, box(0.12, 0.12, 0.8), ORANGE, ax - 0.3, deck + 2.2, zc);
  part(boat, cyl(0.01, 0.01, 1.2, 6), INK, ax - 0.3, deck + 1.6, zc, NO);
  part(boat, cyl(0.25, 0.05, 0.9, 10), '#6d8b74', ax - 0.3, deck + 0.7, zc, NO);
  const rx = -1.6;
  part(boat, cyl(0.42, 0.42, 0.06, 16), GALV, rx, deck + 0.05, zc - 0.1, NO);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    part(boat, cyl(0.07, 0.07, 0.7, 10), '#90a4ae', rx + Math.cos(a) * 0.3, deck + 0.45, zc - 0.1 + Math.sin(a) * 0.3);
  }
  part(boat, rbox(0.28, 0.28, 0.28, 0.05), '#f9a825', rx, deck + 0.3, zc - 0.1);
  for (const x of [-3.5, 0.0]) part(boat, ring(0.22, 0.06), ORANGE, x, deck + 0.75, zc + B / 2 - 0.05, NO);
  // Her lines to the quay.
  const lines = group(g);
  for (const x of [-L / 2 + 1, L / 2 - 2]) rod(lines, v(x, deck + 0.4, zc + B / 2), v(x + (x < 0 ? -0.5 : 0.5), 0.4, D / 2 + 0.4), 0.025, '#e8d9b0');
  standBy(g, out, D, 1.0).motion = 'tinker';
  let x = 0, last = 0;
  out.away = (isOut, t) => {
    const dt = Math.min(0.1, Math.max(0, t - last));
    last = t;
    x = THREE.MathUtils.clamp(x + (isOut ? 1 : -1) * dt * 0.3, 0, 1);
    boat.position.x = x * x * 30;
    boat.visible = x < 0.98;
    lines.visible = x === 0;
  };
};

/**
 * CTD 윈치 크레인 (2 × 1): a yellow davit on the quay edge, its boom out over the water, the cable down to the CTD rosette hanging
 * just above the sea (grey bottles round the sensor frame), the winch drum and its control box at the foot.
 */
const mrCtdDavit: Builder = (g, W, D, _c, _def, _ctx, out) => {
  const zb = -D / 2 + 0.3;
  part(g, rbox(0.7, 0.12, 0.6, 0.03), '#78909c', -0.3, 0.06, zb);
  part(g, cyl(0.1, 0.14, 2.4, 12), '#f9a825', -0.3, 1.25, zb);
  rod(g, v(-0.3, 2.4, zb), v(-0.3, 2.9, -D / 2 - 1.0), 0.07, '#f9a825');
  part(g, cyl(0.008, 0.008, 2.2, 6), INK, -0.3, 1.8, -D / 2 - 1.0, NO);
  part(g, cyl(0.28, 0.28, 0.06, 14), GALV, -0.3, 0.75, -D / 2 - 1.0, NO);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    part(g, cyl(0.05, 0.05, 0.5, 8), '#90a4ae', -0.3 + Math.cos(a) * 0.2, 0.95, -D / 2 - 1.0 + Math.sin(a) * 0.2);
  }
  part(g, cyl(0.22, 0.22, 0.5, 16), '#455a64', 0.4, 0.45, zb, { rz: Math.PI / 2 });
  part(g, rbox(0.3, 0.45, 0.2, 0.03), '#eceff1', W / 2 - 0.25, 0.75, zb + 0.15);
  label(g, 'CTD', 0.24, 0.1, W / 2 - 0.25, 0.85, zb + 0.255, '#eceff1', SEA);
  standBy(g, out, D, 0.3);
};

/**
 * 해수 여과·살균 설비 (2 × 1): the seawater pumped in off the sea comes down its pipe from the wall into the sand filter (a tall blue
 * tank with its gauge), through the UV steriliser (a steel tube, its lamp lit) and the chiller box, and out along the header pipe to
 * the tanks; the control panel with the flow readings.
 */
const mrSeawaterPlant: Builder = (g, W, D, _c, _def, _ctx, out) => {
  const zb = -D / 2 + 0.3;
  part(g, cyl(0.025, 0.025, 2.0, 8), '#607d8b', -W / 2 + 0.2, 1.4, -D / 2 + 0.06, NO);
  label(g, '취수 · 바닷물', 0.5, 0.1, -W / 2 + 0.2, 2.2, -D / 2 + 0.11, '#eceff1', SEA);
  part(g, cyl(0.25, 0.25, 1.2, 16), '#1e88e5', -0.55, 0.65, zb);
  part(g, ball(0.25), '#1e88e5', -0.55, 1.25, zb).scale.set(1, 0.45, 1);
  part(g, cyl(0.06, 0.06, 0.02, 14), '#fafafa', -0.55, 1.0, zb + 0.25, { rx: Math.PI / 2 });
  part(g, cyl(0.09, 0.09, 0.8, 12), GALV, 0.1, 0.9, zb, { rz: Math.PI / 2 });
  glowing(g, box(0.06, 0.02, 0.02), '#7c4dff', 0.45, 0.9, zb + 0.09);
  part(g, rbox(0.45, 0.6, 0.45, 0.04), '#eceff1', 0.65, 0.3, zb);
  for (let i = 0; i < 4; i++) part(g, box(0.4, 0.02, 0.01), '#90a4ae', 0.65, 0.15 + i * 0.12, zb + 0.23, NO);
  part(g, cyl(0.03, 0.03, W - 0.2, 8), '#607d8b', 0, 1.55, zb - 0.1, { rz: Math.PI / 2 });
  part(g, rbox(0.4, 0.3, 0.06, 0.02), '#37474f', 0.55, 1.2, zb + 0.18);
  label(g, '유량 12㎥/h · 18.5℃', 0.34, 0.08, 0.55, 1.22, zb + 0.215, '#102027', '#69f0ae');
  standBy(g, out, D);
};

/**
 * 원형 사육 수조 (2 × 2): a round FRP rearing tank, knee-high, the seawater running in over its rim from the header and out of the centre
 * drain; fish circling in it (a school of young rockfish), the air stones bubbling, the feed scoop and the data sheet on its edge.
 */
const mrRoundTank: Builder = (g, W, D, _c, _def, _ctx, out) => {
  const r = Math.min(W, D) / 2 - 0.12;
  part(g, cyl(r, r, 0.8, 28), '#5aa7b8', 0, 0.4, 0);
  part(g, cyl(r - 0.05, r - 0.05, 0.02, 28), WATER, 0, 0.76, 0, NO);
  part(g, cyl(r + 0.02, r + 0.02, 0.05, 28), '#3f8798', 0, 0.8, 0, NO);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const f = part(g, ball(0.06), i % 2 ? '#6d6a5f' : '#8a7e64', Math.cos(a) * r * 0.6, 0.66, Math.sin(a) * r * 0.6, NO);
    f.scale.set(1.8, 0.6, 0.7);
    f.rotation.y = -a;
  }
  rod(g, v(-r, 1.3, -r), v(-r * 0.7, 0.9, -r * 0.7), 0.03, '#607d8b');
  part(g, cyl(0.03, 0.03, 0.5, 8), '#607d8b', -r, 1.05, -r, NO);
  for (const [x, z] of [[0.3, -0.2], [-0.2, 0.25]]) part(g, ball(0.03), '#ffffff', x, 0.78, z, NO);
  part(g, box(0.18, 0.02, 0.24), PAPER, r * 0.5, 0.83, r * 0.75, { ry: 0.4, ...NO });
  standBy(g, out, D);
};

/**
 * 어체 측정·해부대 (2 × 1): a stainless bench with the fish measuring board (a ruler to the tail fork), a flounder laid on it, the
 * electronic scale, the dissecting tray with the otolith vials, the data sheet, the cold-water tap and sink at one end.
 */
const mrMeasureBoard: Builder = (g, W, D, _c, _def, _ctx, out) => {
  bench(g, W - 0.1, 0.9, D - 0.25);
  const y = 0.94;
  part(g, box(0.9, 0.02, 0.28), '#fafafa', -0.35, y, -0.05);
  for (let i = 0; i < 10; i++) part(g, box(0.006, 0.004, 0.06), INK, -0.78 + i * 0.09, y + 0.012, -0.16, NO);
  part(g, ball(0.12), '#8d7b5f', -0.45, y + 0.03, -0.04, NO).scale.set(2.2, 0.25, 1);
  part(g, rbox(0.3, 0.05, 0.3, 0.02), '#cfd8dc', 0.3, y + 0.02, -0.05);
  label(g, '0.842kg', 0.16, 0.05, 0.3, y + 0.06, 0.11, '#102027', '#69f0ae');
  part(g, rbox(0.3, 0.03, 0.22, 0.02), GALV, 0.75, y + 0.01, -0.05);
  for (let i = 0; i < 4; i++) part(g, cyl(0.012, 0.012, 0.06, 8), '#e1f5fe', 0.65 + i * 0.06, y + 0.04, 0.12, NO);
  part(g, box(0.18, 0.005, 0.24), PAPER, -0.1, y + 0.005, 0.18, NO);
  standBy(g, out, D);
};

/** 채집망·통발 더미 (2 × 1): a folded beam trawl net in green mesh, a stack of crab pots, coiled rope and orange buoys on a pallet. */
const mrNetPile: Builder = (g, W) => {
  part(g, box(W - 0.1, 0.1, 0.8), '#a1887f', 0, 0.05, 0);
  part(g, rbox(0.8, 0.45, 0.6, 0.2), '#6d8b74', -0.45, 0.32, 0);
  for (let i = 0; i < 3; i++) part(g, cyl(0.25, 0.28, 0.22, 12), '#37474f', 0.45, 0.22 + i * 0.23, -0.05, NO);
  part(g, ring(0.18, 0.05), '#d7ccc8', 0.45, 0.14, 0.25, { rx: Math.PI / 2, ...NO });
  for (const x of [-0.75, -0.2]) part(g, ball(0.12), ORANGE, x, 0.6, 0.2);
};

/**
 * 바다 생태 전시판 (2 × 1): a long display on the lobby wall: our coast's food web painted (plankton, the fish, the seabirds, the seals),
 * this year's survey results, the specimen jars in a glass case below, a skeleton of a fish's head on top.
 */
const mrExhibit: Builder = (g, W, D, _c, _def, _ctx, out) => {
  const zb = -D / 2 + 0.06;
  const tex = painted('mrExhibit', 512, 256, (c) => {
    c.fillStyle = '#d9f1f5';
    c.fillRect(0, 0, 512, 256);
    c.fillStyle = '#1e6f8f';
    c.fillRect(0, 150, 512, 106);
    c.fillStyle = '#0b3d52';
    c.font = 'bold 30px sans-serif';
    c.fillText('우리 바다의 먹이그물', 16, 40);
    c.fillStyle = '#ffffff';
    c.font = '20px sans-serif';
    c.fillText('식물플랑크톤 → 동물플랑크톤 → 멸치 → 고등어 → 상괭이', 16, 190);
    c.fillText('2026 연안 정점 조사: 수온 +1.2℃', 16, 230);
    c.fillStyle = '#f57c00';
    for (let i = 0; i < 5; i++) c.fillRect(30 + i * 95, 70, 60, 50);
  });
  picture(g, tex, W - 0.2, 1.0, 0, 1.55, zb + 0.02);
  part(g, rbox(W - 0.2, 0.8, 0.4, 0.03), '#5d4037', 0, 0.4, zb + 0.22);
  glass(g, box(W - 0.3, 0.3, 0.32), 0, 0.95, zb + 0.22);
  for (let i = 0; i < 4; i++) part(g, cyl(0.06, 0.06, 0.18, 12), '#fff59d', -0.6 + i * 0.4, 0.89, zb + 0.22);
  standBy(g, out, D);
};

// The centre's grounds (2026-11-05, the layout audit).

/** The observation deck: timber boards on posts reaching out over the pond (north), a rail round the water side, the
 * panel naming what lives in the wetland, and a low bench at the back. */
const ecoDeck: Builder = (g, W, D) => {
  const out = 1.1;
  const z0 = -D / 2 - out;
  const z1 = D / 2 - 0.1;
  const len = z1 - z0;
  for (let x = -W / 2 + 0.1; x < W / 2 - 0.05; x += 0.16) part(g, box(0.14, 0.05, len), x % 0.32 < 0.16 ? WOOD : '#9b7a55', x + 0.07, 0.32, (z0 + z1) / 2, { outline: false });
  for (const x of [-W / 2 + 0.15, 0, W / 2 - 0.15]) for (const z of [z0 + 0.1, (z0 + z1) / 2]) part(g, cyl(0.06, 0.06, 0.6, 8), '#6f5236', x, 0.0, z);
  part(g, box(W - 0.1, 0.06, 0.1), '#6f5236', 0, 0.27, z0 + 0.05);
  // The rail: posts and two bars along the water and down the sides as far as the bank.
  for (let x = -W / 2 + 0.1; x <= W / 2 - 0.05; x += (W - 0.2) / 4) part(g, box(0.07, 0.95, 0.07), '#7d5c3c', x, 0.8, z0 + 0.06);
  for (const y of [0.85, 1.25]) part(g, box(W - 0.15, 0.05, 0.06), '#8a6845', 0, y, z0 + 0.06, { outline: false });
  for (const s of [-1, 1]) {
    for (const z of [z0 + 0.06, (z0 + z1) / 2]) part(g, box(0.07, 0.95, 0.07), '#7d5c3c', s * (W / 2 - 0.1), 0.8, z);
    for (const y of [0.85, 1.25]) part(g, box(0.06, 0.05, out + 0.4), '#8a6845', s * (W / 2 - 0.1), y, z0 + (out + 0.4) / 2, { outline: false });
  }
  // The panel, tilted on the rail facing the deck.
  const panel = group(g, W / 2 - 0.9, 1.15, z0 + 0.12);
  panel.rotation.x = -0.6;
  part(panel, box(1.1, 0.62, 0.03), DARK, 0, 0, 0);
  picture(panel, painted('eco-wetland-panel', 440, 248, (c) => {
    c.fillStyle = '#eef3e6'; c.fillRect(0, 0, 440, 248);
    c.fillStyle = '#41685c'; c.fillRect(0, 0, 440, 46);
    text(c, '물여울 습지에 사는 생물', 220, 32, 26, '#ffffff', 'center');
    const rows = ['갈대 · 부들 · 노랑어리연꽃', '참개구리 · 두꺼비 올챙이', '왜가리 · 흰뺨검둥오리', '잠자리 애벌레(수채)'];
    rows.forEach((s, i) => text(c, s, 24, 88 + i * 42, 22, INK));
  }), 1.04, 0.56, 0, 0, 0.02);
  // A bench for the school groups at the back of the deck.
  part(g, box(W * 0.45, 0.06, 0.34), WOOD, -W / 4, 0.75, z1 - 0.3);
  for (const x of [-W / 4 - W * 0.18, -W / 4 + W * 0.18]) part(g, box(0.08, 0.42, 0.3), '#6f5236', x, 0.54, z1 - 0.3);
};

/** A clump of reeds and cattails: straw-coloured and green stalks leaning out of a tuft, brown heads on a few. */
const ecoReeds: Builder = (g) => {
  part(g, cyl(0.34, 0.42, 0.12, 10), '#5f6b3a', 0, 0.06, 0, { outline: false });
  for (let i = 0; i < 22; i++) {
    const a = i * 2.39;
    const r = 0.08 + (i % 5) * 0.06;
    const h = 1.1 + ((i * 7) % 6) * 0.13;
    const x = r * Math.cos(a), z = r * Math.sin(a);
    const lean = 0.12 + (i % 3) * 0.05;
    rod(g, v(x, 0.1, z), v(x + lean * Math.cos(a), h, z + lean * Math.sin(a)), 0.012, i % 3 ? '#8d9a5b' : '#c8b77a');
    if (i % 5 === 0) part(g, cyl(0.03, 0.03, 0.2, 8), '#6b4a2b', x + lean * Math.cos(a), h - 0.12, z + lean * Math.sin(a), { outline: false });
    if (i % 4 === 1) part(g, box(0.03, 0.5, 0.008), '#7d9a4f', x, 0.4, z, { ry: a, rz: 0.25, outline: false });
  }
};

/** The sampling point at the pond's edge: a staff gauge driven into the water, the logger's box on its post with its
 * solar panel and the sonde's cable running down into the water, and the sampling pole and bucket left on the bank. */
const ecoSamplePoint: Builder = (g) => {
  // The gauge out in the water (north of the bank).
  part(g, box(0.1, 1.5, 0.03), '#ffffff', -0.1, 0.55, -0.9);
  for (let i = 0; i < 14; i++) part(g, box(i % 5 === 0 ? 0.08 : 0.05, 0.03, 0.01), i % 5 === 0 ? '#c62828' : INK, -0.12, 0.12 + i * 0.1, -0.88, { outline: false });
  // The logger on its post.
  part(g, cyl(0.04, 0.04, 1.3, 8), STEEL, 0.15, 0.65, 0.05);
  part(g, rbox(0.3, 0.36, 0.16, 0.02), CREAM, 0.15, 1.05, 0.12);
  label(g, '수질 자동 측정', 0.26, 0.07, 0.15, 1.15, 0.205, CREAM, DARK);
  const solar = group(g, 0.15, 1.42, 0.05);
  solar.rotation.x = -0.7;
  part(solar, box(0.42, 0.03, 0.3), '#23395b', 0, 0, 0);
  rod(g, v(0.15, 0.9, 0.12), v(0.05, 0.3, -0.5), 0.01, INK);
  rod(g, v(0.05, 0.3, -0.5), v(0.0, -0.1, -0.85), 0.01, INK);
  // The pole sampler and the bucket on the bank.
  rod(g, v(-0.35, 0.02, 0.35), v(-0.1, 1.5, -0.2), 0.016, WOOD);
  part(g, cyl(0.05, 0.05, 0.16, 10), '#d6eef0', -0.1, 1.45, -0.22, { outline: false });
  part(g, cyl(0.13, 0.11, 0.24, 12), '#f2f2f2', -0.32, 0.12, 0.3);
};

const ecoPolyTunnel: Builder = (g, W, D) => polyHouse(g, W, D, '물여울 자생식물 증식 하우스');

export const BUILDERS: Record<string, Builder> = {
  waterTestBench, seedlingNursery, specimenTank, recycleStation, ecoJeep,
  ecoFieldRack, ecoCameraDesk, ecoHerbarium, ecoStreamDisplay,
  mrResearchBoat, mrCtdDavit, mrSeawaterPlant, mrRoundTank, mrMeasureBoard, mrNetPile, mrExhibit,
  ecoDeck, ecoReeds, ecoSamplePoint, ecoPolyTunnel,
};
