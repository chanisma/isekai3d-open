import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';
import { createSkirtDrape } from './skirtDrape';

function garment(names:string[]) {
  const scene=new THREE.Group(),hips=new THREE.Bone();
  hips.position.y=1;scene.add(hips);
  const skeleton=new THREE.Skeleton([hips]);
  for(const name of names){
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,.7,0,.1,1.2,0,-.1,1.2,0],3));
    geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(new Array(12).fill(0),4));
    geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute([1,0,0,0,1,0,0,0,1,0,0,0],4));
    const mesh=new THREE.SkinnedMesh(geometry,new THREE.MeshBasicMaterial({name}));
    mesh.bind(skeleton);scene.add(mesh);
  }
  return {scene,humanoid:{getRawBoneNode:()=>hips}} as unknown as VRM;
}

describe('seated garment selection',()=>{
  it.each(['scrubs','chef','service','tactical','captain','cabin','crew','hotel'])('%s pocket seams stay on their original skinning',style=>{
    const drape=createSkirtDrape(garment([`CAREER_Tops_${style}`,'CAREER_Tops_Stitch','CAREER_Tops_Lining']));
    expect(drape.active).toBe(false);
    expect(drape.inspect().pieces).toBe(0);
  });
  it.each(['whitecoat','judgerobe'])('%s pocket and outer panels use the same corrective',style=>{
    const drape=createSkirtDrape(garment([`CAREER_Tops_${style}`,'CAREER_Tops_Stitch','CAREER_Tops_Lining','CAREER_Tops_Pocket']));
    expect(drape.inspect().pieces).toBe(4);
  });
  it('retains ECLIPSE skirt correction without selecting its jacket',()=>{
    const drape=createSkirtDrape(garment(['ECLIPSE_Bottoms_Skirt','ECLIPSE_Tops_Jacket']));
    expect(drape.inspect().pieces).toBe(1);
  });
});
