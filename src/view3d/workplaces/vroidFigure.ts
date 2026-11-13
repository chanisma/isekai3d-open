import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';
import { VrmAvatar, type BodyState } from '../avatar';
import type { Stage } from '../../dweller3d/figure';
import { figureQuality, type FigureQuality } from '../figureQuality';
import { PICKED_ONLY, loadVRM, models, type ModelInfo } from '../vrm';
import { inTurn } from '../loadQueue';
import { sceneClock } from '../sceneClock';
import { piecesIn, transplant, type Piece } from '../vrmDress';

/**
 * A drawn figure of a workplace played by a reduced VRoid body (`npc_lite_*`, clothes off, cut down in
 * VRoid Studio) in someone's everyday clothes of that age, taking the same orders (arms to a point,
 * head turned). Bodies are got ready one at a time as soon as a workplace is built, with its shaders
 * compiled and textures uploaded, so the scene needn't stop for them; those on screen go first, and only
 * so many are held (`MAX_BODIES`). Until then, past that, and without the files (an older character
 * pack) the drawn figure stays. `?vroid=0` keeps them all drawn, to compare.
 */
export interface Figure {
  root: THREE.Group;
  head: THREE.Group;
  armL(to: THREE.Vector3 | null): void;
  armR(to: THREE.Vector3 | null): void;
}
export const VROID_FIGURES = typeof location !== 'undefined' && new URLSearchParams(location.search).get('vroid') !== '0';
/** Each is about 20,000 triangles and its own textures. */
const MAX_BODIES = 12;
/** The bodies loaded, and when each was last drawn: one out of sight is let go when another is wanted. */
const held = new Set<{ seen: number; release(): void }>();
let loading = 0;
let renderer: THREE.WebGLRenderer | null = null;
const NO_CAMERA = new THREE.PerspectiveCamera();
const warmTarget = new THREE.WebGLRenderTarget(1, 1);
// three gives a plain target linear colour and no tone mapping: another program for every material drawn, each linked on the spot. As an XR target it gets the screen's, so it's the screen's programs that are made ready.
warmTarget.texture.colorSpace = THREE.SRGBColorSpace;
(warmTarget as THREE.WebGLRenderTarget & { isXRRenderTarget: boolean }).isXRRenderTarget = true;
/** The renderer shaders and textures are got ready on. */
export function setFigureRenderer(r: THREE.WebGLRenderer) {
  renderer = r;
}
/** Shaders compiled and textures on the GPU now, not in the frame the body first shows. */
async function warm(body: THREE.Object3D, at: THREE.Object3D) {
  if (!renderer) return;
  let scene: THREE.Object3D = at;
  while (scene.parent) scene = scene.parent;
  if (!(scene as THREE.Scene).isScene) return;
  await renderer.compileAsync(body, NO_CAMERA, scene as THREE.Scene);
  const textures = new Set<THREE.Texture>();
  body.traverse((o) => {
    for (const m of [(o as THREE.Mesh).material].flat()) {
      if (!m) continue;
      // A VRM's material keeps them in its uniforms.
      const uniforms = (m as THREE.ShaderMaterial).uniforms ?? {};
      for (const u of Object.values(uniforms)) if ((u.value as THREE.Texture)?.isTexture) textures.add(u.value as THREE.Texture);
    }
  });
  for (const t of textures) renderer.initTexture(t);
  // One real draw out of sight: the shadow pass's programs, the geometry and the bones, which nothing else gets ready.
  const was = renderer.getRenderTarget();
  scene.add(body);
  renderer.setRenderTarget(warmTarget);
  renderer.render(scene as THREE.Scene, NO_CAMERA);
  renderer.setRenderTarget(was);
  scene.remove(body);
}
const LET_GO_AFTER = 4000;
function slotFree(): boolean {
  if (held.size + loading < MAX_BODIES) return true;
  const now = performance.now();
  let oldest: { seen: number; release(): void } | undefined;
  for (const h of held) if (now - h.seen > LET_GO_AFTER && (!oldest || h.seen < oldest.seen)) oldest = h;
  oldest?.release();
  return !!oldest;
}

/** Who plays a figure: a body of their age and gender, in the clothes of someone else of that age (dealt by `seed`). */
function castFor(all: ModelInfo[], stage: Stage, gender: 'female' | 'male', seed: number, wearing?: string) {
  const bodies = all.filter((m) => m.kept === 'lite' && m.stage === stage && m.gender === gender);
  const worn = all.filter((m) => !m.kept && !m.outfit && m.stage === stage && m.gender === gender && !PICKED_ONLY.has(m.name) && !m.name.startsWith('sample'));
  if (!bodies.length || !worn.length) return null;
  const named = wearing && worn.find((m) => m.name === wearing);
  return { body: bodies[seed % bodies.length].file, clothes: (named || worn[seed % worn.length]).file };
}
let dealt = 0;

const FORWARD = new THREE.Vector3();
const AT = new THREE.Vector3();

export interface FigureOptions {
  /** Grown-up unless said. */
  stage?: Stage;
  gender?: 'female' | 'male';
  seat?: number;
  floor?: number;
  /** Whose clothes (a character of their age and gender), where they matter; dealt by `seed` if none. */
  wearing?: string;
  /** What's worn; shoes left out for bare feet. */
  pieces?: Piece[];
  /** Drawn parts the body takes over besides the figure's own (legs drawn apart from it). */
  hide?: THREE.Object3D[];
  /** Where each ankle goes (the figure's parent's frame), for feet on a rest. */
  legs?: () => { l?: THREE.Vector3; r?: THREE.Vector3 };
  /** Feet not to show: the piece draws its own there (with painted nails). */
  noFoot?: Array<'left' | 'right'>;
  /** Read every frame, like the rest: a bow or a slump at the waist, a head bowed, in radians. */
  lean?: number;
  nod?: number;
  /** Sitting cross-legged. */
  legsCross?: boolean;
  expr?: BodyState['expr'];
  /** The same person each time: a figure the piece draws twice (who queues, then rides). */
  seed?: number;
  /** In a cleanroom suit (cleanSuit.ts). */
  suit?: boolean;
  /** In a job's top and bottoms (`npc_garment_<set>`, as vrmLooks dresses a dweller at work), shoes from whoever else they're dealt. */
  garment?: string;
}

const D1 = new THREE.Vector3();
const D2 = new THREE.Vector3();
const POS = new THREE.Vector3();
const Q = new THREE.Quaternion();
const PQ = new THREE.Quaternion();
/** Turns a bone so that from `joint` it points along `to` instead of `from` (world). */
function aimBone(bone: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3) {
  bone.parent!.getWorldQuaternion(PQ);
  Q.setFromUnitVectors(from, to);
  bone.quaternion.premultiply(PQ.clone().invert().multiply(Q).multiply(PQ));
  bone.updateWorldMatrix(false, true);
}
/** The leg bent so the ankle is at `target`, the knee to the front (the raw bones, after the avatar has posed them). */
function legTo(vrm: VRM, side: 'left' | 'right', target: THREE.Vector3, front: THREE.Vector3) {
  const up = vrm.humanoid.getRawBoneNode(`${side}UpperLeg`);
  const lo = vrm.humanoid.getRawBoneNode(`${side}LowerLeg`);
  const ft = vrm.humanoid.getRawBoneNode(`${side}Foot`);
  if (!up || !lo || !ft) return;
  const hip = up.getWorldPosition(new THREE.Vector3());
  const knee = lo.getWorldPosition(new THREE.Vector3());
  const ankle = ft.getWorldPosition(new THREE.Vector3());
  const a = hip.distanceTo(knee);
  const b = knee.distanceTo(ankle);
  const line = target.clone().sub(hip);
  const L = Math.min(a + b - 0.002, Math.max(0.05, line.length()));
  line.normalize();
  const cos = THREE.MathUtils.clamp((a * a + L * L - b * b) / (2 * a * L), -1, 1);
  const bend = front.clone().addScaledVector(line, -front.dot(line)).normalize();
  const kneeTo = hip.clone().addScaledVector(line, a * cos).addScaledVector(bend, a * Math.sqrt(1 - cos * cos));
  aimBone(up, D1.copy(knee).sub(hip).normalize(), D2.copy(kneeTo).sub(hip).normalize());
  lo.getWorldPosition(POS);
  const ankleNow = ft.getWorldPosition(new THREE.Vector3());
  aimBone(lo, D1.copy(ankleNow).sub(POS).normalize(), D2.copy(hip).addScaledVector(line, L).sub(POS).normalize());
}

/** The springs come to rest, then those the quality doesn't keep stop there (they cost more than anything else in a body). */
function settleSprings(vrm: VRM, quality: FigureQuality) {
  const springs = vrm.springBoneManager;
  if (!springs || quality === 'high') return;
  for (let i = 0; i < 60; i++) springs.update(1 / 60);
  for (const j of [...springs.joints]) if (quality === 'low' || !/Hair/i.test(j.bone.name)) springs.deleteJoint(j);
}

export function vroidFigure(drawn: Figure, opts: FigureOptions = {}): Figure {
  const quality = figureQuality();
  if (!VROID_FIGURES || quality === 'drawn') return drawn;
  const { root, head } = drawn;
  const parts = [...root.children.filter((c) => c !== head), ...head.children, ...(opts.hide ?? [])];
  const targets: { l: THREE.Vector3 | null; r: THREE.Vector3 | null } = { l: null, r: null };
  const seed = opts.seed ?? dealt++;
  const stage = opts.stage ?? 'adult';
  const gender = opts.gender ?? (seed % 2 ? 'male' : 'female');
  const come = async () => {
    const cast = castFor(await models(), stage, gender, seed, opts.wearing);
    if (!cast) throw new Error(`no body for ${gender}-${stage}`);
    const set = opts.garment && (await models()).find((m) => m.kept === 'garment' && m.gender === gender && m.stage === stage && m.name === `npc_garment_${opts.garment}`);
    return Promise.all([loadVRM(cast.body), loadVRM(cast.clothes), set ? loadVRM(set.file) : null]);
  };
  const wake = new THREE.Mesh(new THREE.BoxGeometry(0.001, 0.001, 0.001), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  wake.frustumCulled = false;
  root.add(wake);
  // idle, waiting in the queue, in hand, or passed over for now (out of room when its turn came).
  let state: 'idle' | 'queued' | 'held' = 'idle';
  const attached = () => {
    let top: THREE.Object3D = root;
    while (top.parent) top = top.parent;
    return !!(top as THREE.Scene).isScene;
  };
  const ask = (now: boolean) => {
    state = 'queued';
    void inTurn(async () => {
      // Not wanted any more (the lot was left), or no room for one nobody is looking at yet.
      if (!attached() || (now ? !slotFree() : held.size + loading >= MAX_BODIES)) {
        state = 'idle';
        return;
      }
      loading++;
      await load();
    }, now);
  };
  const asleep = () => {
    if (state === 'idle') ask(true);
  };
  wake.onBeforeRender = asleep;
  // After this turn: the builder hasn't added the figure to its piece yet.
  setTimeout(() => {
    if (state === 'idle') ask(false);
  }, 0);
  const load = () => come()
    .then(async ([vrm, worn, set]) => {
      for (const piece of opts.pieces ?? piecesIn(worn)) if (piece !== 'hair' && !(set && (piece === 'tops' || piece === 'bottoms'))) transplant(vrm, worn, piece);
      if (set) for (const piece of ['tops', 'bottoms'] as const) transplant(vrm, set, piece);
      const avatar = new VrmAvatar(vrm, 1);
      if (opts.suit) avatar.setSuit(true);
      settleSprings(vrm, quality);
      // The body stands in world metres; this holder undoes the piece's turn, and is hidden with the figure.
      const holder = new THREE.Group();
      holder.matrixAutoUpdate = false;
      holder.add(avatar.root);
      await warm(holder, root);
      root.add(holder);
      loading--;
      for (const p of parts) p.visible = false;
      head.userData.bodied = true;
      state = 'held';
      wake.onBeforeRender = () => undefined;
      // Asked for each frame the figure is drawn; a mesh that shows nothing brings the camera along.
      const tick = new THREE.Mesh(new THREE.BoxGeometry(0.001, 0.001, 0.001), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      tick.frustumCulled = false;
      root.add(tick);
      const clock = new THREE.Clock();
      let t = 0;
      const look = new THREE.Vector3();
      const mine = {
        seen: performance.now(),
        release() {
          held.delete(mine);
          root.remove(holder);
          root.remove(tick);
          avatar.dispose();
          for (const p of parts) p.visible = true;
          head.userData.bodied = false;
          state = 'idle';
          wake.onBeforeRender = asleep;
        },
      };
      held.add(mine);
      const eyes = new THREE.Vector3();
      tick.onBeforeRender = (_r, _s, camera) => {
        mine.seen = performance.now();
        const dt = sceneClock.paused ? (clock.getDelta(), 0) : Math.min(0.05, clock.getDelta());
        t += dt;
        root.updateWorldMatrix(true, false);
        root.getWorldPosition(AT);
        FORWARD.set(0, 0, 1).transformDirection(root.matrixWorld);
        const yaw = Math.atan2(FORWARD.x, FORWARD.z);
        const floor = AT.y + (opts.floor ?? 0);
        const pose: BodyState['pose'] = opts.seat !== undefined
          ? { kind: 'sit', at: AT.clone().setY(AT.y + opts.seat), yaw, floor, ...(opts.legsCross ? { legs: 'cross' as const } : {}) }
          : { kind: 'stand', at: AT.clone().setY(floor), yaw };
        const world = (p: THREE.Vector3 | null) => (p ? root.parent!.localToWorld(p.clone()) : undefined);
        // The head's turn as somewhere to look.
        avatar.eyes(eyes);
        const gaze = yaw + head.rotation.y;
        look.set(eyes.x + Math.sin(gaze), eyes.y - Math.sin(head.rotation.x), eyes.z + Math.cos(gaze));
        const state: BodyState = {
          pose,
          reach: { l: world(targets.l), r: world(targets.r), grip: { l: 0.5, r: 0.5 }, lean: opts.lean, nod: opts.nod },
          expr: opts.expr ?? 'neutral',
          asleep: false,
          active: false,
          look,
        };
        holder.matrix.copy(root.matrixWorld).invert();
        holder.matrixWorld.identity();
        avatar.update(state, dt, t, camera);
        avatar.root.updateMatrixWorld(true);
        const legs = opts.legs?.();
        if (legs?.l) legTo(vrm, 'left', root.parent!.localToWorld(legs.l.clone()), FORWARD);
        if (legs?.r) legTo(vrm, 'right', root.parent!.localToWorld(legs.r.clone()), FORWARD);
        for (const side of opts.noFoot ?? []) vrm.humanoid.getRawBoneNode(`${side}Foot`)?.scale.setScalar(0.001);
        // What's worn on the head (a headset) goes where the head is.
        head.position.copy(root.worldToLocal(eyes.clone()));
      };
    })
    .catch((e) => {
      loading--;
      state = 'idle';
      wake.onBeforeRender = () => undefined; // No body to be had: the drawn figure stays.
      console.warn('vroidFigure', e);
    });
  return {
    root,
    head,
    armL(to) {
      targets.l = to && to.clone();
      drawn.armL(to);
    },
    armR(to) {
      targets.r = to && to.clone();
      drawn.armR(to);
    },
  };
}
