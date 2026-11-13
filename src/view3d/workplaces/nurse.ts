import * as THREE from 'three';
import { marker, rod, spot, type Builder } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import {
  BAG, BLACK, CHROME, ENAMEL, STEEL, TEAL, WATER, caster, dripBag, glass, glowing, label, litScreen, painted, picture, ring, starBase, text, type Paint,
} from './doctor';

/**
 * The ward drawn as itself (2026-10-26 workplace pipeline, at the user's request): what the nurses'
 * side of the hospital was missing (workFurniture/nurse.ts) — the nurses' station, the medication
 * cart, an IV pole, the linen cart, the hand-wash basin and a wheelchair. The beds, the computer and
 * the medicine cabinet the nurse shares with the doctor are drawn in workplaces/doctor.ts.
 */

const NURSE_TEAL = '#4db6ac';
const MINT = '#e0f2f1';

// ---------------------------------------------------------------------------------------------
// What's painted on the screens and the signs.

/** The nursing record: the ward's patients down the left, today's vitals and the drug times. */
const paintNursing: Paint = (c) => {
  c.fillStyle = '#f3f7f8';
  c.fillRect(0, 0, 512, 320);
  c.fillStyle = TEAL;
  c.fillRect(0, 0, 512, 30);
  text(c, '간호기록 · 5병동', 12, 16, 16, '#ffffff');
  text(c, '근무: 데이', 500, 16, 13, '#e0f2f1', 'right');
  c.fillStyle = '#ffffff';
  c.fillRect(6, 38, 150, 276);
  c.fillStyle = '#b2dfdb';
  c.fillRect(6, 38, 150, 22);
  text(c, '병실 · 환자', 14, 50, 12, '#004d40');
  const beds: Array<[string, string, string]> = [['501-1', '김○○', '#43a047'], ['501-2', '이○○', '#fdd835'], ['502-1', '박○○', '#43a047'], ['502-2', '최○○', '#e53935'], ['503-1', '정○○', '#43a047'], ['503-2', '강○○', '#43a047']];
  beds.forEach(([bed, who, k], i) => {
    const y = 76 + i * 38;
    if (i === 3) {
      c.fillStyle = '#e0f2f1';
      c.fillRect(6, y - 17, 150, 36);
    }
    c.fillStyle = k;
    c.beginPath();
    c.arc(20, y, 6, 0, Math.PI * 2);
    c.fill();
    text(c, bed, 32, y - 6, 12, '#37474f');
    text(c, who, 32, y + 9, 12, '#263238', 'left', false);
  });
  // Vitals through the day.
  c.fillStyle = '#ffffff';
  c.fillRect(164, 38, 342, 150);
  c.fillStyle = '#b2dfdb';
  c.fillRect(164, 38, 342, 22);
  text(c, '502-2 최○○ · 활력 징후', 172, 50, 12, '#004d40');
  const cols = ['06시', '10시', '14시', '18시'];
  const rows: Array<[string, string[], string?]> = [['혈압', ['132/84', '128/80', '146/92', '']], ['맥박', ['82', '78', '96', '']], ['체온', ['36.9', '37.2', '38.1', ''], '#e53935'], ['SpO₂', ['97', '98', '95', '']]];
  cols.forEach((h, j) => text(c, h, 262 + j * 62, 72, 11, '#546e7a', 'center'));
  rows.forEach(([k, v, hi], i) => {
    const y = 96 + i * 22;
    text(c, k, 172, y, 12, '#37474f');
    v.forEach((s, j) => text(c, s || '—', 262 + j * 62, y, 12, j === 2 && hi ? hi : '#263238', 'center', false));
  });
  // Today's drugs and the next ones due.
  c.fillStyle = '#ffffff';
  c.fillRect(164, 196, 342, 118);
  c.fillStyle = '#b2dfdb';
  c.fillRect(164, 196, 342, 22);
  text(c, '투약 일정', 172, 208, 12, '#004d40');
  const meds: Array<[string, string, string]> = [['세프트리악손 1g IV', '14:00', '완료'], ['아세트아미노펜 650mg PO', '15:00', '예정'], ['헤파린 5000U SC', '18:00', '예정']];
  meds.forEach(([m, t, s], i) => {
    const y = 234 + i * 26;
    text(c, m, 172, y, 12, '#263238');
    text(c, t, 410, y, 12, '#546e7a', 'center', false);
    c.fillStyle = s === '완료' ? '#c8e6c9' : '#fff3e0';
    c.fillRect(448, y - 10, 50, 20);
    text(c, s, 473, y, 11, s === '완료' ? '#2e7d32' : '#e65100', 'center');
  });
};

/** The call-bell board: a light a bed, one calling. */
const paintCalls: Paint = (c) => {
  c.fillStyle = '#10181c';
  c.fillRect(0, 0, 384, 192);
  text(c, '환자 호출', 12, 16, 15, '#80cbc4');
  text(c, '● 502-2', 372, 16, 15, '#ff5252', 'right');
  const rooms = ['501-1', '501-2', '502-1', '502-2', '503-1', '503-2', '504-1', '504-2', '505', '506', '화장실', '샤워실'];
  rooms.forEach((r, i) => {
    const x = 10 + (i % 4) * 92;
    const y = 36 + Math.floor(i / 4) * 50;
    const on = r === '502-2';
    c.fillStyle = on ? '#d32f2f' : '#263238';
    c.fillRect(x, y, 84, 42);
    text(c, r, x + 42, y + 21, 16, on ? '#ffffff' : '#78909c', 'center');
  });
};

/** The drug chart on the cart's laptop: who gets what on this round, ticked off. */
const paintEmar: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 320, 200);
  c.fillStyle = '#0277bd';
  c.fillRect(0, 0, 320, 26);
  text(c, '투약 기록 eMAR · 14시', 10, 14, 13, '#ffffff');
  const rows: Array<[string, string, boolean]> = [['501-1', '암로디핀 5mg', true], ['501-2', '메트포르민 500mg', true], ['502-1', '세파졸린 1g IV', false], ['502-2', '아세트아미노펜', false], ['503-1', '판토프라졸 40mg', false]];
  rows.forEach(([bed, drug, done], i) => {
    const y = 44 + i * 30;
    if (i % 2) {
      c.fillStyle = '#f1f8fb';
      c.fillRect(0, y - 15, 320, 30);
    }
    text(c, bed, 10, y, 12, '#37474f');
    text(c, drug, 66, y, 12, '#263238', 'left', false);
    c.strokeStyle = done ? '#43a047' : '#b0bec5';
    c.lineWidth = 2;
    c.strokeRect(286, y - 9, 18, 18);
    if (done) text(c, '✓', 295, y + 1, 16, '#43a047', 'center');
  });
};

/** The six steps of washing hands, over the basin. */
const paintHandSteps: Paint = (c) => {
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 256, 320);
  c.fillStyle = '#0288d1';
  c.fillRect(0, 0, 256, 48);
  text(c, '올바른 손 씻기 6단계', 128, 25, 20, '#ffffff', 'center');
  const steps = ['손바닥과 손바닥', '손등과 손바닥', '손바닥 깍지 끼고', '손가락 마주 잡고', '엄지 돌려 주기', '손톱 밑 문지르기'];
  steps.forEach((s, i) => {
    const x = (i % 2) * 128;
    const y = 56 + Math.floor(i / 2) * 84;
    c.fillStyle = '#e1f5fe';
    c.fillRect(x + 6, y + 4, 116, 76);
    c.fillStyle = '#ffccbc';
    c.beginPath();
    c.ellipse(x + 46, y + 38, 18, 24, -0.4, 0, Math.PI * 2);
    c.ellipse(x + 78, y + 38, 18, 24, 0.4, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#0288d1';
    c.beginPath();
    c.arc(x + 20, y + 18, 11, 0, Math.PI * 2);
    c.fill();
    text(c, String(i + 1), x + 20, y + 19, 13, '#ffffff', 'center');
    text(c, s, x + 64, y + 70, 12, '#263238', 'center');
  });
};

// ---------------------------------------------------------------------------------------------
// The pieces.

export const BUILDERS: Record<string, Builder> = {
  /**
   * The nurses' station: a long counter, high and teal on the visitors' side with the 간호사실 sign
   * and a ledge (a sign-in clipboard, the hand gel, a bell), and on the nurses' side a desk under it
   * with the nursing record on two screens, the phone, the binders of charts in their rack at the
   * left end and the call-bell board at the right — a bed's light red while it's answered. Charted
   * sat at the desk; a call answered stood at the board.
   */
  nsNurseStation(g, W, D, c, _def, _ctx, out) {
    const L = W - 0.08;
    const zb = -D / 2 + 0.14;
    const hiH = 1.12;
    // The high wall on the visitors' side, its ledge and the sign.
    part(g, rbox(L, hiH, 0.1, 0.02), c, 0, hiH / 2, zb);
    part(g, box(L + 0.002, 0.08, 0.102), '#00796b', 0, 0.05, zb, { outline: false });
    part(g, box(L + 0.002, 0.03, 0.102), '#ffffff', 0, 0.78, zb, { outline: false });
    part(g, rbox(L + 0.06, 0.04, 0.34, 0.012), '#f6f6f2', 0, hiH + 0.02, zb - 0.06);
    part(g, rbox(1.3, 0.2, 0.012, 0.01), '#ffffff', 0, 0.48, zb - 0.056, { outline: false });
    label(g, '간호사실 · Nurse Station', 1.24, 0.15, 0, 0.48, zb - 0.064, '#ffffff', TEAL, Math.PI);
    for (const sx of [-1, 1]) {
      part(g, rbox(0.5, 0.14, 0.012, 0.01), MINT, sx * 1.0, 0.48, zb - 0.056, { outline: false });
      label(g, sx < 0 ? '5병동' : '면회 접수', 0.46, 0.11, sx * 1.0, 0.48, zb - 0.064, MINT, '#00695c', Math.PI);
    }
    // On the ledge: the visitors' sign-in clipboard, the hand gel, the desk bell, a little plant.
    const ly = hiH + 0.04;
    const lz = zb - 0.1;
    part(g, rbox(0.24, 0.012, 0.32, 0.006), '#8d6e63', 0.55, ly + 0.006, lz, { ry: 0.15 });
    part(g, box(0.21, 0.004, 0.27), '#ffffff', 0.55, ly + 0.014, lz + 0.01, { ry: 0.15, outline: false });
    for (let i = 0; i < 6; i++) part(g, box(0.16, 0.002, 0.006), '#90a4ae', 0.55, ly + 0.017, lz - 0.08 + i * 0.035, { ry: 0.15, outline: false });
    part(g, rbox(0.09, 0.03, 0.02, 0.006), CHROME, 0.55, ly + 0.02, lz - 0.14, { ry: 0.15 });
    part(g, cyl(0.035, 0.035, 0.16, 14), '#e1f5fe', -0.5, ly + 0.08, lz);
    part(g, cyl(0.012, 0.012, 0.04, 8), '#ffffff', -0.5, ly + 0.18, lz, { outline: false });
    part(g, box(0.06, 0.012, 0.014), '#ffffff', -0.47, ly + 0.2, lz, { outline: false });
    part(g, cyl(0.045, 0.05, 0.012, 16), '#455a64', 0.1, ly + 0.006, lz);
    part(g, ball(0.035), CHROME, 0.1, ly + 0.025, lz, { outline: false });
    part(g, cyl(0.04, 0.032, 0.08, 12), '#ffffff', -1.15, ly + 0.04, lz);
    for (const [dx, dz] of [[0, 0], [0.03, 0.02], [-0.03, 0.01]] as const) part(g, ball(0.035), '#66bb6a', -1.15 + dx, ly + 0.11, lz + dz, { outline: false });
    // The desk on the nurses' side.
    const h = 0.74;
    const dz0 = zb + 0.05;
    const dd = 0.56;
    const dz = dz0 + dd / 2;
    const front = dz0 + dd;
    part(g, rbox(L, 0.04, dd, 0.015), '#f6f6f2', 0, h - 0.02, dz);
    part(g, box(L - 0.01, 0.014, 0.012), NURSE_TEAL, 0, h - 0.03, front + 0.001, { outline: false });
    for (const sx of [-1, 1]) part(g, rbox(0.04, h - 0.04, dd - 0.04, 0.01), '#dfe3e6', sx * (L / 2 - 0.03), (h - 0.04) / 2, dz);
    // A drawer pedestal under each end.
    for (const px of [-L / 2 + 0.26, L / 2 - 0.26]) {
      part(g, rbox(0.4, h - 0.06, dd - 0.06, 0.012), '#e8ecef', px, (h - 0.06) / 2, dz);
      for (let i = 0; i < 3; i++) {
        const y = 0.14 + i * 0.2;
        part(g, rbox(0.36, 0.17, 0.012, 0.005), MINT, px, y, front - 0.024);
        part(g, box(0.12, 0.012, 0.02), '#78909c', px, y + 0.05, front - 0.012, { outline: false });
      }
    }
    const top = h;
    // Two screens of the nursing record, side by side, the left one lit while it's charted at.
    const mx = -0.15;
    for (const [x, ry] of [[mx, 0], [mx + 0.56, -0.25]] as const) {
      const m = new THREE.Group();
      m.position.set(x, top, zb + 0.2);
      m.rotation.y = ry;
      g.add(m);
      part(m, rbox(0.2, 0.015, 0.14, 0.006), BLACK, 0, 0.008, 0);
      part(m, rbox(0.045, 0.2, 0.03, 0.01), BLACK, 0, 0.11, -0.03);
      part(m, rbox(0.5, 0.32, 0.03, 0.012), BLACK, 0, 0.34, -0.01);
      if (ry === 0) out.screen = litScreen(m, painted('nursing', 512, 320, paintNursing), 0.47, 0.29, 0, 0.34, 0.006);
      else picture(m, painted('nursing', 512, 320, paintNursing), 0.47, 0.29, 0, 0.34, 0.006, '#b7c4cc');
    }
    // Keyboard, mouse, the phone, a pen cup, a mug.
    const kz = front - 0.15;
    part(g, rbox(0.38, 0.018, 0.13, 0.006), '#e9ecef', mx, top + 0.009, kz);
    for (let r = 0; r < 4; r++) part(g, box(0.34, 0.004, 0.018), '#c5cbd0', mx, top + 0.02, kz - 0.045 + r * 0.03, { outline: false });
    part(g, rbox(0.05, 0.026, 0.08, 0.012), '#eceff1', mx + 0.28, top + 0.013, kz);
    part(g, rbox(0.2, 0.05, 0.18, 0.02), '#37474f', 0.62, top + 0.025, kz - 0.02, { ry: -0.2 });
    part(g, rbox(0.2, 0.04, 0.06, 0.02), '#263238', 0.6, top + 0.07, kz - 0.08, { ry: -0.2 });
    for (let i = 0; i < 6; i++) part(g, box(0.025, 0.006, 0.02), '#b0bec5', 0.58 + (i % 3) * 0.035, top + 0.053, kz - 0.0 + Math.floor(i / 3) * 0.03, { outline: false });
    part(g, cyl(0.03, 0.027, 0.09, 12), '#455a64', -0.6, top + 0.045, zb + 0.18);
    for (const [dx, k] of [[-0.01, '#1e88e5'], [0.01, '#e53935'], [0, '#263238']] as const) part(g, cyl(0.004, 0.004, 0.13, 6), k, -0.6 + dx, top + 0.1, zb + 0.18 + dx, { rz: dx * 8, outline: false });
    part(g, cyl(0.04, 0.035, 0.1, 14), '#ffffff', -0.48, top + 0.05, front - 0.12);
    part(g, ring(0.03, 0.008, Math.PI), '#ffffff', -0.44, top + 0.05, front - 0.12, { ry: Math.PI / 2, rz: -Math.PI / 2, outline: false });
    // The chart binders in their slotted rack at the left end, colour-tabbed by room.
    const rx = -L / 2 + 0.24;
    part(g, rbox(0.36, 0.3, 0.3, 0.012), '#b0bec5', rx, top + 0.15, zb + 0.24);
    for (let i = 0; i < 7; i++) {
      const x = rx - 0.15 + i * 0.05;
      part(g, rbox(0.035, 0.26, 0.26, 0.006), ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#fb8c00', '#00897b'][i], x, top + 0.17, zb + 0.24);
      part(g, box(0.036, 0.04, 0.012), '#ffffff', x, top + 0.24, zb + 0.375, { outline: false });
    }
    // The call-bell board at the right end, under the ledge; the calling bed lit while it's answered.
    const bx = L / 2 - 0.32;
    const by = 1.0;
    const bz = -0.04;
    part(g, rbox(0.12, 0.012, 0.1, 0.005), BLACK, bx, top + 0.006, bz - 0.02);
    part(g, rbox(0.04, by - top - 0.1, 0.03, 0.01), BLACK, bx, (by + top - 0.1) / 2, bz - 0.03);
    part(g, rbox(0.46, 0.26, 0.03, 0.012), '#37474f', bx, by, bz);
    picture(g, painted('calls', 384, 192, paintCalls), 0.42, 0.21, bx, by, bz + 0.017, '#a0a8ac');
    const call = new THREE.Group();
    g.add(call);
    picture(call, painted('calls', 384, 192, paintCalls), 0.42, 0.21, bx, by, bz + 0.019);
    glowing(call, ball(0.025), '#ff5252', bx + 0.26, by + 0.12, bz + 0.02);
    out.inUse = call;
    // The nurse's chair.
    const cz = front + 0.2;
    const ch = new THREE.Group();
    ch.position.set(mx, 0, cz);
    ch.rotation.y = Math.PI;
    g.add(ch);
    starBase(ch, 0, 0, 0.24, BLACK);
    part(ch, cyl(0.026, 0.026, 0.3, 10), CHROME, 0, 0.27, 0, { outline: false });
    part(ch, rbox(0.46, 0.08, 0.44, 0.04), NURSE_TEAL, 0, 0.44, 0);
    rod(ch, new THREE.Vector3(0, 0.44, -0.18), new THREE.Vector3(0, 0.62, -0.23), 0.02, BLACK);
    part(ch, rbox(0.42, 0.34, 0.05, 0.04), NURSE_TEAL, 0, 0.8, -0.24, { rx: -0.1 });
    out.seat = marker(g, mx, 0.48, cz);
    out.work = marker(g, mx, top + 0.02, kz);
    // The call answered stood at the board, a finger to the lit bed.
    const answer = spot(g, 'stand', bx, 0, front + 0.2, Math.PI);
    answer.work = marker(g, bx - 0.02, by + 0.02, bz + 0.03);
    answer.motion = 'board';
    out.spots = { nsAnswerCall: answer };
  },

  /**
   * The medication cart: a white body on casters with a drawer for each bed (numbered) in the ward's
   * blue, a push handle at its side, the round's pill cups in a tray on top beside a laptop of the
   * drug chart (lit while it's used), a sharps bin clipped on, a pill crusher, the hand gel and a box
   * of gloves. Got ready stood at it, hands at the tray.
   */
  nsMedCabinetCart(g, _W, _D, c, _def, _ctx, out) {
    const w = 0.66;
    const d = 0.48;
    const z = -0.06;
    const H = 0.9;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) caster(g, sx * (w / 2 - 0.06), z + sz * (d / 2 - 0.06), 0.045);
    part(g, rbox(w, 0.06, d, 0.02), '#b0bec5', 0, 0.13, z);
    part(g, rbox(w, H - 0.16, d, 0.025), ENAMEL, 0, 0.16 + (H - 0.16) / 2, z);
    const zf = z + d / 2;
    // A drawer a bed: four rows of three, numbered.
    const beds = ['501', '502', '503', '504', '505', '506', '507', '508', '509', '510', '511', '512'];
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 3; k++) {
        const x = -0.2 + k * 0.2;
        const y = H - 0.12 - r * 0.16;
        part(g, rbox(0.18, 0.14, 0.014, 0.008), r === 3 ? '#0288d1' : c, x, y, zf + 0.004);
        part(g, box(0.08, 0.01, 0.02), '#eceff1', x, y - 0.04, zf + 0.014, { outline: false });
        label(g, beds[r * 3 + k], 0.08, 0.035, x, y + 0.025, zf + 0.012, '#ffffff', '#01579b');
      }
    part(g, rbox(w - 0.04, 0.2, 0.014, 0.01), '#cfd8dc', 0, 0.3, zf + 0.004);
    label(g, '투약 카트', 0.22, 0.06, 0, 0.3, zf + 0.012, '#cfd8dc', '#37474f');
    // The top, a rim round it; the push handle at its left.
    const top = H + 0.02;
    part(g, rbox(w + 0.04, 0.04, d + 0.04, 0.015), '#eceff1', 0, H, z);
    for (const sx of [-1, 1]) part(g, box(0.012, 0.03, d), '#cfd8dc', sx * (w / 2 + 0.01), top + 0.01, z, { outline: false });
    part(g, box(w, 0.03, 0.012), '#cfd8dc', 0, top + 0.01, z - d / 2 - 0.01, { outline: false });
    for (const dz of [-0.15, 0.15]) rod(g, new THREE.Vector3(-w / 2, H - 0.05, z + dz), new THREE.Vector3(-w / 2 - 0.1, H - 0.05, z + dz), 0.012, CHROME);
    rod(g, new THREE.Vector3(-w / 2 - 0.1, H - 0.05, z - 0.16), new THREE.Vector3(-w / 2 - 0.1, H - 0.05, z + 0.16), 0.016, '#90a4ae');
    // The laptop open at the back left, the drug chart on it.
    const lap = new THREE.Group();
    lap.position.set(-0.12, top, z - 0.04);
    g.add(lap);
    part(lap, rbox(0.34, 0.016, 0.24, 0.008), '#455a64', 0, 0.008, 0);
    part(lap, box(0.3, 0.002, 0.12), '#263238', 0, 0.017, 0.03, { outline: false });
    const lid = new THREE.Group();
    lid.position.set(0, 0.016, -0.12);
    lid.rotation.x = -0.25;
    lap.add(lid);
    part(lid, rbox(0.34, 0.22, 0.012, 0.008), '#455a64', 0, 0.11, 0);
    out.screen = litScreen(lid, painted('emar', 320, 200, paintEmar), 0.31, 0.19, 0, 0.11, 0.008);
    // The round's pill cups in their tray at the front right.
    const tx = 0.12;
    const tz = z + 0.12;
    part(g, rbox(0.24, 0.025, 0.16, 0.008), '#4fc3f7', tx, top + 0.013, tz);
    const pills = ['#ffffff', '#ffb74d', '#e57373', '#81c784', '#fff176', '#ffffff'];
    for (let i = 0; i < 6; i++) {
      const x = tx - 0.07 + (i % 3) * 0.07;
      const pz = tz - 0.035 + Math.floor(i / 3) * 0.07;
      part(g, cyl(0.022, 0.016, 0.035, 12), '#fafafa', x, top + 0.04, pz);
      part(g, ball(0.007), pills[i], x, top + 0.055, pz, { outline: false });
    }
    // A pill crusher, the gloves, the hand gel; the sharps bin clipped to the right side.
    part(g, cyl(0.03, 0.03, 0.05, 12), '#ffffff', 0.27, top + 0.025, z + 0.14);
    part(g, rbox(0.02, 0.012, 0.09, 0.005), '#90a4ae', 0.27, top + 0.06, z + 0.11, { rx: 0.4 });
    part(g, rbox(0.16, 0.08, 0.1, 0.01), '#bbdefb', 0.2, top + 0.04, z - 0.14);
    part(g, box(0.06, 0.004, 0.04), '#ffffff', 0.2, top + 0.082, z - 0.14, { outline: false });
    part(g, cyl(0.025, 0.025, 0.12, 12), '#e1f5fe', 0.3, top + 0.06, z - 0.02);
    part(g, cyl(0.01, 0.01, 0.03, 8), '#ffffff', 0.3, top + 0.135, z - 0.02, { outline: false });
    part(g, rbox(0.1, 0.16, 0.14, 0.012), '#fdd835', w / 2 + 0.06, H - 0.1, z + 0.04);
    part(g, rbox(0.105, 0.03, 0.145, 0.01), '#e53935', w / 2 + 0.06, H - 0.005, z + 0.04);
    part(g, box(0.02, 0.06, 0.1), '#90a4ae', w / 2 + 0.005, H - 0.1, z + 0.04, { outline: false });
    // Got ready stood at its front, the hands at the tray.
    const at = spot(g, 'stand', 0.04, 0, zf + 0.34, Math.PI);
    at.work = marker(g, tx, top + 0.05, tz);
    at.motion = 'tinker';
    out.work = at.work;
    out.spots = { '*': at };
  },

  /**
   * An IV pole: a five-legged base on casters, a chrome pole with a four-hook crown, a saline bag and
   * an antibiotic on it with their drip chambers and lines down through the infusion pump (its
   * screen lit while it's seen to) to the bed at its left, a basket of flushes clipped on. A bag
   * changed stood at it, the hands up at the drip chamber.
   */
  nsIvPole(g, _W, _D, _c, _def, _ctx, out) {
    const pz = -0.15;
    const px = -0.1;
    starBase(g, px, pz, 0.27);
    part(g, cyl(0.016, 0.016, 1.78, 10), CHROME, px, 0.97, pz, { outline: false });
    part(g, ball(0.02), CHROME, px, 1.87, pz, { outline: false });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const hx = px + Math.cos(a) * 0.13;
      const hz = pz + Math.sin(a) * 0.13;
      rod(g, new THREE.Vector3(px, 1.84, pz), new THREE.Vector3(hx, 1.84, hz), 0.007, CHROME);
      part(g, ring(0.016, 0.004, Math.PI), CHROME, hx, 1.825, hz, { outline: false });
    }
    // The bags, their lines down into the pump.
    const pump = new THREE.Vector3(px, 1.2, pz + 0.07);
    dripBag(g, px - 0.09, 1.68, pz + 0.09, pump.clone().add(new THREE.Vector3(-0.03, 0.08, 0)));
    dripBag(g, px + 0.09, 1.66, pz + 0.09, pump.clone().add(new THREE.Vector3(0.03, 0.08, 0)), '#fff9c4');
    label(g, 'N/S 1L', 0.06, 0.03, px - 0.09, 1.71, pz + 0.107, '#ffffff', '#1565c0');
    // The pump clamped on, its screen and keys; the line out of it to the bed.
    part(g, rbox(0.2, 0.24, 0.13, 0.025), '#f5f5f5', px, 1.1, pz + 0.04);
    part(g, rbox(0.16, 0.06, 0.006, 0.006), BLACK, px, 1.16, pz + 0.107, { outline: false });
    out.screen = litScreen(g, painted('pump', 128, 48, (cx) => {
      cx.fillStyle = '#062a30';
      cx.fillRect(0, 0, 128, 48);
      text(cx, '100 mL/h', 64, 18, 18, '#80deea', 'center');
      text(cx, 'VTBI 820', 64, 38, 12, '#4dd0e1', 'center', false);
    }), 0.15, 0.055, px, 1.16, pz + 0.111);
    for (let i = 0; i < 3; i++) part(g, cyl(0.011, 0.011, 0.008, 8), ['#43a047', '#eceff1', '#e53935'][i], px - 0.05 + i * 0.05, 1.06, pz + 0.108, { rx: Math.PI / 2, outline: false });
    part(g, box(0.06, 0.08, 0.02), '#90a4ae', px, 1.1, pz - 0.035, { outline: false });
    rod(g, new THREE.Vector3(px - 0.1, 1.02, pz + 0.06), new THREE.Vector3(-0.42, 0.92, pz + 0.1), 0.004, '#eceff1');
    rod(g, new THREE.Vector3(-0.42, 0.92, pz + 0.1), new THREE.Vector3(-0.62, 0.78, 0.05), 0.004, '#eceff1');
    // A basket of saline flushes lower down.
    part(g, box(0.18, 0.08, 0.12), '#b0bec5', px, 0.72, pz + 0.02);
    for (let i = 0; i < 4; i++) part(g, cyl(0.009, 0.009, 0.12, 8), '#ffffff', px - 0.06 + i * 0.04, 0.78, pz + 0.02, { rz: 0.2 });
    // Changed stood at its front, the hands up at the bags' drip chambers.
    const at = spot(g, 'stand', px + 0.02, 0, 0.42, Math.PI);
    at.work = marker(g, px, 1.5, pz + 0.09);
    at.motion = 'tinker';
    out.work = at.work;
    out.spots = { '*': at };
  },

  /**
   * The clean-linen cart: a steel frame on casters with three shelves — folded sheets, pale blue
   * gowns, towels and pillowcases — under a blue cover that's down when it's left and rolled up on
   * top while it's sorted, the soiled-linen hamper bag on its ring at the side. Sorted stood at it.
   */
  nsLinenRack(g, _W, _D, _c, _def, _ctx, out) {
    const w = 0.7;
    const d = 0.46;
    const z = -0.06;
    const H = 1.35;
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        caster(g, sx * (w / 2 - 0.05), z + sz * (d / 2 - 0.05), 0.045);
        part(g, cyl(0.014, 0.014, H - 0.1, 8), STEEL, sx * (w / 2 - 0.02), 0.1 + (H - 0.1) / 2, z + sz * (d / 2 - 0.02), { outline: false });
      }
    const levels = [0.18, 0.58, 0.98, H];
    for (const y of levels) part(g, rbox(w, 0.02, d, 0.008), '#cfd8dc', 0, y, z);
    // What's on the shelves.
    const stack = (x: number, y: number, n: number, color: string, stripe?: string, wd = 0.28) => {
      for (let i = 0; i < n; i++) {
        part(g, rbox(wd, 0.05, 0.34, 0.015), color, x, y + 0.035 + i * 0.052, z + 0.01);
        if (stripe) part(g, box(wd + 0.002, 0.008, 0.342), stripe, x, y + 0.035 + i * 0.052, z + 0.01, { outline: false });
      }
    };
    stack(-0.16, levels[0], 6, '#ffffff', '#b2dfdb');
    stack(0.16, levels[0], 5, '#ffffff', '#b2dfdb');
    stack(-0.16, levels[1], 5, '#bbdefb', '#90caf9');
    stack(0.16, levels[1], 4, '#e1f5fe');
    stack(-0.17, levels[2], 4, '#fafafa', '#4db6ac', 0.24);
    stack(0.12, levels[2], 6, '#e0f2f1', undefined, 0.2);
    label(g, '청결 린넨', 0.26, 0.07, 0, H + 0.11, z + d / 2 - 0.02, '#1565c0', '#ffffff');
    part(g, rbox(0.3, 0.1, 0.02, 0.01), '#1565c0', 0, H + 0.11, z + d / 2 - 0.03);
    // The cover: down over the front when it's left; rolled up on top while it's used.
    const cover = new THREE.Group();
    g.add(cover);
    const coverMat = new THREE.MeshToonMaterial({ color: '#64b5f6', transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide });
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.04, H - 0.06), coverMat);
    sheet.userData.ownGeometry = sheet.userData.ownMaterial = true;
    sheet.position.set(0, 0.1 + (H - 0.06) / 2, z + d / 2 + 0.02);
    sheet.renderOrder = 2;
    cover.add(sheet);
    part(cover, box(w + 0.04, 0.03, 0.02), '#1976d2', 0, 0.12, z + d / 2 + 0.025, { outline: false });
    out.idle = cover;
    const rolled = new THREE.Group();
    g.add(rolled);
    part(rolled, cyl(0.05, 0.05, w + 0.04, 14), '#64b5f6', 0, H + 0.06, z + d / 2 - 0.03, { rz: Math.PI / 2 });
    out.inUse = rolled;
    // The soiled-linen hamper on its ring at the right.
    const hx = w / 2 + 0.18;
    part(g, ring(0.15, 0.012), STEEL, hx, 0.85, z, { rx: Math.PI / 2, outline: false });
    rod(g, new THREE.Vector3(w / 2, 0.85, z), new THREE.Vector3(hx - 0.15, 0.85, z), 0.012, STEEL);
    part(g, cyl(0.15, 0.12, 0.55, 16), '#fdd835', hx, 0.57, z);
    part(g, ring(0.155, 0.02), '#fbc02d', hx, 0.83, z, { rx: Math.PI / 2, outline: false });
    label(g, '사용 린넨', 0.14, 0.05, hx, 0.6, z + 0.151, '#fdd835', '#5d4037');
    // Sorted stood at its front, a hand in on the middle shelf.
    const at = spot(g, 'stand', 0, 0, z + d / 2 + 0.4, Math.PI);
    at.work = marker(g, -0.1, levels[1] + 0.2, z + 0.12);
    at.motion = 'rummage';
    out.work = at.work;
    out.spots = { '*': at };
  },

  /**
   * The hand-wash basin by the door: a white ceramic basin on its bracket under a sensor tap (the
   * water running while it's used), a pedal bin under, the soap and the alcohol gel and the paper
   * towels on the wall round it, the six steps of handwashing pinned up and a mirror. Washed at it,
   * the hands rubbing over the basin.
   */
  nsHandSink(g, _W, D, _c, _def, ctx, out) {
    const wz = -D / 2 + (ctx.againstWall ? 0.03 : 0.08);
    // A tiled backboard (on a post when it isn't against a wall).
    if (!ctx.againstWall) {
      part(g, rbox(0.4, 0.04, 0.25, 0.012), '#90a4ae', 0, 0.02, wz + 0.05);
      part(g, rbox(0.06, 0.6, 0.04, 0.012), '#cfd8dc', 0, 0.32, wz - 0.01);
    }
    part(g, rbox(0.9, 1.3, 0.025, 0.01), '#e0f7fa', 0, 1.15, wz);
    for (let i = 1; i < 6; i++) part(g, box(0.9, 0.006, 0.004), '#b2ebf2', 0, 0.5 + i * 0.22, wz + 0.014, { outline: false });
    // The basin on its bracket, the drain, the tap with its sensor eye.
    const by = 0.82;
    const bz = wz + 0.27;
    part(g, box(0.06, 0.12, 0.16), '#cfd8dc', 0, by - 0.12, wz + 0.09, { outline: false });
    part(g, cyl(0.24, 0.17, 0.16, 24), '#fafafa', 0, by, bz);
    part(g, cyl(0.21, 0.21, 0.01, 24), '#cfd8dc', 0, by + 0.075, bz, { outline: false });
    part(g, cyl(0.025, 0.025, 0.004, 12), '#78909c', 0, by + 0.082, bz, { outline: false });
    part(g, rbox(0.08, 0.05, 0.05, 0.015), '#b0bec5', 0, by + 0.25, wz + 0.04);
    rod(g, new THREE.Vector3(0, by + 0.25, wz + 0.05), new THREE.Vector3(0, by + 0.3, wz + 0.16), 0.014, CHROME);
    rod(g, new THREE.Vector3(0, by + 0.3, wz + 0.16), new THREE.Vector3(0, by + 0.22, wz + 0.21), 0.014, CHROME);
    glowing(g, ball(0.006), '#ef5350', 0.03, by + 0.25, wz + 0.066);
    const water = new THREE.Group();
    g.add(water);
    const stream = new THREE.Mesh(cyl(0.007, 0.011, 0.14, 8), WATER);
    stream.position.set(0, by + 0.15, wz + 0.21);
    stream.renderOrder = 2;
    water.add(stream);
    out.inUse = water;
    // The soap at the left, the gel at the right, the paper towels beyond it.
    for (const [x, k, s] of [[-0.28, '#f48fb1', '물비누'], [0.24, '#80deea', '손 소독제']] as const) {
      part(g, rbox(0.12, 0.2, 0.09, 0.015), '#ffffff', x, 1.12, wz + 0.06);
      glass(g, box(0.07, 0.08, 0.004), x, 1.13, wz + 0.107, BAG);
      part(g, box(0.06, 0.06, 0.004), k, x, 1.13, wz + 0.106, { outline: false });
      part(g, rbox(0.06, 0.02, 0.05, 0.008), '#90a4ae', x, 1.01, wz + 0.08);
      label(g, s, 0.11, 0.035, x, 1.25, wz + 0.106, '#ffffff', '#00838f');
    }
    part(g, rbox(0.26, 0.3, 0.12, 0.02), ENAMEL, 0.32, 1.52, wz + 0.07);
    part(g, box(0.18, 0.02, 0.06), '#ffffff', 0.32, 1.36, wz + 0.1, { outline: false });
    part(g, box(0.14, 0.06, 0.004), '#ffffff', 0.32, 1.33, wz + 0.13, { rx: 0.3, outline: false });
    // The steps and a small mirror.
    picture(g, painted('handSteps', 256, 320, paintHandSteps), 0.3, 0.38, -0.28, 1.58, wz + 0.016);
    part(g, rbox(0.2, 0.26, 0.015, 0.01), '#cfd8dc', 0.02, 1.48, wz + 0.016);
    part(g, box(0.17, 0.23, 0.004), '#cfe7ef', 0.02, 1.48, wz + 0.025, { outline: false });
    // The pedal bin under it.
    part(g, cyl(0.12, 0.11, 0.36, 16), '#eceff1', 0.3, 0.18, wz + 0.16);
    part(g, cyl(0.125, 0.125, 0.03, 16), '#b0bec5', 0.3, 0.37, wz + 0.16);
    part(g, box(0.08, 0.015, 0.06), '#78909c', 0.3, 0.02, wz + 0.29, { outline: false });
    // Washed stood at it, the hands rubbing over the basin.
    const at = spot(g, 'stand', 0, 0, wz + 0.72, Math.PI);
    at.work = marker(g, 0, by + 0.12, bz + 0.02);
    at.motion = 'scrub';
    out.work = at.work;
    out.spots = { '*': at };
  },

  /**
   * A wheelchair parked ready: two big rear wheels with their push rims and spokes, small casters at
   * the front, a navy sling seat and back, padded arms, the footrests folded down, push handles with
   * black grips, the hospital's name on the back.
   */
  nsWheelchair(g, _W, _D, c, _def, _ctx, out) {
    const sw = 0.44;
    const seatY = 0.48;
    const rz = -0.12;
    // Rear wheels: tyre, push rim, spokes, hub.
    for (const sx of [-1, 1]) {
      const x = sx * (sw / 2 + 0.06);
      const wheel = new THREE.Group();
      wheel.position.set(x, 0.3, rz);
      wheel.rotation.y = Math.PI / 2;
      g.add(wheel);
      part(wheel, ring(0.28, 0.02), '#263238', 0, 0, 0, { outline: false });
      part(wheel, ring(0.26, 0.008), '#90a4ae', 0, 0, 0, { outline: false });
      part(wheel, ring(0.24, 0.008), CHROME, 0, 0, sx * 0.03, { outline: false });
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        rod(wheel, new THREE.Vector3(0, 0, 0), new THREE.Vector3(Math.cos(a) * 0.26, Math.sin(a) * 0.26, 0), 0.003, '#b0bec5');
      }
      part(wheel, cyl(0.035, 0.035, 0.05, 12), '#455a64', 0, 0, 0, { rx: Math.PI / 2 });
      // The frame down that side: the seat rail, the back post with its handle, the front post.
      const sx2 = sx * (sw / 2);
      rod(g, new THREE.Vector3(sx2, seatY - 0.02, rz - 0.04), new THREE.Vector3(sx2, seatY - 0.02, 0.24), 0.013, STEEL);
      rod(g, new THREE.Vector3(sx2, 0.3, rz), new THREE.Vector3(sx2, 0.95, rz - 0.08), 0.013, STEEL);
      rod(g, new THREE.Vector3(sx2, 0.95, rz - 0.08), new THREE.Vector3(sx2, 0.97, rz - 0.2), 0.013, STEEL);
      part(g, cyl(0.018, 0.018, 0.1, 10), BLACK, sx2, 0.97, rz - 0.22, { rx: Math.PI / 2 });
      rod(g, new THREE.Vector3(sx2, seatY - 0.02, 0.22), new THREE.Vector3(sx2, 0.12, 0.26), 0.013, STEEL);
      rod(g, new THREE.Vector3(sx2, 0.3, rz), new THREE.Vector3(sx2, 0.12, 0.26), 0.011, STEEL);
      // The front caster, the footrest.
      part(g, box(0.02, 0.06, 0.03), STEEL, sx2, 0.1, 0.27, { outline: false });
      part(g, cyl(0.06, 0.06, 0.025, 14), BLACK, sx2, 0.06, 0.29, { rz: Math.PI / 2 });
      rod(g, new THREE.Vector3(sx2, seatY - 0.05, 0.22), new THREE.Vector3(sx * 0.12, 0.14, 0.38), 0.011, STEEL);
      part(g, rbox(0.15, 0.015, 0.12, 0.005), '#37474f', sx * 0.1, 0.13, 0.4, { rx: -0.1 });
      // The arm and its pad.
      rod(g, new THREE.Vector3(sx2, seatY, rz + 0.02), new THREE.Vector3(sx2, 0.7, rz + 0.04), 0.011, STEEL);
      rod(g, new THREE.Vector3(sx2, seatY, 0.14), new THREE.Vector3(sx2, 0.7, 0.12), 0.011, STEEL);
      part(g, rbox(0.06, 0.04, 0.32, 0.015), BLACK, sx2, 0.72, 0.05);
    }
    // The sling seat and back, the name on the back.
    part(g, rbox(sw, 0.04, 0.42, 0.015), c, 0, seatY, 0.08);
    part(g, rbox(sw, 0.42, 0.03, 0.012), c, 0, 0.72, rz - 0.07, { rx: -0.12 });
    label(g, '종합병원', 0.2, 0.05, 0, 0.8, rz - 0.095, c, '#ffffff', Math.PI);
    out.seat = marker(g, 0, seatY + 0.03, 0.08);
  },

  /** The lifts: two steel doors set in the wall, the frame round each, the floor over it, the call buttons between. */
  nsElevator(g, W, D, c) {
    const zb = -D / 2 + 0.04;
    const dw = W / 2 - 0.18;
    for (const sx of [-1, 1]) {
      const x = (sx * W) / 4;
      // The frame and the two leaves, the seam down the middle.
      part(g, box(dw + 0.12, 2.18, 0.06), '#78909c', x, 1.09, zb);
      part(g, box(dw / 2 - 0.01, 2.06, 0.03), c, x - dw / 4, 1.03, zb + 0.04);
      part(g, box(dw / 2 - 0.01, 2.06, 0.03), c, x + dw / 4, 1.03, zb + 0.04);
      part(g, box(0.006, 2.06, 0.032), '#546e7a', x, 1.03, zb + 0.045, { outline: false });
      // The floor display over the door.
      part(g, box(0.34, 0.12, 0.02), BLACK, x, 2.28, zb + 0.03);
      label(g, sx < 0 ? '5 ▲' : '3 ▼', 0.3, 0.09, x, 2.28, zb + 0.042, BLACK, '#ffb300');
    }
    // The call buttons between the doors, and the floor guide.
    part(g, rbox(0.1, 0.22, 0.02, 0.008), STEEL, 0, 1.1, zb + 0.03);
    part(g, cyl(0.025, 0.025, 0.012, 12), '#eceff1', 0, 1.15, zb + 0.045, { rx: Math.PI / 2 });
    part(g, cyl(0.025, 0.025, 0.012, 12), '#eceff1', 0, 1.05, zb + 0.045, { rx: Math.PI / 2 });
    label(g, '5병동 · 엘리베이터', 0.5, 0.12, 0, 2.45, zb + 0.035, MINT, '#00695c');
  },
};
