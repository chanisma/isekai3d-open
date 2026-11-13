import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { getDef } from '../../game/catalog';
import { buildFurniture } from '../furniture3d';
import { spotPose } from '../activity';
import { CALL_ROUND, CHILDREN, DUTY_ROUND, PHONE, RECORD_ROUND, beatTimes, callNowAt, dutyNowAt, recordNowAt, shoulderSat, shoulderStood, slotAt, slotsAtRound, type Key, type P } from './teacherMotion';

const dist = (a: P, b: P) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const REACH = 0.56;
const worst = (k: Key, sh: (sx: number, lean: number) => P) => Math.max(dist(k.l, sh(1, k.lean)), dist(k.r, sh(-1, k.lean)));

describe('a homeroom teacher’s own beats', () => {
  it('the hands stay within the arm, at every moment of each round', () => {
    for (let t = 0; t < 90; t += 0.07) {
      for (const H of [1.5, 1.7]) {
        const c = callNowAt(t, 0.3, H);
        expect(worst(c.key, shoulderSat), `call ${c.beat}`).toBeLessThan(REACH);
      }
      const r = recordNowAt(t, 0.3);
      expect(worst(r.key, shoulderSat), `record ${r.beat}`).toBeLessThan(REACH);
      const d = dutyNowAt(t, 0.3);
      expect(worst(d.key, shoulderStood), `duty ${d.beat}`).toBeLessThan(REACH);
    }
  });

  it('the rounds are of a length a player can watch', () => {
    for (const r of [RECORD_ROUND, CALL_ROUND, DUTY_ROUND]) {
      expect(r).toBeGreaterThan(8);
      expect(r).toBeLessThan(60);
    }
  });

  it('a record is typed, checked against the notes, finished, read, then saved', () => {
    const at = Object.fromEntries(beatTimes('tcRecord'));
    const order = ['open', 'type1', 'check', 'type2', 'read', 'save'];
    for (let i = 1; i < order.length; i++) expect(at[order[i]], order[i]).toBeGreaterThan(at[order[i - 1]]);
    let lastTyped = 0;
    for (let t = 0; t < RECORD_ROUND; t += 0.05) {
      const n = recordNowAt(t, 0);
      if (n.beat === 'open') continue;
      expect(n.typed).toBeGreaterThanOrEqual(lastTyped - 1e-6);
      lastTyped = n.typed;
      if (n.saved) expect(n.typed).toBe(1);
    }
  });

  it('a call: the handset goes up after dialling, is back in the cradle at the end, and the note is taken with it at the ear', () => {
    for (let t = 0; t < CALL_ROUND; t += 0.05) {
      const n = callNowAt(t, 0, 1.6);
      if (n.beat === 'dial' || n.beat === 'finish') {
        expect(n.lift).toBe(0);
        expect(dist(n.handsetAt, PHONE.cradle)).toBeLessThan(1e-6);
      }
      if (n.beat === 'note1') expect(n.lift).toBe(1);
      if (n.beat === 'finish') expect(n.lines).toBeGreaterThanOrEqual(2);
    }
  });

  it('each round of the chart moves two tags and leaves every child in one slot', () => {
    for (let n = -9; n < 18; n++) {
      const s = slotsAtRound(n);
      expect([...s].sort((a, b) => a - b)).toEqual(CHILDREN.map((_, i) => i));
      expect(slotsAtRound(n + 8)).toEqual(s);
      const next = slotsAtRound(n + 1);
      expect(s.filter((c, i) => next[i] !== c).length).toBe(2);
    }
  });

  it('tags never leave the chart’s reach of the board, and end each round in the next round’s slots', () => {
    const T = DUTY_ROUND;
    const end = dutyNowAt(T - 0.001, 0);
    const start = dutyNowAt(T + 0.001, 0);
    for (let i = 0; i < CHILDREN.length; i++) expect(dist(end.tags[i], start.tags[i])).toBeLessThan(0.002);
    for (let t = 0; t < T * 3; t += 0.05) for (const p of dutyNowAt(t, 0).tags) expect(p[2]).toBeLessThan(0.08);
    expect(slotAt(0)[1]).toBeGreaterThan(0.9);
  });

  it('the desk draws at the script’s places, and the desk’s other uses keep their spots', () => {
    const b = buildFurniture(getDef('teacherDesk'), { againstWall: false });
    b.root.updateMatrixWorld(true);
    const s = b.spots!;
    for (const id of ['xwSchoolRecord', 'xwCallParent']) {
      expect(s[id].motion, id).toMatch(/^tc/);
      expect(s[id].how).toBe('sit');
      expect(s[id].at.position.z).toBeCloseTo(0.42, 3);
    }
    expect(s['*'].motion).toBe('write');
    expect(s.planLesson.motion).toBe('type');
    expect(s.teacher_homeroom.motion).toBe('meeting');
    // Nobody at the desk: no notebook out, and nothing held.
    b.away?.(false, 100);
    expect(s.xwCallParent.held ?? null).toBeNull();
    // On the call, at a beat with the handset: it's in the hand.
    const pose = spotPose(s.xwCallParent, 'tcCall', 1.6, 100, 0);
    expect(pose.doing.reach).toBeDefined();
    const tools = new Set<string>();
    for (let t = 100; t < 100 + CALL_ROUND; t += 0.25) {
      spotPose(s.xwCallParent, 'tcCall', 1.6, t, 0);
      b.away?.(false, t);
      if (s.xwCallParent.held) tools.add(s.xwCallParent.held.tool.name);
    }
    expect([...tools].sort()).toEqual(['tcDeskPen', 'tcHandset']);
  });

  it('the board has its duty spot, and it faces the chart; the sticker spot stays', () => {
    const b = buildFurniture(getDef('clsNoticeBoard'), { againstWall: true });
    b.root.updateMatrixWorld(true);
    const s = b.spots!;
    expect(s.xwClassDuty.motion).toBe('tcDuty');
    expect(s['*'].motion).toBe('board');
    const at = s.xwClassDuty.at.getWorldPosition(new THREE.Vector3());
    expect(at.z).toBeCloseTo(-0.47 + 0.42, 3);
  });
});
