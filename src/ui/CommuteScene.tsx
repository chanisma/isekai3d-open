import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { figureLook } from '../game/looks';
import type { Dweller } from '../game/types';
import { VrmAvatar } from '../view3d/avatar';
import { inTurn, loadsPending } from '../view3d/loadQueue';
import { models } from '../view3d/vrm';
import { loadDressed } from '../view3d/vrmDress';
import { castOf } from '../view3d/vrmLooks';

/**
 * On the way from one lot to another: the dweller themself walking on the spot in a small window over the
 * lot just left, until the next is ready behind it. Their walk is drawn once ahead of time into a strip
 * of pictures and played by the browser's compositor (.commute-strip), so it keeps its pace however
 * busy the loading is. A click closes it.
 */
/** However long the lot takes, the window doesn't stay longer than this. */
const LONGEST = 20;
/** One round of the walk: the strip's pictures, and the second they take (the same in the stylesheet). */
const FRAMES = 24;
const CYCLE = 1;
const FRAME_W = 330;
const FRAME_H = 440;

interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
}
let made: Stage | null | undefined;

function stageOf(): Stage | null {
  if (made !== undefined) return made;
  try {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(1);
    renderer.setSize(FRAME_W, FRAME_H, false);
    renderer.setClearColor(0, 0);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x88907f, 2.2));
    const sun = new THREE.DirectionalLight(0xfff3dd, 2);
    sun.position.set(3, 6, 5);
    scene.add(sun);
    const camera = new THREE.PerspectiveCamera(30, FRAME_W / FRAME_H, 0.1, 100);
    camera.position.set(0, 0.95, 4.2);
    camera.lookAt(0, 0.85, 0);
    made = { renderer, scene, camera };
  } catch {
    made = null;
  }
  return made;
}

/** Each dweller's walk as last dressed. */
const strips = new Map<number, { key: string; strip: HTMLCanvasElement }>();
const drawing = new Map<string, Promise<void>>();

async function drawStrip(stage: Stage, dwellerId: number, key: string, file: string, dress: Parameters<typeof loadDressed>[1], scale: number) {
  const { renderer, scene, camera } = stage;
  const vrm = await loadDressed(file, dress);
  const avatar = new VrmAvatar(vrm, scale);
  scene.add(avatar.root);
  await renderer.compileAsync(avatar.root, camera, scene);
  const dt = CYCLE / FRAMES;
  const state = { pose: { kind: 'walk' as const, at: new THREE.Vector3(), yaw: Math.PI / 2 - 0.3, pace: avatar.stride / CYCLE }, expr: 'smile' as const, asleep: false, active: false };
  // A few rounds first: into the stride, and hair and clothes swinging as they'll go on doing, so the end meets the start.
  for (let i = 0; i < FRAMES * 3; i++) avatar.update(state, dt, i * dt, camera);
  const strip = document.createElement('canvas');
  strip.className = 'commute-strip';
  strip.width = FRAME_W * FRAMES;
  strip.height = FRAME_H;
  const paper = strip.getContext('2d')!;
  for (let i = 0; i < FRAMES; i++) {
    avatar.update(state, dt, (FRAMES * 3 + i) * dt, camera);
    renderer.render(scene, camera);
    paper.drawImage(renderer.domElement, i * FRAME_W, 0);
    // A picture at a time, so that the game goes on between them.
    await new Promise((res) => setTimeout(res, 0));
  }
  scene.remove(avatar.root);
  avatar.dispose();
  strips.set(dwellerId, { key, strip });
}

/** The dweller's walk, dressed as they are now; the one from last time if nothing's changed. */
async function walkOf(stage: Stage, dweller: Dweller, now = true): Promise<HTMLCanvasElement | undefined> {
  const cast = castOf(await models(), figureLook(dweller), { id: dweller.id, face: dweller.face, eyes: dweller.eyes, tints: dweller.tints }, undefined);
  if (!cast) return undefined;
  const key = JSON.stringify([dweller.id, cast.file, cast.dress, cast.scale]);
  if (strips.get(dweller.id)?.key !== key) {
    let job = drawing.get(key);
    if (!job) {
      job = inTurn(() => drawStrip(stage, dweller.id, key, cast.file, cast.dress, cast.scale), now);
      drawing.set(key, job);
      void job.finally(() => drawing.delete(key)).catch(() => undefined);
    }
    await job;
  }
  return strips.get(dweller.id)?.strip;
}

/** Draws the household's walks before they're first wanted. */
export function prepareCommute(dwellers: Dweller[]) {
  const stage = stageOf();
  if (stage) for (const dweller of dwellers) walkOf(stage, dweller, false).catch(() => undefined);
}

interface Props {
  dweller: Dweller;
  place: string;
  icon: string;
  /** 출근 중, 이동 중. */
  doing: string;
  /** The least time it's shown. */
  seconds: number;
  /** Going home or to the land: setting out from elsewhere. */
  home?: boolean;
  clock: string;
  onDone: () => void;
}

export function CommuteScene({ dweller, place, icon, doing, seconds, home, clock, onDone }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const el = host.current!;
    const stage = stageOf();
    let gone = false;
    let shownStrip: HTMLCanvasElement | undefined;
    if (stage)
      walkOf(stage, dweller)
        .then((strip) => {
          if (gone || !strip) return;
          shownStrip = strip;
          el.append(strip);
        })
        .catch(() => undefined);
    const start = performance.now();
    let last = start;
    let shown = -1;
    let at = 0;
    let closing = false;
    let timer = 0;
    let raf = 0;
    const step = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const e = (now - start) / 1000;
      const ready = e >= seconds && (!loadsPending() || e >= LONGEST);
      // Most of the way in the time given, then ever more slowly until the lot is ready, and the last of it once it is.
      if (ready) at = Math.min(1, at + dt / 0.5);
      else at = e < seconds ? (0.85 * e) / seconds : Math.max(at, 1 - 0.15 * Math.exp(-(e - seconds) / 2));
      const p = Math.round(at * 100);
      if (p !== shown) {
        shown = p;
        setProgress(p);
      }
      if (at >= 1 && !closing) {
        closing = true;
        timer = window.setTimeout(() => done.current(), 300);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      gone = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      shownStrip?.remove();
    };
  }, [dweller, seconds]);

  return (
    <div className="commute" onClick={() => onDone()} role="status" aria-label={doing} title="누르면 닫혀요">
      <div className="commute-top">
        <b>{clock}</b>
        <span>
          {doing} · {icon} {place}
        </span>
      </div>
      <div className="commute-stage">
        <div className="commute-walker" ref={host} />
      </div>
      <div className="commute-road">
        <span>{home ? '🏢' : '🏠'}</span>
        <div className="commute-line">
          <i style={{ left: `${progress}%` }}>🚶</i>
        </div>
        <span>{icon}</span>
      </div>
    </div>
  );
}
