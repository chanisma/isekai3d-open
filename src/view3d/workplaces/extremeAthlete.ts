import * as THREE from 'three';
import type { BarOffset, Motion } from '../activity';
import { marker, rod, spot, type Builder, type Spot } from '../parts';
import { ball, box, cyl, part, rbox, textured } from '../toon';
import { BLACK, CHROME, STEEL, caster, glow, glowing, label, litScreen, painted, picture, ring, seeded, text, type Paint } from './doctor';
import { fenceRun } from './busDriver';
import {
  ANCHOR, BELAY, BOULDER, COIL, PACK, RAMP, RENTAL, REPLAY, ROUTE,
  boulderFace, boulderFoot, boulderHold, boulderRound, bounceRound, climbRound, coilRound, footHold, gearCheckRound,
  handHold, packRound, quickdraw, rampAt, rentalRound, replayRound, skateRound, xPhase, type P3,
} from './extremeAthleteMotion';

/**
 * The extreme sports centre drawn as itself (2026-10-27 workplace pipeline, at the user's request:
 * the sports should look like the sports). The rope wall with a top-rope route and a lead route —
 * climbed hold by hold, the rope running from the harness up through the top anchor (or clipped into
 * the quickdraws one by one) and down to the belay device on its floor anchor, lowered off sat back in
 * the harness; the mini halfpipe ridden back and forth on a board that's really under the feet, an
 * air off one coping and a stall on the other deck; the rigging bench where a parachute is flaked,
 * folded and packed into its container, a rope coiled loop by loop, a carabiner's gate clicked and a
 * harness tugged, the expedition map on the pegboard; and the jump plane on the grass, which taxis
 * off, takes off and is gone while the jump's on, lands and turns back in. And what the centre was
 * missing (workFurniture/extremeAthlete.ts): a bouldering wall over its crash mats (a traverse,
 * dropped off onto the mat), an in-ground trampoline pit (bounces, a tuck jump and a back flip, the
 * bed giving under them), the rental counter, the helmet and harness rack and the replay screen.
 * The wind tunnel is furnitureSpace.ts's.
 */

const PLY = '#d9b98a';
const ROPE_A = '#1e88e5';
const ROPE_B = '#ef6c00';
const MAT_BLUE = '#1565c0';
const RUBBER = '#2b2d33';
const NAVY = '#263a5a';
const HOLD_COLORS = ['#e53935', '#fdd835', '#43a047', '#1e88e5', '#8e24aa', '#fb8c00', '#ec407a', '#26c6da', '#212121', '#f5f5f5'];

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
const phaseOf = (s: Spot) => xPhase(s.at.getWorldPosition(tmp));
const scaleOf = (s: Spot) => ((s.at.userData.height as number | undefined) ?? 1.6) / 1.6;
/** A spot stood at, facing `yaw`, with what the hands do there. */
function stoodAt(g: THREE.Object3D, x: number, z: number, yaw: number, motion: Motion, work?: THREE.Object3D): Spot {
  const s = spot(g, 'stand', x, 0, z, yaw);
  s.motion = motion;
  s.work = work;
  return s;
}
/** Where an offset in the user's frame (from `w`, facing `yaw`) is, in the piece's frame. */
function framer(w: THREE.Vector3, yaw: number) {
  const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const left = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  return (o: BarOffset, v = new THREE.Vector3()) => v.copy(w).addScaledVector(left, o.side).addScaledVector(UP, o.up).addScaledVector(fwd, o.ahead);
}
/** A point in a spot's frame, in the piece's (the spot a child of the piece). */
const inPiece = (s: Spot, p: P3, v = new THREE.Vector3()) => v.set(p.x, p.y, p.z).applyQuaternion(s.at.quaternion).add(s.at.position);
/** A unit-long rod (a rope, a line) stretched from `a` to `b` each frame. */
function stretch(m: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3) {
  m.position.copy(a).add(b).multiplyScalar(0.5);
  const d = b.clone().sub(a);
  m.scale.set(1, Math.max(d.length(), 1e-4), 1);
  if (d.lengthSq() > 1e-10) m.quaternion.setFromUnitVectors(UP, d.normalize());
}
const unitRod = (g: THREE.Object3D, r: number, color: string) => part(g, cyl(r, r, 1, 8), color, 0, 0, 0, { outline: false });
/** A rope drawn through points (up to `n` of them), the spare lengths hidden. */
function ropeLine(g: THREE.Object3D, n: number, color: string, r = 0.011) {
  const segs = Array.from({ length: n - 1 }, () => unitRod(g, r, color));
  return (pts: THREE.Vector3[]) => {
    segs.forEach((m, i) => {
      m.visible = i < pts.length - 1;
      if (m.visible) stretch(m, pts[i], pts[i + 1]);
    });
  };
}
/** A shape of its own (not one of toon.ts's shared sizes), disposed with the piece. */
function own(g: THREE.Object3D, geom: THREE.BufferGeometry, color: string, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): THREE.Mesh {
  const m = part(g, geom, color, x, y, z, { outline: false, rx, ry, rz });
  m.userData.ownGeometry = true;
  return m;
}
const group = (g: THREE.Object3D, x: number, y: number, z: number, ry = 0) => {
  const o = new THREE.Group();
  o.position.set(x, y, z);
  o.rotation.y = ry;
  g.add(o);
  return o;
};

/** A climbing hold on a wall (its back on the face; `p.z` its middle off it): a jug, a crimp, a sloper or a pinch. */
function hold(g: THREE.Object3D, p: P3, color: string, size: number, kind: number, turn = 0) {
  const k = ((kind % 4) + 4) % 4;
  const m =
    k === 0 ? part(g, ball(size), color, p.x, p.y, p.z) :
    k === 1 ? part(g, rbox(size * 2.1, size * 0.65, size * 0.9, size * 0.25), color, p.x, p.y, p.z) :
    k === 2 ? part(g, ball(size * 1.15), color, p.x, p.y, p.z) :
    part(g, rbox(size * 0.85, size * 1.9, size * 0.95, size * 0.3), color, p.x, p.y, p.z);
  if (k === 0) m.scale.set(1.15, 0.8, 0.62);
  if (k === 2) m.scale.set(1.25, 0.72, 0.45);
  m.rotation.z = turn;
  // The bolt in its middle.
  part(g, cyl(0.009, 0.009, 0.01, 6), '#3a3a3a', p.x, p.y, p.z - size * 0.55, { rx: Math.PI / 2, outline: false });
  return m;
}
/** A strip of route tape under a hold (the start, the top), with what's written on it. */
function tape(g: THREE.Object3D, p: P3, color: string, word: string, ry: number) {
  label(g, word, 0.09, 0.04, p.x, p.y - 0.085, p.z + 0.03, color, '#ffffff', ry);
}
/** A screw-gate carabiner (an oval loop and its gate), lying in its own xy plane. */
function carabiner(g: THREE.Object3D, x: number, y: number, z: number, color = STEEL, s = 1) {
  const c = group(g, x, y, z);
  const loop = part(c, ring(0.028 * s, 0.005 * s), color, 0, 0, 0, { outline: false });
  loop.scale.set(0.75, 1.25, 1);
  return c;
}
/** A quickdraw hung from a bolt: the hanger, the top carabiner, the sling and the rope-end carabiner below. */
function quickdrawAt(g: THREE.Object3D, p: P3) {
  part(g, rbox(0.03, 0.05, 0.012, 0.006), '#9e9e9e', p.x, p.y, p.z + 0.012);
  carabiner(g, p.x, p.y - 0.035, p.z - 0.01, '#bdbdbd', 0.9);
  part(g, rbox(0.022, 0.06, 0.008, 0.004), '#ff6f00', p.x, p.y - 0.085, p.z - 0.012, { outline: false });
  carabiner(g, p.x, p.y - 0.135, p.z - 0.014, '#90caf9', 0.9);
}

// ---------------------------------------------------------------------------------------------
// What's painted: the wall panels, the ramp's sides, the map, the replay.

/** Plywood wall panels with their T-nut holes, seams and a few chalk smudges (a light grey, or dark for the boulder wall). */
function paintPanel(base: string, dot: string): Paint {
  return (c) => {
    c.fillStyle = base;
    c.fillRect(0, 0, 512, 512);
    const r = seeded(base.length * 97 + 11);
    c.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = 0; i < 26; i++) {
      c.beginPath();
      c.ellipse(r() * 512, r() * 512, 8 + r() * 18, 4 + r() * 8, r() * 3, 0, Math.PI * 2);
      c.fill();
    }
    c.strokeStyle = 'rgba(0,0,0,0.25)';
    c.lineWidth = 2;
    for (const x of [171, 342]) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, 512);
      c.stroke();
    }
    for (const y of [170, 340]) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(512, y);
      c.stroke();
    }
    c.fillStyle = dot;
    for (let y = 14; y < 512; y += 28) for (let x = 14 + ((y / 28) % 2) * 14; x < 512; x += 28) c.fillRect(x - 2, y - 2, 4, 4);
  };
}
/** The ramp's plywood sides (x −2…2 m along, 0…1 m up): grain, the framing screws, spray-painted words. */
const paintRampSide: Paint = (c) => {
  c.fillStyle = PLY;
  c.fillRect(0, 0, 1024, 256);
  const r = seeded(7);
  c.strokeStyle = 'rgba(120,80,40,0.22)';
  for (let i = 0; i < 40; i++) {
    c.beginPath();
    const y = r() * 256;
    c.moveTo(0, y);
    c.bezierCurveTo(300, y + r() * 12 - 6, 700, y + r() * 12 - 6, 1024, y + r() * 10 - 5);
    c.stroke();
  }
  c.fillStyle = 'rgba(60,40,20,0.6)';
  for (let x = 16; x < 1024; x += 64) for (const y of [236, 140]) c.fillRect(x, y, 3, 3);
  // Spray paint low on each quarter-pipe (the flat between has no side).
  c.save();
  c.textAlign = 'center';
  c.font = 'bold 40px Impact, "Arial Black", sans-serif';
  c.lineWidth = 6;
  c.strokeStyle = '#212121';
  c.fillStyle = '#ff4081';
  c.strokeText('XTREME', 946, 228);
  c.fillText('XTREME', 946, 228);
  c.fillStyle = '#00e5ff';
  c.font = 'bold 34px "Malgun Gothic","Apple SD Gothic Neo",sans-serif';
  c.strokeText('익스트림', 80, 226);
  c.fillText('익스트림', 80, 226);
  c.restore();
  for (const [x, y, col] of [[990, 150, '#fdd835'], [40, 160, '#76ff03'], [1000, 100, '#ffffff']] as const) {
    c.fillStyle = col;
    c.beginPath();
    c.arc(x, y, 14, 0, Math.PI * 2);
    c.fill();
  }
};
/** Pegboard: hardboard with its rows of holes. */
const paintPegboard: Paint = (c) => {
  c.fillStyle = '#d7c4a3';
  c.fillRect(0, 0, 512, 256);
  c.fillStyle = '#8d6e63';
  for (let y = 8; y < 256; y += 16) for (let x = 8; x < 512; x += 16) {
    c.beginPath();
    c.arc(x, y, 2.4, 0, Math.PI * 2);
    c.fill();
  }
};
/** The expedition plan pinned on the pegboard: contour lines, the route up the ridge, the camps. */
const paintMap: Paint = (c) => {
  c.fillStyle = '#f3ecd8';
  c.fillRect(0, 0, 512, 384);
  c.strokeStyle = '#b08a5a';
  c.lineWidth = 1.5;
  for (let i = 0; i < 9; i++) {
    c.beginPath();
    c.ellipse(300, 150, 30 + i * 26, 18 + i * 17, -0.4, 0, Math.PI * 2);
    c.stroke();
  }
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.ellipse(300, 150, 42, 26, -0.4, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#d32f2f';
  c.lineWidth = 4;
  c.setLineDash([10, 7]);
  c.beginPath();
  c.moveTo(60, 340);
  c.lineTo(140, 290);
  c.lineTo(200, 250);
  c.lineTo(250, 195);
  c.lineTo(300, 150);
  c.stroke();
  c.setLineDash([]);
  const camps: Array<[number, number, string]> = [[60, 340, 'BC'], [140, 290, 'C1'], [200, 250, 'C2'], [250, 195, 'C3'], [300, 150, '정상']];
  for (const [x, y, s] of camps) {
    c.fillStyle = s === '정상' ? '#d32f2f' : '#1565c0';
    c.beginPath();
    c.moveTo(x, y - 12);
    c.lineTo(x + 9, y + 4);
    c.lineTo(x - 9, y + 4);
    c.fill();
    text(c, s, x + 14, y - 4, 16, '#212121');
  }
  c.fillStyle = '#263a5a';
  c.fillRect(0, 0, 512, 40);
  text(c, '원정 계획 · 남동릉 루트', 12, 20, 20, '#ffffff');
  text(c, 'D-14 · 대원 6명', 500, 20, 16, '#ffcc80', 'right');
  text(c, '고소 적응: BC 3일 → C1 → BC', 300, 362, 14, '#5d4037', 'center', false);
};
/** The gear checklist beside it. */
const paintChecklist: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 256, 352);
  c.fillStyle = '#e65100';
  c.fillRect(0, 0, 256, 40);
  text(c, '장비 점검표', 128, 20, 20, '#ffffff', 'center');
  const rows = ['하네스 버클', '카라비너 게이트', '로프 마모', '헬멧 균열', '주 낙하산', '보조 낙하산', 'AAD 작동'];
  rows.forEach((s, i) => {
    const y = 64 + i * 40;
    c.strokeStyle = '#90a4ae';
    c.strokeRect(14, y - 11, 22, 22);
    if (i < 5) {
      c.strokeStyle = '#2e7d32';
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(18, y);
      c.lineTo(24, y + 7);
      c.lineTo(34, y - 8);
      c.stroke();
      c.lineWidth = 1;
    }
    text(c, s, 48, y, 17, '#37474f', 'left', false);
  });
};
/** Eight frames of a skater's ollie across the screen, the replay bar over it and the timeline under. */
const REPLAY_FRAMES = 8;
const paintReplay: Paint = (c) => {
  const fw = 256;
  for (let f = 0; f < REPLAY_FRAMES; f++) {
    const x0 = f * fw;
    const sky = c.createLinearGradient(0, 0, 0, 160);
    sky.addColorStop(0, '#5e8fbf');
    sky.addColorStop(1, '#a8c8e0');
    c.fillStyle = sky;
    c.fillRect(x0, 0, fw, 160);
    c.fillStyle = '#7d7268';
    c.fillRect(x0, 108, fw, 52);
    // The ramp's wall on the right.
    c.fillStyle = '#6d5f55';
    c.beginPath();
    c.moveTo(x0 + 170, 160);
    c.quadraticCurveTo(x0 + 236, 150, x0 + 240, 60);
    c.lineTo(x0 + 256, 60);
    c.lineTo(x0 + 256, 160);
    c.fill();
    // The skater: along the flat, up the wall, popped off the top, back in.
    const u = f / (REPLAY_FRAMES - 1);
    const px = x0 + 60 + 150 * Math.sin(u * Math.PI * 0.9);
    const py = 118 - 70 * Math.max(0, Math.sin((u - 0.35) * Math.PI * 1.5));
    const tilt = -0.9 * Math.sin(u * Math.PI);
    c.save();
    c.translate(px, py);
    c.rotate(tilt);
    c.strokeStyle = '#1b1b1b';
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(-16, 8);
    c.lineTo(16, 8);
    c.stroke();
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(-11, 12, 3, 0, Math.PI * 2);
    c.arc(11, 12, 3, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#263238';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(-9, 6);
    c.lineTo(-4, -8);
    c.lineTo(0, -24);
    c.lineTo(4, -8);
    c.lineTo(9, 6);
    c.moveTo(0, -24);
    c.lineTo(-14, -30);
    c.moveTo(0, -24);
    c.lineTo(14, -30);
    c.stroke();
    c.fillStyle = '#ef6c00';
    c.beginPath();
    c.arc(0, -32, 6, 0, Math.PI * 2);
    c.fill();
    c.restore();
    c.fillStyle = 'rgba(0,0,0,0.55)';
    c.fillRect(x0, 0, fw, 22);
    text(c, 'REPLAY · 슬로 ×0.25', x0 + 8, 11, 12, '#ffffff');
    text(c, `${String(f + 1).padStart(2, '0')}/08`, x0 + 248, 11, 12, '#ffcc80', 'right');
    c.fillStyle = 'rgba(0,0,0,0.6)';
    c.fillRect(x0, 142, fw, 18);
    c.fillStyle = '#90a4ae';
    c.fillRect(x0 + 10, 150, fw - 20, 3);
    c.fillStyle = '#ff5252';
    c.fillRect(x0 + 10 + (fw - 20) * u - 3, 145, 6, 12);
  }
};

// ---------------------------------------------------------------------------------------------
// The rope wall.

/**
 * The indoor climbing wall: grey plywood panels with their bolt-hole grid against the wall, a black
 * frame and a sign along the top, a volume in the middle with holds of every colour round it. On the
 * left a yellow top-rope route (5.9, its start and top taped) up to a two-bolt anchor with a chain and
 * screw-gates; on the right a red lead route (5.11a) with a quickdraw on each bolt and a lowering
 * anchor. Each rope comes down to a belay device on a floor anchor with a rope bag by it; the
 * rubber floor in front, a chalk bucket and a brush. Climbed hold by hold (the rope from the harness
 * up through the anchor, or clipped draw by draw on lead) and lowered off sat back in the harness.
 */
const climbingWall: Builder = (g, W, D, _c, _def, _ctx, out) => {
  const face = -D / 2 + 0.12;
  const H = 2.94;
  // The panels and the frame round them.
  part(g, box(W - 0.06, H, 0.1), '#ffffff', 0, H / 2, face - 0.05, { material: textured(painted('xwall-light', 512, 512, paintPanel('#c9d2da', '#7d8994'))) });
  for (const sx of [-1, 1]) part(g, rbox(0.06, H + 0.02, 0.14, 0.02), '#263238', sx * (W / 2 - 0.03), H / 2, face - 0.05);
  part(g, rbox(W, 0.08, 0.16, 0.02), '#263238', 0, H - 0.02, face - 0.05);
  label(g, '인공 암벽 · CLIMBING WALL', 0.86, 0.12, 0, H - 0.16, face + 0.003, '#263238', '#ffca28');
  // The rubber floor in front.
  part(g, box(W - 0.04, 0.012, D - 0.14), RUBBER, 0, 0.006, face + (D - 0.14) / 2, { outline: false });
  // A volume in the middle (a wedge standing out of the wall) and holds of every colour round it.
  const vol = own(g, new THREE.CylinderGeometry(0.34, 0.34, 0.5, 3, 1), '#ef5350', 0, 1.55, face + 0.0, Math.PI / 2, 0, 0);
  vol.scale.set(1, 1, 0.5);
  const r = seeded(31);
  for (let i = 0; i < 26; i++) {
    const x = (r() - 0.5) * 0.7;
    const y = 0.25 + r() * 2.45;
    if (Math.abs(y - 1.55) < 0.32 && Math.abs(x) < 0.3) continue;
    hold(g, { x, y, z: face + 0.035 }, HOLD_COLORS[i % HOLD_COLORS.length], 0.028 + r() * 0.02, i, r() * 3);
  }
  for (let i = 0; i < 8; i++) hold(g, { x: (r() - 0.5) * 0.4, y: 1.25 + r() * 0.6, z: face + 0.2 + r() * 0.05 }, HOLD_COLORS[(i * 3) % 10], 0.025, i + 1, r() * 3);
  // The two routes, each in its own frame at the foot of the face (its +z into the wall).
  const route = (x: number, lead: boolean) => {
    const s = spot(g, 'stand', x, 0, face, Math.PI);
    s.motion = lead ? 'xLead' : 'xClimb';
    const at = s.at;
    const col = lead ? '#e53935' : '#fdd835';
    for (let j = 0; j <= ROUTE.levels + 1; j++) hold(at, handHold(j, lead), col, j === ROUTE.levels + 1 ? 0.045 : 0.035, j === ROUTE.levels + 1 ? 0 : j + (lead ? 1 : 0), (j % 3) * 0.6);
    for (let j = 1; j <= ROUTE.levels + 1; j++) hold(at, footHold(j, lead), col, 0.022, 1, j * 0.4);
    tape(at, handHold(0, lead), col, 'S', 0);
    tape(at, handHold(1, lead), col, 'S', 0);
    tape(at, handHold(ROUTE.levels + 1, lead), col, 'TOP', 0);
    label(at, lead ? '중급 5.11a · 선등' : '초급 5.9 · 톱로프', 0.34, 0.07, 0, 0.62, -0.006, col, lead ? '#ffffff' : '#212121', 0);
    // The anchor: two bolts, a chain between them, the screw-gates (or lowering rings) the rope runs through.
    for (const dx of [-0.08, 0.08]) part(at, cyl(0.018, 0.018, 0.02, 10), '#9e9e9e', ANCHOR.x + dx, ANCHOR.y + 0.03, 0.0, { rx: Math.PI / 2, outline: false });
    rod(at, new THREE.Vector3(ANCHOR.x - 0.08, ANCHOR.y + 0.03, -0.012), new THREE.Vector3(ANCHOR.x, ANCHOR.y - 0.02, -0.02), 0.005, '#bdbdbd');
    rod(at, new THREE.Vector3(ANCHOR.x + 0.08, ANCHOR.y + 0.03, -0.012), new THREE.Vector3(ANCHOR.x, ANCHOR.y - 0.02, -0.02), 0.005, '#bdbdbd');
    carabiner(at, ANCHOR.x, ANCHOR.y - 0.03, ANCHOR.z, lead ? '#bdbdbd' : '#ffb300', 1.1);
    if (lead) for (let m = 0; m < ROUTE.levels; m++) quickdrawAt(at, quickdraw(m));
    // The floor anchor, the belay device on it and the rope bag.
    part(at, rbox(0.16, 0.012, 0.12, 0.005), '#757575', BELAY.x, 0.006, BELAY.z + 0.04);
    rod(at, new THREE.Vector3(BELAY.x, 0.01, BELAY.z + 0.04), new THREE.Vector3(BELAY.x, BELAY.y - 0.04, BELAY.z), 0.007, '#bdbdbd');
    part(at, rbox(0.05, 0.09, 0.035, 0.012), lead ? '#424242' : '#9e9e9e', BELAY.x, BELAY.y, BELAY.z);
    part(at, cyl(0.12, 0.14, 0.22, 14), lead ? '#c62828' : '#2e7d32', BELAY.x - 0.22, 0.11, BELAY.z - 0.1);
    part(at, cyl(0.1, 0.1, 0.02, 14), lead ? ROPE_B : ROPE_A, BELAY.x - 0.22, 0.22, BELAY.z - 0.1, { outline: false });
    return s;
  };
  const top = route(-W / 2 + 0.72, false);
  const lead = route(W / 2 - 0.72, true);
  // A chalk bucket and a brush on a stick between them.
  part(g, cyl(0.1, 0.09, 0.2, 14), '#eceff1', 0.3, 0.1, face + 0.42);
  part(g, cyl(0.085, 0.085, 0.01, 14), '#ffffff', 0.3, 0.2, face + 0.42, { outline: false });
  rod(g, new THREE.Vector3(0.42, 0.0, face + 0.08), new THREE.Vector3(0.46, 1.1, face + 0.02), 0.012, '#8d6e63');
  part(g, rbox(0.05, 0.1, 0.035, 0.01), '#212121', 0.46, 1.14, face + 0.02);

  // The ropes. At rest: the top rope through its anchor, one end to the device and one hanging to a
  // coil on the floor; the lead rope from its device into its bag.
  const idle = new THREE.Group();
  g.add(idle);
  out.idle = idle;
  const live = new THREE.Group();
  g.add(live);
  out.inUse = live;
  const v = () => new THREE.Vector3();
  const restTop = (s: Spot) => [inPiece(s, BELAY, v()), inPiece(s, { x: ANCHOR.x, y: ANCHOR.y - 0.03, z: ANCHOR.z - 0.01 }, v()), inPiece(s, { x: 0.12, y: 0.04, z: -0.2 }, v())];
  const restLead = (s: Spot) => [inPiece(s, BELAY, v()), inPiece(s, { x: BELAY.x - 0.2, y: 0.22, z: BELAY.z - 0.1 }, v())];
  ropeLine(idle, 3, ROPE_A)(restTop(top));
  ropeLine(idle, 2, ROPE_B)(restLead(lead));
  part(idle, ring(0.11, 0.014), ROPE_A, inPiece(top, { x: 0.12, y: 0.0, z: -0.2 }).x, 0.02, inPiece(top, { x: 0.12, y: 0.0, z: -0.2 }).z, { rx: Math.PI / 2, outline: false });
  const topRope = ropeLine(live, 4, ROPE_A);
  const leadRope = ropeLine(live, 8, ROPE_B);
  const coilOnFloor = part(live, ring(0.11, 0.014), ROPE_A, inPiece(top, { x: 0.12, y: 0, z: -0.2 }).x, 0.02, inPiece(top, { x: 0.12, y: 0, z: -0.2 }).z, { rx: Math.PI / 2, outline: false });
  out.animate = (t) => {
    const which = nowAt({ top, lead }, t);
    // The top rope.
    if (which === 'top') {
      const c = climbRound(t, phaseOf(top), false, scaleOf(top));
      coilOnFloor.visible = !c.tied;
      topRope(c.tied ? [inPiece(top, BELAY, v()), inPiece(top, { x: ANCHOR.x, y: ANCHOR.y - 0.03, z: ANCHOR.z - 0.01 }, v()), inPiece(top, c.harness, v())] : restTop(top));
    } else {
      coilOnFloor.visible = true;
      topRope(restTop(top));
    }
    // The lead rope: from the device up through each clipped quickdraw (and the anchor once it's clipped) to the harness.
    if (which === 'lead') {
      const c = climbRound(t, phaseOf(lead), true, scaleOf(lead));
      if (!c.tied) leadRope(restLead(lead));
      else {
        const pts = [inPiece(lead, BELAY, v())];
        for (let m = 0; m < c.clipped; m++) {
          const q = quickdraw(m);
          pts.push(inPiece(lead, { x: q.x, y: q.y - 0.15, z: q.z - 0.015 }, v()));
        }
        if (c.anchored) pts.push(inPiece(lead, { x: ANCHOR.x, y: ANCHOR.y - 0.04, z: ANCHOR.z - 0.01 }, v()));
        if (c.ropeIn) pts.push(inPiece(lead, c.ropeIn === 'l' ? c.l : c.r, v()));
        pts.push(inPiece(lead, c.harness, v()));
        leadRope(pts);
      }
    } else leadRope(restLead(lead));
  };
  out.spots = { climbWall: top, extremeAthlete_routeLeading: lead, '*': top };
};

// ---------------------------------------------------------------------------------------------
// The mini halfpipe.

/** A skateboard, its wheels' contact at its origin, along x: the deck with its kicktails, grip tape, trucks and wheels. */
function skateboard(g: THREE.Object3D, deck = '#ff7043'): THREE.Group {
  const b = new THREE.Group();
  g.add(b);
  const top = RAMP.board;
  part(b, rbox(0.6, 0.022, 0.21, 0.01), deck, 0, top - 0.011, 0);
  part(b, box(0.58, 0.004, 0.19), '#212121', 0, top + 0.002, 0, { outline: false });
  for (const sx of [-1, 1]) {
    part(b, rbox(0.14, 0.02, 0.2, 0.01), deck, sx * 0.355, top + 0.012, 0, { rz: sx * 0.32 });
    part(b, rbox(0.06, 0.03, 0.05, 0.01), CHROME, sx * 0.21, top - 0.035, 0);
    part(b, cyl(0.008, 0.008, 0.2, 6), CHROME, sx * 0.21, 0.03, 0, { rx: Math.PI / 2, outline: false });
    for (const sz of [-1, 1]) part(b, cyl(0.028, 0.028, 0.03, 12), '#fafafa', sx * 0.21, 0.028, sz * 0.085, { rx: Math.PI / 2 });
  }
  return b;
}

/**
 * A plywood mini halfpipe (about 85 cm, the size a centre has indoors): two quarter-pipes with a flat
 * between, the riding surface a dark skatelite, steel coping at each lip, decks at each end with a
 * railing behind; its sides plywood with the framing screws showing and spray paint low down, seams
 * across the transitions. A board waits on the right deck. Ridden back and forth on the board (it's
 * under the feet the whole way, tipped with the wall), an air off the right coping with a grab, a
 * stall on the left deck and dropped back in.
 */
const skateRamp: Builder = (g, W, D, _c, _def, _ctx, out) => {
  const half = Math.min(RAMP.half, W / 2);
  const wide = Math.min(RAMP.width, D - 0.1);
  // The profile: the floor, up the right end, the deck, down the curve, the flat, up the other curve, the left deck.
  const pts: THREE.Vector2[] = [new THREE.Vector2(-half, 0), new THREE.Vector2(half, 0), new THREE.Vector2(half, RAMP.H)];
  const curve = (from: number, to: number, steps: number) => {
    for (let i = 0; i <= steps; i++) {
      const x = from + ((to - from) * i) / steps;
      pts.push(new THREE.Vector2(x, rampAt(x).y));
    }
  };
  curve(RAMP.end, RAMP.flat, 18);
  curve(-RAMP.flat, -RAMP.end, 18);
  pts.push(new THREE.Vector2(-half, RAMP.H));
  const profile = new THREE.Shape(pts);
  const body = new THREE.ExtrudeGeometry(profile, { depth: wide, bevelEnabled: false, curveSegments: 4 }).translate(0, 0, -wide / 2);
  own(g, body, '#5f5550', 0, 0, 0).castShadow = true;
  // The sides: plywood with the spray paint (the shape's own x and y as the picture's).
  const side = textured(painted('xramp-side', 1024, 256, paintRampSide).clone());
  side.map!.repeat.set(1 / (2 * half), 1);
  side.map!.offset.set(0.5, 0);
  side.map!.needsUpdate = true;
  for (const sz of [-1, 1]) {
    const m = new THREE.Mesh(new THREE.ShapeGeometry(profile), side);
    m.userData.ownGeometry = true;
    m.userData.ownMaterial = sz > 0;
    m.position.z = sz * (wide / 2 + 0.003);
    if (sz < 0) m.rotation.y = Math.PI;
    m.receiveShadow = true;
    g.add(m);
  }
  // Seams across the transitions and decks, the coping, the decks' railing.
  for (const sx of [-1, 1]) {
    for (const u of [0.25, 0.5, 0.75]) {
      const x = sx * (RAMP.flat + u * (RAMP.end - RAMP.flat));
      const s = rampAt(x);
      part(g, box(0.012, 0.004, wide), '#3e3632', x, s.y + 0.002, 0, { rz: s.slope, outline: false, shadow: false });
    }
    part(g, cyl(0.03, 0.03, wide + 0.02, 12), CHROME, sx * RAMP.end, RAMP.H + 0.012, 0, { rx: Math.PI / 2 });
    part(g, box(half - RAMP.end, 0.004, wide), '#4e4540', sx * (RAMP.end + half) / 2, RAMP.H + 0.002, 0, { outline: false });
    const rx = sx * (half - 0.05);
    for (const z of [-wide / 2 + 0.06, 0, wide / 2 - 0.06]) part(g, cyl(0.02, 0.02, 0.85, 8), '#37474f', rx, RAMP.H + 0.425, z, { outline: false });
    rod(g, new THREE.Vector3(rx, RAMP.H + 0.85, -wide / 2 + 0.06), new THREE.Vector3(rx, RAMP.H + 0.85, wide / 2 - 0.06), 0.022, '#37474f');
    rod(g, new THREE.Vector3(rx, RAMP.H + 0.45, -wide / 2 + 0.06), new THREE.Vector3(rx, RAMP.H + 0.45, wide / 2 - 0.06), 0.016, '#37474f');
  }
  // A banner on the left railing, a sign on the right one.
  label(g, '헬멧 착용 필수', 0.7, 0.16, -half + 0.03, RAMP.H + 0.65, 0, '#d32f2f', '#ffffff', Math.PI / 2);
  label(g, 'XTREME PARK', 0.7, 0.16, half - 0.03, RAMP.H + 0.65, 0, '#212121', '#ffeb3b', -Math.PI / 2);
  // A cone at the foot of the flat.
  part(g, cyl(0.02, 0.1, 0.3, 12), '#ff6d00', -0.3, 0.15, wide / 2 + 0.04);
  part(g, cyl(0.06, 0.075, 0.05, 12), '#ffffff', -0.3, 0.13, wide / 2 + 0.04, { outline: false });
  // The board: waiting on the right deck at rest, under the rider's feet in use.
  const rest = skateboard(g);
  rest.position.set(half - 0.22, RAMP.H, -0.3);
  rest.rotation.y = Math.PI / 2;
  out.idle = rest;
  const live = new THREE.Group();
  g.add(live);
  out.inUse = live;
  const board = skateboard(live);
  const rider = spot(g, 'stand', 0, 0, 0, 0);
  rider.motion = 'xSkate';
  out.animate = (t) => {
    const s = skateRound(t, phaseOf(rider));
    board.position.set(s.x, s.y + s.air, 0);
    board.rotation.z = s.tilt;
  };
  out.spots = { '*': rider };
};

// ---------------------------------------------------------------------------------------------
// The rigging bench.

/** A harness lying flat: the padded waist belt, its buckle, the belay loop and the two leg loops. */
function harness(g: THREE.Object3D, x: number, y: number, z: number, color = '#ff7043'): THREE.Group {
  const h = group(g, x, y, z);
  const belt = part(h, ring(0.13, 0.022), color, 0, 0.02, 0, { rx: Math.PI / 2 });
  belt.scale.set(1, 0.75, 1);
  part(h, rbox(0.06, 0.02, 0.04, 0.008), '#bdbdbd', 0, 0.035, 0.1);
  part(h, ring(0.035, 0.008), '#212121', 0, 0.02, 0.14, { rx: Math.PI / 2, outline: false });
  for (const sx of [-1, 1]) part(h, ring(0.075, 0.016), color, sx * 0.09, 0.015, 0.21, { rx: Math.PI / 2 });
  return h;
}
/** A rope coil: rings stacked, `n` of them. */
function coilOf(g: THREE.Object3D, color: string, r = 0.12, n = 4): THREE.Group {
  const c = new THREE.Group();
  g.add(c);
  for (let i = 0; i < n; i++) part(c, ring(r - i * 0.006, 0.012), color, 0, i * 0.018, 0, { rx: Math.PI / 2, outline: false });
  return c;
}

/**
 * The rigging bench: a long birch-topped steel bench at standing height, a pegboard behind on its
 * posts under '장비실 · 리깅' — harnesses, quickdraws, helmets and rope coils hung on it, the
 * expedition map and the gear checklist pinned up. On the left a parachute laid out along the bench
 * (its cells red, white and navy, the lines running to the black container at the right of it); on
 * the right a harness, a rope pile and a carabiner; the jump log open between. Packed (flaked,
 * S-folded, pressed and stowed, the pin pressed home), a rope coiled loop by loop, a carabiner's gate
 * clicked and the harness tugged, the expedition planned at the map, the jumps written up.
 */
const gearBench: Builder = (g, W, D, _c, _def, _ctx, out) => {
  const topY = 0.9;
  const tz = -0.06;
  const td = 0.68;
  part(g, rbox(W - 0.06, 0.05, td, 0.015), '#e8d3ad', 0, topY - 0.025, tz);
  part(g, box(W - 0.1, 0.012, 0.012), '#a1887f', 0, topY - 0.005, tz + td / 2 - 0.004, { outline: false });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.05, topY - 0.05, 0.05), '#546e7a', sx * (W / 2 - 0.08), (topY - 0.05) / 2, tz + sz * (td / 2 - 0.06));
  part(g, rbox(W - 0.14, 0.03, td - 0.1, 0.01), '#78909c', 0, 0.2, tz);
  // Under it: a rope bag, a rig in its bag, a crate of carabiners.
  part(g, cyl(0.13, 0.15, 0.3, 14), '#c62828', -0.6, 0.37, tz);
  part(g, rbox(0.36, 0.28, 0.32, 0.05), '#263238', -0.1, 0.36, tz);
  part(g, rbox(0.34, 0.16, 0.3, 0.02), '#fbc02d', 0.5, 0.3, tz);
  for (let i = 0; i < 5; i++) carabiner(g, 0.4 + i * 0.05, 0.4, tz + 0.05, i % 2 ? '#90caf9' : '#ffb74d');
  // The pegboard on two posts behind, its header and what hangs on it.
  const pz = -D / 2 + 0.06;
  for (const sx of [-1, 1]) part(g, box(0.05, 2.0, 0.05), '#546e7a', sx * (W / 2 - 0.06), 1.0, pz);
  part(g, box(W - 0.12, 0.95, 0.02), '#ffffff', 0, 1.45, pz + 0.02, { material: textured(painted('xpeg', 512, 256, paintPegboard)) });
  label(g, '장비실 · 리깅 & 로프', 0.9, 0.12, 0, 2.0, pz + 0.04, '#263a5a', '#ffffff');
  // Harnesses, quickdraws and helmets on the left; the map and the checklist in the middle; rope coils on the right.
  for (const [i, col] of ['#ff7043', '#42a5f5', '#66bb6a'].entries()) {
    const hx = -0.78 + i * 0.17;
    part(g, cyl(0.006, 0.006, 0.06, 6), '#9e9e9e', hx, 1.78, pz + 0.06, { rx: Math.PI / 2, outline: false });
    const loop = part(g, ring(0.07, 0.014), col, hx, 1.66, pz + 0.07);
    loop.scale.set(0.8, 1.4, 1);
    for (const sx of [-1, 1]) part(g, ring(0.04, 0.01), col, hx + sx * 0.035, 1.5, pz + 0.07);
  }
  for (let i = 0; i < 6; i++) quickdrawAt(g, { x: -0.8 + i * 0.07, y: 1.3, z: pz + 0.06 });
  for (const [i, col] of ['#fdd835', '#e53935'].entries()) {
    const hx = -0.3 + i * 0.2;
    part(g, cyl(0.006, 0.006, 0.08, 6), '#9e9e9e', hx, 1.86, pz + 0.07, { rx: Math.PI / 2, outline: false });
    const helm = part(g, ball(0.1), col, hx, 1.78, pz + 0.12);
    helm.scale.set(1, 0.75, 1.1);
  }
  const map = picture(g, painted('xmap', 512, 384, paintMap), 0.5, 0.37, 0.1, 1.42, pz + 0.035);
  for (const [dx, dy] of [[-0.23, 0.17], [0.23, 0.17], [-0.23, -0.17], [0.23, -0.17]]) part(g, ball(0.01), '#e53935', 0.1 + dx, 1.42 + dy, pz + 0.04, { outline: false });
  picture(g, painted('xcheck', 256, 352, paintChecklist), 0.18, 0.25, 0.48, 1.55, pz + 0.035);
  for (const [i, col] of [ROPE_A, ROPE_B].entries()) {
    part(g, cyl(0.007, 0.007, 0.07, 6), '#9e9e9e', 0.72 + i * 0.16, 1.85, pz + 0.07, { rx: Math.PI / 2, outline: false });
    const coil = part(g, ring(0.11, 0.02), col, 0.72 + i * 0.16, 1.72, pz + 0.09);
    coil.scale.set(0.7, 1, 1);
  }

  // The pack area, on the packer's left (they face the bench, −z): the canopy, its lines, the container.
  const packW = new THREE.Vector3(-0.42, topY, tz + 0.12);
  const atPack = framer(packW, Math.PI);
  const canopy = group(g, packW.x, topY, packW.z);
  const cells = ['#d32f2f', '#fafafa', NAVY, '#fafafa', '#d32f2f', '#fafafa', NAVY];
  cells.forEach((col, i) => part(canopy, rbox(2 * PACK.len / cells.length, 0.03, 0.42, 0.01), col, -PACK.len + (2 * PACK.len * (i + 0.5)) / cells.length, 0.015, 0, { outline: i === 0 || i === cells.length - 1 }));
  const contAt = atPack(PACK.cont);
  const cont = group(g, contAt.x, topY, contAt.z);
  part(cont, rbox(0.3, 0.12, 0.4, 0.04), '#212121', 0, 0.06, 0);
  for (const sx of [-1, 1]) part(cont, box(0.025, 0.125, 0.41), '#ff6f00', sx * 0.09, 0.062, 0, { outline: false });
  part(cont, rbox(0.12, 0.02, 0.05, 0.008), '#455a64', 0, 0.12, 0.17);
  const flap = group(cont, 0, 0.12, -0.2);
  part(flap, rbox(0.28, 0.012, 0.2, 0.01), '#37474f', 0, 0.006, 0.1);
  const pin = part(cont, cyl(0.006, 0.006, 0.05, 6), CHROME, 0, 0.13, 0.05, { rx: Math.PI / 2, outline: false });
  const lines = Array.from({ length: 4 }, () => unitRod(g, 0.0035, '#eceff1'));
  const drawLines = () => {
    const end = canopy.localToWorld(tmp.set(PACK.len, 0.02, 0)).clone();
    g.worldToLocal(end);
    lines.forEach((m, i) => stretch(m, end.clone().add(new THREE.Vector3(0, 0, (i - 1.5) * 0.08)), new THREE.Vector3(cont.position.x - 0.13, topY + 0.07, cont.position.z + (i - 1.5) * 0.04)));
  };
  g.updateMatrixWorld(true);
  drawLines();

  // The gear area, on the right: a harness, the rope pile, a carabiner; the jump log between.
  const gearW = new THREE.Vector3(0.62, topY, tz + 0.12);
  const atGear = framer(gearW, Math.PI);
  const belt = harness(g, gearW.x, topY, gearW.z - 0.08);
  const pileAt = atGear(COIL.pile);
  const pile = coilOf(g, ROPE_A, 0.13, 5);
  pile.position.set(pileAt.x, topY, pileAt.z);
  const inHand = coilOf(g, ROPE_A, 0.12, 6);
  inHand.visible = false;
  const strand = unitRod(g, 0.009, ROPE_A);
  strand.visible = false;
  const biner = group(g, 0, 0, 0);
  const loop = part(biner, ring(0.035, 0.007), '#ffb300', 0, 0, 0, { outline: false });
  loop.scale.set(0.7, 1.25, 1);
  const gate = group(biner, 0.022, -0.02, 0);
  part(gate, cyl(0.005, 0.005, 0.06, 6), '#cfd8dc', 0, 0.03, 0, { outline: false });
  const putBiner = (o: BarOffset, held: boolean) => {
    atGear(o, biner.position);
    biner.rotation.set(held ? 0 : -Math.PI / 2, 0, 0);
  };
  putBiner({ side: -0.2, up: 0.01, ahead: -0.1 }, false);
  part(g, rbox(0.26, 0.02, 0.18, 0.01), '#1565c0', 0.12, topY + 0.01, tz + 0.18);
  part(g, box(0.24, 0.006, 0.16), '#fafafa', 0.12, topY + 0.023, tz + 0.18, { outline: false });
  label(g, '강하 기록부', 0.1, 0.03, 0.06, topY + 0.027, tz + 0.18, '#fafafa', '#1565c0').rotation.x = -Math.PI / 2;
  part(g, cyl(0.005, 0.005, 0.13, 6), '#212121', 0.2, topY + 0.03, tz + 0.2, { rz: Math.PI / 2, ry: 0.4, outline: false });
  const log = marker(g, 0.12, topY + 0.03, tz + 0.18);

  // Where they stand: at the canopy, at the gear, at the map, at the log.
  const near = tz + td / 2 + 0.13;
  const pack = stoodAt(g, packW.x, near, Math.PI, 'xPack', marker(g, packW.x, packW.y, packW.z));
  const coil = stoodAt(g, gearW.x, near, Math.PI, 'xCoil', marker(g, gearW.x, gearW.y, gearW.z));
  const check = stoodAt(g, gearW.x, near, Math.PI, 'xGearCheck', marker(g, gearW.x, gearW.y, gearW.z));
  // The plan is talked through at the map across the bench, pointing out the route on it.
  const plan = stoodAt(g, 0.1, near, Math.PI, 'present', marker(g, 0.1, 1.42, pz + 0.04));
  const write = stoodAt(g, 0.12, near, Math.PI, 'write', log);
  out.work = pack.work;
  const live = new THREE.Group();
  g.add(live);
  out.inUse = live;
  out.animate = (t) => {
    const which = nowAt({ pack, coil, check }, t);
    // The canopy: spread, folded up shorter and fatter, pressed flat, slid into the container; the flap closed and pinned.
    const k = which === 'pack' ? packRound(t, phaseOf(pack)) : { spread: 1, press: 0, stow: 0, pin: 0 };
    const len = THREE.MathUtils.lerp(0.32, 1, k.spread);
    canopy.scale.set(len, THREE.MathUtils.lerp(1, 3.2, 1 - k.spread) * (1 - 0.4 * k.press), 1 - 0.25 * (1 - k.spread));
    const home = new THREE.Vector3(packW.x, topY, packW.z);
    const into = new THREE.Vector3(cont.position.x, topY + 0.05, cont.position.z);
    canopy.position.lerpVectors(home, into, k.stow);
    canopy.visible = k.stow < 0.95;
    canopy.scale.multiplyScalar(1 - 0.6 * k.stow);
    flap.rotation.x = -2.2 * (1 - THREE.MathUtils.smoothstep(k.stow, 0.85, 1));
    pin.visible = k.pin > 0.5 || k.stow < 0.01;
    g.updateMatrixWorld(true);
    drawLines();
    lines.forEach((m) => (m.visible = canopy.visible));
    // The rope coiled into the hand from the pile; the carabiner held up and its gate pushed; the harness tugged.
    if (which === 'coil') {
      const c = coilRound(t, phaseOf(coil));
      inHand.visible = c.coil > 0.05;
      atGear(c.l, inHand.position);
      inHand.position.y -= 0.12;
      inHand.rotation.set(Math.PI / 2, 0, 0);
      inHand.scale.setScalar(0.5 + 0.5 * c.coil);
      pile.scale.set(1, Math.max(0.1, c.pile), 1);
      strand.visible = c.u < 0.92;
      stretch(strand, atGear(c.r), new THREE.Vector3(pile.position.x, topY + 0.06, pile.position.z));
    } else {
      inHand.visible = false;
      strand.visible = false;
      pile.scale.set(1, 1, 1);
    }
    if (which === 'check') {
      const c = gearCheckRound(t, phaseOf(check));
      putBiner(c.biner, c.held);
      gate.rotation.z = 0.5 * c.gate;
      belt.position.set(gearW.x, topY + 0.1 * c.tug, gearW.z - 0.08 + 0.08 * c.tug);
    } else {
      putBiner({ side: -0.2, up: 0.01, ahead: -0.1 }, false);
      gate.rotation.z = 0;
      belt.position.set(gearW.x, topY, gearW.z - 0.08);
    }
  };
  out.spots = {
    packParachute: pack,
    extremeAthlete_repackReserve: pack,
    checkRopes: coil,
    extremeAthlete_safetyCheckLearn: check,
    extremeAthlete_planExpedition: plan,
    extremeAthlete_jumpSafetyPlan: write,
    '*': pack,
  };
  void map;
};

// ---------------------------------------------------------------------------------------------
// The jump plane.

/**
 * A high-wing single-engine jump plane parked on the grass, its nose to the open field (+x): a white
 * fuselage with an orange and navy stripe, the cowling, spinner and two-bladed propeller, a tinted
 * windscreen and side windows, the big jump door open on this side with a step and a grab bar over
 * it (a bench inside), the wing on top with its struts, the tailplane and the fin with HL1027 on it,
 * the wheels in their fairings with chocks under them; a windsock on its pole by the tail. Out on a
 * jump it runs the engine up, rolls off along the grass, lifts off and climbs away; when it's over it
 * comes in low from the field, lands, turns round out on the grass and is pushed back into its place.
 */
const jumpPlane: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  const craft = new THREE.Group();
  g.add(craft);
  const pitch = new THREE.Group();
  craft.add(pitch);
  const P = pitch;
  const BODY = '#f5f7f8';
  const cy = 0.98;
  // The cabin, the tail cone, the cowling and the spinner.
  part(P, rbox(2.0, 1.02, 0.96, 0.22), BODY, 0.25, cy, 0);
  own(P, new THREE.CylinderGeometry(0.16, 0.46, 1.7, 18).rotateZ(Math.PI / 2), BODY, -1.6, cy + 0.12, 0);
  part(P, rbox(0.62, 0.78, 0.82, 0.2), BODY, 1.5, cy - 0.04, 0);
  own(P, new THREE.ConeGeometry(0.13, 0.26, 16).rotateZ(-Math.PI / 2), '#d84315', 1.93, cy - 0.04, 0);
  part(P, rbox(0.2, 0.18, 0.4, 0.05), '#37474f', 1.62, cy - 0.42, 0);
  const prop = group(P, 1.82, cy - 0.04, 0);
  for (const s of [-1, 1]) part(prop, rbox(0.03, 0.82, 0.08, 0.015), '#263238', 0, s * 0.41, 0, { rx: s * 0.25 });
  for (const s of [-1, 1]) part(prop, box(0.032, 0.08, 0.082), '#fdd835', 0, s * 0.8, 0, { outline: false });
  // The stripes down both sides.
  for (const s of [-1, 1]) {
    part(P, box(3.2, 0.09, 0.006), '#ef6c00', -0.2, cy - 0.1, s * 0.485, { outline: false });
    part(P, box(3.2, 0.05, 0.006), NAVY, -0.2, cy - 0.2, s * 0.485, { outline: false });
  }
  // The windscreen and side windows; the jump door open on this side, the step and grab bar, a bench inside.
  part(P, box(0.08, 0.36, 0.84), '#28435e', 1.17, cy + 0.32, 0, { rz: -0.55, outline: false });
  for (const s of [-1, 1]) {
    part(P, box(0.5, 0.3, 0.008), '#28435e', 0.9, cy + 0.26, s * 0.484, { outline: false });
    part(P, box(0.36, 0.26, 0.008), '#28435e', -0.55, cy + 0.26, s * 0.484, { outline: false });
  }
  part(P, box(0.75, 0.82, 0.01), '#1c2329', 0.05, cy + 0.02, 0.484, { outline: false });
  part(P, rbox(0.86, 0.04, 0.03, 0.01), '#90a4ae', 0.05, cy + 0.45, 0.49);
  part(P, rbox(0.4, 0.03, 0.18, 0.01), '#90a4ae', 0.1, cy - 0.5, 0.58);
  rod(P, new THREE.Vector3(0.1, cy - 0.5, 0.5), new THREE.Vector3(0.1, cy - 0.32, 0.48), 0.012, '#78909c');
  rod(P, new THREE.Vector3(-0.3, cy + 0.5, 0.5), new THREE.Vector3(0.4, cy + 0.5, 0.5), 0.014, '#cfd8dc');
  part(P, rbox(0.6, 0.12, 0.3, 0.03), '#455a64', 0.0, cy - 0.3, 0.1);
  label(P, 'SKYDIVE 스카이다이빙', 0.78, 0.11, -1.15, cy + 0.08, 0.44, BODY, NAVY);
  // The wing on top with its struts and coloured tips; the tailplane and the fin.
  part(P, rbox(0.8, 0.08, 4.8, 0.03), BODY, 0.45, cy + 0.6, 0);
  for (const s of [-1, 1]) {
    part(P, rbox(0.82, 0.085, 0.3, 0.03), '#ef6c00', 0.45, cy + 0.6, s * 2.27);
    rod(P, new THREE.Vector3(0.35, cy - 0.35, s * 0.45), new THREE.Vector3(0.45, cy + 0.56, s * 1.35), 0.025, '#cfd8dc');
  }
  part(P, rbox(0.5, 0.05, 1.5, 0.02), BODY, -2.25, cy + 0.15, 0);
  part(P, rbox(0.62, 0.6, 0.06, 0.03), BODY, -2.3, cy + 0.5, 0);
  part(P, box(0.2, 0.6, 0.065), '#ef6c00', -2.53, cy + 0.5, 0, { outline: false });
  label(P, 'HL1027', 0.36, 0.1, -2.25, cy + 0.55, 0.035, BODY, NAVY);
  // The wheels: two mains on their spring legs, the nose wheel; chocks while it's parked.
  for (const s of [-1, 1]) {
    rod(P, new THREE.Vector3(0.05, cy - 0.45, s * 0.35), new THREE.Vector3(0.0, 0.2, s * 0.72), 0.022, '#90a4ae');
    part(P, cyl(0.2, 0.2, 0.12, 18), BLACK, 0, 0.2, s * 0.74, { rx: Math.PI / 2 });
    part(P, rbox(0.42, 0.22, 0.16, 0.08), BODY, 0, 0.27, s * 0.74);
  }
  rod(P, new THREE.Vector3(1.55, cy - 0.4, 0), new THREE.Vector3(1.55, 0.15, 0), 0.025, '#90a4ae');
  part(P, cyl(0.15, 0.15, 0.1, 16), BLACK, 1.55, 0.15, 0, { rx: Math.PI / 2 });
  const chocks = new THREE.Group();
  g.add(chocks);
  for (const s of [-1, 1]) for (const dx of [-0.26, 0.26]) part(chocks, rbox(0.12, 0.1, 0.16, 0.02), '#fdd835', dx, 0.05, s * 0.74);
  // The windsock on its pole by the tail (it stays when the plane goes).
  const wx = -1.4;
  const wz = 1.35;
  part(g, cyl(0.025, 0.03, 2.3, 8), '#eceff1', wx, 1.15, wz);
  const sock = group(g, wx, 2.2, wz);
  for (let i = 0; i < 4; i++) part(sock, cyl(0.1 - i * 0.017, 0.1 - (i + 1) * 0.017, 0.16, 12), i % 2 ? '#ffffff' : '#ff6d00', 0.08 + i * 0.16, 0, 0, { rz: Math.PI / 2, outline: false });
  // Out on a jump: run up, roll off, lift off and climb away; back: in low, down, rolled up, turned round.
  let state: 'parked' | 'leaving' | 'gone' | 'back' | undefined;
  let since = 0;
  out.away = (isOut, t) => {
    if (state === undefined) state = isOut ? 'gone' : 'parked';
    else if (isOut && (state === 'parked' || state === 'back')) [state, since] = ['leaving', t];
    else if (!isOut && (state === 'leaving' || state === 'gone')) [state, since] = ['back', t];
    const s = t - since;
    let x = 0;
    let y = 0;
    let heading = 0;
    let nose = 0;
    let spin = 0;
    if (state === 'leaving') {
      spin = Math.min(1, s / 1.2);
      const r = Math.max(0, s - 1.2);
      x = 1.1 * r * r;
      if (s > 4.6) nose = Math.min(0.2, (s - 4.6) * 0.25);
      if (s > 4.9) y = 0.9 * (s - 4.9) * (s - 4.9);
      if (s > 9) state = 'gone';
    } else if (state === 'back') {
      // In from the field nose first, down and rolled out; turned round out on the grass (clear of the
      // building), the engine off, and pushed back into its place by hand.
      spin = 1;
      heading = Math.PI;
      if (s < 4) {
        const e = s / 4;
        x = 28 - 21 * e;
        y = 6 * Math.pow(1 - e, 1.6);
        nose = 0.05 + 0.08 * e;
      } else if (s < 6) {
        x = 7 - 2 * THREE.MathUtils.smoothstep(s, 4, 6);
        nose = 0.1 * (1 - THREE.MathUtils.smoothstep(s, 4, 4.5));
      } else if (s < 8.5) {
        x = 5;
        heading = Math.PI + Math.PI * THREE.MathUtils.smoothstep(s, 6, 8.5);
        spin = 0.5;
      } else if (s < 12) {
        x = 5 * (1 - THREE.MathUtils.smoothstep(s, 8.5, 12));
        heading = 0;
        spin = 0;
      } else {
        state = 'parked';
        heading = 0;
      }
    }
    craft.position.set(x, y, 0);
    craft.rotation.y = heading;
    pitch.rotation.z = nose;
    craft.visible = state !== 'gone';
    chocks.visible = state === 'parked';
    prop.rotation.x = spin > 0 ? t * 40 * spin : 0.4;
  };
  sock.rotation.y = -0.4;
  out.animate = (t) => (sock.rotation.y = -0.4 + 0.15 * Math.sin(t * 0.7));
};

// ---------------------------------------------------------------------------------------------
// The bouldering wall.

/**
 * A bouldering wall leaning out over its mats: a dark plywood face overhanging by about 13°, its foot a
 * kickboard, the sides closed in, a sign along the top; holds of every colour, and a green problem
 * (V2) across it from the left to a top hold on the right, its start and top taped. Thick blue
 * crash mats over the floor in front, a chalk bucket on them and a brush on its pole. The problem
 * traversed and topped, then dropped off onto the mat (it gives under the landing).
 */
const exBoulderWall: Builder = (g, W, D, _c, _def, _ctx, out) => {
  const foot = -D / 2 + 0.15;
  const mat = BOULDER.mat;
  const top = 2.45;
  const L = (top - mat) / Math.cos(BOULDER.lean);
  const lean = Math.tan(BOULDER.lean);
  // The kickboard and the face, tipped out over the mats.
  part(g, box(W - 0.06, mat, 0.08), '#3d424c', 0, mat / 2, foot - 0.04);
  const panel = part(g, box(W - 0.06, L, 0.08), '#ffffff', 0, mat + (top - mat) / 2, foot - 0.04 + ((top - mat) / 2) * lean, { material: textured(painted('xwall-dark', 512, 512, paintPanel('#4a505c', '#2b2f36'))), rx: BOULDER.lean });
  void panel;
  // Closed in at the sides (each a wedge from the floor to the top), a cap and a sign along it.
  for (const sx of [-1, 1]) {
    // Its shape across (from the back) and up, stood on edge along the side (extruded towards −x).
    const sh = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0, top), new THREE.Vector2((top - mat) * lean + 0.12, top), new THREE.Vector2(0.12, mat), new THREE.Vector2(0.12, 0)]);
    own(g, new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: false }), '#263238', sx < 0 ? -W / 2 + 0.04 : W / 2, 0, foot - 0.12, 0, -Math.PI / 2, 0);
  }
  part(g, rbox(W, 0.08, (top - mat) * lean + 0.2, 0.02), '#263238', 0, top + 0.04, foot - 0.08 + ((top - mat) * lean) / 2);
  label(g, '볼더링 존 · BOULDERING', 1.0, 0.13, 0, top - 0.12, foot + (top - 0.12 - mat) * lean + 0.005, '#263238', '#76ff03').rotation.x = BOULDER.lean;
  // The problem, in its own frame at the foot of the face (+z into the wall), and holds all over.
  const climber = spot(g, 'stand', 0, 0, foot, Math.PI);
  climber.motion = 'xBoulder';
  const at = climber.at;
  const r = seeded(53);
  const taken: P3[] = [];
  // Two problems, the same moves either way: green to the right, blue back to the left.
  for (const [dir, col, grade] of [[1, '#43a047', 'V2 · 트래버스 →'], [-1, '#1e88e5', 'V2 · ← 트래버스']] as const) {
    const m = (p: P3): P3 => ({ x: p.x * dir, y: p.y, z: p.z });
    for (let j = 0; j <= BOULDER.stances + 1; j++) {
      const p = m(boulderHold(j));
      taken.push(p);
      hold(at, p, col, j === BOULDER.stances + 1 ? 0.05 : 0.036, j === BOULDER.stances + 1 ? 0 : j + 1, j * 0.5).rotation.x = -BOULDER.lean;
    }
    for (let j = 0; j <= BOULDER.stances; j++) {
      const p = m(boulderFoot(j));
      taken.push(p);
      hold(at, p, col, 0.022, 1, j * 0.7);
    }
    tape(at, m(boulderHold(0)), col, 'S', 0);
    tape(at, m(boulderHold(1)), col, 'S', 0);
    tape(at, m(boulderHold(BOULDER.stances + 1)), col, 'TOP', 0);
    label(at, grade, 0.26, 0.07, m(boulderHold(0)).x, mat + 0.14 + (dir < 0 ? 0.1 : 0), -0.005, col, '#ffffff', 0);
  }
  for (let i = 0; i < 48; i++) {
    const x = (r() - 0.5) * (W - 0.3);
    const y = mat + 0.15 + r() * (top - mat - 0.3);
    if (taken.some((p) => Math.hypot(p.x - x, p.y - y) < 0.14)) continue;
    const col = HOLD_COLORS[(i * 7) % HOLD_COLORS.length];
    if (col === '#43a047' || col === '#1e88e5') continue;
    hold(at, { x, y, z: boulderFace(y) - 0.035 }, col, 0.024 + r() * 0.02, i, r() * 3).rotation.x = -BOULDER.lean;
  }
  // The crash mats: three pads side by side over the floor in front, each one giving under a landing.
  const pads: THREE.Mesh[] = [];
  const padD = D / 2 - 0.08 - foot;
  for (let i = 0; i < 3; i++) {
    const px = -W / 2 + (W / 3) * (i + 0.5);
    const m = part(g, rbox(W / 3 - 0.02, mat, padD, 0.06), MAT_BLUE, px, mat / 2, foot + padD / 2);
    pads.push(m);
    part(g, box(W / 3 - 0.06, 0.006, 0.05), '#90a4ae', px, mat + 0.003, foot + padD - 0.06, { outline: false });
  }
  part(g, cyl(0.1, 0.09, 0.2, 14), '#eceff1', W / 2 - 0.2, mat + 0.1, foot + padD - 0.2);
  part(g, cyl(0.085, 0.085, 0.01, 14), '#ffffff', W / 2 - 0.2, mat + 0.2, foot + padD - 0.2, { outline: false });
  rod(g, new THREE.Vector3(-W / 2 + 0.15, mat, foot + 0.1), new THREE.Vector3(-W / 2 + 0.2, mat + 1.3, foot + 0.35), 0.012, '#8d6e63');
  part(g, rbox(0.05, 0.1, 0.035, 0.01), '#212121', -W / 2 + 0.2, mat + 1.34, foot + 0.36);
  const live = new THREE.Group();
  g.add(live);
  out.inUse = live;
  out.animate = (t) => {
    const b = boulderRound(t, phaseOf(climber), scaleOf(climber));
    // The landing's x in the problem's frame is the piece's −x.
    const lx = -b.landX;
    pads.forEach((m, i) => {
      const px = -W / 2 + (W / 3) * (i + 0.5);
      const near = Math.max(0, 1 - Math.abs(px - lx) / (W / 3));
      const sq = 0.25 * b.squash * near;
      m.scale.y = 1 - sq;
      m.position.y = (mat * (1 - sq)) / 2;
    });
  };
  out.spots = { '*': climber };
};

// ---------------------------------------------------------------------------------------------
// The trampoline pit.

/** A trampoline bed (a sheet of `n`×`n` squares) that dips under whoever's on it. */
function bed(g: THREE.Object3D, size: number, y: number): (dip: number) => void {
  const geom = new THREE.PlaneGeometry(size, size, 14, 14).rotateX(-Math.PI / 2);
  const base = (geom.attributes.position.array as Float32Array).slice();
  const m = new THREE.Mesh(geom, new THREE.MeshToonMaterial({ color: '#1f2226', side: THREE.DoubleSide }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.receiveShadow = true;
  m.position.y = y;
  g.add(m);
  const pos = geom.attributes.position;
  let last = -1;
  return (dip: number) => {
    if (Math.abs(dip - last) < 1e-4) return;
    last = dip;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const z = base[i * 3 + 2];
      const r = Math.min(1, Math.hypot(x, z) / (size * 0.62));
      const edge = Math.max(Math.abs(x), Math.abs(z)) / (size / 2);
      pos.setY(i, -dip * (1 - r * r) * (1 - edge ** 6));
    }
    pos.needsUpdate = true;
    geom.computeVertexNormals();
  };
}

/**
 * An in-ground trampoline pit: the black bed sunk level with the floor in a frame of thick blue pads
 * with a yellow safety edge, the springs showing in a silver ring between, a target cross on the bed;
 * a sign on a post at the back corner ('트램펄린 · 1인씩 · 공중 동작은 지도자와 함께'). Bounced on
 * (the bed giving under each landing): straight bounces, a tuck jump, a back flip, stuck landing.
 */
const exTrampoline: Builder = (g, W, D, _c, _def, _ctx, out) => {
  const S = Math.min(W, D) - 0.62;
  const bedY = 0.06;
  const pad = 0.28;
  // The pads round it.
  for (const s of [-1, 1]) {
    part(g, rbox(W - 0.04, 0.1, pad, 0.04), MAT_BLUE, 0, 0.05, s * (D / 2 - 0.02 - pad / 2));
    part(g, rbox(pad, 0.1, D - 0.04 - 2 * pad, 0.04), MAT_BLUE, s * (W / 2 - 0.02 - pad / 2), 0.05, 0);
    part(g, box(S + 0.06, 0.004, 0.04), '#fdd835', 0, 0.102, s * (S / 2 + 0.05), { outline: false });
    part(g, box(0.04, 0.004, S + 0.06), '#fdd835', s * (S / 2 + 0.05), 0.102, 0, { outline: false });
  }
  // The springs between the bed and the pads.
  part(g, box(S + 0.1, 0.02, S + 0.1), '#455a64', 0, 0.03, 0, { outline: false });
  for (let i = 0; i < 10; i++) {
    const u = -S / 2 + (S * (i + 0.5)) / 10;
    for (const s of [-1, 1]) {
      part(g, cyl(0.008, 0.008, 0.06, 6), '#cfd8dc', u, bedY, s * (S / 2 + 0.03), { rx: Math.PI / 2, outline: false });
      part(g, cyl(0.008, 0.008, 0.06, 6), '#cfd8dc', s * (S / 2 + 0.03), bedY, u, { rz: Math.PI / 2, outline: false });
    }
  }
  // The bed: flat at rest; in use a second one that gives.
  const flat = new THREE.Group();
  g.add(flat);
  out.idle = flat;
  part(flat, box(S, 0.006, S), '#1f2226', 0, bedY, 0, { outline: false });
  const live = new THREE.Group();
  g.add(live);
  out.inUse = live;
  const dipTo = bed(live, S, bedY);
  for (const grp of [flat, live]) {
    part(grp, box(0.4, 0.004, 0.03), '#ff5252', 0, bedY + 0.006, 0, { outline: false, shadow: false });
    part(grp, box(0.03, 0.004, 0.4), '#ff5252', 0, bedY + 0.006, 0, { outline: false, shadow: false });
  }
  // The sign on its post.
  const sx = -W / 2 + 0.12;
  const sz = -D / 2 + 0.12;
  part(g, cyl(0.025, 0.025, 1.5, 8), '#eceff1', sx, 0.75, sz, { outline: false });
  part(g, rbox(0.5, 0.36, 0.03, 0.02), '#1565c0', sx + 0.2, 1.38, sz);
  label(g, '트램펄린', 0.42, 0.1, sx + 0.2, 1.48, sz + 0.017, '#1565c0', '#ffffff');
  label(g, '1인씩 · 지도자와 함께', 0.44, 0.07, sx + 0.2, 1.33, sz + 0.017, '#1565c0', '#ffeb3b');
  label(g, '공중 동작 연습장', 0.36, 0.06, sx + 0.2, 1.24, sz + 0.017, '#1565c0', '#bbdefb');
  const jumper = spot(g, 'stand', 0, bedY + 0.004, 0, 0);
  jumper.motion = 'xBounce';
  out.animate = (t) => dipTo(bounceRound(t, phaseOf(jumper), scaleOf(jumper)).dip);
  out.spots = { '*': jumper };
};

// ---------------------------------------------------------------------------------------------
// The rental counter.

/** A pair of climbing shoes side by side (the toes to +z): the uppers, the rubber rands and soles. */
function shoes(g: THREE.Object3D, color: string): THREE.Group {
  const p = new THREE.Group();
  g.add(p);
  for (const sx of [-1, 1]) {
    part(p, rbox(0.07, 0.055, 0.2, 0.025), color, sx * 0.045, 0.035, 0);
    part(p, rbox(0.072, 0.014, 0.205, 0.006), RUBBER, sx * 0.045, 0.007, 0.003, { outline: false });
    part(p, rbox(0.05, 0.03, 0.05, 0.015), RUBBER, sx * 0.045, 0.03, 0.09, { outline: false });
  }
  return p;
}

/**
 * The rental counter (staff behind it, at its front): an orange counter with the customers' side
 * facing the lobby under '장비 대여 · RENTAL' and the price list; on the staff's side the cubbies of
 * climbing shoes by size and hooks of harnesses and chalk bags. On top a small cubby rack of shoes at
 * the staff's left, the till (its screen lit in use) with a card reader and receipt printer at their
 * right, a bell, a jar of chalk balls. A pair taken from the cubby, slid across, the till tapped, the
 * receipt handed over.
 */
const exRentalCounter: Builder = (g, W, _D, _c, _def, _ctx, out) => {
  const topY = 0.98;
  const cz = -0.12;
  const cd = 0.56;
  // The counter: full depth under the top, the lower part set back on the staff's side for the cubbies.
  const recess = 0.17;
  part(g, rbox(W - 0.04, 0.34, cd, 0.03), '#ff7043', 0, topY - 0.21, cz);
  part(g, rbox(W - 0.04, topY - 0.38, cd - recess, 0.03), '#ff7043', 0, (topY - 0.38) / 2, cz - recess / 2);
  part(g, rbox(W + 0.02, 0.05, cd + 0.1, 0.02), '#eceff1', 0, topY - 0.02, cz);
  // The customers' side (−z): the sign and the price list.
  const front = cz - cd / 2 - 0.006;
  label(g, '장비 대여 · RENTAL', 1.1, 0.16, 0, 0.72, front, '#263238', '#ffab40', Math.PI);
  const prices: Array<[string, string]> = [['암벽화', '3,000원'], ['하네스', '2,000원'], ['초크', '1,000원'], ['헬멧', '무료']];
  prices.forEach(([a, b], i) => label(g, `${a}  ${b}`, 0.42, 0.075, (i % 2 ? -0.26 : 0.26), 0.48 - Math.floor(i / 2) * 0.1, front, '#fff3e0', '#4e342e', Math.PI));
  // The staff's side (+z): shoe cubbies by size in the recess under the top, and the hooks.
  const fz = cz + cd / 2 + 0.005;
  const back = fz - recess;
  part(g, box(W - 0.08, 0.012, recess), '#6d4c41', 0, 0.3, fz - recess / 2, { outline: false });
  for (let i = 0; i <= 6; i++) part(g, box(0.012, topY - 0.38, recess), '#6d4c41', -W / 2 + 0.04 + i * ((W - 0.08) / 6), (topY - 0.38) / 2, fz - recess / 2, { outline: false });
  const sizes = ['230', '240', '250', '260', '270', '280'];
  sizes.forEach((s, i) => {
    const x = -W / 2 + 0.04 + (i + 0.5) * ((W - 0.08) / 6);
    for (const [row, y] of [[0, 0.02], [1, 0.31]] as const) {
      const pr = shoes(g, ['#7e57c2', '#26a69a', '#ef5350', '#ffca28', '#42a5f5', '#8d6e63'][(i + row * 3) % 6]);
      pr.position.set(x, y, back + recess / 2);
      pr.scale.setScalar(0.72);
    }
    label(g, s, 0.07, 0.035, x, topY - 0.06, fz + 0.002, '#ffffff', '#212121');
  });
  for (const [i, col] of ['#ff7043', '#42a5f5', '#66bb6a', '#fdd835'].entries()) {
    const x = 0.3 + i * 0.16;
    part(g, cyl(0.006, 0.006, 0.05, 6), '#9e9e9e', x, 0.86, fz + 0.02, { rx: Math.PI / 2, outline: false });
    if (i < 2) {
      const lp = part(g, ring(0.06, 0.013), col, x, 0.74, fz + 0.03);
      lp.scale.set(0.8, 1.3, 1);
    } else {
      part(g, cyl(0.05, 0.045, 0.1, 12), col, x, 0.77, fz + 0.05);
      part(g, cyl(0.051, 0.051, 0.02, 12), '#212121', x, 0.825, fz + 0.05, { outline: false });
    }
  }
  // On top, from the staff's side (they face −z, their left is +x): the shoe rack, the till, a bell, the chalk jar.
  const work = new THREE.Vector3(0, topY + 0.005, cz + 0.06);
  const atW = framer(work, Math.PI);
  const cub = atW(RENTAL.cubby);
  part(g, rbox(0.34, 0.03, 0.26, 0.01), '#5d4037', cub.x, topY + 0.01, cub.z);
  for (const dy of [0, 0.15]) part(g, box(0.34, 0.015, 0.26), '#6d4c41', cub.x, topY + 0.02 + dy + 0.13, cub.z, { outline: false });
  for (const dx of [-0.17, 0, 0.17]) part(g, box(0.015, 0.31, 0.26), '#6d4c41', cub.x + dx, topY + 0.17, cub.z, { outline: false });
  for (const [i, col] of ['#26a69a', '#ef5350', '#42a5f5'].entries()) {
    const pr = shoes(g, col);
    pr.position.set(cub.x + (i === 0 ? 0.085 : -0.085), topY + 0.025 + (i === 2 ? 0.145 : 0), cub.z);
    pr.rotation.y = Math.PI;
    pr.scale.setScalar(0.7);
  }
  const till = atW(RENTAL.till);
  part(g, rbox(0.22, 0.04, 0.18, 0.015), '#37474f', till.x, topY + 0.02, till.z);
  const tillHead = group(g, till.x, topY + 0.04, till.z - 0.04);
  part(tillHead, rbox(0.04, 0.16, 0.04, 0.01), '#455a64', 0, 0.08, 0);
  const sc = litScreen(tillHead, painted('xtill', 256, 160, (c) => {
    c.fillStyle = '#0d1b2a';
    c.fillRect(0, 0, 256, 160);
    c.fillStyle = '#ff7043';
    c.fillRect(0, 0, 256, 30);
    text(c, '장비 대여', 10, 15, 16, '#ffffff');
    const rows: Array<[string, string]> = [['암벽화 250', '3,000'], ['하네스 M', '2,000'], ['초크볼', '1,000']];
    rows.forEach(([a, b], i) => {
      text(c, a, 12, 50 + i * 26, 14, '#cfd8dc', 'left', false);
      text(c, b, 244, 50 + i * 26, 14, '#ffffff', 'right');
    });
    text(c, '합계 6,000원', 244, 140, 16, '#69f0ae', 'right');
  }), 0.2, 0.13, 0, 0.2, 0.02);
  sc.rotation.x = -0.3;
  out.screen = sc;
  part(g, rbox(0.08, 0.05, 0.12, 0.012), '#212121', till.x - 0.15, topY + 0.025, till.z + 0.02);
  part(g, rbox(0.06, 0.012, 0.09, 0.006), '#455a64', till.x + 0.16, topY + 0.006, till.z);
  part(g, cyl(0.04, 0.05, 0.03, 14), '#c9a227', 0.05, topY + 0.015, cz - 0.18);
  part(g, ball(0.02), '#c9a227', 0.05, topY + 0.04, cz - 0.18);
  glassJar(g, -0.12, topY, cz - 0.17);
  // The pair being rented and the receipt.
  const live = new THREE.Group();
  g.add(live);
  out.inUse = live;
  const pair = shoes(live, '#7e57c2');
  pair.scale.setScalar(0.8);
  const receipt = part(live, box(0.07, 0.003, 0.12), '#ffffff', 0, 0, 0, { outline: false });
  const staff = stoodAt(g, 0, fz + 0.21, Math.PI, 'xRental', marker(g, work.x, work.y, work.z));
  out.animate = (t) => {
    const k = rentalRound(t, phaseOf(staff));
    pair.visible = !!k.shoes;
    if (k.shoes) {
      atW(k.shoes, pair.position);
      pair.rotation.y = 0;
    }
    receipt.visible = k.receipt;
    atW(k.r, receipt.position);
    receipt.position.y -= 0.02;
  };
  out.spots = { '*': staff };
};
/** A glass jar of chalk balls on the counter. */
function glassJar(g: THREE.Object3D, x: number, y: number, z: number) {
  part(g, cyl(0.06, 0.06, 0.16, 14), '#e3f2fd', x, y + 0.08, z, { material: new THREE.MeshToonMaterial({ color: '#e3f2fd', transparent: true, opacity: 0.4, depthWrite: false }), outline: false }).userData.ownMaterial = true;
  for (let i = 0; i < 5; i++) part(g, ball(0.025), '#fafafa', x + Math.cos(i * 1.3) * 0.025, y + 0.03 + (i % 2) * 0.03, z + Math.sin(i * 1.3) * 0.025, { outline: false });
  part(g, cyl(0.062, 0.062, 0.02, 14), '#e53935', x, y + 0.17, z, { outline: false });
}

// ---------------------------------------------------------------------------------------------
// The helmet and harness rack.

/** A climbing helmet: the shell, the vents, the chin strap. */
function helmet(g: THREE.Object3D, x: number, y: number, z: number, color: string): THREE.Group {
  const h = group(g, x, y, z);
  const shell = part(h, ball(0.11), color, 0, 0, 0);
  shell.scale.set(1, 0.78, 1.12);
  part(h, rbox(0.21, 0.02, 0.24, 0.01), shade2(color), 0, -0.03, 0, { outline: false });
  for (const dx of [-0.04, 0.04]) part(h, box(0.02, 0.01, 0.06), '#212121', dx, 0.085, -0.01, { outline: false });
  part(h, box(0.005, 0.08, 0.005), '#212121', 0.08, -0.08, 0, { outline: false });
  part(h, box(0.005, 0.08, 0.005), '#212121', -0.08, -0.08, 0, { outline: false });
  return h;
}
const shade2 = (hex: string) => '#' + new THREE.Color(hex).multiplyScalar(0.75).getHexString();

/**
 * The helmet and harness rack: a steel frame with a row of helmets on pegs, harnesses hanging under
 * them, a bin of climbing shoes at the foot, a mirror on its side and '안전 장비 착용 필수' on top.
 * Kitted up at it (a helmet off its peg and on, the harness stepped into and done up).
 */
const exHelmetRack: Builder = (g, W, D, _c, _def, _ctx, out) => {
  const z0 = -D / 2 + 0.18;
  for (const sx of [-1, 1]) {
    part(g, box(0.04, 1.85, 0.04), '#455a64', sx * (W / 2 - 0.08), 0.925, z0);
    part(g, rbox(0.06, 0.03, 0.4, 0.01), '#455a64', sx * (W / 2 - 0.08), 0.015, z0 + 0.06);
  }
  for (const y of [1.45, 1.0]) part(g, box(W - 0.16, 0.035, 0.035), '#546e7a', 0, y, z0);
  part(g, rbox(W - 0.1, 0.16, 0.03, 0.02), '#fdd835', 0, 1.88, z0);
  label(g, '안전 장비 착용 필수', W - 0.18, 0.1, 0, 1.88, z0 + 0.017, '#fdd835', '#212121');
  const cols = ['#e53935', '#1e88e5', '#fdd835'];
  const pegs = [-0.24, 0, 0.24];
  pegs.forEach((x) => part(g, cyl(0.008, 0.008, 0.1, 6), '#9e9e9e', x, 1.47, z0 + 0.05, { rx: Math.PI / 2, outline: false }));
  // The middle helmet is the one taken (gone from its peg while it's worn).
  const taken = new THREE.Group();
  g.add(taken);
  out.idle = taken;
  pegs.forEach((x, i) => helmet(i === 1 ? taken : g, x, 1.55, z0 + 0.1, cols[i]));
  for (const [i, col] of ['#ff7043', '#66bb6a', '#7e57c2'].entries()) {
    const x = -0.24 + i * 0.24;
    part(g, cyl(0.007, 0.007, 0.08, 6), '#9e9e9e', x, 1.02, z0 + 0.04, { rx: Math.PI / 2, outline: false });
    const lp = part(g, ring(0.07, 0.014), col, x, 0.88, z0 + 0.06);
    lp.scale.set(0.8, 1.45, 1);
    for (const sx of [-1, 1]) part(g, ring(0.04, 0.01), col, x + sx * 0.035, 0.7, z0 + 0.06);
  }
  part(g, rbox(W - 0.2, 0.22, 0.3, 0.03), '#37474f', 0, 0.13, z0 + 0.12);
  for (let i = 0; i < 3; i++) {
    const pr = shoes(g, ['#26a69a', '#ef5350', '#ffca28'][i]);
    pr.position.set(-0.22 + i * 0.22, 0.2, z0 + 0.12);
    pr.rotation.y = 0.3 * (i - 1);
    pr.scale.setScalar(0.8);
  }
  // A mirror on the side.
  part(g, rbox(0.03, 0.5, 0.3, 0.01), '#455a64', W / 2 - 0.05, 1.2, z0 + 0.2);
  part(g, box(0.006, 0.46, 0.26), '#cfe8f3', W / 2 - 0.068, 1.2, z0 + 0.2, { material: glow('#d6eef7'), outline: false });
  out.spots = { '*': stoodAt(g, 0, D / 2 + 0.05, Math.PI, 'gearUp', marker(g, 0, 1.55, z0 + 0.1)) };
};

// ---------------------------------------------------------------------------------------------
// The replay screen.

/**
 * A big screen on a rolling stand for going through a run: the panel in its black bezel on two
 * posts, its picture the last run frame by frame (a skater's air in slow motion, '슬로 ×0.25', the
 * timeline under it), a shelf below with the media box and an action camera on a little tripod. Gone
 * through with a tablet in hand — scrubbed, then the arm up pointing at the screen (the frame held
 * and the place circled), again elsewhere.
 */
const exReplayScreen: Builder = (g, W, D, _c, _def, _ctx, out) => {
  const sw = Math.min(1.6, W - 0.3);
  const sh = sw * 0.56;
  const cy = 1.4;
  const z = -D / 2 + 0.16;
  // The stand: a base on casters, two posts, the shelf.
  part(g, rbox(W - 0.4, 0.05, 0.5, 0.02), '#37474f', 0, 0.08, z + 0.05);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) caster(g, sx * (W / 2 - 0.26), z + 0.05 + sz * 0.2);
    part(g, box(0.06, cy - 0.1, 0.06), '#455a64', sx * 0.35, (cy - 0.1) / 2 + 0.1, z);
  }
  part(g, rbox(0.9, 0.03, 0.3, 0.01), '#546e7a', 0, 0.75, z + 0.06);
  part(g, rbox(0.3, 0.06, 0.2, 0.01), '#212121', -0.2, 0.795, z + 0.06);
  glowing(g, box(0.02, 0.01, 0.005), '#69f0ae', -0.1, 0.8, z + 0.162);
  // The action camera on its little tripod.
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    rod(g, new THREE.Vector3(0.25, 0.92, z + 0.06), new THREE.Vector3(0.25 + Math.cos(a) * 0.07, 0.765, z + 0.06 + Math.sin(a) * 0.07), 0.005, '#212121');
  }
  part(g, rbox(0.06, 0.045, 0.035, 0.008), '#212121', 0.25, 0.95, z + 0.06);
  part(g, cyl(0.013, 0.013, 0.01, 10), '#455a64', 0.25, 0.95, z + 0.08, { rx: Math.PI / 2, outline: false });
  // The screen.
  part(g, rbox(sw + 0.06, sh + 0.06, 0.06, 0.02), '#1b1b1f', 0, cy, z);
  label(g, '영상 분석', 0.2, 0.04, sw / 2 - 0.12, cy - sh / 2 - 0.015, z + 0.032, '#1b1b1f', '#90a4ae');
  const tex = painted('xreplay', 256 * REPLAY_FRAMES, 160, paintReplay);
  tex.repeat.set(1 / REPLAY_FRAMES, 1);
  const s = litScreen(g, tex, sw, sh, 0, cy, z + 0.032);
  out.screen = s;
  // The analyst a little off to the right of it (so as not to block it), the tablet by their chest.
  const sx0 = 0.35;
  const sz0 = D / 2 + 0.45;
  const work = marker(g, sx0, 1.02, sz0 - 0.32);
  const analyst = stoodAt(g, sx0, sz0, Math.PI, 'xReplay', work);
  const atW = framer(work.position, Math.PI);
  const live = new THREE.Group();
  g.add(live);
  out.inUse = live;
  const tablet = group(live, 0, 0, 0);
  part(tablet, rbox(0.24, 0.012, 0.17, 0.01), '#263238', 0, 0, 0);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.14), new THREE.MeshBasicMaterial({ map: tex }));
  face.userData.ownGeometry = face.userData.ownMaterial = true;
  face.rotation.x = -Math.PI / 2;
  face.position.y = 0.007;
  tablet.add(face);
  const circle = glowing(live, ring(0.07, 0.008), '#ffeb3b', 0, 0, z + 0.04);
  const spotOn = (o: BarOffset) => {
    const p = atW(o);
    return new THREE.Vector3(THREE.MathUtils.clamp(p.x, -sw / 2 + 0.08, sw / 2 - 0.08), THREE.MathUtils.clamp(p.y, cy - sh / 2 + 0.08, cy + sh / 2 - 0.08), z + 0.04);
  };
  out.animate = (t) => {
    const k = replayRound(t, phaseOf(analyst));
    // Played through, scrubbed back and forth, held on the frame being pointed at.
    const frame = k.pointing ? (k.pointing === 1 ? 4 : 6) : Math.floor(((Math.sin(t * 0.9) + 1) / 2) * (REPLAY_FRAMES - 0.01));
    tex.offset.x = frame / REPLAY_FRAMES;
    atW(k.l, tablet.position);
    tablet.rotation.set(0.55, Math.PI, 0);
    circle.visible = k.pointing > 0;
    if (k.pointing) circle.position.copy(spotOn(k.pointing === 1 ? REPLAY.point : REPLAY.point2));
  };
  out.spots = { '*': analyst };
};

// =============================================================================================
// The centre's yard (2026-11-05, the layout audit): the skydivers' van, the skate park's fun box and its fence.

/**
 * The skydiving team's van (new): a blue 12-seat 승합차 along where it parks, its nose to the front, 하늘바람 스카이다이빙 팀 on its
 * flanks, a roof rack with two packed rigs in their bags. Off to the airfield for a jump it pulls away forward with the driver at
 * the wheel and is gone; it backs in again after.
 */
const exCrewVan: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
  const van = new THREE.Group();
  g.add(van);
  const L = 4.8;
  const Wd = 1.8;
  const H = 2.0;
  const BODY = '#1565c0';
  const xb = -L / 2;
  const xf = L / 2;
  part(van, rbox(L - 0.5, H - 0.35, Wd, 0.12), BODY, -0.25, 0.35 + (H - 0.35) / 2, 0);
  part(van, rbox(0.7, 0.9, Wd - 0.02, 0.15), BODY, xf - 0.35, 0.8, 0);
  // The windscreen sloped back from the bonnet, the side windows in a band, the white stripe.
  part(van, box(0.04, 0.62, Wd - 0.2), '#bfe3f2', xf - 0.62, 1.55, 0, { rz: -0.35, outline: false });
  for (const sz of [-1, 1]) {
    part(van, box(L - 1.5, 0.5, 0.01), '#2a3a48', -0.35, 1.6, sz * (Wd / 2 + 0.005), { outline: false });
    part(van, box(L - 0.4, 0.1, 0.01), '#ffffff', -0.2, 0.95, sz * (Wd / 2 + 0.006), { outline: false });
    label(van, '하늘바람 스카이다이빙 팀', 1.7, 0.2, -0.4, 1.15, sz * (Wd / 2 + 0.012), BODY, '#ffffff', sz > 0 ? 0 : Math.PI);
    for (const wx of [xb + 0.85, xf - 0.95]) part(van, cyl(0.34, 0.34, 0.24, 18), '#212121', wx, 0.34, sz * (Wd / 2 - 0.08), { rx: Math.PI / 2 });
  }
  // The lamps, the plates, the back doors' seam.
  for (const sz of [-1, 1]) {
    glowing(van, rbox(0.03, 0.12, 0.26, 0.02), '#fffde7', xf + 0.005, 0.85, sz * (Wd / 2 - 0.25));
    part(van, rbox(0.03, 0.22, 0.12, 0.01), '#b71c1c', xb - 0.005, 1.0, sz * (Wd / 2 - 0.12));
  }
  label(van, '78허 3207', 0.42, 0.1, xf + 0.02, 0.5, 0, '#ffffff', '#111111', Math.PI / 2);
  label(van, '78허 3207', 0.42, 0.1, xb - 0.02, 0.6, 0, '#ffffff', '#111111', -Math.PI / 2);
  part(van, box(0.01, 1.3, 0.02), '#0d47a1', xb - 0.004, 1.05, 0, { outline: false });
  // The roof rack with the rigs.
  part(van, box(L - 1.2, 0.04, Wd - 0.3), '#424242', -0.4, H + 0.04, 0, { outline: false });
  for (const [x, c] of [[-1.0, '#ef6c00'], [0.1, '#7b1fa2']] as Array<[number, string]>) part(van, rbox(0.7, 0.3, 0.5, 0.1), c, x, H + 0.2, 0.2);
  // The driver, there while it moves.
  const driver = new THREE.Group();
  van.add(driver);
  part(driver, ball(0.13), '#f0c8a8', xf - 1.05, 1.5, -0.4);
  part(driver, rbox(0.3, 0.4, 0.36, 0.1), '#ef6c00', xf - 1.1, 1.18, -0.4);
  driver.visible = false;
  let state: 'parked' | 'leaving' | 'gone' | 'back' | undefined;
  let since = 0;
  const RUN = 10;
  out.away = (isOut, t) => {
    if (state === undefined) state = isOut ? 'gone' : 'parked';
    else if (isOut && (state === 'parked' || state === 'back')) [state, since] = ['leaving', t];
    else if (!isOut && (state === 'leaving' || state === 'gone')) [state, since] = ['back', t];
    let x = 0;
    if (state === 'leaving') {
      const u = Math.min(1, (t - since) / 4);
      x = RUN * u * u;
      if (u >= 1) state = 'gone';
    } else if (state === 'back') {
      const u = Math.min(1, (t - since) / 5.5);
      x = RUN * (1 - u) * (1 - u);
      if (u >= 1) state = 'parked';
    }
    van.position.x = x;
    van.visible = state !== 'gone';
    driver.visible = state === 'leaving' || state === 'back';
  };
  const door = marker(g, 0.6, 1.0, Wd / 2 + 0.02);
  out.work = door;
  out.spots = { '*': stoodAt(g, 0.6, Wd / 2 + 0.5, Math.PI, 'gesture' as Motion, door) };
};

/** The fun box (new): a concrete block with ramps up both ends, a ledge with its steel edge, and a grind rail along its length. */
const exFunBox: Builder = (g, W, D) => {
  const h = 0.45;
  const top = W - 1.6;
  const CON = '#b8b6ae';
  part(g, box(top, h, D - 0.3), CON, 0, h / 2, -0.1);
  for (const s of [-1, 1]) {
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.04, D - 0.3), new THREE.MeshToonMaterial({ color: CON }));
    ramp.userData.ownGeometry = ramp.userData.ownMaterial = true;
    ramp.position.set(s * (top / 2 + 0.4), h / 2, -0.1);
    ramp.rotation.z = -s * Math.atan2(h, 0.8);
    g.add(ramp);
  }
  part(g, box(top, 0.03, 0.04), STEEL, 0, h + 0.015, -0.1 + (D - 0.3) / 2, { outline: false });
  // The rail beside it on its two legs.
  const rz = D / 2 - 0.12;
  for (const x of [-W / 2 + 0.3, W / 2 - 0.3]) part(g, box(0.05, 0.32, 0.05), '#455a64', x, 0.16, rz);
  part(g, cyl(0.025, 0.025, W - 0.5, 10), '#eceff1', 0, 0.34, rz, { rz: Math.PI / 2 });
  label(g, 'XTREME PARK', 0.7, 0.14, 0, h * 0.55, -0.1 - (D - 0.3) / 2 - 0.006, '#212121', '#ffeb3b', Math.PI);
};

/** The skate park's fence (new; flat, walked over), held by the tile (15, 1): mesh round the park, the gate open on the pavement side. */
const exParkFence: Builder = (g) => {
  const at = (x: number) => x - 15.5;
  const atY = (y: number) => y - 1.5;
  fenceRun(g, at(15), atY(0.95), at(21.95), atY(0.95));
  fenceRun(g, at(21.95), atY(0.95), at(21.95), atY(14.9));
  fenceRun(g, at(15), atY(14.9), at(16), atY(14.9));
  fenceRun(g, at(18.4), atY(14.9), at(21.95), atY(14.9));
  part(g, rbox(1.2, 0.42, 0.03, 0.01), '#212121', at(20), 1.3, atY(14.9) + 0.04);
  label(g, '헬멧 착용 필수 · 스케이트 파크', 1.12, 0.34, at(20), 1.3, atY(14.9) + 0.06, '#212121', '#ffeb3b');
};

export const BUILDERS: Record<string, Builder> = {
  climbingWall,
  skateRamp,
  gearBench,
  jumpPlane,
  exBoulderWall,
  exTrampoline,
  exRentalCounter,
  exHelmetRack,
  exReplayScreen,
  exCrewVan,
  exFunBox,
  exParkFence,
};
