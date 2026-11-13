import { readdirSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { CAREER_BY_ID } from './careers';
import { WORK_CLOTHES, WORK_DRESS, workClothesFor, workWear } from './workClothes';
import type { GameState, Dweller } from './types';
import { figureLook } from './looks';
import { parseModel } from '../view3d/vrm';
import { castOf } from '../view3d/vrmLooks';

const wear = (careerId: string, level: number, branch?: number) => workClothesFor({ careerId, level, branch })?.id ?? null;

describe('work clothes', () => {
  test('every rule names clothes there are and a career there is', () => {
    for (const [career, rules] of Object.entries(WORK_DRESS)) {
      expect(CAREER_BY_ID[career], career).toBeDefined();
      for (const r of rules) if (r.wear) expect(WORK_CLOTHES[r.wear], `${career} ${r.wear}`).toBeDefined();
    }
  });

  test('the rank changes them: scrubs to a white coat, a uniform to plain clothes', () => {
    // 의사: 인턴·레지던트는 근무복, 전문의는 외래 가운; 외과는 수술실 복장, 외과 과장부터 외래 가운.
    expect(wear('doctor', 1)).toBe('scrubsResident');
    expect(wear('doctor', 4)).toBe('doctorClinic');
    expect(wear('doctor', 5, 0)).toBe('doctorTheatre');
    expect(wear('doctor', 2, 0)).toBe('scrubsResident');
    expect(wear('doctor', 9, 0)).toBe('doctorClinic');
    expect(wear('doctor', 6, 1)).toBe('doctorClinic');
    // 간호사: 근무복, 관리자 갈래는 짙은 근무복, 맨 위 둘은 정장.
    expect(wear('nurse', 0)).toBe('scrubsNurse');
    expect(wear('nurse', 5, 0)).toBe('nurseWardLead');
    expect(wear('nurse', 9, 0)).toBe('suit');
    expect(wear('nurse', 5, 1)).toBe('scrubsNurse');
    // A post one rung is: 응급실 간호사, 수술실 간호사; 산악·수난·항공 구조대원; 벨맨, 프런트 직원.
    expect([4, 6, 9].map((l) => wear('nurse', l, 1))).toEqual(['nurseER', 'nurseOR', 'nurseOR']);
    expect([4, 5, 6, 7, 8].map((l) => wear('firefighter', l, 1))).toEqual(['fireActive', 'fireMountain', 'fireWater', 'fireAir', 'fireActive']);
    expect([0, 1, 2].map((l) => wear('hotelier', l))).toEqual(['hotelBell', 'hotelFrontDesk', 'hotelStaff']);
    // 경찰: 순경·경장은 교통 근무, 경사는 근무복, 형사는 사복, 시도경찰청장은 지휘 근무복; 특공대는 활동복.
    expect(wear('police', 1)).toBe('policeTraffic');
    expect(wear('police', 3)).toBe('police');
    expect(wear('police', 4, 0)).toBeNull();
    expect(wear('police', 9, 0)).toBe('policeCommand');
    expect(wear('police', 4, 1)).toBe('tactical');
    // 판사 갈래는 신임 판사부터 법복, 선임 변호사까지는 정장.
    expect(wear('lawyer', 4)).toBe('suit');
    expect(wear('lawyer', 5, 0)).toBe('judge');
    // 파일럿: 훈련생까지는 자기 옷, 부기장부터 제복.
    expect(wear('pilot', 1)).toBeNull();
    expect(wear('pilot', 2)).toBe('captain');
  });

  test('every set of work clothes has its file for women and men (prototypes/CAREER-COLLECTION.md)', () => {
    const files = new Set(readdirSync('models').map((f) => f.toLowerCase()));
    const missing = Object.values(WORK_CLOTHES)
      .filter((c) => c.set !== 'formal' && c.id !== 'schoolUniform')
      .flatMap((c) => ['female', 'male'].map((g) => `${g}-adult-npc_garment_${c.id.toLowerCase()}.vrm`))
      .filter((f) => !files.has(f));
    expect(missing).toEqual([]);
  });

  test('jobs with no common uniform wear their own clothes', () => {
    for (const c of ['tech', 'teacher', 'painter', 'gameDeveloper', 'writer']) expect(wear(c, 3)).toBeNull();
  });

  test('on the work lot a dweller wears the set in its colours, or their own formal wear for a suit', () => {
    const all = ['female-adult-mina.vrm', 'female-adult-mina@formal.vrm', 'female-adult-npc_garment_scrubs.vrm'].map(parseModel).filter((m) => m !== null);
    const look = figureLook({ gender: 'female', skin: '#8d5a3b', hair: '#e0b04a', shirt: '#1e88e5', outfit: 'tee', bottom: 'pants' });
    const nurse = castOf(all, look, { id: 0, work: WORK_CLOTHES.scrubsNurse }, undefined)!;
    expect(nurse.file).toBe('female-adult-mina.vrm');
    expect(nurse.dress.tops).toEqual({ from: 'female-adult-npc_garment_scrubs.vrm', color: '#9cc8e6' });
    // No shoes in the set: her own.
    expect(nurse.dress.shoes?.from).not.toBe('female-adult-npc_garment_scrubs.vrm');
    expect(castOf(all, look, { id: 0, work: WORK_CLOTHES.suit }, undefined)!.file).toBe('female-adult-mina@formal.vrm');
    // A set with no file yet: their own clothes.
    expect(castOf(all, look, { id: 0, work: WORK_CLOTHES.police }, undefined)!.dress.tops?.from).toBeUndefined();
  });

  test('on the work lot: the worker by their rank, coworkers by the same, the boss as a leader; off it, none', () => {
    const dweller = (id: number, more: Partial<Dweller>) => ({ id, ...more }) as Dweller;
    const state = {
      time: 600,
      workplace: { careerId: 'nurse', workerId: 1, end: 1000, stage: 0 },
      dwellers: [dweller(1, { job: { careerId: 'nurse', level: 2 } as Dweller['job'] }), dweller(2, { npc: { role: 'coworker', until: 1000 } }), dweller(3, { npc: { role: 'coworker', until: 1000, boss: true } }), dweller(4, {})],
    } as unknown as GameState;
    expect(workWear(state, state.dwellers[0])?.id).toBe('scrubsNurse');
    expect(workWear(state, state.dwellers[1])?.id).toBe('scrubsNurse');
    // The boss: 간호 관리자's leader (the branch the worker hasn't chosen yet is the first).
    expect(workWear(state, state.dwellers[2])?.id).toBe('scrubsNurse');
    expect(workWear(state, state.dwellers[3])).toBeNull();
    expect(workWear({ ...state, time: 1000 }, state.dwellers[0])).toBeNull();
  });
});
