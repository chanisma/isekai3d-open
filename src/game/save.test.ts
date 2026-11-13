import { beforeEach, describe, expect, it } from 'vitest';
import { Game } from './game';
import { deleteSave, hasSave, lastSlot, loadGame, saveGame, setLastSlot, slotInfo } from './save';

// A localStorage of our own for the test (the tests run without a browser).
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: () => null,
  length: 0,
} as Storage;

const make = (name: string) => Game.create([{ name, shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);

describe('three save slots', () => {
  beforeEach(() => store.clear());

  it("loads a save from when the role characters were named by role (npc_reaper_saja → saja)", () => {
    const game = make('사자 닮은 심');
    const dweller = game.state.dwellers[0];
    Object.assign(dweller, { face: 'npc_reaper_saja', hairFrom: 'npc_client_sora', closet: ['tops@male-adult-npc_reaper_saja', 'tops@male-adult-jiho'], wear: { tops: 'male-adult-npc_boss_daesung', bottoms: 'male-adult-jiho' } });
    const loaded = new Game(JSON.parse(JSON.stringify(game.state))).state.dwellers[0];
    expect([loaded.face, loaded.hairFrom, loaded.closet, loaded.wear]).toEqual(['saja', 'sora', ['tops@male-adult-saja', 'tops@male-adult-jiho'], { tops: 'male-adult-daesung', bottoms: 'male-adult-jiho' }]);
  });

  it('restores custom shirt artwork and a queued removal', () => {
    const game = make('프린트');
    const dweller = game.state.dwellers[0];
    const print = { image: 'data:image/png;base64,AA==', side: 'back' as const, x: 0, y: 0, scale: 0.6, rotation: 20 };
    game.restyle(dweller.id, { shirtPrint: print });
    dweller.away = { until: 100, restyle: { shirtPrint: null } };
    expect(saveGame(game.state, 3)).toBe(true);
    const loaded = loadGame(3)!;
    expect(loaded.dwellers[0].shirtPrint).toEqual(print);
    expect(loaded.dwellers[0].away?.restyle).toEqual({ shirtPrint: null });
  });

  it('keeps each story in its own slot, the old save as slot 1', () => {
    store.set('isekai3d-save-v1', JSON.stringify(make('예전').state));
    expect(loadGame(1)?.dwellers[0].name).toBe('예전');
    saveGame(make('하린').state, 2);
    expect(loadGame(1)?.dwellers[0].name).toBe('예전');
    expect(loadGame(2)?.dwellers[0].name).toBe('하린');
    expect(loadGame(3)).toBeNull();
    expect(hasSave()).toBe(true);
  });

  it('saves where the story last played, and wipes one slot only', () => {
    expect(lastSlot()).toBe(1);
    setLastSlot(3);
    saveGame(make('시우').state);
    expect(loadGame(3)?.dwellers[0].name).toBe('시우');
    saveGame(make('하린').state, 2);
    deleteSave(3);
    expect(loadGame(3)).toBeNull();
    expect(loadGame(2)?.dwellers[0].name).toBe('하린');
  });

  it("tells a slot's card who, which day and when", () => {
    saveGame(make('하린').state, 1);
    const info = slotInfo(1);
    expect(info.empty).toBe(false);
    expect(info.people.map((p) => p.name)).toEqual(['하린']);
    expect(info.day).toBe(1);
    expect(info.savedAt).toBeGreaterThan(0);
    expect(slotInfo(2).empty).toBe(true);
  });
});
