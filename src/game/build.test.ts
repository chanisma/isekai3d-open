import { describe, expect, it } from 'vitest';
import { getDef } from './catalog';
import { roomAt } from './gfx/house';
import { Game } from './game';
import { pathTo, routeFrom } from './path';
import { edgeKey } from './walls';
import { footprintTiles } from './world';

describe('build mode walls (참고 게임 rooms from walls)', () => {
  it('finds the house rooms by their walls, and names them by what is in them', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
    const rooms = [roomAt(5, 4), roomAt(12, 4), roomAt(19, 4), roomAt(10, 11)];
    expect(new Set(rooms).size).toBe(4);
    expect(rooms.map((r) => g.roomName(r))).toEqual(['침실', '욕실', '부엌', '거실']);
    expect(roomAt(3, 16)).toBe('outside');
  });

  it('a wall across the living room makes a new room, a door joins it up, removing it merges', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
    g.state.money = 5000;
    // Down the line between columns 14 and 15, from the living room's top (row 9) to its bottom.
    expect(g.wallPlan(15, 9, 15, 14)).toMatchObject({ ok: true, cost: 5 * 40 });
    expect(g.buildWalls(15, 9, 15, 14)).toBe(true);
    expect(roomAt(14, 11)).not.toBe(roomAt(16, 11));
    expect([roomAt(14, 11), roomAt(16, 11)].every((r) => r.startsWith('room'))).toBe(true);
    // Walls take no tile: the floor either side is walked on, but not through the wall.
    expect(g.blocked[15 + 11 * 26]).toBe(0);
    const across = () => pathTo(routeFrom(g.blocked, 14, 11), 16, 11);
    // Shut off with no door: no way round either.
    expect(across()).toBeNull();
    expect(g.buildEdge('door', 15, 11, 'w')).toBe(true);
    expect(across()!.length).toBe(2);
    // Taking the door out leaves its wall; dragging along the line takes the wall down.
    expect(g.buildEdge('remove', 15, 11, 'w')).toBe(true);
    expect(g.walls[edgeKey(15, 11, 'w')!]).toBe('wall');
    expect(g.removePlan(15, 9, 15, 14)).toMatchObject({ ok: true, edges: expect.arrayContaining([edgeKey(15, 11, 'w')]) });
    expect(g.removeWalls(15, 9, 15, 14)).toBe(true);
    expect(roomAt(14, 11)).toBe(roomAt(16, 11));
    expect(g.removePlan(15, 9, 15, 14).ok).toBe(false);
    expect(g.state.money).toBe(5000 - 5 * 40 - 120);
  });

  it('keeps the layout in the save', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
    g.state.money = 5000;
    g.buildAt('floor', 3, 16);
    g.buildWalls(16, 15, 19, 15);
    const again = new Game(JSON.parse(JSON.stringify(g.state)));
    expect(again.tiles[3 + 16 * 26]).toBe('wood');
    expect(again.walls).toEqual(g.walls);
    expect(again.walls[edgeKey(17, 15, 'n')!]).toBe('wall');
  });
});

describe('build tools after 참고 게임 build mode', () => {
  const fresh = () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
    g.state.money = 10000;
    return g;
  };

  it('draws a room from corner to corner: walls on its outline, floor inside, paid for both', () => {
    const g = fresh();
    expect(g.roomPlan(1, 15, 5, 17).ok).toBe(false); // the bottom row is the lot's edge
    expect(g.roomPlan(2, 15, 2, 16).ok).toBe(false); // too small
    // Not across a sofa: its outline would cut it in two.
    const sofa = g.state.objects.find((o) => o.defId === 'sofa')!;
    const fp = footprintTiles(getDef(sofa.defId), sofa.x, sofa.y, sofa.dir);
    expect(g.roomPlan(fp[1].x, 9, fp[1].x + 3, 13).reason).toContain('걸쳐');
    // The living room's left end as a room of its own: one new wall, the others there already.
    const before = g.state.money;
    expect(g.buildRoom(2, 9, 6, 13)).toBe(true);
    expect(g.walls[edgeKey(6, 11, 'e')!]).toBe('wall');
    expect(g.walls[edgeKey(4, 9, 'n')!]).toBe('wall');
    expect(roomAt(4, 11)).not.toBe(roomAt(10, 11));
    expect(before - g.state.money).toBe(5 * 40);
  });

  it('draws walls in a straight line from corner to corner, or one where clicked', () => {
    const g = fresh();
    const before = g.state.money;
    // The longer way wins: a drag mostly along x builds along the row line.
    expect(g.buildWalls(16, 15, 20, 16)).toBe(true);
    for (let x = 16; x < 20; x++) expect(g.walls[edgeKey(x, 15, 'n')!]).toBe('wall');
    expect(before - g.state.money).toBe(4 * 40);
    // Over a wall already there: only the new part is paid for.
    expect(g.wallPlan(14, 15, 18, 15)).toMatchObject({ ok: true, cost: 2 * 40 });
    // One edge, as a click without a drag.
    expect(g.buildEdge('wall', 3, 16, 'e')).toBe(true);
    expect(g.walls[edgeKey(4, 16, 'w')!]).toBe('wall');
    expect(g.edgeProblem('wall', 3, 16, 'e')).toBe('이미 벽이 있어요');
    // Not along the lot's edge, nor across the path to the door.
    expect(g.wallPlan(0, 3, 0, 6).ok).toBe(false);
    expect(g.edgeProblem('wall', 12, 15, 's')).toBe('길을 막을 수는 없어요');
  });

  it('puts doors and windows only in walls, takes windows out again, and keeps the front door', () => {
    const g = fresh();
    const south = edgeKey(10, 13, 's')!;
    expect(g.walls[south]).toBe('wall');
    expect(g.buildEdge('window', 10, 13, 's')).toBe(true);
    expect(g.walls[south]).toBe('window');
    expect(g.buildEdge('window', 10, 13, 's')).toBe(true);
    expect(g.walls[south]).toBe('wall');
    expect(g.edgeProblem('door', 3, 16, 'n')).toBe('벽에만 문을 달 수 있어요');
    expect(g.edgeProblem('window', 5, 8, 's')).toBe('문에는 창문을 낼 수 없어요');
    expect(g.edgeProblem('remove', 12, 13, 's')).toBe('정문은 허물 수 없어요');
    // Dragged along the front wall, it all comes down but the front door.
    const front = g.removePlan(2, 14, 24, 14);
    expect(front.edges).not.toContain(edgeKey(12, 13, 's'));
    expect(front.edges.length).toBeGreaterThan(10);
    expect(g.removeLabel(edgeKey(12, 13, 's')!)).toBe('정문은 허물 수 없어요');
    expect(g.removeLabel(edgeKey(5, 8, 's')!)).toBe('🚪 문 떼기 (벽은 남아요)');
    expect(g.removeLabel(edgeKey(4, 13, 's')!)).toBe('🪟 창문 빼기 (벽은 남아요)');
    expect(g.removeLabel(edgeKey(10, 13, 's')!)).toBe('🔨 벽 허물기');
    // Paths and floor are laid and taken up tile by tile, as before.
    g.state.objects = g.state.objects.filter((o) => o.defId !== 'bush');
    expect(g.buildAt('path', 3, 15)).toBe(true);
    expect(g.tiles[3 + 15 * 26]).toBe('path');
    expect(g.buildAt('remove', 3, 15)).toBe(true);
    expect(g.tiles[3 + 15 * 26]).toBe('grass');
    // The path right outside the front door stays.
    expect(g.canBuild('remove', 12, 14)).toBe(false);
  });

  it('floor taken up and laid again takes the floor beside it', () => {
    const g = fresh();
    g.state.objects = g.state.objects.filter((o) => !(o.x === 12 && o.y === 4));
    // The bathroom's tiles: taken up, then laid again, they come back as the bathroom's.
    const i = 12 + 4 * 26;
    const was = [g.tiles[i], g.paint.floor[i]];
    expect(g.buildAt('remove', 12, 4)).toBe(true);
    expect(g.tiles[i]).toBe('grass');
    expect(g.buildAt('floor', 12, 4)).toBe(true);
    expect([g.tiles[i], g.paint.floor[i]]).toEqual(was);
    // Not from across a wall: the bedroom's carpet beside the bathroom wall stays out of it.
    expect(g.tiles[i]).not.toBe('carpet');
    // Out on the lawn, with no floor beside it: oak.
    expect(g.buildAt('floor', 3, 16)).toBe(true);
    expect(g.tiles[3 + 16 * 26]).toBe('wood');
    expect(g.paint.floor[3 + 16 * 26]).toBeUndefined();
  });

  it('shows a room repainted before paying for it', () => {
    const g = fresh();
    const living = roomAt(10, 11);
    const money = g.state.money;
    const preview = g.paintPreview(living, 'floor', 'slateStone');
    expect(preview.floor[10 + 11 * 26]).toBe('slateStone');
    expect(preview.floor[5 + 4 * 26]).toBe(g.paint.floor[5 + 4 * 26]);
    // Nothing paid or changed yet.
    expect(g.paint.floor[10 + 11 * 26]).not.toBe('slateStone');
    expect(g.state.money).toBe(money);
    expect(g.paintPreview(living, 'wall', 'redBrick').wall[`${10 + 9 * 26}n`]).toBe('redBrick');
  });

  it('a wall put up in a room takes its wallpaper, and taking it down takes its paper too', () => {
    const g = fresh();
    expect(g.buildWalls(15, 9, 15, 14)).toBe(true);
    const living = g.paint.wall[`${10 + 9 * 26}n`];
    expect(g.paint.wall[`${14 + 11 * 26}e`]).toBe(living);
    g.buildEdge('remove', 15, 11, 'w');
    expect(g.paint.wall[`${14 + 11 * 26}e`]).toBeUndefined();
  });
});

describe('empty land, built on before moving in (참고 게임 empty lots)', () => {
  it('buys land, builds a house on it while living at home, and moves in only once it has a room and a front door', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
    g.state.money = 20000;
    // Bare land can't be moved onto as it is.
    expect(g.homeOffer('emptyLot').ok).toBe(false);
    expect(g.moveTo('emptyLot')).toBe(false);
    expect(g.buyLand()).toBe(true);
    expect(g.state.money).toBe(16000);
    expect(g.lot.id).toBe('starter');
    const site = g.siteGame!;
    // Nothing on it but lawn, a path, trees and the mailbox; no one there.
    expect(Object.keys(site.walls)).toEqual([]);
    expect(site.state.dwellers).toEqual([]);
    expect(site.state.objects.map((o) => o.defId).sort()).toEqual(['mailbox', 'tree', 'tree', 'tree', 'tree']);
    expect(g.siteOffer().ok).toBe(false);
    expect(g.siteProblems()).toEqual(['벽으로 둘러싼 방이 없어요']);
    // Built there with the household's money, which shows at home.
    const plan = site.roomPlan(6, 8, 15, 13);
    expect(site.buildRoom(6, 8, 15, 13)).toBe(true);
    expect(g.state.money).toBe(16000 - plan.cost);
    expect(site.lotValue).toBe(4000 + plan.cost);
    expect(g.siteProblems()).toEqual(['바깥벽에 정문이 없어요']);
    // A room with no door yet can be furnished all the same.
    expect(site.buy('toilet', 15, 8, 'down')).toBe(true);
    // The first door in an outside wall is the front door.
    expect(site.buildEdge('door', 9, 13, 's')).toBe(true);
    expect(site.lot.frontDoor).toEqual({ x: 9, y: 14 });
    expect(site.edgeProblem('remove', 9, 13, 's')).toBe('정문은 허물 수 없어요');
    expect(site.buildEdge('door', 15, 10, 'e')).toBe(true);
    expect(site.lot.frontDoor).toEqual({ x: 9, y: 14 });
    expect(g.siteProblems()).toEqual([]);
    // Furnished before moving in, and kept in the save.
    expect(site.buy('bed', 6, 8, 'down')).toBe(true);
    const again = new Game(JSON.parse(JSON.stringify(g.state)));
    expect(again.siteGame!.state.objects.some((o) => o.defId === 'bed')).toBe(true);
    // Moving in: the old home sold, the house built and its bed there, everyone at the front door.
    const offer = g.siteOffer(false);
    const before = g.state.money;
    expect(g.moveIntoSite(false)).toBe(true);
    expect(g.siteGame).toBeNull();
    expect(g.state.site).toBeUndefined();
    expect(g.state.money).toBe(before + offer.proceeds);
    expect(g.lot.frontDoor).toEqual({ x: 9, y: 14 });
    expect(g.walls[edgeKey(9, 13, 's')!]).toBe('door');
    expect(g.state.objects.some((o) => o.defId === 'bed' && o.x === 6 && o.y === 8)).toBe(true);
    expect(new Set(g.state.objects.map((o) => o.uid)).size).toBe(g.state.objects.length);
    for (const s of g.household()) expect([s.x, s.y]).toEqual([9, 14]);
    expect(routeFrom(g.blocked, 9, 14).dist[10 + 10 * 26]).toBeGreaterThan(0);
    expect(g.lotValue).toBe(4000 + plan.cost + 2 * (120 - 40));
  });

  it('sells the land again, with what was built on it', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
    g.state.money = 20000;
    expect(g.buyLand()).toBe(true);
    expect(g.buyLand()).toBe(false);
    const cost = g.siteGame!.roomPlan(6, 8, 9, 11).cost;
    g.siteGame!.buildRoom(6, 8, 9, 11);
    expect(g.sellLand()).toBe(true);
    expect(g.siteGame).toBeNull();
    expect(g.state.money).toBe(20000 - 4000 - cost + 4000 + cost);
  });
});

describe('buy mode stops time (참고 게임 build and buy mode)', () => {
  it('pauses on entering, runs again as before on leaving, and a save made meanwhile loads running', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
    g.setSpeed(2);
    g.enterBuyMode();
    expect(g.state.speed).toBe(0);
    const time = g.state.time;
    for (let i = 0; i < 20; i++) g.update(0.5);
    expect(g.state.time).toBe(time);
    // Saved in buy mode, it loads in live mode at the speed it had.
    expect(new Game(JSON.parse(JSON.stringify(g.state))).state.speed).toBe(2);
    g.leaveBuyMode();
    expect(g.state.speed).toBe(2);
    // Set going by hand in buy mode, it keeps that speed on leaving.
    g.enterBuyMode();
    g.setSpeed(1);
    g.leaveBuyMode();
    expect(g.state.speed).toBe(1);
    // A paused game stays paused.
    g.setSpeed(0);
    g.enterBuyMode();
    g.leaveBuyMode();
    expect(g.state.speed).toBe(0);
  });
});
