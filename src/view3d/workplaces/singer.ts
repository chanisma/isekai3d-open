import * as THREE from 'three';
import { STUDIO_EAR, WHITE_KEY, scaleNote, toolPhase, type Motion } from '../activity';
import { marker, rod, shade, spot, type Builder, type Spot } from '../parts';
import { ball, box, canvasTexture, cyl, gradient, part, rbox } from '../toon';

/**
 * The recording studio and concert hall drawn as itself (2026-10-27 workplace pipeline, at the user's
 * request). The vocal booth's mic is a large-diaphragm condenser in its spider mount behind a pop
 * filter, a reflection filter round it, raised to the singer's mouth; the singer has the headphones on
 * (the cue box on the stand, its lead to the cup), the left hand pressing a cup to the ear, the lyric
 * sheet on a music stand to the right with its breath marks and highlighter, the eyes shut on the long
 * note (activity.ts singBeat). The practice piano is an upright with its keys, pedals, metronome and
 * the warm-up scale on the desk: stood at the keys the singer plays the five notes up and down as
 * they're sung, a key higher each time (the keys go down under the finger), takes a lesson by its end,
 * reads an aria's diction, or sits at the bench for a masterclass. The lyric desk is a songwriter's
 * corner: the notebook filling in line by line, the laptop with the beat, the cork board, a guitar.
 * And what it was missing: the booth's foam and diffuser, the glass between booth and control room
 * (each side painted with the room beyond), the platinum records over a credenza with the turntable
 * and the music-show trophies, the backstage dressing table with its bulb mirror, the fan-sign table.
 */

const BLACK = '#1d1d22';
const PIANO = '#141418';
const CHROME = '#dfe4e8';
const STEEL = '#9aa3ab';
const BRASS = '#c9a24a';
const WALNUT = '#6d4c41';
const OAK = '#b98d5c';
const PAPER = '#fbf8f1';
const FOAM_A = '#3a3a44';
const FOAM_B = '#6a2c3c';
const WHITE_CAP = '#fafafa';
const FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
const HAND = '"Nanum Pen Script","Malgun Gothic","Apple SD Gothic Neo",cursive';

/** Lit parts (lamps, LEDs, signs): one unlit material a colour, shared. */
const lit = new Map<string, THREE.MeshBasicMaterial>();
function glow(color: string): THREE.MeshBasicMaterial {
  let m = lit.get(color);
  if (!m) lit.set(color, (m = new THREE.MeshBasicMaterial({ color })));
  return m;
}
const GLASS = new THREE.MeshToonMaterial({ color: '#d7eef7', transparent: true, opacity: 0.22, depthWrite: false });
const MESH = new THREE.MeshBasicMaterial({ color: '#15151a', transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide });
const CRYSTAL = new THREE.MeshToonMaterial({ color: '#e3f4ff', transparent: true, opacity: 0.55, depthWrite: false, gradientMap: gradient });

/** Shapes made once (never disposed, like toon.ts's shared geometry). */
const shapes = new Map<string, THREE.BufferGeometry>();
function shape(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let s = shapes.get(key);
  if (!s) shapes.set(key, (s = make()));
  return s;
}
const ring = (r: number, t: number, arc = Math.PI * 2) => shape(`ring${r},${t},${arc.toFixed(3)}`, () => new THREE.TorusGeometry(r, t, 8, 28, arc));
const cone = (r: number, h: number, seg = 12) => shape(`cone${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg));
const disc = (r: number) => shape(`disc${r}`, () => new THREE.CircleGeometry(r, 28));
const UNIT = shape('unit', () => new THREE.CylinderGeometry(1, 1, 1, 8));
/**
 * A square of wedge foam `s` across, `n` ridges running up it, `d` deep: the profile extruded up the
 * wall, its back at z = 0 and the ridges out to +z, centred on the origin.
 */
const wedge = (s: number, n: number, d: number) =>
  shape(`wedge${s},${n},${d}`, () => {
    const sh = new THREE.Shape();
    const w = s / n;
    sh.moveTo(-s / 2, 0);
    for (let i = 0; i < n; i++) {
      sh.lineTo(-s / 2 + i * w, d * 0.35);
      sh.lineTo(-s / 2 + (i + 0.5) * w, d);
    }
    sh.lineTo(s / 2, d * 0.35);
    sh.lineTo(s / 2, 0);
    sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, { depth: s, bevelEnabled: false });
    geo.rotateX(Math.PI / 2).translate(0, s / 2, 0);
    geo.computeVertexNormals();
    return geo;
  });

/** Pictures painted once a key. */
const paints = new Map<string, THREE.Texture>();
function painted(key: string, cw: number, ch: number, paint: (x: CanvasRenderingContext2D) => void): THREE.Texture {
  let t = paints.get(key);
  if (!t) paints.set(key, (t = canvasTexture(cw, ch, paint)));
  return t;
}
/** A flat picture facing +z (turned by `ry`, tipped by `rx`), always seen in its own colours. */
function sheet(g: THREE.Object3D, tex: THREE.Texture, w: number, h: number, x: number, y: number, z: number, ry = 0, rx = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  m.userData.ownGeometry = m.userData.ownMaterial = true;
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, 0, 'YXZ');
  g.add(m);
  return m;
}
/** Words on a plate, `bg` behind them (or nothing for 'none'). */
function label(g: THREE.Object3D, text: string, w: number, h: number, x: number, y: number, z: number, bg: string, fg: string, ry = 0, rx = 0): THREE.Mesh {
  const ch = 64;
  const cw = Math.max(64, Math.round((ch * w) / h / 16) * 16);
  const tex = painted(`label|${text}|${bg}|${fg}|${cw}`, cw, ch, (c) => {
    if (bg !== 'none') {
      c.fillStyle = bg;
      c.fillRect(0, 0, cw, ch);
    }
    c.fillStyle = fg;
    c.font = `bold ${Math.round(ch * 0.6)}px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, cw / 2, ch * 0.54, cw * 0.94);
  });
  return sheet(g, tex, w, h, x, y, z, ry, rx);
}
/** A group placed and turned in `g`. */
function frame(g: THREE.Object3D, x: number, y: number, z: number, ry = 0, rx = 0, rz = 0): THREE.Group {
  const f = new THREE.Group();
  f.position.set(x, y, z);
  f.rotation.set(rx, ry, rz, 'YXZ');
  g.add(f);
  return f;
}
/** A group in `g` shown only while the piece is used. */
function inUse(g: THREE.Object3D, out: { inUse?: THREE.Object3D }): THREE.Group {
  const use = new THREE.Group();
  g.add(use);
  out.inUse = use;
  return use;
}
/** A group in `g` shown only while the piece isn't used. */
function idle(g: THREE.Object3D, out: { idle?: THREE.Object3D }): THREE.Group {
  const grp = new THREE.Group();
  g.add(grp);
  out.idle = grp;
  return grp;
}
/** A spot stood at (x, z) facing `yaw` (π: at the object, from its front), and what's done there. */
function stoodAt(g: THREE.Object3D, x: number, z: number, motion: Motion, work?: THREE.Object3D, yaw = Math.PI): Spot {
  const s = spot(g, 'stand', x, 0, z, yaw);
  s.work = work;
  s.motion = motion;
  return s;
}
/** A spot sat at (x, z) on a seat `seat` high facing `yaw`, and what's done there. */
function satAt(g: THREE.Object3D, x: number, z: number, motion: Motion, work: THREE.Object3D, seat = 0.47, yaw = Math.PI): Spot {
  const s = spot(g, 'sit', x, seat, z, yaw, seat);
  s.work = work;
  s.motion = motion;
  return s;
}
/** Whether someone's been posed at a spot just now (activity.ts spotPose marks it). */
const posed = (s: Spot, t: number) => Math.abs(t - ((s.at.userData.posedAt as number | undefined) ?? -1e9)) < 0.6;
/** A rod of unit length to stretch between two points each frame (a lead). */
function span(g: THREE.Object3D, r: number, color: string): THREE.Mesh {
  const m = part(g, UNIT, color, 0, 0, 0, { outline: false });
  m.scale.set(r, 1, r);
  return m;
}
const UPV = new THREE.Vector3(0, 1, 0);
const tmpD = new THREE.Vector3();
function stretch(m: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3) {
  tmpD.subVectors(b, a);
  const len = tmpD.length();
  m.position.addVectors(a, b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(UPV, tmpD.divideScalar(len || 1));
  m.scale.y = len;
}
/** A lead sagging from `a` to `b` in a few straight pieces. */
function lead(g: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, sag: number, r = 0.005, color = BLACK) {
  const n = 5;
  let prev = a;
  for (let i = 1; i <= n; i++) {
    const u = i / n;
    const p = a.clone().lerp(b, u);
    p.y -= sag * Math.sin(u * Math.PI);
    rod(g, prev, p, r, color);
    prev = p;
  }
}

// ---- Pictures ----

const LYRICS = ['막차가 떠난 정류장에', '너의 이름을 불러 봐', '대답 없는 밤하늘엔', '별빛만 남아 있어', '기다릴게 여기서', '우리의 계절이 다시 올 때까지~'];

/** The lyric sheet on the booth's stand: the song typed out, marked up in pencil and highlighter. */
const lyricSheetTex = () =>
  painted('lyricSheet', 300, 400, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 300, 400);
    c.fillStyle = '#222';
    c.font = `bold 22px ${FONT}`;
    c.textAlign = 'center';
    c.fillText('별빛 정류장', 150, 38);
    c.font = `12px ${FONT}`;
    c.fillStyle = '#777';
    c.fillText('보컬 디렉팅 v3 · 키 -1', 150, 58);
    c.textAlign = 'left';
    const tags = ['[1절]', '', '', '', '[후렴]', ''];
    LYRICS.forEach((line, i) => {
      const y = 96 + i * 46 + (i >= 4 ? 14 : 0);
      if (tags[i]) {
        c.fillStyle = '#8e24aa';
        c.font = `bold 12px ${FONT}`;
        c.fillText(tags[i], 18, y - 22);
      }
      if (i === 5) {
        c.fillStyle = 'rgba(255,235,59,0.75)';
        c.fillRect(20, y - 18, 262, 26);
      }
      c.fillStyle = '#222';
      c.font = `17px ${FONT}`;
      c.fillText(line, 24, y);
      // Breath marks and pencil notes.
      c.fillStyle = '#5c6bc0';
      c.font = `bold 16px ${FONT}`;
      if (i % 2 === 1) c.fillText('V', 268, y);
    });
    c.fillStyle = '#c62828';
    c.font = `15px ${HAND}`;
    c.fillText('← 가성으로!', 196, 188);
    c.fillText('길~게, 눈 감고', 160, 380);
    c.strokeStyle = '#c62828';
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(118, 334, 98, 18, 0, 0, Math.PI * 2);
    c.stroke();
  });

/** The warm-up on the piano's desk: a five-note scale on the staff, and the plan for the session. */
const scoreTex = () =>
  painted('vocalScore', 420, 280, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 420, 280);
    c.fillStyle = '#222';
    c.font = `bold 18px ${FONT}`;
    c.fillText('발성 연습 — 립트릴 5음계', 18, 30);
    c.font = `12px ${FONT}`;
    c.fillStyle = '#666';
    c.fillText('도레미파솔파미레도 · 반음씩 올리기 · Caro mio ben', 18, 50);
    for (const top of [80, 170]) {
      c.strokeStyle = '#333';
      c.lineWidth = 1;
      for (let l = 0; l < 5; l++) {
        c.beginPath();
        c.moveTo(16, top + l * 9);
        c.lineTo(404, top + l * 9);
        c.stroke();
      }
      c.font = '40px serif';
      c.fillStyle = '#222';
      c.fillText('𝄞', 18, top + 34);
      const seq = [0, 1, 2, 3, 4, 3, 2, 1, 0];
      for (let r = 0; r < 2; r++)
        seq.forEach((n, i) => {
          const x = 70 + r * 170 + i * 17;
          const y = top + 36 - n * 4.5 - r * 4.5;
          c.beginPath();
          c.ellipse(x, y, 5, 3.8, -0.4, 0, Math.PI * 2);
          c.fill();
          c.fillRect(x + 4, y - 26, 1.4, 26);
        });
      c.beginPath();
      c.moveTo(404, top);
      c.lineTo(404, top + 36);
      c.stroke();
    }
    c.fillStyle = '#c62828';
    c.font = `16px ${HAND}`;
    c.fillText('호흡은 배로! 어깨 힘 빼기', 200, 264);
  });

/** A vocal range chart taped up over the piano. */
const rangeTex = () =>
  painted('rangeChart', 300, 220, (c) => {
    c.fillStyle = '#fffdf6';
    c.fillRect(0, 0, 300, 220);
    c.fillStyle = '#311b92';
    c.font = `bold 20px ${FONT}`;
    c.fillText('음역대 체크', 16, 32);
    const rows: Array<[string, number, number, string]> = [
      ['흉성', 30, 150, '#7986cb'],
      ['믹스', 110, 210, '#ba68c8'],
      ['두성', 170, 270, '#f06292'],
      ['휘슬', 240, 285, '#ffb74d'],
    ];
    rows.forEach(([name, a, b, col], i) => {
      const y = 62 + i * 36;
      c.fillStyle = '#444';
      c.font = `14px ${FONT}`;
      c.fillText(name, 12, y + 15);
      c.fillStyle = col;
      c.fillRect(a + 20, y, b - a - 20, 20);
    });
    c.fillStyle = '#666';
    c.font = `12px ${FONT}`;
    c.fillText('C3        C4        C5        C6', 60, 210);
  });

/** A Persian-ish studio rug. */
const rugTex = () =>
  painted('studioRug', 256, 256, (c) => {
    c.fillStyle = '#7b1f24';
    c.fillRect(0, 0, 256, 256);
    c.strokeStyle = '#d9b26f';
    c.lineWidth = 8;
    c.strokeRect(12, 12, 232, 232);
    c.strokeStyle = '#1f3b5c';
    c.lineWidth = 6;
    c.strokeRect(26, 26, 204, 204);
    c.fillStyle = '#1f3b5c';
    c.beginPath();
    c.moveTo(128, 60);
    c.lineTo(196, 128);
    c.lineTo(128, 196);
    c.lineTo(60, 128);
    c.closePath();
    c.fill();
    c.fillStyle = '#d9b26f';
    c.beginPath();
    c.moveTo(128, 88);
    c.lineTo(168, 128);
    c.lineTo(128, 168);
    c.lineTo(88, 128);
    c.closePath();
    c.fill();
    c.fillStyle = '#7b1f24';
    c.beginPath();
    c.arc(128, 128, 14, 0, Math.PI * 2);
    c.fill();
    for (const [x, y] of [[50, 50], [206, 50], [50, 206], [206, 206]]) {
      c.fillStyle = '#d9b26f';
      c.beginPath();
      c.arc(x, y, 9, 0, Math.PI * 2);
      c.fill();
    }
  });

/** A page of the songwriter's notebook: the lyric written so far (`n` lines), with crossings-out. */
const notebookTex = (n: number) =>
  painted(`notebook${n}`, 320, 220, (c) => {
    c.fillStyle = '#fffdf4';
    c.fillRect(0, 0, 320, 220);
    c.strokeStyle = '#b3d4fc';
    c.lineWidth = 1;
    for (let y = 40; y < 220; y += 26) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(320, y);
      c.stroke();
    }
    c.strokeStyle = '#e57373';
    c.beginPath();
    c.moveTo(28, 0);
    c.lineTo(28, 220);
    c.stroke();
    c.fillStyle = '#1a237e';
    c.font = `bold 18px ${HAND}`;
    c.fillText('별빛 정류장 (가제)', 36, 30);
    c.fillStyle = '#263238';
    c.font = `18px ${HAND}`;
    for (let i = 0; i < Math.min(n, LYRICS.length); i++) {
      const y = 62 + i * 26;
      c.fillText(LYRICS[i].replace('~', ''), 36, y);
      if (i === 2) {
        c.strokeStyle = '#263238';
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(220, y - 6);
        c.lineTo(300, y - 6);
        c.stroke();
      }
    }
    if (n >= 3) {
      c.fillStyle = '#7b1fa2';
      c.font = `14px ${HAND}`;
      c.fillText('라임: 밤-봐-남', 220, 210);
    }
  });

/** The beat on the songwriter's laptop: a DAW's tracks and a loop playing. */
const dawTex = () =>
  painted('daw', 256, 160, (c) => {
    c.fillStyle = '#1e2026';
    c.fillRect(0, 0, 256, 160);
    c.fillStyle = '#2c2f38';
    c.fillRect(0, 0, 256, 18);
    c.fillStyle = '#ff5252';
    c.beginPath();
    c.arc(12, 9, 5, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ddd';
    c.font = `10px ${FONT}`;
    c.fillText('별빛정류장_beat_v2 · 84 BPM', 24, 13);
    const cols = ['#4fc3f7', '#81c784', '#ffb74d', '#ba68c8', '#f06292'];
    cols.forEach((col, i) => {
      const y = 26 + i * 26;
      c.fillStyle = '#353945';
      c.fillRect(0, y, 40, 22);
      c.fillStyle = col;
      for (let x = 44; x < 250; x += 52) c.fillRect(x, y + 2, 46 - (i * 7) % 20, 18);
    });
    c.fillStyle = '#fff';
    c.fillRect(150, 22, 2, 134);
  });

/** The cork board over the lyric desk: polaroids and sticky notes. */
const corkTex = () =>
  painted('cork', 400, 250, (c) => {
    c.fillStyle = '#c89f6b';
    c.fillRect(0, 0, 400, 250);
    c.fillStyle = 'rgba(90,60,30,0.25)';
    for (let i = 0; i < 260; i++) c.fillRect((i * 97) % 400, (i * 53) % 250, 2, 2);
    const notes: Array<[number, number, string, string]> = [
      [20, 20, '#fff176', '후렴 다시 쓰기!'],
      [150, 30, '#f8bbd0', '마감: 금요일'],
      [280, 18, '#b2ebf2', '브릿지→고음'],
      [40, 140, '#c5e1a5', '가사 = 진심'],
      [270, 140, '#ffe0b2', '"별빛" 너무 많음'],
    ];
    for (const [x, y, col, t] of notes) {
      c.fillStyle = col;
      c.fillRect(x, y, 108, 80);
      c.fillStyle = '#333';
      c.font = `17px ${HAND}`;
      c.fillText(t, x + 8, y + 44, 96);
    }
    for (const [x, y, rot] of [[160, 130, -0.12], [190, 120, 0.1]]) {
      c.save();
      c.translate(x, y);
      c.rotate(rot);
      c.fillStyle = '#fafafa';
      c.fillRect(0, 0, 80, 96);
      c.fillStyle = '#5c6bc0';
      c.fillRect(6, 6, 68, 66);
      c.fillStyle = '#ffeb3b';
      c.beginPath();
      c.arc(40, 36, 12, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
  });

/** Through the glass from the booth: the control room — the console's faders lit, the monitors, the DAW, the producer giving a thumbs up. */
const controlViewTex = () =>
  painted('viewControl', 400, 250, (c) => {
    const bg = c.createLinearGradient(0, 0, 0, 250);
    bg.addColorStop(0, '#1b1d2b');
    bg.addColorStop(1, '#2a2438');
    c.fillStyle = bg;
    c.fillRect(0, 0, 400, 250);
    // The DAW screens.
    for (const x of [110, 210]) {
      c.fillStyle = '#0d0f14';
      c.fillRect(x, 70, 90, 56);
      c.fillStyle = '#13203a';
      c.fillRect(x + 4, 74, 82, 48);
      for (let i = 0; i < 4; i++) {
        c.fillStyle = ['#4fc3f7', '#81c784', '#ffb74d', '#f06292'][i];
        for (let k = 0; k < 6; k++) c.fillRect(x + 8 + k * 13, 80 + i * 10, 10, 6 - ((k + i) % 3));
      }
    }
    // The monitors either side.
    for (const x of [60, 320]) {
      c.fillStyle = '#111';
      c.fillRect(x, 80, 34, 48);
      c.fillStyle = '#ffca28';
      c.beginPath();
      c.arc(x + 17, 112, 10, 0, Math.PI * 2);
      c.fill();
    }
    // The producer and the engineer, in silhouette.
    c.fillStyle = '#0b0b10';
    c.beginPath();
    c.arc(150, 142, 20, 0, Math.PI * 2);
    c.fill();
    c.fillRect(124, 160, 52, 60);
    c.beginPath();
    c.arc(270, 146, 18, 0, Math.PI * 2);
    c.fill();
    c.fillRect(248, 162, 46, 60);
    // Thumbs up.
    c.fillStyle = '#e0b48c';
    c.fillRect(182, 132, 12, 18);
    c.fillRect(185, 120, 6, 14);
    // The console across the bottom, the faders and their lights.
    c.fillStyle = '#3a3f4b';
    c.beginPath();
    c.moveTo(0, 200);
    c.lineTo(400, 190);
    c.lineTo(400, 250);
    c.lineTo(0, 250);
    c.fill();
    for (let i = 0; i < 34; i++) {
      const x = 8 + i * 11.5;
      c.fillStyle = '#222';
      c.fillRect(x, 212, 3, 30);
      c.fillStyle = '#ddd';
      c.fillRect(x - 2, 216 + ((i * 7) % 18), 7, 4);
      c.fillStyle = i % 5 === 0 ? '#ff5252' : '#69f0ae';
      c.fillRect(x, 204, 3, 3);
    }
  });

/** Through the glass from the control room: the booth — the foam, the warm lamp, a singer at the mic with the headphones on. */
const boothViewTex = () =>
  painted('viewBooth', 400, 250, (c) => {
    c.fillStyle = '#2b2530';
    c.fillRect(0, 0, 400, 250);
    // The foam, a checkerboard of wedges.
    for (let y = 0; y < 5; y++)
      for (let x = 0; x < 8; x++) {
        c.fillStyle = (x + y) % 2 ? '#3d3a46' : '#5a2a38';
        c.fillRect(x * 50, y * 40, 50, 40);
        c.strokeStyle = 'rgba(0,0,0,0.35)';
        for (let k = 0; k < 5; k++) {
          c.beginPath();
          if ((x + y) % 2) {
            c.moveTo(x * 50 + k * 10, y * 40);
            c.lineTo(x * 50 + k * 10, y * 40 + 40);
          } else {
            c.moveTo(x * 50, y * 40 + k * 8);
            c.lineTo(x * 50 + 50, y * 40 + k * 8);
          }
          c.stroke();
        }
      }
    // The warm lamp's glow.
    const gl = c.createRadialGradient(200, 90, 10, 200, 90, 180);
    gl.addColorStop(0, 'rgba(255,214,150,0.55)');
    gl.addColorStop(1, 'rgba(255,214,150,0)');
    c.fillStyle = gl;
    c.fillRect(0, 0, 400, 250);
    // The singer, side on, headphones on, at the mic.
    c.fillStyle = '#1a1420';
    c.beginPath();
    c.arc(230, 112, 24, 0, Math.PI * 2);
    c.fill();
    c.fillRect(204, 134, 54, 116);
    c.strokeStyle = '#111';
    c.lineWidth = 6;
    c.beginPath();
    c.arc(230, 112, 28, Math.PI * 1.05, Math.PI * 1.95);
    c.stroke();
    c.fillStyle = '#111';
    c.fillRect(200, 104, 10, 22);
    // The mic in its mount and the pop filter.
    c.fillStyle = '#c9c9c2';
    c.fillRect(176, 100, 14, 36);
    c.strokeStyle = '#333';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(196, 114, 15, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = '#222';
    c.beginPath();
    c.moveTo(183, 136);
    c.lineTo(140, 150);
    c.lineTo(140, 250);
    c.stroke();
    // The music stand.
    c.fillStyle = '#222';
    c.fillRect(270, 150, 50, 6);
    c.fillStyle = '#fafafa';
    c.fillRect(274, 128, 42, 24);
  });

// ---- Small things ----

/**
 * Closed-back studio headphones, the band arched up over where the head goes and the cups either side
 * of it along x, centred at the ears.
 */
function headphones(g: THREE.Object3D, x: number, y: number, z: number, ry = 0): THREE.Group {
  const h = frame(g, x, y, z, ry);
  const band = part(h, ring(STUDIO_EAR.side + 0.012, 0.009, Math.PI), BLACK, 0, 0.02, 0, { outline: false });
  band.scale.set(1, 1.18, 1);
  part(h, ring(STUDIO_EAR.side - 0.004, 0.012, Math.PI * 0.6), '#5d4037', 0, 0.025, 0, { rz: Math.PI * 0.2, outline: false }).scale.set(1, 1.12, 1);
  for (const sx of [-1, 1]) {
    part(h, box(0.012, 0.06, 0.012), STEEL, sx * (STUDIO_EAR.side + 0.012), 0.02, 0, { outline: false });
    part(h, cyl(0.045, 0.045, 0.034, 16), BLACK, sx * (STUDIO_EAR.side + 0.006), -0.01, 0, { rz: Math.PI / 2 });
    part(h, cyl(0.04, 0.04, 0.014, 16), '#3a3a40', sx * (STUDIO_EAR.side - 0.016), -0.01, 0, { rz: Math.PI / 2, outline: false });
    part(h, cyl(0.03, 0.03, 0.004, 14), '#d7ccc8', sx * (STUDIO_EAR.side + 0.025), -0.01, 0, { rz: Math.PI / 2, outline: false });
  }
  return h;
}

/** A Korean music show's trophy: a golden mic on a stepped base, or a crystal star. */
function trophy(g: THREE.Object3D, x: number, y: number, z: number, crystal: boolean) {
  part(g, rbox(0.11, 0.035, 0.11, 0.008), BLACK, x, y + 0.0175, z);
  part(g, rbox(0.08, 0.03, 0.08, 0.006), crystal ? '#c0c0c0' : BRASS, x, y + 0.05, z);
  if (crystal) {
    const star = part(g, cone(0.06, 0.2, 5), '#e3f4ff', x, y + 0.165, z, { material: CRYSTAL });
    star.rotation.y = 0.3;
  } else {
    part(g, cyl(0.014, 0.02, 0.16, 12), BRASS, x, y + 0.145, z);
    part(g, ball(0.035), '#e6c25a', x, y + 0.245, z);
    part(g, ring(0.036, 0.004), '#a8842e', x, y + 0.235, z, { rx: Math.PI / 2, outline: false });
  }
}

// ---- The pieces ----

export const BUILDERS: Record<string, Builder> = {
  /**
   * The practice piano (연습용 피아노, 2 × 1): a polished black upright — the lid, the music desk
   * with the warm-up scale on it, the fallboard rolled back over the 88 keys (the black keys raised
   * over the white), cheek blocks, the legs and toe blocks, three brass pedals; a metronome ticking,
   * a brass piano lamp, scores, a photo and a pencil on the top; the range chart taped on the wall
   * above; the bench. Stood at the treble keys warming up (the right hand plays the five-note scale,
   * the key going down under the finger, the left on the belly), stood at its end for a lesson, the
   * aria read from the score in both hands, or sat on the bench to accompany a masterclass.
   */
  vocalPiano(g, W, D, _c, _def, _ctx, out) {
    const use = inUse(g, out);
    const bz = -D / 2;
    const pw = Math.min(1.5, W - 0.2);
    const cz = bz + 0.17;
    // The case.
    part(g, rbox(pw, 1.22, 0.3, 0.02), PIANO, 0, 0.61, cz);
    part(g, rbox(pw + 0.03, 0.035, 0.34, 0.012), PIANO, 0, 1.235, cz + 0.01);
    for (const sx of [-1, 1]) part(g, rbox(0.045, 0.95, 0.42, 0.015), PIANO, sx * (pw / 2 - 0.0225), 0.475 + 0.0, bz + 0.21);
    // The lower panel and the legs, the toe blocks, the pedals.
    part(g, box(pw - 0.1, 0.55, 0.02), '#18181d', 0, 0.36, cz + 0.16);
    for (const sx of [-1, 1]) {
      part(g, cyl(0.03, 0.035, 0.6, 12), PIANO, sx * (pw / 2 - 0.06), 0.33, bz + 0.37);
      part(g, rbox(0.07, 0.05, 0.42, 0.012), PIANO, sx * (pw / 2 - 0.06), 0.025, bz + 0.27);
    }
    part(g, rbox(0.3, 0.05, 0.06, 0.01), '#18181d', 0, 0.04, cz + 0.19);
    for (const px of [-0.07, 0, 0.07]) part(g, rbox(0.03, 0.012, 0.09, 0.005), BRASS, px, 0.06, cz + 0.25);
    // The keys: 52 white, 36 black, cheek blocks either side, the key slip in front.
    const kw = 52 * WHITE_KEY;
    const ky = 0.72;
    const kz = bz + 0.41;
    part(g, box(kw + 0.15, 0.04, 0.2), PIANO, 0, ky - 0.04, kz - 0.02);
    const keysTex = painted('pianoKeys', 1040, 64, (c) => {
      c.fillStyle = '#f7f4ec';
      c.fillRect(0, 0, 1040, 64);
      c.strokeStyle = '#9e9a90';
      c.lineWidth = 2;
      for (let i = 1; i < 52; i++) {
        c.beginPath();
        c.moveTo(i * 20, 0);
        c.lineTo(i * 20, 64);
        c.stroke();
      }
    });
    sheet(g, keysTex, kw, 0.15, 0, ky + 0.0005, kz, 0, -Math.PI / 2);
    part(g, box(kw, 0.018, 0.15), '#ece8de', 0, ky - 0.009, kz, { outline: false });
    const keyX = (i: number) => -kw / 2 + (i + 0.5) * WHITE_KEY;
    for (let i = 0; i < 51; i++) {
      if (!'ACDFG'.includes('ABCDEFG'[i % 7])) continue;
      part(g, box(0.012, 0.012, 0.09), '#111114', keyX(i) + WHITE_KEY / 2, ky + 0.006, kz - 0.03, { outline: false });
    }
    for (const sx of [-1, 1]) part(g, rbox(0.06, 0.08, 0.2, 0.01), PIANO, sx * (kw / 2 + 0.035), ky + 0.0, kz - 0.02);
    part(g, rbox(kw, 0.05, 0.015, 0.005), PIANO, 0, ky - 0.03, kz + 0.08);
    // The fallboard rolled back, the brand in gold, the music desk and the score.
    part(g, box(kw, 0.05, 0.05), PIANO, 0, ky + 0.06, cz + 0.17);
    label(g, 'HARMONIA', 0.16, 0.025, 0, ky + 0.07, cz + 0.196, 'none', BRASS);
    part(g, box(kw - 0.2, 0.02, 0.07), PIANO, 0, ky + 0.12, cz + 0.18);
    const score = sheet(g, scoreTex(), 0.42, 0.28, -0.05, ky + 0.27, cz + 0.17, 0, -0.18);
    score.renderOrder = 1;
    sheet(g, scoreTex(), 0.4, 0.27, 0.36, ky + 0.265, cz + 0.168, -0.04, -0.18);
    // On the top: the metronome, the lamp, scores, a photo, a pencil.
    const ty = 1.255;
    const mx = 0.5;
    const mz = cz;
    part(g, cone(0.065, 0.24, 4), '#7b4a2a', mx, ty + 0.12, mz, { ry: Math.PI / 4 });
    part(g, box(0.04, 0.12, 0.002), '#f3e3c3', mx, ty + 0.1, mz + 0.047, { outline: false });
    const pend = frame(g, mx, ty + 0.05, mz + 0.05);
    part(pend, cyl(0.003, 0.003, 0.16, 6), CHROME, 0, 0.08, 0, { outline: false });
    part(pend, box(0.02, 0.02, 0.008), BRASS, 0, 0.12, 0.002, { outline: false });
    // The piano lamp: brass, its shade over the desk.
    const lx = -0.45;
    part(g, cyl(0.05, 0.06, 0.02, 14), BRASS, lx, ty + 0.01, cz - 0.05);
    rod(g, new THREE.Vector3(lx, ty + 0.02, cz - 0.05), new THREE.Vector3(lx, ty + 0.2, cz - 0.05), 0.008, BRASS);
    rod(g, new THREE.Vector3(lx, ty + 0.2, cz - 0.05), new THREE.Vector3(lx + 0.1, ty + 0.22, cz + 0.12), 0.008, BRASS);
    part(g, cyl(0.03, 0.04, 0.18, 16), '#1b5e20', lx + 0.1, ty + 0.2, cz + 0.14, { rz: Math.PI / 2 });
    part(use, cyl(0.028, 0.028, 0.17, 12), '#fff3c4', lx + 0.1, ty + 0.19, cz + 0.14, { rz: Math.PI / 2, outline: false, material: glow('#fff3c4') });
    for (let i = 0; i < 4; i++) part(g, box(0.24, 0.012, 0.32), ['#f3e9d2', '#d7ccc8', '#ffe0b2', '#e1bee7'][i], -0.05 + i * 0.006, ty + 0.006 + i * 0.012, cz - 0.02, { ry: i * 0.05, outline: false });
    const photo = frame(g, 0.25, ty + 0.08, cz - 0.04, -0.2, -0.15);
    part(photo, rbox(0.12, 0.15, 0.015, 0.004), '#c9a24a', 0, 0, 0);
    label(photo, '데뷔 쇼케이스', 0.1, 0.12, 0, 0, 0.009, '#5c6bc0', '#fff');
    part(g, cyl(0.004, 0.004, 0.15, 6), '#ffca28', 0.15, ty + 0.06, cz + 0.11, { rz: Math.PI / 2, ry: 0.4, outline: false });
    // The range chart on the wall above.
    sheet(g, rangeTex(), 0.42, 0.31, -0.48, 1.72, bz + 0.012, 0, 0);
    part(g, box(0.06, 0.02, 0.002), '#fff9c4', -0.48, 1.875, bz + 0.014, { outline: false });
    // The bench, at the bass side of middle.
    const bx = -0.25;
    const bzz = bz + 0.8;
    part(g, rbox(0.7, 0.07, 0.34, 0.02), PIANO, bx, 0.47, bzz);
    part(g, rbox(0.66, 0.035, 0.3, 0.015), '#2b2b30', bx, 0.5, bzz);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.018, 0.016, 0.44, 8), PIANO, bx + sx * 0.3, 0.22, bzz + sz * 0.13, { outline: false });
    // The key the warm-up's on, sunk under the finger.
    const down = part(use, box(WHITE_KEY - 0.002, 0.016, 0.145), '#d9d4c7', 0, ky - 0.006, kz);
    down.visible = false;
    const C5 = 30;
    const scaleAt = marker(g, keyX(C5), ky + 0.012, kz + 0.01);
    const warm = stoodAt(g, 0.33, bz + 0.82, 'vocalScale', scaleAt);
    out.spots = {
      '*': warm,
      vocalWarmup: warm,
      singer_vocalLesson: stoodAt(g, W / 2 - 0.16, bz + 0.78, 'aria', undefined, -1.15),
      singer_ariaDiction: stoodAt(g, 0.33, bz + 0.84, 'read'),
      singer_masterclass: satAt(g, bx, bzz, 'keys', marker(g, bx, ky + 0.01, kz), 0.52),
    };
    out.work = scaleAt;
    const tmp = new THREE.Vector3();
    out.animate = (t) => {
      pend.rotation.z = 0.45 * Math.sin(t * Math.PI * 1.2);
      if (posed(warm, t)) {
        const n = scaleNote(t, toolPhase(warm.at.getWorldPosition(tmp)));
        down.visible = n.down;
        down.position.x = keyX(C5 + n.key);
      } else down.visible = false;
    };
  },

  /**
   * The booth's mic (녹음 마이크, 1 × 1): a large-diaphragm condenser — the champagne body, the
   * grille, the badge — in its spider shock mount on a boom, a reflection filter curved round behind
   * it, a pop filter on its gooseneck in front, all on a heavy stand whose upper tube is raised to
   * the singer's mouth; the XLR lead down the stand to the wall box; the cue box clamped to the stand
   * with the headphones hung on it (on the singer's head while they record, the lead running to the
   * cue box); the music stand turned to the singer with the marked-up lyric sheet; a stool with the
   * honey-lemon tea and a throat spray; the rug. Recording: the left hand on the headphones' cup, the
   * right keeping the line, the eyes shut on the long notes (activity.ts singBeat).
   */
  recordingMic(g, _W, D, _c, _def, _ctx, out) {
    const use = inUse(g, out);
    const off = idle(g, out);
    const bz = -D / 2;
    const sz = 0.26;
    sheet(g, rugTex(), 0.92, 0.92, 0, 0.004, 0.02, 0, -Math.PI / 2);
    // The stand: a heavy round base, the lower tube, the clutch.
    const px = -0.1;
    const pz = bz + 0.16;
    part(g, cyl(0.15, 0.16, 0.03, 24), BLACK, px, 0.015, pz);
    part(g, cyl(0.013, 0.013, 0.9, 10), BLACK, px, 0.47, pz, { outline: false });
    part(g, cyl(0.024, 0.024, 0.04, 10), '#33333a', px, 0.92, pz);
    // Everything above the clutch rides up and down with the upper tube.
    const rig = frame(g, 0, 1.3, 0);
    part(rig, cyl(0.009, 0.009, 0.8, 8), CHROME, px, -0.33, pz, { outline: false });
    part(rig, cyl(0.02, 0.02, 0.05, 10), '#33333a', px, 0.07, pz);
    const micZ = 0.0;
    // The boom out to the mount, its counterweight behind.
    rod(rig, new THREE.Vector3(px - 0.05, 0.1, pz - 0.06), new THREE.Vector3(0, 0.05, micZ - 0.06), 0.008, BLACK);
    part(rig, cyl(0.025, 0.025, 0.07, 12), '#33333a', px - 0.05, 0.1, pz - 0.06, { rx: Math.PI / 2 });
    // The spider mount and the mic.
    part(rig, ring(0.05, 0.005), STEEL, 0, 0.0, micZ - 0.04, { rx: Math.PI / 2, outline: false });
    part(rig, ring(0.05, 0.005), STEEL, 0, 0.06, micZ - 0.04, { rx: Math.PI / 2, outline: false });
    rod(rig, new THREE.Vector3(0, 0.05, micZ - 0.06), new THREE.Vector3(0, 0.03, micZ - 0.09), 0.006, STEEL);
    for (const a of [0.4, 2.2, 4.0]) rod(rig, new THREE.Vector3(Math.cos(a) * 0.05, 0.0, micZ - 0.04 + Math.sin(a) * 0.05), new THREE.Vector3(Math.cos(a + 1) * 0.03, 0.06, micZ - 0.04 + Math.sin(a + 1) * 0.03), 0.002, '#ff7043');
    part(rig, cyl(0.03, 0.026, 0.13, 18), '#d8cfb8', 0, 0.0, micZ - 0.04);
    part(rig, cyl(0.031, 0.031, 0.075, 18), '#a9a9a1', 0, 0.1, micZ - 0.04);
    part(rig, ball(0.031), '#a9a9a1', 0, 0.137, micZ - 0.04);
    for (const y of [0.075, 0.1, 0.125]) part(rig, ring(0.031, 0.002), '#7d7d77', 0, y, micZ - 0.04, { rx: Math.PI / 2, outline: false });
    part(rig, box(0.012, 0.016, 0.004), '#222', 0, 0.05, micZ - 0.01, { outline: false });
    // The pop filter in front on its gooseneck.
    const popZ = micZ + 0.09;
    part(rig, ring(0.07, 0.006), BLACK, 0, 0.1, popZ, { outline: false });
    part(rig, disc(0.068), '#15151a', 0, 0.1, popZ, { material: MESH, outline: false });
    lead(rig, new THREE.Vector3(0, 0.03, popZ), new THREE.Vector3(px, -0.1, pz + 0.02), -0.05, 0.005, '#33333a');
    // The reflection filter round the back.
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (0.1 + (0.8 * i) / (n - 1));
      const r = 0.2;
      const x = Math.cos(a) * r;
      const z = micZ - 0.04 - Math.sin(a) * r;
      part(rig, box(0.092, 0.34, 0.012), '#8a8f96', x, 0.08, z, { ry: Math.PI / 2 + a });
      part(rig, box(0.086, 0.32, 0.03), '#2f2f36', x * 0.93, 0.08, micZ - 0.04 - Math.sin(a) * r * 0.93, { ry: Math.PI / 2 + a, outline: false });
    }
    // The XLR lead: from the mic down the boom and the stand to the wall box.
    lead(rig, new THREE.Vector3(0, -0.07, micZ - 0.05), new THREE.Vector3(px + 0.02, -0.15, pz + 0.01), 0.03, 0.005);
    rod(g, new THREE.Vector3(px + 0.02, 1.2, pz + 0.01), new THREE.Vector3(px + 0.02, 0.05, pz + 0.02), 0.005, BLACK);
    lead(g, new THREE.Vector3(px + 0.02, 0.03, pz + 0.04), new THREE.Vector3(0.2, 0.3, bz + 0.02), -0.25, 0.005);
    part(g, rbox(0.12, 0.08, 0.03, 0.006), '#455a64', 0.2, 0.32, bz + 0.015);
    label(g, 'MIC 1', 0.08, 0.02, 0.2, 0.34, bz + 0.032, 'none', '#fff');
    // The cue box on the stand, its LED lit while recording.
    const cue = new THREE.Vector3(px + 0.03, 0.78, pz + 0.04);
    part(g, rbox(0.09, 0.07, 0.05, 0.008), '#37474f', cue.x, cue.y, cue.z);
    for (const kx of [-0.02, 0.02]) part(g, cyl(0.008, 0.008, 0.012, 10), '#eceff1', cue.x + kx, cue.y + 0.01, cue.z + 0.03, { rx: Math.PI / 2, outline: false });
    part(use, ball(0.005), '#69f0ae', cue.x, cue.y - 0.02, cue.z + 0.027, { outline: false, material: glow('#69f0ae') });
    // The headphones hung on the stand's hook, idle.
    part(g, cyl(0.004, 0.004, 0.05, 6), STEEL, px, 1.0, pz + 0.035, { rx: Math.PI / 2, outline: false });
    headphones(off, px, 0.93, pz + 0.06, Math.PI / 2);
    // On the singer's head while recording, the lead to the cue box.
    const on = headphones(use, 0, 1.45, sz);
    const cord = span(use, 0.004, BLACK);
    // The music stand turned to the singer, the lyric sheet on it.
    const msx = 0.35;
    const msz = 0.0;
    const ms = frame(g, msx, 0, msz, Math.atan2(-msx, sz - msz));
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      rod(ms, new THREE.Vector3(0, 0.35, 0), new THREE.Vector3(Math.cos(a) * 0.17, 0.0, Math.sin(a) * 0.17), 0.006, BLACK);
    }
    part(ms, cyl(0.008, 0.008, 0.75, 8), BLACK, 0, 0.72, 0, { outline: false });
    const desk = frame(ms, 0, 1.12, 0, 0, -0.45);
    part(desk, rbox(0.44, 0.3, 0.012, 0.006), BLACK, 0, 0, 0);
    part(desk, box(0.44, 0.02, 0.04), BLACK, 0, -0.15, 0.02);
    sheet(desk, lyricSheetTex(), 0.21, 0.28, 0, 0.0, 0.008);
    part(desk, cyl(0.003, 0.003, 0.12, 6), '#ffca28', 0.12, -0.13, 0.03, { rz: Math.PI / 2, outline: false });
    // The stool with the tea and the throat spray.
    const sx = -0.36;
    const stz = bz + 0.2;
    part(g, cyl(0.15, 0.15, 0.04, 18), WALNUT, sx, 0.6, stz);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.3;
      rod(g, new THREE.Vector3(sx + Math.cos(a) * 0.09, 0.58, stz + Math.sin(a) * 0.09), new THREE.Vector3(sx + Math.cos(a) * 0.15, 0, stz + Math.sin(a) * 0.15), 0.012, WALNUT);
    }
    part(g, cyl(0.035, 0.03, 0.15, 14), '#fff8e1', sx - 0.03, 0.695, stz);
    part(g, cyl(0.037, 0.037, 0.02, 14), '#ffb300', sx - 0.03, 0.775, stz);
    part(g, cyl(0.012, 0.012, 0.09, 10), '#4fc3f7', sx + 0.07, 0.665, stz + 0.03);
    part(g, cyl(0.006, 0.006, 0.02, 8), WHITE_CAP, sx + 0.07, 0.72, stz + 0.03, { outline: false });
    // Where the voice goes: the capsule.
    const capsule = marker(rig, 0, 0.1, micZ - 0.04);
    const sing = stoodAt(g, 0, sz, 'studioSing', capsule);
    out.spots = { '*': sing };
    out.work = capsule;
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    out.animate = (t) => {
      const h = posed(sing, t) ? ((sing.at.userData.height as number | undefined) ?? 1.6) : 1.6;
      const k = h / 1.6;
      // The capsule at the mouth, the headphones on the ears.
      rig.position.y = 0.875 * h - 0.1;
      on.visible = posed(sing, t);
      on.position.set(0, h - STUDIO_EAR.down * k, sz - STUDIO_EAR.ahead * k);
      on.scale.setScalar(k);
      a.set(-(STUDIO_EAR.side + 0.01) * k, h - STUDIO_EAR.down * k - 0.04 * k, sz - STUDIO_EAR.ahead * k);
      b.copy(cue).setY(cue.y - 0.03);
      stretch(cord, a, b);
      cord.visible = on.visible;
    };
  },

  /**
   * The songwriter's desk (작사 책상, 1 × 1): a walnut top on black hairpin legs, the notebook open
   * with the lyric written in so far (the lines come as they're written), crossings-out and the rhymes
   * in purple; the laptop playing the beat in its DAW; the rhyme dictionary and a dictionary, a mug,
   * crumpled tries, earphones; a brass lamp lit while writing; the cork board on the wall with sticky
   * notes and polaroids; an acoustic guitar leant on the desk; a wastebasket; a cushioned chair. Sat
   * at it writing in the notebook.
   */
  lyricDesk(g, W, D, _c, _def, _ctx, out) {
    const use = inUse(g, out);
    const bz = -D / 2;
    const dw = Math.min(0.94, W - 0.06);
    const dd = 0.55;
    const dz = bz + 0.02 + dd / 2;
    const ty = 0.74;
    part(g, rbox(dw, 0.035, dd, 0.012), WALNUT, 0, ty, dz);
    for (const sx of [-1, 1])
      for (const s2 of [-1, 1]) {
        const x = sx * (dw / 2 - 0.06);
        const z = dz + s2 * (dd / 2 - 0.06);
        rod(g, new THREE.Vector3(x, ty - 0.02, z), new THREE.Vector3(x + sx * 0.02, 0, z - s2 * 0.04), 0.006, BLACK);
        rod(g, new THREE.Vector3(x - sx * 0.04, ty - 0.02, z), new THREE.Vector3(x + sx * 0.02, 0, z - s2 * 0.04), 0.006, BLACK);
      }
    part(g, rbox(0.32, 0.06, 0.4, 0.01), shade(WALNUT, 0.85), -dw / 2 + 0.22, ty - 0.05, dz);
    const top = ty + 0.018;
    // The notebook, the lines coming as they're written.
    const nbz = dz + 0.12;
    part(g, box(0.34, 0.012, 0.23), '#3949ab', 0, top + 0.006, nbz, { outline: false });
    const pages: THREE.Mesh[] = [];
    for (let n = 0; n <= LYRICS.length; n++) {
      const p = sheet(g, notebookTex(n), 0.32, 0.22, 0, top + 0.014, nbz, 0, -Math.PI / 2);
      p.visible = n === 3;
      pages.push(p);
    }
    part(g, cyl(0.004, 0.004, 0.14, 6), '#ffca28', 0.2, top + 0.006, nbz + 0.06, { ry: 0.5, rz: Math.PI / 2, outline: false });
    // The laptop with the beat, lit while working.
    const lp = frame(g, 0.28, top, dz - 0.08, -0.35);
    part(lp, rbox(0.26, 0.012, 0.18, 0.006), '#b0bec5', 0, 0.006, 0);
    const lid = frame(lp, 0, 0.012, -0.09, 0, -0.25);
    part(lid, rbox(0.26, 0.17, 0.008, 0.006), '#b0bec5', 0, 0.085, 0);
    part(lid, box(0.24, 0.15, 0.001), '#15171c', 0, 0.085, 0.0045, { outline: false });
    // The beat on screen while working (the lid's place again, in the in-use group).
    sheet(frame(frame(use, 0.28, top, dz - 0.08, -0.35), 0, 0.012, -0.09, 0, -0.25), dawTex(), 0.24, 0.15, 0, 0.085, 0.006);
    // Dictionaries, a mug, crumpled tries, earphones.
    for (let i = 0; i < 2; i++) {
      part(g, box(0.15, 0.04, 0.21), ['#c62828', '#283593'][i], -0.33, top + 0.02 + i * 0.04, dz - 0.05, { ry: i * 0.15 });
    }
    label(g, '라임 사전', 0.1, 0.022, -0.33, top + 0.06, dz + 0.056, 'none', '#fff');
    part(g, cyl(0.04, 0.035, 0.09, 14), '#fafafa', -0.3, top + 0.045, dz + 0.17);
    part(g, ring(0.025, 0.006, Math.PI), '#fafafa', -0.34, top + 0.05, dz + 0.17, { rz: Math.PI / 2, outline: false });
    for (const [x, z] of [[0.2, dz + 0.17], [0.38, dz + 0.06]]) part(g, ball(0.03), PAPER, x, top + 0.03, z).scale.set(1, 0.85, 1.1);
    for (const [x, z] of [[0.3, 0.35], [0.42, 0.42], [0.2, 0.42]]) part(g, ball(0.03), PAPER, x, 0.03, z);
    // The lamp, lit while writing.
    const lx = -0.33;
    const lz = bz + 0.08;
    part(g, cyl(0.05, 0.055, 0.02, 14), BRASS, lx, top + 0.01, lz);
    rod(g, new THREE.Vector3(lx, top, lz), new THREE.Vector3(lx + 0.05, top + 0.32, lz + 0.05), 0.007, BRASS);
    part(g, cone(0.07, 0.1, 16), '#2e7d32', lx + 0.08, top + 0.31, lz + 0.09, { rx: 0.5 });
    part(use, ball(0.025), '#fff3c4', lx + 0.08, top + 0.28, lz + 0.11, { outline: false, material: glow('#fff3c4') });
    // The cork board on the wall.
    part(g, rbox(0.82, 0.52, 0.02, 0.01), OAK, 0, 1.4, bz + 0.012);
    sheet(g, corkTex(), 0.76, 0.46, 0, 1.4, bz + 0.024);
    for (const [x, y] of [[-0.3, 1.58], [-0.05, 1.6], [0.25, 1.59], [-0.25, 1.3], [0.3, 1.3]]) part(g, ball(0.01), '#e53935', x, y, bz + 0.03, { outline: false });
    // The guitar leant on the desk's side.
    const gt = frame(g, -dw / 2 - 0.0, 0, dz + 0.22, 0.4, 0, -0.18);
    const body = part(gt, ball(0.16), '#d7a35e', 0, 0.22, 0);
    body.scale.set(1, 1.15, 0.32);
    const upper = part(gt, ball(0.12), '#d7a35e', 0, 0.42, 0);
    upper.scale.set(1, 1, 0.42);
    part(gt, cyl(0.04, 0.04, 0.005, 16), '#3e2723', 0, 0.32, 0.055, { rx: Math.PI / 2, outline: false });
    part(gt, box(0.045, 0.45, 0.025), '#5d4037', 0, 0.75, 0);
    part(gt, box(0.06, 0.12, 0.02), '#3e2723', 0, 1.02, 0);
    // The wastebasket.
    part(g, cyl(0.11, 0.09, 0.25, 16), '#90a4ae', 0.36, 0.125, 0.36);
    // The chair.
    const cz = 0.33;
    part(g, rbox(0.42, 0.05, 0.4, 0.02), OAK, 0, 0.43, cz);
    part(g, rbox(0.38, 0.04, 0.36, 0.02), '#a1887f', 0, 0.47, cz);
    for (const sx of [-1, 1]) for (const s2 of [-1, 1]) part(g, cyl(0.018, 0.016, 0.43, 8), OAK, sx * 0.18, 0.215, cz + s2 * 0.17, { outline: false });
    for (const sx of [-1, 1]) part(g, cyl(0.016, 0.016, 0.42, 8), OAK, sx * 0.18, 0.66, cz + 0.18, { outline: false });
    part(g, rbox(0.4, 0.14, 0.03, 0.012), OAK, 0, 0.8, cz + 0.18);
    const work = marker(g, 0.02, top + 0.02, nbz);
    const write = satAt(g, 0, cz, 'write', work, 0.49);
    out.spots = { '*': write };
    out.work = work;
    out.animate = (t) => {
      const lines = Math.floor(t / 5) % (LYRICS.length + 1);
      pages.forEach((p, i) => (p.visible = i === lines));
    };
  },

  /**
   * The booth's acoustic foam (흡음재 벽, 3 × 1): squares of wedge foam in charcoal and wine, their
   * ridges turned each way in turn, edged in wood, with a wooden skyline diffuser in the middle.
   */
  sgFoamWall(g, W, D) {
    const bz = -D / 2 + 0.005;
    const s = 0.5;
    const cols = Math.floor((W - 0.04) / s);
    const rows = 4;
    const y0 = 0.45;
    const x0 = -(cols * s) / 2 + s / 2;
    const midCol = (cols - 1) / 2;
    const geo = wedge(s - 0.01, 6, 0.06);
    for (let r = 0; r < rows; r++)
      for (let cI = 0; cI < cols; cI++) {
        const x = x0 + cI * s;
        const y = y0 + s / 2 + r * s;
        // The diffuser takes the middle two squares of the middle rows.
        if (r >= 1 && r <= 2 && Math.abs(cI - midCol) < 1) continue;
        const m = part(g, geo, (r + cI) % 2 ? FOAM_A : FOAM_B, x, y, bz, { outline: false });
        if ((r + cI) % 2) m.rotation.z = Math.PI / 2;
      }
    // The skyline diffuser: wooden blocks of many depths.
    const dx = 0;
    const dy = y0 + 2 * s;
    const n = 8;
    const cell = (2 * s * 0.9) / n;
    part(g, box(2 * s * 0.95, 2 * s * 0.95, 0.02), shade(OAK, 0.7), dx, dy, bz + 0.01);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const d = 0.03 + 0.11 * (((i * 7 + j * 3 + i * j) % 9) / 8);
        part(g, box(cell - 0.004, cell - 0.004, d), (i + j) % 3 ? OAK : '#c9a27a', dx - s * 0.9 + (i + 0.5) * cell, dy - s * 0.9 + (j + 0.5) * cell, bz + 0.02 + d / 2, { outline: false });
      }
    // The wooden edge round it all.
    const fw = cols * s + 0.04;
    const fh = rows * s + 0.04;
    part(g, box(fw, 0.03, 0.08), WALNUT, 0, y0 - 0.01, bz + 0.04);
    part(g, box(fw, 0.03, 0.08), WALNUT, 0, y0 + fh - 0.03, bz + 0.04);
    for (const sx of [-1, 1]) part(g, box(0.03, fh, 0.08), WALNUT, sx * (fw / 2), y0 + fh / 2 - 0.02, bz + 0.04);
  },

  /** The glass to the control room, from the booth (컨트롤룸 유리창, 2 × 1). */
  sgBoothWindow(g, W, D) {
    studioGlass(g, W, D, 'control');
  },
  /** The glass into the booth, from the control room (녹음 부스 유리창, 2 × 1). */
  sgControlWindow(g, W, D) {
    studioGlass(g, W, D, 'booth');
  },

  /**
   * The platinum records (플래티넘 레코드 액자, 2 × 1): three framed discs on the wall — gold, platinum,
   * double platinum, each with its plaque — over a walnut credenza with the LP collection showing,
   * a turntable on top, and the music-show trophies (a gold mic, a crystal star) with the 1위 card.
   */
  sgGoldRecords(g, W, D) {
    const bz = -D / 2;
    const recs: Array<[string, string, string]> = [
      ['#d4af37', 'GOLD', '1st 미니앨범 「별빛 정류장」'],
      ['#e5e4e2', 'PLATINUM', '정규 1집 「여름 끝」'],
      ['#cfd8dc', '2× PLATINUM', '「첫눈 오는 날」 1억 스트리밍'],
    ];
    const step = Math.min(0.6, (W - 0.2) / 3);
    recs.forEach(([col, title, sub], i) => {
      const x = (i - 1) * step;
      const y = 1.6;
      part(g, rbox(0.42, 0.54, 0.03, 0.008), BLACK, x, y, bz + 0.02);
      part(g, box(0.38, 0.5, 0.004), '#f5f1e8', x, y, bz + 0.037, { outline: false });
      part(g, cyl(0.13, 0.13, 0.006, 32), col, x, y + 0.06, bz + 0.042, { rx: Math.PI / 2, outline: false });
      part(g, cyl(0.045, 0.045, 0.002, 24), ['#5c6bc0', '#ef6c00', '#ec407a'][i], x, y + 0.06, bz + 0.046, { rx: Math.PI / 2, outline: false });
      part(g, ring(0.09, 0.0015), shade(col, 0.8), x, y + 0.06, bz + 0.046, { outline: false });
      label(g, title, 0.24, 0.04, x, y - 0.13, bz + 0.042, 'none', '#6d4c41');
      label(g, sub, 0.3, 0.03, x, y - 0.18, bz + 0.042, 'none', '#555');
    });
    // The credenza with the records showing, the turntable on top.
    const ch = 0.62;
    const cw = W - 0.2;
    const cz = bz + 0.21;
    part(g, rbox(cw, ch, 0.4, 0.015), WALNUT, 0, ch / 2 + 0.08, cz);
    for (const sx of [-1, 1]) part(g, cyl(0.02, 0.012, 0.08, 8), BLACK, sx * (cw / 2 - 0.08), 0.04, cz, { outline: false });
    part(g, box(cw / 2 - 0.06, ch - 0.12, 0.01), '#2b1d16', -cw / 4, ch / 2 + 0.08, cz + 0.2, { outline: false });
    for (let i = 0; i < 14; i++) part(g, box(0.012, 0.3, 0.3), ['#e53935', '#fdd835', '#1e88e5', '#43a047', '#8e24aa', '#212121', '#f5f5f5'][i % 7], -cw / 2 + 0.08 + i * 0.045, ch / 2 + 0.06, cz + 0.03, { rz: i === 13 ? 0.25 : 0, outline: false });
    part(g, rbox(cw / 2 - 0.06, ch - 0.12, 0.012, 0.006), shade(WALNUT, 0.9), cw / 4, ch / 2 + 0.08, cz + 0.205);
    part(g, cyl(0.012, 0.012, 0.012, 8), BRASS, cw / 4 - 0.2, ch / 2 + 0.08, cz + 0.215, { rx: Math.PI / 2, outline: false });
    const top = ch + 0.08;
    part(g, rbox(0.42, 0.06, 0.34, 0.012), '#3e2723', -0.35, top + 0.03, cz);
    part(g, cyl(0.15, 0.15, 0.012, 32), BLACK, -0.38, top + 0.066, cz);
    part(g, cyl(0.05, 0.05, 0.002, 20), '#ffb300', -0.38, top + 0.073, cz, { outline: false });
    rod(g, new THREE.Vector3(-0.2, top + 0.08, cz - 0.12), new THREE.Vector3(-0.3, top + 0.08, cz + 0.06), 0.004, CHROME);
    trophy(g, 0.15, top, cz, false);
    trophy(g, 0.35, top, cz - 0.04, true);
    const card = frame(g, 0.55, top + 0.08, cz - 0.08, -0.25, -0.12);
    part(card, rbox(0.15, 0.17, 0.012, 0.004), '#c9a24a', 0, 0, 0);
    label(card, '음원차트 1위', 0.13, 0.05, 0, 0.02, 0.008, '#fff8e1', '#c62828');
  },

  /**
   * The backstage dressing table (대기실 화장대, 2 × 1): a blush-white vanity with its drawers, the
   * mirror ringed with bulbs (lit while getting ready), the setlist taped to its corner; makeup laid
   * out, brushes in a cup, a hair iron, the in-ear monitors in their case, water; the stage jacket on
   * a hook beside it; a stool pushed aside. Stood at the mirror fixing the hair for the stage.
   */
  sgDressingTable(g, W, D, _c, _def, _ctx, out) {
    const use = inUse(g, out);
    const bz = -D / 2;
    const tw = Math.min(1.5, W - 0.3);
    const tx = -0.15;
    const td = 0.45;
    const tz = bz + td / 2 + 0.02;
    const ty = 0.76;
    part(g, rbox(tw, 0.04, td, 0.012), '#fbeff2', tx, ty, tz);
    for (const sx of [-1, 1]) {
      part(g, rbox(0.36, 0.7, td - 0.04, 0.012), '#f6e3e8', tx + sx * (tw / 2 - 0.2), 0.37, tz);
      for (let d = 0; d < 3; d++) part(g, ball(0.012), BRASS, tx + sx * (tw / 2 - 0.2), 0.15 + d * 0.22, tz + td / 2 - 0.01, { outline: false });
    }
    // The mirror with its bulbs.
    const my = 1.42;
    const mw = 1.0;
    const mh = 0.8;
    part(g, rbox(mw + 0.14, mh + 0.14, 0.04, 0.02), '#f3e5f5', tx, my, bz + 0.03);
    const mirror = new THREE.MeshToonMaterial({ color: '#dfeaf0', gradientMap: gradient, emissive: '#22303a' });
    part(g, box(mw, mh, 0.01), '#dfeaf0', tx, my, bz + 0.052, { material: mirror, outline: false });
    const bulbs: Array<[number, number]> = [];
    for (let i = 0; i < 5; i++) {
      const x = tx - mw / 2 + 0.1 + (i * (mw - 0.2)) / 4;
      bulbs.push([x, my + mh / 2 + 0.035]);
    }
    for (let i = 0; i < 4; i++) {
      const y = my - mh / 2 + 0.1 + (i * (mh - 0.2)) / 3;
      bulbs.push([tx - mw / 2 - 0.035, y], [tx + mw / 2 + 0.035, y]);
    }
    for (const [x, y] of bulbs) {
      part(g, ball(0.028), '#fff8e1', x, y, bz + 0.06);
      part(use, ball(0.03), '#fff3c4', x, y, bz + 0.061, { outline: false, material: glow('#fff6d5') });
    }
    const setlist = painted('setlist', 200, 260, (c) => {
      c.fillStyle = '#fff';
      c.fillRect(0, 0, 200, 260);
      c.fillStyle = '#212121';
      c.font = `bold 20px ${FONT}`;
      c.fillText('SET LIST', 14, 30);
      c.font = `15px ${FONT}`;
      ['1. 별빛 정류장', '2. 여름 끝', '3. 첫눈 오는 날', '— 토크 —', '4. 밤산책', '5. 우리의 계절', '앵콜: 별빛 정류장'].forEach((l, i) => c.fillText(l, 14, 64 + i * 27));
    });
    sheet(g, setlist, 0.14, 0.18, tx + mw / 2 - 0.1, my + mh / 2 - 0.12, bz + 0.059, 0, 0).rotation.z = -0.08;
    // On the table.
    const top = ty + 0.02;
    part(g, rbox(0.16, 0.015, 0.1, 0.005), BLACK, tx - 0.3, top + 0.008, tz + 0.05);
    for (let i = 0; i < 8; i++) part(g, box(0.03, 0.004, 0.03), ['#f8bbd0', '#ce93d8', '#ffab91', '#bcaaa4', '#f48fb1', '#e1bee7', '#ffe0b2', '#a1887f'][i], tx - 0.36 + (i % 4) * 0.04, top + 0.017, tz + 0.03 + Math.floor(i / 4) * 0.04, { outline: false });
    part(g, cyl(0.03, 0.03, 0.09, 12), '#f5f5f5', tx - 0.08, top + 0.045, tz - 0.08);
    for (let i = 0; i < 5; i++) part(g, cyl(0.004, 0.003, 0.16, 6), i % 2 ? BLACK : '#8d6e63', tx - 0.08 + (i - 2) * 0.008, top + 0.12, tz - 0.08, { rz: (i - 2) * 0.12, outline: false });
    for (let i = 0; i < 3; i++) part(g, cyl(0.009, 0.009, 0.06, 10), ['#c62828', '#ad1457', '#6a1b9a'][i], tx + 0.02 + i * 0.025, top + 0.03, tz + 0.08);
    part(g, rbox(0.25, 0.02, 0.04, 0.01), BLACK, tx + 0.25, top + 0.01, tz + 0.02, { ry: 0.3 });
    part(g, rbox(0.12, 0.05, 0.08, 0.02), '#263238', tx + 0.42, top + 0.025, tz - 0.06);
    for (const sx of [-1, 1]) part(g, ball(0.015), '#4dd0e1', tx + 0.42 + sx * 0.025, top + 0.06, tz - 0.06);
    part(g, cyl(0.03, 0.03, 0.2, 12), '#b3e5fc', tx + 0.55, top + 0.1, tz + 0.06);
    // The stage jacket on its hook, the stool aside.
    const jx = W / 2 - 0.15;
    part(g, cyl(0.006, 0.006, 0.08, 6), STEEL, jx, 1.7, bz + 0.04, { rx: Math.PI / 2, outline: false });
    part(g, ring(0.12, 0.006, Math.PI), '#795548', jx, 1.58, bz + 0.08, { outline: false });
    part(g, rbox(0.26, 0.55, 0.08, 0.03), '#d81b60', jx, 1.32, bz + 0.08);
    for (let i = 0; i < 18; i++) part(g, ball(0.01), '#ffd54f', jx - 0.1 + (i % 6) * 0.04, 1.15 + Math.floor(i / 6) * 0.15, bz + 0.125, { outline: false, material: glow('#ffe082') });
    part(g, cyl(0.17, 0.17, 0.06, 18), '#f8bbd0', jx - 0.05, 0.45, 0.3);
    part(g, cyl(0.02, 0.02, 0.42, 8), CHROME, jx - 0.05, 0.21, 0.3, { outline: false });
    part(g, cyl(0.15, 0.15, 0.02, 18), CHROME, jx - 0.05, 0.01, 0.3, { outline: false });
    const prep = stoodAt(g, tx, bz + 0.72, 'lather');
    out.spots = { '*': prep };
    out.work = marker(g, tx, 1.4, bz + 0.1);
  },

  /**
   * The fan-sign table (팬사인회 테이블, 2 × 1): a long table under a pink cloth printed with the
   * event's banner, stacks of the album in its two versions, an album open in front of the singer with
   * the sign going on, the sign pens in a cup, a name card, post-its with the fans' names, a lightstick
   * glowing while it's on, gifts and letters piled at one end, a roll-up banner behind; a chair.
   * Sat behind it facing the fans, signing.
   */
  sgFanSignTable(g, W, D, _c, _def, _ctx, out) {
    const use = inUse(g, out);
    const off = idle(g, out);
    const tw = W - 0.2;
    const td = 0.5;
    const tz = 0.17;
    const ty = 0.74;
    part(g, rbox(tw, 0.03, td, 0.01), '#f8bbd0', 0, ty, tz);
    part(g, box(tw, ty - 0.02, 0.01), '#f48fb1', 0, (ty - 0.02) / 2, tz + td / 2);
    for (const sx of [-1, 1]) part(g, box(0.01, ty - 0.02, td), '#f48fb1', sx * (tw / 2), (ty - 0.02) / 2, tz);
    const banner = painted('fanBanner', 640, 120, (c) => {
      const gr = c.createLinearGradient(0, 0, 640, 0);
      gr.addColorStop(0, '#f48fb1');
      gr.addColorStop(1, '#ce93d8');
      c.fillStyle = gr;
      c.fillRect(0, 0, 640, 120);
      c.fillStyle = '#fff';
      c.font = `bold 40px ${FONT}`;
      c.textAlign = 'center';
      c.fillText('1st MINI ALBUM 「별빛 정류장」', 320, 56);
      c.font = `bold 30px ${FONT}`;
      c.fillText('★ 팬사인회 ★', 320, 100);
    });
    sheet(g, banner, tw - 0.1, (tw - 0.1) * (120 / 640), 0, 0.45, tz + td / 2 + 0.007);
    const top = ty + 0.016;
    // Album stacks.
    for (let s = 0; s < 2; s++)
      for (let i = 0; i < 5; i++) part(g, box(0.19, 0.022, 0.24), s ? '#b39ddb' : '#80deea', -tw / 2 + 0.18 + s * 0.24, top + 0.011 + i * 0.023, tz - 0.05, { ry: (i % 2) * 0.05 });
    // The album being signed (open, in use) or closed (idle).
    const az = tz + 0.08;
    part(off, box(0.19, 0.022, 0.24), '#80deea', 0, top + 0.011, az);
    part(use, box(0.38, 0.012, 0.24), '#e0f7fa', 0, top + 0.006, az, { outline: false });
    const sign = painted('fanSign', 200, 120, (c) => {
      c.fillStyle = '#fafafa';
      c.fillRect(0, 0, 200, 120);
      c.strokeStyle = '#212121';
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(20, 80);
      c.bezierCurveTo(50, 10, 70, 110, 100, 50);
      c.bezierCurveTo(120, 20, 140, 90, 180, 40);
      c.stroke();
      c.fillStyle = '#e91e63';
      c.font = `22px ${HAND}`;
      c.fillText('to. 별님에게', 30, 110);
    });
    sheet(use, sign, 0.17, 0.1, 0.09, top + 0.014, az, 0, -Math.PI / 2);
    // Pens, a name card, post-its, the lightstick, water.
    part(g, cyl(0.03, 0.03, 0.08, 12), '#fff', 0.3, top + 0.04, tz - 0.12);
    for (let i = 0; i < 4; i++) part(g, cyl(0.005, 0.005, 0.13, 6), ['#212121', '#e91e63', '#ffd600', '#1e88e5'][i], 0.3 + (i - 1.5) * 0.01, top + 0.1, tz - 0.12, { rz: (i - 1.5) * 0.1, outline: false });
    const nc = frame(g, 0.0, top + 0.04, tz + 0.2, 0, -0.3);
    part(nc, box(0.2, 0.07, 0.005), '#fff', 0, 0, 0);
    label(nc, '오늘의 가수', 0.18, 0.04, 0, 0, 0.004, 'none', '#d81b60');
    for (let i = 0; i < 3; i++) part(g, box(0.06, 0.003, 0.06), ['#fff176', '#b2ebf2', '#f8bbd0'][i], 0.45 + i * 0.07, top + 0.002, tz + 0.1, { ry: i * 0.2, outline: false });
    part(g, cyl(0.015, 0.015, 0.15, 10), '#fafafa', -0.32, top + 0.03, tz + 0.12, { rz: Math.PI / 2, ry: 0.4 });
    part(g, ball(0.045), '#f8bbd0', -0.42, top + 0.06, tz + 0.08);
    part(use, ball(0.048), '#ff80ab', -0.42, top + 0.06, tz + 0.08, { outline: false, material: glow('#ff80ab') });
    part(g, cyl(0.03, 0.03, 0.2, 12), '#b3e5fc', 0.6, top + 0.1, tz - 0.15);
    // Gifts and letters at the end.
    const gx = tw / 2 - 0.15;
    part(g, rbox(0.14, 0.12, 0.12, 0.01), '#7e57c2', gx, top + 0.06, tz - 0.08);
    part(g, box(0.15, 0.02, 0.02), '#ffd54f', gx, top + 0.121, tz - 0.08, { outline: false });
    const bear = part(g, ball(0.06), '#bcaaa4', gx - 0.02, top + 0.06, tz + 0.1);
    bear.scale.set(1, 1.1, 0.9);
    part(g, ball(0.045), '#bcaaa4', gx - 0.02, top + 0.15, tz + 0.1);
    for (const sx of [-1, 1]) part(g, ball(0.018), '#a1887f', gx - 0.02 + sx * 0.035, top + 0.19, tz + 0.1);
    for (let i = 0; i < 4; i++) part(g, box(0.11, 0.004, 0.07), ['#fff', '#fce4ec', '#e3f2fd', '#fff8e1'][i], gx - 0.12, top + 0.003 + i * 0.005, tz + 0.18, { ry: i * 0.3, outline: false });
    // The roll-up banner behind, and the chair.
    const rx = -W / 2 + 0.2;
    const rz = -D / 2 + 0.1;
    part(g, rbox(0.5, 0.05, 0.12, 0.01), '#cfd8dc', rx, 0.025, rz);
    const poster = painted('rollup', 200, 600, (c) => {
      const gr = c.createLinearGradient(0, 0, 0, 600);
      gr.addColorStop(0, '#1a237e');
      gr.addColorStop(1, '#ad1457');
      c.fillStyle = gr;
      c.fillRect(0, 0, 200, 600);
      c.fillStyle = '#fff59d';
      for (let i = 0; i < 30; i++) c.fillRect((i * 67) % 200, (i * 131) % 380, 3, 3);
      c.fillStyle = '#fff';
      c.beginPath();
      c.arc(100, 300, 60, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#fff';
      c.font = `bold 26px ${FONT}`;
      c.textAlign = 'center';
      c.fillText('별빛 정류장', 100, 440);
      c.font = `16px ${FONT}`;
      c.fillText('1st MINI ALBUM', 100, 470);
      c.fillText('NOW ON SALE', 100, 520);
    });
    sheet(g, poster, 0.48, 1.44, rx, 0.77, rz + 0.01);
    part(g, rbox(0.42, 0.05, 0.38, 0.02), '#f3e5f5', 0, 0.44, -0.3);
    for (const sx of [-1, 1]) for (const s2 of [-1, 1]) part(g, cyl(0.016, 0.014, 0.44, 8), CHROME, sx * 0.17, 0.22, -0.3 + s2 * 0.15, { outline: false });
    part(g, rbox(0.4, 0.4, 0.04, 0.02), '#f3e5f5', 0, 0.68, -0.48);
    const work = marker(g, 0.05, top + 0.02, az);
    out.spots = { '*': satAt(g, 0, -0.3, 'write', work, 0.48, 0) };
    out.work = work;
  },

  sgShowcaseStage(g, W, D, _c, _def, _ctx, out) {
    showcaseStage(g, W, D, out);
  },
  sgHallSeat(g, _W, _D, _c, _def, _ctx, out) {
    hallSeat(g, out);
  },
  sgBoxOffice(g, W, D) {
    boxOffice(g, W, D);
  },
  sgRoadCases(g, W, D) {
    roadCases(g, W, D);
  },
};

/**
 * The equipment store's road cases (장비 로드케이스, 2 × 1): flight cases stacked on their castors against the wall, black with
 * aluminium edges and corners, stencilled with what's in them (the in-ears, the mics, the stage's cables), a cable trunk with
 * coils over its rim, and a rack of mic stands beside them.
 */
function roadCases(g: THREE.Group, W: number, D: number) {
  const bz = -D / 2 + 0.3;
  const kase = (x: number, y: number, w: number, h: number, d: number, word: string) => {
    part(g, rbox(w, h, d, 0.01), '#1d1d22', x, y + h / 2, bz);
    for (const sx of [-1, 1]) for (const sy of [0, 1]) part(g, box(0.05, 0.05, d + 0.01), STEEL, x + sx * (w / 2 - 0.02), y + 0.02 + sy * (h - 0.04), bz, { outline: false });
    part(g, box(w + 0.005, 0.015, d + 0.005), STEEL, x, y + h / 2, bz, { outline: false });
    part(g, box(0.12, 0.03, 0.02), CHROME, x, y + h * 0.75, bz + d / 2 + 0.01, { outline: false });
    label(g, word, Math.min(w - 0.1, 0.5), 0.07, x, y + h * 0.35, bz + d / 2 + 0.006, 'none', '#fafafa');
  };
  for (const sx of [-1, 1]) for (const z of [-0.15, 0.15]) part(g, cyl(0.03, 0.03, 0.03, 10), BLACK, -0.35 + sx * 0.3, 0.03, bz + z, { rx: Math.PI / 2, outline: false });
  kase(-0.35, 0.06, 0.8, 0.5, 0.5, 'IN-EAR · 한빛');
  kase(-0.35, 0.56, 0.72, 0.4, 0.46, 'MIC · WIRELESS');
  kase(-0.32, 0.96, 0.6, 0.3, 0.42, 'STAGE CABLE');
  // The cable trunk and its coils.
  part(g, rbox(0.5, 0.45, 0.42, 0.01), '#26262b', 0.42, 0.225, bz + 0.04);
  for (let i = 0; i < 3; i++) part(g, ring(0.13, 0.018), ['#111111', '#c62828', '#1565c0'][i], 0.36 + i * 0.07, 0.47, bz + 0.04, { rx: Math.PI / 2 - 0.3, outline: false });
  // Mic stands leaning in their rack.
  part(g, rbox(0.3, 0.06, 0.2, 0.01), '#2a2a30', W / 2 - 0.2, 0.03, bz - 0.05);
  for (let i = 0; i < 3; i++) rod(g, new THREE.Vector3(W / 2 - 0.28 + i * 0.08, 0.05, bz - 0.05), new THREE.Vector3(W / 2 - 0.3 + i * 0.08, 1.45, bz - 0.2), 0.008, CHROME);
}

// ---- The showcase hall (2026-11-05, the layout audit) ----

const DECK = '#16161a';
const TRUSS = '#b0b6bb';
const VELVET = '#8e1b2e';
const CURTAIN = '#141417';

/** The LED wall's picture: the showcase's title over a starry gradient, as a debut showcase puts it up. */
const ledTex = (on: boolean) =>
  painted(`sgLed${on}`, 512, 200, (c) => {
    const gr = c.createLinearGradient(0, 0, 512, 200);
    gr.addColorStop(0, on ? '#4a148c' : '#1a1030');
    gr.addColorStop(0.55, on ? '#283593' : '#121a33');
    gr.addColorStop(1, on ? '#ad1457' : '#2a0f20');
    c.fillStyle = gr;
    c.fillRect(0, 0, 512, 200);
    c.fillStyle = on ? 'rgba(255,245,157,0.9)' : 'rgba(255,245,157,0.35)';
    for (let i = 0; i < 70; i++) c.fillRect((i * 97) % 512, (i * 53) % 200, 2 + (i % 3), 2 + (i % 3));
    c.textAlign = 'center';
    c.fillStyle = on ? '#ffffff' : 'rgba(255,255,255,0.55)';
    c.font = `bold 46px ${FONT}`;
    c.fillText('별빛 정류장', 256, 92);
    c.font = `20px ${FONT}`;
    c.fillText('은하율 1st MINI ALBUM SHOWCASE', 256, 132);
    c.font = `15px ${FONT}`;
    c.fillText('한빛엔터테인먼트 쇼케이스홀', 256, 168);
    // The LED panels' seams.
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 1;
    for (let x = 0; x <= 512; x += 32) (c.beginPath(), c.moveTo(x, 0), c.lineTo(x, 200), c.stroke());
    for (let y = 0; y <= 200; y += 40) (c.beginPath(), c.moveTo(0, y), c.lineTo(512, y), c.stroke());
  });

/** A box truss from `a` to `b`: four chords and a zigzag on each face. */
function boxTruss(g: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, s = 0.15) {
  const d = b.clone().sub(a);
  const len = d.length();
  const n = Math.max(2, Math.round(len / 0.3));
  const ax = d.clone().normalize();
  const side = new THREE.Vector3(0, 1, 0).cross(ax).normalize();
  const upv = ax.clone().cross(side).normalize();
  const corner = (i: number) => side.clone().multiplyScalar((i & 1 ? 1 : -1) * s / 2).addScaledVector(upv, (i & 2 ? 1 : -1) * s / 2);
  for (let i = 0; i < 4; i++) rod(g, a.clone().add(corner(i)), b.clone().add(corner(i)), 0.012, TRUSS);
  for (let k = 0; k < n; k++) {
    const p = a.clone().addScaledVector(ax, (k / n) * len);
    const q = a.clone().addScaledVector(ax, ((k + 1) / n) * len);
    rod(g, p.clone().add(corner(0)), q.clone().add(corner(1)), 0.006, TRUSS);
    rod(g, p.clone().add(corner(2)), q.clone().add(corner(3)), 0.006, TRUSS);
  }
}

/** A moving-head light hung under the truss, its lens lit in `k`. */
function movingHead(g: THREE.Object3D, x: number, y: number, z: number, k: string, tilt: number) {
  part(g, rbox(0.2, 0.1, 0.16, 0.02), BLACK, x, y - 0.05, z);
  const yoke = frame(g, x, y - 0.12, z, 0, tilt);
  for (const sx of [-1, 1]) part(yoke, box(0.02, 0.18, 0.06), BLACK, sx * 0.1, -0.06, 0, { outline: false });
  const head = frame(yoke, 0, -0.14, 0, 0, 0.6);
  part(head, cyl(0.07, 0.08, 0.2, 14), '#26262b', 0, 0, 0, { rx: Math.PI / 2 });
  part(head, disc(0.06), k, 0, 0, 0.101, { material: glow(k), outline: false });
}

/** A flown line array: six boxes hung from a frame, curving in towards the house at the bottom. */
function lineArray(g: THREE.Object3D, x: number, top: number, z: number) {
  part(g, box(0.5, 0.04, 0.4), BLACK, x, top, z);
  rod(g, new THREE.Vector3(x, top, z), new THREE.Vector3(x, top + 0.3, z), 0.008, STEEL);
  let y = top - 0.04;
  let tilt = 0;
  for (let i = 0; i < 6; i++) {
    const b = frame(g, x, y - 0.09, z + i * i * 0.006, 0, tilt);
    part(b, rbox(0.56, 0.17, 0.38, 0.01), '#1b1b1f', 0, 0, 0);
    part(b, box(0.52, 0.13, 0.005), '#2c2c33', 0, 0, 0.192, { outline: false });
    y -= 0.18;
    tilt += 0.05;
  }
}

/**
 * The showcase stage (쇼케이스 무대, 9 × 3): a black deck at a showcase's height with the steps up from the stage-right wing, the
 * LED wall across the back with the album's title on it, black legs masking each wing, a truss over the front with moving heads,
 * the line arrays flown either side and the subs on the floor below them; the band's riser at the back (drums left, keys and the
 * bass amp right), the floor wedges and the singer's mic at the lip, spike tape where they stand. In use the wall lights up and
 * the beams come down. Up behind the mic, the singer faces the house (lot3d: `stand` and `work`).
 */
function showcaseStage(g: THREE.Group, W: number, D: number, out: Parameters<Builder>[6]) {
  const h = 0.6;
  const back = -D / 2;
  const front = D / 2;
  // The deck and its lip, a grey edge strip and the skirt.
  part(g, rbox(W - 0.06, h, D - 0.04, 0.02), DECK, 0, h / 2, 0);
  part(g, box(W - 0.06, 0.02, 0.04), '#5f6368', 0, h - 0.01, front - 0.04, { outline: false });
  part(g, box(W - 0.1, h - 0.06, 0.005), '#0e0e10', 0, h / 2 - 0.02, front - 0.015, { outline: false });
  // The steps up from the stage-right wing (+x, at the back corner).
  for (let i = 0; i < 3; i++) part(g, rbox(0.5, (i + 1) * 0.2, 0.28, 0.01), '#2a2a30', W / 2 - 0.3, ((i + 1) * 0.2) / 2, back + 0.95 - i * 0.28);
  // Spike tape: the singer's mark and the dancers' marks across the front.
  for (const [x, k] of [[0, '#ffeb3b'], [-1.4, '#4dd0e1'], [1.4, '#4dd0e1'], [-2.6, '#f06292'], [2.6, '#f06292']] as const) {
    part(g, box(0.16, 0.003, 0.03), k, x, h + 0.002, front - 0.75, { outline: false });
    part(g, box(0.03, 0.003, 0.16), k, x, h + 0.002, front - 0.75, { outline: false });
  }
  // The LED wall across the back, its frame and the processor rack beneath.
  const lw = W - 2.4;
  const lh = 1.7;
  const ly = h + 0.25 + lh / 2;
  part(g, rbox(lw + 0.1, lh + 0.1, 0.12, 0.01), BLACK, 0, ly, back + 0.1);
  const idleWall = idle(g, out);
  sheet(idleWall, ledTex(false), lw, lh, 0, ly, back + 0.165);
  const use = inUse(g, out);
  sheet(use, ledTex(true), lw, lh, 0, ly, back + 0.166);
  for (const sx of [-1, 1]) part(g, box(0.06, ly + lh / 2, 0.06), '#2a2a30', sx * (lw / 2 + 0.08), (ly + lh / 2) / 2, back + 0.1, { outline: false });
  // The wings' masking legs: tall black curtains either side, a little in from the ends.
  for (const sx of [-1, 1]) {
    const lx = sx * (W / 2 - 0.55);
    for (let i = 0; i < 6; i++) part(g, box(0.1, 2.35, 0.05), i % 2 ? CURTAIN : '#1c1c21', lx + sx * 0.0, h + 1.175, back + 0.35 + i * 0.09, { outline: false });
    part(g, rbox(0.18, 0.04, 0.6, 0.01), '#2a2a30', lx, h + 2.36, back + 0.57);
  }
  // The band's riser: drums to the left, keys and the bass amp to the right, a guitar on its stand.
  const rz = back + 0.75;
  part(g, rbox(1.4, 0.2, 0.9, 0.02), '#24242a', -1.7, h + 0.1, rz);
  const y = h + 0.2;
  const dx = -1.7;
  part(g, cyl(0.24, 0.24, 0.28, 20), '#eceff1', dx, y + 0.24, rz + 0.05, { rx: Math.PI / 2 });
  part(g, cyl(0.22, 0.22, 0.01, 20), VELVET, dx, y + 0.24, rz + 0.195, { rx: Math.PI / 2, outline: false });
  part(g, cyl(0.14, 0.14, 0.1, 16), '#cfd8dc', dx + 0.32, y + 0.52, rz + 0.15);
  for (const sx of [-1, 1]) part(g, cyl(0.1, 0.1, 0.1, 16), '#eceff1', dx + sx * 0.13, y + 0.55, rz - 0.05, { rx: 0.3 });
  for (const [x, z, r, top] of [[dx - 0.42, rz - 0.05, 0.2, 0.95], [dx + 0.45, rz - 0.15, 0.15, 0.78]] as const) {
    part(g, cyl(0.01, 0.01, top, 6), STEEL, x, y + top / 2, z, { outline: false });
    part(g, cyl(r, r * 0.9, 0.012, 20), '#d4a017', x, y + top, z, { rx: 0.15 });
  }
  const kx = 1.7;
  for (const sx of [-1, 1]) rod(g, new THREE.Vector3(kx - 0.3, h, rz + sx * 0.15), new THREE.Vector3(kx + 0.3, h + 0.78, rz - sx * 0.15), 0.012, BLACK);
  part(g, rbox(1.0, 0.06, 0.3, 0.01), BLACK, kx, h + 0.82, rz);
  part(g, box(0.92, 0.012, 0.12), WHITE_CAP, kx, h + 0.856, rz + 0.07, { outline: false });
  part(g, rbox(0.5, 0.55, 0.36, 0.02), '#2b2b30', kx + 0.85, h + 0.275, rz - 0.05);
  part(g, box(0.44, 0.36, 0.005), '#3a3a40', kx + 0.85, h + 0.24, rz + 0.13, { outline: false });
  part(g, cyl(0.012, 0.012, 0.5, 6), BLACK, 0.75, h + 0.25, rz + 0.1, { outline: false });
  part(g, rbox(0.3, 0.4, 0.06, 0.04), '#c62828', 0.75, h + 0.62, rz + 0.12, { rz: 0.15 });
  part(g, box(0.05, 0.5, 0.03), '#5d4037', 0.78, h + 0.98, rz + 0.12, { rz: 0.15 });
  // Subs on the floor either side and the line arrays flown over them.
  for (const sx of [-1, 1]) {
    part(g, rbox(0.6, 0.5, 0.5, 0.02), '#1b1b1f', sx * (W / 2 - 0.35), h + 0.25, front - 0.4);
    part(g, cyl(0.17, 0.17, 0.005, 20), '#2c2c33', sx * (W / 2 - 0.35), h + 0.25, front - 0.147, { rx: Math.PI / 2, outline: false });
    lineArray(g, sx * (W / 2 - 0.35), h + 2.35, front - 0.4);
  }
  // The front truss on its towers, the moving heads under it.
  const ty = h + 2.45;
  for (const sx of [-1, 1]) boxTruss(g, new THREE.Vector3(sx * (W / 2 - 0.9), h, front - 0.25), new THREE.Vector3(sx * (W / 2 - 0.9), ty, front - 0.25));
  boxTruss(g, new THREE.Vector3(-(W / 2 - 0.9), ty, front - 0.25), new THREE.Vector3(W / 2 - 0.9, ty, front - 0.25));
  const heads = ['#e040fb', '#40c4ff', '#fff59d', '#40c4ff', '#e040fb'];
  heads.forEach((k, i) => movingHead(g, -2.6 + i * 1.3, ty - 0.08, front - 0.25, k, 0));
  // In use the beams come down from the heads onto the deck.
  heads.forEach((k, i) => {
    const beam = part(use, cone(0.45, 2.1, 16), k, -2.6 + i * 1.3 + (i - 2) * -0.25, ty - 1.25, front - 0.65, { outline: false, material: new THREE.MeshBasicMaterial({ color: k, transparent: true, opacity: 0.13, depthWrite: false }) });
    beam.rotation.z = (i - 2) * 0.12;
    beam.castShadow = false;
  });
  // The floor wedges either side of the mic, the set list taped down by one.
  const mz = front - 0.45;
  for (const sx of [-1, 1]) {
    const w = frame(g, sx * 0.6, h, mz + 0.12, sx * 0.35 + Math.PI);
    part(w, rbox(0.46, 0.24, 0.32, 0.02), BLACK, 0, 0.12, 0, { rx: -0.45 });
    part(w, cyl(0.08, 0.08, 0.01, 16), '#55565e', 0, 0.16, 0.1, { rx: Math.PI / 2 - 0.45, outline: false });
  }
  label(g, 'SET LIST · 1 별빛 정류장 · 2 여름 끝 · 3 첫눈', 0.42, 0.05, 0.95, h + 0.003, mz + 0.05, '#fafafa', '#222', 0, -Math.PI / 2);
  // The mic near the lip, its head turned back to the singer behind it.
  part(g, cyl(0.13, 0.14, 0.02, 16), BLACK, 0, h + 0.01, mz);
  part(g, cyl(0.012, 0.012, 1.42, 6), CHROME, 0, h + 0.71, mz, { outline: false });
  const head = frame(g, 0, h + 1.44, mz, 0, 0.55);
  part(head, cyl(0.014, 0.014, 0.12, 8), BLACK, 0, 0, -0.06, { rx: Math.PI / 2 });
  part(head, ball(0.035), '#9ea7ad', 0, 0, -0.13);
  out.work = marker(g, 0, h + 1.46, mz - 0.1);
  out.stand = marker(g, 0, h, mz - 0.36);
}

/**
 * A seat of the house (공연장 객석 의자): a burgundy velvet tip-up seat and back on black standards, padded arms, the row's letter
 * on the end. Sat in to watch the show.
 */
function hallSeat(g: THREE.Group, out: Parameters<Builder>[6]) {
  const seatY = 0.45;
  for (const sx of [-1, 1]) {
    part(g, rbox(0.06, 0.6, 0.5, 0.02), '#202024', sx * 0.3, 0.3, -0.02);
    part(g, rbox(0.09, 0.05, 0.44, 0.02), '#2e2326', sx * 0.3, 0.62, 0);
  }
  part(g, rbox(0.52, 0.12, 0.44, 0.05), VELVET, 0, seatY - 0.06, 0.04);
  part(g, rbox(0.52, 0.72, 0.12, 0.06), VELVET, 0, seatY + 0.33, -0.2, { rx: -0.12 });
  part(g, rbox(0.52, 0.68, 0.03, 0.02), '#202024', 0, seatY + 0.32, -0.27, { rx: -0.12 });
  part(g, box(0.06, 0.03, 0.005), BRASS, 0, seatY + 0.62, -0.135, { rx: -0.12, outline: false });
  out.seat = marker(g, 0, seatY, 0.04);
}

/**
 * The box office and MD booth (매표소 · MD 부스, 2 × 1): a counter with the ticket window and its speaking slot, the 현장 수령 and
 * 예매 확인 signs, a card reader; beside it the MD shelf of the album in its versions, light sticks and photo cards, and the price
 * board. Against the lobby's wall.
 */
function boxOffice(g: THREE.Group, W: number, D: number) {
  const bz = -D / 2;
  const cz = bz + 0.32;
  // The counter.
  part(g, rbox(W - 0.1, 1.02, 0.5, 0.02), '#311b92', 0, 0.51, cz);
  part(g, rbox(W - 0.04, 0.04, 0.58, 0.01), '#f5f5f5', 0, 1.04, cz + 0.02);
  // The ticket window over the left half: a frame, the glass, the slot.
  const tx = -W / 4;
  part(g, box(W / 2 - 0.1, 0.06, 0.06), '#1d1d22', tx, 1.95, cz);
  for (const sx of [-1, 1]) part(g, box(0.05, 0.9, 0.06), '#1d1d22', tx + sx * (W / 4 - 0.07), 1.5, cz);
  part(g, box(W / 2 - 0.18, 0.84, 0.01), '#d7eef7', tx, 1.5, cz, { material: GLASS, outline: false });
  part(g, rbox(0.24, 0.04, 0.1, 0.01), STEEL, tx, 1.08, cz + 0.02);
  label(g, '매표소 · 현장 수령', W / 2 - 0.2, 0.13, tx, 2.06, cz + 0.035, '#ffd54f', '#311b92');
  label(g, '예매 확인 ▶ 신분증 지참', W / 2 - 0.3, 0.07, tx, 1.24, cz + 0.007, 'none', '#311b92');
  part(g, rbox(0.1, 0.03, 0.14, 0.01), '#263238', tx + 0.3, 1.075, cz + 0.12);
  // The MD shelf over the right half: albums face out, light sticks, photo cards.
  const mx = W / 4;
  part(g, rbox(W / 2 - 0.12, 0.9, 0.3, 0.02), '#f3e5f5', mx, 1.5, bz + 0.17);
  for (let r = 0; r < 2; r++) {
    part(g, box(W / 2 - 0.16, 0.02, 0.28), '#e1bee7', mx, 1.2 + r * 0.38, bz + 0.18, { outline: false });
    for (let i = 0; i < 4; i++) {
      const x = mx - 0.33 + i * 0.22;
      if (r === 0) part(g, box(0.16, 0.2, 0.03), ['#4a148c', '#ad1457', '#283593', '#fdd835'][i], x, 1.32, bz + 0.26, { rx: -0.15 });
      else {
        part(g, cyl(0.022, 0.018, 0.24, 10), '#fafafa', x, 1.72, bz + 0.25);
        part(g, ball(0.05), ['#e040fb', '#40c4ff', '#e040fb', '#40c4ff'][i], x, 1.86, bz + 0.25, { material: glow(['#e040fb', '#40c4ff', '#e040fb', '#40c4ff'][i]), outline: false });
      }
    }
  }
  label(g, 'OFFICIAL MD', W / 2 - 0.2, 0.1, mx, 2.03, bz + 0.33, '#4a148c', '#ffffff');
  label(g, '앨범 18,000 · 응원봉 45,000', W / 2 - 0.2, 0.07, mx, 1.07, cz + 0.255, '#fafafa', '#4a148c');
}

/**
 * A studio window (2 × 1): a deep wooden frame in the wall with two panes, the inner one angled (as
 * studio glass is, so it doesn't ring), the room beyond painted behind them, foam strips either side,
 * a sill; over it a sign — 녹음 중 lit red from the booth side, ON AIR from the control room's.
 */
function studioGlass(g: THREE.Object3D, W: number, D: number, beyond: 'control' | 'booth') {
  const bz = -D / 2;
  const ww = Math.min(1.5, W - 0.4);
  const wh = 0.9;
  const wy = 1.45;
  sheet(g, beyond === 'control' ? controlViewTex() : boothViewTex(), ww, wh, 0, wy, bz + 0.006);
  const fd = 0.12;
  part(g, box(ww + 0.12, 0.06, fd), WALNUT, 0, wy + wh / 2 + 0.03, bz + fd / 2);
  part(g, box(ww + 0.12, 0.05, fd + 0.08), WALNUT, 0, wy - wh / 2 - 0.025, bz + (fd + 0.08) / 2);
  for (const sx of [-1, 1]) part(g, box(0.06, wh, fd), WALNUT, sx * (ww / 2 + 0.03), wy, bz + fd / 2);
  part(g, box(ww, wh, 0.006), '#d7eef7', 0, wy, bz + 0.03, { material: GLASS, outline: false });
  const inner = part(g, box(ww, wh, 0.006), '#d7eef7', 0, wy, bz + 0.09, { material: GLASS, outline: false });
  inner.rotation.x = -0.06;
  part(g, box(0.05, wh * 0.8, 0.002), '#ffffff', -ww * 0.25, wy, bz + 0.1, { material: new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.25, depthWrite: false }), outline: false }).rotation.z = 0.5;
  // Foam strips either side.
  const geo = wedge(0.18, 3, 0.05);
  for (const sx of [-1, 1])
    for (let i = 0; i < 5; i++) part(g, geo, i % 2 ? FOAM_A : FOAM_B, sx * (ww / 2 + 0.16), wy - wh / 2 + 0.09 + i * 0.19, bz + 0.005, { outline: false, rz: i % 2 ? Math.PI / 2 : 0 });
  // The sign over it.
  const sy = wy + wh / 2 + 0.2;
  part(g, rbox(0.4, 0.13, 0.06, 0.015), BLACK, 0, sy, bz + 0.03);
  if (beyond === 'control') label(g, '● 녹음 중', 0.34, 0.09, 0, sy, bz + 0.062, '#b71c1c', '#ffebee');
  else label(g, 'ON AIR', 0.34, 0.09, 0, sy, bz + 0.062, '#b71c1c', '#ffebee');
  part(g, box(0.36, 0.1, 0.002), '#ff5252', 0, sy, bz + 0.0605, { material: glow('#ff1744'), outline: false });
  // A talkback speaker in the corner of the booth side; the control side gets a clock.
  if (beyond === 'control') {
    part(g, rbox(0.14, 0.2, 0.12, 0.02), BLACK, ww / 2 + 0.16, wy + wh / 2 + 0.2, bz + 0.07);
    part(g, cyl(0.045, 0.045, 0.01, 16), '#424242', ww / 2 + 0.16, wy + wh / 2 + 0.17, bz + 0.135, { rx: Math.PI / 2, outline: false });
  } else {
    part(g, cyl(0.12, 0.12, 0.03, 24), '#fafafa', -(ww / 2 + 0.16), wy + wh / 2 + 0.2, bz + 0.02, { rx: Math.PI / 2 });
    part(g, box(0.006, 0.08, 0.004), BLACK, -(ww / 2 + 0.16), wy + wh / 2 + 0.23, bz + 0.037, { outline: false });
    part(g, box(0.06, 0.006, 0.004), BLACK, -(ww / 2 + 0.16) + 0.025, wy + wh / 2 + 0.2, bz + 0.037, { outline: false });
  }
}

