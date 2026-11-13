import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import titleBgUrl from '../assets/title/title-bg.jpg';
import titleLogoUrl from '../assets/title/title-logo.webp';
import emblemUrl from '../assets/ui/emblem.webp';
import sideUrl from '../assets/arcade/side.webp';
import marqueeUrl from '../assets/arcade/marquee.webp';

/**
 * The arcade machine the game opens on (2026-10-20, docs/ref-game/11-ui.md §8): an upright cabinet after
 * the Codex design sheet (art/arcade/design-sheet.png): navy lacquer with gold edging, the compass
 * star on its sides (side-art), a lit marquee with the game's logo, the title art on its screen, a
 * stick and six buttons, a coin door with two gold slots. A coin goes in, then the camera flies into
 * the screen until the screen is the whole window, where the real title (the same picture, framed
 * the same way as .title-art) takes over.
 */

const W = 0.72; // cabinet width (m)
const T = 0.026; // side panel thickness
const INNER = W - 2 * T;
/** The side profile, (z forward, y up), going round from the back foot. */
const PROFILE: Array<[number, number]> = [
  [-0.42, 0],
  [0.4, 0],
  [0.4, 0.1],
  [0.37, 0.1],
  [0.37, 0.84],
  [0.47, 0.88],
  [0.47, 0.96],
  [0.24, 1.02],
  [0.1, 1.48],
  [0.2, 1.53],
  [0.21, 1.8],
  [-0.42, 1.74],
];
/** Which profile edges carry what (index of the edge's first point). */
const FACE = { door: 3, panelFront: 5, panel: 6, screen: 7, marquee: 9 } as const;

const NAVY = 0x16224d;
const GOLD = 0xd9b45f;
const TITLE_ASPECT = 1672 / 941;
const SCREEN_W = 0.56;
const SCREEN_H = SCREEN_W / TITLE_ASPECT;

function canvasTexture(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** A frame on one front face of the cabinet: x across, y up the face, z out of it. */
function faceFrame(edge: number, inset = 0.0015): { group: THREE.Group; length: number } {
  let [az, ay] = PROFILE[edge];
  let [bz, by] = PROFILE[edge + 1];
  if (by < ay) [az, ay, bz, by] = [bz, by, az, ay];
  const up = new THREE.Vector3(0, by - ay, bz - az);
  const length = up.length();
  up.normalize();
  let normal = new THREE.Vector3(0, -up.z, up.y);
  if (normal.z + normal.y < 0) normal = normal.negate();
  const group = new THREE.Group();
  group.matrixAutoUpdate = false;
  const basis = new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), up, normal);
  const centre = new THREE.Vector3(0, (ay + by) / 2, (az + bz) / 2).addScaledVector(normal, inset);
  group.matrix.copy(basis).setPosition(centre);
  return { group, length };
}

export class ArcadeScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, 1, 0.01, 60);
  private cabinet = new THREE.Group();
  private timer = new THREE.Timer();
  private frame = 0;
  private disposed = false;
  private pointer = new THREE.Vector2();
  /** Idle sway, or a flight the camera is on. */
  private flight: { from: THREE.Vector3; to: THREE.Vector3; look0: THREE.Vector3; look1: THREE.Vector3; up0: THREE.Vector3; up1: THREE.Vector3; t: number; dur: number; done: () => void } | null = null;
  private zoomed = false;
  private coin: THREE.Mesh;
  private coinFlight: { t: number; dur: number; path: THREE.CubicBezierCurve3; slot: THREE.Vector3; done: () => void } | null = null;
  private label: { tex: THREE.CanvasTexture; mat: THREE.MeshBasicMaterial; text: string; draw: (text: string) => void };
  private slotGlow: THREE.MeshBasicMaterial;
  private screenMat: THREE.MeshBasicMaterial;
  private flash = 0;
  private sparkles: THREE.Points;
  private screenGroup: THREE.Group;
  private slotGroup: THREE.Group;
  private textures: THREE.Texture[] = [];
  private audio: AudioContext | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.28;
    pmrem.dispose();

    this.scene.background = this.track(
      canvasTexture(16, 512, (c) => {
        const g = c.createLinearGradient(0, 0, 0, 512);
        g.addColorStop(0, '#060b1f');
        g.addColorStop(0.55, '#14235a');
        g.addColorStop(0.8, '#2b3f88');
        g.addColorStop(1, '#0b1129');
        c.fillStyle = g;
        c.fillRect(0, 0, 16, 512);
      }),
    );
    this.scene.fog = new THREE.Fog(0x0b1129, 6, 16);

    this.buildRoom();
    this.buildCabinet();
    this.screenGroup = this.cabinet.getObjectByName('screen') as THREE.Group;
    this.slotGroup = this.cabinet.getObjectByName('slot') as THREE.Group;
    this.screenMat = (this.screenGroup.getObjectByName('display') as THREE.Mesh).material as THREE.MeshBasicMaterial;
    this.slotGlow = (this.slotGroup.getObjectByName('slotGlow') as THREE.Mesh).material as THREE.MeshBasicMaterial;
    this.label = this.makeLabel();
    this.coin = this.makeCoin();
    this.sparkles = this.makeSparkles();

    this.camera.position.copy(this.idlePosition(0));
    this.camera.lookAt(this.idleLook());

    this.resize();
    window.addEventListener('resize', this.resize);
    window.addEventListener('pointermove', this.onPointer);
    this.renderer.setAnimationLoop(this.loop);
  }

  private track<T extends THREE.Texture>(t: T): T {
    this.textures.push(t);
    return t;
  }

  private texture(url: string, after?: (t: THREE.Texture) => void): THREE.Texture {
    const t = new THREE.TextureLoader().load(url, (tex) => after?.(tex));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return this.track(t);
  }

  // ---------- the room ----------

  private buildRoom() {
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(9, 64),
      new THREE.MeshStandardMaterial({ color: 0x0c1330, roughness: 0.5, metalness: 0 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);
    // A gold ring of light on the floor under the machine, like the title's compass.
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.78, 0.8, 96),
      new THREE.MeshBasicMaterial({ color: 0xf0d48a, transparent: true, opacity: 0.55 }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.002;
    this.scene.add(ring);
    const ring2 = ring.clone();
    ring2.scale.setScalar(1.25);
    (ring2.material as THREE.MeshBasicMaterial) = new THREE.MeshBasicMaterial({ color: 0xf0d48a, transparent: true, opacity: 0.22 });
    this.scene.add(ring2);

    this.scene.add(new THREE.HemisphereLight(0x7088e0, 0x0a0a1a, 0.3));
    const key = new THREE.SpotLight(0xfff1d6, 38, 9, Math.PI / 7, 0.55, 1.6);
    key.position.set(-1.6, 3.6, 2.4);
    key.target.position.set(0, 0.9, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0004;
    this.scene.add(key, key.target);
    const rim = new THREE.SpotLight(0x6f8cff, 26, 8, Math.PI / 6, 0.7, 1.6);
    rim.position.set(1.8, 2.6, -2.2);
    rim.target.position.set(0, 1, 0);
    this.scene.add(rim, rim.target);
    const fill = new THREE.PointLight(0xf6dd98, 1.6, 5, 1.8);
    fill.position.set(1.4, 1.2, 1.6);
    this.scene.add(fill);
  }

  private makeSparkles(): THREE.Points {
    const n = 420;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 3 + Math.random() * 6;
      const a = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = 0.2 + Math.random() * 5.5;
      pos[i * 3 + 2] = Math.sin(a) * r - 1.5;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dot = this.track(
      canvasTexture(64, 64, (c) => {
        const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
        g.addColorStop(0, 'rgba(255,248,220,1)');
        g.addColorStop(0.25, 'rgba(248,227,164,0.8)');
        g.addColorStop(1, 'rgba(248,227,164,0)');
        c.fillStyle = g;
        c.fillRect(0, 0, 64, 64);
      }),
    );
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.07, map: dot, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffe6a8 }));
    this.scene.add(pts);
    return pts;
  }

  // ---------- the cabinet ----------

  private buildCabinet() {
    const lacquer = new THREE.MeshPhysicalMaterial({ color: NAVY, roughness: 0.42, metalness: 0.1, clearcoat: 0.8, clearcoatRoughness: 0.25 });
    const gold = new THREE.MeshStandardMaterial({ color: GOLD, roughness: 0.28, metalness: 1 });
    const shape = new THREE.Shape(PROFILE.map(([z, y]) => new THREE.Vector2(-z, y)));

    // The body between the side panels.
    const bodyGeo = new THREE.ExtrudeGeometry(shape, { depth: INNER, bevelEnabled: false });
    bodyGeo.rotateY(Math.PI / 2);
    bodyGeo.translate(-INNER / 2, 0, 0);
    const body = new THREE.Mesh(bodyGeo, lacquer);
    body.castShadow = true;
    body.receiveShadow = true;
    this.cabinet.add(body);

    // The side panels with the compass art.
    const zs = PROFILE.map((p) => p[0]);
    const zMin = Math.min(...zs);
    const zMax = Math.max(...zs);
    const yMax = Math.max(...PROFILE.map((p) => p[1]));
    const side = this.texture(sideUrl);
    const sideMat = new THREE.MeshPhysicalMaterial({ map: side, roughness: 0.45, metalness: 0.15, clearcoat: 0.7, clearcoatRoughness: 0.3 });
    for (const sign of [-1, 1]) {
      const geo = new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: false });
      geo.rotateY(Math.PI / 2);
      geo.translate(sign < 0 ? -W / 2 : W / 2 - T, 0, 0);
      // Caps (group 0) get the art across the whole profile, read the right way from outside.
      const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
      const p = geo.getAttribute('position') as THREE.BufferAttribute;
      const cap = geo.groups[0];
      for (let i = cap.start; i < cap.start + cap.count; i++) {
        const idx = geo.index ? geo.index.getX(i) : i;
        const z = p.getZ(idx);
        const u = sign < 0 ? (z - zMin) / (zMax - zMin) : (zMax - z) / (zMax - zMin);
        uv.setXY(idx, u, p.getY(idx) / yMax);
      }
      uv.needsUpdate = true;
      const mesh = new THREE.Mesh(geo, [sideMat, lacquer]);
      mesh.castShadow = true;
      this.cabinet.add(mesh);

      // Gold edging round the panel (T-molding).
      const x = sign * (W / 2 - T / 2);
      const path = new THREE.CurvePath<THREE.Vector3>();
      PROFILE.forEach(([z, y], i) => {
        const [z2, y2] = PROFILE[(i + 1) % PROFILE.length];
        path.add(new THREE.LineCurve3(new THREE.Vector3(x, y, z), new THREE.Vector3(x, y2, z2)));
      });
      const trim = new THREE.Mesh(new THREE.TubeGeometry(path, 900, T * 0.62, 8, true), gold);
      trim.castShadow = true;
      this.cabinet.add(trim);
    }

    // Plinth and top: gold strips across the front.
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(INNER, 0.014, 0.012), gold);
    plinth.position.set(0, 0.1, 0.4);
    this.cabinet.add(plinth);

    this.buildScreen(gold);
    this.buildMarquee(gold);
    this.buildPanel(gold);
    this.buildDoor(gold);
    this.scene.add(this.cabinet);
  }

  private buildScreen(gold: THREE.Material) {
    const { group, length } = faceFrame(FACE.screen);
    group.name = 'screen';
    const bezel = new THREE.Mesh(
      new THREE.PlaneGeometry(INNER - 0.02, length - 0.03),
      new THREE.MeshBasicMaterial({ color: 0x060a1c }),
    );
    group.add(bezel);
    const frame = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN_W + 0.024, SCREEN_H + 0.024), gold);
    frame.position.z = 0.001;
    group.add(frame);
    const display = new THREE.Mesh(
      new THREE.PlaneGeometry(SCREEN_W, SCREEN_H),
      new THREE.MeshBasicMaterial({ map: this.texture(titleBgUrl), toneMapped: false, color: 0xdddddd }),
    );
    display.name = 'display';
    display.position.z = 0.002;
    group.add(display);
    const glow = new THREE.PointLight(0xbcd2ff, 1.4, 1.6, 2);
    glow.position.set(0, 0, 0.25);
    group.add(glow);
    this.cabinet.add(group);
  }

  private buildMarquee(gold: THREE.Material) {
    const { group, length } = faceFrame(FACE.marquee);
    const h = Math.min(length - 0.03, (INNER - 0.03) / 3);
    const tex = this.track(canvasTexture(1536, 512, () => undefined));
    const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
    void Promise.all([loadImage(marqueeUrl), loadImage(titleLogoUrl)]).then(([art, logo]) => {
      const c = (tex.image as HTMLCanvasElement).getContext('2d')!;
      c.drawImage(art, 0, 0, 1536, 512);
      const lh = 400;
      const lw = (logo.width / logo.height) * lh;
      c.shadowColor = 'rgba(248, 227, 164, 0.75)';
      c.shadowBlur = 28;
      c.drawImage(logo, (1536 - lw) / 2, (512 - lh) / 2, lw, lh);
      tex.needsUpdate = true;
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(INNER - 0.03, h), mat);
    group.add(sign);
    const frame = new THREE.Mesh(new THREE.PlaneGeometry(INNER - 0.01, h + 0.02), gold);
    frame.position.z = -0.001;
    group.add(frame);
    const warm = new THREE.PointLight(0xf6dd98, 0.8, 1.2, 2);
    warm.position.set(0, 0, 0.2);
    group.add(warm);
    this.cabinet.add(group);
  }

  private buildPanel(gold: THREE.Material) {
    const { group, length } = faceFrame(FACE.panel);
    const top = this.track(
      canvasTexture(1024, 256, (c) => {
        c.fillStyle = '#16224d';
        c.fillRect(0, 0, 1024, 256);
        c.strokeStyle = '#d9b45f';
        c.lineWidth = 4;
        c.strokeRect(14, 14, 996, 228);
        c.lineWidth = 1.5;
        c.strokeRect(24, 24, 976, 208);
        // a compass star in the middle
        c.translate(512, 128);
        c.fillStyle = 'rgba(217, 180, 95, 0.85)';
        for (let i = 0; i < 8; i++) {
          const r = i % 2 ? 46 : 92;
          c.beginPath();
          c.moveTo(0, -r);
          c.lineTo(9, 0);
          c.lineTo(0, 9);
          c.lineTo(-9, 0);
          c.closePath();
          c.fill();
          c.rotate(Math.PI / 4);
        }
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.strokeStyle = 'rgba(217, 180, 95, 0.5)';
        c.beginPath();
        c.moveTo(150, 128);
        c.lineTo(400, 128);
        c.moveTo(624, 128);
        c.lineTo(874, 128);
        c.stroke();
      }),
    );
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(INNER, length), new THREE.MeshPhysicalMaterial({ map: top, roughness: 0.35, clearcoat: 0.8 }));
    group.add(plate);

    // The stick: a gold base, a shaft and a navy ball.
    const stick = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.008, 32), gold);
    base.rotation.x = Math.PI / 2;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.07, 12), gold);
    shaft.rotation.x = Math.PI / 2;
    shaft.position.z = 0.035;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.022, 32, 16), new THREE.MeshPhysicalMaterial({ color: 0x1d2b62, roughness: 0.15, clearcoat: 1 }));
    ball.position.z = 0.075;
    stick.add(base, shaft, ball);
    stick.position.set(-0.19, 0, 0.004);
    group.add(stick);

    // Six buttons, two rows of three.
    const cap = new THREE.MeshPhysicalMaterial({ color: 0xf0d48a, roughness: 0.2, metalness: 0.6, clearcoat: 1 });
    for (let r = 0; r < 2; r++) {
      for (let i = 0; i < 3; i++) {
        const ringMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.006, 28), gold);
        ringMesh.rotation.x = Math.PI / 2;
        const button = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.017, 0.012, 28), cap);
        button.rotation.x = Math.PI / 2;
        button.position.z = 0.006;
        const b = new THREE.Group();
        b.add(ringMesh, button);
        b.position.set(0.06 + i * 0.062 + r * 0.018, (r ? -1 : 1) * 0.026, 0.004);
        group.add(b);
      }
    }
    this.cabinet.add(group);

    // The panel's front edge in gold.
    const front = faceFrame(FACE.panelFront);
    front.group.add(new THREE.Mesh(new THREE.PlaneGeometry(INNER, front.length * 0.7), gold));
    this.cabinet.add(front.group);
  }

  private buildDoor(gold: THREE.Material) {
    const { group } = faceFrame(FACE.door);
    group.name = 'slot';
    const doorTex = this.track(
      canvasTexture(512, 560, (c) => {
        c.fillStyle = '#121c45';
        c.fillRect(0, 0, 512, 560);
        c.strokeStyle = '#d9b45f';
        c.lineWidth = 6;
        c.strokeRect(10, 10, 492, 540);
        c.lineWidth = 2;
        c.strokeRect(26, 26, 460, 508);
        // corner flourishes
        c.strokeStyle = 'rgba(217, 180, 95, 0.8)';
        for (const [x, y, sx, sy] of [
          [26, 26, 1, 1],
          [486, 26, -1, 1],
          [26, 534, 1, -1],
          [486, 534, -1, -1],
        ]) {
          c.beginPath();
          c.moveTo(x, y + sy * 60);
          c.quadraticCurveTo(x, y, x + sx * 60, y);
          c.stroke();
        }
        c.fillStyle = 'rgba(217, 180, 95, 0.9)';
        c.translate(256, 480);
        for (let i = 0; i < 4; i++) {
          c.beginPath();
          c.moveTo(0, -26);
          c.lineTo(6, 0);
          c.lineTo(-6, 0);
          c.closePath();
          c.fill();
          c.rotate(Math.PI / 2);
        }
      }),
    );
    const door = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.44), new THREE.MeshPhysicalMaterial({ map: doorTex, roughness: 0.4, clearcoat: 0.6 }));
    door.position.y = 0.06;
    group.add(door);

    // Two coin slots: gold plates with a dark slit; the right one takes the coin (and glows).
    const glow = new THREE.MeshBasicMaterial({ color: 0xffd27a, toneMapped: false, transparent: true, opacity: 0.35 });
    for (const x of [-0.07, 0.07]) {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.12, 0.012), gold);
      plate.position.set(x, 0.14, 0.006);
      const slit = new THREE.Mesh(new THREE.PlaneGeometry(0.008, 0.05), x > 0 ? glow : new THREE.MeshBasicMaterial({ color: 0x0a0a12 }));
      slit.position.set(x, 0.155, 0.0125);
      if (x > 0) slit.name = 'slotGlow';
      const ret = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.006), new THREE.MeshStandardMaterial({ color: 0x0a0a12 }));
      ret.position.set(x, 0.105, 0.0125);
      group.add(plate, slit, ret);
    }
    this.cabinet.add(group);
  }

  private makeLabel() {
    const tex = this.track(canvasTexture(512, 128, () => undefined));
    const draw = (text: string) => {
      const c = (tex.image as HTMLCanvasElement).getContext('2d')!;
      c.clearRect(0, 0, 512, 128);
      c.fillStyle = '#1a0f02';
      c.fillRect(0, 0, 512, 128);
      c.strokeStyle = '#d9b45f';
      c.lineWidth = 6;
      c.strokeRect(6, 6, 500, 116);
      c.font = '700 58px "Gowun Batang", serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.shadowColor = '#ffb347';
      c.shadowBlur = 22;
      c.fillStyle = '#ffd68a';
      c.fillText(text, 256, 68);
      tex.needsUpdate = true;
    };
    draw('INSERT COIN');
    const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, transparent: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.05), mat);
    mesh.position.set(0, -0.02, 0.003);
    this.slotGroup.add(mesh);
    return { tex, mat, text: 'INSERT COIN', draw };
  }

  /** The words on the coin door's lit label (INSERT COIN, CREDIT 1, …). */
  setLabel(text: string) {
    if (this.label.text === text) return;
    this.label.text = text;
    this.label.draw(text);
  }

  private makeCoin(): THREE.Mesh {
    const face = this.track(
      canvasTexture(256, 256, () => undefined),
    );
    void loadImage(emblemUrl).then((img) => {
      const c = (face.image as HTMLCanvasElement).getContext('2d')!;
      const g = c.createRadialGradient(110, 100, 10, 128, 128, 128);
      g.addColorStop(0, '#fff3c4');
      g.addColorStop(0.6, '#e0b85c');
      g.addColorStop(1, '#a97c2c');
      c.fillStyle = g;
      c.fillRect(0, 0, 256, 256);
      c.strokeStyle = '#8a6420';
      c.lineWidth = 10;
      c.beginPath();
      c.arc(128, 128, 112, 0, Math.PI * 2);
      c.stroke();
      c.globalAlpha = 0.85;
      c.drawImage(img, 48, 48, 160, 160);
      face.needsUpdate = true;
    });
    const edge = new THREE.MeshStandardMaterial({ color: 0xd9b45f, metalness: 1, roughness: 0.25 });
    const faceMat = new THREE.MeshStandardMaterial({ map: face, metalness: 0.85, roughness: 0.3 });
    const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.005, 48), [edge, faceMat, faceMat]);
    coin.visible = false;
    this.scene.add(coin);
    return coin;
  }

  // ---------- the camera ----------

  private idleLook() {
    return new THREE.Vector3(0, 0.86, 0.1);
  }

  private idlePosition(t: number) {
    const a = -0.42 + Math.sin(t * 0.25) * 0.1 + this.pointer.x * 0.08;
    const r = 4.05;
    return new THREE.Vector3(Math.sin(a) * r, 1.3 + Math.sin(t * 0.33) * 0.05 + this.pointer.y * 0.08, Math.cos(a) * r);
  }

  /** Where the camera sits for the screen to fill the window exactly as the title (cover, centred). */
  private screenView() {
    this.screenGroup.updateMatrixWorld(true);
    const m = this.screenGroup.matrixWorld;
    const centre = new THREE.Vector3().setFromMatrixPosition(m);
    const up = new THREE.Vector3().setFromMatrixColumn(m, 1).normalize();
    const normal = new THREE.Vector3().setFromMatrixColumn(m, 2).normalize();
    centre.addScaledVector(normal, 0.002);
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const aspect = this.camera.aspect;
    // Cover: the nearer of fitting the height or the width.
    const d = Math.min(SCREEN_H / (2 * tan), SCREEN_W / (2 * tan * aspect));
    return { pos: centre.clone().addScaledVector(normal, d), look: centre, up };
  }

  private fly(to: THREE.Vector3, look: THREE.Vector3, up: THREE.Vector3, dur: number): Promise<void> {
    return new Promise((done) => {
      const dir = new THREE.Vector3();
      this.camera.getWorldDirection(dir);
      this.flight = {
        from: this.camera.position.clone(),
        to,
        look0: this.camera.position.clone().add(dir.multiplyScalar(this.camera.position.distanceTo(look))),
        look1: look,
        up0: this.camera.up.clone(),
        up1: up,
        t: 0,
        dur,
        done,
      };
    });
  }

  // ---------- what the player does ----------

  /** A coin flies from the player's hand into the right slot. */
  insertCoin(): Promise<void> {
    return new Promise((done) => {
      this.slotGroup.updateMatrixWorld(true);
      const m = this.slotGroup.matrixWorld;
      const slot = new THREE.Vector3(0.07, 0.155, 0.02).applyMatrix4(m);
      const out = new THREE.Vector3(0.07, 0.155, 0.16).applyMatrix4(m);
      const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
      const camUp = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
      const fwd = new THREE.Vector3();
      this.camera.getWorldDirection(fwd);
      const start = this.camera.position.clone().addScaledVector(fwd, 0.6).addScaledVector(right, 0.18).addScaledVector(camUp, -0.2);
      const mid = start.clone().lerp(out, 0.5).add(new THREE.Vector3(0, 0.35, 0));
      this.coinFlight = { t: 0, dur: 1.15, path: new THREE.CubicBezierCurve3(start, mid, out.clone().add(new THREE.Vector3(0, 0.08, 0)), out), slot, done };
      this.coin.visible = true;
      this.coin.position.copy(start);
    });
  }

  /** Into the screen until it's the whole window. */
  async zoomIn(): Promise<void> {
    const v = this.screenView();
    // First square on to the machine, then in.
    const mid = v.look.clone().addScaledVector(new THREE.Vector3().setFromMatrixColumn(this.screenGroup.matrixWorld, 2), 1.1);
    await this.fly(mid, v.look, new THREE.Vector3(0, 1, 0).lerp(v.up, 0.5).normalize(), 0.9);
    this.zoomed = true;
    await this.fly(v.pos, v.look, v.up, 1.1);
  }

  /** Lights the screen up for a moment (a credit going in). */
  flashScreen() {
    this.flash = 1;
  }

  private chime() {
    try {
      this.audio ??= new AudioContext();
      const a = this.audio;
      const now = a.currentTime;
      for (const [f, at, len] of [
        [1568, 0, 0.25],
        [2093, 0.09, 0.5],
      ]) {
        const o = a.createOscillator();
        const g = a.createGain();
        o.type = 'triangle';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, now + at);
        g.gain.exponentialRampToValueAtTime(0.18, now + at + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, now + at + len);
        o.connect(g).connect(a.destination);
        o.start(now + at);
        o.stop(now + at + len + 0.05);
      }
    } catch {
      // no sound here
    }
  }

  // ---------- each frame ----------

  private onPointer = (e: PointerEvent) => {
    this.pointer.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
  };

  private resize = () => {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.zoomed && !this.flight) {
      const v = this.screenView();
      this.camera.position.copy(v.pos);
      this.camera.up.copy(v.up);
      this.camera.lookAt(v.look);
    }
  };

  private loop = (time: number) => {
    if (this.disposed) return;
    this.timer.update(time);
    // Real time (up to a quarter second a frame), so a slow computer doesn't slow the coin down.
    const dt = Math.min(this.timer.getDelta(), 0.25);
    const t = this.timer.getElapsed();
    this.frame++;

    if (this.flight) {
      const f = this.flight;
      f.t = Math.min(1, f.t + dt / f.dur);
      const k = ease(f.t);
      this.camera.position.lerpVectors(f.from, f.to, k);
      this.camera.up.lerpVectors(f.up0, f.up1, k).normalize();
      this.camera.lookAt(new THREE.Vector3().lerpVectors(f.look0, f.look1, k));
      if (f.t >= 1) {
        this.flight = null;
        f.done();
      }
    } else if (!this.zoomed) {
      this.camera.position.lerp(this.idlePosition(t), 0.05);
      this.camera.up.set(0, 1, 0);
      this.camera.lookAt(this.idleLook());
    }

    if (this.coinFlight) {
      const c = this.coinFlight;
      c.t = Math.min(1.35, c.t + dt / c.dur);
      if (c.t <= 1) {
        const k = ease(c.t);
        this.coin.position.copy(c.path.getPoint(k));
        // Spinning in the air, then edge-on and upright for the slot.
        this.coin.rotation.set(0, (1 - k) * t * 9, Math.PI / 2);
      } else {
        // into the slot
        const k = (c.t - 1) / 0.35;
        this.coin.position.lerpVectors(c.path.v3, c.slot, Math.min(1, k));
        if (k >= 1) {
          this.coin.visible = false;
          this.coinFlight = null;
          this.chime();
          this.slotGlow.opacity = 1;
          this.flash = 1;
          c.done();
        }
      }
    }

    // The slot breathes; the label blinks while it waits for a coin.
    this.slotGlow.opacity += ((0.35 + 0.25 * Math.sin(t * 3)) - this.slotGlow.opacity) * 0.06;
    this.label.mat.opacity = this.label.text === 'INSERT COIN' ? (Math.sin(t * 4) > -0.3 ? 1 : 0.35) : 1;
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 1.6);
    const lit = 0.87 + 0.13 * this.flash + (this.zoomed ? 0.13 : 0);
    this.screenMat.color.setScalar(Math.min(1, lit));
    this.sparkles.rotation.y = t * 0.012;

    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('pointermove', this.onPointer);
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
      for (const mat of mats) mat.dispose();
    });
    for (const t of this.textures) t.dispose();
    this.scene.environment?.dispose();
    this.renderer.dispose();
    void this.audio?.close();
  }
}
