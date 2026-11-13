import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils, type VRM } from '@pixiv/three-vrm';
import { VrmAvatar, type BodyPose } from '../view3d/avatar';
import { loadVRM } from '../view3d/vrm';
import { baseOf, loadDressed, wearOnBase, piecesIn, type Dress } from '../view3d/vrmDress';
import type { WorkClothes } from '../game/workClothes';
import { createSkirtDrape } from './skirtDrape';
import { fitCoatUnderlayer } from './coatUnderlayer';

export interface CareerAsset {
  set: string; gender: 'female' | 'male'; file: string; glb: string;
  variant?: string; revision?: number; fitRevision?:number; features?: string[]; label?: string;
  role?: {id:string;label:string;career:string;base:string;set:string;cut:string;details:string[];description:string;tint?:WorkClothes['tint']}|null;
  bytes: number; vrmBytes: number; triangles: number;
  pieces: Array<'tops' | 'bottoms'>; tintMaterials: string[];
}
export const careerURL=(file:string)=>`/prototypes/generated/workwear/${file}`;

/** Separate development stage: generated assets never enter the live models list. */
export class CareerPreview {
  readonly scene=new THREE.Scene();
  readonly camera=new THREE.PerspectiveCamera(30,1,.015,30);
  readonly renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
  readonly controls:OrbitControls;
  avatar:VrmAvatar|null=null;
  pose:'stand'|'walk'|'sit'='stand';
  private ticket=0;
  private time=0;
  private donor:VRM|null=null;
  private skirtDrape:ReturnType<typeof createSkirtDrape>|null=null;
  private femaleSeat=false;
  private observer:ResizeObserver;
  pending:Promise<void>=Promise.resolve();
  onStatus?:(text:string)=>void;
  constructor(host:HTMLElement) {
    if(!import.meta.env.DEV)throw new Error('Local career preview only');
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));host.append(this.renderer.domElement);
    this.scene.background=new THREE.Color('#c7d0cb');
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.scene.add(new THREE.HemisphereLight('#ffffff','#8b938b',1.3));
    const light=new THREE.DirectionalLight('#fff5e5',2.2);light.position.set(2,4,3);light.castShadow=true;
    light.shadow.mapSize.set(2048,2048);light.shadow.camera.left=-1.4;light.shadow.camera.right=1.4;light.shadow.camera.top=2.4;light.shadow.camera.bottom=-.6;light.shadow.bias=-.00015;light.shadow.normalBias=.002;this.scene.add(light);
    const rim=new THREE.DirectionalLight('#e4f0ff',1);rim.position.set(-3,2,-2);this.scene.add(rim);
    const floor=new THREE.Mesh(new THREE.CircleGeometry(3,64),new THREE.MeshStandardMaterial({color:'#e5e5df'}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;this.scene.add(floor);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.target.set(0,.85,0);this.camera.position.set(0,1,3.6);this.controls.enableDamping=true;
    this.observer=new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();});this.observer.observe(host);
    let last=performance.now();
    this.renderer.setAnimationLoop(()=>{const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;this.time+=dt;this.step(dt,this.time);this.controls.update();this.renderer.render(this.scene,this.camera);});
  }
  step(dt:number,time:number) {
    const pose:BodyPose=this.pose==='sit'?{kind:'sit',at:new THREE.Vector3(0,.475,0),yaw:0,floor:0,legs:this.femaleSeat&&this.skirtDrape?.active?'together':undefined}:{kind:this.pose,at:new THREE.Vector3(),yaw:0,pace:1.1};
    this.avatar?.update({pose,expr:'neutral',asleep:false,active:false},dt,time,this.camera);
    this.skirtDrape?.update(this.pose,dt);
  }
  wear(body:{kind:'vroid';file:string;dress?:Dress},_viaRoom=false) {
    this.pending=this.load(body.file,undefined,undefined,body.dress);
  }
  wearCareer(file:string,clothes:WorkClothes,asset:CareerAsset) {
    this.pending=this.load(file,clothes,asset);return this.pending;
  }
  private async load(file:string,clothes?:WorkClothes,asset?:CareerAsset,dress?:Dress) {
    const ticket=++this.ticket;let target:VRM|undefined,donor:VRM|undefined;
    try {
      if(asset&&clothes) {
        const base=await baseOf(file);if(!base)throw new Error(`${file}: complete base body missing`);
        target=await loadVRM(base);
        const own=await loadVRM(file);
        const loader=new GLTFLoader();loader.register(p=>new VRMLoaderPlugin(p));
        const gltf=await loader.loadAsync(careerURL(asset.file));donor=gltf.userData.vrm as VRM;
        const clothMaterials=new Map<THREE.Material,THREE.MeshStandardMaterial>();
        donor.scene.traverse(o=>{
          const mesh=o as THREE.Mesh;if(!mesh.isMesh)return;
          for(const material of [mesh.material].flat()) {
            if(!asset.tintMaterials.includes(material.name))continue;
            const piece=material.name.includes('Bottoms')?'bottoms':'tops';const color=clothes.tint?.[piece];if(!color)continue;
            const m=material as THREE.Material&{color:THREE.Color;shadeColorFactor:THREE.Color};m.color.set(color);m.shadeColorFactor.copy(m.color).multiplyScalar(.7);
          }
          // Use the exported cloth PBR properties for close inspection. Avatar
          // skin/hair retain their own VRM materials; only CAREER cloth changes.
          const convert=(source:THREE.Material)=>{
            if(!source.name.startsWith('CAREER_'))return source;
            // MToon creates an expanded outline pass. Converting that pass to
            // opaque PBR would cover the tinted garment with its original color.
            if(source.name.endsWith('(Outline)')){source.visible=false;return source;}
            let made=clothMaterials.get(source);if(made)return made;
            const m=source as THREE.Material&{color:THREE.Color;map:THREE.Texture|null;normalMap:THREE.Texture|null};
            made=new THREE.MeshStandardMaterial({name:m.name,color:m.color,map:m.map,normalMap:m.normalMap,normalScale:new THREE.Vector2(.38,.38),roughness:Number(m.userData.roughness??.72),metalness:Number(m.userData.metalness??0),side:THREE.DoubleSide});
            clothMaterials.set(source,made);return made;
          };
          mesh.material=Array.isArray(mesh.material)?mesh.material.map(convert):convert(mesh.material);
          mesh.castShadow=true;mesh.receiveShadow=true;
        });
        // A one-piece dress has no separable bottoms once its top is replaced.
        // Give those preview characters neutral trousers under top-only coats.
        let lower={file,vrm:own};
        if(!asset.pieces.includes('bottoms')&&!piecesIn(own).includes('bottoms')) {
          const trousers=asset.gender==='female'?'female-adult-dain.vrm':'male-adult-jiho@formal.vrm';
          lower={file:trousers,vrm:await loadVRM(trousers)};
        }
        wearOnBase(target,Object.fromEntries((['tops','bottoms','shoes'] as const).map(piece=>[piece,asset.pieces.includes(piece as 'tops'|'bottoms')?{file:careerURL(asset.file),vrm:donor!}:piece==='bottoms'?lower:{file,vrm:own}])));
        if(asset.set==='whitecoat'||asset.set==='judgerobe')fitCoatUnderlayer(target);
        // Own clothing meshes/materials are now owned by the dressed instance;
        // dispose through the avatar, not while their transplanted copies use them.
      } else target=await loadDressed(file,dress??{});
      if(ticket!==this.ticket){VRMUtils.deepDispose(target.scene);if(donor)VRMUtils.deepDispose(donor.scene);return;}
      this.avatar?.dispose();if(this.donor)VRMUtils.deepDispose(this.donor.scene);
      this.avatar=new VrmAvatar(target,1);this.donor=donor??null;this.scene.add(this.avatar.root);
      this.skirtDrape=createSkirtDrape(target,false,file.startsWith('female-')?'female':'male');
      this.femaleSeat=file.startsWith('female-');
      this.step(0,0);this.onStatus?.(`${file} · ${clothes?.label??'기존 복장'} · ${asset?'로컬 생성 의상 / 기본 몸에 착용':'기존 모델'}`);
    } catch(error) { this.onStatus?.(`착용 실패: ${String(error)}`);throw error; }
  }
  dispose(){++this.ticket;this.renderer.setAnimationLoop(null);this.observer.disconnect();this.avatar?.dispose();if(this.donor)VRMUtils.deepDispose(this.donor.scene);this.controls.dispose();this.renderer.dispose();}
}
