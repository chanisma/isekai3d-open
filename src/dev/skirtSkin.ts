import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';
import { coveredBy,triKeys,triCentres } from '../view3d/bodyMask';
import { pieceOf } from '../view3d/vrmDress';

/** Build a local mask before dressing, keeping knees/calves for open hems and
 * low camera angles. No base geometry or source file is overwritten. */
export function prepareSkirtCoverage(target:VRM,donor:VRM) {
  const keys=new Set<string>(),points:Partial<Record<'tops'|'bottoms'|'shoes',number[]>>={};
  donor.scene.traverse(o=>{
    const m=o as THREE.SkinnedMesh;if(!m.isSkinnedMesh)return;
    if([m.material].flat().some(x=>/Body_\d+_SKIN/.test(x.name)))triKeys(m.geometry.attributes.uv.array,m.geometry.index!.array).forEach(k=>keys.add(k));
    const piece=pieceOf(m);if(piece&&piece!=='hair')(points[piece]??=[]).push(...Array.from(m.geometry.attributes.position.array));
  });
  const old=donor.scene.userData.clothes?.covers as Record<string,string>|undefined;
  const covers:Record<string,Set<string>>={tops:new Set(old?.tops?.split(' ').filter(Boolean)),bottoms:new Set(),shoes:new Set(old?.shoes?.split(' ').filter(Boolean))};
  const hip=target.humanoid.getRawBoneNode('hips')!.getWorldPosition(new THREE.Vector3()).y;
  const sourceHip=donor.humanoid.getRawBoneNode('hips')!.getWorldPosition(new THREE.Vector3()).y;
  const scale=hip/.91;
  // Mini skirts keep thighs close to the hem. Longer opaque skirts may hide
  // the pelvis and uppermost thigh, never whole calves or the complete legs.
  let hem=Infinity;
  donor.scene.traverse(o=>{const m=o as THREE.SkinnedMesh;if(!m.isSkinnedMesh||![m.material].flat().some(x=>/Bottoms/.test(x.name)&&!/Socks/.test(x.name)))return;
    const pos=m.geometry.attributes.position;for(let i=0;i<pos.count;i++)hem=Math.min(hem,pos.getY(i));});
  const low=Math.max(hip-.23*scale,Number.isFinite(hem)?hem+(hip-sourceHip)+.06*scale:hip-.23*scale);
  target.scene.traverse(o=>{
    const m=o as THREE.SkinnedMesh;if(!m.isSkinnedMesh||![m.material].flat().some(x=>/Body_\d+_SKIN/.test(x.name)))return;
    const geometry=m.geometry,full={keys:triKeys(geometry.attributes.uv.array,geometry.index!.array),centres:triCentres(geometry.attributes.position.array,geometry.index!.array)};
    if(!old){const inherited=coveredBy(full,keys,points,sourceHip-hip,.10*scale);for(const piece of ['tops','shoes'] as const)for(const i of inherited.get(piece)??[])covers[piece].add(full.keys[i]);}
    const pos=geometry.attributes.position,index=geometry.index!;
    for(let t=0;t<full.keys.length;t++){
      const ys=[0,1,2].map(k=>pos.getY(index.getX(t*3+k)));
      const xs=[0,1,2].map(k=>Math.abs(pos.getX(index.getX(t*3+k))));
      if(Math.min(...ys)<low)covers.tops.delete(full.keys[t]);
      if(Math.min(...ys)>low&&Math.max(...ys)<hip+.13*scale&&Math.max(...xs)<.19*scale)covers.bottoms.add(full.keys[t]);
    }
  });
  donor.scene.userData.clothes={version:1,base:'local-full-body',covers:Object.fromEntries(Object.entries(covers).map(([k,v])=>[k,[...v].join(' ')]))};
}
