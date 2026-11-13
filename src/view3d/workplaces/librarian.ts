import * as THREE from 'three';
import { DESK_BOOKS, SCAN_BOOK, SHELVE, STORYBOOK, checkoutRound, pageScanRound, shelfBook, shelveRound, storyRound, toolPhase, type BarOffset, type Motion } from '../activity';
import { marker, rod, spot, type Builder, type Spot } from '../parts';
import { ball, box, cyl, gradient, part, rbox, toon } from '../toon';
import { BLACK, CHROME, STEEL, glass, glowing, label, litScreen, painted, picture, seeded, text, type Paint } from './doctor';

/**
 * The city library drawn as itself (2026-10-27 workplace pipeline, at the user's request: a 시립
 * 도서관 should read as one, and shelving should look like shelving). The loan desk with its RFID pad,
 * barcode scanner and book drop, a borrower across it (a class on a field trip in yellow caps when one
 * comes); the stacks in their bays with call-number labels on every spine and the 분류 range on the
 * cornice, the book truck at the librarian's side, each book taken off it, its label read and slid
 * into its gap at its height; the cataloguing desk with the KORMARC record and the label printer; the
 * overhead scanner with an old book in its cradle, its pages turned and shot; the story rug where the
 * librarian, on a low chair, holds a picture book open to a ring of children and turns its pages;
 * and what the library was missing (workFurniture/librarian.ts): reading tables with green lamps and
 * their chairs (a book or a search slip brought to whoever's sat there), the 자료 검색 kiosk, a book
 * truck of returns, the 24-hour book drop and the children's picture-book shelf.
 */

const OAK = '#c9a273';
const OAK_DARK = '#8d6748';
const CREAM = '#efe9dc';
const STACK = '#e7e3d8';
const STEEL_GREY = '#8a98a3';
const SKIN = '#f3cfb3';
const HAIR = '#2f2219';
const PAPER = '#fbf8ef';
const OLD_PAPER = '#e6d6a8';
const BRASS = '#c9a34a';
const LIB_GREEN = '#2e6b4f';
/** The banker's lamps' green glass, seen from inside too. */
const SHADE = new THREE.MeshToonMaterial({ color: '#1b5e20', gradientMap: gradient, side: THREE.DoubleSide });
const SPINE_COLORS = ['#8e2b2b', '#2e5a87', '#2f6b3f', '#c9a227', '#5b3a6e', '#d35400', '#1f3b4d', '#7b4b2a', '#a83250', '#3f7f7f', '#e8e2d0', '#283593', '#6d4c41', '#f2c14e', '#4e7d5b', '#b23a48'];

const tmp = new THREE.Vector3();
const Z = new THREE.Vector3(0, 0, 1);
const UP = new THREE.Vector3(0, 1, 0);
/** Whether a spot's had a dweller posed at it just now (activity.ts spotPose marks it). */
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
/** Of named spots, the one most lately stood at (within a moment), else null. */
function nowAt(spots: Record<string, Spot>, t: number): string | null {
  let best: string | null = null;
  for (const [k, s] of Object.entries(spots)) if (Math.abs(t - posedAt(s)) < 0.6 && (best === null || posedAt(s) > posedAt(spots[best]))) best = k;
  return best;
}
const phaseAt = (s: Spot) => toolPhase(s.at.getWorldPosition(tmp));
/** A spot with what the hands do there. */
function at(s: Spot, work: THREE.Object3D | undefined, motion?: Motion): Spot {
  s.work = work;
  s.motion = motion;
  return s;
}
/** Points `o` (its +z) from `from` towards `to`, in its parent's frame. */
function aim(o: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3) {
  o.position.copy(from);
  const d = to.clone().sub(from);
  if (d.lengthSq() > 1e-8) o.quaternion.setFromUnitVectors(Z, d.normalize());
}
/** Where an offset in the librarian's frame (from `W`, facing `yaw`) is, in the piece's frame. */
function framer(W: THREE.Vector3, yaw: number) {
  const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const left = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  return (o: BarOffset, v = new THREE.Vector3()) => v.copy(W).addScaledVector(left, o.side).addScaledVector(UP, o.up).addScaledVector(fwd, o.ahead);
}
const wave = (t: number, hz: number, ph = 0) => Math.sin((t * hz + ph) * Math.PI * 2);
const bookColor = (n: number) => SPINE_COLORS[((n % SPINE_COLORS.length) + SPINE_COLORS.length) % SPINE_COLORS.length];

// ---------------------------------------------------------------------------------------------
// Books: rows of spines painted with their call-number labels, and books on their own.

/** A shelf's run of spines, bottoms level, tops ragged (see-through above each), each with its white call-number label. */
function paintSpines(seed: number): Paint {
  return (c) => {
    c.clearRect(0, 0, 512, 128);
    const r = seeded(seed);
    let x = 1;
    while (x < 498) {
      const w = 11 + Math.floor(r() * 13);
      const h = Math.round(128 * (0.7 + 0.3 * r()));
      const col = SPINE_COLORS[Math.floor(r() * SPINE_COLORS.length)];
      const light = col === '#e8e2d0' || col === '#f2c14e' || col === '#c9a227';
      c.fillStyle = col;
      c.fillRect(x, 128 - h, w - 1, h);
      c.fillStyle = 'rgba(0,0,0,0.28)';
      c.fillRect(x + w - 2, 128 - h, 1, h);
      c.fillStyle = light ? 'rgba(60,40,20,0.5)' : 'rgba(255,255,255,0.45)';
      c.fillRect(x + 1, 128 - h + 6, w - 3, 2);
      c.fillRect(x + Math.floor(w / 2) - 1, 128 - h + 14, 2, Math.round(h * 0.36));
      // The 청구기호 label: three lines (분류기호, 도서기호, 권차) on white, and a genre dot over some.
      c.fillStyle = '#fbfaf3';
      c.fillRect(x + 1, 128 - 34, w - 3, 22);
      c.fillStyle = '#4a4a4a';
      for (let i = 0; i < 3; i++) c.fillRect(x + 2, 128 - 30 + i * 6, Math.max(2, w - 5 - i * 2), 2);
      if (r() > 0.55) {
        c.fillStyle = ['#e53935', '#43a047', '#1e88e5', '#fdd835'][Math.floor(r() * 4)];
        c.fillRect(x + 1, 128 - 40, w - 3, 5);
      }
      x += w;
    }
  };
}
const ROW_GEO = new Map<string, THREE.PlaneGeometry>();
const ROW_MAT = new Map<number, THREE.Material>();
/** A row of books standing on a shelf at `y`, their spines facing the way `ry` turns +z. */
function bookRow(g: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, variant: number, ry = 0): THREE.Mesh {
  const key = `${w.toFixed(3)},${h.toFixed(3)}`;
  let geo = ROW_GEO.get(key);
  if (!geo) ROW_GEO.set(key, (geo = new THREE.PlaneGeometry(w, h)));
  const v = ((variant % 8) + 8) % 8;
  let mat = ROW_MAT.get(v);
  if (!mat) ROW_MAT.set(v, (mat = new THREE.MeshToonMaterial({ map: painted(`lib-spines-${v}`, 512, 128, paintSpines(v * 7919 + 13)), gradientMap: gradient, alphaTest: 0.5, side: THREE.DoubleSide })));
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y + h / 2, z);
  m.rotation.y = ry;
  m.receiveShadow = true;
  g.add(m);
  return m;
}
/** A book standing, its spine to +z with a 청구기호 label at its foot; its middle at the group's origin. */
function bookUp(g: THREE.Object3D, color: string, w = 0.034, h = SHELVE.tall, d = SHELVE.deep): THREE.Group {
  const b = new THREE.Group();
  g.add(b);
  part(b, box(w, h, d), color, 0, 0, 0);
  part(b, box(w * 0.86, 0.03, 0.002), '#fbfaf3', 0, -h / 2 + 0.036, d / 2 + 0.0015, { outline: false });
  for (let i = 0; i < 3; i++) part(b, box(w * 0.6, 0.003, 0.002), '#555555', 0, -h / 2 + 0.046 - i * 0.008, d / 2 + 0.003, { outline: false });
  part(b, box(w * 0.86, 0.006, 0.002), '#ffffff', 0, h / 2 - 0.025, d / 2 + 0.0015, { outline: false });
  part(b, box(0.004, h * 0.34, 0.002), '#ffffff', 0, h * 0.08, d / 2 + 0.0015, { outline: false });
  return b;
}
/** A book lying flat (its middle at the origin), its back cover up with the barcode and the library's stamp. */
function bookFlat(g: THREE.Object3D, color: string, w = 0.15, l = 0.21, th = 0.024): THREE.Group {
  const b = new THREE.Group();
  g.add(b);
  part(b, box(w, th, l), color, 0, 0, 0);
  part(b, box(w - 0.012, th - 0.006, 0.004), PAPER, 0.004, 0, l / 2 + 0.001, { outline: false });
  part(b, box(0.004, th - 0.006, l - 0.012), PAPER, w / 2 + 0.001, 0, 0, { outline: false });
  // The barcode label (등록번호) on the back cover.
  part(b, box(0.06, 0.002, 0.032), '#ffffff', -0.02, th / 2 + 0.001, -0.05, { outline: false });
  for (let i = 0; i < 7; i++) part(b, box(0.0025 + (i % 3) * 0.0015, 0.002, 0.02), '#222222', -0.044 + i * 0.008, th / 2 + 0.0015, -0.052, { outline: false });
  return b;
}

/** A book truck (북트럭): a steel frame on castors, three tiers sloping back, books along each, a push handle at +x. */
function bookTruck(g: THREE.Object3D, x: number, z: number, opts: { gapAt?: number; seed?: number; tag?: boolean } = {}) {
  const c = new THREE.Group();
  c.position.set(x, 0, z);
  g.add(c);
  const L = 0.72;
  const Dp = 0.38;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    part(c, cyl(0.035, 0.035, 0.03, 12), '#37474f', sx * (L / 2 - 0.05), 0.035, sz * (Dp / 2 - 0.05), { rx: Math.PI / 2 });
    rod(c, new THREE.Vector3(sx * (L / 2 - 0.03), 0.06, sz * (Dp / 2 - 0.03)), new THREE.Vector3(sx * (L / 2 - 0.03), 0.9, sz * (Dp / 2 - 0.03)), 0.014, STEEL_GREY);
  }
  const tiers = [0.14, 0.43, 0.72];
  tiers.forEach((y, i) => {
    part(c, rbox(L - 0.04, 0.02, Dp - 0.04, 0.006), '#cfd8dc', 0, y - 0.01, 0, { rx: -0.08 });
    // A lip at the low back edge the books lean on.
    part(c, box(L - 0.04, 0.05, 0.012), STEEL_GREY, 0, y + 0.01, -Dp / 2 + 0.03, { outline: false });
    if (i < 2) {
      bookRow(c, 0, y, 0.09, L - 0.08, 0.24, (opts.seed ?? 0) + i * 3);
      bookRow(c, 0, y, -0.09, L - 0.08, 0.24, (opts.seed ?? 0) + i * 3 + 1, Math.PI);
      part(c, box(L - 0.08, 0.18, 0.17), '#d8ccb4', 0, y + 0.09, 0, { outline: false });
    }
  });
  // The top tier's books one by one (spines to +z), leaving a gap where the one in hand came from.
  const r = seeded(31 + (opts.seed ?? 0));
  for (let bx = -0.3; bx <= 0.3; bx += 0.045) {
    if (opts.gapAt !== undefined && Math.abs(bx - opts.gapAt) < 0.03) continue;
    const h = 0.19 + r() * 0.05;
    const b = bookUp(c, SPINE_COLORS[Math.floor(r() * SPINE_COLORS.length)], 0.036, h, 0.17);
    b.position.set(bx, tiers[2] + h / 2, 0.0);
    b.rotation.z = (r() - 0.5) * 0.06;
  }
  // The push handle and a clipped card.
  rod(c, new THREE.Vector3(L / 2 - 0.03, 0.9, -Dp / 2 + 0.03), new THREE.Vector3(L / 2 + 0.07, 0.95, -Dp / 2 + 0.03), 0.012, STEEL_GREY);
  rod(c, new THREE.Vector3(L / 2 - 0.03, 0.9, Dp / 2 - 0.03), new THREE.Vector3(L / 2 + 0.07, 0.95, Dp / 2 - 0.03), 0.012, STEEL_GREY);
  rod(c, new THREE.Vector3(L / 2 + 0.07, 0.95, -Dp / 2 + 0.03), new THREE.Vector3(L / 2 + 0.07, 0.95, Dp / 2 - 0.03), 0.016, '#263238');
  if (opts.tag) label(c, '반납 도서', 0.16, 0.06, -L / 2 + 0.002, 0.62, 0, '#fff59d', '#5d4037', -Math.PI / 2);
  return c;
}

// ---------------------------------------------------------------------------------------------
// People drawn in (a borrower across the desk, a class on a visit, children on the story rug).

interface Look {
  top: string;
  bottom: string;
  hair?: string;
  cap?: string;
  bag?: string;
  skirt?: boolean;
  long?: boolean;
  ribbon?: string;
}
/** A head (the face to +z). */
function headOn(g: THREE.Object3D, look: Look, r: number): THREE.Group {
  const h = new THREE.Group();
  g.add(h);
  const hair = look.hair ?? HAIR;
  part(h, ball(r), SKIN, 0, 0, 0);
  part(h, ball(r * 1.06), hair, 0, r * 0.26, -r * 0.24);
  part(h, rbox(r * 1.7, r * 0.5, r * 0.5, r * 0.2), hair, 0, r * 0.62, r * 0.62, { rx: -0.3 });
  for (const sx of [-1, 1]) {
    part(h, ball(r * 0.12), '#2b2b30', sx * r * 0.34, 0, r * 0.94, { outline: false });
    part(h, ball(r * 0.13), '#f8a9b6', sx * r * 0.5, -r * 0.3, r * 0.8, { outline: false }).scale.set(1.2, 0.6, 0.4);
  }
  part(h, box(r * 0.26, r * 0.06, r * 0.04), '#c2185b', 0, -r * 0.46, r * 0.92, { outline: false });
  if (look.long) part(h, rbox(r * 1.9, r * 2.4, r * 0.7, r * 0.3), hair, 0, -r * 0.7, -r * 0.62);
  if (look.ribbon) for (const sx of [-1, 1]) part(h, ball(r * 0.24), look.ribbon, sx * r * 0.3, r * 0.75, -r * 0.95).scale.set(1.3, 0.8, 0.6);
  if (look.cap) {
    // A yellow field-trip cap, its brim forward.
    part(h, new THREE.SphereGeometry(r * 1.1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), look.cap, 0, r * 0.22, -r * 0.05).userData.ownGeometry = true;
    part(h, cyl(r * 0.9, r * 0.9, r * 0.08, 16), look.cap, 0, r * 0.3, r * 0.75).scale.set(0.9, 1, 0.6);
  }
  return h;
}
/** Someone standing (facing +z, the feet at the origin, `k` their size: 1 a grown-up), one arm that goes up. */
function standing(g: THREE.Object3D, x: number, z: number, yaw: number, k: number, look: Look) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = yaw;
  root.scale.setScalar(k);
  g.add(root);
  for (const sx of [-1, 1]) {
    rod(root, new THREE.Vector3(sx * 0.08, 0.8, 0), new THREE.Vector3(sx * 0.085, 0.08, 0.0), 0.055, look.skirt ? SKIN : look.bottom);
    part(root, rbox(0.09, 0.07, 0.18, 0.03), '#37474f', sx * 0.085, 0.035, 0.03);
  }
  if (look.skirt) part(root, cyl(0.17, 0.24, 0.32, 16), look.bottom, 0, 0.7, 0);
  part(root, rbox(0.3, 0.16, 0.2, 0.06), look.bottom, 0, 0.86, 0);
  part(root, rbox(0.32, 0.44, 0.2, 0.08), look.top, 0, 1.1, 0);
  part(root, cyl(0.04, 0.045, 0.08, 10), SKIN, 0, 1.35, 0, { outline: false });
  const head = headOn(root, look, 0.11);
  head.position.set(0, 1.47, 0.0);
  if (look.bag) {
    part(root, rbox(0.27, 0.32, 0.13, 0.05), look.bag, 0, 1.08, -0.16);
    for (const sx of [-1, 1]) part(root, box(0.03, 0.3, 0.012), look.bag, sx * 0.1, 1.16, 0.105, { outline: false });
  }
  const arm = (sx: number, raised: boolean) => {
    const grp = new THREE.Group();
    root.add(grp);
    const s = new THREE.Vector3(sx * 0.19, 1.27, 0);
    const e = raised ? new THREE.Vector3(sx * 0.24, 1.5, 0.04) : new THREE.Vector3(sx * 0.22, 1.02, 0.03);
    const w = raised ? new THREE.Vector3(sx * 0.22, 1.76, 0.08) : new THREE.Vector3(sx * 0.18, 0.86, 0.12);
    rod(grp, s, e, 0.042, look.top);
    rod(grp, e, w, 0.035, SKIN);
    part(grp, ball(0.04), SKIN, w.x, w.y, w.z, { outline: false });
    return grp;
  };
  arm(1, false);
  const down = arm(-1, false);
  const up = arm(-1, true);
  up.visible = false;
  return {
    root,
    head,
    raise(on: boolean) {
      up.visible = on;
      down.visible = !on;
    },
  };
}
/** A child sat cross-legged on the floor (facing +z), the hands on the knees; one hand that goes up, and a lean in. */
function floorKid(g: THREE.Object3D, x: number, z: number, yaw: number, look: Look, k = 0.62) {
  const root = new THREE.Group();
  root.position.set(x, 0, z);
  root.rotation.y = yaw;
  root.scale.setScalar(k);
  g.add(root);
  part(root, rbox(0.3, 0.12, 0.22, 0.05), look.bottom, 0, 0.07, 0);
  for (const sx of [-1, 1]) {
    // Thigh out to the knee, the shin back across under the other knee.
    rod(root, new THREE.Vector3(sx * 0.08, 0.07, 0.02), new THREE.Vector3(sx * 0.25, 0.07, 0.2), 0.065, look.bottom);
    rod(root, new THREE.Vector3(sx * 0.25, 0.06, 0.2), new THREE.Vector3(-sx * 0.05, 0.05, 0.27), 0.05, look.skirt ? SKIN : look.bottom);
    part(root, rbox(0.12, 0.06, 0.07, 0.025), '#eceff1', -sx * 0.1, 0.04, 0.28, { ry: sx * 0.3 });
  }
  if (look.skirt) part(root, rbox(0.42, 0.06, 0.36, 0.03), look.top, 0, 0.12, 0.08);
  const torso = new THREE.Group();
  torso.position.set(0, 0.12, 0);
  root.add(torso);
  part(torso, rbox(0.28, 0.36, 0.18, 0.08), look.top, 0, 0.2, 0);
  part(torso, cyl(0.04, 0.045, 0.06, 10), SKIN, 0, 0.41, 0, { outline: false });
  const head = headOn(torso, look, 0.12);
  head.position.set(0, 0.54, 0.0);
  const arm = (sx: number, raised: boolean) => {
    const grp = new THREE.Group();
    torso.add(grp);
    const s = new THREE.Vector3(sx * 0.16, 0.34, 0);
    const e = raised ? new THREE.Vector3(sx * 0.2, 0.58, 0.04) : new THREE.Vector3(sx * 0.21, 0.16, 0.08);
    const w = raised ? new THREE.Vector3(sx * 0.18, 0.82, 0.1) : new THREE.Vector3(sx * 0.2, 0.0, 0.22);
    rod(grp, s, e, 0.045, look.top);
    rod(grp, e, w, 0.036, SKIN);
    part(grp, ball(0.045), SKIN, w.x, w.y, w.z, { outline: false });
    return grp;
  };
  arm(1, false);
  const down = arm(-1, false);
  const up = arm(-1, true);
  up.visible = false;
  return {
    root,
    torso,
    head,
    raise(on: boolean) {
      up.visible = on;
      down.visible = !on;
    },
  };
}

// ---------------------------------------------------------------------------------------------
// What's painted: the screens, the signs, the picture book's pages.

const paintLoan: Paint = (c) => {
  c.fillStyle = '#f4f7f6';
  c.fillRect(0, 0, 512, 320);
  c.fillStyle = LIB_GREEN;
  c.fillRect(0, 0, 512, 30);
  text(c, '도서관리시스템 · 대출/반납', 12, 16, 15, '#ffffff');
  text(c, '시립 도서관', 500, 16, 12, '#c8e6c9', 'right');
  c.fillStyle = '#ffffff';
  c.fillRect(8, 38, 496, 70);
  text(c, '이용자', 18, 56, 13, '#607d8b');
  text(c, '김○○  (회원번호 2024-03817)', 80, 56, 14, '#263238');
  text(c, '대출 3 / 7권 · 연체 없음', 80, 84, 13, '#2e7d32', 'left', false);
  c.fillStyle = '#e8f5e9';
  c.fillRect(8, 116, 496, 24);
  text(c, '등록번호', 16, 128, 12, '#33691e');
  text(c, '서명', 130, 128, 12, '#33691e');
  text(c, '반납예정일', 420, 128, 12, '#33691e');
  const rows: Array<[string, string, string]> = [
    ['EM0081234', '아기 곰의 첫 소풍', '11.10'],
    ['EM0079911', '별을 세는 밤', '11.10'],
    ['EM0090457', '우리 동네 옛이야기', '11.10'],
    ['EM0066102', '처음 만나는 과학', '11.10'],
  ];
  rows.forEach(([n, s, d], i) => {
    c.fillStyle = i % 2 ? '#ffffff' : '#f9fbe7';
    c.fillRect(8, 142 + i * 30, 496, 30);
    text(c, n, 16, 157 + i * 30, 12, '#455a64', 'left', false);
    text(c, s, 130, 157 + i * 30, 13, '#263238', 'left', false);
    text(c, d, 420, 157 + i * 30, 12, '#455a64', 'left', false);
  });
  c.fillStyle = '#43a047';
  c.fillRect(380, 268, 124, 36);
  text(c, '대출 완료', 442, 286, 14, '#ffffff', 'center');
};
const paintMarc: Paint = (c) => {
  c.fillStyle = '#fdfdfb';
  c.fillRect(0, 0, 512, 320);
  c.fillStyle = '#37474f';
  c.fillRect(0, 0, 512, 30);
  text(c, 'KORMARC 목록 편집기', 12, 16, 15, '#ffffff');
  text(c, '신착 자료 18 / 40', 500, 16, 12, '#b0bec5', 'right');
  const rows: Array<[string, string]> = [
    ['020', '▾a 9788912345678 ▾g 77810'],
    ['056', '▾a 813.8 ▾2 6'],
    ['090', '▾a 813.8 ▾b 김51ㅂ'],
    ['245', '▾a 별을 세는 밤 / ▾d 김하늘 글'],
    ['260', '▾a 서울 : ▾b 한빛아이, ▾c 2026'],
    ['300', '▾a 48 p. : ▾b 천연색삽화 ; ▾c 26 cm'],
    ['650', '▾a 그림책'],
  ];
  rows.forEach(([tag, v], i) => {
    c.fillStyle = i % 2 ? '#ffffff' : '#f1f5f8';
    c.fillRect(8, 40 + i * 32, 496, 32);
    text(c, tag, 18, 56 + i * 32, 14, '#1565c0');
    text(c, v, 70, 56 + i * 32, 13, '#263238', 'left', false);
  });
  c.fillStyle = '#fff59d';
  c.fillRect(8, 268, 200, 40);
  text(c, '청구기호  813.8 김51ㅂ', 16, 288, 13, '#5d4037');
};
const paintScanView: Paint = (c) => {
  c.fillStyle = '#263238';
  c.fillRect(0, 0, 256, 176);
  c.fillStyle = OLD_PAPER;
  c.fillRect(20, 14, 104, 148);
  c.fillRect(132, 14, 104, 148);
  c.fillStyle = 'rgba(90,60,30,0.75)';
  for (let p = 0; p < 2; p++) for (let i = 0; i < 9; i++) c.fillRect(30 + p * 112 + i * 10, 26, 3, 120 - (i % 3) * 14);
  text(c, '향토자료 0412 · p.36-37', 128, 170, 10, '#b0bec5', 'center', false);
};
const paintOldPage: Paint = (c) => {
  c.fillStyle = OLD_PAPER;
  c.fillRect(0, 0, 128, 176);
  c.fillStyle = 'rgba(150,110,60,0.25)';
  c.fillRect(0, 0, 128, 6);
  c.fillRect(0, 170, 128, 6);
  c.fillStyle = 'rgba(70,45,25,0.8)';
  const r = seeded(77);
  for (let i = 0; i < 10; i++) for (let j = 0; j < 14; j++) if (r() > 0.12) c.fillRect(112 - i * 11, 14 + j * 11, 6, 6);
  c.strokeStyle = 'rgba(160,30,30,0.7)';
  c.lineWidth = 2;
  c.strokeRect(14, 120, 22, 22);
};
const paintKiosk: Paint = (c) => {
  c.fillStyle = '#f5f8fa';
  c.fillRect(0, 0, 256, 192);
  c.fillStyle = '#1565c0';
  c.fillRect(0, 0, 256, 26);
  text(c, '자료 검색 · Book Search', 10, 14, 13, '#ffffff');
  c.fillStyle = '#ffffff';
  c.strokeStyle = '#90a4ae';
  c.fillRect(10, 34, 236, 24);
  c.strokeRect(10, 34, 236, 24);
  text(c, '아기 곰', 18, 46, 13, '#263238', 'left', false);
  c.fillStyle = '#ffb300';
  c.fillRect(206, 36, 38, 20);
  text(c, '검색', 225, 46, 11, '#ffffff', 'center');
  const rows: Array<[string, string, string]> = [
    ['아기 곰의 첫 소풍', '유 813.8 이54ㅇ', '대출가능'],
    ['곰 세 마리', '유 811.8 박15ㄱ', '대출중'],
    ['아기 곰과 겨울잠', '유 813.8 최92ㅇ', '대출가능'],
  ];
  rows.forEach(([s, n, st], i) => {
    const y = 66 + i * 30;
    c.fillStyle = '#ffffff';
    c.fillRect(10, y, 236, 26);
    text(c, s, 16, y + 9, 11, '#263238');
    text(c, n, 16, y + 20, 10, '#607d8b', 'left', false);
    text(c, st, 240, y + 13, 10, st === '대출중' ? '#e53935' : '#2e7d32', 'right');
  });
  // The shelf map: the children's room lit.
  c.fillStyle = '#e3f2fd';
  c.fillRect(10, 160, 236, 26);
  c.fillStyle = '#90caf9';
  for (let i = 0; i < 6; i++) c.fillRect(16 + i * 24, 166, 18, 14);
  c.fillStyle = '#ff7043';
  c.fillRect(176, 164, 60, 18);
  text(c, '어린이자료실', 206, 173, 9, '#ffffff', 'center');
};
const paintKdc: Paint = (c) => {
  c.fillStyle = '#fffdf6';
  c.fillRect(0, 0, 192, 256);
  text(c, '한국십진분류법 KDC', 96, 18, 13, '#1b5e20', 'center');
  const rows = ['000 총류', '100 철학', '200 종교', '300 사회과학', '400 자연과학', '500 기술과학', '600 예술', '700 언어', '800 문학', '900 역사'];
  const cols = ['#ef9a9a', '#ce93d8', '#9fa8da', '#90caf9', '#80cbc4', '#a5d6a7', '#e6ee9c', '#ffe082', '#ffcc80', '#bcaaa4'];
  rows.forEach((s, i) => {
    c.fillStyle = cols[i];
    c.fillRect(12, 32 + i * 22, 168, 19);
    text(c, s, 20, 42 + i * 22, 12, '#3e2723', 'left', false);
  });
};
const paintBudget: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 192, 256);
  text(c, '2027 도서 구입 예산', 96, 18, 13, '#1b5e20', 'center');
  const rows: Array<[string, string]> = [['일반 도서', '18,400,000'], ['어린이 도서', '9,600,000'], ['정기간행물', '3,200,000'], ['전자책·DB', '6,500,000'], ['희망 도서', '2,300,000']];
  rows.forEach(([s, v], i) => {
    c.fillStyle = '#9e9e9e';
    c.fillRect(10, 52 + i * 30, 172, 1);
    text(c, s, 12, 40 + i * 30, 11, '#37474f', 'left', false);
    text(c, v, 180, 40 + i * 30, 11, '#263238', 'right', false);
  });
  text(c, '합계  40,000,000원', 180, 214, 12, '#c62828', 'right');
};
const paintSlip: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 128, 176);
  text(c, '자료 위치 안내', 64, 14, 11, '#1565c0', 'center');
  text(c, '우리 동네 옛이야기', 64, 36, 10, '#263238', 'center');
  text(c, '911.0 우294', 64, 58, 14, '#263238', 'center');
  text(c, '2층 종합자료실', 64, 78, 10, '#607d8b', 'center', false);
  c.fillStyle = '#e3f2fd';
  c.fillRect(10, 92, 108, 70);
  c.fillStyle = '#90caf9';
  for (let i = 0; i < 4; i++) c.fillRect(16 + i * 26, 100, 18, 44);
  c.fillStyle = '#ff7043';
  c.beginPath();
  c.arc(97, 122, 6, 0, Math.PI * 2);
  c.fill();
};
const paintCover: Paint = (c) => {
  c.fillStyle = '#1a237e';
  c.fillRect(0, 0, 128, 176);
  c.fillStyle = '#fff59d';
  for (const [x, y, r] of [[24, 30, 3], [96, 20, 2], [70, 50, 2.5], [40, 70, 2], [104, 76, 3]] as const) {
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = '#fff8e1';
  c.beginPath();
  c.arc(92, 44, 14, 0, Math.PI * 2);
  c.fill();
  text(c, '별을 세는 밤', 64, 112, 15, '#ffffff', 'center');
  text(c, '김하늘 글·그림', 64, 134, 10, '#c5cae9', 'center', false);
  c.fillStyle = '#ffca28';
  c.fillRect(8, 150, 112, 18);
  text(c, '이달의 추천 도서', 64, 159, 10, '#3e2723', 'center');
};
const paintReturnSign: Paint = (c) => {
  c.fillStyle = '#1565c0';
  c.fillRect(0, 0, 256, 128);
  text(c, '도서 반납함', 128, 36, 30, '#ffffff', 'center');
  text(c, 'BOOK RETURN', 128, 72, 18, '#bbdefb', 'center');
  c.fillStyle = '#ffeb3b';
  c.fillRect(40, 92, 176, 26);
  text(c, '24시간 반납 가능', 128, 105, 15, '#0d47a1', 'center');
};
const paintPoster: Paint = (c) => {
  c.fillStyle = '#fff3e0';
  c.fillRect(0, 0, 192, 256);
  c.fillStyle = '#ff7043';
  c.fillRect(0, 0, 192, 60);
  text(c, '작가와의 만남', 96, 30, 22, '#ffffff', 'center');
  c.fillStyle = '#ffe0b2';
  c.beginPath();
  c.arc(96, 112, 38, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#5d4037';
  c.beginPath();
  c.arc(96, 100, 20, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#f3cfb3';
  c.beginPath();
  c.arc(96, 108, 16, 0, Math.PI * 2);
  c.fill();
  text(c, '『아기 곰의 첫 소풍』 윤민결 작가', 96, 170, 10, '#4e342e', 'center');
  text(c, '11월 7일(토) 오후 2시', 96, 196, 13, '#bf360c', 'center');
  text(c, '어린이자료실 · 선착순 30명', 96, 220, 10, '#6d4c41', 'center', false);
};

/** The picture book's pages, two to a spread: 아기 곰의 첫 소풍 (an outing, a rabbit met, a stream, a picnic, a rainbow, home). */
const STORY = [
  '아기 곰이 가방을 메고 집을 나섰어요.',
  '숲길에서 토끼를 만났어요.',
  '"같이 가자!" 둘이 나란히 걸었어요.',
  '냇물을 폴짝 건넜어요.',
  '언덕 위에서 도시락을 나눠 먹었어요.',
  '와, 하늘에 무지개가 떴어요!',
  '해가 지자 집으로 돌아왔어요.',
  '"엄마, 오늘 정말 재밌었어요!" 끝',
];
const SKY = ['#bbdefb', '#c8e6c9', '#c8e6c9', '#b3e5fc', '#fff9c4', '#e1f5fe', '#ffccbc', '#fff3e0'];
function bear(c: CanvasRenderingContext2D, x: number, y: number, s: number) {
  c.fillStyle = '#8d6e63';
  for (const [dx, dy, r] of [[0, 0, 22], [0, -30, 17], [-13, -44, 7], [13, -44, 7]] as const) {
    c.beginPath();
    c.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = '#d7ccc8';
  c.beginPath();
  c.arc(x, y - 25 * s, 7 * s, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#3e2723';
  for (const dx of [-6, 6]) c.fillRect(x + dx * s - 1.5, y - 34 * s, 3, 3);
}
function rabbit(c: CanvasRenderingContext2D, x: number, y: number, s: number) {
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.arc(x, y, 15 * s, 0, Math.PI * 2);
  c.arc(x, y - 22 * s, 11 * s, 0, Math.PI * 2);
  c.fill();
  c.fillRect(x - 8 * s, y - 50 * s, 5 * s, 22 * s);
  c.fillRect(x + 3 * s, y - 50 * s, 5 * s, 22 * s);
  c.fillStyle = '#f48fb1';
  c.fillRect(x - 1.5, y - 22 * s, 3, 3);
}
function storyPage(i: number): Paint {
  return (c) => {
    c.fillStyle = SKY[i];
    c.fillRect(0, 0, 160, 220);
    c.fillStyle = '#9ccc65';
    c.beginPath();
    c.ellipse(80, 200, 120, 60, 0, 0, Math.PI * 2);
    c.fill();
    if (i === 5) {
      ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa'].forEach((k, j) => {
        c.strokeStyle = k;
        c.lineWidth = 6;
        c.beginPath();
        c.arc(80, 140, 70 - j * 6, Math.PI, Math.PI * 2);
        c.stroke();
      });
    } else if (i === 3) {
      c.fillStyle = '#4fc3f7';
      c.fillRect(0, 140, 160, 24);
    } else if (i === 6) {
      c.fillStyle = '#ff8a65';
      c.beginPath();
      c.arc(130, 60, 22, 0, Math.PI * 2);
      c.fill();
    } else {
      c.fillStyle = '#fdd835';
      c.beginPath();
      c.arc(128, 36, 16, 0, Math.PI * 2);
      c.fill();
    }
    if (i === 0 || i === 7) {
      c.fillStyle = '#ffcc80';
      c.fillRect(14, 96, 52, 46);
      c.fillStyle = '#d84315';
      c.beginPath();
      c.moveTo(8, 98);
      c.lineTo(40, 70);
      c.lineTo(72, 98);
      c.fill();
    }
    if (i === 1 || i === 2 || i === 4) {
      c.fillStyle = '#2e7d32';
      c.beginPath();
      c.arc(26, 96, 22, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#6d4c41';
      c.fillRect(22, 112, 8, 34);
    }
    bear(c, i === 0 ? 104 : 70, 150, i === 4 ? 0.9 : 1);
    if (i >= 1 && i <= 5) rabbit(c, 116, 156, 0.9);
    if (i === 4) {
      c.fillStyle = '#ffffff';
      c.fillRect(70, 166, 40, 10);
      c.fillStyle = '#ef5350';
      c.fillRect(74, 162, 10, 6);
    }
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.fillRect(6, 186, 148, 28);
    const s = STORY[i];
    const cut = s.length > 12 ? s.lastIndexOf(' ', 13) : -1;
    if (cut > 0) {
      text(c, s.slice(0, cut), 80, 194, 11, '#3e2723', 'center', false);
      text(c, s.slice(cut + 1), 80, 207, 11, '#3e2723', 'center', false);
    } else text(c, s, 80, 200, 11, '#3e2723', 'center', false);
  };
}
const pageTex = (i: number) => painted(`lib-story-${i % 8}`, 160, 220, storyPage(i % 8));
const paintRug: Paint = (c) => {
  c.fillStyle = '#fff3d6';
  c.fillRect(0, 0, 512, 256);
  const band = ['#ef5350', '#ffa726', '#ffee58', '#66bb6a', '#42a5f5', '#ab47bc'];
  band.forEach((k, i) => {
    c.strokeStyle = k;
    c.lineWidth = 7;
    c.strokeRect(8 + i * 7, 8 + i * 7, 496 - i * 14, 240 - i * 14);
  });
  const letters = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  letters.forEach((s, i) => {
    const x = 92 + (i % 7) * 55;
    const y = 96 + Math.floor(i / 7) * 68;
    c.fillStyle = band[i % band.length];
    c.fillRect(x - 20, y - 20, 40, 40);
    text(c, s, x, y + 2, 26, '#ffffff', 'center');
  });
};
let rugMat: THREE.Material | null = null;
const KID_LOOKS: Look[] = [
  { top: '#ef5350', bottom: '#455a64', hair: '#3b2a20', long: true, ribbon: '#ffeb3b' },
  { top: '#42a5f5', bottom: '#37474f', hair: '#2f2219' },
  { top: '#ffca28', bottom: '#5c6bc0', hair: '#4e342e', skirt: true, long: true },
  { top: '#66bb6a', bottom: '#455a64', hair: '#212121' },
  { top: '#ab47bc', bottom: '#f48fb1', hair: '#3e2723', skirt: true, ribbon: '#ff80ab' },
];
const STAMP_RANGES: Array<[string, string]> = [
  ['000 총류', '001 – 099'],
  ['100 철학 · 200 종교', '100 – 299'],
  ['300 사회과학', '300 – 399'],
  ['400 자연과학', '400 – 499'],
  ['500 기술과학', '500 – 599'],
  ['600 예술 · 700 언어', '600 – 799'],
  ['800 문학', '810 – 813.6'],
  ['800 문학', '813.7 – 899'],
  ['900 역사', '900 – 999'],
];
let stackCount = 0;

/** The librarian's swivel chair, facing `yaw` from (x, z), its seat's top at `y`. */
function swivel(g: THREE.Object3D, x: number, z: number, y: number, yaw: number, color = LIB_GREEN) {
  const c = new THREE.Group();
  c.position.set(x, 0, z);
  c.rotation.y = yaw;
  g.add(c);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    rod(c, new THREE.Vector3(0, 0.06, 0), new THREE.Vector3(Math.sin(a) * 0.25, 0.04, Math.cos(a) * 0.25), 0.015, '#424242');
    part(c, ball(0.025), '#212121', Math.sin(a) * 0.25, 0.025, Math.cos(a) * 0.25, { outline: false });
  }
  part(c, cyl(0.025, 0.025, y - 0.1, 10), CHROME, 0, (y - 0.04) / 2, 0, { outline: false });
  part(c, rbox(0.46, 0.07, 0.44, 0.03), color, 0, y - 0.035, 0);
  part(c, rbox(0.44, 0.44, 0.06, 0.04), color, 0, y + 0.3, -0.23, { rx: -0.08 });
  return c;
}

/** The barcode scanner (its window to +z, the grip below); returns it and its red window. */
function scannerGun(g: THREE.Object3D) {
  const s = new THREE.Group();
  g.add(s);
  part(s, rbox(0.055, 0.045, 0.1, 0.015), '#37474f', 0, 0.0, 0.03);
  part(s, rbox(0.032, 0.09, 0.04, 0.012), '#263238', 0, -0.05, -0.0, { rx: 0.35 });
  part(s, box(0.012, 0.016, 0.02), '#ffb300', 0, -0.012, 0.035, { outline: false });
  const win = glowing(s, box(0.042, 0.03, 0.004), '#ff1744', 0, 0, 0.081);
  win.visible = false;
  part(s, box(0.044, 0.032, 0.003), '#4a1d1d', 0, 0, 0.0795, { outline: false });
  return { s, win };
}

/** A monitor on its stand, facing +z, the face lit while used; returns the screen. */
function monitor(g: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, tex: THREE.Texture, ry = 0): THREE.Mesh {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  g.add(m);
  part(m, rbox(0.18, 0.012, 0.13, 0.005), BLACK, 0, 0.006, -0.02);
  part(m, box(0.035, h * 0.45, 0.025), BLACK, 0, h * 0.25, -0.03, { outline: false });
  part(m, rbox(w + 0.03, h + 0.03, 0.03, 0.01), BLACK, 0, h * 0.45 + h / 2, -0.005);
  return litScreen(m, tex, w, h, 0, h * 0.45 + h / 2, 0.012);
}

export const BUILDERS: Record<string, Builder> = {
  /**
   * The loan desk (대출·반납 데스크, a 2-tile counter): an oak desk with its name across the front
   * for whoever comes up to it, the book drop (도서 반납) on its left end with a canvas bin under it
   * full of returns, an acrylic sign; behind it the librarian's swivel chair, the loan system on the
   * monitor (the borrower's card, the books, the due dates), the RFID pad, the barcode scanner in its
   * cradle, the keyboard, the receipt printer and the date stamp. Lending (checkoutBooks): sat, the
   * top book taken off the borrower's pile, laid on the pad, the scanner off its cradle and aimed —
   * beep — and the book slid across to the borrower, drawn stood across the desk with a backpack;
   * then a few keys. The field-trip alarm: stood behind the desk talking to a class in yellow caps
   * lined up across it, books in their arms, a hand going up. The budget (lead): sat writing on the
   * budget sheet with the calculator.
   */
  circulationDesk(g, W, _D, _c, _def, _ctx, out) {
    const top = 0.76;
    const z0 = -0.44;
    const z1 = 0.34;
    const zc = (z0 + z1) / 2;
    const half = W / 2 - 0.03;
    part(g, rbox(W - 0.06, 0.04, z1 - z0, 0.012), OAK, 0, top - 0.02, zc);
    // The front (to the borrowers): a panel down to the floor with the desk's name on a band.
    part(g, rbox(W - 0.06, top - 0.06, 0.04, 0.01), OAK_DARK, 0, (top - 0.06) / 2, z0 + 0.02);
    part(g, box(W - 0.1, 0.14, 0.006), CREAM, 0, 0.52, z0 - 0.002, { outline: false });
    label(g, '대출 · 반납', 0.6, 0.11, 0.35, 0.52, z0 - 0.006, CREAM, LIB_GREEN, Math.PI);
    label(g, 'CIRCULATION', 0.4, 0.06, -0.3, 0.52, z0 - 0.006, CREAM, '#6d8f7a', Math.PI);
    part(g, box(W - 0.1, 0.06, 0.006), '#0b0b0b', 0, 0.04, z0 - 0.002, { outline: false });
    for (const sx of [-1, 1]) part(g, rbox(0.04, top - 0.06, z1 - z0 - 0.04, 0.01), OAK_DARK, sx * (half - 0.02), (top - 0.06) / 2, zc);
    // A drawer pedestal (the date stamps, the cards) between the bin and the knees.
    part(g, rbox(0.32, top - 0.08, 0.56, 0.01), CREAM, -0.18, (top - 0.08) / 2, zc + 0.06);
    for (let i = 0; i < 3; i++) {
      part(g, box(0.28, 0.003, 0.004), '#bdb5a3', -0.18, 0.2 + i * 0.18, z1 - 0.01, { outline: false });
      part(g, box(0.08, 0.012, 0.012), STEEL, -0.18, 0.28 + i * 0.18, z1 - 0.005, { outline: false });
    }
    // The book drop on the left end: the slot to the borrowers' side, the chute down to a canvas bin of returns.
    const dx = -0.7;
    part(g, rbox(0.44, 0.3, 0.3, 0.02), OAK, dx, top + 0.15, -0.27);
    part(g, box(0.32, 0.045, 0.01), '#1b1b1b', dx, top + 0.18, -0.425, { outline: false });
    part(g, box(0.34, 0.012, 0.03), STEEL, dx, top + 0.21, -0.43, { rx: 0.4 });
    label(g, '도서 반납', 0.3, 0.07, dx, top + 0.09, -0.4225, OAK, '#ffffff', Math.PI);
    label(g, 'BOOK RETURN', 0.24, 0.035, dx, top + 0.255, -0.4225, OAK, '#fff3e0', Math.PI);
    const bin = new THREE.Group();
    bin.position.set(dx, 0, 0.08);
    g.add(bin);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(bin, cyl(0.022, 0.022, 0.02, 10), '#212121', sx * 0.17, 0.025, sz * 0.15, { rx: Math.PI / 2 });
    part(bin, rbox(0.42, 0.42, 0.38, 0.03), '#5c6bc0', 0, 0.26, 0);
    part(bin, box(0.38, 0.02, 0.34), '#3f4a9a', 0, 0.47, 0, { outline: false });
    const rb = seeded(5);
    for (let i = 0; i < 6; i++) {
      const b = bookFlat(bin, bookColor(i * 3 + 2), 0.13, 0.19, 0.022);
      b.position.set(-0.1 + rb() * 0.2, 0.48 + i * 0.012, -0.08 + rb() * 0.16);
      b.rotation.set((rb() - 0.5) * 0.6, rb() * Math.PI, (rb() - 0.5) * 0.5);
    }
    // The acrylic sign on the borrowers' edge.
    part(g, box(0.22, 0.012, 0.06), '#e0f2f1', 0.82, top + 0.006, -0.38, { outline: false });
    glass(g, box(0.22, 0.14, 0.006), 0.82, top + 0.08, -0.38);
    label(g, '회원증을 보여 주세요', 0.2, 0.045, 0.82, top + 0.09, -0.384, '#ffffff', LIB_GREEN, Math.PI);

    // The librarian's place: the chair, the RFID pad straight ahead, the scanner's cradle at the right.
    const x0 = 0.35;
    const seatY = 0.48;
    const seatZ = 0.57;
    const yaw = Math.PI;
    swivel(g, x0, seatZ + 0.02, seatY, yaw);
    const W0 = new THREE.Vector3(x0, top + 0.005, 0.12);
    const F = framer(W0, yaw);
    const D = DESK_BOOKS;
    const padAt = marker(g, W0.x, W0.y, W0.z);
    part(g, rbox(0.26, 0.012, 0.2, 0.006), '#cfd8dc', W0.x, top + 0.006, W0.z);
    label(g, '))) RFID', 0.12, 0.03, W0.x, top + 0.0125, W0.z - 0.07, '#cfd8dc', '#546e7a').rotation.set(-Math.PI / 2, 0, Math.PI);
    const kb = F(D.keys);
    part(g, rbox(0.36, 0.018, 0.13, 0.006), '#37474f', kb.x, top + 0.009, kb.z);
    part(g, rbox(0.06, 0.02, 0.09, 0.02), '#37474f', kb.x - 0.26, top + 0.01, kb.z);
    const screen = monitor(g, x0 - 0.05, top, -0.3, 0.46, 0.27, painted('lib-loan', 512, 320, paintLoan));
    out.screen = screen;
    const cr = F(D.cradle);
    part(g, rbox(0.08, 0.03, 0.1, 0.01), '#263238', cr.x, top + 0.015, cr.z);
    // The receipt printer with a slip out of it, the date stamp and its pad, a pot of pencils.
    part(g, rbox(0.14, 0.1, 0.16, 0.02), '#eceff1', 0.86, top + 0.05, -0.22);
    part(g, box(0.07, 0.002, 0.08), PAPER, 0.86, top + 0.101, -0.13, { rx: -0.6, outline: false });
    part(g, cyl(0.03, 0.035, 0.07, 12), '#6d4c41', -0.12, top + 0.035, -0.22);
    part(g, box(0.05, 0.03, 0.05), '#212121', -0.12, top + 0.085, -0.22, { outline: false });
    part(g, rbox(0.1, 0.015, 0.07, 0.005), '#1a237e', -0.24, top + 0.008, -0.2);
    part(g, cyl(0.035, 0.035, 0.09, 12), '#a1887f', -0.32, top + 0.045, -0.3);
    for (let i = 0; i < 4; i++) rod(g, new THREE.Vector3(-0.32 + (i - 1.5) * 0.012, top + 0.08, -0.3), new THREE.Vector3(-0.32 + (i - 1.5) * 0.02, top + 0.17, -0.31 + (i % 2) * 0.02), 0.004, ['#ffca28', '#e53935', '#1e88e5', '#43a047'][i]);
    // The pile handed over (two under the one that moves).
    const pile = F(D.pile);
    for (let i = 0; i < 2; i++) bookFlat(g, bookColor(i + 7), 0.15, 0.21, 0.024).position.set(pile.x + (i - 0.5) * 0.01, top + 0.012 + i * 0.024, pile.z);

    // What moves: the book on its way through and the scanner; at rest, the next book on the pile and the scanner in its cradle.
    const idle = new THREE.Group();
    g.add(idle);
    out.idle = idle;
    bookFlat(idle, bookColor(3), 0.15, 0.21, 0.024).position.set(pile.x, top + 0.06, pile.z);
    const restGun = scannerGun(idle);
    aim(restGun.s, cr.clone().setY(top + 0.11), cr.clone().setY(top));
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const moving = bookFlat(use, bookColor(0));
    const gun = scannerGun(use);
    const beam = glowing(use, box(0.07, 0.003, 0.004), '#ff1744', 0, 0, 0);
    // The borrower across the desk; a class on a visit; the budget papers.
    const borrower = standing(use, x0 + 0.05, -0.85, 0, 1, { top: '#5c6bc0', bottom: '#37474f', hair: '#3e2723', bag: '#ef6c00' });
    const kids = [-0.8, -0.4, 0, 0.4, 0.8].map((x, i) =>
      standing(use, x, -0.8 - (i % 2) * 0.22, (-x * 0.2), 0.72, { ...KID_LOOKS[i], cap: '#fdd835', bag: ['#e53935', '#1e88e5', '#43a047', '#8e24aa', '#fb8c00'][i] }),
    );
    // Each child hugging a book to the chest.
    kids.forEach((k, i) => {
      const b = bookFlat(k.root, bookColor(i + 4), 0.15, 0.2, 0.025);
      b.position.set(0, 1.0, 0.13);
      b.rotation.x = -1.3;
    });
    const papers = new THREE.Group();
    use.add(papers);
    const sheetAt = F(bo(0.02, 0.003, -0.06));
    picture(papers, painted('lib-budget', 192, 256, paintBudget), 0.2, 0.27, sheetAt.x, top + 0.003, sheetAt.z, '#ffffff', 0, -Math.PI / 2).rotation.set(-Math.PI / 2, 0, Math.PI + 0.1);
    part(papers, rbox(0.09, 0.015, 0.14, 0.008), '#455a64', sheetAt.x - 0.2, top + 0.008, sheetAt.z - 0.02);
    part(papers, box(0.07, 0.003, 0.03), '#a5d6a7', sheetAt.x - 0.2, top + 0.017, sheetAt.z - 0.06, { outline: false });
    const sheet = marker(g, sheetAt.x, top + 0.005, sheetAt.z);

    const sit = () => spot(g, 'sit', x0, seatY, seatZ, yaw, seatY);
    const spots: Record<string, Spot> = {
      checkoutBooks: at(sit(), padAt, 'checkout'),
      fieldTripClass: at(spot(g, 'stand', x0 - 0.3, 0, 0.52, yaw), undefined, 'gesture'),
      librarian_planBudget: at(sit(), sheet, 'write'),
      '*': at(sit(), padAt, 'checkout'),
    };
    out.spots = spots;
    out.seat = marker(g, x0, seatY, seatZ);
    out.work = padAt;
    const v = new THREE.Vector3();
    const w2 = new THREE.Vector3();
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const lending = now === 'checkoutBooks' || now === '*';
      borrower.root.visible = lending;
      for (const k of kids) k.root.visible = now === 'fieldTripClass';
      papers.visible = now === 'librarian_planBudget';
      if (now === 'fieldTripClass') kids.forEach((k, i) => k.raise(wave(t, 0.09, i * 0.37) > 0.82));
      const sp = now ? spots[now] : null;
      const ph = sp ? phaseAt(sp) : 0;
      const k = checkoutRound(lending ? t : 0, ph);
      moving.visible = lending;
      gun.s.visible = lending;
      if (lending) {
        const n = Math.floor(t / 9 + ph);
        (moving.children[0] as THREE.Mesh).material = toon(bookColor(n));
        moving.position.copy(F(k.book, v));
        moving.rotation.y = yaw + 0.15 * Math.sin(n * 1.7);
        if (k.gun) aim(gun.s, F(k.r, v).add(new THREE.Vector3(0, 0.05, 0)), F(k.book, w2));
        else aim(gun.s, cr.clone().setY(top + 0.11), cr.clone().setY(top));
        gun.win.visible = beam.visible = k.beam;
        beam.position.copy(F(k.book, v)).add(new THREE.Vector3(0, 0.016, 0));
        beam.rotation.y = yaw;
      } else beam.visible = false;
      idle.visible = !lending;
    };
  },

  /**
   * The stacks (도서관 서가, a 2-tile run): cream steel shelving in two bays between oak end panels,
   * five shelves of books with a 청구기호 label at the foot of every spine, label strips on the shelf
   * edges, the 분류 range on the cornice and on the end panel; standing free, it's double-sided.
   * Shelving (shelveBooks): stood at the left bay with the book truck at the right hand, each book taken
   * off the truck, its label read, and slid into its gap — at the top, at the chest, or squatting to
   * the bottom shelf — the left hand parting the books beside it. Learning the call numbers (junior):
   * stood tracing the labels along the shelf.
   */
  libraryStacks(g, W, _D, _c, _def, ctx, out) {
    const n = stackCount++;
    const [range, sub] = STAMP_RANGES[n % STAMP_RANGES.length];
    const both = !ctx.againstWall;
    const depth = both ? 0.56 : 0.34;
    const zBack = both ? -depth / 2 : -0.5;
    const zF = zBack + depth;
    const zm = zBack + depth / 2;
    const wu = W - 0.08;
    const topY = 1.8;
    // The end panels (oak) and the middle upright, the back, the base and the cornice.
    for (const sx of [-1, 1]) part(g, rbox(0.04, topY, depth + 0.02, 0.01), OAK, sx * (wu / 2 + 0.02), topY / 2, zm);
    part(g, box(0.025, topY - 0.08, depth - 0.02), STACK, 0, topY / 2, zm);
    if (!both) part(g, box(wu, topY - 0.06, 0.012), '#d9d4c7', 0, topY / 2, zBack + 0.006, { outline: false });
    else part(g, box(wu, topY - 0.06, 0.012), '#d9d4c7', 0, topY / 2, zm, { outline: false });
    part(g, box(wu, 0.08, depth), '#9e9688', 0, 0.04, zm);
    part(g, rbox(wu + 0.12, 0.08, depth + 0.06, 0.012), OAK, 0, topY + 0.04, zm);
    const faces = both ? [1, -1] : [1];
    for (const f of faces) {
      const zf = f > 0 ? zF : zBack;
      label(g, `${range}   ${sub}`, 0.86, 0.065, 0, topY + 0.04, zf + f * 0.032, OAK, '#ffffff', f > 0 ? 0 : Math.PI);
    }
    // The end panel's sign (on the +x end).
    part(g, box(0.004, 0.26, 0.24), '#ffffff', wu / 2 + 0.042, 1.3, zm, { outline: false });
    label(g, range, 0.22, 0.06, wu / 2 + 0.045, 1.37, zm, '#ffffff', LIB_GREEN, Math.PI / 2);
    label(g, sub, 0.2, 0.05, wu / 2 + 0.045, 1.27, zm, '#ffffff', '#37474f', Math.PI / 2);
    // The shelves: boards, label strips, and the books.
    const bayW = wu / 2 - 0.03;
    SHELVE.levels.forEach((y, li) => {
      part(g, box(wu, 0.02, depth - 0.02), STACK, 0, y - 0.01, zm);
      for (const f of faces) {
        const zf = f > 0 ? zF : zBack;
        for (const bx of [-1, 1]) {
          const x = bx * (wu / 4);
          part(g, box(bayW - 0.04, 0.022, 0.004), '#ffffff', x, y - 0.012, zf + f * 0.001, { outline: false });
          label(g, `${sub.split(' ')[0]}`, 0.08, 0.016, x - bayW / 2 + 0.08, y - 0.012, zf + f * 0.004, '#ffffff', '#455a64', f > 0 ? 0 : Math.PI);
          bookRow(g, x, y, zf - f * 0.012, bayW, 0.25, n * 5 + li * 2 + bx + (f > 0 ? 0 : 3), f > 0 ? 0 : Math.PI);
          part(g, box(bayW, 0.19, SHELVE.deep - 0.03), '#d8ccb4', x, y + 0.095, zf - f * (0.012 + SHELVE.deep / 2), { outline: false });
        }
      }
    });

    // The librarian at the left bay, facing the shelves; the work point on their face.
    const yaw = Math.PI;
    const x0 = -wu / 4;
    const W0 = new THREE.Vector3(x0, SHELVE.base, zF);
    const F = framer(W0, yaw);
    const workAt = marker(g, W0.x, W0.y, W0.z);
    const labelsAt = marker(g, x0, SHELVE.levels[2] - 0.012, zF + 0.01);
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    // The truck at the right hand: its middle beside the shelves, the gap where the book came from.
    const cart = F(bo(-0.6, 0, -0.2));
    const pick = F(SHELVE.cart);
    const truck = bookTruck(use, cart.x, cart.z, { gapAt: pick.x - cart.x, seed: n });
    const book = bookUp(use, bookColor(0));
    book.rotation.y = yaw + Math.PI;
    const gap = part(use, box(0.036, 0.235, 0.014), '#2a2420', 0, 0, 0, { outline: false });
    const stand = () => spot(g, 'stand', x0, 0, zF + 0.42, yaw);
    const spots: Record<string, Spot> = {
      shelveBooks: at(stand(), workAt, 'shelve'),
      librarian_learnShelving: at(stand(), labelsAt, 'board'),
      '*': at(stand(), workAt, 'shelve'),
    };
    out.spots = spots;
    out.work = workAt;
    const v = new THREE.Vector3();
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const shelving = now !== null && now !== 'librarian_learnShelving';
      truck.visible = book.visible = shelving;
      gap.visible = false;
      if (!shelving) return;
      const k = shelveRound(t, phaseAt(spots[now!]));
      (book.children[0] as THREE.Mesh).material = toon(bookColor(k.n));
      book.position.copy(F(k.book, v));
      // The gap it goes in, dark between the spines till it's home.
      gap.visible = !k.shelved;
      gap.position.copy(F(shelfBook(k.slot, -0.006), v));
    };
  },

  /**
   * The cataloguing desk (목록 작업 PC): a desk against the wall with the KORMARC record on the monitor
   * (020 ISBN, 056 분류기호 813.8, 090 청구기호, 245 서명…), the KDC table pinned over it, a pile of new
   * books with 신착 slips at the left, the catalogued ones at the right, a barcode scanner, and the label
   * printer feeding out a strip of call-number labels. Cataloguing: sat, each new book taken, laid down,
   * its ISBN scanned, then onto the done pile; the search system and the collection list: sat typing.
   */
  catalogStation(g, _W, _D, _c, _def, ctx, out) {
    const top = 0.74;
    const z0 = -0.47;
    const z1 = 0.24;
    part(g, rbox(0.94, 0.035, z1 - z0, 0.01), OAK, 0, top - 0.0175, (z0 + z1) / 2);
    for (const sx of [-1, 1]) part(g, rbox(0.03, top - 0.04, z1 - z0 - 0.04, 0.01), OAK_DARK, sx * 0.44, (top - 0.04) / 2, (z0 + z1) / 2);
    part(g, box(0.86, 0.3, 0.02), OAK_DARK, 0, top - 0.2, z0 + 0.04, { outline: false });
    if (ctx.againstWall) {
      // The cork board with the KDC table and a few notes.
      part(g, rbox(0.7, 0.46, 0.025, 0.01), '#b08d57', 0, 1.36, -0.49);
      picture(g, painted('lib-kdc', 192, 256, paintKdc), 0.24, 0.32, -0.18, 1.36, -0.475);
      for (const [x, y, k] of [[0.08, 1.46, '#fff59d'], [0.2, 1.3, '#b3e5fc'], [0.12, 1.24, '#f8bbd0']] as const) part(g, box(0.1, 0.1, 0.003), k, x, y, -0.476, { rz: (x - 0.12) * 1.5, outline: false });
      label(g, '이번 주 신착 40권', 0.26, 0.05, 0.16, 1.54, -0.475, '#ffffff', '#c62828');
    }
    const yaw = Math.PI;
    const seatY = 0.48;
    const seatZ = 0.47;
    swivel(g, 0, seatZ + 0.02, seatY, yaw, '#546e7a');
    const W0 = new THREE.Vector3(0, top + 0.005, 0.0);
    const F = framer(W0, yaw);
    const D = DESK_BOOKS;
    const padAt = marker(g, W0.x, W0.y, W0.z);
    const kb = F(D.keys);
    const keysAt = marker(g, kb.x, top + 0.02, kb.z);
    part(g, rbox(0.36, 0.018, 0.13, 0.006), '#37474f', kb.x, top + 0.009, kb.z);
    part(g, rbox(0.06, 0.02, 0.09, 0.02), '#37474f', kb.x - 0.25, top + 0.01, kb.z);
    out.screen = monitor(g, 0, top, -0.36, 0.46, 0.28, painted('lib-marc', 512, 320, paintMarc));
    const cr = F(D.cradle);
    part(g, rbox(0.08, 0.03, 0.1, 0.01), '#263238', cr.x, top + 0.015, cr.z);
    // The label printer at the back right, a strip of labels out of its mouth.
    part(g, rbox(0.13, 0.11, 0.16, 0.03), '#eceff1', 0.34, top + 0.055, -0.38);
    part(g, box(0.06, 0.006, 0.004), '#263238', 0.34, top + 0.07, -0.299, { outline: false });
    glowing(g, ball(0.006), '#69f0ae', 0.38, top + 0.1, -0.3);
    const strip = new THREE.Group();
    strip.position.set(0.34, top + 0.07, -0.3);
    g.add(strip);
    const stripBody = part(strip, box(0.05, 0.002, 1), '#ffffff', 0, 0, 0.5, { outline: false, rx: 0.3 });
    // The new books (신착, yellow slips) at the left and the catalogued ones at the right.
    const pile = F(D.pile);
    for (let i = 0; i < 3; i++) {
      bookFlat(g, bookColor(i * 5 + 1), 0.15, 0.21, 0.024).position.set(pile.x, top + 0.012 + i * 0.024, pile.z);
      part(g, box(0.03, 0.002, 0.06), '#ffeb3b', pile.x + 0.04, top + 0.024 + i * 0.024, pile.z + 0.12, { outline: false });
    }
    const done = F(D.done);
    for (let i = 0; i < 2; i++) bookFlat(g, bookColor(i * 4 + 9), 0.15, 0.21, 0.024).position.set(done.x, top + 0.012 + i * 0.024, done.z);
    const idle = new THREE.Group();
    g.add(idle);
    out.idle = idle;
    const restGun = scannerGun(idle);
    aim(restGun.s, cr.clone().setY(top + 0.11), cr.clone().setY(top));
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const moving = bookFlat(use, bookColor(2));
    const slip = part(moving, box(0.03, 0.002, 0.06), '#ffeb3b', 0.04, 0.013, 0.12, { outline: false });
    const gun = scannerGun(use);
    const beam = glowing(use, box(0.07, 0.003, 0.004), '#ff1744', 0, 0, 0);
    const sit = () => spot(g, 'sit', 0, seatY, seatZ, yaw, seatY);
    const spots: Record<string, Spot> = {
      catalogBooks: at(sit(), padAt, 'catalogue'),
      librarian_buildDatabase: at(sit(), keysAt, 'type'),
      librarian_collectionList: at(sit(), keysAt, 'type'),
      '*': at(sit(), padAt, 'catalogue'),
    };
    out.spots = spots;
    out.seat = marker(g, 0, seatY, seatZ);
    out.work = padAt;
    const v = new THREE.Vector3();
    const w2 = new THREE.Vector3();
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const cataloguing = now === 'catalogBooks' || now === '*';
      moving.visible = gun.s.visible = cataloguing;
      idle.visible = !cataloguing;
      // A label printed every few seconds (the strip runs out and is torn off).
      stripBody.scale.z = 0.02 + 0.06 * (((t / 6) % 1 + 1) % 1);
      stripBody.position.z = stripBody.scale.z / 2;
      if (!cataloguing) {
        beam.visible = false;
        return;
      }
      const ph = phaseAt(spots[now!]);
      const k = checkoutRound(t, ph, true);
      moving.position.copy(F(k.book, v));
      moving.rotation.y = yaw + 0.1;
      // The slip comes out as it's catalogued.
      slip.visible = k.u < 0.6;
      if (k.gun) aim(gun.s, F(k.r, v).add(new THREE.Vector3(0, 0.05, 0)), F(k.book, w2));
      else aim(gun.s, cr.clone().setY(top + 0.11), cr.clone().setY(top));
      gun.win.visible = beam.visible = k.beam;
      beam.position.copy(F(k.book, v)).add(new THREE.Vector3(0, 0.016, 0));
      beam.rotation.y = yaw;
    };
  },

  /**
   * The overhead book scanner (고문서 스캐너): a table with a V-cradle holding an old bound book open
   * (yellowed pages, columns of 한자, a red seal), the camera head on its column over it between two
   * LED light bars, a monitor showing the spread as it's shot, white cotton gloves, a stack of old
   * newspapers and grey archive boxes under the table. Digitizing: stood at the cradle, both hands
   * flattening the pages, off for the shot (the lights flash), the right-hand page taken over.
   */
  scanStation(g, _W, _D, _c, _def, _ctx, out) {
    const top = 0.78;
    part(g, rbox(0.92, 0.035, 0.72, 0.01), '#eceff1', 0, top - 0.0175, -0.12);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.02, 0.02, top - 0.035, 8), STEEL_GREY, sx * 0.42, (top - 0.035) / 2, -0.12 + sz * 0.31, { outline: false });
    part(g, box(0.84, 0.02, 0.62), '#cfd8dc', 0, 0.18, -0.12, { outline: false });
    // Grey archive boxes on the low shelf.
    for (let i = 0; i < 3; i++) {
      part(g, rbox(0.24, 0.16, 0.34, 0.01), '#9e9e9e', -0.28 + i * 0.27, 0.27, -0.12);
      label(g, `향토자료 ${1962 + i * 4}`, 0.18, 0.04, -0.28 + i * 0.27, 0.29, 0.052, '#ffffff', '#424242');
    }
    // The cradle: a base and two platens tipped up a little to either side of the spine.
    const W0 = new THREE.Vector3(0, top + 0.09, 0.02);
    part(g, rbox(0.52, 0.05, 0.38, 0.01), '#37474f', 0, top + 0.025, W0.z);
    for (const sx of [-1, 1]) part(g, box(0.24, 0.014, 0.34), '#263238', sx * 0.125, top + 0.07, W0.z, { rz: -sx * 0.12 });
    // The book in its dweller-frame group: covers, the two pages lying, the page that turns.
    const yaw = Math.PI;
    const bk = new THREE.Group();
    bk.position.copy(W0);
    bk.rotation.y = yaw;
    g.add(bk);
    const h = SCAN_BOOK.half;
    const pageTexture = painted('lib-oldpage', 128, 176, paintOldPage);
    for (const sx of [-1, 1]) {
      part(bk, box(h + 0.02, 0.008, 0.3), '#5d4037', sx * (h / 2 + 0.01), -0.012, 0);
      part(bk, box(h, 0.012, 0.27), OLD_PAPER, sx * h / 2, -0.004, 0, { outline: false });
      picture(bk, pageTexture, h - 0.01, 0.26, sx * h / 2, 0.0025, 0, '#f5ead0', 0, -Math.PI / 2);
    }
    const leaf = new THREE.Group();
    bk.add(leaf);
    picture(leaf, pageTexture, h - 0.01, 0.26, -h / 2, 0.004, 0, '#f5ead0', 0, -Math.PI / 2);
    picture(leaf, pageTexture, h - 0.01, 0.26, -h / 2, 0.003, 0, '#efe0bd', 0, Math.PI / 2);
    const workAt = marker(g, W0.x, W0.y, W0.z);
    // The column at the back, the arm over the cradle, the camera head and the light bars.
    part(g, rbox(0.16, 0.03, 0.14, 0.01), '#263238', 0, top + 0.015, -0.4);
    part(g, box(0.05, 0.75, 0.05), '#37474f', 0, top + 0.4, -0.4);
    part(g, box(0.05, 0.05, 0.44), '#37474f', 0, top + 0.76, -0.2);
    part(g, rbox(0.12, 0.08, 0.12, 0.02), '#212121', 0, top + 0.72, W0.z);
    part(g, cyl(0.03, 0.03, 0.02, 14), '#101010', 0, top + 0.67, W0.z);
    glowing(g, ball(0.008), '#69f0ae', 0.05, top + 0.74, W0.z + 0.06);
    const flash = new THREE.Group();
    g.add(flash);
    for (const sx of [-1, 1]) {
      rod(g, new THREE.Vector3(0, top + 0.76, -0.2), new THREE.Vector3(sx * 0.28, top + 0.66, -0.02), 0.012, '#37474f');
      part(g, rbox(0.06, 0.03, 0.34, 0.01), '#37474f', sx * 0.3, top + 0.64, W0.z, { rz: sx * 0.5 });
      glowing(g, box(0.04, 0.004, 0.3), '#fff8e1', sx * 0.29, top + 0.627, W0.z);
      glowing(flash, box(0.05, 0.006, 0.32), '#ffffff', sx * 0.288, top + 0.62, W0.z);
    }
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.6, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#fffde7', transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }));
    cone.userData.ownGeometry = cone.userData.ownMaterial = true;
    cone.position.set(0, top + 0.37, W0.z);
    flash.add(cone);
    flash.visible = false;
    // The monitor at the right (the spread as it's shot), gloves, old newspapers.
    out.screen = monitor(g, 0.33, top, -0.33, 0.24, 0.16, painted('lib-scanview', 256, 176, paintScanView), -0.35);
    for (const dx of [0, 0.05]) {
      part(g, rbox(0.06, 0.012, 0.11, 0.006), '#fafafa', -0.36 + dx, top + 0.006 + dx * 0.1, 0.12, { ry: 0.3 + dx * 4 });
    }
    for (let i = 0; i < 4; i++) part(g, box(0.3, 0.008, 0.22), i % 2 ? '#e8dcb5' : OLD_PAPER, -0.29, top + 0.004 + i * 0.008, -0.3, { ry: (i - 1.5) * 0.06, outline: false });
    label(g, '1965.03 지역 신문', 0.2, 0.035, -0.29, top + 0.04, -0.188, '#ffffff', '#5d4037');
    const stand = spot(g, 'stand', 0, 0, 0.48, yaw);
    const spots: Record<string, Spot> = {
      digitizeArchive: at(stand, workAt, 'pageScan'),
      '*': at(spot(g, 'stand', 0, 0, 0.48, yaw), workAt, 'pageScan'),
    };
    out.spots = spots;
    out.work = workAt;
    out.animate = (t) => {
      const now = nowAt(spots, t);
      if (!now) {
        leaf.rotation.z = 0;
        flash.visible = false;
        return;
      }
      const k = pageScanRound(t, phaseAt(spots[now]));
      leaf.rotation.z = -k.flip * Math.PI;
      leaf.visible = k.flip < 0.999;
      flash.visible = k.flash;
    };
  },

  /**
   * The story corner (독서 프로그램 공간): a rainbow-bordered rug with 한글 letter blocks woven in,
   * floor cushions round it, a low wooden reading chair facing them, a basket of picture books and a
   * teddy, the 작가와의 만남 poster on its easel and the 이야기 나라 banner over it. The reading
   * programme: the librarian sat on the low chair holding the picture book (아기 곰의 첫 소풍) up
   * open to five children sat cross-legged round on the cushions, reading it, pointing out the picture,
   * showing it round the circle, turning the page — the children's heads following it, a hand going
   * up. Planning the author visit (branch): stood at the poster.
   */
  storyRug(g, W, _D, _c, _def, ctx, out) {
    const rugW = W - 0.06;
    part(g, rbox(rugW, 0.014, 0.96, 0.04), '#ffcc80', 0, 0.007, 0);
    if (!rugMat) rugMat = new THREE.MeshToonMaterial({ map: painted('lib-rug', 512, 256, paintRug), gradientMap: gradient });
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(rugW - 0.04, 0.92), rugMat);
    rug.userData.ownGeometry = true;
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.0155, 0);
    rug.receiveShadow = true;
    g.add(rug);
    // The reader's low chair at the front, facing in.
    const yaw = Math.PI;
    const seatY = 0.36;
    const seatZ = 0.62;
    const ch = new THREE.Group();
    ch.position.set(0, 0, seatZ);
    g.add(ch);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(ch, cyl(0.018, 0.016, seatY - 0.03, 8), OAK, sx * 0.17, (seatY - 0.03) / 2, sz * 0.16, { outline: false });
    part(ch, rbox(0.42, 0.04, 0.38, 0.015), OAK, 0, seatY - 0.02, 0);
    part(ch, rbox(0.36, 0.03, 0.32, 0.015), '#ffab91', 0, seatY + 0.01, 0);
    for (const sx of [-1, 1]) part(ch, cyl(0.016, 0.016, 0.42, 8), OAK, sx * 0.17, seatY + 0.2, 0.17, { outline: false });
    part(ch, rbox(0.38, 0.12, 0.025, 0.01), OAK, 0, seatY + 0.33, 0.17);
    // The children's cushions round in an arc before the reader.
    const R = 0.85;
    const kidAt = [-60, -30, 0, 30, 60].map((d) => {
      const a = (d * Math.PI) / 180;
      return { x: Math.sin(a) * R, z: seatZ - Math.cos(a) * R };
    });
    const cushions = ['#81d4fa', '#ffab91', '#c5e1a5', '#fff59d', '#ce93d8'];
    kidAt.forEach((p, i) => part(g, cyl(0.17, 0.18, 0.05, 18), cushions[i], p.x, 0.04, p.z));
    // The basket of picture books, a teddy, the easel with its poster, the banner on the wall.
    part(g, cyl(0.15, 0.12, 0.16, 16), '#bcaaa4', 0.84, 0.095, -0.36);
    for (let i = 0; i < 5; i++) part(g, box(0.15, 0.2, 0.012), bookColor(i * 3 + 1), 0.78 + i * 0.03, 0.2, -0.36 + (i - 2) * 0.02, { rz: (i - 2) * 0.12, outline: false });
    const ted = new THREE.Group();
    ted.position.set(-0.86, 0.016, 0.38);
    ted.rotation.y = 0.6;
    g.add(ted);
    part(ted, ball(0.09), '#a1887f', 0, 0.09, 0);
    part(ted, ball(0.07), '#a1887f', 0, 0.22, 0.01);
    for (const sx of [-1, 1]) {
      part(ted, ball(0.03), '#8d6e63', sx * 0.05, 0.28, 0.0);
      part(ted, ball(0.035), '#a1887f', sx * 0.09, 0.12, 0.05);
      part(ted, ball(0.035), '#a1887f', sx * 0.05, 0.03, 0.08);
    }
    part(ted, ball(0.03), '#d7ccc8', 0, 0.21, 0.07);
    const ex = -0.84;
    const ez = -0.36;
    const easel = new THREE.Group();
    easel.position.set(ex, 0, ez);
    easel.rotation.y = 0.35;
    g.add(easel);
    for (const sx of [-1, 1]) rod(easel, new THREE.Vector3(sx * 0.2, 0, 0.12), new THREE.Vector3(sx * 0.08, 1.5, 0), 0.014, OAK_DARK);
    rod(easel, new THREE.Vector3(0, 0, -0.25), new THREE.Vector3(0, 1.42, -0.02), 0.012, OAK_DARK);
    part(easel, box(0.42, 0.03, 0.06), OAK_DARK, 0, 0.8, 0.07);
    part(easel, rbox(0.4, 0.54, 0.015, 0.005), '#ffffff', 0, 1.08, 0.065, { rx: -0.08 });
    picture(easel, painted('lib-poster', 192, 256, paintPoster), 0.37, 0.5, 0, 1.08, 0.075, '#ffffff', 0, -0.08);
    const posterAt = marker(g, ex + Math.sin(0.35) * 0.08, 1.12, ez + Math.cos(0.35) * 0.08);
    if (ctx.againstWall) {
      part(g, rbox(1.2, 0.22, 0.012, 0.01), '#fff8e1', 0.2, 1.75, -0.49);
      label(g, '이야기 나라 · 매주 토요일 11시', 1.1, 0.12, 0.2, 1.75, -0.482, '#fff8e1', '#e65100');
      for (let i = 0; i < 7; i++) part(g, ball(0.035), ['#ef5350', '#ffa726', '#ffee58', '#66bb6a', '#42a5f5', '#ab47bc', '#ef5350'][i], -0.34 + i * 0.18, 1.6 - Math.sin((i / 6) * Math.PI) * 0.06, -0.47, { outline: false });
    }

    // The reading: the children (drawn while it's on) and the book in the reader's hands.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const seatAt = new THREE.Vector3(0, seatY, seatZ);
    const W0 = framer(seatAt, yaw)(bo(0.08, 0.59, 0.3));
    const workAt = marker(g, W0.x, W0.y, W0.z);
    const kids = kidAt.map((p, i) => floorKid(use, p.x, p.z + 0.02, Math.atan2(W0.x - p.x, W0.z - p.z), KID_LOOKS[i]));
    const bk = new THREE.Group();
    bk.position.copy(W0);
    use.add(bk);
    const hw = STORYBOOK.wide / 2;
    const hh = STORYBOOK.high;
    // The hard covers (the back of the book, to the reader).
    part(bk, box(STORYBOOK.wide + 0.02, hh + 0.02, 0.01), '#ef6c00', 0, 0, -0.012);
    part(bk, box(0.02, hh + 0.02, 0.016), '#bf360c', 0, 0, -0.008);
    label(bk, '아기 곰의 첫 소풍', 0.18, 0.04, -hw / 2, 0.06, -0.018, '#ef6c00', '#ffffff', Math.PI);
    const pageL = picture(bk, pageTex(1), hw - 0.006, hh - 0.01, hw / 2, 0, -0.004);
    const pageR = picture(bk, pageTex(0), hw - 0.006, hh - 0.01, -hw / 2, 0, -0.004);
    // The leaf that turns: from the reader's left over the front to their right.
    const leaf = new THREE.Group();
    bk.add(leaf);
    const leafFront = picture(leaf, pageTex(1), hw - 0.006, hh - 0.01, hw / 2, 0, 0.0);
    const leafBack = picture(leaf, pageTex(2), hw - 0.006, hh - 0.01, hw / 2, 0, -0.001, '#ffffff', Math.PI);
    const setMap = (m: THREE.Mesh, tex: THREE.Texture) => {
      const mat = m.material as THREE.MeshBasicMaterial;
      if (mat.map !== tex) mat.map = tex;
    };
    const stand = spot(g, 'stand', ex + 0.05, 0, ez + 0.5, Math.PI + 0.35);
    const spots: Record<string, Spot> = {
      readingProgram: at(spot(g, 'sit', 0, seatY, seatZ, yaw, seatY), workAt, 'storyRead'),
      librarian_planEvent: at(stand, posterAt, 'board'),
      '*': at(spot(g, 'sit', 0, seatY, seatZ, yaw, seatY), workAt, 'storyRead'),
    };
    out.spots = spots;
    out.seat = marker(g, 0, seatY, seatZ);
    out.work = workAt;
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const reading = now !== null && now !== 'librarian_planEvent';
      bk.visible = reading;
      for (const k of kids) k.root.visible = reading;
      if (!reading) return;
      const k = storyRound(t, phaseAt(spots[now!]));
      bk.rotation.y = yaw + k.turn;
      // Kids' right page (the reader's left, +x in the book) and left page; the leaf over them.
      const s = k.n * 2;
      setMap(pageR, pageTex(s));
      setMap(pageL, pageTex(k.flip > 0 ? s + 3 : s + 1));
      setMap(leafFront, pageTex(s + 1));
      setMap(leafBack, pageTex(s + 2));
      leaf.rotation.y = -k.flip * Math.PI;
      leaf.visible = k.flip > 0 && k.flip < 1;
      if (k.flip >= 1) setMap(pageR, pageTex(s + 2));
      // The children: the heads up to the book and following it round, leaning in when it's shown to them, a hand up at the picture.
      kids.forEach((c, i) => {
        const p = kidAt[i];
        // The book turned to the reader's left (+turn) is shown to the children on that side (-x).
        const side = Math.abs(p.x) < 0.05 ? 0 : -Math.sign(p.x);
        const shown = side === 0 ? 0.4 : Math.max(0, (side * k.turn) / 0.35);
        c.head.rotation.set(-0.28 + 0.04 * wave(t, 0.3, i * 0.21), 0.6 * k.turn + 0.08 * wave(t, 0.11, i * 0.4), 0);
        c.torso.rotation.x = 0.05 + 0.16 * shown + 0.04 * k.point;
        c.raise(k.point > 0.5 && i === (k.n % 5));
      });
    };
  },

  /**
   * The reading table (열람 테이블, new): a long oak table with two green-shaded banker's lamps lit
   * along its middle, seat numbers by them, a 조용히 sign, an open book, a notebook and pencil, a
   * small stack with a bookmark. Its chairs are libReadingChair, staggered either side.
   */
  libReadingTable(g, W, D, _c, _def, _ctx, out) {
    const top = 0.74;
    const tw = W - 0.08;
    const td = D - 0.16;
    part(g, rbox(tw, 0.045, td, 0.015), OAK, 0, top - 0.0225, 0);
    for (const sx of [-1, 1]) {
      part(g, rbox(0.06, top - 0.045, td - 0.14, 0.015), OAK_DARK, sx * (tw / 2 - 0.08), (top - 0.045) / 2, 0);
      part(g, rbox(0.1, 0.03, td - 0.06, 0.01), OAK_DARK, sx * (tw / 2 - 0.08), 0.015, 0);
    }
    part(g, box(tw - 0.2, 0.05, 0.04), OAK_DARK, 0, 0.3, 0);
    // A cable rail down the middle with a socket per place.
    part(g, box(tw - 0.3, 0.012, 0.06), '#9e9e9e', 0, top + 0.006, 0, { outline: false });
    for (const x of [-0.5, 0.5]) for (const sz of [-1, 1]) part(g, box(0.04, 0.004, 0.012), '#424242', x + 0.12, top + 0.013, sz * 0.025, { outline: false });
    const lamp = (x: number, n: number) => {
      part(g, cyl(0.06, 0.07, 0.025, 16), BRASS, x, top + 0.0125, 0);
      rod(g, new THREE.Vector3(x, top + 0.02, 0), new THREE.Vector3(x, top + 0.33, 0), 0.008, BRASS);
      // The green glass shade: a half-cylinder along the table, open underneath, lit inside.
      part(g, new THREE.CylinderGeometry(0.075, 0.075, 0.32, 16, 1, true, 0, Math.PI), '#1b5e20', x, top + 0.36, 0, { rz: Math.PI / 2, material: SHADE }).userData.ownGeometry = true;
      glowing(g, box(0.28, 0.004, 0.12), '#fff3c4', x, top + 0.335, 0);
      label(g, `열람석 ${n}`, 0.12, 0.035, x - 0.17, top + 0.03, 0.033, '#ffffff', '#455a64');
      label(g, `열람석 ${n + 1}`, 0.12, 0.035, x + 0.17, top + 0.03, -0.033, '#ffffff', '#455a64', Math.PI);
    };
    lamp(-0.5, 21);
    lamp(0.5, 23);
    // The quiet sign in the middle (both faces).
    part(g, box(0.16, 0.008, 0.05), '#e0e0e0', 0, top + 0.004, 0, { outline: false });
    glass(g, box(0.16, 0.1, 0.004), 0, top + 0.055, 0);
    label(g, '쉿! 조용히', 0.14, 0.04, 0, top + 0.06, 0.004, '#ffffff', '#c62828');
    label(g, '쉿! 조용히', 0.14, 0.04, 0, top + 0.06, -0.004, '#ffffff', '#c62828', Math.PI);
    // An open book and a notebook at the -z left place, a stack with a bookmark at the +z right.
    const open = new THREE.Group();
    open.position.set(-0.45, top + 0.004, -0.24);
    open.rotation.y = 0.12;
    g.add(open);
    for (const sx of [-1, 1]) part(open, box(0.15, 0.008, 0.21), PAPER, sx * 0.075, 0.004 + Math.abs(sx) * 0.002, 0, { rz: -sx * 0.06 });
    for (let i = 0; i < 6; i++) for (const sx of [-1, 1]) part(open, box(0.11, 0.002, 0.004), '#9e9e9e', sx * 0.075, 0.012, -0.07 + i * 0.03, { outline: false });
    part(open, box(0.31, 0.006, 0.22), '#1565c0', 0, -0.002, 0, { outline: false });
    part(g, box(0.15, 0.01, 0.21), '#fff9c4', -0.72, top + 0.005, -0.22, { ry: -0.2 });
    rod(g, new THREE.Vector3(-0.78, top + 0.012, -0.28), new THREE.Vector3(-0.68, top + 0.012, -0.2), 0.004, '#ffb300');
    for (let i = 0; i < 3; i++) bookFlat(g, bookColor(i * 4 + 3), 0.15, 0.21, 0.026).position.set(0.62, top + 0.013 + i * 0.026, 0.24);
    part(g, box(0.02, 0.002, 0.08), '#e53935', 0.62, top + 0.06, 0.32, { rx: 0.9, outline: false });
    part(g, cyl(0.03, 0.03, 0.18, 12), '#81d4fa', 0.35, top + 0.09, 0.26);
    part(g, cyl(0.022, 0.022, 0.03, 12), '#0277bd', 0.35, top + 0.195, 0.26);
    out.work = marker(g, 0, top, 0);
  },

  /**
   * The reading-room chair (열람석 의자, new): oak, a green leather seat and a slatted back; whoever's
   * waiting sits in it. A book brought (recommendBook): stood at the chair's side holding a book out
   * to them, the cover their way (이달의 추천 도서), a finger going to it; a search slip brought
   * (findReference): the printed 자료 위치 안내 held out the same way.
   */
  libReadingChair(g, _W, _D, _c, _def, _ctx, out) {
    const seatY = 0.46;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.02, 0.018, seatY - 0.03, 8), OAK_DARK, sx * 0.19, (seatY - 0.03) / 2, sz * 0.18, { outline: false });
    for (const sx of [-1, 1]) rod(g, new THREE.Vector3(sx * 0.19, 0.16, -0.18), new THREE.Vector3(sx * 0.19, 0.16, 0.18), 0.012, OAK_DARK);
    part(g, rbox(0.46, 0.04, 0.44, 0.015), OAK, 0, seatY - 0.04, 0);
    part(g, rbox(0.4, 0.04, 0.38, 0.02), '#4e6e58', 0, seatY - 0.005, 0.01);
    for (const sx of [-1, 1]) part(g, rbox(0.035, 0.46, 0.035, 0.01), OAK_DARK, sx * 0.19, seatY + 0.2, -0.2, { rx: -0.08 });
    for (let i = 0; i < 3; i++) part(g, rbox(0.38, 0.06, 0.02, 0.01), OAK, 0, seatY + 0.14 + i * 0.12, -0.205 - i * 0.01, { rx: -0.08 });
    out.seat = marker(g, 0, seatY, 0.03);
    // The librarian beside the chair, facing the one sat in it; the thing shown held out between them.
    const showAt = marker(g, 0.24, 1.0, 0.18);
    const stand = () => spot(g, 'stand', 0.55, 0, 0.14, -Math.PI / 2);
    const spots: Record<string, Spot> = {
      'social:recommendBook': at(stand(), showAt, 'bookShow'),
      'social:findReference': at(stand(), showAt, 'bookShow'),
    };
    out.spots = spots;
    const held = new THREE.Group();
    held.position.copy(showAt.position);
    held.rotation.y = -Math.PI / 2 + 0.35;
    held.rotation.x = -0.15;
    g.add(held);
    const book = new THREE.Group();
    held.add(book);
    part(book, box(0.16, 0.22, 0.025), '#1a237e', 0, 0, -0.013);
    part(book, box(0.15, 0.21, 0.02), PAPER, 0.004, 0, -0.013, { outline: false }).scale.set(1, 1, 1.05);
    picture(book, painted('lib-cover', 128, 176, paintCover), 0.155, 0.215, 0, 0, 0.0005);
    const slip = new THREE.Group();
    held.add(slip);
    part(slip, box(0.11, 0.15, 0.002), '#ffffff', 0, 0, -0.002, { outline: false });
    picture(slip, painted('lib-slip', 128, 176, paintSlip), 0.105, 0.145, 0, 0, 0.0005);
    book.visible = slip.visible = false;
    out.animate = (t) => {
      const now = nowAt(spots, t);
      book.visible = now === 'social:recommendBook';
      slip.visible = now === 'social:findReference';
      held.rotation.z = 0.04 * wave(t, 0.2);
    };
  },

  /**
   * The 자료 검색 kiosk (new): a white pedestal with a blue head, its touchscreen tipped back showing
   * a search (아기 곰) with the call numbers, whether each is in, and the shelf map with the children's
   * room lit, a slip printer with a 위치 안내 slip out of it, a sign on its side. Putting up the new
   * arrivals: stood tapping at the screen.
   */
  libSearchKiosk(g, _W, _D, _c, _def, _ctx, out) {
    part(g, rbox(0.46, 0.03, 0.4, 0.01), '#cfd8dc', 0, 0.015, -0.05);
    part(g, rbox(0.3, 0.92, 0.22, 0.04), '#fafafa', 0, 0.49, -0.1);
    part(g, box(0.31, 0.06, 0.012), '#1565c0', 0, 0.8, 0.012, { outline: false });
    label(g, '자료 검색', 0.24, 0.05, 0, 0.8, 0.019, '#1565c0', '#ffffff');
    label(g, 'BOOK SEARCH', 0.2, 0.03, 0, 0.6, 0.012, '#fafafa', '#1565c0');
    // The slip printer's mouth and a slip.
    part(g, box(0.14, 0.012, 0.01), '#263238', 0, 0.7, 0.012, { outline: false });
    part(g, box(0.08, 0.002, 0.1), PAPER, 0, 0.69, 0.06, { rx: 0.7, outline: false });
    // The head: tipped back, the screen self-lit.
    const head = new THREE.Group();
    head.position.set(0, 1.05, -0.04);
    head.rotation.x = -0.55;
    g.add(head);
    part(head, rbox(0.46, 0.36, 0.06, 0.02), '#1565c0', 0, 0, -0.02);
    picture(head, painted('lib-kiosk', 256, 192, paintKiosk), 0.41, 0.31, 0, 0, 0.012);
    const screenAt = new THREE.Vector3(0, -0.02, 0.02).applyEuler(head.rotation).add(head.position);
    const workAt = marker(g, screenAt.x, screenAt.y, screenAt.z);
    for (const sx of [-1, 1]) part(g, box(0.004, 0.5, 0.18), '#e3f2fd', sx * 0.152, 0.4, -0.1, { outline: false });
    const st = spot(g, 'stand', 0, 0, 0.42, Math.PI);
    out.spots = { libUpdateKiosk: at(st, workAt, 'type'), '*': at(spot(g, 'stand', 0, 0, 0.42, Math.PI), workAt, 'type') };
    out.work = workAt;
  },

  /**
   * The returns truck (반납 도서 북트럭, new): the steel book truck by the desk, its three tiers full of
   * returned books with a 반납 도서 card clipped on. Sorting the returns: stood at it, the hands going
   * along the top tier putting them in call-number order.
   */
  libBookCart(g, _W, _D, _c, _def, _ctx, out) {
    bookTruck(g, 0, -0.08, { seed: 4, tag: true });
    const workAt = marker(g, 0, 0.86, 0.0);
    out.spots = { libSortReturns: at(spot(g, 'stand', 0, 0, 0.45, Math.PI), workAt, 'tinker'), '*': at(spot(g, 'stand', 0, 0, 0.45, Math.PI), workAt, 'tinker') };
    out.work = workAt;
  },

  /**
   * The 24-hour book drop (무인 도서 반납함, new) by the door: a blue steel box with a sloped top, the
   * hinged return flap over its 도서 반납함 · BOOK RETURN · 24시간 sign, a "no discs" sticker and the
   * locked door below. Emptying it: squatting at it with the door open, the books in the bin inside
   * taken out.
   */
  libReturnBox(g, _W, _D, _c, _def, _ctx, out) {
    const blue = '#1565c0';
    const bw = 0.62;
    const bd = 0.52;
    const zc = -0.1;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.05, 0.06, 0.05), '#263238', sx * (bw / 2 - 0.05), 0.03, zc + sz * (bd / 2 - 0.05), { outline: false });
    part(g, rbox(bw, 0.9, bd, 0.03), blue, 0, 0.51, zc);
    part(g, rbox(bw + 0.03, 0.04, bd + 0.06, 0.015), '#0d47a1', 0, 0.98, zc, { rx: -0.12 });
    // The flap: a chute mouth with a hinged steel lid.
    const fz = zc + bd / 2;
    part(g, rbox(0.46, 0.14, 0.06, 0.02), '#0d47a1', 0, 0.86, fz + 0.01);
    part(g, box(0.4, 0.035, 0.01), '#101010', 0, 0.86, fz + 0.042, { outline: false });
    part(g, box(0.42, 0.06, 0.012), STEEL, 0, 0.895, fz + 0.05, { rx: -0.35 });
    picture(g, painted('lib-return', 256, 128, paintReturnSign), 0.5, 0.25, 0, 0.66, fz + 0.002);
    label(g, 'CD·DVD는 넣지 마세요', 0.3, 0.035, 0, 0.5, fz + 0.002, '#ffeb3b', '#b71c1c');
    // The door below: shut, or swung open to the bin of books.
    const closed = new THREE.Group();
    g.add(closed);
    out.idle = closed;
    part(closed, rbox(0.5, 0.36, 0.012, 0.01), '#1976d2', 0, 0.26, fz + 0.004);
    part(closed, cyl(0.016, 0.016, 0.02, 10), CHROME, 0.19, 0.3, fz + 0.012, { rx: Math.PI / 2 });
    const open = new THREE.Group();
    g.add(open);
    out.inUse = open;
    part(open, box(0.5, 0.36, 0.01), '#0b2f63', 0, 0.26, fz - 0.004, { outline: false });
    const door = new THREE.Group();
    door.position.set(-0.25, 0, fz + 0.006);
    door.rotation.y = -1.6;
    open.add(door);
    part(door, rbox(0.5, 0.36, 0.012, 0.01), '#1976d2', 0.25, 0.26, 0);
    part(open, rbox(0.44, 0.22, 0.38, 0.02), '#9e9e9e', 0, 0.2, zc + 0.02);
    const rb = seeded(9);
    for (let i = 0; i < 5; i++) {
      const b = bookFlat(open, bookColor(i * 2 + 5), 0.13, 0.19, 0.022);
      b.position.set(-0.12 + rb() * 0.24, 0.32 + i * 0.012, zc + 0.04 + rb() * 0.1);
      b.rotation.set((rb() - 0.5) * 0.5, rb() * Math.PI, (rb() - 0.5) * 0.5);
    }
    const workAt = marker(g, 0, 0.34, fz - 0.02);
    out.spots = { libEmptyReturns: at(spot(g, 'stand', 0, 0, 0.5, Math.PI), workAt, 'tinker'), '*': at(spot(g, 'stand', 0, 0, 0.5, Math.PI), workAt, 'tinker') };
    out.work = workAt;
  },

  /**
   * The picture-book shelf (그림책 서가, new) in the children's room: low, rounded birch in pastels,
   * two tiers of books face-out with their covers to the room, bins of board books below, a cloud
   * sign on top with a plush rabbit. Choosing today's book: stood at it, a book taken out and leafed
   * through.
   */
  libPictureShelf(g, W, _D, _c, _def, _ctx, out) {
    const sw = W - 0.1;
    const zb = -0.32;
    const birch = '#f3e2c3';
    for (const sx of [-1, 1]) part(g, rbox(0.05, 0.92, 0.36, 0.02), birch, sx * (sw / 2), 0.46, zb + 0.13);
    part(g, rbox(sw, 0.9, 0.02, 0.01), '#ffe0b2', 0, 0.46, zb - 0.04);
    part(g, rbox(sw + 0.06, 0.04, 0.38, 0.02), birch, 0, 0.93, zb + 0.13);
    part(g, rbox(sw, 0.06, 0.34, 0.02), birch, 0, 0.03, zb + 0.13);
    // Two face-out tiers: a slanted ledge, the covers leaning back on it.
    const covers = ['#ef5350', '#42a5f5', '#66bb6a', '#ffca28', '#ab47bc', '#26c6da', '#ff7043', '#8d6e63'];
    [0.42, 0.7].forEach((y, row) => {
      part(g, box(sw, 0.02, 0.2), birch, 0, y - 0.13, zb + 0.06);
      part(g, box(sw, 0.05, 0.015), '#ffb74d', 0, y - 0.105, zb + 0.16, { outline: false });
      for (let i = 0; i < 4; i++) {
        const x = -sw / 2 + 0.22 + i * ((sw - 0.44) / 3);
        const col = covers[(i + row * 4) % covers.length];
        part(g, box(0.22, 0.26, 0.015), col, x, y, zb + 0.08, { rx: -0.22 });
        part(g, box(0.16, 0.05, 0.002), '#ffffff', x, y + 0.07, zb + 0.089 + 0.016, { rx: -0.22, outline: false });
        part(g, ball(0.04), ['#fff59d', '#ffffff', '#f8bbd0'][i % 3], x, y - 0.03, zb + 0.08 + 0.02, { outline: false }).scale.set(1, 1, 0.2);
      }
    });
    // Board-book bins below.
    for (const sx of [-1, 1]) {
      part(g, rbox(0.6, 0.16, 0.26, 0.02), sx > 0 ? '#81d4fa' : '#ffab91', sx * 0.36, 0.14, zb + 0.15);
      for (let i = 0; i < 5; i++) part(g, box(0.12, 0.14, 0.03), covers[(i * 3 + (sx > 0 ? 1 : 0)) % 8], sx * 0.36 - 0.2 + i * 0.1, 0.22, zb + 0.15, { rz: (i - 2) * 0.1, outline: false });
    }
    // The cloud sign and the plush rabbit.
    const cloud = new THREE.Group();
    cloud.position.set(-0.3, 1.12, zb + 0.13);
    g.add(cloud);
    for (const [x, y, r] of [[-0.14, 0, 0.09], [0, 0.04, 0.12], [0.14, 0, 0.09]] as const) part(cloud, ball(r), '#ffffff', x, y, 0).scale.set(1, 1, 0.35);
    label(cloud, '그림책', 0.22, 0.07, 0, 0.01, 0.045, '#ffffff', '#ef6c00');
    const rab = new THREE.Group();
    rab.position.set(0.5, 0.95, zb + 0.12);
    g.add(rab);
    part(rab, ball(0.07), '#fafafa', 0, 0.07, 0);
    part(rab, ball(0.055), '#fafafa', 0, 0.17, 0.01);
    for (const sx of [-1, 1]) part(rab, rbox(0.03, 0.12, 0.02, 0.01), '#fafafa', sx * 0.025, 0.27, 0, { rz: sx * 0.15 });
    part(rab, ball(0.012), '#f48fb1', 0, 0.165, 0.065, { outline: false });
    const workAt = marker(g, -0.3, 0.75, zb + 0.15);
    out.spots = { libPickStorybook: at(spot(g, 'stand', -0.3, 0, 0.42, Math.PI), workAt, 'read'), '*': at(spot(g, 'stand', -0.3, 0, 0.42, Math.PI), workAt, 'read') };
    out.work = workAt;
  },
};

/** A BarOffset (to the librarian's left, up, away). */
function bo(side: number, up: number, ahead: number): BarOffset {
  return { side, up, ahead };
}
