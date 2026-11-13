import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils, type VRM } from '@pixiv/three-vrm';

/**
 * compare.html (dev only): one character as exported (models/original/) and with its textures made
 * smaller (models/compare/, by models/compare/shrink.py; the game's own are 512 + JPEG), side by
 * side or wiped one over the other under one camera, with what each file weighs and each texture's
 * size.
 */

const ORIGINAL = '/models/original/female-adult-hana.vrm';
const VARIANTS = [
  { id: '1024png', label: '1024 PNG', file: '/models/compare/female-adult-hana-1024png.vrm' },
  { id: '1024jpg', label: '1024 + JPEG', file: '/models/compare/female-adult-hana-1024jpg.vrm' },
  { id: '512jpg', label: '512 + JPEG', file: '/models/compare/female-adult-hana-512jpg.vrm' },
];
const SHOTS: Record<string, { label: string; target: [number, number, number]; at: [number, number, number] }> = {
  face: { label: '얼굴', target: [0, 1.42, 0], at: [0, 1.45, 0.55] },
  upper: { label: '상반신', target: [0, 1.2, 0], at: [0, 1.3, 1.5] },
  full: { label: '전신', target: [0, 0.85, 0], at: [0.5, 1.2, 3.4] },
  game: { label: '게임 거리', target: [0, 0.85, 0], at: [3.2, 4.6, 6.2] },
};

interface Texture {
  name: string;
  mime: string;
  w: number;
  h: number;
  bytes: number;
}
interface FileInfo {
  bytes: number;
  gzip: number;
  textures: Texture[];
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const view = $<HTMLDivElement>('view');
const wipe = $<HTMLDivElement>('wipe');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setScissorTest(true);
view.prepend(renderer.domElement);
const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 100);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

/** A scene each, lit the same as the wardrobe (wardrobe3d.ts). */
function stage(): THREE.Scene {
  const s = new THREE.Scene();
  s.background = new THREE.Color('#f3ece2');
  s.add(new THREE.HemisphereLight('#f4f9ff', '#b8a98f', 1.4));
  const sun = new THREE.DirectionalLight('#fff3dc', 2.0);
  sun.position.set(2, 5, 4);
  s.add(sun);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(4, 40), new THREE.MeshToonMaterial({ color: '#e6dccb' }));
  floor.rotation.x = -Math.PI / 2;
  s.add(floor);
  return s;
}
const sides = [{ scene: stage(), vrm: null as VRM | null }, { scene: stage(), vrm: null as VRM | null }];

const buffers = new Map<string, Promise<ArrayBuffer>>();
const fetchFile = (url: string) => {
  let b = buffers.get(url);
  if (!b) buffers.set(url, (b = fetch(url).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${url}: ${r.status}`))))));
  return b;
};

/** Loaded as the game does (vrm.ts loadVRM). */
async function loadVRM(buf: ArrayBuffer): Promise<VRM> {
  const loader = new GLTFLoader();
  loader.register((p) => new VRMLoaderPlugin(p));
  const gltf = await loader.parseAsync(buf.slice(0), '');
  const vrm = gltf.userData.vrm as VRM;
  VRMUtils.removeUnnecessaryVertices(gltf.scene);
  VRMUtils.combineSkeletons(gltf.scene);
  VRMUtils.rotateVRM0(vrm);
  vrm.scene.traverse((o) => (o.frustumCulled = false));
  return vrm;
}

/** The file's size, gzipped (what a server sends), and its textures read from the GLB itself. */
async function infoOf(buf: ArrayBuffer): Promise<FileInfo> {
  const gzip = (await new Response(new Blob([buf]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer()).byteLength;
  const dv = new DataView(buf);
  const jsonLen = dv.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jsonLen)));
  const bin = 20 + jsonLen + 8;
  const textures = await Promise.all(
    (json.images as { name?: string; mimeType: string; bufferView: number }[]).map(async (im, i) => {
      const v = json.bufferViews[im.bufferView];
      const bytes = new Uint8Array(buf, bin + (v.byteOffset ?? 0), v.byteLength);
      const bmp = await createImageBitmap(new Blob([bytes], { type: im.mimeType }));
      const t = { name: im.name || `#${i}`, mime: im.mimeType.replace('image/', ''), w: bmp.width, h: bmp.height, bytes: v.byteLength };
      bmp.close();
      return t;
    }),
  );
  return { bytes: buf.byteLength, gzip, textures };
}

async function show(side: 0 | 1, url: string): Promise<FileInfo> {
  const buf = await fetchFile(url);
  const [vrm, info] = await Promise.all([loadVRM(buf), infoOf(buf)]);
  const s = sides[side];
  if (s.vrm) {
    s.scene.remove(s.vrm.scene);
    VRMUtils.deepDispose(s.vrm.scene);
  }
  s.vrm = vrm;
  s.scene.add(vrm.scene);
  return info;
}

// Views: side by side, or one image with the original left of a line you drag.
let mode: 'side' | 'wipe' = 'side';
let split = 0.5;
function resize() {
  const w = view.clientWidth;
  const h = view.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = (mode === 'side' ? w / 2 : w) / h;
  camera.updateProjectionMatrix();
  wipe.hidden = mode !== 'wipe';
  wipe.style.left = `${split * 100}%`;
}
new ResizeObserver(resize).observe(view);

let dragging = false;
wipe.addEventListener('pointerdown', (e) => {
  dragging = true;
  wipe.setPointerCapture(e.pointerId);
});
wipe.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const r = view.getBoundingClientRect();
  split = Math.min(0.95, Math.max(0.05, (e.clientX - r.left) / r.width));
  wipe.style.left = `${split * 100}%`;
});
wipe.addEventListener('pointerup', () => (dragging = false));

let last = performance.now();
renderer.setAnimationLoop((now: number) => {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  controls.update();
  const w = view.clientWidth;
  const h = view.clientHeight;
  sides.forEach((s, i) => {
    s.vrm?.update(dt);
    const [x0, x1] = mode === 'side' ? [i * 0.5, i * 0.5 + 0.5] : i ? [split, 1] : [0, split];
    const vx = mode === 'side' ? x0 * w : 0;
    renderer.setViewport(vx, 0, mode === 'side' ? w / 2 : w, h);
    renderer.setScissor(x0 * w, 0, (x1 - x0) * w, h);
    renderer.render(s.scene, camera);
  });
});

function shoot(id: string) {
  const s = SHOTS[id];
  controls.target.set(...s.target);
  camera.position.set(...s.at);
  for (const b of document.querySelectorAll('#shot button')) b.classList.toggle('on', (b as HTMLElement).dataset.id === id);
}

function buttons(host: string, items: { id: string; label: string }[], pick: (id: string) => void) {
  for (const it of items) {
    const b = document.createElement('button');
    b.textContent = it.label;
    b.dataset.id = it.id;
    b.onclick = () => {
      for (const o of document.querySelectorAll(`#${host} button`)) o.classList.toggle('on', o === b);
      pick(it.id);
    };
    $(host).append(b);
  }
}

// What each weighs, and each texture.
const mb = (n: number) => `${(n / 2 ** 20).toFixed(1)} MB`;
const kb = (n: number) => (n < 2 ** 20 ? `${Math.round(n / 1024)} KB` : mb(n));
const pct = (a: number, b: number) => (b === a ? '<span class="same">같음</span>' : `<span class="down">${Math.round((b / a) * 100)}%</span>`);
function stats(a: FileInfo, b: FileInfo, label: string) {
  const tex = (f: FileInfo) => f.textures.reduce((n, t) => n + t.bytes, 0);
  const rows: [string, number, number][] = [
    ['파일', a.bytes, b.bytes],
    ['gzip (서버가 보내는 양)', a.gzip, b.gzip],
    ['텍스처', tex(a), tex(b)],
    ['메시·뼈·표정 등', a.bytes - tex(a), b.bytes - tex(b)],
  ];
  const res = (x: Texture) => `${x.w}×${x.h}`;
  const texRows = a.textures
    .map((t, i) => {
      const u = b.textures[i];
      const kept = res(t) === res(u) && t.mime === u.mime;
      const to = (res(t) === res(u) ? res(t) : `${res(t)}<br>→ ${res(u)}`) + (u.mime === 'jpeg' ? ' jpg' : '');
      return `<tr class="${kept ? 'kept' : ''}"><td>${t.name}</td><td>${to}</td><td>${kb(t.bytes)}<br>→ ${kb(u.bytes)}</td></tr>`;
    })
    .join('');
  $('stats').innerHTML = `
    <h2>크기 (원본 → ${label})</h2>
    <table><tr><th></th><th>원본</th><th>${label}</th><th></th></tr>
    ${rows.map(([k, x, y]) => `<tr><td>${k}</td><td>${mb(x)}</td><td>${mb(y)}</td><td>${pct(x, y)}</td></tr>`).join('')}
    </table>
    <p class="note">줄인 것은 텍스처만 다시 저장했어요(가장 긴 변을 ${label.startsWith('512') ? 512 : 1024}px까지, 썸네일은 256px${label.includes('JPEG') ? ', 불투명한 큰 텍스처는 JPEG 88%' : ''}). 메시와 VRM 정보는 그대로예요.</p>
    <h2>텍스처 ${a.textures.length}장</h2>
    <table class="tex"><tr><th></th><th>크기 (px)</th><th>용량</th></tr>${texRows}</table>
    <p class="note">흐린 줄은 크기를 그대로 두고 PNG로 다시 압축만 한 텍스처예요. Thumbnail은 VRM 파일의 미리보기 그림이라 게임에서는 안 쓰여요.</p>`;
}

let original: Promise<FileInfo>;
async function pickVariant(id: string) {
  const v = VARIANTS.find((x) => x.id === id)!;
  $('labelB').textContent = v.label;
  $('loading').hidden = false;
  const [a, b] = await Promise.all([original, show(1, v.file)]);
  stats(a, b, v.label);
  $('loading').hidden = true;
}

buttons('variant', VARIANTS, pickVariant);
buttons('mode', [{ id: 'side', label: '나란히' }, { id: 'wipe', label: '겹쳐서 밀기' }], (id) => {
  mode = id as typeof mode;
  resize();
});
buttons('shot', Object.entries(SHOTS).map(([id, s]) => ({ id, label: s.label })), shoot);
(document.querySelector('#mode button') as HTMLElement).classList.add('on');
(document.querySelector('#variant button') as HTMLElement).classList.add('on');
shoot('face');
resize();
original = show(0, ORIGINAL);
pickVariant(VARIANTS[0].id).catch((e) => ($('loading').textContent = `불러오지 못했어요: ${e.message}`));
