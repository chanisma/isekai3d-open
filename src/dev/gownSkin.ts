import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';

/** Local bare-shoulder fitting only. Fill painted underwear on cloned skin maps.
 * Body geometry, character files and the production dressing path are untouched.
 */
export function prepareGownSkin(vrm: VRM) {
  const replaced = new Map<THREE.Texture, THREE.Texture>();
  vrm.scene.traverse(object => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const material of [mesh.material].flat()) {
      if (!/Body_\d+_SKIN/.test(material.name)) continue;
      const mat = material as THREE.Material & { map?: THREE.Texture; shadeMultiplyTexture?: THREE.Texture };
      for (const slot of ['map', 'shadeMultiplyTexture'] as const) {
        const original = mat[slot];
        if (!original) continue;
        const cached = replaced.get(original);
        if (cached) { mat[slot] = cached; continue; }
        const image = original.image as HTMLImageElement;
        const canvas = document.createElement('canvas');
        canvas.width = image.width; canvas.height = image.height;
        const context = canvas.getContext('2d', { willReadFrequently: true })!;
        context.drawImage(image, 0, 0);
        const data = context.getImageData(0, 0, canvas.width, canvas.height);
        const px = data.data;
        const sum = [0, 0, 0]; let count = 0;
        for (let i = 0; i < px.length; i += 4) {
          if (px[i + 3] < 16 || .299*px[i] + .587*px[i+1] + .114*px[i+2] < 140) continue;
          for (let c = 0; c < 3; c++) sum[c] += px[i+c];
          count++;
        }
        if (!count) continue;
        for (let i = 0; i < px.length; i += 4) {
          if (px[i + 3] >= 16 && .299*px[i] + .587*px[i+1] + .114*px[i+2] >= 35) continue;
          for (let c = 0; c < 3; c++) px[i+c] = Math.round(sum[c]/count);
          px[i+3] = 255;
        }
        context.putImageData(data, 0, 0);
        const texture = original.clone(); texture.image = canvas; texture.needsUpdate = true;
        replaced.set(original, texture); mat[slot] = texture; mat.needsUpdate = true;
      }
    }
  });
}
