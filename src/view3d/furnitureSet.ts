import * as THREE from 'three';
import { DARK, METAL, WHITE, marker, rod, shade, spot, tint, type Builder } from './parts';
import { ball, box, canvasTexture, cyl, gradient, part, rbox } from './toon';

/** Sets drawn as themselves (2026-10-26, at the user's request): the talk show set, the showroom and the meditation mat. */

const BLACK = '#2b2b30';

const glows = new Map<string, THREE.MeshBasicMaterial>();
/** A material that shines its own colour (a lit sign, a flame), one a colour, shared. */
function glow(color: string, opacity = 1): THREE.MeshBasicMaterial {
  const key = `${color}|${opacity}`;
  let m = glows.get(key);
  if (!m) glows.set(key, (m = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 })));
  return m;
}

const geoms = new Map<string, THREE.BufferGeometry>();
/** A shape of our own (a plane, a bowl, a ring), made once for its size and shared. */
function shaped<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  let g = geoms.get(key);
  if (!g) geoms.set(key, (g = make()));
  return g as T;
}
const torus = (r: number, t: number) => shaped(`t${r},${t}`, () => new THREE.TorusGeometry(r, t, 8, 28));
const cone = (r: number, h: number) => shaped(`k${r},${h}`, () => new THREE.ConeGeometry(r, h, 12));

/** Two-sided toon colour (the inside of a bowl). */
const inside = new Map<string, THREE.MeshToonMaterial>();
function twoSided(color: string): THREE.MeshToonMaterial {
  let m = inside.get(color);
  if (!m) inside.set(color, (m = new THREE.MeshToonMaterial({ color, gradientMap: gradient, side: THREE.DoubleSide })));
  return m;
}

/** A pseudo-random run (the same city every time). */
function seeded(seed: number) {
  let s = seed;
  return () => (s = (s * 9301 + 49297) % 233280) / 233280;
}

let skylineMat: THREE.MeshBasicMaterial | undefined;
/** The city at night through the talk show's window: dusk going up into the dark, a moon, two rows of towers with lit windows. */
function skyline(): THREE.MeshBasicMaterial {
  return (skylineMat ??= new THREE.MeshBasicMaterial({
    map: canvasTexture(512, 256, (g) => {
      const sky = g.createLinearGradient(0, 0, 0, 256);
      sky.addColorStop(0, '#0d1033');
      sky.addColorStop(0.55, '#35226e');
      sky.addColorStop(1, '#b0477c');
      g.fillStyle = sky;
      g.fillRect(0, 0, 512, 256);
      const rnd = seeded(7);
      g.fillStyle = '#ffffff';
      for (let i = 0; i < 45; i++) g.fillRect(rnd() * 512, rnd() * 110, 1.5, 1.5);
      g.fillStyle = '#fff6d5';
      g.beginPath();
      g.arc(418, 52, 17, 0, Math.PI * 2);
      g.fill();
      for (const [color, lo, hi, lit] of [['#2a2457', 70, 140, 0.22], ['#141230', 40, 175, 0.42]] as const) {
        let x = -8;
        while (x < 512) {
          const w = 24 + rnd() * 40;
          const h = lo + rnd() * (hi - lo);
          g.fillStyle = color;
          g.fillRect(x, 256 - h, w, h);
          if (rnd() < 0.25) g.fillRect(x + w / 2 - 1, 256 - h - 16, 2, 16);
          g.fillStyle = '#ffd77a';
          for (let wy = 256 - h + 6; wy < 248; wy += 9) for (let wx = x + 4; wx < x + w - 5; wx += 7) if (rnd() < lit) g.fillRect(wx, wy, 3, 4);
          x += w + 2 + rnd() * 6;
        }
      }
    }),
  }));
}

let logoMat: THREE.MeshBasicMaterial | undefined;
/** The show's name in pink neon. */
function logo(): THREE.MeshBasicMaterial {
  return (logoMat ??= new THREE.MeshBasicMaterial({
    transparent: true,
    depthWrite: false,
    map: canvasTexture(512, 128, (g) => {
      g.font = 'bold 66px "Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.shadowColor = '#ff4fa3';
      g.shadowBlur = 20;
      g.fillStyle = '#ffe3f2';
      for (let i = 0; i < 2; i++) g.fillText('오늘 밤 토크', 256, 66);
    }),
  }));
}

let paperMat: THREE.MeshToonMaterial | undefined;
/** The showroom's wallpaper: a warm ground with fine stripes and little leaf sprigs between them. */
function wallpaper(): THREE.MeshToonMaterial {
  return (paperMat ??= new THREE.MeshToonMaterial({
    gradientMap: gradient,
    map: canvasTexture(256, 256, (g) => {
      g.fillStyle = '#e9dcc6';
      g.fillRect(0, 0, 256, 256);
      g.fillStyle = '#d8c6a6';
      for (let x = 0; x < 256; x += 32) g.fillRect(x, 0, 3, 256);
      g.fillStyle = '#9fae8a';
      for (let y = 16; y < 256; y += 64)
        for (let x = 16; x < 256; x += 32) {
          const yy = y + ((x / 32) % 2) * 32;
          g.beginPath();
          g.ellipse(x, yy, 4, 9, 0.6, 0, Math.PI * 2);
          g.ellipse(x + 6, yy + 6, 4, 9, -0.6, 0, Math.PI * 2);
          g.fill();
        }
    }, 3, 2),
  }));
}

/** A potted plant: a pot, a few stems and leaves up to about `h`. */
function pottedPlant(g: THREE.Object3D, x: number, y: number, z: number, h: number, pot = '#c46b4c', r = 0.13) {
  part(g, cyl(r, r * 0.78, r * 2.2, 16), pot, x, y + r * 1.1, z);
  part(g, cyl(r * 0.92, r * 0.92, 0.01, 16), '#4e342e', x, y + r * 2.2, z, { outline: false });
  const top = y + r * 2.2;
  const rnd = seeded(Math.round((x + 3) * 100 + (z + 3) * 10));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + rnd();
    const up = h * (0.45 + 0.55 * rnd());
    const tip = new THREE.Vector3(x + Math.cos(a) * 0.12, top + up * 0.9, z + Math.sin(a) * 0.12);
    rod(g, new THREE.Vector3(x, top, z), tip, 0.008, '#5d7d3a');
    part(g, ball(0.08 + 0.03 * rnd()), i % 2 ? '#4f8f4a' : '#69a85a', tip.x, tip.y + 0.03, tip.z);
  }
}

/**
 * The talk show set (2026-10-26, at the user's request: it read as a sofa and a box): a low riser
 * with a lit lip, the city at night through a big window behind under the show's name in neon, lit
 * columns either side, a rug — and on it, as on TV, the host's desk on the right (seen from the
 * front) with a mug, a stack of cue cards and a desk mic, their chair behind turned a little to the
 * guests, and the guests' sofa on the left turned to the host, a coffee table before it with their
 * mugs, a tall plant and a floor lamp in the back corners. The host sits at the desk (a spot of its
 * own, for every use); the guests waiting their turn sit on the sofa (`guests`, waitSeats.ts).
 */
const talkShowSet: Builder = (g, W, D, c, _def, _ctx, out) => {
  const h = 0.1;
  part(g, rbox(W - 0.04, h, D - 0.04, 0.02), '#241f36', 0, h / 2, 0);
  part(g, box(W - 0.12, 0.004, D - 0.12), '#3a3352', 0, h + 0.002, 0, { outline: false });
  part(g, box(W - 0.12, 0.018, 0.006), tint(c, 0.55), 0, h - 0.03, D / 2 - 0.017, { outline: false, material: glow(tint(c, 0.6)) });
  // The rug, an oval with a border.
  const rug = part(g, cyl(1, 1, 0.008, 40), '#2f2550', 0, h + 0.006, 0.08, { outline: false });
  rug.scale.set(1.32, 1, 0.78);
  const rugIn = part(g, cyl(1, 1, 0.008, 40), '#5b3f8c', 0, h + 0.009, 0.08, { outline: false });
  rugIn.scale.set(1.22, 1, 0.68);

  // The backdrop: a dark wall with the window on the city, its frame and mullions.
  const back = -D / 2 + 0.06;
  part(g, rbox(W - 0.04, 2.55, 0.1, 0.02), '#1d1930', 0, h + 1.275, back);
  const ww = W - 0.6;
  const wh = 1.45;
  const wy = h + 1.22;
  const wz = back + 0.06;
  const city = new THREE.Mesh(shaped(`p${ww},${wh}`, () => new THREE.PlaneGeometry(ww, wh)), skyline());
  city.position.set(0, wy, back + 0.052);
  g.add(city);
  const frame = '#4a4270';
  for (const sy of [-1, 1]) part(g, box(ww + 0.1, 0.05, 0.03), frame, 0, wy + sy * (wh / 2 + 0.02), wz);
  for (const sx of [-1, 1]) part(g, box(0.05, wh + 0.1, 0.03), frame, sx * (ww / 2 + 0.02), wy, wz);
  for (const x of [-ww / 4, 0, ww / 4]) part(g, box(0.025, wh, 0.02), frame, x, wy, wz, { outline: false });
  part(g, box(ww, 0.022, 0.02), frame, 0, wy + wh * 0.2, wz, { outline: false });
  // The show's name in neon on a dark header over the window, a pink line under it.
  part(g, rbox(1.55, 0.36, 0.06, 0.02), '#120f20', 0, h + 2.2, back + 0.08);
  const name = new THREE.Mesh(shaped('p1.45,0.36', () => new THREE.PlaneGeometry(1.45, 0.36)), logo());
  name.position.set(0, h + 2.21, back + 0.112);
  g.add(name);
  part(g, box(1.2, 0.014, 0.01), '#ff4fa3', 0, h + 2.05, back + 0.115, { outline: false, material: glow('#ff7fbf') });
  // A lit column either side.
  for (const sx of [-1, 1]) {
    part(g, rbox(0.18, 2.45, 0.16, 0.02), '#2c2645', sx * (W / 2 - 0.13), h + 1.225, back + 0.1);
    part(g, box(0.04, 2.2, 0.01), tint(c, 0.5), sx * (W / 2 - 0.13), h + 1.2, back + 0.185, { outline: false, material: glow(tint(c, 0.55)) });
  }

  // The host's desk, on the right as the camera sees it: a purple front with a lit band and the
  // show's pink disc, sides, a wood top.
  const dx = 0.82;
  const dz = 0.02;
  const top = h + 0.76;
  part(g, rbox(1.0, 0.7, 0.06, 0.02), c, dx, h + 0.36, dz + 0.25);
  part(g, box(0.94, 0.03, 0.005), '#ce93d8', dx, h + 0.16, dz + 0.283, { outline: false, material: glow('#e1bee7') });
  part(g, cyl(0.12, 0.12, 0.012, 28), '#ff4fa3', dx, h + 0.46, dz + 0.284, { rx: Math.PI / 2, outline: false, material: glow('#ff7fbf') });
  part(g, cyl(0.085, 0.085, 0.014, 28), '#1d1930', dx, h + 0.46, dz + 0.287, { rx: Math.PI / 2, outline: false });
  for (const sx of [-1, 1]) part(g, rbox(0.05, 0.7, 0.52, 0.02), shade(c, 0.75), dx + sx * 0.47, h + 0.36, dz);
  part(g, rbox(1.06, 0.05, 0.6, 0.02), '#8d5a3b', dx, top - 0.025, dz);
  // On it: the cue cards (by the host's left hand), their mug, a desk mic turned to them, a pen.
  for (let i = 0; i < 3; i++) part(g, box(0.1, 0.004, 0.15), i === 2 ? '#fff8e1' : '#f3e5ab', dx + 0.15 + i * 0.006, top + 0.003 + i * 0.004, dz - 0.07, { ry: 0.1 - i * 0.08, outline: i === 2 });
  part(g, box(0.07, 0.001, 0.006), '#1e88e5', dx + 0.162, top + 0.0145, dz - 0.11, { ry: -0.06, outline: false });
  part(g, cyl(0.038, 0.034, 0.1, 16), '#ff4fa3', dx + 0.38, top + 0.05, dz + 0.08);
  part(g, cyl(0.032, 0.032, 0.004, 16), '#4e342e', dx + 0.38, top + 0.099, dz + 0.08, { outline: false });
  part(g, torus(0.028, 0.007), '#ff4fa3', dx + 0.42, top + 0.05, dz + 0.08, { ry: Math.PI / 2, outline: false });
  const mic = new THREE.Group();
  mic.position.set(dx - 0.3, top, dz + 0.12);
  mic.rotation.y = -0.5;
  g.add(mic);
  part(mic, cyl(0.05, 0.06, 0.02, 16), BLACK, 0, 0.01, 0);
  rod(mic, new THREE.Vector3(0, 0.02, 0), new THREE.Vector3(0, 0.2, -0.06), 0.008, METAL);
  part(mic, cyl(0.026, 0.026, 0.09, 14), '#c0c4c8', 0, 0.22, -0.08, { rx: Math.PI / 2 - 0.5 });
  for (let i = 0; i < 3; i++) part(mic, torus(0.027, 0.003), DARK, 0, 0.22 + (i - 1) * 0.012, -0.08 - (i - 1) * 0.02, { rx: -0.5, outline: false });
  part(g, cyl(0.006, 0.006, 0.14, 6), BLACK, dx - 0.05, top + 0.006, dz + 0.06, { rz: Math.PI / 2, ry: 0.4, outline: false });
  // The host's chair behind it, turned a little towards the guests.
  const chair = new THREE.Group();
  chair.position.set(dx, h, -0.4);
  chair.rotation.y = -0.3;
  g.add(chair);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    rod(chair, new THREE.Vector3(0, 0.05, 0), new THREE.Vector3(Math.sin(a) * 0.25, 0.04, Math.cos(a) * 0.25), 0.015, DARK);
    part(chair, ball(0.025), BLACK, Math.sin(a) * 0.25, 0.025, Math.cos(a) * 0.25, { outline: false });
  }
  part(chair, cyl(0.03, 0.03, 0.36, 10), METAL, 0, 0.24, 0, { outline: false });
  part(chair, rbox(0.5, 0.09, 0.48, 0.04), '#2b2b3a', 0, 0.44, 0);
  part(chair, rbox(0.5, 0.62, 0.08, 0.04), '#2b2b3a', 0, 0.82, -0.25, { rx: -0.12 });
  for (const sx of [-1, 1]) {
    part(chair, box(0.03, 0.16, 0.03), DARK, sx * 0.27, 0.54, 0.02, { outline: false });
    part(chair, rbox(0.06, 0.04, 0.3, 0.015), BLACK, sx * 0.27, 0.63, 0.02);
  }
  const host = spot(chair, 'sit', 0, 0.485, 0.03, 0, 0.485);
  host.work = marker(g, dx - 0.04, top + 0.01, dz - 0.08);
  host.motion = 'host';
  out.spots = { '*': host };

  // The guests' sofa on the left, turned to the host: a plinth on short legs, two seat cushions, a
  // back, round arms and a pillow at each end; a place on each cushion.
  const sofa = new THREE.Group();
  sofa.position.set(-0.65, h, -0.2);
  sofa.rotation.y = 0.45;
  g.add(sofa);
  const cloth = '#d9973a';
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(sofa, cyl(0.025, 0.018, 0.08, 8), '#4e342e', sx * 0.64, 0.04, sz * 0.28, { outline: false });
  part(sofa, rbox(1.4, 0.2, 0.7, 0.05), shade(cloth, 0.85), 0, 0.18, 0);
  for (const sx of [-1, 1]) part(sofa, rbox(0.63, 0.13, 0.58, 0.05), cloth, sx * 0.32, 0.345, 0.04);
  part(sofa, rbox(1.4, 0.5, 0.16, 0.06), shade(cloth, 0.92), 0, 0.5, -0.27, { rx: -0.08 });
  for (const sx of [-1, 1]) part(sofa, rbox(0.14, 0.42, 0.7, 0.07), shade(cloth, 0.88), sx * 0.68, 0.38, 0);
  part(sofa, rbox(0.3, 0.28, 0.1, 0.05), '#ab47bc', -0.46, 0.55, -0.15, { rx: -0.2, rz: 0.15 });
  part(sofa, rbox(0.28, 0.26, 0.1, 0.05), '#26a69a', 0.47, 0.55, -0.15, { rx: -0.2, rz: -0.15 });
  out.guests = [-0.32, 0.32].map((x) => {
    const m = marker(sofa, x, 0.42, 0.02);
    m.userData.drop = 0.42;
    return m;
  });
  // The coffee table before it with the guests' mugs and a little vase.
  const tx = -0.5;
  const tz = 0.66;
  part(g, cyl(0.24, 0.24, 0.03, 24), '#ece6f5', tx, h + 0.37, tz);
  part(g, cyl(0.03, 0.05, 0.34, 10), METAL, tx, h + 0.18, tz, { outline: false });
  part(g, cyl(0.14, 0.15, 0.02, 20), METAL, tx, h + 0.01, tz, { outline: false });
  for (const [x, z, k] of [[-0.09, 0.03, '#26a69a'], [0.08, -0.06, '#ab47bc']] as const) part(g, cyl(0.032, 0.028, 0.08, 14), k, tx + x, h + 0.425, tz + z);
  part(g, cyl(0.025, 0.035, 0.12, 12), WHITE, tx + 0.05, h + 0.445, tz + 0.1);
  for (let i = 0; i < 3; i++) part(g, ball(0.025), ['#f48fb1', '#fff59d', '#ce93d8'][i], tx + 0.05 + (i - 1) * 0.025, h + 0.53 + (i % 2) * 0.02, tz + 0.1, { outline: false });
  // A tall plant behind the sofa's far end.
  pottedPlant(g, -1.15, h, -0.7, 1.0, '#3a3352', 0.13);
};

/**
 * The interior designer's showroom (2026-10-26, at the user's request: a sofa and a pot on a
 * floor): a corner of a finished room — an oak floor, wallpaper over a painted, panelled dado on the
 * back wall and a short side wall, a velvet sofa with its pillows and a throw, a big canvas over it
 * under a picture light, an arc lamp reaching over from the corner, a patterned rug, a round marble
 * coffee table with books, a candle and a vase of flowers, a pouf, an open shelf of styled pieces and
 * a tall plant. The designer stands at the front by the coffee table, arranging the flowers.
 */
const showroomSet: Builder = (g, W, D, c, _def, _ctx, out) => {
  const F = 0.04;
  // The floor: oak boards on a low base, the joints in lines along them.
  part(g, rbox(W - 0.04, F, D - 0.04, 0.01), '#c79a66', 0, F / 2, 0);
  for (let z = -D / 2 + 0.17; z < D / 2 - 0.05; z += 0.16) part(g, box(W - 0.08, 0.002, 0.006), '#a87b4c', 0, F + 0.001, z, { outline: false });
  // The back wall and a short wall on the left: wallpaper above a painted panelled dado, a white rail
  // between, a skirting board along the floor.
  const back = -D / 2 + 0.04;
  const sage = '#8fa98a';
  const wallH = 2.4;
  part(g, rbox(W - 0.04, wallH, 0.08, 0.01), tint(c, 0.2), 0, wallH / 2, back);
  const side = -W / 2 + 0.04;
  const sd = D - 0.35;
  const sz = back + sd / 2 - 0.04;
  part(g, rbox(0.08, wallH, sd, 0.01), tint(c, 0.2), side, wallH / 2, sz);
  const paper = wallpaper();
  const upH = wallH - 1.0;
  const bp = new THREE.Mesh(shaped(`p${W - 0.12},${upH - 0.04}`, () => new THREE.PlaneGeometry(W - 0.12, upH - 0.04)), paper);
  bp.position.set(0, 1.0 + upH / 2, back + 0.041);
  g.add(bp);
  const sp = new THREE.Mesh(shaped(`p${sd - 0.12},${upH - 0.04}`, () => new THREE.PlaneGeometry(sd - 0.12, upH - 0.04)), paper);
  sp.position.set(side + 0.041, 1.0 + upH / 2, sz + 0.02);
  sp.rotation.y = Math.PI / 2;
  g.add(sp);
  // The dado: painted panels with raised frames on each wall, the rail over them and the skirting.
  part(g, box(W - 0.12, 0.92, 0.01), sage, 0, F + 0.46, back + 0.045, { outline: false });
  part(g, box(0.01, 0.92, sd - 0.1), sage, side + 0.045, F + 0.46, sz + 0.03, { outline: false });
  for (let i = 0; i < 4; i++) {
    const x = -W / 2 + 0.2 + i * ((W - 0.4) / 4) + (W - 0.4) / 8;
    const fw = (W - 0.4) / 4 - 0.1;
    for (const sy of [-1, 1]) part(g, box(fw, 0.02, 0.012), shade(sage, 0.85), x, F + 0.46 + sy * 0.25, back + 0.052, { outline: false });
    for (const sx of [-1, 1]) part(g, box(0.02, 0.52, 0.012), shade(sage, 0.85), x + sx * fw / 2, F + 0.46, back + 0.052, { outline: false });
  }
  part(g, box(W - 0.1, 0.04, 0.03), WHITE, 0, 1.0, back + 0.05);
  part(g, box(0.03, 0.04, sd - 0.08), WHITE, side + 0.05, 1.0, sz + 0.03);
  part(g, box(W - 0.1, 0.1, 0.02), WHITE, 0, F + 0.05, back + 0.05, { outline: false });
  part(g, box(0.02, 0.1, sd - 0.08), WHITE, side + 0.05, F + 0.05, sz + 0.03, { outline: false });

  // The rug: a border, a field and a pattern of lines.
  part(g, box(2.0, 0.006, 1.4), '#7b4a3a', -0.15, F + 0.003, 0.0, { outline: false });
  part(g, box(1.84, 0.006, 1.24), '#e8d9c0', -0.15, F + 0.005, 0.0, { outline: false });
  for (let i = -2; i <= 2; i++) part(g, box(0.04, 0.006, 1.0), i % 2 ? '#c98d6a' : '#7d9a87', -0.15 + i * 0.32, F + 0.007, 0.0, { outline: false });

  // The sofa against the back wall: deep green velvet, tapered legs, three seat cushions, a back,
  // round arms, pillows and a throw over the left arm.
  const sx0 = -0.15;
  const sofaZ = back + 0.04 + 0.42;
  const velvet = '#2f6b5e';
  for (const sx of [-1, 1]) for (const sz2 of [-1, 1]) part(g, cyl(0.022, 0.014, 0.12, 8), '#6d4c33', sx0 + sx * 0.88, F + 0.06, sofaZ + sz2 * 0.32, { outline: false });
  part(g, rbox(1.9, 0.2, 0.8, 0.05), shade(velvet, 0.9), sx0, F + 0.22, sofaZ);
  for (let i = -1; i <= 1; i++) part(g, rbox(0.56, 0.12, 0.62, 0.05), velvet, sx0 + i * 0.57, F + 0.38, sofaZ + 0.06);
  part(g, rbox(1.9, 0.46, 0.18, 0.07), shade(velvet, 0.95), sx0, F + 0.53, sofaZ - 0.31);
  for (const sx of [-1, 1]) part(g, rbox(0.16, 0.36, 0.8, 0.08), shade(velvet, 0.92), sx0 + sx * 0.87, F + 0.4, sofaZ);
  for (const [x, k, r] of [[-0.62, '#e0a83c', 0.18], [-0.35, '#f1e9da', -0.08], [0.38, '#c8694a', 0.12], [0.62, '#e0a83c', -0.18]] as const) part(g, rbox(0.3, 0.3, 0.1, 0.05), k, sx0 + x, F + 0.6, sofaZ - 0.17, { rx: -0.25, rz: r });
  part(g, box(0.36, 0.02, 0.5), '#d8cbb3', sx0 - 0.87, F + 0.59, sofaZ + 0.02, { outline: false });
  part(g, box(0.36, 0.3, 0.02), '#d8cbb3', sx0 - 0.87, F + 0.44, sofaZ + 0.28, { outline: false });
  // A big canvas over it in a thin gold frame, a picture light over that; a small frame beside.
  const art = new THREE.Group();
  art.position.set(sx0, 1.62, back + 0.06);
  g.add(art);
  part(art, rbox(1.04, 0.72, 0.03, 0.005), '#c9a24a', 0, 0, 0);
  part(art, box(0.96, 0.64, 0.01), '#f4eee2', 0, 0, 0.018, { outline: false });
  for (const [x, y, r, k] of [[-0.2, 0.05, 0.2, '#c8694a'], [0.12, -0.08, 0.16, '#2f6b5e'], [0.25, 0.14, 0.09, '#e0a83c']] as const) part(art, cyl(r, r, 0.006, 28), k, x, y, 0.024, { rx: Math.PI / 2, outline: false });
  part(art, box(0.6, 0.012, 0.006), '#3d3b45', 0.05, -0.2, 0.026, { rz: 0.25, outline: false });
  part(g, rbox(0.5, 0.04, 0.06, 0.015), '#c9a24a', sx0, 2.06, back + 0.12);
  part(g, box(0.44, 0.006, 0.03), '#fff3c4', sx0, 2.037, back + 0.12, { outline: false, material: glow('#fff3c4') });
  part(g, rbox(0.3, 0.38, 0.03, 0.005), '#3d3b45', 0.6, 1.55, back + 0.06);
  part(g, box(0.24, 0.32, 0.01), '#d7e3d4', 0.6, 1.55, back + 0.078, { outline: false });
  part(g, ball(0.06), '#7d9a87', 0.6, 1.52, back + 0.085, { outline: false });

  // An arc lamp from the corner, over the sofa's end: a marble foot, the arc, a dome with its glow.
  const lx = -1.22;
  const lz = 0.28;
  part(g, cyl(0.14, 0.15, 0.05, 20), '#efebe9', lx, F + 0.025, lz);
  let prev = new THREE.Vector3(lx, F + 0.05, lz);
  for (let i = 1; i <= 8; i++) {
    const a = (i / 8) * Math.PI * 0.62;
    const next = new THREE.Vector3(lx + Math.sin(a) * 0.62 * Math.min(1, i / 3), F + 0.05 + Math.sin(Math.min(a * 1.5, Math.PI / 2)) * 1.7, lz - (i / 8) * 0.3);
    rod(g, prev, next, 0.012, '#c9a24a');
    prev = next;
  }
  part(g, cyl(0.04, 0.2, 0.16, 20), '#c9a24a', prev.x, prev.y - 0.1, prev.z);
  part(g, cyl(0.17, 0.17, 0.005, 20), '#fff3c4', prev.x, prev.y - 0.18, prev.z, { outline: false, material: glow('#fff3c4') });

  // The coffee table: a round marble top with a gold rim on a pedestal; books, a tray with a candle,
  // and the vase of flowers being arranged.
  const tx = -0.12;
  const tz = 0.2;
  const tt = F + 0.44;
  part(g, cyl(0.38, 0.38, 0.04, 32), '#f2efe9', tx, tt - 0.02, tz);
  part(g, torus(0.38, 0.008), '#c9a24a', tx, tt - 0.02, tz, { rx: Math.PI / 2, outline: false });
  part(g, cyl(0.12, 0.2, 0.38, 20), '#c9a24a', tx, F + 0.2, tz);
  for (const [i, k] of ['#2f6b5e', '#c8694a'].entries()) part(g, rbox(0.22, 0.035, 0.16, 0.005), k, tx - 0.16, tt + 0.018 + i * 0.035, tz - 0.05, { ry: 0.3 - i * 0.25 });
  part(g, rbox(0.22, 0.02, 0.14, 0.01), '#3d3b45', tx + 0.14, tt + 0.01, tz - 0.12, { ry: -0.2 });
  part(g, cyl(0.035, 0.035, 0.07, 14), WHITE, tx + 0.14, tt + 0.055, tz - 0.12);
  part(g, cone(0.008, 0.025), '#ffb74d', tx + 0.14, tt + 0.103, tz - 0.12, { outline: false, material: glow('#ffcc80') });
  const vx = tx + 0.12;
  const vz = tz + 0.13;
  part(g, cyl(0.045, 0.06, 0.22, 16), '#7d9a87', vx, tt + 0.11, vz);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const tip = new THREE.Vector3(vx + Math.cos(a) * 0.08, tt + 0.36 + (i % 3) * 0.04, vz + Math.sin(a) * 0.08);
    rod(g, new THREE.Vector3(vx, tt + 0.2, vz), tip, 0.005, '#5d7d3a');
    part(g, ball(0.035), ['#f8bbd0', '#fff8e1', '#f48fb1', '#ffe082'][i % 4], tip.x, tip.y, tip.z, { outline: false });
  }
  // A round pouf, an open shelf of styled pieces against the back wall, a tall plant in a basket.
  part(g, cyl(0.2, 0.2, 0.36, 22), '#e0a83c', 0.62, F + 0.18, 0.6);
  part(g, torus(0.2, 0.012), shade('#e0a83c', 0.8), 0.62, F + 0.36, 0.6, { rx: Math.PI / 2, outline: false });
  const shx = 1.12;
  const shz = back + 0.04 + 0.17;
  for (const sx of [-1, 1]) part(g, box(0.03, 1.7, 0.32), '#3d3b45', shx + sx * 0.27, F + 0.85, shz);
  for (let i = 0; i < 4; i++) part(g, box(0.54, 0.025, 0.32), '#a87b4c', shx, F + 0.08 + i * 0.5, shz);
  part(g, cyl(0.06, 0.04, 0.2, 14), '#c8694a', shx - 0.12, F + 0.19, shz);
  for (let i = 0; i < 5; i++) part(g, box(0.035, 0.22 - (i % 2) * 0.03, 0.18), ['#2f6b5e', '#e0a83c', '#f1e9da', '#7b4a3a', '#7d9a87'][i], shx + 0.04 + i * 0.04, F + 0.205 - (i % 2) * 0.015, shz, { outline: false });
  part(g, ball(0.08), '#f1e9da', shx - 0.1, F + 0.67, shz);
  part(g, cyl(0.04, 0.05, 0.28, 14), '#3d3b45', shx + 0.12, F + 0.73, shz);
  part(g, cyl(0.07, 0.06, 0.1, 14), '#f1e9da', shx, F + 1.14, shz);
  for (let i = 0; i < 4; i++) part(g, ball(0.045), '#69a85a', shx - 0.06 + i * 0.04, F + 1.2 - i * 0.05, shz + 0.1, { outline: false });
  part(g, rbox(0.18, 0.12, 0.12, 0.02), '#c9a24a', shx + 0.12, F + 1.655, shz, { ry: 0.4 });
  pottedPlant(g, 1.2, F, 0.45, 1.05, '#bfa27a', 0.14);

  // The designer at the front by the table, facing in to the flowers.
  const flowers = marker(g, vx, tt + 0.4, vz);
  const stand = spot(g, 'stand', 0.2, F, 0.75, Math.atan2(vx - 0.2, vz - 0.75));
  stand.work = flowers;
  out.spots = { '*': stand };
  out.work = flowers;
};

/**
 * The meditation mat (2026-10-26, at the user's request): a rush mat bound in green cloth, a
 * square cushion (zabuton) on it with a round pleated one (zafu) to sit on, a tray with two lit
 * candles and a stick of incense smoking on the left, a singing bowl on its ring cushion with its
 * striker on the right, a stack of stones and a little plant at the back. Whoever uses it sits
 * cross-legged on the zafu facing out (a spot of its own): leading a meditation they talk the
 * room through it with their hands, else they sit still with their eyes shut (activity.ts).
 */
const meditationMat: Builder = (g, W, D, c, _def, _ctx, out) => {
  const mw = W - 0.1;
  const md = D - 0.08;
  part(g, rbox(mw, 0.016, md, 0.008), shade(c, 0.5), 0, 0.008, 0);
  part(g, box(mw - 0.09, 0.004, md - 0.09), '#d9cf9a', 0, 0.016, 0, { outline: false });
  for (let z = -md / 2 + 0.08; z < md / 2 - 0.05; z += 0.045) part(g, box(mw - 0.12, 0.002, 0.005), '#c4b67e', 0, 0.0185, z, { outline: false });
  // The zabuton with its gold piping, the zafu on it towards the back: pleated round its side, a button on top.
  part(g, rbox(0.8, 0.06, 0.74, 0.03), '#34446a', 0, 0.048, 0.02);
  part(g, rbox(0.82, 0.01, 0.76, 0.005), '#c9a74a', 0, 0.048, 0.02, { outline: false });
  const zz = -0.08;
  const zt = 0.078 + 0.1;
  part(g, cyl(0.17, 0.19, 0.1, 28), '#b5562f', 0, 0.078 + 0.05, zz);
  part(g, cyl(0.155, 0.17, 0.012, 28), tint('#b5562f', 0.15), 0, zt - 0.004, zz, { outline: false });
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    part(g, box(0.02, 0.085, 0.012), shade('#b5562f', 0.82), Math.sin(a) * 0.183, 0.078 + 0.05, zz + Math.cos(a) * 0.183, { ry: a, outline: false });
  }
  part(g, cyl(0.025, 0.025, 0.012, 12), shade('#b5562f', 0.7), 0, zt + 0.002, zz, { outline: false });
  // The tray on the left: two candles alight and a dish with a stick of incense, smoke rising.
  const tx = -0.7;
  part(g, rbox(0.34, 0.03, 0.24, 0.01), '#6d4c33', tx, 0.031, 0.05);
  for (const [x, z, hh] of [[-0.08, 0.0, 0.1], [0.0, 0.09, 0.06]] as const) {
    part(g, cyl(0.032, 0.034, hh, 16), '#f3ead7', tx + x, 0.046 + hh / 2, 0.05 + z);
    part(g, cone(0.011, 0.034), '#ffb74d', tx + x, 0.046 + hh + 0.024, 0.05 + z, { outline: false, material: glow('#ffb74d') });
    part(g, ball(0.006), '#fff3c4', tx + x, 0.046 + hh + 0.014, 0.05 + z, { outline: false, material: glow('#fff8e1') });
  }
  part(g, cyl(0.045, 0.03, 0.015, 16), '#d7ccc8', tx + 0.1, 0.054, 0.0);
  const stick = new THREE.Vector3(tx + 0.1, 0.06, 0.0);
  const tip = new THREE.Vector3(tx + 0.17, 0.26, -0.02);
  rod(g, stick, tip, 0.003, '#5d4037');
  part(g, ball(0.006), '#ff7043', tip.x, tip.y, tip.z, { outline: false, material: glow('#ff8a65') });
  for (let i = 0; i < 4; i++) part(g, ball(0.012 + i * 0.006), '#eceff1', tip.x + Math.sin(i * 1.7) * 0.02, tip.y + 0.04 + i * 0.05, tip.z, { outline: false, shadow: false, material: glow('#eceff1', 0.35 - i * 0.07) });
  // The singing bowl on its ring cushion on the right, the striker beside it.
  const bx = 0.68;
  const bz = 0.04;
  part(g, cyl(0.085, 0.09, 0.035, 20), '#8e2430', bx, 0.016 + 0.0175, bz);
  const bowl = new THREE.Mesh(shaped('bowl0.1', () => new THREE.SphereGeometry(0.1, 24, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)), twoSided('#c99a3e'));
  bowl.position.set(bx, 0.051 + 0.08, bz);
  bowl.castShadow = bowl.receiveShadow = true;
  g.add(bowl);
  part(g, torus(0.1, 0.006), '#e3c06a', bx, 0.131, bz, { rx: Math.PI / 2, outline: false });
  part(g, cyl(0.012, 0.012, 0.2, 10), '#8d6e63', bx - 0.02, 0.028, bz - 0.16, { rz: Math.PI / 2, ry: 0.3 });
  part(g, cyl(0.016, 0.016, 0.05, 10), '#4e342e', bx + 0.075, 0.03, bz - 0.19, { rz: Math.PI / 2, ry: 0.3, outline: false });
  // At the back: a stack of smooth stones, a little plant.
  for (const [i, r] of [0.07, 0.055, 0.04].entries()) {
    const st = part(g, ball(r), ['#8d9093', '#a7aaad', '#7b7e81'][i], -0.72, 0.016 + 0.02 + i * 0.045 + (i ? 0.01 : 0), -0.32);
    st.scale.set(1, 0.55, 0.9);
  }
  part(g, cyl(0.06, 0.05, 0.09, 14), '#e8e0d0', 0.74, 0.061, -0.32);
  for (let i = 0; i < 5; i++) part(g, ball(0.035), i % 2 ? '#7cb342' : '#9ccc65', 0.74 + Math.cos(i * 1.3) * 0.03, 0.12 + (i % 3) * 0.02, -0.32 + Math.sin(i * 1.3) * 0.03, { outline: false });
  // On the zafu, cross-legged, facing out.
  const seat = spot(g, 'sit', 0, zt, zz, 0, zt);
  seat.legs = 'cross';
  out.spots = { '*': seat };
};

export const SET_DETAIL: Record<string, Builder> = { talkShowSet, showroomSet, meditationMat };
