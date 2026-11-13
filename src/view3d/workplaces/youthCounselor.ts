import * as THREE from 'three';
import { marker, rod, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { label, picture, painted, text, ring, glowing } from './doctor';
import { vroidFigure, type FigureOptions } from './vroidFigure';
import * as Y from './youthCounselorMotion';
import { sm, wave, type V } from './busDriverMotion';

/**
 * 청소년수련관, second pass. Birch furniture, sage upholstery, orange municipal
 * signs and a blue sports floor. 해봄 is a fictional mark on the centre's equipment;
 * the workplace itself retains its original name. Each use has a separate score,
 * and every carried object is positioned from the same hand targets as the dweller.
 * Drawn teens are participants in that use, never extra game waiting clients.
 */
const WOOD = '#d6b78c';
const EDGE = '#a47f55';
const INK = '#344957';
const METAL = '#a7b4bc';
const PAPER = '#fffaf0';
const ORANGE = '#e89b48';
const BLUE = '#548aa8';
const SAGE = '#87aca0';
const LILAC = '#9986b5';
const SKIN = '#edc6a3';
const UP = new THREE.Vector3(0, 1, 0);
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const vec = (p: V) => v(p[0], p[1], p[2]);
const put = (m: THREE.Object3D, p: V) => m.position.set(p[0], p[1], p[2]);
function group(g: THREE.Object3D, x = 0, y = 0, z = 0, yaw = 0) {
  const a = new THREE.Group();
  a.position.set(x, y, z);
  a.rotation.y = yaw;
  g.add(a);
  return a;
}
const active = (s: Spot, t: number) => Math.abs(t - ((s.at.userData.posedAt as number | undefined) ?? -1e8)) < 0.6;
const height = (s: Spot) => (s.at.userData.height as number | undefined) ?? 1.6;
const phase = (s: Spot) => Y.youthPhase(s.work!.getWorldPosition(new THREE.Vector3()));
function use(g: THREE.Group, motion: Y.YouthMotion): Spot {
  const p = Y.BASE[motion];
  const seated = p[1] > 0.4;
  const s = spot(g, seated ? 'sit' : 'stand', ...p, Y.yawOf(motion), seated ? p[1] : undefined);
  s.motion = motion;
  s.work = marker(g, 0, 0, 0);
  return s;
}
function current(spots: Spot[], t: number): Spot | undefined {
  return spots.filter(s => active(s, t)).sort((a, b) => Number(b.at.userData.posedAt) - Number(a.at.userData.posedAt))[0];
}
function chair(g: THREE.Object3D, x: number, z: number, yaw: number, color = BLUE) {
  const a = group(g, x, 0, z, yaw);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    rod(a, v(sx * 0.17, 0.42, sz * 0.16), v(sx * 0.2, 0.025, sz * 0.19), 0.016, METAL);
    part(a, cyl(0.02, 0.02, 0.025, 8), INK, sx * 0.2, 0.013, sz * 0.19, { outline: false });
  }
  part(a, rbox(0.43, 0.07, 0.42, 0.04), color, 0, 0.445, 0);
  for (const sx of [-1, 1]) rod(a, v(sx * 0.17, 0.38, -0.16), v(sx * 0.17, 0.73, -0.21), 0.014, METAL);
  part(a, rbox(0.43, 0.3, 0.055, 0.04), color, 0, 0.72, -0.21, { rx: -0.1 });
  part(a, rbox(0.18, 0.04, 0.06, 0.012), '#d2e1df', 0, 0.79, -0.214, { outline: false });
  return a;
}
function desk(g: THREE.Object3D, w = 0.96, d = 0.66) {
  part(g, rbox(w, 0.045, d, 0.022), WOOD, 0, 0.748, 0);
  part(g, box(w - 0.02, 0.012, d - 0.02), EDGE, 0, 0.72, 0, { outline: false });
  for (const x of [-w / 2 + 0.07, w / 2 - 0.07]) {
    for (const z of [-d / 2 + 0.06, d / 2 - 0.06]) part(g, box(0.03, 0.72, 0.03), INK, x, 0.36, z);
    part(g, box(0.03, 0.03, d - 0.1), INK, x, 0.17, 0);
  }
  part(g, box(w - 0.1, 0.18, 0.025), '#cbb18c', 0, 0.58, -0.25);
}
function flat(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number) {
  return picture(g, tex, w, h, x, y, z, '#ffffff', 0, -Math.PI / 2);
}
/** Reused painted papers: legible titles, cells, coloured headings and handwritten entries. */
function paperTex(title: string, lines: string[], color = BLUE, progress = 0) {
  return painted(`yc2-paper-${title}-${progress}`, 256, 320, c => {
    c.fillStyle = PAPER; c.fillRect(0, 0, 256, 320);
    c.fillStyle = color; c.fillRect(0, 0, 256, 47);
    text(c, title, 128, 24, 23, '#ffffff', 'center');
    text(c, '해봄 · 함께 배우는 하루', 128, 64, 12, INK, 'center');
    lines.forEach((s, i) => {
      const y = 94 + i * 34;
      c.strokeStyle = '#c1cbd0'; c.strokeRect(16, y - 14, 224, 31);
      text(c, s, 23, y, 15, INK);
      if (i < progress) text(c, '✓', 222, y, 19, '#24865a', 'center');
    });
    text(c, '이름 __________   날짜 ______', 18, 299, 13, '#6a7c84');
  });
}
function paper(g: THREE.Object3D, title: string, lines: string[], p: V, w = 0.22, h = 0.28, color = BLUE) {
  const a = group(g, ...p);
  part(a, box(w, 0.006, h), PAPER, 0, 0, 0, { outline: false });
  flat(a, paperTex(title, lines, color), w, h, 0, 0.004, 0);
  return a;
}
function pen(g: THREE.Object3D, color = INK) {
  const p = group(g);
  part(p, cyl(0.006, 0.006, 0.12, 8), color, 0, 0.045, 0, { rz: -0.35, outline: false });
  part(p, cyl(0.002, 0.006, 0.025, 8), METAL, 0.021, -0.022, 0, { rz: -0.35, outline: false });
  return p;
}
function bottle(g: THREE.Object3D, x: number, y: number, z: number, color = BLUE) {
  part(g, cyl(0.032, 0.03, 0.17, 12), color, x, y + 0.085, z);
  part(g, cyl(0.019, 0.023, 0.025, 10), PAPER, x, y + 0.18, z);
  part(g, cyl(0.033, 0.033, 0.045, 12), PAPER, x, y + 0.08, z, { outline: false });
}
function bag(g: THREE.Object3D, color: string) {
  const a = group(g);
  part(a, rbox(0.36, 0.24, 0.24, 0.07), color, 0, 0.12, 0);
  for (const sx of [-1, 1]) part(a, ring(0.052, 0.009, Math.PI), INK, sx * 0.065, 0.24, 0);
  part(a, box(0.3, 0.007, 0.008), PAPER, 0, 0.245, 0, { outline: false });
  part(a, rbox(0.15, 0.12, 0.025, 0.015), PAPER, 0, 0.12, 0.127);
  label(a, '해봄', 0.11, 0.045, 0, 0.12, 0.142, PAPER, INK);
  return a;
}
/** A live face updates only when the text changes; no texture allocated per frame. */
function display(g: THREE.Object3D, w: number, h: number, p: V, bg = INK, fg = PAPER) {
  const canvas = typeof document === 'undefined' ? null : document.createElement('canvas');
  if (canvas) { canvas.width = 512; canvas.height = Math.max(64, Math.round(512 * h / w)); }
  const tex = canvas ? new THREE.CanvasTexture(canvas) : new THREE.Texture();
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = picture(g, tex, w, h, ...p);
  let last = '';
  return {
    mesh,
    set(s: string) {
      if (!canvas || last === s) return;
      last = s;
      const c = canvas.getContext('2d')!;
      c.fillStyle = bg; c.fillRect(0, 0, canvas.width, canvas.height);
      text(c, s, 256, canvas.height / 2, Math.min(55, canvas.height * 0.62), fg, 'center');
      tex.needsUpdate = true;
    },
  };
}
function segment(g: THREE.Object3D, r: number, color: string) {
  const m = part(g, cyl(r, r * 0.94, 1, 9), color, 0, 0, 0, { outline: false });
  return (a: THREE.Vector3, b: THREE.Vector3) => {
    const d = b.clone().sub(a);
    m.position.copy(a).addScaledVector(d, 0.5);
    m.scale.y = Math.max(0.001, d.length());
    m.quaternion.setFromUnitVectors(UP, d.normalize());
  };
}

/** Articulated participants: shoulders and elbows solve to hands; knees move when running.
 * A separate trunk pivot lets a seated teen slump without pulling the feet off the floor. */
function teen(parent: THREE.Object3D, x: number, z: number, yaw: number, color: string, seated = false, variant = 0) {
  const root = group(parent, x, 0, z, yaw);
  const hip = seated ? 0.52 : 0.76;
  const trunk = group(root, 0, hip, 0);
  part(trunk, rbox(0.29, 0.15, 0.23, 0.055), INK, 0, 0, 0);
  part(trunk, rbox(0.33, 0.4, 0.22, 0.065), color, 0, 0.25, 0);
  // A hoodie: pocket seam, contrasting hood, drawstrings, cuffs.
  part(trunk, rbox(0.2, 0.09, 0.013, 0.02), color, 0, 0.15, 0.116, { outline: false });
  part(trunk, rbox(0.2, 0.14, 0.12, 0.06), color, 0, 0.43, -0.1);
  for (const sx of [-1, 1]) rod(trunk, v(sx * 0.04, 0.44, 0.12), v(sx * 0.035, 0.31, 0.13), 0.003, PAPER);
  part(trunk, cyl(0.04, 0.045, 0.08, 10), SKIN, 0, 0.49, 0);
  const head = group(trunk, 0, 0.63, 0);
  part(head, ball(0.113), SKIN, 0, 0, 0);
  part(head, ball(0.117), variant % 2 ? '#352821' : '#27262b', 0, 0.034, -0.025);
  part(head, rbox(0.19, 0.05, 0.05, 0.018), '#352821', -0.01, 0.07, 0.075, { rz: -0.08 });
  if (variant % 2) part(head, rbox(0.055, 0.18, 0.055, 0.025), '#352821', 0.02, -0.03, -0.13, { rx: 0.2 });
  for (const sx of [-1, 1]) {
    part(head, ball(0.009), INK, sx * 0.038, 0, 0.105, { outline: false });
    part(head, ball(0.018), SKIN, sx * 0.11, -0.01, 0, { outline: false });
  }
  part(head, box(0.03, 0.006, 0.004), '#a46c62', 0, -0.042, 0.108, { outline: false });
  const legs = [-1, 1].map(sx => {
    const upper = segment(root, 0.052, INK), lower = segment(root, 0.043, INK);
    const shoe = part(root, rbox(0.105, 0.065, 0.2, 0.025), PAPER, 0, 0, 0);
    part(shoe, box(0.108, 0.012, 0.202), '#c7cdd0', 0, -0.025, 0, { outline: false });
    return (stride = 0, squat = 0) => {
      const h = v(sx * 0.085, hip - squat * 0.3, 0);
      const knee = v(sx * 0.1, seated ? 0.5 : 0.4 - squat * 0.14 + Math.max(0, stride) * 0.12, seated ? 0.29 : stride * 0.2 + squat * 0.23);
      const ankle = v(sx * 0.1, seated ? 0.08 : 0.08 + Math.max(0, stride) * 0.1, seated ? 0.37 : stride * 0.23);
      upper(h, knee); lower(knee, ankle);
      shoe.position.copy(ankle).add(v(0, -0.035, 0.055));
    };
  });
  const arms = [-1, 1].map(sx => {
    const upper = segment(root, 0.041, color), lower = segment(root, 0.031, SKIN);
    const hand = part(root, ball(0.033), SKIN, 0, 0, 0, { outline: false });
    return (target?: V) => {
      const shoulder = v(sx * 0.19, 0.43, 0).applyAxisAngle(v(1, 0, 0), trunk.rotation.x).add(v(0, trunk.position.y, 0));
      const p = target ? vec(target) : v(sx * 0.16, seated ? 0.68 : 0.83, 0.17);
      const d = p.clone().sub(shoulder), length = Math.min(0.49, Math.max(0.04, d.length()));
      d.normalize(); p.copy(shoulder).addScaledVector(d, length);
      const cos = THREE.MathUtils.clamp((0.26 ** 2 + length ** 2 - 0.24 ** 2) / (0.52 * length), -1, 1);
      const bend = v(sx * 0.6, -1, -0.25); bend.addScaledVector(d, -bend.dot(d)).normalize();
      const elbow = shoulder.clone().addScaledVector(d, 0.26 * cos).addScaledVector(bend, 0.26 * Math.sqrt(1 - cos * cos));
      upper(shoulder, elbow); lower(elbow, p); hand.position.copy(p);
      return p;
    };
  });
  legs.forEach(l => l()); arms.forEach(a => a());
  /** Hand endpoint supplied in furniture coordinates. Returns its actual reachable endpoint. */
  const handAt = (i: number, p?: V) => {
    const local = p ? vec(p).sub(root.position).applyAxisAngle(UP, -root.rotation.y) : undefined;
    const actual = arms[i](local ? [local.x, local.y, local.z] : undefined);
    return actual.applyAxisAngle(UP, root.rotation.y).add(root.position);
  };
  return {
    root, head, trunk, handAt,
    pose(lean = 0, nod = 0, run = 0, squat = 0) {
      trunk.rotation.x = lean;
      trunk.position.y = hip - squat * 0.3;
      head.rotation.x = nod;
      legs[0](run, squat); legs[1](-run, squat);
      arms.forEach(a => a());
    },
  };
}

/** What a chair's top comes to (and the drummer's stool): where a body sits. */
const CHAIR_TOP = 0.48;
/**
 * A drawn participant played by a VRoid body, a teen unless said: the same orders, the hands to the
 * same points and back to rest with each `pose`, the head's nod, and a run as strides of the ankles.
 * A lean (slumped in a chair) and a squat aren't a body's to do: it stays upright, so whoever really
 * bends (the coach lifting a bag) stays drawn. Props follow the drawn hand's answer.
 */
function bodied(p: ReturnType<typeof teen>, opts: FigureOptions): ReturnType<typeof teen> {
  const noArm = () => undefined;
  let run = 0;
  const ankle = (sx: number, s: number) => v(sx * 0.1, 0.08 + Math.max(0, s) * 0.1, s * 0.23).applyAxisAngle(UP, p.root.rotation.y).add(p.root.position);
  const f = vroidFigure({ root: p.root, head: p.head, armL: noArm, armR: noArm }, {
    stage: 'teen',
    legs: () => (run ? { r: ankle(-1, run), l: ankle(1, -run) } : {}),
    ...opts,
  });
  return {
    ...p,
    // The drawn figure's arm 0 is at its -x: facing +z, that's its right.
    handAt(i, to) {
      (i ? f.armL : f.armR)(to ? vec(to) : null);
      return p.handAt(i, to);
    },
    pose(lean = 0, nod = 0, r = 0, squat = 0) {
      run = r;
      p.pose(lean, nod, r, squat);
      f.armL(null);
      f.armR(null);
    },
  };
}

function paddle(g: THREE.Object3D, color: string) {
  const a = group(g);
  part(a, rbox(0.026, 0.115, 0.018, 0.008), WOOD, 0, 0, 0);
  part(a, cyl(0.083, 0.083, 0.018, 22), WOOD, 0, 0.13, 0, { rx: Math.PI / 2 });
  for (const s of [-1, 1]) part(a, cyl(0.081, 0.081, 0.003, 22), s > 0 ? color : '#29313b', 0, 0.13, s * 0.011, { rx: Math.PI / 2, outline: false });
  return a;
}
function cone(g: THREE.Object3D, x: number, z: number) {
  part(g, rbox(0.18, 0.02, 0.18, 0.014), ORANGE, x, 0.01, z);
  part(g, cyl(0.018, 0.075, 0.22, 12), ORANGE, x, 0.13, z);
  part(g, cyl(0.041, 0.052, 0.035, 12), PAPER, x, 0.14, z, { outline: false });
}

// ---------------------------------------------------------------------------------------------
// Sports: two sewn folding mats, equipment basket, relay gates and following teens.

function activityMat(g: THREE.Group, out: Built) {
  for (const x of [-0.49, 0.49]) {
    part(g, rbox(0.95, 0.065, 0.91, 0.03), BLUE, x, 0.0325, 0);
    for (const z of [-0.3, 0, 0.3]) part(g, box(0.91, 0.003, 0.006), '#326782', x, 0.067, z, { outline: false });
    for (const sx of [-1, 1]) {
      part(g, box(0.006, 0.003, 0.82), '#8fc0cc', x + sx * 0.43, 0.067, 0, { outline: false });
      part(g, rbox(0.06, 0.008, 0.14, 0.02), '#b9dbcf', x + sx * 0.1, 0.07, 0.04, { outline: false });
    }
  }
  for (const x of [-0.62, 0.62]) cone(g, x, 0.62);
  // Bean bags, relay batons and hoops in the basket behind the mat.
  part(g, rbox(0.38, 0.25, 0.27, 0.035), '#e8cf9e', -0.77, 0.125, -0.62);
  for (let i = 0; i < 4; i++) part(g, rbox(0.1, 0.05, 0.1, 0.02), [ORANGE, SAGE, LILAC, BLUE][i], -0.88 + (i % 2) * 0.17, 0.25 + Math.floor(i / 2) * 0.03, -0.62);
  for (let i = 0; i < 3; i++) part(g, ring(0.2, 0.012), [ORANGE, BLUE, SAGE][i], 0.75, 0.29, -0.62 + i * 0.035, { rx: -0.2 });
  const board = group(g, 0, 0, -0.64);
  for (const x of [-0.23, 0.23]) rod(board, v(x, 0.02, 0), v(x, 0.7, 0), 0.012, INK);
  part(board, rbox(0.65, 0.28, 0.035, 0.015), INK, 0, 0.76, 0);
  const status = display(board, 0.6, 0.19, [0, 0.77, 0.02]);
  label(board, '해봄 체육교실', 0.6, 0.07, 0, 0.96, 0.02, BLUE, PAPER);
  const students = [-0.48, 0.48].map((x, i) => bodied(teen(g, x, -0.12, 0, i ? ORANGE : SAGE, false, i), { gender: i ? 'male' : 'female' }));
  const whistle = group(g);
  part(whistle, rbox(0.025, 0.025, 0.045, 0.007), METAL, 0, 0, 0);
  const baton = part(g, cyl(0.018, 0.018, 0.24, 12), ORANGE, 0, 0, 0, { rz: Math.PI / 2 });
  const lead = use(g, 'ycStretch'), camp = use(g, 'ycLeadership');
  out.spots = { leadActivity: lead, youthCounselor_leadCamp: camp, '*': lead };
  out.work = lead.work;
  out.away = (_o, t) => {
    const s = current([lead, camp], t), m = s?.motion as Y.YouthMotion | undefined;
    const b = m && s ? Y.youthBeat(m, t, phase(s)) : null;
    const key = b ? Y.keyOf(b) : '', u = b ? Y.uOf(b) : 0;
    const h = m && s ? Y.youthHands(m, t, phase(s), height(s)) : null;
    whistle.visible = !!s && m === 'ycStretch';
    if (h) put(whistle, key === 'whistle' ? h.r : Y.add(h.l, 0, -0.02));
    baton.visible = m === 'ycLeadership' && ['offer', 'team', 'relay'].includes(key);
    if (h && key === 'offer') put(baton, h.r);
    students.forEach((p, i) => {
      p.root.visible = !!s;
      p.root.position.set(i ? 0.48 : -0.48, 0.068, -0.12);
      p.root.rotation.y = 0;
      if (m === 'ycLeadership' && i === 0 && (key === 'offer' || key === 'team')) p.root.position.z = key === 'team' ? 0.15 : Y.mix(-0.12, 0.15, sm(u, 0, 0.65));
      const running = key === 'relay';
      if (running) {
        // Two lanes: each teen turns at their cone and returns; nobody crosses the coach's lane.
        const q = (u + i * 0.18) % 1;
        const sx = i ? 1 : -1;
        p.root.position.x = sx * (0.48 + 0.58 * Math.sin(q * Math.PI));
        p.root.position.z = -0.12 + Math.sin(q * Math.PI) * 0.92;
        p.root.rotation.y = Math.atan2(sx * 0.58 * Math.cos(q * Math.PI), 0.92 * Math.cos(q * Math.PI));
      }
      p.pose(running ? 0.13 : 0, key === 'reflect' ? 0.08 : 0, running ? Math.sin(t * 13 + i) : 0);
      if (key === 'warm' || key === 'stretch') {
        const lift = key === 'stretch' ? 1 : 0.5 + 0.5 * wave(t - i * 0.12 - 0.18, 0.45);
        p.handAt(0, [p.root.position.x - 0.23, 1.02 + lift * 0.52, p.root.position.z + 0.06]);
        p.handAt(1, [p.root.position.x + 0.23, 1.02 + lift * 0.52, p.root.position.z + 0.06]);
      } else if (running) {
        const q = wave(t, 2, i * 0.5);
        // Swinging at their sides, whichever way they're running.
        const side = (sx: number, swing: number): V => {
          const o = v(sx * 0.17, 0, swing).applyAxisAngle(UP, p.root.rotation.y);
          return [p.root.position.x + o.x, 1.02 + swing * 0.64, p.root.position.z + o.z];
        };
        p.handAt(0, side(-1, q * 0.14));
        const hand = p.handAt(1, side(1, -q * 0.14));
        if (i === 0 && m === 'ycLeadership') baton.position.copy(hand);
      } else if ((key === 'team' || key === 'offer' && u > 0.65) && i === 0) {
        const hand = p.handAt(1, [-0.25, 1.03, 0.53]);
        if (key === 'team') baton.position.copy(hand);
      } else if (key === 'cheer' || key === 'clap') {
        const d = 0.04 + 0.05 * Math.abs(wave(t, 2));
        p.handAt(0, [p.root.position.x - d, 1.06, 0.15]);
        p.handAt(1, [p.root.position.x + d, 1.06, 0.15]);
      }
    });
    const captions: Record<string, string> = { whistle: '준비! 몸을 풀어요', warm: '하나 둘 · 팔 돌리기', ready: '출발선에서 준비', relay: '콘 돌아 이어달리기', clap: '좋아요! 모두 성공', stretch: '쭉 늘리고 · 숨 고르기', brief: '서로 돕는 리더십', offer: '팀장에게 바통 전달', team: '작전은 함께 정해요', reflect: '어떻게 도와줬나요?', cheer: '우리 팀, 잘했어!' };
    status.set(captions[key] ?? '체육 · 협동 활동');
  };
}

function pingpongTable(g: THREE.Group, out: Built) {
  part(g, rbox(1.98, 0.04, 0.99, 0.012), '#237f77', 0, 0.79, 0);
  part(g, box(1.95, 0.085, 0.94), INK, 0, 0.73, 0);
  for (const x of [-0.68, 0.68]) {
    for (const z of [-0.35, 0.35]) {
      part(g, box(0.04, 0.66, 0.04), METAL, x, 0.37, z);
      part(g, cyl(0.042, 0.042, 0.028, 12), INK, x, 0.042, z, { rz: Math.PI / 2 });
    }
    part(g, box(0.04, 0.035, 0.75), INK, x, 0.19, 0);
    rod(g, v(x, 0.2, -0.35), v(x * 0.6, 0.68, 0.35), 0.013, INK);
  }
  for (const z of [-0.47, 0, 0.47]) part(g, box(1.95, 0.003, 0.015), PAPER, 0, 0.812, z, { outline: false });
  for (const x of [-0.96, 0.96]) part(g, box(0.015, 0.003, 0.95), PAPER, x, 0.812, 0, { outline: false });
  for (const z of [-0.53, 0.53]) {
    part(g, box(0.035, 0.18, 0.028), INK, 0, 0.88, z);
    part(g, box(0.09, 0.025, 0.04), INK, 0, 0.78, z);
  }
  for (let i = 0; i <= 26; i++) part(g, box(0.004, 0.147, 0.004), '#b8d3ce', 0, 0.888, -0.52 + i * 0.04, { outline: false });
  for (let i = 0; i < 6; i++) part(g, box(0.004, 0.004, 1.04), '#b8d3ce', 0, 0.82 + i * 0.028, 0, { outline: false });
  part(g, box(0.012, 0.014, 1.08), PAPER, 0, 0.967, 0);
  label(g, '해봄 탁구교실', 0.7, 0.1, 0.2, 0.71, 0.476, INK, PAPER);
  // Flip scoreboard and ball bucket sit on the far side, clear of both players.
  part(g, rbox(0.42, 0.24, 0.055, 0.012), INK, 0.55, 0.94, -0.59, { rx: -0.12 });
  const score = display(g, 0.36, 0.15, [0.55, 0.96, -0.558], '#142831', '#ffe39c');
  part(g, cyl(0.1, 0.09, 0.19, 14), '#d9b97d', -0.7, 0.1, -0.64);
  for (let i = 0; i < 7; i++) part(g, ball(0.027), PAPER, -0.75 + (i % 3) * 0.045, 0.2 + (i % 2) * 0.02, -0.67 + Math.floor(i / 3) * 0.04, { outline: false });
  const s = use(g, 'ycRally');
  out.spots = { playPingPong: s, '*': s }; out.work = s.work;
  const playing = group(g); out.inUse = playing;
  const p = bodied(teen(playing, -1.48, 0.04, Math.PI / 2, ORANGE), { gender: 'male' });
  const red = paddle(playing, '#cb4f48'), black = paddle(playing, INK);
  const b = part(playing, ball(0.028), PAPER, 0, 0.9, 0);
  const spare = paddle(g, '#cb4f48');
  spare.position.set(0.64, 0.828, 0.25); spare.rotation.x = -Math.PI / 2;
  out.idle = spare;
  out.away = (_o, t) => {
    const on = active(s, t), r = Y.rallyNow(t, phase(s));
    s.at.position.x = Y.BASE.ycRally[0] + (on ? r.step : 0);
    playing.visible = on; spare.visible = !on;
    put(red, r.right); red.rotation.y = -Math.PI / 2;
    put(black, r.left); black.rotation.y = Math.PI / 2;
    put(b, r.ball);
    p.pose(r.key === 'ready' ? 0.18 : 0.1, 0.08);
    p.handAt(0, r.left);
    p.handAt(1, [-1.38, 1.0, -0.16]);
    if (r.key === 'miss' || r.key === 'fetch') p.head.rotation.y = -0.2;
    score.set(on ? `${r.score}   :   ${r.score - 1}` : '03   :   02');
  };
}

// ---------------------------------------------------------------------------------------------
// Programme desk: four different jobs, one chair. Calendar cells fill as dates are agreed,
// the printer feeds a poster, and a school partner signs off on the plan across the desk.

function programDesk(g: THREE.Group, out: Built) {
  desk(g); chair(g, 0, 0.43, Math.PI);
  part(g, rbox(0.2, 0.14, 0.35, 0.012), '#d3c2aa', -0.35, 0.64, -0.04);
  part(g, box(0.07, 0.012, 0.012), METAL, -0.35, 0.64, 0.14);
  label(g, '활동 기획', 0.34, 0.07, 0.19, 0.66, 0.34, WOOD, INK);
  // Left monitor, central document area, right compact printer. Nothing on the sitter's lap.
  part(g, rbox(0.16, 0.015, 0.13, 0.01), INK, -0.21, 0.784, -0.2);
  part(g, box(0.025, 0.13, 0.025), INK, -0.21, 0.85, -0.24);
  part(g, rbox(0.36, 0.24, 0.025, 0.012), INK, -0.21, 1.01, -0.23);
  const screens = ['기획안 작성', '지난 활동 평가', '학교 협력 일정', '오늘의 출석부'].map((title, j) => picture(g,
    painted(`yc2-screen-${j}`, 320, 200, c => {
      c.fillStyle = '#edf3ee'; c.fillRect(0, 0, 320, 200);
      c.fillStyle = BLUE; c.fillRect(0, 0, 320, 32);
      text(c, title, 12, 16, 20, PAPER);
      ['체육 · 협동 활동', '밴드 · 리듬 익히기', '책수다 · 서로 듣기', '자습 · 나의 목표'].forEach((s, i) => {
        c.fillStyle = i % 2 ? '#dde9e5' : '#ffffff'; c.fillRect(10, 43 + i * 34, 300, 30);
        text(c, s, 18, 58 + i * 34, 16, INK);
        text(c, j === 1 ? `${85 + i * 3}%` : j === 3 ? `${i + 4}명` : '확인', 292, 58 + i * 34, 15, '#32866d', 'right');
      });
    }), 0.33, 0.205, -0.21, 1.01, -0.216));
  out.screen = screens[0];
  const keyboard = group(g, ...Y.PD.keys);
  part(keyboard, rbox(0.29, 0.014, 0.11, 0.007), INK, 0, -0.01, 0);
  for (let row = 0; row < 3; row++) for (let col = 0; col < 10; col++) part(keyboard, box(0.021, 0.006, 0.02), '#c5d3d7', -0.12 + col * 0.026, 0, -0.03 + row * 0.026, { outline: false });
  part(g, rbox(0.045, 0.02, 0.07, 0.018), INK, 0.33, 0.795, 0.14);
  const journal = paper(g, '프로그램 계획', ['목표 · 서로 돕기', '대상 · 청소년 12명', '준비 · 콘과 바통', '평가 · 한 줄 소감'], Y.PD.paper, 0.27, 0.29);
  const pageHinge = group(journal, -0.13, 0.01, 0);
  part(pageHinge, box(0.26, 0.002, 0.28), PAPER, 0.13, 0, 0, { outline: false });
  const writing = pen(g, BLUE);
  const highlighter = pen(g, '#f1be3e'); highlighter.visible = false;
  const noteLines = Array.from({ length: 5 }, (_, i) => part(journal, box(0.12 + (i % 2) * 0.04, 0.002, 0.003), BLUE, -0.01, 0.006, -0.05 + i * 0.029, { outline: false }));
  const highlights = Array.from({ length: 3 }, (_, i) => part(journal, box(0.19, 0.001, 0.014), '#f7d965', 0, 0.0055, -0.08 + i * 0.045, { outline: false }));
  // Raised calendar on a shallow backboard, reachable above the printer.
  const calendar = group(g, 0, -0.11, 0);
  const calendarArms = [0.06, 0.4].map(x => {
    part(g, cyl(0.025, 0.025, 0.012, 12), INK, x, 0.79, -0.32);
    const link = segment(g, 0.009, METAL);
    return (pull: number) => link(v(x, 0.8, -0.32), v(x, 1.02, -0.39 + pull));
  });
  part(calendar, rbox(0.45, 0.45, 0.025, 0.01), EDGE, 0.23, 1.29, -0.39);
  picture(calendar, painted('yc2-calendar', 256, 256, c => {
    c.fillStyle = PAPER; c.fillRect(0, 0, 256, 256);
    c.fillStyle = ORANGE; c.fillRect(0, 0, 256, 45);
    text(c, '이번 달 프로그램', 128, 23, 23, INK, 'center');
    ['월', '화', '수', '목', '금'].forEach((s, i) => text(c, s, 32 + i * 48, 63, 17, INK, 'center'));
    for (let i = 0; i < 20; i++) {
      c.strokeStyle = '#d4c8b6'; c.strokeRect(8 + (i % 5) * 48, 79 + Math.floor(i / 5) * 41, 47, 40);
      text(c, String(i + 1), 15 + (i % 5) * 48, 90 + Math.floor(i / 5) * 41, 11, '#7d837d');
    }
  }), 0.42, 0.42, 0.23, 1.29, -0.376);
  const dates = [0, 1, 2, 3].map(i => {
    const p = part(calendar, box(0.069, 0.034, 0.003), [SAGE, LILAC, BLUE, ORANGE][i], 0.08 + i * 0.092, 1.31, -0.371, { outline: false });
    return p;
  });
  part(g, rbox(0.27, 0.13, 0.24, 0.016), '#e3e7e1', 0.33, 0.84, -0.2);
  part(g, box(0.22, 0.013, 0.015), INK, 0.33, 0.89, -0.073, { outline: false });
  part(g, box(0.23, 0.008, 0.07), METAL, 0.33, 0.85, -0.045, { outline: false });
  const printerLed = glowing(g, ball(0.009), '#88e8ad', 0.43, 0.908, -0.12);
  const poster = paper(g, '함께하는 토요일', ['협동 체육', '별빛 밴드', '10:00 · 활동실', '누구나 참여해요'], [0.33, 0.87, -0.06], 0.18, 0.25, ORANGE);
  // Bound annual evaluations and the telephone's separate handset.
  for (let i = 0; i < 3; i++) {
    part(g, box(0.033, 0.19, 0.15), [BLUE, SAGE, ORANGE][i], -0.44 + i * 0.038, 0.87, -0.19);
    label(g, ['평가', '기획', '안전'][i], 0.027, 0.065, -0.44 + i * 0.038, 0.89, -0.113, [BLUE, SAGE, ORANGE][i], PAPER);
  }
  part(g, rbox(0.14, 0.035, 0.13, 0.012), INK, -0.35, 0.8, -0.04);
  const handset = group(g);
  part(handset, rbox(0.035, 0.035, 0.15, 0.015), INK, 0, 0, 0);
  for (const z of [-0.06, 0.06]) part(handset, rbox(0.055, 0.045, 0.04, 0.012), INK, 0, -0.005, z);
  // A side chair keeps the visitor clear of the wall behind this compact desk.
  const partnerChair = chair(g, -0.72, 0.03, Math.PI / 2, SAGE);
  const partner = bodied(teen(g, -0.72, 0.03, Math.PI / 2, '#657f91', true), { stage: 'adult', gender: 'female', seat: CHAIR_TOP });
  const spots = [use(g, 'ycPlan'), use(g, 'ycStudyPrograms'), use(g, 'ycPartner'), use(g, 'ycRun')];
  out.spots = { planProgram: spots[0], youthCounselor_studyPrograms: spots[1], youthCounselor_partnerSchools: spots[2], youthCounselor_runProgram: spots[3], '*': spots[0] };
  out.work = spots[0].work;
  const ready = display(calendar, 0.4, 0.055, [0.23, 1.56, -0.375], INK, PAPER);
  out.away = (_o, t) => {
    const s = current(spots, t), index = s ? spots.indexOf(s) : 0;
    const m = (s?.motion ?? 'ycPlan') as Y.YouthMotion;
    const b = Y.youthBeat(m, t, phase(s ?? spots[0])), key = Y.keyOf(b), u = Y.uOf(b);
    const h = Y.youthHands(m, t, phase(s ?? spots[0]), height(s ?? spots[0]));
    calendar.position.z = s ? 0.6 * Y.weightOf(b, ['calendar']) : 0;
    calendarArms.forEach(arm => arm(calendar.position.z));
    screens.forEach((p, i) => { p.visible = i === index; (p.material as THREE.MeshBasicMaterial).color.set(s ? '#ffffff' : '#889c96'); });
    const writingNow = !!s && ['write', 'note', 'check', 'calendar'].includes(key);
    put(writing, writingNow ? h.r : Y.PD.pen);
    writing.rotation.z = writingNow ? 0 : Math.PI / 2;
    writing.visible = key !== 'highlight' || !s;
    highlighter.visible = !!s && key === 'highlight';
    if (highlighter.visible) put(highlighter, h.r);
    noteLines.forEach((p, i) => { p.visible = !!s && (key === 'note' || key === 'write') && i <= Math.floor(u * 5); });
    highlights.forEach((p, i) => { p.visible = !!s && index === 1 && (key === 'note' || (key === 'highlight' && i <= Math.floor(u * 3))); });
    pageHinge.visible = !!s && ['open', 'turn'].includes(key);
    pageHinge.rotation.z = Math.PI * sm(u, 0.1, 0.85);
    dates.forEach((p, i) => { p.visible = !s || b.i >= (index === 2 ? 3 : 2) && (key !== 'calendar' || i <= Math.floor(u * 4)); });
    const printing = !!s && key === 'print';
    printerLed.visible = printing && Math.sin(t * 14) > 0;
    poster.visible = !!s && ['print', 'collect', 'file'].includes(key);
    if (printing) { poster.position.set(0.33, 0.87, -0.08 + u * 0.18); poster.scale.z = 0.1 + u * 0.9; }
    else { poster.scale.z = 1; put(poster, Y.add(h.r, 0, -0.012, -0.06)); }
    const calling = !!s && key === 'phone';
    put(handset, calling ? h.l : [-0.35, 0.84, -0.04]);
    handset.rotation.z = calling ? 1.45 : 0;
    partnerChair.visible = partner.root.visible = !!s && index === 2;
    if (partner.root.visible) {
      partner.pose(key === 'listen' ? 0.06 : 0.13, key === 'agree' ? 0.08 + 0.1 * Math.abs(wave(t, 1)) : 0.1);
      if (key === 'listen') partner.handAt(1, [-0.5, 0.95, -0.23]);
      if (key === 'show' || key === 'agree') partner.handAt(1, [-0.28, 0.8, -0.24]);
    }
    ready.set(!s ? '월간 계획 · 해봄' : key === 'calendar' ? '일정 확정 중' : printing ? '안내문 인쇄 중' : index === 1 ? '읽고 · 비교하고 · 기록' : index === 2 ? '학교와 함께 계획해요' : index === 3 ? '출석 · 연락 · 운영' : '함께 만드는 프로그램');
  };
}

// ---------------------------------------------------------------------------------------------
// Counselling: private conversation at eye level. Group work folds the desk away,
// revealing a small circle, with a talking stone passed from teen to teen.

function youthCounselDesk(g: THREE.Group, out: Built) {
  const table = group(g); desk(table);
  const counsellorChair = chair(g, 0, 0.46, Math.PI, LILAC);
  const visitorChair = chair(g, 0, -0.4, 0, SAGE);
  label(table, '마음쉼 · 천천히 이야기해요', 0.84, 0.09, 0, 0.64, 0.335, LILAC, PAPER);
  const journal = paper(table, '상담 일지', ['오늘의 마음', '친구 · 학교 · 가족', '함께 정한 작은 목표', '다음 만남'], Y.CD.journal, 0.24, 0.29, LILAC);
  const notes = Array.from({ length: 5 }, (_, i) => part(journal, box(0.12, 0.0015, 0.003), INK, 0, 0.006, -0.05 + i * 0.027, { outline: false }));
  const writing = pen(g, LILAC);
  part(table, rbox(0.2, 0.1, 0.13, 0.02), '#d9c9e8', 0.29, 0.83, -0.04);
  part(table, rbox(0.11, 0.007, 0.024, 0.008), INK, 0.29, 0.885, -0.04, { outline: false });
  const tissueRest = part(table, box(0.065, 0.08, 0.006), PAPER, 0.29, 0.923, -0.04, { rz: -0.15, outline: false });
  const tissue = group(g);
  for (let i = 0; i < 3; i++) part(tissue, box(0.075, 0.002, 0.055), PAPER, i * 0.006, i * 0.004, 0, { rz: 0.12 * i, outline: false });
  const cards = ['괜찮아요', '속상해요', '기대돼요'].map((s, i) => {
    const p = label(table, s, 0.09, 0.06, 0.025 + i * 0.095, 0.784, 0.18, ['#dcebd3', '#d9d3ed', '#f7dfaa'][i], INK);
    p.rotation.x = -Math.PI / 2; return p;
  });
  for (const z of [-0.19, 0.2]) {
    part(table, cyl(0.035, 0.03, 0.07, 14), PAPER, -0.35, 0.81, z);
    part(table, cyl(0.029, 0.029, 0.003, 14), '#b6d1c2', -0.35, 0.846, z, { outline: false });
  }
  const privacy = group(g, -0.55, 0, -0.22);
  part(privacy, rbox(0.035, 1.15, 0.7, 0.015), '#ddd2e6', 0, 0.575, 0);
  part(privacy, box(0.07, 0.03, 0.7), EDGE, 0, 0.02, 0);
  const light = glowing(table, ball(0.017), '#88d4af', 0.43, 0.8, -0.22);
  const folded = group(g, 0, 0, -0.95);
  part(folded, rbox(0.94, 0.64, 0.045, 0.02), WOOD, 0, 0.66, 0);
  for (const x of [-0.35, 0.35]) part(folded, box(0.025, 0.64, 0.035), INK, x, 0.63, 0.035);
  part(folded, box(0.8, 0.025, 0.035), INK, 0, 0.35, 0.035);
  label(folded, '또래 이야기 모임', 0.6, 0.09, 0, 0.91, 0.027, LILAC, PAPER);
  for (const x of [-0.25, 0.25]) rod(folded, v(x, 0.94, 0), v(x, 1.15, 0), 0.008, METAL);
  part(folded, box(0.7, 0.13, 0.025), LILAC, 0, 1.1, 0.006);
  const rug = part(g, cyl(0.89, 0.89, 0.008, 40), '#e4dae9', 0, 0.005, 0.02, { outline: false });
  const one = bodied(teen(g, 0, -0.4, 0, SAGE, true, 1), { gender: 'female', seat: CHAIR_TOP });
  const peers = [-1, 1].map((sx, i) => {
    const x = sx * 0.64, z = 0.1, yaw = -sx * Math.PI / 2;
    return { chair: chair(g, x, z, yaw, i ? BLUE : ORANGE), teen: bodied(teen(g, x, z, yaw, i ? BLUE : ORANGE, true, i), { gender: i ? 'male' : 'female', seat: CHAIR_TOP }) };
  });
  const stone = part(g, ball(0.055), '#daa55e', 0, 0, 0);
  const listen = use(g, 'ycListen'), circle = use(g, 'ycCircle');
  out.spots = { counselYouth: listen, youthCounselor_groupCounsel: circle, '*': listen }; out.work = listen.work;
  const prompt = display(g, 0.66, 0.09, [0, 1.1, -0.925], LILAC, PAPER);
  out.away = (_o, t) => {
    const s = current([listen, circle], t), isGroup = s === circle;
    const m = isGroup ? 'ycCircle' : 'ycListen';
    const b = Y.youthBeat(m, t, phase(s ?? listen)), key = Y.keyOf(b), u = Y.uOf(b);
    const h = Y.youthHands(m, t, phase(s ?? listen), height(s ?? listen));
    table.visible = !isGroup; folded.visible = rug.visible = isGroup;
    privacy.visible = !isGroup; prompt.mesh.visible = isGroup;
    counsellorChair.position.z = isGroup ? 0.78 : 0.46;
    visitorChair.position.z = one.root.position.z = isGroup ? -0.5 : -0.4;
    one.root.visible = !!s;
    peers.forEach(p => { p.chair.visible = p.teen.root.visible = isGroup; });
    light.visible = !!s && !isGroup;
    writing.visible = !isGroup;
    put(writing, !!s && key === 'note' ? h.r : [-0.34, 0.79, 0.23]);
    writing.rotation.z = key === 'note' && s ? 0 : Math.PI / 2;
    notes.forEach((p, i) => { p.visible = !!s && (key === 'close' || key === 'note' && i <= Math.floor(u * 5)); });
    cards.forEach((p, i) => { p.position.y = 0.784 + (key === 'close' && i === 0 ? 0.008 : 0); });
    tissue.visible = !!s && !isGroup && ['tissue', 'receive', 'reflect'].includes(key);
    tissueRest.visible = !tissue.visible;
    if (!isGroup) {
      const relieved = ['reflect', 'note', 'close'].includes(key);
      one.pose(relieved ? 0.03 : key === 'tissue' || key === 'receive' ? 0.32 : 0.22, relieved ? 0.03 : 0.27);
      if (key === 'listen') one.handAt(1, [0.17, 0.91, -0.38]);
      if (key === 'tissue') {
        put(tissue, h.r);
        if (u > 0.65) one.handAt(0, Y.CD.offer);
      } else if (key === 'receive') {
        const hand = one.handAt(0, Y.lerp(Y.CD.offer, [-0.08, 1.1, -0.21], sm(u, 0, 0.7)));
        tissue.position.copy(hand);
      } else if (key === 'reflect') {
        tissue.position.copy(one.handAt(0, [-0.12, 0.71, -0.4]));
        one.handAt(1, [0.17, 0.91, -0.33]);
      }
    } else {
      one.pose(0.06, key === 'second' ? 0.06 : 0.1);
      peers.forEach((p, i) => {
        p.teen.pose(key === 'pass' ? 0.55 : 0.08, 0.08 + 0.04 * wave(t, 0.8, i * 0.2));
      });
    }
    stone.visible = isGroup;
    if (isGroup) {
      const first = peers[1].teen, second = peers[0].teen;
      if (key === 'rules' || key === 'offer') put(stone, h.r);
      else if (key === 'first') stone.position.copy(first.handAt(1, [0.4, 0.82, 0.17]));
      else if (key === 'pass') {
        const p = Y.lerp([0.4, 0.82, 0.17], [-0.4, 0.82, 0.17], sm(u, 0.15, 0.85));
        put(stone, p);
        first.handAt(1, p); second.handAt(0, p);
      } else stone.position.copy(second.handAt(0, [-0.4, 0.82, 0.17]));
      if (key === 'first') first.handAt(0, [0.41, 1.03, -0.06]);
      if (key === 'second') second.handAt(1, [-0.4, 1.02, -0.05]);
    }
    prompt.set(key === 'rules' ? '말하는 친구를 기다려요' : key === 'first' || key === 'second' ? '내 마음은 이랬어요' : key === 'reflect' ? '친구의 말을 되짚어요' : '한 사람씩 · 함께 듣기');
  };
}

// ---------------------------------------------------------------------------------------------
// Band corner: drums, bass guitar, amp, music stand and acoustic panels. The coach
// has a clear strip in front of the kit; students stop and answer the slower rhythm.

function bandCorner(g: THREE.Group, out: Built) {
  part(g, rbox(2.94, 0.035, 1.94, 0.025), '#515d69', 0, 0.018, 0);
  for (let i = 0; i < 9; i++) {
    part(g, rbox(0.29, 1.38, 0.065, 0.016), i % 2 ? '#71858d' : '#61767f', -1.3 + i * 0.325, 0.85, -0.93);
    for (let j = 0; j < 4; j++) part(g, box(0.009, 1.28, 0.007), '#526973', -1.4 + i * 0.325 + j * 0.067, 0.85, -0.893, { outline: false });
  }
  label(g, '별빛 밴드 · 서로의 소리를 들어요', 2.55, 0.17, 0, 1.6, -0.886, INK, PAPER);
  const dx = -0.48;
  const shell = '#a96753';
  part(g, cyl(0.275, 0.275, 0.36, 28), shell, dx, 0.33, 0.04, { rx: Math.PI / 2 });
  for (const z of [-0.15, 0.23]) {
    part(g, cyl(0.278, 0.278, 0.016, 28), METAL, dx, 0.33, z, { rx: Math.PI / 2 });
    part(g, cyl(0.257, 0.257, 0.018, 28), PAPER, dx, 0.33, z + 0.003, { rx: Math.PI / 2, outline: false });
  }
  label(g, '별빛', 0.25, 0.08, dx, 0.33, 0.245, PAPER, INK);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    part(g, box(0.02, 0.02, 0.31), METAL, dx + Math.cos(a) * 0.275, 0.33 + Math.sin(a) * 0.275, 0.04, { outline: false });
  }
  for (const [x, z, y, r] of [[-0.75, -0.09, 0.73, 0.15], [-0.38, -0.09, 0.73, 0.15], [-0.1, 0.12, 0.58, 0.19]] as const) {
    part(g, cyl(r, r, 0.18, 24), shell, x, y, z);
    for (const sy of [-1, 1]) part(g, cyl(r + 0.005, r + 0.005, 0.012, 24), METAL, x, y + sy * 0.095, z);
    part(g, cyl(r - 0.012, r - 0.012, 0.012, 24), PAPER, x, y + 0.102, z, { outline: false });
    for (const sx of [-1, 1]) rod(g, v(x + sx * r * 0.7, y - 0.08, z), v(x + sx * r, 0.04, z + 0.06), 0.009, METAL);
  }
  const cymbals = [-1.09, 0.05].map((x, i) => {
    const z = i ? -0.23 : 0.08;
    rod(g, v(x, 0.1, z), v(x, 1.02, z), 0.01, METAL);
    for (let j = 0; j < 3; j++) rod(g, v(x, 0.23, z), v(x + Math.cos(j * 2.1) * 0.16, 0.04, z + Math.sin(j * 2.1) * 0.16), 0.009, METAL);
    const a = group(g, x, 1.02, z);
    part(a, cyl(0.205, 0.205, 0.009, 28), '#d3b96d', 0, 0, 0);
    part(a, cyl(0.035, 0.06, 0.024, 16), '#d3b96d', 0, 0.014, 0);
    part(a, cyl(0.013, 0.013, 0.04, 10), INK, 0, 0.038, 0);
    return a;
  });
  part(g, cyl(0.18, 0.18, 0.07, 22), INK, dx, 0.445, -0.59);
  part(g, cyl(0.02, 0.02, 0.4, 10), METAL, dx, 0.2, -0.59);
  for (let i = 0; i < 3; i++) rod(g, v(dx, 0.23, -0.59), v(dx + Math.cos(i * 2.1) * 0.19, 0.04, -0.59 + Math.sin(i * 2.1) * 0.19), 0.014, METAL);
  part(g, rbox(0.09, 0.02, 0.22, 0.01), INK, dx, 0.06, -0.29, { rx: -0.2 });
  // Amplifier cabinet: woven grille, two cones, handle and actual controls.
  const amp = group(g, 1.1, 0, -0.6);
  part(amp, rbox(0.5, 0.63, 0.32, 0.03), INK, 0, 0.35, 0);
  part(amp, box(0.43, 0.46, 0.008), '#72766d', 0, 0.33, 0.164, { outline: false });
  for (let i = 0; i < 15; i++) part(amp, box(0.003, 0.44, 0.003), '#a5a598', -0.2 + i * 0.028, 0.33, 0.17, { outline: false });
  for (const y of [0.23, 0.44]) part(amp, ring(0.085, 0.009), '#434f52', 0, y, 0.177, { outline: false });
  for (let i = 0; i < 5; i++) part(amp, cyl(0.012, 0.012, 0.013, 10), i ? METAL : ORANGE, -0.15 + i * 0.07, 0.61, 0.17, { rx: Math.PI / 2 });
  const ampLed = glowing(amp, ball(0.009), '#b0ff8f', 0.2, 0.61, 0.17);
  part(amp, rbox(0.2, 0.025, 0.05, 0.012), INK, 0, 0.684, 0);
  // Bassist at the right of the drums, guitar angled across their body.
  const drummer = bodied(teen(g, dx, -0.59, 0, SAGE, true), { gender: 'male', seat: CHAIR_TOP });
  const bassist = bodied(teen(g, 0.7, 0.16, 0, '#b58cba', false, 1), { gender: 'female' });
  const guitar = group(g, 0.68, 0.96, 0.32);
  guitar.rotation.z = -0.6;
  part(guitar, rbox(0.25, 0.31, 0.055, 0.09), '#d49b57', 0, -0.14, 0);
  part(guitar, rbox(0.18, 0.17, 0.058, 0.06), '#d49b57', 0.01, 0.02, 0);
  part(guitar, box(0.045, 0.46, 0.025), EDGE, 0, 0.26, 0);
  part(guitar, rbox(0.065, 0.13, 0.03, 0.012), WOOD, 0, 0.54, 0);
  part(guitar, box(0.05, 0.015, 0.008), METAL, 0, -0.19, 0.032);
  for (let i = 0; i < 4; i++) part(guitar, box(0.002, 0.75, 0.002), METAL, -0.013 + i * 0.009, 0.18, 0.035, { outline: false });
  for (let i = 0; i < 9; i++) part(guitar, box(0.045, 0.003, 0.003), METAL, 0, 0.07 + i * 0.045, 0.017, { outline: false });
  for (let i = 0; i < 4; i++) part(guitar, ball(0.012), METAL, (i % 2 ? 1 : -1) * 0.043, 0.49 + i * 0.03, 0, { outline: false });
  // Music stand deliberately left of the coach, outside both drumsticks' reach.
  rod(g, v(-1.22, 0.05, 0.63), v(-1.22, 1.03, 0.63), 0.012, INK);
  part(g, rbox(0.37, 0.27, 0.018, 0.008), INK, -1.22, 1.12, 0.63, { rx: -0.35 });
  picture(g, paperTex('리듬 연습', ['하나 둘 셋 넷', '쿵 · 짝 · 쿵 · 짝', '느리게 한 번 더']), 0.31, 0.23, -1.22, 1.12, 0.645, '#ffffff', 0, -0.35);
  const cable = [v(0.75, 0.04, 0.3), v(0.95, 0.04, 0.63), v(1.31, 0.04, 0.4), v(1.3, 0.04, -0.4)];
  for (let i = 1; i < cable.length; i++) rod(g, cable[i - 1], cable[i], 0.006, '#202b33');
  const sticks = [0, 1].map(() => group(g));
  sticks.forEach(s => part(s, cyl(0.006, 0.006, 0.25, 8), WOOD, 0, 0, 0.08, { rx: Math.PI / 2, outline: false }));
  const status = display(g, 1.08, 0.12, [0.55, 1.38, -0.886], INK, '#f6d68e');
  const beatLamps = [0, 1, 2, 3].map(i => glowing(g, ball(0.025), '#ffd46d', 0.2 + i * 0.22, 1.22, -0.88));
  const s = use(g, 'ycBandBeat'); out.spots = { ycCoachBand: s, '*': s }; out.work = s.work;
  out.away = (_o, t) => {
    const on = active(s, t), b = Y.youthBeat('ycBandBeat', t, phase(s)), key = Y.keyOf(b);
    const play = on && (key === 'conduct' || key === 'retry');
    const hz = key === 'retry' ? 1.5 : 2;
    drummer.root.visible = bassist.root.visible = guitar.visible = on;
    drummer.pose(0.03, play ? 0.08 * wave(t, hz) : 0);
    bassist.pose(0.03, play ? 0.06 * wave(t, hz) : 0.06);
    sticks.forEach((stick, i) => {
      stick.visible = on;
      const y = play ? 0.93 + 0.1 * Math.max(0, wave(t, hz, i * 0.5)) : 0.81;
      const endpoint = drummer.handAt(i, [dx + (i ? 0.19 : -0.19), y, -0.27]);
      stick.position.copy(endpoint);
      stick.rotation.x = play ? -0.3 + 0.5 * Math.max(0, wave(t, hz, i * 0.5)) : 0.3;
    });
    cymbals.forEach((c, i) => { c.rotation.z = play ? 0.035 * Math.sin(t * 17 + i) : 0; });
    if (on) {
      bassist.handAt(1, [0.84, 1.2, 0.32]);
      bassist.handAt(0, [0.59, 0.87 + (play ? 0.03 * wave(t, hz * 2) : 0), 0.37]);
    }
    ampLed.visible = play;
    beatLamps.forEach((p, i) => { p.visible = on && key !== 'stop' && Math.floor(t * hz) % 4 === i; });
    status.set(!on ? '합주실 · 4 / 4' : key === 'count' ? '하나 · 둘 · 셋 · 넷' : key === 'stop' ? '잠깐! 서로 들어요' : key === 'rhythm' ? '쿵 · 짝, 천천히' : key === 'retry' ? '다시 함께 · 90 BPM' : key === 'clap' ? '맞았어요! 잘했어' : '함께 연주 · 120 BPM');
  };
}

function clubBoard(root: THREE.Group, out: Built) {
  // Leave the lobby colleague's default standing position clear of the shelf.
  // The work marker shares this frame, so hands and papers move with the stand.
  const g = group(root, -0.4, 0, 0);
  for (const x of [-0.65, 0.65]) {
    part(g, box(0.04, 1.63, 0.04), INK, x, 0.86, -0.2);
    part(g, rbox(0.08, 0.04, 0.55, 0.01), INK, x, 0.07, -0.1);
    for (const z of [-0.33, 0.13]) part(g, ball(0.035), '#25333b', x, 0.035, z, { outline: false });
  }
  part(g, rbox(1.55, 1.1, 0.07, 0.025), WOOD, 0, 1.12, -0.2);
  picture(g, painted('yc2-cork', 512, 300, c => {
    c.fillStyle = '#b99364'; c.fillRect(0, 0, 512, 300);
    for (let i = 0; i < 900; i++) { c.fillStyle = i % 2 ? '#c9a776' : '#a17a4f'; c.fillRect((i * 73) % 512, (i * 137) % 300, 2, 2); }
  }), 1.45, 1, 0, 1.12, -0.162);
  label(g, '해봄 동아리 · 함께 해요', 1.4, 0.16, 0, 1.53, -0.151, '#647e6c', PAPER);
  const titles = ['별빛 밴드', '책수다 모임', '탁구 친구'];
  titles.forEach((s, i) => {
    const x = -0.5 + i * 0.5;
    if (i !== 1) picture(g, paperTex(s, ['수요일 16시', '처음이어도 좋아요', '친구와 함께 신청', '활동실에서 만나요'], [BLUE, SAGE, ORANGE][i]), 0.36, 0.52, x, 1.1, -0.15);
    part(g, ball(0.018), '#ce7058', x, 1.35, -0.13, { outline: false });
  });
  part(g, rbox(0.65, 0.025, 0.2, 0.01), WOOD, 0, 0.78, -0.02);
  const supply = paper(g, '동아리 모집', ['자기 생각을 나눠요', '수요일 16시', '작은 모임 · 큰 즐거움'], [0, 0.8, 0.01], 0.25, 0.19, SAGE);
  part(g, cyl(0.04, 0.035, 0.035, 12), '#e5cab3', 0.27, 0.81, -0.02);
  for (let i = 0; i < 5; i++) part(g, ball(0.007), '#c75f4b', 0.25 + (i % 3) * 0.02, 0.83, -0.03 + Math.floor(i / 3) * 0.02, { outline: false });
  const poster = group(g);
  picture(poster, paperTex('책수다 모임', ['한 권을 함께 읽고', '내 생각을 이야기해요', '수요일 16시', '해봄 작은도서실'], SAGE), 0.27, 0.36, 0, 0, 0);
  const old = group(g);
  picture(old, paperTex('지난 달 모임', ['함께해서 즐거웠어요', '활동 완료'], '#a99d88'), 0.27, 0.36, 0, 0, 0);
  const pins = [-1, 1].map(sx => part(g, ball(0.014), '#cb6455', sx * 0.11, 1.29, -0.1, { outline: false }));
  const writing = pen(g, BLUE);
  const marks = [0, 1, 2, 3].map(i => part(g, box(0.043, 0.005, 0.003), BLUE, -0.1 + i * 0.052, 0.94, -0.112, { outline: false }));
  const teenReader = bodied(teen(g, -0.75, 0.57, Math.PI, ORANGE, false, 1), { gender: 'female' });
  const s = use(g, 'ycPost'); out.spots = { ycPostClubs: s, '*': s }; out.work = s.work;
  out.away = (_o, t) => {
    // This existing id is classified as a wall-hung board by the generic renderer.
    // Our ground-floor wheeled stand must remain when its adjacent wall is cut away.
    if (root.position.y < 0.1) root.visible = true;
    const on = active(s, t), b = Y.youthBeat('ycPost', t, phase(s)), key = Y.keyOf(b), u = Y.uOf(b);
    const h = Y.youthHands('ycPost', t, phase(s), height(s));
    const installed = !on || b.i > 2 || key === 'place' && u > 0.8;
    poster.visible = !on || b.i >= 1;
    poster.rotation.x = installed ? 0 : -Math.PI / 2 * (key === 'take' ? 1 : 1 - sm(u, 0, 0.8));
    put(poster, installed ? [0, 1.13, -0.12] : Y.lerp(h.l, h.r, 0.5));
    supply.visible = !on || key === 'remove';
    old.visible = on && key === 'remove';
    if (old.visible) put(old, h.r);
    pins.forEach((p, i) => { p.visible = installed && (key !== 'pin' || u > i * 0.5); });
    writing.visible = on && key === 'write';
    put(writing, h.r);
    marks.forEach((p, i) => { p.visible = on && (key === 'show' || key === 'write' && u > i * 0.25); });
    teenReader.root.visible = on && key === 'show';
    teenReader.pose(0, -0.1);
    if (teenReader.root.visible) teenReader.handAt(0, [-0.59, 1.18, 0.19]);
  };
}

function studyNook(g: THREE.Group, out: Built) {
  desk(g, 1.92, 0.7);
  chair(g, -0.43, 0.46, Math.PI, SAGE); chair(g, 0.48, 0.48, Math.PI, SAGE);
  part(g, rbox(1.92, 0.35, 0.04, 0.012), '#bdcec2', 0, 0.94, -0.35);
  label(g, '천천히 함께 · 나의 속도로', 1.65, 0.1, 0, 1.06, -0.326, '#bdcec2', INK);
  paper(g, '나의 학습 계획', ['오늘 · 수학 두 문제', '쉬는 시간 · 10분', '내일 · 한 번 더'], [-0.43, 0.79, 0.1], 0.29, 0.3, SAGE);
  const exercise = paper(g, '함께 풀어 봐요', ['2x + 3 = 11', '양변에서 3 빼기', '내 풀이 설명하기'], [0.13, 0.79, 0.1], 0.44, 0.29, BLUE);
  for (let i = 0; i < 7; i++) part(exercise, cyl(0.013, 0.013, 0.002, 10), i < 3 ? ORANGE : BLUE, -0.14 + i * 0.044, 0.006, -0.015, { outline: false });
  const answer = flat(exercise, painted('yc2-answer', 128, 64, c => {
    c.clearRect(0, 0, 128, 64); text(c, '2x = 8 → x = 4', 64, 32, 22, '#31579b', 'center');
  }), 0.21, 0.09, 0, 0.008, 0.09);
  const check = flat(exercise, painted('yc2-good', 128, 64, c => {
    c.clearRect(0, 0, 128, 64); text(c, '잘했어요!', 64, 32, 27, '#ce7956', 'center');
  }), 0.18, 0.07, 0.12, 0.009, -0.07);
  const coachPen = pen(g, BLUE), pupilPen = pen(g, ORANGE);
  const goalChecks = [0, 1, 2].map(i => flat(g, painted('yc2-checkmark', 32, 32, c => {
    c.clearRect(0, 0, 32, 32); text(c, '✓', 16, 16, 27, '#3d976c', 'center');
  }), 0.026, 0.026, -0.35, 0.8, 0.02 + i * 0.05));
  // Reading lamp, pencil tin, timer, books with individual coloured spines.
  part(g, cyl(0.07, 0.08, 0.015, 14), INK, -0.8, 0.785, -0.2);
  rod(g, v(-0.8, 0.8, -0.2), v(-0.77, 1.14, -0.2), 0.012, INK);
  rod(g, v(-0.77, 1.14, -0.2), v(-0.57, 1.22, -0.12), 0.012, INK);
  part(g, cyl(0.055, 0.085, 0.1, 18), PAPER, -0.57, 1.2, -0.12);
  const lamp = glowing(g, cyl(0.073, 0.073, 0.007, 18), '#fff3b5', -0.57, 1.145, -0.12);
  for (let i = 0; i < 5; i++) {
    const color = [BLUE, ORANGE, LILAC, SAGE, '#a67b68'][i];
    part(g, box(0.045, 0.2 + (i % 2) * 0.025, 0.15), color, 0.54 + i * 0.05, 0.89, -0.2);
    part(g, box(0.028, 0.045, 0.002), PAPER, 0.54 + i * 0.05, 0.88, -0.123, { outline: false });
  }
  bottle(g, 0.83, 0.78, 0.1, SAGE);
  part(g, rbox(0.16, 0.11, 0.06, 0.01), PAPER, 0.03, 0.85, -0.23);
  const timer = display(g, 0.14, 0.075, [0.03, 0.85, -0.197], '#e5eadc', INK);
  const p = bodied(teen(g, 0.48, 0.48, Math.PI, ORANGE, true, 1), { gender: 'male', seat: CHAIR_TOP });
  const s = use(g, 'ycStudy'); out.spots = { ycStudySupport: s, '*': s }; out.work = s.work;
  out.away = (_o, t) => {
    const on = active(s, t), b = Y.youthBeat('ycStudy', t, phase(s)), key = Y.keyOf(b), u = Y.uOf(b);
    const h = Y.youthHands('ycStudy', t, phase(s), height(s));
    p.root.visible = lamp.visible = on;
    const solving = key === 'solve';
    p.pose(solving ? 0.2 : 0.07, solving ? 0.32 : 0.1);
    p.head.rotation.y = ['ask', 'point'].includes(key) ? 0.23 : 0;
    pupilPen.visible = on;
    pupilPen.position.copy(p.handAt(1, solving ? [0.18 + 0.02 * wave(t, 3), 0.82, 0.17] : [0.36, 0.8, 0.22]));
    p.handAt(0, [0.58, 0.8, 0.14]);
    put(coachPen, on && ['point', 'goal', 'check'].includes(key) ? h.r : [-0.67, 0.8, 0.18]);
    coachPen.rotation.z = on && ['point', 'goal', 'check'].includes(key) ? 0 : Math.PI / 2;
    answer.visible = on && (b.i > 3 || solving && u > 0.55);
    check.visible = on && b.i >= 4;
    goalChecks.forEach((p, i) => { p.visible = on && key === 'goal' && u > i / 3; });
    timer.set(on ? `24:${String(59 - Math.floor(t % 60)).padStart(2, '0')}` : '25:00');
  };
}

function signupDesk(g: THREE.Group, out: Built) {
  desk(g, 1.9, 0.74);
  chair(g, -0.27, 0.48, Math.PI, ORANGE);
  part(g, box(1.8, 0.55, 0.035), ORANGE, 0, 0.43, -0.33);
  label(g, '해봄 · 프로그램 접수', 1.55, 0.13, 0, 0.62, 0.378, ORANGE, INK);
  const form = paper(g, '참가 신청서', ['이름 · 연락처', '희망 프로그램', '요일 · 시간', '참가자 서명'], Y.REG.form, 0.25, 0.3, ORANGE);
  const signature = flat(form, painted('yc2-sign', 128, 64, c => {
    c.clearRect(0, 0, 128, 64);
    c.strokeStyle = '#315898'; c.lineWidth = 3; c.beginPath(); c.moveTo(12, 44);
    for (let i = 0; i < 20; i++) c.lineTo(12 + i * 5, 30 + 12 * Math.sin(i * 1.6));
    c.stroke();
  }), 0.13, 0.05, 0, 0.006, 0.1);
  const stamped = flat(form, painted('yc2-stamp', 96, 96, c => {
    c.clearRect(0, 0, 96, 96); c.strokeStyle = '#c54f43'; c.lineWidth = 4;
    c.beginPath(); c.arc(48, 48, 40, 0, Math.PI * 2); c.stroke();
    text(c, '접수', 48, 48, 29, '#c54f43', 'center');
  }), 0.07, 0.07, 0.075, 0.007, 0.08);
  const stamp = group(g);
  part(stamp, rbox(0.06, 0.035, 0.045, 0.008), '#c45447', 0, -0.04, 0);
  part(stamp, cyl(0.017, 0.023, 0.055, 12), WOOD, 0, 0, 0);
  part(stamp, ball(0.025), EDGE, 0, 0.035, 0);
  part(g, rbox(0.09, 0.02, 0.06, 0.01), '#a84c43', 0.07, 0.795, 0.22);
  const brochures = ['체육 활동', '별빛 밴드', '책수다 모임'].map((title, i) => {
    const x = 0.43 + i * 0.16;
    part(g, rbox(0.14, 0.04, 0.23, 0.008), [BLUE, SAGE, ORANGE][i], x, 0.81, 0.11);
    flat(g, paperTex(title, ['수요일 16시', '함께 배워요'], [BLUE, SAGE, ORANGE][i]), 0.13, 0.21, x, 0.833, 0.11);
    return x;
  });
  const leaflet = paper(g, '프로그램 안내', ['체육 · 밴드 · 자습', '원하는 활동을 골라요', '매주 수요일 16시'], [-0.48, 0.79, -0.1], 0.18, 0.23, SAGE);
  void brochures;
  // A small screen, keyboard and receipt slot, not just a floating plane.
  part(g, cyl(0.07, 0.08, 0.016, 14), INK, 0.19, 0.79, -0.24);
  rod(g, v(0.19, 0.79, -0.24), v(0.19, 0.96, -0.24), 0.012, INK);
  part(g, rbox(0.34, 0.23, 0.025, 0.012), INK, 0.19, 1.02, -0.23);
  const screen = display(g, 0.31, 0.18, [0.19, 1.02, -0.214], '#e3efe7', INK); out.screen = screen.mesh;
  part(g, rbox(0.28, 0.02, 0.11, 0.008), INK, ...Y.REG.keys);
  for (let i = 0; i < 3; i++) part(g, box(0.24, 0.005, 0.018), METAL, 0.12, 0.834, -0.005 + i * 0.029, { outline: false });
  part(g, rbox(0.14, 0.11, 0.16, 0.012), '#d8dfd7', -0.75, 0.83, 0.09);
  part(g, box(0.1, 0.012, 0.006), INK, -0.75, 0.85, 0.173, { outline: false });
  const receipt = paper(g, '참가 확인', ['수요일 16시', '활동실 1', '함께 만나요'], [-0.75, 0.84, 0.21], 0.085, 0.14, BLUE);
  chair(g, -0.27, -0.57, 0, SAGE);
  // The counter's panel is in front of this chair: the feet come back to its near side.
  const applicant = bodied(teen(g, -0.27, -0.57, 0, SAGE, true, 1), { gender: 'female', seat: CHAIR_TOP, legs: () => ({ l: v(-0.18, 0.08, -0.42), r: v(-0.36, 0.08, -0.42) }) });
  bag(g, '#ca9b73').position.set(-0.72, 0, -0.65);
  const applicantPen = pen(g, BLUE);
  const s = use(g, 'ycRegister'); out.spots = { ycRegisterProgram: s, '*': s }; out.work = s.work;
  out.away = (_o, t) => {
    const on = active(s, t), b = Y.youthBeat('ycRegister', t, phase(s)), key = Y.keyOf(b), u = Y.uOf(b);
    const h = Y.youthHands('ycRegister', t, phase(s), height(s));
    const across = key === 'sign' ? 1 : key === 'form' ? sm(u, 0.1, 0.8) : key === 'give' ? sm(u, 0.1, 0.7) : 0;
    put(form, Y.lerp(Y.REG.form, Y.REG.across, on ? across : 0));
    signature.visible = on && b.i >= 3 && (key !== 'sign' || u > 0.5);
    stamped.visible = on && (key === 'give' || key === 'stamp' && u > 0.6);
    put(stamp, on && key === 'stamp' ? h.r : Y.REG.stamp);
    leaflet.position.z = on && key === 'show' ? -0.16 : -0.1;
    applicant.root.visible = applicantPen.visible = on;
    applicant.pose(key === 'sign' ? 0.18 : 0.06, key === 'sign' ? 0.32 : 0.08);
    applicantPen.position.copy(applicant.handAt(1, key === 'sign' ? [-0.21 + 0.02 * wave(t, 3), 0.83, -0.04] : [-0.1, 0.7, -0.35]));
    if (key === 'give') applicant.handAt(0, [-0.3, 0.83, -0.24]);
    receipt.visible = on && ['type', 'stamp', 'give'].includes(key);
    receipt.scale.z = key === 'type' ? Math.max(0.05, u) : 1;
    screen.set(!on ? '프로그램 접수' : key === 'type' ? '참가자 등록 중' : key === 'stamp' || key === 'give' ? '접수 완료 · 012' : '체육 · 밴드 · 자습');
  };
}

/** A small intercity coach, with an actual doorway and luggage opening. The
 * off-lot flag owns departure/return; the lab's posed marker previews the same
 * loading sequence without requiring a real career alarm. */
function youthBus(g: THREE.Group, out: Built) {
  const bus = group(g, 0, 0, -0.25);
  const glass = (pane: THREE.Mesh) => {
    const material = (pane.material as THREE.Material).clone();
    material.transparent = true; material.opacity = 0.32; material.depthWrite = false;
    pane.material = material;
    pane.castShadow = false;
  };
  const L = 5.8, W = 1.8, roof = 2.6, doorX = 2.05, side = W / 2;
  // Floor/chassis, rear and far wall; the near side is built around the openings.
  part(bus, rbox(L, 0.24, W, 0.08), INK, 0, 0.4, 0);
  part(bus, rbox(L, 0.16, W, 0.07), PAPER, 0, roof, 0);
  part(bus, box(L, 0.93, 0.09), PAPER, 0, 0.94, -side + 0.04);
  part(bus, box(0.1, 1.95, W), PAPER, -L / 2 + 0.05, 1.48, 0);
  part(bus, box(0.1, 0.88, W), PAPER, L / 2 - 0.05, 0.94, 0);
  for (const [x, w] of [[-2.02, 1.76], [0.45, 2.0], [2.65, 0.5]]) {
    part(bus, box(w, 0.94, 0.075), PAPER, x, 0.94, side - 0.025);
    part(bus, box(w, 0.17, 0.08), ORANGE, x, 1.13, side - 0.022, { outline: false });
  }
  part(bus, box(0.93, 0.17, 0.075), PAPER, -0.67, 1.33, side - 0.025);
  part(bus, box(L, 0.14, 0.08), ORANGE, 0, 1.43, -side + 0.02);
  part(bus, box(L, 0.13, 0.08), ORANGE, 0, 2.47, side - 0.02);
  part(bus, rbox(1.35, 0.16, 0.91, 0.08), '#dde2e0', -0.65, roof + 0.15, 0);
  for (let i = 0; i < 7; i++) part(bus, box(0.05, 0.02, 0.66), METAL, -1.1 + i * 0.15, roof + 0.237, 0, { outline: false });
  // Tinted windows separated by cream pillars, with a pale reflected sky stripe.
  for (const sz of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const x = -2.35 + i * 0.82;
      const pane = part(bus, rbox(0.76, 0.94, 0.025, 0.025), '#3b5965', x, 1.96, sz * side, { outline: false });
      if (sz > 0) glass(pane);
      part(bus, box(0.68, 0.045, 0.009), '#88a8af', x, 2.31, sz * (side + 0.016), { outline: false });
      part(bus, box(0.055, 1.04, 0.055), PAPER, x + 0.41, 1.97, sz * side);
    }
  }
  glass(part(bus, box(0.035, 0.95, W - 0.1), '#344f5b', L / 2 - 0.014, 1.96, 0, { outline: false }));
  for (const sz of [-1, 1]) {
    rod(bus, v(2.89, 1.62, sz * 0.46), v(2.91, 1.98, sz * 0.25), 0.012, INK);
    rod(bus, v(2.7, 2.22, sz * 0.91), v(3.07, 2.06, sz * 1.04), 0.02, INK);
    part(bus, rbox(0.065, 0.25, 0.16, 0.025), INK, 3.08, 1.96, sz * 1.04);
    part(bus, box(0.01, 0.19, 0.11), METAL, 3.12, 1.96, sz * 1.04, { outline: false });
    part(bus, rbox(0.05, 0.14, 0.25, 0.02), '#f7e4a0', 2.91, 0.89, sz * 0.63);
    part(bus, rbox(0.05, 0.23, 0.16, 0.02), '#a74c45', -2.91, 0.95, sz * 0.66);
  }
  for (let i = 0; i < 4; i++) part(bus, box(0.014, 0.025, 1.05), INK, 2.91, 0.59 + i * 0.05, 0, { outline: false });
  label(bus, '해봄 청소년 캠프', 1.22, 0.22, 2.926, 2.32, 0, INK, '#ffc86b', Math.PI / 2);
  label(bus, '함께 배우고 함께 자라요', 1.68, 0.19, -0.07, 1.26, side + 0.022, PAPER, INK);
  label(bus, '청소년수련관', 1.42, 0.25, -1.92, 0.86, side + 0.022, PAPER, '#bf7633');
  label(bus, '해봄 72 가 3816', 0.56, 0.11, 2.93, 0.5, 0, '#f4d75e', INK, Math.PI / 2);
  const wheels = [-1.96, 1.72].flatMap(x => [-1, 1].map(sz => {
    const a = group(bus, x, 0.37, sz * 0.83);
    part(a, cyl(0.37, 0.37, 0.24, 24), '#272e32', 0, 0, 0, { rx: Math.PI / 2 });
    part(a, cyl(0.21, 0.21, 0.255, 16), METAL, 0, 0, 0, { rx: Math.PI / 2 });
    for (let n = 0; n < 6; n++) part(a, ball(0.023), INK, 0.13 * Math.cos(n * Math.PI / 3), 0.13 * Math.sin(n * Math.PI / 3), sz * 0.133, { outline: false });
    part(bus, box(0.91, 0.05, 0.055), INK, x, 0.79, sz * 0.92);
    return a;
  }));
  // Door panels swing outward from the opening; contrasting stair nosings.
  const door = [-1, 1].map(sx => {
    const a = group(bus, doorX + sx * 0.37, 0.52, side + 0.015);
    part(a, box(0.37, 1.83, 0.045), INK, -sx * 0.185, 0.915, 0);
    part(a, rbox(0.3, 1.3, 0.055, 0.02), '#496976', -sx * 0.185, 1.08, 0);
    part(a, box(0.025, 0.4, 0.03), METAL, -sx * 0.3, 0.85, 0.04);
    return a;
  });
  for (let i = 0; i < 3; i++) {
    part(bus, box(0.69, 0.12, 0.22), '#6c7a81', doorX, 0.15 + i * 0.15, side - i * 0.18);
    part(bus, box(0.68, 0.016, 0.045), '#efc85c', doorX, 0.218 + i * 0.15, side + 0.085 - i * 0.18, { outline: false });
  }
  const bay = group(bus, -0.67, 1.23, side);
  part(bay, box(0.93, 0.66, 0.05), PAPER, 0, -0.33, 0);
  part(bay, box(0.22, 0.035, 0.028), METAL, 0, -0.52, 0.04);
  label(bay, '캠프 가방', 0.4, 0.1, 0, -0.26, 0.028, PAPER, INK);
  part(bus, box(0.93, 0.03, 0.58), INK, -0.67, 0.56, 0.61);
  const loadedBags = [SAGE, LILAC, ORANGE].map((c, i) => {
    const b = bag(bus, c); b.scale.setScalar(0.86); b.position.set(-0.99 + i * 0.31, 0.57, 0.67); return b;
  });
  const carried = bag(g, ORANGE);
  const coach = teen(g, -0.67, 1.3, Math.PI, ORANGE);
  const clipboard = paper(g, '캠프 인원 점검', ['가방 확인', '세 명 탑승', '안전띠 착용'], [-0.75, 0.94, 1.1], 0.17, 0.22);
  const queue = [SAGE, BLUE, LILAC].map((c, i) => bodied(teen(g, 2.05 + i * 0.49, 1.26, Math.PI, c, false, i), { gender: i % 2 ? 'male' : 'female' }));
  const packs = queue.map((p, i) => {
    const b = bag(p.root, [ORANGE, LILAC, BLUE][i]); b.scale.set(0.65, 1.15, 0.5); b.position.set(0, 0.83, -0.14); return b;
  });
  const passengers = [SAGE, BLUE, LILAC].map((c, i) => {
    const x = -1.8 + i;
    chair(bus, x, 0.35, 0, c).position.y = 0.58;
    const p = bodied(teen(bus, x, 0.35, 0, c, true, i), { gender: i % 2 ? 'male' : 'female', seat: CHAIR_TOP });
    p.root.position.y = 0.58;
    return p;
  });
  const status = display(g, 1.26, 0.14, [0, 2.92, 0.67], INK, '#ffcf76');
  // A seated driver and steering wheel inside the glazed cab.
  chair(bus, 2.42, -0.35, Math.PI / 2, INK).position.y = 0.58;
  const driver = bodied(teen(bus, 2.42, -0.35, Math.PI / 2, BLUE, true), { stage: 'adult', gender: 'male', seat: CHAIR_TOP, legs: () => ({ l: v(2.66, 0.66, -0.45), r: v(2.66, 0.66, -0.25) }) });
  driver.root.position.y = 0.58;
  part(bus, rbox(0.2, 0.16, 0.65, 0.02), INK, 2.76, 1.3, -0.35);
  rod(bus, v(2.81, 1.32, -0.35), v(2.75, 1.47, -0.35), 0.024, INK);
  part(bus, new THREE.TorusGeometry(0.14, 0.013, 8, 24), INK, 2.75, 1.47, -0.35, { ry: Math.PI / 2 });
  rod(bus, v(2.75, 1.34, -0.35), v(2.75, 1.6, -0.35), 0.008, METAL);
  rod(bus, v(2.75, 1.47, -0.48), v(2.75, 1.47, -0.22), 0.008, METAL);
  // Physical housing for the roof-mounted departure display.
  part(bus, rbox(1.32, 0.2, 0.05, 0.02), INK, 0, 2.92, 0.89);
  for (const x of [-0.49, 0.49]) rod(bus, v(x, 2.68, 0.89), v(x, 2.84, 0.89), 0.018, METAL);
  const headlight = group(bus);
  for (const z of [-0.63, 0.63]) glowing(headlight, box(0.055, 0.1, 0.2), '#fff3bc', 2.92, 0.89, z);
  out.inUse = headlight;
  const s = use(g, 'ycCamp'); out.spots = { '*': s }; out.work = s.work;
  let wasAway = false, since = -1, returnAt = -1, arrivedAt = -1, previewAt = -1, returned = false;
  out.away = (isAway, t) => {
    if (isAway && !wasAway) { since = t; returnAt = -1; arrivedAt = -1; returned = false; }
    if (!isAway && wasAway) { returnAt = t; since = -1; returned = true; }
    wasAway = isAway;
    const preview = !isAway && returnAt < 0 && active(s, t);
    if (preview && previewAt < 0) previewAt = t;
    if (!preview) previewAt = -1;
    const elapsed = since >= 0 ? t - since : previewAt >= 0 ? (t - previewAt) % 24 : -1;
    const d = Y.departureAt(elapsed), returning = returnAt >= 0;
    const back = returning ? sm(t - returnAt, 0, 5) : 0;
    const loading = elapsed >= 0 && elapsed < 10.6;
    bus.position.x = returning ? 14 * (1 - back) ** 2 : elapsed >= 0 ? d.x : 0;
    bus.visible = returning || elapsed < 0 || !d.gone;
    if (returning && back >= 1) { arrivedAt = returnAt + 5; returnAt = -1; }
    const arrival = arrivedAt >= 0 ? t - arrivedAt : -1;
    const unloading = arrival >= 0 && arrival < 6.8;
    wheels.forEach(w => { w.rotation.z = -bus.position.x / 0.37; });
    headlight.visible = isAway && !loading || returning;
    const doorOpen = loading ? d.door : unloading ? sm(arrival, 0, 0.6) * (1 - sm(arrival, 5.8, 6.6)) : 0;
    door.forEach((a, i) => { a.rotation.y = (i ? -1 : 1) * 1.3 * doorOpen; });
    bay.rotation.x = loading ? -2.95 * d.bay : 0;
    loadedBags.forEach((b, i) => { b.visible = i < 2 || d.loaded; });
    const coachBoard = sm(elapsed, 6.7, 9.3);
    coach.root.visible = loading && !preview && coachBoard < 0.99;
    coach.root.position.set(Y.mix(Y.mix(-0.67, -0.37, d.bag), 2.05, sm(coachBoard, 0, 0.65)), 0.44 * sm(coachBoard, 0.65, 1), coachBoard > 0 ? Y.mix(1.15, 0.4, sm(coachBoard, 0.65, 1)) : Y.mix(1.3, 1.05, d.bag));
    coach.root.rotation.y = coachBoard > 0 && coachBoard < 0.65 ? Math.PI / 2 : Math.PI;
    coach.pose(elapsed < 2.6 ? 0.45 : 0.02, elapsed < 2.6 ? 0.35 : 0.02, coachBoard > 0 ? Math.sin(t * 9) : 0, 0.95 * (1 - d.bag));
    const hand: V = [Y.mix(-0.67, -0.37, d.bag), Y.mix(0.4, 0.82, d.bag), Y.mix(1.16, 0.5, d.bag)];
    if (elapsed < 2.6) { coach.handAt(0, Y.add(hand, -0.1)); coach.handAt(1, Y.add(hand, 0.1)); }
    carried.visible = loading && !d.loaded;
    const hands = Y.youthHands('ycCamp', t, phase(s));
    if (preview) put(carried, Y.add(Y.lerp(hands.l, hands.r, 0.5), 0, -0.25));
    else put(carried, Y.add(hand, 0, -0.25));
    clipboard.visible = loading && elapsed > 2.6 && elapsed < 6.7;
    if (clipboard.visible) {
      const p = preview ? vec(hands.l) : coach.handAt(0, [-0.48, 1.04, 0.84]);
      clipboard.position.copy(p); clipboard.rotation.x = -0.5;
      if (!preview) coach.handAt(1, [-0.2, 1.14 + 0.1 * Math.sin(t * 3), 0.81]);
    }
    driver.pose(0.08, 0.04);
    driver.handAt(1, [2.75, 1.48, -0.48]); driver.handAt(0, [2.75, 1.48, -0.22]);
    let offCount = 0;
    queue.forEach((p, i) => {
      const u = sm(elapsed, 2.8 + i * 0.92, 4.5 + i * 0.92);
      const leave = sm(arrival, 0.7 + i * 0.65, 3 + i * 0.65);
      if (leave >= 0.99) offCount++;
      p.root.visible = unloading ? leave > 0.25 && leave < 0.99 : loading && u < 0.99;
      p.root.rotation.y = unloading ? leave < 0.5 ? 0 : Math.PI / 2 : Math.PI;
      if (unloading) p.root.position.set(2.05 + (0.9 + i * 0.15) * sm(leave, 0.4, 1), 0.44 * (1 - sm(leave, 0, 0.45)), Y.mix(0.4, 1.8, sm(leave, 0, 0.8)));
      else p.root.position.set(Y.mix(2.05 + i * 0.49, 2.05, sm(u, 0, 0.35)), 0.44 * sm(u, 0.45, 1), Y.mix(1.26, 0.4, sm(u, 0.25, 1)));
      p.pose(0.05, 0.03, unloading || u > 0 && u < 1 ? Math.sin(t * 9 + i) : 0);
      const passenger = passengers[i], x = -1.8 + i;
      passenger.root.visible = unloading ? leave <= 0.25 : elapsed >= 0 && u >= 0.99 || returning;
      passenger.pose(0.04, 0.03 + (isAway ? 0.02 * Math.sin(t * 2 + i) : 0));
      passenger.handAt(0, [x - 0.12, 1.25, 0.62]);
      passenger.handAt(1, loading ? [x + 0.17, 1.78, 0.63] : [x + 0.12, 1.25, 0.62]);
      packs[i].visible = p.root.visible;
    });
    status.mesh.visible = bus.visible;
    status.mesh.position.x = bus.position.x;
    status.set(unloading ? `하차 확인 · ${offCount} / 3` : returning ? '캠프 복귀 · 수고했어요' : elapsed < 0 ? returned ? '모두 안전하게 도착' : '캠프 버스 · 출발 대기' : elapsed < 2.6 ? '캠프 가방을 실어요' : elapsed < 6.5 ? `탑승 확인 · ${Math.min(3, Math.floor(d.boarding * 3))} / 3` : '안전띠 확인 · 출발!');
  };
}

export const BUILDERS: Record<string, Builder> = {
  activityMat(g, _w, _d, _c, _def, _ctx, out) { activityMat(g, out); },
  pingpongTable(g, _w, _d, _c, _def, _ctx, out) { pingpongTable(g, out); },
  programDesk(g, _w, _d, _c, _def, _ctx, out) { programDesk(g, out); },
  youthCounselDesk(g, _w, _d, _c, _def, _ctx, out) { youthCounselDesk(g, out); },
  ycBandCorner(g, _w, _d, _c, _def, _ctx, out) { bandCorner(g, out); },
  ycClubBoard(g, _w, _d, _c, _def, _ctx, out) { clubBoard(g, out); },
  ycStudyNook(g, _w, _d, _c, _def, _ctx, out) { studyNook(g, out); },
  ycSignupDesk(g, _w, _d, _c, _def, _ctx, out) { signupDesk(g, out); },
  youthBus(g, _w, _d, _c, _def, _ctx, out) { youthBus(g, out); },
};
