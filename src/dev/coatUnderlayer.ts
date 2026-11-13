import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';
import { pieceOf } from '../view3d/vrmDress';

/** Fit the covered waistband of an existing skirt inside the local white coat.
 * Preserve its visible hem, material and skin weights. Never modify donor assets. */
export function fitCoatUnderlayer(vrm:VRM) {
  const coats:THREE.Mesh[]=[],bottoms:THREE.Mesh[]=[];
  vrm.scene.traverse(o=>{
    const m=o as THREE.Mesh;if(!m.isMesh||!m.visible)return;
    if([m.material].flat().some(a=>/^CAREER_Tops_(whitecoat|judgerobe)$/.test(a.name)))coats.push(m);
    else if(pieceOf(m)==='bottoms')bottoms.push(m);
  });
  if(!coats.length)return 0;
  const triangles:THREE.Vector3[][]=[];let hem=Infinity;
  for(const m of coats){
    const p=m.geometry.attributes.position,index=m.geometry.index;
    for(let i=0;i<p.count;i++)hem=Math.min(hem,p.getY(i));
    for(let i=0;i<(index?.count??p.count);i+=3)triangles.push([0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(p,index?index.getX(i+k):i+k)));
  }
  const hip=vrm.humanoid.getRawBoneNode('hips')!.getWorldPosition(new THREE.Vector3()).y;
  let changed=0;
  for(const m of bottoms){
    const geometry=m.geometry.clone(),p=geometry.attributes.position;
    for(let i=0;i<p.count;i++){
      const y=p.getY(i);if(y<hem||y>hip+.18)continue;
      const x=p.getX(i),z=p.getZ(i),r=Math.hypot(x,z+.015);if(r<1e-6)continue;
      const dx=x/r,dz=(z+.015)/r;let limit=Infinity;
      for(const triangle of triangles){
        const hits:THREE.Vector3[]=[];
        for(let k=0;k<3;k++){
          const a=triangle[k],b=triangle[(k+1)%3];
          if((a.y<=y&&b.y>y)||(b.y<=y&&a.y>y))hits.push(a.clone().lerp(b,(y-a.y)/(b.y-a.y)));
        }
        if(hits.length!==2)continue;
        const [a,b]=hits,ex=b.x-a.x,ez=b.z-a.z,det=dx*ez-dz*ex;
        if(Math.abs(det)<1e-9)continue;
        const radius=(a.x*ez-(a.z+.015)*ex)/det;
        const t=(a.x*dz-(a.z+.015)*dx)/det;
        if(radius>0&&t>=0&&t<=1)limit=Math.min(limit,radius);
      }
      if(!Number.isFinite(limit)||r<=limit-.009)continue;
      const blend=THREE.MathUtils.smoothstep(y,hem,hem+.055);
      const fitted=THREE.MathUtils.lerp(r,Math.max(.01,limit-.009),blend);
      p.setXYZ(i,dx*fitted,y,dz*fitted-.015);changed++;
    }
    p.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingSphere();m.geometry=geometry;
  }
  return changed;
}
