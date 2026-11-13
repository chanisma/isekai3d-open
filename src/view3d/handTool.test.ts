import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { aimHand, boardGrip, correctTool, gripQuaternion, leanPen, penQuaternion, poseTool, unleanPen, HANDLE_SLANT } from './handTool';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const forearm = V(0, -0.3, 1).normalize();

describe('gripQuaternion', () => {
  for (const side of ['left', 'right'] as const) {
    it(`${side}: closes the palm on the handle, whichever hand`, () => {
      const axis = V(0, 1, 0);
      const q = gripQuaternion(side, axis, undefined, forearm, V(0, 0, 1));
      // A proper turn, no mirror.
      expect(q.length()).toBeCloseTo(1, 5);
      // The thumb side (+z) keeps to the handle apart from the slant.
      expect(V(0, 0, 1).applyQuaternion(q).dot(axis)).toBeCloseTo(Math.cos(HANDLE_SLANT), 5);
      // The palm (-y) isn't facing along the handle: it wraps it.
      expect(Math.abs(V(0, -1, 0).applyQuaternion(q).dot(axis))).toBeLessThan(1e-6);
    });

    it(`${side}: a palm that's asked for is the palm you get`, () => {
      const palm = V(1, 0, 0);
      const q = gripQuaternion(side, V(0, 0, -1), palm, forearm, V(0, 0, 1));
      expect(V(0, -1, 0).applyQuaternion(q).dot(palm)).toBeCloseTo(1, 5);
    });

    it(`${side}: a handle running along the forearm doesn't fall over`, () => {
      const q = gripQuaternion(side, forearm, undefined, forearm, V(0, -1, 0));
      expect(Number.isFinite(q.x + q.y + q.z + q.w)).toBe(true);
      expect(q.length()).toBeCloseTo(1, 5);
    });
  }
});

describe('aimHand', () => {
  it('gets the hand to its turn and puts most of the twist in the forearm', () => {
    const lower = new THREE.Object3D();
    const hand = new THREE.Object3D();
    hand.position.set(0.25, 0, 0);
    lower.add(hand);
    const goal = new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), 1);
    aimHand(lower, hand, goal, 1);
    lower.updateWorldMatrix(true, true);
    expect(hand.getWorldQuaternion(new THREE.Quaternion()).angleTo(goal)).toBeLessThan(1e-4);
    expect(lower.quaternion.angleTo(new THREE.Quaternion())).toBeCloseTo(0.8, 3);
    expect(hand.quaternion.angleTo(new THREE.Quaternion())).toBeCloseTo(0.2, 3);
  });
});

describe('the tool in the hand', () => {
  const stage = () => {
    const parent = new THREE.Group();
    parent.position.set(3, 0, -2);
    parent.rotation.y = 0.7;
    const tool = new THREE.Group();
    parent.add(tool);
    parent.updateWorldMatrix(true, true);
    return { parent, tool };
  };

  it('poses a long tool by its tip', () => {
    const { parent, tool } = stage();
    const tip = V(0, 0.02, 0);
    poseTool(tool, tip, V(0.1, 0, 0.8), V(0, 1, -0.4), 1.2);
    parent.updateWorldMatrix(true, true);
    expect(parent.worldToLocal(tool.localToWorld(tip.clone())).distanceTo(V(0.1, 0, 0.8))).toBeLessThan(1e-5);
  });

  it('moves to the hand', () => {
    const { tool } = stage();
    tool.updateWorldMatrix(true, false);
    const grip = V(0, 0.9, 0);
    const to = V(3.2, 1, -1.8);
    correctTool(tool, tool.localToWorld(grip.clone()), to);
    tool.updateWorldMatrix(true, false);
    expect(tool.localToWorld(grip.clone()).distanceTo(to)).toBeLessThan(1e-5);
  });

  it('swings about what stays on the floor: the head stays down and the handle goes to the hand', () => {
    const { tool } = stage();
    tool.updateWorldMatrix(true, false);
    const tip = V(0, 0, 0);
    const pin = tool.localToWorld(tip.clone());
    const grip = V(0, 0.9, 0);
    const to = pin.clone().add(V(0.3, 0.7, 0.1));
    correctTool(tool, tool.localToWorld(grip.clone()), to, tip);
    tool.updateWorldMatrix(true, false);
    expect(tool.localToWorld(tip.clone()).distanceTo(pin)).toBeLessThan(1e-5);
    const got = tool.localToWorld(grip.clone()).sub(pin).normalize();
    expect(got.dot(to.clone().sub(pin).normalize())).toBeCloseTo(1, 5);
  });
});

describe('leanPen', () => {
  const DOWN = V(-0.12, -1, -0.28).normalize();
  const grip = { at: V(0, 0, 0), axis: DOWN, shape: 'pen' as const, writes: 0.12 };
  const shoulder = V(0.3, 1.3, 0.5);
  const setup = () => {
    const parent = new THREE.Group();
    parent.position.set(1, 0, 2);
    parent.rotation.y = 0.7;
    const tool = new THREE.Group();
    parent.add(tool);
    tool.position.set(0.1, 1, -0.2);
    parent.updateMatrixWorld(true);
    return { parent, tool };
  };
  const tipOf = (tool: THREE.Object3D) => tool.localToWorld(DOWN.clone().multiplyScalar(0.12));

  it('leans a nearly upright pen 45-60 degrees off the page, back to the hand, the tip where it was, on a tool the script only moves', () => {
    const { parent, tool } = setup();
    const at = tool.position.clone();
    const wantTip = tipOf(tool);
    const body = parent.localToWorld(shoulder.clone());
    for (let frame = 0; frame < 5; frame++) {
      // Each frame the script puts it back where it goes, and doesn't touch its turn.
      tool.position.copy(at);
      leanPen(tool, grip, body);
      tool.updateMatrixWorld(true);
      expect(tipOf(tool).distanceTo(wantTip)).toBeLessThan(1e-6);
      const up = tool.localToWorld(V(0, 0, 0)).sub(wantTip).normalize();
      const fromPage = (Math.asin(up.y) * 180) / Math.PI;
      expect(fromPage).toBeGreaterThan(45);
      expect(fromPage).toBeLessThan(60);
      expect(up.clone().setY(0).normalize().dot(body.clone().sub(wantTip).setY(0).normalize())).toBeGreaterThan(0.99);
    }
  });

  it('leaves a pen writing on a wall or lying flat alone, and stands a leaned one back when asked', () => {
    const { parent, tool } = setup();
    const before = tool.quaternion.clone();
    const flat = { ...grip, axis: V(0, 0, -1) };
    leanPen(tool, flat, parent.localToWorld(shoulder.clone()));
    expect(tool.quaternion.equals(before)).toBe(true);
    leanPen(tool, grip, parent.localToWorld(shoulder.clone()));
    expect(tool.quaternion.equals(before)).toBe(false);
    unleanPen(tool);
    expect(tool.quaternion.equals(before)).toBe(true);
    // A grip that isn't a writer's isn't touched.
    leanPen(tool, { ...grip, writes: undefined }, parent.localToWorld(shoulder.clone()));
    expect(tool.quaternion.equals(before)).toBe(true);
  });
});

describe('penQuaternion', () => {
  for (const side of ['left', 'right'] as const) {
    it(`${side}: a proper turn, the fingers slanted towards the tip whichever way the axis runs, the palm not up`, () => {
      const down = V(0.1, -1, 0.1);
      for (const axis of [down, down.clone().negate()]) {
        const q = penQuaternion(side, axis, forearm);
        expect(q.length()).toBeCloseTo(1, 5);
        const fingers = V(side === 'left' ? 1 : -1, 0, 0).applyQuaternion(q);
        expect(fingers.dot(down.clone().normalize())).toBeGreaterThan(0.5);
        expect(V(0, -1, 0).applyQuaternion(q).y).toBeLessThan(0.1);
      }
    });
  }
});

describe('boardGrip', () => {
  it('sits in the board, the palm facing its screen side, the fingers away from whoever holds it', () => {
    for (const tilt of [0.5, 0.55, 0.6, 0.75]) {
      const g = boardGrip(tilt);
      const normal = V(0, Math.sin(tilt), Math.cos(tilt));
      // In the board's thickness, not 3-4 cm in front of the screen as the old (0, -0.02, 0.06) was.
      expect(Math.abs(g.at.dot(normal))).toBeLessThan(1e-6);
      expect(V(0, -0.02, 0.06).dot(normal)).toBeGreaterThan(0.03);
      expect(g.palm!.dot(normal)).toBeCloseTo(1, 6);
      // On a left hand: palm (bone -y) at the screen, fingers (bone +x) towards -z, away from someone facing -z.
      const q = gripQuaternion('left', g.axis, g.palm, forearm, V(0, 0, 1));
      expect(V(0, -1, 0).applyQuaternion(q).dot(normal)).toBeCloseTo(1, 5);
      expect(V(1, 0, 0).applyQuaternion(q).z).toBeLessThan(0);
    }
  });
});
