import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { figureLook } from '../game/looks';
import type { ObjectDef } from '../game/types';
import { ShapeAvatar, VrmAvatar, type Avatar } from './avatar';
import { buildFurniture, type Built } from './furniture3d';
import { ball, canvasTexture, textured } from './toon';
import { modelFor, models } from './vrm';
import { loadDressed } from './vrmDress';

/**
 * The asset gallery's 3D (src/ui/AssetGallery.tsx; ours, a tool for while the 3D is being made):
 * one piece of furniture on a patch of floor marked in metre tiles, turned round with the mouse,
 * a grown-up standing beside it for scale, and where it's sat on and worked at marked; and
 * thumbnails of every piece, drawn one by one off screen.
 */
const SEAT_MARK = new THREE.MeshBasicMaterial({ color: '#2196f3', depthTest: false });
const WORK_MARK = new THREE.MeshBasicMaterial({ color: '#ff5722', depthTest: false });

function floor(): THREE.Mesh {
  const tex = canvasTexture(128, 128, (g) => {
    g.fillStyle = '#e9e1d3';
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = '#c9bea9';
    g.lineWidth = 3;
    g.strokeRect(0, 0, 128, 128);
  }, 12);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), textured(tex));
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  return m;
}

function lights(scene: THREE.Scene) {
  scene.add(new THREE.HemisphereLight('#e8f4ff', '#b8a98f', 1.3));
  const sun = new THREE.DirectionalLight('#fff3dc', 2.2);
  sun.position.set(3, 6, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4 });
  sun.shadow.bias = -0.0008;
  scene.add(sun);
}

/** The big turntable view. */
export class GalleryView {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(35, 1, 0.05, 100);
  private controls: OrbitControls;
  private piece: Built | null = null;
  private marks = new THREE.Group();
  private person: Avatar | null = null;
  private raf = 0;
  private clock = 0;
  showPerson = true;
  showMarks = true;
  /** Shows it as in use (screens lit, the belt running, the pan out). */
  inUse = false;

  constructor(readonly host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    host.append(this.renderer.domElement);
    this.scene.background = new THREE.Color('#f4efe6');
    lights(this.scene);
    this.scene.add(floor(), this.marks);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0.7, 0);
    this.camera.position.set(2.6, 2.0, 3.4);
    this.resize();
    void this.loadPerson();
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      this.clock += dt;
      this.frame(dt);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  private async loadPerson() {
    const roster = await models();
    const pick = modelFor(roster, 'female', 'adult', 1);
    const look = figureLook({ gender: 'female', skin: '#f6d7c3', hair: '#5d4037', shirt: '#f48fb1', hairStyle: 'long' });
    let av: Avatar = new ShapeAvatar(look);
    if (pick) {
      try {
        // Their full body in their own clothes (a character's file has only the clothes).
        av = new VrmAvatar(await loadDressed(pick.base.file, {}), pick.scale);
      } catch {
        /* the shape figure stands in */
      }
    }
    this.person = av;
    this.scene.add(av.root);
  }

  resize() {
    const w = Math.max(1, this.host.clientWidth);
    const h = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  show(def: ObjectDef) {
    if (this.piece) this.piece.root.removeFromParent();
    this.piece = buildFurniture(def, { againstWall: false });
    this.piece.root.traverse((o) => ((o as THREE.Mesh).isMesh ? (o.castShadow = o.receiveShadow = true) : undefined));
    this.scene.add(this.piece.root);
    this.marks.clear();
    for (const [m, mat] of [[this.piece.seat, SEAT_MARK], [this.piece.work, WORK_MARK]] as const) {
      if (!m) continue;
      const dot = new THREE.Mesh(ball(0.035), mat);
      dot.renderOrder = 10;
      dot.position.copy(m.position);
      this.marks.add(dot);
    }
    // Frame it: back far enough to see it whole, and the person beside it.
    const box = new THREE.Box3().setFromObject(this.piece.root);
    const size = box.getSize(new THREE.Vector3());
    const r = Math.max(size.x, size.y, size.z, 1.7);
    this.controls.target.set(0, Math.min(size.y / 2, 1), 0);
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    this.camera.position.copy(this.controls.target).addScaledVector(dir, r * 1.9 + 0.8);
  }

  private frame(dt: number) {
    const b = this.piece;
    if (b) {
      if (b.screen) (b.screen.material as THREE.MeshBasicMaterial).color.set(this.inUse ? '#bfe6ff' : '#2a3140');
      if (b.inUse) b.inUse.visible = this.inUse;
      for (const d of b.doors ?? []) d.rotation.y = this.inUse ? (d.userData.swing as number) * 1.9 : 0;
      if (b.animate && this.inUse) b.animate(this.clock);
      if (b.cover) b.cover.shape(this.inUse ? [0] : []);
    }
    this.marks.visible = this.showMarks;
    if (this.person) {
      this.person.root.visible = this.showPerson;
      // Beside it, to its right as you face it, clear of what's drawn.
      const w = b ? new THREE.Box3().setFromObject(b.root).max.x : 0.5;
      this.person.update({ pose: { kind: 'stand', at: new THREE.Vector3(w + 0.45, 0, 0.2), yaw: -0.4 }, expr: 'smile', asleep: false, active: false }, dt, this.clock, this.camera);
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.controls.dispose();
    this.person?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

/** Thumbnails of furniture, drawn one at a time off screen and kept as image URLs. */
export class Thumbnails {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.05, 100);
  private cache = new Map<string, string>();

  constructor(readonly size = 112) {}

  get(def: ObjectDef): string {
    const hit = this.cache.get(def.id);
    if (hit) return hit;
    if (!this.renderer) {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
      this.renderer.setSize(this.size, this.size);
      this.scene.background = new THREE.Color('#f4efe6');
      lights(this.scene);
    }
    const b = buildFurniture(def, { againstWall: false });
    this.scene.add(b.root);
    const box = new THREE.Box3().setFromObject(b.root);
    const c = box.getCenter(new THREE.Vector3());
    const r = box.getSize(new THREE.Vector3()).length() / 2;
    this.camera.position.copy(c).add(new THREE.Vector3(0.75, 0.55, 1).normalize().multiplyScalar(r / Math.sin(THREE.MathUtils.degToRad(15)) * 0.95));
    this.camera.lookAt(c);
    this.renderer.render(this.scene, this.camera);
    const url = this.renderer.domElement.toDataURL('image/png');
    b.root.removeFromParent();
    this.cache.set(def.id, url);
    return url;
  }

  dispose() {
    this.renderer?.dispose();
  }
}
