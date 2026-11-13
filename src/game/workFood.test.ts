import { expect, it } from 'vitest';
import { Game } from './game';

// A hungry worker finds something to eat on a work lot (2026-10-25): the fridge where there is one,
// else the break room's snacks by the coffee maker (탕비실, catalog pantrySnack).
for (const id of ['tech', 'doctor', 'police']) {
  it(`a hungry worker eats at the ${id} lot`, () => {
    const g = Game.workplaceTour(id, () => 0.4);
    const me = g.state.dwellers.find((s) => !s.npc)!;
    me.needs = { hunger: 8, energy: 80, bladder: 80, hygiene: 80, fun: 80, social: 80 };
    for (let t = 0; t < 90; t += 0.5) g.step(0.5);
    expect(me.needs.hunger).toBeGreaterThan(20);
  });
}
