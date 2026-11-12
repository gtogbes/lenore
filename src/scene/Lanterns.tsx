import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { hashString } from "../core/prng.ts";
import { useStore } from "../state/store.ts";
import { mergeParts } from "./geometry.ts";
import { PALETTE } from "./palette.ts";

/** Real point lights are expensive: only this many follow the camera. Everything else is emissive. */
export const LANTERN_LIGHTS = 8;
const GLOBE_Y = 1.5;

const WARM = new THREE.Color(PALETTE.lantern);
const HOT = new THREE.Color(PALETTE.lanternHot);
const dummy = new THREE.Object3D();
const tmp = new THREE.Color();

function buildPost(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const base = new THREE.CylinderGeometry(0.14, 0.18, 0.18, 8);
  base.translate(0, 0.09, 0);
  parts.push(base);
  const pole = new THREE.CylinderGeometry(0.04, 0.05, 1.3, 6);
  pole.translate(0, 0.8, 0);
  parts.push(pole);
  const plate = new THREE.BoxGeometry(0.3, 0.04, 0.3);
  plate.translate(0, 1.38, 0);
  parts.push(plate);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const bar = new THREE.BoxGeometry(0.03, 0.34, 0.03);
      bar.translate(sx * 0.13, GLOBE_Y, sz * 0.13);
      parts.push(bar);
    }
  }
  const top = new THREE.BoxGeometry(0.3, 0.04, 0.3);
  top.translate(0, 1.66, 0);
  parts.push(top);
  const roof = new THREE.ConeGeometry(0.24, 0.22, 4);
  roof.rotateY(Math.PI / 4);
  roof.translate(0, 1.78, 0);
  parts.push(roof);
  return mergeParts(parts);
}

function flicker(t: number, phase: number, reduced: boolean): number {
  if (reduced) return 1;
  return 1 + 0.08 * (0.6 * Math.sin(t * 9 + phase * 3) + 0.4 * Math.sin(t * 23.7 + phase * 7));
}

export function Lanterns() {
  const placements = useStore((s) => s.layout.lanterns);
  const posts = useRef<THREE.InstancedMesh>(null);
  const globes = useRef<THREE.InstancedMesh>(null);
  const lights = useRef<(THREE.PointLight | null)[]>([]);
  const assigned = useRef<number[]>([]);
  const acc = useRef(10);

  const postGeo = useMemo(buildPost, []);
  const globeGeo = useMemo(() => new THREE.IcosahedronGeometry(0.12, 1), []);
  useEffect(
    () => () => {
      postGeo.dispose();
      globeGeo.dispose();
    },
    [postGeo, globeGeo],
  );
  // Seeded phase per lantern keeps the flicker deterministic.
  const phases = useMemo(() => placements.map((p) => ((hashString(p.item.id) % 1000) / 1000) * Math.PI * 2), [placements]);

  useLayoutEffect(() => {
    const pm = posts.current;
    const gm = globes.current;
    if (!pm || !gm) return;
    placements.forEach((p, k) => {
      const s = 0.9 + 0.4 * p.item.heat;
      dummy.position.set(p.pos.x, 0, p.pos.z);
      dummy.rotation.set(0, p.rotation, 0);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      pm.setMatrixAt(k, dummy.matrix);
      dummy.position.set(p.pos.x, GLOBE_Y * s, p.pos.z);
      dummy.updateMatrix();
      gm.setMatrixAt(k, dummy.matrix);
      pm.setColorAt(k, tmp.set("#1a1a22"));
    });
    pm.instanceMatrix.needsUpdate = true;
    gm.instanceMatrix.needsUpdate = true;
    if (pm.instanceColor) pm.instanceColor.needsUpdate = true;
  }, [placements]);

  useFrame((state, delta) => {
    const gm = globes.current;
    if (!gm) return;
    const t = state.clock.elapsedTime;
    const reduced = useStore.getState().reducedMotion;

    placements.forEach((p, k) => {
      tmp.lerpColors(WARM, HOT, p.item.heat).multiplyScalar(2.2 * flicker(t, phases[k] as number, reduced));
      gm.setColorAt(k, tmp);
    });
    if (gm.instanceColor) gm.instanceColor.needsUpdate = true;

    acc.current += delta;
    if (acc.current > 0.4) {
      acc.current = 0;
      const cam = state.camera.position;
      assigned.current = placements
        .map((p, k) => ({ k, d: (p.pos.x - cam.x) ** 2 + (p.pos.z - cam.z) ** 2 }))
        .sort((a, b) => a.d - b.d)
        .slice(0, LANTERN_LIGHTS)
        .map((r) => r.k);
    }
    for (let i = 0; i < LANTERN_LIGHTS; i++) {
      const light = lights.current[i];
      if (!light) continue;
      const k = assigned.current[i];
      const p = k === undefined ? undefined : placements[k];
      if (!p || k === undefined) {
        light.intensity = 0;
        continue;
      }
      const s = 0.9 + 0.4 * p.item.heat;
      light.position.set(p.pos.x, GLOBE_Y * s + 0.2, p.pos.z);
      light.color.lerpColors(WARM, HOT, p.item.heat);
      light.intensity = (7 + p.item.heat * 12) * flicker(t, phases[k] as number, reduced);
    }
  });

  return (
    <group>
      {placements.length > 0 && (
        <>
          <instancedMesh key={`post-${placements.length}`} ref={posts} args={[undefined, undefined, placements.length]} geometry={postGeo} frustumCulled={false}>
            <meshStandardMaterial roughness={0.6} metalness={0.7} />
          </instancedMesh>
          <instancedMesh key={`globe-${placements.length}`} ref={globes} args={[undefined, undefined, placements.length]} geometry={globeGeo} frustumCulled={false}>
            <meshBasicMaterial toneMapped={false} fog={false} />
          </instancedMesh>
        </>
      )}
      {Array.from({ length: LANTERN_LIGHTS }, (_, i) => (
        <pointLight
          key={i}
          ref={(el) => {
            lights.current[i] = el;
          }}
          color={PALETTE.lantern}
          intensity={0}
          distance={12}
          decay={2}
        />
      ))}
    </group>
  );
}
