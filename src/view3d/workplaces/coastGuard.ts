import * as THREE from 'three';
import type { Motion } from '../activity';
import { marker, rod, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, glass, glow, label, litScreen, painted, picture, ring, text, type Paint } from './doctor';
import {
  DIVE_FACE,
  DIVERS,
  DRONE_AT,
  RINSE,
  THROW,
  cgHands,
  cgPhase,
  diveAt,
  diverKey,
  droneRound,
  gearState,
  rinseRound,
  throwRound,
  vhfRound,
  type BO,
} from './coastGuardMotion';

/**
 * The 해양경찰 파출소 drawn as itself (2026-10-27 workplace pipeline, at the user's request): the
 * dive training tank with the diver in it (kitted up, bubbles going up from the regulator), the
 * 연안구조정 moored in the station's basin out front in the coast guard's white and blue with 해양경찰
 * on its side, which puts out on patrol and to a call (the light bar going) — and what the station
 * was missing (workFurniture/coastGuard.ts): the dive gear rack, the wetsuit drying rack, the VHF
 * desk, the chart of the station's waters, the rescue drone's pad and the quay's life ring drill.
 *
 * The radar and the rescue gear locker are the seafarer's work (workplaces/seafarer.ts); the
 * station (푸른항), its waters, its islands and its boats are made up. The motions are in
 * coastGuardMotion.ts.
 */

const NAVY = '#0d2c6b';
const KCG_BLUE = '#1565c0';
const HULL = '#f4f6f8';
const STEEL = '#9aa7b0';
const GALV = '#b0bcc4';
const CONCRETE = '#b8b3a8';
const RUBBER = '#26282b';
const ORANGE = '#ff6d00';
const YELLOW = '#fbc02d';
const SEA = '#2e7d9a';
const STATION = '푸른항 파출소';
/** See-through parts, shared: the tank's acrylic and its water, the wheelhouse's glass, a mask's lens. */
const ACRYLIC = new THREE.MeshToonMaterial({ color: '#d9f3ff', transparent: true, opacity: 0.2, depthWrite: false });
const TANK_WATER = new THREE.MeshToonMaterial({ color: '#29a8e0', transparent: true, opacity: 0.3, depthWrite: false });
const SURFACE = new THREE.MeshToonMaterial({ color: '#7fd3f5', transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide });
const WHEEL_GLASS = new THREE.MeshToonMaterial({ color: '#28465c', transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide });
const LENS = new THREE.MeshToonMaterial({ color: '#b3e5fc', transparent: true, opacity: 0.55, depthWrite: false });
const BUBBLE = new THREE.MeshToonMaterial({ color: '#e1f5fe', transparent: true, opacity: 0.75 });
const SPRAY = new THREE.MeshToonMaterial({ color: '#e3f2fd', transparent: true, opacity: 0.45, depthWrite: false });
const FOAM = new THREE.MeshToonMaterial({ color: '#f5fbff', transparent: true, opacity: 0.7, depthWrite: false });

// ---------------------------------------------------------------------------------------------
// Small parts.

const tmp = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
/** Whether a dweller's posed at a spot just now (activity.ts spotPose marks it). */
const posed = (s: Spot, t: number) => Math.abs(t - posedAt(s)) < 0.6;
/** Which of a piece's spots is being used just now, if any. */
function nowAt(spots: Record<string, Spot>, t: number): string | null {
  let best: string | null = null;
  for (const [k, s] of Object.entries(spots)) if (k !== '*' && posed(s, t) && (best === null || posedAt(s) > posedAt(spots[best]))) best = k;
  return best;
}
/** How big whoever's at a spot is (1 for a 1.6 m adult). */
const kOf = (s: Spot) => ((s.at.userData.height as number | undefined) ?? 1.6) / 1.6;
/** The clock offset of a fixed mark on the piece (as the motion takes it from its `work`). */
const phaseOf = (m: THREE.Object3D) => cgPhase(m.getWorldPosition(tmp));

/** A spot stood at (`y` the floor under the feet), facing `yaw`, and what's done there. */
function standAt(g: THREE.Object3D, x: number, z: number, yaw: number, motion: Motion, work?: THREE.Object3D, y = 0): Spot {
  const s = spot(g, 'stand', x, y, z, yaw);
  s.work = work;
  s.motion = motion;
  return s;
}
/** A spot sat at (the seat's top `y`, over the floor `drop` below), facing `yaw`, and what's done there. */
function sitAt(g: THREE.Object3D, x: number, y: number, z: number, yaw: number, motion: Motion, work?: THREE.Object3D, drop = y): Spot {
  const s = spot(g, 'sit', x, y, z, yaw, drop);
  s.work = work;
  s.motion = motion;
  return s;
}
/** A group placed and turned in `parent`. */
function group(parent: THREE.Object3D, x = 0, y = 0, z = 0, ry = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}
/** A body-frame offset (coastGuardMotion.ts BO) at a spot, in the frame the spot's marker is in. */
function atSpot(s: Spot, p: BO, out = new THREE.Vector3()): THREE.Vector3 {
  const y = s.at.rotation.y;
  return out.set(s.at.position.x + Math.sin(y) * p.ahead + Math.cos(y) * p.side, s.at.position.y + p.up, s.at.position.z + Math.cos(y) * p.ahead - Math.sin(y) * p.side);
}
/** Puts a group on a spot's body (its +z ahead, +x their left), scaled to them. */
function onBody(m: THREE.Object3D, s: Spot) {
  m.position.copy(s.at.position);
  m.rotation.set(0, s.at.rotation.y, 0);
  m.scale.setScalar(kOf(s));
}
/** A picture lying flat on a top, its top edge away from the viewer at +z. */
const flat = (g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number) => picture(g, tex, w, h, x, y, z, '#ffffff', 0, -Math.PI / 2);
/** A painted decal with a see-through ground (lettering on a hull). */
function decal(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.35 }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  m.rotation.y = ry;
  g.add(m);
  return m;
}
/** A mesh of its own geometry, centred so its outline sits round it, placed where the geometry was. */
function solid(g: THREE.Object3D, geom: THREE.BufferGeometry, color: string, outline = true): THREE.Mesh {
  geom.computeBoundingBox();
  const c = geom.boundingBox!.getCenter(new THREE.Vector3());
  geom.translate(-c.x, -c.y, -c.z);
  const m = part(g, geom, color, c.x, c.y, c.z, { outline });
  m.userData.ownGeometry = true;
  return m;
}
/** A shape in the floor plan (x, z) extruded up from `y0` to `y1` (holes cut out of it). */
function extrudeUp(outline: Array<[number, number]>, y0: number, y1: number, holes: Array<Array<[number, number]>> = []): THREE.BufferGeometry {
  const sh = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)));
  for (const h of holes) sh.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z))));
  const geom = new THREE.ExtrudeGeometry(sh, { depth: y1 - y0, bevelEnabled: false, curveSegments: 6 });
  geom.rotateX(-Math.PI / 2);
  geom.translate(0, y0, 0);
  return geom;
}
/**
 * A hose or a line hung between two points (n short rods, sagging `sag` in the middle); returns the
 * way to move it. Drawn once straight so it's there before it's first moved.
 */
function hose(g: THREE.Object3D, n: number, r: number, color: string) {
  const segs = Array.from({ length: n }, () => part(g, cyl(r, r, 1, 6), color, 0, 0, 0, { outline: false }));
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const ctl = new THREE.Vector3();
  const p = (u: number, o: THREE.Vector3) => o.set(0, 0, 0).addScaledVector(a, (1 - u) * (1 - u)).addScaledVector(ctl, 2 * u * (1 - u)).addScaledVector(b, u * u);
  const p0 = new THREE.Vector3();
  const p1 = new THREE.Vector3();
  const d = new THREE.Vector3();
  return (from: THREE.Vector3, to: THREE.Vector3, sag: number) => {
    a.copy(from);
    b.copy(to);
    ctl.copy(a).add(b).multiplyScalar(0.5).addScaledVector(UP, -sag * 2);
    for (let i = 0; i < n; i++) {
      p(i / n, p0);
      p((i + 1) / n, p1);
      d.copy(p1).sub(p0);
      const len = Math.max(1e-4, d.length());
      segs[i].position.copy(p0).add(p1).multiplyScalar(0.5);
      segs[i].scale.set(1, len, 1);
      segs[i].quaternion.setFromUnitVectors(UP, d.multiplyScalar(1 / len));
    }
  };
}
/** The world yaw of a piece's frame. */
function yawOf(g: THREE.Object3D): number {
  const f = new THREE.Vector3(0, 0, 1).applyQuaternion(g.getWorldQuaternion(new THREE.Quaternion()));
  return Math.atan2(f.x, f.z);
}

/** A life ring (구명환): orange with four white bands, lying in its own x-y plane. */
function lifeRing(g: THREE.Object3D, x: number, y: number, z: number, r = 0.2, ry = 0, rx = 0): THREE.Group {
  const m = group(g, x, y, z, ry);
  m.rotation.x = rx;
  part(m, ring(r, r * 0.28), ORANGE, 0, 0, 0);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    part(m, cyl(r * 0.3, r * 0.3, r * 0.3, 10), '#fafafa', Math.cos(a) * r, Math.sin(a) * r, 0, { rz: a, outline: false });
  }
  return m;
}
/** A concrete tetrapod (테트라포드) of a breakwater: four legs out from its middle. */
function tetrapod(g: THREE.Object3D, x: number, z: number, s: number, ry: number) {
  const m = group(g, x, 0.28 * s, z, ry);
  const legs: Array<[number, number, number]> = [
    [0, 1, 0],
    [0.943, -0.333, 0],
    [-0.471, -0.333, 0.816],
    [-0.471, -0.333, -0.816],
  ];
  for (const [lx, ly, lz] of legs) {
    const leg = part(m, cyl(0.07 * s, 0.13 * s, 0.34 * s, 8), '#a9a59c', lx * 0.17 * s, ly * 0.17 * s, lz * 0.17 * s, { outline: true });
    leg.quaternion.setFromUnitVectors(UP, new THREE.Vector3(lx, ly, lz));
  }
  part(m, ball(0.13 * s), '#a9a59c', 0, 0, 0, { outline: false });
}
/** The sea in the basin: a flat green-blue with glints. */
function sea(g: THREE.Object3D, x0: number, x1: number, z0: number, z1: number, y = 0.02) {
  part(g, box(x1 - x0, 0.02, z1 - z0), SEA, (x0 + x1) / 2, y - 0.01, (z0 + z1) / 2, { outline: false, shadow: false });
  let s = Math.abs(Math.round(x0 * 31 + z0 * 17)) + 7;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const n = Math.round((x1 - x0) * (z1 - z0) * 5);
  for (let i = 0; i < n; i++) part(g, box(0.12 + rnd() * 0.18, 0.003, 0.012), '#8fd0df', x0 + 0.1 + rnd() * (x1 - x0 - 0.2), y + 0.002, z0 + 0.06 + rnd() * (z1 - z0 - 0.12), { outline: false, shadow: false });
}
/** A quay's concrete coping along x (its water face toward -z if `face` is -1), black fenders on its face. */
function coping(g: THREE.Object3D, x0: number, x1: number, z: number, face: number, fenders = true) {
  part(g, box(x1 - x0, 0.14, 0.18), CONCRETE, (x0 + x1) / 2, 0.07, z - face * 0.09);
  part(g, box(x1 - x0, 0.004, 0.05), '#fdd835', (x0 + x1) / 2, 0.142, z - face * 0.155, { outline: false });
  if (fenders) for (let x = x0 + 0.45; x < x1 - 0.2; x += 0.9) part(g, rbox(0.14, 0.12, 0.05, 0.015), RUBBER, x, 0.07, z + face * 0.02);
}
/** The same along z (its water face toward -x if `face` is -1). */
function copingZ(g: THREE.Object3D, z0: number, z1: number, x: number, face: number) {
  part(g, box(0.18, 0.14, z1 - z0), CONCRETE, x - face * 0.09, 0.07, (z0 + z1) / 2);
}
/** A mooring bollard: a squat black iron post with a cap. */
function bollard(g: THREE.Object3D, x: number, z: number) {
  part(g, cyl(0.07, 0.085, 0.2, 14), '#2b2d30', x, 0.1, z);
  part(g, cyl(0.1, 0.1, 0.04, 14), '#2b2d30', x, 0.22, z);
}

// ---------------------------------------------------------------------------------------------
// Paint.

/** The tank's floor: pale blue mosaic tiles with a dark lane cross. */
const tankTiles: Paint = (c) => {
  c.fillStyle = '#b3e5fc';
  c.fillRect(0, 0, 256, 256);
  c.strokeStyle = '#81d4fa';
  c.lineWidth = 2;
  for (let i = 0; i <= 256; i += 21) {
    c.beginPath();
    c.moveTo(i, 0);
    c.lineTo(i, 256);
    c.moveTo(0, i);
    c.lineTo(256, i);
    c.stroke();
  }
  c.fillStyle = '#0d47a1';
  c.fillRect(118, 30, 20, 196);
  c.fillRect(70, 30, 116, 18);
  c.fillRect(70, 208, 116, 18);
};
/** The depth scale on the tank's front post: 0.0–1.5 m in 10 cm marks. */
const depthRule: Paint = (c) => {
  c.fillStyle = '#fafafa';
  c.fillRect(0, 0, 48, 512);
  for (let i = 0; i <= 15; i++) {
    const y = 20 + i * 31.5;
    c.fillStyle = i % 5 === 0 ? '#c62828' : '#263238';
    c.fillRect(0, y - 2, i % 5 === 0 ? 30 : 18, 4);
    if (i % 5 === 0) text(c, (i / 10).toFixed(1), 46, y + 12, 13, '#263238', 'right');
  }
};
/** A side of the hull: the blue racing stripes at the bow, 해양경찰, the boat's number; `bowLeft` which end the bow is. */
const hullSide =
  (bowLeft: boolean): Paint =>
  (c) => {
    const W = 1024;
    const H = 96;
    c.clearRect(0, 0, W, H);
    c.save();
    if (!bowLeft) {
      c.translate(W, 0);
      c.scale(-1, 1);
    }
    // Two slanted stripes, navy then blue, leaning back from the bow.
    const band = (x: number, w: number, col: string) => {
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(x, H);
      c.lineTo(x + w, H);
      c.lineTo(x + w + 46, 0);
      c.lineTo(x + 46, 0);
      c.closePath();
      c.fill();
    };
    band(120, 54, NAVY);
    band(190, 22, KCG_BLUE);
    c.restore();
    const at = bowLeft ? 0 : W;
    const dir = bowLeft ? 1 : -1;
    text(c, '해양경찰', at + dir * 290, 52, 62, NAVY, bowLeft ? 'left' : 'right');
    text(c, 'P-127', at + dir * 26, 54, 34, NAVY, bowLeft ? 'left' : 'right');
  };
/** The bulwark over it: KOREA COAST GUARD and the stripes carried on up. */
const bulwarkSide =
  (bowLeft: boolean): Paint =>
  (c) => {
    const W = 1024;
    const H = 72;
    c.clearRect(0, 0, W, H);
    c.save();
    if (!bowLeft) {
      c.translate(W, 0);
      c.scale(-1, 1);
    }
    const band = (x: number, w: number, col: string) => {
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(x, H);
      c.lineTo(x + w, H);
      c.lineTo(x + w + 34, 0);
      c.lineTo(x + 34, 0);
      c.closePath();
      c.fill();
    };
    band(166, 54, NAVY);
    band(236, 22, KCG_BLUE);
    c.restore();
    text(c, 'KOREA COAST GUARD', bowLeft ? 330 : W - 330, 38, 34, NAVY, bowLeft ? 'left' : 'right');
  };
/** 태극기 on the stern staff. */
const taegeukgi: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 96, 64);
  c.save();
  c.translate(48, 32);
  c.rotate(-0.59);
  c.fillStyle = '#cd2e3a';
  c.beginPath();
  c.arc(0, 0, 16, Math.PI, 0);
  c.fill();
  c.fillStyle = '#0047a0';
  c.beginPath();
  c.arc(0, 0, 16, 0, Math.PI);
  c.fill();
  c.fillStyle = '#cd2e3a';
  c.beginPath();
  c.arc(-8, 0, 8, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#0047a0';
  c.beginPath();
  c.arc(8, 0, 8, 0, Math.PI * 2);
  c.fill();
  c.restore();
  // The four trigrams in the corners.
  c.fillStyle = '#111111';
  const tri = (x: number, y: number, a: number, broken: boolean[]) => {
    c.save();
    c.translate(x, y);
    c.rotate(a);
    broken.forEach((b, i) => {
      const yy = -7 + i * 5.5;
      if (b) {
        c.fillRect(-8, yy, 7, 3.5);
        c.fillRect(1, yy, 7, 3.5);
      } else c.fillRect(-8, yy, 16, 3.5);
    });
    c.restore();
  };
  tri(17, 13, -0.98, [false, false, false]);
  tri(79, 51, -0.98, [true, true, true]);
  tri(79, 13, 0.98, [false, true, false]);
  tri(17, 51, 0.98, [true, false, true]);
};
/** The chartplotter on the helm: the coast, the boat's track, the depth. */
const plotter: Paint = (c) => {
  c.fillStyle = '#0b2a3f';
  c.fillRect(0, 0, 256, 160);
  c.fillStyle = '#c9b77a';
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(110, 0);
  c.lineTo(80, 50);
  c.lineTo(30, 70);
  c.lineTo(0, 110);
  c.closePath();
  c.fill();
  c.strokeStyle = '#ffeb3b';
  c.setLineDash([6, 4]);
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(60, 70);
  c.lineTo(150, 100);
  c.lineTo(220, 60);
  c.stroke();
  c.setLineDash([]);
  c.fillStyle = '#ff5252';
  c.beginPath();
  c.moveTo(150, 92);
  c.lineTo(158, 108);
  c.lineTo(142, 108);
  c.closePath();
  c.fill();
  text(c, '12.4kn · 수심 18m', 8, 148, 14, '#b2ebf2');
};
/** The 관할 해역 상황판: the coast and islands of 푸른항, the patrol sectors, the weather. */
const seaChart: Paint = (c) => {
  const W = 640;
  const H = 400;
  c.fillStyle = '#bfe4f5';
  c.fillRect(0, 0, W, H);
  // Depth shading out to sea.
  c.fillStyle = '#9fd3ec';
  c.beginPath();
  c.moveTo(220, H);
  c.bezierCurveTo(300, 260, 460, 230, W, 200);
  c.lineTo(W, H);
  c.closePath();
  c.fill();
  // The coast along the top and left, the harbour.
  c.fillStyle = '#e8dcb0';
  c.strokeStyle = '#7a6a3a';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(W, 0);
  c.lineTo(W, 40);
  c.bezierCurveTo(520, 60, 470, 40, 420, 80);
  c.bezierCurveTo(380, 110, 330, 70, 300, 96);
  c.lineTo(282, 128);
  c.lineTo(262, 100);
  c.bezierCurveTo(220, 120, 150, 110, 120, 160);
  c.bezierCurveTo(90, 210, 60, 230, 0, 250);
  c.closePath();
  c.fill();
  c.stroke();
  // Islands.
  const isle = (x: number, y: number, rx: number, ry: number, name: string) => {
    c.fillStyle = '#e8dcb0';
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0.4, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    text(c, name, x, y + ry + 12, 13, '#5d4b1f', 'center');
  };
  isle(400, 200, 34, 18, '솔섬');
  isle(520, 300, 22, 12, '등대섬');
  isle(180, 300, 16, 10, '작은여');
  // Patrol sectors, dashed red.
  c.strokeStyle = '#d32f2f';
  c.setLineDash([8, 6]);
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(282, 130);
  c.lineTo(282, H);
  c.moveTo(282, 250);
  c.lineTo(W, 250);
  c.stroke();
  c.setLineDash([]);
  text(c, '1구역', 150, 210, 22, '#d32f2f');
  text(c, '2구역', 440, 140, 22, '#d32f2f');
  text(c, '3구역', 430, 360, 22, '#d32f2f');
  // The station, an anchor mark at the harbour.
  c.fillStyle = NAVY;
  c.beginPath();
  c.arc(282, 118, 9, 0, Math.PI * 2);
  c.fill();
  text(c, '⚓ ' + STATION, 296, 116, 15, NAVY);
  // The title and the weather.
  c.fillStyle = NAVY;
  c.fillRect(0, 0, W, 34);
  text(c, '관할 해역 상황판 · 푸른항 해양경찰 파출소', 14, 18, 19, '#ffffff');
  c.fillStyle = 'rgba(13,44,107,0.85)';
  c.fillRect(0, H - 30, W, 30);
  text(c, '풍속 8m/s  ·  파고 1.5m  ·  시정 양호  ·  만조 14:20  ·  주의보 없음', 14, H - 15, 15, '#e3f2fd');
};
/** The VHF desk's watch screen: channel 16, the DSC calls, the AIS targets. */
const vhfScreen: Paint = (c) => {
  c.fillStyle = '#071c2c';
  c.fillRect(0, 0, 320, 200);
  c.fillStyle = '#0d47a1';
  c.fillRect(0, 0, 320, 28);
  text(c, 'VHF 당직 · CH 16 조난 · 안전 호출', 10, 15, 14, '#ffffff');
  text(c, 'CH 16', 16, 62, 34, '#69f0ae');
  text(c, '수신 대기 · 스켈치 3', 16, 92, 13, '#b2dfdb');
  const rows = ['09:42 DSC 일반 · 제7해성호', '10:05 CH12 항무 · 입항 보고', '10:31 CH06 선박 간 · 어장 위치'];
  rows.forEach((r, i) => text(c, r, 16, 122 + i * 22, 13, i === 0 ? '#ffd54f' : '#cfd8dc'));
  // AIS targets on a little radar disc.
  c.strokeStyle = '#26a69a';
  c.lineWidth = 1.5;
  for (const r of [26, 50]) {
    c.beginPath();
    c.arc(255, 82, r, 0, Math.PI * 2);
    c.stroke();
  }
  c.fillStyle = '#ffeb3b';
  for (const [x, y] of [[240, 60], [278, 96], [262, 120]]) c.fillRect(x - 3, y - 3, 6, 6);
};

// ---------------------------------------------------------------------------------------------
// The scuba kit, drawn round a body (its +z ahead of them or toward a diver's head, metres on 1.6 m).

/** A scuba cylinder (yellow, with its valve and first stage) standing up, its foot at the origin. */
function cylinder(g: THREE.Object3D, h = 0.62, color = YELLOW): THREE.Group {
  const m = group(g);
  part(m, cyl(0.085, 0.085, h - 0.08, 18), color, 0, (h - 0.08) / 2 + 0.02, 0);
  part(m, ball(0.085), color, 0, h - 0.06, 0, { outline: false });
  part(m, cyl(0.08, 0.08, 0.04, 18), '#37474f', 0, 0.02, 0);
  part(m, box(0.04, 0.05, 0.04), CHROME, 0, h + 0.02, 0, { outline: false });
  part(m, cyl(0.03, 0.03, 0.02, 10), BLACK, 0.035, h + 0.04, 0, { rz: Math.PI / 2, outline: false });
  part(m, cyl(0.025, 0.025, 0.05, 10), '#78909c', 0, h + 0.06, -0.03, { rx: Math.PI / 2, outline: false });
  label(m, 'NITROX X', 0.1, 0.03, 0, h * 0.62, 0.0865, '#2e7d32', '#ffffff');
  return m;
}
/** A BCD jacket (black with blue trim) round the front of a tank, its shoulders at `y`. */
function bcd(g: THREE.Object3D, y: number, color = '#1f2328', trim = KCG_BLUE) {
  part(g, rbox(0.38, 0.5, 0.1, 0.04), color, 0, y - 0.25, 0.1);
  for (const sx of [-1, 1]) {
    part(g, rbox(0.1, 0.42, 0.05, 0.02), color, sx * 0.12, y - 0.22, 0.17);
    part(g, box(0.012, 0.36, 0.052), trim, sx * 0.16, y - 0.22, 0.17, { outline: false });
  }
  part(g, rbox(0.12, 0.05, 0.07, 0.02), '#424242', 0, y - 0.47, 0.17);
  // The inflator hose up the left shoulder.
  part(g, cyl(0.012, 0.012, 0.3, 8), '#111', 0.14, y - 0.1, 0.2, { outline: false });
  part(g, rbox(0.04, 0.06, 0.03, 0.01), '#616161', 0.14, y - 0.26, 0.21, { outline: false });
}
/** A mask (black skirt, clear lens, a strap) facing +z, its lens's middle at the origin. */
function mask(g: THREE.Object3D): THREE.Group {
  const m = group(g);
  part(m, rbox(0.16, 0.075, 0.04, 0.025), '#1b1b1b', 0, 0, -0.015);
  glass(m, box(0.13, 0.055, 0.006), 0, 0, 0.007, LENS);
  part(m, box(0.004, 0.06, 0.008), '#1b1b1b', 0, 0, 0.008, { outline: false });
  part(m, ring(0.095, 0.007), KCG_BLUE, 0, 0, -0.09, { rx: Math.PI / 2, outline: false });
  return m;
}
/** A regulator's second stage (black, a yellow purge face) facing +z. */
function regulator(g: THREE.Object3D, face = '#fbc02d'): THREE.Group {
  const m = group(g);
  part(m, cyl(0.032, 0.032, 0.04, 14), '#1b1b1b', 0, 0, 0, { rx: Math.PI / 2 });
  part(m, cyl(0.026, 0.026, 0.005, 14), face, 0, 0, 0.022, { rx: Math.PI / 2, outline: false });
  part(m, box(0.06, 0.018, 0.02), '#1b1b1b', 0, -0.03, 0.005, { outline: false });
  return m;
}
/** A pressure gauge console (SPG) facing +z. */
function gauge(g: THREE.Object3D): THREE.Group {
  const m = group(g);
  part(m, rbox(0.07, 0.11, 0.035, 0.015), '#263238', 0, 0, 0);
  part(m, cyl(0.026, 0.026, 0.004, 16), '#fafafa', 0, 0.015, 0.018, { rx: Math.PI / 2, outline: false });
  part(m, box(0.003, 0.022, 0.002), '#d32f2f', 0.006, 0.02, 0.021, { rz: -0.6, outline: false });
  return m;
}

// ---------------------------------------------------------------------------------------------
// The patrol boat's hull.

/** The boat's plan (x along it, the bow at -x; z across, round `zc`), shrunk by `inset`. */
function hullPlan(L: number, B: number, zc: number, inset: number): Array<[number, number]> {
  const xs = L / 2 - inset;
  const xb = -L / 2 + inset * 1.6;
  const b = B / 2 - inset;
  const knuckle = -L / 2 + 1.9;
  const pts: Array<[number, number]> = [
    [xs, zc - b],
    [xs, zc + b],
    [knuckle, zc + b],
  ];
  // The bow's curve in to its point and back out the other side.
  const n = 10;
  for (let i = 1; i <= n; i++) {
    const u = i / n;
    pts.push([knuckle + (xb - knuckle) * Math.sin((u * Math.PI) / 2) ** 1.2, zc + b * Math.cos((u * Math.PI) / 2) ** 0.8]);
  }
  for (let i = n - 1; i >= 1; i--) {
    const u = i / n;
    pts.push([knuckle + (xb - knuckle) * Math.sin((u * Math.PI) / 2) ** 1.2, zc - b * Math.cos((u * Math.PI) / 2) ** 0.8]);
  }
  pts.push([knuckle, zc - b]);
  return pts;
}

// ---------------------------------------------------------------------------------------------

// =============================================================================================
// The quay and the boat at it (2026-11-04, the layout audit).

const NOL = { outline: false };
/** The water is drawn at the ground's height, so the quay's edge stands up out of it as a kerb. */
const KERB = 0.35;

/**
 * 안벽 가장자리 (26 × 1): along the row's north edge, where the quay meets the water: the concrete kerb with its yellow edge line, a
 * bollard every four metres, tyre fenders hung over the side, an iron ladder down to the water.
 */
function quayEdge(g: THREE.Group, W: number, D: number) {
  const z = -D / 2;
  part(g, box(W, KERB, 0.4), '#9a968c', 0, KERB / 2, z + 0.2, NOL);
  part(g, box(W, 0.005, 0.1), '#fbc02d', 0, KERB + 0.003, z + 0.33, NOL);
  for (let x = -W / 2 + 2; x < W / 2; x += 4) {
    part(g, cyl(0.16, 0.2, 0.42, 12), '#37474f', x, KERB + 0.21, z + 0.2);
    part(g, cyl(0.24, 0.24, 0.06, 12), '#37474f', x, KERB + 0.45, z + 0.2);
  }
  for (let x = -W / 2 + 1; x < W / 2; x += 2) part(g, cyl(0.26, 0.26, 0.2, 14), '#1c1c1c', x, 0.2, z - 0.08, { rx: Math.PI / 2 });
  // The ladder over the edge.
  for (const sx of [-1, 1]) rod(g, new THREE.Vector3(-W / 2 + 3 + sx * 0.22, KERB + 0.5, z + 0.05), new THREE.Vector3(-W / 2 + 3 + sx * 0.22, 0, z - 0.06), 0.025, '#5d6b73');
}

/**
 * 연안구조정 (15 × 4): an S-65 class rescue boat, 15 m by 4, moored alongside with its bow east (+x): the grey aluminium hull with the
 * orange collar and the blue stripe, the wheelhouse forward of amidships with its wraparound windows, the mast with the radar, the
 * blue light and the antennas, the open after deck with the recovery platform, the stern ropes to the quay. Checked from the quay;
 * on a patrol or a call it puts out east and is gone, and comes back to its berth.
 */
function rescueBoat(g: THREE.Group, W: number, D: number, out: Built) {
  const boat = new THREE.Group();
  g.add(boat);
  const L = W - 0.3;
  const B = 3.6;
  const deck = 0.55;
  const zc = -0.05;
  // The hull: a long box tapered to a point at the bow, the orange collar round it, the stripe.
  part(boat, rbox(L - 2.5, 1.2, B, 0.25), '#cfd8dc', -1.1, deck - 0.6, zc);
  const bow = part(boat, cyl(B / 2, 0.15, 2.6, 4), '#cfd8dc', L / 2 - 1.3, deck - 0.6, zc, { rz: -Math.PI / 2 });
  bow.scale.set(1, 1, 0.62);
  part(boat, rbox(L - 0.6, 0.42, B + 0.35, 0.2), '#ff6f00', -0.2, deck - 0.05, zc);
  for (const sz of [-1, 1]) {
    part(boat, box(L - 3, 0.16, 0.02), '#1565c0', -1.2, deck - 0.45, zc + sz * (B / 2 + 0.01), NOL);
    label(boat, '해양경찰 S-07', 2.4, 0.32, 1.0, deck - 0.75, zc + sz * (B / 2 + 0.02), '#cfd8dc', '#0d47a1', sz > 0 ? 0 : Math.PI);
  }
  part(boat, box(L - 1.2, 0.04, B - 0.2), '#78909c', -0.6, deck + 0.18, zc, NOL);
  // The wheelhouse and its windows; the mast.
  part(boat, rbox(4.6, 1.9, B - 0.6, 0.15), '#eceff1', 1.4, deck + 1.15, zc);
  part(boat, box(4.62, 0.6, B - 0.58), '#1f2f40', 1.4, deck + 1.55, zc, NOL);
  part(boat, rbox(4.8, 0.12, B - 0.4, 0.05), '#eceff1', 1.4, deck + 2.15, zc);
  part(boat, cyl(0.06, 0.06, 2.0, 8), '#eceff1', 0.6, deck + 3.1, zc);
  part(boat, rbox(1.4, 0.12, 0.35, 0.05), '#37474f', 0.6, deck + 3.5, zc);
  part(boat, cyl(0.1, 0.1, 0.18, 10), '#2979ff', 0.6, deck + 4.15, zc);
  for (const sz of [-1, 1]) part(boat, cyl(0.015, 0.015, 1.4, 6), '#eceff1', 0.2, deck + 3.4, zc + sz * 0.6, NOL);
  // The after deck: the recovery platform, a life raft canister, the stern ropes to the quay's bollards.
  part(boat, box(1.0, 0.08, B - 0.4), '#455a64', -L / 2 - 0.2, deck - 0.35, zc, NOL);
  part(boat, cyl(0.35, 0.35, 1.0, 12), '#eceff1', -3.6, deck + 0.55, zc - 0.9, { rz: Math.PI / 2 });
  for (const x of [-L / 2 + 0.8, L / 2 - 2.2]) rod(boat, new THREE.Vector3(x, deck + 0.3, zc + B / 2), new THREE.Vector3(x + (x < 0 ? -0.6 : 0.6), 0.5, D / 2 + 0.35), 0.03, '#e8d9b0');
  boat.position.y = 0.1;
  const check = spot(g, 'stand', 1.4, 0, D / 2 + 0.5, Math.PI);
  check.work = marker(g, 1.4, 1.2, D / 2 - 0.4);
  check.motion = 'tinker';
  out.work = check.work;
  out.spots = { '*': check };
  let x = 0;
  let last = 0;
  out.away = (isOut, t) => {
    const dt = Math.min(0.1, Math.max(0, t - last));
    last = t;
    x = THREE.MathUtils.clamp(x + (isOut ? 1 : -1) * dt * 0.3, 0, 1);
    boat.position.x = x * x * 30;
    boat.visible = x < 0.98;
  };
}

// ---------------------------------------------------------------------------------------------
// The 전용부두's patrol ship (2026-11-04, the branch lots: workFurniture/coastGuard.ts).

/**
 * 경비함 선체 (cgPatrolHull, 1 × 1, anchored at the bow's first deck tile and drawn round the deck like the seafarer's sfHull): the deck runs
 * x 1..24, y 1..6 on the lot, narrowing to the bow. Her sides in the coast guard's white with the blue and orange slash near the bow, the hull number 3012 and
 * 해양경찰 on them, the bulwark along the deck, the bow raked out over the water to the west, the transom at the east end.
 */
function patrolHull(anchor: THREE.Group) {
  // Anchored on the deck's first tile at the bow, (3, 1); drawn from (1, 1): lot x = this x + 1, lot y = this z + 1. The deck narrows to the bow at the west.
  const g = group(anchor, -2, 0, 0);
  const x0 = 1.5;
  const x1 = 23.5;
  const zN = -0.5;
  const zS = 5.5;
  const tip = new THREE.Vector2(-2.6, (zN + zS) / 2);
  const side = (len: number, cx: number, cz: number, ry: number) => {
    const s = group(g, cx, 0, cz, ry);
    part(s, box(len, 1.5, 0.25), HULL, 0, 0.2, 0, NOL);
    part(s, box(len, 0.16, 0.26), '#263238', 0, -0.48, 0, NOL);
    part(s, box(len, 0.06, 0.3), STEEL, 0, 0.98, 0, NOL);
  };
  for (const z of [zN, zS]) {
    side(x1 - x0, (x0 + x1) / 2, z, 0);
    // The bow, raked in to its point.
    const dx = x0 - tip.x;
    const dz = z - tip.y;
    side(Math.hypot(dx, dz) + 0.12, (x0 + tip.x) / 2, (z + tip.y) / 2, -Math.atan2(dz, dx));
    const out = z < 0 ? -1 : 1;
    const zf = z + out * 0.13;
    const ry = out < 0 ? Math.PI : 0;
    // The slash: a broad blue band and a thin orange one, leaning back, near the bow; the hull number; the name.
    for (const [w, x, c] of [[0.7, 3.4, KCG_BLUE], [0.18, 4.0, ORANGE]] as Array<[number, number, string]>) part(g, box(w, 1.3, 0.006), c, x, 0.2, zf, { rz: -0.45, outline: false });
    label(g, '3012', 1.4, 0.55, 6.3, 0.42, zf + out * 0.003, HULL, NAVY, ry);
    label(g, '해양경찰  KOREA COAST GUARD', 4.4, 0.34, 13, 0.42, zf + out * 0.003, HULL, KCG_BLUE, ry);
  }
  // The transom across the east end, her name and home port on it.
  part(g, box(0.25, 1.5, zS - zN + 0.25), HULL, x1, 0.2, (zN + zS) / 2, NOL);
  part(g, box(0.3, 0.06, zS - zN + 0.3), STEEL, x1, 0.98, (zN + zS) / 2, NOL);
  label(g, '3012함 · 푸른항', 1.8, 0.3, x1 + 0.14, 0.4, (zN + zS) / 2, HULL, NAVY, Math.PI / 2);
  // The deck forward, out to the point over the water.
  const fore = new THREE.Shape([new THREE.Vector2(x0 + 0.1, -zN), new THREE.Vector2(tip.x + 0.15, -tip.y), new THREE.Vector2(x0 + 0.1, -zS)]);
  const deck = new THREE.Mesh(new THREE.ShapeGeometry(fore), new THREE.MeshToonMaterial({ color: '#6f7f76' }));
  deck.userData.ownGeometry = deck.userData.ownMaterial = true;
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = 0.03;
  g.add(deck);
  // The jack staff at the bow.
  part(g, cyl(0.03, 0.03, 1.6, 8), STEEL, tip.x + 0.6, 1.0, (zN + zS) / 2);
}

/**
 * 고속단정 · 대빗 (cgRhibDavit, 3 × 2): the fast boat at the stern on its cradle, orange tubes round a grey hull, its console and
 * the engine at the back; over it the davit's arm on its post with the hook and falls. Going out (cgIntercept) the boat is swung out
 * and gone, and back on its cradle when the crew are back.
 */
function rhibDavit(g: THREE.Group, W: number, D: number, out: Built) {
  // The davit: its post at the back, the arm out over the boat, the hook.
  const px = -W / 2 + 0.35;
  const pz = -D / 2 + 0.3;
  part(g, cyl(0.12, 0.16, 2.4, 12), GALV, px, 1.2, pz);
  part(g, rbox(2.0, 0.16, 0.18, 0.04), GALV, px + 0.95, 2.35, pz + 0.2, { ry: -0.25 });
  part(g, cyl(0.012, 0.012, 1.1, 6), BLACK, px + 1.6, 1.8, pz + 0.55);
  part(g, ring(0.05, 0.012), ORANGE, px + 1.6, 1.22, pz + 0.55);
  // The cradle.
  for (const x of [-0.6, 0.6]) part(g, box(0.1, 0.35, 1.2), STEEL, x + 0.2, 0.17, 0.1);
  // The boat.
  const boat = group(g, 0.2, 0.35, 0.1);
  part(boat, rbox(2.2, 0.28, 0.9, 0.12), '#546e7a', 0, 0.05, 0);
  for (const s of [-1, 1]) part(boat, cyl(0.17, 0.17, 2.1, 14), ORANGE, 0, 0.25, s * 0.48, { rz: Math.PI / 2 });
  part(boat, ball(0.17), ORANGE, 1.05, 0.25, 0.48, NOL);
  part(boat, ball(0.17), ORANGE, 1.05, 0.25, -0.48, NOL);
  part(boat, cyl(0.17, 0.17, 0.96, 14), ORANGE, 1.1, 0.25, 0, { rx: Math.PI / 2 });
  part(boat, rbox(0.4, 0.4, 0.4, 0.04), '#eceff1', 0.1, 0.4, 0);
  part(boat, box(0.36, 0.2, 0.01), '#263238', 0.1, 0.62, 0.15, { rx: -0.6, outline: false });
  part(boat, rbox(0.3, 0.42, 0.3, 0.05), BLACK, -1.0, 0.45, 0);
  for (const s of [-1, 1]) label(boat, '해양경찰', 0.5, 0.1, 0.2, 0.25, s * 0.66, ORANGE, '#ffffff', s > 0 ? 0 : Math.PI);
  label(g, '고속단정', 0.4, 0.1, -W / 2 + 0.35, 1.0, pz + 0.17, NAVY, '#ffffff');
  out.away = (isOut) => {
    boat.visible = !isOut;
  };
  const s = spot(g, 'stand', 0.2, 0, D / 2 + 0.4, Math.PI);
  s.work = marker(g, 0.2, 0.8, 0.5);
  out.work = s.work;
  out.spots = { '*': s };
}

export const BUILDERS: Record<string, Builder> = {
  cgPatrolHull(g) {
    patrolHull(g);
  },
  cgRhibDavit(g, W, D, _c, _def, _ctx, out) {
    rhibDavit(g, W, D, out);
  },
  hbQuayEdge(g, W, D) {
    quayEdge(g, W, D);
  },
  cgRescueBoat(g, W, D, _c, _def, _ctx, out) {
    rescueBoat(g, W, D, out);
  },
  /**
   * The dive training tank: a galvanised frame round clear acrylic walls on a dark plinth, the water
   * 1.5 m deep over a pale blue mosaic floor with a dark lane cross, a depth scale on the front post,
   * an aluminium ladder up the right side with its rails over the rim and down inside, a rail round
   * the back, a descent line from an orange surface buoy to a weight, a weighted hoop to hover through
   * and an orange rescue manikin on the bottom for recovery drills; underwater lights that come on.
   * Diving, the dweller's in the water face down in trim (Spot 'fly'), kitted up — the yellow tank and
   * the BCD on the back, the mask on — and the dive goes round (cgDive): down the line equalising,
   * hovering, the mask cleared, an OK, the gauge read, a slow turn round the tank, back up; the
   * bubbles go up from the regulator to the surface.
   */
  divingTank(g, W, D, _c, _def, _ctx, out) {
    const x0 = -W / 2 + 0.06;
    const x1 = W / 2 - 0.2;
    const z0 = -D / 2 + 0.06;
    const z1 = D / 2 - 0.06;
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const iw = x1 - x0;
    const id = z1 - z0;
    const base = 0.14;
    const top = 1.74;
    const surf = 1.6;
    // Plinth, floor, frame.
    part(g, rbox(iw + 0.12, base, id + 0.12, 0.02), '#455a64', cx, base / 2, cz);
    flat(g, painted('cgTankTiles', 256, 256, tankTiles), iw - 0.02, id - 0.02, cx, base + 0.003, cz);
    for (const x of [x0, x1]) for (const z of [z0, z1]) part(g, box(0.07, top + 0.04, 0.07), GALV, x, (top + 0.04) / 2, z);
    for (const z of [z0, z1]) part(g, box(iw + 0.07, 0.07, 0.07), GALV, cx, top, z);
    for (const x of [x0, x1]) part(g, box(0.07, 0.07, id + 0.07), GALV, x, top, cz);
    for (const z of [z0, z1]) part(g, box(iw, 0.05, 0.05), GALV, cx, base + 0.03, z, { outline: false });
    // The acrylic walls and the water.
    glass(g, box(iw - 0.06, top - base - 0.06, 0.02), cx, (top + base) / 2, z1, ACRYLIC);
    glass(g, box(iw - 0.06, top - base - 0.06, 0.02), cx, (top + base) / 2, z0, ACRYLIC);
    glass(g, box(0.02, top - base - 0.06, id - 0.06), x0, (top + base) / 2, cz, ACRYLIC);
    glass(g, box(0.02, top - base - 0.06, id - 0.06), x1, (top + base) / 2, cz, ACRYLIC);
    glass(g, box(iw - 0.05, surf - base, id - 0.05), cx, (surf + base) / 2, cz, TANK_WATER);
    glass(g, new THREE.PlaneGeometry(iw - 0.05, id - 0.05), cx, surf, cz, SURFACE, -Math.PI / 2).userData.ownGeometry = true;
    // The depth scale and the signs.
    picture(g, painted('cgDepthRule', 48, 512, depthRule), 0.05, surf - base, x0 + 0.05, (surf + base) / 2, z1 + 0.04);
    label(g, '잠수 훈련 수조 · 수심 1.5m', 0.9, 0.065, cx + 0.15, top, z1 + 0.04, NAVY, '#ffffff');
    label(g, '해양경찰', 0.36, 0.06, cx - 0.55, top, z1 + 0.04, '#ffffff', NAVY);
    // A rail round the back and the left at hand height over the rim.
    for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1]]) part(g, cyl(0.018, 0.018, 0.34, 8), STEEL, x, top + 0.2, z, { outline: false });
    part(g, cyl(0.018, 0.018, iw, 8), STEEL, cx, top + 0.36, z0, { rz: Math.PI / 2, outline: false });
    part(g, cyl(0.018, 0.018, id, 8), STEEL, x0, top + 0.36, cz, { rx: Math.PI / 2, outline: false });
    // The ladder up the right side, over the rim and down inside.
    const lx = x1 + 0.09;
    for (const z of [-0.18, 0.18]) {
      part(g, cyl(0.018, 0.018, top + 0.3, 8), '#cfd8dc', lx, (top + 0.3) / 2, cz + z, { outline: false });
      rod(g, new THREE.Vector3(lx, top + 0.3, cz + z), new THREE.Vector3(x1 - 0.08, top + 0.3, cz + z), 0.018, '#cfd8dc');
      rod(g, new THREE.Vector3(x1 - 0.08, top + 0.3, cz + z), new THREE.Vector3(x1 - 0.08, surf - 0.5, cz + z), 0.016, '#cfd8dc');
    }
    for (let y = 0.3; y < top; y += 0.3) part(g, cyl(0.014, 0.014, 0.36, 8), '#cfd8dc', lx, y, cz, { rx: Math.PI / 2, outline: false });
    for (let y = surf - 0.4; y < top + 0.1; y += 0.3) part(g, cyl(0.012, 0.012, 0.36, 8), '#cfd8dc', x1 - 0.08, y, cz, { rx: Math.PI / 2, outline: false });
    // The descent line: a buoy on the surface, the line down to its weight.
    const bx = x0 + 0.2;
    const bz = z0 + 0.2;
    part(g, ball(0.07), ORANGE, bx, surf + 0.02, bz);
    rod(g, new THREE.Vector3(bx, surf, bz), new THREE.Vector3(bx, base + 0.08, bz), 0.006, YELLOW);
    part(g, rbox(0.12, 0.08, 0.12, 0.02), '#37474f', bx, base + 0.04, bz);
    // A weighted hoop to hover through, in the back-right corner.
    part(g, rbox(0.2, 0.05, 0.12, 0.02), '#37474f', x1 - 0.24, base + 0.025, z0 + 0.2);
    part(g, ring(0.22, 0.018), ORANGE, x1 - 0.24, base + 0.27, z0 + 0.2, { ry: Math.PI / 4 });
    // A rescue manikin lying on the bottom along the front.
    const man = group(g, x0 + 0.5, base, z1 - 0.2);
    part(man, rbox(0.5, 0.1, 0.22, 0.05), ORANGE, 0, 0.05, 0);
    part(man, ball(0.08), '#ffcc80', 0.33, 0.07, 0);
    for (const sz of [-1, 1]) part(man, rbox(0.42, 0.07, 0.08, 0.03), '#37474f', -0.44, 0.04, sz * 0.06);
    // Underwater lights on the back wall: dark, lit while someone's in.
    for (const x of [cx - 0.5, cx + 0.5]) part(g, cyl(0.06, 0.06, 0.03, 14), '#37474f', x, base + 0.25, z0 + 0.04, { rx: Math.PI / 2 });
    const use = group(g);
    out.inUse = use;
    for (const x of [cx - 0.5, cx + 0.5]) part(use, cyl(0.045, 0.045, 0.01, 14), '#e0f7fa', x, base + 0.25, z0 + 0.06, { rx: Math.PI / 2, outline: false, material: glow('#e0f7fa') });
    // The kit worn in the water, put on the diver as they go round (+z toward the head, +y their back).
    const kit = group(use);
    const tank = cylinder(kit, 0.6);
    tank.rotation.x = Math.PI / 2;
    tank.position.set(0, 0.19, -0.05);
    part(kit, rbox(0.36, 0.05, 0.48, 0.03), '#1f2328', 0, 0.115, 0.25);
    for (const sx of [-1, 1]) part(kit, rbox(0.06, 0.16, 0.36, 0.02), '#1f2328', sx * 0.19, 0.04, 0.27);
    const lens = mask(kit);
    lens.position.set(0, DIVE_FACE.up - 0.005, DIVE_FACE.ahead);
    lens.rotation.x = Math.PI / 2;
    const reg = regulator(kit);
    reg.position.set(0, DIVE_FACE.up - 0.02, DIVE_FACE.ahead - 0.07);
    reg.rotation.x = Math.PI / 2;
    rod(kit, new THREE.Vector3(0.04, 0.2, 0.57), new THREE.Vector3(0.05, -0.05, 0.6), 0.01, '#111');
    rod(kit, new THREE.Vector3(-0.04, 0.2, 0.57), new THREE.Vector3(-0.12, -0.04, 0.42), 0.01, YELLOW);
    // Bubbles, each let go from the regulator and going up to the surface.
    const N = 18;
    const bubbles = Array.from({ length: N }, (_, i) => {
      const m = new THREE.Mesh(ball(0.012 + (i % 3) * 0.006), BUBBLE);
      use.add(m);
      return { m, from: new THREE.Vector3(cx, surf - 0.5, cz), last: 1, drift: (i * 0.618) % 1 };
    });
    const work = marker(g, cx, 0.9, cz);
    out.work = work;
    const dive = spot(g, 'fly', cx, 1, cz, Math.PI / 2, 1 - base);
    dive.work = work;
    dive.motion = 'cgDive';
    out.spots = { '*': dive };
    const emit = new THREE.Vector3();
    out.animate = (t) => {
      const ph = phaseOf(work);
      const d = diveAt(t, ph);
      dive.at.position.set(cx, THREE.MathUtils.lerp(surf - 0.22, base + 0.5, d.depth), cz);
      dive.at.rotation.y = Math.PI / 2 + d.turn;
      dive.drop = dive.at.position.y - base;
      const diver = DIVERS.get(diverKey(work.getWorldPosition(tmp)));
      if (diver && Math.abs(diver.t - t) < 0.5) {
        kit.visible = true;
        kit.position.copy(g.worldToLocal(diver.at.clone()));
        kit.rotation.set(0, diver.yaw - yawOf(g), 0);
        kit.scale.setScalar(diver.k);
        kit.updateMatrixWorld(true);
        emit.copy(g.worldToLocal(kit.localToWorld(new THREE.Vector3(0, DIVE_FACE.up - 0.04, DIVE_FACE.ahead - 0.1))));
      } else {
        kit.visible = false;
        emit.copy(dive.at.position);
      }
      // Each bubble's let go again when its turn comes round, wobbling up from where the regulator was.
      for (let i = 0; i < N; i++) {
        const b = bubbles[i];
        const u = (((t / 2.6 + i / N) % 1) + 1) % 1;
        if (u < b.last) b.from.copy(emit).add(new THREE.Vector3((b.drift - 0.5) * 0.06, 0, ((b.drift * 7) % 1 - 0.5) * 0.06));
        b.last = u;
        const y = b.from.y + u * 2.6 * (0.42 + 0.1 * b.drift);
        b.m.visible = y < surf - 0.01 && u > 0.02;
        b.m.position.set(b.from.x + 0.025 * Math.sin(t * 5 + i), y, b.from.z + 0.025 * Math.cos(t * 4.3 + i * 2));
      }
    };
  },

  /**
   * The 연안구조정 moored in the station's basin: a white hull with a navy boot-top, the coast guard's
   * navy and blue stripes slanting back from the bow, 해양경찰 and P-127 on its sides and KOREA COAST
   * GUARD on the bulwark, a black rubber fender round it; the wheelhouse (navy fascia lettered 해양경찰,
   * tinted windows the crew show through, the blue-red light bar, a radar dome, the mast with its VHF
   * whips and lights, a searchlight, red and green side lights, life rings on its sides), the bow's
   * rail and anchor, the aft deck's bitt and coiled line, twin outboards and 태극기 on the stern staff.
   * It's drawn in a concrete-edged basin out to the lot's edge (bollards and its mooring lines, a
   * ladder down, the quay's yellow edge line), with a red harbour light and tetrapods at the mouth.
   * It rocks at its lines. Checking it over before it puts out the dweller sits at the helm, the
   * instruments lit (steer); out on patrol or to a call it casts off and goes out bow first, the light
   * bar flashing and a wake behind it, and comes back in after.
   */
  patrolBoat(g, _W, _D, _c, _def, _ctx, out) {
    const L = 5.6;
    const B = 1.6;
    const zc = -0.5;
    const DECK = 0.57;
    // The basin: the water out to the lot's edge and a little past, its coping, the quay's apron.
    const qz = 0.5;
    const bz = -1.5;
    sea(g, -4.2, 3.0, bz + 0.18, qz - 0.18);
    coping(g, -3.0, 3.0, qz - 0.18, -1);
    part(g, box(6.0, 0.02, 1.0), '#cfcac0', 0, 0.012, qz + 0.5, { outline: false, shadow: false });
    coping(g, -4.2, 3.0, bz + 0.18, 1, false);
    for (const x of [-1.9, 1.9]) bollard(g, x, qz + 0.12);
    // A ladder down into the water.
    for (const dx of [-0.17, 0.17]) {
      const lx = -2.55 + dx;
      rod(g, new THREE.Vector3(lx, 0.45, qz + 0.1), new THREE.Vector3(lx, 0.45, qz - 0.2), 0.016, '#cfd8dc');
      rod(g, new THREE.Vector3(lx, 0.45, qz - 0.2), new THREE.Vector3(lx, 0.0, qz - 0.2), 0.016, '#cfd8dc');
      rod(g, new THREE.Vector3(lx, 0.45, qz + 0.1), new THREE.Vector3(lx, 0.14, qz + 0.1), 0.016, '#cfd8dc');
    }
    for (let y = 0.08; y < 0.4; y += 0.14) part(g, cyl(0.012, 0.012, 0.34, 6), '#cfd8dc', -2.55, y, qz - 0.2, { rz: Math.PI / 2, outline: false });
    // A life ring on its post on the quay, and the berth's sign.
    part(g, cyl(0.03, 0.03, 1.0, 8), '#eceff1', -2.5, 0.5, qz + 0.75);
    lifeRing(g, -2.5, 0.82, qz + 0.79, 0.17);
    part(g, cyl(0.025, 0.025, 1.1, 8), '#78909c', 2.6, 0.55, qz + 0.85);
    label(g, `해양경찰 ${STATION} 계류장`, 0.7, 0.14, 2.6, 1.15, qz + 0.875, NAVY, '#ffffff');
    label(g, '관계자 외 출입 금지', 0.7, 0.09, 2.6, 0.99, qz + 0.875, '#ffffff', '#c62828');
    // The harbour mouth past the lot's edge: tetrapods and a little red light.
    for (const [x, z, s, r] of [
      [-3.4, qz + 0.32, 1, 0.3],
      [-3.9, qz + 0.5, 1.1, 1.4],
      [-4.4, qz + 0.3, 0.9, 2.2],
      [-3.7, bz - 0.25, 1, 0.9],
      [-4.3, bz - 0.3, 1.05, 2.6],
    ] as Array<[number, number, number, number]>)
      tetrapod(g, x, z, s, r);
    const lh = group(g, -4.1, 0, qz + 1.05);
    part(lh, cyl(0.32, 0.36, 0.2, 18), '#eceff1', 0, 0.1, 0);
    part(lh, cyl(0.17, 0.24, 1.4, 18), '#d32f2f', 0, 0.9, 0);
    for (const y of [0.55, 1.05]) part(lh, cyl(0.235 - (y - 0.2) * 0.05, 0.245 - (y - 0.2) * 0.05, 0.08, 18), '#fafafa', 0, y, 0, { outline: false });
    part(lh, cyl(0.24, 0.24, 0.04, 18), '#263238', 0, 1.62, 0);
    glass(lh, cyl(0.13, 0.13, 0.22, 14), 0, 1.75, 0, LENS);
    part(lh, ball(0.06), '#ff8a80', 0, 1.75, 0, { outline: false, material: glow('#ff8a80') });
    part(lh, cyl(0.02, 0.17, 0.12, 14), '#263238', 0, 1.92, 0);

    // The boat.
    const boat = group(g);
    const outer = hullPlan(L, B, zc, 0);
    solid(boat, extrudeUp(hullPlan(L, B, zc, -0.008), -0.2, 0.16), NAVY);
    solid(boat, extrudeUp(outer, 0.16, DECK), HULL);
    solid(boat, extrudeUp(hullPlan(L, B, zc, 0.07), DECK, DECK + 0.015), '#8d9aa1', false);
    solid(boat, extrudeUp(outer, DECK, 0.86, [hullPlan(L, B, zc, 0.06)]), HULL);
    solid(boat, extrudeUp(hullPlan(L, B, zc, -0.045), 0.46, 0.54, [hullPlan(L, B, zc, 0.004)]), RUBBER, false);
    // The livery on both sides of the straight run of hull.
    const sx0 = -L / 2 + 1.9;
    const sx1 = L / 2;
    const sl = sx1 - sx0;
    decal(boat, painted('cgHullL', 1024, 96, hullSide(true)), sl, 0.3, (sx0 + sx1) / 2, 0.3, zc + B / 2 + 0.004);
    decal(boat, painted('cgHullR', 1024, 96, hullSide(false)), sl, 0.3, (sx0 + sx1) / 2, 0.3, zc - B / 2 - 0.004, Math.PI);
    decal(boat, painted('cgBulwarkL', 1024, 72, bulwarkSide(true)), sl, 0.21, (sx0 + sx1) / 2, 0.72, zc + B / 2 + 0.004);
    decal(boat, painted('cgBulwarkR', 1024, 72, bulwarkSide(false)), sl, 0.21, (sx0 + sx1) / 2, 0.72, zc - B / 2 - 0.004, Math.PI);
    // The bow: a rubber nose, the anchor, the pulpit rail round it.
    part(boat, rbox(0.12, 0.3, 0.16, 0.05), RUBBER, -L / 2 + 0.02, 0.62, zc);
    part(boat, box(0.06, 0.16, 0.025), '#37474f', -L / 2 + 0.35, 0.68, zc + 0.27, { ry: 0.5 });
    part(boat, rbox(0.18, 0.1, 0.16, 0.03), '#455a64', -L / 2 + 0.6, DECK + 0.07, zc);
    const rail: Array<[number, number]> = [];
    for (const [x, z] of outer) if (x < -L / 2 + 1.7) rail.push([x, z]);
    rail.sort((a, b) => Math.atan2(a[1] - zc, -(a[0] + 1)) - Math.atan2(b[1] - zc, -(b[0] + 1)));
    for (let i = 0; i < rail.length; i++) {
      const [x, z] = rail[i];
      const inX = x + 0.06;
      const inZ = zc + (z - zc) * 0.92;
      if (i % 3 === 0) part(boat, cyl(0.012, 0.012, 0.32, 6), CHROME, inX, 1.02, inZ, { outline: false });
      if (i > 0) {
        const [px, pz] = rail[i - 1];
        rod(boat, new THREE.Vector3(px + 0.06, 1.17, zc + (pz - zc) * 0.92), new THREE.Vector3(inX, 1.17, inZ), 0.012, CHROME);
      }
    }
    // The wheelhouse.
    const wx0 = -0.75;
    const wx1 = 0.95;
    const ww = B - 0.32;
    const wl = wx1 - wx0;
    const wcx = (wx0 + wx1) / 2;
    const lowTop = 1.3;
    const roof = 2.3;
    part(boat, rbox(wl, lowTop - DECK, ww, 0.04), HULL, wcx, (lowTop + DECK) / 2, zc);
    for (const x of [wx0 + 0.035, wx1 - 0.035]) for (const s of [-1, 1]) part(boat, box(0.07, roof - lowTop, 0.07), HULL, x, (roof + lowTop) / 2, zc + s * (ww / 2 - 0.035));
    for (const s of [-1, 1]) part(boat, box(0.05, roof - lowTop, 0.05), HULL, wcx + 0.1, (roof + lowTop) / 2, zc + s * (ww / 2 - 0.03));
    for (const s of [-1, 1]) part(boat, box(0.05, roof - lowTop, 0.05), HULL, wx0 + 0.03, (roof + lowTop) / 2, zc + s * 0.22);
    // The tinted glass: the sides, the front (raked a little), the back.
    for (const s of [-1, 1]) glass(boat, box(wl - 0.08, roof - lowTop - 0.04, 0.01), wcx, (roof + lowTop) / 2, zc + s * (ww / 2 - 0.02), WHEEL_GLASS);
    const front = glass(boat, box(0.01, roof - lowTop - 0.04, ww - 0.08), wx0 + 0.02, (roof + lowTop) / 2, zc, WHEEL_GLASS);
    front.rotation.z = -0.12;
    glass(boat, box(0.01, roof - lowTop - 0.04, ww - 0.08), wx1 - 0.02, (roof + lowTop) / 2, zc, WHEEL_GLASS);
    // The door on the quay side, aft.
    part(boat, box(0.4, roof - DECK - 0.15, 0.02), '#e8ecef', wx1 - 0.3, (roof + DECK) / 2 - 0.05, zc + ww / 2 + 0.012);
    part(boat, rbox(0.03, 0.1, 0.03, 0.01), CHROME, wx1 - 0.45, 1.2, zc + ww / 2 + 0.03, { outline: false });
    // The roof, its navy fascia lettered 해양경찰.
    part(boat, rbox(wl + 0.16, 0.1, ww + 0.16, 0.03), HULL, wcx, roof + 0.05, zc);
    for (const s of [-1, 1]) {
      part(boat, box(wl + 0.16, 0.1, 0.01), NAVY, wcx, roof + 0.05, zc + s * (ww / 2 + 0.085), { outline: false });
      label(boat, '해양경찰  KOREA COAST GUARD', 1.2, 0.07, wcx, roof + 0.05, zc + s * (ww / 2 + 0.092), NAVY, '#ffffff', s > 0 ? 0 : Math.PI);
    }
    part(boat, box(0.01, 0.1, ww + 0.16), NAVY, wx0 - 0.085, roof + 0.05, zc, { outline: false });
    label(boat, '해양경찰', 0.5, 0.075, wx0 - 0.092, roof + 0.05, zc, NAVY, '#ffffff', -Math.PI / 2);
    // On the roof: the light bar, the radar dome, the searchlight, the mast with its whips and lights.
    part(boat, rbox(0.95, 0.06, 0.18, 0.02), '#263238', wx0 + 0.35, roof + 0.13, zc);
    for (let i = 0; i < 6; i++) part(boat, rbox(0.14, 0.08, 0.14, 0.03), i % 2 === 0 ? '#1e3a8a' : '#7f1d1d', wx0 + 0.35 + (i - 2.5) * 0.15, roof + 0.2, zc, { outline: false });
    const bar = group(boat);
    const barLit: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) barLit.push(part(bar, rbox(0.145, 0.085, 0.145, 0.03), i % 2 === 0 ? '#448aff' : '#ff1744', wx0 + 0.35 + (i - 2.5) * 0.15, roof + 0.2, zc, { outline: false, material: glow(i % 2 === 0 ? '#448aff' : '#ff1744') }));
    bar.visible = false;
    part(boat, cyl(0.06, 0.06, 0.1, 10), '#455a64', wcx + 0.35, roof + 0.15, zc);
    part(boat, cyl(0.22, 0.22, 0.22, 20), '#fafafa', wcx + 0.35, roof + 0.31, zc);
    part(boat, ball(0.22), '#fafafa', wcx + 0.35, roof + 0.42, zc, { outline: false });
    part(boat, cyl(0.07, 0.08, 0.16, 12), '#212121', wx0 + 0.1, roof + 0.2, zc - 0.45, { rz: Math.PI / 2 });
    part(boat, cyl(0.06, 0.06, 0.01, 12), '#fff9c4', wx0 + 0.01, roof + 0.2, zc - 0.45, { rz: Math.PI / 2, outline: false });
    const mx = wx1 - 0.1;
    for (const s of [-1, 1]) rod(boat, new THREE.Vector3(mx + 0.05, roof + 0.1, zc + s * 0.35), new THREE.Vector3(mx - 0.02, roof + 1.0, zc), 0.022, CHROME);
    part(boat, cyl(0.02, 0.02, 0.35, 8), CHROME, mx - 0.02, roof + 1.15, zc, { outline: false });
    part(boat, box(0.04, 0.03, 0.7), CHROME, mx - 0.02, roof + 0.95, zc, { outline: false });
    for (const s of [-1, 1]) part(boat, cyl(0.008, 0.012, 1.0, 6), '#fafafa', mx - 0.02, roof + 1.45, zc + s * 0.34, { outline: false });
    part(boat, ball(0.035), '#fffde7', mx - 0.02, roof + 1.36, zc, { outline: false });
    // Side lights: red to port (+z), green to starboard.
    part(boat, box(0.12, 0.06, 0.03), '#b71c1c', wx0 + 0.15, lowTop - 0.06, zc + ww / 2 + 0.02, { outline: false });
    part(boat, box(0.12, 0.06, 0.03), '#1b5e20', wx0 + 0.15, lowTop - 0.06, zc - ww / 2 - 0.02, { outline: false });
    // Life rings on the wheelhouse sides.
    for (const s of [-1, 1]) lifeRing(boat, wcx - 0.2, 0.96, zc + s * (ww / 2 + 0.035), 0.16);
    // Inside: the helm console with its plotter, the wheel, the helm and navigator seats.
    part(boat, rbox(0.3, 0.55, ww - 0.12, 0.03), '#37474f', wx0 + 0.22, DECK + 0.48, zc);
    out.screen = litScreen(boat, painted('cgPlotter', 256, 160, plotter), 0.3, 0.19, wx0 + 0.385, DECK + 0.6, zc + 0.08);
    out.screen.rotation.y = Math.PI / 2;
    const helmZ = zc - 0.3;
    const hub = group(boat, wx0 + 0.46, 1.38, helmZ, 0);
    hub.rotation.z = -0.5;
    part(hub, ring(0.15, 0.014), '#1a1a1a', 0, 0, 0, { ry: Math.PI / 2 });
    for (let i = 0; i < 3; i++) rod(hub, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, Math.cos((i * Math.PI * 2) / 3) * 0.14, Math.sin((i * Math.PI * 2) / 3) * 0.14), 0.01, CHROME);
    part(hub, cyl(0.035, 0.035, 0.05, 12), CHROME, 0, 0, 0, { rz: Math.PI / 2, outline: false });
    rod(boat, new THREE.Vector3(wx0 + 0.46, 1.38, helmZ), new THREE.Vector3(wx0 + 0.36, 1.3, helmZ), 0.022, '#1a1a1a');
    const wheelAt = marker(hub, 0, 0, 0);
    for (const z of [helmZ, zc + 0.3]) {
      const sx = wx0 + 0.95;
      part(boat, cyl(0.05, 0.05, 0.42, 10), '#455a64', sx, DECK + 0.21, z, { outline: false });
      part(boat, rbox(0.44, 0.09, 0.44, 0.04), '#212121', sx, DECK + 0.46, z);
      part(boat, rbox(0.1, 0.55, 0.44, 0.04), '#212121', sx + 0.24, DECK + 0.78, z, { rz: -0.1 });
    }
    // Instruments lit, side lights on while it's checked over.
    const on = group(boat);
    out.inUse = on;
    part(on, box(0.13, 0.065, 0.035), '#ff5252', wx0 + 0.15, lowTop - 0.06, zc + ww / 2 + 0.025, { outline: false, material: glow('#ff5252') });
    part(on, box(0.13, 0.065, 0.035), '#69f0ae', wx0 + 0.15, lowTop - 0.06, zc - ww / 2 - 0.025, { outline: false, material: glow('#69f0ae') });
    for (let i = 0; i < 3; i++) part(on, box(0.02, 0.03, 0.04), ['#69f0ae', '#ffd740', '#69f0ae'][i], wx0 + 0.38, DECK + 0.4, zc - 0.05 + i * 0.07, { outline: false, material: glow(['#69f0ae', '#ffd740', '#69f0ae'][i]) });
    // The aft deck: a bitt, a coiled line, a life raft canister on the wheelhouse back, a rescue stretcher.
    part(boat, box(0.08, 0.16, 0.36), '#455a64', 1.6, DECK + 0.08, zc);
    for (const s of [-1, 1]) part(boat, cyl(0.04, 0.04, 0.24, 10), '#455a64', 1.6, DECK + 0.12, zc + s * 0.15);
    for (let i = 0; i < 4; i++) part(boat, ring(0.13 - i * 0.02, 0.014), '#f5f5f5', 2.1, DECK + 0.02 + i * 0.022, zc + 0.3, { rx: Math.PI / 2, outline: false });
    part(boat, cyl(0.17, 0.17, 0.6, 16), '#fafafa', wx1 + 0.24, DECK + 0.5, zc, { rx: Math.PI / 2 });
    part(boat, box(0.08, 0.36, 0.08), '#90a4ae', wx1 + 0.24, DECK + 0.18, zc, { outline: false });
    part(boat, rbox(0.9, 0.05, 0.42, 0.03), ORANGE, 2.2, DECK + 0.03, zc - 0.32);
    for (const s of [-1, 1]) part(boat, box(0.9, 0.06, 0.02), '#e65100', 2.2, DECK + 0.07, zc - 0.32 + s * 0.2, { outline: false });
    // Stanchions and a rail along the aft bulwarks.
    for (const s of [-1, 1]) {
      const zz = zc + s * (B / 2 - 0.04);
      for (const x of [1.15, 1.75, 2.35]) part(boat, cyl(0.012, 0.012, 0.3, 6), CHROME, x, 1.0, zz, { outline: false });
      part(boat, cyl(0.012, 0.012, 1.3, 6), CHROME, 1.75, 1.15, zz, { rz: Math.PI / 2, outline: false });
    }
    // Twin outboards on the transom.
    for (const s of [-1, 1]) {
      const oz = zc + s * 0.35;
      part(boat, rbox(0.34, 0.5, 0.3, 0.1), '#37474f', L / 2 + 0.2, 0.92, oz);
      part(boat, box(0.01, 0.06, 0.24), '#fafafa', L / 2 + 0.37, 1.02, oz, { outline: false });
      part(boat, box(0.12, 0.6, 0.1), '#263238', L / 2 + 0.18, 0.4, oz, { outline: false });
    }
    // 태극기 on its staff at the stern.
    rod(boat, new THREE.Vector3(L / 2 - 0.08, 0.86, zc + 0.6), new THREE.Vector3(L / 2 + 0.05, 1.75, zc + 0.6), 0.014, '#eceff1');
    const flag = picture(boat, painted('cgTaegeukgi', 96, 64, taegeukgi), 0.36, 0.24, L / 2 + 0.24, 1.6, zc + 0.6);
    (flag.material as THREE.MeshBasicMaterial).side = THREE.DoubleSide;
    // The wake: white water at the bow and a trail behind it, while it's under way.
    const wake = group(boat);
    for (const s of [-1, 1]) glass(wake, box(1.6, 0.01, 0.12), -L / 2 + 0.9, 0.035, zc + s * (B / 2 + 0.3), FOAM).rotation.set(0, s * 0.35, 0);
    glass(wake, box(3.2, 0.01, B - 0.2), L / 2 + 1.8, 0.035, zc, FOAM);
    for (let i = 0; i < 5; i++) glass(wake, ball(0.12 + i * 0.03), L / 2 + 0.4 + i * 0.5, 0.06, zc + (i % 2 ? 0.25 : -0.25), SPRAY);
    wake.visible = false;
    // Its mooring lines to the bollards (cast off when it goes).
    const lines = group(g);
    rod(lines, new THREE.Vector3(1.9, 0.18, qz + 0.12), new THREE.Vector3(2.3, 0.86, zc + B / 2), 0.014, '#eeeeee');
    rod(lines, new THREE.Vector3(-1.9, 0.18, qz + 0.12), new THREE.Vector3(-1.2, 0.86, zc + B / 2 - 0.05), 0.014, '#eeeeee');
    // At the helm, checking it over.
    const helm = sitAt(boat, wx0 + 0.95, DECK + 0.5, helmZ, -Math.PI / 2, 'steer', wheelAt, 0.5);
    out.work = wheelAt;
    out.spots = { cgBoatCheck: helm, '*': helm };
    // Rocking at its lines; off on a call it goes out bow first (-x) and is gone, and comes back in.
    let state: 'moored' | 'leaving' | 'gone' | 'back' | undefined;
    let since = 0;
    out.away = (isOut, t) => {
      if (state === undefined) state = isOut ? 'gone' : 'moored';
      else if (isOut && (state === 'moored' || state === 'back')) [state, since] = ['leaving', t];
      else if (!isOut && (state === 'leaving' || state === 'gone')) [state, since] = ['back', t];
      const s = t - since;
      let x = 0;
      if (state === 'leaving') {
        const r = Math.max(0, s - 1.0);
        x = -1.3 * r * r;
        if (s > 5) state = 'gone';
      } else if (state === 'back') {
        const u = Math.min(1, s / 6);
        x = -20 * (1 - u) * (1 - u);
        if (u >= 1) state = 'moored';
      }
      const moving = state === 'leaving' || state === 'back';
      boat.position.set(x, 0.02 * Math.sin(t * 0.9) + (moving ? 0.03 : 0), 0);
      boat.rotation.set(0.014 * Math.sin(t * 0.7), 0, moving ? -0.03 : 0.008 * Math.sin(t * 0.53));
      boat.visible = state !== 'gone';
      lines.visible = state === 'moored';
      wake.visible = moving && Math.abs(x) > 0.05;
      bar.visible = moving;
      if (moving) {
        // Blue and red in turn.
        const flash = Math.floor(t * 6) % 2;
        barLit.forEach((m, i) => (m.visible = (i % 2 === 0) === (flash === 0)));
      }
    };
  },

  /**
   * The dive gear rack: a galvanised rack against the wall — a ready set (a BCD strapped to its
   * yellow tank) hung in the middle, two more BCDs on hangers to the left over a shelf of masks and
   * fins with boots under it, and to the right a tank stood on a bench with its regulator on (first
   * stage on the valve, the second stage and the gauge console hung on a hook); a sign over it.
   * Kitting up the dweller takes the set off the rack, swings it on, does up the straps and the buckle,
   * pulls the mask down and puts the regulator in, breathes and gives an OK, then hangs it all back
   * (cgGearUp; the set's on their back meanwhile). Checking the regulator the second stage comes off
   * its hook on its hose, is purged, breathed from, the gauge read and the valve turned (cgRegCheck).
   */
  cgDiveRack(g, W, D, _c, _def, _ctx, out) {
    const zb = -D / 2 + 0.05;
    const h = 1.95;
    // The frame: uprights, the top rail, a bench and a shelf.
    for (const x of [-W / 2 + 0.06, -0.24, W / 2 - 0.06]) {
      part(g, box(0.05, h, 0.05), GALV, x, h / 2, zb + 0.06);
      part(g, box(0.05, 0.05, 0.36), GALV, x, 0.02, zb + 0.2, { outline: false });
    }
    part(g, cyl(0.022, 0.022, W - 0.1, 10), GALV, 0, 1.78, zb + 0.14, { rz: Math.PI / 2 });
    part(g, box(W - 0.1, 0.04, 0.05), GALV, 0, h - 0.03, zb + 0.06);
    label(g, '잠수 장비 · 사용 후 담수 세척', 1.3, 0.09, 0, h + 0.1, zb + 0.04, NAVY, '#ffffff');
    // The left: two BCDs on hangers over the masks and fins shelf, boots under.
    const lx = -0.62;
    part(g, rbox(0.7, 0.03, 0.34, 0.01), GALV, lx, 0.52, zb + 0.2);
    for (const [i, col, trim] of [[0, '#1f2328', KCG_BLUE], [1, '#263238', ORANGE]] as Array<[number, string, string]>) {
      const bx = lx - 0.17 + i * 0.36;
      rod(g, new THREE.Vector3(bx, 1.78, zb + 0.14), new THREE.Vector3(bx, 1.66, zb + 0.14), 0.008, '#90a4ae');
      part(g, box(0.36, 0.02, 0.02), '#90a4ae', bx, 1.62, zb + 0.14, { outline: false });
      const bc = group(g, bx, 0, zb + 0.05);
      bcd(bc, 1.64, col, trim);
    }
    for (let i = 0; i < 3; i++) {
      const m = mask(g);
      m.position.set(lx - 0.22 + i * 0.22, 0.58, zb + 0.28);
      m.rotation.x = -0.6;
    }
    for (let i = 0; i < 2; i++) {
      const fx = lx - 0.15 + i * 0.3;
      part(g, rbox(0.17, 0.03, 0.5, 0.02), i ? '#1565c0' : '#212121', fx, 0.555, zb + 0.18, { rx: 0.08 });
      part(g, rbox(0.12, 0.06, 0.16, 0.03), '#37474f', fx, 0.58, zb + 0.06);
    }
    for (let i = 0; i < 3; i++) part(g, rbox(0.11, 0.22, 0.22, 0.04), '#212121', lx - 0.2 + i * 0.2, 0.11, zb + 0.2);
    // The middle: the ready set hung on its hook (shown here while nobody's using it).
    const ready = (parent: THREE.Object3D) => {
      const set = group(parent, 0, 0, 0);
      cylinder(set, 0.62).position.set(0, 0, 0);
      bcd(set, 0.64);
      return set;
    };
    part(g, rbox(0.06, 0.04, 0.12, 0.01), GALV, 0, 1.3, zb + 0.1, { outline: false });
    const idle = group(g);
    out.idle = idle;
    ready(idle).position.set(0, 0.62, zb + 0.16);
    // The right: the tank on the bench with its regulator (the hoses drawn to the hook).
    const tx = 0.4;
    const tz = zb + 0.22;
    part(g, rbox(0.62, 0.05, 0.36, 0.01), GALV, 0.62, 0.32, zb + 0.2);
    for (const x of [0.36, 0.88]) part(g, box(0.04, 0.3, 0.3), GALV, x, 0.15, zb + 0.2, { outline: false });
    cylinder(g, 0.62, '#b0bec5').position.set(tx, 0.345, tz);
    const valve = new THREE.Vector3(tx, 1.0, tz);
    part(g, rbox(0.07, 0.06, 0.06, 0.02), CHROME, tx, 1.02, tz + 0.03, { outline: false });
    const hookAt = new THREE.Vector3(0.3, 1.18, zb + 0.06);
    part(g, cyl(0.01, 0.01, 0.12, 6), CHROME, 0.3, 1.18, zb + 0.12, { rx: Math.PI / 2, outline: false });
    // A second tank on the bench and a log on the side.
    cylinder(g, 0.62).position.set(0.78, 0.345, tz);
    const cb = group(g, W / 2 + 0.005, 1.0, zb + 0.2, Math.PI / 2);
    part(cb, box(0.18, 0.25, 0.008), '#8d6e63', 0, 0, 0);
    part(cb, box(0.16, 0.2, 0.002), '#fafafa', 0, -0.015, 0.005, { outline: false });
    label(cb, '공기 충전 기록', 0.14, 0.025, 0, 0.06, 0.007, '#fafafa', '#263238');
    // The regulator at rest on its hook; moved while it's checked.
    const restReg = group(idle);
    const r0 = regulator(restReg);
    r0.position.copy(hookAt).add(new THREE.Vector3(0, -0.06, 0.06));
    const g0 = gauge(restReg);
    g0.position.copy(hookAt).add(new THREE.Vector3(0.08, -0.14, 0.05));
    hose(restReg, 8, 0.01, '#111')(valve, r0.position, 0.1);
    hose(restReg, 8, 0.01, '#111')(valve, g0.position, 0.12);

    const use = group(g);
    out.inUse = use;
    const rackSet = ready(use);
    rackSet.position.set(0, 0.62, zb + 0.16);
    const held = ready(use);
    // Worn: the tank and the BCD on the back (the body's frame, +z ahead), the mask, the regulator in.
    const worn = group(use);
    const wTank = cylinder(worn, 0.62);
    wTank.position.set(0, 0.78, -0.21);
    part(worn, rbox(0.36, 0.5, 0.06, 0.03), '#1f2328', 0, 1.12, -0.13);
    for (const sx of [-1, 1]) {
      rod(worn, new THREE.Vector3(sx * 0.1, 1.34, -0.12), new THREE.Vector3(sx * 0.1, 1.38, 0.0), 0.022, '#1f2328');
      rod(worn, new THREE.Vector3(sx * 0.1, 1.38, 0.0), new THREE.Vector3(sx * 0.11, 1.12, 0.12), 0.022, '#1f2328');
    }
    part(worn, rbox(0.1, 0.05, 0.05, 0.02), '#424242', 0, 1.12, 0.13);
    const wMask = mask(worn);
    const wReg = regulator(worn);
    wReg.position.set(0, 1.375, 0.12);
    rod(worn, new THREE.Vector3(0.0, 1.355, 0.11), new THREE.Vector3(-0.12, 1.3, 0.0), 0.011, '#111');
    rod(worn, new THREE.Vector3(-0.12, 1.3, 0.0), new THREE.Vector3(-0.05, 1.44, -0.2), 0.011, '#111');
    // The checked regulator and gauge and their hoses.
    const liveReg = regulator(use);
    const liveGauge = gauge(use);
    const regHose = hose(use, 10, 0.01, '#111');
    const gaugeHose = hose(use, 10, 0.01, '#111');

    const hanger = marker(g, 0, 1.22, zb + 0.16);
    out.work = hanger;
    const zs = 0.68;
    const gear = standAt(g, 0, zs, Math.PI, 'cgGearUp', hanger);
    const check = standAt(g, 0, zs, Math.PI, 'cgRegCheck', hanger);
    const spots: Record<string, Spot> = { cgGearUp: gear, cgRegCheck: check, '*': gear };
    out.spots = spots;
    const pa = new THREE.Vector3();
    const pb = new THREE.Vector3();
    out.animate = (t) => {
      const ph = phaseOf(hanger);
      const now = nowAt(spots, t) ?? 'cgGearUp';
      if (now === 'cgRegCheck') {
        const k = kOf(check);
        const { hands, beat } = cgHands.reg(t, ph, k);
        rackSet.visible = true;
        held.visible = worn.visible = false;
        const out2 = beat.from === 'take' && beat.e < 0.5 ? 'hook' : beat.from === 'back' && beat.e > 0.5 ? 'hook' : beat.from === 'back' && beat.e === 0 && beat.v > beat.hold * 0.6 ? 'hook' : 'hand';
        if (out2 === 'hook') liveReg.position.copy(hookAt).add(new THREE.Vector3(0, -0.06, 0.06));
        else liveReg.position.copy(atSpot(check, hands.r, pa)).add(new THREE.Vector3(0, -0.02, 0));
        liveReg.rotation.set(0, 0, 0);
        const reading = beat.from === 'gauge';
        if (reading) liveGauge.position.copy(atSpot(check, hands.l, pb)).add(new THREE.Vector3(0, 0.03, 0));
        else liveGauge.position.copy(hookAt).add(new THREE.Vector3(0.08, -0.14, 0.05));
        liveGauge.rotation.set(reading ? -0.5 : 0, reading ? Math.PI : 0, 0);
        liveReg.visible = liveGauge.visible = true;
        regHose(valve, liveReg.position, 0.12);
        gaugeHose(valve, liveGauge.position, 0.14);
        return;
      }
      // Kitting up.
      const k = kOf(gear);
      const { hands, beat } = cgHands.gear(t, ph, k);
      const s = gearState(beat);
      rackSet.visible = s.where === 'rack';
      held.visible = s.where === 'hands';
      worn.visible = s.where === 'back';
      if (s.where === 'hands') {
        const mid = atSpot(gear, { side: (hands.l.side + hands.r.side) / 2, up: (hands.l.up + hands.r.up) / 2 - 0.62, ahead: (hands.l.ahead + hands.r.ahead) / 2 + 0.02 }, pa);
        held.position.copy(mid);
        held.rotation.set(0, gear.at.rotation.y + Math.PI, 0);
      }
      onBody(worn, gear);
      wMask.visible = s.mask !== 'none';
      if (s.mask === 'face') {
        wMask.position.set(0, 1.47, 0.105);
        wMask.rotation.set(0, 0, 0);
      } else {
        wMask.position.set(0, 1.565, 0.08);
        wMask.rotation.set(-0.7, 0, 0);
      }
      wReg.visible = s.reg;
      // The rack's own regulator stays on its hook meanwhile.
      liveReg.position.copy(hookAt).add(new THREE.Vector3(0, -0.06, 0.06));
      liveReg.rotation.set(0, 0, 0);
      liveGauge.position.copy(hookAt).add(new THREE.Vector3(0.08, -0.14, 0.05));
      liveGauge.rotation.set(0, 0, 0);
      regHose(valve, liveReg.position, 0.1);
      gaugeHose(valve, liveGauge.position, 0.12);
    };
  },

  /**
   * The wetsuit drying rack: a galvanised A-frame rail with three wetsuits on hangers (black with
   * blue side panels and knee pads, 해양경찰 on the chest), a blue rinse tub of fresh water at its left
   * end, fins and boots drying on a drip tray under them, a hose reel on the right end with its spray
   * gun, and a sign. Rinsing a suit the dweller takes it down off the rail, dunks and swishes it in the tub
   * (bent over it), lifts it out dripping, hangs it back, smooths it down and hoses it over (cgRinse).
   */
  cgWetsuitRack(g, W, _D, _c, _def, _ctx, out) {
    const rz = -0.3;
    const railY = RINSE.hook.up;
    for (const sx of [-1, 1]) {
      const x = sx * (W / 2 - 0.06);
      rod(g, new THREE.Vector3(x, 0, rz - 0.19), new THREE.Vector3(x, railY + 0.04, rz), 0.024, GALV);
      rod(g, new THREE.Vector3(x, 0, rz + 0.3), new THREE.Vector3(x, railY + 0.04, rz), 0.024, GALV);
      part(g, box(0.05, 0.03, 0.42), GALV, x, 0.3, rz + 0.04, { outline: false });
    }
    part(g, cyl(0.022, 0.022, W - 0.1, 10), GALV, 0, railY, rz, { rz: Math.PI / 2 });
    label(g, '잠수복 담수 세척 후 그늘 건조', 0.95, 0.075, 0.4, railY + 0.16, rz, NAVY, '#ffffff');
    part(g, cyl(0.008, 0.008, 0.16, 6), GALV, 0.4, railY + 0.07, rz, { outline: false });
    /** A wetsuit on its hanger, the hook's top at the origin. */
    const suit = (parent: THREE.Object3D, trim = KCG_BLUE): THREE.Group => {
      const m = group(parent);
      rod(m, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.08, 0), 0.007, '#90a4ae');
      part(m, rbox(0.42, 0.03, 0.03, 0.01), '#455a64', 0, -0.09, 0, { outline: false });
      part(m, rbox(0.38, 0.6, 0.07, 0.05), '#1c1d20', 0, -0.4, 0);
      for (const sx of [-1, 1]) {
        part(m, box(0.04, 0.5, 0.072), trim, sx * 0.16, -0.42, 0, { outline: false });
        part(m, rbox(0.1, 0.56, 0.07, 0.04), '#1c1d20', sx * 0.25, -0.38, 0, { rz: sx * 0.12 });
        part(m, rbox(0.14, 0.66, 0.07, 0.05), '#1c1d20', sx * 0.09, -1.02, 0);
        part(m, box(0.12, 0.1, 0.075), trim, sx * 0.09, -0.98, 0, { outline: false });
      }
      label(m, '해양경찰', 0.16, 0.04, 0.07, -0.25, 0.037, '#1c1d20', '#ffffff');
      return m;
    };
    const hookX = (i: number) => [0, -0.62, 0.52][i];
    for (const i of [1, 2]) suit(g, i === 2 ? ORANGE : KCG_BLUE).position.set(hookX(i), railY, rz + (i === 2 ? 0.02 : -0.02));
    // The tub just in front of the rail, the drip tray with fins and boots, the hose reel.
    const tub = group(g, 0, 0, rz + RINSE.hook.ahead - RINSE.tub.ahead);
    part(tub, rbox(0.56, 0.5, 0.4, 0.06), '#1e88e5', 0, 0.25, 0);
    part(tub, box(0.48, 0.01, 0.32), '#b3e5fc', 0, 0.47, 0, { outline: false, material: glow('#a7dcf3') });
    part(tub, rbox(0.6, 0.04, 0.44, 0.02), '#1976d2', 0, 0.5, 0, { outline: false });
    label(tub, '담수', 0.16, 0.07, 0, 0.32, 0.205, '#1e88e5', '#ffffff');
    part(g, box(0.5, 0.03, 0.42), '#90a4ae', 0.62, 0.015, rz + 0.1, { outline: false });
    for (let i = 0; i < 2; i++) part(g, rbox(0.17, 0.03, 0.46, 0.02), i ? KCG_BLUE : '#212121', 0.52 + i * 0.2, 0.05, rz + 0.12, { ry: 0.1 * (i - 0.5) });
    for (let i = 0; i < 2; i++) part(g, rbox(0.11, 0.24, 0.2, 0.04), '#212121', -0.55 - i * 0.15, 0.12, rz + 0.14);
    const reelX = W / 2 - 0.02;
    part(g, cyl(0.17, 0.17, 0.1, 18), '#2e7d32', reelX, 0.9, rz, { rz: Math.PI / 2 });
    part(g, cyl(0.11, 0.11, 0.105, 18), '#43a047', reelX, 0.9, rz, { rz: Math.PI / 2, outline: false });
    const gunRest = new THREE.Vector3(reelX + 0.02, 0.62, rz + 0.12);
    // The suit being rinsed: on its hook while nobody's at it.
    const idle = group(g);
    out.idle = idle;
    suit(idle).position.set(hookX(0), railY, rz);
    const idleGun = group(idle);
    part(idleGun, rbox(0.04, 0.12, 0.05, 0.015), '#ffb300', gunRest.x, gunRest.y, gunRest.z);
    hose(idle, 8, 0.012, '#43a047')(new THREE.Vector3(reelX, 0.8, rz), gunRest, 0.1);
    const use = group(g);
    out.inUse = use;
    const live = suit(use);
    const gun = group(use);
    part(gun, rbox(0.04, 0.12, 0.05, 0.015), '#ffb300', 0, 0, 0);
    part(gun, cyl(0.012, 0.012, 0.12, 8), '#616161', 0, 0.04, 0.07, { rx: Math.PI / 2, outline: false });
    const spray = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 12, 1, true), SPRAY);
    spray.userData.ownGeometry = true;
    use.add(spray);
    const gunHose = hose(use, 10, 0.012, '#43a047');
    const drops = Array.from({ length: 8 }, (_, i) => {
      const m = new THREE.Mesh(ball(0.012), BUBBLE);
      use.add(m);
      return { m, ph: i / 8 };
    });
    const work = marker(g, hookX(0), railY - 0.1, rz);
    out.work = work;
    const rinse = standAt(g, 0, rz + RINSE.hook.ahead, Math.PI, 'cgRinse', work);
    out.spots = { '*': rinse };
    const pa = new THREE.Vector3();
    const pb = new THREE.Vector3();
    out.animate = (t) => {
      const k = kOf(rinse);
      const r = rinseRound(t, phaseOf(work), k);
      atSpot(rinse, r.hook, pa);
      live.position.copy(pa);
      // Sunk in the tub it's crumpled down (squashed into the water), else hanging straight.
      const sq = 1 - 0.7 * r.sunk;
      live.scale.set(1, sq, 1);
      live.rotation.set(r.sunk > 0 ? 0.4 * r.sunk : 0, 0, r.sunk > 0 ? 0.08 * Math.sin(t * 3.8) * r.sunk : 0);
      // The spray gun: in the right hand while hosing, else on the reel.
      if (r.beat.from === 'spray' || (r.beat.from === 'smooth' && r.beat.e > 0.5)) {
        atSpot(rinse, r.hands.r, gun.position);
        gun.rotation.set(0, rinse.at.rotation.y, 0);
      } else {
        gun.position.copy(gunRest);
        gun.rotation.set(0, 0, 0);
      }
      gunHose(new THREE.Vector3(reelX, 0.8, rz), gun.position, 0.15);
      spray.visible = r.spraying;
      if (r.spraying) {
        // Out of the nozzle to the suit's chest.
        const from = gun.position.clone().add(new THREE.Vector3(0, 0.04, 0));
        const to = atSpot(rinse, { side: RINSE.hook.side, up: RINSE.hook.up - 0.55 + 0.25 * Math.sin(t * 2.2), ahead: RINSE.hook.ahead }, pb);
        const d = to.clone().sub(from);
        spray.position.copy(from).addScaledVector(d, 0.5);
        spray.scale.set(1, d.length() / 0.5, 1);
        spray.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), d.normalize());
      }
      // Drips off it as it's lifted out.
      for (const d of drops) {
        const u = (((t * 1.6 + d.ph) % 1) + 1) % 1;
        d.m.visible = r.dripping;
        d.m.position.set(pa.x + (d.ph - 0.5) * 0.4, pa.y - 1.1 - u * 0.5, pa.z + ((d.ph * 5) % 1 - 0.5) * 0.08);
      }
    };
  },

  /**
   * The VHF radio desk: a grey desk against the wall with two marine VHF sets (lit channel displays
   * showing 16 and 12, a red DSC distress cover, the fist mics on their hooks on coiled cords), a
   * speaker and the watch screen on a stand (channel 16, the DSC calls, the AIS targets), the
   * channel card on the wall, a wall clock, the radio log open with a pen, a mug; a black swivel
   * chair. Keeping the watch the dweller sits leant in listening, turns the squelch, writes the log and
   * sits back watching the screen (cgVhfLog); calling a boat they take the handset off its hook, key
   * it and talk, hold it listening for the reply with a hand to the volume, hang it up and log the
   * call (cgVhf).
   */
  cgVhfDesk(g, W, D, _c, _def, _ctx, out) {
    const top = 0.74;
    const d = 0.62;
    const z = -D / 2 + d / 2 + 0.02;
    part(g, rbox(W - 0.06, 0.05, d, 0.02), '#cfd8dc', 0, top - 0.025, z);
    part(g, rbox(0.42, top - 0.05, d - 0.04, 0.02), '#b0bec5', W / 2 - 0.25, (top - 0.05) / 2, z);
    part(g, rbox(0.05, top - 0.05, d - 0.04, 0.02), '#b0bec5', -(W / 2 - 0.06), (top - 0.05) / 2, z);
    for (let i = 0; i < 3; i++) part(g, rbox(0.03, 0.02, 0.01, 0.005), CHROME, W / 2 - 0.25, 0.15 + i * 0.2, z + d / 2 + 0.002, { outline: false });
    // The two sets on the desk's back, their fronts at zf.
    const zf = -0.12;
    const set = (x: number, ch: string, mic: boolean) => {
      const s = group(g, x, top, zf - 0.11);
      part(s, rbox(0.34, 0.13, 0.22, 0.015), '#212327', 0, 0.065, 0);
      part(s, box(0.12, 0.05, 0.004), '#263238', -0.06, 0.08, 0.111, { outline: false });
      label(s, ch, 0.1, 0.04, -0.06, 0.08, 0.114, '#1b5e20', '#b9f6ca');
      part(s, cyl(0.022, 0.022, 0.02, 14), '#455a64', 0.08, 0.08, 0.115, { rx: Math.PI / 2 });
      part(s, cyl(0.014, 0.014, 0.02, 12), '#455a64', 0.13, 0.05, 0.115, { rx: Math.PI / 2, outline: false });
      part(s, rbox(0.04, 0.03, 0.01, 0.005), '#d32f2f', 0.13, 0.1, 0.115, { outline: false });
      if (mic) part(s, box(0.03, 0.04, 0.02), '#37474f', 0.17, 0.07, 0.1, { outline: false });
      return s;
    };
    set(-0.12, 'CH 16', false);
    set(0.25, 'CH 12', true);
    // The speaker and the watch screen on its stand, the channel card and a clock on the wall.
    part(g, rbox(0.16, 0.2, 0.12, 0.02), '#263238', -0.62, top + 0.1, -0.36);
    for (let i = 0; i < 4; i++) part(g, box(0.1, 0.008, 0.002), '#455a64', -0.62, top + 0.06 + i * 0.03, -0.299, { outline: false });
    part(g, box(0.05, 0.3, 0.05), '#37474f', 0.1, top + 0.15, -0.42);
    part(g, rbox(0.56, 0.36, 0.04, 0.015), '#1c1f22', 0.1, top + 0.47, -0.4);
    out.screen = litScreen(g, painted('cgVhfScreen', 320, 200, vhfScreen), 0.52, 0.325, 0.1, top + 0.47, -0.375);
    label(g, 'CH 16 조난·안전 · CH 12 항무 · CH 06 선박 간', 0.95, 0.07, 0, 1.55, -D / 2 + 0.012, NAVY, '#ffffff');
    part(g, cyl(0.13, 0.13, 0.03, 20), '#fafafa', 0.8, 1.6, -D / 2 + 0.02, { rx: Math.PI / 2 });
    part(g, box(0.004, 0.09, 0.004), '#111', 0.8, 1.62, -D / 2 + 0.04, { rz: 0.8, outline: false });
    part(g, box(0.004, 0.06, 0.004), '#111', 0.8, 1.61, -D / 2 + 0.04, { rz: -1.2, outline: false });
    // The log open with a pen, a mug.
    const logAt = new THREE.Vector3(-0.16, top + 0.01, 0.0);
    part(g, box(0.3, 0.012, 0.22), '#fffde7', logAt.x, logAt.y, logAt.z);
    part(g, box(0.004, 0.014, 0.22), '#8d6e63', logAt.x, logAt.y + 0.002, logAt.z, { outline: false });
    for (let i = 0; i < 6; i++) part(g, box(0.11, 0.002, 0.004), '#90a4ae', logAt.x + (i % 2 ? 0.07 : -0.07), logAt.y + 0.007, logAt.z - 0.06 + Math.floor(i / 2) * 0.05, { outline: false });
    label(g, '무선 통신 일지', 0.12, 0.025, logAt.x - 0.07, logAt.y + 0.008, logAt.z - 0.09, '#fffde7', '#263238').rotation.x = -Math.PI / 2;
    part(g, cyl(0.035, 0.03, 0.09, 14), NAVY, 0.72, top + 0.045, 0.05);
    // The chair.
    const zs = z + d / 2 + 0.2;
    const ch = group(g, 0, 0, zs, Math.PI);
    part(ch, cyl(0.025, 0.025, 0.26, 10), CHROME, 0, 0.27, 0, { outline: false });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      part(ch, box(0.28, 0.025, 0.04), '#212121', Math.cos(a) * 0.13, 0.04, Math.sin(a) * 0.13, { ry: -a, outline: false });
    }
    part(ch, rbox(0.5, 0.09, 0.48, 0.04), '#263238', 0, 0.435, 0);
    part(ch, rbox(0.48, 0.6, 0.08, 0.05), '#263238', 0, 0.8, -0.24, { rx: -0.1 });
    // The handsets: on their hooks while nobody's calling; the one in use comes to the hand.
    const hookAt = new THREE.Vector3(0.25 + 0.17, top + 0.07, zf + 0.005);
    const cordFrom = new THREE.Vector3(0.25 + 0.17, top + 0.03, zf - 0.02);
    const handset = (parent: THREE.Object3D) => {
      const m = group(parent);
      part(m, rbox(0.055, 0.09, 0.032, 0.015), '#1b1b1b', 0, 0, 0);
      part(m, box(0.012, 0.03, 0.006), '#424242', -0.03, 0.01, 0, { outline: false });
      for (let i = 0; i < 3; i++) part(m, box(0.035, 0.003, 0.002), '#555', 0, 0.02 - i * 0.008, 0.017, { outline: false });
      return m;
    };
    const idle = group(g);
    out.idle = idle;
    handset(idle).position.copy(hookAt).add(new THREE.Vector3(0, -0.04, 0.02));
    hose(idle, 8, 0.006, '#111')(cordFrom, hookAt.clone().add(new THREE.Vector3(0, -0.08, 0.02)), 0.04);
    const use = group(g);
    out.inUse = use;
    const mic = handset(use);
    const cord = hose(use, 12, 0.006, '#111');
    const seatAt = marker(g, 0, 0.48, zs);
    out.seat = seatAt;
    const micMark = marker(g, hookAt.x, hookAt.y, hookAt.z);
    out.work = micMark;
    const call = sitAt(g, 0, 0.48, zs, Math.PI, 'cgVhf', micMark);
    const watch = sitAt(g, 0, 0.48, zs, Math.PI, 'cgVhfLog', micMark);
    const spots: Record<string, Spot> = { cgVhfCall: call, cgVhfWatch: watch, '*': watch };
    out.spots = spots;
    const pa = new THREE.Vector3();
    out.animate = (t) => {
      const calling = nowAt(spots, t) === 'cgVhfCall';
      const s = calling ? call : watch;
      const r = vhfRound(calling ? 'cgVhf' : 'cgVhfLog', t, phaseOf(micMark), kOf(s));
      if (r.held) {
        atSpot(s, r.hands.r, pa);
        mic.position.copy(pa).add(new THREE.Vector3(0, 0.01, 0));
        mic.rotation.set(0.3, s.at.rotation.y + Math.PI, 0);
      } else {
        mic.position.copy(hookAt).add(new THREE.Vector3(0, -0.04, 0.02));
        mic.rotation.set(0, 0, 0);
      }
      cord(cordFrom, mic.position.clone().add(new THREE.Vector3(0, -0.045, 0)), r.held ? 0.08 : 0.04);
    };
  },

  /**
   * The 관할 해역 상황판: a framed chart on the wall — the coast and islands round 푸른항 (all made up),
   * the patrol sectors dashed in red, the station's anchor mark, the weather and the tide along the
   * bottom — with boat magnets on it (green fishing boats, a red one flagged for illegal fishing, our
   * blue patrol boat), a tray of markers and a pointer under it, a tide table pinned beside it.
   * Briefing the dweller stands beside it turned out to the room, pointing back at the sectors and
   * talking it through (present); marking a vessel they stand at it moving the magnets (board).
   */
  cgSeaMap(g, W, D, _c, _def, _ctx, out) {
    const bw = W - 0.24;
    const bh = bw * (400 / 640);
    const by = 1.45;
    const bz = -D / 2 + 0.04;
    part(g, rbox(bw + 0.08, bh + 0.08, 0.04, 0.015), '#37474f', 0, by, bz);
    picture(g, painted('cgSeaChart', 640, 400, seaChart), bw, bh, 0, by, bz + 0.022);
    // Magnets: boats on the chart (fishing boats, the flagged one, ours).
    const mag = (u: number, v: number, col: string) => part(g, rbox(0.05, 0.025, 0.018, 0.008), col, -bw / 2 + u * bw, by + bh / 2 - v * bh, bz + 0.03, { outline: false });
    for (const [u, v] of [[0.52, 0.55], [0.6, 0.62], [0.72, 0.48], [0.3, 0.8], [0.84, 0.82]]) mag(u, v, '#43a047');
    mag(0.88, 0.58, '#e53935');
    mag(0.48, 0.38, '#1e88e5');
    // The tray, markers, the pointer.
    part(g, box(bw * 0.8, 0.03, 0.07), '#90a4ae', 0, by - bh / 2 - 0.06, bz + 0.05);
    for (let i = 0; i < 4; i++) part(g, cyl(0.009, 0.009, 0.12, 8), ['#d32f2f', '#1565c0', '#2e7d32', '#212121'][i], -0.3 + i * 0.07, by - bh / 2 - 0.035, bz + 0.05, { rz: Math.PI / 2, outline: false });
    part(g, cyl(0.006, 0.006, 0.6, 6), '#5d4037', 0.35, by - bh / 2 - 0.035, bz + 0.05, { rz: Math.PI / 2, outline: false });
    // The tide table pinned beside it.
    const tide = group(g, bw / 2 + 0.09, by + 0.1, bz + 0.01);
    part(tide, box(0.14, 0.2, 0.004), '#fffde7', 0, 0, 0, { outline: false });
    label(tide, '물때표', 0.1, 0.03, 0, 0.07, 0.003, '#fffde7', NAVY);
    for (let i = 0; i < 5; i++) part(tide, box(0.1, 0.004, 0.002), '#90a4ae', 0, 0.03 - i * 0.025, 0.003, { outline: false });
    part(tide, ball(0.008), '#e53935', 0, 0.09, 0.004, { outline: false });
    const point = marker(g, bw * 0.12, by - 0.05, bz + 0.05);
    const pin = marker(g, bw * 0.38, by - 0.02, bz + 0.05);
    out.work = point;
    const brief = standAt(g, bw / 2 + 0.06, bz + 0.66, -0.5, 'present', point);
    const mark = standAt(g, bw * 0.3, bz + 0.5, Math.PI, 'board', pin);
    out.spots = { cgSectorBrief: brief, cgMarkVessel: mark, '*': brief };
  },

  /**
   * The rescue drone's station: a rugged orange case opened on a steel stand into its landing pad
   * (the H in its circle), the drone sat on it (white and orange, four rotors, a camera under it, a
   * rescue tube on its release hook), a cabinet of batteries charging (green and amber lights) with
   * spare tubes on top, a windsock on its pole, and the controller on the case's lid; on a concrete
   * pad of its own. Flying it the dweller stands with the controller in both hands, eyes on its screen,
   * then up following the drone — off the pad, out over the water, the tube let go on its line to
   * someone in the water, a hover over it, back and down (cgDrone, the dweller turning to follow it).
   */
  cgDroneStation(g, W, D, _c, _def, _ctx, out) {
    part(g, box(W, 0.02, D + 0.6), '#c9c4b9', 0, 0.01, 0.3, { outline: false, shadow: false });
    // The case on its stand, open into the pad.
    const px = DRONE_AT.pad.x;
    const pz = DRONE_AT.pad.z;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.04, 0.42, 0.04), '#78909c', px + sx * 0.3, 0.21, pz + sz * 0.2, { outline: false });
    part(g, rbox(0.72, 0.2, 0.5, 0.04), ORANGE, px, 0.52, pz);
    part(g, box(0.62, 0.01, 0.42), '#37474f', px, 0.625, pz, { outline: false });
    part(g, ring(0.15, 0.012), '#fdd835', px, 0.632, pz, { rx: Math.PI / 2, outline: false });
    label(g, 'H', 0.12, 0.12, px, 0.633, pz, '#37474f', '#fdd835').rotation.x = -Math.PI / 2;
    const lid = group(g, px, 0.62, pz - 0.25);
    part(lid, rbox(0.72, 0.5, 0.06, 0.04), ORANGE, 0, 0.25, -0.03, { rx: -0.25 });
    label(lid, '해양경찰 구조 드론', 0.5, 0.07, 0, 0.32, 0.005, ORANGE, '#ffffff').rotation.x = -0.25;
    // The battery cabinet and spare tubes, the windsock.
    const cx = -0.48;
    part(g, rbox(0.62, 0.62, 0.42, 0.02), '#cfd8dc', cx, 0.31, -0.05);
    part(g, box(0.56, 0.4, 0.01), '#90a4ae', cx, 0.33, 0.165, { outline: false });
    for (let i = 0; i < 4; i++) {
      part(g, rbox(0.1, 0.06, 0.16, 0.01), '#263238', cx - 0.2 + i * 0.13, 0.45, 0.1);
      part(g, ball(0.012), i === 2 ? '#ffb300' : '#69f0ae', cx - 0.2 + i * 0.13, 0.49, 0.18, { outline: false, material: glow(i === 2 ? '#ffb300' : '#69f0ae') });
    }
    for (let i = 0; i < 2; i++) part(g, rbox(0.5, 0.09, 0.12, 0.04), ORANGE, cx, 0.67 + i * 0.09, -0.12 + i * 0.03);
    const wx = -W / 2 + 0.1;
    part(g, cyl(0.02, 0.025, 2.2, 8), '#b0bec5', wx, 1.1, -0.38);
    const sock = group(g, wx, 2.12, -0.38, 0.6);
    for (let i = 0; i < 4; i++) part(sock, cyl(0.07 - i * 0.012, 0.07 - (i + 1) * 0.012, 0.12, 12), i % 2 ? '#fafafa' : ORANGE, 0.06 + i * 0.12, 0, 0, { rz: Math.PI / 2 + 0.25, outline: false });
    /** The drone, its middle at the origin. */
    const drone = (parent: THREE.Object3D) => {
      const m = group(parent);
      part(m, rbox(0.2, 0.07, 0.16, 0.03), '#fafafa', 0, 0, 0);
      part(m, box(0.12, 0.012, 0.1), ORANGE, 0, 0.038, 0, { outline: false });
      const rotors: THREE.Object3D[] = [];
      for (const [ax, az] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        rod(m, new THREE.Vector3(0, 0, 0), new THREE.Vector3(ax * 0.17, 0.01, az * 0.17), 0.012, '#37474f');
        part(m, cyl(0.025, 0.025, 0.04, 10), '#37474f', ax * 0.17, 0.02, az * 0.17, { outline: false });
        const r = group(m, ax * 0.17, 0.045, az * 0.17);
        part(r, box(0.22, 0.004, 0.025), '#263238', 0, 0, 0, { outline: false });
        rotors.push(r);
        part(m, ball(0.012), ax > 0 ? '#ff5252' : '#69f0ae', ax * 0.2, 0.0, az * 0.2, { outline: false, material: glow(ax > 0 ? '#ff5252' : '#69f0ae') });
      }
      for (const sx of [-1, 1]) part(m, box(0.01, 0.08, 0.16), '#37474f', sx * 0.07, -0.06, 0, { outline: false });
      part(m, ball(0.03), '#212121', 0.06, -0.05, 0, { outline: false });
      return { m, rotors };
    };
    const tube = (parent: THREE.Object3D) => {
      const m = group(parent);
      part(m, rbox(0.32, 0.07, 0.07, 0.03), ORANGE, 0, 0, 0);
      part(m, box(0.04, 0.072, 0.072), '#fafafa', 0, 0, 0, { outline: false });
      return m;
    };
    const ctrl = (parent: THREE.Object3D) => {
      const m = group(parent);
      part(m, rbox(0.2, 0.03, 0.11, 0.02), '#37474f', 0, 0, 0);
      part(m, box(0.1, 0.07, 0.006), '#263238', 0, 0.045, -0.04, { rx: -0.4 });
      for (const sx of [-1, 1]) part(m, cyl(0.006, 0.006, 0.03, 6), '#111', sx * 0.06, 0.025, 0.01, { outline: false });
      return m;
    };
    const idle = group(g);
    out.idle = idle;
    const restDrone = drone(idle);
    restDrone.m.position.copy(DRONE_AT.pad).add(new THREE.Vector3(0, 0.06, 0));
    tube(restDrone.m).position.set(0, -0.11, 0);
    const restCtrl = ctrl(idle);
    restCtrl.position.set(0.86, 0.44, 0.18);
    part(g, rbox(0.24, 0.02, 0.18, 0.01), '#78909c', 0.86, 0.42, 0.18);
    part(g, box(0.04, 0.4, 0.04), '#78909c', 0.86, 0.2, 0.18, { outline: false });
    const use = group(g);
    out.inUse = use;
    const fly = drone(use);
    const liveTube = tube(use);
    const chute = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.08, 10, 1, true), FOAM);
    chute.userData.ownGeometry = true;
    use.add(chute);
    const tether = hose(use, 4, 0.003, '#fafafa');
    const handCtrl = ctrl(use);
    part(handCtrl, box(0.09, 0.06, 0.004), '#80deea', 0, 0.046, -0.036, { rx: -0.4, outline: false, material: glow('#80deea') });
    const padMark = marker(g, px, 0.66, pz);
    out.work = padMark;
    const flyer = standAt(g, px, D / 2 + 0.38, Math.PI, 'cgDrone', padMark);
    out.spots = { '*': flyer };
    const tubeOnWater = DRONE_AT.sea.clone().setY(0.05);
    const pa = new THREE.Vector3();
    out.animate = (t) => {
      const ph = phaseOf(padMark);
      const d = droneRound(t, ph);
      fly.m.position.copy(d.pos).add(new THREE.Vector3(0, 0.06, 0));
      fly.m.rotation.set(THREE.MathUtils.clamp(d.vel.z * 4, -0.25, 0.25), 0, THREE.MathUtils.clamp(-d.vel.x * 4, -0.25, 0.25));
      for (const r of fly.rotors) r.rotation.y = d.flying ? t * 40 : 0.6;
      // The flyer turns to keep it in sight.
      const dx = d.pos.x - flyer.at.position.x;
      const dz = d.pos.z - flyer.at.position.z;
      flyer.at.rotation.y = Math.hypot(dx, dz) > 0.3 ? Math.atan2(dx, dz) : Math.PI;
      const k = kOf(flyer);
      const h = cgHands.drone(t, ph, k);
      atSpot(flyer, { side: (h.l.side + h.r.side) / 2, up: (h.l.up + h.r.up) / 2 - 0.02, ahead: (h.l.ahead + h.r.ahead) / 2 }, pa);
      handCtrl.position.copy(pa);
      handCtrl.rotation.set(0, flyer.at.rotation.y + Math.PI, 0);
      // The tube under it on its hook, falling on its little chute, then floating.
      const under = fly.m.position.clone().add(new THREE.Vector3(0, -0.11, 0));
      liveTube.position.copy(under).lerp(tubeOnWater, d.fall);
      liveTube.rotation.set(0, d.fall > 0 ? 0.6 * d.fall : 0, 0);
      if (d.dropped && d.fall >= 1) liveTube.position.y = 0.05 + 0.015 * Math.sin(t * 2.4);
      chute.visible = d.fall > 0 && d.fall < 1;
      chute.position.copy(liveTube.position).add(new THREE.Vector3(0, 0.25, 0));
      tether(liveTube.position, chute.position, 0.0);
    };
  },

  /**
   * The quay's life ring drill berth: its stretch of the basin with the quay's coping (black fenders,
   * a yellow edge line) and the apron in front, the basin's end wall, and out on the water a rescue
   * manikin in an orange life jacket bobbing beside a marker float; on the quay a life ring on its
   * post with its line and a sign (인명구조 투척 훈련장). Drilling, the dweller takes the ring off its
   * post, the line's coil in the left hand, swings and throws it out to the manikin — it flies and
   * lands by it — and hauls it back in hand over hand along the water, lifts it out and hangs it back
   * (cgThrow; the line paid out from the coil to the ring).
   */
  cgRingDrill(g, W, D, _c, _def, _ctx, out) {
    const qz = D / 2 - 0.18;
    const bz = -D / 2 + 0.18;
    // The water, the quay coping along the front and the end wall (this end of the basin).
    sea(g, -W / 2, W / 2 - 0.18, bz, qz);
    coping(g, -W / 2, W / 2, qz, -1);
    coping(g, -W / 2, W / 2, bz, 1, false);
    copingZ(g, -D / 2, D / 2, W / 2 - 0.18, -1);
    part(g, box(W, 0.02, 1.0), '#cfcac0', 0, 0.012, D / 2 + 0.5, { outline: false, shadow: false });
    // The ring's post on the quay, the sign.
    const sp = standAt(g, 0, D / 2 + 0.22, Math.PI, 'cgThrow');
    const rest = atSpot(sp, THROW.rest);
    part(g, cyl(0.03, 0.035, rest.y + 0.12, 10), '#eceff1', rest.x, (rest.y + 0.12) / 2, rest.z + 0.05);
    part(g, box(0.08, 0.03, 0.08), '#eceff1', rest.x, rest.y + 0.12, rest.z + 0.02, { outline: false });
    part(g, cyl(0.025, 0.025, 1.3, 8), '#78909c', W / 2 - 0.12, 0.65, D / 2 + 0.85);
    label(g, '인명구조 투척 훈련장', 0.62, 0.11, W / 2 - 0.12, 1.24, D / 2 + 0.876, '#c62828', '#ffffff');
    label(g, '구명환 · 구명줄 25m', 0.62, 0.08, W / 2 - 0.12, 1.12, D / 2 + 0.876, '#ffffff', '#263238');
    // Out on the water: the manikin in its life jacket and a marker float.
    const target = atSpot(sp, THROW.target);
    const swimmer = group(g, target.x + 0.32, 0.02, target.z - 0.08);
    part(swimmer, rbox(0.34, 0.16, 0.24, 0.08), ORANGE, 0, 0.06, 0);
    part(swimmer, ball(0.09), '#ffcc80', 0, 0.2, 0.02);
    part(swimmer, ball(0.093), '#3e2723', 0, 0.225, -0.01, { outline: false });
    for (const sx of [-1, 1]) part(swimmer, rbox(0.07, 0.26, 0.07, 0.03), ORANGE, sx * 0.2, 0.18, 0.02, { rz: sx * 0.5 });
    part(g, ball(0.08), '#fdd835', target.x - 0.35, 0.05, target.z - 0.25);
    rod(g, new THREE.Vector3(target.x - 0.35, 0.1, target.z - 0.25), new THREE.Vector3(target.x - 0.35, 0.5, target.z - 0.25), 0.006, '#616161');
    part(g, box(0.16, 0.1, 0.004), '#d32f2f', target.x - 0.27, 0.45, target.z - 0.25, { outline: false });
    // The ring at rest on its post with its line coiled over it.
    const idle = group(g);
    out.idle = idle;
    lifeRing(idle, rest.x, rest.y, rest.z, 0.2);
    for (let i = 0; i < 3; i++) part(idle, ring(0.09 - i * 0.008, 0.008), '#fdd835', rest.x, rest.y - 0.24 - i * 0.012, rest.z + 0.04, { outline: false });
    const use = group(g);
    out.inUse = use;
    const live = lifeRing(use, 0, 0, 0, 0.2);
    const coil = group(use);
    for (let i = 0; i < 3; i++) part(coil, ring(0.08 - i * 0.01, 0.008), '#fdd835', 0, -i * 0.012, 0, { outline: false });
    const line = hose(use, 14, 0.006, '#fdd835');
    const work = marker(g, rest.x, rest.y, rest.z);
    out.work = work;
    sp.work = work;
    out.spots = { '*': sp };
    const pa = new THREE.Vector3();
    out.animate = (t) => {
      const ph = phaseOf(work);
      const r = throwRound(t, ph, kOf(sp));
      atSpot(sp, r.ring, live.position);
      const inAir = r.beat.from === 'throw' && r.beat.e === 0;
      const onWater = r.beat.from === 'watch' || r.beat.from === 'haul' || (r.beat.from === 'throw' && r.beat.e > 0);
      live.rotation.set(onWater ? Math.PI / 2 : inAir ? t * 9 : 0, sp.at.rotation.y, 0);
      atSpot(sp, r.coil, pa);
      coil.position.copy(pa);
      coil.visible = r.beat.from !== 'take' || r.beat.e > 0.5;
      coil.rotation.set(Math.PI / 2, 0, 0);
      if (r.out) line(pa, live.position, onWater ? 0.02 : 0.15);
      else line(pa, pa.clone().add(new THREE.Vector3(0, -0.01, 0)), 0);
      // Bob the swimmer.
      swimmer.position.y = 0.02 + 0.02 * Math.sin(t * 1.7);
      swimmer.rotation.z = 0.06 * Math.sin(t * 1.1);
    };
  },
};
