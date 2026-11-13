import { describe, expect, it } from 'vitest';
import { roomAt } from './gfx/house';
import { Game } from './game';
import { STARTER, legacyPaint, planObjects, planTiles } from './lots';
import { edgeKey } from './walls';
import { idx } from './world';

const one = () => Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }]);

describe('build mode: wallpaper and floors', () => {
  it('repaints a room for the preset price, tile by tile', () => {
    const g = one();
    const money = g.state.money;
    const living = roomAt(10, 11);
    expect(g.paintRoom(living, 'floor', 'slateStone')).toBe(true);
    expect(g.paint.floor[idx(10, 11)]).toBe('slateStone');
    expect(g.paint.floor[idx(5, 4)]).toBe('lilacCarpet');
    expect(g.state.money).toBe(money - 240);
    expect(g.paintRoom(living, 'floor', 'slateStone')).toBe(false); // already that
    expect(g.paintRoom('outside', 'wall', 'redBrick')).toBe(false);
    // Every face of the living room's walls takes the paper; the bathroom's side of the same wall keeps its own.
    expect(g.paintRoom(living, 'wall', 'redBrick')).toBe(true);
    expect(g.paint.wall[`${idx(12, 9)}n`]).toBe('redBrick');
    expect(g.paint.wall[`${idx(2, 11)}w`]).toBe('redBrick');
    expect(g.paint.wall[`${idx(12, 8)}s`]).toBe('aquaTiles');
    g.state.money = 10;
    expect(g.paintRoom(roomAt(5, 4), 'wall', 'redBrick')).toBe(false);
  });

  it("carries an old save's per-room decor onto its tiles", () => {
    const tiles = planTiles(STARTER);
    const paint = legacyPaint(tiles, { living: { floor: 'walnutWood' }, bedroom: { wall: 'mintDots' } });
    expect(paint.floor[idx(10, 11)]).toBe('walnutWood');
    expect(paint.floor[idx(12, 4)]).toBe('aquaTile');
    expect(paint.wall[idx(5, 1)]).toBe('mintDots');
    expect(paint.wall[idx(10, 8)]).toBe('oakWainscot');
  });

  it("gives an old save the plan's windows, its garden as objects and its front door", () => {
    const g = one();
    const old = JSON.parse(JSON.stringify(g.state));
    for (const k of ['paint', 'windows', 'walls', 'lot', 'yardPlanted', 'tiles']) delete old[k];
    // Its furniture where the old house had it, walls a tile thick.
    old.objects = planObjects(STARTER, 1, 1).filter((o) => o.defId !== 'tree' && o.defId !== 'bush');
    old.decor = { kitchen: { floor: 'monoTile' } };
    const again = new Game(old);
    expect(again.state.lot?.frontDoor).toEqual({ x: 12, y: 14 });
    // The walls on the lines now: the front door on the edge above its step, where visitors wait.
    expect(again.walls[edgeKey(12, 13, 's')!]).toBe('door');
    expect(again.doorstep).toEqual({ x: 12, y: 14 });
    expect(again.exitTile).toEqual({ x: 12, y: 17 });
    expect(again.walls[edgeKey(3, 1, 's')!]).toBe('window');
    expect(again.state.objects.filter((o) => o.defId === 'tree').length).toBe(5);
    expect(again.paint.floor[idx(19, 4)]).toBe('monoTile');
    expect(again.state.decor).toBeUndefined();
  });
});
