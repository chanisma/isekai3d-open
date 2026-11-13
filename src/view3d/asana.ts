import type { VRMHumanBoneName } from '@pixiv/three-vrm';

/**
 * Yoga and Pilates poses for the VRoid body (2026-10-27, the 요가·필라테스 스튜디오, at the user's
 * request: real asanas on the mat, a class taught, the reformer worked). Each asana is a whole-body
 * pose: where the hips are from the place it's done at (the middle of a mat, the reformer's carriage;
 * +z the way the body faces, model units) and the turn of each bone. The angles were solved offline
 * (two-bone reaches for the hands and feet on a VRoid adult: hands planted on the mat, the feet flat)
 * and the body is set down on whatever it's done on (avatar.ts: the lowest of the feet, knees, hands,
 * seat or back rests on it), so smaller or bigger bodies don't sink in or float. A flow strings
 * asanas together, each held and then eased into the next (avatar.ts blends the turns): the sun
 * salutation taught facing the class, a seated stretch, a reformer session whose carriage runs in
 * step with the legs pressing out (workplaces/yogaInstructor.ts moves it by reformerPush).
 */

type E3 = [number, number, number];
export interface Asana {
  /** The hips from the place it's done at: across (+x the body's left), up, ahead. */
  hip: E3;
  bones: Partial<Record<VRMHumanBoneName, E3>>;
  /** Lying on a reformer's carriage with the feet on its footbar (the legs reach for the bar). */
  bar?: boolean;
}

export type AsanaKey =
  | 'mountain' | 'prayer' | 'salute' | 'cue' | 'warrior2' | 'triangle' | 'tree'
  | 'mountainS' | 'saluteS' | 'prayerS' | 'fold' | 'halfLift' | 'plank' | 'dog' | 'lunge' | 'child'
  | 'crossed' | 'crossCue' | 'sideL' | 'sideR' | 'twist' | 'seatedFold'
  | 'supine' | 'bridge' | 'hundredUp' | 'hundredDown';

/**
 * Facing the front: 산 자세 (mountain), 합장 (prayer), upward salute, a cue to the class (a hand opened
 * out to them), 전사 2 (warrior II, the gaze over the left hand), 삼각 (triangle), 나무 (tree). Along the
 * mat (the S ones stand at its front end): forward fold, half lift, plank, 다운독, low lunge, child's
 * pose. Sat cross-legged: hands on the knees, a cue, side bends, a twist; the seated forward fold.
 * On the back: footwork (the feet on the bar), the bridge, the hundred (the arms beating).
 */
export const ASANAS: Record<AsanaKey, Asana> = {
  mountain: { hip: [0, 0.91, 0], bones: { leftUpperLeg: [-0.016, 0, 0.004], rightUpperLeg: [-0.016, 0, -0.004], leftLowerLeg: [0.032, 0, 0], rightLowerLeg: [0.032, 0, 0], leftFoot: [-0.019, 0, -0.004], rightFoot: [-0.019, 0, 0.004], leftUpperArm: [0, 0, -1.25], rightUpperArm: [0, 0, 1.25], leftLowerArm: [0, -0.15, 0], rightLowerArm: [0, 0.15, 0], leftHand: [0, 0, -0.1], rightHand: [0, 0, 0.1] } },
  prayer: { hip: [0, 0.91, 0], bones: { neck: [0.05, 0, 0], head: [0.08, 0, 0], leftUpperLeg: [-0.016, 0, 0.004], rightUpperLeg: [-0.016, 0, -0.004], leftLowerLeg: [0.032, 0, 0], rightLowerLeg: [0.032, 0, 0], leftFoot: [-0.019, 0, -0.004], rightFoot: [-0.019, 0, 0.004], leftUpperArm: [0.221, -0.87, -0.876], rightUpperArm: [0.221, 0.87, 0.876], leftLowerArm: [1.941, -1.214, 1.964], rightLowerArm: [1.941, 1.214, -1.964], leftHand: [0.439, -0.608, 1.237], rightHand: [0.439, 0.608, -1.237] } },
  salute: { hip: [0, 0.91, 0.01], bones: { spine: [-0.06, 0, 0], chest: [-0.1, 0, 0], neck: [-0.12, 0, 0], head: [-0.2, 0, 0], leftLowerLeg: [0.032, 0, 0], rightLowerLeg: [0.032, 0, 0], leftFoot: [-0.033, 0, -0.004], rightFoot: [-0.033, 0, 0.004], leftUpperArm: [3.134, 0, -1.405], rightUpperArm: [3.134, 0, 1.405], leftLowerArm: [0.109, 0, 0], rightLowerArm: [0.109, 0, 0], leftHand: [0.002, 0.06, -0.073], rightHand: [0.002, -0.06, 0.073] } },
  cue: { hip: [0, 0.91, 0], bones: { neck: [0, -0.1, 0], head: [-0.03, -0.1, 0], leftUpperLeg: [-0.016, 0, 0.017], rightUpperLeg: [-0.042, 0, 0.009], leftLowerLeg: [0.032, 0, 0], rightLowerLeg: [0.032, 0, 0], leftFoot: [-0.019, 0, -0.017], rightFoot: [0.007, 0, -0.009], leftUpperArm: [0.393, -0.761, -0.916], rightUpperArm: [-0.664, 0.627, 1.054], leftLowerArm: [-0.927, -1.237, -0.9], rightLowerArm: [-1.741, -0.007, 0.042], leftHand: [-0.229, -0.534, -0.797], rightHand: [-0.063, 0.294, 0.421] } },
  warrior2: { hip: [-0.08, 0.6, 0], bones: { neck: [0, 0.6, 0], head: [0, 0.65, 0], leftUpperLeg: [-1.58, 0.124, 1.56], rightUpperLeg: [-0.319, 0.114, -0.913], leftLowerLeg: [1.392, 0, 0], rightLowerLeg: [0.53, 0, 0], leftFoot: [0.052, -0.039, 0.011], rightFoot: [-0.49, 0.354, 0.971], leftUpperArm: [0, 0, -0.067], rightUpperArm: [0, 0, 0.067], leftHand: [0, 0, 0.067], rightHand: [0, 0, -0.067] } },
  triangle: { hip: [-0.08, 0.75, 0], bones: { hips: [0, 0, -0.55], spine: [0, -0.06, -0.4], chest: [0, -0.1, -0.35], neck: [0.05, -0.55, 0], head: [-0.1, -0.5, 0], leftUpperLeg: [-0.107, -0.295, 1.215], rightUpperLeg: [-0.016, 0.001, -0.056], leftLowerLeg: [0.556, 0, 0], rightLowerLeg: [0.032, 0, 0], leftFoot: [1.248, 0.891, -1.509], rightFoot: [-0.188, 0.236, 0.627], leftUpperArm: [-0.073, 0.104, 0.089], rightUpperArm: [-1.684, 0.262, 0.143], leftLowerArm: [-0.014, -0.043, -0.001], leftHand: [0.014, 0.077, -0.353] } },
  tree: { hip: [-0.03, 0.91, 0], bones: { leftUpperLeg: [-1.615, 0.65, 1.335], rightUpperLeg: [-0.111, -0.005, 0.048], leftLowerLeg: [2.107, 0, 0], rightLowerLeg: [0.208, 0, 0], leftFoot: [0.016, 0.051, 0.029], rightFoot: [-0.1, 0, -0.048], leftUpperArm: [1.52, -1.456, 3.022], rightUpperArm: [1.567, 1.385, -3.069], leftLowerArm: [-1.579, 0, -0.043], rightLowerArm: [-1.577, 0, 0.043], leftHand: [0.005, -0.069, 0.157], rightHand: [0.008, 0.068, -0.229] } },
  mountainS: { hip: [0, 0.91, 0.3], bones: { leftUpperLeg: [-0.016, 0, 0.004], rightUpperLeg: [-0.016, 0, -0.004], leftLowerLeg: [0.032, 0, 0], rightLowerLeg: [0.032, 0, 0], leftFoot: [-0.019, 0, -0.004], rightFoot: [-0.019, 0, 0.004], leftUpperArm: [0, 0, -1.25], rightUpperArm: [0, 0, 1.25], leftLowerArm: [0, -0.15, 0], rightLowerArm: [0, 0.15, 0], leftHand: [0, 0, -0.1], rightHand: [0, 0, 0.1] } },
  saluteS: { hip: [0, 0.91, 0.31], bones: { spine: [-0.06, 0, 0], chest: [-0.1, 0, 0], neck: [-0.12, 0, 0], head: [-0.2, 0, 0], leftLowerLeg: [0.032, 0, 0], rightLowerLeg: [0.032, 0, 0], leftFoot: [-0.033, 0, -0.004], rightFoot: [-0.033, 0, 0.004], leftUpperArm: [3.134, 0, -1.405], rightUpperArm: [3.134, 0, 1.405], leftLowerArm: [0.109, 0, 0], rightLowerArm: [0.109, 0, 0], leftHand: [0.002, 0.06, -0.073], rightHand: [0.002, -0.06, 0.073] } },
  prayerS: { hip: [0, 0.91, 0.3], bones: { neck: [0.05, 0, 0], head: [0.08, 0, 0], leftUpperLeg: [-0.016, 0, 0.004], rightUpperLeg: [-0.016, 0, -0.004], leftLowerLeg: [0.032, 0, 0], rightLowerLeg: [0.032, 0, 0], leftFoot: [-0.019, 0, -0.004], rightFoot: [-0.019, 0, 0.004], leftUpperArm: [0.221, -0.87, -0.876], rightUpperArm: [0.221, 0.87, 0.876], leftLowerArm: [1.941, -1.214, 1.964], rightLowerArm: [1.941, 1.214, -1.964], leftHand: [0.439, -0.608, 1.237], rightHand: [0.439, 0.608, -1.237] } },
  fold: { hip: [0, 0.85, 0.2], bones: { hips: [1.5, 0, 0], spine: [0.55, 0, 0], chest: [0.5, 0, 0], neck: [0.2, 0, 0], head: [0.1, 0, 0], leftUpperLeg: [-1.868, -0.001, 0.004], rightUpperLeg: [-1.868, 0.001, -0.004], leftLowerLeg: [0.337, 0, 0], rightLowerLeg: [0.337, 0, 0], leftFoot: [0.028, 0, -0.004], rightFoot: [0.028, 0, 0.004], leftUpperArm: [-2.229, -0.281, -1.493], rightUpperArm: [-2.229, 0.281, 1.493], leftLowerArm: [1.3, -0.098, 0.339], rightLowerArm: [1.3, 0.098, -0.339], leftHand: [-0.003, 0.025, 0.253], rightHand: [-0.003, -0.025, -0.253] } },
  halfLift: { hip: [0, 0.86, 0.2], bones: { hips: [1.45, 0, 0], spine: [0.05, 0, 0], neck: [-0.35, 0, 0], head: [-0.2, 0, 0], leftUpperLeg: [-1.65, -0.001, 0.004], rightUpperLeg: [-1.65, 0.001, -0.004], leftLowerLeg: [0.032, 0, 0], rightLowerLeg: [0.032, 0, 0], leftFoot: [0.164, 0, -0.004], rightFoot: [0.164, 0, 0.004], leftUpperArm: [-0.221, -1.559, -0.782], rightUpperArm: [-0.221, 1.559, 0.782], leftHand: [0.008, -0.009, 1.521], rightHand: [0.008, 0.009, -1.521] } },
  plank: { hip: [0, 0.33, 0.13], bones: { hips: [1.211, 0, 0], neck: [-0.15, 0, 0], head: [-0.05, 0, 0], leftUpperLeg: [-0.28, 0.006, -0.008], rightUpperLeg: [-0.28, -0.006, 0.008], leftLowerLeg: [0.799, 0, 0], rightLowerLeg: [0.799, 0, 0], leftFoot: [-1.054, -0.008, 0.006], rightFoot: [-1.054, 0.008, -0.006], leftUpperArm: [-1.211, -0.481, -1.458], rightUpperArm: [-1.211, 0.481, 1.458], leftLowerArm: [0.992, 0, 0], rightLowerArm: [0.992, 0, 0], leftHand: [0.095, -0.1, 1.518], rightHand: [0.095, 0.1, -1.518] } },
  dog: { hip: [0, 0.68, 0.06], bones: { hips: [2.482, 0, 0], neck: [0.05, 0, 0], head: [0.05, 0, 0], leftUpperLeg: [-1.798, 0.013, 0.017], rightUpperLeg: [-1.798, -0.013, -0.017], leftLowerLeg: [0.032, 0, 0], rightLowerLeg: [0.032, 0, 0], leftFoot: [-0.72, 0, -0.021], rightFoot: [-0.72, 0, 0.021], leftUpperArm: [-1.545, -1.298, 0], rightUpperArm: [-1.545, 1.298, 0], leftLowerArm: [0.046, -0.357, 0.016], rightLowerArm: [0.046, 0.357, -0.016], leftHand: [-0.043, 0.085, 0.937], rightHand: [-0.043, -0.085, -0.937] } },
  lunge: { hip: [0, 0.5, -0.05], bones: { hips: [0.12, 0, 0], spine: [-0.05, 0, 0], chest: [-0.05, 0, 0], neck: [-0.05, 0, 0], leftUpperLeg: [0.353, -0.036, 0.018], rightUpperLeg: [-1.798, 0.03, -0.025], leftLowerLeg: [0.89, 0, 0], rightLowerLeg: [1.377, 0, 0], leftFoot: [1.018, -0.029, -0.028], rightFoot: [0.298, 0.028, 0.028], leftUpperArm: [-3.024, 0, -1.367], rightUpperArm: [-3.024, 0, 1.367], leftHand: [-0.004, -0.038, -0.204], rightHand: [-0.004, 0.038, 0.204] } },
  child: { hip: [0, 0.3, -0.42], bones: { hips: [1.772, 0, 0], spine: [0.12, 0, 0], chest: [0.12, 0, 0], neck: [0.05, 0, 0], head: [0.1, 0, 0], leftUpperLeg: [-2.742, -0.077, 0.052], rightUpperLeg: [-2.742, 0.077, -0.052], leftLowerLeg: [2.424, 0, 0], rightLowerLeg: [2.424, 0, 0], leftFoot: [0.978, -0.061, 0.07], rightFoot: [0.978, 0.061, -0.07], leftUpperArm: [-2.012, -1.459, -0.223], rightUpperArm: [-2.012, 1.459, 0.223], leftLowerArm: [0.013, 0, 0], rightLowerArm: [0.013, 0, 0], leftHand: [0.012, -0.109, 0.224], rightHand: [0.012, 0.109, -0.224] } },
  crossed: { hip: [0, 0.15, -0.05], bones: { spine: [0.02, 0, 0], neck: [0.04, 0, 0], head: [0.06, 0, 0], leftUpperLeg: [-2.754, 0.775, 0.827], rightUpperLeg: [-2.778, -0.88, -0.773], leftLowerLeg: [2.157, 0, 0], rightLowerLeg: [2.383, 0, 0], leftFoot: [1.078, -0.053, -0.711], rightFoot: [0.786, -0.028, 0.787], leftUpperArm: [0.162, -1.016, -0.685], rightUpperArm: [0.162, 1.016, 0.685], leftLowerArm: [0.061, -0.043, 0.003], rightLowerArm: [0.061, 0.043, -0.003], leftHand: [0.069, -0.197, 0.673], rightHand: [0.069, 0.197, -0.673] } },
  crossCue: { hip: [0, 0.15, -0.05], bones: { spine: [0.02, 0, 0], neck: [0, -0.1, 0], head: [-0.02, -0.1, 0], leftUpperLeg: [-2.754, 0.775, 0.827], rightUpperLeg: [-2.778, -0.88, -0.773], leftLowerLeg: [2.157, 0, 0], rightLowerLeg: [2.383, 0, 0], leftFoot: [1.078, -0.053, -0.711], rightFoot: [0.786, -0.028, 0.787], leftUpperArm: [0.162, -1.016, -0.685], rightUpperArm: [-0.711, 0.477, 0.913], leftLowerArm: [0.061, -0.043, 0.003], rightLowerArm: [-1.597, -0.015, 0.525], leftHand: [0.069, -0.197, 0.673], rightHand: [-0.008, 0.162, 0.103] } },
  sideL: { hip: [0, 0.15, -0.05], bones: { spine: [0, 0, -0.25], chest: [0, 0, -0.3], neck: [0, 0, -0.1], head: [0, 0.15, 0], leftUpperLeg: [-2.754, 0.775, 0.827], rightUpperLeg: [-2.778, -0.88, -0.773], leftLowerLeg: [2.157, 0, 0], rightLowerLeg: [2.383, 0, 0], leftFoot: [1.078, -0.053, -0.711], rightFoot: [0.786, -0.028, 0.787], leftUpperArm: [1.027, -0.415, -0.307], rightUpperArm: [-3.142, 0, 1.937], leftLowerArm: [-0.988, -0.355, -0.485], leftHand: [-0.22, 0.217, 1.585], rightHand: [0, 0, -0.067] } },
  sideR: { hip: [0, 0.15, -0.05], bones: { spine: [0, 0, 0.25], chest: [0, 0, 0.3], neck: [0, 0, 0.1], head: [0, -0.15, 0], leftUpperLeg: [-2.754, 0.775, 0.827], rightUpperLeg: [-2.778, -0.88, -0.773], leftLowerLeg: [2.157, 0, 0], rightLowerLeg: [2.383, 0, 0], leftFoot: [1.078, -0.053, -0.711], rightFoot: [0.786, -0.028, 0.787], leftUpperArm: [-3.142, 0, -1.937], rightUpperArm: [1.027, 0.415, 0.307], rightLowerArm: [-0.988, 0.355, 0.485], leftHand: [0, 0, 0.067], rightHand: [-0.22, -0.217, -1.585] } },
  twist: { hip: [0, 0.15, -0.05], bones: { spine: [0, -0.3, 0], chest: [0, -0.35, 0], neck: [0, -0.35, 0], head: [0, -0.3, 0], leftUpperLeg: [-2.754, 0.775, 0.827], rightUpperLeg: [-2.778, -0.88, -0.773], leftLowerLeg: [2.157, 0, 0], rightLowerLeg: [2.383, 0, 0], leftFoot: [1.078, -0.053, -0.711], rightFoot: [0.786, -0.028, 0.787], leftUpperArm: [-1.367, -1.019, -2.161], rightUpperArm: [0.826, 0.95, 0.861], leftLowerArm: [0.405, -0.04, 0.017], rightLowerArm: [-1.892, -0.014, 0.041], leftHand: [-0.202, 0.595, 0.637], rightHand: [-0.114, -0.165, -1.205] } },
  seatedFold: { hip: [0, 0.15, -0.35], bones: { hips: [0.75, 0, 0], spine: [0.3, 0, 0], chest: [0.3, 0, 0], neck: [0.15, 0, 0], head: [0.1, 0, 0], leftUpperLeg: [-2.288, 0.001, 0.016], rightUpperLeg: [-2.288, -0.001, -0.016], leftLowerLeg: [0.032, 0, 0], rightLowerLeg: [0.032, 0, 0], leftFoot: [0.449, -0.008, -0.014], rightFoot: [0.449, 0.008, 0.014], leftUpperArm: [-2.533, 0, -1.57], rightUpperArm: [-2.533, 0, 1.57], leftHand: [0, -0.388, -0.001], rightHand: [0, 0.388, 0.001] } },
  supine: { bar: true, hip: [0, 0.1, 0], bones: { hips: [-1.571, 0, 0], neck: [0.12, 0, 0], head: [0.06, 0, 0], leftUpperLeg: [-1.232, -0.024, 0.008], rightUpperLeg: [-1.232, 0.024, -0.008], leftLowerLeg: [1.56, 0, 0], rightLowerLeg: [1.56, 0, 0], leftFoot: [-0.745, 0.01, -0.023], rightFoot: [-0.745, -0.01, 0.023], leftUpperArm: [1.687, -1.058, 0], rightUpperArm: [1.687, 1.058, 0], leftLowerArm: [-0.001, -0.498, 0], rightLowerArm: [-0.001, 0.498, 0], leftHand: [0.001, -0.014, 0.116], rightHand: [0.001, 0.014, -0.116] } },
  bridge: { bar: true, hip: [0, 0.33, 0], bones: { hips: [-2.003, 0, 0], spine: [-0.08, 0, 0], chest: [-0.12, 0, 0], neck: [0.6, 0, 0], head: [0.2, 0, 0], leftUpperLeg: [-0.492, -0.04, 0.03], rightUpperLeg: [-0.492, 0.04, -0.03], leftLowerLeg: [1.843, 0, 0], rightLowerLeg: [1.843, 0, 0], leftFoot: [-1.334, 0.02, -0.045], rightFoot: [-1.334, -0.02, 0.045], leftUpperArm: [2.377, -1.069, 0], rightUpperArm: [2.377, 1.069, 0], leftLowerArm: [0.007, -0.571, 0.004], rightLowerArm: [0.007, 0.571, -0.004], leftHand: [-0.006, 0.069, 0.174], rightHand: [-0.006, -0.069, -0.174] } },
  hundredUp: { hip: [0, 0.1, 0], bones: { hips: [-1.571, 0, 0], spine: [0.15, 0, 0], chest: [0.35, 0, 0], neck: [0.35, 0, 0], head: [0.15, 0, 0], leftUpperLeg: [-1.724, 0.011, -0.008], rightUpperLeg: [-1.724, -0.011, 0.008], leftLowerLeg: [1.651, 0, 0], rightLowerLeg: [1.651, 0, 0], leftFoot: [0.93, 0.013, -0.001], rightFoot: [0.93, -0.013, 0.001], leftUpperArm: [1.071, -1.36, 0.086], rightUpperArm: [1.071, 1.36, -0.086], leftLowerArm: [-0.009, 0, 0], rightLowerArm: [-0.009, 0, 0], leftHand: [-0.009, -0.21, -0.088], rightHand: [-0.009, 0.21, 0.088] } },
  hundredDown: { hip: [0, 0.1, 0], bones: { hips: [-1.571, 0, 0], spine: [0.15, 0, 0], chest: [0.35, 0, 0], neck: [0.35, 0, 0], head: [0.15, 0, 0], leftUpperLeg: [-1.724, 0.011, -0.008], rightUpperLeg: [-1.724, -0.011, 0.008], leftLowerLeg: [1.651, 0, 0], rightLowerLeg: [1.651, 0, 0], leftFoot: [0.93, 0.013, -0.001], rightFoot: [0.93, -0.013, 0.001], leftUpperArm: [1.071, -1.36, -0.078], rightUpperArm: [1.071, 1.36, 0.078], leftLowerArm: [0.008, 0, 0], rightLowerArm: [0.008, 0, 0], leftHand: [0.008, -0.21, 0.08], rightHand: [0.008, 0.21, -0.08] } },
};

/** Which way an asana is done, from the way the place faces (0 facing that way, -π/2 along a mat). */
export interface AsanaStep {
  key: AsanaKey;
  turn: number;
}

interface Beat {
  k: AsanaKey;
  /** Seconds held, then seconds easing into the next. */
  hold: number;
  move: number;
  /** Done along the mat (side on to the class). */
  along?: boolean;
  /** Pressing the carriage out and in (the reformer's footwork). */
  press?: boolean;
  /** Eyes shut (resting in child's pose). */
  shut?: boolean;
}
const b = (k: AsanaKey, hold: number, move: number, o: Partial<Beat> = {}): Beat => ({ k, hold, move, ...o });
const along = { along: true };
const press = { press: true };

export type AsanaFlow = 'yogaLead' | 'yogaClass' | 'yogaStretch' | 'yogaPlan' | 'yogaMirror' | 'reformer' | 'reformerRehab';

/** The hundred: the arms beaten up and down. */
const HUNDRED: Beat[] = Array.from({ length: 12 }, (_, i) => b(i % 2 ? 'hundredDown' : 'hundredUp', 0.12, 0.26));

const FLOWS: Record<AsanaFlow, Beat[]> = {
  /**
   * Leading a class (about 85 s round): palms together and a word to the room, then the sun
   * salutation shown side on (arms up, fold, half lift, back to plank, 다운독, a lunge, back up), then
   * turned to the class for warrior II into triangle, and tree.
   */
  yogaLead: [
    b('prayer', 4, 1.2), b('cue', 3, 1.3), b('prayerS', 1.5, 1.3, along), b('saluteS', 2.5, 1.4, along), b('fold', 3, 1.4, along), b('halfLift', 2, 1.2, along),
    b('fold', 1, 1.5, along), b('plank', 2.5, 1.6, along), b('dog', 6, 1.6, along), b('lunge', 3.5, 1.6, along), b('dog', 2, 1.6, along), b('fold', 2, 1.6, along),
    b('saluteS', 2.5, 1.4, along), b('prayerS', 1, 1.5, along), b('warrior2', 6, 1.8), b('triangle', 5, 1.8), b('warrior2', 2, 1.6), b('mountain', 1.5, 1.3),
    b('tree', 6, 1.6), b('cue', 3, 1.3),
  ],
  /** Following a class (assisting at it): the same salutation, with a rest in child's pose. */
  yogaClass: [
    b('prayerS', 3, 1.3, along), b('saluteS', 2.5, 1.4, along), b('fold', 3, 1.4, along), b('halfLift', 2, 1.2, along), b('fold', 1, 1.5, along),
    b('plank', 2.5, 1.6, along), b('dog', 6, 1.8, along), b('child', 6, 2, { along: true, shut: true }), b('dog', 2, 1.6, along), b('fold', 2, 1.6, along),
    b('saluteS', 2.5, 1.4, along), b('prayerS', 2, 1.6, along), b('warrior2', 6, 1.8), b('mountain', 1.5, 1.3), b('tree', 6, 1.6), b('prayer', 3, 1.6),
  ],
  /** A seated stretch, talked through: side bends either way, a twist, a forward fold, child's pose. */
  yogaStretch: [
    b('crossed', 4, 1.2), b('crossCue', 3, 1.3), b('sideL', 4, 1.6), b('crossed', 1, 1.5), b('sideR', 4, 1.6), b('crossed', 1, 1.4), b('twist', 4, 1.6),
    b('crossCue', 3, 1.8), b('seatedFold', 5, 2, along), b('child', 6, 2.2, { along: true, shut: true }), b('crossed', 2, 2.2),
  ],
  /** Sat cross-legged with a notebook (planning the memberships). */
  yogaPlan: [b('crossed', 600, 1)],
  /** At the mirror, checking the line of the standing poses. */
  yogaMirror: [b('mountain', 2, 1.3), b('warrior2', 5, 1.8), b('triangle', 4, 1.8), b('warrior2', 1.5, 1.5), b('mountain', 1, 1.3), b('tree', 5, 1.6), b('prayer', 2, 1.3)],
  /** A reformer session: footwork pressing the carriage out and in, the hundred, a bridge. */
  reformer: [b('supine', 13, 1.5, press), ...HUNDRED, b('hundredUp', 0.2, 1.5), b('supine', 7, 1.8, press), b('bridge', 4, 1.8), b('supine', 1, 1.5)],
  /** Rehab: slow footwork and bridges held. */
  reformerRehab: [b('supine', 12, 2, press), b('bridge', 5, 2.2), b('supine', 2, 2), b('bridge', 5, 2.2), b('supine', 8, 2, press)],
};

/** How long a press out and back takes on the reformer, seconds. */
const PRESS: Record<AsanaFlow, number> = { yogaLead: 0, yogaClass: 0, yogaStretch: 0, yogaPlan: 0, yogaMirror: 0, reformer: 3.2, reformerRehab: 5 };

export const isAsanaFlow = (m: string): m is AsanaFlow => m in FLOWS;

const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const ALONG = -Math.PI / 2;

/**
 * Where a flow is at time `t` (seconds; `phase` 0–1 puts places out of step): the asana it's in or
 * coming from, the one it's going to and how far (eased), how hard the carriage is being pressed
 * (0–1, eased in and out) and whether the eyes are shut.
 */
export function asanaBeat(flow: AsanaFlow, t: number, phase = 0): { from: AsanaStep; to: AsanaStep; e: number; press: number; shut: boolean } {
  const beats = FLOWS[flow];
  const total = beats.reduce((s, x) => s + x.hold + x.move, 0);
  const step = (x: Beat): AsanaStep => ({ key: x.k, turn: x.along ? ALONG : 0 });
  let u = (((t + phase * total) % total) + total) % total;
  for (let i = 0; i < beats.length; i++) {
    const k = beats[i];
    const n = beats[(i + 1) % beats.length];
    if (u < k.hold) return { from: step(k), to: step(k), e: 0, press: k.press ? 1 : 0, shut: !!k.shut };
    u -= k.hold;
    if (u < k.move) {
      const e = smooth(u / k.move);
      return { from: step(k), to: step(n), e, press: (k.press ? 1 - e : 0) + (n.press ? e : 0), shut: e < 0.5 ? !!k.shut : !!n.shut };
    }
    u -= k.move;
  }
  return { from: step(beats[0]), to: step(beats[0]), e: 0, press: 0, shut: false };
}

/** How far a reformer's carriage is pressed out (0 home … 1 the legs long) in a flow at time `t`. */
export function reformerPush(flow: AsanaFlow, t: number, phase = 0): number {
  const period = PRESS[flow];
  if (!period) return 0;
  const p = asanaBeat(flow, t, phase).press;
  return p * (0.5 - 0.5 * Math.cos((t / period) * Math.PI * 2));
}
