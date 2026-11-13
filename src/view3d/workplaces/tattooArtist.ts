import { neighbourShop, shopFront } from './shopFront';
import * as THREE from 'three';
import { marker, rod, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, ENAMEL, STEEL, label, painted, picture, ring, seeded, text } from './doctor';
import { AC, CT, FW, FW_PUPIL, IS, PB, ST, TC, add, pupilPoint, ttNow, ttPhase } from './tattooArtistMotion';
import type { TtMotion, TtNow } from './tattooArtistMotion';
import { vroidFigure } from './vroidFigure';

/**
 * The 타투 스튜디오 drawn as itself (2026-11-01 workplace pipeline, at the user's request), the made-up 먹결 타투. A black
 * vinyl bed with its back raised, an arm rest and a plate of ink caps on one side with the stool and lamp, a trolley with
 * a sterile drape, the machine, gloves and paper towels. A wall of flash with a sloping board; a stencil table whose light
 * box and thermal copier make the sheet that's pressed on the skin; a shelf of inks and a small autoclave; a low table
 * for the portfolio; a bench with a silicone forearm; a counter where the film is wrapped and the bill paid.
 *
 * The same invented designs go round everything: what's on the wall is what's traced and what grows on the skin. The client
 * is always a grown-up, the work always on a forearm or a calf. Everything that moves follows tattooArtistMotion.ts.
 */

const BRAND = '먹결 타투';
const VINYL = '#1e1f23';
const VINYL_L = '#2d2e34';
const WOOD = '#8a6242';
const WOOD_D = '#4e3524';
const CHAR = '#26272c';
const PAPER = '#f6f0e0';
const INK = '#15151a';
const PURPLE = '#6a3fb5';
const SKIN = '#eec6a0';
const UP = new THREE.Vector3(0, 1, 0);
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const tmp = new THREE.Vector3();
type V = readonly [number, number, number];
type Ctx2 = CanvasRenderingContext2D;

// ---------------------------------------------------------------------------------------------
// The invented designs, drawn on 256 × 256. `stencil` is lines only in the transfer's purple, `line` the black
// outline, `full` with its colour.

type Mode = 'stencil' | 'line' | 'full';
function sh(c: Ctx2, m: Mode, fill: string | null, path: () => void) {
  c.beginPath();
  path();
  if (m === 'full' && fill) {
    c.fillStyle = fill;
    c.fill();
  }
  c.strokeStyle = m === 'stencil' ? PURPLE : INK;
  c.stroke();
}
interface Design {
  name: string;
  art(c: Ctx2, m: Mode): void;
}
const circle = (c: Ctx2, x: number, y: number, r: number) => {
  c.moveTo(x + r, y);
  c.arc(x, y, r, 0, Math.PI * 2);
};
const DESIGNS: Design[] = [
  {
    name: '모란',
    art(c, m) {
      for (const sx of [-1, 1]) sh(c, m, '#3f7d4e', () => {
        c.moveTo(128, 180);
        c.quadraticCurveTo(128 + sx * 90, 190, 128 + sx * 104, 232);
        c.quadraticCurveTo(128 + sx * 40, 232, 128, 180);
      });
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        sh(c, m, i % 2 ? '#d93a55' : '#ea5f73', () => circle(c, 128 + Math.cos(a) * 58, 112 + Math.sin(a) * 58, 42));
      }
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.4;
        sh(c, m, '#f28a97', () => circle(c, 128 + Math.cos(a) * 26, 112 + Math.sin(a) * 26, 28));
      }
      sh(c, m, '#f4c84a', () => circle(c, 128, 112, 15));
    },
  },
  {
    name: '잉어',
    art(c, m) {
      sh(c, m, '#e0632b', () => {
        c.moveTo(70, 56);
        c.bezierCurveTo(150, 36, 214, 110, 170, 176);
        c.bezierCurveTo(150, 204, 126, 206, 112, 196);
        c.bezierCurveTo(138, 150, 120, 90, 70, 56);
      });
      sh(c, m, '#f2a13b', () => {
        c.moveTo(120, 192);
        c.quadraticCurveTo(70, 200, 46, 242);
        c.quadraticCurveTo(100, 238, 132, 204);
        c.quadraticCurveTo(136, 230, 164, 246);
        c.quadraticCurveTo(172, 212, 150, 188);
      });
      sh(c, m, '#f2a13b', () => {
        c.moveTo(162, 104);
        c.quadraticCurveTo(216, 94, 234, 124);
        c.quadraticCurveTo(204, 142, 176, 136);
      });
      sh(c, m === 'full' ? 'line' : m, null, () => {
        for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) {
          const x = 112 + k * 18 + i * 8;
          const y = 88 + i * 24 + k * 6;
          c.moveTo(x + 10, y);
          c.arc(x, y, 10, 0, Math.PI);
        }
      });
      sh(c, m, '#ffffff', () => circle(c, 92, 66, 7));
    },
  },
  {
    name: '제비',
    art(c, m) {
      sh(c, m, '#20345e', () => {
        c.moveTo(34, 62);
        c.quadraticCurveTo(100, 62, 136, 112);
        c.quadraticCurveTo(190, 56, 234, 48);
        c.quadraticCurveTo(208, 110, 158, 148);
        c.quadraticCurveTo(170, 196, 214, 228);
        c.quadraticCurveTo(160, 220, 132, 176);
        c.quadraticCurveTo(108, 218, 66, 232);
        c.quadraticCurveTo(82, 188, 104, 144);
        c.quadraticCurveTo(62, 112, 34, 62);
      });
      sh(c, m, '#d9443c', () => circle(c, 134, 124, 17));
    },
  },
  {
    name: '달과 구름',
    art(c, m) {
      sh(c, m, '#f0c64a', () => {
        c.arc(136, 96, 74, 0.7, Math.PI * 1.75);
        c.quadraticCurveTo(110, 96, 188, 150);
      });
      for (const [x, y, s] of [[70, 190, 1], [176, 206, 0.8]] as const)
        sh(c, m, '#a9c4d6', () => {
          circle(c, x - 30 * s, y, 26 * s);
          circle(c, x, y - 18 * s, 34 * s);
          circle(c, x + 34 * s, y, 26 * s);
        });
    },
  },
  {
    name: '큰 파도',
    art(c, m) {
      sh(c, m, '#2d6fa3', () => {
        c.moveTo(16, 226);
        c.bezierCurveTo(36, 130, 96, 42, 186, 56);
        c.bezierCurveTo(146, 66, 124, 90, 128, 116);
        c.bezierCurveTo(152, 94, 196, 112, 196, 144);
        c.bezierCurveTo(178, 128, 164, 136, 164, 158);
        c.bezierCurveTo(186, 190, 224, 200, 244, 226);
        c.closePath();
      });
      sh(c, m === 'full' ? 'line' : m, null, () => {
        c.moveTo(48, 214);
        c.bezierCurveTo(66, 150, 100, 110, 128, 98);
        c.moveTo(88, 216);
        c.bezierCurveTo(100, 180, 126, 160, 150, 154);
      });
      for (let i = 0; i < 6; i++) sh(c, m, '#ffffff', () => circle(c, 160 + i * 9, 60 + (i % 2) * 9 + i * 2, 6));
    },
  },
  {
    name: '매화 가지',
    art(c, m) {
      c.save();
      const lw = c.lineWidth;
      c.lineWidth = lw * 2.4;
      sh(c, m === 'full' ? 'line' : m, null, () => {
        c.moveTo(34, 238);
        c.bezierCurveTo(80, 180, 96, 150, 150, 120);
        c.bezierCurveTo(176, 104, 196, 72, 208, 36);
        c.moveTo(102, 158);
        c.quadraticCurveTo(78, 120, 76, 74);
      });
      c.lineWidth = lw;
      c.restore();
      const flower = (x: number, y: number, r: number) => {
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 - 0.3;
          sh(c, m, '#f5a7b8', () => circle(c, x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.78));
        }
        sh(c, m, '#f4d04a', () => circle(c, x, y, r * 0.4));
      };
      flower(76, 70, 20);
      flower(160, 112, 23);
      flower(206, 40, 16);
      flower(60, 194, 15);
    },
  },
  {
    name: '검은 고양이',
    art(c, m) {
      sh(c, m, '#25252c', () => {
        c.moveTo(62, 56);
        c.lineTo(96, 92);
        c.quadraticCurveTo(128, 78, 160, 92);
        c.lineTo(194, 56);
        c.lineTo(200, 134);
        c.bezierCurveTo(202, 196, 160, 214, 128, 214);
        c.bezierCurveTo(96, 214, 54, 196, 56, 134);
        c.closePath();
      });
      for (const sx of [-1, 1]) sh(c, m, '#f0d24a', () => {
        c.moveTo(128 + sx * 44, 128);
        c.quadraticCurveTo(128 + sx * 26, 112, 128 + sx * 14, 134);
        c.quadraticCurveTo(128 + sx * 32, 148, 128 + sx * 44, 128);
      });
      const white = c.strokeStyle;
      if (m !== 'stencil') c.strokeStyle = '#d8d8de';
      c.beginPath();
      for (const sx of [-1, 1]) for (const d of [-8, 0, 8]) {
        c.moveTo(128 + sx * 28, 172 + d * 0.4);
        c.lineTo(128 + sx * 84, 166 + d);
      }
      c.stroke();
      c.strokeStyle = white;
    },
  },
  {
    name: '나침반',
    art(c, m) {
      sh(c, m, '#efe4c6', () => circle(c, 128, 128, 94));
      sh(c, m === 'full' ? 'line' : m, null, () => circle(c, 128, 128, 80));
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const R = i % 2 ? 46 : 74;
        sh(c, m, i % 2 ? '#7a8ba0' : i === 0 ? '#c9352e' : '#25405e', () => {
          c.moveTo(128 + Math.cos(a) * R, 128 + Math.sin(a) * R);
          c.lineTo(128 + Math.cos(a + 0.5) * 14, 128 + Math.sin(a + 0.5) * 14);
          c.lineTo(128 + Math.cos(a - 0.5) * 14, 128 + Math.sin(a - 0.5) * 14);
          c.closePath();
        });
      }
    },
  },
];
const designOf = (i: number) => DESIGNS[((i % DESIGNS.length) + DESIGNS.length) % DESIGNS.length];
/** A design at (x, y), `s` the size of its square; `reveal` how far down it's got. */
function drawArt(c: Ctx2, d: Design, m: Mode, x: number, y: number, s: number, reveal = 1) {
  if (reveal <= 0) return;
  c.save();
  c.beginPath();
  c.rect(x, y, s, s * reveal);
  c.clip();
  c.translate(x, y);
  c.scale(s / 256, s / 256);
  c.lineWidth = 5;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  d.art(c, m);
  c.restore();
}
const flashTex = (i: number) => {
  const d = designOf(i);
  return painted(`ttFlash${d.name}`, 200, 240, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 200, 240);
    c.strokeStyle = '#c9bb97';
    c.strokeRect(5, 5, 190, 230);
    drawArt(c, d, 'full', 16, 12, 168);
    text(c, d.name, 100, 204, 19, INK, 'center');
    text(c, BRAND, 100, 224, 11, '#8a7a5a', 'center', false);
  });
};
const stencilTex = (i: number) => {
  const d = designOf(i);
  return painted(`ttStencil${d.name}`, 200, 200, (c) => {
    c.fillStyle = '#eee9f8';
    c.fillRect(0, 0, 200, 200);
    drawArt(c, d, 'stencil', 14, 14, 172);
  });
};

// ---------------------------------------------------------------------------------------------
// Small parts.

function group(parent: THREE.Object3D, x = 0, y = 0, z = 0, ry = 0): THREE.Group {
  const m = new THREE.Group();
  m.position.set(x, y, z);
  m.rotation.y = ry;
  parent.add(m);
  return m;
}
function at(m: THREE.Object3D, p: V | null | undefined, home?: V) {
  m.visible = !!(p ?? home);
  const q = p ?? home;
  if (q) m.position.set(q[0], q[1], q[2]);
}
function ownLit(g: THREE.Object3D, geom: THREE.BufferGeometry, color: string, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color }));
  m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
const setLit = (m: THREE.Mesh, c: string) => (m.material as THREE.MeshBasicMaterial).color.set(c);
function swapPic(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0) {
  const mat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.userData.ownGeometry = mesh.userData.ownMaterial = true;
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, 0, 'YXZ');
  g.add(mesh);
  return {
    mesh,
    mat,
    set: (t: THREE.Texture | null) => {
      if (!t || mat.map === t) return;
      mat.map = t;
      mat.needsUpdate = true;
    },
  };
}
function standAt(g: THREE.Object3D, motion: TtMotion, z = 0.6): Spot {
  const s = spot(g, 'stand', 0, 0, z, Math.PI);
  s.motion = motion;
  return s;
}
function seatAt(g: THREE.Object3D, motion: TtMotion, seat: V): Spot {
  const s = spot(g, 'sit', seat[0], seat[1], seat[2], Math.PI, 0);
  s.motion = motion;
  return s;
}
const posedAt = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
function nowAt(spots: Record<string, Spot>, t: number): string | null {
  let best: string | null = null;
  for (const [k, s] of Object.entries(spots)) if (k !== '*' && Math.abs(t - posedAt(s)) < 0.6 && (best === null || posedAt(s) > posedAt(spots[best]))) best = k;
  return best;
}
/** Every frame: which use is going on and where its script has got to. */
function drive(g: THREE.Group, out: Built, spots: Record<string, Spot>, show: (now: string | null, N: TtNow | null, t: number) => void) {
  out.spots = spots;
  out.away = (_o, t) => {
    const now = nowAt(spots, t);
    const sp = now ? spots[now] : null;
    const N = sp ? ttNow(sp.motion as TtMotion, t, ttPhase(g.getWorldPosition(tmp)), (sp.at.userData.height as number | undefined) ?? 1.6) : null;
    show(now, N, t);
  };
}
/** A canvas repainted only when `key` changes. */
function live(w: number, h: number) {
  let tex: THREE.CanvasTexture | null = null;
  let ctx: Ctx2 | null = null;
  let last = '';
  return (key: string, paint: (c: Ctx2) => void): THREE.Texture | null => {
    if (typeof document === 'undefined') return null;
    if (!tex) {
      const can = document.createElement('canvas');
      can.width = w;
      can.height = h;
      ctx = can.getContext('2d');
      tex = new THREE.CanvasTexture(can);
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    if (key !== last && ctx) {
      last = key;
      paint(ctx);
      tex.needsUpdate = true;
    }
    return tex;
  };
}
const q = (x: number | undefined, steps = 40) => Math.round((x ?? 0) * steps);
const seedOf = (g: THREE.Object3D) => {
  const p = g.getWorldPosition(tmp);
  return Math.floor(Math.abs(p.x) / 2 + Math.abs(p.z));
};

/** A coil-free rotary machine with its needle's point at the group's origin, leaning back to -x. */
function machineMesh(g: THREE.Object3D): { root: THREE.Group; led: THREE.Mesh } {
  const root = group(g);
  const lean = group(root);
  lean.rotation.z = 0.62;
  part(lean, cyl(0.0022, 0.0015, 0.03, 6), '#b9c0c6', 0, 0.015, 0, { outline: false });
  part(lean, cyl(0.012, 0.006, 0.04, 10), '#d4dbe0', 0, 0.05, 0, { outline: false });
  part(lean, cyl(0.014, 0.014, 0.06, 12), '#26272c', 0, 0.1, 0);
  for (let i = 0; i < 3; i++) part(lean, cyl(0.0148, 0.0148, 0.004, 12), STEEL, 0, 0.08 + i * 0.02, 0, { outline: false });
  part(lean, cyl(0.02, 0.02, 0.05, 12), '#8d2f2f', 0, 0.155, 0);
  part(lean, cyl(0.005, 0.005, 0.02, 6), '#101014', 0, 0.19, 0, { outline: false });
  const led = ownLit(lean, ball(0.004), '#223322', 0.018, 0.155, 0.012);
  return { root, led };
}
function penMesh(g: THREE.Object3D, color = '#1d1d22'): THREE.Group {
  const p = group(g);
  part(p, cyl(0.006, 0.002, 0.14, 8), color, 0.02, 0.065, 0.025, { rz: -0.3, rx: 0.42, outline: false });
  return p;
}
function towelMesh(g: THREE.Object3D): THREE.Group {
  const t = group(g);
  part(t, rbox(0.1, 0.012, 0.08, 0.006), '#f4f4ef', 0, 0, 0, { outline: false, rz: 0.15 });
  return t;
}
function stoolMesh(g: THREE.Object3D, seatTop: number, x: number, z: number, color = VINYL): THREE.Group {
  const s = group(g, x, 0, z);
  part(s, cyl(0.17, 0.165, 0.05, 18), color, 0, seatTop - 0.025, 0);
  part(s, cyl(0.02, 0.024, seatTop - 0.09, 10), CHROME, 0, (seatTop - 0.05) / 2 + 0.02, 0, { outline: false });
  part(s, ring(0.13, 0.006), CHROME, 0, 0.22, 0, { rx: Math.PI / 2, outline: false });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    rod(s, v3(0, 0.08, 0), v3(Math.cos(a) * 0.2, 0.035, Math.sin(a) * 0.2), 0.012, BLACK);
    part(s, ball(0.022), BLACK, Math.cos(a) * 0.2, 0.024, Math.sin(a) * 0.2, { outline: false });
  }
  return s;
}
/** A transparent sleeve round a limb, a tattoo painted on it (the skin itself can't be drawn on, and clothes differ). */
function skinSleeve(g: THREE.Object3D, r: number) {
  const mat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, color: '#ffffff' });
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, 1, 20, 1, true), mat);
  mesh.userData.ownGeometry = mesh.userData.ownMaterial = true;
  mesh.visible = false;
  mesh.renderOrder = 2;
  g.add(mesh);
  const d = new THREE.Vector3();
  return {
    mesh,
    /** From the wrist `a` up to `b`, covering the `from`–`to` share of it. */
    lay(a: V, b: V, from = 0.1, to = 0.9) {
      d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      const L = d.length();
      mesh.position.set(a[0] + d.x * (from + to) * 0.5, a[1] + d.y * (from + to) * 0.5, a[2] + d.z * (from + to) * 0.5);
      mesh.scale.set(1, L * (to - from), 1);
      mesh.quaternion.setFromUnitVectors(UP, d.normalize());
    },
    set(t: THREE.Texture | null) {
      if (!t) {
        mesh.visible = false;
        return;
      }
      if (mat.map !== t) {
        mat.map = t;
        mat.needsUpdate = true;
      }
    },
  };
}
/** What's on the skin, twice round (so one always faces out), the wrist at the bottom of the canvas. */
function paintSkin(c: Ctx2, d: Design, n: { stencil?: number; line?: number; shade?: number; film?: number; wet?: number }) {
  c.clearRect(0, 0, 256, 128);
  if ((n.film ?? 0) > 0) {
    c.fillStyle = `rgba(226,240,250,${0.36 * (n.film ?? 0)})`;
    c.fillRect(0, 128 * (1 - (n.film ?? 0)), 256, 128);
  }
  if ((n.wet ?? 0) > 0) {
    c.fillStyle = `rgba(150,210,160,${0.3 * (n.wet ?? 0)})`;
    c.fillRect(0, 0, 256, 128);
  }
  for (const x of [8, 136]) {
    const s = 112;
    if ((n.stencil ?? 0) > 0 && (n.line ?? 0) < 1) {
      c.globalAlpha = n.stencil ?? 0;
      drawArt(c, d, 'stencil', x, 8, s);
      c.globalAlpha = 1;
    }
    drawArt(c, d, 'full', x, 8, s, n.shade ?? 0);
    drawArt(c, d, 'line', x, 8, s, n.line ?? 0);
  }
}

// ---------------------------------------------------------------------------------------------
// Other people: drawn, played by VRoid bodies when they've come.

interface Look {
  top: string;
  bottom: string;
  hair: string;
  skin: string;
}
const LOOKS: Record<string, Look> = {
  client1: { top: '#5b7f95', bottom: '#2f3e4a', hair: '#2b1b10', skin: '#eac09a' },
  client2: { top: '#c9a24c', bottom: '#40382e', hair: '#1a1a1a', skin: '#f3d0b0' },
  watcher: { top: '#7e5a8e', bottom: '#34383f', hair: '#402a1a', skin: '#e8bd95' },
  watcher2: { top: '#b74f4a', bottom: '#2f3136', hair: '#1a1a1a', skin: '#f3d0b0' },
  // 은하린, in violet with red hair as in the workplace's staff list.
  pupil: { top: '#4a148c', bottom: '#26272c', hair: '#c62828', skin: '#f8d9c0' },
};
interface Fig {
  root: THREE.Group;
  head: THREE.Group;
  armL(to: THREE.Vector3 | null): void;
  armR(to: THREE.Vector3 | null): void;
}
function limb(g: THREE.Object3D, r: number, color: string): (a: THREE.Vector3, b: THREE.Vector3) => void {
  const m = part(g, cyl(r, r * 0.9, 1, 8), color, 0, 0, 0, { outline: false });
  const d = new THREE.Vector3();
  return (a, b) => {
    d.subVectors(b, a);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.scale.set(1, Math.max(0.001, d.length()), 1);
    m.quaternion.setFromUnitVectors(UP, d.normalize());
  };
}
/** Someone stood, or sat if `seat` is given (the feet on the floor, or the right ankle at `ankleR` in the parent's frame). */
function person(parent: THREE.Object3D, look: Look, x: number, z: number, ry: number, gender: 'female' | 'male', seat?: number, ankleR?: V, seed?: number): Fig {
  const root = group(parent, x, 0, z, ry);
  const sitting = seat !== undefined;
  const base = sitting ? seat + 0.07 - 0.88 : 0;
  const hide: THREE.Object3D[] = [];
  if (sitting) {
    for (const sx of [-1, 1]) {
      const ankle = sx < 0 && ankleR ? v3(ankleR[0] - x, ankleR[1], ankleR[2] - z) : v3(sx * 0.09, 0.08, 0.5);
      const knee = sx < 0 && ankleR ? v3(sx * 0.09, seat + 0.2, 0.32) : v3(sx * 0.09, seat + 0.03, 0.36);
      rod(root, v3(sx * 0.09, seat + 0.08, -0.08), knee, 0.056, look.bottom);
      rod(root, knee, ankle, 0.045, look.bottom);
      part(root, rbox(0.09, 0.07, 0.2, 0.03), '#37474f', ankle.x, ankle.y - 0.045, ankle.z + 0.04);
    }
    part(root, rbox(0.3, 0.17, 0.2, 0.06), look.bottom, 0, seat + 0.08, -0.08);
  } else {
    for (const sx of [-1, 1]) {
      rod(root, v3(sx * 0.085, 0.84, 0), v3(sx * 0.09, 0.08, 0.01), 0.056, look.bottom);
      part(root, rbox(0.09, 0.07, 0.2, 0.03), '#37474f', sx * 0.09, 0.035, 0.04);
    }
    part(root, rbox(0.3, 0.17, 0.2, 0.06), look.bottom, 0, 0.88, 0);
  }
  const dz = sitting ? -0.08 : 0;
  part(root, rbox(0.34, 0.46, 0.21, 0.08), look.top, 0, base + 1.11, dz);
  part(root, cyl(0.045, 0.05, 0.08, 10), look.skin, 0, base + 1.37, dz, { outline: false });
  const head = group(root, 0, base + 1.51, dz);
  part(head, ball(0.112), look.skin, 0, 0, 0);
  for (const sx of [-1, 1]) part(head, ball(0.012), '#2b2b30', sx * 0.04, 0, 0.104, { outline: false });
  part(head, box(0.03, 0.006, 0.004), '#a1665e', 0, -0.045, 0.104, { outline: false });
  part(head, ball(0.118), look.hair, 0, 0.03, -0.03);
  part(head, rbox(0.2, 0.05, 0.05, 0.02), look.hair, 0, 0.075, 0.075, { rx: -0.25 });
  const arm = (sx: number) => {
    const shoulder = v3(sx * 0.2, base + 1.31, dz);
    const restAt = sitting ? v3(sx * 0.11, seat + 0.14, 0.2) : v3(sx * 0.23, 0.82, 0.05);
    const upper = limb(root, 0.042, look.top);
    const lower = limb(root, 0.035, look.skin);
    const hand = part(root, ball(0.036), look.skin, 0, 0, 0, { outline: false });
    const loc = new THREE.Vector3();
    const elbow = new THREE.Vector3();
    const d = new THREE.Vector3();
    const bend = new THREE.Vector3();
    return (to: THREE.Vector3 | null) => {
      if (to) loc.copy(to).sub(root.position).applyAxisAngle(UP, -root.rotation.y);
      else loc.copy(restAt);
      d.subVectors(loc, shoulder);
      const L = Math.min(0.5, Math.max(0.05, d.length()));
      d.normalize();
      loc.copy(shoulder).addScaledVector(d, L);
      const a = 0.27;
      const b = 0.25;
      const cosA = THREE.MathUtils.clamp((a * a + L * L - b * b) / (2 * a * L), -1, 1);
      bend.set(sx * 0.6, -1, -0.25).normalize();
      bend.addScaledVector(d, -bend.dot(d)).normalize();
      elbow.copy(shoulder).addScaledVector(d, a * cosA).addScaledVector(bend, a * Math.sqrt(1 - cosA * cosA));
      upper(shoulder, elbow);
      lower(elbow, loc);
      hand.position.copy(loc);
    };
  };
  const armL = arm(1);
  const armR = arm(-1);
  armL(null);
  armR(null);
  const f = vroidFigure({ root, head, armL, armR }, {
    gender,
    ...(sitting ? { seat } : {}),
    ...(ankleR ? { legs: () => ({ r: v3(ankleR[0], ankleR[1], ankleR[2]) }) } : {}),
    ...(seed !== undefined ? { seed } : {}),
    ...(hide.length ? { hide } : {}),
  });
  root.visible = false;
  return f;
}
function lazy(make: () => Fig) {
  let f: Fig | null = null;
  return { get: () => (f ??= make()), hide: () => f && (f.root.visible = false) };
}
const vec = (p: V) => v3(p[0], p[1], p[2]);

// =============================================================================================
// 시술 의자 (tattooChair, 1 × 2).

function tattooChair(g: THREE.Group, out: Built) {
  const SEAT = TC.seat;
  // The foot of the column, its pump pedal; the frame and the drawers under the raised back.
  part(g, rbox(0.64, 0.04, 1.5, 0.02), '#3a3b41', 0, 0.02, -0.2);
  part(g, cyl(0.1, 0.13, 0.38, 16), CHROME, 0, 0.23, 0.22);
  part(g, cyl(0.075, 0.075, 0.1, 14), STEEL, 0, 0.42, 0.22, { outline: false });
  part(g, rbox(0.1, 0.02, 0.14, 0.008), BLACK, 0.26, 0.06, 0.42, { rx: 0.2 });
  rod(g, v3(0.12, 0.08, 0.3), v3(0.26, 0.07, 0.38), 0.009, CHROME);
  part(g, rbox(0.58, 0.46, 0.6, 0.02), VINYL_L, 0, 0.28, -0.62);
  for (let i = 0; i < 2; i++) {
    part(g, box(0.5, 0.17, 0.012), '#3b3c43', 0.0, 0.17 + i * 0.2, -0.315, { outline: false });
    part(g, box(0.1, 0.012, 0.018), CHROME, 0, 0.21 + i * 0.2, -0.305, { outline: false });
  }
  // The seat and the raised back, tufted black vinyl with white stitching; a rolled towel at the head.
  part(g, rbox(0.62, 0.1, 0.64, 0.04), VINYL, 0, SEAT - 0.05, 0.27);
  part(g, box(0.56, 0.05, 0.56), '#37383e', 0, SEAT - 0.13, 0.27, { outline: false });
  const back = group(g, 0, SEAT - 0.01, -0.03);
  back.rotation.x = 0.8;
  part(back, rbox(0.6, 0.1, 0.92, 0.04), VINYL, 0, 0, -0.46);
  for (const z of [-0.2, -0.46, -0.72]) part(back, box(0.5, 0.002, 0.006), '#62646c', 0, 0.051, z, { outline: false });
  for (const sx of [-1, 1]) part(back, box(0.006, 0.002, 0.8), '#62646c', sx * 0.2, 0.051, -0.46, { outline: false });
  part(back, cyl(0.065, 0.065, 0.46, 14), '#efe9db', 0, 0.09, -0.86, { rz: Math.PI / 2 });
  rod(g, v3(-0.2, 0.5, -0.28), v3(-0.2, 0.86, -0.42), 0.012, STEEL);
  rod(g, v3(0.2, 0.5, -0.28), v3(0.2, 0.86, -0.42), 0.012, STEEL);
  // The paper drawn down the bed from its roll, on the seat.
  const paper = part(g, box(0.5, 0.003, 1), '#fbfaf3', 0, SEAT + 0.002, 0, { outline: false });
  part(g, cyl(0.055, 0.055, 0.5, 14), '#fbfaf3', 0, 0.62, -0.92, { rz: Math.PI / 2 });
  for (const sx of [-1, 1]) part(g, box(0.012, 0.1, 0.05), STEEL, sx * 0.26, 0.56, -0.92, { outline: false });
  // A foot bar.
  part(g, rbox(0.46, 0.03, 0.14, 0.012), BLACK, 0, 0.055, 0.82);
  rod(g, v3(-0.1, 0.05, 0.42), v3(-0.1, 0.055, 0.76), 0.01, CHROME);
  rod(g, v3(0.1, 0.05, 0.42), v3(0.1, 0.055, 0.76), 0.01, CHROME);

  // The arm rest on its pole, the steel plate of ink caps on an arm off it.
  part(g, cyl(0.15, 0.17, 0.025, 18), '#3a3b41', -0.36, 0.014, 0.34);
  part(g, cyl(0.016, 0.02, TC.restTop - 0.1, 10), CHROME, -0.36, TC.restTop / 2, 0.34, { outline: false });
  part(g, rbox(0.17, 0.055, 0.5, 0.025), VINYL, -0.36, TC.restTop - 0.03, 0.34);
  part(g, box(0.15, 0.003, 0.46), '#fbfaf3', -0.36, TC.restTop + 0.0, 0.34, { outline: false });
  rod(g, v3(-0.36, TC.restTop - 0.06, 0.56), v3(TC.plate[0], TC.plate[1] - 0.02, TC.plate[2] - 0.04), 0.008, CHROME);
  part(g, cyl(0.1, 0.09, 0.012, 20), STEEL, TC.plate[0], TC.plate[1] - 0.01, TC.plate[2]);
  const CAPS = ['#15151a', '#15151a', '#d93a55', '#2d6fa3', '#f0c64a'];
  const caps = CAPS.map((col, i) => {
    const m = group(g, TC.plate[0] - 0.07 + i * 0.035, TC.plate[1] - 0.002, TC.plate[2] + (i % 2) * 0.03 - 0.012);
    part(m, cyl(0.013, 0.011, 0.016, 10), '#f4f4f4', 0, 0.008, 0, { outline: false });
    part(m, cyl(0.011, 0.011, 0.002, 10), col, 0, 0.0165, 0, { outline: false });
    return m;
  });

  // The stool that goes with the artist.
  const stool = stoolMesh(g, TC.stool[1], TC.stool[0], TC.stool[2]);

  // The trolley: a blue sterile drape on its steel top; the machine in its cradle, gloves, towels, a bottle of green soap,
  // a jar of petroleum jelly, the cartridges; a power supply and a pedal below; the lamp up its pole.
  const T = TC.tray;
  const tro = group(g, T[0], 0, T[2]);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    part(tro, box(0.018, 0.78, 0.018), STEEL, sx * 0.19, 0.42, sz * 0.16, { outline: false });
    part(tro, ball(0.026), BLACK, sx * 0.19, 0.026, sz * 0.16, { outline: false });
  }
  part(tro, rbox(0.42, 0.02, 0.36, 0.006), CHROME, 0, 0.81, 0);
  part(tro, rbox(0.42, 0.018, 0.36, 0.006), STEEL, 0, 0.36, 0);
  part(tro, box(0.38, 0.004, 0.32), '#4fa3c7', 0, T[1] - 0.018, 0, { outline: false });
  part(tro, rbox(0.14, 0.06, 0.09, 0.006), '#2a2c33', -0.08, 0.4, -0.05);
  label(tro, '12.5V', 0.05, 0.02, -0.08, 0.41, -0.003, '#123', '#7fe0a0');
  ownLit(tro, ball(0.005), '#3ee07a', -0.02, 0.41, -0.002);
  part(tro, rbox(0.1, 0.09, 0.08, 0.006), '#f2f2ee', 0.1, 0.415, 0.05);
  label(tro, '일회용', 0.08, 0.02, 0.1, 0.415, 0.092, '#f2f2ee', '#555');
  rod(g, v3(T[0] - 0.08, 0.38, T[2] - 0.05), v3(T[0] + 0.02, 0.03, T[2] + 0.38), 0.005, BLACK);
  rod(g, v3(T[0] + 0.02, 0.03, T[2] + 0.38), v3(-0.56, 0.03, 0.14), 0.005, BLACK);
  part(g, rbox(0.11, 0.03, 0.14, 0.01), BLACK, -0.56, 0.025, 0.2, { rx: 0.14 });
  // On top.
  part(tro, rbox(0.14, 0.07, 0.08, 0.006), '#ececec', -0.1, T[1] + 0.02, -0.1);
  label(tro, '니트릴 M', 0.11, 0.024, -0.1, T[1] + 0.022, -0.058, '#ececec', '#1d1d22');
  for (let i = 0; i < 2; i++) part(tro, box(0.09, 0.004, 0.055), '#222226', -0.1 + i * 0.012, T[1] + 0.06 + i * 0.004, -0.1 + i * 0.006, { ry: 0.3 * i, outline: false });
  part(tro, rbox(0.13, 0.03, 0.11, 0.006), '#f4f4ef', 0.11, T[1] + 0.003, -0.1);
  part(tro, cyl(0.03, 0.03, 0.05, 12), '#efe2a0', -0.02, T[1] + 0.01, 0.12);
  part(tro, cyl(0.032, 0.032, 0.008, 12), '#2a2c33', -0.02, T[1] + 0.036, 0.12, { outline: false });
  const crd = group(tro, 0.12, T[1] + 0.008, 0.08);
  for (let i = 0; i < 3; i++) {
    part(crd, rbox(0.024, 0.008, 0.078, 0.003), '#eaf4f7', -0.03 + i * 0.03, 0.002, 0, { outline: false });
    part(crd, cyl(0.004, 0.004, 0.05, 6), '#26272c', -0.03 + i * 0.03, 0.009, 0, { rx: Math.PI / 2, outline: false });
  }
  // The soap's bottle home and the cradle.
  part(g, cyl(0.03, 0.034, 0.1, 12), '#71a860', TC.bottle[0], TC.bottle[1] + 0.03, TC.bottle[2]);
  part(g, cyl(0.012, 0.016, 0.03, 8), '#e0e0e0', TC.bottle[0], TC.bottle[1] + 0.095, TC.bottle[2], { outline: false });
  const cradleP: V = [T[0] + 0.1, T[1] + 0.03, T[2] + 0.1];
  part(g, rbox(0.1, 0.02, 0.05, 0.006), '#3a3b41', cradleP[0] - 0.04, cradleP[1] - 0.012, cradleP[2]);
  // The lamp: a pole on the trolley, a long arm over the rest; its lit face.
  const pole: V = [T[0] - 0.17, 0, T[2] - 0.13];
  part(g, cyl(0.012, 0.012, 0.84, 8), CHROME, pole[0], T[1] + 0.42, pole[2], { outline: false });
  const hd = v3(-0.46, 1.34, 0.28);
  rod(g, v3(pole[0], T[1] + 0.83, pole[2]), v3(pole[0] + 0.12, T[1] + 0.86, pole[2] + 0.2), 0.01, CHROME);
  rod(g, v3(pole[0] + 0.12, T[1] + 0.86, pole[2] + 0.2), hd, 0.009, CHROME);
  const shade = group(g, hd.x, hd.y, hd.z);
  part(shade, cyl(0.1, 0.06, 0.06, 20), '#e6e6e2', 0, 0, 0);
  const lit = ownLit(shade, cyl(0.086, 0.086, 0.004, 20), '#c9c9c0', 0, -0.032, 0);
  const pool = ownLit(g, cyl(0.2, 0.2, 0.001, 24), '#fff6d6', -0.36, TC.restTop + 0.004, 0.34);
  (pool.material as THREE.MeshBasicMaterial).transparent = true;
  (pool.material as THREE.MeshBasicMaterial).opacity = 0.18;
  pool.visible = false;
  // The calf rest, wheeled up for a demonstration.
  const calfRest = group(g, TC.calfAnkle[0], 0, TC.calfAnkle[2] - 0.02);
  part(calfRest, cyl(0.12, 0.13, 0.02, 14), '#3a3b41', 0, 0.012, 0);
  part(calfRest, cyl(0.016, 0.018, 0.3, 8), CHROME, 0, 0.16, 0, { outline: false });
  part(calfRest, rbox(0.14, 0.04, 0.2, 0.02), VINYL, 0, TC.calfAnkle[1] - 0.09, 0);
  part(calfRest, box(0.12, 0.003, 0.18), '#fbfaf3', 0, TC.calfAnkle[1] - 0.068, 0, { outline: false });
  calfRest.visible = false;

  // What moves in the hands.
  const machine = machineMesh(g);
  const wrap = part(machine.root, cyl(0.026, 0.022, 0.16, 10), '#dff0fa', -0.075, 0.1, 0, { rz: 0.62, outline: false });
  const wrapMat = new THREE.MeshBasicMaterial({ color: '#dff0fa', transparent: true, opacity: 0.45, depthWrite: false });
  wrap.material = wrapMat;
  wrap.userData.ownMaterial = true;
  const bottle = group(g);
  part(bottle, cyl(0.03, 0.034, 0.1, 12), '#71a860', 0, 0, 0);
  part(bottle, cyl(0.012, 0.016, 0.03, 8), '#e0e0e0', 0, 0.065, 0, { outline: false });
  const spray = group(g);
  part(spray, cyl(0.03, 0.034, 0.12, 12), '#9fd0e6', 0, 0, 0);
  part(spray, rbox(0.03, 0.04, 0.05, 0.008), '#2d6fa3', 0, 0.08, 0.008);
  const towel = towelMesh(g);
  const sheet = group(g);
  part(sheet, box(0.11, 0.002, 0.12), '#eee9f8', 0, 0, 0, { outline: false });
  const sheetPic = swapPic(sheet, 0.105, 0.115, 0, 0.003, 0, 0, -Math.PI / 2);
  const pen = penMesh(g, PURPLE);
  const lens = group(g);
  part(lens, ring(0.05, 0.006), BLACK, 0, 0, 0, { rx: Math.PI / 2 });
  rod(lens, v3(-0.05, 0, 0), v3(-0.13, 0.02, 0), 0.007, BLACK);
  const lensGlass = new THREE.Mesh(new THREE.CircleGeometry(0.048, 20), new THREE.MeshBasicMaterial({ color: '#dff3fb', transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }));
  lensGlass.userData.ownGeometry = lensGlass.userData.ownMaterial = true;
  lensGlass.rotation.x = Math.PI / 2;
  lens.add(lensGlass);
  const chart = group(g);
  part(chart, box(0.17, 0.008, 0.23), '#6d4c41', 0, 0, 0, { outline: false });
  picture(chart, painted('ttSkinChart', 170, 230, (c) => {
    c.fillStyle = '#fbfaf3';
    c.fillRect(0, 0, 170, 230);
    text(c, '시술 전 확인서', 85, 18, 15, INK, 'center');
    ['만 나이 확인', '알레르기 없음', '피부 상처 없음', '전날 음주 없음', '복용 약 없음'].forEach((s, i) => {
      c.strokeStyle = '#555';
      c.strokeRect(12, 44 + i * 34, 14, 14);
      text(c, s, 36, 51 + i * 34, 13, '#333');
    });
  }), 0.16, 0.22, 0, 0.006, 0, '#ffffff', 0, -Math.PI / 2);
  const ticks = [0, 1, 2, 3, 4].map((i) => part(chart, box(0.012, 0.002, 0.012), '#2e7d32', -0.058, 0.009, -0.07 + i * 0.033, { outline: false }));
  const album = group(g);
  part(album, rbox(0.36, 0.02, 0.25, 0.006), WOOD_D, 0, 0, 0, { rx: -1.1 });
  const pageA = picture(album, flashTex(1), 0.16, 0.2, -0.09, 0.012, 0.012, '#ffffff', 0, 0);
  const pageB = picture(album, flashTex(4), 0.16, 0.2, 0.09, 0.012, 0.012, '#ffffff', 0, 0);
  pageA.rotation.x = -1.1 + Math.PI / 2;
  pageB.rotation.x = -1.1 + Math.PI / 2;
  const capHand = part(g, cyl(0.013, 0.011, 0.016, 10), '#f4f4f4', 0, 0, 0, { outline: false });
  const capbox = group(g);
  part(capbox, rbox(0.1, 0.04, 0.08, 0.006), '#f0f0f0', 0, 0, 0);
  const pack = group(g);
  part(pack, rbox(0.03, 0.012, 0.09, 0.004), '#a8d9ea', 0, 0, 0, { outline: false });
  const mist = group(g, -0.2, 0.74, 0.34);
  for (let i = 0; i < 6; i++) part(mist, ball(0.012 + (i % 2) * 0.006), '#e2f4ff', 0.05 * i - 0.1, -0.03 * (i % 3), 0.04 * (i % 2), { outline: false });

  // On the skin.
  const skin = skinSleeve(g, 0.05);
  const calfSkin = skinSleeve(g, 0.062);
  const liveSkin = live(256, 128);

  // Whoever's in it, drawn only for the uses that have nobody of the game's to see to. Their figures are fetched when first wanted.
  const armClient = lazy(() => person(g, LOOKS.client1, 0, TC.seatZ, 0, 'male', SEAT));
  const calfClient = lazy(() => person(g, LOOKS.client2, 0, TC.seatZ, 0, 'female', SEAT, TC.calfAnkle));
  // The demonstration: a camera on a tripod, the close-up on a monitor, people watching with their phones.
  const show = group(g);
  rod(show, v3(0.68, 0, 1.18), v3(0.66, 1.0, 1.08), 0.01, BLACK);
  rod(show, v3(0.36, 0, 1.06), v3(0.66, 1.0, 1.08), 0.01, BLACK);
  rod(show, v3(0.82, 0, 0.92), v3(0.66, 1.0, 1.08), 0.01, BLACK);
  const camBody = group(show, 0.64, 1.06, 1.05, Math.atan2(TC.calfAnkle[0] - 0.64, TC.calfAnkle[2] - 1.05));
  part(camBody, rbox(0.13, 0.09, 0.09, 0.012), BLACK, 0, 0, 0);
  part(camBody, cyl(0.03, 0.036, 0.09, 12), '#3a3b41', 0, 0, 0.08, { rx: Math.PI / 2 });
  ownLit(camBody, ball(0.008), '#ff3b30', 0.05, 0.05, 0.01);
  part(show, cyl(0.012, 0.016, 1.25, 8), BLACK, 0.74, 0.625, -0.48, { outline: false });
  part(show, rbox(0.34, 0.03, 0.22, 0.01), BLACK, 0.74, 0.02, -0.48);
  part(show, rbox(0.48, 0.3, 0.03, 0.012), '#101014', 0.74, 1.32, -0.48);
  const closeUp = swapPic(show, 0.44, 0.26, 0.74, 1.32, -0.462);
  const liveClose = live(256, 150);
  show.visible = false;
  const watcherA = lazy(() => person(g, LOOKS.watcher, 1.02, 0.34, -Math.PI / 2 - 0.25, 'female'));
  const watcherB = lazy(() => person(g, LOOKS.watcher2, 1.24, 0.92, -Math.PI / 2 - 0.5, 'male'));
  const phones = [0, 1].map(() => part(g, rbox(0.07, 0.14, 0.01, 0.006), '#101014', 0, 0, 0, { outline: false }));

  const spots: Record<string, Spot> = {
    prepareStation: standAt(g, 'ttPrep'),
    liveTattooDemo: standAt(g, 'ttDemo'),
    tattooArtist_skinCheck: standAt(g, 'ttSkin'),
    'social:tattooWork': standAt(g, 'ttWork'),
    'social:tattooConsult': standAt(g, 'ttTalk'),
  };
  spots['*'] = spots.prepareStation;
  out.seat = marker(g, 0, SEAT, TC.seatZ);
  out.work = marker(g, -0.36, TC.restTop + 0.03, 0.34);

  const seedC = { v: -1 };
  drive(g, out, spots, (now, N, t) => {
    if (seedC.v < 0) seedC.v = seedOf(g);
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const round = (N?.b.n ?? 0) + seedC.v;
    const d = designOf(round);
    const demo = now === 'liveTattooDemo';
    const work = now === 'social:tattooWork';
    const talk = now === 'social:tattooConsult';
    const check = now === 'tattooArtist_skinCheck';
    const prep = now === 'prepareStation';

    stool.position.z = demo ? TC.stoolCalf[2] : TC.stool[2];
    // The bed: drawn out to its length (all of it when nobody's preparing it).
    const pp = prep ? n.paper ?? 0 : 1;
    paper.visible = pp > 0.01;
    paper.scale.z = Math.max(0.01, 0.7 * pp);
    paper.position.z = 0.58 - 0.35 * pp * 1 - 0.0;
    caps.forEach((m, i) => (m.visible = !prep || (n.caps ?? 0) > i + 0.75));
    const on = (n.on ?? 0) > 0.5;
    setLit(lit, on ? '#fff8dc' : '#c9c9c0');
    pool.visible = on;

    at(machine.root, P.machine, cradleP);
    const buzz = (n.buzz ?? 0) > 0.5;
    if (buzz) machine.root.position.y += 0.0008 * Math.sin(t * 120);
    setLit(machine.led, buzz ? '#3ee07a' : '#223322');
    wrap.visible = prep ? (n.wrap ?? 0) > 0.2 : !!N;
    wrap.scale.y = prep ? Math.max(0.1, n.wrap ?? 0) : 1;

    at(bottle, P.bottle ?? null);
    at(spray, P.spray ?? null);
    mist.visible = (n.mist ?? 0) > 0.5;
    at(towel, P.towel ?? null);
    at(sheet, P.sheet ?? null);
    if (P.sheet) sheetPic.set(stencilTex(round));
    at(pen, P.pen ?? null);
    at(lens, P.lens ?? null);
    at(chart, P.chart ?? null);
    if (P.chart) ticks.forEach((m, i) => (m.visible = (n.written ?? 0) * 5 > i + 0.3));
    at(album, P.album ?? null);
    if (P.album) {
      const pg = Math.round(n.page ?? 0) + round;
      (pageA.material as THREE.MeshBasicMaterial).map = flashTex(pg);
      (pageB.material as THREE.MeshBasicMaterial).map = flashTex(pg + 3);
    }
    at(capHand, P.cap ?? null);
    at(capbox, P.capbox ?? null);
    at(pack, P.pack ?? null);

    // What's on the skin, grown by the same beats. Someone of the game's: round their own forearm in the lap.
    const showSkin = (work && (n.sleeve ?? 0) > 0.5) || check || demo;
    if (showSkin) {
      const key = `${d.name}|${q(n.stencil, 8)}|${q(n.line)}|${q(n.shade)}|${q(n.film, 10)}|${q(n.wet, 6)}`;
      const tex = check ? null : liveSkin(key, (c) => paintSkin(c, d, n));
      if (work) {
        skin.lay(TC.lapWrist, TC.lapElbow, 0.14, 0.88);
        skin.set(tex);
        skin.mesh.visible = !!tex;
        calfSkin.mesh.visible = false;
      } else if (demo) {
        calfSkin.lay(TC.calfAnkle, TC.calfKnee, 0.16, 0.86);
        calfSkin.set(tex);
        calfSkin.mesh.visible = !!tex;
        skin.mesh.visible = false;
      } else {
        skin.mesh.visible = false;
        calfSkin.mesh.visible = false;
      }
      if (demo && tex) {
        const cl = liveClose(key, (c) => {
          c.fillStyle = SKIN;
          c.fillRect(0, 0, 256, 150);
          c.fillStyle = '#d9a97f';
          c.fillRect(0, 118, 256, 32);
          drawArt(c, d, 'stencil', 68, 14, 120);
          drawArt(c, d, 'full', 68, 14, 120, n.shade ?? 0);
          drawArt(c, d, 'line', 68, 14, 120, n.line ?? 0);
          c.fillStyle = '#d32f2f';
          c.fillRect(8, 8, 52, 20);
          text(c, 'LIVE', 34, 18, 14, '#ffffff', 'center');
          text(c, `${BRAND} · ${d.name}`, 248, 138, 12, '#3a2a1c', 'right');
        });
        closeUp.set(cl);
      }
    } else {
      skin.mesh.visible = false;
      calfSkin.mesh.visible = false;
    }
    calfRest.visible = demo;
    show.visible = demo;

    // Who's drawn.
    if (check) {
      const f = armClient.get();
      f.root.visible = (n.there ?? 1) > 0.02;
      f.armR(vec(TC.restHand));
      f.armL(null);
      f.head.rotation.y = -0.5;
      f.head.rotation.x = 0.12;
    } else armClient.hide();
    if (demo) {
      const f = calfClient.get();
      f.root.visible = true;
      f.armL(null);
      f.armR(null);
      f.head.rotation.y = -0.2;
      f.head.rotation.x = 0.1;
      const A = watcherA.get();
      const B = watcherB.get();
      A.root.visible = B.root.visible = true;
      const clap = (n.clap ?? 0) > 0.5;
      const beat = 0.03 * Math.sin(t * 12);
      const pa = v3(0.82, 1.28, 0.36);
      const pb = v3(1.02, 1.25, 0.85);
      if (clap) {
        A.armL(v3(0.8 + beat, 1.16, 0.34));
        A.armR(v3(0.8 - beat, 1.16, 0.42));
        B.armL(v3(1.02 + beat, 1.13, 0.8));
        B.armR(v3(1.02 - beat, 1.13, 0.88));
      } else {
        A.armR(pa);
        A.armL(null);
        B.armL(pb);
        B.armR(null);
      }
      phones[0].visible = phones[1].visible = !clap;
      phones[0].position.copy(pa);
      phones[1].position.copy(pb);
      phones[0].rotation.y = -Math.PI / 2;
      phones[1].rotation.y = -Math.PI / 2;
    } else {
      calfClient.hide();
      watcherA.hide();
      watcherB.hide();
      phones[0].visible = phones[1].visible = false;
    }
    if (talk) wrap.visible = false;
  });
}

// =============================================================================================
// 도안 벽 (flashWall, 2 × 1): a dark panel of pinned sheets under a sign, a sloping drawing board before it.

function flashWall(g: THREE.Group, out: Built) {
  const Z = FW.slot[2];
  part(g, box(1.96, 2.1, 0.1), CHAR, 0, 1.2, Z - 0.06);
  part(g, box(2.0, 0.04, 0.14), WOOD, 0, 2.27, Z - 0.05);
  part(g, box(2.0, 0.04, 0.14), WOOD, 0, 0.14, Z - 0.05);
  const signTex = painted('ttFlashSign', 520, 80, (c) => {
    c.fillStyle = '#17181b';
    c.fillRect(0, 0, 520, 80);
    text(c, `${BRAND} 플래시 도안`, 260, 42, 42, '#ffe9b8', 'center');
  });
  picture(g, signTex, 1.5, 0.22, 0, 2.11, Z + 0.004);
  // Pinned sheets, the place at the top right bare for the next.
  const r = seeded(31);
  const XS = [-0.72, -0.36, 0, 0.32, 0.68];
  const YS = [FW.slot[1], 1.34];
  let i = 0;
  XS.forEach((x) => YS.forEach((y) => {
    if (x === FW.slot[0] && y === FW.slot[1]) return;
    const pic = picture(g, flashTex(i++), 0.3, 0.36, x, y, Z + 0.004);
    pic.rotation.z = (r() - 0.5) * 0.05;
    part(g, ball(0.01), '#c9352e', x, y + 0.165, Z + 0.016, { outline: false });
  }));
  const hung = swapPic(g, 0.3, 0.36, FW.slot[0], FW.slot[1], Z + 0.004);
  const hungPins = part(g, ball(0.01), '#c9352e', FW.slot[0], FW.slot[1] + 0.165, Z + 0.016, { outline: false });
  // Its own little lights.
  part(g, box(1.7, 0.02, 0.03), '#17181b', 0, 2.0, Z + 0.1);
  rod(g, v3(-0.8, 2.01, Z), v3(-0.8, 2.01, Z + 0.1), 0.006, '#17181b');
  rod(g, v3(0.8, 2.01, Z), v3(0.8, 2.01, Z + 0.1), 0.006, '#17181b');
  for (const x of [-0.6, 0, 0.6]) {
    part(g, cyl(0.03, 0.04, 0.06, 10), '#17181b', x, 1.97, Z + 0.1);
    ownLit(g, cyl(0.034, 0.034, 0.003, 12), '#fff0c2', x, 1.94, Z + 0.1);
  }
  // The sloping board on its two brackets; the ledge at its foot; the jar of pens and the plate of paints.
  const B = FW.board;
  const tilt = -(Math.PI / 2 - FW.tilt);
  part(g, box(0.56, 0.44, 0.03), WOOD, B[0], B[1] - 0.012, B[2] - 0.012, { rx: tilt });
  part(g, box(1.72, 0.04, 0.3), WOOD_D, 0, B[1] - 0.12, B[2] - 0.05);
  for (const sx of [-0.8, 0.8]) rod(g, v3(sx, B[1] - 0.14, Z), v3(sx, 0.2, Z), 0.02, WOOD_D);
  part(g, box(0.5, 0.02, 0.02), BLACK, B[0], B[1] - 0.15, B[2] + 0.13, { outline: false });
  const sheet = swapPic(g, 0.36, 0.36, B[0], B[1] + 0.012, B[2], 0, tilt);
  const liveSheet = live(256, 256);
  part(g, cyl(0.04, 0.035, 0.09, 12), '#c7bfa7', -0.68, B[1] - 0.05, B[2] - 0.06);
  for (let k = 0; k < 4; k++) part(g, cyl(0.004, 0.004, 0.16, 6), ['#1d1d22', '#c9352e', '#2d6fa3', '#d9a63a'][k], -0.7 + k * 0.012, B[1] + 0.03, B[2] - 0.06, { rz: 0.1 - k * 0.06, outline: false });
  part(g, cyl(0.1, 0.09, 0.012, 18), ENAMEL, FW.caps[0], FW.caps[1] - 0.09, FW.caps[2]);
  ['#15151a', '#d93a55', '#2d6fa3', '#f0c64a', '#3f7d4e'].forEach((col, k) => part(g, cyl(0.016, 0.016, 0.004, 10), col, FW.caps[0] - 0.05 + k * 0.025, FW.caps[1] - 0.082, FW.caps[2] + (k % 2) * 0.03, { outline: false }));
  // In the hands.
  const pencil = penMesh(g, '#f4b942');
  const pen = penMesh(g, '#1d1d22');
  const brush = penMesh(g, '#c9352e');
  const flying = swapPic(g, 0.3, 0.36, 0, 0, 0);
  const pupil = lazy(() => person(g, LOOKS.pupil, FW_PUPIL.x, FW_PUPIL.z, Math.PI, 'female'));
  const pupilPencil = penMesh(g, '#f4b942');

  const spots: Record<string, Spot> = { drawFlash: standAt(g, 'ttFlash'), tattooArtist_customDesign: standAt(g, 'ttCover'), tattooArtist_teachApprentice: standAt(g, 'ttTeach') };
  spots['*'] = spots.drawFlash;
  const OLD = (c: Ctx2, alpha: number) => {
    // A photo of an old blurred mark, nothing that can be read.
    c.fillStyle = `rgba(232,196,160,${alpha})`;
    c.fillRect(24, 24, 208, 208);
    c.fillStyle = `rgba(52,74,88,${alpha})`;
    const rr = seeded(5);
    for (let k = 0; k < 22; k++) c.fillRect(70 + rr() * 110, 90 + rr() * 70, 8 + rr() * 16, 4 + rr() * 10);
  };
  let seed = -1;
  drive(g, out, spots, (now, N, t) => {
    if (seed < 0) seed = seedOf(g);
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const round = (N?.b.n ?? -1) + seed;
    const cover = now === 'tattooArtist_customDesign';
    const teach = now === 'tattooArtist_teachApprentice';
    const i0 = cover ? 1 + (round % 2) * 3 : round;
    const d = designOf(i0);
    const key = N ? `${now}|${i0}|${q(n.rough)}|${q(n.ink)}|${q(n.color)}|${q(n.photo, 8)}|${q(n.vellum, 8)}|${q(n.wrong, 8)}` : `idle${seed}`;
    sheet.set(liveSheet(key, (c) => {
      c.fillStyle = PAPER;
      c.fillRect(0, 0, 256, 256);
      if (!N) {
        drawArt(c, designOf(seed), 'line', 28, 28, 200, 0.55);
        return;
      }
      if (cover) {
        OLD(c, n.photo ?? 0);
        if ((n.vellum ?? 0) > 0) {
          c.fillStyle = `rgba(250,248,240,${0.62 * (n.vellum ?? 0)})`;
          c.fillRect(0, 256 * (1 - (n.vellum ?? 0)), 256, 256);
        }
      }
      c.globalAlpha = 0.5;
      if ((n.rough ?? 0) > 0) drawArt(c, d, 'stencil', 28, 28, 200, n.rough ?? 0);
      c.globalAlpha = 1;
      if (teach) {
        drawArt(c, d, 'line', 28, 28, 200, n.ink ?? 0);
        if ((n.wrong ?? 0) > 0.05) {
          c.strokeStyle = `rgba(217,58,85,${n.wrong ?? 0})`;
          c.lineWidth = 5;
          c.beginPath();
          c.arc(170, 134, 26, 0, Math.PI * 2);
          c.stroke();
        }
        return;
      }
      drawArt(c, d, 'full', 28, 28, 200, n.color ?? 0);
      drawArt(c, d, 'line', 28, 28, 200, n.ink ?? 0);
    }));
    at(pencil, P.pencil ?? null);
    at(pen, P.pen ?? null);
    at(brush, P.brush ?? null);
    flying.mesh.visible = !!P.flying;
    if (P.flying) {
      flying.mesh.position.set(P.flying[0], P.flying[1], P.flying[2]);
      flying.set(flashTex(round));
    }
    const sh2 = !N || now !== 'drawFlash' || (n.hung ?? 0) > 0.5 || round > seed;
    hung.mesh.visible = sh2;
    hungPins.visible = sh2;
    hung.set(flashTex(now === 'drawFlash' ? ((n.hung ?? 0) > 0.5 ? round : round - 1) : seed + 5));
    if (teach) {
      const f = pupil.get();
      f.root.visible = true;
      const drawing = (n.pupilDraws ?? 0) > 0.5;
      const p = pupilPoint(t);
      f.armR(drawing ? v3(p[0] + 0.02, p[1] + 0.05, p[2] + 0.05) : null);
      f.armL(null);
      f.head.rotation.x = (n.praised ?? 0) > 0.5 ? 0.05 + 0.1 * Math.sin(t * 5) : 0.3;
      at(pupilPencil, drawing ? p : null);
    } else {
      pupil.hide();
      pupilPencil.visible = false;
    }
  });
  out.work = marker(g, B[0], B[1] + 0.02, B[2]);
}

// =============================================================================================
// 스텐실 작업대 (ttStencilTable, 3 × 1).

function stencilTable(g: THREE.Group, out: Built) {
  const T = ST.top;
  part(g, rbox(2.86, 0.05, 0.84, 0.012), '#3a3a40', 0, T - 0.025, 0);
  part(g, box(2.8, 0.008, 0.78), '#2b6a58', 0, T + 0.004, 0, { outline: false });
  for (const [x, z] of [[-1.34, -0.32], [1.34, -0.32], [-1.34, 0.32], [1.34, 0.32]] as const) part(g, box(0.05, T - 0.05, 0.05), BLACK, x, (T - 0.05) / 2, z);
  part(g, rbox(0.6, 0.38, 0.6, 0.01), '#4b4c54', -0.84, T - 0.24, -0.04);
  for (let i = 0; i < 2; i++) {
    part(g, box(0.54, 0.15, 0.012), '#5a5b64', -0.84, T - 0.14 - i * 0.18, 0.262, { outline: false });
    part(g, box(0.16, 0.012, 0.018), CHROME, -0.84, T - 0.1 - i * 0.18, 0.27, { outline: false });
  }
  label(g, '전사지', 0.14, 0.04, -0.84, T - 0.17, 0.27, '#5a5b64', '#f2f2f2');
  // The light box: a tilted slab whose top glows when it's switched on.
  const Bx = ST.box;
  const tilt = -(Math.PI / 2 - ST.tilt);
  part(g, rbox(0.56, 0.08, 0.4, 0.012), '#d6d6d2', Bx[0], Bx[1] - 0.03, Bx[2], { rx: ST.tilt });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.34), new THREE.MeshBasicMaterial({ color: '#8a8a84' }));
  glow.userData.ownGeometry = glow.userData.ownMaterial = true;
  glow.position.set(Bx[0], Bx[1] + 0.014, Bx[2]);
  glow.rotation.set(-Math.PI / 2 + ST.tilt, 0, 0);
  g.add(glow);
  part(g, cyl(0.012, 0.012, 0.012, 10), '#e53935', Bx[0] + 0.25, Bx[1] - 0.05, Bx[2] + 0.17, { rx: 1.2, outline: false });
  const sheet = swapPic(g, 0.44, 0.3, Bx[0], Bx[1] + 0.024, Bx[2], 0, tilt);
  const liveSheet = live(256, 180);
  const tapes = [-1, 1].map((sx) => part(g, box(0.04, 0.004, 0.015), '#efe2a0', Bx[0] + sx * 0.19, Bx[1] + 0.058, Bx[2] - 0.13, { outline: false }));
  // Thermal copier: the slot in its top, its rollers, the out tray and a little panel.
  const C = ST.copier;
  part(g, rbox(0.46, 0.12, 0.4, 0.02), '#d9dade', C[0], T + 0.06, C[2]);
  part(g, rbox(0.46, 0.05, 0.28, 0.02), '#b9bbc2', C[0], T + 0.135, C[2] - 0.05);
  part(g, box(0.34, 0.005, 0.03), '#17181b', C[0], T + 0.11, ST.slot[2], { outline: false });
  part(g, cyl(0.012, 0.012, 0.34, 10), '#2a2a30', C[0], T + 0.1, ST.slot[2] + 0.002, { rz: Math.PI / 2, outline: false });
  part(g, box(0.34, 0.006, 0.2), '#bfc1c8', C[0], T + 0.03, ST.outZ + 0.03, { rx: 0.08 });
  label(g, '열전사기', 0.16, 0.04, C[0] - 0.08, T + 0.06, C[2] + 0.204, '#d9dade', '#26272c');
  const lamp = ownLit(g, ball(0.01), '#334433', C[0] + 0.14, T + 0.06, C[2] + 0.205);
  const roller = part(g, box(0.02, 0.006, 0.01), '#fff', C[0] - 0.1, T + 0.11, ST.slot[2] + 0.002, { outline: false });
  // The stack, jar, ruler, scissors, swatch of done stencils; a little desk lamp, low.
  part(g, box(0.28, 0.02, 0.2), '#fffbf0', ST.stack[0], T + 0.014, ST.stack[2]);
  part(g, box(0.28, 0.003, 0.2), PURPLE, ST.stack[0], T + 0.026, ST.stack[2], { outline: false });
  part(g, cyl(0.04, 0.036, 0.1, 12), '#caa97a', -0.6, T + 0.05, -0.18);
  for (let i = 0; i < 4; i++) part(g, cyl(0.004, 0.004, 0.16, 6), ['#f4b942', '#1d1d22', PURPLE, '#c9352e'][i], -0.61 + i * 0.008, T + 0.12, -0.18, { rz: 0.08 - i * 0.05, outline: false });
  part(g, box(0.4, 0.004, 0.04), '#d9d3b0', -0.56, T + 0.012, 0.28, { outline: false, ry: 0.15 });
  part(g, rbox(0.16, 0.03, 0.1, 0.008), '#26272c', 0.4, T + 0.02, -0.28);
  rod(g, v3(0.4, T + 0.03, -0.28), v3(0.34, T + 0.32, -0.2), 0.008, BLACK);
  rod(g, v3(0.34, T + 0.32, -0.2), v3(0.2, T + 0.36, -0.06), 0.008, BLACK);
  part(g, cyl(0.04, 0.07, 0.05, 12), '#26272c', 0.2, T + 0.34, -0.06);
  ownLit(g, cyl(0.06, 0.06, 0.003, 12), '#fff3cc', 0.2, T + 0.31, -0.06);
  stoolMesh(g, ST.seat[1], ST.seat[0], ST.seat[2]);
  // A low wire rack on the left: stencils hung to wait for the day's clients.
  part(g, box(0.5, 0.02, 0.03), STEEL, ST.rack[0], ST.rack[1] + 0.02, ST.rack[2], { outline: false });
  for (const sx of [-1, 1]) rod(g, v3(ST.rack[0] + sx * 0.24, T, ST.rack[2]), v3(ST.rack[0] + sx * 0.24, ST.rack[1] + 0.02, ST.rack[2]), 0.006, STEEL);
  picture(g, stencilTex(2), 0.18, 0.2, ST.rack[0] - 0.13, ST.rack[1] - 0.1, ST.rack[2] + 0.004);
  const hung = swapPic(g, 0.18, 0.2, ST.rack[0] + 0.12, ST.rack[1] - 0.1, ST.rack[2] + 0.004);
  // In the hands.
  const pencil = penMesh(g, '#f4b942');
  const paper = group(g);
  part(paper, box(0.26, 0.003, 0.2), PAPER, 0, 0, 0, { outline: false });
  const out2 = group(g);
  part(out2, box(0.26, 0.002, 0.2), '#eee9f8', 0, 0, 0, { outline: false });
  const outPic = swapPic(out2, 0.24, 0.18, 0, 0.003, 0, 0, -Math.PI / 2);
  const feeding = part(g, box(0.26, 0.003, 0.01), '#eee9f8', C[0], T + 0.03, ST.outZ, { outline: false });
  const backing = part(g, box(0.26, 0.002, 0.2), '#f6e2a8', 0, 0, 0, { outline: false });
  const scissors = group(g);
  for (const sx of [-1, 1]) {
    part(scissors, box(0.008, 0.003, 0.09), STEEL, sx * 0.008, 0, 0.04, { ry: sx * 0.1, outline: false });
    part(scissors, ring(0.016, 0.003), '#c9352e', sx * 0.018, 0, -0.024, { rx: Math.PI / 2, outline: false });
  }
  const spots: Record<string, Spot> = { ttTraceStencil: seatAt(g, 'ttTrace', ST.seat), ttThermalCopy: standAt(g, 'ttCopy', 0.62) };
  spots['*'] = spots.ttTraceStencil;
  let seed = -1;
  drive(g, out, spots, (now, N, t) => {
    if (seed < 0) seed = seedOf(g);
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const round = (N?.b.n ?? 0) + seed;
    const d = designOf(round);
    const trace = now === 'ttTraceStencil';
    const copy = now === 'ttThermalCopy';
    (glow.material as THREE.MeshBasicMaterial).color.set(trace && (n.lit ?? 0) > 0.5 ? '#fffdf0' : '#8a8a84');
    const layOn = trace ? n.lay ?? 0 : 0;
    sheet.mesh.visible = !N ? true : trace && layOn > 0.02;
    sheet.mesh.scale.y = trace ? Math.max(0.03, layOn) : 1;
    sheet.set(liveSheet(`${trace ? q(n.traced) : -1}|${trace ? d.name : 'idle'}|${q(n.peek, 5)}`, (c) => {
      c.fillStyle = trace && (n.lit ?? 0) > 0.5 ? '#fbf7e6' : PAPER;
      c.fillRect(0, 0, 256, 180);
      if (!trace) {
        drawArt(c, designOf(seed + 2), 'line', 48, 10, 160, 0.7);
        return;
      }
      c.globalAlpha = 0.28;
      drawArt(c, d, 'line', 48, 10, 160);
      c.globalAlpha = 1;
      drawArt(c, d, 'stencil', 48, 10, 160, n.traced ?? 0);
    }));
    tapes.forEach((m, i) => (m.visible = (trace ? (n.tape ?? 0) : 2) > i + 0.45));
    at(pencil, P.pencil ?? (N ? null : ST.pencil));
    at(paper, P.paper ?? null);
    at(out2, P.sheet ?? null);
    if (P.sheet) outPic.set(stencilTex(round));
    feeding.visible = copy && (n.going ?? 0) > 0.5;
    if (feeding.visible) {
      const g2 = n.run ?? 0;
      feeding.scale.z = Math.max(0.2, g2 * 20);
      feeding.position.z = ST.slot[2] + 0.04 + g2 * 0.1;
    }
    setLit(lamp, copy && (n.going ?? 0) > 0.5 ? (Math.sin(t * 8) > 0 ? '#3ee07a' : '#144') : '#334433');
    roller.position.x = C[0] - 0.14 + 0.28 * frac((copy && (n.going ?? 0) > 0.5 ? t * 1.3 : 0));
    backing.visible = copy && (n.peel ?? 0) > 0.02;
    if (backing.visible && P.sheet) backing.position.set(P.sheet[0] + 0.26 * (n.peel ?? 0), P.sheet[1] + 0.05 * Math.sin((n.peel ?? 0) * Math.PI), P.sheet[2]);
    at(scissors, P.scissors ?? null, ST.scissors);
    hung.set(stencilTex(copy && (n.hung ?? 0) > 0.5 ? round : seed + 6));
  });
  out.work = marker(g, Bx[0], Bx[1] + 0.03, Bx[2]);
}
const frac = (x: number) => ((x % 1) + 1) % 1;

// =============================================================================================
// 잉크·멸균 선반 (ttInkShelf, 2 × 1).

const INK_COLOURS = ['#15151a', '#25252c', '#6d6e74', '#d93a55', '#c9352e', '#e0632b', '#f2a13b', '#f0c64a', '#3f7d4e', '#2d8a7e', '#2d6fa3', '#20345e', '#7a4fa3', '#f28a97', '#efe4c6'];
function inkBottle(g: THREE.Object3D, col: string, x: number, y: number, z: number): THREE.Group {
  const b = group(g, x, y, z);
  part(b, cyl(0.024, 0.026, 0.09, 10), col, 0, 0.045, 0);
  part(b, box(0.036, 0.04, 0.003), '#f4efe1', 0, 0.045, 0.026, { outline: false });
  part(b, cyl(0.009, 0.015, 0.03, 8), '#f4f4f4', 0, 0.105, 0, { outline: false });
  return b;
}
function inkShelf(g: THREE.Group, out: Built) {
  const T = IS.top;
  // The cabinet and its worktop.
  part(g, rbox(1.94, T - 0.05, 0.58, 0.01), '#e5e7ea', 0, (T - 0.05) / 2, -0.17);
  part(g, rbox(1.98, 0.04, 0.64, 0.01), '#fafafa', 0, T - 0.02, -0.14);
  for (const x of [-0.65, 0, 0.65]) {
    part(g, box(0.6, 0.72, 0.012), '#f4f5f6', x, 0.44, 0.12, { outline: false });
    part(g, box(0.1, 0.012, 0.018), CHROME, x, 0.72, 0.13, { outline: false });
  }
  label(g, '일회용품', 0.24, 0.05, -0.65, 0.62, 0.128, '#f4f5f6', '#37474f');
  label(g, '장갑·거즈', 0.24, 0.05, 0, 0.62, 0.128, '#f4f5f6', '#37474f');
  // The yellow-lidded bin for needles, tagged.
  part(g, rbox(0.2, 0.22, 0.16, 0.008), '#e8c83a', 0.65, 0.36, 0.18);
  part(g, box(0.2, 0.03, 0.16), '#d93a3a', 0.65, 0.485, 0.18);
  label(g, '손상성 폐기물', 0.17, 0.04, 0.65, 0.36, 0.262, '#e8c83a', '#3a2a10');
  // The upper shelves on their back.
  part(g, box(1.94, 1.34, 0.03), '#d6d8dc', 0, T + 0.67, -0.42);
  for (const sx of [-1, 1]) part(g, box(0.03, 1.34, 0.4), '#c7cace', sx * 0.97, T + 0.67, -0.24);
  [IS.bottleShelf, IS.bottleShelf + 0.34, IS.bottleShelf + 0.68].forEach((y) => part(g, box(1.94, 0.022, 0.38), '#f4f5f6', 0, y - 0.012, -0.24));
  // Row after row of inks; the pick's own at the front.
  const r = seeded(5);
  INK_COLOURS.forEach((col, i) => {
    const x = -0.84 + (i % 15) * 0.12;
    if (Math.abs(x - IS.pick[0]) < 0.05) return;
    inkBottle(g, col, x, IS.bottleShelf, -0.14 + (r() - 0.5) * 0.02);
  });
  const homeBottle = inkBottle(g, '#15151a', IS.pick[0], IS.bottleShelf, -0.14);
  for (let i = 0; i < 12; i++) inkBottle(g, INK_COLOURS[(i * 2) % INK_COLOURS.length], -0.8 + i * 0.145, IS.bottleShelf + 0.34, -0.2);
  label(g, '잉크 · 개봉일 확인', 0.46, 0.05, -0.62, IS.bottleShelf + 0.3, -0.05, '#f4f5f6', '#37474f');
  label(g, '유통기한 지난 잉크 사용 금지', 0.6, 0.05, 0.5, IS.bottleShelf + 0.3, -0.05, '#f4f5f6', '#b02a2a');
  // Boxes on top.
  [[-0.6, '바늘 카트리지 3RL'], [0, '바늘 카트리지 7M'], [0.6, '멸균 파우치']].forEach(([x, s], i) => {
    part(g, rbox(0.5, 0.2, 0.26, 0.008), ['#b7d6e6', '#c7e0c0', '#f1d7a6'][i], x as number, IS.bottleShelf + 0.78, -0.2);
    label(g, s as string, 0.4, 0.05, x as number, IS.bottleShelf + 0.78, -0.068, '#ffffff', '#37474f');
  });
  // On the worktop: the log on its board, the heat sealer, pouches, and the autoclave.
  part(g, box(0.2, 0.008, 0.26), '#6d4c41', IS.log[0], T + 0.006, IS.log[2]);
  const logPic = swapPic(g, 0.18, 0.24, IS.log[0], T + 0.012, IS.log[2], 0, -Math.PI / 2);
  const liveLog = live(180, 240);
  part(g, rbox(0.3, 0.06, 0.14, 0.012), '#42454c', IS.sealer[0], T + 0.03, IS.sealer[2]);
  const sealArm = group(g, IS.sealer[0], T + 0.06, IS.sealer[2] - 0.05);
  part(sealArm, rbox(0.28, 0.026, 0.1, 0.008), '#54575f', 0, 0.018, 0.05);
  const sealLit = ownLit(g, ball(0.007), '#442222', IS.sealer[0] - 0.1, T + 0.03, IS.sealer[2] + 0.072);
  for (let i = 0; i < 3; i++) part(g, box(0.16, 0.006, 0.24), '#dff0f6', IS.pouch[0] + 0.02 * i, T + 0.006 + i * 0.006, IS.pouch[2] - 0.02 + i * 0.01, { outline: false, ry: 0.1 * i });
  // The small autoclave: a beige box, a round door, a row of buttons and a window of numbers.
  const AX = IS.chamber[0];
  const AY = IS.chamber[1];
  part(g, rbox(0.46, 0.36, 0.34, 0.02), '#e6e3d9', AX, AY + 0.02, -0.03);
  part(g, cyl(0.12, 0.12, 0.012, 22), '#2a2d33', AX, AY - 0.01, 0.142, { rx: Math.PI / 2, outline: false });
  part(g, box(0.28, 0.08, 0.008), '#17181b', AX, AY + 0.15, 0.142, { outline: false });
  const panel = swapPic(g, 0.26, 0.07, AX, AY + 0.15, 0.148);
  const livePanel = live(208, 56);
  const pouches = group(g, AX, AY - 0.01, 0.13);
  for (let i = 0; i < 2; i++) part(pouches, box(0.16, 0.01, 0.1), '#dff0f6', 0, -0.03 + i * 0.05, 0, { outline: false });
  const hinge = group(g, AX - 0.2, AY - 0.01, 0.15);
  part(hinge, cyl(0.135, 0.135, 0.02, 22), '#d4d1c6', 0.2, 0, 0.01, { rx: Math.PI / 2 });
  part(hinge, ring(0.1, 0.008), '#8f8d84', 0.2, 0, 0.022, { outline: false });
  part(hinge, rbox(0.03, 0.12, 0.03, 0.01), '#42454c', 0.33, 0, 0.03);
  // In the hands.
  const bottle = inkBottle(g, '#15151a', 0, 0, 0);
  const pen = penMesh(g);
  const pouch = group(g);
  part(pouch, box(0.14, 0.008, 0.2), '#dff0f6', 0, 0, 0, { outline: false });
  for (let i = 0; i < 3; i++) part(pouch, box(0.012, 0.01, 0.14), STEEL, -0.03 + i * 0.03, 0.004, 0, { outline: false });
  const strip = group(g);
  const stripNew = part(strip, box(0.09, 0.004, 0.02), '#e5e3d6', 0, 0, 0, { outline: false });
  const stripDone = part(strip, box(0.09, 0.004, 0.02), '#2e2e33', 0, 0, 0, { outline: false });
  const spots: Record<string, Spot> = { ttCheckInk: standAt(g, 'ttInk'), ttLoadAutoclave: standAt(g, 'ttLoad') };
  spots['*'] = spots.ttCheckInk;
  drive(g, out, spots, (now, N) => {
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const load = now === 'ttLoadAutoclave';
    const chk = now === 'ttCheckInk';
    bottle.visible = chk && !!P.bottle;
    if (P.bottle) bottle.position.set(P.bottle[0], P.bottle[1] - 0.05, P.bottle[2]);
    homeBottle.visible = !bottle.visible;
    at(pen, chk ? P.pen ?? null : null);
    logPic.set(liveLog(`${q(n.written, 10)}|${chk}`, (c) => {
      c.fillStyle = '#fbfaf3';
      c.fillRect(0, 0, 180, 240);
      text(c, '잉크 점검표', 90, 18, 16, INK, 'center');
      for (let i = 0; i < 7; i++) {
        c.strokeStyle = '#bbb';
        c.beginPath();
        c.moveTo(10, 44 + i * 26);
        c.lineTo(170, 44 + i * 26);
        c.stroke();
        const done = i < 4 || (chk && (n.written ?? 0) * 3 > i - 4);
        if (done) text(c, ['검정 라이닝', '검정 셰이딩', '빨강', '파랑', '노랑', '초록', '보라'][i], 14, 34 + i * 26, 12, '#334');
      }
    }));
    hinge.rotation.y = -1.7 * (load ? n.door ?? 0 : 0);
    pouches.visible = load && (n.inside ?? 0) > 0.5;
    at(pouch, load ? P.pouch ?? null : null);
    sealArm.rotation.x = load ? 0.3 * (1 - (n.press ?? 0)) : 0.3;
    setLit(sealLit, (n.press ?? 0) > 0.5 ? '#ff5a3c' : '#442222');
    const c0 = load ? n.cyc ?? 0 : 0;
    const running = load && (n.running ?? 0) > 0.5;
    panel.set(livePanel(`${q(c0, 10)}|${running}|${load}`, (c) => {
      c.fillStyle = running ? '#072b18' : '#10130f';
      c.fillRect(0, 0, 208, 56);
      text(c, running ? `134℃  ${Math.max(0, Math.round(18 * (1 - c0)))}분` : c0 > 0.99 ? '멸균 완료' : '대기', 10, 22, 20, running ? '#5ef09a' : '#8fd0a5');
      c.fillStyle = '#2b4a39';
      c.fillRect(10, 40, 188, 8);
      c.fillStyle = '#5ef09a';
      c.fillRect(10, 40, 188 * c0, 8);
    }));
    const showS = load && !!P.stripAt;
    strip.visible = showS;
    if (P.stripAt) strip.position.set(P.stripAt[0], P.stripAt[1], P.stripAt[2]);
    stripDone.visible = (n.strip ?? 0) > 0.5;
    stripNew.visible = !stripDone.visible;
  });
  out.work = marker(g, -0.1, T + 0.02, 0.05);
}

// =============================================================================================
// 상담 테이블 (ttConsultTable, 2 × 2).

function consultTable(g: THREE.Group, out: Built) {
  const T = CT.top;
  // A low table, two stools; beneath a rug; to the side a magazine stand of bound portfolios.
  part(g, rbox(1.8, 0.012, 1.8, 0.01), '#8d3f33', 0, 0.006, 0, { outline: false });
  part(g, rbox(1.16, 0.05, 0.86, 0.04), WOOD, 0, T - 0.025, 0);
  part(g, cyl(0.04, 0.05, T - 0.08, 14), WOOD_D, 0, (T - 0.05) / 2, 0);
  part(g, cyl(0.28, 0.3, 0.03, 20), WOOD_D, 0, 0.03, 0);
  stoolMesh(g, CT.seat[1], CT.seat[0], CT.seat[2], '#5a2f26');
  stoolMesh(g, CT.client[1], CT.client[0], CT.client[2], '#5a2f26');
  part(g, rbox(0.3, 0.6, 0.2, 0.012), WOOD_D, -0.78, 0.31, -0.2);
  for (let i = 0; i < 4; i++) part(g, box(0.04, 0.34, 0.18), ['#26272c', '#8d2f2f', '#2d4a5e', '#26272c'][i], -0.88 + i * 0.05, 0.74, -0.2);
  label(g, '작업 사진집', 0.22, 0.05, -0.78, 0.42, -0.095, WOOD_D, '#f0e4c8');
  // Paper cup of tea, a bowl of stickers, the price card on a stand, and a small pot of green.
  part(g, cyl(0.03, 0.024, 0.07, 12), '#f4efe1', -0.42, T + 0.035, -0.2);
  part(g, cyl(0.026, 0.026, 0.002, 12), '#a57a44', -0.42, T + 0.07, -0.2, { outline: false });
  part(g, cyl(0.03, 0.024, 0.07, 12), '#f4efe1', 0.1, T + 0.035, 0.3);
  part(g, cyl(0.026, 0.026, 0.002, 12), '#a57a44', 0.1, T + 0.07, 0.3, { outline: false });
  const card = picture(g, painted('ttConsultCard', 120, 160, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 120, 160);
    text(c, BRAND, 60, 18, 14, INK, 'center');
    ['상담 무료', '만 19세 이상', '신분증 지참', '당일 음주 후', '시술 불가'].forEach((s, i) => text(c, s, 60, 46 + i * 22, 12, '#44464e', 'center', false));
  }), 0.12, 0.16, 0.44, T + 0.09, -0.16, '#ffffff', 0.3);
  card.rotation.x = -0.15;
  part(g, cyl(0.05, 0.04, 0.06, 12), '#7a5a3a', -0.44, T + 0.03, 0.26);
  part(g, ball(0.06), '#43803a', -0.44, T + 0.1, 0.26);
  // The album on the table: its hard cover turned over, its pages the flash.
  const A = CT.album;
  part(g, rbox(0.54, 0.02, 0.38, 0.006), '#26272c', A[0], A[1] - 0.012, A[2]);
  const pageL = picture(g, flashTex(0), 0.25, 0.34, A[0] - 0.13, A[1] + 0.002, A[2], '#ffffff', 0, -Math.PI / 2);
  const pageR = picture(g, flashTex(1), 0.25, 0.34, A[0] + 0.13, A[1] + 0.002, A[2], '#ffffff', 0, -Math.PI / 2);
  const flip = group(g, A[0], A[1] + 0.006, A[2]);
  const flipPage = picture(flip, flashTex(2), 0.25, 0.34, 0.13, 0, 0, '#ffffff', 0, -Math.PI / 2);
  const shut = part(g, rbox(0.27, 0.03, 0.38, 0.006), '#26272c', A[0] + 0.13, A[1] + 0.016, A[2]);
  label(shut, BRAND, 0.2, 0.05, 0, 0.017, 0, '#26272c', '#ffe9b8').rotation.x = -Math.PI / 2;
  // The tablet with the design being drawn up.
  part(g, rbox(0.3, 0.012, 0.22, 0.01), BLACK, CT.tablet[0], T + 0.012, CT.tablet[2]);
  const tabPic = swapPic(g, 0.27, 0.19, CT.tablet[0], T + 0.02, CT.tablet[2], 0, -Math.PI / 2);
  const liveTab = live(256, 180);
  const stylus = penMesh(g, '#e0e0e0');
  const tape = part(g, cyl(0.005, 0.005, 1, 6), '#f4c84a', 0, 0, 0, { outline: false });
  const client = lazy(() => person(g, LOOKS.client2, CT.client[0], CT.client[2], 0, 'female', CT.client[1]));

  const spots: Record<string, Spot> = { ttPortfolioTalk: seatAt(g, 'ttAlbum', CT.seat) };
  spots['*'] = spots.ttPortfolioTalk;
  let seed = -1;
  const d3 = new THREE.Vector3();
  drive(g, out, spots, (now, N, t) => {
    if (seed < 0) seed = seedOf(g);
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const round = (N?.b.n ?? 0) + seed;
    const opened = N ? (n.open ?? 0) > 0.5 : false;
    shut.visible = !opened;
    pageL.visible = pageR.visible = opened;
    const pg = Math.floor(n.page ?? 0) + round;
    const flipOn = opened && (n.flip ?? 0) > 0.01 && (n.flip ?? 0) < 0.99;
    flip.visible = flipOn;
    flip.rotation.z = (n.flip ?? 0) * Math.PI;
    if (opened) {
      (pageL.material as THREE.MeshBasicMaterial).map = flashTex(pg);
      (pageR.material as THREE.MeshBasicMaterial).map = flashTex(pg + 1);
      if (flipOn) (flipPage.material as THREE.MeshBasicMaterial).map = flashTex(pg + 1);
    }
    tabPic.set(liveTab(`${N ? 1 : 0}|${q(n.drawn)}|${round}`, (c) => {
      c.fillStyle = N ? '#fbfaf3' : '#101014';
      c.fillRect(0, 0, 256, 180);
      if (!N) return;
      drawArt(c, designOf(round), 'line', 56, 10, 144, n.drawn ?? 0);
      drawArt(c, designOf(round), 'full', 56, 10, 144, Math.max(0, (n.drawn ?? 0) - 0.7) / 0.3);
    }));
    at(stylus, P.stylus ?? null);
    if (P.tapeA && P.tapeB) {
      tape.visible = true;
      const a = vec(P.tapeA);
      const b = vec(P.tapeB);
      d3.subVectors(b, a);
      tape.position.copy(a).addScaledVector(d3, 0.5);
      tape.scale.set(1, d3.length(), 1);
      tape.quaternion.setFromUnitVectors(UP, d3.normalize());
    } else tape.visible = false;
    if (now) {
      const f = client.get();
      f.root.visible = true;
      f.armL(null);
      f.armR((n.measure ?? 0) > 0.5 ? vec(add(CT.album, 0.1, 0.06, -0.3)) : null);
      f.head.rotation.x = 0.28 + ((n.nodClient ?? 0) > 0.5 ? 0.07 * Math.sin(t * 5) : 0);
    } else client.hide();
  });
  out.work = marker(g, A[0], A[1] + 0.02, A[2]);
}

// =============================================================================================
// 애프터케어 카운터 (ttAftercareCounter, 3 × 1): low, as it stands with its back to the room.

function aftercareCounter(g: THREE.Group, out: Built) {
  const T = AC.top;
  const Zb = -0.04;
  part(g, rbox(2.86, T - 0.05, 0.56, 0.012), '#20262b', 0, (T - 0.05) / 2, Zb);
  part(g, rbox(2.96, 0.05, 0.64, 0.012), WOOD, 0, T - 0.025, Zb);
  // The customers' face: the sign, slatted panels and a lit strip at the foot.
  for (let i = 0; i < 28; i++) part(g, box(0.05, T - 0.1, 0.012), '#2b3238', -1.35 + i * 0.1, (T - 0.05) / 2, Zb - 0.285, { outline: false });
  const backSign = painted('ttCareSign', 520, 80, (c) => {
    c.fillStyle = '#17181b';
    c.fillRect(0, 0, 520, 80);
    text(c, `${BRAND} · 시술 후 관리`, 260, 42, 36, '#ffe9b8', 'center');
  });
  picture(g, backSign, 1.3, 0.2, 0, T - 0.3, Zb - 0.3, '#ffffff', Math.PI);
  ownLit(g, box(2.7, 0.012, 0.012), '#ffd9a0', 0, 0.06, Zb - 0.3);
  // The artist's side: shelves of supplies.
  part(g, box(2.7, 0.02, 0.26), '#3a4047', 0, 0.4, 0.2);
  for (let i = 0; i < 16; i++) {
    const x = -1.2 + i * 0.16;
    part(g, cyl(0.03, 0.03, 0.08, 10), ['#f4efe1', '#d9efe9', '#f0d7c8'][i % 3], x, 0.45, 0.2);
    part(g, cyl(0.032, 0.032, 0.012, 10), '#2a2c33', x, 0.495, 0.2, { outline: false });
  }
  // On the top: a pyramid of aftercare creams (a made-up brand) with a tester, the film on its cutter box,
  // a stand with the steps, a stack of the leaflets, the card reader, a mirror to see the piece in.
  const brand = painted('ttCream', 64, 64, (c) => {
    c.fillStyle = '#f4efe1';
    c.fillRect(0, 0, 64, 64);
    text(c, '결고운', 32, 26, 14, '#2d4a32', 'center');
    text(c, '크림', 32, 46, 13, '#2d4a32', 'center', false);
  });
  const J = AC.jar;
  for (let row = 0; row < 3; row++)
    for (let i = 0; i < 3 - row; i++) {
      const x = J[0] + (i - (2 - row) / 2) * 0.09 + 0.12;
      part(g, cyl(0.04, 0.04, 0.05, 12), '#f4efe1', x, T + 0.025 + row * 0.052, J[2] - 0.08);
      part(g, cyl(0.042, 0.042, 0.012, 12), '#2d4a32', x, T + 0.05 + row * 0.052, J[2] - 0.08, { outline: false });
      picture(g, brand, 0.05, 0.04, x, T + 0.022 + row * 0.052, J[2] - 0.08 + 0.042);
    }
  const openJar = group(g, J[0] - 0.12, T, J[2]);
  part(openJar, cyl(0.04, 0.04, 0.04, 12), '#f4efe1', 0, 0.02, 0);
  part(openJar, cyl(0.034, 0.034, 0.002, 12), '#fffef8', 0, 0.041, 0, { outline: false });
  part(g, rbox(0.34, 0.07, 0.09, 0.006), '#3d6fa0', AC.roll[0], T + 0.035, AC.roll[2]);
  part(g, cyl(0.03, 0.03, 0.3, 12), '#dff0fa', AC.roll[0], T + 0.08, AC.roll[2], { rz: Math.PI / 2, outline: false });
  label(g, '보호 필름', 0.2, 0.04, AC.roll[0], T + 0.035, AC.roll[2] + 0.047, '#3d6fa0', '#ffffff');
  // The steps on a low stand, facing the client.
  const steps = painted('ttCareSteps', 280, 200, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 280, 200);
    text(c, '시술 후 관리 안내', 140, 22, 20, INK, 'center');
    ['① 필름은 다음 날 떼기', '② 미온수로 살살 씻기', '③ 크림은 얇게 하루 두 번', '④ 2주간 사우나·수영 금지', '⑤ 긁지 않기, 햇볕 피하기'].forEach((s, i) => text(c, s, 16, 56 + i * 28, 16, '#333'));
  });
  picture(g, steps, 0.32, 0.23, -0.96, T + 0.18, Zb - 0.12, '#ffffff', Math.PI - 0.15);
  rod(g, v3(-0.96, T, Zb - 0.08), v3(-0.96, T + 0.1, Zb - 0.1), 0.008, BLACK);
  part(g, box(0.14, 0.01, 0.1), BLACK, -0.96, T + 0.006, Zb - 0.08);
  for (let i = 0; i < 4; i++) part(g, box(0.14, 0.002, 0.2), PAPER, AC.card[0], T + 0.004 + i * 0.002, AC.card[2], { outline: false });
  part(g, rbox(0.1, 0.03, 0.15, 0.006), BLACK, AC.reader[0], T + 0.018, AC.reader[2]);
  const readerLit = swapPic(g, 0.07, 0.05, AC.reader[0], T + 0.036, AC.reader[2] - 0.03, 0, -Math.PI / 2);
  const liveReader = live(112, 80);
  // A small round mirror on a stem (kept low).
  rod(g, v3(1.22, T, Zb - 0.06), v3(1.22, T + 0.2, Zb - 0.08), 0.008, CHROME);
  part(g, cyl(0.11, 0.11, 0.01, 22), '#d6e7ef', 1.22, T + 0.28, Zb - 0.08, { rx: Math.PI / 2 - 0.1 });
  part(g, ring(0.11, 0.006), CHROME, 1.22, T + 0.28, Zb - 0.08, { rx: -0.1, outline: false });
  // What moves.
  const card = group(g);
  part(card, box(0.14, 0.003, 0.2), PAPER, 0, 0, 0, { outline: false });
  picture(card, painted('ttCareCard', 140, 200, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 140, 200);
    text(c, '관리 카드', 70, 18, 15, INK, 'center');
    ['필름 다음 날 제거', '미온수 세척', '크림 얇게', '2주 물놀이 금지', '문의 먹결 타투'].forEach((s, i) => text(c, s, 8, 48 + i * 28, 12, '#333', 'left', false));
  }), 0.13, 0.19, 0, 0.003, 0, '#ffffff', 0, -Math.PI / 2);
  const roll = group(g);
  part(roll, cyl(0.022, 0.022, 0.1, 10), '#dff0fa', 0, 0, 0, { rz: Math.PI / 2, outline: false });
  const wrapSleeve = skinSleeve(g, 0.052);
  wrapSleeve.lay(AC.hand, AC.elbow, 0.1, 0.92);
  const liveWrap = live(256, 128);
  const client = lazy(() => person(g, LOOKS.client1, AC.client[0], AC.client[2], 0, 'male'));
  const spots: Record<string, Spot> = { ttAftercareTalk: standAt(g, 'ttCare', AC.stand) };
  spots['*'] = spots.ttAftercareTalk;
  let seed = -1;
  drive(g, out, spots, (now, N, t) => {
    if (seed < 0) seed = seedOf(g);
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const round = (N?.b.n ?? 0) + seed;
    at(card, P.card ?? (N && (n.slid ?? 0) > 0.5 ? [AC.card[0] - 0.02, T + 0.012, AC.card[2] - 0.2] : null));
    at(roll, P.roll ?? null);
    if (now) {
      const tex = liveWrap(`${round}|${q(n.wrapped)}|${q(n.creamed, 4)}`, (c) => paintSkin(c, designOf(round), { line: 1, shade: 1, film: n.wrapped ?? 0 }));
      wrapSleeve.set(tex);
      wrapSleeve.mesh.visible = !!tex;
      const f = client.get();
      f.root.visible = true;
      f.armR(vec(AC.hand));
      f.armL((n.clientHand ?? 0) > 0.5 ? v3(AC.reader[0] - 0.3, T + 0.06, AC.reader[2] - 0.22) : (n.waved ?? 0) > 0.5 ? v3(AC.client[0] + 0.28, 1.5 + 0.05 * Math.sin(t * 6), AC.client[2] + 0.1) : null);
      f.head.rotation.x = 0.26 + ((n.nodClient ?? 0) > 0.5 ? 0.07 * Math.sin(t * 4) : 0);
    } else {
      wrapSleeve.mesh.visible = false;
      client.hide();
    }
    readerLit.set(liveReader(`${q(n.paid, 2)}|${now ? 1 : 0}`, (c) => {
      c.fillStyle = (n.paid ?? 0) > 0.5 ? '#0d3f27' : '#14202c';
      c.fillRect(0, 0, 112, 80);
      text(c, (n.paid ?? 0) > 0.5 ? '결제 완료' : now ? '카드를 넣어 주세요' : BRAND, 56, 40, 12, '#e8f8ee', 'center');
    }));
  });
  out.work = marker(g, -0.12, T + 0.02, 0.1);
}

// =============================================================================================
// 연습대 (ttPracticeBench, 2 × 1): low, with its back to the room too.

function practiceBench(g: THREE.Group, out: Built) {
  const T = PB.top;
  part(g, rbox(1.9, 0.05, 0.78, 0.012), '#6b6f76', 0, T - 0.025, 0);
  part(g, box(1.84, 0.004, 0.72), '#e7e4d8', 0, T + 0.002, 0, { outline: false });
  for (const [x, z] of [[-0.88, -0.32], [0.88, -0.32], [-0.88, 0.32], [0.88, 0.32]] as const) part(g, box(0.05, T - 0.05, 0.05), BLACK, x, (T - 0.05) / 2, z);
  part(g, box(1.76, 0.03, 0.62), '#4d5057', 0, 0.26, 0);
  for (let i = 0; i < 3; i++) part(g, rbox(0.3, 0.12, 0.3, 0.012), ['#c7ccd2', '#d8cdb2', '#b9c8c0'][i], -0.56 + i * 0.56, 0.34, 0);
  stoolMesh(g, PB.seat[1], PB.seat[0], PB.seat[2]);
  // The silicone forearm in its clamp, a hand at one end, the elbow's stump at the other.
  const A = PB.arm;
  const armY = A[1] - 0.05;
  part(g, rbox(0.2, 0.05, 0.14, 0.012), '#2a2c33', A[0], T + 0.03, A[2]);
  part(g, box(0.05, armY - T - 0.03, 0.06), '#2a2c33', A[0], (armY + T) / 2, A[2], { outline: false });
  part(g, cyl(0.05, 0.05, PB.armLen, 16), SKIN, A[0], armY, A[2], { rz: Math.PI / 2 });
  part(g, ball(0.05), SKIN, A[0] + PB.armLen / 2, armY, A[2]);
  part(g, cyl(0.046, 0.05, 0.02, 14), '#b58e6c', A[0] - PB.armLen / 2 - 0.01, armY, A[2], { rz: Math.PI / 2, outline: false });
  part(g, rbox(0.09, 0.03, 0.08, 0.016), SKIN, A[0] + PB.armLen / 2 + 0.07, armY - 0.004, A[2]);
  for (let i = 0; i < 4; i++) part(g, cyl(0.009, 0.008, 0.05, 6), SKIN, A[0] + PB.armLen / 2 + 0.135, armY - 0.004, A[2] - 0.03 + i * 0.02, { rz: Math.PI / 2, outline: false });
  const decal = swapPic(g, PB.armLen - 0.06, 0.08, A[0], A[1] + 0.004, A[2], 0, -Math.PI / 2);
  const liveDec = live(256, 96);
  // The plate of caps, a jar of green soap, paper towels; the sheets of practice skin with old lines.
  part(g, cyl(0.075, 0.07, 0.012, 18), STEEL, PB.plate[0], T + 0.008, PB.plate[2]);
  ['#15151a', '#d93a55', '#2d6fa3'].forEach((col, i) => part(g, cyl(0.012, 0.011, 0.012, 10), col, PB.plate[0] - 0.03 + i * 0.035, T + 0.02, PB.plate[2], { outline: false }));
  part(g, cyl(0.03, 0.034, 0.1, 12), '#71a860', 0.72, T + 0.05, -0.1);
  part(g, rbox(0.13, 0.03, 0.11, 0.006), '#f4f4ef', 0.72, T + 0.016, 0.16);
  const sheetTex = painted('ttPracticeSheet', 200, 200, (c) => {
    c.fillStyle = '#e3c8aa';
    c.fillRect(0, 0, 200, 200);
    c.strokeStyle = INK;
    c.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      c.beginPath();
      c.moveTo(16, 24 + i * 28);
      c.bezierCurveTo(60, 8 + i * 28, 140, 44 + i * 28, 186, 24 + i * 28);
      c.stroke();
    }
  });
  for (let i = 0; i < 2; i++) picture(g, sheetTex, 0.28, 0.28, -0.68 + i * 0.03, T + 0.006 + i * 0.003, -0.14 + i * 0.05, '#ffffff', 0, -Math.PI / 2);
  label(g, '연습용 인조 피부', 0.3, 0.05, -0.68, T + 0.024, 0.08, '#e7e4d8', '#333').rotation.x = -Math.PI / 2;
  const machine = machineMesh(g);
  const towel = towelMesh(g);
  const spots: Record<string, Spot> = { ttPracticeSkin: seatAt(g, 'ttPractice', PB.seat) };
  spots['*'] = spots.ttPracticeSkin;
  let seed = -1;
  drive(g, out, spots, (_now, N, t) => {
    if (seed < 0) seed = seedOf(g);
    const P = N?.props ?? {};
    const n = N?.n ?? {};
    const round = (N?.b.n ?? 0) + seed;
    at(machine.root, P.machine, PB.machine);
    const buzz = (n.buzz ?? 0) > 0.5;
    if (buzz) machine.root.position.y += 0.0008 * Math.sin(t * 120);
    setLit(machine.led, buzz ? '#3ee07a' : '#223322');
    at(towel, P.towel ?? null);
    const d = designOf(round);
    decal.set(liveDec(`${d.name}|${q(n.line)}|${q(n.shade)}|${N ? 1 : 0}`, (c) => {
      c.fillStyle = SKIN;
      c.fillRect(0, 0, 256, 96);
      if (!N) {
        drawArt(c, designOf(seed + 1), 'line', 86, 4, 88, 1);
        return;
      }
      drawArt(c, d, 'stencil', 86, 4, 88);
      drawArt(c, d, 'full', 86, 4, 88, n.shade ?? 0);
      drawArt(c, d, 'line', 86, 4, 88, n.line ?? 0);
    }));
  });
  out.work = marker(g, A[0], A[1] + 0.01, A[2]);
}

export const BUILDERS: Record<string, Builder> = {
  tattooChair(g, _W, _D, _c, _def, _ctx, out) {
    tattooChair(g, out);
  },
  flashWall(g, _W, _D, _c, _def, _ctx, out) {
    flashWall(g, out);
  },
  ttStencilTable(g, _W, _D, _c, _def, _ctx, out) {
    stencilTable(g, out);
  },
  ttInkShelf(g, _W, _D, _c, _def, _ctx, out) {
    inkShelf(g, out);
  },
  ttConsultTable(g, _W, _D, _c, _def, _ctx, out) {
    consultTable(g, out);
  },
  ttAftercareCounter(g, _W, _D, _c, _def, _ctx, out) {
    aftercareCounter(g, out);
  },
  ttPracticeBench(g, _W, _D, _c, _def, _ctx, out) {
    practiceBench(g, out);
  },
  // The street front, its blinds down over the booths, and the unit next door (2026-11-05, the layout audit; shopFront.ts).
  ttShopFront(g) {
    shopFront(g, { ax: 1, x0: 2, x1: 17, door: 12, name: '흑묘 타투', sub: 'TATTOO · BY APPOINTMENT', bg: '#20262b', fg: '#e0e0e0', frame: '#111111', posters: [['예약제 운영', '#212121', '#ffffff', 4.5], ['위생 소독 완료', '#ffffff', '#20262b', 7.5], ['상담 환영', '#424242', '#ffcc80', 13.5]], solid: [[15, 16]] });
  },
  ttNeighbor(g, W, D) {
    neighbourShop(g, W, D, { name: '돌림판 레코드', color: '#37474f', wall: '#ddd6cc' });
  },
};
