import * as THREE from 'three';
import { ASANAS, type Asana, type AsanaKey } from '../asana';
import type { BodyPose } from '../avatar';
import type { Doing } from '../activity';
import type { Spot } from '../parts';
import { beatOf, sm, type Beat, type V } from './busDriverMotion';

/*
 * A 댄서's work at the 댄스 스튜디오 (2026-10-31, the workplace pipeline, at the user's request: the dance
 * itself is the heart of this one). Two layers:
 *
 * - A dance vocabulary: whole-body poses added to asana.ts's table (avatar.ts 'asana' pose) and phrases
 *   strung from them in counts of eight (a step's pose, its counts, where the feet travel to, a whole turn,
 *   how high it leaves the floor). The poses hit on the count and hold, so it reads as dancing, not waving.
 *   The drawn dancers of the studio (dancer.ts `dancerFig`) turn the same bones by the same table, so a line
 *   of students really does the phrase the dweller does.
 * - Scripts, as at the 항공사 운항 센터: a round of beats with where the dweller is, the hands, and what moves.
 *   The piece reads the same script by the same clock (dancer.ts).
 *
 * Everything is in the piece's own frame (x across as you face its front, y up, z out of its front). A
 * step's travel is in the dancer's frame (x to their left, z ahead).
 */
export type DnMotion =
  | 'dnPhrase' | 'dnDraft' | 'dnLead'
  | 'dnBarre' | 'dnBarreStretch'
  | 'dnCue' | 'dnShow' | 'dnSolo'
  | 'dnSound' | 'dnFree'
  | 'dnRoll' | 'dnSplits'
  | 'dnShoes' | 'dnCostume'
  | 'dnVideo'
  | 'dnLift';
export const DN_MOTIONS = new Set<string>(['dnPhrase', 'dnDraft', 'dnLead', 'dnBarre', 'dnBarreStretch', 'dnCue', 'dnShow', 'dnSolo', 'dnSound', 'dnFree', 'dnRoll', 'dnSplits', 'dnShoes', 'dnCostume', 'dnVideo', 'dnLift']);

const frac = (x: number) => ((x % 1) + 1) % 1;
export const dnPhase = (p: THREE.Vector3) => frac(p.x * 0.331 + p.z * 0.547);
type Seq = Array<[string, number, number?]>;
const add = (a: V, x: number, y: number, z: number): V => [a[0] + x, a[1] + y, a[2] + z];
const lerpV = (a: V, b: V, e: number): V => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];
const mixN = (a: number, b: number, e: number) => a + (b - a) * e;

// ---------------------------------------------------------------------------------------------
// The poses (model units; +x the body's left). An arm: [up from level, forward, elbow bend]. A leg:
// [forward in the world, out to the side, knee bend, toes pointed, turned out]: hips pitched forward are
// taken off the thigh, so a leg's angle is the one seen.

type E3 = [number, number, number];
type Bones = Asana['bones'];
type Arm = [number, number, number];
type Leg = [number, number, number, number, number];
interface PoseIn {
  hip?: E3;
  hips?: E3;
  spine?: E3;
  chest?: E3;
  neck?: E3;
  head?: E3;
  aL?: Arm;
  aR?: Arm;
  L?: Leg;
  R?: Leg;
}
const DOWN: Arm = [-1.25, 0.02, 0.15];
const STD: Leg = [0, 0.03, 0.03, 0, 0];
function P(o: PoseIn): Asana {
  const p = o.hips?.[0] ?? 0;
  const [lf, lo, lk, lp, lt] = o.L ?? STD;
  const [rf, ro, rk, rp, rt] = o.R ?? STD;
  const [lae, laf, lab] = o.aL ?? DOWN;
  const [rae, raf, rab] = o.aR ?? DOWN;
  const bones: Bones = {
    leftUpperLeg: [-(lf + p), lt, lo], rightUpperLeg: [-(rf + p), -rt, -ro],
    leftLowerLeg: [lk, 0, 0], rightLowerLeg: [rk, 0, 0],
    leftFoot: [lf - lk + lp, 0, -lo * 0.6], rightFoot: [rf - rk + rp, 0, ro * 0.6],
    leftUpperArm: [0, -laf, lae], rightUpperArm: [0, raf, -rae],
    leftLowerArm: [0, -lab, 0], rightLowerArm: [0, rab, 0],
  };
  if (o.hips) bones.hips = o.hips;
  if (o.spine) bones.spine = o.spine;
  if (o.chest) bones.chest = o.chest;
  if (o.neck) bones.neck = o.neck;
  if (o.head) bones.head = o.head;
  return { hip: o.hip ?? [0, 0.91, 0], bones };
}
/** The same pose the other way round (left for right). */
function flip(a: Asana): Asana {
  const bones: Bones = {};
  for (const [k, v] of Object.entries(a.bones) as Array<[keyof Bones, E3]>) {
    const name = String(k);
    const other = (name.startsWith('left') ? 'right' + name.slice(4) : name.startsWith('right') ? 'left' + name.slice(5) : name) as keyof Bones;
    bones[other] = [v[0], -v[1], -v[2]];
  }
  return { hip: [-a.hip[0], a.hip[1], a.hip[2]], bones };
}
const ARM2ND: Arm = [-0.12, 0.18, 0.18];
const FIFTH: Arm = [1.2, 0.42, 0.42];
const FIRST: Arm = [-0.35, 1.1, 1.05];
const LOW: Arm = [-1.05, 0.5, 0.55];
const POINT = 0.75;

const stepL = P({ hips: [0, 0, 0.1], spine: [0, 0, -0.08], neck: [0, 0.3, 0], head: [0, 0.2, 0], L: [0.05, 0.42, 0.03, POINT, 0.35], R: [0, -0.02, 0.05, 0, 0.1], aL: [0.55, 0.15, 0.1], aR: [-0.75, 0.2, 0.3] });
const lungeL = P({ hip: [0.1, 0.72, 0], hips: [0, 0, 0.14], spine: [0, 0, -0.12], chest: [-0.08, 0, -0.1], neck: [-0.1, 0.3, 0], L: [0.45, 0.72, 1.25, 0, 0.75], R: [0, 0.55, 0.03, 0.25, 0.1], aL: [0.82, 0.12, 0.06], aR: [0.82, 0.12, 0.06] });
const hipL = P({ hips: [0, 0, 0.16], spine: [0, 0, -0.1], chest: [0, 0.08, -0.08], neck: [-0.05, 0.25, 0], L: [0.12, 0.08, 0.38, 0.55, 0.2], R: [0, -0.04, 0.03, 0, 0], aL: [-0.8, 0.3, 1.55], aR: [0.95, 0.1, 0.55] });
const popA = P({ hip: [0, 0.76, 0], hips: [0.2, 0.22, 0], spine: [0.08, 0.08, 0], neck: [-0.15, -0.35, 0], L: [0.42, 0.34, 0.85, 0, 0.3], R: [0.42, 0.34, 0.85, 0, 0.3], aL: [-0.25, 0.85, 1.75], aR: [0.05, -0.05, 0.12] });
const kickR = P({ hips: [-0.12, 0, 0], neck: [0.12, 0, 0], R: [1.45, 0.02, 0.05, POINT, 0.1], L: [0, 0.03, 0.04, 0, 0.1], aL: ARM2ND, aR: ARM2ND });
const prepL = P({ hip: [0, 0.8, 0], hips: [0.06, 0, 0], L: [0.55, 0.06, 0.95, 0, 0.3], R: [-0.42, 0.04, 0.08, 0.3, 0.3], aL: [-0.1, 1.15, 0.3], aR: ARM2ND });
const passeL = P({ neck: [-0.05, 0.15, 0], L: [1.0, 0.42, 2.05, POINT, 0.75], R: [0, -0.01, 0.03, 0.62, 0], aL: FIRST, aR: FIRST });
const arabL = P({ hips: [0.42, 0, 0], spine: [-0.1, 0, 0], chest: [-0.18, 0, 0], neck: [-0.25, 0, 0], L: [-1.2, 0.02, 0.12, POINT, 0.2], R: [0, 0.01, 0.04, 0, 0.1], aL: [0.05, -0.15, 0.12], aR: [0.32, 1.25, 0.1] });
const jeteL = P({ hip: [0, 1.05, 0], hips: [0.06, 0, 0], chest: [-0.15, 0, 0], neck: [-0.18, 0, 0], L: [1.25, 0.02, 0.05, POINT, 0.1], R: [-1.1, 0.02, 0.12, POINT, 0.1], aL: [0.42, 0.85, 0.12], aR: [0.15, -0.28, 0.12] });
const kneelL = P({ hip: [0, 0.5, 0], hips: [0.05, 0, 0], chest: [-0.1, 0, 0.05], neck: [-0.25, 0.1, 0], L: [1.15, 0.08, 1.45, 0, 0.1], R: [-0.3, 0.08, 1.9, 0.8, 0.1], aL: [0.85, 0.42, 0.2], aR: [-1.0, 0.65, 0.2] });
const floorL = P({ hip: [0, 0.2, -0.05], hips: [-0.28, 0, 0.05], chest: [-0.14, 0, 0], neck: [-0.3, 0.2, 0], L: [1.25, 0.55, 1.5, 0.5, 0.4], R: [1.5, 0.2, 0.25, POINT, 0.2], aL: [0.75, 0.45, 0.2], aR: [-1.15, -0.65, 0.05] });
const presentL = P({ chest: [-0.18, 0, 0], neck: [-0.22, 0, 0], L: [0.3, 0.08, 0.03, POINT, 0.5], R: [0, 0.03, 0.04, 0, 0.3], aL: [0.82, 0.3, 0.08], aR: [0.82, 0.3, 0.08] });
const tenduF: Asana = P({ chest: [-0.03, 0, 0], neck: [0, -0.2, 0], L: [0, 0.01, 0.03, 0, 0.55], R: [0.42, 0.02, 0.03, POINT, 0.5], aR: ARM2ND });
const tenduS: Asana = P({ chest: [-0.03, 0, 0], L: [0, 0.01, 0.03, 0, 0.55], R: [0, 0.42, 0.03, POINT, 0.5], aR: ARM2ND });
const tenduB: Asana = P({ hips: [0.1, 0, 0], chest: [-0.1, 0, 0], L: [0, 0.01, 0.03, 0, 0.55], R: [-0.42, 0.02, 0.03, POINT, 0.5], aR: ARM2ND });
const legBar: Asana = P({ hips: [-0.04, 0, 0], neck: [0.1, 0, 0], L: [0, 0.02, 0.03, 0, 0.3], R: [1.42, 0.02, 0.08, 0.2, 0.05] });

const DN_ASANAS: Record<string, Asana> = {
  dnReady: P({ L: [0, 0.05, 0.03, 0, 0], R: [0, 0.05, 0.03, 0, 0], aL: [-1.18, 0.05, 0.2], aR: [-1.18, 0.05, 0.2] }),
  dnStill: P({ neck: [0.2, 0, 0], head: [0.1, 0, 0], L: [0, 0.02, 0.03, 0, 0.1], R: [0, 0.02, 0.03, 0, 0.1], aL: [-1.28, 0, 0.12], aR: [-1.28, 0, 0.12] }),
  dnFirst: P({ L: [0, 0.01, 0.03, 0, 0.6], R: [0, 0.01, 0.03, 0, 0.6], aL: LOW, aR: LOW }),
  dnPlie: P({ hip: [0, 0.76, 0], L: [0.55, 0.42, 1.1, 0, 0.72], R: [0.55, 0.42, 1.1, 0, 0.72], aL: ARM2ND, aR: ARM2ND }),
  dnReach: P({ chest: [-0.15, 0, 0], neck: [-0.25, 0, 0], L: [0, 0.03, 0.03, 0.62, 0.05], R: [0, 0.03, 0.03, 0.62, 0.05], aL: [1.32, 0.05, 0.08], aR: [1.32, 0.05, 0.08] }),
  dnContract: P({ hip: [0, 0.76, 0], hips: [0.1, 0, 0], spine: [0.38, 0, 0], chest: [0.35, 0, 0], neck: [0.3, 0, 0], L: [0.68, 0.08, 1.25, 0, 0.1], R: [0.68, 0.08, 1.25, 0, 0.1], aL: [-0.25, 1.0, 1.45], aR: [-0.25, 1.0, 1.45] }),
  dnStepL: stepL, dnStepR: flip(stepL),
  dnLungeL: lungeL, dnLungeR: flip(lungeL),
  dnHipL: hipL, dnHipR: flip(hipL),
  dnPopA: popA, dnPopB: flip(popA),
  dnKickR: kickR, dnKickL: flip(kickR),
  dnPrep: prepL, dnPrepR: flip(prepL),
  dnPasse: passeL, dnPasseR: flip(passeL),
  dnPasseUp: P({ neck: [-0.05, 0, 0], L: [1.0, 0.42, 2.05, POINT, 0.75], R: [0, -0.01, 0.03, 0.62, 0], aL: FIFTH, aR: FIFTH }),
  dnArab: arabL, dnArabR: flip(arabL),
  dnJete: jeteL, dnJeteR: flip(jeteL),
  dnStar: P({ hip: [0, 1.0, 0], neck: [-0.1, 0, 0], L: [0, 0.72, 0.05, POINT, 0.1], R: [0, 0.72, 0.05, POINT, 0.1], aL: [0.72, 0.05, 0.05], aR: [0.72, 0.05, 0.05] }),
  dnKneel: kneelL, dnKneelR: flip(kneelL),
  dnFloor: floorL, dnFloorR: flip(floorL),
  dnPresent: presentL, dnPresentR: flip(presentL),
  dnBow: P({ hips: [0.85, 0, 0], spine: [0.1, 0, 0], neck: [0.25, 0, 0], L: [0, 0.03, 0.03, 0, 0.1], R: [0, 0.03, 0.03, 0, 0.1], aL: [-1.3, -0.1, 0.1], aR: [-1.3, -0.1, 0.1] }),
  dnCurtsy: P({ hip: [0, 0.76, 0], hips: [0.25, 0, 0], neck: [0.25, 0, 0], L: [0.75, 0.1, 1.3, 0, 0.2], R: [-0.25, 0.08, 1.1, 0.3, 0.1], aL: [-0.35, 0.3, 0.1], aR: [0.25, 0.45, 0.2] }),
  dnBreath: P({ hip: [0, 0.82, 0], hips: [0.85, 0, 0], neck: [-0.15, 0, 0], L: [0.3, 0.07, 0.55, 0, 0.1], R: [0.3, 0.07, 0.55, 0, 0.1], aL: [-1.15, 0.65, 0.2], aR: [-1.15, 0.65, 0.2] }),
  dnMarkL: P({ hips: [0, 0, 0.05], neck: [0.26, 0.1, 0], L: [0.08, 0.14, 0.12, 0.3, 0.1], R: [0, 0.02, 0.06, 0, 0], aL: [-0.5, 0.65, 1.05], aR: [-0.95, 0.5, 0.9] }),
  dnMarkR: P({ hips: [0, 0, -0.05], neck: [0.26, -0.1, 0], R: [0.08, 0.14, 0.12, 0.3, 0.1], L: [0, 0.02, 0.06, 0, 0], aR: [-0.5, 0.65, 1.05], aL: [-0.95, 0.5, 0.9] }),
  dnMarkUp: P({ neck: [0.1, 0, 0], L: [0, 0.05, 0.05, 0, 0], R: [0, 0.05, 0.05, 0, 0], aL: [-0.1, 0.65, 1.5], aR: [-0.1, 0.65, 1.5] }),
  dnChin: P({ neck: [0.05, 0.15, 0], L: [0.05, 0.05, 0.1, 0, 0.2], R: [0, 0.03, 0.04, 0, 0.05], aL: [-0.8, 0.6, 1.5], aR: [-0.3, 0.95, 2.05] }),
  dnClap: P({ neck: [0.04, 0, 0], L: [0, 0.06, 0.04, 0, 0.05], R: [0, 0.06, 0.04, 0, 0.05], aL: [-0.25, 1.1, 1.0], aR: [-0.25, 1.1, 1.0] }),
  dnClap2: P({ neck: [0.04, 0, 0], L: [0, 0.06, 0.1, 0, 0.05], R: [0, 0.06, 0.1, 0, 0.05], aL: [-0.25, 1.2, 1.3], aR: [-0.25, 1.2, 1.3] }),
  dnHandsHips: P({ neck: [0.03, 0, 0], L: [0, 0.06, 0.04, 0, 0.1], R: [0, 0.06, 0.04, 0, 0.1], aL: [-0.8, 0.3, 1.55], aR: [-0.8, 0.3, 1.55] }),
  dnArmsCross: P({ neck: [0.05, 0, 0], L: [0, 0.05, 0.04, 0, 0.05], R: [0, 0.05, 0.04, 0, 0.05], aL: [-0.75, 0.75, 1.9], aR: [-0.75, 0.75, 1.9] }),
  dnPoint: P({ neck: [0.1, -0.2, 0], hips: [0.1, 0, 0], L: [0, 0.05, 0.04, 0, 0.05], R: [0.08, 0.05, 0.08, 0, 0.05], aL: [-0.8, 0.3, 1.55], aR: [-0.2, 0.9, 0.18] }),
  dnWave: P({ L: [0, 0.05, 0.04, 0, 0.05], R: [0, 0.05, 0.04, 0, 0.05], aL: DOWN, aR: [0.75, 0.1, 0.45] }),
  // At the barre: the bar under the left hand (its arm comes by reach), the working leg the right.
  dnBFirst: P({ neck: [0, -0.1, 0], L: [0, 0.01, 0.03, 0, 0.6], R: [0, 0.01, 0.03, 0, 0.6], aR: LOW }),
  dnBPlie: P({ hip: [0, 0.82, 0], neck: [0, -0.15, 0], L: [0.52, 0.28, 1.0, 0, 0.72], R: [0.52, 0.28, 1.0, 0, 0.72], aR: FIRST }),
  dnBGrand: P({ hip: [0, 0.6, 0], neck: [0, -0.2, 0], L: [1.0, 0.38, 1.9, 0.55, 0.78], R: [1.0, 0.38, 1.9, 0.55, 0.78], aR: [-0.75, 0.75, 0.6] }),
  dnBTenduF: tenduF, dnBTenduS: tenduS, dnBTenduB: tenduB,
  dnBUp: P({ chest: [-0.05, 0, 0], L: [0, 0.01, 0.03, 0.62, 0.45], R: [0, 0.01, 0.03, 0.62, 0.45], aR: FIFTH }),
  dnBPasse: P({ neck: [0, -0.15, 0], L: [0, 0.01, 0.03, 0.62, 0.35], R: [1.0, 0.42, 2.05, POINT, 0.75], aR: FIFTH }),
  dnBCambre: P({ spine: [-0.2, 0, 0], chest: [-0.28, 0, 0], neck: [-0.25, 0, 0], L: [0, 0.01, 0.03, 0, 0.55], R: [0, 0.01, 0.03, 0, 0.55], aR: FIFTH }),
  dnLegBar: legBar, dnLegBarL: flip(legBar),
  dnLegFold: P({ hips: [0.52, 0, 0], spine: [0.26, 0, 0], chest: [0.3, 0, 0], neck: [0.2, 0, 0], L: [0, 0.02, 0.03, 0, 0.3], R: [1.42, 0.02, 0.08, 0.2, 0.05] }),
  dnLegSide: P({ spine: [0, 0, 0.2], chest: [0, 0, 0.25], neck: [0, 0.2, 0], L: [0, 0.02, 0.03, 0, 0.3], R: [1.42, 0.02, 0.08, 0.2, 0.05], aL: [1.0, 0.1, 0.4], aR: [-0.5, 0.75, 0.65] }),
  dnBHang: P({ hip: [0, 0.86, -0.25], hips: [1.15, 0, 0], spine: [0.1, 0, 0], neck: [0.05, 0, 0], L: [-0.1, 0.05, 0.03, 0, 0], R: [-0.1, 0.05, 0.03, 0, 0] }),
  dnCalf: P({ hips: [0.1, 0, 0], L: [0.3, 0.04, 0.5, 0, 0], R: [-0.42, 0.04, 0.03, 0, 0] }),
  // On the mat.
  dnStraddle: P({ hip: [0, 0.16, 0], chest: [-0.03, 0, 0], L: [1.5, 0.88, 0.04, 0.1, 0.1], R: [1.5, 0.88, 0.04, 0.1, 0.1], aL: [-0.55, 0.85, 0.2], aR: [-0.55, 0.85, 0.2] }),
  dnStraddleF: P({ hip: [0, 0.16, 0], hips: [0.42, 0, 0], spine: [0.35, 0, 0], chest: [0.32, 0, 0], neck: [-0.15, 0, 0], L: [1.5, 0.88, 0.04, 0.1, 0.1], R: [1.5, 0.88, 0.04, 0.1, 0.1], aL: [-0.42, 1.3, 0.1], aR: [-0.42, 1.3, 0.1] }),
  dnStraddleS: P({ hip: [0, 0.16, 0], spine: [0, -0.1, 0.32], chest: [0, -0.1, 0.38], neck: [0, 0.2, 0], L: [1.5, 0.88, 0.04, 0.1, 0.1], R: [1.5, 0.88, 0.04, 0.1, 0.1], aL: [1.05, 0.05, 0.3], aR: [-1.0, 0.8, 0.3] }),
  dnButterfly: P({ hip: [0, 0.16, 0], neck: [0.15, 0, 0], L: [1.3, 0.95, 2.1, 0.2, 0.6], R: [1.3, 0.95, 2.1, 0.2, 0.6], aL: [-0.75, 0.95, 0.25], aR: [-0.75, 0.95, 0.25] }),
  dnSplitLow: P({ hip: [0, 0.3, 0], chest: [-0.12, 0, 0], neck: [-0.12, 0, 0], L: [1.45, 0.05, 0.03, POINT, 0.05], R: [-1.45, 0.05, 0.12, POINT, 0.05], aL: [1.22, 0.1, 0.4], aR: [1.22, 0.1, 0.4] }),
  dnRollCalf: P({ hip: [0, 0.32, 0], hips: [-0.52, 0, 0], chest: [0.1, 0, 0], neck: [0.2, 0, 0], L: [1.42, 0.06, 0.04, 0.25, 0], R: [1.42, 0.06, 0.04, 0.25, 0], aL: [-0.72, -0.72, 0.05], aR: [-0.72, -0.72, 0.05] }),
  dnRollBack: P({ hip: [0, 0.32, 0], hips: [-1.32, 0, 0], neck: [0.3, 0, 0], L: [1.0, 0.12, 1.75, 0, 0], R: [1.0, 0.12, 1.75, 0, 0], aL: [0.62, 0.7, 2.25], aR: [0.62, 0.7, 2.25] }),
  dnRollSide: P({ hip: [0, 0.28, 0], hips: [-0.1, 0, 1.1], neck: [0, 0, -0.55], L: [0.3, 0.05, 0.1, 0.25, 0], R: [0.65, -0.12, 0.85, 0, 0], aL: [-1.42, 0.4, 0.05], aR: [0.1, 0.65, 1.1] }),
  dnSitFloor: P({ hip: [0, 0.16, -0.05], L: [1.5, 0.1, 0.05, 0.2, 0], R: [1.5, 0.1, 0.05, 0.2, 0], aL: [-1.0, -0.55, 0.05], aR: [-1.0, -0.55, 0.05] }),
  // Drawn only: sat with the hands in the lap, clapping, a hand raised; a director's folded arms; carried.
  dnSeat: P({ hip: [0, 0.55, 0], neck: [0.02, 0, 0], L: [1.5, 0.06, 1.5, 0, 0], R: [1.5, 0.06, 1.5, 0, 0], aL: [-1.15, 0.55, 0.9], aR: [-1.15, 0.55, 0.9] }),
  dnSeatClapA: P({ hip: [0, 0.55, 0], neck: [-0.05, 0, 0], L: [1.5, 0.06, 1.5, 0, 0], R: [1.5, 0.06, 1.5, 0, 0], aL: [-0.75, 0.85, 1.05], aR: [-0.75, 0.85, 1.05] }),
  dnSeatClapB: P({ hip: [0, 0.55, 0], neck: [-0.05, 0, 0], L: [1.5, 0.06, 1.5, 0, 0], R: [1.5, 0.06, 1.5, 0, 0], aL: [-0.7, 1.05, 1.32], aR: [-0.7, 1.05, 1.32] }),
  dnSeatCheer: P({ hip: [0, 0.55, 0], neck: [-0.15, 0, 0], L: [1.5, 0.06, 1.5, 0, 0], R: [1.5, 0.06, 1.5, 0, 0], aL: [1.0, 0.2, 0.2], aR: [1.0, 0.2, 0.2] }),
  dnFlyFront: P({ hip: [0, 1, 0], hips: [1.45, 0, 0], chest: [-0.28, 0, 0], neck: [-0.4, 0, 0], L: [-1.25, 0.05, 0.05, POINT, 0.05], R: [-1.05, 0.05, 0.4, POINT, 0.05], aL: [0.55, 0.15, 0.08], aR: [0.55, 0.15, 0.08] }),
  dnBaseWait: P({ L: [0, 0.03, 0.03, 0, 0.1], R: [0, 0.03, 0.03, 0, 0.1], aL: [-1.05, 0.15, 0.3], aR: [-1.05, 0.15, 0.3] }),
  dnBaseDip: P({ hip: [0, 0.78, 0], hips: [0.05, 0, 0], L: [0.35, 0.05, 0.75, 0, 0.1], R: [0.35, 0.05, 0.75, 0, 0.1], aL: [-1.05, 0.15, 0.3], aR: [-1.05, 0.15, 0.3] }),
  dnSpillA: P({ hip: [0, 0.24, 0], hips: [-0.55, 0, 0], neck: [0.1, 0, 0], L: [1.1, 0.25, 0.9, 0.2, 0], R: [0.8, 0.25, 0.75, 0.2, 0], aL: [-0.9, -0.5, 0.1], aR: [0.4, 0.3, 1.2] }),
  // The base's plié and press: the arms come by reach.
  dnLiftDip: P({ hip: [0, 0.74, 0], hips: [0.14, 0, 0], neck: [-0.1, 0, 0], L: [0.55, 0.28, 1.15, 0, 0.32], R: [0.55, 0.28, 1.15, 0, 0.32] }),
  dnLiftUp: P({ neck: [-0.3, 0, 0], head: [-0.12, 0, 0], chest: [-0.08, 0, 0], L: [0, 0.14, 0.05, 0, 0.2], R: [0, 0.14, 0.05, 0, 0.2] }),
  dnLiftWalkA: P({ neck: [-0.3, 0, 0], head: [-0.12, 0, 0], L: [0.3, 0.05, 0.1, 0, 0.1], R: [-0.25, 0.05, 0.25, 0.2, 0.1] }),
  dnLiftWalkB: P({ neck: [-0.3, 0, 0], head: [-0.12, 0, 0], R: [0.3, 0.05, 0.1, 0, 0.1], L: [-0.25, 0.05, 0.25, 0.2, 0.1] }),
};
Object.assign(ASANAS, DN_ASANAS);

// ---------------------------------------------------------------------------------------------
// Phrases, in counts.

/** A count, seconds. */
export const COUNT = 0.46;
/** A step: its pose, how many counts, where the feet are by the end of it (their left, ahead), whole turns, how high it leaves the floor. */
type Step = [string, number, number?, number?, number?, number?];
export const PHRASES: Record<string, Step[]> = {
  // 뒤로 두 번, 런지, 위로 쭉, 컨트랙션: the first eight.
  jazzA: [['dnStepR', 1, -0.22, 0], ['dnStepL', 1, 0.22, 0], ['dnStepR', 1, -0.22, 0], ['dnLungeL', 1, 0.34, 0], ['dnReach', 2, 0.08, 0], ['dnContract', 2, 0, 0.08]],
  // Prep, a pirouette, the hit to the front; hips and pops.
  jazzB: [['dnPrep', 1, 0, 0.1], ['dnPasse', 2, 0, 0.1, 1], ['dnPresent', 1, 0, 0.1], ['dnHipL', 1, 0.08, 0.05], ['dnHipR', 1, -0.08, 0.05], ['dnPopA', 1, -0.16, 0], ['dnPopB', 1, 0.16, 0]],
  // A kick, the leap across, down on one knee, up to finish.
  jazzC: [['dnKickR', 1, 0.05, 0.05], ['dnPrep', 1, 0.2, 0], ['dnJete', 1, -0.28, 0, 0, 0.32], ['dnLungeR', 1, -0.42, 0], ['dnKneel', 2, -0.3, 0], ['dnReach', 1, -0.08, 0], ['dnPresent', 1, 0, 0]],
  // The same eight, only marked: the feet barely shift, the hands sketch it, the eyes down.
  mark: [['dnMarkR', 1.5, -0.04, 0], ['dnMarkL', 1.5, 0.04, 0], ['dnMarkUp', 1.5, 0, 0], ['dnMarkR', 1.5, -0.04, 0], ['dnMarkL', 1.5, 0.04, 0], ['dnMarkUp', 1.5, 0, 0]],
  // Two tries at a new phrase: the arabesque doesn't quite sit, so the second has a turn in it.
  tryA: [['dnReady', 1, 0, 0], ['dnArab', 2, 0.05, 0], ['dnStill', 1, 0.05, 0], ['dnArab', 2, 0.05, 0], ['dnChin', 2, 0, 0]],
  tryB: [['dnPrep', 1, 0, 0.05], ['dnArab', 2, 0.05, 0.08], ['dnPasse', 2, 0.05, 0.08, 1], ['dnLungeL', 1, 0.28, 0.05], ['dnPresent', 2, 0.1, 0.05]],
  // Lyrical: reach, fold to the floor, roll up, a slow arabesque.
  lyricA: [['dnStill', 2, 0, 0], ['dnReach', 3, 0, 0], ['dnContract', 2, 0, 0.05], ['dnKneel', 3, 0.1, 0.05], ['dnFloor', 4, 0.15, 0.05]],
  lyricB: [['dnFloor', 2, 0.15, 0.05], ['dnKneelR', 2, -0.05, 0.05], ['dnPrep', 2, -0.1, 0.05], ['dnArab', 4, -0.1, 0.1], ['dnPasseUp', 3, -0.1, 0.1, 1], ['dnPresent', 3, -0.1, 0.1]],
  // A full number for the stage: runs and leaps across it, a floor section, the big finish.
  showA: [['dnStill', 2, -0.85, -0.2], ['dnStepL', 1, -0.75, -0.1], ['dnStepR', 1, -0.6, 0], ['dnJete', 1, -0.15, 0, 0, 0.36], ['dnLungeL', 1, 0.15, 0], ['dnReach', 2, 0.15, 0]],
  showB: [['dnPrep', 1, 0.15, 0.1], ['dnPasse', 2, 0.15, 0.15, 2], ['dnPresent', 1, 0.15, 0.15], ['dnKickL', 1, 0.3, 0.15], ['dnKickR', 1, 0.45, 0.15], ['dnStar', 1, 0.45, 0.15, 0, 0.32], ['dnPlie', 1, 0.45, 0.15]],
  showC: [['dnJeteR', 1, 0.75, 0.1, 0, 0.36], ['dnLungeR', 1, 0.85, 0.1], ['dnKneelR', 2, 0.75, 0.1], ['dnFloorR', 2, 0.7, 0.1], ['dnKneel', 1, 0.55, 0.05], ['dnPrep', 1, 0.4, 0.05]],
  showD: [['dnHipL', 1, 0.2, 0.15], ['dnHipR', 1, 0, 0.15], ['dnPopA', 1, -0.2, 0.2], ['dnPopB', 1, -0.05, 0.2], ['dnPrep', 1, -0.05, 0.3], ['dnPasseUp', 2, -0.05, 0.35, 1], ['dnPresent', 1, -0.05, 0.4]],
  // Free dancing at the desk: grooves, pops, a spin, a jump.
  freeA: [['dnHipL', 1, 0.1, 0], ['dnHipR', 1, -0.1, 0], ['dnHipL', 1, 0.1, 0], ['dnPopA', 1, -0.05, 0], ['dnPopB', 1, 0.05, 0], ['dnPopA', 1, -0.05, 0], ['dnStar', 1, 0, 0, 0, 0.26], ['dnPlie', 1, 0, 0]],
  freeB: [['dnStepR', 1, -0.25, 0.1], ['dnStepL', 1, 0.2, 0.1], ['dnPrep', 1, 0, 0.1], ['dnPasse', 1, 0, 0.1, 1], ['dnKickL', 1, 0.05, 0.1], ['dnKneelR', 2, 0, 0.1], ['dnWave', 1, 0, 0]],
};
const phraseLen = (name: string) => PHRASES[name].reduce((s, x) => s + x[1], 0);
const secs = (name: string, n = 1) => phraseLen(name) * COUNT * n;
const secsOf = (...names: string[]) => names.reduce((s, n) => s + secs(n), 0);
export interface DnStep {
  from: string;
  to: string;
  e: number;
  /** Where the feet are (their left, ahead), the extra turn, how far off the floor. */
  dx: number;
  dz: number;
  dy: number;
  turn: number;
  /** 1–8. */
  count: number;
}
/** Where a phrase has got to `time` seconds in; a dancer `late` counts behind runs it a little after. */
export function danceAt(name: string, time: number): DnStep {
  const steps = PHRASES[name];
  const total = phraseLen(name);
  const c = ((time / COUNT) % total + total) % total;
  let at = 0;
  let i = 0;
  for (; i < steps.length - 1 && c >= at + steps[i][1]; i++) at += steps[i][1];
  const s = steps[i];
  const prev = steps[(i + steps.length - 1) % steps.length];
  const v = (c - at) / s[1];
  // On the count: most of the way in the first part of the step, and held.
  const attack = Math.min(0.9, 0.42 / s[1] + 0.12);
  const e = sm(v, 0, attack);
  const fromX = i === 0 ? s[2] ?? 0 : prev[2] ?? 0;
  const fromZ = i === 0 ? s[3] ?? 0 : prev[3] ?? 0;
  return {
    from: i === 0 ? s[0] : prev[0],
    to: s[0],
    e: i === 0 ? 1 : e,
    dx: mixN(fromX, s[2] ?? 0, e),
    dz: mixN(fromZ, s[3] ?? 0, e),
    dy: (s[5] ?? 0) * Math.sin(Math.PI * Math.min(1, v * 1.05)),
    turn: (s[4] ?? 0) * Math.PI * 2 * sm(v, 0.05, 0.9),
    count: (Math.floor(c) % 8) + 1,
  };
}
/** Held in one pose. */
const hold = (k: string, from = k, e = 1): DnStep => ({ from, to: k, e, dx: 0, dz: 0, dy: 0, turn: 0, count: 0 });

// ---------------------------------------------------------------------------------------------
// The script engine.

export interface St {
  x: number;
  y: number;
  z: number;
  yaw: number;
  sit?: boolean;
  floor?: number;
}
const st = (x: number, y: number, z: number, yaw: number, more: Partial<St> = {}): St => ({ x, y, z, yaw, ...more });
interface Key {
  l?: V;
  r?: V;
  lean?: number;
  nod?: number;
  palms?: number;
  gl?: number;
  gr?: number;
  crouch?: number;
  tap?: boolean;
  /** The whole body in the dance's poses. */
  d?: DnStep;
  /** What the drawn dancers are doing: a phrase, how far in. */
  ph?: string;
  pt?: number;
  props?: Record<string, V | null | undefined>;
  n?: Record<string, number>;
  /** Named poses for the figures of the piece. */
  fig?: Record<string, string>;
}
interface Ctx {
  t: number;
  H: number;
  st: St;
  bd(side: number, up: number, ahead: number): V;
  p(name: string, a?: number, b?: number): number;
  after(name: string): boolean;
}
interface Script {
  seq: Seq;
  at(k: string): St;
  key(k: string, u: number, c: Ctx): Key;
}
export interface DnNow {
  b: Beat;
  st: St;
  walking: boolean;
  key: Key;
  props: Record<string, V | null>;
  n: Record<string, number>;
  ph: string | null;
  pt: number;
  fig: Record<string, string>;
  /** The pose the figures (and only they) ease from. */
  figFrom: Record<string, string>;
  figE: number;
}
function evalKey(s: Script, k: string, u: number, t: number, H: number): { st: St; key: Key } {
  const here = s.at(k);
  const idx = s.seq.findIndex(([q]) => q === k);
  const fx = Math.sin(here.yaw);
  const fz = Math.cos(here.yaw);
  const lx = Math.cos(here.yaw);
  const lz = -Math.sin(here.yaw);
  const c: Ctx = {
    t,
    H,
    st: here,
    bd: (side, up, ahead) => [here.x + lx * side + fx * ahead, here.y + up, here.z + lz * side + fz * ahead],
    p: (name, a = 0, b = 1) => {
      const i = s.seq.findIndex(([q]) => q === name);
      return idx > i ? 1 : idx < i ? 0 : sm(u, a, b);
    },
    after: (name) => idx > s.seq.findIndex(([q]) => q === name),
  };
  return { st: here, key: s.key(k, u, c) };
}
const angle = (a: number, b: number, e: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * e;
function blendKey(a: Key, b: Key, e: number): Key {
  if (e <= 0) return a;
  const v = (x: V | undefined, y: V | undefined) => (x && y ? lerpV(x, y, e) : e < 0.5 ? x : y);
  const n = (x: number | undefined, y: number | undefined, d: number) => mixN(x ?? d, y ?? d, e);
  let d: DnStep | undefined;
  if (a.d && b.d) d = { from: a.d.to, to: b.d.from, e, dx: mixN(a.d.dx, b.d.dx, e), dz: mixN(a.d.dz, b.d.dz, e), dy: 0, turn: 0, count: 0 };
  else d = e < 0.5 ? a.d : b.d;
  return { l: v(a.l, b.l), r: v(a.r, b.r), lean: n(a.lean, b.lean, 0.05), nod: n(a.nod, b.nod, 0.1), palms: n(a.palms, b.palms, 0.5), gl: n(a.gl, b.gl, 0.3), gr: n(a.gr, b.gr, 0.3), crouch: n(a.crouch, b.crouch, 0), tap: e < 0.5 ? a.tap : b.tap, d };
}
/** Where a script has got to: the dweller, the hands, and everything the piece draws. */
export function dnNow(m: DnMotion, t: number, ph: number, H = 1.6): DnNow {
  const s = SCRIPTS[m];
  const b = beatOf(s.seq, t, ph);
  const A = evalKey(s, b.from, b.u, t, H);
  const B = b.e > 0 ? evalKey(s, b.to, 0, t, H) : A;
  const e = b.e;
  const here: St = e < 0.5 ? { ...A.st } : { ...B.st };
  here.x = mixN(A.st.x, B.st.x, e);
  here.y = mixN(A.st.y, B.st.y, e);
  here.z = mixN(A.st.z, B.st.z, e);
  here.yaw = angle(A.st.yaw, B.st.yaw, e);
  if (A.st.floor !== undefined && B.st.floor !== undefined) here.floor = mixN(A.st.floor, B.st.floor, e);
  const dist = Math.hypot(A.st.x - B.st.x, A.st.z - B.st.z) + Math.abs(A.st.y - B.st.y);
  const props: Record<string, V | null> = {};
  for (const k of new Set([...Object.keys(A.key.props ?? {}), ...Object.keys(B.key.props ?? {})])) {
    const x = A.key.props?.[k] ?? null;
    const y = B.key.props?.[k] ?? null;
    props[k] = x && y ? lerpV(x, y, e) : e < 0.5 ? x : y;
  }
  const n: Record<string, number> = {};
  for (const k of new Set([...Object.keys(A.key.n ?? {}), ...Object.keys(B.key.n ?? {})])) n[k] = mixN(A.key.n?.[k] ?? 0, B.key.n?.[k] ?? 0, e);
  const key = blendKey(A.key, B.key, e);
  const lead = e < 0.5 ? A.key : B.key;
  return {
    b,
    st: here,
    walking: e > 0 && e < 1 && dist > 0.12 && !here.sit && !(A.key.d && B.key.d),
    key,
    props,
    n,
    ph: lead.ph ?? null,
    pt: lead.pt ?? 0,
    fig: B.key.fig ?? A.key.fig ?? {},
    figFrom: A.key.fig ?? {},
    figE: e,
  };
}
/** A dweller at a spot of a piece here: the whole body from the script. */
export function dnPose(m: DnMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const par = spot.at.parent!;
  par.updateWorldMatrix(true, false);
  const N = dnNow(m, t, dnPhase(par.getWorldPosition(new THREE.Vector3())), height);
  const W = (v: V) => par.localToWorld(new THREE.Vector3(v[0], v[1], v[2]));
  const s = N.st;
  const k = N.key;
  const d = k.d;
  // A step's travel is in the dancer's frame, turned to the way they face.
  const lx = Math.cos(s.yaw);
  const lz = -Math.sin(s.yaw);
  const fx = Math.sin(s.yaw);
  const fz = Math.cos(s.yaw);
  const px = s.x + (d ? d.dx * lx + d.dz * fx : 0);
  const pz = s.z + (d ? d.dx * lz + d.dz * fz : 0);
  const at = W([px, s.y, pz]);
  const dir = new THREE.Vector3(Math.sin(s.yaw), 0, Math.cos(s.yaw)).transformDirection(par.matrixWorld);
  const yaw = Math.atan2(dir.x, dir.z);
  let pose: BodyPose;
  if (d) pose = { kind: 'asana', at, yaw: yaw + d.turn, floor: W([px, s.y + d.dy, pz]).y, from: { key: d.from as AsanaKey, turn: 0 }, to: { key: d.to as AsanaKey, turn: 0 }, e: d.e };
  else if (s.sit) pose = { kind: 'sit', at, yaw, floor: W([s.x, s.floor ?? 0, s.z]).y };
  else if (N.walking) pose = { kind: 'walk', at, yaw };
  else pose = { kind: 'stand', at, yaw, crouch: k.crouch };
  return {
    pose,
    doing: {
      reach: { l: k.l && W(k.l), r: k.r && W(k.r), lean: k.lean ?? (d ? 0 : 0.05), nod: k.nod ?? (d ? 0 : 0.1), palms: k.palms ?? 0.4, grip: { l: k.gl ?? 0.3, r: k.gr ?? 0.3 }, tap: k.tap },
      crouch: !d && k.crouch ? k.crouch : undefined,
    },
  };
}
/** Dancing a phrase: its body, and the same for whoever dances with them. */
function dance(name: string, time: number, extra: Key = {}): Key {
  const d = danceAt(name, time);
  return { d, ph: name, pt: time, ...extra, n: { count: d.count, music: 1, ...extra.n } };
}
const scribble = (a: V, u: number, w = 0.08, laps = 4): V => [a[0] + w * (frac(u * laps) - 0.5), a[1] + 0.008, a[2] + 0.005 * Math.sin(u * 60)];
const atMouth = (c: Ctx, side = 0): V => c.bd(side, (c.st.sit ? 0.43 : 0.86) * c.H, 0.1);
const atFace = (c: Ctx, side: number, drop = 0): V => c.bd(side, (c.st.sit ? 0.46 - drop : 0.9 - drop) * c.H, 0.13);

// =============================================================================================
// 연습실 거울 (danceMirror, 2 × 1): the glass at its back, the dweller facing it (-z) with their back to the room.

/** Where the phone's tripod stands, the towel hangs, the speaker on the floor; where the students stand. */
export const MR = {
  stand: 1.0,
  towel: [0.78, 0.98, -0.32] as V,
  bottle: [0.78, 0.14, -0.12] as V,
  phone: [-0.72, 1.14, 0.55] as V,
  book: [-0.72, 0.03, 0.72] as V,
  students: [[-1.3, 1.45], [1.35, 1.55], [-2.25, 1.9]] as Array<[number, number]>,
  fix: [1.35, 1.55] as [number, number],
};
const MIR = () => st(0, 0, MR.stand, Math.PI);

const PHRASE_SEQ: Seq = [['warm', 3.0], ['think1', 2.2], ['mark', secs('mark')], ['think2', 2.6], ['fullA', secs('jazzA'), 0.2], ['fullB', secs('jazzB'), 0.2], ['fullC', secs('jazzC'), 0.2], ['hit', 1.4], ['breath', 3.0], ['towel', 3.4], ['again', secs('jazzA'), 0.2], ['again2', secs('jazzB'), 0.3], ['drink', 3.0]];
const DNPHRASE: Script = {
  seq: PHRASE_SEQ,
  at: () => MIR(),
  key(k, u, c): Key {
    const T = (name: string) => u * (PHRASE_SEQ.find(([q]) => q === name)![1]);
    switch (k) {
      case 'warm':
        // The neck rolled, a hand to the shoulder, the fingers shaken out.
        return { d: hold('dnReady'), l: c.bd(0.14, 0.82 * c.H, 0.05 + 0.03 * Math.sin(c.t * 2)), r: c.bd(-0.3, 0.55 * c.H, 0.1 + 0.03 * Math.sin(c.t * 7)), gl: 0.5, gr: 0.2, nod: 0.25 * Math.sin(c.t * 1.6), n: { music: 0 } };
      case 'think1':
        return { d: hold('dnChin'), nod: -0.05, n: { music: 0 } };
      case 'mark':
        return dance('mark', T('mark'), { n: { mark: 1 } });
      case 'think2':
        // The same bit worked out: a hand drawn through the air, the head on one side.
        return { d: hold('dnMarkUp'), r: c.bd(-0.2 + 0.2 * Math.sin(u * 8), 0.72 * c.H, 0.32), l: c.bd(0.22, 0.48 * c.H, 0.12), gl: 0.3, gr: 0.15, nod: 0.08, n: { music: 0 } };
      case 'fullA':
        return dance('jazzA', T('fullA'));
      case 'fullB':
        return dance('jazzB', T('fullB'));
      case 'fullC':
        return dance('jazzC', T('fullC'));
      case 'hit':
        return { d: hold('dnPresent'), n: { music: 1, count: 8 } };
      case 'breath':
        return { d: hold('dnBreath'), nod: 0.12 * Math.sin(c.t * 5), n: { sweat: 1 } };
      case 'towel': {
        // The towel off the rail, over the face and the neck, and back.
        const held = u > 0.2 && u < 0.84;
        const face = atFace(c, 0.02 * Math.sin(c.t * 7));
        const to = u < 0.2 ? lerpV(MR.towel, face, sm(u, 0.04, 0.2)) : u > 0.84 ? lerpV(face, MR.towel, sm(u, 0.84, 0.98)) : u < 0.55 ? face : c.bd(0.04 * Math.sin(c.t * 5), 0.82 * c.H, 0.03);
        return { r: to, l: held ? add(to, 0.1, -0.03, 0.01) : undefined, gr: 0.75, gl: 0.6, nod: held ? -0.12 : 0.05, props: { towel: u > 0.08 && u < 0.92 ? add(to, 0.04, -0.05, 0.04) : null }, n: { sweat: 1 - u } };
      }
      case 'again':
        return dance('jazzA', T('again'));
      case 'again2':
        return dance('jazzB', T('again2'));
      case 'drink': {
        const b = u < 0.22 ? lerpV(MR.bottle, atMouth(c), sm(u, 0.02, 0.22)) : u > 0.8 ? lerpV(atMouth(c), MR.bottle, sm(u, 0.8, 0.98)) : atMouth(c);
        return { r: add(b, 0, -0.06, 0), gr: 0.9, crouch: u < 0.14 || u > 0.88 ? 0.75 : 0, nod: u > 0.25 && u < 0.78 ? -0.35 : 0.1, props: { bottle: b } };
      }
      default:
        return { n: { music: 0 } };
    }
  },
};

const DRAFT_SEQ: Seq = [['sit', 5.0, 1.2], ['sketch', 4.0], ['rise', 1.0, 0.8], ['tap', 1.8, 0.7], ['tryA', secs('tryA'), 0.4], ['back', 0.6, 0.6], ['watch', 4.2], ['chin', 1.8], ['note', 3.0, 0.6], ['tryB', secs('tryB'), 0.4], ['back2', 0.6, 0.6], ['watch2', 3.6], ['nod', 1.6, 0.8]];
const DNDRAFT: Script = {
  seq: DRAFT_SEQ,
  at(k) {
    if (k === 'sit' || k === 'sketch' || k === 'rise') return st(-0.72, 0, 1.2, Math.PI);
    if (k === 'tap' || k === 'back' || k === 'watch' || k === 'chin' || k === 'back2' || k === 'watch2' || k === 'nod') return st(-0.72, 0, 0.98, 0);
    if (k === 'note') return st(-0.45, 0, 1.0, Math.PI);
    return st(0.1, 0, 0.92, Math.PI);
  },
  key(k, u, c): Key {
    const lines: Record<string, number> = { sit: 1 + 2 * u, sketch: 3 + 3 * u, rise: 6, tap: 6, tryA: 6, back: 6, watch: 6, chin: 6, note: 6 + 3 * u, tryB: 9, back2: 9, watch2: 9, nod: 9 };
    const n0 = { lines: lines[k] ?? 0, video: 0 };
    const rec = (on: number) => ({ rec: on });
    const lap = (side: number, up: number): V => c.bd(side, up, 0.32);
    switch (k) {
      case 'sit':
      case 'sketch': {
        // Sat on the floor, the notebook on a knee; floor patterns drawn with arrows.
        const book = lap(0.03, 0.22);
        return { d: hold('crossed'), l: add(book, 0.12, 0.01, 0), r: scribble(add(book, -0.03, 0.02, 0.02), u, 0.1, k === 'sit' ? 3 : 5), gl: 0.7, gr: 0.75, nod: k === 'sketch' && u > 0.6 ? -0.05 : 0.4, palms: 0.8, props: { book, pen: add(scribble(add(book, -0.03, 0.02, 0.02), u, 0.1, k === 'sit' ? 3 : 5), 0, 0.05, 0) }, n: n0 };
      }
      case 'rise':
        return { d: hold('dnKneel', 'crossed', sm(u, 0, 0.8)), n: n0 };
      case 'tap':
        // Bent to the phone on its tripod, and the red button.
        return { r: add(MR.phone, 0, 0.01, -0.03 * (1 - sm(u, 0.4, 0.6))), nod: 0.2, lean: 0.12, gr: 0.2, n: { ...n0, ...rec(u > 0.55 ? 1 : 0) } };
      case 'tryA':
        return dance('tryA', u * secs('tryA'), { n: { ...n0, ...rec(1) } });
      case 'back':
      case 'back2':
        return { n: { ...n0, ...rec(0), video: 0 } };
      case 'watch':
      case 'watch2': {
        // The phone off the tripod, held up, the take played back.
        const ph = lerpV(MR.phone, c.bd(0.02, 0.72 * c.H, 0.3), sm(u, 0, 0.14));
        return { r: add(ph, -0.03, -0.05, 0), l: add(ph, 0.04, -0.05, 0), gr: 0.75, gl: 0.75, nod: 0.3, palms: 0.5, props: { phone: ph }, n: { ...n0, ...rec(0), video: u > 0.14 ? (k === 'watch' ? 1 : 2) : 0, vt: u } };
      }
      case 'chin': {
        const ph = c.bd(0.02, 0.72 * c.H, 0.3);
        return { r: atFace(c, -0.02, 0.1), l: add(ph, 0.04, -0.05, 0), gr: 0.35, gl: 0.75, nod: 0.25, props: { phone: ph }, n: { ...n0, video: 1, vt: 1 } };
      }
      case 'note': {
        const book = c.bd(0.08, 0.6 * c.H, 0.26);
        const pen = scribble(add(book, -0.02, 0.01, 0.01), u, 0.08, 4);
        return { l: add(book, 0.06, -0.01, -0.02), r: pen, gl: 0.8, gr: 0.75, nod: 0.45, props: { book, pen: add(pen, 0, 0.05, 0) }, n: n0 };
      }
      case 'tryB':
        return dance('tryB', u * secs('tryB'), { n: { ...n0, ...rec(1) } });
      case 'nod': {
        const ph = lerpV(c.bd(0.02, 0.72 * c.H, 0.3), MR.phone, sm(u, 0.4, 0.9));
        return { r: add(ph, -0.03, -0.05, 0), gr: 0.7, nod: 0.3 * Math.abs(Math.sin(c.t * 5)), props: { phone: ph }, n: { ...n0, video: 0 } };
      }
      default:
        return { n: n0 };
    }
  },
};

// 단원 연습 지도하기: the counts clapped, the phrase shown, all together, stopped; one arm put right by hand; again.
const LEAD_SEQ: Seq = [['face', 1.6, 0.7], ['clap', 3.2, 0.7], ['demo', secs('jazzA'), 0.3], ['together', secs('jazzA'), 0.2], ['together2', secs('jazzB'), 0.3], ['stop', 1.6, 0.8], ['walk', 0.5, 0.8], ['fix', 3.4, 0.8], ['fix2', 2.0, 0.8], ['back', 0.6, 0.6], ['again', secs('jazzA'), 0.2], ['again2', secs('jazzB'), 0.3], ['praise', 2.8, 0.8]];
const DNLEAD: Script = {
  seq: LEAD_SEQ,
  at(k) {
    if (k === 'face' || k === 'clap' || k === 'stop' || k === 'praise') return st(0, 0, 1.15, 0);
    if (k === 'walk' || k === 'fix' || k === 'fix2') return st(MR.fix[0] - 0.42, 0, MR.fix[1], Math.PI / 2);
    return MIR();
  },
  key(k, u, c): Key {
    const T = (name: string) => u * (LEAD_SEQ.find(([q]) => q === name)![1]);
    const f = (all: string) => ({ a: all, b: all, c: all });
    switch (k) {
      case 'face':
        return { d: hold('dnHandsHips'), fig: f('dnReady'), n: { music: 0 } };
      case 'clap': {
        const n = Math.floor(u * 8);
        const on = (c.t * 2.2) % 1 < 0.5;
        return { d: hold(on ? 'dnClap' : 'dnClap2'), fig: f('dnReady'), nod: -0.05, n: { music: 0, count: 5 + (n % 4) } };
      }
      case 'demo':
        // They watch with their arms folded.
        return dance('jazzA', T('demo'), { ph: undefined, fig: { a: 'dnArmsCross', b: 'dnHandsHips', c: 'dnArmsCross' } });
      case 'together':
        return dance('jazzA', T('together'));
      case 'together2':
        return dance('jazzB', T('together2'), { n: { wrong: 1 } });
      case 'stop':
        return { d: hold('dnWave'), fig: { a: 'dnBreath', b: 'dnHandsHips', c: 'dnHandsHips' }, n: { music: 0 } };
      case 'walk':
        return { fig: { a: 'dnReady', b: 'dnReady', c: 'dnHandsHips' }, n: { music: 0 } };
      case 'fix': {
        // At the student's side: her elbow raised and her wrist turned, a nod to check.
        const up = sm(u, 0.25, 0.7);
        const fx = MR.fix;
        return { r: [fx[0] - 0.08, 1.0 + 0.3 * up, fx[1] + 0.03], l: [fx[0] - 0.08, 1.2 + 0.1 * up, fx[1] - 0.18], gr: 0.65, gl: 0.55, nod: 0.05, palms: 0.2, fig: { a: 'dnReady', b: up > 0.5 ? 'dnPresent' : 'dnStepL', c: 'dnHandsHips' }, n: { music: 0 } };
      }
      case 'fix2':
        return { d: hold('dnPresent'), fig: { a: 'dnReady', b: 'dnPresent', c: 'dnHandsHips' }, nod: 0.2 * Math.abs(Math.sin(c.t * 4)), n: { music: 0 } };
      case 'back':
        return { fig: f('dnReady'), n: { music: 0 } };
      case 'again':
        return dance('jazzA', T('again'));
      case 'again2':
        return dance('jazzB', T('again2'));
      case 'praise':
        return { d: hold((c.t * 3) % 1 < 0.5 ? 'dnClap' : 'dnClap2'), fig: { a: 'dnWave', b: 'dnPresent', c: 'dnWave' }, n: { music: 0 } };
      default:
        return {};
    }
  },
};

// =============================================================================================
// 발레 바 (balletBarre, 3 × 1): a free-standing double rail at z≈0.02.

export const BR = {
  yHi: 1.02,
  yLo: 0.8,
  z: 0.02,
  /** Stood along it: the left hand on the bar, 0.42 off it. */
  side: 0.46,
  teacher: [1.25, 1.0] as [number, number],
  towel: [-1.18, 1.0, 0.04] as V,
};
const barHand = (x: number): V => [x, BR.yHi + 0.03, BR.z];
const ALONG_L = st(-0.2, 0, BR.side, Math.PI / 2); // Facing +x: the left hand to the bar.
const ALONG_R = st(0.2, 0, BR.side, -Math.PI / 2); // Facing -x: the right hand to it.

const BARRE_SEQ: Seq = [['place', 1.6, 0.8], ['plie', 4.0, 0.2], ['grand', 4.0, 0.3], ['tendu', 5.2, 0.3], ['teach', 3.8, 0.4], ['tendu2', 3.2, 0.3], ['rise', 2.4, 0.4], ['cambre', 2.6, 0.7], ['turn', 0.4, 0.9], ['passe', 3.6, 0.4], ['balance', 3.2, 0.5], ['bow', 1.6, 0.8]];
const DNBARRE: Script = {
  seq: BARRE_SEQ,
  at(k) {
    if (k === 'turn' || k === 'passe' || k === 'balance' || k === 'bow') return ALONG_R;
    return ALONG_L;
  },
  key(k, u, c): Key {
    const L: Partial<Key> = { l: barHand(ALONG_L.x + 0.1), gl: 0.85, palms: 0.8 };
    // On the other side the same bones mirrored: the bar under the right hand.
    const R: Partial<Key> = { r: barHand(ALONG_R.x - 0.1), gr: 0.85, palms: 0.8 };
    const dip = (a: string, b: string, n: number): DnStep => {
      const w = 0.5 - 0.5 * Math.cos(u * n * Math.PI * 2);
      return hold(b, a, w);
    };
    switch (k) {
      case 'place':
        return { ...L, d: hold('dnBFirst'), fig: { t: 'dnArmsCross' }, n: { tx: 1.25, music: 0 } };
      case 'plie':
        return { ...L, d: dip('dnBFirst', 'dnBPlie', 2), fig: { t: 'dnArmsCross' }, n: { tx: 1.25, music: 1 } };
      case 'grand':
        return { ...L, d: dip('dnBFirst', 'dnBGrand', 1), fig: { t: 'dnClap' }, n: { tx: 1.25, music: 1 } };
      case 'tendu': {
        // 앞, 옆, 뒤, 옆: the foot out along the floor and closed, each way.
        const seq = ['dnBTenduF', 'dnBTenduS', 'dnBTenduB', 'dnBTenduS'];
        const i = Math.min(3, Math.floor(u * 4));
        const v = u * 4 - i;
        return { ...L, d: hold(seq[i], 'dnBFirst', Math.sin(Math.PI * Math.min(1, v * 1.04))), fig: { t: 'dnPoint' }, n: { tx: 1.1, music: 1 } };
      }
      case 'teach':
        // The teacher comes in to the working hip: the leg's line, the chin lifted; a nod.
        return { ...L, d: hold(u < 0.5 ? 'dnBTenduS' : 'dnBTenduF', u < 0.5 ? 'dnBTenduS' : 'dnBTenduS', 1), nod: u < 0.45 ? 0.2 : -0.06, fig: { t: u < 0.6 ? 'dnPoint' : 'dnClap' }, n: { tx: mixN(1.1, 0.78, sm(u, 0, 0.4)), tTalk: 1, music: 0 } };
      case 'tendu2': {
        const seq = ['dnBTenduF', 'dnBTenduS', 'dnBTenduB'];
        const i = Math.min(2, Math.floor(u * 3));
        const v = u * 3 - i;
        return { ...L, d: hold(seq[i], 'dnBFirst', Math.sin(Math.PI * Math.min(1, v * 1.04))), fig: { t: 'dnHandsHips' }, n: { tx: 1.05, music: 1 } };
      }
      case 'rise':
        return { ...L, d: hold('dnBUp', 'dnBFirst', sm(u, 0, 0.3)), fig: { t: 'dnHandsHips' }, n: { tx: 1.05, music: 1 } };
      case 'cambre':
        return { ...L, d: hold('dnBCambre', 'dnBUp', sm(u, 0, 0.4)), fig: { t: 'dnHandsHips' }, n: { tx: 1.05, music: 1 } };
      case 'turn':
        return { fig: { t: 'dnHandsHips' }, n: { tx: 1.2, music: 0 } };
      case 'passe': {
        const w = sm(u, 0, 0.25);
        return { ...R, d: { ...hold('dnBPasse', 'dnBFirst', w), from: flipKey('dnBFirst'), to: flipKey('dnBPasse') }, fig: { t: 'dnClap' }, n: { tx: 1.25, music: 1 } };
      }
      case 'balance': {
        // The hand comes off the bar: held on one toe, just.
        const off = sm(u, 0.1, 0.35) * (1 - sm(u, 0.85, 1));
        const bar = barHand(ALONG_R.x - 0.1);
        const wobble = 0.015 * Math.sin(c.t * 5);
        return { r: off > 0.5 ? c.bd(-0.44, 1.08 * c.H + wobble, 0.1) : bar, gr: off > 0.5 ? 0.2 : 0.85, palms: 0.5, d: { ...hold(flipKey('dnBPasse')), to: flipKey('dnBPasse') }, fig: { t: u < 0.5 ? 'dnHandsHips' : 'dnClap' }, n: { tx: 1.25, music: 1, wobble } };
      }
      case 'bow':
        return { d: hold('dnCurtsy'), fig: { t: 'dnWave' }, n: { tx: 1.25, music: 0 } };
      default:
        return { n: { tx: 1.25 } };
    }
  },
};
// The other side's poses.
const flipped = new Map<string, string>();
function flipKey(k: string): string {
  let f = flipped.get(k);
  if (!f) {
    f = `${k}_M`;
    (ASANAS as Record<string, Asana>)[f] = flip(ASANAS[k as AsanaKey]);
    flipped.set(k, f);
  }
  return f;
}

// A stretch at the barre: a leg up on the low rail, folded over it, a side bend; the other; the calf; hanging forward.
const BSTR = (x: number) => st(x, 0, 0.84, Math.PI);
const STRETCH_SEQ: Seq = [['step', 1.2, 0.8], ['up', 2.4, 0.9], ['fold', 4.2, 0.9], ['side', 3.6, 0.9], ['down', 0.8, 0.8], ['upL', 2.2, 0.9], ['foldL', 3.8, 0.9], ['downL', 0.8, 0.8], ['calf', 3.4, 0.8], ['hang', 3.6, 0.9], ['roll', 1.6, 0.9]];
const DNBARRESTRETCH: Script = {
  seq: STRETCH_SEQ,
  at(k) {
    if (k === 'step' || k === 'roll') return BSTR(0);
    if (k === 'calf' || k === 'hang') return st(0, 0, 0.72, Math.PI);
    return BSTR(0);
  },
  key(k, u, c): Key {
    const hands = (side = 0.26): Partial<Key> => ({ l: [c.st.x - side, BR.yHi + 0.03, BR.z], r: [c.st.x + side, BR.yHi + 0.03, BR.z], gl: 0.85, gr: 0.85, palms: 0.8 });
    const breath = 0.02 * Math.sin(c.t * 1.5);
    switch (k) {
      case 'step':
        return { ...hands(), d: hold('dnReady'), nod: 0.15 };
      case 'up':
        return { ...hands(), d: hold('dnLegBar', 'dnReady', sm(u, 0, 0.5)), nod: 0.1, n: { legOn: 1 } };
      case 'fold':
        return { l: [c.st.x - 0.09, BR.yLo + 0.05 + breath, BR.z + 0.1], r: [c.st.x + 0.04, BR.yLo + 0.08 + breath, BR.z + 0.14], gl: 0.7, gr: 0.7, palms: 0.8, d: hold('dnLegFold', 'dnLegBar', 0.75 + 0.25 * Math.sin(c.t * 1.2)), n: { legOn: 1 } };
      case 'side':
        return { d: hold('dnLegSide', 'dnLegBar', sm(u, 0, 0.3)), n: { legOn: 1 } };
      case 'down':
      case 'downL':
        return { ...hands(), d: hold('dnReady') };
      case 'upL':
        return { ...hands(), d: hold('dnLegBarL', 'dnReady', sm(u, 0, 0.5)), nod: 0.1, n: { legOn: 2 } };
      case 'foldL':
        return { l: [c.st.x - 0.04, BR.yLo + 0.08 + breath, BR.z + 0.14], r: [c.st.x + 0.09, BR.yLo + 0.05 + breath, BR.z + 0.1], gl: 0.7, gr: 0.7, palms: 0.8, d: hold(flipKey('dnLegFold'), 'dnLegBarL', 0.75 + 0.25 * Math.sin(c.t * 1.2)), n: { legOn: 2 } };
      case 'calf':
        return { ...hands(0.3), d: hold('dnCalf'), lean: 0.1, nod: 0.2 };
      case 'hang':
        return { ...hands(0.3), d: hold('dnBHang', 'dnCalf', sm(u, 0, 0.35)), nod: 0.15 };
      case 'roll':
        return { d: hold('dnReach', 'dnReady', Math.sin(Math.PI * u)) };
      default:
        return {};
    }
  },
};

// =============================================================================================
// 공연 무대 (performStage, 5 × 3): a deck 0.5 up, a stair at the left of its front, the wings at the sides.

const DECK = 0.5;
export const SG = {
  deck: DECK,
  front: 0.72,
  back: -1.42,
  foot: [-1.95, 0, 1.45] as V,
  top: [-1.95, DECK, 0.56] as V,
  wing: [-1.95, DECK, -0.5] as V,
  center: [0, DECK, -0.28] as V,
  marks: [[-0.8, 0.1], [0.05, -0.55], [0.8, 0.1]] as Array<[number, number]>,
  sm: [2.05, 0.52] as [number, number],
  bouquet: [1.9, DECK + 0.02, 0.45] as V,
};
const seqUp: Seq = [['foot', 0.3, 0.9], ['top', 0.02, 0.6], ['wing', 0.2, 0.9]];
const steps = (k: string, walkKey: Record<string, St>): St | undefined => walkKey[k];
const UP_AT: Record<string, St> = {
  foot: st(SG.foot[0], 0, SG.foot[2], Math.PI),
  top: st(SG.top[0], DECK, SG.top[2], Math.PI),
  wing: st(SG.wing[0], DECK, SG.wing[2], Math.PI / 2),
  off: st(SG.wing[0], DECK, SG.wing[2], -Math.PI / 2),
  down: st(SG.top[0], DECK, SG.top[2], 0),
  out: st(SG.foot[0], 0, SG.foot[2], 0),
};
const CEN = st(SG.center[0], DECK, SG.center[2], 0);
const MARK = (i: number) => st(SG.marks[i][0], DECK, SG.marks[i][1], 0);

// 큐 투 큐: walked from mark to mark, a pose hit, the light found, a bit of the number, stopped by the stage manager.
const CUE_SEQ: Seq = [...seqUp, ['mark1', 2.0, 1.0], ['hit1', 2.2, 0.4], ['run1', secs('jazzA'), 0.4], ['hold1', 2.4, 1.2], ['mark2', 2.6, 0.4], ['run2', secs('jazzB'), 0.4], ['note', 3.0, 1.2], ['mark3', 2.0, 0.4], ['run3', secs('jazzC'), 0.4], ['thanks', 2.4, 1.0], ['off', 0.3, 0.7], ['down', 0.02, 0.9], ['out', 0.2, 0.8]];
const DNCUE: Script = {
  seq: CUE_SEQ,
  at(k) {
    if (k in UP_AT) return steps(k, UP_AT)!;
    if (k === 'mark1' || k === 'hit1' || k === 'run1' || k === 'hold1') return MARK(0);
    if (k === 'mark2' || k === 'run2' || k === 'note') return MARK(1);
    return MARK(2);
  },
  key(k, u, c): Key {
    const T = (name: string) => u * (CUE_SEQ.find(([q]) => q === name)![1]);
    const n = (cue: number, lit: number, extra: Record<string, number> = {}) => ({ cue, lit, curtain: 1, work: 1, ...extra });
    switch (k) {
      case 'foot':
      case 'top':
      case 'wing':
        return { fig: { sm: 'dnHandsHips' }, n: n(11, 0) };
      case 'mark1':
        // Looks down for the spike tape, shuffles onto it.
        return { nod: 0.45, fig: { sm: 'dnPoint' }, n: n(11, sm(u, 0.2, 0.8), { pool: 0 }) };
      case 'hit1':
        return { d: hold('dnPresent', 'dnReady', sm(u, 0, 0.2)), fig: { sm: 'dnPoint' }, n: n(12, 1, { pool: 0, go: u > 0.25 ? 1 : 0 }) };
      case 'run1':
        return dance('jazzA', T('run1'), { fig: { sm: 'dnArmsCross' }, n: n(12, 1, { pool: 0 }) });
      case 'hold1':
        // Stopped; a hand up against the light to find where it falls.
        return { r: c.bd(-0.1, 0.98 * c.H, 0.22), gr: 0.1, nod: -0.25, fig: { sm: 'dnWave' }, n: n(13, 1, { pool: 0, hold: 1 }) };
      case 'mark2':
        return { nod: 0.45, fig: { sm: 'dnPoint' }, n: n(14, 1, { pool: 1, go: u > 0.4 ? 1 : 0 }) };
      case 'run2':
        return dance('jazzB', T('run2'), { fig: { sm: 'dnArmsCross' }, n: n(14, 1, { pool: 1 }) });
      case 'note':
        return { d: hold('dnHandsHips'), nod: 0.2 * Math.abs(Math.sin(c.t * 3)), fig: { sm: 'dnPoint' }, n: n(15, 1, { pool: 1, hold: 1 }) };
      case 'mark3':
        return { nod: 0.45, fig: { sm: 'dnPoint' }, n: n(16, 1, { pool: 2, go: u > 0.4 ? 1 : 0 }) };
      case 'run3':
        return dance('jazzC', T('run3'), { fig: { sm: 'dnArmsCross' }, n: n(16, 1, { pool: 2 }) });
      case 'thanks':
        return { d: hold('dnWave'), fig: { sm: 'dnWave' }, n: n(17, 1 - 0.5 * u, { pool: 2 }) };
      default:
        return { fig: { sm: 'dnHandsHips' }, n: n(18, 0) };
    }
  },
};

// The show: into the wings in the dark, the curtain, the number under the lights, the bows, flowers.
const SHOW_SEQ: Seq = [...seqUp, ['dark', 1.8, 0.8], ['open', 2.6, 0.3], ['a', secs('showA'), 0.2], ['b', secs('showB'), 0.2], ['c', secs('showC'), 0.2], ['d', secs('showD'), 0.2], ['finish', 2.0, 0.6], ['bow', 2.0, 0.6], ['flowers', 2.6, 0.5], ['bow2', 2.0, 0.6], ['close', 2.2, 0.8], ['off', 0.3, 0.7], ['down', 0.02, 0.9], ['out', 0.2, 0.8]];
const showBody = (inner: Key): Key => ({ ...inner, n: { curtain: 1, lit: 1, house: 1, show: 1, ...inner.n } });
const DNSHOW: Script = {
  seq: SHOW_SEQ,
  at(k) {
    if (k in UP_AT) return steps(k, UP_AT)!;
    if (k === 'dark') return st(CEN.x, DECK, CEN.z, 0);
    return CEN;
  },
  key(k, u, c): Key {
    const T = (name: string) => u * (SHOW_SEQ.find(([q]) => q === name)![1]);
    switch (k) {
      case 'foot':
      case 'top':
      case 'wing':
        return { n: { curtain: 0, lit: 0, house: 1, show: 1 } };
      case 'dark':
        return { d: hold('dnStill'), n: { curtain: 0, lit: 0, house: 1, show: 1 } };
      case 'open':
        return { d: hold('dnStill'), n: { curtain: sm(u, 0, 0.8), lit: sm(u, 0.3, 1), house: 1, show: 1, spot: 1 } };
      case 'a':
        return showBody(dance('showA', T('a'), { n: { spot: 1, fx: 1, cheer: 0 } }));
      case 'b':
        return showBody(dance('showB', T('b'), { n: { spot: 1, fx: 2, cheer: 0 } }));
      case 'c':
        return showBody(dance('showC', T('c'), { n: { spot: 1, fx: 3, cheer: 0 } }));
      case 'd':
        return showBody(dance('showD', T('d'), { n: { spot: 1, fx: 4, cheer: 0 } }));
      case 'finish':
        return { d: hold('dnPresent'), n: { curtain: 1, lit: 1, house: 1, show: 1, spot: 1, fx: 5, cheer: 1 } };
      case 'bow':
        return { d: hold('dnBow', 'dnPresent', Math.sin(Math.PI * u)), n: { curtain: 1, lit: 1, house: 1, show: 1, spot: 1, cheer: 1 } };
      case 'flowers': {
        // A bouquet handed up from the side, taken in the left arm.
        const b = c.bd(0.1, 0.72 * c.H, 0.24);
        const flown = lerpV(SG.bouquet, b, sm(u, 0.05, 0.4));
        return { d: hold('dnReady'), l: u > 0.3 ? add(flown, 0.02, -0.06, 0) : undefined, r: add(flown, -0.08, 0.05, 0), gl: 0.85, gr: 0.75, nod: 0.25, palms: 0.3, props: { flowers: flown }, n: { curtain: 1, lit: 1, house: 1, show: 1, spot: 1, cheer: 1 } };
      }
      case 'bow2':
        return { d: hold('dnCurtsy'), l: c.bd(0.1, 0.5 * c.H, 0.24), gl: 0.85, props: { flowers: c.bd(0.1, 0.56 * c.H, 0.24) }, n: { curtain: 1, lit: 1, house: 1, show: 1, spot: 1, cheer: 1 } };
      case 'close':
        return { d: hold('dnWave'), n: { curtain: 1 - sm(u, 0.3, 1), lit: 1 - sm(u, 0.4, 1), house: 1, show: 1, cheer: 1 - u } };
      default:
        return { n: { curtain: 0, lit: 0, house: 0, show: 1 } };
    }
  },
};

// 솔로 표현력: alone in one pool of light, a phrase, stopped by a note from the 단장; the same phrase, felt.
const SOLO_SEQ: Seq = [...seqUp, ['center', 1.8, 1.4], ['flat', secs('lyricA'), 0.6], ['note', 3.4, 0.8], ['try', 2.6, 0.5], ['felt', secs('lyricA'), 0.3], ['feltB', secs('lyricB'), 0.6], ['still', 2.6, 0.8], ['thanks', 2.0, 1.0], ['off', 0.3, 0.7], ['down', 0.02, 0.9], ['out', 0.2, 0.8]];
const DNSOLO: Script = {
  seq: SOLO_SEQ,
  at(k) {
    if (k in UP_AT) return steps(k, UP_AT)!;
    return CEN;
  },
  key(k, u, c): Key {
    const T = (name: string) => u * (SOLO_SEQ.find(([q]) => q === name)![1]);
    const n = (x: Record<string, number> = {}) => ({ curtain: 1, solo: 1, lit: 0.35, spot: 1, ...x });
    switch (k) {
      case 'foot':
      case 'top':
      case 'wing':
        return { fig: { sm: 'dnArmsCross' }, n: n({ spot: 0 }) };
      case 'center':
        return { d: hold('dnStill'), fig: { sm: 'dnArmsCross' }, n: n() };
      case 'flat':
        return dance('lyricA', T('flat'), { fig: { sm: 'dnArmsCross' }, n: n() });
      case 'note':
        // The director's note: from the heart, not from the arms. A hand to the chest, a nod.
        return { d: hold('dnReady'), l: c.bd(0.05, 0.78 * c.H, 0.14), gl: 0.2, palms: 0.2, nod: 0.25 * Math.abs(Math.sin(c.t * 2)), fig: { sm: 'dnPoint' }, n: n({ talk: 1 }) };
      case 'try':
        return { d: hold('dnStill'), l: c.bd(0.05, 0.78 * c.H, 0.14), r: c.bd(-0.05, 0.74 * c.H, 0.14), gl: 0.2, gr: 0.2, palms: 0.2, nod: 0.3, fig: { sm: 'dnArmsCross' }, n: n() };
      case 'felt':
        return dance('lyricA', T('felt'), { fig: { sm: 'dnArmsCross' }, n: n({ warm: 1 }) });
      case 'feltB':
        return dance('lyricB', T('feltB'), { fig: { sm: 'dnHandsHips' }, n: n({ warm: 1 }) });
      case 'still':
        return { d: hold('dnPresent'), fig: { sm: 'dnClap' }, n: n({ warm: 1 }) };
      case 'thanks':
        return { d: hold('dnCurtsy'), fig: { sm: 'dnClap2' }, n: n({ warm: 0.5 }) };
      default:
        return { fig: { sm: 'dnHandsHips' }, n: n({ spot: 0 }) };
    }
  },
};

// =============================================================================================
// 사운드 데스크 (dnSoundDesk, 2 × 1): the desk's top at 0.84, its faders, a laptop, a tap-tempo pad.

export const SD = {
  top: 0.84,
  laptop: [0.42, 0.86, -0.08] as V,
  fader: [-0.2, 0.87, 0.14] as V,
  pad: [-0.6, 0.88, 0.14] as V,
  play: [0.02, 0.87, 0.16] as V,
  sheet: [0.74, 0.845, 0.2] as V,
  stand: 0.64,
};
const SOUND_SEQ: Seq = [['open', 2.6], ['scrub', 3.6], ['tap', 3.2, 0.3], ['fade', 2.6, 0.3], ['count', 2.0, 0.2], ['play', 1.0, 0.3], ['listen', 6.0], ['cut', 3.2], ['stop', 1.0], ['write', 3.2, 0.7]];
const DNSOUND: Script = {
  seq: SOUND_SEQ,
  at: () => st(0, 0, SD.stand, Math.PI),
  key(k, u, c): Key {
    const beat = Math.floor((c.t % 3600) / COUNT);
    switch (k) {
      case 'open': {
        // The track list scrolled on the laptop.
        const pad: V = add(SD.laptop, 0, -0.02, 0.15);
        return { r: add(pad, 0.04 * Math.sin(c.t * 2), 0, 0), l: add(pad, -0.08, -0.005, 0.02), gr: 0.2, gl: 0.2, tap: u > 0.2, palms: 1, nod: 0.45, lean: 0.14, n: { screen: 1, scrub: u * 0.1 } };
      }
      case 'scrub':
        return { r: add(SD.laptop, 0.07 * Math.sin(u * 6), -0.015, 0.15), gr: 0.2, palms: 1, nod: 0.42, lean: 0.14, n: { screen: 2, scrub: 0.1 + 0.5 * u } };
      case 'tap': {
        // Two fingers on the tempo pad on the beat; the 박자 display settles.
        const hit = ((c.t / COUNT) % 1) < 0.35;
        return { r: add(SD.pad, 0, hit ? 0 : 0.05, 0), gr: 0.25, l: add(SD.fader, 0.25, 0.01, 0), palms: 1, nod: 0.35 + 0.1 * (hit ? 1 : 0), lean: 0.12, n: { screen: 2, bpm: 1, pad: hit ? 1 : 0, settle: u } };
      }
      case 'fade':
        return { r: add(SD.fader, 0.04, 0.012, -0.04 + 0.08 * sm(u, 0.1, 0.8)), l: add(SD.fader, -0.1, 0.012, 0.02), gr: 0.6, gl: 0.6, palms: 1, nod: 0.45, lean: 0.14, n: { screen: 2, bpm: 1, fader: sm(u, 0.1, 0.8) } };
      case 'count':
        return { r: add(SD.play, 0, 0.05, 0), gr: 0.3, l: add(SD.fader, -0.1, 0.012, 0.02), gl: 0.5, palms: 1, nod: 0.1 + 0.15 * Math.abs(Math.sin(c.t * 3.4)), n: { screen: 3, bpm: 1, fader: 1, count: 5 + Math.min(3, Math.floor(u * 4)) } };
      case 'play':
        return { r: add(SD.play, 0, 0.01, 0), gr: 0.3, palms: 1, nod: 0.3, n: { screen: 3, bpm: 1, fader: 1, music: 1, lit: sm(u, 0.3, 0.5), count: 1 } };
      case 'listen':
        // Up straight, marking the counts on the desk edge with the head going.
        return { l: c.bd(0.28, 0.54 * c.H, 0.22 + 0.01 * ((beat % 2) ? 1 : 0)), r: c.bd(-0.2, 0.55 * c.H + 0.02 * Math.abs(Math.sin(c.t * 6.8)), 0.24), gl: 0.3, gr: 0.3, palms: 1, nod: 0.05 + 0.2 * Math.abs(Math.sin(c.t * 3.4)), crouch: 0.06 * Math.abs(Math.sin(c.t * 3.4)), n: { screen: 3, bpm: 1, fader: 1, music: 1, count: (beat % 8) + 1, playhead: u } };
      case 'cut':
        // A cut point marked on the waveform: the eight it should come in on.
        return { r: add(SD.laptop, -0.04 + 0.08 * sm(u, 0.2, 0.7), -0.015, 0.15), gr: 0.2, palms: 1, nod: 0.42, lean: 0.14, n: { screen: 4, bpm: 1, fader: 1, music: 1, count: (beat % 8) + 1, cut: sm(u, 0.2, 0.7) } };
      case 'stop':
        return { r: add(SD.play, 0, 0.01, 0), gr: 0.3, palms: 1, nod: 0.3, n: { screen: 4, bpm: 1, fader: 1, music: 1 - u, cut: 1 } };
      case 'write': {
        const pen = scribble(add(SD.sheet, 0, 0.015, 0), u, 0.08, 4);
        return { r: pen, l: add(SD.sheet, -0.15, 0.012, 0.03), gr: 0.75, gl: 0.3, palms: 1, nod: 0.5, lean: 0.14, props: { pen: add(pen, 0, 0.05, 0) }, n: { screen: 4, bpm: 1, fader: 1, cut: 1, lines: u } };
      }
      default:
        return {};
    }
  },
};

const FREE_SEQ: Seq = [['press', 1.6, 0.8], ['step', 0.3, 0.8], ['grooveA', secs('freeA', 1), 0.2], ['grooveB', secs('freeB', 1), 0.2], ['grooveA2', secs('freeA', 1), 0.2], ['big', secs('jazzC'), 0.2], ['hit', 1.6, 0.8], ['press2', 1.4, 0.8]];
const FREE_AT = st(0, 0, 1.25, Math.PI);
const DNFREE: Script = {
  seq: FREE_SEQ,
  at: (k) => (k === 'press' || k === 'press2' ? st(0, 0, SD.stand, Math.PI) : k === 'step' ? st(0, 0, 1.1, 0) : st(FREE_AT.x, 0, FREE_AT.z, 0)),
  key(k, u, c): Key {
    const T = (name: string) => u * (FREE_SEQ.find(([q]) => q === name)![1]);
    const nn = { screen: 3, bpm: 1, fader: 1, lit: 1 };
    switch (k) {
      case 'press':
        return { r: add(SD.play, 0, 0.012, 0), gr: 0.3, palms: 1, nod: 0.3, n: { screen: 3, bpm: 1, fader: 1, music: sm(u, 0.4, 0.6), lit: sm(u, 0.4, 0.6), count: 1 } };
      case 'step':
        return { n: { ...nn, music: 1, count: 1 } };
      case 'grooveA':
        return dance('freeA', T('grooveA'), { n: nn });
      case 'grooveB':
        return dance('freeB', T('grooveB'), { n: nn });
      case 'grooveA2':
        return dance('freeA', T('grooveA2'), { n: nn });
      case 'big':
        return dance('jazzC', T('big'), { n: nn });
      case 'hit':
        return { d: hold('dnPresent'), nod: 0.1 * Math.sin(c.t * 5), n: { ...nn, music: 1 } };
      case 'press2':
        return { r: add(SD.play, 0, 0.012, 0), gr: 0.3, palms: 1, nod: 0.3, n: { screen: 3, bpm: 1, fader: 1, music: 1 - sm(u, 0.4, 0.6), lit: 1 - sm(u, 0.4, 0.6) } };
      default:
        return {};
    }
  },
};

// =============================================================================================
// 스트레칭 코너 (dnStretchCorner, 2 × 2): a mat, a foam roller, a band and a ball.

export const FC = {
  mat: [0.05, 0.03, 0.05] as V,
  roller: [0.72, 0.075, -0.68] as V,
  band: [-0.72, 0.03, -0.62] as V,
  /** Where the dweller sits on the mat, facing +x. */
  sit: [-0.28, 0.03, 0.08] as V,
};
const MATSIT = st(FC.sit[0], FC.sit[1], FC.sit[2], Math.PI / 2);
const ROLL_SEQ: Seq = [['take', 1.8, 0.9], ['set', 1.4, 1.0], ['calf', 5.4, 1.0], ['calf2', 3.6, 1.1], ['side', 5.0, 1.1], ['back', 5.8, 1.1], ['ball', 3.6, 1.0], ['put', 1.6, 0.9]];
const DNROLL: Script = {
  seq: ROLL_SEQ,
  at(k) {
    if (k === 'take' || k === 'put') return st(0.45, 0.03, -0.1, Math.PI);
    if (k === 'set') return st(0.2, 0.03, 0.12, Math.PI / 2);
    return MATSIT;
  },
  key(k, u, c): Key {
    const roll = 0.5 + 0.5 * Math.sin(c.t * 1.55);
    switch (k) {
      case 'take':
        return { crouch: 0.85 * Math.sin(Math.PI * u), r: lerpV(FC.roller, add(FC.roller, 0, 0.1, 0.25), sm(u, 0.4, 1)), l: lerpV(add(FC.roller, 0.15, 0, 0), add(FC.roller, 0.15, 0.1, 0.25), sm(u, 0.4, 1)), gr: 0.8, gl: 0.8, nod: 0.5, props: { roller: lerpV(FC.roller, add(FC.roller, 0, 0.1, 0.25), sm(u, 0.4, 1)) } };
      case 'set': {
        const to: V = [FC.sit[0] + 0.72, 0.1, FC.sit[2]];
        const p = lerpV(add(FC.roller, 0, 0.1, 0.25), to, sm(u, 0.1, 0.9));
        return { crouch: 0.8 * sm(u, 0.1, 0.8), r: add(p, -0.15, 0.05, 0), l: add(p, 0.15, 0.05, 0), gr: 0.8, gl: 0.8, nod: 0.5, props: { roller: p } };
      }
      case 'calf':
      case 'calf2':
        // Sat back on the hands, the calves on it, the hips pushed along.
        return { d: { ...hold('dnRollCalf'), dz: 0.13 * roll - 0.03, dy: 0.05 }, nod: 0.1 + 0.05 * roll, n: { rolled: 0.86 } };
      case 'side':
        return { d: { ...hold('dnRollSide'), dz: 0.14 * roll - 0.04, dy: 0.02 }, n: { rolled: 0.42 } };
      case 'back':
        // On the back, the roller under the shoulder blades, hands behind the head.
        return { d: { ...hold('dnRollBack'), dz: -0.12 * roll, dy: 0.01 }, n: { rolled: -0.36 } };
      case 'ball':
        // Sat up, the ball under the sole of a foot.
        return { d: hold('dnSitFloor'), nod: 0.3, n: { rolled: 2, ball: 1 } };
      case 'put':
        return { crouch: 0.8 * Math.sin(Math.PI * u), r: add(FC.roller, 0, 0.05, 0), gr: 0.7, nod: 0.4, props: { roller: lerpV(add(FC.roller, 0, 0.1, 0.25), FC.roller, sm(u, 0, 0.7)) } };
      default:
        return {};
    }
  },
};

const SPLIT_SEQ: Seq = [['down', 1.4, 1.2], ['butterfly', 4.0, 1.2], ['straddle', 2.6, 1.1], ['foldF', 4.4, 1.0], ['sideA', 3.2, 1.0], ['sideB', 3.2, 1.0], ['split', 4.6, 1.2], ['band', 4.0, 1.0], ['rise', 1.2, 1.0]];
const DNSPLITS: Script = {
  seq: SPLIT_SEQ,
  at(k) {
    if (k === 'down' || k === 'rise') return st(0.05, 0.03, 0.05, 0);
    return st(0.05, 0.03, 0.05, 0);
  },
  key(k, _u, c): Key {
    const pulse = 0.5 + 0.5 * Math.sin(c.t * 1.3);
    switch (k) {
      case 'down':
      case 'rise':
        return { d: hold('dnReady') };
      case 'butterfly':
        return { d: hold('dnButterfly'), nod: 0.15, n: { flap: Math.sin(c.t * 5) } };
      case 'straddle':
        return { d: hold('dnStraddle'), nod: 0.05 };
      case 'foldF':
        return { d: hold('dnStraddleF', 'dnStraddle', 0.72 + 0.28 * pulse) };
      case 'sideA':
        return { d: hold('dnStraddleS', 'dnStraddle', 0.8 + 0.2 * pulse) };
      case 'sideB':
        return { d: hold(flipKey('dnStraddleS'), 'dnStraddle', 0.8 + 0.2 * pulse) };
      case 'split':
        return { d: { ...hold('dnSplitLow'), dy: 0.02 * pulse } };
      case 'band': {
        // The band hooked round the left foot and drawn in: sat with the leg out.
        const h = c.bd(0.1, 0.32 * c.H - 0.04 * pulse, 0.3);
        return { d: hold('dnSitFloor'), l: add(h, 0.04, 0, 0), r: add(h, -0.04, 0, 0), gl: 0.85, gr: 0.85, nod: 0.28, props: { band: h }, n: { pull: pulse } };
      }
      default:
        return {};
    }
  },
};

// =============================================================================================
// 슈즈·의상 랙 (dnCostumeRack, 2 × 1): a rail of costumes, a shelf of pointe shoes, a stool, a rosin tray.

export const CR = {
  shoes: [-0.56, 0.62, 0.2] as V,
  stool: [-0.3, 0.46, 0.84] as V,
  rosin: [0.5, 0.05, 0.82] as V,
  gown: [0.3, 1.5, 0.05] as V,
  glass: [0.72, 1.28, -0.28] as V,
};
const SHOES_SEQ: Seq = [['take', 1.8, 0.9], ['sit', 1.0, 0.9], ['bend', 4.0], ['on', 2.6], ['ribbon', 4.6], ['tuck', 1.8, 0.9], ['rosin', 3.4, 0.9], ['rise', 3.0, 0.8], ['off', 2.2, 0.9]];
const DNSHOES: Script = {
  seq: SHOES_SEQ,
  at(k) {
    if (k === 'take' || k === 'off') return st(-0.5, 0, 0.72, Math.PI);
    if (k === 'rosin') return st(0.5, 0, 0.74, 0);
    if (k === 'rise') return st(0.1, 0, 1.0, Math.PI / 2);
    return st(CR.stool[0], CR.stool[1], CR.stool[2], 0, { sit: true, floor: 0 });
  },
  key(k, u, c): Key {
    const lap = c.bd(0, 0.16 * c.H, 0.26);
    const foot = c.bd(0.08, 0.08, 0.42);
    switch (k) {
      case 'take':
        return { r: lerpV(add(CR.shoes, 0, 0, 0.05), c.bd(-0.15, 0.75 * c.H, 0.25), sm(u, 0.35, 0.95)), gr: 0.8, nod: 0.25, props: { shoes: lerpV(CR.shoes, c.bd(-0.15, 0.73 * c.H, 0.25), sm(u, 0.35, 0.95)) } };
      case 'sit':
        return { r: add(lap, -0.1, 0.02, 0), gr: 0.8, nod: 0.3, props: { shoes: add(lap, -0.1, 0, 0) } };
      case 'bend': {
        // The shank worked between both hands, the box tapped on the floor once.
        const flex = 0.05 * Math.sin(c.t * 4);
        const at = add(lap, 0, 0.06 + flex * 0.4, 0.05);
        return { l: add(at, 0.09, flex, 0), r: add(at, -0.09, -flex, 0), gl: 0.85, gr: 0.85, nod: 0.5, palms: 0.5, props: { shoeOne: at, shoes: add(c.bd(0.22, 0.03, 0.25), 0, 0.06, 0) }, n: { flex } };
      }
      case 'on':
        return { l: add(foot, 0.08, 0.05, 0), r: add(foot, -0.08, 0.05, 0), gl: 0.85, gr: 0.85, lean: 0.62, nod: 0.45, n: { worn: sm(u, 0.2, 0.8) } };
      case 'ribbon': {
        // The ribbon crossed round the ankle: round one way, round the other.
        const a = u * Math.PI * 6;
        return { l: add(foot, 0.08 * Math.cos(a), 0.1, 0.08 * Math.sin(a)), r: add(foot, -0.08 * Math.cos(a), 0.1, -0.08 * Math.sin(a)), gl: 0.8, gr: 0.8, lean: 0.62, nod: 0.45, n: { worn: 1, ribbon: u } };
      }
      case 'tuck':
        return { r: add(foot, 0.02, 0.12, 0), gr: 0.75, lean: 0.62, nod: 0.45, n: { worn: 1, ribbon: 1 } };
      case 'rosin':
        // Toes scrubbed in the tray.
        return { d: { ...hold('dnHipR'), dx: 0.03 * Math.sin(c.t * 7) }, nod: 0.5, n: { worn: 1, ribbon: 1, dust: u } };
      case 'rise':
        // Up onto the toes, tested.
        return { d: hold('dnBUp', 'dnBFirst', 0.5 - 0.5 * Math.cos(u * Math.PI * 4)), nod: 0.2, n: { worn: 1, ribbon: 1 } };
      case 'off':
        return { r: add(CR.shoes, 0, 0.02, 0.05), gr: 0.3, nod: 0.2 };
      default:
        return {};
    }
  },
};

const COSTUME_SEQ: Seq = [['along', 2.6, 0.8], ['lift', 1.4, 0.8], ['show', 3.6, 0.7], ['turn', 2.4, 0.6], ['pin', 3.6, 0.6], ['write', 2.8, 0.9], ['hang', 1.6, 0.9]];
const DNCOSTUME: Script = {
  seq: COSTUME_SEQ,
  at(k) {
    if (k === 'along') return st(-0.45, 0, 0.72, Math.PI);
    if (k === 'show' || k === 'turn' || k === 'pin' || k === 'write') return st(0.45, 0, 0.95, 0.25);
    return st(0.3, 0, 0.72, Math.PI);
  },
  key(k, u, c): Key {
    const chest = c.bd(0, 0.82 * c.H, 0.18);
    switch (k) {
      case 'along':
        // A hand along the rail, the hangers pushed by.
        return { r: [-0.72 + 1.0 * u, 1.72, 0.03], gr: 0.5, nod: -0.2, n: { push: u } };
      case 'lift':
        return { r: lerpV(CR.gown, chest, sm(u, 0.2, 1)), l: lerpV(add(CR.gown, 0.1, -0.2, 0), add(chest, 0.1, -0.1, 0), sm(u, 0.2, 1)), gr: 0.85, gl: 0.6, nod: 0.05, props: { gown: lerpV(CR.gown, chest, sm(u, 0.2, 1)) } };
      case 'show':
        // Held up to the body, looking in the little mirror.
        return { r: chest, l: add(chest, 0.1, -0.5, 0.03), gr: 0.85, gl: 0.7, nod: -0.05, props: { gown: chest } };
      case 'turn': {
        const a = Math.sin(u * Math.PI * 2) * 0.4;
        return { r: chest, l: add(chest, 0.14 * Math.cos(a), -0.5, 0.05), gr: 0.85, gl: 0.7, nod: 0.1, props: { gown: chest }, n: { swish: a } };
      }
      case 'pin': {
        // The hem taken in, a pin at a time, from the pincushion on the wrist.
        const hem = add(chest, 0.1, -0.42 + 0.08 * Math.sin(u * 12), 0.05);
        return { r: chest, l: add(hem, 0, 0.03, 0), gr: 0.85, gl: 0.7, nod: 0.55, props: { gown: chest, pinned: hem }, n: { pins: Math.floor(u * 4) } };
      }
      case 'write':
        return { r: chest, l: add(chest, 0.2, -0.2, 0.1), gr: 0.85, gl: 0.5, nod: 0.1, props: { gown: chest } };
      case 'hang':
        return { r: lerpV(chest, CR.gown, sm(u, 0, 0.8)), gr: 0.85, nod: 0.05, props: { gown: lerpV(chest, CR.gown, sm(u, 0, 0.8)) } };
      default:
        return {};
    }
  },
};

// =============================================================================================
// 영상 리뷰 벤치 (dnVideoBench, 2 × 1): a bench at z=0.14 facing a screen on a cart... the screen stands at
// the piece's back (-z), the dweller sat on the front edge facing it.

export const VB = {
  seat: [-0.42, 0.45, 0.45] as V,
  mate: [0.42, 0.45, 0.45] as [number, number, number],
  remote: [0.02, 0.47, 0.42] as V,
  tablet: [0.0, 0.48, 0.5] as V,
};
const VIDEO_SEQ: Seq = [['sit', 1.0, 0.8], ['play', 3.6, 0.5], ['watch', 4.2, 0.4], ['pause', 2.2, 0.4], ['draw', 3.8, 0.4], ['mirror', 3.2, 0.4], ['talk', 3.2, 0.4], ['again', 3.0, 0.4], ['note', 3.4, 0.8]];
const DNVIDEO: Script = {
  seq: VIDEO_SEQ,
  at: () => st(VB.seat[0], VB.seat[1], VB.seat[2], Math.PI, { sit: true, floor: 0 }),
  key(k, u, c): Key {
    const rem = c.bd(-0.2, 0.2 * c.H, 0.24);
    const tab = c.bd(0.04, 0.2 * c.H, 0.3);
    switch (k) {
      case 'sit':
        return { n: { v: 0 } };
      case 'play':
        // The remote off the bench, pointed at the screen.
        return { r: lerpV(VB.remote, add(rem, 0, 0.1, 0.1), sm(u, 0, 0.3)), gr: 0.8, nod: 0.02, props: { remote: lerpV(VB.remote, add(rem, 0, 0.1, 0.1), sm(u, 0, 0.3)) }, n: { v: u > 0.3 ? 1 : 0, vt: u * 0.25, mate: 0 } };
      case 'watch':
        // Elbows on knees, chin on a fist.
        return { r: c.bd(-0.03, 0.34 * c.H, 0.22), l: add(rem, 0.28, -0.05, 0.08), gr: 0.75, gl: 0.75, lean: 0.34, nod: -0.25, props: { remote: add(rem, 0.28, -0.05, 0.08) }, n: { v: 1, vt: 0.25 + 0.3 * u, mate: 0 } };
      case 'pause':
        return { r: add(rem, 0, 0.14, 0.12), gr: 0.8, nod: 0.02, props: { remote: add(rem, 0, 0.14, 0.12) }, n: { v: 2, vt: 0.55, mate: 1 } };
      case 'draw': {
        // The tablet on a knee, the frozen frame's line drawn over with a finger.
        const pen = add(tab, -0.05 + 0.1 * u, 0.012, 0.02 * Math.sin(u * 16));
        return { l: add(tab, 0.1, 0, 0), r: pen, gl: 0.85, gr: 0.2, nod: 0.42, palms: 0.8, props: { tablet: tab }, n: { v: 2, vt: 0.55, drawn: u, mate: 1 } };
      }
      case 'mirror':
        // The arm tried, sat down: the angle the frame wants.
        return { r: c.bd(-0.34, 0.52 * c.H, 0.18 + 0.1 * Math.sin(u * 7)), l: add(tab, 0.1, 0, 0), gl: 0.85, gr: 0.2, nod: -0.05, palms: 0.2, props: { tablet: tab }, n: { v: 2, vt: 0.55, drawn: 1, mate: 2 } };
      case 'talk':
        // Turned to the colleague on the bench, a hand at the screen.
        return { r: c.bd(-0.28, 0.42 * c.H, 0.34), l: add(tab, 0.1, 0, 0), gl: 0.85, gr: 0.1, nod: -0.05, palms: 0.2, props: { tablet: tab }, n: { v: 2, vt: 0.55, drawn: 1, mate: 3 } };
      case 'again':
        return { r: add(rem, 0, 0.1, 0.1), gr: 0.8, nod: 0.02, props: { remote: add(rem, 0, 0.1, 0.1) }, n: { v: 1, vt: 0.45 + 0.3 * u, drawn: 1, mate: 0 } };
      case 'note': {
        const pen = scribble(add(tab, -0.02, 0.012, 0.02), u, 0.08, 4);
        return { l: add(tab, 0.1, 0, 0), r: pen, gl: 0.85, gr: 0.75, nod: 0.45, palms: 0.8, props: { tablet: tab, pen: add(pen, 0, 0.05, 0) }, n: { v: 2, vt: 0.75, drawn: 1, written: u, mate: 1 } };
      }
      default:
        return {};
    }
  },
};

// =============================================================================================
// 리프트 매트 (dnLiftMat, 3 × 2): a thick crash mat; the partner (drawn) is carried.

export const LM = {
  top: 0.16,
  base: [-0.05, 0.16, 0.02] as V,
};
const LIFT_SEQ: Seq = [['warm', 2.8, 0.8], ['grip', 1.6, 0.4], ['dip', 0.9, 0.3], ['press', 1.1, 0.3], ['carryA', 1.2, 0.05], ['carryB', 1.2, 0.05], ['carryC', 1.2, 0.05], ['carryD', 1.2, 0.2], ['down', 1.6, 0.4], ['talk', 2.6, 0.5], ['grip2', 1.4, 0.3], ['dip2', 0.8, 0.3], ['press2', 1.0, 0.2], ['tip', 1.0, 0.2], ['spill', 1.6, 0.5], ['help', 2.4, 0.5], ['laugh', 2.0, 0.6]];
const DNLIFT: Script = {
  seq: LIFT_SEQ,
  at: () => st(LM.base[0], LM.top, LM.base[2], Math.PI / 2),
  key(k, u, c): Key {
    const H = c.H / 1.6;
    const y = LM.top;
    // The partner: in front of the base (+x), the hips at the hands.
    const waist = 0.97 * H;
    const hand = (side: number, up: number, ahead: number): V => c.bd(side, up, ahead);
    // She has her back to the base unless she's told otherwise.
    const p = (px: number, py: number, pose: string, yaw = Math.PI / 2): Partial<Key> => ({ n: { px: LM.base[0] + px, py: y + py, pz: LM.base[2], pyaw: yaw, partner: 1 }, fig: { p: pose }, lean: 0, nod: 0.05, gl: 0.8, gr: 0.8, palms: 0.5 });
    switch (k) {
      case 'warm':
        return { ...p(0.75, 0, 'dnHandsHips', -Math.PI / 2), d: hold('dnBaseWait'), nod: 0.1 * Math.sin(c.t * 2) };
      case 'grip':
        return { ...p(0.24, 0, 'dnReady'), d: hold('dnBaseWait'), l: hand(0.13, waist, 0.2), r: hand(-0.13, waist, 0.2), nod: 0.15 };
      case 'dip':
      case 'dip2':
        return { ...p(0.24, 0, 'dnPlie'), d: hold('dnLiftDip'), l: hand(0.13, waist - 0.14, 0.2), r: hand(-0.13, waist - 0.14, 0.2), nod: 0.15 };
      case 'press':
      case 'press2': {
        const up = sm(u, 0, 0.9);
        return { ...p(0.26 - 0.08 * up, 0.05 + 1.45 * up, up > 0.5 ? 'dnFlyFront' : 'dnStar'), d: hold('dnLiftUp', 'dnLiftDip', up), l: hand(0.13, mixN(waist - 0.14, 1.62 * H, up), 0.17), r: hand(-0.13, mixN(waist - 0.14, 1.62 * H, up), 0.17), nod: -0.15 };
      }
      case 'carryA':
      case 'carryB':
      case 'carryC':
      case 'carryD': {
        // Held overhead, walked round slowly in a little circle.
        const a = { carryA: 0, carryB: 1, carryC: 2, carryD: 3 }[k] + u;
        const ang = (a / 4) * Math.PI * 2;
        const x = 0.2 * Math.sin(ang);
        const z = 0.2 * (1 - Math.cos(ang));
        const pose = Math.floor(a * 2) % 2 ? 'dnLiftWalkA' : 'dnLiftWalkB';
        const px = 0.18 * Math.cos(ang) + x;
        const pz = 0.18 * Math.sin(ang) + z;
        const yaw = Math.PI / 2 - ang;
        const fx = Math.sin(yaw);
        const fz = Math.cos(yaw);
        const lx = Math.cos(yaw);
        const lz = -Math.sin(yaw);
        const base: V = [LM.base[0] + x, y, LM.base[2] + z];
        const hd = (s: number): V => [base[0] + lx * s + fx * 0.17, y + 1.62 * H, base[2] + lz * s + fz * 0.17];
        return {
          d: { ...hold(pose, pose === 'dnLiftWalkA' ? 'dnLiftWalkB' : 'dnLiftWalkA', frac(a * 2)), dx: -z, dz: x, turn: -ang },
          l: hd(0.13), r: hd(-0.13), gl: 0.8, gr: 0.8, palms: 0.5, nod: -0.15,
          n: { px: LM.base[0] + px, py: y + 1.5, pz: LM.base[2] + pz, pyaw: yaw, partner: 1 },
          fig: { p: 'dnFlyFront' },
        };
      }
      case 'down': {
        const dn = sm(u, 0, 0.85);
        return { ...p(0.18 + 0.06 * dn, 1.5 * (1 - dn) + 0.05, dn > 0.5 ? 'dnPlie' : 'dnFlyFront'), d: hold('dnLiftDip', 'dnLiftUp', dn), l: hand(0.13, mixN(1.62 * H, waist - 0.14, dn), 0.18), r: hand(-0.13, mixN(1.62 * H, waist - 0.14, dn), 0.18), nod: -0.05 };
      }
      case 'talk':
        return { ...p(0.75, 0, 'dnPoint', -Math.PI / 2), d: hold('dnHandsHips'), nod: 0.18 * Math.abs(Math.sin(c.t * 3)) };
      case 'grip2':
        return { ...p(0.24, 0, 'dnReady'), d: hold('dnBaseWait'), l: hand(0.13, waist, 0.2), r: hand(-0.13, waist, 0.2), nod: 0.15 };
      case 'tip': {
        // Off balance: she tips forward over the far side.
        const w = sm(u, 0, 1);
        return { ...p(0.18 + 0.5 * w, 1.5 - 0.6 * w, 'dnFlyFront'), d: hold('dnLiftWalkA'), l: hand(0.13, (1.62 - 0.3 * w) * H, 0.17 + 0.12 * w), r: hand(-0.13, (1.62 - 0.3 * w) * H, 0.17 + 0.12 * w), nod: -0.15 };
      }
      case 'spill':
        // Down on the mat, safe; the base lunging after her.
        return { ...p(0.92, 0, 'dnSpillA'), d: hold('dnPrep'), nod: 0.2, };
      case 'help':
        // A hand held out and she's pulled up.
        return { ...p(0.72, 0, u > 0.5 ? 'dnReady' : 'dnSpillA', -Math.PI / 2), r: hand(-0.12, (0.45 + 0.35 * sm(u, 0.3, 0.8)) * c.H, 0.4), l: undefined, gr: 0.85, d: hold('dnBaseWait'), nod: 0.25 };
      case 'laugh':
        return { ...p(0.72, 0, (c.t * 3) % 1 < 0.5 ? 'dnClap' : 'dnClap2', -Math.PI / 2), d: hold((c.t * 3) % 1 < 0.5 ? 'dnClap' : 'dnClap2'), nod: -0.05 };
      default:
        return p(0.75, 0, 'dnReady');
    }
  },
};

const SCRIPTS: Record<DnMotion, Script> = {
  dnPhrase: DNPHRASE, dnDraft: DNDRAFT, dnLead: DNLEAD,
  dnBarre: DNBARRE, dnBarreStretch: DNBARRESTRETCH,
  dnCue: DNCUE, dnShow: DNSHOW, dnSolo: DNSOLO,
  dnSound: DNSOUND, dnFree: DNFREE,
  dnRoll: DNROLL, dnSplits: DNSPLITS,
  dnShoes: DNSHOES, dnCostume: DNCOSTUME,
  dnVideo: DNVIDEO,
  dnLift: DNLIFT,
};

/** One round of a motion, seconds (for the piece's own clocks). */
export const roundOf = (m: DnMotion) => SCRIPTS[m].seq.reduce((s, [, h, mv = 0.5]) => s + h + mv, 0);
/** The stage's audience (the house seats are a piece apart): how the show is going, set each frame by the stage. */
export const STAGE_NOW = { show: 0, cheer: 0, t: -1e9 };
export { secsOf };
