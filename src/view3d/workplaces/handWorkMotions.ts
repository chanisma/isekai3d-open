import type { Doing } from '../activity';
import type { BodyPose } from '../avatar';
import type { Spot } from '../parts';
import { bqNow } from './bakerMotion';
import { cpNow } from './carpenterMotion';
import { kcNow } from './culinaryMotion';
import { clockOf, posed } from './handWorkKit';
import { hsNow } from './hairStylistMotion';
import { nlNow } from './nailArtistMotion';

/** The five own motions of the hand-work extras, one way into activity.ts (each job's script is in its own <wp>Motion.ts). */
export type HwMotion = 'kcClose' | 'bqClose' | 'hsSweep' | 'cpSand' | 'nlSoak';
export const HW_MOTIONS = new Set<string>(['kcClose', 'bqClose', 'hsSweep', 'cpSand', 'nlSoak']);

export function hwPose(m: HwMotion, spot: Spot, height: number, t: number): { pose: BodyPose; doing: Doing } {
  const c = clockOf(spot.at, t);
  const N = m === 'kcClose' ? kcNow(c, height) : m === 'bqClose' ? bqNow(c, height) : m === 'hsSweep' ? hsNow(c, height) : m === 'cpSand' ? cpNow(c) : nlNow(c);
  return posed(N, spot);
}
