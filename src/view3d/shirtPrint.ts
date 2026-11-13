import * as THREE from 'three';
import { printPlacement, type ShirtPrint } from '../game/shirtPrint';

interface Area { centerX: number; centerY: number; width: number; height: number; front: number }

/**
 * A transparent copy of the cloth surface, with planar UVs in its rest pose.
 * Skin indices/weights and bind matrices remain identical to the garment, so
 * the print follows its deformation without depending on a model's UV atlas.
 */
export function addShirtPrint(source: THREE.Mesh, design: ShirtPrint, area: Area): () => void {
  if (!/^data:image\/(png|jpeg|webp);base64,/.test(design.image)) return () => {};
  const geometry = source.geometry.clone();
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const uv = new Float32Array(position.count * 2);
  const direction = area.front * (design.side === 'back' ? -1 : 1);
  for (let i = 0; i < position.count; i++) {
    uv[i * 2] = (position.getX(i) - area.centerX) * direction / area.width + 0.5;
    uv[i * 2 + 1] = (position.getY(i) - area.centerY) / area.height + 0.5;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const indices: number[] = [];
  const index = geometry.index;
  for (let i = 0; i < (index?.count ?? position.count); i += 3) {
    const tri = [0, 1, 2].map((j) => index ? index.getX(i + j) : i + j);
    if (normal && tri.reduce((sum, j) => sum + normal.getZ(j), 0) * direction > 0.6) indices.push(...tri);
  }
  geometry.setIndex(indices);
  geometry.clearGroups();
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshStandardMaterial({
    map: texture, transparent: true, alphaTest: 0.02, depthWrite: false,
    roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const skinned = source as THREE.SkinnedMesh;
  const overlay = skinned.isSkinnedMesh ? new THREE.SkinnedMesh(geometry, material) : new THREE.Mesh(geometry, material);
  overlay.name = 'Custom shirt graphic';
  overlay.frustumCulled = false;
  // A sibling preserves the garment's coordinate system and skeleton binding.
  overlay.position.copy(source.position);
  overlay.quaternion.copy(source.quaternion);
  overlay.scale.copy(source.scale);
  if (overlay instanceof THREE.SkinnedMesh) {
    overlay.bindMode = skinned.bindMode;
    overlay.bind(skinned.skeleton, skinned.bindMatrix);
    overlay.bindMatrixInverse.copy(skinned.bindMatrixInverse);
  }
  overlay.morphTargetDictionary = source.morphTargetDictionary;
  overlay.morphTargetInfluences = source.morphTargetInfluences;
  source.parent?.add(overlay);
  let disposed = false;
  const image = new Image();
  geometry.addEventListener('dispose', () => { disposed = true; image.onload = null; });
  image.onload = () => {
    if (disposed) return;
    const ctx = canvas.getContext('2d')!;
    const p = printPlacement(design);
    const size = 512 * p.scale;
    const ratio = image.naturalWidth / image.naturalHeight;
    const w = ratio > 1 ? size : size * ratio;
    const h = ratio > 1 ? size / ratio : size;
    ctx.save();
    // Leave a transparent border so UVs outside the print area never smear.
    ctx.beginPath();
    ctx.rect(2, 2, 508, 508);
    ctx.clip();
    ctx.translate(256 + p.x * 512, 256 - p.y * 512);
    ctx.rotate(p.rotation * Math.PI / 180);
    ctx.drawImage(image, -w / 2, -h / 2, w, h);
    ctx.restore();
    texture.needsUpdate = true;
  };
  image.src = design.image;
  return () => {
    disposed = true;
    image.onload = null;
    overlay.removeFromParent();
    geometry.dispose();
    material.dispose();
    texture.dispose();
  };
}
