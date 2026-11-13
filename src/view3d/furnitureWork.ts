import * as THREE from 'three';
import { DARK, METAL, WHITE, WOOD, deskChair, legs, marker, screenMesh, shade, tint, type Builder, type Built } from './parts';
import { ball, box, cyl, part, rbox, toon } from './toon';
import type { HouseKind } from './furniture3d';

/**
 * The equipment families (docs/3d/01-view.md §3): the coffee machines, music, office, kitchen,
 * clinic and workshop machines, scanners, booths, carts, belts, simulators and vehicles that the
 * workplaces are full of, each in a shape you'd know it by rather than a box with its icon on.
 * Built like the household families: facing 'down' (front to +z), centred on the footprint.
 */
export type WorkKind = 'coffee' | 'audio' | 'appliance' | 'scanner' | 'booth' | 'cart' | 'conveyor' | 'simulator' | 'transport' | 'prop';

/** Ids to a family: these come before the household rules (furniture3d.ts), as they're exact. */
export const WORK_RULES: Array<[RegExp, WorkKind | HouseKind]> = [
  [/^(coffeeMaker|espressoMachine|beanRoaster)$/, 'coffee'],
  [/^(stereo|clubSpeaker)$/, 'audio'],
  [/^(copier|largePrinter|sterilizer|fryer|herbDecoctor|lensEdger|centrifugeUnit|analyzerMachine|skinAnalyzer|sewingMachine|parcelScale|deliveryPOS|orderTablet|waterSensor|leakDetector|inspectionRig|boilerUnit|testRig|tableSaw|tileSaw|balloonLauncher|cableReel)$/, 'appliance'],
  [/^(xrayMachine|ctScanner|mriScanner|linacMachine|baggageXray)$/, 'scanner'],
  [/^(fittingRoom|radioBooth|visitBooth|examBooth|consultBooth|callBooth|dubbingBooth|onAirBooth|interpretBooth|playtestBooth|weldingBooth)$/, 'booth'],
  [/^(luggageCart|mealCart|cosmeticCart|parcelCage|wheelbarrow|lawnMower)$/, 'cart'],
  [/^(conveyorBelt|recycleSorter)$/, 'conveyor'],
  [/^(drivingSim|flightSimulator|trainSimulator|shipBridge|spacecraftMockup|cabinMockup|elevatorMockup|centrifuge|windTunnel)$/, 'simulator'],
  [/^(rocketShip|teamBus|youthBus|cityBus|tourBus|taxiCab|ambulance|patrolBoat|cargoTender|fishingBoat|subwayTrain)$/, 'transport'],
  [/^(vaultDoor|trafficCone|materialPile|steelPlates|urn|ceremonyArch|fireWatchTower|thinningSite|shellLine|evacSlide|mockWall|scriptStand|exerciseBall|reformer|diveSpot|bulteok|artPedestal)$/, 'prop'],
  // Not a bed for sleeping in: pots of saplings.
  [/^saplingBed$/, 'garden'],
  // Workplace things that are one of the household families in another guise.
  [/^(minibar|drinkCooler)$/, 'fridge'],
  [/^(foodStorage|rescueGear|mailSorter)$/, 'shelf'],
  [/^(frameDisplay|servingLine|adaptiveKitchen|fishAuction|harvestNet)$/, 'counter'],
  [/^washBay$/, 'sink'],
  [/^bulkCooker$/, 'stove'],
  [/^(businessBoardGame|weddingConsult|decorSample)$/, 'table'],
  [/^(situationWall|forecastWall)$/, 'tv'],
  [/^(eyeTestChart|travelMap|xrayViewer|alarmPanel|trailSign)$/, 'board'],
  [/^flashWall$/, 'art'],
  [/^burglarAlarm$/, 'alarm'],
  [/^(cctvConsole|missionConsole|controlPanel|radarConsole|securityMonitor|cargoPlanner)$/, 'computer'],
  [/^(patrolLog|crisisPhone)$/, 'desk'],
  // Sat at on their own chair (furnitureShop.ts): drawing at the board, making up at the mirror, eating to the camera.
  [/^(draftingTable|makeupStation|mukbangTable)$/, 'desk'],
  [/^(walkingRail|parallelBars|spacesuitDisplay|cprManikin)$/, 'frame'],
  [/^(storyCorner|napMats|storyRug)$/, 'platform'],
  [/^crewGate$/, 'podium'],
  [/^(kennel|safetyDemoKit)$/, 'crate'],
];

const GLASS = new THREE.MeshToonMaterial({ color: '#cfeefa', transparent: true, opacity: 0.35, depthWrite: false });
const STEEL = '#c3cad0';
const GLASS_DARK = '#37474f';
const BLACK = '#2b2b30';
const glass = (g: THREE.Object3D, geom: THREE.BufferGeometry, x: number, y: number, z: number) => {
  const m = new THREE.Mesh(geom, GLASS);
  m.position.set(x, y, z);
  g.add(m);
  return m;
};
/** A screen that lights while it's used (only the first one made is lit). */
const screen = (g: THREE.Object3D, out: Built, w: number, h: number, x: number, y: number, z: number, rx = 0) => {
  const s = screenMesh(w, h);
  s.position.set(x, y, z);
  s.rotation.x = rx;
  g.add(s);
  out.screen ??= s;
  return s;
};
const wheel = (g: THREE.Object3D, r: number, w: number, x: number, y: number, z: number) => part(g, cyl(r, r, w, 14), BLACK, x, y, z, { rz: Math.PI / 2 });
/** A plain stand at counter height for a machine that sits on top. */
const stand = (g: THREE.Object3D, w: number, d: number, z: number, color = shade(WOOD, 0.9), h = 0.86) => {
  part(g, rbox(w, h, d, 0.02), color, 0, h / 2, z);
  part(g, box(w - 0.06, 0.012, 0.01), shade(color, 0.7), 0, h - 0.18, z + d / 2 + 0.003, { outline: false });
  return h;
};

export const WORK_BUILDERS: Record<WorkKind, Builder> = {
  coffee(g, W, D, c, def, _ctx, out) {
    // On its own counter: the machine at the back, cups by it.
    const d = Math.min(D, 0.6);
    const z = -D / 2 + d / 2 + 0.02;
    const top = stand(g, Math.min(W, 0.9) - 0.08, d, z);
    const back = z - d / 2 + 0.16;
    if (def.id === 'espressoMachine') {
      part(g, rbox(0.52, 0.36, 0.34, 0.03), STEEL, 0, top + 0.18, back + 0.02);
      part(g, rbox(0.54, 0.05, 0.36, 0.02), shade(c, 0.9), 0, top + 0.385, back + 0.02);
      for (const x of [-0.12, 0.12]) {
        part(g, cyl(0.035, 0.03, 0.06, 12), BLACK, x, top + 0.2, back + 0.2, { outline: false });
        part(g, box(0.02, 0.02, 0.14), BLACK, x, top + 0.17, back + 0.28, { outline: false });
        part(g, cyl(0.03, 0.025, 0.05, 12), WHITE, x, top + 0.04, back + 0.21);
      }
      part(g, cyl(0.008, 0.008, 0.16, 6), STEEL, 0.23, top + 0.16, back + 0.2, { rz: 0.3, outline: false });
      for (let i = 0; i < 3; i++) part(g, cyl(0.03, 0.025, 0.05, 12), WHITE, -0.12 + i * 0.08, top + 0.41, back, { outline: false });
    } else if (def.id === 'beanRoaster') {
      part(g, rbox(0.22, 0.24, 0.22, 0.03), shade(c, 0.6), 0, top + 0.12, back + 0.04);
      part(g, cyl(0.12, 0.05, 0.22, 16), tint('#6d4c41', 0.15), 0, top + 0.36, back + 0.04);
      part(g, ball(0.03), '#4e342e', 0.04, top + 0.46, back + 0.06, { outline: false });
      part(g, cyl(0.05, 0.05, 0.08, 14), GLASS_DARK, 0, top + 0.04, back + 0.16);
    } else {
      // A filter machine: water tank behind, the head over a glass jug on its hot plate.
      part(g, rbox(0.26, 0.38, 0.12, 0.03), DARK, 0, top + 0.19, back - 0.04);
      part(g, rbox(0.26, 0.08, 0.24, 0.03), DARK, 0, top + 0.36, back + 0.03);
      part(g, rbox(0.24, 0.03, 0.22, 0.02), DARK, 0, top + 0.015, back + 0.04);
      glass(g, cyl(0.07, 0.065, 0.14, 16), 0, top + 0.1, back + 0.07);
      part(g, cyl(0.065, 0.06, 0.06, 16), '#4e2a1a', 0, top + 0.06, back + 0.07, { outline: false });
    }
    // Two mugs by it.
    for (const x of [0.28, 0.36]) if (x < Math.min(W, 0.9) / 2 - 0.05) part(g, cyl(0.035, 0.03, 0.08, 12), x > 0.3 ? tint(c, 0.4) : WHITE, x, top + 0.04, z + 0.1);
    out.work = marker(g, 0, top + 0.12, back + 0.22);
  },
  audio(g, W, D, c, def, _ctx, out) {
    if (def.id === 'clubSpeaker') {
      const h = 1.5;
      part(g, rbox(Math.min(W, 0.7) - 0.1, h, Math.min(D, 0.6) - 0.1, 0.03), BLACK, 0, h / 2, 0);
      const zf = (Math.min(D, 0.6) - 0.1) / 2 + 0.005;
      for (const [y, r] of [[0.35, 0.2], [0.85, 0.2], [1.3, 0.08]] as const) {
        part(g, cyl(r, r, 0.02, 24), '#55565e', 0, y, zf, { rx: Math.PI / 2, outline: false });
        part(g, cyl(r * 0.35, r * 0.35, 0.03, 16), '#888a94', 0, y, zf + 0.01, { rx: Math.PI / 2, outline: false });
      }
      out.work = marker(g, 0, 1.0, zf);
      return;
    }
    // A hi-fi: a low cabinet with the deck and a turntable, a speaker each side.
    const d = Math.min(D, 0.45);
    const z = -D / 2 + d / 2 + 0.02;
    const w = Math.min(W - 0.1, 0.62);
    part(g, rbox(w, 0.5, d, 0.02), shade(WOOD, 0.75), 0, 0.25, z);
    part(g, rbox(w - 0.08, 0.1, d - 0.08, 0.02), STEEL, 0, 0.56, z);
    part(g, box(w - 0.2, 0.03, 0.005), '#40c4ff', 0, 0.57, z + (d - 0.08) / 2 + 0.002, { outline: false });
    for (const x of [-w / 2 + 0.1, w / 2 - 0.1]) part(g, cyl(0.02, 0.02, 0.015, 10), DARK, x, 0.56, z + (d - 0.08) / 2 + 0.005, { rx: Math.PI / 2, outline: false });
    // The turntable to the front, between the speakers.
    const tz = W > 1.2 ? z : z + 0.04;
    part(g, rbox(Math.min(w - 0.12, 0.4), 0.05, d - 0.16, 0.02), DARK, 0, 0.635, tz);
    part(g, cyl(0.12, 0.12, 0.012, 24), '#1b1b1f', -0.03, 0.665, tz, { outline: false });
    part(g, cyl(0.04, 0.04, 0.014, 16), c, -0.03, 0.667, tz, { outline: false });
    part(g, box(0.015, 0.012, 0.14), STEEL, 0.13, 0.675, tz, { ry: 0.4, outline: false });
    // The speakers, out to the sides on a wider piece, beside the cabinet on a narrow one.
    // Tall speakers out to the sides on a wide piece; on a narrow one, small ones on the back of the cabinet.
    if (W > 1.2)
      for (const x of [-(W / 2 - 0.16), W / 2 - 0.16]) {
        part(g, rbox(0.24, 0.9, 0.26, 0.02), shade(WOOD, 0.55), x, 0.45, z);
        for (const [y, r] of [[0.3, 0.08], [0.58, 0.06], [0.78, 0.03]] as const) part(g, cyl(r, r, 0.015, 18), BLACK, x, y, z + 0.132, { rx: Math.PI / 2, outline: false });
      }
    else
      for (const x of [-(w / 2 - 0.08), w / 2 - 0.08]) {
        part(g, rbox(0.14, 0.26, 0.14, 0.02), shade(WOOD, 0.55), x, 0.79, z - d / 2 + 0.1);
        for (const [y, r] of [[0.74, 0.045], [0.86, 0.02]] as const) part(g, cyl(r, r, 0.012, 16), BLACK, x, y, z - d / 2 + 0.172, { rx: Math.PI / 2, outline: false });
      }
    out.work = marker(g, 0.1, 0.62, z + d / 2 - 0.02);
  },
  appliance(g, W, D, c, def, _ctx, out) {
    const id = def.id;
    const d = Math.min(D, 0.7);
    const z = -D / 2 + d / 2 + 0.02;
    const zf = z + d / 2;
    if (id === 'copier' || id === 'largePrinter') {
      if (id === 'largePrinter') {
        // A wide plotter on legs, a roll of paper in it, a print coming out the front.
        legs(g, W - 0.2, 0.4, 0.7, DARK, 0.06, 0.025);
        part(g, rbox(W - 0.16, 0.32, 0.42, 0.04), shade(c, 0.95), 0, 0.86, z);
        part(g, cyl(0.07, 0.07, W - 0.4, 16), WHITE, 0, 0.92, z - 0.05, { rz: Math.PI / 2, outline: false });
        part(g, box(W - 0.5, 0.005, 0.5), WHITE, 0, 0.62, z + 0.36, { rx: 0.5, outline: false });
        screen(g, out, 0.16, 0.08, W / 2 - 0.3, 1.0, z + 0.215, -0.5);
        out.work = marker(g, W / 2 - 0.3, 0.98, z + 0.24);
        return;
      }
      part(g, rbox(Math.min(W, 0.8) - 0.12, 0.9, d - 0.05, 0.03), shade(c, 0.97), 0, 0.45, z);
      for (const y of [0.18, 0.38]) part(g, box(Math.min(W, 0.8) - 0.22, 0.012, 0.01), shade(c, 0.7), 0, y, zf - 0.02, { outline: false });
      part(g, rbox(Math.min(W, 0.8) - 0.16, 0.06, d - 0.1, 0.02), shade(c, 0.85), 0, 0.93, z);
      part(g, box(0.3, 0.01, 0.22), WHITE, -0.05, 0.94, z + 0.03, { outline: false });
      part(g, rbox(0.22, 0.05, 0.12, 0.01), DARK, 0.12, 0.95, zf - 0.06, { rx: -0.3 });
      screen(g, out, 0.12, 0.06, 0.12, 0.98, zf - 0.03, -0.9);
      out.work = marker(g, 0.1, 0.98, zf - 0.02);
      return;
    }
    if (id === 'tableSaw' || id === 'tileSaw' || id === 'sewingMachine' || id === 'inspectionRig' || id === 'testRig') {
      // A work table with the tool on it.
      const w = W - 0.1;
      legs(g, w, d, 0.82, id === 'sewingMachine' ? WOOD : DARK, 0.05, 0.03);
      part(g, rbox(w, 0.05, d, 0.01), id === 'sewingMachine' ? WOOD : STEEL, 0, 0.845, z);
      if (id === 'sewingMachine') {
        part(g, rbox(0.36, 0.08, 0.16, 0.03), c, 0, 0.91, z);
        part(g, rbox(0.08, 0.2, 0.14, 0.03), c, 0.14, 1.03, z);
        part(g, rbox(0.34, 0.07, 0.14, 0.03), c, 0, 1.15, z);
        part(g, rbox(0.06, 0.12, 0.08, 0.02), c, -0.14, 1.08, z);
        part(g, cyl(0.04, 0.04, 0.02, 12), METAL, 0.2, 1.05, z, { rz: Math.PI / 2 });
        part(g, box(0.3, 0.005, 0.25), tint('#e57373', 0.3), -0.05, 0.875, z + 0.12, { outline: false });
      } else if (id === 'tableSaw' || id === 'tileSaw') {
        part(g, cyl(0.12, 0.12, 0.01, 24), STEEL, 0, 0.87, z, { rx: Math.PI / 2, ry: Math.PI / 2 });
        part(g, rbox(0.16, 0.1, 0.24, 0.03), id === 'tileSaw' ? '#e53935' : '#fbc02d', 0, 0.97, z, {});
        if (id === 'tileSaw') part(g, box(w - 0.1, 0.06, d - 0.15), '#64b5f6', 0, 0.84, z, { outline: false });
      } else {
        part(g, rbox(0.3, 0.3, 0.25, 0.03), c, -0.1, 1.02, z - 0.05);
        part(g, cyl(0.02, 0.02, 0.35, 8), METAL, 0.15, 1.05, z, { rz: 0.6, outline: false });
        part(g, ball(0.05), DARK, 0.25, 1.18, z + 0.02, { outline: false });
        screen(g, out, 0.2, 0.13, -0.1, 1.05, z + 0.08);
      }
      out.work = marker(g, 0, 0.9, zf - 0.12);
      return;
    }
    if (id === 'parcelScale' || id === 'waterSensor' || id === 'balloonLauncher' || id === 'cableReel' || id === 'boilerUnit' || id === 'fryer') {
      if (id === 'parcelScale') {
        part(g, rbox(0.6, 0.08, 0.6, 0.02), STEEL, 0, 0.04, 0.02);
        part(g, cyl(0.025, 0.025, 0.95, 8), DARK, 0, 0.5, -0.27, { outline: false });
        part(g, rbox(0.26, 0.16, 0.06, 0.02), DARK, 0, 1.0, -0.25);
        screen(g, out, 0.2, 0.08, 0, 1.0, -0.215);
        part(g, rbox(0.34, 0.24, 0.3, 0.02), '#c8a06a', 0, 0.2, 0.02);
        out.work = marker(g, 0, 0.35, 0.05);
      } else if (id === 'waterSensor') {
        part(g, cyl(0.04, 0.05, 1.0, 10), METAL, 0, 0.5, 0, { outline: false });
        part(g, rbox(0.3, 0.26, 0.14, 0.03), WHITE, 0, 1.05, 0.02);
        screen(g, out, 0.2, 0.12, 0, 1.07, 0.095);
        part(g, cyl(0.01, 0.01, 0.5, 6), BLACK, 0.18, 0.75, 0.04, { rz: 0.2, outline: false });
        out.work = marker(g, 0, 1.0, 0.1);
      } else if (id === 'balloonLauncher') {
        part(g, rbox(0.6, 0.5, 0.5, 0.03), WHITE, 0, 0.25, 0);
        part(g, ball(0.3), '#f5f5f5', 0, 1.05, 0);
        part(g, cyl(0.005, 0.005, 0.5, 4), DARK, 0, 0.6, 0, { outline: false });
        part(g, rbox(0.12, 0.12, 0.12, 0.02), '#ffb300', 0, 0.56, 0);
        out.work = marker(g, 0, 0.55, 0.27);
      } else if (id === 'cableReel') {
        for (const x of [-0.18, 0.18]) part(g, cyl(0.38, 0.38, 0.04, 22), WOOD, x, 0.4, 0, { rz: Math.PI / 2 });
        part(g, cyl(0.24, 0.24, 0.34, 20), c, 0, 0.4, 0, { rz: Math.PI / 2 });
        out.work = marker(g, 0, 0.7, 0.25);
      } else if (id === 'boilerUnit') {
        part(g, cyl(0.25, 0.25, 1.2, 18), WHITE, 0, 0.62, -0.05);
        for (const x of [-0.1, 0.1]) part(g, cyl(0.025, 0.025, 0.6, 8), '#b87333', x, 0.3, 0.2, { outline: false });
        part(g, rbox(0.2, 0.14, 0.04, 0.02), DARK, 0, 0.95, 0.2);
        screen(g, out, 0.14, 0.07, 0, 0.96, 0.225);
        out.work = marker(g, 0, 0.85, 0.22);
      } else {
        // A fryer: a steel cabinet, hot oil in the top, two baskets hung over it.
        part(g, rbox(0.6, 0.86, d - 0.05, 0.02), STEEL, 0, 0.43, z);
        part(g, box(0.5, 0.02, d - 0.2), '#c88a2a', 0, 0.86, z, { outline: false });
        for (const x of [-0.13, 0.13]) {
          part(g, rbox(0.2, 0.12, 0.2, 0.02), METAL, x, 0.95, z - 0.02);
          part(g, box(0.02, 0.02, 0.2), BLACK, x, 0.98, z + 0.17, { outline: false });
        }
        out.work = marker(g, 0, 0.95, z + 0.22);
      }
      return;
    }
    // A machine on a counter-height stand or cabinet: a body, a panel or screen on its front.
    const top = stand(g, Math.min(W, 1.0) - 0.08, d, z, id === 'analyzerMachine' || id === 'skinAnalyzer' ? WHITE : shade(WOOD, 0.9), id === 'skinAnalyzer' ? 0.72 : 0.82);
    const body = new THREE.Group();
    body.position.set(0, top, z - 0.04);
    g.add(body);
    switch (id) {
      case 'sterilizer':
        part(body, rbox(0.5, 0.36, 0.4, 0.03), STEEL, 0, 0.18, 0);
        part(body, cyl(0.1, 0.1, 0.02, 20), GLASS_DARK, -0.08, 0.18, 0.2, { rx: Math.PI / 2 });
        part(body, box(0.1, 0.04, 0.02), BLACK, 0.16, 0.26, 0.205, { outline: false });
        break;
      case 'herbDecoctor':
        for (const x of [-0.14, 0.14]) {
          part(body, cyl(0.12, 0.12, 0.42, 18), STEEL, x, 0.21, 0);
          part(body, cyl(0.125, 0.125, 0.03, 18), DARK, x, 0.43, 0);
        }
        part(body, cyl(0.015, 0.015, 0.28, 8), '#b87333', 0, 0.36, 0.05, { rz: Math.PI / 2, outline: false });
        break;
      case 'lensEdger':
      case 'centrifugeUnit':
        part(body, rbox(0.4, 0.22, 0.38, 0.05), WHITE, 0, 0.11, 0);
        part(body, cyl(0.15, 0.15, 0.06, 22), id === 'lensEdger' ? GLASS_DARK : '#90a4ae', 0, 0.25, -0.02);
        part(body, box(0.14, 0.05, 0.01), '#4caf50', 0.08, 0.12, 0.195, { outline: false });
        break;
      case 'analyzerMachine':
        part(body, rbox(Math.min(W, 1.0) - 0.2, 0.5, 0.45, 0.04), WHITE, 0, 0.25, 0);
        part(body, box(0.3, 0.08, 0.02), '#1565c0', -0.12, 0.42, 0.226, { outline: false });
        for (let i = 0; i < 6; i++) part(body, cyl(0.012, 0.012, 0.08, 6), i % 2 ? '#ef5350' : '#ffee58', -0.1 + i * 0.04, 0.54, 0.05, { outline: false });
        break;
      case 'skinAnalyzer':
        part(body, rbox(0.3, 0.3, 0.3, 0.04), WHITE, 0, 0.15, 0);
        part(body, cyl(0.12, 0.14, 0.18, 18), '#f8bbd0', 0, 0.45, 0.05, { rx: Math.PI / 2 - 0.3 });
        break;
      case 'deliveryPOS':
      case 'orderTablet':
        part(body, cyl(0.03, 0.05, 0.2, 10), DARK, 0, 0.1, 0, { outline: false });
        part(body, rbox(0.34, 0.24, 0.03, 0.02), DARK, 0, 0.28, 0.02, { rx: -0.35 });
        if (id === 'deliveryPOS') part(body, rbox(0.12, 0.08, 0.16, 0.02), WHITE, 0.25, 0.04, 0.02);
        screen(g, out, 0.3, 0.2, 0, top + 0.28, z + 0.0, -0.35);
        break;
      case 'leakDetector':
        part(body, rbox(0.4, 0.14, 0.3, 0.03), '#ffb300', 0, 0.07, 0);
        part(body, cyl(0.012, 0.012, 0.45, 6), METAL, 0.12, 0.15, 0.1, { rx: 1.2, outline: false });
        part(body, rbox(0.12, 0.1, 0.04, 0.02), DARK, -0.1, 0.18, 0.1);
        break;
      default:
        part(body, rbox(0.4, 0.3, 0.32, 0.04), c, 0, 0.15, 0);
    }
    out.work = marker(g, 0, top + 0.12, zf - 0.04);
  },
  scanner(g, W, D, c, def, _ctx, out) {
    const id = def.id;
    if (id === 'baggageXray') {
      // A tunnel on a belt, the screen at its end.
      part(g, box(W - 0.1, 0.06, 0.6), BLACK, 0, 0.72, 0, { outline: false });
      legs(g, W - 0.2, 0.55, 0.69, METAL, 0.05, 0.025);
      part(g, rbox(W * 0.55, 0.7, 0.72, 0.05), shade(c, 0.95), 0, 1.07, 0);
      part(g, box(W * 0.55 - 0.1, 0.45, 0.02), '#263238', 0, 0.97, 0.37, { outline: false });
      for (const x of [-W / 2 + 0.25, W / 2 - 0.25]) part(g, rbox(0.3, 0.2, 0.2, 0.03), ['#e57373', '#64b5f6'][x < 0 ? 0 : 1], x, 0.85, 0);
      part(g, rbox(0.4, 0.3, 0.04, 0.02), DARK, W / 2 - 0.3, 1.35, 0.3);
      screen(g, out, 0.34, 0.22, W / 2 - 0.3, 1.35, 0.33);
      out.work = marker(g, W / 2 - 0.3, 1.1, 0.35);
      return;
    }
    // A patient's table running into the machine.
    const along = W >= D;
    const L = (along ? W : D) - 0.1;
    const holder = new THREE.Group();
    if (!along) holder.rotation.y = Math.PI / 2;
    g.add(holder);
    part(holder, rbox(L * 0.55, 0.62, 0.5, 0.05), WHITE, L * 0.18, 0.31, 0);
    part(holder, rbox(L * 0.6, 0.06, 0.48, 0.03), '#b3e5fc', L * 0.15, 0.65, 0);
    if (id === 'ctScanner' || id === 'mriScanner') {
      const r = id === 'mriScanner' ? 0.9 : 0.8;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.7, r * 0.3, 14, 32), toon(WHITE));
      ring.userData.ownGeometry = true;
      ring.rotation.y = Math.PI / 2;
      ring.position.set(-L / 2 + 0.35, r + 0.05, 0);
      ring.castShadow = true;
      holder.add(ring);
      part(holder, box(0.5, 0.35, r * 2), WHITE, -L / 2 + 0.35, 0.18, 0);
      part(holder, cyl(r * 0.4, r * 0.4, 0.02, 24), '#263238', -L / 2 + 0.6, r + 0.05, 0, { rz: Math.PI / 2, outline: false });
      part(holder, box(0.02, 0.06, r), c, -L / 2 + 0.61, r + 0.4, 0, { outline: false });
    } else {
      // X-ray and radiotherapy: a gantry arm over the table.
      part(holder, rbox(0.4, 1.9, 0.6, 0.05), WHITE, -L / 2 + 0.25, 0.95, 0);
      part(holder, rbox(0.7, 0.25, 0.5, 0.05), shade(WHITE, 0.95), -L / 2 + 0.6, 1.75, 0);
      part(holder, cyl(0.17, 0.2, 0.2, 18), id === 'linacMachine' ? '#90a4ae' : DARK, -L / 2 + 0.8, 1.55, 0);
    }
    const side = along ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
    out.work = marker(g, 0, 0.75, 0);
    out.work.position.addScaledVector(side, 0.3);
  },
  booth(g, W, D, c, def, _ctx, out) {
    const id = def.id;
    const h = 2.0;
    const t = 0.05;
    const wall = id === 'fittingRoom' ? WHITE : tint(c, 0.25);
    // The back and the two sides; glass fronts the sides of the studios.
    const studio = /radio|dubbing|onAir|interpret/i.test(id);
    part(g, rbox(W - 0.06, h, t, 0.015), wall, 0, h / 2, -D / 2 + 0.05);
    for (const sx of [-1, 1]) {
      if (studio) {
        part(g, box(t, 0.9, D - 0.12), wall, sx * (W / 2 - 0.05), 0.45, 0.02);
        glass(g, box(0.02, h - 0.95, D - 0.14), sx * (W / 2 - 0.05), 0.9 + (h - 0.9) / 2, 0.02);
        part(g, box(t + 0.02, 0.05, D - 0.1), wall, sx * (W / 2 - 0.05), h, 0.02, { outline: false });
      } else part(g, rbox(t, h, D - 0.1, 0.015), wall, sx * (W / 2 - 0.05), h / 2, 0.02);
    }
    if (id === 'fittingRoom') {
      // A curtain rail across the front, the curtain drawn to one side, a mirror and a hook inside.
      part(g, cyl(0.015, 0.015, W - 0.1, 8), METAL, 0, h - 0.05, D / 2 - 0.06, { rz: Math.PI / 2, outline: false });
      for (let i = 0; i < 5; i++) part(g, rbox(0.08, h - 0.15, 0.06, 0.03), c, -W / 2 + 0.12 + i * 0.07, (h - 0.1) / 2, D / 2 - 0.06 + (i % 2) * 0.03, { outline: false });
      part(g, rbox(0.5, 1.2, 0.02, 0.01), '#d9eef7', 0.1, 1.1, -D / 2 + 0.09);
      part(g, rbox(0.3, 0.05, 0.25, 0.02), WOOD, 0.25, 0.45, -D / 2 + 0.2);
      out.work = marker(g, 0.1, 1.2, -D / 2 + 0.3);
      return;
    }
    if (id === 'weldingBooth') {
      part(g, rbox(W - 0.3, 0.06, 0.6, 0.01), STEEL, 0, 0.85, -D / 2 + 0.4);
      legs(g, W - 0.3, 0.6, 0.82, DARK, 0.06, 0.025);
      part(g, rbox(0.3, 0.3, 0.25, 0.03), '#1565c0', -W / 2 + 0.35, 0.15, 0.1);
      part(g, rbox(W - 0.12, 1.4, 0.02, 0.01), '#ffca28', 0, 0.75, D / 2 - 0.04, { outline: false });
      out.work = marker(g, 0, 0.92, -D / 2 + 0.45);
      return;
    }
    // A desk along the back with a chair at it; on it what the booth is for.
    const deskZ = -D / 2 + 0.33;
    part(g, rbox(W - 0.2, 0.05, 0.5, 0.02), WOOD, 0, 0.74, deskZ);
    part(g, rbox(0.05, 0.7, 0.46, 0.02), shade(WOOD, 0.85), -(W / 2 - 0.15), 0.36, deskZ);
    part(g, rbox(0.05, 0.7, 0.46, 0.02), shade(WOOD, 0.85), W / 2 - 0.15, 0.36, deskZ);
    if (studio || id === 'playtestBooth') {
      part(g, rbox(0.5, 0.3, 0.04, 0.02), DARK, 0, 1.0, deskZ - 0.15);
      screen(g, out, 0.46, 0.26, 0, 1.0, deskZ - 0.125);
      part(g, rbox(0.4, 0.02, 0.14, 0.01), '#d6d6d6', 0, 0.775, deskZ + 0.12, { outline: false });
    }
    if (studio) {
      part(g, cyl(0.012, 0.012, 0.35, 6), DARK, 0.25, 0.92, deskZ + 0.05, { rx: 0.5, outline: false });
      part(g, cyl(0.04, 0.04, 0.11, 12), '#455a64', 0.25, 1.08, deskZ + 0.14, { rx: 1.2 });
      part(g, rbox(0.16, 0.12, 0.08, 0.04), BLACK, -0.3, 0.82, deskZ - 0.05);
    } else if (id === 'visitBooth') {
      glass(g, box(W - 0.2, 0.7, 0.02), 0, 1.15, deskZ - 0.2);
      part(g, rbox(0.06, 0.18, 0.05, 0.02), BLACK, W / 2 - 0.35, 1.0, deskZ - 0.1);
    } else if (id !== 'playtestBooth') {
      part(g, rbox(0.26, 0.02, 0.2, 0.01), WHITE, 0, 0.775, deskZ + 0.1, { outline: false });
      part(g, rbox(0.16, 0.05, 0.1, 0.02), BLACK, 0.3, 0.79, deskZ);
    }
    out.work = marker(g, 0, 0.79, deskZ + 0.12);
    out.seat = deskChair(g, deskZ + 0.25);
  },
  cart(g, W, D, c, def, _ctx, out) {
    const id = def.id;
    if (id === 'lawnMower' || id === 'wheelbarrow') {
      if (id === 'lawnMower') {
        part(g, rbox(0.5, 0.25, 0.55, 0.06), c, 0, 0.2, -0.05);
        for (const [x, z] of [[-0.26, -0.25], [0.26, -0.25], [-0.26, 0.15], [0.26, 0.15]] as const) wheel(g, 0.09, 0.05, x, 0.09, z);
        for (const x of [-0.18, 0.18]) part(g, cyl(0.015, 0.015, 0.75, 6), DARK, x, 0.55, 0.38, { rx: -0.6, outline: false });
        part(g, cyl(0.015, 0.015, 0.4, 6), DARK, 0, 0.86, 0.6, { rz: Math.PI / 2, outline: false });
        out.work = marker(g, 0, 0.86, 0.6);
      } else {
        part(g, rbox(0.5, 0.25, 0.6, 0.08), c, 0, 0.45, -0.05, { rx: 0.15 });
        wheel(g, 0.15, 0.06, 0, 0.15, -0.38);
        for (const x of [-0.2, 0.2]) part(g, cyl(0.018, 0.018, 0.8, 6), WOOD, x, 0.5, 0.25, { rx: -1.3, outline: false });
        out.work = marker(g, 0, 0.62, 0.55);
      }
      return;
    }
    // A trolley: a deck on castors, a handle at the back, what it carries on it.
    const w = Math.min(W, 0.8) - 0.12;
    const d = Math.min(D, 0.9) - 0.15;
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
      part(g, cyl(0.04, 0.04, 0.03, 10), BLACK, x * (w / 2 - 0.04), 0.04, z * (d / 2 - 0.04), { rz: Math.PI / 2 });
    }
    const deck = id === 'luggageCart' ? '#c8a24a' : id === 'parcelCage' ? METAL : STEEL;
    part(g, rbox(w, 0.04, d, 0.01), id === 'luggageCart' ? '#b71c1c' : deck, 0, 0.12, 0);
    if (id === 'luggageCart') {
      for (const x of [-w / 2 + 0.03, w / 2 - 0.03]) part(g, cyl(0.02, 0.02, 1.6, 8), deck, x, 0.9, 0, { outline: false });
      part(g, cyl(0.03, 0.03, w, 10), deck, 0, 1.7, 0, { rz: Math.PI / 2, outline: false });
      part(g, rbox(w - 0.1, 0.5, 0.25, 0.04), '#5d4037', 0, 0.39, -0.12);
      part(g, rbox(w - 0.2, 0.35, 0.2, 0.04), '#1e88e5', 0, 0.82, -0.12);
      part(g, rbox(w - 0.25, 0.3, 0.18, 0.04), '#43a047', 0, 0.39, 0.15);
      out.work = marker(g, 0, 1.0, d / 2);
      return;
    }
    if (id === 'parcelCage') {
      for (const x of [-1, 1]) part(g, box(0.02, 1.5, d), METAL, x * (w / 2), 0.87, 0, { outline: false });
      part(g, box(w, 1.5, 0.02), METAL, 0, 0.87, -d / 2, { outline: false });
      for (let i = 0; i < 5; i++) part(g, rbox(0.3 - (i % 2) * 0.06, 0.22, 0.3, 0.02), '#c8a06a', (i % 2 ? 0.1 : -0.1), 0.25 + i * 0.22, (i % 3) * 0.05 - 0.05);
      out.work = marker(g, 0, 1.0, d / 2);
      return;
    }
    // Meal and make-up trolleys: shelves on corner posts, a push bar.
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) part(g, cyl(0.015, 0.015, 0.9, 6), STEEL, x * (w / 2 - 0.02), 0.55, z * (d / 2 - 0.02), { outline: false });
    for (const y of [0.45, 0.95]) part(g, rbox(w, 0.03, d, 0.01), deck, 0, y, 0);
    part(g, cyl(0.015, 0.015, w, 6), STEEL, 0, 1.0, d / 2 + 0.05, { rz: Math.PI / 2, outline: false });
    if (id === 'mealCart') for (let i = 0; i < 3; i++) for (const y of [0.13, 0.47, 0.97]) part(g, rbox(0.28, 0.03, 0.2, 0.01), i % 2 ? '#ffe0b2' : '#c5e1a5', -w / 2 + 0.17 + i * 0.01, y + 0.03, -d / 2 + 0.15 + i * 0.22, { outline: false });
    else for (let i = 0; i < 6; i++) part(g, cyl(0.02, 0.02, 0.12, 8), ['#e91e63', '#ffb300', '#8d6e63'][i % 3], -0.15 + (i % 3) * 0.12, 1.03, -0.1 + Math.floor(i / 3) * 0.15, { outline: false });
    out.work = marker(g, 0, 1.0, d / 2 + 0.05);
    void c;
  },
  conveyor(g, W, D, c, def, _ctx, out) {
    const along = W >= D;
    const L = (along ? W : D) - 0.1;
    const hold = new THREE.Group();
    if (!along) hold.rotation.y = Math.PI / 2;
    g.add(hold);
    const y = 0.8;
    for (let x = -L / 2 + 0.2; x <= L / 2 - 0.2; x += Math.max(0.6, (L - 0.4) / 3)) for (const z of [-0.25, 0.25]) part(hold, box(0.05, y, 0.05), METAL, x, y / 2, z, { outline: false });
    part(hold, rbox(L, 0.08, 0.62, 0.02), STEEL, 0, y, 0);
    part(hold, box(L - 0.06, 0.012, 0.5), BLACK, 0, y + 0.045, 0, { outline: false });
    for (const sx of [-1, 1]) part(hold, rbox(L, 0.1, 0.03, 0.01), shade(c, 0.9), 0, y + 0.08, sx * 0.31);
    const things = def.id === 'recycleSorter' ? ['#64b5f6', '#81c784', '#fff176', '#e0e0e0'] : ['#c8a06a', '#b08a58', '#c8a06a'];
    things.forEach((k, i) => part(hold, def.id === 'recycleSorter' ? cyl(0.05, 0.05, 0.16, 10) : rbox(0.26, 0.18, 0.24, 0.02), k, -L / 2 + 0.4 + i * ((L - 0.8) / Math.max(1, things.length - 1)), y + 0.13, (i % 2) * 0.1 - 0.05, def.id === 'recycleSorter' ? { rz: Math.PI / 2 } : {}));
    if (def.id === 'recycleSorter') for (const [i, k] of ['#1e88e5', '#43a047', '#fdd835'].entries()) part(hold, rbox(0.35, 0.5, 0.35, 0.03), k, -L / 2 + 0.4 + i * 0.5, 0.25, 0.55);
    out.work = marker(g, 0, y + 0.12, 0);
    out.work.position.set(along ? 0 : 0.2, y + 0.12, along ? 0.2 : 0);
  },
  simulator(g, W, D, c, def, _ctx, out) {
    const id = def.id;
    // The centrifuge, the wind tunnel and the spacecraft mock-up are drawn in furnitureSpace.ts.
    if (id === 'elevatorMockup') {
      // A car in an open shaft frame, its doors at the front.
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) part(g, box(0.08, 2.6, 0.08), '#fbc02d', x * (W / 2 - 0.08), 1.3, z * (D / 2 - 0.08), { outline: false });
      part(g, rbox(W - 0.4, 2.1, D - 0.4, 0.03), STEEL, 0, 1.1, 0);
      for (const x of [-0.22, 0.22]) part(g, box(0.42, 1.95, 0.02), METAL, x, 1.03, (D - 0.4) / 2 + 0.01, { outline: false });
      out.work = marker(g, (W - 0.4) / 2 - 0.1, 1.1, (D - 0.4) / 2 + 0.05);
      return;
    }
    if (id === 'cabinMockup') {
      // A section of cabin: a curved shell over rows of seats, open at the front.
      const L = W - 0.1;
      const shell = new THREE.Mesh(new THREE.CylinderGeometry(Math.min(D, 1.6) / 2 + 0.2, Math.min(D, 1.6) / 2 + 0.2, L, 24, 1, true, Math.PI * 1.1, Math.PI * 0.8), new THREE.MeshToonMaterial({ color: WHITE, side: THREE.DoubleSide }));
      shell.userData.ownGeometry = shell.userData.ownMaterial = true;
      shell.rotation.z = Math.PI / 2;
      shell.position.set(0, 1.05, -0.1);
      g.add(shell);
      part(g, box(L, 0.1, D - 0.2), shade(WHITE, 0.85), 0, 0.05, 0);
      for (let x = -L / 2 + 0.4; x < L / 2 - 0.2; x += 0.6) {
        part(g, rbox(0.46, 0.12, 0.45, 0.04), '#1e3a8a', x, 0.48, -0.15);
        part(g, rbox(0.46, 0.6, 0.1, 0.04), '#1e3a8a', x, 0.8, -0.38);
      }
      out.work = marker(g, 0, 0.9, D / 2 - 0.3);
      return;
    }
    // A driving / flying / train / ship's-bridge simulator: a seat facing a bank of screens and controls.
    const consoleZ = -D / 2 + 0.25;
    part(g, rbox(W - 0.1, 0.12, D - 0.1, 0.04), DARK, 0, 0.06, 0);
    part(g, rbox(Math.min(W - 0.2, 1.4), 0.8, 0.35, 0.04), shade(c, 0.6), 0, 0.52, consoleZ);
    part(g, rbox(Math.min(W - 0.2, 1.4), 0.04, 0.25, 0.02), BLACK, 0, 0.94, consoleZ + 0.12, { rx: 0.3 });
    const n = W > 1.5 ? 3 : 1;
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * 0.58;
      const ry = -(i - (n - 1) / 2) * 0.35;
      const s = new THREE.Group();
      s.position.set(x, 1.3, consoleZ - 0.05 + Math.abs(i - (n - 1) / 2) * 0.12);
      s.rotation.y = ry;
      g.add(s);
      part(s, rbox(0.56, 0.36, 0.04, 0.02), BLACK, 0, 0, 0);
      screen(s, out, 0.52, 0.32, 0, 0, 0.025);
    }
    if (id === 'drivingSim' || id === 'trainSimulator') part(g, new THREE.TorusGeometry(0.14, 0.02, 8, 20), BLACK, 0, 1.02, consoleZ + 0.28, { rx: -1.0 });
    else if (id === 'shipBridge') part(g, new THREE.TorusGeometry(0.2, 0.025, 8, 12), WOOD, 0, 1.08, consoleZ + 0.27, { rx: -0.2 });
    else part(g, cyl(0.02, 0.025, 0.3, 8), BLACK, 0, 0.75, consoleZ + 0.45, { rx: -0.3 });
    // The seat.
    const sz = consoleZ + 0.75;
    part(g, rbox(0.5, 0.12, 0.48, 0.05), BLACK, 0, 0.48, sz);
    part(g, rbox(0.5, 0.65, 0.12, 0.05), BLACK, 0, 0.82, sz + 0.24, { rx: 0.15 });
    part(g, cyl(0.05, 0.05, 0.38, 8), METAL, 0, 0.29, sz, { outline: false });
    out.seat = marker(g, 0, 0.55, sz);
    out.work = marker(g, 0, 0.98, consoleZ + 0.26);
  },
  transport(g, W, D, c, def) {
    const id = def.id;
    const long = D > W;
    const L = (long ? D : W) - 0.15;
    const Wd = (long ? W : D) - 0.2;
    const v = new THREE.Group();
    if (!long) v.rotation.y = Math.PI / 2;
    g.add(v);
    if (id === 'rocketShip') {
      part(g, cyl(0.45, 0.5, 2.6, 20), WHITE, 0, 1.45, 0);
      part(g, new THREE.ConeGeometry(0.45, 0.9, 20), '#e53935', 0, 3.2, 0);
      for (let i = 0; i < 4; i++) part(g, box(0.06, 0.7, 0.5), '#e53935', Math.cos((i * Math.PI) / 2) * 0.55, 0.45, Math.sin((i * Math.PI) / 2) * 0.55, { ry: -(i * Math.PI) / 2 + Math.PI / 2 });
      part(g, cyl(0.15, 0.15, 0.03, 16), '#64b5f6', 0, 2.2, 0.48, { rx: Math.PI / 2 });
      return;
    }
    if (/Boat$|cargoTender/.test(id)) {
      // A hull narrowing to the bow, a deckhouse aft, on the water.
      const hull = new THREE.Shape();
      hull.moveTo(-Wd / 2, -L / 2);
      hull.lineTo(Wd / 2, -L / 2);
      hull.lineTo(Wd / 2, L / 4);
      hull.quadraticCurveTo(Wd / 2, L / 2 - 0.1, 0, L / 2);
      hull.quadraticCurveTo(-Wd / 2, L / 2 - 0.1, -Wd / 2, L / 4);
      hull.closePath();
      const geom = new THREE.ExtrudeGeometry(hull, { depth: 0.55, bevelEnabled: false }).rotateX(Math.PI / 2).translate(0, 0.6, 0);
      const m = part(v, geom, c, 0, 0, 0);
      m.userData.ownGeometry = true;
      part(v, box(Wd - 0.12, 0.04, L - 0.4), WOOD, 0, 0.61, -0.1, { outline: false });
      part(v, rbox(Wd * 0.7, 0.6, L * 0.3, 0.05), WHITE, 0, 0.92, -L * 0.25);
      part(v, box(Wd * 0.7 - 0.1, 0.2, 0.01), '#64b5f6', 0, 1.02, -L * 0.25 + L * 0.15 + 0.005, { outline: false });
      if (id === 'patrolBoat') part(v, box(Wd * 0.3, 0.06, 0.12), '#1e88e5', 0, 1.26, -L * 0.25, { outline: false });
      return;
    }
    const tall = /Bus$|subwayTrain|ambulance/.test(id);
    const h = tall ? 1.7 : 0.55;
    part(v, rbox(Wd, h, L, 0.1), c, 0, 0.3 + h / 2, 0);
    if (tall) {
      // A row of windows down each side and a windscreen at the front.
      for (const sx of [-1, 1]) part(v, box(0.01, 0.45, L - 0.6), '#9cc9e6', sx * (Wd / 2 + 0.005), 0.3 + h - 0.45, -0.1, { outline: false });
      part(v, box(Wd - 0.15, 0.6, 0.01), '#9cc9e6', 0, 0.3 + h - 0.4, L / 2 + 0.005, { outline: false });
      if (id === 'ambulance') {
        part(v, box(Wd + 0.01, 0.12, L - 0.3), '#e53935', 0, 0.75, 0, { outline: false });
        part(v, rbox(0.5, 0.1, 0.18, 0.03), '#e53935', 0, 0.3 + h + 0.05, L / 2 - 0.4);
      }
      if (id === 'subwayTrain') part(v, box(Wd + 0.01, 0.1, L), '#43a047', 0, 0.7, 0, { outline: false });
    } else {
      part(v, rbox(Wd - 0.15, 0.48, L * 0.5, 0.12), tint(c, 0.1), 0, 1.05, -L * 0.05);
      part(v, box(Wd - 0.12, 0.32, L * 0.5 - 0.1), '#9cc9e6', 0, 1.07, -L * 0.05, { outline: false });
      if (id === 'taxiCab') part(v, rbox(0.4, 0.14, 0.2, 0.04), '#fdd835', 0, 1.36, -L * 0.05);
    }
    const r = tall ? 0.34 : 0.3;
    const zs = L > 3 ? [-L / 2 + 0.6, L / 2 - 0.6] : [-L / 2 + 0.45, L / 2 - 0.45];
    for (const sx of [-1, 1]) for (const z of zs) wheel(v, r, 0.22, sx * (Wd / 2 - 0.05), r, z);
  },
  prop(g, W, D, c, def, _ctx, out) {
    const id = def.id;
    switch (id) {
      case 'vaultDoor': {
        part(g, rbox(W - 0.1, 2.2, 0.3, 0.02), '#78909c', 0, 1.1, -D / 2 + 0.2);
        const door = part(g, cyl(0.85, 0.85, 0.2, 32), STEEL, 0.15, 1.1, -D / 2 + 0.45, { rx: Math.PI / 2 });
        door.scale.set(1, 1, 1);
        for (let i = 0; i < 6; i++) part(g, cyl(0.025, 0.025, 0.45, 8), DARK, 0.15 + Math.cos(i) * 0.0, 1.1, -D / 2 + 0.6, { rz: (i * Math.PI) / 3, outline: false });
        part(g, cyl(0.07, 0.07, 0.1, 12), DARK, 0.15, 1.1, -D / 2 + 0.6, { rx: Math.PI / 2 });
        out.work = marker(g, 0.15, 1.1, -D / 2 + 0.65);
        return;
      }
      case 'trafficCone':
        for (const [x, z] of [[-0.2, -0.2], [0.2, 0.15], [-0.1, 0.25]] as const) {
          part(g, box(0.3, 0.03, 0.3), '#ff6f00', x, 0.015, z, { outline: false });
          part(g, new THREE.ConeGeometry(0.11, 0.45, 14), '#ff6f00', x, 0.25, z);
          part(g, cyl(0.07, 0.085, 0.07, 14), WHITE, x, 0.25, z, { outline: false });
        }
        out.work = marker(g, 0, 0.3, 0.25);
        return;
      case 'materialPile':
      case 'steelPlates':
        for (let i = 0; i < (id === 'steelPlates' ? 8 : 5); i++)
          part(g, id === 'steelPlates' ? rbox(W - 0.3, 0.04, D - 0.3, 0.005) : rbox(W - 0.3 - (i % 2) * 0.2, 0.09, 0.2, 0.01), id === 'steelPlates' ? (i % 2 ? '#90a4ae' : '#78909c') : i % 2 ? WOOD : '#d7b98e', (i % 3) * 0.04, 0.05 + i * (id === 'steelPlates' ? 0.045 : 0.095), id === 'steelPlates' ? 0 : -0.3 + (i % 3) * 0.25, { ry: (i % 2) * 0.05 });
        out.work = marker(g, 0, 0.4, D / 2 - 0.1);
        return;
      case 'urn':
      case 'artPedestal':
        part(g, rbox(0.45, 0.95, 0.45, 0.02), id === 'urn' ? '#eceff1' : WHITE, 0, 0.475, 0);
        if (id === 'urn') {
          part(g, cyl(0.1, 0.08, 0.22, 16), '#8d6e63', 0, 1.06, 0);
          part(g, ball(0.06), '#8d6e63', 0, 1.2, 0);
          for (const x of [-0.16, 0.16]) part(g, ball(0.06), '#fff9c4', x, 1.0, 0.1, { outline: false });
        } else {
          part(g, new THREE.TorusKnotGeometry(0.12, 0.035, 48, 8), c, 0, 1.17, 0);
        }
        out.work = marker(g, 0, 1.0, 0.22);
        return;
      case 'ceremonyArch':
        for (const sx of [-1, 1]) part(g, cyl(0.04, 0.04, 2.2, 8), WHITE, sx * (W / 2 - 0.15), 1.1, 0, { outline: false });
        {
          const arch = new THREE.Mesh(new THREE.TorusGeometry(W / 2 - 0.15, 0.04, 8, 24, Math.PI), toon(WHITE));
          arch.userData.ownGeometry = true;
          arch.position.y = 2.2;
          g.add(arch);
          for (let i = 0; i <= 10; i++) {
            const a = (i / 10) * Math.PI;
            part(g, ball(0.08), i % 3 ? '#f8bbd0' : '#fffde7', Math.cos(a) * (W / 2 - 0.15), 2.2 + Math.sin(a) * (W / 2 - 0.15), 0.03, { outline: false });
          }
        }
        out.work = marker(g, 0, 1.1, 0.2);
        return;
      case 'fireWatchTower':
        for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) part(g, cyl(0.03, 0.04, 2.4, 6), WOOD, x * 0.3, 1.2, z * 0.3, { rx: -z * 0.05, rz: x * 0.05, outline: false });
        part(g, rbox(0.8, 0.06, 0.8, 0.01), WOOD, 0, 2.4, 0);
        part(g, rbox(0.8, 0.5, 0.8, 0.02), '#c62828', 0, 2.95, 0);
        part(g, new THREE.ConeGeometry(0.6, 0.4, 4), '#5d4037', 0, 3.4, 0, { ry: Math.PI / 4 });
        out.work = marker(g, 0, 1.0, 0.4);
        return;
      case 'thinningSite':
        for (let i = 0; i < 3; i++) part(g, cyl(0.12, 0.14, 0.25, 12), '#8d6e63', -W / 2 + 0.4 + i * 0.6, 0.12, (i % 2) * 0.2 - 0.1);
        for (let i = 0; i < 3; i++) part(g, cyl(0.08, 0.08, 1.2, 10), '#a1887f', 0.1, 0.08 + i * 0.15, 0.25 - (i % 2) * 0.05, { rz: Math.PI / 2, ry: 0.1 });
        part(g, ball(0.35), '#5ea64e', W / 2 - 0.4, 1.4, -0.2);
        part(g, cyl(0.07, 0.09, 1.2, 8), '#8a5a36', W / 2 - 0.4, 0.6, -0.2);
        out.work = marker(g, 0, 0.4, 0.4);
        return;
      case 'shellLine':
      case 'diveSpot':
      case 'bulteok': {
        if (id === 'bulteok') {
          // A ring of stacked black stones round a fire.
          for (let i = 0; i < 14; i++) {
            const a = (i / 14) * Math.PI * 2;
            if (a > Math.PI * 0.35 && a < Math.PI * 0.65) continue;
            for (let k = 0; k < 3; k++) part(g, ball(0.16 - k * 0.02), k % 2 ? '#37474f' : '#455a64', Math.cos(a) * (W / 2 - 0.3), 0.12 + k * 0.2, Math.sin(a) * (D / 2 - 0.2), { outline: k === 2 });
          }
          part(g, cyl(0.25, 0.3, 0.1, 12), '#3e2723', 0, 0.05, 0);
          out.work = marker(g, 0, 0.4, 0.2);
          return;
        }
        const w = new THREE.Mesh(box(W - 0.1, 0.03, D - 0.1), toon('#4fa3d1'));
        w.position.y = 0.02;
        g.add(w);
        if (id === 'shellLine') {
          for (let x = -W / 2 + 0.3; x < W / 2 - 0.2; x += 0.4) part(g, ball(0.08), '#ff7043', x, 0.08, 0);
          part(g, cyl(0.015, 0.015, W - 0.3, 6), '#eceff1', 0, 0.08, 0, { rz: Math.PI / 2, outline: false });
          for (const x of [-W / 2 + 0.25, W / 2 - 0.25]) part(g, rbox(0.35, 0.18, 0.35, 0.02), '#a1887f', x, 0.12, -D / 2 + 0.3);
        } else {
          part(g, ball(0.18), '#ff7043', 0, 0.12, 0);
          part(g, cyl(0.01, 0.01, 0.5, 6), DARK, 0, 0.35, 0, { outline: false });
          part(g, new THREE.TorusGeometry(0.22, 0.05, 8, 16), '#ffffff', W / 2 - 0.4, 0.06, 0.1, { rx: Math.PI / 2 });
        }
        out.work = marker(g, 0, 0.2, D / 2 - 0.1);
        return;
      }
      case 'evacSlide': {
        part(g, rbox(W - 0.2, 0.8, 0.5, 0.05), '#90a4ae', 0, 0.4, -D / 2 + 0.3);
        part(g, rbox(W - 0.3, 0.2, 1.6, 0.1), '#ffb300', 0, 0.5, 0.1, { rx: 0.45 });
        out.work = marker(g, 0, 0.8, -D / 2 + 0.55);
        return;
      }
      case 'mockWall':
        part(g, rbox(W - 0.1, 2.2, 0.12, 0.01), '#e0d6c8', 0, 1.1, -D / 2 + 0.15);
        for (let x = -W / 2 + 0.2; x < W / 2 - 0.1; x += 0.4) part(g, box(0.05, 2.2, 0.1), WOOD, x, 1.1, -D / 2 + 0.25, { outline: false });
        part(g, rbox(0.2, 0.3, 0.06, 0.01), WHITE, 0.3, 1.1, -D / 2 + 0.3);
        out.work = marker(g, 0, 1.1, -D / 2 + 0.32);
        return;
      case 'scriptStand':
        part(g, cyl(0.15, 0.17, 0.03, 12), DARK, 0, 0.015, 0);
        part(g, cyl(0.015, 0.015, 1.1, 6), DARK, 0, 0.56, 0, { outline: false });
        part(g, rbox(0.45, 0.3, 0.02, 0.01), DARK, 0, 1.15, 0.05, { rx: -0.4 });
        part(g, box(0.38, 0.26, 0.005), WHITE, 0, 1.16, 0.065, { rx: -0.4, outline: false });
        out.work = marker(g, 0, 1.12, 0.1);
        return;
      case 'exerciseBall':
        part(g, ball(0.32), c, 0, 0.32, 0);
        part(g, rbox(0.6, 0.02, 0.9, 0.01), '#7e57c2', 0, 0.01, 0, { outline: false });
        out.work = marker(g, 0, 0.6, 0.3);
        return;
      case 'reformer': {
        const L = W - 0.1;
        part(g, rbox(L, 0.12, 0.6, 0.03), WOOD, 0, 0.25, 0);
        legs(g, L, 0.55, 0.2, DARK, 0.05, 0.02);
        part(g, rbox(0.7, 0.08, 0.5, 0.03), c, -0.2, 0.36, 0);
        part(g, cyl(0.02, 0.02, 0.5, 8), METAL, L / 2 - 0.15, 0.55, 0, { rx: Math.PI / 2, outline: false });
        for (const z of [-0.2, 0.2]) part(g, box(0.04, 0.3, 0.04), METAL, L / 2 - 0.15, 0.4, z, { outline: false });
        out.work = marker(g, 0, 0.45, 0.3);
        return;
      }
    }
    part(g, rbox(W - 0.12, 1.0, D - 0.16, 0.05), c, 0, 0.5, 0);
    out.work = marker(g, 0, 0.9, D / 2 - 0.08);
  },
};

