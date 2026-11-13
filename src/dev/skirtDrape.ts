import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';

const ease=(x:number)=>THREE.MathUtils.smoothstep(x,0,1);
const skirtMaterial=/^(MAISON|AURELIA|ECLIPSE|ELAN|COZY|RUE|GIJEON|NOCTURNE)_Bottoms_(?!.*Socks)|^ROBE_.*(?:Tops|Hem)/;

/** Local sitting corrective. Cloth length travels over the lap, then falls;
 * it is never raised as a rigid cone or expanded around the entire chair. */
export function createSkirtDrape(vrm:VRM,includeSeraphine=false,wearer?:'female'|'male') {
  const forward=vrm.meta?.metaVersion==='0'?-1:1;
  vrm.scene.updateMatrixWorld(true);
  const hipBone=vrm.humanoid.getRawBoneNode('hips')!;
  const restHip=hipBone.getWorldPosition(new THREE.Vector3());
  const restInverse=hipBone.matrixWorld.clone().invert();
  const pieces:Array<{source:THREE.SkinnedMesh;mesh:THREE.Mesh;rest:Float32Array;anchors:THREE.Vector3[]}> = [];
  let top=-Infinity,hem=Infinity;
  let whiteCoat=false,judgeRobe=false;
  vrm.scene.traverse(o=>{const m=o as THREE.Mesh;if(!m.isMesh)return;for(const material of [m.material].flat()){
    if(/^CAREER_Tops_whitecoat/.test(material.name))whiteCoat=true;
    if(/^CAREER_Tops_judgerobe/.test(material.name))judgeRobe=true;
  }});
  const coat=whiteCoat||judgeRobe,femaleCoat=coat&&wearer==='female';
  vrm.scene.traverse(o=>{
    const source=o as THREE.SkinnedMesh;
    if(!source.isSkinnedMesh||!source.visible)return;
    const materials=[source.material].flat();
    let nativeSkirt=false;
    if(materials.some(m=>/Tops|Bottoms|Onepiece/.test(m.name)&&!/^SERAPHINE_/.test(m.name))){
      const joints=source.geometry.attributes.skinIndex,weights=source.geometry.attributes.skinWeight;
      for(let i=0;i<joints.count&&!nativeSkirt;i++)for(let k=0;k<4;k++)if(weights.getComponent(i,k)>.05&&/Skirt/i.test(source.skeleton.bones[joints.getComponent(i,k)]?.name??''))nativeSkirt=true;
    }
    // Shared pocket linings and stitching are not skirts. Select the entire
    // coat assembly only when its actual outer garment is a coat/robe.
    if(!nativeSkirt&&!materials.some(m=>skirtMaterial.test(m.name)||((whiteCoat||judgeRobe)&&/^CAREER_Tops_/.test(m.name))||(includeSeraphine&&/^SERAPHINE_Bottoms_/.test(m.name))))return;
    const pos=source.geometry.attributes.position;
    for(let i=0;i<pos.count;i++){top=Math.max(top,pos.getY(i));hem=Math.min(hem,pos.getY(i));}
    const mesh=new THREE.Mesh(source.geometry.clone(),source.material);mesh.name=source.name+' (seated drape)';mesh.frustumCulled=false;mesh.castShadow=true;
    mesh.position.copy(source.position);mesh.quaternion.copy(source.quaternion);mesh.scale.copy(source.scale);
    pieces.push({source,mesh,rest:Float32Array.from(pos.array),anchors:[]});
  });
  const waist=Math.min(top,restHip.y+.15),length=waist-hem;
  for(const p of pieces){
    for(let i=0;i<p.rest.length;i+=3){
      const anchor=new THREE.Vector3(p.rest[i],waist,p.rest[i+2]);p.source.localToWorld(anchor);anchor.applyMatrix4(restInverse);p.anchors.push(anchor);
    }
    p.source.parent!.add(p.mesh);p.mesh.visible=false;
  }
  const v=new THREE.Vector3(),skinned=new THREE.Vector3(),inverse=new THREE.Matrix4();
  let blend=0;
  return {
    active:pieces.length>0,
    inspectionMesh:pieces.reduce<THREE.Mesh|undefined>((best,p)=>!best||p.mesh.geometry.attributes.position.count>best.geometry.attributes.position.count?p.mesh:best,undefined),
    inspect(){return {pieces:pieces.length,length,blend,foldProfile:femaleCoat?'female-coat':'standard'};},
    update(kind:'stand'|'walk'|'sit',dt=1/60){
      if(!pieces.length)return;
      blend=THREE.MathUtils.damp(blend,kind==='sit'?1:0,9,dt);
      vrm.scene.updateMatrixWorld(true);
      const hips=hipBone.getWorldPosition(new THREE.Vector3());
      const knees=['leftLowerLeg','rightLowerLeg'].map(n=>vrm.humanoid.getRawBoneNode(n as 'leftLowerLeg')!.getWorldPosition(new THREE.Vector3()));
      const thighs=coat?['leftUpperLeg','rightUpperLeg'].map((n,i)=>{
        const start=vrm.humanoid.getRawBoneNode(n as 'leftUpperLeg')!.getWorldPosition(new THREE.Vector3());
        const axis=knees[i].clone().sub(start);
        return {start,axis,lengthSq:axis.lengthSq(),radius:axis.length()*.24};
      }):[];
      const kneeY=(knees[0].y+knees[1].y)/2,kneeZ=Math.max(...knees.map(k=>k.z));
      const settled=ease((.32-(hips.y-kneeY))/.24)*blend;
      for(const p of pieces){
        p.source.visible=settled<.001;p.mesh.visible=!p.source.visible;if(!p.mesh.visible)continue;
        p.source.skeleton.update();p.mesh.updateWorldMatrix(true,false);inverse.copy(p.mesh.matrixWorld).invert();
        const pos=p.mesh.geometry.attributes.position as THREE.BufferAttribute;
        for(let i=0;i<pos.count;i++){
          const x=p.rest[i*3]*forward,y=p.rest[i*3+1],z=p.rest[i*3+2]*forward;
          p.source.getVertexPosition(i,skinned);p.source.localToWorld(skinned);
          const distance=Math.max(0,waist-y),attachment=ease(distance/.075);
          const anchor=p.anchors[i].clone().applyMatrix4(hipBone.matrixWorld);
          const angle=Math.atan2(x,z+.018),front=ease((Math.cos(angle)+.25)/1.1);
          // Both front and back panels wrap the thighs. Leaving the back
          // vertical would drive it through the seat like a rigid curtain.
          const lapEnd=new THREE.Vector3(anchor.x,kneeY+THREE.MathUtils.lerp(-.075,.065,front),kneeZ+THREE.MathUtils.lerp(-.12,.065,front));
          // A closed-knee female seat bends at the actual thigh root, not
          // at the standing waistband. Preserve the existing male path.
          const thigh=thighs[x>=0?0:1];
          const creaseY=femaleCoat?Math.min(anchor.y,thigh.start.y+thigh.radius):anchor.y;
          const corner=new THREE.Vector3(anchor.x,THREE.MathUtils.lerp(hips.y-.08,creaseY,front),anchor.z);
          const drop=Math.max(0,anchor.y-corner.y);
          const lapLength=Math.max(.12,Math.hypot(lapEnd.y-corner.y,lapEnd.z-corner.z));
          if(distance<drop)v.set(anchor.x,anchor.y-distance,anchor.z);
          else {
            const along=Math.min(1,(distance-drop)/lapLength);
            v.set(anchor.x,THREE.MathUtils.lerp(corner.y,lapEnd.y,along)-Math.max(0,distance-drop-lapLength),THREE.MathUtils.lerp(corner.z,lapEnd.z,along));
          }
          // Retain folds and flare without using skirt spring rotations.
          v.x=THREE.MathUtils.lerp(anchor.x,x,ease(distance/.15));
          // Use the ECLIPSE lap/underside path for coats too. Only resolve
          // local thigh intersections, rather than lifting the entire side
          // panel or adding a fixed flare to the hem.
          if(coat&&distance>.075)for(const thigh of thighs){
            const along=THREE.MathUtils.clamp(v.clone().sub(thigh.start).dot(thigh.axis)/thigh.lengthSq,0,1);
            const centre=thigh.start.clone().addScaledVector(thigh.axis,along);
            const radial=v.clone().sub(centre),radius=thigh.radius+.008;
            if(radial.lengthSq()<radius*radius){
              if(radial.lengthSq()<1e-10)radial.set(0,1,0);
              v.copy(centre).addScaledVector(radial.normalize(),radius);
            }
          }
          v.y=Math.max(.025,v.y);
          v.lerpVectors(skinned,v,settled*attachment).applyMatrix4(inverse);
          pos.setXYZ(i,v.x,v.y,v.z);
        }
        pos.needsUpdate=true;p.mesh.geometry.computeVertexNormals();p.mesh.geometry.computeBoundingSphere();
      }
    },
  };
}


