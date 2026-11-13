import * as THREE from 'three';
import type { ObjectDef } from '../game/types';
import { FLOOR_H } from './house3d';
import { DARK, METAL, WHITE, WOOD, Cover, deskBase, iconOn, legs, marker, rod, screenMesh, shade, tint, type BuildCtx, type Builder, type Built } from './parts';
import { DETAIL } from './furnitureDetail';
import { CLEANING_DETAIL } from './cleaningTools';
import { RUG_DETAIL } from './rugs';
import { getDef } from '../game/catalog';
import { SET_DETAIL } from './furnitureSet';
import { SHOP_DETAIL } from './furnitureShop';
import { SPACE_DETAIL } from './furnitureSpace';
import { WORKPLACE_DETAIL } from './workplaces';
import { HOME_DETAIL } from './home';
import { PLATFORMS, platformOf, vehicle } from './furniturePlatform';
import { WORK_BUILDERS, WORK_RULES, type WorkKind } from './furnitureWork';
import { ball, box, cyl, part, rbox, toon } from './toon';

export { Cover, type BuildCtx, type Built } from './parts';

/**
 * Furniture in 3D (docs/3d/01-view.md §3). The catalogue has some five hundred objects, so each is
 * built from one of a few dozen families (a bed, a chair, a desk with a computer, a shelf, a
 * vehicle…) sized to its footprint and coloured with its own colour; the family follows from the
 * id. Each is built in its own frame: facing 'down' with its front to +z, its footprint centred on
 * the origin, standing on y = 0.
 */
export type Kind = HouseKind | WorkKind;
export type HouseKind =
  | 'bed' | 'toddlerBed' | 'bassinet' | 'sofa' | 'chair' | 'highChair' | 'recliner' | 'table' | 'desk' | 'computer' | 'counter'
  | 'tv' | 'board' | 'art' | 'mirror' | 'shelf' | 'fridge' | 'stove' | 'sink' | 'toilet' | 'shower' | 'bathtub'
  | 'lamp' | 'plant' | 'tree' | 'bush' | 'garden' | 'easel' | 'piano' | 'instrument' | 'mic' | 'vehicle'
  | 'platform' | 'water' | 'stairs' | 'camera' | 'telescope' | 'tank' | 'frame' | 'crate' | 'cake' | 'alarm'
  | 'mailbox' | 'podium' | 'machine';

/** First match wins: the id (and for a few, the name) against these. */
const RULES: Array<[RegExp, Kind]> = [
  ...WORK_RULES,
  [/^stairs$/, 'stairs'],
  [/^smokeAlarm$/, 'alarm'],
  [/^mailbox$/, 'mailbox'],
  [/^birthdayCake$/, 'cake'],
  [/^toddlerBed$/, 'toddlerBed'],
  [/^bassinet$|crib/i, 'bassinet'],
  [/^highChair$/, 'highChair'],
  [/^pottyChair$|^toilet$/, 'toilet'],
  [/garden(Bed)?$|^gardenBed$|cropField|seedlingNursery|^planter$/i, 'garden'],
  [/^tree$/, 'tree'],
  [/^bush$/, 'bush'],
  [/bed$/i, 'bed'],
  [/dentalChair|surgeryTable|vetTable|massage/i, 'recliner'],
  [/sofa|couch/i, 'sofa'],
  [/armchair|chair|stool|salonStation|seat$/i, 'chair'],
  [/fridge|freezer/i, 'fridge'],
  [/stove|oven|grill|fireplace/i, 'stove'],
  [/sink/i, 'sink'],
  [/shower/i, 'shower'],
  [/bathtub|hotTub/i, 'bathtub'],
  [/^tv$|bigTv|screen$|Screen$|projector/i, 'tv'],
  [/painting|poster|photoBackdrop|selfieWall|storyboardWall|toolWall/i, 'art'],
  [/mirror/i, 'mirror'],
  [/board$|Board$|^chalkboard$|greenScreen|listingBoard/i, 'board'],
  [/computer|Computer|station$|Station$|terminal|Terminal|workstation|gamingRig|streamingSetup|cadStation|editingSuite|labControl|productionPanel|mixingConsole|djBooth|radioStation|weatherStation|greenhouseControl|opsDesk/i, 'computer'],
  [/desk$|Desk$|^tellerWindow$|reception|salonCounter|pharmacyCounter/i, 'desk'],
  [/counter|Counter|^bar$|prepTable|doughTable|displayCase|servingPass|farmStand|buffet/i, 'counter'],
  [/bookshelf|shelf|Shelf|cabinet|Cabinet|locker|Locker|rack$|Rack$|library|Library|archive|Case$|wineRack|seedShelf|toyShelf|materialLibrary|serverRack|gearRack|hoseRack/i, 'shelf'],
  [/table$|Table$|bench$|Bench$|chessTable|altar|Altar|tray$|Tray$/i, 'table'],
  [/lamp|Light$/i, 'lamp'],
  [/plant|Plant|flower|Flower|wreath|Wreath/i, 'plant'],
  [/easel|Easel/i, 'easel'],
  [/piano|Piano/i, 'piano'],
  [/guitar|violin|bass$|drum/i, 'instrument'],
  [/mic$|Mic$|karaoke/i, 'mic'],
  [/car$|Car$|truck|Truck|van$|Van$|jeep|Jeep|scooter|Scooter|tractor|Tractor|plane$|Plane$|bike/i, 'vehicle'],
  [/stage|Stage|mat$|Mat$|runway|catwalk|Set$|^filmSet$|ramp|Ramp|course|Course|posingSpot|carLift/i, 'platform'],
  [/pond|pool$/i, 'water'],
  [/telescope|microscope/i, 'telescope'],
  [/camera|Camera/i, 'camera'],
  [/aquarium|tank$|Tank$/i, 'tank'],
  [/monkeyBars|pullUpBar|climbingWall|barre|Barre|fireDrill|flagPole|flag|Flag|trainingDummy|mannequin|anatomyModel|wardrobeRack|treadmill/i, 'frame'],
  [/podium|Podium|judgeBench|boardingGate/i, 'podium'],
  [/box$|Box$|crate|Crate|shredder|chest$/i, 'crate'],
];

/** What a piece is drawn as (`ObjectDef.lookOf`). */
const lookDef = (def: ObjectDef) => (def.lookOf ? getDef(def.lookOf) : def);

export function kindOf(given: ObjectDef): Kind {
  const def = lookDef(given);
  for (const [re, kind] of RULES) if (re.test(def.id)) return kind;
  return 'machine';
}

/** Hung on the wall behind it when there is one (paintings, boards, a mirror, a TV, a smoke alarm). */
export const WALL_HUNG = new Set<Kind>(['art', 'board', 'mirror', 'alarm']);

/** The top of a bassinet's mattress, metres. */
export const BASSINET_BED = 0.64;

/** How high dwellers sit or lie on a family of furniture, metres. */
export const SEAT_Y: Partial<Record<Kind, number>> = { toddlerBed: 0.3, sofa: 0.42, chair: 0.46, highChair: 0.7, recliner: 0.62, toilet: 0.44, bathtub: 0.18, bed: 0.49, piano: 0.48, desk: 0.46, computer: 0.46, table: 0.46 };

const BLACK_WHEEL = '#2b2b30';

const B: Record<Kind, Builder> = {
  ...WORK_BUILDERS,
  bed(g, W, D, c, _d, _x, out) {
    legs(g, W - 0.1, D - 0.1, 0.12, WOOD);
    part(g, rbox(W - 0.1, 0.2, D - 0.1, 0.04), WOOD, 0, 0.22, 0);
    part(g, rbox(W - 0.14, 0.18, D - 0.16, 0.06), WHITE, 0, 0.41, 0);
    part(g, rbox(W - 0.06, 0.95, 0.1, 0.04), shade(WOOD, 0.85), 0, 0.48, -D / 2 + 0.05);
    const pillows = W > 1.5 ? [-W / 4, W / 4] : [0];
    for (const x of pillows) part(g, rbox(Math.min(0.6, W / pillows.length - 0.15), 0.12, 0.32, 0.06), '#ffffff', x, 0.54, -D / 2 + 0.32);
    const len = D - 0.5;
    const cover = new Cover(W - 0.06, len, c);
    cover.mesh.position.set(0, 0.515, D / 2 - len / 2 + 0.02);
    g.add(cover.mesh);
    out.cover = cover;
  },
  toddlerBed(g, W, D, c, _d, _x, out) {
    // Low (the mattress at a toddler's knee), shorter than a bed, its head end against the back.
    const [w, d] = [Math.min(W, 0.8), Math.min(D, 1.5)];
    const z = -D / 2 + d / 2 + 0.05;
    const top = SEAT_Y.toddlerBed!;
    legs(g, w - 0.06, d - 0.06, 0.08, WOOD);
    part(g, rbox(w, 0.1, d, 0.03), WOOD, 0, 0.13, z);
    part(g, rbox(w - 0.06, 0.12, d - 0.08, 0.05), WHITE, 0, top - 0.06, z);
    part(g, rbox(w, 0.6, 0.06, 0.03), c, 0, 0.32, z - d / 2 + 0.03);
    part(g, rbox(w, 0.42, 0.06, 0.03), c, 0, 0.23, z + d / 2 - 0.03);
    // Guard rails along the head half of both sides, on two posts each.
    for (const sx of [-1, 1]) {
      part(g, rbox(0.04, 0.05, d * 0.5, 0.02), shade(c, 0.9), sx * (w / 2 - 0.02), top + 0.17, z - d * 0.22);
      for (const pz of [-d * 0.45, 0]) part(g, rbox(0.035, 0.2, 0.035, 0.01), shade(c, 0.9), sx * (w / 2 - 0.02), top + 0.08, z + pz);
    }
    part(g, rbox(w * 0.6, 0.08, 0.24, 0.05), '#ffffff', 0, top + 0.04, z - d / 2 + 0.2);
    // From below the chin (a toddler's face is near the pillow) to the foot.
    const len = d - 0.5;
    const cover = new Cover(w - 0.08, len, tint(c, 0.35), 0.8);
    cover.mesh.position.set(0, top + 0.015, z + d / 2 - len / 2 - 0.05);
    g.add(cover.mesh);
    out.cover = cover;
  },
  bassinet(g, W, D, c) {
    // A basket on legs, open at the top, its mattress down inside (the baby lies on it: BASSINET_BED).
    const [w, d, t, h] = [Math.min(W, 0.6), Math.min(D, 0.85), 0.05, 0.3];
    legs(g, w - 0.1, d - 0.15, 0.5, WOOD, 0.05, 0.02);
    part(g, rbox(w, 0.06, d, 0.03), tint(c, 0.3), 0, 0.53, 0);
    for (const s of [-1, 1]) {
      part(g, rbox(t, h, d, 0.02), tint(c, 0.4), s * (w / 2 - t / 2), 0.53 + h / 2, 0);
      part(g, rbox(w, h, t, 0.02), tint(c, 0.4), 0, 0.53 + h / 2, s * (d / 2 - t / 2));
    }
    part(g, rbox(w - t * 2, 0.08, d - t * 2, 0.03), WHITE, 0, BASSINET_BED - 0.04, 0);
  },
  sofa(g, W, D, c) {
    // A seat about as deep as a sitter's thighs are long, so their knees come to its front edge.
    const d = Math.min(D, 0.8);
    const z = -D / 2 + d / 2;
    part(g, rbox(W - 0.08, 0.26, d, 0.08), c, 0, 0.17, z);
    part(g, rbox(W - 0.08, 0.6, 0.2, 0.1), shade(c, 0.92), 0, 0.6, z - d / 2 + 0.1);
    for (const sx of [-1, 1]) part(g, rbox(0.2, 0.5, d, 0.09), shade(c, 0.85), sx * (W / 2 - 0.14), 0.4, z);
    const n = Math.max(1, Math.round(W));
    const cw = (W - 0.5) / n;
    for (let i = 0; i < n; i++) part(g, rbox(cw - 0.03, 0.12, d - 0.28, 0.05), tint(c, 0.15), -W / 2 + 0.25 + cw * (i + 0.5), 0.36, z + 0.08);
  },
  chair(g, W, D, c, def, _ctx, out) {
    const big = /armchair|salon/i.test(def.id);
    const w = big ? Math.min(W, 0.85) : 0.48;
    const d = big ? Math.min(D, 0.8) : 0.46;
    out.seat = marker(g, 0, big ? 0.45 : 0.47, big ? 0.04 : 0.02);
    if (big) {
      part(g, rbox(w, 0.3, d, 0.08), c, 0, 0.2, 0);
      part(g, rbox(w, 0.55, 0.18, 0.08), shade(c, 0.9), 0, 0.6, -d / 2 + 0.09);
      for (const sx of [-1, 1]) part(g, rbox(0.14, 0.42, d, 0.07), shade(c, 0.85), sx * (w / 2 - 0.07), 0.38, 0);
      part(g, rbox(w - 0.3, 0.1, d - 0.2, 0.05), tint(c, 0.15), 0, 0.4, 0.06);
      return;
    }
    legs(g, w, d, 0.42, shade(c, 0.7), 0.04, 0.022);
    part(g, rbox(w, 0.06, d, 0.02), c, 0, 0.44, 0);
    if (!/stool/i.test(def.id)) part(g, rbox(w, 0.48, 0.05, 0.02), c, 0, 0.7, -d / 2 + 0.03);
  },
  highChair(g, _W, _D, c) {
    legs(g, 0.5, 0.5, 0.65, METAL, 0.04, 0.02);
    part(g, rbox(0.42, 0.08, 0.42, 0.03), c, 0, 0.68, 0);
    part(g, rbox(0.42, 0.4, 0.05, 0.02), c, 0, 0.9, -0.19);
    part(g, rbox(0.5, 0.04, 0.24, 0.02), WHITE, 0, 0.84, 0.24);
  },
  recliner(g, W, D, c) {
    part(g, cyl(0.12, 0.2, 0.4, 16), METAL, 0, 0.2, 0);
    part(g, rbox(Math.min(W, 0.8) - 0.1, 0.18, D - 0.25, 0.08), c, 0, 0.52, 0.05);
    part(g, rbox(Math.min(W, 0.8) - 0.1, 0.6, 0.16, 0.08), shade(c, 0.9), 0, 0.85, -D / 2 + 0.2, { rx: -0.25 });
  },
  table(g, W, D, c, def) {
    const h = /coffee|low/i.test(def.id) ? 0.42 : 0.75;
    legs(g, W, D, h - 0.05, shade(c, 0.75), 0.1, 0.035);
    part(g, rbox(W - 0.06, 0.06, D - 0.06, 0.03), c, 0, h - 0.03, 0);
    if (def.id === 'chessTable') {
      const t = new THREE.Mesh(box(0.4, 0.012, 0.4), toon('#efe0c0'));
      t.position.set(0, h + 0.006, 0);
      g.add(t);
      for (let i = 0; i < 6; i++) part(g, cyl(0.02, 0.025, 0.06, 8), i % 2 ? DARK : WHITE, -0.15 + i * 0.06, h + 0.04, i % 2 ? 0.15 : -0.15, { outline: false });
    } else if (!/dining/i.test(def.id)) iconOn(g, def, h + 0.012, 0, 0.32)?.rotation.set(-Math.PI / 2, 0, 0);
  },
  desk(g, W, D, c, _def, _ctx, out) {
    const { z, d } = deskBase(g, W, D, c, out);
    // Paper where the hands go, a mug further back.
    part(g, rbox(0.3, 0.02, 0.22, 0.01), WHITE, 0, 0.775, z + d / 2 - 0.14, { outline: false });
    part(g, cyl(0.04, 0.035, 0.1, 10), '#e57373', 0.26, 0.81, z - 0.12, { outline: false });
    out.work = marker(g, 0, 0.79, z + d / 2 - 0.12);
  },
  computer(g, W, D, c, def, _ctx, out) {
    const { z, d } = deskBase(g, W, D, /desk/i.test(def.color) ? c : WOOD, out);
    // A keyboard near the front edge, the screen behind it.
    part(g, rbox(0.06, 0.18, 0.06, 0.02), DARK, 0, 0.86, z - 0.12);
    part(g, rbox(0.62, 0.38, 0.04, 0.02), DARK, 0, 1.12, z - 0.12);
    const s = screenMesh(0.56, 0.32);
    s.position.set(0, 1.12, z - 0.095);
    g.add(s);
    out.screen = s;
    part(g, rbox(0.42, 0.02, 0.14, 0.01), '#d6d6d6', 0, 0.775, z + d / 2 - 0.1, { outline: false });
    part(g, rbox(0.07, 0.02, 0.1, 0.01), '#d6d6d6', 0.32, 0.775, z + d / 2 - 0.1, { outline: false });
    out.work = marker(g, 0, 0.79, z + d / 2 - 0.09);
    part(g, rbox(0.2, 0.42, 0.42, 0.02), c, -W / 2 + 0.16, 0.21, z);
  },
  counter(g, W, D, c, def) {
    part(g, rbox(W - 0.04, 0.86, D - 0.08, 0.02), c, 0, 0.43, 0);
    part(g, rbox(W, 0.05, D - 0.02, 0.02), '#e8e2d8', 0, 0.885, 0);
    for (let i = 0; i < Math.round(W); i++) part(g, box(0.3, 0.02, 0.02), METAL, -W / 2 + 0.5 + i, 0.72, D / 2 - 0.03, { outline: false });
    if (def.id !== 'bar' && def.id !== 'kitchenCounter') iconOn(g, def, 0.45, D / 2 - 0.035, 0.36);
  },
  tv(g, W, D, c, def, _ctx, out) {
    const w = Math.min(W - 0.1, def.id === 'bigTv' ? 1.7 : 1.25);
    const big = W >= 3;
    // On a low cabinet (참고 게임's TVs stand on one), so it stays when the wall behind is cut away.
    if (!big) {
      part(g, rbox(W - 0.2, 0.45, Math.min(D, 0.45), 0.03), WOOD, 0, 0.225, -D / 2 + 0.25);
      part(g, rbox(0.3, 0.06, 0.2, 0.02), DARK, 0, 0.48, -D / 2 + 0.25);
    }
    const y = big ? 1.6 : 0.95;
    const h = big ? 1.6 : w * 0.58;
    const z = -D / 2 + 0.25;
    part(g, rbox(big ? W - 0.2 : w, h, 0.05, 0.02), big ? '#f5f5f5' : DARK, 0, y, z);
    const s = screenMesh((big ? W - 0.2 : w) - 0.06, h - 0.06);
    s.position.set(0, y, z + 0.03);
    g.add(s);
    out.screen = s;
    void c;
  },
  art(g, W, D, c, def, ctx) {
    const w = Math.min(W - 0.1, W > 1 ? W - 0.3 : 0.7);
    const h = W > 1 ? 1.4 : 0.85;
    // Flat against the wall when hung (its back on the wall's face), else on an easel stand.
    const z = -D / 2 + (ctx.againstWall ? 0.025 : 0.12);
    const y = ctx.againstWall ? 1.55 : h / 2 + 0.6;
    if (!ctx.againstWall) {
      part(g, cyl(0.02, 0.02, y, 6), WOOD, -w / 3, y / 2, z - 0.1, { rx: 0.1, outline: false });
      part(g, cyl(0.02, 0.02, y, 6), WOOD, w / 3, y / 2, z - 0.1, { rx: 0.1, outline: false });
    }
    part(g, rbox(w, h, 0.04, 0.01), WOOD, 0, y, z);
    const pic = new THREE.Mesh(box(w - 0.1, h - 0.1, 0.01), toon(tint(c, 0.25)));
    pic.position.set(0, y, z + 0.022);
    g.add(pic);
    iconOn(g, def, y, z + 0.03, Math.min(w, h) * 0.6);
  },
  mirror(g, W, D, _c, def, ctx) {
    const w = W > 1 ? W - 0.3 : 0.55;
    const z = -D / 2 + (ctx.againstWall ? 0.025 : 0.11);
    const y = ctx.againstWall ? 1.4 : 0.95;
    if (!ctx.againstWall) part(g, rbox(w + 0.1, 0.06, 0.4, 0.02), WOOD, 0, 0.03, z + 0.1);
    part(g, rbox(w + 0.08, def.id === 'mirror' ? 1.1 : 1.7, 0.04, 0.02), '#e2c27b', 0, y, z);
    const glass = new THREE.Mesh(box(w, def.id === 'mirror' ? 1.0 : 1.6, 0.01), toon('#d9eef7', '#5c7c8a'));
    glass.position.set(0, y, z + 0.022);
    g.add(glass);
  },
  board(g, W, D, c, def, ctx) {
    const w = W - 0.2;
    const h = 1.0;
    const z = -D / 2 + (ctx.againstWall ? 0.025 : 0.2);
    const y = ctx.againstWall ? 1.45 : 1.2;
    if (!ctx.againstWall) for (const sx of [-1, 1]) part(g, cyl(0.025, 0.025, 1.7, 8), METAL, sx * (w / 2 - 0.05), 0.85, z);
    const face = def.id === 'chalkboard' || /formula/i.test(def.id) ? '#2f4f3a' : def.id === 'greenScreen' ? '#4caf50' : WHITE;
    part(g, rbox(w, h, 0.04, 0.01), '#b0b4b8', 0, y, z);
    const s = new THREE.Mesh(box(w - 0.08, h - 0.08, 0.01), toon(face));
    s.position.set(0, y, z + 0.022);
    g.add(s);
    if (face !== '#4caf50') iconOn(g, def, y + 0.1, z + 0.03, 0.4);
    void c;
  },
  shelf(g, W, D, c, def, _ctx, out) {
    const id = def.id;
    const closed = /locker|freezer|cabinet|server|rescueGear/i.test(id);
    const h = closed ? 1.9 : 1.8;
    const d = Math.min(D, 0.4);
    const z = -D / 2 + d / 2 + 0.03;
    const zf = z + d / 2;
    out.work = marker(g, 0, 1.15, zf);
    if (closed) {
      part(g, rbox(W - 0.1, h, d, 0.02), c, 0, h / 2, z);
      if (/server/i.test(id)) {
        // A rack: a dark front of units, their lights.
        part(g, box(W - 0.2, h - 0.15, 0.01), '#263238', 0, h / 2, zf + 0.005, { outline: false });
        for (let y = 0.25; y < h - 0.15; y += 0.14) {
          part(g, box(W - 0.26, 0.1, 0.012), '#37474f', 0, y, zf + 0.01, { outline: false });
          part(g, box(0.02, 0.02, 0.014), (y * 10) % 2 > 1 ? '#69f0ae' : '#40c4ff', W / 2 - 0.2, y, zf + 0.012, { outline: false });
        }
        return;
      }
      // Lockers in a row, or cupboard doors: each with its handle (and a locker's vents).
      const n = Math.max(1, Math.round((W - 0.1) / (/locker/i.test(id) ? 0.4 : 0.45)));
      const dw = (W - 0.14) / n;
      for (let k = 0; k < n; k++) {
        const x = -W / 2 + 0.07 + dw * (k + 0.5);
        part(g, box(dw - 0.03, h - 0.14, 0.012), shade(c, 0.92), x, h / 2, zf + 0.006, { outline: false });
        part(g, box(0.02, 0.14, 0.03), METAL, x + dw / 2 - 0.07, h * 0.52, zf + 0.02, { outline: false });
        if (/locker/i.test(id)) for (let v = 0; v < 3; v++) part(g, box(dw - 0.12, 0.012, 0.014), shade(c, 0.7), x, h - 0.25 - v * 0.04, zf + 0.012, { outline: false });
      }
      iconOn(g, def, h * 0.78, zf + 0.016, 0.22);
      return;
    }
    // An open case: back, sides, top and plinth, shelves inside and what is kept on them.
    const T = 0.03;
    const inner = W - 0.1 - T * 2;
    part(g, box(W - 0.1, h, 0.02), shade(c, 0.78), 0, h / 2, z - d / 2 + 0.01, { outline: false });
    for (const sx of [-1, 1]) part(g, rbox(T, h, d, 0.008), c, sx * (W / 2 - 0.05 - T / 2), h / 2, z);
    part(g, rbox(W - 0.08, T, d + 0.02, 0.008), c, 0, h - T / 2, z + 0.01);
    part(g, rbox(W - 0.1, 0.08, d, 0.008), shade(c, 0.9), 0, 0.04, z);
    const rows = 4;
    const gap = (h - 0.08 - T) / rows;
    // The same piece always holds the same things: a little hash of its id.
    let seed = [...id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
    const rand = () => ((seed = (seed * 1103515245 + 12345) >>> 0) % 1000) / 1000;
    const spines = ['#c0504d', '#4f81bd', '#9bbb59', '#e8c547', '#8064a2', '#f79646', '#3c6e71', '#6d4c41', '#f5f1e6'];
    const any = () => spines[Math.floor(rand() * spines.length)];
    const what = /wine/i.test(id) ? 'bottles' : /toy/i.test(id) ? 'toys' : /seed|plant|herb|specimen|sample/i.test(id) ? 'jars' : /mail/i.test(id) ? 'slots' : /product|stock|store|parts|donation|supplies|food|gear|hose|kit|med/i.test(id) ? 'boxes' : 'books';
    for (let r = 0; r < rows; r++) {
      const y = 0.08 + r * gap;
      if (r) part(g, box(inner, 0.025, d - 0.03), shade(c, 0.92), 0, y, z + 0.005, { outline: false });
      const floor = y + 0.0125;
      const room = gap - 0.04;
      let x = -inner / 2 + 0.01;
      if (what === 'slots') {
        // Pigeonholes, a letter or two in most.
        const n = Math.max(2, Math.floor(inner / 0.2));
        for (let k = 1; k < n; k++) part(g, box(0.012, room + 0.02, d - 0.04), shade(c, 0.9), -inner / 2 + (inner / n) * k, floor + room / 2, z + 0.005, { outline: false });
        for (let k = 0; k < n; k++) if (rand() > 0.3) part(g, box(inner / n - 0.04, 0.1, 0.01), WHITE, -inner / 2 + (inner / n) * (k + 0.5), floor + 0.05, z + 0.02, { rx: -0.2, outline: false });
        continue;
      }
      while (x < inner / 2 - 0.06) {
        const pick = rand();
        if (what === 'books') {
          if (pick < 0.08 && x < inner / 2 - 0.25) {
            // A little stack lying down.
            for (let k = 0; k < 3; k++) part(g, box(0.2 - k * 0.02, 0.035, d - 0.12), any(), x + 0.1, floor + 0.018 + k * 0.036, z + 0.02, { ry: (rand() - 0.5) * 0.2, outline: false });
            x += 0.24;
            continue;
          }
          if (pick < 0.13 && x < inner / 2 - 0.14) {
            // An ornament: a vase or a little globe.
            part(g, rand() < 0.5 ? cyl(0.04, 0.05, 0.14, 12) : ball(0.06), any(), x + 0.06, floor + 0.07, z + 0.03);
            x += 0.13;
            continue;
          }
          const bw = 0.025 + rand() * 0.035;
          const bh = room * (0.7 + rand() * 0.28);
          const lean = rand() < 0.1 ? 0.15 : 0;
          part(g, box(bw, bh, d - 0.1 - rand() * 0.05), any(), x + bw / 2 + lean * bh * 0.5, floor + bh / 2, z + 0.02, { rz: -lean, outline: false });
          // A band across some spines.
          if (rand() < 0.4) part(g, box(bw + 0.002, 0.012, 0.01), '#f5e6b8', x + bw / 2, floor + bh * 0.8, z + (d - 0.1) / 2 + 0.02, { outline: false });
          x += bw + 0.004 + (lean ? 0.05 : 0);
          if (rand() < 0.07) x += 0.06;
        } else if (what === 'bottles') {
          part(g, cyl(0.035, 0.035, 0.22, 10), rand() < 0.5 ? '#4a148c' : '#1b5e20', x + 0.04, floor + 0.04, z + 0.02, { rx: Math.PI / 2, outline: false });
          x += 0.085;
        } else if (what === 'jars') {
          part(g, cyl(0.05, 0.05, room * 0.6, 12), any(), x + 0.06, floor + room * 0.3, z + 0.02);
          part(g, cyl(0.052, 0.052, 0.02, 12), METAL, x + 0.06, floor + room * 0.6 + 0.01, z + 0.02, { outline: false });
          x += 0.13;
        } else if (what === 'toys') {
          if (pick < 0.5) part(g, ball(0.06), any(), x + 0.07, floor + 0.06, z + 0.03);
          else part(g, rbox(0.11, 0.11, 0.11, 0.02), any(), x + 0.07, floor + 0.055, z + 0.03);
          x += 0.15;
        } else {
          const bw = 0.16 + rand() * 0.12;
          const bh = room * (0.5 + rand() * 0.4);
          if (x + bw > inner / 2 - 0.01) break;
          part(g, rbox(bw, bh, d - 0.1, 0.01), pick < 0.6 ? '#c8a06a' : any(), x + bw / 2, floor + bh / 2, z + 0.02);
          x += bw + 0.02;
        }
      }
    }
  },
  fridge(g, W, D, c, def, _ctx, out) {
    // A side-by-side is as wide as two fridges' doors, not the whole of its two tiles, and taller.
    const pair = W >= 1.5 || /deluxe/i.test(def.id);
    const w = pair ? Math.min(W - 0.12, 1.2) : W - 0.12;
    const d = Math.min(D, 0.75) - 0.08;
    const zb = -D / 2 + 0.04 + d / 2;
    const H = pair ? 1.95 : 1.85;
    // The cabinet: back, sides, top and bottom round an open front, so the inside shows when a door opens.
    const T = 0.04;
    const front = zb + d / 2 - 0.05;
    const back = zb - d / 2;
    part(g, box(w, H, T), c, 0, H / 2, back + T / 2);
    for (const sx of [-1, 1]) part(g, rbox(T, H, d - 0.05, 0.015), c, sx * (w / 2 - T / 2), H / 2, zb - 0.025);
    part(g, rbox(w, T, d - 0.05, 0.015), c, 0, H - T / 2, zb - 0.025);
    part(g, box(w, 0.08, d - 0.05), shade(c, 0.6), 0, 0.04, zb - 0.025, { outline: false });
    const inner = (x0: number, x1: number, y0: number, y1: number, frozen: boolean) => {
      const iw = x1 - x0;
      const cx = (x0 + x1) / 2;
      part(g, box(iw, y1 - y0, 0.01), frozen ? '#e3f2fd' : '#f7fbff', cx, (y0 + y1) / 2, back + T + 0.005, { outline: false });
      for (let y = y0 + 0.3; y < y1 - 0.1; y += 0.3) part(g, box(iw - 0.02, 0.012, d - 0.16), '#dfe9ef', cx, y, zb - 0.02, { outline: false });
      const goods = frozen ? ['#bbdefb', '#e1f5fe', '#b3e5fc'] : ['#ef9a9a', '#fff59d', '#a5d6a7', '#90caf9', '#ffcc80'];
      let k = 0;
      for (let y = y0 + 0.02; y < y1 - 0.25; y += 0.3)
        for (let x = x0 + 0.08; x < x1 - 0.07; x += 0.14 + (k % 2) * 0.03, k++) part(g, rbox(0.1, 0.12 + (k % 3) * 0.03, 0.1, 0.02), goods[k % goods.length], x, y + 0.08 + (k % 3) * 0.015, zb - 0.06 + (k % 2) * 0.05, { outline: false });
    };
    /** A door hinged at x (the hinge side `side`: -1 left, +1 right, seen from the front), `dw` wide, from y0 to y1. */
    const door = (side: number, dw: number, y0: number, y1: number, handleY: number, extra?: (leaf: THREE.Group) => void) => {
      const hinge = new THREE.Group();
      hinge.position.set(side * (w / 2), 0, front);
      hinge.userData.swing = side;
      const leaf = new THREE.Group();
      leaf.position.x = -side * (dw / 2);
      hinge.add(leaf);
      part(leaf, rbox(dw - 0.01, y1 - y0 - 0.01, 0.05, 0.03), c, 0, (y0 + y1) / 2, 0.025);
      // Shelves on the inside of the door.
      for (let y = y0 + 0.25; y < y1 - 0.15; y += 0.35) part(leaf, box(dw - 0.12, 0.08, 0.06), shade(c, 1.05), 0, y, -0.03, { outline: false });
      part(leaf, rbox(0.035, Math.min(0.5, (y1 - y0) * 0.4), 0.04, 0.015), METAL, -side * (dw / 2 - 0.06), handleY, 0.075);
      extra?.(leaf);
      g.add(hinge);
      (out.doors ??= []).push(hinge);
    };
    if (pair) {
      // Side by side: the freezer on the left, the fridge on the right, each door opening outwards
      // from its own side, the handles meeting in the middle; ice and water in the freezer door.
      const half = w / 2;
      inner(-half + T, -0.01, 0.08, H - T, true);
      inner(0.01, half - T, 0.08, H - T, false);
      part(g, box(0.02, H - 0.12, d - 0.06), shade(c, 0.85), 0, H / 2, zb - 0.025, { outline: false });
      door(-1, half, 0.08, H - 0.01, 1.05, (leaf) => {
        part(leaf, rbox(0.22, 0.32, 0.02, 0.02), '#37474f', -0.02, 1.2, 0.055);
        part(leaf, box(0.06, 0.04, 0.03), METAL, -0.02, 1.3, 0.07, { outline: false });
        part(leaf, box(0.16, 0.012, 0.06), '#263238', -0.02, 1.07, 0.075, { outline: false });
      });
      door(1, half, 0.08, H - 0.01, 1.05);
      out.work = marker(g, 0.18, 1.05, front + 0.05);
      return;
    }
    // One door: the freezer above (shut), the fridge below opening from the left hinge.
    inner(-w / 2 + T, w / 2 - T, 0.08, 1.2, false);
    part(g, rbox(w, 0.62, 0.05, 0.03), c, 0, 1.54, front + 0.025);
    part(g, rbox(0.04, 0.3, 0.04, 0.015), METAL, w / 2 - 0.1, 1.45, front + 0.07);
    part(g, box(w - 0.04, 0.012, 0.01), shade(c, 0.75), 0, 1.225, front + 0.05, { outline: false });
    door(-1, w, 0.08, 1.22, 0.98);
    out.work = marker(g, w / 2 - 0.12, 1.0, front + 0.05);
  },
  stove(g, W, D, c, def, _ctx, out) {
    if (def.id === 'fireplace') {
      part(g, rbox(W - 0.1, 1.2, Math.min(D, 0.6), 0.03), '#b5654a', 0, 0.6, -D / 2 + 0.3);
      part(g, rbox(W - 0.6, 0.6, 0.1, 0.02), '#2b1d16', 0, 0.42, -D / 2 + 0.58);
      part(g, rbox(W, 0.08, Math.min(D, 0.6) + 0.1, 0.02), WHITE, 0, 1.24, -D / 2 + 0.3);
      const fire = new THREE.Mesh(ball(0.16), new THREE.MeshBasicMaterial({ color: '#ff9a3c' }));
      fire.userData.ownMaterial = true;
      fire.position.set(0, 0.3, -D / 2 + 0.5);
      fire.scale.set(1.6, 1, 0.6);
      g.add(fire);
      out.glow = fire;
      return;
    }
    if (def.id === 'grill') {
      for (const sx of [-1, 1]) part(g, cyl(0.02, 0.02, 0.8, 6), DARK, sx * 0.22, 0.4, 0);
      part(g, rbox(0.62, 0.3, 0.45, 0.12), c, 0, 0.9, 0);
      return;
    }
    part(g, rbox(W - 0.06, 0.88, D - 0.1, 0.02), c, 0, 0.44, 0);
    part(g, box(W - 0.06, 0.03, D - 0.1), DARK, 0, 0.895, 0, { outline: false });
    for (const [x, z] of [[-0.18, -0.15], [0.18, -0.15], [-0.18, 0.15], [0.18, 0.15]]) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 6, 18), toon('#222'));
      r.userData.ownGeometry = true;
      r.rotation.x = -Math.PI / 2;
      r.position.set(x * Math.min(1, W), 0.915, z * Math.min(1, D));
      g.add(r);
    }
    part(g, box(W - 0.2, 0.42, 0.01), shade(c, 0.6), 0, 0.42, D / 2 - 0.045, { outline: false });
    part(g, box(W - 0.3, 0.025, 0.04), METAL, 0, 0.7, D / 2 - 0.02, { outline: false });
    // A pan on the front burner and a pot behind, while something's cooking.
    const pan = new THREE.Group();
    pan.position.set(-0.18 * Math.min(1, W), 0.93, 0.17 * Math.min(1, D));
    part(pan, cyl(0.13, 0.11, 0.05, 18), '#37383d', 0, 0.025, 0);
    part(pan, cyl(0.11, 0.11, 0.012, 18), '#e0a050', 0, 0.045, 0, { outline: false });
    part(pan, box(0.03, 0.02, 0.2), '#2b2b2b', 0.2, 0.04, 0.05, { ry: -0.6, outline: false });
    part(pan, cyl(0.1, 0.1, 0.16, 16), '#b0b6bb', 0.36, 0.08, -0.3);
    g.add(pan);
    out.inUse = pan;
    out.work = marker(g, -0.1, 0.98, 0.2 * Math.min(1, D));
  },
  sink(g, W, D, c, def, _ctx, out) {
    if (/kitchen|darkroom|shampoo/i.test(def.id)) {
      B.counter(g, W, D, c, { ...def, id: 'kitchenCounter' }, { againstWall: false }, { root: g, body: new THREE.Box3() });
      // The basin near the front, where someone at the counter can reach into it.
      part(g, box(0.5, 0.02, 0.34), '#cfd8dc', 0, 0.912, 0.1, { outline: false });
      out.work = marker(g, 0, 0.94, 0.2);
    } else {
      out.work = marker(g, 0, 0.9, -0.02);
      part(g, cyl(0.07, 0.1, 0.78, 12), WHITE, 0, 0.39, -0.12);
      part(g, rbox(0.56, 0.16, 0.44, 0.08), WHITE, 0, 0.82, -0.08);
      part(g, rbox(0.42, 0.6, 0.03, 0.02), '#d9eef7', 0, 1.45, -D / 2 + 0.1);
    }
    part(g, cyl(0.015, 0.015, 0.2, 6), METAL, 0, 1.0, -D / 2 + 0.16, { outline: false });
    part(g, cyl(0.012, 0.012, 0.14, 6), METAL, 0, 1.08, -D / 2 + 0.22, { rx: Math.PI / 2, outline: false });
  },
  toilet(g, _W, D, c, def, _ctx, out) {
    const k = def.id === 'pottyChair' ? 0.6 : 1;
    part(g, rbox(0.36 * k, 0.4 * k, 0.5 * k, 0.12 * k), WHITE, 0, 0.2 * k, -0.06);
    part(g, rbox(0.42 * k, 0.05, 0.52 * k, 0.05), c === '#ffffff' ? '#e8eef0' : c, 0, 0.425 * k, -0.04);
    if (k === 1) part(g, rbox(0.46, 0.4, 0.2, 0.04), WHITE, 0, 0.64, -D / 2 + 0.12);
    out.seat = marker(g, 0, 0.45 * k, -0.02);
  },
  shower(g, W, D, c) {
    part(g, rbox(W - 0.04, 0.08, D - 0.04, 0.03), WHITE, 0, 0.04, 0);
    const glass = new THREE.Mesh(box(W - 0.06, 2.0, 0.02), new THREE.MeshToonMaterial({ color: '#cfeefa', transparent: true, opacity: 0.3, depthWrite: false }));
    glass.userData.ownMaterial = true;
    glass.position.set(0, 1.05, D / 2 - 0.04);
    g.add(glass);
    part(g, cyl(0.015, 0.015, 1.9, 6), METAL, -W / 2 + 0.12, 1.0, -D / 2 + 0.1, { outline: false });
    part(g, cyl(0.1, 0.06, 0.04, 14), METAL, -W / 2 + 0.22, 1.95, -D / 2 + 0.14, { outline: false });
    part(g, box(0.02, 2.0, D - 0.08), tint(c, 0.4), W / 2 - 0.03, 1.05, 0, { outline: false });
  },
  bathtub(g, W, D, c) {
    part(g, rbox(W - 0.1, 0.55, D - 0.1, 0.12), WHITE, 0, 0.275, 0);
    const water = new THREE.Mesh(box(W - 0.26, 0.02, D - 0.26), toon('#9fd6ee'));
    water.position.y = 0.46;
    g.add(water);
    part(g, cyl(0.02, 0.02, 0.18, 6), METAL, 0, 0.62, -D / 2 + 0.1, { outline: false });
    void c;
  },
  lamp(g, _W, _D, c, def, _ctx, out) {
    const tall = !/studio/i.test(def.id);
    part(g, cyl(0.16, 0.18, 0.04, 16), DARK, 0, 0.02, 0);
    part(g, cyl(0.018, 0.018, tall ? 1.4 : 1.6, 8), DARK, 0, (tall ? 1.4 : 1.6) / 2, 0, { outline: false });
    part(g, cyl(0.16, 0.24, 0.3, 18), tall ? '#ffe9b0' : DARK, 0, tall ? 1.5 : 1.65, 0);
    if (tall) {
      const bulb = new THREE.Mesh(ball(0.09), new THREE.MeshBasicMaterial({ color: '#fff3c4' }));
      bulb.userData.ownMaterial = true;
      bulb.position.y = 1.42;
      g.add(bulb);
      out.glow = bulb;
    }
    void c;
  },
  plant(g, _W, _D, c, _def, _ctx, out) {
    part(g, cyl(0.16, 0.12, 0.3, 14), '#c46b4c', 0, 0.15, 0);
    const leaves = new THREE.Group();
    leaves.position.y = 0.3;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      part(leaves, ball(0.14), i % 2 ? '#5fa85a' : '#77bf65', Math.cos(a) * 0.1, 0.2 + (i % 3) * 0.08, Math.sin(a) * 0.1);
    }
    if (c && !/^#(5|6|7|8)/.test(c)) part(leaves, ball(0.06), c, 0.05, 0.42, 0.06);
    g.add(leaves);
    out.growth = leaves;
  },
  tree(g) {
    part(g, cyl(0.1, 0.14, 1.6, 10), '#8a5a36', 0, 0.8, 0);
    part(g, ball(0.75), '#6fb85a', 0, 2.1, 0);
    part(g, ball(0.55), '#7dc566', 0.35, 2.5, 0.2);
    part(g, ball(0.5), '#5ea64e', -0.35, 2.4, -0.15);
  },
  bush(g) {
    part(g, ball(0.38), '#6fb85a', 0, 0.3, 0);
    part(g, ball(0.28), '#7dc566', 0.22, 0.38, 0.1);
    part(g, ball(0.26), '#5ea64e', -0.2, 0.34, -0.08);
  },
  garden(g, W, D, _c, _def, _ctx, out) {
    part(g, rbox(W - 0.06, 0.22, D - 0.06, 0.03), WOOD, 0, 0.11, 0);
    part(g, box(W - 0.2, 0.02, D - 0.2), '#6d4c35', 0, 0.225, 0, { outline: false });
    const crops = new THREE.Group();
    crops.position.y = 0.23;
    for (let x = -W / 2 + 0.3; x < W / 2 - 0.1; x += 0.4) for (let z = -D / 2 + 0.3; z < D / 2 - 0.1; z += 0.4) part(crops, ball(0.11), '#7cc46a', x, 0.08, z);
    g.add(crops);
    out.growth = crops;
  },
  easel(g, _W, _D, c) {
    part(g, cyl(0.02, 0.02, 1.6, 6), WOOD, -0.25, 0.78, 0.08, { rz: 0.15, rx: -0.1, outline: false });
    part(g, cyl(0.02, 0.02, 1.6, 6), WOOD, 0.25, 0.78, 0.08, { rz: -0.15, rx: -0.1, outline: false });
    part(g, cyl(0.02, 0.02, 1.6, 6), WOOD, 0, 0.75, -0.25, { rx: 0.3, outline: false });
    part(g, rbox(0.62, 0.5, 0.03, 0.01), WHITE, 0, 1.15, 0.02, { rx: -0.1 });
    part(g, box(0.4, 0.3, 0.01), tint(c, 0.3), 0, 1.15, 0.04, { rx: -0.1, outline: false });
  },
  piano(g, W, D, c, _def, _ctx, out) {
    const d = Math.min(D, 0.6);
    part(g, rbox(W - 0.2, 1.25, d, 0.03), c === '#ffffff' ? DARK : c, 0, 0.625, -D / 2 + d / 2);
    part(g, rbox(W - 0.3, 0.08, 0.28, 0.02), WHITE, 0, 0.74, -D / 2 + d + 0.08);
    for (let x = -W / 2 + 0.25; x < W / 2 - 0.2; x += 0.07) part(g, box(0.025, 0.02, 0.12), DARK, x, 0.785, -D / 2 + d + 0.02, { outline: false });
    // The bench, out in front where the player sits.
    const z = -D / 2 + d + 0.62;
    part(g, rbox(Math.min(W - 0.6, 0.9), 0.46, 0.34, 0.03), shade(c, 0.9), 0, 0.23, z);
    out.seat = marker(g, 0, 0.47, z);
    out.work = marker(g, 0, 0.8, -D / 2 + d + 0.12);
  },
  instrument(g, _W, _D, c, def) {
    part(g, cyl(0.015, 0.015, 0.6, 6), DARK, 0, 0.3, -0.1, { rx: 0.2, outline: false });
    const v = /violin/i.test(def.id);
    part(g, ball(v ? 0.12 : 0.2), c, 0, v ? 0.75 : 0.5, 0, { outline: true });
    part(g, rbox(0.05, v ? 0.35 : 0.55, 0.03, 0.01), shade(c, 0.6), 0, v ? 1.0 : 0.95, 0);
  },
  mic(g, _W, _D, c) {
    part(g, cyl(0.15, 0.17, 0.03, 14), DARK, 0, 0.015, 0);
    part(g, cyl(0.015, 0.015, 1.45, 6), METAL, 0, 0.72, 0, { outline: false });
    part(g, cyl(0.04, 0.03, 0.12, 10), c, 0, 1.5, 0.02, { rx: 0.4 });
  },
  vehicle(g, W, D, c, def) {
    const long = D > W;
    const L = (long ? D : W) - 0.2;
    const Wd = (long ? W : D) - 0.25;
    const g2 = new THREE.Group();
    if (!long) g2.rotation.y = Math.PI / 2;
    g.add(g2);
    if (/scooter|bike/i.test(def.id)) {
      part(g2, rbox(0.3, 0.3, 0.9, 0.1), c, 0, 0.45, 0);
      for (const z of [-0.35, 0.35]) part(g2, cyl(0.18, 0.18, 0.08, 14), DARK, 0, 0.18, z, { rz: Math.PI / 2 });
      return;
    }
    part(g2, rbox(Wd, 0.55, L, 0.12), c, 0, 0.55, 0);
    part(g2, rbox(Wd - 0.15, 0.5, L * 0.5, 0.12), tint(c, 0.1), 0, 1.05, -L * 0.05);
    part(g2, box(Wd - 0.12, 0.34, L * 0.5 - 0.1), '#9cc9e6', 0, 1.07, -L * 0.05, { outline: false });
    for (const sx of [-1, 1]) for (const z of [-L / 2 + 0.45, L / 2 - 0.45]) part(g2, cyl(0.3, 0.3, 0.2, 18), DARK, sx * (Wd / 2 - 0.05), 0.3, z, { rz: Math.PI / 2 });
  },
  platform(g, W, D, c) {
    part(g, rbox(W - 0.04, 0.12, D - 0.04, 0.03), c, 0, 0.06, 0);
  },
  water(g, W, D, _c, def) {
    const pool = /pool/i.test(def.id);
    part(g, rbox(W - 0.04, 0.12, D - 0.04, pool ? 0.04 : 0.5), pool ? '#e6e1d6' : '#8a7356', 0, 0.06, 0);
    const w = new THREE.Mesh(box(W - 0.3, 0.02, D - 0.3), toon(pool ? '#6cc7ea' : '#5aa6c9'));
    w.position.y = 0.11;
    g.add(w);
  },
  stairs(g, W, D, c) {
    // From the foot (the +z end) up to the middle of the top tile, where the landing upstairs
    // begins: the same climb dwellers are lifted through (lot3d.ts stairHeight).
    // Risers of about 18 cm, from the floor to the floor above.
    const steps = Math.round(FLOOR_H / 0.18);
    const runAll = D - 0.5;
    const run = runAll / steps;
    const rise = FLOOR_H / steps;
    for (let i = 0; i < steps; i++) part(g, box(W - 0.1, rise * (i + 1), run), i % 2 ? c : shade(c, 0.92), 0, (rise * (i + 1)) / 2, D / 2 - run * (i + 0.5), { outline: i === steps - 1 });
    part(g, box(W - 0.1, FLOOR_H, 0.5), shade(c, 0.85), 0, FLOOR_H / 2, -D / 2 + 0.25, { outline: false });
    const slope = Math.atan2(FLOOR_H, runAll);
    for (const sx of [-1, 1]) part(g, box(0.05, 0.05, Math.hypot(FLOOR_H, runAll)), WOOD, sx * (W / 2 - 0.04), FLOOR_H / 2 + 0.9, D / 2 - runAll / 2, { rx: slope, outline: false });
  },
  camera(g, W, D, c, def, _ctx, out) {
    // Used from the front (+z), so it looks away from there: the lens points back (-z) and the
    // screen or viewfinder faces whoever stands behind it, at their eye height.
    const movie = def.id === 'movieCamera';
    const lecture = def.id === 'lectureCamera';
    const top = movie ? 1.3 : 1.32;
    if (movie) {
      // On a wheeled pedestal.
      part(g, cyl(0.28, 0.32, 0.12, 18), DARK, 0, 0.12, 0);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        part(g, cyl(0.05, 0.05, 0.04, 10), BLACK_WHEEL, Math.sin(a) * 0.28, 0.05, Math.cos(a) * 0.28, { rz: Math.PI / 2, ry: a });
      }
      part(g, cyl(0.06, 0.06, top - 0.3, 10), METAL, 0, (top + 0.1) / 2, 0, { outline: false });
    } else {
      // A tripod: three legs from the head out to feet on the floor, a centre column with its
      // brace to the legs, and the pan handle out the back.
      const hub = top - 0.22;
      const feet: THREE.Vector3[] = [];
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + Math.PI;
        const foot = new THREE.Vector3(Math.sin(a) * 0.36, 0, Math.cos(a) * 0.36);
        feet.push(foot);
        const knee = new THREE.Vector3(Math.sin(a) * 0.04, hub, Math.cos(a) * 0.04);
        rod(g, knee, foot, 0.013, DARK);
        part(g, cyl(0.018, 0.022, 0.03, 8), BLACK_WHEEL, foot.x, 0.015, foot.z, { outline: false });
        rod(g, new THREE.Vector3(0, hub * 0.45, 0), knee.clone().lerp(foot, 0.55), 0.007, METAL);
      }
      part(g, cyl(0.045, 0.04, 0.06, 10), DARK, 0, hub, 0, { outline: false });
      part(g, cyl(0.014, 0.014, hub - 0.4, 8), METAL, 0, (hub + hub * 0.45) / 2, 0, { outline: false });
      part(g, cyl(0.018, 0.018, top - hub, 8), DARK, 0, (hub + top) / 2, 0, { outline: false });
      rod(g, new THREE.Vector3(0, top - 0.02, 0.02), new THREE.Vector3(0.05, top - 0.12, 0.3), 0.01, DARK);
    }
    const head = new THREE.Group();
    head.position.set(0, top, 0);
    g.add(head);
    const bw = movie ? 0.26 : 0.16;
    const bh = movie ? 0.26 : 0.12;
    const bd = movie ? 0.42 : 0.12;
    part(head, rbox(bw, bh, bd, 0.025), movie ? DARK : c, 0, bh / 2 + 0.02, 0);
    // The lens, out the back.
    part(head, cyl(movie ? 0.08 : 0.045, movie ? 0.09 : 0.05, movie ? 0.22 : 0.12, 16), BLACK_WHEEL, 0, bh / 2 + 0.02, -bd / 2 - (movie ? 0.11 : 0.06), { rx: Math.PI / 2 });
    part(head, cyl(movie ? 0.07 : 0.035, movie ? 0.07 : 0.035, 0.005, 16), '#4fc3f7', 0, bh / 2 + 0.02, -bd / 2 - (movie ? 0.222 : 0.122), { rx: Math.PI / 2, outline: false });
    if (movie) {
      // A matte box on the lens, a side monitor and the handles to steer it by.
      part(head, rbox(0.24, 0.18, 0.06, 0.01), DARK, 0, bh / 2 + 0.02, -bd / 2 - 0.25);
      part(head, rbox(0.2, 0.14, 0.03, 0.01), DARK, 0.2, bh + 0.08, bd / 2 - 0.05, { ry: -0.5 });
      const s = screenMesh(0.17, 0.11);
      s.position.set(0.2 + 0.008, top + bh + 0.08, bd / 2 - 0.035);
      s.rotation.y = -0.5;
      g.add(s);
      out.screen = s;
      for (const sx of [-1, 1]) part(head, cyl(0.015, 0.015, 0.3, 6), METAL, sx * 0.18, 0.05, bd / 2 + 0.05, { rx: Math.PI / 2 - 0.4, outline: false });
    } else {
      // The screen on its back, towards the photographer.
      const s = screenMesh(bw - 0.04, bh - 0.04);
      s.position.set(0, top + bh / 2 + 0.02, bd / 2 + 0.011);
      g.add(s);
      out.screen = s;
      part(head, rbox(0.04, 0.03, 0.04, 0.01), DARK, 0, bh + 0.035, 0);
    }
    if (lecture) {
      // A ring light beside it on its own stand.
      part(g, cyl(0.012, 0.012, 1.45, 6), DARK, 0.32, 0.72, 0.05, { outline: false });
      part(g, new THREE.TorusGeometry(0.16, 0.025, 8, 24), '#fffde7', 0.32, 1.5, 0.05, {});
    }
    out.work = marker(g, 0, top + bh / 2 + 0.02, bd / 2 + 0.02);
    void W;
    void D;
  },
  telescope(g, _W, _D, c, def, _ctx, out) {
    if (def.id === 'microscope') {
      part(g, rbox(0.2, 0.04, 0.25, 0.02), DARK, 0, 0.02, 0);
      part(g, cyl(0.04, 0.04, 0.32, 10), c, 0, 0.2, -0.04, { rx: 0.25 });
      return;
    }
    // On a tripod, the tube tilted up to the sky, its eyepiece at the back where the user stands.
    const hub = 1.05;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI;
      rod(g, new THREE.Vector3(Math.sin(a) * 0.03, hub, Math.cos(a) * 0.03), new THREE.Vector3(Math.sin(a) * 0.32, 0, Math.cos(a) * 0.32), 0.014, DARK);
    }
    part(g, cyl(0.05, 0.05, 0.08, 10), DARK, 0, hub + 0.02, 0, { outline: false });
    part(g, cyl(0.07, 0.09, 0.9, 14), c, 0, 1.25, -0.1, { rx: -0.9 });
    part(g, cyl(0.02, 0.025, 0.08, 10), DARK, 0, 1.05, 0.25, { rx: -0.9 });
    out.work = marker(g, 0, 1.2, 0.25);
  },
  tank(g, W, D, c) {
    part(g, rbox(W - 0.1, 0.7, Math.min(D, 0.5), 0.02), WOOD, 0, 0.35, -D / 2 + 0.28);
    const glass = new THREE.Mesh(box(W - 0.2, 0.55, Math.min(D, 0.5) - 0.06), new THREE.MeshToonMaterial({ color: '#7fd0f0', transparent: true, opacity: 0.55, depthWrite: false }));
    glass.userData.ownMaterial = true;
    glass.position.set(0, 0.98, -D / 2 + 0.28);
    g.add(glass);
    for (let i = 0; i < 3; i++) part(g, ball(0.04), i % 2 ? '#ff8a65' : c, -0.3 + i * 0.3, 0.95 + (i % 2) * 0.1, -D / 2 + 0.28, { outline: false });
  },
  frame(g, W, D, c, def, _ctx, out) {
    if (/treadmill/i.test(def.id)) {
      // The deck with its belt between rails, the motor hood at the head, two uprights up to the
      // console, and handrails along the sides at a walker's hand height.
      const L = D - 0.15;
      const head = -L / 2;
      const run = L - 0.42;
      part(g, rbox(0.78, 0.12, L, 0.03), DARK, 0, 0.08, 0.02);
      for (const sx of [-1, 1]) part(g, rbox(0.1, 0.05, L - 0.1, 0.02), shade(c, 0.75), sx * 0.34, 0.165, 0.05);
      part(g, box(0.56, 0.012, run), '#26272b', 0, 0.15, head + 0.29 + run / 2, { outline: false });
      const slats: THREE.Object3D[] = [];
      for (let k = 0; k < 14; k++) slats.push(part(g, box(0.54, 0.004, 0.02), '#4a4b52', 0, 0.158, head + 0.29 + (k * run) / 14, { outline: false }));
      // The belt runs back under the walker's feet.
      out.animate = (t) => slats.forEach((m, k) => (m.position.z = head + 0.29 + ((((k * run) / 14 + t * 1.3) % run) + run) % run));
      part(g, rbox(0.78, 0.22, 0.3, 0.06), shade(c, 0.85), 0, 0.15, head + 0.14);
      for (const sx of [-1, 1]) {
        part(g, rbox(0.05, 1.15, 0.06, 0.02), METAL, sx * 0.33, 0.72, head + 0.14, { rx: 0.18 });
        part(g, cyl(0.022, 0.022, 0.6, 8), '#e0e0e0', sx * 0.33, 1.02, head + 0.55, { rx: Math.PI / 2, outline: false });
      }
      part(g, rbox(0.7, 0.24, 0.16, 0.04), c, 0, 1.28, head + 0.05, { rx: -0.5 });
      const s = screenMesh(0.3, 0.12);
      s.position.set(0, 1.31, head + 0.13);
      s.rotation.x = -0.5;
      g.add(s);
      out.screen = s;
      return;
    }
    if (/mannequin|dummy|anatomy/i.test(def.id)) {
      part(g, cyl(0.15, 0.17, 0.04, 12), DARK, 0, 0.02, 0);
      part(g, cyl(0.02, 0.02, 0.8, 6), METAL, 0, 0.4, 0, { outline: false });
      part(g, rbox(0.4, 0.6, 0.24, 0.1), c, 0, 1.1, 0);
      part(g, ball(0.12), tint(c, 0.4), 0, 1.55, 0);
      return;
    }
    if (/flag/i.test(def.id)) {
      part(g, cyl(0.025, 0.03, 2.4, 8), METAL, 0, 1.2, 0, { outline: false });
      const flag = new THREE.Mesh(box(0.7, 0.46, 0.01), toon('#ffffff'));
      flag.position.set(0.37, 2.1, 0);
      g.add(flag);
      // The Korean flag's red and blue in the middle (the trigrams left out at this size).
      part(g, cyl(0.1, 0.1, 0.012, 16), '#cd2e3a', 0.37, 2.13, 0.006, { rx: Math.PI / 2, outline: false });
      part(g, cyl(0.1, 0.1, 0.013, 16), '#0047a0', 0.37, 2.07, 0.006, { rx: Math.PI / 2, outline: false });
      return;
    }
    if (/wardrobe/i.test(def.id)) {
      for (const sx of [-1, 1]) part(g, cyl(0.02, 0.02, 1.6, 6), METAL, sx * (W / 2 - 0.15), 0.8, 0, { outline: false });
      part(g, cyl(0.02, 0.02, W - 0.3, 6), METAL, 0, 1.6, 0, { rz: Math.PI / 2, outline: false });
      for (let i = 0; i < 5; i++) part(g, rbox(0.1, 0.8, 0.4, 0.04), ['#e57373', '#64b5f6', '#81c784', '#ffd54f', '#ba68c8'][i], -W / 2 + 0.4 + i * ((W - 0.8) / 4), 1.15, 0);
      return;
    }
    if (/climbing/i.test(def.id)) {
      part(g, rbox(W - 0.1, 2.8, 0.2, 0.03), '#b0bec5', 0, 1.4, -D / 2 + 0.12);
      for (let i = 0; i < 14; i++) part(g, ball(0.05), ['#e57373', '#ffd54f', '#64b5f6', '#81c784'][i % 4], -W / 2 + 0.3 + ((i * 0.37) % (W - 0.6)), 0.3 + ((i * 0.61) % 2.3), -D / 2 + 0.24, { outline: false });
      return;
    }
    const h = /barre/i.test(def.id) ? 1.0 : /pullUp/i.test(def.id) ? 2.2 : 1.6;
    for (const sx of [-1, 1]) part(g, cyl(0.03, 0.03, h, 8), c, sx * (W / 2 - 0.1), h / 2, 0, { outline: false });
    part(g, cyl(0.025, 0.025, W - 0.2, 8), METAL, 0, h, 0, { rz: Math.PI / 2, outline: false });
    if (/monkey/i.test(def.id)) for (let x = -W / 2 + 0.3; x < W / 2 - 0.2; x += 0.3) part(g, cyl(0.02, 0.02, D - 0.2, 6), METAL, x, h, 0, { rx: Math.PI / 2, outline: false });
  },
  crate(g, W, D, c, def) {
    const h = /mailbox/.test(def.id) ? 1.1 : 0.5;
    part(g, rbox(Math.min(W, 0.8) - 0.1, h, Math.min(D, 0.6) - 0.1, 0.04), c, 0, h / 2, 0);
    iconOn(g, def, h / 2, Math.min(D, 0.6) / 2 - 0.045, 0.3);
  },
  cake(g, _W, _D, c) {
    legs(g, 0.7, 0.7, 0.7, WOOD, 0.05, 0.025);
    part(g, rbox(0.8, 0.04, 0.8, 0.02), WOOD, 0, 0.72, 0);
    part(g, cyl(0.2, 0.2, 0.18, 20), tint(c, 0.4), 0, 0.83, 0);
    part(g, cyl(0.012, 0.012, 0.08, 6), '#ffeb3b', 0, 0.96, 0, { outline: false });
  },
  alarm(g, _W, D, _c, _def, ctx) {
    const y = ctx.againstWall ? 2.6 : 2.85;
    part(g, cyl(0.08, 0.08, 0.04, 14), WHITE, 0, y, ctx.againstWall ? -D / 2 + 0.025 : 0, ctx.againstWall ? { rx: Math.PI / 2 } : {});
  },
  mailbox(g, _W, _D, c) {
    part(g, cyl(0.03, 0.03, 1.0, 8), WOOD, 0, 0.5, 0, { outline: false });
    part(g, rbox(0.24, 0.24, 0.42, 0.1), c, 0, 1.08, 0);
    part(g, box(0.02, 0.14, 0.04), '#e53935', 0.13, 1.18, 0.1, { outline: false });
  },
  podium(g, W, D, c, def) {
    const w = Math.min(W - 0.2, def.w > 1 ? W - 0.3 : 0.6);
    part(g, rbox(w, 1.1, Math.min(D, 0.5), 0.03), c, 0, 0.55, -D / 2 + 0.3);
    part(g, rbox(w + 0.06, 0.05, Math.min(D, 0.5) + 0.06, 0.02), shade(c, 0.8), 0, 1.12, -D / 2 + 0.3, { rx: 0.15 });
    iconOn(g, def, 0.7, -D / 2 + 0.3 + Math.min(D, 0.5) / 2 + 0.01, 0.3);
  },
  machine(g, W, D, c, def) {
    const h = W * D >= 4 ? 1.3 : 1.05;
    part(g, rbox(W - 0.12, h, D - 0.16, 0.05), c, 0, h / 2, 0);
    part(g, rbox(W - 0.3, 0.12, 0.05, 0.02), shade(c, 0.7), 0, h - 0.18, D / 2 - 0.08);
    iconOn(g, def, h * 0.5, D / 2 - 0.075, Math.min(0.45, W * 0.45));
  },
};

/** Builds a piece of furniture in its own frame. */
export function buildFurniture(given: ObjectDef, ctx: BuildCtx): Built {
  const def = lookDef(given);
  const root = new THREE.Group();
  root.name = def.id;
  const out: Built = { root, body: new THREE.Box3() };
  // A piece drawn on its own, else its family's shape (aquariums and tanks all share the tank's).
  const own = RUG_DETAIL[def.id] ?? CLEANING_DETAIL[def.id] ?? WORKPLACE_DETAIL[def.id] ?? HOME_DETAIL[def.id] ?? DETAIL[def.id] ?? SHOP_DETAIL[def.id] ?? SET_DETAIL[def.id] ?? SPACE_DETAIL[def.id] ?? (kindOf(def) === 'tank' ? DETAIL.tank : kindOf(def) === 'bathtub' ? DETAIL.bathtub : kindOf(def) === 'platform' ? PLATFORMS[platformOf(def.id)] : kindOf(def) === 'vehicle' ? vehicle : undefined);
  // The size and colour are the piece's own; only the way it's drawn is `lookOf`'s (a rug's weave).
  (own ?? B[kindOf(def)])(root, given.w, given.h, given.color, def, ctx, out);
  // The solid part: all but a desk's chair (out over its front) and what only shows in use.
  root.updateMatrixWorld(true);
  for (const c of root.children) {
    if (c === out.inUse || (c.type === 'Group' && c.position.z > def.h / 2 - 0.2)) continue;
    if ((c as THREE.Mesh).isMesh || c.type === 'Group') out.body.expandByObject(c, false);
  }
  if (out.body.isEmpty()) out.body.set(new THREE.Vector3(-def.w / 2, 0, -def.h / 2), new THREE.Vector3(def.w / 2, 1, def.h / 2));
  return out;
}
