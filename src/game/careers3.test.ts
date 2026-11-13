import { describe, expect, it } from 'vitest';
import { CAREERS, CAREER_BY_ID, RETIRED_CAREERS, chooseBranch, levelsOf } from './careers';
import { CAREER_EVENTS } from './careerEvents';
import { WORKPLACES } from './workplace';
import { MOD_CAREERS } from './careerMods';
import { MAX_SKILL, MINOR_SKILLS, NO_SKILLS, TODDLER_MAX_SKILL } from './constants';
import { Game } from './game';

describe('careers after expansion packs and career mods (ours)', () => {
  it('adds the careers, each a ladder of six to ten levels with two branches', () => {
    expect(MOD_CAREERS.map((c) => c.id)).toEqual([
      'doctor', 'nurse', 'police', 'firefighter', 'teacher', 'lawyer', 'architect', 'vet', 'fashionDesigner', 'photographer', 'hairStylist', 'pilot',
      'scientist', 'actor', 'politician', 'critic', 'socialMedia', 'military', 'gardener', 'engineer', 'conservationist', 'interiorDecorator', 'salaryperson', 'mortician',
      'dj', 'dancer', 'singer', 'diplomat', 'streamer', 'extremeAthlete', 'therapist', 'filmmaker', 'model', 'toymaker', 'baker',
      'dentist', 'pharmacist', 'banker', 'accountant', 'realEstate', 'mechanic', 'farmer', 'graphicDesigner', 'webtoonArtist', 'hotelier', 'tattooArtist', 'tvHost',
      'proGamer',
    ]);
    for (const raw of MOD_CAREERS) {
      const c = CAREER_BY_ID[raw.id];
      expect(c).toBeTruthy();
      expect(c.inspired).toBeTruthy();
      expect(c.branches!.length).toBeGreaterThanOrEqual(2);
      for (const b of c.branches!.keys()) {
        const ladder = levelsOf(c, b);
        const top = ladder.length - 1;
        expect(ladder.length).toBeGreaterThanOrEqual(6);
        expect(ladder.length).toBeLessThanOrEqual(11);
        // Pay climbs, base performance falls like 참고 게임's 60 → 6, and only the top rung asks for nothing.
        for (let i = 1; i < ladder.length; i++) {
          expect(ladder[i].pay).toBeGreaterThan(ladder[i - 1].pay);
          expect(ladder[i].basePerf).toBeLessThan(ladder[i - 1].basePerf);
        }
        expect(ladder[0].basePerf).toBe(60);
        expect(ladder[top].basePerf).toBe(6);
        expect(ladder[top].needs).toBeUndefined();
        expect(ladder.slice(1, top).every((l) => l.needs?.length)).toBe(true);
        for (const l of ladder) {
          expect(l.end).toBeGreaterThan(l.start);
          expect(l.end - l.start).toBeLessThanOrEqual(12 * 60);
          // Every rung can be reached: no skill asked for above its cap (photography stops at 5, like 참고 게임's).
          for (const [k, v] of l.needs ?? []) {
            expect(k in NO_SKILLS()).toBe(true);
            expect(v, `${c.id} ${l.title} ${k}`).toBeLessThanOrEqual(MINOR_SKILLS.has(k) ? TODDLER_MAX_SKILL : MAX_SKILL);
          }
        }
      }
    }
  });

  it('keeps night shifts running past midnight (nurses, firefighters)', () => {
    const nurse = CAREER_BY_ID.nurse.levels[2];
    expect(nurse.start).toBe(19 * 60);
    expect(nurse.end).toBe(31 * 60);
    expect(CAREER_BY_ID.firefighter.levels[2].end).toBe(32 * 60);
  });

  it('heads into the branch the dweller’s skills suit', () => {
    const doctor = CAREER_BY_ID.doctor;
    expect(doctor.branches![chooseBranch(doctor, { ...NO_SKILLS(), medicine: 6, handiness: 4 })].name).toBe('외과');
    expect(doctor.branches![chooseBranch(doctor, { ...NO_SKILLS(), medicine: 6, empathy: 5 })].name).toBe('내과');
  });

  it('can be taken from the want ads and worked like any other job', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
    const dweller = g.state.dwellers[0];
    g.acceptJob(dweller.id, 'firefighter');
    expect(dweller.job?.careerId).toBe('firefighter');
    expect(g.state.dwellers[0].job!.level).toBe(0);
  });

  it('leaves out careers that aren’t real jobs, and makes the fantasy rungs realistic', () => {
    for (const id of RETIRED_CAREERS) {
      expect(CAREER_BY_ID[id]).toBeUndefined();
      expect(WORKPLACES[id]).toBeUndefined();
      expect(CAREER_EVENTS.some((e) => e.careers.includes(id))).toBe(false);
    }
    const titles = (id: string) => [...CAREER_BY_ID[id].levels, ...CAREER_BY_ID[id].branches!.flatMap((b) => b.levels)].map((l) => l.title).join(' ');
    expect(titles('astronaut')).not.toMatch(/밀수|레인저|용병|외계/);
    expect(CAREER_BY_ID.astronaut.branches!.map((b) => b.name)).toEqual(['우주 과학자', '임무 지휘관']);
    expect(CAREER_BY_ID.secretAgent.name).toBe('정보 요원');
    expect(titles('secretAgent')).not.toMatch(/악당|검열|스파이|첩자/);
    // The villain track's mischief made way for programming.
    expect(CAREER_BY_ID.secretAgent.branches![1].levels[0].needs!.map(([k]) => k)).toContain('programming');
    expect(CAREERS.length).toBeGreaterThan(40);
    // Real ranks: no legends, emperors or gods at the top of any ladder, and no title twice in one.
    for (const c of CAREERS) {
      const all = [...c.levels, ...(c.branches ?? []).flatMap((b) => b.levels)].map((l) => l.title);
      expect(all.join(' '), c.id).not.toMatch(/전설|제왕|제국|(?<!정)거장|거물|대가|신의 손|의 신|수호자|마법사|달인|귀재|하늘의 에이스|대통령|태양계|명의|우주의|세계의 창조자/);
      for (const b of c.branches ?? []) expect(new Set([...c.levels, ...b.levels].map((l) => l.title)).size, `${c.id} ${b.name}`).toBe(c.levels.length + b.levels.length);
    }
    // Tech climbs on programming and logic; video games stay a hobby.
    const tech = CAREER_BY_ID.tech;
    expect(tech.branches!.map((b) => b.name)).toEqual(['소프트웨어 엔지니어', '스타트업 창업가']);
    // Pro gaming is its own career in its own field, with a player's and a coach's track.
    expect(CAREER_BY_ID.proGamer.skill).toBe('videoGaming');
    expect(CAREER_BY_ID.proGamer.branches!.map((b) => b.name)).toEqual(['선수', '코칭 스태프']);
    expect([...tech.levels, ...tech.branches!.flatMap((b) => b.levels)].some((l) => l.needs?.some(([k]) => k === 'videoGaming'))).toBe(false);
    // Ladders follow the job: long formal ones for professions, short ones for trades and the stage.
    const top = (id: string) => levelsOf(CAREER_BY_ID[id], 0).length;
    for (const id of ['police', 'banker', 'salaryperson', 'diplomat']) expect(top(id), id).toBe(10);
    expect(top('doctor')).toBe(11);
    for (const id of ['hairStylist', 'baker', 'farmer', 'tattooArtist', 'dj', 'singer']) expect(top(id), id).toBe(6);
    expect(CAREER_BY_ID.politician.branches![0].levels.at(-1)!.title).toBe('장관');
  });

  it('moves a saved dweller onto the shorter ladder', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
    const dwellers = g.state.dwellers;
    // A hairdresser at old level 9 and one at old shared level 3 (past the three shared rungs now).
    dwellers[0].job = { careerId: 'hairStylist', level: 9, branch: 1, performance: 50, lastWorkDay: 0 };
    const saved = JSON.parse(JSON.stringify(g.state));
    saved.dwellers.push({ ...JSON.parse(JSON.stringify(dwellers[0])), id: 999, name: '서연', job: { careerId: 'hairStylist', level: 3, performance: 50, lastWorkDay: 0 } });
    const loaded = new Game(saved, () => 0.5);
    const [a, b] = loaded.state.dwellers.filter((s) => s.job?.careerId === 'hairStylist');
    expect(a.job!.level).toBe(5);
    expect(a.job!.branch).toBe(1);
    expect(b.job!.branch).toBeDefined();
    expect(b.job!.level).toBe(3);
  });

  it('lets go a dweller whose career was taken out, when an old save loads', () => {
    const g = Game.create([{ name: '민준', shirt: '#1e88e5', skin: '#f8d9c0', hair: '#2b1b10' }], () => 0.5);
    const saved = JSON.parse(JSON.stringify(g.state));
    saved.dwellers[0].job = { careerId: 'criminal', level: 3, performance: 40, lastWorkDay: 0 };
    const loaded = new Game(saved, () => 0.5);
    expect(loaded.state.dwellers[0].job).toBeNull();
    loaded.step(0.5);
    expect(loaded.toasts.some((t) => t.text.includes('무직'))).toBe(true);
  });
});
