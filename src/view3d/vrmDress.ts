import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';
import { loadVRM, models, parseModel } from './vrm';
import { coveredBy, triCentres, triKeys } from './bodyMask';
import { addShirtPrint } from './shirtPrint';

/**
 * Dressing a VRoid character (docs/3d/01-view.md §4, dev server only): its hair and each piece of
 * its clothes recoloured, or swapped for another character's. A VRoid export splits into meshes
 * by material — the hair, the tops, the bottoms, the shoes — all skinned to one skeleton whose
 * bones are named the same in every VRoid character (J_Bip_…), so a piece of one is bound onto the
 * other's skeleton by name, the bones only it has (its hair's strands, a skirt's) carried across
 * with their spring bones.
 *
 * The sample characters' own licence (in their VRM meta) says modification is prohibited; this is
 * used on the dev server only, never in a build (the build has no VRoid characters at all).
 */
export type Piece = 'hair' | 'tops' | 'bottoms' | 'shoes';
export const PIECES: Piece[] = ['hair', 'tops', 'bottoms', 'shoes'];

export interface PieceDress {
  /** A colour for it (its pattern and shading kept), or left as it is; on clothes, its biggest part's. */
  color?: string;
  /** Colours for its other parts (`Part`), in order; '' or none leaves one as it is. */
  parts?: string[];
  /** Another character's piece (their file) in place of this one's. */
  from?: string;
}
export type Dress = Partial<Record<Piece, PieceDress>> & {
  shirtPrint?: import('../game/shirtPrint').ShirtPrint;
  /** A skin tone for the face and body. */
  skin?: string;
  /** An eye colour (the irises). */
  eyes?: string;
};

// A uniform's tie goes with its top, and the thigh band some children have (Onepiece_00) with the
// bottoms it was worn under.
const NAMES: Record<Piece, RegExp> = { hair: /HAIR/i, tops: /Tops|Accessory_Tie/i, bottoms: /Bottoms|Onepiece_00/i, shoes: /Shoes/i };

/** Which piece a mesh is, by its material's name (VRoid's own: N00_005_01_Tops_01_CLOTH…). */
export function pieceOf(mesh: THREE.Mesh): Piece | null {
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const name = mats.map((m) => m.name).join(' ');
  for (const p of PIECES) if (NAMES[p].test(name) || (p === 'hair' && /^Hair/.test(mesh.name))) return p;
  return null;
}

function meshesOf(vrm: VRM, piece: Piece): THREE.SkinnedMesh[] {
  const out: THREE.SkinnedMesh[] = [];
  vrm.scene.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (m.isSkinnedMesh && pieceOf(m) === piece) out.push(m);
  });
  return out;
}

function boneByName(vrm: VRM): Map<string, THREE.Bone> {
  const out = new Map<string, THREE.Bone>();
  vrm.scene.traverse((o) => ((o as THREE.Bone).isBone ? out.set(o.name, o as THREE.Bone) : undefined));
  return out;
}

/** The bones a mesh is actually weighted to. */
function usedBones(mesh: THREE.SkinnedMesh): Set<number> {
  const idx = mesh.geometry.attributes.skinIndex;
  const w = mesh.geometry.attributes.skinWeight;
  const used = new Set<number>();
  for (let i = 0; i < idx.count; i++) for (let k = 0; k < 4; k++) if (w.getComponent(i, k) > 0) used.add(idx.getComponent(i, k));
  return used;
}

/**
 * The bones every VRoid character has alike: the body's (J_Bip_…, J_Adj_…, the bust). Hair and
 * clothes bones (J_Sec_Hair1_01, a skirt's, a hood's) are named the same in every character too,
 * but they're each one's own strands, so those always come with the piece.
 */
const SHARED = /^(Root$|J_Bip_|J_Adj_|J_Sec_[LR]_Bust)/;

/**
 * Puts `source`'s meshes of a piece on `target` in place of its own: each bound to the target's
 * body bones of the same name, its own bones (hair strands, a skirt's) moved over from the source
 * with the spring bones that swing them, colliding with the target's body.
 */
export function transplant(target: VRM, source: VRM, piece: Piece) {
  const mine = new Map([...boneByName(target)].filter(([n]) => SHARED.test(n)));
  const moved = new Set<THREE.Object3D>();
  for (const m of meshesOf(target, piece)) m.visible = false;
  for (const src of meshesOf(source, piece)) {
    const bones = src.skeleton.bones;
    for (const i of usedBones(src)) {
      const b = bones[i];
      if (!b || mine.has(b.name)) continue;
      // Up to the first body bone; the branch below it comes across whole.
      let branch: THREE.Object3D = b;
      while (branch.parent && !mine.has(branch.parent.name)) branch = branch.parent;
      const at = branch.parent && mine.get(branch.parent.name);
      if (!at || moved.has(branch)) continue;
      at.add(branch);
      moved.add(branch);
    }
    const skeleton = new THREE.Skeleton(bones.map((b) => mine.get(b.name) ?? b), src.skeleton.boneInverses.map((m) => m.clone()));
    const mesh = new THREE.SkinnedMesh(src.geometry, src.material);
    mesh.name = `${src.name} (transplanted)`;
    mesh.frustumCulled = false;
    mesh.castShadow = true;
    target.scene.add(mesh);
    mesh.bind(skeleton, src.bindMatrix.clone());
  }
  // The spring bones of what came across, now swinging on the target and hitting its body.
  const springs = source.springBoneManager;
  const theirs = target.springBoneManager;
  if (springs && theirs) {
    const under = (o: THREE.Object3D) => {
      for (let p: THREE.Object3D | null = o; p; p = p.parent) if (moved.has(p)) return true;
      return false;
    };
    for (const j of [...springs.joints]) {
      if (!under(j.bone)) continue;
      springs.deleteJoint(j);
      j.colliderGroups = [...theirs.colliderGroups];
      // Swung relative to the target's own Root, not the source's (left behind, standing still:
      // a dweller walking would drag the skirt up behind them as if running into a wind).
      if (j.center) j.center = mine.get(j.center.name) ?? null;
      theirs.addJoint(j);
    }
    theirs.setInitState();
  }
}

/**
 * Another character's body (of the same stage, so the same body) laid over the target's where
 * `keep` (a height, as exported) has it. VRoid cuts away the body each one's clothes cover, so
 * another's shorter top or lower waist would show a hole; the clothes' wearer has the body there.
 * Where both bodies are, they're the same surface in the same skin.
 */
const isBody = (o: THREE.Object3D): o is THREE.SkinnedMesh => (o as THREE.SkinnedMesh).isSkinnedMesh && [(o as THREE.Mesh).material].flat().some((m) => /Body_\d+_SKIN/.test(m.name));

function addBody(target: VRM, source: VRM, keep: (y: number) => boolean) {
  const mine = new Map([...boneByName(target)].filter(([n]) => SHARED.test(n)));
  // In the target's own skin (the same layout), so the two are one colour.
  let skin: THREE.Material | THREE.Material[] | undefined;
  target.scene.traverse((o) => {
    if (!skin && isBody(o)) skin = o.material;
  });
  source.scene.traverse((src) => {
    if (!isBody(src)) return;
    const pos = src.geometry.attributes.position;
    const index = src.geometry.index!;
    const kept: number[] = [];
    for (let t = 0; t < index.count; t += 3) {
      const [a, b, c] = [index.getX(t), index.getX(t + 1), index.getX(t + 2)];
      if (keep((pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3)) kept.push(a, b, c);
    }
    if (!kept.length) return;
    const geometry = new THREE.BufferGeometry();
    for (const [name, attr] of Object.entries(src.geometry.attributes)) geometry.setAttribute(name, attr);
    geometry.setIndex(kept);
    // Each material (the skin and its outline) over all of it.
    [skin ?? src.material].flat().forEach((_, i) => geometry.addGroup(0, kept.length, i));
    const bones = src.skeleton.bones.map((b) => mine.get(b.name) ?? b);
    const mesh = new THREE.SkinnedMesh(geometry, skin ?? src.material);
    mesh.name = `${src.name} (body)`;
    mesh.frustumCulled = false;
    mesh.castShadow = true;
    target.scene.add(mesh);
    mesh.bind(new THREE.Skeleton(bones, src.skeleton.boneInverses.map((m) => m.clone())), src.bindMatrix.clone());
  });
}

/** Local COZY mini-skirt: supply the exposed thigh band on adult female avatars. */
export function supplementKnitLegSkin(target: VRM, source: VRM, minY = .64) {
  addBody(target, source, y => y > minY && y < .83);
  const body = skinOf(target).filter(mesh => [mesh.material].flat().some(m => /Body_\d+_SKIN/.test(m.name)));
  paint(body, null, true);
}

/** Opt-in local robe: hide covered torso and repair dark skin-texture cutouts.
 * Coordinates follow the selected size's neck height, never adult constants alone.
 */
export function prepareRobeSkin(target: VRM, source: VRM) {
  source.scene.updateMatrixWorld(true);
  const scale = source.humanoid.getRawBoneNode('neck')!.getWorldPosition(new THREE.Vector3()).y / 1.4706525;
  const body = skinOf(target).filter(mesh => [mesh.material].flat().some(m => /Body_\d+_SKIN/.test(m.name)));
  for (const mesh of body) {
    const geometry = mesh.geometry, index = geometry.index, pos = geometry.attributes.position;
    if (!index) continue;
    const kept: number[] = [];
    for (let t = 0; t < index.count; t += 3) {
      const ids = [index.getX(t), index.getX(t+1), index.getX(t+2)];
      const y = ids.reduce((v,i) => v + pos.getY(i), 0) / (3*scale);
      const x = ids.reduce((v,i) => v + pos.getX(i), 0) / (3*scale);
      if (!(y > .68 && y < 1.36 && Math.abs(x) < .23)) kept.push(...ids);
    }
    const masked = geometry.clone(); masked.setIndex(kept); masked.clearGroups();
    [mesh.material].flat().forEach((_,i) => masked.addGroup(0,kept.length,i));
    mesh.geometry = masked;
  }
  paint(body, null, true);
}

/** Opt-in for the local adult-female bare-shoulder gown fitting prototype. */
export function supplementGownSkin(target: VRM, source: VRM, addGeometry = true) {
  if (addGeometry) addBody(target, source, y => y > 1.02);
  const body = skinOf(target).filter(mesh => [mesh.material].flat().some(m => /Body_\d+_SKIN/.test(m.name)));
  // This opaque long gown covers the pelvis and legs. Mask only this local
  // instance; switching looks reloads the untouched character file.
  for (const mesh of body) {
    const geometry = mesh.geometry;
    const index = geometry.index, pos = geometry.attributes.position;
    if (!index || !pos) continue;
    const kept: number[] = [];
    for (let t = 0; t < index.count; t += 3) {
      const ids = [index.getX(t), index.getX(t + 1), index.getX(t + 2)];
      const y = ids.reduce((sum, i) => sum + pos.getY(i), 0) / 3;
      const x = ids.reduce((sum, i) => sum + pos.getX(i), 0) / 3;
      const covered = y > .12 && (y < 1.04 || (y < 1.25 && Math.abs(x) < .115));
      if (!covered) kept.push(...ids);
    }
    const masked = geometry.clone();
    masked.setIndex(kept);
    masked.clearGroups();
    [mesh.material].flat().forEach((_, i) => masked.addGroup(0, kept.length, i));
    mesh.geometry = masked;
  }
  paint(body, null, true);
}

/**
 * A texture recoloured to `color`: each pixel's lightness against the texture's average, put on
 * the new colour, so stripes, folds and drawn shading stay. Cached per texture and colour (`from`
 * names the texture across copies of a character: its file, material and slot).
 *
 * VRoid leaves the skin its own clothes cover black or clear, so another's shorter clothes would show
 * black patches or holes: with `fill`, that is skin too (the new colour, or the texture's own with
 * none).
 *
 * With `main`, only the cloth's main colour changes (`mainShare`): a blazer's white shirt, a
 * collar in another colour, black buttons and trim stay as they were.
 */
const recoloured = new Map<string, THREE.Texture>();
function recolour(tex: THREE.Texture, from: string, color: string | null, darker = 1, fill = false, main?: MainColour): THREE.Texture {
  const key = `${from}|${color}|${darker}|${fill}|${main ? `${main.bin}:${main.hex}` : ''}`;
  const hit = recoloured.get(key);
  if (hit) return hit;
  const img = tex.image as CanvasImageSource & { width: number; height: number };
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, 0, 0);
  const data = g.getImageData(0, 0, c.width, c.height);
  const px = data.data;
  const lum = (i: number) => 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
  // Not quite black in some (an elder's skin texture is dark brown there); skin is never that dark.
  const black = (i: number) => fill && (px[i + 3] < 16 || lum(i) < 35);
  // How much each pixel is of the colour that changes: all of it, or with `main` the main colour's.
  const share = main && color ? mainShare(px, main) : null;
  // The brightness the colour picked is given at: the texture's own, leaving out what's near black
  // when that's the lesser part (a full body's black underwear made its skin come out lighter than
  // the face's, yellow when a light colour ran over); a black garment is mostly that, and keeps it.
  let dark = 0;
  let opaque = 0;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 16 || black(i)) continue;
    opaque++;
    if (lum(i) < 35) dark++;
  }
  const skipDark = dark < opaque / 2;
  let sum = 0;
  let n = 0;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 16 || black(i) || (skipDark && lum(i) < 35)) continue;
    const w = share ? share[i >> 2] : 1;
    sum += lum(i) * w;
    n += w;
  }
  const mean = Math.max(8, n ? sum / n : 128);
  // With no colour, the texture's own in its lit half (drawn shading and lines would grey it).
  const avg = [0, 0, 0];
  let lit = 0;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 16 || black(i) || lum(i) < mean) continue;
    for (let c = 0; c < 3; c++) avg[c] += px[i + c];
    lit++;
  }
  const to = color ? new THREE.Color(color) : null;
  const [r, gg, b] = to ? [to.r, to.g, to.b].map((v) => Math.pow(v, 1 / 2.2) * 255 * darker) : avg.map((v) => v / Math.max(1, lit));
  for (let i = 0; i < px.length; i += 4) {
    const k = black(i) ? 1 : lum(i) / mean;
    if (!to && !black(i)) continue;
    const w = share && !black(i) ? share[i >> 2] : 1;
    px[i] = Math.min(255, r * k) * w + px[i] * (1 - w);
    px[i + 1] = Math.min(255, gg * k) * w + px[i + 1] * (1 - w);
    px[i + 2] = Math.min(255, b * k) * w + px[i + 2] * (1 - w);
    // Skin where VRoid cut it away clear.
    if (black(i)) px[i + 3] = 255;
  }
  g.putImageData(data, 0, 0);
  const out = new THREE.CanvasTexture(c);
  out.flipY = tex.flipY;
  out.colorSpace = tex.colorSpace;
  out.wrapS = tex.wrapS;
  out.wrapT = tex.wrapT;
  out.channel = tex.channel;
  out.needsUpdate = true;
  recoloured.set(key, out);
  return out;
}

/** The colour a piece of clothing is mostly: a bin of `binOf` and the middle hue and lightness of what's in it. */
interface MainColour {
  bin: number;
  hue: number;
  val: number;
  /** Its mean colour, `#rrggbb`. */
  hex: string;
}
const HUES = 12;
const ramp = (x: number, a: number, b: number) => Math.min(1, Math.max(0, (x - a) / (b - a)));
/** Twelve hues, and for the greys three lightnesses. */
const binOf = (h: number, s: number, v: number) => (s >= 0.18 && v >= 0.15 ? Math.floor(h * HUES) % HUES : HUES + (v < 0.3 ? 0 : v < 0.7 ? 1 : 2));

function hsvOf(px: Uint8ClampedArray): Float32Array {
  const n = px.length >> 2;
  const hsv = new Float32Array(n * 3);
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    const [r, g, b] = [px[i] / 255, px[i + 1] / 255, px[i + 2] / 255];
    const max = Math.max(r, g, b);
    const d = max - Math.min(r, g, b);
    let h = 0;
    if (d > 0) h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    hsv[p * 3] = h / 6;
    hsv[p * 3 + 1] = max ? d / max : 0;
    hsv[p * 3 + 2] = max;
  }
  return hsv;
}

/**
 * The main colour of a piece over all its textures together: a jacket's own cloth, not the shirt
 * under it that VRoid gives a material of its own.
 */
function mainOf(textures: Uint8ClampedArray[]): MainColour {
  const bins = new Float64Array(HUES + 3);
  const all = textures.map((px) => [px, hsvOf(px)] as const);
  for (const [px, hsv] of all) for (let p = 0; p < px.length >> 2; p++) if (px[p * 4 + 3] >= 16) bins[binOf(hsv[p * 3], hsv[p * 3 + 1], hsv[p * 3 + 2])]++;
  let bin = 0;
  for (let k = 1; k < bins.length; k++) if (bins[k] > bins[bin]) bin = k;
  // Its middle: the mean hue (round the circle) or lightness of the pixels in it.
  let cx = 0;
  let cy = 0;
  let vs = 0;
  let m = 0;
  const rgb = [0, 0, 0];
  for (const [px, hsv] of all)
    for (let p = 0; p < px.length >> 2; p++) {
      if (px[p * 4 + 3] < 16 || binOf(hsv[p * 3], hsv[p * 3 + 1], hsv[p * 3 + 2]) !== bin) continue;
      cx += Math.cos(hsv[p * 3] * 2 * Math.PI);
      cy += Math.sin(hsv[p * 3] * 2 * Math.PI);
      vs += hsv[p * 3 + 2];
      for (let k = 0; k < 3; k++) rgb[k] += px[p * 4 + k];
      m++;
    }
  const hex = `#${rgb.map((v) => Math.round(v / Math.max(1, m)).toString(16).padStart(2, '0')).join('')}`;
  return { bin, hue: (Math.atan2(cy, cx) / (2 * Math.PI) + 1) % 1, val: m ? vs / m : 0.5, hex };
}

/**
 * How much of each pixel (0..1) is of the main colour: near its hue (and not nearly grey), or for
 * grey cloth near its lightness. Others (a lining, a white shirt under a jacket, trim, buttons)
 * are 0 and keep their colour.
 */
function mainShare(px: Uint8ClampedArray, main: MainColour): Float32Array {
  const hsv = hsvOf(px);
  const out = new Float32Array(px.length >> 2);
  for (let p = 0; p < out.length; p++) {
    const [h, s, v] = [hsv[p * 3], hsv[p * 3 + 1], hsv[p * 3 + 2]];
    if (main.bin < HUES) {
      const dh = Math.min(Math.abs(h - main.hue), 1 - Math.abs(h - main.hue));
      out[p] = ramp(s, 0.06, 0.16) * (1 - ramp(dh, 0.07, 0.14));
    } else out[p] = (1 - ramp(s, 0.14, 0.26)) * (1 - ramp(Math.abs(v - main.val), 0.22, 0.36));
  }
  return out;
}

/** A texture's pixels. */
function pixelsOf(tex: THREE.Texture): Uint8ClampedArray {
  const img = tex.image as CanvasImageSource & { width: number; height: number };
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, 0, 0);
  return g.getImageData(0, 0, c.width, c.height).data;
}

interface MToonLike extends THREE.Material {
  map: THREE.Texture | null;
  shadeMultiplyTexture: THREE.Texture | null;
  color: THREE.Color;
  shadeColorFactor: THREE.Color;
}

const mains = new Map<string, MainColour | undefined>();

/**
 * One part of a piece of clothing, by colour: VRoid gives each layer of an item a material of its
 * own (a jacket and the shirt under it, a cardigan over a dress, a dress's collar), and splits some
 * items into several; the materials whose main colour is alike are one part, so each colour seen
 * can be changed on its own. Biggest first; the first takes the dweller's own colour for the piece.
 */
export interface Part {
  /** Its materials' names. */
  names: string[];
  /** Its own main colour, before any is put on. */
  color: string;
  /** Its share of the piece's surface. */
  share: number;
}

const isCloth = (mat: THREE.Material) => !/Outline/.test(mat.name) && 'shadeColorFactor' in mat;
const partName = (m: THREE.Mesh) => ([m.material].flat().find(isCloth) as THREE.Material | undefined)?.name ?? '';

/** A piece's parts, the tiny ones (under 2%: a button, a buckle) left out; up to five. */
function partsIn(meshes: THREE.Mesh[]): Part[] {
  const area = new Map<string, number>();
  const tex = new Map<string, THREE.Texture>();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (const m of meshes) {
    if (!m.visible) continue;
    const name = partName(m);
    if (!name) continue;
    const pos = m.geometry.attributes.position;
    const index = m.geometry.index;
    let sum = 0;
    const n = index ? index.count : pos.count;
    for (let t = 0; t + 2 < n; t += 3) {
      const [i, j, k] = index ? [index.getX(t), index.getX(t + 1), index.getX(t + 2)] : [t, t + 1, t + 2];
      a.fromBufferAttribute(pos, i);
      b.fromBufferAttribute(pos, j);
      c.fromBufferAttribute(pos, k);
      sum += b.sub(a).cross(c.sub(a)).length() / 2;
    }
    area.set(name, (area.get(name) ?? 0) + sum);
    const map = ([m.material].flat().find(isCloth) as MToonLike).map;
    if (map && !tex.has(name)) tex.set(name, map);
  }
  const total = [...area.values()].reduce((x, y) => x + y, 0) || 1;
  const parts = new Map<number, Part>();
  for (const [name, v] of [...area].sort((x, y) => y[1] - x[1])) {
    const main = tex.has(name) ? mainOf([pixelsOf(tex.get(name)!)]) : { bin: -1, hex: '#888888' };
    const part = parts.get(main.bin);
    if (part) {
      part.names.push(name);
      part.share += v / total;
    } else parts.set(main.bin, { names: [name], color: main.hex, share: v / total });
  }
  return [...parts.values()]
    .filter((p) => p.share >= 0.02)
    .sort((x, y) => y.share - x.share)
    .slice(0, 5);
}

/** A character's clothing parts as dressed (before they're coloured), for the edit window. */
export function partsOf(vrm: VRM): Partial<Record<Piece, Part[]>> {
  return (vrm.scene.userData.parts ?? {}) as Partial<Record<Piece, Part[]>>;
}

/** Colours a piece part by part: the first in `colors[0]`, the others in theirs or left as they are. */
function paintParts(meshes: THREE.Mesh[], parts: Part[], colors: Array<string | undefined>) {
  parts.forEach((part, i) => {
    const color = colors[i];
    if (color) paint(meshes.filter((m) => m.visible && part.names.includes(partName(m))), color, false, true);
  });
}

/** Colours meshes: their lit and their shade texture recoloured (or flat colours where they have none). */
function paint(meshes: THREE.Mesh[], color: string | null, fill = false, main = false) {
  // The main colour of the lit and of the shade textures, over all of the piece's materials.
  const mats = meshes.filter((m) => m.visible).flatMap((m) => [m.material].flat() as MToonLike[]).filter((mat) => !/Outline/.test(mat.name) && 'shadeColorFactor' in mat);
  const mainIn = (slot: string, pick: (m: MToonLike) => THREE.Texture | null) => {
    if (!main || !color) return undefined;
    const key = `${slot}|${mats.map((m) => `${m.userData.file ?? m.uuid}|${m.name}`).join(',')}`;
    if (!mains.has(key)) {
      const texs = [...new Set(mats.map(pick).filter((t): t is THREE.Texture => !!t))];
      mains.set(key, texs.length ? mainOf(texs.map(pixelsOf)) : undefined);
    }
    return mains.get(key);
  };
  const [litMain, shadeMain] = [mainIn('map', (m) => m.map), mainIn('shade', (m) => m.shadeMultiplyTexture)];
  for (const m of meshes) {
    if (!m.visible) continue;
    const mats = (Array.isArray(m.material) ? m.material : [m.material]) as MToonLike[];
    const fresh = mats.map((mat) => {
      if (/Outline/.test(mat.name) || !('shadeColorFactor' in mat)) return mat;
      const c = mat.clone() as MToonLike;
      const from = `${mat.userData.file ?? mat.uuid}|${mat.name}`;
      if (c.map) {
        c.map = recolour(c.map, `${from}|map`, color, 1, fill, litMain);
        if (color) c.color.set('#ffffff');
      } else if (color) c.color.set(color);
      if (c.shadeMultiplyTexture) {
        c.shadeMultiplyTexture = recolour(c.shadeMultiplyTexture, `${from}|shade`, color, 0.75, fill, shadeMain);
        if (color) c.shadeColorFactor.set('#ffffff');
      } else if (color) c.shadeColorFactor.set(color).multiplyScalar(0.7);
      return c as THREE.Material;
    });
    m.material = Array.isArray(m.material) ? fresh : fresh[0];
  }
}

/**
 * The bottoms made whole above `above`: VRoid cuts away clear what its wearer's own top covered,
 * which a shorter top leaves a hole (the clear lower down, a ripped knee, stays). The clear in
 * what those faces show of the texture is the cloth's own colour.
 */
const mended = new Map<string, THREE.Texture>();
function mend(meshes: THREE.Mesh[], above: number) {
  for (const m of meshes) {
    if (!m.visible) continue;
    const pos = m.geometry.attributes.position;
    const uv = m.geometry.attributes.uv;
    const index = m.geometry.index;
    if (!uv || !index) continue;
    const tris: number[] = [];
    for (let t = 0; t < index.count; t += 3) {
      const [a, b, c] = [index.getX(t), index.getX(t + 1), index.getX(t + 2)];
      if (Math.max(pos.getY(a), pos.getY(b), pos.getY(c)) > above) tris.push(a, b, c);
    }
    if (!tris.length) continue;
    const mats = [m.material].flat() as MToonLike[];
    const fresh = mats.map((mat) => {
      if (!mat.map) return mat;
      const c = mat.clone() as MToonLike;
      const key = `${mat.userData.file ?? mat.uuid}|${mat.name}|${above.toFixed(3)}`;
      c.map = mendTexture(mat.map, `${key}|map`, uv, tris);
      if (c.shadeMultiplyTexture) c.shadeMultiplyTexture = mendTexture(c.shadeMultiplyTexture, `${key}|shade`, uv, tris);
      // Recoloured apart from the uncut one (paint names textures by it).
      c.userData.file = key;
      return c as THREE.Material;
    });
    m.material = Array.isArray(m.material) ? fresh : fresh[0];
  }
}

function mendTexture(tex: THREE.Texture, key: string, uv: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, tris: number[]): THREE.Texture {
  const hit = mended.get(key);
  if (hit) return hit;
  const img = tex.image as CanvasImageSource & { width: number; height: number };
  const [w, h] = [img.width, img.height];
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, 0, 0);
  // Where those faces are in the texture (a little over, for the filtering at their edges).
  const mask = document.createElement('canvas');
  mask.width = w;
  mask.height = h;
  const mg = mask.getContext('2d', { willReadFrequently: true })!;
  mg.fillStyle = mg.strokeStyle = '#fff';
  mg.lineWidth = 3;
  mg.beginPath();
  for (let t = 0; t < tris.length; t += 3) {
    mg.moveTo(uv.getX(tris[t]) * w, uv.getY(tris[t]) * h);
    mg.lineTo(uv.getX(tris[t + 1]) * w, uv.getY(tris[t + 1]) * h);
    mg.lineTo(uv.getX(tris[t + 2]) * w, uv.getY(tris[t + 2]) * h);
    mg.closePath();
  }
  mg.fill();
  mg.stroke();
  const inside = mg.getImageData(0, 0, w, h).data;
  const data = g.getImageData(0, 0, w, h);
  const px = data.data;
  const avg = [0, 0, 0];
  let n = 0;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 16) continue;
    for (let k = 0; k < 3; k++) avg[k] += px[i + k];
    n++;
  }
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] >= 16 || !inside[i + 3]) continue;
    for (let k = 0; k < 3; k++) px[i + k] = avg[k] / Math.max(1, n);
    px[i + 3] = 255;
  }
  g.putImageData(data, 0, 0);
  const out = new THREE.CanvasTexture(c);
  out.flipY = tex.flipY;
  out.colorSpace = tex.colorSpace;
  out.wrapS = tex.wrapS;
  out.wrapT = tex.wrapT;
  out.channel = tex.channel;
  out.needsUpdate = true;
  mended.set(key, out);
  return out;
}

/** The face and body skin. */
function skinOf(vrm: VRM): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  vrm.scene.traverse((o) => {
    const m = o as THREE.Mesh;
    const mats = m.isMesh ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
    if (mats.some((mat) => /_SKIN/.test(mat.name))) out.push(m);
  });
  return out;
}

/** The irises. */
function irisOf(vrm: VRM): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  vrm.scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && [m.material].flat().some((mat) => /EyeIris/.test(mat.name))) out.push(m);
  });
  return out;
}

/** The bottoms under another's top than they were made under: mended up to that top's hem. */
function mendUnder(vrm: VRM, theirTops: THREE.Mesh[]) {
  const ys = theirTops.flatMap((m) => Array.from({ length: m.geometry.attributes.position.count }, (_, i) => m.geometry.attributes.position.getY(i))).sort((a, b) => a - b);
  if (ys.length) mend(meshesOf(vrm, 'bottoms'), ys[Math.floor(ys.length * 0.01)] - 0.02);
}

function bodiesOf(vrm: VRM): THREE.SkinnedMesh[] {
  const out: THREE.SkinnedMesh[] = [];
  vrm.scene.traverse((o) => (isBody(o) && !o.name.endsWith('(body)') ? out.push(o) : undefined));
  return out;
}

function worldY(vrm: VRM, bone: 'hips' | 'leftFoot'): number {
  vrm.scene.updateMatrixWorld(true);
  return vrm.humanoid.getRawBoneNode(bone)!.getWorldPosition(new THREE.Vector3()).y;
}

/** The full body (`<gender>-<stage>-<name>@base.vrm`) of a file's character, if there is one. */
export async function baseOf(file: string): Promise<string | null> {
  const m = parseModel(file);
  if (!m || m.outfit === 'base') return null;
  const all = await models();
  return all.find((x) => x.outfit === 'base' && x.gender === m.gender && x.stage === m.stage && x.name === m.name)?.file ?? null;
}

/** A file's body triangles by place on the texture, and its clothes' points by piece (for `coveredBy`). */
const fileBodies = new Map<string, { keys: Set<string>; pieces: Partial<Record<Piece, Float32Array>> }>();
function bodyOfFile(file: string, vrm: VRM) {
  let got = fileBodies.get(file);
  if (got) return got;
  const keys = new Set<string>();
  for (const m of bodiesOf(vrm)) for (const k of triKeys(m.geometry.attributes.uv.array, m.geometry.index!.array)) keys.add(k);
  const pieces: Partial<Record<Piece, Float32Array>> = {};
  for (const p of ['tops', 'bottoms', 'shoes'] as const) {
    const pts = meshesOf(vrm, p).flatMap((m) => Array.from(m.geometry.attributes.position.array as ArrayLike<number>));
    if (pts.length) pieces[p] = new Float32Array(pts);
  }
  fileBodies.set(file, (got = { keys, pieces }));
  return got;
}

/**
 * A character's file is only their clothes (models/compare/clothes.py, 2026-10-24): what each piece
 * covers comes with it, the full body's triangles by place on the texture (worked out as `coveredBy`
 * does from the whole file). Null for a whole file (the samples, a file with no full body).
 */
type Clothes = { version: number; base: string; covers: Partial<Record<Garment, string>> };
const fileCovers = new Map<string, Partial<Record<Garment, Set<string>>>>();
function coversOf(file: string, vrm: VRM): Partial<Record<Garment, Set<string>>> | null {
  const clothes = vrm.scene.userData.clothes as Clothes | undefined;
  if (!clothes) return null;
  let got = fileCovers.get(file);
  if (!got) fileCovers.set(file, (got = Object.fromEntries(Object.entries(clothes.covers).map(([p, keys]) => [p, new Set(keys!.split(' '))]))));
  return got;
}

/** Where a hair is taken from: the full body of the file's character (their file has no hair), else the file. */
async function hairFile(file: string): Promise<string> {
  return (await baseOf(file)) ?? file;
}

/**
 * A full body with the clothes of `file` (or, piece by piece, `dress[piece].from`) put on: each
 * piece bound onto it by bone name, the skin under each hidden (`coveredBy`), the feet those of
 * the file the shoes come from (VRoid shapes the feet to the shoes), and the whole body raised as
 * much as that file stands higher on its heels (VRoid raises only the hips for shoes).
 */
async function onBase(body: string, file: string, dress: Dress): Promise<VRM> {
  const vrm = await loadVRM(body);
  if (dress.hair?.from) transplant(vrm, await loadVRM(await hairFile(dress.hair.from)), 'hair');
  const sources: Partial<Record<Garment, { file: string; vrm: VRM }>> = {};
  for (const p of GARMENTS) {
    const from = dress[p]?.from ?? file;
    sources[p] = { file: from, vrm: await loadVRM(from) };
  }
  wearOnBase(vrm, sources);
  return vrm;
}

type Garment = 'tops' | 'bottoms' | 'shoes';
const GARMENTS: Garment[] = ['tops', 'bottoms', 'shoes'];

/**
 * Puts each piece of `sources` (a file and its loaded VRM) on a full body (`@base`): the piece
 * bound onto it by bone name, the skin it covers hidden (`coveredBy`, from what that file's own
 * body lacks), the feet those of the shoes' file (VRoid shapes the feet to the shoes), and the
 * whole body raised as much as that file stands higher on its heels (VRoid raises only the hips).
 * A piece not given stays as the base has it (its underwear). Also for the garment atelier.
 */
export function wearOnBase(vrm: VRM, sources: Partial<Record<Garment, { file: string; vrm: VRM }>>) {
  const fullHips = worldY(vrm, 'hips');
  const footY = worldY(vrm, 'leftFoot');
  const full = bodiesOf(vrm).map((mesh) => ({ mesh, keys: triKeys(mesh.geometry.attributes.uv.array, mesh.geometry.index!.array), centres: triCentres(mesh.geometry.attributes.position.array, mesh.geometry.index!.array) }));
  const hidden = full.map(() => new Set<number>());
  let lift = 0;
  for (const p of GARMENTS) {
    const src = sources[p];
    if (!src) continue;
    const up = worldY(src.vrm, 'hips') - fullHips;
    transplant(vrm, src.vrm, p);
    const kept = coversOf(src.file, src.vrm);
    full.forEach((f, i) => {
      if (kept) f.keys.forEach((k, t) => (kept[p]?.has(k) && f.centres[3 * t + 1] >= footY ? hidden[i].add(t) : undefined));
      else {
        const theirs = bodyOfFile(src.file, src.vrm);
        coveredBy(f, theirs.keys, theirs.pieces, up, footY).get(p)?.forEach((t) => hidden[i].add(t));
      }
    });
    if (p === 'shoes') lift = up;
  }
  // The feet (below the ankle) are the shoes' file's, shaped to them.
  const feet = sources.shoes?.vrm;
  if (feet) full.forEach((f, i) => f.keys.forEach((_, t) => (f.centres[3 * t + 1] < footY ? hidden[i].add(t) : undefined)));
  for (const [i, f] of full.entries()) {
    if (!hidden[i].size) continue;
    const idx = f.mesh.geometry.index!.array;
    const kept: number[] = [];
    for (let t = 0; t < idx.length / 3; t++) if (!hidden[i].has(t)) kept.push(idx[3 * t], idx[3 * t + 1], idx[3 * t + 2]);
    const g = f.mesh.geometry.clone();
    // The whole body, for a suit over it (cleanSuit.ts).
    g.userData.wholeBody = idx;
    g.setIndex(kept);
    g.clearGroups();
    [f.mesh.material].flat().forEach((_, k) => g.addGroup(0, kept.length, k));
    f.mesh.geometry = g;
  }
  if (feet) addBody(vrm, feet, (y) => y < footY + lift);
  const [top, bottom] = [sources.tops, sources.bottoms];
  if (top && bottom && top.file !== bottom.file) {
    mendUnder(vrm, meshesOf(bottom.vrm, 'tops'));
    tuck(vrm);
  }
  // Standing on those heels: the hips (and with them everything) up, as the file had them.
  if (lift) {
    vrm.humanoid.getNormalizedBoneNode('hips')!.position.y += lift;
    const rest = vrm.humanoid.normalizedRestPose.hips?.position;
    if (rest) rest[1] += lift;
    vrm.humanoid.update();
  }
}

/**
 * A character in one of the new garment sets (garments.ts, the admin wardrobe): the set's top,
 * bottoms and shoes put on their full body (`@base`) if they have one, else on their file in place
 * of its own. A piece the set hasn't got is the base's (underwear, bare feet) or the file's own.
 */
export async function loadWearing(file: string, garment: string): Promise<VRM> {
  const base = await baseOf(file);
  const source = await loadVRM(garment);
  const vrm = await loadVRM(base ?? file);
  const has = new Set(piecesIn(source));
  if (base) wearOnBase(vrm, Object.fromEntries(GARMENTS.filter((p) => has.has(p)).map((p) => [p, { file: garment, vrm: source }])));
  else for (const p of GARMENTS) if (has.has(p)) transplant(vrm, source, p);
  return vrm;
}

/** Loads a character and dresses it: pieces swapped first, then coloured. */
export async function loadDressed(file: string, dress: Dress): Promise<VRM> {
  // A character with a full body of their own (`@base`, every stage) is that body with the clothes put on.
  const body = await baseOf(file);
  let vrm: VRM;
  let swapped = false;
  if (body) vrm = await onBase(body, file, dress);
  else {
    vrm = await loadVRM(file);
    const sources = new Map<string, VRM>();
    for (const p of PIECES) {
      const from = dress[p]?.from;
      if (!from || from === file) continue;
      const source = await loadVRM(p === 'hair' ? await hairFile(from) : from);
      sources.set(p, source);
      transplant(vrm, source, p);
      swapped ||= p !== 'hair';
    }
    // The body where the clothes put on leave it showing: the top's wearer's above the hips, the
    // bottoms' wearer's below.
    const hips = vrm.humanoid.getRawBoneNode('hips')!.getWorldPosition(new THREE.Vector3()).y;
    const top = sources.get('tops');
    const bottom = sources.get('bottoms');
    const [topFile, bottomFile] = [top ? dress.tops!.from : file, bottom ? dress.bottoms!.from : file];
    if (top) addBody(vrm, top, topFile === bottomFile ? () => true : (y) => y > hips);
    if (bottom && topFile !== bottomFile) addBody(vrm, bottom, (y) => y <= hips);
    // The bottoms under another's top than they were made under.
    if (topFile !== bottomFile) mendUnder(vrm, bottom ? meshesOf(bottom, 'tops') : meshesOf(vrm, 'tops').filter((m) => !m.name.endsWith('(transplanted)')));
  }
  // Hair all over; clothes part by part, each in its main colour, the rest of what's drawn on them kept.
  const parts: Partial<Record<Piece, Part[]>> = {};
  for (const p of PIECES) {
    if (p === 'hair') continue;
    parts[p] = partsIn(meshesOf(vrm, p));
  }
  vrm.scene.userData.parts = parts;
  for (const p of PIECES) {
    const d = dress[p];
    if (!d?.color && !d?.parts?.some(Boolean)) continue;
    if (p === 'hair') paint(meshesOf(vrm, p), d.color!);
    else paintParts(meshesOf(vrm, p), parts[p]!, [d.color, ...(d.parts ?? [])]);
  }
  if (dress.eyes) paint(irisOf(vrm), dress.eyes);
  // Skin the clothes put on now show is skin too, not black (a full body's black is its underwear).
  if (dress.skin || swapped) paint(skinOf(vrm), dress.skin ?? null, !body);
  if (swapped) tuck(vrm);
  // three-vrm hands a material's alpha cutoff to its shader only as the VRM updates its own
  // materials: these copies and the ones brought over would draw what VRoid cut away (a top's hem
  // that went inside the skirt) black.
  vrm.scene.traverse((o) => {
    for (const m of [(o as THREE.Mesh).material ?? []].flat() as (THREE.Material & { uniforms?: { alphaTest?: { value: number } } })[]) {
      if (m.uniforms?.alphaTest) m.uniforms.alphaTest.value = m.alphaTest;
    }
  });
  if (dress.shirtPrint) {
    const hip = vrm.humanoid.getRawBoneNode('hips');
    const neck = vrm.humanoid.getRawBoneNode('neck');
    if (hip && neck) {
      vrm.scene.updateMatrixWorld(true);
      for (const mesh of meshesOf(vrm, 'tops').filter((m) => m.visible)) {
        const low = mesh.worldToLocal(hip.getWorldPosition(new THREE.Vector3()));
        const high = mesh.worldToLocal(neck.getWorldPosition(new THREE.Vector3()));
        const height = Math.abs(high.y - low.y);
        // VRM 0 models face -Z before their scene rotation; VRM 1 faces +Z.
        const front = vrm.meta.metaVersion === '0' ? -1 : 1;
        addShirtPrint(mesh, dress.shirtPrint, { centerX: high.x, centerY: low.y + height * 0.62, width: height * 0.85, height: height * 0.75, front });
      }
    }
  }
  return vrm;
}

/**
 * A top and a bottom from two characters weren't fitted together: a skirt worn under a long
 * cardigan is wider at the waist than a tee's hem and shows through it. What of the bottoms is
 * above the top's hem is pulled in inside the top, direction by direction around the body (and
 * at the hem, where it shows, not into the body).
 */
function tuck(vrm: VRM) {
  const shown = (p: Piece) => meshesOf(vrm, p).filter((m) => m.visible);
  // The top as it shows: VRoid keeps a shirt's tucked-in tail (민호's) but cuts it away by
  // transparency, and the bottoms pulled in under that hidden hem went inside the body.
  const tops = shown('tops').map((m) => {
    const pos = m.geometry.attributes.position;
    const uv = m.geometry.attributes.uv;
    const map = ([m.material].flat()[0] as MToonLike).map;
    if (!uv || !map?.image) return pos;
    const px = pixelsOf(map);
    const { width: w, height: h } = map.image as { width: number; height: number };
    const keep: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      const x = Math.min(w - 1, Math.max(0, Math.floor(uv.getX(i) * w)));
      const y = Math.min(h - 1, Math.max(0, Math.floor(uv.getY(i) * h)));
      if (px[(y * w + x) * 4 + 3] >= 128) keep.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    }
    return keep.length ? new THREE.Float32BufferAttribute(keep, 3) : pos;
  });
  if (!tops.length) return;
  const ys: number[] = [];
  for (const pos of tops) for (let i = 0; i < pos.count; i++) ys.push(pos.getY(i));
  ys.sort((a, b) => a - b);
  // The hem (not the odd stray vertex), and the ring of the top just above it.
  const hem = ys[Math.floor(ys.length * 0.01)];
  const BINS = 24;
  const ring = new Array<number>(BINS).fill(Infinity);
  let cx = 0;
  let cz = 0;
  let n = 0;
  for (const pos of tops)
    for (let i = 0; i < pos.count; i++)
      if (pos.getY(i) < hem + 0.06) {
        cx += pos.getX(i);
        cz += pos.getZ(i);
        n++;
      }
  if (!n) return;
  cx /= n;
  cz /= n;
  const bin = (x: number, z: number) => Math.floor(((Math.atan2(z - cz, x - cx) / (2 * Math.PI) + 1) % 1) * BINS) % BINS;
  for (const pos of tops)
    for (let i = 0; i < pos.count; i++) {
      if (pos.getY(i) >= hem + 0.06) continue;
      const b = bin(pos.getX(i), pos.getZ(i));
      ring[b] = Math.min(ring[b], Math.hypot(pos.getX(i) - cx, pos.getZ(i) - cz));
    }
  // But not into the body: how far out it is, direction by direction, every 2cm up from the hem.
  const band = (y: number) => Math.floor((y - hem + 0.02) / 0.02);
  const body = new Map<number, number>();
  for (const m of skinOf(vrm)) {
    if (!m.visible || ![m.material].flat().some((mat) => /Body_\d+_SKIN/.test(mat.name))) continue;
    const pos = m.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const k = band(pos.getY(i)) * BINS + bin(pos.getX(i), pos.getZ(i));
      body.set(k, Math.max(body.get(k) ?? 0, Math.hypot(pos.getX(i) - cx, pos.getZ(i) - cz)));
    }
  }
  for (const m of shown('bottoms')) {
    const pos = m.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y < hem - 0.015) continue;
      const x = pos.getX(i) - cx;
      const z = pos.getZ(i) - cz;
      const r = Math.hypot(x, z);
      const b = bin(pos.getX(i), pos.getZ(i));
      const inTop = Math.min(ring[b], ring[(b + 1) % BINS], ring[(b + BINS - 1) % BINS]) * 0.95;
      // Higher up the top covers it, body and all.
      const near = [-1, 0, 1].flatMap((d) => [b, (b + 1) % BINS, (b + BINS - 1) % BINS].map((j) => (band(y) + d) * BINS + j));
      const outBody = y > hem + 0.03 ? 0 : Math.max(...near.map((k) => body.get(k) ?? 0)) + 0.008;
      const max = Math.max(inTop, outBody);
      if (!Number.isFinite(max) || r <= max) continue;
      pos.setX(i, cx + (x * max) / r);
      pos.setZ(i, cz + (z * max) / r);
    }
    pos.needsUpdate = true;
  }
}

/** The pieces a character has (for the wardrobe's list). */
export function piecesIn(vrm: VRM): Piece[] {
  return PIECES.filter((p) => meshesOf(vrm, p).length > 0);
}
