import * as THREE from 'three';
import { DENTAL_GRIP, type Motion } from '../activity';
import { deskChair, marker, rod, shade, spot, tint, type Builder, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { BLACK, CHROME, ENAMEL, STEEL, TEAL, glass, glowing, label, litScreen, painted, picture, ring, seeded, starBase, text, type Paint } from './doctor';

/**
 * The dental clinic drawn as itself (2026-10-27 workplace pipeline, at the user's request): the unit
 * chair — reclined, the overhead light on its post, the bracket table of handpieces over the
 * patient's right, the cuspidor at their left, the screen of the X-ray; while it's used a patient
 * lies in it with the bib on and the mouth open, the mirror and the probe in it, and the dentist sits
 * on the stool at the head — the autoclave on its counter (the tattoo studio's too), the dental lab's
 * bench, and what the 치과 was missing (workFurniture/dentist.ts): the front desk, a panoramic X-ray,
 * an intraoral scanner, a giant tooth to teach brushing on and the smile board. The desk, the light
 * box and the medicine cabinet are the hospital's (workplaces/doctor.ts).
 */

const UPHOLSTERY = '#26a69a';
const SKIN = '#f1c9a5';
const HAIR = '#3b2a20';
const STONE = '#f3e3a6';
const DIE = '#8fbbe8';
const TOOTH = '#fbf8ef';
const GUM = '#ef9a9a';

/** A group in `parent` standing where `like` stands (for the parts of something shown only in use). */
function alongside(parent: THREE.Object3D, like: THREE.Object3D): THREE.Group {
  const m = new THREE.Group();
  m.position.copy(like.position);
  m.rotation.copy(like.rotation);
  parent.add(m);
  return m;
}
/** A spot with what the hands do there. */
function at(s: Spot, work: THREE.Object3D, motion?: Motion): Spot {
  s.work = work;
  s.motion = motion;
  return s;
}
/** A point in a part's frame, in the frame of the piece (`g`, built at the origin). */
function inPiece(g: THREE.Object3D, from: THREE.Object3D, x: number, y: number, z: number): THREE.Vector3 {
  g.updateMatrixWorld(true);
  return g.worldToLocal(from.localToWorld(new THREE.Vector3(x, y, z)));
}
/** A round stool on a five-star base, its seat's top at `h`. */
function stool(g: THREE.Object3D, x: number, z: number, h: number, color: string, back = false): THREE.Group {
  const s = new THREE.Group();
  s.position.set(x, 0, z);
  g.add(s);
  starBase(s, 0, 0, 0.24, '#78909c');
  part(s, cyl(0.022, 0.022, h - 0.2, 10), CHROME, 0, 0.1 + (h - 0.2) / 2, 0, { outline: false });
  part(s, cyl(0.2, 0.19, 0.08, 20), color, 0, h - 0.04, 0);
  part(s, cyl(0.17, 0.17, 0.02, 20), shade(color, 0.85), 0, h - 0.085, 0, { outline: false });
  if (back) {
    rod(s, new THREE.Vector3(0, h - 0.06, 0.14), new THREE.Vector3(0, h + 0.18, 0.17), 0.014, CHROME);
    part(s, rbox(0.3, 0.1, 0.04, 0.02), color, 0, h + 0.22, 0.17);
  }
  return s;
}
/** A plaster model of a dental arch, the front teeth to +z: the stone base, the gum and the teeth round it. */
function arch(g: THREE.Object3D, x: number, y: number, z: number, stone: string, ry = 0, k = 1, upper = false): THREE.Group {
  const a = new THREE.Group();
  a.position.set(x, y, z);
  a.rotation.y = ry;
  a.scale.setScalar(k);
  g.add(a);
  part(a, rbox(0.12, 0.03, 0.1, 0.02), stone, 0, 0.015, -0.005);
  part(a, ring(0.04, 0.012, Math.PI), upper ? tint(GUM, 0.3) : stone, 0, 0.036, -0.02, { rx: Math.PI / 2, outline: false });
  for (let i = 0; i < 10; i++) {
    const t = (i + 0.5) / 10;
    const ang = Math.PI * t;
    const r = 0.04;
    part(a, ball(i === 0 || i === 9 || i === 1 || i === 8 ? 0.011 : 0.008), TOOTH, Math.cos(ang) * r, 0.048, -0.02 + Math.sin(ang) * r, { outline: false });
  }
  return a;
}

// ---------------------------------------------------------------------------------------------
// What's painted on the screens and the signs.

/** A periapical film of three lower molars, one with a cavity, on the chair's screen. */
const paintPeriapical: Paint = (c) => {
  c.fillStyle = '#0f1418';
  c.fillRect(0, 0, 384, 256);
  c.fillStyle = '#05080a';
  c.fillRect(70, 22, 244, 196);
  const tooth = (x: number, decay: boolean) => {
    c.fillStyle = 'rgba(225,228,224,0.85)';
    c.beginPath();
    c.moveTo(x - 32, 70);
    c.quadraticCurveTo(x, 40, x + 32, 70);
    c.lineTo(x + 28, 120);
    c.lineTo(x + 14, 200);
    c.lineTo(x + 6, 125);
    c.lineTo(x - 6, 125);
    c.lineTo(x - 14, 200);
    c.lineTo(x - 28, 120);
    c.closePath();
    c.fill();
    // The pulp, dark down the middle.
    c.fillStyle = 'rgba(40,46,50,0.75)';
    c.fillRect(x - 9, 82, 18, 30);
    c.fillRect(x - 12, 112, 4, 70);
    c.fillRect(x + 8, 112, 4, 70);
    if (decay) {
      c.fillStyle = 'rgba(10,12,14,0.9)';
      c.beginPath();
      c.ellipse(x + 16, 68, 9, 7, 0.4, 0, Math.PI * 2);
      c.fill();
    }
  };
  tooth(118, false);
  tooth(192, true);
  tooth(266, false);
  // The bone round the roots.
  c.fillStyle = 'rgba(150,155,150,0.25)';
  c.fillRect(74, 130, 236, 84);
  c.strokeStyle = '#ffd54f';
  c.lineWidth = 3;
  c.beginPath();
  c.arc(208, 68, 18, 0, Math.PI * 2);
  c.stroke();
  text(c, '#36 우식 의심', 220, 238, 15, '#ffd54f', 'center');
  text(c, '박*연 · 34세', 8, 14, 14, '#cfd8dc', 'left', false);
  text(c, 'R', 360, 14, 16, '#ffffff', 'left');
};

/** The autoclave's display: the temperature, the pressure and the time left. */
const paintAutoclave: Paint = (c) => {
  c.fillStyle = '#062a2a';
  c.fillRect(0, 0, 256, 96);
  text(c, '121℃', 14, 34, 34, '#64ffda', 'left');
  text(c, '2.1 bar', 150, 24, 18, '#a7ffeb', 'left', false);
  text(c, '멸균 중  12:30', 150, 52, 18, '#a7ffeb', 'left');
  c.fillStyle = '#1de9b6';
  c.fillRect(14, 72, 150, 10);
  c.strokeStyle = '#1de9b6';
  c.strokeRect(14, 72, 228, 10);
};

/** The sterilising steps on the wall over the counter. */
const paintSteps: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 320, 400);
  c.fillStyle = TEAL;
  c.fillRect(0, 0, 320, 64);
  text(c, '기구 멸균 절차', 160, 34, 30, '#ffffff', 'center');
  const steps = [['1', '세척', '초음파 세척 10분', '#4fc3f7'], ['2', '건조 · 포장', '멸균 파우치에 밀봉', '#81c784'], ['3', '멸균', '121℃ · 15분 이상', '#ffb74d'], ['4', '보관', '날짜 기록 후 보관', '#ba68c8']];
  steps.forEach(([n, title, sub, k], i) => {
    const y = 84 + i * 78;
    c.fillStyle = k;
    c.beginPath();
    c.arc(42, y + 28, 24, 0, Math.PI * 2);
    c.fill();
    text(c, n, 42, y + 30, 28, '#ffffff', 'center');
    text(c, title, 80, y + 18, 24, '#263238', 'left');
    text(c, sub, 80, y + 46, 18, '#607d8b', 'left', false);
  });
};

/** The front desk's screen: today's book of appointments, a column a chair. */
const paintBook: Paint = (c) => {
  c.fillStyle = '#f5f7f8';
  c.fillRect(0, 0, 384, 256);
  c.fillStyle = '#00838f';
  c.fillRect(0, 0, 384, 30);
  text(c, '예약 현황 · 오늘', 10, 16, 16, '#ffffff', 'left');
  text(c, '대기 3명', 374, 16, 14, '#e0f7fa', 'right');
  const cols = ['1번 체어', '2번 체어', '수술실'];
  cols.forEach((s, i) => text(c, s, 70 + i * 104, 44, 13, '#455a64', 'center'));
  const rnd = seeded(11);
  for (let r = 0; r < 8; r++) {
    const y = 56 + r * 24;
    text(c, `${9 + r}:00`, 6, y + 12, 12, '#78909c', 'left', false);
    c.fillStyle = '#e0e6e9';
    c.fillRect(40, y + 23, 340, 1);
    for (let i = 0; i < 3; i++) {
      if (rnd() < 0.35) continue;
      c.fillStyle = ['#80deea', '#ffcc80', '#a5d6a7', '#ce93d8'][Math.floor(rnd() * 4)];
      c.fillRect(24 + i * 104 + 0, y + 2, 94, 20);
      text(c, ['검진', '스케일링', '교정', '충치', '임플란트'][Math.floor(rnd() * 5)], 71 + i * 104, y + 12, 12, '#37474f', 'center');
    }
  }
};

/** The panoramic machine's touch panel. */
const paintPanoPanel: Paint = (c) => {
  c.fillStyle = '#0d47a1';
  c.fillRect(0, 0, 192, 128);
  text(c, 'PANORAMA', 96, 18, 16, '#ffffff', 'center');
  c.strokeStyle = '#bbdefb';
  c.lineWidth = 4;
  c.beginPath();
  c.arc(96, 86, 40, Math.PI * 1.1, Math.PI * 1.9);
  c.stroke();
  text(c, '성인 · 표준', 96, 112, 13, '#e3f2fd', 'center', false);
  c.fillStyle = '#ffeb3b';
  c.beginPath();
  c.arc(96, 60, 8, 0, Math.PI * 2);
  c.fill();
};

/** The scanner's screen: the scanned lower arch in colour, the toolbar down the side. */
const paintScan: Paint = (c) => {
  const g = c.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#263238');
  g.addColorStop(1, '#455a64');
  c.fillStyle = g;
  c.fillRect(0, 0, 384, 256);
  // The gum in a horseshoe, the teeth round it.
  c.strokeStyle = '#e57373';
  c.lineWidth = 46;
  c.lineCap = 'round';
  c.beginPath();
  c.arc(200, 70, 120, Math.PI * 0.12, Math.PI * 0.88);
  c.stroke();
  for (let i = 0; i < 14; i++) {
    const a = Math.PI * (0.14 + (i / 13) * 0.72);
    const x = 200 + Math.cos(a) * 120;
    const y = 70 + Math.sin(a) * 120;
    const big = i < 3 || i > 10;
    c.fillStyle = '#fff8e1';
    c.beginPath();
    c.ellipse(x, y, big ? 15 : 10, big ? 13 : 11, a, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#d7ccc8';
    c.lineWidth = 2;
    c.stroke();
  }
  c.fillStyle = '#37474f';
  c.fillRect(0, 0, 44, 256);
  for (let i = 0; i < 5; i++) {
    c.fillStyle = i === 1 ? '#26c6da' : '#78909c';
    c.fillRect(8, 14 + i * 44, 28, 28);
  }
  text(c, '하악 스캔 98%', 374, 18, 15, '#80deea', 'right');
};

/** The smile board in the waiting room: how to brush, and the gallery of smiles. */
const paintSmile: Paint = (c) => {
  c.fillStyle = '#e0f7fa';
  c.fillRect(0, 0, 768, 384);
  c.fillStyle = '#00acc1';
  c.fillRect(0, 0, 768, 60);
  text(c, '건강한 치아를 위한 약속', 24, 32, 30, '#ffffff', 'left');
  text(c, '😁 스마일 갤러리', 744, 32, 24, '#ffffff', 'right');
  // How to brush, in four steps.
  const steps = ['잇몸에서 치아 쪽으로', '어금니 씹는 면', '앞니 안쪽 세워서', '혀도 닦아요'];
  steps.forEach((s, i) => {
    const x = 24 + (i % 2) * 196;
    const y = 76 + Math.floor(i / 2) * 150;
    c.fillStyle = '#ffffff';
    c.fillRect(x, y, 180, 136);
    c.fillStyle = '#b2ebf2';
    c.beginPath();
    c.arc(x + 90, y + 56, 40, 0, Math.PI * 2);
    c.fill();
    // A tooth and the brush at it.
    c.fillStyle = '#fffdf5';
    c.beginPath();
    c.moveTo(x + 66, y + 36);
    c.quadraticCurveTo(x + 90, y + 24, x + 114, y + 36);
    c.lineTo(x + 108, y + 72);
    c.lineTo(x + 98, y + 88);
    c.lineTo(x + 90, y + 70);
    c.lineTo(x + 82, y + 88);
    c.lineTo(x + 72, y + 72);
    c.closePath();
    c.fill();
    c.strokeStyle = '#90a4ae';
    c.lineWidth = 2;
    c.stroke();
    c.save();
    c.translate(x + 120, y + 50);
    c.rotate(-0.7 + i * 0.5);
    c.fillStyle = '#26a69a';
    c.fillRect(0, -4, 46, 8);
    c.fillStyle = '#4fc3f7';
    c.fillRect(-12, -9, 14, 12);
    c.restore();
    text(c, `${i + 1}`, x + 16, y + 18, 18, '#00838f', 'center');
    text(c, s, x + 90, y + 116, 16, '#37474f', 'center');
  });
  // The gallery: polaroids of smiles.
  const rnd = seeded(3);
  for (let i = 0; i < 6; i++) {
    const x = 432 + (i % 3) * 110;
    const y = 82 + Math.floor(i / 3) * 150;
    c.save();
    c.translate(x + 48, y + 64);
    c.rotate((rnd() - 0.5) * 0.18);
    c.fillStyle = '#ffffff';
    c.fillRect(-48, -64, 96, 128);
    c.fillStyle = ['#ffe0b2', '#c5e1a5', '#b3e5fc', '#f8bbd0', '#d1c4e9', '#fff59d'][i];
    c.fillRect(-40, -56, 80, 86);
    c.fillStyle = ['#f1c9a5', '#e0ac7e', '#f8d9c0'][i % 3];
    c.beginPath();
    c.arc(0, -10, 28, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = ['#3b2a20', '#1a1a1a', '#6d4c41'][i % 3];
    c.beginPath();
    c.arc(0, -18, 29, Math.PI, 0);
    c.fill();
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(0, -2, 15, 0, Math.PI);
    c.fill();
    c.strokeStyle = '#c62828';
    c.lineWidth = 2;
    c.stroke();
    c.fillStyle = '#263238';
    c.fillRect(-12, -20, 5, 5);
    c.fillRect(7, -20, 5, 5);
    text(c, ['교정 완료!', '충치 0개', '임플란트', '미백', '스케일링', '첫 검진'][i], 0, 48, 14, '#455a64', 'center');
    c.restore();
  }
  // A star sticker in the corner: a check-up every six months.
  c.fillStyle = '#ffca28';
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 18 : 40;
    const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
    c.lineTo(390 + Math.cos(a) * r, 330 + Math.sin(a) * r);
  }
  c.closePath();
  c.fill();
  text(c, '6개월', 390, 324, 14, '#5d4037', 'center');
  text(c, '정기검진', 390, 340, 12, '#5d4037', 'center');
};

// ---------------------------------------------------------------------------------------------
// The pieces.

export const BUILDERS: Record<string, Builder> = {
  /**
   * The unit chair, the head out to the front: the column on its floor plate, the seat, the leg rest
   * and the back reclined towards the headrest in the clinic's teal, armrests; the overhead light on
   * its post, the X-ray on a screen beside it, the cuspidor and its suction at the patient's left, the
   * bracket table over their right with the handpieces hanging in a row, their hoses looping under;
   * the dentist's stool tucked in by the head. While it's used a patient lies in it — the bib on,
   * tinted glasses, the mouth open with the mirror and the probe in it — the light blazes, and the
   * dentist sits on the stool pulled up behind the head, at the mouth. The assistant readies the
   * patient from their left, by the cuspidor; a junior watches over the dentist's right shoulder.
   */
  dentalChair(g, _W, _D, c, _def, _ctx, out) {
    const uph = c === '#4dd0e1' ? UPHOLSTERY : c;
    const shell = '#f3f5f6';
    // The floor plate, the lift column with its bellows, the shell under the seat.
    part(g, rbox(0.56, 0.05, 0.86, 0.025), shell, 0, 0.025, -0.22);
    part(g, rbox(0.26, 0.34, 0.34, 0.04), '#cfd8dc', 0, 0.22, -0.12);
    for (let i = 0; i < 4; i++) part(g, rbox(0.27, 0.015, 0.35, 0.01), '#b0bec5', 0, 0.1 + i * 0.075, -0.12, { outline: false });
    part(g, rbox(0.5, 0.12, 0.5, 0.05), shell, 0, 0.45, -0.06);
    // The seat.
    part(g, rbox(0.54, 0.1, 0.46, 0.045), uph, 0, 0.57, -0.07);
    // The leg rest, falling a little to the foot.
    const leg = new THREE.Group();
    leg.position.set(0, 0.57, -0.3);
    leg.rotation.x = -0.1;
    g.add(leg);
    part(leg, rbox(0.46, 0.05, 0.6, 0.02), shell, 0, -0.03, -0.31);
    part(leg, rbox(0.48, 0.09, 0.62, 0.04), uph, 0, 0.045, -0.31);
    // The back, reclined; the headrest on its stem.
    const back = new THREE.Group();
    back.position.set(0, 0.57, 0.15);
    back.rotation.x = -0.31;
    g.add(back);
    part(back, rbox(0.5, 0.05, 0.56, 0.02), shell, 0, -0.02, 0.3);
    part(back, rbox(0.54, 0.1, 0.6, 0.045), uph, 0, 0.05, 0.3);
    part(back, rbox(0.4, 0.012, 0.44, 0.01), tint(uph, 0.15), 0, 0.104, 0.3, { outline: false });
    part(back, box(0.08, 0.03, 0.14), CHROME, 0, 0.02, 0.62, { outline: false });
    part(back, rbox(0.28, 0.08, 0.24, 0.04), uph, 0, 0.06, 0.74);
    // The armrests.
    for (const sx of [-1, 1]) {
      part(g, rbox(0.07, 0.05, 0.38, 0.02), shell, sx * 0.33, 0.72, 0.04);
      rod(g, new THREE.Vector3(sx * 0.33, 0.7, -0.1), new THREE.Vector3(sx * 0.26, 0.52, -0.1), 0.015, CHROME);
    }
    // The cuspidor at the patient's left: its column, the bowl, the cup filler and a cup, the suction.
    const cx = -0.43;
    const cz = 0.33;
    part(g, rbox(0.15, 0.78, 0.16, 0.03), shell, cx, 0.39, cz);
    part(g, box(0.16, 0.03, 0.17), uph, cx, 0.62, cz, { outline: false });
    part(g, cyl(0.09, 0.05, 0.07, 18), '#ffffff', cx - 0.02, 0.81, cz);
    part(g, cyl(0.075, 0.075, 0.01, 18), '#b3e5fc', cx - 0.02, 0.84, cz, { outline: false });
    rod(g, new THREE.Vector3(cx + 0.05, 0.78, cz - 0.05), new THREE.Vector3(cx + 0.05, 0.92, cz - 0.05), 0.01, CHROME);
    rod(g, new THREE.Vector3(cx + 0.05, 0.92, cz - 0.05), new THREE.Vector3(cx + 0.02, 0.9, cz - 0.01), 0.008, CHROME);
    part(g, cyl(0.025, 0.02, 0.06, 12), '#fffde7', cx + 0.02, 0.81, cz - 0.01);
    for (const [dz, k] of [[-0.04, '#90a4ae'], [0.04, '#78909c']] as const) {
      part(g, cyl(0.012, 0.012, 0.14, 8), k, cx - 0.085, 0.72, cz + dz, { rz: 0.25 });
      rod(g, new THREE.Vector3(cx - 0.1, 0.65, cz + dz), new THREE.Vector3(cx - 0.12, 0.35, cz + dz + 0.04), 0.008, '#b0bec5');
    }
    // The light's post and arm, the light over the mouth (its face lit while it's used).
    const px = -0.42;
    const pz = -0.42;
    part(g, rbox(0.14, 0.4, 0.14, 0.03), shell, px, 0.2, pz);
    part(g, cyl(0.035, 0.035, 1.62, 12), '#eceff1', px, 1.2, pz, { outline: false });
    part(g, ball(0.05), '#cfd8dc', px, 2.02, pz);
    rod(g, new THREE.Vector3(px, 2.02, pz), new THREE.Vector3(-0.18, 2.0, 0.15), 0.022, '#eceff1');
    part(g, ball(0.035), '#cfd8dc', -0.18, 2.0, 0.15);
    rod(g, new THREE.Vector3(-0.18, 2.0, 0.15), new THREE.Vector3(0, 1.86, 0.46), 0.018, '#eceff1');
    const lamp = new THREE.Group();
    lamp.position.set(0, 1.8, 0.48);
    lamp.rotation.x = -0.4;
    g.add(lamp);
    part(lamp, rbox(0.36, 0.09, 0.15, 0.04), '#eceff1', 0, 0, 0);
    part(lamp, box(0.3, 0.006, 0.1), '#b0bec5', 0, -0.046, 0, { outline: false });
    for (const sx of [-1, 1]) part(lamp, cyl(0.014, 0.014, 0.07, 8), '#4fc3f7', sx * 0.2, 0, 0, { rz: Math.PI / 2 });
    part(lamp, rbox(0.06, 0.06, 0.04, 0.02), '#cfd8dc', 0, 0.06, 0);
    // The X-ray on its screen, on the post, turned to the stool.
    const mon = new THREE.Group();
    mon.position.set(px + 0.04, 1.42, pz + 0.08);
    mon.rotation.y = 0.35;
    g.add(mon);
    part(mon, rbox(0.4, 0.28, 0.035, 0.012), BLACK, 0, 0, 0);
    part(mon, box(0.05, 0.05, 0.08), '#78909c', 0, 0, -0.05, { outline: false });
    out.screen = litScreen(mon, painted('dt-periapical', 384, 256, paintPeriapical), 0.37, 0.25, 0, 0, 0.019);
    // The bracket table over the patient's right on its arm: the tray of instruments, the controls,
    // the four handpieces hanging along its front, their hoses looping down and back.
    const tx = 0.38;
    const tz = 0.18;
    const ty = 1.0;
    part(g, rbox(0.12, 0.5, 0.14, 0.03), shell, 0.36, 0.25, -0.42);
    rod(g, new THREE.Vector3(0.36, 0.5, -0.42), new THREE.Vector3(0.42, 0.92, -0.2), 0.024, '#eceff1');
    rod(g, new THREE.Vector3(0.42, 0.92, -0.2), new THREE.Vector3(tx + 0.04, ty - 0.04, tz - 0.06), 0.02, '#eceff1');
    part(g, rbox(0.36, 0.05, 0.28, 0.02), shell, tx, ty, tz);
    part(g, box(0.22, 0.008, 0.14), STEEL, tx - 0.04, ty + 0.03, tz - 0.04, { outline: false });
    for (let i = 0; i < 4; i++) part(g, box(0.008, 0.006, 0.11), CHROME, tx - 0.12 + i * 0.035, ty + 0.037, tz - 0.04, { outline: false, ry: 0.05 * i });
    for (let i = 0; i < 3; i++) part(g, cyl(0.009, 0.009, 0.05, 8), '#ffffff', tx + 0.02, ty + 0.042, tz - 0.08 + i * 0.022, { rz: Math.PI / 2, outline: false });
    part(g, cyl(0.022, 0.02, 0.06, 12), '#b3e5fc', tx + 0.12, ty + 0.055, tz - 0.06);
    part(g, rbox(0.1, 0.012, 0.06, 0.006), '#37474f', tx + 0.11, ty + 0.03, tz + 0.06);
    for (let i = 0; i < 3; i++) glowing(g, cyl(0.007, 0.007, 0.004, 8), ['#66bb6a', '#ffca28', '#4fc3f7'][i], tx + 0.08 + i * 0.03, ty + 0.038, tz + 0.06);
    const pieces = ['#cfd8dc', '#90a4ae', '#ffffff', '#b0bec5'];
    pieces.forEach((k, i) => {
      const x = tx - 0.09 + i * 0.06;
      const z = tz + 0.15;
      part(g, box(0.035, 0.03, 0.03), '#90a4ae', x, ty - 0.005, z - 0.01, { outline: false });
      part(g, cyl(0.011, 0.013, 0.15, 10), k, x, ty + 0.06, z, { rx: 0.25 });
      part(g, cyl(0.013, 0.013, 0.012, 10), ['#e53935', '#1e88e5', '#43a047', '#fdd835'][i], x, ty + 0.03, z - 0.005, { rx: 0.25, outline: false });
      const low = new THREE.Vector3(x + 0.01, 0.62 - i * 0.03, z + 0.05);
      rod(g, new THREE.Vector3(x, ty - 0.02, z), low, 0.007, '#546e7a');
      rod(g, low, new THREE.Vector3(x + 0.02, ty - 0.04, tz - 0.02), 0.007, '#546e7a');
    });
    // The dentist's stool, tucked in by the head while nobody's in the chair.
    const idle = new THREE.Group();
    idle.position.set(0, 0, 0.98);
    g.add(idle);
    stool(idle, 0.24, 0, 0.55, '#37474f', true);
    out.idle = idle;
    // In use: the patient lying back with the bib on and the mouth open, the stool pulled up to the
    // head, the foot control under it, the mirror and the probe in the mouth, the light on.
    const use = new THREE.Group();
    g.add(use);
    const seatZ = 1.22;
    stool(use, 0, seatZ, 0.55, '#37474f', true);
    part(use, cyl(0.1, 0.11, 0.035, 18), '#455a64', 0.32, 0.018, seatZ - 0.22);
    part(use, cyl(0.04, 0.04, 0.012, 12), '#90a4ae', 0.32, 0.04, seatZ - 0.22, { outline: false });
    glowing(alongside(use, lamp), box(0.28, 0.008, 0.09), '#fffbe6', 0, -0.05, 0);
    const pb = alongside(use, back);
    const pl = alongside(use, leg);
    const shirt = '#7986cb';
    const pants = '#455a64';
    // The body along the back; the arms folded over the belly.
    part(pb, rbox(0.36, 0.17, 0.48, 0.07), shirt, 0, 0.185, 0.27);
    part(pb, rbox(0.28, 0.006, 0.24, 0.004), '#81d4fa', 0, 0.274, 0.38, { outline: false });
    part(pb, box(0.28, 0.004, 0.03), '#4fc3f7', 0, 0.278, 0.27, { outline: false });
    for (const sx of [-1, 1]) {
      rod(pb, new THREE.Vector3(sx * 0.13, 0.276, 0.49), new THREE.Vector3(sx * 0.05, 0.25, 0.6), 0.004, CHROME);
      rod(pb, new THREE.Vector3(sx * 0.2, 0.19, 0.45), new THREE.Vector3(sx * 0.22, 0.2, 0.2), 0.045, shirt);
      rod(pb, new THREE.Vector3(sx * 0.22, 0.2, 0.2), new THREE.Vector3(sx * 0.07, 0.29, 0.1), 0.04, shirt);
      part(pb, ball(0.04), SKIN, sx * 0.06, 0.3, 0.09);
    }
    // The neck and the head on the headrest, the face up: the hair behind, tinted glasses, the mouth open.
    rod(pb, new THREE.Vector3(0, 0.19, 0.5), new THREE.Vector3(0, 0.2, 0.66), 0.045, SKIN);
    part(pb, ball(0.095), SKIN, 0, 0.2, 0.73).scale.set(0.92, 1, 1.06);
    part(pb, ball(0.097), HAIR, 0, 0.175, 0.755).scale.set(1.02, 0.82, 1.08);
    for (const sx of [-1, 1]) part(pb, ball(0.02), SKIN, sx * 0.088, 0.2, 0.73);
    part(pb, box(0.15, 0.012, 0.04), '#ffb74d', 0, 0.29, 0.76, { outline: false });
    part(pb, box(0.17, 0.016, 0.008), BLACK, 0, 0.292, 0.782, { outline: false });
    part(pb, ball(0.019), shade(SKIN, 0.92), 0, 0.293, 0.718);
    part(pb, ball(0.028), '#5d1a1a', 0, 0.284, 0.672, { outline: false }).scale.set(1.25, 0.4, 0.85);
    part(pb, box(0.045, 0.006, 0.008), '#ffffff', 0, 0.29, 0.69, { outline: false });
    // The hips and thighs on the seat; the shins and shoes along the leg rest.
    part(use, rbox(0.36, 0.15, 0.3, 0.06), pants, 0, 0.69, -0.02);
    for (const sx of [-1, 1]) {
      rod(use, new THREE.Vector3(sx * 0.09, 0.69, -0.02), new THREE.Vector3(sx * 0.09, 0.68, -0.32), 0.07, pants);
      rod(pl, new THREE.Vector3(sx * 0.09, 0.14, 0), new THREE.Vector3(sx * 0.09, 0.14, -0.52), 0.055, pants);
      part(pl, rbox(0.1, 0.14, 0.08, 0.03), '#3e2723', sx * 0.09, 0.19, -0.58);
    }
    // The mouth (where the dentist's hands go), the mirror and the probe in it, held from the stool.
    const mouth = marker(pb, 0, 0.29, 0.67);
    const m = inPiece(g, pb, 0, 0.284, 0.672);
    const tool = (grip: { side: number; up: number; ahead: number }, tip: THREE.Vector3, k: string, head: boolean) => {
      // From the stool the dentist faces -z: their left is -x, ahead is -z.
      const hand = new THREE.Vector3(m.x - grip.side, m.y + grip.up, m.z - grip.ahead);
      const butt = hand.clone().addScaledVector(hand.clone().sub(tip).normalize(), 0.04);
      const neck = hand.clone().lerp(tip, 0.55);
      rod(use, butt, neck, 0.0055, k);
      rod(use, neck, tip, 0.0025, CHROME);
      if (head) {
        const h = part(use, cyl(0.011, 0.011, 0.003, 14), '#e0f7fa', tip.x, tip.y, tip.z, { outline: false });
        h.lookAt(hand);
        h.rotateX(Math.PI / 2);
      } else rod(use, tip, tip.clone().add(new THREE.Vector3(0.006, -0.012, -0.004)), 0.0018, CHROME);
    };
    tool(DENTAL_GRIP.mirror, new THREE.Vector3(m.x - 0.025, m.y - 0.004, m.z + 0.004), '#90a4ae', true);
    tool(DENTAL_GRIP.probe, new THREE.Vector3(m.x + 0.018, m.y - 0.006, m.z - 0.006), '#b0bec5', false);
    out.inUse = use;
    // Sat on the stool behind the head, at the mouth; the assistant at the patient's left readying
    // them (the bib, the suction); a junior watching over the dentist's right shoulder.
    const dentist = at(spot(g, 'sit', 0, 0.55, seatZ, Math.PI, 0.55), mouth, 'dentistry');
    const chest = marker(pb, 0, 0.28, 0.46);
    const assist = at(spot(g, 'stand', -0.55, 0, 0.64, Math.atan2(0.55, -0.14)), chest, 'tinker');
    const watch = at(spot(g, 'stand', 0.7, 0, 1.12, Math.atan2(-0.7, -0.42)), mouth, 'meeting');
    out.work = mouth;
    out.spots = { '*': dentist, prepareChair: assist, dentist_observeTreatment: watch };
  },

  /**
   * The autoclave on its counter (the dental clinic's and the tattoo studio's): a steel benchtop
   * steriliser with the round chamber behind its door (the door swings open to load it while it's
   * used, the racks of pouches inside), the display reading the cycle; beside it the ultrasonic
   * cleaner with its basket and a tray of sealed pouches; labelled drawers below, the steps of
   * sterilising up on the splashback. Loaded standing at it; the steps are learnt from the chart.
   */
  sterilizer(g, _W, D, _c, _def, _ctx, out) {
    const d = 0.6;
    const z = -D / 2 + d / 2 + 0.02;
    const zf = z + d / 2;
    const top = 0.9;
    part(g, rbox(0.92, top - 0.05, d - 0.04, 0.02), ENAMEL, 0, (top - 0.05) / 2, z - 0.01);
    part(g, box(0.88, 0.06, d - 0.08), '#90a4ae', 0, 0.03, z - 0.02, { outline: false });
    part(g, rbox(0.96, 0.04, d + 0.02, 0.01), '#cfd8dc', 0, top - 0.02, z);
    const drawers = ['멸균 파우치', '거즈 · 솜', '장갑'];
    drawers.forEach((s, i) => {
      const y = 0.68 - i * 0.24;
      part(g, rbox(0.86, 0.2, 0.014, 0.006), '#e0f2f1', 0, y, zf - 0.03);
      part(g, box(0.2, 0.014, 0.02), '#78909c', 0, y + 0.05, zf - 0.016, { outline: false });
      label(g, s, 0.24, 0.05, 0, y - 0.03, zf - 0.02, '#ffffff', '#37474f');
    });
    // The splashback with the steps of sterilising on it.
    part(g, box(0.92, 0.7, 0.03), '#eceff1', 0, top + 0.35, -D / 2 + 0.035);
    picture(g, painted('dt-steps', 320, 400, paintSteps), 0.26, 0.33, 0.28, top + 0.44, -D / 2 + 0.052);
    // The autoclave: its body, the display band over the door.
    const ax = -0.17;
    const aw = 0.5;
    const ah = 0.4;
    const ad = 0.46;
    const az = z - 0.02;
    const afront = az + ad / 2;
    part(g, rbox(aw, ah, ad, 0.03), '#e8eaed', ax, top + ah / 2, az);
    part(g, box(aw - 0.04, 0.012, ad - 0.06), '#b0bec5', ax, top + ah + 0.002, az, { outline: false });
    for (let i = 0; i < 5; i++) part(g, box(0.006, 0.08, 0.2), '#b0bec5', ax + aw / 2 + 0.001, top + 0.22, az - 0.08 + i * 0.04, { outline: false });
    part(g, box(aw - 0.04, 0.08, 0.012), '#37474f', ax, top + ah - 0.06, afront + 0.004, { outline: false });
    out.screen = litScreen(g, painted('dt-autoclave', 256, 96, paintAutoclave), 0.2, 0.065, ax - 0.07, top + ah - 0.06, afront + 0.012);
    for (let i = 0; i < 3; i++) part(g, cyl(0.012, 0.012, 0.012, 10), ['#43a047', '#e53935', '#90a4ae'][i], ax + 0.09 + i * 0.045, top + ah - 0.06, afront + 0.012, { rx: Math.PI / 2, outline: false });
    // The chamber behind the door: dark round mouth, the rack and the pouches in it.
    const cy = top + 0.16;
    part(g, cyl(0.13, 0.13, 0.01, 24), '#263238', ax, cy, afront + 0.002, { rx: Math.PI / 2, outline: false });
    part(g, ring(0.13, 0.012), STEEL, ax, cy, afront + 0.006, { outline: false });
    for (const dy of [-0.05, 0.03]) {
      part(g, box(0.2, 0.006, 0.02), CHROME, ax, cy + dy, afront + 0.006, { outline: false });
      part(g, box(0.16, 0.035, 0.012), '#e1f5fe', ax, cy + dy + 0.022, afront + 0.008, { outline: false });
    }
    // The door, hung at the left, that opens to load it.
    const hinge = new THREE.Group();
    hinge.position.set(ax - aw / 2 + 0.03, 0, afront + 0.012);
    hinge.userData.swing = -1;
    g.add(hinge);
    const dw = aw - 0.08;
    part(hinge, rbox(dw, 0.27, 0.03, 0.02), '#f5f5f5', dw / 2, cy, 0.008);
    part(hinge, cyl(0.1, 0.1, 0.01, 22), '#cfd8dc', dw / 2, cy, 0.026, { rx: Math.PI / 2, outline: false });
    part(hinge, ring(0.1, 0.008), '#90a4ae', dw / 2, cy, 0.028, { outline: false });
    part(hinge, rbox(0.03, 0.12, 0.03, 0.01), '#546e7a', dw - 0.03, cy, 0.035);
    out.doors = [hinge];
    // Lit while it runs: the cycle light.
    const use = new THREE.Group();
    g.add(use);
    glowing(use, box(0.04, 0.012, 0.01), '#ffca28', ax + 0.2, top + ah - 0.025, afront + 0.008);
    out.inUse = use;
    // The ultrasonic cleaner: a steel tub with its basket in the water, and the tray of sealed pouches.
    const ux = 0.27;
    const uz = z - 0.12;
    part(g, rbox(0.28, 0.16, 0.2, 0.02), STEEL, ux, top + 0.08, uz);
    part(g, box(0.22, 0.01, 0.14), '#b3e5fc', ux, top + 0.155, uz, { outline: false });
    part(g, box(0.2, 0.02, 0.12), '#90a4ae', ux, top + 0.16, uz, { outline: false });
    part(g, box(0.1, 0.03, 0.01), '#37474f', ux, top + 0.05, uz + 0.101, { outline: false });
    glowing(g, cyl(0.006, 0.006, 0.004, 8), '#66bb6a', ux + 0.08, top + 0.05, uz + 0.104, Math.PI / 2);
    part(g, rbox(0.3, 0.025, 0.2, 0.008), '#4fc3f7', ux, top + 0.012, zf - 0.13);
    for (let i = 0; i < 4; i++) {
      part(g, box(0.07, 0.008, 0.17), '#f5f5f5', ux - 0.105 + i * 0.07, top + 0.03 + (i % 2) * 0.004, zf - 0.13, { ry: 0.04 * (i - 1.5) });
      part(g, box(0.05, 0.009, 0.1), '#80deea', ux - 0.105 + i * 0.07, top + 0.032 + (i % 2) * 0.004, zf - 0.15, { ry: 0.04 * (i - 1.5), outline: false });
    }
    label(g, '멸균기', 0.18, 0.05, ax, top + ah + 0.12, -D / 2 + 0.052, '#00897b', '#ffffff');
    // Loaded standing at the open chamber; the steps are gone over at the chart.
    const chamber = marker(g, ax + 0.02, cy, afront + 0.05);
    const chart = marker(g, 0.28, top + 0.44, -D / 2 + 0.06);
    out.work = chamber;
    out.spots = {
      '*': at(spot(g, 'stand', -0.05, 0, zf + 0.42, Math.PI), chamber, 'tinker'),
      tattooArtist_hygieneTraining: at(spot(g, 'stand', 0.12, 0, zf + 0.45, Math.PI), chart, 'meeting'),
    };
  },

  /**
   * The dental lab's bench: a white top on a drawer unit (plaster, wax, burs), a footrest; at the
   * back a shelf of models in their boxes and the shade guide under a strip light. Along it: the
   * model trimmer with its wheel, the vibrator with a rubber bowl of plaster and the spatula, the
   * dust hood with a lower model set in its articulator and the handpiece in its cradle under a
   * magnifier lamp, the wax heater and the alcohol torch (lit while it's used), and on the right an
   * implant case model with its printed surgical guide by the implant kit. Two stools: models are
   * poured and trimmed at the middle, the surgery prepared at the right.
   */
  dentalLabBench(g, W, D, _c, _def, _ctx, out) {
    const d = 0.62;
    const z = -D / 2 + d / 2 + 0.02;
    const zf = z + d / 2;
    const top = 0.88;
    const Wt = Math.min(W - 0.08, 1.9);
    part(g, rbox(Wt, 0.05, d, 0.015), '#fafafa', 0, top - 0.025, z);
    part(g, box(Wt - 0.02, 0.02, 0.012), '#4dd0e1', 0, top - 0.04, zf + 0.002, { outline: false });
    // The drawer unit at the left, legs at the right, the footrest.
    const lx = -Wt / 2 + 0.25;
    part(g, rbox(0.46, top - 0.06, d - 0.06, 0.012), '#eceff1', lx, (top - 0.06) / 2, z - 0.01);
    ['석고', '왁스', '버 · 디스크', '인상재'].forEach((s, i) => {
      const y = 0.72 - i * 0.19;
      part(g, rbox(0.42, 0.16, 0.012, 0.005), '#e0f7fa', lx, y, zf - 0.035);
      part(g, box(0.12, 0.012, 0.018), '#78909c', lx, y + 0.04, zf - 0.024, { outline: false });
      label(g, s, 0.16, 0.04, lx, y - 0.025, zf - 0.027, '#ffffff', '#37474f');
    });
    for (const sz of [-1, 1]) part(g, rbox(0.04, top - 0.05, 0.04, 0.01), '#b0bec5', Wt / 2 - 0.05, (top - 0.05) / 2, z + sz * (d / 2 - 0.05));
    part(g, rbox(0.04, top - 0.05, 0.04, 0.01), '#b0bec5', 0.15, (top - 0.05) / 2, z - d / 2 + 0.05);
    rod(g, new THREE.Vector3(lx + 0.24, 0.18, zf - 0.12), new THREE.Vector3(Wt / 2 - 0.05, 0.18, zf - 0.12), 0.015, CHROME);
    // The back panel, the shelf of model boxes and the shade guide, the strip light under it.
    const bz = -D / 2 + 0.03;
    part(g, box(Wt, 0.62, 0.03), '#eceff1', 0, top + 0.31, bz);
    part(g, rbox(Wt, 0.03, 0.2, 0.01), '#fafafa', 0, top + 0.62, bz + 0.1);
    const rnd = seeded(9);
    for (let i = 0; i < 13; i++) {
      const x = -Wt / 2 + 0.12 + i * 0.13;
      const k = ['#4fc3f7', '#ffb74d', '#aed581', '#f06292'][Math.floor(rnd() * 4)];
      part(g, rbox(0.11, 0.07, 0.15, 0.01), '#ffffff', x, top + 0.67, bz + 0.1);
      part(g, box(0.112, 0.02, 0.152), k, x, top + 0.69, bz + 0.1, { outline: false });
      if (i % 3 === 0) arch(g, x, top + 0.705, bz + 0.12, i % 2 ? DIE : STONE, 0, 0.6);
    }
    part(g, box(Wt - 0.1, 0.02, 0.04), '#ffffff', 0, top + 0.595, bz + 0.16, { outline: false });
    const use = new THREE.Group();
    g.add(use);
    glowing(use, box(Wt - 0.14, 0.008, 0.03), '#fffbe6', 0, top + 0.584, bz + 0.16);
    // The shade guide on its stand against the panel.
    part(g, rbox(0.26, 0.02, 0.06, 0.008), '#37474f', -0.4, top + 0.01, bz + 0.07);
    for (let i = 0; i < 8; i++) part(g, rbox(0.022, 0.05, 0.012, 0.005), ['#fff8e1', '#fff3d6', '#ffecc7', '#f8e3b9', '#f3dcae', '#efd6a4', '#ead09a', '#e4c88f'][i], -0.5 + i * 0.03, top + 0.045, bz + 0.07, { outline: false });
    // The model trimmer at the far left: its motor, the wheel under the guard, the water line.
    const mx = -Wt / 2 + 0.17;
    const mz = z - 0.05;
    part(g, rbox(0.24, 0.22, 0.28, 0.03), '#5c6bc0', mx, top + 0.11, mz);
    part(g, cyl(0.12, 0.12, 0.04, 22), '#9fa8da', mx, top + 0.23, mz + 0.04, { rx: Math.PI / 2 });
    part(g, cyl(0.1, 0.1, 0.045, 22), '#78909c', mx, top + 0.23, mz + 0.045, { rx: Math.PI / 2, outline: false });
    part(g, rbox(0.18, 0.02, 0.1, 0.008), '#b0bec5', mx, top + 0.15, mz + 0.18);
    rod(g, new THREE.Vector3(mx - 0.1, top + 0.32, mz), new THREE.Vector3(mx - 0.05, top + 0.28, mz + 0.06), 0.006, '#4fc3f7');
    for (let i = 0; i < 5; i++) part(g, ball(0.008), '#ffffff', mx - 0.07 + i * 0.035, top + 0.005, mz + 0.22 + (i % 2) * 0.03, { outline: false });
    // The vibrator, a rubber bowl of plaster on it and the spatula.
    const vx = -0.42;
    const vz = zf - 0.2;
    part(g, rbox(0.18, 0.07, 0.16, 0.02), '#eceff1', vx, top + 0.035, vz);
    part(g, rbox(0.17, 0.012, 0.15, 0.01), '#455a64', vx, top + 0.075, vz, { outline: false });
    part(g, cyl(0.07, 0.04, 0.07, 18), '#a5d6a7', vx, top + 0.12, vz);
    part(g, cyl(0.062, 0.062, 0.01, 18), STONE, vx, top + 0.145, vz, { outline: false });
    part(g, box(0.015, 0.004, 0.18), '#795548', vx + 0.06, top + 0.17, vz + 0.02, { rx: -0.4, ry: 0.4 });
    part(g, box(0.03, 0.002, 0.05), CHROME, vx + 0.055, top + 0.125, vz - 0.06, { rx: -0.4, ry: 0.4, outline: false });
    // The dust hood, a lower model in its articulator before it, the handpiece in its cradle.
    const hx = -0.05;
    part(g, rbox(0.34, 0.2, 0.06, 0.03), '#b0bec5', hx, top + 0.1, z - 0.18);
    part(g, rbox(0.3, 0.02, 0.22, 0.01), '#90a4ae', hx, top + 0.01, z - 0.08);
    glass(g, box(0.3, 0.14, 0.004), hx, top + 0.2, z - 0.06, undefined, -0.7);
    const art = new THREE.Group();
    art.position.set(hx, top, z + 0.03);
    g.add(art);
    part(art, rbox(0.12, 0.012, 0.12, 0.004), STEEL, 0, 0.006, 0);
    part(art, box(0.012, 0.15, 0.012), CHROME, 0, 0.08, -0.055, { outline: false });
    part(art, box(0.1, 0.012, 0.012), CHROME, 0, 0.155, -0.055, { outline: false });
    part(art, rbox(0.12, 0.012, 0.12, 0.004), STEEL, 0, 0.13, 0, { rx: 0.15 });
    arch(art, 0, 0.012, 0.01, DIE, 0, 1);
    arch(art, 0, 0.11, 0.01, STONE, 0, 1, true).rotation.z = Math.PI;
    part(g, rbox(0.06, 0.04, 0.08, 0.01), '#37474f', hx + 0.22, top + 0.02, zf - 0.12);
    part(g, cyl(0.011, 0.013, 0.15, 10), '#cfd8dc', hx + 0.22, top + 0.065, zf - 0.12, { rx: 1.1 });
    rod(g, new THREE.Vector3(hx + 0.22, top + 0.03, zf - 0.19), new THREE.Vector3(hx + 0.32, top + 0.005, z - 0.2), 0.006, '#37474f');
    // The magnifier lamp on its arm from the panel, over the articulator; lit while it's used.
    rod(g, new THREE.Vector3(hx + 0.3, top + 0.5, bz + 0.03), new THREE.Vector3(hx + 0.2, top + 0.55, z - 0.05), 0.012, '#eceff1');
    rod(g, new THREE.Vector3(hx + 0.2, top + 0.55, z - 0.05), new THREE.Vector3(hx + 0.02, top + 0.42, z + 0.05), 0.012, '#eceff1');
    const mag = new THREE.Group();
    mag.position.set(hx, top + 0.4, z + 0.06);
    mag.rotation.x = 0.35;
    g.add(mag);
    part(mag, ring(0.08, 0.018), '#eceff1', 0, 0, 0, { rx: Math.PI / 2 });
    glass(mag, cyl(0.07, 0.07, 0.008, 22), 0, 0, 0);
    glowing(alongside(use, mag), ring(0.08, 0.008), '#fffde7', 0, -0.012, 0, Math.PI / 2);
    // The wax heater and the alcohol torch (its flame lit while it's used), wax knives in a pot.
    const wx = 0.38;
    part(g, rbox(0.14, 0.07, 0.12, 0.02), '#eceff1', wx, top + 0.035, z - 0.1);
    for (let i = 0; i < 3; i++) part(g, cyl(0.022, 0.022, 0.02, 12), ['#e53935', '#43a047', '#1e88e5'][i], wx - 0.04 + i * 0.04, top + 0.08, z - 0.1, { outline: false });
    part(g, cyl(0.035, 0.045, 0.07, 14), '#e1f5fe', wx + 0.02, top + 0.035, zf - 0.17);
    part(g, cyl(0.008, 0.008, 0.03, 8), '#fafafa', wx + 0.02, top + 0.085, zf - 0.17, { outline: false });
    glowing(use, cyl(0.001, 0.012, 0.05, 8), '#4fc3f7', wx + 0.02, top + 0.12, zf - 0.17);
    glowing(use, cyl(0.001, 0.007, 0.03, 8), '#fff59d', wx + 0.02, top + 0.115, zf - 0.17);
    part(g, cyl(0.025, 0.022, 0.08, 12), '#546e7a', wx + 0.12, top + 0.04, z - 0.15);
    for (let i = 0; i < 4; i++) part(g, cyl(0.004, 0.004, 0.14, 6), i % 2 ? CHROME : '#8d6e63', wx + 0.11 + (i % 2) * 0.02, top + 0.11, z - 0.16 + (i > 1 ? 0.02 : 0), { rz: (i - 1.5) * 0.12, outline: false });
    // The implant case at the right: a model with its printed guide, the kit open beside it.
    const ix = Wt / 2 - 0.2;
    const guide = arch(g, ix, top, zf - 0.22, STONE, 0, 1.2);
    part(guide, ring(0.042, 0.016, Math.PI), '#ffcc80', 0, 0.055, -0.02, { rx: Math.PI / 2, outline: false });
    for (const a of [0.3, 0.7]) part(guide, cyl(0.008, 0.008, 0.02, 10), CHROME, Math.cos(Math.PI * a) * 0.042, 0.065, -0.02 + Math.sin(Math.PI * a) * 0.042, { outline: false });
    part(g, rbox(0.24, 0.04, 0.16, 0.01), '#37474f', ix - 0.02, top + 0.02, z - 0.1);
    part(g, box(0.22, 0.004, 0.14), '#90a4ae', ix - 0.02, top + 0.042, z - 0.1, { outline: false });
    for (let i = 0; i < 12; i++) part(g, cyl(0.006, 0.006, 0.02, 8), ['#e53935', '#fdd835', '#43a047', '#1e88e5'][i % 4], ix - 0.11 + (i % 6) * 0.035, top + 0.05, z - 0.13 + Math.floor(i / 6) * 0.05, { outline: false });
    part(g, rbox(0.24, 0.16, 0.012, 0.01), '#37474f', ix - 0.02, top + 0.12, z - 0.18, { rx: -0.3 });
    out.inUse = use;
    // The two stools.
    stool(g, hx, zf + 0.2, 0.6, '#455a64');
    stool(g, ix, zf + 0.2, 0.6, '#455a64');
    // Sat at the articulator working the model; the implant guide fitted at the right.
    const model = marker(g, hx, top + 0.08, z + 0.05);
    const implant = marker(g, ix, top + 0.06, zf - 0.24);
    out.work = model;
    out.spots = {
      '*': at(spot(g, 'sit', hx, 0.6, zf + 0.2, Math.PI, 0.6), model, 'tinker'),
      dentist_implantGuide: at(spot(g, 'sit', ix, 0.6, zf + 0.2, Math.PI, 0.6), implant, 'tinker'),
    };
  },

  /**
   * The front desk, its staff side to the front: a low desk with the book of appointments on the
   * screen, keyboard, the phone and the open diary, the staff chair; on the patients' side (the
   * back) a raised counter in the clinic's teal with its sign and a tooth for a logo, the card
   * reader, a cup of toothbrushes, a stand of leaflets and the hand gel. Patients are checked in sat
   * at the screen.
   */
  dtFrontDesk(g, W, D, c, _def, _ctx, out) {
    const h = 0.74;
    const zb = -D / 2 + 0.06;
    const Wd = W - 0.1;
    // The patients' counter at the back: its panel, the raised ledge, the sign facing out.
    part(g, rbox(Wd, 1.06, 0.06, 0.02), '#fafafa', 0, 0.53, zb);
    part(g, box(Wd - 0.02, 0.4, 0.008), c, 0, 0.42, zb - 0.032, { outline: false });
    part(g, box(Wd - 0.02, 0.03, 0.008), '#ffffff', 0, 0.7, zb - 0.034, { outline: false });
    label(g, '접수 · 수납', 0.5, 0.11, -0.3, 0.88, zb - 0.034, '#fafafa', '#00838f', Math.PI);
    // The tooth logo: a white tooth in a teal circle.
    part(g, cyl(0.1, 0.1, 0.01, 24), '#00838f', 0.4, 0.88, zb - 0.034, { rx: Math.PI / 2, outline: false });
    part(g, ball(0.05), TOOTH, 0.4, 0.9, zb - 0.042, { outline: false }).scale.set(1.1, 0.75, 0.3);
    for (const sx of [-1, 1]) part(g, cyl(0.018, 0.008, 0.06, 8), TOOTH, 0.4 + sx * 0.026, 0.85, zb - 0.042, { rz: sx * 0.2, outline: false });
    part(g, rbox(Wd + 0.04, 0.04, 0.32, 0.015), '#fafafa', 0, 1.08, zb + 0.1);
    part(g, box(Wd + 0.04, 0.012, 0.012), '#4dd0e1', 0, 1.06, zb - 0.06, { outline: false });
    // On the ledge: the card reader, the toothbrushes, the leaflets, the gel.
    part(g, rbox(0.09, 0.03, 0.14, 0.01), BLACK, 0.55, 1.115, zb + 0.08, { rx: 0.2 });
    part(g, box(0.06, 0.002, 0.04), '#80cbc4', 0.55, 1.13, zb + 0.06, { rx: 0.2, outline: false });
    part(g, cyl(0.04, 0.035, 0.1, 14), '#e0f7fa', 0.25, 1.15, zb + 0.08);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const tz = zb + 0.08 + Math.sin(a) * 0.018;
      const tx = 0.25 + Math.cos(a) * 0.018;
      part(g, cyl(0.006, 0.006, 0.2, 6), ['#e53935', '#43a047', '#1e88e5', '#fdd835', '#ab47bc'][i], tx, 1.22, tz, { rz: Math.cos(a) * 0.12, rx: Math.sin(a) * 0.12, outline: false });
    }
    part(g, rbox(0.16, 0.2, 0.06, 0.01), '#cfd8dc', -0.15, 1.2, zb + 0.06, { rx: 0.15 });
    for (let i = 0; i < 2; i++) part(g, box(0.07, 0.15, 0.008), ['#4fc3f7', '#ffb74d'][i], -0.19 + i * 0.08, 1.21, zb + 0.03, { rx: 0.15, outline: false });
    part(g, cyl(0.03, 0.03, 0.13, 12), '#e1f5fe', -0.65, 1.165, zb + 0.1);
    part(g, cyl(0.012, 0.012, 0.03, 8), '#ffffff', -0.65, 1.245, zb + 0.1, { outline: false });
    // The staff's desk in front of it.
    const dz = zb + 0.36;
    const dd = 0.56;
    part(g, rbox(Wd, 0.04, dd, 0.015), '#f6f6f2', 0, h - 0.02, dz);
    part(g, rbox(0.04, h - 0.04, dd - 0.04, 0.01), '#dfe3e6', -(Wd / 2 - 0.04), (h - 0.04) / 2, dz);
    part(g, rbox(0.36, h - 0.06, dd - 0.06, 0.012), '#e8ecef', Wd / 2 - 0.2, (h - 0.06) / 2, dz);
    for (let i = 0; i < 3; i++) part(g, rbox(0.32, 0.17, 0.012, 0.005), tint(c, 0.5), Wd / 2 - 0.2, 0.14 + i * 0.2, dz + dd / 2 - 0.02);
    // The screen with the day's appointments, the keyboard and mouse.
    const mx = 0;
    part(g, rbox(0.2, 0.015, 0.14, 0.006), BLACK, mx, h + 0.008, dz - 0.14);
    part(g, rbox(0.045, 0.2, 0.03, 0.01), BLACK, mx, h + 0.11, dz - 0.17);
    part(g, rbox(0.52, 0.34, 0.03, 0.012), BLACK, mx, h + 0.33, dz - 0.15);
    out.screen = litScreen(g, painted('dt-book', 384, 256, paintBook), 0.49, 0.31, mx, h + 0.33, dz - 0.133);
    const kz = dz + 0.1;
    part(g, rbox(0.38, 0.018, 0.13, 0.006), '#e9ecef', mx, h + 0.009, kz);
    for (let r = 0; r < 4; r++) part(g, box(0.34, 0.004, 0.018), '#c5cbd0', mx, h + 0.02, kz - 0.045 + r * 0.03, { outline: false });
    part(g, rbox(0.05, 0.026, 0.08, 0.012), '#eceff1', mx + 0.27, h + 0.016, kz);
    // The phone, the open diary and a pen, a tooth-shaped mascot.
    part(g, rbox(0.18, 0.05, 0.15, 0.02), '#37474f', -0.6, h + 0.025, dz - 0.05, { rx: -0.15 });
    part(g, rbox(0.04, 0.035, 0.16, 0.015), '#263238', -0.66, h + 0.07, dz - 0.05);
    part(g, box(0.06, 0.004, 0.04), '#80deea', -0.56, h + 0.055, dz - 0.05, { rx: -0.15, outline: false });
    part(g, box(0.3, 0.012, 0.21), '#ffffff', -0.4, h + 0.006, dz + 0.12, { ry: 0.08 });
    part(g, box(0.006, 0.014, 0.21), '#b0bec5', -0.4, h + 0.008, dz + 0.12, { ry: 0.08, outline: false });
    for (let i = 0; i < 5; i++) part(g, box(0.1, 0.002, 0.005), '#90a4ae', -0.47, h + 0.014, dz + 0.05 + i * 0.03, { ry: 0.08, outline: false });
    part(g, cyl(0.005, 0.005, 0.13, 6), '#1e88e5', -0.32, h + 0.016, dz + 0.14, { rz: Math.PI / 2, ry: 0.6, outline: false });
    part(g, ball(0.04), TOOTH, 0.45, h + 0.06, dz - 0.12).scale.set(1.1, 0.9, 1);
    for (const sx of [-1, 1]) {
      part(g, cyl(0.016, 0.008, 0.045, 8), TOOTH, 0.45 + sx * 0.02, h + 0.022, dz - 0.12, { outline: false });
      part(g, ball(0.006), BLACK, 0.45 + sx * 0.014, h + 0.07, dz - 0.085, { outline: false });
    }
    part(g, ring(0.012, 0.003, Math.PI), '#e53935', 0.45, h + 0.052, dz - 0.084, { rx: Math.PI, outline: false });
    // The staff chair; checked in sat typing at the screen.
    const front = dz + dd / 2;
    const seat = deskChair(g, front);
    out.seat = seat;
    out.work = marker(g, mx, h + 0.02, kz);
    const sit = spot(g, 'sit', 0, 0.48, front + 0.2, Math.PI, 0.48);
    out.spots = { '*': at(sit, out.work, 'type') };
  },

  /**
   * A panoramic X-ray: the column on its base, the arm reaching out from its carriage with the
   * rotating unit hung under it (the tube head on one side, the sensor on the other, swinging round
   * the patient's head while it shoots), the chin rest with its bite block and the two handles under
   * that, the touch panel on the column, the lead apron on its hook and the warning lamp lit while it
   * runs. Worked standing at the panel.
   */
  dtPanoXray(g, _W, D, _c, _def, _ctx, out) {
    const cz = -D / 2 + 0.14;
    const white = '#f5f7f8';
    part(g, rbox(0.5, 0.04, 0.4, 0.015), '#cfd8dc', 0, 0.02, cz + 0.1);
    part(g, rbox(0.18, 2.0, 0.16, 0.04), white, 0, 1.02, cz);
    part(g, box(0.06, 1.6, 0.008), '#b0bec5', 0, 1.0, cz + 0.082, { outline: false });
    label(g, 'PANORAMA', 0.15, 0.04, 0, 1.92, cz + 0.083, white, '#1565c0');
    // The carriage and the arm out over the head; the rotating unit under it.
    part(g, rbox(0.24, 0.24, 0.24, 0.04), white, 0, 1.78, cz + 0.06);
    part(g, rbox(0.16, 0.1, 0.46, 0.04), white, 0, 1.86, cz + 0.36);
    const hz = cz + 0.48;
    part(g, cyl(0.05, 0.05, 0.06, 16), '#90a4ae', 0, 1.79, hz, { outline: false });
    const rotor = new THREE.Group();
    rotor.position.set(0, 1.76, hz);
    g.add(rotor);
    part(rotor, rbox(0.62, 0.06, 0.12, 0.03), white, 0, 0, 0);
    part(rotor, rbox(0.15, 0.32, 0.16, 0.04), white, -0.28, -0.18, 0);
    part(rotor, box(0.01, 0.1, 0.1), '#ffca28', -0.205, -0.22, 0, { outline: false });
    label(rotor, 'X-RAY', 0.1, 0.035, -0.28, -0.08, 0.081, white, '#f9a825');
    part(rotor, rbox(0.05, 0.3, 0.14, 0.02), '#37474f', 0.29, -0.17, 0);
    part(rotor, box(0.006, 0.22, 0.1), '#90caf9', 0.263, -0.17, 0, { outline: false });
    out.animate = (t) => {
      rotor.rotation.y = Math.sin(t * 0.5) * 1.6;
    };
    // The chin rest on its bar, the bite block, the handles either side; the temple guides above.
    part(g, rbox(0.12, 0.08, 0.36, 0.03), white, 0, 1.22, cz + 0.27);
    part(g, rbox(0.5, 0.04, 0.12, 0.02), white, 0, 1.22, hz);
    for (const sx of [-1, 1]) {
      part(g, cyl(0.016, 0.016, 0.18, 10), '#90a4ae', sx * 0.22, 1.3, hz);
      part(g, cyl(0.022, 0.022, 0.14, 10), '#37474f', sx * 0.22, 1.33, hz, { outline: false });
      part(g, rbox(0.02, 0.1, 0.05, 0.01), '#b0bec5', sx * 0.08, 1.56, hz);
    }
    part(g, cyl(0.045, 0.035, 0.03, 14), '#90a4ae', 0, 1.26, hz + 0.02);
    part(g, cyl(0.006, 0.006, 0.07, 6), '#e0f7fa', 0, 1.3, hz + 0.02, { outline: false });
    part(g, box(0.012, 0.012, 0.03), '#4fc3f7', 0, 1.34, hz + 0.02, { outline: false });
    // The touch panel on the column's right, turned out.
    const pan = new THREE.Group();
    pan.position.set(0.14, 1.32, cz + 0.06);
    pan.rotation.y = 0.7;
    g.add(pan);
    part(pan, rbox(0.16, 0.12, 0.03, 0.01), '#37474f', 0, 0, 0);
    part(pan, box(0.04, 0.03, 0.06), '#90a4ae', -0.06, 0, -0.03, { outline: false });
    out.screen = litScreen(pan, painted('dt-pano', 192, 128, paintPanoPanel), 0.14, 0.1, 0, 0, 0.016);
    // The lead apron hanging on the column's left, the warning lamp on top.
    part(g, cyl(0.008, 0.008, 0.08, 6), CHROME, -0.13, 1.5, cz, { rz: Math.PI / 2, outline: false });
    part(g, rbox(0.04, 0.5, 0.3, 0.02), '#1565c0', -0.18, 1.24, cz + 0.06);
    part(g, rbox(0.045, 0.1, 0.14, 0.02), '#0d47a1', -0.18, 1.48, cz + 0.06);
    part(g, rbox(0.1, 0.06, 0.06, 0.02), '#424242', 0, 2.06, cz);
    const use = new THREE.Group();
    g.add(use);
    glowing(use, box(0.08, 0.04, 0.062), '#ff5252', 0, 2.06, cz);
    out.inUse = use;
    const panel = marker(g, 0.15, 1.32, cz + 0.09);
    out.work = panel;
    out.spots = { '*': at(spot(g, 'stand', 0.52, 0, -0.08, Math.atan2(-0.36, -0.22)), panel, 'type') };
  },

  /**
   * An intraoral scanner on its cart: the five-star base, the post, the screen with the scanned arch
   * turning in colour (lit while it's used), the keyboard shelf, the wand in its cradle with its
   * cable and a box of tip covers. Gone over standing at it, the wand in hand on the keyboard.
   */
  dtOralScanner(g, _W, _D, _c, _def, _ctx, out) {
    starBase(g, 0, -0.05, 0.28, '#b0bec5');
    part(g, cyl(0.03, 0.03, 0.82, 12), '#eceff1', 0, 0.5, -0.05, { outline: false });
    part(g, rbox(0.46, 0.03, 0.3, 0.01), '#fafafa', 0, 0.92, 0.0);
    part(g, rbox(0.34, 0.016, 0.11, 0.006), '#e9ecef', -0.03, 0.944, 0.06);
    for (let r = 0; r < 3; r++) part(g, box(0.3, 0.004, 0.018), '#c5cbd0', -0.03, 0.953, 0.03 + r * 0.03, { outline: false });
    // The wand in its cradle at the right, its cable down; the tip covers.
    part(g, rbox(0.06, 0.06, 0.08, 0.015), '#37474f', 0.19, 0.965, -0.05);
    part(g, cyl(0.016, 0.02, 0.2, 12), '#f5f5f5', 0.19, 1.04, -0.04, { rx: 0.35 });
    part(g, cyl(0.017, 0.017, 0.02, 12), '#26c6da', 0.19, 1.0, -0.052, { rx: 0.35, outline: false });
    rod(g, new THREE.Vector3(0.19, 0.94, -0.08), new THREE.Vector3(0.24, 0.6, -0.1), 0.006, '#cfd8dc');
    rod(g, new THREE.Vector3(0.24, 0.6, -0.1), new THREE.Vector3(0.03, 0.5, -0.07), 0.006, '#cfd8dc');
    part(g, rbox(0.09, 0.05, 0.06, 0.008), '#b3e5fc', -0.17, 0.96, -0.08);
    // The screen.
    part(g, cyl(0.02, 0.02, 0.3, 10), '#eceff1', 0, 1.08, -0.1, { outline: false });
    const mon = new THREE.Group();
    mon.position.set(0, 1.3, -0.09);
    mon.rotation.x = -0.1;
    g.add(mon);
    part(mon, rbox(0.52, 0.34, 0.035, 0.014), BLACK, 0, 0, 0);
    out.screen = litScreen(mon, painted('dt-scan', 384, 256, paintScan), 0.49, 0.31, 0, 0, 0.019);
    part(g, box(0.44, 0.08, 0.01), '#fafafa', 0, 0.87, 0.148, { outline: false });
    label(g, '구강 스캐너', 0.22, 0.05, 0, 0.87, 0.155, '#fafafa', '#00838f');
    const keys = marker(g, -0.03, 0.96, 0.06);
    out.work = keys;
    out.spots = { '*': at(spot(g, 'stand', 0, 0, 0.5, Math.PI), keys, 'type') };
  },

  /**
   * A giant molar on a pedestal in the waiting room, smiling, with its roots in pink gum, and the
   * giant toothbrush beside it in its holder; the sign under it says how often. The lesson is given
   * stood beside it, turned out to the waiting room, pointing back at the tooth.
   */
  dtToothModel(g, _W, _D, _c, _def, _ctx, out) {
    const px = -0.08;
    part(g, cyl(0.24, 0.27, 0.05, 24), '#80deea', px, 0.025, -0.05);
    part(g, cyl(0.17, 0.2, 0.72, 24), '#fafafa', px, 0.41, -0.05);
    part(g, cyl(0.2, 0.2, 0.04, 24), '#4dd0e1', px, 0.79, -0.05);
    label(g, '하루 3번 · 3분!', 0.24, 0.065, px, 0.5, 0.155, '#fafafa', '#00838f');
    // The gum, the roots into it, the crown with its four cusps, the face.
    const ty = 0.81;
    part(g, cyl(0.17, 0.19, 0.08, 22), GUM, px, ty + 0.04, -0.05);
    const crown = new THREE.Group();
    crown.position.set(px, ty + 0.08, -0.05);
    g.add(crown);
    for (const sx of [-1, 1]) part(crown, cyl(0.06, 0.035, 0.12, 14), TOOTH, sx * 0.07, 0.04, 0, { rz: sx * 0.15 });
    part(crown, ball(0.18), TOOTH, 0, 0.2, 0).scale.set(1, 0.85, 0.9);
    for (const [x, z] of [[-0.08, -0.06], [0.08, -0.06], [-0.08, 0.06], [0.08, 0.06]]) part(crown, ball(0.08), TOOTH, x, 0.33, z);
    for (const sx of [-1, 1]) {
      part(crown, ball(0.018), BLACK, sx * 0.06, 0.24, 0.155, { outline: false });
      part(crown, ball(0.006), '#ffffff', sx * 0.06 + 0.006, 0.25, 0.172, { outline: false });
      part(crown, ball(0.025), '#f8bbd0', sx * 0.11, 0.19, 0.14, { outline: false }).scale.set(1, 0.6, 0.4);
    }
    part(crown, ring(0.04, 0.008, Math.PI), '#e53935', 0, 0.2, 0.158, { rx: Math.PI, outline: false });
    // The giant toothbrush in its holder at the right.
    const bx = 0.3;
    part(g, cyl(0.06, 0.07, 0.04, 16), '#80deea', bx, 0.02, -0.15);
    part(g, cyl(0.045, 0.05, 0.36, 16), '#e0f7fa', bx, 0.2, -0.15);
    const brush = new THREE.Group();
    brush.position.set(bx, 0.25, -0.15);
    brush.rotation.z = 0.12;
    g.add(brush);
    part(brush, cyl(0.025, 0.03, 0.9, 12), '#26a69a', 0, 0.45, 0);
    part(brush, rbox(0.06, 0.04, 0.06, 0.015), '#26a69a', 0, 0.92, 0.02);
    part(brush, rbox(0.06, 0.18, 0.02, 0.01), '#26a69a', 0, 1.02, 0.04);
    for (let i = 0; i < 4; i++) part(brush, box(0.05, 0.035, 0.06), i % 2 ? '#ffffff' : '#4fc3f7', 0, 0.95 + i * 0.04, 0.085, { outline: false });
    // Taught stood at its right, turned half to the waiting room, the hand back at the tooth.
    const tooth = marker(crown, 0, 0.22, 0.12);
    out.work = tooth;
    out.spots = { '*': at(spot(g, 'stand', 0.36, 0, 0.36, 0.35), tooth, 'present') };
  },

  /**
   * The waiting room's board: how to brush in four steps, a gallery of patients' smiles and the
   * check-up star, framed in the clinic's teal; a little shelf under it of toothbrush and floss
   * samples. Off a wall it stands on two posts.
   */
  dtSmileBoard(g, W, D, _c, _def, ctx) {
    const wall = ctx.againstWall;
    const zb = -D / 2 + (wall ? 0.02 : 0.2);
    const y = 1.5;
    const w = Math.min(W - 0.2, 1.7);
    const h = w / 2;
    if (!wall) for (const sx of [-1, 1]) part(g, rbox(0.05, y, 0.05, 0.01), '#90a4ae', sx * (w / 2 - 0.1), y / 2, zb + 0.03);
    part(g, rbox(w + 0.08, h + 0.08, 0.04, 0.02), '#00acc1', 0, y, zb + 0.02);
    picture(g, painted('dt-smile', 768, 384, paintSmile), w, h, 0, y, zb + 0.042);
    // The sample shelf under it.
    const sy = y - h / 2 - 0.12;
    part(g, rbox(0.7, 0.025, 0.12, 0.01), '#fafafa', 0, sy, zb + 0.06);
    for (const sx of [-1, 1]) part(g, box(0.02, 0.06, 0.08), '#b0bec5', sx * 0.3, sy - 0.04, zb + 0.04, { outline: false });
    for (let i = 0; i < 4; i++) {
      part(g, rbox(0.05, 0.2, 0.012, 0.006), '#ffffff', -0.28 + i * 0.07, sy + 0.11, zb + 0.07, { rx: -0.08 });
      part(g, cyl(0.006, 0.006, 0.16, 6), ['#e53935', '#1e88e5', '#43a047', '#ab47bc'][i], -0.28 + i * 0.07, sy + 0.11, zb + 0.078, { outline: false });
    }
    for (let i = 0; i < 3; i++) {
      part(g, rbox(0.06, 0.05, 0.06, 0.015), ['#80deea', '#ffffff', '#a5d6a7'][i], 0.1 + i * 0.08, sy + 0.04, zb + 0.07);
      part(g, cyl(0.012, 0.012, 0.004, 10), '#90a4ae', 0.1 + i * 0.08, sy + 0.067, zb + 0.07, { outline: false });
    }
  },
  /**
   * 진료 체어 칸막이 (2026-11-05, the layout audit): the low partition between two chairs of the open 진료실, running front to back
   * the length of a chair: a white panel to waist height on its feet, a band of frosted glass over it, an aluminium cap. A patient
   * lying back sees nothing of the next chair; the dentist and the hygienists see over it.
   */
  dtPartition(g, _W, D) {
    const L = D - 0.1;
    for (const z of [-L / 2, L / 2]) part(g, rbox(0.2, 0.03, 0.08, 0.01), '#b0bec5', 0, 0.015, z);
    part(g, rbox(0.06, 0.95, L, 0.015), '#f5f7f8', 0, 0.5, 0);
    part(g, box(0.07, 0.03, L + 0.01), '#cfd8dc', 0, 0.06, 0, { outline: false });
    glass(g, box(0.02, 0.42, L - 0.04), 0, 1.19, 0, FROST);
    for (const z of [-L / 2, L / 2]) part(g, box(0.05, 0.44, 0.03), '#cfd8dc', 0, 1.19, z, { outline: false });
    part(g, box(0.07, 0.03, L + 0.02), '#cfd8dc', 0, 1.415, 0, { outline: false });
  },
  /**
   * 상담 테이블 (2026-11-06): the 상담실's table where the coordinator goes over the plan — a white top on two slab legs, the printed
   * 치료 계획서 with the estimate turned to the patient's side, a pen, a small jaw model to show what's to be done, a box of tissues.
   */
  dtConsultTable(g, W, D) {
    const top = 0.72;
    part(g, rbox(W - 0.08, 0.04, D - 0.12, 0.015), '#fafafa', 0, top - 0.02, 0);
    for (const sx of [-1, 1]) part(g, rbox(0.05, top - 0.04, D - 0.3, 0.01), '#cfd8dc', sx * (W / 2 - 0.2), (top - 0.04) / 2, 0);
    part(g, box(W - 0.5, 0.03, 0.03), '#cfd8dc', 0, 0.2, 0, { outline: false });
    const plan = picture(g, painted('dtPlanSheet', 180, 256, paintPlanSheet), 0.21, 0.3, -0.25, top + 0.003, 0.08);
    plan.rotation.set(-Math.PI / 2, 0, Math.PI);
    part(g, cyl(0.005, 0.005, 0.14, 6), '#1565c0', -0.05, top + 0.006, 0.12, { rz: Math.PI / 2, ry: 0.3, outline: false });
    // The jaw model: pink gums, a row of white teeth.
    const jaw = new THREE.Group();
    jaw.position.set(0.3, top, -0.05);
    g.add(jaw);
    part(jaw, rbox(0.14, 0.03, 0.1, 0.015), '#f48fb1', 0, 0.015, 0);
    for (let i = 0; i < 6; i++) part(jaw, rbox(0.018, 0.022, 0.018, 0.005), ENAMEL, -0.05 + i * 0.02, 0.04, 0.03 - Math.abs(i - 2.5) * 0.008, { outline: false });
    part(g, rbox(0.12, 0.07, 0.12, 0.01), '#80cbc4', 0.65, top + 0.035, -0.12);
    part(g, box(0.04, 0.02, 0.02), '#ffffff', 0.65, top + 0.08, -0.12, { outline: false });
  },
  dtStreetSign: pavementSign('dtStreetSign', '🦷', '바른이|치과', ['임플란트 · 교정', '스케일링 · 소아치과', '진료 9:30 ~ 18:30'], '#00838f'),
};

/** The printed 치료 계획서: the clinic's name, the teeth to be treated on a little chart, the estimate. */
const paintPlanSheet: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 180, 256);
  c.fillStyle = '#00838f';
  c.fillRect(0, 0, 180, 30);
  c.fillStyle = '#ffffff';
  c.font = 'bold 15px sans-serif';
  c.fillText('치료 계획서', 12, 21);
  c.fillStyle = '#37474f';
  c.font = '11px sans-serif';
  c.fillText('바른이치과 상담실', 12, 48);
  c.strokeStyle = '#90a4ae';
  for (let i = 0; i < 8; i++) {
    c.strokeRect(14 + i * 19, 62, 16, 18);
    c.strokeRect(14 + i * 19, 84, 16, 18);
  }
  c.fillStyle = '#ef5350';
  c.fillRect(15 + 2 * 19, 63, 14, 16);
  c.fillRect(15 + 6 * 19, 85, 14, 16);
  c.fillStyle = '#37474f';
  ['#26 신경치료', '#46 크라운', '스케일링'].forEach((t, i) => c.fillText(t, 14, 128 + i * 18));
  c.fillRect(14, 190, 152, 1);
  c.font = 'bold 12px sans-serif';
  c.fillText('예상 비용 합계', 14, 212);
  c.fillText('₩ 1,050,000', 80, 236);
};

const FROST = new THREE.MeshToonMaterial({ color: '#eef6f8', transparent: true, opacity: 0.72, depthWrite: false });

/**
 * A clinic's pole sign on the pavement (2026-11-05, the layout audit: the clinics on a street of shops, not on a lawn): a lightbox on a
 * pole, its face the same both sides, the mark, the name, what's done there; a weighted foot. Shared by the clinics' lots (the 약국,
 * the 한의원, the 재활센터, the 상담센터). `name` is broken into lines at `|`. The names are made up.
 */
export function pavementSign(key: string, mark: string, name: string, lines: string[], colour: string, tall = 2.0): Builder {
  return (g) => {
    const tex = painted(key, 192, 448, (c) => {
      c.fillStyle = colour;
      c.fillRect(0, 0, 192, 448);
      c.fillStyle = '#ffffff';
      c.fillRect(10, 10, 172, 428);
      c.fillStyle = colour;
      c.beginPath();
      c.arc(96, 74, 48, 0, Math.PI * 2);
      c.fill();
      text(c, mark, 96, 76, mark.length > 1 ? 50 : 60, '#ffffff', 'center', mark.length > 1 ? false : true);
      // The name down the panel, broken where `|` says, as big as the longest line lets it be.
      const rows = name.split('|');
      const size = Math.min(40, Math.floor(160 / Math.max(...rows.map((r) => r.length))));
      rows.forEach((r, i) => text(c, r, 96, 164 + i * (size + 10), size, colour, 'center'));
      const y0 = 164 + rows.length * (size + 10) + 16;
      lines.forEach((l, i) => text(c, l, 96, y0 + i * 32, Math.min(18, Math.floor(160 / (l.length * 0.85))), '#37474f', 'center', false));
    });
    const h = 0.95;
    const pole = tall - h;
    const y = pole + h / 2;
    part(g, rbox(0.36, 0.06, 0.26, 0.02), '#546e7a', 0, 0.03, 0);
    part(g, cyl(0.03, 0.03, pole, 10), '#90a4ae', 0, pole / 2 + 0.03, 0, { outline: false });
    part(g, rbox(0.44, h, 0.12, 0.02), colour, 0, y, 0);
    picture(g, tex, 0.38, h - 0.06, 0, y, 0.062);
    picture(g, tex, 0.38, h - 0.06, 0, y, -0.062, '#ffffff', Math.PI);
  };
}
