import * as THREE from 'three';
import { legs, marker, rod, spot, type Builder, type Built, type Spot } from '../parts';
import { ball, box, cyl, part, rbox } from '../toon';
import { glass, glowing, label, painted, picture, ring, text } from './doctor';
import * as I from './interiorDecoratorMotion';
import { shopFront } from './shopFront';
/** Material-led interiors: oak, powder-coated sage steel, linen and warm brass.
 * 다정 is a fictional studio imprint, never the workplace's name. The shared
 * design board deliberately has no interiors-only signage. Prop paths and hand
 * contacts use one score and one origin, including rotated and duplicated pieces. */
const OAK = '#b68c63', EDGE = '#795e45', CREAM = '#efe8da', PAPER = '#fffaf0';
const SAGE = '#839685', DARK = '#344c49', INK = '#303e3d', BRASS = '#b69b61';
const STEEL = '#9da9a6', CLAY = '#c4856b', SKIN = '#e8bd9e';
const PALETTE = ['#eadcc6', '#c5c4aa', '#849783', '#c58d76', '#b2c5c8', '#585e63'];
const UP = new THREE.Vector3(0, 1, 0);
const vec = (p: I.V) => new THREE.Vector3(...p);
function group(g: THREE.Object3D, x = 0, y = 0, z = 0, yaw = 0) {
    const a = new THREE.Group();
    a.position.set(x, y, z);
    a.rotation.y = yaw;
    g.add(a);
    return a;
}
function place(a: THREE.Object3D, p: I.V) { a.position.set(...p); }
function use(g: THREE.Group, motion: I.InteriorMotion, x = 0, z = 0.72, seated = false) {
    const s = spot(g, seated ? 'sit' : 'stand', x, seated ? 0.46 : 0, z, Math.PI, seated ? 0.46 : 0);
    s.work = marker(g, 0, 1, 0);
    s.motion = motion;
    return s;
}
function active(spots: Spot[], t: number) {
    const at = (s: Spot) => (s.at.userData.posedAt as number | undefined) ?? -1e9;
    return spots.filter(s => Math.abs(t - at(s)) < 1.5).sort((a, b) => at(b) - at(a))[0];
}
function now(s: Spot, t: number) {
    const m = s.motion as I.InteriorMotion;
    return I.interiorNow(m, I.interiorTime(m, t, s.work!.getWorldPosition(new THREE.Vector3())));
}
function flat(g: THREE.Object3D, title: string, w: number, d: number, p: I.V, bg = PAPER, fg = INK) {
    const a = label(g, title, w, d, ...p, bg, fg);
    a.rotation.x = -Math.PI / 2;
    return a;
}
function status(g: THREE.Object3D, lines: string[], p: I.V, w = 0.40, h = 0.08) {
    const textures = lines.map((line, i) => painted(`id-status-${lines.join('|')}-${i}`, 512, 96, c => {
        c.fillStyle = DARK;
        c.fillRect(0, 0, 512, 96);
        text(c, line, 256, 49, 37, '#e1e8ce', 'center');
    }));
    const mesh = picture(g, textures[0], w, h, ...p);
    const mat = mesh.material as THREE.MeshBasicMaterial;
    return { mesh, set(i: number) { const tex = textures[Math.max(0, Math.min(textures.length - 1, i))]; if (mat.map !== tex) {
            mat.map = tex;
            mat.needsUpdate = true;
        } } };
}
function inUse(g: THREE.Object3D, out: Built, p: I.V) {
    const a = group(g);
    glowing(a, ball(0.014), '#c7edb0', ...p);
    out.inUse = a;
    return a;
}
function plank(g: THREE.Object3D, w: number, d: number, p: I.V, color = OAK, thick = 0.025) {
    const a = group(g, ...p);
    part(a, rbox(w, thick, d, 0.005), color, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
        const line = part(a, box(w * (0.48 + (i % 3) * 0.13), 0.001, 0.002), EDGE, (i % 2 ? 1 : -1) * w * 0.08, thick / 2 + 0.001, (i - 3) * d / 9, { outline: false });
        line.rotation.y = (i % 3 - 1) * 0.015;
    }
    return a;
}
function tile(g: THREE.Object3D, p: I.V, color = '#d9d1bc', w = 0.18, d = 0.16) {
    const a = group(g, ...p);
    part(a, rbox(w, 0.016, d, 0.004), color, 0, 0, 0);
    for (let i = 0; i < 18; i++) {
        const x = Math.sin(i * 17.3) * w * 0.43, z = Math.cos(i * 11.7) * d * 0.42;
        part(a, box(0.006 + (i % 3) * 0.003, 0.001, 0.004), i % 2 ? '#b3a998' : '#f3ede0', x, 0.009, z, { ry: i, outline: false });
    }
    return a;
}
function swatch(g: THREE.Object3D, p: I.V, color = SAGE, w = 0.16, d = 0.15) {
    const a = group(g, ...p);
    part(a, box(w, 0.009, d), color, 0, 0, 0);
    for (let i = 0; i < 10; i++) {
        part(a, box(w, 0.001, 0.0015), '#c6cbb5', 0, 0.005, (i - 4.5) * d / 11, { outline: false });
        part(a, box(0.0015, 0.001, d), '#6a7e6a', (i - 4.5) * w / 11, 0.0055, 0, { outline: false });
    }
    for (let i = 0; i < 8; i++)
        part(a, box(0.005, 0.002, 0.012), color, (i - 3.5) * w / 9, 0, d / 2 + 0.005, { outline: false });
    return a;
}
function fanDeck(g: THREE.Object3D) {
    const root = group(g);
    const leaves = PALETTE.map((color, i) => {
        const a = group(root, 0, i * 0.002, 0);
        part(a, rbox(0.065, 0.002, 0.21, 0.004), PAPER, 0, 0, -0.075);
        for (let j = 0; j < 3; j++)
            part(a, box(0.055, 0.001, 0.043), j === 0 ? color : j === 1 ? CREAM : PALETTE[(i + 1) % 6], 0, 0.002, -0.13 + j * 0.045, { outline: false });
        flat(a, `${i + 1}0`, 0.035, 0.015, [0, 0.003, 0.007]);
        return a;
    });
    part(root, cyl(0.009, 0.009, 0.025, 12), BRASS, 0, 0.012, 0);
    return { root, open(n: number) { leaves.forEach((a, i) => a.rotation.y = (i - 2.5) * 0.24 * n); } };
}
function pen(g: THREE.Object3D) {
    const a = group(g);
    part(a, cyl(0.006, 0.006, 0.12, 8), DARK, 0, 0.02, 0, { rz: -0.22 });
    part(a, cyl(0.006, 0, 0.025, 8), BRASS, -0.015, -0.05, 0, { rz: -0.22 });
    return a;
}
function notebook(g: THREE.Object3D, p: I.V, title: string, w = 0.28, d = 0.20) {
    const a = group(g, ...p);
    part(a, box(w, 0.009, d), CLAY, 0, 0, 0);
    part(a, box(w - 0.01, 0.007, d - 0.01), PAPER, 0, 0.008, 0);
    flat(a, title, w * 0.8, 0.025, [0, 0.013, -d * 0.33]);
    for (let i = 0; i < 5; i++)
        part(a, box(w * 0.8, 0.001, 0.002), '#c8cfc0', 0, 0.013, -0.025 + i * 0.024, { outline: false });
    for (let i = 0; i < 4; i++)
        part(a, ring(0.012, 0.002), STEEL, -w / 2, 0.012, -0.06 + i * 0.04, { ry: Math.PI / 2 });
    return a;
}
function marks(g: THREE.Object3D, p: I.V, count = 5, vertical = false) {
    return Array.from({ length: count }, (_, i) => {
        const a = part(g, box(0.035 + (i % 3) * 0.018, 0.002, 0.004), DARK, p[0] + (i % 2) * 0.07, p[1], p[2] + Math.floor(i / 2) * 0.025, { outline: false });
        if (vertical) {
            a.position.set(p[0] + i * 0.027, p[1], p[2]);
            a.rotation.x = Math.PI / 2;
        }
        a.visible = false;
        return a;
    });
}
function bench(g: THREE.Group, width = 1.83, depth = 0.82, height = 0.94) {
    legs(g, width - 0.14, depth - 0.13, height - 0.065, DARK, 0.055, 0.028);
    plank(g, width, depth, [0, height - 0.035, 0], OAK, 0.07);
    part(g, box(width - 0.22, 0.035, depth - 0.16), SAGE, 0, 0.26, 0);
    for (const x of [-width / 2 + 0.11, width / 2 - 0.11])
        part(g, box(0.02, 0.50, 0.025), STEEL, x, 0.53, -depth / 2 + 0.07, { rz: x < 0 ? -0.25 : 0.25 });
}
function planTexture() {
    return painted('id-plan-v3', 640, 400, c => {
        c.fillStyle = PAPER;
        c.fillRect(0, 0, 640, 400);
        text(c, '다정 / 공간 구성안', 26, 26, 23, DARK);
        c.strokeStyle = '#a0b7b3';
        c.lineWidth = 1;
        for (let x = 30; x < 620; x += 20) {
            c.beginPath();
            c.moveTo(x, 55);
            c.lineTo(x, 370);
            c.stroke();
        }
        for (let y = 55; y < 380; y += 20) {
            c.beginPath();
            c.moveTo(30, y);
            c.lineTo(615, y);
            c.stroke();
        }
        c.strokeStyle = DARK;
        c.lineWidth = 8;
        c.strokeRect(80, 85, 450, 240);
        c.beginPath();
        c.moveTo(350, 85);
        c.lineTo(350, 210);
        c.moveTo(350, 270);
        c.lineTo(350, 325);
        c.stroke();
        c.fillStyle = '#ece1cd';
        c.fillRect(92, 97, 245, 215);
        c.fillStyle = SAGE;
        c.fillRect(105, 110, 175, 50);
        c.fillRect(105, 160, 45, 80);
        c.strokeStyle = OAK;
        c.lineWidth = 4;
        c.strokeRect(180, 200, 90, 60);
        c.fillStyle = '#c7d9da';
        c.fillRect(380, 110, 120, 75);
        text(c, '거실', 224, 285, 20, INK, 'center');
        text(c, '서재', 440, 270, 20, INK, 'center');
        text(c, '1 : 50  /  동선 900', 610, 375, 18, DARK, 'right');
        c.strokeStyle = CLAY;
        c.lineWidth = 3;
        c.setLineDash([8, 6]);
        c.beginPath();
        c.moveTo(315, 340);
        c.lineTo(315, 240);
        c.lineTo(420, 240);
        c.stroke();
    });
}
function roomPicture(g: THREE.Object3D, p: I.V, w = 0.30, h = 0.22, variant = 0, flatPhoto = false) {
    const tex = painted(`id-room-photo-${variant}`, 480, 320, c => {
        c.fillStyle = variant ? '#ded6c4' : '#e2e6dd';
        c.fillRect(0, 0, 480, 320);
        c.fillStyle = '#b99167';
        c.beginPath();
        c.moveTo(0, 240);
        c.lineTo(320, 200);
        c.lineTo(480, 240);
        c.lineTo(480, 320);
        c.lineTo(0, 320);
        c.fill();
        c.fillStyle = '#f8f3e4';
        c.fillRect(295, 30, 125, 145);
        c.fillStyle = '#a9c5c7';
        c.fillRect(305, 38, 49, 125);
        c.fillRect(364, 38, 46, 125);
        c.fillStyle = SAGE;
        c.fillRect(45, 165, 205, 70);
        c.fillRect(35, 205, 225, 45);
        c.fillStyle = '#d0b194';
        c.fillRect(65, 180, 45, 40);
        c.fillStyle = '#eee3ca';
        c.beginPath();
        c.ellipse(280, 266, 72, 22, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#4a6956';
        for (let i = 0; i < 5; i++) {
            c.beginPath();
            c.ellipse(444 + Math.sin(i * 4) * 14, 145 + i * 17, 11, 30, i, 0, Math.PI * 2);
            c.fill();
        }
        c.fillStyle = CLAY;
        c.fillRect(428, 215, 38, 42);
    });
    const a = picture(g, tex, w, h, ...p);
    if (flatPhoto)
        a.rotation.x = -Math.PI / 2;
    return a;
}
function dynamicRod(g: THREE.Object3D, radius: number, color: string) {
    const m = part(g, cyl(radius, radius, 1, 10), color, 0, 0, 0, { outline: false });
    return (a: I.V, b: I.V) => {
        const start = vec(a), d = vec(b).sub(start);
        m.position.copy(start).addScaledVector(d, 0.5);
        m.scale.y = Math.max(0.001, d.length());
        m.quaternion.setFromUnitVectors(UP, d.normalize());
    };
}
/** Adults answering a presentation. Articulated forearms really reach the offered fan. */
function client(g: THREE.Object3D, x: number, z: number, seated: boolean, yaw = 0) {
    const root = group(g, x, 0, z, yaw), hip = seated ? 0.51 : 0.88;
    for (const sx of [-1, 1]) {
        const knee: I.V = [sx * 0.09, seated ? 0.43 : 0.48, seated ? 0.30 : 0.01];
        rod(root, vec([sx * 0.09, hip, 0]), vec(knee), 0.055, '#5b626b');
        rod(root, vec(knee), vec([sx * 0.09, 0.10, seated ? 0.32 : 0.03]), 0.045, '#5b626b');
        part(root, rbox(0.12, 0.075, 0.23, 0.025), EDGE, sx * 0.09, 0.055, seated ? 0.36 : 0.08);
    }
    part(root, rbox(0.31, 0.18, 0.25, 0.05), '#5b626b', 0, hip, 0);
    part(root, rbox(0.35, 0.40, 0.23, 0.06), '#d8ad83', 0, hip + 0.24, 0);
    part(root, box(0.035, 0.29, 0.012), CREAM, 0, hip + 0.24, 0.12, { outline: false });
    for (let i = 0; i < 3; i++)
        part(root, ball(0.006), BRASS, 0.025, hip + 0.17 + i * 0.06, 0.13, { outline: false });
    part(root, cyl(0.04, 0.04, 0.10, 10), SKIN, 0, hip + 0.48, 0);
    const head = group(root, 0, hip + 0.62, 0);
    part(head, ball(0.12), SKIN, 0, 0, 0);
    part(head, ball(0.126), '#4b3b31', 0, 0.035, -0.035);
    part(head, rbox(0.20, 0.06, 0.08, 0.02), '#4b3b31', 0, 0.07, 0.07);
    for (const sx of [-1, 1])
        part(head, ball(0.009), INK, sx * 0.042, -0.002, 0.112, { outline: false });
    part(head, box(0.035, 0.005, 0.004), '#a96b63', 0, -0.046, 0.116, { outline: false });
    const arms = [-1, 1].map(sx => {
        const upper = dynamicRod(root, 0.045, '#d8ad83'), lower = dynamicRod(root, 0.032, SKIN);
        const hand = part(root, ball(0.034), SKIN, 0, 0, 0, { outline: false });
        return (p: I.V) => {
            const shoulder: I.V = [sx * 0.19, hip + 0.40, 0];
            const elbow: I.V = [sx * 0.25, (hip + 0.40 + p[1]) / 2 - 0.05, p[2] * 0.48];
            upper(shoulder, elbow);
            lower(elbow, p);
            place(hand, p);
        };
    });
    return { root, pose(reply: number, nod: number, hand?: I.V) {
            arms[0](hand ?? [-0.18, hip + 0.16 + reply * 0.12, 0.22 + reply * 0.12]);
            arms[1]([0.19, hip + 0.15 + reply * 0.26, 0.17 + reply * 0.18]);
            head.rotation.x = nod;
            head.rotation.y = -reply * 0.12;
        } };
}
// Four real pull-out drawers, loose terrazzo, planks, woven cloth and a light shelf.
const materialLibrary: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
    for (const x of [-0.42, 0.42])
        part(g, box(0.04, 1.02, 0.62), OAK, x, 0.53, -0.15);
    part(g, box(0.80, 1.02, 0.035), OAK, 0, 0.53, -0.442);
    part(g, box(0.88, 0.06, 0.62), OAK, 0, 0.05, -0.15);
    part(g, box(0.78, 0.90, 0.025), DARK, 0, 0.55, -0.40);
    part(g, box(0.88, 0.65, 0.07), CREAM, 0, 1.36, -0.40);
    for (const x of [-0.42, 0.42])
        part(g, box(0.04, 0.67, 0.39), OAK, x, 1.36, -0.24);
    part(g, box(0.9, 0.045, 0.47), OAK, 0, 1.70, -0.20);
    part(g, box(0.85, 0.045, 0.58), CREAM, 0, 1.015, -0.13);
    const drawers: THREE.Group[] = [];
    ['석재 · 01', '패브릭 · 02', '원목 · 03', '타일 · 04'].forEach((s, i) => {
        const a = group(g, 0, 0.21 + i * 0.22, 0);
        part(a, rbox(0.77, 0.185, 0.035, 0.008), i === 3 ? SAGE : OAK, 0, 0, 0.12);
        part(a, box(0.70, 0.018, 0.40), EDGE, 0, -0.07, -0.04);
        for (const x of [-0.35, 0.35])
            part(a, box(0.018, 0.09, 0.40), OAK, x, -0.02, -0.04);
        part(a, box(0.15, 0.018, 0.025), BRASS, 0, 0.01, 0.15);
        label(a, s, 0.22, 0.048, -0.23, 0.025, 0.141, PAPER, INK);
        drawers.push(a);
    });
    const sample = tile(g, I.LIB.sample, '#d7cbb6', 0.20, 0.19);
    for (let i = 0; i < 3; i++) {
        const a = plank(g, 0.16, 0.28, [-0.24 + i * 0.19, 1.12 + i * 0.015, -0.23], [OAK, '#dfc3a0', '#80624a'][i]);
        a.rotation.x = 0.62;
        const cloth = swatch(g, [-0.25 + i * 0.24, 1.45, -0.34], PALETTE[i + 1], 0.17, 0.22);
        cloth.rotation.x = Math.PI / 2;
        part(g, cyl(0.009, 0.009, 0.035, 8), BRASS, -0.25 + i * 0.24, 1.56, -0.30, { rx: Math.PI / 2 });
    }
    label(g, 'MATERIAL / 소재 아카이브', 0.73, 0.07, 0, 1.65, -0.174, CREAM, DARK);
    label(g, '원목 · 직물 · 석재 · 타일', 0.71, 0.055, 0, 0.08, 0.17, DARK, CREAM);
    const glow = inUse(g, out, [0.35, 1.64, -0.17]);
    glowing(glow, box(0.63, 0.009, 0.07), '#fff0c0', 0, 1.67, -0.15);
    const deck = fanDeck(g);
    place(deck.root, I.LIB.fan);
    notebook(g, [-0.06, 1.04, 0.24], '소재 선정', 0.17, 0.16);
    const writing = marks(g, [-0.11, 1.054, 0.23]);
    const pencil = pen(g);
    place(pencil, [-0.30, 1.08, 0.25]);
    const chosen = group(g, 0.23, 1.04, 0.24);
    part(chosen, box(0.24, 0.015, 0.22), SAGE, 0, -0.01, 0);
    flat(chosen, '선정', 0.10, 0.03, [0, 0, 0.08]);
    const a = use(g, 'idMaterials', 0, 0.70), b = use(g, 'idStudy', 0, 0.70);
    out.spots = { chooseMaterials: a, interiorDecorator_colorStudy: b, '*': a };
    out.animate = t => {
        const s = active([a, b], t);
        if (!s)
            return;
        const q = now(s, t), study = s === b;
        drawers[3].position.z = study ? 0 : 0.22 * q.open;
        if (study) {
            place(sample, I.LIB.sample);
            sample.rotation.set(0, 0, 0);
            place(deck.root, q.prop);
            deck.root.rotation.set(0.3, q.turn, 0);
            deck.open(q.open);
        }
        else {
            place(sample, q.prop);
            sample.rotation.set(q.tilt, q.turn, 0);
            place(deck.root, I.LIB.fan);
            deck.root.rotation.set(0, 0, 0);
            deck.open(0.12);
        }
        const note = q.b.key === 'note';
        pencil.rotation.z = note ? -0.05 : Math.PI / 2;
        place(pencil, note ? q.r : [-0.30, 1.06, 0.25]);
        writing.forEach((m, i) => m.visible = note && q.b.u > i / writing.length);
        glow.children[1].visible = study || ['light', 'feel'].includes(q.b.key);
    };
};
// Generic visual design board: photographs, typographic grid, colour chips and project cards.
const moodBoard: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
    for (const x of [-0.76, 0.76]) {
        part(g, box(0.045, 1.74, 0.045), DARK, x, 0.89, -0.10);
        part(g, box(0.21, 0.045, 0.56), DARK, x, 0.06, -0.03);
        for (const z of [-0.23, 0.19])
            part(g, cyl(0.037, 0.037, 0.025, 12), INK, x, 0.045, z, { rz: Math.PI / 2 });
    }
    part(g, rbox(1.70, 1.04, 0.07, 0.02), OAK, 0, 1.27, -0.055);
    part(g, box(1.61, 0.95, 0.012), '#ccba9a', 0, 1.27, -0.013);
    part(g, box(1.61, 0.012, 0.31), CREAM, 0, 0.90, 0.13);
    label(g, 'DESIGN / 이미지 · 색 · 구성', 1.40, 0.085, 0, 1.69, 0.001, PAPER, DARK);
    // A second, abstract composition keeps this shared piece useful to graphic designers.
    const abstract = painted('id-board-abstract-v2', 256, 320, c => {
        c.fillStyle = '#e8dfc9';
        c.fillRect(0, 0, 256, 320);
        c.fillStyle = CLAY;
        c.fillRect(24, 30, 145, 170);
        c.fillStyle = DARK;
        c.beginPath();
        c.arc(151, 165, 68, 0, Math.PI * 2);
        c.fill();
        text(c, 'FORM', 24, 250, 39, DARK);
        text(c, '색과 여백의 균형', 24, 290, 17, DARK);
    });
    picture(g, abstract, 0.27, 0.34, -0.58, 1.39, 0.005);
    roomPicture(g, [-0.16, 1.42, 0.009], 0.36, 0.25);
    for (let i = 0; i < 5; i++) {
        label(g, ['01 분석', '02 구성', '03 시안', '04 검토', '05 확정'][i], 0.18, 0.055, -0.58 + i * 0.26, 1.08, 0.01, PALETTE[i], INK);
        part(g, ball(0.009), CLAY, -0.58 + i * 0.26, 1.12, 0.021, { outline: false });
    }
    const chips = PALETTE.map((color, i) => {
        const a = group(g, 0.36 + (i % 2) * 0.15, 1.50 - Math.floor(i / 2) * 0.12, 0.012);
        part(a, box(0.12, 0.10, 0.005), PAPER, 0, 0, 0);
        part(a, box(0.10, 0.073, 0.003), color, 0, 0.008, 0.004);
        label(a, `P-${i + 1}`, 0.09, 0.015, 0, -0.038, 0.005, PAPER, INK);
        return a;
    });
    const moving = group(g);
    part(moving, box(0.23, 0.005, 0.19), PAPER, 0, 0, 0);
    roomPicture(moving, [0, 0.003, 0], 0.21, 0.17, 1, true);
    place(moving, I.BOARD.pile);
    const chip = swatch(g, [0.35, 0.94, 0.22], CLAY, 0.10, 0.09);
    const pin = part(g, ball(0.012), '#b14b41', -0.12, 1.47, 0.10, { outline: false });
    pin.visible = false;
    for (let i = 0; i < 3; i++)
        part(g, box(0.18, 0.003, 0.14), PAPER, 0.28 + i * 0.01, 0.918 + i * 0.004, 0.21);
    const pencil = pen(g);
    place(pencil, I.BOARD.pen);
    pencil.rotation.z = Math.PI / 2;
    const notes = marks(g, [0.20, 1.09, 0.026], 5, true);
    const screen = status(g, ['구성 검토', '이미지 고르기', '팔레트 조정', '일정과 담당', '피드백 반영', '시안 승인'], [0, 0.81, 0.07], 0.62, 0.065);
    out.screen = screen.mesh;
    inUse(g, out, [0.72, 1.69, 0.01]);
    const agenda = notebook(g, I.KICKOFF.agenda, '착수 일정', 0.22, 0.18);
    agenda.rotation.x = 0.45;
    agenda.visible = false;
    const assignment = group(g);
    part(assignment, box(0.19, 0.005, 0.11), PALETTE[1], 0, 0, 0);
    flat(assignment, '시안 담당 / 03', 0.17, 0.055, [0, 0.004, 0]);
    assignment.visible = false;
    const scheduleMarks = marks(g, [-0.28, 1.10, 0.027], 5, true);
    const listener = client(g, 0.83, 0.67, false, -0.70);
    listener.root.visible = false;
    const make = use(g, 'idBoard', -0.08, 0.65), kickoff = use(g, 'idKickoff', -0.08, 0.65), pitch = use(g, 'idPitch', -0.08, 0.65);
    out.spots = { makeMoodBoard: make, interiorDecorator_projectKickoff: kickoff, interiorDecorator_ownProject: pitch, graphicDesigner_brandPitch: pitch, '*': make };
    out.animate = t => {
        const s = active([make, kickoff, pitch], t);
        if (!s)
            return;
        const q = now(s, t), making = s === make, k = q.b.key;
        if (making) {
            place(moving, q.prop);
            moving.rotation.x = q.tilt;
        }
        else {
            place(moving, I.BOARD.moved);
            moving.rotation.x = Math.PI / 2;
        }
        pin.visible = !making || !['take', 'reset'].includes(k);
        pin.position.x = making ? q.prop[0] : I.BOARD.moved[0];
        pin.position.y = making ? q.prop[1] + 0.08 : 1.55;
        if (making && k === 'chip') {
            place(chip, q.r);
            chip.rotation.x = q.b.u * Math.PI / 2;
        }
        else {
            place(chip, making && q.b.i < 2 ? [0.35, 0.94, 0.22] : I.BOARD.chip);
            chip.rotation.x = making && q.b.i < 2 ? 0 : Math.PI / 2;
        }
        const writing = ['annotate', 'revise', 'schedule'].includes(k);
        place(pencil, writing ? q.r : I.BOARD.pen);
        pencil.rotation.set(writing ? Math.PI / 2 : 0, 0, writing ? -0.1 : Math.PI / 2);
        notes.forEach((a, i) => a.visible = s !== kickoff && ((writing && q.b.u > i / 5) || k === 'agree' || k === 'look'));
        agenda.visible = assignment.visible = s === kickoff;
        place(agenda, q.l);
        place(assignment, q.prop);
        assignment.rotation.x = q.tilt;
        scheduleMarks.forEach((a, i) => a.visible = s === kickoff && (k === 'agree' || k === 'schedule' && q.progress > i / 5));
        listener.root.visible = !making;
        listener.pose(k === 'listen' ? 0.65 + 0.15 * Math.sin(t * 3) : k === 'agree' ? 0.3 : 0.1, k === 'agree' ? 0.08 * Math.sin(t * 5) : 0.03);
        chips.forEach((a, i) => a.rotation.z = k === 'palette' && i === 2 ? 0.07 * Math.sin(t * 3) : 0);
        screen.set(making ? k === 'take' ? 1 : k === 'chip' || k === 'move' ? 2 : 4 : k === 'agree' ? 5 : s === kickoff ? 3 : 4);
    };
};
const sampleTable: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
    bench(g);
    label(g, '소재 조합 / SAMPLE LAB', 1.14, 0.085, 0, 0.78, 0.415, DARK, CREAM);
    const plan = picture(g, planTexture(), 0.73, 0.44, -0.10, 0.947, -0.03);
    plan.rotation.x = -Math.PI / 2;
    for (let i = 0; i < 4; i++) {
        const a = plank(g, 0.22, 0.12, [-0.67, 0.96 + i * 0.026, -0.18], [OAK, '#d3b389', '#7b5d44', '#b09e82'][i]);
        a.rotation.y = i * 0.03;
        tile(g, [0.65, 0.96 + i * 0.02, -0.20], PALETTE[i], 0.20, 0.17);
    }
    const stone = tile(g, I.TABLE.tile), cloth = swatch(g, I.TABLE.fabric), chip = swatch(g, I.TABLE.paint, CLAY, 0.10, 0.13);
    const fan = fanDeck(g);
    place(fan.root, [0.66, 0.97, 0.21]);
    fan.open(0.5);
    notebook(g, [0.43, 0.96, 0.25], '제작 노트', 0.22, 0.18);
    const pencil = pen(g), writing = marks(g, [0.36, 0.974, 0.24]);
    place(pencil, I.TABLE.pen);
    pencil.rotation.z = Math.PI / 2;
    const phone = group(g, ...I.TABLE.phone);
    part(phone, rbox(0.12, 0.014, 0.19, 0.01), INK, 0, 0, 0);
    const phoneScreen = picture(phone, planTexture(), 0.102, 0.15, 0, 0.009, 0);
    phoneScreen.rotation.x = -Math.PI / 2;
    const flash = group(phone);
    glowing(flash, box(0.022, 0.002, 0.015), '#fffef0', 0.032, -0.009, -0.07);
    flash.visible = false;
    const ruler = group(g, -0.38, 0.96, 0.27);
    part(ruler, box(0.34, 0.006, 0.035), BRASS, 0, 0, 0);
    for (let i = 0; i < 16; i++)
        part(ruler, box(0.001, 0.001, i % 5 ? 0.008 : 0.018), DARK, -0.15 + i * 0.02, 0.004, -0.005, { outline: false });
    // A small joinery mock-up, assembled on the same bench in the senior track.
    const model = group(g, -0.28, 0.98, 0.22);
    model.visible = false;
    plank(model, 0.22, 0.16, [0, 0, 0], '#d0ac7c', 0.022);
    const modelLegs = [-1, 1].flatMap(x => [-1, 1].map(z => part(model, box(0.02, 0.075, 0.02), OAK, x * 0.08, -0.047, z * 0.05)));
    const driver = group(g);
    part(driver, cyl(0.012, 0.012, 0.085, 10), CLAY, 0, 0.02, 0);
    part(driver, cyl(0.003, 0.003, 0.07, 8), STEEL, 0, -0.057, 0);
    driver.visible = false;
    for (let i = 0; i < 3; i++) {
        part(g, box(0.26, 0.04, 0.18), CREAM, -0.50 + i * 0.43, 0.30, 0);
        label(g, ['샘플 반납', '원단', '공구'][i], 0.20, 0.035, -0.50 + i * 0.43, 0.30, 0.093, CREAM, DARK);
    }
    const light = inUse(g, out, [0.78, 0.80, 0.42]);
    const screen = status(g, ['조합 준비', '석재 + 패브릭', '컬러 조정', '기록 완료', '치수 확인', '조립 중', '맞춤 가구 완성'], [0.56, 1.04, -0.32], 0.50, 0.07);
    out.screen = screen.mesh;
    const arrange = use(g, 'idSamples'), mock = use(g, 'idMockup');
    out.spots = { arrangeSamples: arrange, interiorDecorator_furnitureMockup: mock, '*': arrange };
    out.animate = t => {
        const s = active([arrange, mock], t);
        if (!s)
            return;
        const q = now(s, t), k = q.b.key, building = s === mock;
        model.visible = building;
        modelLegs.forEach((a, i) => a.visible = q.progress > i / 4);
        stone.visible = cloth.visible = chip.visible = !building;
        if (building) {
            place(model, q.prop);
            model.rotation.y = q.turn;
        }
        else {
            place(stone, k === 'tile' || k === 'reset' ? q.prop : q.b.i > 1 ? I.TABLE.target : I.TABLE.tile);
            place(cloth, k === 'fabric' ? q.prop : q.b.i > 2 ? [-0.13, 0.98, 0.10] : I.TABLE.fabric);
            place(chip, k === 'paint' ? q.prop : q.b.i > 3 ? [0.25, 0.98, 0.09] : I.TABLE.paint);
        }
        const photographing = !building && k === 'photo';
        place(phone, photographing ? q.prop : I.TABLE.phone);
        phone.rotation.x = photographing ? q.tilt : 0;
        flash.visible = photographing && q.b.u > 0.6 && q.b.u < 0.72;
        driver.visible = building;
        place(driver, building && k === 'legs' ? q.r : [0.56, 1.01, 0.18]);
        driver.rotation.y = k === 'legs' ? t * 8 : 0;
        ruler.position.set(building && k === 'measure' ? 0.01 : -0.47, building && k === 'measure' ? 1.0 : 0.96, 0.27);
        place(pencil, k === 'note' ? q.r : I.TABLE.pen);
        pencil.rotation.z = k === 'note' ? 0 : Math.PI / 2;
        writing.forEach((a, i) => a.visible = k === 'note' && q.b.u > i / 5);
        screen.set(building ? k === 'measure' ? 4 : q.progress === 1 ? 6 : 5 : photographing ? 3 : k === 'paint' ? 2 : q.b.i > 0 ? 1 : 0);
        light.visible = true;
    };
};
// A paint showroom in miniature: real numbered chips and a pivoting paper fan.
const colourWall: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
    part(g, rbox(1.82, 1.73, 0.22, 0.02), OAK, 0, 0.90, -0.28);
    part(g, box(1.69, 1.30, 0.012), CREAM, 0, 1.05, -0.161);
    part(g, box(1.87, 0.045, 0.57), OAK, 0, 0.96, 0.02);
    label(g, '다정 / 색의 서가', 1.50, 0.12, 0, 1.68, -0.155, DARK, CREAM);
    const chips: THREE.Group[] = [];
    for (let row = 0; row < 3; row++)
        for (let col = 0; col < 6; col++) {
            const a = group(g, -0.65 + col * 0.26, 1.48 - row * 0.17, -0.145);
            part(a, box(0.20, 0.14, 0.009), PAPER, 0, 0, 0);
            const c = new THREE.Color(PALETTE[col]).lerp(new THREE.Color(row === 0 ? PAPER : DARK), row === 0 ? 0.32 : row === 2 ? 0.22 : 0);
            part(a, box(0.185, 0.105, 0.004), `#${c.getHexString()}`, 0, 0.012, 0.007);
            label(a, `${col + 1}0${row + 1}`, 0.10, 0.021, 0, -0.055, 0.008, PAPER, INK);
            chips.push(a);
        }
    for (let i = 0; i < 4; i++) {
        const x = -0.64 + i * 0.42;
        part(g, rbox(0.33, 0.36, 0.25, 0.015), SAGE, x, 0.45, -0.06);
        label(g, ['백색', '웜 톤', '뉴트럴', '쿨 톤'][i], 0.26, 0.06, x, 0.45, 0.071, PAPER, DARK);
        part(g, box(0.12, 0.017, 0.025), BRASS, x, 0.56, 0.09);
    }
    const deck = fanDeck(g);
    place(deck.root, I.COLOUR.fan);
    const selected = swatch(g, I.COLOUR.chip, PALETTE[2], 0.09, 0.11);
    selected.rotation.x = Math.PI / 2;
    // Raised comparison card sits in front of the wall, inside a small brass holder.
    part(g, box(0.16, 0.19, 0.009), PAPER, 0.25, 1.32, 0);
    label(g, '선정색', 0.13, 0.035, 0.25, 1.22, 0.007, PAPER, DARK);
    for (const x of [0.18, 0.32])
        part(g, box(0.008, 0.26, 0.008), BRASS, x, 1.12, -0.005);
    notebook(g, I.COLOUR.paper, '팔레트 / 03', 0.25, 0.20);
    const pencil = pen(g), writing = marks(g, [0.23, 1.014, 0.23]);
    place(pencil, [0.49, 1.02, 0.24]);
    pencil.rotation.z = Math.PI / 2;
    for (let i = 0; i < 3; i++) {
        const x = -0.68 + i * 0.13;
        part(g, cyl(0.052, 0.052, 0.13, 18), PALETTE[i + 1], x, 1.04, -0.05);
        part(g, cyl(0.055, 0.055, 0.012, 18), STEEL, x, 1.11, -0.05);
        label(g, 'TEST', 0.075, 0.035, x, 1.04, 0.003, PAPER, DARK);
    }
    const brush = group(g, 0.63, 1.03, 0.12);
    part(brush, box(0.032, 0.01, 0.15), OAK, 0, 0, 0);
    part(brush, box(0.07, 0.014, 0.05), CREAM, 0, 0, -0.10);
    part(brush, box(0.07, 0.014, 0.025), STEEL, 0, 0, -0.065);
    const light = inUse(g, out, [0.76, 1.68, -0.15]);
    glowing(light, box(1.45, 0.012, 0.04), '#fff1d0', 0, 1.60, -0.10);
    const screen = status(g, ['팬덱 대조', '벽면에서 확인', '선정색 203', '컬러 사양 기록'], [0, 0.80, 0.06], 0.70, 0.08);
    out.screen = screen.mesh;
    const s = use(g, 'idColour');
    out.spots = { idMatchPalette: s, '*': s };
    out.animate = t => {
        if (!active([s], t))
            return;
        const q = now(s, t), k = q.b.key;
        place(deck.root, q.prop);
        deck.root.rotation.x = q.tilt;
        deck.open(q.open);
        if (k === 'select') {
            place(selected, q.r);
            selected.rotation.x = (1 - I.sm(q.b.u)) * Math.PI / 2;
        }
        else {
            place(selected, k === 'note' ? I.COLOUR.paper : I.COLOUR.chip);
            selected.rotation.x = k === 'note' ? 0 : Math.PI / 2;
        }
        place(pencil, k === 'note' ? q.r : [0.49, 1.02, 0.24]);
        pencil.rotation.z = k === 'note' ? 0 : Math.PI / 2;
        writing.forEach((a, i) => a.visible = k === 'note' && q.b.u > i / 5);
        chips[8].rotation.z = k === 'compare' ? Math.sin(t * 2) * 0.018 : 0;
        screen.set(k === 'note' ? 3 : k === 'select' ? 2 : k === 'wall' || k === 'compare' ? 1 : 0);
    };
};
// Three independently switched lighting bays with actual lit diffusers and test pools.
const lightingWall: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
    part(g, rbox(1.83, 1.76, 0.27, 0.02), DARK, 0, 0.90, -0.25);
    part(g, box(1.72, 1.60, 0.018), CREAM, 0, 0.94, -0.104);
    part(g, box(1.85, 0.055, 0.52), OAK, 0, 0.985, 0.04);
    label(g, 'LIGHT LAB / 빛의 온도', 1.60, 0.11, 0, 1.69, -0.084, DARK, CREAM);
    const litGroup = inUse(g, out, [0.77, 1.69, -0.08]);
    const bays = [-0.56, 0, 0.56].map((x, i) => {
        part(g, box(0.46, 0.53, 0.018), ['#d9cbb3', '#d9d9c9', '#d1dbdb'][i], x, 1.32, -0.08);
        label(g, ['2700 K', '4000 K', '6500 K'][i], 0.35, 0.065, x, 1.08, -0.06, PAPER, DARK);
        part(g, cyl(0.045, 0.045, 0.04, 16), BRASS, x, 1.54, -0.055, { rx: Math.PI / 2 });
        if (i === 0) {
            part(g, cyl(0.06, 0.11, 0.13, 24), CLAY, x, 1.49, 0.06);
            rod(g, vec([x, 1.54, -0.04]), vec([x, 1.55, 0.06]), 0.015, BRASS);
        }
        else if (i === 1) {
            part(g, rbox(0.21, 0.045, 0.12, 0.01), BRASS, x, 1.51, 0.03);
        }
        else {
            part(g, cyl(0.055, 0.055, 0.15, 20), DARK, x, 1.48, 0.045, { rx: -0.35 });
        }
        const color = ['#ffe1a0', '#fff5d9', '#dcefff'][i];
        const on = group(litGroup);
        glowing(on, cyl(i === 1 ? 0.08 : 0.053, i === 1 ? 0.08 : 0.053, 0.009, 24), color, x, 1.42, 0.05);
        const poolMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.50, depthWrite: false });
        const pool = new THREE.Mesh(new THREE.CircleGeometry(0.18, 28), poolMat);
        pool.position.set(x, 1.25, -0.063);
        pool.scale.y = 0.8;
        pool.userData.ownGeometry = pool.userData.ownMaterial = true;
        on.add(pool);
        const puck = part(g, cyl(0.031, 0.031, 0.012, 16), STEEL, x, 1.018, 0.16);
        return { on, poolMat, puck };
    });
    for (let i = 0; i < 3; i++) {
        part(g, box(0.16, 0.22, 0.12), PALETTE[i + 1], -0.45 + i * 0.45, 0.54, -0.02);
        label(g, ['간접등', '작업등', '스포트'][i], 0.28, 0.05, -0.45 + i * 0.45, 0.33, -0.07, CREAM, INK);
    }
    const switchBox = group(g, ...I.LIGHT.switch);
    part(switchBox, rbox(0.095, 0.10, 0.03, 0.01), PAPER, 0, -0.035, -0.02);
    const rocker = part(switchBox, box(0.045, 0.065, 0.01), STEEL, 0, -0.03, 0);
    const dimmer = part(g, cyl(0.035, 0.035, 0.024, 20), BRASS, ...I.LIGHT.dim, { rx: Math.PI / 2 });
    part(dimmer, box(0.003, 0.01, 0.025), DARK, 0, 0.015, 0.017, { outline: false });
    const meter = group(g, ...I.LIGHT.meter);
    part(meter, rbox(0.10, 0.035, 0.17, 0.012), DARK, 0, 0, 0);
    const readout = status(meter, ['0 lx', '320 lx', '480 lx', '610 lx', '420 lx'], [0, 0.020, -0.01], 0.075, 0.055);
    readout.mesh.rotation.x = -Math.PI / 2;
    part(meter, cyl(0.032, 0.032, 0.013, 16), PAPER, 0, 0.021, -0.066);
    notebook(g, I.LIGHT.paper, '조명 사양', 0.23, 0.18);
    const pencil = pen(g), writing = marks(g, [0.23, 1.014, 0.27]);
    place(pencil, [0.49, 1.04, 0.25]);
    pencil.rotation.z = Math.PI / 2;
    const screen = status(g, ['전원 대기', '따뜻한 휴식', '자연스러운 작업', '선명한 디테일', '밝기 70%', '조도 기록 완료'], [0, 0.85, 0.08], 0.82, 0.07);
    out.screen = screen.mesh;
    const s = use(g, 'idLight');
    out.spots = { idTestLighting: s, '*': s };
    out.animate = t => {
        if (!active([s], t))
            return;
        const q = now(s, t), k = q.b.key;
        const index = k === 'warm' ? 0 : k === 'neutral' ? 1 : k === 'switch' ? -1 : 2;
        bays.forEach((b, i) => { b.on.visible = i === index; b.poolMat.opacity = k === 'dim' ? 0.50 - q.b.u * 0.22 : 0.5; b.puck.position.y = i === index ? 1.012 : 1.018; });
        rocker.rotation.x = index >= 0 ? -0.25 : 0.25;
        dimmer.rotation.y = q.open * 1.6;
        place(meter, ['meter', 'dim'].includes(k) ? q.prop : I.LIGHT.meter);
        meter.rotation.x = ['meter', 'dim'].includes(k) ? 0.5 : 0;
        readout.set(k === 'dim' || k === 'note' ? 4 : index + 1);
        place(pencil, k === 'note' ? q.r : [0.49, 1.04, 0.25]);
        pencil.rotation.z = k === 'note' ? 0 : Math.PI / 2;
        writing.forEach((a, i) => a.visible = k === 'note' && q.b.u > i / 5);
        screen.set(k === 'note' ? 5 : k === 'dim' ? 4 : index + 1);
    };
};
function smallSofa(g: THREE.Object3D, p: I.V) {
    const a = group(g, ...p);
    part(a, rbox(0.19, 0.04, 0.10, 0.01), SAGE, 0, 0.01, 0);
    part(a, rbox(0.19, 0.07, 0.022, 0.007), SAGE, 0, 0.05, -0.045);
    for (const x of [-0.084, 0.084])
        part(a, box(0.022, 0.045, 0.10), SAGE, x, 0.04, 0);
    for (const x of [-0.045, 0.045])
        part(a, rbox(0.066, 0.012, 0.07, 0.004), '#a5b09a', x, 0.035, 0.004);
    return a;
}
const modelTable: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
    bench(g, 1.83, 0.85);
    label(g, '공간 모형 / 1 : 50', 1.05, 0.08, 0, 0.78, 0.43, DARK, CREAM);
    const platter = group(g, 0.10, 0.97, -0.05);
    part(platter, cyl(0.37, 0.37, 0.028, 48), DARK, 0, -0.005, 0);
    part(platter, box(0.66, 0.03, 0.51), CREAM, 0, 0.02, 0);
    for (let i = 0; i < 8; i++)
        part(platter, box(0.065, 0.005, 0.45), i % 2 ? '#dac09a' : '#d2b58c', -0.26 + i * 0.075, 0.038, 0);
    part(platter, box(0.66, 0.22, 0.018), PAPER, 0, 0.15, -0.25);
    part(platter, box(0.018, 0.22, 0.40), PAPER, -0.32, 0.15, -0.05);
    part(platter, box(0.018, 0.12, 0.19), PAPER, 0.13, 0.10, -0.15);
    part(platter, box(0.17, 0.14, 0.010), '#afd1d7', -0.14, 0.17, -0.237);
    for (const x of [-0.23, -0.14, -0.05])
        part(platter, box(0.005, 0.15, 0.014), OAK, x, 0.17, -0.227);
    part(platter, box(0.19, 0.005, 0.015), OAK, -0.14, 0.095, -0.227);
    part(platter, box(0.26, 0.004, 0.20), '#d6b7a4', -0.06, 0.043, 0.05);
    const coffee = group(platter, -0.06, 0.09, 0.04);
    part(coffee, cyl(0.06, 0.06, 0.014, 20), OAK, 0, 0, 0);
    for (const x of [-0.04, 0.04])
        part(coffee, box(0.009, 0.05, 0.009), DARK, x, -0.025, 0);
    part(platter, box(0.10, 0.06, 0.13), CLAY, 0.23, 0.075, -0.13);
    part(platter, box(0.10, 0.03, 0.13), PAPER, 0.23, 0.12, -0.13);
    part(platter, cyl(0.025, 0.02, 0.045, 12), CREAM, -0.25, 0.065, 0.14);
    for (let i = 0; i < 3; i++)
        part(platter, ball(0.025), SAGE, -0.25 + Math.sin(i * 2) * 0.015, 0.105 + i * 0.01, 0.14);
    const sofa = smallSofa(g, I.MODEL.sofa);
    const route = Array.from({ length: 8 }, (_, i) => glowing(g, box(0.024, 0.002, 0.012), '#ddab59', -0.12 + i * 0.044, 1.015, 0.30 - Math.sin(i / 7 * Math.PI) * 0.08));
    route.forEach(a => a.visible = false);
    const plan = picture(g, planTexture(), 0.36, 0.31, -0.57, 0.947, 0.03);
    plan.rotation.x = -Math.PI / 2;
    const dial = part(g, cyl(0.033, 0.033, 0.025, 20), BRASS, ...I.MODEL.dial);
    part(dial, box(0.004, 0.001, 0.023), DARK, 0, 0.014, 0.006, { outline: false });
    flat(g, '회전', 0.10, 0.035, [0.42, 0.949, 0.33]);
    for (let i = 0; i < 3; i++) {
        part(g, box(0.18, 0.03, 0.11), PAPER, 0.70, 0.98 + i * 0.03, -0.21);
        flat(g, ['주거', '가구', '조명'][i], 0.13, 0.055, [0.70, 0.996 + i * 0.03, -0.21]);
    }
    const viewer = client(g, 0.78, 0.75, false, -0.6);
    viewer.root.visible = false;
    const screen = status(g, ['가구 배치 검토', '소파 위치 변경', '통로 900 mm', '시야 확인', '배치안 승인'], [0.60, 1.12, -0.34], 0.45, 0.075);
    out.screen = screen.mesh;
    inUse(g, out, [0.78, 0.80, 0.43]);
    const s = use(g, 'idModel', -0.08);
    out.spots = { idPlanLayout: s, '*': s };
    out.animate = t => {
        if (!active([s], t))
            return;
        const q = now(s, t), k = q.b.key;
        place(sofa, q.prop);
        platter.rotation.y = q.turn;
        dial.rotation.y = q.turn * 3;
        if (['rotate', 'show'].includes(k)) {
            const p = vec(I.MODEL.target).sub(platter.position).applyAxisAngle(UP, q.turn).add(platter.position);
            sofa.position.copy(p);
            sofa.rotation.y = q.turn;
        }
        else
            sofa.rotation.y = 0;
        route.forEach((a, i) => a.visible = ['route', 'rotate', 'show'].includes(k) && q.progress > i / 8);
        viewer.root.visible = true;
        viewer.pose(k === 'show' ? 0.55 : 0.10, k === 'show' ? 0.10 * Math.sin(t * 4) : 0.02);
        screen.set(k === 'show' ? 4 : k === 'rotate' ? 3 : k === 'route' ? 2 : ['lift', 'place'].includes(k) ? 1 : 0);
    };
};
// A tensioned pull-down textile and separate wallpaper roll, each visibly unwinding.
const fabricRack: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
    for (const x of [-0.83, 0.83]) {
        part(g, box(0.055, 1.70, 0.055), DARK, x, 0.87, -0.18);
        part(g, box(0.20, 0.055, 0.65), DARK, x, 0.055, -0.03);
    }
    part(g, box(1.78, 0.10, 0.08), OAK, 0, 1.72, -0.18);
    label(g, 'TEXTILE / 원단 · 벽지', 1.54, 0.08, 0, 1.72, -0.13, DARK, CREAM);
    bench(g, 1.75, 0.65, 0.96);
    const rolls: THREE.Group[] = [];
    for (let i = 0; i < 4; i++) {
        const a = group(g, -0.57 + i * 0.39, 1.51, -0.14);
        part(a, cyl(0.083, 0.083, 0.32, 24), PALETTE[i], 0, 0, 0, { rz: Math.PI / 2 });
        part(a, cyl(0.022, 0.022, 0.36, 12), EDGE, 0, 0, 0, { rz: Math.PI / 2 });
        for (const x of [-0.166, 0.166])
            part(a, cyl(0.069, 0.069, 0.005, 24), CREAM, x, 0, 0, { rz: Math.PI / 2 });
        rolls.push(a);
        if (i !== 1) {
            part(g, box(0.30, 0.31, 0.004), PALETTE[i], -0.57 + i * 0.39, 1.32, -0.055);
            label(g, ['LINEN', '', 'COTTON', 'WALL'][i], 0.22, 0.04, -0.57 + i * 0.39, 1.18, -0.05, PAPER, DARK);
        }
    }
    const cloth = group(g);
    const textile = part(cloth, box(0.33, 1, 0.006), SAGE, 0, 0, 0);
    const stripes = Array.from({ length: 12 }, (_, i) => part(cloth, box(0.0015, 1, 0.001), '#cad0ba', -0.15 + i * 0.027, 0, -0.004, { outline: false }));
    const hem = part(g, cyl(0.012, 0.012, 0.35, 12), BRASS, ...I.FABRIC.edge, { rz: Math.PI / 2 });
    const wallpaper = group(g, 0.38, 1.0, 0.13);
    const paper = part(wallpaper, box(0.26, 0.006, 0.31), CREAM, 0, 0, 0);
    for (let i = 0; i < 15; i++)
        part(wallpaper, ball(0.013), PALETTE[3], (i % 3 - 1) * 0.07, 0.006, (Math.floor(i / 3) - 2) * 0.052, { outline: false }).scale.y = 0.08;
    const paperRoll = part(g, cyl(0.035, 0.035, 0.27, 20), CREAM, 0.38, 1.035, -0.02, { rz: Math.PI / 2 });
    const match = swatch(g, I.FABRIC.match, CLAY, 0.13, 0.14);
    match.visible = false;
    const tape = group(g);
    tape.visible = false;
    part(tape, box(0.43, 0.003, 0.025), '#edcf78', 0, 0, 0);
    for (let i = 0; i < 20; i++)
        part(tape, box(0.001, 0.001, i % 5 ? 0.007 : 0.017), DARK, -0.20 + i * 0.02, 0.002, 0, { outline: false });
    const tag = group(g, -0.03, 1.06, 0.33);
    part(tag, box(0.09, 0.003, 0.055), PAPER, 0, 0, 0);
    flat(tag, 'L-203', 0.08, 0.035, [0, 0.003, 0]);
    tag.visible = false;
    const pencil = pen(g);
    place(pencil, [0.62, 1.00, 0.23]);
    pencil.rotation.z = Math.PI / 2;
    for (let i = 0; i < 5; i++) {
        part(g, cyl(0.045, 0.045, 0.43, 18), PALETTE[i], -0.60 + i * 0.29, 0.49, -0.04, { rz: 0.08 });
        part(g, cyl(0.024, 0.024, 0.008, 12), EDGE, -0.617 + i * 0.29, 0.707, -0.04);
        label(g, `${i + 1} / 보관`, 0.12, 0.04, -0.60 + i * 0.29, 0.43, 0.006, PAPER, DARK);
    }
    const screen = status(g, ['샘플 펼치기', '패턴 대조', '폭 140 cm', '소재 번호 기록'], [0, 0.80, 0.33], 0.70, 0.07);
    out.screen = screen.mesh;
    inUse(g, out, [0.77, 1.72, -0.13]);
    const s = use(g, 'idFabric');
    out.spots = { idCompareFabric: s, '*': s };
    const shape = (end: I.V) => {
        const start = new THREE.Vector3(-0.15, 1.49, -0.055), d = vec(end).sub(start);
        cloth.position.copy(start).addScaledVector(d, 0.5);
        cloth.quaternion.setFromUnitVectors(UP, d.clone().normalize());
        textile.scale.y = d.length();
        stripes.forEach(a => a.scale.y = d.length());
        place(hem, end);
    };
    shape(I.FABRIC.edge);
    out.animate = t => {
        if (!active([s], t))
            return;
        const q = now(s, t), k = q.b.key;
        shape(q.prop);
        rolls[1].rotation.x = q.open * 2.8;
        wallpaper.scale.z = Math.max(0.1, q.progress);
        paperRoll.position.z = -0.02 + q.progress * 0.15;
        paperRoll.rotation.x = q.progress * 4;
        paper.visible = q.progress > 0.1;
        match.visible = k === 'match';
        place(match, q.r);
        match.rotation.x = 0.7;
        tape.visible = k === 'measure';
        place(tape, [-0.07, 1.10, 0.33]);
        tag.visible = k === 'tag' || k === 'roll';
        place(pencil, k === 'tag' ? q.r : [0.62, 1.00, 0.23]);
        pencil.rotation.z = k === 'tag' ? 0 : Math.PI / 2;
        screen.set(k === 'tag' ? 3 : k === 'measure' ? 2 : k === 'match' ? 1 : 0);
    };
};
function chair(g: THREE.Object3D, z: number, yaw: number, color: string) {
    const a = group(g, 0, 0, z, yaw);
    for (const x of [-0.17, 0.17])
        for (const dz of [-0.15, 0.15]) {
            part(a, cyl(0.018, 0.025, 0.41, 12), OAK, x, 0.225, dz);
            part(a, cyl(0.026, 0.026, 0.025, 12), DARK, x, 0.02, dz);
        }
    part(a, rbox(0.43, 0.07, 0.41, 0.04), color, 0, 0.425, 0);
    part(a, rbox(0.43, 0.31, 0.055, 0.03), color, 0, 0.65, -0.18, { rx: -0.08 });
    for (const x of [-0.19, 0.19])
        part(a, cyl(0.013, 0.013, 0.30, 10), OAK, x, 0.60, -0.17);
    return a;
}
function presentationBoard(g: THREE.Object3D) {
    const a = group(g);
    part(a, rbox(0.37, 0.012, 0.28, 0.005), DARK, 0, 0, 0);
    part(a, box(0.35, 0.002, 0.26), PAPER, 0, 0.008, 0);
    roomPicture(a, [-0.055, 0.010, -0.025], 0.20, 0.16, 0, true);
    for (let i = 0; i < 3; i++)
        part(a, box(0.055, 0.002, 0.045), PALETTE[i + 1], 0.105, 0.010, -0.07 + i * 0.055, { outline: false });
    flat(a, '따뜻한 거실 / 03', 0.27, 0.035, [0, 0.011, 0.09]);
    // A two-sided laminated presentation card: the client across the table can
    // read the same room image and palette as the designer holding its edges.
    const reverse = group(a, 0, -0.010, 0);
    reverse.rotation.z = Math.PI;
    part(reverse, box(0.35, 0.002, 0.26), PAPER, 0, 0, 0);
    roomPicture(reverse, [-0.055, 0.002, -0.025], 0.20, 0.16, 0, true);
    for (let i = 0; i < 3; i++) part(reverse, box(0.055, 0.002, 0.045), PALETTE[i + 1], 0.105, 0.002, -0.07 + i * 0.055, { outline: false });
    flat(reverse, '따뜻한 거실 / 03', 0.27, 0.035, [0, 0.003, 0.09]);
    return a;
}
const consultation: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
    // One visitor seat is registered with waitSeats. The opposed designer seat is
    // only a social/interaction spot, so visitors never reserve both sides at once.
    chair(g, -0.67, 0, '#b9a58e');
    chair(g, 0.76, Math.PI, SAGE);
    out.seat = marker(g, 0, 0.46, -0.67);
    const table = group(g);
    legs(table, 1.14, 0.48, 0.72, OAK, 0.045, 0.03);
    part(table, rbox(1.28, 0.06, 0.70, 0.07), CREAM, 0, 0.75, 0);
    part(table, box(1.08, 0.09, 0.035), EDGE, 0, 0.66, -0.22);
    label(table, '다정 / 공간 상담', 0.64, 0.07, 0, 0.70, 0.352, CREAM, DARK);
    const plan = picture(g, planTexture(), 0.38, 0.28, -0.06, 0.784, -0.06);
    plan.rotation.x = -Math.PI / 2;
    const board = presentationBoard(g);
    place(board, I.CONSULT.board);
    const fan = fanDeck(g);
    place(fan.root, I.CONSULT.fan);
    notebook(g, I.CONSULT.paper, '상담 기록', 0.22, 0.20);
    const pencil = pen(g);
    place(pencil, I.CONSULT.pen);
    pencil.rotation.z = Math.PI / 2;
    const writing = marks(g, [0.24, 0.815, 0.18]);
    for (const x of [-0.50, 0.49]) {
        part(g, cyl(0.065, 0.065, 0.009, 24), '#b29f80', x, 0.785, -0.18);
        part(g, cyl(0.041, 0.034, 0.08, 20), PAPER, x, 0.83, -0.18);
        part(g, cyl(0.033, 0.033, 0.002, 20), '#79573b', x, 0.869, -0.18);
        part(g, ring(0.023, 0.006), PAPER, x + 0.047, 0.83, -0.18, { ry: Math.PI / 2 });
    }
    const bag = group(g, -0.52, 0, -0.67);
    part(bag, rbox(0.25, 0.25, 0.13, 0.02), '#ab785a', 0, 0.15, 0);
    part(bag, ring(0.065, 0.009, Math.PI), EDGE, 0, 0.28, 0);
    part(bag, box(0.025, 0.025, 0.005), BRASS, 0, 0.21, 0.068);
    const guest = client(g, 0, -0.67, true);
    guest.root.visible = false;
    const consent = part(g, box(0.075, 0.002, 0.055), PALETTE[2], 0.08, 0.802, 0.08);
    consent.visible = false;
    const screen = status(g, ['어서 오세요', '생활과 취향 듣기', '소재 제안', '의뢰인 의견', '상담 기록', '시안 설명', '수정안 승인'], [-0.48, 0.91, -0.01], 0.22, 0.07);
    out.screen = screen.mesh;
    const glow = inUse(g, out, [-0.59, 0.91, -0.01]);
    const consult = use(g, 'idConsult', 0, 0.67, true), present = use(g, 'idPresent', 0, 0.67, true);
    const socialConsult = use(g, 'idConsult', 0, 0.67, true), socialPresent = use(g, 'idPresent', 0, 0.67, true);
    const spots = [consult, present, socialConsult, socialPresent];
    out.spots = { idDesignConsult: consult, idPresentBoard: present, 'social:designConsult': socialConsult, 'social:presentMoodBoard': socialPresent, '*': consult };
    out.animate = t => {
        const s = active(spots, t);
        if (!s)
            return;
        const q = now(s, t), k = q.b.key, presenting = s === present || s === socialPresent;
        guest.root.visible = s === consult || s === present;
        if (presenting) {
            place(board, q.prop);
            board.rotation.x = q.tilt;
            place(fan.root, k === 'revise' ? q.r : I.CONSULT.fan);
            fan.open(k === 'revise' ? 0.75 : 0.15);
        }
        else {
            place(board, [0.16, 0.79, -0.09]);
            board.rotation.x = 0;
            place(fan.root, q.prop);
            fan.open(q.open);
        }
        const replying = k === 'reply' || k === 'listen';
        // The client takes the offered deck at the far edge of the tabletop, then
        // points to a selected leaf. Coordinates here are in the guest's local frame.
        const taking = !presenting && k === 'reply';
        guest.pose(replying ? 0.55 + 0.10 * Math.sin(t * 3) : k === 'approve' ? 0.3 : 0.05, ['show', 'approve', 'welcome'].includes(k) ? 0.08 * Math.sin(t * 3.5) : 0.02, taking ? [-0.12, 0.82, 0.50] : undefined);
        if (taking) {
            fan.root.position.y += Math.sin(q.b.u * Math.PI) * 0.025;
        }
        place(pencil, k === 'note' ? q.r : I.CONSULT.pen);
        pencil.rotation.z = k === 'note' ? 0 : Math.PI / 2;
        writing.forEach((a, i) => a.visible = k === 'note' && q.b.u > i / 5);
        consent.visible = k === 'approve';
        screen.set(presenting ? k === 'approve' ? 6 : 5 : k === 'note' ? 4 : k === 'reply' ? 3 : ['fan', 'offer'].includes(k) ? 2 : k === 'listen' ? 1 : 0);
        glow.visible = true;
    };
    // Social users are attached to the visitor's seat object, which is not always
    // in the engine's object-use list. Polling posedAt animates the same props.
    out.away = (_away, t) => { if (active([socialConsult, socialPresent], t))
        out.animate?.(t); };
};
function sampleBox(g: THREE.Object3D) {
    const a = group(g);
    part(a, rbox(0.36, 0.25, 0.28, 0.008), '#bba080', 0, -0.055, 0);
    part(a, box(0.37, 0.025, 0.29), '#d0b38b', 0, 0.075, 0);
    part(a, box(0.035, 0.006, 0.29), '#e5d5af', 0, 0.09, 0);
    for (const x of [-0.183, 0.183])
        part(a, box(0.004, 0.04, 0.09), DARK, x, 0, 0);
    label(a, '소재 / 거실 01', 0.29, 0.065, 0, -0.025, 0.142, PAPER, DARK);
    label(a, '↑ 취급 주의', 0.19, 0.035, 0, -0.095, 0.142, '#bba080', DARK);
    return a;
}
function portableLamp(g: THREE.Object3D) {
    const a = group(g);
    part(a, cyl(0.09, 0.09, 0.022, 24), BRASS, 0, -0.28, 0);
    part(a, cyl(0.014, 0.014, 0.30, 12), BRASS, 0, -0.12, 0);
    part(a, cyl(0.07, 0.12, 0.17, 24), CREAM, 0, 0.08, 0);
    part(a, cyl(0.068, 0.068, 0.005, 24), OAK, 0, 0.168, 0);
    for (let i = 0; i < 12; i++) {
        const angle = i / 12 * Math.PI * 2;
        rod(a, vec([Math.cos(angle) * 0.071, 0.16, Math.sin(angle) * 0.071]), vec([Math.cos(angle) * 0.12, 0, Math.sin(angle) * 0.12]), 0.0015, '#c4b99e');
    }
    return a;
}
const decorVan: Builder = (g, _W, _D, _c, _def, _ctx, out) => {
    const car = group(g);
    part(car, rbox(1.87, 0.19, 0.84, 0.08), DARK, 0, 0.40, -0.04);
    part(car, rbox(1.18, 0.06, 0.84, 0.02), CREAM, -0.34, 1.365, -0.04);
    part(car, box(1.18, 0.85, 0.035), CREAM, -0.34, 0.94, -0.442);
    for (const x of [-0.912, 0.232])
        part(car, box(0.035, 0.85, 0.84), CREAM, x, 0.94, -0.04);
    // Open loading bay is a genuine recess, not a box drawn over a solid side.
    part(car, box(1.0, 0.64, 0.026), DARK, -0.40, 0.96, -0.413);
    part(car, box(1.02, 0.045, 0.41), OAK, -0.40, 0.71, 0.18);
    for (const x of [-0.91, 0.12])
        part(car, box(0.045, 0.69, 0.10), CREAM, x, 1.01, 0.39);
    // Open cab above the beltline: glazing must reveal the driver, not cover a
    // solid body block. Window seals and pillars keep the cab legible at distance.
    part(car, rbox(0.69, 0.40, 0.82, 0.06), SAGE, 0.57, 0.72, -0.04);
    part(car, rbox(0.73, 0.055, 0.86, 0.025), SAGE, 0.57, 1.315, -0.04);
    part(car, box(0.035, 0.39, 0.80), SAGE, 0.245, 1.10, -0.04);
    for (const z of [-0.435, 0.355]) {
        for (const x of [0.27, 0.895]) part(car, box(0.035, 0.39, 0.035), SAGE, x, 1.10, z);
        part(car, box(0.63, 0.025, 0.025), DARK, 0.58, 0.925, z);
        part(car, box(0.63, 0.018, 0.025), DARK, 0.58, 1.285, z);
        glass(car, box(0.58, 0.34, 0.008), 0.58, 1.105, z);
    }
    glass(car, box(0.008, 0.34, 0.75), 0.911, 1.105, -0.04);
    part(car, box(0.018, 0.025, 0.78), DARK, 0.914, 0.925, -0.04);
    part(car, box(0.018, 0.018, 0.78), DARK, 0.914, 1.285, -0.04);
    for (const z of [-0.23, 0.13]) rod(car, vec([0.923, 0.94, z]), vec([0.923, 1.04, z - 0.09]), 0.007, INK);
    part(car, rbox(0.10, 0.12, 0.04, 0.012), DARK, 0.88, 1.02, 0.43);
    part(car, box(0.055, 0.02, 0.08), SAGE, 0.88, 0.99, 0.39);
    part(car, box(0.46, 0.025, 0.025), DARK, 0.57, 0.95, 0.39);
    part(car, box(0.10, 0.02, 0.025), BRASS, 0.36, 0.90, 0.40);
    part(car, rbox(0.38, 0.24, 0.83, 0.06), SAGE, 0.78, 0.64, -0.04);
    part(car, box(0.045, 0.10, 0.88), DARK, 0.98, 0.48, -0.04);
    for (const z of [-0.33, 0.25])
        part(car, box(0.021, 0.10, 0.14), PAPER, 1.006, 0.66, z);
    part(car, box(0.015, 0.075, 0.33), INK, 1.008, 0.56, -0.04);
    const door = group(car, -0.91, 1.36, 0.425);
    part(door, rbox(1.03, 0.65, 0.025, 0.015), CREAM, 0.515, -0.325, 0);
    // Slatted service shutter retracts into its top cassette; no low hatch crosses
    // the loader's shoulders or the lamp on its way into the bay.
    for (let i = 1; i < 8; i++)
        part(door, box(1.0, 0.003, 0.002), '#bdb6a8', 0.515, -i * 0.08, 0.015, { outline: false });
    part(car, box(1.08, 0.065, 0.07), SAGE, -0.395, 1.385, 0.425);
    part(door, box(0.14, 0.022, 0.025), BRASS, 0.43, -0.20, 0.026);
    label(door, '다정 / 공간을 옮기다', 0.87, 0.13, 0.515, -0.39, 0.016, CREAM, DARK);
    label(door, 'DESIGN & REVEAL', 0.73, 0.055, 0.515, -0.50, 0.016, CREAM, DARK);
    const wheels: THREE.Group[] = [];
    for (const x of [-0.63, 0.65])
        for (const z of [-0.48, 0.40]) {
            const a = group(car, x, 0.28, z);
            part(a, cyl(0.235, 0.235, 0.10, 24), INK, 0, 0, 0, { rx: Math.PI / 2 });
            part(a, cyl(0.14, 0.14, 0.112, 20), STEEL, 0, 0, 0, { rx: Math.PI / 2 });
            for (let i = 0; i < 5; i++)
                part(a, ball(0.017), DARK, Math.cos(i / 5 * Math.PI * 2) * 0.087, Math.sin(i / 5 * Math.PI * 2) * 0.087, z > 0 ? 0.06 : -0.06, { outline: false });
            part(a, cyl(0.046, 0.046, 0.12, 16), CREAM, 0, 0, 0, { rx: Math.PI / 2 });
            wheels.push(a);
        }
    // Roof rack carries protected wallpaper tubes and a folded rug.
    for (const z of [-0.30, 0.20])
        part(car, box(1.21, 0.035, 0.035), DARK, -0.28, 1.46, z);
    for (const x of [-0.78, 0.20])
        part(car, box(0.035, 0.06, 0.60), DARK, x, 1.45, -0.05);
    for (let i = 0; i < 3; i++)
        part(car, cyl(0.05, 0.05, 0.98, 20), i % 2 ? CLAY : '#cbb697', -0.28, 1.53, -0.21 + i * 0.15, { rz: Math.PI / 2 });
    for (const x of [-0.62, 0.08])
        part(car, box(0.025, 0.13, 0.44), SAGE, x, 1.51, -0.06);
    const boxProp = sampleBox(car);
    place(boxProp, I.VAN.box);
    const lamp = portableLamp(car);
    place(lamp, I.VAN.lamp);
    const packed = sampleBox(car);
    place(packed, [-0.64, 0.88, -0.11]);
    packed.scale.setScalar(0.75);
    const strap = group(car);
    part(strap, box(0.51, 0.022, 0.016), SAGE, -0.46, 1.02, 0.365);
    part(strap, box(0.055, 0.042, 0.02), BRASS, -0.43, 1.02, 0.38);
    // The lamp stands on a transit case before loading and on a raised pad in
    // the cargo bay afterwards. Its brass foot never hangs in empty space.
    const lampCase = group(g, -0.13, 0, 0.65);
    for (let i = 0; i < 2; i++) {
        part(lampCase, rbox(0.27, 0.42, 0.27, 0.012), i ? SAGE : OAK, 0, 0.23 + i * 0.43, 0);
        part(lampCase, box(0.28, 0.018, 0.28), CREAM, 0, 0.445 + i * 0.43, 0);
        label(lampCase, '조명 운반', 0.20, 0.045, 0, 0.23 + i * 0.43, 0.137, PAPER, DARK);
        part(lampCase, box(0.08, 0.018, 0.012), BRASS, 0, 0.31 + i * 0.43, 0.14);
    }
    part(car, rbox(0.25, 0.16, 0.24, 0.012), SAGE, -0.12, 0.81, 0.12);
    const stool = group(g, -0.48, 0, 0.78);
    part(stool, box(0.44, 0.03, 0.33), OAK, 0, 0.49, 0);
    for (const x of [-0.17, 0.17])
        for (const z of [-0.12, 0.12])
            part(stool, cyl(0.015, 0.02, 0.48, 10), DARK, x, 0.25, z);
    const paper = notebook(g, I.VAN.paper, '공개일 체크', 0.30, 0.21);
    paper.visible = false;
    const pencil = pen(g);
    pencil.visible = false;
    const ticks = marks(paper, [-0.09, 0.014, 0.01], 4);
    const screen = status(g, ['현장 준비', '소재 상자 적재', '조명 고정', '준비 확인', '공개 현장으로', '복귀 중'], [0, 1.83, 0.05], 1.14, 0.12);
    out.screen = screen.mesh;
    const lights = inUse(car, out, [-0.87, 1.40, 0.39]);
    const headlights = group(car);
    headlights.visible = false;
    for (const z of [-0.33, 0.25])
        glowing(headlights, box(0.024, 0.10, 0.14), '#fff2b7', 1.01, 0.66, z);
    const driver = group(car, 0.56, 0.79, 0.07, Math.PI / 2);
    part(driver, rbox(0.24, 0.30, 0.19, 0.04), DARK, 0, 0.14, 0);
    part(driver, ball(0.10), SKIN, 0, 0.39, 0);
    part(driver, ball(0.105), EDGE, 0, 0.43, -0.025);
    for (const x of [-0.12, 0.12])
        rod(driver, vec([x, 0.25, 0]), vec([x, 0.18, 0.19]), 0.03, DARK);
    part(driver, ring(0.10, 0.01), INK, 0, 0.18, 0.20, { rx: 0.4 });
    driver.visible = false;
    const load = use(g, 'idLoad', -0.48, 1.12), reveal = use(g, 'idReveal', -0.48, 1.12);
    out.spots = { idLoadReveal: load, revealDay: reveal, '*': load };
    let state: 'parked' | 'leaving' | 'gone' | 'returning' = 'parked', since = 0;
    out.animate = t => {
        const s = active([load, reveal], t);
        if (!s || state !== 'parked')
            return;
        const q = now(s, t), k = q.b.key;
        door.scale.y = 1 - q.open * 0.97;
        place(boxProp, q.prop);
        place(lamp, k === 'lamp' ? q.r : q.progress > 0.9 ? I.VAN.secured : I.VAN.lamp);
        strap.visible = ['strap', 'check', 'shut'].includes(k);
        paper.visible = k === 'brief' || k === 'check';
        pencil.visible = k === 'check';
        place(pencil, q.r);
        ticks.forEach((a, i) => a.visible = k === 'check' && q.b.u > i / 4);
        screen.set(k === 'check' || k === 'shut' ? 3 : k === 'lamp' || k === 'strap' ? 2 : k === 'lift' || k === 'load' ? 1 : 0);
    };
    out.away = (isOut, t) => {
        if (isOut && (state === 'parked' || state === 'returning')) {
            state = 'leaving';
            since = t;
        }
        else if (!isOut && (state === 'leaving' || state === 'gone')) {
            state = 'returning';
            since = t;
        }
        let distance = 0;
        if (state === 'leaving') {
            const u = Math.min(1, (t - since) / 5);
            distance = 13 * u * u;
            if (u === 1)
                state = 'gone';
        }
        if (state === 'returning') {
            const u = Math.min(1, (t - since) / 6);
            distance = 13 * (1 - u) ** 2;
            if (u === 1)
                state = 'parked';
        }
        car.position.x = distance;
        car.visible = state !== 'gone';
        const moving = state === 'leaving' || state === 'returning';
        wheels.forEach(a => a.rotation.z = -distance / 0.235);
        driver.visible = headlights.visible = moving;
        stool.visible = state === 'parked';
        screen.mesh.visible = state !== 'gone';
        if (state !== 'parked') {
            door.scale.y = 1;
            place(boxProp, I.VAN.load);
            place(lamp, I.VAN.secured);
            strap.visible = true;
            paper.visible = pencil.visible = false;
            screen.set(state === 'returning' ? 5 : 4);
            lights.visible = moving;
        }
        else if (!active([load, reveal], t)) {
            door.scale.y = 1;
            place(boxProp, I.VAN.box);
            place(lamp, I.VAN.lamp);
            strap.visible = false;
            paper.visible = pencil.visible = false;
            screen.set(0);
        }
    };
};
/** Return moved props to their designed resting positions after use. The snapshot
 * includes child visibility and transforms but leaves engine-owned lights alone.
 * No generic held-tool copy is used, so cancelling mid-beat cannot leave duplicates. */
function resetAfterUse(build: Builder): Builder {
    return (g, W, D, c, def, ctx, out) => {
        build(g, W, D, c, def, ctx, out);
        const snapshot: {
            a: THREE.Object3D;
            p: THREE.Vector3;
            q: THREE.Quaternion;
            s: THREE.Vector3;
            visible: boolean;
        }[] = [];
        g.traverse(a => { if (a !== g && a !== out.inUse && a !== out.screen)
            snapshot.push({ a, p: a.position.clone(), q: a.quaternion.clone(), s: a.scale.clone(), visible: a.visible }); });
        const away = out.away, animate = out.animate;
        let wasUsed = false;
        out.animate = t => { wasUsed = true; animate?.(t); };
        out.away = (isOut, t) => {
            away?.(isOut, t);
            const using = !!active(Object.values(out.spots ?? {}), t);
            if (using)
                wasUsed = true;
            if (wasUsed && !using && !isOut) {
                snapshot.forEach(({ a, p, q, s, visible }) => { a.position.copy(p); a.quaternion.copy(q); a.scale.copy(s); a.visible = visible; });
                wasUsed = false;
            }
        };
    };
}
export const BUILDERS: Record<string, Builder> = {
    materialLibrary: resetAfterUse(materialLibrary), moodBoard: resetAfterUse(moodBoard), sampleTable: resetAfterUse(sampleTable),
    decorVan, idColourWall: resetAfterUse(colourWall), idLightingWall: resetAfterUse(lightingWall),
    idModelTable: resetAfterUse(modelTable), idFabricRack: resetAfterUse(fabricRack), idConsultChair: resetAfterUse(consultation),
    /** The studio's glass front on the street (2026-11-05, the layout audit; shopFront.ts): the consultation room seen through it. */
    idShopFront(g) {
        shopFront(g, { ax: 1, x0: 2, x1: 14, door: 12, name: '수정 인테리어', sub: 'DESIGN · REMODELING', bg: '#3e2f28', fg: '#f3e9dc', frame: '#2b2b2b', posters: [['아파트 리모델링 상담', '#f3e9dc', '#3e2f28', 4.5], ['자재 샘플 보러 오세요', '#ffffff', '#6d4c41', 8.5]] });
    },
};
