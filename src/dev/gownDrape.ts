import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';
import { createSkirtDrape } from './skirtDrape';

const smooth = (x: number) => { x = THREE.MathUtils.clamp(x, 0, 1); return x*x*(3-2*x); };

/** Pose corrective for this local floor-length gown, not a general cloth solver.
 * Waist follows the skin; the lower skirt hangs towards the floor instead of
 * inheriting short-skirt spring rotations. Legs remain fully present underneath.
 */
export function createGownDrape(vrm: VRM) {
  const seatedDrape=createSkirtDrape(vrm,true);
  const pieces: { source: THREE.SkinnedMesh; mesh: THREE.Mesh; rest: Float32Array; anchors: number[] }[] = [];
  let bodice: THREE.SkinnedMesh | undefined;
  vrm.scene.traverse(object => {
    const source = object as THREE.SkinnedMesh;
    if (source.isSkinnedMesh && [source.material].flat().some(m => m.name === 'SERAPHINE_Tops_SweetheartSatin')) bodice=source;
    if (!source.isSkinnedMesh || ![source.material].flat().some(m => /SERAPHINE_Bottoms_(PleatedSilk|RolledHem)/.test(m.name))) return;
    const geometry = source.geometry.clone();
    const mesh = new THREE.Mesh(geometry, source.material);
    mesh.name = source.name + ' (pose drape)'; mesh.frustumCulled = false; mesh.castShadow = true;
    mesh.position.copy(source.position); mesh.quaternion.copy(source.quaternion); mesh.scale.copy(source.scale);
    const rest = Float32Array.from(geometry.attributes.position.array);
    const anchors = Array.from({ length: Math.min(144, rest.length/3) }, (_,i) => i);
    pieces.push({ source, mesh, rest, anchors });
  });
  for (const p of pieces) { p.source.visible = false; p.source.parent!.add(p.mesh); }
  const main = pieces.find(p => p.rest.length > 2000);
  const v = new THREE.Vector3(), inverse = new THREE.Matrix4();
  let sitting = false;
  const bone = (name: 'hips' | 'leftLowerLeg' | 'rightLowerLeg' | 'leftFoot' | 'rightFoot') =>
    vrm.scene.worldToLocal(vrm.humanoid.getRawBoneNode(name)!.getWorldPosition(new THREE.Vector3()));
  return {
    inspect() {
      if (!main) return { samples: 0, outside: 0, hemMin: 0, hemMax: 0 };
      const inspected=seatedDrape.inspect().blend>.001?(seatedDrape.inspectionMesh??main.mesh):main.mesh;
      inspected.updateMatrixWorld(true);
      const ray = new THREE.Raycaster(), point = new THREE.Vector3();
      const outsidePoints: number[][]=[];
      let samples=0, outside=0, hemMin=Infinity, hemMax=-Infinity;
      const p=inspected.geometry.attributes.position;
      for(let i=p.count-144;i<p.count;i++) {
        point.fromBufferAttribute(p,i);inspected.localToWorld(point);
        hemMin=Math.min(hemMin,point.y);hemMax=Math.max(hemMax,point.y);
      }
      vrm.scene.traverse(object => {
        const mesh=object as THREE.SkinnedMesh;
        if(!mesh.isSkinnedMesh || !mesh.visible || ![mesh.material].flat().some(m=>m.name==='SERAPHINE_Shoes_PetrolSatin' || /Body_\d+_SKIN/.test(m.name))) return;
        mesh.skeleton.update();
        const rest=mesh.geometry.attributes.position;
        const candidates=[...new Set(mesh.geometry.index?.array ?? [])].filter(i=>rest.getY(i)<.24);
        for(let sample=0;sample<candidates.length;sample+=Math.max(1,Math.floor(candidates.length/48))) {
          const i=candidates[sample];
          mesh.getVertexPosition(i,point);mesh.localToWorld(point);
          if(point.y<hemMax+.012)continue; // Toes legitimately visible below the open hem.
          samples++;
          ray.set(point,new THREE.Vector3(1,0,0));const right=ray.intersectObject(inspected,false).length;
          ray.set(point,new THREE.Vector3(-1,0,0));const left=ray.intersectObject(inspected,false).length;
          if(!right || !left) { outside++;if(outsidePoints.length<6)outsidePoints.push(point.toArray()); }
        }
      });
      return {samples,outside,hemMin,hemMax,outsidePoints};
    },
    update(kind: 'stand' | 'walk' | 'sit' = 'stand') {
      if (!main) return;
      vrm.scene.updateMatrixWorld(true);
      main.source.skeleton.update();
      const hip = bone('hips'), knees = [bone('leftLowerLeg'), bone('rightLowerLeg')], feet = [bone('leftFoot'), bone('rightFoot')];
      // Root moves down/back when sitting, so the floor must be expressed in
      // that moving local frame, rather than being attached to the hips.
      const floor = vrm.scene.worldToLocal(new THREE.Vector3(0, 0, 0)).y;
      const seatZ=vrm.scene.worldToLocal(new THREE.Vector3(0,0,0)).z;
      const kneeY = (knees[0].y + knees[1].y)/2;
      const kneeZ = Math.max(...knees.map(k => k.z));
      if(kind==='sit') sitting=true;
      else if(hip.y-kneeY>.36) sitting=false;
      const seated = sitting ? smooth((.36 - (hip.y-kneeY))/.20) : 0;
      bodice?.skeleton.update();
      const anchors = main.anchors.map(i => {
        if (bodice) {
          const column=i/144*96, left=Math.floor(column), f=column-left;
          bodice.getVertexPosition(left,v);
          v.lerp(bodice.getVertexPosition((left+1)%96,new THREE.Vector3()),f);
          bodice.localToWorld(v);
        } else { main.source.getVertexPosition(i, v); main.source.localToWorld(v); }
        const anchor=vrm.scene.worldToLocal(v.clone());anchor.y+=.002;return anchor;
      });
      for (const piece of pieces) {
        piece.mesh.updateWorldMatrix(true, false); inverse.copy(piece.mesh.matrixWorld).invert();
        const position = piece.mesh.geometry.attributes.position as THREE.BufferAttribute;
        for (let i=0;i<position.count;i++) {
          const x=piece.rest[i*3], y=piece.rest[i*3+1], z=piece.rest[i*3+2];
          const t=THREE.MathUtils.clamp((1.061-y)/.986,0,1);
          const a=(i%144)/144*Math.PI*2, cos=Math.cos(a);
          const anchor=anchors[i%144];
          const front=smooth((cos+.15)/1.15)*seated;
          const bend=.46;
          const standingY=THREE.MathUtils.lerp(anchor.y,floor+.035,t);
          const lapY=t<bend ? THREE.MathUtils.lerp(anchor.y,kneeY+.055,smooth(t/bend)) : THREE.MathUtils.lerp(kneeY+.055,floor+.035,(t-bend)/(1-bend));
          const py=THREE.MathUtils.lerp(standingY,lapY,front);
          const flare=smooth(t);
          let px=THREE.MathUtils.lerp(anchor.x,x,t<.08?smooth(t/.08):1);
          let pz=anchor.z+(z+.018-anchor.z)*smooth(t/.15);
          pz += front*(kneeZ-hip.z+.07)*smooth(t/bend);
          // Smooth radial clearance around actual knee/ankle locations; the
          // hem encloses the shoe toe even at the stride extremes.
          const ankleBlend=smooth((kneeY-py)/Math.max(.05,kneeY-floor-.08));
          const centres=knees.map((k,j)=>k.clone().lerp(feet[j],THREE.MathUtils.clamp((k.y-py)/Math.max(.03,k.y-feet[j].y),0,1)));
          const clearance=smooth(t/.20);
          const upper=smooth((py-kneeY+.05)/.15);
          let minZ=THREE.MathUtils.lerp(Math.min(...centres.map(c=>c.z))-.14-ankleBlend*.08,hip.z-.16,upper);
          const seatBack=seated*smooth((py-(hip.y-.30))/.09);
          minZ=THREE.MathUtils.lerp(minZ,Math.min(minZ,hip.z-.18),seatBack);
          const maxZ=THREE.MathUtils.lerp(Math.max(...centres.map(c=>c.z))+.14+ankleBlend*.08,Math.max(hip.z+.16,kneeZ+.13),upper);
          const centreZ=(minZ+maxZ)/2;
          const extentZ=(maxZ-minZ)/2+.065*(1-upper);
          const extentX=Math.max(...centres.map(c=>Math.abs(c.x)))+.075+.035*seated+.06*(1-upper);
          const dz=pz-centreZ;
          const radius=Math.sqrt((px/extentX)**2+(dz/extentZ)**2);
          if (radius<1 && clearance>0) {
            const factor=THREE.MathUtils.lerp(1,1/Math.max(radius,.01),clearance);
            px*=factor;pz=centreZ+dz*factor;
          }
          // Retain a little fullness behind the seat; the back hem stays down.
          if (cos<0) pz-=seated*.07*flare*(-cos);
          // The atelier seat is 46 × 42 cm. Spread the fabric over its corners
          // instead of drawing the seat through the side of the gown.
          const seatBand=seated*smooth((floor+.55-py)/.08)*smooth((py-floor-.38)/.06);
          const seatRadius=Math.hypot(px/.245,(pz-seatZ)/.23);
          if(seatRadius<1 && seatBand>0) {
            const factor=THREE.MathUtils.lerp(1,1/Math.max(seatRadius,.01),seatBand);
            px*=factor;pz=seatZ+(pz-seatZ)*factor;
          }
          v.set(px,py,pz);vrm.scene.localToWorld(v);v.applyMatrix4(inverse);
          position.setXYZ(i,v.x,v.y,v.z);
        }
        position.needsUpdate=true;piece.mesh.geometry.computeVertexNormals();
        piece.mesh.geometry.computeBoundingSphere();piece.mesh.geometry.computeBoundingBox();
      }
      seatedDrape.update(kind);
      const useSeated=seatedDrape.inspect().blend>.001;
      for(const piece of pieces){piece.mesh.visible=!useSeated;if(!useSeated)piece.source.visible=false;}
    },
  };
}
