import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { FigureLook } from '../dweller3d/figure';
import { ShapeAvatar, VrmAvatar, type Avatar, type BodyPose } from './avatar';
import { buildFurniture } from './furniture3d';
import { getDef } from '../game/catalog';
import { loadDressed, loadWearing, partsOf, type Dress, type Part, type Piece } from './vrmDress';

/**
 * The wardrobe's stage (src/ui/Wardrobe.tsx; ours, a tool for while the 3D is being made): one dweller
 * in front of the fitting room and a mirror, turned with the mouse, standing, walking on the spot
 * or sitting, in whatever they're shown in; changing clothes, they step into the fitting room, the
 * curtain is drawn and they come out changed.
 */
/**
 * A VRoid body: in `dress`, or in a new garment set (`garment`, garments.ts), or its bare skeleton
 * (`bones`: every mesh hidden, the bones drawn, the body's own ones in red).
 */
export type WardrobeBody = { kind: 'shape'; look: FigureLook } | { kind: 'vroid'; file: string; dress?: Dress; garment?: string; bones?: boolean };
export type WardrobePose = 'stand' | 'walk' | 'sit';

export class WardrobeView {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
  private controls: OrbitControls;
  private avatar: Avatar | null = null;
  private key = '';
  private raf = 0;
  private clock = 0;
  pose: WardrobePose = 'stand';
  /** Changing: walked into the fitting room, out again with `next` on. */
  private change: { t: number; next: WardrobeBody; swapped: boolean } | null = null;
  private chair: THREE.Object3D;
  private skeleton: THREE.Object3D | null = null;
  /** Where the body is now shown from (its description) and its clothing's parts, once loaded. */
  onLoaded?: (body: WardrobeBody, info: string, parts: Partial<Record<Piece, Part[]>>) => void;

  constructor(readonly host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    host.append(this.renderer.domElement);
    this.scene.background = new THREE.Color('#f3ece2');
    this.scene.add(new THREE.HemisphereLight('#f4f9ff', '#b8a98f', 1.4));
    const sun = new THREE.DirectionalLight('#fff3dc', 2.0);
    sun.position.set(2, 5, 4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    this.scene.add(sun);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(4, 40), new THREE.MeshToonMaterial({ color: '#e6dccb' }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    // The fitting room behind and to the left, a mirror to the right, a chair to sit on.
    const room = buildFurniture(getDef('fittingRoom'), { againstWall: false }).root;
    room.position.set(-1.0, 0, -0.9);
    const mirror = buildFurniture(getDef('mirror'), { againstWall: false }).root;
    mirror.position.set(1.0, 0, -0.7);
    mirror.rotation.y = -0.4;
    this.chair = buildFurniture(getDef('diningChair'), { againstWall: false }).root;
    this.chair.position.set(0, 0, -0.1);
    this.chair.visible = false;
    this.scene.add(room, mirror, this.chair);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0, 0.9, 0);
    this.camera.position.set(0.6, 1.3, 3.6);
    this.resize();
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

  resize() {
    const w = Math.max(1, this.host.clientWidth);
    const h = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Shows a body straight away (the first one), or walks into the fitting room to change into it. */
  wear(body: WardrobeBody, viaRoom = true) {
    const key = JSON.stringify(body);
    if (key === this.key && !this.change) return;
    if (!this.avatar || !viaRoom) {
      void this.load(body);
      return;
    }
    this.change = { t: 0, next: body, swapped: false };
  }

  private async load(body: WardrobeBody) {
    const key = JSON.stringify(body);
    this.key = key;
    let av: Avatar;
    let info = '';
    let parts: Partial<Record<Piece, Part[]>> = {};
    if (body.kind === 'vroid') {
      try {
        const vrm = body.garment ? await loadWearing(body.file, body.garment) : await loadDressed(body.file, body.dress ?? {});
        if (this.key !== key) return;
        av = new VrmAvatar(vrm, 1);
        if (body.bones) this.showBones(vrm.scene);
        parts = partsOf(vrm);
        const meshes: string[] = [];
        vrm.scene.traverse((o) => ((o as THREE.Mesh).isMesh ? meshes.push(o.name) : undefined));
        info = body.bones ? `${body.file} · 뼈 ${this.boneCount}개 (빨강: 몸, 회색: 머리카락·옷)` : `${body.file}${body.garment ? ` + ${body.garment}` : ''} · 메시 ${meshes.length}개`;
      } catch {
        info = `${body.file}을(를) 불러오지 못했어요`;
        return;
      }
    } else av = new ShapeAvatar(body.look);
    if (!(body.kind === 'vroid' && body.bones)) this.clearBones();
    this.avatar?.dispose();
    this.avatar = av;
    this.scene.add(av.root);
    this.onLoaded?.(body, info, parts);
  }

  private boneCount = 0;
  /** Hides every mesh and draws the skeleton: a line per bone, a dot per joint. */
  private showBones(root: THREE.Object3D) {
    this.clearBones();
    const bones: THREE.Bone[] = [];
    root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.visible = false;
      if ((o as THREE.Bone).isBone) bones.push(o as THREE.Bone);
    });
    this.boneCount = bones.length;
    const body = /^(Root$|J_Bip_|J_Adj_)/;
    const dot = new THREE.SphereGeometry(0.012, 8, 6);
    const red = new THREE.MeshBasicMaterial({ color: '#d32f2f', depthTest: false });
    const grey = new THREE.MeshBasicMaterial({ color: '#78909c', depthTest: false });
    for (const b of bones) {
      const m = new THREE.Mesh(dot, body.test(b.name) ? red : grey);
      m.renderOrder = 10;
      m.name = '(joint)';
      b.add(m);
    }
    const helper = new THREE.SkeletonHelper(root);
    (helper.material as THREE.LineBasicMaterial).depthTest = false;
    helper.renderOrder = 9;
    this.skeleton = helper;
    this.scene.add(helper);
  }

  private clearBones() {
    if (!this.skeleton) return;
    this.scene.remove(this.skeleton);
    (this.skeleton as THREE.SkeletonHelper).dispose();
    this.skeleton = null;
  }

  private frame(dt: number) {
    const ch = this.change;
    const room = new THREE.Vector3(-1.0, 0, -0.75);
    const spot = new THREE.Vector3(0, 0, 0.25);
    let pose: BodyPose;
    if (ch) {
      // Over there and in (1.2 s), curtain drawn, then back out (1.2 s).
      ch.t += dt;
      const go = Math.min(1, ch.t / 1.2);
      const back = Math.max(0, Math.min(1, (ch.t - 1.8) / 1.2));
      if (ch.t > 1.4 && !ch.swapped) {
        ch.swapped = true;
        void this.load(ch.next);
      }
      const at = ch.t < 1.8 ? spot.clone().lerp(room, go) : room.clone().lerp(spot, back);
      const yaw = ch.t < 1.8 ? Math.atan2(room.x - spot.x, room.z - spot.z) : back < 1 ? Math.atan2(spot.x - room.x, spot.z - room.z) : 0;
      pose = { kind: (ch.t < 1.2 || (ch.t > 1.8 && back < 1)) ? 'walk' : 'stand', at, yaw };
      if (this.avatar) this.avatar.root.visible = !(ch.t > 1.2 && ch.t < 1.8);
      if (ch.t > 3.1) {
        this.change = null;
        if (this.avatar) this.avatar.root.visible = true;
      }
    } else if (this.pose === 'sit') {
      pose = { kind: 'sit', at: new THREE.Vector3(0, 0.47, -0.08), yaw: 0, floor: 0 };
    } else pose = { kind: this.pose, at: spot.clone(), yaw: 0, pace: this.pose === 'walk' ? 1.2 : 0 };
    this.chair.visible = this.pose === 'sit' && !ch;
    this.avatar?.update({ pose, expr: 'smile', asleep: false, active: false }, dt, this.clock, this.camera);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.clearBones();
    this.controls.dispose();
    this.avatar?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
