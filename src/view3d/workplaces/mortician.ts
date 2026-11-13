import * as THREE from 'three';
import { FLORAL, INCENSE, SHROUD, floralRound, incenseRound, shroudRound, toolPhase, type Motion } from '../activity';
import { marker, rod, shade, spot, type Builder, type Spot } from '../parts';
import { ball, box, cyl, part, rbox, toon } from '../toon';
import { BLACK, CHROME, STEEL, glass, glowing, label, painted, picture, ring, seeded, text, type Paint } from './doctor';

/**
 * The funeral hall drawn as itself (2026-10-27 workplace pipeline, at the user's request), as a
 * Korean 장례식장's 빈소 is: the altar banked in white chrysanthemums with a band of yellow, the
 * portrait in its frame with black ribbons at the corners, the 위패, two candles always lit and the
 * incense burner smoking on the table before it — incense offered there with two deep bows, flowers
 * set in its baskets, a memorial led from beside it with the order of service in hand — the 근조
 * wreaths on their stands with their ribbons, the funeral director's desk, and in the preparation
 * room the paulownia casket on its trestle (lined, closed and bound, its cover folded; never anyone
 * in it). And what it was missing (workFurniture/mortician.ts): the 상주's place by the altar, the
 * guest book and condolence box at the door, the 빈소 board in the lobby, the 접객실 tables laid for
 * mourners, the table where the 수의 is folded and the cabinet the funeral things are kept in.
 */

const WHITE_MUM = '#fbfbf6';
const CREAM_MUM = '#fff8e1';
const YELLOW_MUM = '#fdd835';
const GREEN_MUM = '#e6f2c9';
const LEAF = '#558b2f';
const STEM = '#6f9a4f';
const CLOTH = '#fbfbf9';
const WALNUT = '#4e342e';
const PAULOWNIA = '#e2cba6';
const HEMP = '#e3d6b4';
const BRASS = '#c9a43a';
const LACQUER = '#1f1b1a';
const SMOKE = new THREE.MeshBasicMaterial({ color: '#eceff1', transparent: true, opacity: 0.26, depthWrite: false });

const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
/** Of named spots, the one most lately stood at (within a moment), else null. */
function nowAt(spots: Record<string, Spot>, t: number): string | null {
  let best: string | null = null;
  for (const [k, s] of Object.entries(spots)) if (Math.abs(t - posedAt(s)) < 0.6 && (best === null || posedAt(s) > posedAt(spots[best]))) best = k;
  return best;
}
const tmp = new THREE.Vector3();
const phaseAt = (s: Spot) => toolPhase(s.at.getWorldPosition(tmp));
/** A spot with what the hands do there. */
function at(s: Spot, work: THREE.Object3D | undefined, motion?: Motion): Spot {
  s.work = work;
  s.motion = motion;
  return s;
}
const UP = new THREE.Vector3(0, 1, 0);
type Off = { side: number; up: number; ahead: number };
/** Offsets (to a dweller's left, up, ahead of them) from a point, for a dweller facing `yaw` (activity.ts BarOffset). */
function offsetter(P: THREE.Vector3, yaw: number) {
  const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const left = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  return (o: Off, v = new THREE.Vector3()) => v.copy(P).addScaledVector(left, o.side).addScaledVector(UP, o.up).addScaledVector(fwd, o.ahead);
}
/** A frame at `P` whose x runs to the left of a dweller facing `yaw`, its z away from them. */
function frameAt(g: THREE.Object3D, P: THREE.Vector3, yaw: number): THREE.Group {
  const f = new THREE.Group();
  f.position.copy(P);
  f.rotation.y = yaw;
  g.add(f);
  return f;
}

// ---------------------------------------------------------------------------------------------
// Chrysanthemums, by the hundred: one instanced mesh a colour (a flattened ball, its heart a shade).

interface Mum {
  x: number;
  y: number;
  z: number;
  r: number;
  c: string;
  /** Facing up (on a tier's top) or out to +z (on its face). */
  up?: boolean;
}
const HEART: Record<string, string> = { [WHITE_MUM]: '#e9f0c4', [CREAM_MUM]: '#f6e3a1', [YELLOW_MUM]: '#f9a825', [GREEN_MUM]: '#c5e1a5' };
function bank(g: THREE.Object3D, list: Mum[]) {
  const by = new Map<string, Array<{ p: THREE.Vector3; s: THREE.Vector3 }>>();
  const add = (c: string, p: THREE.Vector3, s: THREE.Vector3) => {
    if (!by.has(c)) by.set(c, []);
    by.get(c)!.push({ p, s });
  };
  for (const m of list) {
    const s = m.up ? new THREE.Vector3(m.r, m.r * 0.72, m.r) : new THREE.Vector3(m.r, m.r, m.r * 0.72);
    add(m.c, new THREE.Vector3(m.x, m.y, m.z), s);
    const h = HEART[m.c];
    if (h) add(h, new THREE.Vector3(m.x, m.y + (m.up ? m.r * 0.62 : 0), m.z + (m.up ? 0 : m.r * 0.62)), new THREE.Vector3(m.r * 0.38, m.r * 0.3, m.r * 0.38));
  }
  const q = new THREE.Quaternion();
  const m4 = new THREE.Matrix4();
  for (const [c, items] of by) {
    const mesh = new THREE.InstancedMesh(ball(1), toon(c), items.length);
    items.forEach((it, i) => mesh.setMatrixAt(i, m4.compose(it.p, q, it.s)));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    g.add(mesh);
  }
}
/** One chrysanthemum head (a big white pompom), facing up. */
function mum(g: THREE.Object3D, x: number, y: number, z: number, r = 0.034, c = WHITE_MUM) {
  part(g, ball(r), c, x, y, z, { outline: false }).scale.set(1, 0.72, 1);
  part(g, ball(r * 0.4), HEART[c] ?? shade(c, 0.9), x, y + r * 0.6, z, { outline: false }).scale.set(1, 0.6, 1);
}
function leaf(g: THREE.Object3D, x: number, y: number, z: number, ry = 0, s = 1) {
  const m = part(g, ball(0.026 * s), LEAF, x, y, z, { outline: false, ry, rz: 0.3 });
  m.scale.set(1.7, 0.35, 0.8);
  return m;
}

/**
 * The stems for an arrangement in a basket (activity.ts floralRound, the vase's way) for someone at
 * `yaw` working at `P` (the basket's mouth): white chrysanthemums laid on the table, one taken up at a
 * time and set in round the mouth, then the snips along the top.
 */
function chrysKit(g: THREE.Object3D, P: THREE.Vector3, yaw: number) {
  const root = new THREE.Group();
  g.add(root);
  const off = offsetter(P, yaw);
  const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const left = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const pile = off(FLORAL.pile);
  pile.y -= 0.012;
  for (let i = 0; i < 4; i++) {
    const s = pile.clone().addScaledVector(left, -0.05 + i * 0.033);
    const a = s.clone().addScaledVector(fwd, -0.15);
    const b = s.clone().addScaledVector(fwd, 0.12);
    rod(root, a, b, 0.004, STEM);
    const h = part(root, ball(0.03), i % 3 === 2 ? CREAM_MUM : WHITE_MUM, b.x, b.y + 0.02, b.z, { outline: false });
    h.scale.set(1, 1, 0.72);
    h.lookAt(b.clone().addScaledVector(fwd, 1));
  }
  const held = [0, 1, 2].map(() => {
    const h = new THREE.Group();
    root.add(h);
    rod(h, new THREE.Vector3(0, -0.24, 0), new THREE.Vector3(0, 0.07, 0), 0.004, STEM);
    leaf(h, 0.02, -0.06, 0, 0.4, 0.8);
    mum(h, 0, 0.09, 0, 0.034);
    h.visible = false;
    return h;
  });
  const added = [0, 1, 2].map((i) => {
    const h = new THREE.Group();
    root.add(h);
    h.position.copy(off({ side: -0.05 + i * 0.05, up: 0.06 + (i % 2) * 0.03, ahead: 0.02 * (i - 1) }));
    mum(h, 0, 0.09, 0, 0.034, i === 1 ? CREAM_MUM : WHITE_MUM);
    rod(h, new THREE.Vector3(0, -0.02, 0), new THREE.Vector3(0, 0.07, 0), 0.004, STEM);
    return h;
  });
  const snips = new THREE.Group();
  root.add(snips);
  const blades = [-1, 1].map((sx) => {
    const b = new THREE.Group();
    snips.add(b);
    part(b, box(0.008, 0.004, 0.06), STEEL, sx * 0.003, 0, 0.032, { outline: false });
    part(b, box(0.016, 0.012, 0.05), '#37474f', sx * 0.012, 0, -0.03, { outline: false, ry: sx * 0.15 });
    return { b, sx };
  });
  part(snips, cyl(0.006, 0.006, 0.01, 8), CHROME, 0, 0, 0, { outline: false });
  const rest = off(FLORAL.snips);
  const hand = new THREE.Vector3();
  return {
    root,
    show(t: number, ph: number) {
      const k = floralRound(t, ph, true);
      off(k.r, hand);
      held.forEach((h, i) => {
        h.visible = k.stem === i;
        if (h.visible) h.position.copy(hand);
      });
      added.forEach((h, i) => (h.visible = k.added > i));
      if (k.snips) {
        snips.position.copy(hand);
        snips.rotation.set(0, yaw, 0);
      } else {
        snips.position.copy(rest);
        snips.rotation.set(0, yaw + 0.5, 0);
      }
      for (const { b, sx } of blades) b.rotation.y = sx * 0.35 * k.open;
    },
  };
}

/**
 * A piece of cloth folded in half and set on a stack (activity.ts shroudRound) for someone at `yaw`
 * working at `P` (its middle): the hemp of the 수의, or the casket's cover. Another lies flat under it.
 */
function clothKit(g: THREE.Object3D, P: THREE.Vector3, yaw: number, color: string, stack: number) {
  const f = frameAt(g, P, yaw);
  const H = SHROUD.half;
  const W = SHROUD.width;
  const sheet = (p: THREE.Object3D, z0: number) => {
    part(p, box(W, 0.004, H), color, 0, 0.002, z0 + H / 2, { outline: false });
    // The stitched hem along its edges.
    for (const sx of [-1, 1]) part(p, box(0.004, 0.0045, H - 0.02), shade(color, 0.82), sx * (W / 2 - 0.018), 0.003, z0 + H / 2, { outline: false });
    part(p, box(W - 0.03, 0.0045, 0.004), shade(color, 0.82), 0, 0.003, z0 + (z0 < 0 ? 0.015 : H - 0.015), { outline: false });
  };
  // Underneath: the next piece, flat.
  const under = new THREE.Group();
  f.add(under);
  sheet(under, -H);
  sheet(under, 0);
  // On top: the piece being folded; its far half on a hinge along the middle.
  const piece = new THREE.Group();
  f.add(piece);
  const near = new THREE.Group();
  near.position.y = 0.005;
  piece.add(near);
  sheet(near, -H);
  const hinge = new THREE.Group();
  hinge.position.y = 0.005;
  piece.add(hinge);
  sheet(hinge, 0);
  // The stack to the left, folded pieces.
  const st = SHROUD.stack;
  for (let i = 0; i < stack; i++) part(f, box(W, 0.008, H), i % 2 ? color : shade(color, 0.97), st.side + (i % 2) * 0.006, st.up + 0.004 + i * 0.008, st.ahead + (i % 3) * 0.004, { outline: false });
  const top = st.up + stack * 0.008;
  return {
    root: f,
    show(t: number, ph: number) {
      const k = shroudRound(t, ph);
      hinge.rotation.x = -k.fold * Math.PI;
      hinge.position.y = 0.005 + 0.006 * k.fold;
      const c = k.carry;
      piece.position.set(st.side * c, top * c + 0.1 * Math.sin(c * Math.PI), (st.ahead + H / 2) * c);
      piece.visible = k.u < 0.895;
      under.visible = k.u > 0.79;
    },
  };
}

// ---------------------------------------------------------------------------------------------
// What's painted: the portrait, the 위패, the ribbons, the boards and the papers.

function vtext(c: CanvasRenderingContext2D, s: string, x: number, y0: number, step: number, size: number, color: string) {
  let y = y0;
  for (const ch of s) {
    if (ch === ' ') {
      y += step * 0.45;
      continue;
    }
    text(c, ch, x, y, size, color, 'center');
    y += step;
  }
}

/** The 영정: a grandmother in a lilac 한복, her grey hair permed, smiling with her eyes. */
const paintPortrait: Paint = (c) => {
  const bg = c.createLinearGradient(0, 0, 0, 320);
  bg.addColorStop(0, '#c9d3d8');
  bg.addColorStop(1, '#eef1f2');
  c.fillStyle = bg;
  c.fillRect(0, 0, 256, 320);
  // The jeogori over the shoulders, the white 동정 collar crossing, the 고름 tie.
  c.fillStyle = '#b8a6d9';
  c.beginPath();
  c.moveTo(20, 320);
  c.quadraticCurveTo(34, 238, 128, 226);
  c.quadraticCurveTo(222, 238, 236, 320);
  c.fill();
  c.fillStyle = '#e8c3a3';
  c.fillRect(110, 192, 36, 44);
  c.strokeStyle = '#ffffff';
  c.lineWidth = 11;
  c.beginPath();
  c.moveTo(98, 230);
  c.lineTo(146, 292);
  c.moveTo(160, 230);
  c.lineTo(122, 282);
  c.stroke();
  c.fillStyle = '#7e57c2';
  c.beginPath();
  c.ellipse(150, 300, 16, 8, -0.5, 0, Math.PI * 2);
  c.fill();
  c.fillRect(144, 300, 8, 20);
  // The face, the ears.
  c.fillStyle = '#eecfb3';
  c.beginPath();
  c.ellipse(76, 152, 9, 15, 0, 0, Math.PI * 2);
  c.ellipse(180, 152, 9, 15, 0, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.ellipse(128, 150, 52, 64, 0, 0, Math.PI * 2);
  c.fill();
  // The permed grey hair, curl on curl.
  const rnd = seeded(9);
  for (let i = 0; i < 60; i++) {
    const a = Math.PI * (1.02 + rnd() * 0.96);
    const rr = 50 + rnd() * 14;
    c.fillStyle = rnd() > 0.5 ? '#a7a7a7' : '#8f8f8f';
    c.beginPath();
    c.arc(128 + Math.cos(a) * rr * 1.05, 128 + Math.sin(a) * rr * 0.9, 9 + rnd() * 5, 0, Math.PI * 2);
    c.fill();
  }
  // Brows, eyes smiling, the lines at their corners, the nose, the smile, the cheeks.
  c.strokeStyle = '#8d8d8d';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(94, 134);
  c.quadraticCurveTo(106, 128, 118, 133);
  c.moveTo(138, 133);
  c.quadraticCurveTo(150, 128, 162, 134);
  c.stroke();
  c.strokeStyle = '#4e342e';
  c.lineWidth = 3.5;
  for (const x of [106, 150]) {
    c.beginPath();
    c.arc(x, 156, 10, Math.PI * 1.15, Math.PI * 1.85);
    c.stroke();
  }
  c.strokeStyle = 'rgba(141,110,99,0.55)';
  c.lineWidth = 1.5;
  for (const [x, s] of [[90, -1], [166, 1]] as const) {
    c.beginPath();
    c.moveTo(x, 150);
    c.lineTo(x + s * 7, 146);
    c.moveTo(x, 154);
    c.lineTo(x + s * 7, 156);
    c.stroke();
  }
  c.strokeStyle = '#c49a80';
  c.lineWidth = 2.5;
  c.beginPath();
  c.moveTo(128, 160);
  c.quadraticCurveTo(122, 176, 130, 178);
  c.stroke();
  c.strokeStyle = '#a1584e';
  c.lineWidth = 3;
  c.beginPath();
  c.arc(128, 178, 17, Math.PI * 0.18, Math.PI * 0.82);
  c.stroke();
  c.fillStyle = 'rgba(236,128,128,0.2)';
  for (const x of [96, 160]) {
    c.beginPath();
    c.ellipse(x, 176, 13, 8, 0, 0, Math.PI * 2);
    c.fill();
  }
};
const DECEASED = '김순자';
/** The 위패: ivory, the name written down it. */
const paintTablet: Paint = (c) => {
  c.fillStyle = '#f6efdc';
  c.fillRect(0, 0, 64, 224);
  c.strokeStyle = '#8d6e63';
  c.lineWidth = 3;
  c.strokeRect(5, 5, 54, 214);
  vtext(c, `故 ${DECEASED} 영위`, 32, 30, 30, 22, '#1a1a1a');
};
/** A 근조 wreath's ribbons: the condolence on the right, who sent it on the left. */
const paintRibbon = (s: string): Paint => (c) => {
  c.fillStyle = '#fafafa';
  c.fillRect(0, 0, 64, 640);
  c.fillStyle = '#e0e0e0';
  c.fillRect(0, 0, 4, 640);
  c.fillRect(60, 0, 4, 640);
  vtext(c, s, 32, 40, 44, 34, '#1b1b1b');
};
/** The 명정 laid along the casket's lid: red silk, the inscription in white. */
const paintMyeongjeong: Paint = (c) => {
  c.fillStyle = '#9e1c1c';
  c.fillRect(0, 0, 512, 96);
  c.strokeStyle = '#e8c86a';
  c.lineWidth = 3;
  c.strokeRect(6, 6, 500, 84);
  const s = '孺人金海金氏之柩';
  for (let i = 0; i < s.length; i++) text(c, s[i], 64 + i * 55, 50, 42, '#fff8e1', 'center');
};
/** The guest book open at today's page. */
const paintGuestBook: Paint = (c) => {
  c.fillStyle = '#fbf8f0';
  c.fillRect(0, 0, 256, 160);
  c.fillStyle = '#e0d8c8';
  c.fillRect(126, 0, 4, 160);
  text(c, '조 객 록', 64, 16, 14, '#212121', 'center');
  text(c, '故 김순자 님', 192, 16, 12, '#212121', 'center');
  c.strokeStyle = '#c9c2b4';
  c.lineWidth = 1;
  for (let i = 0; i < 6; i++)
    for (const x0 of [8, 136]) {
      c.beginPath();
      c.moveTo(x0, 40 + i * 20);
      c.lineTo(x0 + 112, 40 + i * 20);
      c.stroke();
    }
  const names = ['박정민', '이수진', '한빛건설 최영호', '정지아', '김태현', '오세영', '윤미경'];
  names.forEach((n, i) => text(c, n, (i < 5 ? 14 : 142), 33 + (i % 5) * 20, 12, '#263238', 'left', false));
};
/** The 빈소 board in the lobby. */
const paintBoard: Paint = (c) => {
  const bg = c.createLinearGradient(0, 0, 0, 416);
  bg.addColorStop(0, '#1d2733');
  bg.addColorStop(1, '#101820');
  c.fillStyle = bg;
  c.fillRect(0, 0, 256, 416);
  c.fillStyle = '#37474f';
  c.fillRect(0, 0, 256, 44);
  text(c, '빈 소 안 내', 128, 23, 22, '#ffffff', 'center');
  // A chrysanthemum drawn in petals.
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    c.fillStyle = '#f5f5f5';
    c.beginPath();
    c.ellipse(128 + Math.cos(a) * 14, 82 + Math.sin(a) * 14, 9, 4, a, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = '#e6ee9c';
  c.beginPath();
  c.arc(128, 82, 7, 0, Math.PI * 2);
  c.fill();
  text(c, '특1호실', 128, 128, 22, '#ffe082', 'center');
  text(c, `故 ${DECEASED} 님`, 128, 168, 30, '#ffffff', 'center');
  text(c, '향년 87세', 128, 200, 16, '#cfd8dc', 'center', false);
  c.fillStyle = '#455a64';
  c.fillRect(24, 220, 208, 2);
  const rows: Array<[string, string]> = [
    ['상  주', '이정훈'],
    ['입  관', '10월 28일 오전 11시'],
    ['발  인', '10월 29일 오전 7시'],
    ['장  지', '서울추모공원'],
  ];
  rows.forEach(([k, v], i) => {
    text(c, k, 30, 250 + i * 34, 15, '#90a4ae', 'left');
    text(c, v, 92, 250 + i * 34, 15, '#ffffff', 'left', false);
  });
  text(c, '삼가 고인의 명복을 빕니다', 128, 396, 14, '#b0bec5', 'center', false);
};
/** The board's keypad while its notice is being typed in. */
const paintKeypad: Paint = (c) => {
  c.fillStyle = 'rgba(38,50,56,0.95)';
  c.fillRect(0, 0, 256, 112);
  c.fillStyle = '#263238';
  c.fillRect(8, 6, 240, 20);
  text(c, '발인 10월 29일 오전 7시', 14, 16, 11, '#ffffff', 'left', false);
  const keys = 'ㅂㅈㄷㄱㅅㅛㅕㅑㅐㅔㅁㄴㅇㄹㅎㅗㅓㅏㅣㅋㅌㅊㅍㅠㅜㅡ';
  for (let i = 0; i < keys.length; i++) {
    const row = i < 10 ? 0 : i < 19 ? 1 : 2;
    const col = row === 0 ? i : row === 1 ? i - 10 : i - 19;
    const x = 10 + col * 24 + row * 10;
    const y = 34 + row * 24;
    c.fillStyle = '#455a64';
    c.fillRect(x, y, 21, 20);
    text(c, keys[i], x + 10.5, y + 10, 11, '#eceff1', 'center', false);
  }
};
/** The funeral director's papers: the three days' schedule, a eulogy begun, the day's checklist. */
const paintSchedule: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 192, 256);
  text(c, '장례 일정표 (3일장)', 96, 18, 14, '#212121', 'center');
  text(c, `고인 ${DECEASED} · 상주 이정훈`, 96, 38, 10, '#455a64', 'center', false);
  const days: Array<[string, string[]]> = [
    ['1일차', ['임종 · 안치', '빈소 설치 · 부고']],
    ['2일차', ['염습 · 입관', '성복제']],
    ['3일차', ['발인 · 운구', '화장 · 봉안']],
  ];
  days.forEach(([d, items], i) => {
    const y = 64 + i * 62;
    c.fillStyle = '#eceff1';
    c.fillRect(10, y - 10, 172, 54);
    text(c, d, 18, y + 4, 12, '#37474f', 'left');
    items.forEach((s, j) => {
      c.strokeStyle = '#78909c';
      c.strokeRect(66, y - 4 + j * 22, 10, 10);
      if (i === 0) text(c, '✓', 71, y + 1 + j * 22, 11, '#2e7d32', 'center');
      text(c, s, 84, y + 1 + j * 22, 11, '#263238', 'left', false);
    });
  });
};
const paintEulogy: Paint = (c) => {
  c.fillStyle = '#f7f1e3';
  c.fillRect(0, 0, 192, 256);
  text(c, '추 도 사', 96, 26, 16, '#3e2723', 'center');
  const lines = ['어머님, 평생 자식들을 위해', '애쓰신 그 손을 기억합니다.', '봄이면 마당의 꽃을 돌보시던', '어머님의 웃음을 잊지 않겠습니다.'];
  lines.forEach((s, i) => text(c, s, 14, 60 + i * 22, 10, '#4e342e', 'left', false));
  c.strokeStyle = '#bcaaa4';
  for (let i = 0; i < 5; i++) {
    c.beginPath();
    c.moveTo(14, 156 + i * 18);
    c.lineTo(150 - (i % 2) * 40, 156 + i * 18);
    c.stroke();
  }
};
const paintChecklist: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 192, 256);
  text(c, '장례 진행 체크리스트', 96, 18, 13, '#212121', 'center');
  const items = ['부고 발송', '빈소 · 접객실 배정', '영정 · 위패 준비', '근조화환 접수', '수의 · 관 확인', '운구 차량 예약', '화장장 예약'];
  items.forEach((s, i) => {
    c.strokeStyle = '#78909c';
    c.strokeRect(14, 40 + i * 28, 12, 12);
    if (i < 4) text(c, '✓', 20, 46 + i * 28, 13, '#2e7d32', 'center');
    text(c, s, 36, 46 + i * 28, 12, '#263238', 'left', false);
  });
};
const paintEstimate: Paint = (c) => {
  c.fillStyle = '#f5f7f8';
  c.fillRect(0, 0, 256, 160);
  c.fillStyle = '#37474f';
  c.fillRect(0, 0, 256, 20);
  text(c, '장례비용 견적서', 8, 10, 11, '#ffffff');
  const rows: Array<[string, string]> = [
    ['빈소 사용료 (특1호실)', '1,200,000'],
    ['접객실 · 음식', '1,850,000'],
    ['수의 (대마)', '800,000'],
    ['관 (오동나무)', '500,000'],
    ['운구 리무진 · 버스', '700,000'],
    ['화장 수수료', '120,000'],
  ];
  rows.forEach(([k, v], i) => {
    if (i % 2) {
      c.fillStyle = '#eceff1';
      c.fillRect(0, 26 + i * 18, 256, 18);
    }
    text(c, k, 8, 35 + i * 18, 10, '#263238', 'left', false);
    text(c, v, 248, 35 + i * 18, 10, '#263238', 'right', false);
  });
  c.fillStyle = '#cfd8dc';
  c.fillRect(0, 138, 256, 22);
  text(c, '합계', 8, 149, 11, '#212121');
  text(c, '5,170,000원', 248, 149, 11, '#b71c1c', 'right');
};

// ---------------------------------------------------------------------------------------------
// Pieces shared between builders.

/** A candlestick on a table (its foot at `y`): brass, a white candle, the flame lit at `flameY`. */
function candle(g: THREE.Object3D, x: number, y: number, z: number, flameY: number) {
  part(g, cyl(0.04, 0.05, 0.02, 16), BRASS, x, y + 0.01, z);
  part(g, cyl(0.012, 0.016, 0.1, 10), BRASS, x, y + 0.07, z, { outline: false });
  part(g, cyl(0.035, 0.028, 0.012, 14), BRASS, x, y + 0.126, z);
  const top = flameY - 0.035;
  const len = top - (y + 0.132);
  part(g, cyl(0.02, 0.02, len, 12), '#fffdf5', x, y + 0.132 + len / 2, z);
  part(g, cyl(0.003, 0.003, 0.012, 6), '#3e2723', x, top + 0.006, z, { outline: false });
  const f = glowing(g, ball(0.012), '#ffb74d', x, flameY - 0.008, z);
  f.scale.set(1, 2.1, 1);
  glowing(g, ball(0.006), '#fff8e1', x, flameY - 0.012, z).scale.set(1, 1.8, 1);
}
/** A stick of incense (`len` long) from its foot along +y, the tip glowing. */
function incenseStick(g: THREE.Object3D, len = INCENSE.stick, lit = true): THREE.Group {
  const s = new THREE.Group();
  g.add(s);
  part(s, cyl(0.0022, 0.0022, len * 0.25, 6), '#a1887f', 0, len * 0.125, 0, { outline: false, shadow: false });
  part(s, cyl(0.0028, 0.0028, len * 0.75, 6), '#5d4037', 0, len * 0.625, 0, { outline: false, shadow: false });
  const tip = glowing(s, ball(0.0045), '#ff7043', 0, len, 0);
  tip.visible = lit;
  return s;
}
/** Smoke going up from `p`: a few puffs that rise, widen and fade on a loop (moved by `rise`). */
function smoke(g: THREE.Object3D, p: THREE.Vector3, n = 4) {
  const puffs = Array.from({ length: n }, (_, i) => {
    const m = new THREE.Mesh(ball(0.012), SMOKE);
    m.renderOrder = 3;
    g.add(m);
    return { m, k: i / n };
  });
  const rise = (t: number) => {
    for (const { m, k } of puffs) {
      const u = (t * 0.22 + k) % 1;
      m.position.set(p.x + 0.02 * Math.sin(t * 1.3 + k * 9) * u, p.y + 0.02 + u * 0.32, p.z + 0.015 * Math.cos(t * 1.1 + k * 7) * u);
      m.scale.setScalar(0.6 + u * 2.4);
      m.visible = u < 0.92;
    }
  };
  rise(0.37);
  return rise;
}
/** A black leather chair facing -z from (x, z): returns where its seat is. */
function directorChair(g: THREE.Object3D, x: number, z: number): THREE.Object3D {
  const c = new THREE.Group();
  c.position.set(x, 0, z);
  c.rotation.y = Math.PI;
  g.add(c);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    rod(c, new THREE.Vector3(0, 0.08, 0), new THREE.Vector3(Math.sin(a) * 0.24, 0.05, Math.cos(a) * 0.24), 0.014, '#424242');
    part(c, ball(0.024), BLACK, Math.sin(a) * 0.24, 0.024, Math.cos(a) * 0.24, { outline: false });
  }
  part(c, cyl(0.025, 0.025, 0.32, 10), CHROME, 0, 0.24, 0, { outline: false });
  part(c, rbox(0.48, 0.09, 0.46, 0.04), '#262626', 0, 0.44, 0);
  part(c, rbox(0.44, 0.5, 0.08, 0.05), '#262626', 0, 0.76, -0.21, { rx: -0.1 });
  for (const sx of [-1, 1]) part(c, rbox(0.05, 0.04, 0.3, 0.02), '#262626', sx * 0.25, 0.62, -0.02);
  return marker(g, x, 0.48, z);
}

// ---------------------------------------------------------------------------------------------

/** The altar's front table: its top, and where the burner, the candles and the baskets are. */
const ALTAR = { top: 0.78, tableZ: 0.2, burner: new THREE.Vector3(0, 0.86, 0.2), basketX: 0.78 };

export const BUILDERS: Record<string, Builder> = {
  /**
   * The 빈소 altar (제단): three tiers under white cloth banked with chrysanthemums — white, a band of
   * yellow wavering across each face, pale green among them, a mound rising either side of the
   * portrait — the portrait in a dark frame with black ribbons across its top corners, the 위패
   * before it, and the low table in front with the brass incense burner (three sticks smoking), the
   * box of incense, a cup, two candles lit, two baskets of chrysanthemums and single stems laid for
   * 헌화. Offering incense (leadMemorial, the memorial's opening): stood at the middle, a stick taken
   * from the box, lit at the candle, waved out and set upright in the ash, then two deep bows (activity
   * incense). Arranging the altar: stood at the left basket, stems set into it one by one and the top
   * trimmed (floralArrange). Leading the 영결식 from its right end, the order of service in hand,
   * calling each part to the altar and bowing with the room at the silence (officiate).
   */
  memorialAltar(g, W, _D, _c, _def, _ctx, out) {
    const hw = W / 2 - 0.05;
    // The tiers under their cloth, a grey band at the foot.
    part(g, rbox(W - 0.1, 1.32, 0.3, 0.02), CLOTH, 0, 0.66, -0.35);
    part(g, rbox(W - 0.06, 1.0, 0.2, 0.02), '#f6f6f3', 0, 0.5, -0.1);
    part(g, box(W - 0.05, 0.06, 0.205), '#b0b6ba', 0, 0.03, -0.1, { outline: false });
    // The front table, a white cloth to the floor, pleated.
    const tz = ALTAR.tableZ;
    const top = ALTAR.top;
    part(g, rbox(1.9, top, 0.4, 0.015), '#ffffff', 0, top / 2, tz);
    for (let i = 0; i < 13; i++) part(g, box(0.006, top - 0.08, 0.004), '#ececec', -0.9 + i * 0.15, (top - 0.08) / 2 + 0.04, tz + 0.202, { outline: false });
    part(g, box(1.9, 0.05, 0.004), '#9e9e9e', 0, top - 0.06, tz + 0.203, { outline: false });

    // The chrysanthemums.
    const rnd = seeded(31);
    const mums: Mum[] = [];
    const pick = (band: boolean) => (band ? YELLOW_MUM : rnd() < 0.08 ? GREEN_MUM : rnd() < 0.12 ? CREAM_MUM : WHITE_MUM);
    const step = 0.066;
    // The back tier's face above the middle one, a yellow band wavering across.
    for (let y = 1.04; y < 1.3; y += step)
      for (let x = -hw + 0.04; x <= hw - 0.04; x += step) {
        const band = Math.abs(y - (1.17 + 0.08 * Math.sin(x * 2.4))) < 0.036;
        mums.push({ x: x + (rnd() - 0.5) * 0.01, y, z: -0.19, r: 0.036 + rnd() * 0.006, c: pick(band) });
      }
    // On its top, a mound either side of the portrait, higher at the back.
    for (let j = 0; j < 5; j++)
      for (let x = -hw + 0.04; x <= hw - 0.04; x += step) {
        if (Math.abs(x) < 0.3) continue;
        const z = -0.47 + j * 0.065;
        const hill = 0.05 + 0.2 * Math.max(0, Math.sin((Math.abs(x) - 0.3) * 2.6)) * (1 - j * 0.16);
        const band = Math.abs(hill - 0.14) < 0.03 && j > 1;
        mums.push({ x: x + (rnd() - 0.5) * 0.01, y: 1.33 + hill, z, r: 0.037 + rnd() * 0.006, c: pick(band), up: true });
        // The mound's face down to the tier.
        if (j === 4) for (let y = 1.35; y < 1.33 + hill - 0.03; y += step) mums.push({ x, y, z: z + 0.04, r: 0.035, c: pick(Math.abs(y - 1.42) < 0.03) });
      }
    // The middle tier's top (round the 위패) and its face — all of it beside the front table, the band again.
    for (let j = 0; j < 3; j++)
      for (let x = -hw + 0.04; x <= hw - 0.04; x += step) {
        if (Math.abs(x) < 0.12) continue;
        mums.push({ x: x + (rnd() - 0.5) * 0.01, y: 1.02 + 0.015 * j, z: -0.17 + j * 0.065, r: 0.036, c: pick(false), up: true });
      }
    for (let y = 0.1; y < 0.99; y += step)
      for (let x = -hw + 0.04; x <= hw - 0.04; x += step) {
        if (Math.abs(x) < 0.98 && y < top + 0.03) continue;
        const band = Math.abs(y - (0.55 + 0.25 * Math.sin(x * 2.2 + 1)) ) < 0.034 || (y > top && Math.abs(y - 0.9) < 0.03);
        mums.push({ x: x + (rnd() - 0.5) * 0.01, y, z: 0.012, r: 0.036 + rnd() * 0.005, c: pick(band) });
      }
    bank(g, mums);
    // Greenery tucked along the tiers' edges.
    for (let x = -hw + 0.1; x < hw; x += 0.24) {
      leaf(g, x, 1.33, -0.2, 0.3, 1.4);
      leaf(g, x + 0.12, 1.0, 0.03, -0.3, 1.4);
    }

    // The portrait: a dark frame, a gold fillet, black ribbons across the top corners, a strut behind.
    const pf = new THREE.Group();
    pf.position.set(0, 1.64, -0.36);
    pf.rotation.x = -0.08;
    g.add(pf);
    part(pf, rbox(0.5, 0.62, 0.04, 0.01), '#2e211c', 0, 0, 0);
    part(pf, box(0.43, 0.55, 0.006), '#c9a43a', 0, 0, 0.018, { outline: false });
    picture(pf, painted('mor-portrait', 256, 320, paintPortrait), 0.4, 0.5, 0, 0, 0.023, '#f2f2f2');
    for (const sx of [-1, 1]) {
      part(pf, box(0.26, 0.04, 0.008), '#111111', sx * 0.17, 0.23, 0.03, { rz: sx * 0.78, outline: false });
      part(pf, box(0.24, 0.006, 0.009), '#3a3a3a', sx * 0.17, 0.23, 0.031, { rz: sx * 0.78, outline: false });
    }
    rod(g, new THREE.Vector3(0, 1.33, -0.47), new THREE.Vector3(0, 1.6, -0.39), 0.01, '#2e211c');
    // The 위패 on its stand.
    part(g, rbox(0.15, 0.05, 0.09, 0.01), '#3e2723', 0, 1.025, -0.08);
    part(g, rbox(0.11, 0.3, 0.03, 0.008), '#3e2723', 0, 1.2, -0.08);
    picture(g, painted('mor-tablet', 64, 224, paintTablet), 0.085, 0.27, 0, 1.2, -0.064, '#f0f0f0');

    // On the front table: the burner, the incense box, a cup, the candles, the baskets, stems for 헌화.
    const B = ALTAR.burner;
    part(g, cyl(0.08, 0.06, 0.07, 20), BRASS, B.x, top + 0.045, B.z);
    part(g, ring(0.078, 0.007), shade(BRASS, 0.85), B.x, top + 0.08, B.z, { rx: Math.PI / 2, outline: false });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      part(g, cyl(0.01, 0.012, 0.02, 8), shade(BRASS, 0.8), B.x + Math.cos(a) * 0.05, top + 0.01, B.z + Math.sin(a) * 0.05, { outline: false });
    }
    part(g, cyl(0.072, 0.072, 0.004, 20), '#bdbdbd', B.x, B.y - 0.003, B.z, { outline: false });
    const ash = B.y - 0.003;
    const standing: THREE.Vector3[] = [];
    for (const [dx, dz, tilt] of [[-0.025, -0.01, 0.06], [0.0, -0.025, -0.03], [0.028, 0.0, -0.07]] as const) {
      const s = incenseStick(g, 0.17 - Math.abs(dx) * 1.2);
      s.position.set(B.x + dx, ash, B.z + dz);
      s.rotation.z = tilt;
      const tip = new THREE.Vector3(0, 0.17 - Math.abs(dx) * 1.2, 0).applyEuler(s.rotation).add(s.position);
      standing.push(tip);
    }
    // Two wisps of smoke stand still when nobody's at it; all three rise while it's tended.
    smoke(g, standing[0], 2);
    const box0 = { x: -INCENSE.box.side, z: B.z - INCENSE.box.ahead };
    part(g, rbox(0.1, 0.045, 0.07, 0.008), LACQUER, box0.x, top + 0.0225, box0.z);
    part(g, box(0.09, 0.004, 0.06), '#7b1f1f', box0.x, top + 0.046, box0.z, { outline: false });
    for (let i = 0; i < 6; i++) rod(g, new THREE.Vector3(box0.x - 0.03 + i * 0.012, top + 0.05, box0.z - 0.06), new THREE.Vector3(box0.x - 0.03 + i * 0.012, top + 0.05, box0.z + 0.06), 0.0022, i % 2 ? '#5d4037' : '#6d4c41');
    // A cup of wine on its saucer.
    part(g, cyl(0.04, 0.035, 0.008, 16), '#fafafa', -0.17, top + 0.004, B.z - 0.07);
    part(g, cyl(0.028, 0.018, 0.035, 14), '#fafafa', -0.17, top + 0.025, B.z - 0.07);
    // The candles (the right one is where incense is lit).
    const flame = offsetter(B, Math.PI)(INCENSE.flame);
    for (const sx of [-1, 1]) candle(g, sx * flame.x, top, flame.z, flame.y);
    // The baskets either end.
    for (const sx of [-1, 1]) {
      const bx = sx * ALTAR.basketX;
      part(g, cyl(0.1, 0.075, 0.16, 20), '#f3efe6', bx, top + 0.08, tz + 0.02);
      part(g, ring(0.1, 0.008), '#d7ccc8', bx, top + 0.16, tz + 0.02, { rx: Math.PI / 2, outline: false });
      const r2 = seeded(sx > 0 ? 3 : 5);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        const d = i === 0 ? 0 : 0.06 + r2() * 0.02;
        mum(g, bx + Math.cos(a) * d, top + 0.2 + (i === 0 ? 0.05 : 0.02), tz + 0.02 + Math.sin(a) * d, 0.035, i % 4 === 2 ? CREAM_MUM : WHITE_MUM);
      }
      for (let i = 0; i < 5; i++) leaf(g, bx + Math.cos(i * 1.3) * 0.1, top + 0.17, tz + 0.02 + Math.sin(i * 1.3) * 0.1, i, 1.2);
    }
    // Single stems laid for 헌화, heads to the altar.
    for (let i = 0; i < 5; i++) {
      const x = -0.3 + i * 0.15;
      rod(g, new THREE.Vector3(x, top + 0.006, tz + 0.03), new THREE.Vector3(x + 0.02, top + 0.006, tz + 0.19), 0.004, STEM);
      const h = part(g, ball(0.03), WHITE_MUM, x - 0.002, top + 0.026, tz + 0.02, { outline: false });
      h.scale.set(1, 0.75, 0.85);
    }

    // In use: the stick being offered, the arrangement being made, the smoke rising.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const rises = standing.map((p) => smoke(use, p, 4));
    const offerAt = marker(g, B.x, B.y, B.z);
    const offer = offsetter(B, Math.PI);
    const stick = incenseStick(use);
    const stickTip = stick.children[2] as THREE.Mesh;
    const stickFlame = glowing(stick, ball(0.008), '#ffb74d', 0, INCENSE.stick + 0.012, 0);
    stickFlame.scale.set(1, 2, 1);
    const placed = incenseStick(use);
    placed.position.set(B.x - 0.008, ash, B.z + 0.018);
    const placedSmoke = smoke(use, new THREE.Vector3(B.x - 0.008, ash + INCENSE.stick, B.z + 0.018), 3);
    const fwd = new THREE.Vector3(0, 0, -1);
    const tilted = fwd.clone().add(UP).normalize();
    const hand = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const P = new THREE.Vector3(-ALTAR.basketX, top + 0.2, tz + 0.02);
    const kit = chrysKit(use, P, Math.PI);
    const spots: Record<string, Spot> = {
      leadMemorial: at(spot(g, 'stand', 0, 0, 0.66, Math.PI), offerAt, 'incense'),
      arrangeAltar: at(spot(g, 'stand', P.x, 0, 0.62, Math.PI), marker(g, P.x, P.y, P.z), 'floralArrange'),
      mortician_ceremonyHost: at(spot(g, 'stand', 1.22, 0, 0.72, -0.5), undefined, 'officiate'),
    };
    spots['*'] = spots.arrangeAltar;
    out.spots = spots;
    out.work = offerAt;
    out.animate = (t) => {
      const now = nowAt(spots, t);
      rises.forEach((r) => r(t));
      const offering = now === 'leadMemorial';
      const arranging = now === 'arrangeAltar' || now === '*';
      kit.root.visible = arranging;
      if (arranging) kit.show(t, phaseAt(spots.arrangeAltar));
      stick.visible = placed.visible = false;
      if (!offering) return;
      const k = incenseRound(t, phaseAt(spots.leadMemorial));
      offer(k.r, hand);
      dir.copy(tilted).lerp(UP, k.upright).normalize();
      stick.visible = k.held === 'hand';
      stick.position.copy(hand).addScaledVector(dir, -0.03);
      stick.quaternion.setFromUnitVectors(UP, dir);
      stickTip.visible = k.lit;
      stickFlame.visible = k.flame;
      stickFlame.scale.set(1, 2 + 0.3 * Math.sin(t * 17), 1);
      placed.visible = k.held === 'burner';
      if (placed.visible) placedSmoke(t);
    };
  },

  /**
   * A 근조 wreath (근조화환) on its tripod stand: three tiers of chrysanthemums — the big round one at
   * the top, white with a ring of yellow and a heart of pale green, a smaller one under it and a spray
   * at the foot — on dark green backing, and the two long white ribbons hanging down the front, the
   * condolence on the right (삼가 고인의 명복을 빕니다), who sent it on the left. Tidied: stood before
   * it, straightening the ribbons and the heads (tinker), the ribbons swaying as they're smoothed.
   */
  wreathStand(g, _W, _D, _c, _def, _ctx, out) {
    const wood = '#9c8268';
    for (const sx of [-1, 1]) rod(g, new THREE.Vector3(sx * 0.05, 1.35, -0.02), new THREE.Vector3(sx * 0.27, 0, 0.16), 0.016, wood);
    rod(g, new THREE.Vector3(0, 1.35, -0.04), new THREE.Vector3(0, 0, -0.36), 0.016, wood);
    rod(g, new THREE.Vector3(-0.2, 0.42, 0.1), new THREE.Vector3(0.2, 0.42, 0.1), 0.01, wood);
    part(g, box(0.05, 1.5, 0.03), wood, 0, 1.0, 0.0, { outline: false });
    const mums: Mum[] = [];
    const rnd = seeded(17);
    const disc = (cy: number, cz: number, R: number, heart: string, ringC: string) => {
      part(g, cyl(R + 0.03, R + 0.03, 0.05, 28), '#33691e', 0, cy, cz - 0.03, { rx: Math.PI / 2 });
      for (let rr = 0; rr <= R; rr += 0.05) {
        const n = Math.max(1, Math.floor((Math.PI * 2 * rr) / 0.05));
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + rr * 3;
          const c = rr < 0.06 ? heart : Math.abs(rr - R * 0.62) < 0.03 ? ringC : rnd() < 0.08 ? CREAM_MUM : WHITE_MUM;
          mums.push({ x: Math.cos(a) * rr, y: cy + Math.sin(a) * rr, z: cz + 0.035 * (1 - (rr / (R + 0.01)) ** 2), r: 0.032 + rnd() * 0.006, c });
        }
      }
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        leaf(g, Math.cos(a) * (R + 0.04), cy + Math.sin(a) * (R + 0.04), cz - 0.01, a, 1.5);
      }
    };
    disc(1.5, 0.06, 0.3, GREEN_MUM, YELLOW_MUM);
    disc(0.98, 0.07, 0.2, YELLOW_MUM, WHITE_MUM);
    disc(0.6, 0.075, 0.15, WHITE_MUM, CREAM_MUM);
    bank(g, mums);
    // The ribbons, from bows at the top tier's sides.
    const ribbons = [
      { x: 0.2, s: '삼가 고인의 명복을 빕니다' },
      { x: -0.2, s: '주식회사 한빛 임직원 일동' },
    ].map(({ x, s }, i) => {
      const hang = new THREE.Group();
      hang.position.set(x, 1.62, 0.16);
      g.add(hang);
      const m = picture(hang, painted(`mor-ribbon-${i}`, 64, 640, paintRibbon(s)), 0.095, 1.2, 0, -0.6, 0, '#f4f4f4');
      m.rotation.z = -Math.sign(x) * 0.04;
      for (const sx of [-1, 1]) part(hang, ball(0.035), '#fafafa', sx * 0.035, 0.02, 0.0, { outline: false }).scale.set(1.3, 0.6, 0.4);
      return hang;
    });
    const fix = marker(g, 0.12, 1.12, 0.16);
    out.work = fix;
    out.spots = { '*': at(spot(g, 'stand', 0, 0, 0.56, Math.PI), fix, 'tinker') };
    out.animate = (t) => {
      ribbons.forEach((r, i) => (r.rotation.z = 0.05 * Math.sin(t * 1.7 + i * 1.3) * Math.max(0, Math.sin(t * 0.4))));
    };
  },

  /**
   * The funeral director's desk: walnut, a black leather chair, a lamp, a bud vase with one white
   * chrysanthemum, a box of tissues set out for the family, the binder of procedures, a desk phone,
   * the nameplate. Sat at it, the family's three days written out on the schedule (planFuneral), a
   * eulogy written on cream paper with a fountain pen (writeEulogy), the day's checklist ticked
   * (leading a funeral), the cost estimate typed up on the laptop (the budget), the book of funeral
   * rites read (ritualStudy).
   */
  funeralDesk(g, W, D, _c, _def, _ctx, out) {
    const top = 0.74;
    const d = 0.6;
    const z = -D / 2 + d / 2 + 0.02;
    part(g, rbox(W - 0.04, 0.04, d, 0.012), WALNUT, 0, top, z);
    part(g, rbox(0.32, top - 0.04, d - 0.06, 0.015), shade(WALNUT, 0.88), W / 2 - 0.2, (top - 0.04) / 2, z);
    for (let i = 0; i < 3; i++) part(g, box(0.06, 0.012, 0.012), BRASS, W / 2 - 0.2, 0.15 + i * 0.2, z + d / 2 - 0.025, { outline: false });
    part(g, box(0.04, top - 0.04, d - 0.06), shade(WALNUT, 0.88), -W / 2 + 0.04, (top - 0.04) / 2, z);
    part(g, box(W - 0.4, 0.4, 0.02), shade(WALNUT, 0.8), -0.12, 0.42, z - d / 2 + 0.03, { outline: false });
    out.seat = directorChair(g, 0, 0.32);
    // The lamp, the bud vase, the tissues, the binder, the phone, the nameplate.
    const T = top + 0.02;
    part(g, cyl(0.06, 0.07, 0.02, 16), '#263238', -0.36, T + 0.01, z - 0.18);
    rod(g, new THREE.Vector3(-0.36, T + 0.02, z - 0.18), new THREE.Vector3(-0.3, T + 0.36, z - 0.12), 0.008, '#263238');
    part(g, cyl(0.04, 0.09, 0.09, 16), '#2e5e4e', -0.27, T + 0.36, z - 0.09, { rx: 0.5 });
    glowing(g, cyl(0.07, 0.07, 0.004, 16), '#fff3c4', -0.265, T + 0.315, z - 0.07, 0.5);
    glass(g, cyl(0.022, 0.018, 0.14, 12), 0.36, T + 0.07, z - 0.2);
    rod(g, new THREE.Vector3(0.36, T + 0.02, z - 0.2), new THREE.Vector3(0.37, T + 0.24, z - 0.2), 0.004, STEM);
    mum(g, 0.37, T + 0.26, z - 0.2, 0.034);
    part(g, rbox(0.2, 0.1, 0.11, 0.015), '#eceff1', 0.3, T + 0.05, z + 0.12, { ry: -0.2 });
    part(g, box(0.06, 0.03, 0.04), '#ffffff', 0.3, T + 0.115, z + 0.12, { ry: -0.2, outline: false });
    part(g, rbox(0.06, 0.27, 0.24, 0.01), '#37474f', 0.12, T + 0.135, z - 0.2);
    label(g, '장례 절차', 0.2, 0.035, 0.155, T + 0.135, z - 0.2, '#37474f', '#ffffff', Math.PI / 2).rotation.z = Math.PI / 2;
    part(g, rbox(0.17, 0.05, 0.13, 0.02), BLACK, -0.12, T + 0.025, z - 0.2);
    part(g, rbox(0.2, 0.035, 0.05, 0.015), BLACK, -0.12, T + 0.065, z - 0.21);
    const plate = new THREE.Group();
    plate.position.set(0.0, T, z + 0.26);
    g.add(plate);
    part(plate, box(0.22, 0.05, 0.04), WALNUT, 0, 0.025, 0, { rx: -0.3 });
    label(plate, '장례지도사', 0.18, 0.035, 0, 0.03, 0.022, '#c9a43a', '#2e211c').rotation.x = -0.3;
    // What's out for each use.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const paper = (key: string, paint: Paint, color: string) => {
      const p = new THREE.Group();
      use.add(p);
      part(p, box(0.19, 0.002, 0.26), color, 0.02, T + 0.002, z + 0.04, { ry: 0.08, outline: false });
      const m = picture(p, painted(key, 192, 256, paint), 0.18, 0.24, 0.02, T + 0.004, z + 0.04, '#f6f6f6');
      m.rotation.set(-Math.PI / 2, 0, 0.08);
      return p;
    };
    const schedule = paper('mor-schedule', paintSchedule, '#ffffff');
    const eulogy = paper('mor-eulogy', paintEulogy, '#f7f1e3');
    const checklist = paper('mor-checklist', paintChecklist, '#ffffff');
    // The fountain pen beside the eulogy.
    rod(eulogy, new THREE.Vector3(0.16, T + 0.008, z + 0.0), new THREE.Vector3(0.2, T + 0.008, z + 0.13), 0.006, '#1a1a1a');
    // The laptop with the estimate.
    const laptop = new THREE.Group();
    use.add(laptop);
    part(laptop, rbox(0.32, 0.014, 0.22, 0.01), '#cfd8dc', 0, T + 0.007, z + 0.06);
    part(laptop, box(0.28, 0.003, 0.12), '#37474f', 0, T + 0.016, z + 0.08, { outline: false });
    const lid = new THREE.Group();
    lid.position.set(0, T + 0.014, z - 0.05);
    lid.rotation.x = -0.25;
    laptop.add(lid);
    part(lid, rbox(0.32, 0.21, 0.01, 0.01), '#cfd8dc', 0, 0.105, 0);
    picture(lid, painted('mor-estimate', 256, 160, paintEstimate), 0.29, 0.18, 0, 0.105, 0.006);
    const pen = marker(g, 0.02, T + 0.02, z + 0.06);
    const keys = marker(g, 0, T + 0.03, z + 0.1);
    const seat = () => spot(g, 'sit', 0, 0.48, 0.32, Math.PI, 0.48);
    const spots: Record<string, Spot> = {
      planFuneral: at(seat(), pen, 'write'),
      writeEulogy: at(seat(), pen, 'write'),
      mortician_leadFuneral: at(seat(), pen, 'write'),
      mortician_serviceBudget: at(seat(), keys, 'type'),
      mortician_ritualStudy: at(seat(), undefined, 'read'),
    };
    spots['*'] = spots.planFuneral;
    out.spots = spots;
    out.work = pen;
    out.animate = (t) => {
      const now = nowAt(spots, t);
      schedule.visible = now === 'planFuneral' || now === '*';
      eulogy.visible = now === 'writeEulogy';
      checklist.visible = now === 'mortician_leadFuneral';
      laptop.visible = now === 'mortician_serviceBudget';
    };
  },

  /**
   * The preparation room's casket on its trestle (안치실 작업대): a plain paulownia casket on a
   * stainless trestle, its lid bevelled, rolls of 한지, the white cotton bands and a box of 입관
   * things on the shelf under. Preparing it: the lid stood aside against the trestle, the 칠성판 at
   * the bottom and the 한지 lining laid in sheet by sheet, the pillow set at the head (tinker, along
   * it). The 입관 led: the lid on, the red 명정 laid along it, the three 결관 bands tied round one by one
   * (tinker, stepping along). Cleaning it: the lid wiped down (scrub). Teaching a junior: the cover
   * folded on the lid, shown slowly (shroud). Nobody is ever in it.
   */
  prepTable(g, W, _D, _c, _def, _ctx, out) {
    // The trestle.
    const ty = 0.45;
    part(g, rbox(W - 0.24, 0.035, 0.5, 0.01), STEEL, 0, ty, 0.05);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.02, 0.02, ty - 0.02, 10), STEEL, sx * (W / 2 - 0.2), (ty - 0.02) / 2, 0.05 + sz * 0.2, { outline: false });
    for (const sx of [-1, 1]) part(g, ball(0.03), BLACK, sx * (W / 2 - 0.2), 0.03, 0.25, { outline: false });
    part(g, rbox(W - 0.34, 0.02, 0.42, 0.006), shade(STEEL, 0.92), 0, 0.12, 0.05);
    for (let i = 0; i < 3; i++) part(g, cyl(0.04, 0.04, 0.36, 14), '#fbfaf5', -0.55 + i * 0.09, 0.17, 0.0, { rx: Math.PI / 2 });
    part(g, rbox(0.34, 0.14, 0.26, 0.01), '#d7ccc8', 0.15, 0.2, 0.05);
    label(g, '입관 용품', 0.22, 0.04, 0.15, 0.22, 0.181, '#d7ccc8', '#4e342e');
    for (let i = 0; i < 2; i++) part(g, cyl(0.05, 0.05, 0.06, 16), '#ffffff', 0.55 + i * 0.13, 0.17, 0.08);
    // The casket: open-topped walls, so it can be lined; its lid on top.
    const cx = 0;
    const cz = 0.05;
    const L = 1.85;
    const Wd = 0.52;
    const base = ty + 0.02;
    const h = 0.4;
    part(g, box(L, 0.03, Wd), PAULOWNIA, cx, base + 0.015, cz);
    for (const sz of [-1, 1]) part(g, box(L, h, 0.03), PAULOWNIA, cx, base + h / 2, cz + sz * (Wd / 2 - 0.015));
    for (const sx of [-1, 1]) part(g, box(0.03, h, Wd), PAULOWNIA, cx + sx * (L / 2 - 0.015), base + h / 2, cz);
    // Its grain, and the moulding round its foot.
    const rnd = seeded(23);
    for (let i = 0; i < 9; i++) part(g, box(0.3 + rnd() * 0.6, 0.004, 0.002), shade(PAULOWNIA, 0.88), -0.7 + rnd() * 1.4, base + 0.04 + rnd() * 0.32, cz + Wd / 2 + 0.001, { outline: false });
    part(g, rbox(L + 0.04, 0.03, Wd + 0.04, 0.01), shade(PAULOWNIA, 0.9), cx, base + 0.015, cz);
    const lid = new THREE.Group();
    g.add(lid);
    part(lid, rbox(L + 0.04, 0.035, Wd + 0.04, 0.01), PAULOWNIA, 0, 0, 0);
    part(lid, rbox(L - 0.12, 0.02, Wd - 0.12, 0.01), shade(PAULOWNIA, 1.04), 0, 0.025, 0);
    const lidOn = () => {
      lid.position.set(cx, base + h + 0.018, cz);
      lid.rotation.set(0, 0, 0);
    };
    lidOn();
    out.work = marker(g, 0, base + h + 0.05, cz + 0.15);
    // In use.
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    // Lining it: the 칠성판 (seven holes like the Big Dipper), the 한지 sheets, the pillow.
    const lining = new THREE.Group();
    use.add(lining);
    const floor = base + 0.031;
    part(lining, box(L - 0.08, 0.012, Wd - 0.08), '#3e2723', cx, floor + 0.006, cz, { outline: false });
    const dipper: Array<[number, number]> = [[-0.6, -0.05], [-0.42, 0.06], [-0.24, 0.02], [-0.06, -0.06], [0.14, -0.08], [0.32, 0.04], [0.5, 0.0]];
    for (const [x, zz] of dipper) part(lining, cyl(0.018, 0.018, 0.014, 10), '#d7ccc8', cx + x, floor + 0.007, cz + zz, { outline: false });
    const sheets = [0, 1, 2].map((i) => {
      const s = part(lining, box((L - 0.1) / 3 + 0.02, 0.006, Wd - 0.07), '#fdfbf4', cx - (L - 0.1) / 3 + i * ((L - 0.1) / 3), floor + 0.016 + i * 0.001, cz, { outline: false });
      return s;
    });
    const pillow = part(lining, rbox(0.22, 0.07, 0.3, 0.03), '#ffffff', cx - L / 2 + 0.2, floor + 0.05, cz);
    // Binding it: the 명정 along the lid, the three bands.
    const bind = new THREE.Group();
    use.add(bind);
    const lidTop = base + h + 0.036;
    const banner = picture(bind, painted('mor-myeongjeong', 512, 96, paintMyeongjeong), 1.5, 0.28, cx, lidTop + 0.004, cz, '#f2f2f2');
    banner.rotation.x = -Math.PI / 2;
    const bandX = [-0.6, 0, 0.6];
    const bands = bandX.map((x) => {
      const b = new THREE.Group();
      bind.add(b);
      part(b, box(0.06, 0.006, Wd + 0.06), '#fafafa', x, lidTop + 0.008, cz, { outline: false });
      for (const sz of [-1, 1]) part(b, box(0.06, h + 0.05, 0.006), '#fafafa', x, base + (h + 0.05) / 2, cz + sz * (Wd / 2 + 0.025), { outline: false });
      part(b, ball(0.025), '#fafafa', x, lidTop + 0.01, cz + Wd / 2 + 0.03, { outline: false }).scale.set(1.4, 0.8, 0.8);
      return b;
    });
    // Teaching: the cover folded on the lid.
    const coverP = new THREE.Vector3(0.1, lidTop + 0.003, cz + 0.06);
    const cover = clothKit(use, coverP, Math.PI, '#f2efe6', 2);
    const stand = () => spot(g, 'stand', 0, 0, 0.62, Math.PI);
    const along = marker(g, 0, floor + 0.08, cz + 0.12);
    const tie = marker(g, 0, lidTop + 0.02, cz + Wd / 2);
    const wipe = marker(g, 0, lidTop + 0.01, cz + 0.1);
    const binding = at(stand(), tie, 'tinker');
    const spots: Record<string, Spot> = {
      prepareCasket: at(stand(), along, 'tinker'),
      mortician_examReport: binding,
      tidyPrepRoom: at(stand(), wipe, 'scrub'),
      mortician_teachEmbalming: at(spot(g, 'stand', coverP.x, 0, 0.62, Math.PI), marker(g, coverP.x, coverP.y, coverP.z), 'shroud'),
    };
    spots['*'] = spots.prepareCasket;
    out.spots = spots;
    out.animate = (t) => {
      const now = nowAt(spots, t);
      const lining_ = now === 'prepareCasket' || now === '*';
      const binding_ = now === 'mortician_examReport';
      const teaching = now === 'mortician_teachEmbalming';
      lining.visible = lining_;
      bind.visible = binding_;
      cover.root.visible = teaching;
      if (lining_) {
        // The lid stood aside against the trestle's back; a sheet every 4 s, the pillow last.
        lid.position.set(cx, 0.29, -0.42);
        lid.rotation.set(-1.3, 0, 0);
        const u = (t / 16) % 1;
        sheets.forEach((s, i) => (s.visible = u > 0.12 + i * 0.22));
        pillow.visible = u > 0.8;
        const i = Math.min(2, Math.floor(Math.max(0, u - 0.02) / 0.22));
        const x = u > 0.72 ? -L / 2 + 0.25 : -(L - 0.1) / 3 + i * ((L - 0.1) / 3);
        along.position.x = THREE.MathUtils.damp(along.position.x, x, 3, 1 / 60);
      } else lidOn();
      if (binding_) {
        // A band every 5 s, stepping along to it.
        const u = (t / 15) % 1;
        const i = Math.min(2, Math.floor(u * 3));
        bands.forEach((b, j) => (b.visible = j < i || (j === i && (u * 3) % 1 > 0.65)));
        tie.position.x = THREE.MathUtils.damp(tie.position.x, bandX[i], 4, 1 / 60);
        binding.at.position.x = tie.position.x * 0.75;
      } else binding.at.position.x = 0;
      if (teaching) cover.show(t, phaseAt(spots.mortician_teachEmbalming));
    };
  },

  // -------------------------------------------------------------------------------------------
  // What the 장례식장 was missing.

  /**
   * The 상주's place beside the altar: a rush mat edged in black, a black cushion, a low black table
   * with the mourners' armbands (black, two white stripes) and black ribbon pins on a tray, tissues,
   * water and paper cups, and the bamboo 상장 staff leaning by the wall. Set dressing.
   */
  morMournerPlace(g, W, D) {
    part(g, rbox(W - 0.1, 0.02, D - 0.1, 0.008), '#d9c79f', 0, 0.01, 0);
    for (const sx of [-1, 1]) part(g, box(0.035, 0.022, D - 0.1), '#212121', sx * (W / 2 - 0.07), 0.011, 0, { outline: false });
    for (const sz of [-1, 1]) part(g, box(W - 0.1, 0.022, 0.035), '#212121', 0, 0.011, sz * (D / 2 - 0.07), { outline: false });
    for (let i = 0; i < 14; i++) part(g, box(W - 0.2, 0.0215, 0.003), '#c4b088', 0, 0.011, -0.36 + i * 0.055, { outline: false });
    part(g, rbox(0.42, 0.06, 0.42, 0.03), '#1c1c1c', 0.0, 0.05, 0.12);
    // The low table and what's on it.
    const tz = -0.3;
    part(g, rbox(0.56, 0.03, 0.28, 0.01), LACQUER, 0, 0.3, tz);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.03, 0.28, 0.03), LACQUER, sx * 0.24, 0.15, tz + sz * 0.1, { outline: false });
    part(g, rbox(0.24, 0.015, 0.16, 0.006), '#3e2723', -0.1, 0.322, tz);
    for (let i = 0; i < 3; i++) {
      const band = part(g, rbox(0.07, 0.012, 0.13, 0.004), '#161616', -0.17 + i * 0.07, 0.336, tz);
      for (const dz of [-0.03, 0.03]) part(band, box(0.072, 0.013, 0.008), '#f5f5f5', 0, 0.0005, dz, { outline: false });
    }
    for (let i = 0; i < 4; i++) {
      part(g, ball(0.012), '#111111', 0.07 + (i % 2) * 0.04, 0.34, tz - 0.04 + Math.floor(i / 2) * 0.05, { outline: false }).scale.set(1.3, 0.5, 0.8);
      part(g, box(0.008, 0.002, 0.03), '#111111', 0.07 + (i % 2) * 0.04, 0.337, tz - 0.02 + Math.floor(i / 2) * 0.05, { outline: false });
    }
    part(g, rbox(0.14, 0.07, 0.08, 0.01), '#eceff1', 0.18, 0.35, tz + 0.02);
    glass(g, cyl(0.025, 0.025, 0.16, 12), 0.2, 0.395, tz - 0.08);
    for (let i = 0; i < 3; i++) part(g, cyl(0.022, 0.018, 0.06, 10), '#fafafa', 0.27, 0.345 + i * 0.012, tz + 0.08, { outline: false });
    // The bamboo staff leaning on the wall behind.
    rod(g, new THREE.Vector3(0.36, 0.02, 0.05), new THREE.Vector3(0.4, 1.32, -0.44), 0.016, '#b5a36a');
    for (let i = 1; i < 6; i++) part(g, cyl(0.019, 0.019, 0.01, 10), '#8d7d4f', 0.36 + (0.04 * i) / 6, 0.02 + (1.3 * i) / 6, 0.05 - (0.49 * i) / 6, { rx: -0.36, outline: false });
  },

  /**
   * The 조객 접수대 at the door: a table under a white cloth, the guest book (조객록) open to today's
   * page and turned to the mourners, sign pens, a black ribbon pin tray, a bud vase, a little sign,
   * and the condolence box (賻儀) in black lacquer with its slot and lock, white envelopes by it. The
   * staff stand on the hall side; greeting each mourner: a bow, then a hand opened to the book (usher).
   */
  morGuestDesk(g, W, _D, _c, _def, _ctx, out) {
    const top = 0.76;
    const d = 0.56;
    const z = -0.06;
    part(g, rbox(W - 0.12, top, d, 0.012), CLOTH, 0, top / 2, z);
    for (let i = 0; i < 11; i++) part(g, box(0.006, top - 0.06, 0.004), '#eeeeee', -W / 2 + 0.16 + i * ((W - 0.32) / 10), (top - 0.06) / 2 + 0.03, z - d / 2 - 0.002, { outline: false });
    part(g, box(W - 0.12, 0.05, 0.004), '#212121', 0, top - 0.05, z - d / 2 - 0.003, { outline: false });
    // The guest book, turned to the mourners (the table's back, -z).
    const book = new THREE.Group();
    book.position.set(-0.18, top, z - 0.04);
    book.rotation.y = Math.PI;
    g.add(book);
    part(book, rbox(0.42, 0.02, 0.28, 0.006), '#1c1c1c', 0, 0.01, 0);
    part(book, box(0.4, 0.008, 0.26), '#fbf8f0', 0, 0.024, 0, { outline: false });
    const page = picture(book, painted('mor-guestbook', 256, 160, paintGuestBook), 0.39, 0.25, 0, 0.029, 0, '#f4f4f4');
    page.rotation.x = -Math.PI / 2;
    // Pens in their holder, a pen lying on the book.
    part(g, cyl(0.03, 0.03, 0.08, 12), '#424242', 0.12, top + 0.04, z - 0.2);
    for (let i = 0; i < 3; i++) rod(g, new THREE.Vector3(0.12, top + 0.06, z - 0.2), new THREE.Vector3(0.12 + (i - 1) * 0.015, top + 0.16, z - 0.2 - (i % 2) * 0.01), 0.005, '#111111');
    rod(g, new THREE.Vector3(-0.08, top + 0.036, z - 0.13), new THREE.Vector3(-0.02, top + 0.036, z - 0.0), 0.005, '#111111');
    // The condolence box with its slot, its label to the mourners, the envelopes.
    const bx = W / 2 - 0.3;
    part(g, rbox(0.3, 0.32, 0.26, 0.012), LACQUER, bx, top + 0.16, z - 0.03);
    part(g, box(0.16, 0.006, 0.012), '#000000', bx, top + 0.322, z - 0.03, { outline: false });
    part(g, box(0.2, 0.012, 0.03), BRASS, bx, top + 0.322, z - 0.03, { outline: false });
    const plate = new THREE.Group();
    plate.position.set(bx, top + 0.17, z - 0.161);
    plate.rotation.y = Math.PI;
    g.add(plate);
    const lbl = painted('mor-buui', 64, 128, (c) => {
      c.fillStyle = LACQUER;
      c.fillRect(0, 0, 64, 128);
      c.strokeStyle = '#c9a43a';
      c.lineWidth = 3;
      c.strokeRect(6, 6, 52, 116);
      vtext(c, '賻儀', 32, 42, 46, 38, '#d8b65a');
    });
    picture(plate, lbl, 0.1, 0.2, 0, 0, 0, '#ffffff');
    part(g, box(0.03, 0.04, 0.012), BRASS, bx, top + 0.25, z + 0.104, { outline: false });
    for (let i = 0; i < 6; i++) part(g, box(0.17, 0.003, 0.09), '#ffffff', bx - 0.3, top + 0.003 + i * 0.003, z - 0.17 + (i % 2) * 0.004, { ry: (i % 3) * 0.03, outline: false });
    label(g, '부 의', 0.06, 0.02, bx - 0.3, top + 0.022, z - 0.17, '#ffffff', '#212121').rotation.set(-Math.PI / 2, 0, Math.PI);
    // The ribbon pins, the bud vase, the little sign.
    part(g, rbox(0.16, 0.015, 0.1, 0.006), '#eceff1', -0.6, top + 0.008, z - 0.16);
    for (let i = 0; i < 6; i++) part(g, ball(0.012), '#111111', -0.65 + (i % 3) * 0.05, top + 0.022, z - 0.18 + Math.floor(i / 3) * 0.04, { outline: false }).scale.set(1.3, 0.5, 0.8);
    glass(g, cyl(0.022, 0.018, 0.14, 12), -0.68, top + 0.07, z + 0.12);
    rod(g, new THREE.Vector3(-0.68, top + 0.02, z + 0.12), new THREE.Vector3(-0.67, top + 0.22, z + 0.12), 0.004, STEM);
    mum(g, -0.67, top + 0.24, z + 0.12, 0.034);
    const sign = new THREE.Group();
    sign.position.set(-0.42, top, z - 0.18);
    sign.rotation.y = Math.PI;
    g.add(sign);
    part(sign, box(0.22, 0.1, 0.012), '#212121', 0, 0.06, 0, { rx: -0.25 });
    label(sign, '조 문 객 접 수', 0.2, 0.06, 0, 0.06, 0.008, '#212121', '#ffffff').rotation.x = -0.25;
    const bookAt = marker(g, -0.18, top + 0.04, z - 0.04);
    out.work = bookAt;
    out.spots = { '*': at(spot(g, 'stand', 0.05, 0, 0.55, Math.PI), bookAt, 'usher') };
  },

  /**
   * The 빈소 board in the lobby: a tall black stand with a portrait screen — 빈소 안내, a white
   * chrysanthemum, 특1호실, the name, the age, the chief mourner, the 입관, the 발인 and the burial
   * place, 「삼가 고인의 명복을 빕니다」 — and printed notices in a holder at its foot. A notice put up:
   * stood at it, tapping on the screen, its keypad up over the bottom with the line being typed.
   */
  morInfoKiosk(g, _W, _D, _c, _def, _ctx, out) {
    part(g, rbox(0.62, 0.04, 0.42, 0.015), '#212121', 0, 0.02, -0.05);
    part(g, rbox(0.12, 0.7, 0.08, 0.02), '#2b2b2b', 0, 0.38, -0.12);
    part(g, rbox(0.7, 1.08, 0.08, 0.02), '#1a1a1a', 0, 1.27, -0.1);
    const face = picture(g, painted('mor-board', 256, 416, paintBoard), 0.62, 1.0, 0, 1.27, -0.058, '#ffffff');
    face.renderOrder = 1;
    part(g, box(0.2, 0.02, 0.01), '#424242', 0, 0.75, -0.055, { outline: false });
    // The notices' holder.
    part(g, box(0.26, 0.24, 0.05), '#424242', 0, 0.28, -0.04);
    for (let i = 0; i < 3; i++) part(g, box(0.2, 0.27, 0.003), '#fafafa', -0.04 + i * 0.04, 0.32, -0.005 + i * 0.004, { rz: (i - 1) * 0.04, outline: false });
    label(g, '부고 안내', 0.14, 0.03, 0, 0.36, 0.008, '#fafafa', '#212121');
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    picture(use, painted('mor-keypad', 256, 112, paintKeypad), 0.6, 0.26, 0, 0.92, -0.052, '#ffffff').renderOrder = 2;
    const cursor = glowing(use, box(0.004, 0.02, 0.002), '#ffffff', -0.08, 1.02, -0.05);
    const tap = marker(g, 0, 0.98, -0.04);
    out.work = tap;
    out.spots = { '*': at(spot(g, 'stand', 0, 0, 0.42, Math.PI), tap, 'board') };
    out.animate = (t) => {
      cursor.visible = Math.sin(t * 6) > 0;
    };
  },

  /**
   * A 접객실 table: a folding table under a white disposable cover, laid for mourners as they are in a
   * Korean funeral hall — a bowl of 육개장 and of rice at each place with a spoon and chopsticks and a
   * paper cup, and down the middle 편육, 떡, kimchi, a plate of fruit, peanuts, water and a bottle of
   * soju. Set: stood at it, one place laid a dish at a time (tinker, from dish to dish).
   */
  morMealTable(g, W, _D, _c, _def, _ctx, out) {
    const top = 0.72;
    const d = 0.76;
    for (const sx of [-1, 1]) {
      rod(g, new THREE.Vector3(sx * (W / 2 - 0.15), 0, -0.3), new THREE.Vector3(sx * (W / 2 - 0.15), top - 0.02, -0.25), 0.015, '#9e9e9e');
      rod(g, new THREE.Vector3(sx * (W / 2 - 0.15), 0, 0.3), new THREE.Vector3(sx * (W / 2 - 0.15), top - 0.02, 0.25), 0.015, '#9e9e9e');
    }
    part(g, rbox(W - 0.08, 0.03, d, 0.008), '#8d6e63', 0, top - 0.015, 0);
    part(g, rbox(W - 0.06, 0.006, d + 0.02, 0.003), '#ffffff', 0, top + 0.003, 0);
    for (const sz of [-1, 1]) part(g, box(W - 0.06, 0.12, 0.003), '#f6f6f6', 0, top - 0.06, sz * (d / 2 + 0.01), { outline: false });
    const T = top + 0.006;
    // A place: soup, rice, spoon and chopsticks, a cup. `s` is which side (+1 the near, the table's +z).
    const place = (p: THREE.Object3D, x: number, s: number) => {
      const z = s * 0.24;
      const items: THREE.Group[] = [];
      const item = () => {
        const it = new THREE.Group();
        p.add(it);
        items.push(it);
        return it;
      };
      const soup = item();
      part(soup, cyl(0.07, 0.05, 0.065, 18), '#f4f1ea', x - 0.08, T + 0.033, z);
      part(soup, cyl(0.064, 0.064, 0.004, 18), '#b23a22', x - 0.08, T + 0.06, z, { outline: false });
      const r = seeded(Math.round(x * 100 + s * 7 + 50));
      for (let i = 0; i < 5; i++) part(soup, box(0.03, 0.004, 0.008), i % 2 ? '#6d8b3a' : '#7b4a2a', x - 0.08 + (r() - 0.5) * 0.08, T + 0.063, z + (r() - 0.5) * 0.08, { ry: r() * 3, outline: false });
      const rice = item();
      part(rice, cyl(0.055, 0.04, 0.05, 16), '#f4f1ea', x + 0.08, T + 0.025, z);
      part(rice, ball(0.05), '#ffffff', x + 0.08, T + 0.045, z, { outline: false }).scale.set(1, 0.45, 1);
      const cutlery = item();
      rod(cutlery, new THREE.Vector3(x + 0.18, T + 0.004, z - s * 0.08), new THREE.Vector3(x + 0.18, T + 0.004, z + s * 0.1), 0.004, '#d7ccc8');
      rod(cutlery, new THREE.Vector3(x + 0.2, T + 0.004, z - s * 0.08), new THREE.Vector3(x + 0.2, T + 0.004, z + s * 0.1), 0.004, '#d7ccc8');
      rod(cutlery, new THREE.Vector3(x + 0.225, T + 0.004, z - s * 0.06), new THREE.Vector3(x + 0.225, T + 0.004, z + s * 0.08), 0.004, CHROME);
      part(cutlery, ball(0.016), CHROME, x + 0.225, T + 0.006, z - s * 0.07, { outline: false }).scale.set(1, 0.3, 1.4);
      const cup = item();
      part(cup, cyl(0.03, 0.024, 0.08, 14), '#ffffff', x - 0.2, T + 0.04, z + s * 0.03);
      return items;
    };
    // Down the middle: 편육, 떡, kimchi, fruit, peanuts, the bottles.
    const plate = (x: number, z: number, r = 0.09) => part(g, cyl(r, r * 0.8, 0.015, 20), '#ffffff', x, T + 0.008, z);
    plate(-0.42, 0);
    for (let i = 0; i < 7; i++) part(g, box(0.07, 0.012, 0.035), i % 2 ? '#d9a9a0' : '#cf9a90', -0.44 + (i % 3) * 0.02, T + 0.02 + Math.floor(i / 3) * 0.008, -0.04 + i * 0.012, { ry: 0.3, outline: false });
    plate(-0.15, 0.0, 0.08);
    for (let i = 0; i < 8; i++) part(g, rbox(0.035, 0.02, 0.03, 0.008), i % 3 === 0 ? '#f8bbd0' : i % 3 === 1 ? '#ffffff' : '#c5e1a5', -0.18 + (i % 3) * 0.035, T + 0.026, -0.03 + Math.floor(i / 3) * 0.033, { outline: false });
    plate(0.12, 0.0, 0.07);
    for (let i = 0; i < 6; i++) part(g, box(0.035, 0.015, 0.025), i % 2 ? '#d84315' : '#ef6c00', 0.1 + (i % 3) * 0.025, T + 0.022, -0.02 + Math.floor(i / 3) * 0.03, { ry: i, outline: false });
    plate(0.38, 0.0, 0.09);
    for (let i = 0; i < 4; i++) part(g, ball(0.032), '#fb8c00', 0.36 + (i % 2) * 0.05, T + 0.045, -0.025 + Math.floor(i / 2) * 0.05, { outline: false });
    part(g, cyl(0.04, 0.03, 0.03, 12), '#ffffff', 0.58, T + 0.015, 0.02);
    for (let i = 0; i < 6; i++) part(g, ball(0.009), '#d7a86e', 0.57 + (i % 3) * 0.012, T + 0.033, 0.01 + Math.floor(i / 3) * 0.015, { outline: false });
    part(g, cyl(0.03, 0.032, 0.18, 14), '#2e7d32', 0.72, T + 0.09, -0.02);
    part(g, cyl(0.013, 0.03, 0.06, 12), '#2e7d32', 0.72, T + 0.21, -0.02, { outline: false });
    part(g, cyl(0.014, 0.014, 0.012, 10), '#43a047', 0.72, T + 0.246, -0.02, { outline: false });
    part(g, box(0.05, 0.05, 0.002), '#e8f5e9', 0.72, T + 0.1, 0.012, { outline: false });
    glass(g, cyl(0.03, 0.03, 0.2, 14), -0.72, T + 0.1, 0.02);
    part(g, cyl(0.016, 0.016, 0.02, 10), '#1565c0', -0.72, T + 0.21, 0.02, { outline: false });
    // The places: both on the far side; the near left; the near right laid while it's used.
    place(g, -0.42, -1);
    place(g, 0.45, -1);
    place(g, -0.42, 1);
    const idle = new THREE.Group();
    g.add(idle);
    out.idle = idle;
    place(idle, 0.45, 1);
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const laying = place(use, 0.45, 1);
    const at0 = [new THREE.Vector3(0.37, T + 0.07, 0.24), new THREE.Vector3(0.53, T + 0.07, 0.24), new THREE.Vector3(0.65, T + 0.04, 0.24), new THREE.Vector3(0.25, T + 0.08, 0.27)];
    const hands = marker(g, 0.45, T + 0.06, 0.22);
    out.work = hands;
    out.spots = { '*': at(spot(g, 'stand', 0.45, 0, 0.6, Math.PI), hands, 'tinker') };
    out.animate = (t) => {
      // A dish every 3 s, the hands at it as it goes down; a look over the place at the end.
      const u = (t / 14) % 1;
      const n = Math.floor(u / 0.22);
      laying.forEach((it, i) => (it.visible = i < n || (i === n && (u % 0.22) > 0.13)));
      const target = n < 4 ? at0[n] : new THREE.Vector3(0.45, T + 0.06, 0.2);
      hands.position.lerp(target, 0.08);
    };
  },

  /**
   * The 수의 table in the preparation room: a long low table under a white cloth, the hemp of the
   * shroud laid out on it, a stack of pieces already folded, an open paulownia box with its label
   * (대마 수의 · 안동포) and the small things folded in it — the 버선, the hand covers — a bundle of hemp
   * ties, a roll of 한지, scissors and a tape measure, a card of the order they go on, and a white
   * chrysanthemum. Prepared: each piece smoothed out, folded in half and set on the stack (shroud).
   */
  morShroudTable(g, W, _D, _c, _def, _ctx, out) {
    const top = 0.78;
    const d = 0.7;
    const z = -0.1;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.05, top - 0.03, 0.05), '#a1887f', sx * (W / 2 - 0.1), (top - 0.03) / 2, z + sz * (d / 2 - 0.06));
    part(g, rbox(W - 0.06, 0.04, d, 0.012), '#c9a77c', 0, top - 0.02, z);
    part(g, rbox(W - 0.1, 0.006, d - 0.04, 0.003), '#fdfdfb', 0, top + 0.003, z);
    part(g, rbox(W - 0.24, 0.02, d - 0.12, 0.006), '#b08f66', 0, 0.16, z);
    for (let i = 0; i < 3; i++) part(g, rbox(0.34, 0.12, 0.26, 0.01), '#e2cba6', -0.6 + i * 0.4, 0.23, z);
    const T = top + 0.006;
    // The open box of the 수의's small things.
    const bx = 0.6;
    const bz = z - 0.08;
    part(g, box(0.5, 0.012, 0.36), PAULOWNIA, bx, T + 0.006, bz);
    for (const sz of [-1, 1]) part(g, box(0.5, 0.12, 0.012), PAULOWNIA, bx, T + 0.06, bz + sz * 0.174);
    for (const sx of [-1, 1]) part(g, box(0.012, 0.12, 0.36), PAULOWNIA, bx + sx * 0.244, T + 0.06, bz);
    part(g, box(0.5, 0.012, 0.36), shade(PAULOWNIA, 0.95), bx, T + 0.2, bz - 0.24, { rx: -1.2 });
    label(g, '대마 수의 · 안동포', 0.3, 0.05, bx, T + 0.06, bz + 0.181, PAULOWNIA, '#4e342e');
    for (let i = 0; i < 3; i++) part(g, box(0.2, 0.025, 0.13), i % 2 ? HEMP : shade(HEMP, 0.96), bx - 0.1, T + 0.025 + i * 0.025, bz - 0.06);
    // The 버선 and the hand covers.
    for (const sx of [-1, 1]) {
      part(g, rbox(0.06, 0.03, 0.14, 0.02), '#fafafa', bx + 0.08 + sx * 0.04, T + 0.03, bz + 0.07);
      part(g, ball(0.03), '#fafafa', bx + 0.08 + sx * 0.04, T + 0.03, bz + 0.0, { outline: false }).scale.set(0.9, 0.6, 0.8);
    }
    part(g, rbox(0.1, 0.02, 0.09, 0.01), HEMP, bx + 0.12, T + 0.025, bz - 0.09);
    // The ties, the 한지, scissors, a tape measure, the card, the flower.
    for (let i = 0; i < 6; i++) rod(g, new THREE.Vector3(-0.2 + i * 0.012, T + 0.006, z - 0.3), new THREE.Vector3(0.12 + i * 0.012, T + 0.006, z - 0.27), 0.004, '#cdbb92');
    part(g, cyl(0.05, 0.05, 0.4, 16), '#fbfaf5', 0.1, T + 0.05, z - 0.18, { rz: Math.PI / 2 });
    for (const sx of [-1, 1]) part(g, box(0.008, 0.004, 0.1), STEEL, 0.32 + sx * 0.008, T + 0.004, z + 0.14, { ry: 0.4 + sx * 0.1, outline: false });
    part(g, ring(0.014, 0.004), BLACK, 0.3, T + 0.004, z + 0.2, { rx: Math.PI / 2, outline: false });
    part(g, cyl(0.035, 0.035, 0.02, 14), '#fbc02d', -0.85, T + 0.01, z + 0.18);
    const card = new THREE.Group();
    card.position.set(-0.85, T, z - 0.22);
    g.add(card);
    part(card, box(0.16, 0.22, 0.006), '#ffffff', 0, 0.1, 0, { rx: -0.25 });
    const cardTex = painted('mor-order', 64, 96, (c) => {
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, 64, 96);
      text(c, '수의 순서', 32, 10, 9, '#212121', 'center');
      ['바지', '저고리', '두루마기', '버선', '악수', '멱목'].forEach((s, i) => text(c, `${i + 1}. ${s}`, 8, 26 + i * 12, 8, '#455a64', 'left', false));
    });
    picture(card, cardTex, 0.15, 0.21, 0, 0.1, 0.004, '#f4f4f4').rotation.x = -0.25;
    glass(g, cyl(0.022, 0.018, 0.14, 12), -0.62, T + 0.07, z - 0.25);
    rod(g, new THREE.Vector3(-0.62, T + 0.02, z - 0.25), new THREE.Vector3(-0.61, T + 0.22, z - 0.25), 0.004, STEM);
    mum(g, -0.61, T + 0.24, z - 0.25, 0.034);
    // The cloth: flat when nobody's at it, folded piece by piece while it's prepared.
    const P = new THREE.Vector3(0.0, T + 0.002, z + 0.13);
    const idle = new THREE.Group();
    g.add(idle);
    out.idle = idle;
    const flat = frameAt(idle, P, Math.PI);
    part(flat, box(SHROUD.width, 0.004, SHROUD.half * 2), HEMP, 0, 0.002, 0, { outline: false });
    const st = SHROUD.stack;
    for (let i = 0; i < 4; i++) part(flat, box(SHROUD.width, 0.008, SHROUD.half), i % 2 ? HEMP : shade(HEMP, 0.97), st.side + (i % 2) * 0.006, st.up + 0.004 + i * 0.008, st.ahead, { outline: false });
    const use = new THREE.Group();
    g.add(use);
    out.inUse = use;
    const kit = clothKit(use, P, Math.PI, HEMP, 4);
    const mid = marker(g, P.x, P.y, P.z);
    out.work = mid;
    const spots: Record<string, Spot> = { '*': at(spot(g, 'stand', P.x, 0, 0.6, Math.PI), mid, 'shroud') };
    out.spots = spots;
    out.animate = (t) => kit.show(t, phaseAt(spots['*']));
  },

  /**
   * The cabinet of funeral things: dark wood with two glass doors — on its shelves the red 명정
   * rolled, the casket covers folded, the boxed 수의 by size (대 · 중 · 소), packs of 한지, rolls of the
   * white binding cloth and boxes of 버선 — drawers under, labelled. Fetching from it: the doors open,
   * a box of 수의 drawn out (rummage).
   */
  morShroudCabinet(g, W, _D, _c, _def, _ctx, out) {
    const w = W - 0.12;
    const dz = 0.42;
    const z = -0.5 + dz / 2 + 0.02;
    const front = z + dz / 2;
    part(g, rbox(w, 1.92, dz, 0.015), '#3e2723', 0, 0.96, z);
    part(g, box(w - 0.06, 1.3, 0.01), '#2a1a16', 0, 1.2, z - dz / 2 + 0.03, { outline: false });
    for (let i = 0; i < 5; i++) part(g, box(w - 0.06, 0.02, dz - 0.06), '#4e342e', 0, 0.56 + i * 0.32, z, { outline: false });
    // The drawers.
    for (let i = 0; i < 2; i++) {
      part(g, rbox(w - 0.08, 0.2, 0.02, 0.006), '#5d4037', 0, 0.14 + i * 0.24, front - 0.005);
      part(g, box(0.12, 0.016, 0.016), BRASS, 0, 0.18 + i * 0.24, front + 0.01, { outline: false });
      label(g, i ? '한지' : '결관 끈', 0.14, 0.035, 0, 0.11 + i * 0.24, front + 0.007, '#5d4037', '#fff8e1');
    }
    label(g, '장 례 용 품', 0.4, 0.06, 0, 1.885, front + 0.002, '#3e2723', '#d8b65a');
    // Shelf 1 (top): 명정 rolled, covers folded.
    let y = 1.84 - 0.3 + 0.02;
    for (let i = 0; i < 3; i++) part(g, cyl(0.03, 0.03, 0.34, 14), '#9e1c1c', -0.2 + i * 0.07, y + 0.035, z, { rx: Math.PI / 2 });
    for (let i = 0; i < 3; i++) part(g, box(0.28, 0.04, 0.28), i % 2 ? '#f2efe6' : '#e9e3d3', 0.2, y + 0.02 + i * 0.04, z);
    // Shelf 2: boxed 수의.
    y = 1.2 + 0.02;
    const boxes = (['대', '중', '소'] as const).map((s, i) => {
      const b = new THREE.Group();
      b.position.set(-0.26 + i * 0.26, y, z);
      g.add(b);
      part(b, rbox(0.24, 0.22 - i * 0.03, 0.32, 0.006), '#f7f3ea', 0, (0.22 - i * 0.03) / 2, 0);
      part(b, box(0.24, 0.025, 0.322), '#8d6e63', 0, 0.06, 0, { outline: false });
      label(b, `수의 (${s})`, 0.18, 0.04, 0, 0.13 - i * 0.03, 0.162, '#f7f3ea', '#3e2723');
      return b;
    });
    // Shelf 3: hemp folded, 한지 packs.
    y = 0.88 + 0.02;
    for (let i = 0; i < 4; i++) part(g, box(0.3, 0.035, 0.26), i % 2 ? HEMP : shade(HEMP, 0.95), -0.18, y + 0.018 + i * 0.035, z);
    for (let i = 0; i < 3; i++) part(g, box(0.26, 0.05, 0.3), '#fdfbf4', 0.2, y + 0.025 + i * 0.05, z, { ry: (i - 1) * 0.04 });
    // Shelf 4: binding cloth on rolls, boxes of 버선.
    y = 0.56 + 0.02;
    for (let i = 0; i < 4; i++) part(g, cyl(0.05, 0.05, 0.08, 16), '#fafafa', -0.3 + i * 0.12, y + 0.05, z + 0.04);
    part(g, rbox(0.3, 0.12, 0.2, 0.006), '#e0e0e0', 0.22, y + 0.06, z - 0.03);
    // The glass doors.
    const doors = [-1, 1].map((side) => {
      const hinge = new THREE.Group();
      hinge.position.set(side * (w / 2), 0, front + 0.012);
      hinge.userData.swing = side;
      g.add(hinge);
      const leaf = new THREE.Group();
      leaf.position.x = -side * (w / 4);
      hinge.add(leaf);
      const dw = w / 2 - 0.01;
      for (const sx of [-1, 1]) part(leaf, box(0.035, 1.3, 0.02), '#4e342e', sx * (dw / 2 - 0.018), 1.2, 0);
      for (const yy of [0.55, 1.85]) part(leaf, box(dw, 0.035, 0.02), '#4e342e', 0, yy, 0);
      glass(leaf, box(dw - 0.06, 1.26, 0.006), 0, 1.2, 0);
      part(leaf, cyl(0.008, 0.008, 0.1, 8), BRASS, -side * (dw / 2 - 0.05), 1.15, 0.02, { outline: false });
      return hinge;
    });
    out.doors = doors;
    const reach = marker(g, 0, 1.3, z + 0.08);
    out.work = reach;
    out.spots = { '*': at(spot(g, 'stand', 0, 0, 0.34, Math.PI), reach, 'rummage') };
    out.animate = (t) => {
      // The big box drawn out and slid back.
      const k = 0.5 - 0.5 * Math.cos(Math.min(1, ((t / 8) % 1) * 2) * Math.PI);
      boxes[0].position.z = z + 0.14 * k;
    };
  },

  // -------------------------------------------------------------------------------------------
  // The staff's side and the corridor (2026-11-04, the layout audit).

  /**
   * A bank of 안치 냉장고 (3 × 1): three stainless doors side by side in a white insulated front, each with its heavy lever latch,
   * its name card holder (a card in the middle one) and its temperature read-out (2℃), the compressor's grille along the top.
   */
  morColdChamber(g, W) {
    const H = 2.1;
    part(g, box(W - 0.04, H, 0.7), '#eef1f3', 0, H / 2, -0.12);
    part(g, box(W - 0.08, 0.22, 0.02), '#b0bec5', 0, H - 0.14, 0.235, { outline: false });
    for (let i = 0; i < 12; i++) part(g, box(0.012, 0.16, 0.004), '#78909c', -W / 2 + 0.2 + i * ((W - 0.4) / 11), H - 0.14, 0.247, { outline: false });
    for (let k = 0; k < 3; k++) {
      const x = -W / 2 + 0.5 + k;
      part(g, rbox(0.86, 1.6, 0.05, 0.01), STEEL, x, 0.95, 0.25);
      part(g, rbox(0.06, 0.26, 0.05, 0.01), '#546e7a', x + 0.33, 1.0, 0.29);
      part(g, rbox(0.04, 0.2, 0.06, 0.015), '#263238', x + 0.33, 0.95, 0.32, { rz: 0.25 });
      part(g, rbox(0.28, 0.16, 0.012, 0.004), '#eceff1', x - 0.1, 1.45, 0.282);
      if (k === 1) label(g, '故 김○○', 0.22, 0.06, x - 0.1, 1.45, 0.29, '#ffffff', '#212121');
      part(g, rbox(0.16, 0.08, 0.02, 0.006), '#102027', x - 0.1, 1.68, 0.282);
      label(g, '2℃', 0.08, 0.05, x - 0.1, 1.68, 0.294, '#102027', '#69f0ae');
      for (const y of [0.35, 1.6]) part(g, rbox(0.05, 0.12, 0.04, 0.01), CHROME, x - 0.4, y, 0.28);
      label(g, `${k + 1}`, 0.08, 0.08, x + 0.33, 1.25, 0.29, '#ffffff', '#37474f');
    }
  },

  /**
   * The 운구차 (2 × 4): a long black limousine hearse, its nose to the street, the tall rear section with frosted side windows and the
   * gold 근조 emblem, the tailgate at the 안치실 door; chrome along its waist, the plates.
   */
  morHearse(g, _W, D) {
    const wd = 1.8;
    const nose = D / 2 - 0.08;
    const tail = -D / 2 + 0.12;
    const L = nose - tail;
    const zc = (nose + tail) / 2;
    const BODY = '#1b1b1d';
    // The body, the bonnet, the tall rear.
    part(g, rbox(wd, 0.62, L, 0.12), BODY, 0, 0.6, zc);
    part(g, rbox(wd - 0.06, 0.5, L - 1.25, 0.1), BODY, 0, 1.12, zc - 0.55);
    part(g, rbox(wd - 0.1, 0.36, 0.8, 0.1), BODY, 0, 1.06, nose - 0.95);
    part(g, box(wd - 0.2, 0.42, 0.02), '#2d3e50', 0, 1.13, nose - 0.55, { rx: -0.5, outline: false });
    for (const s of [-1, 1]) {
      const sx = s * (wd / 2 + 0.003);
      part(g, box(0.01, 0.34, 0.6), '#2d3e50', sx, 1.12, nose - 0.95, { outline: false });
      part(g, box(0.01, 0.32, L - 1.6), '#d7dde0', s * (wd / 2 - 0.03 + 0.004), 1.17, zc - 0.65, { outline: false });
      part(g, box(0.012, 0.04, L - 0.4), CHROME, sx, 0.78, zc, { outline: false });
      part(g, cyl(0.12, 0.12, 0.012, 18), BRASS, sx + s * 0.004, 0.62, zc - 0.65, { rz: Math.PI / 2 });
      label(g, '근조', 0.14, 0.07, sx + s * 0.012, 0.62, zc - 0.65, BRASS, '#1b1b1d', s > 0 ? Math.PI / 2 : -Math.PI / 2);
    }
    // The front: grille, lamps, plate.
    part(g, rbox(wd - 0.3, 0.2, 0.04, 0.02), CHROME, 0, 0.66, nose + 0.01);
    for (const s of [-1, 1]) part(g, rbox(0.28, 0.1, 0.03, 0.02), '#fffde7', s * 0.62, 0.72, nose + 0.012);
    label(g, '70허 4417', 0.4, 0.1, 0, 0.46, nose + 0.03, '#ffffff', '#111111');
    // The tailgate.
    part(g, box(wd - 0.2, 0.8, 0.012), '#26262a', 0, 1.0, tail - 0.006, { outline: false });
    part(g, box(wd - 0.5, 0.26, 0.006), '#d7dde0', 0, 1.18, tail - 0.013, { outline: false });
    label(g, '70허 4417', 0.4, 0.1, 0, 0.5, tail - 0.02, '#ffffff', '#111111', Math.PI);
    // The wheels.
    for (const z of [nose - 0.65, tail + 0.7])
      for (const s of [-1, 1]) {
        part(g, cyl(0.32, 0.32, 0.22, 20), BLACK, s * (wd / 2 - 0.1), 0.32, z, { rz: Math.PI / 2 });
        part(g, cyl(0.19, 0.19, 0.225, 14), CHROME, s * (wd / 2 - 0.1), 0.32, z, { rz: Math.PI / 2, outline: false });
      }
  },

  /**
   * The viewing room's window onto the 입관 (2 × 1), set in the wall: a wide pane in a walnut frame with a sill, the room beyond
   * glimpsed as a pale wash, a cream curtain drawn back to one side, and the plate under it (참관실 · 입관 참관).
   */
  morViewWindow(g, W) {
    const z = -0.46;
    part(g, box(W - 0.2, 1.0, 0.06), WALNUT, 0, 1.45, z - 0.02);
    glass(g, box(W - 0.34, 0.86, 0.01), 0, 1.45, z + 0.015, new THREE.MeshBasicMaterial({ color: '#dfe9ec' }));
    part(g, rbox(W - 0.1, 0.05, 0.16, 0.01), WALNUT, 0, 0.93, z + 0.06);
    part(g, rbox(0.34, 1.05, 0.06, 0.03), '#f3ead8', -W / 2 + 0.32, 1.45, z + 0.07);
    part(g, box(W - 0.1, 0.03, 0.03), CHROME, 0, 2.0, z + 0.08, { outline: false });
    label(g, '입관 참관', 0.36, 0.08, 0.2, 0.84, z + 0.025, WALNUT, '#f3ead8');
  },

  /**
   * Another 빈소's door along the corridor (1 × 1), against the wall: a walnut double door in its frame, the plate over it with the
   * room's number (특2호실) and the brass handles; a small screen beside it with the 故人's name and the 발인 time.
   */
  morSuiteDoor(g, W) {
    const z = -0.46;
    part(g, box(W - 0.04, 2.25, 0.06), '#3e2723', 0, 1.125, z - 0.02);
    for (const s of [-1, 1]) {
      part(g, rbox(0.42, 2.05, 0.04, 0.01), WALNUT, s * 0.22, 1.05, z + 0.02);
      part(g, cyl(0.012, 0.012, 0.22, 8), BRASS, s * 0.04, 1.05, z + 0.06, { outline: false });
    }
    part(g, rbox(0.5, 0.14, 0.02, 0.005), '#212121', 0, 2.38, z + 0.01);
    label(g, '특2호실', 0.4, 0.1, 0, 2.38, z + 0.022, '#212121', '#e0c97a');
  },
};
