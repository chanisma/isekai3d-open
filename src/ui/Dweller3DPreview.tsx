import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildFigure, poseFigure, type Expr, type Figure, type FigureLook } from '../dweller3d/figure';

const YAW = { down: 0, left: -Math.PI / 2, up: Math.PI, right: Math.PI / 2 } as const;

/**
 * Create a Dweller's dweller in 3D (docs/ref-game/13-dweller3d.md): standing on the little stage, turned with the
 * turn button or by dragging, breathing, looking happy. Loaded only when 3D is picked.
 */
export default function Dweller3DPreview({ look, facing, expr = 'smile', label }: { look: FigureLook; facing: keyof typeof YAW; expr?: Expr; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const world = useRef<{ holder: THREE.Group; fig?: Figure; yaw: number } | null>(null);

  useEffect(() => {
    const canvas = ref.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const scene = new THREE.Scene();
    const sun = new THREE.DirectionalLight('#ffffff', 2.0);
    sun.position.set(-1, 3, 2.5);
    scene.add(sun, new THREE.HemisphereLight('#ffffff', '#b8a58f', 1.4));
    const holder = new THREE.Group();
    scene.add(holder);
    const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
    world.current = { holder, yaw: 0 };
    let raf = 0;
    const frame = (now: number) => {
      const w = world.current!;
      const width = canvas.clientWidth || 200;
      const height = canvas.clientHeight || 220;
      if (canvas.width !== Math.round(width * renderer.getPixelRatio())) {
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }
      holder.rotation.y += (w.yaw - holder.rotation.y) * 0.18;
      if (w.fig) {
        poseFigure(w.fig, 'stand', now / 85, exprRef.current, lookRef.current.stage);
        const h = w.fig.height;
        camera.position.set(0, h * 0.6, h * 2.35);
        camera.lookAt(0, h * 0.5, 0);
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      world.current?.fig?.dispose();
      renderer.dispose();
    };
  }, []);

  const lookRef = useRef(look);
  lookRef.current = look;
  const exprRef = useRef(expr);
  exprRef.current = expr;
  const key = JSON.stringify(look);
  useEffect(() => {
    const w = world.current;
    if (!w) return;
    if (w.fig) {
      w.holder.remove(w.fig.root);
      w.fig.dispose();
    }
    w.fig = buildFigure(look);
    w.holder.add(w.fig.root);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const w = world.current;
    if (!w) return;
    // Turn the short way round to the new facing.
    let target = YAW[facing];
    while (target - w.yaw > Math.PI) target -= Math.PI * 2;
    while (w.yaw - target > Math.PI) target += Math.PI * 2;
    w.yaw = target;
  }, [facing]);

  const drag = useRef<number | null>(null);
  return (
    <canvas
      ref={ref}
      className="cas-figure"
      style={{ cursor: 'grab', touchAction: 'none' }}
      aria-label={`${label} (끌어서 돌려 보기)`}
      onPointerDown={(e) => {
        drag.current = e.clientX;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (drag.current === null || !world.current) return;
        world.current.yaw += (e.clientX - drag.current) * 0.012;
        drag.current = e.clientX;
      }}
      onPointerUp={() => (drag.current = null)}
    />
  );
}
