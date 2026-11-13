import * as THREE from 'three';
import { makeBaby, type Baby } from './babyModel';
import { getDef } from '../game/catalog';
import { FLOOR_BY_ID, WALL_BY_ID } from '../game/decor';
import { plumbobColor } from '../game/emotions';
import type { Game } from '../game/game';
import { roomLights, useRooms } from '../game/gfx/house';
import { objectLight } from '../game/gfx/furniture';
import { figureLook } from '../game/looks';
import { colleagueTag } from '../game/workRoles';
import { activeObjects, bubbleIcon, changedInto, moodBubble, expressionOf, nightLevel, placementOrigin, poseOf, roomUnder, dwellerDrawPos, type RenderUi } from '../game/render';
import type { Dir, P, PlacedObject, Dweller } from '../game/types';
import { edgeKey, edgeTiles, lineEdges, type Side } from '../game/walls';
import { workWear } from '../game/workClothes';
import { inCleanSuit } from '../game/cleanroom';
import { MAP_H, MAP_W, accessOf, accessTiles, dims, footprintTiles, objectCenter, stairwell } from '../game/world';
import { doing, motionOf, spotPose, type Doing, type PropKind } from './activity';
import { LoadingAvatar, ShapeAvatar, VrmAvatar, type Avatar, type BodyPose } from './avatar';
import { BASSINET_BED, SEAT_Y, WALL_HUNG, buildFurniture, kindOf, type Built } from './furniture3d';
import type { Spot } from './parts';
import { instrumentModel } from './furnitureDetail';
import { FLOOR_H, LOW_H, WALL_H, WALL_T, buildHouse, cutaway, type House3D } from './house3d';
import { ball, box, canvasTexture, cyl, iconTexture, part, textured, toon } from './toon';
import { models, npcRole, type ModelInfo } from './vrm';
import { inTurn } from './loadQueue';
import { loadDressed } from './vrmDress';
import { setFigureRenderer } from './workplaces/vroidFigure';
import { castOf } from './vrmLooks';
import { seatBeside, seatKey, waitSeatKind, type WaitSeat } from './waitSeats';
import { sceneClock } from './sceneClock';

/**
 * The lot in 3D (docs/3d/01-view.md): the same game drawn with three.js instead of the 2D canvas.
 * Everything is rebuilt from the game's state as it changes (the house when its tiles, paint or
 * windows do, a piece of furniture when it moves); dwellers are posed every frame. The camera is
 * 참고 게임's free camera: a perspective view orbiting a point on the floor shown, turned and tilted to
 * any angle, zoomed from a dweller's face out to the whole street, panned, with the walls in front of
 * it cut away.
 */
export type WallMode = 'up' | 'cut' | 'down';
export type BodyStyle = 'vroid' | 'shape';

export interface PickHit {
  /** Where on the floor shown, in tiles (the lot's stacked rows). */
  f: P;
  t: P;
  dwellerId?: number;
  uid?: number;
  /** The wall under the pointer, if one stands in front of the floor there (walls.ts key), and where on it, in tiles. */
  edge?: string;
  wallF?: P;
}

const ROT: Record<Dir, number> = { down: 0, left: Math.PI / 2, up: Math.PI, right: -Math.PI / 2 };
const YAW: Record<Dir, number> = { down: 0, right: Math.PI / 2, left: -Math.PI / 2, up: Math.PI };
const FRONT: Record<Dir, [number, number]> = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
/** The side of its tiles an object's back is to. */
const BACK: Record<Dir, Side> = { down: 'n', up: 's', left: 'e', right: 'w' };
/** The camera's starting angles and its limits (radians, metres from the point it looks at). */
const HOME = { yaw: Math.PI / 4, pitch: (40 * Math.PI) / 180, dist: 24 };
const PITCH = [(8 * Math.PI) / 180, (88 * Math.PI) / 180];
const DIST = [1.6, 75];
const FOV = 38;
const LIGHTS = 8;
const QUADS = 1500;
const MARKS = 200;
const BODY_KEY = 'isekai3d.body';
const LYING = new Set(['sleep', 'nap', 'toddlerNap']);
/** What's used sat at it on its own seat (a desk's chair, a piano's bench). */
const SAT_AT = new Set(['computer', 'desk', 'piano', 'booth', 'simulator']);
/**
 * Whether someone's been seeing to a client at a piece's `social:` place in the last moments (it's
 * not in use then, but its tools are out): it keeps moving them, and puts them away after.
 */
const socialPosed = (b: Built, t: number) => !!b.spots && Object.entries(b.spots).some(([k, sp]) => k.startsWith('social:') && t - ((sp.at.userData.posedAt as number | undefined) ?? -1e9) < 2);
// Shared by every puddle and flame (they're made afresh each frame).
const PUDDLE = new THREE.MeshBasicMaterial({ color: '#7cc0ef', transparent: true, opacity: 0.6 });
const FLAME_GEOM = new THREE.ConeGeometry(0.14, 0.5, 8);
const FLAMES = ['#ff7020', '#ffd740'].map((color) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }));

export function bodyStyle(): BodyStyle {
  try {
    return localStorage.getItem(BODY_KEY) === 'shape' ? 'shape' : 'vroid';
  } catch {
    return 'vroid';
  }
}
export function setBodyStyle(s: BodyStyle) {
  try {
    localStorage.setItem(BODY_KEY, s);
  } catch {
    /* a per-viewer convenience only */
  }
}

/** The height of a dweller's feet above their floor while on a flight of stairs (0 elsewhere). */
export function stairHeight(game: Game, x: number, y: number): number {
  const tx = Math.round(x);
  const ty = Math.round(y);
  for (const o of game.state.objects) {
    if (o.defId !== 'stairs') continue;
    const def = getDef(o.defId);
    if (!footprintTiles(def, o.x, o.y, o.dir).some((p) => p.x === tx && p.y === ty)) continue;
    const { w, h } = dims(def, o.dir);
    const cx = x + 0.5;
    const cy = y + 0.5;
    const u = o.dir === 'down' ? (o.y + h - cy) / (h - 0.5) : o.dir === 'up' ? (cy - o.y) / (h - 0.5) : o.dir === 'left' ? (cx - o.x) / (w - 0.5) : (o.x + w - cx) / (w - 0.5);
    return THREE.MathUtils.clamp(u, 0, 1) * FLOOR_H;
  }
  return 0;
}

/** World point for a spot in tiles (stacked rows), at its floor's height plus `up`. */
function world(x: number, y: number, up = 0): THREE.Vector3 {
  const level = Math.floor(y / MAP_H);
  return new THREE.Vector3(x, level * FLOOR_H + up, y - level * MAP_H);
}

/** Where a piece of furniture stands: the middle of what's drawn on the floor, its axes (x across, z out of its front) and its floor. */
interface Placing {
  centre: THREE.Vector3;
  x: THREE.Vector3;
  z: THREE.Vector3;
  floor: number;
}

interface Piece {
  key: string;
  built: Built;
  at: Placing;
  /** The wall it hangs on (walls.ts key), if any (hidden with the wall cut away). */
  wall?: string;
  level: number;
}

interface Body {
  key: string;
  avatar: Avatar | null;
  loading?: string;
  /** A character file that wouldn't load: shown as the shape figure, not tried again every frame. */
  failed?: string;
  last: THREE.Vector3;
  yaw: number;
  /** The name at their feet and what they're doing over their head. */
  label: HTMLDivElement;
  bubble: HTMLDivElement;
  /** What they hold (a book, a plate, a mug), made when first needed. */
  props: Partial<Record<PropKind, THREE.Object3D>>;
}

/** Props in hand: a book open to read, a plate of food, a mug. */
function makeProp(kind: PropKind, color?: string): THREE.Object3D {
  const g = new THREE.Group();
  const inner = new THREE.Group();
  g.add(inner);
  if (kind === 'book') {
    // Open towards the reader, tipped up.
    inner.rotation.x = -0.85;
    part(inner, box(0.3, 0.015, 0.21), '#c0504d', 0, 0, 0);
    part(inner, box(0.135, 0.02, 0.19), '#fbf6e8', -0.07, 0.012, 0, { rz: 0.06, outline: false });
    part(inner, box(0.135, 0.02, 0.19), '#fbf6e8', 0.07, 0.012, 0, { rz: -0.06, outline: false });
  } else if (kind === 'plate') {
    part(inner, cyl(0.12, 0.1, 0.02, 18), '#fafafa', 0, 0.01, 0);
    const food = part(inner, ball(0.065), '#e0893a', 0.01, 0.035, 0, { outline: false });
    food.scale.y = 0.45;
    part(inner, ball(0.03), '#7cb342', -0.05, 0.035, 0.03, { outline: false });
  } else if (kind === 'guitar' || kind === 'violin') {
    inner.add(instrumentModel(color ?? '#a1887f', kind === 'violin'));
  } else {
    part(inner, cyl(0.04, 0.035, 0.09, 14), '#f5f5f5', 0, 0.045, 0);
    part(inner, cyl(0.034, 0.034, 0.005, 14), '#6d4c41', 0, 0.088, 0, { outline: false });
  }
  return g;
}

export class LotView {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 400);
  /** Where the camera looks (on the floor shown), how it's turned and tilted, and how far back it is. */
  readonly target = new THREE.Vector3(MAP_W / 2, 0, MAP_H / 2);
  yaw = HOME.yaw;
  pitch = HOME.pitch;
  dist = HOME.dist;
  walls: WallMode = 'cut';
  body: BodyStyle = bodyStyle();

  /** What the camera is easing towards (moves, turns and zooms glide there). */
  private goal = { target: this.target.clone(), yaw: HOME.yaw, pitch: HOME.pitch, dist: HOME.dist };
  private sun = new THREE.DirectionalLight('#fff3dc', 2.4);
  private hemi = new THREE.HemisphereLight('#d6ecff', '#8cbf6a', 1.1);
  private points: THREE.PointLight[] = [];
  private house: House3D | null = null;
  private houseKey = '';
  private houseVersion = 0;
  private pieces = new Map<number, Piece>();
  private bodies = new Map<number, Body>();
  private game: Game | null = null;
  private labels: HTMLDivElement;
  private roomLabel: HTMLDivElement;
  private quads: THREE.InstancedMesh;
  private quadCount = 0;
  /** See-through walls marking what a build tool would do to them (put up, door, window, take down). */
  private marks: THREE.InstancedMesh;
  private markCount = 0;
  private extras = new THREE.Group();
  private ghost: { key: string; obj: THREE.Object3D } | null = null;
  private plumbob: THREE.Mesh;
  private babies = new Map<number, THREE.Object3D>();
  private babyLooks = new Map<number, Baby>();
  private cut = new Set<string>();
  private cutKey = '';
  private roster: ModelInfo[] = [];
  /** The list of characters has come (until then everyone waits as a gold glow, not a shape figure). */
  private rosterReady = false;
  /** How many characters are on their way, told when it changes (the lot's loading line). */
  onLoading?: (count: number) => void;
  private loadingCount = 0;
  private clock = 0;
  /** Real time, for what goes on in a pause (the marks under the pointer). */
  private overlayClock = 0;
  /** This frame's step, seconds. */
  private dt = 0;
  private ray = new THREE.Raycaster();
  private sky: THREE.Color;

  constructor(readonly host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    setFigureRenderer(this.renderer);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.className = 'lot3d';
    host.prepend(this.renderer.domElement);
    this.labels = document.createElement('div');
    this.labels.className = 'lot3d-labels';
    host.append(this.labels);
    this.roomLabel = document.createElement('div');
    this.roomLabel.className = 'lot3d-room';
    this.labels.append(this.roomLabel);

    this.sky = new THREE.Color('#bfe0f4');
    this.scene.background = this.sky;
    this.scene.fog = new THREE.Fog('#d9edf6', 60, 160);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 90 });
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun, this.sun.target, this.hemi);
    for (let i = 0; i < LIGHTS; i++) {
      const l = new THREE.PointLight('#ffd9a0', 0, 7, 1.4);
      this.points.push(l);
      this.scene.add(l);
    }
    this.scene.add(this.surroundings());
    this.quads = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.45, depthWrite: false }), QUADS);
    this.quads.frustumCulled = false;
    this.quads.renderOrder = 5;
    this.marks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.55, depthWrite: false }), MARKS);
    this.marks.frustumCulled = false;
    this.marks.renderOrder = 6;
    this.scene.add(this.quads, this.marks, this.extras);
    this.plumbob = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), new THREE.MeshToonMaterial({ color: '#3fd16a', emissive: '#1b5e20', emissiveIntensity: 0.4 }));
    this.plumbob.scale.set(1, 1.9, 1);
    this.scene.add(this.plumbob);
    void models().then((m) => {
      this.roster = m;
      this.rosterReady = true;
    });
    this.resize();
  }

  /** The lawn beyond the lot, a road along its front and trees round about. */
  /** The trees round the lot, hidden where the lot's edge is water. */
  private sceneryTrees: THREE.Group[] = [];
  private surroundings(): THREE.Object3D {
    const g = new THREE.Group();
    const grass = canvasTexture(256, 256, (c) => {
      c.fillStyle = '#7fbf55';
      c.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 40; i++) {
        c.fillStyle = i % 2 ? 'rgba(120,190,85,0.5)' : 'rgba(150,212,110,0.5)';
        c.beginPath();
        c.ellipse((i * 97) % 256, (i * 57) % 256, 14 + (i % 5) * 4, 7 + (i % 3) * 3, i, 0, Math.PI * 2);
        c.fill();
      }
    }, 30);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), textured(grass));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(MAP_W / 2, -0.03, MAP_H / 2);
    ground.receiveShadow = true;
    g.add(ground);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(120, 3.2), toon('#6b6f75'));
    road.rotation.x = -Math.PI / 2;
    road.position.set(MAP_W / 2, -0.015, MAP_H + 2.6);
    road.receiveShadow = true;
    g.add(road);
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(120, 0.9), toon('#cfc9bd'));
    walk.rotation.x = -Math.PI / 2;
    walk.position.set(MAP_W / 2, -0.012, MAP_H + 0.55);
    walk.receiveShadow = true;
    g.add(walk);
    for (let i = -6; i < 7; i++) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.12), toon('#f5f1e6'));
      line.rotation.x = -Math.PI / 2;
      line.position.set(MAP_W / 2 + i * 4, -0.01, MAP_H + 2.6);
      g.add(line);
    }
    // Trees round the lot, the same each time.
    const spots: Array<[number, number, number]> = [[-3, 2, 1.1], [-2.5, 9, 0.9], [-3.5, 15, 1.2], [MAP_W + 2.5, 3, 1], [MAP_W + 3, 10, 1.15], [MAP_W + 2.2, 16, 0.9], [4, -3, 1], [12, -3.5, 1.2], [20, -2.8, 0.95], [-4, -4, 1], [MAP_W + 4, -3, 1.1]];
    for (const [x, z, s] of spots) {
      const t = new THREE.Group();
      t.position.set(x, 0, z);
      t.scale.setScalar(s);
      part(t, cyl(0.12, 0.16, 1.8, 10), '#8a5a36', 0, 0.9, 0);
      part(t, ball(0.9), '#6fb85a', 0, 2.4, 0);
      part(t, ball(0.65), '#7dc566', 0.45, 2.8, 0.25);
      part(t, ball(0.6), '#5ea64e', -0.4, 2.7, -0.2);
      g.add(t);
      this.sceneryTrees.push(t);
    }
    return g;
  }

  resize() {
    const w = Math.max(1, this.host.clientWidth);
    const h = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.placeCamera();
  }

  private placeCamera() {
    const w = Math.max(1, this.host.clientWidth);
    const h = Math.max(1, this.host.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    // Close in, it looks at a dweller's height above the floor rather than at their feet.
    const look = this.target.clone().setY(this.target.y + 1.0 * THREE.MathUtils.clamp(1 - (this.dist - 2) / 12, 0, 1));
    const c = Math.cos(this.pitch);
    this.camera.position.set(look.x + Math.sin(this.yaw) * c * this.dist, look.y + Math.sin(this.pitch) * this.dist, look.z + Math.cos(this.yaw) * c * this.dist);
    this.camera.lookAt(look);
    const fog = this.scene.fog as THREE.Fog;
    fog.near = this.dist + 40;
    fog.far = this.dist + 140;
  }

  /** Eases the camera towards its goal. */
  private glide(dt: number) {
    const g = this.goal;
    const dyaw = Math.atan2(Math.sin(g.yaw - this.yaw), Math.cos(g.yaw - this.yaw));
    const moving = Math.abs(dyaw) > 1e-4 || Math.abs(g.pitch - this.pitch) > 1e-4 || Math.abs(g.dist - this.dist) > 1e-3 || g.target.distanceToSquared(this.target) > 1e-6;
    if (!moving) return;
    const k = 1 - Math.exp(-12 * dt);
    this.yaw += dyaw * k;
    this.pitch += (g.pitch - this.pitch) * k;
    this.dist += (g.dist - this.dist) * k;
    this.target.lerp(g.target, k);
    this.placeCamera();
  }

  /** Turns the view by eighths of a turn (Q/E), or by an angle in radians. */
  rotate(step: number, radians = false) {
    this.goal.yaw += radians ? step : (step * Math.PI) / 4;
  }
  /** Tilts the view (radians; up looks more from above). */
  tilt(by: number) {
    this.goal.pitch = THREE.MathUtils.clamp(this.goal.pitch + by, PITCH[0], PITCH[1]);
  }
  /** Turns and tilts by a drag of the mouse, in pixels: straight away, without the glide's lag. */
  orbit(dx: number, dy: number) {
    this.rotate(-dx * 0.008, true);
    this.tilt(dy * 0.006);
    this.yaw = this.goal.yaw;
    this.pitch = this.goal.pitch;
    this.placeCamera();
  }
  /**
   * Zooms by a factor (below 1 closer), towards the point under the cursor when one is given, so
   * whatever the player points at stays under the pointer.
   */
  zoomBy(k: number, clientX?: number, clientY?: number) {
    const before = this.goal.dist;
    this.goal.dist = THREE.MathUtils.clamp(before * k, DIST[0], DIST[1]);
    if (clientX === undefined || clientY === undefined) return;
    const p = this.groundAt(clientX, clientY);
    if (!p) return;
    this.goal.target.addScaledVector(p.sub(this.goal.target).setY(0), 1 - this.goal.dist / before);
    this.clampTarget();
  }
  /** Moves the view by screen pixels (dragging: the ground follows the pointer) or by steps along the screen (keys). */
  pan(dx: number, dy: number, pixels = true) {
    const k = pixels ? (2 * this.dist * Math.tan(THREE.MathUtils.degToRad(FOV / 2))) / Math.max(1, this.host.clientHeight) : Math.max(1, this.dist / 12);
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    // Up the screen is further along the ground the flatter the view.
    const along = pixels ? 1 / Math.max(0.35, Math.sin(this.pitch)) : 1;
    this.goal.target.addScaledVector(right, -dx * k).addScaledVector(fwd, dy * k * along);
    this.clampTarget();
    if (pixels) {
      this.target.x = this.goal.target.x;
      this.target.z = this.goal.target.z;
      this.placeCamera();
    }
  }
  /** Back to the starting view over the middle of the lot. */
  home() {
    Object.assign(this.goal, { yaw: this.yaw + Math.atan2(Math.sin(HOME.yaw - this.yaw), Math.cos(HOME.yaw - this.yaw)), pitch: HOME.pitch, dist: HOME.dist });
    this.goal.target.set(MAP_W / 2, this.goal.target.y, MAP_H / 2);
  }
  /** Comes in close on a spot (world metres) from a turn and a tilt (radians), `dist` metres back. */
  focusOn(x: number, z: number, dist: number, yaw: number, pitch = 0.45) {
    this.goal.target.x = x;
    this.goal.target.z = z;
    this.goal.dist = THREE.MathUtils.clamp(dist, DIST[0], DIST[1]);
    this.goal.yaw = this.yaw + Math.atan2(Math.sin(yaw - this.yaw), Math.cos(yaw - this.yaw));
    this.goal.pitch = THREE.MathUtils.clamp(pitch, PITCH[0], PITCH[1]);
    this.clampTarget();
  }
  /** Looks at a spot (world metres), keeping the angle and zoom. */
  lookAt(x: number, z: number) {
    this.goal.target.x = x;
    this.goal.target.z = z;
    this.clampTarget();
  }
  private clampTarget() {
    const t = this.goal.target;
    t.x = THREE.MathUtils.clamp(t.x, -12, MAP_W + 12);
    t.z = THREE.MathUtils.clamp(t.z, -12, MAP_H + 12);
  }
  /** The point on the floor shown under a point of the view. */
  private groundAt(clientX: number, clientY: number): THREE.Vector3 | null {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.ray.setFromCamera(new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1), this.camera);
    return this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -this.goal.target.y), new THREE.Vector3());
  }

  /** What's under a point of the view: a dweller, a piece of furniture, and the tile on the floor shown. */
  pick(clientX: number, clientY: number, level: number): PickHit | null {
    const r = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camera);
    let dwellerId: number | undefined;
    let best = 0.4 * 0.4;
    for (const [id, b] of this.bodies) {
      if (!b.avatar || !b.avatar.root.visible || !b.avatar.root.parent) continue;
      const foot = b.last;
      const top = foot.clone().setY(foot.y + 1.5);
      const d = this.ray.ray.distanceSqToSegment(foot, top);
      if (d < best) {
        best = d;
        dwellerId = id;
      }
    }
    let uid: number | undefined;
    const shown = [...this.pieces.values()].filter((p) => p.built.root.visible).map((p) => p.built.root);
    const hit = this.ray.intersectObjects(shown, true).find((h) => !(h.object.userData.ink as boolean | undefined));
    if (hit) {
      let o: THREE.Object3D | null = hit.object;
      while (o && o.userData.uid === undefined) o = o.parent;
      uid = o?.userData.uid as number | undefined;
    }
    const plane = this.house?.pickPlanes[level];
    if (!plane) return null;
    const floorHit = this.ray.intersectObject(plane)[0];
    // A wall of the floor shown between the eye and the floor: the build tools take that wall.
    let edge: string | undefined;
    let wallF: P | undefined;
    const standing = [...this.house!.walls.values()].filter((w) => w.level === level).map((w) => (w.full.visible ? w.full : w.low));
    const wallHit = this.ray.intersectObjects(standing, true)[0];
    if (wallHit && (!floorHit || wallHit.distance < floorHit.distance)) {
      let o: THREE.Object3D | null = wallHit.object;
      while (o && o.userData.edge === undefined) o = o.parent;
      edge = o?.userData.edge as string | undefined;
      wallF = { x: wallHit.point.x, y: wallHit.point.z + level * MAP_H };
    }
    const p = floorHit?.point;
    if (!p) return dwellerId !== undefined || uid !== undefined || edge ? { f: wallF ?? { x: 0, y: 0 }, t: { x: 0, y: 0 }, dwellerId, uid, edge, wallF } : null;
    const f = { x: p.x, y: p.z + level * MAP_H };
    return { f, t: { x: Math.floor(f.x), y: Math.floor(f.y) }, dwellerId, uid, edge, wallF };
  }

  /** Where a world point is on the screen, in pixels from the view's corner. */
  private project(v: THREE.Vector3): { x: number; y: number } {
    const p = v.clone().project(this.camera);
    return { x: ((p.x + 1) / 2) * this.host.clientWidth, y: ((1 - p.y) / 2) * this.host.clientHeight };
  }

  private reset() {
    for (const p of this.pieces.values()) p.built.root.removeFromParent();
    this.pieces.clear();
    for (const b of this.bodies.values()) {
      b.avatar?.dispose();
      b.label.remove();
      b.bubble.remove();
      for (const m of Object.values(b.props)) m?.removeFromParent();
    }
    this.bodies.clear();
    for (const b of this.babies.values()) b.removeFromParent();
    this.babies.clear();
    this.babyLooks.clear();
    if (this.house) {
      this.house.root.removeFromParent();
      this.house.dispose();
      this.house = null;
    }
    this.houseKey = '';
  }

  /** Copies what's on screen to a canvas, to hold up while another lot is built behind it. */
  still(to: HTMLCanvasElement) {
    const from = this.renderer.domElement;
    to.width = from.width;
    to.height = from.height;
    // Drawn again first: the screen's buffer is gone once the browser has shown it.
    this.renderer.render(this.scene, this.camera);
    to.getContext('2d')?.drawImage(from, 0, 0);
  }

  /** Draws a frame of the game. */
  frame(game: Game, ui: RenderUi, dt: number, paused = false) {
    // Paused, the scene's time stands still (2026-11-01: only the game's did, and whoever was at a
    // piece of furniture went on with it); the camera, and the pulsing marks, go on in real time.
    const realDt = dt;
    sceneClock.paused = paused;
    if (paused) dt = 0;
    this.clock += dt;
    sceneClock.now = this.clock;
    this.dt = dt;
    const t = this.clock;
    this.overlayClock += realDt;
    if (game !== this.game) {
      this.reset();
      this.game = game;
    }
    useRooms(game.tiles, game.walls);
    const level = Math.max(0, Math.min(game.levels - 1, ui.level ?? 0));
    // The camera looks at the floor shown (up a storey with the floor buttons).
    this.goal.target.y = level * FLOOR_H;
    this.glide(realDt);
    this.syncHouse(game, ui);
    this.syncCutaway(game, level);
    this.syncFurniture(game, ui, level, t);
    this.syncDwellers(game, level, dt, t);
    this.syncDoors(game, dt);
    this.syncLights(game, level);
    this.syncExtras(game, level, t);
    this.syncOverlay(game, ui, this.overlayClock);
    this.renderer.render(this.scene, this.camera);
  }

  private syncHouse(game: Game, ui: RenderUi) {
    const holes = stairwell(game.state.objects, game.tiles);
    // Repainting: the room under the pointer shows the new wallpaper or floor before it's paid for.
    const pv = ui.mode === 'buy' && ui.hover ? ui.placing?.paint : undefined;
    const room = pv && ui.hover ? roomUnder(game, ui.hover) : 'outside';
    const paint = pv && room !== 'outside' ? game.paintPreview(room, pv.part, pv.style) : game.paint;
    const key = `${game.levels}|${game.tiles.join('')}|${JSON.stringify(paint)}|${JSON.stringify(game.walls)}|${holes.join(',')}`;
    if (key === this.houseKey && this.house) return;
    if (this.house) {
      this.house.root.removeFromParent();
      this.house.dispose();
    }
    this.house = buildHouse(game.tiles, paint, game.walls, game.levels, holes);
    this.scene.add(this.house.root);
    // A tree round the lot stands only on land: by a lot whose edge there is water (the sea at the 해녀의 집, a harbour), it isn't there.
    for (const t of this.sceneryTrees) {
      const x = Math.min(MAP_W - 1, Math.max(0, Math.floor(t.position.x)));
      const z = Math.min(MAP_H - 1, Math.max(0, Math.floor(t.position.z)));
      t.visible = game.tiles[z * MAP_W + x] !== 'water';
    }
    this.houseKey = key;
    this.houseVersion++;
    this.cutKey = '';
  }

  private syncCutaway(game: Game, level: number) {
    const house = this.house!;
    // Which way the camera looks on each axis: walls are cut on an axis it looks along.
    const lx = -Math.sin(this.yaw);
    const lz = -Math.cos(this.yaw);
    const sx = Math.abs(lx) > 0.2 ? Math.sign(lx) : 0;
    const sz = Math.abs(lz) > 0.2 ? Math.sign(lz) : 0;
    const key = `${this.houseVersion}|${sx},${sz}|${this.walls}|${level}`;
    if (key !== this.cutKey) {
      this.cutKey = key;
      this.cut = this.walls === 'cut' ? cutaway(game.walls, game.tiles, level, sx, sz) : new Set();
      for (const [k, w] of house.walls) {
        const low = w.level === level && (this.walls === 'down' || this.cut.has(k));
        if (low) this.cut.add(k);
        w.full.visible = !low;
        w.low.visible = low;
      }
      house.levels.forEach((g, l) => (g.visible = l <= level));
    }
  }

  private syncFurniture(game: Game, ui: RenderUi, level: number, t: number) {
    const inUse = activeObjects(game);
    // What's been taken off the lot (a fire engine out on a call).
    const gone = new Set<number>();
    for (const s of game.state.dwellers) {
      const perf = game.performing(s);
      if (perf?.inter.offLot) gone.add(perf.obj.uid);
    }
    const night = nightLevel(game.state.time);
    const powered = !game.isCut('power');
    const seen = new Set<number>();
    // Who's under each bed's covers, and who's using what (doors open, pans out).
    const sleepers = new Map<number, Dweller[]>();
    for (const s of game.state.dwellers) {
      const perf = !s.away && game.performing(s);
      if (perf && LYING.has(perf.inter.id) && game.sleptIn(perf.obj)) sleepers.set(perf.obj.uid, [...(sleepers.get(perf.obj.uid) ?? []), s]);
    }
    for (const o of game.state.objects) {
      seen.add(o.uid);
      const def = getDef(o.defId);
      const wall = this.wallBehind(game, o);
      const at = this.placing(game, o);
      const key = `${o.defId}|${o.x}|${o.y}|${o.dir}|${wall ?? ''}|${at.centre.toArray().map((v) => v.toFixed(3))}|${this.houseVersion}`;
      let piece = this.pieces.get(o.uid);
      if (!piece || piece.key !== key) {
        piece?.built.root.removeFromParent();
        const built = buildFurniture(def, { againstWall: wall !== undefined });
        built.root.position.copy(at.centre);
        built.root.rotation.y = -ROT[o.dir];
        built.root.userData.uid = o.uid;
        built.root.updateMatrixWorld(true);
        this.scene.add(built.root);
        piece = { key, built, at, wall: WALL_HUNG.has(kindOf(def)) ? wall : undefined, level: Math.floor(o.y / MAP_H) };
        this.pieces.set(o.uid, piece);
      }
      const b = piece.built;
      b.root.visible = piece.level <= level && ui.placing?.movingUid !== o.uid && !(piece.wall !== undefined && this.cut.has(piece.wall));
      b.seenFrom?.(this.camera.position);
      if (b.screen) {
        const on = inUse.has(o.uid) && powered && !game.isBroken(o);
        (b.screen.material as THREE.MeshBasicMaterial).color.set(on ? (Math.sin(t * 3 + o.uid) > 0.6 ? '#d6f0ff' : '#a9d8ff') : '#2a3140');
      }
      if (b.glow) {
        const light = def.id === 'lamp' ? powered && night > 0.05 : inUse.has(o.uid);
        (b.glow.material as THREE.MeshBasicMaterial).color.set(light ? (def.id === 'lamp' ? '#fff3c4' : '#ff9a3c') : def.id === 'lamp' ? '#d8cfb5' : '#3a2a20');
        if (def.id !== 'lamp') b.glow.scale.y = light ? 1 + Math.sin(t * 9 + o.uid) * 0.15 : 0.3;
      }
      if (b.cover) b.cover.shape((sleepers.get(o.uid) ?? []).map((s) => this.sleeperOffset(game, s, o)));
      if (b.seated) {
        // Who's sat on it: anyone using it on it, and whoever's waiting there (a sofa's place by its tile).
        const xs: number[] = [];
        const ids: string[] = [];
        let lying = false;
        for (const s of game.state.dwellers) {
          const perf = !s.away && game.performing(s);
          if (perf && perf.obj.uid === o.uid && perf.inter.pose === 'on') {
            if (LYING.has(perf.inter.id)) lying = true;
            else {
              xs.push(this.sleeperOffset(game, s, o));
              ids.push(perf.inter.id);
            }
          }
        }
        for (const w of this.waiting.values()) if (w.obj.uid === o.uid) xs.push(w.kind === 'sofa' ? world(w.tile.x + 0.5, w.tile.y + 0.5).setY(piece.at.floor).sub(piece.at.centre).dot(piece.at.x) : 0);
        b.seated(xs, lying, t, ids);
      }
      for (const d of b.doors ?? []) {
        // Swung out the front, about its hinge: a left-hung door turns one way, a right-hung the other.
        const swing = d.userData.swing as number;
        const open = THREE.MathUtils.damp(Math.abs(d.rotation.y) / 1.9, inUse.has(o.uid) ? 1 : 0, 5, this.dt);
        d.rotation.y = swing * open * 1.9;
      }
      if (b.inUse) b.inUse.visible = inUse.has(o.uid);
      if (b.idle) b.idle.visible = !inUse.has(o.uid);
      if (b.animate && (inUse.has(o.uid) || socialPosed(b, t))) b.animate(t);
      b.passing?.(game.state.dwellers.filter((s) => !s.away).map((s) => ({ dx: s.x - o.x, dy: s.y - o.y })), t);
      b.away?.(gone.has(o.uid), t);
      if (b.growth && o.plant) b.growth.scale.setScalar(0.35 + 0.65 * Math.min(1, o.plant.growth));
      b.plant?.(o.plant, t);
      // Broken or dirty: a puff of smoke or a buzz above it (the 2D lot's sparks and stink lines).
      const mark = game.isBroken(o) ? '💨' : game.isDirty(o) ? '🪰' : '';
      let sprite = b.root.getObjectByName('mark') as THREE.Sprite | undefined;
      if (mark && !sprite) {
        sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTexture(mark), depthWrite: false }));
        sprite.name = 'mark';
        sprite.userData.ownMaterial = true;
        sprite.scale.setScalar(0.45);
        b.root.add(sprite);
      }
      if (sprite) {
        sprite.visible = !!mark;
        if (mark) {
          (sprite.material as THREE.SpriteMaterial).map = iconTexture(mark);
          sprite.position.set(0, 1.5 + Math.sin(t * 2 + o.uid) * 0.08, 0);
        }
      }
    }
    for (const [uid, p] of this.pieces)
      if (!seen.has(uid)) {
        p.built.root.removeFromParent();
        this.pieces.delete(uid);
      }
  }

  /**
   * Where an object is drawn: its footprint's middle, moved back against a wall that runs down the
   * middle of the wall tile behind it (so a bed's head, a counter's back, a picture touch it as in
   * 참고 게임), and a chair pulled in to the table in front of it.
   */
  private placing(game: Game, o: PlacedObject): Placing {
    const def = getDef(o.defId);
    const { w, h } = dims(def, o.dir);
    const level = Math.floor(o.y / MAP_H);
    const centre = new THREE.Vector3(o.x + w / 2, level * FLOOR_H, o.y - level * MAP_H + h / 2);
    const r = -ROT[o.dir];
    const x = new THREE.Vector3(Math.cos(r), 0, -Math.sin(r));
    const z = new THREE.Vector3(Math.sin(r), 0, Math.cos(r));
    const kind = kindOf(def);
    const [fx, fy] = FRONT[o.dir];
    // Backed onto a wall, it stands clear of the wall's half on its side of the line.
    const back = kind !== 'stairs' && this.wallBehind(game, o) !== undefined ? -WALL_T / 2 : 0;
    let pull = 0;
    if (kind === 'chair' && !/armchair|salon/i.test(def.id)) {
      const ahead = footprintTiles(def, o.x, o.y, o.dir).map((p) => ({ x: p.x + fx, y: p.y + fy }));
      const table = game.state.objects.some((t) => t.uid !== o.uid && kindOf(getDef(t.defId)) === 'table' && footprintTiles(getDef(t.defId), t.x, t.y, t.dir).some((p) => ahead.some((a) => a.x === p.x && a.y === p.y)));
      if (table) pull = 0.17;
    }
    centre.addScaledVector(z, pull - back);
    return { centre, x, z, floor: level * FLOOR_H };
  }

  /** How far across a bed (its x) a sleeper lies: their half of a double bed. */
  private sleeperOffset(game: Game, s: Dweller, o: PlacedObject): number {
    const def = getDef(o.defId);
    const at = this.pieces.get(o.uid)?.at ?? this.placing(game, o);
    if ((def.seats ?? 1) < 2) return 0;
    const seat = game.seatOf(s, o);
    const level = Math.floor(o.y / MAP_H);
    return new THREE.Vector3(seat.x, at.floor, seat.y - level * MAP_H).sub(at.centre).dot(at.x);
  }

  /** The wall right behind an object (its back to it), if there is one: its walls.ts key. */
  private wallBehind(game: Game, o: PlacedObject): string | undefined {
    const def = getDef(o.defId);
    const [fx, fy] = FRONT[o.dir];
    const side = BACK[o.dir];
    for (const p of footprintTiles(def, o.x, o.y, o.dir)) {
      // Only the footprint's back row: the tile behind it isn't the object's own.
      if (footprintTiles(def, o.x, o.y, o.dir).some((q) => q.x === p.x - fx && q.y === p.y - fy)) continue;
      const key = edgeKey(p.x, p.y, side);
      if (key && game.walls[key] && game.walls[key] !== 'door') return key;
    }
    return undefined;
  }

  /**
   * Where people who've come in wait (clients at a workplace): standing still at their spot with a
   * free seat beside it — a chair, a place on a sofa, a pupil's desk (waitSeats.ts) — they sit on
   * it, as 참고 게임's waiting customers do. One someone's using, or another waiter has, is passed over.
   */
  private waitingSeats(game: Game): Map<number, WaitSeat> {
    const out = new Map<number, WaitSeat>();
    const used = new Set(game.state.dwellers.map((s) => !s.away && game.performing(s)?.obj.uid).filter((u): u is number => !!u));
    // A set's guest places stay free while its host works at it (a talk show goes out with them on it).
    const free = game.state.objects.filter((o) => !used.has(o.uid) || waitSeatKind(o.defId) === 'set');
    const taken = new Set<string>();
    for (const s of game.state.dwellers) {
      const to = s.npc?.role === 'client' && !s.npc.leaving ? s.npc.to : undefined;
      if (!to || s.x !== to.x || s.y !== to.y || s.run?.phase === 'walking') continue;
      const seat = seatBeside(free, to, taken);
      if (!seat) continue;
      taken.add(seatKey(seat));
      out.set(s.id, seat);
    }
    return out;
  }
  private waiting = new Map<number, WaitSeat>();

  /** The place drawn on the seat a client waits in for a social done to them there (Built.spots `social:<id>`). */
  private socialSpot(s: Dweller): Spot | undefined {
    const a = s.queue[0];
    if (a?.kind !== 'social' || s.run?.phase !== 'performing') return undefined;
    const seat = this.waiting.get(a.targetId);
    return seat && this.pieces.get(seat.obj.uid)?.built.spots?.[`social:${a.socialId}`];
  }

  private bodyPose(game: Game, s: Dweller, b: Body, t: number): { pose: BodyPose; asleep: boolean; doing: Doing; waist?: boolean } {
    const a = s.queue[0];
    const floorY = Math.floor(Math.round(s.y) / MAP_H) * FLOOR_H;
    const tile = world(s.x + 0.5, s.y + 0.5, stairHeight(game, s.x, s.y));
    const at = this.besideSeat(game, s, tile) ?? tile;
    const height = b.avatar?.height ?? 1.6;
    if (a?.kind === 'passout') {
      const dir = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
      return { pose: { kind: 'lie', head: at.clone().addScaledVector(dir, 0.75).setY(floorY + 0.02), dir, floor: floorY }, asleep: true, doing: {} };
    }
    // On a flight of stairs: walking up (or down) it step by step, as far as the game says they've climbed.
    const next = s.run?.path[0];
    if (s.run?.phase === 'walking' && s.run.climb !== undefined && next) {
      const st = game.stairsBetween(s, next);
      const f = st && (this.pieces.get(st.uid)?.at ?? this.placing(game, st));
      if (st && f) {
        const len = getDef(st.defId).h;
        const up = Math.floor(Math.round(s.y) / MAP_H) === Math.floor(st.y / MAP_H);
        const k = THREE.MathUtils.clamp(s.run.climb / game.flightLength(s, next), 0, 1);
        const u = up ? k : 1 - k;
        const foot = f.centre.clone().addScaledVector(f.z, len / 2 - 0.5);
        const head = f.centre.clone().addScaledVector(f.z, -(len / 2 - 0.5));
        const at2 = foot.lerp(head, u).setY(f.floor + u * FLOOR_H);
        b.yaw = up ? Math.atan2(-f.z.x, -f.z.z) : Math.atan2(f.z.x, f.z.z);
        return { pose: { kind: 'walk', at: at2, yaw: b.yaw }, asleep: false, doing: {} };
      }
    }
    const perf = game.performing(s);
    // Seeing to a client sat waiting in a chair that has a place drawn for it (2026-10-27, the 헤어
    // 살롱: the hair cut, coloured and blow-dried in the styling chair, stood at the client's side).
    const served = !perf && this.socialSpot(s);
    if (served) return { ...spotPose(served, 'talk', height, t, s.id), asleep: false };
    const pose2d = poseOf(game, s, dwellerDrawPos(game, s));
    if (perf) {
      const { obj } = perf;
      const inter = (perf.inter.drawnAs && getDef(obj.defId).interactions.find((i) => i.id === perf.inter.drawnAs)) || perf.inter;
      const def = getDef(obj.defId);
      const kind = kindOf(def);
      const piece = this.pieces.get(obj.uid);
      const f = piece?.at ?? this.placing(game, obj);
      const built = piece?.built;
      const mark = (m: THREE.Object3D | undefined) => m?.getWorldPosition(new THREE.Vector3());
      const facing = Math.atan2(f.z.x, f.z.z);
      if (inter.pose === 'on') {
        if (LYING.has(inter.id) && game.sleptIn(obj)) {
          const head = f.centre.clone().addScaledVector(f.x, this.sleeperOffset(game, s, obj));
          const dir = f.z.clone().negate();
          // The head in the middle of the pillow, so the feet stay under the covers (2026-11-05).
          head.addScaledVector(dir, def.h / 2 - 0.12).setY(f.floor + (SEAT_Y[kind] ?? SEAT_Y.bed ?? 0.49));
          // The hands folded on the covers over the belly (`side` is their left, as they lie).
          const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
          const belly = head.clone().addScaledVector(dir, -0.6 * (height / 1.6)).setY(head.y + 0.27);
          // A toddler's arms are too short to fold over the covers: they lie by their sides.
          if (height < 1.1) return { pose: { kind: 'lie', head, dir, floor: f.floor }, asleep: true, doing: {} };
          return { pose: { kind: 'lie', head, dir, floor: f.floor }, asleep: true, doing: { reach: { l: belly.clone().addScaledVector(side, 0.1), r: belly.clone().addScaledVector(side, -0.1), palms: 1.2, grip: { l: 0.4, r: 0.4 } } } };
        }
        if (LYING.has(inter.id)) {
          const dir = f.x.clone().negate();
          const head = f.centre.clone().addScaledVector(dir, def.w / 2 - 0.25).setY(f.floor + (SEAT_Y[kind] ?? 0.42));
          return { pose: { kind: 'lie', head, dir, floor: f.floor }, asleep: true, doing: {} };
        }
        // On the belt, walking on the spot towards the console as it runs back under them.
        // A place of its own by where they are across it (a swimmer's lane in the pool: home/play.ts).
        const lane = built?.spots?.[`on:${inter.id}:${Math.round(this.sleeperOffset(game, s, obj))}`];
        if (lane) return { ...spotPose(lane, motionOf(inter.id, kind, true), height, t, s.id), asleep: false };
        if (def.id === 'treadmill') return { pose: { kind: 'walk', at: f.centre.clone().addScaledVector(f.z, 0.1).setY(f.floor + 0.16), yaw: facing + Math.PI, pace: 1.3 }, asleep: false, doing: {} };
        if (kind === 'shower') {
          const base = f.centre.clone();
          return { pose: { kind: 'stand', at: base, yaw: facing }, asleep: false, doing: doing(built?.seatMotion?.[inter.id] ?? motionOf(inter.id, kind, false), { base, yaw: facing, height, sitting: false }, null, t, s.id) };
        }
        if (kind === 'bathtub') {
          // Sat back at the head of the bath, legs out along it under the water.
          const seat = f.centre.clone().addScaledVector(f.z, -def.h / 2 + 0.42).setY(f.floor + 0.2);
          return { pose: { kind: 'sit', at: seat, yaw: facing, floor: f.floor, legs: 'out' }, asleep: false, doing: doing(built?.seatMotion?.[inter.id] ?? 'lap', { base: seat, yaw: facing, height, sitting: true }, null, t, s.id) };
        }
        let seat: THREE.Vector3;
        if (built?.seat && (def.seats ?? 1) < 2) seat = mark(built.seat)!;
        else {
          // The game's seat (a sofa's left or right half), moved with the piece as it's drawn.
          const p = dwellerDrawPos(game, s);
          const c = objectCenter(obj);
          seat = new THREE.Vector3(p.x - c.x, 0, p.y - c.y).add(f.centre).setY(f.floor + (SEAT_Y[kind] ?? 0.46));
        }
        const motion = built?.seatMotion?.[inter.id] ?? motionOf(inter.id, kind, true);
        // At a table (a chair pulled in to one): the plate goes on it in front of them.
        const table = motion === 'eat' && kind === 'chair' && this.tableAhead(obj) ? { point: seat.clone().addScaledVector(f.z, 0.36).setY(f.floor + 0.785), across: f.x, floor: f.floor } : null;
        return { pose: { kind: 'sit', at: seat, yaw: facing, floor: f.floor }, asleep: false, doing: doing(motion, { base: seat, yaw: facing, height, sitting: true }, table, t, s.id) };
      }
      const motion = motionOf(inter.id, kind, false);
      // A place of its own for this use (2026-10-26): a centrifuge's gondola, in a wind tunnel's air, at a hatch.
      // On a piece used from its two sides (a chess table), each side may have its own: `<id>:l`, `<id>:r`.
      // At their level, some work is drawn at another use's place on the piece (a leader's meeting at the board: workRoles.ts).
      const levelSpot = game.workVariantOf(s, inter)?.spotAs;
      const spot = (levelSpot ? built?.spots?.[levelSpot] : undefined) ?? built?.spots?.[`${inter.id}:${this.toLocal(f, at).x < 0 ? 'l' : 'r'}`] ?? built?.spots?.[inter.id] ?? built?.spots?.['*'];
      if (spot) {
        const sp = spotPose(spot, motion, height, t, s.id);
        // A meditator's eyes shut.
        return { ...sp, asleep: !!sp.doing.shut };
      }
      // Sat at it: a desk's chair, a piano's bench (참고 게임's desk-and-chair).
      if (built?.seat && SAT_AT.has(kind)) {
        const seat = mark(built.seat)!;
        const yaw = facing + Math.PI;
        // Someone's come up to talk: the hands come off the keys and they turn round in the seat to them.
        if (s.engagedWith !== null) return { pose: { kind: 'sit', at: seat, yaw, floor: f.floor }, asleep: false, doing: doing('lap', { base: seat, yaw, height, sitting: true }, null, t, s.id), waist: true };
        const work = built.work ? { point: mark(built.work)!, across: f.x, floor: f.floor } : null;
        return { pose: { kind: 'sit', at: seat, yaw, floor: f.floor }, asleep: false, doing: doing(motion, { base: seat, yaw, height, sitting: true }, work, t, s.id) };
      }
      // Up on it, facing out from its front (a concert stage's deck, behind the mic, 2026-10-26).
      if (built?.stand) {
        const stand = mark(built.stand)!;
        // A comedian tells jokes at the mic; a stage with no mic to sing into is danced on.
        const how = !built.work || /dance|choreo/i.test(inter.id) ? 'dance' : def.id === 'clubStage' ? 'joke' : 'perform';
        const work = built.work ? { point: mark(built.work)!, across: f.x, floor: stand.y } : null;
        const d = doing(how, { base: stand, yaw: facing, height, sitting: false }, work, t, s.id);
        return { pose: { kind: 'stand', at: stand, yaw: facing, crouch: d.crouch }, asleep: false, doing: d };
      }
      // Stood up to it: a step from the nearest point of what's drawn, facing it, hands on it.
      if (built) {
        const local = this.toLocal(f, at);
        const box3 = built.body;
        const near = new THREE.Vector3(THREE.MathUtils.clamp(local.x, box3.min.x, box3.max.x), 0, THREE.MathUtils.clamp(local.z, box3.min.z, box3.max.z));
        const nearW = this.toWorld(f, near);
        const away = at.clone().sub(nearW).setY(0);
        const dist = away.length();
        if (dist < 1e-3) away.copy(f.z);
        away.normalize();
        // Up close to a counter (a body's breadth), back a little from a fridge door, a mirror, a picture.
        const step = motion === 'admire' ? 0.65 : motion === 'read' || motion === 'strum' ? 0.5 : motion === 'peer' ? 0.16 : motion === 'rummage' ? 0.44 : motion === 'talk' || motion === 'gesture' ? 0.5 : 0.2;
        const stand = nearW.clone().addScaledVector(away, Math.min(step, Math.max(dist, 0.2))).setY(at.y);
        // A book taken down from a shelf is read turned round from it, not nose to the spines.
        const yaw = Math.atan2(-away.x, -away.z) + (motion === 'read' ? Math.PI * 0.8 : 0);
        let point = mark(built.work);
        if (!point) {
          const top = box3.max.y;
          const inward = top >= 0.7 && top <= 1.25 ? 0.12 : top > 1.25 ? -0.02 : 0.1;
          point = nearW.clone().addScaledVector(away, -inward).setY(f.floor + (top > 1.25 ? 1.1 : top + 0.02));
        }
        const across = new THREE.Vector3(-away.z, 0, away.x);
        const d = doing(motion, { base: stand, yaw, height, sitting: false }, { point, across, floor: f.floor }, t, s.id, /violin/i.test(def.id), def.color);
        return { pose: { kind: 'stand', at: stand, yaw, crouch: d.crouch }, asleep: false, doing: d };
      }
    }
    const waitSeat = this.waiting.get(s.id);
    const piece = waitSeat && this.pieces.get(waitSeat.obj.uid);
    if (waitSeat && piece) {
      const f = piece.at;
      const front = Math.atan2(f.z.x, f.z.z);
      // A place drawn on a set for its guests (a talk show's sofa): the one nearest the tile, facing the way it's turned.
      if (waitSeat.kind === 'set') {
        const tile = world(waitSeat.tile.x + 0.5, waitSeat.tile.y + 0.5);
        let place: THREE.Object3D | undefined;
        let near = Infinity;
        for (const m of piece.built.guests ?? []) {
          const p = m.getWorldPosition(new THREE.Vector3());
          const d = Math.hypot(p.x - tile.x, p.z - tile.z);
          if (d < near) [near, place] = [d, m];
        }
        if (place) {
          const seat = place.getWorldPosition(new THREE.Vector3());
          const dir = place.getWorldDirection(new THREE.Vector3());
          const yaw = Math.atan2(dir.x, dir.z);
          return { pose: { kind: 'sit', at: seat, yaw, floor: seat.y - (place.userData.drop ?? SEAT_Y.sofa!) }, asleep: false, doing: doing('lap', { base: seat, yaw, height, sitting: true }, null, t, s.id) };
        }
      }
      // A chair's seat; a pupil's desk's chair, turned to the desk; a sofa's place over the tile, back a little.
      const seat =
        waitSeat.kind === 'sofa'
          ? world(waitSeat.tile.x + 0.5, waitSeat.tile.y + 0.5).addScaledVector(f.z, -0.08).setY(f.floor + SEAT_Y.sofa!)
          : piece.built.seat?.getWorldPosition(new THREE.Vector3());
      if (seat) {
        const yaw = waitSeat.kind === 'desk' ? front + Math.PI : front;
        return { pose: { kind: 'sit', at: seat, yaw, floor: f.floor }, asleep: false, doing: doing('lap', { base: seat, yaw, height, sitting: true }, null, t, s.id) };
      }
    }
    if (pose2d.kind === 'upright' && pose2d.sitting) return { pose: { kind: 'sit', at: at.clone().setY(floorY + 0.46), yaw: YAW[pose2d.facing], floor: floorY }, asleep: false, doing: {} };
    const moved = Math.hypot(at.x - b.last.x, at.z - b.last.z);
    const walking = pose2d.kind === 'upright' && pose2d.walking;
    if (walking && moved > 0.001) b.yaw = Math.atan2(at.x - b.last.x, at.z - b.last.z);
    else if (!walking && pose2d.kind === 'upright') {
      b.yaw = YAW[pose2d.facing];
      // Talking with someone (or with a group, to the middle of it): turned to them, not just the
      // nearest of the four ways the plan has.
      const face = this.facePoint(game, s, at);
      if (face) b.yaw = Math.atan2(face.x - at.x, face.z - at.z);
    }
    // Talking: the hands come up now and then.
    const talking = a?.kind === 'social' && s.run?.phase === 'performing';
    // Someone who's come in to a club, on its dance floor: dancing, turned to the DJ (2026-10-27, the 나이트클럽).
    const floor = !walking && !talking && s.npc?.role === 'client' ? this.danceFloorUnder(game, s) : undefined;
    if (floor) {
      const to = floor.at.getWorldPosition(new THREE.Vector3());
      const yaw = Math.atan2(to.x - at.x, to.z - at.z) + 0.35 * Math.sin(t * 0.3 + s.id);
      const dance = doing('dance', { base: at, yaw, height, sitting: false }, null, t, s.id);
      return { pose: { kind: 'stand', at, yaw, crouch: dance.crouch }, asleep: false, doing: dance };
    }
    const d = talking ? doing('talk', { base: at, yaw: b.yaw, height, sitting: false }, null, t, s.id) : {};
    return { pose: { kind: walking ? 'walk' : 'stand', at, yaw: b.yaw, crouch: d.crouch }, asleep: false, doing: d };
  }

  /** The `dance:floor` place of a dance floor the dweller stands on (a walked-on piece: workplaces/dj.ts), which way its dancers face. */
  private danceFloorUnder(game: Game, s: Dweller): Spot | undefined {
    const x = Math.round(s.x);
    const y = Math.round(s.y);
    for (const o of game.state.objects) {
      const sp = this.pieces.get(o.uid)?.built.spots?.['dance:floor'];
      if (sp && footprintTiles(getDef(o.defId), o.x, o.y, o.dir).some((q) => q.x === x && q.y === y)) return sp;
    }
    return undefined;
  }

  /**
   * Who a dweller is turned to: the one they're talking to, the one talking to them (at an activity
   * too, a side chat), or in a conversation they're standing about in, whoever's speaking in it.
   */
  private focusOf(game: Game, s: Dweller): Dweller | undefined {
    const a = s.queue[0];
    if (a?.kind === 'social' && s.run?.phase === 'performing') return game.dweller(a.targetId);
    if (s.engagedWith !== null) return game.dweller(s.engagedWith);
    const side = game.sideSocialOf(s);
    if (side) return side.speaker === s ? game.dweller(side.side.targetId) : side.speaker;
    if (s.queue.length || game.performing(s)) return undefined;
    const group = game.convoOf(s).filter((m) => m !== s);
    const speaking = (m: Dweller) => (m.queue[0]?.kind === 'social' && m.run?.phase === 'performing') || !!m.side;
    return group.find(speaking) ?? group[0];
  }

  /** The seat of someone sat at a desk, a piano, a booth (what they're using, as drawn), and the piece's frame. */
  private seatAt(game: Game, s: Dweller): { seat: THREE.Vector3; f: Placing } | undefined {
    const perf = game.performing(s);
    const piece = perf && this.pieces.get(perf.obj.uid);
    if (!perf || !piece?.built.seat || !SAT_AT.has(kindOf(getDef(perf.obj.defId)))) return undefined;
    return { seat: piece.built.seat.getWorldPosition(new THREE.Vector3()), f: piece.at };
  }

  /**
   * Talking to someone sat at a desk: stood beside their chair (on the side they came from), a little
   * out from the desk, rather than on the tile the plan has them on, which may be right behind it.
   */
  private besideSeat(game: Game, s: Dweller, tile: THREE.Vector3): THREE.Vector3 | undefined {
    const a = s.queue[0];
    if (a?.kind !== 'social' || s.run?.phase !== 'performing') return undefined;
    const t = game.dweller(a.targetId);
    const sat = t && this.seatAt(game, t);
    if (!sat) return undefined;
    const side = tile.clone().sub(sat.seat).dot(sat.f.x) >= 0 ? 1 : -1;
    return sat.seat.clone().addScaledVector(sat.f.x, 0.62 * side).addScaledVector(sat.f.z, 0.05).setY(tile.y);
  }

  /** Where a dweller standing about stands facing: the one they talk with, or the middle of their group. */
  private facePoint(game: Game, s: Dweller, at: THREE.Vector3): THREE.Vector3 | undefined {
    const f = this.focusOf(game, s);
    if (!f) return undefined;
    const group = game.convoOf(s).filter((m) => m !== s);
    const them = group.length >= 2 && group.includes(f) ? group : [f];
    const mid = new THREE.Vector3();
    for (const m of them) mid.add(this.bodies.get(m.id)?.last ?? world(m.x + 0.5, m.y + 0.5));
    mid.divideScalar(them.length);
    return Math.hypot(mid.x - at.x, mid.z - at.z) > 0.2 ? mid : undefined;
  }

  /** The eyes of whoever a dweller is talking with, near enough and on the same floor, for them to look at. */
  private lookPoint(game: Game, s: Dweller, b: Body): THREE.Vector3 | undefined {
    const f = this.focusOf(game, s);
    const other = f && this.bodies.get(f.id)?.avatar;
    if (!f || !other || f.away) return undefined;
    const eyes = other.eyes(new THREE.Vector3());
    return Math.hypot(eyes.x - b.last.x, eyes.z - b.last.z) < 4 && Math.abs(eyes.y - b.last.y) < 2.2 ? eyes : undefined;
  }

  /** A point in an object's frame (x across, z out of its front, from its middle) in the world, and back. */
  private toWorld(f: Placing, p: THREE.Vector3): THREE.Vector3 {
    return f.centre.clone().addScaledVector(f.x, p.x).addScaledVector(f.z, p.z).setY(f.floor + p.y);
  }
  private toLocal(f: Placing, p: THREE.Vector3): THREE.Vector3 {
    const d = p.clone().sub(f.centre);
    return new THREE.Vector3(d.dot(f.x), p.y - f.floor, d.dot(f.z));
  }

  /** Whether a chair is pulled in to a table (it's drawn there). */
  private tableAhead(chair: PlacedObject): boolean {
    const f = this.pieces.get(chair.uid)?.at;
    if (!f) return false;
    const def = getDef(chair.defId);
    const { w, h } = dims(def, chair.dir);
    const level = Math.floor(chair.y / MAP_H);
    const plain = new THREE.Vector3(chair.x + w / 2, f.floor, chair.y - level * MAP_H + h / 2);
    return f.centre.clone().sub(plain).dot(f.z) > 0.05;
  }

  private syncDwellers(game: Game, level: number, dt: number, t: number) {
    const shown = game.state.dwellers.filter((s) => !s.away && !game.performing(s)?.inter.offLot);
    const ids = new Set(shown.map((s) => s.id));
    for (const [id, b] of this.bodies)
      if (!ids.has(id)) {
        b.avatar?.dispose();
        b.label.remove();
        b.bubble.remove();
        for (const m of Object.values(b.props)) m?.removeFromParent();
        this.bodies.delete(id);
      }
    for (const [id, m] of this.babies)
      if (!ids.has(id)) {
        m.removeFromParent();
        this.babies.delete(id);
        this.babyLooks.delete(id);
      }
    this.plumbob.visible = false;
    this.waiting = this.waitingSeats(game);
    // How many are still a gold glow (their character on its way), told when it changes.
    let coming = 0;
    for (const b of this.bodies.values()) if (b.avatar instanceof LoadingAvatar) coming++;
    if (coming !== this.loadingCount) {
      this.loadingCount = coming;
      this.onLoading?.(coming);
    }
    for (const s of shown) {
      const dwellerLevel = Math.floor(Math.round(s.y) / MAP_H);
      if (s.age === 'baby') {
        let baby = this.babyLooks.get(s.id);
        if (!baby) {
          baby = makeBaby(s.skin, s.hair, s.shirt === '#fafafa' ? (s.gender === 'female' ? '#f8cfd8' : '#bbdefb') : s.shirt);
          this.scene.add(baby.root);
          this.babies.set(s.id, baby.root);
          this.babyLooks.set(s.id, baby);
        }
        const m = baby.root;
        // Lying on the bassinet's mattress along it, the head at its back; or where they are.
        const crib = s.bassinetUid !== undefined ? this.pieces.get(s.bassinetUid)?.at : undefined;
        const held = s.bassinetUid !== undefined ? this.pieces.get(s.bassinetUid)?.built.babyAt : undefined;
        baby.update(sceneClock.now, { asleep: s.needs.energy < 45, crying: !!(s.warned as Record<string, boolean>)?.crying, feeding: !!held?.userData.feeding });
        if (held) {
          // Where the bassinet has them: on the mattress, on the changing pad, in someone's arms.
          held.getWorldPosition(m.position);
          held.getWorldQuaternion(m.quaternion);
        } else if (crib) {
          m.position.copy(crib.centre).setY(crib.floor + BASSINET_BED);
          m.rotation.y = Math.atan2(crib.z.x, crib.z.z);
        } else {
          const p = dwellerDrawPos(game, s);
          m.position.copy(world(p.x, p.y, 0.62));
          m.position.z = p.y - Math.floor(p.y / MAP_H) * MAP_H;
        }
        m.visible = dwellerLevel <= level;
        continue;
      }
      let b = this.bodies.get(s.id);
      if (!b) {
        const label = document.createElement('div');
        label.className = 'lot3d-tag';
        const bubble = document.createElement('div');
        bubble.className = 'lot3d-tag';
        this.labels.append(label, bubble);
        b = { key: '', avatar: null, last: world(s.x + 0.5, s.y + 0.5), yaw: 0, label, bubble, props: {} };
        this.bodies.set(s.id, b);
      }
      // Which body: a VRoid character of theirs, in the outfit for what they're doing, else ours.
      // On a work lot, in the job's work clothes (game/workClothes.ts); a suit is their formal wear.
      const work = workWear(game.state, s);
      const changed = changedInto(game, s) ?? (work?.set === 'formal' ? 'formal' : undefined);
      const look = figureLook(s, changed);
      // Dressed as they look (vrmLooks.ts), but a character kept for a role stays as it is.
      const cast = this.body === 'vroid' ? castOf(this.roster, look, { id: s.id, face: s.face, eyes: s.eyes, tints: s.tints, role: npcRole(s.npc), work }, changed) : null;
      const castKey = cast ? `vrm:${cast.file}:${cast.scale}:${JSON.stringify(cast.dress)}` : '';
      // A file that wouldn't load: the shape figure for that look (and no retry every frame).
      const worn = cast && castKey !== b.failed ? cast : null;
      const scale = worn ? worn.scale : 1;
      const key = worn ? castKey : `shape:${JSON.stringify(look)}`;
      // The list of characters still on its way: a gold glow where they stand, nothing decided yet.
      if (this.body === 'vroid' && !this.rosterReady) {
        if (!b.avatar) {
          b.avatar = new LoadingAvatar(look.stage);
          this.scene.add(b.avatar.root);
        }
      } else if (key !== b.key && b.loading !== key) {
        if (worn) {
          b.loading = key;
          const body = b;
          void inTurn(() => loadDressed(worn.file, worn.dress))
            .then((vrm) => {
              // Not if the lot was left meanwhile, even for one with the same dweller on it: nothing would ever pose it.
              if (body.loading !== key || this.bodies.get(s.id) !== body) return;
              body.avatar?.dispose();
              body.avatar = new VrmAvatar(vrm, scale);
              this.scene.add(body.avatar.root);
              body.key = key;
              body.loading = undefined;
            })
            .catch(() => {
              if (body.loading !== key) return;
              body.loading = undefined;
              body.failed = key;
            });
          // Someone new: a gold glow until their character comes (one already shown stays till then).
          if (!b.avatar) {
            b.avatar = new LoadingAvatar(look.stage);
            this.scene.add(b.avatar.root);
          }
        } else {
          b.avatar?.dispose();
          b.avatar = new ShapeAvatar(look);
          this.scene.add(b.avatar.root);
          b.key = key;
          b.loading = undefined;
        }
      }
      const { pose, asleep, doing: act, waist } = this.bodyPose(game, s, b, t);
      const active = s.id === game.state.activeDwellerId;
      const av = b.avatar!;
      av.root.visible = dwellerLevel <= level;
      // In the cleanroom suit by where they are (game/cleanroom.ts), or for now at the gowning bench.
      av.setSuit?.(inCleanSuit(game, s) || !!act.suit);
      av.update({ pose, expr: expressionOf(game, s), asleep, active, reach: act.reach, look: asleep ? undefined : this.lookPoint(game, s, b), waist }, dt, t, this.camera);
      // What's in their hands (only with a body whose hands reach for things).
      for (const [k, m] of Object.entries(b.props) as Array<[PropKind, THREE.Object3D]>) m.visible = av instanceof VrmAvatar && act.prop?.kind === k && av.root.visible;
      if (act.prop && av instanceof VrmAvatar) {
        const prop = (b.props[act.prop.kind] ??= this.scene.add(makeProp(act.prop.kind, act.prop.color)).children.at(-1)!);
        prop.position.copy(act.prop.at);
        prop.rotation.set(0, act.prop.yaw, 0);
        (prop.children[0] as THREE.Object3D).rotation.z = act.prop.roll ?? 0;
        if (act.prop.kind === 'guitar' || act.prop.kind === 'violin') (prop.children[0] as THREE.Object3D).rotation.x = act.prop.pitch ?? 0;
        prop.visible = av.root.visible;
      }
      b.last.copy(pose.kind === 'lie' ? pose.head : pose.at);
      // The plumbob over whoever is in hand; a name and what they're up to under it.
      const top = av.headTop(new THREE.Vector3());
      // Downstairs, under the floor shown: no plumbob or labels showing through it.
      const here = dwellerLevel === level;
      if (active && here) {
        this.plumbob.visible = true;
        this.plumbob.position.set(top.x, top.y + 0.38 + Math.sin(t * 2.4) * 0.04, top.z);
        this.plumbob.rotation.y = t * 1.6;
        const color = plumbobColor(game.emotionOf(s));
        (this.plumbob.material as THREE.MeshToonMaterial).color.set(color);
        (this.plumbob.material as THREE.MeshToonMaterial).emissive.set(color).multiplyScalar(0.35);
      }
      const icon = bubbleIcon(game, s);
      const tagText = s.npc?.rung?.title ? colleagueTag(s.name, s.npc.rung.title) : s.npc ? `${s.name} ${(s.npc.boss ? '👔' : ({ guest: '🏠', burglar: '🦹', reaper: '💀', ghost: '👻', service: '🧰', coworker: '💼' } as Record<string, string>)[s.npc.role]) ?? '🚶'}` : s.name;
      const name = `<span class="lot3d-name${active ? ' on' : ''}">${tagText}</span>`;
      if (b.label.dataset.html !== name) {
        b.label.innerHTML = name;
        b.label.dataset.html = name;
      }
      // A colleague's face (a thought cloud, tinted by the mood) beside what they're doing (a speech bubble).
      const mood = moodBubble(game, s);
      const feel = mood ? `<span class="lot3d-mood" style="--mood:${mood.color}" title="${mood.label}">${mood.icon}</span>` : '';
      const thought = icon || feel ? `<span class="lot3d-bubbles">${feel}${icon ? `<span class="lot3d-bubble">${icon}</span>` : ''}</span>` : '';
      if (b.bubble.dataset.html !== thought) {
        b.bubble.innerHTML = thought;
        b.bubble.dataset.html = thought;
      }
      const feet = this.project(b.last.clone().setY(b.last.y - 0.05));
      const head = this.project(top);
      b.label.style.display = b.bubble.style.display = here ? '' : 'none';
      b.label.style.transform = `translate(${feet.x.toFixed(1)}px, ${feet.y.toFixed(1)}px)`;
      b.bubble.style.transform = `translate(${(head.x + 26).toFixed(1)}px, ${head.y.toFixed(1)}px)`;
      if (s.npc?.role === 'ghost') av.root.traverse((o) => ((o as THREE.Mesh).isMesh ? (o.renderOrder = 2) : undefined));
    }
  }

  /** Doors open as a dweller comes up to them, swinging away from them (shut again before turning round). */
  private syncDoors(game: Game, dt: number) {
    for (const d of this.house!.doors) {
      const near = game.state.dwellers.find((s) => !s.away && Math.abs(s.x - d.x) < 1.1 && Math.abs(s.y - d.y) < 1.1);
      if (near && d.open < 0.05) {
        const from = d.axis === 'x' ? near.y - d.y : near.x - d.x;
        if (from) d.side = from > 0 ? -1 : 1;
      }
      d.open = THREE.MathUtils.damp(d.open, near ? 1 : 0, 7, dt);
      // Along x a turn the positive way swings the leaf towards -z; along z, towards +x.
      d.leaf.rotation.y = d.open * 1.6 * (d.axis === 'x' ? -d.side : d.side);
    }
  }

  private syncLights(game: Game, level: number) {
    const night = nightLevel(game.state.time);
    const day = 1 - night;
    this.sun.intensity = 0.12 + 2.3 * day;
    this.sun.color.set(day > 0.5 ? '#fff3dc' : '#8fa6ff');
    this.hemi.intensity = 0.22 + 0.9 * day;
    this.hemi.color.set(day > 0.5 ? '#d6ecff' : '#7d8fd0');
    this.sky.set('#1d2b52').lerp(new THREE.Color('#bfe0f4'), day);
    (this.scene.fog as THREE.Fog).color.copy(this.sky);
    const sx = Math.sin(this.yaw - 0.9);
    const sz = Math.cos(this.yaw - 0.9);
    this.sun.position.set(MAP_W / 2 + sx * 18, 26, MAP_H / 2 + sz * 18);
    this.sun.target.position.set(MAP_W / 2, 0, MAP_H / 2);
    // Ceiling lights, lamps, screens and fires after dark: the nearest few to the middle of the view.
    const powered = !game.isCut('power');
    const inUse = activeObjects(game);
    const lights: Array<{ x: number; y: number; color: string; power: number }> = [];
    if (night > 0.02) {
      if (powered) for (const l of roomLights()) if (Math.floor(l.y / MAP_H) === level) lights.push({ x: l.x, y: l.y, color: '#ffd9a0', power: 1 });
      for (const o of powered ? game.state.objects : []) {
        const l = objectLight(getDef(o.defId), o.x, o.y, o.dir, inUse.has(o.uid));
        if (l && Math.floor(l[1] / MAP_H) <= level) lights.push({ x: l[0], y: l[1], color: l[3], power: 0.8 });
      }
    }
    for (const f of game.state.fires ?? []) lights.push({ x: f.x + 0.5, y: f.y + 0.5, color: '#ff8a3d', power: 1.2 });
    lights.sort((a, b) => Math.hypot(a.x - this.target.x, a.y % MAP_H - this.target.z) - Math.hypot(b.x - this.target.x, b.y % MAP_H - this.target.z));
    this.points.forEach((p, i) => {
      const l = lights[i];
      if (!l) {
        p.intensity = 0;
        return;
      }
      const lv = Math.floor(l.y / MAP_H);
      p.position.set(l.x, lv * FLOOR_H + 2.4, l.y - lv * MAP_H);
      p.color.set(l.color);
      p.intensity = 9 * l.power * Math.max(night, 0.3);
    });
  }

  /** Food on the table, dishes by the sink, puddles and fires: rebuilt each frame (there are few). */
  private syncExtras(game: Game, level: number, t: number) {
    this.extras.clear();
    const add = (m: THREE.Object3D) => this.extras.add(m);
    const on = (o: PlacedObject) => (this.pieces.get(o.uid)?.at ?? this.placing(game, o)).centre.clone();
    const servings = game.servingsLeft();
    const table = servings > 0 ? game.foodSpot() : undefined;
    if (table && Math.floor(table.y / MAP_H) <= level) {
      const c = on(table);
      const n = Math.min(servings, 8);
      for (let i = 0; i < n; i++) {
        const plate = new THREE.Mesh(cyl(0.11, 0.09, 0.02, 14), toon('#fafafa'));
        plate.position.set(c.x + ((i % 4) - 1.5) * 0.24, c.y + 0.79, c.z + (Math.floor(i / 4) - 0.5) * 0.24);
        add(plate);
        const food = new THREE.Mesh(ball(0.06), toon('#e0893a'));
        food.scale.y = 0.5;
        food.position.copy(plate.position).setY(plate.position.y + 0.03);
        add(food);
      }
    }
    const dishes = game.state.dishes ?? 0;
    const spot = dishes > 0 ? game.dishSpot() : undefined;
    if (spot && Math.floor(spot.y / MAP_H) <= level) {
      const c = on(spot);
      for (let i = 0; i < dishes; i++) {
        const d = new THREE.Mesh(cyl(0.1, 0.08, 0.02, 12), toon(i % 2 ? '#f2e6d6' : '#fafafa'));
        d.position.set(c.x - 0.15 + (i % 3) * 0.15, c.y + 0.92 + Math.floor(i / 3) * 0.025, c.z + 0.1);
        add(d);
      }
    }
    for (const p of game.state.puddles ?? []) {
      if (Math.floor(p.y / MAP_H) > level) continue;
      const m = new THREE.Mesh(cyl(0.38, 0.38, 0.01, 20), PUDDLE);
      m.scale.z = 0.7;
      m.position.copy(world(p.x + 0.5, p.y + 0.5, 0.012));
      m.position.z = (p.y % MAP_H) + 0.55;
      add(m);
    }
    for (const f of game.state.fires ?? []) {
      if (Math.floor(f.y / MAP_H) > level) continue;
      for (let i = 0; i < 3; i++) {
        const k = 0.8 + Math.sin(t * 9 + i * 2 + f.x) * 0.25;
        const flame = new THREE.Mesh(FLAME_GEOM, FLAMES[i % 2]);
        flame.scale.y = k;
        flame.position.copy(world(f.x + 0.5 + (i - 1) * 0.18, f.y + 0.5, 0.25 * k));
        flame.position.z = (f.y % MAP_H) + 0.5 + Math.sin(i) * 0.1;
        add(flame);
      }
    }
  }

  private quad(x: number, y: number, color: string, inset = 0.04, size = 1) {
    if (this.quadCount >= QUADS) return;
    const lv = Math.floor(y / MAP_H);
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x + 0.5, lv * FLOOR_H + 0.03, y - lv * MAP_H + 0.5),
      new THREE.Quaternion(),
      new THREE.Vector3(size - inset * 2, 1, size - inset * 2),
    );
    this.quads.setMatrixAt(this.quadCount, m);
    this.quads.setColorAt(this.quadCount, new THREE.Color(color));
    this.quadCount++;
  }

  /**
   * A see-through wall over an edge (walls.ts key), a little wider than a wall: the wall a tool
   * points at, or one it would put up. As tall as the wall stands there (low where cut away), or
   * `low` for a room's outline.
   */
  private mark(key: string, color: string, low = false) {
    if (this.markCount >= MARKS) return;
    const [, b] = edgeTiles(key);
    const lv = Math.floor(b.y / MAP_H);
    const along = key.endsWith('n');
    const h = low || this.walls === 'down' || this.cut.has(key) ? LOW_H + 0.05 : WALL_H + 0.05;
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(along ? b.x + 0.5 : b.x, lv * FLOOR_H + h / 2, (b.y - lv * MAP_H) + (along ? 0 : 0.5)),
      new THREE.Quaternion(),
      new THREE.Vector3(along ? 1.02 : WALL_T + 0.08, h, along ? WALL_T + 0.08 : 1.02),
    );
    this.marks.setMatrixAt(this.markCount, m);
    this.marks.setColorAt(this.markCount, new THREE.Color(color));
    this.markCount++;
  }

  /** The label over the lot while a room or a wall is drawn: its size and cost, or why it can't be. */
  private label(at: THREE.Vector3, text: string) {
    const p = this.project(at);
    this.roomLabel.style.display = '';
    this.roomLabel.textContent = text;
    this.roomLabel.style.transform = `translate(${p.x.toFixed(0)}px, ${(p.y - 28).toFixed(0)}px)`;
  }

  /** Build mode's marks on the floor: what the tool would do, where furniture would go. */
  private syncOverlay(game: Game, ui: RenderUi, t: number) {
    this.quadCount = 0;
    this.markCount = 0;
    this.roomLabel.style.display = 'none';
    const placing = ui.mode === 'buy' ? ui.placing : null;
    const hover = ui.hover;
    let ghostKey = '';
    if (placing?.build === 'room' && hover) {
      const from = ui.roomFrom ?? hover;
      const plan = game.roomPlan(from.x, from.y, hover.x, hover.y);
      const x0 = Math.min(from.x, hover.x);
      const y0 = Math.min(from.y, hover.y);
      const x1 = Math.max(from.x, hover.x);
      const y1 = Math.max(from.y, hover.y);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.quad(x, y, plan.ok ? '#a5d6a7' : '#e53935');
      // Its outline: the walls it would put up.
      for (let x = x0; x <= x1; x++) for (const [y, side] of [[y0, 'n'], [y1, 's']] as Array<[number, Side]>) this.mark(edgeKey(x, y, side) ?? '', plan.ok ? '#2e7d32' : '#e53935', true);
      for (let y = y0; y <= y1; y++) for (const [x, side] of [[x0, 'w'], [x1, 'e']] as Array<[number, Side]>) this.mark(edgeKey(x, y, side) ?? '', plan.ok ? '#2e7d32' : '#e53935', true);
      if (ui.roomFrom) this.label(world(x0, y0, 0.1).setZ(y0 - Math.floor(y0 / MAP_H) * MAP_H), plan.ok ? `${x1 - x0 + 1}×${y1 - y0 + 1} · §${plan.cost}` : plan.reason ?? '');
    } else if (placing?.build === 'wall' && hover && ui.at) {
      // A wall being drawn from corner to corner along the line, or the edge a click would build on.
      const to = { x: Math.round(ui.at.x), y: Math.round(ui.at.y) };
      if (ui.wallFrom && (to.x !== ui.wallFrom.x || to.y !== ui.wallFrom.y)) {
        const from = ui.wallFrom;
        const plan = game.wallPlan(from.x, from.y, to.x, to.y);
        for (const k of lineEdges(from.x, from.y, to.x, to.y) ?? []) if (!game.walls[k]) this.mark(k, plan.ok ? '#2e7d32' : '#e53935');
        const n = (lineEdges(from.x, from.y, to.x, to.y) ?? []).length;
        this.label(world(from.x, from.y, 0.1).setZ(from.y - Math.floor(from.y / MAP_H) * MAP_H), plan.ok ? `🧱 ${n}칸 · §${plan.cost}` : plan.reason ?? '');
      } else if (ui.edge) this.edgeMark(game, 'wall', ui.edge);
    } else if ((placing?.build === 'door' || placing?.build === 'window') && ui.edge) {
      this.edgeMark(game, placing.build, ui.edge);
    } else if (placing?.build === 'remove' && ui.removeFrom && ui.at) {
      // Walls taken down along a line from corner to corner, but the front door.
      const from = ui.removeFrom;
      const to = { x: Math.round(ui.at.x), y: Math.round(ui.at.y) };
      const plan = game.removePlan(from.x, from.y, to.x, to.y);
      for (const k of plan.edges) this.mark(k, '#ff5722');
      this.label(world(from.x, from.y, 0.1).setZ(from.y - Math.floor(from.y / MAP_H) * MAP_H), plan.ok ? `🔨 벽 ${plan.edges.length}칸 허물기` : plan.reason ?? '');
    } else if (placing?.build === 'remove' && ui.edge) {
      this.edgeMark(game, 'remove', ui.edge);
    } else if (placing?.build && hover) {
      this.quad(hover.x, hover.y, game.canBuild(placing.build, hover.x, hover.y) ? '#4caf50' : '#e53935');
    } else if (placing?.paint && hover) {
      // The room shows the new paint itself (syncHouse), with what it is and costs.
      const room = roomUnder(game, hover);
      const { part, style } = placing.paint;
      if (room !== 'outside') {
        const s = part === 'wall' ? WALL_BY_ID[style] : FLOOR_BY_ID[style];
        const lv = Math.floor(hover.y / MAP_H);
        this.label(new THREE.Vector3(hover.x + 0.5, lv * FLOOR_H + 0.3, hover.y - lv * MAP_H + 0.5), `🎨 ${game.roomName(room)} ${part === 'wall' ? '벽지' : '바닥'} 「${s?.label ?? style}」 §${s?.price ?? 0} · 눌러서 바꾸기`);
      } else this.label(new THREE.Vector3(hover.x + 0.5, Math.floor(hover.y / MAP_H) * FLOOR_H + 0.3, (hover.y % MAP_H) + 0.5), '방 안을 가리켜 주세요');
    } else if (placing && hover) {
      const def = getDef(placing.defId);
      const { x, y } = placementOrigin(placing.defId, placing.dir, hover);
      // Red too where it would shut something off from the door (`wayBlocker`).
      const ok = game.canPlace(placing.defId, x, y, placing.dir, placing.movingUid) && !game.wayBlocker(placing.defId, x, y, placing.dir, placing.movingUid);
      for (const p of footprintTiles(def, x, y, placing.dir)) this.quad(p.x, p.y, ok ? '#4caf50' : '#e53935');
      // Where it is used from (the 2D lot's white marks): the front, or the two sides.
      if (def.interactions.length && accessOf(def) !== 'any') for (const p of accessTiles(def, x, y, placing.dir, 1)) this.quad(p.x, p.y, '#ffffff', 0.3);
      ghostKey = `${placing.defId}|${placing.dir}|${ok}`;
      if (this.ghost?.key !== ghostKey) {
        this.ghost?.obj.removeFromParent();
        const built = buildFurniture(def, { againstWall: false });
        const mat = new THREE.MeshBasicMaterial({ color: ok ? '#a5f0b0' : '#ff9a9a', transparent: true, opacity: 0.55, depthWrite: false });
        built.root.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) m.material = m.userData.ink ? new THREE.MeshBasicMaterial({ visible: false }) : mat;
        });
        built.root.rotation.y = -ROT[placing.dir];
        this.scene.add(built.root);
        this.ghost = { key: ghostKey, obj: built.root };
      }
      const { w, h } = dims(def, placing.dir);
      const lv = Math.floor(y / MAP_H);
      this.ghost.obj.position.set(x + w / 2, lv * FLOOR_H + 0.02 + Math.sin(t * 4) * 0.02, y - lv * MAP_H + h / 2);
    } else if (hover) {
      const obj = game.state.objects.find((o) => footprintTiles(getDef(o.defId), o.x, o.y, o.dir).some((p) => p.x === hover.x && p.y === hover.y));
      const color = ui.mode === 'buy' ? '#ffeb3b' : '#78dcff';
      if (obj) for (const p of footprintTiles(getDef(obj.defId), obj.x, obj.y, obj.dir)) this.quad(p.x, p.y, color, 0.02);
      else this.quad(hover.x, hover.y, ui.mode === 'buy' ? '#ffeb3b' : '#ffffff', 0.12);
    }
    if (!ghostKey && this.ghost) {
      this.ghost.obj.removeFromParent();
      this.ghost = null;
    }
    this.quads.count = this.quadCount;
    this.marks.count = this.markCount;
    if (this.marks.instanceColor) this.marks.instanceColor.needsUpdate = true;
    this.marks.instanceMatrix.needsUpdate = true;
    this.quads.instanceMatrix.needsUpdate = true;
    if (this.quads.instanceColor) this.quads.instanceColor.needsUpdate = true;
  }

  /** The edge of the tile under the pointer nearest it, green where the tool can go and red where not (taking down: orange). */
  private edgeMark(game: Game, tool: 'wall' | 'door' | 'window' | 'remove', key: string) {
    const [, b] = edgeTiles(key);
    const side = key.endsWith('n') ? 'n' : 'w';
    const problem = game.edgeProblem(tool, b.x, b.y, side);
    this.mark(key, problem ? '#e53935' : tool === 'remove' ? '#ff5722' : '#2e7d32');
    // What it would do, over the wall: what goes, what it costs, or why not.
    const lv = Math.floor(b.y / MAP_H);
    const at = new THREE.Vector3(side === 'n' ? b.x + 0.5 : b.x, lv * FLOOR_H + (this.walls === 'down' || this.cut.has(key) ? LOW_H : WALL_H), b.y - lv * MAP_H + (side === 'n' ? 0 : 0.5));
    const what: Record<typeof tool, string> = { wall: '🧱 벽 세우기 §40', door: '🚪 문 달기 §120', window: game.walls[key] === 'window' ? '🪟 창문 빼기' : '🪟 창문 내기 §100', remove: game.removeLabel(key) };
    this.label(at, problem && tool !== 'remove' ? problem : what[tool]);
  }

  dispose() {
    this.reset();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.labels.remove();
  }
}
