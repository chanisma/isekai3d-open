import * as THREE from 'three';
import type { BodyAt, Doing, Work } from '../activity';
/** Furniture metres: x across, y above the floor, +z towards the designer.
 * Every work marker is (0,1,0); both hands and props sample the same score.
 * Contacts stay in furniture metres. Only chest-height gestures depend on height.
 * The arrival clock starts on the first beat, independently for each copy and use. */
export type InteriorMotion = 'idMaterials' | 'idStudy' | 'idBoard' | 'idKickoff' | 'idPitch' | 'idSamples' | 'idMockup' | 'idLoad' | 'idReveal' | 'idColour' | 'idLight' | 'idModel' | 'idFabric' | 'idConsult' | 'idPresent';
export const INTERIOR_MOTIONS = new Set<string>([
    'idMaterials', 'idStudy', 'idBoard', 'idKickoff', 'idPitch', 'idSamples', 'idMockup',
    'idLoad', 'idReveal', 'idColour', 'idLight', 'idModel', 'idFabric', 'idConsult', 'idPresent',
]);
export type V = readonly [
    number,
    number,
    number
];
type Line = ReadonlyArray<readonly [
    string,
    number
]>;
export const mix = THREE.MathUtils.lerp;
export const sm = (u: number, a = 0, b = 1) => THREE.MathUtils.smoothstep(u, a, b);
export const add = (a: V, x = 0, y = 0, z = 0): V => [a[0] + x, a[1] + y, a[2] + z];
export const lerp = (a: V, b: V, u: number): V => [mix(a[0], b[0], u), mix(a[1], b[1], u), mix(a[2], b[2], u)];
const wave = (t: number, hz = 1) => Math.sin(t * hz * Math.PI * 2);
const arc = (a: V, b: V, u: number, h = 0.06): V => add(lerp(a, b, sm(u)), 0, h * Math.sin(Math.PI * sm(u)));
const clocks = new Map<string, {
    start: number;
    last: number;
}>();
export function interiorTime(m: InteriorMotion, t: number, origin: THREE.Vector3) {
    const key = `${m}:${origin.x.toFixed(3)}:${origin.y.toFixed(3)}:${origin.z.toFixed(3)}`;
    let c = clocks.get(key);
    // A slow software-rendered review frame must not restart the choreography.
    // Four seconds still separates normal walks between visits to the same station.
    if (!c || t < c.last || t - c.last > 4) {
        c = { start: t, last: t };
        clocks.set(key, c);
    }
    c.last = t;
    return t - c.start;
}
export const SCORES: Record<InteriorMotion, Line> = {
    idMaterials: [['pull', 2], ['take', 2], ['light', 2.8], ['feel', 2.4], ['lay', 2], ['note', 2], ['return', 2], ['shut', 1.5]],
    idStudy: [['fan', 2], ['warm', 2.5], ['cool', 2.5], ['compare', 2.5], ['note', 2], ['close', 1.5]],
    idBoard: [['take', 2], ['pin', 2], ['chip', 2], ['move', 2.5], ['annotate', 2.5], ['look', 2], ['reset', 2]],
    idKickoff: [['brief', 2], ['plan', 2.5], ['assign', 2.5], ['listen', 3], ['schedule', 2.5], ['agree', 2]],
    idPitch: [['brief', 2], ['photo', 2.5], ['palette', 2.5], ['listen', 2.5], ['revise', 2.5], ['agree', 2]],
    idSamples: [['plan', 2], ['tile', 2.4], ['fabric', 2.4], ['paint', 2.4], ['align', 2.4], ['photo', 2], ['reset', 2]],
    idMockup: [['measure', 2.5], ['base', 2], ['legs', 2.8], ['fit', 2.5], ['turn', 2.4], ['note', 2], ['reset', 2]],
    idLoad: [['open', 1.8], ['lift', 2.2], ['load', 2.2], ['lamp', 2.4], ['strap', 2], ['check', 2], ['shut', 1.8]],
    idReveal: [['brief', 2], ['open', 1.5], ['lift', 2], ['load', 2], ['lamp', 2], ['strap', 1.8], ['check', 2], ['shut', 1.7]],
    idColour: [['take', 2], ['fan', 2.4], ['wall', 2.5], ['compare', 2.4], ['select', 2], ['note', 2.2], ['return', 1.8]],
    idLight: [['switch', 2], ['warm', 2.5], ['neutral', 2.5], ['cool', 2.5], ['meter', 2.5], ['dim', 2], ['note', 2]],
    idModel: [['plan', 2], ['lift', 2.4], ['place', 2.4], ['route', 2.8], ['rotate', 2.6], ['show', 2], ['reset', 2]],
    idFabric: [['pull', 2.4], ['unroll', 2.5], ['smooth', 2.5], ['match', 2.6], ['measure', 2.4], ['tag', 2], ['roll', 2]],
    idConsult: [['welcome', 2], ['listen', 2.6], ['plan', 2.4], ['fan', 2.6], ['offer', 2.4], ['reply', 2.6], ['note', 2.6]],
    idPresent: [['open', 2], ['show', 2.5], ['photo', 2.4], ['palette', 2.6], ['reply', 2.8], ['revise', 2.4], ['approve', 2.5]],
};
export interface Beat {
    key: string;
    prev: string;
    i: number;
    n: number;
    u: number;
    elapsed: number;
}
export function interiorBeat(m: InteriorMotion, t: number): Beat {
    const line = SCORES[m];
    const length = line.reduce((a, b) => a + b[1], 0);
    const n = Math.floor(t / length);
    let elapsed = t - n * length;
    for (let i = 0; i < line.length; i++) {
        if (elapsed < line[i][1] || i === line.length - 1)
            return {
                key: line[i][0], prev: line[(i + line.length - 1) % line.length][0], i, n,
                u: elapsed / line[i][1], elapsed,
            };
        elapsed -= line[i][1];
    }
    throw new Error('Empty interior score');
}
/** These same contacts locate the drawer pulls, tools, swatches and paper in the builders. */
export const LIB = {
    handle: [0, 0.88, 0.15] as V, sample: [0.02, 0.94, 0.04] as V,
    light: [0.02, 1.32, 0.30] as V, tray: [0.22, 1.04, 0.24] as V,
    fan: [-0.27, 1.05, 0.20] as V, paper: [0.24, 1.04, 0.25] as V,
};
export const BOARD = {
    pile: [0.25, 0.92, 0.24] as V, pin: [-0.12, 1.39, 0.08] as V,
    chip: [0.29, 1.20, 0.08] as V, moved: [0.11, 1.47, 0.08] as V,
    pen: [-0.31, 0.93, 0.21] as V, note: [0.20, 1.09, 0.08] as V,
};
export const TABLE = {
    tile: [-0.37, 0.96, 0.22] as V, fabric: [-0.15, 0.97, 0.27] as V,
    paint: [0.36, 0.97, 0.24] as V, target: [0.04, 0.965, 0.20] as V,
    plan: [0.02, 0.96, 0.08] as V, pen: [0.42, 0.98, 0.26] as V,
    phone: [0.48, 0.98, 0.08] as V,
};
export const COLOUR = {
    fan: [-0.25, 0.99, 0.25] as V, hold: [-0.13, 1.20, 0.30] as V,
    compare: [0.03, 1.35, 0.17] as V, chip: [0.25, 1.32, 0.02] as V,
    paper: [0.30, 1.00, 0.23] as V,
};
export const LIGHT = {
    switch: [0.05, 1.06, 0.18] as V, meter: [-0.25, 1.04, 0.25] as V,
    hold: [-0.08, 1.26, 0.25] as V, dim: [0.30, 1.06, 0.18] as V,
    paper: [0.30, 1.01, 0.27] as V,
};
export const MODEL = {
    sofa: [-0.35, 1.03, 0.22] as V, target: [0.05, 1.03, 0.17] as V,
    dial: [0.41, 0.99, 0.26] as V, plan: [-0.43, 0.97, 0.20] as V,
};
export const FABRIC = {
    edge: [-0.15, 1.37, 0.10] as V, pulled: [-0.15, 1.08, 0.36] as V,
    match: [0.20, 1.20, 0.25] as V, tape: [0.30, 0.98, 0.27] as V,
};
export const CONSULT = {
    board: [0, 0.79, 0.08] as V, raised: [0, 1.05, 0.15] as V,
    fan: [-0.32, 0.80, 0.15] as V, hold: [-0.17, 1.04, 0.24] as V,
    across: [-0.12, 0.81, -0.17] as V, paper: [0.30, 0.80, 0.18] as V,
    pen: [0.45, 0.83, 0.24] as V,
};
export const VAN = {
    handle: [-0.48, 1.16, 0.45] as V, box: [-0.48, 0.68, 0.78] as V,
    load: [-0.48, 0.91, 0.24] as V, lamp: [-0.13, 1.17, 0.65] as V,
    secured: [-0.12, 1.18, 0.12] as V, paper: [-0.43, 1.02, 0.74] as V,
};
export interface State {
    l: V;
    r: V;
    lean: number;
    nod: number;
    palms: number;
    gl: number;
    gr: number;
    crouch: number;
    /** The real prop (never an independent, unsynchronised held copy). */
    prop: V;
    tilt: number;
    turn: number;
    open: number;
    progress: number;
}
const state = (l: V, r: V, more: Partial<State> = {}): State => ({
    l, r, lean: 0.12, nod: 0.25, palms: 0.8, gl: 0.25, gr: 0.6, crouch: 0,
    prop: r, tilt: 0, turn: 0, open: 0, progress: 0, ...more,
});
const grasp = (p: V, w = 0.10, more: Partial<State> = {}) => state(add(p, -w), add(p, w), { prop: p, gl: 0.75, gr: 0.75, ...more });
const jot = (p: V, t: number): V => add(p, 0.025 * wave(t, 0.8), 0.075 + 0.004 * wave(t, 5), 0.008 * wave(t, 1.7));
const libRest: V = [-0.17, 1.05, 0.32];
function materials(key: string, u: number, t: number, study: boolean): State {
    if (study) {
        const hold: V = [-0.1, 1.25, 0.31];
        switch (key) {
            case 'fan': return grasp(arc(LIB.fan, hold, u), 0.045, { open: sm(u), nod: 0.4 });
            case 'warm': return grasp(hold, 0.055, { open: 1, turn: -0.32, nod: 0.2 });
            case 'cool': return grasp(add(hold, 0.12), 0.055, { open: 1, turn: 0.35, nod: 0.1 });
            case 'compare': return state(hold, [0.14, 1.40, 0.05], { prop: hold, open: 1, gl: 0.8, gr: 0.1, nod: 0 });
            case 'note': return state(hold, jot(LIB.paper, t), { prop: hold, open: 1, gl: 0.8, nod: 0.5 });
            default: return grasp(arc(hold, LIB.fan, u), 0.045, { open: 1 - sm(u) });
        }
    }
    switch (key) {
        case 'pull': return state(libRest, add(LIB.handle, 0, 0, 0.22 * sm(u)), { prop: add(LIB.sample, 0, 0, 0.22 * sm(u)), open: sm(u), nod: 0.5 });
        case 'take': return grasp(arc(add(LIB.sample, 0, 0, 0.22), LIB.light, u), 0.09, { open: 1, tilt: sm(u) * 1.05 });
        case 'light': return grasp(LIB.light, 0.09, { tilt: 1.05, turn: 0.3 * wave(t, 0.4), open: 1, nod: 0.05 });
        case 'feel': return state(add(LIB.light, -0.09), add(LIB.light, 0.03 + 0.05 * wave(t, 0.7), 0.02, 0.03), { prop: LIB.light, tilt: 0.75, open: 1, gl: 0.8, gr: 0.1 });
        case 'lay': return grasp(arc(LIB.light, LIB.tray, u), 0.09, { open: 1, tilt: (1 - sm(u)) * 0.75, nod: 0.4 });
        case 'note': return state(add(LIB.tray, -0.12, 0.02), jot(add(LIB.paper, -0.25, 0, 0), t), { prop: LIB.tray, open: 1, nod: 0.5 });
        case 'return': return grasp(arc(LIB.tray, add(LIB.sample, 0, 0, 0.22), u), 0.09, { open: 1, nod: 0.4 });
        default: return state(libRest, add(LIB.handle, 0, 0, 0.22 * (1 - sm(u))), { prop: add(LIB.sample, 0, 0, 0.22 * (1 - sm(u))), open: 1 - sm(u), nod: 0.4 });
    }
}
export const KICKOFF = {
    agenda: [-0.28, 1.16, 0.32] as V,
    card: [0.04, 1.17, 0.06] as V,
    note: [-0.28, 1.10, 0.08] as V,
};
function board(key: string, u: number, t: number, m: InteriorMotion): State {
    const rest: V = [-0.19, 1.02, 0.34];
    if (m === 'idKickoff') {
        const l = KICKOFF.agenda;
        switch (key) {
            case 'brief': return state(l, [-0.16, 1.18, 0.30], { prop: BOARD.pile, gl: 0.8, gr: 0.1, nod: 0.35 });
            case 'plan': return state(l, [-0.25 + 0.40 * u, 1.08, 0.065], { prop: BOARD.pile, gl: 0.8, gr: 0.1, nod: 0.25 });
            case 'assign': {
                const p = arc(BOARD.pile, KICKOFF.card, u);
                return state(l, p, { prop: p, tilt: sm(u) * Math.PI / 2, gl: 0.8, gr: 0.7, nod: 0.2 });
            }
            case 'listen': return state(l, [0.16, 1.01, 0.35], { prop: KICKOFF.card, tilt: Math.PI / 2, gl: 0.8, gr: 0.15, nod: 0.06 * wave(t, 0.8) });
            case 'schedule': return state(l, add(KICKOFF.note, 0.16 * u, 0.006 * wave(t, 2), 0.01), { prop: KICKOFF.card, tilt: Math.PI / 2, gl: 0.8, gr: 0.85, progress: u, nod: 0.3 });
            default: return state(l, [0.24, 1.25, 0.32], { prop: KICKOFF.card, tilt: Math.PI / 2, gl: 0.8, gr: 0.05, palms: -0.2, progress: 1, nod: 0.05 });
        }
    }
    if (m !== 'idBoard') {
        const p: V = [-0.14, 1.34, 0.12];
        switch (key) {
            case 'brief': return state(rest, [-0.02, 1.18, 0.35], { gr: 0.05, palms: -0.2, nod: 0 });
            case 'photo':
            case 'plan': return state(rest, add(p, -0.07 + 0.14 * u, 0.10), { progress: u, nod: 0.05, gr: 0.1 });
            case 'palette':
            case 'assign': return state(rest, [0.22, 1.22 - 0.12 * u, 0.12], { progress: 0.5, nod: 0.2, gr: 0.12 });
            case 'listen': return state(rest, [0.16, 1.00, 0.35], { nod: 0.07 * wave(t, 0.8), gr: 0.2 });
            case 'revise':
            case 'schedule': return state(rest, add(BOARD.note, 0.1 * u, 0, 0.025 + 0.004 * wave(t, 4)), { progress: u, nod: 0.2, gr: 0.85 });
            default: return state([-0.21, 1.13, 0.29], [0.19, 1.13, 0.29], { palms: -0.15, gl: 0.05, gr: 0.05, nod: 0.04 });
        }
    }
    switch (key) {
        case 'take': return state(rest, arc(BOARD.pile, BOARD.pin, u), { prop: arc(BOARD.pile, BOARD.pin, u), tilt: sm(u) * 1.55, nod: 0.3 });
        case 'pin': return state(add(BOARD.pin, -0.06, -0.04), add(BOARD.pin, 0, 0.08, 0.02 + 0.016 * Math.max(0, wave(t, 2))), { prop: BOARD.pin, tilt: 1.55, gr: 0.45, nod: 0 });
        case 'chip': return state(rest, arc([0.35, 0.94, 0.22], BOARD.chip, u), { prop: BOARD.pin, tilt: 1.55 });
        case 'move': return state(rest, lerp(BOARD.pin, BOARD.moved, sm(u)), { prop: lerp(BOARD.pin, BOARD.moved, sm(u)), tilt: 1.55 });
        case 'annotate': return state(rest, add(BOARD.note, 0.10 * u, 0.008 * wave(t, 2), 0.03), { prop: BOARD.moved, tilt: 1.55, progress: u, gr: 0.9 });
        case 'look': return state(rest, [0.03, 1.39, 0.43], { prop: BOARD.moved, tilt: 1.55, nod: -0.08, lean: -0.03, progress: 1 });
        default: return state(rest, arc(BOARD.moved, BOARD.pile, u), { prop: arc(BOARD.moved, BOARD.pile, u), tilt: (1 - sm(u)) * 1.55, progress: 1 - sm(u) });
    }
}
function samples(key: string, u: number, t: number, mock: boolean): State {
    const l: V = [-0.16, 0.99, 0.31];
    if (mock) {
        const base: V = [0.04, 1.02, 0.20];
        switch (key) {
            case 'measure': return grasp([0.01, 1.00, 0.22], 0.15, { prop: [-0.28, 0.98, 0.22], nod: 0.5, palms: 1.3 });
            case 'base': return grasp(arc([-0.28, 0.98, 0.22], base, u), 0.10, { nod: 0.4 });
            case 'legs': return state(add(base, -0.1), [0.10, 1.13 + 0.02 * Math.abs(wave(t, 1.4)), 0.25], { prop: base, progress: u, nod: 0.5, gl: 0.8 });
            case 'fit': return grasp(add(base, 0, 0.02 * Math.max(0, wave(t, 1.2))), 0.11, { progress: 1, nod: 0.5 });
            case 'turn': return grasp([0.04, 1.22, 0.27], 0.11, { turn: u * Math.PI, progress: 1, nod: 0.15 });
            case 'note': return state(l, jot([0.38, 0.97, 0.26], t), { prop: base, progress: 1, nod: 0.5 });
            default: return grasp(arc(base, [-0.28, 0.98, 0.22], u), 0.11, { progress: 1 - sm(u), nod: 0.4 });
        }
    }
    switch (key) {
        case 'plan': return state(l, [0.10 - u * 0.18, 0.99, 0.11], { nod: 0.5, gr: 0.1 });
        case 'tile': return state(l, arc(TABLE.tile, TABLE.target, u), { prop: arc(TABLE.tile, TABLE.target, u), progress: u, nod: 0.4 });
        case 'fabric': return state(arc(TABLE.fabric, [-0.13, 0.98, 0.10], u), [0.22, 0.99, 0.30], { prop: arc(TABLE.fabric, [-0.13, 0.98, 0.10], u), progress: u, gl: 0.7, nod: 0.5 });
        case 'paint': return state(l, arc(TABLE.paint, [0.25, 0.98, 0.09], u), { prop: arc(TABLE.paint, [0.25, 0.98, 0.09], u), nod: 0.45 });
        case 'align': return state([-0.12 + 0.04 * u, 0.99, 0.17], [0.24 - 0.04 * u, 0.99, 0.17], { gl: 0.1, gr: 0.1, nod: 0.5, palms: 1.4 });
        case 'photo': return grasp([0.03, 1.34, 0.27], 0.055, { nod: 0.4, tilt: -0.5 });
        default: return state(l, arc(TABLE.target, TABLE.tile, u), { prop: arc(TABLE.target, TABLE.tile, u), nod: 0.45 });
    }
}
function colour(key: string, u: number, t: number): State {
    const C = COLOUR;
    switch (key) {
        case 'take': return grasp(arc(C.fan, C.hold, u), 0.045, { nod: 0.35 });
        case 'fan': return grasp(C.hold, 0.055, { open: sm(u), nod: 0.3 });
        case 'wall': return grasp(arc(C.hold, C.compare, u), 0.055, { open: 1, tilt: sm(u) * 1.1, nod: 0.05 });
        case 'compare': return state(add(C.compare, -0.055), add(C.chip, 0, 0, 0.03), { prop: C.compare, open: 1, tilt: 1.1, gl: 0.8, gr: 0.1, nod: 0.05 });
        case 'select': return state(C.hold, arc(C.chip, C.paper, u), { prop: C.hold, open: 1, progress: u, nod: 0.2 });
        case 'note': return state(C.hold, jot(C.paper, t), { prop: C.hold, open: 1, progress: 1, nod: 0.5 });
        default: return grasp(arc(C.hold, C.fan, u), 0.045, { open: 1 - sm(u), nod: 0.35 });
    }
}
function lighting(key: string, u: number, t: number): State {
    const l: V = [-0.15, 1.04, 0.30];
    switch (key) {
        case 'switch': return state(l, LIGHT.switch, { progress: sm(u), gr: 0.1, nod: 0.4 });
        case 'warm': return state(l, [-0.20, 1.23, 0.19], { prop: LIGHT.meter, progress: 1, nod: 0.02, gr: 0.1 });
        case 'neutral': return state(l, [0.0, 1.22, 0.19], { prop: LIGHT.meter, progress: 2, nod: -0.05, gr: 0.1 });
        case 'cool': return state(l, [0.24, 1.22, 0.19], { prop: LIGHT.meter, progress: 3, nod: -0.05, gr: 0.1 });
        case 'meter': return state(l, arc(LIGHT.meter, LIGHT.hold, sm(u, 0, 0.4)), { prop: arc(LIGHT.meter, LIGHT.hold, sm(u, 0, 0.4)), nod: 0.3, progress: 3 });
        case 'dim': return state(LIGHT.hold, LIGHT.dim, { prop: LIGHT.hold, open: u, palms: 0.6 + 0.25 * wave(t, 0.7), nod: 0.1, gl: 0.8, progress: 3 });
        default: return state(l, jot(LIGHT.paper, t), { prop: LIGHT.meter, progress: 3, nod: 0.5 });
    }
}
function model(key: string, u: number, t: number): State {
    const l: V = [-0.18, 1.0, 0.33];
    switch (key) {
        case 'plan': return state(l, add(MODEL.plan, 0.12 * u, 0.03), { prop: MODEL.sofa, nod: 0.5, gr: 0.1 });
        case 'lift': return grasp(arc(MODEL.sofa, [-0.10, 1.22, 0.27], u), 0.07, { nod: 0.35 });
        case 'place': return grasp(arc([-0.10, 1.22, 0.27], MODEL.target, u), 0.07, { nod: 0.4 });
        case 'route': return state(l, [-0.12 + 0.32 * u, 1.04, 0.31 - 0.08 * Math.sin(Math.PI * u)], { prop: MODEL.target, progress: u, nod: 0.5, gr: 0.1 });
        case 'rotate': return state(l, add(MODEL.dial, 0.015 * wave(t), 0, 0.015 * wave(t, 0.7)), { prop: MODEL.target, turn: sm(u) * 0.45, progress: 1, nod: 0.3 });
        case 'show': return state([-0.20, 1.12, 0.25], [0.18, 1.16, 0.26], { prop: MODEL.target, progress: 1, turn: 0.45, nod: 0.02, gr: 0.05 });
        default: return grasp(arc(MODEL.target, MODEL.sofa, u), 0.07, { turn: (1 - sm(u)) * 0.45, nod: 0.4 });
    }
}
function fabric(key: string, u: number, t: number): State {
    switch (key) {
        case 'pull': return grasp(arc(FABRIC.edge, FABRIC.pulled, u), 0.13, { open: sm(u), nod: 0.2 });
        case 'unroll': return grasp(FABRIC.pulled, 0.18, { open: 1, progress: sm(u), nod: 0.4 });
        case 'smooth': return state([-0.29, 1.08, 0.33], [-0.03 + 0.09 * wave(t, 0.65), 1.08, 0.32], { prop: FABRIC.pulled, open: 1, progress: 1, gr: 0.1, nod: 0.4, palms: 1.4 });
        case 'match': return state([-0.26, 1.09, 0.32], FABRIC.match, { prop: FABRIC.pulled, open: 1, progress: 1, nod: 0.15 });
        case 'measure': return grasp([-0.07, 1.10, 0.33], 0.21, { prop: FABRIC.pulled, open: 1, progress: 1, nod: 0.45 });
        case 'tag': return state([-0.27, 1.10, 0.32], jot([-0.03, 1.05, 0.33], t), { prop: FABRIC.pulled, open: 1, progress: 1, nod: 0.45 });
        default: return grasp(arc(FABRIC.pulled, FABRIC.edge, u), 0.13, { open: 1 - sm(u), progress: 1 - sm(u), nod: 0.2 });
    }
}
function consult(key: string, u: number, t: number, present: boolean): State {
    const C = CONSULT;
    const l: V = [-0.18, 0.82, 0.27];
    if (present) {
        switch (key) {
            case 'open': return grasp(arc(C.board, C.raised, u), 0.16, { tilt: sm(u) * 0.95, nod: 0.25 });
            case 'show': return grasp(C.raised, 0.16, { tilt: 0.95, nod: 0 });
            case 'photo': return state(add(C.raised, -0.16), add(C.raised, 0.04, 0.06, 0.03), { prop: C.raised, tilt: 0.95, gl: 0.8, gr: 0.1, nod: 0.15 });
            case 'palette': return state(add(C.raised, -0.16), add(C.raised, 0.08, -0.03, 0.04), { prop: C.raised, tilt: 0.95, gl: 0.8, gr: 0.1 });
            case 'reply': return grasp(arc(C.raised, C.board, sm(u, 0, 0.4)), 0.16, { tilt: (1 - sm(u, 0, 0.4)) * 0.95, nod: 0.06 * wave(t, 0.8) });
            case 'revise': return state(l, arc(C.fan, [-0.06, 0.83, 0.08], u), { prop: C.board, progress: u, nod: 0.4 });
            default: return state(l, [0.11, 0.91, 0.12], { prop: C.board, progress: 1, gr: 0.05, nod: 0.05 });
        }
    }
    switch (key) {
        case 'welcome': return state(l, [0.13, 1.02, 0.20], { prop: C.fan, gr: 0.05, palms: -0.2, nod: 0 });
        case 'listen': return state(l, [0.15, 0.83, 0.26], { prop: C.fan, nod: 0.06 * wave(t, 0.7), gr: 0.1 });
        case 'plan': return state(l, [-0.02 + 0.12 * u, 0.83, 0.04], { prop: C.fan, gr: 0.1, nod: 0.3 });
        case 'fan': return grasp(arc(C.fan, C.hold, sm(u, 0, 0.4)), 0.045, { open: sm(u, 0.4, 0.8), nod: 0.2 });
        case 'offer': return state(l, arc(C.hold, C.across, u), { prop: arc(C.hold, C.across, u), open: 1, nod: 0.1, lean: 0.25 });
        case 'reply': return state(l, [0.16, 0.84, 0.25], { prop: C.across, open: 1, gr: 0.1, nod: 0.06 * wave(t, 0.8) });
        default: {
            const p = arc(C.across, C.fan, sm(u, 0, 0.25));
            return state(u < 0.3 ? p : l, jot(C.paper, t), { prop: p, open: 1 - sm(u, 0, 0.25), gl: u < 0.3 ? 0.8 : 0.25, nod: 0.45, palms: 1.2 });
        }
    }
}
function van(key: string, u: number, t: number): State {
    const l: V = [-0.64, 0.98, 0.78];
    switch (key) {
        case 'brief': return grasp(VAN.paper, 0.10, { prop: VAN.box, nod: 0.35 });
        case 'open': return state(l, add(VAN.handle, 0, 0.194 * sm(u)), { prop: VAN.box, open: sm(u), nod: 0.1 });
        case 'lift': return grasp(arc(VAN.box, [-0.48, 1.06, 0.66], u), 0.16, { open: 1, crouch: 0.18 * (1 - sm(u)), nod: 0.4 });
        case 'load': return grasp(arc([-0.48, 1.06, 0.66], VAN.load, u), 0.16, { open: 1, lean: 0.28, nod: 0.3 });
        case 'lamp': return state(l, arc(VAN.lamp, VAN.secured, u), { prop: VAN.load, open: 1, progress: u, nod: 0.2 });
        case 'strap': return state([-0.65, 1.0, 0.35], [-0.23, 1.01, 0.35 + 0.03 * wave(t)], { prop: VAN.load, open: 1, progress: 1, lean: 0.3, nod: 0.4 });
        case 'check': return state(add(VAN.paper, -0.10), jot(VAN.paper, t), { prop: VAN.load, open: 1, progress: 1, nod: 0.5 });
        default: return state(l, add(VAN.handle, 0, 0.194 * (1 - sm(u))), { prop: VAN.load, open: 1 - sm(u), progress: 1, nod: 0.1 });
    }
}
function keyState(m: InteriorMotion, key: string, u: number, t: number): State {
    switch (m) {
        case 'idMaterials':
        case 'idStudy': return materials(key, u, t, m === 'idStudy');
        case 'idBoard':
        case 'idKickoff':
        case 'idPitch': return board(key, u, t, m);
        case 'idSamples':
        case 'idMockup': return samples(key, u, t, m === 'idMockup');
        case 'idColour': return colour(key, u, t);
        case 'idLight': return lighting(key, u, t);
        case 'idModel': return model(key, u, t);
        case 'idFabric': return fabric(key, u, t);
        case 'idConsult':
        case 'idPresent': return consult(key, u, t, m === 'idPresent');
        default: return van(key, u, t);
    }
}
/** The first 0.35 seconds of each beat interpolate every hand AND object contact. */
export function interiorNow(m: InteriorMotion, t: number): State & {
    b: Beat;
} {
    const b = interiorBeat(m, t);
    const a = keyState(m, b.prev, 1, t), c = keyState(m, b.key, b.u, t);
    const e = sm(b.elapsed, 0, 0.35);
    return {
        b, l: lerp(a.l, c.l, e), r: lerp(a.r, c.r, e), prop: lerp(a.prop, c.prop, e),
        lean: mix(a.lean, c.lean, e), nod: mix(a.nod, c.nod, e), palms: mix(a.palms, c.palms, e),
        gl: mix(a.gl, c.gl, e), gr: mix(a.gr, c.gr, e), crouch: mix(a.crouch, c.crouch, e),
        tilt: mix(a.tilt, c.tilt, e), turn: mix(a.turn, c.turn, e), open: mix(a.open, c.open, e), progress: mix(a.progress, c.progress, e),
    };
}
export function interiorDoing(m: InteriorMotion, b: BodyAt, work: Work | null, t: number): Doing {
    const origin = work?.point ?? b.base.clone().add(new THREE.Vector3(0, 1, 0));
    const a = interiorNow(m, interiorTime(m, t, origin));
    const forward = new THREE.Vector3(Math.sin(b.yaw), 0, Math.cos(b.yaw));
    const side = new THREE.Vector3(Math.cos(b.yaw), 0, -Math.sin(b.yaw));
    const world = (p: V) => origin.clone().addScaledVector(side, -p[0]).addScaledVector(forward, -p[2]).add(new THREE.Vector3(0, p[1] - 1, 0));
    return {
        reach: { l: world(a.l), r: world(a.r), lean: a.lean, nod: a.nod, palms: a.palms, grip: { l: a.gl, r: a.gr } },
        crouch: a.crouch || undefined,
    };
}
