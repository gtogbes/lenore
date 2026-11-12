import { useEffect, useMemo, useRef } from "react";
import type { ElementRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useStore } from "../state/store.ts";
import { INTRO_SECONDS, INTRO_SECONDS_REDUCED, introPoints } from "./cameraPaths.ts";
import { fenceRadius, reachOf } from "./palette.ts";

type Controls = ElementRef<typeof OrbitControls>;

const tmpDir = new THREE.Vector3();
const tmpGoal = new THREE.Vector3();
const lookNow = new THREE.Vector3();

function ease(k: number): number {
  return k * k * k * (k * (k * 6 - 15) + 10);
}

/**
 * Intro fly-in, then orbit controls. Selection eases the camera toward the tombstone.
 * In demo mode the camera follows the script shots and any manual input cancels the demo.
 */
export function CameraRig() {
  const controls = useRef<Controls>(null);
  const camera = useThree((s) => s.camera);
  const plots = useStore((s) => s.layout.plots);
  const introDone = useStore((s) => s.introDone);
  const selectedId = useStore((s) => s.selectedId);
  const phase = useStore((s) => s.ritualPhase);
  const reach = reachOf(plots);
  const pts = useMemo(() => introPoints(reach), [reach]);
  const startV = useMemo(() => new THREE.Vector3(...pts.start), [pts]);
  const endV = useMemo(() => new THREE.Vector3(...pts.end), [pts]);
  const lookA = useMemo(() => new THREE.Vector3(...pts.lookStart), [pts]);
  const lookB = useMemo(() => new THREE.Vector3(...pts.lookEnd), [pts]);

  const introT = useRef(0);
  const focus = useRef({ time: 0, goal: new THREE.Vector3(), dist: 9 });
  const shot = useRef({ key: -1, pos: new THREE.Vector3(), target: new THREE.Vector3() });
  const mounted = useRef(false);

  // A new graveyard changes the reach: reset to the settled pose for it.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (!useStore.getState().introDone) return;
    camera.position.copy(endV);
    const c = controls.current;
    if (c) {
      c.target.copy(lookB);
      c.update();
    }
  }, [endV, lookB, camera]);

  useEffect(() => {
    const s = useStore.getState();
    if (s.demoMode || !s.introDone || !selectedId) return;
    const p = s.layout.tombstones.find((t) => t.item.id === selectedId);
    if (!p) return;
    focus.current.goal.set(p.pos.x, 1, p.pos.z);
    focus.current.dist = phase === "running" ? 7 : 9;
    focus.current.time = 1.8;
  }, [selectedId, phase]);

  useFrame((_, delta) => {
    const c = controls.current;
    if (!c) return;
    const s = useStore.getState();
    const dt = Math.min(delta, 0.05);

    if (!s.introDone) {
      introT.current += dt;
      const dur = s.reducedMotion ? INTRO_SECONDS_REDUCED : INTRO_SECONDS;
      const k = Math.min(1, introT.current / dur);
      const e = ease(k);
      camera.position.lerpVectors(startV, endV, e);
      camera.position.x -= Math.sin(Math.PI * e) * (s.reducedMotion ? 0 : 8);
      lookNow.lerpVectors(lookA, lookB, e);
      camera.lookAt(lookNow);
      if (k >= 1) {
        c.target.copy(lookB);
        c.update();
        s.setIntroDone();
      }
      return;
    }

    c.autoRotate = false;
    if (s.demoMode) {
      const sh = s.demoShot;
      if (sh) {
        if (shot.current.key !== sh.key) {
          shot.current.key = sh.key;
          shot.current.pos.set(...sh.position);
          shot.current.target.set(...sh.target);
        }
        const k = 1 - Math.exp(-dt * (s.reducedMotion ? 4 : 1.4));
        camera.position.lerp(shot.current.pos, k);
        c.target.lerp(shot.current.target, k);
        c.update();
      }
      return;
    }

    const f = focus.current;
    if (f.time > 0) {
      f.time -= dt;
      const k = 1 - Math.exp(-dt * (s.reducedMotion ? 8 : 3));
      tmpDir.set(camera.position.x - f.goal.x, 0, camera.position.z - f.goal.z);
      if (tmpDir.lengthSq() < 1e-6) tmpDir.set(0, 0, 1);
      tmpDir.normalize().multiplyScalar(f.dist);
      tmpGoal.set(f.goal.x + tmpDir.x, f.goal.y + 3.2, f.goal.z + tmpDir.z);
      camera.position.lerp(tmpGoal, k);
      c.target.lerp(f.goal, k);
      c.update();
      return;
    }

    c.autoRotate = !s.reducedMotion && !s.selectedId && s.ritualPhase === "idle";
  });

  const R = fenceRadius(reach);
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enabled={introDone}
      enableDamping
      dampingFactor={0.08}
      enablePan={false}
      minDistance={3}
      maxDistance={R * 2.6 + 30}
      maxPolarAngle={Math.PI / 2 - 0.03}
      autoRotateSpeed={0.3}
      onStart={() => {
        focus.current.time = 0;
        const s = useStore.getState();
        if (s.demoMode) s.stopDemo();
      }}
    />
  );
}
