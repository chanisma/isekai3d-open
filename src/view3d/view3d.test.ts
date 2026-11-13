import * as THREE from 'three';
import { WORKPLACE_DETAIL } from './workplaces';
import { describe, expect, test } from 'vitest';
import { CATALOG, getDef } from '../game/catalog';
import { Game } from '../game/game';
import { LOT_PLANS, planTiles } from '../game/lots';
import type { DwellerSpec, Tile } from '../game/types';
import { computeRooms } from '../game/gfx/house';
import { between, edgeKey, edgeLot } from '../game/walls';
import { LEVEL_TILES, MAP_H, MAP_W, flight, footprintTiles, idx, stairwell } from '../game/world';
import { doing, motionOf } from './activity';
import { buildFurniture, kindOf } from './furniture3d';
import { RUG_DETAIL } from './rugs';
import { CLEANING_DETAIL } from './cleaningTools';
import { FLOOR_H, WALL_T, cutaway, edgeLines, edgeSpan } from './house3d';
import { stairHeight } from './lot3d';
import { facesFor, modelFor, npcRole, outfitFile, parseModel, PICKED_ONLY } from './vrm';
import { basicsFor, castOf, choicesFor, dressFor, garmentsFor, garmentsShown, hairShown, hairsByFace, hairsFor, heightOf, shownKinds } from './vrmLooks';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { figureLook } from '../game/looks';

/** A lot of lawn with one room walled in from (x0, y0) to (x1, y1), its door at the bottom middle. */
function room(x0: number, y0: number, x1: number, y1: number): Tile[] {
  const tiles = new Array<Tile>(LEVEL_TILES * 2).fill('grass');
  tiles.fill('void', LEVEL_TILES);
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) tiles[y * MAP_W + x] = x === x0 || x === x1 || y === y0 || y === y1 ? 'wall' : 'wood';
  tiles[y1 * MAP_W + Math.floor((x0 + x1) / 2)] = 'door';
  return tiles;
}

const SPECS: DwellerSpec[] = [{ name: '민준', gender: 'male' } as DwellerSpec];

/** A lot drawn the old way, walls a tile thick, with its walls laid on the lines (walls.ts). */
function laid(tiles: Tile[]) {
  return edgeLot(tiles, [], { floor: {}, wall: {} }, []);
}

describe('walls', () => {
  test('a room drawn with walls a tile thick keeps its floor, its walls on the lines round it', () => {
    const { tiles, walls } = laid(room(2, 2, 8, 7));
    // The old wall tiles are lawn now; the floor inside is as it was.
    expect(tiles[2 * MAP_W + 5]).toBe('grass');
    expect(tiles[4 * MAP_W + 5]).toBe('wood');
    expect(walls[edgeKey(5, 3, 'n')!]).toBe('wall');
    expect(walls[edgeKey(3, 4, 'w')!]).toBe('wall');
    expect(walls[edgeKey(7, 4, 'e')!]).toBe('wall');
    // The door in the south wall, on the line below the room.
    expect(walls[edgeKey(5, 6, 's')!]).toBe('door');
    expect(Object.values(walls).filter((k) => k === 'door').length).toBe(1);
    // Nothing on the lines inside the room or out on the lawn.
    expect(walls[edgeKey(5, 4, 'n')!]).toBeUndefined();
    expect(walls[edgeKey(5, 1, 'n')!]).toBeUndefined();
  });

  test('a wall between two rooms goes to one of them, and meets the outside wall at a T', () => {
    const t = room(2, 2, 10, 7);
    for (let y = 3; y < 7; y++) t[y * MAP_W + 6] = 'wall';
    const { tiles, walls } = laid(t);
    // Its tiles went to one room: one line between them, not two.
    expect(tiles[4 * MAP_W + 6]).toBe('wood');
    const left = walls[edgeKey(6, 4, 'w')!];
    const right = walls[edgeKey(6, 4, 'e')!];
    expect([left, right].filter(Boolean)).toEqual(['wall']);
    // Two rooms, the line running from the north wall to the south one.
    expect(new Set(computeRooms(tiles, walls).filter((r) => r !== 'outside')).size).toBe(2);
  });

  test('corners close without walls overlapping: along x reaches past a corner, along z stops at its face', () => {
    const { walls } = laid(room(2, 2, 8, 7));
    const north = edgeLines(walls, 0).find((l) => l.key === edgeKey(3, 3, 'n'))!;
    const west = edgeLines(walls, 0).find((l) => l.key === edgeKey(3, 3, 'w'))!;
    const middle = edgeLines(walls, 0).find((l) => l.key === edgeKey(5, 3, 'n'))!;
    expect(edgeSpan(walls, 0, north)).toEqual([3 - WALL_T / 2, 4]);
    expect(edgeSpan(walls, 0, middle)).toEqual([5, 6]);
    expect(edgeSpan(walls, 0, west)).toEqual([3 + WALL_T / 2, 4]);
  });

  test('cutaway lowers the walls with a room behind them, as the camera looks', () => {
    const { tiles, walls } = laid(room(2, 2, 8, 7));
    // Looking north-west (from the south-east): the south and east walls go, the north and west stay.
    const cut = cutaway(walls, tiles, 0, -1, -1);
    expect(cut.has(edgeKey(4, 6, 's')!)).toBe(true);
    expect(cut.has(edgeKey(7, 4, 'e')!)).toBe(true);
    expect(cut.has(edgeKey(4, 3, 'n')!)).toBe(false);
    expect(cut.has(edgeKey(3, 4, 'w')!)).toBe(false);
    // Turned round, the other way about.
    const back = cutaway(walls, tiles, 0, 1, 1);
    expect(back.has(edgeKey(4, 3, 'n')!)).toBe(true);
    expect(back.has(edgeKey(4, 6, 's')!)).toBe(false);
  });

  test('every home keeps its rooms, its doors and windows, with nothing standing across a wall', () => {
    for (const plan of LOT_PLANS) {
      const g = Game.create(SPECS, () => 0.5, 'normal', plan.id);
      const old = planTiles(plan);
      const rooms = (r: string[]) => new Set(r.filter((x) => x !== 'outside')).size;
      expect(rooms(computeRooms(g.tiles, g.walls)), plan.id).toBe(rooms(computeRooms(old)));
      expect(Object.values(g.walls).filter((k) => k === 'door').length, plan.id).toBe(plan.doors.length + (plan.upper?.doors.length ?? 0));
      expect(Object.values(g.walls).filter((k) => k === 'window').length, plan.id).toBe(plan.windows.length + (plan.upper?.windows.length ?? 0));
      expect(g.tiles.some((t) => t === 'wall' || t === 'door'), plan.id).toBe(false);
      for (const o of g.state.objects) {
        const fp = footprintTiles(getDef(o.defId), o.x, o.y, o.dir);
        expect(fp.some((p) => fp.some((q) => between(g.walls, p, q))), `${plan.id} ${o.defId}`).toBe(false);
      }
    }
  });
});

describe('furniture', () => {
  test('every object in the catalogue builds, most of them as something more than a box', () => {
    // Pieces drawn by a builder of their own (the workplace pipeline, 2026-10-26) aren't boxes, whatever their family.
    const generic = CATALOG.filter((d) => kindOf(d) === 'machine' && !WORKPLACE_DETAIL[d.id] && !d.lookOf && !RUG_DETAIL[d.id] && !CLEANING_DETAIL[d.id]);
    for (const def of CATALOG) {
      const b = buildFurniture(def, { againstWall: false });
      expect(b.root.children.length, def.id).toBeGreaterThan(0);
    }
    expect(generic.length / CATALOG.length).toBeLessThan(0.3);
  });

  test('families by id', () => {
    expect(kindOf(getDef('bed'))).toBe('bed');
    expect(kindOf(getDef('doubleBed'))).toBe('bed');
    expect(kindOf(getDef('gardenBed'))).toBe('garden');
    expect(kindOf(getDef('sofa'))).toBe('sofa');
    expect(kindOf(getDef('diningChair'))).toBe('chair');
    expect(kindOf(getDef('computer'))).toBe('computer');
    expect(kindOf(getDef('fridge'))).toBe('fridge');
    expect(kindOf(getDef('toilet'))).toBe('toilet');
    expect(kindOf(getDef('stairs'))).toBe('stairs');
    expect(kindOf(getDef('tv'))).toBe('tv');
    expect(kindOf(getDef('paintingLandscape'))).toBe('art');
  });
});

describe('stairs', () => {
  test('dwellers climb the flight from its foot to the middle of its top tile, where the landing upstairs takes over', () => {
    const g = Game.create(SPECS, () => 0.5, 'off', 'family');
    const stairs = g.state.objects.find((o) => o.defId === 'stairs')!;
    const { foot, top } = g.stairEnds(stairs);
    expect(stairHeight(g, foot.x, foot.y)).toBeGreaterThan(0);
    expect(stairHeight(g, foot.x, foot.y)).toBeLessThan(FLOOR_H / 2);
    // The head of the flight is level with the floor above (the landing on the same tile).
    expect(stairHeight(g, top.x, top.y - MAP_H)).toBeCloseTo(FLOOR_H);
    expect(stairHeight(g, 0, 0)).toBe(0);
  });
});

describe('VRoid characters', () => {
  const files = ['female-adult-sample_a.vrm', 'male-adult-sample_c.vrm', 'female-adult-sample_a@sleep.vrm', 'readme.txt', 'female-child-mina.vrm'];
  const all = files.map(parseModel).filter((m) => m !== null);

  test('named by gender, life stage and name, with outfits after an @', () => {
    expect(parseModel('female-adult-sample_a@sleep.vrm')).toMatchObject({ gender: 'female', stage: 'adult', name: 'sample_a', outfit: 'sleep' });
    expect(parseModel('readme.txt')).toBeNull();
    expect(all).toHaveLength(4);
  });

  test('a dweller is played by one of their own gender and stage; teens and elders borrow a grown-up', () => {
    expect(modelFor(all, 'female', 'adult', 3)?.base.file).toBe('female-adult-sample_a.vrm');
    expect(modelFor(all, 'female', 'child', 3)?.base.file).toBe('female-child-mina.vrm');
    // A child who comes as a client is a child, not the grown-up cast of clients.
    expect(modelFor(all, 'female', 'child', 3, 'client')?.base.stage).toBe('child');
    expect(modelFor(all, 'male', 'teen', 1)).toMatchObject({ base: { file: 'male-adult-sample_c.vrm' }, scale: 0.95 });
    expect(modelFor(all, 'male', 'toddler', 1)).toBeNull();
    expect(modelFor([], 'female', 'adult', 1)).toBeNull();
  });

  test('visitors with a role are played by the characters kept for it, who play nobody else', () => {
    const cast = [...all, ...['male-adult-dosu.vrm', 'female-adult-sunhee.vrm'].map(parseModel).filter((m) => m !== null)];
    expect(parseModel('male-adult-dosu.vrm')).toEqual({ file: 'male-adult-dosu.vrm', gender: 'male', stage: 'adult', name: 'dosu' });
    expect(parseModel('male-adult-npc_hair_crop.vrm')).toMatchObject({ name: 'npc_hair_crop', kept: 'hair' });
    expect(npcRole({ role: 'burglar' })).toBe('burglar');
    expect(npcRole({ role: 'service', service: 'maid' })).toBe('maid');
    expect(npcRole({ role: 'coworker', boss: true })).toBe('boss');
    expect(npcRole({ role: 'walkby' })).toBeUndefined();
    expect(modelFor(cast, 'male', 'adult', 7, 'burglar')?.base.file).toBe('male-adult-dosu.vrm');
    // A role with only the other gender's character: that one.
    expect(modelFor(cast, 'female', 'adult', 7, 'burglar')?.base.file).toBe('male-adult-dosu.vrm');
    // Household dwellers never get an NPC's character.
    for (let id = 0; id < 6; id++) expect(PICKED_ONLY.has(modelFor(cast, 'male', 'adult', id)!.base.name)).toBe(false);
    // Their younger and older selves (faces a dweller can have) never come on the visit.
    const ages = [...cast, ...['male-child-dosu.vrm', 'male-elder-dosu.vrm'].map((f) => parseModel(f)!)];
    for (let id = 0; id < 6; id++) expect(modelFor(ages, 'male', 'adult', id, 'burglar')?.base.file).toBe('male-adult-dosu.vrm');
    // No one kept for a role: an ordinary character.
    expect(modelFor(cast, 'male', 'adult', 1, 'reaper')?.base.file).toBe('male-adult-sample_c.vrm');
    // Our own characters are played before the VRoid samples.
    const withOwn = [...cast, parseModel('female-adult-mina.vrm')!];
    for (let id = 0; id < 4; id++) expect(modelFor(withOwn, 'female', 'adult', id)?.base.file).toBe('female-adult-mina.vrm');
  });

  test('a star at work (a coworker) is their own character, not the coworkers’ cast', () => {
    // 2026-10-26 (at the user's request): 루미나 at work came as 지원.
    const cast = [...all, ...['female-adult-jiwon.vrm', 'male-adult-minho.vrm', 'female-adult-star_lumina.vrm'].map((f) => parseModel(f)!)];
    expect(modelFor(cast, 'female', 'adult', 4901, 'coworker')?.base.file).toBe('female-adult-jiwon.vrm');
    expect(modelFor(cast, 'female', 'adult', 4901, 'coworker', 'star_lumina')?.base.file).toBe('female-adult-star_lumina.vrm');
    expect(castOf(cast, figureLook({ gender: 'female', age: 'adult' } as never), { id: 4901, face: 'star_lumina', role: 'coworker', work: { id: 'actor', set: 'casual' } as never }, undefined)).toMatchObject({ file: 'female-adult-star_lumina.vrm', dress: {} });
  });

  test('changing for bed picks the pyjama version when there is one', () => {
    const base = modelFor(all, 'female', 'adult', 0)!.base;
    expect(outfitFile(all, base, 'sleep')).toBe('female-adult-sample_a@sleep.vrm');
    expect(outfitFile(all, base, 'athletic')).toBe(base.file);
  });

  test('a character is dressed as the dweller looks: skin, hair, top and bottom, borrowed where it has none', () => {
    const cast = ['female-adult-mina.vrm', 'female-adult-mina@sleep.vrm', 'female-adult-eunji.vrm', 'female-adult-sora.vrm', 'male-adult-jiho.vrm', 'male-adult-dosu.vrm', 'female-child-mina.vrm']
      .map(parseModel)
      .filter((m) => m !== null);
    const mina = cast[0];
    const look = (p: object) => figureLook({ gender: 'female', skin: '#8d5a3b', hair: '#e0b04a', shirt: '#1e88e5', pants: '#2e7d32', ...p });
    // Her own bob and dress, only coloured.
    expect(dressFor(cast, mina, look({ hairStyle: 'bob', outfit: 'dress' }), undefined, 0)).toEqual({
      file: 'female-adult-mina.vrm',
      dress: { skin: '#8d5a3b', hair: { color: '#e0b04a' }, tops: { color: '#1e88e5' } },
    });
    // A ponytail from a character of her stage who has one (an NPC lends hair too).
    expect(dressFor(cast, mina, look({ hairStyle: 'ponytail', outfit: 'dress' }), undefined, 0).dress.hair).toEqual({ color: '#e0b04a', from: 'female-adult-eunji.vrm' });
    // Never a man's hair: spiky, which only the burglar has, leaves her own.
    expect(dressFor(cast, mina, look({ hairStyle: 'spiky', outfit: 'dress' }), undefined, 0).dress.hair?.from).toBeUndefined();
    // And never a woman's on a man: no buns for 지호, but the short crop from the hair-only file.
    const jiho = cast.find((m) => m.name === 'jiho')!;
    const dain = parseModel('female-adult-dain.vrm')!;
    const crop = parseModel('male-adult-npc_hair_crop.vrm')!;
    const him = (p: object) => figureLook({ gender: 'male', skin: '#8d5a3b', hair: '#2b1b10', shirt: '#1e88e5', ...p });
    expect(dressFor([...cast, dain, crop], jiho, him({ hairStyle: 'bun' }), undefined, 0).dress.hair?.from).toBe('male-adult-npc_hair_crop.vrm');
    expect(dressFor([...cast, dain, crop], jiho, him({ hairStyle: 'crop' }), undefined, 0).dress.hair?.from).toBe('male-adult-npc_hair_crop.vrm');
    expect(choicesFor([...cast, dain, crop], jiho, him({ hairStyle: 'short' }))!.hair).not.toContain('bun');
    // Curly is nearest a bob, which a woman has.
    const jiwon = parseModel('female-adult-jiwon.vrm')!;
    const woojin = parseModel('male-adult-woojin.vrm')!;
    expect(dressFor([...cast, jiwon, woojin], mina, look({ hairStyle: 'curly', outfit: 'tee' }), undefined, 0).dress.hair).toEqual({ color: '#e0b04a' });
    // NPCs don't lend clothes: no one else of hers has a tee, so the dress stays.
    expect(dressFor(cast, mina, look({ hairStyle: 'bob', outfit: 'tee', bottom: 'shorts' }), undefined, 0).dress.tops).toEqual({ color: '#1e88e5' });
    // An outfit she has a file for is that file; one a child has none for is borrowed whole from someone of her stage who has.
    expect(dressFor(cast, mina, look({ hairStyle: 'bob' }), 'sleep', 0).file).toBe('female-adult-mina@sleep.vrm');
    const yuna = parseModel('female-adult-yuna.vrm')!;
    expect(dressFor([...cast, yuna], yuna, look({}), 'sleep', 0)).toMatchObject({ file: 'female-adult-yuna.vrm', dress: { tops: { from: 'female-adult-mina@sleep.vrm' }, bottoms: { from: 'female-adult-mina@sleep.vrm' } } });
    // Several who have it: picked by the dweller's id; never a man's.
    const more = [...cast, yuna, parseModel('female-adult-hana@sleep.vrm')!, parseModel('male-adult-jiho@sleep.vrm')!];
    expect(dressFor(more, yuna, look({}), 'sleep', 1).dress.tops?.from).toBe('female-adult-hana@sleep.vrm');
    expect(dressFor(more, yuna, look({}), 'sleep', 2).dress.tops?.from).toBe('female-adult-mina@sleep.vrm');
  });

  test('hair is picked by number, each a hair of its own: whose it is, kept as she grows where there is one', () => {
    const roster = readdirSync('models').map(parseModel).filter((m) => m !== null);
    const at = (g: string, st: string, n: string) => roster.find((m) => !m.outfit && m.gender === g && m.stage === st && m.name === n)!;
    const mina = at('female', 'adult', 'mina');
    // 서아's and 미나's own hair are there; 순희's (지원's) isn't twice.
    expect(hairsFor(roster, mina)).toEqual(['mina', 'hana', 'seoa', 'dain', 'jiyu', 'eunji', 'jiwon', 'yuna', 'sora']);
    expect(hairsFor(roster, at('male', 'adult', 'jiho'))).toEqual(['jiho', 'junho', 'woojin', 'taeo', 'saja', 'dosu', 'gisu', 'minho']);
    // No two numbers the same hair (its meshes and bones in the file; a character's own is on their full body).
    const hairOf = (file: string) => {
      const base = file.replace(/\.vrm$/, '@base.vrm');
      const b = readFileSync(`models/${existsSync(`models/${base}`) ? base : file}`);
      const j = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString()) as { nodes: Array<{ name?: string }>; meshes: Array<{ primitives: Array<{ material?: number; attributes: { POSITION: number } }> }>; materials: Array<{ name: string }>; accessors: Array<{ count: number }> };
      const bones = j.nodes.filter((n) => n.name?.includes('Hair')).length;
      const verts = j.meshes.flatMap((m) => m.primitives).filter((p) => p.material !== undefined && /hair/i.test(j.materials[p.material].name)).map((p) => j.accessors[p.attributes.POSITION].count);
      return `${bones}:${Math.max(...verts)}`;
    };
    for (const m of roster.filter((x) => !x.outfit && !x.name.startsWith('sample'))) {
      const seen = hairsFor(roster, m).map((n) => hairOf(at(m.gender, m.stage, n).file));
      expect(new Set(seen).size, `${m.gender}-${m.stage}`).toBe(seen.length);
    }
    // 미나 in 서아's hair, and the number shown is 서아's.
    const look = (p: object) => figureLook({ gender: 'female', age: 'adult', skin: '#8d5a3b', hair: '#e0b04a', shirt: '#1e88e5', hairStyle: 'ponytail', ...p });
    const dress = dressFor(roster, mina, look({ hairFrom: 'seoa' }), undefined, 7).dress;
    expect(dress.hair).toEqual({ color: '#e0b04a', from: 'female-adult-seoa.vrm' });
    expect(hairShown(roster, mina, dress)).toBe('seoa');
    expect(hairShown(roster, mina, dressFor(roster, mina, look({ hairFrom: 'mina' }), undefined, 7).dress)).toBe('mina');
    // 은지's hair is kept as she grows old (the role characters have every stage since 2026-10-25).
    const old = at('female', 'elder', 'mina');
    expect(dressFor(roster, old, look({ age: 'elder', hairFrom: 'eunji' }), undefined, 0).dress.hair?.from).toBe('female-elder-eunji.vrm');
  });

  test('clothes are garments of the characters of the stage, each worn as picked', () => {
    const roster = readdirSync('models').map(parseModel).filter((m) => m !== null);
    const mina = roster.find((m) => !m.outfit && m.gender === 'female' && m.stage === 'adult' && m.name === 'mina')!;
    // (The garment sets she can wear come after these: garments.test.ts.)
    const all = garmentsFor(roster, mina).filter((g) => !g.set);
    // Our five women's tops, the four bottoms (미나's dress has none) and five pairs of shoes, and the
    // role characters' like none of them: 순희's sweater vest, 유나's and 소라's shirts; 순희's, 지원's, 유나's
    // and 소라's bottoms; 유나's and 소라's shoes (지원's top is 하나's, her shoes and 은지's all 지유's; 순희's
    // maid dress is only for her visits, `@maid`).
    expect(all.filter((g) => g.piece === 'tops').map((g) => g.kind)).toEqual(['dress', 'shirt', 'sweater', 'jacket', 'hoodie', 'sweater', 'shirt', 'shirt']);
    expect(all.filter((g) => g.piece === 'bottoms').map((g) => g.key)).toEqual(['bottoms@female-adult-hana', 'bottoms@female-adult-seoa', 'bottoms@female-adult-dain', 'bottoms@female-adult-jiyu', 'bottoms@female-adult-sunhee', 'bottoms@female-adult-jiwon', 'bottoms@female-adult-yuna', 'bottoms@female-adult-sora']);
    expect(all.filter((g) => g.piece === 'shoes')).toHaveLength(7);
    expect(all.some((g) => g.from === 'female-adult-eunji')).toBe(false);
    // 미나 in 서아's sweater, 다인's trousers and 하나's shoes, and that is what is shown.
    const look = figureLook({ gender: 'female', age: 'adult', skin: '#8d5a3b', hair: '#e0b04a', shirt: '#1e88e5', outfit: 'sweater', bottom: 'pants', wear: { tops: 'female-adult-seoa', bottoms: 'female-adult-dain', shoes: 'female-adult-hana' } });
    const dress = dressFor(roster, mina, look, undefined, 3).dress;
    expect([dress.tops?.from, dress.bottoms?.from, dress.shoes?.from]).toEqual(['female-adult-seoa.vrm', 'female-adult-dain.vrm', 'female-adult-hana.vrm']);
    expect(garmentsShown(roster, mina, dress)).toEqual({ tops: 'tops@female-adult-seoa', bottoms: 'bottoms@female-adult-dain', shoes: 'shoes@female-adult-mina' });
    // In her own dress there's no bottom; grown old, a garment of the last stage is left for one of hers.
    expect(garmentsShown(roster, mina, dressFor(roster, mina, figureLook({ gender: 'female', age: 'adult', skin: '#8d5a3b', hair: '#e0b04a', shirt: '#1e88e5', outfit: 'dress' }), undefined, 0).dress)).toEqual({ tops: 'tops@female-adult-mina', shoes: 'shoes@female-adult-mina' });
    const old = roster.find((m) => !m.outfit && m.gender === 'female' && m.stage === 'elder' && m.name === 'mina')!;
    expect(dressFor(roster, old, { ...look, stage: 'elder' }, undefined, 0).dress.shoes?.from).toBeUndefined();
    // A man's shoes swapped for a better pair are still his shoes.
    const jiho = roster.find((m) => !m.outfit && m.gender === 'male' && m.stage === 'adult' && m.name === 'jiho')!;
    const him = dressFor(roster, jiho, figureLook({ gender: 'male', age: 'adult', skin: '#8d5a3b', hair: '#2b1b10', shirt: '#1e88e5', outfit: 'shirt', bottom: 'pants' }), undefined, 0).dress;
    expect(him.shoes?.from).toBe('male-adult-junho@athletic.vrm');
    expect(garmentsShown(roster, jiho, him).shoes).toBe('shoes@male-adult-jiho');
  });

  test('everyone has the basics: a tee (or the next best top), the first trousers and the first shoes; 사자 in his own slacks', () => {
    const roster = readdirSync('models').map(parseModel).filter((m) => m !== null);
    const at = (g: 'female' | 'male', s: string, n: string) => roster.find((m) => !m.outfit && m.gender === g && m.stage === s && m.name === n)!;
    const pairs = (g: 'female' | 'male', s: string, n: string) => garmentsFor(roster, at(g, s, n)).filter((x) => x.piece === 'shoes' && !x.set).map((x) => x.from);
    // Each pair once (미나's, 하나's, 서아's and 다인's flats are one pair), sneakers among a woman's.
    expect(pairs('female', 'adult', 'mina')).toEqual(['female-adult-mina', 'female-adult-hana@athletic', 'female-adult-jiyu@athletic', 'female-adult-jiyu', 'female-adult-hana@formal', 'female-adult-yuna', 'female-adult-sora']);
    expect(pairs('male', 'adult', 'jiho').slice(0, 2)).toEqual(['male-adult-jiho', 'male-adult-junho']);
    expect(pairs('male', 'adult', 'jiho')).not.toContain('male-adult-woojin');
    // Sneakers worn, shown as worn, coloured as picked.
    const mina = at('female', 'adult', 'mina');
    const inSneakers = figureLook({ gender: 'female', age: 'adult', skin: '#8d5a3b', hair: '#e0b04a', shirt: '#1e88e5', outfit: 'tee', bottom: 'pants', shoeColor: '#e53935', wear: { shoes: 'female-adult-hana@athletic' } });
    const worn = dressFor(roster, mina, inSneakers, undefined, 3).dress;
    expect(worn.shoes).toEqual({ from: 'female-adult-hana@athletic.vrm', color: '#e53935' });
    expect(garmentsShown(roster, mina, worn).shoes).toBe('shoes@female-adult-hana@athletic');
    // Old saves in a pair that's the same: the one offered is shown as on.
    const seoas = figureLook({ gender: 'female', age: 'adult', skin: '#8d5a3b', hair: '#e0b04a', shirt: '#1e88e5', outfit: 'tee', bottom: 'pants', wear: { shoes: 'female-adult-seoa' } });
    expect(garmentsShown(roster, mina, dressFor(roster, mina, seoas, undefined, 3).dress).shoes).toBe('shoes@female-adult-mina');
    // Hair numbered as the faces, one for each.
    const faces = facesFor(roster, 'female', 'adult');
    expect(hairsByFace(roster, mina, faces)).toEqual(faces);
    const hisFaces = facesFor(roster, 'male', 'adult');
    expect(hairsByFace(roster, at('male', 'adult', 'jiho'), hisFaces).slice(0, hisFaces.length)).toEqual(hisFaces);
    const keys = (b: ReturnType<typeof basicsFor>) => [b.tops?.key, b.bottoms?.key, b.shoes?.key];
    expect(keys(basicsFor(roster, at('male', 'adult', 'jiho')))).toEqual(['tops@male-adult-woojin', 'bottoms@male-adult-jiho', 'shoes@male-adult-jiho']);
    // No grown woman wears a tee: 하나's shirt.
    expect(keys(basicsFor(roster, at('female', 'adult', 'mina')))).toEqual(['tops@female-adult-hana', 'bottoms@female-adult-hana', 'shoes@female-adult-mina']);
    const saja = at('male', 'adult', 'saja');
    const look = figureLook({ gender: 'male', age: 'adult', skin: '#8d5a3b', hair: '#2b1b10', shirt: '#1e88e5', outfit: 'jacket', bottom: 'pants' });
    // His robe had no bottoms and he wore those trousers; since 2026-10-25 he has everyday clothes (the robe is `@reaper`).
    for (const id of [0, 1, 2, 3]) expect(garmentsShown(roster, saja, dressFor(roster, saja, { ...look, top: 'shirt' }, undefined, id).dress).bottoms).toBe('bottoms@male-adult-saja');
  });

  test('a face made again keeps showing in an outfit (its own outfit file’s clothes on its model); men get shoes that suit', () => {
    const cast = ['male-adult-woojin.vrm', 'male-adult-woojin@sleep.vrm', 'male-adult-woojin@bathing.vrm', 'male-adult-junho@bathing.vrm', 'male-adult-jiho.vrm', 'male-adult-jiho@sleep.vrm', 'male-adult-junho@athletic.vrm', 'male-adult-woojin@athletic.vrm']
      .map(parseModel)
      .filter((m) => m !== null);
    const [woojin] = cast;
    const jiho = cast.find((m) => m.file === 'male-adult-jiho.vrm')!;
    const look = figureLook({ gender: 'male', skin: '#f8d9c0', hair: '#2b1b10', shirt: '#1e88e5' });
    // 우진 (face made again): his model, his pyjamas on it; his yukata swapped for 준호's jinbei.
    expect(dressFor(cast, woojin, look, 'sleep', 0)).toMatchObject({ file: 'male-adult-woojin.vrm', dress: { tops: { from: 'male-adult-woojin@sleep.vrm' }, bottoms: { from: 'male-adult-woojin@sleep.vrm' } } });
    expect(dressFor(cast, woojin, look, 'bathing', 0).dress.tops?.from).toBe('male-adult-junho@bathing.vrm');
    // 지호: his own outfit file, whole.
    expect(dressFor(cast, jiho, look, 'sleep', 0).file).toBe('male-adult-jiho@sleep.vrm');
    // Everyday, the wedge sandals are swapped: sneakers for 지호 and 우진.
    expect(dressFor(cast, jiho, look, undefined, 0).dress.shoes?.from).toBe('male-adult-junho@athletic.vrm');
    expect(dressFor(cast, woojin, look, undefined, 0).dress.shoes?.from).toBe('male-adult-woojin@athletic.vrm');
  });

  test('a picked face, its own clothes and an eye colour', () => {
    const all = ['female-adult-hana.vrm', 'female-adult-mina.vrm', 'female-adult-seoa.vrm', 'female-adult-sample_a.vrm', 'female-adult-sunhee.vrm', 'female-adult-sunhee@maid.vrm', 'female-teen-hana.vrm', 'female-adult-mina@sleep.vrm']
      .map(parseModel)
      .filter((m) => m !== null);
    // Ours, then the NPCs' (not the samples).
    expect(facesFor(all, 'female', 'adult')).toEqual(['hana', 'mina', 'seoa', 'sunhee']);
    // An elder with none of theirs: a grown-up's face.
    expect(facesFor(all, 'female', 'elder')).toEqual(['hana', 'mina', 'seoa', 'sunhee']);
    expect(facesFor(all, 'female', 'child')).toEqual([]);
    const look = figureLook({ gender: 'female', skin: '#8d5a3b', hair: '#e0b04a', shirt: '#1e88e5', hairStyle: 'long', outfit: 'tee' });
    // The face picked whatever the id; one that isn't there, by id as before.
    for (const id of [0, 1, 2]) expect(castOf(all, look, { id, face: 'seoa' }, undefined)?.base.name).toBe('seoa');
    // An NPC's face, picked: dressed as any dweller (hair in the dweller's colour), never dealt out by id.
    const maid = castOf(all, look, { id: 1, face: 'sunhee' }, undefined)!;
    expect([maid.base.name, maid.dress.hair?.color]).toEqual(['sunhee', '#e0b04a']);
    for (const id of [0, 1, 2, 3]) expect(PICKED_ONLY.has(castOf(all, look, { id }, undefined)!.base.name)).toBe(false);
    // On her visit she's as she is, in her maid's dress (`@maid`); a dweller with her face isn't.
    expect(castOf(all, look, { id: 1, role: 'maid' }, undefined)).toMatchObject({ file: 'female-adult-sunhee@maid.vrm', dress: {} });
    expect(maid.file).not.toBe('female-adult-sunhee@maid.vrm');
    expect(facesFor(all, 'female', 'adult')).not.toContain('sunhee@maid');
    expect(castOf(all, look, { id: 1, face: 'nobody' }, undefined)?.base.name).toBe(modelFor(all, 'female', 'adult', 1)!.base.name);
    expect(castOf(all, look, { id: 0, face: 'seoa', eyes: '#2f6fae' }, undefined)!.dress.eyes).toBe('#2f6fae');
    expect(castOf(all, look, { id: 0, face: 'seoa' }, undefined)!.dress.tops?.color).toBe('#1e88e5');
    // What's shown when no one of her stage wears it: a hoodie and shorts come out as hana's shirt and trousers.
    const hoodie = castOf(all, figureLook({ gender: 'female', skin: '#8d5a3b', hair: '#e0b04a', shirt: '#1e88e5', outfit: 'hoodie', bottom: 'shorts' }), { id: 0, face: 'seoa' }, undefined)!;
    expect(shownKinds(all, hoodie.base, hoodie.dress)).toEqual({ top: 'sweater', bottom: 'pants' });
    // Mina's own dress, kept when there's no bottom to put on.
    const mina = castOf(all, look, { id: 0, face: 'mina' }, undefined)!;
    expect(shownKinds(all, mina.base, mina.dress).top).toBe('shirt');
    // The edit window offers only what's there: their stage's tops and bottoms, and hair from anyone of it.
    const can = choicesFor(all, mina.base, look)!;
    expect(can.tops.sort()).toEqual(['dress', 'shirt', 'sweater']);
    expect(can.bottoms.sort()).toEqual(['pants', 'skirt']);
    expect(can.hair).toContain('bob');
    expect(can.hair).not.toContain('twintails');
  });

  test('dwellers of a household are not all one height', () => {
    const hs = [1, 2, 3, 4, 5, 6, 7].map((id) => heightOf(id, 'adult'));
    expect(new Set(hs).size).toBeGreaterThan(3);
    for (const h of hs) expect(Math.abs(h - 1)).toBeLessThanOrEqual(0.031);
  });
});

test('lot rows: a level is MAP_H rows', () => {
  expect(LEVEL_TILES).toBe(MAP_W * MAP_H);
});

describe('dwellers meet the furniture', () => {
  test('each kind of use gets its motion', () => {
    expect(motionOf('game', 'computer', false)).toBe('type');
    expect(motionOf('studyScience', 'desk', false)).toBe('write');
    expect(motionOf('cook', 'stove', false)).toBe('stir');
    expect(motionOf('wash', 'sink', false)).toBe('scrub');
    expect(motionOf('read', 'shelf', false)).toBe('read');
    expect(motionOf('snack', 'fridge', false)).toBe('rummage');
    expect(motionOf('relax', 'sofa', true)).toBe('lap');
    expect(motionOf('use', 'toilet', true)).toBe('knees');
    expect(motionOf('eat', 'chair', true)).toBe('eat');
    expect(motionOf('repair', 'stove', false)).toBe('tinker');
    expect(motionOf('shower', 'shower', false)).toBe('lather');
  });

  test('the hands go to the work: on the keys, either side of the middle', () => {
    const work = { point: new THREE.Vector3(3, 0.79, 2), across: new THREE.Vector3(1, 0, 0), floor: 0 };
    const d = doing('type', { base: new THREE.Vector3(3, 0.48, 2.45), yaw: Math.PI, height: 1.55, sitting: true }, work, 1.3, 1);
    for (const h of [d.reach!.l!, d.reach!.r!]) expect(h.distanceTo(work.point)).toBeLessThan(0.2);
    expect(Math.sign(d.reach!.l!.x - 3)).toBe(-Math.sign(d.reach!.r!.x - 3));
    // Reading holds a book up in front of them.
    const r = doing('read', { base: new THREE.Vector3(0, 0, 0), yaw: 0, height: 1.6, sitting: false }, null, 0, 1);
    expect(r.prop?.kind).toBe('book');
    expect(r.prop!.at.z).toBeGreaterThan(0.2);
  });

  test('a desk has its chair pulled up and somewhere for the hands; the chair is no part of what they stand up to', () => {
    for (const id of ['computer', 'studyDesk']) {
      const b = buildFurniture(getDef(id), { againstWall: true });
      const front = b.body.max.z;
      expect(b.seat, id).toBeDefined();
      expect(b.work!.position.z, id).toBeLessThan(front);
      expect(b.seat!.position.z - front, id).toBeLessThan(0.35);
      expect(b.seat!.position.z, id).toBeGreaterThan(front - 0.05);
    }
    expect(buildFurniture(getDef('fridge'), { againstWall: true }).doors).toHaveLength(1);
    // The side-by-side fridge's two doors are hung on opposite sides.
    expect(buildFurniture(getDef('deluxeFridge'), { againstWall: true }).doors!.map((d) => d.userData.swing)).toEqual([-1, 1]);
    expect(buildFurniture(getDef('bed'), { againstWall: true }).cover).toBeDefined();
    expect(buildFurniture(getDef('stove'), { againstWall: true }).inUse).toBeDefined();
  });

  test('the covers rise over a sleeper and lie flat without one', () => {
    const c = buildFurniture(getDef('bed'), { againstWall: true }).cover!;
    const top = () => Math.max(...(c.mesh.geometry.attributes.position.array as Float32Array).filter((_, i) => i % 3 === 1));
    expect(top()).toBeCloseTo(0, 2);
    c.shape([0]);
    expect(top()).toBeGreaterThan(0.15);
  });
});

describe('equipment and floors', () => {
  test('a rug is as big as it says, and flat', () => {
    const size = new THREE.Vector3();
    const big = new THREE.Box3().setFromObject(buildFurniture(getDef('rugWoolNavy'), { againstWall: false }).root).getSize(size).clone();
    expect(big.x).toBeGreaterThan(2.5);
    expect(big.z).toBeGreaterThan(2.5);
    expect(big.y).toBeLessThan(0.05);
    expect(new THREE.Box3().setFromObject(buildFurniture(getDef('rugBathAqua'), { againstWall: false }).root).getSize(size).x).toBeLessThan(1);
  });

  test('the workplaces\' machines have shapes of their own: few are left as a plain box', () => {
    // Pieces drawn by a builder of their own (the workplace pipeline, 2026-10-26) aren't boxes, whatever their family.
    const generic = CATALOG.filter((d) => kindOf(d) === 'machine' && !WORKPLACE_DETAIL[d.id] && !d.lookOf && !RUG_DETAIL[d.id] && !CLEANING_DETAIL[d.id]);
    expect(generic.length / CATALOG.length).toBeLessThan(0.03);
    expect(kindOf(getDef('coffeeMaker'))).toBe('coffee');
    expect(kindOf(getDef('stereo'))).toBe('audio');
    expect(kindOf(getDef('ctScanner'))).toBe('scanner');
    expect(kindOf(getDef('radioBooth'))).toBe('booth');
    // A booth's chair and a simulator's seat are sat on to work.
    expect(buildFurniture(getDef('radioBooth'), { againstWall: true }).seat).toBeDefined();
    expect(buildFurniture(getDef('drivingSim'), { againstWall: false }).seat).toBeDefined();
    expect(buildFurniture(getDef('coffeeMaker'), { againstWall: true }).work).toBeDefined();
    // The treadmill's belt runs.
    expect(buildFurniture(getDef('treadmill'), { againstWall: false }).animate).toBeDefined();
  });

  test('the floor above a flight of stairs is open over it but its head, and only the foot is walked onto, from the front', () => {
    const g = Game.create(SPECS, () => 0.5, 'off', 'family');
    const st = g.state.objects.find((o) => o.defId === 'stairs')!;
    const { foot, front, head } = flight(st);
    const well = stairwell(g.state.objects, g.tiles);
    expect(well).toContain(idx(foot.x, foot.y + MAP_H));
    expect(well).not.toContain(idx(head.x, head.y + MAP_H));
    expect(g.blocked[idx(foot.x, foot.y + MAP_H)]).toBe(1);
    expect(g.blocked[idx(head.x, head.y)]).toBe(1);
    expect(g.blocked[idx(foot.x, foot.y)]).toBe(0);
    expect(g.stairGates.get(idx(foot.x, foot.y))).toBe(idx(front.x, front.y));
    // Nothing can be bought onto it.
    expect(g.canPlace('plant', foot.x, foot.y, 'down')).toBe(false);
    // Upstairs, furniture goes on the floor.
    const up = g.state.objects.filter((o) => o.y >= MAP_H);
    expect(up.length).toBeGreaterThan(3);
    expect(g.canPlace('plant', 8, 11 + MAP_H, 'down')).toBe(true);
  });
});
