import * as THREE from 'three';
import type { BodyPose, Reach } from './avatar';
import type { Kind } from './furniture3d';
import type { Spot } from './parts';
import { asanaBeat, isAsanaFlow, type AsanaFlow } from './asana';
import { MECHANIC_MOTIONS, mechanicDoing, type MechanicMotion } from './workplaces/mechanicMotion';
import { POLITICIAN_MOTIONS, politicianDoing, type PoliticianMotion } from './workplaces/politicianMotion';
import { SOCIAL_MOTIONS, socialDoing, type SocialMotion } from './workplaces/socialMediaMotion';
import { CRITIC_MOTIONS, criticDoing, type CriticMotion } from './workplaces/criticMotion';
import { GARDENER_MOTIONS, gardenerDoing, type GardenerMotion } from './workplaces/gardenerMotion';
import { FILM_MOTIONS, filmDoing, type FilmMotion } from './workplaces/filmmakerMotion';
import { HOTEL_MOTIONS, hotelDoing, type HotelMotion } from './workplaces/hotelierMotion';
import { EXTREME_MOTIONS, EXTREME_POSES, extremeDoing, extremePose, type ExtremeMotion, type ExtremePoseMotion } from './workplaces/extremeAthleteMotion';
import { DIPLOMAT_MOTIONS, diplomatDoing, type DiplomatMotion } from './workplaces/diplomatMotion';
import { MODEL_MOTIONS, modelDoing, type ModelMotion } from './workplaces/modelMotion';
import { WELFARE_MOTIONS, welfareDoing, type WelfareMotion } from './workplaces/socialWorkerMotion';
import { SECURITY_MOTIONS, securityDoing, type SecurityMotion } from './workplaces/securityGuardMotion';
import { BODYGUARD_MOTIONS, bodyguardDoing, type BodyguardMotion } from './workplaces/bodyguardMotion';
import { COAST_GUARD_MOTIONS, coastGuardDoing, type CoastGuardMotion } from './workplaces/coastGuardMotion';
import { EMS_MOTIONS, emsDoing, type EmsMotion } from './workplaces/paramedicMotion';
import { SEA_MOTIONS, seaDoing, type SeaMotion } from './workplaces/seafarerMotion';
import { CARE_MOTIONS, careDoing, type CareMotion } from './workplaces/careWorkerMotion';
import { DR_MOTIONS, drDoing, type DrMotion } from './workplaces/doctorMotion';
import { PO_MOTIONS, poDoing, type PoMotion } from './workplaces/policeMotion';
import { FS_MOTIONS, fsDoing, type FsMotion } from './workplaces/firefighterMotion';
import { XE_MOTIONS, xePose, type XeMotion } from './workplaces/workExtraMotion';
import { TC_MOTIONS, tcDoing, type TcMotion } from './workplaces/teacherMotion';
import { HW_MOTIONS, hwPose, type HwMotion } from './workplaces/handWorkMotions';
import { DS_MOTIONS, dsDoing, type DsMotion } from './workplaces/disabilitySupportMotion';
import { CHILDCARE_MOTIONS, childcareDoing, type ChildcareMotion } from './workplaces/childcareMotion';
import { BS_MOTIONS, bsDoing, type BsMotion } from './workplaces/babysitterMotion';
import { OT_MOTIONS, otDoing, type OtMotion } from './workplaces/occupationalTherapistMotion';
import { PT_MOTIONS, ptDoing, type PtMotion } from './workplaces/physicalTherapistMotion';
import { KM_MOTIONS, kmDoing, type KmMotion } from './workplaces/koreanMedicineMotion';
import { OP_MOTIONS, opDoing, type OpMotion } from './workplaces/opticianMotion';
import { DT_MOTIONS, dtDoing, type DtMotion } from './workplaces/dietitianMotion';
import { RG_MOTIONS, rgDoing, type RgMotion } from './workplaces/radiographerMotion';
import { AT_MOTIONS, atDoing, type AtMotion } from './workplaces/academyTutorMotion';
import { DRIVE_MOTIONS, driveDoing, type DriveMotion } from './workplaces/drivingInstructorMotion';
import { CX_MOTIONS, cxDoing, type CxMotion } from './workplaces/courierMotion';
import { BD_MOTIONS, bdDoing, type BdMotion } from './workplaces/busDriverMotion';
import { SUBWAY_MOTIONS, subwayDoing, type SubwayMotion } from './workplaces/subwayDriverMotion';
import { ATH_MOTIONS, ATH_POSES, athDoing, athPose, type AthMotion, type AthPoseMotion } from './workplaces/athleticMotion';
import { STYLE_MOTIONS, styleDoing, type StyleMotion } from './workplaces/styleInfluencerMotion';
import { BK_MOTIONS, bkDoing, type BkMotion } from './workplaces/bankerMotion';
import { FA_MOTIONS, faPose, type FaMotion } from './workplaces/flightAttendantMotion';
import { PL_MOTIONS, plPose, type PlMotion } from './workplaces/pilotMotion';
import { MT_MOTIONS, mtPose, type MtMotion } from './workplaces/meteorologistMotion';
import { VF_MOTIONS, vfPose, type VfMotion } from './workplaces/smartFarmerMotion';
import { AC_MOTIONS, acPose, type AcMotion } from './workplaces/actorMotion';
import { DN_MOTIONS, dnPose, type DnMotion } from './workplaces/dancerMotion';
import { FF_MOTIONS, ffPose, type FfMotion } from './workplaces/fastFoodMotion';
import { CV_MOTIONS, cvPose, type CvMotion } from './workplaces/convenienceManagerMotion';
import { RT_MOTIONS, rtPose, type RtMotion } from './workplaces/retailMotion';
import { AN_MOTIONS, anPose, type AnMotion } from './workplaces/announcerMotion';
import { TS_MOTIONS, tsPose, type TsMotion } from './workplaces/tvHostMotion';
import { PB_MOTIONS, pbPose, type PbMotion } from './workplaces/plumberMotion';
import { DG_MOTIONS, dgPose, type DgMotion } from './workplaces/graphicDesignerMotion';
import { RX_MOTIONS, rxPose, type RxMotion } from './workplaces/pharmacistMotion';
import { RE_MOTIONS, rePose, type ReMotion } from './workplaces/realEstateMotion';
import { WD_MOTIONS, wdPose, type WdMotion } from './workplaces/welderMotion';
import { EN_MOTIONS, enPose, type EnMotion } from './workplaces/entertainerMotion';
import { ML_MOTIONS, mlPose, type MlMotion } from './workplaces/manualLaborMotion';
import { FH_MOTIONS, fhPose, type FhMotion } from './workplaces/fisherMotion';
import { HY_MOTIONS, hyPose, type HyMotion } from './workplaces/haenyeoMotion';
import { FG_MOTIONS, fgPose, type FgMotion } from './workplaces/foresterMotion';
import { YA_MOTIONS, yaPose, type YaMotion } from './workplaces/fishFarmerMotion';
import { TT_MOTIONS, ttPose, type TtMotion } from './workplaces/tattooArtistMotion';
import { IC_MOTIONS, icPose, type IcMotion } from './workplaces/secretAgentMotion';
import { EG_MOTIONS, egPose, type EgMotion } from './workplaces/proGamerMotion';
import { MP_MOTIONS, mpPose, type MpMotion } from './workplaces/mailCarrierMotion';
import { SN_MOTIONS, snPose, type SnMotion } from './workplaces/sanitationWorkerMotion';
import { CU_MOTIONS, cuPose, type CuMotion } from './workplaces/customsOfficerMotion';
import { FB_MOTIONS, fbPose, type FbMotion } from './workplaces/semiconductorMotion';
import { DC_MOTIONS, dcPose, type DcMotion } from './workplaces/dataCenterMotion';
import { LT_MOTIONS, ltPose, type LtMotion } from './workplaces/labTechnicianMotion';
import { AR_MOTIONS, arPose, type ArMotion } from './workplaces/aiResearcherMotion';
import { CS_MOTIONS, csPose, type CsMotion } from './workplaces/callCenterMotion';
import { IP_MOTIONS, ipPose, type IpMotion } from './workplaces/interpreterMotion';
import { FD_MOTIONS, fdPose, type FdMotion } from './workplaces/fashionDesignerMotion';
import { AS_MOTIONS, asPose, type AsMotion } from './workplaces/astronautMotion';
import { VA_MOTIONS, vaPose, type VaMotion } from './workplaces/voiceActorMotion';
import { TG_MOTIONS, tgPose, type TgMotion } from './workplaces/tourGuideMotion';
import { JU_MOTIONS, juPose, type JuMotion } from './workplaces/civilServantMotion';
import { BH_MOTIONS, bhPose, type BhMotion } from './workplaces/insuranceAgentMotion';
import { WL_MOTIONS, wlPose, type WlMotion } from './workplaces/wallpapererMotion';
import { GJ_MOTIONS, gjPose, type GjMotion } from './workplaces/correctionsOfficerMotion';
import { MI_MOTIONS, miPose, type MiMotion } from './workplaces/militaryMotion';
import { RS_MOTIONS, RS_SEATS, rsDoing, rsPose, type RsMotion, type RsSeat } from './home/restMotion';
import { KT_MOTIONS, ktPose, type KtMotion } from './home/kitchenMotion';
import { BT_MOTIONS, BT_SEATS, btDoing, btPose, type BtMotion, type BtSeat } from './home/bathMotion';
import { HF_MOTIONS, hfPose, type HfMotion } from './home/hobbyMotion';
import { PG_MOTIONS, PG_SEATS, pgDoing, pgPose, type PgMotion, type PgSeat } from './home/playMotion';
import { GB_MOTIONS, gbPose, type GbMotion } from './home/studyMotion';
import { RL_MOTIONS, rlPose, type RlMotion } from './workplaces/roboticistMotion';
import { SD_MOTIONS, sdPose, type SdMotion } from './workplaces/selfDrivingMotion';
import { GE_MOTIONS, gePose, type GeMotion } from './workplaces/greenEnergyMotion';
import { TOY_MOTIONS, toyClientAt, toyDoing, type ToyMotion } from './workplaces/toymakerMotion';
import { ECO_MOTIONS, ecoDoing, type EcoMotion } from './workplaces/conservationistMotion';
import { FARM_MOTIONS, farmDoing, type FarmMotion } from './workplaces/farmerMotion';
import { KG_MOTIONS, kgDoing, type KgMotion } from './workplaces/kindergartenTeacherMotion';
import { YOUTH_MOTIONS, youthDoing, type YouthMotion } from './workplaces/youthCounselorMotion';
import { EL_MOTIONS, elDoing, type ElMotion } from './workplaces/electricianMotion';
import { ET_MOTIONS, etDoing, type EtMotion } from './workplaces/elevatorTechMotion';
import { INTERIOR_MOTIONS, interiorDoing, type InteriorMotion } from './workplaces/interiorDecoratorMotion';
import { TH_MOTIONS, thDoing, type ThMotion } from './workplaces/therapistMotion';
import { SALES_MOTIONS, salesDoing, type SalesMotion } from './workplaces/salesMotion';

/**
 * What a dweller's hands and body do while they use something (docs/3d/01-view.md §4): in 2D a dweller
 * only had to stand by an object, but in 3D they have to meet it. Each interaction gets a motion
 * from its id and the object's family (typing at a computer, stirring a pan, scrubbing at a sink,
 * a book held up to read, a fork going to the mouth…), and the motion says where the hands go over
 * time, how far the dweller leans in or squats down, and what they hold.
 */
export type Motion =
  | 'type' | 'write' | 'stir' | 'scrub' | 'chop' | 'shake' | 'rummage' | 'read' | 'eat' | 'drink'
  | 'paint' | 'strum' | 'keys' | 'talk' | 'dance' | 'tinker' | 'admire' | 'peer' | 'sing' | 'cradle'
  | 'warm' | 'lather' | 'lap' | 'knees' | 'gesture' | 'board' | 'still' | 'perform' | 'joke'
  | 'skydive' | 'gforce' | 'pilot' | 'handrail'
  | 'meditate' | 'guide' | 'host'
  | 'restrain'
  | 'saute' | 'dice' | 'ladle' | 'plate' | 'taste'
  | 'climb' | 'steer' | 'gearUp' | 'cpr' | 'search'
  | 'meeting' | 'present'
  | 'teach'
  | 'gamepad'
  | 'brushwork'
  | 'penDraw'
  | 'knead' | 'roll' | 'score' | 'peel' | 'pipe'
  | 'dentistry'
  | 'argue'
  | 'stream' | 'streamChat' | 'streamCast' | 'donation' | 'skit' | 'asmr'
  | 'espresso' | 'latteArt' | 'register' | 'grind'
  | 'haircut' | 'hairColor' | 'blowDry' | 'shampoo'
  | 'makeup'
  | 'manicure' | 'pedicure' | 'nailShow' | 'footSoak'
  | 'facial' | 'bodyMassage' | 'skinScan'
  | 'studioSing' | 'aria' | 'vocalScale'
  | 'pianoLesson' | 'pianoCoach' | 'conduct'
  | 'shoot' | 'shootHand' | 'direct' | 'develop' | 'retouch'
  | 'floristry' | 'floralArrange' | 'albumShow'
  | 'djMix' | 'djPeak' | 'crateDig' | 'soundCheck'
  | 'incense' | 'officiate' | 'usher' | 'shroud'
  | 'shelve' | 'storyRead' | 'checkout' | 'catalogue' | 'pageScan' | 'bookShow'
  | 'solder' | 'probe' | 'pendant'
  | 'plane' | 'handSaw' | 'chisel' | 'assemble' | 'ripSaw' | 'woodFinish' | 'sightBoard' | 'drillPress'
  | MechanicMotion
  | PoliticianMotion
  | SocialMotion
  | CriticMotion
  | GardenerMotion
  | FilmMotion
  | HotelMotion
  | ExtremeMotion
  | DiplomatMotion
  | ModelMotion
  | WelfareMotion
  | SecurityMotion
  | BodyguardMotion
  | CoastGuardMotion
  | EmsMotion
  | SeaMotion
  | CareMotion
  | DrMotion
  | PoMotion
  | FsMotion
  | XeMotion
  | TcMotion
  | HwMotion
  | DsMotion
  | ChildcareMotion
  | BsMotion
  | OtMotion
  | PtMotion
  | KmMotion
  | OpMotion
  | DtMotion
  | RgMotion
  | AtMotion
  | DriveMotion
  | CxMotion
  | BdMotion
  | SubwayMotion
  | AthMotion
  | StyleMotion
  | BkMotion
  | FaMotion
  | PlMotion
  | MtMotion
  | VfMotion
  | AcMotion
  | DnMotion
  | FfMotion
  | CvMotion
  | RtMotion
  | AnMotion
  | TsMotion
  | PbMotion
  | DgMotion
  | RxMotion
  | ReMotion
  | WdMotion
  | EnMotion
  | MlMotion
  | FhMotion
  | HyMotion
  | FgMotion
  | YaMotion
  | TtMotion
  | IcMotion
  | EgMotion
  | MpMotion
  | SnMotion
  | CuMotion
  | FbMotion
  | DcMotion
  | LtMotion
  | ArMotion
  | CsMotion
  | IpMotion
  | FdMotion
  | AsMotion
  | VaMotion
  | TgMotion
  | JuMotion
  | BhMotion
  | WlMotion
  | GjMotion
  | MiMotion
  | RsMotion
  | RsSeat
  | KtMotion
  | BtMotion
  | BtSeat
  | HfMotion
  | PgMotion
  | GbMotion
  | PgSeat
  | RlMotion
  | SdMotion
  | GeMotion
  | ToyMotion
  | EcoMotion
  | FarmMotion
  | KgMotion
  | YouthMotion
  | ElMotion
  | EtMotion
  | InteriorMotion
  | SalesMotion
  | ThMotion
  | AsanaFlow;

/**
 * Singing in a recording studio (2026-10-27, the 녹음 스튜디오와 공연장, at the user's request: recording
 * should look like singing into a condenser mic with the headphones on). Where the headphones' cups
 * sit on a 1.6 m dweller's head, from the feet: `side` out to each side, `down` from the top of them,
 * `ahead` of the feet (all scaled with height). The booth's mic (workplaces/singer.ts) puts them there
 * and the left hand goes to the left cup to hear the voice against the track.
 */
export const STUDIO_EAR = { side: 0.1, down: 0.15, ahead: 0.02 };

type SingKey = 'verse' | 'build' | 'long' | 'breath';
/** A song's phrases as they're sung: a verse, building into a long held note (eyes shut), a breath with a look at the lyrics. */
const SING: Array<{ key: SingKey; hold: number; move: number }> = [
  { key: 'verse', hold: 3.2, move: 0.8 },
  { key: 'build', hold: 1.6, move: 0.6 },
  { key: 'long', hold: 3.4, move: 0.9 },
  { key: 'breath', hold: 1.4, move: 0.7 },
  { key: 'verse', hold: 2.6, move: 0.7 },
  { key: 'long', hold: 2.8, move: 0.9 },
  { key: 'breath', hold: 1.2, move: 0.7 },
];
const SING_LEN = SING.reduce((a, k) => a + k.hold + k.move, 0);
/** Where in the song a singer is at time `t` (`ph`, 0–1, keeps two singers apart): the phrase, the next, and how far between (eased). */
export function singBeat(t: number, ph: number): { from: SingKey; to: SingKey; e: number } {
  let u = (((t + ph * SING_LEN) % SING_LEN) + SING_LEN) % SING_LEN;
  for (let i = 0; i < SING.length; i++) {
    const k = SING[i];
    if (u < k.hold) return { from: k.key, to: k.key, e: 0 };
    u -= k.hold;
    if (u < k.move) return { from: k.key, to: SING[(i + 1) % SING.length].key, e: THREE.MathUtils.smootherstep(u / k.move, 0, 1) };
    u -= k.move;
  }
  return { from: 'verse', to: 'verse', e: 0 };
}

/** A white key's width on a piano, metres. */
export const WHITE_KEY = 0.0235;
const SCALE = [0, 1, 2, 3, 4, 3, 2, 1, 0];
/**
 * A five-note warm-up at the piano (do re mi fa sol fa mi re do on a lip trill), a breath, then the
 * same a key higher, five times round and back down: the white key under the finger counted from the
 * scale's first (`key`), and whether it's down. The piano (workplaces/singer.ts) sinks the same key.
 */
export function scaleNote(t: number, ph: number): { key: number; down: boolean; rest: boolean } {
  const step = 0.42;
  const per = SCALE.length + 2;
  const n = Math.floor(t / step + ph * per * 5);
  const i = ((n % per) + per) % per;
  const round = ((Math.floor(n / per) % 5) + 5) % 5;
  if (i >= SCALE.length) return { key: round, down: false, rest: true };
  const f = t / step - Math.floor(t / step);
  return { key: SCALE[i] + round, down: f < 0.75, rest: false };
}

/**
 * At a patient's mouth in the dental chair (2026-10-27, the 치과): where the hands hold the mouth
 * mirror (left) and the probe (right) from the point they work at (`work`, the open mouth) — across to
 * the dentist's left, up, and back towards them, metres. The chair (workplaces/dentist.ts) draws the
 * instruments from these handles to their tips in the mouth.
 */
export const DENTAL_GRIP = { mirror: { side: 0.1, up: 0.07, ahead: -0.13 }, probe: { side: -0.09, up: 0.07, ahead: -0.13 } };

/**
 * Behind a café's bar (2026-10-27, the 카페): where a barista's hands and tools are, as offsets from
 * where they work (the machine's group head, its steam wand's tip) in the barista's own frame —
 * `side` to their left, `up`, `ahead` away from them, metres. The machine (workplaces/barista.ts)
 * moves the portafilter, the tamper, the milk pitcher and the cup by the same clock (toolPhase of the
 * barista's mark), so whatever's in a hand stays in it.
 */
export interface BarOffset {
  side: number;
  up: number;
  ahead: number;
}
const bo = (side: number, up: number, ahead: number): BarOffset => ({ side, up, ahead });
const boAdd = (a: BarOffset, b: BarOffset): BarOffset => bo(a.side + b.side, a.up + b.up, a.ahead + b.ahead);
const boMix = (a: BarOffset, b: BarOffset, e: number): BarOffset => bo(a.side + (b.side - a.side) * e, a.up + (b.up - a.up) * e, a.ahead + (b.ahead - a.ahead) * e);
const numMix = (a: number, b: number, e: number) => a + (b - a) * e;
/** Eased along keys [u, value]: held before the first and after the last. */
function keyed<T>(keys: Array<[number, T]>, u: number, mix: (a: T, b: T, e: number) => T): T {
  if (u <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (u < keys[i][0]) return mix(keys[i - 1][1], keys[i][1], THREE.MathUtils.smoothstep(u, keys[i - 1][0], keys[i][0]));
  return keys[keys.length - 1][1];
}

/** The portafilter: its handle from the basket's middle back towards the barista (dipping a little); the tamper's knob over its base. */
export const PORTAFILTER = { handle: 0.17, droop: 0.03, knob: 0.085 };
/** Where the basket's rim is (from the group head): locked in, let down, at the knock box, on the grinder's fork, on the tamping mat, offered up. */
const PF = { lock: bo(0, -0.03, 0), low: bo(0, -0.1, -0.08), knock: bo(0.33, -0.07, -0.12), grind: bo(0.33, -0.09, 0.03), tamp: bo(0.16, -0.175, -0.155), fit: bo(0, -0.07, 0) };
const PF_KEYS: Array<[number, BarOffset]> = [[0.03, PF.lock], [0.07, PF.low], [0.12, PF.knock], [0.19, PF.knock], [0.24, PF.grind], [0.37, PF.grind], [0.42, PF.tamp], [0.5, PF.tamp], [0.55, PF.fit], [0.58, PF.lock]];
/** The handle turned to the barista's right (radians): locked, turned out, straight, offered in to the left, turned home. */
const TWIST_KEYS: Array<[number, number]> = [[0, 0.35], [0.03, -0.35], [0.07, 0], [0.53, 0], [0.555, -0.35], [0.58, 0.35]];
/** The tamper's base: on the mat, over the basket, pressed in. */
const TAMPER_REST = bo(0.23, -0.225, -0.17);
const TAMPER_KEYS: Array<[number, BarOffset]> = [[0.41, TAMPER_REST], [0.44, boAdd(PF.tamp, bo(0, 0.08, 0))], [0.46, boAdd(PF.tamp, bo(0, -0.012, 0))], [0.485, boAdd(PF.tamp, bo(0, -0.012, 0))], [0.505, boAdd(PF.tamp, bo(0, 0.08, 0))], [0.535, TAMPER_REST]];
/** The cup's foot: taken off the stack, under the spouts, slid along to the pass. */
const SHOT_CUP = { stack: bo(0.02, -0.224, -0.16), tray: bo(0, -0.185, 0), pass: bo(-0.18, -0.24, -0.16) };
const SHOT_CUP_KEYS: Array<[number, BarOffset]> = [[0.56, SHOT_CUP.stack], [0.6, SHOT_CUP.tray], [0.87, SHOT_CUP.tray], [0.9, boAdd(SHOT_CUP.tray, bo(-0.08, 0.04, -0.06))], [0.93, SHOT_CUP.pass]];
const SHOT_HAND = { rest: bo(0.11, -0.21, -0.21), grinder: bo(0.33, 0.08, 0.09), brew: bo(0, 0.13, 0.03) };

/**
 * A shot pulled (16 s round): the portafilter unlocked and knocked out, filled at the grinder (the
 * other hand on its button), tamped level on the mat, locked back in; a cup set under the spouts, the
 * shot started, the espresso running into it; the cup slid along to the pass, and again.
 */
export function espressoRound(t: number, phase: number) {
  const u = ((t / 16 + phase) % 1 + 1) % 1;
  const sm = (a: number, z: number) => THREE.MathUtils.smoothstep(u, a, z);
  const pf = { ...keyed(PF_KEYS, u, boMix) };
  // Knocked twice on the knock box's bar.
  if (u > 0.12 && u < 0.19) pf.up -= 0.035 * Math.max(0, Math.sin(((u - 0.12) / 0.07) * Math.PI * 4));
  const twist = keyed(TWIST_KEYS, u, numMix);
  const H = PORTAFILTER.handle;
  const grip = boAdd(pf, bo(-Math.sin(twist) * H, -PORTAFILTER.droop, -Math.cos(twist) * H));
  const tamper = keyed(TAMPER_KEYS, u, boMix);
  const served = u < 0.1;
  const cup = served ? SHOT_CUP.pass : keyed(SHOT_CUP_KEYS, u, boMix);
  const cupOn = served || u >= 0.56;
  const fill = u < 0.1 ? 1 : sm(0.65, 0.86);
  // The grounds: the spent puck till it's knocked out, ground in, tamped flat.
  const grounds = u < 0.13 ? 1 : sm(0.25, 0.36);
  const tamped = u < 0.13 || u >= 0.465;
  // The left hand: resting, on the grinder's button, on the tamper's knob, bringing the cup, starting the shot.
  let l = SHOT_HAND.rest;
  l = boMix(l, SHOT_HAND.grinder, sm(0.21, 0.25) * (1 - sm(0.36, 0.4)));
  l = boMix(l, boAdd(tamper, bo(0, PORTAFILTER.knob, 0)), sm(0.39, 0.41) * (1 - sm(0.535, 0.55)));
  l = boMix(l, boAdd(cup, bo(0.05, 0.035, 0)), sm(0.53, 0.56) * (1 - sm(0.6, 0.615)));
  l = boMix(l, SHOT_HAND.brew, sm(0.6, 0.63) * (1 - sm(0.66, 0.7)));
  // The right hand on the handle, but for taking the cup along to the pass.
  const r = boMix(grip, boAdd(cup, bo(-0.05, 0.035, 0)), sm(0.86, 0.88) * (1 - sm(0.93, 0.96)));
  return { u, pf, twist, tamper, cup, cupOn, fill, grounds, tamped, grinding: u > 0.25 && u < 0.36, flow: u > 0.65 && u < 0.86, l, r };
}

/**
 * At a café's till or pickup counter (8 s round): tapping at the screen, a look up at the customer,
 * then the hand out across the counter (`give`) with the pager or the drink, which the counter
 * (workplaces/barista.ts) carries across with it (`out`, staying over there till the next round).
 */
export const TILL_REACH = { ahead: 0.62, up: 1.08 };
export function tillRound(t: number, phase: number) {
  const u = ((t / 8 + phase) % 1 + 1) % 1;
  const sm = (a: number, z: number) => THREE.MathUtils.smoothstep(u, a, z);
  return { u, give: sm(0.55, 0.64) * (1 - sm(0.76, 0.86)), out: sm(0.55, 0.64), look: sm(0.4, 0.5) * (1 - sm(0.86, 0.95)) };
}

/** A milk pitcher, from the middle of its foot: the handle to the barista's right, the spout to their left (x across to the right, y up). */
export const PITCHER = { handle: { x: 0.075, y: 0.07 }, spout: { x: -0.058, y: 0.115 }, cup: 0.075 };
/** From the steam wand's tip: the pitcher's foot at rest and under the wand, the steam knob, the cup (on the drip tray, held, set down), the left hand at rest. */
const MILK = { rest: bo(0.09, -0.1, -0.08), steam: bo(0.01, -0.07, 0), knob: bo(0.07, 0.25, 0.11), tray: bo(0.21, -0.045, 0.08), held: bo(0.35, 0.04, -0.22), set: bo(0.33, -0.1, -0.08), lrest: bo(0.42, -0.07, -0.13) };
/** A point on the pitcher (x, y in its own frame) tipped by `tilt` about the barista's forward line, the spout going down. */
function onPitcher(p: { x: number; y: number }, tilt: number): BarOffset {
  const c = Math.cos(tilt);
  const s = Math.sin(tilt);
  return bo(-(p.x * c - p.y * s), p.x * s + p.y * c, 0);
}

/**
 * A latte poured (20 s round): the pitcher held up to the steam wand, the knob opened, the milk
 * stretched near the top then rolled deeper, the other hand flat on the pitcher feeling it heat; the
 * knob shut, the pitcher tapped and swirled; the cup of espresso taken up in the left hand and tipped
 * to it, the milk poured from high, then low and close, the pitcher wiggled as it's drawn back so a
 * rosetta comes up on the cup, and pulled through; the cup set down at the pass.
 */
export function latteRound(t: number, phase: number) {
  const u = ((t / 20 + phase) % 1 + 1) % 1;
  const sm = (a: number, z: number) => THREE.MathUtils.smoothstep(u, a, z);
  const cup = u < 0.46 ? MILK.set : u < 0.53 ? MILK.tray : keyed([[0.53, MILK.tray], [0.58, MILK.held], [0.9, MILK.held], [0.95, MILK.set]], u, boMix);
  const cupTilt = -0.35 * sm(0.55, 0.6) * (1 - sm(0.72, 0.86));
  const fill = u < 0.46 ? 1 : 0.45 + 0.3 * sm(0.6, 0.68) + 0.25 * sm(0.72, 0.86);
  const art = u < 0.46 || u >= 0.9 ? 1 : 0.85 * sm(0.72, 0.86) + 0.15 * sm(0.86, 0.9);
  // Steamed: the tip just under the surface to stretch it, then deeper to roll it.
  const steamAt = boAdd(MILK.steam, bo(0, -0.02 * sm(0.16, 0.24) + 0.004 * Math.sin(t * 9), 0));
  let base = keyed([[0, MILK.rest], [0.06, steamAt], [0.4, steamAt], [0.44, MILK.rest]], u, boMix);
  let tilt = 0.12 * sm(0.03, 0.06) * (1 - sm(0.4, 0.44));
  if (u >= 0.44 && u < 0.53) {
    // Tapped on the counter, swirled.
    const tap = u < 0.47 ? 0.02 * Math.abs(Math.sin(((u - 0.44) / 0.03) * Math.PI * 2)) : 0;
    const sw = sm(0.47, 0.49) * (1 - sm(0.5, 0.52));
    const a = t * Math.PI * 2 * 2.2;
    base = boAdd(MILK.rest, bo(0.015 * sw * Math.cos(a), tap + 0.01 * sw, 0.015 * sw * Math.sin(a)));
  }
  const pour = sm(0.53, 0.59) * (1 - sm(0.9, 0.95));
  if (pour > 0) {
    const th = keyed<number>([[0.59, 0.5], [0.68, 0.7], [0.72, 0.85], [0.86, 1.15], [0.9, 0.9]], u, numMix);
    const h = keyed<number>([[0.59, 0.1], [0.68, 0.1], [0.72, 0.015], [0.86, 0.015], [0.88, 0.06]], u, numMix);
    const wig = u > 0.72 && u < 0.86 ? 0.012 * Math.sin(t * Math.PI * 2 * 3) : 0;
    const along = keyed<number>([[0.72, 0.025], [0.86, -0.02], [0.9, 0.035]], u, numMix);
    const target = boAdd(cup, bo(wig, PITCHER.cup + h, along));
    const so = onPitcher(PITCHER.spout, th);
    base = boMix(base, bo(target.side - so.side, target.up - so.up, target.ahead), pour);
    tilt += (th - tilt) * pour;
  }
  const level = (0.055 + 0.03 * sm(0.06, 0.4)) * (1 - 0.75 * sm(0.6, 0.88));
  let l = MILK.lrest;
  l = boMix(l, MILK.knob, sm(0, 0.03) * (1 - sm(0.07, 0.1)));
  l = boMix(l, boAdd(base, bo(0, 0.05, -0.048)), sm(0.08, 0.11) * (1 - sm(0.37, 0.4)));
  l = boMix(l, MILK.knob, sm(0.38, 0.4) * (1 - sm(0.43, 0.46)));
  l = boMix(l, boAdd(cup, bo(0.05, 0.035, 0)), sm(0.49, 0.53) * (1 - sm(0.95, 0.98)));
  const r = boAdd(base, onPitcher(PITCHER.handle, tilt));
  return { u, pitcher: base, tilt, cup, cupTilt, fill, art, level, steaming: u > 0.06 && u < 0.4, flow: u > 0.6 && u < 0.9, pouring: pour, l, r };
}

/**
 * Painting at a studio easel (2026-10-27, the 화실): the brush (workplaces/painter.ts) is moved by the
 * easel's own `animate` — to the palette to load it, onto the canvas for three strokes, back for a
 * look — and the hand here holds it wherever it is (`work` is the brush's tip). Both sides share this
 * beat (by toolPhase) to agree on how the brush is held: pointing in at the canvas, or dipped down
 * onto the palette. The palette is in the other hand, at `PALETTE` from where the painter stands.
 */
export const PALETTE = { ahead: 0.26, side: 0.2, up: 1.0 };
/** Tip to the hand on the brush, metres. */
export const BRUSH_REACH = 0.14;
export function brushwork(t: number, phase: number) {
  const c = t / 8.5 + phase;
  const n = Math.floor(c);
  const u = c - n;
  const sm = THREE.MathUtils.smoothstep;
  const pal = 1 - sm(u, 0.1, 0.2) + sm(u, 0.88, 1);
  const look = sm(u, 0.7, 0.78) * (1 - sm(u, 0.84, 0.9));
  // The way from the tip back to the hand, in the painter's frame (ahead, to their left, up).
  const ahead = -1 + 0.55 * pal;
  const side = -0.25 * pal;
  const up = -0.2 + 1.2 * pal;
  const k = 1 / Math.hypot(ahead, side, up);
  return { n, u, pal, look, dir: { ahead: ahead * k, side: side * k, up: up * k } };
}

/**
 * Drawing with a pen (2026-10-27, the 웹툰 스튜디오, at the user's request: drawing on the pen display
 * should look like drawing). The piece moves the nib (`work`) along each line in its own `animate`
 * (workplaces/webtoonArtist.ts) — down on the glass or the paper while the line goes down, lifted
 * between lines — and draws the pen from the nib back through the hand. The hand holds it this far
 * from the nib, in the drawer's own frame (back towards them, up, out to their right): `PEN_GRIP` sat
 * at a pen display tilted up on its stand, `MARKER_GRIP` stood at a board. Sat, the other hand rests
 * on the shortcut remote at `PEN_KEYS` from the seat's top (ahead, to their left, up), a finger
 * going down on a key now and then (undo, the brush size).
 */
export const PEN_GRIP = { back: 0.05, up: 0.075, out: 0.03 };
export const MARKER_GRIP = { back: 0.085, up: -0.015, out: 0.035 };
export const PEN_KEYS = { ahead: 0.36, side: 0.34, up: 0.285 };

/**
 * A line cook's tools keep time with the hands (2026-10-26, the restaurant kitchen): the pan, the
 * knife and the stock ladle (workplaces/culinary.ts) move in its own `animate` by the same clock as
 * the hand on them here. Neither side knows the other's dweller, so the beat comes from where the
 * thing is (the hand's mark on it, in the world): two cooks at two stoves are out of step, a cook
 * and their pan never are.
 */
export const toolPhase = (p: THREE.Vector3) => (((p.x * 0.373 + p.z * 0.619) % 1) + 1) % 1;

/*
 * At a bakery's bench, oven and cake table (2026-10-27, the 베이커리, at the user's request: baking
 * should look like baking). Each round gives the hands as offsets (BarOffset: to the baker's left,
 * up, away from them) from where they work, and what the dough, the peel or the cake is doing by
 * the same clock (toolPhase of the baker's mark), so workplaces/baker.ts moves them in step.
 */

/** Dough kneaded (2.6 s a stroke): pushed away under the heel of the right hand, the far end folded back over, a quarter turn with the left. `work` the bench under the dough. */
export function kneadRound(t: number, phase: number) {
  const c = t / 2.6 + phase;
  const n = Math.floor(c);
  const u = c - n;
  const sm = (a: number, z: number) => THREE.MathUtils.smoothstep(u, a, z);
  const r = keyed<BarOffset>([[0, bo(-0.02, 0.075, -0.04)], [0.08, bo(-0.02, 0.052, -0.03)], [0.45, bo(-0.02, 0.032, 0.11)], [0.55, bo(-0.01, 0.068, 0.14)], [0.82, bo(-0.01, 0.085, -0.01)], [1, bo(-0.02, 0.075, -0.04)]], u, boMix);
  const l = keyed<BarOffset>([[0, bo(0.085, 0.05, -0.05)], [0.82, bo(0.085, 0.05, -0.05)], [0.9, bo(0.07, 0.06, 0.05)], [0.98, bo(0.085, 0.05, -0.05)]], u, boMix);
  return { stretch: sm(0.08, 0.45) * (1 - sm(0.52, 0.82)), fold: sm(0.52, 0.8) * (1 - sm(0.82, 0.9)), turns: n + sm(0.84, 0.97), l, r };
}

/** Where a rolled croissant is set down, from the bench under the dough: the tray at the baker's right. */
export const CROISSANT_TRAY = bo(-0.28, 0.03, 0);
/**
 * A croissant rolled up (4 s): both hands on the triangle of dough, rolling it from its base towards
 * the baker and its tip; then the right hand lifts it across to the tray at their right while the
 * left steadies the sheet, and both go back to the next triangle. `roll` is where the roll has got
 * to (ahead), `carry` how far across it's gone.
 */
export function rollRound(t: number, phase: number) {
  const c = t / 4 + phase;
  const n = Math.floor(c);
  const u = c - n;
  const sm = (a: number, z: number) => THREE.MathUtils.smoothstep(u, a, z);
  const prog = sm(0.04, 0.58);
  const roll = 0.09 - 0.14 * prog;
  const hand = (side: number, p: number) => bo(side * (0.055 + 0.03 * p), 0.032 + 0.008 * Math.sin(p * 18), 0.095 - 0.14 * p);
  const carry = sm(0.63, 0.8);
  const cp = boMix(bo(0, 0.025, roll), CROISSANT_TRAY, carry);
  cp.up += 0.08 * Math.sin(Math.PI * carry);
  const r = boMix(boMix(hand(-1, prog), boAdd(cp, bo(0, 0.02, 0)), sm(0.58, 0.63)), hand(-1, 0), sm(0.84, 0.98));
  const l = boMix(boMix(hand(1, prog), bo(0.13, 0.03, 0.03), sm(0.6, 0.68)), hand(1, 0), sm(0.84, 0.98));
  return { n, prog, roll, carry, cp, held: u >= 0.6 && u < 0.8, placed: u >= 0.8, fresh: u >= 0.84, l, r };
}

/** A loaf on the couche, from the couche under its middle: its crust's top, its length along the baker's line. */
export const LOAF = { top: 0.07, len: 0.3 };
/** The lame's edge to the hand on it. */
export const LAME_HOLD = bo(-0.01, 0.035, -0.025);
/** Slash `i` (0 the farthest) down a loaf's top: where the blade goes in and comes out. */
export const scoreSlash = (i: number) => ({ from: bo(0.018, LOAF.top - 0.004, 0.1 - 0.065 * i), to: bo(-0.018, LOAF.top - 0.004, 0.05 - 0.065 * i) });
/** A loaf scored (4.5 s): the left hand steadying it, three quick slashes of the lame down its top, far to near. `cut` counts them (a fraction while one's being made). */
export function scoreRound(t: number, phase: number) {
  const u = ((t / 4.5 + phase) % 1 + 1) % 1;
  const sm = (a: number, z: number) => THREE.MathUtils.smoothstep(u, a, z);
  const rest = bo(-0.14, 0.11, -0.05);
  const from = (i: number) => scoreSlash(i).from;
  const to = (i: number) => scoreSlash(i).to;
  const above = (o: BarOffset) => boAdd(o, bo(0, 0.04, 0));
  let r = rest;
  let cut = 0;
  for (let i = 0; i < 3; i++) {
    const s0 = 0.1 + 0.22 * i;
    if (u < s0) break;
    const prev = i === 0 ? rest : above(to(i - 1));
    const cutting = sm(s0 + 0.1, s0 + 0.17);
    r = boMix(boMix(boMix(prev, above(from(i)), sm(s0, s0 + 0.08)), from(i), sm(s0 + 0.08, s0 + 0.1)), to(i), cutting);
    r = boMix(r, above(to(i)), sm(s0 + 0.17, s0 + 0.22));
    cut = i + cutting;
  }
  if (u >= 0.76) r = boMix(above(to(2)), rest, sm(0.76, 0.9));
  // `r` above is the blade's edge; the hand holds the lame a little above and behind it.
  return { cut, blade: r, l: bo(0.075, 0.045 + 0.003 * Math.sin(u * 40), 0.02), r: boAdd(r, LAME_HOLD) };
}

/** The peel, from the deck's mouth (the middle of its floor at the front): held at the baker's right, its blade and handle (metres). */
export const PEEL = { side: -0.15, up: 0.03, blade: 0.3, handle: 0.75 };
/**
 * Loaves set in a deck oven (10 s): the peel's blade slid in, a little jerk back so the loaves stay
 * on the deck, drawn out; held a moment watching through the glass, then the next load. `centre` is
 * the blade's middle ahead of the mouth.
 */
export function peelRound(t: number, phase: number) {
  const u = ((t / 10 + phase) % 1 + 1) % 1;
  const push = keyed<number>([[0.1, 0], [0.38, 1], [0.44, 1], [0.47, 0.84], [0.5, 0.9], [0.72, 0]], u, numMix);
  const centre = 0.3 * push;
  const back = centre - PEEL.blade / 2;
  const lift = u > 0.44 && u < 0.5 ? 0.012 * Math.sin(((u - 0.44) / 0.06) * Math.PI) : 0;
  const up = PEEL.up + 0.03 + lift;
  return { u, push, centre, lift, onPeel: u < 0.455 || u > 0.92, onDeck: u >= 0.455, l: bo(PEEL.side, up, back - 0.1), r: bo(PEEL.side - 0.01, up, back - 0.34) };
}

/** The cake on the decorating table's turntable: its radius, its height (the work point is the middle of its top). */
export const CAKE = { r: 0.11, h: 0.12 };
/** How many rosettes go round the cake's top. */
export const ROSETTES = 10;
/**
 * A cake decorated on a turntable (14 s): the cream smoothed round its side with the palette knife
 * held still while the left hand spins the turntable; the knife put down and the piping bag taken
 * up; rosettes piped round the top edge, one at a time at the near side, the turntable turned a
 * notch between each. `spin` is the turntable's turn (radians), `roses` how many are piped.
 */
export function pipeRound(t: number, phase: number) {
  const u = ((t / 14 + phase) % 1 + 1) % 1;
  const sm = (a: number, z: number) => THREE.MathUtils.smoothstep(u, a, z);
  const R = CAKE.r;
  const rest = bo(-0.25, -CAKE.h - 0.07, -0.02);
  const knife = bo(-0.05, -0.01 + 0.006 * Math.sin(t * 5), -R - 0.08);
  const v = THREE.MathUtils.clamp((u - 0.46) / 0.51, 0, 0.9999) * ROSETTES;
  const i = Math.floor(v);
  const w = v - i;
  const piping = u >= 0.46 && u < 0.97;
  const squeeze = piping && w < 0.65 ? Math.sin((Math.PI * w) / 0.65) : 0;
  const turn = THREE.MathUtils.smoothstep(w, 0.65, 1);
  const spin = u < 0.46 ? sm(0.05, 0.37) * Math.PI * 3 : Math.PI * 3 + (i + (piping ? turn : 1)) * ((Math.PI * 2) / ROSETTES);
  const swirl = w < 0.65 ? w / 0.65 : 0;
  const tip = bo(0.012 * Math.cos(swirl * Math.PI * 4) * squeeze, 0.016 + 0.03 * turn, -R + 0.025 + 0.012 * Math.sin(swirl * Math.PI * 4) * squeeze);
  const bag = boAdd(tip, bo(-0.03, 0.15, -0.06));
  let r = boMix(rest, knife, sm(0, 0.04));
  r = boMix(r, rest, sm(0.38, 0.42));
  r = boMix(r, bag, sm(0.42, 0.46));
  r = boMix(r, rest, sm(0.97, 1));
  const rim = bo(0.15, -CAKE.h - 0.03, -0.03 + 0.03 * Math.sin(spin * 4));
  const l = u < 0.43 ? rim : boMix(rim, boAdd(tip, bo(0.04, 0.05, -0.03)), sm(0.43, 0.47) * (1 - sm(0.96, 0.99)));
  const ice = u < 0.42;
  return { u, ice, spin, roses: piping ? i + Math.min(1, w / 0.6) : u >= 0.97 ? ROSETTES : 0, squeeze, tip, l, r };
}

/**
 * A sauté pan shaken on the flame, then tossed: pushed out, its far lip flicked up as it's pulled
 * back, the food going up off it and landing. `push` is how far it's out from the cook, `lift` how
 * far the handle's come up, `tilt` the far lip up (radians), `hop` the food's height over the pan.
 */
export function panToss(t: number, phase: number) {
  const u = ((t / 2.6 + phase) % 1 + 1) % 1;
  if (u < 0.62) {
    // Shaken back and forth over the flame, fading in and out so it meets the toss smoothly.
    const amp = 0.028 * Math.sin((Math.PI * u) / 0.62);
    return { push: amp * Math.sin(t * Math.PI * 2 * 2.6), lift: 0, tilt: 0, hop: 0, tossing: false };
  }
  const v = (u - 0.62) / 0.38;
  const out = Math.sin(Math.PI * v);
  const flick = Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, (v - 0.35) / 0.4))));
  const air = Math.max(0, Math.min(1, (v - 0.4) / 0.55));
  return { push: 0.09 * out, lift: 0.035 * out * out, tilt: 0.32 * flick, hop: 0.17 * Math.sin(Math.PI * air), tossing: true };
}

/**
 * Dicing on a board: the knife rocking fast along the food from right to left behind the guiding
 * hand's knuckles, then the board swept — the blade flat, the cut pile pushed off to the right.
 * `side` is to the cook's left of the hand's mark (metres), `up` over the board, `ahead` away from
 * them; `rock` how far the heel's up (the tip stays down), `sweep` 0–1 through the push.
 */
export function diceKnife(t: number, phase: number) {
  const u = ((t / 4.4 + phase) % 1 + 1) % 1;
  if (u < 0.74) {
    const prog = u / 0.74;
    const rock = Math.abs(Math.sin(t * Math.PI * 3.1));
    return { side: -0.07 + 0.13 * prog, up: 0.012 + 0.05 * rock, ahead: 0.012 * Math.sin(t * Math.PI * 6.2), rock, sweep: 0, prog };
  }
  const w = (u - 0.74) / 0.26;
  const e = w * w * (3 - 2 * w);
  return { side: 0.06 - 0.32 * e, up: 0.01 + 0.03 * Math.sin(Math.PI * w) * (w > 0.85 ? 1 : 0.2), ahead: -0.01, rock: 0, sweep: w, prog: 1 };
}

/** A stock pot stirred with a long ladle: slow rounds, now and then a scoop lifted out to look at it. `x`/`z` are the ladle's bowl about the pot's middle (to the cook's left / away), `lift` how far it's out of the broth. */
export function ladleStir(t: number, phase: number) {
  const u = ((t / 9 + phase) % 1 + 1) % 1;
  const a = t * Math.PI * 2 * 0.32;
  const scoop = u > 0.78 ? Math.sin((Math.PI * (u - 0.78)) / 0.22) : 0;
  return { x: 0.11 * Math.cos(a) * (1 - scoop), z: 0.09 * Math.sin(a) * (1 - scoop) - 0.04 * scoop, lift: 0.2 * scoop };
}

/**
 * A lesson at the chalkboard (2026-10-27, the classroom, at the user's request), ~25 s round: a line
 * of the problem written up in chalk, facing the board; turned round to the class to explain it;
 * half turned back, the arm out pointing at what's on the board; then to the class again, a hand up
 * asking who knows — and back to the board for the next line. The board (workplaces/teacher.ts)
 * turns its spot by `yaw` (from facing the class; π at the board) and writes its line as far as
 * `line` on row `row`, by the same clock as the hand here, so the chalk is always where the line's got.
 */
export const LESSON_LINE = { len: 0.42, gap: 0.095 };
const LESSON: Array<{ key: 'write' | 'explain' | 'point' | 'ask'; yaw: number; hold: number; move: number }> = [
  { key: 'write', yaw: Math.PI, hold: 8.5, move: 1.3 },
  { key: 'explain', yaw: 0, hold: 4.5, move: 0.9 },
  { key: 'point', yaw: -1.1, hold: 3.6, move: 0.9 },
  { key: 'ask', yaw: 0, hold: 3.2, move: 1.4 },
];
const LESSON_T = LESSON.reduce((n, k) => n + k.hold + k.move, 0);
export function lessonBeat(t: number) {
  const n = Math.floor(t / LESSON_T);
  const row = ((n % 3) + 3) % 3;
  let u = t - n * LESSON_T;
  for (let i = 0; i < LESSON.length; i++) {
    const k = LESSON[i];
    if (u < k.hold) return { from: k.key, to: k.key, e: 0, yaw: k.yaw, line: k.key === 'write' ? u / k.hold : 1, row };
    u -= k.hold;
    const next = LESSON[(i + 1) % LESSON.length];
    if (u < k.move || i === LESSON.length - 1) {
      const e = THREE.MathUtils.smoothstep(Math.min(1, u / k.move), 0, 1);
      return { from: k.key, to: next.key, e, yaw: k.yaw + (next.yaw - k.yaw) * e, line: next.key === 'write' ? 0 : 1, row: next.key === 'write' ? (row + 1) % 3 : row };
    }
    u -= k.move;
  }
  return { from: 'write' as const, to: 'write' as const, e: 0, yaw: Math.PI, line: 0, row };
}

/**
 * Arguing a case (2026-10-27, the courtroom, at the user's request), ~26 s round: facing the bench
 * with a hand flat on the papers, reading the point off them; making it to the bench, the hand still
 * on the papers and the other open, beating out the words; a finger up on the point that matters;
 * turned round to the gallery, an open hand swept out to them; and back
 * to the bench, both hands on the lectern's edge, hearing the court out with a nod. The podium and the
 * witness stand (workplaces/lawyer.ts) turn their spot to the left by `turn` (0 facing who's
 * addressed, 1 turned to the room) by the same clock (toolPhase of the spot), so the body and the
 * hands agree.
 */
export type ArgueKey = 'read' | 'argue' | 'point' | 'gallery' | 'listen';
const ARGUE: Array<{ key: ArgueKey; turn: number; hold: number; move: number }> = [
  { key: 'read', turn: 0, hold: 4, move: 0.8 },
  { key: 'argue', turn: 0, hold: 6, move: 0.6 },
  { key: 'point', turn: 0, hold: 3, move: 1.3 },
  { key: 'gallery', turn: 1, hold: 4.5, move: 1.3 },
  { key: 'listen', turn: 0, hold: 3.5, move: 0.9 },
];
const ARGUE_T = ARGUE.reduce((n, k) => n + k.hold + k.move, 0);
export function argueBeat(t: number, phase: number): { from: ArgueKey; to: ArgueKey; e: number; turn: number } {
  let u = ((((t / ARGUE_T + phase) % 1) + 1) % 1) * ARGUE_T;
  for (let i = 0; i < ARGUE.length; i++) {
    const k = ARGUE[i];
    if (u < k.hold) return { from: k.key, to: k.key, e: 0, turn: k.turn };
    u -= k.hold;
    const next = ARGUE[(i + 1) % ARGUE.length];
    if (u < k.move || i === ARGUE.length - 1) {
      const e = THREE.MathUtils.smoothstep(Math.min(1, u / k.move), 0, 1);
      return { from: k.key, to: next.key, e, turn: k.turn + (next.turn - k.turn) * e };
    }
    u -= k.move;
  }
  return { from: 'read', to: 'read', e: 0, turn: 0 };
}

/**
 * Streaming (2026-10-27, the 스트리밍 하우스, at the user's request: streaming should look like
 * streaming). A show is a round of beats, each held a while: playing (WASD under the left hand, the
 * mouse in the right, leant in), talking to the camera (the mouse let go, the hand opened out to it),
 * a big reaction (both hands to the head, sat back), typing in the chat, scrolling it and laughing
 * along, watching a match to call it (leant in on the desk) and pointing a play out on the screen;
 * for a big donation the surprise (hands to the cheeks), a bow of thanks, a heart over the head and
 * both fists up; in front of a green screen, a skit acted out (a shrug, the shock, a finger at the
 * lens, hands on hips, a wave goodbye). `turn` (0 at the camera, 1 turned to the chat monitor at the
 * streamer's right) is shared with the desk (workplaces/streamer.ts), which turns the spot and the
 * chair by the same clock (toolPhase of the spot), so the body and the hands agree.
 */
export type StreamShow = 'stream' | 'streamChat' | 'streamCast' | 'donation' | 'skit';
export type StreamKey = 'play' | 'talk' | 'react' | 'chat' | 'scroll' | 'laugh' | 'watch' | 'point' | 'wow' | 'bow' | 'heart' | 'cheer' | 'shrug' | 'shock' | 'aim' | 'hips' | 'bye';
type StreamStep = { key: StreamKey; turn: number; hold: number; move: number };
const sstep = (key: StreamKey, hold: number, turn = 0, move = 0.6): StreamStep => ({ key, turn, hold, move });
const STREAM_SHOWS: Record<StreamShow, StreamStep[]> = {
  stream: [sstep('play', 6), sstep('talk', 3.5), sstep('play', 5), sstep('react', 2.2, 0, 0.4), sstep('play', 4), sstep('chat', 3.5, 1, 0.8)],
  streamChat: [sstep('scroll', 4, 1, 0.8), sstep('laugh', 2.4, 1), sstep('talk', 4, 0, 0.8), sstep('chat', 4, 1, 0.8), sstep('talk', 3, 0, 0.8)],
  streamCast: [sstep('watch', 4), sstep('talk', 3.2), sstep('point', 2.6), sstep('react', 2, 0, 0.4), sstep('watch', 3), sstep('talk', 3)],
  donation: [sstep('wow', 2.4, 0, 0.4), sstep('bow', 2.4), sstep('talk', 2.6), sstep('heart', 3), sstep('cheer', 2.4), sstep('chat', 3, 1, 0.8)],
  skit: [sstep('shrug', 2.6), sstep('shock', 2, 0, 0.4), sstep('aim', 2.4), sstep('hips', 2.8), sstep('bye', 2.6)],
};
export function streamBeat(show: StreamShow, t: number, phase: number): { from: StreamKey; to: StreamKey; e: number; turn: number } {
  const keys = STREAM_SHOWS[show];
  const T = keys.reduce((n, k) => n + k.hold + k.move, 0);
  let u = ((((t / T + phase) % 1) + 1) % 1) * T;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (u < k.hold) return { from: k.key, to: k.key, e: 0, turn: k.turn };
    u -= k.hold;
    const next = keys[(i + 1) % keys.length];
    if (u < k.move || i === keys.length - 1) {
      const e = THREE.MathUtils.smoothstep(Math.min(1, u / k.move), 0, 1);
      return { from: k.key, to: next.key, e, turn: k.turn + (next.turn - k.turn) * e };
    }
    u -= k.move;
  }
  return { from: keys[0].key, to: keys[0].key, e: 0, turn: 0 };
}

/*
 * In a hair salon (2026-10-27, the 헤어 살롱, at the user's request: cutting hair should look like
 * cutting). Each round gives the hands as offsets (BarOffset: to the stylist's left, up, away from
 * them) from the middle of the client's head (`work`), and what the tools are doing, by the same clock
 * (toolPhase of the stylist's spot), so the styling chair and the shampoo bed (workplaces/hairStylist.ts)
 * draw the comb and the scissors, the tint bowl and its brush, the dryer and the round brush, the
 * shower head in the hands.
 */
/** The sections worked through down the near side of the head, front to back (`side`). */
const HAIR_SECTIONS = [-0.05, 0.01, 0.07];
const hairSection = (n: number) => HAIR_SECTIONS[((n % 3) + 3) % 3];
/**
 * A cut (3.4 s a section, three down the near side of the head): the comb drawn down through the
 * section from the crown, the section held out between the fingers of the comb hand, three snips of
 * the scissors along under them, and on to the next. `open` is how far the blades are apart (0–1).
 */
export function haircutRound(t: number, phase: number) {
  const c = t / 3.4 + phase * 3;
  const n = Math.floor(c);
  const u = c - n;
  const sm = (a: number, z: number) => THREE.MathUtils.smoothstep(u, a, z);
  const sd = hairSection(n);
  const crown = (s: number) => bo(s, 0.115, -0.03);
  let l = boMix(crown(sd), bo(sd, 0.0, -0.125), sm(0.04, 0.3));
  l = boMix(l, bo(sd, -0.015, -0.185), sm(0.3, 0.4));
  l = boMix(l, crown(hairSection(n + 1)), sm(0.88, 1));
  const snips = THREE.MathUtils.clamp((u - 0.44) / 0.4, 0, 1);
  const cutAt = bo(sd - 0.045, -0.04 + 0.03 * snips, -0.19);
  const r = boMix(bo(-0.08, -0.1, -0.24), cutAt, sm(0.34, 0.44) * (1 - sm(0.86, 0.95)));
  const cutting = u > 0.44 && u < 0.84;
  const open = cutting ? 0.5 - 0.5 * Math.cos(snips * Math.PI * 6) : 0.1;
  return { n, u, l, r, open, cutting };
}

/**
 * Colour put on (9 s): the tint bowl held in the left hand at the chest, the brush in the right laying
 * the colour along four partings over the top of the head, lifted off between each, then dipped back
 * in the bowl. `tip` is where the brush's bristles are.
 */
export const TINT_BOWL = bo(0.15, -0.2, -0.2);
export function hairColorRound(t: number, phase: number) {
  const u = ((t / 9 + phase) % 1 + 1) % 1;
  const sm = (a: number, z: number) => THREE.MathUtils.smoothstep(u, a, z);
  const dip = boAdd(TINT_BOWL, bo(0, 0.02, 0));
  const from = (k: number) => bo(0.07, 0.105, -0.07 + 0.03 * k);
  const to = (k: number) => bo(-0.06, 0.1, -0.08 + 0.03 * k);
  const lift = bo(0, 0.035, 0);
  const v = THREE.MathUtils.clamp(u / 0.82, 0, 0.9999) * 4;
  const i = Math.floor(v);
  const w = v - i;
  const ws = (a: number, z: number) => THREE.MathUtils.smoothstep(w, a, z);
  let tip: BarOffset;
  if (u < 0.82) {
    // Down onto the parting's far end, drawn along it, lifted off.
    tip = boMix(i === 0 ? dip : boAdd(to(i - 1), lift), from(i), ws(0, 0.2));
    tip = boMix(tip, to(i), ws(0.2, 0.85));
    tip = boMix(tip, boAdd(to(i), lift), ws(0.85, 1));
  } else tip = boMix(boAdd(to(3), lift), dip, sm(0.82, 0.92));
  // The hand on the brush's handle, back towards the stylist and up from its tip.
  const r = boAdd(tip, bo(-0.01, 0.055, -0.12));
  return { u, tip, r, l: boAdd(TINT_BOWL, bo(0, -0.03, -0.01)), painting: u < 0.82 && w > 0.2 && w < 0.85 };
}

/**
 * A blow-dry (5 s a section, three down the near side): the round brush in the left hand under the
 * section, rolled down through it to the ends while the dryer in the right follows it, blowing on it
 * from above; the brush let out, and up to the next. `roll` is the brush's turn (radians).
 */
export function blowDryRound(t: number, phase: number) {
  const c = t / 5 + phase * 3;
  const n = Math.floor(c);
  const u = c - n;
  const sm = (a: number, z: number) => THREE.MathUtils.smoothstep(u, a, z);
  const sd = hairSection(n);
  const top = (s: number) => bo(s, 0.075, -0.125);
  let brush = boMix(top(sd), bo(sd, -0.06, -0.15), sm(0.08, 0.8));
  brush = boMix(brush, bo(sd, -0.08, -0.22), sm(0.8, 0.88));
  brush = boMix(brush, top(hairSection(n + 1)), sm(0.9, 1));
  const roll = n * Math.PI * 5 + sm(0.08, 0.8) * Math.PI * 5;
  const wob = 0.018 * Math.sin(t * 5.5);
  const nozzle = boAdd(brush, bo(wob, 0.11, -0.12));
  return { n, u, brush, roll, nozzle, l: boAdd(brush, bo(0, -0.01, -0.06)), r: boAdd(nozzle, bo(-0.02, -0.09, -0.1)), blowing: u > 0.06 && u < 0.84 };
}

/**
 * A shampoo at the basin (12 s), stood at the head: the lather worked into the scalp with both hands in
 * small rounds, then the shower head taken from its holder in the right hand and the hair rinsed
 * through, the left hand lifting it under the water, and the shower head put back. `foam` is how much
 * lather there is (0–1), `held` whether the shower head is in the hand.
 */
export const SHAMPOO_HOLDER = bo(-0.24, 0.04, -0.02);
/*
 * Make-up put on a face (2026-10-27, the 메이크업 숍, at the user's request: making up a client should
 * look like it), stood at the client's side, ~13 s round: the palette held open in the left hand, the
 * right working on the face (`work` the middle of it, near the nose): a sponge patting the base on
 * over the near cheek and the forehead, back to the palette, a small brush stroked along the lid,
 * back to the palette, a big brush swept round on the cheekbone, then the hands down and a step back
 * to look. `stage` says which tool is in the hand (0 sponge, 1 the eye brush, 2 the big brush) so the
 * vanity, the client chair and the FX table (workplaces/makeupArtist.ts) draw it where the hand is,
 * by the same clock (toolPhase of the artist's spot). On a prosthetic at the FX table the same round
 * is the spatula, the fine brush and the stipple sponge.
 */
export const MAKEUP_PALETTE = bo(0.2, -0.3, -0.24);
export function makeupRound(t: number, phase: number) {
  const u = ((t / 13 + phase) % 1 + 1) % 1;
  const sm = (a: number, z: number) => THREE.MathUtils.smoothstep(u, a, z);
  const dip = boAdd(MAKEUP_PALETTE, bo(0, 0.035, 0.01));
  const back = bo(-0.06, -0.2, -0.2);
  // The path between the places worked, eased.
  const keys: Array<[number, BarOffset]> = [
    [0.0, back],
    [0.04, dip],
    [0.08, dip],
    [0.12, bo(0.035, -0.025, -0.03)],
    [0.3, bo(0.0, 0.055, -0.04)],
    [0.34, dip],
    [0.39, dip],
    [0.43, bo(0.045, 0.02, -0.035)],
    [0.62, bo(0.005, 0.02, -0.035)],
    [0.66, dip],
    [0.71, dip],
    [0.75, bo(0.05, -0.03, -0.03)],
    [0.88, bo(0.05, -0.03, -0.03)],
    [0.93, back],
  ];
  let tip = keyed(keys, u, boMix);
  const stage = u < 0.34 ? 0 : u < 0.66 ? 1 : 2;
  // What the hand does on the face: pats with the sponge, strokes along the lid, rounds on the cheek.
  if (u > 0.12 && u < 0.3) {
    const pat = Math.max(0, Math.sin(t * Math.PI * 2 * 2.6));
    tip = boAdd(tip, bo(0.012 * Math.sin(t * 1.7), 0.01 * Math.sin(t * 2.3), -0.022 * pat));
  } else if (u > 0.43 && u < 0.62) tip = boAdd(tip, bo(0.022 * Math.sin(t * Math.PI * 2 * 0.9), 0.004 * Math.sin(t * Math.PI * 2 * 1.8), 0));
  else if (u > 0.75 && u < 0.88) {
    const a = t * Math.PI * 2 * 1.4;
    tip = boAdd(tip, bo(0.016 * Math.cos(a), 0.012 * Math.sin(a), 0));
  }
  // The hand on the tool: just behind a sponge, back along a brush's handle.
  const r = boAdd(tip, stage === 0 ? bo(-0.005, -0.012, -0.045) : bo(-0.012, -0.03, -0.12));
  const look = sm(0.88, 0.93) * (1 - sm(0.97, 1));
  return { u, tip, r, l: boAdd(MAKEUP_PALETTE, bo(0, -0.02, -0.03)), palette: MAKEUP_PALETTE, stage, look, close: u > 0.1 && u < 0.88 && !(u > 0.32 && u < 0.41) && !(u > 0.64 && u < 0.73) };
}

/*
 * Nails done (2026-10-27, the 네일숍, at the user's request: doing nails should look like doing nails),
 * ~16 s a round, sat across the nail table from the client (or on the low stool at a foot on the
 * pedicure chair's rest). `work` is the middle of the client's hand lying palm down on the cushion,
 * the fingers towards the artist (the foot on its rest, the toes towards them); MANI / PEDI give each
 * nail (thumb first, on the artist's right), the gel bottle and the LED lamp as offsets from it in the
 * artist's frame. The brush dipped, three strokes down each nail from the cuticle to the free edge,
 * the left hand holding that finger; then the brush back in the bottle and the hand slid into the
 * glowing lamp to cure (a foot is rubbed with lotion instead). `done` is how many nails are painted,
 * `hand` where the client's hand is, `cure` how far it's in the lamp, so workplaces/nailArtist.ts
 * draws the brush, the nails and the hand in step (toolPhase of the artist's spot).
 */
export const MANI = {
  nails: [bo(-0.045, 0.012, -0.035), bo(-0.022, 0.016, -0.078), bo(0, 0.016, -0.088), bo(0.021, 0.015, -0.08), bo(0.04, 0.013, -0.064)],
  bottle: bo(-0.17, -0.052, 0.0),
  lamp: bo(0.24, -0.03, -0.01),
};
export const PEDI = {
  nails: [bo(-0.036, 0.03, -0.105), bo(-0.01, 0.026, -0.11), bo(0.01, 0.024, -0.104), bo(0.027, 0.021, -0.095), bo(0.042, 0.018, -0.083)],
  bottle: bo(-0.2, -0.08, -0.02),
  lamp: bo(0, 0, 0),
};
export function manicureRound(t: number, phase: number, foot = false) {
  const K = foot ? PEDI : MANI;
  const c = t / 16 + phase;
  const n = Math.floor(c);
  const u = c - n;
  const sm = (a: number, z: number) => THREE.MathUtils.smoothstep(u, a, z);
  const dip = boAdd(K.bottle, bo(0, 0.012, 0));
  const lift = bo(0, 0.025, 0);
  const rest = boAdd(K.bottle, bo(0.07, 0.015, -0.06));
  const P0 = 0.04;
  const P1 = 0.66;
  let tip = dip;
  let nail = 0;
  let done = 0;
  let painting = false;
  let held = true;
  let hand = bo(0, 0, 0);
  let cure = 0;
  let l = boAdd(K.nails[0], bo(0.03, -0.014, 0.035));
  if (u < P0) tip = boMix(boAdd(dip, bo(0.02, 0.08, -0.04)), dip, sm(0, P0));
  else if (u < P1) {
    const v = ((u - P0) / (P1 - P0)) * 5;
    const i = Math.min(4, Math.floor(v));
    const w = v - i;
    const ws = (a: number, z: number) => THREE.MathUtils.smoothstep(w, a, z);
    nail = done = i;
    const nl = K.nails[i];
    const base = boAdd(nl, bo(0, 0.004, 0.016));
    const edge = boAdd(nl, bo(0, 0.004, -0.006));
    if (w < 0.18) tip = boMix(dip, boAdd(base, lift), ws(0, 0.18));
    else if (w < 0.84) {
      // Three strokes, the middle and either side, cuticle to edge.
      const sv = ((w - 0.18) / 0.66) * 3;
      const j = Math.min(2, Math.floor(sv));
      const e = sv - j;
      const o = bo((j === 0 ? 0 : j === 1 ? 0.005 : -0.005) * (foot ? 1.4 : 1), 0, 0);
      const a = boAdd(base, o);
      const z = boAdd(edge, o);
      if (e < 0.15) tip = boMix(boAdd(a, bo(0, 0.01, 0)), a, e / 0.15);
      else if (e < 0.8) {
        tip = boMix(a, z, THREE.MathUtils.smoothstep(e, 0.15, 0.8));
        painting = true;
      } else tip = boMix(z, boAdd(a, bo(0, 0.01, 0)), (e - 0.8) / 0.2);
    } else {
      tip = boMix(boAdd(edge, lift), dip, ws(0.84, 1));
      done = i + 1;
    }
    // The left hand holds the finger (the toe) being painted, from the side and under.
    l = boAdd(nl, bo(0.03, -0.014, 0.035));
  } else {
    done = 5;
    tip = dip;
    held = u > 0.95;
    if (foot) {
      // Lotion rubbed into the foot in rounds, both hands.
      const k = sm(P1 + 0.02, P1 + 0.06) * (1 - sm(0.9, 0.95));
      const a = t * Math.PI * 2 * 0.9;
      l = boMix(l, bo(0.05 + 0.01 * Math.cos(a), 0.035, 0.02 + 0.035 * Math.sin(a)), k);
      return { n, u, tip, r: boMix(rest, bo(-0.05 - 0.01 * Math.cos(a + 1), 0.035, 0.02 + 0.035 * Math.sin(a + 1.4)), k), l, nail: 4, done, painting, held: false, hand, cure, lamp: false };
    }
    // The hand slid into the lamp (the artist's left guiding it by the wrist), cured, slid out.
    cure = sm(0.7, 0.76) * (1 - sm(0.89, 0.94));
    const mouth = boAdd(K.lamp, bo(0, 0.01, 0.13));
    hand = cure < 1 && u < 0.8 ? boMix(bo(0, 0, 0), boMix(mouth, K.lamp, sm(0.73, 0.76)), sm(0.7, 0.73)) : boMix(boMix(K.lamp, mouth, sm(0.89, 0.915)), bo(0, 0, 0), sm(0.915, 0.94));
    const guide = sm(0.68, 0.7) * (1 - sm(0.77, 0.79)) + sm(0.88, 0.9) * (1 - sm(0.94, 0.96));
    l = boMix(boMix(l, bo(0.1, -0.045, -0.07), sm(0.66, 0.68)), boAdd(hand, bo(0.0, 0.03, 0.1)), guide);
  }
  // The hand on the brush's cap, back towards the artist and up from its tip (straight up over the
  // bottle as it's dipped); put down while it's capped on the bottle.
  const near = 1 - THREE.MathUtils.clamp(Math.hypot(tip.side - dip.side, tip.up - dip.up, tip.ahead - dip.ahead) / 0.05, 0, 1);
  const r = held ? boAdd(tip, boMix(bo(-0.004, 0.022, -0.045), bo(0, 0.05, -0.006), near)) : rest;
  return { n, u, tip, r, l, nail, done, painting, held, hand, cure, lamp: cure > 0.9 };
}

/*
 * At an esthetician's bed (2026-10-27, the 에스테틱, at the user's request: a facial should look like a
 * facial). Each round gives the hands as offsets (BarOffset: to the therapist's left, up, away from
 * them) from `work`, by the same clock as the bed (workplaces/esthetician.ts) that draws the steamer's
 * arm, the mask going on, the bowl and the brush (toolPhase of the therapist's spot).
 */
/**
 * The facial steamer beside the head (on the client's left, the therapist's right as they sit at the
 * head facing down the bed): its pivot from the face, the arm's reach, and the arm's turn (radians
 * about the vertical, in the bed's frame: 0 down the bed's front) parked and swung in over the face.
 */
export const FACIAL_STEAMER = { side: -0.44, up: 0.29, ahead: -0.28, arm: 0.45, out: -3.45, in: -2.39 };
/** Where the steamer's handle is with its arm `k` of the way in (0 parked, 1 over the face). */
export function steamerHandle(k: number): BarOffset {
  const a = FACIAL_STEAMER.out + (FACIAL_STEAMER.in - FACIAL_STEAMER.out) * k;
  const s = FACIAL_STEAMER;
  return bo(s.side - s.arm * Math.sin(a), s.up - 0.05, s.ahead - s.arm * Math.cos(a));
}
/** The mask bowl held in the left hand, over the client's crown. */
export const FACIAL_BOWL = bo(0.15, 0.1, -0.13);
/** Where the mask goes, in the order it's painted: the forehead, the cheeks (right, left), the chin. */
const MASK_AT = [bo(0, -0.02, -0.06), bo(-0.05, -0.03, 0.02), bo(0.05, -0.03, 0.02), bo(0, -0.04, 0.07)];
const MASK_STROKES: Array<[number, number]> = [
  [0.65, 0.7],
  [0.74, 0.79],
  [0.83, 0.88],
  [0.92, 0.96],
];
/**
 * A facial (26 s), sat on the stool at the head of the bed, the client lying face up (`work` the
 * middle of the face, on it; ahead is towards the chin): the steamer's arm swung in over the face by
 * its handle, the temples pressed with the fingertips while it steams, the arm swung back; the face
 * massaged with both hands — rounds on the cheeks, strokes up along the jaw to the temples, the
 * forehead stroked up hand over hand; then the mask painted on with the fan brush from the bowl in
 * the left hand: the forehead, each cheek, the chin. `steam` is how far the arm's in (0–1), `coat`
 * how much of each part of the mask is on, `brush` whether the bowl and the brush are in the hands.
 */
export function facialRound(t: number, phase: number) {
  const u = ((t / 26 + phase) % 1 + 1) % 1;
  const sm = (a: number, z: number) => THREE.MathUtils.smoothstep(u, a, z);
  const frac = (x: number) => x - Math.floor(x);
  const steam = sm(0.02, 0.06) * (1 - sm(0.21, 0.25));
  const press = 0.005 * Math.max(0, Math.sin(t * Math.PI * 0.9));
  const hand = (s: number): BarOffset => {
    // The temples pressed (while it steams).
    let p = bo(s * 0.075, -0.035 - press, -0.04);
    // Rounds on the cheeks.
    const a = t * Math.PI * 2 * 1.1;
    p = boMix(p, bo(s * (0.05 + 0.014 * Math.cos(a)), -0.028, 0.02 + 0.014 * Math.sin(a)), sm(0.25, 0.27));
    // Strokes from the chin up along the jaw to the temples, lifted back down.
    const v = frac(THREE.MathUtils.clamp((u - 0.37) / 0.11, 0, 0.999) * 3);
    const up = THREE.MathUtils.smoothstep(v, 0, 0.75);
    const chin = bo(s * 0.025, -0.05, 0.075);
    const temple = bo(s * 0.078, -0.04, -0.03);
    const jaw = v < 0.75 ? boMix(chin, temple, up) : boAdd(boMix(temple, chin, THREE.MathUtils.smoothstep(v, 0.75, 1)), bo(0, 0.025 * Math.sin(((v - 0.75) / 0.25) * Math.PI), 0));
    p = boMix(p, jaw, sm(0.37, 0.385));
    // The forehead stroked up to the hairline, one hand then the other, the other resting at the temple.
    const w = frac(THREE.MathUtils.clamp((u - 0.48) / 0.12, 0, 0.999) * 4);
    const mine = s > 0 ? w < 0.5 : w >= 0.5;
    const ww = (w % 0.5) / 0.5;
    const brow = bo(s * 0.02, -0.005, -0.03);
    const hair = bo(s * 0.02, -0.03, -0.09);
    const fore = mine ? (ww < 0.8 ? boMix(brow, hair, THREE.MathUtils.smoothstep(ww, 0, 0.8)) : boAdd(boMix(hair, brow, THREE.MathUtils.smoothstep(ww, 0.8, 1)), bo(0, 0.02, 0))) : bo(s * 0.075, -0.035, -0.04);
    p = boMix(p, fore, sm(0.48, 0.495));
    return p;
  };
  let l = hand(1);
  let r = hand(-1);
  // The steamer's handle taken to swing the arm in, and back out.
  const handle = steamerHandle(steam);
  const onHandle = sm(0.0, 0.02) * (1 - sm(0.06, 0.09)) + sm(0.18, 0.21) * (1 - sm(0.25, 0.28));
  r = boMix(r, handle, onHandle);
  // The mask: dipped in the bowl, painted on each part with the brush swept to and fro.
  const dip = boAdd(FACIAL_BOWL, bo(0, 0.025, 0));
  const keys: Array<[number, BarOffset]> = [[0.6, dip]];
  MASK_STROKES.forEach(([a, z], i) => keys.push([a - 0.02, dip], [a, MASK_AT[i]], [z, MASK_AT[i]], [z + 0.01, boAdd(MASK_AT[i], bo(0, 0.03, 0))]));
  keys.push([0.97, dip]);
  let tip = keyed(keys, u, boMix);
  const stroking = MASK_STROKES.findIndex(([a, z]) => u > a && u < z);
  if (stroking >= 0) {
    const sw = 0.025 * Math.sin(t * Math.PI * 2 * 1.2);
    tip = boAdd(tip, stroking === 0 || stroking === 3 ? bo(sw, 0, 0) : bo(0, 0, sw));
  }
  const coat = MASK_STROKES.map(([a, z]) => sm(a, z));
  const masking = sm(0.6, 0.63) * (1 - sm(0.975, 1));
  const brush = u > 0.61 && u < 0.985;
  l = boMix(l, boAdd(FACIAL_BOWL, bo(0, -0.025, -0.02)), masking);
  r = boMix(r, boAdd(tip, bo(-0.01, 0.05, -0.1)), masking);
  return { u, l, r, steam, onHandle, tip, coat, brush, bowl: FACIAL_BOWL };
}

/**
 * A back massage (15 s), stood at the side of the bed, the client lying face down (`work` the middle
 * of the back, on it; their left towards the feet, ahead across the back): three long strokes with
 * both palms up either side of the spine to the shoulders, fanned out over them and drawn back down
 * the sides; the shoulders kneaded, a hand on each, squeezing in turn; the palms stacked and pressed
 * down the spine a step at a time. `press` is how hard they're leaning in (0–1).
 */
export function massageRound(t: number, phase: number) {
  const u = ((t / 15 + phase) % 1 + 1) % 1;
  const sm = (a: number, z: number) => THREE.MathUtils.smoothstep(u, a, z);
  const v = (Math.min(u, 0.449) / 0.15) % 1;
  let side: number;
  let wide: number;
  let lift = 0;
  if (v < 0.5) {
    side = 0.18 - 0.48 * THREE.MathUtils.smoothstep(v, 0, 0.5);
    wide = 0.06;
  } else if (v < 0.62) {
    side = -0.3;
    wide = 0.06 + 0.11 * THREE.MathUtils.smoothstep(v, 0.5, 0.62);
  } else {
    const e = THREE.MathUtils.smoothstep(v, 0.62, 1);
    side = -0.3 + 0.48 * e;
    wide = 0.17 - 0.11 * e;
    lift = 0.012;
  }
  let l = bo(side + 0.03, lift, -wide);
  let r = bo(side, lift, wide);
  // Kneading: a hand on each shoulder, squeezing in turn.
  const a = t * Math.PI * 2 * 0.9;
  const sq = 0.5 + 0.5 * Math.sin(a);
  const kl = bo(-0.28 + 0.02 * Math.sin(a * 0.25), 0.012 * sq, -0.13);
  const kr = bo(-0.28 - 0.02 * Math.sin(a * 0.25), 0.012 * (1 - sq), 0.13);
  const knead = sm(0.45, 0.48) * (1 - sm(0.73, 0.76));
  l = boMix(l, kl, knead);
  r = boMix(r, kr, knead);
  // The palms stacked down the spine, a press at each step.
  const steps = 6;
  const sv = THREE.MathUtils.clamp((u - 0.76) / 0.24, 0, 0.999) * steps;
  const at = Math.floor(sv);
  const pulse = Math.sin((sv - at) * Math.PI);
  const ps = -0.25 + (0.43 * (at + THREE.MathUtils.smoothstep(sv - at, 0.6, 1))) / steps;
  const spine = sm(0.75, 0.78);
  r = boMix(r, bo(ps, -0.012 * pulse, 0), spine);
  l = boMix(l, bo(ps, 0.03 - 0.012 * pulse, 0.005), spine);
  const press = (1 - knead) * (1 - spine) * 0.4 + knead * 0.5 + spine * (0.4 + 0.6 * pulse);
  return { u, l, r, press, knead, grip: { l: knead ? 0.25 + 0.55 * sq * knead : 0.15, r: knead ? 0.25 + 0.55 * (1 - sq) * knead : 0.15 } };
}

/**
 * A skin scan (12 s), stood at the side of a sat client (`work` their near cheek): the handheld probe
 * held to the cheek, the forehead, the nose and the chin in turn, still a moment on each while it
 * reads, then a look down at the tablet in the left hand where the reading comes up.
 */
export const SKIN_TABLET = bo(0.17, -0.2, -0.26);
const SCAN_AT = [bo(0, 0, 0), bo(-0.04, 0.065, 0.03), bo(-0.05, 0.02, 0.045), bo(-0.035, -0.06, 0.03)];
export function skinScanRound(t: number, phase: number) {
  const c = ((t / 12 + phase) % 1 + 1) % 1 * SCAN_AT.length;
  const i = Math.floor(c);
  const v = c - i;
  const from = SCAN_AT[(i + SCAN_AT.length - 1) % SCAN_AT.length];
  const lifted = (o: BarOffset) => boAdd(o, bo(0, 0, -0.03));
  let tip = boMix(lifted(from), SCAN_AT[i], THREE.MathUtils.smoothstep(v, 0, 0.15));
  const look = THREE.MathUtils.smoothstep(v, 0.7, 0.78);
  tip = boMix(tip, lifted(SCAN_AT[i]), look);
  return { tip, r: boAdd(tip, bo(0.005, -0.035, -0.12)), l: SKIN_TABLET, look, reading: v > 0.15 && v < 0.7, at: i };
}

export function shampooRound(t: number, phase: number) {
  const u = ((t / 12 + phase) % 1 + 1) % 1;
  const sm = (a: number, z: number) => THREE.MathUtils.smoothstep(u, a, z);
  const a = t * Math.PI * 2 * 1.3;
  const rub = 1 - sm(0.48, 0.55);
  let l = bo(0.055 + 0.018 * Math.cos(a) * rub, 0.06 + 0.012 * Math.sin(a) * rub, -0.03 + 0.03 * Math.sin(t * 1.6) * (1 - rub));
  const sweep = Math.sin(t * 1.9);
  const spray = bo(-0.02 + 0.06 * sweep, 0.17, -0.01 + 0.03 * Math.cos(t * 1.3));
  let r = bo(-0.055 - 0.018 * Math.cos(a + 1.5), 0.06 + 0.012 * Math.sin(a + 1.5), -0.03);
  r = boMix(r, SHAMPOO_HOLDER, sm(0.5, 0.56) * (1 - sm(0.56, 0.62)));
  r = boMix(r, spray, sm(0.58, 0.64));
  r = boMix(r, SHAMPOO_HOLDER, sm(0.9, 0.95));
  r = boMix(r, bo(-0.055, 0.06, -0.03), sm(0.96, 1));
  l = boAdd(l, bo(0, 0, 0.02 * sm(0.58, 0.64) * (1 - sm(0.9, 0.95))));
  const held = u > 0.55 && u < 0.94;
  return { u, l, r, foam: sm(0.02, 0.15) * (1 - sm(0.62, 0.85)), held, spray: u > 0.64 && u < 0.9, sprayer: r };
}

/**
 * A piano lesson at the grand (2026-10-27, the 음악학원, at the user's request: a lesson should look
 * like one), sat on a chair beside the pupil's bench at the treble end, ~25 s round: beating time for
 * the pupil with a hand (in time with the metronome, CONDUCT_BEAT), turned half to them; a finger on
 * the bar in the score that went wrong; leant in playing the passage over at the top of the keyboard;
 * the page turned for them; a clap for 잘했어. Before a 콩쿠르 it's harder work — the passage played
 * over and pointed out more, no clapping. The grand (workplaces/musicTeacher.ts) turns the teacher's
 * spot by `turn` × PIANO_TURN (0 facing the keys, 1 turned to the pupil), turns the page and takes
 * the pupil's hands off the keys to watch by the same clock (toolPhase of the spot).
 */
export type PianoShow = 'pianoLesson' | 'pianoCoach';
export type PianoKey = 'beat' | 'point' | 'demo' | 'page' | 'clap';
type PianoStep = { key: PianoKey; turn: number; hold: number; move: number };
const pkey = (key: PianoKey, hold: number, turn: number, move = 0.8): PianoStep => ({ key, turn, hold, move });
const PIANO_SHOWS: Record<PianoShow, PianoStep[]> = {
  pianoLesson: [pkey('beat', 6, 0.6), pkey('point', 3.2, 0), pkey('demo', 5.5, 0), pkey('beat', 5, 0.6), pkey('page', 2.2, 0, 0.6), pkey('clap', 2.6, 0.8)],
  pianoCoach: [pkey('beat', 5, 0.5), pkey('demo', 6.5, 0), pkey('point', 3, 0), pkey('beat', 4.5, 0.5), pkey('demo', 5, 0), pkey('page', 2.2, 0, 0.6)],
};
/** How far the teacher's spot turns to the pupil at `turn` 1, radians (to the teacher's left). */
export const PIANO_TURN = 0.8;
/** One beat of the metronome and of a conducting hand (♩ = 76), seconds. */
export const CONDUCT_BEAT = 60 / 76;
/** A metronome's pendulum (radians, + to its right), at an end on every beat. */
export const metronomeSwing = (t: number) => 0.42 * Math.cos((Math.PI * t) / CONDUCT_BEAT);
/** Where the score is on the grand's music desk from the teacher's mark on the keys: to their left, up and away (metres). */
export const PIANO_DESK = { side: 0.36, up: 0.3, ahead: 0.17 };
export function pianoBeat(show: PianoShow, t: number, phase: number): { from: PianoKey; to: PianoKey; e: number; turn: number; page: number } {
  const keys = PIANO_SHOWS[show];
  const T = keys.reduce((n, k) => n + k.hold + k.move, 0);
  let u = ((((t / T + phase) % 1) + 1) % 1) * T;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (u < k.hold) return { from: k.key, to: k.key, e: 0, turn: k.turn, page: k.key === 'page' ? THREE.MathUtils.smoothstep(u / k.hold, 0.15, 0.85) : 0 };
    u -= k.hold;
    const next = keys[(i + 1) % keys.length];
    if (u < k.move || i === keys.length - 1) {
      const e = THREE.MathUtils.smoothstep(Math.min(1, u / k.move), 0, 1);
      return { from: k.key, to: next.key, e, turn: k.turn + (next.turn - k.turn) * e, page: 0 };
    }
    u -= k.move;
  }
  return { from: keys[0].key, to: keys[0].key, e: 0, turn: keys[0].turn, page: 0 };
}

// ---------------------------------------------------------------------------------------------
/**
 * A photo studio's shooting (2026-10-27, the 사진 스튜디오, at the user's request: shooting should
 * look like shooting — the eye to the viewfinder, a finger on the shutter and the strobes popping
 * with it, stepping and crouching for the angles, the sitter directed with a hand). The cameras, the
 * tongs and the prints (workplaces/photographer.ts) run on the same clocks (toolPhase of a fixed
 * mark: the tripod's eyepiece, the sitter's face, the middle tray), so what's in a hand stays in it
 * and every press of the shutter fires the studio's strobes.
 */
const smooth = THREE.MathUtils.smoothstep;
/** The shutter pressed at `clicks` (u in a round of T s): how far it's down now, and when it last went (on `t`'s clock). */
function shutter(clicks: number[], u: number, T: number, t: number) {
  let press = 0;
  let last = t - (u + 1 - clicks[clicks.length - 1]) * T;
  for (const c of clicks) {
    press = Math.max(press, 1 - (Math.abs(u - c) * T) / 0.12);
    if (u >= c) last = t - (u - c) * T;
  }
  return { press: Math.max(0, press), last };
}
/**
 * At a camera on a tripod (8 s): looking up over it at the set and waving the sitter round with the
 * left hand, back to the eyepiece, then a burst of three and a burst of three more. `eye` is how far
 * the eye's at the eyepiece (0–1), `talk` the wave.
 */
export function tripodRound(t: number, phase: number) {
  const T = 8;
  const u = (((t / T + phase) % 1) + 1) % 1;
  const eye = 1 - smooth(u, 0.02, 0.1) + smooth(u, 0.22, 0.3);
  const talk = smooth(u, 0.09, 0.13) * (1 - smooth(u, 0.19, 0.23));
  return { u, eye, talk, ...shutter([0.4, 0.46, 0.52, 0.72, 0.78, 0.84], u, T, t) };
}
/**
 * Where a handheld shoot goes (portraitRound), round the sitter: `side` to the photographer's left
 * and `back` from where they start (metres), how low they get (`crouch`), and whether it's turned for
 * a portrait-way frame (`roll`).
 */
const ANGLES = [
  { side: 0, back: 0, crouch: 0, roll: 0 },
  { side: 0.45, back: 0.1, crouch: 0.8, roll: 0 },
  { side: -0.42, back: -0.25, crouch: 0, roll: 1 },
];
/**
 * A portrait shot handheld (4.2 s an angle, three angles): stepped to the angle with the camera
 * down, raised to the eye (turned on end for the third), four frames, then lowered to check the
 * back screen. `raise` 0–1 from the chest to the eye, `chimp` looking at the screen.
 */
export function portraitRound(t: number, phase: number) {
  const T = 4.2;
  const c = t / T + phase * 3;
  const n = Math.floor(c);
  const v = c - n;
  const a = ANGLES[(((n - 1) % 3) + 3) % 3];
  const b = ANGLES[((n % 3) + 3) % 3];
  const go = smooth(v, 0, 0.16);
  const mix = (k: 'side' | 'back' | 'crouch') => a[k] + (b[k] - a[k]) * go;
  const raise = smooth(v, 0.16, 0.28) * (1 - smooth(v, 0.8, 0.88));
  const chimp = smooth(v, 0.82, 0.9) * (1 - smooth(v, 0.95, 1));
  const roll = b.roll * smooth(v, 0.2, 0.3) * (1 - smooth(v, 0.78, 0.84));
  return { side: mix('side'), back: mix('back'), crouch: mix('crouch'), raise, chimp, roll, ...shutter([0.36, 0.44, 0.52, 0.68], v, T, t) };
}
/**
 * A handheld camera (portraitRound) for a photographer standing at `base` facing `yaw`: where it is
 * (the eyecup) and how it's turned (its +z the lens, +x to their left) — at the eye, or at the chest tipped up to
 * the face — and where the hands hold it: the right round the grip, a finger on the shutter, the left
 * under the lens.
 */
export function handheldCamera(base: THREE.Vector3, yaw: number, H: number, k: { crouch: number; raise: number; roll: number; press: number }) {
  const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const sq = 0.24 * k.crouch;
  const eye = base.clone().addScaledVector(fwd, 0.13).setY(base.y + H * (0.925 - sq));
  const low = base.clone().addScaledVector(fwd, 0.3).setY(base.y + H * (0.63 - sq));
  const at = low.lerp(eye, k.raise);
  const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.95 * (1 - k.raise), yaw, (-Math.PI / 2) * k.roll, 'YXZ'));
  const r = new THREE.Vector3(-0.08, -0.04 - 0.012 * k.press, 0.04).applyQuaternion(quat).add(at);
  const l = new THREE.Vector3(0.005, -0.085, 0.15).applyQuaternion(quat).add(at);
  return { at, quat, l, r };
}
/** Directing the sitter, the camera hangs from the left hand at the hip: where it is from the feet (`side` to the left). */
export const DIRECT_CAM = { ahead: 0.13, side: 0.21, up: 0.55 };
/**
 * Directing a pose (10 s): the right hand palm-up lifting (chin up a little), sweeping across (turn
 * the shoulder this way), to their own chin to show the pose, then the thumb up; the camera down in
 * the left hand.
 */
export type DirectKey = 'chin' | 'turn' | 'show' | 'ok';
const DIRECT: DirectKey[] = ['chin', 'turn', 'show', 'ok'];
export function directBeat(t: number, phase: number): { from: DirectKey; to: DirectKey; e: number; v: number } {
  const c = (((t / 10 + phase) % 1) + 1) % 1 * 4;
  const i = Math.floor(c);
  const v = c - i;
  return { from: DIRECT[(i + 3) % 4], to: DIRECT[i], e: smooth(v, 0, 0.22), v };
}
/** The darkroom's trays (developer, stop, fixer) from the middle one, to the printer's left; the wash beyond the fixer. */
export const DEV_TRAYS = [0.38, 0, -0.38];
export const DEV_WASH = -0.7;
/**
 * A print through the trays with the tongs (16 s): rocked in the developer while the picture comes
 * up, lifted to drip and over into the stop, then the fixer, held up to the safelight to look at, and
 * laid in the wash; the left hand rocks the tray it's in. Offsets from the middle tray's liquid in the
 * printer's frame: `tip` the tongs' jaws, `l` the left hand; `lifted` 0 flat in a tray to 1 hanging,
 * `dev` how far the picture's come up.
 */
export function developRound(t: number, phase: number) {
  const u = (((t / 16 + phase) % 1) + 1) % 1;
  const tray = (i: number) => bo(DEV_TRAYS[i], -0.008, 0);
  const swirl = (o: BarOffset) => boAdd(o, bo(0.045 * Math.sin(t * 2.6), 0.004 * Math.sin(t * 5.2), 0.04 * Math.cos(t * 1.9)));
  const lift = bo(0, 0.2, 0);
  const look = bo(-0.12, 0.5, -0.24);
  const keys: Array<[number, BarOffset]> = [
    [0.0, tray(0)], [0.28, tray(0)], [0.31, boAdd(tray(0), lift)], [0.35, boAdd(tray(1), lift)], [0.38, tray(1)],
    [0.46, tray(1)], [0.49, boAdd(tray(1), lift)], [0.53, boAdd(tray(2), lift)], [0.56, tray(2)],
    [0.8, tray(2)], [0.84, look], [0.92, look], [0.95, boAdd(bo(DEV_WASH, -0.04, 0), lift)], [0.98, bo(DEV_WASH, -0.03, 0)], [1, tray(0)],
  ];
  const at = keyed(keys, u, boMix);
  const still = u < 0.28 || (u > 0.38 && u < 0.46) || (u > 0.56 && u < 0.8);
  const tip = still ? swirl(at) : at;
  const lifted = smooth(u, 0.28, 0.31) * (1 - smooth(u, 0.35, 0.38)) + smooth(u, 0.46, 0.49) * (1 - smooth(u, 0.53, 0.56)) + smooth(u, 0.8, 0.84) * (1 - smooth(u, 0.95, 0.98));
  const i = u < 0.33 || u > 0.98 ? 0 : u < 0.51 ? 1 : 2;
  const rock = 0.012 * Math.sin(t * 3.4);
  const l = u > 0.83 && u < 0.93 ? boAdd(look, bo(0.2, -0.06, 0)) : bo(DEV_TRAYS[i] + 0.19, 0.03 + rock, 0.1);
  return { u, tip, l, r: boAdd(tip, bo(-0.03, 0.13, -0.13)), lifted, dev: u > 0.98 ? 0 : smooth(u, 0.02, 0.24), inWash: u > 0.97 && u <= 0.98 };
}

/** The motion for an interaction (by its id) on an object of a family; `sitting` when they're on it. */
export function motionOf(id: string, kind: Kind | null, sitting: boolean): Motion {
  // Astronaut and skydiver training (2026-10-26): flown, ridden, piloted, gone along hand over hand.
  if (id === 'indoorSkydive') return 'skydive';
  if (id === 'gForceTraining') return 'gforce';
  if (/^(dockingDrill|astronaut_manualPiloting)$/.test(id)) return 'pilot';
  if (/^(evaDrill|astronaut_evaRehearsal)$/.test(id)) return 'handrail';
  if (id === 'astronaut_systemsManual') return 'read';
  // At a meeting (2026-10-26, the office): round the whiteboard, or sat at the conference table.
  if (id === 'attendMeeting' || id === 'salTableMeeting' || id === 'techDailyScrum') return 'meeting';
  // Meditation (2026-10-26): sat still with the eyes shut, or leading it, talking the room through it.
  if (/meditat/i.test(id)) return /^(lead|guide|teach)/i.test(id) ? 'guide' : 'meditate';
  if (id === 'dance' || id === 'dancePractice' || id === 'tvWorkout') return 'dance';
  if (/^shower/.test(id)) return 'lather';
  if (id === 'eat' || id === 'eatCake' || id === 'eatHighChair' || /^mukbang/.test(id)) return 'eat';
  if (id === 'drinkCoffee' || id === 'tasteDish' || id === 'rateWine') return 'drink';
  // The work lots redone in the layout audit (2026-11-06): uses on new pieces that had no motion of their own.
  // The jointer's board pushed over its bed with both hands; a stud wall's frame screwed together.
  if (id === 'carpJointBoard') return 'plane';
  if (id === 'cpSetFrame') return 'assemble';
  // Down the rappel tower hand over hand on the rope; kitted up for a call-out (the SWAT van) or a jump (the plane's harness and helmet).
  if (id === 'swatRappel') return 'climb';
  if (id === 'swatDeploy' || id === 'skydiveJump') return 'gearUp';
  // Low beside the detector dog, the hand sweeping where it's to sniff.
  if (id === 'swatK9Train') return 'search';
  // The bomb drill's X-ray read on the desk's screen (at the rig itself, the hands on the device).
  if (id === 'swatEodDrill' && (kind === 'desk' || kind === 'computer')) return 'type';
  // Bent to look in: an oxygen kennel's window, the van's seats after the children are off, the hopper's pit.
  if (id === 'vtCheckOxygen' || id === 'ccShuttleCheck' || id === 'rcCheckLoad') return 'peer';
  // Watching from back a little: the falcon flown in its cage, the children at the play structure.
  if (id === 'wrFlightTrain' || id === 'ccWatchOutdoor') return 'admire';
  // A 낮잠 이불 taken out of the closet; the scale house's terminal; the quarantine desk's thermal screen.
  if (id === 'ccLayBedding') return 'rummage';
  if (id === 'rcWeighTruck' || id === 'qrScreen') return 'type';
  // Shown the way with a bow and the hand opened out: a feverish traveller to the isolation room, a guest to the 편백 foot bath.
  if (id === 'qrIsolateTraveler' || id === 'fhFootBath') return 'usher';
  // A fish measured and cut open on the board (knife and steadying hand); the tank's fish fed over its rim; hands in under the safety cabinet's sash.
  if (id === 'mrMeasureFish') return 'chop';
  if (id === 'mrFeedTank' || id === 'bscWork') return 'tinker';
  if (/^admire|^view|watchFish|watchNeighbors/.test(id)) return kind === 'telescope' ? 'peer' : 'admire';
  if (/repair|^fix|clean|^upgrade_|^tune|wipe|disinfect|sterilize|tidy/i.test(id)) return 'tinker';
  if (sitting && kind !== 'computer' && kind !== 'desk' && kind !== 'piano') return id === 'homework' ? 'write' : kind === 'toilet' ? 'knees' : 'lap';
  switch (kind) {
    case 'computer':
      return 'type';
    case 'desk':
      return 'write';
    case 'stove':
      return id === 'warmSelf' || id === 'lightFire' || id === 'putOutFire' ? 'warm' : 'stir';
    case 'sink':
      return 'scrub';
    case 'counter':
      return id === 'mixDrink' ? 'shake' : 'chop';
    case 'fridge':
      return 'rummage';
    case 'shelf':
      return /read|cookbook|research|study/i.test(id) ? 'read' : 'rummage';
    case 'mirror':
    case 'podium':
      return 'gesture';
    case 'piano':
      return 'keys';
    case 'instrument':
      return 'strum';
    case 'easel':
      return 'paint';
    case 'board':
      return 'board';
    case 'telescope':
    case 'camera':
      return 'peer';
    case 'mic':
      return /joke|comed|standup/i.test(id) ? 'joke' : 'sing';
    case 'bassinet':
      return 'cradle';
    case 'tank':
      return 'admire';
    case 'tv':
      return 'still';
    case 'audio':
      return id === 'listen' ? 'still' : 'tinker';
    case 'booth':
      return /dub|record|voice|onAir|radio|interpret|playtest|broadcast|host/i.test(id) ? 'type' : 'write';
    case 'simulator':
      return 'type';
    default:
      return id === 'listen' ? 'still' : 'tinker';
  }
}

/** Where the dweller is: their feet standing, or the middle of the seat's top sitting, and which way they face. */
export interface BodyAt {
  base: THREE.Vector3;
  yaw: number;
  /** Standing height, metres. */
  height: number;
  sitting: boolean;
}

/** Where the hands meet the thing: a point on it at working height, and the line along its front. */
export interface Work {
  point: THREE.Vector3;
  across: THREE.Vector3;
  /** Its floor (for how low it is). */
  floor: number;
}

export type PropKind = 'book' | 'plate' | 'mug' | 'guitar' | 'violin';
export interface Prop {
  kind: PropKind;
  at: THREE.Vector3;
  yaw: number;
  /** Turned about the way they face (a guitar's neck up to the left), and tipped back. */
  roll?: number;
  pitch?: number;
  color?: string;
}

export interface Doing {
  reach?: Reach;
  /** Squatting down to it (0–1). */
  crouch?: number;
  prop?: Prop;
  /** The eyes shut (meditating). */
  shut?: boolean;
  /** In the cleanroom suit for now (put on at the gowning bench). */
  suit?: boolean;
}

const UP = new THREE.Vector3(0, 1, 0);
const wave = (t: number, hz: number, phase = 0) => Math.sin((t * hz + phase) * Math.PI * 2);

/** The hands, the bend and what's held for a motion at time `t` (`seed` keeps two dwellers out of step). */
export function doing(m: Motion, b: BodyAt, work: Work | null, t: number, seed: number, violin = false, color?: string): Doing {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  // The character's left (their +x).
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  const H = b.height;
  const y0 = b.base.y;
  const chest = y0 + (b.sitting ? 0.3 : 0.7) * H;
  const mouth = y0 + (b.sitting ? 0.46 : 0.86) * H;
  const waist = y0 + (b.sitting ? 0.12 : 0.56) * H;
  const front = (ahead: number, side: number, y: number) => b.base.clone().addScaledVector(fwd, ahead).addScaledVector(left, side).setY(y);
  const at = (p: THREE.Vector3, side: number, up = 0, ahead = 0) => p.clone().addScaledVector(work?.across ?? left, side).addScaledVector(UP, up).addScaledVector(fwd, ahead);
  const across = work?.across ?? left;
  // Which way along `across` is the dweller's left (the object's x may run either way).
  const sl = across.dot(left) >= 0 ? 1 : -1;
  const s = seed * 0.37;
  // At a 카센터's lift, tyre changer and tool wall (2026-10-27, the 자동차 정비소; workplaces/mechanicMotion.ts).
  if (RS_SEATS.has(m)) return rsDoing(m as RsSeat, b, t, seed);
  if (BT_SEATS.has(m)) return btDoing(m as BtSeat, b, t, seed);
  if (PG_SEATS.has(m)) return pgDoing(m as PgSeat, b, t, seed);
  if (MECHANIC_MOTIONS.has(m)) return mechanicDoing(m as MechanicMotion, b, work, t);
  // At a 시의원's podium, council desk and phone (2026-10-27, the 시청 의원 사무실; workplaces/politicianMotion.ts).
  if (POLITICIAN_MOTIONS.has(m)) return politicianDoing(m as PoliticianMotion, b, work, t);
  // In a creator studio: selfies, shorts, a dance challenge, a phone in both hands, an unboxing (2026-10-27, the 크리에이터 스튜디오; workplaces/socialMediaMotion.ts).
  if (SOCIAL_MOTIONS.has(m)) return socialDoing(m as SocialMotion, b, work, t);
  // A critic's glass, plate, plinth, proofs, slides, decanter and layout board (2026-10-27, the 잡지사 편집국; workplaces/criticMotion.ts).
  if (CRITIC_MOTIONS.has(m)) return criticDoing(m as CriticMotion, b, work, t);
  // Repotting, grafting, misting, sowing, the climate panel, the koi pond (2026-10-27, the 식물원 온실; workplaces/gardenerMotion.ts).
  if (GARDENER_MOTIONS.has(m)) return gardenerDoing(m as GardenerMotion, b, work, t);
  // Behind the camera, the slate, the edit and the grade, the dailies and the premiere, the sides, the ADR booth, the headshots (2026-10-27, the 영화 제작사; workplaces/filmmakerMotion.ts).
  if (FILM_MOTIONS.has(m)) return filmDoing(m as FilmMotion, b, work, t);
  // The front desk, the concierge's map, the bell desk, the luggage cart, the bed made up, the minibar, the linen, the buffet, the lift, a welcome tea (2026-10-27, the 호텔; workplaces/hotelierMotion.ts).
  if (HOTEL_MOTIONS.has(m)) return hotelDoing(m as HotelMotion, b, work, t);
  // Rope coiled, a parachute packed, a carabiner's gate checked, shoes rented out, a run replayed (2026-10-27, the 익스트림 스포츠 센터; workplaces/extremeAthleteMotion.ts).
  if (EXTREME_MOTIONS.has(m)) return extremeDoing(m as ExtremeMotion, b, work, t);
  // The negotiating table, the desk's globe, a reception's flute, the flags, a 협정 서명식, the interpreters' booth (2026-10-27, the 외교부 청사; workplaces/diplomatMotion.ts).
  if (DIPLOMAT_MOTIONS.has(m)) return diplomatDoing(m as DiplomatMotion, b, work, t);
  // The catwalk, the poses under the strobes, the vanity, a go-see, the fitting podium, backstage, a comp card (2026-10-27, the 모델 에이전시; workplaces/modelMotion.ts).
  if (MODEL_MOTIONS.has(m)) return modelDoing(m as ModelMotion, b, work, t);
  // A case counselled across the desk, donations shelved, lunch ladled out, 바둑, homework, a notice pinned up, volunteers and a donor greeted (2026-10-27, the 종합사회복지관; workplaces/socialWorkerMotion.ts).
  if (WELFARE_MOTIONS.has(m)) return welfareDoing(m as WelfareMotion, b, work, t);
  // The CCTV console, the key cabinet, the alarm and fire panels, a radio, a patrol checkpoint, the speed gate, the visitor desk (2026-10-27, the 빌딩 보안실; workplaces/securityGuardMotion.ts).
  if (SECURITY_MOTIONS.has(m)) return securityDoing(m as SecurityMotion, b, work, t);
  // The sparring mat's dummy, the formation, the route map, the earpiece, the suit locker, the wand at the gate (2026-10-27, the 경호 업체; workplaces/bodyguardMotion.ts).
  if (BODYGUARD_MOTIONS.has(m)) return bodyguardDoing(m as BodyguardMotion, b, work, t);
  // The dive tank, the gear rack, the life ring off the quay, a wetsuit rinsed, the VHF, the rescue drone (2026-10-27, the 해양경찰 파출소; workplaces/coastGuardMotion.ts).
  if (COAST_GUARD_MOTIONS.has(m)) return coastGuardDoing(m as CoastGuardMotion, b, work, t);
  // CPR with the AED trainer, the kit shelf's restock and triage tags, the 119 console, field care at the cot, the cot's checks (2026-10-27, the 119 안전센터; workplaces/paramedicMotion.ts).
  if (EMS_MOTIONS.has(m)) return emsDoing(m as EmsMotion, b, work, t);
  // The bridge simulator's wheel and binoculars, the chart table's rulers and dividers, the stowage plan, the radar, the rescue locker and a drill, the VTS, the weather fax, the bitts, the bell (2026-10-27, the 해운 항만 사무소; workplaces/seafarerMotion.ts).
  if (SEA_MOTIONS.has(m)) return seaDoing(m as SeaMotion, b, work, t);
  // Care at the bed, a meal spooned, a walk at the rail, pills and a blood pressure, 화투, colouring, a song, old photos, the nurse call (2026-10-27, the 요양원; workplaces/careWorkerMotion.ts).
  if (CARE_MOTIONS.has(m)) return careDoing(m as CareMotion, b, work, t);
  // Blood, a dressing, a turn, the family, the sheets, with someone in the hospital bed (workplaces/doctorMotion.ts).
  if (DR_MOTIONS.has(m)) return drDoing(m as DrMotion, b, work, t);
  // Lost property taken in and a print compared at the police station; an extinguisher inspected and a class got ready at the fire station (workplaces/policeMotion.ts, firefighterMotion.ts).
  if (PO_MOTIONS.has(m)) return poDoing(m as PoMotion, b, work, t);
  if (FS_MOTIONS.has(m)) return fsDoing(m as FsMotion, b, work, t);
  // The school record typed, a call to a parent, the duty chart (workplaces/teacherMotion.ts).
  if (TC_MOTIONS.has(m)) return tcDoing(m as TcMotion, b, work, t);
  // The sensory mat, the 보호작업장 bench, the walking bars and a sit-to-stand, the training kitchen and a health check, the symbol board, braille, the computer's switch, painting, the tactile map (2026-10-27, the 장애인 복지관; workplaces/disabilitySupportMotion.ts).
  if (DS_MOTIONS.has(m)) return dsDoing(m as DsMotion, b, work, t);
  // Crafts at the low table, a block tower on the mat, a nap patted in and a crying toddler rocked, the snack poured, hands washed, the 출석 chart, the slide, the cubbies (2026-10-27, the 국공립 어린이집; workplaces/childcareMotion.ts).
  if (CHILDCARE_MOTIONS.has(m)) return childcareDoing(m as ChildcareMotion, b, work, t);
  // The small 어린이집's nappy station, snack table, play kitchen, 알림장 and entryway (workplaces/babysitterMotion.ts).
  if (BS_MOTIONS.has(m)) return bsDoing(m as BsMotion, b, work, t);
  // Pegs, putty, buttons and beads across the fine-motor table, a child's peg test timed, a junior coached, a splint moulded, the mirror box, the sock aid and a sit-to-stand, 화투 pairs and a puzzle, the grip dynamometer (2026-10-27, the 작업치료실; workplaces/occupationalTherapistMotion.ts).
  if (OT_MOTIONS.has(m)) return otDoing(m as OtMotion, b, work, t);
  // Knee and shoulder range on the treatment table, a hot pack, a braced knee, the gym ball, taping, the bands, the training stairs, ultrasound and ICT, the hot-pack heater (2026-10-27, the 재활센터; workplaces/physicalTherapistMotion.ts).
  if (PT_MOTIONS.has(m)) return ptDoing(m as PtMotion, b, work, t);
  // Needles, cups and 뜸 at the treatment bed, the 약장's drawers and scale, the 탕전기, the pulse at the desk, the infrared lamp, the cupping cart, the pouch packer, the 작두 and 약연, 대추차 (2026-10-27, the 한의원; workplaces/koreanMedicineMotion.ts).
  if (KM_MOTIONS.has(m)) return kmDoing(m as KmMotion, b, work, t);
  // The phoropter's dial and the lit chart, the edger's lid and spray, frames taken down and shown, a temple warmed and bent and the glasses set on the nose, the autorefractor, the lensometer, a contact lens on the fingertip, a frame tried at the mirror, the ultrasonic cleaner (2026-10-27, the 안경원; workplaces/opticianMotion.ts).
  if (OP_MOTIONS.has(m)) return opDoing(m as OpMotion, b, work, t);
  // The 국솥 stirred and tasted, serving along the 배식대, the menu desk, hand-washing and the inspector, the store shelf, the 보존식 freezer, the 퇴식구, the dishwasher, the menu sign (2026-10-27, the 단체급식실; workplaces/dietitianMotion.ts).
  if (DT_MOTIONS.has(m)) return dtDoing(m as DtMotion, b, work, t);
  // The chest stand (the patient set up, behind the lead screen, the switch), the CT's and MRI's tables slid in and the scan run from the console, the linac swung round the couch, a word with a radiotherapy patient, the control-room console, a lead apron checked, the contrast injector filled, the changing booth's gowns (2026-10-27, the 영상의학센터; workplaces/radiographerMotion.ts).
  if (RG_MOTIONS.has(m)) return rgDoing(m as RgMotion, b, work, t);
  // The 교탁's board written up and the class turned to, the 질문 책상's red pen and a pupil beside it, the 인강 camera talked to, a 자습실 carrel patrolled, the 성적 게시판 and its D-day card, the 상담 table and the parents, the copier's 모의고사 (2026-10-27, the 입시학원; workplaces/academyTutorMotion.ts).
  if (AT_MOTIONS.has(m)) return atDoing(m as AtMotion, b, work, t);
  // The training car's passenger seat through a 후진 주차, a cone set out on the course, the 검정 booth's score sheet and mic, a screen pointed through (2026-10-27, the 운전면허학원; workplaces/drivingInstructorMotion.ts).
  if (DRIVE_MOTIONS.has(m)) return driveDoing(m as DriveMotion, b, work, t);
  // The belt's box taken off and scanned (삑), cages and the truck's bed filled, the scale's reading, the 구역 shelf, the pallet jack pumped, a box repacked and taped, returns, the 현황판, the 무인 택배함 (2026-10-27, the 택배 물류센터; workplaces/courierMotion.ts).
  if (CX_MOTIONS.has(m)) return cxDoing(m as CxMotion, b, work, t);
  // The bus's walk round and its driver's seat, the farebox settled, the 노선도 and 배차표, the wash bay's lance and brush, the breathalyser and 운행 일지, the CNG nozzle, the 분실물 bins, the 안마의자 (2026-10-27, the 버스 차고지; workplaces/busDriverMotion.ts).
  if (BD_MOTIONS.has(m)) return bdDoing(m as BdMotion, b, work, t);
  // The simulator cab's 마스콘 and 지적확인, a trainee at the shoulder, the 관제 console's keys, hotline and PA mic, the roll call's salute and 음주 측정기, the cab key, the 노선도, the bogie's test hammer (2026-10-27, the 지하철 승무사업소; workplaces/subwayDriverMotion.ts).
  if (SUBWAY_MOTIONS.has(m)) return subwayDoing(m as SubwayMotion, b, work, t);
  // The tactics board's magnets and runs, a team talk, a squat or a bench spotted, a programme on the clipboard, bottles filled, a cup drunk, the lockers, the bus's luggage bay (2026-10-27, the 스포츠 구단 훈련장; workplaces/athleticMotion.ts).
  if (ATH_MOTIONS.has(m)) return athDoing(m as AthMotion, b, work, t);
  // The lookbook posed with the remote in the hand, the 협찬 bag and perfume, a dress form styled, the steamer's wand, polaroids laid out, the OOTD mirror, the shoe wall, a 협찬 box opened (2026-10-27, the 스타일 스튜디오; workplaces/styleInfluencerMotion.ts).
  if (STYLE_MOTIONS.has(m)) return styleDoing(m as StyleMotion, b, work, t);
  // The window's number called, the passbook printed and stamped, cash counted out and through the 지폐 계수기, the rates turned round to a customer, a loan file leafed and stamped, the dealing screens and phone, the vault's wheel and door (2026-10-27, the 은행 지점; workplaces/bankerMotion.ts).
  if (BK_MOTIONS.has(m)) return bkDoing(m as BkMotion, b, work, t);
  if (TOY_MOTIONS.has(m) || toyClientAt(m, b, t)) return toyDoing(m as ToyMotion, b, work, t);
  if (ECO_MOTIONS.has(m)) return ecoDoing(m as EcoMotion, b, work, t);
  if (FARM_MOTIONS.has(m)) return farmDoing(m as FarmMotion, b, work, t);
  if (KG_MOTIONS.has(m)) return kgDoing(m as KgMotion, b, work, t);
  if (YOUTH_MOTIONS.has(m)) return youthDoing(m as YouthMotion, b, work, t);
  if (EL_MOTIONS.has(m)) return elDoing(m as ElMotion, b, work, t);
  // The training car's doors and parts, the 권상기 and its ropes and relays, the 제어반, the 조속기 tripped, the rails gauged, the parts bins, the monitoring desk and map wall, the rounds board, the 정기검사 desk, the safety kit, the van loaded (2026-10-31, the 승강기 서비스센터; workplaces/elevatorTechMotion.ts).
  if (ET_MOTIONS.has(m)) return etDoing(m as EtMotion, b, work, t);
  if (INTERIOR_MOTIONS.has(m)) return interiorDoing(m as InteriorMotion, b, work, t);
  if (SALES_MOTIONS.has(m)) return salesDoing(m as SalesMotion, b, work, t);
  if (TH_MOTIONS.has(m)) return thDoing(m as ThMotion, b, work, t);
  switch (m) {
    case 'type': {
      const p = work?.point ?? front(0.4, 0, waist + 0.2);
      return { reach: { l: at(p, 0.13 * sl, 0.015 * Math.max(0, wave(t, 6.5, s))), r: at(p, -0.13 * sl, 0.015 * Math.max(0, wave(t, 6.5, s + 0.5))), palms: 1.45, lean: 0.24, nod: 0.12, grip: { l: 0.35, r: 0.35 }, tap: true } };
    }
    case 'write': {
      const p = work?.point ?? front(0.35, 0, waist + 0.15);
      return { reach: { l: at(p, 0.17 * sl, 0, -0.03), r: at(p, -0.04 * sl + 0.025 * wave(t, 2.2, s), 0.01 + 0.006 * wave(t, 4.4, s), 0.02 * wave(t, 1.1, s)), palms: 1.25, lean: 0.32, nod: 0.45, grip: { l: 0.2, r: 0.85 } } };
    }
    case 'stir': {
      const p = work?.point ?? front(0.4, 0, y0 + 0.95);
      const a = t * Math.PI * 2 * 1.2;
      return { reach: { r: at(p, -0.02 * sl + Math.cos(a) * 0.06, 0.1, Math.sin(a) * 0.05), l: at(p, 0.3 * sl, 0.03, -0.06), palms: 0.7, lean: 0.15, nod: 0.35, grip: { l: 0.9, r: 0.9 } } };
    }
    case 'scrub': {
      const p = work?.point ?? front(0.4, 0, y0 + 0.9);
      const k = 0.05 * wave(t, 2.6, s);
      return { reach: { l: at(p, (0.09 + k) * sl, 0.03), r: at(p, (-0.09 + k) * sl, 0.03 + 0.02 * wave(t, 5.2, s)), palms: 1.1, lean: 0.36, nod: 0.4, grip: { l: 0.25, r: 0.25 } } };
    }
    case 'chop': {
      const p = work?.point ?? front(0.4, 0, y0 + 0.9);
      return { reach: { r: at(p, -0.1 * sl, 0.03 + 0.05 * Math.abs(wave(t, 2.2, s))), l: at(p, 0.13 * sl, 0.02), palms: 1.3, lean: 0.22, nod: 0.4, grip: { l: 0.2, r: 0.9 } } };
    }
    case 'shake': {
      const p = front(0.28, 0, chest + 0.02 + 0.06 * wave(t, 3.5, s));
      return { reach: { l: p.clone().addScaledVector(left, 0.05), r: p.clone().addScaledVector(left, -0.05).setY(p.y + 0.1), grip: { l: 0.8, r: 0.8 } }, prop: { kind: 'mug', at: p, yaw: b.yaw } };
    }
    case 'rummage': {
      const p = work?.point ?? front(0.45, 0, y0 + 1.1);
      return { reach: { r: at(p, -0.05 * sl, 0.08 * wave(t, 0.35, s), 0.06 + 0.05 * Math.max(0, wave(t, 0.5, s))), l: front(0.12, 0.22, waist + 0.02), grip: { r: 0.6 } } };
    }
    case 'read': {
      // A book up in both hands; now and then a hand goes across to turn the page.
      const turn = Math.max(0, wave(t, 0.18, s)) ** 12;
      const book = front(0.3, 0, b.sitting ? chest + 0.06 : chest - 0.05);
      const l = book.clone().addScaledVector(left, 0.11);
      const r = book.clone().addScaledVector(left, -0.11 + 0.17 * turn).addScaledVector(UP, 0.03 * turn);
      return { reach: { l, r, palms: 0.4, nod: 0.45, grip: { l: 0.45, r: 0.45 } }, prop: { kind: 'book', at: book, yaw: b.yaw } };
    }
    case 'eat': {
      // The plate on the table in front when there is one, else held in the lap; the fork goes to the mouth.
      const plate = work ? work.point.clone() : front(0.32, 0.03, b.sitting ? b.base.y + 0.16 : waist + 0.08);
      const k = (0.5 - 0.5 * Math.cos(t * Math.PI * 2 * 0.28 + s)) ** 2;
      const fork = at(plate, -0.07 * sl, 0.04).lerp(front(0.16, -0.02, mouth - 0.02), k);
      return { reach: { l: work ? at(plate, 0.15 * sl, 0.02, -0.08) : at(plate, 0.08, -0.02), r: fork, palms: 0.9, lean: work ? 0.3 : 0.12, nod: 0.25 * (1 - k), grip: { l: 0.5, r: 0.85 } }, prop: { kind: 'plate', at: plate, yaw: b.yaw } };
    }
    case 'drink': {
      const k = (0.5 - 0.5 * Math.cos(t * Math.PI * 2 * 0.15 + s)) ** 3;
      const cup = front(0.3, -0.12, chest - 0.08).lerp(front(0.14, -0.02, mouth - 0.03), k);
      return { reach: { r: cup, grip: { r: 0.8 } }, prop: { kind: 'mug', at: cup.clone().addScaledVector(UP, -0.02), yaw: b.yaw } };
    }
    case 'paint': {
      const p = work?.point ?? front(0.45, 0, chest);
      return { reach: { r: at(p, -0.08 * sl + 0.1 * wave(t, 0.5, s), 0.08 * wave(t, 0.8, s), -0.04), l: front(0.2, 0.22, waist + 0.05), grip: { l: 0.5, r: 0.85 } } };
    }
    case 'strum': {
      if (violin) {
        // Under the chin on the left shoulder, pointing out to the left; the bow drawn across it.
        const yaw = b.yaw + 0.9;
        const dir = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
        const chin = front(0.08, 0.08, y0 + 0.82 * H);
        const bow = 0.12 * wave(t, 0.6, s);
        return {
          reach: { l: chin.clone().addScaledVector(dir, 0.3).setY(chin.y + 0.04), r: chin.clone().addScaledVector(dir, 0.05).addScaledVector(left, -0.15 + bow).setY(chin.y - 0.03), palms: 0.6, nod: 0.2, grip: { l: 0.6, r: 0.8 } },
          prop: { kind: 'violin', at: chin.clone().addScaledVector(dir, 0.08), yaw: yaw, roll: 0, pitch: -1.35, color },
        };
      }
      // Held across the body, its neck up to the left: the left hand on the neck, the right strumming over the hole.
      const body = front(0.16, -0.03, waist + (b.sitting ? 0.22 : 0.08));
      const roll = -1.15;
      const up = new THREE.Vector3(0, 1, 0);
      const neck = body.clone().addScaledVector(left, Math.sin(-roll) * 0.52).addScaledVector(up, Math.cos(-roll) * 0.52).addScaledVector(fwd, 0.03);
      const hole = body.clone().addScaledVector(left, 0.04).addScaledVector(up, 0.09).addScaledVector(fwd, 0.07);
      return {
        reach: { l: neck, r: hole.addScaledVector(up, 0.04 * wave(t, 3, s)), palms: 0.9, nod: 0.25, grip: { l: 0.75, r: 0.45 } },
        prop: { kind: 'guitar', at: body, yaw: b.yaw, roll, pitch: 0, color },
      };
    }
    case 'keys': {
      const p = work?.point ?? front(0.35, 0, waist + 0.2);
      return { reach: { l: at(p, (0.2 + 0.08 * wave(t, 0.4, s)) * sl, 0.012 * Math.max(0, wave(t, 4, s))), r: at(p, (-0.2 + 0.08 * wave(t, 0.33, s + 0.3)) * sl, 0.012 * Math.max(0, wave(t, 4, s + 0.5))), palms: 1.45, lean: 0.1, nod: 0.2, grip: { l: 0.4, r: 0.4 }, tap: true } };
    }
    case 'talk':
    case 'gesture': {
      // Hands come up to make a point now and then (more often at a mirror or a podium).
      const often = m === 'gesture' ? 0.1 : 0.45;
      const r = wave(t, 0.23, s) > often ? front(0.3 + 0.05 * wave(t, 0.9, s), -0.16, waist + 0.18 + 0.08 * wave(t, 0.7, s)) : undefined;
      const l = wave(t, 0.17, s + 0.4) > often + 0.3 ? front(0.28, 0.18, waist + 0.14 + 0.06 * wave(t, 0.6, s)) : undefined;
      return r || l ? { reach: { r, l, palms: 0.3, grip: { l: 0.15, r: 0.15 } } } : {};
    }
    case 'dance': {
      const bounce = 0.5 + 0.5 * wave(t, 1.8, s);
      const up = chest + 0.3 + 0.12 * wave(t, 0.9, s);
      return {
        reach: { l: front(0.15, 0.32 + 0.08 * wave(t, 0.9, s), up), r: front(0.15, -0.32 - 0.08 * wave(t, 0.9, s + 0.5), chest + 0.3 + 0.12 * wave(t, 0.9, s + 0.5)), grip: { l: 0.2, r: 0.2 } },
        crouch: 0.12 * bounce,
      };
    }
    case 'tinker': {
      const p = work?.point ?? front(0.4, 0, y0 + 0.9);
      const h = p.y - (work?.floor ?? y0);
      const crouch = THREE.MathUtils.clamp((0.75 - h) / 0.5, 0, 1);
      const lean = crouch > 0 ? 0.35 : THREE.MathUtils.clamp((1.05 - h) * 0.9, 0, 0.5);
      return { reach: { l: at(p, 0.14 * sl + 0.03 * wave(t, 0.7, s), 0.02), r: at(p, -0.12 * sl + 0.05 * wave(t, 1.6, s), 0.02 + 0.03 * Math.max(0, wave(t, 2.1, s))), palms: 1.0, lean, nod: 0.35, grip: { l: 0.6, r: 0.6 } }, crouch };
    }
    case 'admire':
      return { reach: { r: front(0.1, -0.03, mouth - 0.07), l: front(0.13, -0.04, waist + 0.08), nod: -0.08, grip: { l: 0.4, r: 0.55 } } };
    case 'peer': {
      // Hands either side of the camera (one finger on the shutter now and then), the face to the
      // eyepiece or the screen: bent down to it if it's lower than their eyes.
      const p = work?.point ?? front(0.4, 0, chest + 0.1);
      const eye = y0 + 0.93 * H;
      const lean = THREE.MathUtils.clamp((eye - p.y) * 1.6, 0, 0.6);
      const click = Math.max(0, wave(t, 0.4, s)) ** 8;
      return { reach: { l: at(p, 0.12 * sl, -0.03, -0.06), r: at(p, -0.12 * sl, -0.03 + 0.02 * click, -0.06), lean, nod: 0.1, palms: 0.5, grip: { l: 0.7, r: 0.5 + 0.3 * click } } };
    }
    case 'sing': {
      const p = work?.point ?? front(0.25, 0, mouth - 0.05);
      return { reach: { r: at(p, 0, -0.04), l: wave(t, 0.2, s) > 0 ? front(0.3, 0.2, chest + 0.05 * wave(t, 0.6, s)) : undefined, grip: { l: 0.15, r: 0.9 } } };
    }
    case 'perform': {
      // Singing on a stage (2026-10-26): one hand on the mic, the other playing to the crowd — held
      // out to them, to the heart, up high on the big note — a bounce to the beat, the chin up.
      const p = work?.point ?? front(0.25, 0, mouth - 0.05);
      const phrase = (t / 3.2 + s) % 3;
      const beat = 0.5 + 0.5 * wave(t, 1.6, s);
      const sway = 0.04 * wave(t, 0.8, s);
      const l =
        phrase < 1
          ? front(0.45, 0.42 + sway, chest + 0.12 + 0.06 * wave(t, 0.8, s))
          : phrase < 2
            ? front(0.18, 0.06, chest + 0.02)
            : front(0.3, 0.5, y0 + H * (1.1 + 0.03 * wave(t, 1.6, s)));
      return { reach: { r: at(p, 0, -0.05), l, lean: -0.04, nod: -0.12 + 0.06 * wave(t, 0.8, s), palms: 0, grip: { l: phrase < 1 ? 0.1 : 0.3, r: 0.95 } }, crouch: 0.05 * beat };
    }
    case 'joke': {
      // Stand-up (2026-10-26, at the user's request): the mic hand at the mic, the other telling the
      // story — small beats at the waist, drawn in to the chest leaning in for the build, then thrown
      // open to the room for the punchline, leaning back to let it land. No bounce: it's talk.
      const p = work?.point ?? front(0.25, 0, mouth - 0.05);
      const bit = (t / 5.5 + s) % 1;
      const beat = 0.035 * wave(t, 1.4, s);
      const l =
        bit < 0.55
          ? front(0.3, 0.22 + beat, waist + 0.2 + 0.05 * wave(t, 0.7, s))
          : bit < 0.75
            ? front(0.2, 0.08, chest + 0.02)
            : front(0.42, 0.48, chest + 0.1 + 0.04 * wave(t, 0.5, s));
      const lean = bit < 0.55 ? 0.03 : bit < 0.75 ? 0.1 : -0.06;
      const nod = bit < 0.75 ? 0.05 + 0.04 * wave(t, 1.1, s) : -0.14;
      return { reach: { r: at(p, 0, -0.05), l, lean, nod, palms: bit >= 0.75 ? -0.5 : 0.2, grip: { l: bit >= 0.75 ? 0.05 : 0.25, r: 0.95 } } };
    }
    case 'cradle': {
      const p = work?.point ?? front(0.4, 0, y0 + 0.8);
      return { reach: { l: at(p, 0.12 * sl, 0.02 * wave(t, 0.4, s)), r: at(p, -0.12 * sl, 0.02 * wave(t, 0.4, s)), lean: 0.45, nod: 0.4, palms: 1.6, grip: { l: 0.3, r: 0.3 } } };
    }
    case 'warm': {
      // The palms held out to the fire, and now and then rubbed together.
      const rub = Math.max(0, wave(t, 0.08, s) - 0.55) / 0.45;
      const k = 0.14 * (1 - rub * 0.85);
      const shift = 0.025 * rub * wave(t, 2.2, s);
      return { reach: { l: front(0.42, k + shift, chest - 0.1), r: front(0.42, -k + shift, chest - 0.1), palms: -0.6 * (1 - rub), lean: 0.12, grip: { l: 0.05, r: 0.05 } } };
    }
    case 'lather': {
      const top = y0 + 0.93 * H;
      return { reach: { l: front(0.03, 0.09 + 0.03 * wave(t, 1.6, s), top + 0.03 * wave(t, 3.2, s)), r: front(0.03, -0.09 + 0.03 * wave(t, 1.6, s + 0.5), top + 0.03 * wave(t, 3.2, s + 0.5)), nod: -0.12, grip: { l: 0.35, r: 0.35 } } };
    }
    case 'lap':
    case 'knees': {
      const ahead = m === 'lap' ? 0.25 : 0.36;
      return { reach: { l: front(ahead, 0.11, b.base.y + 0.13), r: front(ahead, -0.11, b.base.y + 0.13), palms: 1.4, grip: { l: 0.25, r: 0.25 } } };
    }
    case 'board': {
      const p = work?.point ?? front(0.4, 0, chest + 0.1);
      return { reach: { r: at(p, -0.05 * sl + 0.12 * wave(t, 0.3, s), 0.06 * wave(t, 1.1, s), -0.03), grip: { r: 0.85 } } };
    }
    case 'meditate':
    case 'guide': {
      // Sat cross-legged on a cushion (2026-10-26, at the user's request): the hands resting on the
      // knees palms up, the head a little bowed, the eyes shut. Leading it, the teacher comes back to
      // that between talking the room through: the palms rising before the body with a long breath in
      // and sinking with the breath out, a hand to the heart, a hand opened out to the room.
      const k = H / 1.6;
      const knee = (side: number) => front(0.2 * k, side * 0.25 * k, y0 + 0.06 * k);
      type Key = { l: THREE.Vector3; r: THREE.Vector3; palms: number; lean: number; nod: number; shut: boolean };
      const rest: Key = { l: knee(1), r: knee(-1), palms: -1.25, lean: 0.12, nod: 0.14, shut: true };
      if (m === 'meditate') return { reach: { l: rest.l, r: rest.r, palms: rest.palms, lean: rest.lean, nod: rest.nod, grip: { l: 0.35, r: 0.35 } }, shut: true };
      // 0 breathed out … 1 breathed in, about 5.5 s a breath.
      const breath = 0.5 - 0.5 * Math.cos((t / 5.5 + s) * Math.PI * 2);
      const belly = waist + (0.03 + 0.2 * breath) * k;
      const keys: Key[] = [
        rest,
        { l: front(0.26 * k, 0.13 * k, belly), r: front(0.26 * k, -0.13 * k, belly), palms: -1.3, lean: 0.04, nod: 0.04 - 0.08 * breath, shut: false },
        { l: knee(1), r: front(0.14 * k, -0.04 * k, chest - 0.04 * k), palms: 0.3, lean: 0.02, nod: 0.08, shut: true },
        { l: knee(1), r: front(0.4 * k, -0.28 * k, waist + 0.12 * k), palms: -1.15, lean: 0.06, nod: -0.06, shut: false },
      ];
      // Each held a while, then eased into the next: 18 s round.
      const x = (((t / 18 + s) % 1) + 1) % 1 * keys.length;
      const i = Math.floor(x);
      const e = THREE.MathUtils.smoothstep(x - i, 0.7, 1);
      const a = keys[i];
      const z = keys[(i + 1) % keys.length];
      const mix = (p: number, q: number) => p + (q - p) * e;
      return {
        reach: { l: a.l.clone().lerp(z.l, e), r: a.r.clone().lerp(z.r, e), palms: mix(a.palms, z.palms), lean: mix(a.lean, z.lean), nod: mix(a.nod, z.nod), grip: { l: 0.3, r: 0.25 } },
        shut: e < 0.5 ? a.shut : z.shut,
      };
    }
    case 'restrain': {
      // Arrest drill on a dummy (2026-10-26, the police station; `work` its right wrist): squared up
      // with the hands up on guard, then the wrist seized in the left hand and the right pressing the
      // elbow down, then the arm turned in and down — bent in over it, both hands at the wrist as the
      // cuffs go on — and back to guard. Each held a beat, the grip straining a little.
      const p = work?.point ?? front(0.4, 0, waist + 0.15);
      type Key = { l: THREE.Vector3; r: THREE.Vector3; lean: number; crouch: number; nod: number; palms: number; grip: number };
      const strain = 0.012 * wave(t, 3.3, s);
      const keys: Key[] = [
        { l: front(0.3, 0.15, chest - 0.04), r: front(0.27, -0.15, chest - 0.01), lean: 0.06, crouch: 0.14, nod: 0.04, palms: 0.3, grip: 0.35 },
        { l: at(p, 0.04 * sl, strain), r: at(p, -0.13 * sl, 0.17 + strain, -0.03), lean: 0.24, crouch: 0.2, nod: 0.22, palms: 0.9, grip: 0.95 },
        { l: at(p, 0.02 * sl, -0.2 + strain, 0.05), r: at(p, -0.07 * sl, -0.12 - strain, 0.03), lean: 0.42, crouch: 0.32, nod: 0.42, palms: 1.25, grip: 0.95 },
      ];
      // About 5 s round, each held then eased into the next.
      const x = ((((t / 5 + s) % 1) + 1) % 1) * keys.length;
      const i = Math.floor(x);
      const e = THREE.MathUtils.smoothstep(x - i, 0.55, 1);
      const a = keys[i];
      const z = keys[(i + 1) % keys.length];
      const mix = (q: number, r: number) => q + (r - q) * e;
      const g = mix(a.grip, z.grip);
      return { reach: { l: a.l.clone().lerp(z.l, e), r: a.r.clone().lerp(z.r, e), lean: mix(a.lean, z.lean), nod: mix(a.nod, z.nod), palms: mix(a.palms, z.palms), grip: { l: g, r: g } }, crouch: mix(a.crouch, z.crouch) };
    }
    case 'meeting': {
      // At a meeting (2026-10-26, the office, at the user's request): a notebook in the left hand (on
      // the table when sat at one) — listening and nodding along, jotting a line down, making a point
      // with the pen hand; stood round a board (`work` on it), pointing something out on it; sat,
      // chin in hand thinking it over. Each held a while, ~20 s round; the seed puts a room out of
      // step, so someone's talking while the others listen.
      const k = H / 1.6;
      const shoulder = front(0, -0.17 * k, chest + 0.12 * k);
      const pad = b.sitting ? front(0.34 * k, 0.05 * k, waist + 0.14 * k) : front(0.24 * k, 0.07 * k, waist + 0.15 * k);
      const low = b.sitting ? pad.clone() : front(0.18 * k, 0.15 * k, waist + 0.04 * k);
      type Key = { l: THREE.Vector3; r: THREE.Vector3; pad: THREE.Vector3; lean: number; nod: number; palms: number; grip: number };
      const holding = pad.clone().addScaledVector(left, 0.1 * k);
      const listen: Key = { l: holding, r: pad.clone().addScaledVector(left, -0.08 * k).addScaledVector(UP, 0.01), pad, lean: 0.04, nod: 0.06 + 0.08 * Math.max(0, wave(t, 0.45, s)) ** 4, palms: 0.9, grip: 0.45 };
      const scrawl = pad.clone().addScaledVector(left, -0.03 + 0.025 * wave(t, 2.2, s)).addScaledVector(UP, 0.015 + 0.006 * wave(t, 4.4, s));
      const note: Key = { l: holding, r: scrawl, pad, lean: 0.1, nod: 0.42, palms: 1.15, grip: 0.8 };
      const speak: Key = { l: low.clone().addScaledVector(left, 0.08 * k), r: front(0.34 * k, -0.13 * k, chest - 0.03 * k + 0.05 * wave(t, 0.7, s)), pad: low, lean: 0.03, nod: -0.04, palms: -0.4, grip: 0.15 };
      let last: Key;
      if (!b.sitting && work) {
        const tip = shoulder.clone().addScaledVector(work.point.clone().sub(shoulder).normalize(), Math.min(0.58 * k, work.point.distanceTo(shoulder)));
        last = { l: low.clone().addScaledVector(left, 0.07 * k), r: tip, pad: low, lean: -0.02, nod: -0.06, palms: 0.2, grip: 0.7 };
      } else last = { l: holding, r: front(0.13 * k, -0.02 * k, mouth - 0.09 * k), pad, lean: 0.14, nod: 0.05, palms: 0.4, grip: 0.5 };
      const keys = [listen, note, speak, listen, last];
      const x = ((((t / 20 + s) % 1) + 1) % 1) * keys.length;
      const i = Math.floor(x);
      const e = THREE.MathUtils.smoothstep(x - i, 0.7, 1);
      const a = keys[i];
      const z = keys[(i + 1) % keys.length];
      const mix = (q: number, r: number) => q + (r - q) * e;
      return {
        reach: { l: a.l.clone().lerp(z.l, e), r: a.r.clone().lerp(z.r, e), lean: mix(a.lean, z.lean), nod: mix(a.nod, z.nod), palms: mix(a.palms, z.palms), grip: { l: 0.55, r: mix(a.grip, z.grip) } },
        prop: { kind: 'book', at: a.pad.clone().lerp(z.pad, e), yaw: b.yaw },
      };
    }
    case 'teach': {
      // Teaching at the chalkboard (2026-10-27; see lessonBeat): `work` is where the board's first
      // line starts, the body turned by the board's own spot. The open textbook stays in the left
      // hand; the chalk hand writes the line along as it appears, explains with it out to the class,
      // points back at what's written, goes up asking who knows.
      const k = H / 1.6;
      const beat = lessonBeat(t);
      const oy = b.yaw - beat.yaw;
      const ox = new THREE.Vector3(Math.cos(oy), 0, -Math.sin(oy));
      const start = work?.point ?? front(0.45, 0.25, y0 + 0.95 * H);
      const linePt = (row: number, along: number) => start.clone().addScaledVector(ox, LESSON_LINE.len * along).addScaledVector(UP, -LESSON_LINE.gap * row);
      const shoulder = front(0, -0.17 * k, chest + 0.12 * k);
      type Key = { l: THREE.Vector3; r: THREE.Vector3; lean: number; nod: number; palms: number; gr: number };
      const pose = (key: typeof beat.from): Key => {
        const book = front(0.22 * k, 0.13 * k, waist + 0.12 * k);
        switch (key) {
          case 'write':
            return { l: book, r: linePt(beat.row, beat.line).addScaledVector(fwd, -0.03).addScaledVector(UP, 0.012 * wave(t, 2.6)), lean: 0, nod: -0.16, palms: 0.5, gr: 0.85 };
          case 'explain':
            return { l: book, r: front(0.34 * k, -0.25 * k, chest - 0.02 * k + 0.04 * k * wave(t, 0.7, s)), lean: 0.03, nod: -0.04 + 0.04 * Math.max(0, wave(t, 0.9, s)), palms: -0.6, gr: 0.35 };
          case 'point': {
            const p = linePt(beat.row, 0.3);
            const tip = shoulder.clone().addScaledVector(p.clone().sub(shoulder).normalize(), Math.min(0.6 * k, p.distanceTo(shoulder)));
            return { l: book, r: tip, lean: -0.02, nod: -0.06, palms: 0.1, gr: 0.6 };
          }
          default:
            return { l: book, r: front(0.16 * k, -0.22 * k, y0 + 0.97 * H + 0.02 * wave(t, 1.2, s)), lean: -0.02, nod: -0.08, palms: 0, gr: 0.1 };
        }
      };
      const a = pose(beat.from);
      const z = beat.e > 0 ? pose(beat.to) : a;
      const e = beat.e;
      const mix = (q: number, r: number) => q + (r - q) * e;
      const l = a.l.clone().lerp(z.l, e);
      return {
        reach: { l, r: a.r.clone().lerp(z.r, e), lean: mix(a.lean, z.lean), nod: mix(a.nod, z.nod), palms: mix(a.palms, z.palms), grip: { l: 0.55, r: mix(a.gr, z.gr) } },
        prop: { kind: 'book', at: l.clone().addScaledVector(left, -0.06 * k), yaw: b.yaw },
      };
    }
    case 'present': {
      // Presenting at a board or a screen (2026-10-26, the office): stood beside it turned out to the
      // room (`work` a point on it, to the right hand) — the arm out pointing back at it, then both
      // hands opened to the room making the case, a beat with the right as the point lands, then the
      // hands together at the waist taking a question with a nod. Each held a while, ~18 s round.
      const k = H / 1.6;
      const p = work?.point ?? front(0.5 * k, -0.55 * k, chest + 0.2 * k);
      const shoulder = front(0, -0.17 * k, chest + 0.12 * k);
      const tip = shoulder.clone().addScaledVector(p.clone().sub(shoulder).normalize(), Math.min(0.6 * k, p.distanceTo(shoulder)));
      const beat = 0.04 * Math.max(0, wave(t, 1.3, s));
      type Key = { l: THREE.Vector3; r: THREE.Vector3; lean: number; nod: number; palms: number; gl: number; gr: number };
      const keys: Key[] = [
        { l: front(0.22 * k, 0.1 * k, waist + 0.06 * k), r: tip, lean: -0.02, nod: -0.04, palms: 0.1, gl: 0.7, gr: 0.55 },
        { l: front(0.32 * k, 0.3 * k, chest - 0.04 * k + 0.02 * wave(t, 0.6, s)), r: front(0.32 * k, -0.28 * k, chest - 0.06 * k), lean: 0.02, nod: -0.06, palms: -0.9, gl: 0.1, gr: 0.1 },
        { l: front(0.2 * k, 0.1 * k, waist + 0.08 * k), r: front(0.3 * k, -0.12 * k, chest - 0.02 * k - beat), lean: 0.05, nod: 0.02, palms: 0.4, gl: 0.6, gr: 0.3 },
        { l: front(0.2 * k, 0.03 * k, waist + 0.1 * k), r: front(0.2 * k, -0.05 * k, waist + 0.1 * k), lean: 0.02, nod: 0.08 + 0.06 * Math.max(0, wave(t, 0.5, s)) ** 4, palms: 1.3, gl: 0.5, gr: 0.5 },
      ];
      const x = ((((t / 18 + s) % 1) + 1) % 1) * keys.length;
      const i = Math.floor(x);
      const e = THREE.MathUtils.smoothstep(x - i, 0.7, 1);
      const a = keys[i];
      const z = keys[(i + 1) % keys.length];
      const mix = (q: number, r: number) => q + (r - q) * e;
      return { reach: { l: a.l.clone().lerp(z.l, e), r: a.r.clone().lerp(z.r, e), lean: mix(a.lean, z.lean), nod: mix(a.nod, z.nod), palms: mix(a.palms, z.palms), grip: { l: mix(a.gl, z.gl), r: mix(a.gr, z.gr) } } };
    }
    case 'argue': {
      // At the podium (2026-10-27; see argueBeat): `work` the papers on its top; the body turned by
      // the podium's own spot. The left hand keeps to the papers while the right makes the case; turned
      // round to the room, the left is opened out to them and the right drops to the waist.
      const k = H / 1.6;
      const p = work?.point ?? front(0.35 * k, 0, waist + 0.3 * k);
      const beat = argueBeat(t, toolPhase(b.base));
      const bob = 0.03 * k * wave(t, 1.2, s);
      type Key = { l: THREE.Vector3; r: THREE.Vector3; lean: number; nod: number; palms: number; gl: number; gr: number };
      const pose = (key: ArgueKey): Key => {
        switch (key) {
          case 'read':
            return { l: at(p, 0.1 * sl, 0.01, -0.02), r: at(p, (-0.1 + 0.05 * Math.max(0, wave(t, 0.25, s)) ** 6) * sl, 0.02, 0.02), lean: 0.14, nod: 0.42, palms: 1.35, gl: 0.2, gr: 0.45 };
          case 'argue':
            return { l: at(p, 0.11 * sl, 0.01), r: front(0.36 * k, -0.2 * k, chest - 0.03 * k + bob), lean: 0.07, nod: -0.03 + 0.05 * Math.max(0, wave(t, 1.2, s)), palms: -0.7, gl: 0.2, gr: 0.15 };
          case 'point':
            return { l: at(p, 0.11 * sl, 0.01), r: front(0.3 * k, -0.15 * k, y0 + 0.88 * H + 0.04 * k * Math.max(0, wave(t, 1.6, s)) ** 2), lean: 0.09, nod: -0.08, palms: 0.2, gl: 0.2, gr: 0.75 };
          case 'gallery':
            return { l: front(0.38 * k, 0.36 * k, chest - 0.02 * k + 0.03 * k * wave(t, 0.6, s)), r: front(0.2 * k, -0.15 * k, waist + 0.1 * k), lean: 0.02, nod: -0.06, palms: -0.9, gl: 0.1, gr: 0.4 };
          default:
            return { l: at(p, 0.2 * sl, 0, -0.07), r: at(p, -0.2 * sl, 0, -0.07), lean: 0.08, nod: 0.08 + 0.08 * Math.max(0, wave(t, 0.5, s)) ** 4, palms: 1.3, gl: 0.55, gr: 0.55 };
        }
      };
      const a = pose(beat.from);
      const z = beat.e > 0 ? pose(beat.to) : a;
      const e = beat.e;
      const mix = (q: number, r: number) => q + (r - q) * e;
      return { reach: { l: a.l.clone().lerp(z.l, e), r: a.r.clone().lerp(z.r, e), lean: mix(a.lean, z.lean), nod: mix(a.nod, z.nod), palms: mix(a.palms, z.palms), grip: { l: mix(a.gl, z.gl), r: mix(a.gr, z.gr) } } };
    }
    case 'stream':
    case 'streamChat':
    case 'streamCast':
    case 'donation':
    case 'skit': {
      // Streaming (2026-10-27; see streamBeat): `work` the keyboard's middle at the desk, the spot
      // turned by the desk itself for the chat; in front of a green screen, stood acting to the lens.
      const k = H / 1.6;
      const p = work?.point ?? front(0.38 * k, 0, waist + 0.2 * k);
      const beat = streamBeat(m, t, toolPhase(b.base));
      const tapL = 0.012 * Math.max(0, wave(t, 5.5, s));
      const tapR = 0.012 * Math.max(0, wave(t, 5.5, s + 0.5));
      const wasd = at(p, (0.11 + 0.012 * wave(t, 0.9, s)) * sl, 0.01 + tapL, 0.01 * wave(t, 1.3, s));
      const mouse = at(p, (-0.3 + 0.025 * wave(t, 0.7, s + 0.2)) * sl, 0.005, 0.02 * wave(t, 0.5, s + 0.6));
      type Key = { l: THREE.Vector3; r: THREE.Vector3; lean: number; nod: number; palms: number; gl: number; gr: number; tap?: boolean };
      const pair = (ahead: number, side: number, y: number) => [front(ahead * k, side * k, y), front(ahead * k, -side * k, y)] as const;
      const pose = (key: StreamKey): Key => {
        switch (key) {
          case 'play':
            return { l: wasd, r: mouse, lean: 0.2 + 0.07 * Math.max(0, wave(t, 0.13, s)) ** 2, nod: 0.04, palms: 1.4, gl: 0.35, gr: 0.5, tap: true };
          case 'talk':
            return { l: wasd, r: front(0.3 * k, -0.15 * k, chest - 0.02 * k + 0.04 * k * wave(t, 0.7, s)), lean: 0.04, nod: -0.04 + 0.04 * Math.max(0, wave(t, 1.1, s)), palms: -0.6, gl: 0.35, gr: 0.12 };
          case 'react': {
            const [l, r] = pair(0.06, 0.12, mouth + 0.08 * k);
            return { l, r, lean: -0.12, nod: -0.16, palms: 0.2, gl: 0.25, gr: 0.25 };
          }
          case 'chat':
            return { l: at(p, 0.08 * sl, 0.012 + tapL), r: at(p, -0.08 * sl, 0.012 + tapR), lean: 0.18, nod: 0.22, palms: 1.45, gl: 0.35, gr: 0.35, tap: true };
          case 'scroll':
            return { l: at(p, 0.16 * sl, 0.005, -0.03), r: at(p, -0.3 * sl, 0.005 + 0.004 * wave(t, 2.2, s), 0.01), lean: 0.12, nod: 0.1, palms: 1.3, gl: 0.3, gr: 0.5 };
          case 'laugh': {
            const c = 0.035 * Math.max(0, wave(t, 2.6, s));
            const [l, r] = pair(0.26, 0.035 + c, chest + 0.02 * k);
            return { l, r, lean: -0.1 + 0.08 * wave(t, 1.3, s), nod: -0.12, palms: 0, gl: 0.1, gr: 0.1 };
          }
          case 'watch':
            return { l: at(p, 0.22 * sl, 0, -0.07), r: at(p, -0.22 * sl, 0, -0.07), lean: 0.24, nod: -0.02, palms: 1.25, gl: 0.45, gr: 0.45 };
          case 'point':
            return { l: at(p, 0.2 * sl, 0, -0.06), r: front(0.5 * k, -0.06 * k, mouth + 0.02 * k + 0.02 * k * Math.max(0, wave(t, 1.6, s))), lean: 0.12, nod: -0.04, palms: 0.2, gl: 0.45, gr: 0.75 };
          case 'wow':
          case 'shock': {
            const [l, r] = pair(0.1, 0.075, mouth - 0.02 * k);
            return { l, r, lean: key === 'shock' ? -0.14 : -0.1, nod: -0.11, palms: 0, gl: 0.05, gr: 0.05 };
          }
          case 'bow': {
            const [l, r] = pair(0.2, 0.02, chest - 0.02 * k);
            return { l, r, lean: 0.12 + 0.28 * Math.max(0, wave(t, 0.55, s)), nod: 0.32, palms: 0, gl: 0.05, gr: 0.05 };
          }
          case 'heart': {
            const [l, r] = pair(0.08, 0.06, mouth + 0.3 * k);
            return { l, r, lean: -0.03, nod: -0.06, palms: 0, gl: 0.35, gr: 0.35 };
          }
          case 'cheer': {
            const [l, r] = pair(0.1, 0.27, mouth + 0.26 * k + 0.04 * k * wave(t, 1.8, s));
            return { l, r, lean: -0.06, nod: -0.12, palms: 0, gl: 0.95, gr: 0.95 };
          }
          case 'shrug': {
            const [l, r] = pair(0.25, 0.32, waist + 0.08 * k + 0.02 * k * wave(t, 0.8, s));
            return { l, r, lean: -0.02, nod: 0.06, palms: -1.0, gl: 0.05, gr: 0.05 };
          }
          case 'aim':
            return { l: front(0.12 * k, 0.22 * k, waist + 0.02 * k), r: front(0.55 * k, -0.08 * k, chest + 0.12 * k + 0.02 * k * Math.max(0, wave(t, 1.4, s))), lean: 0.06, nod: -0.04, palms: 0.2, gl: 0.3, gr: 0.75 };
          case 'hips': {
            const [l, r] = pair(-0.02, 0.21, waist + 0.02 * k);
            return { l, r, lean: -0.04, nod: -0.06, palms: 0.6, gl: 0.6, gr: 0.6 };
          }
          default:
            return { l: front(0.12 * k, 0.18 * k, waist + 0.02 * k), r: front(0.25 * k, (-0.28 + 0.06 * wave(t, 1.8, s)) * k, mouth + 0.12 * k), lean: 0, nod: -0.04, palms: -1.2, gl: 0.3, gr: 0.05 };
        }
      };
      const a = pose(beat.from);
      const z = beat.e > 0 ? pose(beat.to) : a;
      const e = beat.e;
      const mix = (q: number, r: number) => q + (r - q) * e;
      return { reach: { l: a.l.clone().lerp(z.l, e), r: a.r.clone().lerp(z.r, e), lean: mix(a.lean, z.lean), nod: mix(a.nod, z.nod), palms: mix(a.palms, z.palms), grip: { l: mix(a.gl, z.gl), r: mix(a.gr, z.gr) }, tap: (e < 0.5 ? a : z).tap } };
    }
    case 'asmr': {
      // ASMR at a dummy-head mic (2026-10-27, the 스트리밍 하우스): leant in close, `work` the middle
      // of the head between its ears — a soft brush going slowly round one ear, then the other, the
      // free hand cupped by the far ear; whispered, the head bowed in.
      const k = H / 1.6;
      const p = work?.point ?? front(0.35 * k, 0, mouth - 0.05 * k);
      const side = wave(t, 0.06, s);
      const sm = THREE.MathUtils.smoothstep;
      const onL = sm(side, -0.2, 0.4);
      const onR = sm(-side, -0.2, 0.4);
      const a = t * Math.PI * 2 * 0.45;
      const ear = 0.105;
      const l = at(p, (ear + 0.02 + 0.015 * onL * Math.cos(a)) * sl, 0.02 * onL * Math.sin(a), -0.02);
      const r = at(p, -(ear + 0.02 + 0.015 * onR * Math.cos(a + 1)) * sl, 0.02 * onR * Math.sin(a + 1), -0.02);
      return { reach: { l, r, lean: 0.28, nod: 0.16, palms: 0.3, grip: { l: 0.35 + 0.35 * onL, r: 0.35 + 0.35 * onR } } };
    }
    case 'gamepad': {
      // Playing a build with a controller (2026-10-27, the game studio's play-test seat): both hands
      // round the pad (`work`, drawn on the desk in front of them), the thumbs going, the pad jinking
      // with the play; now and then a hard bit leans them in towards the screen, then back again.
      const p = work?.point ?? front(0.3, 0, waist + 0.12);
      const tense = Math.max(0, wave(t, 0.07, s)) ** 2;
      const jink = 0.008 * wave(t, 1.3, s) * (0.5 + tense);
      const tip = 0.005 * wave(t, 2.9, s + 0.2);
      return {
        reach: { l: at(p, 0.075 * sl + jink, tip), r: at(p, -0.075 * sl + jink, -tip), palms: 0.55, lean: -0.03 + 0.2 * tense, nod: 0.08 + 0.05 * tense, grip: { l: 0.75, r: 0.75 }, tap: true },
      };
    }
    case 'host': {
      // A talk show's host at the desk (2026-10-26, at the user's request): the cue cards in the left
      // hand on the desk, the right resting by them — now and then opened out to the guests on the
      // sofa (to the host's right, as on TV), leant in on to listen, or up making a point to the camera.
      const p = work?.point ?? front(0.35, 0, waist + 0.2);
      const bit = (t / 6.5 + s) % 1;
      const r =
        bit < 0.3
          ? at(p, -0.15 * sl, 0.01)
          : bit < 0.55
            ? front(0.42, -0.34, chest - 0.02 + 0.03 * wave(t, 0.6, s))
            : bit < 0.75
              ? at(p, -0.08 * sl, 0.01, 0.05)
              : front(0.3, -0.12, chest + 0.06 + 0.02 * wave(t, 1.2, s));
      const open = bit >= 0.3 && bit < 0.55;
      return {
        reach: { l: at(p, 0.13 * sl, 0.02, -0.02), r, lean: bit < 0.3 ? 0.1 : bit < 0.55 ? 0.03 : bit < 0.75 ? 0.2 : 0, nod: bit >= 0.75 ? -0.08 : 0.06, palms: open ? -0.9 : bit >= 0.75 ? 0.1 : 1.3, grip: { l: 0.75, r: open ? 0.1 : 0.3 } },
      };
    }
    case 'skydive': {
      // Flying in the box (`base` the middle of the body, face down, the head along `yaw`): the hands
      // out either side of the head a little above the back, flat to the air; now and then one dips
      // and the other lifts to turn, and they tremble in the wind.
      const k = H / 1.6;
      const turn = 0.05 * wave(t, 0.07, s);
      const buffet = (p: number) => 0.012 * wave(t, 2.3, s + p);
      return {
        reach: {
          l: front(0.36 * k, 0.36 * k, y0 + 0.1 * k + turn + buffet(0)),
          r: front(0.36 * k, -0.36 * k, y0 + 0.1 * k - turn + buffet(0.4)),
          palms: 0.5,
          grip: { l: 0.06, r: 0.06 },
        },
      };
    }
    case 'gforce': {
      // In a centrifuge's gondola as it spins (2026-10-26): pressed back into the seat, hands tight on the
      // grips by the hips, the head back against the rest — the pull comes in waves (strain, then breathe).
      const strain = 0.5 + 0.5 * wave(t, 0.11, s);
      return {
        reach: {
          l: front(0.1, 0.17, y0 + 0.1),
          r: front(0.1, -0.17, y0 + 0.1),
          lean: -0.06 - 0.08 * strain,
          nod: -0.12 - 0.14 * strain,
          palms: 0.2,
          grip: { l: 0.75 + 0.25 * strain, r: 0.75 + 0.25 * strain },
        },
      };
    }
    case 'pilot': {
      // Sat at a spacecraft's controls: a hand controller under each hand at the ends of the armrests,
      // nudged; every so often the right hand goes up to a switch on the panel (`work`) and back.
      const up = Math.max(0, wave(t, 0.08, s)) ** 4;
      const nudge = (p: number) => new THREE.Vector3(0.012 * wave(t, 0.6, s + p), 0.008 * wave(t, 0.9, s + p), 0.012 * wave(t, 0.45, s + p + 0.3));
      const l = front(0.26, 0.26, y0 + 0.24).add(nudge(0));
      const grip = front(0.26, -0.26, y0 + 0.24).add(nudge(0.5));
      const r = work ? grip.lerp(at(work.point, 0, 0.01 * wave(t, 3, s), -0.03), up) : grip;
      return { reach: { l, r, lean: 0.06 + 0.2 * up, nod: 0.1 - 0.1 * up, palms: 0.3, grip: { l: 0.85, r: 0.85 - 0.5 * up } } };
    }
    case 'handrail': {
      // EVA practice on a handrail (`work` its middle): hand over hand along it, one hand letting go
      // and moving on while the other holds; the body sways after them.
      const p = work?.point ?? front(0.35, 0, chest);
      const a = t * Math.PI * 2 * 0.22 + s;
      const lift = (x: number) => 0.05 * Math.max(0, Math.sin(x));
      return {
        reach: {
          l: at(p, (0.2 + 0.1 * Math.sin(a)) * sl, lift(a + Math.PI / 2)),
          r: at(p, (-0.2 + 0.1 * Math.sin(a)) * sl, lift(a - Math.PI / 2)),
          lean: 0.08,
          nod: -0.05,
          palms: 0.8,
          grip: { l: 0.9 - 0.6 * Math.min(1, lift(a + Math.PI / 2) * 20), r: 0.9 - 0.6 * Math.min(1, lift(a - Math.PI / 2) * 20) },
        },
      };
    }
    case 'saute': {
      // On the line (2026-10-26): the left hand on the pan's handle (`work`, which rides on the pan as
      // it's shaken and tossed), the right working the food with a spoon while it's shaken, drawn back
      // out of the way for the toss, and every third round up over it sprinkling salt.
      const p = work?.point ?? front(0.3, 0.15, y0 + 1.0);
      const ph = toolPhase(b.base);
      const k = panToss(t, ph);
      const cyc = t / 2.6 + ph;
      const u = cyc - Math.floor(cyc);
      const sm = THREE.MathUtils.smoothstep;
      const pan = p.clone().addScaledVector(fwd, 0.3).addScaledVector(left, -0.03).addScaledVector(UP, 0.03);
      const a = t * Math.PI * 2 * 1.3;
      const r = pan.clone().addScaledVector(left, 0.05 * Math.cos(a)).addScaledVector(fwd, 0.04 * Math.sin(a)).addScaledVector(UP, 0.06);
      const salt = Math.floor(cyc) % 3 === 2 ? sm(u, 0.05, 0.15) * (1 - sm(u, 0.42, 0.52)) : 0;
      r.lerp(pan.clone().addScaledVector(UP, 0.26 + 0.01 * wave(t, 4, s)), salt);
      r.lerp(front(0.24, -0.24, waist + 0.2), sm(u, 0.55, 0.64) * (1 - sm(u, 0.93, 1)));
      return { reach: { l: p, r, palms: 0.6, lean: 0.14 + 0.5 * k.push, nod: 0.42 - 0.6 * k.lift, grip: { l: 0.95, r: salt > 0.5 ? 0.55 + 0.12 * wave(t, 6, s) : 0.85 } } };
    }
    case 'dice': {
      // Dicing (2026-10-26): the knife (moved in step on the board, workplaces/culinary.ts) rocking
      // along the food behind the guiding hand's knuckles as they creep back, then the hand lifted
      // away while the blade sweeps the pile off to the right, and back to the start.
      const p = work?.point ?? front(0.38, 0, y0 + 0.92);
      const k = diceKnife(t, toolPhase(b.base));
      const r = at(p, k.side * sl, k.up, k.ahead);
      const l =
        k.sweep > 0
          ? at(p, (0.135 - 0.13 * k.sweep) * sl, 0.035 + 0.05 * Math.sin(Math.PI * k.sweep), -0.05 * Math.sin(Math.PI * k.sweep))
          : at(p, (k.side + 0.075) * sl, 0.035, -0.01);
      return { reach: { l, r, palms: 1.2 + 0.25 * Math.sin(Math.PI * k.sweep), lean: 0.24, nod: 0.5, grip: { l: 0.55, r: 0.95 } } };
    }
    case 'ladle': {
      // A stock pot (2026-10-26): `work` the middle of the broth; the long ladle (moved in step,
      // workplaces/culinary.ts) going slowly round, now and then a scoop lifted out to look at;
      // the other hand on the pot's handle.
      const p = work?.point ?? front(0.45, 0, y0 + 0.86);
      const k = ladleStir(t, toolPhase(b.base));
      const r = at(p, k.x * sl, k.lift + 0.3, k.z - 0.2).addScaledVector(across, -0.04 * sl);
      return { reach: { l: at(p, 0.33 * sl, 0.04, 0.04), r, palms: 0.5, lean: 0.1, nod: 0.32 + 0.2 * (k.lift / 0.2), grip: { l: 0.8, r: 0.9 } } };
    }
    case 'plate': {
      // Plating at the pass (2026-10-26): the left hand steadying the plate by its rim, the right
      // going to the garnish tray at its side for a pinch, over the plate, set down with little dabs
      // (somewhere new each time round), then a cloth round the rim before the next.
      const p = work?.point ?? front(0.4, 0, y0 + 0.93);
      const cyc = t / 5.5 + s;
      const n = Math.floor(cyc);
      const u = cyc - n;
      const sm = (a: number, z: number) => THREE.MathUtils.smoothstep(u, a, z);
      const tray = at(p, -0.27 * sl, 0.05, -0.05);
      const ang = n * 2.4;
      const on = at(p, 0.05 * Math.cos(ang) * sl, 0.025 + 0.008 * Math.max(0, wave(t, 3, s)), 0.05 * Math.sin(ang));
      const above = on.clone().addScaledVector(UP, 0.1);
      const ra = 2.2 + ((u - 0.72) / 0.28) * Math.PI * 1.4;
      const rim = at(p, Math.cos(ra) * 0.12 * sl, 0.02, Math.sin(ra) * 0.12);
      const r = tray.clone().lerp(above, sm(0.16, 0.3)).lerp(on, sm(0.3, 0.38)).lerp(above, sm(0.62, 0.68)).lerp(rim, sm(0.68, 0.74)).lerp(tray, sm(0.94, 1));
      const wiping = sm(0.68, 0.74) * (1 - sm(0.94, 1));
      return { reach: { l: at(p, 0.14 * sl, 0.015, 0.03), r, palms: 1.1, lean: 0.3, nod: 0.55, grip: { l: 0.4, r: 0.8 - 0.4 * wiping } } };
    }
    case 'taste': {
      // Tasting (2026-10-26): a spoon dipped in the sauce (`work`), blown on, tasted with the other
      // hand cupped under it for the drips, then a moment's thought, the head on one side.
      const p = work?.point ?? front(0.4, 0, y0 + 0.95);
      const u = ((t / 6.5 + s) % 1 + 1) % 1;
      const sm = (a: number, z: number) => THREE.MathUtils.smoothstep(u, a, z);
      const dip = at(p, -0.02 * sl + 0.03 * Math.cos(t * 7), 0.03, 0.03 * Math.sin(t * 7));
      const blow = front(0.22, -0.03, mouth - 0.07);
      const lips = front(0.12, -0.02, mouth - 0.02);
      const think = front(0.25, -0.12, chest - 0.1);
      const r = dip.clone().lerp(blow, sm(0.18, 0.3)).lerp(lips, sm(0.42, 0.48)).lerp(think, sm(0.6, 0.7)).lerp(dip, sm(0.9, 1));
      const up = sm(0.18, 0.3) * (1 - sm(0.6, 0.7));
      const l = at(p, 0.2 * sl, 0.01).lerp(front(0.17, 0, mouth - 0.12), up * sm(0.3, 0.42));
      const pondering = sm(0.6, 0.7) * (1 - sm(0.9, 1));
      return { reach: { l, r, palms: 0.6, lean: 0.22 * (1 - up), nod: 0.4 - 0.48 * up - 0.12 * pondering, grip: { l: 0.3, r: 0.85 } } };
    }
    case 'climb': {
      // Up a ladder (2026-10-26, the fire station's drill tower; `work` on the rungs before the face,
      // carried up with the climber): hand over hand on the rails, one gripping while the other lets
      // go and reaches a rung higher, the knees giving with each step, the eyes up the ladder.
      const p = work?.point ?? front(0.3, 0, chest + 0.1);
      const a = t * Math.PI * 2 * 0.55 + s;
      const hand = (side: number, ph: number) => {
        const k = Math.sin(a + ph);
        return at(p, side * 0.2 * sl, 0.16 * k + 0.04 * Math.max(0, Math.cos(a + ph)), -0.03);
      };
      const step = Math.abs(Math.sin(a));
      return { reach: { l: hand(1, 0), r: hand(-1, Math.PI), palms: 0.9, lean: 0.06, nod: -0.25, grip: { l: 0.9 - 0.6 * Math.max(0, Math.cos(a)), r: 0.9 - 0.6 * Math.max(0, -Math.cos(a)) } }, crouch: 0.1 * step };
    }
    case 'steer': {
      // At the wheel (2026-10-26, a fire engine's cab; `work` the wheel's hub): both hands on the rim
      // at ten to two, turned now one way and now the other, a glance down at the dash now and then.
      const p = work?.point ?? front(0.35, 0, chest);
      const turn = 0.45 * wave(t, 0.08, s) + 0.12 * wave(t, 0.27, s);
      const rim = (ang: number) => at(p, Math.cos(ang) * 0.17 * sl, Math.sin(ang) * 0.17, -0.02);
      const glance = Math.max(0, wave(t, 0.06, s + 0.3)) ** 6;
      return { reach: { l: rim(0.45 + turn), r: rim(Math.PI - 0.45 + turn), palms: 0.6, lean: 0.05, nod: 0.05 + 0.25 * glance, grip: { l: 0.9, r: 0.9 } } };
    }
    case 'gearUp': {
      // Turnout gear on against the clock (2026-10-26, a fire station's gear rack): bent down pulling
      // the trousers up out of the boots, the braces up over the shoulders, the coat swung on (an arm
      // back into its sleeve), the helmet on with both hands and the chin strap done — and again.
      type Key = { l: THREE.Vector3; r: THREE.Vector3; lean: number; crouch: number; nod: number; palms: number };
      const keys: Key[] = [
        { l: front(0.22, 0.13, y0 + 0.32 * H), r: front(0.22, -0.13, y0 + 0.32 * H), lean: 0.5, crouch: 0.45, nod: 0.4, palms: 1.2 },
        { l: front(0.1, 0.12, chest + 0.1), r: front(0.1, -0.12, chest + 0.1), lean: 0.02, crouch: 0.05, nod: 0.15, palms: 1.6 },
        { l: front(0.18, 0.05, chest), r: front(-0.12, -0.42, chest - 0.05), lean: -0.05, crouch: 0, nod: -0.05, palms: 0.4 },
        { l: front(0.08, 0.11, y0 + 1.01 * H), r: front(0.08, -0.11, y0 + 1.01 * H), lean: 0, crouch: 0, nod: -0.05, palms: 1.4 },
        { l: front(0.14, 0.04, mouth - 0.09), r: front(0.14, -0.04, mouth - 0.09), lean: 0.04, crouch: 0, nod: 0.25, palms: 1.1 },
      ];
      // About 7 s round: it's a drill to do it fast.
      const x = ((((t / 7 + s) % 1) + 1) % 1) * keys.length;
      const i = Math.floor(x);
      const e = THREE.MathUtils.smoothstep(x - i, 0.45, 1);
      const a = keys[i];
      const z = keys[(i + 1) % keys.length];
      const mix = (q: number, r: number) => q + (r - q) * e;
      return { reach: { l: a.l.clone().lerp(z.l, e), r: a.r.clone().lerp(z.r, e), lean: mix(a.lean, z.lean), nod: mix(a.nod, z.nod), palms: mix(a.palms, z.palms), grip: { l: 0.8, r: 0.8 } }, crouch: mix(a.crouch, z.crouch) };
    }
    case 'cpr': {
      // Chest compressions on a manikin on the floor (2026-10-26; `work` its breastbone, its head to
      // the rescuer's left): down low over it, the arms straight and the hands stacked, pushed hard
      // and fast (two a second); every thirty, bent to the head for two breaths, then back to it.
      const p = work?.point ?? front(0.4, 0, y0 + 0.2);
      const u = ((t / 19 + s) % 1 + 1) % 1;
      const breaths = u > 0.82;
      if (breaths) {
        const head = at(p, 0.36 * sl, 0.02, 0.02);
        return { reach: { l: head.clone().addScaledVector(fwd, 0.05), r: at(p, 0.22 * sl, 0.03), palms: 1.3, lean: 0.85, nod: 0.5, grip: { l: 0.4, r: 0.5 } }, crouch: 1 };
      }
      const push = Math.max(0, Math.sin(t * Math.PI * 2 * 1.9));
      const hands = at(p, 0, 0.06 - 0.05 * push);
      return { reach: { l: hands.clone().addScaledVector(UP, 0.02), r: hands, palms: 1.5, lean: 0.62 + 0.06 * push, nod: 0.45, grip: { l: 0.3, r: 0.3 } }, crouch: 1 };
    }
    case 'search': {
      // A search in smoke (2026-10-26, the drill tower's smoke room): down low, the left hand kept on
      // the wall, the right sweeping the floor ahead in wide arcs for anyone lying there.
      const a = t * Math.PI * 2 * 0.35 + s;
      return { reach: { l: front(0.25, 0.42, waist - 0.05 + 0.04 * wave(t, 0.5, s)), r: front(0.42 + 0.08 * Math.cos(a), -0.15 + 0.3 * Math.sin(a), y0 + 0.14), palms: 1.3, lean: 0.6, nod: 0.15, grip: { l: 0.1, r: 0.3 } }, crouch: 1 };
    }
    case 'haircut':
    case 'hairColor':
    case 'blowDry':
    case 'shampoo': {
      // At a client's head in the styling chair or the shampoo bed (2026-10-27, the 헤어 살롱; see
      // haircutRound…): `work` the middle of the head; the hands where the tools are, the eyes on them.
      const p = work?.point ?? front(0.45, 0, y0 + 0.8 * H);
      const off = (o: BarOffset) => at(p, o.side * sl, o.up, o.ahead);
      const ph = toolPhase(b.base);
      const low = THREE.MathUtils.clamp((y0 + 0.8 * H - p.y) * 1.2, 0, 0.35);
      if (m === 'haircut') {
        const k = haircutRound(t, ph);
        return { reach: { l: off(k.l), r: off(k.r), palms: 0.7, lean: 0.1 + low, nod: 0.25 + low, grip: { l: 0.7, r: 0.8 } } };
      }
      if (m === 'hairColor') {
        const k = hairColorRound(t, ph);
        return { reach: { l: off(k.l), r: off(k.r), palms: 0.9, lean: 0.12 + low, nod: 0.3 + low, grip: { l: 0.6, r: 0.85 } } };
      }
      if (m === 'blowDry') {
        const k = blowDryRound(t, ph);
        return { reach: { l: off(k.l), r: off(k.r), palms: 0.4, lean: 0.08 + low, nod: 0.22 + low, grip: { l: 0.85, r: 0.9 } } };
      }
      const k = shampooRound(t, ph);
      return { reach: { l: off(k.l), r: off(k.r), palms: 1.3, lean: 0.2 + low, nod: 0.3 + low, grip: { l: 0.3, r: k.held ? 0.85 : 0.35 } } };
    }
    case 'makeup': {
      // At a client's face (or a head form at the FX table; 2026-10-27, the 메이크업 숍, see
      // makeupRound): `work` the middle of the face; the palette in the left hand, the tool in the
      // right, leant in close while working, back up for a look.
      const p = work?.point ?? front(0.42, 0, chest + 0.12);
      const off = (o: BarOffset) => at(p, o.side * sl, o.up, o.ahead);
      const k = makeupRound(t, toolPhase(b.base));
      const low = THREE.MathUtils.clamp((y0 + 0.8 * H - p.y) * 1.2, 0, 0.35);
      const near = k.close ? 1 : 0;
      return { reach: { l: off(k.l), r: off(k.r), palms: 0.6, lean: 0.06 + low + 0.08 * near - 0.06 * k.look, nod: 0.2 + low + 0.08 * near - 0.15 * k.look, grip: { l: 0.8, r: 0.85 } } };
    }
    case 'manicure':
    case 'pedicure':
    case 'nailShow':
    case 'footSoak': {
      // Nails done across the nail table or at a foot on the pedicure chair's rest (2026-10-27, the
      // 네일숍, see manicureRound): `work` the client's hand (foot); bent over it, the more the lower it
      // is. Showing the sample wheel: held up to the client in the left hand, the right turning it.
      // A foot soak: both hands in the water at `work`, rubbing the feet.
      const p = work?.point ?? front(0.42, 0, chest - 0.1);
      const off = (o: BarOffset) => at(p, o.side * sl, o.up, o.ahead);
      const low = THREE.MathUtils.clamp(chest - p.y, 0, 0.6);
      if (m === 'nailShow') {
        const turn = 0.02 * wave(t, 0.3, s);
        return { reach: { l: off(bo(0.075, -0.05, 0.01)), r: off(bo(-0.07 + turn, 0.03, -0.01)), palms: 0.2, lean: 0.06, nod: 0.12 + 0.05 * wave(t, 0.11, s), grip: { l: 0.7, r: 0.45 } } };
      }
      if (m === 'footSoak') {
        const a = t * Math.PI * 2 * 0.7 + s;
        return { reach: { l: off(bo(0.09 + 0.02 * Math.cos(a), 0.02 * Math.sin(a), 0.03 * Math.sin(a))), r: off(bo(-0.09 - 0.02 * Math.cos(a + 1.3), 0.02 * Math.sin(a + 1.3), 0.03 * Math.sin(a + 1.3))), palms: 1.2, lean: 0.25 + 0.7 * low, nod: 0.35 + 0.3 * low, grip: { l: 0.35, r: 0.35 } } };
      }
      const k = manicureRound(t, toolPhase(b.base), m === 'pedicure');
      return { reach: { l: off(k.l), r: off(k.r), palms: 0.9, lean: 0.14 + 0.85 * low, nod: 0.42 + 0.3 * low, grip: { l: 0.65, r: k.held ? 0.85 : 0.3 } } };
    }
    case 'facial': {
      // Sat at the head of the bed over a face lying up (2026-10-27, the 에스테틱; see facialRound):
      // the fingertips flat on the face for the massage, the bowl and the brush for the mask, a hand to
      // the steamer's arm; bent over it, the eyes on the hands.
      const p = work?.point ?? front(0.45, 0, chest - 0.15);
      const off = (o: BarOffset) => at(p, o.side * sl, o.up, o.ahead);
      const k = facialRound(t, toolPhase(b.base));
      const mask = k.brush ? 1 : 0;
      return { reach: { l: off(k.l), r: off(k.r), palms: 1.35 - 0.65 * mask, lean: 0.3 - 0.06 * k.onHandle, nod: 0.55 - 0.15 * k.onHandle, grip: { l: 0.15 + 0.6 * mask, r: Math.max(0.15 + 0.7 * mask, 0.8 * k.onHandle) } } };
    }
    case 'bodyMassage': {
      // Stood at the side of the bed over a back lying face down (2026-10-27, the 에스테틱; see
      // massageRound): palms flat on it, leant in with the weight behind them.
      const p = work?.point ?? front(0.45, 0, waist - 0.1);
      const off = (o: BarOffset) => at(p, o.side * sl, o.up, o.ahead);
      const k = massageRound(t, toolPhase(b.base));
      return { reach: { l: off(k.l), r: off(k.r), palms: 1.5, lean: 0.32 + 0.16 * k.press, nod: 0.35 + 0.1 * k.press, grip: k.grip } };
    }
    case 'skinScan': {
      // Stood at a sat client's side, the probe to the face, the tablet in the other hand (2026-10-27,
      // the 에스테틱; see skinScanRound): the eyes on the face, then down to the reading.
      const p = work?.point ?? front(0.4, 0, chest + 0.2);
      const off = (o: BarOffset) => at(p, o.side * sl, o.up, o.ahead);
      const k = skinScanRound(t, toolPhase(b.base));
      return { reach: { l: off(k.l), r: off(k.r), palms: 0.3, lean: 0.12, nod: 0.12 + 0.35 * k.look, grip: { l: 0.7, r: 0.85 } } };
    }
    case 'dentistry': {
      // Bent over the patient's open mouth (2026-10-27, the 치과): the mirror held steady in the left
      // hand, the probe in the right picking along the teeth; now and then they sit back a little to
      // look the mouth over, then lean in again.
      const p = work?.point ?? front(0.4, 0, chest);
      const { mirror, probe } = DENTAL_GRIP;
      const pick = 0.006 * wave(t, 1.6, s);
      const look = Math.max(0, wave(t, 0.06, s)) ** 3;
      return {
        reach: {
          l: at(p, mirror.side * sl, mirror.up, mirror.ahead),
          r: at(p, probe.side * sl + pick, probe.up + 0.5 * pick, probe.ahead),
          palms: 0.5,
          lean: 0.32 - 0.14 * look,
          nod: 0.55 - 0.2 * look,
          grip: { l: 0.85, r: 0.85 },
        },
      };
    }
    case 'brushwork': {
      // At the easel (2026-10-27, see brushwork): the brush hand where the brush is, the palette held
      // out in the other by its thumb hole; leaning in to the strokes, stood back to look between.
      const k = brushwork(t, toolPhase(b.base));
      const tip = work?.point ?? front(0.5, 0, chest);
      const r = tip.clone().addScaledVector(fwd, k.dir.ahead * BRUSH_REACH).addScaledVector(left, k.dir.side * BRUSH_REACH).addScaledVector(UP, k.dir.up * BRUSH_REACH);
      const l = front(PALETTE.ahead, PALETTE.side, y0 + PALETTE.up);
      return { reach: { l, r, palms: 0.5, lean: 0.1 - 0.16 * k.look + 0.06 * k.pal, nod: 0.12 + 0.25 * k.pal - 0.1 * k.look, grip: { l: 0.75, r: 0.9 } } };
    }
    case 'penDraw': {
      // Drawing with a pen (2026-10-27, see PEN_GRIP): the pen hand where the nib is, the pen held
      // back from it. Sat at a pen display, bent over it, the other hand on the shortcut keys; stood at
      // a board, the cap in the other hand at the waist, now and then a step's look back at the sheet.
      const g = b.sitting ? PEN_GRIP : MARKER_GRIP;
      const nib = work?.point ?? front(0.4, 0, b.sitting ? waist + 0.22 : chest);
      const r = nib.clone().addScaledVector(fwd, -g.back).addScaledVector(UP, g.up).addScaledVector(left, -g.out);
      if (b.sitting) {
        const key = Math.max(0, wave(t, 0.23, s)) ** 12;
        const l = front(PEN_KEYS.ahead, PEN_KEYS.side, y0 + PEN_KEYS.up + 0.01 * (1 - key));
        return { reach: { l, r, palms: 1.25, lean: 0.2, nod: 0.45, grip: { l: 0.3 + 0.25 * key, r: 0.8 } } };
      }
      const look = Math.max(0, wave(t, 0.06, s)) ** 6;
      return { reach: { l: front(0.2, 0.13, waist + 0.1), r, palms: 0.35, lean: 0.05 - 0.07 * look, nod: 0.08 - 0.1 * look, grip: { l: 0.6, r: 0.85 } } };
    }
    case 'pianoLesson':
    case 'pianoCoach': {
      // Beside the pupil at the grand (2026-10-27; see pianoBeat): `work` the treble keys in front
      // of the teacher; the spot turned to the pupil by the piano itself, so the score and the keys
      // are found from the way the chair faces, not the way the body's turned.
      const k = H / 1.6;
      const p = work?.point ?? front(0.45 * k, 0, waist + 0.25 * k);
      const beat = pianoBeat(m, t, toolPhase(b.base));
      const yaw0 = b.yaw - beat.turn * PIANO_TURN;
      const fwd0 = new THREE.Vector3(Math.sin(yaw0), 0, Math.cos(yaw0));
      const left0 = new THREE.Vector3(Math.cos(yaw0), 0, -Math.sin(yaw0));
      const onPiano = (q: THREE.Vector3, side: number, up: number, ahead: number) => q.clone().addScaledVector(left0, side).addScaledVector(UP, up).addScaledVector(fwd0, ahead);
      const score = onPiano(p, PIANO_DESK.side, PIANO_DESK.up, PIANO_DESK.ahead);
      const knee = front(0.3 * k, 0.1 * k, y0 + 0.13 * k);
      const shoulder = front(0, -0.17 * k, chest + 0.12 * k);
      const tick = Math.abs(Math.sin((Math.PI * t) / CONDUCT_BEAT));
      type Key = { l: THREE.Vector3; r: THREE.Vector3; lean: number; nod: number; palms: number; gl: number; gr: number; tap?: boolean };
      const pose = (key: PianoKey): Key => {
        switch (key) {
          case 'beat':
            return { l: knee, r: front(0.3 * k, -0.1 * k, chest - 0.04 * k + 0.12 * k * tick), lean: 0.06, nod: 0.04 + 0.06 * (1 - tick), palms: 0.9, gl: 0.3, gr: 0.65 };
          case 'point': {
            const bar = onPiano(score, -0.06, -0.02, 0);
            const tip = shoulder.clone().addScaledVector(bar.clone().sub(shoulder).normalize(), Math.min(0.62 * k, bar.distanceTo(shoulder)));
            return { l: knee, r: tip, lean: 0.16, nod: 0.12, palms: 0.3, gl: 0.3, gr: 0.75 };
          }
          case 'demo': {
            const tl = 0.012 * Math.max(0, wave(t, 4.2, s));
            const tr = 0.012 * Math.max(0, wave(t, 4.2, s + 0.5));
            return { l: onPiano(p, 0.11 + 0.04 * wave(t, 0.45, s), tl, 0), r: onPiano(p, -0.11 + 0.05 * wave(t, 0.37, s + 0.3), tr, 0), lean: 0.24, nod: 0.32, palms: 1.45, gl: 0.4, gr: 0.4, tap: true };
          }
          case 'page': {
            const u = beat.page;
            return { l: knee, r: onPiano(score, -0.19 + 0.34 * u, 0.06 + 0.05 * Math.sin(Math.PI * u), -0.03 - 0.07 * Math.sin(Math.PI * u)), lean: 0.2, nod: 0.06, palms: 0.8, gl: 0.3, gr: 0.55 };
          }
          default: {
            const c = Math.max(0, wave(t, 2.2, s));
            return { l: front(0.3 * k, (0.03 + 0.05 * c) * k, chest + 0.02 * k), r: front(0.3 * k, -(0.03 + 0.05 * c) * k, chest + 0.02 * k), lean: -0.02, nod: -0.06, palms: 0, gl: 0.1, gr: 0.1 };
          }
        }
      };
      const a = pose(beat.from);
      const z = beat.e > 0 ? pose(beat.to) : a;
      const e = beat.e;
      const mix = (q: number, r: number) => q + (r - q) * e;
      return { reach: { l: a.l.clone().lerp(z.l, e), r: a.r.clone().lerp(z.r, e), lean: mix(a.lean, z.lean), nod: mix(a.nod, z.nod), palms: mix(a.palms, z.palms), grip: { l: mix(a.gl, z.gl), r: mix(a.gr, z.gr) }, tap: e < 0.5 ? a.tap : z.tap } };
    }
    case 'conduct': {
      // Conducting in 4/4 at a music stand (2026-10-27, the 음악학원; `work` the score on the stand),
      // in time with the metronome beside it (CONDUCT_BEAT): the right hand down on one, in on two,
      // out on three, up on four, bouncing off each beat; the left keeps a hand on the stand for two
      // bars, then rises palm up for a crescendo and is held out palm down to bring them back.
      const k = H / 1.6;
      const p = work?.point ?? front(0.45 * k, 0, chest);
      const n = t / CONDUCT_BEAT;
      const i = Math.floor(n);
      const u = n - i;
      const P = [front(0.36 * k, -0.12 * k, chest - 0.08 * k), front(0.34 * k, 0.08 * k, chest - 0.04 * k), front(0.38 * k, -0.34 * k, chest - 0.04 * k), front(0.32 * k, -0.16 * k, chest + 0.13 * k)];
      const from = P[((i % 4) + 4) % 4];
      const to = P[(((i + 1) % 4) + 4) % 4];
      const r = from.clone().lerp(to, THREE.MathUtils.smoothstep(u, 0, 1)).addScaledVector(UP, 0.07 * k * Math.sin(Math.PI * u));
      const bars = n / 4;
      const bar = ((Math.floor(bars) % 4) + 4) % 4;
      const f = bars - Math.floor(bars);
      const l = bar < 2 ? at(p, 0.2 * sl, -0.16, 0.02) : bar === 2 ? front(0.32 * k, 0.22 * k, chest - 0.1 * k + 0.22 * k * f) : front(0.36 * k, 0.2 * k, chest + 0.02 * k);
      return { reach: { l, r, lean: 0.04, nod: -0.04 + 0.04 * (1 - Math.abs(Math.sin(Math.PI * n))), palms: bar < 2 ? 0.8 : bar === 2 ? -0.6 : 0.9, grip: { l: bar < 2 ? 0.5 : 0.1, r: 0.75 } } };
    }
    case 'espresso': {
      // A shot pulled (2026-10-27, the 카페; see espressoRound): `work` the group head; the right hand
      // on the portafilter's handle wherever it is, the left on the grinder's button, the tamper, the cup.
      const p = work?.point ?? front(0.45, 0, y0 + 1.14);
      const k = espressoRound(t, toolPhase(b.base));
      const to = (o: BarOffset) => at(p, o.side * sl, o.up, o.ahead);
      const watching = k.flow ? 0.15 : 0;
      return { reach: { l: to(k.l), r: to(k.r), palms: 0.7, lean: 0.18 + watching, nod: 0.42 + watching, grip: { l: 0.55, r: 0.95 } } };
    }
    case 'latteArt': {
      // Milk steamed and a rosetta poured (2026-10-27; see latteRound): `work` the steam wand's tip;
      // the right hand on the pitcher's handle, the left on the knob, the pitcher's side, the cup.
      const p = work?.point ?? front(0.45, -0.25, y0 + 1.0);
      const k = latteRound(t, toolPhase(b.base));
      const to = (o: BarOffset) => at(p, o.side * sl, o.up, o.ahead);
      return { reach: { l: to(k.l), r: to(k.r), palms: 0.6, lean: 0.12 + 0.12 * k.pouring, nod: 0.3 + 0.25 * k.pouring, grip: { l: 0.75, r: 0.95 } } };
    }
    case 'register': {
      // At the till (2026-10-27, the 카페): the order tapped in on the screen (`work`), a look up at the
      // customer, the pager or the drink handed across the counter, and the next one.
      const p = work?.point ?? front(0.35, 0, y0 + 1.05);
      const { give, look } = tillRound(t, toolPhase(b.base));
      const taps = at(p, (0.03 * Math.sin(t * 1.7)) * sl, 0.012 + 0.018 * Math.max(0, wave(t, 2.4, s)), -0.025);
      const r = taps.lerp(front(TILL_REACH.ahead, -0.06, y0 + TILL_REACH.up), give);
      return { reach: { l: front(0.3, 0.24, y0 + 0.99), r, palms: 1.2 - 0.7 * give, lean: 0.1 + 0.14 * give, nod: 0.38 - 0.5 * look, grip: { l: 0.2, r: give > 0.5 ? 0.75 : 0.35 } } };
    }
    case 'knead':
    case 'roll':
    case 'score':
    case 'peel':
    case 'pipe': {
      // At the bakery's bench, oven and cake table (2026-10-27; see kneadRound and the rest): the
      // heel of the hand in the dough, both hands rolling a croissant, the lame in the right hand,
      // both on the peel's handle, the piping bag or the palette knife with the other on the turntable.
      const p = work?.point ?? front(0.42, 0, y0 + 0.92);
      const ph = toolPhase(b.base);
      const to = (o: BarOffset) => at(p, o.side * sl, o.up, o.ahead);
      if (m === 'knead') {
        const k = kneadRound(t, ph);
        return { reach: { l: to(k.l), r: to(k.r), palms: 1.45, lean: 0.36 + 0.16 * k.stretch, nod: 0.45, grip: { l: 0.3, r: 0.12 } } };
      }
      if (m === 'roll') {
        const k = rollRound(t, ph);
        return { reach: { l: to(k.l), r: to(k.r), palms: 1.4, lean: 0.34, nod: 0.5, grip: { l: 0.15, r: k.held ? 0.5 : 0.15 } } };
      }
      if (m === 'score') {
        const k = scoreRound(t, ph);
        return { reach: { l: to(k.l), r: to(k.r), palms: 1.0, lean: 0.3, nod: 0.52, grip: { l: 0.3, r: 0.9 } } };
      }
      if (m === 'peel') {
        const k = peelRound(t, ph);
        return { reach: { l: to(k.l), r: to(k.r), palms: 0.5, lean: 0.1 + 0.26 * k.push, nod: 0.3, grip: { l: 0.95, r: 0.95 } } };
      }
      const k = pipeRound(t, ph);
      return { reach: { l: to(k.l), r: to(k.r), palms: 0.7, lean: 0.26, nod: 0.5, grip: { l: k.ice ? 0.4 : 0.7, r: 0.9 } } };
    }
    case 'shoot': {
      // At a camera on a tripod (2026-10-27, the 사진 스튜디오; see tripodRound): `work` its eyepiece.
      // The right hand round the grip with a finger on the shutter, the left under the lens; between
      // bursts the head comes up over the camera and the left hand waves the sitter round.
      const p = work?.point ?? front(0.25, 0, y0 + 0.92 * H);
      const k = tripodRound(t, toolPhase(p));
      const cam = (side: number, up: number, ahead: number) => p.clone().addScaledVector(left, side).addScaledVector(UP, up).addScaledVector(fwd, ahead);
      const r = cam(-0.08, -0.04 - 0.012 * k.press, 0.06);
      const lens = cam(0.0, -0.085, 0.16);
      const wave1 = front(0.42, 0.3 + 0.08 * wave(t, 1.4, s), chest + 0.12);
      const l = lens.clone().lerp(wave1, k.talk);
      const eyeY = y0 + 0.93 * H;
      const bend = THREE.MathUtils.clamp((eyeY - p.y) * 1.6, 0, 0.6);
      return { reach: { l, r, palms: 0.25, lean: 0.05 + bend * k.eye, nod: 0.08 * k.eye - 0.06 * (1 - k.eye), grip: { l: 0.55 - 0.4 * k.talk, r: 0.75 + 0.15 * k.press } } };
    }
    case 'shootHand': {
      // A portrait shot handheld (2026-10-27; see portraitRound, handheldCamera): stepped round the
      // sitter (the spot itself moves), crouched for the low angle, the camera up to the eye and on
      // its end for an upright frame, lowered to the chest to check the shot. `work` the sitter's face.
      const p = work?.point ?? front(1.6, 0, y0 + 1.2);
      const k = portraitRound(t, toolPhase(p));
      const cam = handheldCamera(b.base, b.yaw, H, k);
      return { reach: { l: cam.l, r: cam.r, palms: 0.2, lean: 0.04 + 0.12 * k.chimp, nod: 0.38 * k.chimp, grip: { l: 0.6, r: 0.8 + 0.15 * k.press } }, crouch: k.crouch };
    }
    case 'direct': {
      // Directing the sitter (2026-10-27; see directBeat): the camera hanging from the left hand at the
      // hip, the right showing what's wanted.
      const p = work?.point ?? front(1, 0, y0 + 1.2);
      const k = H / 1.6;
      const beat = directBeat(t, toolPhase(p));
      const lift = 0.06 * Math.max(0, Math.sin(beat.v * Math.PI * 4));
      const hand = (key: DirectKey) => {
        switch (key) {
          case 'chin':
            return { r: front(0.34 * k, -0.1 * k, chest - 0.02 * k + lift), nod: -0.04, palms: -1.1, gr: 0.15 };
          case 'turn':
            return { r: front(0.3 * k, (-0.18 + 0.2 * Math.sin(beat.v * Math.PI * 2)) * k, chest + 0.03 * k), nod: -0.02, palms: -0.2, gr: 0.1 };
          case 'show':
            return { r: front(0.12 * k, -0.02 * k, mouth - 0.08 * k), nod: -0.12, palms: 0.4, gr: 0.3 };
          default:
            return { r: front(0.3 * k, -0.2 * k, y0 + 0.86 * H), nod: -0.05, palms: 0, gr: 1 };
        }
      };
      const a = hand(beat.from);
      const z = hand(beat.to);
      const l = b.base.clone().addScaledVector(fwd, DIRECT_CAM.ahead * k).addScaledVector(left, DIRECT_CAM.side * k).setY(y0 + DIRECT_CAM.up * H);
      return { reach: { l, r: a.r.lerp(z.r, beat.e), lean: 0.04, nod: a.nod + (z.nod - a.nod) * beat.e, palms: a.palms + (z.palms - a.palms) * beat.e, grip: { l: 0.85, r: a.gr + (z.gr - a.gr) * beat.e } } };
    }
    case 'develop': {
      // At the darkroom sink (2026-10-27; see developRound): `work` the middle tray's liquid.
      const p = work?.point ?? front(0.55, 0, y0 + 0.93);
      const k = developRound(t, toolPhase(p));
      const off = (o: BarOffset) => p.clone().addScaledVector(left, o.side).addScaledVector(UP, o.up).addScaledVector(fwd, o.ahead);
      const looking = THREE.MathUtils.smoothstep(k.u, 0.8, 0.84) * (1 - THREE.MathUtils.smoothstep(k.u, 0.92, 0.95));
      return { reach: { l: off(k.l), r: off(k.r), palms: 0.9 - 0.7 * looking, lean: 0.3 - 0.3 * looking, nod: 0.5 - 0.55 * looking, grip: { l: 0.35, r: 0.85 } } };
    }
    case 'retouch': {
      // Retouching at a pen tablet (2026-10-27, the 사진 스튜디오): `work` the tablet; the pen in small
      // circles (dodging, a blemish healed), the left hand on the keys for the shortcuts, the eyes on
      // the screen, leaning in to check close every so often.
      const p = work?.point ?? front(0.35, -0.05, waist + 0.15);
      const a = t * Math.PI * 2 * 0.9 + s;
      const lift = Math.max(0, wave(t, 0.31, s)) ** 6;
      const r = at(p, -0.02 * sl + 0.025 * Math.cos(a) + 0.04 * wave(t, 0.07, s), 0.012 + 0.03 * lift, 0.02 * Math.sin(a));
      const l = at(p, 0.3 * sl, 0.005 + 0.008 * Math.max(0, wave(t, 1.3, s + 0.2)) ** 4, 0.04);
      const close = Math.max(0, wave(t, 0.05, s)) ** 4;
      return { reach: { l, r, palms: 1.3, lean: 0.16 + 0.22 * close, nod: 0.06 + 0.05 * close, grip: { l: 0.3, r: 0.85 } } };
    }
    case 'grind': {
      // At a bulk grinder (2026-10-27, the café's roastery): the bag held open under the spout (`work`),
      // the other hand on the hopper, now and then knocking the chute so the last grounds fall.
      const p = work?.point ?? front(0.4, 0, y0 + 1.0);
      const u = ((t / 6 + s) % 1 + 1) % 1;
      const knock = THREE.MathUtils.smoothstep(u, 0.58, 0.62) * (1 - THREE.MathUtils.smoothstep(u, 0.8, 0.84));
      const r = at(p, -0.03 * sl, 0.42, 0.07).lerp(at(p, -0.05 * sl, 0.13 + 0.02 * Math.max(0, wave(t, 4, s)), 0.03), knock);
      return { reach: { l: at(p, 0.05 * sl, 0.005 * wave(t, 1.5, s), -0.035), r, palms: 0.8, lean: 0.12, nod: 0.3 + 0.1 * knock, grip: { l: 0.9, r: 0.4 + 0.3 * knock } } };
    }
    case 'studioSing':
    case 'aria': {
      // Singing a take at a studio mic (2026-10-27, the 녹음 스튜디오; see singBeat), or out at the
      // piano to a teacher: the left hand pressing the headphones' left cup to the ear in the booth, or
      // flat on the belly feeling the breath; the right keeping the line — low and loose through the
      // verse, drawn in to the chest as it builds, opened out wide on the long note with the chin up
      // and the eyes shut, then down by the lyric sheet for a breath, the head bowed to read on.
      const k = H / 1.6;
      const beat = singBeat(t, toolPhase(b.base));
      const l =
        m === 'studioSing'
          ? front(STUDIO_EAR.ahead * k, (STUDIO_EAR.side + 0.04) * k, y0 + H - STUDIO_EAR.down * k)
          : front(0.15 * k, 0.05 * k, waist + 0.07 * k + 0.01 * wave(t, 0.25, s));
      type Key = { r: THREE.Vector3; nod: number; lean: number; palms: number; gr: number; shut: boolean };
      const pose = (key: SingKey): Key => {
        switch (key) {
          case 'verse':
            return { r: front(0.25 * k, -0.17 * k, waist + 0.15 * k + 0.03 * k * wave(t, 0.9, s)), nod: 0.1, lean: 0.03, palms: 0.3, gr: 0.35, shut: false };
          case 'build':
            return { r: front(0.2 * k, -0.07 * k, chest + 0.03 * k), nod: 0.02, lean: 0.07, palms: 0.6, gr: 0.55, shut: false };
          case 'long':
            return { r: front(0.3 * k, -0.36 * k, chest + 0.12 * k + 0.025 * k * wave(t, 0.7, s)), nod: -0.15, lean: -0.03, palms: -0.5, gr: 0.05, shut: true };
          default:
            return { r: front(0.3 * k, -0.26 * k, waist + 0.1 * k), nod: 0.32, lean: 0.06, palms: 0.8, gr: 0.3, shut: false };
        }
      };
      const a = pose(beat.from);
      const z = beat.e > 0 ? pose(beat.to) : a;
      const e = beat.e;
      const mix = (q: number, r: number) => q + (r - q) * e;
      return {
        reach: { l, r: a.r.clone().lerp(z.r, e), nod: mix(a.nod, z.nod), lean: mix(a.lean, z.lean), palms: mix(a.palms, z.palms), grip: { l: m === 'studioSing' ? 0.3 : 0.12, r: mix(a.gr, z.gr) } },
        shut: e < 0.5 ? a.shut : z.shut,
      };
    }
    case 'vocalScale': {
      // Warming up at the piano (2026-10-27, the 녹음 스튜디오; see scaleNote): stood at the keys, the
      // right hand playing the five notes up and down as they're sung (`work`, the scale's first), a
      // key higher each time round; the left flat on the belly; a breath between, the head coming up.
      const k = H / 1.6;
      const p = work?.point ?? front(0.38, -0.1, y0 + 0.74);
      const n = scaleNote(t, toolPhase(b.base));
      const r = at(p, -n.key * WHITE_KEY * sl, n.down ? 0.012 : 0.03, 0.01);
      const belly = front(0.15 * k, 0.05 * k, waist + 0.07 * k + 0.012 * k * wave(t, 0.3, s));
      return { reach: { l: belly, r, palms: 1.4, lean: n.rest ? 0.06 : 0.14, nod: n.rest ? 0.05 : 0.28, grip: { l: 0.12, r: 0.45 } } };
    }
    case 'floristry':
    case 'floralArrange': {
      // Flowers at the florist's table (2026-10-27, the 웨딩 컨설팅; see floralRound): `work` the
      // bouquet's binding point in the left hand, or the vase's mouth; the eyes on the flowers.
      const p = work?.point ?? front(0.38, 0, waist + 0.12);
      const off = (o: BarOffset) => at(p, o.side * sl, o.up, o.ahead);
      const k = floralRound(t, toolPhase(b.base), m === 'floralArrange');
      return { reach: { l: off(k.l), r: off(k.r), palms: 0.7, lean: 0.1 + 0.06 * k.bend, nod: 0.32 + 0.12 * k.bend, grip: { l: 0.85, r: k.stem >= 0 || k.snips ? 0.85 : 0.35 } } };
    }
    case 'albumShow': {
      // A wedding album shown across a table (2026-10-27, the 웨딩 컨설팅; see albumRound): `work` the
      // middle of the album lying open turned to the couple.
      const p = work?.point ?? front(0.42, 0, waist + 0.1);
      const off = (o: BarOffset) => at(p, o.side * sl, o.up, o.ahead);
      const k = albumRound(t, toolPhase(b.base));
      return { reach: { l: off(k.l), r: off(k.r), palms: 1.2 - 1.8 * k.open, lean: 0.2 - 0.12 * k.open, nod: 0.38 - 0.3 * k.open, grip: { l: 0.25, r: 0.3 + 0.45 * k.point } } };
    }
    case 'djMix':
    case 'djPeak': {
      // Behind the decks (2026-10-27, the 나이트클럽; see djRound): `work` the mixer's top middle. The
      // left hand up at the headphones' cup, the right on the deck, the knobs, the crossfader; the
      // fist up on the drop.
      const k = H / 1.6;
      const p = work?.point ?? front(0.42 * k, 0, y0 + 0.98);
      const d = djRound(t, m === 'djPeak');
      const to = (o: BarOffset) => at(p, o.side * sl, o.up, o.ahead);
      const ear = front(STUDIO_EAR.ahead * k, (STUDIO_EAR.side + 0.04) * k, y0 + H - STUDIO_EAR.down * k);
      const fist = (side: number) => front(0.17 * k, side * 0.21 * k, y0 + H * (0.97 + 0.13 * clubPulse(t)));
      const l = to(d.l).lerp(ear, d.ear).lerp(fist(1), d.pumpL);
      const r = to(d.r).lerp(fist(-1), d.pumpR);
      return { reach: { l, r, palms: d.palms, lean: d.lean, nod: d.nod, grip: { l: d.gl, r: d.gr } }, crouch: d.crouch };
    }
    case 'crateDig': {
      // Digging through a record crate (2026-10-27, the 나이트클럽; see digRound): `work` the top edge of the front sleeve.
      const p = work?.point ?? front(0.35, 0, y0 + 0.92);
      const k = digRound(t, toolPhase(b.base));
      const to = (o: BarOffset) => at(p, o.side * sl, o.up, o.ahead);
      return { reach: { l: to(k.l), r: to(k.r), palms: 1.3 - 1.2 * k.lift, lean: 0.3 - 0.25 * k.lift, nod: 0.55 - 0.4 * k.lift, grip: { l: 0.45 + 0.3 * k.lift, r: 0.7 } } };
    }
    case 'soundCheck': {
      // A speaker sound-checked (2026-10-27, the 나이트클럽): the phone's sound meter held up in the right
      // hand, the left cupped behind the ear to listen with the head up, then tapping the phone.
      const k = H / 1.6;
      const listen = soundListen(t, toolPhase(b.base));
      const phone = front(SOUND_PHONE.ahead * k, SOUND_PHONE.side * k, y0 + SOUND_PHONE.up * H);
      const ear = front(-0.02 * k, (STUDIO_EAR.side + 0.05) * k, y0 + H - STUDIO_EAR.down * k);
      const tap = phone.clone().addScaledVector(left, 0.06 * k).addScaledVector(UP, 0.03 + 0.012 * Math.max(0, wave(t, 2.4, s)));
      return { reach: { l: tap.lerp(ear, listen), r: phone, palms: 0.6, lean: 0.04, nod: 0.35 - 0.45 * listen, grip: { l: 0.3 + 0.2 * listen, r: 0.7 } } };
    }
    // The city library (2026-10-27, the 시립 도서관; see shelveRound and the rounds after it).
    case 'shelve': {
      const p = work?.point ?? front(0.42, 0, y0 + SHELVE.base);
      const off = (o: BarOffset) => at(p, o.side * sl, o.up, o.ahead);
      const k = shelveRound(t, toolPhase(b.base));
      return { reach: { l: off(k.l), r: off(k.r), palms: 0.35, lean: k.lean, nod: k.nod, grip: { l: 0.15, r: k.held ? 0.75 : 0.3 } }, crouch: k.crouch };
    }
    case 'storyRead': {
      const p = work?.point ?? front(0.3, 0.08, chest + 0.1);
      const off = (o: BarOffset) => at(p, o.side * sl, o.up, o.ahead);
      const k = storyRound(t, toolPhase(b.base));
      return { reach: { l: off(k.l), r: off(k.r), palms: 0.2, lean: 0.06 + 0.06 * k.point, nod: k.nod, grip: { l: k.flip > 0 && k.flip < 1 ? 0.6 : 0.3 + 0.4 * k.point, r: 0.8 } } };
    }
    case 'checkout':
    case 'catalogue': {
      const p = work?.point ?? front(0.45, 0, waist + 0.2);
      const off = (o: BarOffset) => at(p, o.side * sl, o.up, o.ahead);
      const k = checkoutRound(t, toolPhase(b.base), m === 'catalogue');
      const tap = k.typing ? 0.012 * Math.max(0, wave(t, 6.5, s)) : 0;
      return { reach: { l: off(k.l), r: off(boAdd(k.r, bo(0, tap, 0))), palms: k.gun ? 0.5 : 1.2, lean: 0.24, nod: 0.38, grip: { l: k.book ? 0.6 : 0.3, r: k.gun ? 0.85 : 0.35 }, tap: k.typing } };
    }
    case 'pageScan': {
      const p = work?.point ?? front(0.4, 0, waist + 0.3);
      const off = (o: BarOffset) => at(p, o.side * sl, o.up, o.ahead);
      const k = pageScanRound(t, toolPhase(b.base));
      return { reach: { l: off(k.l), r: off(k.r), palms: 1.3, lean: 0.3, nod: 0.5, grip: { l: 0.15, r: k.flip > 0 && k.flip < 1 ? 0.55 : 0.15 } } };
    }
    case 'bookShow': {
      // A book held out to someone (`work` its middle, the cover turned to them), a finger going to it now and then.
      const p = work?.point ?? front(0.32, 0, chest);
      const pt = Math.max(0, wave(t, 0.13, s)) ** 6;
      const r = at(p, -0.12 * sl, -0.03, -0.015).lerp(at(p, -0.03 * sl, 0.03, 0.03), pt);
      return { reach: { l: at(p, 0.12 * sl, -0.03, -0.015), r, palms: 0.1, lean: 0.12, nod: 0.25, grip: { l: 0.55, r: 0.55 - 0.3 * pt } } };
    }
    case 'incense':
    case 'officiate':
    case 'usher':
    case 'shroud':
      return mourning(m, b, work, t, s, front, at, sl, waist, chest);
    // The woodworking shop (2026-10-27, the 목공소; see planeRound and the rounds after it).
    case 'plane':
    case 'handSaw':
    case 'chisel':
    case 'assemble':
    case 'ripSaw':
    case 'woodFinish':
    case 'sightBoard':
    case 'drillPress':
      return woodwork(m, b, work, t);
    case 'solder': {
      // The iron in the right hand like a pen, the solder wire pinched in the left (solderRound); bent close over the board.
      const p = work?.point ?? front(0.4, 0, waist + 0.15);
      const off = (o: BarOffset) => at(p, o.side * sl, o.up, o.ahead);
      const k = solderRound(t, toolPhase(b.base));
      return { reach: { l: off(k.l), r: off(k.r), palms: 1.2, lean: 0.38, nod: 0.55, grip: { l: 0.8, r: 0.85 } } };
    }
    case 'probe': {
      // The probe's tip on a test point in the right hand, the left steadying the board or turning the scope's knob; looking up at the trace (probeRound).
      const p = work?.point ?? front(0.4, 0, waist + 0.15);
      const off = (o: BarOffset) => at(p, o.side * sl, o.up, o.ahead);
      const k = probeRound(t, toolPhase(b.base));
      return { reach: { l: off(k.l), r: off(k.r), palms: 1.1 - 0.5 * k.turn, lean: 0.34 - 0.12 * k.look, nod: 0.5 - 0.42 * k.look, grip: { l: 0.25 + 0.5 * k.turn, r: 0.85 } } };
    }
    case 'pendant': {
      // A robot's teach pendant held in both hands at the chest (`work` its middle): the right thumb
      // jogging on its keys while looking down at it, then the head up to watch the arm move.
      const p = work?.point ?? front(0.3, 0, chest - 0.08);
      const look = smooth(wave(t, 0.09, s), -0.35, 0.35);
      const tap = 0.012 * Math.max(0, wave(t, 2.2, s)) * (1 - look);
      return { reach: { l: at(p, 0.1 * sl, -0.01), r: at(p, -0.09 * sl, -0.004 + tap, 0.01), palms: 0.9, lean: 0.04, nod: 0.42 - 0.55 * look, grip: { l: 0.75, r: 0.55 } } };
    }
    default:
      return {};
  }
}

/*
 * Flowers worked at the florist's table (2026-10-27, the 웨딩 컨설팅, at the user's request: arranging
 * flowers should look like it), stood at it, ~12 s round. A hand-tied bouquet (floristry): held by its
 * binding point in the left hand (`work`), the right taking a stem at a time from the pile laid on the
 * table, lifting it over the crown and pushing it down in among the others, three times; then the
 * snips taken up off the table, the stem ends under the hand cut level along (snip, snip, snip), and
 * the snips put back. In a vase (floralArrange) the left hand steadies the vase's rim instead, the
 * stems go in round its mouth and the snips trim along the top. Offsets are from `work` (BarOffset:
 * to the florist's left, up, away from them); `stem` is which of the three is in the hand (-1 none),
 * `added` how many have gone in, `snips` whether the snips are in the hand and `open` how far open.
 */
export const FLORAL = { pile: bo(-0.3, -0.2, 0.15), snips: bo(-0.17, -0.205, 0.08) };
export function floralRound(t: number, phase: number, vase = false) {
  const u = ((t / 12 + phase) % 1 + 1) % 1;
  const sm = (a: number, z: number) => THREE.MathUtils.smoothstep(u, a, z);
  const l = vase ? bo(0.11, -0.03, 0) : bo(0, -0.01, -0.02);
  const rest = vase ? bo(-0.1, 0.03, -0.06) : bo(-0.08, 0, -0.05);
  const into = (i: number) => (vase ? bo(-0.05 + i * 0.05, 0.06 + (i % 2) * 0.03, 0.02 * (i - 1)) : bo(-0.03 + i * 0.03, 0.04, 0.02 - i * 0.02));
  let r: BarOffset;
  let stem = -1;
  let added: number;
  let open = 0;
  let snips = false;
  if (u < 0.6) {
    const i = Math.floor(u / 0.2);
    const v = (u - i * 0.2) / 0.2;
    const vs = (a: number, z: number) => THREE.MathUtils.smoothstep(v, a, z);
    r = boMix(i === 0 ? rest : into(i - 1), FLORAL.pile, vs(0, 0.28));
    r = boMix(r, boAdd(into(i), bo(0, 0.12, 0)), vs(0.38, 0.68));
    r = boMix(r, into(i), vs(0.72, 0.88));
    stem = v > 0.3 && v < 0.88 ? i : -1;
    added = i + (v >= 0.88 ? 1 : 0);
  } else {
    added = 3;
    // The hand back from the stems by the blades' length.
    const cut = vase ? bo(0.01, 0.19, -0.05) : bo(0.02, -0.17, -0.05);
    r = boMix(into(2), FLORAL.snips, sm(0.6, 0.66));
    r = boMix(r, cut, sm(0.68, 0.73));
    const c = THREE.MathUtils.clamp((u - 0.73) / 0.13, 0, 1);
    r = boAdd(r, bo(-0.05 * c * sm(0.68, 0.73), 0, 0));
    r = boMix(r, FLORAL.snips, sm(0.86, 0.91));
    r = boMix(r, rest, sm(0.93, 0.99));
    snips = u > 0.66 && u < 0.905;
    open = u > 0.73 && u < 0.86 ? 0.5 - 0.5 * Math.cos(c * Math.PI * 6) : snips ? 0.15 : 0;
  }
  // Bent a little more over the table for the pile and the snips.
  const bend = Math.max(0, -r.up - 0.1) / 0.1;
  return { u, l, r, stem, added, snips, open, bend: Math.min(1, bend) };
}

/*
 * A wedding album shown across a table (2026-10-27, the 웨딩 컨설팅, at the user's request: a
 * consultation should look like one), sat, ~11 s round. The album lies open at `work` turned round to
 * the couple, the left hand on its near corner; the right lifts the page on the planner's left, turns
 * it over the spine to the right, points out a photo on the new spread with a tap or two, opens up to
 * the couple as it's talked through, and comes back to the near corner. `flip` is how far over the
 * page is (0–1), `n` the spread (one more each round), `point` and `open` 0–1.
 */
export function albumRound(t: number, phase: number) {
  const c = t / 11 + phase * 3;
  const n = Math.floor(c);
  const u = c - n;
  const sm = (a: number, z: number) => THREE.MathUtils.smoothstep(u, a, z);
  const l = bo(0.2, 0.015, -0.13);
  const rest = bo(-0.2, 0.02, -0.14);
  let r = boMix(rest, bo(0.21, 0.02, -0.02), sm(0.04, 0.14));
  const flip = sm(0.16, 0.36);
  // Round over the spine with the page's edge.
  if (u >= 0.16) r = bo(0.21 * Math.cos(flip * Math.PI), 0.02 + 0.2 * Math.sin(flip * Math.PI), -0.02);
  r = boMix(r, bo(-0.1, 0.03, 0.04 + 0.05 * (n % 2)), sm(0.38, 0.46));
  if (u > 0.46 && u < 0.62) r = boAdd(r, bo(0, 0.014 * Math.max(0, Math.sin(t * Math.PI * 2 * 1.4)), 0));
  r = boMix(r, bo(-0.12, 0.2, 0.0), sm(0.64, 0.72));
  r = boMix(r, rest, sm(0.86, 0.96));
  const point = sm(0.38, 0.44) * (1 - sm(0.62, 0.66));
  const open = sm(0.64, 0.72) * (1 - sm(0.86, 0.94));
  return { n, u, l, r, flip, point, open };
}

/*
 * The city library (2026-10-27, the 시립 도서관, at the user's request: shelving should look like
 * shelving). Offsets are BarOffsets from `work` in the librarian's own frame (to their left, up, away
 * from them), and the stacks, the story corner, the desks and the scanner (workplaces/librarian.ts)
 * move their books by the same clocks (toolPhase of the librarian's spot).
 */

/**
 * The stacks and the book truck: `work` is on the shelves' face straight ahead, `base` above the
 * floor. Each shelf's books stand on `levels` (from the floor), `tall` high and `deep` deep; the
 * truck's top tier is at the right hand, a book standing in it at `cart`; this round's gap is one of
 * `slots` (a shelf and how far to the left).
 */
export const SHELVE = {
  base: 1.0,
  levels: [0.1, 0.45, 0.8, 1.15, 1.5],
  tall: 0.22,
  deep: 0.2,
  cart: bo(-0.38, -0.17, -0.2),
  slots: [
    { level: 2, side: 0.22 },
    { level: 0, side: -0.16 },
    { level: 3, side: 0.04 },
    { level: 1, side: 0.3 },
    { level: 4, side: -0.06 },
  ],
};
/** A shelved book's middle, `ahead` of the shelves' face, in its gap. */
export const shelfBook = (s: { level: number; side: number }, ahead: number) => bo(s.side, SHELVE.levels[s.level] + SHELVE.tall / 2 - SHELVE.base, ahead);
/**
 * A book shelved from the truck (shelve), stood at the stacks, ~10 s a book: the right hand takes it
 * off the truck's top tier, lifts it out and brings it up before the chest, the left hand coming to it
 * while its call-number label is read; then it's carried to its gap — up high, at the chest, or down
 * low with a squat — the left hand parting the books beside the gap, slid in by its spine till it's
 * flush, squared with a tap, and the hands come back. `book` is its middle, `held` while it's in the
 * hand, `shelved` once it's home; `slot` the gap this round, `n` the round.
 */
export function shelveRound(t: number, phase: number) {
  const c = t / 10 + phase * 5;
  const n = Math.floor(c);
  const u = c - n;
  const slot = SHELVE.slots[((n % SHELVE.slots.length) + SHELVE.slots.length) % SHELVE.slots.length];
  const out = shelfBook(slot, SHELVE.deep / 2 - 0.13);
  const home = shelfBook(slot, SHELVE.deep / 2);
  const lift = boAdd(SHELVE.cart, bo(0, 0.18, 0));
  const read = bo(-0.05, 0.14, -0.24);
  const book = keyed<BarOffset>([[0.12, SHELVE.cart], [0.19, lift], [0.28, read], [0.4, read], [0.53, out], [0.57, out], [0.68, home]], u, boMix);
  // The right hand on the book's spine (its near end); the left, flat on the spines beside the gap.
  const spine = (o: BarOffset) => boAdd(o, bo(0, 0.01, -SHELVE.deep / 2 - 0.02));
  const restR = bo(-0.2, -0.16, -0.3);
  const restL = bo(0.2, -0.16, -0.3);
  let r: BarOffset;
  if (u < 0.12) r = boMix(restR, spine(SHELVE.cart), THREE.MathUtils.smoothstep(u, 0.02, 0.11));
  else if (u < 0.69) r = spine(book);
  else {
    // Squared up with a tap or two, then back.
    const tap = u < 0.76 ? 0.012 * Math.max(0, Math.sin(((u - 0.69) / 0.035) * Math.PI)) : 0;
    r = boMix(boAdd(spine(home), bo(0, 0, tap)), restR, THREE.MathUtils.smoothstep(u, 0.77, 0.88));
  }
  const part = boAdd(shelfBook(slot, 0), bo(0.07, 0, -0.02));
  const l = keyed<BarOffset>([[0.2, restL], [0.28, boAdd(read, bo(0.09, -0.01, 0.01))], [0.4, boAdd(read, bo(0.09, -0.01, 0.01))], [0.5, part], [0.69, part], [0.79, restL]], u, boMix);
  // Squatting to the low shelves, the eyes on the hand (up to the top shelf, down to the label).
  const y = SHELVE.base + r.up;
  const crouch = THREE.MathUtils.clamp((0.8 - y) / 0.5, 0, 1);
  const reading = THREE.MathUtils.smoothstep(u, 0.22, 0.28) * (1 - THREE.MathUtils.smoothstep(u, 0.4, 0.46));
  const nod = numMix(THREE.MathUtils.clamp((1.4 - y) * 0.6, -0.18, 0.45), 0.5, reading);
  return { n, u, slot, book, r, l, held: u >= 0.11 && u < 0.69, shelved: u >= 0.68, crouch, lean: 0.08 + 0.32 * crouch, nod };
}

/** A picture book's size, open (both pages across, and high). */
export const STORYBOOK = { wide: 0.42, high: 0.29 };
/** Turns an offset round the book's spine by `a` (the book shown round the room). */
export const turnAbout = (o: BarOffset, a: number) => bo(o.side * Math.cos(a) + o.ahead * Math.sin(a), o.up, -o.side * Math.sin(a) + o.ahead * Math.cos(a));
/**
 * A picture book read to children (storyRead), sat on a low chair facing them, ~16 s a spread. The
 * book is held up open beside the face, turned round to the children (`work` the middle of its spine):
 * the right hand under the spine, the left on the edge of the page on the reader's left. The reader
 * reads it off the page, points out something in the picture (the hand round the front, a tap or two),
 * shows the spread round the circle from one side to the other (`turn`), then turns the page over —
 * the left hand taking its corner over through the front to the other side (`flip` 0–1) — for the next
 * spread (`n`). `point` 0–1.
 */
export function storyRound(t: number, phase: number) {
  const c = t / 16 + phase * 3;
  const n = Math.floor(c);
  const u = c - n;
  const sm = (a: number, z: number) => THREE.MathUtils.smoothstep(u, a, z);
  const half = STORYBOOK.wide / 2;
  const edge = bo(half + 0.01, 0.02, -0.015);
  const at = bo(0.1, 0.03, 0.07);
  const turn = keyed<number>([[0.44, 0], [0.52, -0.35], [0.6, -0.35], [0.7, 0.35], [0.77, 0.35], [0.83, 0]], u, numMix);
  const flip = sm(0.86, 0.97);
  const point = sm(0.18, 0.25) * (1 - sm(0.37, 0.43));
  let l = boMix(edge, at, point);
  if (point > 0.9) l = boAdd(l, bo(0, 0, -0.012 * Math.max(0, Math.sin(t * Math.PI * 2 * 1.3))));
  if (u >= 0.84) {
    // The page's top corner, over through the front; then the hand back round behind to the edge.
    const a = flip * Math.PI;
    const corner = bo(half * Math.cos(a), 0.09, -0.01 + half * 0.9 * Math.sin(a));
    l = boMix(edge, corner, sm(0.84, 0.87));
    l = boMix(l, edge, sm(0.97, 1));
    if (u > 0.97) l = boAdd(l, bo(0, 0, -0.08 * Math.sin(sm(0.97, 1) * Math.PI)));
  }
  const r = bo(0, -STORYBOOK.high / 2 - 0.01, -0.02);
  // Reading it off the page (the head over to it), looking out at the children while it's shown.
  const nod = 0.22 - 0.3 * Math.max(point, Math.abs(turn) / 0.35);
  return { n, u, l: turnAbout(l, turn), r: turnAbout(r, turn), turn, flip, point, nod };
}

/**
 * Books through the desk (checkout), sat at it, ~9 s a book; or catalogued (catalogue) at the
 * cataloguing desk. `work` is the scanning pad's middle. The left hand takes the top book off the pile
 * at the left, lays it on the pad and holds it while the right takes the barcode scanner off its
 * cradle and aims it at the barcode — a beep (`beam`) — and puts it back; the left slides the book
 * across to whoever's borrowing it (catalogued, onto the done pile at the right), and the right goes
 * to the keys. `bookAt` is where the book's middle is (null once it's gone), `gun` the scanner in hand.
 */
export const DESK_BOOKS = { pile: bo(0.32, 0.05, 0.02), pad: bo(0, 0.02, 0), lent: bo(-0.08, 0.02, 0.2), done: bo(-0.36, 0.06, 0.06), cradle: bo(-0.27, 0.1, 0.02), aim: bo(-0.04, 0.17, -0.03), keys: bo(-0.02, -0.005, -0.2) };
export function checkoutRound(t: number, phase: number, catalogue = false) {
  const u = ((t / 9 + phase) % 1 + 1) % 1;
  const D = DESK_BOOKS;
  const sm = (a: number, z: number) => THREE.MathUtils.smoothstep(u, a, z);
  const away = catalogue ? D.done : D.lent;
  const book = keyed<BarOffset>([[0.08, D.pile], [0.14, boAdd(D.pile, bo(0, 0.08, -0.04))], [0.22, D.pad], [0.6, D.pad], [0.7, away]], u, boMix);
  const restL = bo(0.24, 0.0, -0.18);
  const hold = boAdd(book, bo(0.07, 0.02, -0.02));
  let l = boMix(restL, hold, sm(0.02, 0.08));
  l = boMix(l, restL, sm(0.72, 0.8));
  let r = boMix(D.keys, D.cradle, sm(0.2, 0.28));
  r = boMix(r, D.aim, sm(0.3, 0.37));
  r = boMix(r, D.cradle, sm(0.52, 0.58));
  r = boMix(r, D.keys, sm(0.62, 0.72));
  return { u, book, l, r, gun: u > 0.27 && u < 0.585, beam: u > 0.4 && u < 0.47, typing: u < 0.18 || u > 0.74, inHand: u > 0.07 && u < 0.71 };
}

/**
 * Old papers digitized at the overhead book scanner (pageScan), stood at its cradle, ~8 s a spread:
 * both hands flatten the open book at the pages' outer edges, come off for the shot (`flash`), then
 * the right hand takes the right-hand page's corner over the spine to the left (`flip` 0–1) and both
 * flatten the next spread. `work` is the middle of the spine; `n` the spread.
 */
export const SCAN_BOOK = { half: 0.19 };
export function pageScanRound(t: number, phase: number) {
  const c = t / 8 + phase * 2;
  const n = Math.floor(c);
  const u = c - n;
  const sm = (a: number, z: number) => THREE.MathUtils.smoothstep(u, a, z);
  const h = SCAN_BOOK.half;
  const pressL = bo(h - 0.01, 0.012, -0.07);
  const pressR = bo(-h + 0.01, 0.012, -0.07);
  const offL = bo(h + 0.08, 0.1, -0.16);
  const offR = bo(-h - 0.08, 0.1, -0.16);
  const flip = sm(0.38, 0.56);
  const corner = bo(-h * Math.cos(flip * Math.PI), 0.01 + h * 0.8 * Math.sin(flip * Math.PI), -0.08);
  let l = boMix(pressL, offL, sm(0.12, 0.18));
  l = boMix(l, pressL, sm(0.6, 0.68));
  let r = boMix(pressR, offR, sm(0.12, 0.18));
  r = boMix(r, bo(-h - 0.01, 0.02, -0.08), sm(0.3, 0.37));
  if (u >= 0.37) r = boMix(r, corner, sm(0.37, 0.39));
  if (u >= 0.56) r = boMix(corner, pressR, sm(0.57, 0.66));
  return { n, u, l, r, flip, flash: u > 0.2 && u < 0.27 };
}

/**
 * A dweller at a spot of the thing's own (parts.ts Spot, 2026-10-26): sat on it, stood on it, or flying
 * over it — bobbing on the air, drifting and slowly turning — facing the way the spot faces now (it
 * may be on something that spins), and what their hands do there.
 */
export function spotPose(spot: Spot, use: Motion, height: number, t: number, seed: number): { pose: BodyPose; doing: Doing } {
  const posed = spotPoseBare(spot, use, height, t, seed);
  // A tool the piece has put in their hands (handTool.ts) goes with whatever the motion has the hands do.
  if (spot.held) posed.doing = { ...posed.doing, reach: { ...posed.doing.reach, hold: spot.held } };
  return posed;
}

function spotPoseBare(spot: Spot, use: Motion, height: number, t: number, seed: number): { pose: BodyPose; doing: Doing } {
  const m = spot.motion ?? use;
  // When it was last stood at, so a piece used more than one way can tell which use is going on (workplaces/barista.ts).
  spot.at.userData.posedAt = t;
  // And how tall they are (a booth's headphones go on their head, its mic up to their mouth: workplaces/singer.ts).
  spot.at.userData.height = height;
  const at = spot.at.getWorldPosition(new THREE.Vector3());
  const face = new THREE.Vector3(0, 0, 1).transformDirection(spot.at.matrixWorld);
  let yaw = Math.atan2(face.x, face.z);
  const floor = at.y - (spot.drop ?? 0);
  const work = spot.work ? { point: spot.work.getWorldPosition(new THREE.Vector3()), across: new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)), floor } : null;
  // A yoga or Pilates flow (2026-10-27, asana.ts): the whole body posed, everyone in the room in step
  // as a class is (and a reformer's carriage with the legs on it); planning sat cross-legged with a
  // notebook. On a reformer the feet go to the footbar (`work`).
  // Up a climbing wall, along a boulder problem, riding a halfpipe, on a trampoline (2026-10-27,
  // workplaces/extremeAthleteMotion.ts): the whole body posed the same way, moved through the spot's frame.
  if (EXTREME_POSES.has(m)) return extremePose(m as ExtremePoseMotion, spot, height, t);
  // Sprinting from the blocks, the obstacle course, pull-ups, a squat, a bench press, the physio table, the ice bath, the agility ladder, a dribble and a shot (2026-10-27, workplaces/athleticMotion.ts).
  if (ATH_POSES.has(m)) return athPose(m as AthPoseMotion, spot, height, t);
  // Down the aisle behind the cart, up the door trainer's stairs and down its slide, the life vest, a CPR manikin (2026-10-31, the 승무원 브리핑 센터; workplaces/flightAttendantMotion.ts).
  if (FA_MOTIONS.has(m)) return faPose(m as FaMotion, spot, height, t);
  // The simulator on its legs, the briefing and its load sheet, the walk-around (2026-10-31, the 항공사 운항 센터; workplaces/pilotMotion.ts).
  if (PL_MOTIONS.has(m)) return plPose(m as PlMotion, spot, height, t);
  // Closing a kitchen and a bakery, sweeping a salon's floor, sanding, soaking off gel (workplaces/handWorkMotions.ts).
  if (HW_MOTIONS.has(m)) return hwPose(m as HwMotion, spot, height, t);
  // The 기상청 예보실's fronts, balloon, rain gauge and on-air mark (workplaces/meteorologistMotion.ts).
  if (MT_MOTIONS.has(m)) return mtPose(m as MtMotion, spot, height, t);
  // The racks, the dosing unit and the benches at the 스마트팜 (workplaces/smartFarmerMotion.ts).
  if (VF_MOTIONS.has(m)) return vfPose(m as VfMotion, spot, height, t);
  // The 영화 촬영장's takes in the rain, stunts, script work and the waiting (workplaces/actorMotion.ts).
  if (AC_MOTIONS.has(m)) return acPose(m as AcMotion, spot, height, t);
  // The dance itself, the barre, the stage and the lift at the 댄스 스튜디오 (workplaces/dancerMotion.ts).
  if (DN_MOTIONS.has(m)) return dnPose(m as DnMotion, spot, height, t);
  // The kitchen line, the till, the window and the floor at the 패스트푸드점 (workplaces/fastFoodMotion.ts).
  if (FF_MOTIONS.has(m)) return ffPose(m as FfMotion, spot, height, t);
  // The till, the shelves, the chillers and the terrace at the 편의점 (workplaces/convenienceManagerMotion.ts).
  if (CV_MOTIONS.has(m)) return cvPose(m as CvMotion, spot, height, t);
  // The folding, the till, the fitting rooms, the window and the stock room at the 옷가게 (workplaces/retailMotion.ts).
  if (RT_MOTIONS.has(m)) return rtPose(m as RtMotion, spot, height, t);
  // The desk, the booths, the mirror and the wall at the 방송국 아나운서실 (workplaces/announcerMotion.ts).
  if (AN_MOTIONS.has(m)) return anPose(m as AnMotion, spot, height, t);
  // The talk show, the cameras, the gallery, the game corner and the green room at the 방송국 스튜디오 (workplaces/tvHostMotion.ts).
  if (TS_MOTIONS.has(m)) return tsPose(m as TsMotion, spot, height, t);
  // The pipes cut and threaded, the leak found, the boiler and the drain at the 설비 업체 (workplaces/plumberMotion.ts).
  if (PB_MOTIONS.has(m)) return pbPose(m as PbMotion, spot, height, t);
  // The tablet, the printer, the critique wall and the mock-up table at the 디자인 스튜디오 (workplaces/graphicDesignerMotion.ts).
  if (DG_MOTIONS.has(m)) return dgPose(m as DgMotion, spot, height, t);
  // The counting tray, the packer, the slab and the counter at the 약국 (workplaces/pharmacistMotion.ts).
  if (RX_MOTIONS.has(m)) return rxPose(m as RxMotion, spot, height, t);
  // The contract sealed, the board, the map, the keys and the tea at the 부동산 사무소 (workplaces/realEstateMotion.ts).
  if (RE_MOTIONS.has(m)) return rePose(m as ReMotion, spot, height, t);
  // The arc, the torch, the block and the crane at the 조선소 용접장 (workplaces/welderMotion.ts).
  if (WD_MOTIONS.has(m)) return wdPose(m as WdMotion, spot, height, t);
  // The mic off its stand, the wait for the laugh, the writing, the bar and the green room at the 코미디 클럽 공연장 (workplaces/entertainerMotion.ts).
  if (EN_MOTIONS.has(m)) return enPose(m as EnMotion, spot, height, t);
  // The digging, planting, paving, the machine and the morning's talk at the 조경 공사 현장 (workplaces/manualLaborMotion.ts).
  if (ML_MOTIONS.has(m)) return mlPose(m as MlMotion, spot, height, t);
  // An oil change, the machine's cleaning, a stock order, pests in the bed and in the field (workplaces/workExtraMotion.ts).
  if (XE_MOTIONS.has(m)) return xePose(m as XeMotion, spot, height, t);
  // The boat readied, the nets mended, the catch sorted and sold, the ice and the squid at the 어항 (workplaces/fisherMotion.ts).
  if (FH_MOTIONS.has(m)) return fhPose(m as FhMotion, spot, height, t);
  // The dives, the fire, the catch cleaned, weighed and sold at the 해녀의 집 (workplaces/haenyeoMotion.ts).
  if (HY_MOTIONS.has(m)) return hyPose(m as HyMotion, spot, height, t);
  // The forest office's day (workplaces/foresterMotion.ts).
  if (FG_MOTIONS.has(m)) return fgPose(m as FgMotion, spot, height, t);
  // The tanks fed and tested, the pens walked, the pumps, the fry, the grading and the boxes at the 양식장 (workplaces/fishFarmerMotion.ts).
  if (YA_MOTIONS.has(m)) return yaPose(m as YaMotion, spot, height, t);
  // The bed, the needle, the flash wall, the light box, the inks and the film at the 타투 스튜디오 (workplaces/tattooArtistMotion.ts).
  // The pigeonholes, the counter, the bike's box and the walk-out round at the 우체국 (workplaces/mailCarrierMotion.ts).
  if (MP_MOTIONS.has(m)) return mpPose(m as MpMotion, spot, height, t);
  // The truck's hopper, the sorting belt, the cart, the sand, the lockers, the board and the urn at the 청소 차고지 (workplaces/sanitationWorkerMotion.ts).
  if (SN_MOTIONS.has(m)) return snPose(m as SnMotion, spot, height, t);
  if (TT_MOTIONS.has(m)) return ttPose(m as TtMotion, spot, height, t);
  // The desks, the wall, the board, the signals, the safe, the badges, the kit and the mat at the 정보 분석센터 (workplaces/secretAgentMotion.ts).
  if (IC_MOTIONS.has(m)) return icPose(m as IcMotion, spot, height, t);
  // The desks, the review, the draft, the stream, the wrists and the stage at the e스포츠 게임단 연습실 (workplaces/proGamerMotion.ts).
  if (EG_MOTIONS.has(m)) return egPose(m as EgMotion, spot, height, t);
  // The X-rays, tables, desks, lanes, dog, cage, cameras, carousel and duty counter at the 공항 세관 (workplaces/customsOfficerMotion.ts).
  if (CU_MOTIONS.has(m)) return cuPose(m as CuMotion, spot, height, t);
  // The suits, shower, scanner, coater, rail, robot, tool row, wet bench, microscope, yield board and gas room at the 반도체 팹 (workplaces/semiconductorMotion.ts).
  if (FB_MOTIONS.has(m)) return fbPose(m as FbMotion, spot, height, t);
  // The racks, disks, patch frame, floor, cooling, power, control room and door at the 데이터센터 (workplaces/dataCenterMotion.ts).
  if (DC_MOTIONS.has(m)) return dcPose(m as DcMotion, spot, height, t);
  // The analyser, centrifuge, microscope, cold stores, hatch, bench, culture cabinet, results desk and bin at the 진단검사센터 (workplaces/labTechnicianMotion.ts).
  if (LT_MOTIONS.has(m)) return ltPose(m as LtMotion, spot, height, t);
  // The desks, labelling, board, GPU rack, demo screen, results wall, reading corner and posters at the 인공지능 연구소 (workplaces/aiResearcherMotion.ts).
  if (AR_MOTIONS.has(m)) return arPose(m as ArMotion, spot, height, t);
  // The desks, board, binders, listening station, role-play set, quiet booth, tea and chair at the 고객센터 (workplaces/callCenterMotion.ts).
  if (CS_MOTIONS.has(m)) return csPose(m as CsMotion, spot, height, t);
  // The desks, shelves, booths, board, table, counter and practice corner at the 통번역 사무소 (workplaces/interpreterMotion.ts).
  if (IP_MOTIONS.has(m)) return ipPose(m as IpMotion, spot, height, t);
  // The machines, tables, form, press, rack, fitting corner, rail and runway at the 패션 아틀리에 (workplaces/fashionDesignerMotion.ts).
  if (FD_MOTIONS.has(m)) return fdPose(m as FdMotion, spot, height, t);
  // The consoles, the suit, the fitting rack, the low-gravity rig, the arm trainer, the glovebox, the survival corner and the press wall at the 우주 센터 (workplaces/astronautMotion.ts).
  if (AS_MOTIONS.has(m)) return asPose(m as AsMotion, spot, height, t);
  // The booths, the stands, the mirror, the desks, the console, the line, the foley table, tea, the rack and the crew desk at the 녹음 스튜디오 (workplaces/voiceActorMotion.ts).
  if (VA_MOTIONS.has(m)) return vaPose(m as VaMotion, spot, height, t);
  // The desks, map, coach, rack, counter, gear table and photo wall at the 여행사 (workplaces/tourGuideMotion.ts).
  if (TG_MOTIONS.has(m)) return tgPose(m as TgMotion, spot, height, t);
  // The counter, kiosk, form stand, booth, notice board, record stacks, relief cage and meeting cabinet at the 주민센터 (workplaces/civilServantMotion.ts).
  if (JU_MOTIONS.has(m)) return juPose(m as JuMotion, spot, height, t);
  // The desks, booths, board, claims window, appointment desk, rack, records wall and bag at the 보험 지점 (workplaces/insuranceAgentMotion.ts).
  if (BH_MOTIONS.has(m)) return bhPose(m as BhMotion, spot, height, t);
  // The table, saw, walls, floor bay, ladder corner, laser, plan, stock and finished room at the 인테리어 시공 현장 (workplaces/wallpapererMotion.ts).
  if (WL_MOTIONS.has(m)) return wlPose(m as WlMotion, spot, height, t);
  // The consoles, door panel, gate, rounds post, booth, table, baking class, book cart, yard, nurse's counter and lockers at the 교정시설 (workplaces/correctionsOfficerMotion.ts).
  if (GJ_MOTIONS.has(m)) return gjPose(m as GjMotion, spot, height, t);
  // The range, the sentry post, the march route, the bench and the morning's rank at the 군 기지 (workplaces/militaryMotion.ts).
  if (MI_MOTIONS.has(m)) return miPose(m as MiMotion, spot, height, t);
  // A fire lit and put out, a baby fed, changed and held at home (home/restMotion.ts).
  if (RS_MOTIONS.has(m)) return rsPose(m as RsMotion, spot, height, t);
  // A meal, a drink, the dishes and the grill at home (home/kitchenMotion.ts).
  if (KT_MOTIONS.has(m)) return ktPose(m as KtMotion, spot, height, t);
  // A hand-wash at home (home/bathMotion.ts).
  if (BT_MOTIONS.has(m)) return btPose(m as BtMotion, spot, height, t);
  // The hobbies at home: a telescope, chess, the mirror, the wardrobe, the easel, a violin, a guitar, a camera, the planter, a book (home/hobbyMotion.ts).
  if (HF_MOTIONS.has(m)) return hfPose(m as HfMotion, spot, height, t);
  // The TV, the stereo, the karaoke, the fish tank, the pond, the climbing frame and the pool at home (home/playMotion.ts).
  if (PG_MOTIONS.has(m)) return pgPose(m as PgMotion, spot, height, t, seed);
  // The computers, the desk, the microscope, the model, the bench and the rocket at home (home/studyMotion.ts).
  if (GB_MOTIONS.has(m)) return gbPose(m as GbMotion, spot, height, t);
  // The arm's cage, the walking course, the bench, the dock, the simulation room, the board and the printer at the 로봇 연구소 (workplaces/roboticistMotion.ts).
  if (RL_MOTIONS.has(m)) return rlPose(m as RlMotion, spot, height, t);
  // The test track, the board, the desks and the bay at the 자율주행차 개발 센터 (workplaces/selfDrivingMotion.ts).
  if (SD_MOTIONS.has(m)) return sdPose(m as SdMotion, spot, height, t);
  // The panels, the turbine, the mock-up, the inverters, the battery, the desk, the mast, the fence and the harnesses at the 발전 단지 (workplaces/greenEnergyMotion.ts).
  if (GE_MOTIONS.has(m)) return gePose(m as GeMotion, spot, height, t);
  if (isAsanaFlow(m)) {
    const beat = asanaBeat(m, t);
    const hands = m === 'yogaPlan' ? doing('meeting', { base: at, yaw, height, sitting: true }, null, t, seed) : {};
    return { pose: { kind: 'asana', at, yaw, floor, from: beat.from, to: beat.to, e: beat.e, feet: work?.point }, doing: { ...hands, shut: beat.shut } };
  }
  if (spot.how === 'sit') return { pose: { kind: 'sit', at, yaw, floor, legs: spot.legs }, doing: doing(m, { base: at, yaw, height, sitting: true }, work, t, seed) };
  if (spot.how === 'stand') {
    const d = doing(m, { base: at, yaw, height, sitting: false }, work, t, seed);
    return { pose: { kind: 'stand', at, yaw, crouch: d.crouch }, doing: d };
  }
  const s = seed * 0.37;
  at.y += 0.1 * wave(t, 0.21, s) + 0.035 * wave(t, 0.8, s);
  at.x += 0.06 * wave(t, 0.13, s);
  at.z += 0.06 * wave(t, 0.13, s + 0.25);
  yaw += 0.7 * wave(t, 0.04, s);
  return { pose: { kind: 'fly', at, yaw, floor }, doing: doing(m, { base: at, yaw, height, sitting: false }, work, t, seed) };
}

/*
 * A club night (2026-10-27, the 나이트클럽, at the user's request: DJing should look like DJing). The
 * club runs at CLUB_BPM and everything in it hits on the same kick (clubPulse): the DJ's nod and
 * bounce, the booth's meters, the lit dance floor, the lights on the truss, the LED wall.
 */
export const CLUB_BPM = 126;
export const CLUB_BEAT = 60 / CLUB_BPM;
export const CLUB_BAR = CLUB_BEAT * 4;
/** How hard the beat hits at `t`: 1 on the kick, dying away before the next. */
export function clubPulse(t: number): number {
  const f = (((t / CLUB_BEAT) % 1) + 1) % 1;
  return Math.exp(-5 * f);
}

/**
 * The decks as the DJ stands behind them, from the mixer's top middle (`work`) in the DJ's frame
 * (BarOffset: to their left, up, away from them): each turntable's platter middle `platter` to
 * either side (the left deck to their left) and its record's top `platterUp` over the mixer; the
 * crossfader's slot near them (`travel` either way of its middle); the two channels' EQ columns
 * `eqSide` either side of the middle, its knobs' rows (high, mid, low) and the filter knob below.
 * The booth (workplaces/dj.ts) is drawn from the same numbers.
 */
export const DJ_DECK = { platter: 0.43, platterUp: 0.03, platterR: 0.15, fader: { up: 0.012, ahead: -0.115, travel: 0.04 }, eqSide: 0.045, eqRows: [0.075, 0.035, -0.005], filterAhead: -0.045 };

export type DjSec = 'cue' | 'eq' | 'fader' | 'scratch' | 'build' | 'drop';
/** A set's eight bars, round and round: cueing the next record, riding the EQ, the crossfader, a scratch, the build and the drop. At peak time the drop comes every four. */
const DJ_SET: DjSec[] = ['cue', 'cue', 'eq', 'eq', 'fader', 'scratch', 'build', 'drop'];
const DJ_PEAK: DjSec[] = ['cue', 'build', 'drop', 'drop'];
interface DjKey {
  l: BarOffset;
  r: BarOffset;
  /** The left hand pressing the headphones' cup to the ear (0–1); each fist up for the drop (0–1). */
  ear: number;
  pumpL: number;
  pumpR: number;
  nod: number;
  lean: number;
  palms: number;
  gl: number;
  gr: number;
  crouch: number;
  /** The crossfader (-1 the right deck … 1 the left, as the DJ has them), the right deck's record pushed back and forth (radians), the turn of the knob under the right hand. */
  fader: number;
  scratch: number;
  knobTurn: number;
  /** Which knob the right hand's on: 0–2 the right channel's EQ high/mid/low, 3 its filter, -1 none. */
  knob: number;
}
/**
 * Where a DJ is in the set at `t` (`peak` at peak time) and how they're doing it, blended from bar to
 * bar: the left hand mostly up at the headphones' cup listening to the next record against the room,
 * the right nudging the right deck's platter in time (cue), twisting the EQ knobs one after another
 * (eq), sweeping the crossfader across (fader); then the left comes down to cut the crossfader while
 * the right scratches the record back and forth (scratch); the filter swept and the right hand rising
 * open for the build, and the fist pumping on every kick of the drop (both fists at peak time), the
 * head banging with it. The knees bounce on the beat throughout. Everyone at the decks is on the
 * club's one clock, as the booth's own parts are.
 */
export function djRound(t: number, peak = false): DjKey & { sec: DjSec; v: number } {
  const seq = peak ? DJ_PEAK : DJ_SET;
  const n = Math.floor(t / CLUB_BAR);
  const v = t / CLUB_BAR - n;
  const p = clubPulse(t);
  const D = DJ_DECK;
  const onFader = (f: number) => bo(f * D.fader.travel, D.fader.up + 0.03, D.fader.ahead - 0.01);
  const rest = bo(0.12, 0.03, -0.12);
  const key = (sec: DjSec, v: number): DjKey => {
    switch (sec) {
      case 'cue':
        return { l: rest, r: bo(-D.platter + 0.08, D.platterUp + 0.03, -0.08 + 0.012 * Math.sin(t * 4.4)), ear: 1, pumpL: 0, pumpR: 0, nod: 0.3 + 0.16 * p, lean: 0.12, palms: 1.2, gl: 0.35, gr: 0.35, crouch: 0.03 + 0.05 * p, fader: 0, scratch: 0.12 * Math.sin(t * 4.4), knobTurn: 0, knob: -1 };
      case 'eq': {
        const i = Math.min(2, Math.floor(v * 3));
        return { l: rest, r: bo(-D.eqSide, 0.045, D.eqRows[i] - 0.015), ear: 1, pumpL: 0, pumpR: 0, nod: 0.38 + 0.16 * p, lean: 0.14, palms: 1.0, gl: 0.35, gr: 0.65, crouch: 0.03 + 0.05 * p, fader: 0, scratch: 0, knobTurn: 0.9 * Math.sin(Math.PI * 2 * (v * 3 - i)), knob: i };
      }
      case 'fader': {
        const f = 0.9 * Math.sin(Math.PI * 2 * v);
        return { l: rest, r: onFader(f), ear: 1, pumpL: 0, pumpR: 0, nod: 0.36 + 0.16 * p, lean: 0.14, palms: 1.15, gl: 0.35, gr: 0.6, crouch: 0.03 + 0.05 * p, fader: f, scratch: 0, knobTurn: 0, knob: -1 };
      }
      case 'scratch': {
        // Baby scratches on the eighths, the fader cutting on the sixteenths.
        const w = Math.sin((t / CLUB_BEAT) * Math.PI * 2);
        const cut = Math.sin((t / CLUB_BEAT) * Math.PI * 4) > 0 ? 0.85 : -0.15;
        return { l: onFader(cut), r: bo(-D.platter + 0.03, D.platterUp + 0.025, -0.07 + 0.05 * w), ear: 0, pumpL: 0, pumpR: 0, nod: 0.5 + 0.1 * p, lean: 0.2, palms: 1.3, gl: 0.55, gr: 0.4, crouch: 0.05 + 0.04 * p, fader: cut, scratch: 0.9 * w, knobTurn: 0, knob: -1 };
      }
      case 'build': {
        const up = THREE.MathUtils.smoothstep(v, 0.5, 0.95);
        return { l: rest, r: bo(-D.eqSide, 0.045, D.filterAhead - 0.015), ear: 1, pumpL: 0, pumpR: 0.85 * up, nod: 0.4 - 0.5 * up + 0.1 * p, lean: 0.12 - 0.1 * up, palms: 1.0 - 1.0 * up, gl: 0.35, gr: 0.6 - 0.6 * up, crouch: 0.03 + 0.03 * p, fader: 0, scratch: 0, knobTurn: -1.2 + 2.4 * Math.min(1, v * 2), knob: 3 };
      }
      default:
        return { l: rest, r: rest, ear: peak ? 0 : 1, pumpL: peak ? 1 : 0, pumpR: 1, nod: 0.02 + 0.32 * p, lean: 0.04, palms: 0, gl: peak ? 1 : 0.35, gr: 1, crouch: 0.05 + 0.1 * p, fader: 0, scratch: 0, knobTurn: 0, knob: -1 };
    }
  };
  const sec = seq[((n % seq.length) + seq.length) % seq.length];
  const was = seq[(((n - 1) % seq.length) + seq.length) % seq.length];
  const z = key(sec, v);
  const e = THREE.MathUtils.smoothstep(v, 0, 0.14);
  if (e >= 1 || was === sec) return { ...z, sec, v };
  const a = key(was, 1);
  const mix = (q: number, r: number) => q + (r - q) * e;
  return {
    sec,
    v,
    l: boMix(a.l, z.l, e),
    r: boMix(a.r, z.r, e),
    ear: mix(a.ear, z.ear),
    pumpL: mix(a.pumpL, z.pumpL),
    pumpR: mix(a.pumpR, z.pumpR),
    nod: mix(a.nod, z.nod),
    lean: mix(a.lean, z.lean),
    palms: mix(a.palms, z.palms),
    gl: mix(a.gl, z.gl),
    gr: mix(a.gr, z.gr),
    crouch: mix(a.crouch, z.crouch),
    fader: mix(a.fader, z.fader),
    scratch: mix(a.scratch, z.scratch),
    knobTurn: e < 0.5 ? a.knobTurn : z.knobTurn,
    knob: e < 0.5 ? a.knob : z.knob,
  };
}

/**
 * A record crate dug through (2026-10-27, the 나이트클럽), ~10 s round. `work` is the top edge of the
 * front sleeve in the crate as it stands; the sleeves stand one behind the other `CRATE.gap` apart
 * going away from the DJ, `CRATE.h` tall, pivoting on their bottom edges. The right hand hooks the
 * top of each in turn and tips it forward against the ones before (its cover looked at a moment),
 * the left holding the tipped ones back, six of them; the seventh is lifted out in both hands to look
 * at the cover close, put back, and the tipped sleeves pushed back upright. `tilt(j)` is how far
 * sleeve j is tipped (radians), `lift` how far the seventh is out (0–1). The crate
 * (workplaces/dj.ts) tips and lifts them by the same clock (toolPhase of the spot).
 */
export const CRATE = { gap: 0.014, h: 0.31, tip: 0.62, picked: 6 };
export function digRound(t: number, phase: number) {
  const u = (((t / 10 + phase) % 1) + 1) % 1;
  const sm = (a: number, z: number) => THREE.MathUtils.smoothstep(u, a, z);
  const top = (j: number, th: number) => bo(0, -CRATE.h + CRATE.h * Math.cos(th), j * CRATE.gap - CRATE.h * Math.sin(th));
  const back = sm(0.9, 0.98);
  const cur = Math.min(CRATE.picked, Math.floor(u / 0.1));
  const v = u / 0.1 - Math.floor(u / 0.1);
  const curTip = cur < CRATE.picked ? CRATE.tip * THREE.MathUtils.smoothstep(v, 0.3, 0.65) : 0;
  const tilt = (j: number) => (j < cur ? CRATE.tip - 0.02 * (cur - 1 - j) : j === cur ? curTip : 0) * (1 - back);
  const lift = sm(0.62, 0.7) * (1 - sm(0.82, 0.88));
  // The tipped ones held back by the left hand's fingers on their tops.
  const held = cur > 0 ? top(cur - 1, tilt(cur - 1)) : top(0, 0);
  let l = boAdd(held, bo(0.07, 0.025, -0.01));
  let r: BarOffset;
  if (cur < CRATE.picked) {
    // To the top of the next, then pulling it over.
    const from = cur > 0 ? boAdd(top(cur - 1, tilt(cur - 1)), bo(-0.05, 0.03, 0)) : bo(-0.05, 0.03, -0.05);
    const hook = boAdd(top(cur, 0), bo(-0.04, 0.02, 0.012));
    r = boMix(from, hook, THREE.MathUtils.smoothstep(v, 0, 0.3));
    r = boMix(r, boAdd(top(cur, curTip), bo(-0.04, 0.025, -0.01)), THREE.MathUtils.smoothstep(v, 0.3, 0.65));
  } else {
    // The pick: both hands on its sides, up and out to look at, and back in.
    const at = pickedAt(lift);
    const grab = sm(0.6, 0.63) * (1 - sm(0.88, 0.9));
    l = boMix(l, boAdd(at, bo(0.16, 0.02, 0)), grab);
    r = boMix(boAdd(top(cur - 1, tilt(cur - 1)), bo(-0.05, 0.03, 0)), boAdd(at, bo(-0.16, 0.02, 0)), grab);
    // Then the left pushes the tipped ones back.
    if (u > 0.88) l = boMix(l, boAdd(top(0, tilt(0)), bo(0.03, 0.03, -0.03)), sm(0.88, 0.92));
  }
  return { u, l, r, tilt, lift };
}
/** The picked record's middle from `work`, lifted `k` (0 in the crate, 1 up to look at). */
export const pickedAt = (k: number): BarOffset => bo(0, -CRATE.h / 2 + 0.42 * k, CRATE.picked * CRATE.gap - 0.26 * k);

/** Sound-checking a speaker (2026-10-27, the 나이트클럽): the phone with its sound meter held in the right hand, from the feet of a 1.6 m dweller (scaled). */
export const SOUND_PHONE = { ahead: 0.3, side: -0.12, up: 0.72 };
/** How far the left hand is cupped behind the ear listening at `t` (0–1); the rest of the time it taps the phone. */
export function soundListen(t: number, phase: number): number {
  const u = (((t / 7 + phase) % 1) + 1) % 1;
  return THREE.MathUtils.smoothstep(u, 0.05, 0.15) * (1 - THREE.MathUtils.smoothstep(u, 0.55, 0.65));
}

// ---------------------------------------------------------------------------------------------
// The 장례식장 (2026-10-27, the workplace pipeline, at the user's request): offering incense at the
// 빈소's altar, leading a memorial from the side of it, greeting mourners at the guest book, and
// folding the 수의 at the preparation table. Quiet and unhurried; the bows are deep and held.

type V3 = THREE.Vector3;
type FrontFn = (ahead: number, side: number, y: number) => V3;
type AtFn = (p: V3, side: number, up?: number, ahead?: number) => V3;

/** The hands folded (공수) at the navel, right over left, carried forward and down a little in a bow (`bow` 0–1). */
function gongsu(front: FrontFn, waist: number, k: number, bow: number) {
  const ahead = (0.15 + 0.09 * bow) * k;
  const y = waist + (0.01 - 0.07 * bow) * k;
  return { l: front(ahead, 0.02 * k, y), r: front(ahead + 0.015 * k, -0.012 * k, y + 0.012 * k) };
}

function mourning(m: Motion, b: BodyAt, work: Work | null, t: number, s: number, front: FrontFn, at: AtFn, sl: number, waist: number, chest: number): Doing {
  const k = b.height / 1.6;
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  switch (m) {
    case 'incense': {
      // 분향 (see incenseRound): `work` the mouth of the incense burner on the altar's front table.
      const p = work?.point ?? front(0.45 * k, 0, waist);
      const off = (o: BarOffset) => at(p, o.side * sl, o.up, o.ahead);
      const r0 = incenseRound(t, toolPhase(b.base));
      const f = gongsu(front, waist, k, r0.bow);
      const l = off(r0.l).lerp(f.l, r0.foldL);
      const r = off(r0.r).lerp(f.r, r0.foldR);
      const reaching = 1 - Math.min(r0.foldL, r0.foldR);
      return {
        reach: { l, r, palms: 0.35 + 0.5 * reaching, lean: 0.05 + 0.1 * reaching + 0.72 * r0.bow, nod: 0.18 + 0.2 * reaching + 0.22 * r0.bow, grip: { l: 0.3, r: r0.held === 'hand' ? 0.85 : 0.3 } },
      };
    }
    case 'officiate': {
      // Leading a memorial from beside the altar (영결식·추모식 진행): the order of service (홀기) held
      // open and read from, the right hand opened to the altar as each part is called (분향, 헌화…),
      // and at 「일동 묵념」 the folder held shut before the body and a long, deep bow with the room.
      type Key = { l: V3; r: V3; book: V3; lean: number; nod: number; palms: number; gl: number; gr: number };
      const book = front(0.27 * k, 0, chest - 0.06 * k);
      const read: Key = { l: book.clone().addScaledVector(left, 0.1 * k), r: book.clone().addScaledVector(left, -0.1 * k), book, lean: 0.03, nod: 0.36, palms: 0.4, gl: 0.45, gr: 0.45 };
      const low = front(0.2 * k, 0.1 * k, waist + 0.09 * k);
      const cue: Key = { l: low.clone().addScaledVector(UP, -0.02), r: front(0.33 * k, -0.34 * k, chest - 0.07 * k), book: low, lean: 0.02, nod: -0.04, palms: -0.75, gl: 0.5, gr: 0.08 };
      const g0 = gongsu(front, waist, k, 0);
      const g1 = gongsu(front, waist, k, 1);
      const stand: Key = { l: g0.l, r: g0.r, book: g0.l.clone().lerp(g0.r, 0.5).addScaledVector(UP, 0.02), lean: 0.04, nod: 0.12, palms: 0.35, gl: 0.5, gr: 0.4 };
      const bow: Key = { l: g1.l, r: g1.r, book: g1.l.clone().lerp(g1.r, 0.5).addScaledVector(UP, 0.02), lean: 0.8, nod: 0.3, palms: 0.35, gl: 0.5, gr: 0.4 };
      const keys: Array<[Key, number]> = [[read, 4], [cue, 3], [read, 3.5], [cue, 2.5], [stand, 1.2], [bow, 3.5], [stand, 2]];
      const x = flowAt(keys.map(([, h]) => h), 1.3, t, s);
      const a = keys[x.i][0];
      const z = keys[(x.i + 1) % keys.length][0];
      const e = x.e;
      const mix = (q: number, r: number) => q + (r - q) * e;
      return {
        reach: { l: a.l.clone().lerp(z.l, e), r: a.r.clone().lerp(z.r, e), lean: mix(a.lean, z.lean), nod: mix(a.nod, z.nod), palms: mix(a.palms, z.palms), grip: { l: mix(a.gl, z.gl), r: mix(a.gr, z.gr) } },
        prop: { kind: 'book', at: a.book.clone().lerp(z.book, e), yaw: b.yaw },
      };
    }
    case 'usher': {
      // Greeting mourners at the guest book (조문객 맞이): stood with the hands folded, a bow (목례) to
      // each who comes in, and the right hand opened, palm up, to the 방명록 (`work`) for them to sign.
      const p = work?.point ?? front(0.4 * k, 0, waist + 0.2 * k);
      type Key = { l: V3; r: V3; lean: number; nod: number; palms: number };
      const g0 = gongsu(front, waist, k, 0);
      const g1 = gongsu(front, waist, k, 0.7);
      const fold: Key = { ...g0, lean: 0.04, nod: 0.08, palms: 0.35 };
      const bow: Key = { ...g1, lean: 0.55, nod: 0.25, palms: 0.35 };
      const offer: Key = { l: g0.l, r: at(p, -0.06 * sl, 0.1, -0.1), lean: 0.12, nod: 0.2, palms: -0.85 };
      const keys: Array<[Key, number]> = [[fold, 2.2], [bow, 1.1], [fold, 0.8], [offer, 2.4], [fold, 1.5]];
      const x = flowAt(keys.map(([, h]) => h), 1, t, s);
      const a = keys[x.i][0];
      const z = keys[(x.i + 1) % keys.length][0];
      const e = x.e;
      const mix = (q: number, r: number) => q + (r - q) * e;
      return { reach: { l: a.l.clone().lerp(z.l, e), r: a.r.clone().lerp(z.r, e), lean: mix(a.lean, z.lean), nod: mix(a.nod, z.nod), palms: mix(a.palms, z.palms), grip: { l: 0.3, r: 0.25 } } };
    }
    case 'shroud': {
      // Folding a piece of the 수의 (see shroudRound): `work` the middle of the hemp cloth on the table.
      const p = work?.point ?? front(0.42 * k, 0, waist + 0.2 * k);
      const off = (o: BarOffset) => at(p, o.side * sl, o.up, o.ahead);
      const r0 = shroudRound(t, toolPhase(b.base));
      return { reach: { l: off(r0.l), r: off(r0.r), palms: r0.flat ? 1.45 : 0.7, lean: 0.26 + 0.08 * r0.reach, nod: 0.45, grip: { l: r0.flat ? 0.1 : 0.6, r: r0.flat ? 0.1 : 0.6 } } };
    }
    default:
      return {};
  }
}

/** Keys each held `holds[i]` seconds, then `move` seconds easing into the next: which key and how far on (`s` puts dwellers out of step). */
function flowAt(holds: number[], move: number, t: number, s: number): { i: number; e: number } {
  const total = holds.reduce((a, h) => a + h + move, 0);
  let u = (((t + s * 7) % total) + total) % total;
  for (let i = 0; i < holds.length; i++) {
    if (u < holds[i]) return { i, e: 0 };
    u -= holds[i];
    if (u < move) return { i, e: THREE.MathUtils.smootherstep(u / move, 0, 1) };
    u -= move;
  }
  return { i: 0, e: 0 };
}

/*
 * 분향 at a 빈소's altar (2026-10-27, the 장례식장, at the user's request: lighting incense, bowing),
 * stood before it, ~18 s round. The hands folded (공수); the right takes a stick of incense from the
 * box (`box`), holds its tip in the right-hand candle's flame (`flame`) till it catches, brings it
 * back before the chest and waves the flame out (never blown), the left hand comes under the right
 * wrist and the stick is set upright in the burner's ash (`work`); the hands folded again, two deep
 * bows (재배), a moment's silence with the head bowed. Offsets are from the burner's mouth (BarOffset:
 * to the dweller's left, up, away from them). A stick in the hand: its base in the fist, leaning away and
 * up (`upright` 0) or standing straight up (1), `stick` long.
 */
export const INCENSE = { box: bo(-0.18, 0.0, -0.06), flame: bo(-0.36, 0.22, 0.08), stick: 0.2 };
export function incenseRound(t: number, phase: number) {
  const u = ((t / 18 + phase) % 1 + 1) % 1;
  const S = INCENSE.stick * Math.SQRT1_2;
  const lightAt = bo(INCENSE.flame.side, INCENSE.flame.up - S, INCENSE.flame.ahead - S);
  const fan = bo(-0.13, 0.15, -0.17);
  const over = bo(0, 0.2, -0.01);
  const into = bo(0, 0.045, 0);
  const rest = bo(-0.05, -0.05, -0.28);
  let r = keyed<BarOffset>([[0.06, rest], [0.12, INCENSE.box], [0.16, INCENSE.box], [0.23, lightAt], [0.3, lightAt], [0.35, fan], [0.41, over], [0.46, into], [0.5, into], [0.55, rest]], u, boMix);
  // Waving the flame out.
  if (u > 0.31 && u < 0.36) r = boAdd(r, bo(0.035 * Math.sin(t * Math.PI * 2 * 3.5), 0, 0));
  const under = bo(0.06, -0.05, -0.03);
  const l = keyed<BarOffset>([[0.35, boAdd(rest, bo(0.1, 0, 0))], [0.39, boAdd(over, under)], [0.41, boAdd(over, under)], [0.46, boAdd(into, under)], [0.5, boAdd(into, under)]], u, boMix);
  const foldR = keyed<number>([[0.06, 1], [0.11, 0], [0.5, 0], [0.55, 1]], u, numMix);
  const foldL = keyed<number>([[0.34, 1], [0.38, 0], [0.5, 0], [0.55, 1]], u, numMix);
  const upright = keyed<number>([[0.35, 0], [0.4, 1]], u, numMix);
  const bow = keyed<number>([[0, 0.12], [0.05, 0], [0.55, 0], [0.6, 1], [0.66, 1], [0.71, 0], [0.75, 0], [0.8, 1], [0.86, 1], [0.91, 0], [0.94, 0.12]], u, numMix);
  const held: 'box' | 'hand' | 'burner' = u < 0.14 ? 'box' : u < 0.47 ? 'hand' : 'burner';
  // Burning: caught at 0.27, a flame till it's waved out at 0.34, then the glowing tip and its smoke.
  return { u, l, r, foldL, foldR, upright, bow, held, flame: u > 0.27 && u < 0.34, lit: u > 0.27 };
}

/*
 * Folding a piece of the 수의 (2026-10-27, the 장례식장, at the user's request: preparing the shroud on
 * a table, nothing more), stood at it, ~12 s round. The hemp cloth lies flat (`work` its middle): it
 * is smoothed out from the middle with both palms, twice; the far corners taken up and the far half
 * folded over towards the dweller along the middle; the fold pressed flat; the folded piece lifted with
 * both hands and set on the stack to the dweller's left — another piece lies flat under it, for the next.
 * Offsets from `work` (BarOffset); `fold` 0–1 is how far over the far half is (about the middle line),
 * `carry` 0–1 how far the folded piece has gone to the stack, `flat` whether the palms are pressing.
 */
export const SHROUD = { half: 0.17, width: 0.5, stack: bo(0.46, 0.0, -0.02) };
export function shroudRound(t: number, phase: number) {
  const u = ((t / 12 + phase) % 1 + 1) % 1;
  const sm = (a: number, z: number) => THREE.MathUtils.smoothstep(u, a, z);
  const H = SHROUD.half;
  const hand = (x: number, up: number, ahead: number) => ({ l: bo(x, up, ahead), r: bo(-x, up, ahead) });
  let h: { l: BarOffset; r: BarOffset };
  let fold = 0;
  let carry = 0;
  let flat = false;
  if (u < 0.28) {
    const v = 0.5 - 0.5 * Math.cos((u / 0.28) * Math.PI * 4);
    h = hand(0.05 + 0.2 * v, 0.012, 0.02 * v);
    flat = true;
  } else if (u < 0.36) {
    const e = sm(0.28, 0.35);
    h = hand(0.05 + 0.17 * e, 0.012 + 0.03 * Math.sin(e * Math.PI), H * e);
  } else if (u < 0.58) {
    const th = sm(0.38, 0.56) * Math.PI;
    fold = th / Math.PI;
    h = hand(0.22, 0.014 + H * Math.sin(th), H * Math.cos(th));
  } else if (u < 0.72) {
    const v = 0.5 - 0.5 * Math.cos(((u - 0.58) / 0.14) * Math.PI * 2);
    fold = 1;
    h = hand(0.06 + 0.14 * v, 0.022, -H / 2);
    flat = true;
  } else {
    fold = 1;
    const g = sm(0.72, 0.77);
    const base = hand(0.06 + 0.17 * g, 0.022 + 0.01 * g, -H / 2);
    carry = sm(0.79, 0.88);
    const lift = 0.1 * Math.sin(carry * Math.PI);
    const move = (o: BarOffset) => boAdd(o, bo(SHROUD.stack.side * carry, SHROUD.stack.up * carry + lift, (SHROUD.stack.ahead + H / 2) * carry));
    h = { l: move(base.l), r: move(base.r) };
    // Back to the middle of the next piece.
    const back = sm(0.9, 0.99);
    const home = hand(0.05, 0.012, 0);
    h = { l: boMix(h.l, home.l, back), r: boMix(h.r, home.r, back) };
  }
  const reach = Math.max(0, Math.max(h.l.ahead, h.r.ahead)) / H;
  return { u, l: h.l, r: h.r, fold, carry, flat, reach };
}

/*
 * Electronics at the engineering lab's benches (2026-10-27, the 엔지니어링 연구소, at the user's
 * request: engineering work should look right). Offsets are from `work` (BarOffset: to the worker's
 * left, up, away from them) and shared with workplaces/engineer.ts, which moves the iron, the wire and
 * the probe by the same clock (toolPhase of where the worker sits).
 *
 * Soldering (solder), ~3.2 s a joint, three joints along a row: the iron's tip carried over to the
 * next pad, set down on it to heat it, the solder wire fed in from the left until the joint flows,
 * the wire drawn back, then the iron lifted. The iron's held like a pen (IRON_GRIP back from its tip),
 * the wire pinched WIRE_GRIP back from its end; `flow` how far this joint's filled, `heat` whether the
 * tip's on the pad (the flux smokes).
 */
export const SOLDER_PADS = [0.035, 0, -0.035];
export const IRON_GRIP: BarOffset = { side: -0.045, up: 0.06, ahead: -0.085 };
export const WIRE_GRIP: BarOffset = { side: 0.055, up: 0.035, ahead: -0.06 };
export function solderRound(t: number, phase: number) {
  const c = t / 3.2 + phase * 3;
  const n = Math.floor(c);
  const u = c - n;
  const j = ((n % 3) + 3) % 3;
  const sm = (a: number, z: number) => THREE.MathUtils.smoothstep(u, a, z);
  const pad = bo(SOLDER_PADS[j], 0, 0);
  const prev = bo(SOLDER_PADS[(j + 2) % 3], 0, 0);
  const above = (o: BarOffset) => boAdd(o, bo(0, 0.028, -0.01));
  let tip = boMix(above(prev), above(pad), sm(0, 0.18));
  tip = boMix(tip, boAdd(pad, bo(-0.004, 0.002, 0)), sm(0.18, 0.26));
  tip = boMix(tip, above(pad), sm(0.8, 0.92));
  const away = boAdd(pad, bo(0.05, 0.035, -0.02));
  let wire = boMix(away, boAdd(pad, bo(0.006, 0.003, 0)), sm(0.3, 0.4));
  wire = boMix(wire, away, sm(0.62, 0.72));
  const flow = sm(0.4, 0.6);
  const heat = sm(0.2, 0.26) * (1 - sm(0.8, 0.9));
  return { n, j, u, tip, wire, r: boAdd(tip, IRON_GRIP), l: boAdd(wire, WIRE_GRIP), flow, heat };
}

/**
 * Probing a board with the oscilloscope (probe), ~4.5 s a test point, four in turn: the probe's tip
 * lifted over and set down on the next point (PROBE_POINTS), the left hand steadying the board's
 * near corner, then going up to turn the scope's knob (SCOPE_KNOB, `turn`) while the eyes go up to
 * the trace (`look`). `i` is the point being measured (the scope shows its signal).
 */
export const PROBE_POINTS: BarOffset[] = [
  { side: 0.05, up: 0, ahead: 0.02 },
  { side: -0.01, up: 0, ahead: 0.045 },
  { side: -0.055, up: 0, ahead: -0.005 },
  { side: 0.015, up: 0, ahead: -0.03 },
];
export const PROBE_GRIP: BarOffset = { side: -0.035, up: 0.055, ahead: -0.07 };
export const SCOPE_KNOB: BarOffset = { side: 0.13, up: 0.3, ahead: 0.27 };
export function probeRound(t: number, phase: number) {
  const c = t / 4.5 + phase * 4;
  const n = Math.floor(c);
  const u = c - n;
  const i = ((n % 4) + 4) % 4;
  const sm = (a: number, z: number) => THREE.MathUtils.smoothstep(u, a, z);
  const lift = bo(0, 0.03, -0.005);
  const prev = PROBE_POINTS[(i + 3) % 4];
  const cur = PROBE_POINTS[i];
  let tip = boMix(prev, boAdd(prev, lift), sm(0, 0.06));
  tip = boMix(tip, boAdd(cur, lift), sm(0.06, 0.16));
  tip = boMix(tip, cur, sm(0.16, 0.22));
  const turn = sm(0.36, 0.46) * (1 - sm(0.7, 0.8));
  const rest = bo(0.1, 0.012, -0.05);
  const knob = boAdd(SCOPE_KNOB, bo(0, 0, -0.035 + 0.006 * Math.sin(t * 5)));
  const look = sm(0.22, 0.32) * (1 - sm(0.9, 1));
  return { n, i, u, tip, r: boAdd(tip, PROBE_GRIP), l: boMix(rest, knob, turn), turn, look };
}

/*
 * The woodworking shop (2026-10-27, the 목공소, at the user's request: woodworking should look like
 * it). Each round is stood at its piece and timed by toolPhase of `work` (where the hands meet the
 * wood), so the bench, the table saw, the drill press, the finishing table and the lumber rack
 * (workplaces/carpenter.ts) move the plane, the saw, the chisel and mallet, the boards and the brush
 * by the same clock. Offsets are from `work` in the carpenter's own frame (BarOffset: to their left,
 * up, away from them), metres.
 */

/**
 * A Korean pull plane (대패): an oak block `len` long, `wide` across and `high`, the iron wedged in at
 * its mouth, a crossbar (손잡이) through it `bar` ahead of its middle that both hands pull by, `grip`
 * out to each side. The board it planes runs away from the carpenter, `board` long, `work` the middle
 * of its top; the plane goes out to `far` and is drawn back to `near` (its middle), and rests at `rest`.
 */
export const PLANE = { len: 0.27, wide: 0.075, high: 0.05, bar: 0.075, grip: 0.1, far: 0.08, near: -0.2, board: 0.56, rest: bo(-0.2, -0.035, -0.05) };
/**
 * A board planed with the pull plane (plane), ~2.6 s a stroke: the plane carried out to the far end
 * lifted, set down, and drawn back along the board with both hands on the crossbar, the body leaning
 * in and coming back with it; a shaving curls up out of the mouth as it comes (`shave` 0–1) and drops
 * off at the end (`drop`). Every fifth stroke the plane is set down beside the board and the left
 * hand runs along it to feel it's flat, the eye down close. `at` is the plane's middle at its sole.
 */
export function planeRound(t: number, phase: number) {
  const c = t / 2.6 + phase * 5;
  const n = Math.floor(c);
  const v = c - n;
  const slot = ((n % 5) + 5) % 5;
  const P = PLANE;
  const sm = (a: number, z: number) => THREE.MathUtils.smoothstep(v, a, z);
  const lift = 0.03;
  const bar = (o: BarOffset, s: number) => boAdd(o, bo(s * P.grip, P.high + 0.02, P.bar));
  let at: BarOffset;
  let l: BarOffset;
  let r: BarOffset;
  let shave = 0;
  let drop = 0;
  let lean: number;
  let nod = 0.42;
  if (slot < 4) {
    const a = numMix(numMix(P.near, P.far, sm(0, 0.22)), P.near, sm(0.24, 0.8));
    const up = lift * (1 - sm(0.12, 0.24)) + lift * sm(0.82, 0.95);
    at = bo(0, up, a);
    shave = THREE.MathUtils.clamp((v - 0.26) / 0.54, 0, 1);
    drop = sm(0.84, 1);
    l = bar(at, 1);
    r = bar(at, -1);
    lean = 0.12 + 0.32 * ((a - P.near) / (P.far - P.near));
  } else {
    const home = bo(0, lift, P.near);
    const away = sm(0.02, 0.16) * (1 - sm(0.82, 0.97));
    at = boMix(home, P.rest, away);
    r = bar(at, -1);
    const feel = bo(0.01, 0.012, numMix(-0.24, 0.14, sm(0.22, 0.52)) - numMix(0, 0.38, sm(0.54, 0.76)));
    l = boMix(bar(home, 1), feel, sm(0.08, 0.2) * (1 - sm(0.78, 0.9)));
    if (v > 0.9) l = boMix(feel, bar(at, 1), sm(0.88, 0.97));
    lean = 0.38;
    nod = 0.42 + 0.25 * sm(0.18, 0.26) * (1 - sm(0.76, 0.84));
  }
  return { n, slot, v, at, shave, drop, l, r, lean, nod, check: slot === 4 };
}

/**
 * A Korean pull saw (양날톱) by its heel, where the blade meets the long handle: the handle runs back
 * up towards the sawyer at `tilt`, the blade forward and down from the heel; `blade` and `handle` long.
 * The board it crosscuts lies across the bench (`wide` deep, `thick`), the cut line at `work` (its
 * top, halfway across), the offcut `off` long hanging over the bench's end to the sawyer's right.
 * Put down, the saw lies along the bench's front edge (its heel at `rest`, held there at `restGrip`);
 * the square and the pencil lie on the board.
 */
export const SAW = { blade: 0.25, handle: 0.24, tilt: 0.5, thick: 0.035, wide: 0.16, off: 0.24, rest: bo(0.3, -0.03, -0.11), restGrip: bo(0.14, -0.01, -0.14), square: bo(0.33, 0, 0), pencil: bo(0.2, 0, -0.04) };
/** Up the handle, towards the sawyer. */
export const SAW_DIR = bo(0, Math.sin(SAW.tilt), -Math.cos(SAW.tilt));
const sawAlong = (o: BarOffset, k: number) => boAdd(o, bo(0, SAW_DIR.up * k, SAW_DIR.ahead * k));
/**
 * Marking and crosscutting a board (handSaw), ~15 s a cut. The square is laid across the board with
 * the left hand, its stock against the near edge, and a pencil line drawn along it with the right
 * (`line` 0–1); both put back, the saw taken up off the bench and set in the line, the left hand
 * holding the board down while the right pulls the saw back and pushes it out again — a pull saw cuts
 * as it's drawn — sinking through (`cut` 0–1, dust as it pulls). The offcut drops off the bench's end
 * (`drop`), the saw goes back down, and the board's slid along for the next (`slide`). `heel` is the
 * saw's heel, `upright` 0 lying at rest … 1 in the hand.
 */
export function sawRound(t: number, phase: number) {
  const u = (((t / 15 + phase) % 1) + 1) % 1;
  const sm = (a: number, z: number) => THREE.MathUtils.smoothstep(u, a, z);
  const restL = bo(0.24, 0.03, -0.2);
  const restR = bo(-0.12, 0.03, -0.22);
  const markAt = bo(0.012, 0, 0);
  // The square: carried to the line and back; the left hand on its stock at the board's near edge.
  const square = boMix(boMix(SAW.square, markAt, sm(0.06, 0.12)), SAW.square, sm(0.22, 0.28));
  const stock = (o: BarOffset) => boAdd(o, bo(0.005, 0.03, -SAW.wide / 2 - 0.02));
  // The pencil: from its place, drawn along the square towards the sawyer, and back.
  const line = sm(0.13, 0.21);
  const lineFrom = bo(-0.004, 0.002, SAW.wide / 2 - 0.01);
  const lineTo = bo(-0.004, 0.002, -SAW.wide / 2 + 0.01);
  let pencil = boMix(SAW.pencil, lineFrom, sm(0.06, 0.12));
  if (u >= 0.12) pencil = boMix(lineFrom, lineTo, line);
  if (u >= 0.22) pencil = boMix(lineTo, SAW.pencil, sm(0.22, 0.27));
  const pencilGrip = (o: BarOffset) => boAdd(o, bo(-0.01, 0.075, -0.03));
  // The saw: in the cut, sinking through, stroked along itself (drawn back on the pull, where it cuts).
  const cut = THREE.MathUtils.clamp((u - 0.35) / 0.45, 0, 1);
  const depth = (SAW.thick + 0.012) * cut;
  const stroking = sm(0.33, 0.36) * (1 - sm(0.79, 0.82));
  const sw = Math.sin(t * Math.PI * 2 * 1.1);
  const s = 0.075 * sw * stroking;
  const inCut = sawAlong(bo(0, -depth, 0), SAW.blade / 2 + s);
  const start = sawAlong(bo(0, 0.01, 0), SAW.blade / 2 + 0.06);
  let heel = boMix(SAW.rest, start, sm(0.27, 0.33));
  if (u >= 0.33) heel = inCut;
  if (u >= 0.82) heel = boMix(sawAlong(bo(0, -depth, 0), SAW.blade / 2), SAW.rest, sm(0.84, 0.9));
  const upright = sm(0.27, 0.3) * (1 - sm(0.87, 0.9));
  const restOff = bo(SAW.restGrip.side - SAW.rest.side, SAW.restGrip.up - SAW.rest.up, SAW.restGrip.ahead - SAW.rest.ahead);
  const grip = (h: BarOffset, k: number) => boMix(boAdd(h, restOff), sawAlong(h, SAW.handle * 0.6), k);
  let r = boMix(restR, pencilGrip(SAW.pencil), sm(0.0, 0.06));
  if (u >= 0.06) r = pencilGrip(pencil);
  if (u >= 0.25) r = boMix(pencilGrip(SAW.pencil), grip(SAW.rest, 0), sm(0.25, 0.28));
  if (u >= 0.28) r = grip(heel, upright);
  if (u >= 0.9) r = boMix(grip(SAW.rest, 0), restR, sm(0.9, 0.96));
  // The left hand: the square, then the board held down; at the end it slides the board along.
  const hold = bo(0.17, 0.012, -0.04);
  const slide = sm(0.88, 0.95);
  let l = boMix(restL, stock(SAW.square), sm(0.0, 0.06));
  if (u >= 0.06) l = stock(square);
  if (u >= 0.27) l = boMix(stock(SAW.square), hold, sm(0.28, 0.33));
  // (It takes the board further along, and pushes it to the right till its end's over the edge again.)
  if (u >= 0.84) l = boMix(hold, boAdd(hold, bo(SAW.off, 0, 0)), sm(0.84, 0.88));
  if (u >= 0.88) l = boAdd(hold, bo(SAW.off * (1 - slide), 0, 0));
  if (u >= 0.95) l = boMix(hold, restL, sm(0.95, 1));
  const pulling = stroking > 0.5 && Math.cos(t * Math.PI * 2 * 1.1) > 0;
  return { u, square, line, pencil, heel, upright, cut, depth, pulling, sawing: stroking > 0.5 && cut > 0 && cut < 1, drop: sm(0.82, 0.87), slide, l, r, lean: 0.22 + 0.1 * sm(0.04, 0.1) * (1 - sm(0.22, 0.28)) + 0.05 * stroking * (0.5 + 0.5 * sw), nod: 0.48 };
}

/**
 * The chisel (끌) and mallet (나무 메), and the mortise (장부 구멍) they cut in a post lying across the
 * bench, `work` the middle of its top. The chisel's `len` long; the mallet's head `head` long on a
 * handle. Things put down: the chisel, the mallet and the tenon (장부) that's tried in the hole.
 */
export const CHISEL = { len: 0.26, head: 0.13, headR: 0.035, rest: bo(0.3, -0.058, 0.1), mallet: bo(-0.3, -0.005, 0.08), tenon: bo(-0.17, 0.01, -0.1), tenonLen: 0.16 };
/** The mallet by its head's middle and the hand on its handle, struck (`swing` 0) or raised (1), over `at`. */
export function malletAt(at: BarOffset, swing: number) {
  const head = boAdd(at, bo(-0.05 * swing, CHISEL.head / 2 + 0.25 * swing, -0.09 * swing));
  const hand = boAdd(head, boMix(bo(-0.17, -0.03, -0.13), bo(-0.07, -0.19, -0.1), swing));
  return { head, hand };
}
/**
 * A mortise chopped (chisel), ~12 s round: the chisel held upright in the left hand, its edge in the
 * line, the mallet brought down on it with the right — tock, tock, tock — every fifth blow the chisel
 * levered back to break the chips out (`pry`, they fly); the hole goes down (`depth`). Then both are
 * put down, the tenon taken up, offered to the hole and pushed home to try it, drawn out and put
 * back, and the tools taken up again. `edge` is the chisel's edge, `tilt` how far it's levered back;
 * `hit` 1 just as a blow lands.
 */
export function chiselRound(t: number, phase: number) {
  const u = (((t / 12 + phase) % 1) + 1) % 1;
  const sm = (a: number, z: number) => THREE.MathUtils.smoothstep(u, a, z);
  const C = CHISEL;
  const depth = 0.035 * THREE.MathUtils.clamp(u / 0.64, 0, 1);
  // The blows: 0.75 s each while chopping.
  const bt = t / 0.75 + phase * 7;
  const bn = Math.floor(bt);
  const w = bt - bn;
  const prying = bn % 5 === 4;
  const chopping = u < 0.64;
  let swing = 0;
  let tilt = 0;
  let hit = 0;
  if (chopping) {
    if (prying) {
      swing = 0.35;
      tilt = 0.45 * Math.sin(Math.PI * w);
    } else {
      swing = w < 0.55 ? THREE.MathUtils.smoothstep(w, 0, 0.55) : w < 0.7 ? 1 - ((w - 0.55) / 0.15) ** 2 : 0;
      hit = w >= 0.7 && w < 0.8 ? 1 - (w - 0.7) / 0.1 : 0;
    }
    // Eased in from the tools taken up, and out as they're put down.
    swing *= sm(0.0, 0.04);
  }
  const edgeIn = bo(0, -depth, 0);
  const chiselHand = (e: BarOffset, a: number) => boAdd(e, bo(0, Math.cos(a) * 0.13, -Math.sin(a) * 0.13));
  // Where the tools are: in the hands at the work, carried to their places and back.
  const down = sm(0.64, 0.7);
  const back = sm(0.94, 1);
  const away = down * (1 - back);
  const edge = boMix(edgeIn, C.rest, away);
  const mal = malletAt(edgeIn, swing);
  const malHead = boMix(mal.head, C.mallet, away);
  const malHand = boMix(mal.hand, boAdd(C.mallet, bo(-0.13, 0.03, -0.06)), away);
  // The tenon: taken up, offered over the hole, pushed home, drawn out and put back.
  const over = bo(0, 0.13, 0);
  const home = bo(0, C.tenonLen / 2 - depth + 0.005, 0);
  let tenon = boMix(C.tenon, over, sm(0.74, 0.8));
  tenon = boMix(tenon, home, sm(0.81, 0.86));
  tenon = boMix(tenon, over, sm(0.88, 0.91));
  tenon = boMix(tenon, C.tenon, sm(0.91, 0.95));
  const wiggle = u > 0.85 && u < 0.88 ? 0.12 * Math.sin((u - 0.85) * 220) : 0;
  const tTop = (o: BarOffset) => boAdd(o, bo(0, C.tenonLen / 2 + 0.01, 0));
  let r = malHand;
  let l = chiselHand(edge, tilt);
  if (u >= 0.7 && u < 0.95) {
    r = boMix(malHand, boAdd(tTop(C.tenon), bo(-0.03, 0, 0)), sm(0.7, 0.74));
    if (u >= 0.74) r = boAdd(tTop(tenon), bo(-0.035, -0.02, 0));
    l = boMix(boAdd(C.rest, bo(0, 0.13, 0)), boAdd(tTop(tenon), bo(0.035, -0.02, 0)), sm(0.72, 0.78));
    if (u >= 0.9) l = boMix(boAdd(tTop(tenon), bo(0.035, -0.02, 0)), boAdd(C.rest, bo(0, 0.13, 0)), sm(0.9, 0.95));
  }
  if (u >= 0.95) r = boMix(boAdd(C.mallet, bo(-0.13, 0.03, -0.06)), mal.hand, back);
  const fitting = u >= 0.74 && u < 0.94;
  return { u, depth, edge, tilt, lie: away > 0.95 ? 1 : 0, head: malHead, hand: malHand, malletLie: away > 0.95 ? 1 : 0, hit, pry: prying && chopping ? Math.sin(Math.PI * w) : 0, tenon, wiggle, l, r, lean: fitting ? 0.3 : 0.24 + 0.08 * swing, nod: fitting ? 0.55 : 0.5 - 0.08 * swing };
}

/** Where a frame being put together is tapped home: its four corners round `work`. */
export const ASSEMBLE = [bo(0.15, 0, 0.12), bo(-0.15, 0, 0.12), bo(-0.15, 0, -0.12), bo(0.15, 0, -0.12)];
/**
 * A frame knocked together (assemble), ~10 s round: the mallet tapping each joint home in turn —
 * three short blows a corner, the left hand steadying the frame at the next — then the mallet
 * lowered and the frame looked over, the eyes going along it to see it's square.
 */
export function assembleRound(t: number, phase: number) {
  const u = (((t / 10 + phase) % 1) + 1) % 1;
  const sm = (a: number, z: number) => THREE.MathUtils.smoothstep(u, a, z);
  const i = Math.min(3, Math.floor(u / 0.2));
  const v = u / 0.2 - i;
  const corner = ASSEMBLE[i];
  const prev = ASSEMBLE[(i + 3) % 4];
  let swing = 0.6;
  let hit = 0;
  let target = corner;
  if (u < 0.8) {
    if (v < 0.16) target = boMix(prev, corner, THREE.MathUtils.smoothstep(v, 0, 0.16));
    else {
      const w = ((v - 0.16) / 0.28) % 1;
      swing = w < 0.55 ? 0.6 * THREE.MathUtils.smoothstep(w, 0, 0.55) : w < 0.7 ? 0.6 * (1 - ((w - 0.55) / 0.15) ** 2) : 0;
      hit = w >= 0.7 && w < 0.8 ? 1 - (w - 0.7) / 0.1 : 0;
    }
  }
  const look = sm(0.8, 0.84) * (1 - sm(0.95, 1));
  const lowered = boAdd(target, bo(-0.12, 0.05, -0.12));
  const m = malletAt(target, swing);
  const head = boMix(m.head, lowered, look);
  const hand = boMix(m.hand, boAdd(lowered, bo(-0.15, -0.03, -0.12)), look);
  const steady = bo(0.17, 0.015, corner.side > 0 ? -corner.ahead : corner.ahead);
  return { u, i, head, hand, hit, l: boMix(steady, bo(0.17, 0.015, 0), look), r: hand, lean: 0.24 - 0.1 * look, nod: 0.5 - 0.15 * look };
}

/**
 * Ripping a board on the table saw: `work` is the top of the blade where it comes up through the
 * table; the rip fence runs `fence` to the sawyer's right of it, the boards waiting in a stack on the
 * table's left (`stack`), the push stick resting on the fence (`stick`). A board's `len` long, `wide`
 * across (its middle `mid` across from the blade) and `thick`; it's fed from `start` (its leading end)
 * to `end`.
 */
export const RIP = { len: 0.5, wide: 0.18, thick: 0.03, mid: -0.01, fence: -0.1, stack: bo(0.3, 0, -0.06), stick: bo(-0.2, 0.06, -0.28), start: -0.03, end: 0.53 };
/**
 * A board ripped on the table saw (ripSaw), ~11 s a board: taken off the stack in both hands and
 * laid against the fence, the push stick taken up; then fed through the spinning blade, the left
 * hand pressing it to the fence till its end comes by, the right pushing the strip between the
 * blade and the fence with the stick, the kerf running back along it (`cut`) and the dust flying
 * (`cutting`); the two strips left on the far side, the stick put back. `board` is the board's middle.
 */
export function ripRound(t: number, phase: number) {
  const u = (((t / 11 + phase) % 1) + 1) % 1;
  const sm = (a: number, z: number) => THREE.MathUtils.smoothstep(u, a, z);
  const R = RIP;
  const startMid = bo(R.mid, R.thick / 2, R.start - R.len / 2);
  const feed = THREE.MathUtils.clamp((u - 0.26) / 0.52, 0, 1);
  const lead = numMix(R.start, R.end, feed * feed * (1.6 - 0.6 * feed));
  let board = boMix(boAdd(R.stack, bo(0, R.thick * 3.5, 0)), boAdd(startMid, bo(0, 0.05, 0)), sm(0.1, 0.19));
  board = boMix(board, startMid, sm(0.19, 0.22));
  if (u >= 0.26) board = bo(R.mid, R.thick / 2, lead - R.len / 2);
  const restL = bo(0.32, 0.02, -0.3);
  const restR = bo(-0.15, 0.02, -0.34);
  const side = (o: BarOffset, s: number) => boAdd(o, bo(s * (R.wide / 2 + 0.01), 0.025, 0));
  // The push stick: on the fence, then its notch on the board's tail (the strip by the fence).
  const tail = bo(R.fence + 0.045, R.thick, lead - R.len);
  let stick = boMix(R.stick, boAdd(startMid, bo(R.fence + 0.045 - R.mid, R.thick / 2 + 0.01, -R.len / 2)), sm(0.22, 0.26));
  if (u >= 0.26) stick = tail;
  if (u >= 0.8) stick = boMix(tail, R.stick, sm(0.8, 0.86));
  const stickHand = (o: BarOffset) => boAdd(o, bo(-0.02, 0.13, -0.16));
  let r = boMix(restR, side(boAdd(R.stack, bo(0, R.thick * 3.5, 0)), -1), sm(0.02, 0.1));
  if (u >= 0.1) r = side(board, -1);
  if (u >= 0.22) r = boMix(side(startMid, -1), stickHand(stick), sm(0.22, 0.25));
  if (u >= 0.25) r = stickHand(stick);
  if (u >= 0.86) r = boMix(stickHand(R.stick), restR, sm(0.86, 0.93));
  // The left hand: the board's left side, then pressing it to the fence, short of the blade.
  const press = bo(0.06, R.thick + 0.012, Math.min(lead - R.len / 2 - 0.05, -0.13));
  const offBoard = lead - R.len > -0.15;
  let l = boMix(restL, side(boAdd(R.stack, bo(0, R.thick * 3.5, 0)), 1), sm(0.02, 0.1));
  if (u >= 0.1) l = side(board, 1);
  if (u >= 0.22) l = boMix(side(startMid, 1), press, sm(0.22, 0.27));
  if (u >= 0.27) l = offBoard ? boMix(press, restL, THREE.MathUtils.smoothstep(lead - R.len, -0.15, -0.05)) : press;
  const cut = THREE.MathUtils.clamp(lead, 0, R.len);
  return { u, board, lead, cut, cutting: u > 0.26 && lead > 0 && lead < R.len + 0.01, stick, stickHeld: u > 0.24 && u < 0.85, l, r, lean: 0.1 + 0.28 * feed * (1 - sm(0.8, 0.9)), nod: 0.45, taken: u > 0.06 };
}

/**
 * The finishing table: `work` is the middle of the top of the piece being finished (a panel `w` across
 * and `d` deep, its grain running across), oiled in `rows`; the oil can, the sanding block and the rag
 * where they're put down.
 */
export const FINISH = { w: 0.6, d: 0.4, rows: [0.135, 0.045, -0.045, -0.135], can: bo(-0.44, -0.08, 0.02), block: bo(-0.42, -0.06, -0.16), rag: bo(0.42, -0.07, -0.12) };
/**
 * A piece sanded and oiled (woodFinish), ~20 s round: sanded along the grain with the block in long
 * strokes, row by row, the left hand holding the panel's edge; then the brush taken out of the oil
 * can, wiped on its lip, and drawn along the grain a row at a time (`rows`, how far each is wet),
 * dipped again for each; then the excess wiped off with the rag (`wipe`). `brush` is the bristles' tip.
 */
export function finishRound(t: number, phase: number) {
  const u = (((t / 20 + phase) % 1) + 1) % 1;
  const sm = (a: number, z: number) => THREE.MathUtils.smoothstep(u, a, z);
  const F = FINISH;
  const half = F.w / 2 - 0.02;
  // Sanding: the block in long strokes along the grain, working from the far side to the near.
  const sanding = sm(0.04, 0.07) * (1 - sm(0.31, 0.34));
  const sandAt = bo(0.17 * Math.sin(t * Math.PI * 2 * 0.65), 0.012, numMix(0.12, -0.12, THREE.MathUtils.clamp((u - 0.06) / 0.25, 0, 1)));
  const block = u < 0.05 || u > 0.34 ? F.block : boMix(F.block, sandAt, sanding);
  const inCan = boAdd(F.can, bo(0, 0.06, 0));
  const lip = boAdd(F.can, bo(0.03, 0.14, -0.02));
  const rows = [0, 0, 0, 0];
  let brush = inCan;
  // Oiling: four rows, each a dip, a wipe on the lip, and a stroke right to left and back.
  if (u >= 0.38 && u < 0.86) {
    const x = (u - 0.38) / 0.12;
    const i = Math.min(3, Math.floor(x));
    const v = x - i;
    const vs = (a: number, z: number) => THREE.MathUtils.smoothstep(v, a, z);
    for (let k = 0; k < i; k++) rows[k] = 1;
    const from = bo(-half, 0.006, F.rows[i]);
    const to = bo(half, 0.006, F.rows[i]);
    brush = boMix(i === 0 ? inCan : bo(-half, 0.006, F.rows[i - 1]), inCan, vs(0, 0.12));
    brush = boMix(brush, lip, vs(0.14, 0.2));
    brush = boMix(brush, from, vs(0.2, 0.28));
    if (v >= 0.28) brush = boMix(from, to, vs(0.28, 0.66));
    if (v >= 0.66) brush = boMix(to, from, vs(0.66, 1));
    rows[i] = vs(0.28, 0.66);
  } else if (u >= 0.86) {
    rows.fill(1);
    brush = inCan;
  }
  // Wiping off: the rag in the left hand, along the grain over the far half and the near half.
  const wipe = sm(0.87, 0.96);
  const ragOn = sm(0.86, 0.88) * (1 - sm(0.96, 0.99));
  const ragPath = bo(0.07 + 0.18 * Math.cos(wipe * Math.PI * 4), 0.01, wipe < 0.5 ? 0.09 : -0.09);
  const rag = boMix(F.rag, ragPath, ragOn);
  const restR = bo(-0.3, -0.06, -0.24);
  const holdL = bo(F.w / 2 + 0.02, -0.005, 0.02);
  const tableL = boAdd(F.rag, bo(0, 0.025, 0));
  const brushHand = (o: BarOffset) => boAdd(o, bo(-0.01, 0.13, -0.06));
  let r = boMix(restR, boAdd(F.block, bo(0, 0.035, 0)), sm(0, 0.04));
  if (u >= 0.04) r = boAdd(block, bo(0, 0.035, 0));
  if (u >= 0.34) r = boMix(boAdd(F.block, bo(0, 0.035, 0)), brushHand(inCan), sm(0.34, 0.38));
  if (u >= 0.38) r = brushHand(brush);
  if (u >= 0.88) r = boMix(brushHand(inCan), restR, sm(0.88, 0.92));
  let l = boMix(tableL, holdL, sm(0.03, 0.06) * (1 - sm(0.32, 0.36)));
  if (u >= 0.84) l = boAdd(rag, bo(0, 0.025, 0));
  const strokeAway = sanding > 0.5 || (u > 0.38 && u < 0.86);
  return { u, block, sanding: sanding > 0.5, brush, brushHeld: u > 0.36 && u < 0.9, rows, rag, wipe: ragOn, l, r, lean: 0.3 + (strokeAway ? 0.06 : 0), nod: 0.55 };
}

/**
 * Lumber in the rack: `work` is the end of the board picked, at the rack's face, its grain running
 * back into the rack; it's `len` long, `wide` across, `thick`, and comes out `out` to be looked at.
 */
export const LUMBER = { len: 0.8, wide: 0.14, thick: 0.03, out: 0.42 };
/**
 * A board chosen from the rack (sightBoard), ~12 s: drawn out by its end in both hands, its end
 * lifted and sighted along — the head down to it, an eye along the edge to see it isn't bowed or
 * twisted — turned over to see the other face (`roll`), the grain felt along with the right hand
 * (`trace`), and slid back in. `slide` how far it's out, `pitch` its end lifted (about its far end).
 */
export function sightRound(t: number, phase: number) {
  const u = (((t / 12 + phase) % 1) + 1) % 1;
  const sm = (a: number, z: number) => THREE.MathUtils.smoothstep(u, a, z);
  const L = LUMBER;
  const slide = L.out * sm(0.08, 0.24) * (1 - sm(0.78, 0.92));
  const pitch = 0.09 * sm(0.26, 0.32) * (1 - sm(0.42, 0.46));
  const roll = Math.PI * sm(0.47, 0.56);
  const trace = sm(0.58, 0.74) * (1 - sm(0.74, 0.78));
  // The near end, lifted about the far end.
  const end = bo(0, L.len * Math.sin(pitch), -slide + L.len * (1 - Math.cos(pitch)));
  const sides = (s: number) => boAdd(end, bo(s * (L.wide / 2 + 0.012), 0, 0.05));
  const rest = (s: number) => bo(s * 0.2, -0.28, -0.32);
  const reach = sm(0, 0.07) * (1 - sm(0.92, 1));
  let l = boMix(rest(1), sides(1), reach);
  let r = boMix(rest(-1), sides(-1), reach);
  if (u > 0.57 && u < 0.79) r = boMix(sides(-1), boAdd(end, bo(-0.02, L.thick / 2 + 0.012, 0.06 + 0.32 * trace)), sm(0.57, 0.6) * (1 - sm(0.76, 0.79)));
  const sight = sm(0.26, 0.31) * (1 - sm(0.42, 0.46));
  return { u, slide, pitch, roll, trace, end, l, r, lean: 0.12 + 0.12 * sight + 0.1 * trace, nod: 0.18 + 0.3 * sight + 0.25 * trace, crouch: 0.18 * sight };
}

/**
 * The drill press: `work` is where the bit meets the piece on the table; the feed handles' hub on the
 * head's right side (`hub`), a handle `spoke` long, pulled from `a0` (radians from straight up, towards
 * the driller) round by `pull`; the quill comes down `travel`. Three dowel holes go along the piece at
 * `holes` (across, from its middle).
 */
export const DRILL = { hub: bo(-0.17, 0.33, -0.02), spoke: 0.2, a0: 0.45, pull: 1.2, travel: 0.09, gap: 0.06, holes: [0.07, 0, -0.07] };
/** A feed handle's end at angle `a`. */
export const drillSpoke = (a: number) => boAdd(DRILL.hub, bo(-0.03, Math.cos(a) * DRILL.spoke, -Math.sin(a) * DRILL.spoke));
/**
 * Dowel holes drilled (drillPress), ~3 s a hole, three along the piece: the left hand slides it along
 * to the next pencil mark and holds it, the right pulls the feed handle round and down, the bit
 * spinning down into it (`depth`, chips curling off), and lets it ride back up. `shift` is how far the
 * piece is moved across, `done` how many holes it has.
 */
export function drillRound(t: number, phase: number) {
  const c = t / 3 + phase * 3;
  const n = Math.floor(c);
  const v = c - n;
  const i = ((n % 3) + 3) % 3;
  const D = DRILL;
  const sm = (a: number, z: number) => THREE.MathUtils.smoothstep(v, a, z);
  const prevShift = i === 0 ? -D.holes[0] : -D.holes[i - 1];
  const shift = numMix(prevShift, -D.holes[i], sm(0, 0.15));
  const pull = v < 0.6 ? sm(0.18, 0.55) : 1 - sm(0.6, 0.8);
  const a = D.a0 + D.pull * pull;
  const tip = D.gap - D.travel * pull;
  const depth = Math.max(0, -tip);
  const done = i + (v > 0.5 ? 1 : 0);
  const l = bo(0.15 + shift, 0.012, -0.03);
  const r = drillSpoke(a);
  return { i, v, shift, pull, angle: a, tip, depth, drilling: depth > 0.002, done: i === 0 && v < 0.5 ? 0 : done, l, r, lean: 0.12 + 0.06 * pull, nod: 0.5 };
}

/** The hands, the bend and the squat for the woodworking shop's motions (see the rounds above). */
function woodwork(m: Motion, b: BodyAt, work: Work | null, t: number): Doing {
  const fwd = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
  const left = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
  const p = work?.point ?? b.base.clone().addScaledVector(fwd, 0.55).setY(b.base.y + 0.9);
  const ph = toolPhase(p);
  const off = (o: BarOffset) => p.clone().addScaledVector(left, o.side).addScaledVector(UP, o.up).addScaledVector(fwd, o.ahead);
  switch (m) {
    case 'plane': {
      const k = planeRound(t, ph);
      return { reach: { l: off(k.l), r: off(k.r), palms: 1.3, lean: k.lean, nod: k.nod, grip: { l: k.check ? 0.15 : 0.85, r: 0.85 } }, crouch: 0.08 };
    }
    case 'handSaw': {
      const k = sawRound(t, ph);
      return { reach: { l: off(k.l), r: off(k.r), palms: k.upright > 0.5 ? 0.3 : 1.1, lean: k.lean, nod: k.nod, grip: { l: k.u < 0.28 ? 0.5 : 0.15, r: 0.85 } }, crouch: 0.06 };
    }
    case 'chisel': {
      const k = chiselRound(t, ph);
      return { reach: { l: off(k.l), r: off(k.r), palms: 0.4, lean: k.lean, nod: k.nod, grip: { l: 0.9, r: 0.95 } }, crouch: 0.05 };
    }
    case 'assemble': {
      const k = assembleRound(t, ph);
      return { reach: { l: off(k.l), r: off(k.r), palms: 0.9, lean: k.lean, nod: k.nod, grip: { l: 0.4, r: 0.95 } } };
    }
    case 'ripSaw': {
      const k = ripRound(t, ph);
      return { reach: { l: off(k.l), r: off(k.r), palms: 1.2, lean: k.lean, nod: k.nod, grip: { l: 0.2, r: k.stickHeld ? 0.9 : 0.5 } } };
    }
    case 'woodFinish': {
      const k = finishRound(t, ph);
      return { reach: { l: off(k.l), r: off(k.r), palms: 1.3, lean: k.lean, nod: k.nod, grip: { l: k.wipe > 0.5 ? 0.6 : 0.15, r: k.brushHeld ? 0.85 : 0.6 } } };
    }
    case 'sightBoard': {
      const k = sightRound(t, ph);
      return { reach: { l: off(k.l), r: off(k.r), palms: 0.5, lean: k.lean, nod: k.nod, grip: { l: 0.7, r: k.trace > 0.1 ? 0.2 : 0.7 } }, crouch: k.crouch };
    }
    default: {
      const k = drillRound(t, ph);
      return { reach: { l: off(k.l), r: off(k.r), palms: 1.1, lean: k.lean, nod: k.nod, grip: { l: 0.3, r: 0.9 } } };
    }
  }
}
