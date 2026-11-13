import { createGownDrape } from './gownDrape';
import { createSkirtDrape } from './skirtDrape';
import { prepareSkirtCoverage } from './skirtSkin';
import { prepareGownSkin } from './gownSkin';
import { robeAsset } from './robeSizing';
/** Local-only actual renderer regression harness; no persistence or cloud imports. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils, type VRM } from '@pixiv/three-vrm';
import { VrmAvatar, type BodyPose } from '../view3d/avatar';
import { baseOf, loadDressed, wearOnBase, transplant, pieceOf, prepareRobeSkin, supplementGownSkin, supplementKnitLegSkin } from '../view3d/vrmDress';
if (!import.meta.env.DEV) throw new Error('Local development only');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(240, 300);
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#dae1db');
scene.add(new THREE.HemisphereLight(0xffffff, 0x777766, 3));
const light = new THREE.DirectionalLight(0xffffff, 2);
light.position.set(2, 4, 5); scene.add(light);
const camera = new THREE.PerspectiveCamera(32, .8, .01, 30);
camera.position.set(0, 1.15, 4.2); camera.lookAt(0, .9, 0);
const status = document.querySelector('#status')!;
const parameters = new URLSearchParams(location.search);
const seraphine = parameters.get('style') === 'seraphine';
const elan = parameters.get('style') === 'elan';
const meridian = parameters.get('style') === 'meridian';
const gijeon = parameters.get('style') === 'gijeon';
const robe = parameters.get('style') === 'robe';
const city = parameters.get('style') === 'city';
const tailor = parameters.get('style') === 'tailor';
const rue = parameters.get('style') === 'rue';
const cozy = parameters.get('style') === 'cozy';
const eclipse = parameters.get('style') === 'eclipse';
const aurelia = parameters.get('style') === 'aurelia';
const nocturne = parameters.get('style') === 'nocturne';
const maison = parameters.get('style') === 'maison';
if (seraphine || elan || meridian || gijeon || robe || city || maison || nocturne || aurelia || eclipse || cozy || rue || tailor) {
  document.title = `${seraphine ? 'SERAPHINE' : elan ? 'ÉLAN' : meridian ? 'MERIDIAN' : gijeon ? 'GIJEON' : robe ? 'ROBE' : tailor ? 'TAILOR' : rue ? 'RUE' : cozy ? 'COZY' : eclipse ? 'ECLIPSE' : aurelia ? 'AURELIA' : nocturne ? 'NOCTURNE' : maison ? 'MAISON' : 'CITY CLUB'} · 모델별 착용 테스트`;
  document.querySelector('h1')!.textContent = `${seraphine ? 'SERAPHINE' : elan ? 'ÉLAN' : meridian ? 'MERIDIAN' : gijeon ? 'GIJEON' : robe ? 'ROBE' : tailor ? 'TAILOR' : rue ? 'RUE' : cozy ? 'COZY' : eclipse ? 'ECLIPSE' : aurelia ? 'AURELIA' : nocturne ? 'NOCTURNE' : maison ? 'MAISON' : 'CITY CLUB'} 01 · 로컬 착용 테스트`;
}
const report: Record<string, unknown>[] = [];
const sheets: HTMLCanvasElement[] = [];
let running = false;
async function parse(buffer: ArrayBuffer, file: string): Promise<VRM> {
  const loader = new GLTFLoader();
  loader.register(p => new VRMLoaderPlugin(p));
  const gltf = await loader.parseAsync(buffer.slice(0), '');
  const vrm = gltf.userData.vrm as VRM;
  VRMUtils.removeUnnecessaryVertices(vrm.scene);
  VRMUtils.combineSkeletons(vrm.scene);
  vrm.scene.traverse(o => { if ((o as THREE.Mesh).isMesh) for (const m of [(o as THREE.Mesh).material].flat()) m.userData.file = file; });
  return vrm;
}
async function run() {
  if (running) return;
  running = true; report.length = 0; sheets.length = 0;
  document.querySelector('#sheets')!.replaceChildren();
  try {
    const files = (await (await fetch('/__vrm/models')).json() as string[])
      .filter(f => /^(male|female)-/.test(f) && !/sample_/i.test(f))
      .filter(f => !(maison || nocturne || aurelia || eclipse || cozy || rue) || f.startsWith('female-adult-'))
      .filter(f => !(elan || seraphine) || /^female-adult-(dain|hana|mina|seoa|jiyu)\.vrm$/.test(f))
      .filter(f => !meridian || /^male-adult-(woojin|jiho|junho|taeo|minjae)\.vrm$/.test(f))
      .filter(f => !gijeon || /^female-teen-(dain|hana|mina|seoa)\.vrm$/.test(f))
      .filter(f => !robe || /^(male|female)-(toddler|child|teen|adult|elder)-(woojin|dain)\.vrm$/.test(f) || /^(male-adult-(taeo|jiho|junho)|female-adult-(hana|mina|seoa))\.vrm$/.test(f))
      .filter(f => !tailor || (parameters.get('scope') === 'all' ? f.startsWith('male-adult-') : /^male-adult-(woojin|taeo|jiho|junho)\.vrm$/.test(f)))
      .filter(f => !rue || parameters.get('scope') === 'all' || /^female-adult-(dain|hana|mina|seoa)\.vrm$/.test(f) || f === 'female-adult-dain@bathing.vrm')
      .filter(f => parameters.get('representatives') !== '1' || /-(woojin|dain)\.vrm$/.test(f)).sort();
    const donorBytes = robe ? null : await (await fetch(seraphine ? '/prototypes/generated/seraphine-01.vrm' : elan ? '/prototypes/generated/elan-01.vrm' : meridian ? '/prototypes/generated/meridian-01.vrm' : gijeon ? '/prototypes/generated/gijeon-01.vrm' : tailor ? '/prototypes/generated/tailor-01.vrm' : rue ? '/prototypes/generated/rue-01.vrm' : cozy ? '/prototypes/generated/cozy-01.vrm' : eclipse ? '/prototypes/generated/eclipse-01.vrm' : aurelia ? '/prototypes/generated/aurelia-01.vrm' : nocturne ? '/prototypes/generated/nocturne-01.vrm' : maison ? '/prototypes/generated/maison-01.vrm' : city ? '/prototypes/generated/city-club-01.vrm' : '/prototypes/generated/off-duty-03-look.vrm')).arrayBuffer();
    for (const [i, file] of files.entries()) {
      status.textContent = `${i + 1}/${files.length} ${file}`;
      let avatar: VrmAvatar | undefined, donor: VRM | undefined;
      try {
        const base = await baseOf(file);
        // A character's file is only their clothes: the robe goes on their full body, the rest on them dressed.
        const target = !base ? await loadDressed(file, {}) : await parse(await (async () => {
          const response = await fetch(`/models/${encodeURIComponent(base ?? file).replace(/%40/g, '@')}`);
          if (!response.ok) throw new Error(`HTTP ${response.status}: ${file}`);
          return response.arrayBuffer();
        })(), file);
        donor = await parse(donorBytes ?? await (await fetch(robeAsset(file))).arrayBuffer(), "garment-donor");
        if(base&&(maison||aurelia||eclipse||elan||cozy||rue||gijeon||nocturne||seraphine||robe))prepareSkirtCoverage(target,donor);
        const ratios = ['hips', 'head', 'leftFoot', 'leftHand'].map(name => {
          const t = target.humanoid.getRawBoneNode(name as 'hips')!.getWorldPosition(new THREE.Vector3());
          const d = donor!.humanoid.getRawBoneNode(name as 'hips')!.getWorldPosition(new THREE.Vector3());
          return { bone: name, target: t.toArray(), source: d.toArray(), distance: t.distanceTo(d) };
        });
        if (base) wearOnBase(target, Object.fromEntries((['tops', 'bottoms', 'shoes'] as const).map(piece => [piece, { file: `local-review:${parameters.get('style')}:${file}`, vrm: donor! }])));
        else {
          for (const piece of ['tops', 'bottoms', 'shoes'] as const) transplant(target, donor, piece);
          if (robe) prepareRobeSkin(target, donor);
        }
        if (!base && rue && file !== 'female-adult-seoa.vrm') supplementKnitLegSkin(target, donor, .27);
        if (!base && cozy && file !== 'female-adult-seoa.vrm') supplementKnitLegSkin(target, donor);
        if (!base && nocturne) supplementGownSkin(target, donor, file !== 'female-adult-mina@formal.vrm');
        if (seraphine) prepareGownSkin(target);
        let garmentMeshes = 0, triangles = 0, invalidGroups = 0;
        target.scene.traverse(o => {
          const m = o as THREE.SkinnedMesh;
          if (!m.isSkinnedMesh || !m.name.endsWith('(transplanted)')) return;
          garmentMeshes++;
          triangles += (m.geometry.index?.count ?? m.geometry.attributes.position.count) / 3;
          if (m.geometry.groups.some(g => g.count !== m.geometry.index?.count)) invalidGroups++;
          for (const mat of [m.material].flat()) {
            const color = (mat as THREE.MeshStandardMaterial).color;
            if (color && !city && !maison && !nocturne && !aurelia && !eclipse && !cozy && !rue && !tailor && !robe && !gijeon && !meridian && !elan && !seraphine) color.set(pieceOf(m) === 'tops' ? '#363e3c' : pieceOf(m) === 'bottoms' ? '#737e73' :
              /Midsole|Laces/.test(mat.name) ? '#e6dfcd' : '#363e3c');
          }
        });
        avatar = new VrmAvatar(target, 1); scene.add(avatar.root);
        const gownDrape = seraphine ? createGownDrape(target) : null;
        const skirtDrape = createSkirtDrape(target);
        const robeScale = robe ? target.humanoid.getRawBoneNode('neck')!.getWorldPosition(new THREE.Vector3()).y / 1.47 : 1;
        if (robe) { camera.position.set(0, 1.15*robeScale, 4.2*robeScale); camera.lookAt(0, .9*robeScale, 0); }
        const sheetIndex = Math.floor(i / 8), row = i % 8;
        if (!sheets[sheetIndex]) {
          const sheet = document.createElement('canvas'); sheet.width = 720; sheet.height = 8 * 330;
          sheets.push(sheet); document.querySelector('#sheets')!.append(sheet);
        }
        const context = sheets[sheetIndex].getContext('2d')!;
        let invalidVertices = 0;
        const drapeChecks: Array<{ pose: string; frame: number; samples: number; outside: number; hemMin: number; hemMax: number }> = [];
        for (const [p, kind] of (['stand', 'walk', 'sit'] as const).entries()) {
          const pose: BodyPose = kind === 'sit' ? { kind, at: new THREE.Vector3(0, .475*robeScale, 0), yaw: 0, floor: 0,legs:file.startsWith('female-')&&(skirtDrape.active||gownDrape)?'together':undefined } :
            { kind, at: new THREE.Vector3(), yaw: 0, pace: kind === 'walk' ? 1.1 : 0 };
          for (let frame = 0; frame < 210; frame++) {
            avatar.update({ pose, expr: 'neutral', asleep: false, active: false }, 1/60, (frame + 30)/60, camera);
            gownDrape?.update(kind);
            skirtDrape.update(kind);
            if (gownDrape && ((file === 'female-adult-mina.vrm' && frame >= 90 && frame % 10 === 0) || frame === 209)) drapeChecks.push({ pose: kind, frame, ...gownDrape.inspect() });
          }
          scene.updateMatrixWorld(true);
          renderer.render(scene, camera);
          target.scene.traverse(o => {
            const m = o as THREE.SkinnedMesh;
            if (!m.isSkinnedMesh || !m.name.endsWith('(transplanted)')) return;
            const v = new THREE.Vector3();
            for (let index = 0; index < m.geometry.attributes.position.count; index++) {
              m.getVertexPosition(index, v);
              if (!v.toArray().every(Number.isFinite)) invalidVertices++;
            }
          });
          context.drawImage(renderer.domElement, p * 240, row * 330 + 30);
          context.fillStyle = '#fff'; context.fillRect(p * 240, row * 330, 240, 30);
          context.fillStyle = '#14251a'; context.font = '11px sans-serif';
          context.fillText(`${file.replace('.vrm','')} / ${kind}`, p * 240 + 4, row * 330 + 20);
        }
        report.push({ file, base, garmentMeshes, triangles, invalidGroups, invalidVertices, drapeChecks, ratios, poses: ['stand', 'walk', 'sit'], render: 'passed', fit: 'requires visual review; no collision solver' });
      } catch (error) { report.push({ file, error: String(error) }); }
      finally { avatar?.dispose(); if (donor) VRMUtils.deepDispose(donor.scene); }
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    status.textContent = `${report.length}개 완료 · 오류 ${report.filter(r => r.error).length} · 체형 적합성은 이미지로 별도 판정`;
  } finally { running = false; }
}
document.querySelector<HTMLButtonElement>('#run')!.onclick = () => void run();
Object.assign(window, { __fit: { run, report, sheets, get running() { return running; } } });
