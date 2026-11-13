import * as THREE from 'three';
import { CLUB_BAR, CLUB_BEAT, CRATE, DJ_DECK, SOUND_PHONE, STUDIO_EAR, clubPulse, digRound, djRound, pickedAt, toolPhase, type Motion } from '../activity';
import { deskChair, marker, rod, shade, spot, type Builder, type Spot } from '../parts';
import { ball, box, canvasTexture, cyl, part, rbox } from '../toon';

/**
 * The nightclub drawn as itself (2026-10-27 workplace pipeline, at the user's request). The DJ
 * booth stands out from the back wall and the DJ plays behind it, facing the floor: two silver
 * turntables with the records spinning and their tone arms down, a two-channel mixer between them
 * with its EQ knobs, filters, channel faders, crossfader and the level meters jumping on the beat,
 * the laptop on its stand with both decks' waveforms, booth monitors, the set list taped down and a
 * drink; the front lit with the club's name and a strip of colour. Behind it the DJ wears the
 * headphones one cup on, the other swung back: the left hand presses the cup to the ear to cue the
 * next record while the right nudges the platter, rides the EQ, sweeps the crossfader; then a
 * scratch with the left cutting the fader, the build with the hand rising, and the fist pumping on
 * the drop, the head nodding on every kick (activity.ts djRound). Everything in the club hits on the
 * same beat (clubPulse): the speaker stacks' cones and rings, the LED wall's visuals, the lit dance
 * floor, the moving heads, lasers and mirror ball on the truss over it, the fog on the drop. And what
 * it was missing: that LED wall, the dance floor and truss, the fog machine, the club's bar with
 * its stools, the VIP booth with bottle service, the producer's desk in the back room.
 */

const BLACK = '#1b1b20';
const PANEL = '#26262e';
const CHROME = '#dfe4e8';
const SILVER = '#b9bec4';
const STEEL = '#8d959d';
const BRASS = '#c9a24a';
const PAPER = '#fbf8f1';
const LEATHER = '#4a148c';
const FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
const HAND = '"Nanum Pen Script","Malgun Gothic","Apple SD Gothic Neo",cursive';
/** The club's colours, round and round with the bars. */
const HUES = ['#ff2d95', '#00e5ff', '#b388ff', '#76ff03', '#ffea00', '#ff6d00'];

/** Lit parts (LEDs, signs): one unlit material a colour, shared. */
const lit = new Map<string, THREE.MeshBasicMaterial>();
function glow(color: string): THREE.MeshBasicMaterial {
  let m = lit.get(color);
  if (!m) lit.set(color, (m = new THREE.MeshBasicMaterial({ color })));
  return m;
}
/** A lit part of this piece's own, its colour changed as the music goes. */
function own(m: THREE.Mesh, color: string, opacity = 1, additive = false): THREE.MeshBasicMaterial {
  const mat = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1 || additive, opacity, depthWrite: !(opacity < 1 || additive), blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, side: additive ? THREE.DoubleSide : THREE.FrontSide });
  m.material = mat;
  m.userData.ownMaterial = true;
  m.castShadow = false;
  return mat;
}
const GLASS = new THREE.MeshToonMaterial({ color: '#cfe8f5', transparent: true, opacity: 0.3, depthWrite: false });
const FACETS = new THREE.MeshPhongMaterial({ color: '#dfe6ee', specular: '#ffffff', shininess: 90, flatShading: true });

/** Shapes made once (never disposed, like toon.ts's shared geometry). */
const shapes = new Map<string, THREE.BufferGeometry>();
function shape(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
  let s = shapes.get(key);
  if (!s) shapes.set(key, (s = make()));
  return s;
}
const ring = (r: number, t: number, arc = Math.PI * 2) => shape(`ring${r},${t},${arc.toFixed(3)}`, () => new THREE.TorusGeometry(r, t, 8, 28, arc));
const cone = (r: number, h: number, seg = 12) => shape(`cone${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg));
const disc = (r: number, seg = 28) => shape(`disc${r},${seg}`, () => new THREE.CircleGeometry(r, seg));
/** A light's beam: an open cone `len` long, its tip at the origin and opening down -y. */
const beam = (r: number, len: number) => shape(`beam${r},${len}`, () => new THREE.ConeGeometry(r, len, 18, 1, true).translate(0, -len / 2, 0));
/** A laser line `len` long from the origin along +z. */
const line = (len: number) => shape(`line${len}`, () => new THREE.CylinderGeometry(0.006, 0.006, len, 5, 1, true).rotateX(Math.PI / 2).translate(0, 0, len / 2));
/** A mirror ball: a low sphere, flat-shaded so each facet catches the light. */
const MIRROR = new THREE.SphereGeometry(0.22, 16, 10);

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
function label(g: THREE.Object3D, text: string, w: number, h: number, x: number, y: number, z: number, bg: string, fg: string, ry = 0, rx = 0, font = FONT): THREE.Mesh {
  const ch = 64;
  const cw = Math.max(64, Math.round((ch * w) / h / 16) * 16);
  const tex = painted(`label|${text}|${bg}|${fg}|${cw}|${font}`, cw, ch, (c) => {
    if (bg !== 'none') {
      c.fillStyle = bg;
      c.fillRect(0, 0, cw, ch);
    }
    c.fillStyle = fg;
    c.font = `bold ${Math.round(ch * 0.6)}px ${font}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, cw / 2, ch * 0.54, cw * 0.94);
  });
  return sheet(g, tex, w, h, x, y, z, ry, rx);
}
/** Neon words: the tube's glow round lit letters, on nothing. */
function neon(g: THREE.Object3D, text: string, w: number, h: number, x: number, y: number, z: number, color: string, ry = 0): THREE.Mesh {
  const ch = 96;
  const cw = Math.max(96, Math.round((ch * w) / h / 16) * 16);
  const tex = painted(`neon|${text}|${color}|${cw}`, cw, ch, (c) => {
    c.font = `bold ${Math.round(ch * 0.62)}px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.shadowColor = color;
    c.shadowBlur = 18;
    c.strokeStyle = color;
    c.lineWidth = 6;
    c.strokeText(text, cw / 2, ch * 0.54, cw * 0.9);
    c.shadowBlur = 6;
    c.fillStyle = '#ffffff';
    c.fillText(text, cw / 2, ch * 0.54, cw * 0.9);
  });
  const m = sheet(g, tex, w, h, x, y, z, ry);
  (m.material as THREE.MeshBasicMaterial).depthWrite = false;
  return m;
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
/** How tall whoever's posed at a spot is (activity.ts spotPose marks it). */
const heightAt = (s: Spot) => (s.at.userData.height as number | undefined) ?? 1.6;
const tmpV = new THREE.Vector3();

// ---- The club's clock ----

/*
 * The lot's clock is only handed to a piece while it's used (Built.animate); the club's lights and
 * speakers play all night, used or not. They keep time from the last the lot said (the decks
 * hear it every frame they're played), running on by the wall clock in between, and draw
 * themselves just before they're rendered.
 */
let heardAt = { t: 0, ms: -1 };
function heard(t: number) {
  heardAt = { t, ms: performance.now() };
}
function clubNow(): number {
  const now = performance.now();
  return heardAt.ms < 0 ? now / 1000 : heardAt.t + (now - heardAt.ms) / 1000;
}
/** Runs `tick` with the club's time once a frame `m` is drawn. */
function always(m: THREE.Object3D, tick: (t: number) => void) {
  let last = -1;
  m.onBeforeRender = (renderer: THREE.WebGLRenderer) => {
    const f = renderer.info.render.frame;
    if (f === last) return;
    last = f;
    tick(clubNow());
  };
}
/** The colour of the bar `n` bars on (`k` brighter or darker). */
const hueOf = (t: number, n = 0) => HUES[(((Math.floor(t / CLUB_BAR) + n) % HUES.length) + HUES.length) % HUES.length];
const noPick = () => {};
/** Nothing under `g` is clicked on: a click goes through to the floor (or whoever's dancing there). */
function unpickable(g: THREE.Object3D) {
  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).raycast = noPick;
  });
}

// ---- Pictures ----

/** A record's centre label: a colour, the title round it. */
const recordLabelTex = (color: string, title: string) =>
  painted(`recLabel|${color}|${title}`, 128, 128, (c) => {
    c.fillStyle = color;
    c.beginPath();
    c.arc(64, 64, 62, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.9)';
    c.font = `bold 15px ${FONT}`;
    c.textAlign = 'center';
    c.fillText(title, 64, 40);
    c.font = `11px ${FONT}`;
    c.fillText('45 RPM · A', 64, 98);
    c.fillStyle = '#111';
    c.beginPath();
    c.arc(64, 64, 6, 0, Math.PI * 2);
    c.fill();
  });

/** The record's grooves: black, rings of sheen. */
const vinylTex = () =>
  painted('vinyl', 256, 256, (c) => {
    c.fillStyle = '#0d0d10';
    c.fillRect(0, 0, 256, 256);
    for (let r = 40; r < 128; r += 3) {
      c.strokeStyle = r % 9 === 1 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)';
      c.beginPath();
      c.arc(128, 128, r, 0, Math.PI * 2);
      c.stroke();
    }
    // The light catching it across.
    const g = c.createLinearGradient(0, 0, 256, 256);
    g.addColorStop(0.35, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.12)');
    g.addColorStop(0.65, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 256);
  });

/** The DJ laptop's screen: both decks' waveforms, the BPMs synced, the browser. */
const djScreenTex = () =>
  painted('djScreen', 320, 200, (c) => {
    c.fillStyle = '#0f1116';
    c.fillRect(0, 0, 320, 200);
    for (const [y, col, name] of [[8, '#4fc3f7', 'A  NOVA — Midnight Drive'], [58, '#ff8a65', 'B  달빛 골목 (Club Edit)']] as const) {
      c.fillStyle = '#1b1f27';
      c.fillRect(6, y, 308, 44);
      c.fillStyle = '#fff';
      c.font = `10px ${FONT}`;
      c.fillText(name, 10, y + 12);
      c.fillStyle = '#69f0ae';
      c.fillText('126.00 BPM  SYNC', 222, y + 12);
      c.fillStyle = col;
      for (let x = 10; x < 310; x += 2) {
        const a = 6 + 9 * Math.abs(Math.sin(x * 0.21) * Math.cos(x * 0.047));
        c.fillRect(x, y + 30 - a / 2, 1.4, a);
      }
      c.fillStyle = '#fff';
      c.fillRect(160, y + 16, 1.5, 28);
    }
    // The track list.
    const rows = ['Deep Pulse — Kaeo', 'Silver Tide Lights — DJ 리온', 'Neon Rain — Sora', '불꽃놀이 (VIP Mix)', 'Moonwalker — HYPER', 'Paper Sunrise — Mina'];
    rows.forEach((r, i) => {
      c.fillStyle = i === 2 ? '#283548' : i % 2 ? '#14171d' : '#181b22';
      c.fillRect(6, 110 + i * 14, 308, 14);
      c.fillStyle = '#cfd8dc';
      c.font = `10px ${FONT}`;
      c.fillText(r, 10, 121 + i * 14);
      c.fillText(`${124 + (i % 3)}`, 280, 121 + i * 14);
    });
  });

/** The set list taped to the booth. */
const setListTex = () =>
  painted('setList', 200, 260, (c) => {
    c.fillStyle = PAPER;
    c.fillRect(0, 0, 200, 260);
    c.fillStyle = '#222';
    c.font = `bold 20px ${HAND}`;
    c.fillText('SAT. SET 23:00~', 14, 30);
    c.font = `17px ${HAND}`;
    ['1. Deep Pulse', '2. Silver Tide +', '3. Neon Rain', '4. 불꽃놀이 ★DROP', '5. Moonwalker', '6. 신청곡!', '7. Paper Sunrise'].forEach((l, i) => c.fillText(l, 14, 64 + i * 27));
    c.strokeStyle = '#e53935';
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(80, 140, 78, 15, 0, 0, Math.PI * 2);
    c.stroke();
  });

/** An album sleeve's cover, one of a few. */
const COVERS: Array<[string, string, string]> = [
  ['#e91e63', '#ffeb3b', 'DISCO'],
  ['#1a237e', '#00e5ff', 'TECHNO'],
  ['#212121', '#ff5722', 'HOUSE'],
  ['#4caf50', '#fff176', 'FUNK'],
  ['#7b1fa2', '#ff80ab', 'K-POP'],
  ['#fafafa', '#212121', 'JAZZ'],
  ['#ff9800', '#3e2723', 'SOUL'],
  ['#00897b', '#e0f7fa', 'DEEP'],
];
const coverTex = (i: number) => {
  const [bg, fg, name] = COVERS[i % COVERS.length];
  return painted(`cover${i % COVERS.length}`, 128, 128, (c) => {
    c.fillStyle = bg;
    c.fillRect(0, 0, 128, 128);
    c.fillStyle = fg;
    switch (i % 4) {
      case 0:
        for (let r = 50; r > 0; r -= 12) {
          c.beginPath();
          c.arc(64, 58, r, 0, Math.PI * 2);
          c.strokeStyle = fg;
          c.lineWidth = 4;
          c.stroke();
        }
        break;
      case 1:
        for (let k = 0; k < 6; k++) c.fillRect(10 + k * 19, 100 - k * 14, 12, k * 14 + 8);
        break;
      case 2:
        c.beginPath();
        c.moveTo(64, 14);
        c.lineTo(112, 96);
        c.lineTo(16, 96);
        c.closePath();
        c.fill();
        break;
      default:
        c.fillRect(0, 50, 128, 18);
        c.fillRect(54, 0, 18, 128);
    }
    c.fillStyle = fg;
    c.font = `bold 18px ${FONT}`;
    c.textAlign = 'center';
    c.fillText(name, 64, 122);
  });
};

/** The LED wall's visuals, one a bar. */
const VISUALS = 5;
const visualTex = (i: number) =>
  painted(`ledVisual${i}`, 512, 288, (c) => {
    const W = 512;
    const H = 288;
    switch (i) {
      case 0: {
        // Synthwave: a sun over a grid, the club's name.
        const bg = c.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#12002a');
        bg.addColorStop(0.55, '#5c0a6e');
        bg.addColorStop(0.56, '#090014');
        bg.addColorStop(1, '#1a0033');
        c.fillStyle = bg;
        c.fillRect(0, 0, W, H);
        const sun = c.createLinearGradient(0, 40, 0, 160);
        sun.addColorStop(0, '#ffe259');
        sun.addColorStop(1, '#ff2d95');
        c.fillStyle = sun;
        c.beginPath();
        c.arc(W / 2, 158, 80, Math.PI, 0);
        c.fill();
        c.fillStyle = '#5c0a6e';
        for (let k = 0; k < 5; k++) c.fillRect(W / 2 - 90, 100 + k * 12, 180, 3 + k);
        c.strokeStyle = '#ff2d95';
        c.lineWidth = 2;
        for (let k = -10; k <= 10; k++) {
          c.beginPath();
          c.moveTo(W / 2 + k * 14, 160);
          c.lineTo(W / 2 + k * 70, H);
          c.stroke();
        }
        for (let k = 0; k < 7; k++) {
          const y = 160 + (k * k * 128) / 49;
          c.beginPath();
          c.moveTo(0, y);
          c.lineTo(W, y);
          c.stroke();
        }
        c.font = `bold 64px ${FONT}`;
        c.textAlign = 'center';
        c.shadowColor = '#00e5ff';
        c.shadowBlur = 20;
        c.fillStyle = '#e0ffff';
        c.fillText('N O V A', W / 2, 74);
        break;
      }
      case 1: {
        // A tunnel of rings.
        c.fillStyle = '#000';
        c.fillRect(0, 0, W, H);
        for (let k = 14; k > 0; k--) {
          c.strokeStyle = k % 2 ? '#00e5ff' : '#ff2d95';
          c.lineWidth = 2 + k * 0.8;
          c.beginPath();
          c.ellipse(W / 2, H / 2, k * 20, k * 12, 0, 0, Math.PI * 2);
          c.stroke();
        }
        break;
      }
      case 2: {
        // A kaleidoscope of triangles.
        c.fillStyle = '#0a0a12';
        c.fillRect(0, 0, W, H);
        for (let y = 0; y < 6; y++)
          for (let x = 0; x < 12; x++) {
            c.fillStyle = HUES[(x + y * 3) % HUES.length];
            c.globalAlpha = 0.35 + ((x * 7 + y * 3) % 5) * 0.13;
            c.beginPath();
            const up = (x + y) % 2 === 0;
            c.moveTo(x * 44, up ? y * 48 + 48 : y * 48);
            c.lineTo(x * 44 + 44, up ? y * 48 + 48 : y * 48);
            c.lineTo(x * 44 + 22, up ? y * 48 : y * 48 + 48);
            c.fill();
          }
        c.globalAlpha = 1;
        break;
      }
      case 3: {
        // The night's poster: the DJ's name, the date.
        const bg = c.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, '#311b92');
        bg.addColorStop(1, '#b71c1c');
        c.fillStyle = bg;
        c.fillRect(0, 0, W, H);
        c.textAlign = 'center';
        c.fillStyle = '#fff';
        c.font = `bold 28px ${FONT}`;
        c.fillText('SATURDAY NIGHT LIVE SET', W / 2, 70);
        c.font = `bold 72px ${FONT}`;
        c.shadowColor = '#ffea00';
        c.shadowBlur = 16;
        c.fillText('DJ NIGHT', W / 2, 160);
        c.shadowBlur = 0;
        c.font = `24px ${FONT}`;
        c.fillText('클럽 노바 · 126 BPM · 새벽 5시까지', W / 2, 220);
        break;
      }
      default: {
        // A waveform scrolling across.
        c.fillStyle = '#000814';
        c.fillRect(0, 0, W, H);
        for (const [col, a, f] of [['#00e5ff', 70, 0.031], ['#ff2d95', 50, 0.047], ['#76ff03', 30, 0.07]] as const) {
          c.strokeStyle = col;
          c.lineWidth = 3;
          c.beginPath();
          for (let x = 0; x <= W; x += 4) {
            const y = H / 2 + a * Math.sin(x * f) * Math.cos(x * 0.011);
            if (x === 0) c.moveTo(x, y);
            else c.lineTo(x, y);
          }
          c.stroke();
        }
      }
    }
  });

/** The phone's sound meter. */
const meterTex = () =>
  painted('splMeter', 96, 192, (c) => {
    c.fillStyle = '#101418';
    c.fillRect(0, 0, 96, 192);
    c.fillStyle = '#9e9e9e';
    c.font = `11px ${FONT}`;
    c.fillText('SPL METER', 8, 18);
    c.fillStyle = '#76ff03';
    c.font = `bold 30px ${FONT}`;
    c.fillText('102', 10, 60);
    c.font = `12px ${FONT}`;
    c.fillText('dB(A)', 62, 60);
    for (let k = 0; k < 14; k++) {
      const h = 20 + 50 * Math.abs(Math.sin(k * 0.9)) * (1 - k / 22);
      c.fillStyle = k < 4 ? '#ff5252' : k < 9 ? '#ffd740' : '#69f0ae';
      c.fillRect(6 + k * 6, 170 - h, 4, h);
    }
  });

/** The producer's DAW: an arrangement of a track, clips in colours. */
const dawTex = () =>
  painted('ncDaw', 320, 190, (c) => {
    c.fillStyle = '#1e2026';
    c.fillRect(0, 0, 320, 190);
    c.fillStyle = '#2c2f38';
    c.fillRect(0, 0, 320, 18);
    c.fillStyle = '#ddd';
    c.font = `10px ${FONT}`;
    c.fillText('달빛골목_ClubEdit_v4 · 126 BPM · Am', 8, 13);
    const tracks: Array<[string, string]> = [['KICK', '#ff5252'], ['BASS', '#ffab40'], ['SYNTH', '#40c4ff'], ['VOX', '#e040fb'], ['FX', '#69f0ae'], ['HATS', '#ffd740']];
    tracks.forEach(([n, col], i) => {
      const y = 24 + i * 26;
      c.fillStyle = '#353945';
      c.fillRect(0, y, 44, 22);
      c.fillStyle = '#eee';
      c.fillText(n, 5, y + 15);
      c.fillStyle = col;
      for (let x = 48; x < 316; x += 34) if ((x + i * 17) % 5 !== 0) c.fillRect(x, y + 2, 30, 18);
    });
    c.fillStyle = '#fff';
    c.fillRect(180, 20, 1.5, 170);
  });

/** The producer's second screen: the mixer and a synth's knobs. */
const synthTex = () =>
  painted('ncSynth', 320, 190, (c) => {
    c.fillStyle = '#23262e';
    c.fillRect(0, 0, 320, 190);
    for (let i = 0; i < 12; i++) {
      c.fillStyle = '#15171c';
      c.fillRect(10 + i * 25, 20, 18, 120);
      c.fillStyle = i % 3 ? '#69f0ae' : '#ffd740';
      const h = 30 + ((i * 37) % 80);
      c.fillRect(13 + i * 25, 140 - h, 12, h);
    }
    c.fillStyle = '#90caf9';
    c.font = `11px ${FONT}`;
    c.fillText('MASTER  -6.0 dB   LIMITER ON', 10, 170);
  });

// ---- Small things ----

/**
 * DJ headphones on the head: the band over the top, the left cup (the DJ's left, -x here as they
 * face -z) on the ear, the right swung back off it behind the head, as DJs wear them. Centred at the
 * ears.
 */
function djHeadphones(g: THREE.Object3D, onEar = true): THREE.Group {
  const h = new THREE.Group();
  g.add(h);
  const side = STUDIO_EAR.side + 0.012;
  const band = part(h, ring(side, 0.01, Math.PI), BLACK, 0, 0.02, 0, { outline: false });
  band.scale.set(1, 1.18, 1);
  part(h, ring(side - 0.005, 0.013, Math.PI * 0.55), '#3a3a42', 0, 0.026, 0, { rz: Math.PI * 0.225, outline: false }).scale.set(1, 1.12, 1);
  const cup = (parent: THREE.Object3D, sx: number) => {
    part(parent, cyl(0.046, 0.046, 0.034, 16), BLACK, sx * 0.006, 0, 0, { rz: Math.PI / 2 });
    part(parent, cyl(0.034, 0.034, 0.004, 14), SILVER, sx * 0.024, 0, 0, { rz: Math.PI / 2, outline: false });
    part(parent, cyl(0.04, 0.04, 0.014, 16), '#2e2e34', -sx * 0.016, 0, 0, { rz: Math.PI / 2, outline: false });
  };
  const left = frame(h, -side, -0.01, 0);
  cup(left, -1);
  // The right swivelled back on its yoke, off the ear.
  const right = frame(h, side + (onEar ? 0 : 0.015), onEar ? -0.01 : 0.01, onEar ? 0 : 0.07, onEar ? 0 : -0.9);
  cup(right, 1);
  return h;
}

/** A champagne bottle, `lit` with a sparkler fountain in its neck. */
function bottle(g: THREE.Object3D, x: number, y: number, z: number, tilt = 0): THREE.Group {
  const b = frame(g, x, y, z, 0, tilt);
  part(b, cyl(0.04, 0.042, 0.2, 14), '#1b3a1b', 0, 0.1, 0);
  part(b, cyl(0.016, 0.04, 0.08, 14), '#1b3a1b', 0, 0.24, 0);
  part(b, cyl(0.018, 0.016, 0.05, 10), BRASS, 0, 0.3, 0);
  part(b, box(0.05, 0.06, 0.002), '#f5e6b8', 0, 0.12, 0.041, { outline: false });
  return b;
}

/** A turntable, its platter at `px`: the silver plinth, the platter's strobe dots, the record, the tone arm down, the pitch fader, the start button. Returns the platter (spun round y). */
function turntable(g: THREE.Object3D, px: number, top: number, pz: number, labelColor: string, title: string): THREE.Group {
  const R = DJ_DECK.platterR;
  // The plinth, wider to the tone arm's side (+x).
  const cx = px + 0.04;
  part(g, rbox(0.45, 0.085, 0.36, 0.015), SILVER, cx, top + 0.0425, pz);
  part(g, box(0.43, 0.004, 0.34), '#2b2b30', cx, top + 0.0855, pz, { outline: false });
  // Feet.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.025, 0.028, 0.012, 12), BLACK, cx + sx * 0.19, top + 0.003, pz + sz * 0.15, { outline: false });
  const platter = frame(g, px, top + 0.088, pz);
  part(platter, cyl(R + 0.005, R + 0.005, 0.016, 32), SILVER, 0, 0.008, 0);
  // The strobe dots round the platter's rim.
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    part(platter, box(0.006, 0.006, 0.002), '#55595e', Math.cos(a) * (R + 0.0055), 0.008, Math.sin(a) * (R + 0.0055), { ry: -a, outline: false });
  }
  // The slipmat and the record on it.
  part(platter, cyl(R - 0.002, R - 0.002, 0.003, 32), '#2c2c30', 0, 0.0175, 0, { outline: false });
  const rec = new THREE.Mesh(disc(R - 0.004, 40), new THREE.MeshBasicMaterial({ map: vinylTex() }));
  rec.rotation.x = -Math.PI / 2;
  rec.position.y = 0.0195;
  platter.add(rec);
  const lab = new THREE.Mesh(disc(0.045, 24), new THREE.MeshBasicMaterial({ map: recordLabelTex(labelColor, title) }));
  lab.rotation.x = -Math.PI / 2;
  lab.position.y = 0.0198;
  platter.add(lab);
  part(platter, cyl(0.004, 0.004, 0.02, 8), CHROME, 0, 0.026, 0, { outline: false });
  // The tone arm: its base at the back right, the counterweight, the arm down to the record.
  const ax = px + 0.19;
  const az = pz - 0.11;
  part(g, cyl(0.03, 0.032, 0.025, 16), SILVER, ax, top + 0.1, az);
  part(g, cyl(0.016, 0.016, 0.03, 12), '#3a3a40', ax, top + 0.125, az + 0.035, { rx: Math.PI / 2 });
  const tip = new THREE.Vector3(px + 0.07, top + 0.118, pz + 0.075);
  rod(g, new THREE.Vector3(ax, top + 0.122, az), new THREE.Vector3(ax - 0.02, top + 0.122, pz + 0.04), 0.004, CHROME);
  rod(g, new THREE.Vector3(ax - 0.02, top + 0.122, pz + 0.04), tip, 0.004, CHROME);
  part(g, box(0.02, 0.008, 0.034), BLACK, tip.x, tip.y - 0.004, tip.z, { ry: 0.6 });
  // The arm rest, the pitch fader along the right, the start/stop button, the 33/45 buttons.
  part(g, cyl(0.004, 0.004, 0.03, 6), CHROME, ax - 0.005, top + 0.1, pz + 0.06, { outline: false });
  part(g, box(0.012, 0.004, 0.16), '#111', px + 0.2, top + 0.087, pz + 0.07, { outline: false });
  part(g, box(0.026, 0.012, 0.016), '#d0d4d8', px + 0.2, top + 0.093, pz + 0.07);
  part(g, rbox(0.05, 0.01, 0.034, 0.004), '#d0d4d8', px - 0.14, top + 0.09, pz + 0.15);
  for (const dx of [-0.08, -0.05]) part(g, rbox(0.022, 0.008, 0.014, 0.003), '#d0d4d8', px + dx, top + 0.089, pz + 0.155);
  part(g, ball(0.004), '#ff5252', px - 0.165, top + 0.096, pz + 0.155, { outline: false, material: glow('#ff5252') });
  return platter;
}

// ---- The pieces ----

// ---- The door and the room round the floor (2026-11-05, the layout audit): set dressing, nothing moves ----

/** 신분증 확인·입장 카운터: a black counter, the cash box and the card reader, a UV torch for IDs, wristbands on a spike, the door price and '신분증 필수' on its front; a stool behind. */
function doorDesk(g: THREE.Group, W: number, D: number) {
  const w = W - 0.2;
  const zc = -0.05;
  const top = 1.05;
  part(g, rbox(w, top, 0.55, 0.02), BLACK, 0, top / 2, zc);
  part(g, rbox(w + 0.04, 0.04, 0.62, 0.01), PANEL, 0, top + 0.02, zc);
  part(g, box(w - 0.06, 0.02, 0.008), '#ff2d95', 0, top - 0.06, zc + 0.282, { outline: false, material: glow('#ff2d95') });
  label(g, '입장료 20,000원 · 1드링크', 0.9, 0.12, 0, 0.75, zc + 0.285, BLACK, '#ffffff');
  label(g, '신분증 필수 · 만 19세 이상', 0.9, 0.11, 0, 0.55, zc + 0.285, BLACK, '#ffea00');
  // On top: the cash box, the card reader, the UV torch, the wristbands on their spike.
  part(g, rbox(0.34, 0.1, 0.24, 0.01), '#455a64', -0.45, top + 0.09, zc - 0.05);
  part(g, rbox(0.1, 0.03, 0.16, 0.01), '#212121', 0.05, top + 0.055, zc + 0.05);
  part(g, box(0.07, 0.004, 0.06), '#4fc3f7', 0.05, top + 0.072, zc + 0.03, { outline: false, material: glow('#4fc3f7') });
  part(g, cyl(0.02, 0.02, 0.16, 8), '#311b92', 0.3, top + 0.04, zc + 0.08, { rz: Math.PI / 2 });
  part(g, cyl(0.006, 0.006, 0.2, 6), CHROME, 0.62, top + 0.12, zc - 0.05);
  for (let i = 0; i < 5; i++) part(g, cyl(0.045, 0.045, 0.012, 12), HUES[i % HUES.length], 0.62, top + 0.05 + i * 0.016, zc - 0.05, { outline: false });
  // The stool behind.
  part(g, cyl(0.17, 0.17, 0.05, 14), '#3e2723', 0.1, 0.72, zc - 0.55);
  part(g, cyl(0.025, 0.025, 0.7, 8), CHROME, 0.1, 0.36, zc - 0.55);
  part(g, cyl(0.2, 0.22, 0.03, 14), CHROME, 0.1, 0.015, zc - 0.55);
  void D;
}

/** 물품 보관소: the counter with its numbered tags on a board and a bell, the rail of coats and the shelves of bags behind it. */
function coatCheck(g: THREE.Group, W: number, D: number) {
  const w = W - 0.12;
  const back = -D / 2 + 0.1;
  // The rail of coats and the bag shelves along the back.
  for (const sx of [-1, 1]) part(g, cyl(0.02, 0.02, 1.7, 8), STEEL, sx * (w / 2 - 0.05), 0.85, back + 0.12);
  part(g, cyl(0.016, 0.016, w - 0.1, 8), STEEL, 0, 1.6, back + 0.12, { rz: Math.PI / 2 });
  const COATS = ['#212121', '#5d4037', '#37474f', '#880e4f', '#1a237e', '#424242', '#bf360c'];
  COATS.forEach((c, i) => {
    const x = -w / 2 + 0.2 + i * ((w - 0.4) / (COATS.length - 1));
    part(g, rbox(0.2, 0.75, 0.16, 0.04), c, x, 1.18, back + 0.12);
    part(g, rbox(0.06, 0.04, 0.03, 0.01), '#fff8e1', x, 0.85, back + 0.21);
  });
  // The counter in front.
  const cz = 0.12;
  part(g, rbox(w, 1.0, 0.32, 0.02), '#26262e', 0, 0.5, cz);
  part(g, rbox(w + 0.04, 0.04, 0.38, 0.01), BRASS, 0, 1.02, cz);
  label(g, 'CLOAK · 물품 보관 3,000원', 1.1, 0.13, 0, 0.72, cz + 0.165, '#26262e', '#ffd54f');
  part(g, cyl(0.05, 0.06, 0.04, 14), BRASS, 0.55, 1.06, cz);
  part(g, ball(0.012), BRASS, 0.55, 1.09, cz);
  for (let i = 0; i < 6; i++) part(g, rbox(0.05, 0.003, 0.08, 0.002), '#fff8e1', -0.55 + i * 0.08, 1.042, cz, { outline: false });
}

/** 스탠딩 테이블: a round high top on a chrome pole, a drink or two on it and a lit ring under the rim. */
function highTable(g: THREE.Group, _W?: number, _D?: number) {
  part(g, cyl(0.3, 0.3, 0.04, 22), '#1b1b20', 0, 1.08, 0);
  part(g, cyl(0.3, 0.3, 0.01, 22), '#b388ff', 0, 1.055, 0, { outline: false, material: glow('#b388ff') });
  part(g, cyl(0.035, 0.035, 1.06, 10), CHROME, 0, 0.53, 0);
  part(g, cyl(0.24, 0.26, 0.03, 18), CHROME, 0, 0.015, 0);
  part(g, cyl(0.035, 0.03, 0.12, 10), '#ff6d00', 0.1, 1.16, 0.06, { outline: false });
  part(g, cyl(0.03, 0.025, 0.16, 10), '#00e5ff', -0.08, 1.18, -0.05, { outline: false });
}

/** 입장 대기 줄 펜스: brass posts and red velvet ropes along the pavement, where the queue waits its turn at the door. */
function queueRope(g: THREE.Group, _W?: number, _D?: number) {
  const xs = [-0.85, 0, 0.85];
  for (const x of xs) {
    part(g, cyl(0.13, 0.15, 0.04, 16), BRASS, x, 0.02, 0);
    part(g, cyl(0.025, 0.025, 0.9, 8), BRASS, x, 0.47, 0);
    part(g, ball(0.045), BRASS, x, 0.95, 0);
  }
  for (let i = 0; i < xs.length - 1; i++) {
    const mx = (xs[i] + xs[i + 1]) / 2;
    part(g, cyl(0.022, 0.022, 0.42, 8), '#b71c1c', mx - 0.2, 0.8, 0, { rz: Math.PI / 2 - 0.22 });
    part(g, cyl(0.022, 0.022, 0.42, 8), '#b71c1c', mx + 0.2, 0.8, 0, { rz: Math.PI / 2 + 0.22 });
  }
}

/** 클럽 네온 간판: the club's name in neon on a black board on two legs against the front wall, an arrow down the stairs, the opening hours. */
function neonSign(g: THREE.Group, W: number, D: number) {
  const back = -D / 2 + 0.08;
  for (const sx of [-1, 1]) part(g, box(0.06, 2.1, 0.06), '#212121', sx * (W / 2 - 0.25), 1.05, back);
  part(g, rbox(W - 0.3, 0.8, 0.06, 0.02), '#101016', 0, 1.9, back);
  neon(g, 'NOVA', 1.1, 0.44, 0, 1.98, back + 0.04, '#ff2d95');
  label(g, 'CLUB · B1 ↓', 0.6, 0.12, 0, 1.66, back + 0.04, '#101016', '#00e5ff');
  part(g, rbox(0.7, 0.3, 0.04, 0.01), '#101016', 0, 1.0, back);
  label(g, '목–토 22:00–05:00', 0.6, 0.11, 0, 1.0, back + 0.025, '#101016', '#ffffff');
}

export const BUILDERS: Record<string, Builder> = {
  ncDoorDesk(g, W, D) {
    doorDesk(g, W, D);
  },
  ncCoatCheck(g, W, D) {
    coatCheck(g, W, D);
  },
  ncHighTable(g, W, D) {
    highTable(g, W, D);
  },
  ncQueueRope(g, W, D) {
    queueRope(g, W, D);
  },
  ncNeonSign(g, W, D) {
    neonSign(g, W, D);
  },
  /**
   * The DJ booth (DJ 부스, 2 × 1): a black console with chrome trim and a lit front — the club's name
   * backlit, a strip of colour along the top and the foot changing with the music; on top a pair of
   * silver turntables (the strobe dots round the platters, the records spinning with their labels,
   * the tone arms down, the pitch faders) and the mixer between them (gain, three-band EQ and filter
   * knobs a channel, the channel faders, the crossfader, the level meters jumping), the laptop on its
   * stand with both decks' waveforms synced, a booth monitor either side, the set list taped down, a
   * drink, USB sticks; the headphones on the desk until they're on. Where it stands out from a wall
   * the DJ plays behind it facing the room; pushed against one, from the front. Mixing, the set and
   * the beat-matching drill: djMix; peak time: djPeak (the drop every four bars).
   */
  djBooth(g, W, D, _c, _def, ctx, out) {
    const use = inUse(g, out);
    const off = idle(g, out);
    // Everything's drawn with the DJ at +z; turned round to face the room where it stands out from a wall.
    const rig = frame(g, 0, 0, 0, ctx.againstWall ? 0 : Math.PI);
    const rigUse = frame(use, 0, 0, 0, ctx.againstWall ? 0 : Math.PI);
    const rigOff = frame(off, 0, 0, 0, ctx.againstWall ? 0 : Math.PI);
    const bw = Math.min(1.94, W - 0.06);
    const top = 0.95;
    const back = -D / 2 + 0.05;
    const front = 0.24;
    const depth = front - back;
    const cz = (front + back) / 2;
    // The console: the body, its top, chrome trim along the edges.
    part(rig, rbox(bw, top - 0.02, depth, 0.02), BLACK, 0, (top - 0.02) / 2, cz);
    part(rig, rbox(bw + 0.03, 0.035, depth + 0.03, 0.01), PANEL, 0, top - 0.0175, cz);
    for (const z of [back - 0.016, front + 0.016]) part(rig, box(bw + 0.03, 0.012, 0.006), CHROME, 0, top - 0.02, z, { outline: false });
    // The room's side (-z): the name backlit, the colour strips along the top and the foot.
    const fz = back - 0.012;
    part(rig, box(bw - 0.12, 0.62, 0.01), '#101016', 0, 0.5, fz, { outline: false });
    const logo = neon(rig, 'NOVA', 0.9, 0.28, 0, 0.55, fz - 0.008, '#00e5ff', Math.PI);
    logo.renderOrder = 2;
    label(rig, 'CLUB · SEOUL', 0.5, 0.06, 0, 0.33, fz - 0.008, 'none', '#b388ff', Math.PI);
    const strip = part(rig, box(bw - 0.04, 0.025, 0.012), '#ff2d95', 0, top - 0.07, fz - 0.004, { outline: false });
    const foot = part(rig, box(bw - 0.04, 0.02, 0.012), '#ff2d95', 0, 0.06, fz - 0.004, { outline: false });
    const stripMat = own(strip, '#ff2d95');
    foot.material = stripMat;
    foot.castShadow = false;
    // The decks: work is the mixer's top middle.
    const mz = 0.05;
    const mixTop = top + 0.08;
    const L = turntable(rig, -DJ_DECK.platter, top, mz, '#e53935', 'NOVA');
    const R = turntable(rig, DJ_DECK.platter, top, mz, '#1e88e5', '달빛 골목');
    // The mixer: a black box, its faceplate, the knobs by channel (the DJ's left channel at -x).
    part(rig, rbox(0.3, 0.08, 0.32, 0.012), '#202026', 0, top + 0.04, mz);
    part(rig, box(0.28, 0.003, 0.3), '#33333b', 0, mixTop + 0.0015, mz, { outline: false });
    label(rig, 'NOVA MIX-2', 0.12, 0.016, 0, mixTop + 0.004, mz - 0.135, 'none', '#bbb', 0, -Math.PI / 2);
    const knobAt = (x: number, z: number, color = '#cfd2d6') => {
      const k = frame(rig, x, mixTop + 0.003, z);
      part(k, cyl(0.011, 0.012, 0.018, 12), '#1a1a1e', 0, 0.009, 0, { outline: false });
      part(k, cyl(0.0105, 0.0105, 0.002, 12), color, 0, 0.019, 0, { outline: false });
      part(k, box(0.002, 0.003, 0.009), '#fff', 0, 0.021, -0.005, { outline: false });
      return k;
    };
    const rightKnobs: THREE.Group[] = [];
    for (const sx of [-1, 1]) {
      const x = sx * DJ_DECK.eqSide;
      knobAt(x, mz - 0.115, '#9e9e9e');
      DJ_DECK.eqRows.forEach((a) => {
        const k = knobAt(x, mz - a);
        if (sx > 0) rightKnobs.push(k);
      });
      const f = knobAt(x, mz - DJ_DECK.filterAhead, '#4fc3f7');
      if (sx > 0) rightKnobs.push(f);
      // The channel fader.
      part(rig, box(0.004, 0.002, 0.06), '#0b0b0e', x, mixTop + 0.004, mz + 0.085, { outline: false });
      part(rig, rbox(0.022, 0.014, 0.012, 0.003), '#e0e0e0', x, mixTop + 0.01, mz + 0.07);
      // The cue button.
      part(rig, rbox(0.018, 0.006, 0.012, 0.002), '#ff9800', x, mixTop + 0.005, mz + 0.035);
    }
    // The crossfader's slot and knob.
    part(rig, box(DJ_DECK.fader.travel * 2 + 0.02, 0.002, 0.005), '#0b0b0e', 0, mixTop + 0.004, mz - DJ_DECK.fader.ahead, { outline: false });
    const xf = part(rig, rbox(0.012, 0.016, 0.022, 0.003), '#f5f5f5', 0, mixTop + DJ_DECK.fader.up, mz - DJ_DECK.fader.ahead);
    // The level meters: two columns of LEDs in the middle.
    const meters: THREE.Mesh[][] = [[], []];
    const ledCols = ['#69f0ae', '#69f0ae', '#69f0ae', '#69f0ae', '#69f0ae', '#ffd740', '#ffd740', '#ff5252'];
    for (const [c, x] of [[0, -0.012], [1, 0.012]] as const)
      for (let i = 0; i < 8; i++) {
        const z = mz + 0.02 - i * 0.013;
        part(rig, box(0.008, 0.002, 0.008), '#262a2e', x, mixTop + 0.004, z, { outline: false });
        const led = part(rigUse, box(0.008, 0.003, 0.008), ledCols[i], x, mixTop + 0.005, z, { outline: false, material: glow(ledCols[i]) });
        meters[c].push(led);
      }
    // The laptop on its stand behind the mixer, its screen to the DJ.
    const lz = mz - 0.3;
    rod(rig, new THREE.Vector3(-0.1, top, lz), new THREE.Vector3(-0.1, top + 0.14, lz + 0.04), 0.008, STEEL);
    rod(rig, new THREE.Vector3(0.1, top, lz), new THREE.Vector3(0.1, top + 0.14, lz + 0.04), 0.008, STEEL);
    const lap = frame(rig, 0, top + 0.15, lz + 0.03, 0, -0.35);
    part(lap, rbox(0.34, 0.012, 0.23, 0.006), '#b0bec5', 0, 0, 0);
    const lid = frame(lap, 0, 0.006, -0.115, 0, 0.35 - 1.65);
    part(lid, rbox(0.34, 0.008, 0.22, 0.006), '#b0bec5', 0, 0, 0.11);
    // The screen shows only while it's played (dark otherwise).
    const scr = sheet(lid, djScreenTex(), 0.31, 0.195, 0, 0.0045, 0.11, 0, -Math.PI / 2);
    scr.visible = false;
    const dark = part(lid, box(0.31, 0.001, 0.195), '#14161b', 0, 0.0042, 0.11, { outline: false });
    // The booth monitors, turned in to the DJ.
    for (const sx of [-1, 1]) {
      const mon = frame(rig, sx * (bw / 2 - 0.13), top, mz - 0.18, sx * -0.35);
      part(mon, rbox(0.2, 0.3, 0.2, 0.02), BLACK, 0, 0.15, 0);
      part(mon, cyl(0.065, 0.065, 0.01, 20), '#3a3a42', 0, 0.12, 0.101, { rx: Math.PI / 2, outline: false });
      part(mon, cyl(0.022, 0.022, 0.012, 14), '#55565e', 0, 0.24, 0.101, { rx: Math.PI / 2, outline: false });
    }
    // The set list taped down, a drink with a straw, USB sticks, a towel.
    sheet(rig, setListTex(), 0.14, 0.18, bw / 2 - 0.16, top + 0.002, mz + 0.12, 0.15, -Math.PI / 2);
    part(rig, cyl(0.035, 0.028, 0.11, 14), '#e3f2fd', -(bw / 2 - 0.12), top + 0.055, mz + 0.1, { material: GLASS });
    part(rig, cyl(0.03, 0.025, 0.07, 14), '#ff8a65', -(bw / 2 - 0.12), top + 0.037, mz + 0.1, { outline: false });
    rod(rig, new THREE.Vector3(-(bw / 2 - 0.12), top + 0.04, mz + 0.1), new THREE.Vector3(-(bw / 2 - 0.105), top + 0.15, mz + 0.09), 0.003, '#ff4081');
    for (const [x, col] of [[0.2, '#ffca28'], [0.23, '#e53935']] as const) part(rig, rbox(0.018, 0.008, 0.045, 0.003), col, x, top + 0.004, mz + 0.19, { ry: 0.3 });
    part(rig, rbox(0.2, 0.02, 0.12, 0.01), '#eceff1', -(bw / 2 - 0.15), top + 0.01, mz - 0.12, { ry: 0.2 });
    // The headphones on the desk, idle; on the DJ while they play.
    const rest = frame(rigOff, 0.0, top + 0.03, mz + 0.2, 0, -Math.PI / 2);
    djHeadphones(rest, true);
    const on = djHeadphones(rigUse, false);
    const djZ = 0.5;
    const work = marker(rig, 0, mixTop, mz);
    const mix = stoodAt(rig, 0, djZ, 'djMix', work);
    const peak = stoodAt(rig, 0, djZ, 'djPeak', work);
    out.spots = { '*': mix, mixTracks: mix, playSet: mix, dj_beatmatchDrill: mix, peakTimeSet: peak };
    out.work = work;
    let playing = -1;
    // The strips on the front keep time all night; the laptop goes dark when nobody's playing.
    always(strip, (t) => {
      const p = clubPulse(t);
      stripMat.color.set(hueOf(t)).multiplyScalar(0.45 + 0.55 * p);
      const on = playing >= 0 && performance.now() - playing < 600;
      scr.visible = on;
      dark.visible = !on;
    });
    out.animate = (t) => {
      heard(t);
      playing = performance.now();
      const isPeak = posed(peak, t);
      const d = djRound(t, isPeak);
      const spin = t * 3.49;
      L.rotation.y = -spin;
      R.rotation.y = -spin - d.scratch;
      xf.position.x = -d.fader * DJ_DECK.fader.travel;
      rightKnobs.forEach((k, i) => (k.rotation.y = i === d.knob ? -d.knobTurn : 0));
      const p = clubPulse(t);
      meters.forEach((col, c) => {
        const n = Math.round(3 + 5 * p * (c ? 0.9 + 0.1 * Math.sin(t * 7) : 1));
        col.forEach((led, i) => (led.visible = i < n));
      });
      const h = isPeak ? heightAt(peak) : heightAt(mix);
      const k = h / 1.6;
      on.position.set(0, h - STUDIO_EAR.down * k, djZ - STUDIO_EAR.ahead * k);
      on.scale.setScalar(k);
    };
  },

  /**
   * A speaker stack (클럽 스피커, 1 × 1): an 18" sub on the floor and a two-way top on it — two
   * woofers and a horn — black grilles, the club's badge, a ring of light round each woofer; the
   * cones kick out on every beat and the rings flash with it, all night. Sound check: stood out in
   * front with the phone's sound meter up, a hand cupped behind the ear (soundCheck); stage stamina:
   * dancing it out in front of it, turned to the room.
   */
  clubSpeaker(g, _W, D, _c, _def, _ctx, out) {
    const use = inUse(g, out);
    const bz = -D / 2;
    const sw = 0.66;
    const sd = 0.6;
    const zc = bz + 0.04 + sd / 2;
    const zf = zc + sd / 2;
    // The sub.
    const sub = part(g, rbox(sw, 0.66, sd, 0.02), BLACK, 0, 0.36, zc);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, cyl(0.03, 0.03, 0.03, 10), '#111', sx * 0.26, 0.015, zc + sz * 0.22, { outline: false });
    part(g, box(sw - 0.06, 0.6, 0.01), '#111115', 0, 0.36, zf + 0.002, { outline: false });
    const cones: THREE.Object3D[] = [];
    const rings: THREE.MeshBasicMaterial[] = [];
    const woofer = (y: number, r: number) => {
      part(g, cyl(r + 0.015, r + 0.015, 0.012, 28), '#2a2a30', 0, y, zf + 0.008, { rx: Math.PI / 2, outline: false });
      const c = frame(g, 0, y, zf + 0.012);
      part(c, cone(r, 0.05, 24), '#3a3b42', 0, 0, 0.0, { rx: -Math.PI / 2, outline: false });
      part(c, ball(r * 0.28), '#55565e', 0, 0, 0.02, { outline: false }).scale.set(1, 1, 0.5);
      cones.push(c);
      const rg = part(g, ring(r + 0.02, 0.006), '#00e5ff', 0, y, zf + 0.016, { outline: false });
      rings.push(own(rg, '#00e5ff'));
    };
    woofer(0.36, 0.22);
    // The top.
    const ty = 0.69;
    part(g, rbox(sw - 0.04, 0.78, sd - 0.12, 0.02), BLACK, 0, ty + 0.39, zc - 0.03);
    const tzf = zc - 0.03 + (sd - 0.12) / 2;
    part(g, box(sw - 0.1, 0.72, 0.01), '#111115', 0, ty + 0.39, tzf + 0.002, { outline: false });
    for (const y of [ty + 0.17, ty + 0.4]) {
      part(g, cyl(0.125, 0.125, 0.012, 24), '#2a2a30', 0, y, tzf + 0.008, { rx: Math.PI / 2, outline: false });
      const c = frame(g, 0, y, tzf + 0.012);
      part(c, cone(0.11, 0.035, 20), '#3a3b42', 0, 0, 0, { rx: -Math.PI / 2, outline: false });
      part(c, ball(0.03), '#55565e', 0, 0, 0.012, { outline: false }).scale.set(1, 1, 0.5);
      cones.push(c);
    }
    // The horn: a flared rectangle.
    part(g, box(0.36, 0.14, 0.04), '#202026', 0, ty + 0.63, tzf + 0.02);
    part(g, box(0.28, 0.08, 0.02), '#0b0b0e', 0, ty + 0.63, tzf + 0.035, { outline: false });
    label(g, 'NOVA AUDIO', 0.22, 0.04, 0, ty + 0.74, tzf + 0.009, 'none', '#cfd8dc');
    // Handles on the sides.
    for (const sx of [-1, 1]) part(g, rbox(0.012, 0.03, 0.12, 0.005), '#3a3a40', sx * (sw / 2), 0.55, zc);
    // The phone in hand at a sound check.
    const phone = frame(use, 0, 0, 0);
    part(phone, rbox(0.075, 0.15, 0.01, 0.006), '#263238', 0, 0, 0);
    sheet(phone, meterTex(), 0.066, 0.135, 0, 0, 0.0055);
    const check = stoodAt(g, 0, 0.95, 'soundCheck');
    const stamina = stoodAt(g, 0, 0.95, 'dance', undefined, 0);
    out.spots = { '*': check, checkSound: check, dj_stageStamina: stamina };
    out.work = marker(g, 0, 1.0, zf);
    always(sub, (t) => {
      const p = clubPulse(t);
      cones.forEach((c, i) => (c.position.z = (i === 0 ? zf : tzf) + 0.012 + (i === 0 ? 0.02 : 0.008) * p));
      rings.forEach((m) => m.color.set(hueOf(t, 2)).multiplyScalar(0.3 + 0.7 * p));
    });
    out.animate = (t) => {
      heard(t);
      phone.visible = posed(check, t);
      if (!phone.visible) return;
      const h = heightAt(check);
      const k = h / 1.6;
      // The checker faces -z from (0, 0.95): their left is -x.
      phone.position.set(-SOUND_PHONE.side * k, SOUND_PHONE.up * h, 0.95 - SOUND_PHONE.ahead * k);
      phone.rotation.set(-0.95, 0, 0);
    };
  },

  /**
   * The record crates (레코드 상자, 1 × 1): a low stand with two wooden crates of vinyl on it — the
   * one dug through, its sleeves standing in a row with their covers to the DJ, and one with the
   * genre dividers sticking up (HOUSE, TECHNO, DISCO, K-POP) and a record faced out on display —
   * and a box of new arrivals on the shelf below. Digging: the right hand tips the sleeves forward
   * one by one, the left holding them back, then one's lifted out to look at and put back
   * (crateDig). Writing a track and the label talks went to the producer's desk and the VIP booth.
   */
  recordCrate(g, _W, D, _c, _def, _ctx, out) {
    const bz = -D / 2;
    const stand = 0.62;
    // The stand: a top, a shelf, legs.
    part(g, rbox(0.9, 0.04, 0.56, 0.01), '#4e342e', 0, stand - 0.02, bz + 0.33);
    part(g, rbox(0.86, 0.03, 0.5, 0.01), '#5d4037', 0, 0.16, bz + 0.33);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(g, box(0.04, stand - 0.04, 0.04), '#3e2723', sx * 0.41, (stand - 0.04) / 2, bz + 0.33 + sz * 0.23);
    // A crate: an open box of slats, `x` across.
    const crate = (x: number) => {
      const cw = 0.38;
      const cd = 0.38;
      const ch = 0.26;
      const z = bz + 0.32;
      part(g, box(cw, 0.015, cd), '#a1887f', x, stand + 0.0075, z);
      for (const sx of [-1, 1]) part(g, box(0.015, ch, cd), '#bcaaa4', x + sx * (cw / 2 - 0.0075), stand + ch / 2, z);
      for (const sz of [-1, 1]) {
        part(g, box(cw, ch * 0.42, 0.015), '#bcaaa4', x, stand + ch * 0.21, z + sz * (cd / 2 - 0.0075));
        part(g, box(cw, ch * 0.3, 0.015), '#bcaaa4', x, stand + ch * 0.82, z + sz * (cd / 2 - 0.0075));
      }
      return { z, front: z + cd / 2 - 0.03 };
    };
    // The one dug through, at the DJ's place.
    const dx = -0.21;
    const a = crate(dx);
    const bottom = stand + 0.017;
    const wy = bottom + CRATE.h;
    const wz = a.front;
    const sleeves: THREE.Group[] = [];
    const n = 22;
    for (let j = 0; j < n; j++) {
      const s = frame(g, dx, bottom, wz - j * CRATE.gap);
      part(s, box(0.31, CRATE.h, 0.004), '#f5f5f5', 0, CRATE.h / 2, 0, { outline: false });
      sheet(s, coverTex(j * 3 + 1), 0.305, 0.305, 0, CRATE.h / 2, 0.0025);
      sleeves.push(s);
    }
    // The other: sleeves upright, the genre cards, a record on show.
    const bx = 0.21;
    const b = crate(bx);
    for (let j = 0; j < 18; j++) {
      const s = frame(g, bx, bottom, b.front - j * 0.016);
      part(s, box(0.31, CRATE.h - 0.01 * (j % 3), 0.004), j % 4 ? '#eeeeee' : '#e0d7c6', 0, (CRATE.h - 0.01 * (j % 3)) / 2, 0, { outline: false });
    }
    ['HOUSE', 'TECHNO', 'DISCO', 'K-POP'].forEach((gn, i) => {
      const z = b.front - 0.02 - i * 0.07;
      part(g, box(0.32, 0.36, 0.003), '#ffe082', bx, bottom + 0.18, z, { outline: false });
      label(g, gn, 0.12, 0.035, bx - 0.08 + (i % 2) * 0.16, bottom + 0.34, z + 0.003, '#ffe082', '#4e342e');
    });
    const show = frame(g, bx, stand + 0.26, b.z - 0.12, 0, -0.25);
    part(show, box(0.31, 0.31, 0.004), '#f5f5f5', 0, 0.155, 0, { outline: false });
    sheet(show, coverTex(4), 0.305, 0.305, 0, 0.155, 0.003);
    // New arrivals on the shelf below, a price card.
    for (let j = 0; j < 10; j++) part(g, box(0.31, 0.31, 0.004), COVERS[j % COVERS.length][0], 0.05 + j * 0.002, 0.33, bz + 0.33 - 0.12 + j * 0.022, { rx: -0.08, outline: false });
    label(g, 'NEW ARRIVALS', 0.2, 0.04, 0.05, 0.52, bz + 0.33 + 0.12, '#212121', '#ffd740');
    const work = marker(g, dx, wy, wz);
    const dig = stoodAt(g, dx, 0.33, 'crateDig', work);
    out.spots = { '*': dig, digRecords: dig };
    out.work = work;
    const placeSleeves = (tilt: (j: number) => number, lift: number) => {
      sleeves.forEach((s, j) => {
        if (j === CRATE.picked) {
          const m = pickedAt(lift);
          // The DJ faces -z: their left is -x, ahead is -z.
          s.position.set(dx - m.side, wy + m.up - CRATE.h / 2, wz - m.ahead);
          s.rotation.x = -0.25 * lift;
        } else s.rotation.x = tilt(j);
      });
    };
    let lastUsed = -1;
    always(sleeves[0].children[0], () => {
      if (lastUsed >= 0 && performance.now() - lastUsed > 600) {
        lastUsed = -1;
        placeSleeves(() => 0, 0);
      }
    });
    out.animate = (t) => {
      heard(t);
      if (!posed(dig, t)) return;
      lastUsed = performance.now();
      const k = digRound(t, toolPhase(dig.at.getWorldPosition(tmpV)));
      placeSleeves(k.tilt, k.lift);
    };
  },

  /**
   * The LED wall (LED 비주얼 월, 4 × 1): a video wall the width of the booth on a black truss frame,
   * its visuals changing every bar — a synthwave sun over a grid with the club's name, a tunnel of
   * rings, a kaleidoscope, the night's poster, a waveform — brightening on every kick, a spectrum of
   * bars jumping along its foot, and the club's name in neon across the top.
   */
  ncLedWall(g, W, D) {
    const bz = -D / 2 + 0.08;
    const sw = W - 0.3;
    const sh = sw * 0.5625;
    const y0 = 0.4;
    const cy = y0 + sh / 2;
    // The frame: uprights, top and bottom chords, the feet.
    for (const sx of [-1, 1]) {
      part(g, box(0.1, y0 + sh + 0.12, 0.1), BLACK, sx * (sw / 2 + 0.07), (y0 + sh + 0.12) / 2, bz);
      part(g, rbox(0.4, 0.04, 0.5, 0.01), BLACK, sx * (sw / 2 + 0.07), 0.02, bz + 0.15);
    }
    part(g, box(sw + 0.24, 0.08, 0.1), BLACK, 0, y0 + sh + 0.08, bz);
    part(g, box(sw + 0.24, 0.1, 0.1), BLACK, 0, y0 - 0.05, bz);
    part(g, box(sw, sh, 0.06), '#08080c', 0, cy, bz - 0.01);
    // The screen.
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshBasicMaterial({ map: visualTex(0) }));
    scr.userData.ownGeometry = scr.userData.ownMaterial = true;
    scr.position.set(0, cy, bz + 0.022);
    g.add(scr);
    const smat = scr.material as THREE.MeshBasicMaterial;
    const visuals = Array.from({ length: VISUALS }, (_, i) => visualTex(i));
    // The LED tiles' seams over it.
    for (let i = 1; i < 8; i++) part(g, box(0.004, sh, 0.002), '#000', -sw / 2 + (i * sw) / 8, cy, bz + 0.024, { outline: false });
    for (let j = 1; j < 4; j++) part(g, box(sw, 0.004, 0.002), '#000', 0, y0 + (j * sh) / 4, bz + 0.024, { outline: false });
    // The spectrum along its foot.
    const bars: THREE.Mesh[] = [];
    const nb = 28;
    for (let i = 0; i < nb; i++) {
      const col = HUES[Math.floor((i / nb) * HUES.length)];
      const b = part(g, box((sw / nb) * 0.7, 1, 0.01), col, -sw / 2 + ((i + 0.5) * sw) / nb, y0 + 0.02, bz + 0.03, { outline: false, material: glow(col) });
      b.geometry = box((sw / nb) * 0.7, 1, 0.01).clone().translate(0, 0.5, 0);
      b.userData.ownGeometry = true;
      bars.push(b);
    }
    neon(g, '— N O V A —', 1.6, 0.26, 0, y0 + sh + 0.27, bz + 0.04, '#ff2d95').renderOrder = 2;
    always(scr, (t) => {
      const p = clubPulse(t);
      smat.map = visuals[Math.floor(t / CLUB_BAR) % VISUALS];
      smat.color.setScalar(0.55 + 0.45 * p);
      const beat = Math.floor(t / CLUB_BEAT);
      bars.forEach((b, i) => {
        const r = Math.abs(Math.sin(i * 12.9898 + beat * 78.233)) % 1;
        b.scale.y = 0.04 + 0.32 * p * (0.35 + 0.65 * r) * (1 - Math.abs(i - nb / 2) / nb);
      });
    });
  },

  /**
   * The dance floor (LED 댄스 플로어, 10 × 4, walked on): a floor of lit glass tiles in a black
   * frame playing with the music — rings rippling out from the middle on the kick, a checkerboard
   * flipping each beat, rainbow sweeps, sparkles — two bars a pattern. Over it a box truss hung on
   * chains with moving-head lights swinging their beams through the haze, laser fans from the back
   * corners on the build and the drop, and a mirror ball turning in the middle, its specks of light
   * wheeling over the floor. The crowd dances on it facing the booth (lot3d.ts, `dance:floor`);
   * nothing on it is clicked (a click goes to the floor under it).
   */
  ncDanceFloor(g, W, D, _c, _def, _ctx, out) {
    const nx = Math.round(W * 2);
    const nz = Math.round(D * 2);
    const px = 8;
    const tw = nx * px;
    const th = nz * px;
    // The frame and the glass.
    part(g, box(W - 0.02, 0.012, D - 0.02), '#0b0b10', 0, 0.006, 0, { outline: false });
    for (const sz of [-1, 1]) part(g, box(W, 0.016, 0.04), CHROME, 0, 0.008, sz * (D / 2 - 0.02), { outline: false });
    for (const sx of [-1, 1]) part(g, box(0.04, 0.016, D), CHROME, sx * (W / 2 - 0.02), 0.008, 0, { outline: false });
    const data = new Uint8Array(tw * th * 4);
    const tex = new THREE.DataTexture(data, tw, th, THREE.RGBAFormat);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.08, D - 0.08), new THREE.MeshBasicMaterial({ map: tex }));
    glass.userData.ownGeometry = glass.userData.ownMaterial = true;
    glass.rotation.x = -Math.PI / 2;
    glass.position.y = 0.0125;
    glass.receiveShadow = true;
    g.add(glass);
    const hsv = (h: number, s: number, v: number): [number, number, number] => {
      const i = Math.floor(h * 6);
      const f = h * 6 - i;
      const p = v * (1 - s);
      const q = v * (1 - f * s);
      const u = v * (1 - (1 - f) * s);
      const [r, gg, b] = [[v, u, p], [q, v, p], [p, v, u], [p, q, v], [u, p, v], [v, p, q]][((i % 6) + 6) % 6];
      return [r * 255, gg * 255, b * 255];
    };
    const hash = (a: number, b: number, c: number) => {
      const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
      return s - Math.floor(s);
    };
    const paintFloor = (t: number) => {
      const p = clubPulse(t);
      const beats = t / CLUB_BEAT;
      const beat = Math.floor(beats);
      const f = beats - beat;
      const bar = Math.floor(t / CLUB_BAR);
      const mode = Math.floor(bar / 2) % 4;
      const cx = (nx - 1) / 2;
      const cz = (nz - 1) / 2;
      for (let j = 0; j < nz; j++)
        for (let i = 0; i < nx; i++) {
          const d = Math.hypot(i - cx, (j - cz) * 1.2);
          let h: number;
          let v: number;
          if (mode === 0) {
            v = 0.12 + 0.88 * Math.exp(-((d - f * 10) ** 2) / 1.6);
            h = (bar * 0.13 + d * 0.03) % 1;
          } else if (mode === 1) {
            const on = (i + j + beat) % 2 === 0;
            v = on ? 0.3 + 0.7 * p : 0.07;
            h = beat % 2 ? 0.86 : 0.52;
          } else if (mode === 2) {
            const w = Math.cos(((i + j * 0.6 - beats * 2) / 6) * Math.PI * 2);
            v = 0.12 + 0.88 * Math.max(0, w) ** 2;
            h = ((i / nx) * 0.7 + t * 0.05) % 1;
          } else {
            const r = hash(i, j, beat);
            v = r > 0.72 ? 0.3 + 0.7 * p : 0.06;
            h = hash(j, i, beat + 3);
          }
          const [r, gg, b] = hsv(h, 0.85, v);
          // The tile's pixels, a dark seam round each. Row 0 of the texture is the floor's far (-z) edge as seen.
          const row0 = (nz - 1 - j) * px;
          for (let y = 0; y < px; y++)
            for (let x = 0; x < px; x++) {
              const seam = x === 0 || y === 0;
              const o = ((row0 + y) * tw + i * px + x) * 4;
              data[o] = seam ? 14 : r;
              data[o + 1] = seam ? 14 : gg;
              data[o + 2] = seam ? 18 : b;
              data[o + 3] = 255;
            }
        }
      tex.needsUpdate = true;
    };
    paintFloor(0);
    // The truss: a rectangle of ladder truss hung on chains, inset over the floor.
    const ty = 2.62;
    const hw = W / 2 - 0.4;
    const hd = D / 2 - 0.35;
    const truss = (a: THREE.Vector3, b: THREE.Vector3) => {
      const d = b.clone().sub(a);
      const len = d.length();
      const n = Math.max(2, Math.round(len / 0.35));
      const up = new THREE.Vector3(0, 0.22, 0);
      rod(g, a, b, 0.018, SILVER);
      rod(g, a.clone().add(up), b.clone().add(up), 0.018, SILVER);
      for (let i = 0; i < n; i++) {
        const p0 = a.clone().addScaledVector(d, i / n);
        const p1 = a.clone().addScaledVector(d, (i + 1) / n).add(up);
        rod(g, p0, p1, 0.008, SILVER);
      }
    };
    const c00 = new THREE.Vector3(-hw, ty, -hd);
    const c10 = new THREE.Vector3(hw, ty, -hd);
    const c01 = new THREE.Vector3(-hw, ty, hd);
    const c11 = new THREE.Vector3(hw, ty, hd);
    truss(c00, c10);
    truss(c01, c11);
    truss(c00, c01);
    truss(c10, c11);
    for (const c of [c00, c10, c01, c11]) {
      part(g, box(0.26, 0.26, 0.26), '#c8cdd2', c.x, c.y + 0.11, c.z, { outline: false });
      rod(g, c.clone().setY(c.y + 0.24), c.clone().setY(2.99), 0.008, '#555');
    }
    // The moving heads, hung under the front and back chords.
    type Head = { pan: THREE.Group; tilt: THREE.Group; mat: THREE.MeshBasicMaterial; lens: THREE.MeshBasicMaterial; i: number };
    const heads: Head[] = [];
    let i = 0;
    for (const z of [-hd, hd])
      for (const x of [-hw * 0.66, 0, hw * 0.66]) {
        const base = frame(g, x, ty - 0.02, z);
        part(base, rbox(0.22, 0.1, 0.16, 0.02), BLACK, 0, -0.05, 0);
        const pan = frame(base, 0, -0.1, 0);
        part(pan, box(0.2, 0.03, 0.06), '#26262c', 0, -0.015, 0);
        for (const sx of [-1, 1]) part(pan, box(0.03, 0.17, 0.06), '#26262c', sx * 0.1, -0.1, 0);
        const tilt = frame(pan, 0, -0.16, 0);
        part(tilt, cyl(0.075, 0.085, 0.18, 16), BLACK, 0, 0, 0);
        const lensM = part(tilt, cyl(0.06, 0.06, 0.01, 16), '#fff', 0, -0.092, 0, { outline: false });
        const lens = own(lensM, '#ffffff');
        const bm = part(tilt, beam(0.42, 2.7), '#ffffff', 0, -0.095, 0, { outline: false });
        const mat = own(bm, '#ff2d95', 0.12, true);
        heads.push({ pan, tilt, mat, lens, i: i++ });
      }
    // Laser fans from the two back corners.
    const lasers: Array<{ grp: THREE.Group; mat: THREE.MeshBasicMaterial }> = [];
    for (const sx of [-1, 1]) {
      const unit = frame(g, sx * (hw - 0.3), ty - 0.08, -hd);
      part(unit, rbox(0.2, 0.1, 0.18, 0.015), '#1f1f25', 0, 0, 0);
      const grp = frame(unit, 0, -0.02, 0.09);
      const mat = new THREE.MeshBasicMaterial({ color: '#39ff14', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
      for (let k = 0; k < 7; k++) {
        const ln = new THREE.Mesh(line(4.4), mat);
        ln.rotation.set(0.25, (k - 3) * 0.13, 0, 'YXZ');
        ln.castShadow = false;
        grp.add(ln);
      }
      grp.children[0].userData.ownMaterial = true;
      lasers.push({ grp, mat });
    }
    // The mirror ball and its specks of light on the floor.
    rod(g, new THREE.Vector3(0, ty + 0.1, 0), new THREE.Vector3(0, 2.99, 0), 0.006, '#555');
    const mb = new THREE.Mesh(MIRROR, FACETS);
    mb.position.set(0, ty - 0.05, 0);
    mb.castShadow = false;
    g.add(mb);
    const specks = new THREE.Group();
    g.add(specks);
    const speckMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8, depthWrite: false });
    for (let k = 0; k < 22; k++) {
      const r = 0.6 + ((k * 0.618) % 1) * (Math.min(W, D * 2.4) / 2 - 0.6);
      const a = k * 2.399;
      const s = new THREE.Mesh(disc(0.045, 10), speckMat);
      s.rotation.x = -Math.PI / 2;
      s.position.set(Math.cos(a) * r, 0.014, Math.sin(a) * r * (D / W) * 1.6);
      specks.add(s);
    }
    specks.children[0].userData.ownMaterial = true;
    // Where the crowd faces: the booth, behind the floor's back edge.
    out.spots = { 'dance:floor': spot(g, 'stand', 0, 0, -D / 2 - 1.5) };
    always(glass, (t) => {
      paintFloor(t);
      const p = clubPulse(t);
      const bar = Math.floor(t / CLUB_BAR);
      const drop = bar % 8 >= 6;
      for (const h of heads) {
        const ph = h.i * 1.1 + (h.i >= 3 ? Math.PI : 0);
        h.pan.rotation.y = 0.9 * Math.sin(t * 0.45 + ph);
        h.tilt.rotation.x = (h.i >= 3 ? 1 : -1) * (0.35 + 0.3 * Math.sin(t * 0.7 + ph * 0.7));
        h.tilt.rotation.z = 0.25 * Math.sin(t * 0.55 + ph);
        const col = hueOf(t, h.i % 2 ? 3 : 0);
        h.mat.color.set(col);
        h.mat.opacity = (drop ? 0.1 + 0.16 * p : 0.07 + 0.06 * p) * (drop && Math.floor(t / CLUB_BEAT) % 2 ? 1.3 : 1);
        h.lens.color.set(col);
      }
      lasers.forEach((l, k) => {
        l.grp.visible = drop || bar % 8 === 5;
        l.grp.rotation.y = (k ? -1 : 1) * (0.35 + 0.35 * Math.sin(t * 1.3 + k));
        l.mat.opacity = 0.35 + 0.35 * p;
      });
      mb.rotation.y = t * 0.6;
      specks.rotation.y = t * 0.6;
      speckMat.opacity = 0.45 + 0.35 * Math.abs(Math.sin(t * 3.1));
    });
    unpickable(g);
  },

  /**
   * The fog machine (포그 머신, 1 × 1): a black box on the floor by the booth, its nozzle to the
   * dance floor, the fluid jug plugged in, the heater's light green when it's ready, the remote on
   * top; on the drop (and whenever it's worked) a cloud rolls out low over the floor and spreads.
   * Worked crouched at the remote (tinker).
   */
  ncFogMachine(g, _W, D, _c, _def, _ctx, out) {
    const bz = -D / 2;
    const z = bz + 0.32;
    const body = part(g, rbox(0.5, 0.26, 0.32, 0.02), '#263238', 0, 0.15, z);
    for (const sx of [-1, 1]) part(g, box(0.04, 0.03, 0.3), '#111', sx * 0.2, 0.015, z, { outline: false });
    // The handle, the vents, the nozzle.
    rod(g, new THREE.Vector3(-0.15, 0.28, z), new THREE.Vector3(-0.15, 0.36, z), 0.008, STEEL);
    rod(g, new THREE.Vector3(0.15, 0.28, z), new THREE.Vector3(0.15, 0.36, z), 0.008, STEEL);
    rod(g, new THREE.Vector3(-0.15, 0.36, z), new THREE.Vector3(0.15, 0.36, z), 0.008, STEEL);
    for (let k = 0; k < 6; k++) part(g, box(0.004, 0.12, 0.003), '#111', -0.18 + k * 0.025, 0.15, z + 0.161, { outline: false });
    part(g, cyl(0.035, 0.045, 0.06, 14), '#37474f', 0.12, 0.16, z + 0.185, { rx: Math.PI / 2 });
    part(g, cyl(0.022, 0.022, 0.01, 12), '#111', 0.12, 0.16, z + 0.216, { rx: Math.PI / 2, outline: false });
    label(g, 'FOG 1500', 0.16, 0.04, -0.06, 0.06, z + 0.162, 'none', '#90a4ae');
    part(g, ball(0.008), '#69f0ae', 0.2, 0.25, z + 0.161, { outline: false, material: glow('#69f0ae') });
    // The fluid jug behind, its tube into the box.
    part(g, rbox(0.14, 0.24, 0.1, 0.02), '#b3e5fc', -0.33, 0.12, z - 0.05, { material: GLASS });
    part(g, rbox(0.13, 0.15, 0.09, 0.02), '#81d4fa', -0.33, 0.08, z - 0.05, { outline: false });
    part(g, cyl(0.025, 0.025, 0.03, 12), '#f5f5f5', -0.33, 0.255, z - 0.05);
    rod(g, new THREE.Vector3(-0.33, 0.27, z - 0.05), new THREE.Vector3(-0.25, 0.22, z - 0.05), 0.005, '#eceff1');
    // The remote on top.
    part(g, rbox(0.12, 0.03, 0.08, 0.008), '#212121', 0.05, 0.295, z - 0.04);
    part(g, cyl(0.016, 0.016, 0.012, 14), '#e53935', 0.07, 0.315, z - 0.04);
    part(g, ball(0.006), '#ffd740', 0.02, 0.315, z - 0.04, { outline: false, material: glow('#ffd740') });
    out.work = marker(g, 0.05, 0.32, z - 0.04);
    // Crouched at the remote, beside the nozzle.
    const fog = stoodAt(g, -0.05, 0.22, 'tinker', out.work);
    out.spots = { '*': fog };
    // The cloud: puffs rolling out of the nozzle and spreading over the floor.
    const puffs: Array<{ m: THREE.Mesh; mat: THREE.MeshBasicMaterial; k: number }> = [];
    const cloud = new THREE.Group();
    g.add(cloud);
    for (let k = 0; k < 12; k++) {
      const mat = new THREE.MeshBasicMaterial({ color: '#e8eaf6', transparent: true, opacity: 0, depthWrite: false });
      const m = new THREE.Mesh(shape('fogPuff', () => new THREE.SphereGeometry(0.3, 12, 8)), mat);
      m.userData.ownMaterial = true;
      m.castShadow = false;
      cloud.add(m);
      puffs.push({ m, mat, k });
    }
    let worked = -1;
    const puff = (u: number, strength: number) => {
      for (const { m, mat, k } of puffs) {
        // Each puff a little behind the one before, out along +z, spreading and fading.
        const a = THREE.MathUtils.clamp(u * 1.3 - k * 0.05, 0, 1);
        const side = Math.sin(k * 2.3) * 1.4 * a;
        m.position.set(0.12 + side, 0.18 + 0.25 * a, z + 0.25 + a * 3.2);
        m.scale.set(0.5 + 2.4 * a, 0.35 + 0.8 * a, 0.5 + 2.2 * a);
        mat.opacity = strength * (a > 0 ? 0.32 * Math.sin(Math.PI * Math.min(1, a * 1.1)) : 0);
      }
    };
    always(body, (t) => {
      const working = worked >= 0 && performance.now() - worked < 600;
      // A blast on the drop (the last two bars of eight): four seconds rolling out.
      const since = (t % (CLUB_BAR * 8)) - CLUB_BAR * 6;
      if (working) puff(((t * 0.35) % 1) * 0.9 + 0.1, 1);
      else if (since >= 0) puff(since / (CLUB_BAR * 2), 1);
      else puff(0, 0);
    });
    out.animate = (t) => {
      heard(t);
      worked = performance.now();
    };
    unpickable(cloud);
  },

  /**
   * The club's bar (클럽 바, 4 × 2): a long counter with a dark marble top and a bar rail, its front
   * of vertical slats lit from under in the club's colour; the back bar of lit shelves of bottles
   * against a mirror, the glass-door fridges under it, NOVA BAR in neon over it; on the counter the
   * beer taps, a cocktail shaker and glasses, a bowl of limes, the menu and a tip jar; four bar
   * stools in front. A break: sat on a stool with a drink.
   */
  ncBar(g, W, D, _c, _def, _ctx, out) {
    const bz = -D / 2;
    const bw = W - 0.2;
    // The back bar: the fridges, the mirror, the shelves of bottles lit from under.
    const backZ = bz + 0.2;
    part(g, rbox(bw, 0.9, 0.36, 0.02), '#15151c', 0, 0.45, backZ);
    for (let k = 0; k < 4; k++) {
      const x = -bw / 2 + 0.45 + k * ((bw - 0.9) / 3);
      part(g, box(0.62, 0.62, 0.01), '#0d1b2a', x, 0.42, backZ + 0.185, { outline: false });
      part(g, box(0.6, 0.6, 0.01), '#cfe8f5', x, 0.42, backZ + 0.19, { material: GLASS, outline: false });
      for (let r = 0; r < 2; r++) for (let b = 0; b < 6; b++) part(g, cyl(0.025, 0.025, 0.2, 10), ['#2e7d32', '#ffb300', '#c62828'][(b + r + k) % 3], x - 0.24 + b * 0.095, 0.24 + r * 0.3, backZ + 0.1, { outline: false });
    }
    part(g, box(bw, 1.2, 0.02), '#9fb4c2', 0, 1.55, bz + 0.03, { outline: false });
    part(g, box(bw - 0.06, 1.14, 0.01), '#cfdde6', 0, 1.55, bz + 0.042, { material: GLASS, outline: false });
    const shelfLights: THREE.Mesh[] = [];
    for (const y of [1.12, 1.48, 1.84]) {
      part(g, box(bw, 0.025, 0.22), '#eceff1', 0, y, bz + 0.14, { material: GLASS });
      const strip = part(g, box(bw - 0.1, 0.012, 0.02), '#b388ff', 0, y - 0.02, bz + 0.2, { outline: false });
      shelfLights.push(strip);
      for (let b = 0; b < 22; b++) {
        const x = -bw / 2 + 0.12 + b * ((bw - 0.24) / 21);
        const tall = 0.18 + ((b * 7) % 5) * 0.025;
        const col = ['#a1887f', '#ffcc80', '#80cbc4', '#ef9a9a', '#e6ee9c', '#ce93d8'][(b + Math.round(y * 10)) % 6];
        part(g, cyl(0.03, 0.032, tall, 10), col, x, y + 0.0125 + tall / 2, bz + 0.12, { outline: false, material: (b + Math.round(y * 3)) % 4 ? undefined : GLASS });
        part(g, cyl(0.011, 0.014, 0.06, 8), col, x, y + 0.0125 + tall + 0.03, bz + 0.12, { outline: false });
      }
    }
    const shelfMat = own(shelfLights[0], '#b388ff');
    for (const s of shelfLights.slice(1)) s.material = shelfMat;
    neon(g, 'NOVA BAR', 1.3, 0.3, 0, 2.35, bz + 0.06, '#ffd740').renderOrder = 2;
    // The counter.
    const cz = bz + 1.2;
    const ch = 1.08;
    part(g, rbox(bw, ch - 0.05, 0.5, 0.02), '#1b1b24', 0, (ch - 0.05) / 2, cz);
    for (let k = 0; k < Math.floor(bw / 0.12); k++) part(g, box(0.05, ch - 0.2, 0.02), '#2a2a36', -bw / 2 + 0.08 + k * 0.12, (ch - 0.05) / 2 + 0.03, cz + 0.255, { outline: false });
    const under = part(g, box(bw - 0.04, 0.02, 0.02), '#ff2d95', 0, 0.06, cz + 0.27, { outline: false });
    const underMat = own(under, '#ff2d95');
    part(g, rbox(bw + 0.08, 0.05, 0.62, 0.015), '#2b2b33', 0, ch, cz + 0.02);
    sheet(g, painted('marble', 256, 64, (c) => {
      c.fillStyle = '#26262e';
      c.fillRect(0, 0, 256, 64);
      c.strokeStyle = 'rgba(255,255,255,0.18)';
      for (let k = 0; k < 9; k++) {
        c.beginPath();
        c.moveTo(k * 30, 0);
        c.bezierCurveTo(k * 30 + 20, 20, k * 30 - 10, 40, k * 30 + 25, 64);
        c.stroke();
      }
    }), bw + 0.06, 0.6, 0, ch + 0.026, cz + 0.02, 0, -Math.PI / 2);
    rod(g, new THREE.Vector3(-bw / 2, 0.2, cz + 0.33), new THREE.Vector3(bw / 2, 0.2, cz + 0.33), 0.02, BRASS);
    for (const x of [-bw / 2 + 0.2, 0, bw / 2 - 0.2]) rod(g, new THREE.Vector3(x, 0.2, cz + 0.33), new THREE.Vector3(x, 0.2, cz + 0.25), 0.012, BRASS);
    const top = ch + 0.026;
    // The beer taps.
    const tx = -0.9;
    part(g, rbox(0.4, 0.3, 0.08, 0.02), CHROME, tx, top + 0.15, cz - 0.12);
    for (let k = 0; k < 4; k++) {
      const x = tx - 0.15 + k * 0.1;
      part(g, cyl(0.008, 0.008, 0.06, 8), CHROME, x, top + 0.24, cz - 0.06, { rx: Math.PI / 2, outline: false });
      part(g, rbox(0.025, 0.1, 0.025, 0.006), ['#ffb300', '#212121', '#c62828', '#2e7d32'][k], x, top + 0.31, cz - 0.07);
    }
    part(g, box(0.36, 0.01, 0.12), '#555', tx, top + 0.005, cz - 0.02, { outline: false });
    // A shaker, glasses, the limes, the menu, the tip jar.
    part(g, cyl(0.035, 0.03, 0.16, 14), CHROME, 0.1, top + 0.08, cz - 0.05);
    part(g, cyl(0.025, 0.035, 0.05, 14), CHROME, 0.1, top + 0.185, cz - 0.05);
    for (let k = 0; k < 5; k++) {
      const x = 0.3 + k * 0.09;
      part(g, cone(0.04, 0.07, 14), '#e3f2fd', x, top + 0.13, cz - 0.1, { rx: Math.PI, material: GLASS });
      part(g, cyl(0.004, 0.004, 0.09, 6), '#e3f2fd', x, top + 0.045, cz - 0.1, { material: GLASS, outline: false });
      if (k % 2 === 0) part(g, cone(0.034, 0.05, 14), ['#ff4081', '#40c4ff', '#ffd740'][k / 2], x, top + 0.125, cz - 0.1, { rx: Math.PI, outline: false });
    }
    part(g, cyl(0.09, 0.06, 0.06, 18), '#eceff1', 0.95, top + 0.03, cz - 0.02);
    for (let k = 0; k < 5; k++) part(g, ball(0.03), '#9ccc65', 0.95 + Math.cos(k * 1.3) * 0.04, top + 0.07, cz - 0.02 + Math.sin(k * 1.3) * 0.04);
    const menu = frame(g, -0.3, top, cz + 0.12, 0.2);
    part(menu, box(0.16, 0.2, 0.01), '#212121', 0, 0.1, 0, { rx: -0.2 });
    label(menu, '칵테일 15,000', 0.14, 0.04, 0, 0.14, 0.008, '#212121', '#ffd740', 0, -0.2);
    label(menu, '샷 · 맥주 · 논알콜', 0.14, 0.03, 0, 0.08, 0.02, '#212121', '#fff', 0, -0.2);
    part(g, cyl(0.045, 0.045, 0.12, 14), '#e3f2fd', 1.4, top + 0.06, cz + 0.1, { material: GLASS });
    part(g, box(0.05, 0.03, 0.002), '#81c784', 1.4, top + 0.04, cz + 0.1, { outline: false });
    label(g, 'TIPS', 0.08, 0.025, 1.4, top + 0.09, cz + 0.146, 'none', '#ff4081');
    // The stools.
    const sz = cz + 0.62;
    const seatY = 0.74;
    for (const x of [-1.35, -0.45, 0.45, 1.35]) {
      if (Math.abs(x) > bw / 2 - 0.1) continue;
      part(g, cyl(0.17, 0.2, 0.025, 20), CHROME, x, 0.0125, sz);
      part(g, cyl(0.025, 0.025, seatY - 0.06, 10), CHROME, x, (seatY - 0.06) / 2, sz, { outline: false });
      part(g, ring(0.15, 0.01), CHROME, x, 0.3, sz, { rx: Math.PI / 2, outline: false });
      part(g, cyl(0.19, 0.18, 0.07, 20), '#7b1fa2', x, seatY - 0.035, sz);
    }
    const drinkAt = marker(g, 0.45, top + 0.05, cz + 0.1);
    const sit = satAt(g, 0.45, sz, 'drink', drinkAt, seatY);
    out.spots = { '*': sit };
    out.work = drinkAt;
    always(under, (t) => {
      const p = clubPulse(t);
      underMat.color.set(hueOf(t, 1)).multiplyScalar(0.4 + 0.6 * p);
      shelfMat.color.set(hueOf(t, 4)).multiplyScalar(0.7 + 0.3 * p);
    });
  },

  /**
   * The VIP booth (VIP 부스, 3 × 2): a horseshoe of tufted purple leather round a low glass table lit
   * from under, VIP in gold neon on the wall behind; on the table the ice bucket with two bottles of
   * champagne crowned with sparkler fountains, flutes, a fruit platter, the RESERVED card; brass
   * stanchions with a red velvet rope at the corners. The label talks: sat at the back with the
   * contract on the table (meeting); a toast with the VIP table: sat with a drink.
   */
  ncVipBooth(g, W, D, _c, _def, _ctx, out) {
    const use = inUse(g, out);
    const bz = -D / 2;
    const seatY = 0.45;
    const backZ = bz + 0.3;
    const aw = W - 0.3;
    // The back: seat, backrest, its tufting.
    part(g, rbox(aw, seatY, 0.55, 0.05), shade(LEATHER, 0.8), 0, seatY / 2, backZ + 0.1);
    part(g, rbox(aw - 0.04, 0.1, 0.52, 0.04), LEATHER, 0, seatY - 0.04, backZ + 0.11);
    part(g, rbox(aw, 0.62, 0.18, 0.06), LEATHER, 0, seatY + 0.3, backZ - 0.13);
    for (let r = 0; r < 2; r++) for (let k = 0; k < 9; k++) part(g, ball(0.012), '#2a0a52', -aw / 2 + 0.2 + k * ((aw - 0.4) / 8) + (r ? 0.06 : 0), seatY + 0.2 + r * 0.2, backZ - 0.035, { outline: false });
    // The arms of the horseshoe.
    for (const sx of [-1, 1]) {
      const x = sx * (aw / 2 - 0.27);
      const z0 = backZ + 0.38;
      const len = 0.85;
      part(g, rbox(0.55, seatY, len, 0.05), shade(LEATHER, 0.8), x, seatY / 2, z0 + len / 2);
      part(g, rbox(0.52, 0.1, len - 0.04, 0.04), LEATHER, x, seatY - 0.04, z0 + len / 2);
      part(g, rbox(0.18, 0.62, len + 0.3, 0.06), LEATHER, sx * (aw / 2 - 0.09), seatY + 0.3, z0 + len / 2 - 0.15);
    }
    // The table, lit from under.
    const tz = backZ + 0.98;
    const tY = 0.5;
    part(g, cyl(0.06, 0.18, tY - 0.03, 16), CHROME, 0, (tY - 0.03) / 2, tz);
    part(g, cyl(0.4, 0.4, 0.03, 32), '#e3f2fd', 0, tY, tz, { material: GLASS });
    const ringM = part(g, ring(0.38, 0.012), '#b388ff', 0, tY - 0.02, tz, { rx: Math.PI / 2, outline: false });
    const ringMat = own(ringM, '#b388ff');
    const top = tY + 0.015;
    // The ice bucket and the bottles with their sparklers.
    part(g, cyl(0.1, 0.08, 0.2, 18), CHROME, -0.12, top + 0.1, tz - 0.02);
    for (let k = 0; k < 6; k++) part(g, box(0.04, 0.03, 0.04), '#e1f5fe', -0.12 + Math.cos(k) * 0.05, top + 0.2, tz - 0.02 + Math.sin(k) * 0.05, { ry: k, outline: false });
    const sparks: THREE.Mesh[] = [];
    for (const [x, tilt] of [[-0.16, 0.25], [-0.07, -0.2]] as const) {
      const b = bottle(g, x, top + 0.04, tz - 0.02, tilt);
      const s = part(b, cone(0.05, 0.22, 10), '#ffd740', 0, 0.44, 0, { outline: false });
      own(s, '#fff59d', 0.85, true);
      sparks.push(s);
    }
    // Flutes, the fruit, the card.
    for (let k = 0; k < 4; k++) {
      const x = -0.3 + (k % 2) * 0.09;
      const z = tz + 0.06 + Math.floor(k / 2) * 0.1;
      part(g, cyl(0.022, 0.016, 0.12, 12), '#e3f2fd', x, top + 0.13, z, { material: GLASS });
      part(g, cyl(0.016, 0.014, 0.06, 12), '#fff59d', x, top + 0.12, z, { outline: false });
      part(g, cyl(0.004, 0.004, 0.07, 6), '#e3f2fd', x, top + 0.035, z, { material: GLASS, outline: false });
    }
    part(g, cyl(0.13, 0.1, 0.03, 20), '#fafafa', 0.12, top + 0.015, tz + 0.17);
    for (let k = 0; k < 7; k++) part(g, ball(0.025), ['#e53935', '#8bc34a', '#ffeb3b', '#ff9800'][k % 4], 0.12 + Math.cos(k * 0.9) * 0.07, top + 0.045, tz + 0.17 + Math.sin(k * 0.9) * 0.05);
    const card = frame(g, 0.05, top, tz + 0.3, 0.1);
    part(card, box(0.12, 0.07, 0.005), '#212121', 0, 0.035, 0, { rx: -0.3 });
    label(card, 'RESERVED', 0.11, 0.03, 0, 0.04, 0.012, '#212121', '#ffd740', 0, -0.3);
    // The contract while the label talks go on.
    sheet(use, painted('contract', 160, 210, (c) => {
      c.fillStyle = PAPER;
      c.fillRect(0, 0, 160, 210);
      c.fillStyle = '#222';
      c.font = `bold 14px ${FONT}`;
      c.textAlign = 'center';
      c.fillText('공연 계약서', 80, 24);
      c.textAlign = 'left';
      c.font = `10px ${FONT}`;
      ['갑: 클럽 노바', '을: 레지던트 DJ', '기간: 6개월', '출연: 매주 토 23시', '출연료: 협의'].forEach((l, i) => c.fillText(l, 12, 50 + i * 18));
      for (let i = 0; i < 4; i++) c.fillRect(12, 150 + i * 8, 136 - i * 20, 2);
      c.fillStyle = '#1565c0';
      c.font = `16px ${HAND}`;
      c.fillText('서명 ____', 70, 200);
    }), 0.16, 0.21, 0.2, top + 0.003, tz - 0.2, Math.PI + 0.15, -Math.PI / 2);
    part(use, cyl(0.004, 0.004, 0.13, 6), '#212121', 0.3, top + 0.006, tz - 0.22, { rz: Math.PI / 2, ry: 0.6, outline: false });
    // The neon on the wall.
    neon(g, 'V I P', 0.9, 0.3, 0, 1.6, bz + 0.02, '#ffd740').renderOrder = 2;
    // The stanchions and the rope at the front corners.
    for (const sx of [-1, 1]) {
      const x = sx * (W / 2 - 0.12);
      const z = D / 2 - 0.12;
      part(g, cyl(0.12, 0.13, 0.03, 18), BRASS, x, 0.015, z);
      part(g, cyl(0.02, 0.02, 0.9, 10), BRASS, x, 0.47, z, { outline: false });
      part(g, ball(0.04), BRASS, x, 0.94, z);
      const end = new THREE.Vector3(sx * (aw / 2 - 0.05), 0.8, backZ + 1.1);
      const a = new THREE.Vector3(x, 0.88, z);
      for (let k = 0; k < 5; k++) {
        const p0 = a.clone().lerp(end, k / 5);
        const p1 = a.clone().lerp(end, (k + 1) / 5);
        p0.y -= 0.12 * Math.sin((k / 5) * Math.PI);
        p1.y -= 0.12 * Math.sin(((k + 1) / 5) * Math.PI);
        rod(g, p0, p1, 0.018, '#b71c1c');
      }
    }
    const tableAt = marker(g, 0.22, top + 0.01, tz - 0.2);
    const talk = satAt(g, 0.3, backZ + 0.12, 'meeting', tableAt, seatY, 0);
    const toast = satAt(g, -0.4, backZ + 0.12, 'drink', marker(g, -0.3, top, tz - 0.2), seatY, 0);
    out.spots = { '*': toast, ncVipToast: toast, dj_labelContract: talk };
    out.work = tableAt;
    always(ringM, (t) => {
      const p = clubPulse(t);
      ringMat.color.set(hueOf(t, 5)).multiplyScalar(0.5 + 0.5 * p);
      for (const s of sparks) {
        s.scale.set(0.8 + 0.4 * Math.random(), 0.8 + 0.5 * Math.random(), 0.8 + 0.4 * Math.random());
      }
    });
  },

  /**
   * The producer's desk (프로듀싱 책상, 2 × 1): a studio desk with two screens (the track's
   * arrangement in the DAW, the mixer and a synth), studio monitors on pads either side, a 49-key
   * MIDI keyboard in front, the computer keyboard and mouse to its right, a pad controller lit in a
   * grid, the audio interface with its meters, headphones on a hook, foam panels on the wall behind;
   * a chair. Writing a melody: sat at the MIDI keys (keys); a remix edit: sat at the computer (type).
   */
  ncProducerDesk(g, W, D, _c, _def, _ctx, out) {
    const use = inUse(g, out);
    const bz = -D / 2;
    const dw = W - 0.1;
    const dd = 0.72;
    const dz = bz + 0.02 + dd / 2;
    const ty = 0.74;
    part(g, rbox(dw, 0.04, dd, 0.012), '#2b2b30', 0, ty, dz);
    for (const sx of [-1, 1]) part(g, rbox(0.05, ty - 0.02, dd - 0.06, 0.01), BLACK, sx * (dw / 2 - 0.04), (ty - 0.02) / 2, dz);
    part(g, box(dw - 0.1, 0.3, 0.02), BLACK, 0, ty - 0.17, bz + 0.06);
    const top = ty + 0.02;
    // The foam on the wall.
    for (const x of [-0.55, 0, 0.55])
      for (let k = 0; k < 4; k++) part(g, box(0.48, 0.1, 0.05), k % 2 ? '#37474f' : '#455a64', x, 1.3 + k * 0.11, bz + 0.03, { outline: false });
    // The screens.
    for (const [x, ry, tex] of [[-0.3, 0.12, dawTex()], [0.32, -0.12, synthTex()]] as const) {
      const s = frame(g, x, top, bz + 0.2, ry);
      part(s, cyl(0.07, 0.08, 0.015, 16), BLACK, 0, 0.008, 0);
      part(s, box(0.03, 0.2, 0.03), BLACK, 0, 0.11, 0);
      part(s, rbox(0.58, 0.35, 0.03, 0.01), BLACK, 0, 0.36, 0.02);
      part(s, box(0.55, 0.32, 0.002), '#14161b', 0, 0.36, 0.036, { outline: false });
      sheet(frame(use, x, top, bz + 0.2, ry), tex, 0.55, 0.32, 0, 0.36, 0.038);
    }
    // The monitors on their pads.
    for (const sx of [-1, 1]) {
      const m = frame(g, sx * (dw / 2 - 0.15), top, bz + 0.2, sx * -0.3);
      part(m, box(0.2, 0.05, 0.2), '#616161', 0, 0.025, 0);
      part(m, rbox(0.19, 0.3, 0.22, 0.015), '#f5f5f5', 0, 0.2, 0);
      part(m, cyl(0.065, 0.065, 0.01, 20), '#212121', 0, 0.16, 0.111, { rx: Math.PI / 2, outline: false });
      part(m, cyl(0.065, 0.065, 0.004, 20), '#ffd740', 0, 0.16, 0.113, { rx: Math.PI / 2, outline: false }).scale.set(0.5, 1, 0.5);
      part(m, cyl(0.02, 0.02, 0.01, 12), '#212121', 0, 0.29, 0.111, { rx: Math.PI / 2, outline: false });
    }
    // The MIDI keyboard.
    const kx = -0.2;
    const kz = dz + 0.17;
    part(g, rbox(0.82, 0.05, 0.24, 0.012), '#263238', kx, top + 0.025, kz);
    const keysTex = painted('midiKeys', 580, 64, (c) => {
      c.fillStyle = '#f7f4ec';
      c.fillRect(0, 0, 580, 64);
      c.strokeStyle = '#9e9a90';
      c.lineWidth = 2;
      for (let i = 1; i < 29; i++) {
        c.beginPath();
        c.moveTo(i * 20, 0);
        c.lineTo(i * 20, 64);
        c.stroke();
      }
      c.fillStyle = '#111';
      for (let i = 0; i < 28; i++) if ('ACDFG'.includes('ABCDEFG'[i % 7])) c.fillRect(i * 20 + 13, 0, 13, 38);
    });
    sheet(g, keysTex, 0.68, 0.12, kx + 0.05, top + 0.051, kz + 0.05, 0, -Math.PI / 2);
    for (let k = 0; k < 8; k++) part(g, cyl(0.009, 0.009, 0.012, 10), '#90a4ae', kx - 0.34 + k * 0.03 + 0.4, top + 0.056, kz - 0.06, { outline: false });
    part(g, box(0.025, 0.02, 0.06), '#90a4ae', kx - 0.34, top + 0.06, kz + 0.02);
    part(g, box(0.025, 0.02, 0.06), '#90a4ae', kx - 0.3, top + 0.06, kz + 0.02);
    // The computer keyboard and mouse, the pad controller, the interface.
    part(g, rbox(0.3, 0.018, 0.11, 0.006), '#37474f', 0.42, top + 0.009, kz + 0.02);
    part(g, rbox(0.06, 0.02, 0.09, 0.02), '#37474f', 0.64, top + 0.01, kz + 0.03);
    const pads = frame(g, 0.5, top, dz - 0.05);
    part(pads, rbox(0.22, 0.03, 0.22, 0.01), '#212121', 0, 0.015, 0);
    const padLeds: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        const c = HUES[(i + j) % HUES.length];
        part(pads, rbox(0.04, 0.008, 0.04, 0.004), '#424242', -0.075 + i * 0.05, 0.032, -0.075 + j * 0.05, { outline: false });
        padLeds.push(part(use, rbox(0.04, 0.009, 0.04, 0.004), c, 0.5 - 0.075 + i * 0.05, top + 0.033, dz - 0.05 - 0.075 + j * 0.05, { outline: false, material: glow(c) }));
      }
    part(g, rbox(0.2, 0.05, 0.12, 0.01), '#c62828', -0.75, top + 0.025, dz + 0.06);
    for (const x of [-0.8, -0.7]) part(g, cyl(0.014, 0.014, 0.01, 12), '#eceff1', x, top + 0.05, dz + 0.11, { rx: Math.PI / 2, outline: false });
    part(use, ball(0.006), '#69f0ae', -0.75, top + 0.04, dz + 0.122, { outline: false, material: glow('#69f0ae') });
    // Headphones on the hook at the desk's side.
    part(g, box(0.02, 0.02, 0.08), STEEL, dw / 2 + 0.01, ty - 0.05, dz + 0.2);
    const hp = frame(g, dw / 2 + 0.02, ty - 0.18, dz + 0.24, Math.PI / 2);
    djHeadphones(hp, true);
    // The chair, moved to whichever seat's sat at.
    const chair = new THREE.Group();
    g.add(chair);
    deskChair(chair, dz + dd / 2 - 0.05);
    const keysAt = marker(g, kx, top + 0.06, kz + 0.03);
    const typeAt = marker(g, 0.45, top + 0.02, kz + 0.02);
    const seatZ = dz + dd / 2 + 0.15;
    const compose = satAt(g, kx, seatZ, 'keys', keysAt, 0.48);
    const edit = satAt(g, 0.42, seatZ, 'type', typeAt, 0.48);
    out.spots = { '*': edit, ncMakeEdit: edit, dj_composeTrack: compose };
    out.work = typeAt;
    let used = -1;
    always(chair.children[0].children[0], () => {
      if (used >= 0 && performance.now() - used > 600) {
        used = -1;
        chair.position.x = 0;
      }
    });
    out.animate = (t) => {
      heard(t);
      used = performance.now();
      chair.position.x = posed(compose, t) ? kx : posed(edit, t) ? 0.42 : 0;
      const p = clubPulse(t);
      padLeds.forEach((m, i) => (m.visible = (i + Math.floor(t / CLUB_BEAT)) % 3 !== 0 || p > 0.6));
    };
  },
};
