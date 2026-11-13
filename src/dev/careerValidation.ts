import * as THREE from 'three';
import { WORK_CLOTHES } from '../game/workClothes';
import type { CareerAsset, CareerPreview } from './careerPreview';

export async function validateCareers(view:CareerPreview,assets:CareerAsset[],files:Partial<Record<'female'|'male',string>>={}) {
  const report:Array<Record<string,unknown>>=[],sheets:HTMLCanvasElement[]=[];
  Object.assign(window,{__careerFit:{report,sheets,running:true}});
  const size=view.renderer.getSize(new THREE.Vector2()),ratio=view.renderer.getPixelRatio();
  view.renderer.setPixelRatio(1);view.renderer.setSize(240,300,false);view.camera.aspect=.8;view.camera.updateProjectionMatrix();
  view.controls.target.set(0,.87,0);view.camera.position.set(0,.97,3.5);view.controls.update();
  try {
    for(const [index,asset] of assets.entries()) {
      const file=files[asset.gender]??(asset.gender==='female'?'female-adult-mina.vrm':'male-adult-jiho.vrm');
      const base=(asset.role?WORK_CLOTHES[asset.role.base]:asset.variant?WORK_CLOTHES[asset.variant]:undefined)??Object.values(WORK_CLOTHES).find(c=>c.set===asset.set)!;
      const clothes=asset.role?{...base,id:asset.variant!,set:asset.set,label:asset.role.label,tint:asset.role.tint??base.tint}:base;
      await view.wearCareer(file,clothes,asset);
      const sheetIndex=Math.floor(index/7),row=index%7;
      if(!sheets[sheetIndex]){const c=document.createElement('canvas');c.width=720;c.height=7*326;sheets.push(c);}
      const context=sheets[sheetIndex].getContext('2d')!;
      let invalid=0,garments=0;
      for(const [column,pose] of (['stand','walk','sit'] as const).entries()) {
        view.pose=pose;
        for(let f=0;f<75;f++)view.step(1/30,f/30);
        view.scene.updateMatrixWorld(true);view.renderer.render(view.scene,view.camera);
        context.fillStyle='#fff';context.fillRect(column*240,row*326,240,26);
        context.fillStyle='#172b25';context.font='11px sans-serif';context.fillText(`${asset.gender} ${asset.variant??asset.set} / ${pose}`,column*240+4,row*326+17);
        context.drawImage(view.renderer.domElement,column*240,row*326+26,240,300);
        view.avatar!.root.traverse(o=>{
          const mesh=o as THREE.SkinnedMesh;
          if(!mesh.isSkinnedMesh||!mesh.visible||![mesh.material].flat().some(m=>m.name.startsWith('CAREER_')))return;
          if(column===0)garments++;
          const v=new THREE.Vector3();mesh.skeleton.update();
          for(let i=0;i<mesh.geometry.attributes.position.count;i++){mesh.getVertexPosition(i,v);if(!v.toArray().every(Number.isFinite))invalid++;}
        });
      }
      report.push({file,set:asset.set,variant:asset.variant,revision:asset.revision,fitRevision:asset.fitRevision,gender:asset.gender,garments,invalid,poses:['stand','walk','sit'],visualReview:'contact sheets; no general cloth collision solver'});
      await new Promise(resolve=>setTimeout(resolve,0));
    }
  } finally {
    view.renderer.setPixelRatio(ratio);view.renderer.setSize(size.x,size.y,false);view.camera.aspect=size.x/size.y;view.camera.updateProjectionMatrix();view.pose='stand';
    Object.assign(window,{__careerFit:{report,sheets,running:false}});
  }
  return report;
}

/** Upper-body review: front, three-quarter and rear neckline at readable size. */
export async function reviewCareerNecks(view:CareerPreview,assets:CareerAsset[]) {
  const sheets:HTMLCanvasElement[]=[],report:Array<Record<string,unknown>>=[];
  Object.assign(window,{__neckReview:{sheets,report,running:true}});
  const size=view.renderer.getSize(new THREE.Vector2()),ratio=view.renderer.getPixelRatio();
  view.renderer.setPixelRatio(1);view.renderer.setSize(360,380,false);
  view.camera.aspect=360/380;view.camera.updateProjectionMatrix();view.pose='stand';
  try {
    for(const [i,asset] of assets.entries()) {
      const base=WORK_CLOTHES[asset.role?.base??asset.variant!]??Object.values(WORK_CLOTHES).find(c=>c.set===asset.set)!;
      await view.wearCareer(asset.gender==='female'?'female-adult-mina.vrm':'male-adult-jiho.vrm',asset.role?{...base,tint:asset.role.tint??base.tint}:base,asset);
      for(let f=0;f<45;f++)view.step(1/30,f/30);
      const sheetIndex=Math.floor(i/4),row=i%4;
      if(!sheets[sheetIndex]){const c=document.createElement('canvas');c.width=1080;c.height=4*404;sheets.push(c);}
      const ctx=sheets[sheetIndex].getContext('2d')!;
      const y=asset.gender==='female'?1.27:1.46;
      for(const [col,angle] of [0,.85,Math.PI].entries()) {
        view.controls.target.set(0,y,0);view.camera.position.set(Math.sin(angle)*1.38,y+.06,Math.cos(angle)*1.38);view.controls.update();
        view.scene.updateMatrixWorld(true);view.renderer.render(view.scene,view.camera);
        ctx.fillStyle='#fff';ctx.fillRect(col*360,row*404,360,24);ctx.fillStyle='#172b25';ctx.font='13px sans-serif';
        ctx.fillText(`${asset.gender} ${asset.variant} / ${['front','3/4','back'][col]}`,col*360+4,row*404+17);
        ctx.drawImage(view.renderer.domElement,col*360,row*404+24,360,380);
      }
      report.push({variant:asset.variant,gender:asset.gender,fitRevision:asset.fitRevision,views:3});
      await new Promise(resolve=>setTimeout(resolve,0));
    }
  } finally {
    view.renderer.setPixelRatio(ratio);view.renderer.setSize(size.x,size.y,false);view.camera.aspect=size.x/size.y;view.camera.updateProjectionMatrix();
    Object.assign(window,{__neckReview:{sheets,report,running:false}});
  }
}
