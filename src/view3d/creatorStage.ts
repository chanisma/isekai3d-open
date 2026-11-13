import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { LoadingAvatar, ShapeAvatar, VrmAvatar, type Avatar } from './avatar';
import { loadDressed, partsOf, type Part, type Piece } from './vrmDress';
import type { WardrobeBody } from './wardrobe3d';

/**
 * Character creation's stage (2026-10-20, ui/CharacterCreator.tsx): the arcade's night (arcadeScene.ts)
 * — a starry navy room, a gold ring of light on the floor, drifting sparkles — and the character on
 * a round gold-rimmed dais, turned by dragging, with a shimmer of gold whenever they change. The
 * camera frames the whole body, or comes up to the face for hair and eyes; it keeps the character
 * left of the panel on the right (`setShift`).
 */
type Focus = 'body' | 'face';

const FRAMES: Record<Focus, { pos: THREE.Vector3; look: THREE.Vector3 }> = {
  body: { pos: new THREE.Vector3(0, 1.2, 4.55), look: new THREE.Vector3(0, 0.86, 0) },
  face: { pos: new THREE.Vector3(0, 1.5, 1.75), look: new THREE.Vector3(0, 1.36, 0) },
};
const DAIS = 0.14;

function canvasTexture(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class CreatorStage {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.05, 60);
  private timer = new THREE.Timer();
  private avatar: Avatar | null = null;
  private key = '';
  private yaw = 0;
  private spin = 0;
  private dragging = false;
  private focus: Focus = 'body';
  private camPos = FRAMES.body.pos.clone();
  private camLook = FRAMES.body.look.clone();
  private shift = 0;
  private sparkles: THREE.Points;
  private burst: { ring: THREE.Mesh; motes: THREE.Points; t: number } | null = null;
  private textures: THREE.Texture[] = [];
  private disposed = false;
  /** The clothes' parts once a VRoid character is dressed (for their colours); `ok` false when the body couldn't be loaded. */
  onLoaded?: (parts: Partial<Record<Piece, Part[]>>, ok: boolean, body: WardrobeBody) => void;
  /** A VRoid character is on its way (true) or has come or failed (false). */
  onLoading?: (loading: boolean) => void;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.3;
    pmrem.dispose();

    this.scene.background = this.track(
      canvasTexture(16, 512, (c) => {
        const g = c.createLinearGradient(0, 0, 0, 512);
        g.addColorStop(0, '#060b1f');
        g.addColorStop(0.5, '#14235a');
        g.addColorStop(0.78, '#2b3f88');
        g.addColorStop(1, '#0b1129');
        c.fillStyle = g;
        c.fillRect(0, 0, 16, 512);
      }),
    );
    this.scene.fog = new THREE.Fog(0x0b1129, 7, 18);
    this.buildRoom();
    this.sparkles = this.makeSparkles();

    this.resize();
    window.addEventListener('resize', this.resize);
    canvas.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    this.renderer.setAnimationLoop(this.loop);
  }

  private track<T extends THREE.Texture>(t: T): T {
    this.textures.push(t);
    return t;
  }

  private buildRoom() {
    const floor = new THREE.Mesh(new THREE.CircleGeometry(10, 64), new THREE.MeshStandardMaterial({ color: 0x0c1330, roughness: 0.5 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    for (const [r, o] of [
      [1.05, 0.6],
      [1.45, 0.28],
      [2.1, 0.12],
    ] as const) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.018, 128), new THREE.MeshBasicMaterial({ color: 0xf0d48a, transparent: true, opacity: o }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.002;
      this.scene.add(ring);
    }
    // The dais: navy lacquer with a gold rim and a compass star on top.
    const star = this.track(
      canvasTexture(512, 512, (c) => {
        c.fillStyle = '#16224d';
        c.fillRect(0, 0, 512, 512);
        c.translate(256, 256);
        c.strokeStyle = 'rgba(217, 180, 95, 0.75)';
        c.lineWidth = 3;
        for (const r of [230, 200]) {
          c.beginPath();
          c.arc(0, 0, r, 0, Math.PI * 2);
          c.stroke();
        }
        c.fillStyle = 'rgba(217, 180, 95, 0.8)';
        for (let i = 0; i < 8; i++) {
          const r = i % 2 ? 90 : 180;
          c.beginPath();
          c.moveTo(0, -r);
          c.lineTo(16, 0);
          c.lineTo(0, 16);
          c.lineTo(-16, 0);
          c.closePath();
          c.fill();
          c.rotate(Math.PI / 4);
        }
      }),
    );
    const lacquer = new THREE.MeshPhysicalMaterial({ color: 0x16224d, roughness: 0.4, clearcoat: 0.8 });
    const top = new THREE.MeshPhysicalMaterial({ map: star, roughness: 0.45, clearcoat: 0.6 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xd9b45f, roughness: 0.28, metalness: 1 });
    const dais = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.68, DAIS, 64), [lacquer, top, lacquer]);
    dais.position.y = DAIS / 2;
    dais.receiveShadow = true;
    dais.castShadow = true;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.625, 0.014, 10, 96), gold);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = DAIS;
    const foot = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.012, 10, 96), gold);
    foot.rotation.x = Math.PI / 2;
    foot.position.y = 0.01;
    this.scene.add(dais, rim, foot);

    this.scene.add(new THREE.HemisphereLight(0x7088e0, 0x0a0a1a, 0.55));
    const key = new THREE.SpotLight(0xfff1d6, 30, 10, Math.PI / 7, 0.5, 1.5);
    key.position.set(-1.6, 4, 2.6);
    key.target.position.set(0, 0.9, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0004;
    this.scene.add(key, key.target);
    const rim2 = new THREE.SpotLight(0x6f8cff, 30, 8, Math.PI / 6, 0.7, 1.5);
    rim2.position.set(1.6, 2.8, -2.4);
    rim2.target.position.set(0, 1.1, 0);
    this.scene.add(rim2, rim2.target);
    const fill = new THREE.PointLight(0xf6dd98, 2.4, 6, 1.6);
    fill.position.set(1.2, 1.4, 2);
    this.scene.add(fill);
  }

  private dot() {
    return this.track(
      canvasTexture(64, 64, (c) => {
        const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
        g.addColorStop(0, 'rgba(255,248,220,1)');
        g.addColorStop(0.25, 'rgba(248,227,164,0.8)');
        g.addColorStop(1, 'rgba(248,227,164,0)');
        c.fillStyle = g;
        c.fillRect(0, 0, 64, 64);
      }),
    );
  }

  private makeSparkles(): THREE.Points {
    const n = 460;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 2.6 + Math.random() * 7;
      const a = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = 0.2 + Math.random() * 5.5;
      pos[i * 3 + 2] = Math.sin(a) * r - 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.07, map: this.dot(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffe6a8 }));
    this.scene.add(pts);
    return pts;
  }

  /** A ring of gold rising round the dais, with motes: the character changing. */
  private shimmer() {
    if (this.burst) {
      this.scene.remove(this.burst.ring, this.burst.motes);
      this.burst.ring.geometry.dispose();
      this.burst.motes.geometry.dispose();
    }
    // A thin gold ring that rises from the dais and fades (not a glass column).
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.6, 0.012, 8, 96),
      new THREE.MeshBasicMaterial({ color: 0xf8e3a4, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = DAIS + 0.02;
    const n = 70;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.3 + Math.random() * 0.4;
      pos.set([Math.cos(a) * r, DAIS + Math.random() * 0.4, Math.sin(a) * r], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const motes = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.05, map: this.dot(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff1c4 }));
    this.scene.add(ring, motes);
    this.burst = { ring, motes, t: 0 };
  }

  /** A gold glow on the dais while there's nothing to show yet (the characters' list, the first face). */
  wait() {
    if (this.key) return;
    if (this.avatar instanceof LoadingAvatar) return;
    this.avatar?.dispose();
    this.avatar = new LoadingAvatar('adult');
    this.scene.add(this.avatar.root);
  }

  /** Puts a body on the dais (a VRoid character or the shape figure), with a shimmer if it changed. */
  show(body: WardrobeBody) {
    const key = JSON.stringify(body);
    if (key === this.key) return;
    const first = !this.key;
    this.key = key;
    void this.load(body, key, first);
  }

  private async load(body: WardrobeBody, key: string, first: boolean) {
    let av: Avatar;
    let parts: Partial<Record<Piece, Part[]>> = {};
    if (body.kind === 'vroid') {
      this.onLoading?.(true);
      try {
        const vrm = await loadDressed(body.file, body.dress ?? {});
        if (this.key !== key || this.disposed) return;
        av = new VrmAvatar(vrm, 1);
        parts = partsOf(vrm);
      } catch {
        if (this.key !== key || this.disposed) return;
        // Asked for again if the same body is shown later.
        this.key = '';
        this.onLoading?.(false);
        this.onLoaded?.({}, false, body);
        return;
      }
      this.onLoading?.(false);
    } else av = new ShapeAvatar(body.look);
    if (this.disposed) return void av.dispose();
    this.avatar?.dispose();
    this.avatar = av;
    av.root.traverse((o) => ((o as THREE.Mesh).isMesh ? ((o as THREE.Mesh).castShadow = true) : undefined));
    this.scene.add(av.root);
    if (!first) this.shimmer();
    this.onLoaded?.(parts, true, body);
  }

  /** Whole body, or up close to the face (hair, eyes). */
  setFocus(f: Focus) {
    this.focus = f;
  }

  /** How far (px) the character stands left of the window's middle, to clear the panel. */
  setShift(px: number) {
    this.shift = px;
    this.resize();
  }

  /** A quarter turn, from the buttons. */
  turn(by: number) {
    this.yaw += by;
  }

  private onDown = (e: PointerEvent) => {
    this.dragging = true;
    this.spin = e.clientX;
  };
  private onMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    this.yaw += (e.clientX - this.spin) * 0.012;
    this.spin = e.clientX;
  };
  private onUp = () => {
    this.dragging = false;
  };

  private resize = () => {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Shifting the view, not the camera: the character stays square to the camera.
    if (this.shift) this.camera.setViewOffset(w, h, this.shift, 0, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  };

  private loop = (time: number) => {
    if (this.disposed) return;
    this.timer.update(time);
    const dt = Math.min(this.timer.getDelta(), 0.1);
    const t = this.timer.getElapsed();
    const f = FRAMES[this.focus];
    const k = 1 - Math.pow(0.0025, dt);
    this.camPos.lerp(f.pos, k);
    this.camLook.lerp(f.look, k);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
    if (this.avatar) {
      const h = this.avatar.height;
      // Up close the face is framed whatever the character's height.
      const lift = this.focus === 'face' ? h + DAIS - 1.58 : 0;
      this.camera.position.y += lift;
      this.camera.lookAt(this.camLook.clone().setY(this.camLook.y + lift));
      const idle = this.dragging ? 0 : Math.sin(t * 0.4) * 0.12;
      this.avatar.update({ pose: { kind: 'stand', at: new THREE.Vector3(0, DAIS, 0), yaw: this.yaw + idle }, expr: 'smile', asleep: false, active: false }, dt, t, this.camera);
    }
    if (this.burst) {
      const b = this.burst;
      b.t += dt;
      const p = Math.min(1, b.t / 0.9);
      b.ring.scale.setScalar(1 - p * 0.25);
      b.ring.position.y = DAIS + 0.02 + p * 1.7;
      (b.ring.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - p);
      b.motes.position.y = p * 1.6;
      (b.motes.material as THREE.PointsMaterial).opacity = 1 - p;
      if (p >= 1) {
        this.scene.remove(b.ring, b.motes);
        b.ring.geometry.dispose();
        b.motes.geometry.dispose();
        this.burst = null;
      }
    }
    this.sparkles.rotation.y = t * 0.012;
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    window.removeEventListener('resize', this.resize);
    this.canvas.removeEventListener('pointerdown', this.onDown);
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    this.avatar?.dispose();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      for (const mat of mats) mat.dispose();
    });
    for (const t of this.textures) t.dispose();
    this.scene.environment?.dispose();
    this.renderer.dispose();
  }
}
