import { describe, expect, it } from 'vitest';
import { rankOptions } from './autonomy';
import { BABY_DAYS, CHILD_DAYS, LABOR_LENGTH, LIFESPANS, NEGLECT_LIMIT, PREGNANCY_LENGTH } from './babies';
import { Game } from './game';
import type { Dweller } from './types';
import { edgeKey } from './walls';

function seeded(seed = 42) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function couple() {
  const g = Game.create(
    [
      { name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' },
      { name: '서연', shirt: '#f06292', skin: '#eac09a', hair: '#5b3a1e' },
    ],
    seeded(),
  );
  g.state.freeWill = false;
  g.state.nextWalkbyAt = g.state.nextDoorbellAt = 1e9;
  const [a, b] = g.state.dwellers;
  const rel = g.relationship(a.id, b.id);
  rel.friend = 60;
  rel.romance = 70;
  rel.flags.push('partner', 'engaged', 'married');
  Object.assign(a, { x: 11, y: 11 });
  Object.assign(b, { x: 12, y: 11 });
  return { g, a, b };
}

function run(game: Game, minutes: number) {
  for (let t = 0; t < minutes; t += 0.5) game.step(0.5);
}

/** Skips straight to a newborn without simulating four days. */
function deliver(g: Game, mother: Dweller, father: Dweller): Dweller {
  mother.pregnancy = { partnerId: father.id, since: g.state.time - PREGNANCY_LENGTH };
  run(g, LABOR_LENGTH + 2);
  const baby = g.state.dwellers.find((s) => s.age === 'baby');
  expect(baby).toBeDefined();
  return baby!;
}

describe('babies', () => {
  it('can make a partner pregnant, with trimester moodlets', () => {
    const { g, a, b } = couple();
    g.rng = () => 0; // the try works
    g.enqueue(a.id, { kind: 'social', targetId: b.id, socialId: 'tryForBaby', autonomous: false });
    run(g, 35);
    expect(b.pregnancy?.partnerId).toBe(a.id);
    expect(b.buffs.some((x) => x.id === 'trimester1')).toBe(true);
    g.state.time += PREGNANCY_LENGTH / 2;
    g.step(0.5);
    expect(b.buffs.some((x) => x.id === 'trimester2')).toBe(true);
  });

  it('is born after labour into a bassinet, cheering both parents', () => {
    const { g, a, b } = couple();
    const baby = deliver(g, b, a);
    expect(b.pregnancy).toBeUndefined();
    expect(g.state.objects.some((o) => o.defId === 'bassinet' && o.uid === baby.bassinetUid)).toBe(true);
    for (const p of [a, b]) expect(p.buffs.some((x) => x.id === 'hadBaby')).toBe(true);
    g.setActive(baby.id);
    expect(g.state.activeDwellerId).not.toBe(baby.id);
  });

  it('cries when hungry at night, waking the parents, who then feed it', () => {
    const { g, a, b } = couple();
    const baby = deliver(g, b, a);
    g.state.freeWill = true;
    g.state.time = Math.floor(g.state.time / 1440) * 1440 + 1440 + 2 * 60; // 02:00
    const beds = g.state.objects.filter((o) => g.isBed(o));
    for (const [p, bed] of [[a, beds[0]], [b, beds[1]]] as const) {
      p.needs.energy = 60;
      p.needs.bladder = p.needs.hunger = 100;
      g.enqueue(p.id, { kind: 'interact', objectUid: bed.uid, interactionId: 'sleep', autonomous: true });
    }
    run(g, 10);
    baby.needs.hunger = 20;
    // Within two hours: a woken parent may chat a moment first, depending on the roll.
    run(g, 120);
    expect(g.toasts.some((t) => t.text.includes('울어요'))).toBe(true);
    expect([a, b].some((p) => p.buffs.some((x) => x.id === 'rudeAwakening'))).toBe(true);
    expect(baby.needs.hunger).toBeGreaterThan(40);
  });

  it('gets fed at the bassinet, and parents care for it on their own', () => {
    const { g, a, b } = couple();
    const baby = deliver(g, b, a);
    const bassinet = g.state.objects.find((o) => o.uid === baby.bassinetUid)!;
    baby.needs.hunger = 10;
    expect(rankOptions(g, a).some((c) => c.action.kind === 'interact' && c.action.interactionId === 'feedBaby')).toBe(true);
    g.enqueue(a.id, { kind: 'interact', objectUid: bassinet.uid, interactionId: 'feedBaby', autonomous: false });
    run(g, 30);
    expect(baby.needs.hunger).toBeGreaterThan(50);
  });

  it('is taken away when neglected too long', () => {
    const { g, a, b } = couple();
    const baby = deliver(g, b, a);
    baby.needs.hunger = 0;
    run(g, NEGLECT_LIMIT + 5);
    expect(g.state.dwellers.includes(baby)).toBe(false);
    expect(g.toasts.some((t) => t.text.includes('사회복지사'))).toBe(true);
  });

  it('is a newborn for a day, then an infant with a temperament (참고 게임 baby 1 day, infant 5)', () => {
    const { g, a, b } = couple();
    const baby = deliver(g, b, a);
    expect(baby.infant).toBeFalsy();
    baby.bornAt = g.state.time - 1.01 * 1440;
    g.step(0.5);
    expect(baby.age).toBe('baby');
    expect(baby.infant).toBe(true);
    expect(baby.infantTrait).toBeDefined();
    expect(g.toasts.some((t) => t.text.includes('영아로 자랐어요'))).toBe(true);
  });

  it('grows into a toddler who needs feeding and teaching (참고 게임 toddler stage)', () => {
    const { g, a, b } = couple();
    const baby = deliver(g, b, a);
    baby.bornAt = g.state.time - BABY_DAYS * 1440;
    g.step(0.5);
    expect(baby.age).toBe('toddler');
    const stove = g.state.objects.find((o) => o.defId === 'stove')!;
    expect(g.objectMenu(baby, stove)).toEqual([]);
    expect(g.socialMenu(a, baby).map((o) => o.id)).toContain('teachTalk');
    expect(g.socialMenu(a, baby).some((o) => o.id === 'chat')).toBe(false);
    expect(g.socialMenu(baby, a)).toEqual([]);
  });

  it('grows into a child who can walk about but not cook or flirt', () => {
    const { g, a, b } = couple();
    const baby = deliver(g, b, a);
    baby.bornAt = g.state.time - BABY_DAYS * 1440;
    g.step(0.5);
    baby.bornAt = g.state.time - LIFESPANS.normal.toddler * 1440;
    g.step(0.5);
    expect(baby.age).toBe('child');
    expect(baby.buffs.some((x) => x.id === 'grewUp')).toBe(true);
    const stove = g.state.objects.find((o) => o.defId === 'stove')!;
    expect(g.objectMenu(baby, stove).some((o) => o.id === 'cook')).toBe(false);
    expect(g.socialMenu(baby, a).some((o) => o.id === 'flirt')).toBe(false);
    expect(g.socialMenu(baby, a).some((o) => o.id === 'chat')).toBe(true);
  });

  it('sends a child to school on weekdays, where homework helps the grade', () => {
    const { g, a, b } = couple();
    const child = deliver(g, b, a);
    child.bornAt = g.state.time - BABY_DAYS * 1440;
    g.step(0.5);
    child.bornAt = g.state.time - LIFESPANS.normal.toddler * 1440;
    g.step(0.5);
    expect(child.job?.careerId).toBe('school');
    expect(child.job?.level).toBe(2); // C
    const chair = g.state.objects.find((o) => o.defId === 'diningChair')!;
    expect(g.objectMenu(child, chair).some((o) => o.id === 'homework')).toBe(true);
    expect(g.objectMenu(a, chair).some((o) => o.id === 'homework')).toBe(false);
    // Next weekday morning.
    const day = Math.floor(g.state.time / 1440) + 1;
    g.state.time = day * 1440 + 7 * 60 + 50;
    if ((day % 7) >= 5) g.state.time += (7 - (day % 7)) * 1440;
    for (const s of g.household()) for (const k of Object.keys(s.needs) as Array<keyof Dweller['needs']>) s.needs[k] = 90;
    run(g, 60);
    expect(child.away).toBeTruthy();
    run(g, 8 * 60);
    expect(child.away).toBeFalsy();
    expect(g.toasts.some((t) => t.text.includes('학교에서 돌아왔어요'))).toBe(true);
  });

  it("gives one homework a school day: done in 참고 게임's hundred minutes, then gone until the next", () => {
    const { g, a, b } = couple();
    const child = deliver(g, b, a);
    child.bornAt = g.state.time - BABY_DAYS * 1440;
    g.step(0.5);
    child.bornAt = g.state.time - LIFESPANS.normal.toddler * 1440;
    g.step(0.5);
    const chair = g.state.objects.find((o) => o.defId === 'diningChair')!;
    for (const k of Object.keys(child.needs) as Array<keyof Dweller['needs']>) child.needs[k] = 100;
    g.enqueue(child.id, { kind: 'interact', objectUid: chair.uid, interactionId: 'homework', autonomous: false });
    g.enqueue(child.id, { kind: 'interact', objectUid: chair.uid, interactionId: 'homework', autonomous: false });
    run(g, 110);
    expect(child.job!.task).toBe(1);
    expect(child.buffs.some((x) => x.id === 'homeworkDone')).toBe(true);
    expect(g.objectMenu(child, chair).find((o) => o.id === 'homework')?.disabled ?? 'gone').toBeTruthy();
  });

  it('never expels a child with failing grades', () => {
    const { g, a, b } = couple();
    const child = deliver(g, b, a);
    child.bornAt = g.state.time - BABY_DAYS * 1440;
    g.step(0.5);
    child.bornAt = g.state.time - LIFESPANS.normal.toddler * 1440;
    g.step(0.5);
    child.job!.level = 0;
    child.job!.performance = -100;
    (g as unknown as { evaluateCareer(s: Dweller): void }).evaluateCareer(child);
    expect(child.job?.careerId).toBe('school');
  });

  it('grows a child into a teen at high school, then an adult, with a new trait at each age-up (참고 게임: 1, 2, 3)', () => {
    const { g, a, b } = couple();
    const kid = deliver(g, b, a);
    kid.bornAt = g.state.time - BABY_DAYS * 1440;
    g.step(0.5);
    kid.bornAt = g.state.time - LIFESPANS.normal.toddler * 1440;
    g.step(0.5);
    kid.bornAt = g.state.time - CHILD_DAYS * 1440;
    kid.away = null;
    g.step(0.5);
    expect(kid.age).toBe('teen');
    expect(kid.job?.careerId).toBe('highSchool');
    expect(g.socialMenu(kid, a).some((o) => o.id === 'flirt')).toBe(false);
    kid.bornAt = g.state.time - LIFESPANS.normal.teen * 1440;
    kid.away = null;
    g.step(0.5);
    expect(kid.age).toBeUndefined();
    expect(kid.job).toBeNull();
    expect(kid.traits.length).toBe(3);
  });
});

describe('adoption (참고 게임 adoption_Picker_Phone)', () => {
  it('adopts a baby, a toddler or a child for §1000, making the couple their parents', () => {
    const { g, a, b } = couple();
    g.state.money = 5000;
    g.adopt(a.id, 'toddler');
    const kid = g.state.dwellers.find((s) => s.age === 'toddler')!;
    expect(kid).toBeDefined();
    expect(kid.parents).toEqual([a.id, b.id]);
    expect(kid.traits.length).toBe(1);
    expect(g.state.money).toBe(4000);
    expect(a.buffs.some((x) => x.id === 'adoptedChild')).toBe(true);
    expect(g.familyTie(a, kid)).toBe('자녀');
    g.adopt(b.id, 'child');
    const child = g.state.dwellers.find((s) => s.age === 'child')!;
    expect(child.job?.careerId).toBe('school');
    expect(child.aspiration).toBeDefined();
    expect(g.adoptBlocker(a)).toContain('4명');
  });

  it('gives a toddler a toddler bed (against a wall), not a bassinet, and grows a baby into one', () => {
    const { g, a, b } = couple();
    g.state.money = 5000;
    g.adopt(a.id, 'toddler');
    const beds = () => g.state.objects.filter((o) => o.defId === 'toddlerBed');
    expect(beds()).toHaveLength(1);
    expect(g.state.objects.some((o) => o.defId === 'bassinet')).toBe(false);
    const [bed] = beds();
    expect(g.walls[edgeKey(bed.x, bed.y, 'n')!]).toBe('wall');
    // Only the toddler naps in it; a baby that grows up gets a bed of their own.
    expect(g.objectMenu(a, bed).some((m) => m.id === 'toddlerNap')).toBe(false);
    const baby = deliver(g, b, a);
    baby.bornAt = g.state.time - BABY_DAYS * 1440;
    g.step(0.5);
    expect(baby.age).toBe('toddler');
    expect(beds()).toHaveLength(2);
  });
});

describe('a townie who moves in', () => {
  it('goes on ageing from where their life stage began on the street', () => {
    const { g, a } = couple();
    const townie = g.state.townies!.find((t) => !t.age)!;
    townie.stageStart = g.state.time - 10 * 1440;
    const dweller = (g as unknown as { spawnTownie(role: 'doorbell', who: unknown): Dweller }).spawnTownie('doorbell', townie);
    (g as unknown as { moveIn(t: Dweller): void }).moveIn(dweller);
    expect(dweller.npc).toBeUndefined();
    expect(dweller.bornAt).toBe(townie.stageStart);
    dweller.bornAt = g.state.time - LIFESPANS.normal.adult * 1440 - 1;
    g.step(0.5);
    expect(dweller.age).toBe('elder');
    void a;
  });
});

describe('family ties', () => {
  it('knows parents, children and siblings, and keeps romance out of the family', () => {
    const { g, a, b } = couple();
    const kid = deliver(g, b, a);
    expect(g.familyTie(kid, a)).toBe('부모');
    expect(g.familyTie(a, kid)).toBe('자녀');
    kid.age = undefined; // grown up
    expect(g.socialMenu(kid, a).some((o) => o.id === 'flirt' || o.id === 'kiss')).toBe(false);
    const sib = { ...kid, id: 777, parents: [a.id, b.id] };
    expect(g.familyTie(kid, sib)).toBe('형제자매');
  });
});

describe('teen part-time jobs', () => {
  it('a teen takes an after-school job and goes after school', () => {
    const { g, a, b } = couple();
    const teen = deliver(g, b, a);
    teen.bornAt = g.state.time - BABY_DAYS * 1440;
    g.step(0.5);
    teen.bornAt = g.state.time - LIFESPANS.normal.toddler * 1440;
    g.step(0.5);
    teen.bornAt = g.state.time - CHILD_DAYS * 1440;
    teen.away = null;
    g.step(0.5);
    expect(teen.age).toBe('teen');
    g.acceptJob(teen.id, 'barista');
    expect(teen.partTime?.careerId).toBe('barista');
    expect(teen.job?.careerId).toBe('highSchool');
    // A weekday at 15:30, home from school.
    let day = Math.floor(g.state.time / 1440) + 1;
    while (day % 7 >= 5) day++;
    g.state.time = day * 1440 + 15 * 60 + 30;
    teen.job!.lastWorkDay = day;
    for (const s of g.household()) for (const k of Object.keys(s.needs) as Array<keyof Dweller['needs']>) s.needs[k] = 90;
    const money = g.state.money;
    for (let t = 0; t < 60; t += 0.5) g.step(0.5);
    expect((teen as Dweller).away?.slot).toBe('partTime');
    for (let t = 0; t < 5 * 60; t += 0.5) g.step(0.5);
    expect(teen.away).toBeFalsy();
    expect(g.state.money).toBeGreaterThan(money);
  });
});
