import * as THREE from 'three';
import type { VrmAvatar } from '../view3d/avatar';

interface Atelier {
  renderer:THREE.WebGLRenderer;scene:THREE.Scene;camera:THREE.PerspectiveCamera;
  controls:{target:THREE.Vector3;update:()=>void};avatar:VrmAvatar;
  reviewLook:(look:string,file:string)=>Promise<void>;reviewPose:(kind:string)=>void;
}
export const skirtCases=[
  ...['maison','aurelia','eclipse','elan','cozy','rue','nocturne','seraphine'].map(look=>({look,file:'female-adult-mina.vrm'})),
  {look:'gijeon',file:'female-teen-dain.vrm'},
  ...['female','male'].flatMap(sex=>['toddler','child','teen','adult','elder'].map(age=>({look:'robe',file:`${sex}-${age}-${sex==='female'?'dain':'woojin'}.vrm`}))),
  ...['female-adult-dain.vrm','female-adult-hana.vrm','female-adult-seoa.vrm'].flatMap(file=>['cozy','elan','nocturne','seraphine'].map(look=>({look,file}))),
];

export async function reviewSkirts(a:Atelier,cases=skirtCases){
  const sheets:HTMLCanvasElement[]=[],report:Array<Record<string,unknown>>=[];
  Object.assign(window,{__skirtAudit:{sheets,report,running:true}});
  const size=a.renderer.getSize(new THREE.Vector2()),ratio=a.renderer.getPixelRatio();
  try{
    for(const item of cases){
      await a.reviewLook(item.look,item.file);
      const scale=item.look==='robe'?a.avatar.vrm.humanoid.getRawBoneNode('neck')!.getWorldPosition(new THREE.Vector3()).y/1.47:1;
      a.renderer.setPixelRatio(1);a.renderer.setSize(300,380,false);a.camera.aspect=300/380;a.camera.updateProjectionMatrix();
      const sheet=document.createElement('canvas');sheet.width=900;sheet.height=812;const ctx=sheet.getContext('2d')!;
      let invalid=0;
      for(const [j,[pose,angle,low]] of ([['stand',0,false],['walk',.7,false],['sit',0,false],['sit',Math.PI/2,false],['sit',Math.PI,true],['stand',0,false]] as const).entries()){
        a.reviewPose(pose);a.controls.target.set(0,.72*scale,.1*scale);a.camera.position.set(Math.sin(angle)*2.6*scale,(low?.27:1)*scale,Math.cos(angle)*2.6*scale);a.controls.update();
        a.scene.updateMatrixWorld(true);a.renderer.render(a.scene,a.camera);
        ctx.fillStyle='#fff';ctx.fillRect(j%3*300,Math.floor(j/3)*406,300,26);ctx.fillStyle='#172b25';ctx.font='11px sans-serif';ctx.fillText(`${item.look} ${item.file.replace('.vrm','')} ${pose}${low?' low':''}`,j%3*300+3,Math.floor(j/3)*406+17);
        ctx.drawImage(a.renderer.domElement,j%3*300,Math.floor(j/3)*406+26);
        a.avatar.root.traverse(o=>{const m=o as THREE.Mesh;if(!m.isMesh||!m.visible)return;const pos=m.geometry.attributes.position;for(let k=0;k<pos.count;k++)if(!Number.isFinite(pos.getX(k)+pos.getY(k)+pos.getZ(k)))invalid++;});
      }
      sheets.push(sheet);report.push({...item,invalid,views:6,transitionSeconds:3});
      await new Promise(resolve=>setTimeout(resolve,0));
    }
  }finally{
    a.renderer.setPixelRatio(ratio);a.renderer.setSize(size.x,size.y,false);a.camera.aspect=size.x/size.y;a.camera.updateProjectionMatrix();
    Object.assign(window,{__skirtAudit:{sheets,report,running:false}});
  }
}
