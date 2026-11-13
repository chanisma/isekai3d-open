import * as THREE from 'three';
import { buildFigure, poseFigure, type Expr, type Figure, type FigureLook, type Pose } from './figure';

/**
 * The 3D dwellers on the 2D lot (docs/ref-game/13-dweller3d.md): each dweller rendered every frame, from the front
 * and 30° above with an orthographic camera like the lot's view, given a thin dark outline and
 * drawn with their feet (or, lying down, their head) at the spot. One small offscreen renderer
 * serves every dweller; each dweller's figure is rebuilt only when their look changes.
 */
export type Facing = 'down' | 'up' | 'left' | 'right';
const YAW: Record<Facing, number> = { down: 0, left: -Math.PI / 2, right: Math.PI / 2, up: Math.PI };
const RES = 3;
/** The frame, in lot pixels: big enough for a dweller lying any way round. */
const FRAME = 96;
const SIZE = FRAME * RES;
const TILT = (30 * Math.PI) / 180;
/** Lot pixels per model unit: a grown-up (about one unit tall) stands as tall as the drawn figure. */
const PX = 37 / 0.99;
/** The young drawn a little smaller still (ours, as the drawn figure scales them). */
const STAGE_SCALE = { toddler: 0.8, child: 0.9, teen: 0.97, adult: 1, elder: 1 } as const;

let renderer: THREE.WebGLRenderer | null = null;
let failed = false;
const scene = new THREE.Scene();
const holder = new THREE.Group();
scene.add(holder);
const sun = new THREE.DirectionalLight('#ffffff', 2.0);
sun.position.set(-1, 3, 2);
scene.add(sun, new THREE.HemisphereLight('#ffffff', '#b8a58f', 1.4));

const ink = typeof document !== 'undefined' ? document.createElement('canvas') : null;
const framed = typeof document !== 'undefined' ? document.createElement('canvas') : null;

function setup() {
  if (renderer || failed) return renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(SIZE, SIZE, false);
    renderer.setClearColor(0x000000, 0);
    ink!.width = ink!.height = framed!.width = framed!.height = SIZE;
  } catch {
    failed = true;
  }
  return renderer;
}

const figures = new Map<number, { key: string; fig: Figure }>();

function figureFor(id: number, look: FigureLook) {
  const key = JSON.stringify(look);
  const have = figures.get(id);
  if (have?.key === key) return have.fig;
  have?.fig.dispose();
  const fig = buildFigure(look);
  figures.set(id, { key, fig });
  return fig;
}

/** Forgets figures of dwellers no longer drawn. */
export function keepOnly(ids: Set<number>) {
  for (const [id, f] of figures) if (!ids.has(id)) (f.fig.dispose(), figures.delete(id));
}

/**
 * Draws dweller `id` in 3D and returns true, or false where WebGL can't be had (the drawn figure then
 * stands in). Standing, walking and sitting put the feet at (x, y); lying puts the head there,
 * the body running `angle` from straight down the screen (as the drawn figure's).
 */
export function drawDweller3D(g: CanvasRenderingContext2D, id: number, look: FigureLook, x: number, y: number, facing: Facing, pose: Pose, phase: number, expr: Expr, angle = 0): boolean {
  const r = setup();
  if (!r) return false;
  const fig = figureFor(id, look);
  poseFigure(fig, pose, phase, expr, look.stage);
  const lying = pose === 'lie';
  // Lying: on the back, head at the origin, feet towards the viewer before turning.
  fig.root.rotation.set(lying ? -Math.PI / 2 : 0, 0, 0);
  fig.root.position.set(0, lying ? 0.1 : 0, lying ? fig.headY : 0);
  const k = (PX * STAGE_SCALE[look.stage] * RES) / Math.cos(TILT);
  const ax = SIZE / 2;
  const ay = lying ? SIZE / 2 : SIZE - 8 * RES;
  const cam = new THREE.OrthographicCamera(-ax / k, (SIZE - ax) / k, ay / k, -(SIZE - ay) / k, 0.01, 100);
  cam.position.set(0, Math.sin(TILT) * 10, Math.cos(TILT) * 10);
  cam.lookAt(0, 0, 0);
  holder.add(fig.root);
  holder.rotation.y = lying ? -angle : YAW[facing];
  r.render(scene, cam);
  holder.remove(fig.root);
  // A thin dark outline, so a small dweller stands out from the floor.
  const ig = ink!.getContext('2d')!;
  const fg = framed!.getContext('2d')!;
  ig.globalCompositeOperation = 'copy';
  ig.drawImage(r.domElement, 0, 0);
  ig.globalCompositeOperation = 'source-in';
  ig.fillStyle = 'rgba(45, 32, 40, 0.85)';
  ig.fillRect(0, 0, SIZE, SIZE);
  fg.clearRect(0, 0, SIZE, SIZE);
  const d = RES * 0.55;
  for (const [dx, dy] of [[-d, 0], [d, 0], [0, -d], [0, d]]) fg.drawImage(ink!, dx, dy);
  fg.drawImage(r.domElement, 0, 0);
  g.drawImage(framed!, x - ax / RES, y - ay / RES, FRAME, FRAME);
  return true;
}
