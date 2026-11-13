import { expect, it } from 'vitest';
import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';
import { fitCoatUnderlayer } from './coatUnderlayer';

it('fits a skirt waistband inside the coat while preserving the visible skirt and donor geometry',()=>{
  const scene=new THREE.Group(),hips=new THREE.Bone();hips.position.y=1;scene.add(hips);
  const coatGeometry=new THREE.CylinderGeometry(.15,.15,.6,32,8,true);coatGeometry.translate(0,1,0);
  scene.add(new THREE.Mesh(coatGeometry,new THREE.MeshBasicMaterial({name:'CAREER_Tops_whitecoat'})));
  const donor=new THREE.BufferGeometry();
  donor.setAttribute('position',new THREE.Float32BufferAttribute([0,1,-.21,.2,1,0,0,.5,-.21],3));
  const skirt=new THREE.Mesh(donor,new THREE.MeshBasicMaterial({name:'Bottoms_Skirt'}));scene.add(skirt);
  scene.updateMatrixWorld(true);
  expect(fitCoatUnderlayer({scene,humanoid:{getRawBoneNode:()=>hips}} as unknown as VRM)).toBe(2);
  expect(skirt.geometry.attributes.position.getZ(0)).toBeGreaterThan(-.15);
  expect(skirt.geometry.attributes.position.getX(1)).toBeLessThan(.15);
  expect(skirt.geometry.attributes.position.getZ(2)).toBeCloseTo(-.21);
  expect(donor.attributes.position.getZ(0)).toBeCloseTo(-.21);
});
