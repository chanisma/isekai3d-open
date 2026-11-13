import { createGownDrape } from './gownDrape';
import { createSkirtDrape } from './skirtDrape';
import { prepareSkirtCoverage } from './skirtSkin';
import { prepareGownSkin } from './gownSkin';
import { robeAsset, robeLabel } from './robeSizing';
/** Standalone local entry. Never imported by main.tsx; no save/cloud services. */
import * as THREE from 'three';
import { createRoot } from 'react-dom/client';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VRMLoaderPlugin, VRMUtils, type VRM } from '@pixiv/three-vrm';
import { VrmAvatar, type BodyPose } from '../view3d/avatar';
import { baseOf, loadDressed, pieceOf, transplant, prepareRobeSkin, supplementGownSkin, supplementKnitLegSkin, wearOnBase, type Piece } from '../view3d/vrmDress';
import { models, PICKED_ONLY } from '../view3d/vrm';
import { addShirtPrint } from '../view3d/shirtPrint';
import type { ShirtPrint } from '../game/shirtPrint';
import { ShirtPrintEditor } from '../ui/ShirtPrintEditor';

if (!import.meta.env.DEV) throw new Error('The garment atelier is development-only.');

const canvas = document.querySelector<HTMLCanvasElement>('#viewport canvas')!;
const host = document.querySelector<HTMLElement>('#viewport')!;
const status = document.querySelector<HTMLElement>('#status')!;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#bcc7bf');
scene.add(new THREE.HemisphereLight('#ffffff', '#a6a093', 2.5));
const key = new THREE.DirectionalLight('#fff8eb', 2.4);
key.position.set(2, 4, 5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
scene.add(key);
const rim = new THREE.DirectionalLight('#d9e6f1', 1.5);
rim.position.set(-3, 3, -3);
scene.add(rim);
const floor = new THREE.Mesh(new THREE.CircleGeometry(4, 64), new THREE.MeshStandardMaterial({ color: '#dadbd3', roughness: 1 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
const camera = new THREE.PerspectiveCamera(32, 1, .01, 50);
camera.position.set(0, 1.25, 4.1);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 1.03, 0);
controls.enableDamping = true;
controls.minDistance = 1.2;
controls.maxDistance = 6;
controls.maxPolarAngle = Math.PI * .65;
const chair = new THREE.Mesh(new THREE.BoxGeometry(.46, .05, .42), new THREE.MeshStandardMaterial({ color: '#a6b3a1' }));
chair.position.set(0, .45, -.05);
chair.visible = false;
scene.add(chair);

let avatar: VrmAvatar | null = null;
let gownDrape: ReturnType<typeof createGownDrape> | null = null;
let skirtDrape: ReturnType<typeof createSkirtDrape> | null = null;
let seatScale=1;
let garmentSource: VRM | null = null;
let selectedModel = 'female-adult-mina.vrm';
const modelSelect = document.querySelector<HTMLSelectElement>('#character-model')!;
let version = 'seraphine';
/** The character shown is their full body (`@base`) dressed, not their exported file. */
let onBase = false;
let pose = 'stand';
let color = '#363e3c';
let bottomColor = '#737e73';
let shoeColor = '#363e3c';
let design: ShirtPrint | undefined;
let prints: Array<() => void> = [];
let ticket = 0;
let disposed = false;
const buffers = new Map<string, ArrayBuffer>();
Object.assign(window, { __atelier: { camera, controls, renderer, scene,
  async reviewLook(look:string,file:string){version=look;selectedModel=file;await load();},
  reviewPose(kind:string){pose=kind;for(let i=0;i<90;i++)step(1/30,i/30);renderer.render(scene,camera);},
  get avatar() { return avatar; }, get gownDrape() { return gownDrape; },get skirtDrape(){return skirtDrape;} } });
const editor = createRoot(document.querySelector('#print-editor')!);
function renderEditor() {
  document.querySelector<HTMLElement>('#print-editor')!.hidden = ['city', 'maison', 'nocturne', 'aurelia', 'eclipse', 'cozy', 'rue', 'tailor', 'robe', 'gijeon', 'meridian', 'elan', 'seraphine'].includes(version);
  editor.render(<ShirtPrintEditor sessionOnly value={design} color={color} enabled={!!avatar} onChange={(next) => {
    design = next;
    applyPrint();
    renderEditor();
  }} onColor={(next) => { color = next; applyColor(); renderEditor(); }} />);
}
function topMeshes() {
  const meshes: THREE.SkinnedMesh[] = [];
  avatar?.vrm.scene.traverse((o) => {
    if (o.visible && (o as THREE.SkinnedMesh).isSkinnedMesh && pieceOf(o as THREE.Mesh) === 'tops' && o.name !== 'Custom shirt graphic') meshes.push(o as THREE.SkinnedMesh);
  });
  return meshes;
}
function applyColor() {
  if (['city', 'maison', 'nocturne', 'aurelia', 'eclipse', 'cozy', 'rue', 'tailor', 'robe', 'gijeon', 'meridian', 'elan', 'seraphine'].includes(version)) return;
  const meshes: THREE.Mesh[] = [];
  avatar?.vrm.scene.traverse((o) => {
    if (o.visible && (o as THREE.Mesh).isMesh && o.name !== 'Custom shirt graphic') meshes.push(o as THREE.Mesh);
  });
  for (const mesh of meshes) for (const material of [mesh.material].flat()) {
    const mat = material as THREE.Material & { color?: THREE.Color; shadeColorFactor?: THREE.Color };
    if (/Outline/.test(mat.name)) continue;
    const piece = pieceOf(mesh);
    if (version === 'complete' && piece === 'shoes') {
      const fixed = /Midsole/.test(mat.name) ? '#e6dfcd' : /Outsole/.test(mat.name) ? '#303a35' :
        /Laces/.test(mat.name) ? '#f0eadb' : undefined;
      const tint = new THREE.Color(fixed ?? (/Accent/.test(mat.name) ? color : shoeColor));
      if (/Panel/.test(mat.name)) tint.lerp(new THREE.Color('#c6c9bc'), .18);
      mat.color?.copy(tint);
      mat.shadeColorFactor?.copy(tint).multiplyScalar(.75);
      continue;
    }
    if (piece !== 'tops' && !(['set', 'complete'].includes(version) && piece === 'bottoms')) continue;
    const base = piece === 'tops' ? color : bottomColor;
    const tint = /Label/.test(mat.name) ? new THREE.Color('#d8cba7') : new THREE.Color(base);
    if (/Pocket/.test(mat.name)) tint.multiplyScalar(.46);
    if (/Flap/.test(mat.name)) tint.multiplyScalar(.38);
    if (/Stitch/.test(mat.name)) tint.multiplyScalar(.6).lerp(new THREE.Color('#e0dac4'), .18);
    mat.color?.copy(tint);
    mat.shadeColorFactor?.copy(tint).multiplyScalar(.78);
  }
}
function applyPrint() {
  prints.forEach((dispose) => dispose());
  prints = [];
  if (!design || !avatar || ['city', 'maison', 'nocturne', 'aurelia', 'eclipse', 'cozy', 'rue', 'tailor', 'robe', 'gijeon', 'meridian', 'elan', 'seraphine'].includes(version)) return;
  // The current animated bones must not be used to establish a rest-pose print.
  for (const mesh of topMeshes()) {
    prints.push(addShirtPrint(mesh, design, { centerX: 0, centerY: 1.315, width: .33, height: .30, front: 1 }));
  }
  // Prints use the garment's bind coordinates; VRM 1 models here face +Z.
}
async function parseModelAsset(name: string): Promise<VRM> {
    let buffer = buffers.get(name);
    if (!buffer) {
      const response = await fetch(name);
      if (!response.ok) throw new Error(`모델 파일을 읽을 수 없습니다: ${name} (${response.status})`);
      buffer = await response.arrayBuffer();
      buffers.set(name, buffer);
      if (buffers.size > 6) buffers.delete(buffers.keys().next().value!);
    }
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    const gltf = await loader.parseAsync(buffer.slice(0), '');
    const vrm = gltf.userData.vrm as VRM;
    if (!vrm) throw new Error('VRM 데이터를 읽을 수 없어요.');
    VRMUtils.removeUnnecessaryVertices(vrm.scene);
    VRMUtils.combineSkeletons(vrm.scene);
    VRMUtils.rotateVRM0(vrm);
    vrm.scene.traverse(o => { if ((o as THREE.Mesh).isMesh) for (const m of [(o as THREE.Mesh).material].flat()) m.userData.file = name; });
    return vrm;
}
async function load() {
  const current = ++ticket;
  const requestedVersion = version;
  const requestedModel = selectedModel;
  const name = requestedVersion === 'seraphine' ? '/prototypes/generated/seraphine-01.vrm' : requestedVersion === 'elan' ? '/prototypes/generated/elan-01.vrm' : requestedVersion === 'meridian' ? '/prototypes/generated/meridian-01.vrm' : requestedVersion === 'gijeon' ? '/prototypes/generated/gijeon-01.vrm' : requestedVersion === 'robe' ? robeAsset(requestedModel) : requestedVersion === 'tailor' ? '/prototypes/generated/tailor-01.vrm' : requestedVersion === 'rue' ? '/prototypes/generated/rue-01.vrm' : requestedVersion === 'cozy' ? '/prototypes/generated/cozy-01.vrm' : requestedVersion === 'eclipse' ? '/prototypes/generated/eclipse-01.vrm' : requestedVersion === 'aurelia' ? '/prototypes/generated/aurelia-01.vrm' : requestedVersion === 'nocturne' ? '/prototypes/generated/nocturne-01.vrm' : requestedVersion === 'maison' ? '/prototypes/generated/maison-01.vrm' : requestedVersion === 'city' ? '/prototypes/generated/city-club-01.vrm' : requestedVersion === 'complete' ? '/prototypes/generated/off-duty-03-look.vrm' :
    requestedVersion === 'set' ? '/prototypes/generated/off-duty-02-set.vrm' : '/prototypes/generated/off-duty-01.vrm';
  status.textContent = `${requestedModel} · 의상을 입히고 있어요…`;
  let target: VRM | null = null, source: VRM | null = null;
  const at = (file: string) => `/models/${encodeURIComponent(file).replace(/%40/g, '@')}`;
  // A character with a full body (`@base`) wears the set on it, as the game dresses them (docs/3d/03-clothing-workflow.md).
  const base = requestedVersion === 'original' ? null : await baseOf(requestedModel);
  onBase = !!base || requestedVersion === 'dressed';
  try {
    if (requestedVersion === 'dressed') target = await loadDressed(requestedModel, {});
    else if (base) {
      target = await parseModelAsset(at(base));
      source = await parseModelAsset(name);
      if(['maison','aurelia','eclipse','elan','cozy','rue','gijeon','nocturne','seraphine','robe'].includes(requestedVersion))prepareSkirtCoverage(target,source);
      const pieces: Piece[] = requestedVersion === 'prototype' ? ['tops'] : requestedVersion === 'set' ? ['tops', 'bottoms'] : ['tops', 'bottoms', 'shoes'];
      // What the set hasn't got (a top alone) is the character's own.
      const own = pieces.length < 3 ? await parseModelAsset(at(requestedModel)) : null;
      wearOnBase(target, Object.fromEntries((['tops', 'bottoms', 'shoes'] as const).map((p) => [p, pieces.includes(p) ? { file: `${name}?fit=${requestedModel}`, vrm: source! } : { file: at(requestedModel), vrm: own! }])));
    // A character's file is only their clothes (models/compare/clothes.py): «원래 파일» is them dressed in it.
    } else target = (await baseOf(requestedModel)) ? await loadDressed(requestedModel, {}) : await parseModelAsset(at(requestedModel));
    if (!onBase && requestedVersion !== 'original') {
      source = await parseModelAsset(name);
      const pieces: Piece[] = requestedVersion === 'prototype' ? ['tops'] :
        requestedVersion === 'set' ? ['tops', 'bottoms'] : ['tops', 'bottoms', 'shoes'];
      for (const piece of pieces) transplant(target, source, piece);
      if (requestedVersion === 'robe') prepareRobeSkin(target, source);
      if (requestedVersion === 'rue' && requestedModel.startsWith('female-adult-') && requestedModel !== 'female-adult-seoa.vrm') supplementKnitLegSkin(target, source, .27);
      if (requestedVersion === 'cozy' && requestedModel.startsWith('female-adult-') && requestedModel !== 'female-adult-seoa.vrm') supplementKnitLegSkin(target, source);
      if (requestedVersion === 'nocturne' && requestedModel.startsWith('female-adult-')) supplementGownSkin(target, source, requestedModel !== 'female-adult-mina@formal.vrm');
    }
    if (requestedVersion === 'seraphine') prepareGownSkin(target);
    const vrm = target;
    vrm.scene.traverse((o: THREE.Object3D) => {
      o.frustumCulled = false;
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
    const next = new VrmAvatar(vrm, 1);
    if (disposed || ticket !== current) { next.dispose(); if (source) VRMUtils.deepDispose(source.scene); return; }
    prints.forEach((dispose) => dispose());
    prints = [];
    avatar?.dispose();
    if (garmentSource) VRMUtils.deepDispose(garmentSource.scene);
    avatar = next;
    seatScale=requestedVersion==='robe'?vrm.humanoid.getRawBoneNode('neck')!.getWorldPosition(new THREE.Vector3()).y/1.47:1;
    chair.scale.setScalar(seatScale);chair.position.set(0,.45*seatScale,-.05*seatScale);
    gownDrape = requestedVersion === 'seraphine' ? createGownDrape(vrm) : null;
    skirtDrape = createSkirtDrape(vrm);
    garmentSource = source;
    target = null; source = null;
    scene.add(next.root);
    if (version !== 'original' && version !== 'dressed') applyColor();
    applyPrint();
    renderEditor();
    status.textContent = version === 'seraphine' ? 'SERAPHINE 01 · 페트롤 새틴 · 비대칭 드레이프 · 샴페인 비즈' : version === 'elan' ? 'ÉLAN 01 · 플럼 재킷 + 스톤 펜슬스커트 + 옥스블러드 메리제인' : version === 'meridian' ? 'MERIDIAN 01 · 에스프레소 퍼널넥 재킷 + 토프 와이드 슬랙스 + 블랙 가죽 슈즈' : version === 'gijeon' ? '샘플고 교복 · 네이비 카디건 + 하늘색 셔츠 + 스트라이프 타이 + 회색 주름치마' : version === 'robe' ? `ROBE 01 · 공용 샤워가운 · ${robeLabel(requestedModel)} 자동 선택` : version === 'tailor' ? 'TAILOR 01 · 차콜 코트 + 체크 재킷 + 블랙 폴로 + 아이보리 팬츠 + 블랙 로퍼' : version === 'rue' ? 'RUE 01 · 브라운 재킷 + 차콜 티셔츠 + 미니스커트 + 흰 양말 + 블랙 캡' : version === 'cozy' ? 'COZY 01 · 아이보리 터틀넥 + 차콜 플리츠 미니 + 블랙 니삭스' : version === 'eclipse' ? 'ECLIPSE 01 · 네이비 비대칭 재킷 + 실버 그레이 스커트 + 블랙 슈즈' : version === 'aurelia' ? 'AURELIA 01 · 샴페인 더블 버튼 재킷 + 버건디 롱 스커트 + 옥스블러드 슈즈' : version === 'nocturne' ? 'NOCTURNE 01 · 오프숄더 롱 드레스 + 비대칭 새틴 드레이프 + 크리스털 핀' : version === 'maison' ? 'MAISON 01 · 아이보리 크롭 재킷 + 차콜 미디 스커트 + 블랙 플랫 슈즈' :
      version === 'city' ? 'CITY CLUB 01 · 바시티 재킷 + 크림 팬츠 + 브라운 로퍼 · 드래그로 회전 / 휠로 확대' :
      version === 'complete' ? 'OFF DUTY 03 · 티셔츠 + 버뮤다 + 스니커즈 · 드래그로 회전 / 휠로 확대' :
      version === 'set' ? 'OFF DUTY 02 · 오버핏 티셔츠 + 유틸리티 버뮤다 · 드래그로 회전 / 휠로 확대' :
      version === 'prototype' ? 'OFF DUTY 01 · 상의만 변경 · 드래그로 회전 / 휠로 확대' : '선택한 캐릭터의 원래 의상 · 드래그로 회전 / 휠로 확대';
    if (version === 'dressed') status.textContent = '기본 몸 + 원래 옷 · 게임과 같은 방식 (속옷 차림 기본 몸에 그 파일의 옷을 입힘)';
    status.textContent = `${requestedModel} · ${status.textContent}${onBase && version !== 'dressed' ? ' · 기본 몸에 입힘' : ''}`;
    document.querySelector('#fit-note')!.textContent = requestedVersion === 'dressed' ? (base || (await baseOf(requestedModel)) ?
      '속옷만 입은 온전한 기본 몸에 이 파일의 상의·하의·신발을 옮겨 입혔습니다. 옷이 덮는 피부는 숨기고, 발은 신발 파일의 것을 씁니다.' : '이 캐릭터는 기본 몸이 없어 원래 파일 그대로입니다.') :
      onBase ? '이 캐릭터의 기본 몸(속옷 차림, 피부가 온전함)에 의상을 입혔습니다. 의상이 덮는 피부만 숨기므로 피부 보충이 필요 없습니다.' :
      requestedVersion === 'gijeon' ? '여성 청소년 다인 기준 교복입니다. 교표는 사진의 형태·색상을 참고한 간략한 배지이며, 작은 글자까지 재현한 원본 교표는 아닙니다.' : requestedVersion === 'robe' ? `성별·연령에 맞는 ${robeLabel(requestedModel)} 사이즈입니다. 같은 분류 안의 체형 차이와 앉기 시 밑단은 추가 보정이 필요할 수 있습니다.` : requestedVersion === 'original' ?
      '선택한 캐릭터의 원래 의상입니다.' :
      `선택한 캐릭터의 얼굴·머리·몸에 새 의상을 착용했습니다. ${requestedVersion === 'nocturne' ? '성인 여성 미나 (다른 성인 여성은 상체 피부 보충)' : ['maison', 'aurelia', 'eclipse', 'cozy', 'rue'].includes(requestedVersion) ? '성인 여성 서아' : '성인 우진'} 기준 크기이며, 다른 체형의 자동 사이즈 보정은 적용하지 않았습니다.`;
  } catch (error) {
    if (target) VRMUtils.deepDispose(target.scene);
    if (source) VRMUtils.deepDispose(source.scene);
    if (current === ticket) status.textContent = error instanceof Error ? error.message : String(error);
  }
}
modelSelect.onchange = () => { selectedModel = modelSelect.value; updateLookInfo(); void load(); };
async function populateModels() {
  const listing = (await models()).filter(model => !model.name.startsWith('sample_'));
  if (disposed) return;
  modelSelect.replaceChildren();
  for (const [label, group] of [
    ['기본 캐릭터', listing.filter(m => !m.kept && !PICKED_ONLY.has(m.name) && !m.outfit)],
    ['기본 몸 (속옷)', listing.filter(m => m.outfit === 'base')],
    ['역할 캐릭터 (NPC로도 와요)', listing.filter(m => PICKED_ONLY.has(m.name) && !m.outfit)],
    ['헤어·의상 세트', listing.filter(m => m.kept && !m.outfit)],
    ['다른 복장', listing.filter(m => m.outfit && m.outfit !== 'base')],
  ] as const) {
    const element = document.createElement('optgroup'); element.label = label;
    for (const model of group) {
      const option = document.createElement('option');
      option.value = model.file; option.textContent = model.file.replace('.vrm', '');
      element.append(option);
    }
    modelSelect.append(element);
  }
  modelSelect.value = selectedModel;
  updateLookInfo();
}
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-version]')) button.onclick = () => {
  version = button.dataset.version!;
  if ((version === 'elan' || version === 'seraphine') && !selectedModel.startsWith('female-adult-')) { selectedModel = 'female-adult-seoa.vrm'; modelSelect.value = selectedModel; }
  if (version === 'meridian' && !selectedModel.startsWith('male-adult-')) { selectedModel = 'male-adult-woojin.vrm'; modelSelect.value = selectedModel; }
  if (version === 'gijeon' && !selectedModel.startsWith('female-teen-')) { selectedModel = 'female-teen-dain.vrm'; modelSelect.value = selectedModel; }
  updateLookInfo();
  document.querySelectorAll('[data-version]').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
  void load();
};
function updateLookInfo() {
  const seraphine = version === 'seraphine';
  document.querySelector<HTMLElement>('#seraphine-details')!.hidden = !seraphine;
  document.querySelector<HTMLElement>('#seraphine-downloads')!.hidden = !seraphine;
  const elan = version === 'elan';
  document.querySelector<HTMLElement>('#elan-details')!.hidden = !elan;
  document.querySelector<HTMLElement>('#elan-downloads')!.hidden = !elan;
  const meridian = version === 'meridian';
  document.querySelector<HTMLElement>('#meridian-details')!.hidden = !meridian;
  document.querySelector<HTMLElement>('#meridian-downloads')!.hidden = !meridian;
  const gijeon = version === 'gijeon';
  for (const option of modelSelect.options) option.disabled = (gijeon && !option.value.startsWith('female-teen-')) || (meridian && !option.value.startsWith('male-adult-')) || ((elan || seraphine) && !option.value.startsWith('female-adult-'));
  document.querySelector<HTMLElement>('#gijeon-details')!.hidden = !gijeon;
  document.querySelector<HTMLElement>('#gijeon-downloads')!.hidden = !gijeon;
  const robe = version === 'robe';
  document.querySelector<HTMLElement>('#robe-details')!.hidden = !robe;
  document.querySelector<HTMLElement>('#robe-downloads')!.hidden = !robe;
  document.querySelector<HTMLAnchorElement>('#robe-vrm')!.href = robeAsset(selectedModel);
  document.querySelector<HTMLAnchorElement>('#robe-glb')!.href = robeAsset(selectedModel, 'glb');
  const tailor = version === 'tailor';
  const rue = version === 'rue';
  const cozy = version === 'cozy';
  const eclipse = version === 'eclipse';
  const aurelia = version === 'aurelia';
  const nocturne = version === 'nocturne';
  const city = version === 'city';
  const maison = version === 'maison';
  const dressed = version === 'dressed';
  if (dressed) {
    document.querySelector('#look-title')!.textContent = 'BASE BODY';
    document.querySelector('#look-description')!.textContent = '속옷 차림의 온전한 기본 몸에 캐릭터 파일의 원래 옷을 다시 입힌 모습입니다. 게임은 성인 캐릭터를 이렇게 그립니다.';
    for (const el of document.querySelectorAll<HTMLElement>('aside dl, aside .downloads, #off-duty-downloads, #palette-section')) el.hidden = true;
    renderEditor();
    return;
  }
  document.querySelector('#look-title')!.textContent = seraphine ? 'SERAPHINE 01' : elan ? 'ÉLAN 01' : meridian ? 'MERIDIAN 01' : gijeon ? '샘플고 교복' : robe ? 'ROBE 01' : tailor ? 'TAILOR 01' : rue ? 'RUE 01' : cozy ? 'COZY 01' : eclipse ? 'ECLIPSE 01' : aurelia ? 'AURELIA 01' : nocturne ? 'NOCTURNE 01' : maison ? 'MAISON 01' : city ? 'CITY CLUB 01' : 'OFF DUTY 03';
  document.querySelector('#look-description')!.textContent = seraphine ? '페트롤 블루 새틴의 하트형 보디스, 허리로 모이는 비대칭 드레이프, 바닥 가까이 흐르는 18개의 깊은 주름. 작은 샴페인 골드 비즈와 마감된 밑단으로 완성한 이브닝드레스입니다.' : elan ? '허리를 강조한 플럼색 재킷과 스톤색 미디 펜슬스커트. 작은 골드 버클과 에나멜 단추, 옥스블러드 메리제인 슈즈로 완성한 성인 여성용 세트입니다.' : meridian ? '2026 가을의 퍼널넥과 여유로운 팬츠를 반영한 세트. 에스프레소 가죽 크롭 재킷, 토프 와이드 슬랙스, 블랙 슈즈에 금속 지퍼와 얇은 스티치를 더했습니다. 성인 남성 기준으로 제작했습니다.' : gijeon ? '참고 사진의 네이비 카디건과 베이지 테두리, 하늘색 셔츠와 사선 타이. 접힌 입체 칼라와 단추, 잔잔한 원단 결, 회색 박스 주름치마로 다듬은 여성 청소년용 교복입니다.' : robe ? '남녀 공용 아이보리 샤워가운. 부드러운 타월 원단, 둥글게 접힌 칼라와 겹침 여밈, 입체 허리 매듭과 포켓으로 다듬었습니다. 성별·연령별 10가지 사이즈를 자동 선택합니다.' : tailor ? '사진의 차콜 코트와 흑백 체크 재킷, 블랙 폴로를 겹쳐 입은 스타일을 반영했습니다. 아이보리 팬츠와 블랙 로퍼로 완성한 남성용 세트입니다.' : rue ? '사진의 브라운 스웨이드 재킷과 미니스커트, 차콜 티셔츠를 반영했습니다. 흰 양말과 검은 슈즈, 곡선 챙 캡으로 완성한 스트리트 세트입니다.' : cozy ? '참고 사진의 아이보리 터틀넥 니트와 차콜 플리츠 미니스커트, 블랙 니삭스를 반영했습니다. 넉넉한 니트 실루엣과 입체 주름, 블랙 플랫 슈즈로 구성했습니다.' : eclipse ? '딥 네이비 재킷에 사선 여밈과 실버 장식을 더했습니다. 좌우 길이가 다른 밑단, 넓게 퍼지는 실버 그레이 스커트와 블랙 슈즈로 구성한 세트입니다.' : aurelia ? '샴페인 골드 재킷과 깊은 버건디 롱 스커트. 두 줄로 배치한 작은 버튼과 사선 테두리, 옥스블러드 슈즈로 완성한 이브닝 세트입니다.' : nocturne ? '어깨를 감싸는 입체 새틴 밴드와 길게 퍼지는 블랙 실루엣. 비대칭 드레이프와 작은 크리스털 핀으로 완성한 런웨이 이브닝드레스입니다.' : maison ?
    '결이 살아 있는 아이보리 크롭 재킷과 차콜 미디 스커트. 진주빛 버튼과 샴페인 골드 장식을 얇게 더하고, 블랙 플랫 슈즈로 정리한 여성용 세트입니다.' : city ?
    '네이비 바시티 재킷과 크림 롱 팬츠, 브라운 로퍼. 배색 소매와 줄무늬 칼라, 금속 스냅과 C 패치로 완성한 프레피 스타일입니다.' :
    '오버핏 티셔츠와 와이드 버뮤다에 볼륨 있는 로우탑 스니커즈. 차분한 갑피와 크림색 밑창으로 균형을 맞췄습니다.';
  document.querySelector<HTMLElement>('#palette-section')!.hidden = city || maison || nocturne || aurelia || eclipse || cozy || rue || tailor || robe || gijeon || meridian || elan || seraphine;
  document.querySelector<HTMLElement>('#off-duty-details')!.hidden = city || maison || nocturne || aurelia || eclipse || cozy || rue || tailor || robe || gijeon || meridian || elan || seraphine;
  document.querySelector<HTMLElement>('#city-details')!.hidden = !city;
  document.querySelector<HTMLElement>('#maison-details')!.hidden = !maison;
  document.querySelector<HTMLElement>('#maison-downloads')!.hidden = !maison;
  document.querySelector<HTMLElement>('#off-duty-downloads')!.hidden = city || maison || nocturne || aurelia || eclipse || cozy || rue || tailor || robe || gijeon || meridian || elan || seraphine;
  document.querySelector<HTMLElement>('#city-downloads')!.hidden = !city;
  document.querySelector<HTMLElement>('#tailor-details')!.hidden = !tailor;
  document.querySelector<HTMLElement>('#tailor-downloads')!.hidden = !tailor;
  document.querySelector<HTMLElement>('#rue-details')!.hidden = !rue;
  document.querySelector<HTMLElement>('#rue-downloads')!.hidden = !rue;
  document.querySelector<HTMLElement>('#cozy-details')!.hidden = !cozy;
  document.querySelector<HTMLElement>('#cozy-downloads')!.hidden = !cozy;
  document.querySelector<HTMLElement>('#eclipse-details')!.hidden = !eclipse;
  document.querySelector<HTMLElement>('#eclipse-downloads')!.hidden = !eclipse;
  document.querySelector<HTMLElement>('#aurelia-details')!.hidden = !aurelia;
  document.querySelector<HTMLElement>('#aurelia-downloads')!.hidden = !aurelia;
  document.querySelector<HTMLElement>('#nocturne-details')!.hidden = !nocturne;
  document.querySelector<HTMLElement>('#nocturne-downloads')!.hidden = !nocturne;
  renderEditor();
}
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-pose]')) button.onclick = () => {
  pose = button.dataset.pose!;
  document.querySelectorAll('[data-pose]').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
};
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-palette]')) button.onclick = () => {
  color = button.dataset.top!;
  bottomColor = button.dataset.bottom!;
  shoeColor = button.dataset.shoe!;
  document.querySelectorAll('[data-palette]').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
  document.querySelector<HTMLInputElement>('#bottom-color')!.value = bottomColor;
  document.querySelector<HTMLInputElement>('#shoe-color')!.value = shoeColor;
  applyColor();
  renderEditor();
};
document.querySelector<HTMLInputElement>('#bottom-color')!.oninput = (event) => {
  bottomColor = (event.target as HTMLInputElement).value;
  document.querySelectorAll('[data-palette]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  applyColor();
};
document.querySelector<HTMLInputElement>('#shoe-color')!.oninput = (event) => {
  shoeColor = (event.target as HTMLInputElement).value;
  document.querySelectorAll('[data-palette]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  applyColor();
};
document.querySelector<HTMLButtonElement>('#top-focus')!.onclick = () => {
  controls.target.set(0, 1.16, 0);
  camera.position.set(0, 1.22, 1.65);
  controls.update();
};
document.querySelector<HTMLButtonElement>('#shoe-focus')!.onclick = () => {
  controls.target.set(0, .13, .03);
  camera.position.set(.52, .35, .91);
  controls.minDistance = .35;
  controls.update();
};
document.querySelector<HTMLButtonElement>('#full-focus')!.onclick = () => {
  controls.target.set(0, 1.03, 0);
  camera.position.set(0, 1.25, 4.1);
  controls.minDistance = 1.2;
  controls.update();
};
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-angle]')) button.onclick = () => {
  const angle = Number(button.dataset.angle);
  const distance = camera.position.distanceTo(controls.target);
  camera.position.set(controls.target.x + Math.sin(angle) * distance,
    controls.target.y + .22, controls.target.z + Math.cos(angle) * distance);
  controls.update();
};
const resize = () => {
  const w = host.clientWidth, h = host.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
};
const observer = new ResizeObserver(resize);
observer.observe(host);
let last = performance.now(), time = 0;
function step(dt:number,time:number) {
  const body: BodyPose = pose === 'sit' ? { kind: 'sit', at: new THREE.Vector3(0, .475*seatScale, 0), yaw: 0, floor: 0,legs:selectedModel.startsWith('female-')&&(skirtDrape?.active||gownDrape)?'together':undefined } :
    { kind: pose === 'walk' ? 'walk' : 'stand', at: new THREE.Vector3(), yaw: 0, pace: pose === 'walk' ? 1.1 : 0 };
  chair.visible = pose === 'sit';
  avatar?.update({ pose: body, expr: 'neutral', asleep: false, active: false }, dt, time, camera);
  gownDrape?.update(pose === 'sit' ? 'sit' : pose === 'walk' ? 'walk' : 'stand');
  skirtDrape?.update(pose === 'sit' ? 'sit' : pose === 'walk' ? 'walk' : 'stand',dt);
}
renderer.setAnimationLoop(() => {
  const now = performance.now(), dt = Math.min(.05, (now - last) / 1000);
  last = now;time += dt;step(dt,time);
  controls.update();
  renderer.render(scene, camera);
});
function dispose() {
  disposed = true;
  ticket++;
  renderer.setAnimationLoop(null);
  observer.disconnect();
  prints.forEach((fn) => fn());
  avatar?.dispose();
  if (garmentSource) VRMUtils.deepDispose(garmentSource.scene);
  editor.unmount();
  controls.dispose();
  floor.geometry.dispose();
  floor.material.dispose();
  chair.geometry.dispose();
  chair.material.dispose();
  key.shadow.dispose();
  renderer.dispose();
}
window.addEventListener('pagehide', dispose, { once: true });
if (import.meta.hot) import.meta.hot.dispose(dispose);
renderEditor();
updateLookInfo();
void load();
void populateModels();
